"""Phase 14.1 HOTFIX - closing the explain sheet with [X] after a miss must never freeze the question.

Root cause (verified in code): after a first miss renderers.lock() disables every answer button except
.explain-btn; opening the sheet removes the retry bar (play.js retryPrompt: explain click -> hide); the
[X] handler only closed the sheet -> no bar, no enabled answer = dead screen.
Fix: [X] behaves like "هجرّب أحلّ" (close + onTry). onTry is guarded by its callers (no-op unless a retry
is pending), so the Phase 11 K3 loop is unchanged.

Scenario on #/play/mult_3 (tts forced to the visual/speech fallback, no audio needed):
  A  Q1 wrong -> explain -> [X] -> same question re-asked as retry, empty, answer buttons ENABLED,
     no sheet/overlay; answer right -> recovered; exactly one heart lost.
  B  Q2 open explain BEFORE answering -> [X] -> nothing re-rendered (onTry no-op), still answerable.
  C  Q3 wrong -> explain -> [X] -> wrong again -> second-miss reveal (.feedback.bad + next) intact.
  Rest correct -> results card reached (session completable 100%).
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

def answer_enabled(pg):
    """Count enabled answer controls on the card (excluding the explain button)."""
    return pg.evaluate("document.querySelectorAll('.q-card button:not(.explain-btn):not([disabled])').length")

def close_x(pg):
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text')
    pg.click('.explain-sheet [data-act="close"]'); pg.wait_for_timeout(450)

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 412, 'height': 915})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("(()=>{window.__voice=Object.assign(window.__voice||{},{pref:'speech'});})()")
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    h0 = hearts(pg)

    # ---- A: wrong -> explain -> [X]
    st = q_now(pg); q1 = st['q']
    check(click_choice(pg, q1, correct=False), 'A: Q1 wrong click')
    pg.wait_for_selector('.feedback[data-retry]', timeout=5000)
    check(answer_enabled(pg) == 0, 'A: after the miss answer buttons are locked (K3 unchanged)')
    check(pg.locator('.feedback.bad').count() == 0, 'A: first miss does not reveal (K3 unchanged)')
    close_x(pg)
    check(pg.locator('.explain-sheet').count() == 0 and not pg.evaluate("document.body.classList.contains('has-sheet')"), 'A: sheet fully closed (no overlay)')
    st = q_now(pg)
    check(st['i'] == 0 and st['retry'] is True and st['q']['q'] == q1['q'], 'A: [X] re-asks the SAME question as a retry')
    check(answer_enabled(pg) > 0, f'A: answer buttons enabled after [X] (screen not frozen) -> {answer_enabled(pg)}')
    check(pg.locator('.choice.wrong, .choice.correct').count() == 0, 'A: question re-rendered empty')
    check(hearts(pg) == h0 - 1, 'A: exactly one heart lost')
    check(click_choice(pg, st['q'], correct=True), 'A: correct answer clickable after [X]')
    pg.wait_for_selector('.feedback.good', timeout=5000)
    check(pg.locator('.feedback.good.recovered').count() == 1, 'A: recovered feedback')
    pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(300)

    # ---- B: open explain before answering -> [X] -> no-op
    st = q_now(pg); q2 = st['q']; n_before = answer_enabled(pg)
    close_x(pg)
    st2 = q_now(pg)
    check(st2['i'] == 1 and st2['retry'] is False and st2['q']['q'] == q2['q'], 'B: [X] before any answer does not re-ask / change state')
    check(answer_enabled(pg) == n_before and n_before > 0, 'B: still answerable')
    click_choice(pg, q2, correct=True); pg.wait_for_selector('.feedback [data-act="next"]', timeout=5000)
    pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(300)

    # ---- C: wrong -> explain -> [X] -> wrong again -> reveal
    st = q_now(pg); q3 = st['q']
    click_choice(pg, q3, correct=False); pg.wait_for_selector('.feedback[data-retry]', timeout=5000)
    close_x(pg)
    st = q_now(pg); check(st['retry'] is True and answer_enabled(pg) > 0, 'C: re-asked and enabled after [X]')
    click_choice(pg, st['q'], correct=False); pg.wait_for_selector('.feedback.bad', timeout=5000)
    check(pg.locator('.feedback.bad [data-act="next"]').count() == 1, 'C: second miss reveals + next (K3 unchanged)')
    check(hearts(pg) == h0 - 2, 'C: one heart per question')
    pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(300)

    # ---- rest correct -> completable
    for _ in range(20):
        if pg.locator('[data-act="again"]').count(): break
        st = q_now(pg); click_choice(pg, st['q'], correct=True)
        pg.wait_for_selector('.feedback [data-act="next"]', timeout=8000); pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(250)
    r = pg.evaluate('window.__lastResult')
    check(bool(r) and r['total'] == 10 and r['correct'] == 9 and r.get('recovered') == 1, f'session completed: {r and (r["correct"], r["total"], r.get("recovered"))}')
    b.close()
print('pageerrors:', errs)
if fails or errs: print('FAIL', fails); sys.exit(1)
print('PASS phase14_1_deadlock')
