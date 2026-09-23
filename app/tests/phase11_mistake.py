"""Phase 11 / K3 - mistake learning loop (DOM evidence in Chromium).

Scenario on #/play/mult_3 (10 generated questions):
  Q1  wrong on purpose -> retry bar (no answer, no q.explain), card shakes, explain button pulses,
      hearts -1 ; open explain sheet -> "هجرّب أحلّ" re-asks the SAME question empty ; answer right
      -> "recovered" feedback (learned from mistake), hearts unchanged.
  Q2  wrong twice -> normal bad feedback WITH q.explain ; hearts -1 in total (not -2).
  Q3..Q10 correct first try.
  Results: score counts Q1 as correct (9/10), perfect=false, review button shows (2) -> review round of
  the 2 missed questions (tag visible, practice: no heart loss), solve both -> review result card.
"""
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8090/app/index.html'
AR2EN = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')

def q_now(pg): return pg.evaluate('window.__play')

NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']
def type_numpad(pg, ans):
    for ch in str(ans): pg.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
    pg.locator('.numpad .btn').nth(11).click()

def click_choice(pg, q, correct=True):
    """Answer the current question right or wrong (same solver shape as math_random.py)."""
    t = q['type']
    if t == 'truefalse':
        pg.locator('.choices .choice').nth((0 if q['answer'] else 1) if correct else (1 if q['answer'] else 0)).click(); return True
    if t == 'pick':
        n = pg.locator('.pick-grid .choice').count()
        idx = q['correct'] if correct else [i for i in range(n) if i not in q['correct']][:1]
        for i in idx: pg.locator('.pick-grid .choice').nth(i).click()
        pg.locator('.q-card .btn-primary').click(); return True
    if (t == 'grid' and q.get('mode') == 'quiz') or (t != 'grid' and pg.locator('.numpad').count() == 0 and q.get('choices')):
        want = str(q['choices'][q['answer']]).translate(AR2EN)
        for c in pg.locator('.choices .choice').all():
            if (c.inner_text().strip().translate(AR2EN) == want) == correct: c.click(); return True
        return False
    ans = int(str(q['answer']).translate(AR2EN))
    type_numpad(pg, ans if correct else ans + 1); return True

def hearts(pg): return pg.evaluate("(async()=>{const m=await import('./js/engines/hearts.js');return m.default.count})()")

fails = []
def check(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 412, 'height': 915})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    h0 = hearts(pg); print('hearts at start', h0)

    # ---- Q1: wrong -> retry -> explain -> try -> correct
    st = q_now(pg); q1 = st['q']; check(st['i'] == 0 and not st['retry'], 'Q1 shown, not a retry')
    check(click_choice(pg, q1, correct=False), 'Q1 wrong click possible')
    pg.wait_for_selector('.feedback[data-retry]', timeout=5000)
    fb = pg.locator('.feedback[data-retry]').inner_text()
    check('f-exp' not in pg.locator('.feedback[data-retry]').inner_html() or (q1.get('explain') or '@@') not in fb, 'retry bar does not spoil q.explain')
    if q1.get('choices') and isinstance(q1.get('answer'), int) and q1['type'] != 'pick':
        check(str(q1['choices'][q1['answer']]) not in fb, 'retry bar does not contain the correct choice text')
    check(pg.locator('.q-card.shake-soft').count() == 1, 'card shakes softly')
    check(pg.locator('.explain-btn.pulse').count() == 1, 'explain button pulses')
    check(hearts(pg) == h0 - 1, 'one heart lost on first miss')
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text')
    check(pg.locator('.feedback[data-retry]').count() == 0, 'retry bar hides when explain sheet opens')
    pg.click('.explain-sheet [data-act="try"]'); pg.wait_for_timeout(400)
    st = q_now(pg)
    check(st['i'] == 0 and st['retry'] is True and st['q']['q'] == q1['q'], '"هجرّب أحلّ" re-asks the same question as a retry')
    check(pg.locator('.q-card.retry').count() == 1 and pg.locator('.choice.wrong, .choice.correct').count() == 0, 'question re-rendered empty (no marked choices)')
    check(click_choice(pg, st['q'], correct=True), 'Q1 correct click on retry')
    pg.wait_for_selector('.feedback.good', timeout=5000)
    check(pg.locator('.feedback.good.recovered').count() == 1, 'recovered feedback shown ("learned from the mistake")')
    check(hearts(pg) == h0 - 1, 'no extra heart lost on the retry')
    pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(300)

    # ---- Q2: wrong twice -> bad feedback with explanation, one heart total
    st = q_now(pg); q2 = st['q']; check(st['i'] == 1, 'Q2 shown')
    click_choice(pg, q2, correct=False); pg.wait_for_selector('.feedback[data-retry]')
    pg.click('.feedback[data-retry] [data-act="retry"]'); pg.wait_for_timeout(300)
    st = q_now(pg); check(st['retry'] is True and st['q']['q'] == q2['q'], '"جرّب تاني" re-asks Q2')
    click_choice(pg, st['q'], correct=False); pg.wait_for_selector('.feedback.bad', timeout=5000)
    if q2.get('explain'): check(q2['explain'] in pg.locator('.feedback.bad').inner_text(), 'second miss shows q.explain')
    check(hearts(pg) == h0 - 2, 'Q2 cost exactly one heart in total')
    pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(300)

    # ---- Q3..: correct
    while True:
        st = q_now(pg)
        if pg.locator('[data-act="again"]').count(): break
        click_choice(pg, st['q'], correct=True); pg.wait_for_selector('.feedback [data-act="next"]', timeout=8000); pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(250)
        if pg.locator('[data-act="again"]').count(): break
    r = pg.evaluate('window.__lastResult')
    check(r['correct'] == 9 and r['wrong'] == 1 and r['total'] == 10, f"score counts the recovered Q1: {r['correct']}/{r['total']} wrong={r['wrong']}")
    check(r['perfect'] is False and r.get('recovered') == 1 and sorted(r.get('missed', [])) == [0, 1], 'perfect=false, recovered=1, missed=[0,1]')
    check(pg.locator('[data-act="review"]').count() == 1 and '٢' in pg.locator('[data-act="review"]').inner_text(), 'review button offers the 2 missed questions')

    # ---- review round
    hr = hearts(pg)
    pg.click('[data-act="review"]'); pg.wait_for_selector('.q-card')
    st = q_now(pg); check(st['review'] is True and st['total'] == 2 and st['q']['q'] == q1['q'], 'review round starts with Q1, total=2')
    check(pg.locator('[data-review-tag]').count() == 1, 'review tag visible')
    click_choice(pg, st['q'], correct=False); pg.wait_for_selector('.feedback.bad', timeout=5000)
    check(pg.locator('.feedback[data-retry]').count() == 0, 'review round: no retry bar (normal feedback)')
    check(hearts(pg) == hr, 'review round is practice: no heart lost')
    pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(300)
    st = q_now(pg); click_choice(pg, st['q'], correct=True); pg.wait_for_selector('.feedback [data-act="next"]'); pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(400)
    rr = pg.evaluate('window.__lastResult')
    check(pg.locator('[data-review-result]').count() == 1 and rr['review'] is True and rr['correct'] == 1 and rr['total'] == 2, 'review result card shown with 1/2')
    b.close()
print('pageerrors:', errs)
if fails or errs: print('FAIL', fails); sys.exit(1)
print('PASS phase11_mistake')
