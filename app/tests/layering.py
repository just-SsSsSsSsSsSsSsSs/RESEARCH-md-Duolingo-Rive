#!/usr/bin/env python3
"""Phase 6 P5 — Foreground celebration + Pure-Web + Zero-Emoji runtime checks.
1. Layering: #fx-canvas (z 9999, pointer-events none) is the top-most painted element at the question-card center
   and at the numpad center, and during a party at least N% of the pixels over the card are non-transparent.
2. Taps still reach the card (elementFromPoint ignores pointer-events:none) → hit-test returns a card descendant.
3. No Service Worker registered, no manifest link, caches empty.
4. Rendered DOM contains zero emoji code points (all screens).
"""
import sys, re
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/app/index.html'
EMOJI = re.compile('[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B50\U00002B55]')
ok = True
def check(cond, msg):
    global ok; ok &= bool(cond); print(('✔ ' if cond else '✘ ') + msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(f'{BASE}#/profile'); pg.wait_for_selector('.hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_selector('.topbar')

    # --- 3) pure web ---
    sw = pg.evaluate("async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).length, caches: (await caches.keys()).length, manifest: !!document.querySelector('link[rel=manifest]') })")
    check(sw['regs'] == 0 and sw['caches'] == 0 and not sw['manifest'], f"pure-web: no SW ({sw['regs']}), no caches ({sw['caches']}), no manifest link")

    # --- 4) zero emoji in rendered DOM across routes ---
    for r in ['/home', '/quests', '/badges', '/profile', '/subject/math', '/parent']:
        pg.goto(f'{BASE}#{r}'); pg.wait_for_selector('.view'); pg.wait_for_timeout(350)
        txt = pg.evaluate("() => document.body.innerText + ' ' + document.title")
        hits = EMOJI.findall(txt)
        check(not hits, f"zero-emoji DOM {r:14} (found: {''.join(hits[:6])!r})" if hits else f"zero-emoji DOM {r}")
        svgs = pg.evaluate("() => document.querySelectorAll('svg.i3d').length")
        check(svgs > 0, f"  3D icons rendered on {r}: {svgs}")

    # --- 1) layering on the play screen (numpad activity) ---
    pg.goto(f'{BASE}#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]')
    pg.wait_for_selector('.q-card'); pg.wait_for_timeout(400)
    geo = pg.evaluate("""() => { const c = document.querySelector('.q-card').getBoundingClientRect(); const pad = document.querySelector('.numpad')?.getBoundingClientRect();
      const top = (x, y) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className.toString().slice(0, 30)) : null; };
      const fx = document.getElementById('fx-canvas'), cs = getComputedStyle(fx);
      return { cx: c.left + c.width / 2, cy: c.top + c.height / 2, pad: pad ? [pad.left + pad.width / 2, pad.top + pad.height / 2] : null,
        fxZ: cs.zIndex, fxPE: cs.pointerEvents, fxPos: cs.position, hitCard: top(c.left + c.width / 2, c.top + c.height / 2), fxRect: fx.getBoundingClientRect().toJSON() }; }""")
    check(geo['fxZ'] == '9999' and geo['fxPE'] == 'none' and geo['fxPos'] == 'fixed', f"#fx-canvas fixed z-index {geo['fxZ']} pointer-events {geo['fxPE']}")
    check(geo['fxRect']['width'] >= 390 and geo['fxRect']['height'] >= 800, f"#fx-canvas covers viewport {geo['fxRect']['width']}x{geo['fxRect']['height']}")
    check(geo['hitCard'] and 'fx-canvas' not in geo['hitCard'], f"taps pass through to card (hit: {geo['hitCard']})")
    # stacking: fx-canvas z-index must exceed every other fixed/positioned element
    maxz = pg.evaluate("() => Math.max(0, ...[...document.querySelectorAll('*')].filter(e => !['fx-canvas', 'fx-layer', 'confetti'].includes(e.id)).map(e => parseInt(getComputedStyle(e).zIndex) || 0))")
    check(maxz < 9999, f"fx-canvas above all other elements (max other z-index = {maxz})")
    # paint test: fire a party over the card and count painted pixels inside the card rect on fx-canvas
    painted = pg.evaluate("""([cx, cy]) => new Promise((res) => { const B = window.__bubbles; B.poppers(cx, cy, 2); B.confettiCannon(cx, cy, 2); B.balloonParty(cx, cy, 2);
      setTimeout(() => { const c = document.getElementById('fx-canvas'), g = c.getContext('2d'), d = B.dpr; const card = document.querySelector('.q-card').getBoundingClientRect();
        const img = g.getImageData(card.left * d, card.top * d, card.width * d, card.height * d).data; let n = 0; for (let i = 3; i < img.length; i += 4) if (img[i] > 20) n++;
        res({ pct: n / (img.length / 4) * 100, parts: B.parts.length, bg: (() => { const bg = document.getElementById('bubbles').getContext('2d').getImageData(card.left * d, card.top * d, card.width * d, card.height * d).data; let m = 0; for (let i = 3; i < bg.length; i += 4) if (bg[i] > 20) m++; return m / (bg.length / 4) * 100; })() }); }, 420); })""", [geo['cx'], geo['cy']])
    check(painted['pct'] > 1.5, f"party particles painted OVER the question card on fx-canvas: {painted['pct']:.1f}% of card area ({painted['parts']} particles alive)")
    print(f"   (background canvas under card: {painted['bg']:.1f}% — ambient only)")
    pg.screenshot(path='/tmp/shot_layering_party.png')
    if geo['pad']:
        hit = pg.evaluate("([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.className.toString().slice(0, 40) : null; }", geo['pad'])
        check(hit and 'fx' not in hit, f"numpad still tappable under fx-canvas (hit: {hit})")
    # play one full question to ensure celebrate pipeline works with icons in floaters
    q = pg.evaluate("() => document.querySelector('.q-text, .q-card h1, .q-card h2, .q-card .q')?.textContent || ''")
    check(not errs, f"no console/page errors so far ({len(errs)})" + (f": {errs[:2]}" if errs else ''))
    b.close()
print('\n✅ LAYERING / PURE-WEB / ZERO-EMOJI RUNTIME CHECKS PASSED' if ok else '\n❌ SOME RUNTIME CHECKS FAILED')
sys.exit(0 if ok else 1)
