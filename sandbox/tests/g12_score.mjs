// node sandbox/tests/g12_score.mjs  - tests for samples/watch/score_core.js (G12 scorer)
// Declared before the first run: the direction trap must be caught (a v2 LOSS with small p is FAIL, never PASS).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const G12 = require(path.join(here, '..', 'samples', 'watch', 'score_core.js'));
const M = JSON.parse(readFileSync(path.join(here, '..', 'samples', 'watch', 'manifest.json'), 'utf8'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const near = (a, b, eps = 1e-4) => Math.abs(a - b) <= eps;

// 1. p-values match the kit's own examples (manifest.readout_examples_p) - same formula
for (const [kn, p] of Object.entries(M.readout_examples_p)) {
  const [k, n] = kn.split('/').map(Number);
  ok(near(G12.twoSided(k, n), p), `twoSided(${k},${n}) = ${G12.twoSided(k, n).toFixed(4)} matches manifest ${p}`);
}
// 2. symmetry (the trap) and thresholds
ok(near(G12.twoSided(10, 12), G12.twoSided(2, 12)), 'two-sided p is symmetric: 10/12 == 2/12 (the trap exists)');
ok(G12.minWins(12) === 10 && G12.minWins(16) === 13 && G12.minWins(20) === 15, 'thresholds 12->10, 16->13, 20->15');

function block(rater, choices) {
  const answers = M.order.map((o, i) => ({ trial: i + 1, beat: o.beat, chosen: choices[i], ms: 1000, replays: 0 }));
  const k = answers.filter(a => a.chosen === 'v2').length;
  return { kit: M.generated_at, rater, seed: M.seed, order_sha256: M.order_sha256, n: answers.length, v2_chosen: k, v1_chosen: answers.length - k, binomial_two_sided_p: +G12.twoSided(k, answers.length).toFixed(4), answers };
}
const W = ['v2', 'v2', 'v2', 'v2'], L = ['v1', 'v1', 'v1', 'v1'];

// 3. PASS: 3 raters, 12 trials, v2 11/12
let r = G12.score([block('a', W), block('b', W), block('c', ['v2', 'v2', 'v2', 'v1'])], M);
ok(r.verdict === 'PASS' && r.v2_chosen === 11, `11/12 from 3 raters -> ${r.verdict}`);
// 4. PASS at the boundary 10/12
r = G12.score([block('a', W), block('b', ['v2', 'v2', 'v2', 'v1']), block('c', ['v2', 'v2', 'v2', 'v1'])], M);
ok(r.verdict === 'PASS' && r.v2_chosen === 10 && near(r.two_sided_p, 0.0386), `10/12 -> ${r.verdict} p ${r.two_sided_p.toFixed(4)}`);
// 5. the trap: v2 loses 2/12, p 0.0386 -> FAIL not PASS
r = G12.score([block('a', L), block('b', ['v1', 'v1', 'v1', 'v2']), block('c', ['v1', 'v1', 'v1', 'v2'])], M);
ok(r.verdict === 'FAIL' && r.v2_chosen === 2 && near(r.two_sided_p, 0.0386), `2/12 (p ${r.two_sided_p.toFixed(4)}) -> ${r.verdict} (trap caught)`);
// 6. the trap, total loss 0/12, p 0.0005 -> FAIL
r = G12.score([block('a', L), block('b', L), block('c', L)], M);
ok(r.verdict === 'FAIL' && near(r.two_sided_p, 0.0005), `0/12 (p ${r.two_sided_p.toFixed(4)}) -> ${r.verdict} (trap caught)`);
// 7. no evidence: 8/12
r = G12.score([block('a', ['v2', 'v2', 'v1', 'v1']), block('b', ['v2', 'v2', 'v2', 'v1']), block('c', ['v2', 'v2', 'v2', 'v1'])], M);
ok(r.verdict === 'FAIL' && r.v2_chosen === 8, `8/12 -> ${r.verdict} (no evidence)`);
// 8. INSUFFICIENT: 2 raters, 8 trials
r = G12.score([block('a', W), block('b', W)], M);
ok(r.verdict === 'INSUFFICIENT', `2 raters / 8 trials -> ${r.verdict}`);
// 9. INSUFFICIENT: 3 unnamed sessions do not count as 3 raters
r = G12.score([block(null, W), block('', W), block('  ', W)], M);
ok(r.verdict === 'INSUFFICIENT' && r.raters.length === 0 && r.unnamed_sessions === 3, `3 unnamed sessions -> ${r.verdict} (raters ${r.raters.length})`);
// 10. REJECTED: wrong order_sha256
const bad = block('x', W); bad.order_sha256 = '0'.repeat(64);
r = G12.score([bad], M);
ok(r.verdict === 'REJECTED' && r.blocks_rejected.length === 1, `foreign block -> ${r.verdict}`);
// 11. mixed: one foreign block dropped, the rest scored
r = G12.score([bad, block('a', W), block('b', W), block('c', W)], M);
ok(r.verdict === 'PASS' && r.blocks_rejected.length === 1 && r.blocks_accepted === 3, `1 foreign + 3 good -> ${r.verdict}, rejected ${r.blocks_rejected.length}`);
// 12. parser: concatenated blocks with noise between them
const text = 'x ' + JSON.stringify(block('a', W)) + '\n---\n' + JSON.stringify(block('b', W), null, 1) + ' trailing';
const parsed = G12.parseBlocks(text);
ok(parsed.blocks.length === 2 && parsed.errors.length === 0, `parseBlocks -> ${parsed.blocks.length} blocks, ${parsed.errors.length} errors`);
// 13. the real first block from the gist (rater null, 3/4, rated on kit v1) - under kit v2 it is REJECTED by design
//     (kit / seed / order mismatch; gist rev b693458e: kit-v1 sessions stay in results/ and are never pooled with kit v2).
//     Against the kit it was rated on (manifest.previous_kit) the same block still validates and reads INSUFFICIENT alone.
const first = JSON.parse(readFileSync(path.join(here, '..', 'samples', 'watch', 'results', '2026-09-27_gist-d33eaf03_rater-null.json'), 'utf8'));
r = G12.score([first], M);
ok(r.verdict === 'REJECTED' && r.blocks_rejected.length === 1 && r.blocks_accepted === 0, `kit-v1 real block under kit v${M.kit_version} -> ${r.verdict} (by design)`);
ok(M.kit_version === 2 && M.previous_kit && M.previous_kit.kit_version === 1 && M.previous_kit.seed !== M.seed && M.previous_kit.order_sha256 !== M.order_sha256,
  `manifest is kit v${M.kit_version}; previous_kit v${M.previous_kit && M.previous_kit.kit_version} has a different seed and order_sha256`);
const Mv1 = { ...M, generated_at: M.previous_kit.generated_at, seed: M.previous_kit.seed, order_sha256: M.previous_kit.order_sha256, order: first.answers.map(a => ({ beat: a.beat, left: 'v2' })) };
r = G12.score([first], Mv1);
ok(r.verdict === 'INSUFFICIENT' && r.n === 4 && r.v2_chosen === 3, `same block against its own kit (previous_kit) -> ${r.verdict} (${r.v2_chosen}/${r.n})`);
// 14. kit v2 rule line: every clip states which state it runs; the think clip runs the real state, not puzzled
ok(M.states_per_clip && M.beats.every(b => M.states_per_clip[b] && M.states_per_clip[b].v2 && M.states_per_clip[b].v1), 'states_per_clip covers all beats on both arms');
ok(/answer:pending/.test(M.states_per_clip.think.v2) && !/puzzled/.test(M.states_per_clip.think.v2) && M.states_per_clip.think.v1 === 'think()', `think clip: v2 "${M.states_per_clip.think.v2.slice(0, 40)}..." / v1 "${M.states_per_clip.think.v1}"`);
ok(Array.isArray(M.reused_from_previous_kit) && M.reused_from_previous_kit.length === 6 && !M.reused_from_previous_kit.some(f => /think/.test(f)), `6 clips reused from kit v1, none of them a think clip`);

console.log(fails ? `\nG12 SCORER FAIL (${fails})` : '\nG12 SCORER PASS');
process.exit(fails ? 1 : 0);
