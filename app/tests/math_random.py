"""
Phase 9 - Dynamic procedural generation E2E for math activities.

Checks (headless Chromium):
  1. Every math activity JSON is generator-only (no static `questions`).
  2. Two consecutive sessions of the same activity produce different question sets/orders.
  3. Every solving style renders and can be solved via the UI: numpad, quiz, grid(numpad|quiz), pick.
  4. A full play-through reaches the results screen with 100% (solver uses the read-only window.__play hook).
  5. Zero console errors / page errors.

Usage: python3 app/tests/math_random.py [base_url]
"""
import json, sys, os, re, hashlib
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090/app/index.html'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROTECTED = {'plant.html': 'fb197ed22c2fca54', 'albayyinah.html': 'aac6bafbec577baa', 'math.html': '694859aac12c7222', 'quran-alqadr/index.html': '52758e3f208999c8'}
AR2EN = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']


def go(page, hash_, sel):
    page.goto(f'{BASE}#{hash_}', wait_until='domcontentloaded')
    page.wait_for_selector(sel, timeout=15000)


def type_numpad(page, ans):
    for ch in str(ans):
        page.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
    page.locator('.numpad .btn').nth(11).click()


def solve_current(page, seen):
    """Solve the currently shown question correctly using window.__play.q. Returns the style used."""
    q = page.evaluate('window.__play.q')
    t = q['type']
    if t == 'grid':
        style = 'grid-' + q.get('mode', 'numpad')
        assert page.locator('.dot-grid .dot').count() == q['rows'] * q['cols'], 'grid dots mismatch'
    else:
        style = t
    seen.add(style)
    if t == 'branch':
        # Phase 12 tree: fill part2 -> prod1 -> prod2 -> sum through the shared numpad (auto-advances)
        a, b_, s1, s2 = q['a'], q['b'], q['s1'], q['s2']
        for v in (s2, a * s1, a * s2, a * b_): type_numpad(page, v)
    elif t == 'truefalse':
        page.locator('.choices .choice').nth(0 if q['answer'] else 1).click()
    elif t == 'pick':
        for i in q['correct']:
            page.locator('.pick-grid .choice').nth(i).click()
        page.locator('.q-card .btn-primary').click()
    elif t == 'grid' and q.get('mode') == 'quiz' or (t != 'grid' and page.locator('.numpad').count() == 0 and q.get('choices')):
        # quiz: click the choice whose text matches the correct answer
        want_en = str(q['choices'][q['answer']]).translate(AR2EN)
        found = False
        for c in page.locator('.choices .choice').all():
            if c.inner_text().strip().translate(AR2EN) == want_en:
                c.click(); found = True; break
        assert found, f'choice {want!r} not found for {q}'
    else:
        assert page.locator('.numpad').count(), f'numpad expected for {q}'
        type_numpad(page, str(q['answer']).translate(AR2EN))
    return style


def play_through(page, act_id, seen):
    go(page, '/subject/math', '.topbar'); page.wait_for_timeout(150)  # leave results view first (same-hash goto is a no-op)
    go(page, f'/play/{act_id}', '[data-act="start"]')
    page.click('[data-act="start"]')
    page.wait_for_selector('.q-card', timeout=8000)
    keys = page.evaluate('window.__play.keys')
    for _ in range(60):
        if page.locator('[data-act="again"]').count(): break
        page.wait_for_selector('.q-card .q-text, .q-card .dot-grid, .q-card .branch', timeout=8000)
        solve_current(page, seen)
        page.wait_for_selector('.feedback [data-act="next"]', timeout=8000)
        page.click('.feedback [data-act="next"]')
        page.wait_for_timeout(120)
    assert page.locator('[data-act="again"]').count(), f'{act_id}: results not reached'
    return keys


def main():
    cat = json.load(open(os.path.join(ROOT, 'app/content/catalog.json'), encoding='utf-8'))
    math_items = [i for i in cat['items'] if i['subject'] == 'math' and not i.get('external')]
    assert math_items, 'no math items'
    # 1) generator-only
    for it in math_items:
        a = json.load(open(os.path.join(ROOT, 'app/content', it['src']), encoding='utf-8'))
        assert not a.get('questions'), f"{it['id']} still has static questions"
        assert a.get('generator'), f"{it['id']} has no generators"
    print(f'✔ {len(math_items)} math activities are generator-only (no static questions)')

    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={'width': 412, 'height': 915})
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        go(page, '/profile', '.heroes .hero-card')
        page.locator('.hero-card').first.click(); page.wait_for_timeout(300)
        seen = set()
        # 2) randomness: mult_mix twice
        k1 = play_through(page, 'mult_mix', seen)
        k2 = play_through(page, 'mult_mix', seen)
        assert len(k1) >= 8 and len(k1) == len(set(k1)), f'duplicate keys within a session: {k1}'
        assert k1 != k2, 'two sessions produced identical question sets/order'
        diff = len(set(k1) ^ set(k2))
        print(f'✔ mult_mix random across sessions: {len(k1)} q each, symmetric diff={diff}')
        # 3/4) every other math activity once, collecting styles
        for it in math_items:
            if it['id'] == 'mult_mix': continue
            play_through(page, it['id'], seen)
        need = {'numpad', 'quiz', 'pick', 'grid-numpad', 'grid-quiz', 'truefalse'}
        # generators may or may not have produced every style in this run - retry a few plays until all seen
        tries = 0
        while not need <= seen and tries < 4:
            play_through(page, 'mult_mix', seen); play_through(page, 'mult_3', seen); tries += 1
        missing = need - seen
        assert not missing, f'solving styles never rendered: {missing}'
        print(f'✔ styles rendered + solved: {sorted(seen)}')
        best = page.evaluate("JSON.parse(localStorage.getItem('abtal:v1:profile:selim')).activities.mult_mix.best")
        assert best == 100, f'best should be 100, got {best}'
        print('✔ 100% play-through, best=100')
        b.close()
    assert not errors, errors
    print('✔ zero console/page errors')
    for f, pre in PROTECTED.items():
        h = hashlib.sha256(open(os.path.join(ROOT, f), 'rb').read()).hexdigest()
        assert h.startswith(pre), f'PROTECTED FILE CHANGED: {f} {h[:16]}'
    print('✔ protected originals untouched')
    print('MATH RANDOM: PASS')


if __name__ == '__main__':
    main()
