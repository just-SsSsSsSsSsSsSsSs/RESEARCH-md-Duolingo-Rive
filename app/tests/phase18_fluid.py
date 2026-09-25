"""Phase 18 - fluid companion motion (v7.22). Server: python3 tools/serve.py 8090

What is new and what this suite proves (the character is alive, not a sprite swap):
  1  rig: the same sprite is drawn as two CSS-mask layers (body / head) with the flat single-layer fallback only when
     mask-image is unsupported; both layers carry an infinite alternating breath loop (head phase-shifted by 120ms).
  2  never still: 30 transform samples over 3s on the body layer are not all identical (breathing runs while idle),
     and the body and head matrices differ at the same instant (independent layers).
  3  spring easing: spring() returns a CSS linear() curve (bezier fallback when linear() is unsupported); the curve
     overshoots (a value > 1 appears) and ends at 1; easing() reports the capability.
  4  composition: an idle micro-action is composed ON TOP of breathing (composite add) - the breath loops keep
     running (playState running) while a micro-action is active; idle log varies.
  5  pose swap: show() flips the visible pose and adds a squash/stretch animation on the body (not just opacity).
  6  tickle: a tap on the companion reacts (mood tickle, happy pose visible, __companionTickle set) and is swallowed:
     __play.i unchanged, no feedback / retry bar, hash unchanged. Hearts burst appears when celebration > 0.
  7  lookAt / anticipate: pointerdown on a numpad digit sets data-look (left/right/center) + __companionLook and
     data-anticipating='1'; tapping the primary key (ok) relaxes (data-anticipating removed).
  8  reduced motion: zero running animations on the companion, no idle log, tickle still swaps pose (no motion).
  9  visibility: hiding the document pauses the breath loops; showing resumes them.
 10  layout + a11y: aria-hidden, companion overlaps no text / hear / choice / key / groups bar on every subject.
 11  hygiene: 0 page errors, 0 failed requests, version 7.22 in version.json + importmap cache-bust marker present.
"""
from playwright.sync_api import sync_playwright
import json, sys, os

BASE = 'http://localhost:8090/app/index.html'
AR2EN = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

def hero(pg, idx=0):
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card, [data-act="switch"]')
    if pg.locator('.heroes .hero-card').count() == 0: pg.click('[data-act="switch"]'); pg.wait_for_selector('.heroes .hero-card')
    pg.locator('.hero-card').nth(idx).click(); pg.wait_for_timeout(300)

def start(pg, act, settle=500):
    pg.goto(BASE + '#/home'); pg.wait_for_timeout(80); pg.goto(BASE + '#/play/' + act)
    pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(settle)
    return pg.evaluate('window.__play.q')

def numpad_q(pg, tries=8):
    """mult_3 mixes shapes; walk until a numpad question is on screen."""
    for _ in range(tries):
        q = start(pg, 'mult_3', settle=400)
        if pg.locator('.q-card .numpad').count(): return q
    return None

RIG = """(() => { const m = document.querySelector('.q-card > .mascot.companion'); if (!m) return null;
  const body = m.querySelector('.cp-layer.body'), head = m.querySelector('.cp-layer.head'), stage = m.querySelector('.cp-stage');
  const anims = m.getAnimations({ subtree: true });
  const inf = anims.filter(a => a.effect.getTiming().iterations === Infinity);
  const tf = (e) => e ? getComputedStyle(e).transform : '';
  return { id: m.dataset.companion, layered: m.classList.contains('is-layered'), hasBody: !!body, hasHead: !!head,
    maskBody: body ? (getComputedStyle(body).maskImage || getComputedStyle(body).webkitMaskImage) : '', maskHead: head ? (getComputedStyle(head).maskImage || getComputedStyle(head).webkitMaskImage) : '',
    pe: getComputedStyle(m).pointerEvents, hidden: m.getAttribute('aria-hidden'), mood: m.dataset.mood, pose: m.dataset.pose, look: m.dataset.look || null, antic: m.dataset.anticipating || null,
    total: anims.length, running: anims.filter(a => a.playState === 'running').length, inf: inf.length, infRunning: inf.filter(a => a.playState === 'running').length, infPaused: inf.filter(a => a.playState === 'paused').length,
    infTargets: inf.map(a => a.effect.target.className), infDelays: inf.map(a => a.effect.getTiming().delay),
    tfBody: tf(body || stage), tfHead: tf(head || stage),
    visible: [...m.querySelectorAll('.cp-layer.body .cp-pose, .cp-stage > .cp-pose')].filter(i => getComputedStyle(i).opacity > .5).map(i => i.dataset.pose),
    log: window.__companion?.rig?.log?.slice() || [], fallback: window.__companion?.id === 'fallback', linear: !!window.__companion?.linear }; })()"""

def rect(pg, sel):
    return pg.evaluate("(s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }", sel)
def inter(a, b):
    return a and b and not (a['r'] <= b['l'] or b['r'] <= a['l'] or a['b'] <= b['t'] or b['b'] <= a['t'])

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    pg = ctx.new_page()
    errs, bad = [], []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.goto(BASE); pg.wait_for_timeout(400)
    pg.evaluate("localStorage.clear()"); pg.goto(BASE); pg.wait_for_timeout(400)
    hero(pg, 0)
    pg.evaluate("(() => { const k = 'abtal:v1:meta'; localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) || '{}'), celebration: 3 })); })()")
    pg.goto(BASE); pg.wait_for_timeout(300)

    # 1 - rig structure
    start(pg, 'mult_3'); r = pg.evaluate(RIG)
    mask_ok = pg.evaluate("CSS.supports('mask-image', 'linear-gradient(#000, transparent)') || CSS.supports('-webkit-mask-image', 'linear-gradient(#000, transparent)')")
    check(r and not r['fallback'], f'1 companion rig mounted ({r and r["id"]})')
    if mask_ok:
        check(r['layered'] and r['hasBody'] and r['hasHead'], '1 two mask layers (body + head) when mask-image is supported')
        check('gradient' in r['maskBody'] and 'gradient' in r['maskHead'] and r['maskBody'] != r['maskHead'], f'1 body/head masks are distinct gradients')
        check(r['inf'] == 2 and sorted(r['infDelays']) == [0, 120], f'1 two infinite breath loops, head phase-shifted 120ms (delays {r["infDelays"]})')
    else:
        check(not r['layered'] and r['inf'] == 1, '1 single-layer fallback (mask-image unsupported) with one breath loop')
    check(r['infRunning'] == r['inf'] and r['inf'] >= 1, f'1 breath loops running ({r["infRunning"]}/{r["inf"]})')

    # 2 - never still + independent layers
    samples = pg.evaluate("""async () => { const m = document.querySelector('.q-card > .mascot.companion'); const b = m.querySelector('.cp-layer.body') || m.querySelector('.cp-stage'); const out = [];
      for (let i = 0; i < 30; i++) { out.push(getComputedStyle(b).transform); await new Promise(r => setTimeout(r, 100)); } return out; }""")
    check(len(set(samples)) >= 10, f'2 never still: {len(set(samples))}/30 distinct body transforms over 3s')
    r = pg.evaluate(RIG)
    if mask_ok: check(r['tfBody'] != r['tfHead'], '2 body and head move independently (different matrices at the same instant)')

    # 3 - spring easing
    sp = pg.evaluate("""async () => { const m = await import('./js/engines/companion.js'); const e = m.easing(); const s = m.spring(170, 14);
      const nums = s.startsWith('linear(') ? s.slice(7, -1).split(',').map(x => parseFloat(x)) : []; return { linear: e.linear, s: s.slice(0, 40), n: nums.length, max: nums.length ? Math.max(...nums) : 0, last: nums.length ? nums[nums.length - 1] : null, soft: e.soft.slice(0, 7), pop: e.pop.slice(0, 7) }; }""")
    lin_ok = pg.evaluate("CSS.supports('animation-timing-function', 'linear(0, 1)')")
    if lin_ok:
        check(sp['linear'] and sp['s'].startswith('linear(') and sp['n'] >= 20, f'3 spring() -> CSS linear() with {sp["n"]} samples')
        check(sp['max'] > 1.0 and abs(sp['last'] - 1) < 1e-6, f'3 spring overshoots ({sp["max"]:.3f}) then settles at 1')
        check(sp['soft'] == 'linear(' and sp['pop'] == 'linear(', '3 soft/pop presets are linear() curves')
    else:
        check(not sp['linear'] and sp['s'].startswith('cubic-bezier'), '3 bezier fallback when linear() is unsupported')

    # 4 - composition: micro-action on top of the running breath
    r0 = pg.evaluate(RIG); pg.wait_for_timeout(7000); r1 = pg.evaluate(RIG)
    check(len(r1['log']) >= 2 and len(set(r1['log'])) >= 2 and all(r1['log'][i] != r1['log'][i + 1] for i in range(len(r1['log']) - 1)), f'4 idle micro-actions vary, no immediate repeat {r1["log"]}')
    check(r1['infRunning'] == r1['inf'], f'4 breath never stopped across micro-actions ({r1["infRunning"]}/{r1["inf"]} running)')
    # force one micro-action right now (E2E hook: the rig is exposed on window.__companion) and inspect the stack
    comp = pg.evaluate("""(() => { const m = document.querySelector('.q-card > .mascot.companion'); window.__companion.rig.tick(); const A = m.getAnimations({ subtree: true });
      return { comp: A.map(a => a.effect.composite), infRunning: A.filter(a => a.effect.getTiming().iterations === Infinity && a.playState === 'running').length, n: A.length }; })()""")
    check('add' in comp['comp'] and comp['infRunning'] >= 1 and comp['n'] >= comp['infRunning'] + 1, f'4 micro-action composed on top (composite add) while the breath keeps running {comp}')

    # 5 - pose swap adds squash/stretch on the body
    sq = pg.evaluate("""async () => { const m = await import('./js/engines/companion.js'); const card = document.querySelector('.q-card'); const cp = card.querySelector(':scope > .mascot.companion');
      const before = cp.getAnimations({ subtree: true }).length; m.mood(card, 'happy'); await new Promise(r => setTimeout(r, 60));
      const anims = cp.getAnimations({ subtree: true }); return { before, after: anims.length, finite: anims.filter(a => a.effect.getTiming().iterations !== Infinity).length, pose: cp.dataset.pose, mood: cp.dataset.mood }; }""")
    check(sq['pose'] == 'happy' and sq['mood'] == 'happy' and sq['finite'] >= 2, f'5 show(happy): pose swap + squash/stretch + reaction on top ({sq["finite"]} finite anims)')
    pg.wait_for_timeout(2600)

    # 6 - tickle: reacts, never answers
    q = numpad_q(pg)
    check(q is not None, '6 a numpad question is available on mult_3')
    before = pg.evaluate('({ i: window.__play.i, h: location.hash })')
    fx0 = pg.evaluate("document.querySelectorAll('#fx-layer .fx-p').length")
    pg.locator('.q-card > .mascot.companion').click(); pg.wait_for_timeout(120)
    # the pose <img> opacity has a .18s CSS transition; under a loaded CPU poll up to 1s for the swap to become visible
    for _ in range(10):
        t = pg.evaluate(RIG)
        if t['visible'] == ['happy']: break
        pg.wait_for_timeout(100)
    tk = pg.evaluate('window.__companionTickle || null')
    fx1 = pg.evaluate("document.querySelectorAll('#fx-layer .fx-p').length")
    after = pg.evaluate('({ i: window.__play.i, h: location.hash, fb: document.querySelectorAll(".feedback, [data-retry]").length })')
    check(t['mood'] == 'tickle' and t['visible'] == ['happy'] and tk and tk['id'] == t['id'], f'6 tickle: mood tickle, happy pose visible, __companionTickle set ({t["mood"]}, {t["visible"]})')
    check(after['i'] == before['i'] and after['h'] == before['h'] and after['fb'] == 0, f'6 tickle swallowed: index/hash unchanged, no feedback {after}')
    check(fx1 > fx0, f'6 tickle draws a small hearts burst (celebration 3): {fx0} -> {fx1} particles')
    pg.wait_for_timeout(1600); t2 = pg.evaluate(RIG)
    check(t2['mood'] in ('idle', 'think'), f'6 back to idle after the tickle hold ({t2["mood"]})')

    # 7 - lookAt + anticipate on the numpad
    q = numpad_q(pg)
    keys = pg.locator('.q-card .numpad .btn')
    keys.nth(0).dispatch_event('pointerdown', {'clientX': 40, 'clientY': 600, 'bubbles': True}); pg.wait_for_timeout(80)
    la = pg.evaluate(RIG); look = pg.evaluate('window.__companionLook || null')
    check(la['look'] in ('left', 'right', 'center') and look and 'dx' in look, f'7 lookAt on a digit: data-look={la["look"]} {look}')
    check(la['antic'] == '1', '7 anticipate on the first digit (data-anticipating=1)')
    pg.wait_for_timeout(1700); la2 = pg.evaluate(RIG)
    check(la2['look'] is None, '7 head eases back (data-look cleared ~1.5s)')
    ok_btn = pg.locator('.q-card .numpad .btn').nth(11)
    ok_btn.dispatch_event('pointerdown', {'clientX': 300, 'clientY': 700, 'bubbles': True}); pg.wait_for_timeout(120)
    la3 = pg.evaluate(RIG)
    check(la3['antic'] is None, '7 relax on the ok key (data-anticipating removed)')

    # 10 - layout across subjects (companion is tappable but must never sit on a control)
    for act in ['mult_3', 'bayyinah_fill', 'iman_quiz', 'tajweed_quiz', 'plant_quiz']:
        start(pg, act, settle=300); r = pg.evaluate(RIG); m = rect(pg, '.q-card > .mascot.companion')
        others = pg.evaluate("[...document.querySelectorAll('.q-card .q-text, .q-card .q-hear, .q-card .choice, .q-card .numpad .btn, .q-card .groups-bar, .q-card .explain-btn')].map(e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, cls: e.className }; })")
        hit = [o['cls'] for o in others if inter(m, o)]
        check(r and r['hidden'] == 'true' and r['pe'] == 'auto' and m and m['w'] >= 80 and not hit, f'10 {act}: aria-hidden, pointer-events auto, overlaps nothing {hit}')

    # 9 - visibility: hidden document pauses the loops
    start(pg, 'mult_3', settle=300)
    vis = pg.evaluate("""async () => { const snap = () => { const m = document.querySelector('.q-card > .mascot.companion'); const inf = m.getAnimations({ subtree: true }).filter(a => a.effect.getTiming().iterations === Infinity); return inf.map(a => a.playState); };
      const hide = (h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => h ? 'hidden' : 'visible' }); document.dispatchEvent(new Event('visibilitychange')); };
      const a = snap(); hide(true); await new Promise(r => setTimeout(r, 50)); const b = snap(); hide(false); await new Promise(r => setTimeout(r, 50)); const c = snap(); return { a, b, c }; }""")
    check(all(s == 'running' for s in vis['a']) and all(s == 'paused' for s in vis['b']) and all(s == 'running' for s in vis['c']), f'9 breath pauses when hidden and resumes when visible {vis}')

    # 8 - reduced motion
    ctx2 = b.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', has_touch=True); pg2 = ctx2.new_page()
    pg2.goto(BASE); pg2.wait_for_timeout(300); hero(pg2, 0)
    start(pg2, 'mult_3', settle=300); pg2.wait_for_timeout(3500)
    rr = pg2.evaluate(RIG)
    check(rr and rr['running'] == 0 and rr['inf'] == 0 and len(rr['log']) == 0, f'8 reduced-motion: no breath loop, no running animation, no idle log ({rr and (rr["running"], rr["inf"], rr["log"])})')
    pg2.locator('.q-card > .mascot.companion').click(); pg2.wait_for_timeout(100)
    rr2 = pg2.evaluate(RIG)
    check(rr2['mood'] == 'tickle' and rr2['visible'] == ['happy'] and rr2['running'] == 0, f'8 reduced-motion: tickle swaps the pose without motion ({rr2["mood"]}, running {rr2["running"]})')
    ctx2.close()

    # 11 - hygiene
    ver = json.load(open(os.path.join(ROOT, 'app', 'version.json')))
    idx = open(os.path.join(ROOT, 'app', 'index.html'), encoding='utf-8').read()
    check(ver['v'] == '7.22', f'11 version.json = 7.22 (got {ver["v"]})')
    check(f'?v={ver["v"]}' in idx, '11 index.html importmap/assets cache-busted with the current version')
    check(not errs, f'0 page errors {errs}')
    check(not bad, f'0 failed requests {bad}')
    b.close()

print('\nRESULT:', 'PASS' if not fails else f'FAIL ({len(fails)})')
sys.exit(1 if fails else 0)
