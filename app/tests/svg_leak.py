#!/usr/bin/env python3
"""HOTFIX regression (PR #5): no raw SVG markup may ever appear as *text* in the rendered DOM.
Visits every route + plays a numpad question wrong + opens parent PIN with a wrong code, then asserts
`document.body.innerText` contains no '<svg', '</svg>', 'i3d-' or 'viewBox' substrings, and that hud titles
with icons render an actual <svg> element inside <b.grow>.
Also statically greps the source for textContent/esc() applied to ico3d output.
"""
import sys, re, pathlib
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/app/index.html'
ROOT = pathlib.Path(__file__).resolve().parents[1]
ok = True
def check(c, m):
    global ok; ok &= bool(c); print(('✔ ' if c else '✘ ') + m)

# --- static ---
bad = []
for p in (ROOT / 'js').rglob('*.js'):
    for i, l in enumerate(p.read_text(encoding='utf-8').splitlines(), 1):
        if 'ico3d(' in l and ('textContent' in l and re.search(r"textContent\s*=\s*[^;]*ico3d\(", l)): bad.append(f'{p.name}:{i} textContent')
        if re.search(r"esc\([^()]*ico3d\(", l): bad.append(f'{p.name}:{i} esc(ico3d)')
        if re.search(r"hud\(\{[^}]*title:[^}]*ico3d\(", l): bad.append(f'{p.name}:{i} hud title ico3d')
check(not bad, f"static: no textContent/esc()/hud-title applied to ico3d output {bad if bad else ''}")

LEAK = re.compile(r'<svg|</svg>|i3d-|viewBox|</g>|</path>')
def leak(pg, label):
    txt = pg.evaluate("() => document.body.innerText")
    m = LEAK.search(txt)
    check(not m, f"no raw SVG text on {label}" + (f"  → found {txt[max(0, m.start()-30):m.start()+40]!r}" if m else ''))

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'{BASE}#/profile'); pg.wait_for_selector('.hero-card'); leak(pg, '/profile (picker)')
    pg.locator('.hero-card').first.click(); pg.wait_for_selector('.topbar')
    for r in ['/home', '/quests', '/badges', '/profile', '/subject/math', '/subject/quran', '/parent']:
        pg.goto(f'{BASE}#{r}'); pg.wait_for_selector('.view'); pg.wait_for_timeout(300); leak(pg, r)
        if r in ('/quests', '/badges', '/subject/math'):
            n = pg.evaluate("() => document.querySelectorAll('.topbar b.grow svg.i3d').length")
            check(n >= 1, f"  hud title icon rendered as real <svg> on {r} ({n})")
    # parent: wrong PIN message (pre-set a PIN in store meta so the gate asks for it, then enter a wrong one)
    pg.goto(f'{BASE}#/home'); pg.wait_for_selector('.view')
    pg.evaluate("async () => { const { default: store } = await import('./js/core/store.js'); store.setMeta({ parentPin: 'deadbeef' }); }")
    pg.goto(f'{BASE}#/parent'); pg.wait_for_selector('.pin input', timeout=10000)
    for i, d in enumerate('9999'): pg.locator('.pin input').nth(i).fill(d)
    pg.wait_for_timeout(600); leak(pg, '/parent wrong-PIN message')
    check(pg.evaluate("() => !!document.querySelector('.view svg.i3d-cross')"), "  wrong-PIN message renders real cross icon")
    # numpad wrong answer box
    pg.goto(f'{BASE}#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    if pg.locator('.numpad').count():
        pg.locator('.numpad .btn').filter(has_text=re.compile(r'^[9٩]$')).first.click(); pg.wait_for_timeout(80)
        pg.locator('.numpad .btn').filter(has_text=re.compile(r'^[9٩]$')).first.click(); pg.wait_for_timeout(80)  # 99 -> always wrong
        pg.locator('.numpad .btn-primary').first.click(); pg.wait_for_timeout(500)
        leak(pg, 'numpad wrong-answer box')
        check(pg.evaluate("() => !!document.querySelector('.q-card svg.i3d-cross')"), "  wrong-answer box renders real cross icon")
    else:
        pg.locator('.choice').first.click(); pg.wait_for_timeout(500); leak(pg, 'quiz feedback')
    check(not errs, f"no page errors ({len(errs)})")
    b.close()
print('\n✅ SVG-LEAK REGRESSION PASSED' if ok else '\n❌ SVG-LEAK REGRESSION FAILED')
sys.exit(0 if ok else 1)
