import * as THREE from 'three';
import { cloneGLTF, weaponModel, audio } from './assets.js';
import { fitHeight } from './world.js';

export const TYPES = {
  zombie: { files: ['assets/monsters/zombie/zombie_1.glb', 'assets/monsters/zombie/zombie_3.glb', 'assets/monsters/zombie/zombie_5.glb'], h: 1.78, w: 0.7, hp: 30, dmg: 9, touch: 5, speed: 0.85, reach: 1.1, xp: 12, lvl: 1, name: 'Shambler',
    anim: { idle: 'Zombie_Idle_Loop', walk: 'walk_shamble', attack: 'attack_rake', hit: 'Hit_Chest', death: 'Death01', rise: 'LayToIdle' }, windup: [0.32, 0.62], atkDur: 1.25, aggro: 9 },
  knight: { files: ['assets/armor/velscour_knight.glb'], h: 1.9, w: 0.75, hp: 72, dmg: 16, touch: 6, speed: 1.7, reach: 1.7, xp: 34, lvl: 2, name: 'Velscour Knight', sword: 'iron_sword', block: 0.35,
    anim: { idle: 'Sword_Idle', walk: 'Walk_Loop', attack: 'Sword_Regular_A', attack2: 'Sword_Regular_B', hit: 'Hit_Chest', death: 'Death01', block: 'Sword_Block' }, windup: [0.38, 0.62], atkDur: 1.0, aggro: 11 },
  possessed: { files: ['assets/monsters/tripo/possessed_knight_1.glb'], h: 2.75, w: 1.2, hp: 340, dmg: 22, touch: 10, speed: 2.0, reach: 2.4, xp: 260, lvl: 5, name: 'Oathbreaker Sir Caddoc',
    anim: { idle: 'idle', walk: 'walk', run: 'run', attack: 'atk1', attack2: 'atk2', attack3: 'atk3', hit: 'hit', death: 'death', roar: 'roar', bash: 'bash', block: 'block' }, windup: [0.4, 0.66], atkDur: 1.3, aggro: 30 },
};

let idSeq = 1;
export class Enemy {
  constructor(game, spec, room) {
    this.g = game; this.spec = spec; this.room = room; this.T = TYPES[spec.t]; this.id = idSeq++;
    const b = room.b;
    this.pos = new THREE.Vector2(b.x0 + spec.x, b.y0 + (spec.y ?? 0.5)); this.home = this.pos.clone();
    this.vel = new THREE.Vector2(); this.facing = -1; this.yaw = -1.2;
    this.hp = this.T.hp; this.state = spec.rise ? 'buried' : 'idle'; this.t = 0; this.cool = 1 + Math.random(); this.flash = 0; this.chill = 0; this.poison = 0;
    this.boss = !!spec.boss; this.dead = false;
  }

  async load() {
    const T = this.T, file = T.files[(this.id) % T.files.length];
    const g = await cloneGLTF(file);
    this.root = new THREE.Group(); this.model = g.scene; this.root.add(this.model);
    fitHeight(this.model, T.h);
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = o.material.clone(); } });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = Object.fromEntries(g.animations.map(c => [c.name, c]));
    if (T.sword) {
      const hand = this.model.getObjectByName('hand_r');
      if (hand) { const w = await weaponModel(T.sword, 0.8); const s = new THREE.Group(); hand.add(s); w.scale.multiplyScalar(1 / this.model.scale.x); // UAL right-hand grip frame (from BM clips.json): blade along the knuckle line, handle across the palm
        const knuck = new THREE.Vector3(-0.577, -0.033, 0.816).normalize(), fing = new THREE.Vector3(0.003, 0.999, 0.043), palm = new THREE.Vector3(-0.817, 0.027, -0.576);
        s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), knuck);
        const hs = hand.getWorldScale(new THREE.Vector3()).x; s.position.copy(fing.multiplyScalar(0.075).add(palm.multiplyScalar(0.025))).multiplyScalar(1 / hs);
        w.scale.setScalar(0.8 / hs); s.add(w); this.sword = s; }
    }
    // a faint cold key so dark armour never reads black-on-black; ember eyes on armoured foes
    const L = new THREE.PointLight(this.boss ? 0xff7a7a : 0xc8d4ff, this.boss ? 12 : 6, 4.5, 1.5); L.position.set(0.5, T.h * 0.8, 1.7); this.root.add(L);
    if (this.spec.t !== 'zombie') { const head = this.model.getObjectByName('head') || this.model.getObjectByName('mixamorigHead'); if (head) head.add(new THREE.PointLight(this.boss ? 0xff2020 : 0xff6030, 3, 1.2, 2)); }
    this.model.traverse(o => { if (o.isMesh && o.material.color) { o.material.color.multiplyScalar(1.3); o.material.envMapIntensity = 1.2; } });
    this.room.group.add(this.root);
    this.play(this.state === 'buried' ? T.anim.rise : T.anim.idle, 0, this.state === 'buried' ? { paused: true } : {});
    if (this.state === 'buried') this.root.visible = false;
    this.sync(0);
  }

  play(name, fade = 0.15, o = {}) {
    const clip = this.clips[name]; if (!clip) return null;
    if (this.curName === name && !o.restart) return this.cur;
    const a = this.mixer.clipAction(clip); a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.timeScale = o.speed ?? 1;
    a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once; a.play();
    if (o.paused) a.paused = true;
    if (this.cur && this.cur !== a) this.cur.crossFadeTo(a, fade, false);
    this.cur = a; this.curName = name; return a;
  }

  get aabb() { return { x0: this.pos.x - this.T.w / 2, x1: this.pos.x + this.T.w / 2, y0: this.pos.y, y1: this.pos.y + this.T.h * 0.95 }; }

  update(dt, P) {
    const T = this.T; this.t += dt; if (this.flash > 0) this.flash -= dt; if (this.cool > 0) this.cool -= dt;
    const slow = this.chill > 0 ? 0.5 : 1; if (this.chill > 0) this.chill -= dt;
    if (this.poison > 0) { this.poison -= dt; this.pT = (this.pT || 0) + dt; if (this.pT > 0.5) { this.pT = 0; this.damage(1.5, 'poison', true); } }
    const dx = P.pos.x - this.pos.x, adx = Math.abs(dx), dy = P.pos.y - this.pos.y;
    const sees = adx < T.aggro && Math.abs(dy) < 4 && P.state !== 'dead';
    switch (this.state) {
      case 'buried':
        if (adx < 6.5 && Math.abs(dy) < 3) { this.state = 'rise'; this.t = 0; this.root.visible = true; const a = this.play(T.anim.rise, 0, { once: true, restart: true }); if (a) a.paused = false; audio.play('squelching_2', 0.5); this.g.fx.dust(this.pos.x, this.pos.y, 0x3a3028); this.facing = Math.sign(dx) || -1; }
        break;
      case 'rise': if (this.t > 1.6) { this.state = 'idle'; this.t = 0; } break;
      case 'intro':
        if (this.t > 2.4) { this.state = 'chase'; this.t = 0; }
        break;
      case 'idle': case 'chase': {
        if (this.boss && !this.awake) { if (sees && adx < 11) { this.awake = true; this.state = 'intro'; this.t = 0; this.play(T.anim.roar, 0.2, { once: true, restart: true }); audio.play('crowd_gasp', 0.4, 0.6); this.g.bossStart(this); } break; }
        if (!sees) { this.vel.x = 0; this.play(T.anim.idle); this.state = 'idle'; break; }
        this.state = 'chase'; this.facing = Math.sign(dx) || this.facing;
        const enraged = this.boss && this.hp < T.hp * 0.5;
        if (T.block && adx < 3.6 && this.cool <= 0 && Math.random() < 0.012) { this.state = 'guard'; this.t = 0; this.play(T.anim.block, 0.12, { restart: true }); this.g.fx.glint(this.pos.x + this.facing * 0.5, this.pos.y + 1.2, 0x8ab0ff); break; }
        if (adx < T.reach + 0.3 && this.cool <= 0) { this.startAttack(enraged); break; }
        if (this.boss && this.enraged && adx < 6 && this.cool <= 0 && Math.random() < 0.015) { this.startAttack(true, 'slam'); break; }
        if (this.boss && adx > 7 && this.cool <= 0 && Math.random() < 0.02) { this.startAttack(enraged, 'bash'); break; }
        const spd = T.speed * slow * (enraged ? 1.35 : 1) * (this.boss && adx > 5 ? 1.6 : 1);
        if (adx > T.reach * 0.8 && this.groundAhead()) { this.vel.x = this.facing * spd; this.play(this.boss && adx > 5 ? T.anim.run : T.anim.walk, 0.2, { speed: this.boss ? 1 : 1.1 }); }
        else { this.vel.x = 0; this.play(T.anim.idle); }
        break;
      }
      case 'attack': {
        const k = this.t / (this.atkDur);
        if (this.bash) this.vel.x = (k > 0.25 && k < 0.7) ? this.facing * 9 : 0; else this.vel.x = 0;
        if (this.slam && k >= 0.5 && !this.slammed) { this.slammed = true; this.g.shockwave(this, this.pos.x + this.facing * 1.2, this.pos.y, this.facing); this.g.shockwave(this, this.pos.x - this.facing * 0.8, this.pos.y, -this.facing); }
        if (k < T.windup[0]) this.flash = Math.max(this.flash, (Math.sin(this.t * 40) > 0.6 ? 0.03 : 0));
        const [w0, w1] = T.windup;
        if (k > w0 - 0.08 && !this.telegraphed) { this.telegraphed = true; audio.play(this.boss ? 'sword_attack_3' : T.sword ? 'sword_attack_2' : 'squelching_1', 0.5, this.boss ? 0.7 : 1); }
        if (k >= w0 && k <= w1 && !this.hitDone) {
          const reach = this.bash ? 1.6 : T.reach;
          const hb = { x0: this.pos.x + (this.facing > 0 ? 0 : -reach), x1: this.pos.x + (this.facing > 0 ? reach : 0), y0: this.pos.y + 0.2, y1: this.pos.y + T.h * 0.9 };
          const pa = P.aabb;
          if (hb.x0 < pa.x1 && hb.x1 > pa.x0 && hb.y0 < pa.y1 && hb.y1 > pa.y0) { const r = P.takeHit(T.dmg, this.pos.x); if (r) this.hitDone = true; if (r === 'block') { this.state = 'stagger'; this.t = 0; this.vel.x = -this.facing * 2.5; this.play(T.anim.hit, 0.08, { once: true, restart: true }); } }
        }
        if (k >= 1) { this.state = 'chase'; this.t = 0; this.cool = (this.boss ? 0.6 : 1.1) + Math.random() * 0.8; this.bash = false; }
        break;
      }
      case 'stagger': case 'hurt': this.vel.x *= 0.88; if (this.t > (this.state === 'stagger' ? 0.7 : 0.35)) { this.state = 'chase'; this.t = 0; } break;
      case 'block': this.vel.x = 0; if (this.t > 0.45) { this.state = 'guard'; this.t = 0.9; } break;
      case 'guard': this.vel.x = 0; this.facing = Math.sign(dx) || this.facing; if (this.t > 1.5) { this.state = 'chase'; this.t = 0; this.cool = 0.1; } break;
      case 'dead':
        this.vel.x *= 0.9;
        if (this.t > 2.2) { const k = Math.min(1, (this.t - 2.2) / 0.8); this.model.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 1 - k; } }); if (k >= 1) { this.root.visible = false; this.gone = true; } }
        break;
    }
    // contact damage
    if (!this.dead && (this.state === 'chase' || this.state === 'attack')) {
      const a = this.aabb, pa = P.aabb;
      if (a.x0 < pa.x1 && a.x1 > pa.x0 && a.y0 < pa.y1 && a.y1 > pa.y0) P.takeHit(T.touch, this.pos.x);
    }
    this.physics(dt);
    this.sync(dt);
  }

  startAttack(enraged, kind) {
    const T = this.T; this.state = 'attack'; this.t = 0; this.hitDone = false; this.telegraphed = false; this.bash = kind === 'bash'; this.slam = kind === 'slam'; this.slammed = false;
    let name = T.anim.attack; if (T.anim.attack2 && Math.random() < 0.4) name = T.anim.attack2; if (this.boss && T.anim.attack3 && Math.random() < 0.3) name = T.anim.attack3; if (this.bash) name = T.anim.bash; if (this.slam) { name = T.anim.attack3 || name; this.hitDone = true; }
    const clip = this.clips[name];
    this.atkDur = T.atkDur * (enraged ? 0.8 : 1);
    const a = this.play(name, 0.1, { once: true, restart: true, speed: clip ? clip.duration / this.atkDur : 1 });
    // glint telegraph
    this.g.fx.glint(this.pos.x + this.facing * 0.5, this.pos.y + this.T.h * 0.85, this.boss ? 0xff4040 : 0xfff0c0);
  }

  groundAhead() {
    const x = this.pos.x + this.facing * (this.T.w / 2 + 0.3), y = this.pos.y;
    if (x < this.room.b.x0 + 0.8 || x > this.room.b.x1 - 0.8) return false;
    return this.g.activeSolids().some(s => !s.gone && x > s.x0 && x < s.x1 && Math.abs(s.y1 - y) < 0.3);
  }

  physics(dt) {
    if (this.state === 'buried') return;
    this.vel.y -= 20 * dt; if (this.vel.y < -14) this.vel.y = -14;
    this.pos.x += this.vel.x * dt;
    const a = this.aabb;
    for (const s of this.g.activeSolids()) {
      if (s.oneway || s.gone) continue;
      if (a.x1 > s.x0 && a.x0 < s.x1 && a.y1 > s.y0 + 0.01 && a.y0 < s.y1 - 0.01) { this.pos.x = this.vel.x > 0 ? s.x0 - this.T.w / 2 : s.x1 + this.T.w / 2; this.vel.x = 0; }
    }
    const py = this.pos.y; this.pos.y += this.vel.y * dt; const b = this.aabb; this.ground = false;
    for (const s of this.g.activeSolids()) {
      if (s.gone || !(b.x1 > s.x0 && b.x0 < s.x1)) continue;
      if (this.vel.y <= 0 && py >= s.y1 - 0.05 && this.pos.y <= s.y1) { this.pos.y = s.y1; this.vel.y = 0; this.ground = true; }
    }
    this.pos.x = Math.max(this.room.b.x0 + 0.7, Math.min(this.room.b.x1 - 0.7, this.pos.x));
  }

  sync(dt) {
    this.mixer.update(dt);
    const target = this.facing * (Math.PI / 2 - 0.42);
    this.yaw += (target - this.yaw) * Math.min(1, dt * 10);
    this.root.position.set(this.pos.x, this.pos.y, 0); this.model.rotation.y = this.yaw;
    const f = this.flash > 0 ? 1 : 0, chill = this.chill > 0;
    if (f !== this._f || chill !== this._c) { this._f = f; this._c = chill; this.model.traverse(o => { if (o.isMesh && o.material.emissive) { o.material.emissive.setHex(f ? 0xffffff : chill ? 0x2060a0 : 0); o.material.emissiveIntensity = f ? 0.6 : chill ? 0.5 : 1; } }); }
  }

  // returns true if damaged
  hit(hb, roll, P) {
    if (this.dead || this.state === 'buried' || hb.attack.hitIds.has(this.id)) return false;
    const a = this.aabb; if (!(hb.x0 < a.x1 && hb.x1 > a.x0 && hb.y0 < a.y1 && hb.y1 > a.y0)) return false;
    hb.attack.hitIds.add(this.id);
    const front = Math.sign(P.pos.x - this.pos.x) === this.facing;
    const low = P.crouch, high = !P.onGround && P.pos.y > this.pos.y + 0.5;
    if (this.T.block && front && (this.state === 'guard' || this.state === 'block') && !low && !high) {
      this.state = 'block'; this.t = 0; this.play(this.T.anim.block, 0.06, { once: true, restart: true });
      this.g.fx.burst(this.pos.x + this.facing * 0.6, this.pos.y + 1.3, 0xfff0b0, 16, 4); audio.play('sword_parry_' + (1 + (Math.random() * 3 | 0)), 0.6);
      this.g.ui.dmg(this.pos.x, this.pos.y + this.T.h + 0.2, 'GUARD', 'crit'); P.vel.x = -P.facing * 3; if (!this.g.flags.guardHint) { this.g.flags.guardHint = 1; this.g.ui.toast('Raised guard: strike low (crouch) or from above (jump)', 'magic'); } return true;
    }
    let total = roll.dmg;
    this.g.ui.dmg(this.pos.x, this.pos.y + this.T.h + 0.1, roll.dmg, roll.crit ? 'crit' : '');
    for (const e of roll.elem) {
      total += e.dmg; setTimeout(() => this.g.ui.dmg(this.pos.x + 0.3, this.pos.y + this.T.h + 0.5, e.dmg, e.elem), 90);
      if (e.elem === 'ice') this.chill = 3; if (e.elem === 'poison') this.poison = 2; if (e.elem === 'fire') this.g.fx.burst(this.pos.x, this.pos.y + 1.2, 0xff6a20, 14, 3);
      if (e.elem === 'lightning') this.g.chainLightning(this, e.dmg);
    }
    this.damage(total, null, false, roll.crit);
    const lp = P.d.leech; if (lp) P.heal(Math.max(1, Math.round(total * lp / 100)));
    return true;
  }

  damage(n, elem, quiet, crit) {
    if (this.dead) return;
    this.hp -= n; this.flash = 0.08;
    if (quiet) this.g.ui.dmg(this.pos.x, this.pos.y + this.T.h + 0.2, Math.round(n), elem);
    audio.play('sword_impact_hit_' + (1 + (Math.random() * 3 | 0)), 0.55);
    this.g.fx.burst(this.pos.x, this.pos.y + this.T.h * 0.6, 0x8a0a14, 10, 3);
    if (this.hp <= 0) return this.die();
    if (!quiet && !this.boss && this.state !== 'attack') { this.state = 'hurt'; this.t = 0; this.vel.x = -this.facing * (crit ? 4 : 2.2); this.play(this.T.anim.hit, 0.05, { once: true, restart: true }); }
    if (this.boss && this.hp < this.T.hp * 0.5 && !this.enraged) { this.enraged = true; this.state = 'intro'; this.t = 1.0; this.play(this.T.anim.roar, 0.1, { once: true, restart: true }); this.g.ui.toast('Sir Caddoc\'s oath burns black!', 'unique'); }
    this.g.bossUpdate?.(this);
  }

  die() {
    this.dead = true; this.state = 'dead'; this.t = 0; this.play(this.T.anim.death, 0.1, { once: true, restart: true });
    audio.play(this.boss ? 'rock_wall_2' : 'bone_snap', 0.5);
    this.g.onEnemyDeath(this);
  }
}
