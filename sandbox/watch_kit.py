#!/usr/bin/env python3
"""K9.6-2 watch kit (gate G12, the human gate).

Records the SAME four beats on two arms and packs them into a self-contained offline 2AFC kit:
  arm v2  engine=v2 art=p2 (this branch: acting layer, flex; Foley off for the video)
  arm v1  engine=v1 art=p2 (frozen K7 reference engine, the only control that exists on the branch)
Beats (clip 10 s, declared in PROGRESS K9.6 RESEARCH):
  celebrate  v2 triumph('large') / v1 celebrate()      flight  v2 states.fire('move:to') / v1 flyBy (same dx, dy)
  think      v2 puzzled('large') / v1 think()          sad     v2 oops('large') / v1 sad()
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
SEED = int(os.environ.get('WATCH_SEED', '20260927'))
MAX_KIT_MB = 12.0
MAX_CLIP_S = 10.5   # declared in PROGRESS K9.6 RESEARCH before the first run

RUN = {
    'celebrate': "() => { const r = window.__rigs[0]; if (r.triumph && r.perfSpec && r.perfSpec('triumph')) r.triumph('large'); else r.celebrate(); }",
    'flight': "() => { const r = window.__rigs[0]; if (r.states) { r._forcedRoll = 'large'; r.states.fire('move:to', { by: { dx: 240, dy: -140 } }); } else if (r.flyBy) r.flyBy(240, -140); }",
    'flight_home': "() => { const r = window.__rigs[0]; if (r.states) r.states.fire('move:to', { home: true, target: null }); else if (r.flyBy) r.flyBy(-240, 140); }",
    'think': "() => { const r = window.__rigs[0]; if (r.puzzled && r.perfSpec && r.perfSpec('puzzled')) r.puzzled('large'); else r.think(); }",
    'sad': "() => { const r = window.__rigs[0]; if (r.oops && r.perfSpec && r.perfSpec('oops')) r.oops('large'); else r.sad(); }",
}
READY = "window.__rigs && window.__rigs[0] && !window.__rigs[0].busy"


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''): h.update(chunk)
    return h.hexdigest()


async def record(b, engine, beat):
    url = BASE + f'index.html?engine={engine}&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0'
    tmp = os.path.join(OUT, '_tmp'); os.makedirs(tmp, exist_ok=True)
    ctx = await b.new_context(viewport=dict(width=640, height=520), record_video_dir=tmp, record_video_size=dict(width=640, height=520), device_scale_factor=1)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    await pg.goto(url, wait_until='networkidle'); await pg.wait_for_function(READY)
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
    want_s = (CLIP_MS + IDLE_MS / 2) / 1000
    if raw_s and raw_s > want_s + 0.05:
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{raw_s - want_s:.3f}', '-i', src, '-t', f'{want_s:.3f}', '-c:v', 'libvpx', '-b:v', '1M', '-an', dst], capture_output=True, text=True)
        if r.returncode != 0: errs.append('ffmpeg trim failed: ' + r.stderr[:200]); shutil.move(src, dst)
        else: os.remove(src)
    else:
        shutil.move(src, dst)
    return dst, errs, [round(v) for v in box]


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
<label>اسم المقيّم (اختياري): <input id="rater"></label>
<p><button class="primary" id="start">ابدأ</button></p>
</div>
<div id="trial" hidden>
<h2 id="title"></h2>
<div class="pair">
<div><video id="vR" muted playsinline></video><p style="text-align:center"><button data-side="R">هذه حية</button></p></div>
<div><video id="vL" muted playsinline></video><p style="text-align:center"><button data-side="L">هذه حية</button></p></div>
</div>
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
let i = 0, replays = 0; const answers = []; const t = [];
const vR = document.getElementById('vR'), vL = document.getElementById('vL');
const other = a => a === 'v2' ? 'v1' : 'v2';
function show() {
  const o = order[i]; document.getElementById('title').textContent = 'مقطع ' + (i + 1) + ' / ' + order.length;
  vL.src = M.clips[o.left + '_' + o.beat]; vR.src = M.clips[other(o.left) + '_' + o.beat];
  replays = 0; document.getElementById('replays').textContent = '';
  vL.currentTime = 0; vR.currentTime = 0; Promise.all([vL.play(), vR.play()]).catch(() => {});
  t.push(performance.now());
}
document.getElementById('start').onclick = () => { document.getElementById('intro').hidden = true; document.getElementById('trial').hidden = false; show(); };
document.getElementById('replay').onclick = () => { if (replays >= 2) return; replays++; document.getElementById('replays').textContent = 'إعادة ' + replays + '/2'; vL.currentTime = 0; vR.currentTime = 0; vL.play(); vR.play(); };
document.querySelectorAll('button[data-side]').forEach(b => b.onclick = () => {
  const o = order[i]; const chosen = b.dataset.side === 'L' ? o.left : other(o.left);
  answers.push({ trial: i + 1, beat: o.beat, chosen, ms: Math.round(performance.now() - t[i]), replays });
  i++; if (i < order.length) show(); else finish();
});
function binom(k, n) { const C = (n, r) => { let x = 1; for (let j = 1; j <= r; j++) x = x * (n - r + j) / j; return x; };
  let lo = 0, hi = 0; for (let j = 0; j <= n; j++) { const p = C(n, j) / 2 ** n; if (j <= k) lo += p; if (j >= k) hi += p; } return Math.min(1, 2 * Math.min(lo, hi)); }
function finish() {
  document.getElementById('trial').hidden = true; document.getElementById('done').hidden = false;
  const k = answers.filter(a => a.chosen === 'v2').length, n = answers.length;
  const out = { kit: M.generated_at, rater: document.getElementById('rater').value || null, seed: M.seed, order_sha256: M.order_sha256, n, v2_chosen: k, v1_chosen: n - k, binomial_two_sided_p: +binom(k, n).toFixed(4), answers };
  document.getElementById('result').textContent = JSON.stringify(out, null, 1);
  document.getElementById('key').textContent = order.map(o => o.beat + ':' + o.left).join('  ');
}
</script></html>"""


async def main():
    from playwright.async_api import async_playwright
    os.makedirs(OUT, exist_ok=True)
    manifest = {'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'seed': SEED, 'clip_ms': CLIP_MS, 'idle_ms': IDLE_MS, 'second_beat_ms': SECOND_BEAT_MS,
                'beats': BEATS, 'arms': {'v2': 'engine=v2 art=p2 (this branch)', 'v1': 'engine=v1 art=p2 (frozen K7 reference)'}, 'clips': {}, 'errors': {}}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for engine in ('v2', 'v1'):
            for beat in BEATS:
                path, errs, box = await record(b, engine, beat)
                manifest['clips'][f'{engine}_{beat}'] = os.path.basename(path); manifest['errors'][f'{engine}_{beat}'] = errs; manifest.setdefault('owl_box_at_rest', {})[f'{engine}_{beat}'] = box
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
    clips = '\n'.join(f'| {k} | {manifest["bytes"][k]} | {manifest["sha256"][k][:16]} | {manifest["duration_s"][k] if isinstance(manifest["duration_s"], dict) else "-"} |' for k in manifest['clips'])
    readme = f"""# Watch kit G12 (K9.6-2) - generated {manifest['generated_at']} by sandbox/watch_kit.py

Open `index.html` from a local copy of this folder (no server, no network, 0 external resources).
{len(order)} trials per rater; each trial shows the same beat on two engines side by side in a pre-shuffled left/right
order (seed {SEED}; sha256 of the order `{manifest['order_sha256']}`). One forced choice per trial: "which one is alive?"
(2AFC). Replay at most 2. The key is revealed after the last trial. The rater copies the JSON result block back.

Read-out: count for v2 out of n and the exact two-sided binomial p. Examples (k/n: p): {json.dumps(manifest['readout_examples_p'])}
Claim rule declared here: v2 "reads alive" only if p <= 0.05 over >= 12 trials from >= 3 raters; anything else is reported as no evidence.

Limits: {manifest['limits']}

| clip | bytes | sha256 (16) | duration s |
|---|---|---|---|
{clips}

Total {manifest['kit_total_mb']} MB (budget {MAX_KIT_MB} MB): {'PASS' if manifest['pass_kit_size'] else 'FAIL'}; clip duration <= {MAX_CLIP_S} s: {'PASS' if manifest['pass_clip_duration'] else 'FAIL'}; page errors: {'none' if manifest['pass_no_page_errors'] else json.dumps(manifest['errors'])}.
"""
    with open(os.path.join(OUT, 'README.md'), 'w') as fh: fh.write(readme)
    print('kit', manifest['kit_total_mb'], 'MB', 'size', 'PASS' if manifest['pass_kit_size'] else 'FAIL', '| errors', 'none' if manifest['pass_no_page_errors'] else 'YES', '| durations <=', MAX_CLIP_S, 'PASS' if manifest['pass_clip_duration'] else 'FAIL', manifest.get('duration_s'))
    sys.exit(0 if manifest['pass_kit_size'] and manifest['pass_no_page_errors'] and manifest['pass_clip_duration'] else 1)


if __name__ == '__main__':
    asyncio.run(main())
