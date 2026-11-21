// WEST GATE (acts 1): Pilgrim Causeway, Blackthorn Gatehouse, Chapel of Cinders, the Oathbreaker's hall,
// then through the burnt thorns: Moonlit Courtyard, Grand Vestibule (the castle's hub) and the Servants Quarter.
// Everything here is climbable with a single jump (ledges <= 2.3 m apart) until the first bell.
const zig = (list) => list.map(([x, y, w]) => ({ x, y, w }));

export default [
  { id: 'causeway', name: 'Pilgrim Causeway', area: '01', col: 8, row: 0, w: 3, h: 1, theme: 'outdoor',
    doors: [{ side: 'E', row: 0 }],
    start: { x: 5, y: 0.5 }, vistaAt: { x: 25, z: 19 }, // the barbican fills the frame on the approach
    items: [{ x: 9.5, y: 0.5, pedestal: true, base: 'pilgrim_blade', rarity: 'normal', sockets: 1, tutorial: true }],
    props: [{ t: 'statue', x: 22 }, { t: 'lamp', x: 15 }, { t: 'lamp', x: 30 }, { t: 'gatearch', x: 38.8 }, { t: 'tree', x: 4 }, { t: 'grave', x: 26 }],
    breakables: [{ x: 18 }, { x: 26 }, { x: 33 }],
    lore: [{ x: 14, text: 'The causeway ends where the castle begins. Nothing behind you remains.' }] },

  { id: 'gatehouse', name: 'Blackthorn Gatehouse', area: '02', col: 11, row: 0, w: 2, h: 1, theme: 'hall',
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }],
    enemies: [{ t: 'zombie', x: 17, rise: true, drop: 'potion' }],
    breakables: [{ x: 9 }],
    props: [{ t: 'torch', x: 4 }, { t: 'torch', x: 22 }, { t: 'banner', x: 13.3 }, { t: 'portcullis', x: 0.4 }, { t: 'portcullis', x: 26.3 }, { t: 'windlass', x: 6.6 }, { t: 'barrel', x: 7 }, { t: 'crate', x: 20.5 }],
    lore: [{ x: 3.5, text: '{jump} to leap — hold it to climb higher.  {dash} to slip back from a blow.' }] },

  { id: 'shaft', name: 'Blackthorn Shaft', area: '02', col: 13, row: -4, w: 1, h: 5, theme: 'shaft',
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }, { side: 'W', row: -4 }, { side: 'E', row: -4 }, { side: 'E', row: -1 }],
    cracks: [{ x: 12.33, y: 8.0, w: 1.0, h: 3.8, hp: 3, glow: 0xffc070 }], // a walled-up doorway: mortar weeps dust, the stone rings hollow
    platforms: zig([[1.5, 2.7, 4.5], [7.5, 4.9, 3], [3.5, 7.1, 2.6], [6.4, 9.3, 3.6], [3.2, 11.5, 3], [7.6, 13.7, 2.4], [10.2, 15.9, 2.6], [4.2, 18.1, 5.2], [0.8, 20.3, 2.6], [5, 22.5, 2.6], [8.6, 24.7, 4.2], [4, 26.9, 3], [7.5, 28.7, 3], [3.2, 28.7, 2.4]]),
    enemies: [{ t: 'knight', x: 10.5, y: 24.7 }, { t: 'zombie', x: 6.6, y: 18.1 }, { t: 'child', x: 10, y: 9.3 }],
    chests: [{ x: 1.6, y: 20.3, gem: 'topaz' }],
    breakables: [{ x: 6.8, y: 18.1 }, { x: 9.8, y: 9.3 }],
    props: [{ t: 'chain', x: 6.6 }, { t: 'torch', x: 1, y: 11.5 }, { t: 'torch', x: 12.3, y: 15.9 }, { t: 'torch', x: 1, y: 20.3 }, { t: 'torch', x: 12.3, y: 24.7 }, { t: 'web', x: 2, y: 30 }] },

  { id: 'lowerhall', name: 'Hall of Lost Pilgrims', area: '02', col: 14, row: 0, w: 6, h: 1, theme: 'hall',
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }, { side: 'S', col: 15 }],
    // a raised dais mid-hall with the shield chest, a broken gallery above it, rubble to hop
    blocks: [{ x: 22, y: 0.5, w: 3, h: 1.1 }, { x: 38.5, y: 0.5, w: 1.6, h: 0.8 }, { x: 40.1, y: 0.5, w: 8, h: 1.6 }, { x: 48.1, y: 0.5, w: 1.6, h: 0.8 }, { x: 57, y: 0.5, w: 2.4, h: 1.2 }, { x: 66.5, y: 0.5, w: 3, h: 0.9 }],
    platforms: zig([[26.5, 2.9, 4], [32.5, 4.7, 4.2], [51.5, 3.6, 4], [58.5, 4.9, 4.5]]),
    items: [{ x: 34.6, y: 4.7, up: 'mana' }, { x: 60.5, y: 4.9, potion: true }],
    enemies: [{ t: 'zombie', x: 30 }, { t: 'zombie', x: 36, rise: true }, { t: 'thrall', x: 53 }, { t: 'knight', x: 62 }, { t: 'child', x: 44, y: 2.1 }],
    chests: [{ x: 45.5, y: 2.1, base: 'kite_greenwood', rarity: 'normal', sockets: 1 }],
    breakables: [{ x: 12 }, { x: 28 }, { x: 54 }, { x: 68 }],
    gates: [{ x: 77.5, kind: 'thorn' }],
    props: [{ t: 'torch', x: 8 }, { t: 'torch', x: 26 }, { t: 'torch', x: 44 }, { t: 'torch', x: 62 }, { t: 'banner', x: 35 }, { t: 'banner', x: 53 }, { t: 'window', x: 14 }, { t: 'window', x: 50 }, { t: 'chandelier', x: 40 }, { t: 'statue', x: 70 }],
    lore: [{ x: 72, text: 'Blackthorn knots the archway. It recoils from flame.' }] },

  { id: 'votive', name: 'Votive Shrine', area: '02', col: 12, row: -4, w: 1, h: 1, theme: 'shrine', save: { x: 6.67 },
    doors: [{ side: 'W', row: -4 }, { side: 'E', row: -4 }],
    props: [{ t: 'candles', x: 3.5 }, { t: 'candles', x: 9.8 }, { t: 'rosewindow', x: 6.67 }] },

  { id: 'warp', name: 'Mirror of Passage', area: '02', col: 20, row: 0, w: 1, h: 1, theme: 'shrine', warp: { x: 5.2 },
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }],
    chests: [{ x: 10.2, unique: 'gravesong', big: true }],
    props: [{ t: 'candles', x: 2.2 }] },

  { id: 'gallery', name: 'Gallery of Saints', area: '02', col: 14, row: -4, w: 6, h: 1, theme: 'gallery',
    doors: [{ side: 'W', row: -4 }, { side: 'S', col: 18 }],
    // plinths and a stepped rostrum under the saints, a high walk along the windows, and a walled-up reliquary at the east end
    blocks: [{ x: 14, y: 0.5, w: 3.6, h: 1.1 }, { x: 26.6, y: 0.5, w: 1.6, h: 0.9 }, { x: 28.2, y: 0.5, w: 5.4, h: 1.8 }, { x: 33.6, y: 0.5, w: 1.6, h: 0.9 }, { x: 66, y: 0.5, w: 3, h: 1.0 }],
    platforms: zig([[39.5, 2.8, 4], [45, 4.6, 4.5], [51, 2.8, 3.6]]),
    cracks: [{ x: 73.2, y: 0.5, w: 1.1, h: 6.5, by: 'hit' }],
    items: [{ x: 47.2, y: 4.6, gem: 'skull' }],
    enemies: [{ t: 'knight', x: 22 }, { t: 'thrall', x: 37 }, { t: 'knight', x: 48 }, { t: 'wizard', x: 30.5, y: 2.3 }, { t: 'child', x: 68 }],
    breakables: [{ x: 10 }, { x: 24 }, { x: 64 }],
    chests: [{ x: 76.5, tier: 2, rarity: 'rare' }],
    props: [{ t: 'window', x: 8 }, { t: 'window', x: 20 }, { t: 'window', x: 32 }, { t: 'window', x: 44 }, { t: 'window', x: 72 }, { t: 'torch', x: 14 }, { t: 'torch', x: 38 }, { t: 'torch', x: 66 }, { t: 'rubble', x: 71.6 }, { t: 'painting', x: 26 }, { t: 'painting', x: 52 }, { t: 'chandelier', x: 40 }],
    lore: [{ x: 56, text: 'The floor has given way. Something paces in the hall below.' }] },

  { id: 'undercroft', name: 'Undercroft Well', area: '02', col: 15, row: 1, w: 1, h: 4, theme: 'crypt',
    doors: [{ side: 'N', col: 15 }, { side: 'S', col: 15 }, { side: 'E', row: 1 }],
    platforms: zig([[0.8, 2.7, 3.4], [6.0, 4.9, 3.0], [9.6, 7.1, 3.0], [4.4, 9.3, 3.0], [0.6, 11.5, 3.0], [5.0, 13.7, 2.8], [9.4, 15.9, 3.2], [4.6, 18.1, 3], [0.6, 20.3, 3.2], [5.2, 22.5, 2.6], [7.3, 24.7, 2.8], [5.3, 26.5, 2.8], [5.3, 28.3, 2.8]]),
    cracks: [{ x: 4.9, y: 0, w: 3.6, h: 0.5, by: 'dive' }, { x: 12.33, y: 23.0, w: 1.0, h: 3.8, hp: 3, glow: 0x9aff9a }],
    items: [{ x: 10.5, y: 0.5, pedestal: true, gem: 'sapphire' }, { x: 2.0, y: 20.3, base: 'iron_spear', rarity: 'magic', sockets: 2 }],
    enemies: [{ t: 'zombie', x: 2.5, rise: true }, { t: 'child', x: 10.6, y: 7.1 }],
    props: [{ t: 'candles', x: 12 }, { t: 'torch', x: 1, y: 7.1 }, { t: 'torch', x: 12.3, y: 15.9 }, { t: 'bones', x: 3 }, { t: 'web', x: 11, y: 22.5 }],
    lore: [{ x: 6.6, text: 'The flagstones here are cracked through. Cold air rises from far below.' }] },

  // Secret: walled up behind the Blackthorn Shaft. The Oathbreaker's men bricked in the chapel of the one knight who would
  // not swear; her needle-sword still lies on the altar. Entered by breaking the hollow wall high on the shaft's east side.
  { id: 'forsworn_reliquary', name: 'The Forsworn Reliquary', area: '02', col: 14, row: -3, w: 3, h: 3, theme: 'chapel', secret: true, vista: 15,
    doors: [{ side: 'W', row: -1 }],
    blocks: [{ x: 29, y: 0.5, w: 11, h: 0.7 }], // the sanctuary step
    platforms: zig([[23.5, 2.9, 3], [18.5, 5.1, 3], [23.5, 7.3, 3], [29, 9.5, 3], [33.5, 11.7, 6.5]]), // up to the singers' loft
    items: [{ x: 35, y: 1.2, unique: 'vespers_needle', altar: true, glow: 0xffd8a0 }],
    enemies: [{ t: 'knight', x: 21, boss: true, mini: true, hpMul: 1.5, name: 'Ser Aubrine, Who Kept Her Oath', tint: 0xe8eef8, flurry: true }],
    chests: [{ x: 37.5, y: 11.7, tier: 2, rarity: 'rare' }],
    breakables: [{ x: 8.5 }, { x: 26 }, { x: 35, y: 11.7 }],
    props: [{ t: 'window', x: 35, big: true }, { t: 'rosewindow', x: 18, y: 15 }, { t: 'altar', x: 35, y: 1.2, steps: 1 }, { t: 'pews', x: 7, face: 1 }, { t: 'pews', x: 12, face: 1 }, { t: 'pews', x: 17, face: 1 },
      { t: 'statue', x: 30 }, { t: 'statue', x: 39.4 }, { t: 'candles', x: 32.4, y: 1.2 }, { t: 'candles', x: 37.6, y: 1.2 }, { t: 'chandelier', x: 15, y: 11 }, { t: 'banner', x: 10, house: 'tess' }, { t: 'banner', x: 24, house: 'tess' },
      { t: 'rubble', x: 2.2 }, { t: 'web', x: 1.5, y: 6 }, { t: 'rug', x: 12 }, { t: 'candles', x: 36, y: 11.7 }],
    lore: [{ x: 5, text: 'Bricked up from the outside. On the inner face, scratched again and again: I KEPT MINE.' }] },

  // Secret: an ossuary sealed off the Undercroft Well. A reaper's crook-blade lies across the bone altar.
  { id: 'reapers_ossuary', name: 'Ossuary of the Pale Reaper', area: '02', col: 16, row: 1, w: 2, h: 1, theme: 'ossuary', secret: true,
    doors: [{ side: 'W', row: 1 }],
    platforms: zig([[8.5, 2.7, 4], [14, 4.4, 4.2]]),
    blocks: [{ x: 5.2, y: 0.5, w: 1.3, h: 2.0 }, { x: 15.8, y: 0.5, w: 1.3, h: 1.9 }], // piers of burial niches
    items: [{ x: 21.2, unique: 'pale_reaper', altar: true, glow: 0x9aff9a, rise: [8.5, 13, 18.5] }, { x: 16.1, y: 4.4, up: 'life' }],
    enemies: [{ t: 'zombie', x: 11, rise: true }, { t: 'zombie', x: 18, rise: true }, { t: 'knight', x: 20 }],
    breakables: [{ x: 5 }, { x: 13.5 }],
    props: [{ t: 'altar', x: 21.2, steps: 1, style: 'bone' }, { t: 'coffin', x: 3.2 }, { t: 'sarcophagus', x: 25.2 }, { t: 'bones', x: 9 }, { t: 'bones', x: 16 },
      { t: 'candles', x: 19.4 }, { t: 'candles', x: 22.9 }, { t: 'torch', x: 1, y: 2.5 }, { t: 'web', x: 25.5, y: 6 }],
    lore: [{ x: 3.6, text: 'The bones are stacked with care, every skull turned outward. Whoever set them wanted the reaper watched.' }] },

  { id: 'chapel', name: 'Chapel of Cinders', area: '07', col: 9, row: -5, w: 3, h: 3, theme: 'chapel', vista: 16,
    doors: [{ side: 'E', row: -4 }],
    platforms: zig([[30, 2.7, 4], [24, 4.9, 4], [31, 6.6, 4], [29.5, 10.1, 6], [22.5, 12.2, 5], [15, 14.3, 5.5], [6, 16.3, 7]]),
    items: [{ x: 7.5, y: 16.3, pedestal: true, gem: 'ruby', altar: true }],
    enemies: [{ t: 'zombie', x: 10 }, { t: 'zombie', x: 20, rise: true }, { t: 'knight', x: 24, y: 12.2 }, { t: 'child', x: 30 }, { t: 'wizard', x: 16, y: 14.3 }],
    breakables: [{ x: 5 }, { x: 35 }, { x: 17.5, y: 14.3 }],
    chests: [{ x: 3, tier: 1, rarity: 'magic' }],
    props: [{ t: 'rosewindow', x: 20, y: 9 }, { t: 'window', x: 13.3, big: true }, { t: 'pews', x: 12, face: 1 }, { t: 'pews', x: 18.5, face: 1 }, { t: 'pews', x: 25, face: 1 }, { t: 'candles', x: 6 }, { t: 'candles', x: 31.5 }, { t: 'torch', x: 1, y: 2.7 }, { t: 'torch', x: 39, y: 10.1 }, { t: 'altar', x: 35, steps: 2 }, { t: 'organ', x: 4 }, { t: 'chandelier', x: 22, y: 6.6 }, { t: 'rubble', x: 28 }],
    lore: [{ x: 34, text: 'The chapel burned once. High on the broken altar something still glows red.' }] },

  { id: 'greathall', name: 'Hall of the Oathbreaker', area: '02', col: 17, row: -3, w: 4, h: 3, theme: 'throne', vista: 15, boss: 'caddoc',
    doors: [{ side: 'N', col: 18 }, { side: 'E', row: -1 }],
    platforms: zig([[3, 1.8, 5], [9, 3.9, 4], [3, 6.0, 5], [9, 8.1, 4], [3.5, 10.2, 5], [10, 12.3, 4], [15, 14.4, 4], [11, 16.5, 4], [15.5, 18.6, 3.5], [16.5, 20.7, 2.4]]),
    blocks: [{ x: 48.3, y: 1.7, w: 4.6, h: 7.3 }],
    enemies: [{ t: 'caddoc', x: 34, boss: true }],
    bell: { id: 'slide', x: 41.5, y: 0.5 },
    props: [{ t: 'window', x: 14, big: true }, { t: 'window', x: 40, big: true }, { t: 'torch', x: 2, y: 1.8 }, { t: 'torch', x: 45 }, { t: 'banner', x: 26.7 }, { t: 'banner', x: 30 }, { t: 'throne', x: 44 }, { t: 'chandelier', x: 27 }, { t: 'column', x: 22 }, { t: 'column', x: 37 }],
    lore: [{ x: 47, text: 'A crawlway gapes beneath the dais — too low to walk.' }] },

  // ---------------------------------------------------------------- beyond the thorns
  { id: 'courtyard', name: 'Moonlit Courtyard', area: '03', col: 21, row: -2, w: 6, h: 3, theme: 'courtyard', vista: 16,
    doors: [{ side: 'W', row: 0 }, { side: 'W', row: -1 }, { side: 'E', row: 0 }],
    platforms: zig([[3.6, 5.9, 3], [7.4, 3.8, 3.2], [11.4, 2.0, 3], [30, 2.6, 4], [35, 4.7, 4], [41, 6.6, 5], [48, 4.6, 4], [53, 2.5, 4], [43, 8.8, 2.4]]),
    blocks: [{ x: 22, y: 0.5, w: 3, h: 1.2 }, { x: 60, y: 0.5, w: 4, h: 1.6 }, { x: 64, y: 0.5, w: 3, h: 0.8 }],
    enemies: [{ t: 'zombie', x: 16, rise: true }, { t: 'child', x: 27 }, { t: 'child', x: 33 }, { t: 'werewolf', x: 43, boss: true, mini: true }, { t: 'thrall', x: 58 }, { t: 'goblin', x: 70 }],
    items: [{ x: 44.2, y: 8.8, up: 'life' }],
    breakables: [{ x: 18 }, { x: 37 }, { x: 56 }, { x: 74 }],
    props: [{ t: 'fountain', x: 40 }, { t: 'tree', x: 9 }, { t: 'tree', x: 26 }, { t: 'tree', x: 52 }, { t: 'tree', x: 68 }, { t: 'lamp', x: 14 }, { t: 'lamp', x: 32 }, { t: 'lamp', x: 48 }, { t: 'lamp', x: 66 }, { t: 'grave', x: 19 }, { t: 'grave', x: 21 }, { t: 'grave', x: 57 }, { t: 'statue', x: 76 }, { t: 'thornbush', x: 5 }, { t: 'thornbush', x: 62 }, { t: 'gargoyle', x: 23.5, y: 1.7 }, { t: 'ivy', x: 79 }],
    lore: [{ x: 36, text: 'Claw marks score the fountain rim. The moon is very bright here.' }] },

  { id: 'vestibule', name: 'Grand Vestibule', area: '10', col: 27, row: -6, w: 4, h: 7, theme: 'vestibule', vista: 16,
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }, { side: 'S', col: 29 }, { side: 'N', col: 28 }],
    stairs: [{ x: 6, steps: 6, dir: 1 }, { x: 47.3, steps: 6, dir: -1 }],
    blocks: [{ x: 12, y: 0.5, w: 4, h: 3 }, { x: 37.3, y: 0.5, w: 4, h: 3 }],
    platforms: zig([
      // balconies off each landing, single-jump climbable to the second gallery
      [16.5, 5.6, 3], [20.5, 7.7, 5], [28, 7.7, 5], [34, 5.6, 3], [8, 5.7, 3.4], [3, 7.9, 4], [8.5, 10.1, 3.4], [14, 12.2, 4], [20, 14.3, 6], [29, 14.3, 6], [37, 12.2, 4], [42, 10.1, 3.4], [46.5, 7.9, 4], [42, 5.7, 3.4],
      // above: only a second jump carries you up the well
      [12, 18.1, 4], [22, 21.8, 5], [33, 25.4, 4], [42, 29.0, 4], [32, 32.7, 4], [22, 36.4, 5], [11, 40.0, 4], [3, 43.6, 4], [10.5, 47.2, 4], [16.5, 49.6, 3]]),
    enemies: [{ t: 'knight', x: 26 }, { t: 'wizard', x: 23, y: 7.7 }, { t: 'thrall', x: 44 }, { t: 'knight', x: 31, y: 14.3 }, { t: 'harpy', x: 26, y: 30 }, { t: 'harpy', x: 14, y: 42 }],
    chests: [{ x: 22.5, y: 14.3, tier: 2, rarity: 'rare' }, { x: 4.5, y: 43.6, tier: 3, rarity: 'rare' }],
    items: [{ x: 44, y: 29.0, up: 'mana' }],
    breakables: [{ x: 3 }, { x: 20 }, { x: 29 }, { x: 50 }, { x: 30.5, y: 7.7 }],
    props: [{ t: 'chandelier', x: 26.6, y: 0.5 }, { t: 'chandelier', x: 14, y: 26 }, { t: 'chandelier', x: 39, y: 34 }, { t: 'rosewindow', x: 26.6, y: 20 }, { t: 'window', x: 8, big: true }, { t: 'window', x: 45, big: true }, { t: 'banner', x: 19 }, { t: 'banner', x: 34.5 }, { t: 'statue', x: 14 }, { t: 'statue', x: 39.3 }, { t: 'rug', x: 26.6 },
      { t: 'torch', x: 2 }, { t: 'torch', x: 51 }, { t: 'torch', x: 1, y: 7.9 }, { t: 'torch', x: 52, y: 7.9 }, { t: 'torch', x: 1, y: 18.1 }, { t: 'torch', x: 52, y: 29 }, { t: 'torch', x: 1, y: 43.6 }, { t: 'column', x: 18 }, { t: 'column', x: 35.3 }, { t: 'tapestry', x: 24, y: 7.7 }, { t: 'painting', x: 30, y: 14.3 }],
    lore: [{ x: 26, text: 'Every wing of Castle Velscour opens on this well. Bells hang silent in the dark above.' }] },

  { id: 'servants_hall', name: 'Servants Quarter', area: '05', col: 31, row: 0, w: 4, h: 1, theme: 'servants', save: { x: 5.5 }, shop: { x: 11.5 },
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }, { side: 'S', col: 33 }],
    blocks: [{ x: 16, y: 0.5, w: 2.4, h: 1.1 }, { x: 44, y: 0.5, w: 2, h: 1.1 }],
    platforms: zig([[19.5, 2.9, 4], [38, 2.9, 4]]),
    enemies: [{ t: 'goblin', x: 22 }, { t: 'kobold', x: 30 }, { t: 'goblin', x: 40, y: 2.9 }, { t: 'thrall', x: 47 }],
    breakables: [{ x: 12 }, { x: 26 }, { x: 49 }],
    chests: [{ x: 21, y: 2.9, tier: 1, rarity: 'magic' }],
    props: [{ t: 'torch', x: 10 }, { t: 'torch', x: 28 }, { t: 'torch', x: 46 }, { t: 'table', x: 24 }, { t: 'barrel', x: 14 }, { t: 'barrel', x: 15 }, { t: 'crate', x: 42 }, { t: 'crate', x: 50.5 }, { t: 'tapestry', x: 20 }, { t: 'hook', x: 33 }, { t: 'rug', x: 26 }] },

  { id: 'cellar', name: 'Larder Cellars', area: '05', col: 31, row: 1, w: 4, h: 1, theme: 'servants',
    doors: [{ side: 'N', col: 33 }, { side: 'E', row: 1 }],
    blocks: [{ x: 30, y: 0.5, w: 3, h: 1.5 }, { x: 33, y: 0.5, w: 3, h: 3.0 }, { x: 36, y: 0.5, w: 3, h: 4.6 }, { x: 8, y: 0.5, w: 3, h: 1.4 }, { x: 5, y: 0.5, w: 3, h: 2.8 }, { x: 0.5, y: 0.5, w: 4.5, h: 4.2 }],
    platforms: zig([[31.9, 5.7, 2.8]]),
    enemies: [{ t: 'kobold', x: 14 }, { t: 'goblin', x: 20 }, { t: 'child', x: 27 }, { t: 'kobold', x: 46 }, { t: 'goblin', x: 50 }],
    chests: [{ x: 2.5, y: 4.7, tier: 2, rarity: 'magic' }],
    items: [{ x: 37.5, y: 5.1, gem: 'emerald' }],
    breakables: [{ x: 17 }, { x: 43 }],
    props: [{ t: 'barrel', x: 12 }, { t: 'barrel', x: 13 }, { t: 'barrel', x: 23 }, { t: 'crate', x: 25 }, { t: 'crate', x: 44 }, { t: 'hook', x: 16 }, { t: 'hook', x: 21 }, { t: 'hook', x: 48 }, { t: 'torch', x: 15 }, { t: 'torch', x: 41 }, { t: 'web', x: 2 }, { t: 'web', x: 51 }],
    lore: [{ x: 20, text: 'Meat hooks sway though no draught stirs. Something large is fed here.' }] },

  { id: 'kitchen', name: 'The Great Kitchen', area: '05', col: 35, row: 0, w: 2, h: 2, theme: 'servants',
    doors: [{ side: 'W', row: 0 }, { side: 'W', row: 1 }, { side: 'E', row: 0 }],
    // upper gallery over the kitchen pit; the way east is a scullery crawl under the chimney breast
    blocks: [{ x: 3, y: 5.3, w: 4.5, h: 2.7 }, { x: 19, y: 5.4, w: 7.2, h: 2.6 }, { x: 20.5, y: 9.2, w: 5.7, h: 5.3 }],
    platforms: zig([[8.5, 2.6, 3.4], [13, 4.7, 3.4], [8.5, 6.6, 3], [14.5, 7.9, 4]]),
    enemies: [{ t: 'ogre', x: 14, boss: true, mini: true }, { t: 'kobold', x: 5, y: 8.0 }],
    chests: [{ x: 22.5, tier: 2, rarity: 'rare' }],
    breakables: [{ x: 5 }, { x: 24 }],
    props: [{ t: 'furnace', x: 22 }, { t: 'table', x: 10 }, { t: 'hook', x: 8 }, { t: 'hook', x: 12 }, { t: 'hook', x: 16 }, { t: 'barrel', x: 3 }, { t: 'torch', x: 1.5, y: 8.0 }, { t: 'torch', x: 16, y: 7.9 }, { t: 'chain', x: 11 }],
    lore: [{ x: 18.5, y: 8, text: 'A scullery crawl runs east under the chimney — too low to walk.' }] },
];
