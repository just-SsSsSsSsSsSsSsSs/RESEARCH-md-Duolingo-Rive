// G10 architecture gate: "add a fake character by data only" (no engine code changes).
// Runs in node: `node sandbox/tests/g10_fake_character.mjs` -> exit 0 = PASS.
// Also exercises the physics core headlessly (spring settle, squash volume, Bezier sampling).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

globalThis.matchMedia = undefined;   // REDUCED resolves to false outside a browser
const here = dirname(fileURLToPath(import.meta.url));
const { validateSpec, CLIPS } = await import(join(here, '../engine/states.js'));
const { Spring, SquashSpring, bezier, SecondaryRig } = await import(join(here, '../engine/physics.js'));

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log((cond ? 'PASS ' : 'FAIL ') + msg); };

// 1) the shipped owl spec validates
const owl = JSON.parse(readFileSync(join(here, '../companions/owl.motion.json'), 'utf8'));
const v1 = validateSpec(owl);
check(v1.ok, `owl.motion.json validates (${v1.problems.length} problems)`);

// 2) a brand-new character: different art, different physics, a new state + event - data only
const fake = JSON.parse(JSON.stringify(owl));
fake.name = 'fake-robot';
fake.art = 'companions/robot_test.svg';
fake.secondary = {
  antenna: { k: 90, c: 6, gainV: -30, gainA: -150, axis: 'x', limit: 60, settleMs: 1500 },
  armL: { k: 400, c: 30, gainV: -10, gainA: -80, axis: 'y', limit: 20, settleMs: 500 },
};
fake.squash.landing = { scaleY: 0.9, k: 600, c: 30 };          // stiffer, more mechanical
fake.timing.breath = [4000, 5000];
fake.states.list.reboot = { body: 'recoil', mouth: 'closed', gaze: 'dizzy', next: 'idle' };
fake.states.events['power:cycle'] = 'reboot';
fake.states.variety.pool.push('reboot');
const v2 = validateSpec(fake);
check(v2.ok, `fake character validates by data only (${v2.problems.length} problems)`);

// 3) the physics core accepts the fake secondary table without code changes
const applied = {};
const rig = new SecondaryRig(fake.secondary, (n, deg) => { applied[n] = deg; });
check(Object.keys(rig.springs).join(',') === 'antenna,armL', 'SecondaryRig builds springs from the fake table');
rig.springs.antenna.kick(400);
let t = 0; while (t < 3 && !rig.springs.antenna.atRest) { rig.springs.antenna.step(1 / 120); t += 1 / 120; }
check(rig.springs.antenna.atRest && t < 3, `antenna spring settles in ${t.toFixed(2)} s (k=90, c=6)`);

// 4) broken data is rejected with actionable messages (the gate must be able to fail)
const bad = JSON.parse(JSON.stringify(owl));
bad.states.list.dance = { body: 'moonwalk', next: 'nowhere' };
bad.states.events.party = 'ghost';
bad.secondary.armL.k = 0;
bad.squash.landing.scaleY = 1.3;
const v3 = validateSpec(bad);
check(!v3.ok && v3.problems.length >= 5, `bad spec rejected with ${v3.problems.length} problems`);
v3.problems.forEach((p) => console.log('   - ' + p));

// 5) physics invariants used by the 12-principles matrix
const sq = new SquashSpring(owl.squash.landing);
sq.impact(0.8);
let minSy = 1, maxSy = 1, tt = 0, volumeErr = 0;
while (!sq.atRest && tt < 3) { const { sx, sy } = sq.step(1 / 120); minSy = Math.min(minSy, sy); maxSy = Math.max(maxSy, sy); volumeErr = Math.max(volumeErr, Math.abs(sx * sy - 1)); tt += 1 / 120; }
check(minSy <= 0.81 && maxSy > 1.0, `landing squash reaches ${minSy.toFixed(3)} then overshoots to ${maxSy.toFixed(3)} (rebound)`);
check(volumeErr < 1e-9, `volume preserved: |sx*sy - 1| max = ${volumeErr.toExponential(1)}`);
check(sq.atRest && tt < 1.5, `landing settles in ${tt.toFixed(2)} s`);

const { points, length } = bezier.sampleEven({ x: 0, y: 0 }, { x: 60, y: -180 }, { x: 200, y: -170 }, { x: 260, y: -150 }, 40);
const seg = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
const spread = (Math.max(...seg) - Math.min(...seg)) / (length / 40);
check(points.length === 41 && spread < 0.15, `Bezier arc-length sampling even within ${(spread * 100).toFixed(1)}% (41 points, ${length.toFixed(0)} px)`);

// 6) every clip referenced by any layer exists as a function (engine contract)
const missing = [];
for (const layer of owl.states.layers) for (const st of Object.values(owl.states.list)) { const c = st[layer]; if (c && typeof CLIPS[layer][c] !== 'function') missing.push(`${layer}.${c}`); }
check(missing.length === 0, 'all owl clips resolve to engine functions');

console.log(fails.length ? `\nG10 FAIL (${fails.length})` : '\nG10 PASS');
process.exit(fails.length ? 1 : 0);
