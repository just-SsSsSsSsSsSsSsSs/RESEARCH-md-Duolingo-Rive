#!/usr/bin/env python3
"""
Cache-Busting guard (G2): every local CSS/JS/JSON request the app makes must
carry ?v=<APP_VERSION>, importmap must cover every module in app/js, and the
app must boot with zero console errors under the importmap.
Usage: python3 app/tests/cachebust.py [base_url]
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/app/'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---- static checks ----
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
ver = re.search(r"APP_VERSION = '([^']+)'", open(os.path.join(ROOT, 'js/core/version.js')).read()).group(1)
local_assets = re.findall(r'(?:href|src)="((?:css|js)/[^"]+)"', html)
bad = [a for a in local_assets if f'?v={ver}' not in a]
assert not bad, f'unversioned assets: {bad}'
im = json.loads(re.search(r'<script type="importmap"[^>]*>(.*?)</script>', html, re.S).group(1))['imports']
mods = []
for dp, _, fns in os.walk(os.path.join(ROOT, 'js')):
    for fn in fns:
        if fn.endswith('.js'):
            mods.append('./' + os.path.relpath(os.path.join(dp, fn), ROOT).replace(os.sep, '/'))
missing = [m for m in mods if m not in im]
assert not missing, f'importmap missing: {missing}'
assert all(v.endswith(f'?v={ver}') for v in im.values()), 'importmap has stale versions'
print(f'static ok: v{ver}, {len(local_assets)} assets, {len(im)} modules mapped')

# ---- runtime checks ----
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    errors, reqs = [], []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('request', lambda r: reqs.append(r.url))
    pg.goto(BASE + '#/home', wait_until='networkidle')
    pg.wait_for_timeout(800)
    local = [u for u in reqs if u.startswith(BASE) and re.search(r'\.(js|css|json)(\?|$)', u)]
    unv = [u for u in local if f'v={ver}' not in u]
    assert local, 'no local asset requests captured'
    assert not unv, f'runtime unversioned requests: {unv}'
    assert not errors, f'console errors: {errors}'
    assert pg.locator('#app .view').count() >= 1, 'app did not render a view'
    print(f'runtime ok: {len(local)} versioned requests, 0 errors')
    b.close()
print('CACHEBUST PASS')
