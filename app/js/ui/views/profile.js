/**
 * Profile picker & hero card (stats, week streak, certificates, settings).
 */
import store from '../../core/store.js';
import router from '../../core/router.js';
import sound from '../../engines/sound.js';
import { levelInfo } from '../../engines/xp.js';
import badges from '../../engines/badges.js';
import streak from '../../engines/streak.js';
import { el, fmt, esc, hud, nav, toast } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';
import companion from '../../engines/companion.js'; // Phase 17: companion picker

export async function render(root) {
  if (!store.profile) return renderPicker(root);
  return renderCard(root);
}

function renderPicker(root) {
  root.innerHTML = `
    <div class="center" style="padding:6vh 0 20px">
      <div class="float" style="display:grid;place-items:center">${ico3d('bubble', 80)}</div>
      <h1 style="margin-top:8px">أبطال البيت</h1>
      <p class="muted">مين البطل اللي هيتعلّم النهاردة؟ </p>
    </div>
    <div class="grid-3 heroes"></div>
    <div class="center mt-6"><a href="#/parent" class="btn btn-ghost btn-sm">${ico('shield')} لوحة الأهل</a></div>`;
  const grid = root.querySelector('.heroes');
  for (const { hero, state } of store.listProfiles()) {
    const li = levelInfo(state?.xp || 0);
    const card = el(`<div class="card clickable hero-card" style="--hero:${hero.hex};border-color:${hero.hex}55" role="button" tabindex="0">
      <div class="big" style="display:grid;place-items:center">${ico3d(hero.emoji, 64)}</div>
      <h3 style="color:${hero.hex}">${esc(hero.name)}</h3>
      <div class="lvl">${state ? `مستوى ${fmt(li.level)} • ${esc(li.title)}` : 'ابدأ رحلتك ' + ico3d('sparkle')}</div>
      ${state ? `<div class="level-bar mt-2" style="height:8px"><span style="width:${li.pct}%"></span></div>` : ''}
    </div>`);
    const pick = () => { sound.play('correct'); store.load(hero.id); router.go('/home'); };
    card.onclick = pick; card.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && pick();
    grid.appendChild(card);
  }
}

function renderCard(root) {
  const p = store.profile, hero = store.hero, li = levelInfo();
  const acts = Object.values(p.activities);
  const acc = p.counters.answers ? Math.round((p.counters.correct / p.counters.answers) * 100) : 0;
  const week = streak.week();
  const h = hud();
  root.appendChild(h);
  root.appendChild(el(`
    <div class="card center" style="--hero:${hero.hex};border-color:${hero.hex}55">
      <div class="float" style="display:grid;place-items:center">${ico3d(p.emoji, 84)}</div>
      <h1 style="color:${hero.hex}">${esc(p.name)}</h1>
      <p class="muted">${esc(li.title)} • مستوى ${fmt(li.level)}</p>
      <div class="level-bar lg mt-3"><span style="width:${li.pct}%"></span></div>
      <p class="small muted mt-2">${fmt(li.into)} / ${fmt(li.need)} نقطة للمستوى التالي</p>
      <div class="stats">
        <div class="stat"><b>${fmt(p.xp)}</b><span>نقاط الخبرة</span></div>
        <div class="stat"><b>${fmt(p.streak.count)} </b><span>متتالية (أفضل ${fmt(p.streak.best)})</span></div>
        <div class="stat"><b>${fmt(p.gems)} </b><span>جواهر</span></div>
        <div class="stat"><b>${fmt(acc)}٪</b><span>دقة الإجابات</span></div>
        <div class="stat"><b>${fmt(acts.length)}</b><span>أنشطة مجرَّبة</span></div>
        <div class="stat"><b>${fmt(badges.earnedCount())}/${fmt(badges.total())}</b><span>شارات</span></div>
      </div>
    </div>
    <div class="section"><h2> أسبوعك</h2><span class="tag tag-cyan">${ico('snowflake')} تجميد: ${fmt(p.streak.freezes)}</span></div>
    <div class="card">
      <div class="row between" style="gap:4px">
        ${week.map((d) => `<div class="center grow"><div style="font-size:26px;line-height:1.2">${d.active ? ico3d('flame') : d.frozen ? ico3d('snow') : ico3d('dot')}</div><div class="small ${d.today ? '' : 'muted'}" style="font-weight:800">${esc(d.day)}</div></div>`).join('')}
      </div>
      <button class="btn btn-block btn-sm mt-3" data-act="freeze" ${p.streak.freezes >= 3 || p.gems < 30 ? 'disabled' : ''}>${ico('snowflake')} اشترِ تجميد شعلة (30 )</button>
    </div>
    <div class="section"><h2> شهاداتي</h2><span class="tag tag-gold">${fmt(p.certificates.length)}</span></div>
    <div class="stack">${p.certificates.length ? p.certificates.slice().reverse().map((c) => `<a href="#/certificate/${c.id}" class="card clickable tile glow-gold"><div class="icon-box">${ico3d('gradCap')}</div><div class="grow"><h3>${esc(c.title)}</h3><p>${new Date(c.date).toLocaleDateString('ar-EG')} • ${fmt(c.xp)} نقطة</p></div><span class="chev">${ico('chevronL')}</span></a>`).join('') : '<div class="card center muted">أكمل نشاطاً بإتقان كامل لتحصل على شهادة ' + ico3d('medal') + '</div>'}</div>
    <div class="section"><h2>${ico3d('pen', 22)} دفتري</h2><span class="tag tag-purple">${fmt((p.journal || []).length)}</span></div>
    <div class="stack journal">${(p.journal || []).length ? p.journal.slice().reverse().slice(0, 10).map((j) => `<div class="card journal-entry"><div class="row" style="gap:8px;align-items:flex-start">${ico3d('speechBubble', 26)}<div class="grow"><p class="small muted">${esc(j.q)}</p><p class="journal-a">${esc(j.a)}</p><p class="small muted" style="margin-top:4px">${new Date(j.at).toLocaleDateString('ar-EG')}</p></div></div></div>`).join('') : '<div class="card center muted">اكتب إجابتك في سؤال «عبّر عن نفسك» بعد أي قصة لتظهر هنا ' + ico3d('bookmark') + '</div>'}</div>
    <div class="section"><h2> إعدادات</h2></div>
    <div class="card stack">
      <div class="row between"><span> الوضع الليلي</span><button class="switch ${store.meta.theme !== 'light' ? 'on' : ''}" data-act="theme" aria-label="الوضع"></button></div>
      <div class="row between"><span> الأصوات</span><button class="switch ${sound.enabled ? 'on' : ''}" data-act="sound" aria-label="الصوت"></button></div>
      <div class="row between"><span> شدة الاحتفال</span><select class="input" style="width:auto;min-height:40px" data-act="celebration"><option value="0">هادي</option><option value="1">عادي</option><option value="2">حفلة </option><option value="3">أقصى </option></select></div>
      <div class="row between"><span> تقليل الفقاعات (أجهزة ضعيفة)</span><button class="switch ${store.meta.reduceBubbles ? 'on' : ''}" data-act="bubbles" aria-label="الفقاعات"></button></div>
      <div class="companion-pick" data-companions>
        <span class="small muted">رفيق التشجيع</span>
        <div class="row wrap" role="radiogroup" aria-label="رفيق التشجيع">
          <button class="companion-opt ${companion.favourite() ? '' : 'on'}" role="radio" aria-checked="${companion.favourite() ? 'false' : 'true'}" data-cp=""><span class="cp-surprise">؟</span><span>مفاجأة</span></button>
          ${companion.list().map((c) => `<button class="companion-opt ${companion.favourite() === c.id ? 'on' : ''}" role="radio" aria-checked="${companion.favourite() === c.id ? 'true' : 'false'}" data-cp="${esc(c.id)}"><img src="${companion.spriteUrl(c, 'idle')}" alt="" loading="lazy" decoding="async"><span>${esc(c.name)}</span></button>`).join('')}
        </div>
      </div>
      <a class="btn btn-block btn-ghost" href="#/family" data-act="family">${ico('crown')} تحدي العيلة ولوحة الشرف</a>
      <a class="btn btn-block btn-ghost" href="#/charter" data-act="charter">${ico('scroll')} ميثاق العيلة وروابطها الدائمة</a>
      <button class="btn btn-block" data-act="switch">${ico('refresh')} تبديل البطل</button>
    </div>`));
  root.appendChild(nav('profile'));

  root.querySelector('[data-act="theme"]').onclick = (e) => { const on = e.currentTarget.classList.toggle('on'); store.setMeta({ theme: on ? 'dark' : 'light' }); sound.play('tap'); };
  root.querySelector('[data-act="sound"]').onclick = (e) => { const on = sound.toggle(); e.currentTarget.classList.toggle('on', on); };
  root.querySelector('[data-act="bubbles"]').onclick = (e) => { const on = e.currentTarget.classList.toggle('on'); store.setMeta({ reduceBubbles: on }); window.__bubbles?.setIntensity(on ? 0.4 : 1); sound.play('tap'); };
  const celSel = root.querySelector('[data-act="celebration"]'); celSel.value = String(store.meta.celebration ?? 2);
  celSel.onchange = (e) => { store.setMeta({ celebration: Number(e.target.value) }); sound.play('correct'); import('../../engines/fx.js').then((m) => m.celebrate({ x: innerWidth / 2, y: innerHeight * 0.4, xp: 0, combo: Number(e.target.value) >= 2 ? 3 : 1 })); };
  root.querySelectorAll('.companion-opt').forEach((b) => { b.onclick = () => {
    companion.setFavourite(b.dataset.cp);
    root.querySelectorAll('.companion-opt').forEach((o) => { const on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-checked', on ? 'true' : 'false'); });
    sound.play('tap');
  }; });
  root.querySelector('[data-act="switch"]').onclick = () => { sound.play('swipe'); store.logout(); router.go('/profile', true); };
  root.querySelector('[data-act="freeze"]').onclick = (e) => { if (streak.buyFreeze(30)) { toast(ico3d('snow') + ' حصلت على تجميد شعلة!', { type: 'info' }); e.currentTarget.disabled = true; } };
  return () => h.__cleanup?.();
}
