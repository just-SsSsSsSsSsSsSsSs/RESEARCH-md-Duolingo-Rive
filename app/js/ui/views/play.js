/**
 * Play view — runs a Session for an activity id.
 */
import store from '../../core/store.js';
import registry from '../../core/registry.js';
import router from '../../core/router.js';
import sound from '../../engines/sound.js';
import hearts from '../../engines/hearts.js';
import Session from '../../activities/session.js';
import renderers from '../../activities/renderers.js';
import { badgeSVG } from '../badgeArt.js';
import { el, esc, fmt, hud, modal, confetti, toast } from '../components.js';
import { ico } from '../icons.js';
import { crown } from './subject.js';
import fx from '../../engines/fx.js';
import { ico3d } from '../icons3d.js';

const CHEERS = ['ممتاز! ' + ico3d('star'), 'برافو! ' + ico3d('clap'), 'عبقري! ' + ico3d('brain'), 'رهيب! ' + ico3d('rocket'), 'صح ١٠٠٪ ' + ico3d('hundred'), 'أنت بطل! ' + ico3d('hero'), 'استمر هكذا! ' + ico3d('flame')];
const OOPS = ['مش مشكلة، نتعلم من الخطأ ' + ico3d('muscle'), 'قريب جداً! ' + ico3d('pinch'), 'حاول تركّز في المرة الجاية ' + ico3d('target'), 'كل بطل يغلط ويكمّل ' + ico3d('seedling')];

export async function render(root, { id }) {
  const it = registry.item(id);
  if (!it) throw Object.assign(new Error('نشاط غير موجود'), { friendly: true });
  if (it.type === 'story') { const Story = await import('./story.js'); return Story.render(root, { id }); } // Phase 7: story mode
  const activity = await registry.loadActivity(id);
  const h = hud({ back: true, title: it.title });
  root.appendChild(h);
  const stage = el('<div class="stage"></div>');
  root.appendChild(stage);
  let cleanups = [];
  window.__bubbles?.setFocus?.(true); // K2: calm background while reading questions
  const cleanup = () => { window.__bubbles?.setFocus?.(false); cleanups.forEach((f) => f()); cleanups = []; h.__cleanup?.(); document.querySelector('.feedback')?.remove(); document.body.classList.remove('has-feedback'); };

  hearts.regen();
  if (!activity.practice && hearts.count <= 0) { await noHearts(); if (hearts.count <= 0) { router.go(`/subject/${it.subject}`, true); return cleanup; } }

  intro();
  return cleanup;

  /* ---------- intro ---------- */
  function intro() {
    const st = store.profile.activities[id];
    stage.innerHTML = '';
    stage.appendChild(el(`<div class="card q-card">
      <div class="float" style="display:grid;place-items:center">${ico3d(it.icon, 84)}</div>
      <h1 class="mt-3">${esc(it.title)}</h1>
      <p class="muted">${esc(it.desc || '')}</p>
      ${activity.intro ? `<p class="mt-3" style="line-height:1.8">${esc(activity.intro)}</p>` : ''}
      <div class="row mt-4" style="justify-content:center;gap:14px;flex-wrap:wrap">
        <span class="tag tag-gold">+${fmt(it.xp || 20)} XP</span>
        ${activity.practice ? '<span class="tag tag-green">تدريب بدون قلوب</span>' : '<span class="tag tag-rose">' + ico3d('heart') + ' الخطأ يكلّف قلباً</span>'}
        ${st ? `<span class="row" style="gap:6px">${crown(st.mastery)}<span class="small muted">أفضل ${fmt(st.best)}٪</span></span>` : ''}
      </div>
      <button class="btn btn-primary btn-lg btn-block mt-6" data-act="start">${ico('play')} ابدأ!</button>
    </div>`));
    stage.querySelector('[data-act="start"]').onclick = () => { sound.play('whoosh'); start(); };
  }

  /* ---------- run ---------- */
  function start() {
    const s = new Session(activity);
    sound.resetCombo();
    if (!s.total) { toast('لا توجد أسئلة في هذا النشاط', { type: 'error' }); return; }
    ask(s);
  }

  function ask(s) {
    const q = s.current;
    stage.innerHTML = '';
    const head = el(`<div class="play-head"><span class="small muted">${fmt(s.i + 1)}/${fmt(s.total)}</span><div class="level-bar green"><span style="width:${s.progress}%"></span></div><button class="btn btn-icon btn-ghost" data-act="quit" aria-label="خروج">${ico('x')}</button></div>`);
    head.querySelector('[data-act="quit"]').onclick = async () => { if (await modal({ title: 'تخرج الآن؟', body: '<p class="muted">هتاخد نص النقاط بس على اللي جاوبته.</p>', actions: [{ label: 'أكمل اللعب', cls: 'btn-primary', value: false }, { label: 'خروج', cls: 'btn-ghost', value: true }] })) { finish(s, true); } };
    stage.appendChild(head);
    const card = el('<div class="card q-card"></div>');
    stage.appendChild(card);
    requestAnimationFrame(() => { card.animate([{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' }); });
    const r = renderers[q.type] || renderers.quiz;
    let answered = false;
    const ctx = {
      font: activity.font,
      onCleanup: (f) => cleanups.push(f),
      done(ok, meta) {
        if (answered) return; answered = true;
        s.answer(ok, meta);
        const pt = meta.point || { x: innerWidth / 2, y: innerHeight * 0.45 };
        if (ok) {
          sound.play('correct');
          const perQ = Math.max(1, Math.round((it.xp || 20) / s.total));
          fx.celebrate({ x: pt.x, y: pt.y, xp: perQ, combo: sound.combo, el: meta.card });
        } else {
          sound.play('wrong');
          fx.encourage({ x: pt.x, y: pt.y, el: meta.card });
        }
        feedback(s, ok, q);
      },
    };
    if (q.speak && sound.enabled) setTimeout(() => sound.speak(q.speak), 200);
    r(card, q, ctx);
  }

  function feedback(s, ok, q) {
    document.querySelector('.feedback')?.remove();
    const outHearts = s.outOfHearts;
    const f = el(`<div class="feedback ${ok ? 'good' : 'bad'}">
      <div class="container row">
        <div class="grow">
          <div class="f-title">${ok ? CHEERS[Math.floor(Math.random() * CHEERS.length)] : OOPS[Math.floor(Math.random() * OOPS.length)]}</div>
          ${q.explain ? `<div class="f-exp">${esc(q.explain)}</div>` : ''}
          ${outHearts ? '<div class="f-exp" style="color:var(--neon-rose)">' + ico3d('heartBroken') + ' خلصت القلوب!</div>' : ''}
        </div>
        <button class="btn ${ok ? 'btn-primary' : 'btn-rose'} btn-lg" data-act="next">${s.i + 1 < s.total && !outHearts ? 'التالي' : 'النتيجة'} ${ico('fwd')}</button>
      </div></div>`);
    document.body.appendChild(f); document.body.classList.add('has-feedback');
    const go = () => { f.remove(); document.body.classList.remove('has-feedback'); if (outHearts) return finish(s, true); if (s.next()) ask(s); else finish(s); };
    f.querySelector('[data-act="next"]').onclick = go;
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { window.removeEventListener('keydown', onKey); go(); } };
    setTimeout(() => window.addEventListener('keydown', onKey), 300);
    cleanups.push(() => window.removeEventListener('keydown', onKey));
  }

  /* ---------- results ---------- */
  function finish(s, aborted = false) {
    document.querySelector('.feedback')?.remove(); document.body.classList.remove('has-feedback');
    const r = s.finish(aborted);
    const emoji = r.perfect ? ico3d('trophy') : r.score >= 80 ? ico3d('star') : r.score >= 50 ? ico3d('thumb') : ico3d('muscle');
    if (r.perfect) { confetti({ count: 220 }); sound.play('fanfare'); fx.celebrate({ big: true, xp: r.xp, combo: 1 }); setTimeout(() => window.__bubbles?.celebrate(innerWidth * 0.25, innerHeight * 0.35, 2), 350); setTimeout(() => window.__bubbles?.celebrate(innerWidth * 0.75, innerHeight * 0.35, 2), 700); } else if (r.score >= 80) { confetti({ count: 100 }); sound.play('cheer'); fx.celebrate({ xp: r.xp, combo: 2 }); } else if (r.score >= 50) { sound.play('streak'); fx.floater('شغل حلو! ' + ico3d('thumb')); } else { sound.play('encourage'); }
    stage.innerHTML = '';
    stage.appendChild(el(`<div class="card q-card">
      <div class="result-big">${emoji}</div>
      <h1>${r.perfect ? 'إجابات كاملة!' : r.score >= 80 ? 'أداء رائع!' : r.score >= 50 ? 'شغل حلو!' : aborted ? 'نكمّل المرة الجاية' : 'محتاج تدريب أكثر'}</h1>
      <p class="muted">${esc(it.title)}</p>
      <div class="stats">
        <div class="stat"><b style="color:var(--neon-green)">${fmt(r.correct)}</b><span>صحيح</span></div>
        <div class="stat"><b style="color:var(--neon-rose)">${fmt(r.wrong)}</b><span>خطأ</span></div>
        <div class="stat"><b>${fmt(r.score)}٪</b><span>النتيجة</span></div>
        <div class="stat"><b style="color:var(--neon-gold)">+${fmt(r.xp)}</b><span>XP</span></div>
        <div class="stat"><b>${fmt(Math.floor(r.secs / 60))}:${String(r.secs % 60).padStart(2, '0')}</b><span>الوقت</span></div>
        <div class="stat"><b>${crown(r.mastery)}</b><span>الإتقان ${r.mastery > r.masteryBefore ? ico3d('arrowUp') : r.mastery < r.masteryBefore ? ico3d('arrowDown') : ''}</span></div>
      </div>
      ${r.streakUp ? '<p class="tag tag-gold" style="display:inline-block">' + ico3d('flame') + ' شعلة اليوم اشتعلت!</p>' : ''}
      ${r.certificate ? `<a href="#/certificate/${r.certificate.id}" class="card clickable tile glow-gold mt-3" style="text-align:start"><div class="icon-box">${ico3d('gradCap')}</div><div class="grow"><h3>شهادة إتقان جديدة!</h3><p>اضغط لعرضها وطباعتها</p></div><span class="chev">${ico('chevronL')}</span></a>` : ''}
      ${r.newBadges.length ? `<div class="row wrap mt-3" style="justify-content:center">${r.newBadges.map((b) => `<span class="tag tag-gold" style="font-size:13px;padding:6px 12px;gap:6px">${badgeSVG(b.id, b.tier, { size: 26 })} ${esc(b.name)}</span>`).join('')}</div>` : ''}
      <div class="row mt-6" style="gap:10px">
        <button class="btn btn-primary btn-lg grow" data-act="again">${ico('refresh')} مرة أخرى</button>
        <a href="#/subject/${it.subject}" class="btn btn-lg grow">${ico('home')} المادة</a>
      </div>
    </div>`));
    stage.querySelector('[data-act="again"]').onclick = () => { sound.play('whoosh'); hearts.regen(); if (!activity.practice && hearts.count <= 0) noHearts().then(() => hearts.count > 0 && start()); else start(); };
  }

  async function noHearts() {
    const p = store.profile; const ms = hearts.nextIn(); const mins = Math.ceil(ms / 60000);
    await modal({
      title: ico3d('heartBroken') + ' خلصت القلوب!',
      body: `<p class="muted">القلب الجاي يرجع بعد <b>${fmt(mins)}</b> دقيقة.<br>عندك <b>${fmt(p.gems)} ${ico3d('gem')}</b> — تقدر تملأ القلوب بـ 20 جوهرة، أو تفرقع فقاعات وتستنى ${ico3d('smile')}</p>`,
      actions: [
        { label: 'املأ القلوب (20 ' + ico3d('gem') + ')', cls: 'btn-primary', icon: 'heart', onClick: () => { if (!hearts.refill(20)) { toast('جواهر غير كافية ' + ico3d('gem'), { type: 'error' }); return false; } toast(ico3d('heart') + ' رجعت القلوب!', { type: 'success' }); } },
        { label: 'رجوع', cls: 'btn-ghost' },
      ],
    });
  }
}
