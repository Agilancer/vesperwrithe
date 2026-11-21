import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { World, glowTex, flameTex, ZB } from './world.js';
import { SW, SH, FLOOR, BELLS, BELL_ORDER, rowFloorY, DOOR_H, HOLE_W } from './rooms.js';
import { Player } from './player.js';
import { Enemy, TYPES, ELEM_COL } from './enemies.js';
import { hordeSpecs } from './horde.js';
import { UI } from './ui.js';
import { initTouch } from './touch.js';
import { loadMeta, weaponModel, audio, surface, loadGLTF, LOW_MEM } from './assets.js';
import { wantsTouch } from './touch.js';
import { Pads, pick, fmt, device, onDevice, setDevice, family as padFamily } from './gamepad.js';
import { startWeapon } from './attacks.js';
import { makeItem, makeGem, makeUnique, rollDrop, tierItem, isRanged, ART_COST, BASES, GEMS, DROP_GEMS, ECHOES, staffElem } from './items.js';

const HUE = { // [interior ambient, shadow lift (rgb)]: each wing keeps its own cast against the warm torch pools
  frost: [0x5a6a80, [0.01, 0.02, 0.04]],
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
// one-shot effects tick on the game clock (not the display's refresh): same speed at 60/120/144 Hz, frozen by hit-stop and the pack, slowed by slow-mo
let FDT = 1 / 60, TICKS = []; const nextTick = fn => { TICKS.push(fn); };
const runTicks = dt => { FDT = dt; const q = TICKS; TICKS = []; for (const f of q) f(); };
const after = (sec, fn) => { let t = 0; const tick = () => { t += FDT; if (t >= sec) fn(); else nextTick(tick); }; nextTick(tick); }; // a delay on the game clock: it pauses with the game and with hitstop-free menus, unlike setTimeout
// the world steps at a fixed 1/60 s (Game.start), drawn interpolated: jumps, knockback, decays and the AI's per-step dice come out
// the same on 60, 120 and 144 Hz screens (the AI and emitters are tuned per 1/60 s step; a 1/120 step would double their odds)
const STEP = 1 / 60;
// per-step emitters are written as "chance per 1/60 s": K60 rescales them to the step, so a 120 Hz step doesn't double the smoke
let K60 = 1; const per = p => Math.random() < p * K60, nPer = n => Math.floor(n * K60 + Math.random());
// how a blow lands, per weapon class: [hit-stop s, camera trauma, knockback m/s, lift m/s]. A dagger ticks, a maul stops the world.
const IMPACT = {
  dagger: [0.03, 0.06, 1.2], rapier: [0.03, 0.06, 1.2], sword: [0.055, 0.12, 3.5], axe: [0.07, 0.18, 4.5], mace: [0.09, 0.26, 5, 2.5],
  great_sword: [0.11, 0.32, 7.5], great_axe: [0.11, 0.32, 7.5], great_mace: [0.14, 0.45, 9, 4.5], spear: [0.07, 0.16, 5], lance: [0.08, 0.2, 7],
  staff: [0.06, 0.14, 3.5], scythe: [0.08, 0.22, 5], unarmed: [0.045, 0.1, 2.5], slide: [0.04, 0.1, 3], dive: [0.06, 0.2, 2, 3],
  bow: [0.035, 0.08, 2], boomerang: [0.04, 0.08, 2.5], // missiles tick, not thud (they fell back to the sword's 0.055 s stop)
};
const MUSIC = { outdoor: 'intro_cursed_citadel', courtyard: 'ambient_2', garden: 'ambient_4', rampart: 'dark_5', crypt: 'dark_2', catacomb: 'dark_3', royalcrypt: 'ambient_6', aqueduct: 'ambient_5', cistern: 'ambient_7', library: 'light_2', portrait: 'light_4', vestibule: 'light_1', servants: 'ambient_1', ossuary: 'dark_4', prison: 'dark_4', clock: 'fx_2', mine: 'ambient_8', forge: 'fx_1', magma: 'fx_3', mirror: 'light_3', observatory: 'ambient_9', belfry: 'dark_5', sanctum: 'ambient_10', hollow: 'ambient_10', shrine: 'light_5', menagerie: 'ambient_3' };

// ------------------------------------------------------------------------------------- input
// Keyboard, touch (touch.js feeds the same key sets) and game controllers (gamepad.js) merge here into one intent.
// Pads: A jump · X attack · B potion · Y use · LB/LT guard · RB/RT dash · Menu pack · View map; stick or d-pad moves.
class Input {
  constructor() {
    this.keys = new Set(); this.pressed = new Set(); this.pads = new Pads(); this.menuKeys = [];
    addEventListener('keydown', e => { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault(); if (!this.keys.has(e.code)) this.pressed.add(e.code); this.keys.add(e.code); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    // pads are sampled every display frame (not only when the game steps), so a quick tap inside a hit-stop still lands
    const tick = () => { this.pads.sample(); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  }
  poll() {
    const k = this.keys, p = this.pressed, any = (...c) => c.some(x => k.has(x)), hit = (...c) => c.some(x => p.has(x));
    const g = this.pads.read(), e = n => g.edges.has(n);
    const kx = (any('ArrowRight', 'KeyD') ? 1 : 0) - (any('ArrowLeft', 'KeyA') ? 1 : 0);
    const s = {
      x: kx || g.x,
      down: any('ArrowDown', 'KeyS') || g.down,
      jump: any('Space', 'KeyK') || g.jump || hit('Space', 'KeyK') || e('jump'), jumpP: hit('Space', 'KeyK') || e('jump'), // a tap that began and ended between steps (a hit-stop) still lifts for one frame
      up: any('ArrowUp', 'KeyW') || g.up, attackP: hit('KeyJ', 'KeyX') || e('attack'), shield: any('KeyL', 'KeyC') || g.guard,
      dashP: hit('ShiftLeft', 'ShiftRight') || e('dash'), interactP: hit('KeyE', 'ArrowUp', 'KeyW') || e('use') || e('up'),
      potionP: hit('KeyQ') || e('heal'), invP: hit('KeyI', 'Tab') || e('pack'), mapP: hit('KeyM') || e('map'),
    };
    this.menuKeys = [...p, ...g.menu]; p.clear(); // pad menu codes (with auto-repeat) only ever reach menus, never gameplay
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
  puff(x, y, col = 0x6a4a30) { for (let i = 0; i < 4; i++) this.spawn(x + (Math.random() - 0.5) * 0.8, y + 0.2 + Math.random() * 0.4, 0.5, (Math.random() - 0.5) * 1.2, 0.8 + Math.random() * 0.8, col, 0.32 + Math.random() * 0.12, 0.5 + Math.random() * 0.4, -1.5, true); } // soft warm dust, gone in a breath
  // a ripple of force: a soft, thin ring that races out to radius r and thins as it goes (eased, so it reads as a pulse)
  ring(x, y, col, r = 6, flat = false) {
    const m = new THREE.Mesh(FX.ringGeo ||= new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: FX.ringTex ||= ringTex(), color: col, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    if (flat) m.rotation.x = -Math.PI / 2; m.position.set(x, y, flat ? 0 : 0.8); this.scene.add(m);
    const life = 0.32 + Math.min(0.3, r * 0.03); let t = 0; // r keeps its old meaning: the ring ends about 0.55 r out
    const tick = () => { t += FDT; const k = Math.min(1, t / life), s = 0.3 + r * 0.55 * (1 - (1 - k) ** 3); m.scale.set(s, s, 1); m.material.opacity = (1 - k) ** 1.6; if (k < 1) nextTick(tick); else { this.scene.remove(m); m.material.dispose(); } }; tick();
  }
  // a bolt of lightning (or any arc): a jagged ribbon with a white-hot core inside a coloured glow, re-forked as it flickers out
  line(a, b, col, fork = true) {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1, n = Math.max(6, Math.round(len * 2.2)), nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, jits = Array.from({ length: n + 1 }, (_, i) => i && i < n ? (Math.random() - 0.5) * 0.7 : 0);
    const strip = (w) => { const P = [], U = []; for (let i = 0; i <= n; i++) { const t = i / n, j = jits[i] + (Math.random() - 0.5) * 0.12, x = a.x + (b.x - a.x) * t + nx * j, y = a.y + (b.y - a.y) * t + ny * j, ww = w * (1 - Math.abs(t - 0.5) * 0.6); P.push(x - nx * ww, y - ny * ww, 0.6, x + nx * ww, y + ny * ww, 0.6); U.push(t, 0, t, 1); }
      const idx = []; for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(idx); return g; }; /* one shared path: glow and core follow the same zigzag */
    const mk = (w, c, o) => new THREE.Mesh(strip(w), new THREE.MeshBasicMaterial({ map: FX.bandTex ||= bandTex(), color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const grp = new THREE.Group(); grp.add(mk(0.3, col, 0.6), mk(0.07, 0xffffff, 1)); this.scene.add(grp);
    if (fork && len > 2) for (let f = 0; f < 1 + (Math.random() < 0.5 ? 1 : 0); f++) { const t = rnd(0.25, 0.35), px = a.x + (b.x - a.x) * t + nx * jits[Math.round(t * n)], py = a.y + (b.y - a.y) * t + ny * jits[Math.round(t * n)], ang = Math.atan2(b.y - a.y, b.x - a.x) + (Math.random() < 0.5 ? 0.7 : -0.7), fl = len * rnd(0.15, 0.25); this.line({ x: px, y: py }, { x: px + Math.cos(ang) * fl, y: py + Math.sin(ang) * fl }, col, false); } /* a fork or two off the main stroke */
    for (let i = 0; i < 3; i++) this.spawn(b.x, b.y, 0.7, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, col, 0.25, 0.4, 0);
    let t = 0; const tick = () => { t += FDT; grp.children.forEach((m, i) => { m.material.opacity = (i ? 1 : 0.6) * Math.max(0, 1 - t / 0.2) * (0.6 + Math.random() * 0.4); if (per(0.3)) { m.geometry.dispose(); m.geometry = strip(i ? 0.07 : 0.3); } });
      if (t < 0.2) nextTick(tick); else { this.scene.remove(grp); grp.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); } }; tick();
  }
  // a four-point star glint: two thin crossed flashes that turn as they fade
  star(x, y, col = 0xffffff, size = 0.7) { for (const a of [0, Math.PI / 2]) { const m = new THREE.Mesh(FX.starGeo ||= new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: FX.bandTex ||= bandTex(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(x, y, 0.95); m.rotation.z = a + 0.4; m.scale.set(size, 0.05, 1); this.scene.add(m); let t = 0; const tick = () => { t += FDT; const k = Math.min(1, t / 0.16); m.scale.set(size * (1 - k * 0.5), 0.05, 1); m.rotation.z += 0.05; m.material.opacity = 1 - k; if (k < 1) nextTick(tick); else { this.scene.remove(m); m.material.dispose(); } }; tick(); } }
  // a reaping crescent: a tapered ribbon in the blade's plane (the screen), thick at the belly and hair-thin at both tips. Only the
  // FRONT half of the reap is drawn, on the facing side: from just short of the arc's foot, under the blade and up in front (a0
  // 1.5π − 0.3, a1 2π + 0.35; dir mirrors it). The whole lower arc, from behind the hero, first drew behind him and then crossed
  // his thighs as a hoop while the blade was already overhead. (x, y) is the anchor the caller hands over once the blade tip is
  // out in front; the arc is lifted off it. Additive, never above 0.5: a trace, not a card. The ribbon is re-laid every step over
  // just the swept stretch [tail, head] of the arc, tapering to a point at both ends (a blade tip, never a square cut). The sweep
  // takes SWEEP s and the trace is wholly gone FADE s after it.
  crescent(x, y, dir, col = 0x9ab0a0, r = 1.3) {
    const n = 20, cx = x - dir * 0.15, cy = y + 0.95, ry = r * 0.5, a0 = Math.PI * 1.5 - 0.3, a1 = Math.PI * 2 + 0.35, U = [], idx = [], pos = new Float32Array((n + 1) * 6), SWEEP = 0.12, FADE = 0.15, END = SWEEP + FADE;
    for (let i = 0; i <= n; i++) { U.push(i / n, 0, i / n, 1); if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(idx);
    // s0..s1: the stretch of the whole arc (0..1) to draw. Width = the arc's belly (thick mid-arc, hair-thin at its far tips) times a
    // taper over the drawn stretch that closes to nothing at both of its ends within its outer 30%
    const lay = (s0, s1) => { for (let i = 0; i <= n; i++) { const u = i / n, s = s0 + (s1 - s0) * u, a = a0 + (a1 - a0) * s, px = cx + dir * Math.cos(a) * r, py = cy + Math.sin(a) * ry, tx = -dir * Math.sin(a) * r, ty = Math.cos(a) * ry, l = Math.hypot(tx, ty) || 1,
      w = 0.17 * Math.sin(Math.PI * s) ** 0.7 * Math.sin(Math.PI / 2 * Math.min(1, Math.min(u, 1 - u) / 0.3)) ** 0.7, nx = -ty / l * w, ny = tx / l * w, o = i * 6;
      pos[o] = px - nx; pos[o + 1] = py - ny; pos[o + 2] = 0.8; pos[o + 3] = px + nx; pos[o + 4] = py + ny; pos[o + 5] = 0.8; } g.attributes.position.needsUpdate = true; g.computeBoundingSphere(); };
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: FX.bandTex ||= bandTex(), color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; this.scene.add(m);
    // the head runs the arc in SWEEP; the tail follows from 0.07 s and catches it at END, while the trace fades out over FADE
    let t = 0; const tick = () => { t += FDT; const head = Math.min(1, t / SWEEP), tail = Math.min(head, Math.max(0, (t - 0.07) / (END - 0.07))); m.visible = t < END && head - tail > 0.02; if (m.visible) lay(tail, head); m.position.x = dir * 0.2 * Math.min(1, t / END); m.material.opacity = 0.5 * Math.min(1, Math.max(0, (END - t) / FADE));
      if (t < END) nextTick(tick); else { this.scene.remove(m); g.dispose(); m.material.dispose(); } }; tick(); }
  // the scythe's hook: a smooth soft line from the blade to the foe that snaps taut, then reels in toward the hero, a hook glyph at its end
  hook(a, b, col = 0xc8f0c0) { const mat = new THREE.MeshBasicMaterial({ map: FX.bandTex ||= bandTex(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), m = new THREE.Mesh(new THREE.BufferGeometry(), mat), hk = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 5, 12, Math.PI * 1.3), mat); this.scene.add(m, hk);
    const build = (bx, by, sag) => { const n = 16, P = [], U = [], idx = [], mx = (a.x + bx) / 2, my = (a.y + by) / 2 - sag; for (let i = 0; i <= n; i++) { const t = i / n, x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * bx, y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * by, dx = 2 * (1 - t) * (mx - a.x) + 2 * t * (bx - mx), dy = 2 * (1 - t) * (my - a.y) + 2 * t * (by - my), l = Math.hypot(dx, dy) || 1, nx = -dy / l * 0.07, ny = dx / l * 0.07; P.push(x - nx, y - ny, 0.7, x + nx, y + ny, 0.7); U.push(t, 0, t, 1); if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
      m.geometry.dispose(); m.geometry = new THREE.BufferGeometry(); m.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); m.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); m.geometry.setIndex(idx); hk.position.set(bx, by, 0.7); hk.rotation.z = Math.atan2(by - a.y, bx - a.x) + Math.PI * 0.6; };
    let t = 0; const tick = () => { t += FDT; const reel = Math.max(0, (t - 0.06) / 0.2), bx = b.x + (a.x - b.x) * reel * 0.6, by = b.y + (a.y - b.y) * reel * 0.6; build(bx, by, t < 0.06 ? 0.4 * (1 - t / 0.06) : 0); mat.opacity = Math.max(0, 1 - Math.max(0, reel - 0.6) * 2.5); if (t < 0.32) nextTick(tick); else { this.scene.remove(m, hk); m.geometry.dispose(); hk.geometry.dispose(); mat.dispose(); } }; tick(); }
  // speed lines behind a charging body
  streaks(e, n = 2, col = 0xff8a60) { for (let i = 0; i < n; i++) this.streak(e.pos.x - e.facing * rnd(0.4, 1.4), e.pos.y + rnd(0.3, Math.min(3, e.T.h) * 0.85), -e.facing, rnd(1.4, 3.2), col, 0.06, 0.5); }
  // the floor splits where something heavy landed: a crack decal that glows a moment and fades
  cracks(x, fy, r = 2.5, col = 0x201810, wall = false) {
    const m = new THREE.Mesh(FX.ringGeo ||= new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ alphaMap: crackAlpha(), color: col, transparent: true, opacity: 0.95, depthWrite: false, blending: col > 0x404040 ? THREE.AdditiveBlending : THREE.NormalBlending }));
    if (!wall) m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6.28; m.position.set(x, fy + (wall ? 0 : 0.03), wall ? 1.9 : 0.4); m.scale.set(r, r, 1); this.scene.add(m); /* a wall takes the fracture face-on */
    let t = 0; const tick = () => { t += FDT; m.material.opacity = 0.95 * Math.min(1, Math.max(0, (2.2 - t) / 0.8)); if (t < 2.2) nextTick(tick); else { this.scene.remove(m); m.material.dispose(); } }; tick();
  }
  // a line attack's telegraph: one glowing crack runs along the floor from x0 to x1 in `dur`, then fades as the line erupts
  crackLine(x0, x1, fy, col, dur = 0.5, life = 1.2) {
    const len = Math.abs(x1 - x0), dir = Math.sign(x1 - x0) || 1, m = new THREE.Mesh(FX.lineGeo ||= (() => { const p = new THREE.PlaneGeometry(1, 1); p.translate(0.5, 0, 0); return p; })(), new THREE.MeshBasicMaterial({ map: FX.lineTex ||= lineCrackTex(), color: col, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x0, fy + 0.04, 0.6); m.scale.set(0.01 * dir, 0.9, 1); this.scene.add(m);
    let t = 0; const tick = () => { t += FDT; m.scale.x = dir * len * Math.min(1, t / dur); m.material.opacity = 0.95 * Math.min(1, Math.max(0, (life - t) / 0.4)) * (0.8 + Math.sin(t * 30) * 0.2); if (t < life) nextTick(tick); else { this.scene.remove(m); m.material.dispose(); } }; tick();
    for (let i = 0; i < 6; i++) this.spawn(x0 + dir * Math.random() * len, fy + 0.1, 0.6, 0, rnd(0.5, 1.5), col, 0.5, 0.15, 0);
  }
  // a thrust's flash: a tapered white streak that shoots ahead of the point and is gone in a blink
  streak(x, y, dir, len = 1.4, col = 0xdfe8ff, hgt = 0.16, op = 1, ang = 0) {
    const m = new THREE.Mesh(FX.streakGeo ||= (() => { const g = new THREE.PlaneGeometry(1, 1); g.translate(0.5, 0, 0); return g; })(), new THREE.MeshBasicMaterial({ map: FX.streakTex ||= streakTex(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y, 0.7); m.rotation.z = ang; m.scale.set(dir * 0.2, hgt, 1); this.scene.add(m);
    let t = 0; const tick = () => { t += FDT; const k = Math.min(1, t / 0.14); m.scale.set(dir * len * (0.3 + 0.7 * Math.sqrt(k)), hgt * (1 - k * 0.6), 1); m.material.opacity = op * (1 - k * k); if (k < 1) nextTick(tick); else { this.scene.remove(m); m.material.dispose(); } }; tick();
  }
  // sparks: thin quads that fly along their velocity and are gone in a fifth of a second (round glows stay for embers);
  // given a direction (±1) they spray in a ±35° cone along it, the way the blow travelled
  sparks(x, y, col = 0xffe8c0, n = 8, sp = 7, dir = 0) { this.sparkL ||= []; for (let i = 0; i < n; i++) { if (this.sparkL.length > 120) break; const a = dir ? (dir > 0 ? 0 : Math.PI) + rnd(-0.61, 0.61) : Math.random() * 6.28, v = sp * rnd(0.5, 1.1), m = new THREE.Mesh(FX.sparkGeo ||= new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: FX.bandTex ||= bandTex(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(x, y, 0.9); this.scene.add(m); this.sparkL.push({ m, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.15, 0.25), max: 0.25 }); } }
  update(dt) {
    if (this.sparkL?.length) { for (const s of this.sparkL) { s.life -= dt; s.vy -= 9 * dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.rotation.z = Math.atan2(s.vy, s.vx); const k = Math.max(0, s.life / s.max); s.m.scale.set(0.4 * (0.4 + k * 0.6), 0.04, 1); s.m.material.opacity = k; } this.sparkL = this.sparkL.filter(s => { if (s.life > 0) return true; this.scene.remove(s.m); s.m.material.dispose(); return false; }); }
    for (const p of this.parts) { p.life -= dt; p.vy -= p.grav * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; const k = Math.max(0, p.life / p.max); p.s.material.opacity = k; p.s.scale.setScalar(p.size * (0.5 + k * 0.5)); }
    this.parts = this.parts.filter(p => { if (p.life > 0) return true; p.s.visible = false; this.free.push(p.s); return false; });
  }
}

// a long jagged crack for crackLine: bright core, branching hairlines
let _lineC; function lineCrackTex() {
  if (_lineC) return _lineC; const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineCap = 'round';
  let y = 32; g.lineWidth = 4; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 12) { y = Math.max(14, Math.min(50, y + (Math.random() - 0.5) * 14)); g.lineTo(x, y); if (Math.random() < 0.3) { g.save(); g.lineWidth = 1.5; g.moveTo(x, y); g.lineTo(x + rnd(8, 20), y + rnd(-14, 14)); g.restore(); g.moveTo(x, y); } } g.stroke();
  _lineC = new THREE.CanvasTexture(c); _lineC.colorSpace = THREE.SRGBColorSpace; return _lineC;
}
// branching cracks radiating from a point, as an alpha map
let _crackA; function crackAlpha() {
  if (_crackA) return _crackA; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#fff'; g.lineCap = 'round';
  const br = (x, y, a, len, w) => { if (len < 4 || w < 0.4) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, a + (Math.random() - 0.5) * 0.9, len * 0.72, w * 0.72); if (Math.random() < 0.45) br(x2, y2, a + (Math.random() < 0.5 ? 0.8 : -0.8), len * 0.55, w * 0.6); };
  for (let i = 0; i < 7; i++) br(64, 64, i / 7 * 6.28 + Math.random() * 0.5, 14 + Math.random() * 10, 3);
  const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _crackA = new THREE.CanvasTexture(c); return _crackA;
}
// colours of the elements that are not damage types: stone teeth, bone teeth and cistern water
const EXTRA_COL = { stone: 0xe0a060, bone: 0xf0e0c0, water: 0x8ad0ff };
// how wide a great foe looks side-on (tail, wings, necks), not its hitbox T.w: twice the model's farthest reach from its pivot,
// measured once at load in the facing-right pose, so either facing is covered. The boss camera (cam) frames this.
const _vb = new THREE.Box3(), _vp = new THREE.Vector3();
function visWidth(e) {
  const m = e.model, T = e.T, y0 = m.rotation.y; m.rotation.y = Math.PI / 2 - (T.quad ? 0.22 : 0.42); e.root.updateWorldMatrix(true, true);
  _vb.setFromObject(m); const x = e.root.getWorldPosition(_vp).x; m.rotation.y = y0; e.root.updateWorldMatrix(false, true);
  return isFinite(_vb.min.x) && isFinite(_vb.max.x) ? THREE.MathUtils.clamp(2 * Math.max(_vb.max.x - x, x - _vb.min.x), T.w, 16) : T.w;
}
// what a shockwave tears up as it runs: smoke behind fire, frost mist behind ice, murk behind poison, plain dust otherwise
const SHOCK_DUST = { fire: 0x3a2a20, ice: 0xd0e4f0, poison: 0x3a4a28, lightning: 0x6a6a7a, shadow: 0x2a2030 };
// a spider's net: radial strands and rings
let _net; function netTex() {
  if (_net) return _net; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.lineCap = 'round';
  const sp = Array.from({ length: 11 }, (_, i) => i / 11 * 6.28 + rnd(-0.18, 0.18)), len = sp.map(() => rnd(48, 63)); /* irregular spokes */
  g.strokeStyle = 'rgba(200,212,232,0.7)'; g.lineWidth = 1.6; sp.forEach((a, i) => { g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * len[i], 64 + Math.sin(a) * len[i]); g.stroke(); });
  g.strokeStyle = 'rgba(190,204,228,0.55)'; g.lineWidth = 1.1; for (let r = 9; r < 60; r += rnd(6, 9)) { g.beginPath(); sp.forEach((a, i) => { const b = sp[(i + 1) % sp.length] + (i === sp.length - 1 ? 6.28 : 0), rr = Math.min(r, len[i]), r2 = Math.min(r, len[(i + 1) % sp.length]), x0 = 64 + Math.cos(a) * rr, y0 = 64 + Math.sin(a) * rr, x1 = 64 + Math.cos(b) * r2, y1 = 64 + Math.sin(b) * r2, m = (a + b) / 2, sag = r * 0.82; if (!i) g.moveTo(x0, y0); g.quadraticCurveTo(64 + Math.cos(m) * sag, 64 + Math.sin(m) * sag, x1, y1); }); g.stroke(); } /* the spiral sags between spokes */
  _net = new THREE.CanvasTexture(c); _net.colorSpace = THREE.SRGBColorSpace; return _net;
}
// a column of light, flame or water: bright at the root, ragged and fading toward the top, soft at the sides
function colTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const v = g.createLinearGradient(0, 128, 0, 0); v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.55, 'rgba(255,255,255,0.75)'); v.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = v; g.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.3})`; g.fillRect(Math.random() * 64, Math.random() * 90, 2 + Math.random() * 5, 8 + Math.random() * 30); } // licks and gaps
  g.globalCompositeOperation = 'destination-in'; const hgr = g.createLinearGradient(0, 0, 64, 0); hgr.addColorStop(0, 'rgba(0,0,0,0)'); hgr.addColorStop(0.5, 'rgba(0,0,0,1)'); hgr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hgr; g.fillRect(0, 0, 64, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// thrust streak: bright at the point end, fading back toward the hand, soft above and below
function streakTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  const h = g.createLinearGradient(0, 0, 128, 0); h.addColorStop(0, 'rgba(255,255,255,0)'); h.addColorStop(0.75, 'rgba(255,255,255,0.8)'); h.addColorStop(0.95, 'rgba(255,255,255,1)'); h.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = h; g.fillRect(0, 0, 128, 32); g.globalCompositeOperation = 'destination-in'; const v = g.createLinearGradient(0, 0, 0, 32); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.5, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = v; g.fillRect(0, 0, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// streaming wind for the cyclone: soft diagonal streaks that tile
function windTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 22; i++) { const x = Math.random() * 128, y = Math.random() * 128, l = rnd(20, 60), gr = g.createLinearGradient(x, y, x + l, y - l * 0.35); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${rnd(0.3, 0.9)})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = rnd(1, 3); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y - l * 0.35); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a feather: quill and vane, pale with a dark tip
function featherTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 48; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, '#f4eee0'); gr.addColorStop(0.75, '#d8d0c0'); gr.addColorStop(1, '#4a4440'); g.fillStyle = gr;
  g.beginPath(); g.moveTo(6, 24); g.quadraticCurveTo(60, 2, 124, 20); g.lineTo(124, 28); g.quadraticCurveTo(60, 46, 6, 24); g.fill();
  g.strokeStyle = 'rgba(120,110,100,0.6)'; g.lineWidth = 1; for (let x = 20; x < 120; x += 7) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x + 6, 10 + Math.random() * 3); g.moveTo(x, 24); g.lineTo(x + 6, 38 - Math.random() * 3); g.stroke(); }
  g.strokeStyle = '#fffaf0'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 24); g.lineTo(126, 24); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a grimoire page: lines of violet glyphs on old paper
function glyphTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 80; const g = c.getContext('2d'); g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, 64, 80); g.strokeStyle = '#7a3ac8'; g.lineWidth = 1.6;
  for (let row = 8; row < 76; row += 8) for (let x = 6; x < 58; x += rnd(5, 9)) { g.beginPath(); const h = rnd(3, 6); g.moveTo(x, row); g.lineTo(x + rnd(-2, 2), row - h); if (Math.random() < 0.5) { g.moveTo(x - 2, row - h / 2); g.lineTo(x + 2, row - h / 2); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// across a bolt: a gaussian falloff, so the glow has no hard edge
function bandTex() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 32; const g = c.getContext('2d'); for (let y = 0; y < 32; y++) { const v = (y + 0.5) / 32 - 0.5, a = Math.exp(-(v * v) / 0.035); g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; g.fillRect(0, y, 4, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// three reads an alphaMap from the green channel: bake a canvas's alpha into opaque grey
function maskTex(c) { const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data; for (let i = 0; i < d.length; i += 4) { const a = d[i + 3]; d[i] = d[i + 1] = d[i + 2] = a; d[i + 3] = 255; } g.globalCompositeOperation = 'source-over'; g.putImageData(im, 0, 0); return new THREE.CanvasTexture(c); }
// the fire column's silhouette: soft sides, a ragged crown of three to five tongues, faded at the top (static: never scrolled)
function flameMaskTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'), v = g.createLinearGradient(0, 128, 0, 0); v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.55, 'rgba(255,255,255,0.85)'); v.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = v; g.fillRect(0, 0, 64, 128);
  g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.moveTo(0, 128); const n = 3 + (Math.random() * 3 | 0); for (let i = 0; i <= n; i++) { const x = (i + 0.5) / (n + 1) * 64, tip = rnd(4, 34); g.quadraticCurveTo(x - 9, 64, x, tip); g.quadraticCurveTo(x + 9, 64, (i + 1) / (n + 1) * 64, 84); } g.lineTo(64, 128); g.closePath(); g.fill();
  const hg = g.createLinearGradient(0, 0, 64, 0); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.3, 'rgba(0,0,0,1)'); hg.addColorStop(0.7, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hg; g.fillRect(0, 0, 64, 128);
  return maskTex(c);
}
// rising strokes that tile seamlessly top to bottom (each stroke is drawn again one tile up and down)
function strokeTileTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); g.lineCap = 'round';
  for (let i = 0; i < 34; i++) { const x = rnd(4, 60), y = rnd(0, 128), l = rnd(26, 60), w = rnd(1.5, 5.5), a = rnd(0.2, 0.65), d1 = rnd(-9, 9), d2 = -d1 * rnd(0.6, 1.2), d3 = rnd(-5, 5); for (const oy of [-128, 0, 128]) { const gr = g.createLinearGradient(0, y + oy + l, 0, y + oy); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = w; g.beginPath(); g.moveTo(x, y + oy + l); g.bezierCurveTo(x + d1, y + oy + l * 0.66, x + d2, y + oy + l * 0.33, x + d3, y + oy); g.stroke(); } } /* each stroke sways in an S, a lick rather than a bar */
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// flame column: soft vertical strokes (no hard rectangles) that rise into three to five licking tongues
function flameColTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) { const x = rnd(8, 56), w = rnd(3, 9), top = rnd(10, 70), gr = g.createLinearGradient(0, 128, 0, top); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = w; g.lineCap = 'round'; g.globalAlpha = rnd(0.25, 0.6); g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + rnd(-6, 6), (128 + top) / 2, x + rnd(-4, 4), top); g.stroke(); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.moveTo(0, 128); const n = 3 + (Math.random() * 3 | 0); for (let i = 0; i <= n; i++) { const x = (i + 0.5) / (n + 1) * 64, tip = rnd(6, 40); g.quadraticCurveTo(x - 10, 70, x, tip); g.quadraticCurveTo(x + 10, 70, (i + 1) / (n + 1) * 64, 90); } g.lineTo(64, 128); g.closePath(); g.fill(); /* the crown splits into tongues */
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// water column body: a soft translucent shaft that dissolves at the top
function waterColTex() { /* used as an alphaMap: the body's silhouette */
  const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d'), v = g.createLinearGradient(0, 128, 0, 0); v.addColorStop(0, 'rgba(255,255,255,0.95)'); v.addColorStop(0.7, 'rgba(255,255,255,0.7)'); v.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = v; g.fillRect(0, 0, 32, 128);
  g.globalCompositeOperation = 'destination-in'; const hg = g.createLinearGradient(0, 0, 32, 0); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.25, 'rgba(0,0,0,1)'); hg.addColorStop(0.75, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hg; g.fillRect(0, 0, 32, 128);
  return maskTex(c);
}
// white streaks that run up a water column's edges
function streakColTex() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d'); g.lineCap = 'round';
  for (let i = 0; i < 10; i++) { const x = i % 2 ? rnd(2, 9) : rnd(23, 30), gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = rnd(1, 2.5); g.beginPath(); g.moveTo(x, 128); g.lineTo(x + rnd(-2, 2), rnd(0, 50)); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// spike geometry by element, built once: jittered stone shards, curled bone tusks, hexagonal ice prisms, thin thorns
function spikeKit() {
  const tint = (geo, lo) => { const p = geo.attributes.position, col = []; for (let j = 0; j < p.count; j++) { const v = lo + (1 - lo) * Math.min(1, Math.max(0, p.getY(j))); col.push(v, v, v); } geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals(); return geo; };
  const shard = () => { const c = new THREE.ConeGeometry(1, 1, 4 + (Math.random() < 0.5 ? 1 : 0), 2); c.translate(0, 0.5, 0); const p = c.attributes.position; for (let j = 0; j < p.count; j++) { const y = p.getY(j); if (y < 0.99) { p.setX(j, p.getX(j) * rnd(0.7, 1.3)); p.setZ(j, p.getZ(j) * rnd(0.7, 1.3)); } else p.setX(j, rnd(-0.2, 0.2)); } return tint(c.toNonIndexed(), 0.25); };
  const tusk = (bend) => { const c = new THREE.ConeGeometry(1, 1, 8, 8); c.translate(0, 0.5, 0); const p = c.attributes.position; for (let j = 0; j < p.count; j++) { const y = p.getY(j), bulge = 1 + 0.3 * Math.exp(-((y - 0.28) ** 2) / 0.006); p.setX(j, p.getX(j) * bulge + bend * y * y); p.setZ(j, p.getZ(j) * bulge); } return tint(c, 0.35); };
  const prism = () => tint(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.55, 0.02), new THREE.Vector2(0.5, 0.72), new THREE.Vector2(0.001, 1)], 6), 0.55);
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, ...o });
  return {
    stone: { geos: [shard(), shard(), shard(), shard()], mat: std({ color: 0x8a8278 }), r: 0.26, lean: [0.26, 0.5] },
    bone: { geos: [tusk(0.45), tusk(0.7), tusk(0.3)], mat: std({ color: 0xf0e4c8, emissive: 0x1a1610, flatShading: false, roughness: 0.6 }), r: 0.16, lean: [0.05, 0.25] },
    ice: { geos: [prism(), prism()], mat: std({ color: 0xd8f2ff, emissive: 0x3a7aa0, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.82 }), r: 0.3, lean: [0.15, 0.45] },
    poison: { geos: [tusk(0.5), tusk(0.8)], mat: std({ color: 0x3e4a24, emissive: 0x0a1404 }), r: 0.11, lean: [0.2, 0.6] },
  };
}
// a telegraph sigil: a thin ring, eight ticks and an inner glyph
function sigilTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineCap = 'round';
  g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 58, 0, 6.283); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(64, 64, 49, 0, 6.283); g.stroke();
  g.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; g.beginPath(); g.moveTo(64 + Math.cos(a) * 49, 64 + Math.sin(a) * 49); g.lineTo(64 + Math.cos(a) * (i % 2 ? 42 : 36), 64 + Math.sin(a) * (i % 2 ? 42 : 36)); g.stroke(); }
  g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 3; i++) { const a = i / 3 * 6.283 - 1.571; g[i ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * 24, 64 + Math.sin(a) * 24); } g.stroke(); g.beginPath(); for (let i = 0; i <= 3; i++) { const a = i / 3 * 6.283 + 1.571; g[i ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * 24, 64 + Math.sin(a) * 24); } g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// soft ring for FX.ring: a bright thin rim with a faint inner wash
function ringTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.86, 'rgba(255,255,255,0)'); gr.addColorStop(0.92, 'rgba(255,255,255,1)'); gr.addColorStop(0.97, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); // a thin rim, no soap-bubble wash
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a shockwave's crest: a front of force leaning into its travel (+x), hot along its leading edge, torn into rising licks, soft at the crown
function crestTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), body = g.createLinearGradient(0, 0, 128, 0);
  body.addColorStop(0, 'rgba(255,255,255,0)'); body.addColorStop(0.5, 'rgba(255,255,255,0.28)'); body.addColorStop(0.85, 'rgba(255,255,255,0.95)'); body.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = body; g.beginPath(); g.moveTo(0, 128); g.bezierCurveTo(46, 124, 76, 72, 96, 22); g.quadraticCurveTo(108, 6, 117, 28); g.quadraticCurveTo(124, 80, 121, 128); g.closePath(); g.fill();
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 16; i++) { const x = rnd(48, 118), top = rnd(18, 90), gr = g.createLinearGradient(0, 128, 0, top); gr.addColorStop(0, `rgba(255,255,255,${rnd(0.2, 0.5).toFixed(2)})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = rnd(2, 5); g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + rnd(-6, 2), (128 + top) / 2, x + rnd(-10, 4), top); g.stroke(); } /* licks, not a slab */
  g.globalCompositeOperation = 'destination-in'; const v = g.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.3, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = v; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// the Hydra's tide, rolling +x: a low swell behind rising to a face that curls over at the lip; deep at the foot, glassy at the crest
function waveTex(foam) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  const shape = () => { g.beginPath(); g.moveTo(0, 128); g.bezierCurveTo(40, 120, 70, 60, 88, 22); g.quadraticCurveTo(104, 2, 124, 16); g.quadraticCurveTo(110, 18, 108, 36); g.quadraticCurveTo(116, 84, 120, 128); g.closePath(); };
  if (!foam) { const v = g.createLinearGradient(0, 128, 0, 0); v.addColorStop(0, 'rgba(255,255,255,0.95)'); v.addColorStop(0.7, 'rgba(255,255,255,0.6)'); v.addColorStop(1, 'rgba(255,255,255,0.35)'); g.fillStyle = v; shape(); g.fill();
    g.globalCompositeOperation = 'destination-in'; const h = g.createLinearGradient(0, 0, 128, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.35, 'rgba(0,0,0,1)'); g.fillStyle = h; g.fillRect(0, 0, 128, 128); }
  else { g.lineCap = 'round'; for (const [w, a] of [[9, 0.25], [5, 0.45], [2.5, 0.95]]) { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(60, 74); g.bezierCurveTo(70, 60, 80, 40, 88, 22); g.quadraticCurveTo(104, 2, 124, 16); g.quadraticCurveTo(110, 18, 108, 36); g.stroke(); } /* the white lip, soft-edged (ctx.filter is missing on older Safari) */
    for (let i = 0; i < 26; i++) { const x = rnd(96, 126), y = rnd(4, 46); g.fillStyle = `rgba(255,255,255,${rnd(0.3, 0.9).toFixed(2)})`; g.beginPath(); g.arc(x, y, rnd(0.8, 2.4), 0, 6.283); g.fill(); } /* spray off the crest */
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 6; i++) { const x = rnd(100, 118); g.beginPath(); g.moveTo(x, 128); g.lineTo(x + rnd(-3, 3), rnd(50, 90)); g.stroke(); } } /* streaks down the face */
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const SHOT = { // look of each missile: colour, size, trail
  bolt: [0xff7a30, 0.55], orb: [0xb060ff, 0.7], skull: [0x9affb0, 0.7], feather: [0xe8e0d0, 0.35], gust: [0xc0d8ff, 0.8], book: [0xd0a060, 0.5], bone: [0xe8e0c8, 0.4], lob: [0x8aff5a, 0.55], acid: [0x8aff5a, 0.6],
  web: [0xf0f0ff, 0.6], ember: [0xff8a20, 0.6], fireball: [0xff7a28, 0.9], meteor: [0xff6a20, 1.0], net: [0xf0f0ff, 0.9], slag: [0xff6a14, 0.75], rock: [0x9a8a78, 0.6], shard: [0xbfeaff, 0.35], wisp: [0xb070ff, 0.65], crescent: [0xff5040, 1.0], arrow: [0xfff0c0, 0.3], boomerang: [0xffe090, 0.5], pcrescent: [0x9ab0ff, 1.0], bat: [0xb070ff, 0.45], star: [0xfff8c0, 0.9], orbit: [0xffe090, 0.5],
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
    this.grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, time: { value: 0 }, aspect: { value: 16 / 9 }, warm: { value: 0 }, dark: { value: 0 }, lift: { value: new THREE.Vector3(0.012, 0.016, 0.034) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time, aspect, warm, dark; uniform vec3 lift; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          c.rgb = mix(vec3(l), c.rgb, 0.86);                                                     // a little desaturation
          vec3 hi = mix(vec3(1.03, 1.0, 0.94), vec3(1.06, 0.98, 0.88), warm);
          c.rgb = c.rgb * mix(vec3(0.97, 0.98, 1.04), hi, smoothstep(0.25, 0.85, l)) + lift * (1.0 - smoothstep(0.0, 0.35, l)); // cold shadows, warm light
          vec2 d = vUv - 0.5; d.x *= aspect; c.rgb *= mix(0.6, 1.0, smoothstep(0.98, 0.34, length(d)));                         // vignette
          c.rgb *= mix(1.0, 0.4 + 0.6 * smoothstep(0.4, 0.9, l), dark);                                                      // an eclipse: only what burns stays bright
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
    this.loot = []; this.shots = []; this.waves = []; this.erupts = []; this.suns = []; this.cyclones = []; this.blacks = []; this.clouds = []; this.seals = []; this.visited = new Set(); this.flags = {};
    this.camPos = new THREE.Vector2(); this.camZ = CAMZ; this.stopT = 0; this.time = 0; this.playTime = 0;
    this.trauma = 0; this.shT = 0; this.shAx = 0; this.shAy = 1; this.shAn = 0.4; this.kick = { x: 0, y: 0, vx: 0, vy: 0 }; // camera shake: trauma, its axis and a sprung kick
    this.slain = new Set(); this.purse = null; this.pops = []; this.popFree = []; // foes already killed once (they come back poorer), the purse lost on death, lava bubbles
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
        try { await e.load(); if (e.boss) e.visW = visWidth(e); room.enemies.push(e); } catch (err) { console.warn('enemy', spec.t, err); }
      }));
      await Promise.all((room.horde ||= hordeSpecs(room, LOW_MEM)).map(async (spec, i) => { // the room's company (horde.js): more foes, all of them easy
        const e = new Enemy(this, spec, room); e.key = `horde:${def.id}:${i}`;
        try { await e.load(); room.enemies.push(e); } catch (err) { console.warn('enemy', spec.t, err); }
      }));
      def.chests.forEach((c, i) => room.chests.push(this.makeChest(room, c, i)));
      this.placeItems(room);
      room.cracks.forEach((s, i) => { s.key = `crack:${def.id}:${i}`; if (this.flags[s.key]) { s.gone = true; s.mesh.visible = false; } else if ((s.dmg = this.flags[s.key + ':d'] || 0) && s.decal) { s.decal.material.opacity = Math.min(1, 0.6 + s.dmg * 0.2); s.decal.scale.setScalar(1 + s.dmg * 0.12); } }); // a half-broken seal stays half-broken
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
    for (const L of this.loot) L.room.group?.remove(L.grp); this.loot = []; this.purse = null; this.slain.clear();
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
      if (it.pedestal && !(it.unique && it.altar) && !room.peds.has(key)) { room.peds.add(key); this.pedestal(room, room.b.x0 + it.x, room.b.y0 + (it.y ?? FLOOR), it.altar, it.tutorial); }
      if (!this.flags[key] && !this.loot.some(L => L.key === key)) this.spawnPlaced(room, it, key);
    });
    this.placePurse(room);
  }
  // the gold lost on death lies where the pilgrim fell until it is picked up (or lost for good on the next death)
  placePurse(room) {
    const p = this.purse; if (!p || p.room !== room.def.id || !room.group || this.loot.some(L => L.item.purse)) return;
    this.dropLoot(p.x, p.y, { gold: p.gold, purse: true }, room, null, true);
  }
  async spawnPlaced(room, it, key) {
    const x = room.b.x0 + it.x, y = room.b.y0 + (it.y ?? FLOOR);
    const item = it.gem ? makeGem(it.gem) : it.up ? { up: it.up } : it.potion ? { potion: true } : it.gold ? { gold: it.gold } : it.unique ? makeUnique(it.unique) : it.tier ? tierItem(it.tier, it.rarity, it.slot) : makeItem(it.tutorial ? startWeapon() : it.base, { rarity: it.rarity, sockets: it.sockets }); // the Attack Viewer can swap the first weapon
    if (it.tutorial) return this.plantBlade(room, x, y + 1.02, item, key);
    if (it.unique && it.altar) return this.relicStand(room, x, y, item, key, it);
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
  // A relic is not loot: it stands on its altar (or a carved plinth) upright, in a shaft of its room's light, a gleam running up it
  async relicStand(room, x, y, item, key, it) {
    const alt = room.def.props.find(p => p.t === 'altar' && Math.abs(p.x - it.x) < 1.6), b = BASES[item.base], col = it.glow || 0xffd8a0, upright = b.kind === 'staff' || b.kind === 'scythe';
    let top = y, z = -0.6;
    if (alt) { top = room.b.y0 + (alt.y ?? FLOOR) + 1.03; z = -2.2; }
    else if (!room.peds.has(key)) { room.peds.add(key); const m = surface('limestone_1', 1, 1, { dir: 'assets/game/tex/', tint: 0x6e665e }), g = new THREE.Group(); for (const [w, h, d, yy] of [[1.3, 0.26, 0.95, 0], [1.16, 0.07, 0.86, 0.26], [0.8, 0.6, 0.62, 0.33], [0.96, 0.07, 0.76, 0.93], [1.08, 0.13, 0.86, 1.0]]) { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.position.y = yy + h / 2; k.castShadow = k.receiveShadow = true; g.add(k); } g.position.set(x, y, -0.6); room.group.add(g); top = y + 1.13; } /* the castle's dressed stone, darker, with base and cap mouldings */
    else top = y + 1.13;
    const grp = new THREE.Group(); grp.position.set(x, top, z); room.group.add(grp);
    const L = { item, room, grp, x, y: top, key, bob: 0, placed: true, planted: true, relic: true, hover: upright, rise: it.rise, model: new THREE.Group() }; grp.add(L.model); this.loot.push(L);
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 9), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })); shaft.position.set(-0.6, 4, -0.6); shaft.rotation.z = -0.15; grp.add(shaft);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.01; grp.add(pool);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff6e8, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); glint.scale.set(0.09, 0.55, 1); L.model.add(glint); L.glint = glint;
    if (!b.model) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 28), new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 0.9, roughness: 0.25, emissive: 0x3a2808 })), gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), new THREE.MeshStandardMaterial({ color: 0x8a1a20, emissive: 0x501010, roughness: 0.2 })); gem.position.y = 0.26; ring.add(gem); ring.position.y = 0.45; L.model.add(ring); L.hover = true; L.len = 0.5; L.blade = new THREE.Box3(new THREE.Vector3(-0.25, 0.2, -0.05), new THREE.Vector3(0.25, 0.7, 0.05)); return L; } /* a ring is shown as a ring, turning slowly */
    try { const m = await weaponModel(b.model, b.scale * 1.3); const len = m.userData.len; if (upright) { m.position.y = 0.2; if (b.kind === 'scythe') m.rotation.y = Math.PI / 2; } else { m.rotation.z = Math.PI; m.position.y = len * 0.8; } L.model.add(m); L.len = len;
      m.traverse(o => { if (o.isMesh && o.material.emissive) { o.material.emissive.setHex(col); o.material.emissiveIntensity = 0.18; } });
      L.model.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m), inv = L.model.matrixWorld.clone().invert(); bb.applyMatrix4(inv); L.blade = bb;
    } catch (e) { console.warn(e); }
    return L;
  }
  // a relic taken: the moment is marked, and some rooms answer it
  relicTaken(L) {
    const P = this.player, it = L.item; this.slowMo(0.6); this.flash(); audio.play('title_bells', 0.45, 1.2); this.fx.burst(L.x, L.y + 0.8, 0xfff0d0, 36, 5); this.fx.ring(L.x, L.y + 0.6, 0xfff0d0, 6, true);
    this.ui.roomName(`RELIC  ·  ${it.name.toUpperCase()}`, 2800); setTimeout(() => this.ui.toast('A relic grows with you: rest at a coffin and it is re-forged to your strength.' + pick({ touch: '', kb: ' Equip it from the pack (I).', pad: ' Equip it from the pack ({MENU}).' }), 'unique'), 1400);
    if (L.rise) { audio.play('crowd_gasp', 0.4, 0.5); L.rise.forEach((x, i) => after(0.5 + i * 0.35, () => this.raise(L.room, x))); } // and the dead it was laid among get up
  }
  async raise(room, x) {
    if (this.room !== room) return; const s = new Enemy(this, { t: 'zombie', x, rise: true }, room); this.fx.burst(room.b.x0 + x, room.b.y0 + FLOOR + 0.5, 0x9aff9a, 14, 3);
    try { await s.load(); if (this.room === room) { s.awake = true; room.enemies.push(s); } else room.group.remove(s.root); } catch (err) { console.warn(err); }
  }
  // a rest re-forges every relic the hero carries to their strength (never below its own level)
  reforgeRelics() {
    const P = this.player, want = Math.min(30, P.stats.lvl - 3); let any = 0;
    for (const it of [...P.bag, ...Object.values(P.equip)]) if (it?.relic && (it.lvl || 0) < want) { it.lvl = want; any++; setTimeout(() => this.ui.toast(`${it.name} remembers its keeper — re-forged to level ${want}`, 'unique'), 600 + any * 900); }
    if (any) { P.refreshStats(); audio.play('firebuff_1', 0.4, 1.3); }
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
    const strong = item.up || item.purse || item.rarity === 'unique' || item.rarity === 'rare';
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.16, 2.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: strong ? 0.22 : 0.14, blending: THREE.AdditiveBlending, depthWrite: false })); // a marker, not the brightest thing in the room
    beam.position.y = 1.3; grp.add(beam);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.03; grp.add(pool);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); glow.scale.setScalar(strong ? 1.4 : 0.9); glow.position.y = 0.55; glow.material.opacity = 0.6; grp.add(glow);
    let model = new THREE.Group();
    const gemMat = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.15 });
    if (item.base && BASES[item.base]?.model) { weaponModel(BASES[item.base].model, BASES[item.base].scale * 0.8).then(m => { m.rotation.z = Math.PI / 2.4; model.add(m); }).catch(() => {}); }
    else if (item.gem) model = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), gemMat(col));
    else if (item.up) { model = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), gemMat(col)); model.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 20), new THREE.MeshStandardMaterial({ color: 0xd0b060, metalness: 1, roughness: 0.3 }))); }
    else if (item.potion) model = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0xa0102a, emissive: 0x500010, roughness: 0.1, transparent: true, opacity: 0.85 }));
    else if (item.purse) { model = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ color: 0x6a4424, roughness: 0.85, emissive: 0x2a1404 })); model.scale.set(1, 0.85, 1); const tie = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 14), new THREE.MeshStandardMaterial({ color: 0xffc840, metalness: 1, roughness: 0.3, emissive: 0x402000 })); tie.rotation.x = Math.PI / 2; tie.position.y = 0.2; model.add(tie); glow.scale.setScalar(2.2); L.pulse = glow; } // your own purse: leather and a gold tie, a slow beacon
    // a coin: half metal (a full mirror reflected the dark hall and read as a black disc in its beam) with a warm glow of its own,
    // stood face-on and turned slowly about the vertical (YXZ: the spin is about world Y, not the coin's own axis), so its face catches the light
    else if (item.gold) { model = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14), new THREE.MeshStandardMaterial({ color: 0xffc840, metalness: 0.5, roughness: 0.3, emissive: 0x8a5a10, emissiveIntensity: 0.6 })); model.rotation.order = 'YXZ'; model.rotation.x = Math.PI / 2; L.spin = 1.1; }
    else model = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: col }));
    model.position.y = 0.55; grp.add(model); L.model = model;
    this.loot.push(L); return L;
  }

  updateLoot(dt) {
    const P = this.player;
    for (const L of this.loot) {
      if (L.room !== this.room) continue;
      if (L.planted) { L.bob += dt; if (L.hover) { L.model.position.y = Math.sin(L.bob * 1.6) * 0.07; if (L.len === 0.5) L.model.rotation.y += dt * 0.9; } if (L.glint && L.blade) { const u = (L.bob * 0.45) % 1, B = L.blade; L.glint.position.set((B.min.x + B.max.x) / 2, B.min.y + 0.15 + (B.max.y - B.min.y) * 0.62 * u, B.max.z + 0.02); L.glint.material.opacity = Math.sin(u * Math.PI) * 0.9; } }
      else { L.bob += dt * 2.4; L.model.position.y = 0.55 + Math.sin(L.bob) * 0.08; L.model.rotation.y += dt * (L.spin ?? 1.6); if (L.pulse) { L.pulse.material.opacity = 0.55 + Math.sin(L.bob * 1.3) * 0.3; if (per(0.12)) this.fx.spawn(L.grp.position.x + rnd(-0.3, 0.3), L.grp.position.y + 0.4, -0.4, 0, rnd(0.6, 1.2), 0xffd860, 0.8, 0.1, -0.3); } }
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
    if (it.purse) { this.purse = null; P.stats.gold += it.gold; audio.play('coins_gather_quick', 0.6, 0.85); this.ui.dmg(P.pos.x, P.pos.y + 2.1, `+${it.gold}g`, 'gold'); this.ui.toast(`You gather up your lost purse — ${it.gold} gold.`, 'rare'); this.fx.burst(P.pos.x, P.pos.y + 1, 0xffd860, 18, 3); return; } // your own coin: no gold-find bonus
    if (it.gold) { const g = Math.round(it.gold * (1 + (P.d.gold || 0) / 100)); P.stats.gold += g; audio.play('coins_gather_quick', 0.5); this.ui.dmg(P.pos.x, P.pos.y + 2.1, `+${g}g`, 'gold'); return; } // coin has its own number style (not a lightning hit)
    if (it.potion) { if (P.stats.potions >= this.potionCap()) { P.heal(Math.round(P.stats.hpMax * 0.25)); this.ui.toast('Your flasks are full — you drink it where you stand.', 'magic'); } else { P.stats.potions++; this.ui.toast(`Potion of Vigor (${P.stats.potions}/${this.potionCap()})`, 'magic'); } audio.play('heart_collect', 0.5); return; }
    if (it.up) { if (it.up === 'life') P.stats.lifeUp++; else P.stats.manaUp++; P.refreshStats(); P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax; audio.play('firebuff_1', 0.6); this.flash(); this.fx.burst(P.pos.x, P.pos.y + 1, it.up === 'life' ? 0xff4060 : 0x5a80ff, 40, 5); this.ui.roomName(it.up === 'life' ? 'LIFE VESSEL — MAX LIFE UP' : 'MANA VESSEL — MAX MANA UP', 2600); return; }
    P.bag.push(it);
    if (it.gem) { audio.play('gem_collect', 0.6); this.ui.toast(`${GEMS[it.gem].name} — ${pick({ touch: 'open the pack and tap GEM', kb: 'open the pack (I) and press S', pad: 'open the pack ({MENU}) and press {X}' })} to socket it. Set it freely: a save coffin pries it out again.`, 'gem'); /* socketing is not a trap */ if (it.gem === 'ruby' && !this.flags.rubyHint) { this.flags.rubyHint = 1; setTimeout(() => this.ui.toast('A fire gem in a weapon will burn through blackthorn.', 'gem'), 1600); } }
    else { if (it.rarity === 'unique' || it.rarity === 'rare') this.feel('loot', it.rarity === 'unique' ? 1.4 : 1); audio.play(it.rarity === 'unique' ? 'firebuff_1' : it.rarity === 'rare' ? 'gem_collect' : it.rarity === 'magic' ? 'glass_ping_small' : 'weapon_pick_up', 0.6); this.ui.toast(`${it.rarity === 'unique' ? '★ ' : ''}${it.name}${it.echo ? ' — ' + ECHOES[it.echo].name : ''}`, it.rarity); if (BASES[it.base].slot === 'offhand' && !this.flags.shieldHint) { this.flags.shieldHint = 1; setTimeout(() => this.ui.toast(pick({ touch: 'Equip it from the pack, then HOLD the shield button to raise it', kb: 'Equip it (I), then HOLD L to raise the shield', pad: 'Equip it ({MENU}), then HOLD {LT} to raise the shield' }), 'magic'), 1200); }
      if (it.echo && BASES[it.base]?.slot === 'weapon' && !isRanged(BASES[it.base]) && !this.flags.artHint) { this.flags.artHint = 1; setTimeout(() => this.ui.toast(`An echo sleeps in this blade. Mana art: ${pick({ touch: 'up + ATTACK', kb: '↑ + J', pad: '{UP} + {X}' })}, ${ART_COST} MP.`, 'rare'), 1800); } } // the mana art is taught by the first weapon that has one
    if (L.relic) this.relicTaken(L);
    if (L.planted && BASES[it.base]?.slot === 'weapon' && !P.equip.weapon) { // drawn from the stone straight into the hand
      this.flags.equipHint = 1; P.equipItem('weapon', it); P.state = 'ring'; P.stateT = 0; P.ringDur = 1.1; P.vel.x = 0; this.slowMo(0.5); this.flash(); audio.play('firebuff_1', 0.5); this.fx.burst(L.x, L.y + 0.8, 0xc8d8ff, 30, 4); this.ui.roomName(it.name.toUpperCase(), 2200);
      this.tutorial = 'strike'; setTimeout(() => { if (this.tutorial === 'strike') this.ui.prompt(() => pick({ touch: 'Tap the sword button to strike — try the candles ahead', kb: 'J to strike — try the candles ahead', pad: '{X} to strike — try the candles ahead' })); }, 1300);
    } else if (it.base === startWeapon() && !this.flags.equipHint) { this.flags.equipHint = 1; this.ui.prompt(() => pick({ touch: `Open the pack and tap the ${it.name} to equip it`, kb: `Press I to open your pack, then Enter to equip the ${it.name}`, pad: `Press {MENU} to open your pack, then {A} to equip the ${it.name}` })); this.tutorial = 'equip'; }
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
      const item = c.unique ? makeUnique(c.unique) : c.gem ? makeGem(c.gem) : c.up ? { up: c.up } : c.gold ? { gold: c.gold } : c.potion ? { potion: true } : c.tier ? tierItem(c.tier, c.rarity, c.slot) : makeItem(c.base, { rarity: c.rarity, sockets: c.sockets });
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
    this.slowMo(1.4); this.flash(); audio.play('title_bells', 0.8); this.feel('bell'); audio.play('firebuff_1', 0.6);
    for (let i = 0; i < 5; i++) after(i * 0.22, () => { this.fx.ring(P.pos.x, P.pos.y + 1.2, B.color, 8 + i * 2); this.fx.burst(P.pos.x, P.pos.y + 1.2, B.color, 24, 6); });
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
    if (room.def.secret && !this.flags['secret:' + room.def.id]) { // a hidden room found: a bell-chime, a breath of light and the tally
      this.flags['secret:' + room.def.id] = true; const all = this.world.rooms.filter(r => r.def.secret).length, got = Object.keys(this.flags).filter(k => k.startsWith('secret:')).length;
      after(0.45, () => { audio.play('title_bells', 0.5, 1.3); audio.play('firebuff_1', 0.35, 1.4); this.ui.roomName(`SECRET FOUND  ·  ${got} / ${all}`, 3000); this.fx.ring(P.pos.x, P.pos.y + 1.2, 0xc8b0ff, 5); this.fx.burst(P.pos.x, P.pos.y + 1.2, 0xc8b0ff, 24, 3.5); });
    }
    for (const e of room.enemies) if (e.dead && !e.boss && !e.summoner) e.reset(); // the dead walk again, but poorer: this.slain marks them for the lean rollDrop table
    for (const bk of room.breakables) if (bk.broken && Math.random() < 0.6) { bk.broken = false; bk.again = true; bk.grp.visible = true; }
    this.applyBells(room);
    const T = room.theme; this.scene.fog.color.setHex(T.fog[0]); this.scene.fog.near = T.fog[1]; this.scene.fog.far = T.fog[2]; this.scene.background.setHex(T.sky === 'moon' ? 0x141a30 : T.sky === 'storm' ? 0x0c1018 : T.fog[0]);
    // indoors: a fill floor (hemi >= 0.55), the wing's hue lifted x1.6 (in sRGB) and a 0.3 moon floor, so no storey sinks to black
    const open = !!T.sky; this.amb = open ? T.amb : Math.max(0.55, T.amb * 1.3); this.hemi.intensity = this.amb; this.renderer.toneMappingExposure = T.expo || 1; /* the darkest halls carry their own exposure (world.js ROOM_T) */ const hue = HUE[room.def.theme] || [0x463e38, [0.012, 0.014, 0.018]]; this.hemi.color.setHex(open ? 0x8a90c0 : hue[0]); if (!open) this.hemi.color.convertLinearToSRGB().multiplyScalar(1.6).convertSRGBToLinear(); this.hemi.groundColor.setHex(open ? 0x201418 : 0x161014); this.grade.uniforms.lift.value.set(...(open ? [0.012, 0.016, 0.034] : hue[1])); this.backRim.intensity = open ? 1.8 : 0; /* indoors the back rim only painted the set cold */ this.moon.intensity = open ? T.moon * 0.85 : room.lancets ? Math.max(0.3, Math.min(0.5, T.moon * 0.7)) : 0.3; this.camFill.intensity = open ? 0.3 : 0.21; this.scene.environmentIntensity = open ? 0.2 : 0.12; this.grade.uniforms.warm.value = T.heat ? 1 : 0;
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
    for (const w of this.waves) this.endWave(w, true); this.waves = []; for (const p of this.pops) { p.s.visible = false; this.popFree.push(p.s); } this.pops.length = 0;
    for (const s of this.suns) this.scene.remove(s.m); this.suns = []; for (const c of this.cyclones) c.room.group.remove(c.g); this.cyclones = []; for (const b of this.blacks) this.scene.remove(b.m); this.blacks = []; for (const c of this.clouds) this.scene.remove(c.g); this.clouds = []; this.darken = 0;
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
    // the last safe footing (no lava, water or spikes underfoot): a purse lost to a hazard is laid there
    if (P.onGround && !P.inLava && !P.inWater && P.state !== 'dead' && !this.hazardAt(P.pos.x, P.pos.y + 0.05)) { const sf = this.safeAt ||= {}; sf.room = d.id; sf.x = P.pos.x; sf.y = P.pos.y; }
    this.lavaFx(dt); this.waterFx(P, d, b);
  }
  // molten rock lives: embers lift and wink out, crusted bubbles swell and burst, now and then a spurt of gobs leaps and falls back
  lavaFx(dt) {
    const busy = this.fx.parts.length > 450, amb = LOW_MEM ? 0.5 : 1;
    for (const lb of this.room.bubbles || []) { const k = lb.w / 4 * amb, x0 = lb.x, w = lb.w, y = lb.y;
      if (!busy && per(0.09 * k)) this.fx.spawn(x0 + Math.random() * w, y + 0.05, rnd(-1.2, 1.6), rnd(-0.3, 0.3), rnd(0.8, 2.2), Math.random() < 0.4 ? 0xffd070 : 0xff7a20, rnd(0.8, 1.6), rnd(0.06, 0.13), -0.5); // embers drift up
      if (!busy && per(0.02 * k)) this.fx.spawn(x0 + Math.random() * w, y + 0.3, rnd(-1.5, 0.5), rnd(-0.2, 0.2), rnd(0.4, 0.8), 0x2a1810, rnd(1.4, 2.2), rnd(0.7, 1.2), -0.15, false); // heat smoke
      if (this.pops.length < 8 && w > 0.8 && per(0.035 * k)) { let s = this.popFree.pop(); if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffa838, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); this.scene.add(s); }
        s.visible = true; s.position.set(x0 + rnd(0.3, w - 0.3), y, rnd(-1, 1.4)); s.scale.setScalar(0.05); this.pops.push({ s, t: 0, life: rnd(0.45, 0.9), size: rnd(0.35, 0.6) }); }
      if (!busy && per(0.006 * k)) { const sx = x0 + rnd(0.4, Math.max(0.5, w - 0.4)); for (let i = 0; i < 7; i++) this.fx.spawn(sx + rnd(-0.2, 0.2), y + 0.1, 0.3, rnd(-1.4, 1.4), rnd(3.5, 6.5), Math.random() < 0.3 ? 0xffe090 : 0xff6a14, rnd(0.6, 0.9), rnd(0.12, 0.2), 12); this.fx.spawn(sx, y + 0.2, 0.4, 0, 0, 0xffc060, 0.18, 1.3, 0); }
    }
    let j = 0; for (const p of this.pops) { p.t += dt; const k = p.t / p.life; p.s.scale.setScalar(p.size * (0.15 + 0.85 * k * k)); p.s.material.opacity = 0.45 + 0.55 * k;
      if (k < 1) { this.pops[j++] = p; continue; } // swelling; then it bursts: droplets and a breath of smoke
      p.s.visible = false; this.popFree.push(p.s); const { x, y, z } = p.s.position; for (let i = 0; i < 4; i++) this.fx.spawn(x, y + 0.05, z, rnd(-1.2, 1.2), rnd(1.5, 3.2), 0xffa040, rnd(0.4, 0.6), rnd(0.08, 0.14), 10); this.fx.spawn(x, y + 0.2, z, rnd(-0.2, 0.2), 0.6, 0x3a2418, 1.2, 0.5, -0.2, false); }
    this.pops.length = j;
  }
  // water answers the pilgrim: a crown splash in and out, a wake while wading, breath bubbles while sunk; the still surface glints and drips
  waterFx(P, d, b) {
    let surf = null; const lx = P.pos.x - b.x0, ly = P.pos.y - b.y0;
    for (const w of d.water) if (lx > w.x - 0.3 && lx < w.x + w.w + 0.3 && ly < w.y + w.h + 2.5 && ly + 2 > w.y) { surf = b.y0 + w.y + w.h; break; }
    const wet = !!P.inWater;
    if (this._wet !== undefined && wet !== this._wet && surf !== null) { const big = Math.min(1, 0.35 + Math.abs(P.vel.y) / 9), n = Math.round(8 + big * 12);
      for (let i = 0; i < n; i++) this.fx.spawn(P.pos.x + rnd(-0.45, 0.45), surf + 0.05, rnd(0.2, 1.1), rnd(-2, 2), 1 + rnd(2, 4.5) * big, Math.random() < 0.6 ? 0xf0faff : 0x9ad4f0, rnd(0.45, 0.75), rnd(0.1, 0.24), 11, false);
      this.fx.ring(P.pos.x, surf + 0.02, 0xc8ecff, 2 + big * 1.5, true); if (wet) audio.play('water_jump', 0.25 + big * 0.2, 0.8); }
    this._wet = wet;
    if (wet && surf !== null && Math.abs(P.vel.x) > 1 && P.pos.y + 1.7 > surf && per(0.45)) for (let i = 0; i < 2; i++) this.fx.spawn(P.pos.x - Math.sign(P.vel.x) * rnd(0, 0.4), surf + 0.04, rnd(0.3, 0.9), -Math.sign(P.vel.x) * rnd(0.3, 1.5), rnd(0.8, 2), i ? 0xa0e0f0 : 0xf0faff, rnd(0.35, 0.5), rnd(0.1, 0.2), 9, false); // a wake peels off behind
    if (P.sunk && per(0.2)) this.fx.spawn(P.pos.x + rnd(-0.2, 0.2), P.pos.y + rnd(1.1, 1.6), 0.7, rnd(-0.1, 0.1), rnd(0.8, 1.4), 0xc8f0ff, rnd(0.8, 1.4), rnd(0.05, 0.09), -0.8);
    if (this.fx.parts.length > 450) return;
    for (const w of d.water) { const k = w.w / 6 * (LOW_MEM ? 0.5 : 1), sy = b.y0 + w.y + w.h; if (per(0.05 * k)) this.fx.spawn(b.x0 + w.x + Math.random() * w.w, sy + 0.02, rnd(-0.5, 1.8), rnd(-0.15, 0.15), 0, 0xdff6ff, rnd(0.3, 0.6), rnd(0.06, 0.12), 0); if (w.w > 1.5 && per(0.004 * k)) this.fx.ring(b.x0 + w.x + rnd(0.5, w.w - 0.5), sy + 0.01, 0x9ad8f0, rnd(1, 1.8), true); }
  }

  // ------------------------------------------------------------------ combat hooks
  playerHits(hb) {
    const P = this.player, room = this.room; let struck = null; // returns the last foe the blow landed on (a missile's impact reads it)
    for (const e of room.enemies) {
      if (e.gone || hb.attack.hitIds.has(e.id)) continue;
      const roll = hb.roll ? { ...hb.roll } : P.rollDamage(); if (hb.mul) { roll.dmg = Math.max(1, Math.round(roll.dmg * hb.mul)); roll.elem = roll.elem.map(x => ({ ...x, dmg: Math.max(1, Math.round(x.dmg * hb.mul)) })); } // a part-blow (a dagger drive, a boomerang's way home) carries part of its element too
      if (e.hit(hb, roll, P)) { struck = e; if (hb.pull && !e.T.mini && !e.boss && P.weaponMesh) { const m = P.weaponMesh, tip = m.localToWorld(new THREE.Vector3(0, m.userData.len / m.scale.x, 0)); this.fx.hook({ x: tip.x, y: tip.y }, { x: e.cx, y: e.cy }); e.ghost?.(0x9ad8a0, 0.3, 0.3); }
        if (!hb.proj) { const im = this.impact(hb, e, roll), A = hb.attack, part = hb.flurry && !hb.last;
          this.touch?.buzz(roll.crit ? 30 : 15); this.feel(roll.crit ? 'crit' : e.boss ? 'boss' : 'hit', (part ? 0.6 : 1) * (0.8 + im[1])); this.hitStop(im[0]); this.stopVictim = e;
          if (A.shookW !== (A.wi ?? -1)) { A.shookW = A.wi ?? -1; this.shake(im[1], P.facing, im[3] ? -0.35 : 0, 0.03 + im[1] * 0.12); this.fx.sparks(e.cx - P.facing * e.T.w * 0.25, Math.min(e.cy + 0.2, (hb.y0 + hb.y1) / 2 + 0.2), 0xfff0d0, 2 + Math.round(im[1] * 10), 7 + im[1] * 6, P.facing); } // one kick per blow, however many it cuts; sparks fly the way the blade went
          if (!hb.pull && !e.boss && !e.T.mini) this.knock(e, im, roll.crit); }
        if (roll.crit) this.flash(); this.onHit(e, roll, hb); if (hb.dive && P.state === 'dive') { P.state = 'free'; P.vel.set(0, 9.5); P.jumpsLeft = P.has('djump') ? 1 : 0; P.dashUsed = false; P.diveCd = 0.5; } }
    }
    if (!hb.proj) for (const s of this.shots) if (!s.friendly && ['skull', 'bone', 'book', 'lob', 'web', 'net'].includes(s.kind) && s.x > hb.x0 - 0.3 && s.x < hb.x1 + 0.3 && s.y > hb.y0 - 0.3 && s.y < hb.y1 + 0.3) { s.life = 0; this.fx.burst(s.x, s.y, s.col, 12, 4); audio.play('sword_parry_1', 0.4, 1.4); } // steel swats slow missiles from the air
    for (const bk of room.breakables) if (!bk.broken && Math.abs(bk.x - (hb.x0 + hb.x1) / 2) < (hb.x1 - hb.x0) / 2 + 0.25 && hb.y0 < bk.y + 1.6 && hb.y1 > bk.y) this.breakCandle(bk);
    if (!hb.proj && !hb.attack.hitIds.has('wall')) { const w = this.activeSolids().find(s => (s.kind === 'wall' || s.kind === 'block') && !s.gone && hb.x0 < s.x1 && hb.x1 > s.x0 && hb.y0 < s.y1 && hb.y1 > s.y0 && !(s.x0 <= P.pos.x && s.x1 >= P.pos.x)); if (w && !room.cracks.some(c => !c.gone && hb.x0 < c.x1 + 0.1 && hb.x1 > c.x0 - 0.1 && hb.y0 < c.y1 && hb.y1 > c.y0)) { hb.attack.hitIds.add('wall'); const wx = P.pos.x < w.x0 ? w.x0 : w.x1, wy = Math.max(w.y0 + 0.2, Math.min(w.y1 - 0.2, (hb.y0 + hb.y1) / 2)); audio.play('rock_wall_1', 0.22, 0.65); for (let i = 0; i < 3; i++) this.fx.spawn(wx, wy, 0.9, (P.pos.x < wx ? -1 : 1) * rnd(1, 3), rnd(-0.5, 2), 0x9a948a, 0.25, 0.08, 9, false); } } // solid stone answers with a dull tock
    for (const s of room.cracks) if (!s.gone && s.by !== 'dive' && !hb.attack.hitIds.has('k' + s.key) && hb.x0 < s.x1 + 0.1 && hb.x1 > s.x0 - 0.1 && hb.y0 < s.y1 && hb.y1 > s.y0) { hb.attack.hitIds.add('k' + s.key); this.breakCrack(s, hb); }
    for (const t of room.gates) if (!t.gone && t.gate === 'thorn' && !hb.attack.hitIds.has(t.key) && hb.x0 < t.x1 && hb.x1 > t.x0 && hb.y0 < t.y1 && hb.y1 > t.y0) {
      hb.attack.hitIds.add(t.key);
      if (P.d.elems.some(e => e.elem === 'fire')) this.burnThorns(t);
      else { audio.play('sword_blocked_2', 0.6); this.fx.burst((t.x0 + t.x1) / 2, P.pos.y + 1.2, 0xc0c0a0, 8, 3); this.ui.prompt('The blackthorn shrugs off cold steel. Something burning might work…'); setTimeout(() => this.ui.prompt(''), 2600); }
    }
    for (const c of room.chests) if (!c.opened && !hb.proj && !hb.attack.hitIds.has('c' + c.key) && hb.x0 < c.x + 0.6 && hb.x1 > c.x - 0.6 && hb.y0 < c.y + 0.7 && hb.y1 > c.y) { hb.attack.hitIds.add('c' + c.key); c.open(); }
    return struck;
  }
  // a blow's weight by weapon class (IMPACT) as [stop, trauma, knockback, lift]: a sword chain's third cut and a flurry's last
  // drive land harder, a boss or a guard holds the stop a beat longer, a crit adds a beat and a jolt (reused array: no garbage per hit)
  impact(hb, e, roll) {
    const P = this.player, base = P.equip.weapon && BASES[P.equip.weapon.base], k = hb.slide ? 'slide' : hb.dive ? 'dive' : !base ? 'unarmed' : IMPACT[base.kind] ? base.kind : 'sword';
    const t = IMPACT[k], im = this._im ||= [0, 0, 0, 0]; im[0] = t[0]; im[1] = t[1]; im[2] = t[2]; im[3] = t[3] || 0;
    if (hb.flurry) { if (hb.last) { im[0] = 0.06; im[2] = 3; } }
    else if (k === 'sword' && hb.attack.ci === 2) { im[0] = 0.085; im[1] = 0.22; im[2] = 6; }
    if (e.boss) im[0] += 0.015; else if (e.T.block) im[0] += 0.01;
    if (roll.crit) { im[0] += 0.05; im[1] += 0.15; }
    return im;
  }
  // an arrow or a boomerang that lands: its class's stop (IMPACT bow / boomerang, a beat longer on a boss or a crit), a lighter
  // kick along its flight (0.6 of the class's trauma), three sparks the way it flew and a flinch-knock, but never on a great foe
  missileImpact(s, e, crit) {
    const t = IMPACT[s.boom ? 'boomerang' : 'bow'], dir = Math.sign(s.vx) || this.player.facing, im = this._imP ||= [0, 0, 0, 0];
    im[0] = t[0] + (e.boss ? 0.015 : 0) + (crit ? 0.03 : 0); im[1] = t[1]; im[2] = t[2]; im[3] = t[3] || 0;
    this.hitStop(im[0]); this.stopVictim = e; this.shake(im[1] * 0.6, dir, 0); this.feel(crit ? 'crit' : 'hit', 0.5 + im[1]);
    this.fx.sparks(s.x, s.y, 0xfff0d0, 3, 6, dir);
    if (!e.boss && !e.T.mini) { if (e.vel.x && (e.dead || e.air || (e.state === 'hurt' && e.t === 0))) e.vel.x = dir * Math.abs(e.vel.x); this.knock(e, im, crit); } // thrown the way the missile flew (a boomerang's return comes from behind)
  }
  // knockback by that weight, only into a flinch (a heavy foe or a committed swing doesn't budge); a heavy head lifts light bodies,
  // and the dead fly by the same rule. Sets the velocity enemies.js gave the flinch (its 2.2 m/s for every weapon).
  knock(e, im, crit) {
    const s = Math.sign(e.vel.x || this.player.facing);
    if (e.dead) { e.vel.x = s * Math.max(4.5, im[2] * 0.9); if (!e.flying) e.vel.y = Math.max(e.vel.y, 3.2 + im[3] * 0.6); return; }
    if (e.state === 'hurt' && e.t === 0) { e.vel.x = s * im[2] * (crit ? 1.4 : 1); if (im[3] && !e.air && e.T.h <= 2.4) e.vel.y = im[3]; }
    else if (e.air && !['brute', 'worm'].includes(e.T.ai)) e.vel.x = s * Math.max(3, im[2] * 0.7);
  }
  // weapon echoes that answer a landed hit
  onHit(e, roll, hb) {
    const P = this.player, echo = P.d.echo, dmg = roll.dmg, part = hb.flurry ? (hb.mul || 1) : 1; if (!hb.flurry || hb.last) { P.combo++; P.hits++; } P.comboT = 2.5; // a flurry is one blow to the bells and the combo
    if (e.spec.illusion) return; const proc = p => Math.random() < p * part; // its drives share one chance between them
    // the bells ride along in a fight: Echo repeats every fifth blow, Ember sets slides and dives alight
    if (P.has('echo') && P.hits % 5 === 0 && !hb.twin) after(0.18, () => { if (!e.dead) { e.damage(Math.max(1, Math.round(dmg * 0.5)), 'shadow', true); this.fx.ring(e.cx, e.cy, 0xb090ff, 3); } });
    if (P.has('ember') && (hb.dive || hb.slide)) { e.burn = 3; e.burnDmg = Math.max(3, dmg * 0.2); this.fx.burst(e.cx, e.cy, 0xff6a20, 16, 4); }
    if (!echo) return;
    if (echo === 'twin' && !hb.twin && proc(1)) after(0.15, () => { if (!e.dead) { e.damage(Math.max(1, Math.round(dmg * 0.35)), 'shadow', true); this.fx.glint(e.cx, e.cy, 0xb090ff); } });
    if (echo === 'chain' && proc(0.25)) { let src = e; const seen = new Set([e]); for (let i = 0; i < 3; i++) { const o = this.room.enemies.find(x => !x.dead && !seen.has(x) && Math.abs(x.pos.x - src.pos.x) < 7 && Math.abs(x.pos.y - src.pos.y) < 4); if (!o) break; seen.add(o); this.fx.line({ x: src.cx, y: src.cy }, { x: o.cx, y: o.cy }, 0xffe860); o.damage(Math.round(dmg * 0.6), 'lightning', true); src = o; } audio.play('spell_impact_2', 0.35, 1.4); }
    if (echo === 'ignite') { e.burn = 3; e.burnDmg = Math.max(2, dmg * 0.12); }
    if (echo === 'execute' && !e.boss && !e.dead && e.hp < e.hpMax * 0.18) { this.ui.dmg(e.pos.x, e.pos.y + e.T.h + 0.6, 'EXECUTED', 'crit'); e.damage(e.hp + 1, null, true); }
    if (echo === 'bats' && roll.crit && (!hb.flurry || hb.last)) for (let i = 0; i < 3; i++) this.shoot({ x: P.pos.x, y: P.pos.y + 1.4, vx: P.facing * 6, vy: 3 - i * 2.5, kind: 'bat', dmg: Math.round(dmg * 0.4), friendly: true, homing: 6, life: 2.5 });
    if (echo === 'toll' && P.hits % 8 === 0) { audio.play('title_bells', 0.6, 1.5); this.fx.ring(P.pos.x, P.pos.y + 1, 0xffe090, 12); this.shake(0.3); for (const o of this.room.enemies) if (!o.dead && !o.hidden && Math.abs(o.pos.x - P.pos.x) < 14) { o.stun = o.boss ? 0.8 : 1.6; o.stunStars = true; o.damage(Math.round(dmg * 0.5), null, true); } }
    if (echo === 'briar' && proc(0.3)) this.erupt({ x: e.pos.x, y: e.pos.y, delay: 0.2, w: 1.4, h: 2.8, dmg: Math.round(dmg * 0.7), elem: 'poison', col: 0x2a5a1a, friendly: true });
    if (echo === 'star' && proc(0.15)) { this.shoot({ x: e.pos.x + rnd(-1, 1), y: e.pos.y + 12, vx: 0, vy: -20, kind: 'star', dmg: Math.round(dmg * 1.5), friendly: true, life: 1.5, blast: 2 }); audio.play('rock_meteor_throw_1', 0.4); }
  }
  onSwing(P, A) {
    if (this.tutorial === 'strike') { this.tutorial = null; this.ui.prompt(''); this._pt = null; setTimeout(() => this.ui.toast(pick({ touch: 'Strikes chain — keep tapping. Jump and swing in the air too.', kb: 'Strikes chain — keep pressing J. Swing while jumping or crouching too.', pad: 'Strikes chain — keep pressing {X}. Swing while jumping or crouching too.' }), 'magic'), 900); }
    if (P.d.echo === 'crescent' && A.n % 3 === 0) { const r = P.rollDamage(); this.shoot({ x: P.pos.x + P.facing * 0.8, y: P.pos.y + (P.crouch ? 0.6 : 1.1), vx: P.facing * 13, vy: 0, kind: 'pcrescent', dmg: Math.round(r.dmg * 0.6), friendly: true, pierce: true, life: 0.9 }); audio.play('wave_attack_2', 0.35, 1.4); }
  }
  // Up + Attack: spend mana to loose the weapon's echo at full strength (a crescent of force if it has none)
  castArt(P) {
    const echo = P.d.echo, r = P.rollDamage(), d = Math.round(r.dmg * 1.5 * (1 + Math.max(0, (P.d.int || 8) - 8) * 0.025)), x = P.pos.x, y = P.pos.y, f = P.facing, near = this.room.enemies.filter(e => !e.dead && !e.hidden && Math.abs(e.pos.x - x) < 11 && Math.abs(e.pos.y - y) < 6);
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
    after(0.22, () => { this.fx.burst(x + f * 0.8, y + 1.1, 0x9a5aff, 26, 4); const r = P.rollDamage(); this.playerHits({ x0: Math.min(x, x + f * 2.2), x1: Math.max(x, x + f * 2.2), y0: y, y1: y + 2, attack: atk, roll: r, mul: 0.8, proj: true, twin: true }); audio.play('sword_attack_1', 0.4, 0.7); });
  }
  // A staff's cast (its second chain link): no mana, three-quarter strength, and a voice of its own per element
  staffBolt(P) {
    const base = BASES[P.equip.weapon.base], el = staffElem(base.model), r = P.rollDamage(), f = P.facing, x = P.pos.x + f * 1.1, y = P.pos.y + (P.crouch ? 0.8 : 1.4), col = el === 'lightning' ? 0xc8b8ff : el ? ELEM_COL[el] : 0x9ab0ff;
    const dry = P.stats.mp < 2; if (!dry) P.stats.mp -= 2; r.dmg = Math.max(1, Math.round(r.dmg * (dry ? 0.4 : 0.75) * (1 + Math.max(0, (P.d.int || 8) - 8) * 0.025))); const add = k => ({ ...r, elem: [...r.elem, { elem: el, dmg: Math.max(1, Math.round(r.dmg * k)) }] }); // Intellect feeds the bolt: 2.5% a point
    this.fx.burst(x, y, col, 10, 3.5); this.fx.glint(x, y, col); /* a glint, no bubble ring */
    if (el === 'fire') { this.shoot({ x, y, vx: f * 12, vy: 0, kind: 'fireball', roll: add(0.25), dmg: Math.round(r.dmg * 0.75), friendly: true, life: 0.62, blast: 1.7 }); audio.play('fireball_2', 0.45, 1.1); } // dmg: what its burst deals (without it the blast rolled NaN and made a foe unkillable)
    else if (el === 'ice') { for (const a of [-0.14, 0, 0.14]) this.shoot({ x, y, vx: f * 18 * Math.cos(a), vy: 18 * Math.sin(a), kind: 'shard', roll: { ...add(0.15), dmg: Math.max(1, Math.round(r.dmg * 0.45)) }, friendly: true, life: 0.42 }); audio.play('ice_barrage_1', 0.45, 1.3); }
    else if (el === 'lightning') { // a fork to the nearest foe ahead, then on to the next
      const foes = this.room.enemies.filter(e => !e.dead && !e.hidden && (e.pos.x - P.pos.x) * f > -0.5 && Math.abs(e.pos.x - P.pos.x) < 7.5 && Math.abs(e.cy - y) < 3.5).sort((a, b) => Math.abs(a.pos.x - P.pos.x) - Math.abs(b.pos.x - P.pos.x));
      let from = { x, y }; const atk = { hitIds: new Set() };
      for (const e of foes.slice(0, 2)) { this.fx.line(from, { x: e.cx, y: e.cy }, 0xc8b8ff); this.playerHits({ x0: e.aabb.x0, x1: e.aabb.x1, y0: e.aabb.y0, y1: e.aabb.y1, attack: atk, roll: add(0.2), proj: true, mul: from.x === x ? 1 : 0.6 }); from = { x: e.cx, y: e.cy }; }
      if (!foes.length) { this.fx.line({ x, y }, { x: x + f * 6, y: y + rnd(-1, 1) }, 0xc8b8ff); this.fx.burst(x + f * 6, y, 0xe0d8ff, 10, 3); }
      audio.play('spell_impact_2', 0.5, 1.2);
    }
    else if (el === 'shadow') { for (const vy of [2.2, -0.6]) this.shoot({ x, y, vx: f * 6, vy, kind: 'wisp', roll: { ...add(0.2), dmg: Math.max(1, Math.round(r.dmg * 0.6)) }, friendly: true, homing: 4.5, life: 1.5 }); audio.play('wave_attack_2', 0.45, 0.7); }
    else if (el === 'poison') { for (let i = 1; i <= 3; i++) { const bx = P.pos.x + f * (0.8 + i * 1.5); this.erupt({ x: bx, y: this.floorBelow(bx, P.pos.y + 0.6), delay: 0.07 * i, w: 1.3, h: 2.6, dmg: Math.round(r.dmg * 0.7), elem: 'poison', col: 0x3a7a2a, friendly: true }); } audio.play('squelching_4', 0.4, 1.2); }
    else { this.shoot({ x, y, vx: f * 15, vy: 0, kind: 'orb', roll: r, friendly: true, pierce: true, life: 0.5 }); audio.play('spell_impact_3', 0.4, 1.4); }
  }
  playerShoot(P, kind) {
    if (kind === 'staff') return this.staffBolt(P);
    const base = BASES[P.equip.weapon.base], echo = P.d.echo, y = P.pos.y + (P.crouch ? 0.7 : 1.25), n = echo === 'multishot' ? 3 : 1, free = kind === 'arrow', dry = !free && P.stats.mp < 2; // plain arrows are free (the bow is tuned as a steady weapon); a boomerang throw still costs 2 MP
    if (!free) { if (!dry) P.stats.mp -= 2; else if (!this.flags.dryHint) { this.flags.dryHint = 1; this.ui.toast('Out of mana: your throws fly at half strength.', 'magic'); } }
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.16, r = P.rollDamage(); if (n > 1 && i !== (n - 1) / 2) r.dmg = Math.round(r.dmg * 0.5); if (dry) r.dmg = Math.max(1, Math.round(r.dmg * 0.5));
      if (kind === 'arrow') this.shoot({ x: P.pos.x + P.facing * 0.6, y, vx: P.facing * 24 * Math.cos(a), vy: 24 * Math.sin(a) + 0.6, grav: 3, kind: 'arrow', roll: r, friendly: true, pierce: echo === 'pierce', life: 1.6 });
      else this.shoot({ x: P.pos.x + P.facing * 0.6, y, vx: P.facing * 16 * Math.cos(a), vy: 16 * Math.sin(a), kind: 'boomerang', roll: r, friendly: true, pierce: true, boom: P.facing, life: 1.7, model: base.model });
    }
    if (echo === 'orbit' && !this.shots.some(s => s.kind === 'orbit')) this.shoot({ x: P.pos.x, y, vx: 0, vy: 0, kind: 'orbit', roll: P.rollDamage(), friendly: true, pierce: true, life: 4, orbit: 0, mul: 0.5 });
    audio.play(kind === 'arrow' ? 'bow_attack_' + (1 + (Math.random() * 2 | 0)) : 'wave_attack_1', 0.5, 1.1);
  }
  diveLand(P) {
    this.shake(0.4, 0, -1); audio.play('rock_wall_1', 0.5, 1.2); this.fx.dust(P.pos.x, P.pos.y); this.fx.ring(P.pos.x, P.pos.y + 0.1, 0x4ac8d8, 5, true);
    const atk = { hitIds: new Set() }; this.playerHits({ x0: P.pos.x - 2.2, x1: P.pos.x + 2.2, y0: P.pos.y - 0.2, y1: P.pos.y + 1.2, attack: atk, mul: 1.2, proj: true });
    for (const s of this.room.cracks) if (!s.gone && s.by === 'dive' && P.pos.x > s.x0 - 0.3 && P.pos.x < s.x1 + 0.3 && Math.abs(s.y1 - P.pos.y) < 0.3) { this.breakCrack(s); P.state = 'dive'; P.onGround = false; }
  }
  quake(P) { for (const d of [1, -1]) this.shockwave(null, P.pos.x + d * 0.8, P.pos.y, d, null, Math.round(P.rollDamage().dmg * 0.8)); }
  breakCrack(s, hb) {
    const hp = s.ref?.hp || 1, cx = (s.x0 + s.x1) / 2, P = this.player;
    if (s.ref?.need === 'fire' && !(P.d.elems?.some(e => e.elem === 'fire') || (hb?.roll?.elem || []).some(e => e.elem === 'fire') || P.has('ember'))) { audio.play('ice_wall_1', 0.35, 0.7); this.fx.burst(cx, hb ? (hb.y0 + hb.y1) / 2 : s.y0 + 1.5, 0xd8f4ff, 10, 2); if (!this.flags.rimeHint) { this.flags.rimeHint = 1; this.ui.toast('Rime locks this stone. Only fire will crack it.', 'magic'); } return; } /* a return trip: come back with fire */
    if (hp > 1 && (s.dmg = (s.dmg || 0) + 1) < hp) { // a sealed wall: each blow rings hollow, chips the face and opens the crack wider
      audio.play('rock_wall_1', 0.55, 1.45); audio.play('wood_land', 0.5, 0.55); this.shake(0.15); this.hitStop(0.05);
      const y = hb ? Math.max(s.y0 + 0.3, Math.min(s.y1 - 0.3, (hb.y0 + hb.y1) / 2)) : (s.y0 + s.y1) / 2, fx = P.pos.x < cx ? s.x0 : s.x1;
      for (let i = 0; i < 12; i++) this.fx.spawn(fx, y + rnd(-0.4, 0.4), 0.9, (P.pos.x < cx ? -1 : 1) * rnd(1, 4), rnd(0, 3), i % 3 ? 0x8a8478 : 0xc8bca8, 0.6, rnd(0.08, 0.2), 9, false);
      this.fx.dust(fx, s.y0 + 0.1, 0x7a7268); this.flags[s.key + ':d'] = s.dmg; for (const d of [s.decal, s.decal2]) if (d) { d.material.opacity = Math.min(1, 0.6 + s.dmg * 0.2); d.scale.setScalar(1 + s.dmg * 0.12); }
      if (!this.flags.hollowHint) { this.flags.hollowHint = 1; this.ui.toast('The wall rings hollow…', 'magic'); }
      return;
    }
    s.gone = true; s.mesh.visible = false; this.flags[s.key] = true; audio.play('rock_wall_2', 0.6); this.shake(0.4);
    for (let i = 0; i < 26; i++) this.fx.spawn(rnd(s.x0, s.x1), rnd(s.y0, s.y1), 0.6, rnd(-3, 3), rnd(-1, 4), 0x8a8478, 0.8, 0.3, 9, false);
    if (hp > 1) { // the infill falls in: real stones tumble out, a breath of cold air follows, the way on is lit
      this.hitStop(0.12); this.shake(0.55); audio.play('rock_meteor_swarm_1', 0.45, 0.8); const mat = s.mesh.children[0]?.material, dir = P.pos.x < cx ? 1 : -1;
      const chunks = []; for (let i = 0; i < 9; i++) { const k = new THREE.Mesh(FX.chunkGeo ||= new THREE.BoxGeometry(1, 1, 1), mat); const sz = rnd(0.2, 0.45); k.scale.set(sz * 1.4, sz, sz); k.position.set(rnd(s.x0, s.x1), rnd(s.y0 + 0.3, s.y1 - 0.3), rnd(0.8, 1.8)); this.room.group.add(k); chunks.push({ k, vx: -dir * rnd(0.5, 4), vy: rnd(1, 5), r: rnd(-8, 8), fy: this.floorBelow(k.position.x, k.position.y) }); }
      let t = 0; const tick = () => { t += FDT; for (const c of chunks) { c.vy -= 22 * FDT; c.k.position.x += c.vx * FDT; c.k.position.y += c.vy * FDT; c.k.rotation.z += c.r * FDT; if (c.k.position.y < c.fy + 0.12) { c.k.position.y = c.fy + 0.12; c.vy *= -0.3; c.vx *= 0.6; c.r *= 0.5; } if (t > 1.6) c.k.scale.multiplyScalar(0.9); }
        if (t < 2.2) nextTick(tick); else chunks.forEach(c => c.k.parent?.remove(c.k)); }; tick();
      for (let i = 0; i < 18; i++) this.fx.spawn(cx + dir * rnd(0, 1.5), rnd(s.y0, s.y1), 0.7, -dir * rnd(0.5, 2), rnd(-0.3, 0.6), 0x9a9488, 1.6, rnd(0.5, 0.9), -0.2, false);
      // the hidden room's light spills out through the breach across the ledge, and a bell answers
      const col = s.ref.glow || 0xffc070, door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, s.y1 - s.y0), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); door.position.set(cx, (s.y0 + s.y1) / 2, 1.2);
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); spill.rotation.x = -Math.PI / 2; spill.position.set(cx - dir * 1.6, s.y0 + 0.04, 0.6);
      this.room.group.add(door, spill); let lt = 0; const fade = () => { lt += FDT; const o = Math.max(0, 1 - lt / 3); door.material.opacity = o * 0.8; spill.material.opacity = o * 0.7; if (lt < 3) nextTick(fade); else { this.room.group.remove(door, spill); door.material.dispose(); spill.material.dispose(); } }; fade();
      after(0.25, () => audio.play('title_bells', 0.35, 1.6));
    }
    if (!this.flags.crackHint) { this.flags.crackHint = 1; this.ui.toast('The stone gives way!', 'magic'); }
  }
  // mortar weeps dust from a walled-up doorway: the tell that a wall is hollow
  crackTells(dt) {
    const P = this.player;
    const ring = P.equip.ring1?.uniq === 'huntsmans_signet' || P.equip.ring2?.uniq === 'huntsmans_signet';
    if (ring) for (const s of this.room.cracks) if (!s.gone && s.by !== 'dive' && !(s.ref?.hp > 1) && Math.abs(P.pos.x - (s.x0 + s.x1) / 2) < 10 && Math.abs(P.pos.y - s.y0) < 6) { if (Math.random() < dt * 3) this.fx.spawn(rnd(s.x0, s.x1), rnd(s.y0, s.y1), 1.9, 0, rnd(0.1, 0.4), 0xd8b070, 0.8, rnd(0.08, 0.14), 0); if ((s.humT = (s.humT || 0) - dt) <= 0) { s.humT = 2.2; audio.play('glass_ping_small', 0.15, 0.45); } } /* older cracked stone hums for the Signet too */
    for (const s of this.room.cracks) if (!s.gone && s.ref?.hp > 1) {
      s.dustT = (s.dustT ?? rnd(0, 2)) - dt; if (s.dustT <= 0) { s.dustT = rnd(2, 3); for (let i = 0; i < 7; i++) this.fx.spawn((s.face ?? s.x0) + (s.faceDir || -1) * rnd(0.05, 0.3), s.y1 - rnd(0.05, 0.6), rnd(-0.8, 1.2), (s.faceDir || -1) * rnd(0, 0.15), rnd(-0.6, -0.1), i % 2 ? 0xb0a490 : 0x8a8070, 1.6, rnd(0.12, 0.2), 2.2, false); } /* mortar sifts down through the light under the door */
      const near = Math.abs(P.pos.x - (s.x0 + s.x1) / 2) < 4 && Math.abs(P.pos.y - s.y0) < 3, k = (near ? 1.5 : 1) * (P.has('echo') ? 1.4 : 1) * (1 + (s.dmg || 0) * 0.4); // the Echo bell makes hollow stone sing
      const sig = P.equip.ring1?.uniq === 'huntsmans_signet' || P.equip.ring2?.uniq === 'huntsmans_signet', hum = sig && Math.abs(P.pos.x - (s.x0 + s.x1) / 2) < 10 && Math.abs(P.pos.y - s.y0) < 6; /* the Huntsman's Signet hears hollow stone */
      const o = Math.min(1, (0.42 + 0.16 * Math.sin(this.time * 1.7 + s.x0)) * k * (hum ? 1.8 : 1)); if (s.glow) s.glow.material.opacity = o; if (s.glow2) s.glow2.material.opacity = o; if (s.pool) s.pool.material.opacity = 0.22 + 0.2 * o;
      if (hum && (s.humT = (s.humT || 0) - dt) <= 0) { s.humT = 2.2; audio.play('glass_ping_small', 0.18, 0.45); }
    }
  } // the hidden room's own light leaks through the crack: warm for a chapel, sick green for an ossuary, cold blue for a flooded choir
  breakCandle(bk) {
    bk.broken = true; bk.grp.visible = false; audio.play('glass_ping_small', 0.5, 0.8); this.fx.burst(bk.x, bk.y + 1.4, 0xffb050, 14, 3);
    const lvl = this.player.stats.lvl, r = Math.random(), again = bk.again, drop = r < (again ? 0.4 : 0.62) ? { gold: 3 + (Math.random() * 6 * lvl | 0) } : r < (again ? 0.405 : 0.64) ? { potion: true } : !again && r < 0.65 ? makeGem(DROP_GEMS[Math.random() * DROP_GEMS.length | 0]) : null; // a relit candle gives little back
    if (drop) this.dropLoot(bk.x, bk.y + 1.2, drop, this.room);
  }
  flash() { const f = $('fade'); f.style.transition = 'none'; f.style.background = '#fff'; f.style.opacity = 0.35; requestAnimationFrame(() => { f.style.transition = 'opacity .18s'; f.style.opacity = 0; setTimeout(() => f.style.background = '#000', 200); }); }
  slowMo(t) { this.slowT = t; }
  ignite(elem) {
    const P = this.player, col = ELEM_COL[elem];
    this.slowMo(0.8); this.flash(); audio.play(elem === 'fire' ? 'firebuff_2' : elem === 'ice' ? 'ice_freeze_1' : 'spell_impact_3', 0.7);
    for (let i = 0; i < 40; i++) after(i * 0.018, () => this.fx.burst(P.pos.x + P.facing * 0.5, P.pos.y + 1.2, col, 3, 3));
    if (!this.flags['ign_' + elem]) { this.flags['ign_' + elem] = 1; this.ui.roomName(elem === 'fire' ? 'THE BLADE CATCHES FIRE' : 'THE BLADE AWAKENS', 3200); }
  }

  // ---- missiles (both sides)
  shoot(o) {
    const [col, size] = SHOT[o.kind] || SHOT.bolt, c = o.elem && ELEM_COL[o.elem] && !o.friendly ? ELEM_COL[o.elem] : col;
    let m;
    if (o.kind === 'arrow') { m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.035, 0.035), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); }
    else if (o.kind === 'rock') { m = new THREE.Mesh(FX.rockGeo ||= new THREE.DodecahedronGeometry(0.34, 0), FX.masonMat ||= surface('castle_stone', 0.5, 0.5, { dir: 'assets/game/tex3/' })); const sc = rnd(1.5, 2.6); m.scale.set(sc, sc * 0.75, sc * 0.85); m.rotation.set(rnd(0, 3), rnd(0, 3), 0); } /* a block of the hall's own masonry, 0.5-0.9 m */
    else if (o.kind === 'slag') { m = new THREE.Mesh(FX.slagGeo ||= (() => { const g = new THREE.IcosahedronGeometry(0.26, 1), p = g.attributes.position; for (let j = 0; j < p.count; j++) { const k = rnd(0.75, 1.25); p.setXYZ(j, p.getX(j) * k, p.getY(j) * k, p.getZ(j) * k); } g.computeVertexNormals(); return g; })(), /* a lumpy clot, not a nut */ FX.slagMat ||= new THREE.MeshStandardMaterial({ color: 0x2a1008, emissive: 0x6a1c04, roughness: 0.9, flatShading: true })); const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff5a10, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); h.scale.setScalar(1.4); h.position.z = -0.15; m.add(h); const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffd080, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); core.scale.setScalar(0.35); core.position.z = 0.2; m.add(core); m.scale.setScalar(rnd(0.6, 1.4)); } // a crusted clot of slag, white-hot where it is split
    else if (o.kind === 'feather') { m = new THREE.Mesh(FX.featherGeo ||= new THREE.PlaneGeometry(0.55, 0.2), FX.featherMat ||= new THREE.MeshBasicMaterial({ map: FX.featherTex ||= featherTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.scale.setScalar(1.3); }
    else if (o.kind === 'meteor') { m = new THREE.Mesh(FX.meteorGeo ||= (() => { const g = new THREE.IcosahedronGeometry(0.34, 2), p = g.attributes.position, v = new THREE.Vector3(); for (let j = 0; j < p.count; j++) { v.fromBufferAttribute(p, j); const k = 0.82 + 0.18 * Math.sin(v.x * 17 + v.y * 9) * Math.cos(v.z * 13 - v.y * 7); /* a function of position, so shared corners stay closed */ p.setXYZ(j, v.x * k, v.y * k * 0.9, v.z * k); } g.computeVertexNormals(); return g; })(), FX.meteorMat ||= new THREE.MeshStandardMaterial({ color: 0x1e120c, emissive: 0x5a1a04, roughness: 0.95, metalness: 0 })); m.scale.setScalar(1.6); m.rotation.set(rnd(0, 3), rnd(0, 3), 0); const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: 0xff7a20, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); fl.scale.set(1.3, 2.2, 1); fl.position.z = -0.1; m.add(fl); } /* a burning stone, crust split with fire */
    else if (o.kind === 'net') { m = new THREE.Mesh(FX.netGeo ||= new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: FX.netTex ||= netTex(), color: 0xc8d4e8, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })); m.scale.setScalar(0.2); const tl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xd8dce8, transparent: true, opacity: 0.6 })); tl.frustumCulled = false; this.scene.add(tl); o.tether = tl; } /* a silk line runs back to the spinner */
    else if (o.kind === 'shard') { m = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), new THREE.MeshStandardMaterial({ color: 0xd8f4ff, emissive: 0x3a8ab0, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 })); m.scale.set(3.2, 0.7, 0.7); }
    else if (o.kind === 'bone') m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, emissive: 0x201008 }));
    else if (o.kind === 'book') { const cov = new THREE.MeshStandardMaterial({ color: 0x5a1a2a, emissive: 0x2a0a20 }), pg = new THREE.MeshBasicMaterial({ color: 0xf0e4c8 }); m = new THREE.Mesh(FX.bookGeo ||= new THREE.BoxGeometry(0.45, 0.6, 0.14), [pg, pg, pg, pg, cov, cov]); // pale page edges round a dark cover
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xa070ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 })); h.scale.setScalar(1.3); h.position.z = -0.1; m.add(h); } // a spell-lit book: its violet glow carries the spiral's shape against the shelves
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
        if (s.boom) { s.vx -= s.boom * 22 * dt; if (Math.sign(s.vx) !== s.boom && !s.back) { s.back = true; s.hitIds.clear(); s.mul = (s.mul || 1) * 0.5; } /* the way home cuts again, at half strength */ if (s.back) { s.vy += ((P.pos.y + 1.1 - s.y) * 6 - s.vy) * Math.min(1, dt * 6); if (Math.abs(s.x - P.pos.x) < 0.7) s.life = 0; } }
        if (s.homing) { const tgt = s.friendly ? this.room.enemies.filter(e => !e.dead && !e.hidden).sort((a, c) => Math.hypot(a.cx - s.x, a.cy - s.y) - Math.hypot(c.cx - s.x, c.cy - s.y))[0] : P; if (tgt) { const tx = (tgt.cx ?? tgt.pos.x) - s.x, ty = (tgt.cy ?? tgt.pos.y + 1) - s.y, d = Math.hypot(tx, ty) || 1, sp = Math.hypot(s.vx, s.vy); s.vx += (tx / d * sp - s.vx) * Math.min(1, dt * s.homing); s.vy += (ty / d * sp - s.vy) * Math.min(1, dt * s.homing); } }
        s.vy -= s.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      }
      s.m.position.set(s.x, s.y, 0.4);
      if (s.kind === 'arrow' || s.kind === 'shard' || s.kind === 'feather') s.m.rotation.z = Math.atan2(s.vy, s.vx); if (s.kind === 'net') { s.m.scale.setScalar(Math.min(1.1, 0.2 + s.t * 2.4)); s.m.rotation.z += dt * 4 * Math.max(0.2, 1 - s.t * 1.5); if (s.tether) { const a = s.tether.geometry.attributes.position, src = s.src; a.setXYZ(0, src ? src.pos.x + src.facing * 0.8 : s.x, src ? src.pos.y + 1.2 : s.y, 0.4); a.setXYZ(1, s.x, s.y, 0.4); a.needsUpdate = true; s.tether.material.opacity = 0.6 * Math.max(0, s.life); } } /* it unfurls as it spins, slowing */ else if (['bone', 'book', 'boomerang', 'orbit', 'rock'].includes(s.kind)) s.m.rotation.z += dt * (s.kind === 'rock' ? 6 : 14);
      if (s.kind === 'meteor') { s.m.rotation.z += dt * 3; if ((s.tr = (s.tr || 0) - dt) <= 0) { s.tr = 0.04; this.fx.streak(s.x, s.y, 1, 1.8, 0xff8a30, 0.22, 0.8, Math.atan2(-s.vy, -s.vx)); } if (per(0.5)) this.fx.spawn(s.x, s.y + 0.3, 0.2, rnd(-0.3, 0.3), rnd(0, 0.6), 0x2a1a12, 1.0, rnd(0.4, 0.7), -0.4, false); } /* a tapered fire trail along its flight, and smoke */
      if (s.kind === 'slag') { s.m.rotation.z += dt * 5; if (per(0.7)) this.fx.spawn(s.x, s.y, 0.35, rnd(-0.4, 0.4), rnd(-0.5, 0.3), Math.random() < 0.5 ? 0xff8a20 : 0xffd060, 0.5, 0.16, 7); } // embers drip from it as it flies
      if ((s.m.isSprite || s.kind === 'feather') && per(0.6)) this.fx.spawn(s.x, s.y, 0.35, rnd(-0.5, 0.5), rnd(-0.5, 0.5), s.col, 0.3, s.size * 0.6, 0);
      const r = s.kind === 'crescent' || s.kind === 'pcrescent' ? 1.1 : 0.3 + s.size * 0.25;
      if (s.friendly) {
        const hb = { x0: s.x - r, x1: s.x + r, y0: s.y - r, y1: s.y + r, attack: { hitIds: s.hitIds }, roll: s.roll ? { ...s.roll, elem: s.roll.elem } : { dmg: s.dmg, crit: false, elem: [] }, mul: s.mul, proj: true };
        const before = s.hitIds.size, e = this.playerHits(hb); if (s.hitIds.size > before) { this.fx.burst(s.x, s.y, s.col, 8, 3); if (!s.pierce) s.life = 0; }
        if (e && (s.kind === 'arrow' || s.kind === 'boomerang')) this.missileImpact(s, e, hb.roll.crit);
      } else if (!s.hit) {
        const pa = P.aabb, rr = s.kind === 'net' ? r + 0.5 : r; if (s.x + rr > pa.x0 && s.x - rr < pa.x1 && s.y + rr > pa.y0 && s.y - rr < pa.y1) { if (P.takeHit(s.dmg, s.x - Math.sign(s.vx || 1), s.elem === 'shadow' ? null : s.elem, s.src)) { this.fx.burst(s.x, s.y, s.col, 10, 3); s.life = 0; if (s.snare) P.ensnare(s.snare); } }
      }
      if (!s.pierce || s.kind === 'arrow') for (const w of this.activeSolids()) if (!w.oneway && !w.gone && s.x > w.x0 && s.x < w.x1 && s.y > w.y0 && s.y < w.y1 && s.t > 0.06) { s.life = 0; this.fx.burst(s.x, s.y, s.col, 8, 2.5); if (s.kind === 'acid' || s.kind === 'ember') this.fx.dust(s.x, s.y, s.col); break; }
      if (s.life <= 0 && s.splash === 'miasma' && !s.splashed) { s.splashed = true; const fy = this.floorBelow(s.x, s.y + 1); this.cloud(s.x, fy, 2.6, 5, 'poison', s.cloudDmg, s.src); this.fx.burst(s.x, fy + 0.4, 0x8aff5a, 16, 3); }
      if (s.life <= 0 && s.splash === 'fire' && s.kind === 'slag' && !s.splashed) { const fy = this.floorBelow(s.x, s.y + 0.6); if (s.y - fy < 2.5) this.cloud(s.x, fy, 1.5, 2.6, 'fire', Math.round(s.dmg * 0.35), s.src); } // slag pools burn on: ground denied for a while
      if (s.life <= 0 && s.splash && s.splash !== 'miasma' && !s.friendly && !s.splashed) { s.splashed = true; const fy = this.floorBelow(s.x, s.y + 0.6); if (s.y - fy < 2.5) this.erupt({ x: s.x, y: fy, delay: 0.04, w: 1.3, h: 1.5, dmg: Math.round(s.dmg * 0.7), elem: s.splash, src: s.src, quiet: true }); } // molten slag catches where it lands
      if (s.kind === 'rock' && per(0.5)) this.fx.spawn(s.x + rnd(-0.3, 0.3), s.y + 0.4, 0.3, rnd(-0.3, 0.3), rnd(0.5, 1.5), 0x6a6258, 0.6, rnd(0.3, 0.5), -0.5, false); /* it trails grit */
      if (s.life <= 0 && s.kind === 'meteor') { const fy = this.floorBelow(s.x, s.y + 0.6); this.fx.spawn(s.x, fy + 0.5, 0.9, 0, 0, 0xfff0c0, 0.12, 2.4, 0); this.fx.ring(s.x, fy + 0.1, 0xff8a30, 4, true); this.fx.cracks(s.x, fy, 1.8, 0xff6a14); this.fx.sparks(s.x, fy + 0.4, 0xffb060, 10, 8); for (let i = 0; i < 4; i++) this.fx.spawn(s.x + rnd(-0.6, 0.6), fy + 0.6, 0.5, rnd(-0.6, 0.6), rnd(0.6, 1.6), 0x2a1a12, 1.3, rnd(0.6, 1), -0.4, false); this.debris(s.x, fy + 0.4, 4, 0x2a1408, 0.8); this.shake(0.3, 0, -1); audio.play('rock_meteor_swarm_1', 0.4, 0.9); } /* impact: a flash, a ring, molten fractures and smoke (visual only: its damage is the hit and the burning splash) */
      if (s.life <= 0 && s.kind === 'rock') { const fy = this.floorBelow(s.x, s.y + 0.6); this.fx.dust(s.x, fy, 0x8a8070); this.fx.dust(s.x + 0.4, fy, 0x6a6258); this.fx.cracks(s.x, fy, 1.6); this.debris(s.x, fy + 0.3, 3, 0x6a625a, 0.8); audio.play('rock_wall_1', 0.4, 1.1); }
      if (s.life <= 0 && s.blast) { this.fx.ring(s.x, s.y, s.col, s.blast * 1.8); this.fx.spawn(s.x, s.y, 0.9, 0, 0, 0xfff4d8, 0.12, s.blast * 1.6, 0); this.fx.burst(s.x, s.y, s.col, 12, 5); this.fx.sparks(s.x, s.y, 0xffc070, 10, 8); for (let i = 0; i < 4; i++) this.fx.spawn(s.x + rnd(-0.5, 0.5), s.y + rnd(-0.3, 0.3), 0.5, rnd(-0.6, 0.6), rnd(0.5, 1.5), 0x2a2018, 1.2, rnd(0.6, 1), -0.3, false); const fy = this.floorBelow(s.x, s.y + 0.5); if (s.y - fy < 2) this.fx.cracks(s.x, fy, 1.4, 0x0a0806); this.shake(0.3); /* a core flash, smoke and a scorch */ audio.play('rock_meteor_swarm_1', 0.4); this.playerHits({ x0: s.x - s.blast, x1: s.x + s.blast, y0: s.y - 1, y1: s.y + s.blast, attack: { hitIds: new Set() }, roll: { dmg: Math.max(1, Math.round(s.dmg) || 1), crit: false, elem: [] }, proj: true }); } // never a NaN blast
      if (s.x < b.x0 - 3 || s.x > b.x1 + 3 || s.y < b.y0 - 3 || s.y > b.y1 + 16) s.life = 0;
    }
    this.shots = this.shots.filter(s => { if (s.life > 0) return true; this.scene.remove(s.m); if (s.tether) { this.scene.remove(s.tether); s.tether.geometry.dispose(); } return false; });
  }

  // a ground shockwave: a crest of force in the element's colour runs the floor, tearing up dust and stone chips, and leaves a
  // glowing scar that cools behind it. (The hit test is the old one: 0.55 m either side of the crest, 1.1 m tall: jump it.)
  shockwave(src, x, y, dir, elem, friendlyDmg) {
    const col = friendlyDmg ? 0x9ab0ff : (elem && ELEM_COL[elem]) || 0xff6a30, room = this.room, g = new THREE.Group(), add = THREE.AdditiveBlending, geo = FX.colGeo ||= (() => { const p = new THREE.PlaneGeometry(1, 1); p.translate(0, 0.5, 0); return p; })();
    const mk = (map, c, sx, ox) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, color: c, transparent: true, opacity: 0, blending: add, depthWrite: false, side: THREE.DoubleSide })); m.scale.set(sx * dir, 0.01, 1); m.position.x = -dir * ox; g.add(m); return m; };
    mk(FX.crestTex ||= crestTex(), col, 1.7, 0.4); mk(FX.crestTex, 0xfff6e8, 1.1, 0.2); // the front and its white-hot heart (leading edge sits just ahead of the hit line)
    const pool = new THREE.Mesh(FX.ringGeo ||= new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0, blending: add, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.scale.set(0.9, 0.5, 1); pool.position.y = 0.04; g.add(pool); // light thrown on the floor
    const scar = new THREE.Mesh(FX.lineGeo ||= (() => { const p = new THREE.PlaneGeometry(1, 1); p.translate(0.5, 0, 0); return p; })(), new THREE.MeshBasicMaterial({ map: FX.lineTex ||= lineCrackTex(), color: col, transparent: true, opacity: 0.7, blending: add, depthWrite: false, side: THREE.DoubleSide }));
    scar.rotation.x = -Math.PI / 2; scar.position.set(x, y + 0.035, 0.3); scar.scale.set(0.01, 0.7, 1); room.group.add(scar);
    g.position.set(x, y, 0.3); room.group.add(g); if (!friendlyDmg) audio.play('rock_wall_1', 0.5);
    const dust = SHOCK_DUST[elem] || 0x7a6e60; this.fx.cracks(x, y, friendlyDmg ? 1 : 1.5, 0x1a1410); this.fx.dust(x, y, dust); this.fx.ring(x, y + 0.05, col, friendlyDmg ? 2 : 3, true); // where it tore free
    this.waves.push({ m: g, scar, x, x0: x, y, dir, t: 0, room, dmg: friendlyDmg || Math.round(src.T.dmg * 0.8 * src.dmgMul), col, dust, chip: elem === 'ice' ? 0xe8f8ff : 0x4a4038, ch: friendlyDmg ? 1.1 : 1.35, elem, src, friendly: !!friendlyDmg, hitIds: new Set(), crest: true });
  }
  updateWaves(dt) {
    const P = this.player;
    for (const w of this.waves) { w.t += dt; w.x += w.dir * (w.sp || (w.friendly ? 11 : 8.5)) * dt; w.m.position.x = w.x; const life = w.life || (w.friendly ? 0.6 : 1.9);
      if (w.crest) this.crestFx(w, life); else if (w.tide) this.tideFx(w);
      if (w.friendly) this.playerHits({ x0: w.x - 0.6, x1: w.x + 0.6, y0: w.y, y1: w.y + 1.6, attack: { hitIds: w.hitIds }, roll: { dmg: w.dmg, crit: false, elem: [] }, proj: true });
      else if (!w.hit && Math.abs(P.pos.x - w.x) < (w.tide ? 0.9 : 0.55) && P.pos.y < w.y + (w.h || 1.1) && P.pos.y > w.y - 1) { w.hit = true; P.takeHit(w.dmg, w.x - w.dir, w.elem, w.src); }
      if (w.t > life || w.x < w.room.b.x0 + 0.6 || w.x > w.room.b.x1 - 0.6 || this.activeSolids().some(s => !s.oneway && !s.gone && w.x > s.x0 && w.x < s.x1 && w.y + 0.5 > s.y0 && w.y + 0.5 < s.y1)) this.endWave(w); }
    let j = 0; for (const w of this.waves) if (!w.done) this.waves[j++] = w; this.waves.length = j;
  }
  // the crest flickers and rides up out of the floor, its scar stretches behind it; dust rolls back, chips fly, sparks of its element lift
  crestFx(w, life) {
    const [crest, core, pool] = w.m.children, d = w.dir, f = Math.min(1, w.t / 0.06) * Math.min(1, (life - w.t) / 0.25 + 0.2), fl = 1 + Math.sin(w.t * 38) * 0.07 + Math.sin(w.t * 23 + 1) * 0.05;
    crest.scale.y = w.ch * Math.min(1, 0.45 + w.t * 7) * fl; core.scale.y = crest.scale.y * 0.72; crest.material.opacity = f * (0.82 + Math.random() * 0.18); core.material.opacity = f * 0.5; pool.material.opacity = f * 0.55;
    w.scar.scale.x = (w.x - w.x0) || 0.01; w.scar.material.opacity = 0.7 * Math.max(0.3, 1 - w.t / life);
    if (per(0.8)) this.fx.spawn(w.x - d * rnd(0, 0.5), w.y + rnd(0.05, 0.3), rnd(-0.2, 0.8), -d * rnd(0.4, 1.6), rnd(0.6, 2), w.dust, rnd(0.5, 0.8), rnd(0.3, 0.55), -0.6, false);
    if (per(0.9)) this.fx.spawn(w.x + d * rnd(-0.2, 0.3), w.y + 0.1, rnd(0, 0.7), d * rnd(0.5, 3), rnd(3, 6.5), w.chip, 0.5, rnd(0.06, 0.12), 16, false);
    if (per(0.6)) this.fx.spawn(w.x - d * rnd(0, 0.3), w.y + rnd(0.2, 1.1), 0.5, d * rnd(0.5, 2), rnd(0.5, 2.5), w.col, 0.35, rnd(0.15, 0.3), 1.5);
  }
  // the tide rises out of the floor, rolls and breathes; spray streams off the lip, mist hangs, foam is left on the stones
  tideFx(w) {
    const [body, glint, foam] = w.m.children, d = w.dir, rise = Math.min(1, w.t / 0.3), b = 1 + Math.sin(w.t * 6) * 0.04;
    body.scale.y = foam.scale.y = 1.9 * rise * b; glint.scale.y = 1.6 * rise * b; foam.material.opacity = 0.75 + Math.random() * 0.25; glint.material.opacity = 0.25 + Math.sin(w.t * 9) * 0.08;
    for (let i = nPer(2); i > 0; i--) this.fx.spawn(w.x + d * rnd(0.2, 0.9), w.y + rnd(1.3, 1.9) * rise, 0.5, d * rnd(1, 3.5), rnd(0.5, 3), 0xe8f8ff, 0.45, rnd(0.15, 0.35), 7, false);
    if (per(0.35)) this.fx.spawn(w.x + d * rnd(-0.4, 0.6), w.y + rnd(0.8, 1.8), 0.6, d * rnd(0.3, 1), rnd(0.2, 0.6), 0xb8d8e8, rnd(0.8, 1.2), rnd(0.6, 1), -0.2, false);
    if (per(0.6)) this.fx.spawn(w.x - d * rnd(0.6, 2.2), w.y + 0.08, rnd(-0.5, 1), -d * rnd(0.2, 0.8), rnd(0, 0.4), 0xc8ecff, rnd(0.6, 1), rnd(0.2, 0.4), 0.5, false);
  }
  // a wave's end: the crest is gone at once, its scar cools over a breath; a tide breaks on what stopped it
  endWave(w, now) {
    w.done = true; w.room.group.remove(w.m); w.m.traverse(o => o.material?.dispose());
    if (w.tide && !now) { for (let i = 0; i < 18; i++) this.fx.spawn(w.x + rnd(-0.4, 0.4), w.y + rnd(0.3, 1.6), 0.6, -w.dir * rnd(0.5, 3), rnd(1.5, 5), Math.random() < 0.6 ? 0xf0faff : 0x9ad4f0, rnd(0.5, 0.8), rnd(0.15, 0.3), 9, false); this.fx.ring(w.x, w.y + 0.05, 0xc8ecff, 3, true); }
    const sc = w.scar; if (!sc) return; if (now) { w.room.group.remove(sc); sc.material.dispose(); return; }
    const o0 = sc.material.opacity; let t = 0; const tick = () => { t += FDT; sc.material.opacity = o0 * Math.max(0, 1 - t / 0.6); if (t < 0.6) nextTick(tick); else { w.room.group.remove(sc); sc.material.dispose(); } }; tick();
  }
  // a telegraphed eruption from the floor: a warning disc, then a column
  erupt(o) {
    const col = o.col || (o.elem ? EXTRA_COL[o.elem] || ELEM_COL[o.elem] : 0xff5030);
    const m = new THREE.Mesh(new THREE.CircleGeometry(o.w / 2 + 0.15, 24), new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(o.x, o.y + 0.05, 0.6); m.scale.set(1, 0.8, 1); this.scene.add(m); if (o.line) m.visible = false; // a line attack draws one running crack instead
    if ((o.h > 1 || o.dmg || o.quiet) && !o.line) { const r = new THREE.Mesh(FX.ringGeo ||= new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: FX.sigilTex ||= sigilTex(), color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); r.position.set(0, 0, 0.002); r.userData.R = o.w / 2 + 0.1; m.add(r); m.userData.rune = r; } // a sigil marks exactly where it will strike, turning as it tightens
    this.erupts.push({ ...o, col, m, t: 0, hitIds: new Set() });
  }
  // the thing that comes out of the floor: flame, water, stone teeth, ice, thorns or a lightning stroke
  column(e) {
    const g = new THREE.Group(), el = e.elem, x = e.x, y = e.y, w = e.w, h = Math.min(e.h, 9); g.position.set(x, y, 0.3); this.scene.add(g);
    const SP = (FX.spikes ||= spikeKit())[el], spikes = !!SP;
    if (spikes) { const n = Math.max(2, Math.round(w * 2.2)), top = Math.floor(n / 2); for (let i = 0; i < n; i++) { const hh = i === top ? h : h * (0.6 + Math.random() * 0.3), k = new THREE.Mesh(SP.geos[Math.random() * SP.geos.length | 0], SP.mat), side = i < n / 2 ? -1 : 1, rad = SP.r * (0.75 + Math.random() * 0.5);
      k.scale.set(rad * (el === 'bone' && Math.random() < 0.5 ? -1 : 1), 0.01, rad); k.position.set((i / Math.max(1, n - 1) - 0.5) * w * 0.9 + rnd(-0.12, 0.12), 0, (Math.random() - 0.5) * 0.6); k.rotation.y = Math.random() * 6.28 * (el === 'bone' ? 0 : 1); k.rotation.z = side * rnd(SP.lean[0], SP.lean[1]); k.userData.h = hh; g.add(k); } } // shards lean away from the strike line, ice fans out, bone curls
    else { const water = el === 'water', mask = water ? (FX.waterTex ||= waterColTex()) : (FX.flameMask ||= flameMaskTex()), strokes = () => { const t = (FX.strokeTex ||= strokeTileTex()).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }; /* the silhouette never moves; only the strokes inside it scroll */
      const m = new THREE.Mesh(FX.colGeo ||= (() => { const p = new THREE.PlaneGeometry(1, 1); p.translate(0, 0.5, 0); return p; })(), new THREE.MeshBasicMaterial({ map: water ? null : strokes(), alphaMap: mask, color: water ? 0x3a8ab8 : el === 'lightning' ? 0xfff6c0 : e.col, transparent: true, opacity: water ? 0.6 : 1, blending: water ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.scale.set(w * (el === 'lightning' ? 0.7 : 1.15), 0.01, 1); m.userData.h = h; m.userData.w0 = m.scale.x; m.userData.scroll = water ? 0 : 1.6; g.add(m);
      const core = new THREE.Mesh(FX.colGeo, new THREE.MeshBasicMaterial({ map: strokes(), alphaMap: mask, color: 0xffffff, transparent: true, opacity: water ? 0.35 : 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); core.scale.set(m.scale.x * (water ? 1 : 0.38), 0.01, 1); core.userData.h = h * (water ? 0.95 : 0.62); if (!water) core.material.opacity = 0.32; core.userData.scroll = water ? 1.1 : 2.2; g.add(core);
      if (!water && el !== 'lightning') for (let i = 0; i < 3; i++) after(0.12 + i * 0.09, () => this.fx.spawn(x + rnd(-w / 3, w / 3), y + h * 0.9, 0.5, rnd(-0.3, 0.3), rnd(1, 2), 0x2a1a12, 1.2, rnd(0.7, 1.1), -0.4, false)); /* smoke rolls off the crown */
      if (el === 'lightning') { m.visible = core.visible = false; this.fx.line({ x: x + rnd(-0.5, 0.5), y: y + h }, { x, y: y + 0.2 }, 0xb0c0ff); this.fx.line({ x: x + rnd(-0.8, 0.8), y: y + h * 0.8 }, { x: x + rnd(-0.3, 0.3), y: y + 0.2 }, 0x9ab0ff); this.fx.ring(x, y + 0.1, 0x9ab0ff, 3, true); this.fx.cracks(x, y, 1.4, 0x0a0a10); this.fx.spawn(x, y + 1.2, 0.8, 0, 0, 0xc8d4ff, 0.08, 3.5, 0); } // the stroke itself, a blink of light and a scorch
      if (el === 'water') for (let i = 0; i < 14; i++) this.fx.spawn(x + rnd(-w / 2, w / 2), y + h * rnd(0.8, 1), 0.7, rnd(-2.5, 2.5), rnd(1, 4), Math.random() < 0.6 ? 0xf0faff : 0x9ad4f0, rnd(0.6, 0.9), rnd(0.25, 0.5), 9, false); // a crown of foam bursts and falls
      if (el === 'water') this.fx.ring(x, y + 0.08, 0xc8ecff, 3.5, true); }
    const hold = e.hold || 0; if (e.perch) { const P = this.player, sol = { x0: x - 0.25, x1: x + 0.25, y0: y, y1: y + h * 0.82, kind: 'block', room: this.room.def.id, temp: true }; if (Math.abs(P.pos.x - x) < 0.55) P.pos.x = x + (P.pos.x < x ? -0.6 : 0.6); this.world.solids.push(sol); after(0.4 + hold, () => { const i = this.world.solids.indexOf(sol); if (i >= 0) this.world.solids.splice(i, 1); }); } // a solid palisade (dropped on the game clock, in step with the teeth sinking): penned in by the golem, or climb out over the teeth
    let t = 0; const tick = () => { t += FDT; const up = Math.min(1, t / 0.08), down = t > 0.38 + hold ? Math.max(0, 1 - (t - 0.38 - hold) / 0.22) : 1;
      for (const c of g.children) { c.scale.y = c.userData.h * up * (spikes ? 1 : (0.85 + Math.random() * 0.15)) * (spikes ? Math.sqrt(down) : 1); if (!spikes) c.material.opacity = (c.userData.o0 ??= c.material.opacity) * down; }
      if (!spikes) { for (const c of g.children) if (c.userData.scroll && c.material.map) { c.material.map.offset.y -= c.userData.scroll * FDT; if (el !== 'water') c.material.map.offset.x = Math.sin(t * (c.userData.scroll * 5) + c.userData.scroll) * 0.07; } const fl = g.children[0]; if (fl && el !== 'water') fl.scale.x = fl.userData.w0 * (1 + Math.sin(t * 22) * 0.1); } /* strokes rise inside a fixed silhouette; fire breathes */
      if (t < 0.6 + hold) nextTick(tick); else { this.scene.remove(g); if (!spikes) g.children.forEach(c => { if (c.material.map && c.material.map !== FX.strokeTex) c.material.map.dispose(); c.material.dispose(); }); } }; tick();
    if (spikes) { for (let i = 0; i < 8; i++) this.fx.spawn(x + rnd(-w / 2, w / 2), y + 0.2, 0.6, rnd(-2, 2), rnd(1, 4), el === 'ice' ? 0xd8f2ff : 0x8a8070, 0.5, 0.22, 9, false); if (el === 'stone' || el === 'bone') { this.debris(x, y + 0.4, 5, el === 'bone' ? 0xe0d4b8 : 0x6a625a, w, el === 'bone'); this.fx.cracks(x, y, w * 0.9, el === 'bone' ? 0xc0a070 : 0xff6a20); } }
  }
  // chips of stone or bone thrown up by an eruption, tumbling under gravity and settling on the floor
  debris(x, y, n, col, spread = 1, splinter = false) {
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, flatShading: true }), fy = this.floorBelow(x, y + 0.5), ch = [];
    for (let i = 0; i < n; i++) { const k = new THREE.Mesh(splinter ? (FX.splGeo ||= new THREE.BoxGeometry(0.06, 0.34, 0.06)) : (FX.rockGeo ||= new THREE.DodecahedronGeometry(0.34, 0)), mat); k.scale.setScalar(splinter ? rnd(0.8, 1.3) : rnd(0.18, 0.4)); /* bone breaks into splinters, stone into chips */ k.position.set(x + rnd(-spread / 2, spread / 2), y, rnd(0.2, 1)); this.scene.add(k); ch.push({ k, vx: rnd(-3, 3), vy: rnd(3, 7), r: rnd(-10, 10) }); }
    let t = 0; const tick = () => { t += FDT; for (const c of ch) { c.vy -= 22 * FDT; c.k.position.x += c.vx * FDT; c.k.position.y += c.vy * FDT; c.k.rotation.z += c.r * FDT; if (c.k.position.y < fy + 0.08) { c.k.position.y = fy + 0.08; c.vy *= -0.25; c.vx *= 0.5; c.r *= 0.5; } if (t > 1.2) c.k.scale.multiplyScalar(0.92); }
      if (t < 1.6) nextTick(tick); else { ch.forEach(c => this.scene.remove(c.k)); mat.dispose(); } }; tick();
  }
  updateErupts(dt) {
    const P = this.player;
    for (const e of this.erupts) {
      e.t += dt; const k = e.t / e.delay;
      if (k < 1) { e.m.material.opacity = 0.03 + k * 0.06; const r = e.m.userData.rune; if (r) { r.material.opacity = 0.3 + k * 0.6 + Math.sin(e.t * 30) * 0.08 * k; const sc = r.userData.R * (1.35 - k * 0.35); r.scale.set(sc, sc, 1); r.rotation.z += dt * (1 + k * 4); } continue; }
      if (!e.fired) { e.fired = true; if (e.m.userData.rune) e.m.userData.rune.visible = false; if (!e.quiet || e.dmg) audio.play(e.elem === 'ice' ? 'ice_wall_1' : e.elem === 'poison' ? 'squelching_4' : e.elem === 'stone' ? 'rock_wall_1' : e.elem === 'bone' ? 'bone_snap' : e.elem === 'water' ? 'waterspray_1' : e.elem === 'lightning' ? 'spell_impact_2' : 'fireball_2', 0.35); if (e.h > 1) this.column(e); const solid = ['stone', 'bone'].includes(e.elem), pc = e.elem === 'lightning' ? 0xc8b8ff : e.col; for (let i = 0; i < (e.h > 1 ? 14 : 4); i++) this.fx.spawn(e.x + rnd(-e.w / 2, e.w / 2), e.y + Math.random() * 0.5, 0.4, rnd(-0.6, 0.6), rnd(solid ? 1 : 4, (solid ? 2 : 4) + e.h * (solid ? 0.6 : 2.2)), solid ? 0x6a6258 : pc, 0.55, 0.5, solid ? 6 : 4, !solid); }
      if (e.t < e.delay + 0.3 && e.dmg) {
        if (e.friendly) this.playerHits({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y, y1: e.y + e.h, attack: { hitIds: e.hitIds }, roll: { dmg: e.dmg, crit: false, elem: [] }, proj: true });
        else if (!e.hit && Math.abs(P.pos.x - e.x) < e.w / 2 + 0.25 && P.pos.y < e.y + e.h && P.pos.y + 1.6 > e.y) { if (P.takeHit(Math.round(e.dmg), e.x, ELEM_COL[e.elem] ? e.elem : null, e.src)) e.hit = true; }
      }
      e.m.material.opacity = Math.max(0, 0.8 - (e.t - e.delay) * 2.5);
      if (e.t > e.delay + 0.4) { e.done = true; this.scene.remove(e.m); }
    }
    this.erupts = this.erupts.filter(e => !e.done);
  }
  breathCone(e, range, elem, dmg, dt) {
    const P = this.player, m = e.mouth, col = ELEM_COL[elem] || 0xff6a20, f = e.facing, down = e.air ? 1 : 0.18;
    for (let i = nPer(4); i > 0; i--) this.fx.spawn(m.x, m.y - (e.air ? 0 : 0.2), 0.5, f * rnd(7, 13), e.air ? -rnd(0, 15) + rnd(-1.2, 1.2) : rnd(-1.1, 0.9), Math.random() < 0.3 ? 0xffffff : col, rnd(0.4, 0.9), rnd(0.4, 0.9), e.air ? 6 : 0);
    e._bT = (e._bT || 0) - dt; if (e._bT > 0) return; const px = (P.pos.x - m.x) * f, lo = e.air ? e.pos.y - 14 : e.pos.y - 0.4;
    const pa = P.aabb, hit = e.air ? (px > -0.3 && px < range && pa.y1 > lo && P.pos.y < m.y - px * 0.5 + 2) : (px > -0.3 && px < range && pa.y1 > m.y - 1.2 && P.pos.y < m.y + 0.8); // crouch or slide under a ground breath, or jump clear of it
    if (hit) { if (P.takeHit(Math.round(dmg * e.dmgMul), e.pos.x, elem, e)) e._bT = 0.3; }
  }
  flameWall(e, x, fy, elem, dmg, dt, h = 3.4) {
    const col = ELEM_COL[elem] || 0xff6a20, P = this.player;
    for (let i = nPer(5); i > 0; i--) this.fx.spawn(x + rnd(-0.7, 0.7), fy + Math.random() * 0.4, 0.5, rnd(-0.5, 0.5), rnd(3, 9), Math.random() < 0.25 ? 0xffffff : col, rnd(0.3, 0.6), rnd(0.5, 1.0), 2);
    if (Math.abs(P.pos.x - x) < 1.2 && P.pos.y < fy + 1.5 && P.pos.y > fy - 1) P.takeHit(Math.round(dmg * e.dmgMul), x - e.facing, elem, e);
  }
  rainShot(e, x, fy, kind, elem, dmg) {
    this.erupt({ x, y: fy, delay: 0.75, w: 1.2, h: 0.2, dmg: 0, col: elem ? ELEM_COL[elem] : SHOT[kind]?.[0], quiet: true });
    if (kind === 'rock') { const sh = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0x000000, transparent: true, opacity: 0, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(x, fy + 0.04, 0.4); this.scene.add(sh); let t = 0; const tick = () => { t += FDT; sh.material.opacity = Math.min(0.6, t / 0.75 * 0.6); sh.scale.setScalar(1.3 - Math.min(1, t / 0.75) * 0.4); if (t < 0.95) nextTick(tick); else { this.scene.remove(sh); sh.geometry.dispose(); sh.material.dispose(); } }; tick(); } /* its shadow darkens on the floor before it lands */
    after(0.12, () => { if (!e.dead && this.room === e.room) this.shoot({ x, y: fy + 11, vx: 0, vy: -15, kind, dmg: Math.round(dmg), elem, src: e, life: 2 }); });
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
  // Malgrave's grimoire: a book that floats open over his hand, pages lit from within, until the reading is done
  openBook(e) {
    const g = new THREE.Group(), cover = new THREE.MeshStandardMaterial({ color: 0x4a1a14, emissive: 0x1a0608, roughness: 0.6 }), page = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, emissive: 0x3a2a48, roughness: 0.9, map: FX.glyphTex ||= glyphTex() }); /* pages written in violet */
    for (const sd of [-1, 1]) { const half = new THREE.Group(); half.rotation.y = sd * 0.5; const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.03), cover); c.position.x = sd * 0.25; const p = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.6), page); p.position.set(sd * 0.25, 0, 0.02); half.add(c, p); g.add(half); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xb080ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); glow.scale.setScalar(1.8); g.add(glow);
    this.scene.add(g); let live = true, t = 0; const tick = () => { if (!live || e.dead) { this.scene.remove(g); cover.dispose(); page.dispose(); return; } t += FDT; const h = (e.hand || e.root).getWorldPosition(new THREE.Vector3()); g.position.set(h.x + e.facing * 0.3, h.y + 0.9 + Math.sin(t * 3) * 0.08, 0.9); g.rotation.z = Math.sin(t * 2) * 0.1; glow.material.opacity = 0.6 + Math.sin(t * 9) * 0.2; if (per(0.5)) this.fx.spawn(g.position.x + rnd(-0.3, 0.3), g.position.y + 0.2, 1, rnd(-0.4, 0.4), rnd(0.5, 1.5), 0xd8b0ff, 0.6, 0.12, 0); nextTick(tick); }; tick();
    return { close: () => { live = false; this.fx.burst(g.position.x, g.position.y, 0xb080ff, 16, 3); } };
  }
  // Sirelle's feather cyclone: a funnel of spinning air that wanders the floor, drags you toward it and spits quills
  cyclone(e, x, fy, dir, dur) {
    const g = new THREE.Group(); for (let i = 0; i < 2; i++) { const tex = (FX.windTex ||= windTex()).clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(i ? 3 : 2, 1); const r = new THREE.Mesh(new THREE.CylinderGeometry(i ? 1.5 : 2.3, i ? 0.2 : 0.35, 4.6, 24, 1, true), new THREE.MeshBasicMaterial({ map: tex, color: i ? 0xf4efe4 : 0xc8d8f0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      r.position.y = 2.3; r.userData.tex = tex; g.add(r); } // a funnel: wider at the crown, streaming as it turns
    const fm = new THREE.MeshBasicMaterial({ map: FX.featherTex ||= featherTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide }); for (let i = 0; i < 10; i++) { const f = new THREE.Mesh(FX.featherGeo ||= new THREE.PlaneGeometry(0.55, 0.2), fm); f.userData.orb = { a: Math.random() * 6.28, h: rnd(0.3, 4.2), sp: rnd(3, 6) }; g.add(f); }
    g.position.set(x, fy, 0.2); this.room.group.add(g); this.cyclones.push({ g, e, x, fy, dir, t: 0, dur, c: 0.3, hitT: 0, room: this.room });
  }
  updateCyclones(dt) {
    const P = this.player;
    for (const c of this.cyclones) {
      c.t += dt; const rb = c.room.b; c.x += c.dir * 3.2 * dt; if (c.x < rb.x0 + 1.5 || c.x > rb.x1 - 1.5) c.dir *= -1; c.g.position.x = c.x;
      const fade = Math.max(0, Math.min(1, c.t * 3, (c.dur - c.t) * 2)); c.g.children.forEach((r, i) => { const o = r.userData.orb; if (o) { o.a += dt * o.sp; const rad = 0.35 + o.h * 0.42; r.position.set(Math.cos(o.a) * rad, o.h + Math.sin(c.t * 2 + o.a) * 0.2, Math.sin(o.a) * rad * 0.6); r.rotation.z = o.a * 2; r.material.opacity = fade; return; }
        r.rotation.y += dt * (i ? 7 : 4.5); r.userData.tex.offset.y -= dt * (i ? 1.6 : 1.1); r.position.x = Math.sin(c.t * 4 + i) * 0.12; r.material.opacity = (i ? 0.3 : 0.38) * fade; });
      if (per(0.6)) this.fx.spawn(c.x + rnd(-1.6, 1.6), c.fy + 0.1, 0.5, rnd(-1, 1), rnd(0.2, 1), 0x8a8070, 0.5, rnd(0.3, 0.5), -0.5, false); // it drags dust off the floor
      const dx = c.x - P.pos.x; if (Math.abs(dx) < 10 && Math.abs(P.pos.y - c.fy) < 6) P.push = (P.push || 0) + Math.sign(dx) * dt * 5;
      c.hitT -= dt; if (c.hitT <= 0 && Math.abs(dx) < 1.1 && P.pos.y < c.fy + 4.2 && P.pos.y > c.fy - 1) { if (P.takeHit(Math.round(c.e.T.dmg * 0.7 * c.e.dmgMul), c.x, null, c.e)) c.hitT = 0.8; }
      c.c -= dt; if (c.c <= 0 && fade > 0.5) { c.c = 0.45; c.lane = !c.lane; for (const sd of [-1, 1]) this.shoot({ x: c.x + sd * 0.8, y: c.fy + (c.lane ? 0.6 : 1.6), vx: sd * 9, vy: 0, kind: 'feather', dmg: Math.round(c.e.T.dmg * 0.5 * c.e.dmgMul), src: c.e, life: 1.6 }); audio.play('wave_attack_1', 0.2, 1.6); }
      if (c.t > c.dur || c.e.dead || this.room !== c.room) { c.done = true; c.room.group.remove(c.g); c.g.children.forEach(r => { if (!r.userData.orb) { r.material.dispose(); r.geometry.dispose(); r.userData.tex.dispose(); } }); }
    }
    this.cyclones = this.cyclones.filter(c => !c.done);
  }
  // a pool of miasma (or any lingering element) over the floor: it ticks while you stand in it
  cloud(x, fy, w, dur, elem, dmg, src) {
    const col = elem === 'poison' ? 0x4a7a2a : ELEM_COL[elem] || 0x8aff5a, dark = elem === 'fire' ? 0x4a1404 : 0x1a2a10, g = new THREE.Group(); for (let i = 0; i < 7; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: elem === 'fire' && i % 2 ? flameTex() : glowTex(), color: i % 2 ? col : dark, transparent: true, opacity: 0, depthWrite: false, blending: i % 2 && elem === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending })); /* miasma is murk, not neon */ sp.position.set(rnd(-w / 2, w / 2), rnd(0.3, 1.4), rnd(-0.3, 0.6)); sp.scale.setScalar(rnd(1.4, 2.4)); sp.userData.ph = Math.random() * 6; g.add(sp); }
    g.position.set(x, fy, 0.3); this.scene.add(g); this.clouds.push({ g, x, fy, w, dur, elem, dmg, src, t: 0, tick: 0, room: this.room });
  }
  updateClouds(dt) {
    const P = this.player;
    for (const c of this.clouds) { c.t += dt; if (c.elem === 'poison' && per(0.25)) this.fx.spawn(c.x + rnd(-c.w / 2, c.w / 2), c.fy + 0.1, 0.6, 0, rnd(0.3, 0.8), 0x9aff6a, 0.35, rnd(0.08, 0.16), 0); /* bubbles pop at the surface */ if (c.elem === 'fire' && per(0.5)) this.fx.spawn(c.x + rnd(-c.w / 2, c.w / 2), c.fy + 0.2, 0.5, rnd(-0.3, 0.3), rnd(1, 2.5), Math.random() < 0.4 ? 0xffd060 : 0xff6a14, 0.4, 0.22, -0.5); const fade = Math.max(0, Math.min(1, c.t * 2, (c.dur - c.t) * 1.5)); c.g.children.forEach((sp, i) => { sp.material.opacity = (i % 2 ? 0.28 : 0.45) * fade; sp.position.y += Math.sin(c.t * 1.3 + sp.userData.ph) * dt * 0.2; sp.material.rotation += dt * 0.3; });
      c.tick -= dt; if (c.tick <= 0 && fade > 0.5 && Math.abs(P.pos.x - c.x) < c.w / 2 + 0.3 && P.pos.y < c.fy + 1.9 && P.pos.y > c.fy - 0.5) { c.tick = 0.5; P.takeHit(c.dmg, c.x, c.elem, c.src, true); }
      if (c.t > c.dur || this.room !== c.room) { c.done = true; this.scene.remove(c.g); c.g.children.forEach(sp => sp.material.dispose()); } }
    this.clouds = this.clouds.filter(c => !c.done);
  }
  // the Hydra heaves the cistern: a wave as tall as a man rolls the floor (jump it)
  tide(e, dir) {
    const fy = e.arenaFloor ?? e.home.y, x = e.pos.x + dir * 2, g = new THREE.Group(), mk = (map, c, sx, ox, o, add) => { const m = new THREE.Mesh(FX.colGeo ||= (() => { const p = new THREE.PlaneGeometry(1, 1); p.translate(0, 0.5, 0); return p; })(), new THREE.MeshBasicMaterial({ map, color: c, transparent: true, opacity: o, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide })); m.scale.set(sx * dir, 0.01, 1); m.position.x = -dir * ox; g.add(m); return m; };
    mk(FX.waveTex ||= waveTex(false), 0x24648e, 3.2, 0.7, 0.78); mk(FX.colTex ||= colTex(), 0x5ab8e8, 0.9, -0.1, 0.3, true); mk(FX.foamTex ||= waveTex(true), 0xeef8ff, 3.2, 0.7, 0.9, true).position.z = 0.02; // a curling body of water (not a glowing slab), light in its face, a white lip
    g.position.set(x, fy, 0.3); this.room.group.add(g);
    this.waves.push({ m: g, x, y: fy, dir, t: 0, room: this.room, dmg: Math.round(e.T.dmg * 0.9 * e.dmgMul), col: 0x8ad0ff, elem: null, src: e, hitIds: new Set(), h: 1.45, sp: 9, life: 4, tide: true });
    audio.play('waterspray_1', 0.7, 0.6); this.shake(0.4, dir, 0);
  }
  // two eyes kindle in the dark at the edge of the court: the hunt is coming from there
  huntEyes(e) { const y = e.pos.y + Math.min(e.T.h, 3) * 0.72, eyes = []; for (const d of [-0.24, 0.24]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.bandTex ||= bandTex(), color: 0xb8ff8a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.scale.set(0.7, 0.2, 1); s.material.rotation = -d * 0.9; s.position.set(e.pos.x + d, y, 1.3); this.scene.add(s); eyes.push(s); const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0x3aff2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); halo.scale.setScalar(1.1); halo.position.set(e.pos.x + d, y, 1.25); this.scene.add(halo); eyes.push(halo); }
    let t = 0; const tick = () => { t += FDT; for (const s of eyes) s.material.opacity = Math.min(1, t * 6) * (t > 0.85 ? Math.max(0, (1.05 - t) * 5) : 1) * (0.85 + Math.random() * 0.15); if (t < 1.05) nextTick(tick); else eyes.forEach(s => { this.scene.remove(s); s.material.dispose(); }); }; tick(); /* two slit eyes held a full second */ for (let i = 0; i < 6; i++) this.fx.spawn(e.pos.x + rnd(-1, 1), e.pos.y + rnd(0.2, 2), 0.6, rnd(-0.4, 0.4), rnd(0, 0.4), 0x3a4a3a, 1.2, rnd(0.6, 1.1), -0.3, false); }
  // whenever the hall goes dark the hero carries a small light of their own: you never lose yourself in an eclipse
  soulLight() {
    const d = this.darken || 0, P = this.player; if (!this._soul) { if (d < 0.02) return; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffc890, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.scale.setScalar(1.3); const pool = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xc8d8ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.scale.set(1, 0.5, 1); this.scene.add(s, pool); this._soul = { s, pool }; }
    const { s, pool } = this._soul; s.position.set(P.pos.x, P.pos.y + 1.1, -0.5); s.scale.setScalar(1.7 * (1 + Math.sin(this.time * 11) * 0.04 + Math.sin(this.time * 23) * 0.03)); /* a warm, flickering hearth of a light */ /* behind the body: the hero reads as a silhouette against their own light */ pool.position.set(P.pos.x, P.pos.y + 0.03, 0.4); s.material.opacity = d * 0.95; pool.material.opacity = d * 0.6; s.visible = pool.visible = d > 0.01;
  }
  // Velscour's eclipse: a black sun over his head with a burning rim, drinking light and drawing everything in
  blackSun(e, dur) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff8a20, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); m.scale.setScalar(0.1);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshBasicMaterial({ color: 0x050200, depthTest: false, transparent: true, opacity: 1, depthWrite: false })); m.add(core); core.scale.setScalar(0.42); core.renderOrder = 6; /* transparent so it sorts after the glow and stays black */
    const rim = new THREE.Mesh(FX.ringGeo ||= new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: FX.ringTex ||= ringTex(), color: 0xfff4e0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); rim.scale.setScalar(0.25); rim.renderOrder = 7; m.add(rim); // a thin white edge of fire round the dark
    const tongues = []; for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(FX.colGeo ||= (() => { const p = new THREE.PlaneGeometry(1, 1); p.translate(0, 0.5, 0); return p; })(), new THREE.MeshBasicMaterial({ map: FX.colTex ||= colTex(), color: 0xff8a20, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide })); t.rotation.z = i / 7 * 6.283; t.renderOrder = 5; t.userData.ph = Math.random() * 6; m.add(t); tongues.push(t); } // corona tongues lick out and turn
    m.material.depthTest = false; m.renderOrder = 5; m.position.set(e.pos.x, e.pos.y + Math.min(e.T.h, 3.5) + 2.6, 1.2); this.scene.add(m); this.blacks.push({ m, core, tongues, e, t: 0, dur }); return m;
  }
  updateBlack(dt) {
    for (const b of this.blacks) { b.t += dt; const k = b.t / b.dur, s = Math.min(1, b.t * 2.5) * (k > 0.9 ? (1 - k) * 10 : 1); b.m.scale.setScalar(4.2 * s * (1 + Math.sin(b.t * 9) * 0.04)); b.m.material.opacity = 0.9;
      b.tongues.forEach((t, i) => { t.rotation.z += dt * 0.4; const l = 0.22 + 0.16 * Math.sin(b.t * 5 + t.userData.ph) + 0.08 * Math.sin(b.t * 13 + i); t.scale.set(0.09, l, 1); t.position.set(Math.cos(t.rotation.z + Math.PI / 2) * 0.2, Math.sin(t.rotation.z + Math.PI / 2) * 0.2, 0); });
      if (per(0.9)) { const a = Math.random() * 6.28, r = rnd(2.5, 4.5), x = b.m.position.x, y = b.m.position.y; this.fx.spawn(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.3, -Math.cos(a) * r * 1.6, -Math.sin(a) * r * 1.6, Math.random() < 0.5 ? 0xff7a20 : 0xffd080, 0.6, 0.18, 0); }
      if (k >= 1 || b.e.dead) { b.done = true; this.scene.remove(b.m); this.fx.burst(b.m.position.x, b.m.position.y, 0xff8a20, 30, 6); this.fx.ring(b.m.position.x, b.m.position.y, 0xffb040, 8); } }
    this.blacks = this.blacks.filter(b => !b.done);
  }
  windPush(e, amt) { const P = this.player; P.push = (P.push || 0) + Math.sign(P.pos.x - e.pos.x || 1) * amt; for (let i = amt > 2 ? 3 : nPer(3); i > 0; i--) this.fx.spawn(e.pos.x + rnd(-2, 2), e.pos.y + rnd(0, 4), 0.5, Math.sign(P.pos.x - e.pos.x) * rnd(8, 14), 0, 0xc0d0e8, 0.5, 0.4, 0); }
  guardRing(e) { this.fx.ring(e.pos.x, e.pos.y + 0.04, 0x8ab0ff, 4, true); }
  burnThorns(t) {
    t.gone = true; this.flags[t.key] = true; this.slowMo(0.5); audio.play('fire_big', 0.6); audio.play('firespray_1', 0.5);
    // it shrivels over 0.8 s of game time (slowed by the slow-mo it starts, frozen by a menu), ~100 embers a second
    let k = 0; const tick = () => { k = Math.min(1, k + FDT / 0.8); t.mesh.scale.setScalar(Math.max(0.01, 1 - k)); t.mesh.position.y = -k * 2; for (let i = nPer(1.7); i > 0; i--) this.fx.spawn(t.x0 + Math.random() * 1.6, t.y0 + Math.random() * 4, 0.4, (Math.random() - 0.5), 2 + Math.random() * 2, Math.random() < 0.5 ? 0xff6a10 : 0xffc040, 0.7, 0.35, -2); if (k >= 1) t.mesh.visible = false; else nextTick(tick); }; nextTick(tick);
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
  after(sec, fn) { after(sec, fn); } // the game-clock delay for enemies.js (a method name doesn't shadow the module's after())
  feel(name, k) { this.input.pads.rumble(name, k); } // controller rumble (gamepad.js FEEL); silent unless a pad is in play
  levelUp(lvl) { const P = this.player; this.ui.roomName(`LEVEL ${lvl}`, 2200); this.ui.toast(pick({ touch: '3 attribute points to spend — open the pack and tap +', kb: '3 attribute points to spend — open the pack (I), press 1-4', pad: '3 attribute points to spend — open the pack ({MENU}), press {Y}' }), 'rare'); audio.play('firebuff_1', 0.5); this.feel('level'); this.fx.ring(P.pos.x, P.pos.y + 1, 0xffd84a, 7); this.fx.burst(P.pos.x, P.pos.y + 1, 0xffd84a, 40, 6); }

  onEnemyDeath(e) {
    const P = this.player, T = e.T, echo = P.d.echo;
    if (e.summoner) { P.gainXP(Math.round(T.xp * 0.15)); return; }
    P.stats.kills++;
    P.gainXP(Math.max(1, Math.round(T.xp * (e.spec.horde ? 0.6 : 1) * THREE.MathUtils.clamp(1 + (T.lvl - P.stats.lvl) * 0.12, 0.2, 2.2)))); // a room's company (horde.js) is worth a little less, so the extra foes don't race the levels
    if (echo === 'vampire') P.heal(Math.round(P.stats.hpMax * 0.05));
    if (echo === 'harvest') { P.stats.mp = Math.min(P.stats.mpMax, P.stats.mp + 4); this.dropLoot(e.pos.x, e.pos.y + 1, { gold: 4 + T.lvl * 3 }, e.room); }
    if (echo === 'nova') { this.fx.ring(e.cx, e.cy, 0x7ad8ff, 6); audio.play('ice_freeze_2', 0.4); for (const o of this.room.enemies) if (!o.dead && o !== e && Math.hypot(o.cx - e.cx, o.cy - e.cy) < 4.5) { o.chill = 4; o.damage(Math.round(6 + P.stats.lvl * 3), 'ice', true); } }
    const again = !e.key || this.slain.has(e.key), drop = e.spec.drop === 'potion' && !again ? { potion: true } : rollDrop(Math.max(1, T.lvl), P.d.mf, { respawn: (again || !!e.spec.horde) && !e.boss }); /* the company drops lean, like a respawn */ if (e.key) this.slain.add(e.key); // tables: items.js rollDrop; a foe killed before (this.slain) drops lean
    if (drop) after(0.5, () => this.dropLoot(e.pos.x, e.pos.y + 1, drop, e.room));
    if (e.boss) {
      this.flags[e.key] = true; this.unseal(); $('bossBar').classList.add('hidden'); this.bossE = null;
      for (const o of e.room.enemies) if (o.summoner === e && !o.dead) { o.dead = true; o.gone = true; o.root.visible = false; this.fx.burst(o.cx, o.cy, 0xb070ff, 20, 4); }
      for (const s of this.shots) if (!s.friendly) s.life = 0; for (const s of this.suns) s.t = 99; for (const er of this.erupts) if (!er.friendly) er.dmg = 0;
      this.ui.roomName(T.title || `${T.name.toUpperCase()} — SLAIN`, 4200); this.slowMo(1.4); this.flash(); audio.play('firebuff_1', 0.7); audio.music(MUSIC[e.room.def.theme] || 'ambient_3', 0.3);
      const tier = T.tier;
      after(0.42, () => { // the spoils fall as the slow-motion lifts (1.4 s real at x0.3 = 0.42 s of game time)
        this.dropLoot(e.pos.x - 1.2, e.pos.y + 1.4, tierItem(tier + 1, 'rare'), e.room); this.dropLoot(e.pos.x + 1.2, e.pos.y + 1.4, tierItem(tier + 1, Math.random() < 0.5 ? 'rare' : 'magic'), e.room);
        this.dropLoot(e.pos.x, e.pos.y + 1.6, e.mini ? { up: Math.random() < 0.5 ? 'life' : 'mana' } : makeGem(DROP_GEMS[Math.random() * DROP_GEMS.length | 0]), e.room); this.dropLoot(e.pos.x + 0.5, e.pos.y + 1.2, { gold: 60 * tier * tier }, e.room);
        if (T.bell && e.room.def.bell && !P.has(T.bell)) { this.spawnBell(e.room); this.ui.toast('A bell wakes somewhere in the hall…', 'unique'); }
        if (T.final) this.ending();
      });
    }
  }
  bossStart(e) {
    const r = e.room, b = r.b; this.bossE = e; let fl = -1e9; for (const s of r.solids) if (!s.oneway && !s.gone && s.kind !== 'ceil' && s.kind !== 'gate' && e.home.x > s.x0 && e.home.x < s.x1 && s.y1 <= e.home.y + 0.5 && s.y1 > fl) fl = s.y1; e.arenaFloor = fl > -1e8 ? fl : e.home.y;
    $('bossBar').classList.remove('hidden'); $('bossName').textContent = (e.spec.name || e.T.name).toUpperCase(); this.bossUpdate(e);
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
    after(5.2, () => { this.cine = true; this.ui.ending(`The hollow sun gutters out. Above Castle Velscour, for the first time in an age, seven bells ring.`, [['Level', s.lvl], ['Castle explored', pct + '%'], ['Secrets found', `${this.world.rooms.filter(r => r.def.secret && this.visited.has(r.def.id)).length} / ${this.world.rooms.filter(r => r.def.secret).length}`], ['Foes slain', s.kills], ['Time', `${Math.floor(mins / 60)}h ${mins % 60}m`]]); audio.music('intro_cursed_citadel', 0.5); audio.play('title_bells', 0.8); }); // on the game clock, like the rest of the fall
  }
  onPlayerDeath() {
    audio.play('wilhelm_scream', 0.25); this.feel('death'); this.ui.roomName('YOU HAVE PERISHED');
    // where the purse falls: here if it's honest ground, else the last safe footing (not in the lava that killed you)
    const D = this.player, fy = this.floorBelow(D.pos.x, D.pos.y + 0.5), sf = this.safeAt, spot = fy > D.pos.y - 3 && !this.hazardAt(D.pos.x, fy + 0.05) ? { room: this.room.def.id, x: D.pos.x, y: fy } : sf ? { room: sf.room, x: sf.x, y: sf.y } : null;
    // the fade and the wake are on the game clock: a menu opened over the body holds them (they were wall-clock timers). Each death
    // has its number (deathSeq): bumping it calls a queued fade and wake off (the capture kit's boss frames keep the hero standing)
    const seq = this.deathSeq = (this.deathSeq || 0) + 1;
    after(1.8, () => { if (seq === this.deathSeq) $('fade').style.opacity = 1; });
    after(2.6, async () => {
      if (seq !== this.deathSeq) return;
      const P = this.player; P.state = 'free'; P.inv = 1.5; P.vel.set(0, 0); P.layers.lower.cur = P.layers.upper.cur = null; P.sunk = false;
      const save = this.readSave(); let rm = (save && this.world.byId(save.room)) || this.world.rooms.find(r => r.def.start);
      if (save) { const lost = Math.round(P.stats.gold * 0.25), old = this.purse; P.stats.gold -= lost; // the lost quarter drops as a purse where you fell: recoverable once
        if (old) { for (const L of this.loot) if (L.item.purse) L.room.group?.remove(L.grp); this.loot = this.loot.filter(L => !L.item.purse); } // dying again before reaching it: that purse is gone
        this.purse = lost && spot ? { ...spot, gold: lost } : null;
        if (lost || old) setTimeout(() => this.ui.toast((old ? `Your earlier purse is lost to the dark. ` : '') + (!lost ? '' : this.purse ? `${lost} gold spilled where you fell — go back for it.` : `${lost} gold slipped away in the dark.`), old ? 'rare' : ''), 800); }
      await this.ensureRoom(rm); P.refreshStats(); P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax;
      if (rm.saveAt) P.pos.set(rm.saveAt.x, rm.saveAt.y); else P.pos.set(rm.b.x0 + (rm.def.start?.x ?? 5), rm.b.y0 + (rm.def.start?.y ?? 0.5));
      const old = this.room; this.room = null; if (old) { old.group.visible = false; this.leaveRoom(old); for (const e of old.enemies) if (e.dead && !e.boss) e.reset(); }
      await this.enterRoom(rm, true); $('fade').style.opacity = 0;
      const pr = this.purse && this.world.byId(this.purse.room); if (pr?.live) this.placePurse(pr); // (an unloaded room lays it when it is raised again)
    });
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
    if (r.saveAt && Math.abs(P.pos.x - r.saveAt.x) < 1.8 && Math.abs(P.pos.y - r.saveAt.y) < 1) { P.state = 'sit'; P.stats.hp = P.stats.hpMax; P.stats.mp = P.stats.mpMax; P.stats.potions = Math.max(P.stats.potions, this.potionCap()); /* a rest fills every flask: the coffin is the supply, not the trash */ P.poisoned = 0; this.reforgeRelics(); this.save(r); audio.play('firebuff_2', 0.5); this.ui.toast('Your vigor returns. Progress recorded.', 'unique'); return; }
    if (r.warpAt && Math.abs(P.pos.x - r.warpAt.x) < 1.8 && Math.abs(P.pos.y - r.warpAt.y) < 1) { const list = this.world.rooms.filter(o => o.def.warp && this.flags['warp:' + o.def.id] && o !== r); if (!list.length) this.ui.toast('The mirror is dark. Its twins lie deeper in the castle.', 'magic'); else this.ui.openMenu('warp', list); return; }
    if (r.shopAt && Math.abs(P.pos.x - r.shopAt.x) < 2.2 && Math.abs(P.pos.y - r.shopAt.y) < 1) { this.ui.openMenu('shop'); return; }
    for (const c of r.chests) if (!c.opened && Math.abs(P.pos.x - c.x) < 1.4 && Math.abs(P.pos.y - c.y) < 1) { c.open(); return; }
  }
  promptFor() {
    const P = this.player, r = this.room;
    let t = '', ctx = ''; const near = (o, d = 1.8) => o && Math.abs(P.pos.x - o.x) < d && Math.abs(P.pos.y - o.y) < 1, key = pick({ touch: '', kb: 'E — ', pad: '{Y} ' });
    if (near(r.saveAt)) { t = key + 'Rest at the coffin (heal & save)'; ctx = 'REST'; }
    else if (near(r.warpAt)) { t = key + 'Step through the mirror'; ctx = 'TOUCH'; }
    else if (near(r.shopAt, 2.2)) { t = key + 'Trade'; ctx = 'TRADE'; }
    else if (r.chests.some(c => !c.opened && near(c, 1.4))) { t = key + 'Open the chest'; ctx = 'OPEN'; }
    else for (const l of r.def.lore) if (Math.abs(P.pos.x - (r.b.x0 + l.x)) < 3 && (l.y === undefined || Math.abs(P.pos.y - (r.b.y0 + l.y)) < 3)) t = l.text.replace('{jump}', pick({ touch: 'JUMP', kb: 'SPACE', pad: '{A}' })).replace('{dash}', pick({ touch: 'DASH', kb: 'SHIFT', pad: '{RT}' }));
    if (!t && this.tutorial) return; // a standing tutorial line yields to anything the room has to say
    this.ctxAction = ctx; // touch: shows the USE button
    if (t !== this._pt) { this._pt = t; this.ui.prompt(t); }
  }

  // ------------------------------------------------------------------ loop
  // One fixed step of the world (Game.start and sim() both run it at 1/60 s). It moves the camera but draws nothing: draw() does.
  step(dt) {
    this.frame = (this.frame || 0) + 1;
    if (this.stopT > 0 && this.room && !this.loading && !this.cine && !this.ui.open) { this.stopT -= dt; this.quiver(); this.cam(0, dt); return; }
    let inp = this.input.poll(); const P = this.player;
    if (this.loading || !this.room) { return; }
    if (this.cine) { if (!this.ui.open) runTicks(dt); this.cam(0, 0); if (this.ui.open) for (const k of this.input.menuKeys) this.ui.menuKey(k); return; }
    if (inp.invP) this.ui.toggle('inv'); else if (inp.mapP) this.ui.toggle('map');
    if (this.ui.open) { for (const k of this.input.menuKeys) if (!['KeyI', 'Tab', 'KeyM'].includes(k)) this.ui.menuKey(k); this.cam(0, 0); return; }
    if (this.slowT > 0) { this.slowT -= dt; dt *= 0.3; }
    K60 = dt * 60; this.time += dt; this.playTime += dt;
    if (this.stopT > 0) { this.stopT -= dt; this.quiver(); this.cam(0, dt); return; }
    this.stopVictim = null;
    if (inp.interactP && !inp.attackP && P.onGround && P.state === 'free') this.interact(); // Up + Attack is the mana art, not a doorbell
    // the flask: the charge is spent (and poison purged) at the first sip; the 40% lands only when the 0.55 s drink ends. A blow
    // while you drink spills it: you stood still in reach, and paid the flask for it. Chip, poison and burning ticks don't (they
    // never stagger you): only a blow that puts you in the hurt state does.
    if (inp.potionP && P.stats.potions > 0 && P.stats.hp < P.stats.hpMax && P.state === 'free' && !(P.drinkT > 0)) { P.stats.potions--; P.poisoned = 0; P.drinkT = 0.55; P.drinkHp = P.stats.hp; P.attack = null; audio.play('glass_ping_small', 0.45, 0.8); }
    if (P.drinkT > 0) {
      if (P.state === 'dead') P.drinkT = 0;
      else if (P.state === 'hurt') { P.drinkT = 0; audio.play('glass_ping_small', 0.6, 0.55); this.ui.dmg(P.pos.x, P.pos.y + 2.6, 'SPILLED', 'player'); for (let i = 0; i < 10; i++) this.fx.spawn(P.pos.x + P.facing * 0.3, P.pos.y + 1.3, 0.6, rnd(-2, 2), rnd(0.5, 3), 0xd02038, rnd(0.4, 0.6), rnd(0.12, 0.22), 9, false); }
      else { P.drinkT -= dt; inp = { ...inp, x: 0, jumpP: false, attackP: false, dashP: false, shield: false }; /* drinking roots you for a breath */
        if (P.drinkT <= 0) { P.drinkT = 0; P.heal(Math.round(P.stats.hpMax * 0.4)); audio.play('heart_collect', 0.5); this.feel('heal'); this.fx.burst(P.pos.x, P.pos.y + 1.1, 0xff5a6a, 10, 1.6); } }
    }
    runTicks(dt);
    this.world.update(this.time, dt, this.room, this.camPos);
    P.update(dt, inp);
    const r = this.world.roomAt(P.pos.x, P.pos.y + 0.9); if (r && r !== this.room) { this.enterRoom(r); if (this.loading) return; }
    if (this.room.bellObj) { const o = this.room.bellObj; o.piv.rotation.z = Math.sin(this.time * 2.4) * 0.22; o.glow.material.opacity = 0.55 + Math.sin(this.time * 3) * 0.2; if (Math.abs(P.pos.x - o.x) < 1.1 && Math.abs(P.pos.y - o.y) < 2 && P.state !== 'dead') this.ringBell(this.room); }
    for (const e of this.room.enemies) if (!e.gone) e.update(dt, P);
    this.updateHazards(dt); this.updateLoot(dt); this.updateShots(dt); this.updateWaves(dt); this.updateErupts(dt); this.updateSuns(dt); this.updateCyclones(dt); this.updateBlack(dt); this.updateClouds(dt); this.crackTells(dt); this.fx.update(dt); this.promptFor();
    if (this.seals.length) this.sealMat.opacity = 0.4 + Math.sin(this.time * 6) * 0.2;
    this.cam(dt);
  }
  // the foe that took the blow trembles through the hit-stop (sync() puts it back on the next step)
  quiver() { const v = this.stopVictim; if (v && !v.gone && v.root) v.root.position.x = v.pos.x + (Math.random() - 0.5) * 0.08; }

  // the great foe the camera keeps whole: the one you're fighting, or a dormant one you've walked up to
  framed() {
    const B = this.bossE; if (B && !B.dead && B.room === this.room) return B;
    const P = this.player; let best = null, bd = 13;
    for (const e of this.room.enemies) if (e.boss && !e.dead && !e.gone && !e.summoner && !e.spec.illusion) { const d = Math.abs(e.pos.x - P.pos.x); if (d < bd && Math.abs(e.pos.y - P.pos.y) < 9) { bd = d; best = e; } }
    return best;
  }
  // The camera (once per step): follows the pilgrim, frames a fight, then takes the shake. sdt runs the shake on through a hit-stop.
  cam(dt, sdt = dt) {
    const P = this.player, b = this.room.b, cam = this.camera, def = this.room.def, tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    if (!isFinite(this.camPos.x) || !isFinite(this.camPos.y)) this.snapCam = true;
    // height holds on the last footing; a jump only moves the frame once it climbs out of a band, a fall follows at once
    if (P.onGround || this.footY === undefined || this.snapCam) this.footY = P.pos.y;
    let fy = this.footY; if (P.pos.y > fy + 1.6) fy = P.pos.y - 1.6; if (P.pos.y < fy) { fy = P.pos.y; this.footY = fy; }
    let wantZ = def.vista || CAMZ; if (def.vistaAt && P.pos.x - b.x0 > def.vistaAt.x) wantZ = def.vistaAt.z;
    // a great foe: frame the pilgrim and the whole of it (wings, tail, crown, the gap between) with ~2 m to spare by pulling back,
    // but never wider than the hall. Its width is the model's (visW, cached at load), not the hitbox: a wyrm's tail runs metres past T.w.
    // The pull-back stops at 20 (BOSS_Z), 19 on a phone (LOW_MEM, or a screen under 500 px tall): at 24 the pilgrim was a tenth of
    // the frame's height, ~40 px of dark armour on an 812×375 phone. Four-legged and winged foes were allowed 24 and the rest 22;
    // every great foe now shares the cap, so a lesser one never gets the wider frame. A flier's height is its posed crown (crH:
    // raised wings and head, measured in enemies.js), not T.h; the tallest frame this hall allows is told back to the foe
    // (bossSpan, from the capped zMax), which keeps its climbs low enough to stay in it with you.
    const boss = this.framed(); let bx0, bx1, by0, by1;
    if (boss) { const half = Math.max(boss.T.w * 0.6, (boss.visW || 0) * 0.55), top = boss.pos.y + Math.max(boss.T.h * (boss.T.quad ? 0.85 : 1), boss.crH || 0) + 0.6;
      bx0 = Math.min(P.pos.x, boss.pos.x - half) - 2; bx1 = Math.max(P.pos.x, boss.pos.x + half) + 2; by0 = Math.min(fy, boss.pos.y) - 1; by1 = Math.max(fy + 2.8, top + 0.4);
      const need = Math.max((by1 - by0) / 2 / tanH, (bx1 - bx0) / 2 / (tanH * cam.aspect)) + 0.6, fit = Math.min((b.x1 - b.x0) / 2 / (tanH * cam.aspect), (b.y1 - b.y0 + (def.open ? 6 : 1)) / 2 / tanH);
      const zMax = Math.min(Math.max(CAMZ, fit), LOW_MEM || innerHeight < 500 ? 19 : 20); this.bossSpan = 2 * tanH * (zMax - 0.6);
      wantZ = Math.max(wantZ, Math.min(Math.max(13, need), zMax)); }
    // high over a lava pool (a basalt stack up to 10 m above it) the frame pulls back, to 20 at most, until the stack's top and the
    // lava's surface fit together: the surface 1.8 m above the frame's foot, the frame's top 3.6 m over his feet (ty below)
    const pool = (def.lava || []).find(l => { const lx = b.x0 + l.x, top = b.y0 + l.y + l.h; return P.pos.x > lx - 3 && P.pos.x < lx + l.w + 3 && fy > top && fy - top < 10; }), poolTop = pool && b.y0 + pool.y + pool.h;
    if (pool && !boss) wantZ = Math.max(wantZ, Math.min(20, (fy - poolTop + 5.4) / 2 / tanH + 0.4));
    // a snapped frame (a new room, a respawn) takes its distance at once too, or it opened on a close shot that pinned the pilgrim
    // to an edge until the pull-back caught up; a fight pulls back faster than it closes in
    if (this.snapCam) this.camZ = wantZ; else this.camZ += (wantZ - this.camZ) * Math.min(1, dt * (boss && wantZ > this.camZ ? 2.5 : 1.5));
    const halfH = tanH * this.camZ, halfW = halfH * cam.aspect;
    // look-ahead follows running, not facing, and eases slowly: turning to fight no longer swings the frame
    const run = Math.abs(P.vel.x) > 1 && P.state !== 'backdash' ? Math.sign(P.vel.x) : 0; this.lookX ||= 0; if (run) this.lookX = (this.lookX || 0) + (run * 1.6 - (this.lookX || 0)) * Math.min(1, dt * 1.6); // standing still keeps the last offset: no drift after every stop
    let tx = P.pos.x + this.lookX, ty = fy + (def.open ? 2.6 : 1.5); // open air: give the sky and the castle more of the frame
    if (def.vistaAt && P.pos.x - b.x0 > def.vistaAt.x) ty += 2.2; // and lift it to take in the barbican's crown
    // lava rooms sit the frame 1.5 m lower, and over a pool keep its surface clearly in the shot, 1.8 m above the frame's foot (not
    // just its glow on the stacks; it was 0.5 m, and only from stacks under 6 m); the pilgrim's head still wins if both can't fit:
    // the frame's top stays 3.6 m over his feet (at 2.4 his head sat ~0.6 m under the edge, and a jump took it out of the frame)
    if (def.theme === 'magma' || def.lava?.length) { ty -= 1.5; if (pool) ty = Math.max(fy + 3.6 - halfH, Math.min(ty, poolTop - 1.8 + halfH)); }
    if (boss) { tx = boss === this.bossE && boss.state === 'intro' && boss.t < 2 && boss.phase === 1 ? boss.pos.x - boss.facing * 1.2 : (bx0 + bx1) / 2; ty = (by0 + by1) / 2 + 0.3;
      const mx = Math.min(2, halfW * 0.3); tx = Math.max(P.pos.x - halfW + mx, Math.min(P.pos.x + halfW - mx, tx)); ty = Math.max(fy + 2.6 - halfH, Math.min(fy + halfH - 0.6, ty)); } // if the pair can't both fit, the foe gives way, never the pilgrim
    tx = (b.x1 - b.x0) <= halfW * 2 ? (b.x0 + b.x1) / 2 : Math.max(b.x0 + halfW, Math.min(b.x1 - halfW, tx));
    const lo = b.y0 + halfH - (def.open ? 0.7 : 0.35), hi = Math.max(lo, b.y1 - halfH + (def.open ? 6 : 0.2));
    ty = Math.max(lo, Math.min(hi, ty));
    // last, over every rule above (the lava's, a fight's, the ceiling's): the pilgrim is never cut. His crown keeps 1.2 m of headroom,
    // mid-jump too, and his feet stay in the frame (a frame is always far taller than the 3.3 m this needs)
    ty = Math.max(Math.min(ty, P.pos.y - 0.3 + halfH), P.pos.y + 1.8 + 1.2 - halfH);
    if (this.snapCam) { this.camPos.set(tx, ty); this.snapCam = false; }
    else { const k = 1 - Math.exp(-dt * 6); this.camPos.x += (tx - this.camPos.x) * k; this.camPos.y += (ty - this.camPos.y) * (1 - Math.exp(-dt * 4)); }
    this.shakeCam(sdt); const sx = this._sx, sy = this._sy;
    cam.position.set(this.camPos.x + sx, this.camPos.y + 0.45 + sy, this.camZ); cam.lookAt(this.camPos.x + sx, this.camPos.y + sy, 0);
    this.edgeMark(boss, dt, halfH, halfW);
    this.backRim.position.set(this.camPos.x + 2, this.camPos.y + 1, -12); this.backRim.target.position.set(this.camPos.x, this.camPos.y, 0);
    this.camFill.position.set(this.camPos.x + 3, this.camPos.y + 4, 14); this.camFill.target.position.set(this.camPos.x, this.camPos.y, 0);
    if (this.room.theme.sky) { this.moon.position.set(this.camPos.x - 10, this.camPos.y + 16, 6); this.moon.target.position.set(this.camPos.x, this.camPos.y - 2, -1); } else { this.moon.position.set(this.camPos.x - 15, this.camPos.y + 4.5, 3); this.moon.target.position.set(this.camPos.x, this.camPos.y, -2.5); } // indoors the moon rakes across the masonry from a window
    this.hemi.intensity = (this.amb || 0.5) * (this.room.lightning > 0 ? 3.5 : 1);
    this.soulLight(); this.darken = Math.max(0, (this.darken || 0) - dt * 0.8);
  }
  // A great foe the frame can't hold (a flier's crown above the top edge, or a body wholly off a side): a small chevron with a soft
  // glow at that edge, over the foe, so a blow from out of shot is never a surprise. Screen-sized, drawn over everything, it fades
  // in and out (0.12 s) and pulses gently. Placed on a plane just in front of the play plane (z 1.2) at the frame's edge there.
  edgeMark(boss, dt, halfH, halfW) {
    let m = this._edge;
    if (!m) {
      const sh = new THREE.Shape(); sh.moveTo(0, 0.6); sh.lineTo(0.62, -0.35); sh.lineTo(0, -0.08); sh.lineTo(-0.62, -0.35); sh.closePath(); // an arrowhead, pointing up
      const head = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0xff4a5e, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff4024, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      head.renderOrder = 21; glow.renderOrder = 20; glow.scale.setScalar(3.4); glow.position.y = 0.1;
      m = this._edge = new THREE.Group(); m.add(glow, head); m.userData = { head, glow, a: 0, ox: 0, oy: 0 }; m.visible = false; this.scene.add(m);
    }
    const U = m.userData, zp = 1.2, kz = (this.camZ - zp) / this.camZ, eh = halfH * kz, ew = halfW * kz, cx = this.camPos.x, cy = this.camPos.y, s = eh * (innerHeight < 500 ? 0.075 : 0.09), cl = THREE.MathUtils.clamp;
    let side = 0;
    if (boss && boss === this.bossE && !boss.hidden && !boss.dead && boss.room === this.room) { // only in a fight (a dormant foe waits where it stands)
      const kb = (this.camZ + (boss.T.quad ? 1 : 0)) / this.camZ, top = boss.pos.y + Math.max(boss.T.h * (boss.T.quad ? 0.85 : 1), boss.crH || 0), hw = Math.max(boss.T.w, boss.visW || 0) * 0.5; // (a quad body stands 1 m back)
      if (top > cy + halfH * kb - 0.15) { side = 1; U.ox = cl(boss.pos.x, cx - ew + s * 2.5, cx + ew - s * 2.5) - cx; U.oy = eh - s * 1.6; m.rotation.z = 0; }
      else if (boss.pos.x + hw < cx - halfW * kb || boss.pos.x - hw > cx + halfW * kb) { const l = boss.pos.x < cx; side = l ? 2 : 3; U.ox = (l ? -1 : 1) * (ew - s * 1.6); U.oy = cl(boss.cy, cy - eh + s * 2.5, cy + eh - s * 2.5) - cy; m.rotation.z = l ? Math.PI / 2 : -Math.PI / 2; }
    }
    U.a += ((side ? 1 : 0) - U.a) * Math.min(1, dt * 8); m.visible = U.a > 0.01;
    if (!m.visible) return;
    m.position.set(cx + U.ox, cy + U.oy, zp); m.scale.setScalar(s); // (kept on the last spot, as an offset from the frame, while it fades)
    const p = 0.75 + Math.sin((this.time || 0) * Math.PI * 3) * 0.25; U.head.material.opacity = U.a * p; U.glow.material.opacity = U.a * p * 0.5; // a 1.5 Hz pulse, in the boss bar's red
  }
  // Trauma shake: the frame moves with trauma squared, so a dagger tick barely stirs it and a slam rocks it. Smooth noise (summed
  // sines near 25 Hz, not white jitter) runs mostly along the blow's axis, plus a sprung kick along the hit that settles in ~0.2 s.
  shakeCam(sdt) {
    const K = this.kick; this.trauma = Math.max(0, this.trauma - sdt * 1.4); this.shT += sdt;
    K.vx += (-256 * K.x - 22 * K.vx) * sdt; K.vy += (-256 * K.y - 22 * K.vy) * sdt; K.x += K.vx * sdt; K.y += K.vy * sdt;
    const q = this.trauma * this.trauma * 0.42, t = this.shT, along = q * (Math.sin(t * 157) * 0.6 + Math.sin(t * 91 + 1.3) * 0.4), across = q * (Math.sin(t * 131 + 2.1) * 0.6 + Math.sin(t * 73 + 0.4) * 0.4) * (1 - 0.65 * this.shAn);
    this._sx = this.shAx * along - this.shAy * across + K.x; this._sy = this.shAy * along + this.shAx * across + K.y;
  }
  // a tremor: `a` adds trauma (0..1); a direction (dx, dy) aims it and kicks the frame that way (`kick` metres); undirected ones
  // (slams, landings, quakes) lean vertical. The controller's rumble follows the same trauma-squared curve.
  shake(a, dx = 0, dy = 0, kick = 0) {
    this.trauma = Math.min(1, this.trauma + a);
    if (dx || dy) { const l = Math.hypot(dx, dy); this.shAx = dx / l; this.shAy = dy / l; this.shAn = 1; const k = (kick || a * 0.12) * 35; this.kick.vx += this.shAx * k; this.kick.vy += this.shAy * k; }
    else { this.shAx = 0; this.shAy = 1; this.shAn = 0.5; }
    this.feel('quake', this.trauma * this.trauma * 1.5);
  }
  // One picture per display frame, blended between the last two steps (a = 0..1) so motion stays smooth whatever the refresh rate.
  draw(a = 1) {
    if (!this.room) return;
    if (this._sz !== Math.max(2, innerWidth) + 'x' + Math.max(2, innerHeight)) this.resize();
    this.ui.hud(); this.grade.uniforms.time.value = (this.time || 0) % 100; this.grade.uniforms.dark.value = this.darken || 0;
    if (window.__norender) return;
    const L = this._ip, n = a < 0.999 && L ? this._ipN : 0;
    for (let i = 0; i < n; i++) { const r = L[i]; r.c.copy(r.o.position); if (r.p.distanceToSquared(r.c) < 4) r.o.position.lerpVectors(r.p, r.c, a); } // (a teleport or a snapped camera is not blended)
    this.composer.render();
    for (let i = 0; i < n; i++) L[i].o.position.copy(L[i].c);
  }
  // before each step: where the camera, the pilgrim, the foes and the missiles stand (reused records: no garbage per step)
  keep() {
    const L = this._ip ||= [], O = this._ipO ||= [], R = this.room; O.length = 0; O.push(this.camera, this.player.root, this._edge); // (the edge marker rides with the camera)
    if (R) { for (const e of R.enemies) if (!e.gone && e.root) O.push(e.root); for (const s of this.shots) O.push(s.m); }
    let n = 0; for (const o of O) { if (!o) continue; const r = L[n] ||= { o: null, p: new THREE.Vector3(), c: new THREE.Vector3() }; r.o = o; r.p.copy(o.position); n++; }
    this._ipN = n;
  }
  render(dt = 0) { if (!this.room) return; this.cam(dt); this.draw(); } // camera + picture now (snap() and old callers)

  // The loop: the world steps at a fixed 1/60 s from an accumulator (a quarter-step of slack keeps 60 Hz at exactly one step a
  // frame despite timer jitter); at most 4 steps a frame, so a slow phone slows the world instead of spiralling; then one draw.
  start() {
    let last = performance.now(), acc = 0;
    const loop = now => {
      acc += Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
      if (window.__pause) { acc = 0; if (this.room) this.draw(); else this.composer.render(); }
      else { let n = 0; try { while (acc > STEP * 0.75 && n < 4) { this.keep(); this.step(STEP); acc -= STEP; n++; } } catch (e) { if (!this._err) { this._err = 1; console.error(e); } acc = 0; }
        if (n >= 4 && acc > STEP) acc = 0;
        if (!this.loading) this.draw(Math.max(0, Math.min(1, acc / STEP))); }
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
window.lineup = async (types, pose, gap = 5) => { await tp('lowerhall', 8, 0.5, 5); const r = game.room; for (const e of r.enemies) r.group.remove(e.root); r.enemies = []; let x = 14; const out = []; for (const t of types) { const e = new Enemy(game, { t, x, y: TYPES[t].ai === 'flyer' ? 2.5 : 0.5 }, r); await e.load(); e.update = () => {}; e.facing = -1; if (['hang', 'buried', 'under'].includes(e.state)) { e.state = 'idle'; e.root.visible = true; } e.sync(0); /* frozen foes never run update: a ceiling spider would be drawn flipped on the floor */ r.enemies.push(e); out.push(e); x += Math.max(gap, TYPES[t].w + 2.5); }
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
// ------------------------------------------------------------------ controllers: arrival, loss, title row, sound
const pads = game.input.pads, padName = id => { // "Xbox Wireless Controller (STANDARD GAMEPAD …)", "DualSense Wireless Controller Extended Gamepad", Firefox's bare "xinput"
  const n = (id || '').replace(/\s*\(.*$/, '').replace(/\s+(Extended\s+)?Gamepad$/i, '').trim(), f = padFamily(id);
  return !n || /^xinput$/i.test(n) ? (f === 'xbox' ? 'Xbox controller' : 'Controller') : n === 'Wireless Controller' && f === 'ps' ? 'DualShock 4' : n;
};
const padRow = () => { const c = $('padControls'); if (c) c.innerHTML = [['{STICK}{DPAD}', 'move'], ['{DOWN}', 'crouch'], ['{A}', 'jump'], ['{X}', 'attack'], ['{LT}', 'guard'], ['{RT}', 'dash'], ['{B}', 'potion'], ['{Y}', 'use'], ['{MENU}', 'pack'], ['{VIEW}', 'map']].map(([g, w]) => `<span>${fmt(g)} ${w}</span>`).join(''); };
onDevice(padRow); padRow();
pads.onConnect = gp => { if (document.body.classList.contains('playing')) game.ui.toast(`${padName(gp.id)} connected`, 'magic'); };
pads.onLost = gp => { // the pad went away mid-fight: hold the world still in the pack until the player is back
  if (device.kind !== 'pad') return;
  setDevice(wantsTouch() ? 'touch' : 'kb');
  if (!document.body.classList.contains('playing')) return;
  if (!game.ui.open && !game.cine && game.room) game.ui.toggle('inv');
  game.ui.toast(`${padName(gp?.id)} disconnected — the castle waits. Reconnect it, or close the pack to play on.`, 'rare');
};
// browsers only let sound start after a tap, click or key; a gamepad press doesn't count, so a pad-only start stays silent
for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) addEventListener(ev, () => audio.wake(), true);

game.load(t => $('loadMsg').textContent = t).then(() => {
  const saved = !!game.readSave(), msg = () => { $('loadMsg').innerHTML = saved ? fmt(pick({ kb: 'A pilgrim\'s rest is recorded. Enter to continue, N for a new journey.', touch: 'A pilgrim\'s rest is recorded.', pad: 'A pilgrim\'s rest is recorded. {A} to continue · {DPAD} for a new journey.' })) : ''; };
  msg(); onDevice(() => { if (!$('title').classList.contains('hidden')) msg(); });
  $('startBtn').classList.remove('hidden');
  const begin = async (fresh) => {
    const byPad = device.kind === 'pad';
    audio.resume(); removeEventListener('keydown', k); $('title').classList.add('hidden'); document.body.classList.add('playing'); $('hud').classList.remove('hidden'); if (!fresh && game.readSave()) await game.newGame(true); game.start();
    if (byPad) pads.wake(true);
    if (byPad) setTimeout(() => { if (audio.asleep()) game.ui.toast(pick({ pad: 'The castle is silent until you tap the screen or press a key once — browsers wake sound only for a touch or a key.', kb: 'Press any key to wake the sound.', touch: 'Tap to wake the sound.' }), 'magic'); }, 2600);
  };
  if (saved) { $('newBtn').classList.remove('hidden'); $('newBtn').onclick = () => { localStorage.removeItem(SAVE_KEY); begin(true); }; }
  const k = e => { if (e.code === 'Enter') begin(false); if (e.code === 'KeyN') { localStorage.removeItem(SAVE_KEY); begin(true); } };
  $('startBtn').onclick = () => begin(false); addEventListener('keydown', k);
  // pad on the title: A or Menu presses the lit button, the d-pad/stick moves between Enter and New Journey
  pads.read(); // presses made while the castle loaded don't count
  const padTitle = () => {
    if ($('title').classList.contains('hidden')) return;
    const g = pads.read(), btns = ['startBtn', 'newBtn'].map($).filter(b => !b.classList.contains('hidden'));
    let i = Math.max(0, btns.indexOf(document.activeElement));
    for (const c of g.menu) if (/^Arrow/.test(c) && btns.length > 1) { i = (i + (c === 'ArrowLeft' || c === 'ArrowUp' ? btns.length - 1 : 1)) % btns.length; btns[i].focus({ preventScroll: true }); audio.play('ui_pointer', 0.3); }
    btns.forEach((b, j) => b.classList.toggle('padfocus', device.kind === 'pad' && j === i));
    if (g.edges.has('jump') || g.edges.has('pack')) { btns[i]?.classList.remove('padfocus'); btns[i]?.click(); return; }
    requestAnimationFrame(padTitle);
  };
  requestAnimationFrame(padTitle);
}).catch(e => { console.error(e); $('loadMsg').textContent = 'Failed to load: ' + e.message; });
