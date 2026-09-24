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

export const H = 104;        // bar height in px (fixed, <= 110)
const GAP = 6, PAD = 4, CGAP = 2, MAX_CUBE = 22, BORDER = 2; // BORDER = tray border px per side (css: 2px) - part of the fit

/** best tray grid + cube grid inside each tray: maximise the cube size, cubes never larger than MAX_CUBE */
export function layout(a, b, { w = 300, h = H } = {}) {
  let best = null;
  for (let trayRows = 1; trayRows <= 2; trayRows++) {
    const trayCols = Math.ceil(a / trayRows);
    const tw = (w - (trayCols - 1) * GAP) / trayCols, th = (h - (trayRows - 1) * GAP) / trayRows;
    for (let cols = 1; cols <= b; cols++) {
      const rows = Math.ceil(b / cols);
      const cube = Math.min((tw - 2 * (PAD + BORDER) - (cols - 1) * CGAP) / cols, (th - 2 * (PAD + BORDER) - (rows - 1) * CGAP) / rows);
      // readability first (Clements 1999: counts >4 are grasped through patterns): rows of 5 like a ten-frame
      // (or all in one row when b <= 5); then bigger cubes. Cubes below 12px are rejected.
      const pattern = cols === Math.min(b, 5) ? 1 : 0;
      // all trays in ONE row whenever cubes stay >= 12px (the a equal groups are then seen side by side at a glance)
      const score = (cube >= 12 ? 1e6 : 0) + (trayRows === 1 ? 1e5 : 0) + pattern * 1e4 + Math.min(cube, MAX_CUBE) * 100 - Math.abs(cols - rows);
      if (!best || score > best.score) best = { score, trayRows, trayCols, cols, rows, cube: Math.floor(Math.min(cube, MAX_CUBE)) };
    }
  }
  const { score, ...out } = best; return out;
}

const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);

export function render(q, { width = 300 } = {}) {
  const m = q?.meta; if (!m || m.kind !== 'mult' || !(m.a > 0) || !(m.b > 0)) return null;
  const { a, b } = m; const L = layout(a, b, { w: width, h: H });
  const cubes = Array.from({ length: b }, () => '<i class="gb-cube"></i>').join('');
  const trays = Array.from({ length: a }, (_, i) => `<div class="gb-tray" style="animation-delay:${i * 60}ms">${cubes}</div>`).join('');
  return el(`<div class="groups-bar" role="img" aria-label="${AR(a)} مجموعات، في كل مجموعة ${AR(b)}" data-a="${a}" data-b="${b}"
    style="--gb-h:${H}px;--gb-cube:${L.cube}px;--gb-cols:${L.cols};--gb-tcols:${L.trayCols};--gb-gap:${GAP}px;--gb-pad:${PAD}px;--gb-border:${BORDER}px;--gb-cgap:${CGAP}px">${trays}</div>`);
}

export default { render, layout, H };
