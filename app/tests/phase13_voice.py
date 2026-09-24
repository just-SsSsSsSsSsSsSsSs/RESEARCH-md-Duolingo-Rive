"""Phase 13 - recorded Egyptian clips as the first voice provider (owner-approved chain, gist 5e7813f5).

Field evidence: after Phase 12.2 the karaoke paced correctly on the owner's Android phone but no sound came out
(no Arabic OS voice pack). The explain sheet now speaks through pre-recorded clips on ONE <audio> element.

Checks (Pixel 5 emulation, speechSynthesis replaced by a mock with ZERO voices that never speaks):
  1. coverage: every explanation text of every real math question (generate() over all activity specs) is fully
     covered by the manifest -> clips.canSpeak() == true for all of them (no silent gap left);
  2. zero browser voices: provider == 'clips', <audio> really plays (currentTime advances), mp3 served 200;
  3. karaoke follows the audio: words advance in order while currentTime grows, never flash to the end;
  4. fast switching ("لسه مش فاهم" x5 quickly, then close): only ONE source plays, stop() leaves nothing playing;
  5. a missing clip in the manifest -> that text falls back to speech.js (provider == 'speech'), no page error;
  6. <audio>.play() refused (autoplay policy) -> hands over to speech.js from the reached word, no flash-through;
  7. segments(): number/fragment split round-trips the displayed words (word ownership covers every word once).
"""
import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090/app/index.html'
fails = []
def check(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

NO_VOICES = '''(() => {
  const mk = { speaking: false, pending: false, paused: false, getVoices() { return []; }, onvoiceschanged: null,
    cancel() {}, pause() {}, resume() {}, speak(u) { if (u.text) window.__ttsCalls = (window.__ttsCalls || 0) + 1; /* '' = 12.2 warm-up utterance, not speech */ setTimeout(() => u.onerror && u.onerror({ error: 'synthesis-failed' }), 5); } };
  Object.defineProperty(window, 'speechSynthesis', { value: mk, configurable: true, writable: true });
})();'''

def start(pg):
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    pg.wait_for_function('window.__clips && window.__clips.loaded()', timeout=8000)

AUDIO_STATE = '''() => { const a = window.__clipsEl; return a ? { t: a.currentTime, paused: a.paused, src: a.src.split('/').slice(-2).join('/') } : null; }'''
KW = '''() => { const r = document.querySelector('.explain-sheet .k-text'); if (!r) return null; const all = [...r.querySelectorAll('.kw')];
  const now = r.querySelector('.kw.now'); return { n: all.length, now: now ? all.indexOf(now) : -1, said: r.querySelectorAll('.kw.said').length }; }'''

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    dev = p.devices['Pixel 5']

    # ---------- 1) coverage over the real question space ----------
    pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    start(pg)
    cov = pg.evaluate('''async () => {
      const { generate } = await import('./js/activities/generators.js'); const { plan } = await import('./js/engines/explain.js');
      const acts = ['mult_3', 'mult_4', 'mult_mix', 'distributive', 'commutative']; let texts = 0; const miss = new Set();
      for (const id of acts) { const spec = await (await fetch('content/activities/' + id + '.json')).json();
        for (const lvl of [undefined, 'easy', 'hard']) for (let r = 0; r < 40; r++) for (const q of generate(spec.generator, { settings: { difficulty: lvl } })) {
          if (!q.meta) continue; for (let seed = 0; seed < 6; seed++) { const P = plan(q, seed);
            for (const sid of P.strategies) { const S = P.get(sid); for (const t of [(S.lines || []).join(' '), ...(S.steps || []).map((x) => x.say)]) { if (!t || !t.trim()) continue; texts++; if (!window.__clips.canSpeak(t)) miss.add(t); } } } } }
      return { texts, miss: [...miss].slice(0, 5), missing: miss.size }; }''')
    print('coverage:', cov['texts'], 'texts, missing', cov['missing'], cov['miss'][:2])
    check(cov['texts'] > 2000 and cov['missing'] == 0, f"every explanation text of the real question space has clips ({cov['texts']} texts, {cov['missing']} uncovered)")
    # 7) segmentation owns every displayed word exactly once
    seg = pg.evaluate('''async () => { const m = await import('./js/engines/voice/segments.js');
      const t = 'السؤال بيقول: ٣ في ٨ يساوي كام؟ يعني (٣ × ٥) + (٣ × ٣) = ٢٤!'; const s = m.segment(t); const { per, count } = m.wordsBySegment(t, s);
      const flat = per.flat(); return { keys: s.map((x) => x.k), count, flat, uniq: new Set(flat).size }; }''')
    print('segments:', seg['keys'])
    check(seg['flat'] == sorted(seg['flat']) and seg['uniq'] == seg['count'] == len(seg['flat']), f"wordsBySegment covers every word once, in order ({seg['count']} words)")
    check('n:24' in seg['keys'] and 'n:3' in seg['keys'] and any(k.startswith('f:') for k in seg['keys']), 'Arabic-Indic numbers become number clips')
    check(not errs, f'no page errors (1) {errs}')
    pg.close()

    # ---------- 2+3) zero browser voices: clips play and drive the karaoke ----------
    ctx = b.new_context(**dev); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); st = []
    pg.on('response', lambda r: st.append(r.status) if '/audio/explain/' in r.url and '.mp3' in r.url else None)
    pg.add_init_script(NO_VOICES); pg.add_init_script('''(() => { const O = window.Audio; window.Audio = function (...a) { const el = new O(...a); window.__clipsEl = el; return el; }; window.Audio.prototype = O.prototype; })();''')
    start(pg)
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text')
    samples = []
    for _ in range(7): pg.wait_for_timeout(450); samples.append((pg.evaluate(AUDIO_STATE), pg.evaluate(KW)))
    print('samples (audio t, now, said):', [(round(a['t'], 2) if a else None, k['now'], k['said']) for a, k in samples])
    check(pg.evaluate('window.__voice.last') == 'clips', 'zero browser voices -> provider is clips')
    check(pg.evaluate('window.__ttsCalls || 0') == 0, 'speech.js was not used for a fully covered text')
    check(st and all(x in (200, 206) for x in st), f'clip mp3 served ({len(st)} responses, statuses {sorted(set(st))})')
    nows = [k['now'] for _, k in samples]; saids = [k['said'] for _, k in samples]
    check(nows == sorted(nows) and nows[-1] > nows[0] >= 0, f'karaoke advances in order with the audio {nows}')
    check(max(saids) < samples[0][1]['n'], 'no flash-through: text not fully said after ~3s')
    check(any(a and not a['paused'] for a, _ in samples), '<audio> element actually playing')
    check(not errs, f'no page errors (2) {errs}')

    # ---------- 4) fast switching: one source, clean stop ----------
    for _ in range(5): pg.click('.explain-sheet [data-act="another"]'); pg.wait_for_timeout(90)
    pg.wait_for_timeout(600)
    audios = pg.evaluate('''() => [...document.querySelectorAll('audio')].filter((a) => !a.paused).length''')
    check(pg.evaluate('window.__clips.playing') and audios == 0, 'after 5 fast strategy switches exactly one engine run is active (shared element, no DOM audio leak)')
    pg.click('.explain-sheet [data-act="close"]'); pg.wait_for_timeout(400)
    a = pg.evaluate(AUDIO_STATE)
    check(not pg.evaluate('window.__clips.playing') and (a is None or a['paused']), 'closing the sheet stops the clip audio')
    check(not errs, f'no page errors (4) {errs}')
    ctx.close()

    # ---------- 5) missing clip -> speech.js fallback ----------
    ctx = b.new_context(**dev); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(NO_VOICES)
    pg.route('**/audio/explain/manifest.json*', lambda route: (lambda r: route.fulfill(response=r, body=json.dumps({**json.loads(r.text()), 'clips': {k: v for k, v in json.loads(r.text())['clips'].items() if k != 'f:السؤال بيقول:'}}, ensure_ascii=False)))(route.fetch()))
    start(pg)
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text'); pg.wait_for_timeout(1500)
    txt = pg.evaluate('window.__explain.text()'); last = pg.evaluate('window.__voice.last')
    # expectation = the provider's real rule (every segment has a clip in the route-modified manifest), not a substring
    # guess: some texts own a full-sentence clip that STARTS with 'السؤال بيقول:' (e.g. the grid question) -> still clips
    expect = 'clips' if pg.evaluate('(t) => window.__clips.canSpeak(t)', txt) else 'speech'
    check(last == expect, f'text missing a clip -> {expect} (got {last}); text starts: {txt[:30]}')
    covered = pg.evaluate("() => window.__clips.canSpeak('السؤال بيقول: خد نفس')")
    check(not covered, 'the removed clip really makes an uncovered text fall back (canSpeak false)')
    # the fallback path is always exercised, whatever question came up: speak an uncovered text through the provider
    fb = pg.evaluate("() => { window.__voice.speak('السؤال بيقول: خد نفس.', { noLog: true }); const l = window.__voice.last; window.__voice.stop(); return l; }")
    check(fb == 'speech', f'provider falls back to speech.js for an uncovered text (got {fb})')
    k = pg.evaluate(KW)
    check(k and k['said'] < k['n'], 'fallback still paces the karaoke (no flash)')
    check(not errs, f'no page errors (5) {errs}')
    ctx.close()

    # ---------- 6) play() refused -> speech.js from the reached word ----------
    ctx = b.new_context(**dev); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(NO_VOICES)
    pg.add_init_script('''(() => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('blocked', 'NotAllowedError')); }; })();''')
    start(pg)
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text'); pg.wait_for_timeout(1500)
    k = pg.evaluate(KW)
    print('refused play -> last', pg.evaluate('window.__voice.last'), 'kw', k)
    check(pg.evaluate('window.__voice.last') == 'speech', '<audio>.play() refused -> hand over to speech.js')
    check(k and 0 <= k['said'] < k['n'], 'no flash-through after refusal (visual pacing continues)')
    check(not errs, f'no page errors (6) {errs}')
    ctx.close()
    b.close()

if fails: print('FAIL', fails); sys.exit(1)
print('PASS phase13_voice')
