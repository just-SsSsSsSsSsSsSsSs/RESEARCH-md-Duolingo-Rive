#!/usr/bin/env python3
"""
Phase 9 — Quran interactive reader E2E (Al-Bayyinah mobile + Al-Qadr desktop):
 per-ayah exact highlight (tap ayah N -> .ayah[data-n=N].now + its mp3 requested), sequential auto-advance,
 reciter switch Husary<->Minshawi (persisted), tafsir toggle, repeat, classic<->modern compare (iframe of untouched file),
 3 phases answered correctly -> rewards + badge, zero console errors, no SVG/emoji leak, protected files sha256 intact.
Usage: python3 app/tests/quran_reader.py [base_url]
"""
import sys, json, hashlib, os, re
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090/app/index.html'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROTECTED = {'plant.html': 'fb197ed22c2fca54', 'albayyinah.html': 'aac6bafbec577baa', 'math.html': '694859aac12c7222', 'quran-alqadr/index.html': '52758e3f208999c8'}
EMOJI = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF\U0001F900-\U0001F9FF]')
for f, h in PROTECTED.items():
    d = hashlib.sha256(open(os.path.join(ROOT, f), 'rb').read()).hexdigest()
    assert d.startswith(h), f'{f} modified! {d}'
print('✔ protected files sha256 intact (plant, albayyinah, math, quran-alqadr)')


def run(p, aid, viewport, label):
    act = json.load(open(os.path.join(ROOT, 'app/content/activities', aid + '.json'), encoding='utf-8'))
    errors, failed, mp3 = [], [], []
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = b.new_page(viewport=viewport, device_scale_factor=2)
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append(r.url))
    page.on('response', lambda r: (failed.append(f'{r.status} {r.url}') if r.status >= 400 else None, mp3.append(r.url) if '.mp3' in r.url else None))

    def leak():
        txt = page.evaluate("document.querySelector('#app').innerText")
        assert '<svg' not in txt and 'xmlns' not in txt, 'raw SVG leak'
        assert not EMOJI.search(txt), f'emoji leak {EMOJI.search(txt).group()}'

    page.goto(f'{BASE}#/profile'); page.wait_for_selector('.heroes .hero-card', timeout=15000)
    page.locator('.hero-card').first.click(); page.wait_for_selector('.topbar')
    page.goto(f'{BASE}#/subject/quran'); page.wait_for_selector('.view')
    assert page.locator(f'a[href="#/play/{aid}"]').count() == 1, 'catalog tile'
    page.goto(f'{BASE}#/play/{aid}'); page.wait_for_selector('.mushaf', timeout=15000)
    n_ayat = len(act['ayat'])
    assert page.locator('.ayah').count() == n_ayat
    assert page.locator('.seg.lang button').count() == 2
    leak(); print(f'  [{label}/{aid}] ✔ mushaf renders {n_ayat} ayat + 2 reciters')

    # tap ayah 3 -> exact highlight + its file (husary default) + tafsir text
    page.locator('.ayah[data-n="3"]').click(); page.wait_for_timeout(900)
    assert 'now' in page.locator('.ayah[data-n="3"]').get_attribute('class')
    assert 'done' in page.locator('.ayah[data-n="1"]').get_attribute('class')
    f3 = act['ayat'][2]['file']
    assert any('/husary/' in u and f3 in u for u in mp3), mp3
    assert act['ayat'][2]['baladi'][:12] in page.locator('.tafsir .v').inner_text()
    st = page.evaluate("({clip: window.__storyAudio.clip, lang: window.__storyAudio.lang})")
    assert st == {'clip': 'a3', 'lang': 'husary'}, st
    print(f'  [{label}/{aid}] ✔ tap ayah 3 -> exact highlight + husary clip + baladi tafsir')

    # sequential auto-advance (simulate end)
    page.evaluate("window.__storyAudio.el.dispatchEvent(new Event('ended'))"); page.wait_for_timeout(500)
    assert 'now' in page.locator('.ayah[data-n="4"]').get_attribute('class'), 'did not auto-advance'
    print(f'  [{label}/{aid}] ✔ sequential auto-advance 3 -> 4')

    # reciter switch (persisted) + tafsir toggle + repeat
    page.locator('.seg.lang button[data-lang="minshawi"]').click(); page.wait_for_timeout(900)
    assert any('/minshawi/' in u for u in mp3), 'minshawi never requested'
    assert page.evaluate("JSON.parse(localStorage.getItem('abtal:v1:meta')).reciter") == 'minshawi'
    page.locator('[data-act="tafsir"]').click(); assert page.locator('.tafsir').evaluate('e=>e.classList.contains("hidden")')
    page.locator('[data-act="tafsir"]').click(); assert not page.locator('.tafsir').evaluate('e=>e.classList.contains("hidden")')
    page.locator('[data-act="repeat"]').click(); page.wait_for_timeout(200)
    cur = page.evaluate("window.__storyAudio.clip")
    page.evaluate("window.__storyAudio.el.dispatchEvent(new Event('ended'))"); page.wait_for_timeout(400)
    assert page.evaluate("window.__storyAudio.clip") == cur, 'repeat did not hold ayah'
    page.locator('[data-act="repeat"]').click(); page.locator('.seg.lang button[data-lang="husary"]').click()
    print(f'  [{label}/{aid}] ✔ reciter switch (persisted), tafsir toggle, repeat mode')

    # classic compare
    page.locator('[data-act="compare"]').click(); page.wait_for_selector('iframe.classic-frame')
    assert page.locator('iframe.classic-frame').get_attribute('src').endswith(act['classic'])
    page.locator('[data-act="modern"]').click(); page.wait_for_selector('.mushaf')
    print(f'  [{label}/{aid}] ✔ classic <-> modern ({act["classic"]})')

    # phases: order / fill / meaning — all correct
    PKEY = page.evaluate("'abtal:v1:profile:' + JSON.parse(localStorage.getItem('abtal:v1:meta')).activeId")
    xp0 = page.evaluate(f"JSON.parse(localStorage.getItem('{PKEY}')).xp")
    page.locator('[data-act="go"]').click(); page.wait_for_selector('.phase-head')
    byn = {a['n']: a for a in act['ayat']}
    total = len(act['phases'][0]['groups']) + len(act['phases'][1]['items']) + len(act['phases'][2]['items'])
    seen = set()
    for _ in range(total):
        page.wait_for_selector('.q-card .phase-head', timeout=10000)
        seen.add(page.locator('.phase-head h2').inner_text())
        if page.locator('.order-slots').count():
            grp = next(g for g in act['phases'][0]['groups'] if page.locator('.chip-bank .chip', has_text=byn[g[0]]['t'][:20]).count())
            for n in grp:
                page.locator('.chip-bank .chip', has_text=byn[n]['t'][:25]).first.click(); page.wait_for_timeout(60)
            page.locator('.q-card .btn-primary:not([disabled])').click()
        elif page.locator('.blank').count():
            qt = page.locator('.q-text').inner_text().replace('…', '___')
            item = next(i for i in act['phases'][1]['items'] if byn[i['ayah']]['t'].replace(i['blank'], '___') == qt)
            page.locator('.choices .choice', has_text=item['blank']).first.click()
        else:
            qt = page.locator('.q-text').inner_text()
            item = next(i for i in act['phases'][2]['items'] if i['q'] == qt)
            page.locator('.choices .choice', has_text=item['opts'][item['correct']]).first.click()
        page.wait_for_selector('.feedback.good', timeout=8000); leak()
        page.locator('.feedback [data-act="next"]').click(); page.wait_for_timeout(350)
    assert len(seen) == 3, seen
    page.wait_for_selector('.result-big', timeout=8000); page.wait_for_timeout(600)
    prof = json.loads(page.evaluate(f"localStorage.getItem('{PKEY}')"))
    assert prof['xp'] > xp0 and prof['activities'][aid]['best'] == 100, (prof['xp'], xp0)
    assert 'quran_reader_1' in prof['badges'], list(prof['badges'])
    leak(); page.screenshot(path=f'/tmp/quran_{aid}_{label}.png')
    print(f'  [{label}/{aid}] ✔ 3 phases / {total} q all correct -> xp {xp0}->{prof["xp"]}, best 100%, badge')
    b.close()
    assert not errors, errors
    assert not failed, failed
    print(f'  [{label}/{aid}] ✔ zero console errors / failed requests')


with sync_playwright() as p:
    run(p, 'quran_bayyinah', {'width': 390, 'height': 844}, 'mobile')
    run(p, 'quran_qadr', {'width': 1280, 'height': 800}, 'desktop')
print('✅ QURAN_READER PASS')
