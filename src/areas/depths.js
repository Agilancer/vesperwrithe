// THE DEPTHS (acts 5-6): Obsidian Mines -> Emberworks -> Brannoch's Anvil (Cinder Bell), then with Ember Ward
// the Execution Foundry slag-run -> Magma Reliquary -> the chimney up to the Mirror Palace (N col 52).
// Arrivals hold slide, djump, dive, wallkick. Nothing on the act-5 path wades lava; every act-6 room lies beyond it.
// Grid: cols 39-54, rows 1-9.  Outward doors: adit W row 6 (Cistern of Echoes), crown N col 52 (Mirror Palace).
const zig = (list) => list.map(([x, y, w]) => ({ x, y, w }));

export default [
  // ================================================================ OBSIDIAN MINES (19)
  // Entry tunnel: a slide crawl under a collapsed lintel, kobold trappers lobbing bones at whoever comes out of it.
  { id: 'adit', name: 'Cinderpick Adit', area: '19', col: 39, row: 6, w: 3, h: 1, theme: 'mine',
    doors: [{ side: 'W', row: 6 }, { side: 'E', row: 6 }],
    blocks: [{ x: 16, y: 1.7, w: 4, h: 5.3 }, { x: 26.5, y: 0.5, w: 5, h: 1.2 }],
    platforms: zig([[7.5, 2.8, 3.5], [22, 2.9, 3.2]]),
    enemies: [{ t: 'kobold_armored', x: 10.5 }, { t: 'kobold_armored', x: 23.5, y: 2.9 }, { t: 'spider_red', x: 29, y: 1.7 }, { t: 'goblin_armored', x: 34 }],
    chests: [{ x: 9, y: 2.8, gem: 'topaz' }],
    breakables: [{ x: 6 }, { x: 13 }, { x: 24.8 }, { x: 36.5 }],
    props: [{ t: 'torch', x: 3 }, { t: 'torch', x: 14 }, { t: 'torch', x: 25 }, { t: 'torch', x: 37 }, { t: 'crate', x: 5 }, { t: 'crate', x: 5.9 }, { t: 'barrel', x: 12 },
      { t: 'crate', x: 21.3 }, { t: 'barrel', x: 32.6 }, { t: 'barrel', x: 33.4 }, { t: 'crystal', x: 11 }, { t: 'crystal', x: 35.5 }, { t: 'stalactite', x: 8 }, { t: 'stalactite', x: 23 },
      { t: 'stalactite', x: 31 }, { t: 'rubble', x: 15.2 }, { t: 'rubble', x: 20.8 }, { t: 'chain', x: 28 }, { t: 'web', x: 38.5 }],
    lore: [{ x: 14, text: 'The lintel came down on the last shift. What is left of the way is too low to walk.' },
      { x: 36, text: 'Warm air breathes up the shaft ahead. The castle keeps its fire far below the water.' }] },

  // The spine of the mines: adit ledge half-way up, a hanging basalt pillar splitting the shaft into two wall-kick chimneys.
  { id: 'longdrop', name: 'The Long Drop', area: '19', col: 42, row: 3, w: 1, h: 5, theme: 'mine',
    doors: [{ side: 'W', row: 6 }, { side: 'E', row: 6 }, { side: 'E', row: 7 }, { side: 'E', row: 3 }],
    blocks: [{ x: 5.6, y: 13, w: 2.2, h: 14 },          // hanging pillar: kick up either side of it
      { x: 0.5, y: 29.5, w: 3.5, h: 1 }],                // shelf of the walled-up nook, top-left
    cracks: [{ x: 3.2, y: 30.5, w: 0.8, h: 6.5, by: 'hit' }],
    platforms: zig([[5.2, 8.6, 3], [0.6, 19, 2.4], [10.4, 17, 2.4]]),
    enemies: [{ t: 'spider_red', x: 4 }, { t: 'kobold_armored', x: 1.8, y: 19 }, { t: 'werebat', x: 3, y: 15.5 }, { t: 'werebat', x: 10.5, y: 24 }],
    chests: [{ x: 2, tier: 5, rarity: 'magic' }],
    items: [{ x: 1.8, y: 30.5, up: 'life' }],
    breakables: [{ x: 8.5 }, { x: 6.7, y: 8.6 }, { x: 6.7, y: 27 }],
    props: [{ t: 'torch', x: 1, y: 8 }, { t: 'torch', x: 12.3, y: 8 }, { t: 'torch', x: 12.3, y: 0.5 }, { t: 'torch', x: 1, y: 19 }, { t: 'torch', x: 12.3, y: 30.5 },
      { t: 'chain', x: 4.4, y: 27 }, { t: 'chain', x: 9, y: 27 }, { t: 'crystal', x: 10.5 }, { t: 'crystal', x: 6.2, y: 27 }, { t: 'crystal', x: 11.4, y: 17 },
      { t: 'stalactite', x: 6.7, y: 9 }, { t: 'stalactite', x: 9.5, y: 33 }, { t: 'crate', x: 6 }, { t: 'barrel', x: 7 }, { t: 'bones', x: 3 }, { t: 'rubble', x: 4.6, y: 27 }, { t: 'web', x: 2, y: 34 }],
    lore: [{ x: 1.5, y: 8, text: 'No ladder was ever hung here. The miners went up the way thorns do - wall to wall.' },
      { x: 6.7, y: 27, text: 'The west wall rings hollow near the roof.' }] },

  { id: 'mine_shrine', name: "Lampwright's Rest", area: '19', col: 43, row: 6, w: 1, h: 1, theme: 'shrine', save: { x: 7.2 },
    doors: [{ side: 'W', row: 6 }],
    breakables: [{ x: 11.5 }],
    props: [{ t: 'candles', x: 3.6 }, { t: 'candles', x: 10.6 }, { t: 'crystal', x: 12 }, { t: 'lamp', x: 5 }, { t: 'rosewindow', x: 7.2 }],
    lore: [{ x: 9.5, text: 'A miner\'s lamp, still lit. Someone trims it who is no longer alive.' }] },

  // Fire-breathing whelps perched over a straight corridor: advance from cover block to cover block between breaths.
  { id: 'roost', name: 'Ashscale Roost', area: '19', col: 43, row: 3, w: 3, h: 1, theme: 'mine',
    doors: [{ side: 'W', row: 3 }, { side: 'E', row: 3 }, { side: 'S', col: 44 }],
    blocks: [{ x: 8, y: 0.5, w: 2, h: 1.4 }, { x: 27.5, y: 0.5, w: 2.5, h: 1.6 },
      { x: 35.5, y: 4.3, w: 4.33, h: 0.5 }],             // loft over the east door (secret, walled by the crack)
    cracks: [{ x: 18.2, y: 0, w: 3.6, h: 0.5, by: 'dive' },   // cracked floor over the Ossein Pit: plunge to enter
      { x: 35.5, y: 4.8, w: 0.8, h: 2.2, by: 'hit' }],
    platforms: zig([[11.5, 2.9, 3.5], [23.5, 3.0, 3.5], [31, 2.6, 3]]),
    enemies: [{ t: 'dragonling', x: 13.2, y: 2.9 }, { t: 'dragonling', x: 25.6, y: 3.0 }, { t: 'kobold_armored', x: 15.5 }, { t: 'spider_red', x: 31 }, { t: 'kobold_armored', x: 34 }],
    items: [{ x: 38, y: 4.8, up: 'mana' }],
    breakables: [{ x: 6 }, { x: 16.5 }, { x: 24 }, { x: 32.5, y: 2.6 }],
    props: [{ t: 'torch', x: 3 }, { t: 'torch', x: 16 }, { t: 'torch', x: 29 }, { t: 'torch', x: 37 }, { t: 'bones', x: 12 }, { t: 'bones', x: 24.5 }, { t: 'bones', x: 20, y: 0.5 },
      { t: 'crystal', x: 9, y: 1.9 }, { t: 'crystal', x: 22.5 }, { t: 'stalactite', x: 5 }, { t: 'stalactite', x: 18 }, { t: 'stalactite', x: 33.5 },
      { t: 'crate', x: 7 }, { t: 'barrel', x: 26.6 }, { t: 'rubble', x: 33.6 }, { t: 'web', x: 39, y: 4.8 }, { t: 'chain', x: 21.5 }],
    lore: [{ x: 5, text: 'Scorch fans across the floor, each the length of a breath. Count them, then run.' },
      { x: 17, text: 'The flagstones are cracked through. Far beneath, something enormous shifts its bones.' }] },

  // Optional miniboss pit, entered by plunging through the Roost floor. Flat 40 m floor, tiered ledges back up to the hole.
  { id: 'pit', name: 'The Ossein Pit', area: '19', col: 43, row: 4, w: 3, h: 2, theme: 'mine',
    doors: [{ side: 'N', col: 44 }, { side: 'E', row: 5 }],
    platforms: zig([[2.5, 3.2, 4.5], [33, 3.2, 4.5], [8, 6.2, 4], [28, 6.2, 4], [12.5, 8.8, 3.5], [24, 8.8, 3.5], [17.5, 11.4, 5]]),
    enemies: [{ t: 'bone_golem', x: 21, boss: true, mini: true }],
    chests: [{ x: 2.5, tier: 5, rarity: 'rare' }],
    items: [{ x: 25.8, y: 8.8, gem: 'amethyst' }],
    breakables: [{ x: 6 }, { x: 34.5 }, { x: 10, y: 6.2 }],
    props: [{ t: 'skullwall', x: 10 }, { t: 'skullwall', x: 30 }, { t: 'bones', x: 8 }, { t: 'bones', x: 14 }, { t: 'bones', x: 27 }, { t: 'bones', x: 33 }, { t: 'torch', x: 1.5, y: 3.2 },
      { t: 'torch', x: 38.5, y: 3.2 }, { t: 'brazier', x: 5 }, { t: 'brazier', x: 36 }, { t: 'chain', x: 15 }, { t: 'chain', x: 25 }, { t: 'cage', x: 9, y: 6.2 },
      { t: 'cage', x: 31, y: 6.2 }, { t: 'stalactite', x: 4 }, { t: 'stalactite', x: 36 }, { t: 'crystal', x: 38 }, { t: 'rubble', x: 20 }],
    lore: [{ x: 5, text: 'Every miner the dark took was thrown down here. The pit kept them, and put them together wrong.' }] },

  // The low road: a wide soft-earth floor where borers erupt. Stay on the stone - blocks and ledges are the safe line.
  { id: 'warrens', name: 'Borer Warrens', area: '19', col: 43, row: 7, w: 3, h: 1, theme: 'mine',
    doors: [{ side: 'W', row: 7 }, { side: 'E', row: 7 }],
    blocks: [{ x: 6, y: 0.5, w: 3, h: 1.2 }, { x: 17.5, y: 0.5, w: 3.5, h: 1.6 }, { x: 29.5, y: 0.5, w: 3, h: 1.2 }],
    platforms: zig([[11, 3.0, 3.5], [23.5, 3.2, 3.5]]),
    enemies: [{ t: 'worm', x: 13.5 }, { t: 'worm', x: 25.5 }, { t: 'worm', x: 34.5 }, { t: 'kobold_armored', x: 19.2, y: 2.1 }, { t: 'spider_red', x: 25, y: 3.2 }],
    chests: [{ x: 12.7, y: 3.0, tier: 5, rarity: 'magic' }],
    breakables: [{ x: 7.5, y: 1.7 }, { x: 15.5 }, { x: 27.5 }, { x: 37 }],
    props: [{ t: 'torch', x: 3 }, { t: 'torch', x: 15 }, { t: 'torch', x: 27 }, { t: 'torch', x: 38 }, { t: 'rubble', x: 10.5 }, { t: 'rubble', x: 22.5 }, { t: 'rubble', x: 35 },
      { t: 'mushroom', x: 4.5 }, { t: 'mushroom', x: 16 }, { t: 'mushroom', x: 28.3 }, { t: 'crystal', x: 30.8, y: 1.7 }, { t: 'crystal', x: 19, y: 2.1 }, { t: 'stalactite', x: 9.5 },
      { t: 'stalactite', x: 21.8 }, { t: 'stalactite', x: 33 }, { t: 'crate', x: 36 }, { t: 'barrel', x: 2 }, { t: 'bones', x: 24 }],
    lore: [{ x: 4, text: 'The earth between the stones is soft as breath, and it moves when you do.' }] },

  // Lift shaft joining both mine roads to the foundry: two counter-running cage lifts, doors at six heights.
  // At the very top a slag flue runs east to the Warden's hall - molten until the Cinder Bell (shortcut home after the boss).
  { id: 'winding', name: 'Winding-Engine Shaft', area: '19', col: 46, row: 2, w: 1, h: 6, theme: 'mine',
    doors: [{ side: 'W', row: 7 }, { side: 'W', row: 5 }, { side: 'W', row: 3 }, { side: 'E', row: 6 }, { side: 'E', row: 4 }, { side: 'E', row: 2 }],
    movers: [{ x: 5.2, y: 1.2, w: 3, dy: 13.3, period: 9 }, { x: 5.2, y: 16.3, w: 3, dy: 13.5, period: 9, phase: 0.5 }],
    blocks: [{ x: 3.4, y: 37, w: 6.93, h: 1 },          // floor of the slag flue (meets the east door ledge)
      { x: 3.4, y: 40.4, w: 9.43, h: 4.1 }],             // its low roof
    lava: [{ x: 3.4, y: 38, w: 9.94, h: 0.9 }],
    platforms: zig([[0.6, 8.3, 2.6], [10.3, 15.8, 2.5], [0.6, 23.3, 2.6], [10.3, 30.8, 2.5], [0.5, 34.3, 2.6], [0.5, 38, 2.9]]),
    enemies: [{ t: 'spider_red', x: 8 }, { t: 'kobold_armored', x: 11.5, y: 15.8 }, { t: 'dragonling', x: 11.5, y: 30.8 }, { t: 'werebat', x: 4, y: 20.5 }, { t: 'werebat', x: 8.5, y: 34.5 }],
    chests: [{ x: 1.8, y: 23.3, gem: 'ruby' }],
    breakables: [{ x: 11 }, { x: 1.8, y: 8.3 }, { x: 1.6, y: 38 }],
    props: [{ t: 'gear', x: 3, y: 0.5 }, { t: 'gear', x: 10.5, y: 0.5 }, { t: 'gear', x: 6.7, y: 34 }, { t: 'chain', x: 6.7, y: 14 }, { t: 'chain', x: 6.7, y: 29 }, { t: 'crate', x: 9.6 },
      { t: 'barrel', x: 4 }, { t: 'torch', x: 1, y: 0.5 }, { t: 'torch', x: 12.3, y: 8 }, { t: 'torch', x: 1, y: 15.5 }, { t: 'torch', x: 12.3, y: 23 }, { t: 'torch', x: 1, y: 30.5 },
      { t: 'torch', x: 1.2, y: 38 }, { t: 'crystal', x: 1.6, y: 8.3 }, { t: 'stalactite', x: 9, y: 33 }, { t: 'pipe', x: 8, y: 38 }, { t: 'hook', x: 10.5, y: 8 }],
    lore: [{ x: 6.7, text: 'The cages still run. Nothing winds the engine but heat.' },
      { x: 1.8, y: 38, text: 'A flue of running slag leads east toward a great hammering. Flesh would not last a step.' }] },

  // ================================================================ EMBERWORKS (25)
  { id: 'ember_mirror', name: 'Mirror of Embers', area: '25', col: 47, row: 4, w: 1, h: 1, theme: 'shrine', warp: { x: 8.2 },
    doors: [{ side: 'W', row: 4 }],
    breakables: [{ x: 11.6 }],
    props: [{ t: 'candles', x: 4.5 }, { t: 'candles', x: 11 }, { t: 'brazier', x: 2.5 }, { t: 'anvil', x: 12.2 }, { t: 'banner', x: 6 }],
    lore: [{ x: 5.5, text: 'The glass is warm to the touch, and shows a hall you have already walked.' }] },

  // The foundry floor: raised work-stones between slag channels. Ride the conveyor over the first channel and the
  // hoist over the second; giants hammer on the stones, whelps and trappers hold the gantries above.
  { id: 'foundry', name: 'The Emberworks', area: '25', col: 47, row: 5, w: 4, h: 2, theme: 'forge',
    doors: [{ side: 'W', row: 6 }, { side: 'N', col: 50 }, { side: 'S', col: 48 }],
    blocks: [{ x: 8, y: 0.5, w: 9, h: 1.5 }, { x: 23, y: 0.5, w: 7, h: 1.5 }, { x: 38, y: 0.5, w: 6, h: 1.5 }, { x: 49.5, y: 0.5, w: 3.33, h: 3 }],
    lava: [{ x: 30, y: 0.5, w: 8, h: 1.2 }, { x: 44, y: 0.5, w: 5.5, h: 1.2 }],
    movers: [{ x: 30.5, y: 2.3, w: 2.6, dx: 4.6, period: 6 },           // conveyor over the first channel
      { x: 45.2, y: 3.2, w: 2.8, dy: 8.3, period: 8 }],                 // hoist up to the Quenching Shrine
    platforms: zig([[18.6, 3.4, 2.8],                                  // chain-hung plate over the slag tap
      [9, 5.8, 6], [23.5, 5.8, 5.5], [39, 5.8, 4.5],                    // gantries
      [33, 10.4, 2.6]]),                                               // the unreachable shelf (Echo Sight)
    echo: [{ x: 28.5, y: 8.2, w: 2.2 }],
    enemies: [{ t: 'plague_giant', x: 12.5, y: 2.0 }, { t: 'kobold_armored', x: 12, y: 5.8 }, { t: 'pknight', x: 26.5, y: 2.0 }, { t: 'dragonling', x: 26, y: 5.8 }, { t: 'plague_giant', x: 41, y: 2.0 }],
    chests: [{ x: 34.3, y: 10.4, unique: 'cinderfall', big: true }, { x: 42.6, y: 5.8, tier: 5, rarity: 'rare' }],
    items: [{ x: 34, y: 0.5, gem: 'ruby' }],
    breakables: [{ x: 4 }, { x: 9.5, y: 2.0 }, { x: 29, y: 2.0 }, { x: 39, y: 2.0 }, { x: 51.6, y: 3.5 }, { x: 14, y: 5.8 }],
    props: [{ t: 'furnace', x: 2.5 }, { t: 'furnace', x: 51, y: 3.5 }, { t: 'anvil', x: 10.5, y: 2.0 }, { t: 'anvil', x: 24.5, y: 2.0 }, { t: 'anvil', x: 43, y: 2.0 },
      { t: 'brazier', x: 6 }, { t: 'brazier', x: 16, y: 2.0 }, { t: 'brazier', x: 28, y: 2.0 }, { t: 'brazier', x: 38.8, y: 2.0 }, { t: 'chain', x: 20 }, { t: 'chain', x: 34.3, y: 10.4 },
      { t: 'chain', x: 46.6 }, { t: 'hook', x: 32 }, { t: 'hook', x: 36 }, { t: 'pipe', x: 21, y: 5.8 }, { t: 'gear', x: 34, y: 2.0 }, { t: 'torch', x: 10, y: 5.8 }, { t: 'torch', x: 40, y: 5.8 },
      { t: 'barrel', x: 5 }, { t: 'crate', x: 15, y: 2.0 }],
    lore: [{ x: 19.5, text: 'The slag tap gapes between the work-stones. What pours down it does not cool.' },
      { x: 27, y: 2.0, text: 'A coffer hangs over the channel on a single chain. No gantry reaches it - yet the chain is worn by hands.' }] },

  { id: 'ember_shrine', name: 'Quenching Shrine', area: '25', col: 50, row: 4, w: 1, h: 1, theme: 'shrine', save: { x: 2.7 },
    doors: [{ side: 'S', col: 50 }, { side: 'N', col: 50 }],
    platforms: zig([[4.9, 4.3, 3.6]]),
    breakables: [{ x: 10.5 }],
    props: [{ t: 'candles', x: 1.5 }, { t: 'candles', x: 11.6 }, { t: 'chain', x: 6.67 }, { t: 'brazier', x: 9.6 }, { t: 'anvil', x: 12 }],
    lore: [{ x: 10, text: 'The hammering overhead has a rhythm. It has not missed a beat in a hundred years.' }] },

  // Boss: Brannoch, the Cinder Warden. 44 m of flat floor, three dodge ledges; you rise through the floor at the east end,
  // the bell appears on the west dais. Above the dais a slag-filled flue is the way home once the bell is rung.
  { id: 'warden_hall', name: "Brannoch's Anvil", area: '25', col: 47, row: 2, w: 4, h: 2, theme: 'forge', boss: 'cinder_giant',
    doors: [{ side: 'S', col: 50 }, { side: 'W', row: 2 }],
    blocks: [{ x: 0.5, y: 0.5, w: 7, h: 1 }],
    lava: [{ x: 0, y: 8, w: 3, h: 0.9 }],
    platforms: zig([[12, 3.4, 5], [24.5, 4.6, 5], [35, 3.4, 5], [4, 4.8, 3]]),
    enemies: [{ t: 'cinder_giant', x: 24, boss: true }],
    bell: { id: 'ember', x: 4.5, y: 1.5 },
    props: [{ t: 'furnace', x: 10 }, { t: 'furnace', x: 27 }, { t: 'furnace', x: 41 }, { t: 'anvil', x: 20 }, { t: 'anvil', x: 33 }, { t: 'brazier', x: 8.5 }, { t: 'brazier', x: 44 },
      { t: 'brazier', x: 50.5 }, { t: 'chain', x: 14.5 }, { t: 'chain', x: 27 }, { t: 'chain', x: 37.5 }, { t: 'column', x: 17 }, { t: 'column', x: 31 }, { t: 'banner', x: 22 },
      { t: 'banner', x: 30 }, { t: 'bigbell', x: 4.5, y: 1.5 }, { t: 'torch', x: 51.5 }, { t: 'hook', x: 46.7 }],
    lore: [{ x: 50, text: 'He was set to keep the fires until the King returned. The King never left; the Warden never stopped.' },
      { x: 8, text: 'Slag brims in the flue above the dais, running west. Only the bell\'s ward could wade it.' }] },

  // ================================================================ EXECUTION FOUNDRY (21)
  // Under the slag tap: a safe tapping-stone beneath the hole, molten runs either side. With Ember Ward: wade east
  // beneath the headsman's pendulums to the Reliquary, or west to the condemned cells' coffer.
  { id: 'slag_run', name: 'Execution Foundry', area: '21', col: 47, row: 7, w: 4, h: 1, theme: 'forge',
    doors: [{ side: 'N', col: 48 }, { side: 'E', row: 7 }],
    blocks: [{ x: 16.5, y: 0.5, w: 7, h: 1.5 }, { x: 33, y: 0.5, w: 6, h: 1.2 }],
    lava: [{ x: 6, y: 0.5, w: 10.5, h: 1 }, { x: 23.5, y: 0.5, w: 9.5, h: 1 }, { x: 39, y: 0.5, w: 6.5, h: 1 }],
    platforms: zig([[18.4, 4.2, 3.2]]),
    blades: [{ x: 28.2, y: 7, len: 5, period: 3.2 }, { x: 42.2, y: 7, len: 5, period: 3.2, phase: 0.5 }],
    enemies: [{ t: 'pknight', x: 3.6 }, { t: 'witch', x: 34.5, y: 1.7 }, { t: 'dragonling_undead', x: 37.6, y: 1.7 }, { t: 'night_demon', x: 48 }],
    chests: [{ x: 1.6, tier: 6, rarity: 'rare' }],
    items: [{ x: 11, y: 0.5, gold: 50 }],
    breakables: [{ x: 5 }, { x: 22.5, y: 2.0 }, { x: 46.5 }, { x: 51 }],
    props: [{ t: 'cage', x: 3 }, { t: 'cage', x: 9 }, { t: 'cage', x: 13 }, { t: 'hook', x: 26 }, { t: 'hook', x: 31 }, { t: 'hook', x: 40.5 }, { t: 'chain', x: 20 }, { t: 'chain', x: 36 },
      { t: 'brazier', x: 17.3, y: 2.0 }, { t: 'brazier', x: 36, y: 1.7 }, { t: 'torch', x: 2 }, { t: 'torch', x: 50 }, { t: 'bones', x: 4.4 }, { t: 'bones', x: 49.5 },
      { t: 'furnace', x: 46.5 }, { t: 'anvil', x: 21.8, y: 2.0 }, { t: 'pipe', x: 44 }, { t: 'skullwall', x: 51.5 }],
    lore: [{ x: 20, y: 2.0, text: 'Sentence was simple here: the condemned were walked east. The slag did the rest.' },
      { x: 47, text: 'Beyond the foundry the rock itself is molten, and the saints were buried in it for safe keeping.' }] },

  // ================================================================ MAGMA RELIQUARY (29)
  // The great cavern: descend the west terraces, cross the lake on basalt stacks rising eastward, then double back along
  // the roof ledges to the chimney. Wading finds the sunken coffers; a spirit-gated vault sits under the east overhang.
  { id: 'molten_lake', name: 'The Molten Lake', area: '29', col: 51, row: 7, w: 4, h: 3, theme: 'magma',
    doors: [{ side: 'W', row: 7 }, { side: 'W', row: 9 }, { side: 'N', col: 52 }],
    blocks: [{ x: 8.5, y: 0.5, w: 4, h: 8.5 }, { x: 16.5, y: 0.5, w: 5, h: 5.5 }, { x: 25.5, y: 0.5, w: 4.5, h: 8 }, { x: 33.5, y: 0.5, w: 4, h: 11.5 },   // basalt stacks
      { x: 41, y: 0.5, w: 11.83, h: 4 },                 // east shore terrace
      { x: 47.2, y: 8.8, w: 5.63, h: 13.2 }],            // overhanging rock: roof of the vault
    gates: [{ x: 48, y: 4.5, kind: 'ghost' }],
    lava: [{ x: 6, y: 0.5, w: 35, h: 1.6 }],
    platforms: zig([[4.5, 12.3, 3.5], [28.5, 15.2, 3.2], [23, 17.6, 3], [18.3, 19.2, 3.4]]),
    echo: [{ x: 5.5, y: 17.2, w: 3 }, { x: 11.5, y: 18.4, w: 3.2 }],
    enemies: [{ t: 'dragonling_undead', x: 19.5, y: 6.0 }, { t: 'witch', x: 35.5, y: 12.0 }, { t: 'night_demon', x: 44 , y: 4.5 }, { t: 'harpy_undead', x: 24, y: 12 },
      { t: 'harpy_undead', x: 32, y: 17 }, { t: 'dragonling_undead', x: 27.5, y: 8.5 }],
    chests: [{ x: 23.5, tier: 6, rarity: 'rare' }, { x: 51, y: 4.5, tier: 6, rarity: 'rare' }],
    items: [{ x: 31.7, y: 0.5, up: 'life' }, { x: 50, y: 4.5, gem: 'diamond' }, { x: 39.2, y: 0.5, gold: 50 }],
    breakables: [{ x: 3 }, { x: 10.5, y: 9.0 }, { x: 42.5, y: 4.5 }, { x: 45.5, y: 4.5 }, { x: 36.5, y: 12.0 }],
    props: [{ t: 'torch', x: 1.5, y: 15.5 }, { t: 'torch', x: 1.5 }, { t: 'brazier', x: 9.5, y: 9.0 }, { t: 'brazier', x: 21, y: 6.0 }, { t: 'brazier', x: 34, y: 12.0 }, { t: 'brazier', x: 42, y: 4.5 },
      { t: 'statue', x: 29, y: 8.5 }, { t: 'statue', x: 46, y: 4.5 }, { t: 'sarcophagus', x: 43.5, y: 4.5 }, { t: 'altar', x: 52, y: 4.5 }, { t: 'crystal', x: 17.2, y: 6.0 },
      { t: 'crystal', x: 4.5 }, { t: 'stalactite', x: 7 }, { t: 'stalactite', x: 14.5 }, { t: 'stalactite', x: 38 }, { t: 'stalactite', x: 44 }, { t: 'chain', x: 20, y: 19.2 },
      { t: 'chain', x: 30, y: 15.2 }, { t: 'bones', x: 11.5, y: 9.0 }, { t: 'rubble', x: 2.5 }],
    lore: [{ x: 1.5, y: 15.5, text: 'They sank the reliquaries where no thief could follow. The lake has kept every one.' },
      { x: 44.5, y: 4.5, text: 'A vault under the overhang, barred by something that is not iron and not quite there.' }] },

  // Optional miniboss: Pyrrhax. A 40 m stone table moated with lava; the hoard coffer waits on the far dais behind him.
  { id: 'wyrm_lair', name: "Pyrrhax's Hoard", area: '29', col: 47, row: 8, w: 4, h: 2, theme: 'magma',
    doors: [{ side: 'E', row: 9 }],
    blocks: [{ x: 6.5, y: 0.5, w: 40, h: 1.5 }, { x: 0.5, y: 0.5, w: 3, h: 2.5 }],
    lava: [{ x: 3.5, y: 0.5, w: 3, h: 1.2 }, { x: 46.5, y: 0.5, w: 3, h: 1.2 }],
    platforms: zig([[7, 5.9, 4.6], [41.4, 5.9, 4.6]]),   // perches at the wings only: the wyrm owns the middle of the hall
    enemies: [{ t: 'dragon_red', x: 25, y: 2.0, boss: true, mini: true }],
    chests: [{ x: 2, y: 3.0, unique: 'dragonspine', big: true }],
    items: [{ x: 5, y: 0.5, gold: 50 }, { x: 43.6, y: 5.9, gem: 'topaz' }],
    breakables: [{ x: 8, y: 2.0 }, { x: 45, y: 2.0 }, { x: 51.5 }],
    props: [{ t: 'bones', x: 12, y: 2.0 }, { t: 'bones', x: 20, y: 2.0 }, { t: 'bones', x: 33, y: 2.0 }, { t: 'bones', x: 41, y: 2.0 }, { t: 'rubble', x: 16, y: 2.0 }, { t: 'rubble', x: 37, y: 2.0 },
      { t: 'brazier', x: 7.5, y: 2.0 }, { t: 'brazier', x: 45.5, y: 2.0 }, { t: 'brazier', x: 26.5, y: 2.0 }, { t: 'column', x: 14, y: 2.0 }, { t: 'column', x: 39, y: 2.0 }, { t: 'statue', x: 1, y: 3.0 },
      { t: 'sarcophagus', x: 30, y: 2.0 }, { t: 'crystal', x: 3, y: 3.0 }, { t: 'stalactite', x: 10 }, { t: 'stalactite', x: 28 }, { t: 'stalactite', x: 43 }, { t: 'chain', x: 22 }, { t: 'torch', x: 51 }],
    lore: [{ x: 50.5, text: 'The saints\' gold was heaped here for the fire to guard. The fire grew wings and kept it.' }] },

  // The way out: a serpentine climb over four half-floors - hoist, wall, ledge, hoist - with casters on every landing.
  { id: 'chimney', name: 'Chimney of Saints', area: '29', col: 52, row: 2, w: 1, h: 5, theme: 'magma',
    doors: [{ side: 'S', col: 52 }, { side: 'N', col: 52 }],
    blocks: [{ x: 0.5, y: 6.5, w: 8, h: 0.8 }, { x: 5, y: 13.5, w: 7.83, h: 0.8 }, { x: 0.5, y: 20.5, w: 8, h: 0.8 }, { x: 5, y: 27.5, w: 7.83, h: 0.8 }],
    movers: [{ x: 9.3, y: 1.5, w: 2.8, dy: 5.5, period: 5 }, { x: 0.8, y: 22.3, w: 2.6, dy: 5.5, period: 5 }],
    platforms: zig([[0.6, 10.8, 2.6], [10, 17.8, 2.7], [9.8, 31.3, 2.8], [5, 34.2, 3.4]]),
    spikes: [{ x: 5.2, y: 21.3, w: 1.6 }],
    enemies: [{ t: 'dragonling_undead', x: 3, y: 7.3 }, { t: 'witch', x: 10.5, y: 14.3 }, { t: 'night_demon', x: 2.6, y: 21.3 }, { t: 'witch', x: 10.8, y: 28.3 }, { t: 'harpy_undead', x: 3, y: 31 }],
    chests: [{ x: 11.6, y: 14.3, tier: 6, rarity: 'magic' }],
    breakables: [{ x: 11 }, { x: 1.5, y: 7.3 }, { x: 7, y: 21.3 }, { x: 6.5, y: 28.3 }],
    props: [{ t: 'statue', x: 2 }, { t: 'statue', x: 6.5, y: 7.3 }, { t: 'statue', x: 7.5, y: 14.3 }, { t: 'statue', x: 4, y: 21.3 }, { t: 'statue', x: 8.5, y: 28.3 }, { t: 'torch', x: 12.3 },
      { t: 'torch', x: 1, y: 7.3 }, { t: 'torch', x: 12.3, y: 14.3 }, { t: 'torch', x: 1, y: 21.3 }, { t: 'torch', x: 12.3, y: 28.3 }, { t: 'chain', x: 10.7, y: 7 }, { t: 'chain', x: 2.1, y: 28 },
      { t: 'candles', x: 3.5 }, { t: 'crystal', x: 12, y: 28.3 }, { t: 'stalactite', x: 3, y: 33 }, { t: 'stalactite', x: 11, y: 33 }, { t: 'bones', x: 9.5, y: 14.3 }],
    lore: [{ x: 2.5, text: 'Each landing holds a saint with the face struck off. Above, cold light - glass, not fire.' }] },

  // Top of the district: the hole to the Mirror Palace with a grate under it; a spirit-gated cell west, and east a
  // wall that is not a wall, hiding the sun-reliquary.
  { id: 'crown', name: 'Reliquary of the Hollowed Sun', area: '29', col: 51, row: 1, w: 3, h: 1, theme: 'magma',
    doors: [{ side: 'S', col: 52 }, { side: 'N', col: 52 }],
    blocks: [{ x: 8.2, y: 4.8, w: 1.6, h: 2.2 }, { x: 30.2, y: 4.8, w: 1.6, h: 2.2 }],   // lintels over the two gates
    gates: [{ x: 9, kind: 'ghost' }, { x: 31, kind: 'veil' }],
    platforms: zig([[18.2, 4.1, 3.6], [26.3, 2.9, 3]]),
    enemies: [{ t: 'silver', x: 13 }, { t: 'night_demon', x: 27 }, { t: 'witch', x: 28, y: 2.9 }],
    chests: [{ x: 37, unique: 'sunsplitter', big: true }, { x: 2.2, gem: 'onyx' }],
    items: [{ x: 5, y: 0.5, up: 'mana' }, { x: 34, y: 0.5, potion: true }],
    breakables: [{ x: 11.5 }, { x: 16 }, { x: 24 }, { x: 33 }],
    props: [{ t: 'rosewindow', x: 36 }, { t: 'altar', x: 38.3 }, { t: 'candles', x: 35 }, { t: 'candles', x: 39 }, { t: 'statue', x: 12 }, { t: 'statue', x: 29 }, { t: 'sarcophagus', x: 6.5 },
      { t: 'candles', x: 1.2 }, { t: 'brazier', x: 15 }, { t: 'brazier', x: 25 }, { t: 'mirror', x: 22.8 }, { t: 'chain', x: 18.6 }, { t: 'chain', x: 21.4 }, { t: 'column', x: 10.6 },
      { t: 'column', x: 29.6 }, { t: 'crystal', x: 3.5 }, { t: 'torch', x: 17 }],
    lore: [{ x: 23.5, text: 'Above the grate the stone turns to pale marble, and your reflection arrives a moment before you do.' },
      { x: 28.5, text: 'The east wall shows a saint holding up the sun. The bell that could unmake the picture is not rung yet.' }] },
];
