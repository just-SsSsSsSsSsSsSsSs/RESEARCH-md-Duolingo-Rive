#!/usr/bin/env python3
"""
Dev/test static server WITH HTTP Range support (206 Partial Content).
Chromium refuses to seek inside <audio> when the origin ignores Range requests
(python -m http.server answers 200 to Range) — GitHub Pages supports Range, this mirrors that.
Usage: python3 tools/serve.py [port=8080] [root=repo root]
"""
import os, re, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class RangeHandler(SimpleHTTPRequestHandler):
    def log_message(self, *a):  # quiet
        pass

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def send_head(self):
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        if not rng or os.path.isdir(path) or not os.path.exists(path):
            return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)', rng)
        if not m:
            return super().send_head()
        size = os.path.getsize(path)
        start = int(m.group(1)) if m.group(1) else 0
        end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            self.send_response(416); self.send_header('Content-Range', f'bytes */{size}'); self.end_headers(); return None
        f = open(path, 'rb'); f.seek(start)
        self.send_response(206)
        self.send_header('Content-type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._range_len = end - start + 1
        return f

    def copyfile(self, src, dst):
        n = getattr(self, '_range_len', None)
        if n is None:
            return super().copyfile(src, dst)
        while n > 0:
            chunk = src.read(min(64 * 1024, n))
            if not chunk: break
            dst.write(chunk); n -= len(chunk)
        self._range_len = None


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    print(f'serving {root} on 0.0.0.0:{port} with Range support')
    ThreadingHTTPServer(('0.0.0.0', port), RangeHandler).serve_forever()
