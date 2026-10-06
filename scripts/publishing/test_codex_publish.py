import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import uuid
from datetime import datetime, timezone, timedelta

import codex_publish as cli


class PublishEntryTests(unittest.TestCase):
    def test_stale_channels_check_stops_before_asset_upload_and_job_write(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            video = root / "video.mp4"
            video.write_bytes(b"\x00\x00\x00\x18ftypmp42")
            plan = root / "plan.json"
            plan.write_text(json.dumps({"requestId": str(uuid.uuid4()), "file": str(video), "platforms": ["tencent"], "title": "test", "original": True}))
            config = root / "config.json"
            config.write_text(json.dumps({"privateDir": d, "id": str(uuid.uuid4())}))
            args = ["cli", "--config", str(config), "--admin-secret-file", "unused", "--username", "test", "publish", "--plan", str(plan), "--confirm-publish"]
            with patch("sys.argv", args), patch.object(cli, "Client") as factory:
                client = factory.return_value
                checked = (datetime.now(timezone.utc) - timedelta(hours=9)).isoformat()
                client.status.return_value = ({"accounts": {"tencent": {"authenticated": True, "checkedAt": checked}}}, [])
                client.wait_online.return_value = client.status.return_value
                with self.assertRaises(cli.AccountCheckRequired):
                    cli.main()
                client.session.post.assert_not_called()
                client.api.assert_not_called()

    def test_preview_never_authenticates_or_publishes(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            video = root / "video.mp4"
            video.write_bytes(b"\x00\x00\x00\x18ftypmp42")
            plan = root / "plan.json"
            plan.write_text(json.dumps({"requestId": str(uuid.uuid4()), "file": str(video), "platforms": ["douyin"], "title": "test", "original": True}))
            args = ["cli", "--config", "does-not-exist", "--admin-secret-file", "does-not-exist", "--username", "test", "publish", "--plan", str(plan)]
            with patch("sys.argv", args), patch.object(cli, "Client") as client, contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(cli.main(), 0)
                client.assert_not_called()

    def test_uncertain_submission_is_not_replayed_and_changed_plan_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            video = root / "video.mp4"
            video.write_bytes(b"\x00\x00\x00\x18ftypmp42")
            plan = {"requestId": str(uuid.uuid4()), "file": str(video), "platforms": ["douyin"], "title": "test", "original": True}
            plan_file = root / "plan.json"; plan_file.write_text(json.dumps(plan))
            config = root / "config.json"; config.write_text(json.dumps({"privateDir": d, "id": str(uuid.uuid4())}))
            args = ["cli", "--config", str(config), "--admin-secret-file", "unused", "--username", "test", "publish", "--plan", str(plan_file), "--confirm-publish"]
            with patch("sys.argv", args), patch.object(cli, "Client") as factory:
                client = factory.return_value
                client.status.return_value = ({"accounts": {"douyin": {"authenticated": True, "checkedAt": datetime.now(timezone.utc).isoformat()}}}, [])
                client.wait_online.return_value = client.status.return_value
                client.unpack.return_value = {"id": str(uuid.uuid4())}
                client.api.side_effect = TimeoutError()
                with self.assertRaises(TimeoutError): cli.main()
                self.assertEqual(client.api.call_count, 1)
                record = json.loads((root / "codex-requests" / (plan["requestId"] + ".json")).read_text())
                self.assertTrue(record["submitted"])
                client.wait.return_value = 3
                self.assertEqual(cli.main(), 3)
                self.assertEqual(client.api.call_count, 1)
                video.write_bytes(b"\x00\x00\x00\x18ftypmp42changed")
                with self.assertRaises(ValueError): cli.main()
                self.assertEqual(client.api.call_count, 1)


if __name__ == "__main__":
    unittest.main()
