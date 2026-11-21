import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { World, glowTex, ZB } from './world.js';
import { SW, SH, FLOOR, BELLS, BELL_ORDER, rowFloorY, DOOR_H, HOLE_W } from './rooms.js';
import { Player } from './player.js';
import { Enemy, TYPES, ELEM_COL } from './enemies.js';
import { UI } from './ui.js';
import { initTouch } from './touch.js';
import { loadMeta, weaponModel, audio, surface, loadGLTF, LOW_MEM } from './assets.js';
import { wantsTouch } from './touch.js';
import { startWeapon } from './attacks.js';
import { makeItem, makeGem, makeUnique, rollDrop, tierItem, BASES, GEMS, DROP_GEMS, ECHOES } from './items.js';

const HUE = { // [interior ambient, shadow lift (rgb)]: each wing keeps its own cast against the warm torch pools
  crypt: [0x2c3a34, [0.008, 0.022, 0.016]], catacomb: [0x2e3a32, [0.008, 0.02, 0.014]], royalcrypt: [0x2e383c, [0.01, 0.02, 0.022]], ossuary: [0x3a3828, [0.016, 0.016, 0.008]],
  cistern: [0x20363e, [0.004, 0.02, 0.028]], aqueduct: [0x223a36, [0.004, 0.022, 0.02]], clock: [0x4a3a20, [0.024, 0.016, 0.004]],
  throne: [0x4a262c, [0.03, 0.006, 0.012]], hollow: [0x4c2620, [0.03, 0.008, 0.006]], vestibule: [0x48302e, [0.024, 0.01, 0.012]],
  library: [0x4c3a26, [0.022, 0.014, 0.006]], portrait: [0x48282c, [0.024, 0.008, 0.012]], servants: [0x463826, [0.02, 0.014, 0.006]],
  chapel: [0x363252, [0.014, 0.012, 0.034]], shrine: [0x422e3a, [0.022, 0.01, 0.02]], mirror: [0x3c3a56, [0.016, 0.014, 0.036]],
  prison: [0x3a3430, [0.016, 0.012, 0.01]], mine: [0x2a2c38, [0.01, 0.012, 0.026]], sanctum: [0x2c2650, [0.016, 0.008, 0.04]], observatory: [0x24304e, [0.006, 0.014, 0.04]],
  belfry: [0x323a4c, [0.01, 0.014, 0.03]], menagerie: [0x3c3a28, [0.018, 0.016, 0.006]], forge: [0x4c2818, [0.034, 0.01, 0.002]], magma: [0x4c2014, [0.036, 0.008, 0.002]],
};
const CAMZ = 12.2, SAVE_KEY = 'vesperwrithe_save2';
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const MUSIC = { outdoor: 'intro_cursed_citadel', courtyard: 'ambient_2', garden: 'ambient_4', rampart: 'dark_5', crypt: 'dark_2', catacomb: 'dark_3', royalcrypt: 'ambient_6', aqueduct: 'ambient_5', cistern: 'ambient_7', library: 'light_2', portrait: 'light_4', vestibule: 'light_1', servants: 'ambient_1', ossuary: 'dark_4', prison: 'dark_4', clock: 'fx_2', mine: 'ambient_8', forge: 'fx_1', magma: 'fx_3', mirror: 'light_3', observatory: 'ambient_9', belfry: 'dark_5', sanctum: 'ambient_10', hollow: 'ambient_10', shrine: 'light_5', menagerie: 'ambient_3' };

// ------------------------------------------------------------------------------------- input
class Input {
  constructor() {
    this.keys = new Set(); this.pressed = new Set(); this.padPrev = [];
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
      up: any('ArrowUp', 'KeyW') || b(12) || (gp ? gp.axes[1] < -0.55 : false), attackP: hit('KeyJ', 'KeyX') || bp(2), shield: any('KeyL', 'KeyC') || b(4) || b(6),
      dashP: hit('ShiftLeft', 'ShiftRight') || bp(5) || bp(7), interactP: hit('KeyE', 'ArrowUp', 'KeyW') || bp(3) || bp(12),
      potionP: hit('KeyQ') || bp(1), invP: hit('KeyI', 'Tab') || bp(9), mapP: hit('KeyM') || bp(8),
    };
    if (gp) { const map = { 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight', 0: 'Enter', 1: 'Escape', 2: 'KeyS' }; for (const [i, c] of Object.entries(map)) if (bp(+i)) p.add(c); }
    this.padPrev = gp ? gp.buttons.map(x => x.pressed) : [];
    this.menuKeys = [...p]; p.clear();
    return s;
  }
}

// ------------------------------------------------------------------------------------- fx
class FX {
  constructor(scene) { this.scene = scene; this.parts = []; this.mat = new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }); this.free = []; }
  spawn(x, y, z, vx, vy, col, life, size, grav = 6, additive = true) {
    if (this.parts.length > 700) return;
    let s = this.free.pop(); if (!s) { s = new THREE.Sprite(this.mat.clone()); this.scene.add(s); }
    s.material.color.setHex(col); s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending; s.visible = true;
    s.position.set(x, y, z); s.scale.setScalar(size);
    this.parts.push({ s, vx, vy, life, max: life, size, grav });
  }
  burst(x, y, col, n = 12, sp = 3) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random()); this.spawn(x, y, 0.6, Math.cos(a) * v, Math.sin(a) * v, col, 0.35 + Math.random() * 0.3, 0.18 + Math.random() * 0.2); } }
  dust(x, y, col = 0x5a5046) { for (let i = 0; i < 8; i++) this.spawn(x + (Math.random() - 0.5) * 0.6, y + 0.1, 0.4, (Math.random() - 0.5) * 2.5, Math.random() * 0.8, col, 0.5, 0.35, -0.5, false); }
  glint(x, y, col) { this.spawn(x, y, 0.8, 0, 0, col, 0.25, 0.9, 0); }
  ring(x, y, col, r = 6, flat = false) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    if (flat) m.rotation.x = -Math.PI / 2; m.position.set(x, y, flat ? 0 : 0.8); this.scene.add(m);
    let t = 0; const tick = () => { t += 1 / 60; m.scale.setScalar(1 + t * r * 3); m.material.opacity = Math.max(0, 0.9 - t * 2); if (t < 0.5) requestAnimationFrame(tick); else { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } }; tick();
  }
  line(a, b, col) {
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t + (i % 8 ? (Math.random() - 0.5) * 0.5 : 0), a.y + (b.y - a.y) * t + (i % 8 ? (Math.random() - 0.5) * 0.5 : 0), 0.6)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true })); this.scene.add(l); setTimeout(() => { this.scene.remove(l); l.geometry.dispose(); }, 160);
  }
  update(dt) {
    for (const p of this.parts) { p.life -= dt; p.vy -= p.grav * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; const k = Math.max(0, p.life / p.max); p.s.material.opacity = k; p.s.scale.setScalar(p.size * (0.5 + k * 0.5)); }
    this.parts = this.parts.filter(p => { if (p.life > 0) return true; p.s.visible = false; this.free.push(p.s); return false; });
  }
}

const SHOT = { // look of each missile: colour, size, trail
  bolt: [0xff7a30, 0.55], orb: [0xb060ff, 0.7], skull: [0x9affb0, 0.7], feather: [0xe8e0d0, 0.35], gust: [0xc0d8ff, 0.8], book: [0xd0a060, 0.5], bone: [0xe8e0c8, 0.4], lob: [0x8aff5a, 0.55], acid: [0x8aff5a, 0.6],
  web: [0xf0f0ff, 0.6], ember: [0xff8a20, 0.6], crescent: [0xff5040, 1.0], arrow: [0xfff0c0, 0.3], boomerang: [0xffe090, 0.5], pcrescent: [0x9ab0ff, 1.0], bat: [0xb070ff, 0.45], star: [0xfff8c0, 0.9], orbit: [0xffe090, 0.5],
};

// ------------------------------------------------------------------------------------- game
class Game {
  constructor() {
    const canvas = $('view');
    // LOW_MEM (phones): smaller framebuffers and shadow map; the post-processing chain renders off-screen anyway, so skip MSAA there
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW_MEM, powerPreference: LOW_MEM ? 'default' : 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, LOW_MEM ? 1.25 : 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = LOW_MEM ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.contextLost = true; const m = $('loadMsg'); $('title').classList.remove('hidden'); if (m) m.textContent = 'The graphics ran out of memory. Close other tabs, then reload the page.'; });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x05040a);
    this.scene.fog = new THREE.Fog(0x0b0810, 16, 50);
    this.camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.5, 400);
    this.hemi = new THREE.HemisphereLight(0x8a90c0, 0x201418, 0.35); this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xaab8ff, 0.6); this.moon.castShadow = true;
    Object.assign(this.moon.shadow.camera, { left: -16, right: 16, top: 11, bottom: -8, near: 1, far: 60 }); this.moon.shadow.mapSize.setScalar(LOW_MEM ? 1024 : 2048); this.moon.shadow.bias = -0.0005; this.moon.shadow.normalBias = 0.03;
    this.scene.add(this.moon, this.moon.target);
    this.camFill = new THREE.DirectionalLight(0xd8d0e8, 0.22); this.scene.add(this.camFill, this.camFill.target);
    this.backRim = new THREE.DirectionalLight(0x9fb4ff, 1.8); this.scene.add(this.backRim, this.backRim.target);
    const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environmentIntensity = 0.14;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1024, 576), 0.55, 0.5, 0.82); this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, time: { value: 0 }, aspect: { value: 16 / 9 }, warm: { value: 0 }, lift: { value: new THREE.Vector3(0.012, 0.016, 0.034) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time, aspect, warm; uniform vec3 lift; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          c.rgb = mix(vec3(l), c.rgb, 0.86);                                                     // a little desaturation
          vec3 hi = mix(vec3(1.03, 1.0, 0.94), vec3(1.06, 0.98, 0.88), warm);
          c.rgb = c.rgb * mix(vec3(0.97, 0.98, 1.04), hi, smoothstep(0.25, 0.85, l)) + lift * (1.0 - smoothstep(0.0, 0.35, l)); // cold shadows, warm light
          vec2 d = vUv - 0.5; d.x *= aspect; c.rgb *= mix(0.6, 1.0, smoothstep(0.98, 0.34, length(d)));                         // vignette
          float g = fract(sin(dot(floor(vUv * vec2(1920.0, 1080.0)) + time * 7.0, vec2(12.9898, 78.233))) * 43758.5453); c.rgb += (g - 0.5) * 0.028;
          gl_FragColor = c; }` });
    this.composer.addPass(this.grade);
    this.input = new Input(); this.fx = new FX(this.scene); this.ui = new UI(this);
    this.world = new World(this.scene); this.player = new Player(this);
    { const es = new THREE.Scene(); es.background = new THREE.Color(0x0a0806);
      const room = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshBasicMaterial({ color: 0x120c08, side: THREE.BackSide })); room.position.y = 3; es.add(room);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0x1a120a })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.9; es.add(floor);
      for (const [x, z] of [[-6, -6], [6, -5], [-5, 6], [7, 5]]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa050).multiplyScalar(6), side: THREE.DoubleSide })); c.position.set(x, 1.5, z); c.lookAt(0, 1, 0); es.add(c); }
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6a6878).multiplyScalar(1.4), side: THREE.DoubleSide })); win.scale.setScalar(0.6); win.position.set(0, 4, -9.5); es.add(win);
      this.world.setMetalEnv(pm.fromScene(es, 0.04).texture); }
    this.loot = []; this.shots = []; this.waves = []; this.erupts = []; this.suns = []; this.seals = []; this.visited = new Set(); this.flags = {};
    this.camPos = new THREE.Vector2(); this.camZ = CAMZ; this.shakeT = 0; this.stopT = 0; this.time = 0; this.playTime = 0;
    addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() { const w = Math.max(2, innerWidth), h = Math.max(2, innerHeight); this._sz = w + 'x' + h; this.renderer.setSize(w, h, false); this.composer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); if (this.grade) this.grade.uniforms.aspect.value = w / h; }

  async load(msg) {
    msg('Reading the castle\'s bones…'); await loadMeta();
    msg('Raising the halls…'); await this.world.build();
    msg('Waking the pilgrim…'); await this.player.load();
    this.bellSrc = (await loadGLTF('assets/game/items/bells.glb')).scene;
    msg('Rousing the dead…');
    const first = this.world.rooms.find(r => r.def.start); await this.ensureRoom(first);
    this.sealMat = new THREE.MeshBasicMaterial({ color: 0xff3050, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    await this.newGame();
  }

  // Raise a room's meshes, monsters, chests and pickups the first time it is needed.
  async ensureRoom(room) {
    if (room.live) return room;
    if (!room.living) room.living = (async () => {
      await this.world.ensure(room);
      const def = room.def; room.enemies = []; room.chests = []; room.pickups = [];
      await Promise.all(def.enemies.map(async (spec, i) => {
        if ((spec.boss || TYPES[spec.t].boss || TYPES[spec.t].mini) && this.flags[`boss:${def.id}:${i}`]) return;
        const e = new Enemy(this, spec, room); e.key = `boss:${def.id}:${i}`;
        try { await e.load(); room.enemies.push(e); } catch (err) { console.warn('enemy', spec.t, err); }
      }));
      def.chests.forEach((c, i) => room.chests.push(this.makeChest(room, c, i)));
      this.placeItems(room);
      room.cracks.forEach((s, i) => { s.key = `crack:${def.id}:${i}`; if (this.flags[s.key]) { s.gone = true; s.mesh.visible = false; } });
      room.gates.forEach((s, i) => { s.key = `gate:${def.id}:${i}`; if (this.flags[s.key]) { s.gone = true; s.mesh.visible = false; } });
      for (const ch of room.chests) if (this.flags[ch.key]) ch.open(true);
      if (def.bell && !this.player.has(def.bell.id) && (!def.boss || !room.enemies.some(e => e.T.bell === def.bell.id))) this.spawnBell(room);
      room.live = true;
    })();
    await room.living; return room;
  }
  neighbours(room) {
    const b = room.b, out = [];
    for (const d of room.def.doors) { let x, y; if (d.side === 'W' || d.side === 'E') { x = d.side === 'W' ? b.x0 - 2 : b.x1 + 2; y = rowFloorY(d.row) + 2; } else { x = d.col * SW + SW / 2; y = d.side === 'N' ? b.y1 + 3 : b.y0 - 3; } const r = this.world.roomAt(x, y); if (r) out.push(r); }
    return out;
  }

  async newGame(fromSave) {
    const P = this.player, save = fromSave && this.readSave();
    for (const L of this.loot) L.room.group?.remove(L.grp); this.loot = [];
    let room;
    if (save) {
      Object.assign(P.stats, save.stats); this.flags = save.flags || {}; P.bag = save.bag || []; P.equip = save.equip; P.bells = new Set(save.bells || []); this.visited = new Set(save.visited || []); this.playTime = save.time || 0;
      for (const s of ['weapon', 'offhand']) await P.attachVisual(s);
      room = this.world.byId(save.room) || this.world.rooms.find(r => r.def.start);
    } else room = this.world.rooms.find(r => r.def.start);
    // rooms raised during loading lost their pickups when the loot list was cleared above (the causeway blade among them)
    for (const r of this.world.rooms) if (r.live) { this.placeItems(r); for (const ch of r.chests) if (this.flags[ch.key] && !ch.opened) ch.open(true); }
    await this.ensureRoom(room);
    if (save && room.saveAt) P.pos.set(room.saveAt.x, room.saveAt.y); else P.pos.set(room.b.x0 + (room.def.start?.x ?? 5), room.b.y0 + (room.def.start?.y ?? 0.5));
    P.refreshStats(); if (!save) { P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax; }
    this.room = null; await this.enterRoom(room, true); this.ui.bells();
  }

  // ------------------------------------------------------------------ loot
  // a room's placed pickups (and their pedestals, which stay once the prize is taken)
  placeItems(room) {
    const def = room.def; room.peds ||= new Set();
    def.items.forEach((it, i) => {
      const key = `item:${def.id}:${i}`;
      if (it.pedestal && !room.peds.has(key)) { room.peds.add(key); this.pedestal(room, room.b.x0 + it.x, room.b.y0 + (it.y ?? FLOOR), it.altar, it.tutorial); }
      if (!this.flags[key] && !this.loot.some(L => L.key === key)) this.spawnPlaced(room, it, key);
    });
  }
  async spawnPlaced(room, it, key) {
    const x = room.b.x0 + it.x, y = room.b.y0 + (it.y ?? FLOOR);
    const item = it.gem ? makeGem(it.gem) : it.up ? { up: it.up } : it.potion ? { potion: true } : it.gold ? { gold: it.gold } : it.unique ? makeUnique(it.unique) : it.tier ? tierItem(it.tier, it.rarity) : makeItem(it.tutorial ? startWeapon() : it.base, { rarity: it.rarity, sockets: it.sockets }); // the Attack Viewer can swap the first weapon
    if (it.tutorial) return this.plantBlade(room, x, y + 1.02, item, key);
    this.dropLoot(x, it.pedestal ? y + 0.9 : y, item, room, key, true);
  }
  // the first weapon is not loot: it stands upright in the pilgrim's stone, lit by a thin shaft of moonlight
  async plantBlade(room, x, y, item, key) {
    const grp = new THREE.Group(); grp.position.set(x, y, -0.6); room.group.add(grp);
    const L = { item, room, grp, x, y, key, bob: 0, placed: true, planted: true, model: new THREE.Group() }; grp.add(L.model); this.loot.push(L);
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 9), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xa8b8e0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false })); shaft.position.set(-1.0, 4.2, -0.8); shaft.rotation.z = -0.24; grp.add(shaft); // a soft column of moonlight, not a scratch
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xa8b8e0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.005, 0.2); grp.add(pool);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xe8f0ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); glint.scale.set(0.09, 0.55, 1); L.model.add(glint); L.glint = glint; // a thin travelling gleam on the edge, not a ball
    try { const m = await weaponModel(BASES[item.base].model, BASES[item.base].scale * 1.38); const len = m.userData.len; m.rotation.z = Math.PI; m.position.y = len * 0.78; L.model.add(m); L.len = len;
      m.traverse(o => { if (o.isMesh && o.material.emissive) { o.material.emissive.setHex(0x34486e); o.material.emissiveIntensity = 0.7; } }); // a cold edge of moonlight on the steel
      L.model.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m), inv = L.model.matrixWorld.clone().invert(); bb.applyMatrix4(inv); L.blade = bb; // the glint runs up the real blade
    } catch (e) { console.warn(e); }
    return L;
  }
  pedestal(room, x, y, altar, tutorial) {
    if (tutorial) { this.world.pilgrimStone(room, x, y); return; }
    const m = surface(altar ? 'marble' : 'ashlar', 1, 1, altar ? { dir: 'assets/game/interior/' } : {});
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.9, 10), m); ped.position.set(x, y + 0.45, -0.6); ped.castShadow = ped.receiveShadow = true; room.group.add(ped);
  }

  async dropLoot(x, y, item, room = this.room, key, placed) {
    const grp = new THREE.Group(); grp.position.set(x, y, -0.6); room.group.add(grp);
    const L = { item, room, grp, x, y, key, bob: Math.random() * 6, placed, vy: placed ? 0 : 5 };
    const col = item.up === 'life' ? 0xff4060 : item.up === 'mana' ? 0x5a80ff : item.gold ? 0xffd040 : item.potion ? 0xff3050 : item.gem ? GEMS[item.gem].color : { normal: 0xe0e0e0, magic: 0x6c8cff, rare: 0xffd84a, unique: 0xc88a3a }[item.rarity];
    const strong = item.up || item.rarity === 'unique' || item.rarity === 'rare';
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.16, 2.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: strong ? 0.45 : 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 1.3; grp.add(beam);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.03; grp.add(pool);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); glow.scale.setScalar(strong ? 1.4 : 0.9); glow.position.y = 0.55; glow.material.opacity = 0.6; grp.add(glow);
    let model = new THREE.Group();
    const gemMat = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.15 });
    if (item.base && BASES[item.base]?.model) { weaponModel(BASES[item.base].model, BASES[item.base].scale * 0.8).then(m => { m.rotation.z = Math.PI / 2.4; model.add(m); }).catch(() => {}); }
    else if (item.gem) model = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), gemMat(col));
    else if (item.up) { model = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), gemMat(col)); model.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 20), new THREE.MeshStandardMaterial({ color: 0xd0b060, metalness: 1, roughness: 0.3 }))); }
    else if (item.potion) model = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0xa0102a, emissive: 0x500010, roughness: 0.1, transparent: true, opacity: 0.85 }));
    else if (item.gold) { model = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14), new THREE.MeshStandardMaterial({ color: 0xffc840, metalness: 1, roughness: 0.3, emissive: 0x301800 })); model.rotation.x = Math.PI / 2; }
    else model = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: col }));
    model.position.y = 0.55; grp.add(model); L.model = model;
    this.loot.push(L); return L;
  }

  updateLoot(dt) {
    const P = this.player;
    for (const L of this.loot) {
      if (L.room !== this.room) continue;
      if (L.planted) { L.bob += dt; if (L.glint && L.blade) { const u = (L.bob * 0.45) % 1, B = L.blade; L.glint.position.set((B.min.x + B.max.x) / 2, B.min.y + 0.15 + (B.max.y - B.min.y) * 0.62 * u, B.max.z + 0.02); L.glint.material.opacity = Math.sin(u * Math.PI) * 0.9; } }
      else { L.bob += dt * 2.4; L.model.position.y = 0.55 + Math.sin(L.bob) * 0.08; L.model.rotation.y += dt * 1.6; }
      if (!L.placed) { L.vy -= 18 * dt; L.grp.position.y += L.vy * dt; const floor = this.floorBelow(L.grp.position.x, L.grp.position.y + 0.3); if (L.grp.position.y <= floor) { L.grp.position.y = floor; L.vy = 0; L.placed = true; } if (L.grp.position.y < this.room.b.y0 - 2) L.taken = true; }
      const dx = Math.abs(P.pos.x - L.grp.position.x), dy = L.grp.position.y + 0.4 - P.pos.y;
      if (dx < (L.planted ? 0.9 : 0.75) && dy > (L.planted ? -1.4 : -0.4) && dy < 1.8 && P.state !== 'dead' && (!L.planted || P.onGround)) this.pickup(L);
    }
    this.loot = this.loot.filter(L => !L.taken);
  }
  potionCap() { return 3 + Math.floor(this.player.bells.size / 2); }
  floorBelow(x, y) { let best = -1e9; for (const s of this.world.solids) if (!s.gone && x > s.x0 && x < s.x1 && s.y1 <= y + 0.01 && s.y1 > best && s.kind !== 'ceil') best = s.y1; return best; }

  pickup(L) {
    const P = this.player, it = L.item; L.taken = true; L.room.group.remove(L.grp); if (L.key) this.flags[L.key] = true;
    if (it.gold) { const g = Math.round(it.gold * (1 + (P.d.gold || 0) / 100)); P.stats.gold += g; audio.play('coins_gather_quick', 0.5); this.ui.dmg(P.pos.x, P.pos.y + 2.1, `+${g}g`, 'lightning'); return; }
    if (it.potion) { if (P.stats.potions >= this.potionCap()) { P.heal(Math.round(P.stats.hpMax * 0.25)); this.ui.toast('Your flasks are full — you drink it where you stand.', 'magic'); } else { P.stats.potions++; this.ui.toast(`Potion of Vigor (${P.stats.potions}/${this.potionCap()})`, 'magic'); } audio.play('heart_collect', 0.5); return; }
    if (it.up) { if (it.up === 'life') P.stats.lifeUp++; else P.stats.manaUp++; P.refreshStats(); P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax; audio.play('firebuff_1', 0.6); this.flash(); this.fx.burst(P.pos.x, P.pos.y + 1, it.up === 'life' ? 0xff4060 : 0x5a80ff, 40, 5); this.ui.roomName(it.up === 'life' ? 'LIFE VESSEL — MAX LIFE UP' : 'MANA VESSEL — MAX MANA UP', 2600); return; }
    P.bag.push(it);
    if (it.gem) { audio.play('gem_collect', 0.6); this.ui.toast(`${GEMS[it.gem].name} — ${wantsTouch() ? 'open the pack and tap GEM' : 'open the pack (I) and press S'} to socket it`, 'gem'); if (it.gem === 'ruby' && !this.flags.rubyHint) { this.flags.rubyHint = 1; setTimeout(() => this.ui.toast('A fire gem in a weapon will burn through blackthorn.', 'gem'), 1600); } }
    else { audio.play(it.rarity === 'unique' ? 'firebuff_1' : it.rarity === 'rare' ? 'gem_collect' : it.rarity === 'magic' ? 'glass_ping_small' : 'weapon_pick_up', 0.6); this.ui.toast(`${it.rarity === 'unique' ? '★ ' : ''}${it.name}${it.echo ? ' — ' + ECHOES[it.echo].name : ''}`, it.rarity); if (BASES[it.base].slot === 'offhand' && !this.flags.shieldHint) { this.flags.shieldHint = 1; setTimeout(() => this.ui.toast(wantsTouch() ? 'Equip it from the pack, then HOLD the shield button to raise it' : 'Equip it (I), then HOLD L to raise the shield', 'magic'), 1200); } }
    if (L.planted && BASES[it.base]?.slot === 'weapon' && !P.equip.weapon) { // drawn from the stone straight into the hand
      this.flags.equipHint = 1; P.equipItem('weapon', it); P.state = 'ring'; P.stateT = 0; P.ringDur = 1.1; P.vel.x = 0; this.slowMo(0.5); this.flash(); audio.play('firebuff_1', 0.5); this.fx.burst(L.x, L.y + 0.8, 0xc8d8ff, 30, 4); this.ui.roomName(it.name.toUpperCase(), 2200);
      this.tutorial = 'strike'; setTimeout(() => { if (this.tutorial === 'strike') this.ui.prompt(wantsTouch() ? 'Tap the sword button to strike — try the candles ahead' : 'J to strike — try the candles ahead'); }, 1300);
    } else if (it.base === startWeapon() && !this.flags.equipHint) { this.flags.equipHint = 1; this.ui.prompt(wantsTouch() ? `Open the pack and tap the ${it.name} to equip it` : `Press I to open your pack, then Enter to equip the ${it.name}`); this.tutorial = 'equip'; }
  }

  makeChest(room, c, i) {
    const x = room.b.x0 + c.x, y = room.b.y0 + (c.y ?? FLOOR), key = `chest:${room.def.id}:${i}`;
    const wood = surface('pv_dark_walnut', 1, 1, { dir: 'assets/game/tex2/', tint: c.unique ? 0xffffff : 0x9a8a80 }), iron = new THREE.MeshStandardMaterial({ color: c.unique ? 0xb08a3a : 0x3a3028, metalness: 0.85, roughness: 0.4 });
    const g = new THREE.Group(); g.position.set(x, y, -1.2); if (c.big) g.scale.setScalar(1.35);
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), wood); bodyM.position.y = 0.3; bodyM.castShadow = true;
    const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.4);
    const lidM = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10, 1, false, 0, Math.PI), wood); lidM.rotation.z = Math.PI / 2; lidM.position.z = 0.4; lid.add(lidM);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 0.84), iron); band.position.y = 0.45;
    g.add(bodyM, lid, band); room.group.add(g);
    const ch = { room, x, y, key, opened: false, def: c, open: (silent) => { ch.opened = true; lid.rotation.x = -1.9; if (!silent) { audio.play('chest_open_1', 0.6);
      const item = c.unique ? makeUnique(c.unique) : c.gem ? makeGem(c.gem) : c.up ? { up: c.up } : c.gold ? { gold: c.gold } : c.potion ? { potion: true } : c.tier ? tierItem(c.tier, c.rarity) : makeItem(c.base, { rarity: c.rarity, sockets: c.sockets });
      this.dropLoot(x, y + 0.8, item, room); if (c.tier) this.dropLoot(x + 0.8, y + 0.8, { gold: 20 * c.tier + (Math.random() * 30 | 0) }, room); this.flags[key] = true; if (c.unique) { this.slowMo(0.6); this.fx.burst(x, y + 1, 0xc88a3a, 40, 5); } } } };
    return ch;
  }

  // ------------------------------------------------------------------ bells
  spawnBell(room) {
    const d = room.def.bell, B = BELLS[d.id], x = room.b.x0 + d.x, y = room.b.y0 + (d.y ?? FLOOR), grp = new THREE.Group(); grp.position.set(x, y, -0.4);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 0.5, 12), surface('oxblood_marble', 1, 1, { dir: 'assets/game/tex2/' })); ped.position.y = 0.25; ped.receiveShadow = true; grp.add(ped);
    const src = this.bellSrc.getObjectByName('bell_treble') || this.bellSrc.children[0], bell = src.clone(); bell.position.set(0, 0, 0); bell.rotation.set(0, 0, 0); bell.scale.setScalar(1);
    const piv = new THREE.Group(); piv.add(bell); let bb = new THREE.Box3().setFromObject(bell); const sz = bb.getSize(new THREE.Vector3()); bell.scale.setScalar(0.85 / Math.max(sz.x, sz.y, sz.z)); bb = new THREE.Box3().setFromObject(bell); const c = bb.getCenter(new THREE.Vector3()); bell.position.sub(c);
    bell.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(B.color); o.material.emissiveIntensity = 0.35; } });
    piv.position.y = 1.55; grp.add(piv);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: B.color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 })); glow.scale.setScalar(3.4); glow.position.y = 1.55; grp.add(glow);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.4, 9, 10, 1, true), new THREE.MeshBasicMaterial({ color: B.color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 5; grp.add(beam);
    room.group.add(grp); room.bellObj = { id: d.id, x, y, grp, piv, glow };
    this.world.light(room, x, y + 2, 0.8, B.color, 16, 12);
  }
  ringBell(room) {
    const o = room.bellObj, P = this.player, B = BELLS[o.id]; room.bellObj = null; room.group.remove(o.grp);
    P.bells.add(o.id); P.state = 'ring'; P.stateT = 0; P.vel.set(0, 0); P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax;
    this.slowMo(1.4); this.flash(); audio.play('title_bells', 0.8); audio.play('firebuff_1', 0.6);
    for (let i = 0; i < 5; i++) setTimeout(() => { this.fx.ring(P.pos.x, P.pos.y + 1.2, B.color, 8 + i * 2); this.fx.burst(P.pos.x, P.pos.y + 1.2, B.color, 24, 6); }, i * 220);
    this.ui.bellGet(B); this.ui.bells(); this.applyBells(this.room); this.save();
  }
  // Echo Sight changes what is solid.
  applyBells(room) {
    const echo = this.player.has('echo');
    for (const s of room.echo) { s.gone = !echo; if (s.mesh) s.mesh.visible = echo; }
    for (const s of room.gates) if (s.gate === 'veil' && echo && !s.gone) { s.gone = true; if (s.mesh) s.mesh.visible = false; }
  }

  // ------------------------------------------------------------------ rooms
  async enterRoom(room, instant) {
    if (!room || room === this.room || this.loading) return;
    const old = this.room, P = this.player;
    if (!room.live) { this.loading = true; $('fade').style.opacity = 1; try { await this.ensureRoom(room); } finally { this.loading = false; } }
    if (old) { old.group.visible = false; this.leaveRoom(old); }
    this.room = room; room.group.visible = true; this.visited.add(room.def.id); if (instant) P.groundS = null;
    for (const e of room.enemies) if (e.dead && !e.boss && !e.summoner) e.reset();
    for (const bk of room.breakables) if (bk.broken && Math.random() < 0.6) { bk.broken = false; bk.grp.visible = true; }
    this.applyBells(room);
    const T = room.theme; this.scene.fog.color.setHex(T.fog[0]); this.scene.fog.near = T.fog[1]; this.scene.fog.far = T.fog[2]; this.scene.background.setHex(T.sky === 'moon' ? 0x141a30 : T.sky === 'storm' ? 0x0c1018 : T.fog[0]);
    const open = !!T.sky; this.amb = T.amb * (open ? 1.0 : 1.3); this.hemi.intensity = this.amb; const hue = HUE[room.def.theme] || [0x463e38, [0.012, 0.014, 0.018]]; this.hemi.color.setHex(open ? 0x8a90c0 : hue[0]); this.hemi.groundColor.setHex(open ? 0x201418 : 0x161014); this.grade.uniforms.lift.value.set(...(open ? [0.012, 0.016, 0.034] : hue[1])); this.backRim.intensity = open ? 1.8 : 0; /* indoors the back rim only painted the set cold */ this.moon.intensity = open ? T.moon * 0.85 : room.lancets ? Math.min(0.5, T.moon * 0.7) : 0.1; this.camFill.intensity = open ? 0.3 : 0.21; this.scene.environmentIntensity = open ? 0.2 : 0.12; this.grade.uniforms.warm.value = T.heat ? 1 : 0;
    if (!instant) { $('fade').style.opacity = 0.85; setTimeout(() => $('fade').style.opacity = 0, 90); } else $('fade').style.opacity = 0;
    this.snapCam = true;
    if (!old || old.def.name !== room.def.name) this.ui.roomName(room.def.name);
    audio.music(MUSIC[room.def.theme] || 'dark_1', 0.3);
    if (room.warpAt && !this.flags['warp:' + room.def.id]) { this.flags['warp:' + room.def.id] = true; this.ui.toast('The mirror wakes. It remembers you now.', 'unique'); }
    room.warpFx?.(true);
    room.seen = ++this.seenN || (this.seenN = 1);
    this.evict(room);
    // raise the neighbours in the background so doors are seamless
    (async () => { for (const n of this.neighbours(room)) { if (this.room !== room) break; try { await this.ensureRoom(n); } catch (e) { console.warn(e); } } })();
  }
  // keep only the rooms around the pilgrim alive
  evict(cur) {
    const live = this.world.rooms.filter(r => r.live), cap = LOW_MEM ? 6 : 14; if (live.length <= cap) return;
    const near = new Set([cur, ...this.neighbours(cur)]);
    for (const r of live.filter(r => !near.has(r)).sort((a, b) => (a.seen || 0) - (b.seen || 0)).slice(0, live.length - (LOW_MEM ? 4 : 9))) {
      this.loot = this.loot.filter(L => { if (L.room !== r) return true; if (!L.key) return false; return false; });
      this.world.unload(r, r.enemies.map(e => e.root)); r.live = false; r.living = null; r.enemies = []; r.chests = []; r.bellObj = null; r.peds = null;
    }
  }
  leaveRoom(old) {
    for (const s of this.shots) this.scene.remove(s.m); this.shots = [];
    for (const w of this.waves) w.room.group.remove(w.m); this.waves = [];
    for (const s of this.suns) this.scene.remove(s.m); this.suns = [];
    for (const e of this.erupts) this.scene.remove(e.m); this.erupts = [];
    this.unseal();
    for (const e of old.enemies) { if (e.summoner) { old.group.remove(e.root); continue; } if (e.boss && !e.dead && e.awake) e.reset(); }
    old.enemies = old.enemies.filter(e => !e.summoner);
    $('bossBar').classList.add('hidden'); this.bossE = null;
  }
  activeSolids() {
    if (this._solidF === this.frame) return this._solids;
    const p = this.player.pos, out = this._solids || (this._solids = []); out.length = 0; this._solidF = this.frame;
    for (const s of this.world.solids) if (s.x1 > p.x - 34 && s.x0 < p.x + 34 && s.y1 > p.y - 26 && s.y0 < p.y + 26) out.push(s);
    for (const s of this.seals) out.push(s);
    return out;
  }
  // what the pilgrim is standing in
  envAt(P) {
    const b = this.room.b, d = this.room.def, x = P.pos.x - b.x0, y = P.pos.y - b.y0, env = { water: false, lava: false, depth: 0 };
    for (const w of d.water) if (x > w.x && x < w.x + w.w && y + 0.9 > w.y && y + 0.9 < w.y + w.h) { env.water = true; env.depth = w.y + w.h - y; }
    for (const l of d.lava) if (x > l.x - 0.1 && x < l.x + l.w + 0.1 && y + 0.15 > l.y && y < l.y + l.h - 0.15) env.lava = true;
    return env;
  }
  hazardAt(x, y) { const b = this.room.b, d = this.room.def, lx = x - b.x0, ly = y - b.y0; return d.lava.some(l => lx > l.x && lx < l.x + l.w && ly + 0.3 > l.y && ly < l.y + l.h) || d.spikes.some(s => lx > s.x && lx < s.x + s.w && Math.abs(ly - s.y) < 0.6) || d.water.some(w => lx > w.x && lx < w.x + w.w && ly + 0.9 > w.y && ly + 0.9 < w.y + w.h); }
  updateHazards(dt) {
    const P = this.player, b = this.room.b, d = this.room.def, x = P.pos.x - b.x0, y = P.pos.y - b.y0;
    for (const s of d.spikes) if (x > s.x - 0.2 && x < s.x + s.w + 0.2 && y > s.y - 0.1 && y < s.y + 0.5) { if (P.takeHit(Math.max(6, Math.round(P.stats.hpMax * 0.1)), P.pos.x - P.facing, null, null, true)) P.vel.y = 8; }
    for (const bl of this.room.blades) if (Math.abs(P.pos.x - bl.tx) < 1.0 && bl.ty > P.pos.y - 0.6 && bl.ty < P.pos.y + 2.0) P.takeHit(Math.max(8, Math.round(P.stats.hpMax * 0.12)), bl.tx - Math.sign(P.pos.x - bl.tx || 1), null, null, true);
    for (const lb of this.room.bubbles || []) if (Math.random() < 0.08) this.fx.spawn(lb.x + Math.random() * lb.w, lb.y, rnd(-1, 1.5), 0, rnd(1, 3), Math.random() < 0.5 ? 0xff6a10 : 0xffc040, 0.9, 0.22, 2);
    if (P.inWater && Math.abs(P.vel.x) > 1 && Math.random() < 0.3) this.fx.spawn(P.pos.x, P.pos.y + 0.8, 0.6, rnd(-1, 1), 1.5, 0xa0e0f0, 0.4, 0.2, 3);
  }

  // ------------------------------------------------------------------ combat hooks
  playerHits(hb) {
    const P = this.player, room = this.room;
    for (const e of room.enemies) {
      if (e.gone || hb.attack.hitIds.has(e.id)) continue;
      const roll = hb.roll ? { ...hb.roll } : P.rollDamage(); if (hb.mul) roll.dmg = Math.max(1, Math.round(roll.dmg * hb.mul));
      if (e.hit(hb, roll, P)) { if (!hb.proj) { this.touch?.buzz(roll.crit ? 30 : 15); this.hitStop((e.boss ? 0.09 : e.T.block ? 0.075 : 0.06) + (roll.crit ? 0.05 : 0)); this.shake(roll.crit ? 0.35 : 0.14); } if (roll.crit) this.flash(); this.onHit(e, roll, hb); if (hb.dive && P.state === 'dive') { P.state = 'free'; P.vel.set(0, 9.5); P.jumpsLeft = P.has('djump') ? 1 : 0; P.dashUsed = false; P.diveCd = 0.5; } }
    }
    if (!hb.proj) for (const s of this.shots) if (!s.friendly && ['skull', 'bone', 'book', 'lob', 'web'].includes(s.kind) && s.x > hb.x0 - 0.3 && s.x < hb.x1 + 0.3 && s.y > hb.y0 - 0.3 && s.y < hb.y1 + 0.3) { s.life = 0; this.fx.burst(s.x, s.y, s.col, 12, 4); audio.play('sword_parry_1', 0.4, 1.4); } // steel swats slow missiles from the air
    for (const bk of room.breakables) if (!bk.broken && Math.abs(bk.x - (hb.x0 + hb.x1) / 2) < (hb.x1 - hb.x0) / 2 + 0.25 && hb.y0 < bk.y + 1.6 && hb.y1 > bk.y) this.breakCandle(bk);
    for (const s of room.cracks) if (!s.gone && s.by !== 'dive' && hb.x0 < s.x1 + 0.1 && hb.x1 > s.x0 - 0.1 && hb.y0 < s.y1 && hb.y1 > s.y0) this.breakCrack(s);
    for (const t of room.gates) if (!t.gone && t.gate === 'thorn' && !hb.attack.hitIds.has(t.key) && hb.x0 < t.x1 && hb.x1 > t.x0 && hb.y0 < t.y1 && hb.y1 > t.y0) {
      hb.attack.hitIds.add(t.key);
      if (P.d.elems.some(e => e.elem === 'fire')) this.burnThorns(t);
      else { audio.play('sword_blocked_2', 0.6); this.fx.burst((t.x0 + t.x1) / 2, P.pos.y + 1.2, 0xc0c0a0, 8, 3); this.ui.prompt('The blackthorn shrugs off cold steel. Something burning might work…'); setTimeout(() => this.ui.prompt(''), 2600); }
    }
    for (const c of room.chests) if (!c.opened && !hb.proj && !hb.attack.hitIds.has('c' + c.key) && hb.x0 < c.x + 0.6 && hb.x1 > c.x - 0.6 && hb.y0 < c.y + 0.7 && hb.y1 > c.y) { hb.attack.hitIds.add('c' + c.key); c.open(); }
  }
  // weapon echoes that answer a landed hit
  onHit(e, roll, hb) {
    const P = this.player, echo = P.d.echo, dmg = roll.dmg; P.combo++; P.comboT = 2.5; P.hits++;
    if (e.spec.illusion) return;
    // the bells ride along in a fight: Echo repeats every fifth blow, Ember sets slides and dives alight
    if (P.has('echo') && P.hits % 5 === 0 && !hb.twin) setTimeout(() => { if (!e.dead) { e.damage(Math.max(1, Math.round(dmg * 0.5)), 'shadow', true); this.fx.ring(e.cx, e.cy, 0xb090ff, 3); } }, 180);
    if (P.has('ember') && (hb.dive || hb.slide)) { e.burn = 3; e.burnDmg = Math.max(3, dmg * 0.2); this.fx.burst(e.cx, e.cy, 0xff6a20, 16, 4); }
    if (!echo) return;
    if (echo === 'twin' && !hb.twin) setTimeout(() => { if (!e.dead) { e.damage(Math.max(1, Math.round(dmg * 0.35)), 'shadow', true); this.fx.glint(e.cx, e.cy, 0xb090ff); } }, 150);
    if (echo === 'chain' && Math.random() < 0.25) { let src = e; const seen = new Set([e]); for (let i = 0; i < 3; i++) { const o = this.room.enemies.find(x => !x.dead && !seen.has(x) && Math.abs(x.pos.x - src.pos.x) < 7 && Math.abs(x.pos.y - src.pos.y) < 4); if (!o) break; seen.add(o); this.fx.line({ x: src.cx, y: src.cy }, { x: o.cx, y: o.cy }, 0xffe860); o.damage(Math.round(dmg * 0.6), 'lightning', true); src = o; } audio.play('spell_impact_2', 0.35, 1.4); }
    if (echo === 'ignite') { e.burn = 3; e.burnDmg = Math.max(2, dmg * 0.12); }
    if (echo === 'execute' && !e.boss && !e.dead && e.hp < e.hpMax * 0.18) { this.ui.dmg(e.pos.x, e.pos.y + e.T.h + 0.6, 'EXECUTED', 'crit'); e.damage(e.hp + 1, null, true); }
    if (echo === 'bats' && roll.crit) for (let i = 0; i < 3; i++) this.shoot({ x: P.pos.x, y: P.pos.y + 1.4, vx: P.facing * 6, vy: 3 - i * 2.5, kind: 'bat', dmg: Math.round(dmg * 0.4), friendly: true, homing: 6, life: 2.5 });
    if (echo === 'toll' && P.hits % 8 === 0) { audio.play('title_bells', 0.6, 1.5); this.fx.ring(P.pos.x, P.pos.y + 1, 0xffe090, 12); this.shake(0.3); for (const o of this.room.enemies) if (!o.dead && !o.hidden && Math.abs(o.pos.x - P.pos.x) < 14) { o.stun = o.boss ? 0.8 : 1.6; o.stunStars = true; o.damage(Math.round(dmg * 0.5), null, true); } }
    if (echo === 'briar' && Math.random() < 0.3) this.erupt({ x: e.pos.x, y: e.pos.y, delay: 0.2, w: 1.4, h: 2.8, dmg: Math.round(dmg * 0.7), elem: 'poison', col: 0x2a5a1a, friendly: true });
    if (echo === 'star' && Math.random() < 0.15) { this.shoot({ x: e.pos.x + rnd(-1, 1), y: e.pos.y + 12, vx: 0, vy: -20, kind: 'star', dmg: Math.round(dmg * 1.5), friendly: true, life: 1.5, blast: 2 }); audio.play('rock_meteor_throw_1', 0.4); }
  }
  onSwing(P, A) {
    if (this.tutorial === 'strike') { this.tutorial = null; this.ui.prompt(''); this._pt = null; setTimeout(() => this.ui.toast(wantsTouch() ? 'Strikes chain — keep tapping. Jump and swing in the air too.' : 'Strikes chain — keep pressing J. Swing while jumping or crouching too.', 'magic'), 900); }
    if (P.d.echo === 'crescent' && A.n % 3 === 0) { const r = P.rollDamage(); this.shoot({ x: P.pos.x + P.facing * 0.8, y: P.pos.y + (P.crouch ? 0.6 : 1.1), vx: P.facing * 13, vy: 0, kind: 'pcrescent', dmg: Math.round(r.dmg * 0.6), friendly: true, pierce: true, life: 0.9 }); audio.play('wave_attack_2', 0.35, 1.4); }
  }
  // Up + Attack: spend mana to loose the weapon's echo at full strength (a crescent of force if it has none)
  castArt(P) {
    const echo = P.d.echo, r = P.rollDamage(), d = Math.round(r.dmg * 1.5 * (1 + (P.d.int - 8) * 0.04)), x = P.pos.x, y = P.pos.y, f = P.facing, near = this.room.enemies.filter(e => !e.dead && !e.hidden && Math.abs(e.pos.x - x) < 11 && Math.abs(e.pos.y - y) < 6);
    this.fx.ring(x, y + 1.1, 0x9ab0ff, 4); audio.play('spell_impact_3', 0.5, 1.2);
    if (echo === 'chain') { for (const e of near.slice(0, 5)) { this.fx.line({ x, y: y + 1.2 }, { x: e.cx, y: e.cy }, 0xffe860); e.damage(d, 'lightning', true); } }
    else if (echo === 'nova') { this.fx.ring(x, y + 1, 0x7ad8ff, 9); for (const e of near) if (Math.abs(e.pos.x - x) < 6) { e.chill = 4; if (!e.boss) e.stun = 1; e.damage(d, 'ice', true); } }
    else if (echo === 'star') for (let i = 0; i < 3; i++) this.shoot({ x: x + f * (3 + i * 2.5), y: y + 12, vx: 0, vy: -20, kind: 'star', dmg: d, friendly: true, life: 1.5, blast: 2 });
    else if (echo === 'bats') for (let i = 0; i < 5; i++) this.shoot({ x, y: y + 1.4, vx: f * 6, vy: 4 - i * 2, kind: 'bat', dmg: Math.round(d * 0.5), friendly: true, homing: 6, life: 3 });
    else if (echo === 'toll') { audio.play('title_bells', 0.6, 1.5); this.fx.ring(x, y + 1, 0xffe090, 12); for (const e of near) { e.stun = e.boss ? 1 : 2.2; e.stunStars = true; e.damage(d, null, true); } }
    else if (echo === 'briar') for (let i = 1; i <= 5; i++) this.erupt({ x: x + f * i * 1.7, y: this.floorBelow(x + f * i * 1.7, y + 0.6), delay: 0.12 * i, w: 1.4, h: 3, dmg: d, elem: 'poison', col: 0x2a5a1a, friendly: true });
    else if (echo === 'ignite') for (let i = 1; i <= 5; i++) this.erupt({ x: x + f * i * 1.7, y: this.floorBelow(x + f * i * 1.7, y + 0.6), delay: 0.1 * i, w: 1.4, h: 3.4, dmg: d, elem: 'fire', friendly: true });
    else if (echo === 'quake') { this.shake(0.5); for (const dir of [1, -1]) this.shockwave(null, x + dir * 0.8, y, dir, null, d); }
    else for (const yy of echo === 'crescent' ? [0.6, 1.3, 2.0] : [1.1]) this.shoot({ x: x + f * 0.8, y: y + yy, vx: f * 14, vy: 0, kind: 'pcrescent', dmg: d, friendly: true, pierce: true, life: 1.1 });
  }
  onBackdash() {
    const P = this.player; if (P.d.echo !== 'shade') return;
    const x = P.pos.x, y = P.pos.y, f = P.facing, atk = { hitIds: new Set() };
    setTimeout(() => { this.fx.burst(x + f * 0.8, y + 1.1, 0x9a5aff, 26, 4); const r = P.rollDamage(); this.playerHits({ x0: Math.min(x, x + f * 2.2), x1: Math.max(x, x + f * 2.2), y0: y, y1: y + 2, attack: atk, roll: r, mul: 0.8, proj: true, twin: true }); audio.play('sword_attack_1', 0.4, 0.7); }, 220);
  }
  playerShoot(P, kind) {
    const base = BASES[P.equip.weapon.base], echo = P.d.echo, y = P.pos.y + (P.crouch ? 0.7 : 1.25), n = echo === 'multishot' ? 3 : 1, dry = P.stats.mp < 2; if (!dry) P.stats.mp -= 2; else if (!this.flags.dryHint) { this.flags.dryHint = 1; this.ui.toast('Out of mana: your shots fly at half strength.', 'magic'); }
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.16, r = P.rollDamage(); if (n > 1 && i !== (n - 1) / 2) r.dmg = Math.round(r.dmg * 0.5); if (dry) r.dmg = Math.max(1, Math.round(r.dmg * 0.5));
      if (kind === 'arrow') this.shoot({ x: P.pos.x + P.facing * 0.6, y, vx: P.facing * 24 * Math.cos(a), vy: 24 * Math.sin(a) + 0.6, grav: 3, kind: 'arrow', roll: r, friendly: true, pierce: echo === 'pierce', life: 1.6 });
      else this.shoot({ x: P.pos.x + P.facing * 0.6, y, vx: P.facing * 16 * Math.cos(a), vy: 16 * Math.sin(a), kind: 'boomerang', roll: r, friendly: true, pierce: true, boom: P.facing, life: 1.7, model: base.model });
    }
    if (echo === 'orbit' && !this.shots.some(s => s.kind === 'orbit')) this.shoot({ x: P.pos.x, y, vx: 0, vy: 0, kind: 'orbit', roll: P.rollDamage(), friendly: true, pierce: true, life: 4, orbit: 0, mul: 0.5 });
    audio.play(kind === 'arrow' ? 'bow_attack_' + (1 + (Math.random() * 2 | 0)) : 'wave_attack_1', 0.5, 1.1);
  }
  diveLand(P) {
    this.shake(0.4); audio.play('rock_wall_1', 0.5, 1.2); this.fx.dust(P.pos.x, P.pos.y); this.fx.ring(P.pos.x, P.pos.y + 0.1, 0x4ac8d8, 5, true);
    const atk = { hitIds: new Set() }; this.playerHits({ x0: P.pos.x - 2.2, x1: P.pos.x + 2.2, y0: P.pos.y - 0.2, y1: P.pos.y + 1.2, attack: atk, mul: 1.2, proj: true });
    for (const s of this.room.cracks) if (!s.gone && s.by === 'dive' && P.pos.x > s.x0 - 0.3 && P.pos.x < s.x1 + 0.3 && Math.abs(s.y1 - P.pos.y) < 0.3) { this.breakCrack(s); P.state = 'dive'; P.onGround = false; }
  }
  quake(P) { for (const d of [1, -1]) this.shockwave(null, P.pos.x + d * 0.8, P.pos.y, d, null, Math.round(P.rollDamage().dmg * 0.8)); }
  breakCrack(s) {
    s.gone = true; s.mesh.visible = false; this.flags[s.key] = true; audio.play('rock_wall_2', 0.6); this.shake(0.4);
    for (let i = 0; i < 26; i++) this.fx.spawn(rnd(s.x0, s.x1), rnd(s.y0, s.y1), 0.6, rnd(-3, 3), rnd(-1, 4), 0x8a8478, 0.8, 0.3, 9, false);
    if (!this.flags.crackHint) { this.flags.crackHint = 1; this.ui.toast('The stone gives way!', 'magic'); }
  }
  breakCandle(bk) {
    bk.broken = true; bk.grp.visible = false; audio.play('glass_ping_small', 0.5, 0.8); this.fx.burst(bk.x, bk.y + 1.4, 0xffb050, 14, 3);
    const lvl = this.player.stats.lvl, r = Math.random(), drop = r < 0.62 ? { gold: 3 + (Math.random() * 6 * lvl | 0) } : r < 0.66 ? { potion: true } : r < 0.67 ? makeGem(DROP_GEMS[Math.random() * DROP_GEMS.length | 0]) : null;
    if (drop) this.dropLoot(bk.x, bk.y + 1.2, drop, this.room);
  }
  flash() { const f = $('fade'); f.style.transition = 'none'; f.style.background = '#fff'; f.style.opacity = 0.35; requestAnimationFrame(() => { f.style.transition = 'opacity .18s'; f.style.opacity = 0; setTimeout(() => f.style.background = '#000', 200); }); }
  slowMo(t) { this.slowT = t; }
  ignite(elem) {
    const P = this.player, col = ELEM_COL[elem];
    this.slowMo(0.8); this.flash(); audio.play(elem === 'fire' ? 'firebuff_2' : elem === 'ice' ? 'ice_freeze_1' : 'spell_impact_3', 0.7);
    for (let i = 0; i < 40; i++) setTimeout(() => this.fx.burst(P.pos.x + P.facing * 0.5, P.pos.y + 1.2, col, 3, 3), i * 18);
    if (!this.flags['ign_' + elem]) { this.flags['ign_' + elem] = 1; this.ui.roomName(elem === 'fire' ? 'THE BLADE CATCHES FIRE' : 'THE BLADE AWAKENS', 3200); }
  }

  // ---- missiles (both sides)
  shoot(o) {
    const [col, size] = SHOT[o.kind] || SHOT.bolt, c = o.elem && ELEM_COL[o.elem] && !o.friendly ? ELEM_COL[o.elem] : col;
    let m;
    if (o.kind === 'arrow') { m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.035, 0.035), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); }
    else if (o.kind === 'bone' || o.kind === 'book') { m = new THREE.Mesh(o.kind === 'bone' ? new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5) : new THREE.BoxGeometry(0.45, 0.6, 0.14), new THREE.MeshStandardMaterial({ color: o.kind === 'bone' ? 0xe8e0c8 : 0x6a2a1a, emissive: 0x201008 })); }
    else if (o.kind === 'crescent' || o.kind === 'pcrescent') { m = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 6, 16, Math.PI * 0.9), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.z = -Math.PI * 0.45 + (o.vx < 0 ? Math.PI : 0); }
    else if (o.kind === 'boomerang' || o.kind === 'orbit') { m = new THREE.Group(); const tor = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 5, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0xd0a050, metalness: 0.8, roughness: 0.3, emissive: 0x402000 })); m.add(tor); if (o.model) weaponModel(o.model, 1).then(w => { m.remove(tor); m.add(w); }).catch(() => {}); }
    else m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    if (m.isSprite) m.scale.setScalar(size * 1.6);
    m.position.set(o.x, o.y, 0.4); this.scene.add(m);
    this.shots.push({ grav: 0, life: 3, t: 0, hitIds: new Set(), col: c, size, ...o, m });
  }
  updateShots(dt) {
    const P = this.player, b = this.room.b;
    for (const s of this.shots) {
      s.t += dt; s.life -= dt;
      if (s.orbit !== undefined) { s.orbit += dt * 5; s.x = P.pos.x + Math.cos(s.orbit) * 2.2; s.y = P.pos.y + 1.1 + Math.sin(s.orbit) * 1.1; }
      else {
        if (s.boom) { s.vx -= s.boom * 22 * dt; if (Math.sign(s.vx) !== s.boom && !s.back) { s.back = true; s.hitIds.clear(); } if (s.back) { s.vy += ((P.pos.y + 1.1 - s.y) * 6 - s.vy) * Math.min(1, dt * 6); if (Math.abs(s.x - P.pos.x) < 0.7) s.life = 0; } }
        if (s.homing) { const tgt = s.friendly ? this.room.enemies.filter(e => !e.dead && !e.hidden).sort((a, c) => Math.hypot(a.cx - s.x, a.cy - s.y) - Math.hypot(c.cx - s.x, c.cy - s.y))[0] : P; if (tgt) { const tx = (tgt.cx ?? tgt.pos.x) - s.x, ty = (tgt.cy ?? tgt.pos.y + 1) - s.y, d = Math.hypot(tx, ty) || 1, sp = Math.hypot(s.vx, s.vy); s.vx += (tx / d * sp - s.vx) * Math.min(1, dt * s.homing); s.vy += (ty / d * sp - s.vy) * Math.min(1, dt * s.homing); } }
        s.vy -= s.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      }
      s.m.position.set(s.x, s.y, 0.4);
      if (s.kind === 'arrow') s.m.rotation.z = Math.atan2(s.vy, s.vx); else if (['bone', 'book', 'boomerang', 'orbit'].includes(s.kind)) s.m.rotation.z += dt * 14;
      if (s.m.isSprite && Math.random() < 0.6) this.fx.spawn(s.x, s.y, 0.35, rnd(-0.5, 0.5), rnd(-0.5, 0.5), s.col, 0.3, s.size * 0.6, 0);
      const r = s.kind === 'crescent' || s.kind === 'pcrescent' ? 1.1 : 0.3 + s.size * 0.25;
      if (s.friendly) {
        const hb = { x0: s.x - r, x1: s.x + r, y0: s.y - r, y1: s.y + r, attack: { hitIds: s.hitIds }, roll: s.roll ? { ...s.roll, elem: s.roll.elem } : { dmg: s.dmg, crit: false, elem: [] }, mul: s.mul, proj: true };
        const before = s.hitIds.size; this.playerHits(hb); if (s.hitIds.size > before) { this.fx.burst(s.x, s.y, s.col, 8, 3); if (!s.pierce) s.life = 0; }
      } else if (!s.hit) {
        const pa = P.aabb; if (s.x + r > pa.x0 && s.x - r < pa.x1 && s.y + r > pa.y0 && s.y - r < pa.y1) { if (P.takeHit(s.dmg, s.x - Math.sign(s.vx || 1), s.elem === 'shadow' ? null : s.elem, s.src)) { this.fx.burst(s.x, s.y, s.col, 10, 3); s.life = 0; } }
      }
      if (!s.pierce || s.kind === 'arrow') for (const w of this.activeSolids()) if (!w.oneway && !w.gone && s.x > w.x0 && s.x < w.x1 && s.y > w.y0 && s.y < w.y1 && s.t > 0.06) { s.life = 0; this.fx.burst(s.x, s.y, s.col, 8, 2.5); if (s.kind === 'acid' || s.kind === 'ember') this.fx.dust(s.x, s.y, s.col); break; }
      if (s.life <= 0 && s.blast) { this.fx.ring(s.x, s.y, s.col, 5); this.shake(0.3); audio.play('rock_meteor_swarm_1', 0.4); this.playerHits({ x0: s.x - s.blast, x1: s.x + s.blast, y0: s.y - 1, y1: s.y + s.blast, attack: { hitIds: new Set() }, roll: { dmg: s.dmg, crit: false, elem: [] }, proj: true }); }
      if (s.x < b.x0 - 3 || s.x > b.x1 + 3 || s.y < b.y0 - 3 || s.y > b.y1 + 16) s.life = 0;
    }
    this.shots = this.shots.filter(s => { if (s.life > 0) return true; this.scene.remove(s.m); return false; });
  }

  shockwave(src, x, y, dir, elem, friendlyDmg) {
    const col = friendlyDmg ? 0x9ab0ff : elem ? ELEM_COL[elem] : 0xff3020;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(x, y + 0.7, 0.2); const room = this.room; room.group.add(m); if (!friendlyDmg) audio.play('rock_wall_1', 0.5);
    this.waves.push({ m, x, y, dir, t: 0, room, dmg: friendlyDmg || Math.round(src.T.dmg * 0.8 * src.dmgMul), col, elem, src, friendly: !!friendlyDmg, hitIds: new Set() });
  }
  updateWaves(dt) {
    const P = this.player;
    for (const w of this.waves) { w.t += dt; w.x += w.dir * (w.friendly ? 11 : 8.5) * dt; w.m.position.x = w.x; w.m.scale.y = 1 + Math.sin(w.t * 30) * 0.15; if (Math.random() < 0.5) this.fx.spawn(w.x, w.y + 0.2, 0.3, 0, 2, w.col, 0.3, 0.3, 0);
      if (w.friendly) this.playerHits({ x0: w.x - 0.6, x1: w.x + 0.6, y0: w.y, y1: w.y + 1.6, attack: { hitIds: w.hitIds }, roll: { dmg: w.dmg, crit: false, elem: [] }, proj: true });
      else if (!w.hit && Math.abs(P.pos.x - w.x) < 0.55 && P.pos.y < w.y + 1.1 && P.pos.y > w.y - 1) { w.hit = true; P.takeHit(w.dmg, w.x - w.dir, w.elem, w.src); }
      if (w.t > (w.friendly ? 0.6 : 1.9) || w.x < w.room.b.x0 + 0.6 || w.x > w.room.b.x1 - 0.6 || this.activeSolids().some(s => !s.oneway && !s.gone && w.x > s.x0 && w.x < s.x1 && w.y + 0.5 > s.y0 && w.y + 0.5 < s.y1)) { w.done = true; w.room.group.remove(w.m); } }
    this.waves = this.waves.filter(w => !w.done);
  }
  // a telegraphed eruption from the floor: a warning disc, then a column
  erupt(o) {
    const col = o.col || (o.elem ? ELEM_COL[o.elem] : 0xff5030);
    const m = new THREE.Mesh(new THREE.CircleGeometry(o.w / 2 + 0.3, 24), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(o.x, o.y + 0.05, 0.2); m.scale.set(1, 2.4, 1); this.scene.add(m);
    this.erupts.push({ ...o, col, m, t: 0, hitIds: new Set() });
  }
  updateErupts(dt) {
    const P = this.player;
    for (const e of this.erupts) {
      e.t += dt; const k = e.t / e.delay;
      if (k < 1) { e.m.material.opacity = 0.2 + k * 0.6 + Math.sin(e.t * 40) * 0.1; continue; }
      if (!e.fired) { e.fired = true; if (!e.quiet) audio.play(e.elem === 'ice' ? 'ice_wall_1' : e.elem === 'poison' ? 'squelching_4' : 'fireball_2', 0.35); for (let i = 0; i < (e.h > 1 ? 22 : 4); i++) this.fx.spawn(e.x + rnd(-e.w / 2, e.w / 2), e.y + Math.random() * 0.5, 0.4, rnd(-0.6, 0.6), rnd(4, 4 + e.h * 2.2), e.col, 0.55, 0.5, 4); }
      if (e.t < e.delay + 0.3 && e.dmg) {
        if (e.friendly) this.playerHits({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y, y1: e.y + e.h, attack: { hitIds: e.hitIds }, roll: { dmg: e.dmg, crit: false, elem: [] }, proj: true });
        else if (!e.hit && Math.abs(P.pos.x - e.x) < e.w / 2 + 0.25 && P.pos.y < e.y + e.h && P.pos.y + 1.6 > e.y) { if (P.takeHit(Math.round(e.dmg), e.x, e.elem, e.src)) e.hit = true; }
      }
      e.m.material.opacity = Math.max(0, 0.8 - (e.t - e.delay) * 2.5);
      if (e.t > e.delay + 0.4) { e.done = true; this.scene.remove(e.m); }
    }
    this.erupts = this.erupts.filter(e => !e.done);
  }
  breathCone(e, range, elem, dmg, dt) {
    const P = this.player, m = e.mouth, col = ELEM_COL[elem] || 0xff6a20, f = e.facing, down = e.air ? 1 : 0.18;
    for (let i = 0; i < 4; i++) this.fx.spawn(m.x, m.y - (e.air ? 0 : 0.2), 0.5, f * rnd(7, 13), e.air ? -rnd(0, 15) + rnd(-1.2, 1.2) : rnd(-1.1, 0.9), Math.random() < 0.3 ? 0xffffff : col, rnd(0.4, 0.9), rnd(0.4, 0.9), e.air ? 6 : 0);
    e._bT = (e._bT || 0) - dt; if (e._bT > 0) return; const px = (P.pos.x - m.x) * f, lo = e.air ? e.pos.y - 14 : e.pos.y - 0.4;
    const pa = P.aabb, hit = e.air ? (px > -0.3 && px < range && pa.y1 > lo && P.pos.y < m.y - px * 0.5 + 2) : (px > -0.3 && px < range && pa.y1 > m.y - 1.2 && P.pos.y < m.y + 0.8); // crouch or slide under a ground breath, or jump clear of it
    if (hit) { if (P.takeHit(Math.round(dmg * e.dmgMul), e.pos.x, elem, e)) e._bT = 0.3; }
  }
  flameWall(e, x, fy, elem, dmg, dt, h = 3.4) {
    const col = ELEM_COL[elem] || 0xff6a20, P = this.player;
    for (let i = 0; i < 5; i++) this.fx.spawn(x + rnd(-0.7, 0.7), fy + Math.random() * 0.4, 0.5, rnd(-0.5, 0.5), rnd(3, 9), Math.random() < 0.25 ? 0xffffff : col, rnd(0.3, 0.6), rnd(0.5, 1.0), 2);
    if (Math.abs(P.pos.x - x) < 1.2 && P.pos.y < fy + 1.5 && P.pos.y > fy - 1) P.takeHit(Math.round(dmg * e.dmgMul), x - e.facing, elem, e);
  }
  rainShot(e, x, fy, kind, elem, dmg) {
    this.erupt({ x, y: fy, delay: 0.75, w: 1.2, h: 0.2, dmg: 0, col: elem ? ELEM_COL[elem] : SHOT[kind]?.[0], quiet: true });
    setTimeout(() => { if (!e.dead && this.room === e.room) this.shoot({ x, y: fy + 11, vx: 0, vy: -15, kind, dmg: Math.round(dmg), elem, src: e, life: 2 }); }, 120);
  }
  async summon(e, type, x, y, opts = {}) {
    const room = e.room, b = room.b; if (room.enemies.filter(o => o.summoner && !o.dead).length >= 6) return;
    const s = new Enemy(this, { t: type, x: x - b.x0, y: y - b.y0, rise: type === 'zombie', ...opts }, room); s.summoner = e;
    this.fx.burst(x, y + 1, 0xb070ff, 20, 4);
    try { await s.load(); if (this.room === room && !e.dead) { s.awake = true; if (s.T.ai === 'boss') s.state = 'chase'; room.enemies.push(s); } else room.group.remove(s.root); } catch (err) { console.warn(err); }
  }
  // the Hollow King's suns drift over the hall and weep fire
  hollowSuns(e, n) {
    if (this.suns.length) return; // never stack
    const b = e.room.b, fy = e.arenaFloor ?? e.home.y;
    for (let i = 0; i < n; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffb030, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); m.scale.setScalar(3.2); this.scene.add(m); const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshBasicMaterial({ color: 0x100400 })); m.add(core); core.scale.setScalar(0.3);
      this.suns.push({ m, e, t: 0, ph: i / n * Math.PI * 2, cx: (b.x0 + b.x1) / 2, span: (b.x1 - b.x0) / 2 - 4, y: fy + 7.5, drop: 0.6 + i * 0.3 }); }
  }
  updateSuns(dt) {
    for (const s of this.suns) { s.t += dt; const x = s.cx + Math.sin(s.t * 0.55 + s.ph) * s.span, y = s.y + Math.cos(s.t * 1.1 + s.ph) * 1.2; s.m.position.set(x, y, -0.5); s.drop -= dt;
      if (s.drop <= 0) { s.drop = 0.85; this.shoot({ x, y: y - 0.5, vx: 0, vy: -9, kind: 'ember', dmg: Math.round(s.e.T.dmg * 0.6), elem: 'fire', src: s.e, life: 2.5 }); }
      if (s.t > 9 || s.e.dead) { s.done = true; this.scene.remove(s.m); this.fx.burst(x, y, 0xffb030, 20, 4); } }
    this.suns = this.suns.filter(s => !s.done);
  }
  windPush(e, amt) { const P = this.player; P.push = (P.push || 0) + Math.sign(P.pos.x - e.pos.x || 1) * amt; for (let i = 0; i < 3; i++) this.fx.spawn(e.pos.x + rnd(-2, 2), e.pos.y + rnd(0, 4), 0.5, Math.sign(P.pos.x - e.pos.x) * rnd(8, 14), 0, 0xc0d0e8, 0.5, 0.4, 0); }
  guardRing(e) { this.fx.ring(e.pos.x, e.pos.y + 0.04, 0x8ab0ff, 4, true); }
  burnThorns(t) {
    t.gone = true; this.flags[t.key] = true; this.slowMo(0.5); audio.play('fire_big', 0.6); audio.play('firespray_1', 0.5);
    let k = 0; const iv = setInterval(() => { k += 0.05; t.mesh.scale.setScalar(Math.max(0.01, 1 - k)); t.mesh.position.y = -k * 2; for (let i = 0; i < 4; i++) this.fx.spawn(t.x0 + Math.random() * 1.6, t.y0 + Math.random() * 4, 0.4, (Math.random() - 0.5), 2 + Math.random() * 2, Math.random() < 0.5 ? 0xff6a10 : 0xffc040, 0.7, 0.35, -2); if (k >= 1) { clearInterval(iv); t.mesh.visible = false; } }, 40);
    this.ui.toast('The blackthorn burns away!', 'unique');
  }
  chainLightning(src, dmg) {
    const other = this.room.enemies.find(e => e !== src && !e.dead && Math.abs(e.pos.x - src.pos.x) < 5 && Math.abs(e.pos.y - src.pos.y) < 3);
    this.fx.line({ x: src.cx, y: src.cy }, other ? { x: other.cx, y: other.cy } : { x: src.pos.x + (Math.random() - 0.5) * 2, y: src.pos.y + 2.5 }, 0xffe860);
    audio.play('spell_impact_2', 0.3, 1.4);
    if (other) other.damage(Math.ceil(dmg * 0.6), 'lightning', true);
  }
  blockBurst(x, y, elem) {
    const col = ELEM_COL[elem]; this.fx.burst(x, y, col, 20, 5); const d = 4 + this.player.stats.lvl * 2;
    for (const e of this.room.enemies) if (!e.dead && Math.abs(e.pos.x - x) < 2.2 && Math.abs(e.pos.y - y) < 2.5) { e.damage(d, elem, true); if (elem === 'ice') e.chill = 3; }
  }
  hitStop(t) { this.stopT = Math.max(this.stopT, t); }
  shake(a) { this.shakeT = Math.max(this.shakeT, a); }
  levelUp(lvl) { const P = this.player; this.ui.roomName(`LEVEL ${lvl}`, 2200); this.ui.toast(wantsTouch() ? '3 attribute points to spend — open the pack and tap +' : '3 attribute points to spend — open the pack (I), press 1-4', 'rare'); audio.play('firebuff_1', 0.5); this.fx.ring(P.pos.x, P.pos.y + 1, 0xffd84a, 7); this.fx.burst(P.pos.x, P.pos.y + 1, 0xffd84a, 40, 6); }

  onEnemyDeath(e) {
    const P = this.player, T = e.T, echo = P.d.echo;
    if (e.summoner) { P.gainXP(Math.round(T.xp * 0.15)); return; }
    P.stats.kills++;
    P.gainXP(Math.max(1, Math.round(T.xp * THREE.MathUtils.clamp(1 + (T.lvl - P.stats.lvl) * 0.12, 0.2, 2.2))));
    if (echo === 'vampire') P.heal(Math.round(P.stats.hpMax * 0.05));
    if (echo === 'harvest') { P.stats.mp = Math.min(P.stats.mpMax, P.stats.mp + 4); this.dropLoot(e.pos.x, e.pos.y + 1, { gold: 4 + T.lvl * 3 }, e.room); }
    if (echo === 'nova') { this.fx.ring(e.cx, e.cy, 0x7ad8ff, 6); audio.play('ice_freeze_2', 0.4); for (const o of this.room.enemies) if (!o.dead && o !== e && Math.hypot(o.cx - e.cx, o.cy - e.cy) < 4.5) { o.chill = 4; o.damage(Math.round(6 + P.stats.lvl * 3), 'ice', true); } }
    const drop = e.spec.drop === 'potion' ? { potion: true } : rollDrop(Math.max(1, T.lvl), P.d.mf);
    if (drop) setTimeout(() => this.dropLoot(e.pos.x, e.pos.y + 1, drop, e.room), 500);
    if (e.boss) {
      this.flags[e.key] = true; this.unseal(); $('bossBar').classList.add('hidden'); this.bossE = null;
      for (const o of e.room.enemies) if (o.summoner === e && !o.dead) { o.dead = true; o.gone = true; o.root.visible = false; this.fx.burst(o.cx, o.cy, 0xb070ff, 20, 4); }
      for (const s of this.shots) if (!s.friendly) s.life = 0; for (const s of this.suns) s.t = 99; for (const er of this.erupts) if (!er.friendly) er.dmg = 0;
      this.ui.roomName(T.title || `${T.name.toUpperCase()} — SLAIN`, 4200); this.slowMo(1.4); this.flash(); audio.play('firebuff_1', 0.7); audio.music(MUSIC[e.room.def.theme] || 'ambient_3', 0.3);
      const tier = T.tier;
      setTimeout(() => {
        this.dropLoot(e.pos.x - 1.2, e.pos.y + 1.4, tierItem(tier + 1, 'rare'), e.room); this.dropLoot(e.pos.x + 1.2, e.pos.y + 1.4, tierItem(tier + 1, Math.random() < 0.5 ? 'rare' : 'magic'), e.room);
        this.dropLoot(e.pos.x, e.pos.y + 1.6, e.mini ? { up: Math.random() < 0.5 ? 'life' : 'mana' } : makeGem(DROP_GEMS[Math.random() * DROP_GEMS.length | 0]), e.room); this.dropLoot(e.pos.x + 0.5, e.pos.y + 1.2, { gold: 60 * tier * tier }, e.room);
        if (T.bell && e.room.def.bell && !P.has(T.bell)) { this.spawnBell(e.room); this.ui.toast('A bell wakes somewhere in the hall…', 'unique'); }
        if (T.final) this.ending();
      }, 1400);
    }
  }
  bossStart(e) {
    const r = e.room, b = r.b; this.bossE = e; let fl = -1e9; for (const s of r.solids) if (!s.oneway && !s.gone && s.kind !== 'ceil' && s.kind !== 'gate' && e.home.x > s.x0 && e.home.x < s.x1 && s.y1 <= e.home.y + 0.5 && s.y1 > fl) fl = s.y1; e.arenaFloor = fl > -1e8 ? fl : e.home.y;
    $('bossBar').classList.remove('hidden'); $('bossName').textContent = e.T.name.toUpperCase(); this.bossUpdate(e);
    audio.music('action_' + (1 + (e.T.tier + (e.mini ? 2 : 0)) % 5), 0.42);
    if (!r.def.boss || e.mini) return;
    // seal every way out until it dies
    audio.play('portcullis_gate', 0.6);
    for (const d of r.def.doors) {
      let s, m;
      if (d.side === 'W' || d.side === 'E') { const x = d.side === 'W' ? b.x0 + 0.5 : b.x1 - 0.5, y = rowFloorY(d.row) + FLOOR; s = { x0: x - 0.35, x1: x + 0.35, y0: y, y1: y + DOOR_H, seal: true }; m = new THREE.Mesh(new THREE.PlaneGeometry(4, DOOR_H), this.sealMat); m.rotation.y = Math.PI / 2; m.position.set(x, y + DOOR_H / 2, -0.4); }
      else { const cx = d.col * SW + SW / 2, y = d.side === 'N' ? b.y1 - FLOOR : b.y0 + FLOOR - 0.5; s = { x0: cx - HOLE_W / 2, x1: cx + HOLE_W / 2, y0: y, y1: y + 0.5, seal: true }; m = new THREE.Mesh(new THREE.PlaneGeometry(HOLE_W, 4), this.sealMat); m.rotation.x = Math.PI / 2; m.position.set(cx, y + 0.25, -0.4); }
      // never trap the pilgrim inside the seal itself
      const P = this.player; if (P.pos.x > s.x0 - 0.5 && P.pos.x < s.x1 + 0.5 && P.pos.y + 1.7 > s.y0 && P.pos.y < s.y1) P.pos.x = d.side === 'W' ? s.x1 + 0.6 : d.side === 'E' ? s.x0 - 0.6 : P.pos.x;
      this.scene.add(m); s.m = m; this.seals.push(s);
    }
  }
  unseal() { for (const s of this.seals) this.scene.remove(s.m); this.seals = []; }
  bossPhase(e, ph) { this.shake(0.6); this.flash(); audio.play('crowd_gasp', 0.4, 0.5); this.ui.toast(ph === 2 ? `${e.T.name.split(',')[0]} grows desperate!` : `${e.T.name.split(',')[0]} burns with a last fury!`, 'unique'); this.fx.ring(e.cx, e.cy, 0xff4040, 10); }
  bossUpdate(e) { if (e === this.bossE) { const w = Math.max(0, 100 * e.hp / e.hpMax) + '%'; $('bossFill').style.width = w; $('bossTrail').style.width = w; } }
  ending() {
    const P = this.player, s = P.stats, pct = Math.round(100 * this.visited.size / this.world.rooms.length), mins = Math.round(this.playTime / 60);
    setTimeout(() => { this.cine = true; this.ui.ending(`The hollow sun gutters out. Above Castle Velscour, for the first time in an age, seven bells ring.`, [['Level', s.lvl], ['Castle explored', pct + '%'], ['Foes slain', s.kills], ['Time', `${Math.floor(mins / 60)}h ${mins % 60}m`]]); audio.music('intro_cursed_citadel', 0.5); audio.play('title_bells', 0.8); }, 5200);
  }
  onPlayerDeath() {
    audio.play('wilhelm_scream', 0.25); this.ui.roomName('YOU HAVE PERISHED');
    setTimeout(() => { $('fade').style.opacity = 1; }, 1800);
    setTimeout(async () => {
      const P = this.player; P.state = 'free'; P.inv = 1.5; P.vel.set(0, 0); P.layers.lower.cur = P.layers.upper.cur = null; P.sunk = false;
      const save = this.readSave(); let rm = (save && this.world.byId(save.room)) || this.world.rooms.find(r => r.def.start);
      if (save) { const lost = Math.round(P.stats.gold * 0.25); P.stats.gold -= lost; if (lost) setTimeout(() => this.ui.toast(`${lost} gold slipped away in the dark.`, ''), 800); }
      await this.ensureRoom(rm); P.refreshStats(); P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax;
      if (rm.saveAt) P.pos.set(rm.saveAt.x, rm.saveAt.y); else P.pos.set(rm.b.x0 + (rm.def.start?.x ?? 5), rm.b.y0 + (rm.def.start?.y ?? 0.5));
      const old = this.room; this.room = null; if (old) { old.group.visible = false; this.leaveRoom(old); for (const e of old.enemies) if (e.dead && !e.boss) e.reset(); }
      await this.enterRoom(rm, true); $('fade').style.opacity = 0;
    }, 2600);
  }
  onEquip(it) { if (this.tutorial === 'equip' && this.player.equip.weapon) { this.tutorial = null; this.ui.prompt(''); this.ui.toast('J to attack — while running, jumping or crouching too', 'magic'); } }

  // ------------------------------------------------------------------ save
  save(room) { const P = this.player, prev = this.readSave(); localStorage.setItem(SAVE_KEY, JSON.stringify({ stats: P.stats, equip: P.equip, bag: P.bag, flags: this.flags, bells: [...P.bells], visited: [...this.visited], time: this.playTime, room: room ? room.def.id : prev?.room || this.world.rooms.find(r => r.def.start).def.id })); }
  readSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } }

  async warpTo(id) {
    const rm = this.world.byId(id), P = this.player; if (!rm || rm === this.room) return;
    audio.play('wave_attack_2', 0.6, 0.5); $('fade').style.opacity = 1; this.cine = true;
    await this.ensureRoom(rm); await new Promise(r => setTimeout(r, 350));
    await this.ensureRoom(rm); const wp = rm.warpAt || { x: rm.b.x0 + (rm.def.warp?.x ?? 5), y: rm.b.y0 + FLOOR }; // the room may have been unloaded while the screen faded
    P.pos.set(wp.x, wp.y); P.vel.set(0, 0); this.cine = false; await this.enterRoom(rm, true); this.fx.burst(P.pos.x, P.pos.y + 1, 0xd0b060, 40, 5);
  }
  interact() {
    const P = this.player, r = this.room;
    if (r.saveAt && Math.abs(P.pos.x - r.saveAt.x) < 1.8 && Math.abs(P.pos.y - r.saveAt.y) < 1) { P.state = 'sit'; P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax; P.stats.potions = Math.max(P.stats.potions, Math.min(this.potionCap(), 3)); P.poisoned = 0; this.save(r); audio.play('firebuff_2', 0.5); this.ui.toast('Your vigor returns. Progress recorded.', 'unique'); return; }
    if (r.warpAt && Math.abs(P.pos.x - r.warpAt.x) < 1.8 && Math.abs(P.pos.y - r.warpAt.y) < 1) { const list = this.world.rooms.filter(o => o.def.warp && this.flags['warp:' + o.def.id] && o !== r); if (!list.length) this.ui.toast('The mirror is dark. Its twins lie deeper in the castle.', 'magic'); else this.ui.openMenu('warp', list); return; }
    if (r.shopAt && Math.abs(P.pos.x - r.shopAt.x) < 2.2 && Math.abs(P.pos.y - r.shopAt.y) < 1) { this.ui.openMenu('shop'); return; }
    for (const c of r.chests) if (!c.opened && Math.abs(P.pos.x - c.x) < 1.4 && Math.abs(P.pos.y - c.y) < 1) { c.open(); return; }
  }
  promptFor() {
    const P = this.player, r = this.room;
    let t = '', ctx = ''; const near = (o, d = 1.8) => o && Math.abs(P.pos.x - o.x) < d && Math.abs(P.pos.y - o.y) < 1, key = document.body.classList.contains('touch') ? '' : 'E — ';
    if (near(r.saveAt)) { t = key + 'Rest at the coffin (heal & save)'; ctx = 'REST'; }
    else if (near(r.warpAt)) { t = key + 'Step through the mirror'; ctx = 'TOUCH'; }
    else if (near(r.shopAt, 2.2)) { t = key + 'Trade'; ctx = 'TRADE'; }
    else if (r.chests.some(c => !c.opened && near(c, 1.4))) { t = key + 'Open the chest'; ctx = 'OPEN'; }
    else for (const l of r.def.lore) if (Math.abs(P.pos.x - (r.b.x0 + l.x)) < 3 && (l.y === undefined || Math.abs(P.pos.y - (r.b.y0 + l.y)) < 3)) t = l.text.replace('{jump}', wantsTouch() ? 'JUMP' : 'SPACE').replace('{dash}', wantsTouch() ? 'DASH' : 'SHIFT');
    if (!t && this.tutorial) return; // a standing tutorial line yields to anything the room has to say
    this.ctxAction = ctx; // touch: shows the USE button
    if (t !== this._pt) { this._pt = t; this.ui.prompt(t); }
  }

  // ------------------------------------------------------------------ loop
  step(dt) {
    this.frame = (this.frame || 0) + 1;
    if (this.stopT > 0 && this.room && !this.loading && !this.cine && !this.ui.open) { this.stopT -= dt; this.render(0); return; }
    let inp = this.input.poll(); const P = this.player;
    if (this.loading || !this.room) { return; }
    if (this.cine) { this.render(0); if (this.ui.open) for (const k of this.input.menuKeys) this.ui.menuKey(k); return; }
    if (inp.invP) this.ui.toggle('inv'); else if (inp.mapP) this.ui.toggle('map');
    if (this.ui.open) { for (const k of this.input.menuKeys) if (!['KeyI', 'Tab', 'KeyM'].includes(k)) this.ui.menuKey(k); this.render(0); return; }
    if (this.slowT > 0) { this.slowT -= dt; dt *= 0.3; }
    this.time += dt; this.playTime += dt;
    if (this.stopT > 0) { this.stopT -= dt; this.render(0); return; }
    if (inp.interactP && !inp.attackP && P.onGround && P.state === 'free') this.interact(); // Up + Attack is the mana art, not a doorbell
    if (inp.potionP && P.stats.potions > 0 && P.stats.hp < P.stats.hpMax && P.state === 'free' && !(P.drinkT > 0)) { P.stats.potions--; P.heal(Math.round(20 + P.stats.hpMax * 0.25)); P.poisoned = 0; P.drinkT = 0.4; P.attack = null; audio.play('heart_collect', 0.5); }
    if (P.drinkT > 0) { P.drinkT -= dt; inp = { ...inp, x: 0, jumpP: false, attackP: false, dashP: false, shield: false }; } // drinking roots you for a breath
    this.world.update(this.time, dt, this.room, this.camPos);
    P.update(dt, inp);
    const r = this.world.roomAt(P.pos.x, P.pos.y + 0.9); if (r && r !== this.room) { this.enterRoom(r); if (this.loading) return; }
    if (this.room.bellObj) { const o = this.room.bellObj; o.piv.rotation.z = Math.sin(this.time * 2.4) * 0.22; o.glow.material.opacity = 0.55 + Math.sin(this.time * 3) * 0.2; if (Math.abs(P.pos.x - o.x) < 1.1 && Math.abs(P.pos.y - o.y) < 2 && P.state !== 'dead') this.ringBell(this.room); }
    for (const e of this.room.enemies) if (!e.gone) e.update(dt, P);
    this.updateHazards(dt); this.updateLoot(dt); this.updateShots(dt); this.updateWaves(dt); this.updateErupts(dt); this.updateSuns(dt); this.fx.update(dt); this.promptFor();
    if (this.seals.length) this.sealMat.opacity = 0.4 + Math.sin(this.time * 6) * 0.2;
    this.render(dt);
  }

  render(dt) {
    const P = this.player, b = this.room.b, cam = this.camera;
    if (this._sz !== Math.max(2, innerWidth) + 'x' + Math.max(2, innerHeight)) this.resize();
    if (!isFinite(this.camPos.x) || !isFinite(this.camPos.y)) this.snapCam = true;
    const boss = this.bossE && !this.bossE.dead ? this.bossE : null, def = this.room.def;
    let wantZ = def.vista || CAMZ; if (def.vistaAt && P.pos.x - b.x0 > def.vistaAt.x) wantZ = def.vistaAt.z;
    if (boss) { const sep = Math.abs(P.pos.x - boss.pos.x); wantZ = Math.max(wantZ, Math.min(19, (boss.T.quad || boss.T.fly ? 15.5 : 13.5) + Math.max(0, sep - 7) * 0.55)); } // keep a charging boss on screen
    this.camZ += (wantZ - this.camZ) * Math.min(1, dt * 1.5);
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * this.camZ, halfW = halfH * cam.aspect;
    // look-ahead follows running, not facing, and eases slowly: turning to fight no longer swings the frame
    const run = Math.abs(P.vel.x) > 1 && P.state !== 'backdash' ? Math.sign(P.vel.x) : 0; this.lookX ||= 0; if (run) this.lookX = (this.lookX || 0) + (run * 1.6 - (this.lookX || 0)) * Math.min(1, dt * 1.6); // standing still keeps the last offset: no drift after every stop
    // height holds on the last footing; a jump only moves the frame once it climbs out of a band, a fall follows at once
    if (P.onGround || this.footY === undefined || this.snapCam) this.footY = P.pos.y;
    let fy = this.footY; if (P.pos.y > fy + 1.6) fy = P.pos.y - 1.6; if (P.pos.y < fy) { fy = P.pos.y; this.footY = fy; }
    let tx = P.pos.x + this.lookX, ty = fy + (def.open ? 2.6 : 1.5); // open air: give the sky and the castle more of the frame
    if (def.vistaAt && P.pos.x - b.x0 > def.vistaAt.x) ty += 2.2; // and lift it to take in the barbican's crown
    if (boss) { tx = boss.state === 'intro' && boss.t < 2 && boss.phase === 1 ? boss.pos.x - boss.facing * 1.2 : P.pos.x * 0.6 + boss.pos.x * 0.4; ty = fy * 0.7 + (boss.pos.y + 1) * 0.3 + 1.4; }
    tx = (b.x1 - b.x0) <= halfW * 2 ? (b.x0 + b.x1) / 2 : Math.max(b.x0 + halfW, Math.min(b.x1 - halfW, tx));
    const lo = b.y0 + halfH - (def.open ? 0.7 : 0.35), hi = Math.max(lo, b.y1 - halfH + (def.open ? 6 : 0.2));
    ty = Math.max(lo, Math.min(hi, ty));
    if (this.snapCam) { this.camPos.set(tx, ty); this.snapCam = false; }
    else { const k = 1 - Math.exp(-dt * 6); this.camPos.x += (tx - this.camPos.x) * k; this.camPos.y += (ty - this.camPos.y) * (1 - Math.exp(-dt * 4)); }
    let sx = 0, sy = 0; if (this.shakeT > 0) { this.shakeT -= dt; sx = (Math.random() - 0.5) * this.shakeT * 0.5; sy = (Math.random() - 0.5) * this.shakeT * 0.5; }
    cam.position.set(this.camPos.x + sx, this.camPos.y + 0.45 + sy, this.camZ); cam.lookAt(this.camPos.x + sx, this.camPos.y + sy, 0);
    this.backRim.position.set(this.camPos.x + 2, this.camPos.y + 1, -12); this.backRim.target.position.set(this.camPos.x, this.camPos.y, 0);
    this.camFill.position.set(this.camPos.x + 3, this.camPos.y + 4, 14); this.camFill.target.position.set(this.camPos.x, this.camPos.y, 0);
    if (this.room.theme.sky) { this.moon.position.set(this.camPos.x - 10, this.camPos.y + 16, 6); this.moon.target.position.set(this.camPos.x, this.camPos.y - 2, -1); } else { this.moon.position.set(this.camPos.x - 15, this.camPos.y + 4.5, 3); this.moon.target.position.set(this.camPos.x, this.camPos.y, -2.5); } // indoors the moon rakes across the masonry from a window
    this.hemi.intensity = (this.amb || 0.5) * (this.room.lightning > 0 ? 3.5 : 1);
    this.ui.hud(); this.grade.uniforms.time.value = (this.time || 0) % 100;
    if (!window.__norender) this.composer.render();
  }

  start() {
    let last = performance.now(), acc = 0;
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt;
      if (window.__pause) this.composer.render();
      else if (acc >= 1 / 120) { try { this.step(Math.min(acc, 1 / 30)); } catch (e) { if (!this._err) { this._err = 1; console.error(e); } } acc = 0; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

const game = new Game(); window.game = game;
game.touch = initTouch(game.input, () => { const P = game.player; return { menu: game.ui.open, ctx: game.ctxAction, potions: P.stats.potions, canDouble: P.has('djump') && !P.onGround && P.jumpsLeft > 0 && P.state === 'free' }; });
// Debug helpers (console): sim(frames, heldKeys, pressedKeys) steps the game; tp(roomId, x, y) teleports; give(...bells) grants bells.
window.sim = (n, keys = [], press = []) => { const I = game.input; press.forEach(k => I.pressed.add(k)); keys.forEach(k => I.keys.add(k)); for (let i = 0; i < n; i++) { if (i === 1) I.pressed.clear(); game.step(1 / 60); } keys.forEach(k => I.keys.delete(k)); };
window.shot = (x, y, z, lx, ly, lz = 0) => { window.__pause = true; game.camera.position.set(x, y, z); game.camera.lookAt(lx, ly, lz); };
window.tp = async (id, lx, ly, n = 30) => { const r = game.world.byId(id); await game.ensureRoom(r); game.player.pos.set(r.b.x0 + lx, r.b.y0 + ly); game.player.vel.set(0, 0); game.room && (game.room.group.visible = false, game.leaveRoom(game.room)); game.room = null; await game.enterRoom(r, true); sim(n); return id; };
window.give = (...b) => { (b.length ? b : BELL_ORDER).forEach(x => game.player.bells.add(x)); game.ui.bells(); game.applyBells(game.room); };
window.gear = (base, o = {}) => { const it = o.unique ? makeUnique(o.unique) : makeItem(base, o); game.player.bag.push(it); return game.player.equipItem(BASES[it.base].slot === 'ring' ? 'ring1' : BASES[it.base].slot, it); };
window.snap = async (name) => { game.render(0); const d = $('view').toDataURL('image/jpeg', 0.85); await fetch('/__shot?name=' + encodeURIComponent(name), { method: 'POST', body: d }); return name; };
// visit every room, run it for a moment and report anything that throws
window.smoke = async (ids) => { const out = []; for (const r of game.world.rooms) { if (ids && !ids.includes(r.def.id)) continue; game._err = 0; try { const d = r.def, sx = d.doors.find(o => o.side === 'W') ? 2 : d.doors.find(o => o.side === 'E') ? d.w * SW - 2 : d.w * SW / 2; await tp(d.id, d.start?.x ?? sx, (d.h - 1) * SH + 0.6, 0); for (const e of game.room.enemies) e.awake = e.awake || false; sim(90); if (game._err) out.push(d.id + ': step error'); } catch (e) { out.push(r.def.id + ': ' + e.message); } } return out; };
// line monsters up in the long hall for inspection: lineup(['goblin','harpy'], 'attack')
window.lineup = async (types, pose, gap = 5) => { await tp('lowerhall', 8, 0.5, 5); const r = game.room; for (const e of r.enemies) r.group.remove(e.root); r.enemies = []; let x = 14; const out = []; for (const t of types) { const e = new Enemy(game, { t, x, y: TYPES[t].ai === 'flyer' ? 2.5 : 0.5 }, r); await e.load(); e.update = () => {}; e.facing = -1; e.sync(0); r.enemies.push(e); out.push(e); x += Math.max(gap, TYPES[t].w + 2.5); }
  for (const e of out) { const T = e.T, nm = pose === 'attack' ? (T.moves ? T.moves[0].anim : T.anim.attack) : pose === 'walk' ? T.anim.walk : pose === 'death' ? T.anim.death : T.anim.idle, c = e.clips[nm]; if (c) { e.play(nm, 0, { restart: true }); e.mixer.setTime(c.duration * (pose === 'attack' ? (T.windup[0] + T.windup[1]) / 2 : pose === 'death' ? 0.95 : 0.3)); } e.yaw = e.facing * (T.quad ? Math.PI / 2 - 0.22 : Math.PI / 2 - 0.42); e.model.rotation.y = e.yaw; }
  return out.map(e => e.spec.t + ':' + Object.keys(e.clips).length); };
window.view = async (x, y, z, name) => { const b = game.room.b; game.camera.position.set(b.x0 + x, b.y0 + y + 0.9, z); game.camera.lookAt(b.x0 + x, b.y0 + y, 0); game.camFill.position.set(b.x0 + x + 3, b.y0 + y + 4, 14); game.camFill.target.position.set(b.x0 + x, b.y0 + y, 0); game.world.update(game.time, 0, game.room, { x: b.x0 + x, y: b.y0 + y }); game.composer.render(); const d = $('view').toDataURL('image/jpeg', 0.85); await fetch('/__shot?name=' + encodeURIComponent(name), { method: 'POST', body: d }); return name; };
// headless soak: random inputs in each room with an unkillable hero; returns thrown errors
window.soak = async (ids, frames = 240) => { const out = [], keys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'Space', 'KeyL'], taps = ['KeyJ', 'Space', 'ShiftLeft', 'KeyE', 'KeyQ']; window.__norender = true; const P = game.player;
  for (const id of ids || game.world.rooms.map(r => r.def.id)) { const r = game.world.byId(id), d = r.def; try { await game.ensureRoom(r); const sx = d.w * SW * (0.2 + Math.random() * 0.6), fy = game.floorBelow(r.b.x0 + sx, r.b.y0 + (d.h > 1 ? 9.5 : 4)); while (game.loading) await new Promise(q => setTimeout(q, 50)); await tp(id, sx, Math.max(0.5, fy - r.b.y0) + 0.02, 2); if (!game.room) { out.push(id + ': no room'); continue; } for (const e of game.room.enemies) if (e.boss) { e.awake = true; e.state = 'chase'; game.bossStart(e); }
      for (let i = 0; i < frames; i++) { P.stats.hp = P.stats.hpMax; if (P.state === 'dead') P.state = 'free'; const held = keys.filter(() => Math.random() < 0.3), tap = taps.filter(() => Math.random() < 0.06); try { sim(1, held, tap); } catch (e) { out.push(id + ' f' + i + ': ' + (e.stack || e.message).split(String.fromCharCode(10)).slice(0, 3).join(' | ')); break; } if (game._err) { out.push(id + ': step error (see console)'); game._err = 0; break; } }
    } catch (e) { out.push(id + ': ' + e.message); } }
  window.__norender = false; return out; };
window.boot = () => new Promise(r => { const i = setInterval(() => { if (!$('startBtn').classList.contains('hidden')) { clearInterval(i); $('startBtn').click(); r('started'); } }, 200); });
game.load(t => $('loadMsg').textContent = t).then(() => {
  $('loadMsg').textContent = game.readSave() ? 'A pilgrim\'s rest is recorded. Enter to continue, N for a new journey.' : '';
  $('startBtn').classList.remove('hidden');
  const begin = async (fresh) => { audio.resume(); removeEventListener('keydown', k); $('title').classList.add('hidden'); document.body.classList.add('playing'); $('hud').classList.remove('hidden'); if (!fresh && game.readSave()) await game.newGame(true); game.start(); };
  if (game.readSave()) { $('newBtn').classList.remove('hidden'); $('newBtn').onclick = () => { localStorage.removeItem(SAVE_KEY); begin(true); }; }
  const k = e => { if (e.code === 'Enter') begin(false); if (e.code === 'KeyN') { localStorage.removeItem(SAVE_KEY); begin(true); } };
  $('startBtn').onclick = () => begin(false); addEventListener('keydown', k);
}).catch(e => { console.error(e); $('loadMsg').textContent = 'Failed to load: ' + e.message; });
