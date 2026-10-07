"""Positive Channels auth evidence and atomic refresh of the existing saved session."""
import asyncio
import json
from pathlib import Path
import time
from urllib.parse import urlsplit
import uuid


def login_page(page):
    return (urlsplit(page.url).path.startswith('/login') or
            any('open.weixin.qq.com/connect/qrconnect' in frame.url for frame in page.frames))


async def authenticated_page(page):
    url = urlsplit(page.url)
    if url.hostname != 'channels.weixin.qq.com' or not url.path.startswith('/platform') or login_page(page):
        return False
    # Upstream open_upload_page uses this actual visible home-page entry.
    entry = page.locator('button.weui-desktop-btn', has_text='发表视频').first
    if await entry.count() and await entry.is_visible():
        return True
    # The editor can be mounted inside a same-site iframe.
    for frame in page.frames:
        if urlsplit(frame.url).hostname == 'channels.weixin.qq.com':
            if await frame.locator('input[type="file"]').count():
                return True
    return False


async def wait_authenticated(page, timeout=30, interval=0.5):
    deadline = time.monotonic() + timeout
    while True:
        if login_page(page):
            return False
        if await authenticated_page(page):
            # A transient shell must not pass before its late login redirect.
            await asyncio.sleep(interval)
            return await authenticated_page(page)
        if time.monotonic() >= deadline:
            return False
        await asyncio.sleep(interval)


async def save_state(context, account_file):
    """Keep the original intact on collection/write failure; include IndexedDB."""
    path = Path(account_file)
    state = await context.storage_state(indexed_db=True)
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        temporary.write_text(json.dumps(state), encoding='utf-8')
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def install(cli, private):
    from uploader.tencent_uploader import main as upstream
    allowed = (Path(private) / 'cookies' / 'tencent_blog.json').resolve()

    async def check(account_file):
        path = Path(upstream._resolve_account_file(account_file)).resolve()
        if path != allowed or not path.is_file():
            return False
        async with upstream.async_playwright() as playwright:
            browser = await playwright.chromium.launch(**upstream._build_launch_kwargs(headless=True))
            try:
                context = await browser.new_context(storage_state=str(path))
                context = await upstream.set_init_script(context)
                page = await context.new_page()
                # The upload deep link can render an unauthenticated blank shell.
                await page.goto(upstream.TENCENT_HOME_URL, wait_until='domcontentloaded', timeout=45000)
                if not await wait_authenticated(page):
                    return False
                await save_state(context, path)
                return True
            except Exception:
                # Never export raw browser errors, cookies or account identifiers.
                return False
            finally:
                await browser.close()

    # CLI check holds an imported alias; setup/uploader validation use module global.
    cli.tencent_cookie_auth = check
    upstream.cookie_auth = check
    upstream._is_tencent_login_completed = authenticated_page
