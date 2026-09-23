/**
 * Question renderers. Each: render(container, q, ctx) where ctx = { done(ok, meta), font }
 * Renderers lock the UI after answering and call ctx.done exactly once.
 */
import { el, esc, shuffle, fmt } from '../ui/components.js';
import sound from '../engines/sound.js';
import { ico } from '../ui/icons.js';
import { ico3d } from '../ui/icons3d.js';

const fontCls = (q, ctx) => (q.font || ctx.font) === 'quran' ? 'quran' : '';
const lock = (c) => c.querySelectorAll('button:not(.explain-btn)').forEach((b) => (b.disabled = true)); // the explain button stays usable after a miss (Phase 11)
/** Phase 11 K3: may the correct answer be revealed after a wrong pick? play.js says no while a retry is still available */
const reveal = (ctx) => !ctx.reveal || ctx.reveal() !== false;
/** shuffle choices at render-time so the correct answer position is unpredictable */
const shuffled = (q) => { if (q.noShuffle) return { choices: q.choices, answer: q.answer }; const idx = shuffle(q.choices.map((_, i) => i)); return { choices: idx.map((i) => q.choices[i]), answer: idx.indexOf(q.answer) }; };

export const renderers = {
  quiz(c, q0, ctx) {
    const q = { ...q0, ...shuffled(q0) };
    if (q.q) c.appendChild(el(`<div class="q-text ${q.big ? 'big' : ''} ${fontCls(q, ctx)}">${esc(q.q)}</div>`));
    const grid = el('<div class="choices"></div>');
    q.choices.forEach((ch, i) => {
      const b = el(`<button class="choice ${fontCls(q, ctx)}">${esc(ch)}</button>`);
      b.onclick = () => { lock(c); const ok = i === q.answer; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok && reveal(ctx)) grid.children[q.answer]?.classList.add('correct'); if (ok || reveal(ctx)) [...grid.children].forEach((x, k) => k !== i && k !== q.answer && x.classList.add('dim')); ctx.done(ok, { picked: i }); };
      grid.appendChild(b);
    });
    c.appendChild(grid);
  },

  truefalse(c, q, ctx) {
    c.appendChild(el(`<div class="q-text ${fontCls(q, ctx)}">${esc(q.q)}</div>`));
    const grid = el('<div class="choices"></div>');
    [[true, ico3d('check') + ' صواب', 'btn-primary'], [false, ico3d('cross') + ' خطأ', 'btn-rose']].forEach(([v, label]) => {
      const b = el(`<button class="choice">${label}</button>`);
      b.onclick = () => { lock(c); const ok = v === q.answer; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok && reveal(ctx)) [...grid.children].find((x) => x !== b)?.classList.add('correct'); ctx.done(ok, { picked: v }); };
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
      b.onclick = () => { lock(c); const ok = i === q.answer; b.classList.add(ok ? 'correct' : 'wrong'); if (!ok && reveal(ctx)) grid.children[q.answer]?.classList.add('correct'); if (ok || reveal(ctx)) { txt.querySelector('.blank').textContent = q.choices[q.answer]; txt.querySelector('.blank').style.color = ok ? 'var(--neon-green)' : 'var(--neon-rose)'; } ctx.done(ok, { picked: i }); };
      grid.appendChild(b);
    });
    c.appendChild(grid);
  },

  numpad(c, q, ctx) {
    if (q.q) c.appendChild(el(`<div class="q-text big">${esc(q.q)}</div>`));
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
        else if (k === 'ok') { if (!val) return; lock(c); const ok = Number(val) === Number(q.answer); box.style.borderColor = ok ? 'var(--neon-green)' : 'var(--neon-rose)'; box.style.color = ok ? 'var(--neon-green)' : 'var(--neon-rose)'; if (!ok) box.innerHTML = reveal(ctx) ? `${fmt(Number(val))} ${ico3d('cross', 18)} الصحيح ${fmt(q.answer)}` : `${fmt(Number(val))} ${ico3d('cross', 18)}`; ctx.done(ok, { picked: Number(val) }); return; }
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

  /**
   * Phase 12 (design A, Egyptian schoolbook p.8-9): distributive-property branching tree.
   *   q = { type:'branch', a, b, s1, s2 }  ->  a x b splits into (a x s1) + (a x s2)
   * Root capsule (right, RTL) -> two branches joined by SVG connectors -> sum line -> total.
   * Slots (filled with the shared numpad, in order, any slot tappable): part2, prod1, prod2, sum.
   * Per-slot check: right -> green + locked; wrong -> soft shake + ctx.slotMiss(slot) (no reveal, mistake loop).
   * ctx.done(true, { slots, misses }) fires once when the whole tree is complete.
   */
  branch(c, q, ctx) {
    const { a, b, s1, s2 } = q; const P1 = a * s1, P2 = a * s2, SUM = a * b;
    const wrap = el(`<div class="branch" dir="rtl">
      <svg class="branch-svg" aria-hidden="true"></svg>
      <div class="branch-root" data-root><span class="br-eq">${fmt(a)} × ${fmt(b)}</span></div>
      <div class="branch-rows">
        <div class="branch-row" data-row="1"><span class="br-eq"><span data-anchor="1">${fmt(a)} × ${fmt(s1)}</span> =</span><button type="button" class="br-slot" data-slot="prod1" data-ans="${P1}" aria-label="ناتج الفرع الأول">؟</button></div>
        <div class="branch-row" data-row="2"><span class="br-eq"><span data-anchor="2">${fmt(a)} × <button type="button" class="br-slot br-inline" data-slot="part2" data-ans="${s2}" aria-label="الجزء الثاني">؟</button></span> =</span><button type="button" class="br-slot" data-slot="prod2" data-ans="${P2}" aria-label="ناتج الفرع الثاني">؟</button></div>
      </div>
      <div class="branch-sumline" data-sumline></div>
      <div class="branch-total"><span class="br-eq">المجموع =</span><button type="button" class="br-slot" data-slot="sum" data-ans="${SUM}" aria-label="المجموع">؟</button></div>
      <div class="branch-tip">${ico3d('bulb', 22)}<span>فكّكنا ${fmt(b)} إلى ${fmt(s1)} + ${fmt(s2)}. اضرب كل جزء، وبعدين اجمع.</span></div>
    </div>`);
    c.appendChild(wrap);
    const slots = [...wrap.querySelectorAll('.br-slot')]; const order = ['part2', 'prod1', 'prod2', 'sum'];
    const byName = (n) => slots.find((x) => x.dataset.slot === n);
    const state = { misses: [], done: {} }; let active = null, val = '';
    const svg = wrap.querySelector('.branch-svg');
    // --- SVG connectors computed from the real boxes (root -> each branch row, plus the sum line)
    const draw = () => {
      const W = wrap.clientWidth, H = wrap.clientHeight; if (!W) return;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
      const R = wrap.getBoundingClientRect(); const rel = (r) => ({ x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height });
      const root = rel(wrap.querySelector('[data-root] .br-eq').getBoundingClientRect());
      const rows = [1, 2].map((i) => rel(wrap.querySelector(`[data-anchor="${i}"]`).getBoundingClientRect()));
      // Mobile layout: branches sit BELOW the root, so the schoolbook "<" bracket becomes a trunk dropping from the
      // root's bottom edge (just right of the anchors, RTL) with a rounded elbow into each anchor's right edge.
      // (Screenshot review of v1 showed the side-curve doubling back over the anchors - fixed here.)
      const tx = Math.min(Math.max(rows[0].x + rows[0].w + 18, root.x + 18), root.x + root.w - 18);
      const sy = root.y + root.h;
      const paths = rows.map((r) => { const ex = r.x + r.w + 4, ey = r.y + r.h / 2; const k = Math.min(14, Math.max(4, tx - ex)); return `M ${tx} ${sy} L ${tx} ${ey - k} Q ${tx} ${ey} ${tx - k} ${ey} L ${ex} ${ey}`; });
      const sl = rel(wrap.querySelector('[data-sumline]').getBoundingClientRect());
      svg.innerHTML = paths.map((d, i) => `<path class="br-path" data-path="${i + 1}" d="${d}"/>`).join('') + `<line class="br-sum" x1="${sl.x}" y1="${sl.y + 1}" x2="${sl.x + sl.w}" y2="${sl.y + 1}"/>`;
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null; ro?.observe(wrap);
    requestAnimationFrame(() => { draw(); setTimeout(draw, 320); });
    ctx.onCleanup(() => ro?.disconnect());
    // --- numpad (same keys/layout as the numpad renderer)
    const pad = el('<div class="numpad"></div>');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
    const show = () => { if (active) active.textContent = val ? fmt(Number(val)) : '؟'; };
    const setActive = (btn) => { if (!btn || btn.classList.contains('ok')) return; if (active && active !== btn && !active.classList.contains('ok')) { active.textContent = '؟'; } active = btn; val = ''; slots.forEach((x) => x.classList.toggle('active', x === btn)); };
    const nextEmpty = () => order.map(byName).find((x) => !x.classList.contains('ok'));
    const finish = () => { lock(c); sound.play('correct'); ctx.done(true, { slots: order.map((n) => ({ slot: n, misses: state.misses.filter((m) => m === n).length })), misses: state.misses.length, picked: SUM }); };
    const check = () => {
      if (!active || !val) return;
      const ok = Number(val) === Number(active.dataset.ans);
      if (ok) {
        active.classList.remove('active', 'bad'); active.classList.add('ok'); active.disabled = true; state.done[active.dataset.slot] = true; sound.play('tick');
        const n = nextEmpty(); if (n) setActive(n); else { active = null; finish(); }
      } else {
        state.misses.push(active.dataset.slot); active.classList.add('bad'); active.textContent = '؟'; val = '';
        wrap.classList.remove('shake-soft'); void wrap.offsetWidth; wrap.classList.add('shake-soft');
        setTimeout(() => active?.classList.remove('bad'), 700);
        ctx.slotMiss?.(active.dataset.slot); // play.js: heart + warm nudge + pulse explain button, never reveals
      }
    };
    keys.forEach((k) => {
      const b = el(`<button type="button" class="btn ${k === 'ok' ? 'btn-primary' : k === 'del' ? 'btn-rose' : ''}">${k === 'del' ? ico('eraser') : k === 'ok' ? ico('check') : fmt(Number(k))}</button>`);
      b.onclick = () => { sound.play('tick'); if (k === 'del') val = val.slice(0, -1); else if (k === 'ok') { check(); return; } else if (val.length < 3) val += k; show(); };
      pad.appendChild(b);
    });
    slots.forEach((btn) => { btn.onclick = () => { if (btn.classList.contains('ok')) return; sound.play('tap'); setActive(btn); }; });
    c.appendChild(pad);
    setActive(byName('part2'));
    const onKey = (e) => { if (/^[0-9]$/.test(e.key)) { if (val.length < 3) { val += e.key; show(); } } else if (e.key === 'Backspace') { val = val.slice(0, -1); show(); } else if (e.key === 'Enter') check(); };
    window.addEventListener('keydown', onKey); ctx.onCleanup(() => window.removeEventListener('keydown', onKey));
    window.__branch = { redraw: draw, slots: () => Object.fromEntries(slots.map((x) => [x.dataset.slot, { ok: x.classList.contains('ok'), active: x.classList.contains('active') }])), misses: () => [...state.misses] }; // E2E hook (read-only)
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

  /** grid: rows×cols dots; answer via numpad (mode 'numpad') or 3 choices (mode 'quiz') */
  grid(c, q, ctx) {
    c.appendChild(el(`<div class="q-text">${esc(q.q)}</div>`));
    const g = el(`<div class="dot-grid" style="--cols:${q.cols}" aria-label="${q.rows} صفوف × ${q.cols} أعمدة"></div>`);
    for (let r = 0; r < q.rows; r++) for (let k = 0; k < q.cols; k++) g.appendChild(el(`<span class="dot" style="animation-delay:${(r * q.cols + k) * 18}ms"></span>`));
    c.appendChild(g);
    c.appendChild(el(`<p class="small muted center" style="margin:6px 0 10px">${fmt(q.rows)} × ${fmt(q.cols)}</p>`));
    if (q.mode === 'quiz' && q.choices) return renderers.quiz(c, { ...q, q: '', noShuffle: true }, ctx);
    return renderers.numpad(c, { ...q, q: '' }, ctx);
  },
  /** pick: multi-select all correct items then verify */
  pick(c, q, ctx) {
    c.appendChild(el(`<div class="q-text">${esc(q.q)}</div>`));
    const grid = el('<div class="choices pick-grid"></div>'); const sel = new Set();
    const okBtn = el(`<button class="btn btn-primary btn-block mt-4" disabled>${ico('check')} تحقّق</button>`);
    q.items.forEach((t, i) => { const b = el(`<button class="choice" aria-pressed="false">${esc(t)}</button>`); b.onclick = () => { sound.play('tick'); sel.has(i) ? sel.delete(i) : sel.add(i); b.classList.toggle('selected', sel.has(i)); b.setAttribute('aria-pressed', String(sel.has(i))); okBtn.disabled = sel.size === 0; }; grid.appendChild(b); });
    okBtn.onclick = () => { lock(c); const want = new Set(q.correct); let ok = sel.size === want.size; [...grid.children].forEach((b, i) => { const isC = want.has(i), picked = sel.has(i); if (isC && (ok || reveal(ctx))) b.classList.add('correct'); if (picked && !isC) { b.classList.add('wrong'); ok = false; } if (isC && !picked) ok = false; }); ctx.done(ok, { picked: [...sel] }); };
    c.appendChild(grid); c.appendChild(okBtn);
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
    okBtn.onclick = () => { lock(c); const ok = chosen.every((o, k) => o.i === k); const show = ok || reveal(ctx); [...slots.children].forEach((ch, k) => { const right = chosen[k].i === k; if (!right) ch.classList.add('wrong'); else if (show) ch.classList.add('correct'); }); ctx.done(ok, { order: chosen.map((o) => o.i) }); };
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
