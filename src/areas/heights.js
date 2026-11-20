// THE HEIGHTS (acts 7-8): the storm-lashed crown of Castle Velscour.
//   Region A (cols 26-48): Gargoyle Ramparts (35) between the Astral Observatory (30, west) and the Tempest Belfry (31, east).
//     Arrivals climb out of the Bone Tower (floor hole, col 38) or the Pendulum Spire (floor hole, col 43) holding every
//     bell but the last. Belfry climb -> Vhalgor the storm dragon -> Tempest Bell (Shade Dash).
//   Region B (cols 49-58): behind the spirit door in the belfry narthex - the Starless Sanctum (38), a gauntlet that asks
//     for every bell in turn, the optional Starless Wyrm, and the Throne of the Hollow Sun (40).
// Rampart rooms are open to the sky (no N doors). Raised wall-walks are solid blocks; the room floor under a broken span
// is the spiked footing far below the parapet.
const zig = (list) => list.map(([x, y, w]) => ({ x, y, w }));

export default [
  // ================================================================ GARGOYLE RAMPARTS
  // The Breach - you surface through the Bone Tower's throat into the storm. Crossroads: shrine + mirror west (low),
  // Gargoyle Walk west (high ledge), Long Battlement east. Floor around the hole is kept clear.
  { id: 'hg_breach', name: 'The Breach', area: '35', col: 37, row: -18, w: 3, h: 2, theme: 'rampart',
    doors: [{ side: 'S', col: 38 }, { side: 'W', row: -17 }, { side: 'E', row: -17 }, { side: 'W', row: -18 }],
    blocks: [{ x: 9, y: 0.5, w: 4.5, h: 2.6 }],                       // west bastion: first step of the climb to the wall-walk
    platforms: zig([[4.5, 5.6, 3.5], [26, 3.6, 5.5], [35.5, 9.8, 3.2]]),
    echo: [{ x: 32.5, y: 6.8, w: 2.4 }],                               // answers the bell: the way up to the storm-pinnacle
    enemies: [{ t: 'dragonling', x: 11.2, y: 3.1 }, { t: 'necro_lord', x: 29, y: 3.6 }, { t: 'silver', x: 31, y: 0.5 },
      { t: 'harpy_undead', x: 15, y: 10 }, { t: 'werebat', x: 24, y: 11.5 }],
    items: [{ x: 37, y: 9.8, up: 'mana' }],
    breakables: [{ x: 6 }, { x: 16 }, { x: 24.5 }, { x: 34.5 }, { x: 6, y: 5.6 }],
    props: [{ t: 'lamp', x: 4 }, { t: 'lamp', x: 17 }, { t: 'lamp', x: 23.2 }, { t: 'lamp', x: 36 }, { t: 'gargoyle', x: 9.6, y: 3.1 }, { t: 'gargoyle', x: 13, y: 3.1 },
      { t: 'gargoyle', x: 1.5, y: 8 }, { t: 'torch', x: 2.4, y: 8 }, { t: 'banner', x: 28.7, y: 3.6 }, { t: 'gatearch', x: 38.6 }, { t: 'statue', x: 33.5 },
      { t: 'rubble', x: 17.6 }, { t: 'rubble', x: 22.4 }, { t: 'chain', x: 20, y: 0.5 }, { t: 'crate', x: 7.6 }, { t: 'barrel', x: 25.4 }, { t: 'brazier', x: 14.6 }],
    lore: [{ x: 20, text: 'The Bone Tower ends in open sky. The storm has circled this wall since the bells fell silent.' },
      { x: 30, text: 'East, lightning walks the belfry. West, a dome of blue glass still counts the stars.' }] },

  { id: 'hg_shrine', name: 'Stormwatch Shrine', area: '35', col: 36, row: -17, w: 1, h: 1, theme: 'shrine', save: { x: 6.67 },
    doors: [{ side: 'W', row: -17 }, { side: 'E', row: -17 }],
    props: [{ t: 'candles', x: 3.4 }, { t: 'candles', x: 9.9 }, { t: 'rosewindow', x: 6.67 }, { t: 'statue', x: 2 }, { t: 'statue', x: 11.3 }, { t: 'rug', x: 6.67 }] },

  // District warp. The chest behind the spirit gate is the teaser you walk past on every visit until Shade Dash.
  { id: 'hg_mirror', name: 'Mirror of the Gale', area: '35', col: 35, row: -17, w: 1, h: 1, theme: 'shrine', warp: { x: 9 },
    doors: [{ side: 'E', row: -17 }],
    blocks: [{ x: 3.4, y: 4.8, w: 1.6, h: 2.2 }],
    gates: [{ x: 4.2, kind: 'ghost' }],
    chests: [{ x: 2, tier: 8, rarity: 'rare' }],
    props: [{ t: 'candles', x: 6.2 }, { t: 'candles', x: 11.6 }, { t: 'mirror', x: 9 }, { t: 'window', x: 2 }, { t: 'tapestry', x: 6.6 }, { t: 'rug', x: 9 }],
    lore: [{ x: 6, text: 'A curtain of pale breath hangs in the arch. Steel passes through it like a hand through smoke.' }] },

  // Gargoyle Walk - three broken spans. Echo ledge over the first, a wind-shoved slab over the second, a clean leap
  // over the third; spikes wait on the footings below. Secret: the hierophant's dais is hollow (strike its east face).
  { id: 'hg_westwall', name: 'Gargoyle Walk', area: '35', col: 31, row: -18, w: 6, h: 1, theme: 'rampart',
    doors: [{ side: 'W', row: -18 }, { side: 'E', row: -18 }],
    stairs: [{ x: 4, steps: 4, dir: 1 }, { x: 78.5, steps: 3, dir: -1 }],
    blocks: [{ x: 8, y: 0.5, w: 12, h: 2.0 }, { x: 11, y: 2.5, w: 1, h: 0.6 },                    // span A + merlon
      { x: 29, y: 0.5, w: 12, h: 2.0 }, { x: 34, y: 2.5, w: 3.5, h: 2.4 },                          // span B + whelp turret
      { x: 51, y: 0.5, w: 10, h: 2.0 }, { x: 61, y: 2.3, w: 5, h: 1.0 },                            // span C (lancer run) + hollow dais
      { x: 71, y: 0.5, w: 4.5, h: 2.0 }, { x: 72.6, y: 2.5, w: 1, h: 0.6 }],                        // span D + merlon
    cracks: [{ x: 65, y: 0.5, w: 1, h: 1.8, by: 'hit' }],
    spikes: [{ x: 20.5, y: 0.5, w: 8 }, { x: 41.5, y: 0.5, w: 9 }],
    echo: [{ x: 23.2, y: 3.0, w: 2.6 }],
    movers: [{ x: 42, y: 2.5, w: 3, dx: 5, period: 5 }],
    enemies: [{ t: 'silver', x: 15, y: 2.5 }, { t: 'harpy_undead', x: 24.5, y: 6 }, { t: 'dragonling', x: 35.7, y: 4.9 }, { t: 'werebat', x: 46, y: 6.5 },
      { t: 'lancer', x: 56, y: 2.5 }, { t: 'necro_lord', x: 63.5, y: 3.3 }],
    items: [{ x: 63, y: 0.5, up: 'life' }],
    breakables: [{ x: 9.5, y: 2.5 }, { x: 31, y: 2.5 }, { x: 39.5, y: 2.5 }, { x: 53, y: 2.5 }, { x: 68.5 }],
    props: [{ t: 'brazier', x: 9, y: 2.5 }, { t: 'brazier', x: 30, y: 2.5 }, { t: 'brazier', x: 52, y: 2.5 }, { t: 'brazier', x: 74.5, y: 2.5 }, { t: 'lamp', x: 2.2 }, { t: 'lamp', x: 79 },
      { t: 'gargoyle', x: 19.4, y: 2.5 }, { t: 'gargoyle', x: 29.6, y: 2.5 }, { t: 'gargoyle', x: 40.4, y: 2.5 }, { t: 'gargoyle', x: 51.6, y: 2.5 }, { t: 'gargoyle', x: 35.7, y: 4.9 },
      { t: 'banner', x: 13.5, y: 2.5 }, { t: 'banner', x: 58.5, y: 2.5 }, { t: 'statue', x: 17, y: 2.5 }, { t: 'rubble', x: 67.2 }, { t: 'rubble', x: 21 }, { t: 'bones', x: 44 },
      { t: 'chain', x: 43.5, y: 2.5 }, { t: 'candles', x: 62, y: 3.3 }],
    lore: [{ x: 18, text: 'The span is gone, yet the gargoyles still stare at where it stood. Listen for what they see.' },
      { x: 69, text: 'Mortar dust drifts from the east face of the dais. It rings hollow.' }] },

  // The Long Battlement - a lancer's charge lane with a high road of hoardings above it. The Pendulum Spire's hole opens
  // midway. West: slide under the gatehouse or go over it (echo ledge). East: the Spirit Bastion - walk over its roof now,
  // come back with Shade Dash for what is locked inside.
  { id: 'hg_eastwall', name: 'The Long Battlement', area: '35', col: 40, row: -17, w: 6, h: 1, theme: 'rampart',
    doors: [{ side: 'W', row: -17 }, { side: 'E', row: -17 }, { side: 'S', col: 43 }],
    blocks: [{ x: 5.5, y: 0.5, w: 1, h: 0.6 }, { x: 11, y: 0.5, w: 6, h: 2.6 },                   // merlon, whelp bastion
      { x: 30.5, y: 1.7, w: 4, h: 5.0 },                                                            // gatehouse: 1.2 m crawl beneath
      { x: 64.5, y: 0.5, w: 1.5, h: 4.3 }, { x: 58, y: 4.8, w: 8, h: 0.6 }, { x: 58, y: 5.4, w: 8, h: 0.6 }, // Spirit Bastion: back wall, vault, parapet
      { x: 75, y: 0.5, w: 1, h: 0.6 }],
    gates: [{ x: 58.8, kind: 'ghost' }],
    platforms: zig([[20, 3.6, 6], [53, 3.3, 3.5], [67.5, 3.3, 3.5]]),
    echo: [{ x: 27.2, y: 5.4, w: 2.2 }],
    enemies: [{ t: 'dragonling', x: 14, y: 3.1 }, { t: 'lancer', x: 25, y: 0.5 }, { t: 'necro_lord', x: 23, y: 3.6 }, { t: 'silver', x: 39, y: 0.5 },
      { t: 'harpy_undead', x: 53, y: 6.4 }, { t: 'dragonling_undead', x: 62.5, y: 6.0 }, { t: 'lancer', x: 72.5, y: 0.5 }],
    chests: [{ x: 62, tier: 8, rarity: 'rare' }],
    items: [{ x: 32.5, y: 6.7, gem: 'diamond' }],
    breakables: [{ x: 8 }, { x: 19 }, { x: 36.5 }, { x: 50.5 }, { x: 77 }, { x: 21.5, y: 3.6 }],
    props: [{ t: 'lamp', x: 3 }, { t: 'lamp', x: 18.5 }, { t: 'lamp', x: 36 }, { t: 'lamp', x: 51 }, { t: 'lamp', x: 69 }, { t: 'lamp', x: 78 },
      { t: 'gargoyle', x: 11.5, y: 3.1 }, { t: 'gargoyle', x: 16.5, y: 3.1 }, { t: 'gargoyle', x: 31, y: 6.7 }, { t: 'gargoyle', x: 34, y: 6.7 }, { t: 'gargoyle', x: 58.6, y: 6.0 }, { t: 'gargoyle', x: 65.4, y: 6.0 },
      { t: 'portcullis', x: 32.5 }, { t: 'banner', x: 22.8, y: 3.6 }, { t: 'banner', x: 42 }, { t: 'rubble', x: 44 }, { t: 'rubble', x: 49.4 }, { t: 'chain', x: 46.67 },
      { t: 'brazier', x: 28 }, { t: 'brazier', x: 56.5 }, { t: 'statue', x: 73.8 }],
    lore: [{ x: 28, text: 'The gatehouse has sunk on its footings. A hand of clearance remains beneath - enough for one who crawls.' },
      { x: 56, text: 'The bastion has no door, only a veil of cold breath. Something gleams behind it.' }] },

  // ================================================================ ASTRAL OBSERVATORY
  // The Great Orrery - ride the two turning rings from the dais to the dome. Galleries left and right hold the telescopes;
  // a star hangs at the very top of the upper ring. Secret: the west alcove wall is a veil, its floor is cracked.
  { id: 'hg_orrery', name: 'The Great Orrery', area: '30', col: 27, row: -20, w: 4, h: 3, theme: 'observatory',
    doors: [{ side: 'E', row: -18 }, { side: 'S', col: 27 }],
    blocks: [{ x: 0.5, y: 4.8, w: 11.3, h: 0.9 },                     // low west balcony (roof of the veiled alcove)
      { x: 22.2, y: 0.5, w: 9, h: 1.0 }],                             // orrery dais
    gates: [{ x: 11, kind: 'veil' }],
    cracks: [{ x: 4.9, y: 0, w: 3.6, h: 0.5, by: 'dive' }],
    movers: [{ x: 25.17, y: 8.5, w: 3, orbit: 4, period: 8 }, { x: 25.17, y: 16.5, w: 3, orbit: 3.2, period: 6 }],
    platforms: zig([[13, 3.2, 3],                                     // step to the low balcony
      [38, 3.4, 4], [44, 6.4, 4.5], [42, 10.0, 10.5], [35, 9.2, 3.5], // east gallery and the hop from the lower ring
      [44, 13.6, 8.5], [34, 15.4, 3], [39.5, 14.6, 2.6],              // upper east gallery, off the upper ring
      [1, 14.5, 9], [16.5, 15.6, 3], [11.8, 15.0, 2.6]]),             // upper west gallery (or thornstep up the west wall)
    enemies: [{ t: 'night_demon', x: 38, y: 0.5 }, { t: 'night_demon', x: 5, y: 5.7 }, { t: 'witch', x: 47.5, y: 10.0 }, { t: 'witch', x: 6.5, y: 14.5 },
      { t: 'werebat', x: 19, y: 11 }, { t: 'werebat', x: 33.5, y: 18.8 }],
    chests: [{ x: 2.6, y: 14.5, tier: 8, rarity: 'rare' }],
    items: [{ x: 26.67, y: 19.7, up: 'mana' }, { x: 50.5, y: 13.6, gem: 'amethyst' }],
    breakables: [{ x: 16 }, { x: 34 }, { x: 45 }, { x: 9, y: 5.7 }, { x: 44, y: 10.0 }],
    props: [{ t: 'orrery', x: 26.7, y: 1.5 }, { t: 'telescope', x: 4.2, y: 14.5 }, { t: 'telescope', x: 48, y: 13.6 }, { t: 'bookshelf', x: 15 }, { t: 'bookshelf', x: 18.5 }, { t: 'bookshelf', x: 42 },
      { t: 'mirror', x: 12.6 }, { t: 'table', x: 47 }, { t: 'candles', x: 20.8 }, { t: 'candles', x: 32.6 }, { t: 'candles', x: 2.2, y: 5.7 }, { t: 'torch', x: 52, y: 10.0 }, { t: 'torch', x: 1.4, y: 14.5 },
      { t: 'torch', x: 52, y: 13.6 }, { t: 'torch', x: 51.5 }, { t: 'window', x: 26.7, y: 12, big: true }, { t: 'window', x: 9, y: 5.7, big: true }, { t: 'chandelier', x: 40, y: 3.4 },
      { t: 'crystal', x: 36 }, { t: 'statue', x: 50 }, { t: 'rug', x: 40 }],
    lore: [{ x: 26.7, text: 'The brass heavens still turn. Step on a world as it passes and it will carry you to the dome.' },
      { x: 14.5, text: 'The mirror by the west wall shows an archway where the wall is. Cold air breathes through the flagstones beyond.' }] },

  // Vault of Fixed Stars (secret) - a crawl through fire under the star-wall: Echo to find it, Dive to enter, Slide and
  // Ember together to cross. The statues only move when you are not looking.
  { id: 'hg_starvault', name: 'Vault of Fixed Stars', area: '30', col: 27, row: -17, w: 2, h: 1, theme: 'observatory', secret: true,
    doors: [{ side: 'N', col: 27 }],
    platforms: zig([[5.3, 2.9, 2.8], [5.3, 5.4, 2.8]]),
    blocks: [{ x: 13, y: 1.7, w: 4, h: 5.3 }],
    lava: [{ x: 13, y: 0.5, w: 4, h: 1.0 }],
    enemies: [{ t: 'mannequin', x: 10.6 }, { t: 'mannequin', x: 20 }],
    chests: [{ x: 23, unique: 'kingsgrief', big: true }],
    breakables: [{ x: 2.4 }, { x: 11.4 }, { x: 18.6 }],
    props: [{ t: 'orrery', x: 21 }, { t: 'statue', x: 2 }, { t: 'statue', x: 9 }, { t: 'statue', x: 18.2 }, { t: 'statue', x: 25 }, { t: 'candles', x: 3.6 }, { t: 'candles', x: 24.2 },
      { t: 'crystal', x: 12 }, { t: 'crystal', x: 17.8 }, { t: 'chain', x: 6.67 }, { t: 'altar', x: 23 }, { t: 'tapestry', x: 15 }],
    lore: [{ x: 10, text: 'Seven stars are painted on the wall, one for each bell. Beneath them the floor glows, and the stone hangs low.' }] },

  // ================================================================ TEMPEST BELFRY
  // Tempest Narthex - foot of the bell tower. Up the rope-well to the belfry; east, the spirit door to the Sanctum
  // (teaser now, the way on once the Tempest Bell is yours).
  { id: 'hg_narthex', name: 'Tempest Narthex', area: '31', col: 46, row: -17, w: 3, h: 1, theme: 'belfry',
    doors: [{ side: 'W', row: -17 }, { side: 'N', col: 47 }, { side: 'E', row: -17 }],
    blocks: [{ x: 25, y: 0.5, w: 5, h: 1.2 },                         // hierophant's dais
      { x: 35.6, y: 4.8, w: 3.9, h: 2.2 }],                           // lintel sealing the spirit door to the ceiling
    gates: [{ x: 36.4, kind: 'ghost' }],
    platforms: zig([[18.6, 3.0, 2.8], [18.6, 5.6, 2.8]]),
    enemies: [{ t: 'silver', x: 11 }, { t: 'werebat', x: 14.5, y: 5.8 }, { t: 'necro_lord', x: 27.5, y: 1.7 }, { t: 'pknight', x: 33 }],
    breakables: [{ x: 6.5 }, { x: 16 }, { x: 23.5 }, { x: 31.5 }],
    props: [{ t: 'bigbell', x: 8 }, { t: 'chain', x: 19.2 }, { t: 'chain', x: 20.8 }, { t: 'torch', x: 4 }, { t: 'torch', x: 16.5 }, { t: 'torch', x: 30.8 }, { t: 'brazier', x: 34.4 },
      { t: 'window', x: 12, big: true }, { t: 'window', x: 27.5, big: true }, { t: 'statue', x: 24 }, { t: 'banner', x: 22.6 }, { t: 'arch', x: 36.4 }, { t: 'rubble', x: 9.6 },
      { t: 'column', x: 14 }, { t: 'column', x: 31.6 }, { t: 'candles', x: 26, y: 1.7 }],
    lore: [{ x: 33.5, text: 'A door of pale breath, and darkness without stars beyond it. Only a shade could cross.' },
      { x: 20, text: 'The bell ropes are charred through. Far above, something beats its wings in time with the thunder.' }] },

  // Tempest Belfry - zigzag climb under two swinging blades, then a bare thornstep up the east wall to the ringing loft.
  // Secret: the bell-cage in the east wall is closed by a veil; Stormcall hangs inside.
  { id: 'hg_belfry', name: 'Tempest Belfry', area: '31', col: 47, row: -21, w: 2, h: 4, theme: 'belfry',
    doors: [{ side: 'S', col: 47 }, { side: 'W', row: -21 }],
    blocks: [{ x: 19.5, y: 8.6, w: 6.67, h: 0.8 }, { x: 19.5, y: 13.7, w: 6.67, h: 1.0 }], // bell-cage floor and roof
    gates: [{ x: 20.3, y: 9.4, kind: 'veil' }],
    platforms: zig([[11, 3.4, 4], [18, 6.2, 4.5], [9, 9.0, 6], [1, 12.2, 5], [9, 15.0, 8.5], [21, 17.6, 5],
      [20.5, 25.2, 5.5], [11, 24.6, 5], [5, 23.8, 3.5]]),
    blades: [{ x: 13.2, y: 20.4, len: 4.2, period: 3.4 }, { x: 13.5, y: 29.3, len: 3.6, period: 2.8, phase: 0.5 }],
    enemies: [{ t: 'silver', x: 12, y: 9.0 }, { t: 'werebat', x: 4, y: 16.5 }, { t: 'necro_lord', x: 23.5, y: 17.6 }, { t: 'harpy_undead', x: 15, y: 21.5 }, { t: 'werebat', x: 8, y: 27.5 }],
    chests: [{ x: 24, y: 9.4, unique: 'stormcall', big: true }],
    breakables: [{ x: 14 }, { x: 22.5 }, { x: 3, y: 12.2 }, { x: 22.5, y: 14.7 }, { x: 24.5, y: 25.2 }],
    props: [{ t: 'bigbell', x: 23.2, y: 9.4 }, { t: 'bigbell', x: 13.2, y: 15.0 }, { t: 'bigbell', x: 13.5, y: 24.6 }, { t: 'chain', x: 6.67 }, { t: 'chain', x: 3.5, y: 12.2 }, { t: 'chain', x: 24.8, y: 17.6 },
      { t: 'torch', x: 2 }, { t: 'torch', x: 25 }, { t: 'torch', x: 10, y: 9.0 }, { t: 'torch', x: 1.6, y: 12.2 }, { t: 'torch', x: 25, y: 17.6 }, { t: 'torch', x: 1.6, y: 23.0 }, { t: 'torch', x: 25, y: 25.2 },
      { t: 'window', x: 13.3, y: 3.4, big: true }, { t: 'window', x: 13.3, y: 15.0, big: true }, { t: 'gear', x: 6, y: 18 }, { t: 'web', x: 2, y: 27 }, { t: 'candles', x: 16.4, y: 9.0 }, { t: 'rubble', x: 19 }],
    lore: [{ x: 13, y: 9, text: 'A bronze note hums behind the east wall, as if a bell were caged in the stone.' },
      { x: 23, y: 17.6, text: 'No ledge above - only wet stone and thorn-scars where others kicked their way up.' }] },

  { id: 'hg_vigil', name: "Ringer's Vigil", area: '31', col: 46, row: -21, w: 1, h: 1, theme: 'shrine', save: { x: 6.67 },
    doors: [{ side: 'W', row: -21 }, { side: 'E', row: -21 }],
    props: [{ t: 'candles', x: 3.2 }, { t: 'candles', x: 10.1 }, { t: 'rosewindow', x: 6.67 }, { t: 'bigbell', x: 6.67 }, { t: 'bones', x: 2.2 }, { t: 'chain', x: 11.4 }],
    lore: [{ x: 9, text: 'The last ringer kept his vigil here. Thunder answers every breath you take.' }] },

  // The Tempest Crown - Vhalgor's roost: a flat storm-lit floor under a symmetric fan of six one-way perches, so there is
  // always a way up to a flying dragon. The Tempest Bell rises on the west dais.
  { id: 'hg_tempest', name: 'The Tempest Crown', area: '31', col: 41, row: -23, w: 5, h: 3, theme: 'belfry', boss: 'dragon_black',
    doors: [{ side: 'E', row: -21 }],
    blocks: [{ x: 3, y: 0.5, w: 6, h: 1.0 }],
    platforms: zig([[10.5, 3.4, 6], [18, 6.6, 6], [27, 9.8, 12.67], [42.67, 6.6, 6], [50.17, 3.4, 6], [30.3, 13.2, 6]]),
    enemies: [{ t: 'dragon_black', x: 30, y: 9, boss: true }],
    bell: { id: 'dash', x: 6, y: 1.5 },
    props: [{ t: 'bigbell', x: 33.3, y: 13.2 }, { t: 'bigbell', x: 14, y: 9 }, { t: 'bigbell', x: 52.6, y: 9 }, { t: 'window', x: 12, big: true }, { t: 'window', x: 26, big: true }, { t: 'window', x: 40.6, big: true },
      { t: 'window', x: 54.6, big: true }, { t: 'brazier', x: 10 }, { t: 'brazier', x: 24 }, { t: 'brazier', x: 42.6 }, { t: 'brazier', x: 57 }, { t: 'column', x: 18 }, { t: 'column', x: 48.6 },
      { t: 'chain', x: 21, y: 6.6 }, { t: 'chain', x: 45.6, y: 6.6 }, { t: 'gargoyle', x: 2, y: 1.5 }, { t: 'gargoyle', x: 64 }, { t: 'altar', x: 6, y: 1.5 }, { t: 'rubble', x: 36 }],
    lore: [{ x: 58, text: 'Every bell in the crown is cracked but one, and the storm itself is coiled around it.' }] },

  // ================================================================ STARLESS SANCTUM (behind the spirit door; all seven bells)
  // Starless Nave - the gauntlet, first half. Crawl (Slide) -> ledges to the upper walk (Vesper) -> the cracked flags
  // (Dive) -> the molten font (Ember) -> the spirit arch (Shade Dash) -> the east hall, where the Wyrm's door waits and
  // the well climbs on.
  { id: 'hs_nave', name: 'Starless Nave', area: '38', col: 49, row: -18, w: 5, h: 2, theme: 'sanctum',
    doors: [{ side: 'W', row: -17 }, { side: 'E', row: -17 }, { side: 'N', col: 52 }],
    blocks: [{ x: 7, y: 1.7, w: 5, h: 5.3 },                          // the crawl
      { x: 0.5, y: 7.0, w: 14.5, h: 1.0 }, { x: 20, y: 7.0, w: 8, h: 1.0 }, { x: 31.6, y: 7.0, w: 12.4, h: 1.0 }, // upper walk
      { x: 20, y: 0.5, w: 1.5, h: 6.5 },                              // wall under the walk: no way east below
      { x: 34, y: 8.0, w: 10, h: 6.5 },                               // the walk ends in solid stone past the cracked flags
      { x: 41.2, y: 4.8, w: 1.6, h: 2.2 }],                           // lintel over the spirit arch
    cracks: [{ x: 28, y: 7.0, w: 3.6, h: 1.0, by: 'dive' }],
    lava: [{ x: 33, y: 0.5, w: 7, h: 1.2 }],
    gates: [{ x: 42, kind: 'ghost' }],
    platforms: zig([[13, 3.2, 3], [16.5, 5.6, 3],                     // up to the walk
      [23, 3.4, 3], [28.4, 5.6, 2.8],                                 // the way back up through the broken flags
      [55, 3.4, 4], [49.5, 6.4, 4], [45.3, 9.4, 2.8], [45.3, 12.4, 2.8]]), // east hall, up the well
    enemies: [{ t: 'night_demon', x: 6.5, y: 8.0 }, { t: 'silver', x: 24.5, y: 8.0 }, { t: 'dragonling_undead', x: 25.5, y: 0.5 }, { t: 'pknight', x: 54.5, y: 0.5 },
      { t: 'necro_lord', x: 57, y: 3.4 }, { t: 'witch', x: 51.5, y: 6.4 }],
    items: [{ x: 2.6, y: 8.0, up: 'life' }],
    breakables: [{ x: 4 }, { x: 17.5 }, { x: 10, y: 8.0 }, { x: 31 }, { x: 50 }, { x: 60 }],
    props: [{ t: 'torch', x: 3 }, { t: 'torch', x: 16 }, { t: 'torch', x: 12, y: 8.0 }, { t: 'torch', x: 26, y: 8.0 }, { t: 'brazier', x: 23 }, { t: 'brazier', x: 47.5 }, { t: 'brazier', x: 63 },
      { t: 'statue', x: 5.6 }, { t: 'statue', x: 4, y: 8.0 }, { t: 'skullwall', x: 9.5, y: 8.0 }, { t: 'column', x: 52 }, { t: 'column', x: 59 }, { t: 'arch', x: 42 }, { t: 'arch', x: 65 },
      { t: 'chain', x: 29.8, y: 8.0 }, { t: 'rubble', x: 27 , y: 8.0 }, { t: 'crystal', x: 36.5 }, { t: 'sarcophagus', x: 61 }, { t: 'candles', x: 44.2 }, { t: 'banner', x: 56 }],
    lore: [{ x: 3.5, text: 'No star was ever let into this place. The king asked seven things of those who entered; the stones still ask.' },
      { x: 62, text: 'Rime creeps from under the eastern door. What sleeps there need not be woken - but it guards the last light.' }] },

  // Den of the Starless Wyrm (optional miniboss) - long flat hall, staggered perches, the reliquary on the far dais.
  { id: 'hs_wyrm', name: 'Den of the Starless Wyrm', area: '38', col: 54, row: -18, w: 5, h: 2, theme: 'sanctum',
    doors: [{ side: 'W', row: -17 }],
    blocks: [{ x: 57, y: 0.5, w: 9.17, h: 1.0 }],
    platforms: zig([[9, 3.6, 6], [17, 6.8, 6], [30, 3.8, 7], [40, 6.8, 6], [48, 3.6, 6]]),
    enemies: [{ t: 'dragon_undead', x: 38, boss: true, mini: true }],
    chests: [{ x: 62, y: 1.5, unique: 'lastlight', big: true }],
    breakables: [{ x: 7 }, { x: 55 }, { x: 59, y: 1.5 }],
    props: [{ t: 'bones', x: 12 }, { t: 'bones', x: 27 }, { t: 'bones', x: 45 }, { t: 'skullwall', x: 20 }, { t: 'skullwall', x: 50 }, { t: 'sarcophagus', x: 15 }, { t: 'sarcophagus', x: 33 },
      { t: 'crystal', x: 24 }, { t: 'crystal', x: 42 }, { t: 'crystal', x: 64.5, y: 1.5 }, { t: 'brazier', x: 5 }, { t: 'brazier', x: 22 }, { t: 'brazier', x: 37 }, { t: 'brazier', x: 53 },
      { t: 'column', x: 10 }, { t: 'column', x: 56 }, { t: 'chain', x: 30 }, { t: 'altar', x: 62, y: 1.5 }, { t: 'candles', x: 60, y: 1.5 }],
    lore: [{ x: 8, text: 'The cold here has a shape, and the shape has ribs. It was set to guard the one flame the king could not put out.' }] },

  // The Lightless Stair - gauntlet, second half. Thornstep up the bare east wall, cross on ledges only the Echo shows
  // (under a long blade), thornstep the west chimney, then the last spirit gate. Secret: the west ledge off the first echo
  // ledge ends in a wall that breaks - the Reliquary of the Seven Bells.
  { id: 'hs_ascent', name: 'The Lightless Stair', area: '38', col: 52, row: -22, w: 1, h: 4, theme: 'sanctum',
    doors: [{ side: 'S', col: 52 }, { side: 'W', row: -20 }, { side: 'E', row: -22 }],
    blocks: [{ x: 3.5, y: 19.0, w: 9.33, h: 1.0 },                    // the upper floor; the only way past is the west chimney
      { x: 6.2, y: 24.3, w: 1.6, h: 5.2 }],                           // lintel over the spirit gate
    cracks: [{ x: 1.2, y: 8.0, w: 1, h: 3.8, by: 'hit' }],
    gates: [{ x: 7, y: 20.0, kind: 'ghost' }],
    platforms: zig([[9, 7.6, 3.8]]),
    echo: [{ x: 4.6, y: 7.8, w: 2.4 }, { x: 4.5, y: 10.6, w: 2.6 }, { x: 0.8, y: 13.6, w: 2.6 }],
    blades: [{ x: 6.2, y: 19.0, len: 6, period: 3.6 }],
    enemies: [{ t: 'witch', x: 11, y: 7.6 }, { t: 'werebat', x: 10.5, y: 14 }, { t: 'harpy_undead', x: 4.6, y: 26 }],
    breakables: [{ x: 2.4 }, { x: 10.8 }, { x: 4.6, y: 20.0 }, { x: 9.2, y: 20.0 }],
    props: [{ t: 'torch', x: 1.5 }, { t: 'torch', x: 11.8 }, { t: 'torch', x: 12, y: 7.6 }, { t: 'torch', x: 4.4, y: 20.0 }, { t: 'torch', x: 11.6, y: 23.0 }, { t: 'rubble', x: 2.4, y: 8.0 },
      { t: 'chain', x: 6.67 }, { t: 'window', x: 9.6, y: 20.0, big: true }, { t: 'statue', x: 9, y: 20.0 }, { t: 'arch', x: 7, y: 20.0 }, { t: 'candles', x: 10, y: 7.6 }, { t: 'web', x: 2, y: 27 }, { t: 'skullwall', x: 9 }],
    lore: [{ x: 10, text: 'The stair was unmade on purpose. The wall remembers feet; the air, if you listen, remembers steps.' },
      { x: 2, y: 8, text: 'Loose rubble has spilled from the wall at the end of this ledge.' }] },

  // Reliquary of the Seven Bells (secret) - one lock per bell: found by Echo (ledge + veil), a fire-crawl (Slide + Ember),
  // a spirit gate (Dash), cracked flags (Dive), a pillar only a second jump clears (Vesper) and a wall only Thornstep
  // climbs. The Hollow Sun lies at the bottom.
  { id: 'hs_sunvault', name: 'Reliquary of the Seven Bells', area: '38', col: 50, row: -20, w: 2, h: 2, theme: 'sanctum', secret: true,
    doors: [{ side: 'E', row: -20 }],
    blocks: [{ x: 0.5, y: 7.0, w: 2.5, h: 1.0 }, { x: 6.6, y: 7.0, w: 17.07, h: 1.0 },   // upper floor either side of the cracked flags
      { x: 19.7, y: 12.3, w: 1.6, h: 2.2 }, { x: 8.4, y: 12.3, w: 1.6, h: 2.2 },          // lintels over the veil and the spirit gate
      { x: 12.5, y: 9.2, w: 4.5, h: 5.3 },                                                  // fire-crawl
      { x: 9, y: 0.5, w: 2.5, h: 3.4 }, { x: 19, y: 0.5, w: 1.5, h: 4.6 }],                // pillar (double jump), wall (thornstep)
    gates: [{ x: 20.5, y: 8.0, kind: 'veil' }, { x: 9.2, y: 8.0, kind: 'ghost' }],
    lava: [{ x: 12.5, y: 8.0, w: 4.5, h: 1.0 }],
    cracks: [{ x: 3, y: 7.0, w: 3.6, h: 1.0, by: 'dive' }],
    platforms: zig([[3.4, 3.2, 2.8], [3.4, 5.6, 2.8]]),
    enemies: [{ t: 'night_demon', x: 15 }, { t: 'mannequin', x: 22 }],
    chests: [{ x: 23.5, unique: 'hollowsun', big: true }],
    breakables: [{ x: 7 }, { x: 13 }, { x: 22.4, y: 8.0 }, { x: 7.4, y: 8.0 }],
    props: [{ t: 'candles', x: 24.6, y: 8.0 }, { t: 'candles', x: 18.2, y: 8.0 }, { t: 'candles', x: 1.6, y: 8.0 }, { t: 'candles', x: 21.6 }, { t: 'candles', x: 25 }, { t: 'altar', x: 23.5 },
      { t: 'bigbell', x: 2 }, { t: 'bigbell', x: 6.5 }, { t: 'bigbell', x: 13.4 }, { t: 'bigbell', x: 17 }, { t: 'statue', x: 7.6, y: 8.0 }, { t: 'statue', x: 11, y: 8.0 },
      { t: 'tapestry', x: 22.4, y: 8.0 }, { t: 'crystal', x: 16.6 }, { t: 'chain', x: 4.8, y: 8.0 }, { t: 'torch', x: 12.4 }],
    lore: [{ x: 24, y: 8, text: 'Seven bells are carved above the arch, each with its clapper torn out. The wall beyond the carving is only a memory of a wall.' },
      { x: 21.5, text: 'What the king hollowed out of the sun, he could not bear to throw away.' }] },

  { id: 'hs_eve', name: 'The Last Candle', area: '38', col: 53, row: -22, w: 1, h: 1, theme: 'shrine', save: { x: 6.67 },
    doors: [{ side: 'W', row: -22 }, { side: 'E', row: -22 }],
    props: [{ t: 'candles', x: 6.67 }, { t: 'rosewindow', x: 6.67 }, { t: 'statue', x: 2.4 }, { t: 'statue', x: 10.9 }, { t: 'rug', x: 6.67 }, { t: 'banner', x: 4.4 }, { t: 'banner', x: 8.9 }],
    lore: [{ x: 9.5, text: 'One candle, unburnt in a hundred years. Beyond the door a dead sun hangs over an empty chair.' }] },

  // ================================================================ THRONE OF THE HOLLOW SUN
  // The final arena: five screens of bloodstone floor, four one-way galleries in a rising-falling rhythm, the throne on
  // its dais at the far end under the tall windows.
  { id: 'hk_throne', name: 'Throne of the Hollow Sun', area: '40', col: 54, row: -24, w: 5, h: 3, theme: 'hollow', boss: 'hollow_king',
    doors: [{ side: 'W', row: -22 }],
    blocks: [{ x: 53, y: 0.5, w: 13.17, h: 1.2 }],
    platforms: zig([[9, 3.6, 7], [18.5, 6.8, 7], [30.5, 3.6, 7], [41, 6.8, 7]]),
    enemies: [{ t: 'hollow_king', x: 46, boss: true }],
    props: [{ t: 'throne', x: 60, y: 1.7 }, { t: 'window', x: 8, big: true }, { t: 'window', x: 20, big: true }, { t: 'window', x: 33.3, big: true }, { t: 'window', x: 46.6, big: true }, { t: 'window', x: 60, y: 1.7, big: true },
      { t: 'banner', x: 14 }, { t: 'banner', x: 26.6 }, { t: 'banner', x: 40 }, { t: 'banner', x: 55.5, y: 1.7 }, { t: 'banner', x: 64.5, y: 1.7 },
      { t: 'column', x: 5 }, { t: 'column', x: 17 }, { t: 'column', x: 29 }, { t: 'column', x: 38 }, { t: 'column', x: 50 },
      { t: 'brazier', x: 11 }, { t: 'brazier', x: 23.5 }, { t: 'brazier', x: 43.5 }, { t: 'brazier', x: 54.5, y: 1.7 }, { t: 'chandelier', x: 22, y: 6.8 }, { t: 'chandelier', x: 44.5, y: 6.8 },
      { t: 'statue', x: 57, y: 1.7 }, { t: 'statue', x: 63, y: 1.7 }, { t: 'rug', x: 33.3 }],
    lore: [{ x: 7, text: 'Here King Velscour hollowed out the sun so that no evening would ever fall on him. Evening has come anyway.' }] },
];
