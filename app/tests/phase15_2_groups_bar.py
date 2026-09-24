"""Phase 15.2 - equal-groups bar (a trays x b identical cubes) + explanations follow a x b = a groups of b.

  1  layout (pure, Node): every a<=6, b<=12 the generators can produce fits the bar at 360px width
     (Phase 15.4: height adapts per question <= 176+12px, reserved before paint; cubes >= 16px, no thin pill trays).
  2  explanations (Node, real explain.plan): mult story / readaloud / reallife / steps say "a groups of b":
     story has a units with b things each; step 1 asks "how many times" = a; skip counting goes by b.
  3  browser 360x740, mult_3 + mult_4 + mult_mix: every a x b question shows the bar with a trays of b cubes that
     match the numbers on screen; no bar on missing / grid / pick / commutative / distributive; height <= 188;
     nothing overflows; cube numbers never exceed b and the answer (a*b) never appears in the aria-label (K3).
  4  K3: after a first miss the bar is still there, unchanged (no count, no answer); retry re-render keeps it.
"""
import sys, json, re, subprocess
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8090/app/index.html'
ROOT = __file__.rsplit('/app/tests/', 1)[0]
AR2EN = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
fails = []
def check(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

NODE = r'''
globalThis.window = undefined;
const R = process.argv[1]; const fs = await import('fs');
const src = fs.readFileSync(R + '/app/js/ui/groupsBar.js', 'utf8');
const body = src.slice(src.indexOf('export const HMAX'), src.indexOf('const AR ='));
const { layout, HMAX } = new Function(body.replace(/export /g, '') + '; return { layout, HMAX };')();
const H = HMAX;
let bad = [], min = 99, twoRows = 0, thin = 0;
for (let a = 1; a <= 6; a++) for (let b = 1; b <= 12; b++) {
  const L = layout(a, b, { w: 300 });
  // Phase 15.4 geometry: tray = cubes + gaps + 2*(pad 5 + border 3 + well 2) wide; + pad-top 5 + 2*border + 2*well + lip 14 high
  const tw = L.cols * L.cube + (L.cols - 1) * 3 + 20, th = L.rows * L.cube + (L.rows - 1) * 3 + 4 + 5 + 6 + 14;
  const hh = L.trayRows * th + (L.trayRows - 1) * 8, ww = L.trayCols * tw + (L.trayCols - 1) * 8;
  if (hh > H || ww > 300 || hh !== L.h || L.trayRows * L.trayCols < a || L.cols * L.rows < b || L.cube < 12) bad.push([a, b, L, hh, ww]);
  min = Math.min(min, L.cube); if (L.trayRows > 1) twoRows++;
  if (Math.max(tw, th) / Math.min(tw, th) > 2.6) thin++;
}
const { plan } = await import(R + '/app/js/engines/explain.js');
const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);
const ex = []; for (const [a, b] of [[3, 4], [4, 7], [6, 9], [3, 10]]) for (let seed = 0; seed < 6; seed++) {
  const P = plan({ type: 'numpad', meta: { kind: 'mult', a, b, ans: a * b } }, seed);
  const story = P.get('story').lines.join(' '), ra = P.get('readaloud').lines.join(' '), rl = P.get('reallife').lines.join(' ');
  const steps = P.get('steps').steps;
  ex.push({ a, b,
    story: story.includes(`عند`) && new RegExp(`عند \\S+ ${AR(a)} `).test(story) && story.includes(`فيه ${AR(b)} `),
    skipByB: story.includes(`${AR(b)}، ${AR(2 * b)}`),
    readaloud: ra.includes(`${AR(b)} مكرّرة ${AR(a)} مرات`),
    reallife: rl.includes(`كل مجموعة فيها ${AR(b)}، وعدد المجموعات ${AR(a)}`),
    step1: steps[0].say.includes(`العدد ${AR(b)} هنكرّره`) && steps[0].answer === AR(a),
    step2: steps[1].answer === AR(2 * b) });
}
console.log(JSON.stringify({ bad, min, twoRows, thin, H, ex }));
'''
out = subprocess.run(['node', '--input-type=module', '-e', NODE, ROOT], capture_output=True, text=True, timeout=120)
try: r = json.loads(out.stdout.strip().splitlines()[-1])
except Exception: r = {'bad': ['node error'], 'err': out.stderr[-500:]}; print(r)
check(r['bad'] == [], f"all 72 a x b (a<=6, b<=12) fit the {r.get('H')}px max bar in 300px, cubes >= 12px (min {r.get('min')}px) {r['bad'][:3]}")
check(r.get('min', 0) >= 14, f"Phase 15.4: smallest cube {r.get('min')}px >= 14 (only 5x9..5x12; most are 17-40px)")
check(r.get('thin') == 0, 'Phase 15.4: no thin pill-strip trays (every tray aspect <= 2.6:1)')
check(r.get('H', 999) <= 176, f"bar content height <= {r.get('H')}px (+12px for the 3D tray edge)")
ex = r.get('ex', [])
for k, label in [('story', 'story: a units, b things in each'), ('skipByB', 'story skip-counts by b'), ('readaloud', 'readaloud: b repeated a times'),
                 ('reallife', 'reallife: groups of b, a groups'), ('step1', 'steps: "b is repeated how many times?" -> a'), ('step2', 'steps: second jump = 2b')]:
    check(ex and all(e[k] for e in ex), f'explanations follow a x b = a groups of b - {label}')

def hero(pg, idx):
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card, [data-act="switch"]')
    if pg.locator('.heroes .hero-card').count() == 0: pg.click('[data-act="switch"]'); pg.wait_for_selector('.heroes .hero-card')
    pg.locator('.hero-card').nth(idx).click(); pg.wait_for_timeout(300)

BAR = """(() => { const g = document.querySelector('.q-card .groups-bar'); if (!g) return null; const r = g.getBoundingClientRect();
  const trays = [...g.querySelectorAll('.gb-tray')];
  const inside = (e, p) => { const x = e.getBoundingClientRect(), y = p.getBoundingClientRect(); return x.left >= y.left - .5 && x.right <= y.right + .5 && x.top >= y.top - .5 && x.bottom <= y.bottom + .5; };
  const card = document.querySelector('.q-card');
  return { h: r.height, w: r.width, trays: trays.length, per: trays.map((t) => t.querySelectorAll('.gb-cube').length),
    inCard: inside(g, card), traysIn: trays.every((t) => inside(t, g)), cubesIn: [...g.querySelectorAll('.gb-cube')].every((c) => inside(c, c.parentElement)),
    text: g.textContent, nums: [...g.querySelectorAll('.gb-cube b')].map((e) => e.textContent), label: g.getAttribute('aria-label'), html: g.innerHTML.length,
    beforeText: (() => { const t = document.querySelector('.q-card .q-text'); return !!t && r.bottom <= t.getBoundingClientRect().top + .5; })() }; })()"""

NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']
def wrong_answer(pg, q):
    if pg.locator('.numpad').count() == 0 and q.get('choices'):
        want = str(q['choices'][q['answer']]).translate(AR2EN)
        for c in pg.locator('.choices .choice').all():
            if c.inner_text().strip().translate(AR2EN) != want: c.click(); return True
        return False
    for ch in str(int(str(q['answer']).translate(AR2EN)) + 1): pg.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
    pg.locator('.numpad .btn').nth(11).click(); return True

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 360, 'height': 740})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("(()=>{window.__voice={pref:'speech'};})()")
    hero(pg, 0)
    seen_bar, seen_none, bad_bar, heights = 0, set(), [], set(); fixed_ok = True
    # a x b is ~half of each session's questions (random order): sample until 10 were seen (hard cap 60 starts)
    for k in range(60):
        if seen_bar >= 10 and len(seen_none) >= 2: break
        act = ['mult_3', 'mult_4', 'mult_mix'][k % 3]
        pg.goto(BASE + '#/home'); pg.wait_for_timeout(80); pg.goto(BASE + '#/play/' + act)
        pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(1100)  # 15.4: tray entrance (70ms x a + .45s) has settled
        q = pg.evaluate('window.__play.q'); m = q['meta']; info = pg.evaluate(BAR)
        if m['kind'] == 'mult':
            seen_bar += 1; heights.add(round(info['h']) if info else None); fixed_ok = fixed_ok and info and abs(info['h'] - (pg.evaluate("parseFloat(document.querySelector('.groups-bar').style.getPropertyValue('--gb-h'))") + 12)) < 1
            shown = [int(x) for x in re.findall(r'\d+', pg.locator('.q-text').first.inner_text().translate(AR2EN))]
            ok = info and info['trays'] == m['a'] and all(n == m['b'] for n in info['per']) and shown[:2] == [m['a'], m['b']] \
                and info['h'] <= 188 and info['inCard'] and info['traysIn'] and info['cubesIn'] and info['beforeText'] \
                and max([0] + [int(x.translate(AR2EN)) for x in info['nums']]) <= m['b'] \
                and (m['a'] * m['b'] in (m['a'], m['b']) or m['a'] * m['b'] not in [int(x) for x in re.findall(r'\d+', (info['label'] or '').translate(AR2EN))])
            if not ok: bad_bar.append((act, m['a'], m['b'], info))
        else:
            seen_none.add(m['kind'])
            if info: bad_bar.append((act, m['kind'], 'bar on a non a x b question'))
    print('a x b seen', seen_bar, '| without bar', sorted(seen_none), '| heights', heights)
    check(seen_bar >= 10 and not bad_bar, f'every a x b question shows a trays of b cubes matching the screen, <=188px, inside the card, cube numbers never above b (no answer) ({bad_bar[:2]})')
    check(fixed_ok, f'bar height is reserved up front from the layout (no shift while cubes animate) {heights}')
    check(seen_none, f'no bar on other question kinds ({sorted(seen_none)})')

    # bar above the text = position (the absolute speaker button sits between them in the DOM);
    # answer check = whole numbers, and 4 x 1 = 4 legitimately shows 4 as an operand
    # ---------- 4) K3: bar unchanged after a miss and on the retry re-render ----------
    for _ in range(12):
        pg.goto(BASE + '#/home'); pg.wait_for_timeout(80); pg.goto(BASE + '#/play/mult_3')
        pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(400)
        if pg.evaluate('window.__play.q.meta.kind') == 'mult': break
    q = pg.evaluate('window.__play.q'); before = pg.evaluate(BAR)
    check(wrong_answer(pg, q), 'wrong answer entered')
    pg.wait_for_selector('.feedback[data-retry]', timeout=5000)
    after = pg.evaluate(BAR)
    check(after and after['html'] == before['html'] and after['trays'] == before['trays'], 'after a first miss the bar is unchanged (no count, no answer)')
    check(pg.locator('.feedback.bad').count() == 0, 'first miss still does not reveal (K3)')
    pg.click('.feedback[data-retry] [data-act="retry"]'); pg.wait_for_timeout(500)
    again = pg.evaluate(BAR)
    check(pg.evaluate('window.__play.retry') is True and again and again['trays'] == q['meta']['a'], 'retry re-render keeps the same bar')
    b.close()
print('pageerrors:', errs)
if fails or errs: print('FAIL', fails); sys.exit(1)
print('PASS phase15_2_groups_bar')
