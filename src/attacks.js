// Hero attack setup: which animation each weapon class swings with, the frame window, hit frames and grip.
// Defaults come from STYLES in items.js; the Attack Viewer (viewer.html) saves overrides to localStorage under
// ATTACK_KEY, and the game picks them up on its next load. "Copy config" in the viewer gives the JSON to bake in here.
import { STYLES, BASES } from './items.js';

export const FPS = 30;
export const ATTACK_KEY = 'vesperwrithe_attacks';

// Weapon classes the hero can swing. style = default entry in STYLES.
export const KINDS = {
  unarmed:    { label: 'Unarmed (fists)', style: 'punch' },
  sword:      { label: 'Sword', style: 'slash1h' },
  dagger:     { label: 'Dagger', style: 'stab' },
  axe:        { label: 'Axe (one hand)', style: 'chop' },
  mace:       { label: 'Mace (one hand)', style: 'smash' },
  great_axe:  { label: 'Greataxe', style: 'slash2h' },
  great_mace: { label: 'Maul', style: 'smash' },
  spear:      { label: 'Spear / pike', style: 'thrust' },
  lance:      { label: 'Lance', style: 'lance' },
};

// Every attack-like clip in assets/player/vesper_player.glb, with what it looks like.
// Long clips hold several swings: the viewer detects each one and lets you pick it.
export const ATTACK_CLIPS = [
  { name: 'sword_and_shield_slash', group: 'Sword', note: 'Quick one-hand forehand slash' },
  { name: 'sword_and_shield_slash_2', group: 'Sword', note: 'Wide spinning one-hand slash' },
  { name: 'sword_and_shield_attack', group: 'Sword', note: 'Step-in sword-and-board strike' },
  { name: 'great_sword_slash', group: 'Two-hand', note: 'Big two-hand diagonal cleave' },
  { name: 'standing_melee_attack_downward', group: 'Two-hand', note: 'Overhead downward smash' },
  { name: 'standing_melee_attack_360_high', group: 'Two-hand', note: 'High spinning sweep' },
  { name: 'standing_melee_combo_attack_ver_2', group: 'Combos', note: 'Multi-hit combo (several swings)' },
  { name: 'standing_melee_combo_attack_ver_3', group: 'Combos', note: 'Multi-hit combo (several swings)' },
  { name: 'axe_standing_melee_attack_horizontal', group: 'Axe', note: 'Flat horizontal chop' },
  { name: 'axe_standing_melee_attack_backhand', group: 'Axe', note: 'Backhand return swing' },
  { name: 'axe_standing_melee_attack_360_low', group: 'Axe', note: 'Low spinning sweep' },
  { name: 'stabbing', group: 'Thrust', note: 'Forward stab' },
  { name: 'double_dagger_stab', group: 'Thrust', note: 'Two-hand dagger stab' },
  { name: 'jump_attack', group: 'Aerial', note: 'Leaping overhead strike' },
  { name: 'standing_melee_run_jump_attack', group: 'Aerial', note: 'Running jump attack' },
  { name: 'fist_fight_a', group: 'Unarmed', note: 'Boxing combo (jabs and hooks)' },
  { name: 'flying_knee_punch_combo', group: 'Unarmed', note: 'Flying knee then punches' },
  { name: 'standing_melee_attack_kick_ver_2', group: 'Unarmed', note: 'Front kick' },
  { name: 'brutal_assassination', group: 'Finishers', note: 'Grab-and-stab finisher (paired)' },
  { name: 'stealth_assassination', group: 'Finishers', note: 'Stealth takedown (paired)' },
  { name: 'standing_2h_magic_attack_01', group: 'Magic', note: 'Two-hand spell blast' },
  { name: 'fireball', group: 'Magic', note: 'Thrown fireball' },
  { name: 'two_hand_spell_casting', group: 'Magic', note: 'Channelled cast' },
];

const FIELDS = ['anim', 'from', 'to', 'hit', 'dur', 'reach', 'height', 'yOff', 'grip', 'upperOnly'];

export function readAttackConfig() {
  try { const c = JSON.parse(localStorage.getItem(ATTACK_KEY)); if (c && typeof c === 'object') return { kinds: c.kinds || {}, start: c.start || null }; } catch { /* storage blocked */ }
  return { kinds: {}, start: null };
}
export function writeAttackConfig(cfg) {
  try { localStorage.setItem(ATTACK_KEY, JSON.stringify(cfg)); return true; } catch { return false; }
}

export function kindOf(base) { return base ? (KINDS[base.kind] ? base.kind : 'sword') : 'unarmed'; }

// The style the game swings with for a weapon base (null = fists), defaults merged with saved overrides.
export function attackFor(base, cfg = readAttackConfig()) {
  const kind = kindOf(base);
  const def = STYLES[base ? base.style : KINDS.unarmed.style];
  const o = cfg.kinds[kind] || {};
  const st = { grip: 'normal', ...def };
  for (const f of FIELDS) if (o[f] !== undefined) st[f] = o[f];
  return st;
}

export function startWeapon(cfg = readAttackConfig()) { return cfg.start && BASES[cfg.start]?.slot === 'weapon' ? cfg.start : 'pilgrim_blade'; }

// Find the individual swings in a clip from the speed of a tracked point (the weapon tip).
// sample(t) must return a THREE.Vector3 world position. Returns [{ from, to, hit: [a, b], peak }] in frames.
export function detectSwings(duration, sample) {
  const n = Math.floor(duration * FPS), pos = [], sp = [0];
  for (let f = 0; f <= n; f++) pos.push(sample(f / FPS).clone());
  for (let f = 1; f <= n; f++) sp.push(pos[f].distanceTo(pos[f - 1]) * FPS);
  const sm = sp.map((_, i) => { let s = 0, c = 0; for (let k = -1; k <= 1; k++) if (sp[i + k] !== undefined) { s += sp[i + k]; c++; } return s / c; });
  const max = Math.max(...sm);
  const out = [];
  let f = 1;
  while (f < n) {
    if (sm[f] > max * 0.45 && sm[f] >= sm[f - 1] && sm[f] >= sm[f + 1]) {
      const pk = sm[f];
      let a = f; while (a > 0 && sm[a] > pk * 0.5) a--;
      let b = f; while (b < n && sm[b] > pk * 0.5) b++;
      let from = a; while (from > 0 && sm[from - 1] < sm[from] && a - from < 14) from--;
      let to = b; while (to < n && sm[to + 1] < sm[to] && to - b < 10) to++;
      const prev = out[out.length - 1];
      if (prev && a <= prev.hit[1] + 2) { if (pk > prev.peak) { prev.hit[1] = b; prev.to = to; prev.peak = pk; } else { prev.hit[1] = Math.max(prev.hit[1], b); prev.to = Math.max(prev.to, to); } }
      else out.push({ from, to, hit: [a, b], peak: pk });
      f = b + 1;
    } else f++;
  }
  return out;
}
