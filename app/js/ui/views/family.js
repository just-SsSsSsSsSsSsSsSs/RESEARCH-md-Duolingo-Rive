/**
 * Family Challenge Board - #/family (Phase 19).
 * Selim, Karma, Kenda (+ relatives imported as guests) on one board that never ranks anyone:
 *  - the headline crown rotates weekly between growth / streak / recovered / minutes;
 *  - each tile shows the child's own growth ring and one «beat your own record» line;
 *  - a cooperative family quest bar; when reached, every companion cheers once a week;
 *  - family card (share / import) and guests live behind the parent PIN (M3).
 * Local-first: no network, no names in any payload.
 */
import store from '../../core/store.js';
import bus from '../../core/bus.js';
import family, { CATEGORIES } from '../../engines/family.js';
import * as companion from '../../engines/companion.js';
import sound from '../../engines/sound.js';
import { el, fmt, esc, hud, nav, confetti, toast } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';

const CAT_ICON = { growth: 'chart', streak: 'flame', recovered: 'refresh', minutes: 'clock' };
const catIcon = (id, size = 18) => (ico3d(CAT_ICON[id] || id, size) || ico(CAT_ICON[id] || id));
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** deterministic companion per member so the same face greets the same child every week */
function mascotFor(id) {
  const all = companion.list(); if (!all.length) return null;
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return all[h % all.length];
}

function ring(pct, hex) {
  const p = Math.max(0, Math.min(100, pct));
  return `<div class="fam-ring" style="--p:${p};--c:${hex}" role="img" aria-label="تقدم ${fmt(p)} بالمئة"><span>${fmt(p)}%</span></div>`;
}

function tile(t, headline, i) {
  const m = mascotFor(t.id);
  const growthPct = t.firstWeek ? Math.min(100, t.week.correct * 5) : Math.max(0, Math.min(100, (t.growth || 0)));
  const crownsHtml = t.crowns.map((c) => { const cat = CATEGORIES.find((x) => x.id === c); return `<span class="fam-crown ${c === headline.id ? 'lead' : ''}" title="${esc(cat.title)}">${catIcon(c, 14)}<span>${esc(cat.name)}</span></span>`; }).join('');
  const stat = (id) => { const cat = CATEGORIES.find((x) => x.id === id); const v = t.values[id]; return `<div class="fam-stat"><span class="v">${fmt(v)}${id === 'growth' && !t.firstWeek && t.active ? '%' : ''}</span><span class="k">${esc(cat.name)}</span></div>`; };
  return el(`<article class="card fam-tile ${t.leads ? 'leads' : ''} ${t.guest ? 'guest' : ''}" data-hero="${esc(t.id)}" data-leads="${t.leads ? 1 : 0}" style="--hero:${esc(t.hex || '#a78bfa')};animation-delay:${i * 70}ms">
    <div class="fam-tile-head">
      <div class="fam-avatar" aria-hidden="true">${m ? `<img src="${companion.spriteUrl(m, t.leads ? 'happy' : 'idle')}" alt="" loading="lazy" decoding="async">` : ico3d('hero', 40)}</div>
      <div class="grow">
        <h3>${esc(t.name)} ${t.guest ? '<span class="tag tag-purple small">ضيف</span>' : ''}</h3>
        <div class="fam-crowns" aria-label="تيجان الاسبوع">${crownsHtml || '<span class="small muted">الاسبوع لسه شغال</span>'}</div>
      </div>
      ${ring(growthPct, t.hex || '#a78bfa')}
    </div>
    <p class="fam-line">${esc(t.line)}</p>
    <div class="fam-stats">${['growth', 'streak', 'recovered', 'minutes'].map(stat).join('')}</div>
  </article>`);
}

function questCard(q, headline) {
  return el(`<section class="card fam-quest ${q.done ? 'glow-green done' : 'glow-cyan'}" aria-live="polite" data-quest-done="${q.done ? 1 : 0}">
    <div class="row">
      <span class="i3d-lg">${ico3d(q.done ? 'party' : 'family', 34)}</span>
      <div class="grow">
        <h3>تحدي العيلة ده الاسبوع</h3>
        <p class="small muted">${q.done ? 'وصلتوا للهدف سوا، كل الرفقاء بيهللوا لكم' : `${fmt(q.target)} اجابة صحيحة سوا، كل واحد بيضيف من مكانه`}</p>
      </div>
      <span class="tag ${q.done ? 'tag-green' : 'tag-gold'}">${fmt(Math.min(q.progress, q.target))}/${fmt(q.target)}</span>
    </div>
    <div class="level-bar green lg" style="margin-top:10px" role="progressbar" aria-valuemin="0" aria-valuemax="${q.target}" aria-valuenow="${Math.min(q.progress, q.target)}" aria-label="تقدم تحدي العيلة"><span style="width:${q.pct}%"></span></div>
    <div class="row between small muted" style="margin-top:6px"><span>${fmt(q.contributors)} من العيلة شاركوا</span><span>تاج الاسبوع: ${catIcon(headline.id, 14)} ${esc(headline.title)}</span></div>
  </section>`);
}

/** every companion of the family cheers once (fx + own voice), respecting sound / celebration toggles */
async function familyCheer(root) {
  confetti({ count: 140 });
  sound.play('fanfare');
  if (store.meta.sound === false) return;
  const ids = [...root.querySelectorAll('.fam-tile')].map((t) => t.dataset.hero);
  const cast = [...new Set(ids.map((id) => mascotFor(id)?.id).filter(Boolean))].map((id) => companion.list().find((c) => c.id === id));
  for (const c of cast) {
    const url = companion.voiceUrl(c, 'cheer'); if (!url) continue;
    try { const a = new Audio(url); a.volume = 0.8; await a.play().catch(() => {}); await new Promise((r) => { a.onended = r; setTimeout(r, 2500); }); } catch { /* silent: never an error for the child */ }
  }
}

export async function render(root) {
  await companion.ready().catch(() => {});
  const h = hud({ back: true, icon: 'family', title: 'تحدي العيلة' });
  root.appendChild(h);
  const wrap = el('<div class="stack fam-board" data-view="family"></div>');
  root.appendChild(wrap);
  root.appendChild(nav('home'));

  const draw = () => {
    const b = family.board();
    wrap.innerHTML = '';
    wrap.appendChild(el(`<div class="card center fam-hero">
      <div class="${reduce() ? '' : 'float'}" style="display:grid;place-items:center">${ico3d('family', 56)}</div>
      <h1>لوحة شرف العيلة</h1>
      <p class="muted">كل واحد بيكسر رقمه هو، مش رقم اخوه. تاج الاسبوع ده: <b>${esc(b.headline.title)}</b></p>
      <p class="small muted">اسبوع يبدأ السبت ${esc(b.weekStart)}</p>
    </div>`));
    wrap.appendChild(questCard(b.quest, b.headline));
    const grid = el('<div class="fam-grid"></div>');
    b.tiles.forEach((t, i) => grid.appendChild(tile(t, b.headline, i)));
    wrap.appendChild(grid);
    wrap.appendChild(el(`<div class="card fam-legend">
      <h3>${ico3d('crown', 20)} اربع تيجان كل اسبوع</h3>
      <ul class="fam-cats">${CATEGORIES.map((c) => `<li class="${c.id === b.headline.id ? 'lead' : ''}">${catIcon(c.id, 18)}<b>${esc(c.name)}</b><span class="small muted">${esc(c.title)}</span></li>`).join('')}</ul>
      <p class="small muted">التاج بيروح لكل اللي وصلوا لنفس الرقم، ومحدش بيتقارن بغيره: التقدم بيتحسب على رقمك انت في الاربع اسابيع اللي فاتوا.</p>
      <a class="btn btn-block btn-ghost" href="#/parent" data-act="parent">${ico('lock')} كارت العيلة والضيوف (من صفحة الاهل)</a>
    </div>`));
    if (family.questJustReached(b)) setTimeout(() => familyCheer(wrap), 400);
    window.__family = { tiles: b.tiles.map((t) => ({ id: t.id, leads: t.leads, crowns: t.crowns, growth: t.growth, line: t.line })), quest: b.quest, headline: b.headline.id, weekStart: b.weekStart };
  };
  draw();
  const off = bus.on('family:change', draw);
  return () => { off(); h.__cleanup?.(); };
}
