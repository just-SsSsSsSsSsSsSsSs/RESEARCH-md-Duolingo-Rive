"""Phase 12 / L3 - 'branch' renderer (schoolbook distributive tree, design A) - Chromium DOM evidence.

  1. Geometry on 3 mobile widths (360 / 412 / 430): the two SVG connector paths start at the root capsule's
     left edge (RTL) and end at the branch anchors' right edge, within 3px; the sum line spans the sum row.
  2. Interaction: slots fill in order part2 -> prod1 -> prod2 -> sum via the shared numpad; any slot is tappable;
     a wrong value marks the slot orange, shakes, never reveals the answer, costs one heart only once,
     pulses the explain button; completing the tree fires done(true) exactly once -> good feedback.
  3. The question is counted as missed -> shows up in the review round list (missed contains its index).
"""
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8090/app/index.html'
NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']
fails = []
def check(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
def type_numpad(pg, v):
    for ch in str(v): pg.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
    pg.locator('.numpad .btn').nth(11).click()
def hearts(pg): return pg.evaluate("(async()=>{const m=await import('./js/engines/hearts.js');return m.default.count})()")
GEO = '''() => { const w = document.querySelector('.branch'); const R = w.getBoundingClientRect();
  const rel = (r) => ({ x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height, r: r.right - R.left });
  const root = rel(w.querySelector('[data-root] .br-eq').getBoundingClientRect());
  const an = [1, 2].map((i) => rel(w.querySelector(`[data-anchor="${i}"]`).getBoundingClientRect()));
  const paths = [...w.querySelectorAll('.br-path')].map((p) => { const L = p.getTotalLength(); const s = p.getPointAtLength(0), e = p.getPointAtLength(L); return { sx: s.x, sy: s.y, ex: e.x, ey: e.y }; });
  const sl = rel(w.querySelector('[data-sumline]').getBoundingClientRect()); const line = w.querySelector('.br-sum');
  const slots = [...w.querySelectorAll('.br-slot')].map((b) => { const r = b.getBoundingClientRect(); return { slot: b.dataset.slot, w: r.width, h: r.height }; });
  return { root, an, paths, sl, line: line ? { x1: +line.getAttribute('x1'), x2: +line.getAttribute('x2') } : null, slots, svgW: w.querySelector('.branch-svg').getBoundingClientRect().width, W: R.width }; }'''

def open_branch(pg):
    """navigate to distributive and step until a branch question is current; returns __play"""
    pg.goto(BASE + '#/play/distributive'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    for _ in range(12):
        st = pg.evaluate('window.__play')
        if st['q']['type'] == 'branch': pg.wait_for_selector('.branch .br-path'); pg.wait_for_timeout(400); return st
        q = st['q']
        if q['type'] == 'numpad': type_numpad(pg, q['answer'])
        else:
            want = str(q['choices'][q['answer']]).translate(str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789'))
            for c in pg.locator('.choices .choice').all():
                if c.inner_text().strip().translate(str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')) == want: c.click(); break
        pg.wait_for_selector('.feedback [data-act="next"]', timeout=8000); pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(250)
    return None

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- 1. geometry on three widths
    keep = None
    for W in (360, 430, 412):
        pg = b.new_page(viewport={'width': W, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
        st = open_branch(pg)
        if not st: check(False, f'[{W}] no branch question generated in 12 tries'); pg.close(); continue
        g = pg.evaluate(GEO)
        check(len(g['paths']) == 2, f'[{W}] two connector paths drawn')
        for i, pth in enumerate(g['paths']):
            an = g['an'][i]
            r = g['root']; tx = min(max(g['an'][0]['r'] + 18, r['x'] + 18), r['x'] + r['w'] - 18)
            check(abs(pth['sx'] - tx) <= 3 and abs(pth['sy'] - (r['y'] + r['h'])) <= 3 and r['x'] < pth['sx'] < r['x'] + r['w'], f"[{W}] path{i+1} starts on the root's bottom edge (trunk x={pth['sx']:.0f} inside root {r['x']:.0f}..{r['x']+r['w']:.0f})")
            check(abs(pth['ex'] - (an['r'] + 4)) <= 3 and abs(pth['ey'] - (an['y'] + an['h'] / 2)) <= 3, f"[{W}] path{i+1} ends at branch{i+1} anchor right edge (dx={pth['ex']-(an['r']+4):.1f}, dy={pth['ey']-(an['y']+an['h']/2):.1f})")
            check(pth['sx'] >= pth['ex'], f"[{W}] path{i+1} never doubles back over the anchor (trunk is right of it, RTL)")
        check(g['line'] and abs(g['line']['x1'] - g['sl']['x']) <= 1 and abs(g['line']['x2'] - (g['sl']['x'] + g['sl']['w'])) <= 1, f'[{W}] sum line spans the sum row')
        check(all(s['h'] >= 48 and s['w'] >= 48 for s in g['slots']) and all(s['h'] >= 56 for s in g['slots'] if s['slot'] != 'part2'), f"[{W}] slots are finger-sized {[(s['slot'], round(s['w']), round(s['h'])) for s in g['slots']]}")
        check(g['svgW'] >= g['W'] - 2 and not errs, f'[{W}] svg covers the tree, no pageerrors')
        if W != 412: pg.close()
        else: keep = (pg, st)
    # ---- 2. interaction (on the 412 page still open)
    pg, st = keep
    q = st['q']; a, bb, s1, s2 = q['a'], q['b'], q['s1'], q['s2']
    h0 = hearts(pg)
    sl = pg.evaluate('window.__branch.slots()'); check(sl['part2']['active'] and not any(v['ok'] for v in sl.values()), 'part2 is the first active slot, nothing solved yet')
    type_numpad(pg, s2 + 1)  # wrong on purpose
    pg.wait_for_timeout(200)
    txt = pg.locator('.branch').inner_text()
    check(pg.locator('.br-slot.bad').count() == 1 and str(s2) not in pg.locator('[data-slot="part2"]').inner_text(), 'wrong slot marked orange, value not revealed')
    check(pg.locator('.branch.shake-soft').count() == 1, 'tree shook softly')
    check(pg.locator('.explain-btn.pulse').count() == 1, 'explain button pulses after a slot miss')
    check(hearts(pg) == h0 - 1, 'one heart lost on first slot miss')
    check(pg.locator('.feedback').count() == 0, 'no feedback bar / no reveal after a slot miss (stays in the question)')
    type_numpad(pg, s2 + 2)  # second wrong -> no extra heart
    pg.wait_for_timeout(150); check(hearts(pg) == h0 - 1, 'second slot miss does not cost another heart')
    type_numpad(pg, s2)
    sl = pg.evaluate('window.__branch.slots()'); check(sl['part2']['ok'] and sl['prod1']['active'], 'part2 solved -> prod1 auto-active')
    # tap the sum slot directly (any slot tappable), fill it, then back to prod1/prod2
    pg.click('[data-slot="sum"]'); type_numpad(pg, a * bb)
    sl = pg.evaluate('window.__branch.slots()'); check(sl['sum']['ok'] and sl['prod1']['active'], 'sum solved out of order -> next empty (prod1) active')
    type_numpad(pg, a * s1); type_numpad(pg, a * s2)
    pg.wait_for_selector('.feedback.good', timeout=5000)
    check(pg.locator('.feedback.good.recovered').count() == 1, 'tree complete -> recovered feedback (learned from the slot mistake)')
    check(pg.evaluate('window.__branch.misses()') == ['part2', 'part2'], 'misses recorded per slot')
    check(pg.locator('.br-slot:not(.ok)').count() == 0 and pg.locator('.numpad .btn:not([disabled])').count() == 0, 'all slots green and numpad locked')
    pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(300)
    check(pg.evaluate('window.__play.i') == st['i'] + 1, 'done(true) fired exactly once -> moved to next question')
    b.close()
if fails: print('FAIL', fails); sys.exit(1)
print('PASS phase12_branch')
