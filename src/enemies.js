import * as THREE from 'three';
import { glowTex } from './world.js';
import { cloneGLTF, weaponModel, audio, WEAPONS, addRim } from './assets.js';
const RIM_COOL = new THREE.Color(0x7c8cb0), RIM_HOT = new THREE.Color(0xff3020), RIM_HIT = new THREE.Color(0xffffff);
import { fitHeight } from './world.js';
import { BESTIARY } from './catalog.js';

export const TYPES = BESTIARY;
export const ELEM_COL = { fire: 0xff6a20, ice: 0x7ad8ff, lightning: 0xfff070, poison: 0x8aff5a, shadow: 0xb070ff };
const rnd = (a, b) => a + Math.random() * (b - a);
const sgn = x => (x < 0 ? -1 : 1);
const SHOT_SPEED = { bolt: 11, orb: 6.5, skull: 4.2, feather: 13, gust: 10, book: 9 };

let idSeq = 1;
export class Enemy {
  constructor(game, spec, room) {
    this.g = game; this.spec = spec; this.room = room; this.T = TYPES[spec.t]; this.id = idSeq++;
    const b = room.b, T = this.T;
    this.pos = new THREE.Vector2(b.x0 + spec.x, b.y0 + (spec.y ?? 0.5)); this.home = this.pos.clone();
    this.vel = new THREE.Vector2(); this.facing = -1; this.yaw = -1.2;
    this.hpMax = Math.round(T.hp * (spec.hpMul || 1) * (T.mini && !spec.illusion ? 1.6 : 1)); if (spec.illusion) this.hpMax = 1; this.hp = this.hpMax;
    this.boss = !!(spec.boss || T.boss || T.mini); this.mini = !!(T.mini || spec.mini) && !T.boss; this.dead = false;
    this.flying = T.ai === 'flyer' || (T.fly && !T.dragon); this.air = this.flying; this.phase = 1;
    this.reset(true);
  }

  reset(first) {
    const s = this.spec, T = this.T;
    this.dead = false; this.gone = false; this.hp = this.hpMax; this.pos.copy(this.home); this.vel.set(0, 0); this.t = 0; this.cool = 1 + Math.random();
    this.flash = 0; this.chill = 0; this.poison = 0; this.burn = 0; this.stun = 0; this.awake = false; this.phase = 1; this.mv = null; this.atk = null; this.curName = null; this.hidden = false;
    this.air = this.flying; this.lastMove = null; this.alpha = 1;
    this.state = s.rise ? 'buried' : T.ai === 'worm' ? 'under' : (T.ai === 'spider' && this.canHang()) ? 'hang' : (T.hang && this.canHang()) ? 'hang' : 'idle';
    if (!first && this.root) {
      this.root.visible = !(this.state === 'buried' || this.state === 'under'); this.setAlpha(1);
      this.play(this.state === 'buried' ? T.anim.rise : T.anim.idle, 0, { restart: true }); if (this.state === 'buried' && this.cur) this.cur.paused = true;
      this.sync(0);
    }
  }
  canHang() { // a ceiling or ledge to cling to within reach above the spawn point
    const b = this.room.b, y = this.home.y; let best = null;
    for (const s of this.room.solids) if (!s.oneway && this.home.x > s.x0 && this.home.x < s.x1 && s.y0 > y + 3 && s.y0 < y + 9 && (best === null || s.y0 < best)) best = s.y0;
    this.hangY = best; return best !== null;
  }

  async load() {
    const T = this.T, file = T.files[this.id % T.files.length];
    const g = await cloneGLTF(file);
    this.root = new THREE.Group(); this.model = g.scene; this.tilt = new THREE.Group(); this.tilt.add(this.model); this.root.add(this.tilt);
    fitHeight(this.model, T.h); this.model.updateMatrixWorld(true);
    { const bb = new THREE.Box3().setFromObject(this.model); if (isFinite(bb.min.y) && Math.abs(bb.min.y) < T.h * 0.4) this.model.position.y -= bb.min.y; }
    const lift = this.spec.t === 'knight' ? 1.7 : 1.3;
    this.mats = [];
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = o.material.clone(); const m = o.material; if (m.color) m.color.multiplyScalar(lift); m.envMapIntensity = 1.4; if (m.emissive && !m.emissiveMap) { m.emissive.setHex(0x101420); m.emissiveIntensity = 1; } m.userData.em = m.emissive ? m.emissive.getHex() : 0; m.userData.emI = m.emissiveIntensity; this.mats.push(m); } });
    this.rim = { col: RIM_COOL.clone(), k: 0.3 }; for (const m of this.mats) addRim(m, this.rim); this.weaponMats = []; this.model.traverse(o => { if (o.isMesh) o.renderOrder = 2; });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = Object.fromEntries(g.animations.map(c => [c.name, c]));
    try { await this.armUp(); } catch (e) { console.warn('arm', this.spec.t, e); }
    this.model.traverse(o => { if (o.isMesh) o.renderOrder = 2; }); // weapons too: only stone hides the hero
    if (this.spec.illusion) this.setAlpha(0.55);
    this.room.group.add(this.root);
    this.play(this.state === 'buried' ? T.anim.rise : T.anim.idle, 0, this.state === 'buried' ? { paused: true } : {});
    if (this.state === 'buried' || this.state === 'under') this.root.visible = false;
    this.sync(0);
  }

  // Put a Bellmourn weapon (and shield) in the monster's hands.
  async armUp() {
    const T = this.T, ms = this.model.scale.x;
    const attach = async (bone, id, len, q, off) => {
      if (!bone || !WEAPONS[id]) return;
      const w = await weaponModel(id, 1), s = new THREE.Group(); bone.add(s); w.traverse(o => { if (o.isMesh && o.material.emissive) { o.material.userData.em = o.material.emissive.getHex(); this.weaponMats.push(o.material); } }); this.hand ||= s;
      const hs = bone.getWorldScale(new THREE.Vector3()).x || 1; s.scale.setScalar(len / hs); s.quaternion.copy(q); if (off) s.position.copy(off).multiplyScalar(1 / hs); s.add(w);
    };
    if (T.sword) { // UAL rig: blade along the knuckle line, handle across the palm
      const hand = this.model.getObjectByName('hand_r'), knuck = new THREE.Vector3(-0.577, -0.033, 0.816).normalize(), fing = new THREE.Vector3(0.003, 0.999, 0.043), palm = new THREE.Vector3(-0.817, 0.027, -0.576);
      await attach(hand, T.sword, 0.8, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), knuck), fing.multiplyScalar(0.075).add(palm.multiplyScalar(0.025)));
    }
    if (T.arm) { // Mixamo rig: the hand bone's +Y runs along the fingers; a gripped haft crosses the palm along -Z/+X
      const hand = this.model.getObjectByName('mixamorigRightHand'), id = T.arm[this.id % T.arm.length];
      const big = T.h / 1.8;
      await attach(hand, id, big * 0.9, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(0, 0.09 * big, 0.03 * big));
    }
    if (T.shield) {
      const fore = this.model.getObjectByName('mixamorigLeftForeArm'), id = T.shield[this.id % T.shield.length];
      await attach(fore, id, T.h / 1.8 * 0.85, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(0, 0.14, 0.07));
    }
  }

  clipFor(name) { return this.clips[name] ? name : null; }
  play(name, fade = 0.15, o = {}) {
    const clip = this.clips[name]; if (!clip) return null;
    if (this.curName === name && !o.restart) return this.cur;
    const a = this.mixer.clipAction(clip); a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.timeScale = o.speed ?? 1;
    a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once; a.play();
    if (o.paused) a.paused = true;
    if (this.cur && this.cur !== a) this.cur.crossFadeTo(a, fade, false);
    this.cur = a; this.curName = name; return a;
  }
  // one-shot clip stretched or squeezed to last `dur` seconds (kept within sane speeds)
  playFor(name, dur, fade = 0.1) { const c = this.clips[name]; if (!c) return null; return this.play(name, fade, { once: true, restart: true, speed: THREE.MathUtils.clamp(c.duration / dur, 0.45, 3) }); }
  setAlpha(a) { this.alpha = a; for (const m of this.mats || []) { m.transparent = a < 1; m.opacity = a; m.depthWrite = a > 0.5; } }

  get aabb() { const w = this.T.w, h = this.T.h * (this.T.quad ? 0.8 : 0.95); return { x0: this.pos.x - w / 2, x1: this.pos.x + w / 2, y0: this.pos.y, y1: this.pos.y + h }; }
  get cx() { return this.pos.x; } get cy() { return this.pos.y + this.T.h * 0.55; }
  get mouth() { return { x: this.pos.x + this.facing * this.T.w * 0.5, y: this.pos.y + this.T.h * (this.T.quad ? 0.6 : 0.8) }; }
  get dmgMul() { return (this.phase >= 3 ? 1.25 : 1) * (this.boss && this.T.tier >= 3 ? 1.25 : 1); }

  // ------------------------------------------------------------------------------------------------ update
  update(dt, P) {
    const T = this.T; this.t += dt; if (this.flash > 0) this.flash -= dt; if (this.cool > 0) this.cool -= dt;
    if (this.chill > 0) this.chill -= dt;
    if (this.poison > 0) { this.poison -= dt; this.pT = (this.pT || 0) + dt; if (this.pT > 0.5) { this.pT = 0; this.damage(Math.max(1.5, this.poisonDmg || 0), 'poison', true); } }
    if (this.burn > 0) { this.burn -= dt; this.bT = (this.bT || 0) + dt; if (this.bT > 0.4) { this.bT = 0; this.damage(Math.max(2, this.burnDmg || 0), 'fire', true); this.g.fx.burst(this.cx, this.cy, 0xff6a20, 4, 2); } }
    if (this.dead) { this.tickDead(dt); this.physics(dt); this.sync(dt); return; }
    if (this.stun > 0) { this.stun -= dt; this.vel.x *= 0.85; if (this.stunStars) this.g.fx.spawn(this.cx + rnd(-0.6, 0.6), this.pos.y + T.h + 0.2, 0.5, 0, 0.6, 0xffe890, 0.3, 0.16, 0); if (this.stun <= 0 && this.state !== 'attack') { this.state = 'chase'; this.t = 0; } this.physics(dt); this.sync(dt * 0.25); return; }
    const dx = P.pos.x - this.pos.x, adx = Math.abs(dx), dy = P.pos.y - this.pos.y;
    const c = { dx, adx, dy, sees: adx < T.aggro && Math.abs(dy) < (this.boss ? 30 : this.flying ? 9 : 4.5) && P.state !== 'dead', slow: this.chill > 0 ? 0.55 : 1 };
    switch (this.state) {
      case 'buried':
        if (adx < 6.5 && Math.abs(dy) < 3) { this.state = 'rise'; this.t = 0; this.root.visible = true; const a = this.play(T.anim.rise, 0, { once: true, restart: true }); if (a) a.paused = false; audio.play('squelching_2', 0.5); this.g.fx.dust(this.pos.x, this.pos.y, 0x3a3028); this.facing = sgn(dx); }
        break;
      case 'rise': if (this.t > 1.6) { this.state = 'idle'; this.t = 0; } break;
      case 'intro': this.vel.x = 0; if (this.t > (this.introT || 2.2)) { this.state = 'chase'; this.t = 0; this.cool = 0.4; } break;
      case 'attack': this.tickAttack(dt, P, c); break;
      case 'stagger': case 'hurt': this.vel.x *= 0.88; if (this.t > (this.state === 'stagger' ? 0.7 : 0.35)) { this.state = 'chase'; this.t = 0; } break;
      case 'block': this.vel.x = 0; if (this.t > 0.45) { this.state = 'guard'; this.t = 0.9; } break;
      case 'guard': this.vel.x = 0; this.facing = sgn(dx); if (this.t > 1.5) { this.state = 'chase'; this.t = 0; this.cool = 0.1; } break;
      default: (BRAIN[T.ai] || BRAIN.walker)(this, dt, P, c);
    }
    // contact damage
    const charging = this.mv && ['charge', 'ram'].includes(this.mv.m.k) && this.mv.s.go;
    if (!this.hidden && T.touch && !charging && !['buried', 'rise', 'hurt', 'stagger', 'under', 'hang', 'intro', 'crouch'].includes(this.state) && !this.spec.illusion) {
      const a = this.aabb, pa = P.aabb;
      if (a.x0 + 0.1 < pa.x1 && a.x1 - 0.1 > pa.x0 && a.y0 < pa.y1 && a.y1 > pa.y0) P.takeHit(Math.round(T.touch * this.dmgMul), this.pos.x, null, this);
    }
    this.physics(dt);
    this.sync(dt);
  }

  tickDead(dt) {
    this.vel.x *= 0.9; const hold = this.boss ? 3.2 : 1.6;
    if (!this.clips[this.T.anim.death]) this.tilt.rotation.z = Math.min(1.4, this.t * 2.2) * -this.facing * 0.6, this.tilt.position.y = -Math.min(1, this.t) * this.T.h * 0.15;
    if (this.boss && this.t < hold && Math.random() < 0.5) this.g.fx.burst(this.cx + rnd(-1, 1) * this.T.w * 0.5, this.pos.y + Math.random() * this.T.h, Math.random() < 0.5 ? 0xffe0a0 : 0xff5030, 6, 4);
    if (this.t > hold) { const k = Math.min(1, (this.t - hold) / 0.8); this.setAlpha(1 - k); if (k >= 1) { this.root.visible = false; this.gone = true; } }
  }

  // ---- generic timed attack: windows of [a,b] fractions during which a box in front connects
  attackStart(o) {
    const T = this.T; this.state = 'attack'; this.t = 0; this.vel.x = 0;
    const anim = this.clipFor(o.anim) || this.clipFor(T.anim.attack);
    this.atk = { dur: o.dur || T.atkDur, wins: (o.hits ? o.hits.map(h => [h - 0.05, h + 0.07]) : [o.windup || T.windup]).map(w => ({ a: w[0], b: w[1], done: false })), reach: o.reach ?? T.reach, dmg: (o.dmg ?? T.dmg) * this.dmgMul, o, fired: false, tele: false };
    this.playFor(anim, this.atk.dur);
    this.g.fx.glint(this.pos.x + this.facing * 0.5, this.pos.y + T.h * 0.85, this.boss ? 0xff4040 : 0xfff0c0);
  }
  tickAttack(dt, P, c) {
    const A = this.atk, o = A.o, T = this.T, k = this.t / A.dur, w0 = A.wins[0].a;
    if (k < w0) this.warn = Math.max(this.warn || 0, k / w0);
    if (k > w0 - 0.08 && !A.tele) { A.tele = true; audio.play(this.boss ? 'sword_attack_3' : (T.sword || T.arm) ? 'sword_attack_2' : 'squelching_1', 0.45, this.boss ? 0.7 : 1); }
    this.vel.x = o.lunge && k > w0 - 0.1 && k < A.wins[0].b ? this.facing * o.lunge : 0;
    if (k >= w0 && !A.fired) { A.fired = true; o.fire?.(this, P); }
    for (const w of A.wins) if (!w.done && k >= w.a && k <= w.b && !o.noHit) {
      const hb = { x0: this.pos.x + (this.facing > 0 ? -0.2 : -A.reach), x1: this.pos.x + (this.facing > 0 ? A.reach : 0.2), y0: this.pos.y + (o.low ? 0 : 0.2), y1: this.pos.y + (o.low ? 1.0 : T.h + 0.4) };
      const pa = P.aabb;
      if (hb.x0 < pa.x1 && hb.x1 > pa.x0 && hb.y0 < pa.y1 && hb.y1 > pa.y0) {
        const r = P.takeHit(Math.round(A.dmg), this.pos.x, o.elem || (T.venom ? 'poison' : null), this); if (r) w.done = true;
        if (r === 'block' && !this.boss) { this.state = 'stagger'; this.t = 0; this.vel.x = -this.facing * 2.5; this.play(T.anim.hit, 0.08, { once: true, restart: true }); return; }
      }
    }
    if (k >= 1) { this.state = 'chase'; this.t = 0; this.atk = null; this.cool = o.cool ?? ((this.boss ? 0.55 : 1.0) / (this.phase > 1 ? 1.3 : 1) + Math.random() * 0.6); o.done?.(this, P); }
  }

  // A place this body can actually stand near (x, around height y): on stone, clear of solids, not across a gate.
  safeSpot(x, y) {
    const rb = this.room.b, w = this.T.w / 2 + 0.2, solids = this.room.solids.filter(s => !s.gone && !s.oneway);
    for (const dx of [0, 1.5, -1.5, 3, -3, 5, -5, 8, -8]) {
      const nx = Math.max(rb.x0 + w + 0.8, Math.min(rb.x1 - w - 0.8, x + dx)); let fy = -1e9;
      for (const s of solids) if (s.kind !== 'ceil' && s.kind !== 'gate' && nx > s.x0 && nx < s.x1 && s.y1 <= y + 3 && s.y1 > fy) fy = s.y1;
      if (fy < rb.y0 - 0.6) continue;
      if (solids.some(s => nx + w > s.x0 && nx - w < s.x1 && fy + Math.min(this.T.h, 3) > s.y0 + 0.05 && fy < s.y1 - 0.05)) continue; // inside masonry
      if (solids.some(s => s.kind === 'gate' && s.x0 < Math.max(nx, this.pos.x) && s.x1 > Math.min(nx, this.pos.x))) continue;   // beyond a sealed gate
      if (this.g.hazardAt?.(nx, fy)) continue;
      return { x: nx, y: fy };
    }
    return null;
  }

  groundAhead(dir = this.facing) {
    const x = this.pos.x + dir * (this.T.w / 2 + 0.3), y = this.pos.y;
    if (x < this.room.b.x0 + 0.8 || x > this.room.b.x1 - 0.8) return false;
    for (const s of this.g.activeSolids()) { if (s.gone) continue; if (!s.oneway && x > s.x0 && x < s.x1 && s.y1 > y + 0.3 && s.y0 < y + 1.2) return false; }
    return this.g.activeSolids().some(s => !s.gone && x > s.x0 && x < s.x1 && Math.abs(s.y1 - y) < 0.3) && !this.g.hazardAt?.(x, y);
  }
  walk(dir, speed, anim, animSpeed = 1) {
    if (this.groundAhead(dir)) { this.vel.x = dir * speed; this.play(anim, 0.2, { speed: animSpeed }); return true; }
    this.vel.x = 0; this.play(this.T.anim.idle, 0.2); return false;
  }

  physics(dt) {
    if (this.state === 'buried' || this.state === 'under' || this.state === 'hang' || this.hidden) return;
    const flying = this.air && !this.dead;
    if (!flying) { this.vel.y -= 20 * dt; if (this.vel.y < -16) this.vel.y = -16; }
    this.pos.x += this.vel.x * dt; this.hitWall = false;
    const a = this.aabb, solids = this.g.activeSolids();
    for (const s of solids) {
      if (s.oneway || s.gone) continue;
      if (a.x1 > s.x0 && a.x0 < s.x1 && a.y1 > s.y0 + 0.01 && a.y0 < s.y1 - 0.25) { this.pos.x = (this.vel.x > 0 || (this.vel.x === 0 && this.pos.x < (s.x0 + s.x1) / 2)) ? s.x0 - this.T.w / 2 : s.x1 + this.T.w / 2; this.hitWall = true; this.vel.x = 0; }
    }
    const py = this.pos.y; this.pos.y += this.vel.y * dt; const b = this.aabb; this.ground = false;
    if (!flying || this.vel.y < 0) for (const s of solids) {
      if (s.gone || !(b.x1 > s.x0 && b.x0 < s.x1)) continue;
      if (flying && s.oneway) continue;
      if (this.vel.y <= 0 && py >= s.y1 - 0.3 && this.pos.y <= s.y1) { this.pos.y = s.y1; this.vel.y = 0; this.ground = true; }
    }
    const rb = this.room.b; if (this.pos.x < rb.x0 + 0.7) { this.pos.x = rb.x0 + 0.7; this.hitWall = true; } if (this.pos.x > rb.x1 - 0.7) { this.pos.x = rb.x1 - 0.7; this.hitWall = true; }
    if (this.pos.y < rb.y0 - 3) { this.pos.copy(this.home); this.vel.set(0, 0); } // fell out of the world: walk it back
  }

  sync(dt) {
    this.mixer.update(dt);
    const T = this.T, target = this.facing * (T.quad ? Math.PI / 2 - 0.22 : Math.PI / 2 - 0.42);
    this.yaw += (target - this.yaw) * Math.min(1, dt * (T.quad ? 6 : 10));
    this.root.position.set(this.pos.x, this.pos.y + (this.state === 'hang' ? T.h : 0), T.quad ? -0.3 : 0); this.model.rotation.y = this.yaw;
    this.root.rotation.z = this.state === 'hang' ? Math.PI : 0;
    // white = it was hit; a red heat building toward the blow = it is about to strike (held hot for the last fifth)
    // a cool rim keeps every foe readable against dark stone; a wind-up heats the rim to red and sets the weapon glowing,
    // with a flare at the hand for the last moment; a hit flashes the rim white. The body itself only takes a light tint.
    const f = this.flash > 0 ? 1 : 0, st = this.chill > 0 ? 2 : this.burn > 0 ? 3 : this.poison > 0 ? 4 : this.stun > 0 ? 5 : 0, w = f ? 0 : Math.min(1, this.warn || 0), key = f * 10 + st;
    this.warn = 0;
    if (f) { this.rim.col.copy(RIM_HIT); this.rim.k = 1.3; } else { this.rim.col.copy(RIM_COOL).lerp(RIM_HOT, Math.min(1, w * 1.3)); this.rim.k = 0.3 + w * 1.2; }
    if (key !== this._fx) { this._fx = key; const col = f ? 0xffffff : [0, 0, 0x2060a0, 0x802000, 0x206010, 0x504010][st]; for (const m of this.mats) if (m.emissive && !m.emissiveMap) { m.emissive.setHex(f || st ? col : m.userData.em); m.emissiveIntensity = f ? 0.25 : st ? 0.45 : m.userData.emI; } }
    const heat = Math.max(0, (w - 0.55) / 0.45); if (heat !== this._heat) { this._heat = heat; for (const m of this.weaponMats) { m.emissive.setHex(heat ? 0xff3a10 : m.userData.em); m.emissiveIntensity = heat * 1.4; } }
    if (w > 0.78 || this.flare?.visible) { if (!this.flare) { this.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff5020, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); this.root.add(this.flare); }
      const fl = this.flare; fl.visible = w > 0.78; if (fl.visible) { const at = this.hand ? this.hand.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(this.mouth.x, this.mouth.y, 0); this.root.worldToLocal(at); fl.position.copy(at); fl.position.z += 0.3; fl.scale.setScalar(0.7 + (w - 0.78) * 2.5); fl.material.opacity = (w - 0.78) / 0.22; } }
  }

  // ------------------------------------------------------------------------------------------------ taking hits
  // returns true if the blow connected (damaged or was parried)
  hit(hb, roll, P) {
    if (this.dead || this.hidden || ['buried', 'under'].includes(this.state) || hb.attack.hitIds.has(this.id)) return false;
    const a = this.aabb; if (!(hb.x0 < a.x1 && hb.x1 > a.x0 && hb.y0 < a.y1 && hb.y1 > a.y0)) return false;
    hb.attack.hitIds.add(this.id);
    if (this.spec.illusion) { this.g.fx.burst(this.cx, this.cy, 0xb090ff, 30, 5); audio.play('glass_ping_small', 0.6, 0.6); this.dead = true; this.gone = true; this.root.visible = false; return true; }
    const front = sgn(P.pos.x - this.pos.x) === this.facing, T = this.T;
    const low = P.crouch, high = !P.onGround && P.pos.y > this.pos.y + 0.5, sunder = P.d.echo === 'sunder' || hb.proj;
    if (T.block && front && (this.state === 'guard' || this.state === 'block') && !low && !high && !sunder) {
      this.state = 'block'; this.t = 0; this.play(T.anim.block, 0.06, { once: true, restart: true });
      this.g.fx.burst(this.pos.x + this.facing * 0.6, this.pos.y + 1.3, 0xfff0b0, 16, 4); audio.play('sword_parry_' + (1 + (Math.random() * 3 | 0)), 0.6);
      this.g.ui.dmg(this.pos.x, this.pos.y + T.h + 0.2, 'GUARD', 'crit'); if (!hb.proj) P.vel.x = -P.facing * 3; if (!this.g.flags.guardHint) { this.g.flags.guardHint = 1; this.g.ui.toast('Raised guard: strike low (crouch) or from above (jump)', 'magic'); } return true;
    }
    let mul = 1;
    if (T.armorFront && front && !high && !sunder) { mul = 1 - T.armorFront; this.g.fx.burst(this.pos.x + this.facing * T.w * 0.4, this.cy, 0xd0d8e0, 10, 4); audio.play('sword_blocked_1', 0.5); if (!this.g.flags.shellHint) { this.g.flags.shellHint = 1; this.g.ui.toast('Its shell turns the blade — strike from behind or above', 'magic'); } }
    if (this.stun > 0 && this.boss) mul *= 1.5;
    const base = Math.max(1, Math.round(roll.dmg * mul)); let total = base;
    this.g.ui.dmg(this.pos.x, this.pos.y + Math.min(T.h, 3.4) + 0.1, base, roll.crit ? 'crit' : '');
    for (const e of roll.elem) {
      total += e.dmg; const ex = this.pos.x + 0.3, ey = this.pos.y + Math.min(T.h, 3.4) + 0.5; setTimeout(() => this.g.ui.dmg(ex, ey, e.dmg, e.elem), 90);
      if (e.elem === 'ice') this.chill = 3; if (e.elem === 'poison') { this.poison = 2.5; this.poisonDmg = e.dmg * 0.3; } if (e.elem === 'fire') this.g.fx.burst(this.cx, this.cy, 0xff6a20, 14, 3);
      if (e.elem === 'lightning') this.g.chainLightning(this, e.dmg);
    }
    this.damage(total, null, false, roll.crit, hb.proj ? 0 : P.facing);
    const lp = P.d.leech; if (lp) P.heal(Math.max(1, Math.round(total * lp / 100)), true);
    return true;
  }

  damage(n, elem, quiet, crit, pushDir) {
    if (this.dead || this.invuln) return;
    this.hp -= n; this.flash = 0.08; if (pushDir) this.lastPush = pushDir; this.lastMelee = !quiet && !!pushDir;
    if (quiet) this.g.ui.dmg(this.pos.x + rnd(-0.3, 0.3), this.pos.y + Math.min(this.T.h, 3.4) + 0.2, Math.round(n), elem);
    if (!quiet) audio.play('sword_impact_hit_' + (1 + (Math.random() * 3 | 0)), 0.55);
    this.g.fx.burst(this.cx, this.cy, this.T.ai === 'stalker' ? 0xd0c8b0 : 0x8a0a14, quiet ? 4 : 10, 3);
    if (this.hp <= 0) return this.die();
    const heavy = this.boss || this.T.ai === 'brute' || this.T.ai === 'worm';
    const light = !this.boss && !this.T.mini && this.T.h <= 2.0 && !this.T.block, winding = this.state === 'attack' && this.atk && this.t / this.atk.dur < this.atk.wins[0].a;
    if (!quiet && !heavy && (this.state !== 'attack' || (light && winding)) && !this.air) { this.atk = null; this.state = 'hurt'; this.t = 0; this.vel.x = (pushDir || -this.facing) * (crit ? 4 : 2.2); this.play(this.T.anim.hit, 0.05, { once: true, restart: true }); }
    else if (!quiet && !heavy && this.air) { this.vel.x = (pushDir || -this.facing) * 3; }
    if (this.boss && !this.spec.illusion) {
      const ph = this.hp < this.hpMax * 0.33 && (this.T.moves || []).some(m => m.phase === 3) ? 3 : this.hp < this.hpMax * 0.6 ? 2 : 1;
      if (ph > this.phase) { this.phase = ph; this.mv = null; this.atk = null; this.state = 'intro'; this.t = 0; this.introT = 1.6; this.playFor(this.clipFor(this.T.anim.roar) || this.T.anim.idle, 1.6); this.invuln = true; setTimeout(() => this.invuln = false, 1200); if (this.flying) this.air = true; this.stun = 0; this.hidden = false; this.setAlpha(1); this.g.bossPhase?.(this, ph); }
      this.g.bossUpdate?.(this);
    }
  }

  die() {
    this.dead = true; this.state = 'dead'; this.t = 0; this.mv = null; this.atk = null; this.air = false; this.hidden = false; this.root.visible = true; this.setAlpha(1); this.root.rotation.z = 0;
    const d = this.clipFor(this.T.anim.death); if (d) this.play(d, 0.1, { once: true, restart: true });
    audio.play(this.boss ? 'rock_wall_2' : 'bone_snap', 0.5);
    if (!this.boss) { this.vel.x = (this.lastPush || -this.facing) * 4.5; if (!this.flying) this.vel.y = 3.2; if (this.lastMelee) this.g.stopT = Math.max(this.g.stopT || 0, 0.1); } // the kill freeze answers your own blade, not a poison tick
    this.g.onEnemyDeath(this);
  }

  shootAt(P, kind, o = {}) {
    const m = this.mouth, tx = P.pos.x, ty = P.pos.y + 1.0, a = Math.atan2(ty - m.y, tx - m.x) + (o.spread || 0), sp = SHOT_SPEED[kind] || 8;
    const dmg = Math.round((o.dmg ?? this.T.dmg * 0.8) * this.dmgMul);
    if (kind === 'bone' || kind === 'lob' || kind === 'acid') { const T2 = Math.max(0.7, Math.abs(tx - m.x) / 7), vx = (tx - m.x) / T2 + (o.spread || 0) * 6, vy = (ty - m.y) / T2 + 0.5 * 16 * T2; this.g.shoot({ x: m.x, y: m.y, vx, vy, grav: 16, kind, dmg, elem: kind === 'acid' ? 'poison' : null, src: this }); }
    else this.g.shoot({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind, dmg, elem: o.elem || (kind === 'orb' ? 'shadow' : kind === 'web' ? 'ice' : null), homing: kind === 'skull' ? 2.4 : 0, src: this, life: kind === 'skull' ? 5 : 3.2 });
    audio.play(kind === 'bolt' || kind === 'orb' ? 'fireball_' + (1 + (Math.random() * 3 | 0)) : kind === 'feather' ? 'bow_attack_1' : 'wave_attack_1', 0.35, 1.2);
  }
}

// ==================================================================================================== brains
const BRAIN = {
  walker(e, dt, P, c) {
    const T = e.T;
    if (!c.sees) { e.vel.x = 0; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (T.block && c.adx < 3.6 && e.cool <= 0 && Math.random() < 0.012) { e.state = 'guard'; e.t = 0; e.play(T.anim.block, 0.12, { restart: true }); e.g.fx.glint(e.pos.x + e.facing * 0.5, e.pos.y + 1.2, 0x8ab0ff); e.g.guardRing?.(e); audio.play('sword_blocked_2', 0.3, 1.3); return; }
    if (c.adx < T.reach + 0.3 && Math.abs(c.dy) < 2 && e.cool <= 0) { const r = Math.random(); return e.attackStart({ anim: r < 0.35 && T.anim.attack2 ? T.anim.attack2 : r < 0.5 && T.anim.attack3 ? T.anim.attack3 : T.anim.attack }); }
    if (T.lunge && c.adx > 2.6 && c.adx < 5.5 && Math.abs(c.dy) < 1.5 && e.cool <= 0 && Math.random() < 0.03) return e.attackStart({ anim: T.anim.attack2 || T.anim.attack, lunge: T.lunge, reach: T.reach + 0.4 });
    if (c.adx > T.reach * 0.8) e.walk(e.facing, T.speed * c.slow, T.anim.walk, 1.1); else { e.vel.x = 0; e.play(T.anim.idle); }
  },

  brute(e, dt, P, c) {
    const T = e.T;
    if (!c.sees) { e.vel.x = 0; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 3) {
      if (T.slam && c.adx < 7 && c.adx > T.reach * 0.6 && Math.random() < 0.02) return e.attackStart({ anim: T.anim.attack3 || T.anim.attack2 || T.anim.attack, noHit: true, dur: T.atkDur * 1.15, fire: s => { s.g.shockwave(s, s.pos.x + s.facing * 1.4, s.pos.y, s.facing, T.elem); s.g.shockwave(s, s.pos.x - s.facing * 1.0, s.pos.y, -s.facing, T.elem); } });
      if (c.adx < T.reach + 0.3) return e.attackStart({ anim: Math.random() < 0.4 && T.anim.attack2 ? T.anim.attack2 : T.anim.attack });
    }
    if (c.adx > T.reach * 0.8) e.walk(e.facing, T.speed * c.slow, T.anim.walk); else { e.vel.x = 0; e.play(T.anim.idle); }
  },

  hopper(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'crouch') { e.vel.x = 0; e.warn = e.t / 0.25; e.tilt.position.y = -Math.min(1, e.t / 0.25) * T.h * 0.08; if (e.t > 0.25) { e.tilt.position.y = 0; e.state = 'leap'; e.t = 0; e.leapHit = false; e.vel.set(e.leapV.x, e.leapV.y); e.ground = false; e.play(e.clipFor(T.anim.jump) || T.anim.attack, 0.08, { once: true, restart: true }); audio.play('clothing_1', 0.3, 1.5); } return; }
    if (e.state === 'leap') { if (e.ground && e.t > 0.2) { e.state = 'chase'; e.t = 0; e.cool = 0.5 + Math.random() * 0.6; e.vel.x = 0; } else if (!e.leapHit) { const a = e.aabb, pa = P.aabb; if (a.x0 < pa.x1 && a.x1 > pa.x0 && a.y0 < pa.y1 && a.y1 > pa.y0) { if (P.takeHit(T.dmg, e.pos.x, null, e)) e.leapHit = true; } } return; }
    if (e.state === 'flee') { if (e.t > 0.7 || !e.walk(-sgn(c.dx), T.speed * 1.1, T.anim.walk, 1.3)) { e.state = 'chase'; e.t = 0; } e.facing = -sgn(c.dx); return; }
    if (!c.sees) { e.vel.x = 0; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 2.5) {
      if (c.adx < T.reach + 0.2) return e.attackStart({ anim: Math.random() < 0.5 && T.anim.attack2 ? T.anim.attack2 : T.anim.attack, done: s => { if (Math.random() < 0.6) { s.state = 'flee'; s.t = 0; } } });
      if (T.thrower && c.adx > 4 && c.adx < 11 && Math.random() < 0.02) return e.attackStart({ anim: T.anim.attack2 || T.anim.attack, noHit: true, fire: (s, p) => s.shootAt(p, T.thrower), cool: 1.6 });
      if (c.adx > 2.2 && c.adx < 5.5 && e.ground && Math.random() < 0.035) { e.state = 'crouch'; e.t = 0; e.leapV = new THREE.Vector2(e.facing * Math.min(7.5, c.adx * 1.7), 7.2); e.play(T.anim.idle, 0.1); return; }
    }
    if (c.adx > T.reach * 0.7) e.walk(e.facing, T.speed * c.slow, T.anim.walk, 1.2); else { e.vel.x = 0; e.play(T.anim.idle); }
  },

  caster(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'blink') { const k = e.t / 0.7; e.setAlpha(Math.abs(1 - k * 2)); if (k >= 0.5 && !e.blinked) { e.blinked = true; const rb = e.room.b; let nx = P.pos.x + sgn(-c.dx || 1) * rnd(6, 8); if (nx < rb.x0 + 2 || nx > rb.x1 - 2) nx = P.pos.x - sgn(-c.dx || 1) * rnd(6, 8); const sp = e.safeSpot(nx, e.pos.y); if (sp && Math.abs(sp.y - e.pos.y) < 3.5) e.pos.set(sp.x, sp.y); e.g.fx.burst(e.cx, e.cy, 0xb070ff, 16, 3); } if (k >= 1) { e.setAlpha(1); e.state = 'chase'; e.t = 0; e.cool = 0.5; } return; }
    if (!c.sees) { e.vel.x = 0; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    e.sumT = (e.sumT || 4) - dt;
    if (e.cool <= 0) {
      if (T.blink && c.adx < 3.2 && Math.random() < 0.08) { e.state = 'blink'; e.t = 0; e.blinked = false; e.vel.x = 0; audio.play('wave_attack_2', 0.3, 1.5); return; }
      if (T.summon && e.sumT <= 0 && e.room.enemies.filter(x => x.summoner === e && !x.dead).length < 2) { e.sumT = 9; return e.attackStart({ anim: e.clipFor(T.anim.roar) || T.anim.attack2, noHit: true, dur: 1.4, fire: s => { for (const d of [-2.2, 2.2]) s.g.summon(s, T.summon, s.pos.x + d, s.pos.y); }, cool: 1.4 }); }
      if (c.adx < T.reach + 2) { const lob = T.shot === 'lob' || (T.anim.attack2 === 'lob' && Math.random() < 0.4); return e.attackStart({ anim: lob && T.anim.attack2 === 'lob' ? 'lob' : T.anim.attack, noHit: true, cool: 1.5 + Math.random(), fire: (s, p) => { const n = T.fan || 1; for (let i = 0; i < n; i++) s.shootAt(p, lob ? 'lob' : T.shot === 'lob' ? 'bolt' : T.shot, { spread: (i - (n - 1) / 2) * 0.22 }); } }); }
    }
    if (c.adx < 4.5 && !T.blink) e.walk(-e.facing, T.speed * c.slow, T.anim.walk); else if (c.adx > 9) e.walk(e.facing, T.speed * c.slow, T.anim.walk); else { e.vel.x = 0; e.play(T.anim.idle); }
  },

  flyer(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'hang') { e.pos.y = e.hangY - T.h - 0.05; e.play(T.anim.idle, 0, {}); if (e.cur) e.cur.timeScale = 0.15; if (c.adx < 6 && c.dy > -12 && c.dy < 2) { e.state = 'chase'; e.t = 0; if (e.cur) e.cur.timeScale = 1; audio.play('clothing_1', 0.4, 0.7); } return; }
    if (e.state === 'swoop') {
      const k = e.t / e.swT, u = 1 - k; e.pos.x = u * u * e.s0.x + 2 * u * k * e.s1.x + k * k * e.s2.x; e.pos.y = u * u * e.s0.y + 2 * u * k * e.s1.y + k * k * e.s2.y; e.vel.set(0, 0);
      if (!e.swHit && k > 0.25 && k < 0.75) { const a = e.aabb, pa = P.aabb; if (a.x0 < pa.x1 && a.x1 > pa.x0 && a.y0 < pa.y1 && a.y1 > pa.y0 && P.takeHit(T.dmg, e.pos.x, null, e)) e.swHit = true; }
      if (k >= 1) { e.state = 'chase'; e.t = 0; e.cool = 1.4 + Math.random(); }
      return;
    }
    if (!c.sees) { e.vel.x *= 0.9; e.vel.y = (e.home.y - e.pos.y) * 1.5; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    const hoverY = Math.max(P.pos.y + 2.6, e.home.y - 3) + Math.sin(e.g.time * 2.2 + e.id) * 0.5, wantX = P.pos.x - sgn(c.dx) * (T.shot ? 6 : 4);
    e.vel.x += (THREE.MathUtils.clamp((wantX - e.pos.x) * 1.6, -T.speed, T.speed) * c.slow - e.vel.x) * Math.min(1, dt * 3);
    e.vel.y += (THREE.MathUtils.clamp((hoverY - e.pos.y) * 2.5, -4, 4) - e.vel.y) * Math.min(1, dt * 4);
    e.play(T.anim.walk, 0.2);
    if (e.cool <= 0 && c.adx < 9) {
      if (T.shot && Math.random() < 0.5) return e.attackStart({ anim: T.anim.attack2 || T.anim.attack, noHit: true, cool: 1.6, fire: (s, p) => { for (const sp of [-0.15, 0, 0.15]) s.shootAt(p, T.shot, { spread: sp }); } });
      e.state = 'swoop'; e.t = 0; e.swHit = false; e.swT = 1.25; e.s0 = e.pos.clone(); e.s1 = new THREE.Vector2(P.pos.x, P.pos.y - 0.6); e.s2 = new THREE.Vector2(THREE.MathUtils.clamp(P.pos.x + sgn(c.dx) * 4.5, e.room.b.x0 + 1.5, e.room.b.x1 - 1.5), e.pos.y);
      e.playFor(T.anim.attack, 1.25); audio.play('wave_attack_1', 0.3, 0.8); e.g.fx.glint(e.cx, e.cy, 0xfff0c0);
    }
  },

  charger(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'paw') { e.vel.x = 0; e.warn = e.t / 0.7; if (e.t > 0.7) { e.state = 'charge'; e.t = 0; e.chHit = false; e.play(T.anim.run, 0.1, { speed: 1.4 }); } return; }
    if (e.state === 'charge') {
      e.vel.x = e.facing * 8.5 * c.slow; if (Math.random() < 0.4) e.g.fx.dust(e.pos.x - e.facing * 0.5, e.pos.y);
      const a = e.aabb, pa = P.aabb; if (!e.chHit && a.x0 - 0.3 < pa.x1 && a.x1 + 0.3 > pa.x0 && a.y0 < pa.y1 && a.y1 > pa.y0) { const r = P.takeHit(Math.round(T.dmg * 1.2), e.pos.x, null, e); if (r) e.chHit = true; if (r === 'block') { e.stun = 1.2; e.stunStars = true; e.vel.x = -e.facing * 3; } }
      if (e.hitWall || !e.groundAhead() || e.t > 1.6) { if (e.hitWall) { e.stun = 1.3; e.stunStars = true; e.g.shake(0.2); audio.play('rock_wall_1', 0.4); e.play(T.anim.hit, 0.1, { once: true, restart: true }); } e.state = 'chase'; e.t = 0; e.cool = 1.2; e.vel.x = 0; }
      return;
    }
    if (!c.sees) { e.vel.x = 0; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 1.6) {
      if (c.adx < T.reach + 0.2) return e.attackStart({ anim: Math.random() < 0.5 && T.anim.attack2 ? T.anim.attack2 : T.anim.attack });
      if (c.adx > 4 && c.adx < 11 && Math.random() < 0.03) { e.state = 'paw'; e.t = 0; e.play(e.clipFor(T.anim.roar) || T.anim.idle, 0.1, { restart: true, speed: 2.2 }); e.g.fx.glint(e.cx, e.pos.y + T.h, 0xff5040); audio.play('crowd_gasp', 0.2, 1.6); return; }
    }
    if (c.adx > T.reach * 0.8) e.walk(e.facing, T.speed * c.slow, T.anim.walk); else { e.vel.x = 0; e.play(T.anim.idle); }
  },

  // Weeping-angel mannequins: statues while watched, sprinters when your back is turned.
  stalker(e, dt, P, c) {
    const T = e.T, watched = sgn(e.pos.x - P.pos.x) === P.facing && c.adx > 1.4;
    if (!c.sees) { e.vel.x = 0; if (e.cur) e.cur.paused = true; e.state = 'idle'; return; }
    e.state = 'chase';
    if (watched) { e.vel.x = 0; if (e.cur) e.cur.paused = true; return; }
    if (e.cur) e.cur.paused = false; e.facing = sgn(c.dx);
    if (c.adx < T.reach + 0.2 && Math.abs(c.dy) < 2 && e.cool <= 0) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack, cool: 0.8 });
    if (c.adx > T.reach * 0.7) { if (e.walk(e.facing, T.speed * c.slow, T.anim.walk, 1.6) && Math.random() < 0.2) audio.play('wood_walk_' + (1 + (Math.random() * 5 | 0)), 0.25, 1.4); } else e.vel.x = 0;
  },

  // Night demons: fade out, reappear at your back.
  lurker(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'vanish') { const k = e.t / 0.9; e.vel.x = 0; e.setAlpha(Math.max(0.04, Math.abs(1 - k * 2))); e.hidden = k > 0.25 && k < 0.75;
      if (k >= 0.5 && !e.blinked) { e.blinked = true; const sp = e.safeSpot(P.pos.x - P.facing * 2.4, P.pos.y); if (sp) e.pos.set(sp.x, sp.y); e.facing = sgn(P.pos.x - e.pos.x); e.g.fx.burst(e.cx, e.cy, 0x7030c0, 20, 3); audio.play('wave_attack_2', 0.4, 0.6); }
      if (k >= 1) { e.setAlpha(1); e.hidden = false; e.attackStart({ anim: T.anim.attack, dur: T.atkDur * 0.85, cool: 1.4 }); } return; }
    if (!c.sees) { e.vel.x = 0; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx); e.vanT = (e.vanT ?? 2.5) - dt;
    if (e.cool <= 0) {
      if (c.adx < T.reach + 0.2 && Math.abs(c.dy) < 2) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack3 || T.anim.attack });
      if (e.vanT <= 0 && c.adx > 3) { e.vanT = 4 + Math.random() * 2; e.state = 'vanish'; e.t = 0; e.blinked = false; return; }
    }
    if (c.adx > T.reach * 0.8) e.walk(e.facing, T.speed * 0.5 * c.slow, T.anim.walk); else { e.vel.x = 0; e.play(T.anim.idle); }
  },

  spider(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'crouch') { e.vel.x = 0; e.warn = e.t / 0.25; if (e.t > 0.25) { e.state = 'leap'; e.t = 0; e.leapHit = false; e.vel.set(e.leapV.x, e.leapV.y); e.ground = false; e.play(e.clipFor(T.anim.jump) || T.anim.attack, 0.08, { once: true, restart: true }); } return; }
    if (e.state === 'hang') { e.pos.y = e.hangY - T.h * 0.5; if (c.adx < 3.5 && c.dy < 0 && c.dy > -11) { e.state = 'leap'; e.t = 0; e.leapHit = false; e.vel.set(0, -2); e.pos.y = e.hangY - T.h - 0.1; audio.play('squelching_3', 0.4, 1.4); } return; }
    if (e.state === 'leap') { if (e.ground && e.t > 0.15) { e.state = 'chase'; e.t = 0; e.cool = 0.6 + Math.random() * 0.5; e.vel.x = 0; e.g.fx.dust(e.pos.x, e.pos.y); } else if (!e.leapHit) { const a = e.aabb, pa = P.aabb; if (a.x0 < pa.x1 && a.x1 > pa.x0 && a.y0 < pa.y1 && a.y1 > pa.y0 && P.takeHit(T.dmg, e.pos.x, T.venom ? 'poison' : null, e)) e.leapHit = true; } return; }
    if (!c.sees) { e.vel.x = 0; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 3) {
      if (c.adx < T.reach) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack });
      if (c.adx > 2.5 && c.adx < 7 && e.ground && Math.random() < 0.04) { e.state = 'crouch'; e.t = 0; e.leapV = new THREE.Vector2(e.facing * Math.min(9, c.adx * 1.5), 8); e.play(T.anim.idle, 0.1); return; }
    }
    if (c.adx > T.reach * 0.7) e.walk(e.facing, T.speed * c.slow, e.clipFor(T.anim.run) || T.anim.walk, 1.2); else { e.vel.x = 0; e.play(T.anim.idle); }
  },

  // Borers: travel under the floor, erupt beneath you, linger, burrow again.
  worm(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'under') {
      e.root.visible = false;
      if (!c.sees || Math.abs(c.dy) > 3) return;
      const rb = e.room.b; e.pos.x = THREE.MathUtils.clamp(e.pos.x + sgn(c.dx) * Math.min(c.adx, T.speed * 1.6 * dt), rb.x0 + 1.5, rb.x1 - 1.5);
      if (Math.random() < 0.5) e.g.fx.dust(e.pos.x + rnd(-0.5, 0.5), e.pos.y, 0x4a4036);
      e.undT = (e.undT ?? 1.2) - dt;
      if (c.adx < 1.2 && e.undT <= 0 && e.g.floorBelow(e.pos.x, e.pos.y + 0.6) > e.pos.y - 0.6) { e.state = 'emerge'; e.t = 0; e.root.visible = true; e.facing = sgn(c.dx || 1); e.playFor(e.clipFor(T.anim.emerge) || T.anim.idle, 0.9); e.g.shake(0.25); audio.play('rock_wall_1', 0.5, 1.2); e.g.erupt({ x: e.pos.x, y: e.pos.y, delay: 0.25, w: 1.3, h: 3.2, dmg: T.dmg, src: e, col: 0x8a7a60, quiet: true }); }
      return;
    }
    if (e.state === 'emerge') { if (e.t > 0.9) { e.state = 'chase'; e.t = 0; e.upT = 4; e.cool = 0.5; } return; }
    if (e.state === 'burrow') { if (e.t > 0.8) { e.state = 'under'; e.t = 0; e.undT = 1.6; e.root.visible = false; } return; }
    e.state = 'chase'; e.vel.x = 0; e.facing = sgn(c.dx); e.upT -= dt;
    if (e.upT <= 0) { e.state = 'burrow'; e.t = 0; e.playFor(e.clipFor(T.anim.burrow) || T.anim.idle, 0.8); e.g.fx.dust(e.pos.x, e.pos.y, 0x4a4036); return; }
    if (e.cool <= 0) {
      if (c.adx < T.reach && Math.abs(c.dy) < 3.5) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack });
      if (c.adx < 11) return e.attackStart({ anim: e.clipFor(T.anim.breath) || T.anim.attack2, noHit: true, cool: 1.2, fire: (s, p) => { for (const sp of [-0.12, 0.12]) s.shootAt(p, 'acid', { spread: sp }); } });
    }
    e.play(T.anim.idle);
  },

  breather(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'breath') { e.vel.x = 0; const k = e.t / 1.5; if (k > 0.3 && k < 0.9) e.g.breathCone(e, 4.6, T.elem, T.dmg * 0.45, dt); if (k >= 1) { e.state = 'chase'; e.t = 0; e.cool = 1.6; } return; }
    if (!c.sees) { e.vel.x = 0; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 2) {
      if (c.adx < T.reach) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack });
      if (c.adx > 1.8 && c.adx < 5 && Math.random() < 0.05) { e.state = 'breath'; e.t = 0; e.playFor(e.clipFor(T.anim.breath) || T.anim.attack, 1.5); e.g.fx.glint(e.mouth.x, e.mouth.y, ELEM_COL[T.elem]); audio.play(T.elem === 'ice' ? 'ice_barrage_1' : 'firespray_1', 0.4); return; }
    }
    if (c.adx > T.reach * 0.8) e.walk(e.facing, T.speed * c.slow, T.anim.walk, 1.1); else { e.vel.x = 0; e.play(T.anim.idle); }
  },

  // ---------------------------------------------------------------------------------------- bosses
  boss(e, dt, P, c) {
    const T = e.T, rb = e.room.b;
    if (!e.awake) { if (c.sees && c.adx < 14) { e.awake = true; e.state = 'intro'; e.t = 0; e.introT = 2.4; e.facing = sgn(c.dx); e.playFor(e.clipFor(T.anim.roar) || T.anim.idle, 2.2); audio.play('crowd_gasp', 0.4, 0.6); e.g.bossStart(e); } else e.play(T.anim.idle); return; }
    if (e.mv) { if (MOVE[e.mv.m.k](e, e.mv, dt, P, c)) { e.mv = null; e.state = 'chase'; e.t = 0; e.cool = (0.7 + Math.random() * 0.5) / (1 + (e.phase - 1) * 0.35); if (!e.air) e.vel.x = 0; } return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.air) { // hover in the upper arena, drifting toward a point off the player's shoulder
      const fy = e.arenaFloor ?? (e.arenaFloor = e.home.y), hy = fy + (T.dragon ? 6.2 : 4.6) + Math.sin(e.g.time * 1.6) * 0.5, wantX = THREE.MathUtils.clamp(P.pos.x - sgn(c.dx) * (T.dragon ? 7 : 5), rb.x0 + 3, rb.x1 - 3);
      e.vel.x += (THREE.MathUtils.clamp((wantX - e.pos.x) * 1.4, -T.speed, T.speed) - e.vel.x) * Math.min(1, dt * 2.5); e.vel.y += (THREE.MathUtils.clamp((hy - e.pos.y) * 2.5, -5, 5) - e.vel.y) * Math.min(1, dt * 4);
      e.play(e.clipFor(T.anim.fly) || T.anim.walk, 0.3);
    } else if (c.adx > T.reach * 0.75) e.walk(e.facing, T.speed * c.slow * (c.adx > 7 ? 1.7 : 1), c.adx > 7 && e.clipFor(T.anim.run) ? T.anim.run : T.anim.walk);
    else { e.vel.x = 0; e.play(T.anim.idle, 0.25); }
    if (e.cool > 0) return;
    e.aboveT = (P.pos.y > e.pos.y + Math.max(2.2, T.h * 0.8) && !e.air) ? (e.aboveT || 0) + dt + Math.max(0, e.cool) * 0 : 0; const reachUp = e.aboveT > 1.2, UP = ['leap', 'volley', 'fan', 'rain', 'pillars', 'roots', 'wave', 'blink', 'suns', 'takeoff', 'summon'];
    const ok = T.moves.filter(m => (!e.spec.illusion || m.k === 'volley' || m.k === 'fan') && (!reachUp || UP.includes(m.k) || !T.moves.some(q => UP.includes(q.k) && (q.phase || 1) <= e.phase)) && (m.phase || 1) <= e.phase && (reachUp || ((!m.min || c.adx >= m.min) && (!m.range || c.adx <= m.range))) && (T.dragon && T.fly ? (e.air ? m.air : !m.air) : true) && m !== e.lastMove && !(m.k === 'summon' && e.room.enemies.filter(x => x.summoner === e && !x.dead).length >= m.max));
    if (!ok.length) { e.lastMove = null; return; }
    let tot = ok.reduce((s, m) => s + m.w * ((m.phase || 1) === e.phase && e.phase > 1 ? 1.6 : 1), 0), r = Math.random() * tot, m = ok[0];
    for (const o of ok) { r -= o.w * ((o.phase || 1) === e.phase && e.phase > 1 ? 1.6 : 1); if (r <= 0) { m = o; break; } }
    e.lastMove = m; const dur = (m.dur || T.atkDur) / (e.phase >= 3 ? 1.15 : 1);
    e.mv = { m, t: 0, dur, s: {} }; e.state = 'move'; e.vel.x = 0;
    const anim = e.clipFor(m.anim) || e.clipFor(T.anim.attack);
    if (['charge', 'ram', 'strafe'].includes(m.k)) e.play(anim, 0.15, { restart: true, speed: 1.3 }); else e.playFor(anim, dur);
    e.g.fx.glint(e.pos.x + e.facing * 0.5, e.pos.y + Math.min(T.h, 3.5) * 0.85, 0xff4040);
  },
};

// Each move: (e, mv, dt, P, c) => true when finished. mv = { m, t, dur, s }
const hitBox = (e, P, x0, x1, y0, y1, dmg, elem) => { const pa = P.aabb; return x0 < pa.x1 && x1 > pa.x0 && y0 < pa.y1 && y1 > pa.y0 && P.takeHit(Math.round(dmg * e.dmgMul), e.pos.x, elem, e); };
const frontBox = (e, P, reach, low, dmg, elem) => hitBox(e, P, e.pos.x + (e.facing > 0 ? -0.3 : -reach), e.pos.x + (e.facing > 0 ? reach : 0.3), e.pos.y, e.pos.y + (low ? 1.0 : Math.max(2.4, e.T.h * 0.9)), dmg, elem);
const MOVE = {
  melee(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, m = mv.m, [a, b] = m.windup || e.T.windup;
    if (k < a) e.warn = Math.max(e.warn || 0, k / a);
    if (k >= a && !mv.s.snd) { mv.s.snd = 1; audio.play('sword_attack_3', 0.5, 0.7); if (m.shock) { e.g.shockwave(e, e.pos.x + e.facing * 2, e.pos.y, e.facing, e.T.elem); e.g.shake(0.3); } }
    if (k >= a && k <= b && !mv.s.hit && frontBox(e, P, (m.range || e.T.reach) - 0.2, m.low, e.T.dmg, e.T.venom ? 'poison' : null)) mv.s.hit = 1;
    return k >= 1;
  },
  multi(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, m = mv.m;
    m.hits.forEach((h, i) => { if (k >= h - 0.04 && k <= h + 0.07 && !mv.s['h' + i]) { if (!mv.s['s' + i]) { mv.s['s' + i] = 1; audio.play('squelching_1', 0.5, 0.8); } if (frontBox(e, P, (m.range || e.T.reach) - 0.2, false, e.T.dmg * 0.8)) mv.s['h' + i] = 1; } });
    return k >= 1;
  },
  charge(e, mv, dt, P, c) {
    mv.t += dt; const m = mv.m, wind = 0.55;
    if (mv.t < wind) { e.vel.x = -e.facing * 0.6; e.warn = mv.t / wind; mv.s.x0 = e.pos.x; return false; }
    if (!mv.s.go) { mv.s.go = 1; audio.play('crowd_gasp', 0.3, 0.5); }
    e.vel.x = e.facing * m.speed; if (Math.random() < 0.6) { if (e.boss) e.g.fx.puff(e.pos.x - e.facing * e.T.w * 0.4, e.pos.y); else e.g.fx.dust(e.pos.x - e.facing * e.T.w * 0.4, e.pos.y); } // a boss's charge throws up soft warm dust
    const a = e.aabb; if (!mv.s.hit && hitBox(e, P, a.x0 - 0.3, a.x1 + 0.3, a.y0, Math.min(a.y1, a.y0 + 1.8), e.T.dmg * 1.25)) mv.s.hit = 1;
    if (e.hitWall) { e.g.shake(0.5); audio.play('rock_wall_2', 0.6); e.g.fx.dust(e.pos.x + e.facing, e.pos.y, 0x9a9080); if (m.k === 'ram') { e.stun = 2.6; e.stunStars = true; e.g.ui.dmg(e.pos.x, e.pos.y + e.T.h + 0.4, 'STUNNED', 'crit'); e.play(e.T.anim.idle, 0.2); } return true; }
    return (m.k !== 'ram' && Math.abs(e.pos.x - mv.s.x0) > (m.range || 14)) || mv.t > (m.k === 'ram' ? 4 : 2.6) || (sgn(P.pos.x - e.pos.x) !== e.facing && Math.abs(P.pos.x - e.pos.x) > 3.5 && m.k !== 'ram'); // a ram runs on to the wall
  },
  ram(e, mv, dt, P, c) { return MOVE.charge(e, mv, dt, P, c); },
  leap(e, mv, dt, P, c) {
    mv.t += dt; const m = mv.m, wind = 0.45, air = 0.95;
    if (mv.t < wind) { e.warn = mv.t / wind; return false; }
    if (!mv.s.go) { mv.s.go = 1; const rb = e.room.b, tx = THREE.MathUtils.clamp(P.pos.x, rb.x0 + 2, rb.x1 - 2); e.vel.set((tx - e.pos.x) / air, 20 * air / 2); e.ground = false; mv.s.tx = tx; audio.play('clothing_1', 0.5, 0.6); e.g.erupt({ x: tx, y: e.pos.y, delay: air, w: 4.8, h: 0.3, dmg: 0, col: 0xff4040, src: e, quiet: true }); return false; }
    if (!e.ground || mv.t < wind + 0.2) { e.vel.x = (mv.s.tx - e.pos.x) > 0 === e.vel.x > 0 ? e.vel.x : 0; return false; }
    if (!mv.s.land) { mv.s.land = mv.t; e.vel.x = 0; e.g.shake(0.45); e.g.fx.dust(e.pos.x, e.pos.y); audio.play('rock_wall_1', 0.6); hitBox(e, P, e.pos.x - 2.4, e.pos.x + 2.4, e.pos.y, e.pos.y + 1.6, e.T.dmg * 1.1); if (m.slamOnLand) { e.g.shockwave(e, e.pos.x + 1.4, e.pos.y, 1, e.T.elem); e.g.shockwave(e, e.pos.x - 1.4, e.pos.y, -1, e.T.elem); } }
    return mv.t - mv.s.land > 0.55;
  },
  slam(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, a = (mv.m.windup || e.T.windup)[0];
    if (k < a) e.warn = Math.max(e.warn || 0, k / a);
    if (k >= a && !mv.s.f) { mv.s.f = 1; const el = mv.m.elem || e.T.elem; e.g.shockwave(e, e.pos.x + e.facing * 1.6, e.pos.y, e.facing, el); e.g.shockwave(e, e.pos.x - e.facing * 1.2, e.pos.y, -e.facing, el); e.g.shake(0.5); frontBox(e, P, e.T.reach, false, e.T.dmg); if (e.phase > 1) setTimeout(() => { if (!e.dead) { e.g.shockwave(e, e.pos.x + 1.6, e.pos.y, 1, el); e.g.shockwave(e, e.pos.x - 1.6, e.pos.y, -1, el); } }, 450); }
    return k >= 1;
  },
  breath(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur;
    if (k > 0.28 && k < 0.86) { if (!mv.s.snd) { mv.s.snd = 1; audio.play(mv.m.elem === 'ice' ? 'ice_barrage_2' : mv.m.elem === 'poison' ? 'waterspray_1' : 'firespray_2', 0.6); } e.g.breathCone(e, Math.min(mv.m.range || 10, 11), mv.m.elem, e.T.dmg * 0.4, dt); }
    return k >= 1;
  },
  // a wall of breath marches the whole floor: get onto a ledge
  sweep(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, rb = e.room.b;
    if (k > 0.25 && k < 0.92) { const u = (k - 0.25) / 0.67, far = e.facing > 0 ? rb.x1 - 1 : rb.x0 + 1, x = e.pos.x + e.facing * 2 + (far - (e.pos.x + e.facing * 2)) * u; e.g.flameWall(e, x, e.arenaFloor ?? e.home.y, mv.m.elem, e.T.dmg * 0.6, dt); if (!mv.s.snd) { mv.s.snd = 1; audio.play('fire_big', 0.6); } }
    return k >= 1;
  },
  volley(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, n = mv.m.n, i = Math.floor((k - 0.35) / 0.5 * n);
    if (k >= 0.35 && i >= (mv.s.i ?? 0) && (mv.s.i ?? 0) < n) { mv.s.i = (mv.s.i ?? 0) + 1; e.shootAt(P, mv.m.shot, { spread: rnd(-0.12, 0.12) }); }
    return k >= 1;
  },
  fan(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, n = mv.m.n;
    if (k >= 0.5 && !mv.s.f) { mv.s.f = 1; for (let i = 0; i < n; i++) e.shootAt(P, mv.m.shot, { spread: (i - (n - 1) / 2) * 0.2 }); }
    return k >= 1;
  },
  wave(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, n = mv.m.n, i = Math.floor((k - 0.4) / 0.45 * n);
    if (k >= 0.4 && i >= (mv.s.i ?? 0) && (mv.s.i ?? 0) < n) { const hi = (mv.s.i ?? 0) % 2; mv.s.i = (mv.s.i ?? 0) + 1; e.g.shoot({ x: e.pos.x + e.facing * 1.5, y: e.pos.y + (hi ? 2.6 : 0.7), vx: e.facing * 10, vy: 0, kind: 'crescent', dmg: Math.round(e.T.dmg * 0.8 * e.dmgMul), src: e, life: 3 }); audio.play('wave_attack_2', 0.5, 0.7); }
    return k >= 1;
  },
  rain(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, n = mv.m.n, i = Math.floor((k - 0.25) / 0.65 * n), rb = e.room.b;
    if (k >= 0.25 && i >= (mv.s.i ?? 0) && (mv.s.i ?? 0) < n) { mv.s.i = (mv.s.i ?? 0) + 1; const x = THREE.MathUtils.clamp(P.pos.x + rnd(-7, 7), rb.x0 + 1, rb.x1 - 1), fy = e.arenaFloor ?? e.home.y; e.g.rainShot(e, x, fy, mv.m.shot, mv.m.elem || e.T.elem, e.T.dmg * 0.7 * e.dmgMul); }
    return k >= 1;
  },
  pillars(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur;
    if (k >= 0.35 && !mv.s.f) { mv.s.f = 1; const fy = e.arenaFloor ?? e.home.y, rb = e.room.b; for (let i = 0; i < mv.m.n; i++) { const x = e.pos.x + e.facing * (2.4 + i * 2.3); if (x > rb.x0 + 1 && x < rb.x1 - 1) e.g.erupt({ x, y: fy, delay: 0.55 + i * 0.16, w: 1.5, h: 5, dmg: e.T.dmg * 0.8 * e.dmgMul, elem: mv.m.elem, src: e }); } }
    return k >= 1;
  },
  roots(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, n = mv.m.n, i = Math.floor(k * n);
    if (i >= (mv.s.i ?? 0) && (mv.s.i ?? 0) < n) { mv.s.i = (mv.s.i ?? 0) + 1; e.g.erupt({ x: P.pos.x + P.vel.x * 0.3, y: e.arenaFloor ?? e.home.y, delay: 0.7, w: 1.6, h: 3.4, dmg: e.T.dmg * 0.7 * e.dmgMul, elem: 'poison', col: 0x2a4a1a, src: e }); }
    return k >= 1;
  },
  summon(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur;
    if (k >= 0.5 && !mv.s.f) { mv.s.f = 1; const rb = e.room.b; for (const d of [-3.5, 3.5]) { const x = THREE.MathUtils.clamp(e.pos.x + d, rb.x0 + 2, rb.x1 - 2); e.g.summon(e, mv.m.what, x, TYPES[mv.m.what].ai === 'flyer' ? (e.arenaFloor ?? e.home.y) + 5 : (e.arenaFloor ?? e.home.y)); } audio.play('spell_impact_3', 0.5, 0.7); }
    return k >= 1;
  },
  blink(e, mv, dt, P, c) {
    mv.t += dt; const k = mv.t / mv.dur; e.setAlpha(Math.max(0.05, Math.abs(1 - k * 2))); e.hidden = k > 0.3 && k < 0.7;
    if (k >= 0.5 && !mv.s.f) { mv.s.f = 1; const rb = e.room.b, fy = e.arenaFloor ?? e.home.y; let nx = Math.random() < 0.5 ? P.pos.x - P.facing * 3 : (P.pos.x < (rb.x0 + rb.x1) / 2 ? rb.x1 - 6 : rb.x0 + 6); if (e.air) e.pos.x = THREE.MathUtils.clamp(nx, rb.x0 + 2, rb.x1 - 2); else { const sp = e.safeSpot(nx, fy); if (sp) e.pos.set(sp.x, sp.y); } e.facing = sgn(P.pos.x - e.pos.x); e.g.fx.burst(e.cx, e.cy, 0xb070ff, 30, 5); audio.play('wave_attack_2', 0.5, 0.6); }
    if (k >= 1) { e.setAlpha(1); e.hidden = false; }
    return k >= 1;
  },
  // the Archivist hides among copies of himself; the true one is the only one that casts a shadow-bright halo when struck
  mirror(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur; e.setAlpha(Math.max(0.05, Math.abs(1 - k * 2)));
    if (k >= 0.5 && !mv.s.f) { mv.s.f = 1; const rb = e.room.b, fy = e.arenaFloor ?? e.home.y, n = mv.m.n, slots = []; for (let i = 0; i <= n; i++) slots.push(rb.x0 + 4 + (rb.x1 - rb.x0 - 8) * (i + 0.5) / (n + 1)); slots.sort(() => Math.random() - 0.5); const s0 = e.safeSpot(slots[0], fy); if (s0) e.pos.set(s0.x, s0.y); for (let i = 1; i <= n; i++) { const si = e.safeSpot(slots[i], fy); if (si) e.g.summon(e, e.spec.t, si.x, si.y, { illusion: true }); } e.g.fx.burst(e.cx, e.cy, 0xb070ff, 30, 5); audio.play('glass_ping_small', 0.6, 0.5); }
    if (k >= 1) e.setAlpha(1);
    return k >= 1;
  },
  suns(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur;
    if (k >= 0.4 && !mv.s.f) { mv.s.f = 1; e.g.hollowSuns(e, mv.m.n); audio.play('firebuff_2', 0.6, 0.6); }
    return k >= 1;
  },
  // ---- flyers
  swoop(e, mv, dt, P) {
    if (!mv.s.p0) { const rb = e.room.b; mv.s.p0 = e.pos.clone(); mv.s.p1 = new THREE.Vector2(P.pos.x, P.pos.y - 1.2); mv.s.p2 = new THREE.Vector2(THREE.MathUtils.clamp(P.pos.x + e.facing * 8, rb.x0 + 3, rb.x1 - 3), e.pos.y); audio.play('wave_attack_1', 0.5, 0.6); }
    mv.t += dt; const k = Math.min(1, mv.t / mv.dur), u = 1 - k, s = mv.s; e.vel.set(0, 0);
    e.pos.set(u * u * s.p0.x + 2 * u * k * s.p1.x + k * k * s.p2.x, u * u * s.p0.y + 2 * u * k * s.p1.y + k * k * s.p2.y);
    const a = e.aabb; if (!s.hit && k > 0.2 && k < 0.8 && hitBox(e, P, a.x0, a.x1, a.y0, a.y1, e.T.dmg)) s.hit = 1;
    return k >= 1;
  },
  divebomb(e, mv, dt, P) {
    mv.t += dt; const s = mv.s, fy = e.arenaFloor ?? e.home.y;
    if (mv.t < 0.7) { e.vel.set((P.pos.x - e.pos.x) * 3, (fy + 8 - e.pos.y) * 3); return false; }
    if (mv.t < 1.05) { e.vel.set(0, 0); e.warn = (mv.t - 0.7) / 0.35; if (!s.mark) { s.mark = 1; e.g.erupt({ x: e.pos.x, y: fy, delay: 0.45, w: 2.6, h: 0.3, dmg: 0, col: 0xff4040, src: e, quiet: true }); } return false; }
    if (!s.down) { e.vel.set(0, -26); const a = e.aabb; if (!s.hit && hitBox(e, P, a.x0, a.x1, a.y0 - 0.5, a.y1, e.T.dmg * 1.3)) s.hit = 1; if (e.pos.y <= fy + 0.2) { s.down = mv.t; e.pos.y = fy; e.vel.set(0, 0); e.air = false; e.g.shake(0.6); audio.play('rock_wall_2', 0.7); e.g.shockwave(e, e.pos.x + 1.2, fy, 1, e.T.elem); e.g.shockwave(e, e.pos.x - 1.2, fy, -1, e.T.elem); e.g.fx.dust(e.pos.x, fy); e.stunStars = true; e.play(e.clipFor(e.T.anim.hit) || e.T.anim.idle, 0.1, { once: true, restart: true }); } return false; }
    e.vel.set(0, 0); if (mv.t - s.down > (e.T.dragon ? 1.4 : 1.8)) { if (!(e.T.dragon && e.T.fly) || true) e.air = e.flying || e.T.fly; return true; }
    return false;
  },
  takeoff(e, mv, dt, P) { mv.t += dt; const k = mv.t / mv.dur; if (k > 0.45) { e.air = true; e.vel.y = 5; } if (k > 0.3 && !mv.s.f) { mv.s.f = 1; e.g.windPush(e, 9); audio.play('wave_attack_1', 0.7, 0.4); } return k >= 1; },
  land(e, mv, dt, P) { mv.t += dt; const fy = e.arenaFloor ?? e.home.y; e.vel.set(0, -7); if (e.pos.y <= fy + 0.15) { e.pos.y = fy; e.air = false; e.vel.set(0, 0); if (!mv.s.f) { mv.s.f = 1; e.g.shake(0.4); e.g.fx.dust(e.pos.x, fy); e.g.shockwave(e, e.pos.x + 2, fy, 1, e.T.elem); e.g.shockwave(e, e.pos.x - 2, fy, -1, e.T.elem); } } return mv.t >= mv.dur && !e.air; },
  // fly the length of the hall raking the floor below
  strafe(e, mv, dt, P) {
    const rb = e.room.b, s = mv.s, fy = e.arenaFloor ?? e.home.y; mv.t += dt;
    if (!s.dir) { s.dir = e.pos.x < (rb.x0 + rb.x1) / 2 ? 1 : -1; s.x1 = s.dir > 0 ? rb.x1 - 4 : rb.x0 + 4; audio.play('fire_big', 0.6, 1.3); }
    e.facing = s.dir; e.vel.set(s.dir * 11, (fy + 6.5 - e.pos.y) * 3);
    e.g.flameWall(e, e.pos.x + s.dir * 2.5, fy, mv.m.elem, e.T.dmg * 0.6, dt, 6);
    return (s.dir > 0 ? e.pos.x >= s.x1 : e.pos.x <= s.x1) || mv.t > 5;
  },
  buffet(e, mv, dt, P) { mv.t += dt; const k = mv.t / mv.dur; if (k > 0.35 && k < 0.8) { e.g.windPush(e, 16 * dt * 6); if (!mv.s.f) { mv.s.f = 1; audio.play('wave_attack_1', 0.7, 0.4); for (let i = 0; i < 5; i++) setTimeout(() => { if (!e.dead) e.g.shoot({ x: e.pos.x + e.facing * 2.5, y: e.pos.y + 0.8 + i * 0.8, vx: e.facing * 12, vy: 0, kind: 'gust', dmg: Math.round(e.T.dmg * 0.5), elem: e.T.elem, src: e, life: 2.2 }); }, i * 130); } } return k >= 1; },
};
