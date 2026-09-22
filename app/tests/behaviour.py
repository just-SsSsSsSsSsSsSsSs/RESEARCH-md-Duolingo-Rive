#!/usr/bin/env python3
"""Behaviour tests: hearts depletion → modal → gem refill, certificate render, theme, parent PIN, export."""
from playwright.sync_api import sync_playwright
BASE='http://localhost:8080/app/index.html'
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844})
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE+'#/profile'); pg.wait_for_selector('.hero-card'); pg.locator('.hero-card').nth(2).click(); pg.wait_for_selector('.topbar')
    # burn hearts: answer 'خطأ' on all plant_tf questions (mix) until results
    pg.goto(BASE+'#/play/plant_tf'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]')
    for i in range(12):
        if pg.locator('[data-act="again"]').count(): break
        pg.wait_for_selector('.choice'); pg.locator('.choice').nth(1).click()
        pg.wait_for_selector('.feedback [data-act="next"]'); pg.click('.feedback [data-act="next"]'); pg.wait_for_timeout(120)
    hearts = pg.evaluate("JSON.parse(localStorage.getItem('abtal:v1:profile:kenda')).hearts")
    print('hearts after session:', hearts)
    # give gems via store API path: use parent-like direct edit then navigate (no reload → in-memory store)
    pg.evaluate("(async()=>{const m=await import('./js/core/store.js');m.default.profile.gems=50;m.default.profile.hearts=0;m.default.profile.heartsLostAt=Date.now();m.default.save(true);})()")
    pg.wait_for_timeout(300)
    pg.goto(BASE+'#/play/plant_match'); pg.wait_for_selector('.modal', timeout=8000)
    print('no-hearts modal:', 'خلصت القلوب' in pg.locator('.modal').inner_text())
    pg.locator('.modal .btn-primary').click(); pg.wait_for_selector('[data-act="start"]'); pg.wait_for_timeout(400)
    st=pg.evaluate("JSON.parse(localStorage.getItem('abtal:v1:profile:kenda'))"); assert st['hearts']==5 and st['gems']==30, st; print('after refill hearts:',st['hearts'],'gems:',st['gems'])
    pg.click('[data-act="start"]'); pg.wait_for_selector('.match-cols, .order-slots'); print('match/order rendered ok')
    pg.goto(BASE+'#/certificate/nope'); pg.wait_for_timeout(600); print('bad cert handled:', 'حصلت مشكلة' in pg.locator('#app').inner_text())
    pg.evaluate("(async()=>{const m=await import('./js/core/store.js');const s=m.default.profile;s.certificates.push({id:'test1',activityId:'mult_3',title:'جدول الضرب ٣',subject:'math',date:Date.now(),xp:s.xp,name:s.name});m.default.save(true);})()")
    pg.wait_for_timeout(200); pg.goto(BASE+'#/certificate/test1'); pg.wait_for_selector('#cert'); pg.wait_for_timeout(700); pg.screenshot(path='/tmp/s_cert.png'); print('certificate rendered')
    pg.goto(BASE+'#/profile'); pg.wait_for_selector('[data-act="theme"]'); pg.click('[data-act="theme"]'); pg.wait_for_timeout(200); print('theme toggled to:', pg.evaluate("document.documentElement.dataset.theme"))
    pg.goto(BASE+'#/parent'); pg.wait_for_selector('.pin input')
    for i,d in enumerate('9876'): pg.locator('.pin input').nth(i).fill(d)
    pg.wait_for_selector('.chart'); pg.screenshot(path='/tmp/s_parent.png', full_page=True); print('parent dashboard ok')
    # export works
    with pg.expect_download() as dl: pg.click('[data-act="export"]')
    print('export file:', dl.value.suggested_filename)
    b.close()
print('errors:', errs or 'none')
