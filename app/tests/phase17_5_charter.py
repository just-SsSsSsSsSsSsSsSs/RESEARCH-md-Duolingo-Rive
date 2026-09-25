"""Phase 17.5 - family charter (v7.21).

  1  source: app/content/family.json parses, has >= 2 gist links, every link is https, mirrors >= 5, no secrets.
  2  guard: tools/check_family_links.py exits 0 on the repo; exits 1 when a mirror loses a link (proved on a temp copy).
  3  repo copies: FAMILY_CHARTER.md contains the owner's verbatim transcript marker + every link;
     CHANGELOG_DECISIONS.md, docs/PHASES_HISTORY.md, README.md, RESUME.md each contain every link.
  4  site: #/charter renders one card per link (href = url, opens in a new tab), the live mirror check reports
     all mirrors intact (window.__charter.ok == total), principles and roadmap rendered, reachable from the profile.
  5  hygiene: 0 page errors, 0 failed requests, charter page text has no emoji, protected files equal git HEAD.
"""
import sys, re, json, subprocess, tempfile, shutil, hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://localhost:8090/app/index.html'
fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

EMOJI = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF\U0001F000-\U0001F2FF]')
SECRET = re.compile(r'(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9\-]{20,})')

# ---- 1 source
fam = json.loads((ROOT / 'app/content/family.json').read_text(encoding='utf-8'))
urls = [l['url'] for l in fam['links']]
check(sum(1 for l in fam['links'] if l['kind'] == 'gist') >= 2, f'1 family.json has >= 2 gist links ({len(urls)} links)')
check(all(u.startswith('https://') for u in urls), '1 every link is https')
check(len(fam['mirrors']) >= 5 and len(fam['principles']) >= 6 and len(fam['roadmap']) >= 3, f'1 mirrors={len(fam["mirrors"])} principles={len(fam["principles"])} roadmap={len(fam["roadmap"])}')
check(not SECRET.search(json.dumps(fam)), '1 no secret in family.json')

# ---- 2 guard
r = subprocess.run([sys.executable, str(ROOT / 'tools/check_family_links.py'), '--quiet'], capture_output=True, text=True)
check(r.returncode == 0 and 'PASS' in r.stdout, f'2 check_family_links.py PASS on the repo (rc={r.returncode})')
tmp = Path(tempfile.mkdtemp())
try:
    for rel in fam['mirrors'] + ['tools/check_family_links.py']:
        dst = tmp / rel; dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy(ROOT / rel, dst)
    p = tmp / 'README.md'; p.write_text(p.read_text(encoding='utf-8').replace(urls[0], 'https://example.invalid/gone'), encoding='utf-8')
    r2 = subprocess.run([sys.executable, str(tmp / 'tools/check_family_links.py'), '--quiet'], capture_output=True, text=True)
    check(r2.returncode == 1 and 'README.md: lost 1 link' in r2.stdout, '2 guard fails (rc=1) when a mirror loses a link')
finally:
    shutil.rmtree(tmp, ignore_errors=True)

# ---- 3 repo copies
charter = (ROOT / 'FAMILY_CHARTER.md').read_text(encoding='utf-8')
check('التسجيل الأول' in charter and 'تعالى نلعب' in charter, '3 FAMILY_CHARTER.md holds the verbatim transcript')
for rel in fam['mirrors']:
    txt = (ROOT / rel).read_text(encoding='utf-8')
    check(all(u in txt for u in urls) and not SECRET.search(txt), f'3 {rel}: all {len(urls)} links, no secrets')
check(not EMOJI.search((ROOT / 'app/js/ui/views/charter.js').read_text(encoding='utf-8')) and not EMOJI.search(json.dumps(fam, ensure_ascii=False)), '3 Zero-Emoji: charter.js + family.json')

# ---- 4 site
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    errs, bad = [], []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.goto(BASE); pg.wait_for_timeout(300); pg.evaluate('localStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').nth(0).click(); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('[data-act="charter"]')
    check(pg.locator('[data-act="charter"]').get_attribute('href') == '#/charter', '4 profile has the charter entry')
    pg.click('[data-act="charter"]'); pg.wait_for_selector('[data-charter-links] .charter-link'); pg.wait_for_timeout(1500)
    hrefs = pg.evaluate("[...document.querySelectorAll('[data-charter-links] a.charter-url')].map(a => [a.href, a.target, a.rel])")
    check([h[0] for h in hrefs] == urls, f'4 one link card per family link, hrefs equal family.json ({len(hrefs)})')
    check(all(h[1] == '_blank' and 'noopener' in h[2] for h in hrefs), '4 links open in a new tab with noopener')
    st = pg.evaluate('window.__charter')
    check(st and st['ok'] == st['total'] == len(fam['mirrors']), f'4 live mirror check: {st and st["ok"]}/{st and st["total"]} intact')
    check(pg.locator('[data-charter-mirrors] .tag[data-state="ok"]').count() == len(fam['mirrors']), '4 every mirror row shows the ok tag')
    check(pg.locator('[data-charter-principles] .charter-principle').count() == len(fam['principles']), '4 principles rendered')
    check(pg.locator('[data-charter-roadmap] .charter-phase').count() == len(fam['roadmap']), '4 roadmap rendered')
    check(pg.locator('.charter-phase .tag-gold').count() == 1, '4 exactly one phase is marked current')
    txt = pg.evaluate('document.body.innerText')
    check(not EMOJI.search(txt), '5 charter page text has no emoji')
    check(not errs, f'5 0 page errors {errs[:2]}')
    check(not bad, f'5 0 failed requests {bad[:2]}')
    b.close()

# ---- 5 protected files untouched vs HEAD
for f in ['plant.html', 'math.html', 'albayyinah.html', 'quran-alqadr/index.html']:
    head = subprocess.run(['git', 'show', 'HEAD:' + f], cwd=ROOT, capture_output=True).stdout
    check(hashlib.sha256(head).hexdigest() == hashlib.sha256((ROOT / f).read_bytes()).hexdigest(), f'5 protected {f} == HEAD')

print('\nRESULT:', 'PASS' if not fails else f'FAIL ({len(fails)})'); sys.exit(1 if fails else 0)
