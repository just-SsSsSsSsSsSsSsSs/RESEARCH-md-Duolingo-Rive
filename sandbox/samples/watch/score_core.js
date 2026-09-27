// G12 scorer core (owner directive, gist rev d33eaf03, 2026-09-27). Pure functions, no DOM, no deps.
// Loaded by score.html in the browser and by sandbox/tests/g12_score.mjs in node.
//
// Why this exists: the kit prints binomial_two_sided_p, which is symmetric (10/12 and 2/12 both give 0.0386;
// 0/12 gives 0.0005). A rule "p <= 0.05" alone would call a crushing LOSS a PASS. The verdict below therefore
// requires BOTH: two-sided p <= 0.05 AND v2 in the upper tail (v2_chosen > n / 2).
//
// Verdict values: PASS | FAIL | INSUFFICIENT | REJECTED (no block belongs to this kit).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.G12 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ALPHA = 0.05, MIN_TRIALS = 12, MIN_RATERS = 3;

  function C(n, r) { let x = 1; for (let j = 1; j <= r; j++) x = x * (n - r + j) / j; return x; }
  // exact two-sided binomial p under H0: P(v2) = 0.5 (same formula as the kit and watch_kit.binom_two_sided)
  function twoSided(k, n) {
    let lo = 0, hi = 0;
    for (let i = 0; i <= k; i++) lo += C(n, i);
    for (let i = k; i <= n; i++) hi += C(n, i);
    return Math.min(1, 2 * Math.min(lo, hi) / Math.pow(2, n));
  }
  // smallest k > n/2 with twoSided(k, n) <= ALPHA; null when none exists (tiny n)
  function minWins(n) { for (let k = Math.floor(n / 2) + 1; k <= n; k++) if (twoSided(k, n) <= ALPHA) return k; return null; }

  // Parse concatenated JSON blocks (raters paste them one after another). Returns { blocks, errors }.
  function parseBlocks(text) {
    const blocks = [], errors = []; let depth = 0, start = -1;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '{') { if (depth === 0) start = i; depth++; }
      else if (ch === '}') { depth--; if (depth === 0 && start >= 0) { const s = text.slice(start, i + 1); try { blocks.push(JSON.parse(s)); } catch (e) { errors.push('unparseable block at ' + start + ': ' + e.message); } start = -1; } }
    }
    if (depth !== 0) errors.push('unbalanced braces');
    return { blocks, errors };
  }

  // Validate one block against the kit manifest (generated_at, seed, order_sha256, trial count, beats, recount).
  function validateBlock(b, manifest) {
    const why = [];
    if (!b || typeof b !== 'object') return ['not an object'];
    if (b.kit !== manifest.generated_at) why.push('kit ' + b.kit + ' != ' + manifest.generated_at);
    if (b.seed !== manifest.seed) why.push('seed ' + b.seed + ' != ' + manifest.seed);
    if (b.order_sha256 !== manifest.order_sha256) why.push('order_sha256 mismatch');
    if (!Array.isArray(b.answers)) why.push('answers missing');
    else {
      if (b.answers.length !== manifest.order.length) why.push('answers ' + b.answers.length + ' != trials ' + manifest.order.length);
      b.answers.forEach((a, i) => {
        const o = manifest.order[i];
        if (!o || a.beat !== o.beat) why.push('trial ' + (i + 1) + ' beat ' + a.beat + ' != ' + (o && o.beat));
        if (a.chosen !== 'v1' && a.chosen !== 'v2') why.push('trial ' + (i + 1) + ' chosen must be v1 or v2');
      });
      const k = b.answers.filter(a => a.chosen === 'v2').length;
      if (b.v2_chosen !== undefined && b.v2_chosen !== k) why.push('v2_chosen ' + b.v2_chosen + ' != recount ' + k);
    }
    return why;
  }

  // Score a set of blocks. Raters are counted by distinct non-empty rater names; unnamed sessions count as
  // trials but not as raters (three anonymous sessions never satisfy MIN_RATERS).
  function score(blocks, manifest) {
    const accepted = [], rejected = [];
    blocks.forEach((b, i) => { const why = validateBlock(b, manifest); (why.length ? rejected : accepted).push({ index: i, block: b, why }); });
    const answers = accepted.flatMap(a => a.block.answers);
    const n = answers.length, k = answers.filter(a => a.chosen === 'v2').length;
    const raters = new Set(accepted.map(a => (a.block.rater || '').trim()).filter(Boolean));
    const unnamed = accepted.filter(a => !(a.block.rater || '').trim()).length;
    const p = n ? twoSided(k, n) : null, need = n ? minWins(n) : null;
    const perBeat = {};
    answers.forEach(a => { const e = perBeat[a.beat] || (perBeat[a.beat] = { n: 0, v2: 0 }); e.n++; if (a.chosen === 'v2') e.v2++; });
    let verdict, reason;
    if (accepted.length === 0) { verdict = 'REJECTED'; reason = 'no block belongs to this kit'; }
    else if (n < MIN_TRIALS || raters.size < MIN_RATERS) { verdict = 'INSUFFICIENT'; reason = n + ' trials from ' + raters.size + ' named raters (' + unnamed + ' unnamed session' + (unnamed === 1 ? '' : 's') + '); need >= ' + MIN_TRIALS + ' trials and >= ' + MIN_RATERS + ' named raters'; }
    else if (p <= ALPHA && k > n / 2) { verdict = 'PASS'; reason = 'v2 ' + k + '/' + n + ', two-sided p ' + p.toFixed(4) + ' <= ' + ALPHA + ' and v2 in the upper tail (need >= ' + need + ')'; }
    else if (p <= ALPHA && k < n / 2) { verdict = 'FAIL'; reason = 'v1 wins: v2 only ' + k + '/' + n + ', two-sided p ' + p.toFixed(4) + ' - small p in the LOWER tail is a loss, not a pass'; }
    else { verdict = 'FAIL'; reason = 'no evidence: v2 ' + k + '/' + n + ', two-sided p ' + p.toFixed(4) + ' > ' + ALPHA + ' (need >= ' + need + '/' + n + ')'; }
    return { verdict, reason, n, v2_chosen: k, v1_chosen: n - k, two_sided_p: p, min_v2_wins_for_pass: need, raters: [...raters], unnamed_sessions: unnamed,
             blocks_accepted: accepted.length, blocks_rejected: rejected.map(r => ({ index: r.index, why: r.why })), per_beat: perBeat,
             rule: 'PASS iff two-sided p <= ' + ALPHA + ' AND v2_chosen > n/2, over >= ' + MIN_TRIALS + ' trials from >= ' + MIN_RATERS + ' named raters', kit: manifest.generated_at, order_sha256: manifest.order_sha256 };
  }

  return { ALPHA, MIN_TRIALS, MIN_RATERS, twoSided, minWins, parseBlocks, validateBlock, score };
});
