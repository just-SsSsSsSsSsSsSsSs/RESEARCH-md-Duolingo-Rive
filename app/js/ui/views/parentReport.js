/**
 * Parent Weekly Report - UI section (Phase 20 M3). Rendered ONLY inside the PIN-gated parent dashboard.
 *  renderReportCard(body, { hero })  -> one child's weekly report card (headline, deltas, best slot, skills,
 *                                       conversation starters, next focus, 8-week mini trend) + print / share.
 *  renderFamilySummary(root)         -> the family together for the week (no ranking).
 * Opening the dashboard marks this week's report as seen (clears the nav dot). Nothing leaves the device
 * unless the parent presses share.
 */
import reportEngine from '../../engines/report.js';
import { CATEGORIES } from '../../engines/family.js';
import { el, fmt, esc, toast } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';

const KIND = {
  improved: { tag: 'tag-green', icon: 'arrowUp', label: 'تقدم' },
  steady: { tag: 'tag-cyan', icon: 'check', label: 'ثابت' },
  dipped: { tag: 'tag-gold', icon: 'arrowDown', label: 'اسبوع اهدى' },
  first: { tag: 'tag-purple', icon: 'sparkle', label: 'اول اسبوع' },
  quiet: { tag: '', icon: 'moon', label: 'اسبوع هادي' },
};
const delta = (d, unit = '') => d > 0 ? `<span class="rp-d up">${ico3d('arrowUp', 12)} ${fmt(d)}${unit}</span>` : d < 0 ? `<span class="rp-d down">${ico3d('arrowDown', 12)} ${fmt(-d)}${unit}</span>` : '<span class="rp-d same">زي ما هو</span>';
const stat = (label, v, d, unit = '') => `<div class="rp-stat"><b>${fmt(v)}${unit}</b><span>${label}</span>${delta(d, unit)}</div>`;

function trend(hist, hex) {
  if (hist.length < 2) return `<p class="small muted">الاتجاه بيظهر من الاسبوع الجاي (محفوظ ${fmt(hist.length)} اسبوع محلياً)</p>`;
  const max = Math.max(1, ...hist.map((s) => s.c));
  return `<div class="rp-trend" role="img" aria-label="اجابات صحيحة في اخر ${fmt(hist.length)} اسابيع">${hist.map((s) => `<i style="height:${Math.max(6, Math.round((s.c / max) * 100))}%;background:${hex}" title="${s.w}: ${fmt(s.c)}"></i>`).join('')}</div>`;
}

async function share(text, title) {
  try { if (navigator.share) { await navigator.share({ title, text }); return 'shared'; } } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'failed'; }
}

export function renderReportCard(body, { hero }) {
  const r = reportEngine.report(hero.id); if (!r) return;
  reportEngine.archiveWeek(); reportEngine.markSeen();
  const hist = reportEngine.history(hero.id).slice(-8);
  const k = KIND[r.headline.kind] || KIND.steady;
  body.appendChild(el(`<div class="section"><h2>${ico3d('note')} تقرير الاسبوع</h2><span class="tag ${k.tag}">${ico3d(k.icon, 14)} ${k.label}</span></div>`));
  const card = el(`<article class="card stack rp-card" data-report="${esc(hero.id)}" data-kind="${esc(r.headline.kind)}" style="--hero:${esc(hero.hex)}">
    <p class="rp-headline">${esc(r.headline.text)}</p>
    <div class="rp-stats">
      ${stat('اجابة صحيحة', r.week.correct, r.deltas.correct)}
      ${stat('دقيقة', r.week.minutes, r.deltas.minutes)}
      ${stat('يوم نشط', r.week.activeDays, r.deltas.activeDays)}
      ${stat('دقة', r.week.accuracy, r.deltas.accuracy, '٪')}
    </div>
    <div class="rp-facts">
      ${r.week.recovered ? `<div class="row small">${ico3d('refresh', 18)}<span>صحّح <b>${fmt(r.week.recovered)}</b> غلطة بنفسه من غير ما نقول له الجواب</span></div>` : ''}
      ${r.slot ? `<div class="row small">${ico3d('clock', 18)}<span>احسن وقت له: <b>${esc(r.slot.name)}</b> (دقة ${fmt(r.slot.rate)}٪ في ${fmt(r.slot.n)} سؤال)</span></div>` : ''}
      ${r.strong ? `<div class="row small">${ico3d('star', 18)}<span>نقطة قوة الاسبوع: <b>${esc(r.strong.skill)}</b> (${fmt(r.strong.correct)}/${fmt(r.strong.n)})</span></div>` : ''}
      ${r.weak ? `<div class="row small rp-weak">${ico3d('target', 18)}<span>محتاج تركيز: <b>${esc(r.weak.skill)}</b> (${fmt(r.weak.correct)}/${fmt(r.weak.n)}) - ${esc(r.tip)}</span></div>` : ''}
      ${r.crowns.length ? `<div class="row small">${ico3d('crown', 18)}<span>تيجان لوحة العيلة: ${r.crowns.map((c) => esc(CATEGORIES.find((x) => x.id === c)?.name || c)).join('، ')}</span></div>` : ''}
    </div>
    ${r.starters.length ? `<div class="rp-starters"><h3>${ico3d('speechBubble', 18)} اسئلة على السفرة</h3><ol>${r.starters.map((s) => `<li data-starter="${esc(s.id)}">${esc(s.text)}</li>`).join('')}</ol></div>` : ''}
    <div class="row between small"><span class="muted">التركيز الجاي</span><b>${esc(r.nextFocus)}</b></div>
    <div class="rp-hist"><span class="small muted">اخر ${fmt(Math.max(1, hist.length))} اسابيع (محفوظ على الجهاز فقط)</span>${trend(hist, hero.hex)}</div>
    <div class="row wrap no-print">
      <button class="btn btn-cyan grow" data-act="rp-share">${ico('upload')} مشاركة نص التقرير</button>
      <button class="btn grow" data-act="rp-print">${ico('printer')} طباعة</button>
    </div>
  </article>`);
  card.querySelector('[data-act="rp-share"]').onclick = async () => {
    const res = await share(reportEngine.text(hero.id), `تقرير ${hero.name}`);
    const msg = { shared: 'تمت المشاركة', copied: 'تم نسخ التقرير كنص', cancelled: '', failed: 'المتصفح منع المشاركة' }[res];
    if (msg) toast(ico3d('box') + ' ' + msg, { type: res === 'failed' ? 'error' : 'success' });
  };
  card.querySelector('[data-act="rp-print"]').onclick = () => {
    if (document.body.dataset.print) return; // re-entrancy guard
    document.body.dataset.print = 'report'; card.classList.add('rp-printing');
    const done = () => { delete document.body.dataset.print; card.classList.remove('rp-printing'); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done); window.print();
  };
  body.appendChild(card);
  window.__report = { id: r.id, kind: r.headline.kind, headline: r.headline.text, deltas: r.deltas, slot: r.slot?.id || null, weak: r.weak?.skill || null, strong: r.strong?.skill || null, starters: r.starters.map((s) => s.id), hist: hist.length, weekStart: r.weekStart, text: reportEngine.text(hero.id) };
}

export function renderFamilySummary(root) {
  const s = reportEngine.summary(); if (!s.members.length) return;
  root.appendChild(el(`<div class="section"><h2>${ico3d('family')} العيلة الاسبوع ده</h2>${s.headline ? `<span class="tag tag-gold">${ico3d('crown', 14)} ${esc(s.headline.title)}</span>` : ''}</div>`));
  root.appendChild(el(`<div class="card stack rp-family" data-sec="family-summary">
    <p class="rp-headline">${esc(s.line)}</p>
    <div class="rp-members">${s.members.map((m) => `<div class="rp-member" style="--hero:${esc(m.hex)}"><b>${esc(m.name)}</b><span class="small">${fmt(m.correct)} صح / ${fmt(m.minutes)} د</span><span class="tag ${(KIND[m.kind] || KIND.steady).tag} small">${(KIND[m.kind] || KIND.steady).label}</span></div>`).join('')}</div>
    ${s.quest ? `<div class="row between small"><span class="muted">تحدي العيلة</span><b>${fmt(Math.min(s.quest.progress, s.quest.target))}/${fmt(s.quest.target)} ${s.quest.done ? '- اتحقق' : ''}</b></div>` : ''}
    ${s.leaders.length ? `<p class="small muted">تاج الاسبوع (${esc(s.headline?.name || '')}) مع: ${s.leaders.map(esc).join('، ')}</p>` : ''}
    <a class="btn btn-block btn-ghost" href="#/family">${ico('crown')} افتح لوحة شرف العيلة</a>
  </div>`));
  window.__reportSummary = { members: s.members.map((m) => m.id), quest: s.quest, line: s.line };
}
