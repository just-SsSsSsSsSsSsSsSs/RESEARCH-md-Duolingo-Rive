/**
 * PhaseRunner (Phase 9) — shared "phases -> feedback -> results" loop for rich activities (story, quran, ...).
 *
 *   runPhases({ stage, bar, activity, it, phases, questions, audio?, showHint, cheers, oops,
 *               stepIcon, stepLabel, resultTitles, resultIcons, onListen, onPersonal })
 *
 * Questions carry { type, phase, clip?, baladi?, explain?, font? } and are rendered with storyQuestions.Q.
 * Session handles scoring/XP/hearts/streak/badges/quests; this module handles UI, audio cues and party FX.
 */
import sound from '../../engines/sound.js';
import hearts from '../../engines/hearts.js';
import xp from '../../engines/xp.js';
import fx from '../../engines/fx.js';
import Session from '../../activities/session.js';
import { Q } from './storyQuestions.js';
import { badgeSVG } from '../badgeArt.js';
import { el, esc, fmt, modal, confetti, toast } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';
import { crown } from './subject.js';

export function runPhases(o) {
  const { stage, bar, activity, it, phases, questions, audio = null, cheers, oops, stepIcon = 'headphones', stepLabel = 'استمع' } = o;
  const showHint = () => (o.showHint ? o.showHint() : true);
  const act = { ...activity, questions, shuffle: false, count: questions.length };
  const cleanups = o.cleanups || [];
  if (hearts.count <= 0) { toast(ico3d('heartBroken') + ' القلوب خلصت — استرح قليلاً', { type: 'error' }); return null; }
  const s = new Session(act); sound.resetCombo(); ask(s);
  return s;

  function ask(s) {
    const q = s.current, ph = q.phase, phIdx = phases.indexOf(ph);
    const inPhase = s.questions.filter((x) => x.phase === ph), k = inPhase.indexOf(q) + 1;
    stage.innerHTML = ''; stage.appendChild(bar());
    stage.appendChild(el(`<div class="story-steps" style="grid-template-columns:repeat(${phases.length + 1},1fr)"><div class="st done">${ico3d(stepIcon)}${esc(stepLabel)}</div>${phases.map((p, i) => `<div class="st ${i < phIdx ? 'done' : i === phIdx ? 'now' : ''}">${ico3d(p.icon || 'check')}${esc(p.title.split(' ')[0])}</div>`).join('')}</div>`));
    const head = el(`<div class="play-head"><span class="small muted">${fmt(s.i + 1)}/${fmt(s.total)}</span><div class="level-bar green"><span style="width:${s.progress}%"></span></div><button class="btn btn-icon btn-ghost" data-act="quit" aria-label="خروج">${ico('x')}</button></div>`);
    head.querySelector('[data-act="quit"]').onclick = async () => { if (await modal({ title: 'تخرج الآن؟', body: '<p class="muted">هتاخد نص النقاط بس على اللي جاوبته.</p>', actions: [{ label: 'أكمل', cls: 'btn-primary', value: false }, { label: 'خروج', cls: 'btn-ghost', value: true }] })) finish(s, true); };
    stage.appendChild(head);
    const card = el(`<div class="card q-card"><div class="phase-head">${ico3d(ph.icon || 'check')}<h2>${esc(ph.title)}</h2><span class="small muted">${fmt(k)}/${fmt(inPhase.length)}</span></div></div>`);
    stage.appendChild(card);
    requestAnimationFrame(() => card.animate([{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' }));
    const hasClip = audio && q.clip && audio.url(q.clip);
    if (hasClip || q.baladi) {
      const qa = el(`<div class="q-audio">${hasClip ? `<button class="pbtn" data-act="qplay" aria-label="اسمع">${ico3d('speaker')}</button>` : ''}${q.baladi ? `<span class="hint-baladi ${showHint() ? '' : 'hidden'}">${esc(q.baladi)}</span>` : ''}</div>`);
      card.appendChild(qa);
      qa.querySelector('[data-act="qplay"]')?.addEventListener('click', () => { sound.play('tap'); audio.play(q.clip); });
      if (hasClip) setTimeout(() => audio.play(q.clip), 250);
    }
    let answered = false, last = null;
    card.addEventListener('pointerdown', (e) => { last = { x: e.clientX, y: e.clientY }; }, { passive: true, capture: true });
    const ctx = {
      font: q.font || activity.font, onCleanup: (f) => cleanups.push(f),
      done(ok, meta = {}) {
        if (answered) return; answered = true;
        audio?.stop(); s.answer(ok, meta);
        const r = card.getBoundingClientRect(), pt = last || { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        if (ok) { sound.play('correct'); fx.celebrate({ x: pt.x, y: pt.y, xp: Math.max(1, Math.round((it.xp || 100) / s.total)), combo: sound.combo, el: card }); o.onCorrect?.(); }
        else { sound.play('wrong'); fx.encourage({ x: pt.x, y: pt.y, el: card }); o.onWrong?.(); }
        feedback(s, ok, q);
      },
    };
    (Q[q.type] || Q.quiz)(card, q, ctx);
    if ((q.font || activity.font) === 'quran') {
      const paint = () => card.querySelectorAll('.q-text, .choice, .chip').forEach((x) => x.classList.add('quran'));
      paint(); const mo = new MutationObserver(paint); mo.observe(card, { childList: true, subtree: true }); cleanups.push(() => mo.disconnect());
    }
    o.afterRender?.(card, q);
  }

  function feedback(s, ok, q) {
    document.querySelector('.feedback')?.remove();
    const outHearts = s.outOfHearts;
    const last = s.i + 1 >= s.total || outHearts;
    const f = el(`<div class="feedback ${ok ? 'good' : 'bad'}"><div class="container row"><div class="grow">
      <div class="f-title">${ok ? cheers[Math.floor(Math.random() * cheers.length)] : oops[Math.floor(Math.random() * oops.length)]}</div>
      ${q.explain ? `<div class="f-exp ${(q.font || activity.font) === 'quran' && q.type !== 'quiz' ? 'quran' : ''}">${esc(q.explain)}</div>` : ''}
      ${outHearts ? '<div class="f-exp" style="color:var(--neon-rose)">' + ico3d('heartBroken') + ' خلصت القلوب!</div>' : ''}
    </div><button class="btn ${ok ? 'btn-primary' : 'btn-rose'} btn-lg" data-act="next">${!last ? 'التالي' : (o.onPersonal && !outHearts ? 'التعبير' : 'النتيجة')} ${ico('fwd')}</button></div></div>`);
    document.body.appendChild(f); document.body.classList.add('has-feedback');
    const go = () => { f.remove(); document.body.classList.remove('has-feedback'); if (outHearts) return finish(s, true); if (s.next()) ask(s); else if (o.onPersonal) o.onPersonal(s, () => finish(s)); else finish(s); };
    f.querySelector('[data-act="next"]').onclick = go;
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { window.removeEventListener('keydown', onKey); go(); } };
    setTimeout(() => window.addEventListener('keydown', onKey), 300); cleanups.push(() => window.removeEventListener('keydown', onKey));
  }

  function finish(s, aborted = false) {
    document.querySelector('.feedback')?.remove(); document.body.classList.remove('has-feedback'); audio?.stop();
    const r = s.finish(aborted);
    if (!aborted && r.score >= 50 && activity.rewards?.gemsOnComplete) xp.addGems(activity.rewards.gemsOnComplete, 'إكمال النشاط');
    const RI = o.resultIcons || ['trophy', 'star', 'thumb', 'muscle'];
    const RT = o.resultTitles || ['إجابات كاملة!', 'أداء رائع!', 'شغل حلو!', 'محتاج تدريب أكثر'];
    const tier = r.perfect ? 0 : r.score >= 80 ? 1 : r.score >= 50 ? 2 : 3;
    const B = window.__bubbles;
    if (tier === 0) { confetti({ count: 240 }); sound.play('fanfare'); fx.celebrate({ big: true, xp: r.xp, combo: 1 }); [0.2, 0.5, 0.8].forEach((px, i) => setTimeout(() => B?.party?.(innerWidth * px, innerHeight * 0.35, 3), 300 + i * 350)); }
    else if (tier === 1) { confetti({ count: 120 }); sound.play('cheer'); fx.celebrate({ xp: r.xp, combo: 2 }); setTimeout(() => B?.party?.(innerWidth / 2, innerHeight * 0.4, 2), 400); }
    else if (tier === 2) { sound.play('streak'); fx.celebrate({ xp: r.xp, combo: 1 }); } else sound.play('encourage');
    stage.innerHTML = ''; stage.appendChild(bar());
    stage.appendChild(el(`<div class="card q-card">
      <div class="result-big float">${ico3d(RI[tier])}</div>
      <h1>${aborted && tier === 3 ? 'نكمّل المرة الجاية' : RT[tier]}</h1>
      <p class="muted">${esc(o.subtitle ? o.subtitle() : it.title)}</p>
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
      <div class="row mt-6" style="gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg grow" data-act="again">${ico('refresh')} مرة أخرى</button>
        ${o.onListen ? `<button class="btn btn-lg" data-act="listen">${ico3d(o.listenIcon || 'headphones', 20)} ${esc(o.listenLabel || 'أعد الاستماع')}</button>` : ''}
        <a href="#/subject/${it.subject}" class="btn btn-lg" aria-label="المادة">${ico('home')}</a>
      </div></div>`));
    stage.querySelector('[data-act="again"]').onclick = () => { sound.play('whoosh'); hearts.regen(); runPhases(o); };
    stage.querySelector('[data-act="listen"]')?.addEventListener('click', () => { sound.play('whoosh'); o.onListen(); });
    o.onFinish?.(r);
  }
}
export default runPhases;
