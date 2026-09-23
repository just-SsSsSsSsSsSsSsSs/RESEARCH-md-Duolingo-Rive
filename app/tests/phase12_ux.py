"""Phase 12.1 UX polish (gist 1187b2e8) - the three defects found in the owner's live mouse+keyboard test.

1. Enter must never skip the question: while a branch tree is open, pressing Enter (even repeated, even right
   after the tree completes) only verifies the active slot; the question index does not change.
2. Encouragement after a wrong slot is a pill ABOVE the card (not a floater over the tree), stays >= 3s,
   and does not overlap the sum row.
3. Smart auto-advance: typing the expected number of digits verifies the slot without tapping the green check;
   tapping another slot first settles the current one; keyboard digits work too.
"""
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8090/app/index.html'
NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']
AR2EN = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
fails = []
def check(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
def tap_digits(pg, v):
    for ch in str(v): pg.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
def type_numpad(pg, v): tap_digits(pg, v); pg.locator('.numpad .btn').nth(11).click()
def slots(pg): return pg.evaluate('window.__branch.slots()')
def open_branch(pg):
    pg.goto(BASE + '#/play/distributive'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    for _ in range(12):
        st = pg.evaluate('window.__play')
        if st['q']['type'] == 'branch': pg.wait_for_selector('.branch .br-path'); pg.wait_for_timeout(400); return st
        q = st['q']
        if q['type'] == 'numpad': type_numpad(pg, q['answer'])
        else:
            want = str(q['choices'][q['answer']]).translate(AR2EN)
            for c in pg.locator('.choices .choice').all():
                if c.inner_text().strip().translate(AR2EN) == want: c.click(); break
        pg.wait_for_selector('.feedback [data-act="next"]', timeout=8000); pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(250)
    return None

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 412, 'height': 915})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    st = open_branch(pg); assert st, 'no branch question found'
    q = st['q']; a, bb, s1, s2 = q['a'], q['b'], q['s1'], q['s2']; i0 = st['i']
    P1, P2, SUM = a * s1, a * s2, a * bb
    print(f'branch: {a} x {bb} = ({a} x {s1}) + ({a} x {s2}); question index {i0}')

    # ---- 1) Enter never skips
    for _ in range(3): pg.keyboard.press('Enter')
    pg.wait_for_timeout(300)
    check(pg.evaluate('window.__play.i') == i0 and pg.locator('.branch').count() == 1, 'Enter x3 with empty slot: same question, tree still open')
    check(pg.locator('.feedback').count() == 0, 'Enter did not open any feedback bar')
    pg.keyboard.type(str(s2 + 1)); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    check(pg.evaluate('window.__branch.misses()') == ['part2'] and pg.evaluate('window.__play.i') == i0, 'Enter verifies the active slot (miss recorded), question unchanged')

    # ---- 2) encouragement pill above the card, not over the tree, stays >= 3s
    check(pg.locator('.nudge-pill').count() == 1, 'nudge pill shown after a wrong slot')
    geo = pg.evaluate('''() => { const p = document.querySelector('.nudge-pill'), c = document.querySelector('.q-card'), t = document.querySelector('.branch-total'); const pr = p.getBoundingClientRect(), cr = c.getBoundingClientRect(), tr = t.getBoundingClientRect(); return { pillBottom: pr.bottom, cardTop: cr.top, overlapsTotal: !(pr.bottom <= tr.top || pr.top >= tr.bottom) }; }''')
    check(geo['pillBottom'] <= geo['cardTop'] + 1, f"pill sits above the card (pill bottom {geo['pillBottom']:.0f} <= card top {geo['cardTop']:.0f})")
    check(not geo['overlapsTotal'], 'pill does not overlap the sum row')
    check(all('بطل' not in t and 'جرّب' not in t for t in pg.locator('.fx-float').all_inner_texts()), 'no encouragement floater over the tree')
    pg.wait_for_timeout(3000); check(pg.locator('.nudge-pill').count() == 1, 'pill still visible after 3s')
    pg.wait_for_timeout(1200); check(pg.locator('.nudge-pill').count() == 0, 'pill gone after ~4s')

    # ---- 3) smart auto-advance
    tap_digits(pg, s2); pg.wait_for_timeout(350)
    sl = slots(pg); check(sl['part2']['ok'] and sl['prod1']['active'], 'typing the expected digit count auto-verifies part2 -> prod1 active (no check tap)')
    if len(str(P1)) == 2:
        tap_digits(pg, str(P1)[0])                       # partial (wrong) entry
        pg.locator('.br-slot[data-slot="sum"]').click(); pg.wait_for_timeout(350)
        sl = slots(pg); check(not sl['prod1']['ok'] and sl['prod1']['active'], 'tapping another slot verifies the current partial entry first (miss) and keeps focus')
    else:
        pg.locator('.br-slot[data-slot="sum"]').click(); pg.wait_for_timeout(200)
        sl = slots(pg); check(sl['sum']['active'], 'tapping an empty slot with nothing typed moves focus')
        pg.locator('.br-slot[data-slot="prod1"]').click(); pg.wait_for_timeout(200)
    tap_digits(pg, P1); pg.wait_for_timeout(350)
    sl = slots(pg); check(sl['prod1']['ok'], 'prod1 verified by auto-advance')
    pg.keyboard.type(str(P2)); pg.wait_for_timeout(350)
    sl = slots(pg); check(sl['prod2']['ok'] and sl['sum']['active'], 'keyboard digits auto-verify prod2 -> sum active')
    tap_digits(pg, SUM); pg.wait_for_timeout(400)
    check(pg.locator('.feedback.good, .feedback.recovered').count() == 1, 'tree complete -> feedback shown (green check optional)')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    check(pg.locator('.feedback').count() == 1 and pg.evaluate('window.__play.i') == i0, 'Enter immediately after completion does not skip')
    pg.wait_for_timeout(1000); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    check(pg.evaluate('window.__play.i') == i0 + 1 or pg.locator('[data-act="again"]').count() == 1, 'a fresh Enter after ~1s advances (keyboard still usable)')
    b.close()
print('pageerrors:', errs)
if fails or errs: print('FAIL', fails); sys.exit(1)
print('PASS phase12_ux')
