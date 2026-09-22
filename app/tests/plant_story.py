#!/usr/bin/env python3
"""
Phase 7 — plant_story E2E: dual audio (fusha + baladi) actually loads & plays, text toggle, speed,
classic↔modern compare, all 4 phases answered correctly → XP/gems/badge awarded, zero console errors,
zero emoji, no raw SVG text leak, plant.html sha256 untouched.
Runs on mobile (390x844) and desktop (1280x800).
Usage: python3 app/tests/plant_story.py [base_url]
"""
import sys, json, hashlib, os, re
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090/app/index.html'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PLANT_SHA = 'fb197ed22c2fca54e931e6e8e48646c37723c8b553ba27f5157c9f0a1792722c'
EMOJI = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF\U0001F900-\U0001F9FF]')

# 0) protected file
sha = hashlib.sha256(open(os.path.join(ROOT, 'plant.html'), 'rb').read()).hexdigest()
assert sha == PLANT_SHA, f'plant.html modified! {sha}'
print('✔ plant.html sha256 untouched')

# 1) 22 clips present + activity JSON valid
act = json.load(open(os.path.join(ROOT, 'app/content/activities/plant_story.json'), encoding='utf-8'))
n = 0
for clip, langs in act['clips'].items():
    for lang, fn in langs.items():
        p = os.path.join(ROOT, 'app', act['audioBase'], act['tracks'][lang]['dir'], fn)
        assert os.path.getsize(p) > 10000, p; n += 1
assert n == 22, n
print(f'✔ {n} mp3 clips present (12 fusha + 10 baladi)')
T = act['story']['timings']; NS = len(act['story']['sentences'])
for lang in ('fusha', 'baladi'):
    tt = T[lang]; assert len(tt) == NS, lang
    assert all(tt[i][0] <= tt[i][1] and (i == 0 or tt[i][0] >= tt[i-1][0]) for i in range(NS)), f'{lang} timings not monotonic'
print(f'✔ sentence timings monotonic for fusha+baladi ({NS} each)')


def run(p, viewport, label):
    errors, failed, audio_reqs = [], [], []
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = b.new_page(viewport=viewport, device_scale_factor=2)
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append(r.url))
    page.on('response', lambda r: (failed.append(f'{r.status} {r.url}') if r.status >= 400 else None, audio_reqs.append(r.url) if '.mp3' in r.url else None))

    def leak_check():
        txt = page.evaluate("document.querySelector('#app').innerText")
        assert '<svg' not in txt and 'xmlns' not in txt, 'raw SVG leaked into text'
        assert not EMOJI.search(txt), f'emoji leaked: {EMOJI.search(txt).group()}'

    page.goto(f'{BASE}#/profile'); page.wait_for_selector('.heroes .hero-card', timeout=15000)
    page.locator('.hero-card').first.click(); page.wait_for_selector('.topbar')
    page.evaluate("localStorage.setItem('abtal:v1:meta', JSON.stringify({...JSON.parse(localStorage.getItem('abtal:v1:meta')||'{}'), celebration: 2}))")

    # catalog lists the story in arabic subject
    page.goto(f'{BASE}#/subject/arabic'); page.wait_for_selector('.view')
    assert page.locator('a[href="#/play/plant_story"]').count() == 1, 'catalog tile missing'
    print(f'  [{label}] ✔ catalog tile')

    # cover
    page.goto(f'{BASE}#/play/plant_story'); page.wait_for_selector('.story-cover', timeout=15000)
    assert page.locator('.story-bar .seg.lang button').count() == 2
    assert page.locator('.story-steps .st').count() == 5
    leak_check()
    print(f'  [{label}] ✔ cover + story bar')

    # classic compare toggle → iframe of untouched plant.html
    page.locator('[data-act="compare"]').click(); page.wait_for_selector('iframe.classic-frame')
    src = page.locator('iframe.classic-frame').get_attribute('src'); assert src.endswith('plant.html'), src
    page.locator('[data-act="modern"]').click(); page.wait_for_selector('.story-cover')
    print(f'  [{label}] ✔ classic ↔ modern compare')

    # listen: fusha welcome→story chain
    page.locator('[data-act="listen"]').click(); page.wait_for_selector('.player', timeout=10000)
    page.wait_for_timeout(1500)
    st = page.evaluate("(() => { const a = document.querySelector('audio'); return a ? { src: a.src, rs: a.readyState, dur: a.duration, paused: a.paused } : null })()")
    # audio element is not in DOM (created via new Audio()); inspect via requests instead
    fusha = [u for u in audio_reqs if '/fusha/' in u]
    assert fusha, f'no fusha audio requested: {audio_reqs}'
    assert page.locator('.sent').count() == len(act['story']['sentences'])
    print(f'  [{label}] ✔ fusha audio loaded ({len(fusha)} req)')

    # switch to baladi → baladi clip requested, player recolors
    page.locator('.seg.lang button[data-lang="baladi"]').click(); page.wait_for_timeout(1200)
    baladi = [u for u in audio_reqs if '/baladi/' in u]
    assert baladi, f'no baladi audio requested: {audio_reqs}'
    assert 'baladi' in page.locator('.player').get_attribute('class')
    assert page.evaluate("JSON.parse(localStorage.getItem('abtal:v1:meta')).storyLang") == 'baladi'
    print(f'  [{label}] ✔ baladi track switch ({len(baladi)} req) + persisted')

    # play button toggles state class; sentence tap highlights
    page.locator('.pbtn.main').click(); page.wait_for_timeout(600)
    page.locator('.sent').nth(3).click(); page.wait_for_timeout(300)
    assert 'now' in page.locator('.sent').nth(3).get_attribute('class')
    # H1: sentence tap seeks to the exact ASR-aligned start of that sentence (baladi track active here)
    page.wait_for_timeout(900)
    st = page.evaluate("({ t: window.__storyAudio.el.currentTime, clip: window.__storyAudio.clip, lang: window.__storyAudio.lang })")
    exp = act['story']['timings']['baladi'][3][0]
    assert st['clip'] == 'story' and st['lang'] == 'baladi', st
    assert exp - 0.3 <= st['t'] <= exp + 2.5, (st, exp)
    # text hide/show
    page.locator('[data-act="text"]').click(); assert page.locator('.reader').evaluate('e => e.classList.contains("hidden")')
    page.locator('[data-act="text"]').click(); assert not page.locator('.reader').evaluate('e => e.classList.contains("hidden")')
    # speed
    page.locator('[data-rate="0.8"]').click(); assert page.evaluate("JSON.parse(localStorage.getItem('abtal:v1:meta')).storyRate") == 0.8
    page.locator('[data-rate="1"]').click()
    page.locator('.seg.lang button[data-lang="fusha"]').click()
    leak_check()
    print(f'  [{label}] ✔ player controls: play/sentence/text/speed')

    # phases — answer everything correctly
    PKEY = page.evaluate("'abtal:v1:profile:' + JSON.parse(localStorage.getItem('abtal:v1:meta')).activeId")
    xp0 = page.evaluate(f"JSON.parse(localStorage.getItem('{PKEY}')).xp")
    gems0 = page.evaluate(f"JSON.parse(localStorage.getItem('{PKEY}')).gems")
    page.locator('[data-act="go"]').click(); page.wait_for_selector('.phase-head')
    phases_seen = set()
    total = len(act['phases'][0]['items']) + len(act['phases'][1]['items']) + 2
    for i in range(total):
        page.wait_for_selector('.q-card .phase-head', timeout=10000)
        phases_seen.add(page.locator('.phase-head h2').inner_text())
        head = page.locator('.play-head .small').inner_text()
        if page.locator('.choices .choice[data-v]').count():      # TF
            qtxt = page.locator('.q-text').inner_text()
            item = next(x for x in act['phases'][0]['items'] if x['q'] == qtxt)
            page.locator(f'.choice[data-v="{"true" if item["a"] else "false"}"]').click()
        elif page.locator('.mindmap').count():                       # mind map
            for bi, bub in enumerate(act['phases'][3]['bubbles']):
                page.locator(f'.bubble-q[data-i="{bi}"]').click(); page.wait_for_timeout(80)
                page.locator('.map-opts .choice', has_text=bub['opts'][bub['correct']]).first.click(); page.wait_for_timeout(80)
            page.locator('.q-card .btn-primary:not([disabled])').click()
        elif page.locator('.order-slots').count():                   # order
            for ev in act['phases'][2]['events']:
                page.locator('.chip-bank .chip', has_text=ev['t']).first.click(); page.wait_for_timeout(60)
            page.locator('.q-card .btn-primary:not([disabled])').click()
        else:                                                         # quiz / fillblank
            qtxt = page.locator('.q-text').inner_text()
            item = next((x for x in act['phases'][1]['items'] if x.get('q') == qtxt), None)
            if item is None: item = next(x for x in act['phases'][1]['items'] if x.get('kind') == 'complete')
            page.locator('.choices .choice', has_text=item['opts'][item['correct']]).first.click()
        page.wait_for_selector('.feedback.good', timeout=8000)
        leak_check()
        page.locator('.feedback [data-act="next"]').click(); page.wait_for_timeout(250)
    assert len(phases_seen) == 4, phases_seen
    print(f'  [{label}] ✔ 4 phases / {total} questions all correct')

    # personal expression
    page.wait_for_selector('.personal textarea', timeout=8000)
    page.locator('[data-act="model"]').click(); assert page.locator('.model-answer').count() == 1
    page.locator('textarea').fill('حاولت أتعلم الدراجة وسقطت كثيرًا ثم نجحت')
    page.locator('[data-act="save"]').click()
    page.wait_for_selector('.result-big', timeout=8000)
    page.wait_for_timeout(600)  # store.save() is debounced (150ms)
    prof = json.loads(page.evaluate(f"localStorage.getItem('{PKEY}')"))
    assert prof['xp'] > xp0 and prof['gems'] > gems0, (prof['xp'], xp0, prof['gems'], gems0)
    assert prof['activities']['plant_story']['best'] == 100
    assert 'plant_story_1' in prof['badges'] and 'plant_story_master' in prof['badges'], prof['badges'].keys()
    assert prof['journal'] and prof['journal'][-1]['id'] == 'plant_story'
    assert page.locator('#fx-canvas').count() == 1
    leak_check()
    print(f'  [{label}] ✔ results: xp {xp0}→{prof["xp"]}, gems {gems0}→{prof["gems"]}, best 100%, 2 badges, journal saved')

    page.goto(f'{BASE}#/profile'); page.wait_for_selector('.journal', timeout=8000)
    assert page.locator('.journal-entry').count() >= 1, 'journal entry not rendered'
    assert 'الدراجة' in page.locator('.journal-a').first.inner_text()
    leak_check()
    print(f'  [{label}] ✔ journal (دفتري) visible in profile')
    page.screenshot(path=f'/tmp/plant_story_{label}.png')
    b.close()
    assert not errors, errors
    assert not failed, failed
    print(f'  [{label}] ✔ zero console errors / failed requests')


with sync_playwright() as p:
    run(p, {'width': 390, 'height': 844}, 'mobile')
    run(p, {'width': 1280, 'height': 800}, 'desktop')
print('✅ PLANT_STORY PASS')
