// node sandbox/tests/k95_rng.mjs - unit test for engine/rng.js (K9.5-1, blink seed). No browser needed.
import { mulberry32, blinkRng } from '../engine/rng.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// 1. determinism: same seed -> same first 1000 values
const a = mulberry32(20260928), b = mulberry32(20260928);
let sameAll = true; for (let i = 0; i < 1000; i++) if (a() !== b()) { sameAll = false; break; }
ok(sameAll, 'mulberry32: same seed -> identical 1000-value stream');
// 2. different seeds differ
const c = mulberry32(7); let diff = false; const a2 = mulberry32(20260928); for (let i = 0; i < 10; i++) if (a2() !== c()) { diff = true; break; }
ok(diff, 'mulberry32: seeds 20260928 and 7 differ within 10 draws');
// 3. range [0, 1) and rough uniformity over 100k draws (each decile within 10 % +- 1.5 %)
const r = mulberry32(1); const bins = new Array(10).fill(0); let inRange = true;
for (let i = 0; i < 100000; i++) { const x = r(); if (!(x >= 0 && x < 1)) inRange = false; bins[Math.floor(x * 10)]++; }
ok(inRange, 'mulberry32: 100k draws all in [0, 1)');
ok(bins.every((n) => Math.abs(n / 100000 - 0.1) < 0.015), `mulberry32: deciles within 1.5 % of uniform (${bins.map((n) => (n / 1000).toFixed(1)).join(' ')} %)`);
// 4. blinkRng default path is Math.random (no seed)
ok(!blinkRng.seeded() && blinkRng._fn === Math.random, 'blinkRng: unseeded -> Math.random (behaviour unchanged)');
// 5. seed -> deterministic between(); null restores
blinkRng.seed('20260928'); const s1 = [blinkRng.between(1800, 4200), blinkRng.between(1800, 4200), blinkRng.random()];
blinkRng.seed(20260928); const s2 = [blinkRng.between(1800, 4200), blinkRng.between(1800, 4200), blinkRng.random()];
ok(blinkRng.seeded() && blinkRng.seedValue === 20260928 && s1.every((v, i) => v === s2[i]), `blinkRng: seed from string or number -> same stream (${s1.map((v) => v.toFixed(1)).join(', ')})`);
ok(s1[0] >= 1800 && s1[0] < 4200 && s1[1] >= 1800 && s1[1] < 4200, 'blinkRng.between(1800, 4200) inside the blink gap');
blinkRng.seed(null);
ok(!blinkRng.seeded() && blinkRng._fn === Math.random, 'blinkRng.seed(null) restores Math.random');
blinkRng.seed('abc');
ok(!blinkRng.seeded(), 'blinkRng.seed("abc") (non-numeric) stays unseeded');

console.log(fails ? `\nK95 RNG FAIL (${fails})` : '\nK95 RNG PASS');
process.exit(fails ? 1 : 0);
