#!/usr/bin/env python3
"""K9.5-1 proof (owner decision 2026-09-27, item b): the blink scheduler can be pinned at recording time on BOTH arms.

Budget declared in PROGRESS (K9.5 RESEARCH) before this file ran:
  same seed, two page loads          -> identical blink onset list (per arm), tolerance +-1 frame at 60 fps (16.7 ms) per onset
  two different seeds                -> different onset lists
  no ?seed= parameter                -> window.__blinkRng undefined: the Math.random path, unchanged behaviour
Method: load index.html?engine=<arm>&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0[&seed=N], wrap rig.blink to log onset times
relative to the hook, watch WINDOW_MS of idle, read the list. The hook is installed right after READY so page-load
jitter enters only as a constant offset; setTimeout jitter is what the tolerance covers.
Output: samples/proofs/k95_blink_seed.json (numbers + pass flags computed here). Exit 1 on any FAIL.
"""
import asyncio, json, os, sys, time

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'samples', 'proofs', 'k95_blink_seed.json')
BASE = os.environ.get('SANDBOX_BASE', 'http://127.0.0.1:8080/sandbox/')
WINDOW_MS = 12000
TOL_MS = 16.7
SEED_A, SEED_B = 20260928, 7
READY = "window.__rigs && window.__rigs[0] && !window.__rigs[0].busy"
# The first blink timer was armed at mount (before the hook) with the FIRST draw of the source, so onset 1 is already
# seed-determined; we log every blink from the hook on and compare the whole list.
HOOK = """() => { const r = window.__rigs[0]; const t0 = performance.now(); window.__blinks = []; const ob = r.blink.bind(r);
  r.blink = (d) => { window.__blinks.push({ t: Math.round(performance.now() - t0), double: !!d }); return ob(d); }; return true; }"""
STATE = """() => ({ src: typeof window.__blinkRng, seeded: !!(window.__blinkRng && window.__blinkRng.seeded()),
  seedValue: window.__blinkRng ? window.__blinkRng.seedValue : null, blinks: window.__blinks })"""


async def run(b, engine, seed):
    url = BASE + f'index.html?engine={engine}&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0' + (f'&seed={seed}' if seed is not None else '')
    pg = await b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(url, wait_until='networkidle'); await pg.wait_for_function(READY)
    await pg.evaluate(HOOK); await pg.wait_for_timeout(WINDOW_MS)
    st = await pg.evaluate(STATE); await pg.close()
    st.update({'errors': errs, 'engine': engine, 'seed': seed, 'url': url})
    return st


def gaps(bl):
    """inter-blink gaps: independent of when the hook was installed"""
    t = [x['t'] for x in bl]; return [b - a for a, b in zip(t, t[1:])]


def same(a, b):
    ga, gb = gaps(a), gaps(b)
    if len(ga) != len(gb) or len(ga) < 1: return False
    return all(abs(x - y) <= TOL_MS for x, y in zip(ga, gb)) and [x['double'] for x in a[1:]] == [y['double'] for y in b[1:]]


async def main():
    from playwright.async_api import async_playwright
    res = {'captured_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'window_ms': WINDOW_MS, 'tolerance_ms': TOL_MS,
           'compare': 'inter-blink gaps and double flags from the 2nd logged blink on', 'runs': {}, 'pass': {}}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for engine in ('v2', 'v1'):
            a1 = await run(b, engine, SEED_A); a2 = await run(b, engine, SEED_A); c = await run(b, engine, SEED_B); n = await run(b, engine, None)
            res['runs'][engine] = {f'seed_{SEED_A}_run1': a1, f'seed_{SEED_A}_run2': a2, f'seed_{SEED_B}': c, 'no_seed': n}
            res['pass'][engine] = {
                'same_seed_identical_gaps': same(a1['blinks'], a2['blinks']),
                'different_seed_differs': not same(a1['blinks'], c['blinks']),
                'no_seed_uses_math_random': n['src'] == 'undefined',
                'seeded_flag_set': a1['seeded'] and a1['seedValue'] == SEED_A,
                'no_page_errors': not (a1['errors'] or a2['errors'] or c['errors'] or n['errors']),
                'enough_blinks': min(len(a1['blinks']), len(a2['blinks'])) >= 3,
            }
        await b.close()
    res['pass_all'] = all(all(v.values()) for v in res['pass'].values())
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as fh: json.dump(res, fh, indent=1)
    for e, v in res['pass'].items():
        R = res['runs'][e]
        print(e, v, '| gaps same-seed run1', gaps(R[f'seed_{SEED_A}_run1']['blinks']), 'run2', gaps(R[f'seed_{SEED_A}_run2']['blinks']), f'| seed {SEED_B}', gaps(R[f'seed_{SEED_B}']['blinks']), '| no seed', gaps(R['no_seed']['blinks']))
    print('K9.5-1 blink seed proof:', 'PASS' if res['pass_all'] else 'FAIL', '->', os.path.relpath(OUT, ROOT))
    sys.exit(0 if res['pass_all'] else 1)


if __name__ == '__main__':
    asyncio.run(main())
