import * as THREE from 'three';
import { loadGLTF, weaponModel, audio, addRim, LOW_MEM } from './assets.js';
const RIM_K = LOW_MEM ? 0.42 : 0.38; // phones are often viewed dim: a touch more edge
import { BASES, STYLES, GEMS, itemStats, isRanged, staffElem } from './items.js';
import { attackFor, FPS } from './attacks.js';
import { glowTex } from './world.js';
import { loadMoves, strideSpeed, Grip } from './moves.js';
import { swingFor, SwingRig } from './swing.js';
const STREAK = { fire: 0xff8a40, ice: 0x9fe4ff, lightning: 0xfff07a, poison: 0x9aff6a, shadow: 0xc090ff }; // a flurry's stab flash takes the blade's element

// Movement tuned from Symphony of the Night frame data (docs/research), converted at 1 SotN px ≈ 3.35 cm, 60 fps:
// walk 1.5 px/f → 4.7 m/s · jump 4.9 px/f → 9.85 m/s · double jump 4.1 px/f → 8.25 m/s · fall cap 7 px/f → 14 m/s
// backdash peak 3.5 px/f → 7 m/s · coyote 7 f → 0.117 s.
export const PHYS = { walk: 5.3, jumpV: 9.85, djumpV: 8.25, grav: 17.5, fallMax: 14, cutV: 2.5, backdash: 7.4, backdashT: 0.34, coyote: 0.117, buffer: 0.133, dashV: 13, dashT: 0.22, slideV: 9.5, slideT: 0.46, diveV: 24, kickX: 6.8, kickY: 9.4, kickLock: 0.17, wallSlide: 2.6 };
const W = 0.62, H_STAND = 1.72, H_CROUCH = 1.08, H_SLIDE = 0.9;
const UPPER = /Spine|Neck|Head|Shoulder|Arm|Hand/;
const ELEM_COLOR = { fire: 0xff5a1a, ice: 0x6ad0ff, lightning: 0xffe24a, poison: 0x6aff4a };
const WEAPON_EDGE = 0x8fb4c8; // a weapon's own cold edge-light (an element re-tints it)
// a colour held to at most 60% value (its brightest channel <= 0x99): slash effects stay tinted under the bloom, never white
const dim60 = hex => { const r = hex >> 16 & 255, g = hex >> 8 & 255, b = hex & 255, k = Math.min(1, 153 / Math.max(1, r, g, b)); return Math.round(r * k) << 16 | Math.round(g * k) << 8 | Math.round(b * k); };
const STEEL_ARC = 0x9ab0b8; // a plain blade's arc: cold steel
// great blows a shield can only soften: half of the hit comes through and the guard is knocked aside
const HEAVY = new Set(['slam', 'leap', 'ram', 'charge', 'fissure', 'forgefall', 'geyser', 'breath', 'sweep', 'eclipse']);
const PARRY = 0.15, PARRY_REST = 0.25, GUARD_BREAK = 0.5, HURT_T = 0.24, DASH_IFR = [0.03, 0.23];

const ANIM = {
  idle: 'axe_unarmed_idle', idleArmed: 'vw_guard', jog: 'vw_run', jogArmed: 'vw_run_armed',
  jump: 'axe_unarmed_jump', jumpArmed: 'sword_and_shield_jump', fall: 'falling', crouch: 'axe_crouch_idle', crouchArmed: 'sword_and_shield_crouch_idle',
  backdash: 'standing_run_back', hurt: 'sword_and_shield_impact', death: 'sword_and_shield_death', sit: 'sitting',
  block: 'sword_and_shield_block_idle', crouchBlock: 'sword_and_shield_crouch_block_idle', pickup: 'axe_unarmed_equip_over_shoulder',
  dashAir: 'standing_melee_run_jump_attack', dive: 'jump_attack', cling: 'hanging_idle', ring: 'standing_taunt_battlecry', bow: 'shooting_arrow',
};
// The jump is posed from its clip by vertical speed instead of played on a timer (frames at 30 fps):
//   rise: take-off → tuck as the climb slows · fall: apex → legs unfold and reach for the floor · land: absorb.
// The clip's opening frames are the crouched wind-up with feet planted (mid-air that read as standing on something
// invisible), and the old 'falling' clip is a head-first skydive (the dive at the end of every jump); neither is used.
const JUMP_WIN = {
  // arms: the plain jump clips keep bent, natural arms (unarmed) or the blade held ready (armed)
  axe_unarmed_jump:      { rise: [27, 34], fall: [35, 43], land: [44, 50] },
  sword_and_shield_jump: { rise: [3, 9], fall: [11, 19], land: [19, 25], tuck: 9 },
  // legs of every jump: a one-legged drive (lead knee up, trailing leg long), then the knees bend and reach for
  // the floor as it comes up (f22-30, never straight hanging legs), touch-down f30-35
  axe_unarmed_jump_running: { rise: [10, 14], fall: [19, 30], land: [30, 35] },
  // empty-handed arms in the air: the sprint's arm pump, elbows bent (the jump clips hold the arms out stiff)
  running: { rise: [6, 11], fall: [11, 17], land: [17, 21] },
  // double-jump somersault: knees to chest
  jump: { tuck: 61 },
};
const JUMP_LEGS = 'axe_unarmed_jump_running', JUMP_TUCK = 'jump';
const LAND_T = 0.16;
const NO_HIPS_POS = /jump|fall|flying|run_back|impact/;

// Right-hand weapon grip. The rig's WeaponSocket_R points its +Y back down the forearm, so blades came out of the
// pinky side and trailed behind the fist. Build the grip from the knuckles instead (these bones are direct children of
// the hand, so their hand-space positions never change): the blade runs across the fist and out of the thumb side,
// tipped a little toward the fingers, edge facing the knuckles.
export const GRIP = { tilt: 0.28, palm: 0.018, back: 0.006 };
export function makeGrip(model) {
  const hand = model.getObjectByName('mixamorigRightHand');
  const p = n => model.getObjectByName('mixamorigRightHand' + n).position.clone();
  const idx = p('Index1'), pinky = p('Pinky1'), mid = p('Middle1');
  const across = idx.clone().sub(pinky).normalize(); // pinky → index (thumb side)
  const fingers = mid.clone().normalize(); // wrist → knuckles
  const palm = new THREE.Vector3().crossVectors(across, fingers).normalize();
  if (palm.dot(p('Thumb1').sub(mid)) < 0) palm.negate(); // palm faces the thumb's side of the hand
  const blade = across.clone().multiplyScalar(Math.cos(GRIP.tilt)).addScaledVector(fingers, Math.sin(GRIP.tilt)).normalize();
  const edge = fingers.clone().addScaledVector(blade, -fingers.dot(blade)).normalize();
  const x = new THREE.Vector3().crossVectors(blade, edge);
  const g = new THREE.Group(); g.name = 'Grip_R';
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, blade, edge));
  // fist centre: on the knuckle line, pulled into the palm where the curled fingers close
  g.position.copy(idx).add(pinky).multiplyScalar(0.5).addScaledVector(palm, GRIP.palm).addScaledVector(fingers, -GRIP.back);
  hand.add(g);
  return g;
}

// Rotate a bone so the direction from it to `from` (a child's world position) points at `to` instead.
const _q = new THREE.Quaternion(), _p = new THREE.Quaternion();
function aimBone(bone, from, to) {
  const o = bone.getWorldPosition(new THREE.Vector3());
  const a = from.clone().sub(o).normalize(), b = to.clone().sub(o).normalize();
  _q.setFromUnitVectors(a, b);
  setWorldQuat(bone, _q.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
}
function setWorldQuat(bone, wq) {
  bone.parent.getWorldQuaternion(_p);
  bone.quaternion.copy(_p.invert().multiply(wq));
  bone.updateMatrixWorld(true);
}
// The hero's edge-light (assets.js addRim), plus two fixes of his own: no rim on faces turned to the floor (the boot soles
// glowed white-lavender), and a roughness floor of .35 under the packed roughness map (the breastplate's texels went
// mirror-smooth and threw an LED-like bloom glint).
function heroRim(m, rim) {
  if (!m.isMeshStandardMaterial) return m;
  addRim(m, rim); const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('rimCol * rimK * pow(', 'rimCol * rimK * smoothstep(-0.2, 0.2, inverseTransformDirection(normal, viewMatrix).y) * pow(')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, 0.35);');
  };
  m.customProgramCacheKey = () => 'rimHero' + (rim.p || 2.4); m.needsUpdate = true;
  return m;
}

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
    this.socketR = makeGrip(this.model);
    const fore = this.model.getObjectByProperty('name', 'mixamorigLeftForeArm');
    this.socketL = new THREE.Group(); fore.add(this.socketL);
    this.g.scene.add(this.root);
    // rim light that follows the hero so he reads against dark rooms
    // (no lights of his own any more: they pooled cold light on the set around him; a fresnel edge does the job)
    // x-ray: where stone stands between the camera and the hero, a cool silhouette shows through. Drawn after the room
    // (renderOrder 1) and before the hero (3), so only the room's depth is tested: never the hero's own body. While a
    // boss's body covers him it is drawn after the foes (2) as well (2.5, see animate), so he never vanishes inside a dragon.
    // A pale outline (fresnel: bright at the silhouette's edge, a faint fill inside), so it reads over a near-black dragon too.
    const XRAY = new THREE.MeshBasicMaterial({ color: 0x86a8ff, blending: THREE.AdditiveBlending, depthFunc: THREE.GreaterDepth, depthWrite: false });
    // Only its DEPTH is pulled 0.25 m toward the camera (the screen position stays put: reprojecting the moved vertex floated a
    // blue sole under each boot), so only a real occluder shows it: feet resting a few cm into the floor and the weapon in his
    // own hand no longer count. Nothing below the ankles draws at all: at a low camera pitch a sole sunk 5 cm reads as 0.3 m
    // behind the floor's top.
    this.xrayFoot = { value: -1e9 };
    const xrayShader = (fill, edge = 0.85) => sh => { sh.uniforms.uFoot = this.xrayFoot; sh.uniforms.uFill = { value: fill }; sh.uniforms.uEdge = { value: edge };
      sh.vertexShader = 'varying float vXrY; varying vec3 vXrN, vXrV;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  { vec4 q = projectionMatrix * vec4(mvPosition.xy, mvPosition.z + 0.25, 1.0); gl_Position.z = q.z / q.w * gl_Position.w; }
  vXrY = (modelMatrix * vec4(transformed, 1.0)).y; vXrV = -mvPosition.xyz;
  #if defined( USE_SKINNING ) || defined( USE_ENVMAP )
  vXrN = transformedNormal;
  #else
  vXrN = normalMatrix * normal; // a basic material only builds transformedNormal for skins (the weapon twins are plain meshes)
  #endif`);
      sh.fragmentShader = 'uniform float uFoot, uFill, uEdge; varying float vXrY; varying vec3 vXrN, vXrV;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (vXrY < uFoot) discard;')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, opacity ); { float fr = 1.0 - abs(dot(normalize(vXrN), normalize(vXrV))); diffuseColor.rgb *= uFill + uEdge * fr * fr; }'); };
    XRAY.onBeforeCompile = xrayShader(0.16);
    // over a boss's body (lit red plate, a dark hide) adding light is not enough: there it is laid over at 70% with a bright rim, a solid figure in
    // warm bone (a cold blue one vanished into a chilled boss). It stays in the OPAQUE queue (transparent:false with custom alpha
    // blending): as a transparent material it drew after the hero himself, and his own front then x-rayed his back into a hologram
    this.xrayOverMat = new THREE.MeshBasicMaterial({ color: 0xeadfcc, transparent: false, opacity: 0.7, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, depthFunc: THREE.GreaterDepth, depthWrite: false }); this.xrayOverMat.onBeforeCompile = xrayShader(0.6, 1.1); this.xrayMat = XRAY;
    const skins = []; this.model.traverse(o => { if (o.isSkinnedMesh) skins.push(o); }); this.xrays = [];
    for (const o of skins) { const x = new THREE.SkinnedMesh(o.geometry, XRAY); x.bind(o.skeleton, o.bindMatrix); x.position.copy(o.position); x.quaternion.copy(o.quaternion); x.scale.copy(o.scale); x.frustumCulled = false; x.renderOrder = 1; x.userData.xray = true; o.renderOrder = 3; o.parent.add(x); this.xrays.push(x); }
    this.trail = new Trail(this.g.scene);
    this.scarf = new Scarf(this.g.scene, this.model.getObjectByName('mixamorigNeck')); // with the body, after the x-ray: a scarf swinging past the shin is not an occluder

    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {};
    const mv = await loadMoves(); this.moves = mv.meta; // authored clips (tools/build_anims.py), bound to this rig by bone name
    for (const c of [...g.animations, ...mv.clips]) {
      const tracks = c.tracks.filter(t => !(t.name.endsWith('.position') && !t.name.includes('Hips')) && !(NO_HIPS_POS.test(c.name) && t.name.includes('Hips.position')) && !t.name.endsWith('.scale'));
      const up = tracks.filter(t => UPPER.test(t.name)), lo = tracks.filter(t => !UPPER.test(t.name));
      const game = new THREE.AnimationClip(c.name + '_g', c.duration, tracks);
      this.clips[c.name] = { full: c, game, up: this.mixer.clipAction(new THREE.AnimationClip(c.name + '_u', c.duration, up)), lo: this.mixer.clipAction(new THREE.AnimationClip(c.name + '_l', c.duration, lo)), dur: c.duration };
    }
    // stride-match the run cycles so the feet do not skate, and keep the fingers closed on whatever is held
    this.stride = {}; for (const n of [ANIM.jog, ANIM.jogArmed]) this.stride[n] = strideSpeed(this.mixer, this.model, this.clips[n].full) || 4;
    this.grip = new Grip(this.model, this.clips.vw_grip?.full); this.rig = new SwingRig(this.model);
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
    d.ias += d.dex * 1.5; d.crit += 5 + d.lck * 0.8 + d.dex * 0.3; d.mf += d.lck * 1.5;
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

  async attachVisual(slot, grip) {
    this.gearVer = (this.gearVer || 0) + 1;
    if (slot !== 'weapon' && slot !== 'offhand') return;
    const sock = slot === 'weapon' ? this.socketR : this.socketL;
    if (this[slot + 'Mesh']) { sock.remove(this[slot + 'Mesh']); this[slot + 'Mesh'] = null; }
    if (this.pairMesh) { this.pairMesh.parent?.remove(this.pairMesh); this.pairMesh = null; }
    const it = this.equip[slot]; if (!it) { if (slot === 'offhand' && this.equip.weapon) return this.attachVisual('weapon'); return; } // a freed off hand takes up a dagger's twin again
    const base = BASES[it.base]; if (!base?.model) return;
    // Socket lives under a 1.8× scaled rig; weapons are authored at true metres, so divide that scale out.
    const m = await weaponModel(base.model, base.scale / 1.8);
    if (this.equip[slot] !== it) return; // swapped again while loading
    if (this[slot + 'Mesh']) { sock.remove(this[slot + 'Mesh']); this[slot + 'Mesh'] = null; }
    if (slot === 'offhand') this.placeShield(m);
    else { // grip: normal = blade up out of the thumb side, reverse = ice-pick, forward = along the forearm (spears/lances)
      const gr = grip || attackFor(base).grip;
      if (gr === 'reverse') m.rotation.z = Math.PI; else if (gr === 'forward') m.rotation.x = Math.PI / 2;
    }
    m.traverse(o => { if (o.isMesh) o.renderOrder = 3; }); /* drawn with the body, after the x-ray pass */ sock.add(m); this[slot + 'Mesh'] = m;
    if (this.pairMesh && (slot === 'weapon' || slot === 'offhand')) { this.pairMesh.parent?.remove(this.pairMesh); this.pairMesh = null; }
    if (slot === 'weapon' && base.kind === 'dagger' && !this.equip.offhand) { const p = m.clone(true); p.rotation.z += Math.PI; p.userData.len = m.userData.len; p.userData.q0 = p.quaternion.clone(); this.socketL.add(p); this.pairMesh = p; } // daggers come in pairs: the free hand carries the twin, point down
    if (slot === 'weapon') { this.setupTwoHand(base, grip || attackFor(base).grip); this.weaponKind = base.kind; }
    // a faint cold edge-light so the blade reads against dark armour and dark rooms: a fresnel rim, not an emissive fill
    // (a flat emissive washed the steel, wood and gems out into one glowing stick); an element re-tints the rim
    // env reflection .2 and metalness <= .7: upward-facing metal mirrored the cool sky into a flat ice-blue plate
    if (slot === 'weapon') { this.wRim = { col: new THREE.Color(WEAPON_EDGE), k: 0.13, p: 4.5 }; /* tight: on a thin haft or bow limb a broad rim lit the whole stick ice-blue */ m.traverse(o => { if (o.isMesh) { const mm = o.material; mm.envMapIntensity = 0.2; if (mm.metalness !== undefined) mm.metalness = Math.min(mm.metalness, 0.7); if (mm.emissive) { if (!mm.emissiveMap) mm.emissive.setHex(WEAPON_EDGE); mm.emissiveIntensity = mm.emissiveMap ? Math.min(mm.emissiveIntensity ?? 1, 0.16) : 0.05; } addRim(mm, this.wRim); mm.userData.rim = 1; } }); }
    if (slot === 'weapon') this.applyElementFX(m, itemStats(it).elems);
    if (slot === 'weapon' && base.kind === 'scythe') m.rotation.y += Math.PI / 2; /* the hook lies in the screen plane, so the silhouette reads as a scythe */
    if (slot === 'weapon') { m.userData.q0 = m.quaternion.clone(); this.trailElem = base.kind === 'staff' ? staffElem(base.model) : it.base === 'pale_crescent' ? 'reaper' : null; } // a staff's arc burns its own colour
    this.xrayGear();
  }

  // the x-ray carries what is in his hands too (behind a boss you could see the trail but not the blade's angle): a twin of every
  // solid mesh of the weapon, its twin and the off-hand, sharing geometry, parented to it (so it follows every aim and lift)
  xrayGear() {
    for (const x of this.wxrays || []) x.parent?.remove(x); this.wxrays = [];
    const mat = this.xrayOver ? this.xrayOverMat : this.xrayMat, ro = this.xrayOver ? 2.5 : 1;
    for (const g of [this.weaponMesh, this.pairMesh, this.offhandMesh]) { if (!g) continue; const src = [];
      g.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.userData.xray && !o.userData.fx && !(o.material?.transparent) && (o.material?.blending ?? THREE.NormalBlending) === THREE.NormalBlending) src.push(o); });
      for (const o of src) { const x = new THREE.Mesh(o.geometry, mat); x.renderOrder = ro; x.frustumCulled = false; x.userData.xray = true; o.add(x); this.wxrays.push(x); } }
  }

  // Two-handed weapons: the clips are one-handed, so the left hand is pulled onto the shaft each frame (two-bone IK on the
  // left arm, pole from the animated elbow). Front-hand point: below the right fist for haft weapons (greataxe, maul),
  // ahead of it for a forward (spear) grip. The pull fades out when the clip throws the arms too far apart.
  setupTwoHand(base, grip) {
    this.twoHand = null;
    if (!this.weaponMesh || base.hands !== 2) return;
    const along = (grip === 'forward' ? 0.34 : -0.24) / base.scale; // model metres along the shaft from the grip
    this.twoHand = { local: new THREE.Vector3(0, along, 0), weight: 0 };
    if (!this.ikBones) {
      const b = n => this.model.getObjectByName('mixamorig' + n);
      this.ikBones = { arm: b('LeftArm'), fore: b('LeftForeArm'), hand: b('LeftHand'), idx: b('LeftHandIndex1'), pinky: b('LeftHandPinky1'), mid: b('LeftHandMiddle1') };
    }
  }
  twoHandIK() {
    const T = this.twoHand, B = this.ikBones, m = this.weaponMesh;
    if (!T || !m || this.state === 'dead' || this.attack?.st.freeHand) return; // a bow's draw: the string hand leaves the grip (the clip keys it)
    const V = THREE.Vector3, S = B.arm.getWorldPosition(new V()), E = B.fore.getWorldPosition(new V()), W = B.hand.getWorldPosition(new V());
    const tgt = m.localToWorld(T.local.clone());
    const a = S.distanceTo(E), c = E.distanceTo(W), d0 = S.distanceTo(tgt);
    const want = d0 < (a + c) * 1.8 ? 1 : 0; // only when the clip flings the arms far apart does the left arm go free
    T.weight += (want - T.weight) * 0.35; if (T.weight < 0.02) return;
    const keep = [B.arm.quaternion.clone(), B.fore.quaternion.clone(), B.hand.quaternion.clone()];
    const n = tgt.clone().sub(S).normalize(), d = Math.min(d0, (a + c) * 0.999);
    const pole = E.clone().sub(S); pole.addScaledVector(n, -pole.dot(n)); if (pole.lengthSq() < 1e-6) pole.set(0, -1, 0); pole.normalize();
    const cosA = Math.min(1, Math.max(-1, (a * a + d * d - c * c) / (2 * a * d)));
    const elbow = S.clone().addScaledVector(n, a * cosA).addScaledVector(pole, a * Math.sqrt(1 - cosA * cosA));
    aimBone(B.arm, E, elbow);
    aimBone(B.fore, B.hand.getWorldPosition(new V()), tgt);
    // wrap the fist round the shaft: knuckle line along the shaft, fingers curling under it
    const shaft = new V(0, 1, 0).transformDirection(m.matrixWorld);
    const hq = B.hand.getWorldQuaternion(new THREE.Quaternion());
    const across = B.idx.position.clone().sub(B.pinky.position).normalize().applyQuaternion(hq);
    if (across.dot(shaft) < 0) shaft.negate();
    const qa = new THREE.Quaternion().setFromUnitVectors(across, shaft);
    setWorldQuat(B.hand, qa.multiply(hq));
    // blend with the animated pose
    if (T.weight < 0.999) { B.arm.quaternion.slerpQuaternions(keep[0], B.arm.quaternion, T.weight); B.fore.quaternion.slerpQuaternions(keep[1], B.fore.quaternion, T.weight); B.hand.quaternion.slerpQuaternions(keep[2], B.hand.quaternion, T.weight); }
    B.arm.updateMatrixWorld(true);
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
    m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.envMapIntensity = 0.2; if (o.material.metalness !== undefined) o.material.metalness = Math.min(o.material.metalness, 0.7); if (o.material.emissive) o.material.emissiveIntensity = Math.min(o.material.emissiveIntensity ?? 1, 0.3); } });
    a.stop(); this.model.rotation.y = keepYaw; this.mixer.update(0);
  }

  applyElementFX(m, elems) {
    if (this.fx) { this.fx.parent?.remove(this.fx); this.fx = null; }
    const e = elems[0]?.elem; if (!e) return;
    const col = ELEM_COLOR[e];
    // the element lives on the edge (rim) and in the sparks; the texture keeps its own colours (emissive capped at .05)
    if (this.wRim) { this.wRim.col.setHex(col); this.wRim.k = 0.3; }
    m.traverse(o => { if (o.isMesh && o.material.emissive && !o.material.emissiveMap) { o.material.emissive.setHex(col); o.material.emissiveIntensity = 0.05; } });
    const grp = new THREE.Group(); const len = m.userData.len / m.scale.x; // blade length in the weapon's own units
    const mat = new THREE.SpriteMaterial({ map: glowTex(), color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    grp.userData.parts = [];
    for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(mat.clone()); s.userData = { t: Math.random(), along: 0.15 + Math.random() * 0.85 }; grp.add(s); grp.userData.parts.push(s); }
    // (no point light any more: one sitting on the blade flooded the weapon in its own colour, and it changed the scene's light count)
    grp.userData.len = len; grp.userData.elem = e;
    m.add(grp); this.fx = grp;
  }

  // ---------------------------------------------------------------- update
  update(dt, inp) {
    const s = this.stats, P = PHYS;
    this.stateT += dt; if (this.inv > 0) this.inv -= dt; if (this.guardT > 0) this.guardT -= dt;
    if (this.state === 'dead') { // keep falling and sliding to a stop so a mid-air death lands on the floor
      this.vel.x *= Math.max(0, 1 - dt * 6); this.vel.y = Math.max(-PHYS.fallMax, this.vel.y - PHYS.grav * dt); this.move(dt); this.animate(dt); return;
    }
    if (this.state === 'sit') { if (inp.x || inp.jumpP || inp.attackP) { this.state = 'free'; } else { this.vel.set(0, 0); this.animate(dt); return; } }
    if (this.state === 'ring') { this.vel.x = 0; if (this.stateT > (this.ringDur || 2.6)) { this.state = 'free'; this.ringDur = 0; } }

    const abil = this.abilities();
    // facing & horizontal intent
    let dir = inp.x;
    const attacking = !!this.attack;
    const heavy = attacking && this.attack.heavy;
    this.blocking = inp.shield && this.equip.offhand && this.state === 'free' && !attacking && !(this.guardT > 0); // a broken guard can't be raised again at once
    // just-guard timing: how long since the shield button went down (a press after a rest, so mashing it opens no window)
    if (inp.shield) { if (!this.shHeld) { this.parryOk = (this.shDown ?? 9) >= PARRY_REST; this.raiseT = 0; } else this.raiseT += dt; this.shDown = 0; } else this.shDown = (this.shDown ?? 9) + dt; this.shHeld = !!inp.shield;

    // a hit costs a quarter second, not two thirds: the drift is damped, it ends even in the air, and the presses made
    // while reeling are kept and played the moment control returns
    if (this.state === 'hurt') { this.vel.x *= Math.exp(-6 * dt); dir = 0; this.hurtBuf = (this.hurtBuf || 0) | (inp.attackP ? 1 : 0) | (inp.jumpP ? 2 : 0) | (inp.dashP ? 4 : 0);
      if (this.stateT > HURT_T) { this.state = 'free'; dir = inp.x; const b = this.hurtBuf; this.hurtBuf = 0; if (b) inp = { ...inp, attackP: inp.attackP || !!(b & 1), jumpP: inp.jumpP || !!(b & 2), jump: inp.jump || !!(b & 2), dashP: inp.dashP || !!(b & 4) }; } }
    if (this.state === 'backdash') {
      this.backdashT += dt; const k = 1 - this.backdashT / P.backdashT;
      this.vel.x = -this.facing * P.backdash * Math.max(0, k * 1.15);
      if (this.backdashT >= P.backdashT) this.state = 'free';
      if (inp.jumpP && this.onGround) this.state = 'free';
      if (inp.attackP && this.backdashT > 0.1) { this.state = 'free'; this.backStrike = true; } // backdash-strike: the swing rides the slide on planted feet
    }
    if (this.state === 'dash') { this.dashT += dt; this.vel.set(this.facing * P.dashV, 0); if (Math.random() < 0.8) this.g.fx.spawn(this.pos.x - this.facing * 0.3, this.pos.y + 0.4 + Math.random() * 1.1, 0.3, 0, 0, 0x9a5aff, 0.3, 0.5, 0); if (this.dashT > P.dashT) { this.state = 'free'; this.vel.x = this.facing * P.walk; } }
    if (this.state === 'slide') {
      this.slideT += dt; const low = this.lowCeiling(), k = Math.max(0.42, 1 - this.slideT / P.slideT * 0.6);
      this.vel.x = this.facing * P.slideV * (low ? Math.max(k, 0.6) : k); this.crouch = true;
      if (Math.random() < 0.5) this.g.fx.dust(this.pos.x - this.facing * 0.4, this.pos.y, 0x9a9080);
      if (inp.dashP && low) this.slideT = 0; // keep sliding through long crawls
      if (inp.jumpP && !low && this.onGround) { this.slideJumped = true; this.state = 'free'; this.vel.y = P.jumpV; this.vel.x = this.facing * P.walk; this.onGround = false; this.coyote = 0; this.cut = false; this.crouch = false; audio.play('stone_jump', 0.35); } // jump out of a slide
      if ((this.slideT >= P.slideT && !low) || !this.onGround) { this.state = 'free'; }
      else if (this.slideT >= P.slideT * 2.2 && low) this.slideT = P.slideT; // never strand the pilgrim under stone
      if (this.slideHit) this.g.playerHits({ x0: this.pos.x - 0.6, x1: this.pos.x + 0.6, y0: this.pos.y, y1: this.pos.y + 0.8, attack: this.slideHit, mul: 0.6, slide: true });
    }
    if (this.state === 'dive') {
      this.vel.set(0, -P.diveV); this.g.fx.spawn(this.pos.x + (Math.random() - 0.5) * 0.4, this.pos.y + 1.4, 0.3, 0, 2, 0x4ac8d8, 0.25, 0.4, 0);
      this.g.playerHits({ x0: this.pos.x - 0.7, x1: this.pos.x + 0.7, y0: this.pos.y - 0.6, y1: this.pos.y + 0.9, attack: this.diveAtk, mul: 1.4, dive: true });
    }

    if (this.state === 'free') {
      this.crouch = (inp.down && this.onGround) || (this.onGround && this.lowCeiling());
      if (this.kickT > 0) { this.kickT -= dt; dir = 0; }
      const canTurn = !attacking;
      if (dir && canTurn) this.facing = Math.sign(dir);
      let speed = P.walk; if (this.snareT > 0) { this.snareT -= dt; speed *= 0.3; if (Math.random() < dt * 8) this.g.fx.spawn(this.pos.x + (Math.random() - 0.5) * 0.6, this.pos.y + 0.3 + Math.random() * 0.5, 0.6, 0, 0.3, 0xe8e8f8, 0.4, 0.14, 0, false); } // a net binds the legs
      if (this.crouch || this.blocking && this.onGround) speed = 0;
      if (attacking && this.onGround) speed = 0; // a planted cut (SotN): the step-in is the swing's own
      if (this.kickT > 0) { /* carried by the wall kick */ } else { // a few frames of acceleration and braking: weight without losing SotN precision
        const tv = dir * speed * (this.inWater ? 0.62 : 1) * (this.inLava ? 0.6 : 1), rev = tv * this.vel.x < 0, acc = (!this.onGround ? 90 : rev ? 130 : tv === 0 ? 80 : 62) * dt;
        if (rev && this.onGround && Math.abs(this.vel.x) > 3 && !this.skidT) { this.skidT = 0.12; this.g.fx.dust(this.pos.x + Math.sign(this.vel.x) * 0.3, this.pos.y); }
        this.vel.x += THREE.MathUtils.clamp(tv - this.vel.x, -acc, acc); if (this.skidT > 0) this.skidT = Math.max(0, this.skidT - dt);
      }
      // jump / double jump / drop-through
      if (this.slideJumped) { this.slideJumped = false; inp = { ...inp, jumpP: false }; }
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
        if (this.onGround && inp.down && abil.has('slide')) { this.state = 'slide'; this.slideT = 0; this.stateT = 0; this.attack = null; this.slideHit = { hitIds: new Set(), st: STYLES.punch }; audio.play('clothing_1', 0.5, 0.8); this.g.feel?.('slide'); }
        else if (abil.has('dash') && (!this.onGround || dir) && !this.dashUsed && !(this.dashCd > 0)) { if (dir) this.facing = Math.sign(dir); this.state = 'dash'; this.dashT = 0; this.dashUsed = !this.onGround; this.dashCd = 0.62; this.attack = null; this.inv = Math.max(this.inv, 0.3); this.g.fx.burst(this.pos.x, this.pos.y + 0.9, 0x9a5aff, 18, 3); audio.play('wave_attack_2', 0.4, 1.3); this.g.feel?.('dash'); }
        else if (this.onGround && (!attacking || this.attack.pastHit) && !(abil.has('dash') && dir)) { if (attacking) this.endAttack(); this.state = 'backdash'; this.backdashT = 0; this.stateT = 0; this.crouch = false; /* i-frames: DASH_IFR in takeHit */ audio.play('clothing_1', 0.4); this.g.onBackdash?.(); }
      }
      // attack / dive
      if (inp.attackP && inp.up && !inp.down && this.armed && !this.d.ranged && !attacking && this.stats.mp >= 10) { this.stats.mp -= 10; this.startAttack(); if (this.attack) this.attack.art = true; }
      else if (inp.attackP && !this.onGround && inp.down && abil.has('dive') && !this.inWater && !(this.diveCd > 0)) { this.state = 'dive'; this.attack = null; this.diveAtk = { hitIds: new Set(), st: STYLES.smash }; audio.play('wave_attack_1', 0.5, 0.6); }
      else if (inp.attackP && !attacking) this.startAttack();
      else if (inp.attackP && this.attack) this.attack.queued = true; // buffered: flows into the next link of the chain
      this.inpX = dir;
    }
    if (this.attack) this.updateAttack(dt);

    // gravity & integration
    // water: float unless the Drowned Bell lets you sink (hold DOWN); lava: sear and pop out unless warded
    const env = this.g.envAt(this); this.inWater = env.water; this.inLava = env.lava;
    if (!env.water) this.sunk = false; else if (abil.has('dive') && inp.down) this.sunk = true;
    if (this.state !== 'dash' && this.state !== 'dive') {
      // falls are heavier than rises (x1.45), with a breath of hang at the apex while jump is held: less float, same reach
      const gm = env.water ? 0.45 : this.state === 'free' && !this.onGround && inp.jump && Math.abs(this.vel.y) < 1.2 ? 0.6 : this.vel.y < 0 ? 1.45 : 1;
      this.vel.y -= P.grav * gm * dt; const cap = env.water ? 4.5 : (this.wallDir && this.vel.y < 0 && abil.has('wallkick') && this.kickT <= 0 ? P.wallSlide : P.fallMax); if (this.vel.y < -cap) this.vel.y = -cap;
      if (env.water && !this.sunk && env.depth > 1.0) this.vel.y = Math.min(3.2, this.vel.y + 34 * dt);
    }
    if (env.lava && !abil.has('ember') && this.inv <= 0) { if (this.takeHit(Math.max(8, Math.round(this.stats.hpMax * 0.14)), this.pos.x - this.facing, 'fire', null, true)) { this.vel.set(-this.facing * 3, 10.5); this.g.fx.burst(this.pos.x, this.pos.y + 0.4, 0xff6a10, 24, 5); } }
    if (this.jumpBuf > 0) this.jumpBuf -= dt; if (this.dropT > 0) this.dropT -= dt; if (this.dashCd > 0) this.dashCd -= dt; if (this.diveCd > 0) this.diveCd -= dt;
    const wasGround = this.onGround, vyBefore = this.vel.y;
    this.move(dt);
    if (this.onGround && this.state === 'dive') { this.state = 'free'; this.jumpsLeft = 1; this.dashUsed = false; this.coyote = P.coyote; this.g.diveLand(this); this.landT = LAND_T; }
    else if (this.onGround) { this.jumpsLeft = 1; this.dashUsed = false; this.coyote = P.coyote; if (!wasGround) { if (this.attack?.mode === 'air') this.endAttack(); if (this.airAttacked && this.d.echo === 'quake') this.g.quake(this); this.airAttacked = false; this.landT = LAND_T; this.dip = { t: 0, a: Math.min(1, Math.max(0.25, -vyBefore / 13)) }; audio.play('stone_land', 0.3); if (-vyBefore > 11.5) this.g.feel?.('land', Math.min(1.2, -vyBefore / 14)); /* only drops deeper than a jump thud in the hands */ this.g.fx.dust(this.pos.x, this.pos.y); } }
    else if (wasGround && this.vel.y <= 0) { /* walked off ledge: keep coyote */ } else if (this.coyote > 0) this.coyote -= dt;

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
    const gs = this.groundS; if (gs?.mover && this.onGround && this.pos.x > gs.x0 - 0.8 && this.pos.x < gs.x1 + 0.8 && Math.abs(this.pos.y - gs.y1) < 1.2) { this.pos.x += gs.dx || 0; this.pos.y = gs.y1; } // ride lifts and gears (only the one underfoot: a warp or respawn must not snap back to it)
    this.pos.x += this.vel.x * dt;
    if (this.push) { this.pos.x += this.push * dt; this.push *= Math.pow(0.03, dt); if (Math.abs(this.push) < 0.3) this.push = 0; }
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

  // One swing per weapon class (src/swing.js), the same cut standing, crouching and in the air. The legs keep their own clip.
  startAttack() {
    const w = this.equip.weapon, base = w ? BASES[w.base] : null, S = swingFor(base ? base.kind : 'unarmed');
    const ias = 1 + Math.min(120, this.d?.ias || 0) / 100; this.swings++; if (!this.onGround) this.airAttacked = true;
    const mode = this.crouch ? 'crouch' : !this.onGround ? 'air' : 'idle'; this.backStrike = false;
    const st = { ...S, hitMul: S.melee, both: false };
    this.attack = { st, S, ci: 0, t: 0, k: 0, dur: S.dur / ias * (mode === 'air' ? 0.9 : 1), hitIds: new Set(), mode, heavy: !!S.heavy, swung: false, n: this.swings, reach: S.reach * (this.d?.echo === 'long' ? 1.35 : 1) };
    this.trail.end();
  }
  endAttack() { this.attack = null; this.trail.end(); }

  updateAttack(dt) {
    const A = this.attack, S = A.S;
    A.t += dt; const k = A.k = Math.min(1, A.t / A.dur);
    if (!A.swung && k >= S.hit[0] - 0.08) { A.swung = true; audio.play(A.heavy ? 'sword_attack_3' : 'sword_attack_' + (1 + Math.floor(Math.random() * 2)), 0.5, A.heavy ? 0.85 : S.dur < 0.25 ? 1.3 : 1.05); }
    A.active = k >= S.hit[0] && k <= S.hit[1]; A.pastHit = k > S.hit[1];
    if (k >= S.hit[0] - 0.05 && k <= S.hit[1] + 0.08 && S.ranged !== 'arrow') this.trailOn = true; // the crescent belongs to the cut, not the wind-up
    if (S.ranged && !A.shot && k >= S.shot) { A.shot = true; this._spell = S.ranged === 'staff'; try { this.g.playerShoot(this, S.ranged); } finally { this._spell = false; } } // a staff's bolt is a spell: Intellect feeds it (rollDamage)
    if (A.active && (!S.ranged || S.melee)) { if (!A.proc) { A.proc = true; A.streakDue = !!S.thrust; this.g.onSwing(this, A); if (A.art) this.g.castArt(this); } this.g.playerHits(this.hitbox()); }
    if (S.slam && !A.slammed && k >= S.slam && this.onGround) { A.slammed = true; this.g.shake(0.3, 0, -1); this.g.fx.dust(this.pos.x + this.facing * (A.reach * 0.8), this.pos.y); audio.play('rock_wall_1', 0.3, 0.8); } // a maul's head lands
    // a planted swing steps into the cut (eased out); the step stops once the blade bites, or at a body's edge
    if (this.onGround && A.mode === 'idle' && k >= S.hit[0] - 0.1 && k <= S.hit[1]) {
      if (A.hitIds.size || this.bodyAhead(0.35)) this.vel.x = 0; else { const u = (k - S.hit[0] + 0.1) / (S.hit[1] - S.hit[0] + 0.1); this.vel.x = this.facing * S.lunge * (1 - u) * (1 - u); } }
    // the recovery is only for show: a new press swings again, a step walks out of it
    if (k >= S.cancel) { if (A.queued) { this.attack = null; this.startAttack(); return; } if (this.inpX && this.onGround) { this.endAttack(); return; } }
    if (k >= 1) this.endAttack();
  }
  // where a missile leaves: the staff's head, the bow's grip, the throwing hand
  muzzle() {
    const m = this.weaponMesh; if (!m) return { x: this.pos.x + this.facing * 0.6, y: this.pos.y + 1.25 };
    m.updateWorldMatrix(true, false); const len = m.userData.len / m.scale.x, p = this.weaponKind === 'staff' ? m.localToWorld(new THREE.Vector3(0, len * 0.96, 0)) : m.getWorldPosition(new THREE.Vector3());
    return { x: this.pos.x + this.facing * Math.max(0.35, (p.x - this.pos.x) * this.facing), y: THREE.MathUtils.clamp(p.y, this.pos.y + 0.4, this.pos.y + 2.0) };
  }

  // A spear or lance is longer than the hero is tall: where the hand lowers it (guard, recovery) its point would dip through the
  // floor, and with the hero turned 22 deg toward the camera a 3.5 m shaft carried its point out past the stage's front lip.
  // Turn it about the grip, keeping its heading: just far enough that the point clears the floor by 0.4 m (on the ground: at 0.1
  // the recovery's point hung at the ankle for ten frames, a lowered lance dragging, not a carried one), and
  // with the point held in the play plane (world z <= +0.4; the rest of the length goes along the shaft's own side, or facing).
  liftTip(m, ground) {
    const len = m.userData.len / m.scale.x; if (!len) return; m.updateWorldMatrix(true, false);
    const ZMAX = 0.4, grip = m.getWorldPosition(new THREE.Vector3()), tip = m.localToWorld(new THREE.Vector3(0, len, 0)), fl = this.pos.y + 0.4;
    if ((!ground || tip.y >= fl) && tip.z <= ZMAX) return;
    const a = tip.sub(grip), L = a.length(); if (L < 1e-3) return; const b = a.clone();
    if (ground && grip.y + b.y < fl) { const dy = Math.min(L * 0.999, fl - grip.y), h = Math.hypot(b.x, b.z) || 1e-3, k = Math.sqrt(Math.max(0, L * L - dy * dy)) / h; b.set(b.x * k, dy, b.z * k); }
    if (grip.z + b.z > ZMAX) { const h = Math.sqrt(Math.max(0, L * L - b.y * b.y)), bz = THREE.MathUtils.clamp(ZMAX - grip.z, -h, h), sx = Math.abs(b.x) > 0.05 ? Math.sign(b.x) : this.facing; b.set(sx * Math.sqrt(Math.max(0, h * h - bz * bz)), b.y, bz); }
    setWorldQuat(m, new THREE.Quaternion().setFromUnitVectors(a.normalize(), b.normalize()).multiply(m.getWorldQuaternion(new THREE.Quaternion())));
  }

  // a thrust leaves a needle of light from the point (a rapier adds a star)
  thrustFlash(wm) {
    const A = this.attack; A.streakDue = false; const col = STREAK[this.fx?.userData.elem] || 0xdfe8ff;
    const tip = wm ? wm.localToWorld(new THREE.Vector3(0, wm.userData.len / wm.scale.x, 0)) : new THREE.Vector3(this.pos.x + this.facing, this.pos.y + 1.2, 0);
    this.g.fx.streak(tip.x - this.facing * 0.5, tip.y, this.facing, A.reach * 0.8, col, A.S.star ? 0.05 : 0.11);
    if (A.S.star) this.g.fx.star(tip.x + this.facing * 0.2, tip.y, 0xffffff, 0.55);
  }
  hitbox() {
    const st = this.attack.st, f = this.facing;
    const A = this.attack, bx = st.boxes?.[Math.max(0, A.wi ?? 0)] || {}, both = bx.both ?? st.both, yo = this.pos.y + (this.crouch ? (bx.yOff ?? st.yOff) * 0.55 : (bx.yOff ?? st.yOff)), ht = bx.height ?? st.height;
    const r = bx.reach ?? (A.reach || st.reach), x0 = bx.back ? this.pos.x - f * 0.15 : both ? this.pos.x - f * r * 0.8 : this.pos.x + f * 0.15, x1 = bx.back ? this.pos.x - f * r : this.pos.x + f * (0.15 + r); // a turning strike cuts behind as well; a 'back' box only behind
    const flurry = !!st.hits && !st.boxes, last = !st.hits || (A.wi ?? 0) === st.hits.length - 1;
    return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: yo - ht / 2, y1: yo + ht / 2, attack: A, mul: bx.mul ?? st.hitMul, both, pull: bx.pull ?? (st.boxes ? false : st.pull), flurry, last };
  }

  // is a live foe's body within `gap` metres ahead (at the hero's height)?
  bodyAhead(gap) {
    const x = this.pos.x, y = this.pos.y, f = this.facing;
    return !!this.g.room?.enemies?.some(e => !e.dead && !e.gone && !e.hidden && e.state !== 'buried' && e.state !== 'under' && (e.pos.x - x) * f > 0 && Math.abs(e.pos.x - x) - e.T.w / 2 - W / 2 < gap && e.pos.y < y + H_STAND && e.pos.y + e.T.h > y);
  }

  rollDamage() {
    const d = this.d, [a, b] = d.dmg;
    let dmg = a + Math.random() * (b - a + 1) | 0; dmg = Math.round(dmg * (1 + (d.str - 10) * 0.02) * (d.echo === 'frenzy' ? 1 + Math.min(12, this.combo) * 0.04 : 1) * (this._spell ? 1 + (d.int - 8) * 0.025 : 1)); // a staff's bolt: +2.5% per Intellect
    const crit = Math.random() * 100 < d.crit; if (crit) dmg = Math.round(dmg * (1.6 + d.critDmg / 100));
    const em = 1 + (d.int - 8) * 0.05; // Intellect: +5% elemental damage per point (it was a trap stat at 3%)
    const elem = d.elems.map(e => ({ elem: e.elem, dmg: Math.round((e.dmg[0] + Math.floor(Math.random() * (e.dmg[1] - e.dmg[0] + 1))) * em) }));
    return { dmg, crit, elem };
  }

  ensnare(t) { this.snareT = Math.max(this.snareT || 0, t); this.g.ui.dmg(this.pos.x, this.pos.y + 2.2, 'SNARED', 'crit'); } // jumping and dashing still work: struggle free
  takeHit(amount, fromX, elem, src, env) {
    if (this.inv > 0 || this.state === 'dead' || this.state === 'dash' || this.g.cine) return false;
    if (this.state === 'backdash' && this.backdashT >= DASH_IFR[0] && this.backdashT <= DASH_IFR[1]) return false; // the backdash's i-frames: not on the first frames, gone before it ends
    const front = Math.sign(fromX - this.pos.x) === this.facing;
    const res = elem ? (this.d.res[elem] || 0) : 0, mit = (1 - res / 100) * Math.max(0.40, 100 / (100 + this.d.def)); // defence: floor x0.40 (was x0.55 at 68 def), so armour keeps paying late
    if (this.blocking && front && !env) {
      const bx = this.pos.x + this.facing * 0.5, by = this.pos.y + 1.2, melee = src && !src.dead && fromX === src.pos.x; // a blow struck from the body (not a missile or a hazard)
      if (this.parryOk && this.raiseT < PARRY) { // just-guard: the shield met the blow as it was raised. No chip, and the striker reels
        this.parryOk = false; this.inv = 0.3; this.vel.x = -this.facing * 1.2;
        const great = melee && !!(src.boss || src.T?.mini || src.T?.boss) && !src.spec?.illusion; // a great foe's blow turned aside also costs it poise (5% of its life) and lands harder
        if (great) src.poiseHit?.(src.hpMax * 0.05); // before the stun: a stunned stance takes no poise
        if (melee) { src.stun = Math.max(src.stun || 0, src.boss ? 0.3 : 0.8); src.stunStars = true; }
        this.g.fx.burst(bx, by, 0xfff6dc, 26, 6); this.g.fx.ring?.(bx, by, 0xfff0c0, 2.4); this.g.fx.star?.(bx, by + 0.1, 0xffffff, 0.9); this.g.flash?.();
        audio.play('sword_parry_' + (1 + (Math.random() * 3 | 0)), 0.9, 1.15); this.g.hitStop(great ? 0.12 : 0.1); this.g.ui.dmg(this.pos.x, this.pos.y + 2.2, 'PARRY', 'crit'); this.g.feel?.('crit');
        if (this.d.blockBurst) this.g.blockBurst(this.pos.x + this.facing, this.pos.y + 1, this.d.blockBurst);
        return 'block';
      }
      const heavy = !!src?.boss && HEAVY.has(src.mv?.m.k || src.lastMove?.k); // a hazard can outlive its move, so the last move counts too
      const chip0 = Math.round(amount * (1 - (this.d.block || 0.5))), chip = heavy ? Math.max(1, chip0, Math.round(amount * mit * 0.5)) : chip0; // heavy: half of what the blow would have done
      this.stats.hp -= chip; this.inv = 0.3; this.vel.x = -this.facing * (heavy ? 4 : 2.5);
      this.g.fx.burst(bx, by, 0xffe0a0, heavy ? 22 : 14, heavy ? 5 : 4); audio.play('sword_blocked_' + (1 + (Math.random() * 3 | 0)), 0.6, heavy ? 0.75 : 1);
      if (heavy) { this.guardT = GUARD_BREAK; this.blocking = false; this.g.shake(0.3); this.g.ui.dmg(this.pos.x, this.pos.y + 2.5, 'GUARD BREAK', 'crit'); } // the guard is knocked aside for half a second
      if (this.d.blockBurst) this.g.blockBurst(this.pos.x + this.facing, this.pos.y + 1, this.d.blockBurst);
      if (chip) this.g.ui.dmg(this.pos.x, this.pos.y + 2, chip, 'player');
      this.g.feel?.('block');
      if (this.stats.hp <= 0) { this.stats.hp = 0; this.die(); return true; } // chip can kill
      return 'block';
    }
    const dmg = Math.max(1, Math.round(amount * mit));
    this.stats.hp -= dmg; this.g.ui.dmg(this.pos.x, this.pos.y + 2, dmg, 'player'); this.combo = 0;
    if (this.d.thorns && src && !src.dead) src.damage(this.d.thorns, null, true);
    if (elem === 'poison') this.poisoned = 4;
    audio.play('crunch_quick', 0.5); this.g.hitStop(0.09); this.g.shake(0.25); this.g.feel?.('hurt', Math.min(1.3, 0.75 + dmg / Math.max(1, this.stats.hpMax) * 2));
    if (this.stats.hp <= 0) { this.stats.hp = 0; this.die(); return true; }
    this.state = 'hurt'; this.stateT = 0; this.attack = null; this.inv = 1.1; this.sunk = false; this.hurtBuf = 0;
    const dir = Math.sign(this.pos.x - fromX) || -this.facing; this.vel.set(dir * 3.2, 3.6); this.onGround = false; // a short hop back, not a 2.8 m flight
    return true;
  }
  heal(n, quiet) { const s = this.stats, before = s.hp; s.hp = Math.min(s.hpMax, s.hp + n); if (!quiet && s.hp > before) this.g.ui.dmg(this.pos.x, this.pos.y + 2, s.hp - before, 'heal'); }
  // Back to a clean idle (after death/respawn): the clamped death clip otherwise stays at full weight and blends with
  // idle, leaving the hero half-lying and floating.
  resetAnim() {
    this.mixer.stopAllAction(); this.attack = null; this.trail.end(); this.flip = 0; this.spin.rotation.z = 0;
    this.layers.lower.cur = this.layers.upper.cur = null; this.crouch = false;
    this.setLayer('lower', this.armed ? ANIM.idleArmed : ANIM.idle, 0); this.setLayer('upper', this.armed ? ANIM.idleArmed : ANIM.idle, 0);
  }
  die() { this.state = 'dead'; this.stateT = 0; this.attack = null; this.setLayer('lower', ANIM.death, 0.1, { once: true }); this.setLayer('upper', ANIM.death, 0.1, { once: true }); this.g.onPlayerDeath(); }
  gainXP(n) {
    const s = this.stats; s.xp += Math.round(n * (1 + (this.d?.xpPct || 0) / 100));
    while (s.xp >= s.next) { s.xp -= s.next; s.lvl++; s.next = Math.round(40 + 22 * Math.pow(s.lvl, 2.05)); s.str += 1; s.con += 1; s.pts += 3; if (s.lvl % 2 === 0) { s.int += 1; s.lck += 1; } this.refreshStats(); s.hp = s.hpMax; s.mp = s.mpMax; this.g.levelUp(s.lvl); }
  }

  // ---------------------------------------------------------------- animation
  // On the ground, never let both feet hover: clips posed without hip height (the jump's landing) or with a raised
  // stance get lowered until the lower foot touches the floor. Only ever pulls down, eased so it never pops.
  groundFeet(dt) {
    this.toes ||= ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot'].map(n => this.model.getObjectByName('mixamorig' + n));
    let want = 0;
    if (this.onGround && this.state !== 'dead' && this.state !== 'sit') {
      const v = new THREE.Vector3(); let lo = 1e9;
      for (const t of this.toes) lo = Math.min(lo, t.getWorldPosition(v).y - (t.name.endsWith('Foot') ? 0.09 : 0.035));
      want = Math.min(0, this.pos.y - lo + this.spin.position.y - 0.95); // negative = drop the body by this much
      want = Math.max(want, -0.6);
    }
    // landing absorb: a quick knee dip scaled by impact speed (also when landing at a run)
    let dip = 0;
    if (this.dip) { this.dip.t += dt; const u = this.dip.t / 0.2; if (u >= 1) this.dip = null; else dip = -0.13 * this.dip.a * Math.sin(Math.PI * Math.min(1, u * 1.3)) * (1 - u * 0.3); }
    const base = 0.95 + want; this.footY = (this.footY ?? base) + (base - (this.footY ?? base)) * (want < (this.footY ?? base) - 0.95 ? 1 : Math.min(1, dt * 12));
    this.spin.position.y = this.footY + dip;
    // lean into the jump with the run speed (spine pitch, layered on top of the clip)
    this.spineB ||= this.model.getObjectByName('mixamorigSpine1');
    const lean = !this.onGround && !(this.flip > 0) && this.state === 'free' ? 0.3 * Math.min(1, Math.abs(this.vel.x) / PHYS.walk) : 0;
    this.leanA = (this.leanA || 0) + (lean - (this.leanA || 0)) * Math.min(1, dt * 8);
    if (this.leanA > 0.005) this.spineB.rotateX(this.leanA);
    this.root.updateMatrixWorld(true);
  }
  // Frame of the jump clip for the current moment of the arc.
  // Rising: by vertical speed. Falling: by time to impact (distance to the floor below / fall speed), so the legs
  // reach for the floor just before touching down whatever the height. Eased per clip so a cut jump never pops.
  airFrame(J, name, dt) {
    const lerp = (w, k) => { const [a, b] = w || J.fall || J.rise || J.land || [0, 0]; return a + (b - a) * Math.min(1, Math.max(0, k)); }; // a ground dash uses a clip with no landing window
    let f;
    if (this.onGround) f = lerp(J.land, 1 - this.landT / LAND_T);
    else if ((this.flip > 0 || this.state === 'dash') && J.tuck !== undefined) f = J.tuck;
    else if (this.vel.y > 0) f = lerp(J.rise, (1 - this.vel.y / PHYS.jumpV) * 1.15);
    else {
      const floor = this.g.floorBelow ? this.g.floorBelow(this.pos.x, this.pos.y) : -1e9;
      const tHit = floor > -1e8 ? (this.pos.y - floor) / Math.max(1, -this.vel.y) : 9;
      f = lerp(J.fall, 1 - tHit / 0.35);
    }
    this.jf ||= {};
    const prev = this.jf[name];
    this.jf[name] = prev === undefined || this.onGround !== this.jfGround ? f : prev + (f - prev) * Math.min(1, dt * 18);
    return this.jf[name];
  }
  animate(dt) {
    const armed = this.armed;
    if (this.state !== 'dead') {
      let base;
      if (this.state === 'sit') base = ANIM.sit;
      else if (this.state === 'hurt') base = ANIM.hurt;
      else if (this.state === 'backdash') base = ANIM.backdash;
      else if (this.state === 'slide') base = armed ? ANIM.crouchArmed : ANIM.crouch;
      else if (this.state === 'dive') base = ANIM.dive;
      else if (this.state === 'ring') base = ANIM.ring;
      else if (this.state === 'dash') base = ANIM.dashAir;
      else if (!this.onGround && this.wallDir && this.vel.y < 0 && this.has('wallkick')) base = ANIM.cling;
      else if (!this.onGround) base = armed ? ANIM.jumpArmed : ANIM.jump;
      else if (this.landT > 0 && Math.abs(this.vel.x) < 0.5 && !this.crouch && !this.attack) base = armed ? ANIM.jumpArmed : ANIM.jump;
      else if (this.crouch) base = this.blocking ? ANIM.crouchBlock : (armed ? ANIM.crouchArmed : ANIM.crouch);
      else if (Math.abs(this.vel.x) > 0.4 && !this.attack) base = armed ? ANIM.jogArmed : ANIM.jog; // a cut is planted: the step-in slides on a set stance
      else base = armed ? ANIM.idleArmed : ANIM.idle;
      const isRun = base === ANIM.jog || base === ANIM.jogArmed, runScale = isRun ? THREE.MathUtils.clamp(Math.abs(this.vel.x) / this.stride[base], 0.55, 2.8) : 1;
      const lowerBusy = false;
      if (!lowerBusy) {
        const opts = {};
        if (JUMP_WIN[base]) opts.manual = true;
        if (base === ANIM.fall) opts.at = 0.2;
        if (base === ANIM.backdash) opts.speed = 1.6;
        if (isRun) opts.speed = runScale;
        if (base === ANIM.hurt) { opts.once = true; }
        if (base === ANIM.dashAir) { opts.at = 2.6; opts.speed = 0.4; }
        if (base === ANIM.dive) { opts.at = 3.6; opts.speed = 0.05; }
        // jumps: the legs drive off one foot; the double-jump somersault and shade dash keep the tight tuck
        const tuck = this.flip > 0 || this.state === 'dash';
        const lo = JUMP_WIN[base] ? (tuck ? JUMP_TUCK : JUMP_LEGS) : base;
        this.setLayer('lower', lo, JUMP_WIN[lo] ? (tuck ? 0.05 : 0.1) : isRun ? 0.11 : 0.16, opts);
        if (isRun) this.clipAct(lo, 'lower').timeScale = runScale;
        if (JUMP_WIN[lo]) this.clipAct(lo, 'lower').time = this.airFrame(JUMP_WIN[lo], lo + 'L', dt) / FPS;
      }
      {
        let upper = this.blocking ? (this.crouch ? ANIM.crouchBlock : ANIM.block) : (lowerBusy ? this.layers.lower.cur : base);
        if (upper === base && JUMP_WIN[base] && !armed) upper = this.flip > 0 || this.state === 'dash' ? JUMP_TUCK : 'running'; // arms hug the knees in the somersault, pump otherwise
        const opts = {}; if (JUMP_WIN[upper]) opts.manual = true; if (upper === ANIM.fall) opts.at = 0.2; if (upper === ANIM.backdash) opts.speed = 1.6; if (upper === ANIM.jog || upper === ANIM.jogArmed) opts.speed = runScale; if (upper === ANIM.hurt) opts.once = true;
        this.setLayer('upper', upper, 0.12, opts);
        // keep the two halves of a locomotion clip in phase
        if (this.layers.upper.cur === this.layers.lower.cur) { const u = this.clipAct(upper, 'upper'), l = this.clipAct(upper, 'lower'); u.time = l.time; }
        else if (JUMP_WIN[upper]) this.clipAct(upper, 'upper').time = this.airFrame(JUMP_WIN[upper], upper + 'U', dt) / FPS;
      }
    }
    if (this.landT > 0) this.landT -= dt;
    // facing: rotate through the camera (3/4 view, Bloodstained-style), with a forward somersault on double jump
    const target = this.facing * (Math.PI / 2 - 0.38);
    this.yaw += (target - this.yaw) * Math.min(1, dt * 16);
    this.root.position.set(this.pos.x, this.pos.y, 0);
    this.model.rotation.set(0, this.yaw, 0);
    this.mixer.update(dt); this.grip.apply(this.armed, !!this.equip.offhand || !!this.twoHand || !!this.pairMesh); this.root.updateMatrixWorld(true);
    this.groundFeet(dt); this.jfGround = this.onGround; const wm = this.weaponMesh; if (wm?.userData.q0) wm.quaternion.copy(wm.userData.q0); if (this.pairMesh?.userData.q0 && !(this.attack?.st.thrust && (this.attack.wi ?? 0) === 1)) this.pairMesh.quaternion.copy(this.pairMesh.userData.q0); if (this.attack) this.rig.apply(this.attack.S, this.attack.k, this.facing, wm, this.crouch); this.twoHandIK(); if (wm && this.weaponKind === 'boomerang') wm.visible = !this.g.shots?.some(s => s.kind === 'boomerang' && s.friendly && s.life > 0); /* the boomerang leaves the hand while it flies */ if (this.attack?.streakDue) this.thrustFlash(wm); if (wm && (this.weaponKind === 'spear' || this.weaponKind === 'lance')) this.liftTip(wm, this.onGround); /* a long point never goes through the floor or out through the stage's front (it did in the recoveries) */
    if (this.trailOn) { if (!this.attack?.st.thrust) this.trail.push(this.weaponMesh, this.fx?.userData.elem || this.trailElem, this.onGround ? this.pos.y : this.g.floorBelow?.(this.pos.x, this.pos.y + 0.05)); this.trailOn = false; } /* a thrust draws its needle, not a ribbon */ this.trail.update(dt); this.scarf.update(dt, this.facing, this.vel, this.onGround ? this.pos.y : null);
    // lean into the run and into acceleration
    const ax = dt > 0 ? THREE.MathUtils.clamp((this.vel.x - (this._pvx ?? 0)) / dt, -70, 70) : 0; this._pvx = this.vel.x; this.leanV = (this.leanV || 0) + (ax - (this.leanV || 0)) * Math.min(1, dt * 10);
    const runLean = this.state === 'free' && this.onGround && !this.attack ? -(this.vel.x / PHYS.walk) * 0.035 - this.leanV * 0.0016 : 0;
    if (!(this.flip > 0)) this.spin.rotation.z += (runLean - this.spin.rotation.z) * Math.min(1, dt * 18);
    const lean = this.state === 'slide' ? this.facing * 1.05 : this.state === 'dive' ? -this.facing * 0.5 : this.state === 'dash' ? -this.facing * 0.35 : 0;
    if (!(this.flip > 0)) this.spin.rotation.z += (lean - this.spin.rotation.z) * Math.min(1, dt * 18);
    this.spin.position.y = 0.95 - (this.state === 'slide' ? 0.42 : 0);
    if (this.flip > 0) { this.flip += dt * 2.3; const a = Math.min(1, this.flip); this.spin.rotation.z = -this.facing * (a * a * (3 - 2 * a)) * Math.PI * 2; if (this.flip >= 1 || this.onGround) { this.flip = 0; } } // smoothstep flip: gathers, whips round, settles upright
    // i-frame blink
    this.hurtRim ||= { col: new THREE.Color(0xa4acc0), k: RIM_K, p: 3.4 };
    if (this._rimmed !== this.gearVer) { this._rimmed = this.gearVer; this.model.traverse(o => { if (o.isMesh && !o.userData.xray) for (const m of [].concat(o.material)) if (!m.userData.rim) { m.userData.rim = 1; heroRim(m, this.hurtRim); } }); }
    const blink = this.inv > 0.3 && this.inv < 1.05 && this.state !== 'block' && this.state !== 'dead', on = blink && Math.floor(this.inv * 12) % 2 === 0;
    if (on) { this.hurtRim.col.setHex(0xe02848); this.hurtRim.k = 0.85; } else { this.hurtRim.col.setHex(0xa4acc0); this.hurtRim.k = RIM_K + (this.g.darken || 0) * 0.9; } // a cool edge always (brighter in an eclipse, so you never lose yourself); hurt flickers it crimson
    this.model.visible = true; if (this.scarf) this.scarf.mesh.visible = true;
    // a boss's body over the hero on screen (its box overlaps his): the x-ray also shows through the foes
    const pa = this.aabb, over = !!this.g.room?.enemies?.some(e => { if (!e.boss || e.dead || e.gone || e.hidden || !e.root?.visible) return false; const a = e.aabb, hw = Math.max(e.T.w, e.visW || 0) * 0.5 + 0.3; return e.pos.x - hw < pa.x1 && e.pos.x + hw > pa.x0 && a.y0 - 0.3 < pa.y1 && a.y1 + 0.8 > pa.y0; }); // the model's width, not the hitbox: a dragon's head and wings reach metres past T.w
    // nothing below the ankles x-rays (what he stands on draws after the x-ray pass, world.js WALK_RO, so a ledge's front lip or
    // the next stair's riser never lights his boots)
    this.xrayFoot.value = pa.y0 + 0.16;
    if (over !== !!this.xrayOver) { this.xrayOver = over; for (const x of [...(this.xrays || []), ...(this.wxrays || [])]) { x.renderOrder = over ? 2.5 : 1; x.material = over ? this.xrayOverMat : this.xrayMat; } }
    if (this.fx) for (const p of this.fx.userData.parts) { p.userData.t += dt * 2.2; const u = p.userData.t % 1; p.position.set((Math.random() - 0.5) * 0.04, this.fx.userData.len * p.userData.along, (Math.random() - 0.5) * 0.04 + (this.fx.userData.elem === 'fire' ? u * 0.0 : 0)); p.position.y += this.fx.userData.elem === 'fire' ? u * 0.25 : 0; p.material.opacity = 1 - u; const sc = (this.fx.userData.elem === 'lightning' ? (Math.random() < 0.3 ? 0.25 : 0.08) : 0.16) * (1 - u * 0.5); p.scale.setScalar(sc); }
  }
}

// Swing ribbon: samples the blade's base and tip each frame of a strike so attacks read clearly from the side view.
const TRAIL_COL = { fire: 0xff7a30, ice: 0x8ad8ff, lightning: 0xfff070, poison: 0x8aff6a, shadow: 0xb080ff, foe: 0xff4a30, reaper: 0xd8f0c8 }; // foe: an enemy's cut, so its blows read as clearly as yours
export class Trail {
  constructor(scene) {
    this.max = 56; this.pts = [];
    this.geo = new THREE.BufferGeometry(); this.pos = new Float32Array(this.max * 2 * 3); this.alpha = new Float32Array(this.max * 2);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1)); const w = new Float32Array(this.max * 2); for (let i = 0; i < this.max; i++) w[i * 2 + 1] = 1; this.geo.setAttribute('w', new THREE.BufferAttribute(w, 1));
    const idx = []; for (let i = 0; i < this.max - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } this.geo.setIndex(idx);
    // tinted, never white: the core is held to 60% value and the ribbon to alpha .5 (additive, so it adds at most .3), and it
    // fades out where it dips to the floor under the swinger's feet (`low`), so a rising cut leaves no pale crescent on the stone
    this.mat = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(0x7fa0ff) }, fade: { value: 1 }, low: { value: -1e9 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute float alpha; attribute float w; varying float a; varying float v; varying float wy; void main(){ a=alpha; v=w; vec4 p=modelMatrix*vec4(position,1.); wy=p.y; gl_Position=projectionMatrix*viewMatrix*p; }',
      fragmentShader: 'uniform vec3 col; uniform float fade; uniform float low; varying float a; varying float v; varying float wy; void main(){ float body=a*pow(v,2.4)*.42; float edge=a*smoothstep(.8,1.,v)*.95; float f=min(.72,(body+edge)*fade)*smoothstep(low-.2,low+.1,wy); vec3 c=mix(col, vec3(1.), smoothstep(.9,1.,v)*a*.25); c*=min(1., .6/max(.001,max(c.r,max(c.g,c.b)))); gl_FragColor=vec4(c, f); }' });
    this.mesh = new THREE.Mesh(this.geo, this.mat); this.mesh.frustumCulled = false; this.mesh.visible = false; scene.add(this.mesh); this.life = 0;
  }
  push(weapon, elem, floorY) { // floorY: the floor under the swinger (null: none), the ribbon fades out from 0.3 m above it
    if (!weapon) return;
    this.mat.uniforms.low.value = floorY == null || !Number.isFinite(floorY) ? -1e9 : floorY + 0.3; // a heavy cut that ends at the floor no longer smears a pale wedge across the stone in front of him
    const len = weapon.userData.len / weapon.scale.x; // was 1.8x too long: the ribbon overshot the tip
    const base = weapon.localToWorld(new THREE.Vector3(0, len * (weapon.userData.len > 1.6 ? 0.6 : 0.15), 0)), tip = weapon.localToWorld(new THREE.Vector3(0, len * 1.02, 0));
    // fill big per-frame jumps with arc-interpolated samples so the ribbon curves instead of fanning into a flat card
    const prev = this.pts[0];
    if (prev) { const L = tip.distanceTo(base), d0 = prev[1].clone().sub(prev[0]).normalize(), d1 = tip.clone().sub(base).normalize(), steps = Math.min(8, Math.ceil(Math.max(d0.angleTo(d1) / 0.12, tip.distanceTo(prev[1]) / 0.2))); /* a staff's head moves ~1 m a frame: sample it finely or the ribbon is a fan of chords */
      for (let s = 1; s < steps; s++) { const t = s / steps, b = prev[0].clone().lerp(base, t), d = d0.clone().lerp(d1, t).normalize(); this.pts.unshift([b, b.clone().addScaledVector(d, L)]); } }
    this.pts.unshift([base, tip]); while (this.pts.length > this.max) this.pts.pop();
    this.mat.uniforms.col.value.setHex(TRAIL_COL[elem] || 0x8fb0ff); this.life = 0.14; this.fresh = true; this.mesh.visible = true; this.write();
  }
  write() {
    const n = this.pts.length;
    for (let i = 0; i < this.max; i++) { const p = this.pts[Math.min(i, n - 1)]; const k = i < n ? 1 - i / n : 0;
      this.pos.set([p[0].x, p[0].y, p[0].z], i * 6); this.pos.set([p[1].x, p[1].y, p[1].z], i * 6 + 3); this.alpha[i * 2] = k * k; this.alpha[i * 2 + 1] = k * k; }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.alpha.needsUpdate = true;
  }
  end() { this.pts.length = 0; }
  update(dt) { if (this.life > 0) { if (this.fresh) this.fresh = false; else this.life -= dt; const u = Math.max(0, this.life / 0.14); this.mat.uniforms.fade.value = u * u; if (this.life <= 0) { this.mesh.visible = false; this.pts.length = 0; } } }
}

// Crimson scarf: a collar wound round the neck and two long tails down the back. Each tail is a damped verlet chain that
// hangs heavy at rest, streams out behind a run, lifts on a fall and snaps round on a turn. It is kept behind the shoulders
// (never across the face or the sword arm), it bends in a smooth curve (a second-neighbour constraint resists folding) and its
// speed is capped, so a teleport, a crouch or a swing can never whip it over his head.
class ScarfTail {
  constructor(n, seg, w0, w1, col, z) {
    this.n = n; this.seg = seg; this.w0 = w0; this.w1 = w1; this.z = z; this.p = []; this.o = [];
    for (let i = 0; i < n; i++) { this.p.push(new THREE.Vector3()); this.o.push(new THREE.Vector3()); }
    this.geo = new THREE.BufferGeometry(); this.pos = new Float32Array(n * 2 * 3); this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const uv = new Float32Array(n * 4), colr = new Float32Array(n * 6), c = new THREE.Color(col);
    for (let i = 0; i < n; i++) { const k = i / (n - 1); uv.set([k, 0, k, 1], i * 4); const sh = 0.72 + 0.28 * Math.cos(k * 9) * (1 - k * 0.3), lo = sh * 0.7; colr.set([c.r * sh, c.g * sh, c.b * sh, c.r * lo, c.g * lo, c.b * lo], i * 6); } // soft folds along its length, a darker lower edge
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); this.geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } this.geo.setIndex(idx);
  }
  step(a, dt, facing, vel, t, ph, floor) {
    const n = this.n, seg = this.seg, back = -facing;
    if (!this.init || this.p[0].distanceTo(a) > 1.2) { for (let i = 0; i < n; i++) { this.p[i].set(a.x + back * i * seg * 0.35, a.y - i * seg * 0.9, a.z); this.o[i].copy(this.p[i]); } this.init = true; }
    // what the air does to it: it trails whatever way he moves (run: straight back; fall: up; rise: down), plus a breath of wind
    const run = Math.min(1, Math.abs(vel.x) / 4.7), ax = (-vel.x * 5.2 + back * (1.4 + 1.2 * Math.sin(t * 1.7 + ph))), ay = -24 * (1 - run * 0.55) - vel.y * 3.4, cap = 9 * dt;
    this.p[0].copy(a); this.o[0].copy(a);
    for (let i = 1; i < n; i++) { const p = this.p[i], o = this.o[i], k = i / (n - 1);
      let vx = (p.x - o.x) * 0.86, vy = (p.y - o.y) * 0.86; const sp = Math.hypot(vx, vy); if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
      o.copy(p); const flut = Math.sin(t * (7 + run * 6) - i * 0.8 + ph) * (0.6 + run * 2.4) * k;
      p.x += vx + ax * dt * dt; p.y += vy + (ay + flut * 9) * dt * dt; p.z = a.z + this.z - k * 0.05; }
    for (let it = 0; it < 4; it++) {
      for (let i = 1; i < n; i++) { const A = this.p[i - 1], B = this.p[i], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1e-4; B.x = A.x + dx * seg / L; B.y = A.y + dy * seg / L; }
      for (let i = 2; i < n; i++) { const A = this.p[i - 2], B = this.p[i], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1e-4, min = seg * 1.82; if (L < min) { B.x = A.x + dx * min / L; B.y = A.y + dy * min / L; } } // no sharp folds
      for (let i = 1; i < n; i++) { const p = this.p[i], k = i / (n - 1), lim = a.x + back * Math.min(0.1, 0.02 + k * 0.5); if ((p.x - lim) * back < 0) p.x = lim; /* stays behind the shoulders */
        const top = a.y + 0.12 + k * 0.5 + Math.max(0, -vel.y) * 0.06; if (p.y > top) p.y = top; if (floor != null && p.y < floor + 0.04) p.y = floor + 0.04; }
    }
    for (let i = 0; i < n; i++) {
      const p = this.p[i], q = this.p[Math.min(n - 1, i + 1)], r = this.p[Math.max(0, i - 1)], tx = q.x - r.x, ty = q.y - r.y, L = Math.hypot(tx, ty) || 1, k = i / (n - 1);
      const w = (this.w0 + (this.w1 - this.w0) * k) * (0.82 + 0.18 * Math.cos(t * 5 + i * 0.7 + ph)), nx = -ty / L * w / 2, ny = tx / L * w / 2, tw = Math.sin(t * 6 + i * 0.55 + ph) * 0.04 * k;
      this.pos.set([p.x + nx, p.y + ny, p.z + tw], i * 6); this.pos.set([p.x - nx, p.y - ny, p.z - tw], i * 6 + 3);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.computeVertexNormals(); this.geo.computeBoundingSphere();
  }
}
class Scarf {
  constructor(scene, anchor) {
    this.anchor = anchor; this.t = 0;
    // swallow-tail: a V cut out of the last tenth of the cloth
    const c = document.createElement('canvas'); c.width = 64; c.height = 16; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 16); x.fillStyle = '#000'; x.beginPath(); x.moveTo(64, 1); x.lineTo(54, 8); x.lineTo(64, 15); x.fill();
    const am = new THREE.CanvasTexture(c);
    this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, emissive: 0x3a0308, emissiveIntensity: 0.9, roughness: 0.7, side: THREE.DoubleSide, alphaMap: am, alphaTest: 0.5 });
    this.tails = [new ScarfTail(18, 0.085, 0.3, 0.2, 0xb0101e, -0.1), new ScarfTail(13, 0.08, 0.24, 0.15, 0x7c0a16, -0.17)];
    this.mesh = new THREE.Group(); for (const tl of this.tails) { const m = new THREE.Mesh(tl.geo, this.mat); m.frustumCulled = false; m.castShadow = true; m.renderOrder = 3; this.mesh.add(m); }
    scene.add(this.mesh);
    // the collar: two turns of cloth round the neck, riding the neck bone
    if (anchor) { const ws = anchor.getWorldScale(new THREE.Vector3()).x || 1, cm = new THREE.MeshStandardMaterial({ color: 0x9c0e1c, emissive: 0x3a0308, emissiveIntensity: 0.9, roughness: 0.75 });
      this.collar = new THREE.Group(); for (const [r, tb, y, tilt] of [[0.1, 0.045, 0.0, 0.22], [0.092, 0.038, 0.045, -0.16]]) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tb, 8, 18), cm); m.rotation.set(Math.PI / 2 + tilt, 0, 0); m.position.y = y; m.scale.z = 0.8; m.renderOrder = 3; m.castShadow = true; this.collar.add(m); }
      this.collar.scale.setScalar(1 / ws); anchor.add(this.collar); }
  }
  set renderOrder(v) { /* (set per mesh in the constructor) */ }
  update(dt, facing, vel, floor) {
    if (!this.anchor) return; this.t += dt; const h = Math.min(dt, 1 / 30);
    const a = this.anchor.getWorldPosition(new THREE.Vector3()); a.y += 0.05; a.x -= facing * 0.11;
    this.tails[0].step(a, h, facing, vel, this.t, 0, floor); a.y -= 0.03; a.x -= facing * 0.01; this.tails[1].step(a, h, facing, vel, this.t, 2.1, floor);
  }
}
