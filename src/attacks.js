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
  dagger:     { label: 'Dagger (paired)', style: 'flurry' },
  rapier:     { label: 'Rapier', style: 'needle' },
  staff:      { label: 'Staff', style: 'whirl' },
  scythe:     { label: 'Scythe', style: 'reap' },
  axe:        { label: 'Axe (one hand)', style: 'chop' },
  mace:       { label: 'Mace (one hand)', style: 'smash' },
  great_axe:  { label: 'Greataxe', style: 'slash2h' },
  great_mace: { label: 'Maul', style: 'smash2h' },
  spear:      { label: 'Spear / pike', style: 'thrust' },
  lance:      { label: 'Lance', style: 'lance' },
};

// Every attack-like clip in assets/player/vesper_player.glb, with what it actually looks like (checked frame by frame).
// use: attack (ground) · air (leaping/plunge) · finisher (paired, needs a victim) · spell (cast; hands = which hand(s) release).
// Long clips hold several swings: the viewer detects each one and lets you pick it.
export const ATTACK_CLIPS = [
  // authored clips (tools/build_anims.py): guard pose in and out, eased wind-up, held follow-through
  { name: 'vw_slash1', group: 'Sword', note: 'Authored chain link 1: overhead cut down to the front' },
  { name: 'vw_slash2', group: 'Sword', note: 'Authored chain link 2: planted horizontal sweep' },
  { name: 'vw_slash3', group: 'Sword', note: 'Authored chain link 3: stepping overhead finisher' },
  { name: 'vw_great', group: 'Two-hand', note: 'Authored two-hand cleave with a long held follow-through' },
  { name: 'sword_and_shield_slash', group: 'Sword', note: 'Quick one-hand forehand slash' },
  { name: 'sword_and_shield_slash_2', group: 'Sword', note: 'Wide spinning one-hand slash' },
  { name: 'sword_and_shield_attack', group: 'Sword', note: 'Step-in sword-and-board strike' },
  { name: 'great_sword_slash', group: 'Two-hand', note: 'Big two-hand diagonal cleave' },
  { name: 'standing_melee_attack_downward', group: 'Two-hand', use: 'attack', note: 'Overhead smash: hauls the weapon up (f13–37), slams it down (f45–65). Two-handed weapons get the left hand on the haft.' },
  { name: 'standing_melee_attack_360_high', group: 'Two-hand', note: 'High spinning sweep' },
  { name: 'standing_melee_combo_attack_ver_2', group: 'Combos', note: 'Multi-hit combo (several swings)' },
  { name: 'standing_melee_combo_attack_ver_3', group: 'Combos', note: 'Multi-hit combo (several swings)' },
  { name: 'axe_standing_melee_attack_horizontal', group: 'Axe', note: 'Flat horizontal chop' },
  { name: 'axe_standing_melee_attack_backhand', group: 'Axe', note: 'Backhand return swing' },
  { name: 'axe_standing_melee_attack_360_low', group: 'Axe', note: 'Low spinning sweep' },
  { name: 'stabbing', group: 'Thrust', use: 'attack', note: 'Not a real stab — a guard stance with a slow left-hand poke (f26–53). Reads weak; prefer a straight from Fist fight A.' },
  { name: 'double_dagger_stab', group: 'Thrust', use: 'attack', note: 'Hammer-fist dagger stabs, both hands; the strongest blow lands f64–74.' },
  { name: 'jump_attack', group: 'Aerial', use: 'air', note: 'Standing leap into an overhead chop that lands f93–102, then a deep crouch. Travels forward — best as a plunge/air attack.' },
  { name: 'standing_melee_run_jump_attack', group: 'Aerial', use: 'air', note: 'Running leap into a two-hand overhead slam on landing (f95–106).' },
  { name: 'fist_fight_a', group: 'Unarmed', use: 'attack', note: 'Boxing set: jab (f92–98), overhand (f134–148), left straight (f159–173), right cross (f168–185), front kick (f225–239).' },
  { name: 'flying_knee_punch_combo', group: 'Unarmed', use: 'attack', note: 'Rising knee with a double-axe punch (f39–51), then a lunging punch (f69–83).' },
  { name: 'standing_melee_attack_kick_ver_2', group: 'Unarmed', use: 'attack', note: 'Right front kick (f45–73) after a short guard shuffle.' },
  { name: 'brutal_assassination', group: 'Finishers', use: 'finisher', note: 'Paired finisher: seizes a victim, then a driving blow (f158–184). Needs a victim to read — preview only.' },
  { name: 'stealth_assassination', group: 'Finishers', use: 'finisher', note: 'Paired takedown from behind, 14 s long. Needs a victim to read — preview only.' },
  { name: 'standing_2h_magic_attack_01', group: 'Magic', use: 'spell', hands: 'both', note: 'Gathers power overhead (f37–61), shoves both palms out to release (f64–74).' },
  { name: 'fireball', group: 'Magic', use: 'spell', hands: 'R', note: 'Winds back and hurls from the right hand (release f102–120).' },
  { name: 'two_hand_spell_casting', group: 'Magic', use: 'spell', hands: 'both', note: 'Channels with both hands (f26–67), then pushes the spell out (f77–88).' },
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

// Find every strike in a clip, per limb. sample(t) returns { chest, fwd, limbs: { R, L, RF, LF } } of THREE.Vector3
// (R = weapon tip or right fist, L = left fist, RF/LF = feet; fwd = the hero's facing direction).
// A strike is a speed peak during which the limb moves away from the chest (so wind-ups back and recoveries are
// dropped). Each gets a readable name from its limb and direction, a frame window, hit frames and a hit box fitted
// to where the limb actually travels while the hit is live. Returns strikes sorted by hit frame.
const LIMB = { R: 'Right', L: 'Left', RF: 'Right', LF: 'Left', RK: 'Right', LK: 'Left' };
const MIN_SPEED = { R: 0.9, L: 0.9, RF: 1.0, LF: 1.0, RK: 1.1, LK: 1.1 }; // m/s: below this it's stance sway, not a blow
export function detectStrikes(duration, sample, opts = {}) {
  const n = Math.floor(duration * FPS), fr = [];
  for (let f = 0; f <= n; f++) { const s = sample(f / FPS); fr.push({ chest: s.chest.clone(), fwd: s.fwd.clone(), limbs: Object.fromEntries(Object.entries(s.limbs).map(([k, v]) => [k, v.clone()])) }); }
  const out = [];
  for (const limb of Object.keys(fr[0].limbs)) {
    const sp = [0];
    for (let f = 1; f <= n; f++) sp.push(fr[f].limbs[limb].distanceTo(fr[f - 1].limbs[limb]) * FPS);
    const sm = sp.map((_, i) => (sp[Math.max(0, i - 1)] + sp[i] + sp[Math.min(n, i + 1)]) / 3);
    const max = Math.max(...sm), floor = Math.max(MIN_SPEED[limb] * (opts.weapon && limb === 'R' ? 3 : 1), max * 0.35);
    const reach = f => fr[f].limbs[limb].distanceTo(fr[f].chest);
    for (let f = 1; f < n; f++) {
      if (!(sm[f] >= floor && sm[f] >= sm[f - 1] && sm[f] > sm[f + 1])) continue;
      const pk = sm[f];
      let a = f; while (a > 0 && sm[a - 1] > pk * 0.6 && f - a < 6) a--;
      let b = f; while (b < n && sm[b + 1] > pk * 0.6 && b - f < 6) b++;
      if (b - a < 2) { f = b; continue; } // a one-frame spike is a pose pop, not a blow
      if (reach(b) - reach(a) < 0.04 && fr[b].limbs[limb].y - fr[a].limbs[limb].y > -0.25) { f = b; continue; } // pulling back, not striking
      let from = Math.max(0, a - 3); while (from > 0 && a - from < 12 && sm[from - 1] > MIN_SPEED[limb] * 0.4) from--; // back to where the limb set off
      let to = Math.min(n, b + 3); while (to < n && to - b < 10 && sm[to + 1] < sm[to]) to++;
      // direction of travel through the hit, in the hero's frame
      const d = fr[b].limbs[limb].clone().sub(fr[a].limbs[limb]), fw = fr[f].fwd;
      const fwdC = d.x * fw.x + d.z * fw.z, up = d.y, side = Math.hypot(d.x - fw.x * fwdC, d.z - fw.z * fwdC), len = d.length() || 1;
      const foot = limb === 'RF' || limb === 'LF', knee = limb === 'RK' || limb === 'LK', hand = LIMB[limb];
      let topY = -1e9; for (let k = a; k <= b; k++) topY = Math.max(topY, fr[k].limbs[limb].y - (opts.ground ? opts.ground(k) : 0));
      if (foot && topY < 0.5) { f = b; continue; } // a step or a landing, not a kick
      if (knee && (topY < 0.85 || fr[b].limbs[limb].y - fr[a].limbs[limb].y < 0.15)) { f = b; continue; } // only a driving knee
      let kind;
      if (knee) kind = 'knee';
      else if (foot) kind = topY > 1.1 ? 'high kick' : topY > 0.8 ? 'kick' : 'low kick';
      else if (up < -0.55 * len) kind = opts.weapon ? 'downward strike' : 'overhand';
      else if (up > 0.55 * len) kind = opts.weapon ? 'rising slash' : 'uppercut';
      else if (fwdC > 0.6 * len) kind = opts.weapon ? 'thrust' : 'jab';
      else if (side > 0.6 * len) kind = opts.weapon ? 'horizontal slash' : 'hook';
      else kind = opts.weapon ? 'slash' : 'strike';
      // the blow lands at full extension (or the lowest point of a downward strike), not at peak speed: anchor the live
      // window there — a speed-anchored window fires while the limb is still on its way
      const down = / downward| overhand/.test(kind), metric = k => down ? -fr[k].limbs[limb].y : reach(k);
      let e = f; for (let k = f; k <= Math.min(n, f + 14); k++) if (metric(k) > metric(e) + 0.005) e = k;
      a = Math.max(from + 1, e - 5); b = Math.min(n, e + 3); to = Math.max(to, Math.min(n, e + 8));
      // hit box: where the limb is while the hit is live, relative to the hero (x forward, y up)
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let k = a; k <= b; k++) { const p = fr[k].limbs[limb], c = fr[k].chest, fx = (p.x - c.x) * fw.x + (p.z - c.z) * fw.z; x0 = Math.min(x0, fx); x1 = Math.max(x1, fx); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      out.push({ limb, name: `${hand} ${kind}`, from, to, hit: [a, b], peak: pk, back: x1 < 0.25,
        box: { reach: +Math.max(0.6, x1 + 0.15).toFixed(2), height: +Math.max(0.5, y1 - y0 + 0.3).toFixed(2), yOff: +((y0 + y1) / 2).toFixed(2) } });
      f = b;
    }
  }
  out.sort((p, q) => p.hit[0] - q.hit[0]);
  // keep the strongest few per clip so long combos stay readable
  if (out.length > 8) { const keep = new Set([...out].sort((p, q) => q.peak - p.peak).slice(0, 8)); return out.filter(s => keep.has(s)); }
  return out;
}
