"""Phase 14 - spoken sibling / birr / dhikr encouragement, subtitle, parent spoken-words log (gist 13c2784a).

Answers are given through the SAME verified solver as math_random.py (solve_current), no DOM guessing.
Checks:
  1. bank integrity: every line has a recorded clip whose hash matches its text (edited text = stale -> FAIL);
     every hero has lines for all 4 events; Quran/hadith lines carry `src` + `review`; explain numbers 1..100;
  2. no immediate repeat: 12 consecutive picks for the same hero+event never repeat back to back;
  3. playing as Karma, a real correct answer speaks a line for Karma (or everyone), never "يا سليم";
     the clip really plays (mp3 200/206); the subtitle shows the exact words then hides;
  4. the explain voice is stopped when a cheer starts (one human voice at a time);
  5. parent log records explanations + cheers; hadith line flagged with its source; "نسخ النص" exports text+source;
  6. parent switch off -> no cheer audio requested, the line is still written in the log.
"""
import os, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from math_random import solve_current  # the proven UI solver (numpad / quiz / grid / pick / branch / truefalse)

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090/app/index.html'
fails = []
def check(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

def hero(pg, idx):
    # /profile shows the picker only when no hero is active; otherwise the hero card with «تبديل البطل» (app flow)
    pg.goto(BASE + '#/profile'); pg.wait_for_selector('.heroes .hero-card, [data-act="switch"]')
    if pg.locator('.heroes .hero-card').count() == 0: pg.click('[data-act="switch"]'); pg.wait_for_selector('.heroes .hero-card')
    pg.locator('.hero-card').nth(idx).click(); pg.wait_for_timeout(300)

def start(pg, act='mult_3'):
    pg.goto(BASE + '#/play/' + act); pg.wait_for_selector('[data-act="start"]'); pg.click('[data-act="start"]'); pg.wait_for_selector('.q-card')
    pg.wait_for_function('window.__cheers && window.__play', timeout=8000)

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(**p.devices['Pixel 5']); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    st = []; pg.on('response', lambda r: st.append(r.status) if '/audio/cheers/' in r.url and '.mp3' in r.url else None)

    # ---------- 1) bank integrity ----------
    hero(pg, 0); start(pg)
    integ = pg.evaluate('''async () => {
      const b = await (await fetch('content/cheers/bank.json')).json(); const m = await (await fetch('content/audio/cheers/shab_masri/manifest.json')).json();
      const sha = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(t)))].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 12);
      const stale = []; for (const l of b.lines) { const c = m.lines[l.id]; if (!c || c.hash !== await sha(l.say || l.text)) stale.push(l.id); }
      const cov = {}; for (const h of Object.keys(b.heroes)) for (const ev of ['correct', 'recovered', 'wrong', 'finish']) cov[h + ':' + ev] = b.lines.filter((l) => l.ev === ev && (l.for.includes('all') || l.for.includes(h))).length;
      const sacred = b.lines.filter((l) => ['quran', 'hadith'].includes(l.tags[0])); const bad = sacred.filter((l) => !l.src || !l.review || !/[\u064B-\u0652]/.test(l.say || '')).map((l) => l.id); // sacred = sourced + reviewed + diacritised spoken form
      const ex = await (await fetch('content/audio/explain/manifest.json')).json(); const nums = []; for (let n = 1; n <= 100; n++) if (!ex.clips['n:' + n]) nums.push(n);
      return { lines: b.lines.length, stale, cov, sacred: sacred.length, bad, missingNums: nums }; }''')
    print('bank:', integ['lines'], 'lines; coverage', integ['cov'])
    check(not integ['stale'], f"every line has a clip matching its text (stale: {integ['stale']})")
    check(min(integ['cov'].values()) >= 2, 'every hero has >= 2 lines for every event')
    check(integ['sacred'] >= 4 and not integ['bad'], f"Quran/hadith lines carry src + review + diacritised `say` ({integ['sacred']} lines, missing: {integ['bad']})")
    check(not integ['missingNums'], f"explain number clips 1..100 complete (missing {integ['missingNums'][:5]})")

    # ---------- 2) no immediate repeat ----------
    rep = pg.evaluate('''async () => { const c = window.__cheers; await c.ready(); const seq = [];
      for (let i = 0; i < 12; i++) { const l = await c.say('correct'); seq.push(l.id); } c.stop(); return seq; }''')
    check(all(rep[i] != rep[i + 1] for i in range(len(rep) - 1)), f'12 consecutive cheers never repeat back to back {rep}')
    pg.wait_for_timeout(300)
    check(st and all(s in (200, 206) for s in st), f'cheer mp3 served ({len(st)} responses, {sorted(set(st))})')

    # ---------- 3+4) real correct answer as Karma, explain voice running before ----------
    hero(pg, 1); start(pg)
    pg.evaluate('window.__voiceLog.clear(); window.__lastCheer = null')
    pg.click('.explain-btn'); pg.wait_for_selector('.explain-sheet .k-text'); pg.wait_for_timeout(800)
    was_playing = pg.evaluate('window.__clips.playing')
    pg.click('.explain-sheet [data-act="close"]'); pg.wait_for_timeout(150)
    style = solve_current(pg, set())
    pg.wait_for_function('window.__lastCheer && window.__lastCheer.hero === "karma"', timeout=8000)
    lc = pg.evaluate('window.__lastCheer'); print('style', style, 'karma cheer:', lc)
    check(lc['event'] in ('correct', 'recovered'), f"a spoken cheer followed the correct answer ({lc['event']})")
    fem_bad = [w for w in ('قولها ', 'اسمع ', ' ساعد ', 'يا بطل.', 'عليك!') if w in lc['text']]
    check(not fem_bad, f'Karma hears feminine wording, never masculine imperatives ({fem_bad})')
    check('يا سليم' not in lc['text'], 'Karma never hears a line addressed to Selim')
    check(lc['voiced'], 'the cheer clip was played (voiced)')
    sub = pg.locator('.voice-sub')
    check(sub.count() == 1 and sub.inner_text().strip() == lc['text'], 'subtitle shows the exact spoken words')
    check(was_playing and not pg.evaluate('window.__clips.playing'), 'explain voice was running and is stopped once the cheer plays')
    # subtitle stays max(2600, clip ms + 900) then fades 400ms -> wait for THIS clip's duration, not a guess
    ms = pg.evaluate('(id) => fetch("content/audio/cheers/shab_masri/manifest.json").then((r) => r.json()).then((m) => m.lines[id].ms)', lc['id'])
    pg.wait_for_timeout(max(2600, ms + 900) + 700)
    check(pg.locator('.voice-sub').is_hidden(), f'subtitle hides after the line ({ms}ms clip)')

    # ---------- 5) parent log + copy ----------
    pg.evaluate('''async () => { const b = await (await fetch('content/cheers/bank.json')).json(); const l = b.lines.find((x) => x.id === 'f05');
      window.__voiceLog.add({ kind: 'cheer', event: 'finish', id: l.id, text: l.text, src: l.src, review: true }); }''')
    log = pg.evaluate('window.__voiceLog.list()'); kinds = {e['kind'] for e in log}
    check('explain' in kinds and 'cheer' in kinds, f'log records explanations and cheers ({len(log)} entries, {kinds})')
    pg.goto(BASE + '#/parent'); pg.wait_for_selector('.pin input')
    for i, ch in enumerate('1234'): pg.locator('.pin input').nth(i).fill(ch)
    pg.wait_for_selector('[data-voice-log-box]', timeout=8000)
    pg.locator('[data-voice-log-box] summary').click(); pg.wait_for_timeout(200)
    items = pg.locator('[data-voice-log] li').count()
    check(items >= 3, f'parent panel lists the spoken lines ({items})')
    check(pg.locator('[data-voice-log] .vl-review').count() >= 1, 'hadith line flagged "needs your review" with its source')
    pg.click('[data-act="vlog-copy"]'); pg.wait_for_timeout(300)
    copied = pg.evaluate('window.__vlogCopied || ""')
    check('صحيح مسلم' in copied and lc['text'] in copied, 'copy button exports the text with sources')

    # ---------- 6) switch off ----------
    # settings are per child: select Karma's tab (the one we play as) before flipping her switch
    pg.locator('button', has_text='كارما').first.click(); pg.wait_for_selector('[data-cheers-switch]')
    pg.click('[data-cheers-switch]'); pg.wait_for_timeout(200)
    start(pg); n0 = len(st)
    pg.evaluate('window.__cheers.say("wrong")'); pg.wait_for_timeout(900)
    lc2 = pg.evaluate('window.__lastCheer')
    check(lc2 and not lc2['voiced'] and len(st) == n0, 'switch off -> no cheer audio requested')
    check(pg.evaluate('window.__voiceLog.list()[0].text') == lc2['text'], 'switch off -> the line is still written in the log')
    check(not errs, f'no page errors {errs}')
    b.close()

if fails: print('FAIL', fails); sys.exit(1)
print('PASS phase14_cheers')
