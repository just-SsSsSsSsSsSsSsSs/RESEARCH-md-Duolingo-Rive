#!/usr/bin/env python3
"""K9.3-3 intent proof - "look before you leap", measured against the budgets DECLARED in spec.acting.intent.

A = intent on, B = ?intent=0. Every rAF (~16.7 ms) we sample:
  pupilL/R computed translate, head ADDED rotation (sum of the fill:forwards intent head layer, read from the live
  animation), body squash layer keyframe scaleY (the crouch), host translate, plus engine cue timestamps.
Why layers and not only computed transforms: the idle breath is a permanent +-1 deg / +-2.5 pct wobble by design,
so "settled" means the added layers are gone, not that the computed transform is 0 (spec.acting.intent.measureNote).
Derived per flight: onset order eyes < head < body, eye->head ms, eye->body ms, gaze direction match, L/R asym px,
head peak deg toward target, pre-takeoff ms (first pupil move -> 'takeoff' cue), land recentre ms (land -> pupil
layers gone and |pupil| < .3 px), head settle ms (land -> no added head layer and computed head within breath band).
3 flights per arm (right, left, right). Output: samples/proofs/g12_intent.json + g12_intent_strip.png (4 frames).
"""
import asyncio, json, os, statistics, time
from playwright.async_api import async_playwright
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = None

ROOT = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(ROOT, 'samples', 'proofs')
BASE = 'http://localhost:8080/sandbox/'
FLIGHTS = [(220, -40), (-220, -40), (220, -40)]
READY = 'window.__rigs && window.__rigs.length===1 && typeof window.__rigs[0].flyBy === "function"'

JS = r"""
async (args) => {
  const r = window.__rigs[0];
  const M = n => { const t = getComputedStyle(r.j(n)).transform; const m = t.match(/matrix\(([^)]+)\)/); return m ? m[1].split(',').map(Number) : [1,0,0,1,0,0]; };
  const TX = n => { const v = M(n); return [v[4], v[5]]; };
  const ROT = n => { const v = M(n); return Math.atan2(v[1], v[0]) * 180 / Math.PI; };
  const SQ = () => { const k = r.squashLayer.effect.getKeyframes()[0].transform; const m = k.match(/scale\(([^,]+),\s*([^)]+)\)/); return m ? +m[2] : 1; };
  const HEADADD = () => (r._intentLayers || []).filter(a => a.effect && a.effect.target === r.j('head')).length;
  const PUPADD = () => (r._intentLayers || []).filter(a => a.effect && /pupil/.test(a.effect.target.dataset.joint || '')).length;
  const host = r.svg.parentElement;
  const HOSTX = () => { const t = getComputedStyle(host).transform; const m = t.match(/matrix\(([^)]+)\)/); return m ? +m[1].split(',')[4] : 0; };
  const cues = []; const prev = r.onCue; r.onCue = (ph, ctx) => { cues.push({ ph, t: performance.now(), ctx }); if (prev) prev(ph, ctx); };
  const samples = []; let go = true; const t0 = performance.now();
  const tick = () => { samples.push({ t: performance.now() - t0, pL: TX('pupilL'), pR: TX('pupilR'), head: ROT('head'), sq: SQ(), hAdd: HEADADD(), pAdd: PUPADD(), hx: HOSTX() }); if (go) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  await new Promise(res => setTimeout(res, 150));
  await r.flyBy(args.dx, args.dy);
  await new Promise(res => setTimeout(res, 900));
  go = false; r.onCue = prev;
  return { samples, cues: cues.map(c => ({ ph: c.ph, t: c.t - t0 })), intent: r._lastIntent || null };
}
"""

def analyse(run, dx, dy, I):
    S = run['samples']; cues = {}
    for c in run['cues']:
        if c['ph'] in ('intent', 'anticipate', 'takeoff', 'land', 'settle') and c['ph'] not in cues: cues[c['ph']] = c['t']
    base = S[0]
    def mag(s): return max(abs(s['pL'][0] - base['pL'][0]) + abs(s['pL'][1] - base['pL'][1]), abs(s['pR'][0] - base['pR'][0]) + abs(s['pR'][1] - base['pR'][1]))
    def first(pred, frm=None):
        for s in S:
            if (frm is None or s['t'] >= frm) and pred(s): return s['t']
        return None
    t_eye_obs = first(lambda s: mag(s) > 0.3)                     # first visible pupil displacement (can read late when the snap first cancels an idle drift)
    t_eye = cues.get('intent', t_eye_obs)                          # reference = the intent cue (pupil layers start on this frame); observed kept for disclosure
    t_head = first(lambda s: s['hAdd'] > 0 and abs(s['head'] - base['head']) > 0.5)
    t_body = first(lambda s: s['sq'] < 0.99)                       # crouch = squash layer keyframe below 1 (breath never touches this layer)
    t_take = cues.get('takeoff'); t_land = cues.get('land')
    dist = (dx * dx + dy * dy) ** 0.5; ux, uy = dx / dist, dy / dist
    pre = [s for s in S if t_take is not None and s['t'] < t_take]
    ref = next((s for s in reversed(pre) if cues.get('anticipate') is not None and s['t'] <= cues['anticipate']), pre[-1] if pre else base)
    dl = (ref['pL'][0] - base['pL'][0], ref['pL'][1] - base['pL'][1]); dr = (ref['pR'][0] - base['pR'][0], ref['pR'][1] - base['pR'][1])
    def match(d):
        n = (d[0] ** 2 + d[1] ** 2) ** 0.5
        return (d[0] * ux + d[1] * uy) / n if n > 0.05 else 0.0
    asym = ((dl[0] - dr[0]) ** 2 + (dl[1] - dr[1]) ** 2) ** 0.5
    head_pre = [s['head'] - base['head'] for s in pre if s['hAdd'] > 0]
    head_peak = max(head_pre, key=abs) if head_pre else 0.0
    post = [s for s in S if t_land is not None and s['t'] >= t_land]
    t_recentre = next((s['t'] - t_land for s in post if s['pAdd'] == 0 and mag(s) < 0.3), None)
    breath_band = 1.2 + 0.5                                         # idle breath +-1 deg (rig.idle) + tolerance; settle = added layers gone AND inside the band, held to the end
    settled = None
    for i, s in enumerate(post):
        if s['hAdd'] == 0 and len(post) - i >= 4 and all(abs(q['head'] - base['head']) < breath_band for q in post[i:]):
            settled = s['t'] - t_land; break
    dt = [b['t'] - a['t'] for a, b in zip(S, S[1:])]
    return {
        'dx': dx, 'dy': dy, 'samples': len(S), 'sample_dt_ms_median': round(statistics.median(dt), 2) if dt else None,
        'cues_ms': {k: round(v, 1) for k, v in cues.items()},
        'onset_ms': {'eyes': None if t_eye is None else round(t_eye, 1), 'eyes_observed': None if t_eye_obs is None else round(t_eye_obs, 1), 'head': None if t_head is None else round(t_head, 1), 'body': None if t_body is None else round(t_body, 1)},
        'eye_to_head_ms': None if (t_eye is None or t_head is None) else round(t_head - t_eye, 1),
        'eye_to_body_ms': None if (t_eye is None or t_body is None) else round(t_body - t_eye, 1),
        'pre_takeoff_ms': None if (t_eye is None or t_take is None) else round(t_take - t_eye, 1),
        'gaze_match_L': round(match(dl), 3), 'gaze_match_R': round(match(dr), 3), 'gaze_disp_px': {'L': [round(v, 2) for v in dl], 'R': [round(v, 2) for v in dr]},
        'asym_px': round(asym, 3), 'head_peak_deg_pre_takeoff': round(head_peak, 2),
        'head_sign_matches_target': ((head_peak > 0) == (dx > 0)) if abs(head_peak) > 0.5 else False,
        'land_recentre_ms': None if t_recentre is None else round(t_recentre, 1), 'head_settle_ms': None if settled is None else round(settled, 1),
        'head_max_abs_after_land_deg': round(max((abs(s['head'] - base['head']) for s in post), default=0), 2),
        'intent_reported': run['intent'],
    }

def judge(a, I):
    B = I['budget']; ok = {}
    o = a['onset_ms']
    ok['order_eyes_head_body'] = all(o[k] is not None for k in ('eyes', 'head', 'body')) and o['eyes'] < o['head'] < o['body'] and (o['eyes_observed'] is None or o['eyes_observed'] < o['head'])
    ok['eye_to_head_in_budget'] = a['eye_to_head_ms'] is not None and I['headLagMs'][0] - 17 <= a['eye_to_head_ms'] <= I['headLagMs'][1] + 50   # + head easing needs ~2 frames to pass 0.5 deg
    ok['eye_to_body_in_budget'] = a['eye_to_body_ms'] is not None and I['bodyLagMs'][0] - 17 <= a['eye_to_body_ms'] <= I['bodyLagMs'][1] + 50
    ok['pre_takeoff_in_budget'] = a['pre_takeoff_ms'] is not None and B['preTakeoffMs'][0] <= a['pre_takeoff_ms'] <= B['preTakeoffMs'][1]
    ok['gaze_matches_target'] = min(a['gaze_match_L'], a['gaze_match_R']) >= B['gazeDirectionMatch']
    ok['asym_min'] = a['asym_px'] >= B['asymMinPx']
    ok['head_toward_target'] = a['head_sign_matches_target'] and abs(a['head_peak_deg_pre_takeoff']) >= I['headDeg'] * 0.8
    ok['land_recentre'] = a['land_recentre_ms'] is not None and a['land_recentre_ms'] <= I['landRecentreMs'] + 17
    ok['head_settle'] = a['head_settle_ms'] is not None and a['head_settle_ms'] <= I['settleWithinMs']
    return ok

async def arm_run(b, extra, I):
    ctx = await b.new_context(viewport=dict(width=1000, height=900)); pg = await ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(BASE + f'index.html?engine=v2&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0{extra}', wait_until='networkidle')
    await pg.wait_for_function(READY); await pg.wait_for_timeout(500)
    flights = []
    for dx, dy in FLIGHTS:
        run = await pg.evaluate(JS, {'dx': dx, 'dy': dy})
        a = analyse(run, dx, dy, I); a['checks'] = judge(a, I); flights.append(a)
        await pg.evaluate("window.__rigs[0].flyBy(%d, %d)" % (-dx, -dy)); await pg.wait_for_function('!window.__rigs[0].busy'); await pg.wait_for_timeout(600)
    intents = await pg.evaluate('window.__rigs[0].stats.intents || 0')
    await ctx.close()
    return {'flights': flights, 'errors': errs, 'intents_counted': intents}

async def strip(b, f0):
    ctx = await b.new_context(viewport=dict(width=1000, height=900), device_scale_factor=1); pg = await ctx.new_page()
    await pg.goto(BASE + 'index.html?engine=v2&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0', wait_until='networkidle')
    await pg.wait_for_function(READY); await pg.wait_for_timeout(500)
    await pg.evaluate("document.querySelectorAll('.star').forEach(e => e.remove())")
    box = await pg.evaluate("(() => { const r = window.__rigs[0].svg.getBoundingClientRect(); return {x: r.left - 30, y: r.top - 30, width: r.width + 60, height: r.height + 60}; })()")
    marks = [('eyes snap', (f0['onset_ms']['eyes'] or 60) + 30), ('head turns', (f0['onset_ms']['head'] or 120) + 130), ('body crouch', (f0['onset_ms']['body'] or 300) + 80), ('take-off', (f0['cues_ms'].get('takeoff') or 520) + 70)]
    await pg.evaluate("window.__rigs[0].flyBy(220, -40)")
    t_start = time.time() * 1000; shots = []
    for name, at in marks:
        wait = at - (time.time() * 1000 - t_start)
        if wait > 0: await pg.wait_for_timeout(wait)
        pth = os.path.join(OUT, f'g12_intent_{len(shots)}.png'); await pg.screenshot(path=pth, clip=box); shots.append((name, at, pth))
    await pg.wait_for_function('!window.__rigs[0].busy', timeout=10000); await ctx.close()
    if not Image: return None
    ims = [Image.open(p_).convert('RGB') for _, _, p_ in shots]; w = max(i.width for i in ims); h = max(i.height for i in ims); cap = 40
    sheet = Image.new('RGB', (w * len(ims), h + cap), (24, 26, 34)); d = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
    except Exception: font = None
    for k, ((name, at, _), im) in enumerate(zip(shots, ims)):
        sheet.paste(im, (k * w, cap)); d.text((k * w + 10, 10), f'{name}  t+{int(at)} ms', fill=(255, 209, 102), font=font)
        if k: d.line([(k * w, 0), (k * w, h + cap)], fill=(60, 64, 80), width=2)
    sheet.save(os.path.join(OUT, 'g12_intent_strip.png'))
    for _, _, p_ in shots: os.remove(p_)
    return 'g12_intent_strip.png'

async def main():
    os.makedirs(OUT, exist_ok=True)
    spec = json.load(open(os.path.join(ROOT, 'companions', 'owl.motion.json'), encoding='utf-8')); I = spec['acting']['intent']
    R = {'tool': 'sandbox/intent_proof.py', 'budgets_declared': I, 'arms': {}, 'captured_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'env': 'headless Chromium, DPR 1, CPU 1x, sfx=0, n=1'}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        R['arms']['A_intent_on'] = await arm_run(b, '', I)
        R['arms']['B_intent_off'] = await arm_run(b, '&intent=0', I)
        R['strip'] = await strip(b, R['arms']['A_intent_on']['flights'][0])
        await b.close()
    A = R['arms']['A_intent_on']['flights']; Bf = R['arms']['B_intent_off']['flights']
    med = lambda k: statistics.median([f[k] for f in A if f[k] is not None]) if any(f[k] is not None for f in A) else None
    R['summary'] = {
        'A_pass_per_flight': [all(f['checks'].values()) for f in A],
        'A_failed_checks': sorted({k for f in A for k, v in f['checks'].items() if not v}),
        'A_median': {k: med(k) for k in ('eye_to_head_ms', 'eye_to_body_ms', 'pre_takeoff_ms', 'asym_px', 'head_peak_deg_pre_takeoff', 'land_recentre_ms', 'head_settle_ms', 'head_max_abs_after_land_deg')},
        'B_eyes_moved_toward_target_before_takeoff': [f['onset_ms']['eyes'] is not None and f['cues_ms'].get('takeoff') is not None and f['onset_ms']['eyes'] < f['cues_ms']['takeoff'] and min(f['gaze_match_L'], f['gaze_match_R']) >= 0.6 for f in Bf],
        'B_pre_takeoff_ms_crouch_only': [round(f['cues_ms']['takeoff'] - f['cues_ms']['anticipate'], 1) if 'takeoff' in f['cues_ms'] and 'anticipate' in f['cues_ms'] else None for f in Bf],
        'A_pre_takeoff_ms_from_intent_cue': [round(f['cues_ms']['takeoff'] - f['cues_ms']['intent'], 1) if 'takeoff' in f['cues_ms'] and 'intent' in f['cues_ms'] else None for f in A],
        'B_intents_counted': R['arms']['B_intent_off']['intents_counted'], 'A_intents_counted': R['arms']['A_intent_on']['intents_counted'],
        'sample_dt_ms_median': statistics.median([f['sample_dt_ms_median'] for f in A + Bf]), 'errors': R['arms']['A_intent_on']['errors'] + R['arms']['B_intent_off']['errors'],
    }
    R['summary']['pass_all'] = all(R['summary']['A_pass_per_flight']) and R['summary']['B_intents_counted'] == 0 and not any(R['summary']['B_eyes_moved_toward_target_before_takeoff']) and not R['summary']['errors']
    with open(os.path.join(OUT, 'g12_intent.json'), 'w', encoding='utf-8') as f: json.dump(R, f, ensure_ascii=False, indent=2)
    print(json.dumps(R['summary'], ensure_ascii=False, indent=1))
    for f in A: print('A', f['dx'], {k: v for k, v in f['checks'].items() if not v} or 'all checks pass', f['onset_ms'], 'e2h', f['eye_to_head_ms'], 'e2b', f['eye_to_body_ms'], 'pre', f['pre_takeoff_ms'], 'match', f['gaze_match_L'], f['gaze_match_R'], 'head', f['head_peak_deg_pre_takeoff'], 'recentre', f['land_recentre_ms'], 'settle', f['head_settle_ms'])

if __name__ == '__main__':
    asyncio.run(main())
