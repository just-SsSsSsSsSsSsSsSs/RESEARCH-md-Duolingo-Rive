"""Phase 19 - «التحدي العائلي» Family Challenge Board. Server: tools/serve.py 8090

  U   pure maths: node app/tests/unit/family_core.test.mjs (31 checks) runs first.
  F1  fairness: with seeded data the youngest (kenda: 6 -> 12 correct) wears the growth crown over the older sibling
      (selim: 30 -> 33); first-week child gets a «first week» line, never a percentage; tiles carry no numeric rank
      and the board text never says «last»; headline winner(s) are rendered first; ties share a crown.
  F2  quest: shared bar with aria progressbar; target 300 for 3 active heroes; progress = sum of correct.
  F3  recovered counter: a real lesson (mult_3) miss -> retry -> correct increments today's `recovered` bucket (K3 intact).
  F4  entries: home card [data-act=family] and profile button route to #/family; requireProfile redirects when logged out.
  C1  family card: whitelist-clean payload (no names; only v/kind/src/week/heroes/k/days/a/c/x/m/r + dates);
      import a relative's card -> guests appear on the board; re-import with lower values keeps the max (monotonic);
      invalid / unclean cards rejected; own card ignored; local label never enters the card; remove / clear behind PIN.
  C2  PIN gate: without the PIN the parent route shows only the PIN pad (no family section).
  M4  celebration: quest reached -> celebrate flag once, companion cast recorded, second visit silent.
  A   a11y/overlap: tiles do not overlap; bottom nav not covered; avatars aria-hidden; rings role=img; reduced motion -> no tile animation.
  hygiene: 0 page errors, 0 failed requests; family links intact; zero emoji in Phase 19 files.
"""
from playwright.sync_api import sync_playwright
import os, re, sys, json, subprocess, datetime as dt

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

TODAY = dt.date.today()
WEEK0 = TODAY - dt.timedelta(days=(TODAY.weekday() + 2) % 7)  # Saturday that starts the current school week (Sat..Fri)
def bucket(c, minutes=5, recovered=0):
    return {'xp': c * 3, 'minutes': minutes, 'answers': c + 2, 'correct': c, 'recovered': recovered, 'activities': []}
def seed(this_week, prev_per_week, minutes=5, recovered=0):
    # this week's numbers on today (always inside the current week); baseline = 2 days in each of the 4 previous weeks
    out = {str(TODAY): bucket(this_week, minutes, recovered)}
    for w in range(1, 5):
        for d in (0, 1): out[str(WEEK0 - dt.timedelta(days=7 * w) + dt.timedelta(days=d))] = bucket(prev_per_week // 2, 5)
    return out
SEED = {
    'selim': seed(33, 30, minutes=5, recovered=1),   # 30 -> 33 = +10%
    'kenda': seed(12, 6, minutes=5, recovered=1),    # 6 -> 12 = +100% (youngest improves most)
    'karma': {str(TODAY): bucket(4, minutes=3)},     # first week ever
}
SET_DAILY = "(data)=>{for(const [id,d] of Object.entries(data)){const k='abtal:v1:profile:'+id;const p=JSON.parse(localStorage.getItem(k));p.daily=d;localStorage.setItem(k,JSON.stringify(p));}}"
GUESTS = "JSON.parse(localStorage.getItem('abtal:v1:meta')).familyGuests || []"

def seed_all(pg, data):
    for i in range(3): hero(pg, i)
    hero(pg, 0); pg.wait_for_timeout(500)          # selim active, pending saves flushed
    pg.evaluate(SET_DAILY, data); pg.reload(); pg.wait_for_timeout(400)  # store re-reads localStorage on boot

def board(pg):
    pg.goto(BASE + '#/home'); pg.wait_for_timeout(150); pg.goto(BASE + '#/family'); pg.wait_for_selector('.fam-tile'); pg.wait_for_timeout(500)
    return pg.evaluate('window.__family')

def open_parent(pg, pin='1234'):
    pg.goto(BASE + '#/parent'); pg.wait_for_selector('.pin input, [data-sec="family"]')
    if pg.locator('.pin input').count():             # the dashboard stays unlocked for 10 minutes after a correct PIN
        for i, d in enumerate(pin): pg.locator('.pin input').nth(i).fill(d)
    pg.wait_for_selector('[data-sec="family"]', timeout=8000)

AR2EN = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']
def answer(pg, q, right):
    # mirror of phase17_companions.answer: mult_3 mixes numpad / quiz / pick / truefalse
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

# ---- U: pure unit checks
u = subprocess.run(['node', os.path.join(ROOT, 'app/tests/unit/family_core.test.mjs')], capture_output=True, text=True)
check(u.returncode == 0 and '31/31' in u.stdout, 'U node unit checks ' + (u.stdout.strip().splitlines()[-1] if u.stdout.strip() else u.stderr[-200:]))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs, bad = [], []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.goto(BASE); pg.wait_for_timeout(300); pg.evaluate('localStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(300)

    # F4 - requireProfile redirect when logged out
    pg.goto(BASE + '#/family'); pg.wait_for_timeout(500)
    check(pg.evaluate('location.hash').startswith('#/profile'), 'F4 #/family without a profile redirects to #/profile')

    seed_all(pg, SEED)
    f = board(pg)
    by = {t['id']: t for t in f['tiles']}
    check(by['kenda']['growth'] == 100 and by['selim']['growth'] == 10, f"F1 growth kenda {by['kenda']['growth']}% vs selim {by['selim']['growth']}%")
    check('growth' in by['kenda']['crowns'] and 'growth' not in by['selim']['crowns'], 'F1 youngest with most growth wears the growth crown')
    check(by['karma']['growth'] is None and 'اول اسبوع' in by['karma']['line'], 'F1 first-week child: line instead of percentage')
    check(all('rank' not in t for t in f['tiles']) and pg.locator('.fam-tile .rank, .fam-rank').count() == 0, 'F1 no numeric rank anywhere')
    txt = pg.inner_text('.fam-board')
    check(not re.search(r'الأخير|الاخير|اخر واحد|آخر واحد|خسر|خسران', txt), 'F1 board never says last / lost')
    check(pg.locator('.fam-tile').first.get_attribute('data-leads') == '1' and f['tiles'][0]['leads'], 'F1 headline winner(s) rendered first')
    check('minutes' in by['selim']['crowns'] and 'minutes' in by['kenda']['crowns'], 'F1 tie on minutes -> both wear the crown')
    check(pg.locator('.fam-tile').count() == 3 and len(pg.locator('.fam-tile .fam-line').all_inner_texts()) == 3, 'F1 three tiles, one personal line each')

    # F2 - quest
    q = f['quest']
    check(q['target'] == 300 and q['progress'] == 33 + 12 + 4 and q['done'] is False, f"F2 quest target {q['target']} progress {q['progress']}")
    pb = pg.locator('.fam-quest [role="progressbar"]')
    check(pb.count() == 1 and pb.get_attribute('aria-valuemax') == '300' and pb.get_attribute('aria-valuenow') == '49', 'F2 quest bar exposes aria progressbar values')

    # A - a11y / overlap / reduced motion
    rects = pg.evaluate("[...document.querySelectorAll('.fam-tile')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom)]})")
    check(all(rects[i][1] <= rects[i + 1][0] + 1 for i in range(len(rects) - 1)), f'A tiles stack without overlap {rects}')
    check(pg.locator('.fam-avatar[aria-hidden="true"]').count() == 3 and pg.locator('.fam-ring[role="img"]').count() == 3, 'A avatars aria-hidden, rings role=img with label')
    covered = pg.evaluate("(()=>{const n=document.querySelector('nav.nav').getBoundingClientRect();const el=document.elementFromPoint(n.left+n.width/2,n.top+n.height/2);return !!el&&!!el.closest('nav.nav')})()")
    check(covered, 'A bottom nav not covered by board elements')
    snapshot = pg.evaluate('Object.fromEntries(Object.entries(localStorage))')
    rm = b.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); pr = rm.new_page()
    pr.goto(BASE); pr.wait_for_timeout(200); pr.evaluate('(s)=>{for(const [k,v] of Object.entries(s)) localStorage.setItem(k,v)}', snapshot)
    pr.goto(BASE + '#/family'); pr.reload(); pr.wait_for_timeout(300); pr.wait_for_selector('.fam-tile'); pr.wait_for_timeout(300)
    check(pr.evaluate("getComputedStyle(document.querySelector('.fam-tile')).animationName") == 'none', 'A reduced-motion: tile animation none')
    rm.close()

    # F4 - entries
    pg.goto(BASE + '#/home'); pg.wait_for_selector('[data-act="family"]'); pg.click('[data-act="family"]'); pg.wait_for_selector('.fam-tile')
    check(pg.evaluate('location.hash') == '#/family', 'F4 home card routes to #/family')
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('[data-act="family"]'); pg.click('[data-act="family"]'); pg.wait_for_selector('.fam-tile')
    check(pg.evaluate('location.hash') == '#/family', 'F4 profile button routes to #/family')

    # F3 - recovered counter via a real lesson (K3 untouched)
    REC = f"(JSON.parse(localStorage.getItem('abtal:v1:profile:selim')).daily['{TODAY}']||{{}}).recovered||0"
    before = pg.evaluate(REC)
    pg.goto(BASE + '#/home'); pg.wait_for_timeout(100); pg.goto(BASE + '#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card'); pg.wait_for_timeout(650)
    answer(pg, pg.evaluate('window.__play.q'), False); pg.wait_for_timeout(300)
    check(pg.locator('.feedback.bad').count() == 0 and pg.locator('[data-retry]').count() == 1, 'F3 K3 unchanged: first miss -> retry bar, no reveal')
    pg.wait_for_timeout(600); pg.click('[data-retry] [data-act="retry"]'); pg.wait_for_selector('[data-retry]', state='detached')
    pg.wait_for_selector('.q-card .numpad .btn:not([disabled]), .q-card .choice:not([disabled])'); pg.wait_for_timeout(300)
    answer(pg, pg.evaluate('window.__play.q'), True); pg.wait_for_timeout(500)
    after = pg.evaluate(REC)
    check(after == before + 1, f'F3 recovered bucket {before} -> {after} after miss -> retry -> correct')

    # C1 - family card + guests (PIN)
    open_parent(pg)
    own = pg.evaluate("document.querySelector('[data-preview]').textContent"); ownobj = json.loads(own)
    allowed = {'v', 'kind', 'src', 'week', 'heroes', 'k', 'days', 'a', 'c', 'x', 'm', 'r'}
    keys = set(re.findall(r'"([^"]+)":', own))
    check(all(k in allowed or re.match(r'^\d{4}-\d{2}-\d{2}$', k) for k in keys), 'C1 payload keys whitelist-clean ' + str(sorted(k for k in keys if not re.match(r'^\d{4}', k))))
    check(not re.search(r'سليم|كارما|كندة|name|device|token', own), 'C1 payload has no names / device info')
    check(ownobj['kind'] == 'abtal-family-card' and re.match(r'^[0-9a-f]{6}$', ownobj['src']) and {h['k'] for h in ownobj['heroes']} == {'selim', 'kenda', 'karma'}, 'C1 card lists the three heroes by id only')
    rel = {'v': 1, 'kind': 'abtal-family-card', 'src': 'c0ffee', 'week': str(TODAY), 'heroes': [
        {'k': 'selim', 'days': {str(TODAY): {'a': 6, 'c': 6, 'x': 18, 'm': 4, 'r': 1}, str(TODAY - dt.timedelta(days=1)): {'a': 8, 'c': 5, 'x': 15, 'm': 6, 'r': 0}}},
        {'k': 'karma', 'days': {str(TODAY): {'a': 3, 'c': 2, 'x': 6, 'm': 2, 'r': 0}}}]}
    pg.evaluate('t=>window.__familyParent.applyText(t)', json.dumps(rel)); pg.wait_for_timeout(300)
    g = pg.evaluate(GUESTS)
    check(len(g) == 2 and pg.locator('.fam-guest').count() == 2 and all(x['name'].startswith('ضيف') for x in g), 'C1 relative card -> 2 guests with neutral labels')
    rel2 = json.loads(json.dumps(rel)); rel2['heroes'][0]['days'][str(TODAY)]['c'] = 2
    pg.evaluate('t=>window.__familyParent.applyText(t)', json.dumps(rel2)); pg.wait_for_timeout(200)
    g2 = pg.evaluate(GUESTS)
    check(len(g2) == 2 and g2[0]['daily'][str(TODAY)]['correct'] == 6, 'C1 re-import is idempotent and monotonic (keeps max 6)')
    pg.evaluate('t=>window.__familyParent.applyText(t)', json.dumps({'kind': 'x'})); pg.wait_for_timeout(150)
    pg.evaluate('t=>window.__familyParent.applyText(t)', json.dumps({**rel, 'heroes': [{'k': 'selim', 'days': {}, 'name': 'leak'}]})); pg.wait_for_timeout(150)
    check(len(pg.evaluate(GUESTS)) == 2, 'C1 invalid / unclean cards rejected')
    pg.evaluate('t=>window.__familyParent.applyText(t)', own); pg.wait_for_timeout(150)
    check(len(pg.evaluate(GUESTS)) == 2, 'C1 own card ignored')
    pg.locator('.fam-guest input').first.fill('ابن خالتي'); pg.locator('.fam-guest input').first.dispatch_event('change'); pg.wait_for_timeout(200)
    board(pg)
    check(pg.locator('.fam-tile.guest').count() == 2 and 'ابن خالتي' in pg.locator('.fam-tile.guest h3').first.inner_text(), 'C1 guests appear on the board with the local label')
    check(pg.locator('.fam-tile').count() == 5 and not re.search(r'الأخير|الاخير', pg.inner_text('.fam-board')), 'C1 five tiles, still nobody last')
    open_parent(pg)
    check('ابن خالتي' not in pg.evaluate("document.querySelector('[data-preview]').textContent"), 'C1 local guest label never enters the card')
    pg.locator('.fam-guest [data-act="fam-remove"]').first.click(); pg.wait_for_selector('.modal'); pg.locator('.modal .btn-primary').click(); pg.wait_for_timeout(200)
    check(pg.locator('.fam-guest').count() == 1, 'C1 remove one guest')
    pg.click('[data-act="fam-clear"]'); pg.wait_for_selector('.modal'); pg.locator('.modal .btn-primary').click(); pg.wait_for_timeout(200)
    check(pg.locator('.fam-guest').count() == 0 and len(pg.evaluate(GUESTS)) == 0, 'C1 clear all guests')

    # C2 - PIN gate
    pg.goto(BASE + '#/home'); pg.wait_for_timeout(200); pg.reload(); pg.goto(BASE + '#/parent'); pg.wait_for_timeout(600)
    check(pg.locator('.pin input').count() == 4 and pg.locator('[data-sec="family"]').count() == 0, 'C2 without PIN: pad only, no family section')

    # M4 - celebration once per week
    pg.evaluate(SET_DAILY, {i: {str(TODAY): {'xp': 300, 'minutes': 20, 'answers': 110, 'correct': 105, 'recovered': 3, 'activities': []}} for i in ('selim', 'karma', 'kenda')}); pg.reload(); pg.wait_for_timeout(400)
    f3 = board(pg); pg.wait_for_timeout(900); ch = pg.evaluate('window.__familyCheer || null')
    check(f3['quest']['done'] and f3['celebrate'] is True and pg.get_attribute('.fam-quest', 'data-quest-done') == '1', 'M4 quest reached -> celebrate flag + done card')
    check(bool(ch) and len(ch['cast']) >= 2, f"M4 companions cast cheers {ch and ch['cast']}")
    f4 = board(pg); ch2 = pg.evaluate('window.__familyCheer || null')
    check(f4['celebrate'] is False and ch2['at'] == ch['at'] and f4['celebratedWeek'] == f4['weekStart'], 'M4 second visit: no second celebration this week')

    # hygiene
    check(not errs, f'hygiene 0 page errors {errs[:2]}')
    check(not bad, f'hygiene 0 failed requests {bad[:2]}')
    b.close()

fl = subprocess.run([sys.executable, os.path.join(ROOT, 'tools/check_family_links.py')], capture_output=True, text=True)
check(fl.returncode == 0, 'hygiene family links intact')
new_files = ['app/js/engines/family_core.js', 'app/js/engines/family.js', 'app/js/ui/views/family.js', 'app/js/ui/views/parentFamily.js', 'app/tests/phase19_family.py']
EMO = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF\U0001F000-\U0001F2FF]')
check(all(not EMO.search(open(os.path.join(ROOT, f), encoding='utf-8').read()) for f in new_files), 'hygiene zero emoji in Phase 19 files')

print(f"\n{\"PASS\" if not fails else \"FAIL\"} phase19_family: {len(fails)} failure(s)")
sys.exit(1 if fails else 0)
