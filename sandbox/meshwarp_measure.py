#!/usr/bin/env python3
"""K9.2b-4 (ADR-002 addendum, part d): measured cost of a raster mesh-warp renderer.

Runs sandbox/proto/meshwarp.html under headless Chromium for a matrix of
(owls, grid) x CPU throttle (1x, 4x via CDP Emulation.setCPUThrottlingRate),
3 runs each; keeps the median of per-run medians. Same host, same browser and the
same rAF-delta metric as sandbox/measure.py so the SVG engine baseline is comparable.

Output: sandbox/samples/proofs/g11d_meshwarp_cost.json (+ g11d_meshwarp.png, one frame).
Deterministic inputs; timings are host-noisy by nature, hence 3 runs and medians.
"""
import asyncio, json, os, platform, statistics, sys, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get('SANDBOX_BASE', 'http://localhost:8080/sandbox/')
MATRIX = [(1, 4), (5, 4), (5, 6)]          # (owls, grid): 1 owl ~ real stage, 5 owls = stress, grid 6 = smoother bend
CPUS = [1, 4]
RUNS = 3
FRAMES = 240                               # 4 s at 60 Hz

async def one(pg, cdp, owls, grid, cpu, shot=None):
    await cdp.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
    await pg.goto(BASE + f'proto/meshwarp.html?n={owls}&grid={grid}&frames={FRAMES}')
    await pg.wait_for_function('window.__meshwarp', timeout=60000)
    r = await pg.evaluate('window.__meshwarp')
    if shot:
        await pg.screenshot(path=shot)
    return r

async def main():
    out = {'measured_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'base': BASE,
           'host': {'platform': platform.platform(), 'cpu_count': os.cpu_count(),
                    'cpu_model': next((l.split(':', 1)[1].strip() for l in open('/proc/cpuinfo') if l.startswith('model name')), None)},
           'method': 'Canvas2D affine-textured triangles (setTransform+clip+drawImage), GRIDxGRID cells x 2 tris per wing, 2 wings per owl; '
                     f'{RUNS} runs x {FRAMES} frames per cell; value = median over runs of the per-run median; CDP CPU throttle 1x and 4x',
           'cells': []}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1000, 'height': 420})
        pg = await ctx.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        cdp = await ctx.new_cdp_session(pg)
        shot_done = False
        for cpu in CPUS:
            for owls, grid in MATRIX:
                runs = []
                for k in range(RUNS):
                    shot = None
                    if not shot_done and owls == 5 and grid == 4 and cpu == 1:
                        shot = os.path.join(ROOT, 'samples', 'proofs', 'g11d_meshwarp.png'); shot_done = True
                    runs.append(await one(pg, cdp, owls, grid, cpu, shot))
                med = lambda key: round(statistics.median([r[key] for r in runs if r.get(key) is not None]), 3)
                cell = {'cpu_throttle': cpu, 'owls': owls, 'grid': grid, 'wings': owls * 2,
                        'triangles_per_frame': runs[0]['triangles_per_frame'], 'frames_per_run': runs[0]['frames'], 'runs': RUNS,
                        'draw_ms_median': med('draw_ms_median'), 'draw_ms_p95': med('draw_ms_p95'),
                        'budget_share_60fps_pct': round(med('draw_ms_median') / 16.7 * 100, 1),
                        'raf_p50_ms': med('raf_p50_ms'), 'raf_p95_ms': med('raf_p95_ms'), 'raf_p99_ms': med('raf_p99_ms'), 'jank_pct': med('jank_pct'),
                        'runs_draw_ms_median': [r['draw_ms_median'] for r in runs], 'runs_raf_p95_ms': [r['raf_p95_ms'] for r in runs]}
                out['cells'].append(cell)
                print(json.dumps(cell))
        out['browser'] = await pg.evaluate('navigator.userAgent')
        out['errors'] = errors
        await b.close()
    dst = os.path.join(ROOT, 'samples', 'proofs', 'g11d_meshwarp_cost.json')
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('wrote', dst, 'errors', len(errors))
    print('| cpu | owls | grid | tris/frame | draw ms p50 | draw ms p95 | budget % of 16.7 ms | rAF p50 | rAF p95 | jank % |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for c in out['cells']:
        print(f"| {c['cpu_throttle']}x | {c['owls']} | {c['grid']} | {c['triangles_per_frame']} | {c['draw_ms_median']} | {c['draw_ms_p95']} | {c['budget_share_60fps_pct']} | {c['raf_p50_ms']} | {c['raf_p95_ms']} | {c['jank_pct']} |")

if __name__ == '__main__':
    asyncio.run(main())
