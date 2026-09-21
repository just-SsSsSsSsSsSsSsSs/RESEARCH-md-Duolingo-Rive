#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 سيرفر البث المحلي لتشغيل تطبيقات سليم وكارما وكندة على الموبايل واللاب توب
يدعم تشغيل الصوتيات بسلاسة مع دعم كامل للـ Range Requests وهواتف آيفون وأندرويد
مع طباعة رمز استجابة سريعة (QR Code) للمسح الفوري بكاميرا الموبايل!
"""

import os
import sys
import socket
import http.server
import socketserver
import urllib.parse

# ضبط الترميز في ويندوز
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class RangeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """معالج خادم يدعم استئناف وتحميل مقاطع الصوت للموبايل (Byte-Range Requests)"""
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def copyfile(self, source, outputfile):
        """تجاهل انقطاع اتصال الموبايل المفاجئ لمنع ظهور رسائل خطأ في التيرمينال"""
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def do_GET(self):
        # فك تشفير مسار الرابط باللغة العربية
        decoded_path = urllib.parse.unquote(self.path)
        try:
            super().do_GET()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

def start_server(port=8080):
    root_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root_dir)
    
    local_ip = get_local_ip()
    
    # التأكد من توفر البورت
    for p in [port, 8000, 5500, 8888, 3000]:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        res = s.connect_ex(('127.0.0.1', p))
        s.close()
        if res != 0:
            port = p
            break
            
    server_address = ('0.0.0.0', port)
    
    print("\n" + "="*60)
    print("🚀 سيرفر البث المحلي جاهز وشغال الآن بنجاح!")
    print("="*60)
    print(f"\n💻 من نفس جهاز الكمبيوتر / اللاب توب:")
    print(f"👉 http://localhost:{port}/index.html")
    print(f"\n📱 من الموبايل أو التابلت (سليم، كارما، كندة على نفس شبكة الواي فاي):")
    print(f"👉 http://{local_ip}:{port}/index.html")
    print("\n🔗 روابط سريعة ومباشرة للموبايل:")
    print(f"  📖 سورة البينة:   http://{local_ip}:{port}/index.html")
    print(f"  ✨ سورة القدر:    http://{local_ip}:{port}/سورة%20القدر/index.html")
    print(f"  🚀 معمل الماث:    http://{local_ip}:{port}/رياضيات_سليم_خواص_الضرب/index.html")
    print(f"  🌱 ازرع نبتة سليم: http://{local_ip}:{port}/plant.html")
    print(f"  🌱 (بالاسم العربي): http://{local_ip}:{port}/تطبيق_ازرع_نبتة_سليم_بالبلدي.html")
    print("="*60)
    
    # محاولة طباعة كود QR على الشاشة للموبايل
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(f"http://{local_ip}:{port}/index.html")
        qr.make(fit=True)
        print("\n📸 امسح الكود ده بكاميرا الموبايل للدخول المباشر:")
        qr.print_ascii(invert=True)
    except Exception:
        pass
        
    print("\n(السيرفر يعمل الآن في الخلفية.. للإيقاف اضغط Ctrl + C)")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(server_address, RangeHTTPRequestHandler) as httpd:
        httpd.serve_forever()

if __name__ == "__main__":
    p = 8080
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        p = int(sys.argv[1])
    start_server(p)
