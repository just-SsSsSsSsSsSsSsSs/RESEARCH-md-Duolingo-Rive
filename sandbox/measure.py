#!/usr/bin/env python3
"""
sandbox/measure.py - Gate 4 measurement harness (R1-A1, decision D5).

Measures the SVG+WAAPI rig prototype for 1 / 3 / 5 companions:
  - JS heap delta after mount (MB, via CDP Performance.getMetrics)
  - DOM node count
  - document.getAnimations().length
  - rAF frame time p50 / p95 over a 10 s window while idle + one celebrate + one talk
  - transferred bytes for the scene (all responses under /sandbox/)
Optionally records a short video sample for the owner (--video).

Usage:  python3 tools/serve.py 8080 &  then  python3 sandbox/measure.py [--video] [--seconds 10]
Output: sandbox/samples/measure.json and a markdown table on stdout.
Numbers come from the CI/sandbox machine (a proxy), not from a 2-3 GB Android.
"""
import argparse, asyncio, json, os, statistics, sys, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get('SANDBOX_BASE', 'http://localhost:8080/sandbox/')

SAMPLER = """
() => new Promise((resolve) => {
  const deltas = []; let last = performance.now(); const end = last + %d;
  function loop(now) { deltas.push(now - last); last = now; if (now < end) requestAnimationFrame(loop); else resolve(deltas); }
  requestAnimationFrame(loop);
})
"""

def pct(v, p):
    s = sorted(v); return s[min(len(s) - 1, int(len(s) * p))]

async def heap_mb(cdp):
    m = await cdp.send('Performance.getMetrics')
    d = {x['name']: x['value'] for x in m['metrics']}
    return d.get('JSHeapUsedSize', 0) / 1e6, d.get('Nodes', 0)

async def measure(n, seconds, video_dir, art='p1', engine='v1'):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--enable-precise-memory-info'])
        ctx_kw = {'viewport': {'width': 900, 'height': 600}}
        if video_dir: ctx_kw.update(record_video_dir=video_dir, record_video_size={'width': 900, 'height': 600})
        ctx = await b.new_context(**ctx_kw)
        pg = await ctx.new_page()
        transferred = 0
        async def on_resp(r):
            nonlocal transferred
            if '/sandbox/' in r.url:
                try:
                    body = await r.body(); transferred += len(body)
                except Exception: pass
        pg.on('response', lambda r: asyncio.ensure_future(on_resp(r)))
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)

        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Performance.enable')
        # blank baseline heap in the same renderer
        await pg.goto(BASE + f'index.html?n=0&sw=0&auto=0&art={art}&engine={engine}')
        await pg.wait_for_timeout(500)
        await cdp.send('HeapProfiler.collectGarbage')
        h0, _ = await heap_mb(cdp)

        await pg.goto(BASE + f'index.html?n={n}&sw=0&auto=0&art={art}&engine={engine}')
        await pg.wait_for_function(f'window.__rigs && window.__rigs.length==={n}')
        await pg.wait_for_timeout(800)
        await cdp.send('HeapProfiler.collectGarbage')
        h1, nodes_cdp = await heap_mb(cdp)
        nodes = await pg.evaluate("document.getElementsByTagName('*').length")
        anims = await pg.evaluate('document.getAnimations().length')

        # scripted scene: idle, celebrate at 2 s, talk at 4.5 s, idle to the end
        async def script():
            await pg.wait_for_timeout(500); await pg.evaluate("window.__act('fly')")
            await pg.wait_for_timeout(4800); await pg.evaluate("window.__act('celebrate')")
            await pg.wait_for_timeout(2000); await pg.evaluate("window.__act('talk')")
        task = asyncio.ensure_future(script())
        deltas = await pg.evaluate(SAMPLER % int(seconds * 1000))
        await task
        anims_peak = await pg.evaluate('document.getAnimations().length')
        await cdp.send('HeapProfiler.collectGarbage')
        h2, _ = await heap_mb(cdp)
        # idle-loop guard (G9): after the scene settles, no engine rAF loop may still be running
        await pg.wait_for_function('window.__rigs.every(r => !r.busy)', timeout=15000)
        await pg.wait_for_timeout(1500)
        idle_loops = await pg.evaluate("window.__rigs.filter(r => (r.secondary && r.secondary.running) || r._driveRaf || r._talkRaf).length")

        # dispose check: animations must go to zero after dispose (leak guard)
        await pg.evaluate('window.__rigs.forEach(r => r.dispose())')
        anims_after = await pg.evaluate("document.getAnimations().filter(a => a.effect.target.closest('svg') || a.effect.target.classList.contains('slot')).length")  # rig + stage host only; decorative CSS stars excluded

        await pg.wait_for_timeout(300)
        await ctx.close(); await b.close()
        return {
            'art': art,
            'companions': n,
            'heap_delta_mb_after_mount': round(h1 - h0, 2),
            'heap_delta_mb_after_scene': round(h2 - h0, 2),
            'dom_nodes': nodes,
            'animations_idle': anims,
            'animations_peak_sampled': anims_peak,
            'animations_after_dispose': anims_after,
            'frames': len(deltas),
            'raf_p50_ms': round(pct(deltas, 0.5), 2),
            'raf_p95_ms': round(pct(deltas, 0.95), 2),
            'raf_max_ms': round(max(deltas), 2),
            'long_frames_over_33ms': sum(1 for d in deltas if d > 33),
            'jank_frames_over_20ms': sum(1 for d in deltas if d > 20),
            'jank_pct': round(100 * sum(1 for d in deltas if d > 20) / max(1, len(deltas)), 2),
            'engine_idle_loops_after_scene': idle_loops,
            'engine': engine,
            'transferred_bytes': transferred,
            'errors': errors,
        }

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seconds', type=float, default=10)
    ap.add_argument('--video', action='store_true')
    ap.add_argument('--counts', default='1,3,5')
    ap.add_argument('--art', default='p1', help='p1 geometric | p2 layered parts')
    ap.add_argument('--engine', default='v1', help='v1 reference rig | v2 spec + physics (ADR-001)')
    a = ap.parse_args()
    out = []
    for n in [int(x) for x in a.counts.split(',')]:
        vdir = os.path.join(ROOT, 'samples', f'video_{a.art}_{a.engine}_{n}') if (a.video and n == 3) else None
        r = await measure(n, a.seconds, vdir, a.art, a.engine)
        out.append(r)
        print(json.dumps(r, ensure_ascii=False))
    res = {'measured_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'base': BASE,
           'machine': 'sandbox CI proxy (not a 2-3 GB Android)', 'results': out}
    name = 'measure.json' if (a.art == 'p1' and a.engine == 'v1') else f'measure_{a.art}_{a.engine}.json'
    with open(os.path.join(ROOT, 'samples', name), 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=2)
    print(f'\n| engine {a.engine} art {a.art} | heap delta mount MB | heap delta scene MB | DOM nodes | anims idle | anims after dispose | rAF p50 ms | rAF p95 ms | max ms | jank >20ms (%) | idle loops | bytes |')
    print('|---|---|---|---|---|---|---|---|---|---|---|---|')
    for r in out:
        print(f"| {r['companions']} | {r['heap_delta_mb_after_mount']} | {r['heap_delta_mb_after_scene']} | {r['dom_nodes']} | {r['animations_idle']} | {r['animations_after_dispose']} | {r['raf_p50_ms']} | {r['raf_p95_ms']} | {r['raf_max_ms']} | {r['jank_frames_over_20ms']} ({r['jank_pct']}%) | {r['engine_idle_loops_after_scene']} | {r['transferred_bytes']} |")
    thresholds = {'p95_at_3_le_20ms': None, 'heap_at_5_le_20mb': None, 'jank_lt_1pct_all': all(r['jank_pct'] < 1 for r in out), 'no_idle_loops_all': all(r['engine_idle_loops_after_scene'] == 0 for r in out)}
    for r in out:
        if r['companions'] == 3: thresholds['p95_at_3_le_20ms'] = r['raf_p95_ms'] <= 20
        if r['companions'] == 5: thresholds['heap_at_5_le_20mb'] = r['heap_delta_mb_after_scene'] <= 20
    print('thresholds (D5):', thresholds)
    return 0 if all(v is not False for v in thresholds.values()) else 1

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
