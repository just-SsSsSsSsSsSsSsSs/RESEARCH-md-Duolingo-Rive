/**
 * Certificate — ornate printable certificate (A4 landscape via @page), share/print buttons.
 * Route: #/certificate/:id  (id from profile.certificates)
 */
import store from '../../core/store.js';
import registry from '../../core/registry.js';
import sound from '../../engines/sound.js';
import { levelInfo } from '../../engines/xp.js';
import { el, fmt, esc, toast, confetti } from '../components.js';
import { ico } from '../icons.js';

const CSS = `
.cert-wrap{max-width:900px;margin:0 auto}
.cert{position:relative;background:#fffdf5;color:#1f2937;border-radius:18px;padding:34px 28px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden;font-family:'Tajawal',sans-serif;aspect-ratio:1.414;display:flex;flex-direction:column;justify-content:center}
.cert::before{content:'';position:absolute;inset:12px;border:3px double #c9962b;border-radius:12px;pointer-events:none}
.cert::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 10% 10%,rgba(201,150,43,.12),transparent 40%),radial-gradient(circle at 90% 90%,rgba(201,150,43,.12),transparent 40%),radial-gradient(circle at 50% 50%,rgba(201,150,43,.05),transparent 60%);pointer-events:none}
.cert .corner{position:absolute;width:64px;height:64px;color:#c9962b;opacity:.85}
.cert .corner.tl{top:18px;left:18px}.cert .corner.tr{top:18px;right:18px;transform:scaleX(-1)}.cert .corner.bl{bottom:18px;left:18px;transform:scaleY(-1)}.cert .corner.br{bottom:18px;right:18px;transform:scale(-1)}
.cert .seal{position:absolute;bottom:34px;left:44px;width:92px;height:92px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe08a,#c9962b 60%,#8a5f10);box-shadow:0 6px 18px rgba(0,0,0,.25),inset 0 0 0 4px rgba(255,255,255,.35);display:grid;place-items:center;font-size:40px;color:#fff}
.cert .ribbon{position:absolute;top:0;right:60px;width:46px;height:120px;background:linear-gradient(#e11d48,#be123c);clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%);box-shadow:0 6px 16px rgba(0,0,0,.25)}
.cert .ribbon::after{content:'★';position:absolute;top:28px;left:0;right:0;text-align:center;color:#ffe08a;font-size:22px}
.cert h1{font-family:'Changa','Tajawal',sans-serif;font-size:42px;color:#8a5f10;letter-spacing:1px;margin:0;text-align:center}
.cert .sub{text-align:center;color:#6b7280;font-size:15px;margin-top:2px}
.cert .name{font-family:'Changa','Tajawal',sans-serif;font-size:52px;color:#b45309;text-align:center;margin:18px 0 6px;text-shadow:0 2px 0 rgba(255,255,255,.7)}
.cert .line{width:60%;height:3px;margin:0 auto 14px;background:linear-gradient(90deg,transparent,#c9962b,transparent)}
.cert .text{text-align:center;font-size:19px;line-height:1.9;color:#374151;max-width:640px;margin:0 auto}
.cert .text b{color:#1f2937}
.cert .meta{display:flex;justify-content:space-around;margin-top:24px;flex-wrap:wrap;gap:10px}
.cert .meta div{text-align:center;min-width:120px}
.cert .meta small{display:block;color:#6b7280;font-size:12px}
.cert .meta b{font-size:16px;color:#1f2937}
.cert .sig{margin-top:22px;display:flex;justify-content:space-between;padding:0 60px;font-size:13px;color:#6b7280}
.cert .sig div{text-align:center;border-top:1.5px solid #c9962b;padding-top:6px;min-width:150px}
.cert .stars{text-align:center;font-size:26px;letter-spacing:6px;color:#f59e0b;margin-top:6px}
@media (max-width:640px){.cert{aspect-ratio:auto;padding:28px 14px}.cert h1{font-size:30px}.cert .name{font-size:38px}.cert .text{font-size:16px}.cert .seal{width:64px;height:64px;font-size:28px;bottom:14px;left:14px}.cert .sig{padding:0 10px}}
@media print{@page{size:A4 landscape;margin:8mm}html,body{background:#fff!important}#app{padding:0!important}.cert-wrap{max-width:none}.cert{box-shadow:none;border-radius:0;aspect-ratio:auto;min-height:92vh;page-break-inside:avoid}.cert-actions{display:none!important}}
`;
const CORNER = `<svg class="corner" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 60V20C4 11 11 4 20 4h40"/><path d="M12 60V24c0-7 5-12 12-12h36"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg>`;

export async function render(root, { id, parent }) {
  const p = store.profile;
  const c = p.certificates.find((x) => x.id === id);
  if (!c) throw new Error('الشهادة غير موجودة');
  const it = registry.item(c.activityId) || {};
  const subj = registry.subject(c.subject) || {};
  const li = levelInfo(c.xp);
  if (!document.getElementById('cert-css')) { const st = document.createElement('style'); st.id = 'cert-css'; st.textContent = CSS; document.head.appendChild(st); }
  setTimeout(() => { confetti({ count: 120 }); sound.play('fanfare'); }, 300);

  root.appendChild(el(`<div class="cert-wrap">
    <div class="topbar cert-actions no-print"><a href="#/${parent ? 'parent' : 'profile'}" class="btn btn-icon btn-ghost" aria-label="رجوع">${ico('back')}</a><b class="grow">🎓 شهادة إتقان</b>
      <button class="btn btn-gold" data-act="print">${ico('printer')} طباعة / PDF</button>
      ${navigator.share ? `<button class="btn" data-act="share">مشاركة</button>` : ''}
    </div>
    <div class="cert" id="cert">
      ${CORNER.replace('corner', 'corner tl')}${CORNER.replace('corner', 'corner tr')}${CORNER.replace('corner', 'corner bl')}${CORNER.replace('corner', 'corner br')}
      <div class="ribbon"></div>
      <h1>شهادة تقدير وإتقان</h1>
      <div class="sub">منصة أبطال البيت التعليمية</div>
      <div class="stars">★ ★ ★ ★ ★</div>
      <div class="name">${esc(c.name || p.name)} ${p.emoji}</div>
      <div class="line"></div>
      <p class="text">تشهد منصة <b>أبطال البيت</b> بأن البطل/البطلة <b>${esc(c.name || p.name)}</b> قد أتقن(ت) نشاط <b>«${esc(c.title)}»</b> في مادة <b>${esc(subj.title || '')}</b> ${subj.icon || ''} وحصل(ت) على التيجان الخمسة الكاملة 👑👑👑👑👑 بعد جهد ومثابرة يستحقان كل التقدير.</p>
      <div class="meta">
        <div><small>التاريخ</small><b>${new Date(c.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</b></div>
        <div><small>المستوى عند الإتقان</small><b>مستوى ${fmt(li.level)} — ${esc(li.title)}</b></div>
        <div><small>نقاط الخبرة</small><b>${fmt(c.xp)} XP</b></div>
        <div><small>رقم الشهادة</small><b style="font-family:monospace;font-size:13px">${esc(c.id.toUpperCase())}</b></div>
      </div>
      <div class="sig"><div>ولي الأمر</div><div>منصة أبطال البيت</div></div>
      <div class="seal">${it.icon || '🏅'}</div>
    </div>
    <p class="center small muted mt-4 no-print">💡 للحفظ كـ PDF: اضغط طباعة ثم اختر «حفظ كـ PDF» — الاتجاه الأفقي (Landscape) هو الأفضل.</p>
  </div>`));
  root.querySelector('[data-act="print"]').onclick = () => { sound.play('tap'); window.print(); };
  root.querySelector('[data-act="share"]')?.addEventListener('click', async () => { try { await navigator.share({ title: 'شهادة إتقان', text: `${c.name || p.name} أتقن(ت) «${c.title}» على منصة أبطال البيت 🎓👑` }); } catch { /* cancelled */ } });
  return () => {};
}
