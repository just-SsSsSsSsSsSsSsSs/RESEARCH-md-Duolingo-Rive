"""Phase 15.1 - the math question is read aloud from the recorded Egyptian clips (gist c5203c99).

  1  coverage: ~3,000 questions from the REAL generators of the 5 math activities -> every one has a spoken sentence,
     every segment of it has a recorded clip (0 missing, 0 empty) and the answer is never spoken.
  2  on start (Pixel 5, zero OS voices): the first question is spoken through the clips <audio> (mp3 200/206), the
     spoken numbers are the numbers on screen, no OS voice speaks, the line is in the parent spoken-words log.
  3  replay button: visible, never over the question text, speaks again on tap.
  4  K3 kept: after a first miss the answer buttons are locked but replay still works; the retry re-render does not
     repeat the question unasked.
  5  a running cheer (verse/hadith) is never cut: the question waits for it (longest cheer forced, deterministic).
  6  parent switch off -> no automatic reading; the replay button still speaks on demand.
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

# ---------- 1) coverage over the real generators (Node, the same modules the browser runs) ----------
NODE = r'''
globalThis.window = undefined;
const R = process.argv[1];
const { generate } = await import(R + '/app/js/activities/generators.js');
const { segment } = await import(R + '/app/js/engines/voice/segments.js');
const fs = await import('fs');
const m = JSON.parse(fs.readFileSync(R + '/app/content/audio/explain/manifest.json')).clips;
const src = fs.readFileSync(R + '/app/js/engines/voice/questionVoice.js', 'utf8');
const body = src.slice(src.indexOf('const AR ='), src.indexOf('const settings'));
const sentence = new Function(body.replace('export function sentence', 'function sentence') + '; return sentence;')();
const nums = (t) => (t.match(/[\u0660-\u0669]+/g) || []).map((d) => [...d].reduce((x, c) => x * 10 + c.charCodeAt(0) - 0x660, 0));
let n = 0, empty = 0, leak = 0; const missing = new Set(), kinds = new Set();
for (const f of ['mult_3', 'mult_4', 'mult_mix', 'commutative', 'distributive']) {
  const a = JSON.parse(fs.readFileSync(`${R}/app/content/activities/${f}.json`));
  for (let r = 0; r < 20; r++) for (const lvl of [undefined, 'easy', 'hard']) for (const q of generate(a.generator, { settings: { difficulty: lvl } })) {
    n++; kinds.add(q.meta.kind + '/' + q.type); const t = sentence(q);
    if (!t) { empty++; continue; }
    for (const s of segment(t)) if (!m[s.k]) missing.add(s.k);
    // answer never spoken (product-type questions: the product must not appear unless it is also an operand)
    const prod = ['mult', 'grid', 'distributive_sum'].includes(q.meta.kind) || q.type === 'branch' ? q.meta.a * q.meta.b : null;
    if (prod !== null && ![q.meta.a, q.meta.b, q.meta.s1, q.meta.s2].includes(prod) && nums(t).includes(prod)) leak++;
    if (q.meta.kind === 'missing' && nums(t).includes(q.meta.b) && q.meta.b !== q.meta.a) leak++;
  }
}
console.log(JSON.stringify({ n, empty, missing: [...missing], leak, kinds: [...kinds] }));
'''
out = subprocess.run(['node', '--input-type=module', '-e', NODE, ROOT], capture_output=True, text=True, timeout=120)
try: cov = json.loads(out.stdout.strip().splitlines()[-1])
except Exception: cov = {'n': 0, 'err': out.stderr[-400:]}
print('coverage', {k: v for k, v in cov.items() if k != 'kinds'})
check(cov['n'] >= 2000 and cov.get('empty') == 0, f"every generated question has a spoken sentence ({cov['n']} questions)")
check(cov.get('missing') == [], f"every segment has a recorded clip (missing: {cov.get('missing')})")
check(cov.get('leak') == 0, 'the answer is never spoken in the question')
check(len(cov.get('kinds', [])) >= 10, f"all 10 math question kinds covered ({cov.get('kinds')})")

NO_VOICES = "(()=>{ if (window.speechSynthesis) { speechSynthesis.getVoices = () => []; const o = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { if (u && u.text) window.__ttsCalls = (window.__ttsCalls || 0) + 1; return o(u); }; } })()"
AUD = "(()=>{ const O = window.Audio; window.__auds = []; window.Audio = function (...a) { const e = new O(...a); window.__auds.push(e); return e; }; window.Audio.prototype = O.prototype; })()"
PLAYING = "window.__auds.some(a => !a.paused && !a.ended && a.src.includes('/audio/explain/'))"
NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']

def hero(pg, idx):
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card, [data-act="switch"]')
    if pg.locator('.heroes .hero-card').count() == 0: pg.click('[data-act="switch"]'); pg.wait_for_selector('.heroes .hero-card')
    pg.locator('.hero-card').nth(idx).click(); pg.wait_for_timeout(300)

def start(pg, act='mult_3'):
    pg.goto(BASE + '#/home'); pg.wait_for_timeout(100)
    pg.goto(BASE + '#/play/' + act); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')

def nums(t): return [int(x) for x in re.findall(r'\d+', t.translate(AR2EN))]

def wrong_answer(pg, q):
    """same solver shape as phase11_mistake.click_choice(correct=False)"""
    t = q['type']
    if t == 'truefalse': pg.locator('.choices .choice').nth(1 if q['answer'] else 0).click(); return True
    if t == 'pick':
        n = pg.locator('.pick-grid .choice').count(); i = [k for k in range(n) if k not in q['correct']][0]
        pg.locator('.pick-grid .choice').nth(i).click(); pg.locator('.q-card .btn-primary').click(); return True
    if (t == 'grid' and q.get('mode') == 'quiz') or (t != 'grid' and pg.locator('.numpad').count() == 0 and q.get('choices')):
        want = str(q['choices'][q['answer']]).translate(AR2EN)
        for c in pg.locator('.choices .choice').all():
            if c.inner_text().strip().translate(AR2EN) != want: c.click(); return True
        return False
    for ch in str(int(str(q['answer']).translate(AR2EN)) + 1): pg.locator('.numpad .btn').nth(NUMPAD.index(ch)).click()
    pg.locator('.numpad .btn').nth(11).click(); return True

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(**p.devices['Pixel 5']); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); st = []
    pg.on('response', lambda r: st.append(r.status) if '/audio/explain/' in r.url and '.mp3' in r.url else None)
    pg.add_init_script(NO_VOICES); pg.add_init_script(AUD)

    # ---------- 2) spoken on start ----------
    hero(pg, 1); pg.evaluate('window.__voiceLog && window.__voiceLog.clear()')
    start(pg)
    pg.wait_for_function('window.__lastQuestionVoice && window.__lastQuestionVoice.played', timeout=8000)
    lq = pg.evaluate('window.__lastQuestionVoice'); q = pg.evaluate('window.__play.q')
    shown = pg.locator('.q-text, .branch-root').first.inner_text()
    print('spoken:', lq['text'], '| on screen:', shown)
    check(lq['text'] == pg.evaluate('(q) => window.__questionVoice.sentence(q)', q), 'the spoken sentence is the one built for THIS question')
    check(nums(lq['text']) and all(n in nums(shown) for n in nums(lq['text'])), f"spoken numbers {nums(lq['text'])} are on screen {nums(shown)}")
    pg.wait_for_timeout(500)
    check(pg.evaluate(PLAYING), 'clips <audio> is playing the question')
    check(st and all(x in (200, 206) for x in st), f'clip mp3 served ({len(st)} responses)')
    check(pg.evaluate('window.__ttsCalls || 0') == 0, 'no OS voice speaks the question (muted empty warm-up utterance not counted)')
    check(any(e['kind'] == 'question' and e['text'] == lq['text'] for e in pg.evaluate('window.__voiceLog.list()')), 'the question is written in the parent spoken-words log')

    # ---------- 3) replay button ----------
    hear = pg.locator('.q-card .q-hear')
    check(hear.count() == 1 and hear.is_visible(), 'replay button visible on the question card')
    ov = pg.evaluate("(()=>{const a=document.querySelector('.q-hear').getBoundingClientRect(),b=document.querySelector('.q-text,.branch-root').getBoundingClientRect();return !(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)})()")
    check(not ov, 'replay button is never over the question text')
    pg.wait_for_function('!(' + PLAYING + ')', timeout=10000)
    t0 = lq['at']; hear.click(); pg.wait_for_timeout(500)
    check(pg.evaluate('window.__lastQuestionVoice.at') > t0 and pg.evaluate(PLAYING), 'tap on replay speaks the question again')

    # ---------- 4) K3 kept after a miss ----------
    q = pg.evaluate('window.__play.q'); check(wrong_answer(pg, q), f"wrong answer entered ({q['type']})")
    pg.wait_for_selector('.feedback[data-retry]', timeout=5000)
    check(pg.evaluate("document.querySelectorAll('.q-card button:not(.explain-btn):not(.q-hear):not([disabled])').length") == 0, 'after a first miss the answer buttons are locked (K3 unchanged)')
    check(pg.locator('.q-card .q-hear').is_enabled(), 'replay button still usable after a miss')
    at1 = pg.evaluate('window.__lastQuestionVoice.at')
    pg.click('.feedback[data-retry] [data-act="retry"]'); pg.wait_for_timeout(700)
    check(pg.evaluate('window.__play.retry') is True and pg.evaluate('window.__lastQuestionVoice.at') == at1, 'the retry re-render does not repeat the question unasked')

    # ---------- 5) a running cheer is never cut (deterministic: the per-hero bag has no repeats, so the longest
    #               line c08 comes within one bag; it is started, then the question is requested while it plays)
    pg.evaluate('window.__questionVoice.stop(); window.__clips.stop()')
    ms = pg.evaluate("""async () => { const c = window.__cheers; await c.ready();
      const m = await (await fetch('content/audio/cheers/shab_masri/manifest.json')).json();
      for (let i = 0; i < 12; i++) { c.stop(); const l = await c.say('correct'); if (l.id === 'c08') { window.__cheerAt = Date.now(); return m.lines.c08.ms; } }
      return 0; }""")
    pg.evaluate('window.__lqBefore = window.__lastQuestionVoice.at; void window.__questionVoice.say(window.__play.q)')  # void: evaluate must not await the pending say()
    pg.wait_for_timeout(800)
    busy, same = pg.evaluate('window.__cheers.playing()'), pg.evaluate('window.__lastQuestionVoice.at === window.__lqBefore')
    check(ms > 4000 and busy and same, f'the question waits while the cheer is speaking (cheer c08 {ms}ms, busy={busy}, not yet spoken={same})')
    pg.wait_for_function('window.__lastQuestionVoice.at > window.__lqBefore', timeout=12000)
    waited = pg.evaluate('window.__lastQuestionVoice.at - window.__cheerAt')
    check(waited >= ms - 400, f'the question starts only after the cheer ({waited}ms after start of a {ms}ms line)')

    # ---------- 6) parent switch off ----------
    pg.goto(BASE + '#/parent'); pg.wait_for_selector('.pin input')
    for i, ch in enumerate('1234'): pg.locator('.pin input').nth(i).fill(ch)
    pg.wait_for_selector('[data-readq-switch]', timeout=8000)
    pg.locator('button', has_text='كارما').first.click(); pg.wait_for_selector('[data-readq-switch]')
    check(pg.locator('[data-readq-switch]').get_attribute('aria-checked') == 'true', 'parent switch is on by default')
    pg.click('[data-readq-switch]'); pg.wait_for_timeout(200)
    check(pg.locator('[data-readq-switch]').get_attribute('aria-checked') == 'false', 'parent switch turns off')
    pg.evaluate('window.__lastQuestionVoice = null')
    start(pg); pg.wait_for_timeout(1500)
    lq = pg.evaluate('window.__lastQuestionVoice')
    check(lq and lq['played'] is False and lq['reason'] == 'off' and not pg.evaluate(PLAYING), 'switch off -> no automatic reading')
    pg.locator('.q-card .q-hear').click(); pg.wait_for_timeout(600)
    check(pg.evaluate('window.__lastQuestionVoice.played') is True and pg.evaluate(PLAYING), 'switch off -> the replay button still speaks on demand')
    ctx.close(); b.close()
print('pageerrors:', errs)
if fails or errs: print('FAIL', fails); sys.exit(1)
print('PASS phase15_1_question_voice')
