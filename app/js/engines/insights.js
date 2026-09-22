/**
 * Insights - transparent, rule-based learning-behaviour analysis (Phase 10, feature 3).
 * Works on profile.events[] (telemetry.js). No ML, no network: every number here can be explained to a parent.
 *
 * analyze(profile) -> {
 *   skills: [{ skill, n, correct, rate, trend (-1..1), confidence (0..1), avgMs, explained, recent: [...] }] sorted weakest first
 *   weakest: top 3 skills (n >= MIN_N and rate < 0.8)  |  strengths: top 3 (rate >= 0.9)
 *   patterns: [{ id, label, count, example }] recurring error patterns (adjacent table, add-instead-of-multiply, digit swap, guess)
 *   behaviour: { impulsive, perseverance, fatigueAfterMin, frustration, bestStrategy, bestHour, sessionLenMin, guessRate }
 *   recommendations: [{ id, title, why, action, skills }]
 *   impact: [{ skill, before, after, delta }]     // targeted skills: first-half vs second-half accuracy
 *   totals: { attempts, correct, explained, stages, days }
 * }
 * adaptive(profile) -> { delayMs, breakAfterMin, preferStrategy }  used by the child app (never shown as labels to the child)
 */
const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);
export const MIN_N = 4;
const toNum = (v) => { if (v == null) return NaN; const s = String(v).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); return Number(s); };

function groupBy(arr, key) { const m = new Map(); for (const e of arr) { const k = key(e); if (!m.has(k)) m.set(k, []); m.get(k).push(e); } return m; }
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export function analyze(profile) {
  const ev = (profile?.events || []).slice().sort((a, b) => a.t - b.t);
  const att = ev.filter((e) => e.type === 'question_attempted');
  const exp = ev.filter((e) => e.type === 'explanation_result');
  const stages = ev.filter((e) => e.type === 'stage_completed');
  const quits = ev.filter((e) => e.type === 'session_quit');

  /* ---- mastery map per skill ---- */
  const skills = [...groupBy(att, (e) => e.skill || 'عام').entries()].map(([skill, list]) => {
    const n = list.length, correct = list.filter((e) => e.correct).length, rate = correct / n;
    const half = Math.floor(n / 2); const a = list.slice(0, half), b = list.slice(half);
    const trend = half >= 2 ? (b.filter((e) => e.correct).length / b.length) - (a.filter((e) => e.correct).length / a.length) : 0;
    const confidence = Math.min(1, n / 12);
    return { skill, n, correct, rate, trend, confidence, avgMs: Math.round(mean(list.map((e) => e.time_ms || 0))), explained: list.filter((e) => e.after_explain).length, last: list[n - 1].t, recent: list.slice(-8).map((e) => !!e.correct) };
  }).sort((x, y) => (x.rate - y.rate) || (y.n - x.n));
  const weakest = skills.filter((s) => s.n >= MIN_N && s.rate < 0.8).slice(0, 3);
  const strengths = skills.filter((s) => s.n >= MIN_N && s.rate >= 0.9).sort((x, y) => y.rate - x.rate || y.n - x.n).slice(0, 3);

  /* ---- error patterns (from wrong_value vs expected on math keys) ---- */
  const patterns = []; const add = (id, label, e, why) => { let p = patterns.find((x) => x.id === id); if (!p) { p = { id, label, count: 0, example: null, why }; patterns.push(p); } p.count++; if (!p.example) p.example = { key: e.key, wrong: e.wrong_value, expected: e.expected, skill: e.skill }; };
  for (const e of att) {
    if (e.correct || e.wrong_value == null) continue;
    const w = toNum(e.wrong_value), x = toNum(e.expected); const m = /^(m?)(\d+)x(\d+)$/.exec(e.key || '');
    if (Number.isFinite(w) && Number.isFinite(x) && m) {
      const a = Number(m[2]), b = Number(m[3]);
      if (!m[1] && (w === a * (b + 1) || w === a * (b - 1) || w === (a + 1) * b || w === (a - 1) * b)) { add('adjacent', 'خطأ بخانة واحدة في جدول الضرب (النطّة اللي قبلها أو بعدها)', e, 'بيعدّ بالنطّ بس بيقف نطّة قبل أو بعد'); continue; }
      if (!m[1] && w === a + b) { add('add_not_mult', 'يجمع بدل ما يضرب', e, 'بيخلط بين علامة + وعلامة ×'); continue; }
      if (String(w).length === 2 && String(w).split('').reverse().join('') === String(x)) { add('digit_swap', 'يعكس ترتيب الأرقام (مثلاً ٢١ بدل ١٢)', e, 'انتباه للقيمة المكانية'); continue; }
    }
    if ((e.time_ms || 0) < 1500 && (e.qtype === 'quiz' || e.qtype === 'truefalse')) { add('guess', 'إجابة سريعة جدًا وغلط (تخمين)', e, 'بيجاوب قبل ما يقرا/يسمع السؤال'); continue; }
    add('other', 'أخطاء متنوعة', e, '');
  }
  patterns.sort((a, b) => b.count - a.count);

  /* ---- behaviour indicators ---- */
  const wrong = att.filter((e) => !e.correct), fastWrong = wrong.filter((e) => (e.time_ms || 0) < 1500);
  const guessRate = wrong.length ? fastWrong.length / wrong.length : 0;
  const impulsive = att.length >= 8 && guessRate >= 0.4;
  // perseverance: after a wrong answer, does the next attempt in the same session happen (not quit)?
  const perseverance = att.length && stages.length + quits.length ? stages.length / (stages.length + quits.length) : 1;
  // fatigue: accuracy in minutes 0-10 vs after 10 (session_ms)
  const early = att.filter((e) => (e.session_ms || 0) < 10 * 60000), late = att.filter((e) => (e.session_ms || 0) >= 10 * 60000);
  const fatigueAfterMin = late.length >= 6 && early.length >= 6 && (late.filter((e) => e.correct).length / late.length) < (early.filter((e) => e.correct).length / early.length) - 0.15 ? 10 : null;
  // frustration: streaks of >= 3 wrong followed by quit
  let frustration = 0; { let streak = 0; for (const e of ev) { if (e.type === 'question_attempted') streak = e.correct ? 0 : streak + 1; else if (e.type === 'session_quit' && streak >= 3) frustration++; } }
  // best explanation strategy
  const byStrat = [...groupBy(exp, (e) => e.strategy).entries()].map(([s, l]) => ({ strategy: s, n: l.length, ok: l.filter((e) => e.solved).length })).filter((x) => x.n >= 2).sort((a, b) => (b.ok / b.n) - (a.ok / a.n));
  const bestStrategy = byStrat[0] || null;
  // best hour bucket
  const byHour = [...groupBy(att, (e) => e.hour < 12 ? 'morning' : e.hour < 17 ? 'afternoon' : 'evening').entries()].map(([h, l]) => ({ bucket: h, n: l.length, rate: l.filter((e) => e.correct).length / l.length })).filter((x) => x.n >= 6).sort((a, b) => b.rate - a.rate);
  const bestHour = byHour[0] || null;
  const sessionLenMin = stages.length ? Math.round(mean(stages.map((s) => s.duration_ms || 0)) / 60000) : 0;
  const behaviour = { impulsive, guessRate, perseverance, fatigueAfterMin, frustration, bestStrategy, bestHour, sessionLenMin, explainedCount: exp.length };

  /* ---- recommendations (parent-facing, plain Arabic) ---- */
  const recommendations = [];
  if (weakest.length) recommendations.push({ id: 'targeted', title: `تدريب مخصص على: ${weakest.map((s) => s.skill).join('، ')}`, why: weakest.map((s) => `${s.skill}: ${AR(Math.round(s.rate * 100))}٪ صح من ${AR(s.n)}`).join(' • '), action: 'التطبيق بيقترح تلقائيًا نشاط «تدريب مخصص» على الرئيسية يبدأ أسهل بشوية ويتدرّج.', skills: weakest.map((s) => s.skill) });
  for (const p of patterns.slice(0, 2)) if (p.id !== 'other' && p.count >= 2) recommendations.push({ id: 'pattern_' + p.id, title: p.label, why: `تكرّر ${AR(p.count)} مرات${p.example ? ` (مثال: ${p.example.skill})` : ''}`, action: p.id === 'adjacent' ? 'خلّيه يعدّ بالنطّ بصوت عالي ويكتب النطّات على ورقة قبل ما يجاوب.' : p.id === 'add_not_mult' ? 'العب معاه لعبة "مرات": ٣ × ٤ يعني ٣ أربع مرات — حط ٤ مجموعات حقيقية قدامه.' : p.id === 'digit_swap' ? 'اقرا الرقم معاه من اليسار: "واحد… اتنين… يبقى اتناشر".' : 'اطلب منه يسمع السؤال للآخر (زر اقرأهالك) قبل ما يختار.' });
  if (impulsive) recommendations.push({ id: 'impulsive', title: 'بيتسرّع في الإجابة', why: `${AR(Math.round(guessRate * 100))}٪ من الأخطاء كانت في أقل من ثانية ونص`, action: 'التطبيق بيضيف وقفة قصيرة قبل قبول الإجابة في الأسئلة الاختيارية. في البيت: "خد نفس وقولها لي قبل ما تدوس".' });
  if (fatigueAfterMin) recommendations.push({ id: 'fatigue', title: `الدقة بتقل بعد ${AR(fatigueAfterMin)} دقايق`, why: 'الأخطاء بتزيد في النص التاني من الجلسة', action: 'جلسات أقصر (٨–١٠ دقايق) مرتين في اليوم أحسن من جلسة طويلة. التطبيق بيقترح راحة تلقائيًا.' });
  if (frustration >= 2) recommendations.push({ id: 'frustration', title: 'بيخرج بعد كام غلطة ورا بعض', why: `حصلت ${AR(frustration)} مرات`, action: 'شجّعه يستخدم «يعني إيه يا بابا؟» بعد أول غلطة بدل ما يكمّل لوحده.' });
  if (bestStrategy) recommendations.push({ id: 'strategy', title: `أنفع طريقة شرح له: ${({ readaloud: 'اقرأهالك', story: 'حدوتة', reallife: 'من حياتك', steps: 'خطوة خطوة' })[bestStrategy.strategy] || bestStrategy.strategy}`, why: `جاوب صح بعدها ${AR(bestStrategy.ok)} من ${AR(bestStrategy.n)} مرات`, action: 'التطبيق بيبدأ بيها أوتوماتيك. استخدم نفس الأسلوب لما تشرح له في البيت.' });
  if (bestHour) recommendations.push({ id: 'hour', title: `أفضل وقت له: ${({ morning: 'الصبح', afternoon: 'بعد الظهر', evening: 'بالليل' })[bestHour.bucket]}`, why: `دقة ${AR(Math.round(bestHour.rate * 100))}٪ في الوقت ده`, action: 'خلّي المذاكرة الصعبة في الوقت ده.' });

  /* ---- impact: targeted skills before/after (first half vs second half of their attempts) ---- */
  const impact = skills.filter((s) => s.n >= MIN_N * 2).map((s) => { const list = att.filter((e) => (e.skill || 'عام') === s.skill); const h = Math.floor(list.length / 2); const before = list.slice(0, h).filter((e) => e.correct).length / h, after = list.slice(h).filter((e) => e.correct).length / (list.length - h); return { skill: s.skill, before: Math.round(before * 100), after: Math.round(after * 100), delta: Math.round((after - before) * 100) }; }).sort((a, b) => b.delta - a.delta);

  const days = new Set(att.map((e) => new Date(e.t).toDateString())).size;
  return { skills, weakest, strengths, patterns, behaviour, recommendations, impact, totals: { attempts: att.length, correct: att.filter((e) => e.correct).length, explained: exp.length, stages: stages.length, days } };
}

/** what the child app should adapt (silently) */
export function adaptive(profile) {
  const a = analyze(profile); const s = profile?.settings?.adaptive || {};
  return {
    delayMs: s.delayMs != null ? s.delayMs : (a.behaviour.impulsive ? 900 : 0),
    breakAfterMin: s.breakAfterMin != null ? s.breakAfterMin : (a.behaviour.fatigueAfterMin || 0),
    preferStrategy: a.behaviour.bestStrategy?.strategy || null,
    weakest: a.weakest.map((w) => w.skill),
  };
}

/** build a generator spec for a targeted practice activity from the weakest skills (math only; others get a nudge) */
export function targetedPractice(profile) {
  const a = analyze(profile); const gens = []; const titles = [];
  for (const w of a.weakest) {
    const t = /جدول (\S+)/.exec(w.skill), mis = /العدد المفقود × (\S+)/.exec(w.skill), grid = /الشبكة \(جدول (\S+)\)/.exec(w.skill), mul = /مضاعفات (\S+)/.exec(w.skill);
    const num = (s) => Number(String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    if (t) gens.push({ kind: 'mult', tables: [num(t[1])], range: [1, 6], count: 4, types: ['numpad', 'quiz'] }, { kind: 'grid', tables: [num(t[1])], range: [2, 5], count: 2 });
    else if (mis) gens.push({ kind: 'missing', tables: [num(mis[1])], range: [1, 6], count: 4 });
    else if (grid) gens.push({ kind: 'grid', tables: [num(grid[1])], range: [2, 6], count: 4 });
    else if (mul) gens.push({ kind: 'pickProducts', tables: [num(mul[1])], count: 3 });
    else if (/التبديل/.test(w.skill)) gens.push({ kind: 'commutative', tables: [2, 3, 4], count: 4 });
    else if (/التوزيع/.test(w.skill)) gens.push({ kind: 'distributive', tables: [3, 4], count: 4 });
    else continue;
    titles.push(w.skill);
  }
  if (!gens.length) return null;
  return { id: 'targeted_practice', subject: 'math', title: 'تدريب مخصص ليك', desc: `على: ${titles.join('، ')}`, icon: 'target', xp: 60, practice: true, count: Math.min(10, gens.reduce((s, g) => s + (g.count || 4), 0)), generator: gens, skillsTargeted: titles, intro: 'ده تدريب صغير مخصوص ليك، بنبدأ سهل وبعدين نطلع خطوة خطوة. مفيش قلوب هنا — جرّب براحتك!' };
}

export default { analyze, adaptive, targetedPractice, MIN_N };
