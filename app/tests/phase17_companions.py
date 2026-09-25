"""Phase 17 - companion cast + fx v3 + sun/[X] fix (v7.20).

  1  cast: every subject gets a companion (monkey on math, owl on quran/deen, cat or parrot on arabic, parrot on podcast,
     cat on any subject with no dedicated companion via the '*' pool); all 5 pose images load and exactly one is visible.
  2  rotation: within one pool with >1 candidate the same companion is never picked twice in a row (meta.lastCompanion).
  3  state machine: think pose after ~0.9s, happy on a correct answer, encourage on the first miss (K3 unchanged: no
     reveal), celebrate on a recovered answer; idle log varies (no immediate repeat, >= 3 distinct micro-actions).
  4  layout: the companion is aria-hidden, takes no taps and overlaps neither the question text, the replay button,
     the answer buttons nor the groups bar; quit [X] rect and the sun rect do not intersect.
  5  fx v3: a correct answer draws a pulse ring + a starburst in #fx-layer; a recovered answer is level 3 (rays);
     a miss draws only a soft ring (no red flash); shapes rotate (no immediate repeat over several bursts).
  6  reduced-motion: no idle actions are logged, no burst elements are drawn.
  7  profile picker: a favourite can be set (button, aria-checked, profile.settings.companion) and then wins the pick
     on every subject; "surprise" clears it.
"""
import sys, re
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8090/app/index.html'
AR2EN = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

def hero(pg, idx=0):
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card, [data-act="switch"]')
    if pg.locator('.heroes .hero-card').count() == 0: pg.click('[data-act="switch"]'); pg.wait_for_selector('.heroes .hero-card')
    pg.locator('.hero-card').nth(idx).click(); pg.wait_for_timeout(300)

def start(pg, act, settle=650):
    pg.goto(BASE + '#/home'); pg.wait_for_timeout(80); pg.goto(BASE + '#/play/' + act)
    pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(settle)
    return pg.evaluate('window.__play.q')

NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']
def answer(pg, q, right):
    # Phase 18 mirror: mult_3 mixes numpad / quiz / grid / pick / truefalse - every shape must be answerable right or wrong
    if q.get('type') == 'pick':
        want = set(q['correct']); items = pg.locator('.q-card .pick-grid .choice'); n = items.count()
        wrong = [i for i in range(n) if i not in want]
        idx = sorted(want) if right else (wrong[:1] if wrong else sorted(want)[:1])
        for i in idx: items.nth(i).click()
        pg.locator('.q-card .btn-primary').last.click(); return True
    if q.get('type') == 'truefalse':
        pg.locator('.q-card .choice').nth(0 if (bool(q['answer']) == right) else 1).click(); return True
    want = str(q['choices'][q['answer']]).translate(AR2EN) if q.get('choices') else str(q['answer']).translate(AR2EN)
    if pg.locator('.q-card .numpad').count() == 0 and q.get('choices'):
        for c in pg.locator('.q-card .choice').all():
            if (c.inner_text().strip().translate(AR2EN) == want) == right: c.click(); return True
        return False
    val = want if right else str(int(want) + 1)
    for ch in val: pg.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
    pg.locator('.numpad .btn').nth(11).click(); return True

def rect(pg, sel):
    return pg.evaluate("(s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }", sel)
def inter(a, b, pad=0):
    return a and b and not (a['r'] - pad <= b['l'] or b['r'] - pad <= a['l'] or a['b'] - pad <= b['t'] or b['b'] - pad <= a['t'])

# Phase 18: the sprite is drawn twice (body + head mask layers) -> probe one layer only (body, or the flat stage when unlayered)
COMP = "(() => { const m = document.querySelector('.q-card > .mascot.companion'); if (!m) return null; const im = [...m.querySelectorAll('.cp-layer.body .cp-pose, .cp-stage > .cp-pose')]; return { id: m.dataset.companion, mood: m.dataset.mood, hidden: m.getAttribute('aria-hidden'), pe: getComputedStyle(m).pointerEvents, poses: im.map(i => i.dataset.pose), visible: im.filter(i => getComputedStyle(i).opacity > .5).map(i => i.dataset.pose), loaded: im.filter(i => i.complete && i.naturalWidth > 0).length, log: window.__companion?.rig?.log?.slice() || [] }; })()"
FX = "(() => { const L = document.getElementById('fx-layer'); const n = (c) => L ? L.querySelectorAll(c).length : 0; return { ring: n('.fx-ring'), p: n('.fx-p'), ribbon: n('.fx-ribbon'), rays: n('.fx-rays'), last: window.__fxLast || null }; })()"

# expected pool per activity (subject -> companions.json). arabic has cat + parrot -> either, rotating.
SUBJECTS = [('mult_3', {'monkey'}), ('bayyinah_fill', {'owl'}), ('iman_quiz', {'owl'}), ('tajweed_quiz', {'owl'}), ('plant_quiz', {'cat', 'parrot'})]

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

    # 1 - cast per subject
    for act, want in SUBJECTS:
        start(pg, act)
        c = pg.evaluate(COMP)
        check(c is not None and c['id'] in want, f'1 {act}: companion in {sorted(want)} (got {c and c["id"]})')
        check(c and c['loaded'] == 5 and sorted(c['poses']) == sorted(['idle', 'think', 'happy', 'encourage', 'celebrate']), f'1 {act}: 5 pose images loaded ({c and c["loaded"]}/5)')
        check(c and len(c['visible']) == 1, f'1 {act}: exactly one pose visible ({c and c["visible"]})')

    # 2 - rotation: force a 2-candidate pool by adding a temporary '*' twin, then pick many times
    seq = pg.evaluate("""async () => { const m = await import('./js/engines/companion.js'); await m.ready();
      const l = m.list(); const twin = { ...l.find(c => c.id === 'cat'), id: 'cat2', subjects: ['*'] }; l.push(twin);
      const out = []; for (let i = 0; i < 12; i++) out.push(m.pick('nothing_here').id); l.pop(); return out; }""")
    # Phase 18: the '*' pool is cat + bee (+ the temporary twin) -> at least two distinct picks and never the same one twice in a row
    check(len(set(seq)) >= 2 and all(seq[i] != seq[i + 1] for i in range(len(seq) - 1)), f'2 rotation: no immediate repeat in {seq}')

    # 3 - state machine on math (numpad -> can force right/wrong)
    q = start(pg, 'mult_3', settle=250)
    c0 = pg.evaluate(COMP); pg.wait_for_timeout(1100); c1 = pg.evaluate(COMP)
    check(c0['mood'] == 'idle' and c1['mood'] == 'think' and c1['visible'] == ['think'], f'3 think pose after ~0.9s ({c0["mood"]} -> {c1["mood"]})')
    answer(pg, q, False); pg.wait_for_timeout(250)
    c2 = pg.evaluate(COMP); fx1 = pg.evaluate(FX)
    check(c2['mood'] == 'encourage', f'3 encourage on first miss ({c2["mood"]})')
    check(pg.locator('.feedback.bad').count() == 0 and pg.locator('[data-retry]').count() == 1, '3 K3 unchanged: first miss -> retry bar, no reveal')
    check(fx1['ring'] >= 1 and fx1['p'] == 0 and fx1['rays'] == 0, f'5 miss draws only a soft ring (ring={fx1["ring"]} p={fx1["p"]})')
    pg.wait_for_timeout(600); pg.click('[data-retry] [data-act="retry"]'); pg.wait_for_selector('[data-retry]', state='detached')
    pg.wait_for_selector('.q-card .numpad .btn:not([disabled]), .q-card .choice:not([disabled])'); pg.wait_for_timeout(300)  # mult_3 mixes numpad and quiz questions
    q = pg.evaluate('window.__play.q'); answer(pg, q, True); pg.wait_for_timeout(200)
    c3 = pg.evaluate(COMP); fx2 = pg.evaluate(FX)
    check(c3['mood'] == 'celebrate' and c3['visible'] == ['celebrate'], f'3 celebrate on recovered answer ({c3["mood"]})')
    check(fx2['last'] and fx2['last']['level'] == 3 and fx2['rays'] >= 1 and fx2['p'] >= 10 and fx2['ribbon'] >= 1, f'5 recovered -> level-3 burst (rays={fx2["rays"]} p={fx2["p"]} ribbons={fx2["ribbon"]})')
    # happy on a plain correct answer + shape rotation over several bursts
    shapes = [fx2['last']['shape']]
    for _ in range(4):
        q = start(pg, 'mult_3', settle=250); answer(pg, q, True); pg.wait_for_timeout(200)
        c4 = pg.evaluate(COMP); f = pg.evaluate(FX); shapes.append(f['last']['shape'])
    check(c4['mood'] == 'happy', f'3 happy on a correct answer ({c4["mood"]})')
    check(f['last']['level'] in (1, 2) and f['ring'] >= 1 and f['p'] >= 10, f'5 correct -> ring + starburst (level {f["last"]["level"]})')
    check(all(shapes[i] != shapes[i + 1] for i in range(len(shapes) - 1)) and len(set(shapes)) >= 2, f'5 starburst shapes rotate {shapes}')
    # idle variety
    start(pg, 'mult_3', settle=300); pg.wait_for_timeout(9000)
    c5 = pg.evaluate(COMP); log = c5['log']
    check(len(log) >= 2 and len(set(log)) >= 2 and all(log[i] != log[i + 1] for i in range(len(log) - 1)), f'3 idle micro-actions vary, no immediate repeat {log}')

    # 4 - layout. Phase 18 (AGENTS.md bend 5): the companion takes taps (tickle) but a tap never answers / navigates
    for act, _ in SUBJECTS:
        start(pg, act)
        c = pg.evaluate(COMP); m = rect(pg, '.q-card > .mascot.companion')
        check(c['hidden'] == 'true' and c['pe'] == 'auto', f'4 {act}: companion aria-hidden + pointer-events auto (tickle)')
        before = pg.evaluate('({ i: window.__play.i, h: location.hash })')
        pg.locator('.q-card > .mascot.companion').click(); pg.wait_for_timeout(250)
        after = pg.evaluate('({ i: window.__play.i, h: location.hash, fb: document.querySelectorAll(".feedback, [data-retry]").length, t: window.__companionTickle?.id })')
        check(after['i'] == before['i'] and after['h'] == before['h'] and after['fb'] == 0 and after['t'] == c['id'], f'4 {act}: a tap on the companion tickles only - never answers or navigates {after}')
        others = pg.evaluate("[...document.querySelectorAll('.q-card .q-text, .q-card .q-hear, .q-card .choice, .q-card .numpad .btn, .q-card .groups-bar')].map(e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, cls: e.className }; })")
        hit = [o['cls'] for o in others if inter(m, o)]
        check(m and m['w'] >= 80 and not hit, f'4 {act}: companion ({m and round(m["w"])}px) overlaps nothing {hit}')
    qx = rect(pg, '.play-head [data-act="quit"]')
    sun = pg.evaluate("(() => { const h = document.querySelector('.q-card, .play') ; const s = getComputedStyle(document.body).backgroundPosition; return { pos: s, w: innerWidth }; })()")
    # sun is a body background at `calc(100% + 18px) 104px / 112px` -> right edge, y 104..216
    sunRect = {'l': sun['w'] + 18 - 112, 't': 104, 'r': sun['w'] + 18, 'b': 216}
    check(qx and not inter(qx, sunRect), f'4 quit [X] {qx and (round(qx["l"]), round(qx["t"]), round(qx["r"]), round(qx["b"]))} does not intersect the sun {sunRect}')

    # 6 - reduced motion
    ctx2 = b.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); pg2 = ctx2.new_page()
    pg2.goto(BASE); pg2.wait_for_timeout(300); hero(pg2, 0)
    q = start(pg2, 'mult_3', settle=300); pg2.wait_for_timeout(4500)
    c = pg2.evaluate(COMP); answer(pg2, q, True); pg2.wait_for_timeout(200); f = pg2.evaluate(FX)
    check(c and len(c['log']) == 0, f'6 reduced-motion: no idle actions {c and c["log"]}')
    check(f['ring'] == 0 and f['p'] == 0 and f['rays'] == 0, f'6 reduced-motion: no burst elements {f}')
    ctx2.close()

    # 7 - picker
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.companion-opt')
    n = pg.locator('.companion-opt').count()
    check(n >= 5 and pg.locator('.companion-opt[data-cp=""].on').count() == 1, f'7 picker shows surprise + {n - 1} companions, surprise selected by default')
    pg.click('.companion-opt[data-cp="owl"]'); pg.wait_for_timeout(150)
    fav = pg.evaluate("(() => { const m = JSON.parse(localStorage.getItem('abtal:v1:meta') || '{}'); const p = JSON.parse(localStorage.getItem('abtal:v1:profile:' + m.activeId) || '{}'); return p?.settings?.companion; })()")
    check(pg.locator('.companion-opt[data-cp="owl"].on[aria-checked="true"]').count() == 1 and fav == 'owl', f'7 favourite owl saved (settings.companion={fav})')
    ids = [pg.evaluate(COMP)['id'] for act in ('mult_3', 'plant_quiz', 'bayyinah_fill') if start(pg, act) is not None]
    check(ids == ['owl', 'owl', 'owl'], f'7 favourite wins on every subject {ids}')
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.companion-opt'); pg.click('.companion-opt[data-cp=""]'); pg.wait_for_timeout(150)
    start(pg, 'mult_3'); check(pg.evaluate(COMP)['id'] == 'monkey', '7 surprise restores the subject cast (monkey on math)')

    check(not errs, f'0 page errors {errs[:3]}')
    check(not bad, f'0 failed requests {bad[:3]}')
    b.close()
print('\nRESULT:', 'PASS' if not fails else f'FAIL ({len(fails)})'); sys.exit(1 if fails else 0)
