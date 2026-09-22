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
- [x] L1: `sound.js` v2 — wrong لطيف، correct متنوع (5 أنماط + تصاعد سُلَّمي مع combo)، cheer متغير، pop متنوع، "sparkle", "whoosh" محسّنة
- [x] L2: `bubbles.js` v2 — فقاعات أوضح (أكبر، rim قوسي زجاجي، ألوان أزهى، حركة أحيا)، **celebrate(x,y,intensity)**: انفجار متعدد الأشكال (نجوم/قلوب/دوائر/حلقات) + موجة صدمة + فقاعات مكافأة تُفرقع تلقائياً
- [x] L3: `fx.js` — طبقة احتفال DOM: نص عائم (+XP / برافو!) + shake/pulse للكارت + combo counter
- [x] L4: `fx.css` — أزرار 3D tactile، hit ≥48px، hover فقط على (hover:hover)، pointer:coarse، clamp()، dvh، breakpoints 360/700/1024/landscape
- [x] L5: ربط play.js + renderers.js (celebrate على موضع الإصبع + combo + floaters) + إعداد "شدة الاحتفال" في البروفايل + كروت أشف لإظهار الفقاعات
- [x] L6: e2e.py + viewports.py أخضر على 4 أجهزة (0 أخطاء، أهداف ≥44px، لا overflow، FX يعمل) + لقطات مراجَعة
- [x] L7: PR #2 → https://github.com/html-mobile-audio/html-mobile-audio/pull/2

**آخر تحديث:** ✅ المرحلة 4 مكتملة — PR #2 مفتوح للمراجعة. نقطة الاستئناف التالية: معالجة ملاحظات المراجعة على PR #2 أو Backlog RESEARCH.md §5.

---

## 🌿 المرحلة 5 — "Calm & Joy": راحة العين + بهجة مفاجئة (PR #3)
**المصدر:** Gist pijsal1-tech/55b6e6f0… (3 تكليفات) + توجيه المالك: (1) راحة عين بدون زغللة، (2) بهجة/حفلات مفاجئة عند الصح.

### 🔬 التشخيص
| المشكلة | السبب الجذري | الملف |
|---|---|---|
| البار السفلي يغطي آخر الكروت | `#app{padding-bottom: calc(var(--nav-h)+24px)}` لكن `@media(pointer:coarse){.nav{--nav-h:70px}}` يغيّر المتغير على `.nav` فقط، فـ `#app` يظل يحسب 64px، والهامش 24px غير كافٍ | `base.css`, `fx.css` |
| فقاعات فاقعة تُجهد العين | v2 بالغت: alpha 0.75–1، هالة `r*1.6`، rim `0.95*A` سميك، حتى 34 فقاعة، وكروت شفافة 0.58 | `bubbles.js`, `tokens.css` |
| الكاش القديم يعلق | SW cache-first بدون إشعار تحديث؛ `skipWaiting` موجود لكن لا يوجد reload/toast | `sw.js`, `app.js` |
| شارات إيموجي قديمة | `badges.js` يستخدم `icon: '🚀'` نصياً | `badges.js`, `badges.css` |
| الاحتفال متشابه | `celebrate()` نوع واحد (burst) | `bubbles.js`, `fx.js` |

### 🗺️ الخطة (chunks)
- [x] K1: إصلاح تراكب البار: `--nav-h` على `:root` داخل `pointer:coarse` + `padding-bottom: calc(var(--nav-h) + 36px + safe)` + `scroll-padding-bottom`
- [x] K2: فقاعات هادئة (Ambient Calm Mode): 8–12 فقاعة، alpha 0.18–0.32، بلا هالة، rim ناعم 1.5px، سرعة أبطأ، **تتلاشى تحت الكروت** (كروت معتمة 0.92) — و**تختفي تدريجياً أثناء القراءة (السؤال ظاهر)** وتعود عند الاحتفال
- [x] K3: SW v1.2 network-first للـ shell + toast "نسخة جديدة — تحديث" + auto-reload عند controllerchange
- [x] K4: شارات SVG مجسمة: مولّد `badgeSVG(id)` (درع/دائرة/نجمة متدرجة + ظل + لمعة + أيقونة SVG) بدل الإيموجي، حالة مقفولة رمادية
- [x] K5: Party FX متنوعة: 6 أنواع (poppers شرائط، بلالين تطير وتفرقع، ألعاب نارية، نجوم متلألئة، مطر قلوب، حلقات ضوء) تُختار عشوائياً بدون تكرار متتالٍ + أصوات مطابقة (popper/balloon-pop/firework)
- [x] K6: اختبار: e2e + viewports + اختبار جديد لتراكب البار (آخر عنصر مرئي كامل بعد scroll) + لقطات
- [ ] K7: PR #3
**آخر تحديث:** K2 مكتمل (فقاعات ≤14، alpha 0.20–0.35، بلا هالة، كروت 0.92) → K3 مكتمل (SW v1.2.0 network-first + toast تحديث) → K4 مكتمل (badgeArt.js: 26 ميدالية SVG بطبقات معدنية/لمعة/ظل) → K5 مكتمل (7 أنواع حفلات عشوائية: poppers/balloons/fireworks/sparkles/heartRain/lightRings/confettiCannon + أصوات) → K6 مكتمل (e2e ✅ viewports ✅ navoverlap ✅) → K7 توثيق + PR #3
