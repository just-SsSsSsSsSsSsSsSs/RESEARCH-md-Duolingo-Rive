/**
 * icons3d — modern 3D-stylized SVG gaming icons (Phase 6, Zero-Emoji policy).
 * Every icon is a self-contained inline SVG with gradient fills, gloss highlights and a soft drop shadow,
 * inspired by PlayStation / Duolingo / Khan Kids visual language. No system emoji fonts anywhere.
 *
 *   ico3d('heart', 22)          -> inline SVG string sized 22px (class "i3d i3d-heart")
 *   EMOJI_MAP                   -> legacy emoji -> icon name (used by the sweep + t() helper)
 *   deEmoji(str)                -> replaces any emoji in a string with the matching inline icon
 */

const NS = 'xmlns="http://www.w3.org/2000/svg"';
let uid = 0;
const g = () => `i3d${(++uid).toString(36)}`;

/* ---------- shared building blocks ---------- */
const shadow = (id) => `<filter id="${id}" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity=".35"/></filter>`;
const lin = (id, a, b, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rad = (id, a, b) => `<radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const gloss = (d, o = .45) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const wrap = (name, defs, body, vb = '0 0 64 64') => (size) => `<svg class="i3d i3d-${name}" ${NS} viewBox="${vb}" width="${size}" height="${size}" aria-hidden="true" focusable="false"><defs>${defs}</defs>${body}</svg>`;

/* ---------- icon factories (each returns (size)=>svg) ---------- */
const ICONS = {
  heart() { const s = g(), r = g(); return wrap('heart', shadow(s) + rad(r, '#ff8fb1', '#e0114a'),
    `<g filter="url(#${s})"><path d="M32 56S8 41 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 17-24 32-24 32z" fill="url(#${r})"/><path d="M32 56S8 41 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 17-24 32-24 32z" fill="none" stroke="#7a0027" stroke-opacity=".35" stroke-width="1.5"/>${gloss('M17 17c4-3 8-2 10 1-4 1-7 4-9 8-2-3-3-7-1-9z')}</g>`); },
  heartBroken() { const s = g(), r = g(); return wrap('heart-broken', shadow(s) + rad(r, '#b8c4d6', '#5d6b82'),
    `<g filter="url(#${s})"><path d="M32 56S8 41 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 17-24 32-24 32z" fill="url(#${r})"/><path d="M32 20l-5 10 7 6-4 12 2 8" stroke="#1a2233" stroke-width="3" fill="none" stroke-linejoin="round"/>${gloss('M17 17c4-3 8-2 10 1-4 1-7 4-9 8-2-3-3-7-1-9z', .3)}</g>`); },
  gem() { const s = g(), a = g(), b = g(); return wrap('gem', shadow(s) + lin(a, '#9be7ff', '#1e90ff') + lin(b, '#5ad2ff', '#0b5cd6', 0, 0, 1, 1),
    `<g filter="url(#${s})"><path d="M18 10h28l12 14-26 32L6 24z" fill="url(#${a})"/><path d="M18 10l14 46 14-46z" fill="url(#${b})" opacity=".85"/><path d="M6 24h52" stroke="#fff" stroke-opacity=".7" stroke-width="1.6"/><path d="M18 10l8 14 6-14 6 14 8-14" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" fill="none"/>${gloss('M20 13l8 9H12z', .55)}</g>`); },
  flame() { const s = g(), a = g(), b = g(); return wrap('flame', shadow(s) + lin(a, '#ffd166', '#ff3d00') + lin(b, '#fff6b0', '#ffb300'),
    `<g filter="url(#${s})"><path d="M32 4c4 10 16 16 16 30a16 16 0 0 1-32 0c0-8 5-11 6-18 3 5 6 6 9 5-2-6-3-11 1-17z" fill="url(#${a})"/><path d="M32 26c3 6 9 8 9 15a9 9 0 0 1-18 0c0-5 3-6 4-10 2 3 3 3 5 2-1-3-1-5 0-7z" fill="url(#${b})"/>${gloss('M24 22c-1 4-3 6-3 10 0 2 1 4 2 5-3-2-4-6-3-9 1-3 3-5 4-6z', .35)}</g>`); },
  bolt() { const s = g(), a = g(); return wrap('bolt', shadow(s) + lin(a, '#fff59d', '#ffb300'),
    `<g filter="url(#${s})"><path d="M36 4L14 36h14l-4 24 26-36H36z" fill="url(#${a})" stroke="#b36b00" stroke-opacity=".4" stroke-width="1.5" stroke-linejoin="round"/>${gloss('M33 9L20 30h8z', .5)}</g>`); },
  trophy() { const s = g(), a = g(), b = g(); return wrap('trophy', shadow(s) + lin(a, '#ffe680', '#e6a100') + lin(b, '#fff3b0', '#c98a00'),
    `<g filter="url(#${s})"><path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="url(#${a})"/><path d="M18 12H8v6a10 10 0 0 0 10 8M46 12h10v6a10 10 0 0 1-10 8" stroke="url(#${b})" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M28 36h8v8h-8z" fill="#c98a00"/><rect x="18" y="44" width="28" height="8" rx="3" fill="url(#${b})"/><rect x="14" y="50" width="36" height="7" rx="3" fill="#a86f00"/>${gloss('M22 11h5v12c-3-2-5-6-5-12z', .5)}</g>`); },
  crown() { const s = g(), a = g(); return wrap('crown', shadow(s) + lin(a, '#ffe680', '#e6a100'),
    `<g filter="url(#${s})"><path d="M8 46V20l12 10 12-20 12 20 12-10v26z" fill="url(#${a})"/><rect x="8" y="42" width="48" height="10" rx="3" fill="#c98a00"/><circle cx="8" cy="20" r="4" fill="#ff5c8a"/><circle cx="32" cy="10" r="4.5" fill="#19e6ff"/><circle cx="56" cy="20" r="4" fill="#ff5c8a"/><circle cx="20" cy="40" r="3" fill="#b56cff"/><circle cx="32" cy="40" r="3" fill="#22e39b"/><circle cx="44" cy="40" r="3" fill="#b56cff"/>${gloss('M12 24l8 6 3-5-9-7z', .4)}</g>`); },
  star() { const s = g(), a = g(); return wrap('star', shadow(s) + lin(a, '#fff59d', '#ffb300'),
    `<g filter="url(#${s})"><path d="M32 4l8.6 18.2 19.4 2.4-14.3 13.5 3.8 19.5L32 48.2 14.5 57.6l3.8-19.5L4 24.6l19.4-2.4z" fill="url(#${a})" stroke="#b36b00" stroke-opacity=".35" stroke-width="1.5" stroke-linejoin="round"/>${gloss('M32 9l5 11-9 4z', .55)}</g>`); },
  sparkle() { const s = g(), a = g(); return wrap('sparkle', shadow(s) + lin(a, '#ffffff', '#7cf7ff'),
    `<g filter="url(#${s})"><path d="M32 4q3 24 28 28-25 4-28 28-3-24-28-28 25-4 28-28z" fill="url(#${a})"/><path d="M50 6q1 7 8 8-7 1-8 8-1-7-8-8 7-1 8-8z" fill="#ffe066"/><path d="M12 44q1 6 6 6-5 1-6 6-1-5-6-6 5 0 6-6z" fill="#ff8ab0"/></g>`); },
  medal() { const s = g(), a = g(), b = g(); return wrap('medal', shadow(s) + lin(a, '#ffe680', '#e6a100') + lin(b, '#ff6b6b', '#c81d3c'),
    `<g filter="url(#${s})"><path d="M22 4h8l8 20h-8zM42 4h-8l-8 20h8z" fill="url(#${b})"/><circle cx="32" cy="40" r="18" fill="url(#${a})"/><circle cx="32" cy="40" r="12" fill="none" stroke="#b36b00" stroke-opacity=".5" stroke-width="2"/><path d="M32 31l2.6 5.4 6 .8-4.3 4.1 1.1 5.9L32 44.4l-5.4 2.8 1.1-5.9-4.3-4.1 6-.8z" fill="#fff8d6"/>${gloss('M20 34a12 12 0 0 1 10-9c-4 3-6 6-7 11z', .5)}</g>`); },
  medalSilver() { const s = g(), a = g(); return wrap('medal-silver', shadow(s) + lin(a, '#f2f6fc', '#8b98ad'),
    `<g filter="url(#${s})"><path d="M22 4h8l8 20h-8zM42 4h-8l-8 20h8z" fill="#4f8cff"/><circle cx="32" cy="40" r="18" fill="url(#${a})"/><circle cx="32" cy="40" r="12" fill="none" stroke="#5d6b82" stroke-opacity=".5" stroke-width="2"/><text x="32" y="46" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="16" fill="#3b475c">2</text>${gloss('M20 34a12 12 0 0 1 10-9c-4 3-6 6-7 11z', .6)}</g>`); },
  medalBronze() { const s = g(), a = g(); return wrap('medal-bronze', shadow(s) + lin(a, '#f5b97a', '#a8562a'),
    `<g filter="url(#${s})"><path d="M22 4h8l8 20h-8zM42 4h-8l-8 20h8z" fill="#22e39b"/><circle cx="32" cy="40" r="18" fill="url(#${a})"/><circle cx="32" cy="40" r="12" fill="none" stroke="#6b3a1a" stroke-opacity=".5" stroke-width="2"/><text x="32" y="46" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="16" fill="#5a2e10">3</text>${gloss('M20 34a12 12 0 0 1 10-9c-4 3-6 6-7 11z', .5)}</g>`); },
  gradCap() { const s = g(), a = g(); return wrap('grad', shadow(s) + lin(a, '#3556b0', '#0d1a3a'),
    `<g filter="url(#${s})"><path d="M4 24L32 10l28 14-28 14z" fill="url(#${a})"/><path d="M16 30v12c0 5 7 9 16 9s16-4 16-9V30l-16 8z" fill="#1e3a8a"/><path d="M56 26v14" stroke="#ffc233" stroke-width="3"/><circle cx="56" cy="42" r="3.5" fill="#ffc233"/>${gloss('M12 22l20-10 8 4-22 10z', .3)}</g>`); },
  target() { const s = g(); return wrap('target', shadow(s),
    `<g filter="url(#${s})"><circle cx="32" cy="32" r="26" fill="#fff"/><circle cx="32" cy="32" r="20" fill="#ff3d5a"/><circle cx="32" cy="32" r="13" fill="#fff"/><circle cx="32" cy="32" r="6.5" fill="#ff3d5a"/><path d="M32 32L54 10" stroke="#0d1a3a" stroke-width="3.5" stroke-linecap="round"/><path d="M54 10l-2 9 9-2z" fill="#ffc233"/>${gloss('M12 26a20 20 0 0 1 14-14c-6 3-10 8-12 14z', .35)}</g>`); },
  rocket() { const s = g(), a = g(); return wrap('rocket', shadow(s) + lin(a, '#ffffff', '#c9d6ea'),
    `<g filter="url(#${s})" transform="rotate(-40 32 32)"><path d="M32 4c8 6 14 18 14 30l-6 8H24l-6-8c0-12 6-24 14-30z" fill="url(#${a})"/><circle cx="32" cy="26" r="6" fill="#0d1a3a"/><circle cx="32" cy="26" r="4" fill="#19e6ff"/><path d="M18 34l-8 14 10-6zM46 34l8 14-10-6z" fill="#ff5c8a"/><path d="M26 42l6 18 6-18z" fill="#ff8a3d"/><path d="M29 42l3 10 3-10z" fill="#ffe066"/></g>`); },
  brain() { const s = g(), a = g(); return wrap('brain', shadow(s) + rad(a, '#ffb3d1', '#e0479a'),
    `<g filter="url(#${s})"><path d="M30 8c-10 0-16 8-14 16-8 2-10 14-2 18-2 8 6 14 14 12l2-46zM34 8c10 0 16 8 14 16 8 2 10 14 2 18 2 8-6 14-14 12l-2-46z" fill="url(#${a})"/><path d="M32 8v46" stroke="#8a1b5c" stroke-width="3"/><path d="M18 26c6-2 10 4 14 2M46 26c-6-2-10 4-14 2M20 40c6 0 8-4 12-2M44 40c-6 0-8-4-12-2" stroke="#8a1b5c" stroke-opacity=".6" stroke-width="2.5" fill="none" stroke-linecap="round"/>${gloss('M20 14c3-3 7-4 9-3-4 1-7 4-8 8-1-2-2-4-1-5z', .45)}</g>`); },
  book() { const s = g(), a = g(); return wrap('book', shadow(s) + lin(a, '#4f8cff', '#1e3fa8'),
    `<g filter="url(#${s})"><path d="M10 10h20v46H10a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="url(#${a})"/><path d="M54 10H34v46h20a4 4 0 0 0 4-4V14a4 4 0 0 0-4-4z" fill="#22e39b"/><path d="M30 10h4v46h-4z" fill="#0d1a3a"/><path d="M12 20h12M12 28h12M12 36h12M40 20h12M40 28h12M40 36h12" stroke="#fff" stroke-opacity=".8" stroke-width="2.2" stroke-linecap="round"/></g>`); },
  quran() { const s = g(), a = g(); return wrap('quran', shadow(s) + lin(a, '#22c55e', '#065f46'),
    `<g filter="url(#${s})"><rect x="8" y="8" width="48" height="48" rx="6" fill="url(#${a})"/><rect x="14" y="14" width="36" height="36" rx="3" fill="none" stroke="#ffc233" stroke-width="2.5"/><path d="M32 18l4 8 8 1-6 6 2 9-8-4-8 4 2-9-6-6 8-1z" fill="#ffc233"/><path d="M40 32a8 8 0 1 1-4-10 6 6 0 1 0 4 10z" fill="#fff" opacity=".9"/>${gloss('M12 12h14l-8 12z', .2)}</g>`); },
  mosque() { const s = g(), a = g(); return wrap('mosque', shadow(s) + lin(a, '#ffe680', '#e6a100'),
    `<g filter="url(#${s})"><path d="M16 56V30a16 16 0 0 1 32 0v26z" fill="url(#${a})"/><path d="M6 56V22l3-8 3 8v34zM52 56V22l3-8 3 8v34z" fill="#d18f00"/><path d="M4 56h56v5H4z" fill="#a86f00"/><path d="M26 56V42a6 6 0 0 1 12 0v14z" fill="#0d1a3a"/><path d="M32 4v10M28 8h8" stroke="#ffc233" stroke-width="2.5" stroke-linecap="round"/><circle cx="9" cy="10" r="2.5" fill="#fff"/><circle cx="55" cy="10" r="2.5" fill="#fff"/>${gloss('M20 34a12 12 0 0 1 10-14c-5 3-8 7-8 14z', .35)}</g>`); },
  calc() { const s = g(), a = g(); return wrap('calc', shadow(s) + lin(a, '#7c8cff', '#3b3fbf'),
    `<g filter="url(#${s})"><rect x="12" y="6" width="40" height="52" rx="7" fill="url(#${a})"/><rect x="18" y="12" width="28" height="12" rx="3" fill="#dff6ff"/><text x="43" y="22" text-anchor="end" font-family="system-ui,Arial" font-weight="900" font-size="10" fill="#0d1a3a">1234</text>${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${18 + c * 10}" y="${30 + r * 9}" width="7" height="6" rx="1.5" fill="${r === 2 && c === 2 ? '#ffc233' : '#fff'}" opacity=".9"/>`).join('')).join('')}</g>`); },
  numbers() { const s = g(), a = g(); return wrap('numbers', shadow(s) + lin(a, '#7c8cff', '#3b3fbf'),
    `<g filter="url(#${s})"><rect x="6" y="6" width="52" height="52" rx="10" fill="url(#${a})"/><text x="19" y="30" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="18" fill="#fff">1</text><text x="44" y="30" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="18" fill="#ffc233">2</text><text x="19" y="52" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="18" fill="#19e6ff">3</text><text x="44" y="52" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="18" fill="#fff">4</text></g>`); },
  pen() { const s = g(), a = g(); return wrap('pen', shadow(s) + lin(a, '#ffb84d', '#e07a00'),
    `<g filter="url(#${s})"><path d="M10 54l6-18 30-30 12 12-30 30z" fill="url(#${a})"/><path d="M46 6l12 12 5-5-12-12z" fill="#ff5c8a"/><path d="M10 54l6-18 12 12z" fill="#0d1a3a"/><path d="M22 42l22-22" stroke="#fff" stroke-opacity=".6" stroke-width="2.5"/></g>`); },
  headphones() { const s = g(), a = g(); return wrap('headphones', shadow(s) + lin(a, '#b56cff', '#5b21b6'),
    `<g filter="url(#${s})"><path d="M10 40V32a22 22 0 0 1 44 0v8" stroke="url(#${a})" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="6" y="36" width="14" height="20" rx="5" fill="url(#${a})"/><rect x="44" y="36" width="14" height="20" rx="5" fill="url(#${a})"/><rect x="9" y="40" width="5" height="12" rx="2" fill="#19e6ff"/><rect x="50" y="40" width="5" height="12" rx="2" fill="#19e6ff"/></g>`); },
  shield() { const s = g(), a = g(); return wrap('shield', shadow(s) + lin(a, '#4f8cff', '#1e3fa8'),
    `<g filter="url(#${s})"><path d="M32 4l24 8v18c0 14-10 24-24 30C18 54 8 44 8 30V12z" fill="url(#${a})"/><path d="M32 12l16 5v13c0 10-7 17-16 21-9-4-16-11-16-21V17z" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2"/><path d="M23 32l6 6 12-13" stroke="#22e39b" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${gloss('M14 14l14-5v10l-12 4z', .25)}</g>`); },
  gear() { const s = g(), a = g(); return wrap('gear', shadow(s) + lin(a, '#c9d6ea', '#6b7a94'),
    `<g filter="url(#${s})"><path d="M28 4h8l2 8 7 3 7-4 6 6-4 7 3 7 8 2v8l-8 2-3 7 4 7-6 6-7-4-7 3-2 8h-8l-2-8-7-3-7 4-6-6 4-7-3-7-8-2v-8l8-2 3-7-4-7 6-6 7 4 7-3z" fill="url(#${a})"/><circle cx="32" cy="32" r="10" fill="#0d1a3a"/><circle cx="32" cy="32" r="6" fill="#19e6ff"/></g>`); },
  moon() { const s = g(), a = g(); return wrap('moon', shadow(s) + lin(a, '#fff3b0', '#ffc233'),
    `<g filter="url(#${s})"><path d="M40 6a26 26 0 1 0 18 40A22 22 0 0 1 40 6z" fill="url(#${a})"/><circle cx="20" cy="22" r="3" fill="#e6a100" opacity=".5"/><circle cx="26" cy="40" r="4" fill="#e6a100" opacity=".4"/><path d="M50 8q1 6 6 6-5 1-6 6-1-5-6-6 5 0 6-6z" fill="#fff"/></g>`); },
  sun() { const s = g(), a = g(); return wrap('sun', shadow(s) + rad(a, '#fff59d', '#ff9100'),
    `<g filter="url(#${s})"><circle cx="32" cy="32" r="14" fill="url(#${a})"/>${Array.from({ length: 8 }, (_, i) => { const a2 = (i / 8) * Math.PI * 2; return `<path d="M${32 + Math.cos(a2) * 20} ${32 + Math.sin(a2) * 20}L${32 + Math.cos(a2) * 28} ${32 + Math.sin(a2) * 28}" stroke="#ffb300" stroke-width="4" stroke-linecap="round"/>`; }).join('')}</g>`); },
  sunrise() { const s = g(), a = g(); return wrap('sunrise', shadow(s) + rad(a, '#fff59d', '#ff9100'),
    `<g filter="url(#${s})"><path d="M4 44h56" stroke="#0d1a3a" stroke-width="4"/><path d="M14 44a18 18 0 0 1 36 0z" fill="url(#${a})"/><path d="M32 10v8M14 18l5 5M50 18l-5 5M6 34h8M50 34h8" stroke="#ffc233" stroke-width="4" stroke-linecap="round"/><path d="M6 54c8-4 16 4 24 0s16 4 24 0" stroke="#19e6ff" stroke-width="3" fill="none" stroke-linecap="round"/></g>`); },
  compass() { const s = g(), a = g(); return wrap('compass', shadow(s) + lin(a, '#7cf7ff', '#0e7490'),
    `<g filter="url(#${s})"><circle cx="32" cy="32" r="27" fill="#fff"/><circle cx="32" cy="32" r="22" fill="url(#${a})"/><path d="M32 12l7 20-7 20-7-20z" fill="#0d1a3a"/><path d="M32 12l7 20H25z" fill="#ff3d5a"/><circle cx="32" cy="32" r="3.5" fill="#fff"/></g>`); },
  map() { const s = g(), a = g(); return wrap('map', shadow(s) + lin(a, '#fde68a', '#d97706'),
    `<g filter="url(#${s})"><path d="M6 14l16-6 20 6 16-6v42l-16 6-20-6-16 6z" fill="url(#${a})"/><path d="M22 8v42M42 14v42" stroke="#0d1a3a" stroke-opacity=".3" stroke-width="2"/><path d="M12 40c10-10 20 4 30-6s10-2 14-8" stroke="#ff3d5a" stroke-width="3" stroke-dasharray="4 4" fill="none" stroke-linecap="round"/><circle cx="52" cy="24" r="5" fill="#ff3d5a"/></g>`); },
  owl() { const s = g(), a = g(); return wrap('owl', shadow(s) + lin(a, '#a78bfa', '#5b21b6'),
    `<g filter="url(#${s})"><ellipse cx="32" cy="38" rx="22" ry="24" fill="url(#${a})"/><path d="M12 22l6-14 10 10M52 22l-6-14-10 10" fill="url(#${a})"/><circle cx="23" cy="32" r="9" fill="#fff"/><circle cx="41" cy="32" r="9" fill="#fff"/><circle cx="23" cy="32" r="4.5" fill="#0d1a3a"/><circle cx="41" cy="32" r="4.5" fill="#0d1a3a"/><path d="M32 38l-4 6h8z" fill="#ffc233"/><path d="M18 52q14 10 28 0" stroke="#c4b5fd" stroke-width="3" fill="none"/></g>`); },
  seedling() { const s = g(), a = g(); return wrap('seedling', shadow(s) + lin(a, '#86efac', '#15803d'),
    `<g filter="url(#${s})"><path d="M32 58V30" stroke="#15803d" stroke-width="4" stroke-linecap="round"/><path d="M32 34c-2-14-12-20-24-18 2 12 10 20 24 18z" fill="url(#${a})"/><path d="M32 28c2-12 10-18 22-16-2 10-10 18-22 16z" fill="#22c55e"/><path d="M14 58h36" stroke="#a16207" stroke-width="5" stroke-linecap="round"/></g>`); },
  plant() { const s = g(), a = g(); return wrap('plant', shadow(s) + lin(a, '#86efac', '#15803d'),
    `<g filter="url(#${s})"><path d="M20 40h24l-3 18H23z" fill="#c2410c"/><path d="M18 36h28v6H18z" fill="#ea580c"/><path d="M32 36V18" stroke="#15803d" stroke-width="4" stroke-linecap="round"/><path d="M32 26c-2-10-10-14-20-12 2 8 8 14 20 12z" fill="url(#${a})"/><path d="M32 20c2-10 10-14 20-12-2 8-8 14-20 12z" fill="#22c55e"/></g>`); },
  check() { const s = g(), a = g(); return wrap('check', shadow(s) + lin(a, '#4ade80', '#15803d'),
    `<g filter="url(#${s})"><circle cx="32" cy="32" r="27" fill="url(#${a})"/><path d="M18 33l9 9 19-20" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${gloss('M12 22a20 20 0 0 1 16-14c-7 3-12 8-16 14z', .3)}</g>`); },
  cross() { const s = g(), a = g(); return wrap('cross', shadow(s) + lin(a, '#fb7185', '#be123c'),
    `<g filter="url(#${s})"><circle cx="32" cy="32" r="27" fill="url(#${a})"/><path d="M21 21l22 22M43 21L21 43" stroke="#fff" stroke-width="6" stroke-linecap="round"/>${gloss('M12 22a20 20 0 0 1 16-14c-7 3-12 8-16 14z', .3)}</g>`); },
  question() { const s = g(), a = g(); return wrap('question', shadow(s) + lin(a, '#a78bfa', '#5b21b6'),
    `<g filter="url(#${s})"><circle cx="32" cy="32" r="27" fill="url(#${a})"/><path d="M23 25a9 9 0 1 1 13 8c-3 2-4 4-4 7" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="32" cy="47" r="3.5" fill="#fff"/></g>`); },
  lock() { const s = g(), a = g(); return wrap('lock', shadow(s) + lin(a, '#ffe680', '#e6a100'),
    `<g filter="url(#${s})"><path d="M20 28V20a12 12 0 0 1 24 0v8" stroke="#8b98ad" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="12" y="28" width="40" height="30" rx="7" fill="url(#${a})"/><circle cx="32" cy="41" r="4.5" fill="#0d1a3a"/><rect x="30" y="43" width="4" height="8" rx="2" fill="#0d1a3a"/></g>`); },
  gift() { const s = g(), a = g(); return wrap('gift', shadow(s) + lin(a, '#ff8ab0', '#c81d3c'),
    `<g filter="url(#${s})"><rect x="8" y="26" width="48" height="32" rx="5" fill="url(#${a})"/><rect x="6" y="18" width="52" height="12" rx="4" fill="#ff5c8a"/><rect x="28" y="18" width="8" height="40" fill="#ffc233"/><path d="M32 18c-8-2-12-8-8-12s10 4 8 12zM32 18c8-2 12-8 8-12s-10 4-8 12z" fill="#ffc233"/></g>`); },
  party() { const s = g(), a = g(); return wrap('party', shadow(s) + lin(a, '#ffb84d', '#e07a00'),
    `<g filter="url(#${s})"><path d="M8 56L22 20l22 22z" fill="url(#${a})"/><path d="M8 56l8-20 12 12z" fill="#ffe066" opacity=".6"/><circle cx="46" cy="14" r="4" fill="#ff5c8a"/><circle cx="56" cy="30" r="3.5" fill="#19e6ff"/><circle cx="38" cy="8" r="3" fill="#22e39b"/><path d="M48 24l6-6M40 16l-2-8" stroke="#b56cff" stroke-width="3" stroke-linecap="round"/><path d="M52 40q4-4 8 0" stroke="#ffc233" stroke-width="3" fill="none" stroke-linecap="round"/></g>`); },
  balloon() { const s = g(), a = g(); return wrap('balloon', shadow(s) + rad(a, '#ffb3d1', '#e0114a'),
    `<g filter="url(#${s})"><ellipse cx="32" cy="24" rx="18" ry="21" fill="url(#${a})"/><path d="M32 45l-4 5h8z" fill="#c81d3c"/><path d="M32 50q-6 6 0 12" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none"/>${gloss('M20 14c3-5 8-6 10-4-4 1-7 5-8 9-2-1-3-3-2-5z', .55)}</g>`); },
  hundred() { const s = g(), a = g(); return wrap('hundred', shadow(s) + lin(a, '#ff6b6b', '#c81d3c'),
    `<g filter="url(#${s})"><text x="32" y="40" text-anchor="middle" font-family="system-ui,Arial" font-weight="900" font-size="30" fill="url(#${a})" stroke="#0d1a3a" stroke-width="2" paint-order="stroke">100</text><path d="M12 50h40" stroke="url(#${a})" stroke-width="5" stroke-linecap="round"/></g>`); },
  muscle() { const s = g(), a = g(); return wrap('muscle', shadow(s) + lin(a, '#ffd3a8', '#e08a4d'),
    `<g filter="url(#${s})"><path d="M14 40c0-14 8-20 14-20l6 6-4 8c8-6 18-4 22 4s-2 18-14 18H24c-6 0-10-6-10-16z" fill="url(#${a})"/><path d="M28 20l-6-10c-2-4 4-6 6-2z" fill="url(#${a})"/><path d="M34 34c6-4 12-2 14 2" stroke="#b86232" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`); },
  thumb() { const s = g(), a = g(); return wrap('thumb', shadow(s) + lin(a, '#ffd3a8', '#e08a4d'),
    `<g filter="url(#${s})"><rect x="6" y="28" width="12" height="28" rx="4" fill="#4f8cff"/><path d="M20 30l10-20c4-6 10-2 8 4l-3 10h16c4 0 6 4 4 8l-6 18c-1 3-3 4-6 4H20z" fill="url(#${a})"/></g>`); },
  clap() { const s = g(), a = g(); return wrap('clap', shadow(s) + lin(a, '#ffd3a8', '#e08a4d'),
    `<g filter="url(#${s})"><path d="M18 58l-8-18c-2-6 4-10 8-6l4 6V22c0-4 6-4 6 0v14l4-22c1-4 7-3 6 1l-2 20 6-16c2-4 8-2 6 2l-6 20c-2 8-8 17-16 17z" fill="url(#${a})"/><path d="M8 14l6 4M14 8l4 6M4 24l6 2" stroke="#ffc233" stroke-width="3" stroke-linecap="round"/></g>`); },
  hero() { const s = g(), a = g(); return wrap('hero', shadow(s) + lin(a, '#ff5c8a', '#b91c1c'),
    `<g filter="url(#${s})"><path d="M12 30l20-14 20 14v26H12z" fill="url(#${a})"/><circle cx="32" cy="18" r="10" fill="#ffd3a8"/><path d="M22 18a10 10 0 0 1 20 0c-3-3-6-4-10-4s-7 1-10 4z" fill="#3b2a1a"/><path d="M26 40h12l-6 10z" fill="#ffc233"/><path d="M12 30l-6 10 8 2M52 30l6 10-8 2" fill="#4f8cff"/></g>`); },
  smile() { const s = g(), a = g(); return wrap('smile', shadow(s) + rad(a, '#fff59d', '#ffb300'),
    `<g filter="url(#${s})"><circle cx="32" cy="32" r="27" fill="url(#${a})"/><circle cx="23" cy="26" r="3.5" fill="#0d1a3a"/><circle cx="41" cy="26" r="3.5" fill="#0d1a3a"/><path d="M20 38q12 12 24 0" stroke="#0d1a3a" stroke-width="4" fill="none" stroke-linecap="round"/>${gloss('M14 20a20 20 0 0 1 14-12c-6 3-10 7-14 12z', .4)}</g>`); },
  dizzy() { const s = g(), a = g(); return wrap('dizzy', shadow(s) + rad(a, '#fff59d', '#ffb300'),
    `<g filter="url(#${s})"><circle cx="32" cy="32" r="27" fill="url(#${a})"/><path d="M18 22l8 8M26 22l-8 8M38 22l8 8M46 22l-8 8" stroke="#0d1a3a" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="32" cy="42" rx="6" ry="4" fill="#0d1a3a"/></g>`); },
  wave() { const s = g(), a = g(); return wrap('wave', shadow(s) + lin(a, '#ffd3a8', '#e08a4d'),
    `<g filter="url(#${s})"><path d="M20 58c-8-6-10-18-6-28l4-14c1-4 7-3 6 1l-2 12 6-22c1-4 7-3 6 1l-3 18 6-18c1-4 7-3 6 1l-4 20 5-12c2-4 8-2 6 2l-6 22c-3 10-14 20-24 17z" fill="url(#${a})"/><path d="M8 20l-4-2M10 14l-3-4M14 10l-1-5" stroke="#19e6ff" stroke-width="3" stroke-linecap="round"/></g>`); },
  pointDown() { const s = g(), a = g(); return wrap('point-down', shadow(s) + lin(a, '#ffd3a8', '#e08a4d'),
    `<g filter="url(#${s})"><path d="M26 6h12c4 0 6 3 6 6v14l8 6c4 3 2 9-3 8l-7-2-4 20c-1 4-7 4-8 0l-4-20-8 2c-5 1-7-5-3-8l8-6V12c0-3 2-6 3-6z" fill="url(#${a})"/><path d="M32 40v18" stroke="#b86232" stroke-width="2"/></g>`); },
  pinch() { const s = g(), a = g(); return wrap('pinch', shadow(s) + lin(a, '#ffd3a8', '#e08a4d'),
    `<g filter="url(#${s})"><path d="M14 58c-4-10 0-20 8-26l14-10c4-3 8 2 5 5l-8 8h20c4 0 4 6 0 6H38c6 2 8 8 4 8h-6c4 2 6 8 0 8H24c-6 0-9-4-10-9z" fill="url(#${a})"/></g>`); },
  speaker() { const s = g(), a = g(); return wrap('speaker', shadow(s) + lin(a, '#7cf7ff', '#0e7490'),
    `<g filter="url(#${s})"><path d="M8 24h10l14-12v40L18 40H8z" fill="url(#${a})"/><path d="M40 22a14 14 0 0 1 0 20M46 14a24 24 0 0 1 0 36" stroke="#19e6ff" stroke-width="4" fill="none" stroke-linecap="round"/></g>`); },
  snow() { const s = g(); return wrap('snow', shadow(s),
    `<g filter="url(#${s})" stroke="#7cf7ff" stroke-width="4" stroke-linecap="round"><path d="M32 6v52M9 19l46 26M9 45l46-26"/><path d="M32 6l-5 6M32 6l5 6M32 58l-5-6M32 58l5-6M9 19l7-1M9 19l1 7M55 45l-7 1M55 45l-1-7M9 45l7 1M9 45l1-7M55 19l-7-1M55 19l-1 7"/></g>`); },
  volcano() { const s = g(), a = g(); return wrap('volcano', shadow(s) + lin(a, '#7a4a2a', '#3b2314'),
    `<g filter="url(#${s})"><path d="M6 58L24 20h16l18 38z" fill="url(#${a})"/><path d="M24 20h16l6 12c-6-2-10 4-14 0-4 4-8-2-14 0z" fill="#ff5c3d"/><path d="M28 20c2-8 6-10 4-16 6 4 8 10 6 16z" fill="#ffc233"/><circle cx="20" cy="10" r="2.5" fill="#ff8a3d"/><circle cx="44" cy="8" r="2" fill="#ff8a3d"/></g>`); },
  comet() { const s = g(), a = g(); return wrap('comet', shadow(s) + lin(a, '#7cf7ff', '#1e3fa8', 1, 0, 0, 1),
    `<g filter="url(#${s})"><path d="M8 56L44 20" stroke="url(#${a})" stroke-width="10" stroke-linecap="round" opacity=".6"/><path d="M14 56L46 24" stroke="#ffe066" stroke-width="4" stroke-linecap="round"/><circle cx="46" cy="18" r="12" fill="#ffc233"/><circle cx="42" cy="14" r="4" fill="#fff" opacity=".8"/></g>`); },
  castle() { const s = g(), a = g(); return wrap('castle', shadow(s) + lin(a, '#c9d6ea', '#6b7a94'),
    `<g filter="url(#${s})"><rect x="8" y="26" width="48" height="32" rx="2" fill="url(#${a})"/><path d="M8 26V14h10v12M27 26V8h10v18M46 26V14h10v12" fill="#8b98ad"/><rect x="26" y="40" width="12" height="18" rx="6" fill="#0d1a3a"/><rect x="14" y="34" width="6" height="8" rx="1" fill="#19e6ff"/><rect x="44" y="34" width="6" height="8" rx="1" fill="#19e6ff"/><path d="M32 8V0l10 3-10 3" fill="#ff3d5a"/></g>`); },
  dna() { const s = g(); return wrap('dna', shadow(s),
    `<g filter="url(#${s})"><path d="M18 6c22 10 0 32 22 52M46 6c-22 10 0 32-22 52" stroke="#b56cff" stroke-width="5" fill="none" stroke-linecap="round"/>${[14, 24, 34, 44, 54].map((y) => `<path d="M24 ${y}h16" stroke="#19e6ff" stroke-width="3.5" stroke-linecap="round"/>`).join('')}</g>`); },
  waves() { const s = g(), a = g(); return wrap('waves', shadow(s) + lin(a, '#7cf7ff', '#1e90ff'),
    `<g filter="url(#${s})"><path d="M4 34c8-12 16-12 24 0s16 12 24 0 8-6 8-6v30H4z" fill="url(#${a})"/><path d="M4 44c8-10 16-10 24 0s16 10 24 0 8-4 8-4v18H4z" fill="#1e3fa8" opacity=".6"/><circle cx="20" cy="16" r="5" fill="#fff" opacity=".7"/><circle cx="40" cy="10" r="3" fill="#fff" opacity=".7"/></g>`); },
  bubble() { const s = g(), a = g(); return wrap('bubble', shadow(s) + rad(a, '#ffffff', '#7cf7ff'),
    `<g filter="url(#${s})"><circle cx="30" cy="34" r="22" fill="url(#${a})" opacity=".85"/><circle cx="30" cy="34" r="22" fill="none" stroke="#19e6ff" stroke-width="2"/><circle cx="50" cy="16" r="8" fill="url(#${a})" opacity=".8"/><ellipse cx="20" cy="24" rx="6" ry="3.5" fill="#fff" transform="rotate(-35 20 24)"/></g>`); },
  scroll() { const s = g(), a = g(); return wrap('scroll', shadow(s) + lin(a, '#fff8e8', '#f0dcb0'),
    `<g filter="url(#${s})"><rect x="14" y="8" width="36" height="48" rx="4" fill="url(#${a})"/><rect x="10" y="6" width="44" height="8" rx="4" fill="#d18f00"/><rect x="10" y="50" width="44" height="8" rx="4" fill="#d18f00"/><path d="M22 24h20M22 32h20M22 40h12" stroke="#a16207" stroke-width="3" stroke-linecap="round"/></g>`); },
  puzzle() { const s = g(), a = g(); return wrap('puzzle', shadow(s) + lin(a, '#22e39b', '#0e7a55'),
    `<g filter="url(#${s})"><path d="M10 14h16a6 6 0 1 1 12 0h16v16a6 6 0 1 0 0 12v16H38a6 6 0 1 0-12 0H10V42a6 6 0 1 1 0-12z" fill="url(#${a})"/>${gloss('M14 18h10l-2 8h-8z', .3)}</g>`); },
  dice() { const s = g(), a = g(); return wrap('dice', shadow(s) + lin(a, '#ffffff', '#c9d6ea'),
    `<g filter="url(#${s})"><rect x="8" y="8" width="48" height="48" rx="10" fill="url(#${a})"/><circle cx="20" cy="20" r="5" fill="#ff3d5a"/><circle cx="44" cy="20" r="5" fill="#ff3d5a"/><circle cx="32" cy="32" r="5" fill="#ff3d5a"/><circle cx="20" cy="44" r="5" fill="#ff3d5a"/><circle cx="44" cy="44" r="5" fill="#ff3d5a"/></g>`); },
  refresh() { const s = g(); return wrap('refresh', shadow(s),
    `<g filter="url(#${s})"><path d="M50 30a18 18 0 1 0-6 12" stroke="#19e6ff" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M50 14v16H34" stroke="#19e6ff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`); },
  basket() { const s = g(), a = g(); return wrap('basket', shadow(s) + lin(a, '#f5b97a', '#a8562a'),
    `<g filter="url(#${s})"><path d="M8 26h48l-6 30H14z" fill="url(#${a})"/><path d="M20 26l8-16M44 26l-8-16" stroke="#6b3a1a" stroke-width="4" stroke-linecap="round"/><path d="M6 24h52v6H6z" fill="#6b3a1a"/><path d="M18 34v16M26 34v18M34 34v18M42 34v16" stroke="#6b3a1a" stroke-opacity=".5" stroke-width="2.5"/></g>`); },
  music() { const s = g(), a = g(); return wrap('music', shadow(s) + lin(a, '#b56cff', '#5b21b6'),
    `<g filter="url(#${s})"><path d="M24 46V14l28-6v32" stroke="url(#${a})" stroke-width="5" fill="none" stroke-linejoin="round"/><circle cx="16" cy="46" r="8" fill="url(#${a})"/><circle cx="44" cy="40" r="8" fill="url(#${a})"/></g>`); },
  link() { const s = g(); return wrap('link', shadow(s),
    `<g filter="url(#${s})" stroke="#4f8cff" stroke-width="6" fill="none" stroke-linecap="round"><path d="M26 38l12-12M20 32l-6 6a10 10 0 0 0 14 14l6-6M44 32l6-6a10 10 0 0 0-14-14l-6 6"/></g>`); },
  radio() { const s = g(), a = g(); return wrap('radio', shadow(s) + lin(a, '#c9d6ea', '#6b7a94'),
    `<g filter="url(#${s})"><rect x="6" y="22" width="52" height="34" rx="6" fill="url(#${a})"/><circle cx="42" cy="39" r="10" fill="#0d1a3a"/><circle cx="42" cy="39" r="5" fill="#19e6ff"/><rect x="12" y="30" width="18" height="6" rx="2" fill="#dff6ff"/><rect x="12" y="42" width="18" height="4" rx="2" fill="#0d1a3a"/><path d="M14 22L40 6" stroke="#0d1a3a" stroke-width="3" stroke-linecap="round"/></g>`); },
  ladder() { const s = g(), a = g(); return wrap('ladder', shadow(s) + lin(a, '#f5b97a', '#a8562a'),
    `<g filter="url(#${s})" stroke="url(#${a})" stroke-width="5" stroke-linecap="round"><path d="M18 6v52M46 6v52"/><path d="M18 16h28M18 28h28M18 40h28M18 52h28"/></g>`); },
  coaster() { const s = g(), a = g(); return wrap('coaster', shadow(s) + lin(a, '#ff5c8a', '#b91c1c'),
    `<g filter="url(#${s})"><path d="M4 50C14 10 30 10 40 40s16 10 20-12" stroke="url(#${a})" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M12 50v8M24 30v28M40 40v18M52 36v22" stroke="#6b7a94" stroke-width="3"/><rect x="18" y="20" width="12" height="8" rx="3" fill="#ffc233"/></g>`); },
  kaaba() { const s = g(), a = g(); return wrap('kaaba', shadow(s) + lin(a, '#2b2f3a', '#0d0f16'),
    `<g filter="url(#${s})"><path d="M10 20l22-10 22 10v32L32 62 10 52z" fill="url(#${a})"/><path d="M10 20l22 10 22-10M32 30v32" stroke="#4b5060" stroke-width="1.5"/><path d="M10 28l22 10 22-10v6L32 44 10 34z" fill="#ffc233"/></g>`); },
  bulb() { const s = g(), a = g(); return wrap('bulb', shadow(s) + rad(a, '#fff59d', '#ffb300'),
    `<g filter="url(#${s})"><path d="M32 4a18 18 0 0 1 10 33c-2 2-2 5-2 7H24c0-2 0-5-2-7A18 18 0 0 1 32 4z" fill="url(#${a})"/><rect x="24" y="46" width="16" height="6" rx="2" fill="#8b98ad"/><rect x="26" y="53" width="12" height="5" rx="2" fill="#6b7a94"/><path d="M28 22l4 8 4-8" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`); },
  clock() { const s = g(), a = g(); return wrap('clock', shadow(s) + lin(a, '#ffffff', '#c9d6ea'),
    `<g filter="url(#${s})"><circle cx="32" cy="32" r="27" fill="#4f8cff"/><circle cx="32" cy="32" r="21" fill="url(#${a})"/><path d="M32 18v14l9 6" stroke="#0d1a3a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="32" r="3" fill="#ff3d5a"/></g>`); },
  family() { const s = g(); return wrap('family', shadow(s),
    `<g filter="url(#${s})"><circle cx="16" cy="18" r="8" fill="#4f8cff"/><path d="M4 48c0-12 6-18 12-18s12 6 12 18z" fill="#4f8cff"/><circle cx="48" cy="18" r="8" fill="#ff5c8a"/><path d="M36 48c0-12 6-18 12-18s12 6 12 18z" fill="#ff5c8a"/><circle cx="32" cy="36" r="6" fill="#ffc233"/><path d="M23 58c0-9 4-13 9-13s9 4 9 13z" fill="#ffc233"/></g>`); },
  note() { const s = g(), a = g(); return wrap('note', shadow(s) + lin(a, '#fff8e8', '#f0dcb0'),
    `<g filter="url(#${s})"><rect x="12" y="6" width="40" height="52" rx="5" fill="url(#${a})"/><path d="M20 20h24M20 30h24M20 40h14" stroke="#4f8cff" stroke-width="3" stroke-linecap="round"/><path d="M40 52l14-14 4 4-14 14h-4z" fill="#ffc233"/></g>`); },
  archive() { const s = g(), a = g(); return wrap('archive', shadow(s) + lin(a, '#c9d6ea', '#6b7a94'),
    `<g filter="url(#${s})"><rect x="8" y="8" width="48" height="14" rx="3" fill="#4f8cff"/><rect x="10" y="24" width="44" height="32" rx="3" fill="url(#${a})"/><rect x="24" y="30" width="16" height="6" rx="3" fill="#0d1a3a"/></g>`); },
  box() { const s = g(), a = g(); return wrap('box', shadow(s) + lin(a, '#f5b97a', '#a8562a'),
    `<g filter="url(#${s})"><path d="M8 20l24-10 24 10v30L32 60 8 50z" fill="url(#${a})"/><path d="M8 20l24 10 24-10M32 30v30" stroke="#6b3a1a" stroke-width="2"/><path d="M20 15l24 10v8l-24-10z" fill="#ffc233" opacity=".7"/></g>`); },
  key() { const s = g(), a = g(); return wrap('key', shadow(s) + lin(a, '#ffe680', '#e6a100'),
    `<g filter="url(#${s})"><circle cx="22" cy="24" r="14" fill="url(#${a})"/><circle cx="22" cy="24" r="5" fill="#0d1a3a"/><path d="M32 32l24 24M48 48l6-6M42 42l6-6" stroke="url(#${a})" stroke-width="7" stroke-linecap="round"/></g>`); },
  flag() { const s = g(); return wrap('flag', shadow(s),
    `<g filter="url(#${s})"><path d="M12 60V6" stroke="#6b7a94" stroke-width="5" stroke-linecap="round"/><path d="M14 8h36v28H14z" fill="#fff"/>${[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => ((r + c) % 2 ? `<rect x="${14 + c * 9}" y="${8 + r * 7}" width="9" height="7" fill="#0d1a3a"/>` : '')).join('')).join('')}</g>`); },
  gamepad() { const s = g(), a = g(); return wrap('gamepad', shadow(s) + lin(a, '#c9d6ea', '#6b7a94'),
    `<g filter="url(#${s})"><path d="M14 18h36a12 12 0 0 1 12 12l-2 14a8 8 0 0 1-14 4l-4-6H22l-4 6a8 8 0 0 1-14-4L2 30a12 12 0 0 1 12-12z" fill="url(#${a})"/><path d="M18 26v12M12 32h12" stroke="#0d1a3a" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="28" r="3.5" fill="#ff3d5a"/><circle cx="52" cy="34" r="3.5" fill="#22e39b"/><circle cx="44" cy="40" r="3.5" fill="#19e6ff"/><circle cx="36" cy="34" r="3.5" fill="#ffc233"/></g>`); },
  arrowUp() { const s = g(); return wrap('arrow-up', shadow(s), `<g filter="url(#${s})"><circle cx="32" cy="32" r="26" fill="#22e39b"/><path d="M32 46V20M20 32l12-12 12 12" stroke="#0d1a3a" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`); },
  arrowDown() { const s = g(); return wrap('arrow-down', shadow(s), `<g filter="url(#${s})"><circle cx="32" cy="32" r="26" fill="#ff5c8a"/><path d="M32 18v26M20 32l12 12 12-12" stroke="#0d1a3a" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`); },
  dot() { const s = g(), a = g(); return wrap('dot', shadow(s) + rad(a, '#ffffff', '#c9d6ea'), `<g filter="url(#${s})"><circle cx="32" cy="32" r="18" fill="url(#${a})"/></g>`); },
  blossom() { const s = g(); return wrap('blossom', shadow(s),
    `<g filter="url(#${s})">${Array.from({ length: 5 }, (_, i) => { const a2 = (i / 5) * Math.PI * 2 - Math.PI / 2; return `<ellipse cx="${32 + Math.cos(a2) * 14}" cy="${32 + Math.sin(a2) * 14}" rx="9" ry="12" fill="#ff8ab0" transform="rotate(${(a2 * 180) / Math.PI + 90} ${32 + Math.cos(a2) * 14} ${32 + Math.sin(a2) * 14})"/>`; }).join('')}<circle cx="32" cy="32" r="7" fill="#ffc233"/></g>`); },
  gemBag() { const s = g(), a = g(); return wrap('gem-bag', shadow(s) + lin(a, '#9be7ff', '#1e90ff'),
    `<g filter="url(#${s})"><path d="M24 16h16l14 14-22 26L10 30z" fill="url(#${a})"/><path d="M10 30h44" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/><path d="M24 16l8 40 8-40" stroke="#fff" stroke-opacity=".5" stroke-width="1.5" fill="none"/><circle cx="14" cy="14" r="5" fill="#b56cff"/><circle cx="52" cy="12" r="4" fill="#ff5c8a"/></g>`); },
};

/* ---------- public API ---------- */
const cache = new Map();
export function ico3d(name, size = 20) {
  const f = ICONS[name]; if (!f) return '';
  const key = `${name}@${size}`;
  if (!cache.has(key)) cache.set(key, f()(size)); // factory -> sized renderer
  return cache.get(key);
}
export const ICON_NAMES = Object.keys(ICONS);

/** legacy emoji -> icon name. Used by deEmoji() and the codebase sweep. */
export const EMOJI_MAP = {
  '\u{1F525}': 'flame', '\u{1F451}': 'crown', '\u{1F48E}': 'gem', '\u{2728}': 'sparkle', '\u{1F393}': 'gradCap', '\u{1F3AF}': 'target', '\u{1F31F}': 'star', '\u{2B50}': 'star', '\u{1F4AB}': 'sparkle',
  '\u{1FAE7}': 'bubble', '\u{1F4D6}': 'quran', '\u{1F4DA}': 'book', '\u{1F680}': 'rocket', '\u{2764}\u{FE0F}': 'heart', '\u{2764}': 'heart', '\u{1F494}': 'heartBroken', '\u{1F9E0}': 'brain', '\u{1F331}': 'seedling', '\u{1FAB4}': 'plant',
  '\u{2714}\u{FE0F}': 'check', '\u{2714}': 'check', '\u{2705}': 'check', '\u{2713}': 'check', '\u{274C}': 'cross', '\u{2717}': 'cross', '\u{2753}': 'question', '\u{1F4AF}': 'hundred', '\u{1F389}': 'party', '\u{1F38A}': 'party', '\u{1F3C5}': 'medal',
  '\u{1F948}': 'medalSilver', '\u{1F949}': 'medalBronze', '\u{1F3C6}': 'trophy', '\u{1F522}': 'numbers', '\u{270D}\u{FE0F}': 'pen', '\u{270D}': 'pen', '\u{1F54C}': 'mosque', '\u{1F54B}': 'kaaba', '\u{1F30B}': 'volcano', '\u{2604}\u{FE0F}': 'comet',
  '\u{1F4AA}': 'muscle', '\u{2744}\u{FE0F}': 'snow', '\u{1F510}': 'lock', '\u{1F512}': 'lock', '\u{1F4DC}': 'scroll', '\u{1F319}': 'moon', '\u{26A1}': 'bolt', '\u{1F44F}': 'clap', '\u{1F9B8}': 'hero', '\u{1F9B8}\u{200D}\u{2642}\u{FE0F}': 'hero', '\u{1F90F}': 'pinch',
  '\u{1F50A}': 'speaker', '\u{1F44D}': 'thumb', '\u{1F3AE}': 'gamepad', '\u{1F3A7}': 'headphones', '\u{1F3B2}': 'dice', '\u{1F9E9}': 'puzzle', '\u{1F504}': 'refresh', '\u{1F9FA}': 'basket', '\u{1F3BC}': 'music', '\u{1F517}': 'link',
  '\u{1F4FB}': 'radio', '\u{1FA9C}': 'ladder', '\u{1F3A2}': 'coaster', '\u{1F635}': 'dizzy', '\u{1F338}': 'blossom', '\u{1F9EC}': 'dna', '\u{1F3F0}': 'castle', '\u{1F9ED}': 'compass', '\u{1F5FA}\u{FE0F}': 'map', '\u{1F30A}': 'waves',
  '\u{1F305}': 'sunrise', '\u{1F989}': 'owl', '\u{1F388}': 'balloon', '\u{1F60A}': 'smile', '\u{1F604}': 'smile', '\u{1F3C1}': 'flag', '\u{1F4A1}': 'bulb', '\u{1F44B}': 'wave', '\u{1F558}': 'clock', '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}': 'family',
  '\u{1F4DD}': 'note', '\u{1F5C4}\u{FE0F}': 'archive', '\u{1F4E6}': 'box', '\u{2B06}\u{FE0F}': 'arrowUp', '\u{2B07}\u{FE0F}': 'arrowDown', '\u{1F447}': 'pointDown', '\u{26AA}': 'dot', '\u{2699}\u{FE0F}': 'gear', '\u{1F511}': 'key', '\u{1F381}': 'gift', '\u{2600}\u{FE0F}': 'sun',
};
const EMOJI_RE = new RegExp(Object.keys(EMOJI_MAP).sort((a, b) => b.length - a.length).map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
/** Replace any legacy emoji inside a text string with an inline 3D icon (e.g. content JSON titles). */
export function deEmoji(str, size = 18) {
  if (!str || typeof str !== 'string') return str ?? '';
  return str.replace(EMOJI_RE, (m) => `<span class="i3d-inline">${ico3d(EMOJI_MAP[m], size)}</span>`);
}
export default ico3d;
