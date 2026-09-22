# 🚀 Genspark AI Developer — Live Progress & Context Anchor

> **الغرض من هذا الملف:** نقطة الاستئناف المركزية الحية للوكيل `Genspark AI Developer`.
> يُحدَّث بعد كل chunk (خطوة صغيرة) مع Commit + Push لحظي على فرع `genspark_ai_developer` لمقاومة انقطاع الجلسات (Sandbox resets).

---

## 🔁 برومت الاستئناف (انسخه لما الجلسة تقطع)
```
كمل من آخر نقطة استئناف في ملفك (genspark_ai_developer/PROGRESS.md) على فرعك genspark_ai_developer
في مستودع html-mobile-audio/html-mobile-audio، مستخدماً GITHUB_TOKEN: [التوكن_هنا]،
مع تحديث الفرع والملف لحظياً بكل chunk (push-per-chunk).
```

---

## 📌 الحالة الراهنة (Current State)
- **الفرع:** `genspark_ai_developer` (منشأ من `main` @ 217379a)
- **الحالة العامة:** ✅ المنتج مكتمل (C1–C13) + اختبارات E2E/Behaviour خضراء → PR مفتوح إلى main
- **مجلد المنتج الجديد:** `app/` (منصة معيارية مستقلة — لا تلمس ملفات الجذر المحمية بقانون البيت في `push.sh`)

---

## 🧭 الخطة المجمَّدة (Frozen Plan) — معمارية `app/`
```
app/
  index.html                 shell واحد + hash-router (SPA خفيف بدون frameworks)
  manifest.webmanifest, sw.js (PWA offline)
  css/  tokens.css, base.css, components.css
  js/core/   bus.js (events) · store.js (profiles + schema versioning + export/import) · registry.js (كتالوج ديناميكي) · router.js
  js/engines/ sound.js (Web Audio synth: pop/success/fail/levelup/fanfare)
             bubbles.js (Canvas physics: طفو، تصادم، فرقعة بالمس، DPR-aware، 60fps، pause عند إخفاء التبويب)
             xp.js (منحنى مستويات لا نهائي بصيغة رياضية — لا قائمة ثابتة)
             streak.js (أيام متتالية + Streak Freeze) · hearts.js (5 قلوب + تجدد زمني)
             badges.js (شارات مُعرَّفة كبيانات/شروط — قابلة للتوسع) · quests.js (مهام يومية مولَّدة)
             certificates.js (شهادات فخمة قابلة للطباعة/PDF عبر print)
  js/activities/ quiz.js · truefalse.js · match.js · fillblank.js · order.js  (محركات نوعية تُغذَّى بـ JSON)
  js/ui/  components.js (toast/modal/confetti/SVG icons) · views/ (home, play, badges, parent, profile)
  content/ catalog.json (روابط التطبيقات الحالية + الأنشطة الأصلية) · activities/*.json
```
**مبادئ:** Data-driven 100% (إضافة نشاط = ملف JSON) · Mobile-first RTL · بدون تبعيات ثقيلة · يعمل على GitHub Pages والسيرفر المحلي · 3 ملفات أبطال (سليم/كارما/كندة) مستقلة.

---

## 📋 قائمة المهام (Chunks) — ✅ منجز / 🔄 جارٍ / ⬜ قادم
### المرحلة 1: الاستكشاف ✅
- [x] مراجعة المستودع: index.html (بوابة ثابتة)، math.html، plant.html، albayyinah.html، quran-alqadr، selim-math-arabic، episodes-selim
- [x] مراجعة `workspace--RESEARCH/` (RESEARCH/PLAN/COMPLETE + app.js/phase2-5.js + styles)
- [x] تحليل: نقاط القوة = محتوى صوتي غني + هوية نيون. نقاط الضعف = لا ملفات متعددة (localStorage مسطّح لمستخدم واحد)، مستويات ثابتة (10)، لا فيزياء فقاعات حقيقية، لا Web Audio، محتوى hardcoded في JS، لا محركات أنشطة عامة، لا شهادات فعلية للطباعة.
- [x] تجميد الخطة أعلاه

### المرحلة 2: النواة والواجهة 🔄
- [x] C1: app/css tokens+base+components
- [x] C2: js/core (bus, store, registry, router)
- [x] C3: engines/sound.js + engines/bubbles.js
- [x] C4: engines xp/streak/hearts/badges/quests
- [x] C5: ui/components.js (toast, modal, confetti, icons)
- [x] C6: views home + profile picker + subject + shell + bootstrap
- [x] C7: activities engines (session, generators, renderers) + view play
- [x] C8: content/catalog.json + 13 أنشطة JSON (رياضيات، قرآن، عربي، دين)
- [x] C9: badges + quests + parent dashboard (PIN SHA-256، تقارير ٧ أيام، جدول أنشطة، تصدير/استيراد، تحكم)
- [x] C10: certificate.js شهادة فخمة A4 landscape قابلة للطباعة/PDF + مشاركة
- [x] C11: PWA (manifest+sw+icon) + زر دخول في index.html الجذر + E2E Playwright أخضر (0 أخطاء، 0 طلبات فاشلة)
- [x] C12: RESEARCH.md ملحق مراجع 2026 (append-only) + README قسم المنصة

### المرحلة 3: الاختبار والدمج ⬜
- [x] اختبار محلي (Playwright: e2e.py + behaviour.py) صفر أخطاء، صفر 404
- [x] PR #1: https://github.com/html-mobile-audio/html-mobile-audio/pull/1

---

## 📝 سجل الإنجازات اللحظي (Live Action Log)
- 2026-09-22 02:1x — استعادة السياق بعد reset، إنشاء الفرع، مراجعة كاملة للمستودع والبحث، تجميد الخطة.

---

## 🎯 الخطوة التالية فوراً (Next Immediate Action)
👉 **بعد الدمج:** Backlog في RESEARCH.md §5 (تسميع بالميكروفون، Boss Battles، FSRS، مولّد عربي، مزامنة سحابية، وضع معلّم).
- 2026-09-22T02:30 — reset #2 استعادة من remote (C1–C5 محفوظة)، أعيد بناء C6 ودُفع.
- 2026-09-22T02:40 — reset #3 استعادة من remote، أُكملت C8 (13 نشاط) + shuffle للاختيارات.
- 2026-09-22T02:49 — C9/C10/C11 مكتملة. E2E: 13 نشاط، 5 مواد، لعب كامل، PIN، فقاعات — كله أخضر. أُضيف كارت الدخول للمنصة في index.html الجذر.
- 2026-09-22T02:55 — reset #4 استعادة. C1–C12 كلها على remote. جارٍ C13 hardening.
- 2026-09-22T03:00 — C13 hardening مكتمل: behaviour.py أخضر (قلوب→modal→تعبئة بالجواهر، شهادة، ثيم، PIN، تصدير). فتح PR.

---

## 🎯 المرحلة 4 — "The Leap": استجابة لملاحظات اختبار الأطفال الحي (PR #2)

### 🔬 التشخيص الذاتي (Root Causes) — لماذا خرجت التجربة باهتة؟
| العرض | السبب الجذري في كودي | الملف |
|---|---|---|
| فقاعات "شبه ميتة" | الخلفية داكنة جداً + `globalCompositeOperation='lighter'` مع alpha ضعيفة (0.35 → 0.10 → 0) ورسم `lineWidth 1.4` — الفقاعة تظهر كخط رفيع باهت. سرعة طفو 0.25–0.7px/frame بلا حياة. الـ canvas خلف `#app` وكل الكروت زجاجية تغطيها. | `bubbles.js` |
| لا احتفال عند الإجابة الصحيحة | `ctx.done()` يستدعي `burst(…,4)` بنسبة 35% فقط + confetti فقط في النتيجة النهائية. لا انفجار على موضع الإصبع. | `play.js` |
| صوت الخطأ منفّر | `sawtooth 220→140Hz` + `square` = صوت "buzzer إنذار" صناعي. | `sound.js#wrong` |
| صوت الصح رتيب | نفس 3 نغمات C-E-G كل مرة. | `sound.js#correct` |
| أزرار مسطحة | `.btn/.choice`: border 1.5px + ظل ضعيف + `scale(.96)` — لا عمق ولا "ضغطة" حقيقية. `min-height 46` أقل من 48px (Material) و 44pt (Apple). | `components.css` |
| توافق الأجهزة | لا `clamp()` للخطوط، لا `@media (hover:none)` (hover يعلق على اللمس)، لا `dvh`، لا حجم أكبر للتابلت/ديسكتوب. | `tokens/base/components.css` |

### 📚 مراجع الابتكار 2026 (ألعاب أطفال عالمية)
- **Duolingo**: أزرار 3D بـ `border-bottom: 4px` تنضغط (`translateY(4px)`) — "tactile press". أصوات صح متنوعة من مكتبة، خطأ = "thud" ناعم منخفض بدون sawtooth.
- **Khan Academy Kids / Sago Mini / Toca Boca**: انفجار particles على موضع اللمس، أشكال متعددة (نجوم/قلوب/دوائر)، bounce بـ spring easing، نصوص تشجيعية عائمة (+XP floaters).
- **Endless Alphabet / PBS Kids**: أصوات مولَّدة بـ "musical scale" — كل إجابة نغمة أعلى (تصاعد) تبني إثارة؛ "wrong" = نغمتان هابطتان لطيفتان بـ sine + vibrato.
- **Apple HIG / Material 3**: hit target ≥44pt/48dp، `@media (hover: hover)` فقط للـ hover، `pointer: coarse` لتكبير المسافات، `100dvh` للموبايل.
- **Web Audio best practice**: تجنب sawtooth/square للأطفال؛ استخدم sine/triangle + lowpass + reverb بسيط (convolver noise tail) + humanize (±detune عشوائي).

### 🗺️ خطة التنفيذ (chunks — push بعد كل واحد)
- [ ] L1: `sound.js` v2 — wrong لطيف، correct متنوع (5 أنماط + تصاعد سُلَّمي مع combo)، cheer متغير، pop متنوع، "sparkle", "whoosh" محسّنة
- [ ] L2: `bubbles.js` v2 — فقاعات أوضح (أكبر، rim قوسي زجاجي، ألوان أزهى، حركة أحيا)، **celebrate(x,y,intensity)**: انفجار متعدد الأشكال (نجوم/قلوب/دوائر/حلقات) + موجة صدمة + فقاعات مكافأة تُفرقع تلقائياً
- [ ] L3: `fx.js` — طبقة احتفال DOM: نص عائم (+XP / برافو!) + shake/pulse للكارت + combo counter
- [ ] L4: `components.css` — أزرار 3D tactile (`--btn-depth`)، `.choice` 3D، hit ≥48px، hover فقط على `(hover:hover)`، `pointer:coarse` تباعد، `clamp()` typography، breakpoints tablet/desktop، `dvh`
- [ ] L5: ربط في `play.js` + `renderers.js` (celebrate على موضع الإصبع، combo، floaters) + إعدادات (شدة الاحتفال)
- [ ] L6: اختبار Playwright بـ 4 viewports (Android 360, iPhone 390 @3x, iPad 820, Desktop 1280) + لقطات + E2E قديم أخضر
- [ ] L7: PR #2

**آخر تحديث:** بدء L1
