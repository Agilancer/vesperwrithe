// THORNBOUND GARDENS (act 4) · CLOCK SPIRE (act 5) · MIRROR PALACE (act 6)
//   Region A  cols 41-48, rows -3..0   gardens, Royal Menagerie, Gravehart's court, the spire's undercroft
//   Region B  cols 41-44, rows -16..-4 Clockwork Arsenal and Pendulum Spire, climbed with Thornstep
//   Region C  cols 49-54, rows -3..0   Mirror Palace behind its molten moat
// Outward doors: briar_lodge W row 0 (Bone Tower base, needs Dive to pass the lodge) · pendulum_spire N col 43
// (Gargoyle Ramparts, behind a veil wall) · false_faces S col 52 (drain to the Magma Reliquary, under lava).
// Validator notes: breakable/false floors that gate progress are built two layers thick, because the reachability
// model lets you "drop" through the solid you stand on; echo-only ledges are kept > 3.5 m from any wall face.
const P = (list) => list.map(([x, y, w]) => ({ x, y, w }));
const B = (list) => list.map(([x, y, w, h]) => ({ x, y, w, h }));
const pr = (t, ...at) => at.map((a) => (Array.isArray(a) ? { t, x: a[0], y: a[1] } : { t, x: a }));

export default [
  // ================================================================ REGION A — THORNBOUND GARDENS (act 4)

  // Entry from the Bone Tower. The gate lodge is sealed at ground level: climb to its roof and Dive through the
  // frost-split slab into the gate passage. Without Dive you can only turn round. Thornstep later climbs the
  // lodge tower (8 m sheer) into the Gardener's Mirror above — the fast road to the spire.
  { id: 'briar_lodge', name: 'Briar Gate Lodge', area: '14', col: 41, row: -1, w: 1, h: 2, theme: 'garden',
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }, { side: 'N', col: 41 }],
    blocks: B([[3.5, 0.5, 1, 7.5], [8.3, 2.6, 1.5, 13]]),          // lodge west wall · tower over the gate arch
    cracks: [{ x: 4.5, y: 7.6, w: 3.8, h: 0.4, by: 'dive' }, { x: 4.5, y: 7.2, w: 3.8, h: 0.4, by: 'dive' }],
    platforms: P([[0.8, 4.2, 2.4], [4.8, 4.2, 2.6]]),              // scaffold outside · gallery inside (way back up)
    enemies: [{ t: 'mannequin', x: 6.4 }],
    breakables: [{ x: 2 }, { x: 11.2 }],
    props: [...pr('lamp', 1.4, 12.4), ...pr('statue', 5.4, 10.6), ...pr('thornbush', 2.6, [4, 8]), ...pr('ivy', 9), ...pr('tree', 11.8),
      ...pr('rubble', [6.4, 8]), ...pr('torch', 7.6), ...pr('gatearch', 12.9), ...pr('grave', 0.9)],
    lore: [{ x: 6.2, y: 8, text: 'Frost has split the lodge roof from edge to edge. A weight dropped from on high would finish it.' },
      { x: 1.8, text: 'The garden gate was bricked shut from within. Whoever did it never came out.' }] },

  // Long lawns for the goat-headed revellers to charge down; hedges to hop, the maze overhead.
  { id: 'lawns', name: 'Thornbound Lawns', area: '14', col: 42, row: 0, w: 3, h: 1, theme: 'garden',
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }, { side: 'N', col: 43 }],
    blocks: B([[6.5, 0.5, 2.5, 1.3], [14.5, 0.5, 3, 2.0], [29, 0.5, 2.4, 2.4]]),
    platforms: P([[18.5, 4.4, 3], [32, 5.0, 3.2]]),
    enemies: [{ t: 'mannequin', x: 9.9 }, { t: 'goatman', x: 11.8 }, { t: 'harpy_undead', x: 25, y: 5.4 }, { t: 'goatman', x: 26.7 }, { t: 'plague_knight', x: 34.6 }],
    chests: [{ x: 33.8, y: 5.0, gem: 'emerald' }],
    breakables: [{ x: 4 }, { x: 13 }, { x: 24 }, { x: 37.5 }],
    props: [...pr('fountain', 22.5), ...pr('statue', 10.8, 37), ...pr('tree', 2.5, 13.2, 36), ...pr('lamp', 5, 19.4, 28, 38.6),
      ...pr('thornbush', [7.7, 1.8], [16, 2.5], [30.2, 2.9], 21), ...pr('grave', 24.6), ...pr('ivy', 39.4)],
    lore: [{ x: 22.5, text: 'The fountain ran with wine at the Queen\'s last revel. The goat-headed guests never went home.' }] },

  // Optional miniboss: the chained Viridian Wyrm. A viewing balcony from the maze, cage-tops to a life vessel,
  // Thornkiss on the keeper's dais, and a too-clean wall (veil) that is really the palace's back door.
  { id: 'menagerie', name: 'The Royal Menagerie', area: '22', col: 45, row: -1, w: 4, h: 2, theme: 'menagerie',
    doors: [{ side: 'W', row: 0 }, { side: 'W', row: -1 }, { side: 'E', row: 0 }],
    blocks: B([[43.5, 0.5, 4, 1.2], [48.8, 4.8, 4.53, 10.2]]),     // keeper's dais · false wall above the veil
    gates: [{ x: 49.6, kind: 'veil' }],
    platforms: P([[4, 3.6, 4], [4.5, 6.2, 3], [5.5, 9.4, 3.5], [11.5, 10.4, 3.5], [17.5, 11.0, 3.5], [23.5, 11.0, 4], [37, 3.6, 4]]),
    enemies: [{ t: 'dragon_green', x: 27, boss: true, mini: true }, { t: 'werebat', x: 15, y: 12.6 }, { t: 'werebat', x: 38, y: 11 }],
    chests: [{ x: 45.5, y: 1.7, unique: 'thornkiss', big: true }],
    items: [{ x: 25.5, y: 11.0, up: 'life' }],
    breakables: [{ x: 8 }, { x: 19 }, { x: 35 }, { x: 42 }],
    props: [...pr('cage', 7, 13.2, 19.2, 25.5, 33, 40), ...pr('chain', 22, 27, 32, 46.5), ...pr('torch', 3, 16, 30, 42.5, [1.5, 8]),
      ...pr('bones', 12, 24, 36), ...pr('brazier', 9.5, 41), ...pr('hook', 29.5), ...pr('portcullis', 0.4), ...pr('statue', 47.9)],
    lore: [{ x: 14, text: 'The Viridian Wyrm was the King\'s last gift to the Queen. Its chain is longer than it looks.' },
      { x: 47.6, text: 'Behind the last cage the wall is too clean, as if it had never been a wall.' }] },

  // The hedge maze: slide under the low hedge, climb over the tall ones, and find the walled-up heart (strike the
  // east face from the ledge beside it). The vessel on the heart's roof and the briar pillar are for Thornstep.
  { id: 'hedge_maze', name: 'The Hedge Maze', area: '14', col: 42, row: -2, w: 3, h: 2, theme: 'garden',
    doors: [{ side: 'S', col: 43 }, { side: 'W', row: -2 }, { side: 'N', col: 42 }, { side: 'N', col: 44 }, { side: 'E', row: -1 }],
    blocks: B([[9, 1.7, 1.5, 4.3], [26, 0.5, 1.5, 4.5],            // crawl-under hedge · tall hedge
      [13, 7, 10, 1], [13, 8, 1, 3.5], [13, 11.5, 10, 1],          // the heart: floor, west wall, roof
      [8.3, 9.8, 1.2, 6]]),                                        // briar pillar under the north-west gap
    cracks: [{ x: 22, y: 8, w: 1, h: 3.5, by: 'hit' }],
    platforms: P([[4, 4.2, 3], [5.2, 9.2, 3], [11.5, 4.0, 3], [22, 3.2, 3], [23, 8.0, 3], [28.5, 2.8, 2.5], [29, 8.3, 3.5], [31.9, 11.9, 2.8]]),
    spikes: [{ x: 14.8, y: 0.5, w: 2 }],
    enemies: [{ t: 'plague_knight', x: 5.5 }, { t: 'spider_red', x: 12.3 }, { t: 'mannequin', x: 18.5, y: 8 }, { t: 'goatman', x: 33.5 },
      { t: 'harpy_undead', x: 29.5, y: 5.8 }, { t: 'harpy_undead', x: 16, y: 14 }],
    chests: [{ x: 2.2, tier: 4, rarity: 'magic' }, { x: 16, y: 8, unique: 'worldtree', big: true }],
    items: [{ x: 18, y: 12.5, up: 'mana' }],
    breakables: [{ x: 7 }, { x: 24.2 }, { x: 37 }, { x: 30.5, y: 8.3 }],
    props: [...pr('tree', 3, 17, 36), ...pr('thornbush', 11, 15.8, 24, 31, [9.7, 6], [26.7, 5]), ...pr('statue', 6.5, 38, [20.5, 8], [15, 8]),
      ...pr('lamp', 1.6, 23.5, 34.5, [1.5, 8]), ...pr('rubble', [24, 8]), ...pr('ivy', 13.2, [8.9, 9.8]), ...pr('grave', 29.5), ...pr('fountain', 35.5)],
    lore: [{ x: 20, text: 'Every path in the maze bends toward its heart. The gardeners walled it up from the inside.' },
      { x: 11.5, text: 'The hedges were pruned by hand until the hands gave out. One has grown just low enough to crawl beneath.' }] },

  // District warp. The well in the floor drops straight onto the lodge roof (and Thornstep climbs back up it).
  { id: 'garden_warp', name: 'Gardener\'s Mirror', area: '14', col: 41, row: -2, w: 1, h: 1, theme: 'shrine', warp: { x: 10.8 },
    doors: [{ side: 'E', row: -2 }, { side: 'S', col: 41 }],
    chests: [{ x: 2.6, tier: 4, rarity: 'rare' }],
    props: [...pr('candles', 1.4, 9.2, 12.3), ...pr('rosewindow', 10.8), ...pr('chain', 6.67), ...pr('ivy', 3.8)],
    lore: [{ x: 4.4, text: 'The gardener kept a well in his cell, and no bucket. He went down it when the bells stopped.' }] },

  // Save before Gravehart.
  { id: 'hart_shrine', name: 'Shrine of Antlers', area: '14', col: 44, row: -3, w: 1, h: 1, theme: 'shrine', save: { x: 10.6 },
    doors: [{ side: 'S', col: 44 }, { side: 'W', row: -3 }, { side: 'E', row: -3 }],
    props: [...pr('candles', 1.6, 9, 12.2), ...pr('rosewindow', 10.6), ...pr('statue', 3.2)] },

  // BOSS — Gravehart rams from pillar to pillar. Enter on the high west ledge, fight on 38 m of flat lawn, take the
  // Briar Bell on the dais, then use it at once: the east pillar (9.5 m sheer) is the only way on to the palace moat.
  { id: 'hart_court', name: 'The Antlered Court', area: '14', col: 45, row: -3, w: 4, h: 2, theme: 'garden', boss: 'gravehart',
    doors: [{ side: 'W', row: -3 }, { side: 'E', row: -2 }],
    blocks: B([[3, 0.5, 2, 5.5], [46, 0.5, 2, 9.5], [43, 0.5, 3, 1.2]]),
    platforms: P([[6.5, 3.4, 4], [35, 3.6, 4]]),
    enemies: [{ t: 'gravehart', x: 29, boss: true }],
    bell: { id: 'wallkick', x: 44.5, y: 1.7 },
    props: [...pr('tree', 9, 21, 33, 51), ...pr('lamp', 7, 17, 27, 37, 50), ...pr('statue', 12.5, 40.5), ...pr('grave', 15, 24, 31),
      ...pr('thornbush', 19, 39, [4, 6]), ...pr('ivy', 46.4, 47.6), ...pr('fountain', 26)],
    lore: [{ x: 14, text: 'Gravehart was the Queen\'s own stag. It still lowers its head at the sound of her name.' },
      { x: 42, text: 'Briars wind up the garden wall like a ladder nobody has dared to climb.' }] },

  // The spire's undercroft, reachable (and teasing) from the save shrine in act 4: the chimney to the Clockwork
  // Arsenal has no rungs — 7.5 m of bare wall for Thornstep. A hole drops to the maze; a spirit gate guards the armoury.
  { id: 'arsenal_gate', name: 'Arsenal Undercroft', area: '34', col: 41, row: -3, w: 3, h: 1, theme: 'clock',
    doors: [{ side: 'E', row: -3 }, { side: 'S', col: 42 }, { side: 'N', col: 43 }],
    blocks: B([[30.5, 2.8, 1.23, 4.2], [34.93, 2.8, 1.23, 4.2], [11.2, 4.8, 1.6, 2.2]]), // chimney cheeks · lintel over the gate
    gates: [{ x: 12, kind: 'ghost' }],
    enemies: [{ t: 'mannequin', x: 6 }, { t: 'mannequin', x: 13.3 }, { t: 'pknight', x: 26.65 }],
    chests: [{ x: 2.4, tier: 6, rarity: 'rare' }],
    items: [{ x: 4.4, y: 0.5, up: 'life' }],
    breakables: [{ x: 16 }, { x: 24.5 }, { x: 37.5 }],
    props: [...pr('gear', 5, 16.5, 37), ...pr('anvil', 24), ...pr('crate', 23, 28.6), ...pr('banner', 15, 27), ...pr('torch', 2, 14.5, 25.5, 38.4),
      ...pr('chain', 31.1, 35.5), ...pr('pipe', 9), ...pr('statue', 8), ...pr('pendulum', 33.3)],
    lore: [{ x: 33.3, text: 'Scuffs climb the chimney in pairs, left and right, left and right. Someone went up without a ladder.' },
      { x: 14.4, text: 'A lattice of cold light bars the armoury. Only a shade could pass between its bars.' }] },

  // ================================================================ REGION B — CLOCK SPIRE (act 5)

  // Tall room 1: pure Thornstep. Three sheer stages — the counterweight channel (6.2 m), the hanging pillar up to
  // the side doors (6.5 m), and the pillar again to its cap (5.5 m). The chest above the top ledge needs Echo Sight.
  { id: 'winding_shaft', name: 'The Winding Shaft', area: '34', col: 43, row: -7, w: 1, h: 4, theme: 'clock',
    doors: [{ side: 'S', col: 43 }, { side: 'E', row: -6 }, { side: 'W', row: -7 }],
    blocks: B([[0.5, 2.8, 3.7, 6.2], [9.13, 2.8, 3.7, 6.2], [6, 11.5, 1.3, 9.5], [0.5, 15.2, 3, 0.8]]),
    platforms: P([[5, 27.6, 3.2]]),
    echo: P([[4.2, 25.3, 2]]),
    enemies: [{ t: 'spider_red', x: 2.4, y: 9 }, { t: 'werebat', x: 8.6, y: 12.4 }, { t: 'werebat', x: 3, y: 19.6 }, { t: 'harpy_undead', x: 10, y: 24.5 }],
    chests: [{ x: 6.6, y: 27.6, tier: 6, rarity: 'rare' }],
    breakables: [{ x: 2.4 }, { x: 11 }, { x: 11.4, y: 9 }, { x: 1.6, y: 16 }],
    props: [...pr('gear', 2, [11, 9], [2, 16], [10.5, 23]), ...pr('chain', 6.67, [4.8, 9], [8.6, 16]), ...pr('torch', 1, 12.3, [1, 9], [12.3, 15.5], [1, 23]),
      ...pr('pendulum', [10, 16]), ...pr('pipe', [12, 9]), ...pr('window', [6.6, 23])],
    lore: [{ x: 6.6, text: 'The shaft was built for counterweights, not for climbers. Something has kicked its way up the walls all the same.' }] },

  // Side vault: three blades over spiked footing, the armourer's masterwork at the end.
  { id: 'arsenal_vault', name: 'Armourer\'s Vault', area: '34', col: 44, row: -6, w: 1, h: 1, theme: 'clock',
    doors: [{ side: 'W', row: -6 }, { side: 'E', row: -6 }],
    blocks: B([[4.6, 0.5, 1.2, 1.1], [7.6, 0.5, 1.2, 1.1], [10.2, 0.5, 1.7, 1.1]]),
    cracks: [{ x: 12.33, y: 0.5, w: 1.0, h: 3.8, hp: 3, glow: 0xb080ff }], // behind the masterwork, the wall rings hollow
    spikes: [{ x: 3.4, y: 0.5, w: 1.2 }, { x: 5.8, y: 0.5, w: 1.8 }, { x: 8.8, y: 0.5, w: 1.4 }],
    blades: [{ x: 3.9, y: 6.6, len: 3.2, period: 3, phase: 0.25 }, { x: 6.7, y: 6.6, len: 3.4, period: 2.4 }, { x: 9.5, y: 6.6, len: 3.4, period: 2.4, phase: 0.5 }],
    enemies: [{ t: 'mannequin', x: 10.6, y: 1.6 }],
    chests: [{ x: 11.2, y: 1.6, unique: 'homeward', big: true }],
    breakables: [{ x: 1.8 }, { x: 2.8 }],
    props: [...pr('torch', 1.2, [12.3, 1.6]), ...pr('gear', 5.2, 8.2), ...pr('banner', 11.5), ...pr('crate', 0.9), ...pr('chain', 3.9, 6.7, 9.5), ...pr('anvil', 2.3)],
    lore: [{ x: 2, text: 'The armourer hung his masterwork where only the patient could reach it.' }] },

  // Tall room 2: the Great Movement. Ride the turning gears and the weight-lift up a 30 m gear-house; no walls to
  // lean on in the middle. Thornstep off the wall above the east door reaches the mana vessel.
  { id: 'great_movement', name: 'The Great Movement', area: '34', col: 41, row: -10, w: 2, h: 4, theme: 'clock', vista: 16,
    doors: [{ side: 'E', row: -7 }, { side: 'E', row: -10 }, { side: 'N', col: 41 }],
    movers: [{ x: 15, y: 4.5, w: 3.2, orbit: 3, period: 6 }, { x: 4, y: 9.5, w: 3, dy: 7, period: 5 }, { x: 15.5, y: 19.5, w: 3.2, orbit: 3, period: 6 }],
    platforms: P([[8.5, 9.5, 3.5], [8.5, 17.5, 4], [10, 24.5, 3.5], [5.2, 26.8, 3], [20, 27.3, 3]]),
    enemies: [{ t: 'pknight', x: 10 }, { t: 'harpy_undead', x: 21, y: 11.5 }, { t: 'werebat', x: 12.6, y: 13.6 }, { t: 'pknight', x: 10.6, y: 17.5 }, { t: 'werebat', x: 21, y: 24.6 }],
    chests: [{ x: 2.5, tier: 5, rarity: 'magic' }],
    items: [{ x: 21.5, y: 27.3, up: 'mana' }],
    breakables: [{ x: 6 }, { x: 19.5 }, { x: 9.2, y: 17.5 }, { x: 25.6, y: 23 }],
    props: [...pr('gear', 4, 16.6, 23, [16.6, 9.5], [3, 17.5], [17, 23], [24, 17.5], [12, 24.5]), ...pr('torch', 1.2, 13, 25.4, [9, 9.5], [12, 17.5], [25.4, 23], [6.7, 26.8]),
      ...pr('chain', [5.5, 17.5], [22, 9.5]), ...pr('pendulum', [22.5, 3]), { t: 'dial', x: 13.3, h: 6.5, r: 3.2 }, ...pr('anvil', 21.5), ...pr('crate', 7.4, 8.5), ...pr('pipe', 1, [25.6, 9.5])],
    lore: [{ x: 14, text: 'The Great Movement has kept no hour since the bells were silenced. It turns anyway.' }] },

  // Mid-way save.
  { id: 'horologist_cell', name: 'Horologist\'s Cell', area: '34', col: 43, row: -10, w: 1, h: 1, theme: 'shrine', save: { x: 7.4 },
    doors: [{ side: 'W', row: -10 }],
    props: [...pr('candles', 4.4, 10.4), ...pr('rosewindow', 7.4), ...pr('orrery', 11.8), ...pr('table', 2.6)],
    lore: [{ x: 11, text: 'His last entry: "The pendulum is correct. It is the day that has stopped."' }] },

  // Wide room: narrow plinths over a spike bed, a blade for every gap. A paladin holds the far landing; the east
  // end wall is patched with rubble (strike it).
  { id: 'pendulum_gallery', name: 'Pendulum Gallery', area: '39', col: 41, row: -11, w: 4, h: 1, theme: 'clock',
    doors: [{ side: 'S', col: 41 }, { side: 'N', col: 44 }],
    blocks: B([[13, 0.5, 2, 1.7], [18.5, 0.5, 2, 1.7], [24, 0.5, 2, 1.7], [29.5, 0.5, 2, 1.7], [35, 0.5, 2, 1.7], [42.6, 0.5, 2, 1.2]]),
    spikes: [{ x: 11, y: 0.5, w: 2 }, { x: 15, y: 0.5, w: 3.5 }, { x: 20.5, y: 0.5, w: 3.5 }, { x: 26, y: 0.5, w: 3.5 }, { x: 31.5, y: 0.5, w: 3.5 }, { x: 37, y: 0.5, w: 1 }],
    blades: [{ x: 16.75, y: 6.8, len: 3.4, period: 2.6 }, { x: 22.25, y: 6.8, len: 3.4, period: 2.6, phase: 0.5 }, { x: 27.75, y: 6.8, len: 3.4, period: 2.2 }, { x: 33.25, y: 6.8, len: 3.4, period: 2.2, phase: 0.5 }],
    platforms: P([[45.2, 4.4, 2.9]]),
    cracks: [{ x: 50, y: 0.5, w: 1, h: 6.5, by: 'hit' }],
    enemies: [{ t: 'werebat', x: 19.5, y: 5.8 }, { t: 'harpy_undead', x: 25, y: 5.2 }, { t: 'werebat', x: 30.5, y: 5.8 }, { t: 'silver', x: 39.8 }],
    items: [{ x: 51.9, y: 0.5, up: 'life' }],
    breakables: [{ x: 2.5 }, { x: 9.8 }, { x: 41.8 }, { x: 25, y: 2.2 }],
    props: [...pr('pendulum', 14, 25, 36), ...pr('gear', 3, 10, 43, 49), ...pr('torch', 1.4, 9.4, 39, 44, 49.2), ...pr('window', 20, 31), ...pr('chain', 46.67),
      ...pr('rubble', 49.2), ...pr('statue', 41.4), ...pr('banner', 12)],
    lore: [{ x: 10, text: 'Each blade keeps a different hour. None of them is the right one.' }] },

  // Tall room 3: lifts, narrow blade-swept steps, and the great pendulum crossing the upper lift. Paladins hold the
  // landings. The belfry stair to the ramparts hides behind a false wall (veil); the high chest wants echo ledges.
  { id: 'pendulum_spire', name: 'The Pendulum Spire', area: '39', col: 43, row: -16, w: 2, h: 5, theme: 'clock',
    doors: [{ side: 'S', col: 44 }, { side: 'N', col: 43 }],
    movers: [{ x: 22.3, y: 1.2, w: 3, dy: 7, period: 6 }, { x: 19, y: 17.2, w: 3, dy: 7.6, period: 6 }],
    blocks: B([[12, 8.0, 7, 0.8], [9.5, 16.4, 7.5, 0.8],           // paladin's landing · knight's landing
      [0.5, 30, 16.5, 0.5], [0.5, 29.5, 16.5, 0.5],                // belfry floor (two courses)
      [0.5, 30.5, 3.6, 7.5], [12.2, 34.8, 1.6, 3.2]]),             // thick west wall of the stair · lintel over the veil
    gates: [{ x: 13, y: 30.5, kind: 'veil' }],
    platforms: P([[8.2, 11.4, 2], [5.2, 14.0, 1.8], [19.5, 27.6, 3.5], [5.2, 34.2, 3], [20.6, 35.2, 2]]),
    echo: P([[18.2, 33.0, 1.8]]),
    blades: [{ x: 9.2, y: 15.4, len: 2.6, period: 2.8 }, { x: 6.1, y: 18.4, len: 3.0, period: 2.8, phase: 0.5 }, { x: 13.3, y: 28.6, len: 9, period: 5 }],
    enemies: [{ t: 'werebat', x: 5, y: 6 }, { t: 'silver', x: 15.2, y: 8.8 }, { t: 'werebat', x: 23.6, y: 13 }, { t: 'pknight', x: 13.4, y: 17.2 },
      { t: 'harpy_undead', x: 9, y: 23.5 }, { t: 'silver', x: 15.6, y: 30.5 }],
    chests: [{ x: 3, tier: 5, rarity: 'rare' }, { x: 21.6, y: 35.2, tier: 7, rarity: 'rare' }],
    breakables: [{ x: 7 }, { x: 12.4 }, { x: 17.6, y: 8.8 }, { x: 10.4, y: 17.2 }, { x: 10.4, y: 30.5 }],
    props: [...pr('pendulum', [13.3, 17.2], [6, 3]), ...pr('gear', 5, 15, [3, 8.8], [23.5, 8.8], [3.5, 17.2], [24, 17.2], [23.6, 27.6]),
      ...pr('torch', 1.2, 10, 25.4, [13, 8.8], [16.4, 17.2], [25.4, 27.6], [15.4, 30.5], [5, 30.5]), ...pr('chain', [23.8, 8.8], [20.5, 27.6]),
      ...pr('window', [3, 8.8], [24, 17.2]), ...pr('bigbell', [9, 30.5]), ...pr('statue', [11.2, 30.5])],
    lore: [{ x: 10, text: 'The great pendulum counts the hours the King stole. Do not stand where it has been.' },
      { x: 15.4, y: 30.5, text: 'The wall ahead rings hollow, though the eye insists on stone.' }] },

  // ================================================================ REGION C — MIRROR PALACE (act 6)

  // The palace front across 12.7 m of molten moat — seen from Gravehart's court in act 4, crossed with Ember Ward.
  { id: 'burning_moat', name: 'The Burning Moat', area: '28', col: 49, row: -3, w: 2, h: 2, theme: 'mirror',
    doors: [{ side: 'W', row: -2 }, { side: 'E', row: -2 }],
    blocks: B([[3, 0.5, 1.5, 0.75], [4.5, 0.5, 2.5, 1.5], [19.67, 0.5, 2.5, 1.5], [22.17, 0.5, 1.5, 0.75]]),
    lava: [{ x: 7, y: 0.5, w: 12.67, h: 1.3 }],
    platforms: P([[22.6, 4.6, 3.2], [19.8, 8.2, 3.2]]),
    enemies: [{ t: 'harpy_undead', x: 11, y: 6.5 }, { t: 'harpy_undead', x: 16, y: 8.6 }, { t: 'dragonling', x: 20.9, y: 2 }, { t: 'witch', x: 22.4, y: 8.2 }],
    chests: [{ x: 20.8, y: 8.2, tier: 6, rarity: 'magic' }],
    breakables: [{ x: 1.8 }, { x: 5.6, y: 2 }, { x: 24.6 }],
    props: [...pr('brazier', [5.2, 2], [21.4, 2]), ...pr('column', 2.4, 24.4), ...pr('mirror', [20.6, 8.2], 25.2), ...pr('statue', 1, [6.4, 2]), ...pr('chandelier', 13.3),
      ...pr('window', 9, 17), ...pr('gargoyle', [4.8, 2]), ...pr('gatearch', 26), ...pr('banner', 23.4), ...pr('candles', [24.8, 4.6])],
    lore: [{ x: 5.6, y: 2, text: 'The Mirror Palace keeps its moat molten. Guests were expected to arrive already burning.' }] },

  // Big chamber: the ballroom. Dancers that move when unwatched, demons that step out of the glass behind you,
  // witches on the stage and balcony, and a road of chandeliers across the ceiling to the far loge.
  { id: 'glass_ballroom', name: 'The Glass Ballroom', area: '28', col: 51, row: -3, w: 4, h: 2, theme: 'mirror',
    doors: [{ side: 'W', row: -2 }, { side: 'S', col: 53 }],
    blocks: B([[44, 0.5, 8.83, 1.6]]),
    platforms: P([[7, 3.0, 2.5], [0.8, 5.2, 5.2], [12, 6.8, 3], [19, 8.6, 3], [26, 10.2, 3], [33, 8.6, 3], [40, 6.8, 3], [47, 5.8, 5.5]]),
    enemies: [{ t: 'mannequin', x: 11 }, { t: 'night_demon', x: 17 }, { t: 'mannequin', x: 22 }, { t: 'silver', x: 26 }, { t: 'night_demon', x: 40.5 },
      { t: 'witch', x: 48, y: 2.1 }, { t: 'witch', x: 48.6, y: 5.8 }],
    chests: [{ x: 2.4, y: 5.2, tier: 6, rarity: 'magic' }, { x: 51, y: 5.8, tier: 6, rarity: 'rare' }],
    items: [{ x: 27.5, y: 10.2, up: 'mana' }],
    breakables: [{ x: 6 }, { x: 15 }, { x: 29 }, { x: 37.5 }, { x: 46, y: 2.1 }],
    props: [...pr('chandelier', 13.5, 20.5, 27.5, 34.5, 41.5), ...pr('mirror', 4, 9.5, 16, 24, 38, 43, [50.5, 2.1]), ...pr('column', 6, 18.5, 30.5, 43.2),
      ...pr('rug', 22), ...pr('window', 13, 37), ...pr('statue', 2, 42), ...pr('candles', 8, 36, [45, 2.1]), ...pr('organ', [50, 2.1]), ...pr('painting', 20, 28)],
    lore: [{ x: 14, text: 'The dancers stopped mid-step when the bells did. Do not turn your back on them.' },
      { x: 46.5, y: 2.1, text: 'Every mirror shows the ballroom lit and crowded, and you nowhere in it.' }] },

  // Miniboss: the Abyssal Mouth. Drop in from the upper east door, leave by the lower; the west door is the
  // menagerie's false wall.
  { id: 'maw_chamber', name: 'The Swallowing Hall', area: '28', col: 49, row: -1, w: 3, h: 2, theme: 'mirror',
    doors: [{ side: 'E', row: -1 }, { side: 'E', row: 0 }, { side: 'W', row: 0 }],
    platforms: P([[4, 3.6, 4], [31, 3.6, 4], [33.5, 6.0, 3]]),
    enemies: [{ t: 'abyssal_mouth', x: 19, boss: true, mini: true }, { t: 'mannequin', x: 9.5 }, { t: 'mannequin', x: 28.5 }],
    chests: [{ x: 6, y: 3.6, tier: 6, rarity: 'rare' }],
    breakables: [{ x: 7 }, { x: 14 }, { x: 26 }, { x: 33 }],
    props: [...pr('mirror', 8, 16, 24, 32), ...pr('chandelier', 12, 27), ...pr('column', 5.4, 13, 26, 34.6), ...pr('statue', 10.6, 29.6), ...pr('bones', 17, 22),
      ...pr('brazier', 3, 36), ...pr('rug', 20), ...pr('candles', [38.5, 8])],
    lore: [{ x: 20, text: 'It was a mirror once. It learned to keep what it was shown.' }] },

  // Hall of veil walls and echo ledges over a flooded undercroft. Upper gallery: a false wall hides Redthirst, an
  // echo step leads to the high gem. Below: the moat drains through the floor to the Magma Reliquary — the hole
  // lies under the lava — and a second false wall keeps a mana vessel.
  { id: 'false_faces', name: 'Hall of False Faces', area: '28', col: 52, row: -1, w: 3, h: 2, theme: 'mirror',
    doors: [{ side: 'N', col: 53 }, { side: 'W', row: -1 }, { side: 'W', row: 0 }, { side: 'S', col: 52 }],
    blocks: B([[3, 7, 6, 1], [13, 7.5, 26.83, 0.5], [13, 7, 26.83, 0.5],  // gallery floor (east span in two courses)
      [22, 0.5, 17.83, 6.5],                                               // solid ground under the east gallery
      [2.9, 0.5, 0.6, 1.7],                                                // kerb holding the lava back from the door
      [28.2, 12.3, 1.6, 2.2], [17, 4.8, 1.6, 2.2]]),                       // lintels over the two veils
    gates: [{ x: 29, y: 8, kind: 'veil' }, { x: 17.8, kind: 'veil' }],
    lava: [{ x: 3.5, y: 0.5, w: 13.5, h: 1.6 }],
    platforms: P([[9.3, 4.3, 3.4], [18.6, 11.8, 2.8], [4.6, 12.6, 2.8]]),
    echo: P([[8, 10.4, 2]]),
    enemies: [{ t: 'mannequin', x: 6.5, y: 8 }, { t: 'witch', x: 13.4, y: 8 }, { t: 'silver', x: 26.8, y: 8 }, { t: 'night_demon', x: 33.5, y: 8 }, { t: 'witch', x: 38.4, y: 8 }],
    chests: [{ x: 36.4, y: 8, unique: 'redthirst', big: true }, { x: 6, y: 12.6, gem: 'diamond' }],
    items: [{ x: 20.3, y: 0.5, up: 'mana' }],
    breakables: [{ x: 1.4 }, { x: 15, y: 8 }, { x: 24.4, y: 8 }, { x: 32, y: 8 }],
    props: [...pr('mirror', [5, 8], [15.5, 8], [23, 8], [27.3, 8], [31.6, 8], [35, 8], 16.4), ...pr('chandelier', [11, 8], [24.5, 8]), ...pr('column', [14, 8], [25.6, 8], 1.8),
      ...pr('statue', [4, 8], [22.4, 8], [38.9, 8]), ...pr('candles', [17, 8], [34.2, 8]), ...pr('painting', [8, 8]), ...pr('rug', [20, 8]), ...pr('brazier', 0.9), ...pr('crystal', 20.9)],
    lore: [{ x: 24.5, y: 8, text: 'Half the mirrors here are doors, and half the doors are mirrors. The Bell of Echoes would know which.' },
      { x: 1.6, text: 'The palace drains its moat through the floor. Far below, something drinks.' }] },

  // Secret: the Queen's huntsmen kept their trophy hall behind the armourer's wall. The largest frame is empty.
  { id: 'huntsmans_hall', name: 'The Huntsmen\'s Trophy Hall', area: '34', col: 45, row: -6, w: 2, h: 1, theme: 'portrait', secret: true,
    doors: [{ side: 'W', row: -6 }],
    platforms: P([[9, 2.9, 3.5], [14.5, 4.9, 3.5]]),
    items: [{ x: 22, unique: 'huntsmans_signet', altar: true, glow: 0xd8b070 }, { x: 16.2, y: 4.9, up: 'life' }],
    enemies: [{ t: 'mannequin', x: 8 }, { t: 'mannequin', x: 13 }, { t: 'mannequin', x: 18 }],
    breakables: [{ x: 4 }, { x: 25 }],
    props: [{ t: 'frame', x: 4.6 }, { t: 'trophy', x: 9.6 }, { t: 'trophy', x: 20.2 }, { t: 'trophy', x: 24.2 }, { t: 'spears', x: 13.2 }, { t: 'pelt', x: 10.2, y: 2.9 }, { t: 'pelt', x: 15.8, y: 4.9 },
      { t: 'statue', x: 2.2 }, { t: 'statue', x: 25.6 }, { t: 'banner', x: 12, house: 'tess' }, { t: 'chandelier', x: 13, y: 6 }, { t: 'rug', x: 13 }, { t: 'table', x: 6.5 }, { t: 'candles', x: 21 }],
    lore: [{ x: 3.5, text: 'The Queen\'s huntsmen hung their kills here. The largest frame is empty, and its hooks are bent outward.' }] },
];
