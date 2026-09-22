/**
 * Home — greeting, smart recommendation, daily quests, subjects grid, recent.
 */
import store from '../../core/store.js';
import registry from '../../core/registry.js';
import quests from '../../engines/quests.js';
import sound from '../../engines/sound.js';
import { el, fmt, esc, hud, nav } from '../components.js';
import { recommend, itemCard } from './subject.js';
import { ico3d } from '../icons3d.js';

export async function render(root) {
  const p = store.profile, hero = store.hero;
  const h = hud();
  root.appendChild(h);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء النور' : 'مساء الخير';
  const q = quests.list();
  const done = q.filter((x) => x.done).length;
  const rec = recommend();

  root.appendChild(el(`
    <div class="card" style="border-color:${hero.hex}55;background:linear-gradient(140deg, ${hero.hex}22, var(--surface))">
      <div class="row">
        <div class="float i3d-hero">${ico3d(p.emoji, 72)}</div>
        <div class="grow">
          <h1 style="font-size:24px">${greet} يا ${esc(p.name)}! </h1>
          <p class="muted">${p.streak.count ? `شعلتك ${fmt(p.streak.count)} يوم ${ico3d('flame')} — كمّل النهاردة!` : 'ابدأ نشاطاً واحداً لتشعل شعلتك ' + ico3d('flame')}</p>
        </div>
      </div>
    </div>`));

  if (rec) {
    root.appendChild(el(`<div class="section"><h2>${ico3d('sparkle')} مقترح لك الآن</h2><span class="tag tag-purple">ذكي</span></div>`));
    root.appendChild(itemCard(rec, { big: true }));
  }

  root.appendChild(el(`<div class="section"><h2>${ico3d('target')} مهام اليوم</h2><span class="tag ${done === q.length ? 'tag-green' : 'tag-cyan'}">${fmt(done)}/${fmt(q.length)}</span></div>`));
  root.appendChild(el(`<a href="#/quests" class="card clickable stack" style="gap:8px">
    ${q.map((x) => `<div class="row"><span class="i3d-lg">${ico3d(x.icon, 26)}</span><div class="grow"><div class="small" style="font-weight:800">${esc(x.name)}</div><div class="level-bar green" style="height:6px;margin-top:4px"><span style="width:${Math.round((x.prog / x.target) * 100)}%"></span></div></div><span class="tag ${x.done ? 'tag-green' : 'tag-gold'}">${x.done ? ico3d('check') : `+${fmt(x.reward)}`}</span></div>`).join('')}
  </a>`));

  root.appendChild(el(`<div class="section"><h2>${ico3d('book')} المواد</h2></div>`));
  const grid = el('<div class="grid-3"></div>');
  for (const s of registry.subjects()) {
    const items = registry.items({ subject: s.id, hero: p.id });
    const doneN = items.filter((i) => p.activities[i.id]?.plays).length;
    const c = el(`<a href="#/subject/${s.id}" class="card clickable center" style="border-color:${s.color}55;padding:18px 10px">
      <div class="float" style="display:grid;place-items:center;line-height:1">${ico3d(s.icon, 48)}</div>
      <h3 style="font-size:15px;margin-top:6px;color:${s.color}">${esc(s.title)}</h3>
      <div class="small muted">${fmt(items.length)} نشاط</div>
      <div class="level-bar mt-2" style="height:6px"><span style="width:${items.length ? Math.round((doneN / items.length) * 100) : 0}%;background:${s.color}"></span></div>
    </a>`);
    c.addEventListener('click', () => sound.play('swipe'));
    grid.appendChild(c);
  }
  root.appendChild(grid);

  const recent = Object.entries(p.activities).sort((a, b) => b[1].lastPlayed - a[1].lastPlayed).slice(0, 4).map(([id]) => registry.item(id)).filter(Boolean);
  if (recent.length) {
    root.appendChild(el(`<div class="section"><h2>${ico3d('clock')} آخر ما لعبت</h2></div>`));
    const g = el('<div class="grid-2"></div>');
    recent.forEach((it) => g.appendChild(itemCard(it)));
    root.appendChild(g);
  }

  root.appendChild(el(`<p class="center small muted mt-6">${ico3d('heart')} منصة العائلة لأبطال البيت • تعمل بدون إنترنت</p>`));
  root.appendChild(nav('home'));
  return () => h.__cleanup?.();
}
