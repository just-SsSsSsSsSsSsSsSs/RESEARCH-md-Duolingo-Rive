#!/usr/bin/env python3
"""
K9.6-4 choreography port proof (owner decisions a3e73842 / cf3d3a8a / 0b1f96bc): "the primary proof of the port is the
AUTOMATIC channel-by-channel match within 16.7 ms". This tool measures exactly that, on the real page, headless Chromium,
no mocks, no sampling of computed styles - it records what the engine actually asks the browser to do.

Arms (two page contexts, same P2 art, sfx=0 auto=0 hud=0 sw=0):
  v1  engine=v1 : the frozen K7 reference method (rig.js SvgRig.think() / sad()) called directly
  v2  engine=v2 : CinematicRig.ponder() -> P.perform('think') playing acting.performances.think.choreo (data)

Instrumentation (installed before the page scripts run):
  Element.prototype.animate is wrapped once: every call records {t_rel, joint, keyframes, options, Animation}.
  The rig instance's setMouth / blink / release are wrapped after mount: every call records {t_rel, kind, arg}.
  t_rel = performance.now() - t0 where t0 is taken immediately before the method call, so both arms share a zero.

Per channel of the choreo data (the k96 test already proved the data == the v1 source text):
  matched      exactly one recorded animate() call per joint whose keyframes equal the channel's keyframes (on BOTH arms;
               idle/look/saccade layers that happen to run are listed under `extras`, never matched, never failed)
  call_dt_ms   |t_rel(v2) - t_rel(v1)| <= 16.7 (one 60 Hz frame)          <- THE acceptance metric (engine schedule)
  start_latency each arm: Animation.startTime - call time <= 2 frames (the player adds no paused/deferred start)
  start_dt_ms  informational only: |startTime(v2) - startTime(v1)| is quantised by each PAGE's own frame phase (the two arms
               run in two contexts whose document timelines are not phase-locked), so a 1 ms call difference can straddle a
               frame edge and read 16.7 or 33 ms. Measured runs: call_dt <= 1.5 ms every channel, start_dt 0.05 / 16.6 / 33.3.
  timing_equal effect.getTiming() {duration, delay, iterations, easing, fill, direction, endDelay} identical on both arms
  composite    effect.composite identical
  keyframes    effect.getKeyframes() normalised (transform, computedOffset) identical
Events: mouth plate sequence (shape + t_rel within 16.7 ms), blink calls (double flag + t_rel), release regex source.
End state at totalMs + 250: mouth 'closed', busy false, zero fill-forwards layers left on the released joints (both arms).
Reduced (prefers-reduced-motion emulated): zero animate() calls on any joint except lidL/lidR on both arms, mouth sequence
equal, close time equal. State route (v2 only): states.fire('answer:pending') emits [perf think] then [settle] and idle.
Legacy (v2 + ?perf=0): perfSpec('think') null, ponder() runs the legacy think() (no perf cue), rig busy then free.

Also a frames strip v1 (top row) vs v2 (bottom row) at 5 moments -> samples/proofs/k96_<perf>_strip.png (separate beat,
so screenshots never disturb the timing run).

Outputs samples/proofs/k96_<perf>.json (pass_all + per-check flags + every matched channel with both arms' numbers).
Exit 1 on any failure.   Run: python3 tools/serve.py 8080 (detached) -> python3 sandbox/choreo_proof.py [--perf think]
"""
import asyncio
import json
import os
import sys
import time

from playwright.async_api import async_playwright

try:
    from PIL import Image, ImageDraw
except Exception:  # pragma: no cover
    Image = None

ROOT = os.path.abspath(os.path.dirname(__file__))
REPO = os.path.dirname(ROOT)
OUT = os.path.join(ROOT, 'samples', 'proofs')
BASE = os.environ.get('SANDBOX_BASE', 'http://127.0.0.1:8080/sandbox/')
COMMON = 'index.html?art=p2&n=1&auto=0&sw=0&hud=0&sfx=0&seed=20260928'
URL_V1 = BASE + COMMON + '&engine=v1'
URL_V2 = BASE + COMMON + '&engine=v2'
FRAME_MS = 16.7
STRIP_AT = [400, 1200, 2000, 2750, 3300]

# perf name -> how each arm plays it and which state event routes to it on v2
PERFS = {
    'think': {'v1': 'think', 'v2': 'ponder', 'state': 'answer:pending', 'stateName': 'think'},
    'sad': {'v1': 'sad', 'v2': 'recoil', 'state': 'answer:wrong', 'stateName': 'sad'},
}

INIT = """
(() => {
  const orig = Element.prototype.animate;
  window.__animRec = null;
  Element.prototype.animate = function (kf, opts) {
    const a = orig.call(this, kf, opts);
    if (window.__animRec) { const R = window.__animRec; const rec = { t: performance.now() - R.t0, joint: this.dataset ? (this.dataset.joint || null) : null, kf: JSON.parse(JSON.stringify(kf)), opts: JSON.parse(JSON.stringify(opts || {})), a, start: null };
      R.push(rec); a.ready.then(() => { if (a.startTime !== null) rec.start = a.startTime - R.tl0; }).catch(() => {}); }
    return a;
  };
})();
"""

READY_V1 = 'window.__rigs && window.__rigs.length && typeof window.__rigs[0].think === "function"'
READY_V2 = 'window.__rigs && window.__rigs.length && typeof window.__rigs[0].ponder === "function" && window.__rigs[0].states'

HELPERS = """
  const r = window.__rigs[0]; const sleep = ms => new Promise(res => setTimeout(res, ms));
  const wrap = (name, ev) => { if (r['__w_' + name]) return; const proto = Object.getPrototypeOf(r); const f = (function find(o) { return o ? (Object.prototype.hasOwnProperty.call(o, name) ? o[name] : find(Object.getPrototypeOf(o))) : null; })(proto);
    r['__w_' + name] = true; r[name] = function (...args) { if (window.__evRec) window.__evRec.push({ t: performance.now() - window.__evRec.t0, kind: name, arg: ev(...args) }); return f.apply(this, args); }; };
  wrap('setMouth', s => s); wrap('blink', d => !!d); wrap('release', re => re.source);
  const FWD = re => [...r.live].filter(a => a.effect && a.effect.target && re.test(a.effect.target.getAttribute('data-joint') || '') && a.effect.getTiming().fill === 'forwards').length;
  const kfNorm = a => a.effect.getKeyframes().map(k => ({ transform: k.transform, offset: +k.computedOffset.toFixed(4), ...(k.opacity !== undefined ? { opacity: k.opacity } : {}) }));
  const timing = a => { const t = a.effect.getTiming(); return { duration: t.duration, delay: t.delay, iterations: t.iterations, easing: t.easing, fill: t.fill, direction: t.direction, endDelay: t.endDelay }; };
  const dump = () => ({
    anims: window.__animRec.map(x => ({ t: +x.t.toFixed(2), joint: x.joint, raw: x.kf, kf: kfNorm(x.a), timing: timing(x.a), composite: x.a.effect.composite, startRel: x.start === null ? null : +x.start.toFixed(2), playState: x.a.playState, replaceState: x.a.replaceState })),
    events: window.__evRec.map(x => ({ t: +x.t.toFixed(2), kind: x.kind, arg: x.arg })) });
"""

JS_BEAT = "async (m) => {" + HELPERS + """
  const held = FWD(/^(pupilL|pupilR|head|armR|armL|body|root|legL|legR)$/);
  const cues = []; const prev = r.onCue; if ('onCue' in r) r.onCue = (p, c) => { cues.push({ p, t: performance.now(), c }); if (prev) prev(p, c); };
  const t0 = performance.now(); window.__animRec = Object.assign([], { t0, tl0: document.timeline.currentTime }); window.__evRec = Object.assign([], { t0 });
  const pr = r[m.method](m.arg);
  const total = m.totalMs;
  while (performance.now() - t0 < total + 250) await new Promise(requestAnimationFrame);
  const busyAtEnd = r.busy; const mouthAtEnd = r._mouth; const heldAtEnd = FWD(/^(pupilL|pupilR|head|armR|armL|body|root|legL|legR)$/);
  await sleep(50); const d = dump(); window.__animRec = null; window.__evRec = null; if ('onCue' in r) r.onCue = prev;
  if (pr && pr.then) await pr;
  return { ...d, heldBefore: held, heldAtEnd, busyAtEnd, mouthAtEnd, lastPerf: r._lastPerf || null, plan: r._lastPerf && r._lastPerf.plan || null,
           cues: cues.map(c => ({ p: c.p, t: +(c.t - t0).toFixed(1), name: c.c && c.c.name })), windowMs: +(performance.now() - t0).toFixed(1) }; }"""

JS_STATE = "async (m) => {" + HELPERS + """
  const cues = []; const prev = r.onCue; r.onCue = (p, c) => { cues.push({ p, t: performance.now(), c }); if (prev) prev(p, c); };
  const states = []; const off = r.states.on(ev => { if (ev.type === 'enter') states.push(ev.to); });
  const t0 = performance.now(); const pr = r.states.fire(m.event); await pr; await sleep(300); r.onCue = prev; off();
  return { cues: cues.map(c => ({ p: c.p, t: +(c.t - t0).toFixed(1), name: c.c && c.c.name })), states, finalState: r.states.state, lastPerf: r._lastPerf && r._lastPerf.name, planTotal: r._lastPerf && r._lastPerf.plan && r._lastPerf.plan.totalMs }; }"""

JS_PERF_OFF = "async (m) => {" + HELPERS + """
  const cues = []; const prev = r.onCue; r.onCue = (p, c) => { cues.push(p); if (prev) prev(p, c); };
  const t0 = performance.now(); r[m.method](); await sleep(150); const busyDuring = r.busy; while (r.busy && performance.now() - t0 < 6000) await sleep(50); r.onCue = prev;
  return { perfSpecNull: r.perfSpec(m.perf) === null, busyDuring, busyAfter: r.busy, cues, ms: Math.round(performance.now() - t0) }; }"""


def raw_key(kfs):
    """The keyframes exactly as passed to animate() (the data text == the v1 source text, proven by k96_choreo_spec)."""
    return json.dumps([{'transform': k['transform'], **({'offset': k['offset']} if 'offset' in k else {})} for k in kfs], sort_keys=True)


def kf_key(kf):
    """Browser-normalised keyframes (effect.getKeyframes) for the v1-vs-v2 equality check."""
    return json.dumps([{'transform': k['transform'], 'offset': round(k['offset'], 3)} for k in kf], sort_keys=True)


def match_channels(choreo, rec, arm):
    """For every channel x joint of the data: exactly one recorded animate() call with the same keyframes on that joint."""
    used = set(); rows = []; extras = []
    for ch in choreo['channels']:
        want = raw_key(ch['keyframes'])
        for jn in ch['joints']:
            hits = [i for i, a in enumerate(rec['anims']) if a['joint'] == jn and raw_key(a['raw']) == want and i not in used]
            row = {'id': ch['id'], 'joint': jn, 'arm': arm, 'hits': len(hits)}
            if hits:
                i = hits[0]; used.add(i); a = rec['anims'][i]
                row.update({'t': a['t'], 'startRel': a['startRel'], 'timing': a['timing'], 'composite': a['composite'], 'kf': a['kf'], 'playStateAtEnd': a['playState'], 'replaceStateAtEnd': a['replaceState']})
            rows.append(row)
    for i, a in enumerate(rec['anims']):
        if i not in used: extras.append({'t': a['t'], 'joint': a['joint'], 'duration': a['timing']['duration'], 'fill': a['timing']['fill']})
    return rows, extras


def compare(choreo, v1, v2):
    r1, x1 = match_channels(choreo, v1, 'v1'); r2, x2 = match_channels(choreo, v2, 'v2')
    channels = []; ok = True
    for a, b in zip(r1, r2):
        c = {'id': a['id'], 'joint': a['joint'], 'v1_hits': a['hits'], 'v2_hits': b['hits']}
        if a['hits'] == 1 and b['hits'] == 1:
            dt = abs(a['t'] - b['t']); dstart = None if a['startRel'] is None or b['startRel'] is None else abs(a['startRel'] - b['startRel'])
            c.update({'v1_t': a['t'], 'v2_t': b['t'], 'call_dt_ms': round(dt, 2), 'start_dt_ms': None if dstart is None else round(dstart, 2), 'timing': a['timing'], 'timing_equal': a['timing'] == b['timing'],
                      'composite': a['composite'], 'composite_equal': a['composite'] == b['composite'], 'keyframes_equal': kf_key(a['kf']) == kf_key(b['kf']),
                      'v1_playStateAtEnd': a['playStateAtEnd'], 'v2_playStateAtEnd': b['playStateAtEnd'], 'v1_replaceState': a['replaceStateAtEnd'], 'v2_replaceState': b['replaceStateAtEnd']})
            # a fill:forwards channel must not be holding the pose at the end on either arm: released (cancel -> 'idle'), or
            # superseded by a newer replace-composite fill layer (WAAPI auto-removal, replaceState 'removed' - happens on v1 when the
            # legacy idle look() fires mid-think because rig.js scheduleLook has no busy check; reported, not a port difference).
            gone = lambda ps, rs: ps == 'idle' or rs == 'removed'
            c['released_or_finished_both'] = all(gone(ps, rs) if a['timing']['fill'] == 'forwards' else ps in ('idle', 'finished') or rs == 'removed'
                                                 for ps, rs in ((a['playStateAtEnd'], a['replaceStateAtEnd']), (b['playStateAtEnd'], b['replaceStateAtEnd'])))
            lat = lambda r: None if r['startRel'] is None else round(r['startRel'] - r['t'], 2)
            c['v1_start_latency_ms'] = lat(a); c['v2_start_latency_ms'] = lat(b)
            c['start_latency_ok'] = all(l is not None and -FRAME_MS <= l <= 2 * FRAME_MS + 1 for l in (c['v1_start_latency_ms'], c['v2_start_latency_ms']))
            c['pass'] = dt <= FRAME_MS and c['start_latency_ok'] and c['timing_equal'] and c['composite_equal'] and c['keyframes_equal'] and c['released_or_finished_both']
        else:
            c['pass'] = False
        ok = ok and c['pass']; channels.append(c)
    # events: mouth / blink / release sequences
    # blink: only the performance's OWN blinks (declared in the data) are compared; the seeded idle blink scheduler runs on both
    # arms independently of the beat (rig.js scheduleBlink) and its jitter is idle noise, not a port difference -> reported as idle_blinks
    blink_at = [e['atMs'] for e in choreo['events'] if 'blink' in e]
    own = lambda t: any(abs(t - a) <= 100 for a in blink_at)
    def seq(rec, kind): return [e for e in rec['events'] if e['kind'] == kind and (kind != 'blink' or own(e['t']))]
    ev = {'idle_blinks': {'v1': [e['t'] for e in v1['events'] if e['kind'] == 'blink' and not own(e['t'])], 'v2': [e['t'] for e in v2['events'] if e['kind'] == 'blink' and not own(e['t'])]}}
    for kind in ('setMouth', 'blink', 'release'):
        e1, e2 = seq(v1, kind), seq(v2, kind)
        rows = []; k_ok = len(e1) == len(e2) and len(e1) == sum(1 for e in choreo['events'] if {'setMouth': 'mouth', 'blink': 'blink', 'release': 'release'}[kind] in e)
        for a, b in zip(e1, e2):
            dt = abs(a['t'] - b['t']); same = a['arg'] == b['arg'] and dt <= FRAME_MS
            rows.append({'v1': a, 'v2': b, 'dt_ms': round(dt, 2), 'pass': same}); k_ok = k_ok and same
        ev[kind] = {'v1_count': len(e1), 'v2_count': len(e2), 'rows': rows, 'pass': k_ok}
        ok = ok and k_ok
    return ok, channels, ev, {'v1': x1, 'v2': x2}


async def arm(browser, url, ready, reduced=False):
    ctx = await browser.new_context(viewport={'width': 640, 'height': 720}, reduced_motion='reduce' if reduced else 'no-preference')
    page = await ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    await page.add_init_script(INIT)
    await page.goto(url, wait_until='networkidle'); await page.wait_for_function(ready, timeout=15000); await page.wait_for_timeout(600)
    return ctx, page, errs


async def strip(browser, perf, spec, choreo):
    if Image is None: return None
    frames = {}
    for eng, url, ready in (('v1', URL_V1, READY_V1), ('v2', URL_V2, READY_V2)):
        ctx, page, _ = await arm(browser, url, ready)
        method = spec[eng]
        await page.evaluate("(m) => { const r = window.__rigs[0]; r[m](); }", method)
        t0 = time.perf_counter(); shots = []
        for at in STRIP_AT:
            while (time.perf_counter() - t0) * 1000 < at: await asyncio.sleep(0.005)
            shots.append((at, await page.locator('.slot').first.screenshot()))
        frames[eng] = shots; await ctx.close()
    import io
    imgs = {e: [Image.open(io.BytesIO(b)).convert('RGB') for _, b in frames[e]] for e in frames}
    w, h = imgs['v1'][0].size; W = w * len(STRIP_AT); H = h * 2 + 44
    canvas = Image.new('RGB', (W, H), (11, 18, 36)); d = ImageDraw.Draw(canvas)
    for row, e in enumerate(('v1', 'v2')):
        for i, im in enumerate(imgs[e]): canvas.paste(im.resize((w, h)), (i * w, 22 + row * (h + 0)))
        d.text((6, 4 + row * (h + 0)), f"{e}: {'rig.js ' + spec['v1'] + '()' if e == 'v1' else 'perform(' + repr(perf) + ') from owl.motion.json choreo'}", fill=(230, 230, 230))
    for i, at in enumerate(STRIP_AT): d.text((i * w + 6, H - 18), f'{at} ms', fill=(200, 200, 200))
    path = os.path.join(OUT, f'k96_{perf}_strip.png'); canvas.save(path); return os.path.relpath(path, REPO)


async def main():
    perf = sys.argv[sys.argv.index('--perf') + 1] if '--perf' in sys.argv else 'think'
    spec = PERFS[perf]
    with open(os.path.join(ROOT, 'companions', 'owl.motion.json')) as fh: owl = json.load(fh)
    choreo = owl['acting']['performances'][perf]['choreo']; total = choreo['totalMs']
    os.makedirs(OUT, exist_ok=True)
    out = {'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'perf': perf, 'frame_ms': FRAME_MS, 'totalMs': total, 'urls': {'v1': URL_V1, 'v2': URL_V2}, 'checks': {}}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1) timing run, both arms
        c1, p1, e1 = await arm(b, URL_V1, READY_V1); v1 = await p1.evaluate(JS_BEAT, {'method': spec['v1'], 'arg': None, 'totalMs': total}); await c1.close()
        c2, p2, e2 = await arm(b, URL_V2, READY_V2); v2 = await p2.evaluate(JS_BEAT, {'method': spec['v2'], 'arg': 'small', 'totalMs': total})
        st = await p2.evaluate(JS_STATE, {'event': spec['state']}); await c2.close()
        ok, channels, events, extras = compare(choreo, v1, v2)
        out['channels'] = channels; out['events'] = events; out['extras_not_in_data'] = extras
        out['end_state'] = {'v1': {'mouth': v1['mouthAtEnd'], 'busy': v1['busyAtEnd'], 'held_forwards_before': v1['heldBefore'], 'held_forwards_after': v1['heldAtEnd']},
                            'v2': {'mouth': v2['mouthAtEnd'], 'busy': v2['busyAtEnd'], 'held_forwards_before': v2['heldBefore'], 'held_forwards_after': v2['heldAtEnd'], 'plan': v2['plan'], 'cues': v2['cues']}}
        out['state_route'] = st
        C = out['checks']
        C['all_channels_matched_once_both_arms'] = all(c['v1_hits'] == 1 and c['v2_hits'] == 1 for c in channels)
        C['every_channel_scheduled_within_one_frame'] = all(c.get('call_dt_ms', 99) <= FRAME_MS for c in channels)
        C['every_channel_start_latency_le_two_frames_both_arms'] = all(c.get('start_latency_ok') for c in channels)
        C['every_channel_timing_equal'] = all(c.get('timing_equal') for c in channels)
        C['every_channel_composite_equal'] = all(c.get('composite_equal') for c in channels)
        C['every_channel_keyframes_equal'] = all(c.get('keyframes_equal') for c in channels)
        C['mouth_sequence_equal_within_frame'] = events['setMouth']['pass'] and events['setMouth']['v1_count'] >= 3
        C['blink_calls_equal_within_frame'] = events['blink']['pass'] and events['blink']['v1_count'] == len([e for e in choreo['events'] if 'blink' in e])
        C['release_calls_equal_within_frame'] = events['release']['pass']
        # end state: mouth closed, rig free, and every fill:forwards CHANNEL of the performance cancelled (idle look() layers
        # from the unseeded idle scheduler may land after settle on either arm - they are reported under held_forwards_after, not failed)
        C['end_state_v1_closed_free'] = v1['mouthAtEnd'] == 'closed' and v1['busyAtEnd'] is False
        C['end_state_v2_closed_free'] = v2['mouthAtEnd'] == 'closed' and v2['busyAtEnd'] is False
        C['every_forwards_channel_released_both_arms'] = all(c.get('released_or_finished_both') for c in channels)
        C['v2_cues_perf_then_settle'] = [c['p'] for c in v2['cues'] if c['p'] in ('perf', 'settle')] == ['perf', 'settle'] and v2['cues'][0]['name'] == perf
        C['v2_settle_at_totalMs_within_frame'] = any(c['p'] == 'settle' and abs(c['t'] - total) <= FRAME_MS + 4 for c in v2['cues'])
        C['v2_plays_from_data'] = bool(v2['plan']) and v2['plan'].get('channels') == len(choreo['channels']) and v2['plan'].get('events') == len(choreo['events'])
        C['state_route_perf_settle_idle'] = [c['p'] for c in st['cues'] if c['p'] in ('perf', 'settle')] == ['perf', 'settle'] and st['lastPerf'] == perf and st['states'][:1] == [spec['stateName']] and st['finalState'] == 'idle'
        C['no_page_errors_timing_run'] = not e1 and not e2
        out['errors'] = {'v1': e1, 'v2': e2}
        # 2) reduced motion, both arms
        c1, p1, e1 = await arm(b, URL_V1, READY_V1, reduced=True); r1 = await p1.evaluate(JS_BEAT, {'method': spec['v1'], 'arg': None, 'totalMs': choreo['reduced']['closeAtMs']}); await c1.close()
        c2, p2, e2 = await arm(b, URL_V2, READY_V2, reduced=True); r2 = await p2.evaluate(JS_BEAT, {'method': spec['v2'], 'arg': 'small', 'totalMs': choreo['reduced']['closeAtMs']}); await c2.close()
        nonlid = lambda rec: [a for a in rec['anims'] if a['joint'] not in ('lidL', 'lidR')]
        rm = {'v1': {'non_lid_anims': len(nonlid(r1)), 'events': r1['events'], 'mouthAtEnd': r1['mouthAtEnd'], 'busy': r1['busyAtEnd']}, 'v2': {'non_lid_anims': len(nonlid(r2)), 'events': r2['events'], 'mouthAtEnd': r2['mouthAtEnd'], 'busy': r2['busyAtEnd'], 'cues': r2['cues']}}
        out['reduced'] = rm
        m1 = [(e['arg'], e['t']) for e in r1['events'] if e['kind'] == 'setMouth']; m2 = [(e['arg'], e['t']) for e in r2['events'] if e['kind'] == 'setMouth']
        C['reduced_no_body_animation_both_arms'] = rm['v1']['non_lid_anims'] == 0 and rm['v2']['non_lid_anims'] == 0
        C['reduced_mouth_sequence_equal_within_frame'] = len(m1) == len(m2) and all(a[0] == b[0] and abs(a[1] - b[1]) <= FRAME_MS for a, b in zip(m1, m2)) and m1[-1][0] == 'closed'
        C['reduced_blink_equal'] = [e['arg'] for e in r1['events'] if e['kind'] == 'blink'] == [e['arg'] for e in r2['events'] if e['kind'] == 'blink']
        C['no_page_errors_reduced'] = not e1 and not e2
        # 3) legacy fallback ?perf=0 on v2
        c3, p3, e3 = await arm(b, URL_V2 + '&perf=0', READY_V2); lg = await p3.evaluate(JS_PERF_OFF, {'method': spec['v2'], 'perf': perf}); await c3.close()
        out['legacy_perf_off'] = lg
        C['perf_off_legacy_alive'] = lg['perfSpecNull'] and lg['busyDuring'] and not lg['busyAfter'] and 'perf' not in lg['cues'] and not e3
        # 4) strip
        out['strip_png'] = await strip(b, perf, spec, choreo)
        await b.close()
    out['pass_all'] = all(out['checks'].values())
    out['summary'] = {'channels': len(channels), 'max_call_dt_ms': max((c.get('call_dt_ms', 0) for c in channels), default=0), 'max_start_dt_ms': max((c.get('start_dt_ms') or 0 for c in channels), default=0),
                      'mouth_events': events['setMouth']['v1_count'], 'max_event_dt_ms': max([r['dt_ms'] for k, v in events.items() if k != 'idle_blinks' for r in v['rows']], default=0)}
    path = os.path.join(OUT, f'k96_{perf}.json')
    with open(path, 'w') as fh: json.dump(out, fh, indent=1); fh.write('\n')
    print(json.dumps({'pass_all': out['pass_all'], 'checks': out['checks'], 'summary': out['summary']}, indent=1))
    for c in channels: print(f"{c['id']:>3} {c['joint']:<7} hits v1/v2 {c['v1_hits']}/{c['v2_hits']} call_dt {c.get('call_dt_ms')} latency v1/v2 {c.get('v1_start_latency_ms')}/{c.get('v2_start_latency_ms')} (start_dt info {c.get('start_dt_ms')}) timing_eq {c.get('timing_equal')} kf_eq {c.get('keyframes_equal')} -> {'PASS' if c['pass'] else 'FAIL'}")
    print('json', os.path.relpath(path, REPO), 'strip', out['strip_png'])
    sys.exit(0 if out['pass_all'] else 1)


if __name__ == '__main__':
    asyncio.run(main())
