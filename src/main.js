import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { World, glowTex, flameTex, ZB } from './world.js';
import { ROOMS, roomById, SW, SH, FLOOR } from './rooms.js';
import { Player } from './player.js';
import { Enemy, TYPES } from './enemies.js';
import { UI } from './ui.js';
import { loadMeta, weaponModel, audio, surface } from './assets.js';
import { makeItem, makeGem, makeUnique, rollDrop, BASES, GEMS } from './items.js';

const $ = id => document.getElementById(id);

// ------------------------------------------------------------------------------------- input
class Input {
  constructor() {
    this.keys = new Set(); this.pressed = new Set(); this.pad = null; this.padPrev = [];
    addEventListener('keydown', e => { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault(); if (!this.keys.has(e.code)) this.pressed.add(e.code); this.keys.add(e.code); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }
  poll() {
    const k = this.keys, p = this.pressed, any = (...c) => c.some(x => k.has(x)), hit = (...c) => c.some(x => p.has(x));
    const gp = navigator.getGamepads?.()[0], b = i => !!gp?.buttons[i]?.pressed, bp = i => b(i) && !this.padPrev[i];
    const ax = gp ? (Math.abs(gp.axes[0]) > 0.4 ? Math.sign(gp.axes[0]) : 0) : 0, ay = gp ? (gp.axes[1] > 0.55 ? 1 : 0) : 0;
    const s = {
      x: (any('ArrowRight', 'KeyD') || b(15) || ax > 0 ? 1 : 0) - (any('ArrowLeft', 'KeyA') || b(14) || ax < 0 ? 1 : 0),
      down: any('ArrowDown', 'KeyS') || b(13) || !!ay,
      jump: any('Space', 'KeyK') || b(0), jumpP: hit('Space', 'KeyK') || bp(0),
      attackP: hit('KeyJ', 'KeyX') || bp(2), shield: any('KeyL', 'KeyC') || b(4) || b(6),
      dashP: hit('ShiftLeft', 'ShiftRight') || bp(5) || bp(7), interactP: hit('KeyE', 'ArrowUp', 'KeyW') || bp(3) || bp(12),
      potionP: hit('KeyQ') || bp(1), invP: hit('KeyI', 'Tab') || bp(9), mapP: hit('KeyM') || bp(8),
    };
    this.padPrev = gp ? gp.buttons.map(x => x.pressed) : [];
    this.menuKeys = [...p]; p.clear();
    return s;
  }
}

// ------------------------------------------------------------------------------------- fx
class FX {
  constructor(scene) { this.scene = scene; this.parts = []; this.mat = new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }); }
  spawn(x, y, z, vx, vy, col, life, size, grav = 6, additive = true) {
    const m = this.mat.clone(); m.color.setHex(col); if (!additive) { m.blending = THREE.NormalBlending; }
    const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.setScalar(size); this.scene.add(s);
    this.parts.push({ s, vx, vy, life, max: life, size, grav });
  }
  burst(x, y, col, n = 12, sp = 3) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random()); this.spawn(x, y, 0.6, Math.cos(a) * v, Math.sin(a) * v, col, 0.35 + Math.random() * 0.3, 0.18 + Math.random() * 0.2); } }
  dust(x, y, col = 0x8a8070) { for (let i = 0; i < 8; i++) this.spawn(x + (Math.random() - 0.5) * 0.6, y + 0.1, 0.4, (Math.random() - 0.5) * 2.5, Math.random() * 0.8, col, 0.5, 0.35, -0.5, false); }
  glint(x, y, col) { this.spawn(x, y, 0.8, 0, 0, col, 0.25, 0.9, 0); }
  line(a, b, col) {
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t + (i % 8 ? (Math.random() - 0.5) * 0.5 : 0), a.y + (b.y - a.y) * t + (i % 8 ? (Math.random() - 0.5) * 0.5 : 0), 0.6)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true })); this.scene.add(l); setTimeout(() => { this.scene.remove(l); l.geometry.dispose(); }, 160);
  }
  update(dt) {
    for (const p of this.parts) { p.life -= dt; p.vy -= p.grav * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; const k = p.life / p.max; p.s.material.opacity = k; p.s.scale.setScalar(p.size * (0.5 + k * 0.5)); }
    this.parts = this.parts.filter(p => { if (p.life > 0) return true; this.scene.remove(p.s); p.s.material.dispose(); return false; });
  }
}

// ------------------------------------------------------------------------------------- game
class Game {
  constructor() {
    const canvas = $('view');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x05040a);
    this.scene.fog = new THREE.Fog(0x0b0810, 16, 50);
    this.camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.5, 400);
    this.hemi = new THREE.HemisphereLight(0x8a90c0, 0x201418, 0.35); this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xaab8ff, 0.6); this.moon.castShadow = true;
    Object.assign(this.moon.shadow.camera, { left: -14, right: 14, top: 10, bottom: -6, near: 1, far: 60 }); this.moon.shadow.mapSize.set(2048, 2048); this.moon.shadow.bias = -0.0005; this.moon.shadow.normalBias = 0.03;
    this.scene.add(this.moon, this.moon.target);
    // soft key from the viewer so armoured silhouettes read against dark halls (Bloodstained lights rooms by hand; this is our baseline)
    this.camFill = new THREE.DirectionalLight(0xd8d0e8, 0.9); this.scene.add(this.camFill, this.camFill.target);
    this.backRim = new THREE.DirectionalLight(0x9fb4ff, 1.8); this.scene.add(this.backRim, this.backRim.target); // rim on every silhouette
    const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environmentIntensity = 0.3; // metal needs something to reflect
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1024, 576), 0.55, 0.5, 0.82); this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.input = new Input(); this.fx = new FX(this.scene); this.ui = new UI(this);
    this.world = new World(this.scene); this.player = new Player(this);
    this.enemies = []; this.loot = []; this.visited = new Set(); this.flags = {}; this.camPos = new THREE.Vector2(); this.shakeT = 0; this.stopT = 0; this.time = 0;
    addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.composer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  async load(msg) {
    msg('Reading the castle\'s bones…'); await loadMeta();
    msg('Raising the halls…'); await this.world.build();
    msg('Waking the pilgrim…'); await this.player.load();
    msg('Rousing the dead…');
    for (const room of this.world.rooms) {
      room.enemies = [];
      for (const spec of room.def.enemies || []) { const e = new Enemy(this, spec, room); await e.load(); room.enemies.push(e); }
      room.chests = [];
      for (const [i, c] of (room.def.chests || []).entries()) room.chests.push(this.makeChest(room, c, i));
    }
    this.fogGate = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.6), new THREE.MeshBasicMaterial({ color: 0xff3050, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
    this.fogGate.visible = false; this.scene.add(this.fogGate);
    this.newGame();
  }

  newGame(fromSave) {
    const P = this.player, save = fromSave && this.readSave();
    for (const L of this.loot) L.room.group.remove(L.grp); this.loot = [];
    if (save) {
      Object.assign(P.stats, save.stats); this.flags = save.flags; P.bag = save.bag; P.equip = save.equip;
      for (const s of ['weapon', 'offhand']) P.attachVisual(s);
      const r = roomById[save.room], rm = this.world.rooms.find(x => x.def === r); P.pos.set(rm.saveAt.x, rm.saveAt.y);
    } else {
      const c = this.world.rooms[0]; P.pos.set(c.b.x0 + c.def.start.x, c.b.y0 + c.def.start.y);
    }
    P.refreshStats(); if (!save) { P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax; }
    for (const room of this.world.rooms) {
      for (const [i, it] of (room.def.items || []).entries()) { const key = `item:${room.def.id}:${i}`; if (!this.flags[key]) this.spawnPlaced(room, it, key); }
      for (const t of room.thorns || []) if (this.flags['thorn:' + room.def.id]) { t.gone = true; t.mesh.visible = false; }
      for (const ch of room.chests) if (this.flags[ch.key]) ch.open(true);
    }
    this.enterRoom(this.world.roomAt(P.pos.x, P.pos.y + 0.9), true);
  }

  // ------------------------------------------------------------------ loot
  async spawnPlaced(room, it, key) {
    const x = room.b.x0 + it.x, y = room.b.y0 + it.y;
    let item;
    if (it.gem) item = makeGem(it.gem);
    else item = makeItem(it.base, { rarity: it.rarity, sockets: it.sockets });
    if (it.pedestal) {
      const m = surface(it.altar ? 'marble' : 'ashlar', 1, 1, it.altar ? { dir: 'assets/game/interior/' } : {});
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.9, 10), m); ped.position.set(x, y + 0.45, -0.6); ped.castShadow = ped.receiveShadow = true; room.group.add(ped);
      this.dropLoot(x, y + 0.9, item, room, key, true);
    } else this.dropLoot(x, y, item, room, key, true);
  }

  async dropLoot(x, y, item, room = this.room, key, placed) {
    const grp = new THREE.Group(); grp.position.set(x, y, -0.6); room.group.add(grp);
    const L = { item, room, grp, x, y, key, bob: Math.random() * 6, placed, vy: placed ? 0 : 5 };
    const col = item.gold ? 0xffd040 : item.potion ? 0xff3050 : item.gem ? GEMS[item.gem].color : { normal: 0xe0e0e0, magic: 0x6c8cff, rare: 0xffd84a, unique: 0xc88a3a }[item.rarity];
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.16, 2.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: item.rarity === 'unique' || item.rarity === 'rare' ? 0.45 : 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 1.3; grp.add(beam);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.03; grp.add(pool);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); glow.scale.setScalar(0.9); glow.position.y = 0.55; glow.material.opacity = 0.6; grp.add(glow);
    let model;
    if (item.base && BASES[item.base].model) { model = await weaponModel(BASES[item.base].model, BASES[item.base].scale * 0.8); model.rotation.z = Math.PI / 2.4; }
    else if (item.gem) { model = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.15 })); }
    else if (item.potion) { model = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0xa0102a, emissive: 0x500010, roughness: 0.1, transparent: true, opacity: 0.85 })); }
    else if (item.gold) { model = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14), new THREE.MeshStandardMaterial({ color: 0xffc840, metalness: 1, roughness: 0.3, emissive: 0x301800 })); model.rotation.x = Math.PI / 2; }
    else { model = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: col })); }
    model.position.y = 0.55; grp.add(model); L.model = model;
    const light = new THREE.PointLight(col, 3, 4, 1.6); light.position.y = 0.8; grp.add(light);
    this.loot.push(L); return L;
  }

  updateLoot(dt) {
    const P = this.player;
    for (const L of this.loot) {
      if (L.room !== this.room) continue;
      L.bob += dt * 2.4; L.model.position.y = 0.55 + Math.sin(L.bob) * 0.08; L.model.rotation.y += dt * 1.6;
      if (!L.placed) { L.vy -= 18 * dt; L.grp.position.y += L.vy * dt; const floor = this.floorBelow(L.grp.position.x, L.grp.position.y + 0.3); if (L.grp.position.y <= floor) { L.grp.position.y = floor; L.vy = 0; L.placed = true; } }
      const dx = Math.abs(P.pos.x - L.grp.position.x), dy = L.grp.position.y + 0.4 - P.pos.y;
      if (dx < 0.75 && dy > -0.4 && dy < 1.8 && P.state !== 'dead') this.pickup(L);
    }
    this.loot = this.loot.filter(L => !L.taken);
  }
  floorBelow(x, y) { let best = -1e9; for (const s of this.world.solids) if (!s.gone && x > s.x0 && x < s.x1 && s.y1 <= y + 0.01 && s.y1 > best) best = s.y1; return best; }

  pickup(L) {
    const P = this.player, it = L.item; L.taken = true; L.room.group.remove(L.grp); if (L.key) this.flags[L.key] = true;
    if (it.gold) { P.stats.gold += it.gold; audio.play('coins_gather_quick', 0.5); this.ui.dmg(P.pos.x, P.pos.y + 2.1, `+${it.gold}g`, 'lightning'); return; }
    if (it.potion) { P.stats.potions++; audio.play('heart_collect', 0.5); this.ui.toast('Potion of Vigor', 'magic'); return; }
    P.bag.push(it);
    if (it.gem) { audio.play('gem_collect', 0.6); this.ui.toast(`${GEMS[it.gem].name} — open the pack (I) and press S to socket it`, 'gem'); if (it.gem === 'ruby' && !this.flags.rubyHint) { this.flags.rubyHint = 1; setTimeout(() => this.ui.toast('A fire gem in a weapon will burn through blackthorn.', 'gem'), 1600); } }
    else { audio.play(it.rarity === 'unique' ? 'firebuff_1' : it.rarity === 'rare' ? 'gem_collect' : it.rarity === 'magic' ? 'glass_ping_small' : 'weapon_pick_up', 0.6); this.ui.toast(`${it.rarity === 'unique' ? '★ ' : ''}${it.name}`, it.rarity); if (BASES[it.base].slot === 'offhand' && !this.flags.shieldHint) { this.flags.shieldHint = 1; setTimeout(() => this.ui.toast('Equip it (I), then HOLD L to raise the shield', 'magic'), 1200); } }
    if (it.base === 'pilgrim_blade') { this.ui.prompt('Press I to open your pack, then Enter to equip the Pilgrim\'s Blade'); this.tutorial = 'equip'; }
  }

  makeChest(room, c, i) {
    const x = room.b.x0 + c.x, y = room.b.y0 + (c.y ?? FLOOR), key = `chest:${room.def.id}:${i}`;
    const wood = surface('wood', 1, 1), iron = new THREE.MeshStandardMaterial({ color: 0x3a3028, metalness: 0.8, roughness: 0.4 });
    const g = new THREE.Group(); g.position.set(x, y, -1.2); if (c.big) g.scale.setScalar(1.35);
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), wood); bodyM.position.y = 0.3; bodyM.castShadow = true;
    const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.4);
    const lidM = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10, 1, false, 0, Math.PI), wood); lidM.rotation.z = Math.PI / 2; lidM.position.z = 0.4; lid.add(lidM);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 0.84), iron); band.position.y = 0.45;
    g.add(bodyM, lid, band); room.group.add(g);
    const ch = { room, x, y, key, opened: false, def: c, open: (silent) => { ch.opened = true; lid.rotation.x = -1.9; if (!silent) { audio.play('chest_open_1', 0.6); this.dropLoot(x, y + 0.8, c.unique ? makeUnique(c.unique) : c.gem ? makeGem(c.gem) : makeItem(c.base, { rarity: c.rarity, sockets: c.sockets, lvl: 3 }), room); this.flags[key] = true; if (c.unique) { this.slowMo(0.6); this.fx.burst(x, y + 1, 0xc88a3a, 40, 5); } } } };
    return ch;
  }

  // ------------------------------------------------------------------ rooms
  enterRoom(room, instant) {
    if (!room || room === this.room) return;
    const old = this.room; if (old) old.group.visible = false;
    if (old?.def.boss && this.gateSolid === null && !this.flags.boss) $('bossBar').classList.add('hidden');
    if (old?.def.boss && !this.flags.boss) { $('bossBar').classList.add('hidden'); for (const e of old.enemies) if (e.boss && !e.dead) { e.awake = false; e.hp = e.T.hp; e.pos.copy(e.home); e.state = 'idle'; } }
    this.room = room; room.group.visible = true; this.visited.add(room.def.id);
    const T = room.theme; this.scene.fog.color.setHex(T.fog[0]); this.scene.fog.near = T.fog[1]; this.scene.fog.far = T.fog[2]; this.scene.background.setHex(room.def.theme === 'outdoor' ? 0x141a30 : T.fog[0]);
    this.hemi.intensity = T.amb * 1.4; this.moon.intensity = T.moon;
    if (!instant) { $('fade').style.opacity = 0.85; setTimeout(() => $('fade').style.opacity = 0, 90); }
    this.snapCam = true;
    if (!old || old.def.name !== room.def.name) this.ui.roomName(room.def.name);
    audio.music(room.def.boss && !this.flags.boss ? 'action_3' : room.def.theme === 'outdoor' ? 'intro_cursed_citadel' : room.def.theme === 'crypt' ? 'dark_2' : 'dark_1', 0.3);
  }
  respawn(e) {
    e.dead = false; e.gone = false; e.hp = e.T.hp; e.pos.copy(e.home); e.vel.set(0, 0); e.state = e.spec.rise ? 'buried' : 'idle'; e.t = 0; e.root.visible = !e.spec.rise; e.curName = null;
    e.model.traverse(o => { if (o.isMesh) { o.material.opacity = 1; o.material.transparent = false; } });
    e.play(e.spec.rise ? e.T.anim.rise : e.T.anim.idle, 0, { restart: true }); if (e.spec.rise) e.cur.paused = true;
  }
  activeSolids() {
    const p = this.player.pos; const out = this._solids || (this._solids = []); out.length = 0;
    for (const s of this.world.solids) if (s.x1 > p.x - 24 && s.x0 < p.x + 24 && s.y1 > p.y - 20 && s.y0 < p.y + 20) out.push(s);
    if (this.gateSolid) out.push(this.gateSolid);
    return out;
  }

  // ------------------------------------------------------------------ combat hooks
  playerHits(hb) {
    const P = this.player, room = this.room;
    for (const e of room.enemies) { if (hb.attack.hitIds.has(e.id)) continue; const roll = P.rollDamage(); if (e.hit(hb, roll, P)) { this.hitStop((e.boss ? 0.09 : e.spec.t === 'knight' ? 0.075 : 0.06) + (roll.crit ? 0.05 : 0)); this.shake(roll.crit ? 0.35 : 0.14); if (roll.crit) this.flash(); } }
    for (const bk of room.breakables || []) if (!bk.broken && Math.abs(bk.x - (hb.x0 + hb.x1) / 2) < (hb.x1 - hb.x0) / 2 + 0.25 && hb.y0 < bk.y + 1.6 && hb.y1 > bk.y) this.breakCandle(bk);
    for (const t of room.thorns || []) if (!t.gone && !hb.attack.hitIds.has('thorn') && hb.x0 < t.x1 && hb.x1 > t.x0 && hb.y0 < t.y1 && hb.y1 > t.y0) {
      hb.attack.hitIds.add('thorn');
      if (P.d.elems.some(e => e.elem === 'fire')) this.burnThorns(t);
      else { audio.play('sword_blocked_2', 0.6); this.fx.burst((t.x0 + t.x1) / 2, P.pos.y + 1.2, 0xc0c0a0, 8, 3); this.ui.prompt('The blackthorn shrugs off cold steel. Something burning might work…'); setTimeout(() => this.ui.prompt(''), 2600); }
    }
    for (const c of room.chests) if (!c.opened && !hb.attack.hitIds.has('c' + c.key) && hb.x0 < c.x + 0.6 && hb.x1 > c.x - 0.6 && hb.y0 < c.y + 0.7) { hb.attack.hitIds.add('c' + c.key); c.open(); }
  }
  breakCandle(bk) {
    bk.broken = true; bk.grp.visible = false; audio.play('glass_ping_small', 0.5, 0.8); this.fx.burst(bk.x, bk.y + 1.4, 0xffb050, 14, 3);
    const r = Math.random(), drop = r < 0.6 ? { gold: 3 + (Math.random() * 10 | 0) } : r < 0.75 ? { potion: true } : r < 0.82 ? makeGem(['ruby', 'sapphire', 'topaz', 'emerald', 'skull'][Math.random() * 5 | 0]) : null;
    if (drop) this.dropLoot(bk.x, bk.y + 1.2, drop, this.room);
  }
  flash() { const f = $('fade'); f.style.transition = 'none'; f.style.background = '#fff'; f.style.opacity = 0.35; requestAnimationFrame(() => { f.style.transition = 'opacity .18s'; f.style.opacity = 0; setTimeout(() => f.style.background = '#000', 200); }); }
  slowMo(t) { this.slowT = t; }
  // The gem set-piece: slow-mo, the blade catches, and the map marks where it matters.
  ignite(elem) {
    const P = this.player, col = { fire: 0xff6a10, ice: 0x6ad0ff, lightning: 0xffe24a, poison: 0x6aff4a }[elem];
    this.slowMo(0.8); this.flash(); audio.play(elem === 'fire' ? 'firebuff_2' : elem === 'ice' ? 'ice_freeze_1' : 'spell_impact_3', 0.7);
    for (let i = 0; i < 40; i++) setTimeout(() => this.fx.burst(P.pos.x + P.facing * 0.5, P.pos.y + 1.2, col, 3, 3), i * 18);
    this.ui.roomName(elem === 'fire' ? 'THE BLADE CATCHES FIRE' : 'THE BLADE AWAKENS');
    if (elem === 'fire' && !this.flags['thorn:lowerhall']) { this.objective = { c: 19.8, r: 0.6 }; this.ui.toast('Objective: burn the blackthorn in the Hall of Lost Pilgrims (marked on map)', 'unique'); }
  }
  shockwave(src, x, y, dir) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 6), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
    m.position.set(x, y + 0.7, 0.2); src.room.group.add(m); audio.play('rock_wall_1', 0.6); this.shake(0.3);
    this.waves = (this.waves || []).concat({ m, x, y, dir, t: 0, room: src.room, dmg: src.T.dmg * 0.8 });
  }
  updateWaves(dt) {
    const P = this.player;
    for (const w of this.waves || []) { w.t += dt; w.x += w.dir * 8 * dt; w.m.position.x = w.x; w.m.scale.y = 1 + Math.sin(w.t * 30) * 0.15; if (Math.random() < 0.5) this.fx.spawn(w.x, w.y + 0.2, 0.3, 0, 2, 0xff5020, 0.3, 0.3, 0);
      if (!w.hit && Math.abs(P.pos.x - w.x) < 0.5 && P.pos.y < w.y + 1.2) { w.hit = true; P.takeHit(w.dmg, w.x - w.dir); } if (w.t > 1.8) { w.done = true; w.room.group.remove(w.m); } }
    this.waves = (this.waves || []).filter(w => !w.done);
  }
  burnThorns(t) {
    t.gone = true; this.flags['thorn:' + this.room.def.id] = true; this.objective = null; this.slowMo(0.5); audio.play('fire_big', 0.6); audio.play('firespray_1', 0.5);
    let k = 0; const iv = setInterval(() => { k += 0.05; t.mesh.scale.setScalar(Math.max(0.01, 1 - k)); t.mesh.position.y = -k * 2; for (let i = 0; i < 4; i++) this.fx.spawn(t.x0 + Math.random() * 1.6, t.y0 + Math.random() * 4, 0.4, (Math.random() - 0.5), 2 + Math.random() * 2, Math.random() < 0.5 ? 0xff6a10 : 0xffc040, 0.7, 0.35, -2); if (k >= 1) { clearInterval(iv); t.mesh.visible = false; } }, 40);
    this.ui.toast('The blackthorn burns away!', 'unique');
  }
  chainLightning(src, dmg) {
    const other = this.room.enemies.find(e => e !== src && !e.dead && Math.abs(e.pos.x - src.pos.x) < 5 && Math.abs(e.pos.y - src.pos.y) < 3);
    this.fx.line({ x: src.pos.x, y: src.pos.y + 1.2 }, other ? { x: other.pos.x, y: other.pos.y + 1.2 } : { x: src.pos.x + (Math.random() - 0.5) * 2, y: src.pos.y + 2.5 }, 0xffe860);
    audio.play('spell_impact_2', 0.35, 1.4);
    if (other) other.damage(Math.ceil(dmg * 0.6), 'lightning', true);
  }
  blockBurst(x, y, elem) {
    const col = { fire: 0xff6a20, ice: 0x6ad0ff, lightning: 0xffe24a }[elem]; this.fx.burst(x, y, col, 20, 5);
    for (const e of this.room.enemies) if (!e.dead && Math.abs(e.pos.x - x) < 2) { e.damage(6, elem, true); if (elem === 'ice') e.chill = 3; }
  }
  hitStop(t) { this.stopT = Math.max(this.stopT, t); }
  shake(a) { this.shakeT = Math.max(this.shakeT, a); }
  onEnemyDeath(e) {
    const P = this.player; P.gainXP(e.T.xp);
    const drop = e.spec.drop === 'potion' ? { potion: true } : rollDrop(e.T.lvl + P.stats.lvl - 1, P.d.mf);
    if (drop) setTimeout(() => this.dropLoot(e.pos.x, e.pos.y + 1, drop.base || drop.gem ? drop : drop, e.room), 500);
    if (e.boss) {
      this.flags.boss = true; $('bossBar').classList.add('hidden'); this.gateSolid = null; this.fogGate.visible = false;
      this.ui.roomName('OATHBREAKER VANQUISHED'); this.slowMo(1.2); this.flash(); audio.play('firebuff_1', 0.7); audio.music('ambient_3', 0.3);
      setTimeout(() => { this.dropLoot(e.pos.x - 1, e.pos.y + 1.4, makeGem('onyx'), e.room); this.dropLoot(e.pos.x + 0.2, e.pos.y + 1.4, makeItem('dawnstar_kite', { rarity: 'rare', sockets: 2 }), e.room); this.dropLoot(e.pos.x + 1.4, e.pos.y + 1.4, makeItem('iron_greataxe', { rarity: 'magic', sockets: 3 }), e.room); }, 900);
    }
  }
  bossStart(e) {
    $('bossBar').classList.remove('hidden'); $('bossName').textContent = e.T.name.toUpperCase(); this.bossUpdate(e);
    const r = e.room, gx = 18 * SW + SW / 2; this.gateSolid = { x0: gx - 1.6, x1: gx + 1.6, y0: r.b.y1 - FLOOR, y1: r.b.y1 + 0.6 };
    this.fogGate.position.set(gx, r.b.y1 - 0.25, 0.4); this.fogGate.visible = true; audio.music('action_3', 0.4); audio.play('portcullis_gate', 0.6);
  }
  bossUpdate(e) { if (e.boss) $('bossFill').style.width = Math.max(0, 100 * e.hp / e.T.hp) + '%'; }
  onPlayerDeath() {
    audio.play('wilhelm_scream', 0.25); this.ui.roomName('YOU HAVE PERISHED');
    setTimeout(() => { $('fade').style.opacity = 1; }, 1800);
    setTimeout(() => {
      const P = this.player; P.state = 'free'; P.stats.hp = P.stats.hpMax; P.inv = 1.5; P.vel.set(0, 0); P.layers.lower.cur = P.layers.upper.cur = null;
      const save = this.readSave(); if (save) { const rm = this.world.rooms.find(x => x.def.id === save.room); P.pos.set(rm.saveAt.x, rm.saveAt.y); } else { const c = this.world.rooms[0]; P.pos.set(c.b.x0 + c.def.start.x, c.b.y0 + c.def.start.y); }
      if (this.gateSolid) { this.gateSolid = null; this.fogGate.visible = false; $('bossBar').classList.add('hidden'); for (const r of this.world.rooms) for (const e of r.enemies) if (e.boss && !e.dead) { e.awake = false; e.hp = e.T.hp; e.pos.copy(e.home); e.state = 'idle'; } }
      this.respawnAll(); this.room = null; this.enterRoom(this.world.roomAt(P.pos.x, P.pos.y + 0.9), true); $('fade').style.opacity = 0;
    }, 2600);
  }
  onEquip(it) { if (this.tutorial === 'equip' && this.player.equip.weapon) { this.tutorial = null; this.ui.prompt(''); this.ui.toast('J to attack — while running, jumping or crouching too', 'magic'); } }

  // ------------------------------------------------------------------ save
  save(room) { const P = this.player; localStorage.setItem('vesperwrithe_save', JSON.stringify({ stats: P.stats, equip: P.equip, bag: P.bag, flags: this.flags, room: room.def.id })); }
  readSave() { try { return JSON.parse(localStorage.getItem('vesperwrithe_save')); } catch { return null; } }

  respawnAll() { for (const r of this.world.rooms) { for (const e of r.enemies) if (e.dead && !e.boss) this.respawn(e); for (const bk of r.breakables) { bk.broken = false; bk.grp.visible = true; } } }
  interact() {
    const P = this.player, r = this.room;
    if (r.saveAt && Math.abs(P.pos.x - r.saveAt.x) < 1.8) { this.respawnAll(); P.state = 'sit'; P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax; this.save(r); audio.play('firebuff_2', 0.5); this.ui.toast('Your vigor returns. Progress recorded.', 'unique'); return; }
    if (r.warpAt && Math.abs(P.pos.x - r.warpAt.x) < 1.8) { this.ui.toast('The mirror is dark. Its twin lies deeper in the castle.', 'magic'); return; }
    for (const c of r.chests) if (!c.opened && Math.abs(P.pos.x - c.x) < 1.4) { c.open(); return; }
  }
  promptFor() {
    const P = this.player, r = this.room; if (this.tutorial) return;
    let t = '';
    if (r.saveAt && Math.abs(P.pos.x - r.saveAt.x) < 1.8) t = 'E — Rest at the coffin (heal & save)';
    else if (r.warpAt && Math.abs(P.pos.x - r.warpAt.x) < 1.8) t = 'E — Touch the mirror';
    else if (r.chests.some(c => !c.opened && Math.abs(P.pos.x - c.x) < 1.4)) t = 'E — Open';
    else for (const l of r.def.lore || []) if (Math.abs(P.pos.x - (r.b.x0 + l.x)) < 3) t = l.text;
    if (t !== this._pt) { this._pt = t; this.ui.prompt(t); }
  }

  // ------------------------------------------------------------------ loop
  step(dt) {
    const inp = this.input.poll(), P = this.player;
    if (inp.invP) this.ui.toggle('inv'); else if (inp.mapP) this.ui.toggle('map');
    if (this.ui.open) { if (this.ui.open === 'inv') for (const k of this.input.menuKeys) if (!['KeyI', 'Tab'].includes(k)) this.ui.invKey(k); if (this.ui.open === 'map' && this.input.menuKeys.includes('Escape')) this.ui.toggle('map'); if (this.input.menuKeys.includes('Escape') && this.ui.open === 'inv' && !this.ui.socketMode) this.ui.toggle('inv'); this.render(0); return; }
    if (this.slowT > 0) { this.slowT -= dt; dt *= 0.3; }
    this.time += dt;
    if (this.stopT > 0) { this.stopT -= dt; this.render(0); return; }
    if (inp.interactP && P.onGround && P.state === 'free') this.interact();
    if (inp.potionP && P.stats.potions > 0 && P.stats.hp < P.stats.hpMax) { P.stats.potions--; P.heal(40); audio.play('heart_collect', 0.5); }
    P.update(dt, inp);
    const r = this.world.roomAt(P.pos.x, P.pos.y + 0.9); if (r && r !== this.room) this.enterRoom(r);
    for (const e of this.room.enemies) if (!e.gone) e.update(dt, P);
    this.updateLoot(dt); this.updateWaves(dt); this.fx.update(dt); this.world.update(this.time); this.promptFor();
    if (this.fogGate.visible) this.fogGate.material.opacity = 0.4 + Math.sin(this.time * 6) * 0.2;
    this.render(dt);
  }

  render(dt) {
    const P = this.player, b = this.room.b, cam = this.camera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 12.3, halfW = halfH * cam.aspect;
    let tx = P.pos.x + P.facing * 1.4, ty = P.pos.y + 1.3;
    const boss = this.room.enemies.find(e => e.boss && e.awake && !e.dead); // stage the boss: frame him on entrance, keep both in shot
    if (boss) tx = boss.state === 'intro' && boss.t < 2 && !boss.enraged ? boss.pos.x - boss.facing * 1.2 : (P.pos.x + boss.pos.x) / 2;
    tx = (b.x1 - b.x0) <= halfW * 2 ? (b.x0 + b.x1) / 2 : Math.max(b.x0 + halfW, Math.min(b.x1 - halfW, tx));
    // keep the floor ~1/6 up the screen like SotN; tall rooms scroll vertically
    const lo = b.y0 + halfH - 0.85, hi = Math.max(lo, b.y1 - halfH + 0.2);
    ty = Math.max(lo, Math.min(hi, ty));
    if (this.snapCam) { this.camPos.set(tx, ty); this.snapCam = false; }
    else { const k = 1 - Math.exp(-dt * 7); this.camPos.x += (tx - this.camPos.x) * k; this.camPos.y += (ty - this.camPos.y) * (1 - Math.exp(-dt * 5)); }
    let sx = 0, sy = 0; if (this.shakeT > 0) { this.shakeT -= dt; sx = (Math.random() - 0.5) * this.shakeT * 0.5; sy = (Math.random() - 0.5) * this.shakeT * 0.5; }
    cam.position.set(this.camPos.x + sx, this.camPos.y + 0.9 + sy, 12.3); cam.lookAt(this.camPos.x + sx, this.camPos.y + sy, 0);
    this.backRim.position.set(this.camPos.x + 2, this.camPos.y + 5, -12); this.backRim.target.position.set(this.camPos.x, this.camPos.y, 0);
    this.camFill.position.set(this.camPos.x + 3, this.camPos.y + 4, 14); this.camFill.target.position.set(this.camPos.x, this.camPos.y, 0);
    this.moon.position.set(this.camPos.x - 8, this.camPos.y + 18, 14); this.moon.target.position.set(this.camPos.x, this.camPos.y - 2, -1);
    this.ui.hud();
    this.composer.render();
  }

  start() {
    let last = performance.now(), acc = 0;
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt;
      if (window.__pause) this.composer.render(); // debug: hold the frame for inspection
      else if (acc >= 1 / 120) { this.step(Math.min(acc, 1 / 30)); acc = 0; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

const game = new Game(); window.game = game;
// Debug helpers (console): sim(frames, heldKeys, pressedKeys) steps the game; shot(...) frames a still with the free camera.
window.sim = (n, keys = [], press = []) => { const I = game.input; press.forEach(k => I.pressed.add(k)); keys.forEach(k => I.keys.add(k)); for (let i = 0; i < n; i++) { if (i === 1) I.pressed.clear(); game.step(1 / 60); } keys.forEach(k => I.keys.delete(k)); };
window.shot = (x, y, z, lx, ly, lz = 0) => { window.__pause = true; game.camera.position.set(x, y, z); game.camera.lookAt(lx, ly, lz); };
window.tp = (id, lx, ly, n = 45) => { const r = game.world.rooms.find(r => r.def.id === id); game.player.pos.set(r.b.x0 + lx, r.b.y0 + ly); game.player.vel.set(0, 0); sim(n); };
window.boot = () => new Promise(r => { const i = setInterval(() => { if (!$('startBtn').classList.contains('hidden')) { clearInterval(i); $('startBtn').click(); r('started'); } }, 200); });
game.load(t => $('loadMsg').textContent = t).then(() => {
  $('loadMsg').textContent = game.readSave() ? 'A pilgrim\'s rest is recorded. Enter to continue, N for a new journey.' : '';
  $('startBtn').classList.remove('hidden');
  const begin = (fresh) => { audio.resume(); $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); if (!fresh && game.readSave()) { game.room = null; game.newGame(true); } game.start(); removeEventListener('keydown', k); };
  const k = e => { if (e.code === 'Enter') begin(false); if (e.code === 'KeyN') { localStorage.removeItem('vesperwrithe_save'); begin(true); } };
  $('startBtn').onclick = () => begin(false); addEventListener('keydown', k);
}).catch(e => { console.error(e); $('loadMsg').textContent = 'Failed to load: ' + e.message; });
