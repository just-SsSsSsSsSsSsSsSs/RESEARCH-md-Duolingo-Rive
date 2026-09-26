"""Phase 20 - «تقرير الأهل الأسبوعي» Parent Weekly Report. Server: tools/serve.py 8090

  U   pure core: node app/tests/unit/report_core.test.mjs (27 checks) runs first.
  R1  report card behind PIN: seeded previous week 20 -> this week 30 correct -> kind improved, deltas, headline names the
      child and ends with the next step; best slot from hour histogram (morning 5/5 beats afternoon 1/4);
      weak / strong skill from THIS week's events only; tip attached; next focus = weak skill.
  R2  conversation starters: 3 items, grounded in data (recovered skill, strong skill, best day), none compares siblings.
  R3  archive: aggregates only (w,id,c,a,m,d,r,k), idempotent across dashboard reopen, per-child cap 8 (seeded 9 weeks -> 8).
  R4  fresh dot: nav shows .nav-dot before opening the report; opening the dashboard sets reportSeenWeek and the dot is gone.
  R5  family summary: 3 members, no numeric rank, no «last», quest carried from the board, link to #/family.
  R6  privacy: share text has no raw event keys / timestamps / question ids; report section absent without PIN;
      the child views (#/home, #/family) never show report classes.
  R7  print: one click -> exactly one window.print, body[data-print=report] + .rp-printing; print media hides nav and
      siblings of the card; afterprint restores.
  A   a11y/overlap: trend has role=img + label, cards do not overlap, nav not covered.
  hygiene: 0 page errors, 0 failed requests; family links; zero emoji in Phase 20 files.
"""
from playwright.sync_api import sync_playwright
import os, re, sys, subprocess, datetime as dt

BASE = 'http://localhost:8090/app/index.html'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

TODAY = dt.date.today()
WEEK0 = TODAY - dt.timedelta(days=(TODAY.weekday() + 2) % 7)  # Saturday of the current school week
META = "JSON.parse(localStorage.getItem('abtal:v1:meta'))"
def ms(d, h): return int(dt.datetime(d.year, d.month, d.day, h).timestamp() * 1000)
def ev(d, h, skill, ok, ret=False): return {'type': 'question_attempted', 't': ms(d, h), 'hour': h, 'skill': skill, 'correct': ok, 'retried': ret, 'subject': 'math'}

def hero(pg, idx):
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card, [data-act="switch"]')
    if pg.locator('.heroes .hero-card').count() == 0: pg.click('[data-act="switch"]'); pg.wait_for_selector('.heroes .hero-card')
    pg.locator('.hero-card').nth(idx).click(); pg.wait_for_timeout(250)

def open_parent(pg, pin='1234'):
    pg.goto(BASE + '#/parent'); pg.wait_for_selector('.pin input, [data-sec="family"]')
    if pg.locator('.pin input').count():
        for i, d in enumerate(pin): pg.locator('.pin input').nth(i).fill(d)
    pg.wait_for_selector('[data-sec="family"]', timeout=8000); pg.wait_for_timeout(400)

u = subprocess.run(['node', os.path.join(ROOT, 'app/tests/unit/report_core.test.mjs')], capture_output=True, text=True)
check(u.returncode == 0 and '27/27' in u.stdout, 'U node unit checks ' + (u.stdout.strip().splitlines()[-1] if u.stdout.strip() else u.stderr[-200:]))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs, bad = [], []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.goto(BASE); pg.wait_for_timeout(300); pg.evaluate('localStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(300)
    for i in range(3): hero(pg, i)
    hero(pg, 0); pg.wait_for_timeout(500)

    events = [ev(TODAY, 9, 'جدول ٢', True)] * 5 + [ev(TODAY, 16, 'جدول ٧', False)] * 3 + [ev(TODAY, 16, 'جدول ٧', True, True)] + [ev(WEEK0 - dt.timedelta(days=3), 20, 'جدول ٩', False)] * 4
    daily = {str(WEEK0 - dt.timedelta(days=7)): {'xp': 60, 'minutes': 10, 'answers': 22, 'correct': 20, 'recovered': 0, 'activities': []},
             str(TODAY): {'xp': 90, 'minutes': 12, 'answers': 34, 'correct': 30, 'recovered': 1, 'activities': []}}
    pg.evaluate("([d,e])=>{const k='abtal:v1:profile:selim';const p=JSON.parse(localStorage.getItem(k));p.daily=d;p.events=e;localStorage.setItem(k,JSON.stringify(p));}", [daily, events])
    pg.evaluate("(t)=>{const k='abtal:v1:profile:kenda';const p=JSON.parse(localStorage.getItem(k));p.daily={[t]:{xp:18,minutes:4,answers:8,correct:6,recovered:0,activities:[]}};localStorage.setItem(k,JSON.stringify(p));}", str(TODAY))
    pg.reload(); pg.wait_for_timeout(500)

    # R4 - fresh dot before; R6 - child views clean
    pg.goto(BASE + '#/home'); pg.wait_for_selector('nav.nav'); pg.wait_for_timeout(900)
    check(pg.locator('nav.nav a[href="#/parent"] .nav-dot').count() == 1, 'R4 fresh dot on the parent nav item before opening')
    check(pg.locator('.rp-card, .rp-family').count() == 0, 'R6 home shows no report card')
    pg.goto(BASE + '#/family'); pg.wait_for_selector('.fam-tile'); check(pg.locator('.rp-card, .rp-family').count() == 0, 'R6 family board shows no report card')
    pg.goto(BASE + '#/parent'); pg.wait_for_selector('.pin input'); pg.wait_for_timeout(300)
    check(pg.locator('.rp-card, [data-sec="family-summary"]').count() == 0, 'R6 no report section before the PIN')

    # R1 - report card
    open_parent(pg); pg.wait_for_selector('.rp-card[data-report="selim"]')
    r = pg.evaluate('window.__report')
    check(r['kind'] == 'improved' and r['deltas']['correct'] == 10, f"R1 kind {r['kind']} delta correct {r['deltas']['correct']}")
    check('سليم' in r['headline'] and 'الخطوة الجاية' in r['headline'] and 'جدول ٧' in r['headline'], 'R1 headline names the child and ends with the next step')
    check(r['slot'] == 'morning', f"R1 best slot morning ({r['slot']})")
    check(r['weak'] == 'جدول ٧' and r['strong'] == 'جدول ٢', f"R1 weak {r['weak']} / strong {r['strong']} from this week only (last week's جدول ٩ ignored)")
    check(pg.locator('.rp-card .rp-weak').count() == 1 and 'ملاعق' in pg.locator('.rp-card .rp-weak').inner_text(), 'R1 weak skill row carries the home tip')
    check(pg.locator('.rp-card .rp-stat').count() == 4 and pg.locator('.rp-card .rp-d.up').count() >= 2, 'R1 four stats with delta arrows')
    check(pg.get_attribute('.rp-card', 'data-kind') == 'improved' and pg.locator('.section .tag-green').count() >= 1, 'R1 kind tag rendered')

    # R2 - starters
    st = pg.locator('.rp-starters li').all_inner_texts()
    check(len(st) == 3 and r['starters'] == ['recovered', 'strong', 'bestday'], f"R2 three grounded starters {r['starters']}")
    check('جدول ٧' in st[0] and 'جدول ٢' in st[1], 'R2 starters quote the real skills')
    check(all(not re.search(r'اخوه|اخته|احسن من|اقل من|كندة|كارما', s) for s in st), 'R2 starters never mention or compare siblings')

    # R3 - archive; R4 - seen
    m = pg.evaluate(META); arc = m.get('parentReports') or []
    check(len(arc) >= 1 and all(set(s.keys()) == {'w', 'id', 'c', 'a', 'm', 'd', 'r', 'k'} for s in arc), f'R3 archive holds aggregates only ({len(arc)} snapshots)')
    check(m.get('reportSeenWeek') == r['weekStart'], 'R4 opening the report marks the week as seen')
    open_parent(pg)
    check(len(pg.evaluate(META).get('parentReports') or []) == len(arc), 'R3 reopening the dashboard does not duplicate snapshots')
    nine = [{'w': f'2026-0{1 + i // 4}-{str(1 + (i % 4) * 7).zfill(2)}', 'id': 'selim', 'c': 5 + i, 'a': 7 + i, 'm': 3, 'd': 1, 'r': 0, 'k': 'steady'} for i in range(9)]
    pg.evaluate("(l)=>{const m=JSON.parse(localStorage.getItem('abtal:v1:meta'));m.parentReports=l;localStorage.setItem('abtal:v1:meta',JSON.stringify(m));}", nine)
    pg.reload(); pg.wait_for_timeout(400); open_parent(pg); pg.wait_for_selector('.rp-card')
    mine = [s for s in pg.evaluate(META)['parentReports'] if s['id'] == 'selim']
    check(len(mine) == 8 and mine[-1]['w'] == r['weekStart'] and mine[0]['w'] != nine[0]['w'], f'R3 per-child cap 8, oldest dropped, current week kept ({len(mine)})')
    check(pg.locator('.rp-trend[role="img"]').count() == 1 and pg.locator('.rp-trend i').count() == 8, 'A trend bars role=img with 8 bars')

    # R4 - dot gone
    pg.goto(BASE + '#/home'); pg.wait_for_selector('nav.nav'); pg.wait_for_timeout(900)
    check(pg.locator('nav.nav .nav-dot').count() == 0, 'R4 dot cleared after the parent opened the report')

    # R5 - family summary
    open_parent(pg)
    fs = pg.evaluate('window.__reportSummary'); txt = pg.inner_text('[data-sec="family-summary"]')
    check(set(fs['members']) == {'selim', 'karma', 'kenda'} and pg.locator('.rp-member').count() == 3, 'R5 family summary lists the three children')
    check(not re.search(r'الاخير|الأخير|ترتيب|المركز', txt) and pg.locator('.rp-member .rank').count() == 0, 'R5 no rank / no last in the family summary')
    check(fs['quest'] and fs['quest']['progress'] == 36 and pg.locator('[data-sec="family-summary"] a[href="#/family"]').count() == 1, f"R5 quest {fs['quest'] and fs['quest']['progress']} carried + link to the board")

    # R6 - share text privacy
    text = pg.evaluate('window.__report.text')
    check('تقرير سليم' in text and 'اسئلة على السفرة' in text, 'R6 share text renders')
    check(not re.search(r'question_attempted|"t":|\d{13}|\dx\d|events', text), 'R6 share text has no raw events / timestamps / question ids')

    # R7 - print (stub installed as a statement so evaluate() does not invoke it)
    pg.evaluate("() => { window.__printed = 0; window.print = function () { window.__printed++; }; }")
    pg.click('.rp-card [data-act="rp-print"]'); pg.wait_for_timeout(150)
    check(pg.evaluate('window.__printed') == 1 and pg.evaluate('document.body.dataset.print') == 'report' and pg.locator('.rp-card.rp-printing').count() == 1, 'R7 one click -> one print, body[data-print=report] + .rp-printing')
    pg.click('.rp-card [data-act="rp-print"]'); pg.wait_for_timeout(100)
    check(pg.evaluate('window.__printed') == 1, 'R7 re-entrancy guard: second click while printing is ignored')
    pg.emulate_media(media='print'); pg.wait_for_timeout(100)
    check(pg.evaluate("getComputedStyle(document.querySelector('nav.nav')).display") == 'none' and pg.evaluate("getComputedStyle(document.querySelector('.rp-card.rp-printing')).display") != 'none' and pg.evaluate("getComputedStyle(document.querySelector('[data-sec=\"family\"]')).display") == 'none', 'R7 print media: nav + siblings hidden, card visible')
    pg.emulate_media(media='screen'); pg.evaluate("() => dispatchEvent(new Event('afterprint'))"); pg.wait_for_timeout(100)
    check(pg.evaluate('document.body.dataset.print') is None and pg.locator('.rp-printing').count() == 0, 'R7 afterprint restores the page')

    # A - overlap / nav
    rects = pg.evaluate("[...document.querySelectorAll('.rp-card, .rp-family')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom)]})")
    check(all(rects[i][1] <= rects[i + 1][0] + 1 for i in range(len(rects) - 1)), f'A report cards do not overlap {rects}')
    covered = pg.evaluate("(()=>{const n=document.querySelector('nav.nav').getBoundingClientRect();const el=document.elementFromPoint(n.left+n.width/2,n.top+n.height/2);return !!el&&!!el.closest('nav.nav')})()")
    check(covered, 'A bottom nav not covered')

    check(not errs, f'hygiene 0 page errors {errs[:2]}')
    check(not bad, f'hygiene 0 failed requests {bad[:2]}')
    b.close()

fl = subprocess.run([sys.executable, os.path.join(ROOT, 'tools/check_family_links.py')], capture_output=True, text=True)
check(fl.returncode == 0, 'hygiene family links intact')
files = ['app/js/engines/report_core.js', 'app/js/engines/report.js', 'app/js/ui/views/parentReport.js', 'app/tests/phase20_report.py', 'app/tests/unit/report_core.test.mjs']
EMO = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF\U0001F000-\U0001F2FF]')
check(all(not EMO.search(open(os.path.join(ROOT, f), encoding='utf-8').read()) for f in files), 'hygiene zero emoji in Phase 20 files')

print('\n' + ('PASS' if not fails else 'FAIL') + f' phase20_report: {len(fails)} failure(s)')
sys.exit(1 if fails else 0)
