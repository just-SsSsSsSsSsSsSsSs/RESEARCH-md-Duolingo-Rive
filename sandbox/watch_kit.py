#!/usr/bin/env python3
"""K9.6-2 watch kit (gate G12, the human gate). `--readme-only` rewrites README.md from manifest.json (no recording).

Records the SAME four beats on two arms and packs them into a self-contained offline 2AFC kit:
  arm v2  engine=v2 art=p2 (this branch: acting layer, flex; Foley off for the video)
  arm v1  engine=v1 art=p2 (frozen K7 reference engine, the only control that exists on the branch)
Beats (clip 10 s, declared in PROGRESS K9.6 RESEARCH):
  celebrate  v2 triumph('large') / v1 celebrate()      flight  v2 states.fire('move:to') / v1 flyBy (same dx, dy)
  think      v2 states.fire('answer:pending') -> state think / v1 think()      sad     v2 oops('large') / v1 sad()
  (kit v1, seed 20260927, ran puzzled('large') in the think clip; kit v2 runs the real think state on both arms - gist rev b693458e.
   `--only think` re-records that beat only and reuses the other clips byte-identical, sha256-checked against the previous manifest.
   kit v3 (owner decision 2026-09-27, K9.5-4): same protocol + the answer buttons are LOCKED until second_beat_ms with a visible
   countdown (a rating cannot precede the second beat - Baba's 2459 ms block on kit v2 motivated it); the recording URL carries
   &seed=<BLINK_SEED> so the blink scheduler is pinned at recording time on both arms (K9.5-1); every per-clip label names the clip
   the state RESOLVES to, read live from the page at recording time (manifest.resolved_clips) - the kit-v2 think label said
   "body ponder" while ponder resolved to the puzzled spiral; `--only think,sad --arms v2` re-records only the arm that changed
   (K9.5-2 think redesign, K9.5-3 sad plate) and reuses the six other clips byte-identical; previous_kit chain v1 -> v2 -> v3 kept
   whole; kit-v2 result blocks stay in results/ and are REJECTED by design (kit / seed / order mismatch).)
Protocol in the kit (samples/watch/index.html): per trial two videos side by side, left/right order randomised per
trial with a seeded shuffle, one forced choice "which one is alive?" (2AFC, [P12]); BT.500 randomisation [P11];
the key (which side was v2) is shown only after the last trial, and its sha256 is printed on the first screen so the
rater can verify the order was fixed before they started. The read-out gives the count for v2 and the exact two-sided
binomial p [P13]. Results are a JSON blob the rater copies back; nothing leaves the browser.

Honest limits (also printed in the kit): the gist asks for "v2 vs a still from the reference video"; there is no
reference video or still in the repository, so the control arm is v1.

Output: samples/watch/{v1,v2}_<beat>.webm, index.html, manifest.json (bytes, sha256 per clip, order key hash),
README.md. Budget declared before the run: total kit <= 12 MB, 0 external resources, 0 page errors.
"""
import asyncio, hashlib, json, os, random, shutil, sys, time

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'samples', 'watch')
BASE = os.environ.get('SANDBOX_BASE', 'http://127.0.0.1:8080/sandbox/')
CLIP_MS = 10000
IDLE_MS = 1200          # idle first: breathing, blink, saccades are part of "alive"
SECOND_BEAT_MS = 5500   # a second beat so a 10 s clip is not 60 % idle
BEATS = ['celebrate', 'flight', 'think', 'sad']
KIT_VERSION = 3   # v1 (seed 20260927) ran puzzled('large') in the think clip; v2 ran the real think state, which then RESOLVED to the puzzled
                  # performance (labelling defect, DIRECTIVES #81); v3 (owner decision 2026-09-27) = v2 protocol + answer buttons locked until
                  # second_beat_ms, blink seeded on the recording URL, per-clip label names the RESOLVED clip, v2 think/sad re-recorded
SEED = int(os.environ.get('WATCH_SEED', '20260929'))
BLINK_SEED = int(os.environ.get('BLINK_SEED', '20260928'))   # K9.5-1: ?seed= pins the blink scheduler on both arms (pinned at recording time only)
MAX_KIT_MB = 12.0
MAX_CLIP_S = 10.5   # declared in PROGRESS K9.6 RESEARCH before the first run

RUN = {
    'celebrate': "() => { const r = window.__rigs[0]; if (r.triumph && r.perfSpec && r.perfSpec('triumph')) r.triumph('large'); else r.celebrate(); }",
    'flight': "() => { const r = window.__rigs[0]; if (r.states) { r._forcedRoll = 'large'; r.states.fire('move:to', { by: { dx: 240, dy: -140 } }); } else if (r.flyBy) r.flyBy(240, -140); }",
    'flight_home': "() => { const r = window.__rigs[0]; if (r.states) r.states.fire('move:to', { home: true, target: null }); else if (r.flyBy) r.flyBy(-240, 140); }",
    'think': "() => { const r = window.__rigs[0]; if (r.states) r.states.fire('answer:pending'); else r.think(); }",
    'sad': "() => { const r = window.__rigs[0]; if (r.oops && r.perfSpec && r.perfSpec('oops')) r.oops('large'); else r.sad(); }",
}
READY = "window.__rigs && window.__rigs[0] && !window.__rigs[0].busy"
# Rule line (gist rev b693458e): every clip states exactly which state it runs; shown in the kit, manifest and README.
STATES_PER_CLIP = {
    'celebrate': {'v2': "triumph('large') performance (falls back to celebrate())", 'v1': 'celebrate()'},
    'flight': {'v2': "states.fire('move:to', by dx 240 dy -140) then move:to home", 'v1': 'flyBy(240, -140) then flyBy back'},
    'think': {'v2': "states.fire('answer:pending') -> state think -> RESOLVED clip body.ponder = rig.ponder(escalate) = the K9.5-2 calm think performance (spec acting.performances.think; eyes lift and hold, head tilt 5/7/9 deg, wing to chin, one blink, settle; no spiral); mouth mid; vfx off (sfx=0)", 'v1': 'think() (gaze roll 1.5 s, head +9 deg, wing to chin)'},
    'sad': {'v2': "oops('large') performance (falls back to sad()) -> mouth plate beak_sad.webp (K9.5-3 authored art)", 'v1': 'sad() -> mouth plate beak_sad.webp (same art on both arms since K9.5-3)'},
}
# kit v3 rule: the label above names the clip the state RESOLVES to, checked live at recording time (manifest.resolved_clips)
RESOLVE = {
    'think': "() => { const r = window.__rigs[0]; if (!r.states) return 'v1 think()'; const st = r.spec.states.list.think; return 'state think -> body ' + st.body + ' -> ' + ((r.ponder && r.perfSpec && r.perfSpec('think')) ? 'rig.ponder (acting.performances.think)' : 'rig.think() legacy'); }",
    'sad': "() => { const r = window.__rigs[0]; const m = r.mouthShapes && r.mouthShapes.sad && r.mouthShapes.sad.querySelector('image'); return ((r.oops && r.perfSpec && r.perfSpec('oops')) ? 'oops(large)' : 'sad()') + ' -> sad plate ' + (m ? m.getAttribute('href').split('/').pop() : 'none'); }",
    'celebrate': "() => { const r = window.__rigs[0]; return (r.triumph && r.perfSpec && r.perfSpec('triumph')) ? 'triumph(large)' : 'celebrate()'; }",
    'flight': "() => { const r = window.__rigs[0]; return r.states ? 'states move:to (flight.js)' : 'flyBy'; }",
}


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''): h.update(chunk)
    return h.hexdigest()


async def record(b, engine, beat):
    url = BASE + f'index.html?engine={engine}&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0&seed={BLINK_SEED}'   # kit v3: seeded blink (K9.5-1)
    tmp = os.path.join(OUT, '_tmp'); os.makedirs(tmp, exist_ok=True)
    ctx = await b.new_context(viewport=dict(width=640, height=520), record_video_dir=tmp, record_video_size=dict(width=640, height=520), device_scale_factor=1)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    await pg.goto(url, wait_until='networkidle'); await pg.wait_for_function(READY)
    resolved = await pg.evaluate(RESOLVE[beat])
    seeded = await pg.evaluate("() => !!(window.__blinkRng && window.__blinkRng.seeded && window.__blinkRng.seeded())")
    # display:none (not visibility): hidden chrome must leave the layout so the stage moves into the 640x520 frame.
    # Tool defect disclosed (resume #62): the first run used visibility:hidden and recorded 8 clips of sky with the owl at y=834.
    await pg.evaluate("document.querySelectorAll('header, .bar, #caption, #hud, #note').forEach(e => { e.style.display = 'none'; }); document.getElementById('stage').style.marginTop = '0'; scrollTo(0, 0);")
    box = await pg.evaluate("() => { const r = window.__rigs[0].svg.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }")
    if not (box[0] >= 0 and box[1] >= 0 and box[2] <= 640 and box[3] <= 520):
        await ctx.close(); sys.exit(f'owl outside the recorded frame for {engine}/{beat}: {box}')
    await pg.wait_for_timeout(IDLE_MS)
    t0 = time.time(); await pg.evaluate(RUN[beat])
    await pg.wait_for_timeout(SECOND_BEAT_MS)
    await pg.evaluate(RUN['flight_home' if beat == 'flight' else beat])
    rest = CLIP_MS - int((time.time() - t0) * 1000)
    if rest > 0: await pg.wait_for_timeout(rest)
    video = pg.video; await ctx.close()
    src = await video.path(); dst = os.path.join(OUT, f'{engine}_{beat}.webm')
    # Playwright records from page open (load + READY wait + IDLE_MS) and the encoder adds a tail, so the raw file ran 12.8 s
    # against the declared <= 10.5 s (first two runs, disclosed). Trim to the last CLIP_MS + IDLE_MS/2 with ffmpeg (re-encode,
    # same codec) so every clip carries 0.6 s idle then the two beats; if ffmpeg is missing the raw file is kept and flagged.
    import subprocess
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True)
    raw_s = float(probe.stdout.strip()) if probe.returncode == 0 and probe.stdout.strip() else None
    want_s = min((CLIP_MS + IDLE_MS / 2) / 1000, MAX_CLIP_S - 0.1)   # 10.4 s: 0.4 s idle lead-in + 10 s beats, under the 10.5 s budget (the 10.6 s target of run 3 missed by 0.1 s - fixed the target, not the budget)
    if raw_s and raw_s > want_s + 0.05:
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{raw_s - want_s:.3f}', '-i', src, '-t', f'{want_s:.3f}', '-c:v', 'libvpx', '-b:v', '1M', '-an', dst], capture_output=True, text=True)
        if r.returncode != 0: errs.append('ffmpeg trim failed: ' + r.stderr[:200]); shutil.move(src, dst)
        else: os.remove(src)
    else:
        shutil.move(src, dst)
    return dst, errs, [round(v) for v in box], {'resolved': resolved, 'blink_seeded': seeded, 'url': url.replace(BASE, '')}


def binom_two_sided(k, n):
    from math import comb
    p_low = sum(comb(n, i) for i in range(0, k + 1)) / 2 ** n
    p_high = sum(comb(n, i) for i in range(k, n + 1)) / 2 ** n
    return min(1.0, 2 * min(p_low, p_high))


KIT_HTML = r"""<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Watch kit G12 - which one is alive?</title>
<style>
body{margin:0;background:#0f1220;color:#e8ebf5;font:16px/1.5 system-ui,sans-serif}
main{max-width:1200px;margin:0 auto;padding:20px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}
video{width:100%;background:#000;border-radius:10px}
button{font:inherit;padding:12px 22px;border:0;border-radius:10px;background:#3b4b8a;color:#fff;cursor:pointer}
button.primary{background:#ffd166;color:#221}
button[disabled]{opacity:.35;cursor:not-allowed}
.card{background:#181c30;border-radius:12px;padding:16px;margin:12px 0}
code{background:#0a0c16;padding:2px 6px;border-radius:6px;direction:ltr;display:inline-block}
small{color:#a9b0c8}
input{font:inherit;padding:6px 10px;border-radius:8px;border:0}
pre{white-space:pre-wrap;direction:ltr;text-align:left}
</style>
<main>
<h1>اختبار العين G12: أنهي واحد حي؟</h1>
<div class="card" id="intro">
<p>ستشاهد <b id="nTrials"></b> مقاطع، كل مقطع فيه بومتان تؤديان نفس الحركة. اختر البومة التي تبدو <b>حية</b> أكثر. لا توجد إجابة صحيحة؛ الإعادة مرتان كحد أقصى.</p>
<p>ترتيب اليمين/اليسار مثبت مسبقا (بذرة <code id="seed"></code>)، بصمته sha256: <code id="keyHash"></code>. المفتاح يظهر بعد آخر مقطع فقط.</p>
<p><small id="limits"></small></p>
<p><small>الإصدار <code id="kitVersion"></code>. ما يشغّله كل مقطع بالضبط (الاسم هو المقطع الذي تُحلّ إليه الحالة فعليا عند التسجيل):</small></p><ul id="states" style="font-size:.85em"></ul>
<p id="lockNote"></p>
<label>اسم المقيّم (مطلوب - بدون اسم، الجلسة لا تُحتسب مُقيّمًا): <input id="rater"></label>
<p><button class="primary" id="start">ابدأ</button></p>
</div>
<div id="trial" hidden>
<h2 id="title"></h2>
<div class="pair">
<div><video id="vR" muted playsinline></video><p style="text-align:center"><button data-side="R" disabled>هذه حية</button></p></div>
<div><video id="vL" muted playsinline></video><p style="text-align:center"><button data-side="L" disabled>هذه حية</button></p></div>
</div>
<p id="countdown" style="text-align:center"></p>
<p><button id="replay">أعد المشاهدة</button> <small id="replays"></small></p>
</div>
<div id="done" hidden class="card"><h2>النتيجة</h2><pre id="result"></pre>
<p>انسخ الكتلة أعلاه وأرسلها كما هي. المفتاح (الجهة اليسرى لكل مقطع): <code id="key"></code></p></div>
</main>
<script>
const M = __MANIFEST__;
const order = M.order;   // per trial: {beat, left: 'v2'|'v1'}; in this RTL grid the first cell is the RIGHT side
document.getElementById('nTrials').textContent = order.length;
document.getElementById('seed').textContent = M.seed;
document.getElementById('keyHash').textContent = M.order_sha256;
document.getElementById('limits').textContent = M.limits;
document.getElementById('kitVersion').textContent = 'kit v' + (M.kit_version || 1) + ' (' + M.generated_at + ')';
const LOCK_MS = M.answer_lock_ms || 0;
document.getElementById('lockNote').textContent = LOCK_MS ? 'أزرار الاختيار مقفلة في كل مقطع حتى تبدأ الحركة الثانية (' + (LOCK_MS / 1000).toFixed(1) + ' ث)؛ يظهر عدّاد تنازلي.' : '';
let lockTimer = null, lockUntil = 0;
function setLocked(on) { document.querySelectorAll('button[data-side]').forEach(b => { b.disabled = on; }); }
function lock() {
  clearInterval(lockTimer); setLocked(LOCK_MS > 0); lockUntil = performance.now() + LOCK_MS;
  const cd = document.getElementById('countdown');
  const tick = () => { const left = lockUntil - performance.now(); if (left <= 0) { clearInterval(lockTimer); setLocked(false); cd.textContent = 'يمكنك الاختيار الآن'; return; } cd.textContent = 'الاختيار يُفتح بعد ' + (left / 1000).toFixed(1) + ' ث'; };
  if (LOCK_MS > 0) { tick(); lockTimer = setInterval(tick, 100); } else cd.textContent = '';
}
Object.entries(M.states_per_clip || {}).forEach(([beat, s]) => { const li = document.createElement('li'); li.textContent = beat + ': v2 = ' + s.v2 + ' | v1 = ' + s.v1; document.getElementById('states').appendChild(li); });
let i = 0, replays = 0; const answers = []; const t = [];
const vR = document.getElementById('vR'), vL = document.getElementById('vL');
const other = a => a === 'v2' ? 'v1' : 'v2';
function show() {
  const o = order[i]; document.getElementById('title').textContent = 'مقطع ' + (i + 1) + ' / ' + order.length;
  vL.src = M.clips[o.left + '_' + o.beat]; vR.src = M.clips[other(o.left) + '_' + o.beat];
  replays = 0; document.getElementById('replays').textContent = '';
  vL.currentTime = 0; vR.currentTime = 0; Promise.all([vL.play(), vR.play()]).catch(() => {});
  t.push(performance.now()); lock();
}
document.getElementById('start').onclick = () => { document.getElementById('intro').hidden = true; document.getElementById('trial').hidden = false; show(); };
document.getElementById('replay').onclick = () => { if (replays >= 2) return; replays++; document.getElementById('replays').textContent = 'إعادة ' + replays + '/2'; vL.currentTime = 0; vR.currentTime = 0; vL.play(); vR.play(); };
document.querySelectorAll('button[data-side]').forEach(b => b.onclick = () => {
  if (b.disabled || performance.now() < lockUntil) return;   // lock enforced in the handler too, not only by the attribute
  const o = order[i]; const chosen = b.dataset.side === 'L' ? o.left : other(o.left);
  answers.push({ trial: i + 1, beat: o.beat, chosen, ms: Math.round(performance.now() - t[i]), replays, lock_ms: LOCK_MS });
  i++; if (i < order.length) show(); else finish();
});
function binom(k, n) { const C = (n, r) => { let x = 1; for (let j = 1; j <= r; j++) x = x * (n - r + j) / j; return x; };
  let lo = 0, hi = 0; for (let j = 0; j <= n; j++) { const p = C(n, j) / 2 ** n; if (j <= k) lo += p; if (j >= k) hi += p; } return Math.min(1, 2 * Math.min(lo, hi)); }
function finish() {
  document.getElementById('trial').hidden = true; document.getElementById('done').hidden = false;
  const k = answers.filter(a => a.chosen === 'v2').length, n = answers.length;
  const out = { kit: M.generated_at, kit_version: M.kit_version, rater: document.getElementById('rater').value || null, seed: M.seed, order_sha256: M.order_sha256, n, v2_chosen: k, v1_chosen: n - k, binomial_two_sided_p: +binom(k, n).toFixed(4), answers };
  document.getElementById('result').textContent = JSON.stringify(out, null, 1);
  document.getElementById('key').textContent = order.map(o => o.beat + ':' + o.left).join('  ');
}
</script></html>"""


def min_wins(n):
    """smallest k > n/2 with two-sided p <= 0.05 (the upper-tail threshold); None for tiny n"""
    for k in range(n // 2 + 1, n + 1):
        if binom_two_sided(k, n) <= 0.05: return k
    return None


def write_readme(manifest):
    order = manifest['order']
    clips = '\n'.join(f'| {k} | {manifest["bytes"][k]} | {manifest["sha256"][k][:16]} | {manifest["duration_s"][k] if isinstance(manifest["duration_s"], dict) else "-"} |' for k in manifest['clips'])
    thr = '\n'.join(f'| {n} | {min_wins(n)}/{n} | {binom_two_sided(min_wins(n), n):.4f} | {n - min_wins(n)}/{n} gives the SAME p and is a LOSS |' for n in (12, 16, 20))
    readme = f"""# Watch kit G12 (K9.6-2) - generated {manifest['generated_at']} by sandbox/watch_kit.py

Open `index.html` from a local copy of this folder (no server, no network, 0 external resources).
{len(order)} trials per rater; each trial shows the same beat on two engines side by side in a pre-shuffled left/right
order (seed {SEED}; sha256 of the order `{manifest['order_sha256']}`). One forced choice per trial: "which one is alive?"
(2AFC). Replay at most 2. The key is revealed after the last trial. The rater copies the JSON result block back.

Read-out: count for v2 out of n and the exact two-sided binomial p. Examples (k/n: p): {json.dumps(manifest['readout_examples_p'])}
Claim rule declared here: v2 "reads alive" only if two-sided p <= 0.05 AND v2_chosen > n/2 (v2 in the UPPER tail),
over >= 12 trials from >= 3 named raters; anything else is reported as no evidence (FAIL / INSUFFICIENT).
Direction matters (owner audit, gist rev d33eaf03): the two-sided p is symmetric, so 10/12 and 2/12 both give
0.0386 and 0/12 gives 0.0005 - a small p with v2 losing is a LOSS, never a pass. Score with `score.html`
(offline, next to this file) or `node sandbox/tests/g12_score.mjs`; never by reading p alone.

| trials n | v2 must win at least | two-sided p at that k | mirror |
|---|---|---|---|
{thr}

What each clip runs (kit v{manifest.get('kit_version', 1)}): {json.dumps(manifest.get('states_per_clip', {}))}
{('Previous kit: ' + json.dumps(manifest['previous_kit']) + '. Clips reused byte-identical from it: ' + ', '.join(manifest.get('reused_from_previous_kit', [])) + '.') if manifest.get('previous_kit') else ''}

{('Kit v3 protocol additions: answer buttons locked until ' + str(manifest.get('answer_lock_ms')) + ' ms into each trial (countdown shown; enforced in the click handler too); blink seeded at recording time (seed ' + str(manifest.get('blink_seed')) + ', URL param on both arms); resolved clips read live at recording time: ' + json.dumps(manifest.get('resolved_clips', {}), ensure_ascii=False) + '.') if manifest.get('kit_version', 1) >= 3 else ''}

Results: one JSON file per rater session in `results/` (append-only), scored together. Blocks are valid only against the kit
(generated_at, seed, order_sha256) they were rated on; sessions from an earlier kit are kept in `results/` and documented there.

Limits: {manifest['limits']}

| clip | bytes | sha256 (16) | duration s |
|---|---|---|---|
{clips}

Total {manifest['kit_total_mb']} MB (budget {MAX_KIT_MB} MB): {'PASS' if manifest['pass_kit_size'] else 'FAIL'}; clip duration <= {MAX_CLIP_S} s: {'PASS' if manifest['pass_clip_duration'] else 'FAIL'}; page errors: {'none' if manifest['pass_no_page_errors'] else json.dumps(manifest['errors'])}.
"""
    with open(os.path.join(OUT, 'README.md'), 'w') as fh: fh.write(readme)


async def main():
    from playwright.async_api import async_playwright
    os.makedirs(OUT, exist_ok=True)
    manifest = {'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'kit_version': KIT_VERSION, 'seed': SEED, 'clip_ms': CLIP_MS, 'idle_ms': IDLE_MS, 'second_beat_ms': SECOND_BEAT_MS,
                'answer_lock_ms': SECOND_BEAT_MS, 'blink_seed': BLINK_SEED, 'resolved_clips': {}, 'recording_urls': {}, 'blink_seeded': {},
                'beats': BEATS, 'arms': {'v2': 'engine=v2 art=p2 (this branch)', 'v1': 'engine=v1 art=p2 (frozen K7 reference)'}, 'states_per_clip': STATES_PER_CLIP, 'clips': {}, 'errors': {}}
    only = None; prev = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
        if not only <= set(BEATS): sys.exit(f'--only: unknown beat in {sorted(only)}')
        only_arms = set(sys.argv[sys.argv.index('--arms') + 1].split(',')) if '--arms' in sys.argv else {'v2', 'v1'}   # kit v3: --arms v2 re-records only the arm that changed
        if not only_arms <= {'v2', 'v1'}: sys.exit(f'--arms: unknown arm in {sorted(only_arms)}')
        with open(os.path.join(OUT, 'manifest.json')) as fh: prev = json.load(fh)
        manifest['previous_kit'] = {'kit_version': prev.get('kit_version', 1), 'generated_at': prev['generated_at'], 'seed': prev['seed'], 'order_sha256': prev['order_sha256'],
                                    'note': f'beats {sorted(only)} re-recorded on arms {sorted(only_arms)}; all other clips reused byte-identical (sha256 checked before reuse)'}
        if prev.get('previous_kit'): manifest['previous_kit']['previous_kit'] = prev['previous_kit']   # chain v1 -> v2 -> v3 kept whole
        manifest['reused_from_previous_kit'] = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for engine in ('v2', 'v1'):
            for beat in BEATS:
                key = f'{engine}_{beat}'
                if only is not None and (beat not in only or engine not in only_arms):
                    f = prev['clips'][key]; have = sha(os.path.join(OUT, f))
                    if have != prev['sha256'][key]: sys.exit(f'reused clip {f} changed on disk: {have[:16]} != manifest {prev["sha256"][key][:16]}')
                    manifest['clips'][key] = f; manifest['errors'][key] = prev['errors'][key]; manifest.setdefault('owl_box_at_rest', {})[key] = prev.get('owl_box_at_rest', {}).get(key)
                    manifest['resolved_clips'][key] = prev.get('resolved_clips', {}).get(key, 'reused from kit v%s (recorded before resolved-clip labelling; unseeded blink)' % prev.get('kit_version', 1)); manifest['recording_urls'][key] = prev.get('recording_urls', {}).get(key); manifest['blink_seeded'][key] = prev.get('blink_seeded', {}).get(key, False)
                    manifest['reused_from_previous_kit'].append(f); print('reused  ', f, have[:16]); continue
                path, errs, box, meta = await record(b, engine, beat)
                manifest['clips'][f'{engine}_{beat}'] = os.path.basename(path); manifest['errors'][f'{engine}_{beat}'] = errs; manifest.setdefault('owl_box_at_rest', {})[f'{engine}_{beat}'] = box
                manifest['resolved_clips'][key] = meta['resolved']; manifest['recording_urls'][key] = meta['url']; manifest['blink_seeded'][key] = meta['blink_seeded']
                print('recorded', os.path.basename(path), f'{os.path.getsize(path) / 1024:.0f} KB', 'errors', len(errs))
        await b.close()
    shutil.rmtree(os.path.join(OUT, '_tmp'), ignore_errors=True)
    manifest['sha256'] = {k: sha(os.path.join(OUT, f)) for k, f in manifest['clips'].items()}
    manifest['bytes'] = {k: os.path.getsize(os.path.join(OUT, f)) for k, f in manifest['clips'].items()}
    try:
        import subprocess
        manifest['duration_s'] = {}
        for k, f in manifest['clips'].items():
            r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(OUT, f)], capture_output=True, text=True)
            manifest['duration_s'][k] = round(float(r.stdout.strip()), 2) if r.returncode == 0 and r.stdout.strip() else None
    except Exception:
        manifest['duration_s'] = 'ffprobe unavailable (durations not measured, disclosed)'
    rnd = random.Random(SEED); order = [{'beat': bt, 'left': rnd.choice(['v2', 'v1'])} for bt in BEATS]; rnd.shuffle(order)
    manifest['order'] = order; manifest['order_sha256'] = hashlib.sha256(json.dumps(order, sort_keys=True).encode()).hexdigest()
    manifest['reference_still_present'] = os.path.exists(os.path.join(OUT, 'reference_still.png'))
    manifest['limits'] = ('Control arm = v1 (frozen K7 engine on this branch). The gist asks for a still from the reference video; no such file exists in the repository, '
                          'so none is shown. Raters are not independent of the owner; the p-value is indicative only. 4 trials per rater; 3-5 raters give 12-20 trials.')
    kit = KIT_HTML.replace('__MANIFEST__', json.dumps(manifest, ensure_ascii=False))
    with open(os.path.join(OUT, 'index.html'), 'w') as fh: fh.write(kit)
    total = sum(manifest['bytes'].values()) + len(kit.encode())
    manifest['kit_total_mb'] = round(total / 1e6, 2); manifest['pass_kit_size'] = manifest['kit_total_mb'] <= MAX_KIT_MB
    manifest['pass_no_page_errors'] = all(not e for e in manifest['errors'].values())
    manifest['max_clip_s'] = MAX_CLIP_S
    manifest['pass_clip_duration'] = isinstance(manifest['duration_s'], dict) and all(v is not None and v <= MAX_CLIP_S for v in manifest['duration_s'].values())
    manifest['readout_examples_p'] = {f'{k}/{n}': round(binom_two_sided(k, n), 4) for n in (12, 16, 20) for k in (n, n - 1, n - 2, n - 3, n - 4, n - 5)}
    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh: json.dump(manifest, fh, indent=1, ensure_ascii=False)
    write_readme(manifest)
    print('kit', manifest['kit_total_mb'], 'MB', 'size', 'PASS' if manifest['pass_kit_size'] else 'FAIL', '| errors', 'none' if manifest['pass_no_page_errors'] else 'YES', '| durations <=', MAX_CLIP_S, 'PASS' if manifest['pass_clip_duration'] else 'FAIL', manifest.get('duration_s'))
    sys.exit(0 if manifest['pass_kit_size'] and manifest['pass_no_page_errors'] and manifest['pass_clip_duration'] else 1)


if __name__ == '__main__':
    if '--readme-only' in sys.argv:
        # Regenerate README.md from the committed manifest.json without re-recording anything (clips, index.html and
        # manifest.json stay byte-identical). Used for the direction/threshold disclosure (gist rev d33eaf03).
        with open(os.path.join(OUT, 'manifest.json')) as fh: m = json.load(fh)
        write_readme(m); print('README.md regenerated from manifest.json', m['generated_at']); sys.exit(0)
    asyncio.run(main())
