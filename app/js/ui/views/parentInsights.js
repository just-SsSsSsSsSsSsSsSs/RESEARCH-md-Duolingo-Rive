/**
 * Parent Dashboard - "نقاط الضعف والسلوك" report (Phase 10, feature 3). Parent-only; the child never sees these labels.
 * renderInsights(body, { hero, p }) appends:
 *   - summary strip (attempts / accuracy / explanations / days)
 *   - top-3 weakest skills with error pattern + trend + "what is being done"
 *   - behaviour profile (plain Arabic, no jargon)
 *   - recommendations for home
 *   - impact (before/after per skill)
 *   - stumbled questions with "إزاي أشرحها لابني؟" -> parent script modal
 */
import { analyze } from '../../engines/insights.js';
import { parentScript } from '../../engines/explain.js';
import { el, fmt, esc, modal } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';

const pct = (r) => fmt(Math.round(r * 100)) + '٪';
const trendIcon = (t) => (t > 0.1 ? `<span class="tag tag-green">${ico3d('arrowUp', 14)} بيتحسن</span>` : t < -0.1 ? `<span class="tag tag-rose">${ico3d('arrowDown', 14)} بيتراجع</span>` : '<span class="tag">ثابت</span>');
const dots = (recent) => `<span class="recent-dots">${recent.map((ok) => `<i class="${ok ? 'ok' : 'ko'}"></i>`).join('')}</span>`;

/** reconstruct a question-like object for the explainer from a telemetry event key */
function qFromEvent(e) {
  const AR = (n) => new Intl.NumberFormat('ar-EG').format(n); const k = e.key || '';
  let m;
  if ((m = /^(\d+)x(\d+)$/.exec(k))) return { q: `${AR(m[1])} × ${AR(m[2])} = ؟`, meta: { kind: 'mult', a: +m[1], b: +m[2], ans: m[1] * m[2] } };
  if ((m = /^m(\d+)x(\d+)$/.exec(k))) return { q: `${AR(m[1])} × ؟ = ${AR(m[1] * m[2])}`, meta: { kind: 'missing', a: +m[1], b: +m[2], ans: +m[2], product: m[1] * m[2] } };
  if ((m = /^g(\d+)x(\d+)$/.exec(k))) return { q: `شبكة ${AR(m[1])} × ${AR(m[2])}`, meta: { kind: 'grid', a: +m[1], b: +m[2], ans: m[1] * m[2] } };
  if ((m = /^c(\d)(\d)$/.exec(k))) return { q: `${AR(m[1])} × ${AR(m[2])} = ${AR(m[2])} × ؟`, meta: { kind: 'commutative', a: +m[1], b: +m[2], ans: +m[1] } };
  if ((m = /^d(\d)(\d+)(\d)$/.exec(k))) { const a = +m[1], b = +m[2], s1 = +m[3]; return { q: `${AR(a)} × ${AR(b)} = (${AR(a)} × ${AR(s1)}) + (${AR(a)} × ؟)`, meta: { kind: 'distributive', a, b, s1, s2: b - s1, ans: b - s1 } }; }
  return { q: e.skill || k, meta: null };
}

export function renderInsights(body, { hero, p }) {
  const a = analyze(p);
  body.appendChild(el(`<div class="section"><h2>${ico3d('brain')} نقاط الضعف والسلوك التعليمي</h2><span class="tag tag-purple">${fmt(a.totals.attempts)} إجابة • ${fmt(a.totals.days)} يوم</span></div>`));
  if (a.totals.attempts < 8) { body.appendChild(el(`<div class="card center muted">${ico3d('turtle', 26)} لسه البيانات قليلة. بعد ${fmt(8 - a.totals.attempts)} إجابات هيبدأ التحليل يظهر هنا تلقائيًا.</div>`)); return; }

  const acc = a.totals.attempts ? a.totals.correct / a.totals.attempts : 0;
  body.appendChild(el(`<div class="card"><div class="stats" style="grid-template-columns:repeat(4,1fr);margin-bottom:0">
    <div class="stat"><b>${pct(acc)}</b><span>الدقة</span></div><div class="stat"><b>${fmt(a.totals.explained)}</b><span>مرة طلب شرح</span></div><div class="stat"><b>${fmt(a.totals.stages)}</b><span>مرحلة مكتملة</span></div><div class="stat"><b>${fmt(a.skills.length)}</b><span>مهارة مُقاسة</span></div></div></div>`));

  /* weakest 3 */
  body.appendChild(el(`<div class="section"><h2>${ico3d('target')} أضعف ٣ مهارات</h2></div>`));
  if (!a.weakest.length) body.appendChild(el(`<div class="card center muted">${ico3d('trophy', 24)} لا توجد مهارة تحت ٨٠٪ حاليًا — ممتاز!</div>`));
  else {
    const w = el('<div class="card stack" data-weakest></div>');
    a.weakest.forEach((s, i) => {
      const pat = a.patterns.find((pt) => pt.example?.skill === s.skill && pt.id !== 'other');
      w.appendChild(el(`<div class="weak-row"><div class="row between"><b>${fmt(i + 1)}. ${esc(s.skill)}</b>${trendIcon(s.trend)}</div>
        <div class="level-bar" style="height:10px;margin:6px 0"><span style="width:${Math.round(s.rate * 100)}%;background:${s.rate < 0.5 ? 'var(--neon-rose)' : 'var(--neon-gold)'}"></span></div>
        <div class="row between small muted"><span>${pct(s.rate)} صح من ${fmt(s.n)} • متوسط ${fmt(Math.round(s.avgMs / 1000))} ث • ثقة ${pct(s.confidence)}</span>${dots(s.recent)}</div>
        ${pat ? `<div class="small mt-2"><b>ليه؟</b> ${esc(pat.label)} — ${esc(pat.why)}</div>` : ''}
        <div class="small mt-2" style="color:var(--neon-cyan)"><b>إيه اللي بيتعمل:</b> تدريب مخصص على الرئيسية يبدأ أسهل ويتدرّج، وشرح «يعني إيه يا بابا؟» بالأسلوب الأنفع له.</div></div>`));
    });
    body.appendChild(w);
  }
  if (a.strengths.length) body.appendChild(el(`<div class="card row wrap" style="gap:6px"><b class="small">${ico3d('star', 18)} نقاط قوة:</b>${a.strengths.map((s) => `<span class="tag tag-green">${esc(s.skill)} ${pct(s.rate)}</span>`).join('')}</div>`));

  /* behaviour */
  const b = a.behaviour; const rows = [];
  rows.push(['سرعة الإجابة', b.impulsive ? 'بيتسرّع أحيانًا (إجابات غلط في أقل من ثانية ونص)' : 'متأنٍّ — بياخد وقته قبل ما يجاوب']);
  rows.push(['المثابرة', b.perseverance >= 0.8 ? 'بيكمّل المرحلة للآخر في أغلب الأحيان' : 'بيخرج قبل النهاية أحيانًا — يحتاج تشجيع في النص']);
  rows.push(['التعب', b.fatigueAfterMin ? `الدقة بتقل بعد ${fmt(b.fatigueAfterMin)} دقايق` : 'مفيش علامات تعب واضحة في الجلسات']);
  rows.push(['الإحباط', b.frustration ? `خرج ${fmt(b.frustration)} مرات بعد كام غلطة ورا بعض` : 'مفيش خروج بعد سلسلة أخطاء']);
  if (b.bestStrategy) rows.push(['أنفع طريقة شرح', ({ readaloud: 'اقرأهالك (سمعي)', story: 'حدوتة (تخيّل)', reallife: 'من حياتك (عملي)', steps: 'خطوة خطوة (تحليلي)' })[b.bestStrategy.strategy]]);
  if (b.bestHour) rows.push(['أفضل وقت', ({ morning: 'الصبح', afternoon: 'بعد الظهر', evening: 'بالليل' })[b.bestHour.bucket] + ` (${pct(b.bestHour.rate)})`]);
  if (b.sessionLenMin) rows.push(['طول الجلسة', `${fmt(b.sessionLenMin)} دقيقة في المتوسط`]);
  body.appendChild(el(`<div class="section"><h2>${ico3d('smile')} شخصيته في التعلّم</h2></div>`));
  body.appendChild(el(`<div class="card"><table class="table"><tbody>${rows.map(([k, v]) => `<tr><td class="muted" style="white-space:nowrap">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table><p class="small muted mt-2">${ico('lock')} التحليل ده للأب فقط — الطفل بيشوف تشجيع وتحديات بس.</p></div>`));

  /* recommendations */
  if (a.recommendations.length) {
    body.appendChild(el(`<div class="section"><h2>${ico3d('bulb')} توصيات للبيت</h2></div>`));
    const r = el('<div class="card stack" data-recs></div>');
    a.recommendations.forEach((rc) => r.appendChild(el(`<div class="rec"><b>${esc(rc.title)}</b><div class="small muted">${esc(rc.why)}</div><div class="small mt-1">${ico3d('hand', 16)} ${esc(rc.action)}</div></div>`)));
    body.appendChild(r);
  }

  /* impact */
  if (a.impact.length) {
    body.appendChild(el(`<div class="section"><h2>${ico3d('flame')} الأثر — قبل / بعد</h2></div>`));
    body.appendChild(el(`<div class="card" style="overflow:auto"><table class="table"><thead><tr><th>المهارة</th><th>أول نص</th><th>تاني نص</th><th>الفرق</th></tr></thead><tbody>${a.impact.slice(0, 6).map((x) => `<tr><td>${esc(x.skill)}</td><td>${fmt(x.before)}٪</td><td>${fmt(x.after)}٪</td><td style="color:${x.delta > 0 ? 'var(--neon-green)' : x.delta < 0 ? 'var(--neon-rose)' : 'inherit'}">${x.delta > 0 ? '+' : ''}${fmt(x.delta)}</td></tr>`).join('')}</tbody></table></div>`));
  }

  /* stumbled questions -> parent script */
  const wrongs = (p.events || []).filter((e) => e.type === 'question_attempted' && !e.correct).slice(-30).reverse();
  const seen = new Set(); const uniq = wrongs.filter((e) => { const k = e.key || e.skill; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
  if (uniq.length) {
    body.appendChild(el(`<div class="section"><h2>${ico3d('family')} أسئلة اتعثّر فيها — إزاي أشرحها لابني؟</h2></div>`));
    const c = el('<div class="card stack" data-stumbled></div>');
    uniq.forEach((e) => {
      const q = qFromEvent(e);
      const row = el(`<div class="row between"><div><b>${esc(q.q)}</b><div class="small muted">${esc(e.skill || '')}${e.wrong_value ? ` • جاوب: ${esc(e.wrong_value)}` : ''}${e.expected ? ` • الصح: ${esc(e.expected)}` : ''}</div></div><button type="button" class="btn btn-sm btn-cyan" data-act="script">${ico3d('speechBubble', 18)} إزاي أشرحها لابني؟</button></div>`);
      row.querySelector('[data-act="script"]').onclick = () => {
        const parts = parentScript(q);
        modal({ title: `إزاي أشرح: ${q.q}`, body: `<div class="stack parent-script">${parts.map((s) => `<div><b style="color:var(--neon-cyan)">${esc(s.h)}</b><p style="white-space:pre-line;line-height:1.9;margin:4px 0 0">${esc(s.t)}</p></div>`).join('')}</div>`, actions: [{ label: 'تمام', cls: 'btn-primary', value: true }] });
      };
      c.appendChild(row);
    });
    body.appendChild(c);
  }
}

export default renderInsights;
