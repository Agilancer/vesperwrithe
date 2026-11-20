"""Keep the game phone-safe.

Phones (iPhone Safari above all) kill the page when it runs out of memory, which shows as
"A problem repeatedly occurred". The usual cause is huge textures: one 8192x8192 image costs
~256 MB once decoded. This tool finds every model/texture the game actually loads and checks
it against a budget.

    python tools/check_assets.py          # report; exit 1 if anything is over budget
    python tools/check_assets.py --fix    # shrink over-size textures in place (keeps aspect, needs Pillow)

Budget: textures at most MAX_TEX px on their longest side; .glb files at most MAX_GLB_MB.
The game also downsizes textures at load time on phones (src/assets.js), so this is the
second line of defence - it keeps downloads small and memory spikes during decode low.
"""
import io, json, os, re, struct, sys

MAX_TEX = 2048
MAX_GLB_MB = 30
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)


def referenced_files():
    """Asset paths the game loads: string literals in src/*.js plus every weapon/item model."""
    found = set()
    for fn in os.listdir('src'):
        if fn.endswith('.js'):
            src = open(os.path.join('src', fn), encoding='utf-8').read()
            found.update(re.findall(r"['\"`](assets/[^'\"`$]+\.(?:glb|webp|png|jpe?g))['\"`]", src))
    for meta in ('assets/game/weapons/weapons.json',):
        if os.path.exists(meta):
            for v in json.load(open(meta)).values():
                if isinstance(v, dict) and v.get('file'):
                    found.add(v['file'])
    # surface() textures: surface('name', ...) -> <dir>name_c.webp / name_d.webp
    for fn in os.listdir('src'):
        if fn.endswith('.js'):
            src = open(os.path.join('src', fn), encoding='utf-8').read()
            for name in re.findall(r"surface\('([\w-]+)'", src):
                for d in ('assets/game/tex/', 'assets/game/interior/', 'assets/game/'):
                    for s in ('c', 'd'):
                        p = f'{d}{name}_{s}.webp'
                        if os.path.exists(p):
                            found.add(p)
    return sorted(f for f in found if os.path.exists(f))


def read_glb(path):
    d = open(path, 'rb').read()
    assert d[:4] == b'glTF', 'not a glb'
    jl = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + jl])
    bin_off = 20 + jl
    bin_chunk = b''
    if bin_off < len(d):
        bl = struct.unpack('<I', d[bin_off:bin_off + 4])[0]
        bin_chunk = d[bin_off + 8:bin_off + 8 + bl]
    return j, bin_chunk


def write_glb(path, j, bin_chunk):
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    bin_chunk += b'\0' * (-len(bin_chunk) % 4)
    total = 12 + 8 + len(js) + (8 + len(bin_chunk) if bin_chunk else 0)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON')); f.write(js)
        if bin_chunk:
            f.write(struct.pack('<I4s', len(bin_chunk), b'BIN\0')); f.write(bin_chunk)


def image_size(data):
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', data[16:24])
    if data[:2] == b'\xff\xd8':
        i = 2
        while i < len(data) - 9:
            if data[i] != 0xFF: i += 1; continue
            m = data[i + 1]
            if m in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack('>HH', data[i + 5:i + 9]); return w, h
            if m in (0xD8, 0x01) or 0xD0 <= m <= 0xD7: i += 2; continue
            i += 2 + struct.unpack('>H', data[i + 2:i + 4])[0]
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        from PIL import Image
        return Image.open(io.BytesIO(data)).size
    return None


def shrink(data, mime):
    from PIL import Image
    im = Image.open(io.BytesIO(data)); im.load()
    k = MAX_TEX / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = io.BytesIO()
    if mime == 'image/png': im.save(out, 'PNG', optimize=True)
    elif mime == 'image/webp': im.save(out, 'WEBP', quality=90)
    else: im.convert('RGB').save(out, 'JPEG', quality=90)
    return out.getvalue()


def fix_glb(path):
    j, b = read_glb(path)
    views = j.get('bufferViews', [])
    img_views = {}
    for im in j.get('images', []):
        if 'bufferView' in im:
            data = b[views[im['bufferView']].get('byteOffset', 0):][:views[im['bufferView']]['byteLength']]
            sz = image_size(data)
            if sz and max(sz) > MAX_TEX:
                img_views[im['bufferView']] = shrink(data, im.get('mimeType', 'image/jpeg'))
    if not img_views: return False
    # rebuild the binary chunk, keeping every view 4-byte aligned (accessors require it)
    nb = bytearray()
    for i, v in enumerate(views):
        if v.get('buffer', 0) != 0: continue
        chunk = img_views.get(i) or b[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        nb += b'\0' * (-len(nb) % 16)
        v['byteOffset'] = len(nb); v['byteLength'] = len(chunk); nb += chunk
    j['buffers'][0]['byteLength'] = len(nb)
    write_glb(path, j, bytes(nb))
    return True


def check(path, fix):
    problems = []
    if path.endswith('.glb'):
        if fix: fix_glb(path)
        j, b = read_glb(path)
        for im in j.get('images', []):
            if 'bufferView' in im:
                v = j['bufferViews'][im['bufferView']]
                sz = image_size(b[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
                if sz and max(sz) > MAX_TEX: problems.append(f'texture {sz[0]}x{sz[1]} (max {MAX_TEX})')
        mb = os.path.getsize(path) / 1e6
        if mb > MAX_GLB_MB: problems.append(f'file is {mb:.0f} MB (max {MAX_GLB_MB})')
    else:
        data = open(path, 'rb').read()
        sz = image_size(data)
        if sz and max(sz) > MAX_TEX:
            if fix:
                open(path, 'wb').write(shrink(data, 'image/webp' if path.endswith('.webp') else 'image/png' if path.endswith('.png') else 'image/jpeg'))
            else:
                problems.append(f'texture {sz[0]}x{sz[1]} (max {MAX_TEX})')
    return problems


if __name__ == '__main__':
    fix = '--fix' in sys.argv
    files = referenced_files()
    bad = 0
    for f in files:
        p = check(f, fix)
        if p:
            bad += 1
            print(f'OVER BUDGET  {f}: ' + '; '.join(p))
    print(f'Checked {len(files)} assets the game loads: {bad} over budget.')
    if bad and not fix: print('Run:  python tools/check_assets.py --fix')
    sys.exit(1 if bad else 0)
