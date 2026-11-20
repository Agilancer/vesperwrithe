// BONE TOWER + UPPER WEST WING.
// Act 2 (slide only, every ledge <= 2.2 m apart): Ossuary Stair -> Prison of Bells -> Sirelle's roost -> Vesper Bell (djump).
// Act 3 (djump): the belfry above the roost, and west through the Athenaeum, Portrait Gallery and Scribes Labyrinth.
// Act 6 (ember): the burnt, sealed wing of the Athenaeum -> Malgrave the Archivist -> Bell of Echoes (echo).
// Act 7 (echo): the last ledges of the Carillon Crown answer the bell and open the way to the ramparts.
const zig = (list) => list.map(([x, y, w]) => ({ x, y, w }));
// props of one type at many spots: pr('torch', 4, [12, 8.0]) -> [{t,x:4}, {t,x:12,y:8}]
const pr = (t, ...at) => at.map(a => (Array.isArray(a) ? { t, x: a[0], y: a[1] } : { t, x: a }));

export default [
  // ================================================================== OSSUARY STAIR (area 11, act 2)
  // Idea: a hall-wide A-frame stair of bone. Slide under the lintel, climb either flight, leave by the hole over the peak.
  // The peak landing is a dive-cracked slab over a sealed reliquary (act 4 teaser).
  { id: 'ossuary_foot', name: 'Foot of the Ossuary Stair', area: '11', col: 37, row: -1, w: 4, h: 2, theme: 'ossuary',
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }, { side: 'N', col: 38 }],
    stairs: [{ x: 9, steps: 13, dir: 1 }, { x: 44.3, steps: 13, dir: -1 }],
    blocks: [{ x: 3.6, y: 1.7, w: 3, h: 2.8 },                                   // bone lintel: slide under
      { x: 22, y: 0.5, w: 2.6, h: 6.5 }, { x: 28.7, y: 0.5, w: 2.6, h: 6.5 }],   // piers carrying the landing
    cracks: [{ x: 24.6, y: 5.5, w: 4.1, h: 1.5, by: 'dive' }],
    platforms: zig([[23, 9.1, 3.2], [19.5, 11.2, 3], [18.5, 13.3, 3],            // up to the ceiling hole
      [27.5, 9.1, 3.2], [31.5, 11.2, 3.6],                                       // spider's perch with a chest
      [25.2, 4.2, 2.9]]),                                                        // inside the reliquary: the way back out
    enemies: [{ t: 'kobold', x: 23.2, y: 7.0 }, { t: 'vknight', x: 30, y: 7.0 }, { t: 'harpy', x: 14, y: 9.5 }, { t: 'harpy', x: 38, y: 10 },
      { t: 'kobold', x: 47.8 }, { t: 'spider', x: 32.4, y: 11.2 }],
    chests: [{ x: 34.2, y: 11.2, tier: 2, rarity: 'magic' }, { x: 25.7, tier: 4, rarity: 'rare' }],
    items: [{ x: 27.6, y: 0.5, up: 'life' }],
    breakables: [{ x: 8 }, { x: 46.5 }, { x: 29.6, y: 7.0 }, { x: 20.6, y: 11.2 }],
    props: [...pr('torch', 2, 16, 37, 51, [26.6, 7.0]), ...pr('skullwall', 12, 26.6, 41), ...pr('bones', 7.6, 45.4, 50), ...pr('candles', [22.8, 7.0], [30.6, 7.0]),
      ...pr('sarcophagus', 47.2), ...pr('coffin', 50.6), ...pr('chandelier', [26.6, 7.0]), ...pr('arch', 26.6), ...pr('column', 21.4, 31.9), ...pr('web', [34.5, 11.2]), ...pr('statue', 1.8)],
    lore: [{ x: 5, text: 'The lintel is a single thighbone, hung too low for the living to walk beneath.' },
      { x: 26.6, text: 'The landing rings hollow underfoot. Something was walled in beneath the stair.' }] },

  // The district warp, one door off the bottom of the great stair.
  { id: 'bone_mirror', name: 'Mirror of the Ossuary', area: '11', col: 37, row: -2, w: 1, h: 1, theme: 'shrine', warp: { x: 5.2 },
    doors: [{ side: 'E', row: -2 }],
    breakables: [{ x: 9 }],
    props: [...pr('candles', 2.2, 8), ...pr('skullwall', 6.6), ...pr('bones', 10.8)],
    lore: [{ x: 5.2, text: 'The glass shows the tower as it was: every niche still empty.' }] },

  // Idea: the long stair itself. Three diagonal flights switch back up five screens, harpies ride the diagonals,
  // bone-throwers hold the landings. Exits at four heights. The ledge over the west door is bare wall: Thornstep (act 5).
  { id: 'ossuary_stair', name: 'The Ossuary Stair', area: '11', col: 38, row: -6, w: 2, h: 5, theme: 'ossuary',
    doors: [{ side: 'S', col: 38 }, { side: 'W', row: -2 }, { side: 'E', row: -4 }, { side: 'N', col: 39 }],
    stairs: [{ x: 10, steps: 13, dir: 1 },                    // flight 1: floor -> east landing (7.0)
      { x: 17, steps: 13, dir: -1, y: 15.5 },                 // flight 2: second floor -> west landing (22.0)
      { x: 6, steps: 15, dir: 1, y: 26.2 }],                  // flight 3: third floor -> under the roof (33.7)
    blocks: [{ x: 23, y: 0.5, w: 3.667, h: 6.5 },             // east landing
      { x: 0, y: 14.5, w: 20, h: 1 },                         // second floor (level with the east door)
      { x: 0, y: 15.5, w: 4, h: 6.5 },                        // west landing
      { x: 5, y: 25.2, w: 19, h: 1 }],                        // third floor
    platforms: zig([[19, 9.1, 3.2], [22.6, 11.2, 3.2], [20.4, 13.3, 3],   // east landing -> second floor
      [1, 24.1, 3.6],                                                     // west landing -> third floor
      [21.5, 31, 2.5],                                                    // drop into the pocket behind flight 3
      [18.5, 35.8, 3],                                                    // under the roof hole
      [0.6, 10.4, 3.2]]),                                                 // Thornstep ledge over the mirror door
    enemies: [{ t: 'kobold', x: 24.8, y: 7.0 }, { t: 'spider', x: 20.6, y: 9.1 }, { t: 'harpy', x: 12, y: 11 }, { t: 'vknight', x: 18.6, y: 15.5 },
      { t: 'harpy', x: 11, y: 22.6 }, { t: 'kobold_armored', x: 22.2, y: 26.2 }],
    chests: [{ x: 23.2, y: 26.2, tier: 2, rarity: 'magic' }, { x: 2, y: 10.4, tier: 5, rarity: 'rare' }],
    breakables: [{ x: 3 }, { x: 25.6, y: 7.0 }, { x: 19.4, y: 15.5 }, { x: 2, y: 22.0 }, { x: 5.4, y: 26.2 }],
    props: [...pr('torch', 1.5, [24.6, 7.0], [19, 15.5], [1.6, 22.0], [12, 26.2], [23.4, 26.2]), ...pr('skullwall', 4, [10, 15.5], [15, 26.2]), ...pr('bones', 9, [25, 7.0], [3, 22.0]),
      ...pr('window', [13, 15.5]), ...pr('chain', 6.6, [22, 15.5]), ...pr('web', [2, 10.4], [24, 26.2]), ...pr('coffin', 2.4), ...pr('candles', [17.6, 15.5]), ...pr('chandelier', [12, 26.2])],
    lore: [{ x: 9.5, text: 'Every tread is a rib. The stair was not built; it was laid to rest.' },
      { x: 2.4, text: 'A coffer sits on a ledge above the door. The wall beneath it is bare, and scored by thorns.' }] },

  // Idea: a spider larder. Single-jump ledges carry you half way; the unique sits past 7 m of bare wall (Thornstep).
  { id: 'widow_den', name: "The Widow's Larder", area: '11', col: 40, row: -6, w: 1, h: 3, theme: 'crypt',
    doors: [{ side: 'W', row: -4 }],
    platforms: zig([[7.5, 2.6, 3.5], [2.5, 4.7, 3.2], [8, 6.8, 4], [3, 8.9, 4], [0.6, 16.4, 4.5], [8.5, 17.6, 3]]),
    enemies: [{ t: 'kobold', x: 10.5 }, { t: 'spider', x: 9.6, y: 2.6 }, { t: 'spider', x: 10.4, y: 6.8 }, { t: 'spider', x: 4, y: 8.9 }, { t: 'spider_red', x: 3.8, y: 16.4 }],
    chests: [{ x: 5.8, y: 8.9, tier: 2, rarity: 'magic' }, { x: 2, y: 16.4, unique: 'widowmaker', big: true }],
    items: [{ x: 10, y: 17.6, gem: 'onyx' }],
    breakables: [{ x: 6 }, { x: 12 }, { x: 8.6, y: 6.8 }],
    props: [...pr('web', 2, [11, 2.6], [3, 4.7], [11.5, 6.8], [6, 16.4], [11, 17.6]), ...pr('bones', 4, 9, [4.4, 8.9]), ...pr('coffin', 11.4), ...pr('torch', 7, [1.2, 8.9]), ...pr('candles', [3.4, 16.4]), ...pr('hook', 5, 8)],
    lore: [{ x: 5, text: 'Husks in armour hang wrapped in the dark above. The highest one still holds its blade.' }] },

  // ================================================================== PRISON OF BELLS (area 15, act 2)
  // Idea: two tiers of rusted cells around a stairwell; hop the hanging cages to cross the upper tier.
  // East cell is shut by a spirit gate (Shade Dash); a crawl on the east gallery hides a life vessel.
  { id: 'prison_of_bells', name: 'Prison of Bells', area: '15', col: 37, row: -8, w: 4, h: 2, theme: 'prison',
    doors: [{ side: 'S', col: 39 }, { side: 'N', col: 37 }],
    blocks: [{ x: 0, y: 6.8, w: 10, h: 1.2 }, { x: 13, y: 6.8, w: 15, h: 1.2 }, { x: 38, y: 6.8, w: 15.333, h: 1.2 },   // upper tier
      { x: 44, y: 4.8, w: 1.6, h: 2.0 },                                         // lintel over the spirit gate
      { x: 46.5, y: 9.2, w: 2.6, h: 5.3 },                                       // slide crawl on the east gallery
      { x: 20, y: 4.3, w: 0.8, h: 2.5 }, { x: 8.6, y: 4.3, w: 0.8, h: 2.5 },     // cell lintels
      { x: 15, y: 0.5, w: 1.2, h: 1.1 }],                                        // broken cell sill
    gates: [{ x: 44.8, kind: 'ghost' }],
    platforms: zig([[36, 2.3, 2.2], [33.5, 4.1, 3], [29, 6.0, 3],                // stairwell
      [30.6, 8.6, 2.4], [34.6, 8.6, 2.4],                                        // hanging cages
      [9.6, 9.9, 2.8], [7, 11.7, 2.8], [5.17, 13.4, 3]]),                        // up to the bell-ringers' door
    enemies: [{ t: 'thrall', x: 24.5 }, { t: 'thrall', x: 18 }, { t: 'thrall', x: 5 }, { t: 'vknight', x: 21, y: 8.0 }, { t: 'kobold_armored', x: 42.5, y: 8.0 },
      { t: 'harpy', x: 33, y: 12 }, { t: 'spider', x: 40.5 }],
    chests: [{ x: 2.4, tier: 2, rarity: 'magic' }, { x: 49.6, unique: 'lionheart_aegis', big: true }],
    items: [{ x: 51, y: 8.0, up: 'life' }],
    breakables: [{ x: 11.5 }, { x: 27 }, { x: 16.5, y: 8.0 }, { x: 40, y: 8.0 }, { x: 2.5, y: 8.0 }],
    props: [...pr('bigbell', [33.3, 8.6], [20, 8.0], [43, 8.0]), ...pr('cage', [31.8, 8.6], [35.8, 8.6], 12, 26), ...pr('chain', 11.5, 37, [25, 8.0], [5, 8.0]),
      ...pr('torch', 2, 22, 42, [14.5, 8.0], [39.5, 8.0], [1.5, 8.0]), ...pr('brazier', 30, [26.5, 8.0]), ...pr('bones', 6.5, 19, 47.5), ...pr('portcullis', 44.8), ...pr('hook', 23, 3.5), ...pr('rubble', 15.6)],
    lore: [{ x: 33, text: 'They hung the bells here when the king forbade their ringing, and the ringers beside them.' },
      { x: 41.5, text: 'A pale gate bars the last cell. It is not iron, and it is not quite there.' }] },

  { id: 'bellringers_rest', name: "Bell-Ringers' Rest", area: '15', col: 37, row: -9, w: 1, h: 1, theme: 'shrine', save: { x: 2.8 },
    doors: [{ side: 'S', col: 37 }, { side: 'E', row: -9 }],
    breakables: [{ x: 10.4 }],
    props: [...pr('candles', 1.2, 11.6), ...pr('rosewindow', 6.67), ...pr('chain', 9.4)],
    lore: [{ x: 10.6, text: 'Black feathers drift under the east door. Beyond it, wings.' }] },

  // Idea: a three-storey roost. Sirelle flies; you fight from eight staggered perches. The west gallery door and the
  // coffer under the rafters are both a second jump away - the bell she drops opens them.
  { id: 'queens_roost', name: 'The Belfry Roost', area: '15', col: 38, row: -11, w: 3, h: 3, theme: 'belfry', boss: 'harpy_queen',
    doors: [{ side: 'W', row: -9 }, { side: 'W', row: -10 }],
    blocks: [{ x: 33, y: 0.5, w: 5, h: 1.0 }],                                   // bell dais
    platforms: zig([[12, 2.6, 4], [24, 2.6, 4], [17.5, 4.7, 5], [11, 6.8, 4], [25, 6.8, 4], [17.5, 8.9, 5], [12, 11.0, 3.5], [24.5, 11.0, 3.5],
      [4.5, 4.4, 2.6],                                                           // second-jump step to the west gallery door
      [18, 14.6, 4]]),                                                           // rafters
    enemies: [{ t: 'harpy_queen', x: 26, y: 10, boss: true }],
    bell: { id: 'djump', x: 35.5, y: 1.5 },
    chests: [{ x: 20, y: 14.6, tier: 3, rarity: 'rare' }],
    breakables: [{ x: 8.5 }, { x: 30.5 }],
    props: [...pr('bigbell', [20, 14.6], [9, 11.0], [31, 11.0]), ...pr('window', [10, 8.9], [30, 8.9]), ...pr('chain', 15, 26, [20, 8.9]), ...pr('brazier', 6.5, 31.5),
      ...pr('bones', 14, 22, 28), ...pr('cage', [36, 6.8]), ...pr('gargoyle', [1.5, 8.0], [38, 11.0]), ...pr('rubble', 18.5), ...pr('banner', [35.5, 1.5])],
    lore: [{ x: 6, text: 'A gallery door hangs open high on the west wall, one stride of air beyond any leap you own.' }] },

  // Idea: the first double-jump climb - ten ledges 3.6 m apart with harpies contesting every landing.
  // The west door at its foot is the shortcut into the Athenaeum.
  { id: 'belfry_climb', name: 'Belfry Climb', area: '15', col: 37, row: -14, w: 1, h: 5, theme: 'belfry',
    doors: [{ side: 'W', row: -10 }, { side: 'E', row: -10 }, { side: 'N', col: 37 }],
    blocks: [{ x: 5.4, y: 0.5, w: 2.6, h: 1.0 }],                                // fallen bell
    platforms: zig([[8, 4.0, 3.5], [1.5, 7.6, 3.5], [8, 11.2, 3.5], [2, 14.8, 3.5], [7.5, 18.4, 3.5], [1.5, 22.0, 3.5], [8, 25.6, 3.5], [2, 29.2, 3.5], [9, 32.4, 3], [5.17, 34.8, 3]]),
    enemies: [{ t: 'harpy', x: 6.5, y: 9.5 }, { t: 'kobold_armored', x: 9.8, y: 11.2 }, { t: 'spider', x: 3.6, y: 14.8 }, { t: 'harpy', x: 6.5, y: 24 }, { t: 'werebat', x: 6.5, y: 30.6 }],
    items: [{ x: 2.6, y: 22.0, gem: 'topaz' }],
    breakables: [{ x: 10.5, y: 4.0 }, { x: 10, y: 18.4 }, { x: 10.4, y: 25.6 }],
    props: [...pr('bigbell', [6.67, 1.5], [6.67, 18.4]), ...pr('chain', 3.5, [10, 11.2], [3, 22.0]), ...pr('torch', 1.2, 12.2, [12.2, 11.2], [1.1, 22.0], [12.2, 32.4]),
      ...pr('window', [6.67, 7.6], [6.67, 25.6]), ...pr('gargoyle', [1.5, 14.8], [11.5, 25.6]), ...pr('web', [11.5, 4.0]), ...pr('rubble', 9)],
    lore: [{ x: 3, text: 'The west door breathes old paper and candle smoke.' }] },

  // Idea: the carillon under the roof. The great bell hangs in a walled cradle; the only ledges to the roof hole are the
  // ones it remembers (Echo Sight). East, a swinging clapper over a bed of spikes guards the Seraphwing.
  { id: 'tower_crown', name: 'Carillon Crown', area: '15', col: 37, row: -16, w: 4, h: 2, theme: 'belfry',
    doors: [{ side: 'S', col: 37 }, { side: 'N', col: 38 }],
    blocks: [{ x: 14.5, y: 0.5, w: 1.2, h: 3.6 }, { x: 24.3, y: 0.5, w: 1.2, h: 3.6 },   // the bell cradle
      { x: 46.5, y: 0.5, w: 6.833, h: 3.0 }],                                            // reliquary dais
    spikes: [{ x: 25.5, y: 0.5, w: 21 }],
    platforms: zig([[9.5, 3.9, 3], [4, 7.3, 3.2], [0.8, 10.6, 2.6], [29.5, 4.6, 1.8]]),
    movers: [{ x: 35.5, y: 5.0, w: 2, dx: 5, period: 5 }],
    echo: zig([[16, 3.6, 2.6], [21.4, 6.6, 2.6], [16.4, 9.6, 2.6], [18.5, 12.4, 3]]),
    enemies: [{ t: 'harpy', x: 31, y: 9 }, { t: 'harpy', x: 41, y: 10 }, { t: 'werebat', x: 11, y: 12 }, { t: 'werebat', x: 36, y: 12.5 }, { t: 'vknight', x: 49.4, y: 3.5 }],
    chests: [{ x: 51.2, y: 3.5, unique: 'seraphwing', big: true }],
    items: [{ x: 2, y: 10.6, up: 'mana' }],
    breakables: [{ x: 11.5 }, { x: 18 }, { x: 22 }, { x: 47.6, y: 3.5 }],
    props: [...pr('bigbell', [20, 4.1], [34, 8.0], [44, 8.0]), ...pr('gargoyle', [15.1, 4.1], [24.9, 4.1], [52, 3.5]), ...pr('window', [8, 3.9], [40, 5.0]), ...pr('chain', 12.5, 28, [48, 3.5]),
      ...pr('brazier', 2.5, 13, [50.3, 3.5]), ...pr('torch', [1.2, 7.3], 20), ...pr('rubble', 17), ...pr('bones', 23, 10), ...pr('banner', [49, 3.5])],
    lore: [{ x: 20, text: 'The great bell hangs over nothing. Strike it in your mind and, for a breath, there are steps in the air.' },
      { x: 27, text: 'The clapper still swings, back and forth above the iron teeth.' }] },

  // ================================================================== PORTRAIT GALLERY (area 13, act 3)
  // Idea: a long damask hall you enter through the floor; statues that are not statues; two balconies and a chandelier
  // line joined only by double jumps. A thin panel under the east balcony hides the curator's closet.
  { id: 'portrait_gallery', name: 'Portrait Gallery', area: '13', col: 26, row: -8, w: 6, h: 2, theme: 'portrait',
    doors: [{ side: 'S', col: 28 }, { side: 'W', row: -7 }, { side: 'W', row: -8 }, { side: 'E', row: -8 }],
    blocks: [{ x: 10, y: 0.5, w: 8, h: 3.4 },                                    // mannequin plinth (too tall for one jump)
      { x: 0, y: 7, w: 18, h: 1 }, { x: 44, y: 7, w: 36, h: 1 },                 // west and east balconies
      { x: 69, y: 4.3, w: 1.2, h: 2.7 }],                                        // wall over the false panel
    cracks: [{ x: 69, y: 0.5, w: 1.2, h: 3.8, by: 'hit' }],
    platforms: zig([[19.2, 5.9, 3], [22.5, 8.3, 3], [30, 9.0, 3.6], [37.5, 8.3, 3], [39, 4.2, 3.4]]),
    enemies: [{ t: 'mannequin', x: 14, y: 3.9 }, { t: 'mannequin', x: 46 }, { t: 'mannequin', x: 58 }, { t: 'werebat', x: 52, y: 11.6 }, { t: 'werebat', x: 9, y: 12 }, { t: 'lancer', x: 62, y: 8.0 }],
    chests: [{ x: 75, tier: 3, rarity: 'rare' }],
    items: [{ x: 31.8, y: 9.0, gem: 'amethyst' }],
    breakables: [{ x: 24 }, { x: 42 }, { x: 54 }, { x: 66 }, { x: 8, y: 8.0 }, { x: 70, y: 8.0 }],
    props: [...pr('painting', 5, 22, 28, 40, 50, 60, 68.4, [12, 8.0], [56, 8.0]), ...pr('statue', 26, 52, 64, [12, 3.9], [16, 3.9]), ...pr('chandelier', [24, 8.3], [31.8, 9.0], [39, 8.3]),
      ...pr('candles', 20, 36, 48, 62, 74, [6, 8.0], [50, 8.0], [66, 8.0], [76, 8.0]), ...pr('rug', 33.3), ...pr('mirror', 3), ...pr('tapestry', 44), ...pr('rubble', 68)],
    lore: [{ x: 56, text: "The portraits' eyes are painted shut. The mannequins' were never painted at all." },
      { x: 67, text: 'One frame hangs crooked. The panel behind it sounds thin.' }] },

  // ================================================================== FORBIDDEN ATHENAEUM (area 23, act 3)
  // Idea: three stacked corridors of shelves that snake east, west, east. The librarian waits at the dead end of the
  // middle corridor; the top one runs to the tower. A cell walled into the east end opens only from above (Dive).
  { id: 'athenaeum', name: 'Forbidden Athenaeum', area: '23', col: 32, row: -10, w: 5, h: 3, theme: 'library',
    doors: [{ side: 'W', row: -8 }, { side: 'W', row: -9 }, { side: 'W', row: -10 }, { side: 'E', row: -10 }],
    blocks: [{ x: 0, y: 7, w: 55, h: 1 }, { x: 61, y: 7, w: 5.667, h: 1 },       // floor of the middle corridor
      { x: 0, y: 14.5, w: 6, h: 1 }, { x: 12, y: 14.5, w: 50.2, h: 1 },          // floor of the top corridor
      { x: 61, y: 8, w: 1.2, h: 6.5 },                                           // wall of the sealed cell
      { x: 14, y: 0.5, w: 3, h: 1.1 }, { x: 30, y: 1.7, w: 4, h: 5.3 }, { x: 44, y: 0.5, w: 2.5, h: 2.0 },   // bottom: desk, hanging stack (slide), plinth
      { x: 40, y: 8, w: 2.4, h: 3.3 }, { x: 22, y: 8, w: 2.4, h: 2.0 },          // middle: bookcases to vault
      { x: 36, y: 15.5, w: 3, h: 1.2 }, { x: 48, y: 15.5, w: 2.4, h: 3.0 }],     // top: desk, bookcase
    cracks: [{ x: 62.2, y: 14.5, w: 1.467, h: 1, by: 'dive' }],
    platforms: zig([[55.3, 3.4, 2.8], [58, 6.0, 2.8],                            // east stairwell: bottom -> middle
      [9.2, 10.7, 2.8], [6.2, 13.3, 2.8],                                        // west stairwell: middle -> top
      [62.6, 11.7, 1.4],                                                         // inside the sealed cell
      [24, 17.8, 3], [29, 19.6, 4]]),                                            // shelf ladder
    enemies: [{ t: 'necromancer', x: 24 }, { t: 'zombie', x: 38, rise: true }, { t: 'mannequin', x: 50 },
      { t: 'zombie_necro', x: 47, y: 8.0 }, { t: 'lancer', x: 31, y: 8.0 }, { t: 'werebat', x: 16, y: 12 },
      { t: 'necromancer', x: 42.5, y: 15.5 }, { t: 'spider_red', x: 25.5, y: 17.8 }, { t: 'mannequin', x: 56, y: 15.5 }],
    chests: [{ x: 64.4, tier: 3, rarity: 'magic' }, { x: 31.4, y: 19.6, tier: 3, rarity: 'rare' }, { x: 65, y: 8.0, tier: 4, rarity: 'rare' }],
    items: [{ x: 63.4, y: 8.0, gem: 'emerald' }],
    breakables: [{ x: 9 }, { x: 27 }, { x: 52 }, { x: 34, y: 8.0 }, { x: 14, y: 8.0 }, { x: 20, y: 15.5 }, { x: 53, y: 15.5 }],
    props: [...pr('bookshelf', 6, 20, 26, 40, 52, [16, 8.0], [28, 8.0], [36, 8.0], [50, 8.0], [18, 15.5], [32, 15.5], [44, 15.5], [58, 15.5]),
      ...pr('candles', 11, 23, 36, 48, 60, [5, 8.0], [19, 8.0], [33, 8.0], [45, 8.0], [53, 8.0], [3, 15.5], [15, 15.5], [28, 15.5], [41, 15.5], [54, 15.5]),
      ...pr('table', 15.5, [26, 8.0], [37.5, 15.5]), ...pr('chandelier', [44, 8.0], [22, 15.5]), ...pr('orrery', [46, 15.5]), ...pr('rug', [10, 15.5]), ...pr('statue', 58), ...pr('rubble', [60, 8.0])],
    lore: [{ x: 20, text: 'Every shelf is chained. Not to keep the books from readers - to keep them on the shelves.' },
      { x: 59, y: 15.5, text: 'The boards by the tower door are split. Below them, a cell with no door at all.' }] },

  { id: 'librarian_nook', name: "The Librarian's Carrel", area: '23', col: 31, row: -9, w: 1, h: 1, theme: 'library', shop: { x: 5.5 },
    doors: [{ side: 'E', row: -9 }],
    props: [...pr('bookshelf', 1.8, 3.4), ...pr('table', 7.6), ...pr('candles', 4.2, 9), ...pr('rug', 6.6), ...pr('chandelier', 6.6)],
    lore: [{ x: 8, text: '"Everything here is for sale except the books. The books are for burning."' }] },

  { id: 'athenaeum_rest', name: 'Reading Shrine', area: '23', col: 31, row: -10, w: 1, h: 1, theme: 'shrine', save: { x: 6.67 },
    doors: [{ side: 'E', row: -10 }, { side: 'W', row: -10 }],
    props: [...pr('candles', 3.4, 9.9), ...pr('rosewindow', 6.67)],
    lore: [{ x: 2.6, text: 'The west door is warm to the touch, and smells of scorched vellum.' }] },

  // Idea: the book-burning furnaces. Two molten runs far too wide to jump; with the Cinder Bell you wade them
  // while rotwing harpies strafe. The entry landing is the tease.
  { id: 'burning_stacks', name: 'The Burning Stacks', area: '23', col: 26, row: -10, w: 5, h: 1, theme: 'forge',
    doors: [{ side: 'E', row: -10 }, { side: 'W', row: -10 }],
    lava: [{ x: 36, y: 0.5, w: 16, h: 0.8 }, { x: 13, y: 0.5, w: 17, h: 0.8 }],
    blocks: [{ x: 57, y: 0.5, w: 2.2, h: 1.2 }, { x: 42.5, y: 4.2, w: 3, h: 2.8 }, { x: 20, y: 4.2, w: 3, h: 2.8 },   // charred desk, two flues
      { x: 32, y: 0.5, w: 2.4, h: 1.0 }],                                        // plinth on the island
    enemies: [{ t: 'zombie_necro', x: 60.4 }, { t: 'harpy_undead', x: 48, y: 4.4 }, { t: 'plague_knight', x: 31 }, { t: 'harpy_undead', x: 26, y: 4.4 },
      { t: 'plague_knight', x: 10.5 }, { t: 'necromancer', x: 7 }],
    chests: [{ x: 35, tier: 5, rarity: 'magic' }],
    breakables: [{ x: 54 }, { x: 62.5 }, { x: 4 }, { x: 9 }],
    props: [...pr('furnace', 53.4, 33.2, 11.6), ...pr('bookshelf', 64, 55.6, 2.2), ...pr('brazier', 56, 30.6, 12.6), ...pr('pipe', 40, 24, 16), ...pr('rubble', 61, 35.4, 8),
      ...pr('chain', 46, 18), ...pr('crate', 5.4), ...pr('torch', 65.4, 1.4)],
    lore: [{ x: 60, text: 'They fed the forbidden shelves to the furnaces. The floor beyond still runs with what the books became.' }] },

  // Idea: the stacks nobody was meant to reach - no stair, no ladder; kick up the west well onto the reading floor
  // while witches fan orbs down it.
  { id: 'sealed_stacks', name: 'The Sealed Stacks', area: '23', col: 24, row: -12, w: 2, h: 3, theme: 'library',
    doors: [{ side: 'E', row: -10 }, { side: 'E', row: -11 }],
    blocks: [{ x: 3.5, y: 4.5, w: 16.5, h: 3.5 }, { x: 20, y: 7, w: 3.667, h: 1 }],   // the reading floor: only the well reaches it
    platforms: zig([[6, 11.8, 4], [0.8, 15.4, 2.8], [13, 11.4, 4], [19, 14.6, 4], [12.5, 17.8, 4]]),
    enemies: [{ t: 'silver', x: 13 }, { t: 'dragonling_undead', x: 7.5 }, { t: 'night_demon', x: 12, y: 8.0 }, { t: 'witch', x: 8, y: 11.8 }, { t: 'witch', x: 21, y: 14.6 }],
    chests: [{ x: 14.5, y: 17.8, tier: 6, rarity: 'rare' }],
    items: [{ x: 2, y: 15.4, gem: 'skull' }],
    breakables: [{ x: 18 }, { x: 4.5 }, { x: 16.5, y: 8.0 }, { x: 5, y: 8.0 }],
    props: [...pr('bookshelf', 6, 16, [8, 8.0], [15, 8.0], [14, 11.4]), ...pr('candles', 2, 22, [21.6, 8.0], [10, 8.0]), ...pr('chandelier', [13, 8.0]), ...pr('table', 10), ...pr('chain', 1.8),
      ...pr('web', [1.5, 15.4], [15.5, 17.8]), ...pr('rubble', 24), ...pr('statue', [18, 8.0]), ...pr('telescope', [20.6, 14.6])],
    lore: [{ x: 2, text: 'No ladder was ever built here. The scribes of the sealed wing climbed the stone itself.' }] },

  // Malgrave's arena: wide and flat, four reading galleries to fight from, the bell on the far dais.
  // Echo Sight, the moment you take it, shows the false wall behind the dais.
  { id: 'last_index', name: 'The Last Index', area: '23', col: 26, row: -12, w: 4, h: 2, theme: 'library', boss: 'archivist',
    doors: [{ side: 'W', row: -11 }],
    blocks: [{ x: 39, y: 0.5, w: 6, h: 1 }, { x: 46.2, y: 4.8, w: 1.6, h: 9.7 }],
    gates: [{ x: 47, kind: 'veil' }],
    platforms: zig([[6, 3.4, 4], [14, 6.4, 4], [30, 6.4, 4], [33, 3.4, 4]]),
    enemies: [{ t: 'archivist', x: 29, boss: true }],
    bell: { id: 'echo', x: 42, y: 1.5 },
    chests: [{ x: 50.6, tier: 6, rarity: 'rare' }],
    items: [{ x: 49, y: 0.5, gem: 'diamond' }],
    breakables: [{ x: 4 }, { x: 37 }],
    props: [...pr('bookshelf', 5, 11, 18, 25, 32, 37.5), ...pr('chandelier', 13, 30), ...pr('candles', 8, 21, 35, [40, 1.5], [44, 1.5]), ...pr('orrery', 22), ...pr('table', 27),
      ...pr('column', 9.5, 34.5), ...pr('tapestry', 46.4), ...pr('altar', [42, 1.5]), ...pr('rug', 24)],
    lore: [{ x: 6, text: 'Malgrave catalogued every bell the king silenced, and kept the last one for himself.' }] },

  // ================================================================== SCRIBES LABYRINTH (area 24, act 3)
  // Idea: twelve copying cells in a 4x3 block, linked by crawls, shafts and one thin wall. The west cell on the middle
  // floor ends in a wall that is only there for eyes without Echo Sight.
  { id: 'scribes_labyrinth', name: 'Scribes Labyrinth', area: '24', col: 22, row: -9, w: 4, h: 3, theme: 'library',
    doors: [{ side: 'E', row: -7 }, { side: 'E', row: -8 }, { side: 'W', row: -8 }],
    blocks: [
      { x: 0, y: 7, w: 6, h: 1 }, { x: 9.2, y: 7, w: 20.8, h: 1 }, { x: 33.5, y: 7, w: 19.833, h: 1 },                                   // middle floor (shafts at 6 and 30)
      { x: 0, y: 14.5, w: 8.8, h: 1 }, { x: 12, y: 14.5, w: 5, h: 1 }, { x: 20.5, y: 14.5, w: 23.5, h: 1 }, { x: 47.5, y: 14.5, w: 5.833, h: 1 },   // top floor (shafts at 8.8, 17, 44)
      { x: 39.5, y: 4.3, w: 1, h: 2.7 }, { x: 26.17, y: 1.7, w: 1, h: 5.3 }, { x: 12.83, y: 0.5, w: 1, h: 6.5 },                         // bottom walls: doorway, crawl, solid
      { x: 39.5, y: 11.8, w: 1, h: 2.7 }, { x: 26.17, y: 11.8, w: 1, h: 2.7 }, { x: 12.83, y: 8, w: 1, h: 6.5 },                         // middle walls: thin panel, doorway, solid
      { x: 39.5, y: 16.7, w: 1, h: 5.3 }, { x: 26.17, y: 19.3, w: 1, h: 2.7 }, { x: 12.83, y: 19.3, w: 1, h: 2.7 },                      // top walls: crawl, doorway, doorway
      { x: 3.2, y: 12.3, w: 1.6, h: 2.2 }],                                                                                               // lintel over the false wall
    cracks: [{ x: 39.5, y: 8, w: 1, h: 3.8, by: 'hit' }],
    gates: [{ x: 4, y: 8.0, kind: 'veil' }],
    platforms: zig([[6.2, 4.2, 2.8], [30.3, 4.2, 2.9], [9, 11.7, 2.8], [17.3, 11.7, 2.9], [44.3, 11.7, 2.9]]),
    enemies: [{ t: 'mannequin', x: 35 }, { t: 'spider_red', x: 20 }, { t: 'zombie', x: 10.6, rise: true },
      { t: 'zombie_necro', x: 36, y: 8.0 }, { t: 'mannequin', x: 23, y: 8.0 },
      { t: 'kobold_armored', x: 23, y: 15.5 }, { t: 'necromancer', x: 34, y: 15.5 }, { t: 'werebat', x: 4.5, y: 19.4 }],
    chests: [{ x: 16.4, tier: 3, rarity: 'magic' }, { x: 50.6, y: 15.5, tier: 3, rarity: 'rare' }, { x: 11.2, gem: 'sapphire' }],
    items: [{ x: 2.2, y: 0.5, up: 'mana' }],
    breakables: [{ x: 44 }, { x: 22.5 }, { x: 28.5, y: 8.0 }, { x: 46, y: 8.0 }, { x: 31, y: 15.5 }, { x: 5, y: 15.5 }],
    props: [...pr('bookshelf', 37, 48, 18, 3.5, [22, 8.0], [35, 8.0], [47.5, 8.0], [10.8, 8.0], [24, 15.5], [36, 15.5], [50, 15.5], [3, 15.5]),
      ...pr('table', 43, 23.5, [19.5, 8.0], [32, 15.5]), ...pr('candles', 46, 33, 15, 8, [44, 8.0], [29, 8.0], [15.5, 8.0], [10.5, 8.0], [42, 15.5], [29.5, 15.5], [15, 15.5], [6.5, 15.5]),
      ...pr('rubble', [41, 8.0]), ...pr('web', 1.5, 21), ...pr('rug', [49, 8.0]), ...pr('statue', [1.6, 15.5])],
    lore: [{ x: 46, text: 'The scribes copied one page until the walls forgot which way they faced.' },
      { x: 6.5, y: 8.0, text: 'The west wall hums, faintly, like struck glass. It is not there to every eye.' }] },

  // Secret behind the false wall: the Vespertine.
  { id: 'scriptorium_vault', name: 'Sealed Scriptorium', area: '24', col: 21, row: -8, w: 1, h: 1, theme: 'library', secret: true,
    doors: [{ side: 'E', row: -8 }],
    chests: [{ x: 4, unique: 'vespertine', big: true }],
    breakables: [{ x: 7.5 }],
    props: [...pr('bookshelf', 1.6, 10.4), ...pr('candles', 2.8, 5.4), ...pr('table', 8.6), ...pr('rug', 5), ...pr('skullwall', 6.6)],
    lore: [{ x: 6, text: 'One desk. One page, still wet. It describes you opening this door.' }] },
];
