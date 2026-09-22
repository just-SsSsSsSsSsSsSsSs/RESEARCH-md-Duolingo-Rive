import { el, hud, nav } from '../components.js';
export async function render(root) { const h = hud({ back: true, title: 'subject' }); root.appendChild(h); root.appendChild(el('<div class="card center muted">قيد البناء…</div>')); root.appendChild(nav('subject')); return () => h.__cleanup?.(); }
