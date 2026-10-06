import json
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from types import SimpleNamespace

from publishing_mcp import Publisher


class MCPPublishingTests(unittest.TestCase):
    def test_cli_check_required_is_actionable_and_drops_untrusted_output(self):
        result = SimpleNamespace(returncode=2, stdout=json.dumps({"error": "ACCOUNT_CHECK_REQUIRED", "platform": "tencent", "secret": "hidden"}))
        with patch("publishing_mcp.subprocess.run", return_value=result):
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
