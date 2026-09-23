"""Phase 11 / K2 - RTL karaoke word order must equal logical order (Chromium, DOM evidence).

Reproduces the field bug: karaoke text of "يعني إيه يا بابا؟" rendered as scrambled words.
Visual reading order (top row first, right-to-left within a row) is computed from
getBoundingClientRect() of every .kw span and compared with the logical (DOM) order.
Also probes many synthetic sentences (numbers, punctuation, Latin, mixed) directly in the
karaoke() renderer so the fix is verified over the whole text family, not one sample.
"""
import sys, json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8090/app/index.html'
PROBE = '''() => {
  const p = document.querySelector('.k-text'); if (!p) return null;
  const cs = getComputedStyle(p);
  const ws = [...p.querySelectorAll('.kw')].map((s, i) => { const r = s.getBoundingClientRect();
    return { i, t: s.textContent, x: Math.round(r.x), r: Math.round(r.right), y: Math.round(r.y), disp: getComputedStyle(s).display, bidi: getComputedStyle(s).unicodeBidi }; });
  return { dir: cs.direction, bidi: cs.unicodeBidi, pdir: p.getAttribute('dir'), ws };
}'''
def visual(ws):
    # group in rows by y (tolerance 6px), rows top->bottom, within a row right->left
    rows = []
    for w in sorted(ws, key=lambda w: w['y']):
        if rows and abs(rows[-1][0]['y'] - w['y']) <= 6: rows[-1].append(w)
        else: rows.append([w])
    out = []
    for r in rows: out += sorted(r, key=lambda w: -w['r'])
    return [w['t'] for w in out]

SAMPLES = [
  'عندك كراتين كل واحد فيه ٣ بيضات.',
  'كل الـبيضات مع بعض ١٢.',
  'عدّ بالنطّ ٣، ٦، ٩… واحسب كام نطّة لحد ١٢.',
  'يعني ٣ في ٤ = ١٢ بالظبط!',
  'سليم قال لك: "عدّ لي كل الـبيضات اللي عندي!"',
  'تخيّل إيدك: كل إيد فيها ٥ صوابع. لو عندك إيدين، دول ٥ في ٢ = ١٠ صوابع.',
  'الخطوة 1: اكتب 3 x 4 (بالإنجليزي) وشوف الناتج 12.',
]
fails = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text')
    # 1) real strategies on the live question (rotate through all)
    for _ in range(4):
        info = pg.evaluate(PROBE); strat = pg.evaluate('window.__explain.strategy()')
        logical = [w['t'] for w in info['ws']]; vis = visual(info['ws'])
        ok = logical == vis
        print(f"[live:{strat}] dir={info['dir']} bidi={info['bidi']} kw.display={info['ws'][0]['disp']} kw.bidi={info['ws'][0]['bidi']} -> {'MATCH' if ok else 'SCRAMBLED'}")
        if not ok: fails.append((strat, ' '.join(logical), ' '.join(vis)))
        print('  logical:', ' '.join(logical)); print('  visual :', ' '.join(vis))
        pg.click('[data-act="another"]'); pg.wait_for_timeout(300)
    # sentence-per-line: every .k-sent must be a block (distinct y from its neighbour)
    ys = pg.evaluate('''() => [...document.querySelectorAll('.k-text .k-sent')].map(s => Math.round(s.getBoundingClientRect().y))''')
    print('sentence blocks y:', ys)
    if len(ys) > 1 and len(set(ys)) != len(ys): fails.append(('k-sent not block', ys, ys))
    # 2) synthetic samples rendered through the same renderer shape (k-sent > kw), under an RTL host
    #    AND under a forced LTR host (the empirically-proven trigger of the field bug).
    for host in ['rtl', 'ltr']:
        pg.evaluate('(d) => { document.querySelector(".explain-sheet").style.direction = d; document.querySelector(".explain-sheet").removeAttribute("dir"); }', host)
        for s in SAMPLES:
            pg.evaluate('''(s) => { const p = document.querySelector('.k-text');
              p.innerHTML = s.split(/(?<=[.!?\u061f\u2026])\\s+/).filter(Boolean).map(sent => `<span class="k-sent">${sent.split(/\\s+/).filter(Boolean).map(w => `<span class="kw">${w.replace(/</g,'&lt;')}</span>`).join(' ')}</span>`).join(''); }''', s)
            pg.wait_for_timeout(40)
            info = pg.evaluate(PROBE); logical = [w['t'] for w in info['ws']]; vis = visual(info['ws']); ok = logical == vis
            print(f"[host={host}] {'MATCH' if ok else 'SCRAMBLED'} dir={info['dir']} | {s}")
            if not ok: fails.append((f'host={host}', ' '.join(logical), ' '.join(vis))); print('  visual :', ' '.join(vis))
    b.close()
print('pageerrors:', errs)
if fails or errs:
    print('FAIL', json.dumps(fails, ensure_ascii=False, indent=1)); sys.exit(1)
print('PASS phase11_rtl')
