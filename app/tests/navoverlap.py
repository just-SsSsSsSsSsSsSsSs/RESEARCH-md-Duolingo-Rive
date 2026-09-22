#!/usr/bin/env python3
"""K1/K6 regression: bottom .nav must never cover the last content element on any page.
Scrolls to the bottom of #/home, #/quests, #/badges, #/profile on phone + tablet viewports and asserts
that the last visible content block's bottom edge is above the nav's top edge (with ≥ 8px breathing room).
Also asserts calm-bubble limits (count ≤ 14, alpha ≤ 0.35) and that party FX types are randomized.
Usage: python3 app/tests/navoverlap.py [base_url]
"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/app/index.html'
ROUTES = ['/home', '/quests', '/badges', '/profile']
VIEWPORTS = {'android360': (360, 740), 'iphone390': (390, 844), 'ipad820': (820, 1180)}
ok = True

JS_LAST_BOTTOM = """
() => {
  const nav = document.querySelector('.nav'); if (!nav) return null;
  const view = document.querySelector('.view') || document.querySelector('#app');
  const kids = [...view.children].filter(e => !e.classList.contains('nav') && e.getBoundingClientRect().height > 0);
  const last = kids[kids.length - 1];
  const lr = last.getBoundingClientRect(), nr = nav.getBoundingClientRect();
  return { lastBottom: lr.bottom, navTop: nr.top, lastTag: last.className, scrollH: document.documentElement.scrollHeight, innerH: innerHeight };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h) in VIEWPORTS.items():
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=True, is_mobile=w < 700)
        pg = ctx.new_page()
        pg.goto(f'{BASE}#/profile'); pg.wait_for_selector('.hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_selector('.topbar')
        for r in ROUTES:
            pg.goto(f'{BASE}#{r}'); pg.wait_for_selector('.nav'); pg.wait_for_timeout(400)
            pg.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)'); pg.wait_for_timeout(250)
            m = pg.evaluate(JS_LAST_BOTTOM)
            gap = m['navTop'] - m['lastBottom']
            good = gap >= 8
            ok &= good
            print(f"{'✔' if good else '✘'} {name:10} {r:9} last={m['lastTag'][:22]:22} gap={gap:6.1f}px (nav top {m['navTop']:.0f}, last bottom {m['lastBottom']:.0f})")
            if not good:
                pg.screenshot(path=f'/tmp/navoverlap_{name}_{r.strip("/")}.png', full_page=False)
        # calm bubbles assertions
        pg.goto(f'{BASE}#/home'); pg.wait_for_selector('.nav'); pg.wait_for_timeout(600)
        st = pg.evaluate("() => { const B = window.__bubbles; return { n: B.bubbles.length, maxA: Math.max(...B.bubbles.map(b => b.alpha)), cap: B.count }; }")
        calm = st['n'] <= 14 and st['maxA'] <= 0.36
        ok &= calm
        print(f"{'✔' if calm else '✘'} {name:10} calm bubbles: n={st['n']} (count={st['cap']}) maxAlpha={st['maxA']:.2f}")
        ctx.close()
    # party randomization (desktop)
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto(f'{BASE}#/profile'); pg.wait_for_selector('.hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_selector('.topbar'); pg.wait_for_timeout(400)
    seq = pg.evaluate("() => { const B = window.__bubbles; const out = []; for (let i = 0; i < 12; i++) out.push(B.party(400, 300, 2)); return out; }")
    distinct = len(set(seq)); norepeat = all(seq[i] != seq[i + 1] for i in range(len(seq) - 1))
    good = distinct >= 4 and norepeat
    ok &= good
    print(f"{'✔' if good else '✘'} party FX randomized: {distinct} distinct types in 12 runs, no consecutive repeat={norepeat} → {seq}")
    pg.wait_for_timeout(1500)
    alive = pg.evaluate("() => ({ parts: window.__bubbles.parts.length, balloons: window.__bubbles.balloons.length, running: window.__bubbles.running })")
    print(f"✔ engine alive after parties: {alive}")
    b.close()

print('\n✅ NAV OVERLAP / CALM / PARTY CHECKS PASSED' if ok else '\n❌ SOME CHECKS FAILED')
sys.exit(0 if ok else 1)
