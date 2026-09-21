#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎙️ أداة توليد الأصوات الذكية (عامية مصرية، قرآن وتجويد، ضحك وهزار)
مدعومة بمحرك Fish Audio فائق الواقعية
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime

# ضبط الترميز لدعم العربية في ويندوز
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# تحميل متغيرات البيئة من ملف .env تلقائياً
def _load_env():
    # محاولة مكتبة dotenv
    try:
        import dotenv
        base_dir = os.path.dirname(os.path.abspath(__file__))
        for p in [os.path.join(base_dir, ".env"), os.path.join(base_dir, "..", ".env"), ".env"]:
            if os.path.exists(p):
                dotenv.load_dotenv(p)
                return
    except ImportError:
        pass

    # قراءة يدوية خفيفة بدون مكتبات
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for p in [os.path.join(base_dir, ".env"), os.path.join(base_dir, "..", ".env"), ".env"]:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
                return
            except Exception:
                pass

_load_env()

# جلب المفتاح بأمان من متغيرات البيئة فقط
DEFAULT_API_KEY = os.environ.get("FISH_API_KEY", "")

# مكتبة النماذج المعتمدة المنسقة
VOICE_PRESETS = {
    # 1. عامي مصري
    "شاب مصري": {
        "id": "73b2c0703c6c4443949ae97092976ce9",
        "title": "⚡ شاب مصري حماسي (تحديات ومسابقات)",
        "category": "عامي مصري",
        "aliases": ["شاب", "حماسي", "مصري حماسي", "ولد", "كابتن", "1"]
    },
    "بنت مصرية": {
        "id": "67d92ff016dc4a7ba755967c6fbaf1b7",
        "title": "👧 بنت مصرية شاطرة (تعليمية وهادية)",
        "category": "عامي مصري",
        "aliases": ["بنت", "مصرية", "أبلة", "بنت 1", "2"]
    },
    "طفلة مصرية": {
        "id": "592625f68416462f8b6161ddf5fdbffb",
        "title": "🎈 طفلة مصرية مرحة (زي كارما وكندة)",
        "category": "عامي مصري",
        "aliases": ["طفلة", "صغيرة", "طفل", "3"]
    },
    "شاب مصري طبيعي": {
        "id": "939d4356b33a46b6903c73813c9296e4",
        "title": "☕ شاب مصري هادي (كلام قعدة بيت)",
        "category": "عامي مصري",
        "aliases": ["طبيعي", "هادي", "4"]
    },
    # 2. قرآن وتجويد وأحكام
    "المنشاوي": {
        "id": "9f83de9203704b16bd0ea020b1ba59d8",
        "title": "📖 الشيخ محمد صديق المنشاوي (تجويد وترتيل بالأحكام)",
        "category": "قرآن وتجويد",
        "aliases": ["منشاوي", "المنشاوي تجويد", "قرآن", "تجويد", "5"]
    },
    "عبدالباسط": {
        "id": "11922957b72743cf89215a9ec88865bc",
        "title": "🕌 الشيخ عبدالباسط عبدالصمد (نبرة ذهبية وأحكام متقنة)",
        "category": "قرآن وتجويد",
        "aliases": ["عبد الباسط", "عبدالباسط عبدالصمد", "ترتيل", "6"]
    },
    "الحصري المعلم": {
        "id": "3e4b8d857bf545308d79d5bd32df6053",
        "title": "📗 الشيخ محمود خليل الحصري (المصحف المعلم)",
        "category": "قرآن وتجويد",
        "aliases": ["حصري", "الحصري", "الحصري المعلم", "المصحف المعلم", "معلم", "7"]
    },
    "العفاسي": {
        "id": "4e22671c20cd4c9599dfc42455a4cb1c",
        "title": "🕋 الشيخ مشاري راشد العفاسي",
        "category": "قرآن وتجويد",
        "aliases": ["عفاسي", "مشاري", "8"]
    },
    # 3. ضحك وهزار وكرتون ومشاعر
    "كرتون نتورك": {
        "id": "d0c01842fdc34e73b7dd0711db3775e3",
        "title": "📺 مذيع كرتون نتورك بالعربي (تشويق وإثارة)",
        "category": "ضحك وهزار وكرتون",
        "aliases": ["كرتون", "نتورك", "انيميشن", "مذيع", "9"]
    },
    "كرتون مرح": {
        "id": "72592a188a1043e686d9a75ef1e4d7cb",
        "title": "🎭 صوت كرتون مرح ومضحك (هزار للأطفال)",
        "category": "ضحك وهزار وكرتون",
        "aliases": ["ضحك", "هزار", "مرح", "كوميدي", "10"]
    }
}

def resolve_voice(query):
    """التعرف الذكي على الصوت من النص أو الكلمات الدلالية أو الـ ID المباشر"""
    if not query:
        return VOICE_PRESETS["شاب مصري"]
    
    q = query.strip().lower().replace("#", "").replace("[", "").replace("]", "").replace("صوت", "").replace(":", "").strip()
    
    # 1. لو كان ID مباشر بطول 32 حرف
    if len(q) == 32 and all(c in "0123456789abcdefABCDEF" for c in q):
        return {"id": q, "title": f"Custom Model ({q[:8]}...)", "category": "مخصص"}

    # 2. مطابقة الاسم أو الأسماء البديلة (Aliases)
    for key, val in VOICE_PRESETS.items():
        if q == key.lower():
            return val
        for alias in val.get("aliases", []):
            if q == alias.lower() or alias.lower() in q:
                return val
                
    # 3. مطابقة تقريبية بالكلمات
    for key, val in VOICE_PRESETS.items():
        if any(word in q for word in key.split()):
            return val

    # افتراضي: شاب مصري
    return VOICE_PRESETS["شاب مصري"]

def process_emotion_tags(text):
    """تحويل وسوم الضحك والمشاعر العربية لعلامات يفهمها محرك الذكاء الاصطناعي"""
    replacements = {
        "(ضحك)": "(laughter)",
        "(يضحك)": "(laughter)",
        "(هههه)": "(laughter)",
        "(ههه)": "(laughter)",
        "(ابتسامة)": "(giggle)",
        "(تنهيدة)": "(sigh)",
        "(همس)": "(whisper)",
        "(حماس)": "(excited)",
        "(شهقة)": "(gasp)"
    }
    processed = text
    for ar_tag, en_tag in replacements.items():
        processed = processed.replace(ar_tag, en_tag)
    return processed

def generate_speech(text, voice_info, output_path=None, api_key=DEFAULT_API_KEY):
    """توليد الصوت عبر الـ API بطابور الاستدلال المجاني المباشر"""
    if not api_key:
        print("\n❌ خطأ: لم يتم العثور على مفتاح FISH_API_KEY في ملف .env!")
        print("👉 يرجى وضع المفتاح داخل ملف .env كالتالي:")
        print("   FISH_API_KEY=sk-fish-your_key_here\n")
        return None

    cleaned_text = process_emotion_tags(text)
    
    payload = {
        "text": cleaned_text,
        "reference_id": voice_info["id"],
        "format": "mp3"
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "model": "s2.1-pro-free",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    print(f"\n🚀 جاري التوليد باستخدام: {voice_info['title']}...")
    print(f"📝 النص المعالج: \"{cleaned_text[:60]}...\" (عدد الحروف: {len(cleaned_text)})")
    
    t0 = time.time()
    req = urllib.request.Request(
        "https://api.fish.audio/v1/tts",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            audio_data = resp.read()
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        print(f"❌ خطأ من الخادم (HTTP {e.code}): {err_msg}")
        return None
    except Exception as e:
        print(f"❌ خطأ في الاتصال: {e}")
        return None
        
    duration = round(time.time() - t0, 2)
    
    if not output_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = voice_info.get("title", "voice").split()[1] if len(voice_info.get("title", "").split()) > 1 else "output"
        output_path = f"voice_{safe_name}_{timestamp}.mp3"
        
    with open(output_path, "wb") as f:
        f.write(audio_data)
        
    print(f"✅ تم إنشاء الملف الصوتي بنجاح في {duration} ثانية!")
    print(f"📁 مسار الملف: {os.path.abspath(output_path)} ({len(audio_data)} بايت)")
    return output_path

def parse_input_file(file_path):
    """قراءة النص من ملف خارجي مع استخراج سطر تحديد الصوت وتجاهل كافة أسطر التعليقات"""
    if not os.path.exists(file_path):
        return None, None
        
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    voice_tag = None
    text_lines = []
    
    for idx, line in enumerate(lines):
        stripped = line.strip()
        # لو السطر يبدأ بـ # أو // أو [ فهو تعليق أو تحديد للصوت
        if stripped.startswith("#") or stripped.startswith("//") or stripped.startswith("["):
            if not voice_tag and any(w in stripped for w in ["صوت", "بنت", "شاب", "كرتون", "منشاوي", "عبدالباسط", "عفاسي", "ضحك", "هزار", "voice", "model"]):
                voice_tag = stripped
        elif stripped:
            text_lines.append(line)
            
    full_text = "".join(text_lines).strip()
    return voice_tag, full_text

def interactive_cli():
    """الوضع التفاعلي في التيرمنال"""
    print("\n" + "="*55)
    print("🎙️ مرحباً بك في أداة توليد الأصوات الذكية (Fish Audio Studio)")
    print("="*55)
    
    print("\nاختر الصوت المفضل من القائمة التالية:")
    for key, info in VOICE_PRESETS.items():
        alias_num = [a for a in info["aliases"] if a.isdigit()][0]
        print(f"  [{alias_num}] {info['title']}")
        
    print("  [0] قراءة الإعدادات والنص مباشرة من ملف send_text.txt")
    print("  [c] كتابة معرّف مخصص (Custom Model ID)")
    
    choice = input("\n👉 أدخل رقم الخيار [الافتراضي: 1]: ").strip()
    
    if choice == "0":
        tag, text = parse_input_file("send_text.txt")
        if not text:
            print("❌ ملف send_text.txt غير موجود أو فارغ!")
            return
        voice_info = resolve_voice(tag)
        generate_speech(text, voice_info, "output_latest.mp3")
        return
        
    elif choice.lower() == "c":
        custom_id = input("أدخل معرّف الموديل (32 حرف): ").strip()
        voice_info = resolve_voice(custom_id)
    else:
        voice_info = resolve_voice(choice if choice else "1")
        
    print(f"\n✨ الصوت المختار: {voice_info['title']}")
    print("-" * 45)
    print("اكتب النص المراد توليده بالعامية أو الفصحى:")
    print("💡 نصيحة: يمكنك إضافة (ضحك) أو (يضحك) أو (همس) لتوليد نبرات معبرة!")
    
    user_text = input("\n👉 النص: ").strip()
    if not user_text:
        print("⚠️ لم يتم إدخال نص، سيتم تجربة جملة سليم التلقائية.")
        user_text = "يا سليم يا بطل! لغز النهاردة: أربعة في خمسة تطلع كام؟ فكك الرقم بالخمسات وشغل مخك يا عبقري وماتقوليش الإجابة!"
        
    out_file = input("👉 اسم ملف الإخراج [الافتراضي: output_latest.mp3]: ").strip()
    if not out_file:
        out_file = "output_latest.mp3"
    elif not out_file.endswith(".mp3"):
        out_file += ".mp3"
        
    generate_speech(user_text, voice_info, out_file)

def main():
    # 1. إذا تم تمرير ملف كمعامل في سطر الأوامر (مثل: python send_voice.py send_text.txt)
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
        if os.path.exists(target_file):
            tag, text = parse_input_file(target_file)
            if text:
                voice_info = resolve_voice(tag)
                base = os.path.basename(os.path.splitext(target_file)[0])
                folder = os.path.dirname(target_file) or "."
                out_name = os.path.join(folder, f"voice_{base}.mp3")
                generate_speech(text, voice_info, out_name)
                return
            else:
                print(f"❌ الملف {target_file} فارغ!")
                return
        else:
            # لو مرر نص مباشر
            direct_text = " ".join(sys.argv[1:])
            generate_speech(direct_text, VOICE_PRESETS["شاب مصري"], "output_latest.mp3")
            return
            
    # 2. فحص وجود ملف send_text.txt في نفس المجلد
    if os.path.exists("send_text.txt"):
        # إذا تم تشغيله بنمط صامت أو عادي، نعطي المستخدم خياراً سريعاً
        pass
        
    # 3. الوضع التفاعلي الافتراضي
    interactive_cli()

if __name__ == "__main__":
    main()
