import re
from playwright.sync_api import sync_playwright
BASE='http://localhost:8090/app/index.html'; errors=[]
AR2EN=str.maketrans('٠١٢٣٤٥٦٧٨٩','0123456789'); NUMPAD=['1','2','3','4','5','6','7','8','9','del','0','ok']
def solve(pg):
    q=pg.evaluate('window.__play.q'); t=q['type']
    if t=='truefalse': pg.locator('.choices .choice').nth(0 if q['answer'] else 1).click()
    elif t=='pick':
        for i in q['correct']: pg.locator('.pick-grid .choice').nth(i).click()
        pg.locator('.q-card .btn-primary').click()
    elif pg.locator('.numpad').count():
        for ch in str(q['answer']).translate(AR2EN): pg.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
        pg.locator('.numpad .btn').nth(11).click()
    else:
        want=str(q['choices'][q['answer']]).translate(AR2EN)
        for c in pg.locator('.choices .choice').all():
            if c.inner_text().strip().translate(AR2EN)==want: c.click(); break
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg=b.new_page(viewport={'width':412,'height':915})
    pg.on('console', lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE+'#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    # parent: set PIN, open settings
    pg.goto(BASE+'#/parent'); pg.wait_for_selector('.pin input')
    for i,ch in enumerate('1234'): pg.locator('.pin input').nth(i).fill(ch)
    pg.wait_for_selector('[data-celebration-settings]')
    pg.select_option('[data-k="sound"]','school_bell'); pg.wait_for_timeout(200)
    pg.locator('[data-k="durationSec"]').evaluate("e=>{e.value=10;e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'))}")
    pg.wait_for_timeout(300)
    st=pg.evaluate("JSON.parse(localStorage.getItem('abtal:v1:profile:selim')).settings.celebration"); print('saved', st['sound'], st['durationSec'])
    assert st['sound']=='school_bell' and st['durationSec']==10
    assert pg.locator('[data-explain-settings]').count()==1
    # play mult_3 to 100%
    pg.goto(BASE+'#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]')
    for _ in range(30):
        if pg.locator('[data-act="again"]').count(): break
        pg.wait_for_selector('.q-card'); solve(pg); pg.wait_for_selector('.feedback [data-act="next"]'); pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(120)
    pg.wait_for_timeout(500)
    lc=pg.evaluate('window.__lastComplete'); cel=pg.evaluate('window.__celebration'); pa=pg.evaluate('window.__parentAlert')
    print('complete', lc['r']['score'], 'fired', lc['fired'], 'cel', cel, 'alert', pa)
    assert lc['fired'] and cel and cel['sound']=='school_bell' and cel['durationSec']==10 and pa['mode']=='sound'
    ev=pg.evaluate("JSON.parse(localStorage.getItem('abtal:v1:profile:selim')).events.filter(e=>e.type==='stage_completed').length"); print('stage_completed events', ev); assert ev>=1
    # leaving the screen stops it
    pg.goto(BASE+'#/home'); pg.wait_for_timeout(400); assert pg.evaluate('window.__celebration') is None, 'siren did not stop on route change'
    b.close()
print('errors', errors); assert not errors; print('CEL SMOKE OK')
