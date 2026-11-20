# Castle Velscour — room authoring spec

Vesperwrithe is a 2.5D side-scrolling metroidvania (Symphony of the Night structure, 3D models on a 2D plane).
The castle is data: each district is one file in `src/areas/<name>.js` that `export default`s an array of room
objects. `src/areas/west.js` is the reference — read it first. The engine (`src/world.js`) turns the data into
geometry, and `node tools/validate_rooms.mjs --area <name>` proves the rooms connect and are traversable.

## The grid

- One map square = one camera screen = **13.333 m wide × 7.5 m tall**. `col` grows east, `row` grows **down**.
- A room is `{ col, row, w, h }` in whole squares; `row` is its **top** row. Rooms must not overlap.
- Inside a room, coordinates are **room-local metres**: `x` from the room's left edge, `y` from the room's bottom
  edge. The room's own floor slab tops out at **y = 0.5**; its ceiling slab's underside is at `h*7.5 - 0.5`.
  Side walls are 0.5 m thick (playable x is 0.5 … `w*13.333 - 0.5`).
- "Floor level of map row R" inside a room = `(room.row + room.h - 1 - R) * 7.5 + 0.5` (bottom row → 0.5).

## Room object

```js
{ id: 'unique_snake_case', name: 'Shown On Screen', area: '06', // two-digit area number from the list below
  col, row, w, h, theme: 'aqueduct',
  doors: [ { side: 'W'|'E', row: R }, { side: 'N'|'S', col: C } ],
  platforms: [ { x, y, w } ],        // thin ONE-WAY ledges (jump up through, Down+Jump drops through). y = top surface.
  blocks:    [ { x, y, w, h } ],     // SOLID stone. y = bottom of the block, top = y + h. Use for raised floors, pillars, walls, low ceilings.
  stairs:    [ { x, steps, dir: 1|-1, rise: 0.5, run: 1, y: 0.5 } ], // solid staircase climbing in direction dir from near edge x
  cracks:    [ { x, y, w, h, by: 'dive'|'hit' } ], // breakable solid. 'dive' = cracked FLOOR only the Dive plunge breaks; 'hit' = secret wall any weapon breaks
  gates:     [ { x, y?, kind: 'thorn'|'ghost'|'veil' } ], // 1.6 m wide, 4.3 m tall barrier standing on y (default floor). thorn = burns with a fire gem (ruby); ghost = only Shade Dash passes; veil = false wall, gone with Echo Sight
  spikes:    [ { x, y, w } ],        // hurts on touch; sits on the surface at y
  lava:      [ { x, y, w, h } ],     // molten pool/zone (deadly without Ember Ward; wadeable with it)
  water:     [ { x, y, w, h } ],     // deep water: you float on top; with the Dive bell you can sink and walk the bottom
  echo:      [ { x, y, w } ],        // hidden one-way ledges that only exist once the player has Echo Sight
  movers:    [ { x, y, w, dx?, dy?, period?, phase? } | { x, y, w, orbit: radius, period } ], // moving one-way platforms (clock gears, lifts)
  blades:    [ { x, y, len, period, phase? } ], // swinging pendulum blade hazard, pivot at (x,y)
  enemies:   [ { t: 'zombie', x, y?, rise?: true, boss?: true, mini?: true } ], // y = surface they stand on (default 0.5); flyers: y = hover height
  chests:    [ { x, y?, tier: 1..8, rarity?: 'magic'|'rare' } | { x, y?, base: '<weapon id>', rarity?, sockets? } | { x, y?, unique: '<id>', big: true } | { x, y?, gem: '<gem>' } ],
  items:     [ { x, y, up: 'life'|'mana' } | { x, y, gem } | { x, y, base, rarity?, sockets?, pedestal?: true } | { x, y, potion: true } | { x, y, gold: 50 } ],
  breakables:[ { x, y? } ],          // candle stands (drop gold/potions/gems when struck) — sprinkle 2-6 per room
  props:     [ { t: 'torch', x, y? } ], // scenery. y = the surface level the prop belongs to (default floor); wall/hanging props place themselves above it
  lore:      [ { x, y?, text: 'One evocative sentence shown as a prompt when the player stands near x (and near height y, in tall rooms).' } ],
  save: { x }, warp: { x }, shop: { x },      // save coffin / warp mirror / librarian shop (stand on the room floor)
  bell: { id: 'djump', x, y? },      // where a boss's bell appears when it dies (or simply sits, if the room has no boss)
  boss: '<enemy id>',                // marks a boss arena: doors seal while the boss lives. Also put the enemy in `enemies` with boss: true
  secret: true,                      // optional: a hidden room (drawn purple on the map)
}
```
All lists are optional. Do not invent fields, themes, props, enemies or item ids that are not listed here — the
validator rejects them.

### Doors
- `W`/`E` doors are 3.8 m tall openings standing on the floor level of map row `row`. If that row is not the
  room's bottom row the engine adds a **3 m deep solid ledge** inside the room at that level automatically.
- `N`/`S` doors are 3.2 m wide holes in the ceiling/floor centred on map column `col`
  (room-local centre x = `(col - room.col) * 13.333 + 6.667`). To go **up** through an `N` hole the player needs a
  one-way platform directly under the hole within jump height of the level above (the room above's floor top is at
  `h*7.5 + 0.5`). Platforms under ceiling slab (not under the hole) within 1.75 m of the ceiling are not standable.
- Every door needs a matching door in the neighbouring room (same row for W/E, same col for N/S). Doors to other
  districts are listed in your assignment — reproduce them exactly.

## Player movement (design to these numbers; the validator uses slightly stricter ones)

| Kit | Max rise | Max gap (edge to edge) |
|---|---|---|
| Single jump (always) | **2.3 m** | 4.0 m level · 2.8 m when also rising ~2 m · more when dropping |
| + Double jump (`djump`) | **4.1 m** | ~7 m level · ~5 m when rising 4 m |
| + Thornstep (`wallkick`) | climbs any solid wall face (a block side or room wall) — design shafts with **no ledges for 6+ m** next to a wall |
| + Shade Dash (`dash`) | +2.4 m on any gap; passes `ghost` gates |
| Slide (`slide`) | passes under solid blocks whose underside is **1.2 m** above the surface (use exactly 1.2) |
| Dive (`dive`) | breaks `cracks` with `by:'dive'` from above; walks under `water` |
| Ember Ward (`ember`) | walks through `lava` |
| Echo Sight (`echo`) | `echo` ledges exist, `veil` gates vanish |

Player is 0.62 m wide, 1.72 m tall; needs 1.75 m headroom to stand. Walk 4.7 m/s. Bells are earned in this order:
`slide → djump → dive → wallkick → ember → echo → dash`. Your assignment says which bells the player has when they
first arrive — everything on the critical path must be doable with exactly those. Gate later content with the
feature that matches the later bell, and tease it: let the player SEE the ledge / chest / door they cannot reach yet.

## Themes (set `theme`)
`outdoor` moonlit bridge · `hall` grey ashlar hall with pillars · `shaft` plain stone shaft · `shrine` small red marble shrine ·
`gallery` panelled gallery with carpet · `crypt` damp catacomb stone · `chapel` rough stone nave · `throne` dark marble throne hall ·
`courtyard` open-air moonlit yard (no ceiling) · `vestibule` grand marble hub · `servants` plaster/oak kitchens and cellars ·
`aqueduct` wet green brick waterworks · `cistern` vast flooded vault · `ossuary` bone-lined stair · `prison` rust and iron cells ·
`portrait` damask-walled gallery · `library` book-spine walls, oak · `garden` open-air thorn garden (no ceiling) · `menagerie` iron-barred beast house ·
`catacomb` skull-wall tunnels · `royalcrypt` white mausoleum marble · `clock` bronze plates and cogs · `mine` obsidian and basalt ·
`forge` soot brick, furnace glow · `magma` black rock over molten light · `mirror` pale marble and demon glass ·
`observatory` deep-blue star chamber · `rampart` open-air battlements high in the storm (no ceiling) · `belfry` storm-lit bell tower ·
`sanctum` starless black stone · `hollow` gold and bloodstone throne.

## Props (`props: [{ t, x, y? }]`)
torch, lamp (outdoor post), banner, window (`big: true` for tall), rosewindow, statue, candles, chain, pews, throne, gatearch, portcullis,
bookshelf, chandelier, sarcophagus, coffin, bones, skullwall, cage (hanging), gear (turning background cog), pendulum (background),
barrel, crate, table, tapestry, painting, mirror, tree (dead), thornbush, ivy, fountain, grave, organ, bigbell, brazier, crystal,
stalactite, pipe, web, telescope, orrery, anvil, furnace, rubble, altar, arch, column, rug, gargoyle, waterfall, mushroom, hook.
Use 8–20 props per room and vary them; light every 12–16 m of walkway with a torch/brazier/lamp/candles/chandelier.

## Bestiary (`enemies: [{ t }]`) — tier = the act it suits
- Tier 1: `zombie` (rise:true makes it claw out of the floor), `child` (fast, small), `thrall` (lunges), `goblin`, `kobold` (throws bones), `wizard` (bolts), `knight` (blocks). Minibosses: `ogre`, `werewolf`. Boss: `caddoc`.
- Tier 2: `goblin_armored`, `kobold_armored`, `spider` (drops from above, leaps), `harpy` (flyer; y = hover height), `vknight` (shield knight). Miniboss: `crab`. Boss: `harpy_queen`.
- Tier 3: `mannequin` (only moves when you look away), `werebat` (flyer, hangs), `spider_red`, `necromancer` (skulls, raises zombies, blinks), `zombie_necro` (lobs), `lancer` (charges). Boss: `hydra`.
- Tier 4: `goatman` (charges), `harpy_undead` (flyer, shoots), `plague_knight`. Minibosses: `flesh_spider`, `dragon_green`. Boss: `gravehart`.
- Tier 5: `worm` (burrows, erupts under you), `dragonling` (fire breath), `pknight`, `plague_giant` (slams). Miniboss: `bone_golem`. Boss: `cinder_giant`.
- Tier 6: `dragonling_undead` (frost breath), `witch` (fans of orbs), `night_demon` (teleports behind you), `silver` (paladin). Minibosses: `abyssal_mouth`, `dragon_red`. Boss: `archivist`.
- Tier 7–8: `necro_lord`. Boss: `dragon_black` (flying). Miniboss: `dragon_undead`. Final boss: `hollow_king`.
Bosses/minibosses need `boss: true` (and `mini: true` for minibosses) and a flat arena at least 2.5 screens wide
(big quadrupeds — crab, hydra, gravehart, dragons, flesh_spider — need 3+ screens wide and 2 screens tall). Give boss
arenas a couple of one-way side platforms. Use lower-tier enemies freely in later rooms (they are scaled up), never
enemies more than one tier above the act in which the room is first reachable. 3–7 regular enemies per ordinary room.

## Items
- Chests: prefer `{ tier, rarity }` (random weapon/armour of that act). Named bases use ids from
  `assets/game/weapons/weapons.json` (swords, axes, maces, spears, lances, daggers, bows, boomerangs, kite_*/tower_* shields)
  or the armour ids: leather_cap, iron_helm, great_helm, crown_helm, padded_jerkin, pilgrim_mail, knight_plate, royal_plate,
  wool_cloak, night_cloak, royal_mantle, iron_ring, silver_ring, gold_ring, signet_ring.
- Gems: ruby, sapphire, topaz, emerald, skull, onyx, diamond, amethyst.
- Uniques (each may appear ONCE in the whole castle; your assignment lists which are yours): gravesong, vespertine, cinderfall,
  rimeheart, stormcall, thornkiss, kingsgrief, moonsickle, widowmaker, seraphwing, homeward, lionheart_aegis, worldtree, dragonspine,
  bonecrown, krakenmaw, redthirst, sunsplitter, hollowsun, lastlight. Put uniques in `big: true` chests behind an optional challenge or secret.
- `up: 'life'` / `up: 'mana'` vessels permanently raise max HP/MP: hide 2–4 per district in secrets and hard-to-reach nooks.

## Level-design rules (what "good" means here)
1. **Each room has one idea** — a climb, a gauntlet, a hazard puzzle, an arena, a vista — and a shape that expresses it.
   Mix wide halls (4–6 squares), tall shafts (1×4 … 1×8), big multi-screen chambers (3×3, 4×2) and small 1×1 save/treasure rooms.
2. **It must be fun to move through**: rhythm of jumps, alternate route high/low, landings wide enough to fight on (≥ 3 m),
   enemies placed where their behaviour bites (flyers over gaps, shield knights on narrow bridges, casters on ledges above).
3. **Solid blocks make architecture**: raised daises, stepped floors, pillars you jump between, thick walls with a door-height gap.
   One-way platforms are for ledges and balconies. Avoid long empty flat floors: break every 10–14 m with a block, stair, prop cluster or enemy.
4. **Tease and gate**: visible-but-unreachable chests and doors for later bells; at least 3 such teasers per district, and
   2+ secrets (`cracks by:'hit'` walls with a `rubble`/odd prop hint, `veil` gates, `echo` ledges).
5. **Shortcuts**: later bells should open quick routes back to the hub side of the district.
6. Save rooms (`save`) are small 1×1 `shrine` rooms just before each boss and near district entrances. One `warp` room per district.
7. Never place enemies within 5 m of a door. Never require damage to progress. No blind drops into lava/spikes.
8. Area identity (from Symphony of the Night): library = stacked long corridors of shelves; clock tower = gears (`movers` with `orbit`),
   pendulums (`blades`), flyers; chapel/stair = long diagonal stair climbs with flyers; crypt = low ceilings, coffins, dark;
   caverns = water, waterfalls; mines = short vertical connector; outer wall/tower = single tall shaft with ledges and exits at many heights;
   colosseum/arena = symmetric. Bosses: wide flat arena, sealed doors, bell on a dais at the far side.
9. Write 1–2 `lore` lines per room: terse, gothic, hinting at mechanics or story (the castle's bells were silenced; King Velscour hollowed out the sun).

## Validating
```
node tools/validate_rooms.mjs --area <yourfile>          # errors/warnings for your rooms only
node tools/validate_rooms.mjs --area <yourfile> --room <id>   # also dumps that room's standable surfaces and which were reached
node tools/validate_rooms.mjs --map                      # ASCII map of the whole castle
```
It simulates the player collecting bells in order and reports rooms, doors, chests, items and bells that can never be
reached, enemies standing on nothing, and doors with no partner. "leads nowhere (neighbouring district not built yet)"
warnings for your inter-district doors are expected while other districts are being written; everything else must be clean:
**zero errors**, and no warnings you cannot justify. Items meant for a later bell are fine — they only need to be reachable eventually
(if the bell that unlocks them lives in another district that is not written yet, the validator will report them as unreachable:
list those in your final report instead of weakening the design).

### Testing a district on its own
While the other districts are still being written your entry doors lead nowhere, so tell the validator which bells the
player holds on arrival; it then walks in through every one of your outward doors:
```
node tools/validate_rooms.mjs --area <yourfile> --have slide            # e.g. an act-2 district
node tools/validate_rooms.mjs --area <yourfile> --have slide,djump,dive # later arrival
```
Run it once per arrival kit named in your assignment. With the EARLIEST kit the critical path (entry → boss → bell)
must be reachable; with the LATEST kit (all bells listed, plus your own) every room, chest, item and door must be.
Because `--have` walks in through all outward doors at once, also sanity-check by eye that the critical path really
starts from the entry door your assignment names.
