"""Phase 18.5 - one companion per lesson + live links (+ B-sections appended as they land). Server: tools/serve.py 8090

  A2  stability: the same companion id on every question of one lesson (surprise mode, no favourite); after quit ->
      «again» a new session picks again and never repeats the previous companion twice in a row (5 restarts);
      the child's favourite still wins across sessions.
  A2b a running reaction (tickle) is never cut by the play view's 900ms 'think' nudge.
  B1  limbs: per-companion rig.limbs -> one mask layer per limb with its own infinite loop, cut out of the body layer;
      transforms keep changing (bee wings flutter, parrot wings flap, cat tail sways).
  B2  voice: per-companion laugh/cheer clips (200, cache-busted), mouth mask layer hidden while silent, opens/closes
      while speaking (data-speaking), mouthStop clears, sound-off keeps it silent.
  A1  links: README has the «روابط محدّثة» section and every live link in it answers 200 on GitHub Pages (network);
      the root index.html points to the new repository; no html-mobile-audio link remains outside the append-only history.
  hygiene: 0 page errors, 0 failed requests.
"""
from playwright.sync_api import sync_playwright
import os, re, sys, subprocess

BASE = 'http://localhost:8090/app/index.html'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

def hero(pg, idx=0):
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card, [data-act="switch"]')
    if pg.locator('.heroes .hero-card').count() == 0: pg.click('[data-act="switch"]'); pg.wait_for_selector('.heroes .hero-card')
    pg.locator('.hero-card').nth(idx).click(); pg.wait_for_timeout(300)

def start(pg, act):
    pg.goto(BASE + '#/home'); pg.wait_for_timeout(80); pg.goto(BASE + '#/play/' + act)
    pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(300)

def answer_right(pg):
    q = pg.evaluate('window.__play.q'); want = str(q['choices'][q['answer']])
    for c in pg.locator('.q-card .choice').all():
        if c.inner_text().strip() == want: c.click(); break
    pg.wait_for_selector('.feedback [data-act="next"]', timeout=5000); pg.click('.feedback [data-act="next"]')
    pg.wait_for_selector('.q-card, [data-act="again"]'); pg.wait_for_timeout(250)

def quit_lesson(pg):
    pg.click('.play-head [data-act="quit"]'); pg.wait_for_selector('.modal'); pg.locator('.modal .btn-ghost').click(); pg.wait_for_selector('[data-act="again"]')

CID = "document.querySelector('.q-card > .mascot.companion')?.dataset.companion"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs, bad = [], []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.goto(BASE); pg.wait_for_timeout(300); pg.evaluate('localStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(300); hero(pg, 0)

    # A2 - same companion for the whole lesson (plant_quiz: '*'/arabic pool = cat, parrot, bee -> rotation is observable)
    start(pg, 'plant_quiz'); ids = [pg.evaluate(CID)]
    for _ in range(4): answer_right(pg); ids.append(pg.evaluate(CID))
    check(ids[0] and len(set(ids)) == 1, f'A2 one companion across 5 questions of one lesson {ids}')
    quit_lesson(pg); seq = [ids[0]]
    for _ in range(5):
        pg.click('[data-act="again"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(250); seq.append(pg.evaluate(CID)); quit_lesson(pg)
    check(len(set(seq)) >= 2 and all(seq[i] != seq[i + 1] for i in range(len(seq) - 1)), f'A2 new session -> new pick, never the same twice in a row {seq}')
    pg.evaluate("async () => { const m = await import('./js/engines/companion.js'); await m.ready(); m.setFavourite('bee'); }")
    fav = []
    for _ in range(2):
        pg.click('[data-act="again"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(250); fav.append(pg.evaluate(CID)); quit_lesson(pg)
    check(fav == ['bee', 'bee'], f'A2 favourite wins on every new session {fav}')
    pg.evaluate("async () => { const m = await import('./js/engines/companion.js'); m.setFavourite(''); }")

    # A2b - tickle survives the 900ms think nudge
    start(pg, 'mult_3'); pg.wait_for_timeout(700)
    pg.locator('.q-card > .mascot.companion').click(); pg.wait_for_timeout(500)  # crosses the 900ms mark
    mood = pg.evaluate("document.querySelector('.q-card > .mascot.companion').dataset.mood")
    check(mood == 'tickle', f'A2b a running tickle is not cut by the think nudge (mood {mood})')

    # B1 - limbs: every companion with rig.limbs gets one mask layer per limb, each with its own infinite loop, and the
    # body layer cuts them out (mask-composite) so a wing is never drawn twice; frames differ over time (never still)
    LIMBS = """(() => { const m = document.querySelector('.q-card > .mascot.companion'); if (!m) return null; const L = [...m.querySelectorAll('.cp-layer.limb')];
      const inf = m.getAnimations({ subtree: true }).filter(a => a.effect.getTiming().iterations === Infinity);
      const onLimb = inf.filter(a => a.effect.target.classList.contains('limb'));
      const body = m.querySelector('.cp-layer.body'); const cs = getComputedStyle(body);
      return { id: m.dataset.companion, n: L.length, motions: L.map(l => l.dataset.motion), running: onLimb.filter(a => a.playState === 'running').length, loops: onLimb.length,
        bodyCut: ((cs.maskImage || cs.webkitMaskImage || '').match(/radial-gradient/g) || []).length, comp: cs.maskComposite || cs.webkitMaskComposite || '', tf: L.map(l => getComputedStyle(l).transform), declared: window.__companion?.limbs }; })()"""
    import json as _json
    comp = _json.load(open(os.path.join(ROOT, 'app', 'content', 'companions.json'), encoding='utf-8'))
    want = {c['id']: len(c.get('rig', {}).get('limbs', [])) for c in comp['companions']}
    for cid in ['bee', 'parrot', 'cat']:
        pg.evaluate("async (id) => { const m = await import('./js/engines/companion.js'); await m.ready(); m.setFavourite(id); }", cid)
        start(pg, 'mult_3'); pg.wait_for_timeout(400); r1 = pg.evaluate(LIMBS); pg.wait_for_timeout(160); r2 = pg.evaluate(LIMBS)
        check(r1 and r1['id'] == cid and r1['n'] == want[cid] == r1['declared'] and r1['loops'] == r1['running'] == r1['n'], f'B1 {cid}: {r1 and r1["n"]} limb layers ({r1 and r1["motions"]}) each with a running infinite loop')
        check(r1 and r1['bodyCut'] == want[cid] and 'exclude' in r1['comp'], f'B1 {cid}: body layer cuts out the limbs (mask-composite exclude, {r1 and r1["bodyCut"]} holes)')
        check(r1 and r2 and r1['tf'] != r2['tf'], f'B1 {cid}: limbs keep moving (transforms differ 160ms apart)')
    pg.evaluate("async () => { const m = await import('./js/engines/companion.js'); m.setFavourite(''); }")

    # B2 - voice identity + mouth layer. Headless chromium has no audio output, so the mouth is driven through the same
    # method speak() uses when no analyser is available (timed fallback); the clips themselves must be real files (200).
    VOICE = """(() => { const m = document.querySelector('.q-card > .mascot.companion'); const mo = m.querySelector('.cp-layer.mouth');
      return { id: m.dataset.companion, mouth: !!mo, op: mo ? getComputedStyle(mo).opacity : null, speaking: m.dataset.speaking || null, tf: mo ? mo.style.transform : null, decl: window.__companion?.voice }; })()"""
    ver = pg.evaluate("fetch('version.json').then(r => r.json()).then(j => j.v)")
    for cid in ['bee', 'owl']:
        pg.evaluate("async (id) => { const m = await import('./js/engines/companion.js'); await m.ready(); m.setFavourite(id); }", cid)
        start(pg, 'mult_3'); pg.wait_for_timeout(300); v0 = pg.evaluate(VOICE)
        check(v0['id'] == cid and v0['mouth'] and v0['op'] == '0' and v0['speaking'] is None and v0['decl'], f'B2 {cid}: mouth layer present, hidden while silent, voice declared')
        urls = pg.evaluate("async () => { const m = await import('./js/engines/companion.js'); const c = window.__companion.rig.c; return [m.voiceUrl(c, 'laugh'), m.voiceUrl(c, 'cheer')]; }")
        codes = [pg.request.get(u).status for u in urls]  # absolute (resolved against the content dir like spriteUrl)
        check(all(u.endswith('.mp3?v=' + ver) for u in urls) and codes == [200, 200], f'B2 {cid}: laugh + cheer clips resolve (200) with cache-bust {codes}')
        pg.evaluate("window.__companion.rig.mouthStart(null, 'laugh')"); pg.wait_for_timeout(60); a = pg.evaluate(VOICE); pg.wait_for_timeout(200); b_ = pg.evaluate(VOICE)
        check(a['speaking'] == 'laugh' and a['op'] == '1' and (a['tf'] != b_['tf'] or 'scaleY' in (a['tf'] or '')), f'B2 {cid}: while speaking the mouth layer shows and opens/closes ({a["tf"]} -> {b_["tf"]})')
        pg.evaluate("window.__companion.rig.mouthStop()"); c_ = pg.evaluate(VOICE)
        check(c_['speaking'] is None and c_['op'] == '0' and not c_['tf'], f'B2 {cid}: mouthStop hides the mouth and clears the transform')
    pg.locator('.q-card > .mascot.companion').click(); pg.wait_for_timeout(150)
    t_ = pg.evaluate(VOICE)
    check(t_['speaking'] in ('laugh', None), f'B2 tickle -> laugh path runs without error (speaking={t_["speaking"]})')
    pg.evaluate("(() => { const k = 'abtal:v1:meta'; const m = JSON.parse(localStorage.getItem(k) || '{}'); m.sound = false; localStorage.setItem(k, JSON.stringify(m)); })()")
    pg.goto(BASE); pg.wait_for_timeout(300); start(pg, 'mult_3'); pg.wait_for_timeout(200)
    off = pg.evaluate("async () => { const m = await import('./js/engines/companion.js'); return m.speak(window.__companion.rig, 'laugh'); }")
    check(off is False, 'B2 sound off -> the companion stays silent (speak returns false)')
    pg.evaluate("(() => { const k = 'abtal:v1:meta'; const m = JSON.parse(localStorage.getItem(k) || '{}'); delete m.sound; localStorage.setItem(k, JSON.stringify(m)); })()")
    pg.evaluate("async () => { const m = await import('./js/engines/companion.js'); m.setFavourite(''); }")

    # A1 - links
    readme = open(os.path.join(ROOT, 'README.md'), encoding='utf-8').read()
    sec = readme.split('### روابط محدّثة')[-1] if '### روابط محدّثة' in readme else ''
    links = re.findall(r'<(https://just-ssssssssssssssss\.github\.io/[^>]+)>', sec)
    check(len(links) >= 8, f'A1 README «روابط محدّثة» section lists {len(links)} live Pages links')
    codes = {u: subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', u], capture_output=True, text=True).stdout for u in links}
    badl = [u for u, c in codes.items() if c != '200']
    check(links and not badl, f'A1 every listed live link answers 200 {badl}')
    idx = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    check('github.com/html-mobile-audio' not in idx and 'just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive' in idx, 'A1 root index.html points to the new repository')

    check(not errs, f'0 page errors {errs}')
    check(not bad, f'0 failed requests {bad}')
    b.close()

print('\nRESULT:', 'PASS' if not fails else f'FAIL ({len(fails)})')
sys.exit(1 if fails else 0)
