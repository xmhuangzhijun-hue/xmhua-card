import json, sys, urllib.request, concurrent.futures, xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

base = sys.argv[1].rstrip('/')
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.canonical=[]; self.schemas=[]; self.capture=False; self.buffer=''; self.author_links=[]; self.robots=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href'))
        if tag=='meta' and a.get('name')=='robots': self.robots.append(a.get('content'))
        if tag=='a' and a.get('rel')=='author': self.author_links.append(a.get('href'))
        if tag=='script' and a.get('type')=='application/ld+json': self.capture=True; self.buffer=''
    def handle_data(self,data):
        if self.capture: self.buffer+=data
    def handle_endtag(self,tag):
        if tag=='script' and self.capture:
            self.schemas.append(json.loads(self.buffer)); self.capture=False
def fetch(path):
    req=urllib.request.Request(base+path,headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req,timeout=30) as r: return r.read().decode()
checks=[]
for path in ['/', '/about', '/notes', '/work', '/privacy', '/notes/agent-harness']:
    raw=fetch(path); p=Page(); p.feed(raw)
    assert p.canonical == ['https://huangzhijun.online'+path], (path,p.canonical)
    assert 'noindex' not in ' '.join(p.robots)
    if path=='/about':
        profile=next(s for s in p.schemas if s['@type']=='ProfilePage')
        assert profile['mainEntity']['name']=='黄智军'
        assert 'https://github.com/xmhuangzhijun-hue' in profile['mainEntity']['sameAs']
        assert 'https://huangzhijun.online/' in raw
    if path.startswith('/notes/'):
        assert p.author_links==['/about']; assert p.schemas[0]['@type']=='BlogPosting'
    if path=='/': assert 'href="/about"' in raw
    checks.append(dict(path=path,canonical=p.canonical[0],schemas=[s['@type'] for s in p.schemas]))
robots=fetch('/robots.txt'); assert 'Sitemap: https://huangzhijun.online/sitemap.xml' in robots
root=ET.fromstring(fetch('/sitemap.xml'))
urls=[n.text for n in root.findall('.//{*}loc')]
content=json.loads(fetch('/api/content'))['data']
expected={'https://huangzhijun.online'+p for p in ['/','/notes','/work']}
expected.update('https://huangzhijun.online/'+p['slug'] for p in content['pages'])
expected.update('https://huangzhijun.online/notes/'+a['slug'] for a in content['articles'] if a['published'])
assert set(urls)==expected,(len(urls),len(expected))
assert not any('/admin' in u or '/preview/' in u for u in urls)
admin=Page(); admin.feed(fetch('/admin')); assert any('noindex' in r for r in admin.robots)
def check_url(url):
    path=url.removeprefix('https://huangzhijun.online'); raw=fetch(path)
    p=Page(); p.feed(raw); assert p.canonical==[url], (url,p.canonical)
    return path
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    checked=list(pool.map(check_url,urls))
result=dict(base=base,checks=checks,sitemap_urls=len(urls),all_sitemap_pages_ok=len(checked),admin_noindex=True)
print(json.dumps(result,ensure_ascii=False,indent=2))
