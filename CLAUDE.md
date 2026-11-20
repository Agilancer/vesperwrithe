# Vesperwrithe — notes for Claude

The game must keep running on phones (iPhone Safari is the strictest). Safari kills the page
when it runs out of memory and shows "A problem repeatedly occurred".

When adding or changing assets:
- Run `python tools/check_assets.py` after adding any model/texture. If it reports anything,
  run `python tools/check_assets.py --fix` (shrinks textures to 2048 px max in place) and commit.
- Textures: 2048 px max on the longest side. Single .glb files: 30 MB max.
- Load assets through `src/assets.js` (`loadGLTF`, `cloneGLTF`, `surface`) — they cap textures
  at runtime (1024 px on phones via `LOW_MEM`). Don't create a separate GLTFLoader/TextureLoader.
- Test phone mode on desktop with `?lowmem=1`.
