// Validates the castle: node tools/validate_rooms.mjs [--map] [--room <id>] [--area <file-stem>] [--quiet]
// Checks ids, grid overlaps, door reciprocity, catalog names, and — with a simplified jump model — that every door,
// bell, chest and item is reachable with the abilities the player can have by then (bells are collected in order).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOMS, roomById, bounds, rowFloorY, roomSolids, moverOffset, SW, SH, FLOOR, HOLE_W, BELLS, BELL_ORDER } from '../src/rooms.js';
import { THEME_NAMES, PROP_TYPES, BESTIARY } from '../src/catalog.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = n => args.includes('--' + n), opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const weapons = JSON.parse(fs.readFileSync(path.join(root, 'assets/game/weapons/weapons.json'), 'utf8'));
const swords = JSON.parse(fs.readFileSync(path.join(root, 'assets/game/items/swords.json'), 'utf8')).swords;
const ARMOR = ['leather_cap', 'iron_helm', 'great_helm', 'crown_helm', 'padded_jerkin', 'pilgrim_mail', 'knight_plate', 'royal_plate', 'wool_cloak', 'night_cloak', 'royal_mantle', 'iron_ring', 'silver_ring', 'gold_ring', 'signet_ring'];
const LEGACY = ['pilgrim_blade', 'short_sword', 'knight_sword', 'kite_shield', 'dawnstar_kite', 'iron_maul_2h'];
const UNIQUES = ['gravesong', 'vespertine', 'cinderfall', 'rimeheart', 'stormcall', 'thornkiss', 'kingsgrief', 'moonsickle', 'widowmaker', 'seraphwing', 'homeward', 'lionheart_aegis', 'worldtree', 'dragonspine', 'bonecrown', 'krakenmaw', 'redthirst', 'sunsplitter', 'hollowsun', 'lastlight', 'vespers_needle', 'pale_reaper', 'tidecaller', 'gravelantern', 'rimebound', 'huntsmans_signet'];
const GEMS = ['ruby', 'sapphire', 'topaz', 'emerald', 'skull', 'onyx', 'diamond', 'amethyst'];
const baseOk = id => !!weapons[id] || (swords[id] && swords[id].file) || ARMOR.includes(id) || LEGACY.includes(id);

const errors = [], warns = [];
const areaFilter = opt('area');
let fileRooms = null;
if (areaFilter) { const m = await import('../src/areas/' + areaFilter + '.js'); fileRooms = new Set(m.default.map(r => r.id)); }
const HAVE = (opt('have') || '').split(',').filter(Boolean); // --have slide,djump : abilities held on arrival (district testing)

const E = (r, m) => errors.push(`[${r}] ${m}`), W = (r, m) => warns.push(`[${r}] ${m}`);

// ------------------------------------------------------------------ static checks
const cells = new Map(), ids = new Set();
for (const r of ROOMS) {
  if (ids.has(r.id)) E(r.id, 'duplicate room id'); ids.add(r.id);
  for (const k of ['id', 'name', 'area', 'theme']) if (!r[k]) E(r.id, `missing ${k}`);
  for (const k of ['col', 'row', 'w', 'h']) if (!Number.isInteger(r[k])) E(r.id, `${k} must be an integer`);
  if (!THEME_NAMES.includes(r.theme)) E(r.id, `unknown theme "${r.theme}"`);
  for (let c = r.col; c < r.col + r.w; c++) for (let w = r.row; w < r.row + r.h; w++) { const k = c + ',' + w; if (cells.has(k)) E(r.id, `overlaps ${cells.get(k)} at cell ${k}`); cells.set(k, r.id); }
  const Wm = r.w * SW, Hm = r.h * SH;
  const inX = (o, what) => { if (o.x < 0 || o.x + (o.w || 0) > Wm + 0.01) E(r.id, `${what} x out of room (x=${o.x}, w=${o.w || 0}, room is ${Wm.toFixed(1)} m wide)`); };
  const inY = (o, what) => { if (o.y !== undefined && (o.y < 0 || o.y > Hm)) E(r.id, `${what} y out of room (y=${o.y}, room is ${Hm.toFixed(1)} m tall)`); };
  for (const k of ['platforms', 'blocks', 'cracks', 'spikes', 'lava', 'water', 'echo', 'movers', 'gates', 'enemies', 'chests', 'items', 'breakables', 'props', 'blades']) for (const o of r[k]) { inX(o, k); inY(o, k); }
  for (const e of r.enemies) if (!BESTIARY[e.t]) E(r.id, `unknown enemy "${e.t}"`);
  for (const p of r.props) if (!PROP_TYPES.includes(p.t)) E(r.id, `unknown prop "${p.t}"`);
  for (const c of [...r.chests, ...r.items]) {
    if (c.base && !baseOk(c.base)) E(r.id, `unknown item base "${c.base}"`);
    if (c.unique && !UNIQUES.includes(c.unique)) E(r.id, `unknown unique "${c.unique}"`);
    if (c.gem && !GEMS.includes(c.gem)) E(r.id, `unknown gem "${c.gem}"`);
    if (!c.base && !c.unique && !c.gem && !c.tier && !c.up && !c.gold && !c.potion) E(r.id, 'chest/item needs base, unique, gem, tier, up, gold or potion');
  }
  for (const g of r.gates) if (!['thorn', 'ghost', 'veil'].includes(g.kind)) E(r.id, `gate kind "${g.kind}"`);
  if (r.bell && !BELLS[r.bell.id]) E(r.id, `unknown bell "${r.bell.id}"`);
  for (const d of r.doors) {
    if (d.side === 'W' || d.side === 'E') { if (!(d.row >= r.row && d.row < r.row + r.h)) E(r.id, `door ${d.side} row ${d.row} outside rows ${r.row}..${r.row + r.h - 1}`); }
    else if (d.side === 'N' || d.side === 'S') { if (!(d.col >= r.col && d.col < r.col + r.w)) E(r.id, `door ${d.side} col ${d.col} outside cols ${r.col}..${r.col + r.w - 1}`); }
    else E(r.id, `bad door side ${d.side}`);
  }
}
const at = (c, w) => roomById[cells.get(c + ',' + w)];
function neighbour(r, d) {
  if (d.side === 'E') return [at(r.col + r.w, d.row), x => x.side === 'W' && x.row === d.row];
  if (d.side === 'W') return [at(r.col - 1, d.row), x => x.side === 'E' && x.row === d.row];
  if (d.side === 'S') return [at(d.col, r.row + r.h), x => x.side === 'N' && x.col === d.col];
  return [at(d.col, r.row - 1), x => x.side === 'S' && x.col === d.col];
}
for (const r of ROOMS) for (const d of r.doors) {
  const [n, m] = neighbour(r, d);
  if (!n) { if (!d.dead) (flag('strict') ? E : W)(r.id, `door ${d.side} ${d.row ?? d.col} leads nowhere (the neighbouring district is not built yet?)`); continue; }
  d._to = n.id; d._back = n.doors.findIndex(m);
  if (d._back < 0) E(r.id, `door ${d.side} ${d.row ?? d.col} → ${n.id} has no matching door back`);
}

// ------------------------------------------------------------------ reachability model
const G = 17.5, V = 9.85, WALK = 4.7;
const caps = ab => ({ rise: ab.has('djump') ? 4.2 : 2.4, v: ab.has('djump') ? Math.sqrt(2 * G * 4.5) : V, extra: ab.has('dash') ? 2.4 : 0 });
function solidsFor(r, ab, fire) {
  const out = [];
  for (const s of roomSolids(r)) {
    if (s.kind === 'crack') { if (s.ref?.need === 'fire' ? fire : (s.by !== 'dive' || ab.has('dive'))) continue; }
    if (s.kind === 'gate') { if ((s.gate === 'thorn' && fire) || (s.gate === 'ghost' && ab.has('dash')) || (s.gate === 'veil' && ab.has('echo'))) continue; }
    if (s.kind === 'echo' && !ab.has('echo')) continue;
    if (s.kind === 'mover') { const m = s.ref, per = m.period || 4; for (const f of m.orbit ? [0, 0.25, 0.5, 0.75] : [0, 0.25, 0.5]) { const o = moverOffset({ ...m, phase: 0 }, f * per); out.push({ ...s, x0: s.x0 + o.x, x1: s.x1 + o.x, y0: s.y0 + o.y, y1: s.y1 + o.y }); } continue; }
    out.push(s);
  }
  return out;
}
const inRect = (list, b, x, y) => list.some(q => x > b.x0 + q.x && x < b.x0 + q.x + q.w && y > b.y0 + q.y - 0.05 && y < b.y0 + q.y + q.h);
function nodesFor(r, ab, solids) {
  const b = bounds(r), nodes = [], hard = solids.filter(s => !s.oneway);
  const cut = (segs, a, c) => segs.flatMap(([p, q, t]) => (c <= p || a >= q) ? [[p, q, t]] : [[p, a, t], [c, q, t]].filter(([u, v]) => v - u > 0.05));
  for (const s of solids) {
    if (s.kind === 'ceil' || s.y1 > b.y1 + 0.2) continue;
    let segs = [[Math.max(s.x0, b.x0), Math.min(s.x1, b.x1), 'ok']];
    if (segs[0][1] - segs[0][0] < 0.3) continue;
    for (const h of hard) if (h !== s && h.y1 > s.y1 + 0.01 && h.y0 < s.y1 + 0.95) segs = cut(segs, h.x0 - 0.3, h.x1 + 0.3); // buried or no headroom at all
    for (const h of hard) if (h !== s && h.y0 >= s.y1 + 0.95 && h.y0 < s.y1 + 1.75) { // low ceiling: slide only
      const lo = []; for (const [p, q, t] of segs) { if (h.x1 <= p || h.x0 >= q) { lo.push([p, q, t]); continue; } if (h.x0 > p) lo.push([p, h.x0, t]); lo.push([Math.max(p, h.x0), Math.min(q, h.x1), 'low']); if (h.x1 < q) lo.push([h.x1, q, t]); }
      segs = lo.filter(([u, v]) => v - u > 0.05);
    }
    for (const [x0, x1, t] of segs) {
      // split by hazard zone
      const marks = new Set([x0, x1]);
      for (const z of [...r.lava, ...r.water]) for (const xx of [b.x0 + z.x, b.x0 + z.x + z.w]) if (xx > x0 && xx < x1) marks.add(xx);
      const ms = [...marks].sort((a, c) => a - c);
      for (let i = 0; i < ms.length - 1; i++) {
        const mx = (ms[i] + ms[i + 1]) / 2, y = s.y1;
        const n = { x0: ms[i], x1: ms[i + 1], y, s, low: t === 'low', lava: inRect(r.lava, b, mx, y + 0.1), water: inRect(r.water, b, mx, y + 0.1), oneway: !!s.oneway };
        n.ok = (!n.low || ab.has('slide')) && (!n.lava || ab.has('ember')) && (!n.water || ab.has('dive'));
        nodes.push(n);
      }
    }
  }
  for (const z of r.water) nodes.push({ x0: b.x0 + z.x, x1: b.x0 + z.x + z.w, y: b.y0 + z.y + z.h - 0.5, s: null, float: true, ok: true, oneway: true });
  return nodes;
}
function blocked(hard, xa, ya, xb, yb, apex, skip) {
  for (let i = 1; i < 12; i++) {
    const t = i / 12, x = xa + (xb - xa) * t, y = ya + (yb - ya) * t + 4 * apex * t * (1 - t);
    for (const h of hard) { if (skip.includes(h)) continue; if (x + 0.28 > h.x0 && x - 0.28 < h.x1 && y + 1.55 > h.y0 && y + 0.05 < h.y1) return true; }
  }
  return false;
}
function canJump(A, B, ab, hard) {
  if (A.low || B.low) return false;
  const c = caps(ab), dy = B.y - A.y;
  let xa, xb;
  if (!B.oneway && dy > 0.05 && B.s) { // climbing onto a solid: come around its side
    if (A.x0 < B.s.x0 - 0.35 && B.x0 <= B.s.x0 + 0.5) { xa = Math.min(A.x1, B.s.x0 - 0.4); xb = B.x0 + 0.3; }
    else if (A.x1 > B.s.x1 + 0.35 && B.x1 >= B.s.x1 - 0.5) { xa = Math.max(A.x0, B.s.x1 + 0.4); xb = B.x1 - 0.3; }
    else if (A.x1 < B.x0 || A.x0 > B.x1) { xa = A.x1 < B.x0 ? A.x1 : A.x0; xb = A.x1 < B.x0 ? B.x0 + 0.3 : B.x1 - 0.3; }
    else return false;
  } else if (A.x1 < B.x0) { xa = A.x1; xb = B.x0 + 0.3; }
  else if (A.x0 > B.x1) { xa = A.x0; xb = B.x1 - 0.3; }
  else { xa = xb = (Math.max(A.x0, B.x0) + Math.min(A.x1, B.x1)) / 2; }
  const dx = Math.abs(xb - xa);
  if (dy <= c.rise) {
    const disc = c.v * c.v - 2 * G * dy, T = (c.v + Math.sqrt(Math.max(0, disc))) / G;
    const reach = WALK * T * 0.8 + c.extra;
    if (dx <= reach) {
      const skip = [A.s, B.s].filter(Boolean);
      const lowApex = dy > 0 ? 0.45 : 0.8, hiApex = Math.max(lowApex, c.rise - Math.max(0, dy)); // bulge of the arc above the straight line
      if (!blocked(hard, xa, A.y, xb, B.y, lowApex, skip) || !blocked(hard, xa, A.y, xb, B.y, hiApex, skip)) return true;
      if (dy < -0.5 && dx < 0.6 && !blocked(hard, xa, A.y, xb, B.y, 0, skip)) return true; // straight drop
    }
  }
  if (ab.has('wallkick') && dy > 0) {
    for (const h of hard) for (const fx of [h.x0, h.x1]) {
      if (h.y0 > A.y + c.rise || h.y1 < B.y - 1.2) continue;
      const ga = Math.max(0, A.x0 - fx, fx - A.x1), gb = Math.max(0, B.x0 - fx, fx - B.x1);
      if (ga <= 4.5 && gb <= 3.5) return true;
    }
  }
  return false;
}
function buildGraph(r, ab, fire) {
  const solids = solidsFor(r, ab, fire), hard = solids.filter(s => !s.oneway), nodes = nodesFor(r, ab, solids).filter(n => n.ok), b = bounds(r);
  const adj = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) {
    if (i === j) continue; const A = nodes[i], B = nodes[j];
    if (Math.abs(A.y - B.y) < 0.06 && A.x1 >= B.x0 - 0.05 && A.x0 <= B.x1 + 0.05) { adj[i].push(j); continue; }
    if (canJump(A, B, ab, hard)) adj[i].push(j);
  }
  const find = (x, y, tol = 0.08) => nodes.findIndex(n => Math.abs(n.y - y) < tol && x >= n.x0 - 0.05 && x <= n.x1 + 0.05);
  const under = (x0, x1, yTop) => { let best = -1; nodes.forEach((n, i) => { if (n.x1 > x0 && n.x0 < x1 && n.y < yTop && (best < 0 || n.y > nodes[best].y)) best = i; }); return best; };
  const c = caps(ab);
  // door anchors: ins = nodes you stand on after arriving through the door; outs = nodes from which you can leave by it
  const doors = r.doors.map(d => {
    if (d.side === 'W' || d.side === 'E') { const i = find(d.side === 'W' ? b.x0 + 0.7 : b.x1 - 0.7, rowFloorY(d.row) + FLOOR); return { ins: i >= 0 ? [i] : [], outs: i >= 0 ? [i] : [] }; }
    const cx = d.col * SW + SW / 2, hx0 = cx - HOLE_W / 2, hx1 = cx + HOLE_W / 2;
    if (d.side === 'S') { const a = [find(hx0 - 0.2, b.y0 + FLOOR), find(hx1 + 0.2, b.y0 + FLOOR)].filter(i => i >= 0), plugged = solids.some(s => s.kind === 'crack' && s.x0 < hx1 && s.x1 > hx0 && s.y1 <= b.y0 + FLOOR + 0.05); return { ins: a, outs: plugged ? [] : a }; }
    const land = under(hx0 + 0.3, hx1 - 0.3, b.y1 - 0.4), outs = [];
    nodes.forEach((n, i) => { if (n.low) return; const gap = Math.max(0, n.x0 - hx1, hx0 - n.x1), dy = b.y1 + FLOOR - n.y; if (gap <= 1.6 && (dy <= c.rise || (ab.has('wallkick') && dy <= c.rise + 3.5))) outs.push(i); });
    return { ins: land >= 0 ? [land] : [], outs };
  });
  const spot = (x, y) => { let i = find(b.x0 + x, b.y0 + y, 0.7); if (i < 0) { let bd = 1e9; nodes.forEach((n, k) => { const gx = Math.max(0, n.x0 - (b.x0 + x), b.x0 + x - n.x1), d = gx + Math.abs(n.y - (b.y0 + y)); if (gx < 1.2 && Math.abs(n.y - (b.y0 + y)) < 2.3 && d < bd) { bd = d; i = k; } }); } return i; };
  return { nodes, adj, doors, spot };
}
function flood(g, starts) { const seen = new Set(starts), q = [...starts]; while (q.length) { const i = q.pop(); for (const j of g.adj[i]) if (!seen.has(j)) { seen.add(j); q.push(j); } } return seen; }

// ------------------------------------------------------------------ whole-castle progression
const startRoom = ROOMS.find(r => r.start);
const result = { order: [], firstAct: {}, reachRooms: new Set() };
if (!startRoom) E('castle', 'no room has a start');
else if (!errors.length) {
  const ab = new Set(HAVE); let fire = HAVE.length > 0, changed = true, guard = 0;
  const pickups = r => [...r.items.map((it, i) => ({ it, k: `item:${r.id}:${i}`, x: it.x, y: it.y ?? FLOOR })), ...r.chests.map((it, i) => ({ it, k: `chest:${r.id}:${i}`, x: it.x, y: it.y ?? FLOOR })), ...(r.bell ? [{ bell: r.bell.id, k: 'bell:' + r.id, x: r.bell.x, y: r.bell.y ?? FLOOR }] : [])];
  const got = new Set();
  while (changed && guard++ < 40) {
    changed = false;
    const graphs = {}, gr = r => graphs[r.id] ||= buildGraph(r, ab, fire);
    const reached = {}; // room id -> Set of node indexes
    const g0 = gr(startRoom), s0 = g0.spot(startRoom.start.x, startRoom.start.y);
    if (s0 < 0) { E(startRoom.id, 'start position is not on a surface'); break; }
    const queue = [[startRoom, [s0]]];
    // district testing: also walk in through every door of this file that leads to an unbuilt/other district
    if (fileRooms && HAVE.length) for (const r of ROOMS) if (fileRooms.has(r.id)) r.doors.forEach((d, di) => { if (!d._to || !fileRooms.has(d._to)) queue.push([r, gr(r).doors[di].ins]); });
    while (queue.length) {
      const [r, starts] = queue.pop(), g = gr(r), have = reached[r.id] ||= new Set();
      const fresh = starts.filter(i => !have.has(i)); if (!fresh.length) continue;
      for (const i of flood(g, fresh)) have.add(i);
      if (!(r.id in result.firstAct)) result.firstAct[r.id] = ab.size;
      r.doors.forEach((d, di) => { if (d._to && d._back >= 0 && g.doors[di].outs.some(i => have.has(i))) { const n = roomById[d._to], ng = gr(n); queue.push([n, ng.doors[d._back].ins]); if (!ng.doors[d._back].ins.length) W(n.id, `arriving by door ${n.doors[d._back].side} ${n.doors[d._back].row ?? n.doors[d._back].col} finds nowhere to stand (abilities: ${[...ab].join(',') || 'none'})`); } });
    }
    for (const id of Object.keys(reached)) {
      const r = roomById[id], g = gr(r);
      for (const p of pickups(r)) { if (got.has(p.k)) continue; const i = g.spot(p.x, p.y); if (i >= 0 && reached[id].has(i)) { got.add(p.k); if (p.bell && !ab.has(p.bell)) { ab.add(p.bell); result.order.push(p.bell); changed = true; } if (p.it?.gem === 'ruby' && !fire) { fire = true; changed = true; } } }
    }
    result.reached = reached; result.graphs = graphs; result.got = got; result.ab = new Set(ab);
  }
  // final report
  for (const r of ROOMS) {
    const have = result.reached?.[r.id];
    if (!have) { E(r.id, 'room is never reachable'); continue; }
    const g = result.graphs[r.id];
    r.doors.forEach((d, di) => { if (d._to && !g.doors[di].outs.some(i => have.has(i))) W(r.id, `door ${d.side} ${d.row ?? d.col} (to ${d._to}) can never be used from this side`); });
    for (const p of pickups(r)) if (!result.got.has(p.k)) E(r.id, `${p.bell ? 'bell ' + p.bell : p.k} at (${p.x}, ${p.y}) is never reachable`);
    for (const e of r.enemies) { const y = e.y ?? FLOOR; if (BESTIARY[e.t] && !['flyer'].includes(BESTIARY[e.t].ai) && !BESTIARY[e.t].fly && g.spot(e.x, y) < 0) W(r.id, `enemy ${e.t} at (${e.x}, ${y}) is not standing on anything`); }
    for (const k of ['save', 'warp', 'shop']) if (r[k] && g.spot(r[k].x, r[k].y ?? FLOOR) < 0) W(r.id, `${k} is not on a surface`);
    const tier = Math.max(0, ...r.enemies.map(e => BESTIARY[e.t]?.tier || 0)), act = result.firstAct[r.id] + 1;
    if (tier > act + 1) W(r.id, `enemy tier ${tier} in a room first reachable in act ${act}`);
  }
  const want = BELL_ORDER.filter(b => ROOMS.some(r => r.bell?.id === b));
  if (!fileRooms && !HAVE.length && result.order.join() !== want.join()) E('castle', `bell order is ${result.order.join(' > ') || '(none)'}; expected ${want.join(' > ')}`);
}

// ------------------------------------------------------------------ output
if (flag('map')) {
  let c0 = 1e9, c1 = -1e9, r0 = 1e9, r1 = -1e9; for (const r of ROOMS) { c0 = Math.min(c0, r.col); c1 = Math.max(c1, r.col + r.w - 1); r0 = Math.min(r0, r.row); r1 = Math.max(r1, r.row + r.h - 1); }
  const sym = {}; let n = 0; const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&*+=?!<>{}[]~^';
  for (let w = r0; w <= r1; w++) { let line = String(w).padStart(4) + ' '; for (let c = c0; c <= c1; c++) { const id = cells.get(c + ',' + w); line += id ? (sym[id] ||= chars[n++ % chars.length]) : '·'; } console.log(line); }
  console.log(Object.entries(sym).map(([id, s]) => `${s}=${id}`).join('  '));
}
const only = opt('room');
if (only && result.graphs?.[only]) {
  const g = result.graphs[only], have = result.reached[only] || new Set(), b = bounds(roomById[only]);
  console.log(`\nSurfaces in ${only} with ${[...result.ab].join(',') || 'no bells'} (room-local coords; * = reached):`);
  g.nodes.forEach((n, i) => console.log(`  ${have.has(i) ? '*' : ' '} x ${(n.x0 - b.x0).toFixed(1)}..${(n.x1 - b.x0).toFixed(1)}  y ${(n.y - b.y0).toFixed(2)} ${n.low ? 'LOW ' : ''}${n.lava ? 'LAVA ' : ''}${n.water ? 'WATER ' : ''}${n.float ? 'float ' : ''}${n.s?.kind || ''}`));
}
const show = l => l.filter(m => !fileRooms || fileRooms.has(m.slice(1, m.indexOf(']'))) || m.startsWith('[castle]'));
if (!flag('quiet')) for (const w of show(warns)) console.log('warn  ' + w);
for (const e of show(errors)) console.log('ERROR ' + e);
if (!errors.length && result.firstAct) {
  const acts = {}; for (const [id, a] of Object.entries(result.firstAct)) (acts[a + 1] ||= []).push(id);
  console.log(`\n${ROOMS.length} rooms, ${cells.size} map squares. Bells: ${result.order.join(' > ') || '(none)'}`);
  for (const a of Object.keys(acts)) console.log(`  act ${a}: ${acts[a].length} rooms${flag('acts') ? ' — ' + acts[a].join(', ') : ''}`);
}
console.log(`${show(errors).length} error(s), ${show(warns).length} warning(s)${areaFilter ? ' in ' + areaFilter : ''} (${errors.length}/${warns.length} castle-wide)`);
process.exit(show(errors).length ? 1 : 0);
