"""Only an expiring QR image/stage crosses the worker boundary, never cookies or URLs."""
import base64
import json
from pathlib import Path
import time


def write_view(private, stage, image=None):
    view = {"stage": stage, "createdAt": time.time()}
    if image:
        if len(image) > 260000 or not image.startswith(b"\x89PNG\r\n\x1a\n"):
            return
        view["image"] = "data:image/png;base64," + base64.b64encode(image).decode("ascii")
    target = Path(private) / "login-view.json"
    temp = target.with_suffix(".tmp")
    temp.write_text(json.dumps(view), encoding="utf-8")
    temp.replace(target)


def install_callbacks(cli, private):
    # sau_cli omits these supported callbacks. Keep upstream login/check logic intact.
    for name in ("xiaohongshu_setup", "tencent_setup", "douyin_setup"):
        original = getattr(cli, name)

        async def wrapped(*args, _original=original, **kwargs):
            async def on_qr(payload):
                path = Path(payload.get("image_path", "")).resolve()
                # Upstream generated files must stay inside this worker's private state.
                if path.is_relative_to(Path(private).resolve()) and path.is_file():
                    write_view(private, "qr", path.read_bytes())
            kwargs["qrcode_callback"] = on_qr
            result = await _original(*args, **kwargs)
            write_view(private, "verifying")
            return result

        setattr(cli, name, wrapped)


def read_view(private, platform, started):
    private = Path(private)
    if platform == "bilibili":
        qr = private / "qrcode.png"
        if qr.is_file() and started <= qr.stat().st_mtime and time.time() - qr.stat().st_mtime < 120:
            image = qr.read_bytes()
            if len(image) <= 260000 and image.startswith(b"\x89PNG\r\n\x1a\n"):
                return {"stage": "qr", "image": "data:image/png;base64," + base64.b64encode(image).decode("ascii")}
        return {"stage": "terminal"}
    path = private / "login-view.json"
    if path.is_file():
        view = json.loads(path.read_text(encoding="utf-8"))
        if view.get("createdAt", 0) >= started:
            if view["stage"] != "qr" or time.time() - view["createdAt"] < 120:
                return {key: view[key] for key in ("stage", "image") if key in view}
    return {"stage": "browser"}
