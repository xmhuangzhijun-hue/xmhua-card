"""Conservative Channels submission: preserve dialogs and never retry a click."""
import asyncio
import time
from urllib.parse import urlsplit


class ChannelsSubmissionError(RuntimeError):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


async def submit_once(uploader, page, timeout=60, interval=0.5):
    initial = urlsplit(page.url)
    if initial.hostname != 'channels.weixin.qq.com' or initial.path.rstrip('/') != '/platform/post/create':
        raise ChannelsSubmissionError('submit_not_ready')
    # Owner-only security challenges remain visible and are never dismissed here.
    await uploader.wait_for_realtime_verification(page)
    draft = getattr(uploader, 'is_draft', False)
    button = page.get_by_role('button', name='保存草稿' if draft else '发表', exact=True).first
    if not await button.count() or not await button.is_visible() or await button.is_disabled():
        raise ChannelsSubmissionError('submit_not_ready')
    try:
        await button.click(timeout=4000)
    except Exception:
        # A click may have reached the server even if the client reports a timeout.
        raise ChannelsSubmissionError('submit_unconfirmed') from None

    deadline = time.monotonic() + timeout
    while True:
        # The challenge may arrive asynchronously after clicking; only the owner
        # completes it. Give receipt navigation its full window after completion.
        if await uploader.wait_for_realtime_verification(page):
            deadline = time.monotonic() + timeout
        url = urlsplit(page.url)
        # URL change/button disappearance alone is not a publication receipt.
        if url.hostname == 'channels.weixin.qq.com' and url.path.rstrip('/') == '/platform/post/list':
            match = page.get_by_text(uploader.title, exact=False)
            for index in range(await match.count()):
                if await match.nth(index).is_visible():
                    return
        if time.monotonic() >= deadline:
            raise ChannelsSubmissionError('submit_unconfirmed')
        await asyncio.sleep(interval)


def install():
    from uploader.tencent_uploader.main import TencentBaseUploader
    TencentBaseUploader.submit_publish = submit_once
