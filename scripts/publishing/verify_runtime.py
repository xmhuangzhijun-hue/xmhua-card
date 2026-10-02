"""Check the actual adapter's private paths and upstream browser initialization, without login."""
import argparse
import asyncio
import json
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory

import run_action


async def verify(private):
    import conf
    import sau_cli
    from patchright.async_api import async_playwright
    from utils.base_social_media import set_init_script
    assert Path(conf.BASE_DIR) == private
    assert Path(sau_cli.resolve_account_file("xiaohongshu", "blog")).is_relative_to(private)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True, channel="chromium")
        try:
            context = await browser.new_context()
            await set_init_script(context)
            page = await context.new_page()
            await page.goto("about:blank")
        finally:
            await browser.close()
    print("PASS: actual adapter keeps account state private; matching browser and bundled JS initialize")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--upstream", required=True)
    args = parser.parse_args()
    with TemporaryDirectory(prefix="publishing-runtime-check-") as temporary:
        private = Path(temporary).resolve()
        task = private / "action.json"
        task.write_text(json.dumps({"platform": "xiaohongshu", "kind": "check", "payload": {}}), encoding="utf-8")
        os.environ["SAU_PRIVATE_DIR"] = str(private)
        os.environ["SAU_SOURCE_DIR"] = str(Path(args.upstream).resolve())
        sys.argv = ["run_action.py", str(task)]
        assert run_action.main() == 1, "Fresh private profile must be unauthenticated"
        asyncio.run(verify(private))
