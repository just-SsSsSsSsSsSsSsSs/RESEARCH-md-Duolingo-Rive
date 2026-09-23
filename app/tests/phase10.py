from playwright.sync_api import sync_playwright
BASE='http://localhost:8090/app/index.html'; errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':412,'height':915})
    pg.on('console', lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE+'#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    pg.goto(BASE+'#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    assert pg.locator('.explain-btn').count()==1, 'no explain button'
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text')
    s1=pg.evaluate('window.__explain.strategy()'); t1=pg.locator('.explain-sheet .k-text').inner_text()
    pg.wait_for_timeout(900); print('karaoke now/said:', pg.locator('.kw.now').count(), pg.locator('.kw.said').count())
    pg.click('[data-act="another"]'); pg.wait_for_timeout(200); s2=pg.evaluate('window.__explain.strategy()'); t2=pg.locator('.explain-sheet .k-text').inner_text()
    assert s1!=s2 and t1!=t2, 'another strategy not different'
    # go to steps and solve all
    for _ in range(4):
        if pg.evaluate('window.__explain.strategy()')=='steps': break
        pg.click('[data-act="another"]'); pg.wait_for_timeout(150)
    assert pg.evaluate('window.__explain.strategy()')=='steps'
    q=pg.evaluate('window.__play.q'); print('q', q['q'], q.get('answer', q.get('correct')))
    for _ in range(6):
        if pg.locator('.step-final').count(): break
        # find correct choice via plan? we click each until correct
        chs=pg.locator('.step-choices .choice'); n=chs.count()
        for i in range(n):
            c=chs.nth(i)
            if c.is_disabled(): continue
            c.click(); pg.wait_for_timeout(100)
            if 'correct' in (c.get_attribute('class') or ''): break
        pg.wait_for_timeout(800)
    assert pg.locator('.step-final').count()==1, 'final step not reached'
    print('final:', pg.locator('.step-final').inner_text())
    ev=pg.evaluate("JSON.parse(localStorage.getItem('abtal:v1:profile:selim')).events.filter(e=>e.type==='explanation_requested').length"); print('explanation_requested events', ev)
    pg.click('[data-act="try"]'); assert pg.locator('.explain-sheet').count()==0
    b.close()
print('errors', errors); assert not errors; print('SMOKE OK')
