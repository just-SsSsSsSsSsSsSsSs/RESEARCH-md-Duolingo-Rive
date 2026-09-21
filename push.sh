#!/usr/bin/env bash
# =====================================================================
#  سكريبت الرفع التلقائي — مستودع مشترك 🏠
#  قانون البيت (اتفاق المساهمين):
#   1) نستنسخ المستودع كاملًا قبل أي رفع.
#   2) نزامن مجلداتنا الثلاثة فقط (quran-albayyinah / selim-math-arabic / episodes-selim).
#   3) ممنوع لمس: index.html (بوابة أبطال البيت المشتركة)، وملفات الجذر *.html،
#      وquran-alqadr، وmath.html، وplant.html، وأي مجلد أو ملف غير تابع لنا.
#   4) التوكن يُمرَّر متغيّر بيئة فقط ولا يُخزَّن أبدًا.
#  الاستخدام:
#    GITHUB_TOKEN=<token> bash push_gh.sh "رسالة الكوميت"
# =====================================================================
set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ خطأ: متغيّر GITHUB_TOKEN غير موجود"
  exit 1
fi

REPO="html-mobile-audio/html-mobile-audio"
MSG="${1:-تحديث تلقائي من مساحة عمل سليم}"
TMP=$(mktemp -d)
MY_DIRS=(quran-albayyinah selim-math-arabic episodes-selim)

echo "⬇️  استنساخ المستودع كاملًا (أمان المزامنة)..."
git clone --quiet "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$TMP/repo"

SYNC() {
  local SRC="$1" DST="$2"
  if [ -d "$SRC" ]; then
    mkdir -p "$DST"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a --delete --exclude='__pycache__' --exclude='~*' "$SRC/" "$DST/"
    else
      rm -rf "$DST" && mkdir -p "$DST"
      cp -r "$SRC/." "$DST/"
      find "$DST" -type d -name '__pycache__' -prune -exec rm -rf {} + 2>/dev/null || true
    fi
  fi
}

echo "🔁 مزامنة مجلداتنا الثلاثة فقط..."
SYNC "/home/user/quran"        "$TMP/repo/quran-albayyinah"
SYNC "/home/user/selim_math"   "$TMP/repo/selim-math-arabic"
SYNC "/home/user/selim_table3" "$TMP/repo/episodes-selim"

cd "$TMP/repo"
git config user.name "Selim Family Apps (auto)"
git config user.email "selim-family@users.noreply.github.com"

# التدريع: لا نضيف إلا مجلداتنا — كل ملفات البيت الأخرى بتظل زي ما هي
git add -- "${MY_DIRS[@]}"

if git diff --cached --quiet; then
  echo "✅ مفيش تغييرات في مجلداتنا — البيت محدّث"
else
  git commit --quiet -m "$MSG"
  git push --quiet origin main
  echo "🚀 تم الرفع: $MSG"
  git ls-remote --heads origin main | awk '{print "📌 commit:", substr($1,1,7)}'
fi

# تأكيد الحماية داخل الريبو
for p in index.html quran-alqadr math.html albayyinah.html plant.html; do
  [ -e "$p" ] && echo "🛡️  محفوظ كما هو: $p"
done

cd / && rm -rf "$TMP"
echo "✨ خلصنا — البوابة المشتركة وملفات الزملاء سليمة"
