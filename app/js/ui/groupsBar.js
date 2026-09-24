/**
 * Phase 15.2 - compact "equal groups" bar above a multiplication question (owner decision, research RFC):
 *   a x b  ->  a trays, b identical cubes in each tray   (the school-book convention: a groups of b)
 *
 * Design rules (genspark_ai_developer/RESEARCH_VISUAL_3D.md):
 *  - identical plain cubes, same color, no fruit/gems/sparkle (Kaminski & Sloutsky 2013: extraneous detail hurts
 *    6-8 year olds); depth = a soft CSS gradient + shadow only; trays carry the only color accent.
 *  - FIXED height (<= 110px, reserved before paint) -> no layout shift, no extra scroll on 360x740.
 *  - never reveals the answer (K3): no total, no running count, aria-label says "a groups of b" only.
 *  - HTML/CSS only (no SVG ids -> nothing for svg_leak; no filters -> cheap on weak Android).
 *
 *   layout(a, b, { w, h }) -> { trayRows, trayCols, cols, rows, cube }   PURE (unit-tested in Node)
 *   render(q, { width })   -> HTMLElement | null                          only for meta.kind === 'mult'
 */
import { el } from './components.js';

export const HMAX = 176;     // Phase 15.4: bar height adapts per question (<= HMAX), fixed while the question is shown
export const H = HMAX;       // kept for older imports
export const PALETTE = 6;    // gold, green, coral, sky, purple, orange (css .gb-c0..gb-c5)
const GAP = 8, PAD = 5, BORDER = 3, WELL = 2, CGAP = 3, LIP = 14, MAX_CUBE = 40, MIN_CUBE = 12, NUM_MIN = 18;
// Phase 16 sprite trays: the rendered box adds a rim above, walls beside and a FRONT WALL below the cubes
// (all proportional to the cube so the box always looks like the same toy). Reserved in the layout so nothing overlaps.
const SPRITE = (cube) => ({ top: Math.round(cube * .34 + 2), side: Math.round(cube * .3 + 4), lip: Math.round(cube * .6 + 10) });
// LIP = the tray's front face under the cubes (carries the tray's face, like the reference toy boxes)

/** Phase 15.4 (Karma's reference, issue #10): chunky, squarish toy trays with BIG 3D cubes.
 *  Tries 1..3 tray rows x every cube grid; prefers big cubes (up to 30 counts fully), then a short bar,
 *  and rejects trays thinner than 1.6:1 (the old 1-column "pill strip" look). PURE - unit tested in Node. */
export function layout(a, b, { w = 300, hmax = HMAX } = {}) {
  let best = null;
  for (let trayRows = 1; trayRows <= 3; trayRows++) {
    const trayCols = Math.ceil(a / trayRows);
    if (trayRows > 1 && Math.ceil(a / (trayRows - 1)) === trayCols) continue;
    for (let cols = 1; cols <= b; cols++) {
      const rows = Math.ceil(b / cols);
      // solve for the cube: tray width = cols*cube + (cols-1)*CGAP + 2*side(cube); height = rows*cube + ... + top + lip
      let cube = MAX_CUBE;
      for (let it = 0; it < 6; it++) {
        const sp = SPRITE(cube);
        const cw = ((w - (trayCols - 1) * GAP) / trayCols - 2 * sp.side - (cols - 1) * CGAP) / cols;
        const ch = ((hmax - (trayRows - 1) * GAP) / trayRows - sp.top - sp.lip - (rows - 1) * CGAP) / rows;
        cube = Math.floor(Math.min(cw, ch, MAX_CUBE));
      }
      if (cube < MIN_CUBE) continue;
      let sp = SPRITE(cube), tw, th, h;
      // exact check (the fixed-point above may sit 1px over because of rounding): shrink until both fit
      for (;;) {
        sp = SPRITE(cube);
        tw = cols * cube + (cols - 1) * CGAP + 2 * sp.side;
        th = rows * cube + (rows - 1) * CGAP + sp.top + sp.lip;
        h = trayRows * th + (trayRows - 1) * GAP;
        if ((h <= hmax && trayCols * tw + (trayCols - 1) * GAP <= w) || cube <= MIN_CUBE) break;
        cube--;
      }
      if (h > hmax || trayCols * tw + (trayCols - 1) * GAP > w) continue;
      const ar = Math.max(tw, th) / Math.min(tw, th);
      const score = Math.min(cube, 30) * 100 + cube * 5 - h * 2 - (ar > 1.45 ? (ar - 1.45) * 900 : 0);
      if (!best || score > best.score) best = { score, trayRows, trayCols, cols, rows, cube, h, tw, th, ...sp };
    }
  }
  const { score, ...out } = best; return out;
}

const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);

/** Numbers on the cubes: while the question is open each tray counts 1..b (never the running total -> the last
 *  cube can not reveal a x b, K3). After the answer, countUp() renumbers 1..a*b tray by tray (skip counting). */
export function render(q, { width = 300 } = {}) {
  const m = q?.meta; if (!m || m.kind !== 'mult' || !(m.a > 0) || !(m.b > 0)) return null;
  probe();
  const { a, b } = m; const L = layout(a, b, { w: width });
  const num = L.cube >= NUM_MIN;
  const cubes = Array.from({ length: b }, (_, k) => `<i class="gb-cube">${num ? `<b>${AR(k + 1)}</b>` : ''}</i>`).join('');
  const face = L.tw >= 44 ? '<span class="gb-face" aria-hidden="true"><i></i><i></i><u></u></span>' : '';
  // one joyful colour PER TRAY (the group shares it -> colour reinforces "a groups"); cubes identical inside a tray
  const trays = Array.from({ length: a }, (_, i) => `<div class="gb-tray gb-c${i % PALETTE}" style="animation-delay:${i * 70}ms"><div class="gb-well">${cubes}</div>${face}</div>`).join('');
  return el(`<div class="groups-bar" role="img" aria-label="${AR(a)} مجموعات، في كل مجموعة ${AR(b)}" data-a="${a}" data-b="${b}"
    style="--gb-h:${L.h}px;--gb-cube:${L.cube}px;--gb-cols:${L.cols};--gb-tcols:${L.trayCols};--gb-gap:${GAP}px;--gb-pad:${PAD}px;--gb-border:${BORDER}px;--gb-cgap:${CGAP}px;--gb-lip:${LIP}px;--gb-well:${WELL}px;--sp-top:${L.top}px;--sp-side:${L.side}px;--sp-lip:${L.lip}px">${trays}</div>`);
}

/** sprite availability: one probe per page load; on failure the CSS clay trays stay (html.no-3d) */
let probed = false;
function probe() {
  if (probed || typeof Image === 'undefined') return; probed = true;
  const im = new Image(); im.onerror = () => document.documentElement.classList.add('no-3d');
  im.src = new URL('../../assets/3d/cube0.webp', import.meta.url).href;
}

/** after the answer: renumber the cubes 1..a*b in a wave (tray after tray) - the skip-count lesson */
export function countUp(bar) {
  if (!bar || bar.dataset.counted) return;
  bar.dataset.counted = '1';
  const cubes = [...bar.querySelectorAll('.gb-cube')];
  cubes.forEach((c, i) => {
    const n = c.querySelector('b'); if (!n) return;
    setTimeout(() => { if (!c.isConnected) return; n.textContent = AR(i + 1); c.classList.add('gb-counted'); }, Math.min(i * 55, 2400));
  });
}

export default { render, layout, countUp, H, HMAX };
