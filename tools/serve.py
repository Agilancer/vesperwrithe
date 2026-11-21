"""Serve Vesperwrithe: python tools/serve.py [port] [--lan]  (--lan lets phones on your Wi-Fi connect)"""
import http.server, socketserver, sys, os, mimetypes
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
for ext, t in {'.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.json': 'application/json', '.mp3': 'audio/mpeg'}.items():
    mimetypes.add_type(t, ext)
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def log_message(self, *a): pass
    def do_POST(self):  # dev only: the game can save review screenshots to ./shots (localhost only)
        import base64, re, urllib.parse
        q = urllib.parse.urlparse(self.path)
        if q.path != '/__shot' or self.client_address[0] not in ('127.0.0.1', '::1'): self.send_error(404); return
        name = re.sub(r'[^A-Za-z0-9_.-]', '_', urllib.parse.parse_qs(q.query).get('name', ['shot'])[0])[:80]
        data = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode()
        os.makedirs('shots', exist_ok=True)
        open(os.path.join('shots', name + '.jpg'), 'wb').write(base64.b64decode(data.split(',', 1)[1]))
        self.send_response(204); self.end_headers()
args = [a for a in sys.argv[1:] if not a.startswith('--')]
lan = '--lan' in sys.argv
port = int(args[0]) if args else 8410
socketserver.ThreadingTCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer.request_queue_size = 128  # the default backlog of 5 refuses connections when the browser fetches ~60 ES modules at once (Windows)
with socketserver.ThreadingTCPServer(('0.0.0.0' if lan else '127.0.0.1', port), H) as s:
    print(f'Vesperwrithe on http://localhost:{port}', flush=True)
    if lan:
        import socket
        try:
            u = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); u.connect(('10.255.255.255', 1)); ip = u.getsockname()[0]; u.close()
            print(f'On your phone (same Wi-Fi): http://{ip}:{port}', flush=True)
        except OSError: pass
    s.serve_forever()
