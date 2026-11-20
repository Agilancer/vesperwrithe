# VESPERWRITHE

A 2.5D side-scrolling action RPG set in **Castle Velscour** (Velscour universe): 3D models on a 2D plane, Symphony-of-the-Night movement, Diablo 2-style loot with socketable gems, and non-linear, ability-gated exploration.

## Run

**Online:** https://agilancer.github.io/vesperwrithe/ (game) · https://agilancer.github.io/vesperwrithe/viewer.html (Attack Viewer). Every push to `main` republishes it (`.github/workflows/pages.yml`, built by `tools/build_site.py`).

```
play.bat            # or: python tools/serve.py 8410  →  http://localhost:8410
```

Controls: ←/→ move · ↓ crouch · Space/K jump · J attack · hold L shield · Shift backdash · E interact (save coffin, chests, mirrors, the Librarian) · Q potion · I/Tab pack (1-4 spend attribute points, S socket a gem, U unequip) · M map. Gamepad: A jump, X attack, LB/LT shield, RB/RT dash, Y interact, B potion, Start pack, Back map.

**Phone / tablet:** touch controls appear automatically on touch devices (force with `?touch=1`, hide with `?touch=0`). Play in landscape. To play on a phone over your network, run `python tools/serve.py 8410 --lan` and open the address it prints on the phone.

## The castle

102 rooms (581 map squares) across 24 named areas, laid out as six districts in `src/areas/`. You begin with a single jump. Seven silent **bells** hang in the castle; each one a boss guards, and each teaches a new way to move that opens new ground:

| Bell | Ability | Guardian | Where |
|------|---------|----------|-------|
| Bell of the Low Hour | **Slide** (↓ + Shift) under low stone | Oathbreaker Sir Caddoc | Hall of the Oathbreaker |
| Vesper Bell | **Double jump** | Sirelle, Queen of the Belfry Roost (flying) | Prison of Bells |
| Drowned Bell | **Dive** (↓ + attack in the air): shatters cracked floors, sink in deep water | The Drowned Hydra | Cistern of Echoes |
| Briar Bell | **Thornstep**: kick off walls | Gravehart, the Antlered Grief (lure its charge into the pillars) | Thornbound Gardens |
| Cinder Bell | **Ember Ward**: wade through molten rock | Brannoch, the Cinder Warden | Emberworks |
| Bell of Echoes | **Echo Sight**: hidden ledges appear, false walls vanish | Malgrave, the Last Archivist (hides among mirror-copies) | Forbidden Athenaeum |
| Tempest Bell | **Shade Dash** (Shift + direction / in the air): pass spirit gates and foes | Vhalgor, Storm of the Belfry (a flying dragon) | Tempest Belfry |

Then the Starless Sanctum tests every bell in turn on the way to **Velscour, King of the Hollow Sun**. Optional minibosses guard treasure along the way (the Moonbitten Warden, the Larder Ogre, the Sluice Maw, the Brood-Mother, three more dragons, the Ossein Colossus, the Abyssal Mouth).

Districts: `west.js` (Causeway, Gatehouse, Chapel of Cinders, Moonlit Courtyard, Grand Vestibule, Servants Quarter) · `waterworks.js` (Sunken Aqueduct, Fungal Reservoir, Cistern of Echoes, Catacombs of the Nameless, Royal Crypts) · `towers.js` (Ossuary Stair, Prison of Bells, Portrait Gallery, Forbidden Athenaeum, Scribes Labyrinth) · `gardens.js` (Thornbound Gardens, Royal Menagerie, Clockwork Arsenal, Pendulum Spire, Mirror Palace) · `depths.js` (Obsidian Mines, Emberworks, Execution Foundry, Magma Reliquary) · `heights.js` (Astral Observatory, Gargoyle Ramparts, Tempest Belfry, Starless Sanctum, Throne of the Hollow Sun).

Save coffins heal and record progress; warp mirrors link the districts once touched; the Librarian in the Athenaeum buys and sells. Life and mana vessels are hidden in secrets (cracked walls, false walls, echo ledges, drowned vaults).

## Monsters, weapons, RPG

- **Bestiary** (`src/catalog.js`): 45 enemy types built from every Bellmourn monster model — shamblers, dead children, thralls, goblins and kobolds (armed, bone-throwing), warlocks, shield knights, lancers, spiders that drop from ceilings, harpies and werebats, weeping-angel mannequins, necromancers that raise the dead, goatmen, plague knights and giants, burrowing worms, fire- and frost-breathing dragonlings, witches, night demons that step out behind you, silver paladins — each with its own behaviour archetype in `src/enemies.js`, plus a move-list boss engine with phases (charges, leaps, slams, breath cones and floor-sweeping breath, volleys, rains, eruptions, summons, blinks, mirror images, dive-bombs, strafing runs).
- **Weapons**: all 252 Bellmourn weapon and shield models plus the 12 hand-made swords and greatswords are item bases (no staffs): swords, greatswords, axes, greataxes, maces, mauls, spears, lances, daggers, **bows** (arrows), **boomerangs** (return to hand), kite and tower shields. Item level 1-30 by class.
- **Random abilities ("echoes")**: magic and rare weapons roll one of 20 — Vesper Crescent (every third swing throws a wave), Twin Knell, Stormcall chain lightning, Winter's Toll nova on kill, Cinderbrand, Red Thirst, Headsman execute, Gravefall, Belfry Brood bats on crit, Bellringer stun, Briarbite, Falling Star, Blood Frenzy, Soul Harvest, Shade-Twin, Far-Reaching, Guardbreaker, Volley, Piercing, Circling. 20 uniques have fixed ones.
- **Affixes, sockets, gems**: Diablo 2-style prefixes/suffixes scaled by item level; 8 gems whose effect depends on the host (weapon / armour / shield).
- **Levelling**: XP scaled by level difference (grinding trivial foes pays little), 3 attribute points per level to put into Strength (damage), Constitution (life), Intellect (mana, elemental damage) or Luck (crits, magic find).

## Attack Viewer

Open `viewer.html` (e.g. http://localhost:8410/viewer.html, works on phones too) to preview every attack animation on the hero with a real weapon in hand. Pick a weapon class, tap an animation, pick one of the swings it finds (or set start / hit / end frames by hand), choose the grip and swing time, then **Use for this weapon class**. The game uses your choice the next time it loads (saved in this browser). **Make starting weapon** swaps the weapon on the causeway pedestal (new game). **Copy config** gives the JSON to make your choices the built-in defaults (`STYLES` in `src/items.js`).

## Code map

- `src/moves.js` + `tools/build_anims.py` — the hero's authored clips. The script runs in Blender on `assets/player/vesper_player_rig.blend` (`blender -b assets/player/vesper_player_rig.blend --python tools/build_anims.py`) and writes `assets/player/vesper_moves.glb` and `moves.json`: guard stance, stride-matched run, velocity-scrubbed jump, landing, and attack clips with wind-up / strike / follow-through / recovery, hit windows and cancel frames. `moves.js` maps weapon styles to chains of those clips, pins the finger grip and reaches the off hand onto two-handed weapons.
- `src/title.js` + `src/theme.css` — the title screen (logo, WebGL mist, moonlight) and the UI theme that every HUD element and panel takes from the logo.

- `src/rooms.js` — grid constants, the bells, room expansion and shared collision (`roomSolids`). `docs/ROOM_SPEC.md` is the authoring format.
- `src/areas/*.js` — the six districts (pure data).
- `tools/validate_rooms.mjs` — proves the castle: door reciprocity, overlaps, catalog names, and a jump-model walk that collects the bells in order and reports anything unreachable. `node tools/validate_rooms.mjs --map --acts`.
- `src/world.js` — raises a room's geometry on demand from its data: 31 area themes, hazards (spikes, lava, water, pendulum blades, moving platforms), gates, ~50 prop types, a pooled lighting system (constant light count), far rooms are unloaded.
- `src/catalog.js` — themes, props and the bestiary. `src/enemies.js` — behaviours and bosses.
- `src/items.js` — bases, affixes, echoes, uniques, gems. `src/player.js` — SotN-tuned physics, bell abilities, layered animation.
- `src/main.js` — loop, input, camera, missiles, eruptions, shockwaves, boss arenas, bells, loot, shop, warps, save. `src/ui.js` — HUD, pack, map, menus. `src/touch.js` — touch controls.
- `tools/build_textures.py` — converts the raw Bellmourn texture batches (190 colour-only PNGs) into game-ready colour + generated normal/height maps in `assets/game/tex2/`.
- `assets/game/props/gothic_kit.glb` — tracery windows, rose window, chandelier and sarcophagus modelled in Blender.
- `tools/build_castle_kit.py` → `assets/game/props/castle_kit.glb` — the Gothic architecture kit, modelled in Blender with baked ambient occlusion: compound piers (base, shaft, stiff-leaf capital), pointed arcade bays (spandrel, roll-moulded archivolt, hood mould), two-light lancets with tracery, corbels, the pilgrim's stone, the face-on barbican and the castle skyline. Run it with Blender (`blender -b --python tools/build_castle_kit.py`) or any Python with the `bpy` wheel. `world.js` bakes each piece into world space with real-scale UVs (`kitPiece`) and merges them per material per room.
- How rooms are dressed (`world.js`): every surface uses world-space UVs at the texture's real size (`TILE`); stone interiors get a Gothic elevation (`arcade()`: piers only where an arch lands, lower arches or panels under ledges, galleries and clerestories in tall rooms, corbelled responds where a pier can't stand); windows and hangings claim a clear piece of wall (`findWall`); ledges are slabs on corbels, timber decks on posts, or cloister bays in the open air.
- `assets/game/tex3/` and `assets/game/glass/` — from the bm repo: the Velscour/Phobos castle stones (castle, keep, ossuary, undercroft, sewer, iron, damask, rugs) and the cut-out art (the Velscour rose window, stained-glass lancets, Velscour heraldic banners).
- `docs/research/` — design research (SotN, the GBA/DS games, Bloodstained, Silksong, Hollow Knight, Metroid Dread, Blasphemous).

## Asset pipeline

**Phone-safe budget:** textures ≤ 2048 px, `.glb` ≤ 30 MB. After adding assets run `python tools/check_assets.py` (add `--fix` to shrink oversize textures automatically). GitHub runs the same check on every push. At runtime `src/assets.js` also caps textures (1024 px on phones; test with `?lowmem=1`).


- `assets/` — imported from the BM repo (`Agilancer/bm`): weapons (+ `weapons.json`, `grips.json` computed grip points), monsters, armor/knights, textures (`*_c` colour, `*_d` normal+height), interior sets, audio, music.
- `assets/player/vesper_player.glb` — hero with 97 clips. Built in Blender (`assets/player/vesper_player_rig.blend`): every Mixamo FBX was imported and **retargeted in world space** onto the hero's rest pose (direct copying distorts because the source rest pose differs), hip motion scaled to the hero and made in-place. A `WeaponSocket_R` empty sits in the right palm; weapons are re-centred on their grip at runtime from `grips.json`.
