#!/usr/bin/env python3
"""
Visual proofs for the owl cinematic engine (ADR-001, gates G2-G8).

Deterministic capture: the engine clock and every WAAPI animation run at a
slow rate (default x0.25) while Playwright takes screenshots at fixed real-time
intervals, so each frame strip shows the same phase in every run.

Outputs (sandbox/samples/proofs/):
  g2_landing_strip.png     landing squash: impact -> volume-preserving rebound -> rest
  g3_anticipation_strip.png crouch + head dip + wing lift before take-off
  g4_path_trace.png        Bezier arc overlays (two flights) with apex marks
  g5_settle_strip.png      wings / legs / head overshoot and settle after landing
  g7_edge_zoom.png         4x zoom of the feather edge (P2 parts) at rest and mid-flight
  g8_side_by_side.png      v1 vs v2 same moment after a flight (residual tilt, squash)
  g2..g5 frame metadata in proofs.json (timestamps, squash scale, spring angles)
Videos (when --video): video_v2_showcase/*.webm  squash -> anticipation -> arc -> settle -> talk.

Usage: python3 sandbox/proofs.py [--video] [--rate 0.25]
Requires: python3 tools/serve.py 8080 running; pip install playwright + chromium.
"""
import argparse, asyncio, json, os, time
from playwright.async_api import async_playwright
try:
    from PIL import Image
except ImportError:
    Image = None

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'samples', 'proofs')
BASE = 'http://localhost:8080/sandbox/'
VIEW = {'width': 900, 'height': 640}


def strip(paths, out, labels=None):
    """Horizontal contact strip from a list of PNG paths (no external deps beyond Pillow)."""
    if not Image or not paths: return
    ims = [Image.open(p) for p in paths]
    w, h = max(i.width for i in ims), max(i.height for i in ims)
    sheet = Image.new('RGB', (w * len(ims), h), (14, 16, 32))
    for i, im in enumerate(ims): sheet.paste(im, (i * w + (w - im.width) // 2, (h - im.height) // 2))
    sheet.save(out, optimize=True)
    for p in paths: os.remove(p)


async def shot_slot(pg, path, pad=70, whole_stage=False):
    """Screenshot around the (first) owl at its current position (pad px), or the whole stage."""
    if whole_stage:
        box = await pg.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return {x: r.left, y: r.top + scrollY, w: r.width, h: r.height}; })()")
    else:
        box = await pg.evaluate("(() => { const r = window.__rigs[0].svg.getBoundingClientRect(); return {x: r.left, y: r.top + scrollY, w: r.width, h: r.height}; })()")
        box = {'x': box['x'] - pad, 'y': box['y'] - pad, 'w': box['w'] + 2 * pad, 'h': box['h'] + 2 * pad}
    await pg.screenshot(path=path, full_page=True, clip={'x': box['x'], 'y': box['y'], 'width': box['w'], 'height': box['h']})


async def open_page(ctx, engine='v2', extra=''):
    pg = await ctx.new_page()
    await pg.goto(BASE + f'index.html?engine={engine}&auto=0&sw=0&n=1&hud=0{extra}', wait_until='networkidle')
    await pg.wait_for_function('window.__rigs && window.__rigs.length===1')
    await pg.wait_for_timeout(400)
    return pg


async def frames_during(pg, trigger_js, times_ms, prefix, meta_js):
    """Fire trigger, then screenshot the stage at each real-time offset; collect numeric metadata."""
    paths, meta = [], []
    t0 = time.perf_counter()
    await pg.evaluate('void (' + trigger_js + ')')   # fire-and-forget: evaluate must not await the flight promise
    for i, t in enumerate(times_ms):
        wait = t / 1000 - (time.perf_counter() - t0)
        if wait > 0: await asyncio.sleep(wait)
        p = os.path.join(OUT, f'{prefix}_{i:02d}.png')
        m = await pg.evaluate(meta_js)
        m['t_real_ms'] = round((time.perf_counter() - t0) * 1000)
        await shot_slot(pg, p)
        paths.append(p); meta.append(m)
    return paths, meta


META = """(() => { const r = window.__rigs[0]; const sq = r.squashLayer ? r.squashLayer.effect.getKeyframes()[0].transform : null;
  const sec = r.secondary ? Object.fromEntries(Object.entries(r.secondary.springs).map(([k,s]) => [k, +s.x.toFixed(2)])) : null;
  return { busy: r.busy, flying: r.flying, squash: sq, springs: sec, host: r.svg.parentElement.style.transform, state: r.states ? r.states.state : null }; })()"""


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--video', action='store_true')
    ap.add_argument('--rate', type=float, default=0.25)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    R = a.rate
    report = {'captured_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'slow_rate': R, 'gates': {}}

    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport=VIEW, device_scale_factor=2)

        # ---- G3 anticipation + G2 landing + G5 settle from one flight, slowed x R ----
        pg = await open_page(ctx)
        # cue tap: engine-clock timestamps of every phase cue (anticipate -> takeoff = crouch hold actually applied, land -> settle = squash recovery)
        await pg.evaluate("""() => { const r = window.__rigs[0]; const prev = r.onCue; window.__cues = [];
          r.onCue = (phase, ctx) => { window.__cues.push({ phase, t: performance.now(), holdMs: ctx && ctx.holdMs }); if (prev) prev(phase, ctx); }; }""")
        await pg.evaluate(f'window.__setSlow(true)')
        await pg.evaluate("window.__slowRate === undefined")
        # anticipation: hold is 150-250 ms engine time -> 600-1000 ms real at x0.25
        paths, meta = await frames_during(pg, "window.__rigs[0].states.fire('move:to', {by:{dx:260,dy:-150}})", [80, 300, 550, 800, 1000], 'g3', META)
        strip(paths, os.path.join(OUT, 'g3_anticipation_strip.png'))
        report['gates']['G3_anticipation'] = meta
        # wait for landing: total flight 1400-3800 ms engine -> up to 15 s real
        # landing moment = the path animation is committed to the host (commitStyles) right before the impact
        await pg.wait_for_function("window.__rigs[0].svg.parentElement.style.transform.startsWith('translate(260px, -150px)')", timeout=60000)
        t0 = time.perf_counter(); paths, meta = [], []
        for i in range(6):
            m = await pg.evaluate(META); m['t_real_ms'] = round((time.perf_counter() - t0) * 1000)
            pth = os.path.join(OUT, f'g2_{i:02d}.png'); await shot_slot(pg, pth); paths.append(pth); meta.append(m)
            await asyncio.sleep(0.16)
        strip(paths, os.path.join(OUT, 'g2_landing_strip.png'))
        report['gates']['G2_landing_squash'] = meta
        # settle (G5): secondary springs (wings/head/legs) overshoot and damp over the settle window
        # -> capture overlaps the landing (same flight) at a finer cadence: 6 frames x 0.25 s real = 0.4 s engine at x0.25
        await pg.evaluate('window.__setSlow(false)'); await pg.wait_for_function('!window.__rigs[0].busy', timeout=30000)
        await pg.evaluate('window.__setSlow(true)')
        await pg.evaluate("void window.__rigs[0].states.fire('move:to', {by:{dx:-260,dy:150}})")
        # touchdown = squash spring leaves rest (impact) - poll fast enough at x0.25 to catch it
        await pg.wait_for_function("window.__rigs[0].squash && !window.__rigs[0].squash.atRest", timeout=60000, polling=30)
        t0 = time.perf_counter(); paths, meta = [], []
        for i in range(6):
            m = await pg.evaluate(META); m['t_real_ms'] = round((time.perf_counter() - t0) * 1000)
            pth = os.path.join(OUT, f'g5_{i:02d}.png'); await shot_slot(pg, pth); paths.append(pth); meta.append(m)
            await asyncio.sleep(0.25)
        strip(paths, os.path.join(OUT, 'g5_settle_strip.png'))
        report['gates']['G5_settle'] = meta
        await pg.evaluate('window.__setSlow(false)')
        await pg.wait_for_function('!window.__rigs[0].busy', timeout=30000)
        cues = await pg.evaluate("window.__cues")
        # first flight only; pair each phase with the next occurrence of the other
        def _ms(a_, b_):
            ta = [c['t'] for c in cues if c['phase'] == a_]; tb = [c['t'] for c in cues if c['phase'] == b_ and c['t'] > (ta[0] if ta else 0)]
            return round((tb[0] - ta[0]) * R, 1) if ta and tb else None     # engine ms = real ms x rate (slow-mo stretches real time by 1/R)
        ant = [c for c in cues if c['phase'] == 'anticipate']
        report['gates']['G3_cue_sequence_first_flight'] = [{'phase': c['phase'], 't_engine_ms': round((c['t'] - cues[0]['t']) * R, 1)} for c in cues[:8]]
        report['gates']['G3_anticipation_ms'] = {
            'declared_hold_range_ms': [150, 250], 'drawn_hold_ms': [c['holdMs'] for c in ant],
            'measured_anticipate_to_takeoff_ms': _ms('anticipate', 'takeoff'),
            'measured_land_to_settle_ms': _ms('land', 'settle'),
            'method': 'engine cue timestamps (performance.now at cue) multiplied by the slow-motion rate; the earlier strip-based reading (crouch visible 93-568 ms real) was real time at x0.25 = 24-142 ms engine plus the 140 ms takeoff stretch, not a longer hold',
            'pass': (lambda v: v is not None and 150 - 20 <= v <= 250 + 40)(_ms('anticipate', 'takeoff')),
        }
        # G2/G5 secondary: named behaviour. armL after touchdown is an underdamped spring (k 180, c 16 -> zeta 0.60, damped half-period 292 ms,
        # theoretical overshoot ratio 0.097). The sign flip seen at ~1.5 s real (-0.02 -> +0.79) is the second half-swing, not a new impulse.
        report['gates']['G5_secondary_overshoot'] = {
            'spring': 'armL', 'k': 180, 'c': 16, 'zeta': 0.6, 'damped_half_period_ms': 292, 'theory_overshoot_ratio': 0.097,
            'observed_first_swing_deg': min((m['springs']['armL'] for m in report['gates']['G2_landing_squash'] if m['springs']), default=None),
            'observed_second_swing_deg': max((m['springs']['armL'] for m in report['gates']['G2_landing_squash'][3:] if m['springs']), default=None),
            'rule': 'named: follow-through rebound; acceptance cap = second swing <= 0.15 x first swing (|ratio| <= 0.15) and <= 2 deg absolute',
        }
        o = report['gates']['G5_secondary_overshoot']
        if o['observed_first_swing_deg'] and o['observed_second_swing_deg'] is not None:
            ratio = abs(o['observed_second_swing_deg'] / o['observed_first_swing_deg']); o['observed_ratio'] = round(ratio, 3)
            o['pass'] = ratio <= 0.15 and abs(o['observed_second_swing_deg']) <= 2
        report['gates']['K4_state_history'] = await pg.evaluate("window.__rigs[0].states.history.map(h => ({type: h.type, from: h.from, to: h.to, state: h.state, t: h.t ? Math.round(h.t) : undefined}))")
        await pg.close()

        # ---- G4 path trace: two flights with the overlay on ----
        pg = await open_page(ctx, extra='&trace=1')
        await pg.evaluate("void window.__rigs[0].states.fire('move:to', {by:{dx:300,dy:-170}, trace: true})")
        await pg.wait_for_function('!window.__rigs[0].busy', timeout=15000)
        await pg.evaluate("void window.__rigs[0].states.fire('move:to', {home: true, trace: true})")
        await pg.wait_for_timeout(700)
        await shot_slot(pg, os.path.join(OUT, 'g4_path_trace_midflight.png'), whole_stage=True)
        await pg.wait_for_function('!window.__rigs[0].busy', timeout=15000)
        await pg.wait_for_timeout(300)
        await shot_slot(pg, os.path.join(OUT, 'g4_path_trace.png'), whole_stage=True)
        report['gates']['G4_path_trace'] = await pg.evaluate("({polylines: document.querySelectorAll('#trace polyline').length, points_per_arc: document.querySelector('#trace polyline').getAttribute('points').split(' ').length, perch: window.__rigs[0]._perch})")
        # arc geometry per polyline (stage px): sagitta = max perpendicular distance from the chord, min curvature radius from 3-point circumradius
        report['gates']['G4_arc_geometry'] = await pg.evaluate("""[...document.querySelectorAll('#trace polyline')].map((pl) => {
          const P = pl.getAttribute('points').split(' ').map((s) => s.split(',').map(Number));
          const a = P[0], b = P[P.length - 1], chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
          let sag = 0; for (const p of P) { const d = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / chord; sag = Math.max(sag, d); }
          let rmin = Infinity; for (let i = 1; i < P.length - 1; i++) { const [x1, y1] = P[i - 1], [x2, y2] = P[i], [x3, y3] = P[i + 1];
            const A = Math.hypot(x2 - x1, y2 - y1), B = Math.hypot(x3 - x2, y3 - y2), C = Math.hypot(x3 - x1, y3 - y1);
            const cross = Math.abs((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)); if (cross > 1e-6) rmin = Math.min(rmin, A * B * C / (2 * cross)); }
          const straight = P.map((p) => Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / chord).filter((d) => d < 0.5).length;
          return { points: P.length, chord_px: +chord.toFixed(1), sagitta_px: +sag.toFixed(1), sagitta_pct_of_chord: +(100 * sag / chord).toFixed(1), min_curvature_radius_px: +rmin.toFixed(0), points_within_half_px_of_chord: straight, pass_not_straight: sag / chord >= 0.08 };
        })""")
        await pg.close()

        # ---- G7 edge zoom: P2 feather edge at rest and mid-flight (DPR 2, 4x crop) ----
        pg = await open_page(ctx)
        JOINT = "(() => { const r = window.__rigs[0].j('armL').getBoundingClientRect(); return {x: r.left, y: r.top + scrollY, w: r.width, h: r.height}; })()"
        box = await pg.evaluate(JOINT)
        await pg.screenshot(path=os.path.join(OUT, 'g7_edge_rest.png'), full_page=True, clip={'x': box['x'] - 6, 'y': box['y'] - 6, 'width': box['w'] + 12, 'height': box['h'] + 12})
        await pg.evaluate("void window.__rigs[0].states.fire('move:to', {by:{dx:200,dy:-120}})")
        await pg.wait_for_timeout(900)
        box = await pg.evaluate(JOINT)
        await pg.screenshot(path=os.path.join(OUT, 'g7_edge_flight.png'), full_page=True, clip={'x': box['x'] - 6, 'y': box['y'] - 6, 'width': box['w'] + 12, 'height': box['h'] + 12})
        if Image:
            for n in ('rest', 'flight'):
                im = Image.open(os.path.join(OUT, f'g7_edge_{n}.png')); im = im.resize((im.width * 2, im.height * 2), Image.NEAREST); im.save(os.path.join(OUT, f'g7_edge_{n}.png'))
            strip([os.path.join(OUT, 'g7_edge_rest.png'), os.path.join(OUT, 'g7_edge_flight.png')], os.path.join(OUT, 'g7_edge_zoom.png'))
        await pg.wait_for_function('!window.__rigs[0].busy', timeout=15000)
        await pg.close()

        # ---- G7 edge width in device pixels at DPR 1 and DPR 2 (rest + mid-flight, wingL raster part) ----
        # method: screenshot the wing box, scan each row from the outside in, count pixels whose luminance sits between the background and the
        # part colour (the anti-aliased ramp). Width is reported in device px and CSS px; temporal aliasing = the same width mid-flight (rotation+translate).
        if Image:
            edge = {}
            for dpr in (1, 2):
                ectx = await b.new_context(viewport=VIEW, device_scale_factor=dpr)
                pg = await open_page(ectx)
                for phase in ('rest', 'flight'):
                    if phase == 'flight':
                        await pg.evaluate("void window.__rigs[0].states.fire('move:to', {by:{dx:200,dy:-120}})"); await pg.wait_for_timeout(900)
                    box = await pg.evaluate(JOINT)
                    pth = os.path.join(OUT, f'g7_edge_dpr{dpr}_{phase}.png')
                    await pg.screenshot(path=pth, full_page=True, clip={'x': box['x'] - 6, 'y': box['y'] - 6, 'width': box['w'] + 12, 'height': box['h'] + 12})
                    im = Image.open(pth).convert('RGBA'); W, H = im.size; px = im.load()
                    bg = px[1, 1]
                    widths = []
                    for y in range(H // 4, 3 * H // 4, max(1, H // 40)):
                        # walk from the left edge until the pixel differs from background, then count the ramp until it stabilises
                        x = 0
                        while x < W - 1 and abs(px[x, y][0] - bg[0]) + abs(px[x, y][1] - bg[1]) + abs(px[x, y][2] - bg[2]) < 24: x += 1
                        if x >= W - 2: continue
                        x0 = x; prev = px[x, y]
                        while x < W - 1:
                            cur = px[x + 1, y]
                            if abs(cur[0] - prev[0]) + abs(cur[1] - prev[1]) + abs(cur[2] - prev[2]) < 12: break
                            prev = cur; x += 1
                        widths.append(x - x0 + 1)
                    widths.sort()
                    med = widths[len(widths) // 2] if widths else None
                    edge[f'dpr{dpr}_{phase}'] = {'rows_sampled': len(widths), 'edge_width_device_px_median': med, 'edge_width_device_px_max': widths[-1] if widths else None,
                                                'edge_width_css_px_median': round(med / dpr, 2) if med else None}
                if phase == 'flight': await pg.wait_for_function('!window.__rigs[0].busy', timeout=15000)
                await ectx.close()
            r1, r2 = edge['dpr1_rest']['edge_width_device_px_median'], edge['dpr2_rest']['edge_width_device_px_median']
            f1, f2 = edge['dpr1_flight']['edge_width_device_px_median'], edge['dpr2_flight']['edge_width_device_px_median']
            edge['pass_soft_edge'] = bool(r1 and r2 and 1 <= r1 <= 4 and 1 <= r2 <= 6)            # anti-aliased (>= 1 px ramp), not blurred (> 4-6 device px)
            edge['pass_no_temporal_aliasing'] = bool(f1 and f2 and abs(f1 - r1) <= 1 and abs(f2 - r2) <= 2)   # rotating/translating does not harden or smear the edge
            edge['method'] = 'row scan of the wingL screenshot: ramp length between background and stable part colour, median over ~20 rows; raster webp parts drawn through SVG <image> are resampled by the compositor'
            report['gates']['G7_edge_width'] = edge

        # ---- G8 v1 vs v2: same flight vector, snapshot 60 ms after landing + at rest ----
        shots = []
        for eng in ('v1', 'v2'):
            pg = await open_page(ctx, engine=eng)
            if eng == 'v1':
                await pg.evaluate("void window.__rigs[0].fly([{x:0,y:0,t:0},{x:120,y:-140,t:.5},{x:240,y:-60,t:1}], {}, {base:{x:0,y:0}})")
            else:
                await pg.evaluate("void window.__rigs[0].states.fire('move:to', {by:{dx:240,dy:-60}})")
            await pg.wait_for_timeout(300)
            await pg.wait_for_function('!window.__rigs[0].busy', timeout=15000)
            await pg.wait_for_timeout(60)
            pth = os.path.join(OUT, f'g8_{eng}.png'); await shot_slot(pg, pth); shots.append(pth)
            report['gates'][f'G8_{eng}_after_landing'] = await pg.evaluate("({host: window.__rigs[0].svg.parentElement.style.transform, anims: document.getAnimations().length})")
            await pg.close()
        strip(shots, os.path.join(OUT, 'g8_side_by_side.png'))

        # ---- G6 + showcase video: squash -> anticipation -> arc -> settle -> talk (real voice) ----
        if a.video:
            vdir = os.path.join(OUT, 'video_v2_showcase')
            vctx = await b.new_context(viewport=VIEW, record_video_dir=vdir, record_video_size=VIEW)
            pg = await vctx.new_page()
            await pg.goto(BASE + 'index.html?engine=v2&auto=0&sw=0&n=1&hud=0&trace=1', wait_until='networkidle')
            await pg.wait_for_function('window.__rigs && window.__rigs.length===1')
            await pg.wait_for_timeout(1200)
            await pg.evaluate("void window.__rigs[0].states.fire('move:to', {target: document.getElementById('perch-card'), trace: true})")
            await pg.wait_for_function("!window.__rigs[0].busy", timeout=20000); await pg.wait_for_timeout(700)
            await pg.evaluate("void window.__rigs[0].states.fire('answer:correct')")
            await pg.wait_for_function("!window.__rigs[0].busy", timeout=20000); await pg.wait_for_timeout(500)
            await pg.evaluate("void window.__rigs[0].states.fire('answer:pending')")
            await pg.wait_for_function("!window.__rigs[0].busy", timeout=20000); await pg.wait_for_timeout(500)
            await pg.evaluate("void window.__rigs[0].states.fire('explain:start', {url: 'audio/explain_sample.mp3'})")   # G6: real voice envelope
            await pg.wait_for_timeout(400); await pg.wait_for_function("!window.__rigs[0].busy", timeout=30000); await pg.wait_for_timeout(400)
            await pg.evaluate("void window.__rigs[0].states.fire('move:to', {home: true, trace: true})")
            await pg.wait_for_function("!window.__rigs[0].busy", timeout=20000); await pg.wait_for_timeout(1200)
            await pg.evaluate('window.__setSlow(true)')
            await pg.evaluate("void window.__rigs[0].states.fire('move:to', {by:{dx:220,dy:-140}})")
            await pg.wait_for_timeout(300)
            await pg.wait_for_function("!window.__rigs[0].busy", timeout=60000); await pg.wait_for_timeout(1500)
            await vctx.close()
            report['video'] = sorted(os.listdir(vdir))

        await b.close()
    with open(os.path.join(OUT, 'proofs.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(json.dumps(report, ensure_ascii=False, indent=1)[:4000])

if __name__ == '__main__':
    asyncio.run(main())
