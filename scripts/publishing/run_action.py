"""Thin adapter to upstream sau_cli. No credentials or raw upstream logs leave this process."""
import json
import os
from pathlib import Path
import sys
import types


def main():
    task = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    if os.name == "nt" and task["kind"] == "login" and task["platform"] == "bilibili":
        # The background worker has redirected handles; bind the new login console explicitly.
        sys.stdin = open("CONIN$", "r", encoding="utf-8")
        sys.stdout = open("CONOUT$", "w", encoding="utf-8", buffering=1)
        sys.stderr = sys.stdout
    source = Path(os.environ["SAU_SOURCE_DIR"]).resolve()
    private = Path(os.environ["SAU_PRIVATE_DIR"]).resolve()
    # Upstream conf.BASE_DIR owns cookies/logs. Keep it out of the checkout and sync folders.
    conf = types.ModuleType("conf")
    conf.BASE_DIR = private
    conf.XHS_SERVER = "http://127.0.0.1:11901"
    conf.LOCAL_CHROME_PATH = os.environ.get("SAU_CHROME", "")
    conf.LOCAL_CHROME_HEADLESS = True
    conf.DEBUG_MODE = False
    conf.YT_PROXY = None
    sys.modules["conf"] = conf
    sys.path.insert(0, str(source))
    # This utility reads bundled JS, not account state. Resolve its resources from
    # the upstream checkout while conf.BASE_DIR keeps cookies/logs private.
    import utils.base_social_media as browser_support
    browser_support.BASE_DIR = source
    import sau_cli
    from loguru import logger
    logger.remove()  # Upstream diagnostic messages may contain session data.
    platform, kind = task["platform"], task["kind"]
    if platform not in {"xiaohongshu", "tencent", "douyin", "bilibili", "youtube"}:
        return 2
    if os.environ.get("SAU_CLOUD") == "1":
        # Normalize upstream channel names to one pinned cloud browser binary.
        from patchright.async_api import BrowserType
        launch = BrowserType.launch
        async def cloud_launch(browser_type, **options):
            options.pop("channel", None)
            options["executable_path"] = os.environ["SAU_CHROME"]
            options["args"] = [*options.get("args", []), "--disable-dev-shm-usage", "--window-size=1280,900"]
            if platform == "youtube" and os.environ.get("SAU_YOUTUBE_PROXY"):
                options["proxy"] = {"server": os.environ["SAU_YOUTUBE_PROXY"]}
            browser = await launch(browser_type, **options)
            new_context = browser.new_context
            async def cloud_context(**context_options):
                context = await new_context(**context_options)
                # A cold browser on a small cloud host can exceed upstream's 30s navigation limit.
                context.set_default_navigation_timeout(90000)
                return context
            browser.new_context = cloud_context
            return browser
        BrowserType.launch = cloud_launch
    args = [platform, "upload-video" if kind == "publish" else kind, "--account", "blog"]
    if kind == "login" and platform != "bilibili":
        args += ["--headed"]
    if kind == "publish":
        payload = task["payload"]
        args += ["--file", task["file"], "--title", payload["title"], "--desc", payload.get("description", ""), "--tags", ",".join(payload.get("tags", []))]
        if platform == "bilibili":
            args += ["--tid", str(int(payload.get("category", 249)))]
        else:
            args += ["--headed"]
    code = sau_cli.main(args)
    if kind == "login" and code == 0:
        code = sau_cli.main([platform, "check", "--account", "blog"])
    return code


if __name__ == "__main__":
    raise SystemExit(main())
