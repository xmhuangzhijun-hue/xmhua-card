from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from channels_submission import ChannelsSubmissionError, submit_once


def fixture(url='https://channels.weixin.qq.com/platform/post/create', listed=False, disabled=False):
    button = SimpleNamespace(count=AsyncMock(return_value=1), is_visible=AsyncMock(return_value=True),
                             is_disabled=AsyncMock(return_value=disabled), click=AsyncMock())
    match = SimpleNamespace(count=AsyncMock(return_value=int(listed)),
                            nth=lambda i: SimpleNamespace(is_visible=AsyncMock(return_value=listed)))
    page = SimpleNamespace(url='https://channels.weixin.qq.com/platform/post/create', get_by_role=lambda *a, **k: SimpleNamespace(first=button),
                           get_by_text=lambda *a, **k: match)
    async def click(**kwargs): page.url=url
    button.click.side_effect=click
    uploader = SimpleNamespace(title='fixture title', wait_for_realtime_verification=AsyncMock(return_value=None))
    return uploader, page, button


class SubmissionTests(unittest.IsolatedAsyncioTestCase):
    async def test_uncertain_result_never_repeats_click(self):
        u,p,b=fixture()
        with self.assertRaises(ChannelsSubmissionError) as caught:
            await submit_once(u,p,timeout=0)
        self.assertEqual(caught.exception.code,'submit_unconfirmed')
        b.click.assert_awaited_once()

    async def test_click_timeout_does_not_fallback_to_script_click(self):
        u,p,b=fixture(); b.click.side_effect=TimeoutError('private text')
        with self.assertRaises(ChannelsSubmissionError) as caught:
            await submit_once(u,p,timeout=0)
        self.assertEqual(str(caught.exception),'submit_unconfirmed')
        b.click.assert_awaited_once()

    async def test_verification_timeout_never_clicks(self):
        u,p,b=fixture();u.wait_for_realtime_verification.side_effect=TimeoutError()
        with self.assertRaises(TimeoutError): await submit_once(u,p,timeout=0)
        b.click.assert_not_awaited()

    async def test_disabled_button_is_not_forced(self):
        u,p,b=fixture(disabled=True)
        with self.assertRaises(ChannelsSubmissionError) as caught: await submit_once(u,p,timeout=0)
        self.assertEqual(caught.exception.code,'submit_not_ready')
        b.click.assert_not_awaited()

    async def test_home_or_login_redirect_is_not_success(self):
        for url in ['https://channels.weixin.qq.com/platform','https://channels.weixin.qq.com/login.html']:
            u,p,b=fixture(url,listed=True)
            with self.assertRaises(ChannelsSubmissionError): await submit_once(u,p,timeout=0)

    async def test_empty_list_is_not_a_receipt(self):
        u,p,b=fixture('https://channels.weixin.qq.com/platform/post/list')
        with self.assertRaises(ChannelsSubmissionError): await submit_once(u,p,timeout=0)

    async def test_matching_list_evidence_and_one_click(self):
        u,p,b=fixture('https://channels.weixin.qq.com/platform/post/list',listed=True)
        await submit_once(u,p,timeout=0)
        b.click.assert_awaited_once()
        self.assertEqual(u.wait_for_realtime_verification.await_count,2)

    async def test_existing_list_cannot_be_misread_as_new_submission(self):
        u,p,b=fixture(listed=True);p.url='https://channels.weixin.qq.com/platform/post/list'
        with self.assertRaises(ChannelsSubmissionError): await submit_once(u,p,timeout=0)
        b.click.assert_not_awaited()
