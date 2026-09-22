/**
 * Quests view — today's 3 missions with progress & claim buttons; countdown to reset.
 */
import bus from '../../core/bus.js';
import quests from '../../engines/quests.js';
import sound from '../../engines/sound.js';
import { el, fmt, esc, hud, nav, confetti, toast } from '../components.js';
import { ico } from '../icons.js';

function untilMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); const s = Math.floor((m - n) / 1000); return `${fmt(Math.floor(s / 3600))} س ${fmt(Math.floor((s % 3600) / 60))} د`; }

export async function render(root) {
  const h = hud({ back: true, title: '🎯 مهام اليوم' });
  root.appendChild(h);
  const wrap = el('<div class="stack"></div>');
  root.appendChild(el(`<div class="card center glow-cyan"><div style="font-size:56px" class="float">🎯</div><h1>مهام اليوم</h1><p class="muted">مهام جديدة كل يوم — تتجدد بعد <b class="tt">${untilMidnight()}</b></p></div>`));
  root.appendChild(wrap);
  root.appendChild(nav('quests'));

  const draw = () => {
    const list = quests.list();
    wrap.innerHTML = '';
    list.forEach((q, i) => {
      const pct = Math.round((q.prog / q.target) * 100);
      const card = el(`<div class="card ${q.done ? 'glow-green' : ''}">
        <div class="row">
          <div class="icon-box" style="width:52px;height:52px;font-size:26px;border-radius:14px;background:rgba(255,255,255,.06);display:grid;place-items:center">${q.icon}</div>
          <div class="grow">
            <h3 style="font-size:16px">${esc(q.name)}</h3>
            <div class="row" style="gap:8px;margin-top:6px"><div class="level-bar green grow"><span style="width:${pct}%"></span></div><span class="small muted">${fmt(Math.min(q.prog, q.target))}/${fmt(q.target)}</span></div>
          </div>
          ${q.claimed ? `<span class="tag tag-green">${ico('check')} تم</span>` : q.done ? `<button class="btn btn-gold btn-sm" data-i="${i}">${ico('gem')} +${fmt(q.reward)}</button>` : `<span class="tag tag-gold">+${fmt(q.reward)} XP</span>`}
        </div>
      </div>`);
      card.querySelector('button')?.addEventListener('click', (e) => { if (quests.claim(i)) { confetti({ count: 70, x: e.clientX, y: e.clientY }); sound.play('coin'); toast(`⭐ +${fmt(q.reward)} XP و 3 💎`, { type: 'gold' }); draw(); } });
      wrap.appendChild(card);
    });
    if (list.every((q) => q.claimed)) wrap.appendChild(el('<div class="card center"><div style="font-size:40px">🎉</div><b>أنهيت كل مهام اليوم!</b><p class="muted small">ارجع غداً لمهام جديدة</p></div>'));
  };
  draw();
  const off = bus.on('quest:progress', draw);
  const tick = setInterval(() => { const t = root.querySelector('.tt'); if (t) t.textContent = untilMidnight(); }, 30000);
  return () => { off(); clearInterval(tick); h.__cleanup?.(); };
}
