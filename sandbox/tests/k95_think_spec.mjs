/**
 * K9.5-2 unit test (owner decision 2026-09-27, item a): the acting.performances.think block validates, the validator
 * enforces the K9.5 budgets (|gaze| <= 6 px, driftPx <= 2, headDeg <= 9, wing boolean, tier vfx in the catalogue),
 * CLIPS.body.ponder routes to rig.ponder (not rig.puzzled) and falls back to think() when the spec block is absent,
 * and P.puzzled is byte-identical to its recorded baseline (sha256 prefix c9b154b0ecc7e837).
 *
 * validateActing lives in acting.js, which imports rig.js with a cache-busting query (browser-only). The function is
 * pure and self-contained, so its source text is lifted and evaluated here - no browser, no dependencies.
 * Run: node sandbox/tests/k95_think_spec.mjs
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log((cond ? 'PASS ' : 'FAIL ') + msg); };

const actingSrc = readFileSync(join(here, '../engine/acting.js'), 'utf8');
const owl = JSON.parse(readFileSync(join(here, '../companions/owl.motion.json'), 'utf8'));

// lift validateActing out of the module text
const start = actingSrc.indexOf('export function validateActing(spec)');
check(start >= 0, 'validateActing found in acting.js');
const fnText = actingSrc.slice(start + 'export '.length, actingSrc.indexOf('\n}\n', start) + 2);
const validateActing = new Function(`${fnText}; return validateActing;`)();

// K9.6-2 (owner decision a3e73842): the routed acting.performances.think is now the v1 choreography as data (choreo
// schema, tested in k96_choreo_spec.mjs). The K9.5-2 calm design is preserved verbatim as acting.performances.think_calm_k95
// (record only, not routed). This test keeps checking that design and its validator branch by re-seating the record
// under `think` in a copy - so the K9.5 budgets stay enforced for as long as the legacy branch exists.
const shipped = owl.acting && owl.acting.performances;
check(!!(shipped && shipped.think && shipped.think.choreo), 'owl.motion.json routed think carries choreo (K9.6-2)');
check(!!(shipped && shipped.think_calm_k95 && !shipped.think_calm_k95.choreo), 'owl.motion.json keeps think_calm_k95 as an un-routed record');
const p00 = validateActing(owl);
check(p00.length === 0, `shipped owl spec validates (${p00.length} problems${p00.length ? ': ' + p00.join(' | ') : ''})`);
const owlK95 = JSON.parse(JSON.stringify(owl)); owlK95.acting.performances.think = owlK95.acting.performances.think_calm_k95; delete owlK95.acting.performances.think_calm_k95;

// 1) the K9.5 record validates when seated as the think block (legacy branch)
const K = owlK95.acting.performances.think;
check(!!K, 'think_calm_k95 record present');
const p0 = validateActing(owlK95);
check(p0.length === 0, `K9.5 record validates under the legacy branch (${p0.length} problems${p0.length ? ': ' + p0.join(' | ') : ''})`);

// 2) budget enforcement - each mutation must be rejected with a think-scoped message
const mutate = (fn) => { const s = JSON.parse(JSON.stringify(owlK95)); fn(s.acting.performances.think); return validateActing(s).filter((m) => m.includes('performances.think')); };
check(mutate((t) => { t.gazePx = [6, 6]; }).length === 1, 'rejects |gazePx| > 6 px');
check(mutate((t) => { t.gazePx = [4]; }).length === 1, 'rejects gazePx that is not [dx,dy]');
check(mutate((t) => { t.gazePx = [1, -1]; t.driftPx = 2.5; }).length === 1, 'rejects driftPx > 2 (with a small gaze so only the drift rule fires)');
check(mutate((t) => { t.gazePx = [4, -4]; }).length === 1, 'rejects |gaze| + driftPx > 6 px (5.66 + 0.8)');
check(mutate((t) => { t.tiers.large.headDeg = 12; }).length === 1, 'rejects tier headDeg > 9');
check(mutate((t) => { t.tiers.small.wing = 'yes'; }).length === 1, 'rejects non-boolean wing');
check(mutate((t) => { t.tiers.large.vfx = ['nope']; }).length === 1, 'rejects vfx name outside the catalogue');
check(mutate((t) => { t.holdMs = [1100, 4000]; }).length === 1, 'rejects lift + holdMs[1] + settle > totalMaxMs + 500');
check(mutate((t) => { delete t.blinkAtMs; }).length === 1, 'rejects missing blinkAtMs');
check(mutate((t) => { delete t.tiers.medium; }).length === 1, 'rejects a missing tier');
// removing the block entirely is allowed (legacy think() fallback)
const noBlock = JSON.parse(JSON.stringify(owlK95)); delete noBlock.acting.performances.think;
check(validateActing(noBlock).length === 0, 'spec without the think block still validates (fallback path)');

// 3) shipped values sit inside the frozen budgets (not only "valid")
check(K.totalMaxMs <= 3000, `totalMaxMs ${K.totalMaxMs} <= 3000`);
check(Math.max(...['small', 'medium', 'large'].map((t) => K.tiers[t].headDeg)) <= 9, 'max tier headDeg <= 9');
check(Math.hypot(K.gazePx[0], K.gazePx[1]) + K.driftPx <= 6.5, 'gaze + drift excursion <= 6.5 px');

// 4) CLIPS.body.ponder routes to rig.ponder and falls back to think()
// (K9.6-3 routes to the choreo player when performances.think.choreo exists; the legacy ponder route below is kept for
// a spec whose think block has no choreo, exactly as it was.)
const { CLIPS } = await import(join(here, '../engine/states.js'));
const calls = [];
const rigA = { ponder: (t) => { calls.push(['ponder', t]); return 'A'; }, puzzled: () => { calls.push(['puzzled']); }, think: () => { calls.push(['think']); }, perfSpec: (n) => (n === 'think' ? K : null), escalate: (ch) => { calls.push(['escalate', ch]); return 'medium'; } };
CLIPS.body.ponder(rigA);
check(calls.some((c) => c[0] === 'ponder' && c[1] === 'medium') && !calls.some((c) => c[0] === 'puzzled'), 'CLIPS.body.ponder -> rig.ponder(escalate(think)), never rig.puzzled');
check(calls.some((c) => c[0] === 'escalate' && c[1] === 'think'), 'escalation channel is think (own counter, not puzzled)');
calls.length = 0;
const rigB = { ...rigA, perfSpec: () => null };
CLIPS.body.ponder(rigB);
check(calls.length === 1 && calls[0][0] === 'think', 'no spec block -> legacy think() fallback');
calls.length = 0;
const rigC = { think: () => { calls.push(['think']); } };
CLIPS.body.ponder(rigC);
check(calls.length === 1 && calls[0][0] === 'think', 'v1 rig (no ponder method) -> think()');

// 5) puzzled untouched
const pi = actingSrc.indexOf('P.puzzled = function');
const pj = actingSrc.indexOf('\n};\n', pi) + 4;
const sha = createHash('sha256').update(actingSrc.slice(pi, pj)).digest('hex').slice(0, 16);
check(sha === 'c9b154b0ecc7e837', `P.puzzled function text sha16 == c9b154b0ecc7e837 (got ${sha})`);
check(actingSrc.indexOf('P.ponder = function') < pi, 'P.ponder is inserted before P.puzzled (insert-only)');

console.log(fails.length ? `K95 THINK SPEC FAIL (${fails.length})` : 'K95 THINK SPEC PASS');
process.exit(fails.length ? 1 : 0);
