"""Private deletion plans and durable one-attempt receipts, independent of cloud jobs."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import uuid

from codex_publish import request_lock
from douyin_delete import video_id


def save(path, value):
    temporary = path.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


class Deletions:
    def __init__(self, config_file, config):
        self.config_file, self.config = Path(config_file), config
        self.root = Path(config["privateDir"]) / "mcp-deletions"

    def run(self, operation, **kwargs):
        upstream = Path(self.config["upstream"])
        python = upstream / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        result = subprocess.run([str(python), "-B", str(Path(__file__).with_name("douyin_delete.py")),
                                 "--config", str(self.config_file)], input=json.dumps({"operation": operation, **kwargs}),
                                capture_output=True, encoding="utf-8", errors="replace", timeout=180,
                                env=dict(os.environ, PYTHONIOENCODING="utf-8"),
                                **({"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}))
        if result.returncode != 0:
            raise RuntimeError("ADAPTER_FAILED")
        value = json.loads(result.stdout)
        if not isinstance(value, dict):
            raise ValueError("INVALID_RECEIPT")
        return value

    @staticmethod
    def platform(name):
        if name != "douyin":
            raise ValueError("Only Douyin deletion is supported")

    def videos(self, platform):
        self.platform(platform)
        return self.run("list")

    def prepare(self, platform, item_id):
        self.platform(platform)
        item_id = video_id(item_id)
        target = self.run("prepare", videoId=item_id)
        if "error" in target:
            return target
        if target.get("videoId") != item_id or target.get("platform") != platform or not target.get("ownerId"):
            raise ValueError("Invalid target receipt")
        plan_id = str(uuid.uuid4())
        self.root.mkdir(parents=True, exist_ok=True)
        record = {"planId": plan_id, "target": target, "createdAt": datetime.now(timezone.utc).isoformat()}
        with (self.root / (plan_id + ".json")).open("x", encoding="utf-8") as stream:
            json.dump(record, stream, ensure_ascii=False)
        return {**record, "previewOnly": True, "guidance": "Permanent removal of this exact platform video. Local source file and other platforms remain. Obtain specific user deletion authorization."}

    def read(self, plan_id):
        plan_id = str(uuid.UUID(plan_id))
        record = json.loads((self.root / (plan_id + ".json")).read_text(encoding="utf-8"))
        if record["planId"] != plan_id or record["target"]["platform"] != "douyin":
            raise ValueError("Invalid plan")
        video_id(record["target"]["videoId"])
        return record

    def execute(self, plan_id, approved):
        if approved is not True:
            raise ValueError("Exact video deletion must be authorized")
        record = self.read(plan_id)
        target = record["target"]
        # Tombstone is per video, not per plan: a new plan cannot replay an unknown write.
        key = "douyin-" + target["videoId"]
        with request_lock(self.root, key):
            receipt = self.root / (key + ".receipt.json")
            if receipt.exists():
                return json.loads(receipt.read_text(encoding="utf-8"))
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(record["createdAt"])).total_seconds()
            if not 0 <= age < 900:
                raise ValueError("Preview expired; prepare again")
            pending = {"planId": record["planId"], "videoId": target["videoId"], "state": "unknown",
                       "attemptedAt": datetime.now(timezone.utc).isoformat(),
                       "guidance": "Inspect deletion status. Never retry with a new plan."}
            save(receipt, pending)  # Persist BEFORE starting a potentially destructive child.
            try:
                result = self.run("delete", target=target, approved=True)
                if result.get("state") not in ("deleted", "unknown"):
                    result = {"state": "needs_attention", "reason": result.get("error", "INVALID_RECEIPT")}
            except Exception:
                result = {"state": "unknown", "reason": "RECEIPT_UNAVAILABLE"}
            final = {**pending, **result}
            save(receipt, final)
            return final

    def status(self, plan_id, refresh=False):
        record = self.read(plan_id)
        receipt = self.root / ("douyin-" + record["target"]["videoId"] + ".receipt.json")
        result = json.loads(receipt.read_text(encoding="utf-8")) if receipt.exists() else {"state": "not_attempted"}
        if refresh:
            result = {**result, "observation": self.run("verify", target=record["target"])}
        return {"planId": record["planId"], "receipt": result}
