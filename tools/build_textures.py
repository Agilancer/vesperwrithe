"""Convert the raw Bellmourn texture batches (colour-only PNGs) into game-ready sets:
assets/game/tex2/<name>_c.webp (1024 colour) + <name>_d.webp (512, tangent normal in rgb + height in a),
with the normal map derived from luminance. Run: python tools/build_textures.py"""
import os, re, glob, json, sys
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'game', 'tex2'); os.makedirs(OUT, exist_ok=True)
srcs = []
for p in sorted(glob.glob(os.path.join(ROOT, 'assets/phobos/textures/*.png'))):
    srcs.append((re.sub(r'^ph2_\d+_\d+_', '', os.path.splitext(os.path.basename(p))[0]), p))
for p in sorted(glob.glob(os.path.join(ROOT, 'assets/citystatephobos/**/textures/**/*.png'), recursive=True)):
    n = os.path.splitext(os.path.basename(p))[0]; n = re.sub(r'^BM_PV_\d+_', '', n); n = re.sub(r'_Color$', '', n)
    srcs.append(('pv_' + n.lower(), p))
manifest = {}
FLAT = ('banner', 'tapestry', 'cloth', 'wool', 'damask', 'rug', 'carpet', 'tartan', 'heraldic', 'stripes', 'fabric', 'velvet', 'linen', 'canvas', 'hessian', 'blanket', 'glass', 'leaded', 'water')
for name, p in srcs:
    c = os.path.join(OUT, name + '_c.webp'); d = os.path.join(OUT, name + '_d.webp')
    manifest[name] = os.path.relpath(p, ROOT).replace(os.sep, '/')
    if os.path.exists(c) and os.path.exists(d): continue
    im = Image.open(p).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    im.save(c, 'WEBP', quality=84, method=4)
    g = np.asarray(im.resize((512, 512), Image.LANCZOS).convert('L').filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32) / 255.0
    strength = 1.2 if any(k in name for k in FLAT) else 3.2
    dx = (np.roll(g, -1, 1) - np.roll(g, 1, 1)) * strength; dy = (np.roll(g, -1, 0) - np.roll(g, 1, 0)) * strength
    nz = np.ones_like(g); ln = np.sqrt(dx * dx + dy * dy + nz * nz)
    n = np.stack([(-dx / ln) * 0.5 + 0.5, (dy / ln) * 0.5 + 0.5, (nz / ln) * 0.5 + 0.5, g], -1)
    Image.fromarray((np.clip(n, 0, 1) * 255).astype(np.uint8), 'RGBA').save(d, 'WEBP', quality=88, method=4)
    print(name, flush=True)
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print('done', len(manifest))
