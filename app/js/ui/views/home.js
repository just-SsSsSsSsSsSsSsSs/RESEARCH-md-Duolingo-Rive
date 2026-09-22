import { el, hud, nav } from '../components.js';
export async function render(root) { const h = hud({ back: true, title: 'home' }); root.appendChild(h); root.appendChild(el('<div class="card center muted">قيد البناء…</div>')); root.appendChild(nav('home')); return () => h.__cleanup?.(); }
