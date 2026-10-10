import json
import contextlib
import io
import sys
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from codex_publish import BackendHTTPError, AccountCheckRequired

from publishing_mcp import Publisher


class MCPPublishingTests(unittest.TestCase):
    def test_account_queue_uses_cli_core_without_child_or_stdout_mutation(self):
        self.publisher.config_file.write_text(json.dumps({'privateDir':str(self.root),'id':'worker-test'}))
        argv = list(sys.argv)
        with patch('codex_publish.Client') as factory, patch('subprocess.Popen', side_effect=AssertionError('no child permitted')), contextlib.redirect_stdout(io.StringIO()) as output:
            client = factory.return_value
            client.status.return_value = ({'accounts':{}}, [])
            client.wait_online.return_value = client.status.return_value
            def wait(request_id, seconds):
                client.emit(json.dumps([{'id':'test-job','state':'queued'}]), flush=True)
                return 3
            client.wait.side_effect = wait
            result = self.publisher.account('check', ['bilibili'])
        self.assertEqual(result['state'], 'pending')
        self.assertEqual(result['jobs'][0]['id'], 'test-job')
        self.assertEqual(output.getvalue(), '')
        self.assertEqual(sys.argv, argv)
        self.assertEqual(client.api.call_args.args[1]['kind'], 'check')
        self.assertEqual(client.api.call_count, 1)

    def test_backend_failure_keeps_stage_and_status_without_private_body(self):
        with patch('publishing_mcp.cli_main', side_effect=BackendHTTPError(500, 'admin_login')):
            reply = self.publisher.command('publish')
        self.assertEqual(reply['state'], 'needs_attention')
        self.assertEqual(reply['httpStatus'], 500)
        self.assertEqual(reply['operation'], 'admin_login')
        self.assertNotIn('hidden', json.dumps(reply))

    def test_cli_check_required_is_actionable_and_drops_untrusted_output(self):
        with patch("publishing_mcp.cli_main", side_effect=AccountCheckRequired("tencent")):
            reply = self.publisher.command("publish")
        self.assertEqual(reply["state"], "needs_check")
        self.assertEqual(reply["platform"], "tencent")
        self.assertNotIn("hidden", json.dumps(reply))

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        config = self.root / "config.json"
        config.write_text(json.dumps({"privateDir": str(self.root)}), encoding="utf-8")
        self.publisher = Publisher(config, "test", self.root / "absent-secret")
        self.video = self.root / "sample.mp4"
        self.video.write_bytes(b"\x00\x00\x00\x18ftypmp42")

    def prepare(self):
        return self.publisher.prepare(str(self.video), ["douyin"], "Example", original=True)

    def test_preview_has_no_network_or_upload(self):
        with patch("publishing_mcp.Client") as client, patch.object(self.publisher, "command") as command:
            result = self.prepare()
        self.assertTrue(result["previewOnly"])
        self.assertNotIn("token", result)
        client.assert_not_called()
        command.assert_not_called()

    def test_approval_gate_before_read_or_submit(self):
        with patch.object(self.publisher, "command") as command:
            with self.assertRaises(ValueError):
                self.publisher.publish("not-even-a-plan", False)
        command.assert_not_called()

    def test_changed_video_cannot_be_submitted(self):
        preview = self.prepare()
        self.video.write_bytes(self.video.read_bytes() + b"changed")
        with patch.object(self.publisher, "command") as command:
            with self.assertRaises(ValueError):
                self.publisher.publish(preview["planId"], True)
        command.assert_not_called()

    def test_publication_reuses_exact_plan_and_existing_cli_guard(self):
        preview = self.prepare()
        with patch.object(self.publisher, "command", return_value={"state": "pending"}) as command:
            for _ in range(2):
                result = self.publisher.publish(preview["planId"], True)
                self.assertEqual(result["planId"], preview["planId"])
        self.assertEqual(command.call_args_list[0], command.call_args_list[1])
        arguments = command.call_args.args
        self.assertEqual(arguments[0], "publish")
        self.assertIn("--confirm-publish", arguments)
        plan = json.loads(Path(arguments[2]).read_text(encoding="utf-8"))
        self.assertEqual(plan["requestId"], preview["planId"])

    def test_unknown_rights_do_not_create_plan(self):
        with self.assertRaises(ValueError):
            self.publisher.prepare(str(self.video), ["douyin"], "Example")
        self.assertFalse(self.publisher.plans.exists())

    def test_old_success_requests_check_instead_of_login(self):
        with patch("publishing_mcp.Client") as factory:
            now = datetime.now(timezone.utc)
            factory.return_value.status.return_value = ({
                "active": True, "lastSeen": now.isoformat(),
                "accounts": {"douyin": {"authenticated": True, "checkedAt": (now-timedelta(days=2)).isoformat()}}
            }, [])
            result = self.publisher.status()
        self.assertTrue(result["online"])
        self.assertEqual(result["accounts"]["douyin"]["state"], "needs_check")
        self.assertTrue(result["accounts"]["douyin"]["lastCheckPassed"])


if __name__ == "__main__":
    unittest.main()
