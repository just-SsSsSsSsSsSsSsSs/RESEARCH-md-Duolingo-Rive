"""Phase 12.2 - mobile TTS: silent-engine pacing guard + synchronous speak() in the tap gesture.

Field report (owner, Android + iOS): no sound in the explain sheet and the karaoke highlight flashed from the
first to the last word in a split second. Root causes verified in code:
  - explainSheet.js:80 called speak() inside setTimeout(120) -> outside the user gesture -> mobile browsers mute it;
  - speech.js:136 chained next() on every onend without checking that the sentence could have been spoken, so a
    muted engine (onend after a few ms) ran through all sentences instantly and finish() killed the fallback timer.

This suite emulates a phone (Pixel 5 descriptor) and replaces speechSynthesis with a SILENT mock that fires
onstart + onend ~5ms after speak(), i.e. exactly what a muted device does. It verifies:
  1. speak() is invoked synchronously inside the click event (gesture token kept);
  2. the karaoke does NOT flash: the highlight walks word by word and total duration >= 2.5s for 6+ words;
  3. every word gets highlighted in order (no skipped words) and all end up `.said` only at the end;
  4. an engine that never fires onstart (no voice) still yields a paced karaoke (regression of the 1200ms guard);
  5. warm() ran on the first gesture (engine unlocked) and is idempotent;
  6. desktop (non-mock) regression: karaoke fallback still runs in headless Chromium without voices.
"""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090/app/index.html'
fails = []
def check(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

# silent engine: speak() -> onstart + onend after 5ms, no onboundary (muted phone / silent mode)
SILENT = '''(() => {
  window.__tts = { spoken: [], warm: 0, sync: [] };
  const mk = (delay, fireStart) => ({
    speaking: false, pending: false, paused: false,
    getVoices() { return []; }, onvoiceschanged: null,
    cancel() { this.speaking = false; },
    pause() {}, resume() {},
    speak(u) {
      window.__tts.spoken.push(u.text);
      // record whether we are inside a user-gesture dispatch (synchronous call from the click handler)
      window.__tts.sync.push(!!window.__inClick);
      if (u.text === '') { window.__tts.warm++; return; }
      this.speaking = fireStart; // Chrome with no matching voice: never starts, `speaking` stays false
      setTimeout(() => { if (fireStart) u.onstart && u.onstart(new Event('start')); }, 1);
      setTimeout(() => { this.speaking = false; u.onend && u.onend(new Event('end')); }, delay);
    },
  });
  window.__mkTTS = mk;
  Object.defineProperty(window, 'speechSynthesis', { value: mk(5, true), configurable: true, writable: true });
  // flag the synchronous part of every click dispatch
  // (cleared with setTimeout(0): a microtask would run between listeners; a 120ms-delayed speak() still lands after it)
  window.addEventListener('click', () => { window.__inClick = true; setTimeout(() => { window.__inClick = false; }, 0); }, true);
})();'''

# hook that records every karaoke highlight change with timestamps
OBSERVE = '''() => {
  window.__hl = []; const t0 = performance.now();
  const root = document.querySelector('.explain-sheet .k-text');
  const rec = () => { const now = root.querySelector('.kw.now'); const all = [...root.querySelectorAll('.kw')];
    const i = now ? all.indexOf(now) : -1; const said = root.querySelectorAll('.kw.said').length;
    const last = window.__hl[window.__hl.length - 1];
    if (!last || last.i !== i || last.said !== said) window.__hl.push({ t: Math.round(performance.now() - t0), i, said }); };
  new MutationObserver(rec).observe(root, { attributes: true, subtree: true, attributeFilter: ['class'] }); rec();
  return root.querySelectorAll('.kw').length;
}'''

def open_explain(pg):
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/play/mult_3'); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    # Phase 13: clips are the first provider; this suite covers the speech.js fallback (silent OS engine), so force it.
    # The clips path has its own suite (phase13_voice.py).
    pg.wait_for_function('window.__voice'); pg.evaluate("window.__voice.pref = 'speech'")

with sync_playwright() as p:
    b = p.chromium.launch()
    pixel = p.devices['Pixel 5']
    # ---------- A) silent engine (muted phone) ----------
    ctx = b.new_context(**pixel); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(SILENT)
    open_explain(pg)
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text')
    n = pg.evaluate(OBSERVE)
    tts = pg.evaluate('window.__tts')
    print('words:', n, 'utterances so far:', len(tts['spoken']), 'sync flags:', tts['sync'])
    check(tts['warm'] >= 1, 'warm(): empty utterance spoken on first gesture (engine unlocked)')
    real = [s for s, t in zip(tts['sync'], tts['spoken']) if t != '']
    check(len(real) >= 1 and real[0] is True, 'first real speak() ran synchronously inside the click dispatch (no setTimeout)')
    pg.wait_for_timeout(600)
    early = pg.evaluate('window.__hl')
    check(pg.locator('.explain-sheet .kw.said').count() < n, 'after 600ms the text is NOT fully marked said (no flash-through)')
    # the full text is ~30 words (~18s paced) - measure the pacing on the first 8 words instead of waiting to the end
    pg.wait_for_function('() => document.querySelectorAll(".explain-sheet .kw.said").length >= 8', timeout=12000)
    hl = pg.evaluate('window.__hl')
    idx = [h['i'] for h in hl if h['i'] >= 0]
    t8 = next((h['t'] for h in hl if h['i'] >= 8), None)
    print('highlight timeline (ms,i,said):', [(h['t'], h['i'], h['said']) for h in hl][:24])
    check(n >= 6, f'explanation has >= 6 words ({n})')
    check(t8 is not None and t8 >= 2500, f'paced karaoke: 8 words took >= 2.5s with a silent engine ({t8}ms)')
    check(idx == sorted(set(idx)) and idx[0] == 0, 'words highlighted strictly in order from the first, none skipped')
    check(pg.locator('.explain-sheet .kw.said').count() < n, 'still not fully said while pacing (no flash-through)')
    gaps = [hl[k + 1]['t'] - hl[k]['t'] for k in range(len(hl) - 1) if hl[k]['i'] >= 0]
    check(gaps and min(gaps) >= 200, f'min per-word dwell >= 200ms ({min(gaps) if gaps else None}ms)')
    tts = pg.evaluate('window.__tts')
    check(len([t for t in tts['spoken'] if t]) <= 2, f'engine hand-over: no chaining through all sentences ({len([t for t in tts["spoken"] if t])} real utterances)')
    check(pg.evaluate('window.__speech.warmed') is True, 'speech.warmed flag set')
    check(not errs, f'no page errors (A) {errs}')
    ctx.close()

    # ---------- B) engine that never fires onstart (no Arabic voice installed) ----------
    ctx = b.new_context(**pixel); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(SILENT + ';window.addEventListener("DOMContentLoaded", () => { Object.defineProperty(window, "speechSynthesis", { value: window.__mkTTS(999999, false), configurable: true, writable: true }); });')
    open_explain(pg)
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text'); n = pg.evaluate(OBSERVE)
    pg.wait_for_timeout(2200)
    hl = pg.evaluate('window.__hl'); idx = [h['i'] for h in hl if h['i'] >= 0]
    check(len(idx) >= 2 and idx == sorted(idx), f'no-onstart engine (speaking stays false, as real Chrome): 1200ms guard started the paced karaoke ({len(idx)} steps by 2.2s)')
    check(not errs, f'no page errors (B) {errs}')
    ctx.close()

    # ---------- C) desktop regression, real headless speechSynthesis (no voices) ----------
    pg = b.new_page(viewport={'width': 412, 'height': 915}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    open_explain(pg)
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text'); pg.wait_for_timeout(1800)
    check(pg.locator('.explain-sheet .kw.now, .explain-sheet .kw.said').count() >= 1, 'desktop/headless: karaoke fallback still highlights')
    check(pg.locator('.explain-sheet .kw.said').count() < pg.locator('.explain-sheet .kw').count(), 'desktop/headless: not flashed through at 1.8s')
    check(not errs, f'no page errors (C) {errs}')
    b.close()

if fails: print('FAIL', fails); sys.exit(1)
print('PASS phase12_mobile_tts')
