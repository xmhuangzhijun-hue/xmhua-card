"""Allowlisted phase receipts only: no exception messages, URLs, text or credentials."""
import asyncio
import json
from pathlib import Path
import time
import uuid
from channels_submission import ChannelsSubmissionError

PHASES = {"starting", "session_check", "open_editor", "upload_file", "fill_form", "wait_upload", "submit", "finished",
          "verification", "fill_title", "fill_description", "short_title"}
CODES = {"running", "completed", "session_check_failed", "upstream_failed", "verification_timeout",
         "submit_not_ready", "submit_unconfirmed"}


def read_diagnostic(private, job_id):
    try:
        job_id = str(uuid.UUID(job_id))
        data = json.loads((Path(private) / "diagnostics" / (job_id + ".json")).read_text(encoding="utf-8"))
        if not isinstance(data, dict) or data.get("jobId") != job_id or data.get("phase") not in PHASES or data.get("code") not in CODES:
            return None
        if type(data.get("updatedAt")) not in (int, float):
            return None
        return {k: data[k] for k in ("phase", "code", "updatedAt")}
    except (OSError, ValueError, KeyError):
        return None


class Diagnostics:
    def __init__(self, private):
        self.private, self.phase = Path(private), "starting"
        # Existing worker persists this ID before invoking the child. No worker restart needed.
        pending = json.loads((self.private / "pending-job.json").read_text(encoding="utf-8"))
        self.job_id = str(uuid.UUID(pending["id"]))

    def record(self, code="running", phase=None):
        self.phase = phase or self.phase
        if code not in CODES or self.phase not in PHASES:
            raise ValueError("Invalid diagnostic")
        directory = self.private / "diagnostics"
        directory.mkdir(exist_ok=True)
        path = directory / (self.job_id + ".json")
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps({"jobId": self.job_id, "phase": self.phase, "code": code,
                                         "updatedAt": time.time()}), encoding="utf-8")
        temporary.replace(path)

    def install_channels(self, cli):
        original = cli.tencent_setup
        async def setup(*args, **kwargs):
            self.record(phase="session_check")
            result = await original(*args, **kwargs)
            if result is False:
                self.record("session_check_failed")
            return result
        cli.tencent_setup = setup
        from uploader.tencent_uploader.main import TencentBaseUploader, TencentVideo
        verification = TencentBaseUploader.wait_for_realtime_verification
        async def verify(*args, **kwargs):
            previous_phase = self.phase
            self.record(phase="verification")
            try:
                result = await verification(*args, **kwargs)
            except TimeoutError:
                self.record("verification_timeout")
                raise
            self.record(phase=previous_phase)
            return result
        TencentBaseUploader.wait_for_realtime_verification = verify
        for cls, name, phase in [
            (TencentBaseUploader, "validate_base_args", "session_check"),
            (TencentBaseUploader, "open_upload_page", "open_editor"),
            (TencentBaseUploader, "upload_video_file", "upload_file"),
            (TencentVideo, "prepare_video_for_publish", "fill_form"),
            (TencentBaseUploader, "fill_title_and_tags", "fill_title"),
            (TencentBaseUploader, "fill_description", "fill_description"),
            (TencentBaseUploader, "set_short_title", "short_title"),
            (TencentBaseUploader, "wait_for_upload_complete", "wait_upload"),
            (TencentBaseUploader, "submit_publish", "submit"),
        ]:
            method = getattr(cls, name)
            async def wrapped(*args, _method=method, _phase=phase, **kwargs):
                self.record(phase=_phase)
                return await _method(*args, **kwargs)
            setattr(cls, name, wrapped)

    def dispatch(self, cli, args):
        self.record()
        try:
            result = asyncio.run(cli.dispatch(cli.build_parser().parse_args(args)))
            if result == 0:
                self.record("completed", "finished")
            else:
                previous = read_diagnostic(self.private, self.job_id)
                if not previous or previous["code"] in {"running", "completed"}:
                    self.record("upstream_failed")
            return result
        except ChannelsSubmissionError as exc:
            self.record(exc.code if exc.code in CODES else "upstream_failed")
            return 1
        except Exception:
            previous = read_diagnostic(self.private, self.job_id)
            if not previous or previous["code"] in {"running", "completed"}:
                self.record("upstream_failed")
            return 1
