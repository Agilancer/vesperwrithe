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
args = [a for a in sys.argv[1:] if not a.startswith('--')]
lan = '--lan' in sys.argv
port = int(args[0]) if args else 8410
socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('0.0.0.0' if lan else '127.0.0.1', port), H) as s:
    print(f'Vesperwrithe on http://localhost:{port}', flush=True)
    if lan:
        import socket
        try:
            u = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); u.connect(('10.255.255.255', 1)); ip = u.getsockname()[0]; u.close()
            print(f'On your phone (same Wi-Fi): http://{ip}:{port}', flush=True)
        except OSError: pass
    s.serve_forever()
