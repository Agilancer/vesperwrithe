# VESPERWRITHE

A 2.5D side-scrolling action RPG set in **Castle Velscour** (Velscour universe): 3D models on a 2D plane, Symphony-of-the-Night movement, Diablo 2-style loot with socketable gems, and non-linear, ability-gated exploration.

## Run

**Online:** https://agilancer.github.io/vesperwrithe/ (game) · https://agilancer.github.io/vesperwrithe/viewer.html (Attack Viewer). Every push to `main` republishes it (`.github/workflows/pages.yml`, built by `tools/build_site.py`).

```
play.bat            # or: python tools/serve.py 8410  →  http://localhost:8410
```

Controls: ←/→ move · ↓ crouch · Space/K jump (again in the air = double jump) · J attack · hold L shield · Shift backdash (with a Vesper Onyx socketed: Shift in mid-air = Shade Dash) · E interact (save coffin, chests) · Q potion · I/Tab pack · M map. Gamepad: A jump, X attack, LB/LT shield, RB/RT dash, Y interact, B potion, Start pack, Back map.

**Phone / tablet:** touch controls appear automatically on touch devices (force with `?touch=1`, hide with `?touch=0`). Play in landscape. To play on a phone over your network, run `python tools/serve.py 8410 --lan` and open the address it prints on the phone (same Wi-Fi; allow Python through the Windows firewall if asked).
- **Left:** d-pad. Slide your finger between directions; ▲ interacts and ▼ crouches.
- **Right:** ATK, JUMP, GUARD, DASH.
- **Top:** POTION, MAP, PACK.
- **In the pack:** JUMP = OK (equip), ATK = GEM (socket), GUARD/DASH = BACK.

## What's in the slice

The first ten rooms around START on `Castle_Velscour_Labeled` (1 map square = 1 screen, 13.33 m × 7.5 m):

| # | Room | Notes |
|---|------|-------|
| 1 | Pilgrim Causeway | Moonlit bridge, the **Pilgrim's Blade** waits on a pedestal right in front of you |
| 2 | Blackthorn Gatehouse | First enemy: a Shambler claws out of the floor |
| 3 | Blackthorn Shaft | 9-screen climb on varied one-way ledges, a knight, a Shambler and a side alcove with a Topaz cache |
| 4 | Hall of Lost Pilgrims | Zombies, a knight, a kite shield chest, a pit to the Undercroft and a **blackthorn gate** that only fire burns |
| 5 | Votive Shrine | Save coffin (heal + save) |
| 6 | Mirror of Passage | Warp mirror (dormant), big chest with the unique **Gravesong** pike — behind the thorns |
| 7 | Gallery of Saints | Knights; a hole in the floor drops into the boss hall |
| 8 | Undercroft Well | Sapphire + a Silver Lance, double-jump climb back out |
| 9 | Collapsed Chapel | Climb to the altar for the **Ruby** (fire) |
| 10 | Hall of the Oathbreaker | Boss: Sir Caddoc (Possessed Knight); drops the **Vesper Onyx** (Shade Dash) |

Gating loop: Ruby (chapel) → socket into a weapon → fire visibly wreathes the blade → burn the blackthorn in the Hall → Mirror of Passage.

## Attack Viewer

Open `viewer.html` (e.g. http://localhost:8410/viewer.html, works on phones too) to preview every attack animation on the hero with a real weapon in hand. Pick a weapon class, tap an animation, pick one of the swings it finds (or set start / hit / end frames by hand), choose the grip and swing time, then **Use for this weapon class**. The game uses your choice the next time it loads (saved in this browser). **Make starting weapon** swaps the weapon on the causeway pedestal (new game). **Copy config** gives the JSON to make your choices the built-in defaults (`STYLES` in `src/items.js`).

## Code map

- `src/attacks.js` — which attack each weapon class uses (defaults + Attack Viewer overrides), the attack clip list and swing detection.
- `src/viewer.js` — the Attack Viewer (`viewer.html`).
- `src/touch.js` — on-screen touch controls (multi-touch d-pad + action buttons) that feed the shared input.
- `src/main.js` — game loop, input (keyboard + gamepad), camera, rooms/transitions, loot, chests, save, boss flow, FX.
- `src/player.js` — SotN-tuned physics (`PHYS`), animation state machine with **upper/lower body layering** (attacks while idle / moving / jumping / crouching), weapons on hand sockets, swing trails, element FX.
- `src/enemies.js` — Shambler (zombie), Velscour Knight (blocks, telegraphs), Possessed Knight boss (charge, enrage).
- `src/items.js` — bases, rarities, affixes, sockets, gems (effect depends on host: weapon / armor / shield) and attack styles per weapon class.
- `src/world.js` — room geometry from `rooms.js`, themes, props, lights.
- `src/rooms.js` — the ten rooms, laid on the map grid.
- `docs/research/castlevania_design_research.md` — series research (SotN, GBA/DS trilogy, Bloodstained, newest entry) to consult whenever new systems are added.

## Asset pipeline

**Phone-safe budget:** textures ≤ 2048 px, `.glb` ≤ 30 MB. After adding assets run `python tools/check_assets.py` (add `--fix` to shrink oversize textures automatically). GitHub runs the same check on every push. At runtime `src/assets.js` also caps textures (1024 px on phones; test with `?lowmem=1`).


- `assets/` — imported from the BM repo (`Agilancer/bm`): weapons (+ `weapons.json`, `grips.json` computed grip points), monsters, armor/knights, textures (`*_c` colour, `*_d` normal+height), interior sets, audio, music.
- `assets/player/vesper_player.glb` — hero with 97 clips. Built in Blender (`assets/player/vesper_player_rig.blend`): every Mixamo FBX was imported and **retargeted in world space** onto the hero's rest pose (direct copying distorts because the source rest pose differs), hip motion scaled to the hero and made in-place. A `WeaponSocket_R` empty sits in the right palm; weapons are re-centred on their grip at runtime from `grips.json`.
