"""Phase 10 - insights / targeted practice / adaptive E2E (headless Chromium).
Seeds telemetry for a weak skill (جدول ٣, adjacent-table errors, fast wrong answers), then checks:
 parent report (weakest, pattern, behaviour, recommendations, parent script modal), home targeted-practice card,
 playing targeted_practice to results (practice: no hearts), adaptive delayMs > 0 for the impulsive profile, zero console errors.
Usage: python3 app/tests/phase10_insights.py [base_url]"""
import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090/app/index.html'; errors = []
AR2EN = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789'); NUMPAD = ['1','2','3','4','5','6','7','8','9','del','0','ok']
# seed through the live store (an in-memory profile flushed on unload would otherwise overwrite a raw localStorage write)
SEED = """(async () => { const { default: store } = await import('./js/core/store.js'); const p = store.profile; p.events = p.events || []; let t = Date.now()-3600e3;
 for (let i=0;i<14;i++){ const b=(i%9)+1, wrong=i%2===0; p.events.push({t:t+=1500,type:'question_attempted',act:'mult_3',subject:'math',key:'3x'+b,skill:'جدول ٣',qtype:'quiz',correct:!wrong,time_ms:wrong?800:3500,first_ms:500,attempts:1,wrong_value:wrong?String(3*(b+1)):undefined,expected:String(3*b),pos:i,total:14,session_ms:i*20000,hour:10}); }
 for (let i=0;i<8;i++) p.events.push({t:t+=1500,type:'question_attempted',act:'mult_4',subject:'math',key:'4x'+(i+1),skill:'جدول ٤',qtype:'numpad',correct:true,time_ms:3000,first_ms:900,attempts:1,expected:String(4*(i+1)),pos:i,total:8,session_ms:i*20000,hour:10});
 p.events.push({t:t+=1,type:'explanation_result',strategy:'story',solved:true},{t:t+=1,type:'explanation_result',strategy:'story',solved:true},{t:t+=1,type:'explanation_result',strategy:'readaloud',solved:false},{t:t+=1,type:'explanation_result',strategy:'readaloud',solved:false});
 p.events.push({t:t+=1,type:'stage_completed',act:'mult_4',score:100,duration_ms:240000,total:8,correct:8});
 store.save(true); return p.events.length; })()"""
def solve(pg):
    q = pg.evaluate('window.__play.q'); t = q['type']
    if t == 'truefalse': pg.locator('.choices .choice').nth(0 if q['answer'] else 1).click()
    elif t == 'pick':
        for i in q['correct']: pg.locator('.pick-grid .choice').nth(i).click()
        pg.locator('.q-card .btn-primary').click()
    elif pg.locator('.numpad').count():
        for ch in str(q['answer']).translate(AR2EN): pg.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
        pg.locator('.numpad .btn').nth(11).click()
    else:
        want = str(q['choices'][q['answer']]).translate(AR2EN)
        for c in pg.locator('.choices .choice').all():
            if c.inner_text().strip().translate(AR2EN) == want: c.click(); break
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 412, 'height': 915})
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    n = pg.evaluate(SEED); print('seeded events', n)
    pg.reload(); pg.wait_for_selector('.topbar')
    # parent report
    pg.goto(BASE + '#/parent'); pg.wait_for_selector('.pin input')
    for i, ch in enumerate('1234'): pg.locator('.pin input').nth(i).fill(ch)
    pg.wait_for_selector('[data-weakest]')
    weak = pg.locator('[data-weakest] .weak-row').all_inner_texts(); print('weakest rows', len(weak)); assert any('جدول ٣' in w for w in weak)
    assert 'خطأ بخانة واحدة' in pg.locator('[data-weakest]').inner_text(), 'adjacent pattern not detected'
    recs = pg.locator('[data-recs] .rec').count(); print('recs', recs); assert recs >= 3
    assert 'حدوتة' in pg.locator('[data-recs]').inner_text(), 'best strategy (story) not reported'
    assert pg.locator('[data-stumbled] [data-act="script"]').count() >= 1
    pg.locator('[data-stumbled] [data-act="script"]').first.click(); pg.wait_for_selector('.parent-script')
    assert 'خطوة خطوة' in pg.locator('.parent-script').inner_text(); pg.click('.modal .btn-primary'); pg.wait_for_timeout(200)
    print('✔ parent report + parent script')
    # home targeted practice card
    pg.goto(BASE + '#/home'); pg.wait_for_selector('.topbar'); pg.wait_for_timeout(300)
    assert pg.locator('a[href="#/play/targeted_practice"]').count() == 1, 'targeted practice card missing'
    pg.click('a[href="#/play/targeted_practice"]'); pg.wait_for_selector('[data-act="start"]')
    ad = pg.evaluate('window.__adaptive'); print('adaptive', ad); assert ad['delayMs'] > 0 and 'جدول ٣' in ad['weakest']
    pg.click('[data-act="start"]')
    for _ in range(20):
        if pg.locator('[data-act="again"]').count(): break
        pg.wait_for_selector('.q-card'); pg.wait_for_timeout(ad['delayMs'] + 50); solve(pg)
        pg.wait_for_selector('.feedback [data-act="next"]', timeout=8000); pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(120)
    assert pg.locator('[data-act="again"]').count(), 'targeted practice results not reached'
    keys = pg.evaluate('window.__play.keys'); assert all(k.startswith('3x') or k.startswith('g3x') for k in keys), keys
    print('✔ targeted practice played', len(keys), 'q on table 3 only')
    b.close()
print('errors', errors); assert not errors; print('PHASE10 INSIGHTS: PASS')
