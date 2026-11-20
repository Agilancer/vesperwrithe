"""Serve Vesperwrithe locally: python tools/serve.py [port]"""
import http.server, socketserver, sys, os, mimetypes
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
for ext, t in {'.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.json': 'application/json', '.mp3': 'audio/mpeg'}.items():
    mimetypes.add_type(t, ext)
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8410
socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', port), H) as s:
    print(f'Vesperwrithe on http://localhost:{port}', flush=True)
    s.serve_forever()
