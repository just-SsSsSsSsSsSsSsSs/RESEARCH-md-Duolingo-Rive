#!/usr/bin/env bash
# ============================================
#  سكريبت الرفع التلقائي إلى GitHub
#  الاستخدام:
#    GITHUB_TOKEN=<token> bash push_gh.sh "رسالة الكوميت"
#  التوكن لا يُخزَّن في أي مكان — يُمرَّر متغيّر بيئة لمرة واحدة فقط
# ============================================
set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN is not set"
  exit 1
fi

REPO="html-mobile-audio/html-mobile-audio"
MSG="${1:-تحديث تلقائي من مساحة العمل}"
TMP=$(mktemp -d)

echo "⬇️  استنساخ الريبو..."
git clone --quiet "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$TMP/repo"

echo "🔁 مزامنة المجلدات..."
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
SYNC "/home/user/quran"        "$TMP/repo/quran-albayyinah"
SYNC "/home/user/selim_math"   "$TMP/repo/selim-math-arabic"
SYNC "/home/user/selim_table3" "$TMP/repo/episodes-selim"

cd "$TMP/repo"
git config user.name "Selim Family Apps (auto)"
git config user.email "selim-family@users.noreply.github.com"
git add -A

if git diff --cached --quiet; then
  echo "✅ مفيش تغييرات جديدة — الريبو محدّث أصلًا"
else
  git commit --quiet -m "$MSG"
  git push --quiet origin main
  echo "🚀 تم الرفع: $MSG"
  git ls-remote --heads origin main | awk '{print "📌 commit:", substr($1,1,7)}'
fi

cd / && rm -rf "$TMP"
echo "✨ خلصنا"
