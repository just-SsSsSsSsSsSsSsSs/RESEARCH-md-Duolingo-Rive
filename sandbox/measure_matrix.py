#!/usr/bin/env python3
"""K9.2b-6: performance matrix under IDENTICAL conditions (directive #03).

Configs: v2 + Foley | v2 no-Foley (&sfx=0) | v1 reference rig, each at CPU 1x and 4x, n = 5 owls,
REPEAT interleaved rounds (round-robin over all six cells so host drift hits every cell equally).
Reuses sandbox/measure.py's measure() untouched (same sampler, scene script, thresholds); only the
scheduling and the collation are new. Value kept per cell = median over rounds of each metric.

Output: sandbox/samples/measure_matrix.json + a markdown table on stdout.
"""
import asyncio, json, os, statistics, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import measure as M                       # sandbox/measure.py

ROOT = os.path.dirname(os.path.abspath(__file__))
N = int(os.environ.get('MATRIX_N', '5'))
ROUNDS = int(os.environ.get('MATRIX_ROUNDS', '3'))
SECONDS = float(os.environ.get('MATRIX_SECONDS', '6'))
CELLS = [
    ('v2 + Foley',  'p2', 'v2', ''),
    ('v2 no-Foley', 'p2', 'v2', '&sfx=0'),
    ('v1 reference', 'p2', 'v1', ''),
]
CPUS = [1.0, 4.0]
KEYS = ['raf_p50_ms', 'raf_p95_ms', 'raf_p99_ms', 'raf_max_ms', 'jank_pct', 'heap_delta_mb_after_scene', 'animations_idle', 'dom_nodes', 'engine_idle_loops_after_scene']

async def main():
    runs = {}                             # (label, cpu) -> [result per round]
    order = [(c, cpu) for cpu in CPUS for c in CELLS]
    for rnd in range(ROUNDS):
        for (label, art, engine, extra), cpu in order:
            r = await M.measure(N, SECONDS, None, art, engine, cpu, extra)
            runs.setdefault((label, cpu), []).append(r)
            print(json.dumps({'round': rnd + 1, 'cell': label, 'cpu': cpu, 'raf_p95_ms': r['raf_p95_ms'], 'jank_pct': r['jank_pct'], 'errors': len(r['errors'])}), flush=True)
    cells = []
    for (label, cpu), rs in runs.items():
        cell = {'cell': label, 'cpu_throttle': cpu, 'companions': N, 'rounds': len(rs), 'engine': rs[0]['engine'], 'extra': next(c[3] for c in CELLS if c[0] == label)}
        for k in KEYS:
            cell[k] = round(statistics.median([r[k] for r in rs]), 2)
        cell['runs_jank_pct'] = [r['jank_pct'] for r in rs]; cell['runs_p95_ms'] = [r['raf_p95_ms'] for r in rs]
        cell['errors'] = sum(len(r['errors']) for r in rs)
        cell['budget_p95_le_16_7'] = cell['raf_p95_ms'] <= 16.7; cell['budget_jank_lt_1pct'] = cell['jank_pct'] < 1.0
        cells.append(cell)
    out = {'measured_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'base': M.BASE, 'companions': N, 'seconds_per_run': SECONDS, 'rounds': ROUNDS,
           'schedule': 'interleaved round-robin over all cells per round (identical host conditions)',
           'host': {'cpu_count': os.cpu_count(), 'cpu_model': next((l.split(':', 1)[1].strip() for l in open('/proc/cpuinfo') if l.startswith('model name')), None)},
           'browser': next(iter(runs.values()))[0]['env']['ua'], 'cells': cells}
    dst = os.path.join(ROOT, 'samples', 'measure_matrix.json')
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('wrote', dst)
    print(f'| cell (n={N}) | cpu | rAF p50 | p95 | p99 | max | jank >20 ms % | heap MB | anims idle | DOM | idle loops | p95 <= 16.7 | jank < 1 % |')
    print('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for c in cells:
        print(f"| {c['cell']} | {int(c['cpu_throttle'])}x | {c['raf_p50_ms']} | {c['raf_p95_ms']} | {c['raf_p99_ms']} | {c['raf_max_ms']} | {c['jank_pct']} | {c['heap_delta_mb_after_scene']} | {int(c['animations_idle'])} | {int(c['dom_nodes'])} | {int(c['engine_idle_loops_after_scene'])} | {'yes' if c['budget_p95_le_16_7'] else 'NO'} | {'yes' if c['budget_jank_lt_1pct'] else 'NO'} |")

if __name__ == '__main__':
    asyncio.run(main())
