import asyncio
import base64
import os
from pathlib import Path
import tempfile
import time
import types
import unittest

from login_view import install_callbacks, read_view, write_view

PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=")


class LoginViewTests(unittest.TestCase):
    def test_stale_and_previous_job_images_are_not_reused(self):
        with tempfile.TemporaryDirectory() as d:
            start = time.time()
            write_view(d, "qr", PNG)
            self.assertEqual(read_view(d, "douyin", start)["stage"], "qr")
            self.assertEqual(read_view(d, "douyin", time.time() + 1)["stage"], "browser")
            qr = Path(d) / "qrcode.png"
            qr.write_bytes(PNG)
            os.utime(qr, (start - 500, start - 500))
            self.assertEqual(read_view(d, "bilibili", start)["stage"], "terminal")
            os.utime(qr, (time.time(), time.time()))
            self.assertEqual(read_view(d, "bilibili", start)["stage"], "qr")

    def test_upstream_callback_handoff_and_verification_clear_image(self):
        with tempfile.TemporaryDirectory() as d:
            start = time.time()
            qr = Path(d) / "qr.png"
            qr.write_bytes(PNG)

            async def setup(*args, **kwargs):
                await kwargs["qrcode_callback"]({"image_path": str(qr)})
                self.assertEqual(read_view(d, "douyin", start)["stage"], "qr")
                return {"success": True}

            cli = types.SimpleNamespace(**{name: setup for name in ("xiaohongshu_setup", "tencent_setup", "douyin_setup")})
            install_callbacks(cli, d)
            self.assertTrue(asyncio.run(cli.douyin_setup())["success"])
            self.assertEqual(read_view(d, "douyin", start), {"stage": "verifying"})


if __name__ == "__main__":
    unittest.main()
