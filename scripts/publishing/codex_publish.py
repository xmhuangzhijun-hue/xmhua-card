"""Codex command entry: reuse registered local sessions through the existing job API.

No browser credentials are imported/exported. Publishing needs a concrete plan,
stable requestId and --confirm-publish. Unknown outcomes are never auto-replayed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from urllib.parse import urlparse, quote

import requests

PLATFORMS = {"xiaohongshu", "tencent", "douyin", "bilibili", "youtube"}


@contextmanager
def request_lock(directory, request_id):
    """One caller per request, so concurrent agents cannot overwrite its receipt."""
    directory.mkdir(exist_ok=True)
    with (directory / (request_id + ".lock")).open("a+b") as lock:
        if sys.platform == "win32":
            import msvcrt
            lock.seek(0)
            if not lock.read(1):
                lock.write(b"0"); lock.flush()
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def validate_plan(plan):
    plan = dict(plan)
    plan["requestId"] = str(uuid.UUID(plan["requestId"]))
    platforms = plan.get("platforms")
    if not isinstance(platforms, list) or not platforms or not set(platforms) <= PLATFORMS:
        raise ValueError("Choose supported platforms")
    path = Path(plan["file"]).resolve(strict=True)
    if path.suffix.lower() != ".mp4" or not 12 <= path.stat().st_size <= 512 * 1024 * 1024:
        raise ValueError("MP4 file must be 12 bytes to 512 MB")
    with path.open("rb") as stream:
        if stream.read(12)[4:8] != b"ftyp":
            raise ValueError("Invalid MP4 header")
    title = plan.get("title", "").strip()
    if not title or len(title) > (20 if "xiaohongshu" in platforms else 100):
        raise ValueError("Invalid title length")
    if plan.get("original") is not True:
        raise ValueError("Publication rights must be confirmed in the plan")
    plan.update(file=str(path), title=title, platforms=list(dict.fromkeys(platforms)))
    return plan


class Client:
    def __init__(self, config, username, password_file):
        self.config = config
        self.site = config["site"].rstrip("/")
        if urlparse(self.site).scheme != "https":
            raise ValueError("HTTPS required")
        self.session = requests.Session()
        response = self.session.post(self.site + "/api/auth/login", json={"username": username, "password": Path(password_file).read_text(encoding="utf-8").strip()}, timeout=30, allow_redirects=False)
        self.unpack(response)

    @staticmethod
    def unpack(response):
        if not response.ok or response.is_redirect:
            # Do not print request/response bodies; they can contain account details.
            raise RuntimeError(f"Blog API returned HTTP {response.status_code}")
        return response.json().get("data")

    def api(self, suffix="", body=None):
        url = self.site + "/api/admin/publishing" + suffix
        return self.unpack(self.session.request("GET" if body is None else "POST", url, json=body, timeout=40, allow_redirects=False))

    def close(self):
        try:
            self.session.post(self.site + "/api/auth/logout", timeout=15, allow_redirects=False)
        finally:
            self.session.close()

    def status(self):
        overview = self.api()
        worker = next(w for w in overview["workers"] if w["id"] == self.config["id"])
        jobs = [j for j in overview["jobs"] if j["workerId"] == worker["id"]]
        return worker, jobs

    def wait_online(self):
        for _ in range(10):
            worker, jobs = self.status()
            seen = worker.get("lastSeen")
            if worker["active"] and seen and (datetime.now(timezone.utc) - datetime.fromisoformat(seen.replace("Z", "+00:00"))).total_seconds() < 45:
                return worker, jobs
            time.sleep(2)
        raise RuntimeError("Local worker offline; no job or video was submitted")

    def wait(self, request_id, seconds):
        deadline = time.monotonic() + seconds
        previous = None
        while True:
            worker, jobs = self.status()
            matching = [j for j in jobs if j["requestId"] == request_id]
            result = [{k: j[k] for k in ("id", "platform", "kind", "state", "message")} for j in matching]
            if result != previous:
                print(json.dumps(result, ensure_ascii=False), flush=True)
                previous = result
            if matching and all(j["state"] not in ("queued", "running") for j in matching):
                ok = all(j["state"] in ("completed", "submitted") for j in matching)
                checks_ok = all(worker["accounts"].get(j["platform"], {}).get("authenticated") for j in matching if j["kind"] in ("check", "login"))
                return 0 if ok and checks_ok else 2
            if time.monotonic() >= deadline:
                return 3  # Pending is not failure or permission to enqueue again.
            time.sleep(5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True, help="Registered private worker config")
    parser.add_argument("--admin-secret-file", required=True, help="Registered admin password file")
    parser.add_argument("--username", required=True)
    parser.add_argument("command", choices=["status", "check", "login", "publish"])
    parser.add_argument("--platforms", nargs="+", choices=sorted(PLATFORMS))
    parser.add_argument("--plan", help="JSON publication plan with stable requestId")
    parser.add_argument("--confirm-publish", action="store_true")
    parser.add_argument("--wait", type=int, default=600)
    args = parser.parse_args()
    plan = None
    if args.command == "publish":
        if not args.plan:
            parser.error("publish requires --plan")
        plan = validate_plan(json.loads(Path(args.plan).read_text(encoding="utf-8-sig")))
        if not args.confirm_publish:
            print(json.dumps({"previewOnly": True, "requestId": plan["requestId"], "file": Path(plan["file"]).name, "title": plan["title"], "platforms": plan["platforms"]}, ensure_ascii=False))
            return 0
    if args.command in ("check", "login") and not args.platforms:
        parser.error("choose platforms explicitly")
    config = json.loads(Path(args.config).read_text(encoding="utf-8-sig"))
    from contextlib import ExitStack
    stack = ExitStack()
    if plan:
        stack.enter_context(request_lock(Path(config["privateDir"]) / "codex-requests", plan["requestId"]))
    client = None
    try:
        client = Client(config, args.username, args.admin_secret_file)
        worker, jobs = client.status()
        if args.command == "status":
            print(json.dumps({"active": worker["active"], "lastSeen": worker["lastSeen"], "accounts": worker["accounts"], "pending": [{k: j[k] for k in ("id", "platform", "kind", "state")} for j in jobs if j["state"] in ("queued", "running")]}, ensure_ascii=False))
            return 0
        worker, jobs = client.wait_online()
        if plan:
            journal = Path(config["privateDir"]) / "codex-requests"
            journal.mkdir(exist_ok=True)
            record_path = journal / (plan["requestId"] + ".json")
            digest = hashlib.sha256(json.dumps(plan, sort_keys=True).encode())
            with Path(plan["file"]).open("rb") as stream:
                while chunk := stream.read(1024 * 1024):
                    digest.update(chunk)
            fingerprint = digest.hexdigest()
            record = json.loads(record_path.read_text()) if record_path.exists() else {"fingerprint": fingerprint}
            if record["fingerprint"] != fingerprint:
                raise ValueError("requestId already belongs to different content")
            if record.get("submitted") or any(j["requestId"] == plan["requestId"] for j in jobs):
                return client.wait(plan["requestId"], args.wait)
            # Fail before uploading if any platform lacks a recent successful check.
            for platform in plan["platforms"]:
                account = worker["accounts"].get(platform, {})
                age = (datetime.now(timezone.utc) - datetime.fromisoformat(account.get("checkedAt", "1970-01-01T00:00:00+00:00").replace("Z", "+00:00"))).total_seconds()
                if not account.get("authenticated") or age >= 86400:
                    raise ValueError("Run account check first; authenticate only if the saved session fails")
            if "assetId" not in record:
                with Path(plan["file"]).open("rb") as stream:
                    response = client.session.post(client.site + "/api/admin/publishing/assets", data=stream, headers={"Content-Type": "video/mp4", "X-File-Name": quote(Path(plan["file"]).name)}, timeout=300, allow_redirects=False)
                record["assetId"] = client.unpack(response)["id"]
            def save_record():
                temp = record_path.with_suffix(".tmp")
                temp.write_text(json.dumps(record), encoding="utf-8")
                temp.replace(record_path)
            save_record()
            payload = {k: plan[k] for k in ("requestId", "platforms", "title", "description", "tags", "category", "original") if k in plan}
            payload.update(kind="publish", workerId=config["id"], assetId=record["assetId"])
            # A timeout after this write leaves an uncertain request: inspect it, never repost automatically.
            record["submitted"] = True
            save_record()
        else:
            if any(j["kind"] in ("login", "check") and j["platform"] in args.platforms and j["state"] in ("queued", "running") for j in jobs):
                raise ValueError("Account task already pending; use status, do not duplicate it")
            payload = {"requestId": str(uuid.uuid4()), "kind": args.command, "workerId": config["id"], "platforms": args.platforms}
        client.api("/jobs", payload)
        return client.wait(payload["requestId"], args.wait)
    finally:
        try:
            if client: client.close()
        finally:
            stack.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Publisher stopped ({type(error).__name__}). Inspect status before retrying; no automatic publication replay.", file=sys.stderr)
        raise SystemExit(2)
