/**
 * Subject view + shared item card + simple recommender.
 */
import store from '../../core/store.js';
import registry from '../../core/registry.js';
import sound from '../../engines/sound.js';
import { el, fmt, esc, hud, nav } from '../components.js';
import { ico } from '../icons.js';

const TAGCLS = { quran: 'tag-gold', math: 'tag-cyan', arabic: 'tag-green', podcast: 'tag-purple', science: 'tag-rose', deen: 'tag-gold' };
const GLOW = { quran: 'glow-gold', math: 'glow-cyan', arabic: 'glow-green', podcast: 'glow-purple', science: 'glow-rose', deen: 'glow-gold' };

export function crown(m = 0) { return `<span class="crown" title="الإتقان ${m}/5">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < m ? 'on' : ''}"></i>`).join('')}</span>`; }

export function itemCard(it, { big = false } = {}) {
  const st = store.profile?.activities[it.id];
  const href = it.external ? registry.href(it) : `#/play/${it.id}`;
  const a = el(`<a href="${href}" ${it.external ? 'target="_blank" rel="noopener"' : ''} class="card clickable tile ${GLOW[it.subject] || ''}" ${big ? 'style="padding:20px"' : ''}>
    <div class="icon-box" style="${big ? 'width:68px;height:68px;font-size:36px' : ''}">${it.icon || '🎮'}</div>
    <div class="grow">
      <h3>${esc(it.title)} ${it.external ? `<span class="tag tag-purple">${ico('external')} تطبيق</span>` : `<span class="tag ${TAGCLS[it.subject] || ''}">+${fmt(it.xp || 20)} XP</span>`}</h3>
      <p>${esc(it.desc || '')}</p>
      ${!it.external ? `<div class="row mt-2" style="gap:8px">${crown(st?.mastery || 0)}${st?.best != null ? `<span class="small muted">أفضل: ${fmt(st.best)}٪</span>` : ''}${it.level ? `<span class="small muted">• صعوبة ${fmt(it.level)}</span>` : ''}</div>` : ''}
    </div>
    <span class="chev">${ico('chevronL')}</span>
  </a>`);
  a.addEventListener('click', () => sound.play('whoosh'));
  return a;
}

/** pick next best activity: unplayed → lowest mastery → least recent */
export function recommend() {
  const p = store.profile; if (!p) return null;
  const items = registry.items({ hero: p.id, playable: true });
  if (!items.length) return null;
  const scored = items.map((it) => { const s = p.activities[it.id]; return { it, score: !s ? 0 : s.mastery >= 5 ? 100 - (Date.now() - s.lastPlayed) / 864e5 : s.mastery * 10 - (Date.now() - s.lastPlayed) / 864e5 }; });
  scored.sort((a, b) => a.score - b.score);
  return scored[0].it;
}

export async function render(root, { id }) {
  const s = registry.subject(id);
  if (!s) throw Object.assign(new Error('مادة غير موجودة'), { friendly: true });
  const h = hud({ back: true, title: `${s.icon} ${s.title}` });
  root.appendChild(h);
  const items = registry.items({ subject: id, hero: store.profile.id });
  const playable = items.filter((i) => !i.external), ext = items.filter((i) => i.external);
  root.appendChild(el(`<div class="card center" style="border-color:${s.color}55;background:linear-gradient(140deg, ${s.color}22, var(--surface))"><div style="font-size:52px" class="float">${s.icon}</div><h1 style="color:${s.color}">${esc(s.title)}</h1><p class="muted">${esc(s.desc || '')}</p></div>`));
  if (playable.length) {
    root.appendChild(el(`<div class="section"><h2>🎮 أنشطة تفاعلية</h2><span class="tag ${TAGCLS[id] || ''}">${fmt(playable.length)}</span></div>`));
    const g = el('<div class="grid-2"></div>'); playable.forEach((it) => g.appendChild(itemCard(it))); root.appendChild(g);
  }
  if (ext.length) {
    root.appendChild(el(`<div class="section"><h2>🚀 تطبيقات وحلقات</h2><span class="tag tag-purple">${fmt(ext.length)}</span></div>`));
    const g = el('<div class="grid-2"></div>'); ext.forEach((it) => g.appendChild(itemCard(it))); root.appendChild(g);
  }
  if (!items.length) root.appendChild(el('<div class="card center muted">لا يوجد محتوى بعد — قريباً ✨</div>'));
  root.appendChild(nav('home'));
  return () => h.__cleanup?.();
}
