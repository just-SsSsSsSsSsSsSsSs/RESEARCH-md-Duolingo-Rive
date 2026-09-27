/**
 * K9.5-1 (owner decision 2026-09-27, item b): a switchable random source for the BLINK scheduler only.
 *
 * Default: `random()` is Math.random - behaviour identical to before this module existed.
 * Recording time: `seed(n)` swaps in mulberry32(n) so two recordings with the same seed produce the same blink
 * onset list on either arm (v1 rig.js and v2 engine/motion.js both draw from this source). Nothing else in the engine
 * reads it: saccades, breath, look, performances keep their own Math.random - the owner's scope is "blink randomness,
 * at recording time only". index.html calls seed() when the URL carries ?seed=<int>; without it nothing changes.
 *
 * mulberry32: 32-bit state, one multiply-xorshift round, period 2^32, uniform in [0, 1). Chosen over xorshift128 for
 * size (5 lines) and over a seedrandom package (a dependency) - no heavy deps rule.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const blinkRng = {
  seedValue: null,
  _fn: Math.random,
  /** Seed with a 32-bit integer; null / undefined / non-numeric restores Math.random. */
  seed(n) {
    const v = Number(n);
    if (n === null || n === undefined || !Number.isFinite(v)) { this.seedValue = null; this._fn = Math.random; return this; }
    this.seedValue = v >>> 0; this._fn = mulberry32(this.seedValue); return this;
  },
  random() { return this._fn(); },
  /** uniform in [a, b) - same formula as physics.randIn and rig.js rand */
  between(a, b) { return a + this._fn() * (b - a); },
  seeded() { return this.seedValue !== null; },
};
