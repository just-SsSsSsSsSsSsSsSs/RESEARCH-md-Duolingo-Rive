/**
 * Badge Art — modern illustrated / 3D-stylized SVG badges (K4, Phase 5 "Calm & Joy").
 * Replaces keyboard emoji with vector medallions: tiered metallic ring, glossy inner disc,
 * drop shadow, sparkle, and a per-badge stylized symbol. Locked badges render grayscale via CSS.
 *
 *   badgeSVG(id, tier, { size })  - SVG string (inline-safe, uses unique gradient ids)
 */

const TIERS = {
  1: { ring: ['#f0a35c', '#b5622a'], disc: ['#ffd9b0', '#e0864a'], glow: '#ffb46b' },          // bronze
  2: { ring: ['#e8eef7', '#8a97ad'], disc: ['#f6f9ff', '#aab6cc'], glow: '#cfe0ff' },          // silver
  3: { ring: ['#ffe27a', '#c48a00'], disc: ['#fff4bd', '#f2b81b'], glow: '#ffd94a' },          // gold
};

/* Per-badge symbol art. Each returns SVG inside a 100x100 viewBox centred on (50,50). */
const SYM = {
  first_step: (u) => `<g transform="translate(50 52) rotate(-35)">
    <path d="M0-30c8 6 14 18 14 30l-6 8H-8l-6-8c0-12 6-24 14-30z" fill="${u.a}"/>
    <path d="M0-30c4 8 6 20 6 30l-3 8H-3l-3-8c0-10 2-22 6-30z" fill="${u.b}" opacity=".85"/>
    <circle cy="-6" r="6" fill="#0d1a3a"/><circle cy="-6" r="4" fill="#7cf7ff"/>
    <path d="M-14 0l-8 14 10-6zM14 0l8 14-10-6z" fill="${u.c}"/>
    <path d="M-6 8l6 20 6-20z" fill="#ff8a3d"/><path d="M-3 8l3 12 3-12z" fill="#ffe066"/></g>`,
  streak_3: (u) => flame(u, 1),
  streak_7: (u) => `<path d="M22 78l12-30 8 12 8-26 8 26 8-12 12 30z" fill="${u.c}"/><path d="M30 78l8-20 6 8 6-18 6 18 6-8 8 20z" fill="#ff8a3d"/>${flame({ ...u, s: 0.55, dy: -14 }, 1)}`,
  streak_30: (u) => `<path d="M18 82L62 38" stroke="${u.c}" stroke-width="10" stroke-linecap="round" opacity=".5"/><path d="M26 82L66 42" stroke="#ffe066" stroke-width="5" stroke-linecap="round"/>
    <circle cx="66" cy="36" r="16" fill="${u.a}"/><circle cx="62" cy="32" r="6" fill="#fff" opacity=".8"/><circle cx="72" cy="40" r="3" fill="${u.b}"/>`,
  perfect_1: (u) => `<text x="50" y="62" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="34" fill="${u.a}" stroke="#0d1a3a" stroke-width="2" paint-order="stroke">100</text><path d="M28 72h44" stroke="${u.c}" stroke-width="5" stroke-linecap="round"/>`,
  perfect_10: (u) => `<circle cx="50" cy="50" r="28" fill="#fff"/><circle cx="50" cy="50" r="21" fill="${u.a}"/><circle cx="50" cy="50" r="14" fill="#fff"/><circle cx="50" cy="50" r="7" fill="${u.a}"/>
    <path d="M50 50L76 22" stroke="#0d1a3a" stroke-width="4" stroke-linecap="round"/><path d="M76 22l-2 10 10-2z" fill="${u.c}"/>`,
  answers_100: (u) => brain(u),
  answers_500: (u) => `<path d="M36 22c28 12 0 44 28 56M64 22c-28 12 0 44-28 56" stroke="${u.a}" stroke-width="7" stroke-linecap="round" fill="none"/>
    ${[30, 42, 54, 66].map((y) => `<path d="M40 ${y}h20" stroke="${u.c}" stroke-width="4" stroke-linecap="round"/>`).join('')}`,
  answers_2000: (u) => `<rect x="22" y="30" width="16" height="46" rx="3" fill="${u.a}"/><rect x="40" y="24" width="16" height="52" rx="3" fill="${u.b}"/><rect x="58" y="34" width="16" height="42" rx="3" fill="${u.c}" transform="rotate(8 66 55)"/>
    <path d="M26 40h8M44 34h8M62 44h8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
  level_5: (u) => star(u, 50, 52, 30),
  level_10: (u) => `${star(u, 50, 52, 30)}${sparkle(24, 30, 6, '#fff')}${sparkle(76, 34, 5, '#fff')}`,
  level_25: (u) => `${star(u, 50, 50, 24)}<circle cx="50" cy="50" r="34" stroke="${u.c}" stroke-width="3" fill="none" stroke-dasharray="6 8"/>${sparkle(78, 26, 7, u.c)}${sparkle(22, 72, 6, u.c)}`,
  mastery_1: (u) => crown(u),
  mastery_5: (u) => `<rect x="22" y="44" width="56" height="34" rx="3" fill="${u.a}"/><path d="M22 44v-10h10v10M45 44V30h10v14M68 44v-10h10v10" fill="${u.b}"/>
    <rect x="44" y="58" width="12" height="20" rx="6" fill="#0d1a3a"/><rect x="30" y="52" width="8" height="8" rx="1" fill="#7cf7ff"/><rect x="62" y="52" width="8" height="8" rx="1" fill="#7cf7ff"/>
    <path d="M50 30l0-10 12 4-12 4" fill="${u.c}"/>`,
  explorer: (u) => `<circle cx="50" cy="50" r="30" fill="#fff"/><circle cx="50" cy="50" r="25" fill="${u.a}"/><path d="M50 26l8 24-8 24-8-24z" fill="#0d1a3a"/><path d="M50 26l8 24H42z" fill="${u.c}"/><circle cx="50" cy="50" r="4" fill="#fff"/>`,
  explorer_15: (u) => `<path d="M22 30l18-6 20 6 18-6v46l-18 6-20-6-18 6z" fill="${u.a}"/><path d="M40 24v46M60 30v46" stroke="#0d1a3a" stroke-width="2" opacity=".35"/>
    <path d="M28 60c10-10 20 4 30-6s10-2 14-8" stroke="${u.c}" stroke-width="3" stroke-dasharray="4 4" fill="none" stroke-linecap="round"/><circle cx="72" cy="46" r="5" fill="#ff5c8a"/>`,
  bubbles_50: (u) => `<circle cx="42" cy="54" r="22" fill="${u.a}" opacity=".85"/><circle cx="66" cy="38" r="12" fill="${u.b}" opacity=".85"/><circle cx="68" cy="66" r="8" fill="${u.c}" opacity=".85"/>
    <ellipse cx="34" cy="44" rx="6" ry="3.5" fill="#fff" opacity=".9" transform="rotate(-35 34 44)"/><circle cx="62" cy="33" r="2.5" fill="#fff"/>`,
  bubbles_500: (u) => `<path d="M18 62c10-14 22-14 32 0s22 14 32 0v20H18z" fill="${u.a}"/><path d="M18 70c10-12 22-12 32 0s22 12 32 0v12H18z" fill="${u.b}" opacity=".8"/>
    <circle cx="36" cy="40" r="8" fill="#fff" opacity=".7"/><circle cx="58" cy="30" r="5" fill="#fff" opacity=".7"/><circle cx="72" cy="46" r="4" fill="#fff" opacity=".7"/>`,
  quran_3: (u) => `<path d="M24 28h22v48H24zM54 28h22v48H54z" fill="${u.a}"/><path d="M46 28h8v48h-8z" fill="${u.b}"/><path d="M30 40h10M30 48h10M60 40h10M60 48h10M30 56h10M60 56h10" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".85"/>`,
  math_5: (u) => `<rect x="24" y="24" width="52" height="52" rx="10" fill="${u.a}"/><text x="50" y="66" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="34" fill="#fff">7</text><circle cx="66" cy="34" r="8" fill="${u.c}"/><text x="66" y="38" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="12" fill="#0d1a3a">+</text>`,
  arabic_3: (u) => `<path d="M28 74l6-16 30-30 10 10-30 30z" fill="${u.a}"/><path d="M64 28l10 10 4-4-10-10z" fill="${u.c}"/><path d="M28 74l6-16 10 10z" fill="#0d1a3a"/><path d="M40 62l20-20" stroke="#fff" stroke-width="2" opacity=".6"/>`,
  gems_100: (u) => `<path d="M30 34h40l12 14-32 32-32-32z" fill="${u.a}"/><path d="M30 34l20 46 20-46z" fill="${u.b}" opacity=".7"/><path d="M18 48h64" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M30 34l8 14 12-14 12 14 8-14" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>`,
  early_bird: (u) => `<path d="M18 66h64" stroke="#0d1a3a" stroke-width="4"/><path d="M28 66a22 22 0 0 1 44 0z" fill="${u.a}"/><path d="M50 26v8M30 34l5 5M70 34l-5 5M22 50h8M70 50h8" stroke="${u.c}" stroke-width="4" stroke-linecap="round"/><path d="M20 76c8-4 16 4 24 0s16 4 24 0 12-2 12-2" stroke="${u.b}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  night_owl: (u) => `<ellipse cx="50" cy="56" rx="24" ry="26" fill="${u.a}"/><path d="M28 40l6-14 10 10M72 40l-6-14-10 10" fill="${u.a}"/><circle cx="41" cy="50" r="9" fill="#fff"/><circle cx="59" cy="50" r="9" fill="#fff"/><circle cx="41" cy="50" r="4.5" fill="#0d1a3a"/><circle cx="59" cy="50" r="4.5" fill="#0d1a3a"/><path d="M50 56l-4 6h8z" fill="${u.c}"/><path d="M36 70q14 10 28 0" stroke="${u.b}" stroke-width="3" fill="none"/>`,
  quests_10: (u) => `<rect x="30" y="24" width="40" height="52" rx="4" fill="#fff8e8"/><rect x="26" y="20" width="48" height="8" rx="4" fill="${u.a}"/><rect x="26" y="72" width="48" height="8" rx="4" fill="${u.a}"/>
    <path d="M38 40h24M38 50h24M38 60h16" stroke="${u.b}" stroke-width="3" stroke-linecap="round"/><path d="M58 58l4 4 8-8" stroke="#22c55e" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  certificate_1: (u) => `<path d="M20 40l30-14 30 14-30 14z" fill="#0d1a3a"/><path d="M32 46v14c0 6 8 10 18 10s18-4 18-10V46l-18 8z" fill="${u.a}"/><path d="M80 40v20" stroke="${u.c}" stroke-width="3"/><circle cx="80" cy="62" r="4" fill="${u.c}"/>`,
};

function flame(u, k = 1) {
  const s = u.s || 1, dy = u.dy || 0;
  return `<g transform="translate(50 ${50 + dy}) scale(${s}) translate(-50 -50)">
    <path d="M50 22c6 12 20 18 20 36a20 20 0 0 1-40 0c0-10 6-14 8-22 4 6 8 8 12 6-2-8-4-14 0-20z" fill="${u.c}"/>
    <path d="M50 44c4 8 12 10 12 20a12 12 0 0 1-24 0c0-6 4-8 6-14 2 4 4 4 6 3-1-4-2-6 0-9z" fill="#ffe066"/></g>`;
}
function brain(u) {
  return `<path d="M48 26c-10 0-16 8-14 16-8 2-10 14-2 18-2 8 6 14 14 12l2-46zM52 26c10 0 16 8 14 16 8 2 10 14 2 18 2 8-6 14-14 12l-2-46z" fill="${u.a}"/>
    <path d="M50 26v46" stroke="#0d1a3a" stroke-width="3"/><path d="M36 44c6-2 10 4 14 2M64 44c-6-2-10 4-14 2M38 58c6 0 8-4 12-2M62 58c-6 0-8-4-12-2" stroke="${u.b}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
}
function crown(u) {
  return `<path d="M22 70V38l14 12 14-22 14 22 14-12v32z" fill="${u.a}"/><rect x="22" y="66" width="56" height="10" rx="3" fill="${u.b}"/>
    <circle cx="22" cy="38" r="4" fill="${u.c}"/><circle cx="50" cy="28" r="4.5" fill="${u.c}"/><circle cx="78" cy="38" r="4" fill="${u.c}"/><circle cx="36" cy="60" r="3" fill="#ff5c8a"/><circle cx="50" cy="60" r="3" fill="#7cf7ff"/><circle cx="64" cy="60" r="3" fill="#ff5c8a"/>`;
}
function star(u, cx, cy, r) {
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`); }
  return `<polygon points="${pts.join(' ')}" fill="${u.a}" stroke="${u.b}" stroke-width="3" stroke-linejoin="round"/><polygon points="${pts.slice(0, 5).join(' ')} ${cx},${cy}" fill="#fff" opacity=".25"/>`;
}
function sparkle(x, y, r, c) { return `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z" fill="${c}"/>`; }

/* Symbol palettes (vivid, consistent across tiers) */
const PAL = {
  first_step: ['#ff6b6b', '#ffffff', '#ffd166'], streak_3: ['#ff7a3d', '#ffd166', '#ff5c3d'], streak_7: ['#ff7a3d', '#ffd166', '#6b3a2a'], streak_30: ['#7cf7ff', '#22d3ee', '#ffb46b'],
  perfect_1: ['#22c55e', '#86efac', '#facc15'], perfect_10: ['#ef4444', '#fca5a5', '#facc15'], answers_100: ['#f472b6', '#be185d', '#fbcfe8'], answers_500: ['#a78bfa', '#7c3aed', '#7cf7ff'], answers_2000: ['#3b82f6', '#22c55e', '#f59e0b'],
  level_5: ['#facc15', '#ca8a04', '#fff'], level_10: ['#facc15', '#ca8a04', '#fff'], level_25: ['#facc15', '#ca8a04', '#7cf7ff'], mastery_1: ['#facc15', '#ca8a04', '#f472b6'], mastery_5: ['#94a3b8', '#64748b', '#ef4444'],
  explorer: ['#22d3ee', '#0e7490', '#ef4444'], explorer_15: ['#fde68a', '#d97706', '#0d1a3a'], bubbles_50: ['#7cf7ff', '#a78bfa', '#f472b6'], bubbles_500: ['#3b82f6', '#7cf7ff', '#fff'],
  quran_3: ['#10b981', '#065f46', '#facc15'], math_5: ['#6366f1', '#4338ca', '#facc15'], arabic_3: ['#f59e0b', '#b45309', '#f472b6'], gems_100: ['#38bdf8', '#0ea5e9', '#fff'],
  early_bird: ['#fb923c', '#fde68a', '#facc15'], night_owl: ['#6d5bd0', '#c4b5fd', '#f59e0b'], quests_10: ['#a16207', '#78350f', '#fff'], certificate_1: ['#1e3a8a', '#fff', '#facc15'],
};

let uid = 0;
export function badgeSVG(id, tier = 1, { size = 64 } = {}) {
  const t = TIERS[tier] || TIERS[1]; const k = `bg${++uid}`;
  const [a, b, c] = PAL[id] || ['#7cf7ff', '#a78bfa', '#facc15'];
  const sym = (SYM[id] || (() => star({ a, b, c }, 50, 52, 28)))({ a, b, c });
  return `<svg class="badge-art" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <linearGradient id="${k}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.ring[0]}"/><stop offset="1" stop-color="${t.ring[1]}"/></linearGradient>
    <linearGradient id="${k}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.disc[0]}"/><stop offset="1" stop-color="${t.disc[1]}"/></linearGradient>
    <radialGradient id="${k}g" cx=".35" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="${k}s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".35"/></filter>
    <clipPath id="${k}c"><circle cx="50" cy="50" r="38"/></clipPath>
  </defs>
  <g filter="url(#${k}s)">
    <circle cx="50" cy="50" r="46" fill="url(#${k}r)"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/>
    <circle cx="50" cy="50" r="40" fill="${t.ring[1]}" opacity=".5"/>
    <circle cx="50" cy="50" r="38" fill="url(#${k}d)"/>
    <g clip-path="url(#${k}c)">${sym}</g>
    <circle cx="50" cy="50" r="38" fill="url(#${k}g)"/>
    <ellipse cx="38" cy="26" rx="14" ry="6" fill="#fff" opacity=".35" transform="rotate(-30 38 26)"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="${t.glow}" stroke-opacity=".7" stroke-width="1.5"/>
  </g>
</svg>`;
}
export default badgeSVG;
