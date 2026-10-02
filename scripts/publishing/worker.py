"""Local pull worker. Credentials and upstream browser state stay in a private directory.

Run with --config <private JSON path>. No inbound port, shell commands, or remote code.
"""
import argparse
import json
import os
import shutil
import signal
from pathlib import Path
import subprocess
import sys
import threading
import time
from urllib.parse import urlparse
import uuid

import requests

PLATFORMS = {"xiaohongshu", "tencent", "douyin", "bilibili", "youtube"}


def save(path, data):
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    temp.replace(path)


class Worker:
    def __init__(self, config):
        self.config = config
        self.base = config["site"].rstrip("/")
        site = urlparse(self.base)
        if site.scheme != "https" and not (site.scheme == "http" and site.hostname in {"127.0.0.1", "localhost"}):
            raise ValueError("HTTPS required")
        self.state = Path(config["privateDir"]).resolve()
        self.state.mkdir(parents=True, exist_ok=True)
        self.headers = {"Authorization": "Bearer " + config["token"]}
        self.pending = self.state / "pending-job.json"
        self.stop = threading.Event()

    def post(self, path, body=None):
        response = requests.post(self.base + "/api/publishing-worker" + path, json=body or {}, headers=self.headers, timeout=30, allow_redirects=False)
        if response.status_code == 409 and path.endswith("/report"):
            return None  # Receipt already persisted; never repeat the action.
        response.raise_for_status()
        return response.json()["data"]

    def heartbeat(self):
        while not self.stop.is_set():
            try:
                self.post("/heartbeat")
            except requests.RequestException:
                pass
            self.stop.wait(10)

    def download(self, asset_id):
        asset_id = str(uuid.UUID(asset_id))
        path = self.state / (asset_id + ".mp4")
        if path.exists():
            return path
        temporary = path.with_suffix(".part")
        with requests.get(self.base + "/api/publishing-worker/assets/" + asset_id, headers=self.headers, stream=True, timeout=60, allow_redirects=False) as response:
            response.raise_for_status()
            expected_size = int(response.headers.get("Content-Length") or 512 * 1024 * 1024)
            if shutil.disk_usage(self.state).free < expected_size + 256 * 1024 * 1024:
                raise RuntimeError("Insufficient space for a private video copy")
            size = 0
            with temporary.open("wb") as out:
                for chunk in response.iter_content(1024 * 1024):
                    size += len(chunk)
                    if size > 512 * 1024 * 1024:
                        raise ValueError("Video too large")
                    out.write(chunk)
            expected = response.headers.get("Content-Length")
            if expected and size != int(expected):
                raise ValueError("Incomplete download")
        temporary.replace(path)
        return path

    def execute(self, job):
        try:
            return self.execute_action(job)
        finally:
            # The API retains the original asset; cloud scratch copies are not an archive.
            if self.config.get("cloud") and job["kind"] == "publish":
                asset_id = str(uuid.UUID(job["payload"]["assetId"]))
                (self.state / (asset_id + ".mp4")).unlink(missing_ok=True)
                (self.state / (asset_id + ".part")).unlink(missing_ok=True)

    def execute_action(self, job):
        platform, kind = job["platform"], job["kind"]
        if platform not in PLATFORMS or kind not in {"login", "check", "publish"}:
            return {"state": "failed", "message": "不支持的任务类型。"}
        task = {"platform": platform, "kind": kind, "payload": job["payload"]}
        if kind == "publish":
            task["file"] = str(self.download(job["payload"]["assetId"]))
        action_file = self.state / "current-action.json"
        save(action_file, task)
        child_env = dict(os.environ, SAU_PRIVATE_DIR=str(self.state), SAU_SOURCE_DIR=self.config["upstream"], PYTHONIOENCODING="utf-8")
        if self.config.get("chrome"):
            child_env["SAU_CHROME"] = self.config["chrome"]
        if self.config.get("cloud"):
            child_env["SAU_CLOUD"] = "1"
            if self.config.get("youtubeProxy"):
                child_env["SAU_YOUTUBE_PROXY"] = self.config["youtubeProxy"]
        command = [sys.executable, str(Path(__file__).with_name("run_action.py")), str(action_file)]
        if self.config.get("cloud") and kind == "login" and platform == "bilibili":
            command = ["xterm", "-fa", "Monospace", "-fs", "12", "-geometry", "110x36+0+0", "-T", "Bilibili Login", "-e", *command]
        interactive = kind == "login" and platform == "bilibili" and os.name == "nt"
        kwargs = {"creationflags": subprocess.CREATE_NEW_CONSOLE} if interactive else {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL, "stdin": subprocess.DEVNULL}
        if os.name != "nt":
            kwargs["start_new_session"] = True
        process = subprocess.Popen(command, cwd=self.state, env=child_env, **kwargs)
        try:
            code = process.wait(timeout=2400 if kind == "publish" else 600)
        except subprocess.TimeoutExpired:
            if os.name == "nt":
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
            return {"state": "needs_attention", "message": "执行超时，请检查登录窗口和平台记录；没有自动重发。"}
        if kind == "publish":
            return {"state": "submitted" if code == 0 else "needs_attention", "message": "上传程序已完成提交，请到平台核验审核和公开状态。" if code == 0 else "上传未确认完成，请先检查平台记录，避免重复发布。"}
        if kind == "check":
            return {"state": "completed", "authenticated": code == 0, "message": "登录状态有效。" if code == 0 else "尚未登录或登录检查失败，请打开登录窗口重新验证。"}
        return {"state": "completed" if code == 0 else "needs_attention", "authenticated": code == 0, "message": "登录并校验完成。" if code == 0 else "登录未完成，请重新点击登录并在登录窗口完成验证。"}

    def loop(self):
        # Hold an OS lock for this profile; two workers must never share browser cookies.
        lock = (self.state / "worker.lock").open("a+b")
        lock.seek(0)
        if os.name == "nt":
            import msvcrt
            if lock.read(1) == b"":
                lock.write(b"0"); lock.flush()
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        threading.Thread(target=self.heartbeat, daemon=True).start()
        print("Publishing worker started", flush=True)
        recovered = False
        while True:
            try:
                if self.pending.exists():
                    record = json.loads(self.pending.read_text(encoding="utf-8"))
                    result = record.get("result") or {"state": "needs_attention", "message": "执行服务曾中断，请核验平台结果；任务未自动重试。"}
                    self.post("/jobs/" + str(uuid.UUID(record["id"])) + "/report", result)
                    self.pending.unlink()
                if not recovered:
                    self.post("/recover")
                    recovered = True
                job = self.post("/claim")
                if job:
                    save(self.pending, {"id": job["id"]})
                    try:
                        result = self.execute(job)
                    except Exception:
                        result = {"state": "needs_attention", "message": "执行器遇到错误，请检查连接或执行服务运行环境；没有自动重发。"}
                    save(self.pending, {"id": job["id"], "result": result})
                    print("Task result:", job["platform"], job["kind"], result["state"], flush=True)
            except requests.RequestException:
                print("Connection unavailable; retaining pending receipt", flush=True)
            time.sleep(3)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    Worker(json.loads(Path(args.config).read_text(encoding="utf-8-sig"))).loop()
