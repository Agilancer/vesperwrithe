// More monsters, easier ones (SotN): each room's ordinary foes bring company. A fodder foe (one swing) brings two more of
// its kind, a light or armoured one two (one on phones), a heavy foe comes alone. Great foes are never copied, boss
// arenas are left as built, and in a wider room the company keeps 9 m clear of a miniboss.
// The extras stand on the same floor or ledge as the foe they came with (never inside stone, over a hazard or within
// EDGE metres of the room's sides, where the doors are), and the layout is seeded by the room id, so a room fills out
// the same way on every visit. Phones (LOW_MEM) take fewer, and every room is capped (3x its foes, 15; phones 2x, 9).
import { FLOOR } from './rooms.js';
import { BESTIARY } from './catalog.js';

const FODDER = new Set(['walker', 'hopper']), HEAVY = new Set(['brute', 'lurker', 'worm']);
const OFFS = [2.4, -2.4, 3.6, -3.6, 4.8, -4.8, 6.2, -6.2], EDGE = 3.5, GAP = 1.8;

function rng(seed) { let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }

// how many more of this kind to bring
function company(T, lowMem) {
  if (T.boss || T.mini || HEAVY.has(T.ai) || T.h > 2.6) return 0;
  const fodder = FODDER.has(T.ai) && T.hp <= (7 + 2.9 * T.lvl); // dies to one blow of its level's weapon
  return fodder ? 2 : lowMem ? 1 : 2;
}

export function hordeSpecs(room, lowMem) {
  const def = room.def, b = room.b, base = def.enemies;
  const great = s => s.boss || s.mini || BESTIARY[s.t]?.boss || BESTIARY[s.t]?.mini, bigs = base.filter(great);
  if (def.boss || def.start || !base.length || base.some(s => s.illusion)) return []; // a great foe's arena, the first room, an illusion's room
  const cap = Math.min(lowMem ? 9 : 15, Math.ceil(base.length * (lowMem ? 2 : 3))), out = [], R = rng(def.id);
  const solid = room.solids.filter(s => !s.oneway && !s.mover && s.kind !== 'echo');
  const taken = base.map(s => ({ x: s.x, y: s.y ?? FLOOR }));
  const hazard = (lx, ly) => def.lava.some(l => lx > l.x - 0.6 && lx < l.x + l.w + 0.6 && ly + 0.3 > l.y && ly < l.y + l.h) || def.spikes.some(s => lx > s.x - 0.6 && lx < s.x + s.w + 0.6 && Math.abs(ly - s.y) < 0.8) || def.water.some(w => lx > w.x && lx < w.x + w.w && ly + 0.9 > w.y && ly < w.y + w.h);
  for (const spec of base) {
    const T = BESTIARY[spec.t]; if (!T || great(spec)) continue; // a named knight (boss: true on a common type) is never copied
    let want = company(T, lowMem); if (!want) continue;
    const y = spec.y ?? FLOOR, wy = b.y0 + y, fly = T.ai === 'flyer' || T.fly, hw = T.w / 2 + 0.15, hh = Math.min(T.h, 3);
    const offs = OFFS.slice().sort(() => R() - 0.5);
    for (const d of offs) {
      if (!want || base.length + out.length >= cap) break;
      const x = Math.round((spec.x + d) * 10) / 10, wx = b.x0 + x;
      if (x < EDGE || x > (b.x1 - b.x0) - EDGE) continue;
      if (taken.some(p => Math.abs(p.x - x) < GAP && Math.abs(p.y - y) < 1.5)) continue;
      if (!fly && !room.solids.some(s => !s.mover && s.kind !== 'echo' && s.kind !== 'gate' && Math.abs(s.y1 - wy) < 0.35 && wx > s.x0 + hw && wx < s.x1 - hw)) continue; // standing on the same floor
      if (solid.some(s => wx + hw > s.x0 && wx - hw < s.x1 && wy + hh > s.y0 + 0.05 && wy + 0.05 < s.y1)) continue; // not inside masonry
      if (hazard(x, y)) continue;
      if (bigs.some(g => Math.abs(g.x - x) < 9)) continue; // a miniboss in a wider room keeps its own ground
      const n = { ...spec, x, horde: true }; delete n.drop; delete n.name; delete n.tint;
      out.push(n); taken.push({ x, y }); want--;
    }
  }
  return out;
}
