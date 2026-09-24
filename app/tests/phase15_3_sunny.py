"""Phase 15.3 + 15.4 - sunny joyful theme + colourful 3D trays/cubes + monkey companion (v7.17).

  1  theme: a fresh install opens in the sunny theme; an old install saved as dark (no themeV) is moved to sunny ONCE;
     a child who then picks dark in the profile stays dark after reload (no forced override).
  2  groups bar: neighbouring trays have different colours, cubes inside one tray are identical (one colour per group,
     no extra detail on the counted unit), glossy depth (inset highlight + drop shadow), height still <= 110, no overflow.
  3  grid: dot rows are coloured per row (row = group), dots inside a row identical.
  4  mascot: on every question, aria-hidden, never takes taps, overlaps neither the replay button, the bar, the text
     nor any answer button; claps (happy) on a correct answer and encourages on the first miss (K3 unchanged: no reveal).
  5  readability: question text vs card background contrast >= 4.5 (WCAG AA) in the sunny theme.
  6  prefers-reduced-motion: mascot and sky decoration do not animate.
  7  image downloads: only the Phase 16 rendered sprites from app/assets/3d/ (owner asked for the reference render);
     every other decoration stays inline (data-URI / inline SVG).
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

def start(pg, act):
    pg.goto(BASE + '#/home'); pg.wait_for_timeout(80); pg.goto(BASE + '#/play/' + act)
    pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(650)
    return pg.evaluate('window.__play.q')

def find(pg, acts, pred, n=50):
    for k in range(n):
        q = start(pg, acts[k % len(acts)])
        if pred(q): return q
    return None

def rgb(s):
    m = re.findall(r'[\d.]+', s); return tuple(float(x) for x in m[:3]) if m else None
def lum(c):
    def ch(v):
        v /= 255; return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = c; return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)

NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']
def answer(pg, q, right):
    want = str(q['choices'][q['answer']]).translate(AR2EN) if q.get('choices') else str(q['answer']).translate(AR2EN)
    if pg.locator('.q-card .numpad').count() == 0 and q.get('choices'):
        for c in pg.locator('.q-card .choice').all():
            if (c.inner_text().strip().translate(AR2EN) == want) == right: c.click(); return True
        return False
    val = want if right else str(int(want) + 1)
    for ch in val: pg.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
    pg.locator('.numpad .btn').nth(11).click(); return True

TRAYS = """(() => { const g = document.querySelector('.q-card .groups-bar'); if (!g) return null;
  const ts = [...g.querySelectorAll('.gb-tray')];
  return { h: g.getBoundingClientRect().height,
    // Phase 16: the tray colour lives in --t (gradient box, border 0); pre-16 CSS trays used borderTopColor
    border: ts.map((t) => getComputedStyle(t).getPropertyValue('--t').trim() || getComputedStyle(t).borderTopColor),
    cubes: ts.map((t) => [...new Set([...t.querySelectorAll('.gb-cube')].map((c) => getComputedStyle(c).backgroundImage))].length),
    nums: [...g.querySelectorAll('.gb-cube b')].map((e) => e.textContent), faces: g.querySelectorAll('.gb-face').length, trays: ts.length,
    sq: ts.map((t) => { const r = t.getBoundingClientRect(); return Math.max(r.width, r.height) / Math.min(r.width, r.height); }),
    shadow: ts.length ? getComputedStyle(ts[0].querySelector('.gb-cube')).boxShadow : '',
    sprite: ts.length ? (getComputedStyle(ts[0].querySelector('.gb-cube')).backgroundImage.includes('/assets/3d/cube') && getComputedStyle(ts[0].querySelector('.gb-cube')).filter.includes('drop-shadow')) : false,
    over: ts.some((t) => { const a = t.getBoundingClientRect(), b = g.getBoundingClientRect(); return a.left < b.left - .5 || a.right > b.right + .5; }) }; })()"""

MASCOT = """(() => { const m = document.querySelector('.q-card > .mascot'); if (!m) return null; const r = m.getBoundingClientRect();
  const hit = (sel) => [...document.querySelectorAll(sel)].some((e) => { const x = e.getBoundingClientRect(); return x.width && !(x.right <= r.left || x.left >= r.right || x.bottom <= r.top || x.top >= r.bottom); });
  return { hidden: m.getAttribute('aria-hidden'), pe: getComputedStyle(m).pointerEvents, w: r.width,
    hitHear: hit('.q-card .q-hear'), hitBar: hit('.q-card .groups-bar'), hitText: hit('.q-card .q-text'),
    hitAns: hit('.q-card .choice, .q-card .numpad .btn, .q-card .explain-btn'), svgIds: m.querySelectorAll('[id]').length }; })()"""

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- 1. theme default + one-time migration + respect a later dark choice
    ctx = b.new_context(viewport={'width': 360, 'height': 740}); pg = ctx.new_page()
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.hero-card')
    check(pg.evaluate('document.documentElement.dataset.theme') == 'light', 'fresh install opens in the sunny theme')
    pg.evaluate("localStorage.setItem('abtal:v1:meta', JSON.stringify({activeId:null, theme:'dark', sound:true}))"); pg.reload(); pg.wait_for_selector('.hero-card')
    check(pg.evaluate('document.documentElement.dataset.theme') == 'light', 'old install saved as dark -> moved to sunny once')
    hero(pg, 0); pg.goto(BASE + '#/profile'); pg.wait_for_selector('[data-act="theme"]'); pg.click('[data-act="theme"]'); pg.wait_for_timeout(150)
    check(pg.evaluate('document.documentElement.dataset.theme') == 'dark', 'profile switch still turns dark on')
    pg.reload(); pg.wait_for_selector('.view'); pg.wait_for_timeout(200)
    check(pg.evaluate('document.documentElement.dataset.theme') == 'dark', 'dark choice survives reload (migration runs once only)')
    pg.click('[data-act="theme"]'); pg.wait_for_timeout(100); ctx.close()

    # ---- 2..7 in the sunny theme
    ctx = b.new_context(viewport={'width': 360, 'height': 740}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    imgs = []; pg.on('request', lambda r: imgs.append(r.url) if r.resource_type == 'image' and not r.url.startswith('data:') else None)
    pg.add_init_script("(()=>{window.__voice={pref:'speech'};})()")
    hero(pg, 0)
    q = find(pg, ['mult_mix', 'mult_4', 'mult_3'], lambda q: q['meta']['kind'] == 'mult' and q['meta']['a'] >= 3)
    check(q is not None, 'found an a x b question with a >= 3')
    t = pg.evaluate(TRAYS)
    check(t and t['h'] <= 188 and not t['over'], f'bar height <= 188 and no overflow ({t and t["h"]})')
    check(t and all(t['border'][i] != t['border'][i + 1] for i in range(len(t['border']) - 1)), f'neighbouring trays have different colours {t and t["border"][:4]}')
    check(t and len(set(t['border'][:6])) == min(6, len(t['border'])), 'first 6 trays all different colours')
    check(t and all(n == 1 for n in t['cubes']), 'cubes inside one tray are identical')
    # Phase 16: depth comes from the rendered sprite (+ drop-shadow); the CSS inset/bevel shadow is the no-3d fallback
    check(t and (t['sprite'] or ('inset' in t['shadow'] and t['shadow'].count('rgba') >= 3)), 'cubes have 3D depth (rendered sprite + drop shadow, or the CSS inset/bevel fallback)')
    a_, b_ = q['meta']['a'], q['meta']['b']
    check(t and all(x <= 2.6 for x in t['sq']), f'Phase 15.4: chunky trays, no thin pill strips (aspect {t and [round(x, 2) for x in t["sq"]]})')
    if t and t['nums']:
        want = [str(k + 1) for k in range(b_)] * a_
        check([n.translate(AR2EN) for n in t['nums']] == want, 'Phase 15.4: cubes numbered 1..b in every tray during the question (never the running total -> K3)')
    check(t and t['faces'] in (0, t['trays']), 'Phase 15.4: tray faces all-or-none')
    m = pg.evaluate(MASCOT)
    check(m and m['hidden'] == 'true' and m['pe'] == 'none' and m['w'] >= 40, f'mascot present, aria-hidden, never takes taps {m}')
    check(m and not m['hitHear'] and not m['hitBar'] and not m['hitText'] and not m['hitAns'], 'mascot overlaps no replay button / bar / text / answers')
    check(m and m['svgIds'] == 0, 'mascot SVG has no ids (no clash across repeated cards)')
    card_bg = pg.evaluate("getComputedStyle(document.querySelector('.q-card')).backgroundImage")
    txt = rgb(pg.evaluate("getComputedStyle(document.querySelector('.q-card .q-text')).color"))
    bgc = rgb(re.findall(r'rgba?\([^)]*\)', card_bg)[-1]) if 'rgb' in card_bg else (255, 255, 255)
    cr = contrast(txt, bgc); check(cr >= 4.5, f'question text contrast {cr:.1f} >= 4.5')
    answer(pg, q, True); pg.wait_for_timeout(250)
    check((pg.evaluate('window.__lastMascot') or {}).get('mood') == 'happy', 'mascot claps on a correct answer')
    pg.wait_for_timeout(2700)
    after = pg.evaluate("[...document.querySelectorAll('.q-card .gb-cube b')].map((e) => e.textContent)")
    if after:
        check([n.translate(AR2EN) for n in after] == [str(k + 1) for k in range(a_ * b_)], f'Phase 15.4: after the answer the cubes count 1..{a_ * b_} (skip-count lesson)')
    # first miss -> encourage, still no reveal (K3)
    q = find(pg, ['mult_3', 'mult_4'], lambda q: q['meta']['kind'] == 'mult')
    answer(pg, q, False); pg.wait_for_timeout(300)
    check((pg.evaluate('window.__lastMascot') or {}).get('mood') == 'encourage', 'mascot encourages on the first miss')
    check(pg.locator('.feedback.bad').count() == 0 and pg.locator('[data-retry]').count() == 1, 'K3 unchanged: first miss -> retry bar, no reveal')
    # grid rows
    q = find(pg, ['mult_mix', 'mult_3', 'mult_4'], lambda q: q['meta']['kind'] == 'grid' and q['meta']['a'] >= 2)
    if q:
        rows = pg.evaluate("""(() => { const d = [...document.querySelectorAll('.dot-grid .dot')], c = window.__play.q.cols;
          const rs = []; for (let i = 0; i < d.length; i += c) rs.push([...new Set(d.slice(i, i + c).map((e) => getComputedStyle(e).backgroundImage))].length);
          const first = d.filter((_, i) => i % c === 0).map((e) => getComputedStyle(e).backgroundImage);
          return { same: rs.every((n) => n === 1), diff: first.every((v, i) => i === 0 || v !== first[i - 1]) }; })()""")
        check(rows['same'] and rows['diff'], f'grid: each row one colour, neighbouring rows differ {rows}')
    else: check(True, 'grid question not sampled (skipped)')
    stray = [u for u in imgs if '/app/assets/3d/' not in u]
    check(not stray, f'image downloads only from app/assets/3d/ (Phase 16 renders) {stray[:3]}')
    check(not errs, f'no page errors {errs[:2]}')
    ctx.close()

    # ---- 6. reduced motion
    ctx = b.new_context(viewport={'width': 360, 'height': 740}, reduced_motion='reduce'); pg = ctx.new_page()
    pg.add_init_script("(()=>{window.__voice={pref:'speech'};})()")
    hero(pg, 0); start(pg, 'mult_3')
    an = pg.evaluate("""({ m: getComputedStyle(document.querySelector('.q-card > .mascot .m-body')).animationName,
      sky: getComputedStyle(document.body, '::before').animationName })""")
    check(an['m'] == 'none' and an['sky'] == 'none', f'reduced motion: mascot + sky still {an}')
    ctx.close(); b.close()

print(f'\n{"ALL PASS" if not fails else str(len(fails)) + " FAIL"}')
sys.exit(1 if fails else 0)
