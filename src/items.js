// Itemization: Diablo 2-style bases, rarities, affixes and sockets, with gems that change what gear does.
// A gem's effect depends on what it sits in (weapon / armor / shield), like D2 gems; some gems grant whole abilities.

export const RARITY = { normal: 'normal', magic: 'magic', rare: 'rare', unique: 'unique' };

// Attack styles map to animation sets in player.js.
// Attack styles. Frame windows were measured from the weapon tip's speed (see detectSwings in attacks.js) and checked
// on the rig; grip: normal = blade up out of the thumb side, forward = along the forearm (thrusts). The Attack Viewer
// (viewer.html) can override any of these per weapon class.
export const STYLES = {
  slash1h: { anim: 'sword_and_shield_slash', from: 8, to: 30, hit: [16, 24], dur: 0.36, reach: 1.55, height: 1.5, yOff: 1.0 },
  slash2h: { anim: 'great_sword_slash', from: 32, to: 66, hit: [43, 57], dur: 0.62, reach: 2.0, height: 2.0, yOff: 1.0 },
  smash:   { anim: 'standing_melee_attack_downward', from: 36, to: 66, hit: [52, 60], dur: 0.55, reach: 1.5, height: 1.4, yOff: 0.7 },
  // maul: same overhead slam, slower with a longer recovery so the weight reads
  smash2h: { anim: 'standing_melee_attack_downward', from: 34, to: 80, hit: [52, 61], dur: 0.82, reach: 1.7, height: 1.5, yOff: 0.7 },
  // the horizontal axe chop twists the hero's back to the camera in side view; the overhead chop reads cleanly
  chop:    { anim: 'standing_melee_attack_downward', from: 38, to: 64, hit: [52, 59], dur: 0.46, reach: 1.6, height: 1.4, yOff: 0.75 },
  // 'stabbing' in the rig is an idle with a left-hand poke, not a thrust. Spears/lances: the boxing set's right-wrist drive
  // (frames 236-262, level at 246-257) with a forward grip pushes the point out level; its legs kick there, so it plays on the upper body
  // only. Fists: the boxing set's straight, arm fully out f170-180. Daggers: a quick slash.
  thrust:  { anim: 'fist_fight_a', from: 236, to: 262, hit: [246, 257], dur: 0.44, reach: 2.6, height: 0.8, yOff: 0.9, grip: 'forward', upperOnly: true },
  lance:   { anim: 'fist_fight_a', from: 234, to: 264, hit: [246, 258], dur: 0.58, reach: 3.2, height: 0.8, yOff: 0.9, grip: 'forward', upperOnly: true },
  stab:    { anim: 'sword_and_shield_slash', from: 10, to: 28, hit: [16, 23], dur: 0.26, reach: 1.1, height: 1.0, yOff: 1.1 },
  punch:   { anim: 'fist_fight_a', from: 160, to: 188, hit: [170, 180], dur: 0.32, reach: 0.9, height: 0.7, yOff: 1.25 },
};

// Weapon bases. model = BM weapons.json id; kind drives the grip in assets/game/weapons/grips.json.
export const BASES = {
  pilgrim_blade:  { name: 'Pilgrim\'s Blade', slot: 'weapon', model: 'iron_sword', kind: 'sword', hands: 1, style: 'slash1h', dmg: [7, 10], sockets: [1, 1], scale: 0.82, lvl: 1 },
  short_sword:    { name: 'Short Sword', slot: 'weapon', model: 'copper_sword', kind: 'sword', hands: 1, style: 'slash1h', dmg: [8, 12], sockets: [0, 2], scale: 0.8, lvl: 1 },
  falchion:       { name: 'Falchion', slot: 'weapon', model: 'falchion', kind: 'sword', hands: 1, style: 'slash1h', dmg: [10, 15], sockets: [0, 2], scale: 0.85, lvl: 3 },
  knight_sword:   { name: 'Velscour Longsword', slot: 'weapon', model: 'crossguard_sword', kind: 'sword', hands: 1, style: 'slash1h', dmg: [11, 16], sockets: [0, 3], scale: 0.9, lvl: 4 },
  bone_dagger:    { name: 'Bone Dagger', slot: 'weapon', model: 'bone_dagger', kind: 'dagger', hands: 1, style: 'stab', dmg: [5, 8], sockets: [0, 1], scale: 0.8, lvl: 1 },
  flanged_mace:   { name: 'Flanged Mace', slot: 'weapon', model: 'flanged_mace', kind: 'mace', hands: 1, style: 'smash', dmg: [11, 18], sockets: [0, 2], scale: 0.95, lvl: 2 },
  morning_star:   { name: 'Morning Star', slot: 'weapon', model: 'morning_star', kind: 'mace', hands: 1, style: 'smash', dmg: [13, 20], sockets: [0, 2], scale: 0.95, lvl: 4 },
  hatchet:        { name: 'Iron Hatchet', slot: 'weapon', model: 'iron_hatchet', kind: 'axe', hands: 1, style: 'chop', dmg: [9, 14], sockets: [0, 2], scale: 0.9, lvl: 2 },
  iron_greataxe:  { name: 'Iron Greataxe', slot: 'weapon', model: 'iron_greataxe', kind: 'great_axe', hands: 2, style: 'slash2h', dmg: [20, 31], sockets: [0, 4], scale: 1.0, lvl: 4 },
  iron_maul:      { name: 'Iron Maul', slot: 'weapon', model: 'great_studded_mace', kind: 'great_mace', hands: 2, style: 'smash2h', dmg: [22, 34], sockets: [0, 4], scale: 1.0, lvl: 5 },
  iron_spear:     { name: 'Iron Spear', slot: 'weapon', model: 'iron_spear', kind: 'spear', hands: 2, style: 'thrust', dmg: [14, 22], sockets: [0, 3], scale: 0.95, lvl: 2 },
  black_pike:     { name: 'Black Pike', slot: 'weapon', model: 'black_pike', kind: 'spear', hands: 2, style: 'thrust', dmg: [17, 26], sockets: [0, 3], scale: 1.0, lvl: 5 },
  silver_lance:   { name: 'Silver Lance', slot: 'weapon', model: 'silver_lance', kind: 'lance', hands: 2, style: 'lance', dmg: [24, 36], sockets: [0, 4], scale: 0.95, lvl: 5 },
  kite_shield:    { name: 'Kite Shield', slot: 'offhand', model: 'kite_greenwood', kind: 'kite', def: 6, block: 0.6, sockets: [0, 2], scale: 0.85, lvl: 1 },
  dawnstar_kite:  { name: 'Dawnstar Kite', slot: 'offhand', model: 'kite_dawnstar', kind: 'kite', def: 9, block: 0.7, sockets: [0, 3], scale: 0.85, lvl: 4 },
  leather_cap:    { name: 'Leather Cap', slot: 'head', def: 2, sockets: [0, 1], lvl: 1 },
  iron_helm:      { name: 'Iron Helm', slot: 'head', def: 5, sockets: [0, 2], lvl: 3 },
  padded_jerkin:  { name: 'Padded Jerkin', slot: 'body', def: 4, sockets: [0, 2], lvl: 1 },
  pilgrim_mail:   { name: 'Pilgrim Mail', slot: 'body', def: 9, sockets: [0, 3], lvl: 3 },
  wool_cloak:     { name: 'Wool Cloak', slot: 'cloak', def: 1, sockets: [0, 1], lvl: 1 },
  iron_ring:      { name: 'Iron Ring', slot: 'ring', sockets: [0, 0], lvl: 1 },
};

// Gems: one effect per host. elem = visible elemental attack on the weapon. ability = new power while socketed anywhere.
export const GEMS = {
  ruby:     { name: 'Ruby', color: 0xff3a2a, css: '#ff3a2a',
    weapon: { elem: 'fire', elemDmg: [4, 8], text: 'Adds 4-8 fire damage · burns Blackthorn' },
    armor: { res: { fire: 15 }, text: '+15% fire resistance' }, shield: { text: 'Blocking erupts in flame (6 dmg)', blockBurst: 'fire' } },
  sapphire: { name: 'Sapphire', color: 0x3aa0ff, css: '#3aa0ff',
    weapon: { elem: 'ice', elemDmg: [3, 6], text: 'Adds 3-6 cold damage · chills foes (slow)' },
    armor: { res: { ice: 15 }, text: '+15% cold resistance' }, shield: { text: 'Blocking chills attackers', blockBurst: 'ice' } },
  topaz:    { name: 'Topaz', color: 0xffd23a, css: '#ffd23a',
    weapon: { elem: 'lightning', elemDmg: [1, 12], text: 'Adds 1-12 lightning damage · arcs to a nearby foe' },
    armor: { mf: 15, text: '+15% better chance of magic items' }, shield: { text: 'Blocking discharges a spark', blockBurst: 'lightning' } },
  emerald:  { name: 'Emerald', color: 0x3aff6a, css: '#3aff6a',
    weapon: { elem: 'poison', elemDmg: [6, 6], text: 'Adds 6 poison damage over 2s' },
    armor: { dex: 3, text: '+3 Agility' }, shield: { text: '+10% poison resistance' } },
  skull:    { name: 'Chipped Skull', color: 0xe8e0d0, css: '#e8e0d0',
    weapon: { leech: 0.06, text: '6% of damage leeched as life' },
    armor: { regen: 1, text: 'Regenerate 1 life / 2s' }, shield: { text: '+5% life on block' } },
  onyx:     { name: 'Vesper Onyx', color: 0x8a3aff, css: '#b07aff', ability: 'shadeDash',
    weapon: { text: 'Grants SHADE DASH (Shift in mid-air) · +2 damage', flat: 2 },
    armor: { text: 'Grants SHADE DASH (Shift in mid-air)' }, shield: { text: 'Grants SHADE DASH (Shift in mid-air)' } },
};

const PREFIX = [
  { n: 'Jagged', t: 'weapon', s: { dmgPct: [10, 25] }, f: v => `+${v.dmgPct}% damage` },
  { n: 'Cruel', t: 'weapon', s: { dmgPct: [26, 50] }, lvl: 4, f: v => `+${v.dmgPct}% damage` },
  { n: 'Smoldering', t: 'weapon', s: { fire: [2, 5] }, f: v => `+${v.fire} fire damage`, elem: 'fire' },
  { n: 'Rimed', t: 'weapon', s: { ice: [2, 4] }, f: v => `+${v.ice} cold damage`, elem: 'ice' },
  { n: 'Sturdy', t: 'armor', s: { defPct: [10, 30] }, f: v => `+${v.defPct}% defense` },
  { n: 'Blessed', t: 'any', s: { hp: [5, 15] }, f: v => `+${v.hp} life` },
  { n: 'Sanguine', t: 'any', s: { mp: [4, 10] }, f: v => `+${v.mp} mana` },
];
const SUFFIX = [
  { n: 'of the Leech', t: 'weapon', s: { leechPct: [3, 6] }, f: v => `${v.leechPct}% life stolen per hit` },
  { n: 'of Quickness', t: 'weapon', s: { ias: [10, 20] }, f: v => `+${v.ias}% attack speed` },
  { n: 'of the Bear', t: 'any', s: { str: [1, 4] }, f: v => `+${v.str} Strength` },
  { n: 'of the Fox', t: 'any', s: { dex: [1, 4] }, f: v => `+${v.dex} Agility` },
  { n: 'of Warding', t: 'armor', s: { def: [2, 6] }, f: v => `+${v.def} defense` },
  { n: 'of Fortune', t: 'any', s: { gold: [10, 40] }, f: v => `+${v.gold}% gold found` },
  { n: 'of Thorns', t: 'armor', s: { thorns: [2, 5] }, f: v => `Attackers take ${v.thorns} damage` },
];
const RARE_A = ['Grim', 'Doom', 'Vesper', 'Ash', 'Bone', 'Wraith', 'Hollow', 'Thorn', 'Gloom', 'Raven'];
const RARE_B = ['Bite', 'Song', 'Mark', 'Edge', 'Ward', 'Shroud', 'Spike', 'Knell', 'Vigil', 'Fang'];

const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
let uid = 1;

export function makeItem(baseId, opts = {}) {
  const base = BASES[baseId];
  const it = { uid: uid++, base: baseId, rarity: opts.rarity || 'normal', affixes: [], gems: [], name: base.name };
  const [s0, s1] = base.sockets || [0, 0];
  it.sockets = opts.sockets ?? (it.rarity === 'normal' ? r(s0, s1) : it.rarity === 'magic' ? Math.min(s1, r(0, 2)) : Math.min(s1, r(0, 1)));
  const host = base.slot === 'weapon' ? 'weapon' : 'armor';
  const pool = l => l.filter(a => (a.t === 'any' || a.t === host) && (a.lvl || 0) <= (opts.lvl || 99));
  const roll = a => { const v = {}; for (const [k, [lo, hi]] of Object.entries(a.s)) v[k] = r(lo, hi); return { n: a.n, v, text: a.f(v), elem: a.elem }; };
  if (it.rarity === 'magic') {
    const p = Math.random() < 0.7 ? roll(pick(pool(PREFIX))) : null, s = Math.random() < 0.7 || !p ? roll(pick(pool(SUFFIX))) : null;
    if (p) it.affixes.push(p); if (s) it.affixes.push(s);
    it.name = [p?.n, base.name, s?.n].filter(Boolean).join(' ');
  } else if (it.rarity === 'rare') {
    const n = r(3, 4), used = new Set();
    for (let i = 0; i < n; i++) { const a = pick(pool(i % 2 ? SUFFIX : PREFIX)); if (used.has(a.n)) continue; used.add(a.n); it.affixes.push(roll(a)); }
    it.name = `${pick(RARE_A)} ${pick(RARE_B)}`;
  }
  if (opts.name) it.name = opts.name;
  return it;
}
export const UNIQUES = {
  gravesong: { base: 'black_pike', name: 'Gravesong', sockets: 2, affixes: [{ n: 'u', v: { dmgPct: 70 }, text: '+70% damage' }, { n: 'u', v: { fire: 6 }, text: '+6 fire damage', elem: 'fire' }, { n: 'u', v: { leechPct: 5 }, text: '5% life stolen per hit' }, { n: 'u', v: { str: 4 }, text: '+4 Strength' }] },
};
export function makeUnique(id) { const U = UNIQUES[id]; const it = makeItem(U.base, { rarity: 'unique', sockets: U.sockets }); it.affixes = U.affixes.map(a => ({ ...a })); it.name = U.name; return it; }
export function makeGem(gemId) { return { uid: uid++, gem: gemId, name: GEMS[gemId].name, rarity: 'gem' }; }

export function rollDrop(level, mf = 0) {
  const x = Math.random() * 100;
  if (x < 45) return null;
  if (x < 62) return { gold: r(5, 18) * level };
  if (x < 72) return { potion: true };
  if (x < 78) return makeGem(pick(['ruby', 'sapphire', 'topaz', 'emerald', 'skull']));
  const ids = Object.keys(BASES).filter(k => BASES[k].lvl <= level + 1 && k !== 'pilgrim_blade');
  const q = Math.random() * 100 - mf * 0.3;
  const rarity = q < 6 ? 'rare' : q < 30 ? 'magic' : 'normal';
  return makeItem(pick(ids), { rarity, lvl: level });
}
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

export function itemHost(it) { const s = BASES[it.base]?.slot; return s === 'weapon' ? 'weapon' : s === 'offhand' ? 'shield' : 'armor'; }

// Everything an item gives, flattened.
export function itemStats(it) {
  const base = BASES[it.base], o = { dmg: base.dmg ? [...base.dmg] : null, def: base.def || 0, block: base.block || 0, elems: [], abilities: [], lines: [] };
  let dmgPct = 0;
  for (const a of it.affixes) {
    for (const [k, v] of Object.entries(a.v)) {
      if (k === 'dmgPct') dmgPct += v; else if (k === 'fire' || k === 'ice') o.elems.push({ elem: k, dmg: [v, v] });
      else if (k === 'defPct') o.def = Math.round(o.def * (1 + v / 100)); else o[k] = (o[k] || 0) + v;
    }
    o.lines.push({ text: a.text, cls: 'aff' });
  }
  const host = itemHost(it);
  for (const g of it.gems) {
    const G = GEMS[g], e = G[host];
    if (e.elem) o.elems.push({ elem: e.elem, dmg: e.elemDmg });
    if (e.leech) o.leechPct = (o.leechPct || 0) + e.leech * 100;
    if (e.flat && o.dmg) { o.dmg[0] += e.flat; o.dmg[1] += e.flat; }
    if (e.res) for (const [k, v] of Object.entries(e.res)) o['res_' + k] = (o['res_' + k] || 0) + v;
    for (const k of ['mf', 'dex', 'regen']) if (e[k]) o[k] = (o[k] || 0) + e[k];
    if (e.blockBurst) o.blockBurst = e.blockBurst;
    if (G.ability) o.abilities.push(G.ability);
    o.lines.push({ text: `${G.name}: ${e.text}`, cls: 'gem', css: G.css });
  }
  if (o.dmg && dmgPct) o.dmg = o.dmg.map(d => Math.round(d * (1 + dmgPct / 100)));
  return o;
}

export const SLOTS = [
  { id: 'weapon', label: 'RIGHT HAND' }, { id: 'offhand', label: 'LEFT HAND' }, { id: 'head', label: 'HEAD' },
  { id: 'body', label: 'BODY' }, { id: 'cloak', label: 'CLOAK' }, { id: 'ring1', label: 'RING', accepts: 'ring' }, { id: 'ring2', label: 'RING', accepts: 'ring' },
];
