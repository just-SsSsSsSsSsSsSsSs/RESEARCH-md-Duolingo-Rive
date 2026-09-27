#!/usr/bin/env python3
"""K9.5-4 proof for the 3-band wing flex (engine/flex.js, spec acting.flex).

Two arms on the same page URL (owner rule, DIRECTIVES #08: every feature ships with a control arm):
  A  flex on (default)          B  ?flex=0
Engine-truth reads (WAAPI keyframes / timing on the child joints), not screenshots, for the checks:
  followers_present   A: armL_mid and armL_tip carry a 480 ms follower while celebrate() runs; B: no child layer.
  ratio_and_clamp     follower last keyframe == clamp(parent_last * ratio, maxDeg) (+-0.01 deg, from the layers).
  lag_from_timing     follower delay - parent delay == segments.X.lagMs exactly (timing is engine truth) AND the
                      observed peak of the child's RELATIVE rotation lags the parent's peak by lagMs +- Q (16.7 ms).
  tail_after_stop     a tail layer (duration tail.ms) exists on the tip starting at parent end + tip lag; >= 1 'flex' cue.
  min_parent_deg      the idle breath layer (3 deg on armL < minParentDeg 4) produces NO follower.
  release_clears      a kept fill-forwards layer on armL spawns kept followers; rig.release(/^arm/) clears all of them.
  b_control           arm B: 0 followers, 0 cues, relative child rotation stays < 0.05 deg for the whole run.
  reduced_motion      prefers-reduced-motion: 0 followers, 0 cues.
  no_page_errors      three pages, zero console errors.
Perf (annex d, declared before the run): 5 owls, CPU 1x/4x, flex on vs ?flex=0, FLEX_PERF_ROUNDS rounds via
sandbox/measure.py. Decision rule written into the JSON: activeOnly_recommended = p95(on) - p95(off) > max in-cell
p95 spread across rounds, at either throttle. FLEX_PERF=0 skips the perf block.
Strip: DPR2 left-wing crop of celebrate() at 0/120/240/480/760 ms -> g14_flex_strip.png.
Output: samples/proofs/g14_flex.json (RUNS consecutive engine runs) + strip. Exit 1 if any run fails.
"""
import asyncio, json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import measure as M  # noqa: E402

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:
    Image = None

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'samples', 'proofs')
BASE = os.environ.get('SANDBOX_BASE', 'http://127.0.0.1:8080/sandbox/')
URL = BASE + 'index.html?engine=v2&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0'
Q = 16.7
RUNS = 3
PERF_ROUNDS = int(os.environ.get('FLEX_PERF_ROUNDS', '3'))
PERF_SKIP = os.environ.get('FLEX_PERF', '1') == '0'
READY = "window.__rigs && window.__rigs[0] && !window.__rigs[0].busy"

HELPERS = """
  const r = window.__rigs[0]; const sleep = ms => new Promise(res => setTimeout(res, ms));
  const M = n => { const el = r.j(n); if (!el) return [1,0,0,1,0,0]; const t = getComputedStyle(el).transform; const m = t.match(/matrix\\(([^)]+)\\)/); return m ? m[1].split(',').map(Number) : [1,0,0,1,0,0]; };
  const ROT = n => { const v = M(n); return Math.atan2(v[1], v[0]) * 180 / Math.PI; };
  const LAY = n => (r.j(n) ? r.j(n).getAnimations() : []).map(a => { const t = a.effect.getTiming(); return { kf: a.effect.getKeyframes().map(x => x.transform), delay: t.delay, duration: t.duration, iterations: t.iterations, fill: t.fill, composite: a.effect.composite, kept: r.live.has(a) }; });
  const ANG = s => { const m = /rotate\\((-?[\\d.]+)/.exec(s || ''); return m ? +m[1] : null; };
"""

JS_MAIN = "async () => {" + HELPERS + """
  const F = r.flexSpec(); const out = { flexOn: !!F };
  const cues = []; const prev = r.onCue; r.onCue = (p, c) => { cues.push({ p, t: performance.now(), c }); if (prev) prev(p, c); };
  out.idleChildLayers = LAY('armL_mid').length + LAY('armL_tip').length; out.idleArmLayers = LAY('armL').length;
  out.idleArmMaxDeg = Math.max(0, ...LAY('armL').flatMap(l => l.kf.map(ANG).filter(v => v !== null).map(Math.abs)));
  const s = []; const t0 = performance.now(); r.celebrate();
  await sleep(60);
  out.armLayers = LAY('armL'); out.midLayers = LAY('armL_mid'); out.tipLayers = LAY('armL_tip');
  while (performance.now() - t0 < 2400) { const a = ROT('armL'), m = ROT('armL_mid'), t = ROT('armL_tip'); s.push({ t: performance.now() - t0, arm: a, mid: m - a, tip: t - m }); await new Promise(requestAnimationFrame); }
  const peak = k => s.reduce((b, x) => Math.abs(x[k]) > Math.abs(b[k]) ? x : b, s[0]);
  out.peakArm = peak('arm'); out.peakMid = peak('mid'); out.peakTip = peak('tip'); out.samples = s.length;
  out.flexCues = cues.filter(c => c.p === 'flex').map(c => ({ t: +(c.t - t0).toFixed(1), c: c.c }));
  out.stats = { flexFollowers: (r.stats && r.stats.flexFollowers) || 0, flexTails: (r.stats && r.stats.flexTails) || 0 };
  await new Promise(res => { const w = () => r.busy ? setTimeout(w, 30) : res(); w(); });
  r.anim(r.j('armL'), [{ transform: 'rotate(0)' }, { transform: 'rotate(40deg)' }], { duration: 300, fill: 'forwards' }, true);
  await sleep(40); out.keptBeforeRelease = LAY('armL_mid').filter(l => l.kept).length + LAY('armL_tip').filter(l => l.kept).length;
  r.release(/^arm/); await sleep(20);
  out.keptAfterRelease = LAY('armL_mid').filter(l => l.kept).length + LAY('armL_tip').filter(l => l.kept).length + LAY('armL').filter(l => l.kept && l.fill === 'forwards').length;
  return out; }"""


def ang(l):
    m = re.search(r'rotate\((-?[\d.]+)', l['kf'][-1]); return float(m.group(1)) if m else None


def analyse(a, b, rr, spec):
    F = spec['acting']['flex']; S = F['segments']; ch = {}; n = {}
    clamp = lambda v: max(-F['maxDeg'], min(F['maxDeg'], v))  # noqa: E731
    parent = [l for l in a['armLayers'] if l['iterations'] == 1 and l['duration'] == 480]
    mid = [l for l in a['midLayers'] if l['iterations'] == 1 and l['duration'] == 480]
    tip = [l for l in a['tipLayers'] if l['iterations'] == 1 and l['duration'] == 480]
    ch['followers_present'] = bool(parent and mid and tip) and not (b['midLayers'] or b['tipLayers'])
    if parent and mid and tip:
        p_last = ang(parent[0]); exp = {'mid': clamp(p_last * S['mid']['ratio']), 'tip': clamp(p_last * S['tip']['ratio'])}
        n['keyframes_deg'] = {'parent_last': p_last, 'mid_last': ang(mid[0]), 'tip_last': ang(tip[0]), 'expected': exp}
        ch['ratio_and_clamp'] = abs(ang(mid[0]) - exp['mid']) <= 0.01 and abs(ang(tip[0]) - exp['tip']) <= 0.01
        n['lag_timing_ms'] = {'mid': mid[0]['delay'] - parent[0]['delay'], 'tip': tip[0]['delay'] - parent[0]['delay']}
        n['lag_observed_peak_ms'] = {'mid': round(a['peakMid']['t'] - a['peakArm']['t'], 1), 'tip': round(a['peakTip']['t'] - a['peakArm']['t'], 1)}
        ch['lag_from_timing'] = (n['lag_timing_ms']['mid'] == S['mid']['lagMs'] and n['lag_timing_ms']['tip'] == S['tip']['lagMs']
                                 and abs(n['lag_observed_peak_ms']['mid'] - S['mid']['lagMs']) <= Q and abs(n['lag_observed_peak_ms']['tip'] - S['tip']['lagMs']) <= Q)
        tails = [l for l in a['tipLayers'] if l['duration'] == F['tail']['ms']]
        exp_start = parent[0]['delay'] + parent[0]['duration'] + S['tip']['lagMs']
        n['tail'] = {'layers': tails, 'expected_start_ms': exp_start, 'cues': a['flexCues']}
        ch['tail_after_stop'] = bool(tails) and abs(tails[0]['delay'] - exp_start) <= 0.5 and len(a['flexCues']) >= 1
    else:
        ch['ratio_and_clamp'] = ch['lag_from_timing'] = ch['tail_after_stop'] = False
    n['idle'] = {'armLayers': a['idleArmLayers'], 'armMaxDeg': a['idleArmMaxDeg'], 'childLayers': a['idleChildLayers']}
    ch['min_parent_deg'] = a['idleChildLayers'] == 0 and a['idleArmLayers'] >= 1 and a['idleArmMaxDeg'] < F['minParentDeg']
    n['release'] = {'keptBefore': a['keptBeforeRelease'], 'keptAfter': a['keptAfterRelease']}
    ch['release_clears'] = a['keptBeforeRelease'] >= 2 and a['keptAfterRelease'] == 0
    n['b'] = {'flexOn': b['flexOn'], 'stats': b['stats'], 'peakMidRel': b['peakMid']['mid'], 'peakTipRel': b['peakTip']['tip'], 'parentPeakDeg': b['peakArm']['arm'], 'cues': len(b['flexCues'])}
    ch['b_control'] = (not b['flexOn']) and b['stats']['flexFollowers'] == 0 and abs(b['peakMid']['mid']) < 0.05 and abs(b['peakTip']['tip']) < 0.05 and not b['flexCues']
    n['reduced'] = {'flexOn': rr['flexOn'], 'stats': rr['stats'], 'cues': len(rr['flexCues'])}
    ch['reduced_motion'] = (not rr['flexOn']) and rr['stats']['flexFollowers'] == 0 and not rr['flexCues']
    n['a_peaks'] = {'arm': a['peakArm'], 'mid_rel': a['peakMid'], 'tip_rel': a['peakTip'], 'samples': a['samples'], 'stats': a['stats']}
    return ch, n


async def page(b, extra='', **kw):
    ctx = await b.new_context(viewport=dict(width=1000, height=900), **kw); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    await pg.goto(URL + extra, wait_until='networkidle'); await pg.wait_for_function(READY); await pg.wait_for_timeout(600)
    return ctx, pg, errs


async def run_once(b, spec):
    ctx, pg, ea = await page(b); a = await pg.evaluate(JS_MAIN); await ctx.close()
    ctx, pg, eb = await page(b, '&flex=0'); bb = await pg.evaluate(JS_MAIN); await ctx.close()
    ctx, pg, er = await page(b, '', reduced_motion='reduce'); rr = await pg.evaluate(JS_MAIN); await ctx.close()
    ch, n = analyse(a, bb, rr, spec)
    n['page_errors'] = {'A': ea, 'B': eb, 'reduced': er}; ch['no_page_errors'] = not (ea or eb or er)
    return {'checks': ch, 'pass_all': all(ch.values()), 'notes': n}


async def strip(b):
    ctx, pg, _ = await page(b, device_scale_factor=2)
    await pg.evaluate("document.querySelectorAll('.star').forEach(e => e.remove())")
    box = await pg.evaluate("(() => { const r = window.__rigs[0].svg.getBoundingClientRect(); return {x: Math.max(0, r.left - 40), y: Math.max(0, r.top + window.scrollY - 60), width: r.width * 0.62, height: r.height * 0.78}; })()")
    await pg.evaluate("() => { window.__rigs[0].celebrate(); return 0; }")
    t0 = time.time() * 1000; shots = []
    for name, at in [('rest', 0), ('parent leads', 120), ('mid follows', 240), ('tip drags', 480), ('tail settles', 760)]:
        wait = at - (time.time() * 1000 - t0)
        if wait > 0: await pg.wait_for_timeout(wait)
        pth = os.path.join(OUT, f'g14_flex_{len(shots)}.png'); t_shot = time.time() * 1000 - t0
        await pg.screenshot(path=pth, clip=box, full_page=True); shots.append((name, t_shot, pth))
    await pg.wait_for_function('!window.__rigs[0].busy', timeout=8000); await ctx.close()
    if not Image: return None
    ims = [Image.open(p_).convert('RGB') for _, _, p_ in shots]; w = max(i.width for i in ims); h = max(i.height for i in ims); cap = 40
    sheet = Image.new('RGB', (w * len(ims), h + cap), (24, 26, 34)); d = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
    except Exception: font = None
    for k, ((name, at, _), im) in enumerate(zip(shots, ims)):
        sheet.paste(im, (k * w, cap)); d.text((k * w + 10, 10), f'flex: {name}  t+{int(at)} ms', fill=(255, 209, 102), font=font)
        if k: d.line([(k * w, 0), (k * w, h + cap)], fill=(60, 64, 80), width=2)
    sheet.save(os.path.join(OUT, 'g14_flex_strip.png'))
    for _, _, p_ in shots: os.remove(p_)
    return {'file': 'g14_flex_strip.png', 'frames': [{'label': nm, 'captured_ms': round(t, 1)} for nm, t, _ in shots]}


async def perf():
    cells = {}
    for cpu in (1.0, 4.0):
        for label, extra in (('flex on', ''), ('flex off', '&flex=0')):
            rs = []
            for _ in range(PERF_ROUNDS):
                r = await M.measure(5, 10, None, 'p2', 'v2', cpu, extra)
                rs.append({'p95': r['raf_p95_ms'], 'jank': r['jank_pct'], 'heap': r['heap_delta_mb_after_scene'], 'anims_idle': r['animations_idle'], 'idle_loops': r['engine_idle_loops_after_scene']})
            med = lambda k: sorted(x[k] for x in rs)[len(rs) // 2]  # noqa: E731
            cells[f'{label} {int(cpu)}x'] = {'rounds': rs, 'p95_median': med('p95'), 'jank_median': med('jank'), 'p95_spread': round(max(x['p95'] for x in rs) - min(x['p95'] for x in rs), 2), 'anims_idle': rs[0]['anims_idle'], 'idle_loops_max': max(x['idle_loops'] for x in rs)}
    rec = False
    for cpu in ('1x', '4x'):
        on, off = cells[f'flex on {cpu}'], cells[f'flex off {cpu}']
        spread = max(on['p95_spread'], off['p95_spread']); rise = round(on['p95_median'] - off['p95_median'], 2)
        cells[f'decision {cpu}'] = {'p95_rise_ms': rise, 'in_cell_spread_ms': spread, 'rise_beyond_spread': rise > spread}
        rec = rec or rise > spread
    return {'cells': cells, 'activeOnly_recommended': rec, 'rule': 'activeOnly if p95(on) - p95(off) > max in-cell p95 spread across rounds, at either throttle'}


async def main():
    from playwright.async_api import async_playwright
    spec = json.load(open(os.path.join(ROOT, 'companions', 'owl.motion.json')))
    os.makedirs(OUT, exist_ok=True)
    report = {'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'url': URL, 'q_ms': Q, 'spec_flex': spec['acting']['flex'], 'runs': []}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for i in range(RUNS):
            r = await run_once(b, spec); report['runs'].append(r)
            print(f"run {i + 1}: pass_all {r['pass_all']} " + ' '.join(f"{k}={'PASS' if v else 'FAIL'}" for k, v in r['checks'].items()))
        report['strip'] = await strip(b)
        await b.close()
    report['pass_all_runs'] = all(r['pass_all'] for r in report['runs'])
    if not PERF_SKIP:
        report['perf'] = await perf()
        for k, v in report['perf']['cells'].items(): print('perf', k, {kk: vv for kk, vv in v.items() if kk != 'rounds'})
        print('activeOnly_recommended', report['perf']['activeOnly_recommended'])
    json.dump(report, open(os.path.join(OUT, 'g14_flex.json'), 'w'), indent=1)
    print('pass_all_runs', report['pass_all_runs'])
    sys.exit(0 if report['pass_all_runs'] else 1)


if __name__ == '__main__':
    asyncio.run(main())
