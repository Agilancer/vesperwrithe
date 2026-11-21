// WATERWORKS + CATACOMBS (acts 2-4).
// Region A (east, under the Grand Vestibule): Sunken Aqueduct (slide) -> Fungal Reservoir -> Cistern of Echoes (djump)
// -> the Drowned Hydra and the Drowned Bell (dive) -> the Obsidian Sump (door to the mines, needs Thornstep).
// Region B (west, under the Undercroft Well): Catacombs of the Nameless and the Royal Crypts (dive). The two regions
// join under water at the foot of the Weeping Shaft (row 7).
// Numbers follow the validator: single jump <= 2.2 m rise, double jump <= 3.9 m, slide crawls are exactly 1.2 m high.
// Water is never deeper than 4 m (so a diver can surface) and drowned loot always lies under >= 3 m of it.
const zig = (list) => list.map(([x, y, w]) => ({ x, y, w }));

export default [
  // ================================================================== SUNKEN AQUEDUCT (act 2: slide)

  // Entry. The Vestibule's floor hole drops you onto the plank under it; two stacked planks and a stone step lead back
  // up with single jumps. The way on is the crawl under the fallen sluice gate. Past it a floor hole drops into the
  // reservoir attic (a dead end until Dive). East: a spirit gate guards Rimeheart (Shade Dash).
  { id: 'sluice_gate', name: 'The Fallen Sluice', area: '06', col: 28, row: 1, w: 3, h: 1, theme: 'aqueduct',
    doors: [{ side: 'N', col: 29 }, { side: 'W', row: 1 }, { side: 'S', col: 28 }],
    platforms: zig([[18.5, 5.7, 3], [17.5, 3.8, 5]]),
    blocks: [{ x: 11.5, y: 1.7, w: 4, h: 5.3 },             // the fallen gate: slide under it
      { x: 23, y: 0.5, w: 2.5, h: 1.4 },                     // step up to the planks
      { x: 27, y: 0.5, w: 13, h: 0.8 },                      // dais of the spirit gate
      { x: 33.2, y: 5.6, w: 1.6, h: 1.4 }],                  // lintel over the gate
    gates: [{ x: 34, y: 1.3, kind: 'ghost' }],
    chests: [{ x: 37.3, y: 1.3, unique: 'rimeheart', big: true }],
    enemies: [{ t: 'goblin', x: 27.6, y: 1.3 }, { t: 'zombie', x: 29.4, y: 1.3, rise: true }, { t: 'kobold', x: 31.6, y: 1.3 }],
    breakables: [{ x: 2.5 }, { x: 16.8 }, { x: 28.6, y: 1.3 }, { x: 31, y: 1.3 }],
    props: [{ t: 'portcullis', x: 13.5 }, { t: 'chain', x: 12 }, { t: 'chain', x: 15 }, { t: 'pipe', x: 6.6 }, { t: 'pipe', x: 24.5 }, { t: 'waterfall', x: 39 },
      { t: 'torch', x: 3 }, { t: 'torch', x: 16.6 }, { t: 'torch', x: 27.5, y: 1.3 }, { t: 'brazier', x: 32.4, y: 1.3 }, { t: 'brazier', x: 35.7, y: 1.3 }, { t: 'statue', x: 38.8, y: 1.3 },
      { t: 'rubble', x: 10 }, { t: 'ivy', x: 9 }, { t: 'barrel', x: 30, y: 1.3 }, { t: 'crate', x: 22.2 }, { t: 'arch', x: 34, y: 1.3 }],
    lore: [{ x: 16.5, text: 'The sluice gate fell an age ago. A body could pass beneath it lying down, if it knew how.' },
      { x: 31.5, text: 'Pale bars of cold light. Steel passes through them; flesh does not — yet.' }] },

  // Wide channel hall: brick piers between water channels, harpies over the gaps, a pipe crawl on the second pier.
  // Dive extra: the third pier is hollow under a cracked capstone. Double-jump extra: the mana vessel on the high pipe.
  { id: 'sunken_aqueduct', name: 'The Sunken Aqueduct', area: '06', col: 23, row: 1, w: 5, h: 1, theme: 'aqueduct',
    doors: [{ side: 'W', row: 1 }, { side: 'E', row: 1 }],
    stairs: [{ x: 6, steps: 4, dir: 1 }, { x: 62, steps: 4, dir: -1 }],
    blocks: [{ x: 10, y: 0.5, w: 8, h: 2 },                  // pier 1
      { x: 21.5, y: 0.5, w: 8.5, h: 2 },                     // pier 2
      { x: 24.5, y: 3.7, w: 3, h: 3.3 },                     // great pipe across pier 2: slide under
      { x: 35, y: 0.5, w: 4, h: 2 }, { x: 42, y: 0.5, w: 4.5, h: 2 }, // pier 3, hollow in the middle
      { x: 49.5, y: 0.5, w: 8.5, h: 2 }],                    // pier 4
    cracks: [{ x: 39, y: 2.0, w: 3, h: 0.5, by: 'dive' }],   // capstone of the hollow pier
    water: [{ x: 18, y: 0.5, w: 3.5, h: 1.6 }, { x: 30, y: 0.5, w: 5, h: 1.6 }, { x: 46.5, y: 0.5, w: 3, h: 1.6 }],
    platforms: zig([[31.7, 2.5, 1.6], [12, 4.6, 3.5], [51.5, 5.2, 3]]),
    enemies: [{ t: 'kobold_armored', x: 14.5, y: 2.5 }, { t: 'harpy', x: 19.7, y: 5 }, { t: 'goblin_armored', x: 29, y: 2.5 }, { t: 'harpy', x: 32.5, y: 5.2 },
      { t: 'spider', x: 37, y: 2.5 }, { t: 'spider', x: 44.5, y: 2.5 }, { t: 'kobold_armored', x: 54.5, y: 2.5 }],
    chests: [{ x: 40.5, tier: 3, rarity: 'rare' }],
    items: [{ x: 53, y: 5.2, up: 'mana' }],
    breakables: [{ x: 3 }, { x: 13.6, y: 4.6 }, { x: 23, y: 2.5 }, { x: 45, y: 2.5 }, { x: 64.5 }],
    props: [{ t: 'torch', x: 3.5 }, { t: 'torch', x: 15, y: 2.5 }, { t: 'torch', x: 28.5, y: 2.5 }, { t: 'torch', x: 43.5, y: 2.5 }, { t: 'torch', x: 56, y: 2.5 }, { t: 'torch', x: 64 },
      { t: 'waterfall', x: 19.7 }, { t: 'waterfall', x: 48 }, { t: 'pipe', x: 26, y: 2.5 }, { t: 'pipe', x: 53, y: 2.5 }, { t: 'pipe', x: 34 }, { t: 'arch', x: 32.5 },
      { t: 'chain', x: 32.5 }, { t: 'ivy', x: 11 }, { t: 'ivy', x: 50.5 }, { t: 'barrel', x: 16.5, y: 2.5 }, { t: 'crate', x: 22.4, y: 2.5 }, { t: 'web', x: 40.5, y: 2.5 }, { t: 'rubble', x: 40.4, y: 2.5 }],
    lore: [{ x: 22.5, text: 'The great pipe still sweats. Whatever it carried to the castle, it was not water.' },
      { x: 38.5, text: 'The capstone rings hollow underfoot, and is cracked clean across.' }] },

  // The district's warp mirror, between the aqueduct and the shaft.
  { id: 'tide_mirror', name: 'Mirror of the Tides', area: '06', col: 22, row: 1, w: 1, h: 1, theme: 'shrine', warp: { x: 6.67 },
    doors: [{ side: 'W', row: 1 }, { side: 'E', row: 1 }],
    props: [{ t: 'candles', x: 2.6 }, { t: 'candles', x: 10.7 }, { t: 'rosewindow', x: 6.67 }, { t: 'statue', x: 4.2 }, { t: 'statue', x: 9.1 }, { t: 'rug', x: 6.67 }, { t: 'pipe', x: 12.2 }, { t: 'ivy', x: 1.2 }],
    lore: [{ x: 6.6, text: 'The glass shows a corridor you have not walked yet.' }] },

  // 52 m shaft. Upper four screens: a single-jump zigzag down past waterfalls to the Maw's basin. The floor at the
  // bottom is cracked (Dive). Under it: three flooded screens; the door west at the very bottom is under water and
  // is the only link to the catacombs.
  { id: 'weeping_shaft', name: 'The Weeping Shaft', area: '06', col: 21, row: 1, w: 1, h: 7, theme: 'aqueduct',
    doors: [{ side: 'E', row: 1 }, { side: 'E', row: 4 }, { side: 'W', row: 7 }, { side: 'E', row: 2 }],
    blocks: [{ x: 0, y: 22, w: 4.9, h: 1 }, { x: 8.5, y: 22, w: 4.833, h: 1 }], // floor of the upper shaft
    cracks: [{ x: 4.9, y: 22, w: 3.6, h: 1, by: 'dive' }, { x: 12.33, y: 38.0, w: 1.0, h: 3.8, hp: 3 }], // a sealed choir-loft door off the upper shaft
    platforms: zig([
      // upper shaft: 2 m steps, climbable with one jump
      [5.5, 43.4, 3.2], [1, 41.4, 3.4], [5.2, 39.3, 3], [7.0, 37.3, 3.0], [5, 35.2, 3], [0.8, 33.2, 3.2], [4.8, 31.1, 3], [9.2, 29.1, 3.4], [5.4, 27.0, 3], [1.2, 25.0, 3.2],
      // drowned shaft: double-jump steps from the water back up through the broken floor
      [5.2, 19.9, 3], [1.5, 17.9, 3.2], [8, 14.5, 3.4], [2, 11.0, 3.4], [8.5, 7.5, 3.2]]),
    water: [{ x: 0, y: 0.5, w: 13.333, h: 4 }],
    enemies: [{ t: 'spider', x: 2.6, y: 41.4 }, { t: 'harpy', x: 7, y: 36.4 }, { t: 'spider', x: 6.3, y: 31.1 }, { t: 'kobold_armored', x: 2.6, y: 23 },
      { t: 'werebat', x: 6.5, y: 12.5 }, { t: 'spider_red', x: 9.7, y: 14.5 }],
    chests: [{ x: 1.7, y: 33.2, gem: 'sapphire' }, { x: 9.8, y: 0.5, tier: 4, rarity: 'rare' }],
    breakables: [{ x: 6.5, y: 35.2 }, { x: 8.6, y: 37.3 }, { x: 11.5, y: 23 }, { x: 3.4, y: 11.0 }],
    props: [{ t: 'waterfall', x: 12, y: 30 }, { t: 'waterfall', x: 1.2, y: 8 }, { t: 'chain', x: 6.7, y: 44 }, { t: 'chain', x: 6.7, y: 16 },
      { t: 'torch', x: 12.3, y: 45.5 }, { t: 'torch', x: 1, y: 41.4 }, { t: 'torch', x: 12.3, y: 37.3 }, { t: 'torch', x: 1, y: 33.2 }, { t: 'torch', x: 12.3, y: 29.1 }, { t: 'torch', x: 1, y: 25 },
      { t: 'torch', x: 12.3, y: 23 }, { t: 'torch', x: 12.3, y: 14.5 }, { t: 'torch', x: 1, y: 11 }, { t: 'pipe', x: 3, y: 39.3 }, { t: 'pipe', x: 10, y: 27 }, { t: 'ivy', x: 0.8, y: 30 },
      { t: 'web', x: 11.5, y: 43 }, { t: 'web', x: 2, y: 18 }, { t: 'rubble', x: 6.7, y: 23 }, { t: 'stalactite', x: 4, y: 19 }],
    lore: [{ x: 6.7, y: 23, text: 'The flagstones are cracked through. Far below, water closes over a doorway.' },
      { x: 3, y: 0.5, text: 'The drowned door leads west, to where the castle keeps the dead it would not name.' }] },

  // Miniboss arena: the Sluice Maw (crab). Flat basin, two side ledges; the chain-hung slab overhead needs the double jump.
  { id: 'sluice_maw', name: 'Basin of the Sluice Maw', area: '06', col: 22, row: 3, w: 3, h: 2, theme: 'aqueduct',
    doors: [{ side: 'W', row: 4 }, { side: 'E', row: 4 }],
    platforms: zig([[3.5, 2.7, 5], [31.5, 2.7, 5], [10.5, 4.9, 4], [25.5, 4.9, 4], [17, 8.4, 6]]),
    enemies: [{ t: 'crab', x: 22, boss: true, mini: true }],
    chests: [{ x: 20, y: 8.4, tier: 3, rarity: 'rare' }, { x: 33.5, y: 2.7, tier: 2, rarity: 'magic' }],
    breakables: [{ x: 6 }, { x: 34.5 }, { x: 12.5, y: 4.9 }, { x: 27.5, y: 4.9 }],
    props: [{ t: 'waterfall', x: 20 }, { t: 'waterfall', x: 38.6 }, { t: 'pipe', x: 8 }, { t: 'pipe', x: 31 }, { t: 'chain', x: 17.6, y: 8.4 }, { t: 'chain', x: 22.4, y: 8.4 },
      { t: 'torch', x: 2.5 }, { t: 'torch', x: 37.5 }, { t: 'torch', x: 11, y: 4.9 }, { t: 'torch', x: 29, y: 4.9 }, { t: 'barrel', x: 7.5 }, { t: 'crate', x: 33 },
      { t: 'bones', x: 14 }, { t: 'bones', x: 27 }, { t: 'rubble', x: 30 }, { t: 'gargoyle', x: 20, y: 8.4 }, { t: 'ivy', x: 1.2 }, { t: 'hook', x: 13 }],
    lore: [{ x: 7, text: 'The basin floor is scored by claws the width of a cart. The sluice keeper never left his post.' }] },

  { id: 'stillwater_shrine', name: 'Shrine of Still Water', area: '06', col: 25, row: 4, w: 1, h: 1, theme: 'shrine', save: { x: 6.67 },
    doors: [{ side: 'W', row: 4 }, { side: 'E', row: 4 }],
    props: [{ t: 'candles', x: 3.4 }, { t: 'candles', x: 9.9 }, { t: 'rosewindow', x: 6.67 }, { t: 'fountain', x: 11 }, { t: 'statue', x: 2 }, { t: 'rug', x: 6.67 }, { t: 'ivy', x: 12.3 }, { t: 'pipe', x: 1 }],
    lore: [{ x: 10.5, text: 'One basin in all the waterworks runs clear. Pilgrims drank here before they went down.' }] },

  // ================================================================== FUNGAL RESERVOIR (3x3 cavern)
  // Climb: stair -> west bank -> mushroom caps over the reservoir -> east bank -> the exit ledge on the east wall.
  // Teasers: Moonsickle up the west chimney (Thornstep), the hanging island (Echo Sight), a drowned chest (Dive),
  // and the attic under the Fallen Sluice whose cracked floor becomes the Dive shortcut to and from the hub.
  { id: 'fungal_reservoir', name: 'Fungal Reservoir', area: '12', col: 26, row: 2, w: 3, h: 3, theme: 'aqueduct',
    doors: [{ side: 'W', row: 4 }, { side: 'E', row: 3 }, { side: 'N', col: 28 }],
    stairs: [{ x: 5, steps: 7, dir: 1 }],
    blocks: [{ x: 12, y: 0.5, w: 3, h: 3.5 },                // west bank
      { x: 27, y: 0.5, w: 13, h: 3.5 },                      // east bank
      { x: 5, y: 7.5, w: 1.5, h: 14.5 },                     // hanging rock: makes the west chimney
      { x: 27, y: 16.5, w: 4, h: 1 }, { x: 34.6, y: 16.5, w: 5.4, h: 1 }, { x: 27, y: 17.5, w: 1, h: 4.5 }], // attic floor and wall
    cracks: [{ x: 31, y: 16.5, w: 3.6, h: 1, by: 'dive' }],
    water: [{ x: 15, y: 0.5, w: 12, h: 3.1 }],
    platforms: zig([[8, 6.2, 3], [16, 5.4, 2.6], [20.5, 6.6, 2.6], [24.6, 5.6, 2.4], [32.5, 6.0, 3.5], // caps and the step to the exit
      [33, 11.6, 3], [31.4, 14.0, 2.8],                      // double-jump climb to the attic crack
      [31.9, 19.0, 2.9], [31.9, 20.8, 2.9],                  // attic: back up through the hole
      [0.5, 14, 4],                                          // chimney shelf
      [19, 15.2, 4]]),                                       // the hanging island
    echo: [{ x: 15.5, y: 9.8, w: 2.6 }, { x: 20, y: 12.6, w: 2.6 }],
    enemies: [{ t: 'spider', x: 9.5, y: 6.2 }, { t: 'kobold_armored', x: 13.5, y: 4 }, { t: 'harpy', x: 21, y: 9.6 }, { t: 'spider', x: 29.5, y: 4 }, { t: 'goblin_armored', x: 33.2, y: 4 }],
    chests: [{ x: 2.5, y: 14, unique: 'moonsickle', big: true }, { x: 21, y: 0.5, tier: 3, rarity: 'rare' }, { x: 20, y: 15.2, tier: 5, rarity: 'rare' }, { x: 37.5, y: 17.5, gem: 'emerald' }],
    items: [{ x: 22, y: 15.2, gem: 'amethyst' }],
    breakables: [{ x: 3 }, { x: 10.2, y: 6.2 }, { x: 31, y: 4 }, { x: 36.5, y: 4 }, { x: 29.5, y: 17.5 }],
    props: [{ t: 'mushroom', x: 13.2, y: 4 }, { t: 'mushroom', x: 17.3 }, { t: 'mushroom', x: 21.8 }, { t: 'mushroom', x: 25.8 }, { t: 'mushroom', x: 28.5, y: 4 }, { t: 'mushroom', x: 36, y: 4 }, { t: 'mushroom', x: 38.5, y: 17.5 },
      { t: 'waterfall', x: 26.2 }, { t: 'stalactite', x: 10, y: 16 }, { t: 'stalactite', x: 24.5, y: 16 }, { t: 'crystal', x: 30.5, y: 4 },
      { t: 'torch', x: 2.5 }, { t: 'torch', x: 14.2, y: 4 }, { t: 'torch', x: 31.5, y: 4 }, { t: 'torch', x: 38.6, y: 8 }, { t: 'torch', x: 36, y: 17.5 }, { t: 'chain', x: 21, y: 15.2 },
      { t: 'web', x: 3, y: 14 }, { t: 'bones', x: 29.3, y: 17.5 }, { t: 'rubble', x: 35.6, y: 17.5 }],
    lore: [{ x: 13.5, y: 4, text: 'Pale caps drink from the dark water. Something glints on the bottom.' },
      { x: 33, y: 17.5, text: 'A dry sump under the sluice. Its flagstones are cracked through, and the reservoir sighs beneath them.' }] },

  // ================================================================== CISTERN OF ECHOES (act 3: double jump)

  // The gate. You arrive on the west ledge; the cistern door is a full screen higher on the east wall, two 3.7 m
  // jumps away. Below, a flooded well (single-jump planks lead back up) with a drowned chest for the Dive.
  { id: 'echo_threshold', name: 'The Echoing Threshold', area: '09', col: 29, row: 2, w: 1, h: 3, theme: 'cistern',
    doors: [{ side: 'W', row: 3 }, { side: 'E', row: 2 }],
    platforms: zig([[5.2, 11.7, 3.2], [8.6, 5.0, 3.2], [4.4, 6.6, 3]]),
    water: [{ x: 0, y: 0.5, w: 13.333, h: 3 }],
    enemies: [{ t: 'harpy', x: 4, y: 16.5 }, { t: 'spider', x: 6.9, y: 11.7 }, { t: 'harpy', x: 9, y: 4.6 }],
    chests: [{ x: 10.5, y: 0.5, tier: 3, rarity: 'rare' }],
    breakables: [{ x: 1.5, y: 8 }, { x: 9.8, y: 5.0 }],
    props: [{ t: 'waterfall', x: 11.6, y: 8 }, { t: 'pipe', x: 2 }, { t: 'chain', x: 6.8, y: 11.7 }, { t: 'torch', x: 1.4, y: 8 }, { t: 'torch', x: 12.2, y: 15.5 }, { t: 'arch', x: 12.4, y: 15.5 },
      { t: 'stalactite', x: 4, y: 18 }, { t: 'stalactite', x: 8.5, y: 18 }, { t: 'ivy', x: 0.9, y: 12 }, { t: 'crystal', x: 3, y: 0.5 }, { t: 'gargoyle', x: 11.5, y: 15.5 }],
    lore: [{ x: 2, y: 8, text: 'The cistern lies above and beyond. The ledge hangs a bell\'s breadth out of reach.' }] },

  // 4x3 vault. Cross the drowned west basin on pillar tops, step down the dam to the dry drain floor, and drop through
  // the drain to the shrine. East: over the tank wall, Krakenmaw lies under 4 m of water (Dive).
  { id: 'cistern_echoes', name: 'Cistern of Echoes', area: '09', col: 30, row: 2, w: 4, h: 3, theme: 'cistern',
    doors: [{ side: 'W', row: 2 }, { side: 'S', col: 32 }],
    blocks: [{ x: 5.5, y: 0.5, w: 2.5, h: 12.5 }, { x: 10.5, y: 0.5, w: 2.5, h: 10 }, { x: 15.5, y: 0.5, w: 2.5, h: 7.5 }, // pillars: 13.0, 10.5, 8.0
      { x: 20.5, y: 0.5, w: 2, h: 5 },                       // dam
      { x: 40, y: 0.5, w: 1.5, h: 7.5 },                     // tank wall
      { x: 26, y: 9, w: 12, h: 1 }],                         // hanging gallery
    water: [{ x: 0, y: 0.5, w: 20.5, h: 4 }, { x: 41.5, y: 0.5, w: 11.833, h: 4 }],
    platforms: zig([[23.5, 3.0, 3], [36.5, 3.6, 3.2], [37.5, 6.2, 2.4], [43.5, 6.3, 3]]),
    enemies: [{ t: 'werebat', x: 9.2, y: 16.5 }, { t: 'werebat', x: 16.8, y: 12 }, { t: 'spider_red', x: 24.3 }, { t: 'lancer', x: 26.2 },
      { t: 'necromancer', x: 29, y: 10 }, { t: 'mannequin', x: 35.5, y: 10 }, { t: 'werebat', x: 47, y: 9.5 }],
    chests: [{ x: 49.5, y: 0.5, unique: 'krakenmaw', big: true }, { x: 14.25, y: 0.5, tier: 4, rarity: 'magic' }, { x: 27.3, y: 10, tier: 3, rarity: 'rare' }],
    items: [{ x: 9.25, y: 0.5, up: 'life' }],
    breakables: [{ x: 24, y: 0.5 }, { x: 38.6, y: 0.5 }, { x: 32, y: 10 }, { x: 21.5, y: 5.5 }],
    props: [{ t: 'waterfall', x: 1.6 }, { t: 'waterfall', x: 52 }, { t: 'pipe', x: 19.6 }, { t: 'chain', x: 27, y: 10 }, { t: 'chain', x: 37, y: 10 }, { t: 'statue', x: 30, y: 10 },
      { t: 'torch', x: 1.5, y: 15.5 }, { t: 'torch', x: 21.5, y: 5.5 }, { t: 'torch', x: 26.5 }, { t: 'torch', x: 38.5 }, { t: 'torch', x: 33.5, y: 10 }, { t: 'torch', x: 40.7, y: 8 },
      { t: 'column', x: 28.5 }, { t: 'column', x: 37 }, { t: 'arch', x: 33.3 }, { t: 'stalactite', x: 13, y: 16 }, { t: 'stalactite', x: 45, y: 14 }, { t: 'crystal', x: 51, y: 0.5 }, { t: 'gargoyle', x: 6.7, y: 13 }, { t: 'rubble', x: 29.5 }],
    lore: [{ x: 2, y: 15.5, text: 'A drowned vault of pillars. Every drip comes back as three.' },
      { x: 38.5, y: 0.5, text: 'Behind the tank wall, deep under still water, a jaw of black iron waits for a hand.' }] },

  { id: 'lastbreath_shrine', name: 'Shrine of the Last Breath', area: '09', col: 32, row: 5, w: 1, h: 1, theme: 'shrine', save: { x: 2.6 },
    doors: [{ side: 'N', col: 32 }, { side: 'E', row: 5 }],
    platforms: zig([[5.2, 5.6, 2.9], [5.2, 3.4, 2.9]]),
    props: [{ t: 'candles', x: 1.2 }, { t: 'candles', x: 4.1 }, { t: 'rosewindow', x: 2.6 }, { t: 'chain', x: 5.4 }, { t: 'chain', x: 7.9 }, { t: 'statue', x: 10.6 }, { t: 'torch', x: 12 }, { t: 'pipe', x: 9.2 }],
    lore: [{ x: 10.5, text: 'Past this door the floor falls away. Take your breath here.' }] },

  // Boss: the Drowned Hydra. You drop in from the west ledge; flat floor, two side planks, the bell dais at the east end.
  { id: 'drowned_hydra', name: 'Throne of the Drowned Hydra', area: '09', col: 33, row: 5, w: 4, h: 2, theme: 'cistern', boss: 'hydra',
    doors: [{ side: 'W', row: 5 }, { side: 'E', row: 6 }],
    platforms: zig([[3.5, 4.2, 4.5], [45.3, 4.2, 4.5]]),
    blocks: [{ x: 44.5, y: 0.5, w: 6, h: 0.6 }],             // bell dais
    shallow: [{ x: 5, w: 38.5 }],                             // ankle-deep black water across the whole arena
    enemies: [{ t: 'hydra', x: 28, boss: true }],
    bell: { id: 'dive', x: 47.5, y: 1.1 },
    breakables: [{ x: 9.5 }, { x: 40.5 }],
    props: [{ t: 'column', x: 11 }, { t: 'column', x: 22 }, { t: 'column', x: 33 }, { t: 'column', x: 43 }, { t: 'waterfall', x: 1.4 }, { t: 'waterfall', x: 26.7 }, { t: 'waterfall', x: 52 },
      { t: 'torch', x: 2, y: 8 }, { t: 'torch', x: 10 }, { t: 'torch', x: 20 }, { t: 'torch', x: 34 }, { t: 'torch', x: 43.5 }, { t: 'candles', x: 45.2, y: 1.1 }, { t: 'candles', x: 49.8, y: 1.1 },
      { t: 'arch', x: 47.5, y: 1.1 }, { t: 'statue', x: 51.6 }, { t: 'chain', x: 38 }, { t: 'bones', x: 15 }, { t: 'rubble', x: 37.5 }, { t: 'stalactite', x: 27, y: 8 }],
    lore: [{ x: 2, y: 8, text: 'Three throats breathe in the dark below. The water does not ripple.' }] },

  // Past the hydra: a pit of black glass. The mines door stands on a sheer 7.5 m wall — nothing but Thornstep climbs it.
  { id: 'obsidian_sump', name: 'The Obsidian Sump', area: '09', col: 37, row: 6, w: 2, h: 2, theme: 'cistern',
    doors: [{ side: 'W', row: 6 }, { side: 'E', row: 6 }],
    platforms: zig([[3.5, 4.2, 4]]),
    enemies: [{ t: 'spider_red', x: 11.5 }, { t: 'spider_red', x: 17 }, { t: 'werebat', x: 13.5, y: 9.5 }],
    chests: [{ x: 21.5, tier: 4, rarity: 'magic' }],
    breakables: [{ x: 9 }, { x: 19.5 }],
    props: [{ t: 'crystal', x: 6 }, { t: 'crystal', x: 14.5 }, { t: 'crystal', x: 23 }, { t: 'crystal', x: 25, y: 8 }, { t: 'rubble', x: 10 }, { t: 'rubble', x: 20.5 }, { t: 'stalactite', x: 9, y: 9 }, { t: 'stalactite', x: 17.5, y: 9 },
      { t: 'torch', x: 1.5, y: 8 }, { t: 'torch', x: 25.2, y: 8 }, { t: 'torch', x: 13 }, { t: 'chain', x: 12.5 }, { t: 'web', x: 22.5, y: 8 }, { t: 'gatearch', x: 26.1, y: 8 }, { t: 'pipe', x: 5 }, { t: 'bones', x: 16 }],
    lore: [{ x: 22, text: 'Sheer obsidian, slick as a mirror. Only thorns could find a hold on it.' }] },

  // ================================================================== CATACOMBS OF THE NAMELESS (act 4: dive)

  // Long low tunnel. The Undercroft Well drops you into a walled charnel pit (double jump out). West: the shrine.
  // East: a crawl under a collapsed lintel, more low vaults, and the bone-chute down to the Drowned Charnel.
  { id: 'cat_nameless', name: 'Catacombs of the Nameless', area: '18', col: 13, row: 5, w: 6, h: 1, theme: 'catacomb',
    doors: [{ side: 'N', col: 15 }, { side: 'W', row: 5 }, { side: 'S', col: 18 }],
    platforms: zig([[31.9, 5.2, 2.9]]),
    blocks: [{ x: 7, y: 3.3, w: 15, h: 3.7 },                // low vault (2.8 m)
      { x: 28, y: 0.5, w: 1.5, h: 2.9 }, { x: 38, y: 0.5, w: 1.5, h: 2.9 }, // walls of the pit under the well
      { x: 46, y: 1.7, w: 4, h: 5.3 },                       // collapsed lintel: slide under
      { x: 54, y: 3.6, w: 12, h: 3.4 },                      // second low vault
      { x: 24, y: 0.5, w: 2.5, h: 1.1 }, { x: 58, y: 0.5, w: 2.5, h: 1.1 }], // stone coffins to vault over
    enemies: [{ t: 'zombie', x: 11, rise: true }, { t: 'zombie', x: 17.5, rise: true }, { t: 'necromancer', x: 22.5 }, { t: 'spider_red', x: 43 },
      { t: 'zombie_necro', x: 52.5 }, { t: 'spider_red', x: 63.5 }],
    chests: [{ x: 56, tier: 4, rarity: 'magic' }],
    breakables: [{ x: 5.5 }, { x: 20 }, { x: 36 }, { x: 44.5 }, { x: 68 }],
    props: [{ t: 'skullwall', x: 10 }, { t: 'skullwall', x: 18 }, { t: 'skullwall', x: 42 }, { t: 'skullwall', x: 61 }, { t: 'coffin', x: 4.5 }, { t: 'coffin', x: 14.5 }, { t: 'coffin', x: 31 }, { t: 'coffin', x: 68.5 },
      { t: 'bones', x: 8 }, { t: 'bones', x: 51 }, { t: 'bones', x: 70 }, { t: 'torch', x: 3 }, { t: 'torch', x: 23.5 }, { t: 'torch', x: 41 }, { t: 'torch', x: 52 }, { t: 'torch', x: 67 }, { t: 'torch', x: 77.5 },
      { t: 'web', x: 26.5 }, { t: 'sarcophagus', x: 77 }, { t: 'rubble', x: 45 }],
    lore: [{ x: 33.3, text: 'The names were chiselled from every lid. The dead here are owed nothing.' },
      { x: 69.5, text: 'Water glimmers far down the bone-chute.' }] },

  { id: 'unmarked_shrine', name: 'Shrine of Unmarked Graves', area: '18', col: 12, row: 5, w: 1, h: 1, theme: 'shrine', save: { x: 6 },
    doors: [{ side: 'E', row: 5 }],
    props: [{ t: 'candles', x: 3 }, { t: 'candles', x: 9 }, { t: 'rosewindow', x: 6 }, { t: 'grave', x: 1.6 }, { t: 'grave', x: 2.8 }, { t: 'grave', x: 10.6 }, { t: 'bones', x: 11.6 }, { t: 'coffin', x: 1 }],
    lore: [{ x: 3, text: 'Someone still lights candles for them. The wax is warm.' }] },

  // 4x2. The bone-chute lands you high; step down to the charnel floor. East, past the dam, the charnel is flooded to
  // the roof of a low tunnel: the only way to the Weeping Shaft is along its bottom (Dive). A chest lies in the tunnel.
  { id: 'drowned_charnel', name: 'The Drowned Charnel', area: '18', col: 17, row: 6, w: 4, h: 2, theme: 'catacomb',
    doors: [{ side: 'N', col: 18 }, { side: 'W', row: 7 }, { side: 'E', row: 7 }],
    platforms: zig([[18.5, 12.3, 3], [13.5, 9.0, 3.5], [19, 5.8, 3.5], [13.5, 2.9, 3.2]]),
    blocks: [{ x: 24.5, y: 0.5, w: 2, h: 2 }, { x: 26.5, y: 0.5, w: 1.5, h: 4.1 }, // step and dam (top 4.6, water at 4.5)
      { x: 33, y: 3.0, w: 20.333, h: 11.5 }],                // rock over the flooded tunnel
    water: [{ x: 28, y: 0.5, w: 5, h: 4 }, { x: 33, y: 0.5, w: 20.333, h: 2.5 }],
    enemies: [{ t: 'plague_knight', x: 8.5 }, { t: 'harpy_undead', x: 8, y: 8 }, { t: 'zombie_necro', x: 15, y: 9.0 }, { t: 'goatman', x: 20.5 }, { t: 'spider_red', x: 20.8, y: 5.8 }],
    chests: [{ x: 44, tier: 4, rarity: 'rare' }],
    items: [{ x: 30.5, y: 0.5, gem: 'sapphire' }, { x: 48, y: 0.5, gold: 80 }],
    breakables: [{ x: 5.5 }, { x: 11 }, { x: 18 }, { x: 14.8, y: 2.9 }],
    props: [{ t: 'coffin', x: 3.5 }, { t: 'coffin', x: 6.5 }, { t: 'coffin', x: 12.5 }, { t: 'bones', x: 10 }, { t: 'bones', x: 22.5 }, { t: 'bones', x: 40 }, { t: 'skullwall', x: 8 }, { t: 'skullwall', x: 17 }, { t: 'skullwall', x: 23 },
      { t: 'torch', x: 2 }, { t: 'torch', x: 12 }, { t: 'torch', x: 23.8 }, { t: 'torch', x: 27.2, y: 4.6 }, { t: 'candles', x: 25.5, y: 2.5 }, { t: 'chain', x: 20, y: 12.3 }, { t: 'web', x: 4, y: 8 },
      { t: 'stalactite', x: 30.5, y: 8 }, { t: 'sarcophagus', x: 16.5 }, { t: 'grave', x: 46 }],
    lore: [{ x: 25.5, y: 2.5, text: 'The charnel floods here to the roof. The way east lies under the water, not over it.' }] },

  // Miniboss arena: the Nameless Brood-Mother (flesh_spider). Webbed ledges overhead hold a mana vessel.
  { id: 'charnel_nest', name: 'The Charnel Nest', area: '18', col: 14, row: 6, w: 3, h: 2, theme: 'catacomb',
    doors: [{ side: 'W', row: 7 }, { side: 'E', row: 7 }],
    platforms: zig([[4, 2.7, 5], [31, 2.7, 5], [10.5, 5.4, 4], [25.5, 5.4, 4], [17, 8.6, 6]]),
    enemies: [{ t: 'flesh_spider', x: 20, boss: true, mini: true }],
    chests: [{ x: 33.5, y: 2.7, tier: 4, rarity: 'rare' }],
    items: [{ x: 20, y: 8.6, up: 'mana' }],
    breakables: [{ x: 6.5 }, { x: 33 }, { x: 12, y: 5.4 }],
    props: [{ t: 'web', x: 5, y: 8 }, { t: 'web', x: 14, y: 8 }, { t: 'web', x: 26, y: 8 }, { t: 'web', x: 35, y: 8 }, { t: 'web', x: 20, y: 8.6 }, { t: 'bones', x: 9 }, { t: 'bones', x: 18 }, { t: 'bones', x: 29 },
      { t: 'coffin', x: 12.5 }, { t: 'coffin', x: 27.5 }, { t: 'skullwall', x: 16 }, { t: 'skullwall', x: 24 }, { t: 'cage', x: 8, y: 8 }, { t: 'cage', x: 32, y: 8 },
      { t: 'torch', x: 2.5 }, { t: 'torch', x: 37.5 }, { t: 'torch', x: 11.5, y: 5.4 }, { t: 'torch', x: 28.5, y: 5.4 }, { t: 'chain', x: 20 }],
    lore: [{ x: 7, text: 'The husks in the web still wear burial linen. She was fed on the unnamed.' }] },

  // ================================================================== ROYAL CRYPTS

  // 5x2 mausoleum: goatmen charge the aisle, a plague knight and a gravebinder hold the balconies above.
  // West end: Bonecrown's tomb on the upper shelf behind a cracked wall; below it a false wall (Echo Sight) hides more.
  // The floor hole drops into the Drowned Reliquary.
  { id: 'royal_crypts', name: 'Royal Crypts', area: '26', col: 9, row: 6, w: 5, h: 2, theme: 'royalcrypt',
    doors: [{ side: 'E', row: 7 }, { side: 'S', col: 10 }],
    blocks: [{ x: 0, y: 4.8, w: 10.3, h: 1.2 }, { x: 0, y: 6, w: 10.3, h: 1.5 }, // tomb shelf (top 7.5) over the roof of the veiled alcove
      { x: 7, y: 11.5, w: 1, h: 3 },                         // wall over the cracked tomb door
      { x: 44, y: 6.7, w: 12, h: 0.8 }, { x: 27.5, y: 6.7, w: 12, h: 0.8 }, // balconies (top 7.5)
      { x: 30, y: 0.5, w: 3, h: 1.2 }, { x: 40, y: 0.5, w: 3, h: 1.2 }, { x: 50, y: 0.5, w: 3, h: 1.2 }], // royal sarcophagi
    cracks: [{ x: 7, y: 7.5, w: 1, h: 4, by: 'hit' }],
    gates: [{ x: 9.5, kind: 'veil' }],
    platforms: zig([[59, 3.9, 4], [22, 7.5, 3.5], [14.5, 7.5, 4]]),
    enemies: [{ t: 'goatman', x: 36 }, { t: 'goatman', x: 56 }, { t: 'zombie_necro', x: 46 }, { t: 'plague_knight', x: 50, y: 7.5 }, { t: 'necromancer', x: 33, y: 7.5 }, { t: 'harpy_undead', x: 24, y: 11 }],
    chests: [{ x: 3.5, y: 7.5, unique: 'bonecrown', big: true }, { x: 3, tier: 5, rarity: 'rare' }, { x: 6, gem: 'onyx' }],
    breakables: [{ x: 28 }, { x: 45 }, { x: 62 }, { x: 37.5, y: 7.5 }, { x: 46, y: 7.5 }],
    props: [{ t: 'sarcophagus', x: 31.5, y: 1.7 }, { t: 'sarcophagus', x: 41.5, y: 1.7 }, { t: 'sarcophagus', x: 51.5, y: 1.7 }, { t: 'sarcophagus', x: 4.5, y: 7.5 }, { t: 'statue', x: 26 }, { t: 'statue', x: 64.5 },
      { t: 'column', x: 24.5 }, { t: 'column', x: 35.5 }, { t: 'column', x: 58 }, { t: 'candles', x: 1.5, y: 7.5 }, { t: 'candles', x: 5.8, y: 7.5 },
      { t: 'torch', x: 13 }, { t: 'torch', x: 38 }, { t: 'torch', x: 63 }, { t: 'torch', x: 30, y: 7.5 }, { t: 'torch', x: 54, y: 7.5 }, { t: 'chandelier', x: 42, y: 7.5 }, { t: 'chandelier', x: 18.5, y: 7.5 },
      { t: 'rubble', x: 8.8, y: 7.5 }, { t: 'altar', x: 2, y: 7.5 }],
    lore: [{ x: 61, text: 'Kings sleep here in white marble. Each was buried crowned — save one, whose crown was walled away.' },
      { x: 12.5, text: 'The wall hums like a struck bell. It is not there.' }] },

  // Sunken vault under the crypts: flooded to 4 m. Without the Dive you can only float over the gold and climb out.
  { id: 'drowned_reliquary', name: 'The Drowned Reliquary', area: '26', col: 9, row: 8, w: 3, h: 1, theme: 'royalcrypt',
    doors: [{ side: 'N', col: 10 }],
    platforms: zig([[18.5, 5.6, 3]]),
    blocks: [{ x: 31, y: 0.5, w: 9, h: 4.5 },                // dry dais (top 5.0)
      { x: 8, y: 0.5, w: 3, h: 1.2 }, { x: 24, y: 0.5, w: 3, h: 1.2 }], // sunken sarcophagi
    water: [{ x: 0, y: 0.5, w: 31, h: 4 }],
    enemies: [{ t: 'zombie', x: 5.5, rise: true }, { t: 'zombie', x: 13, rise: true }, { t: 'zombie', x: 28.5, rise: true }, { t: 'plague_knight', x: 36, y: 5 }],
    chests: [{ x: 3, tier: 5, rarity: 'rare' }, { x: 15.5, gem: 'diamond' }, { x: 38.5, y: 5, tier: 4, rarity: 'magic' }],
    items: [{ x: 22, y: 0.5, up: 'life' }],
    breakables: [{ x: 33, y: 5 }, { x: 37.5, y: 5 }],
    props: [{ t: 'sarcophagus', x: 9.5, y: 1.7 }, { t: 'sarcophagus', x: 25.5, y: 1.7 }, { t: 'statue', x: 1.5 }, { t: 'statue', x: 17 }, { t: 'column', x: 6.5 }, { t: 'column', x: 29 },
      { t: 'candles', x: 32.5, y: 5 }, { t: 'candles', x: 39, y: 5 }, { t: 'torch', x: 34.5, y: 5 }, { t: 'altar', x: 36.5, y: 5 }, { t: 'bones', x: 12 }, { t: 'bones', x: 20.5 }, { t: 'chain', x: 20 }, { t: 'skullwall', x: 36, y: 5 }],
    lore: [{ x: 20, text: 'The reliquary drowned with its saints. They did not let go of their gold.' }] },

  // Secret: a choir chapel the cisterns drowned and the masons sealed. The organ still drips; the tide-staff waits on the altar.
  { id: 'drowned_choir', name: 'The Drowned Choir', area: '06', col: 22, row: 2, w: 3, h: 1, theme: 'cistern', secret: true,
    doors: [{ side: 'W', row: 2 }],
    platforms: zig([[13, 2.7, 4], [20, 4.6, 5], [28, 2.7, 4]]),
    items: [{ x: 35.5, pedestal: true, unique: 'tidecaller', altar: true }, { x: 22.5, y: 4.6, up: 'mana' }],
    enemies: [{ t: 'harpy', x: 16, y: 5 }, { t: 'spider_red', x: 24 }, { t: 'harpy', x: 30, y: 5.5 }],
    chests: [{ x: 6, tier: 4, rarity: 'rare' }],
    breakables: [{ x: 10 }, { x: 26 }],
    props: [{ t: 'organ', x: 4 }, { t: 'pews', x: 12, face: 1 }, { t: 'pews', x: 18, face: 1 }, { t: 'pews', x: 24, face: 1 }, { t: 'altar', x: 35.5, steps: 1 }, { t: 'candles', x: 33 }, { t: 'candles', x: 38 },
      { t: 'waterfall', x: 9, y: 7 }, { t: 'waterfall', x: 31, y: 7 }, { t: 'chandelier', x: 20, y: 6.4 }, { t: 'web', x: 39, y: 6 }],
    lore: [{ x: 8, text: 'The hymn-boards still list tonight\'s psalms. The water came up during the third.' }] },
];
