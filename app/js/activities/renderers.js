/**
 * Question renderers. Each: render(container, q, ctx) where ctx = { done(ok, meta), font }
 * Renderers lock the UI after answering and call ctx.done exactly once.
 */
import { el, esc, shuffle, fmt } from '../ui/components.js';
import sound from '../engines/sound.js';
import { ico } from '../ui/icons.js';

const fontCls = (q, ctx) => (q.font || ctx.font) === 'quran' ? 'quran' : '';
const lock = (c) => c.querySelectorAll('button').forEach((b) => (b.disabled = true));
/** shuffle choices at render-time so the correct answer position is unpredictable */
const shuffled = (q) => { if (q.noShuffle) return { choices: q.choices, answer: q.answer }; const idx = shuffle(q.choices.map((_, i) => i)); return { choices: idx.map((i) => q.choices[i]), answer: idx.indexOf(q.answer) }; };

export const renderers = {
  quiz(c, q0, ctx) {
    const q = { ...q0, ...shuffled(q0) };
    c.appendChild(el(`<div class="q-text ${q.big ? 'big' : ''} ${fontCls(q, ctx)}">${esc(q.q)}</div>`));
    const grid = el('<div class="choices"></div>');
    q.choices.forEach((ch, i) => {
      const b = el(`<button class="choice ${fontCls(q, ctx)}">${esc(ch)}</button>`);
      b.onclick = () => { lock(c); const ok = i === q.answer; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok) grid.children[q.answer]?.classList.add('correct'); [...grid.children].forEach((x, k) => k !== i && k !== q.answer && x.classList.add('dim')); ctx.done(ok, { picked: i }); };
      grid.appendChild(b);
    });
    c.appendChild(grid);
  },

  truefalse(c, q, ctx) {
    c.appendChild(el(`<div class="q-text ${fontCls(q, ctx)}">${esc(q.q)}</div>`));
    const grid = el('<div class="choices"></div>');
    [[true, '✅ صواب', 'btn-primary'], [false, '❌ خطأ', 'btn-rose']].forEach(([v, label]) => {
      const b = el(`<button class="choice">${label}</button>`);
      b.onclick = () => { lock(c); const ok = v === q.answer; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok) [...grid.children].find((x) => x !== b)?.classList.add('correct'); ctx.done(ok, { picked: v }); };
      grid.appendChild(b);
    });
    c.appendChild(grid);
  },

  fillblank(c, q0, ctx) {
    const q = { ...q0, ...shuffled(q0) };
    const parts = q.q.split('___');
    const txt = el(`<div class="q-text ${fontCls(q, ctx)}">${parts.map((p, i) => esc(p) + (i < parts.length - 1 ? '<span class="blank">…</span>' : '')).join('')}</div>`);
    c.appendChild(txt);
    const grid = el('<div class="choices"></div>');
    q.choices.forEach((ch, i) => {
      const b = el(`<button class="choice ${fontCls(q, ctx)}">${esc(ch)}</button>`);
      b.onclick = () => { lock(c); const ok = i === q.answer; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok) grid.children[q.answer]?.classList.add('correct'); txt.querySelector('.blank').textContent = q.choices[q.answer]; txt.querySelector('.blank').style.color = ok ? 'var(--neon-green)' : 'var(--neon-rose)'; ctx.done(ok, { picked: i }); };
      grid.appendChild(b);
    });
    c.appendChild(grid);
  },

  numpad(c, q, ctx) {
    c.appendChild(el(`<div class="q-text big">${esc(q.q)}</div>`));
    const box = el('<div class="answer-box" aria-live="polite">&nbsp;</div>');
    c.appendChild(box);
    let val = '';
    const pad = el('<div class="numpad"></div>');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
    const upd = () => { box.textContent = val ? fmt(Number(val)) : '\u00a0'; };
    keys.forEach((k) => {
      const b = el(`<button class="btn ${k === 'ok' ? 'btn-primary' : k === 'del' ? 'btn-rose' : ''}">${k === 'del' ? ico('eraser') : k === 'ok' ? ico('check') : fmt(Number(k))}</button>`);
      b.onclick = () => {
        sound.play('tick');
        if (k === 'del') val = val.slice(0, -1);
        else if (k === 'ok') { if (!val) return; lock(c); const ok = Number(val) === Number(q.answer); box.style.borderColor = ok ? 'var(--neon-green)' : 'var(--neon-rose)'; box.style.color = ok ? 'var(--neon-green)' : 'var(--neon-rose)'; if (!ok) box.textContent = `${fmt(Number(val))} ✗  الصحيح ${fmt(q.answer)}`; ctx.done(ok, { picked: Number(val) }); return; }
        else if (val.length < 5) val += k;
        upd();
      };
      pad.appendChild(b);
    });
    c.appendChild(pad);
    // keyboard support
    const onKey = (e) => { if (/^[0-9]$/.test(e.key)) { if (val.length < 5) { val += e.key; upd(); } } else if (e.key === 'Backspace') { val = val.slice(0, -1); upd(); } else if (e.key === 'Enter') pad.lastChild.click(); };
    window.addEventListener('keydown', onKey);
    ctx.onCleanup(() => window.removeEventListener('keydown', onKey));
  },

  match(c, q, ctx) {
    c.appendChild(el(`<div class="q-text">${esc(q.q || 'وصّل كل عنصر بما يناسبه')}</div>`));
    const left = shuffle(q.pairs.map((p, i) => ({ t: p[0], i }))), right = shuffle(q.pairs.map((p, i) => ({ t: p[1], i })));
    const cols = el('<div class="match-cols"><div class="stack l"></div><div class="stack r"></div></div>');
    const L = cols.querySelector('.l'), R = cols.querySelector('.r');
    let sel = null, matched = 0, mistakes = 0;
    const mk = (side, o) => { const b = el(`<button class="choice ${fontCls(q, ctx)}" data-i="${o.i}">${esc(o.t)}</button>`); b.onclick = () => choose(side, b); return b; };
    function choose(side, b) {
      sound.play('tap');
      if (sel && sel.side === side) { sel.b.classList.remove('selected'); sel = { side, b }; b.classList.add('selected'); return; }
      if (!sel) { sel = { side, b }; b.classList.add('selected'); return; }
      const ok = sel.b.dataset.i === b.dataset.i;
      if (ok) { sel.b.classList.remove('selected'); sel.b.classList.add('matched'); b.classList.add('matched'); matched++; sound.play('coin'); if (matched === q.pairs.length) { lock(c); ctx.done(mistakes === 0, { mistakes }); } }
      else { mistakes++; b.classList.add('wrong'); sel.b.classList.add('wrong'); const s = sel; sound.play('wrong'); setTimeout(() => { b.classList.remove('wrong'); s.b.classList.remove('wrong', 'selected'); }, 500); }
      sel = null;
    }
    left.forEach((o) => L.appendChild(mk('l', o))); right.forEach((o) => R.appendChild(mk('r', o)));
    c.appendChild(cols);
    c.appendChild(el('<p class="small muted center mt-3">اضغط عنصراً من كل عمود لتوصيلهما</p>'));
  },

  order(c, q, ctx) {
    c.appendChild(el(`<div class="q-text">${esc(q.prompt || q.q || 'رتّب بالترتيب الصحيح')}</div>`));
    const slots = el('<div class="order-slots" aria-label="ترتيبك"></div>');
    const bank = el('<div class="chip-bank"></div>');
    const chosen = [];
    const shuffled = shuffle(q.items.map((t, i) => ({ t, i })));
    // guard: ensure not already in correct order
    if (shuffled.every((o, k) => o.i === k) && shuffled.length > 1) shuffled.reverse();
    const redraw = () => {
      slots.innerHTML = '';
      chosen.forEach((o, k) => { const ch = el(`<button class="chip in-slot ${fontCls(q, ctx)}">${esc(o.t)}</button>`); ch.onclick = () => { sound.play('tap'); chosen.splice(k, 1); redraw(); }; slots.appendChild(ch); });
      bank.innerHTML = '';
      shuffled.filter((o) => !chosen.includes(o)).forEach((o) => { const ch = el(`<button class="chip ${fontCls(q, ctx)}">${esc(o.t)}</button>`); ch.onclick = () => { sound.play('tick'); chosen.push(o); redraw(); }; bank.appendChild(ch); });
      okBtn.disabled = chosen.length !== q.items.length;
    };
    const okBtn = el(`<button class="btn btn-primary btn-block mt-4">${ico('check')} تحقّق</button>`);
    okBtn.onclick = () => { lock(c); const ok = chosen.every((o, k) => o.i === k); [...slots.children].forEach((ch, k) => ch.classList.add(chosen[k].i === k ? 'correct' : 'wrong')); ctx.done(ok, { order: chosen.map((o) => o.i) }); };
    c.appendChild(slots); c.appendChild(bank); c.appendChild(okBtn);
    redraw();
  },
};

/* Track the last pointer position inside each question card so celebrations
   burst exactly where the child's finger touched. Wrap every renderer once. */
for (const key of Object.keys(renderers)) {
  const orig = renderers[key];
  renderers[key] = (c, q, ctx) => {
    let last = null;
    c.addEventListener('pointerdown', (e) => { last = { x: e.clientX, y: e.clientY }; }, { passive: true, capture: true });
    const wrapped = { ...ctx, done(ok, meta = {}) { const r = c.getBoundingClientRect(); ctx.done(ok, { ...meta, point: last || { x: r.left + r.width / 2, y: r.top + r.height / 2 }, card: c }); } };
    return orig(c, q, wrapped);
  };
}
export default renderers;
