/**
 * Explain - "يعني إيه يا بابا؟" content engine (deterministic, on-device, Egyptian Arabic).
 *
 * Builds child-friendly explanations for a question from its meta { kind, a, b, ... } using 4 strategies:
 *   readaloud  - read the question itself in simple words (karaoke)      -> fixes the spelling barrier
 *   story      - a tiny story with things the child loves (cars, candies, pigeons...)
 *   reallife   - a concrete example from daily life (pocket money, egg trays, hands...)
 *   steps      - interactive micro-steps: each step asks a tiny question; the final answer only at the end
 *
 * The final answer is NEVER inside readaloud/story/reallife text; those end with a hint question.
 * plan(q) -> { strategies, get(id) -> { id, title, icon, lines[], steps? }, order(preferred) }
 * parentScript(q) -> [{ h, t }] plain-Arabic script the parent reads to the child (Parent Mode).
 */
const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);
const pick = (arr, seed = 0) => arr[Math.abs(seed) % arr.length];

const THINGS = [
  { one: 'عربية', many: 'عربيات', unit: 'جراج', units: 'جراجات' },
  { one: 'بونبوني', many: 'بونبونيات', unit: 'كيس', units: 'أكياس' },
  { one: 'حمامة', many: 'حمامات', unit: 'برج', units: 'أبراج' },
  { one: 'كورة', many: 'كور', unit: 'شنطة', units: 'شُنط' },
  { one: 'بيضة', many: 'بيضات', unit: 'كرتونة', units: 'كراتين' },
  { one: 'قلم', many: 'أقلام', unit: 'علبة', units: 'علب' },
];
const NAMES = ['ماما', 'بابا', 'طنط', 'عمو', 'الأستاذ', 'جدو'];
const skipCount = (a, b) => { const seq = []; for (let i = 1; i <= b; i++) seq.push(AR(a * i)); return seq; };

const KIND = {
  mult(m, seed) {
    const { a, b, ans } = m; const th = pick(THINGS, seed), who = pick(NAMES, seed + 1);
    return {
      // Phase 15.2: a x b = a groups, b in each group (the school-book convention, owner decision) - same as the bar
      readaloud: [`السؤال بيقول: ${AR(a)} في ${AR(b)} يساوي كام؟`, `علامة الضرب دي معناها "مرات". ${AR(b)} مكرّرة ${AR(a)} مرات.`, `فكّر: لو عدّينا ${AR(b)} كل مرة، ${AR(a)} مرات، هنوصل لكام؟`],
      story: [`كان عند ${who} ${AR(a)} ${th.units}.`, `في كل ${th.unit} فيه ${AR(b)} ${th.many} بالظبط.`, `${who} قال لك: "عدّ لي كل الـ${th.many} اللي عندي!"`, `يعني هتعدّ ${AR(b)} في كل ${th.unit}، وعندك ${AR(a)} ${th.units}.`, `تقدر تعدّ بالنطّ: ${skipCount(b, Math.min(a, 4)).join('، ')}… كمّل لحد ${AR(a)} نطّات!`],
      reallife: [`تخيّل إيدك: كل إيد فيها ${AR(5)} صوابع. لو عندك إيدين، دول ${AR(5)} في ${AR(2)} = ${AR(10)} صوابع.`, `نفس الفكرة: عندنا مجموعات، كل مجموعة فيها ${AR(b)}، وعدد المجموعات ${AR(a)}.`, `افرض مصروفك ${AR(b)} جنيه في اليوم. بعد ${AR(a)} أيام، جمعت كام؟`, `ده بالظبط ${AR(a)} في ${AR(b)}.`],
      steps: [
        { say: `هنمشي خطوة خطوة. أول حاجة: العدد ${AR(b)} هنكرّره كام مرة؟`, ask: 'كام مرة؟', choices: [a, a + 1, Math.max(1, a - 1)], answer: a },
        { say: `تمام! يبقى هنعدّ ${AR(b)} بالنطّ. أول نطّة: ${AR(b)}. تاني نطّة: ${AR(b)} و${AR(b)} كمان يبقوا كام؟`, ask: `${AR(b)} + ${AR(b)} = ؟`, choices: [b * 2, b * 2 + 1, b + 1], answer: b * 2 },
        ...(a > 2 ? [{ say: `برافو! كمّل النطّ: ${skipCount(b, a - 1).join('، ')}… النطّة اللي بعدها كام؟`, ask: `${AR(b * (a - 1))} + ${AR(b)} = ؟`, choices: [ans, ans + b, ans - 1], answer: ans }] : []),
        { say: `شطور! يبقى ${AR(a)} في ${AR(b)} = ${AR(ans)}. جرّب تكتبها في السؤال دلوقتي!`, final: ans },
      ],
    };
  },
  grid(m, seed) {
    const base = KIND.mult(m, seed); const { a, b } = m;
    base.readaloud = ['السؤال بيقول: كام نقطة في الشبكة؟', `الشبكة فيها ${AR(a)} صفوف، وكل صف فيه ${AR(b)} نقط.`, `بدل ما تعدّ نقطة نقطة، عدّ صف صف: كل صف ${AR(b)}.`, `يعني ${AR(a)} صفوف في ${AR(b)} نقط.`];
    base.reallife = [`زي صواني البيض: كل صف فيه ${AR(b)} بيضة، وعندنا ${AR(a)} صفوف.`, `أو زي كراسي الفصل: ${AR(a)} صفوف، وكل صف ${AR(b)} كرسي.`, `عدّ الصفوف بالنطّ ${AR(b)}، ${AR(b * 2)}… لحد ${AR(a)} صفوف.`];
    return base;
  },
  missing(m, seed) {
    const { a, b, product } = m; const th = pick(THINGS, seed);
    return {
      readaloud: [`السؤال بيقول: ${AR(a)} في كام يساوي ${AR(product)}؟`, 'العدد الناقص هو عدد المرات.', `يعني: كام مرة نكرّر ${AR(a)} لحد ما نوصل ${AR(product)}؟`],
      story: [`عندك ${th.units} كل واحد فيه ${AR(a)} ${th.many}.`, `كل الـ${th.many} مع بعض ${AR(product)}.`, `السؤال: عندك كام ${th.unit}؟`, `عدّ بالنطّ ${AR(a)}، ${AR(a * 2)}، ${AR(a * 3)}… واحسب كام نطّة لحد ${AR(product)}.`],
      reallife: [`لو كل يوم بتاخد ${AR(a)} جنيه مصروف، وجمعت ${AR(product)} جنيه.`, 'كام يوم اللي جمعت فيهم؟', `عدّ بالنطّ ${AR(a)} كل يوم لحد ${AR(product)}.`],
      steps: [
        { say: `هنعدّ بالنطّ ${AR(a)}. أول نطّة ${AR(a)}، تاني نطّة كام؟`, ask: `${AR(a)} + ${AR(a)} = ؟`, choices: [a * 2, a * 2 + 1, a * 2 - 1], answer: a * 2 },
        { say: `تمام! كمّل النطّ: ${skipCount(a, b).join('، ')}. عدّ النطّات اللي عملناها لحد ${AR(product)}.`, ask: 'كام نطّة؟', choices: [b, b + 1, Math.max(1, b - 1)], answer: b },
        { say: `برافو! يبقى ${AR(a)} في ${AR(b)} = ${AR(product)}. العدد الناقص هو ${AR(b)}.`, final: b },
      ],
    };
  },
  commutative(m, seed) {
    const { a, b } = m; const th = pick(THINGS, seed);
    return {
      readaloud: [`السؤال بيقول: ${AR(a)} في ${AR(b)} يساوي ${AR(b)} في كام؟`, 'دي خاصية اسمها التبديل: لو بدّلنا مكان العددين، الناتج مبيتغيّرش.', `يعني ${AR(a)} في ${AR(b)} = ${AR(b)} في…؟`],
      story: [`صفّينا ${th.many}: ${AR(a)} صفوف وكل صف ${AR(b)}.`, `لفّينا الصينية… بقت ${AR(b)} صفوف وكل صف ${AR(a)}!`, `عدد الـ${th.many} اتغيّر؟ لا طبعًا. نفس الـ${th.many}.`, `يبقى ${AR(a)} في ${AR(b)} = ${AR(b)} في…؟`],
      reallife: [`${AR(2)} إيدين في كل إيد ${AR(5)} صوابع = ${AR(5)} صوابع في ${AR(2)} إيدين. نفس الـ${AR(10)}.`, 'التبديل مبيغيّرش الناتج.', `طبّقها على ${AR(a)} و${AR(b)}.`],
      steps: [
        { say: `لو عندك ${AR(a)} صفوف في كل صف ${AR(b)}، ولفّيت الصينية، هيبقى عندك كام صف؟`, ask: 'كام صف بعد اللفّ؟', choices: [b, a, a + b], answer: b },
        { say: 'تمام! وكل صف هيبقى فيه كام؟', ask: 'كام في الصف؟', choices: [a, b, a * b], answer: a },
        { say: `يبقى ${AR(a)} في ${AR(b)} = ${AR(b)} في ${AR(a)}. العدد الناقص ${AR(a)}.`, final: a },
      ],
    };
  },
  commutative_tf(m, seed) {
    const { a, b, ans } = m; const base = KIND.commutative({ a, b }, seed);
    base.readaloud = m.wrong != null ? [`السؤال بيقول: هل ${AR(b)} في ${AR(a)} يساوي ${AR(m.wrong)}؟`, 'احسبها بالنطّ الأول، وقارن.'] : [`السؤال بيقول: هل ${AR(a)} في ${AR(b)} يساوي ${AR(b)} في ${AR(a)}؟ صح ولا غلط؟`, 'افتكر: التبديل مبيغيّرش الناتج. بس لازم نتأكد الأرقام على الجنبين هي هي.'];
    base.steps = [
      { say: `احسب ${AR(a)} في ${AR(b)} بالنطّ: ${skipCount(b, a).join('، ')}. يبقى كام؟`, ask: `${AR(a)} × ${AR(b)} = ؟`, choices: [a * b, a * b + a, a * b - 1], answer: a * b },
      { say: m.wrong != null ? `طيب السؤال بيقول ${AR(m.wrong)}. هو نفس الرقم؟` : `والجنب التاني ${AR(b)} في ${AR(a)}، نفس الرقم برضه ${AR(a * b)}. يبقى الجملة صح؟`, ask: 'صح ولا غلط؟', choices: ['صح', 'غلط'], answer: ans ? 'صح' : 'غلط' },
      { say: `شطور! الإجابة: ${ans ? 'صح' : 'غلط'}.`, final: ans ? 'صح' : 'غلط' },
    ];
    return base;
  },
  distributive(m, seed) {
    const { a, b, s1, s2 } = m; const th = pick(THINGS, seed);
    return {
      readaloud: [`السؤال بيقول: ${AR(a)} في ${AR(b)}، هنفكّها لجزئين: ${AR(a)} في ${AR(s1)}، زائد ${AR(a)} في كام؟`, 'دي خاصية التوزيع: نقسم الرقم الكبير جزئين أسهل.', `${AR(b)} = ${AR(s1)} + كام؟`],
      story: [`عندك ${AR(b)} ${th.units}، كل واحد فيه ${AR(a)} ${th.many}.`, `حطّيت ${AR(s1)} ${th.units} على الترابيزة، والباقي على الرف.`, `على الرف كام ${th.unit}؟ ${AR(b)} ناقص ${AR(s1)}.`],
      reallife: [`لو عندك ${AR(b)} جنيه، وصرفت ${AR(s1)}، الباقي كام؟`, `نفس الفكرة: بنقسم ${AR(b)} لجزئين ${AR(s1)} والباقي.`],
      steps: [
        { say: `${AR(b)} هنفكّها لجزئين. الجزء الأول ${AR(s1)}. الجزء التاني = ${AR(b)} ناقص ${AR(s1)} = كام؟`, ask: `${AR(b)} − ${AR(s1)} = ؟`, choices: [s2, s2 + 1, Math.max(0, s2 - 1)], answer: s2 },
        { say: `برافو! يبقى ${AR(a)} في ${AR(b)} = (${AR(a)} في ${AR(s1)}) + (${AR(a)} في ${AR(s2)}). العدد الناقص ${AR(s2)}.`, final: s2 },
      ],
    };
  },
  distributive_sum(m, seed) {
    const { a, b, s1, s2, ans } = m; const base = KIND.distributive(m, seed);
    base.readaloud = [`السؤال بيقول: ${AR(a)} في ${AR(s1)}، زائد ${AR(a)} في ${AR(s2)}، يساوي كام؟`, `الاتنين فيهم ${AR(a)}! نجمع ${AR(s1)} و${AR(s2)} الأول، وبعدين نضرب في ${AR(a)}.`];
    base.steps = [
      { say: `${AR(s1)} زائد ${AR(s2)} = كام؟`, ask: `${AR(s1)} + ${AR(s2)} = ؟`, choices: [b, b + 1, b - 1], answer: b },
      { say: `تمام! يبقى ${AR(a)} في ${AR(b)}. عدّ بالنطّ: ${skipCount(b, a).join('، ')}. الناتج؟`, ask: `${AR(a)} × ${AR(b)} = ؟`, choices: [ans, ans + a, ans - a], answer: ans },
      { say: `شطور! الإجابة ${AR(ans)}.`, final: ans },
    ];
    return base;
  },
  pick(m, seed) {
    const { a, good } = m; const th = pick(THINGS, seed);
    return {
      readaloud: [`السؤال بيقول: اختار كل الأعداد اللي من مضاعفات ${AR(a)}.`, `مضاعفات ${AR(a)} يعني الأعداد اللي بنوصلها لما نعدّ بالنطّ ${AR(a)}: ${skipCount(a, 5).join('، ')}…`, 'أي عدد في القائمة موجود في النطّ ده، اختاره.'],
      story: [`بتنطّ على البلاط ${AR(a)} بلاطات كل نطّة.`, `البلاطات اللي بتقف عليها: ${skipCount(a, 5).join('، ')}…`, `الأعداد دي هي مضاعفات ${AR(a)}. اللي مش بتقف عليها، مش مضاعفات.`],
      reallife: [`لو كل ${th.unit} فيه ${AR(a)} ${th.many}، عدد الـ${th.many} الكلّي لازم يبقى من مضاعفات ${AR(a)}: ${skipCount(a, 4).join('، ')}…`, `عدد زي ${AR(good[0] + 1)} مينفعش، لأنه مش في النطّ.`],
      steps: [
        { say: `عدّ بالنطّ ${AR(a)}: ${AR(a)}، ${AR(a * 2)}، وبعدين؟`, ask: `${AR(a * 2)} + ${AR(a)} = ؟`, choices: [a * 3, a * 3 + 1, a * 2 + 1], answer: a * 3 },
        { say: `تمام! كمّل: ${skipCount(a, 10).join('، ')}. دول كلهم مضاعفات ${AR(a)}. شوف القائمة واختار اللي منهم!`, final: good.map(AR).join('، ') },
      ],
    };
  },
  add(m) {
    const { a, b, ans } = m;
    return {
      readaloud: [`السؤال بيقول: ${AR(a)} زائد ${AR(b)} يساوي كام؟`, 'زائد يعني نضيف ونجمع.'],
      story: [`عندك ${AR(a)} عربية، وماما جابت لك ${AR(b)} كمان. بقى عندك كام؟`],
      reallife: [`معاك ${AR(a)} جنيه ولقيت ${AR(b)} جنيه. اجمعهم.`],
      steps: [{ say: `ابدأ من ${AR(a)} وعدّ ${AR(b)} خطوات لقدّام. وصلت لكام؟`, ask: `${AR(a)} + ${AR(b)} = ؟`, choices: [ans, ans + 1, ans - 1], answer: ans }, { say: `شطور! ${AR(ans)}.`, final: ans }],
    };
  },
  sub(m) {
    const { a, b, ans } = m;
    return {
      readaloud: [`السؤال بيقول: ${AR(a)} ناقص ${AR(b)} يساوي كام؟`, 'ناقص يعني نشيل ونبعد.'],
      story: [`عندك ${AR(a)} بونبوني، أكلت ${AR(b)}. باقي كام؟`],
      reallife: [`معاك ${AR(a)} جنيه، اشتريت بـ${AR(b)}. الباقي؟`],
      steps: [{ say: `ابدأ من ${AR(a)} وارجع ${AR(b)} خطوات لورا. وصلت لكام؟`, ask: `${AR(a)} − ${AR(b)} = ؟`, choices: [ans, ans + 1, Math.max(0, ans - 1)], answer: ans }, { say: `شطور! ${AR(ans)}.`, final: ans }],
    };
  },
};

/** generic fallback for questions without meta (quran/story phases, static quizzes) */
function generic(q) {
  const strip = (t) => String(t || '').replace(/<[^>]+>/g, '').trim();
  const text = strip(q.q || q.prompt); const hasChoices = Array.isArray(q.choices) && q.choices.length; const hint = strip(q.baladi);
  return {
    readaloud: [text ? `السؤال بيقول: ${text}` : 'خد نفس، وهنقرا السؤال سوا كلمة كلمة.', 'اقرا كل كلمة على مهلك. لو كلمة صعبة، اسمعها تاني.'],
    story: [hint ? `فكّر في المعنى: ${hint}` : 'افتكر الحكاية اللي سمعناها، الإجابة جواها.', hasChoices ? 'شوف الاختيارات واحدة واحدة، وشيل اللي أكيد غلط.' : 'جرّب تقول الإجابة بصوتك الأول.'],
    reallife: [hasChoices ? 'طريقة الاستبعاد: امسح في دماغك الاختيارات اللي مش منطقية، هيفضل واحد أو اتنين.' : 'قول لنفسك السؤال بكلامك انت، كأنك بتحكيه لصاحبك.'],
    steps: [{ say: 'خطوة ١: اسمع السؤال تاني.', ask: 'سمعته؟', choices: ['أيوه', 'تاني'], answer: 'أيوه' }, { say: hasChoices ? 'خطوة ٢: اختار الاختيار اللي حاسّه أقرب، ولو غلط هنشرح ليه.' : 'خطوة ٢: جرّب إجابتك، ولو غلط هنشرح ليه.', final: '' }],
  };
}

export const STRATEGIES = [
  { id: 'readaloud', title: 'اقرأهالك', icon: 'headphones' },
  { id: 'story', title: 'حدوتة', icon: 'book' },
  { id: 'reallife', title: 'من حياتك', icon: 'home' },
  { id: 'steps', title: 'خطوة خطوة', icon: 'ladder' },
];

function shuffleStable(arr, seed) { const a = [...arr]; let s = Math.abs(seed | 0) || 1; for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** build the explanation plan for a question */
export function plan(q, seed = Date.now()) {
  const m = q?.meta; const built = m && KIND[m.kind] ? KIND[m.kind](m, seed) : generic(q || {});
  const fmtv = (v) => (typeof v === 'number' ? AR(v) : String(v));
  const steps = (built.steps || []).map((s) => ({ ...s, choices: s.choices ? shuffleStable(s.choices.map(fmtv), seed) : undefined, answer: s.answer != null ? fmtv(s.answer) : undefined, final: s.final !== undefined ? fmtv(s.final) : undefined }));
  return {
    strategies: STRATEGIES.map((s) => s.id),
    get(id) { const meta = STRATEGIES.find((s) => s.id === id) || STRATEGIES[0]; return id === 'steps' ? { ...meta, lines: [], steps } : { ...meta, lines: built[id] || built.readaloud, steps: null }; },
    /** order for "still don't get it": the child's proven best strategy first, then rotate */
    order(preferred) { const ids = STRATEGIES.map((s) => s.id); if (preferred && ids.includes(preferred)) { ids.splice(ids.indexOf(preferred), 1); ids.unshift(preferred); } return ids; },
  };
}

/** plain-Arabic script for the parent (Parent Mode): exactly what to say, step by step */
export function parentScript(q) {
  const p = plan(q, 7); const ra = p.get('readaloud').lines, st = p.get('story').lines, steps = p.get('steps').steps || [];
  const out = [];
  out.push({ h: 'ابدأ بالهدوء', t: 'اقعد جنبه، مش قصاده. قول له: "السؤال ده حلو، هنحلّه سوا". اقرا له السؤال بصوتك ببطء، كلمة كلمة، وخلّيه يعيد وراك.' });
  out.push({ h: 'اقرا له السؤال بكلام بسيط', t: ra.join(' ') });
  out.push({ h: 'احكي له الحدوتة دي', t: st.join(' ') });
  if (steps.length) out.push({ h: 'خطوة خطوة (اسأله، واستنى إجابته قبل ما تكمّل)', t: steps.map((s, i) => `${AR(i + 1)}) ${s.say}${s.ask ? ` — اسأله: "${s.ask}"` : ''}`).join('\n') });
  out.push({ h: 'لو غلط', t: 'متقولش "غلط". قول: "قريب! خلينا نعدّ تاني سوا" وارجع خطوة واحدة بس.' });
  out.push({ h: 'لما يجيب صح', t: 'خلّيه هو اللي يقولها بصوت عالي، وقول له: "إنت اللي وصلت لها لوحدك!"' });
  return out;
}

export default { plan, parentScript, STRATEGIES };
