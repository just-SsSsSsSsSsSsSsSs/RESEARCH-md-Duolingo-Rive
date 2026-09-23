/**
 * Story question renderers (Phase 7) — render(card, q, ctx) ; ctx.done(ok, meta) exactly once.
 *   truefalse · quiz · fillblank (complete the sentence) · order (story events with icons) · mindmap (6 bubbles)
 * All text goes through esc(); icons are trusted icons3d names.
 */
import { el, esc, fmt, shuffle } from '../components.js';
import sound from '../../engines/sound.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';

const lock = (c) => c.querySelectorAll('button:not(.pbtn):not(.explain-btn)').forEach((b) => (b.disabled = true)); // explain button stays usable after a miss
/** Phase 12 L4: may the correct answer be revealed after a miss? The view says no while a retry is available (only the mistake position is highlighted). */
const reveal = (ctx) => !ctx.reveal || ctx.reveal() !== false;
const reorder = (q) => { const idx = shuffle(q.choices.map((_, i) => i)); return { choices: idx.map((i) => q.choices[i]), answer: idx.indexOf(q.answer) }; };

export const Q = {
  truefalse(c, q, ctx) {
    c.appendChild(el(`<div class="q-text">${esc(q.q)}</div>`));
    const grid = el('<div class="choices"></div>');
    [[true, ico3d('check') + ' صحيح'], [false, ico3d('cross') + ' خطأ']].forEach(([v, label]) => {
      const b = el(`<button class="choice" data-v="${v}">${label}</button>`);
      b.onclick = () => { lock(c); const ok = v === q.answer; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok && reveal(ctx)) [...grid.children].find((x) => x !== b)?.classList.add('correct'); ctx.done(ok, { picked: v }); };
      grid.appendChild(b);
    });
    c.appendChild(grid);
  },

  quiz(c, q0, ctx) {
    const { choices, answer } = reorder(q0);
    c.appendChild(el(`<div class="q-text">${esc(q0.q)}</div>`));
    const grid = el('<div class="choices"></div>');
    choices.forEach((ch, i) => {
      const b = el(`<button class="choice">${esc(ch)}</button>`);
      b.onclick = () => { lock(c); const ok = i === answer; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok && reveal(ctx)) grid.children[answer]?.classList.add('correct'); if (ok || reveal(ctx)) [...grid.children].forEach((x, k) => k !== i && k !== answer && x.classList.add('dim')); ctx.done(ok, { picked: i }); };
      grid.appendChild(b);
    });
    c.appendChild(grid);
  },

  fillblank(c, q0, ctx) {
    const { choices, answer } = reorder(q0);
    const parts = q0.q.split('___');
    const txt = el(`<div class="q-text">${parts.map((p, i) => esc(p) + (i < parts.length - 1 ? '<span class="blank">…</span>' : '')).join('')}</div>`);
    c.appendChild(txt);
    const grid = el('<div class="choices"></div>');
    choices.forEach((ch, i) => {
      const b = el(`<button class="choice">${esc(ch)}</button>`);
      b.onclick = () => { lock(c); const ok = i === answer; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok && reveal(ctx)) grid.children[answer]?.classList.add('correct'); const bl = txt.querySelector('.blank'); if (ok || reveal(ctx)) { bl.textContent = choices[answer]; bl.style.color = ok ? 'var(--neon-green)' : 'var(--neon-rose)'; } else { bl.style.color = '#ff9f1c'; } ctx.done(ok, { picked: i }); };
      grid.appendChild(b);
    });
    c.appendChild(grid);
  },

  order(c, q, ctx) {
    c.appendChild(el(`<div class="q-text">${esc(q.prompt || 'رتّب بالترتيب الصحيح')}</div>`));
    const slots = el('<div class="order-slots" aria-label="ترتيبك"></div>'), bank = el('<div class="chip-bank"></div>');
    const items = q.items.map((o, i) => ({ t: o.t || o, icon: o.icon, i }));
    let pool = shuffle(items); if (pool.every((o, k) => o.i === k) && pool.length > 1) pool = pool.reverse();
    const chosen = [];
    const chip = (o, cls) => el(`<button class="chip ${cls}" style="display:inline-flex;align-items:center;gap:6px">${ico3d(o.icon || 'dot', 18)}<span>${esc(o.t)}</span></button>`);
    const okBtn = el(`<button class="btn btn-primary btn-block mt-4" disabled>${ico('check')} تحقّق</button>`);
    const redraw = () => {
      slots.innerHTML = ''; chosen.forEach((o, k) => { const ch = chip(o, 'in-slot'); ch.prepend(el(`<b class="tag tag-purple">${fmt(k + 1)}</b>`)); ch.onclick = () => { sound.play('tap'); chosen.splice(k, 1); redraw(); }; slots.appendChild(ch); });
      bank.innerHTML = ''; pool.filter((o) => !chosen.includes(o)).forEach((o) => { const ch = chip(o, ''); ch.onclick = () => { sound.play('tick'); chosen.push(o); redraw(); }; bank.appendChild(ch); });
      okBtn.disabled = chosen.length !== items.length;
    };
    okBtn.onclick = () => { lock(c); const ok = chosen.every((o, k) => o.i === k); const show = ok || reveal(ctx); [...slots.children].forEach((ch, k) => { const right = chosen[k].i === k; if (!right) ch.classList.add('wrong'); else if (show) ch.classList.add('correct'); }); ctx.done(ok, { order: chosen.map((o) => o.i) }); };
    c.appendChild(slots); c.appendChild(bank); c.appendChild(okBtn); redraw();
  },

  /** mind map: bubbles around the title; tap a bubble -> pick from its options; verify when all filled */
  mindmap(c, q, ctx) {
    c.appendChild(el('<div class="q-text">املأ خريطة القصة — اختر لكل فقاعة الإجابة الصحيحة</div>'));
    const map = el(`<div class="mindmap"><div class="center">${ico3d('flower')}<span>ازرع نبتة</span></div>${q.bubbles.map((b, i) => `<button class="bubble-q" data-i="${i}"><span class="k">${ico3d(b.icon || 'dot', 18)} ${esc(b.k)}</span><span class="v"></span></button>`).join('')}</div>`);
    const opts = el('<div class="choices map-opts"></div>');
    const okBtn = el(`<button class="btn btn-primary btn-block mt-4" disabled>${ico('check')} تحقّق</button>`);
    const picked = new Array(q.bubbles.length).fill(null);
    const bubbles = [...map.querySelectorAll('.bubble-q')];
    const show = (i) => {
      bubbles.forEach((b, k) => b.classList.toggle('active', k === i));
      opts.innerHTML = '';
      shuffle(q.bubbles[i].opts.map((t, j) => ({ t, j }))).forEach((o) => {
        const btn = el(`<button class="choice">${esc(o.t)}</button>`);
        btn.onclick = () => {
          sound.play('tick'); picked[i] = o.j; bubbles[i].querySelector('.v').textContent = o.t; bubbles[i].classList.add('filled');
          okBtn.disabled = picked.some((p) => p === null);
          const nxt = picked.findIndex((p) => p === null);
          if (nxt >= 0) show(nxt); else { bubbles.forEach((x) => x.classList.remove('active')); opts.innerHTML = '<p class="small muted center">كل الفقاعات ممتلئة — اضغط تحقّق</p>'; }
        };
        opts.appendChild(btn);
      });
    };
    bubbles.forEach((b, i) => (b.onclick = () => { sound.play('tap'); show(i); }));
    okBtn.onclick = () => {
      lock(c); let wrong = 0;
      bubbles.forEach((b, i) => { const ok = picked[i] === q.bubbles[i].correct; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok) { wrong++; if (reveal(ctx)) b.querySelector('.v').innerHTML = `<s style="opacity:.6">${esc(q.bubbles[i].opts[picked[i]])}</s> ${esc(q.bubbles[i].opts[q.bubbles[i].correct])}`; } });
      ctx.done(wrong === 0, { wrong });
    };
    c.appendChild(map); c.appendChild(opts); c.appendChild(okBtn); show(0);
  },
};
export default Q;
