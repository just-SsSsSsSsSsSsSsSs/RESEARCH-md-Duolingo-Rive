#!/usr/bin/env python3
"""E2E smoke test: boots app, picks a hero, visits every route, plays an activity to completion,
checks parent PIN flow, and asserts zero console errors / failed requests.
Usage: python3 app/tests/e2e.py [base_url]  (default http://localhost:8080/app/index.html)
"""
import sys, json, re
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/app/index.html'
errors, failed = [], []

def go(page, hash_, wait='.view'):
    page.goto(f'{BASE}#{hash_}')
    page.wait_for_selector(wait, timeout=15000)
    page.wait_for_timeout(300)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append(r.url))
    page.on('response', lambda r: failed.append(f'{r.status} {r.url}') if r.status >= 400 else None)

    # 1) profile picker
    go(page, '/profile', '.heroes .hero-card')
    assert page.locator('.hero-card').count() == 3, 'expected 3 heroes'
    page.locator('.hero-card').first.click()
    page.wait_for_selector('.topbar', timeout=10000)
    assert '#/home' in page.url, page.url
    print('✔ profile → home')

    # 2) home content
    assert page.locator('.grid-3 a').count() >= 4, 'subjects grid'
    assert page.locator('.nav a').count() == 5
    print('✔ home renders subjects + nav')

    # 3) each subject
    cat = json.loads(page.evaluate("fetch('content/catalog.json').then(r=>r.text())"))
    for s in cat['subjects']:
        go(page, f"/subject/{s['id']}", '.topbar')
        assert page.locator('.tile').count() >= 1, f"subject {s['id']} empty"
    print(f"✔ {len(cat['subjects'])} subject pages")

    # 4) every playable activity loads its intro
    playable = [i for i in cat['items'] if not i.get('external')]
    for it in playable:
        go(page, f"/play/{it['id']}", '[data-act="start"]')
    print(f"✔ {len(playable)} activities load")

    # 5) play one numpad activity to completion
    go(page, '/play/mult_3', '[data-act="start"]')
    page.click('[data-act="start"]')
    for _ in range(40):
        if page.locator('[data-act="again"]').count(): break
        page.wait_for_selector('.q-card', timeout=8000)
        qtext = page.locator('.q-text').inner_text()
        if page.locator('.numpad').count():
            # compute answer from question like "٣ × ٧ = ؟" or "٣ × ؟ = ٢١"
            t = qtext.translate(str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789'))
            nums = [int(x) for x in re.findall(r'\d+', t)]
            ans = nums[0] // nums[1] if '؟ =' in t or '× ؟' in t else nums[0] * nums[1]
            if '× ؟' in t: ans = nums[1] // nums[0]
            for ch in str(ans): page.locator('.numpad .btn').nth(['1','2','3','4','5','6','7','8','9','del','0','ok'].index(ch)).click()
            page.locator('.numpad .btn').nth(11).click()
        else:
            page.locator('.choice').first.click()
        page.wait_for_selector('.feedback [data-act="next"]', timeout=8000)
        page.click('.feedback [data-act="next"]')
        page.wait_for_timeout(150)
    assert page.locator('[data-act="again"]').count(), 'results screen not reached'
    xp = page.evaluate("JSON.parse(localStorage.getItem('abtal:v1:profile:selim')).xp")
    assert xp > 0, 'no XP awarded'
    print(f'✔ played mult_3 to completion, XP={xp}')

    # 6) other views
    go(page, '/quests', '.topbar'); assert page.locator('.card').count() >= 3
    go(page, '/badges', '.badge-grid .badge'); assert page.locator('.badge').count() >= 20
    go(page, '/profile', '.stats')
    print('✔ quests / badges / profile card')

    # 7) parent PIN set + dashboard
    go(page, '/parent', '.pin input')
    for i, d in enumerate('1234'): page.locator('.pin input').nth(i).fill(d)
    page.wait_for_selector('table, .chart', timeout=10000)
    assert page.locator('.chart').count() == 1
    print('✔ parent PIN + dashboard')

    # 8) bubbles canvas alive
    n = page.evaluate('window.__bubbles && window.__bubbles.bubbles.length')
    assert n and n >= 8, f'bubbles {n}'
    page.mouse.click(195, 700)
    print(f'✔ bubbles engine running ({n} bubbles)')

    page.screenshot(path='/tmp/abtal_home.png')
    b.close()

ignored = [e for e in errors if 'fonts.g' in e]
errors = [e for e in errors if e not in ignored]
failed = [f for f in failed if 'fonts.g' not in f]
print('\nConsole errors:', errors or 'none')
print('Failed requests:', failed or 'none')
if errors or failed: sys.exit(1)
print('\n✅ ALL E2E CHECKS PASSED')
