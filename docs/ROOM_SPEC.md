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

Every regular type has ONE pattern, and a class that says how many swings of an at-level sword it takes:
**fodder** 1–2 · **common** 2–3 · **elite** 4–6 (with a clear opening). Regular foes are raised to the level of the room
they stand in (`roomLevel` in `src/catalog.js`: the district's act, or one act under the room's highest-tier regular), so a
Shambler is 1-hit fodder in act 6 too — use low tiers freely as the crowd. Blows cost about 13 / 21 / 25 % of the hero's life.
Nothing fires from further than ~7 m (the screen's half-width), so a ranged foe must stand within 7 m of the path it covers.

| id | tier | class | pattern (what it demands) | where to place it |
|---|---|---|---|---|
| `zombie` | 1 | fodder 1 | Walks straight at you and rakes. With `rise: true` it claws out of the floor when you come within 6.5 m **on its own level**, and keeps rising near you (3 more times) while you stay within 12 m. | Flat entry corridor ≥ 10 m; 2–4 `rise: true` in a lane. Not under a gallery you want quiet. |
| `child` | 1 | fodder 1 | Flea: two short erratic hops, then a high pounce onto you. Strike before the pounce. | Cramped, uneven ground, steps and low blocks; 1–3 together. |
| `werebat` | 1 | fodder 1 | Hangs from the ceiling until you pass within 5.5 m, then the roost wakes in a wave (0.4 s apart) and each swoops through you, again and again. | **Needs a solid ceiling/block 3–9 m above its `y`** (put `y` on the floor under it); rows of 3–5 over gaps, stairs and climbs. No ceiling: it hovers. |
| `thrall` | 1 | fodder 2 | Runs you down, lunging swing carries it on, then stumbles (0.7 s). | Open halls with 6+ m of run-up; pairs. |
| `goblin` | 1 | fodder 2 | Darts in, stabs, springs back 3 m and waits. Punish the retreat. | Floors ≥ 8 m wide with room behind it; next to a slow foe. |
| `kobold` | 1 | fodder 2 | Holds its ledge and lobs bones in a high arc (also down from up to 8 m above); backs off when you close. Bones can be swatted. | **On a ledge above or below the path**, 3–7 m from it horizontally; top of a stair. |
| `wizard` | 1 | common | Turret: two slow bolts 0.6 s apart, one at ankle height, one at head height (order alternates): jump one, duck the other. Never moves. | End of a flat corridor or landing with ≥ 7 m of clear lane in front; same level as the path. |
| `knight` | 1 | common | Duel: two cuts, each stepping forward, then 0.9 s spent. | Landings ≥ 4 m; first spacing lesson; bridges. |
| `goblin_armored` | 2 | common | Bomber: keeps 4–8 m off and lobs a fused bomb at where you stand (floor sigil, bursts 1.3 s after the throw, 2.4 m wide). | Behind a gap, a low block or another foe; needs 4 m of floor to back along. |
| `kobold_armored` | 2 | common | Sentry: owns 4.5 m either side of its post. Step in and it crouches, then darts 3 m; walks back afterwards. Never leaves its stretch. | **Middle of a stretch of flat floor you must cross** (a bridge, a landing before a door ≥ 5 m away); stacked on stacked platforms. |
| `spider` | 2 | fodder 2 | Hangs on its thread, shivers 0.4 s and drops on whoever walks beneath; bites on the floor, then reels back up. | **Needs a ceiling 3–9 m above** (`y` = the floor below it); over a path, ladder-top or chest. |
| `skitter` | 2 | fodder 1 | Crawler: walks round and round the ledge or block it stands on (top, side, underside), faster while you stand on it. | **On a free-standing platform or block ≤ 16 m round with clear space under and beside it** — the stepping stones of a climb. On the room floor it only paces 3 m. |
| `drowned` | 2 | fodder 2 | Merman: swims the pool bed, the water churns 0.45 s, it leaps clear, spits one clot at the top and falls back. | **Needs water**: `x` inside a `water` pool, `y` = the pool's bed; one per 6–8 m of crossing. |
| `harpy` | 2 | common | Medusa head: crosses in a slow sine wave through your height, turns 6.5 m past you and returns. Its body is the attack. | Over gaps, small platforms and stairs, `y` = 2–3 m above the path; open air or tall rooms. Show the first one on safe ground. |
| `vknight` | 2 | elite | Shield knight: every frontal blow is turned until its own swing is thrown; open for 0.9 s after (gold rim); slow to turn. | Narrow bridges and corridors (low ceiling = cannot be jumped), with 3 m behind it. |
| `mannequin` | 3 | common | A statue while you face it, a sprinter when your back is turned. | Rooms where you must turn away: beside a climb, behind you at a chest, on both sides of a corridor. |
| `spider_red` | 3 | common | Keeps ~6 m off and spits a slow web (swat it); a web that lands binds your legs and it pounces. | Flat floor ≥ 10 m; across a gap from the path; with a melee foe. |
| `shade` | 3 | fodder 2 | Ghost: drifts slowly straight at you **through walls and floors**; a hit throws it back. | Platforming shafts and climbs, 2–3 at once, `y` anywhere (inside a wall is fine). |
| `necromancer` | 3 | common | Raises two Shamblers and keeps raising them; a slow seeking skull between. Backs away. Its dead fall with it. | At the back of a room behind other foes, on the same floor, ≥ 6 m of floor in front of it. |
| `zombie_necro` | 3 | common | Shuffles in lobbing slow clots; killed, it bursts into two Dead Children. | Open floor (the children need landing room); not on a 2 m ledge. |
| `lancer` | 3 | elite | Lowers its lance 0.7 s, then charges the length of its floor behind its shield: jump it. Skids open for 1 s; a wall stuns it. | **Flat corridor or bridge ≥ 10 m long**, ceiling ≥ 4 m so it can be jumped; no pit in its lane. |
| `goatman` | 4 | common | Axe Armor: slow advance, returning axe thrown high or low (glint and stoop show which): duck or jump, twice. | Narrow corridor at the hero's level, 5–9 m of lane; classic with a `harpy`. |
| `harpy_undead` | 4 | common | Flies a pass 4 m overhead dropping three quills (floor marks), then dips to head height for 1.4 s. | Open rooms ≥ 6 m tall and ≥ 12 m wide; over bridges. `y` = 4 m above the path. |
| `plague_knight` | 4 | elite | Raises its mace 0.6 s, then advances spinning for 1.5 s (turns blows, bites both sides); dizzy and open 1.2 s after. | Floors ≥ 8 m so you can back away; never in a dead end. |
| `worm` | 5 | common | Travels under the floor, erupts beneath you (ground heaves 0.45 s), spits one arc, burrows after 3 s. | Wide solid floors (not one-way platforms), ≥ 10 m; mines. |
| `dragonling` | 5 | common | Bites; at 2–5 m rears and breathes fire along the floor for 1 s (crouch, jump or get behind). | On the hero's level, corridors and landings; pairs facing each other. |
| `pknight` | 5 | elite | Leaps to where you stand (sigil marks the landing, floor bursts 2.6 m wide); blade stuck 1 s. | Rooms ≥ 4 m tall with ≥ 8 m of floor; arenas. |
| `plague_giant` | 5 | elite | Fills the lane: slam sends a floor wave at you (jump it), sweeps up close; winded after both. | Corridor gate, ceiling ≥ 4.5 m, ≥ 10 m of flat floor in front. |
| `dragonling_undead` | 6 | common | As the whelp with frost; struck down it falls apart and rebuilds in 2.4 s unless hit once more. | Narrow paths where you must stay to finish it. |
| `witch` | 6 | common | Casts a fan of three slow orbs, stands 1 s, then blinks to a violet floor sigil 5–7 m from you. | Multi-level rooms with 3+ landings ≥ 2 m wide on her level. |
| `night_demon` | 6 | elite | Stalks, sinks away and rises at your back (dark sigil) already winding a claw. | Open floors ≥ 8 m; never beside a pit edge. |
| `silver` | 6 | elite | Paladin: sets a pale-blue ward for 1.1 s (a blow into it is thrown back as a riposte), then two cuts, then spent. | Bridges and landings ≥ 5 m; duel space, nothing else within 4 m. |
| `necro_lord` | 7 | elite | Three skulls circle it (they bite; swat them); it looses them to seek you and stands bare 3 s. | Centre of a platform ≥ 6 m with approach from both sides. |

- Minibosses: `ogre`, `werewolf` (1) · `crab` (2) · `flesh_spider`, `dragon_green` (4) · `bone_golem` (5) · `abyssal_mouth`,
  `dragon_red` (6) · `dragon_undead` (8). Bosses: `caddoc` (1) · `harpy_queen` (2) · `hydra` (3) · `gravehart` (4) ·
  `cinder_giant` (5) · `archivist` (6) · `dragon_black` (7, flying) · `hollow_king` (8). Minibosses take ~30–37 swings, bosses ~62–77.
Bosses/minibosses need `boss: true` (and `mini: true` for minibosses) and a flat arena at least 2.5 screens wide
(big quadrupeds — crab, hydra, gravehart, dragons, flesh_spider — need 3+ screens wide and 2 screens tall). Give boss
arenas a couple of one-way side platforms. Never use enemies more than one tier above the act in which the room is first reachable.

**Density.** An ordinary multi-screen room holds **5–10 regular enemies** (a 1×1 room 2–4): roughly 60 % fodder, 30 % common,
at most one or two elites. Aim for **1–3 active threats per screen**, one of them the lead, and give two foes on a screen
different demands (ground + air, melee + ranged). Keep the **first 5 m inside every door clear**, and keep ranged foes out of
the first 8 m. Introduce a type alone on safe ground before combining it. Flyers (`harpy`, `harpy_undead`, `werebat`, `shade`)
take `y` as their hover height; everything else must stand on a surface.

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
   enemies placed where their behaviour bites (see the bestiary's placement column).
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
