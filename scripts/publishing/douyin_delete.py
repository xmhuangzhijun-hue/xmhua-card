"""Local Douyin adapter; endpoint discovery follows OpenCLI (see THIRD_PARTY.md).

Modified implementation: exact IDs, authenticated owner checks, complete pagination,
one write with no fallback/retry, and separate verified/unknown receipts. Browser
cookies remain in the existing private store and are never printed or rewritten.
"""
import argparse
import asyncio
from contextlib import asynccontextmanager
import json
from pathlib import Path
import re

ORIGIN = "https://creator.douyin.com"
MANAGE = ORIGIN + "/creator-micro/content/manage"
PROFILE = "/web/api/media/user/info/?aid=1128"
WORKS = "/janus/douyin/creator/pc/work_list"
DELETE = "/web/api/media/aweme/delete/?aid=1128"


def video_id(value):
    # Never coerce floating-point/JS numeric IDs: these exceed Number precision.
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{10,25}", value):
        raise ValueError("INVALID_VIDEO_ID")
    return value


def successful(payload):
    if not isinstance(payload, dict) or type(payload.get("status_code")) is not int or payload["status_code"] != 0:
        raise ValueError("PLATFORM_RESPONSE_UNVERIFIED")
    return payload


class Douyin:
    def __init__(self, page):
        self.page = page

    async def fetch(self, method, path, body=None):
        if (method, path.split("?")[0]) not in {
            ("GET", PROFILE.split("?")[0]), ("GET", WORKS), ("POST", DELETE.split("?")[0])
        }:
            raise ValueError("UNSUPPORTED_ENDPOINT")
        result = await self.page.evaluate("""async ({method,path,body}) => {
            const controller = new AbortController();
            const timer = setTimeout(()=>controller.abort(), 20000);
            try {
                const r = await fetch(path, {method, credentials:'include', signal:controller.signal,
                    headers:{'Content-Type':'application/json'},
                    ...(body ? {body:JSON.stringify(body)} : {})});
                if (!r.ok) return {status_code:-1};
                return await r.json();
            } finally {clearTimeout(timer);}
        }""", {"method": method, "path": path, "body": body})
        return successful(result)

    async def owner(self):
        data = await self.fetch("GET", PROFILE)
        user = data.get("user_info") or data.get("user") or {}
        uid = user.get("uid")
        if not isinstance(uid, str) or not uid.isdigit():
            raise ValueError("ACCOUNT_NOT_VERIFIED")
        return {"uid": uid, "name": str(user.get("nickname", ""))}

    async def works(self):
        rows, ids, cursors = [], set(), set()
        cursor = "0"
        for _ in range(50):
            data = await self.fetch("GET", WORKS + "?status=0&count=20&page_size=20&max_cursor=" + cursor + "&scene=star_atlas&device_platform=android&aid=1128")
            payload = data.get("data", data)
            if not isinstance(payload, dict):
                raise ValueError("INCOMPLETE_WORK_LIST")
            batch = payload.get("aweme_list", payload.get("work_list"))
            if not isinstance(batch, list) or "has_more" not in payload:
                raise ValueError("INCOMPLETE_WORK_LIST")
            for work in batch:
                item_id = video_id(work.get("aweme_id"))
                if item_id in ids:
                    raise ValueError("UNSTABLE_WORK_LIST")
                ids.add(item_id)
                author = work.get("author") or {}
                rows.append({"videoId": item_id, "title": str(work.get("desc", "")),
                             "createdAt": work.get("create_time"), "ownerId": str(author.get("uid", work.get("author_user_id", ""))),
                             "url": "https://www.douyin.com/video/" + item_id})
            more = payload["has_more"]
            if more is False or type(more) is int and more == 0:
                return rows
            if more is not True and not (type(more) is int and more == 1):
                raise ValueError("INCOMPLETE_WORK_LIST")
            next_cursor = str(payload.get("max_cursor", ""))
            if not batch or not next_cursor.isdigit() or next_cursor == cursor or next_cursor in cursors:
                raise ValueError("INCOMPLETE_WORK_LIST")
            cursors.add(cursor)
            cursor = next_cursor
        raise ValueError("WORK_LIST_LIMIT_REACHED")

    async def inventory(self):
        before = await self.owner()
        items = await self.works()
        after = await self.owner()
        if before["uid"] != after["uid"] or any(x["ownerId"] != before["uid"] for x in items):
            raise ValueError("ACCOUNT_CHANGED")
        return {"account": before, "videos": items, "complete": True}

    async def target(self, item_id):
        item_id = video_id(item_id)
        inventory = await self.inventory()
        found = [v for v in inventory["videos"] if v["videoId"] == item_id]
        if len(found) != 1:
            raise ValueError("VIDEO_NOT_FOUND")
        return {"platform": "douyin", "account": inventory["account"], **found[0]}

    async def delete(self, target):
        # Re-resolve both the owner and immutable target immediately before writing.
        current = await self.target(target["videoId"])
        if any(current[k] != target[k] for k in ("platform", "videoId", "title", "createdAt", "ownerId")):
            raise ValueError("TARGET_CHANGED")
        if current["account"]["uid"] != target["account"]["uid"]:
            raise ValueError("ACCOUNT_CHANGED")
        try:
            # Exactly one write. No fallback endpoint or UI retry on uncertain receipt.
            await self.fetch("POST", DELETE, {"aweme_id": current["videoId"]})
        except Exception:
            return {"state": "unknown", "reason": "DELETE_RECEIPT_UNVERIFIED"}
        for _ in range(3):
            await asyncio.sleep(1)
            try:
                result = await self.verify(target)
            except Exception:
                return {"state": "unknown", "reason": "READBACK_UNAVAILABLE"}
            if result["state"] == "absent":
                return {"state": "deleted", "verified": True, "videoId": current["videoId"]}
        return {"state": "unknown", "reason": "DELETE_NOT_VERIFIED"}

    async def verify(self, target):
        inventory = await self.inventory()
        if inventory["account"]["uid"] != target["account"]["uid"]:
            raise ValueError("ACCOUNT_CHANGED")
        return {"state": "present" if any(x["videoId"] == target["videoId"] for x in inventory["videos"]) else "absent",
                "videoId": target["videoId"], "guidance": "Absence alone does not prove this tool deleted a video."}


@asynccontextmanager
async def browser(config):
    from patchright.async_api import async_playwright
    state = Path(config["privateDir"]) / "cookies/douyin_blog.json"
    if not state.is_file():
        raise ValueError("LOGIN_REQUIRED")
    async with async_playwright() as playwright:
        instance = await playwright.chromium.launch(headless=True, executable_path=config["chrome"])
        try:
            context = await instance.new_context(storage_state=str(state))
            page = await context.new_page()
            await page.goto(MANAGE, wait_until="domcontentloaded", timeout=60000)
            # Allow creator page's own signed-fetch SDK to initialize.
            await page.wait_for_timeout(3000)
            if not page.url.startswith(MANAGE):
                raise ValueError("LOGIN_REQUIRED")
            yield Douyin(page)
        finally:
            await instance.close()


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    import sys
    task = json.loads(sys.stdin.read())
    config = json.loads(Path(args.config).read_text(encoding="utf-8-sig"))
    async with browser(config) as adapter:
        op = task["operation"]
        if op == "list":
            return await adapter.inventory()
        if op == "prepare":
            return await adapter.target(task["videoId"])
        if op == "verify":
            return await adapter.verify(task["target"])
        if op == "delete" and task.get("approved") is True:
            return await adapter.delete(task["target"])
        raise ValueError("UNAPPROVED_OPERATION")


if __name__ == "__main__":
    try:
        print(json.dumps(asyncio.run(main()), ensure_ascii=False))
    except Exception as exc:
        # No raw browser exceptions, HTTP bodies, URLs or cookies on stdout.
        code = str(exc) if type(exc) is ValueError and re.fullmatch(r"[A-Z_]+", str(exc)) else type(exc).__name__
        print(json.dumps({"error": code}))
