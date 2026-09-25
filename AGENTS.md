# AGENTS.md - دستور العمل الإلزامي لأي وكيل / مطور على هذا المستودع

> هذا الملف يُقرأ أولاً في كل جلسة، قبل أي أمر. قواعده غير قابلة للنقاش ولا تتغير إلا بقرار المالك المكتوب.
> النسخ الأخرى من هذه القواعد: `genspark_ai_developer/RESUME.md` (مختصر) و رأس `genspark_ai_developer/PROGRESS.md`.
> البرومبت الثابت للاستئناف (لكل المراحل، بلا ذكر أي مرحلة) موجود في نهاية هذا الملف.

## 0. روابط العيلة الدائمة (لا تُحذف - يفحصها tools/check_family_links.py)

| الوصف | الرابط |
|---|---|
| رابط العيلة - الرؤية التربوية وخارطة الطريق (تفريغ حرفي + نسخة منظمة) | <https://gist.github.com/pijsal1-tech/67494737afb25c7b338ad5cb6112c58f> |
| تقرير Phase 17 والانتقال للمستودع الجديد | <https://gist.github.com/pijsal1-tech/c03b8983a400ab706345dd19958087d4> |
| المستودع الرئيسي (GitHub) | <https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive> |
| المنصة المباشرة (GitHub Pages) | <https://just-ssssssssssssssss.github.io/RESEARCH-md-Duolingo-Rive/app/index.html> |

## 1. ترتيب بداية كل جلسة (بعد أي Sandbox reset)

1. `git clone` أو `git pull` لفرع `genspark_ai_developer`.
2. اقرأ بالترتيب: `AGENTS.md` (هذا) -> `genspark_ai_developer/PROGRESS.md` (آخر سطر = آخر نقطة استئناف) -> `genspark_ai_developer/RESUME.md` -> `app/content/family.json` (خارطة المراحل: `status: current` هي المرحلة الحالية).
3. **تحقق قبل التنفيذ (ممنوع الأخذ العمياني):** قارن ما هو مسجل «تم» في PROGRESS.md مع الفرع الفعلي (`git log`، وجود الملفات، `app/version.json`). ما سُجّل «تم» ولم تجده على الفرع تُعِده؛ ما تجده موجوداً لا تعيده. سجّل نتيجة الفحص كأول سطر resume في PROGRESS.md.
4. **جمّد الخطة:** إن كانت للمرحلة الحالية خطة مجمّدة في PROGRESS.md نفّذها بلا تغيير. إن كانت مرحلة جديدة: بحث موثّق أولاً (ملحق في `workspace--RESEARCH/RESEARCH.md`)، ثم خطة مجمّدة بـchunks صغيرة تُكتب في PROGRESS.md، ثم تنفيذ.

## 2. قواعد الرفع (حماية الحساب من التصنيف كبوت + حماية العمل من الضياع)

- **ممنوع AI Drive** نهائياً. العمل محلياً في الساندبوكس، والحفظ على GitHub فقط.
- **ممنوع الـPush بعد كل اختبار صغير**، وممنوع أي سكربت يرفع commits آلياً في حلقة.
- **الفاصل الزمني بالتوازي:** عند إنجاز خطوة معتبرة ومرور **10-15 دقيقة** على آخر push -> push واحد يحمل الخطوة + تحديث PROGRESS.md. بلا حد أقصى يومي.
- **استثناء الإنجاز:** اكتمال ميزة كاملة بنجاح اختباراتها -> push فوري بدون انتظار.
- **لا force-push** على الفرع المشترك. الـsquash (إن لزم) محلياً قبل الـpush الوحيد.
- **PR واحد فقط** عند اكتمال المرحلة كلها، وبعد اكتمال بوابة الجودة (البند 4).
- هوية الكوميت = حساب المالك الحالي (`git config user.name/email` على noreply الخاص بالحساب).
- **حساب GitHub واحد.** لا يُنشأ حساب جديد تحت أي ظرف (سبب التعليقات السابقة).

## 3. الأمان

- **لا توكنات ولا مفاتيح في أي ملف أو commit أو gist أو رسالة عامة.** المفاتيح في `.env` (git-ignored) فقط، وتُستخدم في الأوامر مباشرة.
- `tools/check_family_links.py` يرفض أي ملف يحوي نمط توكن.
- التوكن المكشوف يُعتبر ميتاً: يُبلَّغ المالك لإبطاله فوراً.

## 4. بوابة الجودة قبل أي PR

1. كل الـsuites في `app/tests/` PASS (مع تشغيل خادمَي `tools/serve.py 8080` و`8090`). المستثنى الموثّق: `behaviour.py` (قبل K3)، `emoji_sweep.py`، `shots_calmjoy.py`.
2. `python3 tools/check_family_links.py` PASS.
3. Zero-Emoji في الكود والوثائق الجديدة (`app/tests/emoji_audit.py`).
4. الملفات المحمية بلا تغيير (sha256 = HEAD): `plant.html`, `math.html`, `albayyinah.html`, `quran-alqadr/index.html`, `PROJECT_VISION.md`.
5. `python3 tools/bump_version.py <x.y>` (يجدد importmap) + `cachebust.py` PASS.
6. README: **append-only** (قسم للمرحلة في النهاية)؛ `family.json`: المرحلة الحالية -> `done`، التالية -> `current`.
7. معاينة خارجية مُتحقَّق منها (0 console errors، 0 طلبات 4xx).

## 5. قواعد المنتج الثابتة

- **K3:** لا كشف للجواب بعد أول غلطة؛ شريط «جرّب تاني» فقط.
- لا تبعيات ثقيلة (لا Rive/Lottie/frameworks)؛ pure-web، ES modules، WAAPI/CSS للحركة.
- كل عنصر زخرفي (رفقاء، مؤثرات): `aria-hidden`، `pointer-events: none`، لا يغطي نصاً أو زراً، ويحترم `prefers-reduced-motion`.
- الطاقم والمحتوى **data-driven** (JSON) وقابل للتوسع بلا كود.
- **روابط العيلة** (`app/content/family.json` ونسخها) خط أحمر لا يُحذف.
- **رصيد التوليد:** إن نفد -> لا توقف ولا ارتجال؛ وثّق في PROGRESS.md واستكمل في الجلسة التالية.
- كل ادعاء في أي gist أو رسالة يُفحص بدليله قبل التنفيذ. لا تخمين.

## 6. نهاية كل رد

سطر واضح في `genspark_ai_developer/PROGRESS.md` يحدد بالملي: ما تم، ما التالي، ورابط PR/معاينة إن وُجد.

## 7. برومبت الاستئناف الثابت (لكل المراحل)

يرسله المالك كما هو في بداية كل جلسة، مع سطر التوكنات فقط (لا يُنسخ التوكن هنا):

```text
ابدأ فوراً. استئناف بعد Sandbox reset.
المستودع: <owner>/RESEARCH-md-Duolingo-Rive | الفرع: genspark_ai_developer
GITHUB_TOKEN: <...> | FISH_API_KEY: <...>
(التوكنات تُستخدم في الأوامر و .env فقط؛ ممنوع كتابتها في أي ملف أو commit أو gist.)
المبدأ: البرومبت ثابت لكل المراحل؛ المستودع هو مصدر الحقيقة الوحيد. لا تفترض أي مرحلة من هذه الرسالة.
نفّذ AGENTS.md بالترتيب: pull -> اقرأ AGENTS/PROGRESS/RESUME/family.json -> تحقق من الفرع قبل التنفيذ -> جمّد الخطة -> نفّذ بقواعد الرفع والأمان -> بوابة الجودة -> PR واحد عند اكتمال المرحلة -> سطر ختامي في PROGRESS.md.
```
