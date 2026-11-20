import * as THREE from 'three';
import { loadGLTF, weaponModel, audio } from './assets.js';
import { BASES, STYLES, GEMS, itemStats, isRanged } from './items.js';
import { glowTex } from './world.js';
import { loadMoves, strideSpeed, Grip, reach } from './moves.js';

// Movement tuned from Symphony of the Night frame data (docs/research), converted at 1 SotN px ≈ 3.35 cm, 60 fps:
// walk 1.5 px/f → 4.7 m/s · jump 4.9 px/f → 9.85 m/s · double jump 4.1 px/f → 8.25 m/s · fall cap 7 px/f → 14 m/s
// backdash peak 3.5 px/f → 7 m/s · coyote 7 f → 0.117 s.
export const PHYS = { walk: 4.7, jumpV: 9.85, djumpV: 8.25, grav: 17.5, fallMax: 14, cutV: 2.5, backdash: 7.4, backdashT: 0.34, coyote: 0.117, buffer: 0.1, dashV: 13, dashT: 0.22, slideV: 9.5, slideT: 0.46, diveV: 24, kickX: 6.8, kickY: 9.4, kickLock: 0.17, wallSlide: 2.6 };
const W = 0.62, H_STAND = 1.72, H_CROUCH = 1.08, H_SLIDE = 0.9;
const UPPER = /Spine|Neck|Head|Shoulder|Arm|Hand/;
const FPS = 30;
const ELEM_COLOR = { fire: 0xff5a1a, ice: 0x6ad0ff, lightning: 0xffe24a, poison: 0x6aff4a };

const ANIM = {
  idle: 'axe_unarmed_idle', idleArmed: 'sword_and_shield_idle', jog: 'vw_run', jogArmed: 'vw_run_armed', air: 'vw_air', land: 'vw_land',
  jump: 'axe_unarmed_jump', fall: 'falling', crouch: 'axe_crouch_idle', crouchArmed: 'sword_and_shield_crouch_idle',
  backdash: 'standing_run_back', hurt: 'sword_and_shield_impact', death: 'sword_and_shield_death', sit: 'sitting',
  block: 'sword_and_shield_block_idle', crouchBlock: 'sword_and_shield_crouch_block_idle', pickup: 'axe_unarmed_equip_over_shoulder',
  dashAir: 'standing_melee_run_jump_attack', dive: 'jump_attack', cling: 'hanging_idle', ring: 'standing_taunt_battlecry', bow: 'shooting_arrow',
};
const NO_HIPS_POS = /jump|fall|flying|run_back|impact|vw_air/;

export class Player {
  constructor(game) {
    this.g = game;
    this.pos = new THREE.Vector2(); this.vel = new THREE.Vector2();
    this.facing = 1; this.yaw = 1; this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.jumpsLeft = 1; this.cut = false;
    this.crouch = false; this.state = 'free'; this.stateT = 0; this.attack = null; this.backdashT = 0; this.dashT = 0; this.dashUsed = false;
    this.inv = 0; this.hurtT = 0; this.blocking = false; this.dropT = 0;
    this.stats = { lvl: 1, xp: 0, next: 60, pts: 0, str: 10, con: 10, int: 8, lck: 6, hp: 100, hpMax: 100, mp: 30, mpMax: 30, gold: 0, potions: 2, lifeUp: 0, manaUp: 0, kills: 0 };
    this.bells = new Set(); this.combo = 0; this.swings = 0; this.hits = 0; this.kickT = 0; this.wallDir = 0; this.sunk = false;
    this.equip = { weapon: null, offhand: null, head: null, body: null, cloak: null, ring1: null, ring2: null };
    this.bag = [];
    this.layers = { lower: { cur: null }, upper: { cur: null } };
  }

  async load() {
    const g = await loadGLTF('assets/player/vesper_player.glb');
    this.root = new THREE.Group();
    this.model = g.scene; this.spin = new THREE.Group(); this.spin.position.y = 0.95; this.model.position.y = -0.95;
    this.root.add(this.spin); this.spin.add(this.model);
    this.model.traverse(o => { if (o.isMesh || o.isSkinnedMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.material) { const m = o.material; m.envMapIntensity = 1.3; m.roughness = Math.max(m.roughness ?? 0.5, 0.45); m.color.multiplyScalar(1.35); } } });
    this.socketR = this.model.getObjectByName('WeaponSocket_R');
    const fore = this.model.getObjectByProperty('name', 'mixamorigLeftForeArm');
    this.socketL = new THREE.Group(); fore.add(this.socketL);
    this.g.scene.add(this.root);
    // rim light that follows the hero so he reads against dark rooms
    this.rim = new THREE.PointLight(0x9ab0ff, 9, 6, 1.5); this.root.add(this.rim); this.rim.position.set(-0.6, 2.2, -1.2);
    this.fill = new THREE.PointLight(0xffd8b0, 7, 6, 1.4); this.root.add(this.fill); this.fill.position.set(0.4, 1.8, 2.6);
    this.trail = new Trail(this.g.scene);
    this.scarf = new Scarf(this.g.scene, this.model.getObjectByName('mixamorigNeck'));

    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {};
    const mv = await loadMoves(); this.moves = mv.meta;
    for (const c of [...g.animations, ...mv.clips]) {
      const tracks = c.tracks.filter(t => !(t.name.endsWith('.position') && !t.name.includes('Hips')) && !(NO_HIPS_POS.test(c.name) && t.name.includes('Hips.position')) && !t.name.endsWith('.scale'));
      const up = tracks.filter(t => UPPER.test(t.name)), lo = tracks.filter(t => !UPPER.test(t.name));
      this.clips[c.name] = { full: c, up: this.mixer.clipAction(new THREE.AnimationClip(c.name + '_u', c.duration, up)), lo: this.mixer.clipAction(new THREE.AnimationClip(c.name + '_l', c.duration, lo)), dur: c.duration };
    }
    // stride-match the run cycles, pin the grip, and find the off-hand chain for two-handed holds
    this.stride = {}; for (const n of [ANIM.jog, ANIM.jogArmed]) this.stride[n] = strideSpeed(this.mixer, this.model, this.clips[n].full) || 4;
    this.grip = new Grip(this.model, this.clips.vw_grip?.full);
    const bone = n => this.model.getObjectByName('mixamorig' + n);
    this.armL = [bone('LeftArm'), bone('LeftForeArm'), bone('LeftHand')]; this.ikW = 0; this.airK = 0.5; this.landK = 0; this.leanV = 0;
    this.setLayer('lower', ANIM.idle, 0); this.setLayer('upper', ANIM.idle, 0);
  }

  clipAct(name, layer) { const c = this.clips[name] || this.clips[ANIM.idle]; return layer === 'upper' ? c.up : c.lo; }
  setLayer(layer, name, fade = 0.15, opts = {}) {
    const L = this.layers[layer];
    if (L.cur === name && !opts.restart) return;
    const next = this.clipAct(name, layer), prev = L.cur && this.clipAct(L.cur, layer);
    next.reset(); next.enabled = true; next.setEffectiveWeight(1); next.timeScale = opts.manual ? 0 : (opts.speed ?? 1);
    next.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); next.clampWhenFinished = !!opts.once;
    if (opts.at !== undefined) next.time = opts.at;
    next.play();
    if (prev && prev !== next) prev.crossFadeTo(next, fade, false);
    L.cur = name; L.manual = !!opts.manual;
  }

  get armed() { return !!this.equip.weapon; }
  get height() { return this.state === 'slide' ? H_SLIDE : this.crouch ? H_CROUCH : H_STAND; }
  has(b) { return this.bells.has(b); }
  get aabb() { return { x0: this.pos.x - W / 2, x1: this.pos.x + W / 2, y0: this.pos.y, y1: this.pos.y + this.height }; }
  abilities() { return this.bells; }

  // ---------------------------------------------------------------- equipment
  derived() {
    const s = this.stats, d = { dmg: [2, 4], def: 0, block: 0, elems: [], leech: 0, str: s.str, con: s.con, int: s.int, lck: s.lck, dex: 0, hpBonus: 0, mpBonus: 0, mf: 0, thorns: 0, regen: 0, ias: 0, crit: 0, critDmg: 0, xpPct: 0, gold: 0, res: {}, echo: null, ranged: null };
    for (const [slot, it] of Object.entries(this.equip)) {
      if (!it) continue; const st = itemStats(it);
      if (slot === 'weapon') { d.dmg = st.dmg; d.elems = st.elems; d.echo = st.echo || null; d.ranged = STYLES[BASES[it.base].style]?.ranged || null; }
      else { d.def += st.def; if (slot === 'offhand') { d.block = st.block; d.blockBurst = st.blockBurst; } }
      d.leech += st.leechPct || 0; d.ias += st.ias || 0; d.hpBonus += st.hp || 0; d.mpBonus += st.mp || 0;
      for (const k of ['str', 'dex', 'con', 'int', 'lck', 'mf', 'thorns', 'regen', 'crit', 'critDmg', 'xpPct', 'gold']) d[k] += st[k] || 0;
      for (const k of ['fire', 'ice', 'poison', 'lightning']) d.res[k] = Math.min(75, (d.res[k] || 0) + (st['res_' + k] || 0));
    }
    d.ias += d.dex * 1.5; d.crit += 5 + d.lck * 0.5 + d.dex * 0.3; d.mf += d.lck * 1.5;
    return d;
  }
  refreshStats() {
    const d = this.derived(), s = this.stats;
    s.hpMax = 50 + d.con * 4 + s.lvl * 6 + d.hpBonus + s.lifeUp * 15; s.mpMax = 14 + d.int * 2 + d.mpBonus + s.manaUp * 8;
    s.hp = Math.min(s.hp, s.hpMax); s.mp = Math.min(s.mp, s.mpMax);
    this.d = d;
  }

  async equipItem(slot, item) {
    const prev = this.equip[slot];
    if (prev) this.bag.push(prev);
    if (item) { this.bag = this.bag.filter(i => i !== item); }
    this.equip[slot] = item || null;
    if (slot === 'weapon' && item && BASES[item.base]?.hands === 2 && this.equip.offhand) { this.bag.push(this.equip.offhand); this.equip.offhand = null; await this.attachVisual('offhand'); }
    if (slot === 'offhand' && item && this.equip.weapon && BASES[this.equip.weapon.base]?.hands === 2) { this.bag.push(this.equip.weapon); this.equip.weapon = null; await this.attachVisual('weapon'); }
    await this.attachVisual(slot);
    this.refreshStats();
    audio.play(slot === 'weapon' ? 'sword_unsheath_1' : 'item_equip', 0.5);
  }

  async attachVisual(slot) {
    if (slot !== 'weapon' && slot !== 'offhand') return;
    const sock = slot === 'weapon' ? this.socketR : this.socketL;
    if (this[slot + 'Mesh']) { sock.remove(this[slot + 'Mesh']); this[slot + 'Mesh'] = null; }
    const it = this.equip[slot]; if (!it) return;
    const base = BASES[it.base]; if (!base?.model) return;
    // Socket lives under a 1.8× scaled rig; weapons are authored at true metres, so divide that scale out.
    const m = await weaponModel(base.model, base.scale / 1.8);
    if (slot === 'offhand') this.placeShield(m);
    sock.add(m); this[slot + 'Mesh'] = m;
    if (slot === 'weapon') this.applyElementFX(m, itemStats(it).elems);
  }

  // Solve the shield's forearm-local transform from the block pose: face toward foe-and-viewer, centred on the forearm.
  placeShield(m) {
    const fore = this.socketL.parent, blk = this.clips[ANIM.block], a = this.mixer.clipAction(blk.full);
    const keepYaw = this.model.rotation.y; this.model.rotation.y = 0;
    a.reset().play(); a.time = 0.5; this.mixer.update(0); this.model.updateMatrixWorld(true);
    const fq = fore.getWorldQuaternion(new THREE.Quaternion()), ws = fore.getWorldScale(new THREE.Vector3()).x;
    const rootQ = this.model.parent.getWorldQuaternion(new THREE.Quaternion());
    // model-space forward is +Z; shield face: mostly forward, turned 40deg toward the camera side (+X in model space = right side)
    const fwd = new THREE.Vector3(0.45, 0, 0.89).normalize().applyQuaternion(rootQ), up = new THREE.Vector3(0, 1, 0).applyQuaternion(rootQ), x = new THREE.Vector3().crossVectors(up, fwd).normalize();
    const qw = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, fwd));
    const inv = fq.clone().invert();
    m.quaternion.copy(inv.clone().multiply(qw));
    m.position.copy(fwd.clone().multiplyScalar(0.065).applyQuaternion(inv).divideScalar(ws)).add(new THREE.Vector3(0, 0.12 / ws, 0));
    m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.envMapIntensity = 0.5; if (o.material.emissive) o.material.emissiveIntensity = Math.min(o.material.emissiveIntensity ?? 1, 0.3); } });
    a.stop(); this.model.rotation.y = keepYaw; this.mixer.update(0);
  }

  applyElementFX(m, elems) {
    if (this.fx) { this.fx.parent?.remove(this.fx); this.fx = null; }
    const e = elems[0]?.elem; if (!e) return;
    const col = ELEM_COLOR[e];
    m.traverse(o => { if (o.isMesh) { o.material.emissive = new THREE.Color(col); o.material.emissiveIntensity = 0.35; } });
    const grp = new THREE.Group(); const len = m.userData.len * 1.8 / m.scale.x;
    const mat = new THREE.SpriteMaterial({ map: glowTex(), color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    grp.userData.parts = [];
    for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(mat.clone()); s.userData = { t: Math.random(), along: 0.15 + Math.random() * 0.85 }; grp.add(s); grp.userData.parts.push(s); }
    const L = new THREE.PointLight(col, 3, 4, 1.5); L.position.y = len * 0.6; grp.add(L);
    grp.userData.len = len; grp.userData.elem = e;
    m.add(grp); this.fx = grp;
  }

  // ---------------------------------------------------------------- update
  update(dt, inp) {
    const s = this.stats, P = PHYS;
    this.stateT += dt; if (this.inv > 0) this.inv -= dt;
    if (this.state === 'dead') { this.animate(dt); return; }
    if (this.state === 'sit') { if (inp.x || inp.jumpP || inp.attackP) { this.state = 'free'; } else { this.vel.set(0, 0); this.animate(dt); return; } }
    if (this.state === 'ring') { this.vel.x = 0; if (this.stateT > 2.6) this.state = 'free'; }

    const abil = this.abilities();
    // facing & horizontal intent
    let dir = inp.x;
    const attacking = !!this.attack;
    const heavy = attacking && this.attack.heavy;
    this.blocking = inp.shield && this.equip.offhand && this.state === 'free' && !attacking;

    if (this.state === 'hurt') { if (this.stateT > 0.38 && this.onGround) this.state = 'free'; dir = 0; }
    if (this.state === 'backdash') {
      this.backdashT += dt; const k = 1 - this.backdashT / P.backdashT;
      this.vel.x = -this.facing * P.backdash * Math.max(0, k * 1.15);
      if (this.backdashT >= P.backdashT) this.state = 'free';
      if (inp.jumpP && this.onGround) this.state = 'free';
    }
    if (this.state === 'dash') { this.dashT += dt; this.vel.set(this.facing * P.dashV, 0); if (Math.random() < 0.8) this.g.fx.spawn(this.pos.x - this.facing * 0.3, this.pos.y + 0.4 + Math.random() * 1.1, 0.3, 0, 0, 0x9a5aff, 0.3, 0.5, 0); if (this.dashT > P.dashT) { this.state = 'free'; this.vel.x = this.facing * P.walk; } }
    if (this.state === 'slide') {
      this.slideT += dt; const low = this.lowCeiling(), k = Math.max(0.42, 1 - this.slideT / P.slideT * 0.6);
      this.vel.x = this.facing * P.slideV * (low ? Math.max(k, 0.6) : k); this.crouch = true;
      if (Math.random() < 0.5) this.g.fx.dust(this.pos.x - this.facing * 0.4, this.pos.y, 0x9a9080);
      if (inp.dashP && low) this.slideT = 0; // keep sliding through long crawls
      if ((this.slideT >= P.slideT && !low) || !this.onGround) { this.state = 'free'; }
      else if (this.slideT >= P.slideT * 2.2 && low) this.slideT = P.slideT; // never strand the pilgrim under stone
      if (this.slideHit) this.g.playerHits({ x0: this.pos.x - 0.6, x1: this.pos.x + 0.6, y0: this.pos.y, y1: this.pos.y + 0.8, attack: this.slideHit, mul: 0.6 });
    }
    if (this.state === 'dive') {
      this.vel.set(0, -P.diveV); this.g.fx.spawn(this.pos.x + (Math.random() - 0.5) * 0.4, this.pos.y + 1.4, 0.3, 0, 2, 0x4ac8d8, 0.25, 0.4, 0);
      this.g.playerHits({ x0: this.pos.x - 0.7, x1: this.pos.x + 0.7, y0: this.pos.y - 0.6, y1: this.pos.y + 0.9, attack: this.diveAtk, mul: 1.4, dive: true });
    }

    if (this.state === 'free') {
      this.crouch = (inp.down && this.onGround) || (this.onGround && this.lowCeiling());
      if (this.kickT > 0) { this.kickT -= dt; dir = 0; }
      const canTurn = !(attacking && this.onGround);
      if (dir && canTurn) this.facing = Math.sign(dir);
      let speed = P.walk;
      if (this.crouch || this.blocking && this.onGround) speed = 0;
      if (attacking && this.onGround) speed = heavy ? 0 : P.walk * 0.55;
      if (this.kickT > 0) { /* carried by the wall kick */ } else { // a few frames of acceleration and braking: weight without losing SotN precision
        const tv = dir * speed * (this.inWater ? 0.62 : 1) * (this.inLava ? 0.6 : 1), rev = tv * this.vel.x < 0;
        const acc = (!this.onGround ? 90 : rev ? 130 : tv === 0 ? 80 : 62) * dt;
        if (rev && this.onGround && Math.abs(this.vel.x) > 3 && !this.skidT) { this.skidT = 0.12; this.g.fx.dust(this.pos.x + Math.sign(this.vel.x) * 0.3, this.pos.y, 0x9a9080); }
        this.vel.x += THREE.MathUtils.clamp(tv - this.vel.x, -acc, acc); if (this.skidT > 0) this.skidT = Math.max(0, this.skidT - dt);
      }
      // jump / double jump / drop-through
      if (inp.jumpP) this.jumpBuf = P.buffer;
      if (this.jumpBuf > 0) {
        if (this.crouch && this.standingOnOneway) { this.dropT = 0.25; this.jumpBuf = 0; this.pos.y -= 0.05; this.crouch = false; }
        else if (this.onGround || this.coyote > 0) { this.vel.y = P.jumpV; this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.cut = false; this.crouch = false; this.flip = 0; audio.play('stone_jump', 0.35); }
        else if (inp.jumpP && this.wallDir && abil.has('wallkick') && !this.onGround) { this.vel.set(-this.wallDir * P.kickX, P.kickY); this.facing = -this.wallDir; this.kickT = P.kickLock; this.jumpBuf = 0; this.cut = false; this.jumpsLeft = abil.has('djump') ? 1 : 0; this.dashUsed = false; this.g.fx.burst(this.pos.x + this.wallDir * 0.3, this.pos.y + 0.5, 0x7ad060, 10, 2.5); audio.play('stone_jump', 0.45, 1.3); }
        else if (this.inWater && inp.jumpP) { if (this.sunk) this.sunk = false; this.vel.y = P.jumpV * 0.8; this.jumpBuf = 0; this.cut = false; audio.play('water_jump', 0.4); }
        else if (this.jumpsLeft > 0 && inp.jumpP && abil.has('djump')) { this.vel.y = P.djumpV; this.jumpsLeft--; this.jumpBuf = 0; this.cut = false; this.flip = 1e-4; this.g.fx.burst(this.pos.x, this.pos.y + 0.2, 0xb0c0ff, 10, 2.5); audio.play('wave_attack_1', 0.25, 1.6); }
      }
      if (!inp.jump && this.vel.y > P.cutV && !this.cut && !this.onGround) { this.vel.y = P.cutV; this.cut = true; }
      // backdash (ground) / shade dash (air, Onyx)
      if (inp.dashP) {
        if (this.onGround && inp.down && abil.has('slide')) { this.state = 'slide'; this.slideT = 0; this.stateT = 0; this.attack = null; this.slideHit = { hitIds: new Set(), st: STYLES.punch }; audio.play('clothing_1', 0.5, 0.8); }
        else if (abil.has('dash') && (!this.onGround || dir) && !this.dashUsed) { if (dir) this.facing = Math.sign(dir); this.state = 'dash'; this.dashT = 0; this.dashUsed = !this.onGround; this.attack = null; this.inv = Math.max(this.inv, 0.3); this.g.fx.burst(this.pos.x, this.pos.y + 0.9, 0x9a5aff, 18, 3); audio.play('wave_attack_2', 0.4, 1.3); }
        else if (this.onGround && !attacking) { this.state = 'backdash'; this.backdashT = 0; this.stateT = 0; this.crouch = false; audio.play('clothing_1', 0.4); this.g.onBackdash?.(); }
      }
      // attack / dive
      if (inp.attackP && !this.onGround && inp.down && abil.has('dive') && !this.inWater) { this.state = 'dive'; this.attack = null; this.diveAtk = { hitIds: new Set(), st: STYLES.smash }; audio.play('wave_attack_1', 0.5, 0.6); }
      else if (inp.attackP && !attacking) this.startAttack();
      else if (inp.attackP && attacking) this.attack.queued = true; // buffered: flows into the next link of the chain
      this.inpX = dir;
    }
    if (this.attack) this.updateAttack(dt);

    // gravity & integration
    // water: float unless the Drowned Bell lets you sink (hold DOWN); lava: sear and pop out unless warded
    const env = this.g.envAt(this); this.inWater = env.water; this.inLava = env.lava;
    if (!env.water) this.sunk = false; else if (abil.has('dive') && inp.down) this.sunk = true;
    if (this.state !== 'dash' && this.state !== 'dive') {
      this.vel.y -= P.grav * (env.water ? 0.45 : 1) * dt; const cap = env.water ? 4.5 : (this.wallDir && this.vel.y < 0 && abil.has('wallkick') && this.kickT <= 0 ? P.wallSlide : P.fallMax); if (this.vel.y < -cap) this.vel.y = -cap;
      if (env.water && !this.sunk && env.depth > 1.0) this.vel.y = Math.min(3.2, this.vel.y + 34 * dt);
    }
    if (env.lava && !abil.has('ember') && this.inv <= 0) { if (this.takeHit(Math.max(8, Math.round(this.stats.hpMax * 0.14)), this.pos.x - this.facing, 'fire', null, true)) { this.vel.set(-this.facing * 3, 10.5); this.g.fx.burst(this.pos.x, this.pos.y + 0.4, 0xff6a10, 24, 5); } }
    if (this.jumpBuf > 0) this.jumpBuf -= dt; if (this.dropT > 0) this.dropT -= dt;
    const wasGround = this.onGround;
    this.move(dt);
    if (this.onGround) { this.jumpsLeft = 1; this.dashUsed = false; this.coyote = P.coyote;
      if (this.state === 'dive') { this.state = 'free'; this.g.diveLand(this); this.landT = 0.2; }
      else if (!wasGround) { this.landT = 0.12; audio.play(env.water ? 'water_land' : 'stone_land', 0.3); this.g.fx.dust(this.pos.x, this.pos.y); if (this.airAttacked && this.d.echo === 'quake') this.g.quake(this); this.airAttacked = false; } }
    else if (wasGround && this.vel.y <= 0) { /* walked off ledge: keep coyote */ } else if (this.coyote > 0) this.coyote -= dt;
    if (!this.onGround && this.coyote > 0) this.coyote -= dt;

    // footsteps
    if (this.onGround && Math.abs(this.vel.x) > 1) { this.stepT = (this.stepT || 0) + dt; if (this.stepT > 0.3) { this.stepT = 0; audio.play('stone_chain_run_' + (1 + Math.floor(Math.random() * 5)), 0.18); } }
    // regen
    if (this.d?.regen) { this.regT = (this.regT || 0) + dt; if (this.regT > 2) { this.regT = 0; this.heal(this.d.regen, true); } }
    this.mpT = (this.mpT || 0) + dt; if (this.mpT > 1.2) { this.mpT = 0; s.mp = Math.min(s.mpMax, s.mp + 1 + Math.floor(this.d.int / 12)); }
    if (this.combo > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.poisoned > 0) { this.poisoned -= dt; this.poT = (this.poT || 0) + dt; if (this.poT > 1) { this.poT = 0; if (s.hp > 2) { s.hp -= Math.max(1, Math.round(s.hpMax * 0.012)); this.g.ui.dmg(this.pos.x, this.pos.y + 2, Math.max(1, Math.round(s.hpMax * 0.012)), 'poison'); } } }
    this.animate(dt);
  }

  move(dt) {
    const solids = this.g.activeSolids();
    // X
    if (this.groundS?.mover && this.onGround) { this.pos.x += this.groundS.dx || 0; this.pos.y = this.groundS.y1; } // ride lifts and gears
    this.pos.x += this.vel.x * dt;
    if (this.push) { this.pos.x += this.push * dt; this.vel.x = this.vel.x || Math.sign(this.push) * 0.001; this.push *= Math.pow(0.03, dt); if (Math.abs(this.push) < 0.3) this.push = 0; }
    let a = this.aabb; this.wallDir = 0;
    for (const s of solids) {
      if (s.oneway || s.gone) continue;
      if (s.gate === 'ghost' && this.state === 'dash') continue; // a shade passes spirit gates
      if (a.x1 > s.x0 && a.x0 < s.x1 && a.y1 > s.y0 + 0.001 && a.y0 < s.y1 - 0.001) {
        const right = this.vel.x > 0 || (this.vel.x === 0 && this.pos.x < (s.x0 + s.x1) / 2);
        if (right) this.pos.x = s.x0 - W / 2 - 0.001; else this.pos.x = s.x1 + W / 2 + 0.001;
        if (!this.onGround && s.y1 > this.pos.y + 1.0 && s.y0 < this.pos.y + 0.6 && !s.gate) this.wallDir = right ? 1 : -1;
        a = this.aabb; if (this.state === 'dash') this.state = 'free';
      }
    }
    // Y
    const prevY = this.pos.y;
    this.pos.y += this.vel.y * dt; a = this.aabb;
    this.onGround = false; this.standingOnOneway = false; this.groundS = null;
    for (const s of solids) {
      if (s.gone) continue;
      if (!(a.x1 > s.x0 && a.x0 < s.x1)) continue;
      if (s.gate === 'ghost' && this.state === 'dash') continue;
      if (s.oneway) {
        if (this.vel.y <= 0 && prevY >= s.y1 - 0.02 - Math.abs(s.dy || 0) * 1.5 && this.pos.y < s.y1 && this.dropT <= 0) { this.pos.y = s.y1; this.vel.y = 0; this.onGround = true; this.standingOnOneway = true; this.groundS = s; }
        continue;
      }
      if (a.y1 > s.y0 && a.y0 < s.y1) {
        if (this.vel.y <= 0 && prevY >= s.y1 - 0.25) { this.pos.y = s.y1; this.vel.y = 0; this.onGround = true; this.groundS = s; }
        else if (this.vel.y > 0) { this.pos.y = s.y0 - this.height - 0.001; this.vel.y = 0; }
      }
      a = this.aabb;
    }
    // ground probe for standing still on a platform
    if (!this.onGround && this.vel.y <= 0) {
      for (const s of solids) if (!s.gone && a.x1 > s.x0 && a.x0 < s.x1 && Math.abs(this.pos.y - s.y1) < 0.01 + Math.abs(s.dy || 0) && (!s.oneway || this.dropT <= 0)) { this.onGround = true; this.standingOnOneway = !!s.oneway; this.groundS = s; if (s.mover) this.pos.y = s.y1; }
    }
    // stand-up check under low ceilings
    if (!this.crouch) for (const s of solids) if (!s.oneway && !s.gone && a.x1 > s.x0 && a.x0 < s.x1 && a.y1 > s.y0 && a.y0 < s.y0 && this.onGround) { this.crouch = true; break; }
  }
  // is there stone too low to stand under right here?
  lowCeiling() {
    const x0 = this.pos.x - W / 2, x1 = this.pos.x + W / 2, y = this.pos.y;
    for (const s of this.g.activeSolids()) if (!s.oneway && !s.gone && x1 > s.x0 && x0 < s.x1 && s.y0 > y + 0.5 && s.y0 < y + H_STAND + 0.02) return true;
    return false;
  }

  startAttack(ci = 0) {
    const w = this.equip.weapon, base = w ? BASES[w.base] : null;
    const st = STYLES[base ? base.style : 'punch'];
    const ias = 1 + Math.min(120, this.d?.ias || 0) / 100; this.swings++; if (!this.onGround) this.airAttacked = true;
    const mv = st.chain ? st.chain[ci % st.chain.length] : st;
    if (ci && this.inpX && this.onGround) this.facing = Math.sign(this.inpX); // re-aim between links
    const mode = this.crouch ? 'crouch' : !this.onGround ? 'air' : Math.abs(this.vel.x) > 0.5 ? 'move' : 'idle';
    this.attack = { st, mv, ci, t: 0, dur: mv.dur / ias, hitIds: new Set(), mode, heavy: base && (base.hands === 2 || base.style === 'smash') && !st.ranged, swung: false, n: this.swings, reach: st.reach * (this.d?.echo === 'long' ? 1.35 : 1) };
    const fullBody = mode === 'idle';
    this.setLayer('upper', mv.anim, ci ? 0.1 : 0.06, { manual: true, at: mv.from / FPS, restart: true });
    if (fullBody) this.setLayer('lower', mv.anim, ci ? 0.1 : 0.08, { manual: true, at: mv.from / FPS, restart: true });
  }

  updateAttack(dt) {
    const A = this.attack, st = A.mv, sty = A.st;
    A.t += dt; const k = Math.min(1, A.t / A.dur);
    // ease-in on windup, snap through the strike
    const f = st.from + (st.to - st.from) * k;
    const t = f / FPS;
    const up = this.clipAct(st.anim, 'upper'); up.time = t;
    if (this.layers.lower.cur === st.anim) this.clipAct(st.anim, 'lower').time = t;
    if (!A.swung && f >= st.hit[0] - 2) { A.swung = true; audio.play(A.heavy ? 'sword_attack_3' : 'sword_attack_' + (1 + Math.floor(Math.random() * 2)), 0.5, A.heavy ? 0.85 : 1.05); }
    A.active = f >= st.hit[0] && f <= st.hit[1];
    if (f >= st.hit[0] - 3 && f <= st.hit[1] + 2) this.trailOn = true; 
    if (A.active && sty.ranged) { if (!A.shot) { A.shot = true; this.g.playerShoot(this, sty.ranged); } }
    else if (A.active) { if (!A.proc) { A.proc = true; this.g.onSwing(this, A); } this.g.playerHits(this.hitbox()); }
    // a planted swing steps into the cut; chains flow on a buffered press; holding a direction walks out of the recovery
    if (A.mode === 'idle' && this.onGround && !sty.ranged && f >= st.hit[0] - 2 && f <= st.hit[0] + 1) this.vel.x = this.facing * (A.heavy ? 1.6 : 2.6);
    if (st.cancel !== undefined && f >= st.cancel) {
      if (A.queued && sty.chain && A.ci < sty.chain.length - 1) { this.trail.end(); this.attack = null; this.startAttack(A.ci + 1); return; }
      if (this.inpX && !A.queued && f >= st.cancel + 2) { this.attack = null; this.layers.upper.manual = false; this.trail.end(); return; }
    }
    if (k >= 1) { this.attack = null; this.layers.upper.manual = false; this.trail.end(); }
  }

  hitbox() {
    const st = this.attack.st, f = this.facing;
    const yb = this.pos.y + (this.crouch ? st.yOff * 0.55 : st.yOff);
    const x0 = this.pos.x + f * 0.15, x1 = this.pos.x + f * (0.15 + (this.attack.reach || st.reach));
    return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: yb - st.height / 2, y1: yb + st.height / 2, attack: this.attack };
  }

  rollDamage() {
    const d = this.d, [a, b] = d.dmg;
    let dmg = a + Math.random() * (b - a + 1) | 0; dmg = Math.round(dmg * (1 + (d.str - 10) * 0.035) * (d.echo === 'frenzy' ? 1 + Math.min(12, this.combo) * 0.04 : 1));
    const crit = Math.random() * 100 < d.crit; if (crit) dmg = Math.round(dmg * (1.6 + d.critDmg / 100));
    const em = 1 + (d.int - 8) * 0.03;
    const elem = d.elems.map(e => ({ elem: e.elem, dmg: Math.round((e.dmg[0] + Math.floor(Math.random() * (e.dmg[1] - e.dmg[0] + 1))) * em) }));
    return { dmg, crit, elem };
  }

  takeHit(amount, fromX, elem, src, env) {
    if (this.inv > 0 || this.state === 'dead' || this.state === 'dash' || this.g.cine) return false;
    const front = Math.sign(fromX - this.pos.x) === this.facing;
    if (this.blocking && front && !env) {
      const chip = Math.round(amount * (1 - (this.d.block || 0.5)));
      this.stats.hp -= chip; this.inv = 0.3; this.vel.x = -this.facing * 2.5;
      this.g.fx.burst(this.pos.x + this.facing * 0.5, this.pos.y + 1.2, 0xffe0a0, 14, 4); audio.play('sword_blocked_' + (1 + (Math.random() * 3 | 0)), 0.6);
      if (this.d.blockBurst) this.g.blockBurst(this.pos.x + this.facing, this.pos.y + 1, this.d.blockBurst);
      if (chip) this.g.ui.dmg(this.pos.x, this.pos.y + 2, chip, 'player');
      return 'block';
    }
    const res = elem ? (this.d.res[elem] || 0) : 0;
    const dmg = Math.max(1, Math.round(amount * (1 - res / 100) * (100 / (100 + this.d.def * 2.2))));
    this.stats.hp -= dmg; this.g.ui.dmg(this.pos.x, this.pos.y + 2, dmg, 'player'); this.combo = 0;
    if (this.d.thorns && src && !src.dead) src.damage(this.d.thorns, null, true);
    if (elem === 'poison') this.poisoned = 4;
    audio.play('crunch_quick', 0.5); this.g.hitStop(0.06); this.g.shake(0.25);
    if (this.stats.hp <= 0) { this.stats.hp = 0; this.die(); return true; }
    this.state = 'hurt'; this.stateT = 0; this.attack = null; this.inv = 1.1; this.sunk = false;
    const dir = Math.sign(this.pos.x - fromX) || -this.facing; this.vel.set(dir * 4.5, 5.5); this.onGround = false;
    return true;
  }
  heal(n, quiet) { const s = this.stats, before = s.hp; s.hp = Math.min(s.hpMax, s.hp + n); if (!quiet && s.hp > before) this.g.ui.dmg(this.pos.x, this.pos.y + 2, s.hp - before, 'heal'); }
  die() { this.state = 'dead'; this.stateT = 0; this.attack = null; this.setLayer('lower', ANIM.death, 0.1, { once: true }); this.setLayer('upper', ANIM.death, 0.1, { once: true }); this.g.onPlayerDeath(); }
  gainXP(n) {
    const s = this.stats; s.xp += Math.round(n * (1 + (this.d?.xpPct || 0) / 100));
    while (s.xp >= s.next) { s.xp -= s.next; s.lvl++; s.next = Math.round(40 + 22 * Math.pow(s.lvl, 2.05)); s.str += 1; s.con += 1; s.pts += 3; if (s.lvl % 2 === 0) { s.int += 1; s.lck += 1; } this.refreshStats(); s.hp = s.hpMax; s.mp = s.mpMax; this.g.levelUp(s.lvl); }
  }

  // ---------------------------------------------------------------- animation
  animate(dt) {
    const armed = this.armed;
    if (this.state !== 'dead') {
      let base;
      if (this.state === 'sit') base = ANIM.sit;
      else if (this.state === 'hurt') base = ANIM.hurt;
      else if (this.state === 'backdash') base = ANIM.backdash;
      else if (this.state === 'dash') base = ANIM.dashAir;
      else if (this.state === 'slide') base = armed ? ANIM.crouchArmed : ANIM.crouch;
      else if (this.state === 'dive') base = ANIM.dive;
      else if (this.state === 'ring') base = ANIM.ring;
      else if (!this.onGround && this.wallDir && this.vel.y < 0 && this.has('wallkick')) base = ANIM.cling;
      else if (!this.onGround) base = ANIM.air;
      else if (this.crouch) base = this.blocking ? ANIM.crouchBlock : (armed ? ANIM.crouchArmed : ANIM.crouch);
      else if (Math.abs(this.vel.x) > 0.4) base = armed ? ANIM.jogArmed : ANIM.jog;
      else if (this.landT > 0.02 && !this.attack && !this.blocking) base = ANIM.land;
      else base = armed ? ANIM.idleArmed : ANIM.idle;
      if (this.landT > 0) this.landT -= dt;
      const isRun = base === ANIM.jog || base === ANIM.jogArmed, runScale = isRun ? THREE.MathUtils.clamp(Math.abs(this.vel.x) / this.stride[base], 0.55, 2.8) : 1;
      const lowerBusy = this.attack && this.layers.lower.cur === this.attack.mv.anim;
      if (!lowerBusy) {
        const opts = {};
        if (base === ANIM.air) opts.manual = true;
        if (base === ANIM.land) { opts.once = true; opts.speed = 1.5; }
        if (base === ANIM.backdash) opts.speed = 1.6;
        if (isRun) opts.speed = runScale;
        if (base === ANIM.hurt) { opts.once = true; }
        if (base === ANIM.dashAir) { opts.at = 2.6; opts.speed = 0.4; }
        if (base === ANIM.dive) { opts.at = 3.6; opts.speed = 0.05; }
        this.setLayer('lower', base, base === ANIM.air ? 0.1 : base === ANIM.land ? 0.05 : isRun ? 0.11 : 0.16, opts);
        if (isRun) this.clipAct(base, 'lower').timeScale = runScale;
        if (base === ANIM.air) { // one scrubbed clip: launch -> apex tuck -> legs reaching for the floor, driven by vertical speed
          const k = THREE.MathUtils.clamp(0.5 - this.vel.y / (2 * PHYS.jumpV), 0, 1); this.airK += (k - this.airK) * Math.min(1, dt * 12);
          this.clipAct(base, 'lower').time = this.airK * (this.clips[base].dur - 0.001);
        }
      }
      if (!this.attack) {
        const upper = this.blocking ? (this.crouch ? ANIM.crouchBlock : ANIM.block) : (lowerBusy ? this.layers.lower.cur : base);
        const opts = {}; if (upper === ANIM.air) opts.manual = true; if (upper === ANIM.land) { opts.once = true; opts.speed = 1.5; } if (upper === ANIM.backdash) opts.speed = 1.6; if (upper === ANIM.jog || upper === ANIM.jogArmed) opts.speed = runScale; if (upper === ANIM.hurt) opts.once = true;
        this.setLayer('upper', upper, 0.12, opts);
        // keep the two halves of a locomotion clip in phase
        if (this.layers.upper.cur === this.layers.lower.cur) { const u = this.clipAct(upper, 'upper'), l = this.clipAct(upper, 'lower'); u.time = l.time; }
      }
    }
    this.mixer.update(dt);
    // hands: fingers closed on whatever is held; a two-handed weapon pulls the off hand onto the haft
    const wb = this.equip.weapon && BASES[this.equip.weapon.base], two = wb && wb.hands === 2 && !isRanged(wb) && this.weaponMesh;
    this.grip.apply(this.armed, !!this.equip.offhand || !!two);
    const hold = two && (this.attack || (this.state === 'free' && this.onGround && Math.abs(this.vel.x) < 0.4)) ? 1 : 0;
    this.ikW += (hold - this.ikW) * Math.min(1, dt * 14);
    if (two && this.ikW > 0.01) { this.root.position.set(this.pos.x, this.pos.y, 0); this.root.updateMatrixWorld(true); const polearm = /spear|lance/.test(wb.kind || wb.style), tgt = this.weaponMesh.localToWorld(new THREE.Vector3(0, (polearm ? 0.42 : -0.17) * 1.8 / this.weaponMesh.scale.x, 0)); reach(this.armL[0], this.armL[1], this.armL[2], tgt, this.ikW); }
    this.root.updateMatrixWorld(true); if (this.trailOn) { this.trail.push(this.weaponMesh, this.fx?.userData.elem); this.trailOn = false; } this.trail.update(dt); this.scarf.update(dt, this.facing, this.vel);
    // facing: rotate through the camera (3/4 view, Bloodstained-style), with a forward somersault on double jump
    const target = this.facing * (Math.PI / 2 - 0.38);
    this.yaw += (target - this.yaw) * Math.min(1, dt * 16);
    this.root.position.set(this.pos.x, this.pos.y, 0);
    this.model.rotation.set(0, this.yaw, 0);
    // lean into acceleration and settle into landings
    const ax = dt > 0 ? THREE.MathUtils.clamp((this.vel.x - (this._pvx ?? 0)) / dt, -70, 70) : 0; this._pvx = this.vel.x; this.leanV += (ax - this.leanV) * Math.min(1, dt * 10);
    const runLean = this.state === 'free' && this.onGround && !this.attack ? -(this.vel.x / PHYS.walk) * 0.035 - this.leanV * 0.0016 : 0;
    if (!this.onGround) this._air = Math.min(this.vel.y, this._air ?? 0); else if (this._air !== undefined) { this.landK = THREE.MathUtils.clamp(-this._air / PHYS.fallMax, 0.25, 1); if (Math.abs(this.vel.x) < 1) this.landT = 0.2; this._air = undefined; }
    this.landK = Math.max(0, this.landK - dt * 5.5); const sq = 1 - 0.075 * this.landK * this.landK; this.spin.scale.set(1 + (1 - sq) * 0.5, sq, 1);
    const lean = this.state === 'slide' ? this.facing * 1.05 : this.state === 'dive' ? -this.facing * 0.5 : this.state === 'dash' ? -this.facing * 0.35 : runLean;
    if (!(this.flip > 0)) this.spin.rotation.z += (lean - this.spin.rotation.z) * Math.min(1, dt * 18);
    this.spin.position.y = 0.95 * sq - (this.state === 'slide' ? 0.42 : 0);
    if (this.flip > 0) { this.flip += dt * 2.6; const a = Math.min(1, this.flip); this.spin.rotation.z = -this.facing * (1 - Math.pow(1 - a, 2)) * Math.PI * 2; if (this.flip >= 1 || this.onGround) { this.flip = 0; } }
    // i-frame blink
    this.model.visible = !(this.inv > 0 && this.state !== 'block' && Math.floor(this.inv * 20) % 2 === 0 && this.inv < 1.05 && this.inv > 0.3);
    if (this.scarf) this.scarf.mesh.visible = this.model.visible;
    if (this.fx) for (const p of this.fx.userData.parts) { p.userData.t += dt * 2.2; const u = p.userData.t % 1; p.position.set((Math.random() - 0.5) * 0.04, this.fx.userData.len * p.userData.along, (Math.random() - 0.5) * 0.04 + (this.fx.userData.elem === 'fire' ? u * 0.0 : 0)); p.position.y += this.fx.userData.elem === 'fire' ? u * 0.25 : 0; p.material.opacity = 1 - u; const sc = (this.fx.userData.elem === 'lightning' ? (Math.random() < 0.3 ? 0.25 : 0.08) : 0.16) * (1 - u * 0.5); p.scale.setScalar(sc); }
  }
}

// Swing ribbon: samples the blade's base and tip each frame of a strike so attacks read clearly from the side view.
const TRAIL_COL = { fire: 0xff7a30, ice: 0x8ad8ff, lightning: 0xfff070, poison: 0x8aff6a };
class Trail {
  constructor(scene) {
    this.max = 28; this.pts = [];
    this.geo = new THREE.BufferGeometry(); this.pos = new Float32Array(this.max * 2 * 3); this.alpha = new Float32Array(this.max * 2);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1)); const w = new Float32Array(this.max * 2); for (let i = 0; i < this.max; i++) w[i * 2 + 1] = 1; this.geo.setAttribute('w', new THREE.BufferAttribute(w, 1));
    const idx = []; for (let i = 0; i < this.max - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } this.geo.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(0x7fa0ff) }, fade: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute float alpha; attribute float w; varying float a; varying float v; void main(){ a=alpha; v=w; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 col; uniform float fade; varying float a; varying float v; void main(){ float body=a*v*v*.55; float edge=a*smoothstep(.82,1.,v)*1.3; float f=(body+edge)*fade; vec3 c=mix(col, vec3(1.), smoothstep(.9,1.,v)*a*.7); gl_FragColor=vec4(c*f*1.6, f); }' });
    this.mesh = new THREE.Mesh(this.geo, this.mat); this.mesh.frustumCulled = false; this.mesh.visible = false; scene.add(this.mesh); this.life = 0;
  }
  push(weapon, elem) {
    if (!weapon) return;
    const len = weapon.userData.len * 1.8 / weapon.scale.x;
    const base = weapon.localToWorld(new THREE.Vector3(0, len * 0.35, 0)), tip = weapon.localToWorld(new THREE.Vector3(0, len * 1.02, 0));
    // fill big per-frame jumps with arc-interpolated samples so the ribbon curves instead of fanning into a flat card
    const prev = this.pts[0];
    if (prev) { const L = tip.distanceTo(base), d0 = prev[1].clone().sub(prev[0]).normalize(), d1 = tip.clone().sub(base).normalize(), steps = Math.min(4, Math.ceil(d0.angleTo(d1) / 0.18));
      for (let s = 1; s < steps; s++) { const t = s / steps, b = prev[0].clone().lerp(base, t), d = d0.clone().lerp(d1, t).normalize(); this.pts.unshift([b, b.clone().addScaledVector(d, L)]); } }
    this.pts.unshift([base, tip]); while (this.pts.length > this.max) this.pts.pop();
    this.mat.uniforms.col.value.setHex(TRAIL_COL[elem] || 0x7fa0ff); this.life = 0.16; this.mesh.visible = true; this.write();
  }
  write() {
    const n = this.pts.length;
    for (let i = 0; i < this.max; i++) { const p = this.pts[Math.min(i, n - 1)]; const k = i < n ? 1 - i / n : 0;
      this.pos.set([p[0].x, p[0].y, p[0].z], i * 6); this.pos.set([p[1].x, p[1].y, p[1].z], i * 6 + 3); this.alpha[i * 2] = k * k; this.alpha[i * 2 + 1] = k * k; }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.alpha.needsUpdate = true;
  }
  end() { this.pts.length = 0; }
  update(dt) { if (this.life > 0) { this.life -= dt; this.mat.uniforms.fade.value = Math.max(0, this.life / 0.16); if (this.life <= 0) { this.mesh.visible = false; this.pts.length = 0; } } }
}

// Crimson scarf: a short verlet ribbon pinned at the neck — a colour accent that reads from the side and shows motion.
class Scarf {
  constructor(scene, anchor) {
    this.anchor = anchor; this.n = 8; this.seg = 0.075; this.p = []; this.o = [];
    for (let i = 0; i < this.n; i++) { this.p.push(new THREE.Vector3()); this.o.push(new THREE.Vector3()); }
    this.geo = new THREE.BufferGeometry(); this.pos = new Float32Array(this.n * 2 * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx = []; for (let i = 0; i < this.n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ color: 0xa0101e, emissive: 0x3a0208, roughness: 0.7, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false; this.mesh.castShadow = true; scene.add(this.mesh); this.init = false;
  }
  update(dt, facing, vel) {
    if (!this.anchor) return;
    const a = this.anchor.getWorldPosition(new THREE.Vector3()); a.y -= 0.02; a.x -= facing * 0.1;
    if (this.init && this.p[1].distanceTo(a) > 0.6) this.init = false;
    if (!this.init) { this.p.forEach((p, i) => { p.copy(a).x -= facing * i * this.seg; this.o[i].copy(p); }); this.init = true; }
    const g = -26 * dt * dt, wind = (-facing * 1.5 - vel.x * 1.6) * dt * dt;
    this.p[0].copy(a); this.o[0].copy(a);
    for (let i = 1; i < this.n; i++) { const p = this.p[i], o = this.o[i], vx = (p.x - o.x) * 0.9, vy = (p.y - o.y) * 0.9; o.copy(p); p.x += vx + wind; p.y += vy + g; p.z = a.z - 0.05; }
    for (let k = 0; k < 3; k++) for (let i = 1; i < this.n; i++) { const A = this.p[i - 1], B = this.p[i], d = B.clone().sub(A), L = d.length() || 1e-4; B.copy(A).addScaledVector(d, this.seg / L); }
    for (let i = 0; i < this.n; i++) { const p = this.p[i], w = 0.13 * (1 - i / this.n * 0.7); this.pos.set([p.x, p.y + w / 2, p.z + 0.02], i * 6); this.pos.set([p.x, p.y - w / 2, p.z - 0.02], i * 6 + 3); }
    this.geo.attributes.position.needsUpdate = true; this.geo.computeVertexNormals();
  }
}
