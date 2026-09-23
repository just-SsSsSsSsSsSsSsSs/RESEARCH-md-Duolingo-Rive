"""Phase 12 / L4c - shared mistake loop in the Quran phases (order / fill) and the plant story (DOM evidence).

Owner decision (gist 3f69e14a): first miss -> second try, correct answer NEVER revealed, only the *position*
of the mistake highlighted (.wrong), heart taken once; second try right -> "recovered" cheer; second miss ->
normal feedback with the answer revealed.
"""
import sys, os, json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8090/app/index.html'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
fails = []
def check(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
def hearts(pg): return pg.evaluate("(async()=>{const m=await import('./js/engines/hearts.js');return m.default.count})()")
def act(aid): return json.load(open(os.path.join(ROOT, 'app/content/activities', aid + '.json'), encoding='utf-8'))

def expect_retry(pg, label):
    pg.wait_for_selector('.feedback[data-retry]', timeout=8000)
    check(pg.locator('.q-card .wrong').count() >= 1, f'{label}: mistake position highlighted (.wrong)')
    check(pg.locator('.q-card .correct').count() == 0, f'{label}: correct answer NOT revealed on first miss')
    check(pg.locator('.feedback[data-retry] [data-act="retry"]').count() == 1, f'{label}: retry bar with "جرّب تاني"')
    check(pg.locator('.q-card.shake-soft').count() == 1, f'{label}: soft shake')
    check(pg.locator('.explain-btn.pulse').count() == 1, f'{label}: explain button pulses')

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 412, 'height': 915})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)

    # ================= Quran (order + fill) =================
    a = act('quran_qadr'); byn = {x['n']: x for x in a['ayat']}
    pg.goto(BASE + '#/play/quran_qadr'); pg.wait_for_selector('.mushaf', timeout=15000)
    pg.locator('[data-act="go"]').click(); pg.wait_for_selector('.q-card .phase-head', timeout=10000)
    check(pg.locator('.order-slots').count() == 1, 'quran: first phase is order')
    h0 = hearts(pg)
    grp = next(g for g in a['phases'][0]['groups'] if pg.locator('.chip-bank .chip', has_text=byn[g[0]]['t'][:20]).count())
    for n in reversed(grp): pg.locator('.chip-bank .chip', has_text=byn[n]['t'][:25]).first.click(); pg.wait_for_timeout(60)
    pg.locator('.q-card .btn-primary:not([disabled])').click()
    expect_retry(pg, 'quran/order')
    check(hearts(pg) == h0 - 1, 'quran/order: one heart lost')
    pg.click('.feedback[data-retry] [data-act="retry"]'); pg.wait_for_timeout(400)
    check(pg.locator('.order-slots').count() == 1 and pg.locator('.order-slots .chip').count() == 0 and pg.locator('.q-card .wrong').count() == 0, 'quran/order: "جرّب تاني" re-asks the same question empty')
    for n in grp: pg.locator('.chip-bank .chip', has_text=byn[n]['t'][:25]).first.click(); pg.wait_for_timeout(60)
    pg.locator('.q-card .btn-primary:not([disabled])').click()
    pg.wait_for_selector('.feedback.good', timeout=8000)
    check(pg.locator('.feedback.good.recovered').count() == 1, 'quran/order: recovered cheer on second try')
    check(hearts(pg) == h0 - 1, 'quran/order: no extra heart on retry')
    pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(400)
    for _ in range(12):
        pg.wait_for_selector('.q-card .phase-head', timeout=10000)
        if pg.locator('.blank').count(): break
        if pg.locator('.order-slots').count():
            g2 = next(g for g in a['phases'][0]['groups'] if pg.locator('.chip-bank .chip', has_text=byn[g[0]]['t'][:20]).count())
            for n in g2: pg.locator('.chip-bank .chip', has_text=byn[n]['t'][:25]).first.click(); pg.wait_for_timeout(50)
            pg.locator('.q-card .btn-primary:not([disabled])').click()
            pg.wait_for_selector('.feedback [data-act="next"]', timeout=8000); pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(350)
    check(pg.locator('.blank').count() == 1, 'quran: reached a fill question')
    qt = pg.locator('.q-text').inner_text().replace('…', '___')
    item = next(i for i in a['phases'][1]['items'] if byn[i['ayah']]['t'].replace(i['blank'], '___') == qt)
    h1 = hearts(pg)
    wrong = [c for c in pg.locator('.choices .choice').all() if c.inner_text().strip() != item['blank']]
    wrong[0].click(); expect_retry(pg, 'quran/fill')
    check(item['blank'] not in pg.locator('.blank').inner_text(), 'quran/fill: blank not filled with the answer on first miss')
    pg.click('.feedback[data-retry] [data-act="retry"]'); pg.wait_for_timeout(400)
    check(pg.locator('.choice.wrong').count() == 0, 'quran/fill: re-asked empty')
    wrong = [c for c in pg.locator('.choices .choice').all() if c.inner_text().strip() != item['blank']]
    wrong[0].click(); pg.wait_for_selector('.feedback.bad', timeout=8000)
    check(pg.locator('.choice.correct').count() == 1 and pg.locator('.feedback[data-retry]').count() == 0, 'quran/fill: second miss reveals the answer (normal bad feedback)')
    check(hearts(pg) == h1 - 1, 'quran/fill: exactly one heart for the whole question')

    # ================= Plant story (true/false) =================
    pa = act('plant_story')
    pg.goto(BASE + '#/play/plant_story'); pg.wait_for_selector('.story-cover', timeout=15000)
    pg.locator('[data-act="listen"]').click(); pg.wait_for_selector('.player', timeout=10000); pg.wait_for_timeout(500)
    pg.locator('[data-act="go"]').click(); pg.wait_for_selector('.q-card .phase-head', timeout=10000)
    check(pg.locator('.choices .choice[data-v]').count() == 2, 'plant: first question is true/false')
    qtxt = pg.locator('.q-text').inner_text(); it = next(x for x in pa['phases'][0]['items'] if x['q'] == qtxt)
    hp = hearts(pg)
    pg.locator(f'.choice[data-v="{"false" if it["a"] else "true"}"]').click()
    expect_retry(pg, 'plant/tf')
    check(hearts(pg) == hp - 1, 'plant/tf: one heart lost')
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text', timeout=8000)
    check(pg.locator('.feedback[data-retry]').count() == 0, 'plant/tf: retry bar hides when explain opens')
    pg.click('.explain-sheet [data-act="try"]'); pg.wait_for_timeout(400)
    check(pg.locator('.choice.wrong').count() == 0 and pg.locator('.q-text').inner_text() == qtxt, 'plant/tf: "هجرّب أحلّ" re-asks the same question empty')
    pg.locator(f'.choice[data-v="{"true" if it["a"] else "false"}"]').click()
    pg.wait_for_selector('.feedback.good', timeout=8000)
    check(pg.locator('.feedback.good.recovered').count() == 1, 'plant/tf: recovered cheer')
    check(hearts(pg) == hp - 1, 'plant/tf: no extra heart on retry')
    b.close()
print('pageerrors:', errs)
if fails or errs: print('FAIL', fails); sys.exit(1)
print('PASS phase12_loop_all')
