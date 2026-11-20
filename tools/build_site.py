"""Build the GitHub Pages site: python tools/build_site.py [outdir]   (default: _site)

The repo is ~2 GB of source art (Pages allows 1 GB), so the site holds only what the game and the Attack Viewer
load: the pages, src/, vendor/, the models and textures check_assets.py finds, the weapon metadata, audio and music.
"""
import os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_assets  # noqa: E402  (chdirs to the repo root)

out = sys.argv[1] if len(sys.argv) > 1 else '_site'
if os.path.exists(out):
    shutil.rmtree(out)
os.makedirs(out)

for f in ('index.html', 'viewer.html'):
    shutil.copy2(f, out)
for d in ('src', 'vendor', 'assets/game/audio', 'assets/game/music', 'assets/game/tex', 'assets/game/interior'):  # room themes name textures indirectly
    shutil.copytree(d, os.path.join(out, d))

# shipped by the folder copies above but never loaded by the game: the old interior kit model and the forest foliage cards
import glob
for junk in [os.path.join(out, 'assets/game/interior/interior.glb')] + glob.glob(os.path.join(out, 'assets/game/tex/pine*')):
    if os.path.exists(junk):
        os.remove(junk)

files = set(check_assets.referenced_files())
files.update(['assets/game/weapons/grips.json', 'assets/game/weapons/weapons.json'])
for f in sorted(files):
    dst = os.path.join(out, f)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.exists(dst):
        shutil.copy2(f, dst)

open(os.path.join(out, '.nojekyll'), 'w').close()  # serve folders as-is
total = sum(os.path.getsize(os.path.join(r, n)) for r, _, ns in os.walk(out) for n in ns)
print(f'{out}: {len(files)} assets, {total / 1e6:.0f} MB')
if total > 950e6:
    sys.exit('site is too big for GitHub Pages (1 GB limit)')
