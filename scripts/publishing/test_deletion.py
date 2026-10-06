import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

from deletion_manager import Deletions
from douyin_delete import Douyin, video_id, successful

ID = "7123456789012345678"
TARGET = {"platform": "douyin", "videoId": ID, "ownerId": "100", "title": "Fixture video",
          "createdAt": 1700000000, "account": {"uid": "100", "name": "Fixture"},
          "url": "https://www.douyin.com/video/" + ID}


class Plans(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.manager = Deletions(self.root / "config.json", {"privateDir": str(self.root)})

    def prepare(self):
        with patch.object(self.manager, "run", return_value=copy.deepcopy(TARGET)) as call:
            result = self.manager.prepare("douyin", ID)
            call.assert_called_once_with("prepare", videoId=ID)
        return result["planId"]

    def test_no_approval_no_io(self):
        with patch.object(self.manager, "run") as call:
            with self.assertRaises(ValueError):
                self.manager.execute("invalid", False)
            call.assert_not_called()
        self.assertFalse(self.manager.root.exists())

    def test_unsupported_platform_and_imprecise_ids(self):
        with patch.object(self.manager, "run") as call:
            with self.assertRaises(ValueError):
                self.manager.prepare("youtube", ID)
            for value in (int(ID), float(ID), "../cookies", "https://example.com", "1", ID + "x"):
                with self.assertRaises(ValueError):
                    video_id(value)
            call.assert_not_called()

    def test_no_plan_for_missing_work(self):
        with patch.object(self.manager, "run", return_value={"error": "VIDEO_NOT_FOUND"}):
            self.assertEqual(self.manager.prepare("douyin", ID)["error"], "VIDEO_NOT_FOUND")
        self.assertFalse(self.manager.root.exists())

    def test_expired_preview_never_sends(self):
        plan = self.prepare()
        file = self.manager.root / (plan + ".json")
        record = json.loads(file.read_text())
        record["createdAt"] = (datetime.now(timezone.utc) - timedelta(minutes=16)).isoformat()
        file.write_text(json.dumps(record))
        with patch.object(self.manager, "run") as call:
            with self.assertRaises(ValueError):
                self.manager.execute(plan, True)
            call.assert_not_called()

    def test_crash_tombstone_blocks_same_and_new_plan(self):
        plan = self.prepare()
        def crash(*args, **kwargs):
            receipt = self.manager.root / ("douyin-" + ID + ".receipt.json")
            self.assertEqual(json.loads(receipt.read_text())["state"], "unknown")
            raise TimeoutError()
        with patch.object(self.manager, "run", side_effect=crash) as call:
            self.assertEqual(self.manager.execute(plan, True)["state"], "unknown")
            self.manager.execute(plan, True)
            call.assert_called_once()
        another = self.prepare()
        with patch.object(self.manager, "run") as call:
            result = self.manager.execute(another, True)
            self.assertEqual(result["planId"], plan)
            call.assert_not_called()

    def test_verification_does_not_relabel_unknown_as_deleted(self):
        plan = self.prepare()
        with patch.object(self.manager, "run", return_value={"state": "unknown"}):
            self.manager.execute(plan, True)
        with patch.object(self.manager, "run", return_value={"state": "absent"}) as call:
            result = self.manager.status(plan, refresh=True)
            self.assertEqual(result["receipt"]["state"], "unknown")
            call.assert_called_once_with("verify", target=TARGET)


class Adapter(unittest.IsolatedAsyncioTestCase):
    async def test_malformed_success_rejected(self):
        for value in ({}, {"status_code": False}, {"status_code": "0"}, {"status_code": 401}, []):
            with self.assertRaises(ValueError):
                successful(value)

    async def test_all_pages_and_exact_ids(self):
        adapter = Douyin(None)
        def work(item):
            return {"aweme_id": item, "item_id": int(item), "desc": "fixture", "author": {"uid": "100"}}
        adapter.fetch = AsyncMock(side_effect=[
            {"aweme_list": [work(ID)], "has_more": 1, "max_cursor": "123"},
            {"aweme_list": [work("7123456789012345679")], "has_more": 0}])
        rows = await adapter.works()
        self.assertEqual(rows[0]["videoId"], ID)
        self.assertEqual(len(rows), 2)
        self.assertIn("max_cursor=123", adapter.fetch.call_args.args[1])

    async def test_partial_or_duplicate_pages_cannot_prove_absence(self):
        for payload in ({"aweme_list": []}, {"aweme_list": [], "has_more": True, "max_cursor": 0},
                        {"aweme_list": [], "has_more": "false"}):
            adapter = Douyin(None)
            adapter.fetch = AsyncMock(return_value=payload)
            with self.assertRaises(ValueError):
                await adapter.works()

    async def test_changed_caption_or_owner_prevents_write(self):
        for field in ("title", "ownerId", "createdAt"):
            adapter = Douyin(None)
            changed = {**TARGET, field: "changed"}
            adapter.target = AsyncMock(return_value=changed)
            adapter.fetch = AsyncMock()
            with self.assertRaises(ValueError):
                await adapter.delete(TARGET)
            adapter.fetch.assert_not_called()

    async def test_failed_write_receipt_has_no_fallback_or_retry(self):
        adapter = Douyin(None)
        adapter.target = AsyncMock(return_value=TARGET)
        adapter.fetch = AsyncMock(side_effect=TimeoutError())
        adapter.verify = AsyncMock()
        result = await adapter.delete(TARGET)
        self.assertEqual(result["state"], "unknown")
        adapter.fetch.assert_awaited_once()
        adapter.verify.assert_not_called()

    async def test_success_requires_platform_receipt_and_readback(self):
        adapter = Douyin(None)
        adapter.target = AsyncMock(return_value=TARGET)
        adapter.fetch = AsyncMock(return_value={"status_code": 0})
        adapter.verify = AsyncMock(return_value={"state": "absent"})
        with patch("douyin_delete.asyncio.sleep", new_callable=AsyncMock):
            result = await adapter.delete(TARGET)
        self.assertEqual(result["state"], "deleted")
        adapter.fetch.assert_awaited_once()
        self.assertEqual(adapter.fetch.call_args.args[2], {"aweme_id": ID})

    async def test_account_change_during_read_is_not_empty_success(self):
        adapter = Douyin(None)
        adapter.owner = AsyncMock(side_effect=[{"uid": "100"}, {"uid": "200"}])
        adapter.works = AsyncMock(return_value=[])
        with self.assertRaises(ValueError):
            await adapter.inventory()

    async def test_readback_failure_after_submission_is_unknown(self):
        adapter = Douyin(None)
        adapter.target = AsyncMock(return_value=TARGET)
        adapter.fetch = AsyncMock(return_value={"status_code": 0})
        adapter.verify = AsyncMock(side_effect=ValueError("ACCOUNT_NOT_VERIFIED"))
        with patch("douyin_delete.asyncio.sleep", new_callable=AsyncMock):
            result = await adapter.delete(TARGET)
        self.assertEqual(result["state"], "unknown")
        adapter.fetch.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
