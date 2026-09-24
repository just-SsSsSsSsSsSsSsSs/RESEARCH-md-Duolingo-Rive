/**
 * Phase 15.3: cheerful cartoon monkey companion drawn entirely in code (inline SVG, no ids, no gradients by id,
 * no downloads). Sits in the q-card corner opposite the replay button, outside the answer area, never takes taps.
 *   mount(card)            -> the element (idle: slow breathing)
 *   mood(card, 'happy')    -> big smile + clapping hands (correct answer)
 *   mood(card, 'encourage')-> warm nod + wave (first miss: "try again")
 * Only transform/opacity animate; prefers-reduced-motion freezes it (css).
 */
import { el } from './components.js';

const POSES = {
  idle: new URL('../../assets/3d/monkey.webp', import.meta.url).href,
  happy: new URL('../../assets/3d/monkey_happy.webp', import.meta.url).href,
  encourage: new URL('../../assets/3d/monkey_encourage.webp', import.meta.url).href,
};

const SVG = `<svg viewBox="0 0 120 130" aria-hidden="true" focusable="false">
  <ellipse cx="60" cy="124" rx="30" ry="5" fill="rgba(60,30,0,.18)"/>
  <path class="m-tail" d="M84 104c22 2 26-20 12-26" fill="none" stroke="#8a4f1f" stroke-width="7" stroke-linecap="round"/>
  <g class="m-body">
    <ellipse cx="60" cy="98" rx="24" ry="22" fill="#9a5a24"/>
    <ellipse cx="60" cy="96" rx="24" ry="20" fill="#b8733a"/>
    <ellipse cx="52" cy="88" rx="10" ry="6" fill="#fff" opacity=".18"/>
    <ellipse cx="60" cy="102" rx="14" ry="13" fill="#f6c89a"/>
    <ellipse cx="46" cy="118" rx="10" ry="6" fill="#8a4f1f"/><ellipse cx="74" cy="118" rx="10" ry="6" fill="#8a4f1f"/>
    <ellipse cx="44" cy="116" rx="6" ry="3" fill="#f6c89a"/><ellipse cx="76" cy="116" rx="6" ry="3" fill="#f6c89a"/>
    <g class="m-head">
      <circle cx="24" cy="46" r="14" fill="#8a4f1f"/><circle cx="24" cy="46" r="8" fill="#f2b98a"/>
      <circle cx="96" cy="46" r="14" fill="#8a4f1f"/><circle cx="96" cy="46" r="8" fill="#f2b98a"/>
      <circle cx="60" cy="50" r="36" fill="#9a5a24"/>
      <circle cx="60" cy="47" r="35" fill="#b8733a"/>
      <ellipse cx="46" cy="26" rx="15" ry="8" fill="#fff" opacity=".25" transform="rotate(-20 46 26)"/>
      <path d="M60 34c-11-9-30-3-30 16 0 16 13 27 30 27s30-11 30-27c0-19-19-25-30-16z" fill="#f6c89a"/>
      <path d="M60 70c14 0 26-7 29-19 0 16-13 26-29 26s-29-10-29-26c3 12 15 19 29 19z" fill="#e0a877" opacity=".6"/>
      <g class="m-eyes">
        <ellipse cx="47" cy="48" rx="6" ry="7.5" fill="#2b1a0e"/><ellipse cx="73" cy="48" rx="6" ry="7.5" fill="#2b1a0e"/>
        <circle cx="49.5" cy="45" r="2.6" fill="#fff"/><circle cx="75.5" cy="45" r="2.6" fill="#fff"/>
        <circle cx="45" cy="51" r="1.2" fill="#fff" opacity=".8"/><circle cx="71" cy="51" r="1.2" fill="#fff" opacity=".8"/>
      </g>
      <ellipse cx="38" cy="62" rx="6" ry="4" fill="#ff8fa3" opacity=".65"/><ellipse cx="82" cy="62" rx="6" ry="4" fill="#ff8fa3" opacity=".65"/>
      <ellipse cx="60" cy="58" rx="4" ry="2.6" fill="#6b3a17"/>
      <path class="m-smile" d="M49 65q11 10 22 0" fill="none" stroke="#6b3a17" stroke-width="3.2" stroke-linecap="round"/>
      <path class="m-grin" d="M47 64q13 17 26 0z" fill="#7a1f24" stroke="#6b3a17" stroke-width="2.4" stroke-linejoin="round"/>
    </g>
  </g>
  <g class="m-hand m-hl"><path d="M40 92q-14 4-18 16" fill="none" stroke="#9a5a24" stroke-width="8" stroke-linecap="round"/><circle cx="21" cy="110" r="7" fill="#f6c89a" stroke="#8a4f1f" stroke-width="2.5"/></g>
  <g class="m-hand m-hr"><path d="M80 92q14 4 18 16" fill="none" stroke="#9a5a24" stroke-width="8" stroke-linecap="round"/><circle cx="99" cy="110" r="7" fill="#f6c89a" stroke="#8a4f1f" stroke-width="2.5"/></g>
</svg>`;

export function mount(card) {
  if (!card) return null;
  card.querySelector(':scope > .mascot')?.remove();
  // Phase 16: rendered 3D poses (app/assets/3d/monkey*.webp); the inline SVG stays as the fallback until the
  // idle render has loaded (and forever if it fails), so the card never shows an empty corner.
  const m = el(`<div class="mascot" data-mood="idle" aria-hidden="true">${SVG}<span class="m-3d"><img alt="" decoding="async" src="${POSES.idle}"><img alt="" decoding="async" src="${POSES.happy}"><img alt="" decoding="async" src="${POSES.encourage}"></span></div>`);
  const first = m.querySelector('.m-3d img');
  const ready = () => m.classList.add('is-3d');
  if (first.complete && first.naturalWidth) ready(); else first.addEventListener('load', ready, { once: true });
  card.appendChild(m);
  return m;
}

let timer = 0;
export function mood(card, name = 'idle') {
  const m = card?.querySelector(':scope > .mascot');
  if (!m) return;
  m.dataset.mood = 'idle'; void m.offsetWidth; // restart the animation when the same mood repeats
  m.dataset.mood = name;
  window.__lastMascot = { mood: name, at: Date.now() };
  clearTimeout(timer);
  if (name === 'encourage') timer = setTimeout(() => { if (m.isConnected) m.dataset.mood = 'idle'; }, 2600);
}

export default { mount, mood };
