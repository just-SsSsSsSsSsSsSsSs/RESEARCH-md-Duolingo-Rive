#!/usr/bin/env python3
"""
K9.4 proof: owner-vision performances measured against the budgets DECLARED in PROGRESS.md (K9.4 RESEARCH)
and carried in owl.motion.json acting.performances (annex d: budgets before implementation).

Per run (3 runs, medians reported; every check must pass in every run):
  escalation   rig.escalate(ch) x7 for triumph/oops/puzzled == small small medium small small medium large
  triumph      large: root rotation, UNWRAPPED (atan2 wraps at +-180), accumulates >= 300 deg mid-air and |rot| < 2 deg at
               the 'land' cue; body squash layer back within 1 pct of 1.0 within settleWithinMs after 'land';
               cue order perf < anticipate < jump < land < settle; tier VFX names fired via cue 'fx' match the spec tier list
  oops         take structure from the squash-layer keyframes: anticipation (scaleY < 1) lasts anticipateMs[min-Q, max+Q];
               extreme stretch scaleY inside stretchScaleY and held holdMs[min-Q, max+Q]; medium/large fire 2 anticipate cues
               (double take); large fires 'jiggle' with n cycles and the body layer amplitude decays by jiggleDecay per cycle
               (read from the keyframes the engine wrote); total <= totalMaxMs
  puzzled      pupil radius reaches spiralRadiusPx[1] (+-0.6) by the end of spiralMs; head |rot| >= headDeg * 0.9 for the tier;
               after the 'recentre' cue the pupil layers are gone and the pupil offset is <= 0.5 px within recentreMs;
               total <= totalMaxMs; medium+ fires 'bubble'
  moving hold  20 s idle census: >= 3 distinct impulse names, every gap inside intervalMs[min-50, max+50], no impulse while busy,
               no joint repeated within minGapSameJointMs
  reduced      prefers-reduced-motion emulated: triumph/oops/puzzled add ZERO layers to root/body/head/arm joints (face only);
               legacy celebrate()/think() also add zero root/body layers
Q = one rAF quantum (16.7 ms), the tolerance unit, disclosed in the output.
Output: samples/proofs/g13_performances.json + g13_performances_strip.png (triumph large: anticipate / apex+roll / land / wink)
"""
import asyncio
import json
import os
import re
import statistics
import sys
import time

from playwright.async_api import async_playwright
try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:  # pragma: no cover
    Image = None

ROOT = os.path.abspath(os.path.dirname(__file__))
OUT = os.path.join(ROOT, 'samples', 'proofs')
BASE = os.environ.get('SANDBOX_BASE', 'http://127.0.0.1:8080/sandbox/')
URL = BASE + 'index.html?engine=v2&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0'
RUNS = int(os.environ.get('PERF_RUNS', '3'))
READY = 'window.__rigs && window.__rigs.length && typeof window.__rigs[0].triumph === "function" && typeof window.__rigs[0].puzzled === "function"'
Q = 16.7

HELPERS = """
  const r = window.__rigs[0]; const sleep = ms => new Promise(res => setTimeout(res, ms));
  const M = n => { const el = r.j(n); if (!el) return [1,0,0,1,0,0]; const t = getComputedStyle(el).transform; const m = t.match(/matrix\\(([^)]+)\\)/); return m ? m[1].split(',').map(Number) : [1,0,0,1,0,0]; };
  const ROT = n => { const v = M(n); return Math.atan2(v[1], v[0]) * 180 / Math.PI; };
  const SQ = () => { const k = r.squashLayer.effect.getKeyframes(); const m = /scale\\(([^,]+),([^)]+)\\)/.exec(k[0].transform); return m ? +m[2] : 1; };
  const PUP = () => { const v = M('pupilL'); return Math.hypot(v[4], v[5]); };
  const LAYERS = re => [...r.live].filter(a => a.effect && a.effect.target && re.test(a.effect.target.getAttribute('data-joint') || '')).length;
  const BODYKF = () => r.j('body').getAnimations().filter(a => a !== r.squashLayer).map(a => a.effect.getKeyframes().map(k => k.transform));   // element-level: fire-and-forget layers are not in rig.live
"""

JS_ESCALATION = "() => {" + HELPERS + """
  const out = {}; for (const ch of ['triumph','oops','puzzled']) { r._esc = r._esc || {}; delete r._esc[ch]; const s = []; for (let i = 0; i < 7; i++) s.push(r.escalate(ch)); out[ch] = s; }
  return out; }"""

JS_PERF = "async (args) => {" + HELPERS + """
  const [name, tier] = args;
  const cues = []; const prev = r.onCue; r.onCue = (p, c) => { cues.push({ p, t: performance.now(), c }); if (prev) prev(p, c); };
  const s = []; const t0 = performance.now(); const pr = r[name](tier);
  // sample while busy AND for a 700 ms tail after busy clears: the landing squash spring keeps settling after the performance
  // releases the rig (settleWithinMs is counted from the 'land' cue, so the window must outlive busy)
  let tail = null;
  while (performance.now() - t0 < 7000) { if (!r.busy) { if (tail === null) tail = performance.now(); else if (performance.now() - tail > 700) break; } s.push({ t: performance.now() - t0, rot: ROT('root'), sq: SQ(), pup: PUP(), head: ROT('head'), pupLayers: LAYERS(/^pupil/), bodyKf: name === 'oops' ? BODYKF() : null }); await new Promise(requestAnimationFrame); }
  await pr; r.onCue = prev;
  const settleCue = cues.find(c => c.p === 'settle');
  return { name, tier, totalMs: settleCue ? settleCue.t - t0 : performance.now() - t0, windowMs: performance.now() - t0, cues: cues.map(c => ({ p: c.p, t: c.t - t0, vfx: c.c && c.c.vfx, cycles: c.c && c.c.cycles })), samples: s, plan: r._lastPerf && r._lastPerf.plan || null }; }"""

JS_HOLD = "async (ms) => {" + HELPERS + """
  const holds = []; const prev = r.onCue; r.onCue = (p, c) => { if (p === 'hold') holds.push({ t: performance.now(), n: c.impulse, j: c.joints, busy: r.busy }); if (prev) prev(p, c); };
  const t0 = performance.now(); while (performance.now() - t0 < ms) await sleep(100); r.onCue = prev;
  return holds.map(h => ({ t: h.t - t0, n: h.n, j: h.j, busy: h.busy })); }"""

JS_REDUCED = "async () => {" + HELPERS + """
  const out = {}; const base = { root: LAYERS(/^root$/), body: LAYERS(/^body$/), head: LAYERS(/^head$/), arm: LAYERS(/^arm/) };
  for (const [name, tier] of [['triumph','large'], ['oops','large'], ['puzzled','large']]) {
    const t0 = performance.now(); const pr = r[name](tier); let peak = { root: 0, body: 0, head: 0, arm: 0 };
    while (r.busy && performance.now() - t0 < 3000) { peak.root = Math.max(peak.root, LAYERS(/^root$/) - base.root); peak.body = Math.max(peak.body, LAYERS(/^body$/) - base.body); peak.head = Math.max(peak.head, LAYERS(/^head$/) - base.head); peak.arm = Math.max(peak.arm, LAYERS(/^arm/) - base.arm); await sleep(16); }
    await pr; out[name] = { addedLayers: peak, ms: Math.round(performance.now() - t0) };
  }
  for (const legacy of ['celebrate', 'think']) { const t0 = performance.now(); r[legacy](); let peak = 0; while (r.busy && performance.now() - t0 < 3000) { peak = Math.max(peak, LAYERS(/^(root|body)$/) - base.root - base.body); await sleep(16); } out['legacy_' + legacy] = { addedRootBodyLayers: peak }; }
  out.vfxSkippedReduced = window.__foley ? window.__foley.vfx.stats.skippedReduced : null; out.matches = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return out; }"""


def cue_t(res, name, nth=0):
    hits = [c['t'] for c in res['cues'] if c['p'] == name]
    return hits[nth] if len(hits) > nth else None


def unwrap_peak(samples):
    """Accumulated |rotation| with the atan2 +-180 wrap removed (a full 360 roll reads as 360, not 178)."""
    acc = 0.0; peak = 0.0
    for i in range(1, len(samples)):
        d = samples[i]['rot'] - samples[i - 1]['rot']
        if d > 180: d -= 360
        elif d < -180: d += 360
        acc += d; peak = max(peak, abs(acc))
    return peak


def analyse_triumph(res, T, tier):
    s = res['samples']; land = cue_t(res, 'land'); out = {'tier': tier, 'total_ms': round(res['totalMs'], 1)}
    out['rot_max_deg_unwrapped'] = round(unwrap_peak(s), 1) if s else None
    out['rot_max_deg_wrapped'] = round(max(abs(x['rot']) for x in s), 1) if s else None
    near = min(s, key=lambda x: abs(x['t'] - land)) if (land is not None and s) else None
    out['rot_at_land_deg'] = round(abs(near['rot']), 2) if near else None
    after = [x for x in s if land is not None and x['t'] >= land]
    # settled = first instant after which EVERY later sample stays within 1 pct of rest (a spring passing through 1.0 does not count)
    settled = None
    for i in range(len(after)):
        if after[i]['t'] - land > 60 and all(abs(y['sq'] - 1) <= 0.01 for y in after[i:]): settled = after[i]['t'] - land; break
    out['settle_ms_after_land'] = round(settled, 1) if settled is not None else None
    out['squash_tail_ms'] = round(after[-1]['t'] - land, 1) if after else None
    order = [c['p'] for c in res['cues'] if c['p'] in ('perf', 'anticipate', 'jump', 'land', 'settle')]
    out['cue_order'] = order
    out['fx'] = [c['vfx'] for c in res['cues'] if c['p'] == 'fx']
    want = T['tiers'][tier]
    out['checks'] = {
        'cue_order': order == ['perf', 'anticipate', 'jump', 'land', 'settle'],
        'roll_360_if_large': (out['rot_max_deg_unwrapped'] or 0) >= 300 if want['roll'] else (out['rot_max_deg_unwrapped'] or 0) < 30,
        'level_at_land': out['rot_at_land_deg'] is not None and out['rot_at_land_deg'] < 2,
        'settle_within_budget': out['settle_ms_after_land'] is not None and out['settle_ms_after_land'] <= T['settleWithinMs'],
        'vfx_match_tier': out['fx'] == want['vfx'],
    }
    return out


def analyse_oops(res, O, tier):
    s = res['samples']; out = {'tier': tier, 'total_ms': round(res['totalMs'], 1), 'plan': res['plan']}
    phases = []
    for x in s:
        ph = 'squash' if x['sq'] < 0.999 else ('stretch' if x['sq'] > 1.001 else 'rest')
        if phases and phases[-1]['ph'] == ph: phases[-1]['end'] = x['t']; phases[-1]['vals'].append(x['sq'])
        else: phases.append({'ph': ph, 'start': x['t'], 'end': x['t'], 'vals': [x['sq']]})
    take_t = cue_t(res, 'take'); recoil_t = cue_t(res, 'recoil')
    squashes = [p for p in phases if p['ph'] == 'squash' and (take_t is None or p['start'] < take_t)]
    first_stretch = next((p for p in phases if p['ph'] == 'stretch' and take_t is not None and p['start'] >= take_t - 2 * Q), None)
    out['anticipation_ms'] = [round(p['end'] - p['start'] + Q, 1) for p in squashes]
    out['stretch_scaleY'] = round(max(first_stretch['vals']), 3) if first_stretch else None
    out['hold_ms'] = round(recoil_t - take_t, 1) if (take_t is not None and recoil_t is not None) else None
    out['anticipate_cues'] = sum(1 for c in res['cues'] if c['p'] == 'anticipate')
    jig = next((c for c in res['cues'] if c['p'] == 'jiggle'), None)
    out['jiggle_cycles'] = jig['cycles'] if jig else 0
    decay_ok = True; amps = []
    if jig:
        kfs = next((k for x in s if x['bodyKf'] for k in x['bodyKf'] if len(k) > 4), None)
        if kfs:
            vals = [float(m.group(1)) for k in kfs for m in [re.search(r'scale\(([^,]+),', k)] if m]
            amps = [round(1 - v, 3) for v in vals if v < 1]
            decay_ok = len(amps) == jig['cycles'] and all(amps[i + 1] <= amps[i] * O['jiggleDecay'] + 1e-6 for i in range(len(amps) - 1))
        else:
            decay_ok = False
    out['jiggle_amps'] = amps
    want = O['tiers'][tier]; A = O['anticipateMs']; H = O['holdMs']
    out['checks'] = {
        'anticipation_in_budget': bool(out['anticipation_ms']) and all(A[0] - Q <= a <= A[1] + Q for a in out['anticipation_ms']),
        'stretch_in_budget': out['stretch_scaleY'] is not None and O['stretchScaleY'][0] - 0.005 <= out['stretch_scaleY'] <= O['stretchScaleY'][1] + 0.005,
        'hold_in_budget': out['hold_ms'] is not None and H[0] - Q <= out['hold_ms'] <= H[1] + Q,
        'double_take_by_tier': out['anticipate_cues'] == (2 if want['doubleTake'] else 1),
        'jiggle_by_tier': out['jiggle_cycles'] == want['jiggle'] and decay_ok,
        'total_le_max': out['total_ms'] <= O['totalMaxMs'] + Q,
    }
    return out


def analyse_puzzled(res, Z, tier):
    s = res['samples']; out = {'tier': tier, 'total_ms': round(res['totalMs'], 1)}
    spiral_end = [x for x in s if Z['spiralMs'] - 2 * Q <= x['t'] <= Z['spiralMs'] + 6 * Q]
    out['pupil_radius_at_spiral_end'] = round(max(x['pup'] for x in spiral_end), 2) if spiral_end else None
    out['head_max_deg'] = round(max(abs(x['head']) for x in s), 1) if s else None
    rc = cue_t(res, 'recentre')
    after = [x for x in s if rc is not None and rc + Z['recentreMs'] <= x['t'] <= rc + Z['recentreMs'] + 4 * Q]
    out['pupil_px_after_recentre'] = round(min(x['pup'] for x in after), 2) if after else None
    out['pupil_layers_after_recentre'] = min(x['pupLayers'] for x in after) if after else None
    out['fx'] = [c['vfx'] for c in res['cues'] if c['p'] == 'fx']
    want = Z['tiers'][tier]
    out['checks'] = {
        'spiral_reaches_outer_radius': out['pupil_radius_at_spiral_end'] is not None and abs(out['pupil_radius_at_spiral_end'] - Z['spiralRadiusPx'][1]) <= 0.6,
        'head_tilt_by_tier': out['head_max_deg'] is not None and out['head_max_deg'] >= want['headDeg'] * 0.9,
        'recentre_within_budget': out['pupil_layers_after_recentre'] == 0 and out['pupil_px_after_recentre'] is not None and out['pupil_px_after_recentre'] <= 0.5,
        'vfx_match_tier': out['fx'] == want['vfx'],
        'total_le_max': out['total_ms'] <= Z['totalMaxMs'] + Q,
    }
    return out


def analyse_hold(holds, M, window_ms):
    gaps = [round(holds[i]['t'] - holds[i - 1]['t']) for i in range(1, len(holds))]
    joint_ok = True; last = {}
    for h in holds:
        for j in h['j']:
            if j in last and h['t'] - last[j] < M['minGapSameJointMs']: joint_ok = False
            last[j] = h['t']
    names = sorted({h['n'] for h in holds})
    return {'window_ms': window_ms, 'count': len(holds), 'names': names, 'gaps_ms': gaps, 'while_busy': sum(1 for h in holds if h['busy']),
            'checks': {'ge_3_names': len(names) >= 3, 'gaps_in_budget': len(gaps) >= 2 and all(M['intervalMs'][0] - 50 <= g <= M['intervalMs'][1] + 50 for g in gaps),
                       'none_while_busy': not any(h['busy'] for h in holds), 'no_joint_repeat_within_gap': joint_ok}}


async def strip(b, T):
    ctx = await b.new_context(viewport=dict(width=1000, height=900), device_scale_factor=2); pg = await ctx.new_page()
    await pg.goto(URL, wait_until='networkidle'); await pg.wait_for_function(READY); await pg.wait_for_timeout(500)
    await pg.evaluate("document.querySelectorAll('.star').forEach(e => e.remove()); const h = document.getElementById('hud'); if (h) h.style.display = 'none'")
    box = await pg.evaluate("(() => { const r = window.__rigs[0].svg.getBoundingClientRect(); return {x: Math.max(0, r.left - 120), y: Math.max(0, r.top + window.scrollY - 140), width: r.width + 240, height: r.height + 180}; })()")
    await pg.evaluate("() => { window.__rigs[0].triumph('large'); return 0; }")
    t0 = time.time() * 1000; shots = []
    air = T['airMs']; marks = [('anticipate', 120), ('apex + roll', 260 + air * 0.5), ('land', 260 + air + 40), ('wink', 260 + air + 420)]
    for name, at in marks:
        wait = at - (time.time() * 1000 - t0)
        if wait > 0: await pg.wait_for_timeout(wait)
        pth = os.path.join(OUT, f'g13_perf_{len(shots)}.png'); t_shot = time.time() * 1000 - t0
        await pg.screenshot(path=pth, clip=box, full_page=True); shots.append((name, t_shot, pth))
    await pg.wait_for_function('!window.__rigs[0].busy', timeout=8000); await ctx.close()
    if not Image: return None
    ims = [Image.open(p_).convert('RGB') for _, _, p_ in shots]; w = max(i.width for i in ims); h = max(i.height for i in ims); cap = 40
    sheet = Image.new('RGB', (w * len(ims), h + cap), (24, 26, 34)); d = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
    except Exception: font = None
    for k, ((name, at, _), im) in enumerate(zip(shots, ims)):
        sheet.paste(im, (k * w, cap)); d.text((k * w + 10, 10), f'triumph large: {name}  t+{int(at)} ms', fill=(255, 209, 102), font=font)
        if k: d.line([(k * w, 0), (k * w, h + cap)], fill=(60, 64, 80), width=2)
    sheet.save(os.path.join(OUT, 'g13_performances_strip.png'))
    for _, _, p_ in shots: os.remove(p_)
    return {'file': 'g13_performances_strip.png', 'frames': [{'label': n, 'captured_ms': round(t, 1)} for n, t, _ in shots]}


async def run_once(b, spec):
    Pf = spec['acting']['performances']
    ctx = await b.new_context(viewport=dict(width=1000, height=900)); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    await pg.goto(URL, wait_until='networkidle'); await pg.wait_for_function(READY); await pg.wait_for_timeout(500)
    R = {'escalation': await pg.evaluate(JS_ESCALATION), 'triumph': {}, 'oops': {}, 'puzzled': {}}
    await pg.evaluate("window.__rigs[0]._esc = {}")
    for name, fn, P in (('triumph', analyse_triumph, Pf['triumph']), ('oops', analyse_oops, Pf['oops']), ('puzzled', analyse_puzzled, Pf['puzzled'])):
        for tier in ('small', 'medium', 'large'):
            R[name][tier] = fn(await pg.evaluate(JS_PERF, [name, tier]), P, tier); await pg.wait_for_timeout(350)
    R['moving_hold'] = analyse_hold(await pg.evaluate(JS_HOLD, 20000), Pf['movingHold'], 20000)
    R['errors'] = errs[:]
    await ctx.close()
    ctx = await b.new_context(viewport=dict(width=1000, height=900), reduced_motion='reduce'); pg = await ctx.new_page()
    await pg.goto(URL, wait_until='networkidle'); await pg.wait_for_function(READY); await pg.wait_for_timeout(400)
    red = await pg.evaluate(JS_REDUCED); await ctx.close()
    red['checks'] = {'media_matches': red['matches'] is True,
                     'zero_body_layers_all_performances': all(all(v['addedLayers'][k] == 0 for k in ('root', 'body', 'head', 'arm')) for n, v in red.items() if n in ('triumph', 'oops', 'puzzled')),
                     'legacy_zero_root_body': red['legacy_celebrate']['addedRootBodyLayers'] == 0 and red['legacy_think']['addedRootBodyLayers'] == 0}
    R['reduced'] = red
    want = ['small', 'small', 'medium', 'small', 'small', 'medium', 'large']
    R['checks'] = {'escalation_sequence': all(R['escalation'][ch] == want for ch in ('triumph', 'oops', 'puzzled')), 'no_errors': len(errs) == 0}
    return R


def all_checks(R):
    flat = dict(R['checks'])
    for ch in ('triumph', 'oops', 'puzzled'):
        for tier, v in R[ch].items():
            for k, ok in v['checks'].items(): flat[f'{ch}.{tier}.{k}'] = ok
    for k, ok in R['moving_hold']['checks'].items(): flat[f'hold.{k}'] = ok
    for k, ok in R['reduced']['checks'].items(): flat[f'reduced.{k}'] = ok
    return flat


async def main():
    os.makedirs(OUT, exist_ok=True)
    spec = json.load(open(os.path.join(ROOT, 'companions', 'owl.motion.json'), encoding='utf-8'))
    out = {'tool': 'sandbox/perf_proof.py', 'budgets_declared': spec['acting']['performances'], 'captured_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
           'env': 'headless Chromium, DPR 1, CPU 1x, sfx=0, n=1; tolerance Q = one rAF quantum 16.7 ms unless stated; root rotation unwrapped', 'runs': []}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for i in range(RUNS):
            R = await run_once(b, spec); R['flat'] = all_checks(R); R['pass_all'] = all(R['flat'].values()); out['runs'].append(R)
            print(f"run {i + 1}: pass_all {R['pass_all']} failing {[k for k, v in R['flat'].items() if not v]}", flush=True)
        out['strip'] = await strip(b, spec['acting']['performances']['triumph'])
        await b.close()
    med = lambda ch, tier, k: statistics.median([r[ch][tier][k] for r in out['runs'] if r[ch][tier].get(k) is not None]) if any(r[ch][tier].get(k) is not None for r in out['runs']) else None
    out['summary'] = {
        'pass_all': all(r['pass_all'] for r in out['runs']), 'runs': RUNS,
        'failing_any_run': sorted({k for r in out['runs'] for k, v in r['flat'].items() if not v}),
        'triumph_large_median': {k: med('triumph', 'large', k) for k in ('rot_max_deg_unwrapped', 'rot_at_land_deg', 'settle_ms_after_land', 'total_ms')},
        'oops_large_median': {k: med('oops', 'large', k) for k in ('stretch_scaleY', 'hold_ms', 'total_ms')},
        'oops_anticipation_ms_all': [a for r in out['runs'] for t in r['oops'].values() for a in t['anticipation_ms']],
        'puzzled_large_median': {k: med('puzzled', 'large', k) for k in ('pupil_radius_at_spiral_end', 'head_max_deg', 'pupil_px_after_recentre', 'total_ms')},
        'hold_counts': [r['moving_hold']['count'] for r in out['runs']], 'hold_names': sorted({n for r in out['runs'] for n in r['moving_hold']['names']}),
    }
    json.dump(out, open(os.path.join(OUT, 'g13_performances.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(json.dumps(out['summary'], indent=1, ensure_ascii=False))
    return 0 if out['summary']['pass_all'] else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
