"""Phase 11 / K4 - voice: Egyptian phonetic layer, quality-ranked voice choice, sentence utterances (Chromium).

Headless Chromium ships no TTS voices, so:
  1. phonetic()/numWords()/sentences() are checked as pure functions in the page context;
  2. speech.rank() is checked against fake voice objects modelled on real names
     (readium/speech ar.json: Edge "Microsoft Salma Online (Natural)", Windows "Microsoft Hoda", Android, Apple);
  3. the karaoke fallback still highlights words when no voice exists (regression of Phase 10 behaviour);
  4. speak() splits into one utterance per sentence (spy on SpeechSynthesisUtterance) with phonetic text.
"""
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8090/app/index.html'
fails = []
def check(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 412, 'height': 915})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/'); pg.wait_for_selector('#app *'); pg.wait_for_timeout(500)
    # 1) phonetic
    cases = [
        ['عندك كراتين كل واحد فيه ٣ بيضات.', 'عندك كراتين كل واحد فيه تلاتة بيضات.'],
        ['يعني ٣ في ٤ = ١٢ بالظبط!', 'يعني تلاتة في أربعة يساوي اتناشر بالظبط!'],
        ['هذا هو الجواب: ٢٤', 'ده هو الجواب: أربعة وعشرين'],
        ['عدّ بالنطّ ٣، ٦، ٩…', 'عدّ بالنطّ تلاتة، ستة، تسعة…'],
        ['الثلاثة معًا', 'الثلاثة معًا'],
        ['١٠٠ جنيه و ١٠٥', 'مية جنيه و مية وخمسة'],
        ['3 × 4 = 12', 'تلاتة في أربعة يساوي اتناشر'],
    ]
    res = pg.evaluate('''async (cases) => { const m = await import('./js/engines/speech.js');
      return { ph: cases.map(([i]) => m.phonetic(i)), nums: [0, 11, 20, 35, 200, 999].map(m.numWords), sents: m.sentences('أ. ب؟ ج! د… هـ').length }; }''', cases)
    for (i, o), r in zip(cases, res['ph']): check(r == o, f'phonetic: {i} -> {r}')
    check(res['nums'] == ['صفر', 'حداشر', 'عشرين', 'خمسة وتلاتين', 'ميتين', 'تسعمية وتسعة وتسعين'], f"numWords {res['nums']}")
    check(res['sents'] == 5, f"sentences split -> {res['sents']}")
    # 2) voice ranking with realistic fake voices
    order = pg.evaluate('''async () => { const m = await import('./js/engines/speech.js'); const S = m.speech;
      const fake = [
        { name: 'Microsoft Hoda - Arabic (Egypt)', lang: 'ar-EG', localService: true },
        { name: 'Microsoft Naayf - Arabic (Saudi)', lang: 'ar-SA', localService: true },
        { name: 'Microsoft Salma Online (Natural) - Arabic (Egypt)', lang: 'ar-EG', localService: false },
        { name: 'Microsoft Shakir Online (Natural) - Arabic (Egypt)', lang: 'ar-EG', localService: false },
        { name: 'Google US English', lang: 'en-US', localService: false },
        { name: 'Majed', lang: 'ar-001', localService: true },
        { name: 'Android Speech Recognition and Synthesis ar-xa-x-arz-network', lang: 'ar-XA', localService: false },
      ];
      const ranked = fake.map((v) => ({ n: (v.name.match(/Hoda|Naayf|Salma|Shakir|Google|Majed|Android/) || [v.name])[0], sc: S.rank(v, {}) })).sort((a, b) => b.sc - a.sc);
      const female = fake.map((v) => ({ n: v.name, sc: S.rank(v, { gender: 'female' }) })).sort((a, b) => b.sc - a.sc)[0].n;
      const male = fake.map((v) => ({ n: v.name, sc: S.rank(v, { gender: 'male' }) })).sort((a, b) => b.sc - a.sc)[0].n;
      return { ranked, female, male }; }''')
    names = [x['n'] for x in order['ranked']]
    print('ranking:', order['ranked'])
    check(names[0] in ('Salma', 'Shakir') and names[1] in ('Salma', 'Shakir'), 'Natural ar-EG voices ranked first')
    check(names.index('Hoda') > names.index('Android') and names.index('Hoda') > names.index('Majed'), 'Hoda ranked below Android/Apple voices')
    check(any(x['n'] == 'Google' and x['sc'] == -1 for x in order['ranked']), 'non-Arabic voice excluded (-1)')
    check('Salma' in order['female'] and 'Shakir' in order['male'], 'gender preference breaks the tie')
    # 3) karaoke fallback with no voices + 4) utterance spy
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    # Phase 13: the explain sheet now prefers recorded clips; this suite verifies the speech.js FALLBACK path
    # (texts without clips / <audio> refused), so route explicitly through it.
    pg.wait_for_function('window.__voice'); pg.evaluate("window.__voice.pref = 'speech'")
    pg.evaluate('''() => { window.__utt = []; const O = window.SpeechSynthesisUtterance; window.SpeechSynthesisUtterance = function (t) { const u = new O(t); window.__utt.push(t); return u; }; }''')
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text'); pg.wait_for_timeout(1800)
    shown = pg.evaluate('window.__explain.text()'); utts = pg.evaluate('window.__utt')
    first = pg.evaluate('(t) => import("./js/engines/speech.js").then((m) => m.phonetic(m.sentences(t)[0]))', shown)
    print('shown:', shown); print('utterances:', utts)
    # headless Chromium has no voices -> onend never fires, so only the FIRST sentence utterance is created
    # and the timed karaoke fallback takes over (Phase 10 behaviour). Verify that first utterance precisely.
    check(len(utts) >= 1 and utts[0] == first, 'first utterance == phonetic(first sentence) (sentence-level utterances)')
    check(all(not any(ch in u for ch in '٠١٢٣٤٥٦٧٨٩0123456789') for u in utts), 'spoken text has no digits (Egyptian number words)')
    disp = ' '.join(pg.locator('.explain-sheet .k-text').inner_text().split())
    check(disp == ' '.join(shown.split()) and any(ch in disp for ch in '٠١٢٣٤٥٦٧٨٩'), 'displayed text unchanged (keeps digits)')
    check(pg.locator('.kw.now, .kw.said').count() >= 1, 'karaoke fallback still highlights without any TTS voice')
    b.close()
print('pageerrors:', errs)
if fails or errs: print('FAIL', fails); sys.exit(1)
print('PASS phase11_voice')

# ---- parent panel voice picker (separate browser so the earlier asserts stay intact)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 412, 'height': 915})
    errs2 = []; pg.on('pageerror', lambda e: errs2.append(str(e)))
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/parent'); pg.wait_for_selector('.pin input')
    for i, ch in enumerate('1234'): pg.locator('.pin input').nth(i).fill(ch)
    pg.wait_for_selector('[data-explain-settings]', timeout=8000)
    ok_sel = pg.locator('[data-explain-settings] select[data-k="voice"]').count() == 1
    hint = pg.locator('[data-explain-settings] [data-voice-hint]').inner_text()
    print('voice hint:', hint)
    print(('ok   ' if ok_sel else 'FAIL ') + 'parent panel has a voice picker'); print(('ok   ' if hint.strip() else 'FAIL ') + 'voice hint explains availability')
    pg.click('[data-explain-settings] [data-act="test-voice"]'); pg.wait_for_timeout(300)
    b.close()
    if not ok_sel or not hint.strip() or errs2: print('FAIL parent voice picker', errs2); sys.exit(1)
print('PASS phase11_voice (parent picker)')
