// Castle Velscour, laid on a grid (1 square = 1 camera screen, 13.33 m x 7.5 m). Rows grow downward; row 0 is the
// Pilgrim Causeway line. Room contents use room-local metres: x from the room's left edge, y from its bottom edge
// (the floor's top surface is y = FLOOR). See docs/ROOM_SPEC.md for the full authoring format.
import west from './areas/west.js';
import waterworks from './areas/waterworks.js';
import towers from './areas/towers.js';
import gardens from './areas/gardens.js';
import depths from './areas/depths.js';
import heights from './areas/heights.js';
import { THEMES_OPEN } from './catalog.js';

export const SW = 13.333, SH = 7.5, FLOOR = 0.5;
export const DOOR_H = 3.8, HOLE_W = 3.2, GATE_W = 1.6, GATE_H = 4.3;

// The bells, in the order the castle is meant to give them up.
export const BELLS = {
  slide:    { name: 'Bell of the Low Hour', verb: 'SLIDE', color: 0xc8b070, how: 'Hold DOWN and press DASH to slide under low stone.' },
  djump:    { name: 'Vesper Bell', verb: 'DOUBLE JUMP', color: 0x9ab0ff, how: 'Press JUMP again in mid-air.' },
  dive:     { name: 'Drowned Bell', verb: 'DIVE', color: 0x4ac8d8, how: 'In the air, hold DOWN and press ATTACK to plunge. Shatters cracked floors; hold DOWN to sink in deep water.' },
  wallkick: { name: 'Briar Bell', verb: 'THORNSTEP', color: 0x7ad060, how: 'Press JUMP against a wall in mid-air to kick off it.' },
  ember:    { name: 'Cinder Bell', verb: 'EMBER WARD', color: 0xff7a30, how: 'Molten rock and furnace heat no longer harm you.' },
  echo:     { name: 'Bell of Echoes', verb: 'ECHO SIGHT', color: 0xb090ff, how: 'Hidden ledges answer the bell; false walls fall silent.' },
  dash:     { name: 'Tempest Bell', verb: 'SHADE DASH', color: 0xc070ff, how: 'Press DASH while moving or in the air to surge forward as a shade — through spirit gates and foes.' },
};
export const BELL_ORDER = ['slide', 'djump', 'dive', 'wallkick', 'ember', 'echo', 'dash'];

// ---- sugar: expand stairs etc. into plain lists. Returns a normalised copy of a room definition.
export function expand(def) {
  const r = { platforms: [], blocks: [], cracks: [], gates: [], spikes: [], lava: [], water: [], echo: [], movers: [], blades: [], enemies: [], chests: [], items: [], breakables: [], props: [], lore: [], ...def };
  r.blocks = [...r.blocks];
  for (const s of def.stairs || []) {
    // a solid staircase: `steps` courses climbing in direction dir (1 = rising to the right) from the near edge x at height y
    const dir = s.dir || 1, run = s.run || 1.0, rise = s.rise || 0.5, y0 = s.y ?? FLOOR, far = s.x + dir * s.steps * run;
    for (let i = 0; i < s.steps; i++) {
      const near = s.x + dir * i * run;
      r.blocks.push({ x: Math.min(near, far), y: y0 + i * rise, w: Math.abs(far - near), h: rise, stair: true, tex: s.tex });
    }
  }
  r.open = !!THEMES_OPEN[r.theme];
  return r;
}

export const ROOMS = [...west, ...waterworks, ...towers, ...gardens, ...depths, ...heights].map(expand);
export const roomById = Object.fromEntries(ROOMS.map(r => [r.id, r]));

// World-space bounds of a room (y up). A room spanning rows row..row+h-1 sits below y = -row*SH + SH.
export function bounds(r) {
  const x0 = r.col * SW, top = -r.row * SH + SH, y0 = top - r.h * SH;
  return { x0, x1: x0 + r.w * SW, y0, y1: top };
}
export function rowFloorY(row) { return -row * SH; }

// Collision rectangles of a room in world space, shared by the game and the validator.
// Each: { x0,y0,x1,y1, oneway?, kind?, ref? }. kinds: floor, ceil, wall, ledge, block, plat, crack, gate, echo, mover.
export function roomSolids(r) {
  const b = bounds(r), out = [], S = (x0, y0, x1, y1, extra) => { const s = { x0, y0, x1, y1, room: r.id, ...extra }; out.push(s); return s; };
  const spans = (s, e, gaps) => { let o = [[s, e]]; for (const [a, c] of gaps) o = o.flatMap(([p, q]) => (c <= p || a >= q) ? [[p, q]] : [[p, a], [c, q]].filter(([u, v]) => v - u > 0.01)); return o; };
  const side = sd => r.doors.filter(d => d.side === sd).map(d => [rowFloorY(d.row) + FLOOR, rowFloorY(d.row) + FLOOR + DOOR_H]);
  const vert = sd => r.doors.filter(d => d.side === sd).map(d => [d.col * SW + SW / 2 - HOLE_W / 2, d.col * SW + SW / 2 + HOLE_W / 2]);
  for (const [p, q] of spans(b.x0, b.x1, vert('S'))) S(p, b.y0 - 1.5, q, b.y0 + FLOOR, { kind: 'floor' });
  if (!r.open) for (const [p, q] of spans(b.x0, b.x1, vert('N'))) S(p, b.y1 - FLOOR, q, b.y1 + 1.5, { kind: 'ceil' });
  for (const sd of ['W', 'E']) {
    const x0 = sd === 'W' ? b.x0 - 0.6 : b.x1 - 0.5, x1 = sd === 'W' ? b.x0 + 0.5 : b.x1 + 0.6;
    for (const [p, q] of spans(b.y0, b.y1 + (r.open ? 30 : 1.5), side(sd))) S(x0, p, x1, q, { kind: 'wall', side: sd });
    for (const d of r.doors.filter(d => d.side === sd)) {
      const fy = rowFloorY(d.row);
      if (fy > b.y0 + 1 && !d.noledge) { const lx0 = sd === 'W' ? b.x0 : b.x1 - 3; S(lx0, fy - 0.6, lx0 + 3, fy + FLOOR, { kind: 'ledge', side: sd }); }
    }
  }
  for (const p of r.platforms) S(b.x0 + p.x, b.y0 + p.y - 0.45, b.x0 + p.x + p.w, b.y0 + p.y, { kind: 'plat', oneway: true, ref: p });
  for (const k of r.blocks) S(b.x0 + k.x, b.y0 + k.y, b.x0 + k.x + k.w, b.y0 + k.y + k.h, { kind: 'block', ref: k });
  for (const k of r.cracks) S(b.x0 + k.x, b.y0 + k.y, b.x0 + k.x + k.w, b.y0 + k.y + k.h, { kind: 'crack', by: k.by || 'hit', ref: k });
  for (const g of r.gates) { const y = b.y0 + (g.y ?? FLOOR); S(b.x0 + g.x - GATE_W / 2, y, b.x0 + g.x + GATE_W / 2, y + (g.h || GATE_H), { kind: 'gate', gate: g.kind, ref: g }); }
  for (const p of r.echo) S(b.x0 + p.x, b.y0 + p.y - 0.45, b.x0 + p.x + p.w, b.y0 + p.y, { kind: 'echo', oneway: true, ref: p });
  for (const m of r.movers) S(b.x0 + m.x, b.y0 + m.y - 0.45, b.x0 + m.x + m.w, b.y0 + m.y, { kind: 'mover', oneway: true, ref: m, bx: b.x0 + m.x, by: b.y0 + m.y, w: m.w });
  return out;
}

// Where a moving platform is at time t (metres offset from its rest position).
export function moverOffset(m, t) {
  const per = m.period || 4, ph = (t / per + (m.phase || 0)) * Math.PI * 2;
  if (m.orbit) return { x: Math.cos(ph) * m.orbit, y: Math.sin(ph) * m.orbit };
  const k = (1 - Math.cos(ph)) / 2; // ease in/out between the two ends
  return { x: (m.dx || 0) * k, y: (m.dy || 0) * k };
}
