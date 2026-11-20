// The first ten rooms of Castle Velscour, laid on the map's grid (1 square = 1 camera screen).
// col/row follow Castle_Velscour_Labeled.png around START (row 0 = the Pilgrim Causeway line, rows grow downward).
// Contents use room-local metres: x from the room's left edge, y from the room's floor line (bottom edge).

export const SW = 13.333, SH = 7.5, FLOOR = 0.5;

export const ROOMS = [
  { id: 'causeway', name: 'Pilgrim Causeway', area: '01', col: 8, row: 0, w: 3, h: 1, theme: 'outdoor',
    doors: [{ side: 'E', row: 0 }],
    start: { x: 5, y: 0.5 },
    items: [{ x: 9.5, y: 0.5, pedestal: true, base: 'pilgrim_blade', rarity: 'normal', sockets: 1, tutorial: true }],
    props: [{ t: 'statue', x: 22 }, { t: 'lamp', x: 15 }, { t: 'lamp', x: 30 }, { t: 'gatearch', x: 38.8 }],
    breakables: [{ x: 18 }, { x: 26 }, { x: 33 }],
    lore: [{ x: 14, text: 'The causeway ends where the castle begins. Nothing behind you remains.' }] },

  { id: 'gatehouse', name: 'Blackthorn Gatehouse', area: '02', col: 11, row: 0, w: 2, h: 1, theme: 'hall',
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }],
    enemies: [{ t: 'zombie', x: 17, rise: true, drop: 'potion' }],
    breakables: [{ x: 9 }],
    props: [{ t: 'torch', x: 4 }, { t: 'torch', x: 22 }, { t: 'banner', x: 13.3 }, { t: 'portcullis', x: 0.4 }] },

  { id: 'shaft', name: 'Blackthorn Shaft', area: '02', col: 13, row: -8, w: 1, h: 9, theme: 'shaft',
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }, { side: 'W', row: -8 }, { side: 'E', row: -8 }],
    // varied climb: wide rests, narrow hops, a centre pillar run and a side alcove with a cache
    platforms: [[1.5, 2.8, 4.5], [7.5, 5.6, 3], [3.5, 8.4, 2.4], [8.5, 11.2, 4], [1.2, 14.0, 3], [5.6, 16.6, 2], [9.4, 19.2, 3.2], [4.2, 22.0, 5.2], [0.8, 24.8, 2.4], [6.0, 27.6, 2.2], [8.6, 30.6, 4.2], [3.0, 33.4, 3], [6.8, 36.2, 2.2], [1.0, 38.8, 3.6], [6.0, 41.6, 5.2], [10.2, 44.4, 2.6], [5.4, 47.2, 2.4], [0.9, 50.0, 4], [6.2, 52.8, 2.4], [9.2, 55.6, 3.6], [4.6, 58.0, 2.6]].map(([x, y, w]) => ({ x, y, w, oneway: true })),
    enemies: [{ t: 'knight', x: 10.5, y: 30.6 }, { t: 'zombie', x: 6.6, y: 22.0 }],
    chests: [{ x: 1.6, y: 38.8, gem: 'topaz' }],
    breakables: [{ x: 6.8, y: 22.0 }, { x: 7.8, y: 41.6 }],
    props: [{ t: 'chain', x: 6.6 }, { t: 'torch', x: 1, y: 14 }, { t: 'torch', x: 12.3, y: 28 }, { t: 'torch', x: 1, y: 42 }, { t: 'torch', x: 12.3, y: 56 }] },

  { id: 'lowerhall', name: 'Hall of Lost Pilgrims', area: '02', col: 14, row: 0, w: 6, h: 1, theme: 'hall',
    doors: [{ side: 'W', row: 0 }, { side: 'E', row: 0 }, { side: 'S', col: 15 }],
    enemies: [{ t: 'zombie', x: 30 }, { t: 'zombie', x: 38, rise: true }, { t: 'knight', x: 58 }],
    chests: [{ x: 46, base: 'kite_shield', rarity: 'normal', sockets: 1 }],
    breakables: [{ x: 12 }, { x: 24 }, { x: 52 }, { x: 66 }],
    thorns: [{ x: 77.5 }],
    props: [{ t: 'torch', x: 8 }, { t: 'torch', x: 26 }, { t: 'torch', x: 44 }, { t: 'torch', x: 62 }, { t: 'banner', x: 35 }, { t: 'banner', x: 53 }, { t: 'window', x: 14 }, { t: 'window', x: 50 }],
    lore: [{ x: 70, text: 'Blackthorn knots the archway. It recoils from flame.' }] },

  { id: 'votive', name: 'Votive Shrine', area: '02', col: 12, row: -8, w: 1, h: 1, theme: 'shrine', save: { x: 6.67 },
    doors: [{ side: 'W', row: -8 }, { side: 'E', row: -8 }],
    props: [{ t: 'candles', x: 3.5 }, { t: 'candles', x: 9.8 }] },

  { id: 'warp', name: 'Mirror of Passage', area: '02', col: 20, row: 0, w: 1, h: 1, theme: 'shrine', warp: { x: 6.67 },
    doors: [{ side: 'W', row: 0 }],
    chests: [{ x: 10.5, unique: 'gravesong', big: true }],
    props: [{ t: 'candles', x: 2.5 }] },

  { id: 'gallery', name: 'Gallery of Saints', area: '02', col: 14, row: -8, w: 6, h: 1, theme: 'gallery',
    doors: [{ side: 'W', row: -8 }, { side: 'S', col: 18 }],
    enemies: [{ t: 'knight', x: 22 }, { t: 'zombie', x: 36 }, { t: 'knight', x: 48 }],
    breakables: [{ x: 10 }, { x: 30 }, { x: 62 }],
    props: [{ t: 'window', x: 8 }, { t: 'window', x: 20 }, { t: 'window', x: 32 }, { t: 'window', x: 44 }, { t: 'window', x: 72 }, { t: 'torch', x: 14 }, { t: 'torch', x: 38 }, { t: 'torch', x: 66 }, { t: 'statue', x: 77 }] },

  { id: 'undercroft', name: 'Undercroft Well', area: '02', col: 15, row: 1, w: 1, h: 4, theme: 'crypt',
    doors: [{ side: 'N', col: 15 }],
    platforms: [{ x: 0.8, y: 4.4, w: 3.4, oneway: true }, { x: 6.0, y: 8.6, w: 3.0, oneway: true }, { x: 9.6, y: 13.0, w: 3.0, oneway: true }, { x: 4.4, y: 17.6, w: 3.0, oneway: true }, { x: 0.6, y: 22.0, w: 3.0, oneway: true }, { x: 4.6, y: 26.4, w: 2.8, oneway: true }],
    items: [{ x: 10.5, y: 0.5, pedestal: true, gem: 'sapphire' }, { x: 2.2, y: 22.0, base: 'silver_lance', rarity: 'normal', sockets: 2 }],
    enemies: [{ t: 'zombie', x: 6, rise: true }],
    props: [{ t: 'candles', x: 12 }, { t: 'torch', x: 1, y: 10 }, { t: 'torch', x: 12.3, y: 20 }] },

  { id: 'chapel', name: 'Collapsed Chapel', area: '02', col: 9, row: -9, w: 3, h: 3, theme: 'chapel',
    doors: [{ side: 'E', row: -8 }],
    platforms: [{ x: 26, y: 7.5, w: 7, oneway: true }, { x: 16, y: 10.3, w: 5, oneway: true }, { x: 7, y: 12.6, w: 6, oneway: true }, { x: 1, y: 15.3, w: 5, oneway: true }, { x: 32, y: 4.0, w: 4, oneway: true }],
    items: [{ x: 3.4, y: 15.3, pedestal: true, gem: 'ruby', altar: true }],
    enemies: [{ t: 'zombie', x: 10 }, { t: 'zombie', x: 20, rise: true }, { t: 'knight', x: 18, y: 10.3 }, { t: 'zombie', x: 30 }],
    breakables: [{ x: 5 }, { x: 35 }, { x: 9, y: 12.6 }],
    props: [{ t: 'window', x: 20, big: true }, { t: 'pews', x: 12 }, { t: 'pews', x: 26 }, { t: 'candles', x: 6 }, { t: 'candles', x: 36 }, { t: 'torch', x: 1, y: 6 }, { t: 'torch', x: 39, y: 10 }] },

  { id: 'greathall', name: 'Hall of the Oathbreaker', area: '02', col: 17, row: -7, w: 4, h: 3, theme: 'throne', boss: 'possessed',
    doors: [{ side: 'N', col: 18 }],
    platforms: [{ x: 3, y: 4.2, w: 6, oneway: true }, { x: 11, y: 8.2, w: 4, oneway: true }, { x: 4, y: 12.2, w: 5, oneway: true }, { x: 11.5, y: 16.2, w: 4, oneway: true }, { x: 17.5, y: 19.6, w: 5, oneway: true }, { x: 44, y: 4.2, w: 6, oneway: true }],
    enemies: [{ t: 'possessed', x: 34, boss: true }],
    props: [{ t: 'window', x: 14, big: true }, { t: 'window', x: 40, big: true }, { t: 'torch', x: 2, y: 4 }, { t: 'torch', x: 51, y: 4 }, { t: 'banner', x: 26.7 }, { t: 'throne', x: 48 }] },
];

export const roomById = Object.fromEntries(ROOMS.map(r => [r.id, r]));

// World-space bounds of a room (y up). Map rows grow downward, so a room spanning rows row..row+h-1 sits below y = -row*SH + SH.
export function bounds(r) {
  const x0 = r.col * SW, top = -r.row * SH + SH, y0 = top - r.h * SH;
  return { x0, x1: x0 + r.w * SW, y0, y1: top };
}
export function rowFloorY(row) { return -row * SH; }
