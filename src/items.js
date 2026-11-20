// Itemization: Diablo 2-style bases, rarities, affixes and sockets, gems that change what gear does, and
// randomly rolled weapon "echoes" (special abilities). Every weapon model in the Bellmourn library is a base.
// Pure data + logic (no three.js) so tools can import it.

export const RARITY = { normal: 'normal', magic: 'magic', rare: 'rare', unique: 'unique' };

// Attack styles. Frame windows were measured from the weapon tip's speed (see detectSwings in attacks.js) and checked
// on the rig; grip: normal = blade up out of the thumb side, forward = along the forearm (thrusts). The Attack Viewer
// (viewer.html) can override any of these per weapon class.
export const STYLES = {
  slash1h: { anim: 'sword_and_shield_slash', from: 8, to: 30, hit: [16, 24], dur: 0.36, reach: 1.55, height: 1.5, yOff: 1.0 },
  slash2h: { anim: 'great_sword_slash', from: 32, to: 66, hit: [43, 57], dur: 0.62, reach: 2.0, height: 2.0, yOff: 1.0 },
  smash:   { anim: 'standing_melee_attack_downward', from: 36, to: 66, hit: [52, 60], dur: 0.55, reach: 1.5, height: 1.4, yOff: 0.7 },
  // maul: same overhead slam, slower with a longer recovery so the weight reads
  smash2h: { anim: 'standing_melee_attack_downward', from: 34, to: 80, hit: [52, 61], cancel: 64, dur: 0.82, reach: 1.7, height: 1.5, yOff: 0.7 },
  // the horizontal axe chop twists the hero's back to the camera in side view; the overhead chop reads cleanly
  chop:    { anim: 'standing_melee_attack_downward', from: 38, to: 64, hit: [52, 59], dur: 0.46, reach: 1.6, height: 1.4, yOff: 0.75 },
  // 'stabbing' in the rig is an idle with a left-hand poke, not a thrust. Spears/lances: the boxing set's right-wrist drive
  // (frames 236-262, level at 246-257) with a forward grip pushes the point out level; its legs kick there, so it plays on the upper body
  // only. Fists: the boxing set's straight, arm fully out f170-180. Daggers: a quick slash.
  thrust:  { anim: 'fist_fight_a', from: 236, to: 262, hit: [246, 257], dur: 0.44, reach: 2.6, height: 0.8, yOff: 0.9, grip: 'forward', upperOnly: true },
  lance:   { anim: 'fist_fight_a', from: 234, to: 264, hit: [246, 258], dur: 0.58, reach: 3.2, height: 0.8, yOff: 0.9, grip: 'forward', upperOnly: true },
  stab:    { anim: 'sword_and_shield_slash', from: 10, to: 28, hit: [16, 23], dur: 0.26, reach: 1.1, height: 1.0, yOff: 1.1 },
  punch:   { anim: 'fist_fight_a', from: 160, to: 188, hit: [170, 180], dur: 0.32, reach: 0.9, height: 0.7, yOff: 1.25 },
  // ranged classes: the missile leaves at the hit frame (bows loose arrows, boomerangs come back)
  shoot:   { anim: 'sword_and_shield_slash', from: 8, to: 30, hit: [18, 19], dur: 0.5, reach: 0.6, height: 0.6, yOff: 1.25, ranged: 'arrow', upperOnly: true },
  hurl:    { anim: 'sword_and_shield_slash', from: 8, to: 30, hit: [17, 18], dur: 0.42, reach: 0.6, height: 0.6, yOff: 1.2, ranged: 'boomerang', upperOnly: true },
};

// How each weapon class plays. mult scales the level's base damage; cls is the label shown in the pack.
const KINDS = {
  sword:       { slot: 'weapon', hands: 1, style: 'slash1h', mult: 1.0, sockets: 3, scale: 0.85, cls: 'Sword' },
  great_sword: { slot: 'weapon', hands: 2, style: 'slash2h', mult: 1.85, sockets: 4, scale: 1.0, cls: 'Greatsword' },
  axe:         { slot: 'weapon', hands: 1, style: 'chop', mult: 1.15, sockets: 2, scale: 0.9, cls: 'Axe' },
  great_axe:   { slot: 'weapon', hands: 2, style: 'slash2h', mult: 1.95, sockets: 4, scale: 1.0, cls: 'Greataxe' },
  mace:        { slot: 'weapon', hands: 1, style: 'smash', mult: 1.35, sockets: 2, scale: 0.95, cls: 'Mace' },
  great_mace:  { slot: 'weapon', hands: 2, style: 'smash2h', mult: 2.2, sockets: 4, scale: 1.0, cls: 'Maul' },
  spear:       { slot: 'weapon', hands: 2, style: 'thrust', mult: 1.45, sockets: 3, scale: 0.95, cls: 'Spear' },
  lance:       { slot: 'weapon', hands: 2, style: 'lance', mult: 2.0, sockets: 4, scale: 0.95, cls: 'Lance' },
  dagger:      { slot: 'weapon', hands: 1, style: 'stab', mult: 0.8, sockets: 1, scale: 0.85, cls: 'Dagger' },
  bow:         { slot: 'weapon', hands: 2, style: 'shoot', mult: 0.95, sockets: 3, scale: 0.85, cls: 'Bow' },
  boomerang:   { slot: 'weapon', hands: 1, style: 'hurl', mult: 0.8, sockets: 2, scale: 1.0, cls: 'Boomerang' },
  kite:        { slot: 'offhand', sockets: 3, scale: 0.85, cls: 'Kite Shield', block: 0.62 },
  tower:       { slot: 'offhand', sockets: 3, scale: 0.8, cls: 'Tower Shield', block: 0.78 },
};
export const MAX_ILVL = 30;
const dmgAt = (lvl, mult) => { const avg = (7 + lvl * 2.9) * mult; return [Math.max(1, Math.round(avg * 0.8)), Math.round(avg * 1.2)]; };

export const BASES = {
  // armour and trinkets have no models; icon = a Bellmourn wardrobe icon
  leather_cap:   { name: 'Leather Cap', slot: 'head', def: 2, sockets: [0, 1], lvl: 1, icon: 'ash_hood_head' },
  iron_helm:     { name: 'Iron Helm', slot: 'head', def: 6, sockets: [0, 2], lvl: 5, icon: 'knight_helm_head' },
  great_helm:    { name: 'Great Helm', slot: 'head', def: 13, sockets: [0, 2], lvl: 14, icon: 'night_hood_head' },
  crown_helm:    { name: 'Crowned Helm', slot: 'head', def: 22, sockets: [1, 3], lvl: 24, icon: 'crimson_pointed_head' },
  padded_jerkin: { name: 'Padded Jerkin', slot: 'body', def: 4, sockets: [0, 2], lvl: 1, icon: 'ash_jacket_chest' },
  pilgrim_mail:  { name: 'Pilgrim Mail', slot: 'body', def: 11, sockets: [0, 3], lvl: 6, icon: 'moss_coat_chest' },
  knight_plate:  { name: 'Knight\'s Plate', slot: 'body', def: 24, sockets: [0, 3], lvl: 15, icon: 'night_coat_chest' },
  royal_plate:   { name: 'Royal Plate', slot: 'body', def: 40, sockets: [1, 4], lvl: 25, icon: 'crimson_long_chest' },
  wool_cloak:    { name: 'Wool Cloak', slot: 'cloak', def: 1, sockets: [0, 1], lvl: 1, icon: 'ash_cowl_shoulders' },
  night_cloak:   { name: 'Night Cloak', slot: 'cloak', def: 5, sockets: [0, 2], lvl: 10, icon: 'night_mantle_shoulders' },
  royal_mantle:  { name: 'Royal Mantle', slot: 'cloak', def: 11, sockets: [1, 2], lvl: 22, icon: 'crimson_mantle_shoulders' },
  iron_ring:     { name: 'Iron Ring', slot: 'ring', sockets: [0, 0], lvl: 1, ring: true },
  silver_ring:   { name: 'Silver Ring', slot: 'ring', sockets: [0, 1], lvl: 8, ring: true },
  gold_ring:     { name: 'Gold Ring', slot: 'ring', sockets: [1, 1], lvl: 16, ring: true },
  signet_ring:   { name: 'Velscour Signet', slot: 'ring', sockets: [1, 2], lvl: 24, ring: true },
};
const ALIAS = { short_sword: 'copper_sword', knight_sword: 'crossguard_sword', kite_shield: 'kite_greenwood', dawnstar_kite: 'kite_dawnstar', iron_maul_2h: 'great_studded_mace' };

// Build weapon/shield bases from the Bellmourn catalogues. Called once after the JSON is fetched (or by tools).
export function initBases(weapons, swords = {}) {
  const groups = {};
  for (const w of Object.values(weapons)) (groups[w.kind] ||= []).push(w);
  for (const [id, s] of Object.entries(swords)) { if (s.hands === 3 || !s.file) continue; (groups[s.hands === 2 ? 'great_sword' : 'sword'] ||= []).push({ id, name: id.split('_').map(t => t[0].toUpperCase() + t.slice(1)).join(' '), tier: 2, extra: true }); }
  for (const [kind, list] of Object.entries(groups)) {
    const K = KINDS[kind]; if (!K) continue;
    list.sort((a, b) => (a.tier ?? 1) - (b.tier ?? 1)); // plain iron first, relic steel last
    list.forEach((w, i) => {
      const lvl = Math.max(1, Math.round(1 + (i / Math.max(1, list.length - 1)) * (MAX_ILVL - 2)));
      const b = { name: w.name, slot: K.slot, model: w.id, kind, cls: K.cls, hands: K.hands, style: K.style, sockets: [0, K.sockets], scale: K.scale, lvl };
      if (K.slot === 'weapon') b.dmg = dmgAt(lvl, K.mult);
      else { b.def = Math.round((kind === 'tower' ? 6 : 4) + lvl * (kind === 'tower' ? 1.25 : 0.95)); b.block = Math.min(0.92, K.block + lvl * 0.004); if (kind === 'tower') b.heavy = true; }
      BASES[w.id] = b;
    });
  }
  BASES.pilgrim_blade = { ...BASES.iron_sword, name: 'Pilgrim\'s Blade', dmg: [7, 10], sockets: [1, 1], lvl: 1, noDrop: true };
  for (const [a, t] of Object.entries(ALIAS)) if (BASES[t]) BASES[a] = { ...BASES[t], noDrop: true };
  return BASES;
}

// Gems: one effect per host. elem = visible elemental attack on the weapon.
export const GEMS = {
  ruby:     { name: 'Ruby', color: 0xff3a2a, css: '#ff3a2a',
    weapon: { elem: 'fire', elemDmg: [4, 8], text: 'Adds fire damage · burns Blackthorn' },
    armor: { res: { fire: 15 }, text: '+15% fire resistance' }, shield: { text: 'Blocking erupts in flame', blockBurst: 'fire' } },
  sapphire: { name: 'Sapphire', color: 0x3aa0ff, css: '#3aa0ff',
    weapon: { elem: 'ice', elemDmg: [3, 6], text: 'Adds cold damage · chills foes (slow)' },
    armor: { res: { ice: 15 }, text: '+15% cold resistance' }, shield: { text: 'Blocking chills attackers', blockBurst: 'ice' } },
  topaz:    { name: 'Topaz', color: 0xffd23a, css: '#ffd23a',
    weapon: { elem: 'lightning', elemDmg: [1, 12], text: 'Adds lightning damage · arcs to a nearby foe' },
    armor: { mf: 15, text: '+15% better chance of magic items' }, shield: { text: 'Blocking discharges a spark', blockBurst: 'lightning' } },
  emerald:  { name: 'Emerald', color: 0x3aff6a, css: '#3aff6a',
    weapon: { elem: 'poison', elemDmg: [6, 6], text: 'Adds poison damage over 2s' },
    armor: { dex: 3, text: '+3 Agility' }, shield: { res: { poison: 20 }, text: '+20% poison resistance' } },
  skull:    { name: 'Chipped Skull', color: 0xe8e0d0, css: '#e8e0d0',
    weapon: { leech: 0.06, text: '6% of damage leeched as life' },
    armor: { regen: 1, text: 'Regenerate life' }, shield: { regen: 1, text: 'Regenerate life' } },
  onyx:     { name: 'Vesper Onyx', color: 0x8a3aff, css: '#b07aff',
    weapon: { crit: 8, flat: 2, text: '+8% critical chance · +2 damage' },
    armor: { crit: 4, text: '+4% critical chance' }, shield: { crit: 4, text: '+4% critical chance' } },
  diamond:  { name: 'Diamond', color: 0xe8f4ff, css: '#e8f4ff',
    weapon: { dmgPct: 18, text: '+18% damage' },
    armor: { hp: 20, text: '+20 life' }, shield: { def: 6, text: '+6 defense' } },
  amethyst: { name: 'Amethyst', color: 0xc060ff, css: '#c060ff',
    weapon: { str: 4, text: '+4 Strength' },
    armor: { mp: 12, text: '+12 mana' }, shield: { mp: 8, text: '+8 mana' } },
};
export const DROP_GEMS = ['ruby', 'sapphire', 'topaz', 'emerald', 'skull', 'onyx', 'diamond', 'amethyst'];

// Weapon echoes: rolled at random on magic+ weapons. k = who can carry it (m = melee, r = ranged, a = any).
export const ECHOES = {
  crescent:  { k: 'm', name: 'Vesper Crescent', text: 'Every third swing looses a crescent of force' },
  twin:      { k: 'a', name: 'Twin Knell', text: 'Each hit strikes again as an echo (35%)' },
  chain:     { k: 'a', name: 'Stormcall', text: '25% chance: lightning leaps between three foes' },
  nova:      { k: 'a', name: 'Winter\'s Toll', text: 'Slain foes burst in a freezing nova' },
  ignite:    { k: 'a', name: 'Cinderbrand', text: 'Hits set foes ablaze' },
  vampire:   { k: 'a', name: 'Red Thirst', text: 'Kills restore 5% of your life' },
  execute:   { k: 'a', name: 'Headsman', text: 'Slays lesser foes below 18% life outright' },
  quake:     { k: 'm', name: 'Gravefall', text: 'Air attacks crack the ground where you land' },
  bats:      { k: 'a', name: 'Belfry Brood', text: 'Critical hits loose three hunting bats' },
  toll:      { k: 'a', name: 'Bellringer', text: 'Every eighth hit tolls a bell that stuns all foes' },
  briar:     { k: 'm', name: 'Briarbite', text: '30% chance: thorns erupt beneath the foe' },
  star:      { k: 'a', name: 'Falling Star', text: '15% chance to call down a star' },
  frenzy:    { k: 'm', name: 'Blood Frenzy', text: '+4% damage per consecutive hit (max +48%)' },
  harvest:   { k: 'a', name: 'Soul Harvest', text: 'Kills restore 4 mana and spill extra gold' },
  shade:     { k: 'm', name: 'Shade-Twin', text: 'Backdashing leaves a shade that repeats your strike' },
  long:      { k: 'm', name: 'Far-Reaching', text: '+35% reach' },
  sunder:    { k: 'm', name: 'Guardbreaker', text: 'Strikes ignore raised shields' },
  multishot: { k: 'r', name: 'Volley', text: 'Looses three missiles in a fan' },
  pierce:    { k: 'r', name: 'Piercing', text: 'Missiles pass through foes' },
  orbit:     { k: 'r', name: 'Circling', text: 'A spectral twin of the weapon orbits you' },
};

const PREFIX = [
  { n: 'Jagged', t: 'weapon', s: { dmgPct: [10, 25] }, f: v => `+${v.dmgPct}% damage` },
  { n: 'Cruel', t: 'weapon', s: { dmgPct: [26, 50] }, lvl: 6, f: v => `+${v.dmgPct}% damage` },
  { n: 'Merciless', t: 'weapon', s: { dmgPct: [51, 85] }, lvl: 16, f: v => `+${v.dmgPct}% damage` },
  { n: 'Smoldering', t: 'weapon', s: { fire: [2, 5] }, sc: 1, f: v => `+${v.fire} fire damage`, elem: 'fire' },
  { n: 'Rimed', t: 'weapon', s: { ice: [2, 4] }, sc: 1, f: v => `+${v.ice} cold damage`, elem: 'ice' },
  { n: 'Crackling', t: 'weapon', s: { lightning: [1, 6] }, sc: 1, lvl: 4, f: v => `+${v.lightning} lightning damage`, elem: 'lightning' },
  { n: 'Venomous', t: 'weapon', s: { poison: [3, 5] }, sc: 1, lvl: 4, f: v => `+${v.poison} poison damage`, elem: 'poison' },
  { n: 'Keen', t: 'weapon', s: { crit: [4, 10] }, f: v => `+${v.crit}% critical chance` },
  { n: 'Sturdy', t: 'armor', s: { defPct: [10, 30] }, f: v => `+${v.defPct}% defense` },
  { n: 'Adamant', t: 'armor', s: { defPct: [31, 60] }, lvl: 12, f: v => `+${v.defPct}% defense` },
  { n: 'Blessed', t: 'any', s: { hp: [5, 15] }, sc: 1, f: v => `+${v.hp} life` },
  { n: 'Sanguine', t: 'any', s: { mp: [4, 10] }, sc: 0.5, f: v => `+${v.mp} mana` },
  { n: 'Scholar\'s', t: 'any', s: { xpPct: [5, 12] }, lvl: 5, f: v => `+${v.xpPct}% experience` },
  { n: 'Warding', t: 'armor', s: { res_fire: [8, 20] }, lvl: 8, f: v => `+${v.res_fire}% fire resistance` },
  { n: 'Wintering', t: 'armor', s: { res_ice: [8, 20] }, lvl: 8, f: v => `+${v.res_ice}% cold resistance` },
  { n: 'Grounded', t: 'armor', s: { res_lightning: [8, 20] }, lvl: 12, f: v => `+${v.res_lightning}% lightning resistance` },
  { n: 'Antidotal', t: 'armor', s: { res_poison: [8, 20] }, lvl: 6, f: v => `+${v.res_poison}% poison resistance` },
];
const SUFFIX = [
  { n: 'of the Leech', t: 'weapon', s: { leechPct: [3, 6] }, f: v => `${v.leechPct}% life stolen per hit` },
  { n: 'of Quickness', t: 'weapon', s: { ias: [10, 20] }, f: v => `+${v.ias}% attack speed` },
  { n: 'of Alacrity', t: 'weapon', s: { ias: [21, 35] }, lvl: 12, f: v => `+${v.ias}% attack speed` },
  { n: 'of the Bear', t: 'any', s: { str: [1, 4] }, sc: 0.25, f: v => `+${v.str} Strength` },
  { n: 'of the Fox', t: 'any', s: { dex: [1, 4] }, sc: 0.25, f: v => `+${v.dex} Agility` },
  { n: 'of the Ox', t: 'any', s: { con: [1, 4] }, sc: 0.25, f: v => `+${v.con} Constitution` },
  { n: 'of the Owl', t: 'any', s: { int: [1, 4] }, sc: 0.25, f: v => `+${v.int} Intellect` },
  { n: 'of the Raven', t: 'any', s: { lck: [1, 4] }, sc: 0.25, f: v => `+${v.lck} Luck` },
  { n: 'of Warding', t: 'armor', s: { def: [2, 6] }, sc: 0.5, f: v => `+${v.def} defense` },
  { n: 'of Fortune', t: 'any', s: { gold: [10, 40] }, f: v => `+${v.gold}% gold found` },
  { n: 'of Seeking', t: 'any', s: { mf: [8, 25] }, lvl: 4, f: v => `+${v.mf}% better chance of magic items` },
  { n: 'of Thorns', t: 'armor', s: { thorns: [2, 5] }, sc: 1, f: v => `Attackers take ${v.thorns} damage` },
  { n: 'of Mending', t: 'armor', s: { regen: [1, 2] }, lvl: 6, f: v => `Regenerate ${v.regen} life / 2s` },
  { n: 'of Slaying', t: 'weapon', s: { critDmg: [20, 50] }, lvl: 8, f: v => `+${v.critDmg}% critical damage` },
];
const RARE_A = ['Grim', 'Doom', 'Vesper', 'Ash', 'Bone', 'Wraith', 'Hollow', 'Thorn', 'Gloom', 'Raven', 'Dusk', 'Knell', 'Sorrow', 'Cinder', 'Pale', 'Dread'];
const RARE_B = ['Bite', 'Song', 'Mark', 'Edge', 'Ward', 'Shroud', 'Spike', 'Knell', 'Vigil', 'Fang', 'Toll', 'Grasp', 'Oath', 'Weeper', 'Thirst', 'Requiem'];

const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
let uid = 1;
export const isRanged = b => !!STYLES[b?.style]?.ranged;

function rollEcho(base) { const k = isRanged(base) ? 'r' : 'm'; return pick(Object.keys(ECHOES).filter(e => ECHOES[e].k === 'a' || ECHOES[e].k === k)); }

export function makeItem(baseId, opts = {}) {
  const base = BASES[baseId]; if (!base) return makeItem('iron_sword', opts);
  const it = { uid: uid++, base: baseId, rarity: opts.rarity || 'normal', affixes: [], gems: [], name: base.name };
  const [s0, s1] = base.sockets || [0, 0];
  it.sockets = opts.sockets ?? (it.rarity === 'normal' ? r(s0, s1) : it.rarity === 'magic' ? Math.min(s1, r(0, 2)) : Math.min(s1, r(0, 1)));
  const host = base.slot === 'weapon' ? 'weapon' : 'armor', ilvl = opts.lvl ?? base.lvl;
  const pool = l => l.filter(a => (a.t === 'any' || a.t === host) && (a.lvl || 0) <= ilvl + 2);
  // flat stats (sc) grow with item level so late gear stays worth reading
  const roll = a => { const v = {}, m = a.sc ? 1 + ilvl * 0.12 * a.sc : 1; for (const [k, [lo, hi]] of Object.entries(a.s)) v[k] = Math.round(r(lo, hi) * m); return { n: a.n, v, text: a.f(v), elem: a.elem }; };
  if (it.rarity === 'magic') {
    const p = Math.random() < 0.7 ? roll(pick(pool(PREFIX))) : null, s = Math.random() < 0.7 || !p ? roll(pick(pool(SUFFIX))) : null;
    if (p) it.affixes.push(p); if (s) it.affixes.push(s);
    it.name = [p?.n, base.name, s?.n].filter(Boolean).join(' ');
  } else if (it.rarity === 'rare') {
    const n = r(3, 5), used = new Set();
    for (let i = 0; i < n; i++) { const a = pick(pool(i % 2 ? SUFFIX : PREFIX)); if (used.has(a.n)) continue; used.add(a.n); it.affixes.push(roll(a)); }
    it.name = `${pick(RARE_A)} ${pick(RARE_B)}`;
  }
  if (base.slot === 'weapon' && !opts.noEcho) { const ch = { normal: 0.1, magic: 0.5, rare: 1 }[it.rarity] ?? 0; if (opts.echo || Math.random() < ch) it.echo = opts.echo || rollEcho(base); }
  if (opts.name) it.name = opts.name;
  return it;
}

const U = (base, lvl, name, sockets, echo, ...aff) => ({ base, lvl, name, sockets, echo, affixes: aff.map(([v, text, elem]) => ({ n: 'u', v, text, elem })) });
export const UNIQUES = {
  gravesong:   U('black_pike', 5, 'Gravesong', 2, 'vampire', [{ dmgPct: 35 }, '+35% damage'], [{ fire: 6 }, '+6 fire damage', 'fire'], [{ leechPct: 5 }, '5% life stolen per hit'], [{ str: 4 }, '+4 Strength']),
  vespertine:  U('dusk_sword', 13, 'Vespertine', 3, 'crescent', [{ dmgPct: 70 }, '+70% damage'], [{ crit: 12 }, '+12% critical chance'], [{ ias: 20 }, '+20% attack speed'], [{ mp: 30 }, '+30 mana']),
  cinderfall:  U('inferno_greataxe', 20, 'Cinderfall', 3, 'star', [{ dmgPct: 50 }, '+50% damage'], [{ fire: 28 }, '+28 fire damage', 'fire'], [{ str: 10 }, '+10 Strength'], [{ res_fire: 30 }, '+30% fire resistance']),
  rimeheart:   U('glacier_maul', 30, 'Rimeheart', 3, 'nova', [{ dmgPct: 45 }, '+45% damage'], [{ ice: 14 }, '+14 cold damage', 'ice'], [{ con: 8 }, '+8 Constitution'], [{ hp: 60 }, '+60 life']),
  stormcall:   U('voidbolt_sword', 28, 'Stormcall', 3, 'chain', [{ dmgPct: 85 }, '+85% damage'], [{ lightning: 30 }, '+30 lightning damage', 'lightning'], [{ ias: 25 }, '+25% attack speed'], [{ crit: 10 }, '+10% critical chance']),
  thornkiss:   U('thornvine_sword', 17, 'Thornkiss', 2, 'briar', [{ dmgPct: 70 }, '+70% damage'], [{ poison: 16 }, '+16 poison damage', 'poison'], [{ leechPct: 6 }, '6% life stolen per hit'], [{ dex: 6 }, '+6 Agility']),
  kingsgrief:  U('wheel_greatsword', 29, 'King\'s Grief', 4, 'quake', [{ dmgPct: 60 }, '+60% damage'], [{ str: 14 }, '+14 Strength'], [{ critDmg: 60 }, '+60% critical damage'], [{ hp: 80 }, '+80 life']),
  moonsickle:  U('crescent_dagger', 20, 'Moonsickle', 1, 'twin', [{ dmgPct: 90 }, '+90% damage'], [{ ias: 30 }, '+30% attack speed'], [{ crit: 18 }, '+18% critical chance'], [{ lck: 8 }, '+8 Luck']),
  widowmaker:  U('nightshade_bow', 19, 'Widowmaker', 3, 'pierce', [{ dmgPct: 60 }, '+60% damage'], [{ poison: 14 }, '+14 poison damage', 'poison'], [{ crit: 15 }, '+15% critical chance'], [{ dex: 8 }, '+8 Agility']),
  seraphwing:  U('seraph_bow', 27, 'Seraphwing', 3, 'multishot', [{ dmgPct: 65 }, '+65% damage'], [{ fire: 16 }, '+16 fire damage', 'fire'], [{ ias: 25 }, '+25% attack speed'], [{ mp: 40 }, '+40 mana']),
  homeward:    U('gold_lion_boomerang', 20, 'Homeward', 2, 'orbit', [{ dmgPct: 70 }, '+70% damage'], [{ lightning: 14 }, '+14 lightning damage', 'lightning'], [{ gold: 60 }, '+60% gold found'], [{ lck: 8 }, '+8 Luck']),
  lionheart_aegis: U('kite_lionheart', 30, 'Lionheart Aegis', 3, null, [{ defPct: 80 }, '+80% defense'], [{ hp: 60 }, '+60 life'], [{ thorns: 20 }, 'Attackers take 20 damage'], [{ str: 6 }, '+6 Strength']),
  worldtree:   U('tower_world_tree', 17, 'Worldtree Bulwark', 3, null, [{ defPct: 100 }, '+100% defense'], [{ regen: 4 }, 'Regenerate 4 life / 2s'], [{ res_fire: 25 }, '+25% fire resistance'], [{ res_ice: 25 }, '+25% cold resistance']),
  dragonspine: U('dragon_lance', 25, 'Dragonspine', 4, 'ignite', [{ dmgPct: 50 }, '+50% damage'], [{ fire: 20 }, '+20 fire damage', 'fire'], [{ str: 10 }, '+10 Strength'], [{ critDmg: 40 }, '+40% critical damage']),
  bonecrown:   U('bonecrown_mace', 16, 'Bonecrown', 2, 'toll', [{ dmgPct: 60 }, '+60% damage'], [{ con: 8 }, '+8 Constitution'], [{ leechPct: 4 }, '4% life stolen per hit'], [{ xpPct: 15 }, '+15% experience']),
  krakenmaw:   U('kraken_mace', 14, 'Krakenmaw', 2, 'nova', [{ dmgPct: 55 }, '+55% damage'], [{ ice: 8 }, '+8 cold damage', 'ice'], [{ hp: 40 }, '+40 life'], [{ str: 5 }, '+5 Strength']),
  redthirst:   U('bloodletter', 26, 'The Red Thirst', 1, 'frenzy', [{ dmgPct: 90 }, '+90% damage'], [{ leechPct: 9 }, '9% life stolen per hit'], [{ ias: 30 }, '+30% attack speed'], [{ crit: 10 }, '+10% critical chance']),
  sunsplitter: U('solar_greataxe', 27, 'Sunsplitter', 4, 'star', [{ dmgPct: 55 }, '+55% damage'], [{ fire: 24 }, '+24 fire damage', 'fire'], [{ str: 12 }, '+12 Strength'], [{ crit: 10 }, '+10% critical chance']),
  hollowsun:   U('sunguard_sword', 30, 'Blade of the Hollow Sun', 3, 'crescent', [{ dmgPct: 90 }, '+90% damage'], [{ fire: 30 }, '+30 fire damage', 'fire'], [{ crit: 15 }, '+15% critical chance'], [{ str: 12 }, '+12 Strength'], [{ hp: 80 }, '+80 life']),
  lastlight:   U('radiant_lance', 30, 'Last Light', 4, 'sunder', [{ dmgPct: 60 }, '+60% damage'], [{ lightning: 30 }, '+30 lightning damage', 'lightning'], [{ critDmg: 80 }, '+80% critical damage'], [{ lck: 12 }, '+12 Luck']),
};
export function makeUnique(id) { const u = UNIQUES[id]; if (!u) return makeItem('iron_sword', { rarity: 'rare' }); const it = makeItem(u.base, { rarity: 'unique', sockets: u.sockets, noEcho: true }); it.affixes = u.affixes.map(a => ({ ...a })); it.name = u.name; if (u.echo) it.echo = u.echo; it.uniq = id; it.lvl = u.lvl; return it; }
// A unique is forged at its own level whatever common steel it is modelled on.
export const itemLevel = it => it.lvl || BASES[it.base]?.lvl || 1;
export const itemReq = it => Math.max(1, itemLevel(it) - 4);
export function makeGem(gemId) { return { uid: uid++, gem: gemId, name: GEMS[gemId].name, rarity: 'gem' }; }

// A random base suited to an item level (within a band below it), optionally of a slot.
export function randomBase(level, slot) {
  if (!slot) { const r = Math.random(); slot = r < 0.5 ? 'weapon' : r < 0.65 ? 'offhand' : r < 0.74 ? 'head' : r < 0.84 ? 'body' : r < 0.92 ? 'cloak' : 'ring'; }
  if (slot !== 'weapon' && slot !== 'offhand') { const a = Object.keys(BASES).filter(k => BASES[k].slot === slot && BASES[k].lvl <= level + 1); return a.length ? a[a.length - 1 - (Math.random() < 0.3 && a.length > 1 ? 1 : 0)] : 'iron_ring'; }
  const ids = Object.keys(BASES).filter(k => { const b = BASES[k]; return !b.noDrop && b.lvl <= level + 1 && b.lvl >= level - 7 && (!slot || b.slot === slot); });
  return ids.length ? pick(ids) : 'iron_sword';
}
export function tierItem(tier, rarity) { const lvl = Math.min(MAX_ILVL, Math.max(1, tier * 4 - 1)); return makeItem(randomBase(lvl), { rarity: rarity || (Math.random() < 0.35 ? 'rare' : 'magic'), lvl }); }

export function rollDrop(level, mf = 0) {
  const x = Math.random() * 100;
  if (x < 42) return null;
  if (x < 62) return { gold: r(4, 12) * Math.max(1, Math.round(level * 0.8)) };
  if (x < 71) return { potion: true };
  if (x < 77) return makeGem(pick(DROP_GEMS));
  const q = Math.random() * 100 - mf * 0.3;
  const rarity = q < 7 ? 'rare' : q < 34 ? 'magic' : 'normal';
  return makeItem(randomBase(Math.min(MAX_ILVL, level)), { rarity, lvl: level });
}

export function itemHost(it) { const s = BASES[it.base]?.slot; return s === 'weapon' ? 'weapon' : s === 'offhand' ? 'shield' : 'armor'; }
export const ELEMS = ['fire', 'ice', 'lightning', 'poison'];

// Everything an item gives, flattened.
export function itemStats(it) {
  const base = BASES[it.base], K = KINDS[base.kind], o = { dmg: base.dmg ? [...base.dmg] : null, def: base.def || 0, block: base.block || 0, elems: [], lines: [] };
  if (it.lvl && K) { if (base.dmg) o.dmg = dmgAt(it.lvl, K.mult); else if (base.def) o.def = Math.round((base.kind === 'tower' ? 6 : 4) + it.lvl * (base.kind === 'tower' ? 1.25 : 0.95)); }
  let dmgPct = 0, defPct = 0;
  const add = (k, v) => { o[k] = (o[k] || 0) + v; };
  for (const a of it.affixes) {
    for (const [k, v] of Object.entries(a.v)) {
      if (k === 'dmgPct') dmgPct += v; else if (ELEMS.includes(k)) o.elems.push({ elem: k, dmg: k === 'lightning' ? [1, v * 2] : [v, v] });
      else if (k === 'defPct') defPct += v; else add(k, v);
    }
    o.lines.push({ text: a.text, cls: 'aff' });
  }
  const host = itemHost(it);
  for (const g of it.gems) {
    const G = GEMS[g], e = G[host], sc = 1 + (it.lvl || base.lvl || 1) * 0.1; // gems bite harder in better steel
    if (e.elem) o.elems.push({ elem: e.elem, dmg: e.elemDmg.map(d => Math.round(d * sc)) });
    if (e.leech) add('leechPct', e.leech * 100);
    if (e.flat && o.dmg) { o.dmg[0] += e.flat; o.dmg[1] += e.flat; }
    if (e.dmgPct) dmgPct += e.dmgPct;
    if (e.res) for (const [k, v] of Object.entries(e.res)) add('res_' + k, v);
    for (const k of ['mf', 'dex', 'regen', 'crit', 'hp', 'mp', 'str', 'def']) if (e[k]) add(k, e[k]);
    if (e.blockBurst) o.blockBurst = e.blockBurst;
    o.lines.push({ text: `${G.name}: ${e.text}`, cls: 'gem', css: G.css });
  }
  if (o.dmg && dmgPct) o.dmg = o.dmg.map(d => Math.round(d * (1 + dmgPct / 100)));
  if (defPct) o.def = Math.round(o.def * (1 + defPct / 100));
  if (it.echo) { o.echo = it.echo; o.lines.push({ text: `${ECHOES[it.echo].name}: ${ECHOES[it.echo].text}`, cls: 'echo' }); }
  return o;
}

// What a shop charges / pays.
export function itemValue(it) {
  if (it.gem) return 120;
  const b = BASES[it.base], m = { normal: 1, magic: 2.5, rare: 6, unique: 20 }[it.rarity] || 1;
  return Math.round((20 + itemLevel(it) * 14) * m * (1 + it.sockets * 0.15) * (it.echo ? 1.5 : 1));
}

export const SLOTS = [
  { id: 'weapon', label: 'RIGHT HAND' }, { id: 'offhand', label: 'LEFT HAND' }, { id: 'head', label: 'HEAD' },
  { id: 'body', label: 'BODY' }, { id: 'cloak', label: 'CLOAK' }, { id: 'ring1', label: 'RING', accepts: 'ring' }, { id: 'ring2', label: 'RING', accepts: 'ring' },
];
