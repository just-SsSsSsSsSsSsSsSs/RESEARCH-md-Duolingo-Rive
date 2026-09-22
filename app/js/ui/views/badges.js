import { el, hud, nav } from '../components.js';
export async function render(root) { const h = hud({ back: true, title: 'badges' }); root.appendChild(h); root.appendChild(el('<div class="card center muted">قيد البناء…</div>')); root.appendChild(nav('badges')); return () => h.__cleanup?.(); }
