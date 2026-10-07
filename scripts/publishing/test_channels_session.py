import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from channels_session import authenticated_page, wait_authenticated, save_state


def page(path='/platform', visible=False, qr=False, editor=False):
    entry = SimpleNamespace(count=AsyncMock(return_value=int(visible)), is_visible=AsyncMock(return_value=visible))
    frame = SimpleNamespace(url='https://channels.weixin.qq.com/editor', locator=lambda *a, **k: SimpleNamespace(count=AsyncMock(return_value=int(editor))))
    return SimpleNamespace(url='https://channels.weixin.qq.com'+path,
                           frames=[SimpleNamespace(url='https://open.weixin.qq.com/connect/qrconnect')] if qr else [frame],
                           locator=lambda *a, **k: SimpleNamespace(first=entry))


class ChannelsSessionTests(unittest.IsolatedAsyncioTestCase):
    async def test_blank_shell_never_passes_by_timeout_alone(self):
        self.assertFalse(await wait_authenticated(page(), timeout=0, interval=0))

    async def test_positive_home_and_editor_are_accepted(self):
        self.assertTrue(await authenticated_page(page(visible=True)))
        self.assertTrue(await authenticated_page(page('/platform/post/create', editor=True)))

    async def test_qr_or_login_route_overrides_positive_markers(self):
        self.assertFalse(await authenticated_page(page(visible=True, qr=True)))
        self.assertFalse(await authenticated_page(page('/login.html', visible=True)))

    async def test_refresh_saves_new_state_and_indexed_db(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'session.json';p.write_text('{"old":true}')
            context=SimpleNamespace(storage_state=AsyncMock(return_value={'cookies':[], 'origins':[{'indexedDB':[]}]}))
            await save_state(context,p)
            context.storage_state.assert_awaited_once_with(indexed_db=True)
            self.assertEqual(json.loads(p.read_text())['cookies'],[])
            self.assertEqual(len(list(Path(d).iterdir())),1)

    async def test_failed_refresh_preserves_original(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'session.json';p.write_text('{"old":true}')
            context=SimpleNamespace(storage_state=AsyncMock(side_effect=RuntimeError('not recorded')))
            with self.assertRaises(RuntimeError): await save_state(context,p)
            self.assertEqual(p.read_text(),'{"old":true}')


if __name__=='__main__': unittest.main()
