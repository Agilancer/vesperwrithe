// Pure data shared by the game and tools/validate_rooms.mjs: theme names, prop names and the bestiary.
// No three.js imports here.

// Themes whose rooms are open to the sky (no ceiling slab).
export const THEMES_OPEN = { outdoor: 1, courtyard: 1, garden: 1, rampart: 1 };
export const THEME_NAMES = ['frost', 'outdoor', 'hall', 'shaft', 'shrine', 'gallery', 'crypt', 'chapel', 'throne',
  'courtyard', 'vestibule', 'servants', 'aqueduct', 'cistern', 'ossuary', 'prison', 'portrait', 'library', 'garden', 'menagerie',
  'catacomb', 'royalcrypt', 'clock', 'mine', 'forge', 'magma', 'mirror', 'observatory', 'rampart', 'belfry', 'sanctum', 'hollow'];

export const PROP_TYPES = ['torch', 'lamp', 'banner', 'window', 'statue', 'candles', 'chain', 'pews', 'throne', 'gatearch', 'portcullis', 'windlass', 'dial', 'bellframe',
  'bookshelf', 'chandelier', 'sarcophagus', 'bones', 'skullwall', 'cage', 'gear', 'pendulum', 'barrel', 'crate', 'table', 'tapestry',
  'painting', 'mirror', 'tree', 'thornbush', 'fountain', 'grave', 'organ', 'bigbell', 'brazier', 'crystal', 'stalactite', 'pipe', 'web',
  'telescope', 'orrery', 'anvil', 'furnace', 'rubble', 'altar', 'arch', 'column', 'rug', 'gargoyle', 'coffin', 'ivy', 'waterfall', 'mushroom', 'hook', 'rosewindow', 'trophy', 'spears', 'frame', 'pelt'];

const M = 'assets/monsters/', TR = M + 'tripo/';
const tr = (...n) => n.map(x => TR + x + '.glb');
// Default clip names on the generated-monster rigs.
const A = (o = {}) => ({ idle: 'idle', walk: 'walk', run: 'run', attack: 'atk1', hit: 'hit', death: 'death', roar: 'roar', jump: 'jump', ...o });

// ---------------------------------------------------------------------------------------------- the power curve
// Every foe's life and damage are derived from the hero it is meant to meet, so the ratios hold in every act:
//   heroHit(L)  what one swing of an at-level one-hand sword does (weapon avg (7 + 2.9 L), Strength at two points a level, crits)
//   heroEHP(L)  the hero's life behind at-level armour (50 + con*4 + lvl*6, mitigation 100 / (100 + def))
// A regular foe carries `cls` and `hits`: life = hits x heroHit(level). fodder dies to 1-2 swings, common to 2-3, elite to 4-6.
// Its blow costs a share of heroEHP (fodder 13%, common 21%, elite 25%: 7-8 / 4-5 / 4 blows to fell a careless hero) and its
// touch less (7 / 9 / 11%). Minibosses and bosses carry `hits` too (30-40 and 65-81 swings) and keep their own dmg / touch / xp.
// A regular foe placed in a later room is raised to that room's level (roomLevel): a Shambler in act 6 is still 1-hit fodder there.
// XP: rooms now hold 1.5-2x as many (weaker) foes, so a kill pays xpBase(level) x class share / 1.75: the pace through an act is kept.
export const heroHit = L => (7 + 2.9 * L) * (1 + 0.04 * (L - 1)) * 1.03;
export const heroEHP = L => (82 + 14 * L) * (104 + 2.6 * L) / 100;
const xpBase = L => 12 + 0.7 * Math.pow(L, 2.05);
export const CLASS = { fodder: { atk: 0.13, touch: 0.07, xp: 0.8 }, common: { atk: 0.21, touch: 0.09, xp: 1.0 }, elite: { atk: 0.25, touch: 0.11, xp: 1.7 } };
export function statsAt(T, L) {
  const hp = Math.max(1, Math.round(T.hits * heroHit(L))); if (!T.cls) return { hp };
  const C = CLASS[T.cls], e = heroEHP(L);
  return { hp, dmg: Math.round(C.atk * e), touch: T.noTouch ? 0 : Math.round(C.touch * e), xp: Math.max(1, Math.round(xpBase(L) * C.xp * (T.hits < 1 ? 0.6 : 1) / 1.75)) };
}
// The level a room's regular foes are raised to: the act its district opens in (AREA_ACT, from the validator's act listing; a
// district that spans acts is listed by its earliest) or one act under the room's highest-tier regular foe, whichever is higher.
// (The validator forbids tiers more than one above a room's act, so this never overshoots the hero.)
export const ACT_LVL = [1, 1, 5, 9, 13, 17, 21, 25, 29];
export const AREA_ACT = { '01': 1, '02': 1, '07': 1, '03': 2, '05': 2, '06': 2, '09': 2, '10': 2, '11': 2, '12': 2, '15': 2, '13': 3, '14': 3, '23': 3, '24': 3,
  '18': 4, '22': 4, '26': 4, '34': 4, '19': 5, '21': 5, '25': 5, '28': 5, '39': 5, '29': 6, '30': 7, '31': 7, '35': 7, '38': 8, '40': 8 };
export function roomLevel(def) {
  if (def._lvl) return def._lvl; let tier = 0;
  for (const e of def.enemies || []) { const T = BESTIARY[e.t]; if (T && T.cls && T.tier > tier) tier = T.tier; }
  return (def._lvl = Math.max(ACT_LVL[AREA_ACT[def.area] || 1], ACT_LVL[Math.max(1, Math.min(8, tier - 1))]));
}

// ai: one behaviour per regular type (enemies.js BRAIN); `brute` is the Larder Ogre's and `boss` runs the move engine.
// windup = [a,b]: the fraction of the attack clip during which the blow lands (stretched in enemies.js so the wind-up is never under
// 0.38 s; 0.5 s for elites and great foes). tier: 1..8 = the act it belongs to. fly: it needs no floor (the validator skips it).
export const BESTIARY = {
  // ---------------------------------------------------------------- act 1
  zombie:   { name: 'Shambler', tier: 1, lvl: 1, ai: 'riser', cls: 'fodder', hits: 0.75, speed: 1, aggro: 9, atkDur: 1.1, files: [M + 'zombie/zombie_1.glb', M + 'zombie/zombie_3.glb', M + 'zombie/zombie_5.glb', M + 'zombie/zombie_2.glb', M + 'zombie/zombie_4.glb', M + 'zombie/zombie_6.glb'], h: 1.78, w: 0.7, reach: 1.1,
    anim: { idle: 'Zombie_Idle_Loop', walk: 'walk_shamble', attack: 'attack_rake', attack2: 'attack_bite', hit: 'Hit_Chest', death: 'Death01', rise: 'LayToIdle' }, windup: [0.32, 0.62]},
  child:    { name: 'Dead Child', tier: 1, lvl: 1, ai: 'flea', cls: 'fodder', hits: 0.75, speed: 2.6, aggro: 9, files: tr('zombie_boy_1', 'zombie_girl_1', 'zombie_boy_2', 'zombie_girl_2', 'zombie_boy_3'), h: 1.15, w: 0.5, reach: 0.9,
    anim: A({ attack: 'atk3', attack2: 'atk2', walk: 'run2' }), windup: [0.38, 0.62], atkDur: 1.0},
  thrall:   { name: 'Possessed Thrall', tier: 1, lvl: 2, ai: 'rusher', cls: 'fodder', hits: 1.5, speed: 3.6, aggro: 10, lunge: 6, files: tr('possessed_man_1', 'possessed_woman_1', 'possessed_man_2', 'possessed_woman_2'), h: 1.8, w: 0.7, reach: 1.2,
    anim: A({ attack: 'atk2', attack2: 'atk3' }), windup: [0.35, 0.6], atkDur: 1.0},
  goblin:   { name: 'Gutter Goblin', tier: 1, lvl: 2, ai: 'skirmisher', cls: 'fodder', hits: 1.5, speed: 3.4, aggro: 10, files: tr('goblin_green_1', 'goblin_green_2', 'goblin_green_3', 'goblin_red_1', 'goblin_red_2', 'goblin_red_3'), h: 1.25, w: 0.6, reach: 1.2,
    anim: A({ attack: 'atk4', attack2: 'atk3', walk: 'run' }), windup: [0.38, 0.62], atkDur: 1.0, arm: ['hatchet', 'bone_dagger', 'rust_axe', 'studded_mace', 'steel_dirk'] },
  kobold:   { name: 'Kobold Skulk', tier: 1, lvl: 2, ai: 'lobber', cls: 'fodder', hits: 1.3, speed: 2.6, aggro: 11, files: tr('kobold_1', 'kobold_3'), h: 1.35, w: 0.6, reach: 1.3,
    anim: A({ attack: 'atk3', attack2: 'atk4', walk: 'run' }), windup: [0.38, 0.62], atkDur: 1.0, arm: ['bone_dagger', 'horned_dagger'] },
  wizard:   { name: 'Hedge Warlock', tier: 1, lvl: 3, ai: 'turret', cls: 'common', hits: 2.2, speed: 0.8, aggro: 11, files: [M + 'zombie/evil_wizard.glb'], h: 1.8, w: 0.7, reach: 9,
    anim: { idle: 'idle', walk: 'walk', attack: 'bolt', attack2: 'lob', hit: 'hit', death: 'death' }, windup: [0.45, 0.5], atkDur: 1.2},
  knight:   { name: 'Velscour Knight', tier: 1, lvl: 3, ai: 'dueller', cls: 'common', hits: 2.6, speed: 2, aggro: 10, files: ['assets/armor/velscour_knight.glb'], h: 1.9, w: 0.75, reach: 1.7, sword: 'iron_sword', ual: true,
    anim: { idle: 'Sword_Idle', walk: 'Walk_Loop', attack: 'Sword_Regular_A', attack2: 'Sword_Regular_B', hit: 'Hit_Chest', death: 'Death01'}, windup: [0.38, 0.62], atkDur: 1.0},
  ogre:     { name: 'The Larder Ogre', tier: 1, lvl: 5, ai: 'brute', hits: 32, mini: true, files: [M + 'zombie/zombie_ogre.glb'], h: 3.0, w: 1.4, dmg: 36, touch: 10, speed: 1.3, reach: 2.2, xp: 150,
    anim: { idle: 'Zombie_Idle_Loop', walk: 'walk_stagger', run: 'run_charge', attack: 'attack_rake', attack2: 'attack_flurry', attack3: 'attack_pounce', hit: 'Hit_Chest', death: 'Death01' }, windup: [0.35, 0.65], atkDur: 1.4, aggro: 16, slam: true },
  werewolf: { name: 'Moonbitten Warden', tier: 1, lvl: 5, ai: 'boss', hits: 32, mini: true, files: [TR + 'werewolf_brown.glb'], h: 2.4, w: 1.0, dmg: 32, touch: 10, speed: 3.4, reach: 2.0, xp: 150,
    anim: A({ attack: 'atk1', attack2: 'atk3', attack3: 'atk5' }), windup: [0.35, 0.6], atkDur: 1.0, aggro: 18,
    moves: [{ k: 'melee', anim: 'atk1', w: 3, range: 2.6 }, { k: 'melee', anim: 'atk3', w: 2, range: 2.6, dur: 0.8 }, { k: 'leap', anim: 'jump', w: 3, min: 3, range: 9 }, { k: 'charge', anim: 'run', w: 2, min: 4, range: 12, speed: 10 }, { k: 'frenzy', anim: 'atk1', w: 3, range: 5.5, dur: 1.4 }] },
  caddoc:   { name: 'Oathbreaker Sir Caddoc', tier: 1, lvl: 6, ai: 'boss', hits: 66, boss: true, files: [TR + 'possessed_knight_1.glb'], h: 3.3, w: 1.3, dmg: 33, touch: 12, speed: 2.0, reach: 2.4, xp: 300,
    anim: A({ attack: 'atk1', attack2: 'atk2', attack3: 'atk3', bash: 'bash', block: 'block' }), windup: [0.4, 0.66], atkDur: 1.3, aggro: 30, bell: 'slide', title: 'OATHBREAKER VANQUISHED', arm: ['spiked_longsword'],
    moves: [{ k: 'melee', anim: 'atk1', w: 3, range: 2.9 }, { k: 'melee', anim: 'atk2', w: 2, range: 2.9 }, { k: 'ram', anim: 'bash', w: 3, min: 5, range: 30, speed: 9 }, { k: 'slam', anim: 'atk3', w: 3, range: 7, phase: 2 }, { k: 'leap', anim: 'jump', w: 2, min: 4, range: 10, phase: 2, below: 0.33 }, { k: 'fissure', anim: 'atk3', w: 3, range: 16, n: 8, dur: 1.6, phase: 2 }] }, // below = HP fraction (enemies.js): the leap waits for his last third

  // ---------------------------------------------------------------- act 2
  goblin_armored: { name: 'Goblin Reaver', tier: 2, lvl: 5, ai: 'bomber', cls: 'common', hits: 2.4, speed: 3, aggro: 11, files: tr('goblin_green_armored_1', 'goblin_green_armored_2', 'goblin_red_armored_1', 'goblin_red_armored_2'), h: 1.3, w: 0.6, reach: 1.3,
    anim: A({ attack: 'atk4', attack2: 'atk1', walk: 'run' }), windup: [0.38, 0.62], atkDur: 1.0, arm: ['spiked_axe', 'war_hammer', 'bearded_axe', 'flanged_mace'] },
  kobold_armored: { name: 'Kobold Trapper', tier: 2, lvl: 5, ai: 'sentry', cls: 'common', hits: 2.2, speed: 2.6, aggro: 9, reach: 1.5, files: tr('kobold_armored_1', 'kobold_armored_2', 'kobold_armored_3'), h: 1.4, w: 0.6,
    anim: A({ attack: 'atk3', attack2: 'atk5', walk: 'run' }), windup: [0.38, 0.62], atkDur: 1.0, arm: ['serpent_dagger', 'venom_dagger'] },
  spider:   { name: 'Crypt Weaver', tier: 2, lvl: 5, ai: 'dropper', cls: 'fodder', hits: 1.4, speed: 2.8, aggro: 9, files: [TR + 'spider_black.glb'], h: 1.3, w: 1.5, reach: 1.6, quad: true,
    anim: A({ attack: 'atk1', attack2: 'atk3' }), windup: [0.35, 0.6], atkDur: 0.9},
  harpy:    { noTouch: true, name: 'Carrion Harpy', tier: 2, lvl: 6, ai: 'sine', cls: 'common', hits: 2, speed: 3.6, aggro: 12, fly: true, files: tr('harpy_warrior'), h: 1.85, w: 0.9, reach: 1.5,
    anim: A({ idle: 'fly', walk: 'fly', run: 'fly2', attack: 'atk2', attack2: 'atk4' }), windup: [0.3, 0.65], atkDur: 1.0},
  vknight:  { name: 'Oathsworn Knight', tier: 2, lvl: 7, ai: 'shield', cls: 'elite', hits: 4.5, speed: 1.7, aggro: 10, files: tr('velscour_knight_1', 'velscour_knight_2', 'velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'), h: 2.05, w: 0.8, reach: 1.9, block: 0.4,
    anim: A({ attack: 'atk1', attack2: 'atk2', attack3: 'atk4', block: 'block', bash: 'bash' }), windup: [0.38, 0.62], atkDur: 1.05, arm: ['crossguard_sword', 'bluesteel_sword', 'spiked_longsword', 'lionguard_sword'], shield: ['kite_black_lion', 'kite_red_cross', 'kite_ironthorn'] },
  crab:     { name: 'The Sluice Maw', tier: 2, lvl: 8, ai: 'boss', hits: 32, mini: true, files: [M + 'crab_monster/crab_monster.glb'], h: 2.6, w: 3.0, dmg: 40, touch: 11, speed: 2.2, reach: 2.8, xp: 260, quad: true, armorFront: 0.6,
    anim: { idle: 'walk_stalk', walk: 'walk_skitter', run: 'run_scuttle', attack: 'attack_claw', attack2: 'attack_bite', attack3: 'attack_slam', jump: 'jump' }, windup: [0.4, 0.6], atkDur: 1.5, aggro: 20,
    moves: [{ k: 'melee', anim: 'attack_claw', w: 3, range: 3.4 }, { k: 'melee', anim: 'attack_bite', w: 2, range: 3.0 }, { k: 'slam', anim: 'attack_slam', w: 2, range: 7 }, { k: 'leap', anim: 'jump', w: 2, min: 4, range: 11 }, { k: 'charge', anim: 'run_gallop', w: 2, min: 5, range: 13, speed: 9 }, { k: 'shellspin', anim: 'idle', w: 3, min: 3, range: 20 }] },
  harpy_queen: { name: 'Sirelle, Queen of the Belfry Roost', tier: 2, lvl: 9, ai: 'boss', hits: 67, boss: true, fly: true, files: [TR + 'harpy_queen.glb'], h: 2.6, w: 1.3, dmg: 40, touch: 11, speed: 5, reach: 2.0, xp: 520,
    anim: A({ idle: 'fly', walk: 'fly', run: 'fly2', attack: 'atk2', attack2: 'atk4', attack3: 'atk5' }), windup: [0.35, 0.65], atkDur: 1.1, aggro: 30, bell: 'djump', title: 'THE ROOST FALLS SILENT',
    moves: [{ k: 'swoop', anim: 'atk2', w: 4 }, { k: 'volley', anim: 'atk4', w: 3, shot: 'feather', n: 5 }, { k: 'divebomb', anim: 'atk5', w: 3 }, { k: 'summon', anim: 'roar', w: 2, what: 'harpy', max: 2, phase: 2 }, { k: 'rain', anim: 'roar', w: 3, shot: 'feather', n: 12, phase: 2 }, { k: 'cyclone', anim: 'roar', w: 3, dur: 1.4, phase: 2 }] },

  // ---------------------------------------------------------------- act 3
  mannequin: { name: 'Haunted Mannequin', tier: 3, lvl: 9, ai: 'stalker', cls: 'common', hits: 2.6, speed: 4, aggro: 12, files: tr('mannequin_1', 'mannequin_2', 'mannequin_3'), h: 1.75, w: 0.7, reach: 1.3,
    anim: A({ attack: 'atk2', attack2: 'atk4', walk: 'run' }), windup: [0.3, 0.6], atkDur: 0.7},
  werebat:  { noTouch: true, name: 'Werebat', ai: 'bat', cls: 'fodder', hits: 0.75, speed: 4.2, aggro: 10, fly: true, tier: 1, lvl: 2, h: 1.7, w: 0.8, files: tr('werebat'), reach: 1.6,
    anim: A({ idle: 'fly', walk: 'fly', run: 'fly2', attack: 'atk1', attack2: 'atk3' }), windup: [0.3, 0.65], atkDur: 0.9},
  spider_red: { name: 'Bloodweaver', tier: 3, lvl: 10, ai: 'webber', cls: 'common', hits: 2.2, speed: 3.2, aggro: 10, files: [TR + 'spider_red.glb'], h: 1.4, w: 1.6, reach: 1.7, quad: true, venom: true,
    anim: A({ attack: 'atk2', attack2: 'atk4' }), windup: [0.35, 0.6], atkDur: 0.8},
  necromancer: { name: 'Gravebinder', tier: 3, lvl: 10, ai: 'summoner', cls: 'common', hits: 2.4, speed: 1.4, aggro: 12, files: tr('necromancer_2', 'necromancer_3'), h: 1.9, w: 0.7, reach: 10,
    anim: A({ attack: 'atk2', attack2: 'atk4' }), windup: [0.5, 0.55], atkDur: 1.3},
  zombie_necro: { name: 'Rotbound Acolyte', tier: 3, lvl: 10, ai: 'splitter', cls: 'common', hits: 2.4, speed: 1.2, aggro: 10, split: 'child', files: [M + 'zombie/zombie_necromancer.glb', M + 'zombie/necromancer.glb'], h: 1.8, w: 0.7, reach: 9,
    anim: { idle: 'idle', walk: 'walk', attack: 'lob', attack2: 'bolt', hit: 'hit', death: 'death' }, windup: [0.45, 0.5], atkDur: 1.3},
  lancer:   { name: 'Velscour Lancer', tier: 3, lvl: 11, ai: 'lancer', cls: 'elite', hits: 5, speed: 1.6, aggro: 12, files: tr('velscour_lancer', 'velscour_lancer_2', 'velscour_lancer_3'), h: 2.05, w: 0.8, reach: 2.8, block: 0.3,
    anim: A({ attack: 'atk1', attack2: 'atk3', block: 'block', bash: 'bash' }), windup: [0.4, 0.62], atkDur: 1.1, arm: ['silver_lance', 'blood_lance', 'shadow_lance'], shield: ['tower_lancer', 'tower_iron'] },
  hydra:    { name: 'The Drowned Hydra', tier: 3, lvl: 13, ai: 'boss', hits: 70, boss: true, files: [M + 'bone_hydra/bone_hydra.glb'], h: 4.4, w: 4.2, dmg: 54, touch: 14, speed: 1.6, reach: 4.2, xp: 1100, quad: true,
    anim: { idle: 'idle', walk: 'walk_lumber', run: 'run_charge', attack: 'attack_bite', hit: 'hurt', death: 'death', roar: 'taunt_roar', jump: 'jump' }, windup: [0.3, 0.45], atkDur: 1.6, aggro: 30, bell: 'dive', title: 'THE CISTERN STILLS',
    moves: [{ k: 'melee', anim: 'attack_bite', w: 2, range: 5 }, { k: 'multi', anim: 'attack_triple_bite', w: 3, range: 5.5, hits: [0.24, 0.43, 0.62], dur: 2.4 }, { k: 'melee', anim: 'attack_tail_sweep', w: 2, range: 6, low: true, dur: 2.0 }, { k: 'breath', anim: 'attack_fire_cone', w: 3, min: 3, range: 12, elem: 'poison', dur: 2.6 },
      { k: 'slam', anim: 'attack_stomp', w: 2, range: 8, dur: 2.0 }, { k: 'volley', anim: 'attack_fire_triple', w: 3, shot: 'acid', n: 3, min: 4, phase: 2, dur: 2.4 }, { k: 'sweep', anim: 'attack_fire_sweep', w: 3, elem: 'poison', phase: 2, dur: 3.0 }, { k: 'charge', anim: 'run_charge', w: 2, min: 6, range: 16, speed: 8, phase: 2 }, { k: 'geyser', anim: 'taunt_roar', w: 3, n: 3, dur: 3.2, phase: 2 }] },

  // ---------------------------------------------------------------- act 4
  goatman:  { name: 'Goat-Headed Reveller', tier: 4, lvl: 13, ai: 'axer', cls: 'common', hits: 2.8, speed: 1.6, aggro: 11, files: tr('goatman_bw', 'goatman_white', 'goatman_black', 'goatman_gold_bad', 'goatman_gold_good'), h: 2.2, w: 0.9, reach: 1.9,
    anim: A({ attack: 'atk1', attack2: 'atk3' }), windup: [0.38, 0.62], atkDur: 1.0, arm: ['horned_axe', 'deathskull_axe', 'voidmoon_axe', 'skull_mace'] },
  harpy_undead: { name: 'Rotwing Harpy', tier: 4, lvl: 13, ai: 'strafer', cls: 'common', hits: 2, speed: 4.2, aggro: 12, fly: true, files: tr('harpy_undead_1', 'harpy_undead_2'), h: 1.8, w: 0.9, reach: 1.5,
    anim: A({ idle: 'fly', walk: 'fly', run: 'fly2', attack: 'atk2', attack2: 'atk4' }), windup: [0.3, 0.65], atkDur: 1.0},
  plague_knight: { name: 'Plague Knight', tier: 4, lvl: 14, ai: 'spinner', cls: 'elite', hits: 5, speed: 1.8, aggro: 10, files: tr('plague_knight_black', 'plague_knight_red'), h: 1.95, w: 0.8, reach: 1.9, venom: true,
    anim: A({ attack: 'atk2', attack2: 'atk3', attack3: 'atk5', bash: 'bash' }), windup: [0.38, 0.62], atkDur: 1.0, arm: ['bloodspike_mace', 'thornvine_mace', 'greeneye_mace'] },
  flesh_spider: { name: 'The Nameless Brood-Mother', tier: 4, lvl: 15, ai: 'boss', hits: 35, mini: true, files: [M + 'new_creatures/flesh_spider_demon.glb'], h: 3.2, w: 3.6, dmg: 58, touch: 14, speed: 2.6, reach: 3.4, xp: 800, quad: true,
    anim: { idle: 'idle', walk: 'walk', run: 'run', attack: 'attack_bite', hit: 'hit', death: 'death' }, windup: [0.4, 0.6], atkDur: 1.3, aggro: 22,
    moves: [{ k: 'melee', anim: 'attack_bite', w: 3, range: 4 }, { k: 'slam', anim: 'attack_slam', w: 2, range: 8 }, { k: 'leap', anim: 'attack_lunge', w: 3, min: 4, range: 12 }, { k: 'summon', anim: 'idle', w: 2, what: 'spider', max: 3, dur: 1.2 }, { k: 'volley', anim: 'attack_bite', w: 2, shot: 'web', n: 3, min: 4 }, { k: 'webnet', anim: 'attack_bite', w: 3, min: 3, range: 14, dur: 1.2 }] },
  dragon_green: { name: 'Viridian Wyrm of the Menagerie', tier: 4, lvl: 16, ai: 'boss', hits: 35, mini: true, dragon: true, files: [TR + 'dragon_green.glb'], h: 4.5, w: 4.5, dmg: 61, touch: 14, speed: 2.4, reach: 5, xp: 1000, quad: true,
    anim: { idle: 'idle', walk: 'walk', run: 'run', attack: 'bite', hit: 'hit', death: 'death', roar: 'roar' }, windup: [0.35, 0.5], atkDur: 1.8, aggro: 26,
    moves: [{ k: 'melee', anim: 'bite', w: 3, range: 5.5, dur: 1.7 }, { k: 'melee', anim: 'claw_r', w: 2, range: 5, dur: 1.8 }, { k: 'melee', anim: 'tail_whip', w: 2, range: 6.5, low: true, dur: 2.2 }, { k: 'breath', anim: 'breath', w: 3, min: 3, range: 13, elem: 'poison', dur: 3.2 }, { k: 'volley', anim: 'spit', w: 2, shot: 'acid', n: 3, min: 5, dur: 1.6 }, { k: 'miasma', anim: 'spit', w: 3, n: 3, dur: 2.2 }] },
  gravehart: { name: 'Gravehart, the Antlered Grief', tier: 4, lvl: 17, ai: 'boss', hits: 72, boss: true, files: [M + 'gravehart/gravehart.glb'], h: 3.6, w: 3.6, dmg: 65, touch: 16, speed: 2.4, reach: 3.6, xp: 1700, quad: true,
    anim: { idle: 'idle', walk: 'walk_prowl', run: 'run_gallop', attack: 'attack_bite', death: 'death', roar: 'taunt_bellow', jump: 'jump' }, windup: [0.25, 0.42], atkDur: 1.6, aggro: 30, bell: 'wallkick', title: 'THE GARDEN EXHALES',
    moves: [{ k: 'melee', anim: 'attack_bite', w: 2, range: 4.2 }, { k: 'melee', anim: 'attack_swipe', w: 2, range: 4.4, windup: [0.44, 0.68], dur: 1.9 }, { k: 'leap', anim: 'attack_pounce', w: 3, min: 4, range: 12, dur: 2.0 }, { k: 'ram', anim: 'attack_antler_charge', w: 4, min: 5, range: 30, speed: 13, dur: 2.6 },
      { k: 'roots', anim: 'taunt_thrash', w: 3, n: 4, phase: 2, dur: 2.0 }, { k: 'summon', anim: 'taunt_bellow', w: 1, what: 'spider', max: 2, phase: 2, dur: 2.0 }, { k: 'hunt', anim: 'run_gallop', w: 3, n: 2, dur: 6, phase: 2 }] },

  // ---------------------------------------------------------------- act 5
  worm:     { name: 'Obsidian Borer', tier: 5, lvl: 17, ai: 'worm', cls: 'common', hits: 3, aggro: 11, files: tr('worm_1', 'worm_2'), h: 4.0, w: 1.6, speed: 3, reach: 3.2,
    anim: A({ attack: 'atk1', attack2: 'atk3', burrow: 'burrow', emerge: 'emerge', breath: 'breath' }), windup: [0.35, 0.6], atkDur: 1.2},
  dragonling: { name: 'Ashscale Whelp', tier: 5, lvl: 17, ai: 'breather', cls: 'common', hits: 2.5, speed: 2.4, aggro: 10, files: tr('dragonling_black'), h: 1.6, w: 0.9, reach: 1.6, elem: 'fire',
    anim: A({ attack: 'atk2', attack2: 'atk4', breath: 'breath' }), windup: [0.35, 0.6], atkDur: 0.9},
  pknight:  { name: 'Possessed Knight', tier: 5, lvl: 18, ai: 'plunger', cls: 'elite', hits: 5, speed: 2, aggro: 11, files: tr('possessed_knight_2', 'possessed_knight_3'), h: 2.15, w: 0.85, reach: 2.1,
    anim: A({ attack: 'atk1', attack2: 'atk2', attack3: 'atk3', bash: 'bash' }), windup: [0.4, 0.64], atkDur: 1.1, arm: ['voidbolt_sword', 'bloodfire_sword', 'dusk_sword'], lunge: 7 },
  plague_giant: { name: 'Plague Giant', tier: 5, lvl: 19, ai: 'giant', cls: 'elite', hits: 5.5, speed: 1.4, aggro: 11, files: tr('plague_giant_1', 'plague_giant_2'), h: 3.2, w: 1.5, reach: 2.6,
    anim: A({ attack: 'atk1', attack2: 'atk3', attack3: 'atk5' }), windup: [0.4, 0.65], atkDur: 1.5},
  bone_golem: { name: 'The Ossein Colossus', tier: 5, lvl: 20, ai: 'boss', hits: 36, mini: true, files: [TR + 'bone_golem.glb'], h: 3.8, w: 1.9, dmg: 83, touch: 18, speed: 1.6, reach: 3.0, xp: 1500,
    anim: A({ attack: 'atk1', attack2: 'atk2' }), windup: [0.4, 0.62], atkDur: 1.5, aggro: 22, arm: ['great_studded_mace'],
    moves: [{ k: 'melee', anim: 'atk1', w: 3, range: 3.6 }, { k: 'melee', anim: 'atk2', w: 2, range: 3.6 }, { k: 'slam', anim: 'atk3', w: 3, range: 9 }, { k: 'volley', anim: 'atk5', w: 2, shot: 'bone', n: 5, min: 4 }, { k: 'leap', anim: 'jump', w: 2, min: 5, range: 12 }, { k: 'ossuary', anim: 'atk3', w: 3, range: 12, n: 6 }] },
  cinder_giant: { name: 'Brannoch, the Cinder Warden', tier: 5, lvl: 21, ai: 'boss', hits: 75, boss: true, files: [TR + 'plague_giant_armored.glb'], h: 4.2, w: 2.0, dmg: 90, touch: 19, speed: 1.9, reach: 3.4, xp: 2600, elem: 'fire',
    anim: A({ attack: 'atk1', attack2: 'atk2', attack3: 'atk4' }), windup: [0.4, 0.64], atkDur: 1.5, aggro: 30, bell: 'ember', title: 'THE FORGE GOES COLD', arm: ['hellfire_maul'],
    moves: [{ k: 'melee', anim: 'atk1', w: 3, range: 4 }, { k: 'melee', anim: 'atk2', w: 2, range: 4 }, { k: 'slam', anim: 'atk4', w: 3, range: 10, elem: 'fire' }, { k: 'pillars', anim: 'roar', w: 3, n: 5, elem: 'fire', dur: 2.2 }, { k: 'charge', anim: 'run', w: 2, min: 6, range: 16, speed: 8 },
      { k: 'rain', anim: 'roar', w: 3, shot: 'ember', n: 10, phase: 2, dur: 2.4 }, { k: 'leap', anim: 'jump', w: 3, min: 4, range: 13, phase: 2, slamOnLand: true }, { k: 'forgefall', anim: 'atk4', w: 3, range: 14, n: 8 }] },

  // ---------------------------------------------------------------- act 6
  dragonling_undead: { name: 'Bonewhelp', tier: 6, lvl: 21, ai: 'revenant', cls: 'common', hits: 1.8, speed: 2.4, aggro: 10, revive: true, files: tr('dragonling_undead'), h: 1.6, w: 0.9, reach: 1.6, elem: 'ice',
    anim: A({ attack: 'atk2', attack2: 'atk4', breath: 'breath' }), windup: [0.35, 0.6], atkDur: 0.9},
  witch:    { name: 'Vesper Witch', tier: 6, lvl: 22, ai: 'blinker', cls: 'common', hits: 2.3, aggro: 12, files: tr('necromancer_f1', 'necromancer_f2'), h: 1.8, w: 0.7, speed: 1.6, reach: 11,
    anim: A({ attack: 'atk2', attack2: 'atk5' }), windup: [0.5, 0.55], atkDur: 1.2},
  night_demon: { name: 'Night Paralysis Demon', tier: 6, lvl: 22, ai: 'lurker', cls: 'elite', hits: 4.5, speed: 3, aggro: 12, files: tr('night_demon_black', 'night_demon_blue', 'night_demon_red'), h: 2.6, w: 0.9, reach: 2.4,
    anim: A({ attack: 'atk1', attack2: 'atk3', attack3: 'atk5', walk: 'walk2' }), windup: [0.35, 0.6], atkDur: 0.9},
  silver:   { name: 'Silver Paladin', tier: 6, lvl: 23, ai: 'counter', cls: 'elite', hits: 5, speed: 2, aggro: 10, files: ['assets/armor/silver_knight.glb'], h: 2.0, w: 0.8, reach: 1.9, sword: 'sunguard_sword', block: 0.5, ual: true,
    anim: { idle: 'Sword_Idle', walk: 'Walk_Loop', attack: 'Sword_Regular_A', attack2: 'Sword_Regular_B', attack3: 'Sword_Regular_C', hit: 'Hit_Chest', death: 'Death01', block: 'Sword_Block' }, windup: [0.38, 0.62], atkDur: 0.9},
  abyssal_mouth: { name: 'The Abyssal Mouth', tier: 6, lvl: 24, ai: 'boss', hits: 37, mini: true, files: [M + 'new_creatures/abyssal_mouth.glb'], h: 3.4, w: 1.6, dmg: 90, touch: 19, speed: 2.2, reach: 3.0, xp: 2400,
    anim: { idle: 'idle', walk: 'walk', run: 'run', attack: 'attack', death: 'death', roar: 'intimidating roar.001' }, windup: [0.4, 0.62], atkDur: 1.3, aggro: 24,
    moves: [{ k: 'melee', anim: 'attack', w: 3, range: 3.6 }, { k: 'leap', anim: 'Pounce on an enemy violently attacking them.001', w: 3, min: 4, range: 12, dur: 1.6 }, { k: 'volley', anim: 'cast_a_spell.001', w: 3, shot: 'orb', n: 5, min: 3, dur: 1.8 }, { k: 'rain', anim: '2 handed fancy spell casting with waving arms..001', w: 2, shot: 'orb', n: 9, dur: 2.4 }, { k: 'blink', anim: 'Starts to hover.001', w: 2, dur: 1.0 }, { k: 'maw', anim: 'idle', w: 3, range: 14, dur: 2.0 }] },
  dragon_red: { name: 'Pyrrhax, Wyrm of the Reliquary', tier: 6, lvl: 24, ai: 'boss', hits: 37, mini: true, dragon: true, files: [TR + 'dragon_red.glb'], h: 4.5, w: 4.5, dmg: 97, touch: 19, speed: 2.6, reach: 5, xp: 3000, quad: true, elem: 'fire',
    anim: { idle: 'idle', walk: 'walk', run: 'run', attack: 'bite', hit: 'hit', death: 'death', roar: 'roar' }, windup: [0.35, 0.5], atkDur: 1.8, aggro: 26,
    moves: [{ k: 'melee', anim: 'bite', w: 3, range: 5.5, dur: 1.7 }, { k: 'melee', anim: 'claw_slam', w: 2, range: 5.5, dur: 2.2, shock: true }, { k: 'melee', anim: 'tail_whip', w: 2, range: 6.5, low: true, dur: 2.2 }, { k: 'breath', anim: 'breath', w: 3, min: 3, range: 14, elem: 'fire', dur: 3.2 }, { k: 'sweep', anim: 'breath_sweep', w: 2, elem: 'fire', dur: 3.4 }, { k: 'leap', anim: 'pounce', w: 2, min: 5, range: 14, dur: 2.2 }, { k: 'meteor', anim: 'roar', w: 3, n: 6, dur: 2.6 }] },
  archivist: { name: 'Malgrave, the Last Archivist', tier: 6, lvl: 25, ai: 'boss', hits: 77, boss: true, files: [TR + 'necromancer_lord.glb'], h: 2.6, w: 1.0, dmg: 94, touch: 17, speed: 2.4, reach: 2.4, xp: 4200,
    anim: A({ attack: 'atk1', attack2: 'atk3' }), windup: [0.45, 0.6], atkDur: 1.2, aggro: 30, bell: 'echo', title: 'THE LAST PAGE TURNS', arm: ['voidfang_dagger'],
    moves: [{ k: 'blink', anim: 'atk5', w: 3, dur: 0.9 }, { k: 'volley', anim: 'atk2', w: 3, shot: 'skull', n: 3, dur: 1.4 }, { k: 'fan', anim: 'atk4', w: 3, shot: 'orb', n: 7, dur: 1.5 }, { k: 'melee', anim: 'atk1', w: 2, range: 3 }, { k: 'summon', anim: 'roar', w: 2, what: 'zombie', max: 3, dur: 1.8 },
      { k: 'mirror', anim: 'roar', w: 4, n: 3, phase: 2, dur: 1.6 }, { k: 'rain', anim: 'atk3', w: 3, shot: 'book', n: 12, phase: 2, dur: 2.2 }, { k: 'pillars', anim: 'atk4', w: 2, n: 5, elem: 'poison', phase: 2, dur: 1.8 }, { k: 'grimoire', anim: 'atk4', w: 3, dur: 2.6, phase: 2 }] },

  // ---------------------------------------------------------------- act 7 / 8
  necro_lord: { name: 'Hollow Hierophant', tier: 7, lvl: 26, ai: 'orbiter', cls: 'elite', hits: 4.5, speed: 1.4, aggro: 12, files: tr('necromancer_lord_2'), h: 2.2, w: 0.8, reach: 11,
    anim: A({ attack: 'atk2', attack2: 'atk4' }), windup: [0.5, 0.55], atkDur: 1.2},
  dragon_black: { name: 'Vhalgor, Storm of the Belfry', tier: 7, lvl: 29, ai: 'boss', hits: 79, boss: true, dragon: true, fly: true, files: [TR + 'dragon_black.glb'], h: 4.5, w: 4.5, dmg: 115, touch: 22, speed: 3, reach: 5, xp: 9000, quad: true, elem: 'lightning',
    anim: { idle: 'idle', walk: 'walk', run: 'run', attack: 'bite', hit: 'hit', death: 'death', roar: 'roar', fly: 'fly_hover' }, windup: [0.35, 0.5], atkDur: 1.8, aggro: 40, bell: 'dash', title: 'THE STORM BREAKS',
    moves: [{ k: 'melee', anim: 'bite', w: 3, range: 5.5, dur: 1.6 }, { k: 'melee', anim: 'claw_rake', w: 2, range: 5.5, dur: 2.2 }, { k: 'melee', anim: 'tail_spin', w: 2, range: 7, low: true, dur: 2.8 }, { k: 'breath', anim: 'breath', w: 3, min: 3, range: 15, elem: 'lightning', dur: 3.0 },
      { k: 'takeoff', anim: 'takeoff', w: 3, dur: 2.0, ground: true }, { k: 'strafe', anim: 'strafe_breath', w: 4, elem: 'lightning', dur: 3.2, air: true }, { k: 'divebomb', anim: 'dive', w: 3, dur: 2.4, air: true }, { k: 'rain', anim: 'fly_hover', w: 3, shot: 'bolt', n: 9, dur: 2.4, air: true, elem: 'lightning' }, { k: 'land', anim: 'land', w: 2, dur: 2.0, air: true },
      { k: 'buffet', anim: 'wing_buffet', w: 2, dur: 2.2, phase: 2 }, { k: 'sweep', anim: 'breath_sweep', w: 3, elem: 'lightning', dur: 3.2, phase: 2 }, { k: 'stormcall', anim: 'roar', w: 3, n: 9, dur: 3.4, air: true, phase: 2 }] },
  dragon_undead: { name: 'The Starless Wyrm', tier: 8, lvl: 30, ai: 'boss', hits: 39, mini: true, dragon: true, files: [TR + 'dragon_undead.glb'], h: 4.5, w: 4.5, dmg: 119, touch: 22, speed: 2.6, reach: 5, xp: 9000, quad: true, elem: 'ice',
    anim: { idle: 'idle', walk: 'walk', run: 'run', attack: 'bite', hit: 'hit', death: 'death', roar: 'roar' }, windup: [0.35, 0.5], atkDur: 1.8, aggro: 30,
    moves: [{ k: 'melee', anim: 'bite', w: 3, range: 5.5, dur: 1.7 }, { k: 'melee', anim: 'claw_slam', w: 2, range: 5.5, dur: 2.2, shock: true }, { k: 'melee', anim: 'tail_slam', w: 2, range: 6.5, dur: 2.2, shock: true }, { k: 'breath', anim: 'breath', w: 3, min: 3, range: 14, elem: 'ice', dur: 3.0 }, { k: 'sweep', anim: 'breath_sweep', w: 3, elem: 'ice', dur: 3.2 }, { k: 'pillars', anim: 'roar', w: 2, n: 6, elem: 'ice', dur: 2.4 }, { k: 'frostnova', anim: 'roar', w: 3, n: 7, dur: 1.8 }] },
  hollow_king: { name: 'Velscour, King of the Hollow Sun', tier: 8, lvl: 32, ai: 'boss', hits: 81, boss: true, final: true, files: [TR + 'skeleton_knight_giant.glb'], h: 4.4, w: 1.9, dmg: 130, touch: 24, speed: 2.4, reach: 4.2, xp: 30000,
    anim: A({ attack: 'atk1', attack2: 'atk2', attack3: 'atk4', block: 'block', bash: 'bash' }), windup: [0.4, 0.64], atkDur: 1.4, aggro: 40, title: 'THE HOLLOW SUN SETS', arm: ['wheel_greatsword'],
    moves: [{ k: 'melee', anim: 'atk1', w: 3, range: 5 }, { k: 'melee', anim: 'atk2', w: 2, range: 5 }, { k: 'charge', anim: 'bash', w: 2, min: 5, range: 16, speed: 11 }, { k: 'slam', anim: 'atk4', w: 3, range: 12 }, { k: 'wave', anim: 'atk3', w: 3, min: 3, shot: 'crescent', n: 2, dur: 1.5 },
      { k: 'suns', anim: 'roar', w: 4, n: 3, phase: 2, dur: 2.4 }, { k: 'leap', anim: 'jump', w: 3, min: 4, range: 16, phase: 2, slamOnLand: true }, { k: 'rain', anim: 'roar', w: 3, shot: 'ember', n: 14, phase: 3, dur: 2.4 }, { k: 'pillars', anim: 'atk5', w: 3, n: 7, elem: 'fire', phase: 3, dur: 2.0 }, { k: 'blink', anim: 'block', w: 2, phase: 3, dur: 0.8 }, { k: 'eclipse', anim: 'roar', w: 4, dur: 4.6, phase: 3 }] },
  // ---------------------------------------------------------------- kinds that reuse a model for a new pattern
  skitter:  { name: 'Skitterling', tier: 2, lvl: 5, ai: 'crawler', cls: 'fodder', hits: 0.75, speed: 2.0, aggro: 9, files: [TR + 'spider_black.glb'], h: 0.62, w: 0.8, reach: 0.8, quad: true,
    anim: A({ attack: 'atk1', attack2: 'atk3' }), windup: [0.35, 0.6], atkDur: 0.9 },
  drowned:  { name: 'Drowned Thrall', tier: 2, lvl: 6, ai: 'merman', cls: 'fodder', hits: 1.4, speed: 3, aggro: 10, files: tr('possessed_man_1', 'possessed_woman_1'), h: 1.75, w: 0.7, reach: 1.2, tint: 0x4a9a8a,
    anim: A({ attack: 'atk2', attack2: 'atk3' }), windup: [0.35, 0.6], atkDur: 1.0 },
  shade:    { name: 'Pale Shade', tier: 3, lvl: 9, ai: 'ghost', cls: 'fodder', hits: 1.5, speed: 1.5, aggro: 13, fly: true, noTouch: true, files: tr('possessed_woman_2', 'possessed_man_2'), h: 1.7, w: 0.7, reach: 1.2, tint: 0xa8c8ff, alpha: 0.55,
    anim: A({ attack: 'atk2', attack2: 'atk3' }), windup: [0.35, 0.6], atkDur: 1.0 },
};
for (const T of Object.values(BESTIARY)) Object.assign(T, statsAt(T, T.lvl));
export const ENEMY_IDS = Object.keys(BESTIARY);
