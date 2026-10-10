import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
import uuid

from action_diagnostics import Diagnostics, read_diagnostic
from codex_publish import account_state
from channels_submission import ChannelsSubmissionError


class SessionEvidenceTests(unittest.TestCase):
    def test_specific_submission_and_verification_codes_survive_dispatch(self):
        for code,phase in [('submit_unconfirmed','submit'),('verification_timeout','verification')]:
            with tempfile.TemporaryDirectory() as directory:
                root=Path(directory); job_id=str(uuid.uuid4())
                (root/'pending-job.json').write_text(json.dumps({'id':job_id}))
                diagnostic=Diagnostics(root)
                async def fail(args):
                    diagnostic.record(code,phase)
                    if code=='submit_unconfirmed': raise ChannelsSubmissionError(code)
                    raise TimeoutError('private challenge data')
                cli=SimpleNamespace(dispatch=fail,build_parser=lambda:SimpleNamespace(parse_args=lambda args:args))
                self.assertEqual(diagnostic.dispatch(cli,[]),1)
                result=read_diagnostic(root,job_id)
                self.assertEqual(result['code'],code)
                self.assertEqual(result['phase'],phase)

    def test_nonzero_exit_is_never_marked_completed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); job_id = str(uuid.uuid4())
            (root/'pending-job.json').write_text(json.dumps({"id": job_id}))
            diagnostic = Diagnostics(root)
            async def fail(args):
                return 1
            cli = SimpleNamespace(dispatch=fail, build_parser=lambda: SimpleNamespace(parse_args=lambda args: args))
            self.assertEqual(diagnostic.dispatch(cli, []), 1)
            self.assertEqual(read_diagnostic(root, job_id)["code"], "upstream_failed")

    def test_channels_same_day_cache_is_not_ready_for_publication(self):
        now = datetime.now(timezone.utc)
        old = {"authenticated": True, "checkedAt": (now - timedelta(hours=9)).isoformat()}
        self.assertEqual(account_state("tencent", old, [], now), "needs_check")
        self.assertEqual(account_state("bilibili", old, [], now), "ready")

    def test_new_failure_invalidates_old_success_but_new_check_recovers(self):
        now = datetime.now(timezone.utc)
        account = {"authenticated": True, "checkedAt": (now - timedelta(seconds=90)).isoformat()}
        jobs = [{"platform": "tencent", "state": "needs_attention", "updatedAt": (now-timedelta(seconds=10)).isoformat()}]
        self.assertEqual(account_state("tencent", account, jobs, now), "needs_check")
        account["checkedAt"] = now.isoformat()
        self.assertEqual(account_state("tencent", account, jobs, now), "ready")

    def test_failure_stage_never_persists_sensitive_exception(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            job_id = str(uuid.uuid4())
            (root/'pending-job.json').write_text(json.dumps({"id": job_id}))
            diagnostic = Diagnostics(root)
            async def fail(args):
                diagnostic.record(phase="upload_file")
                raise RuntimeError("SECRET EXAMPLE COOKIE and private filename")
            cli = SimpleNamespace(dispatch=fail, build_parser=lambda: SimpleNamespace(parse_args=lambda args: args))
            self.assertEqual(diagnostic.dispatch(cli, []), 1)
            result = read_diagnostic(root, job_id)
            self.assertEqual(result["phase"], "upload_file")
            self.assertEqual(result["code"], "upstream_failed")
            raw = (root/'diagnostics'/f'{job_id}.json').read_text()
            self.assertNotIn("SECRET", raw)
            self.assertNotIn("filename", raw)

    def test_session_failure_retains_specific_code(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); job_id = str(uuid.uuid4())
            (root/'pending-job.json').write_text(json.dumps({"id": job_id}))
            diagnostic = Diagnostics(root)
            async def fail(args):
                diagnostic.record("session_check_failed", "session_check")
                raise RuntimeError("do not expose")
            cli = SimpleNamespace(dispatch=fail, build_parser=lambda: SimpleNamespace(parse_args=lambda args: args))
            self.assertEqual(diagnostic.dispatch(cli, []), 1)
            self.assertEqual(read_diagnostic(root, job_id)["code"], "session_check_failed")

    def test_untrusted_extra_fields_are_not_returned(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); job_id = str(uuid.uuid4())
            (root/'diagnostics').mkdir()
            path=root/'diagnostics'/f'{job_id}.json'
            path.write_text(json.dumps({"jobId":job_id,"code":"running","phase":"submit","updatedAt":1,"secret":"hidden"}))
            self.assertNotIn('secret', read_diagnostic(root,job_id))
            self.assertIsNone(read_diagnostic(root,'../anything'))


if __name__ == '__main__':
    unittest.main()
