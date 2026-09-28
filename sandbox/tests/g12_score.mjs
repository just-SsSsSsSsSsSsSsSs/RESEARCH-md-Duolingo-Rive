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
const Mwin = { ...M, scoring_mode: 'win' };   // kit v1-v3 rule (the current manifest may be a tie-mode kit v4)
r = G12.score([block('a', ['v2', 'v2', 'v1', 'v1']), block('b', ['v2', 'v2', 'v2', 'v1']), block('c', ['v2', 'v2', 'v2', 'v1'])], Mwin);
ok(r.verdict === 'FAIL' && r.v2_chosen === 8, `8/12 under win mode -> ${r.verdict} (no evidence)`);
r = G12.score([block('a', ['v2', 'v2', 'v1', 'v1']), block('b', ['v2', 'v2', 'v2', 'v1']), block('c', ['v2', 'v2', 'v2', 'v1'])], M);
ok(M.scoring_mode !== 'tie' || r.verdict === 'PASS', `8/12 under the current manifest (mode ${r.mode}) -> ${r.verdict}`);
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
// 13. the real first block from the gist (rater null, 3/4, rated on kit v1) - under kit v3 it is REJECTED by design
//     (kit / seed / order mismatch; gist rev b693458e: sessions from an earlier kit stay in results/ and are never pooled).
//     Against the kit it was rated on (manifest.previous_kit chain) the same block still validates and reads INSUFFICIENT alone.
const first = JSON.parse(readFileSync(path.join(here, '..', 'samples', 'watch', 'results', '2026-09-27_gist-d33eaf03_rater-null.json'), 'utf8'));
r = G12.score([first], M);
ok(r.verdict === 'REJECTED' && r.blocks_rejected.length === 1 && r.blocks_accepted === 0, `kit-v1 real block under kit v${M.kit_version} -> ${r.verdict} (by design)`);
const chain = []; for (let pk = M.previous_kit; pk; pk = pk.previous_kit) chain.push(pk);
ok(M.kit_version === 4 && chain.length === 3 && chain.map(c => c.kit_version).join() === '3,2,1', `manifest is kit v${M.kit_version}; previous_kit chain v${chain.map(c => c.kit_version).join(' -> v')}`);
ok(new Set([M.seed, ...chain.map(c => c.seed)]).size === 4 && new Set([M.order_sha256, ...chain.map(c => c.order_sha256)]).size === 4, 'v1, v2, v3, v4 have four different seeds and four different order_sha256');
const v1kit = chain[2];
const Mv1 = { ...M, scoring_mode: 'win', generated_at: v1kit.generated_at, seed: v1kit.seed, order_sha256: v1kit.order_sha256, order: first.answers.map(a => ({ beat: a.beat, left: 'v2' })) };
r = G12.score([first], Mv1);
ok(r.verdict === 'INSUFFICIENT' && r.n === 4 && r.v2_chosen === 3, `same block against its own kit (v1 in the chain) -> ${r.verdict} (${r.v2_chosen}/${r.n})`);
// 13b. the real kit-v2 blocks (Salim, Baba, Karma) are REJECTED under kit v3 by design, and still score FAIL 6/12 against kit v2
const v2files = ['2026-09-27_gist-df1b7d02_rater-salim-kitv2.json', '2026-09-27_gist-df1b7d02_rater-baba-kitv2.json', '2026-09-27_gist-0c05fdfc_rater-karma-kitv2.json'];
const v2blocks = v2files.map(f => JSON.parse(readFileSync(path.join(here, '..', 'samples', 'watch', 'results', f), 'utf8')));
r = G12.score(v2blocks, M);
ok(r.verdict === 'REJECTED' && r.blocks_rejected.length === 3, `3 real kit-v2 blocks under kit v3 -> ${r.verdict} (by design)`);
const v2kit = chain[1];
const Mv2 = { ...M, scoring_mode: 'win', generated_at: v2kit.generated_at, seed: v2kit.seed, order_sha256: v2kit.order_sha256, order: v2blocks[0].answers.map(a => ({ beat: a.beat, left: 'v2' })) };
r = G12.score(v2blocks, Mv2);
ok(r.verdict === 'FAIL' && r.n === 12 && r.v2_chosen === 6 && r.raters.length === 3, `same 3 blocks against kit v2 -> ${r.verdict} ${r.v2_chosen}/${r.n} from ${r.raters.length} raters (the recorded kit-v2 result)`);
// 13c. the real kit-v3 blocks (Salim, Karma, Baba) are REJECTED under kit v4 by design, and still score FAIL 6/12 against kit v3 (win mode)
const v3files = ['2026-09-28_gist-795870df_rater-salim-kitv3.json', '2026-09-28_gist-98611011_rater-karma-kitv3.json', '2026-09-28_gist-98611011_rater-baba-kitv3.json'];
const v3blocks = v3files.map(f => JSON.parse(readFileSync(path.join(here, '..', 'samples', 'watch', 'results', f), 'utf8')));
r = G12.score(v3blocks, M);
ok(r.verdict === 'REJECTED' && r.blocks_rejected.length === 3, `3 real kit-v3 blocks under kit v4 -> ${r.verdict} (by design)`);
const v3kit = chain[0];
const Mv3 = { ...M, scoring_mode: 'win', generated_at: v3kit.generated_at, seed: v3kit.seed, order_sha256: v3kit.order_sha256, order: v3blocks[0].answers.map(a => ({ beat: a.beat, left: 'v2' })) };
r = G12.score(v3blocks, Mv3);
ok(r.verdict === 'FAIL' && r.n === 12 && r.v2_chosen === 6 && r.raters.length === 3, `same 3 blocks against kit v3 (win mode) -> ${r.verdict} ${r.v2_chosen}/${r.n} from ${r.raters.length} raters (the recorded kit-v3 result)`);
// 14. kit v3 rule lines: every clip states which clip the state RESOLVES to (read live at recording time), the think clip resolves
//     to rig.ponder (the K9.5-2 performance, not puzzled), the sad clip names the K9.5-3 plate, blink seeded on every re-recorded clip
ok(M.states_per_clip && M.beats.every(b => M.states_per_clip[b] && M.states_per_clip[b].v2 && M.states_per_clip[b].v1), 'states_per_clip covers all beats on both arms');
ok(/RESOLVED/.test(M.states_per_clip.think.v2) && /ponder/.test(M.states_per_clip.think.v2) && !/spiral\b(?!\))/.test(M.states_per_clip.think.v2.replace('no spiral', '')), `think label names the resolved clip: "${M.states_per_clip.think.v2.slice(0, 60)}..."`);
ok(M.resolved_clips && /rig\.perform\(think\) choreo 8 channels 3500 ms/.test(M.resolved_clips.v2_think || '') && !/puzzled/.test(M.resolved_clips.v2_think || ''), `live resolved v2_think = "${M.resolved_clips && M.resolved_clips.v2_think}"`);
ok(M.resolved_clips && /body recoil -> rig\.perform\(sad\) choreo 10 channels 2500 ms/.test(M.resolved_clips.v2_sad || ''), `live resolved v2_sad names the choreo player: "${M.resolved_clips && M.resolved_clips.v2_sad}"`);
ok(M.resolved_clips && /beak_sad\.webp/.test(M.resolved_clips.v2_sad || ''), `live resolved v2_sad = "${M.resolved_clips && M.resolved_clips.v2_sad}"`);
ok(M.answer_lock_ms === M.second_beat_ms && M.answer_lock_ms === 5500, `answer_lock_ms ${M.answer_lock_ms} == second_beat_ms ${M.second_beat_ms}`);
ok(typeof M.blink_seed === 'number' && M.blink_seeded && M.blink_seeded.v2_think === true && M.blink_seeded.v2_sad === true, `blink seeded on the re-recorded clips (seed ${M.blink_seed})`);
ok(M.recording_urls && /[?&]seed=\d+/.test(M.recording_urls.v2_think || ''), `recording URL carries &seed=: ${M.recording_urls && M.recording_urls.v2_think}`);
ok(Array.isArray(M.reused_from_previous_kit) && M.reused_from_previous_kit.join() === 'v1_think.webm,v1_sad.webm' && Object.keys(M.clips).sort().join() === 'v1_sad,v1_think,v2_sad,v2_think', `kit v4: v1 think/sad reused byte-identical from kit v3, v2 think/sad re-recorded, no other clips (${Object.keys(M.clips).join(' ')})`);
// kit v4 shape: beats think + sad, 2 trials per beat, tie mode, dropped beats documented with the kit they were decided on
ok(M.beats.join() === 'think,sad' && M.order.length === 4 && M.order.filter(o => o.beat === 'think').length === 2 && M.trials_per_beat === 2, `kit v4 order: ${M.order.map(o => o.beat + ':' + o.left).join(' ')}`);
ok(M.scoring_mode === 'tie' && M.previous_kit.beats_dropped.join() === 'celebrate,flight' && /kit v3/.test(M.beats_not_in_this_kit.celebrate), 'kit v4 manifest: scoring_mode tie; celebrate/flight recorded as decided on kit v3');
ok(Object.keys(M.states_per_clip).join() === 'think,sad', 'kit intro lists only the beats in this kit');
ok(/scoring_mode tie/.test(readFileSync(path.join(here, '..', 'samples', 'watch', 'README.md'), 'utf8')) && /3\.98 pct at 12/.test(readFileSync(path.join(here, '..', 'samples', 'watch', 'README.md'), 'utf8')), 'kit README states the tie rule and the exact false-FAIL figures');
// 15. the kit HTML locks the answer buttons until answer_lock_ms (attribute + handler guard) and shows a countdown
const html = readFileSync(path.join(here, '..', 'samples', 'watch', 'index.html'), 'utf8');
ok(/<button data-side="R" disabled>/.test(html) && /<button data-side="L" disabled>/.test(html), 'answer buttons start disabled');
ok(/performance\.now\(\) < lockUntil\) return;/.test(html) && /id="countdown"/.test(html) && /M\.answer_lock_ms/.test(html), 'lock enforced in the click handler, countdown element present, lock read from the manifest');

// 16. K9.6-6 tie mode (kit v4 rule, frozen in DIRECTIVES.md from gist 0b1f96bc BEFORE any recording). Synthetic kit-v4 manifest:
//     beats think + sad, 4 trials per session (2 per beat), scoring_mode 'tie'. Blocks follow the same shape as the real kit.
const M4 = { ...M, generated_at: '2026-09-28T00:00:00Z-synthetic-v4', seed: 999, order_sha256: 'f'.repeat(64), scoring_mode: 'tie', beats: ['think', 'sad'],
             order: [{ beat: 'think', left: 'v1' }, { beat: 'sad', left: 'v2' }, { beat: 'think', left: 'v2' }, { beat: 'sad', left: 'v1' }] };
function block4(rater, choices) {
  const answers = M4.order.map((o, i) => ({ trial: i + 1, beat: o.beat, chosen: choices[i], ms: 1000, replays: 0 }));
  const k = answers.filter(a => a.chosen === 'v2').length;
  return { kit: M4.generated_at, rater, seed: M4.seed, order_sha256: M4.order_sha256, n: answers.length, v2_chosen: k, v1_chosen: answers.length - k, binomial_two_sided_p: +G12.twoSided(k, answers.length).toFixed(4), answers };
}
// order per session: [think, sad, think, sad]
r = G12.score([block4('a', ['v2', 'v1', 'v1', 'v2']), block4('b', ['v1', 'v2', 'v2', 'v1']), block4('c', ['v1', 'v1', 'v2', 'v2'])], M4);
ok(r.mode === 'tie' && r.verdict === 'PASS' && r.v2_chosen === 6 && /perceived tie/.test(r.reason), `tie: 6/12 (think 3/6, sad 3/6) -> ${r.verdict} (${r.reason.slice(0, 40)}...)`);
r = G12.score([block4('a', ['v2', 'v1', 'v1', 'v1']), block4('b', ['v1', 'v2', 'v1', 'v1']), block4('c', ['v1', 'v1', 'v2', 'v1'])], M4);
ok(r.verdict === 'PASS' && r.v2_chosen === 3 && near(r.two_sided_p, 0.1460), `tie: 3/12 (p ${r.two_sided_p.toFixed(4)} > 0.05, think 2, sad 1) -> ${r.verdict} (no significant loss, floors met)`);
r = G12.score([block4('a', ['v2', 'v1', 'v1', 'v1']), block4('b', ['v1', 'v1', 'v1', 'v1']), block4('c', ['v1', 'v1', 'v2', 'v1'])], M4);
ok(r.verdict === 'FAIL' && r.v2_chosen === 2 && near(r.two_sided_p, 0.0386) && /beat floor/.test(r.reason) && r.beats_below_floor.join() === 'sad', `tie: 2/12 both on think (p ${r.two_sided_p.toFixed(4)}) -> ${r.verdict} (sad floor reported first; the loss is also significant)`);
// significant loss with every floor met: 2/12 split 1 + 1
r = G12.score([block4('a', ['v2', 'v1', 'v1', 'v1']), block4('b', ['v1', 'v2', 'v1', 'v1']), block4('c', ['v1', 'v1', 'v1', 'v1'])], M4);
ok(r.verdict === 'FAIL' && r.v2_chosen === 2 && r.beats_below_floor.length === 0 && /significant loss/.test(r.reason), `tie: 2/12 (think 1, sad 1, floors met, p ${r.two_sided_p.toFixed(4)}) -> ${r.verdict} (significant loss)`);
r = G12.score([block4('a', ['v2', 'v1', 'v2', 'v1']), block4('b', ['v1', 'v1', 'v2', 'v1']), block4('c', ['v2', 'v1', 'v2', 'v1'])], M4);
ok(r.verdict === 'FAIL' && r.v2_chosen === 5 && r.beats_below_floor.join() === 'sad' && /beat floor/.test(r.reason), `tie: 5/12 but sad 0/6 -> ${r.verdict} (beat floor: ${r.beats_below_floor})`);
r = G12.score([block4('a', ['v2', 'v2', 'v2', 'v2']), block4('b', ['v2', 'v2', 'v2', 'v1']), block4('c', ['v2', 'v2', 'v2', 'v1'])], M4);
ok(r.verdict === 'PASS' && r.v2_chosen === 10 && /wins outright/.test(r.reason), `tie: 10/12 -> ${r.verdict} (outright win also PASS)`);
r = G12.score([block4('a', ['v2', 'v1', 'v1', 'v2']), block4('b', ['v1', 'v2', 'v2', 'v1'])], M4);
ok(r.verdict === 'INSUFFICIENT', `tie: 2 raters / 8 trials -> ${r.verdict} (same admissibility)`);
// 4th named rater -> 16 trials, beat floor 2/8
const four = (c) => [block4('a', c[0]), block4('b', c[1]), block4('c', c[2]), block4('d', c[3])];
r = G12.score(four([['v2', 'v1', 'v1', 'v1'], ['v1', 'v1', 'v1', 'v2'], ['v1', 'v1', 'v1', 'v1'], ['v1', 'v1', 'v1', 'v1']]), M4);
ok(r.verdict === 'FAIL' && r.n === 16 && r.per_beat.think.floor === 2 && r.beats_below_floor.length === 2, `tie 16: think 1/8, sad 1/8 -> ${r.verdict} (floor 2/8 on both beats: ${r.beats_below_floor})`);
r = G12.score(four([['v2', 'v1', 'v1', 'v2'], ['v1', 'v1', 'v2', 'v1'], ['v1', 'v2', 'v1', 'v1'], ['v1', 'v1', 'v1', 'v1']]), M4);
ok(r.verdict === 'PASS' && r.n === 16 && r.v2_chosen === 4 && near(r.two_sided_p, 0.0768), `tie 16: 4/16 (think 2/8, sad 2/8, p ${r.two_sided_p.toFixed(4)}) -> ${r.verdict} (floors met, no significant loss)`);
r = G12.score(four([['v2', 'v1', 'v1', 'v2'], ['v1', 'v1', 'v2', 'v1'], ['v1', 'v1', 'v1', 'v1'], ['v1', 'v1', 'v1', 'v1']]), M4);
ok(r.verdict === 'FAIL' && r.v2_chosen === 3 && near(r.two_sided_p, 0.0213) && r.beats_below_floor.join() === 'sad', `tie 16: 3/16 (think 2, sad 1 -> sad floor 2/8; p ${r.two_sided_p.toFixed(4)} also significant) -> ${r.verdict}`);
r = G12.score(four([['v2', 'v1', 'v1', 'v2'], ['v1', 'v1', 'v2', 'v1'], ['v1', 'v2', 'v1', 'v1'], ['v1', 'v1', 'v1', 'v1']]), { ...M4 });
ok(r.per_beat.think.v2 === 2 && r.per_beat.sad.v2 === 2 && r.verdict === 'PASS', `tie 16: exactly at the 2/8 floors on both beats -> ${r.verdict}`);
// win mode untouched: the same 6/12 blocks under a manifest WITHOUT scoring_mode -> FAIL (no evidence)
r = G12.score([block4('a', ['v2', 'v1', 'v1', 'v2']), block4('b', ['v1', 'v2', 'v2', 'v1']), block4('c', ['v1', 'v1', 'v2', 'v2'])], { ...M4, scoring_mode: undefined });
ok(r.mode === 'win' && r.verdict === 'FAIL', `same 6/12 under win mode -> ${r.verdict} (kit v1-v3 rule unchanged)`);
ok(M.scoring_mode === 'tie' && M.kit_version >= 4, `current manifest kit v${M.kit_version} scoring_mode ${M.scoring_mode} (tie only from kit v4)`);
// exact false-FAIL probability for a perfect port, as told to the owner (DIRECTIVES 0b1f96bc): 4.0 pct at 12, 6.9 pct at 16
ok(near(G12.tieFalseFail(2, 6), 0.0398, 5e-4) && near(G12.tieFalseFail(2, 8), 0.0691, 5e-4), `tie false-FAIL for a perfect port: ${(G12.tieFalseFail(2, 6) * 100).toFixed(2)} pct at 12 trials, ${(G12.tieFalseFail(2, 8) * 100).toFixed(2)} pct at 16`);

console.log(fails ? `\nG12 SCORER FAIL (${fails})` : '\nG12 SCORER PASS');
process.exit(fails ? 1 : 0);
