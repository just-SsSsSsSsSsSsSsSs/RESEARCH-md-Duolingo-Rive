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

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

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
- [x] K7: PR #3 → https://github.com/html-mobile-audio/html-mobile-audio/pull/3 (commit مضغوط 3102f49+)
**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.
**نقطة الاستئناف التالية:** معالجة ملاحظات المراجعة على PR #3، أو بعد الدمج: Backlog RESEARCH.md §5 (اقتراح: K8 شارات SVG لصفحة الـHome/Profile، K9 وضع Focus أيضاً في quests، K10 تحسين أداء الحفلات على أجهزة ≤2GB).

---

## المرحلة 6 — Pure-Web & Arcade (PR #4)

**المصدر:** Gist `2cbbacc528490ed49f2492cdac99b6c0` (4 توجيهات معمارية) + رسالة المستخدم.
**خط الأساس:** `origin/main @ 4f10d21` (PR #3 مدموج). `emoji_audit.py` = **269 إيموجي في 27 ملف**.

### التشخيص
| # | المشكلة | السبب | الحل |
|---|---|---|---|
| 1 | كاش معلّق / تحديثات لا تصل | SW + manifest (PWA) | حذف `sw.js` + `manifest.webmanifest`، إزالة `<link rel=manifest>`، كود إلغاء تسجيل + مسح كاش عند الإقلاع |
| 2 | الحفلات خلف الكارت | `#bubbles` z-index 0 والكروت معتمة 0.92 | كانفاس ثانٍ `#fx-canvas` (`fixed; inset:0; z-index:9999; pointer-events:none`) يرسم كل جسيمات الاحتفال؛ الفقاعات المحيطة تبقى خلفاً |
| 3 | 269 إيموجي كيبورد | نصوص/كتالوج/شارات/HUD | مكتبة `icons3d.js` (SVG مجسّمة بتدرجات+لمعة+ظل) + `ico3d(name)` + استبدال شامل + فحص آلي = 0 |

### الخطة (push-per-chunk)
- [x] P1: إزالة PWA (sw.js/manifest/link) + كود unregister/caches.delete في app.js
- [x] P2: طبقة FX أمامية: `#fx-canvas` z-index 9999، تقسيم محرك bubbles → ambient (خلف) / fx (أمام)، floaters/combo z-index 9999
- [x] P3: `icons3d.js` — أيقونات SVG مجسّمة: heart, gem, flame, bolt, trophy, crown, star, medal, book, quran, mosque, calc, pen, headphones, target, shield, gear, moon, sun, compass, owl, brain, rocket, check, x, lock, gift, chart, bubble, seedling…
- [x] P4: كنس الإيموجي: HUD/components/home/profile/parent/play/quests/badges/subject/certificate/store/generators/renderers/fx/catalog.json/activities/*.json/index.html
- [x] P5: `emoji_audit.py` = 0 + اختبار طبقات (fx canvas فوق الكارت) + e2e + viewports + navoverlap
- [x] P6: → https://github.com/html-mobile-audio/html-mobile-audio/pull/4 (squash 683cec6) RESEARCH.md (Append-Only) مراجع المنصات + PROGRESS + PR #4

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.
**نقطة الاستئناف التالية:** معالجة ملاحظات المراجعة على PR #4، أو بعد الدمج: شخصية مرشدة ثابتة (Duo/Kodi-style) + تقارير أهل أسبوعية + Focus mode في quests (Backlog RESEARCH.md §5 + ملحق Pure-Web).

---

## Hotfix — PR #5: تسريب كود SVG كنص (innerHTML + hud title escaping)

**التشخيص:** (1) `renderers.js:66` استخدم `textContent` مع ناتج `ico3d('cross')`؛ (2) `parent.js:48` نفس الشيء في رسالة PIN؛ (3) `hud()` يمرّ `title` عبر `esc()` بينما badges/quests/subject تحقن SVG داخل العنوان.
**الإصلاح:** `innerHTML` في الموضعين؛ `hud({ icon, title })` — الأيقونة اسم موثوق يُصيَّر HTML، والعنوان نص دائماً مُهرَّب. اختبار انحدار جديد `svg_leak.py` (ثابت + وقت تشغيل: لا `<svg` في `innerText` على أي صفحة، وأيقونة العنوان عنصر حقيقي).
- [x] H1 إصلاح renderers/parent/hud/views + CSS
- [x] H2 svg_leak.py ✅ emoji_audit ✅ layering ✅ e2e ✅ viewports ✅ navoverlap ✅ (+ answer-box inline layout)
- [x] H3 PR #5 → https://github.com/html-mobile-audio/html-mobile-audio/pull/5 (squash 263822a)

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.
**نقطة الاستئناف التالية:** معالجة ملاحظات المراجعة على PR #5، أو بعد الدمج: شخصية مرشدة ثابتة (Duo/Kodi-style) + تقارير أهل أسبوعية + Focus mode في quests (Backlog RESEARCH.md §5 + ملحق Pure-Web).

---

## المرحلة 7 — Grand Benchmark: «ازرع نبتة» الحديثة + Cache-Busting (PR #6)

**المصدر:** Gist `b967caafc88f3cc48eccc9c4b50ac6f6` (4 ركائز) + رسالة المستخدم. **خط الأساس:** `origin/main @ f097e18` (PR #5 مدموج).
**قاعدة ذهبية:** `plant.html` لا يُمَسّ (1,293,786 بايت — يُتحقق بـsha256 قبل/بعد).

### جرد `plant.html` الأصلي (للمقارنة)
- صوت: `SND` فصحى 12 مقطعاً (welcome/story/tf1-3/complete/q1-3/personal/praise/gentle) + `SNDX` بلدي 10 مقاطع (+map) = **22 مقطع MP3 base64** (~1.2MB)
- نص القصة المشكول (9 جمل) + شرح بلدي لكل سؤال (`BALTXT`)
- 9 خطوات تقويم: 3 صواب/خطأ، 1 أكمل، 2 فهم، خريطة ذهنية (6 فقاعات)، 1 فهم، سؤال تعبير شخصي
- ما ينقصه: لا XP/جواهر/شارات، إيموجي كيبورد، كونفيتي DOM، بلا مشغل صوتي (تشغيل فقط)، لا ترتيب أحداث، لا مقارنة

### الخطة (push-per-chunk)
- [x] G1: استخراج الصوتيات إلى `app/content/audio/plant/{fusha,baladi}/*.mp3` (ملفات حقيقية بدل base64 → تحميل كسول + كاش متصفح) + `app/content/activities/plant_story.json` (نص/جمل/أسئلة/خريطة/ترتيب)
- [x] G2: Cache-Busting — `?v=6.0` لكل CSS/JS في `index.html` + `import()` للراوتر بـ`APP_VERSION` + سكربت `tools/bump_version.py` + اختبار
- [x] G3: أيقونات جديدة في `icons3d.js`: seed, sprout, pot, wateringCan, flower, book pages, play/pause/replay, speakerFusha/Baladi
- [x] G4: `story` renderer/view جديد `app/js/ui/views/story.js` + مسار `#/play/plant_story`: مشغل صوتي مزدوج (فصحى/بلدي) بأزرار 3D، تقدم، تمييز الجملة الجارية، إظهار/إخفاء النص، تحكم سرعة
- [x] G5: المراحل الأربع: TF (كروت) → MCQ (فهم+أكمل) → ترتيب أحداث (لمس/سحب) → خريطة ذهنية (6 فقاعات) → تعبير شخصي؛ XP/جواهر/إتقان/شارات/مهام + party FX أمامي عند الختام
- [x] G6: زر مقارنة (كلاسيك ↔ حديث) في HUD الصفحة + catalog entry + شارة `plant_story_1`
- [x] G7: RESEARCH.md (Append-Only): مواصفات icons3d + مقارنة Duolingo 3D/SF Symbols/Nintendo + رادار قصص (Duolingo Stories, Epic!, Reading Eggs, Vooks, Khan Kids)
- [x] G8: اختبارات: `plant_story.py` جديد (صوت يشتغل، تبديل، 4 مراحل، XP) + كل الـsuites (emoji_audit 0، svg_leak، layering، e2e، viewports، navoverlap) + sha256 لـplant.html
- [x] G9: PROGRESS + PR #6 بجدول مقارنة هندسي/تربوي

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

### نتائج المرحلة 7 (مُجمَّعة)
- **صوت:** 22 مقطع MP3 مستخرج من plant.html (12 فصحى + 10 بلدي) إلى `app/content/audio/plant/{fusha,baladi}/` — plant.html sha256 `fb197ed2…722c` سليم 100%.
- **محرك:** `engines/storyAudio.js` (تبديل لهجة أثناء التشغيل بنفس الموضع، سرعة، seek، fallback عند غياب مقطع).
- **واجهة:** `views/story.js` + `views/storyQuestions.js` + `css/story.css` — غلاف → مشغّل 3D مع إضاءة الجملة → 4 مراحل (صحيح/خطأ، فهم+أكمل، ترتيب أحداث، خريطة ذهنية 6 فقاعات) → تعبير شخصي (دفتر) → نتائج مع حفلة أمامية.
- **مقارنة:** زر «كلاسيك ↔ حديث» في شريط القصة يفتح plant.html الأصلي داخل iframe.
- **Cache-Busting:** importmap + `?v=6.0` على 100% من CSS/JS/JSON/MP3؛ `tools/bump_version.py`؛ `tests/cachebust.py`.
- **أيقونات:** 19 جديدة (102 إجمالاً). **شارات:** `plant_story_1`، `plant_story_master`.
- **اختبارات:** 8 suites خضراء بما فيها `plant_story.py` (mobile+desktop).
- **PR #6:** https://github.com/html-mobile-audio/html-mobile-audio/pull/6 (مفتوح — commit واحد مُجمَّع فوق main)

---

## المرحلة 8 — Story Polish (تُدمج داخل PR #6 قبل الدمج) — خطة مجمّدة

> PR #6 ما زال مفتوحًا → نُكمل على نفس الفرع ثم نعيد الـsquash إلى commit واحد ونحدّث وصف PR #6.

- [x] H1: توقيتات دقيقة للجُمل: تحليل `story.mp3` (فصحى + بلدي) لاستخراج أزمنة كل جملة → `story.timings.{fusha,baladi}` في `plant_story.json`؛ `story.js` يستخدمها إن وُجدت وإلا يعود للتقدير النسبي
- [x] H2: واجهة «دفتري» في صفحة البروفايل لعرض إجابات التعبير الشخصي المحفوظة (`profile.journal`)
- [x] H3: أيقونات backlog صغيرة: `soil`, `rainDrop`, `speechBubble`, `bookmark` (+ استخدامها في الدفتر/القصة)
- [x] H4: اختبارات (plant_story.py يتحقق من timings + journal view) + كل الـsuites + squash + تحديث وصف PR #6

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

---

## المرحلة 9 — Dynamic Replayability · المصحف التفاعلي · Math Lab (→ PR #7) — خطة مجمّدة

> الأساس: `origin/main @ 095e8d1` (PR #6 مدموج). ملفات محمية (sha256 مسجّلة): `albayyinah.html` aac6bafb…، `math.html` 694859aa…، `quran-alqadr/index.html` 52758e3f…، `plant.html` fb197ed2…

- [x] I1: أصوات المصحف: تنزيل آيات البينة (98:1–8) والقدر (97:1–5) + بسملة بصوت **الحصري المعلم** و**المنشاوي** (everyayah.com) → `app/content/audio/quran/{husary,minshawi}/{098,097}_NNN.mp3` + توقيتات (كل آية ملف مستقل = تظليل دقيق 100%)
- [x] I2: بيانات `quran_bayyinah.json` و`quran_qadr.json` (نص عثماني، تفسير ميسر بالبلدي لكل آية، مراحل: ترتيب آيات + أكمل الكلمة + اختيار معنى) — النمط `type:"quran"`
- [x] I3: `views/quranReader.js` + `css/quran.css`: مصحف تفاعلي (Dual Engine حصري↔منشاوي، تظليل الآية الجارية، القفز باللمس، تشغيل متسلسل، تكرار آية، شريحة تفسير بالبلدي، تبديل كلاسيك↔حديث → albayyinah.html / quran-alqadr/index.html)
- [x] I4: مراحل قرآنية (ترتيب/أكمل/معنى) بنفس renderers القصة + احتفال foreground + XP/شارات `quran_reader_1`
- [x] I5: Math: مولّدات إضافية (`grid` شبكة مصفوفة، `pick` اختيار النواتج) + renderer `grid` + كل نشاط رياضيات يصبح generator-only (zero static)؛ اختبار عشوائية: جلستان متتاليتان ≠ ترتيب/أرقام
- [x] I6: زر كلاسيك↔حديث في شريط مادة الرياضيات (`math.html`) والقرآن
- [x] I7: اختبارات `quran_reader.py` + `math_random.py` + كل الـsuites + sha256 للمحميات + PROGRESS + squash + PR #7

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

---

## Phase 10 — «يعني إيه يا بابا؟» + سارينة الإنجاز + تحليل السلوك (من gist RO4_.md) → PR #8

**المصدر:** https://gist.github.com/pijsal1-tech/7c51347c47d953b36618577cacb5baa2 — 4 مهام: Audit + 3 ميزات. قيود غير قابلة للتفاوض: صوت أولًا، عامية مصرية، لا hardcoded (كل إعداد من لوحة الأب)، لا كسر لأي وظيفة، الملفات المحمية لا تُلمس، Zero-Emoji.

**قرارات تقنية (مجمّدة):**
- TTS: Web Speech API (`speechSynthesis`, صوت عربي إن وُجد) + تظليل كلمة-كلمة (karaoke) عبر `onboundary` وfallback زمني. لا backend.
- الشرح: قوالب حتمية بالعامية مولّدة من meta السؤال (kind/skill/operands) — 4 أساليب: `readaloud` (اقرأهالك) / `story` (حدوتة) / `reallife` (من حياتك) / `steps` (خطوة-خطوة تفاعلي بأسئلة صغيرة، الإجابة النهائية في الآخر فقط). «لسه مش فاهم» = أسلوب مختلف فعلًا (دورة بلا تكرار).
- السارينة: Web Audio API مُولَّدة برمجيًا (police_siren_eg two-tone sweep / school_bell / applause / victory_tune) — بلا ملفات، بلا حقوق. Loop حتى المدة + fade-out + حد أقصى للصوت + تتوقف عند الخروج.
- الإعدادات لكل طفل في `profile.settings.celebration` و `profile.settings.explain` و `profile.settings.adaptive` — من لوحة الأب فقط، تسري فورًا.
- Telemetry: `profile.events[]` (سقف 3000) — `question_shown / question_attempted{skill, correct, attempts, time_ms, wrong_value} / explanation_requested{strategy, solved_after} / stage_completed`. كل مولّد يضيف `skill` دقيقة (مثل «جدول ٣»، «العدد المفقود»، «الشبكة»، «مضاعفات»، «التوزيع»، «التبديل»، «ترتيب الآيات»...).
- التحليل rule-based شفاف (`engines/insights.js`): خريطة إتقان لكل مهارة (نسبة/اتجاه/ثقة)، أنماط الخطأ (جدول مجاور، جمع بدل ضرب، عكس أرقام)، مؤشرات (اندفاعي، مثابرة، تعب، إحباط، أنفع أسلوب شرح، أفضل وقت). الفعل: نشاط «تدريب مخصص» ديناميكي لأضعف 2–3 مهارات، تأخير قبول الإجابة للاندفاعي، اقتراح راحة عند التعب، تقرير الأب + «إزاي أشرحها لابني؟» سكريبت.

**Chunks:**
- [x] J0: تجميد الخطة (هذا) + push
- [x] J1: `genspark_ai_developer/AUDIT_REPORT.md` — audit حقيقي للريبو (بنية، stack، data model، لوحة الأب، الموجود صوت/تتبع، tech debt، أمان/خصوصية) + push
- [x] J2: `engines/telemetry.js` + `skill` في المولّدات + ربط Session/play/phaseRunner + push
- [x] J3: `engines/speech.js` + `engines/explain.js` + زر «يعني إيه يا بابا؟» (bottom sheet، karaoke، لسه مش فاهم، steps) + CSS + push
- [x] J4: `engines/celebration.js` (4 أصوات مولّدة) + إعدادات لوحة الأب + إطلاق عند 100% فقط + parent alert + push
- [x] J5: `engines/insights.js` + تقرير الأب (أضعف 3 + نمط الخطأ + الأثر + سكريبت) + «تدريب مخصص» على الرئيسية + adaptive (delay/break) + push
- [x] J6: `app/tests/phase10.py` + كل الـsuites + bump + PROGRESS + squash + PR #8

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.
