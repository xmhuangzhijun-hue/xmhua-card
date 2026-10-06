"""Local stdio MCP facade over the existing publishing CLI and private journals."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import Literal
import uuid

from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

from codex_publish import Client, PLATFORMS, request_lock, validate_plan


def digest_file(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


class Publisher:
    def __init__(self, config_file, username, secret_file):
        self.config_file = Path(config_file).resolve()
        self.config = json.loads(self.config_file.read_text(encoding="utf-8-sig"))
        self.username, self.secret_file = username, str(Path(secret_file).resolve())
        self.plans = Path(self.config["privateDir"]) / "mcp-plans"

    @contextmanager
    def client(self):
        client = Client(self.config, self.username, self.secret_file)
        try:
            yield client
        finally:
            client.close()

    def status(self):
        with self.client() as client:
            worker, jobs = client.status()
        now = datetime.now(timezone.utc)
        def age(value):
            return (now - datetime.fromisoformat(value.replace("Z", "+00:00"))).total_seconds() if value else float("inf")
        accounts = {}
        for name in sorted(PLATFORMS):
            account = worker["accounts"].get(name, {})
            checked = account.get("checkedAt")
            authenticated = account.get("authenticated", False)
            accounts[name] = {
                "lastCheckPassed": authenticated, "checkedAt": checked,
                "state": "ready" if authenticated and age(checked) < 86400 else "needs_check" if authenticated else "not_verified",
            }
        return {"online": worker["active"] and age(worker.get("lastSeen")) < 45,
                "accounts": accounts, "pending": self.safe_jobs(jobs, pending_only=True),
                "guidance": "needs_check is not expired authorization. Check saved sessions before login. Keep this computer online for execution."}

    @staticmethod
    def safe_jobs(jobs, pending_only=False):
        return [{k: j.get(k) for k in ("id", "requestId", "platform", "kind", "state", "message", "createdAt", "updatedAt")}
                for j in jobs if not pending_only or j["state"] in ("queued", "running")]

    def jobs(self, request_id=""):
        if request_id:
            request_id = str(uuid.UUID(request_id))
        with self.client() as client:
            _, jobs = client.status()
        found = [j for j in jobs if not request_id or j["requestId"] == request_id]
        return {"jobs": self.safe_jobs(found[:30]), "guidance": "submitted is not proof of public visibility. Missing or uncertain receipts must be inspected, never blindly resubmitted."}

    def command(self, command, *extra):
        args = [sys.executable, str(Path(__file__).with_name("codex_publish.py")),
                "--config", str(self.config_file), "--username", self.username,
                "--admin-secret-file", self.secret_file, command, "--wait", "0", *extra]
        # No shell, no cookie values, and no CLI output can contaminate MCP stdout.
        try:
            result = subprocess.run(args, capture_output=True, encoding="utf-8", errors="replace",
                                    timeout=420, env=dict(os.environ, PYTHONIOENCODING="utf-8"),
                                    **({"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}))
        except subprocess.TimeoutExpired:
            return {"state": "unknown", "guidance": "Inspect publisher_jobs before any retry. A timeout does not mean the request failed."}
        receipts = []
        for line in result.stdout.splitlines():
            try:
                item = json.loads(line)
                if isinstance(item, list):
                    receipts = item
            except ValueError:
                pass
        return {"state": "completed" if result.returncode == 0 else "pending" if result.returncode == 3 else "needs_attention",
                "jobs": receipts, "guidance": "Use publisher_jobs for final receipts. Do not create a new plan to retry an uncertain publication."}

    def account(self, kind, platforms):
        if not platforms or not set(platforms) <= PLATFORMS or kind not in ("check", "login"):
            raise ValueError("Choose supported platforms and check/login")
        return self.command(kind, "--platforms", *dict.fromkeys(platforms))

    def prepare(self, file, platforms, title, description="", tags=None, category=249, original=False):
        if len(description) > 1000 or len(tags or []) > 10 or any(not isinstance(t, str) or len(t) > 100 for t in tags or []):
            raise ValueError("Description or tags exceed supported limits")
        if not 1 <= category <= 9999:
            raise ValueError("Invalid Bilibili category")
        if not Path(file).is_absolute():
            raise ValueError("Use the absolute path of the user-selected MP4")
        plan = validate_plan({"requestId": str(uuid.uuid4()), "file": file, "platforms": platforms,
                              "title": title, "description": description, "tags": tags or [],
                              "category": category, "original": original})
        digest = digest_file(plan["file"])
        self.plans.mkdir(parents=True, exist_ok=True)
        record = {"plan": plan, "sha256": digest}
        with (self.plans / (plan["requestId"] + ".json")).open("x", encoding="utf-8") as out:
            json.dump(record, out, ensure_ascii=False)
        return {"planId": plan["requestId"], "previewOnly": True, "file": Path(plan["file"]).name,
                "title": plan["title"], "description": description, "platforms": plan["platforms"],
                "tags": plan["tags"], "category": category, "sha256": digest,
                "guidance": "No upload or publication yet. Publish this exact plan only with user authorization for its content and destinations."}

    def publish(self, plan_id, approved):
        if approved is not True:
            raise ValueError("Publication requires user authorization for this exact plan")
        plan_id = str(uuid.UUID(plan_id))
        # Serialize plan verification as well as the existing CLI submission journal.
        with request_lock(self.plans, plan_id):
            record = json.loads((self.plans / (plan_id + ".json")).read_text(encoding="utf-8"))
            plan = validate_plan(record["plan"])
            if plan["requestId"] != plan_id or digest_file(plan["file"]) != record["sha256"]:
                raise ValueError("Video changed after preview; prepare and review a new plan")
            plan_path = self.plans / (plan_id + ".cli.json")
            plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
            result = self.command("publish", "--plan", str(plan_path), "--confirm-publish")
        return {"planId": plan_id, **result}


def create_server(publisher):
    server = FastMCP("blog_publisher", log_level="ERROR", instructions=(
        "Operate the owner's local video publisher. First use publisher_status; needs_check means refresh the saved session, not log in again. "
        "Prepare the user's specific video/text/platforms before publishing. Call publisher_publish only when the user has authorized that exact content and destinations. "
        "Reuse planId on interruption; inspect jobs, never blind retry with a new plan. Never solve security challenges or expose cookies. submitted is not verified public visibility."
    ))
    read = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=True)
    write = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=True)

    # Returning only error types prevents private paths, HTTP responses and credentials
    # from being reflected by third-party exceptions in tool results.
    def safe(fn, *args):
        try:
            return fn(*args)
        except ValueError:
            return {"error": "VALIDATION_FAILED", "guidance": "Check input, exact-plan authorization, file changes and pending jobs before retrying."}
        except Exception as exc:
            return {"error": type(exc).__name__, "guidance": "Inspect publisher_status and publisher_jobs; do not replay an uncertain write."}

    @server.tool(annotations=read)
    def publisher_status() -> dict:
        """Read local worker connectivity and saved-account check status; never return cookies or login QR codes."""
        return safe(publisher.status)

    @server.tool(annotations=write)
    def publisher_check_accounts(platforms: list[Literal["xiaohongshu", "tencent", "douyin", "bilibili", "youtube"]]) -> dict:
        """Queue checks of existing sessions. Does not initiate login or publish content. Poll publisher_jobs for completion."""
        return safe(publisher.account, "check", platforms)

    @server.tool(annotations=write)
    def publisher_login_account(platform: Literal["xiaohongshu", "tencent", "douyin", "bilibili", "youtube"]) -> dict:
        """Open the existing local login flow only when needed/requested. User scans or verifies in the blog admin/local window; poll jobs."""
        return safe(publisher.account, "login", [platform])

    @server.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=False))
    def publisher_prepare_video(file: str, platforms: list[str], title: str, description: str = "", tags: list[str] | None = None,
                                category: int = 249, original: bool = False) -> dict:
        """Validate user-selected absolute MP4 path and save a private preview plan. No upload/network. Set original=true only when publication rights are established."""
        return safe(publisher.prepare, file, platforms, title, description, tags, category, original)

    @server.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=True, openWorldHint=True))
    def publisher_publish(plan_id: str, approved: bool = False) -> dict:
        """Upload and publicly submit the prepared video to its platforms. Only set approved=true for the user's explicit authorization of that exact plan. Same plan ID cannot be blindly replayed; inspect jobs on unknown result."""
        return safe(publisher.publish, plan_id, approved)

    @server.tool(annotations=read)
    def publisher_jobs(request_id: str = "") -> dict:
        """Read up to 30 recent task receipts, optionally filtered by plan/request UUID. Read-only; submitted still needs platform verification."""
        return safe(publisher.jobs, request_id)

    return server


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--admin-secret-file", required=True)
    args = parser.parse_args()
    create_server(Publisher(args.config, args.username, args.admin_secret_file)).run(transport="stdio")
