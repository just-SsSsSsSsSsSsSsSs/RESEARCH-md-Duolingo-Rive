"""Phase 16 - reference render (issue #10 img 7): real 3D sprites for cubes / sun / monkey + Fish clips for the
rewritten missing/distributive stories (v7.19).

  1  assets: every file in app/assets/3d/ is served (200, image/webp) and is <= 40KB.
  2  cubes: in the sunny theme every .gb-cube shows a rendered sprite (background-image -> /assets/3d/cubeN.webp),
     one sprite per tray, neighbouring trays use different sprites; numbers still HTML text (K3 numbering unchanged).
  3  fallback: when the sprite probe fails (route aborted) html.no-3d is set and cubes fall back to the CSS gradient.
  4  mascot: is-3d after load, the idle render visible, inline SVG hidden; happy / encourage poses swap by opacity
     only; a failing image keeps the SVG (never an empty corner).
  5  sun: the sunny sky uses sun.webp (no data-URI sun left).
  6  stories: missing story says "how many in each group" (a groups, unknown each), distributive story splits INSIDE
     every group - and every sentence of both is fully covered by recorded clips (canSpeak true, provider clips).
  7  no page errors, no 4xx.
"""
import os, sys, re, json, subprocess
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8090/app/index.html'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AR2EN = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
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
    pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(700)
    return pg.evaluate('window.__play.q')

def find(pg, acts, pred, n=40):
    for k in range(n):
        q = start(pg, acts[k % len(acts)])
        if pred(q): return q
    return None

CUBES = """(() => { const g = document.querySelector('.q-card .groups-bar'); if (!g) return null;
  const ts = [...g.querySelectorAll('.gb-tray')];
  const img = (c) => getComputedStyle(c).backgroundImage;
  return { no3d: document.documentElement.classList.contains('no-3d'),
    perTray: ts.map((t) => [...new Set([...t.querySelectorAll('.gb-cube')].map(img))]),
    nums: [...g.querySelectorAll('.gb-cube b')].map((e) => e.textContent), cubes: g.querySelectorAll('.gb-cube').length }; })()"""

# Phase 17: the mascot is the companion engine (5 stacked poses: idle/think/happy/encourage/celebrate; the monkey's
# missing think/celebrate renders fall back to idle/happy). The inline SVG exists only in the fallback monkey.
MASCOT = """(() => { const m = document.querySelector('.q-card > .mascot'); if (!m) return null;
  const imgs = [...m.querySelectorAll('.cp-layer.body img, .cp-stage > img')]; const svg = m.querySelector('svg');  // Phase 18: probe the body layer only (the head layer repeats the sprites under a mask)
  return { is3d: m.classList.contains('is-3d'), mood: m.dataset.mood, svg: svg ? getComputedStyle(svg).display : 'none',
    loaded: imgs.map((i) => i.complete && i.naturalWidth > 0), op: imgs.map((i) => getComputedStyle(i).opacity),
    srcs: imgs.map((i) => i.src.split('/').pop().split('?')[0]) }; })()"""

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- 1. assets served
    ctx = b.new_context(); pg = ctx.new_page()
    files = sorted(f for f in os.listdir(os.path.join(ROOT, 'app/assets/3d')) if f.endswith('.webp'))
    check(len(files) >= 10, f'{len(files)} webp renders in app/assets/3d (cube0-5, sun, monkey x3)')
    for f in files:
        r = pg.request.get(f'http://localhost:8090/app/assets/3d/{f}')
        ok = r.status == 200 and 'image/webp' in r.headers.get('content-type', '') and len(r.body()) <= 40 * 1024
        if not ok: check(False, f'{f} status {r.status} type {r.headers.get("content-type")} size {len(r.body())}')
    check(True, 'every render served 200 image/webp <= 40KB') if not fails else None
    ctx.close()

    # ---- 2, 4, 5, 7 sunny theme with sprites
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    bad = []; pg.on('response', lambda r: bad.append((r.status, r.url)) if r.status >= 400 else None)
    pg.add_init_script("(()=>{window.__voice={pref:'speech'};})()")
    hero(pg, 0)
    q = find(pg, ['mult_mix', 'mult_4', 'mult_3'], lambda q: q['meta']['kind'] == 'mult' and q['meta']['a'] >= 3)
    check(q is not None, 'sampled a mult question with >= 3 trays')
    pg.wait_for_timeout(600)
    c = pg.evaluate(CUBES)
    check(c and not c['no3d'], 'sprite probe succeeded (html.no-3d absent)')
    check(c and all(len(x) == 1 for x in c['perTray']), f'one sprite per tray {c and [len(x) for x in c["perTray"]]}')
    check(c and all('/assets/3d/cube' in x[0] and '.webp' in x[0] for x in c['perTray']), 'cubes are rendered sprites (cubeN.webp)')
    first = [x[0] for x in c['perTray']] if c else []
    check(all(first[i] != first[i - 1] for i in range(1, len(first))), 'neighbouring trays use different sprites')
    check(c and len(c['nums']) == c['cubes'] and all(re.fullmatch(r'[٠-٩]+', n) for n in c['nums']), 'numbers stay HTML text over the sprite')
    m = pg.evaluate(MASCOT)
    check(m and m['is3d'] and m['svg'] == 'none', f'mascot uses the renders, inline SVG hidden {m}')
    check(m and all(m['loaded']) and m['srcs'] == ['monkey.webp', 'monkey.webp', 'monkey_happy.webp', 'monkey_encourage.webp', 'monkey_happy.webp'], f'5 poses loaded (think/celebrate fall back to idle/happy) {m and m["srcs"]}')
    # Phase 17: a fresh question shows idle, then the think pose after 0.9s (also the idle render for the monkey)
    check(m and m['op'] in (['1', '0', '0', '0', '0'], ['0', '1', '0', '0', '0']), f'one pose visible only (idle or think) {m and m["op"]}')
    def pose(name, want):
        pg.evaluate("async(n)=>{const m=await import('./js/engines/companion.js');m.mood(document.querySelector('.q-card'),n);}", name)
        # opacity has a .15s transition; under a loaded CPU (full-suite batch) 250ms was not always enough -> poll up to 2s
        got = None
        for _ in range(20):
            got = pg.evaluate(MASCOT)['op']
            if got == want: break
            pg.wait_for_timeout(100)
        check(got == want, f'{name} pose swaps by opacity {got}')
    pose('happy', ['0', '0', '1', '0', '0'])
    pose('encourage', ['0', '0', '0', '1', '0'])
    pg.wait_for_timeout(2700)
    check(pg.evaluate(MASCOT)['mood'] == 'idle', 'encourage returns to idle')
    sun = pg.evaluate("getComputedStyle(document.body,'::before').backgroundImage")
    check('sun.webp' in sun, 'sunny sky uses the rendered sun.webp')
    check(not errs, f'no page errors {errs[:2]}')
    check(not bad, f'no 4xx {bad[:2]}')
    ctx.close()

    # ---- 3. fallback when the sprite probe fails
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    pg.route(re.compile(r'.*/assets/3d/.*\.webp'), lambda r: r.abort())
    pg.add_init_script("(()=>{window.__voice={pref:'speech'};})()")
    hero(pg, 0)
    q = find(pg, ['mult_3', 'mult_4'], lambda q: q['meta']['kind'] == 'mult')
    pg.wait_for_timeout(700)
    c = pg.evaluate(CUBES); m = pg.evaluate(MASCOT)
    check(c and c['no3d'], 'probe failure sets html.no-3d')
    check(c and all('gradient' in x[0] and 'webp' not in x[0] for x in c['perTray']), 'cubes fall back to the CSS gradient')
    check(m and not m['is3d'] and m['svg'] != 'none', 'mascot keeps the inline SVG when the render fails')
    ctx.close()

    # ---- 6. rewritten stories: convention + full clip coverage
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    hero(pg, 0)
    pg.goto(BASE + '#/home'); pg.wait_for_timeout(300)
    res = pg.evaluate("""async () => {
      const { plan } = await import('./js/engines/explain.js');
      const cp = await import('./js/engines/voice/clipsProvider.js');
      await cp.ready();
      const out = { count: cp.count(), missing: [], distributive: [], uncovered: [] };
      for (const a of [3, 4, 5]) for (const b of [2, 6, 9]) for (let seed = 0; seed < 6; seed++) {
        const st = plan({ meta: { kind: 'missing', a, b, ans: b, product: a * b } }, seed).get('story').lines;
        if (seed === 0 && a === 3 && b === 6) out.missing = st;
        for (const s of st) if (!cp.canSpeak(s)) out.uncovered.push(s);
        const s1 = Math.min(5, b - 1) || 1, s2 = b - s1;
        const dl = plan({ meta: { kind: 'distributive', a, b, s1, s2, ans: s2 } }, seed).get('story').lines;
        if (seed === 0 && a === 3 && b === 6) out.distributive = dl;
        for (const s of dl) if (!cp.canSpeak(s)) out.uncovered.push(s);
      }
      return out; }""")
    check(res['count'] >= 373, f'clip manifest loaded ({res["count"]} clips)')
    ms = ' '.join(res['missing']); ds = ' '.join(res['distributive'])
    check('في كل' in ms and 'فيه كام' in ms and 'كل الـ' in ms, f'missing story asks how many in EACH group: {res["missing"][2] if len(res["missing"])>2 else ms}')
    check(res['missing'][0].startswith('عند ') and '٣' in res['missing'][0], f'missing story opens with a = 3 groups: {res["missing"][0]}')
    check(res['distributive'][0].startswith('عندك ٣') and 'في كل' in res['distributive'][0] and '٦' in res['distributive'][0], f'distributive story: a groups of b: {res["distributive"][0]}')
    check('من كل' in res['distributive'][1] and 'الباقي في كل' in res['distributive'][2], f'distributive split happens inside every group: {res["distributive"][1:]}')
    check(not res['uncovered'], f'every rewritten story sentence has recorded clips (uncovered {len(res["uncovered"])}: {res["uncovered"][:2]})')
    ctx.close()
    b.close()

# ---- build-time coverage gate (same engines): no fragment or number without a clip
r = subprocess.run(['node', os.path.join(ROOT, 'tools/explain_segments.mjs'), '--check'], capture_output=True, text=True)
line = [l for l in r.stdout.splitlines() if l.startswith('{')]
st = json.loads(line[-1]) if line else {}
check(r.returncode == 0 and st.get('missingFragments') == 0 and st.get('missingNumbers') == 0, f'explain_segments --check {st}')
man = json.load(open(os.path.join(ROOT, 'app/content/audio/explain/manifest.json'), encoding='utf-8'))
clips = json.load(open(os.path.join(ROOT, 'tools/explain_clips.json'), encoding='utf-8'))
miss = [f for f in clips['fragments'] if 'f:' + f not in man['clips']]
check(not miss, f'every fragment in explain_clips.json has a recorded clip in the manifest ({len(man["clips"])} clips, missing {miss[:3]})')

print('\nRESULT:', 'PASS' if not fails else f'FAIL {len(fails)}')
sys.exit(1 if fails else 0)
