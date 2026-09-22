/**
 * Badges view — earned & in-progress achievements grouped by tier.
 */
import registry from '../../core/registry.js';
import badges from '../../engines/badges.js';
import sound from '../../engines/sound.js';
import { el, fmt, esc, hud, nav, modal } from '../components.js';
import { badgeSVG } from '../badgeArt.js';
import { ico3d } from '../icons3d.js';

const TIER = { 1: ['برونزية', 'tag-cyan'], 2: ['فضية', 'tag-purple'], 3: ['ذهبية', 'tag-gold'] };

export async function render(root) {
  const h = hud({ back: true, icon: 'trophy', title: 'الشارات' });
  root.appendChild(h);
  const list = badges.list(registry.items());
  const earned = list.filter((b) => b.earned).length;
  root.appendChild(el(`<div class="card center glow-gold">
    <div class="float" style="display:grid;place-items:center">${ico3d('trophy', 72)}</div>
    <h1>${fmt(earned)} / ${fmt(list.length)}</h1>
    <p class="muted">شارة حصلت عليها</p>
    <div class="level-bar lg mt-3"><span style="width:${Math.round((earned / list.length) * 100)}%"></span></div>
  </div>`));
  for (const t of [1, 2, 3]) {
    const group = list.filter((b) => b.tier === t);
    if (!group.length) continue;
    root.appendChild(el(`<div class="section"><h2>${t === 3 ? ico3d('crown') : t === 2 ? ico3d('medalSilver') : ico3d('medalBronze')} شارات ${TIER[t][0]}</h2><span class="tag ${TIER[t][1]}">${fmt(group.filter((b) => b.earned).length)}/${fmt(group.length)}</span></div>`));
    const grid = el('<div class="badge-grid"></div>');
    group.sort((a, b) => (b.earned - a.earned) || (b.pct - a.pct)).forEach((b) => {
      const card = el(`<button class="badge ${b.earned ? 'earned' : ''}" aria-label="${esc(b.name)}">
        <div class="b-icon">${badgeSVG(b.id, b.tier, { size: 72 })}</div>
        <div class="b-name">${esc(b.name)}</div>
        <div class="b-desc">${esc(b.desc)}</div>
        ${b.earned ? '' : `<div class="level-bar b-prog"><span style="width:${b.pct}%"></span></div>`}
      </button>`);
      card.onclick = () => { sound.play('tap'); modal({ title: esc(b.name), body: `<div class="center">${badgeSVG(b.id, b.tier, { size: 120 })}</div><p class="muted">${esc(b.desc)}</p><p class="mt-3">${b.earned ? ` حصلت عليها يوم ${new Date(b.at).toLocaleDateString('ar-EG')}` : `التقدم: <b>${fmt(Math.min(b.prog, b.target))}</b> / ${fmt(b.target)}`}</p><p class="small muted mt-2">مكافأة: ${fmt(b.tier * 10)} ${ico3d('gem')}</p>`, actions: [{ label: 'تمام', cls: 'btn-primary' }] }); };
      grid.appendChild(card);
    });
    root.appendChild(grid);
  }
  root.appendChild(nav('badges'));
  return () => h.__cleanup?.();
}
