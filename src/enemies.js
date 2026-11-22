import * as THREE from 'three';
import { glowTex } from './world.js';
import { cloneGLTF, weaponModel, audio, WEAPONS, addRim, LOW_MEM } from './assets.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Trail } from './player.js';
// the resting rim is a faint neutral edge (it used to be lavender at k .3 on a x1.3 albedo: every foe read as the same ghost)
const RIM_COOL = new THREE.Color(0xc4c8d4), RIM_HOT = new THREE.Color(0xff3020), RIM_HIT = new THREE.Color(0xffffff), RIM_BREAK = new THREE.Color(0xffd060);
const RIM_K = 0.34, TELL_K = 0.9, TELL_K_WIDE = 0.6, FLASH_K = 0.5, FLASH_EM = 0.03; // tell and hit flash are capped so the model's own texture still reads
// a hit flash: great foes flash the rim only (a white fill at .12 washed dark bosses flat grey); small foes keep a faint
// fill. One flash start per FLASH_GAP, so a fast weapon doesn't strobe. A tell is staged by the time left before the
// blow lands, whatever its wind-up: the rim and weapon heat over the last WARN_HEAT s, the hand flares in the last WARN_FLARE
const FLASH_GAP = 0.12, WARN_HEAT = 0.3, WARN_FLARE = 0.15;
// a great body's hit flash and status edge: a lower ceiling (a wide body, quad or dragon, lower still) on a tighter edge (power
// RIM_P_TIGHT), because the big tripo bodies face the camera at a slant and a .5 white rim at 3.5 washed Caddoc grey-white
const FLASH_K_BIG = 0.32, FLASH_K_WIDE = 0.28, RIM_P_TIGHT = 4.0;
// addRim (assets.js) bakes the edge's power into the shader. A great foe's rim takes it as a uniform instead, so a flash or a status
// can tighten the edge for a few frames without recompiling: one program for every great body ('rimLive')
function rimLive(m, rim) {
  if (!m.isMeshStandardMaterial) return m;
  m.onBeforeCompile = sh => {
    sh.uniforms.rimCol = { get value() { return rim.col; } }; sh.uniforms.rimK = { get value() { return rim.k; } }; sh.uniforms.rimP = { get value() { return rim.p; } };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 rimCol; uniform float rimK; uniform float rimP;')
      .replace('#include <opaque_fragment>', 'outgoingLight += rimCol * rimK * pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), rimP);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'rimLive'; m.needsUpdate = true;
  return m;
}
// a great foe's status motes (about two a second, enemy mote()): frost drifts down off the body, embers and venom rise
const MOTE_COL = [0xc4e8ff, 0xffa040, 0x9aff6a];
// a caster's hand glow through its wind-up, in the colour of what it casts (main.js SHOT: bolt, orb, skull, lob)
// the kinds whose attack is a cast: they raise an arm and their hand kindles through the wind-up (liftArm)
const CASTERS = new Set(['turret', 'summoner', 'splitter', 'blinker', 'orbiter']);
const CAST_COL = { bolt: 0xff7a30, orb: 0xb060ff, skull: 0x9affb0, lob: 0x8aff5a, summon: 0xb070ff };
// the flying-boss floor blob: one soft dark disc texture and one flat plane for every great foe (each keeps its own material)
let _shTex = null, _shGeo = null;
function shadowTex() {
  if (_shTex) return _shTex; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.45, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (_shTex = new THREE.CanvasTexture(c));
}
// states and moves that fade the body on purpose; anything else found faded is put back (enemy update)
const FADE_STATES = new Set(['blink', 'vanish', 'buried', 'under', 'surface']), FADE_MOVES = new Set(['blink', 'mirror', 'hunt']);
// a blow has to show itself before it lands: wind-up before the first active frame, and the active frame's least length
const LEAD = 0.38, LEAD_BIG = 0.5, ACTIVE = 0.13;
// a buried Shambler claws back out this many times while you stay in its corridor; a regular type named as a miniboss takes this many swings
const RISES = 3, MINI_HITS = 30;
// nothing shoots from off screen: the camera shows about 7.7 m either side of the hero
const SCREEN = 7.2;
// kinds that hold their course when struck (fliers are pushed, never dropped): the crawler on its ledge, the leaping merman
const NO_FLINCH = new Set(['crawler', 'merman', 'ghost']);
// moves a poise break may not cut into (cut short they would leave the boss hidden, faded, airborne or spun): it waits for their end
const NO_CUT = new Set(['blink', 'mirror', 'hunt', 'grimoire', 'takeoff', 'land', 'divebomb', 'strafe', 'swoop', 'shellspin', 'eclipse']);
import { fitHeight } from './world.js';
import { BESTIARY, statsAt, roomLevel, CLASS, heroHit, heroEHP } from './catalog.js';

export const TYPES = BESTIARY;
export const ELEM_COL = { fire: 0xff6a20, ice: 0x7ad8ff, lightning: 0xfff070, poison: 0x8aff5a, shadow: 0xb070ff };
const rnd = (a, b) => a + Math.random() * (b - a); const _gc = new THREE.Color(), _wc = new THREE.Color();
// a caster's raised arm (liftArm): eased ramp, the swing's cap, scratch vectors and quaternions (no garbage per step)
const smooth01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }, ARM_MAX = THREE.MathUtils.degToRad(70);
// per-type overrides of the raised arm: [swing cap, height of the aim]. The Hierophant's tall cowl hid a hand raised ~35°: it swings
// further and aims ~55° up, so the cast hand clears the hood
const ARM_LIFT = { necro_lord: [THREE.MathUtils.degToRad(115), 1.15] };
const _av1 = new THREE.Vector3(), _av2 = new THREE.Vector3(), _av3 = new THREE.Vector3(), _av4 = new THREE.Vector3(), _av5 = new THREE.Vector3(), _aq1 = new THREE.Quaternion(), _aq2 = new THREE.Quaternion(), _aq3 = new THREE.Quaternion();
// a signature's wind-up glows in its own element, so the answer can be read from the colour (red is everything else)
const WARN_COL = { hunt: 0x6aff5a, frostnova: 0xa8e8ff, ossuary: 0xd8642a, fissure: 0xffa040, stormcall: 0xb8a8ff, grimoire: 0xb080ff, cyclone: 0xd8e8ff, geyser: 0x6ac8ff, miasma: 0x8aff5a, maw: 0x9a7ad8, eclipse: 0xffa020, forgefall: 0xffe0a0, webnet: 0xe8e8ff, meteor: 0xff8a30 };
const sgn = x => (x < 0 ? -1 : 1);
const SHOT_SPEED = { bolt: 11, orb: 6.5, skull: 4.2, feather: 13, gust: 10, book: 9 };

let idSeq = 1;
export class Enemy {
  constructor(game, spec, room) {
    this.g = game; this.spec = spec; this.room = room; this.T = TYPES[spec.t]; this.id = idSeq++;
    const b = room.b, T = this.T;
    this.pos = new THREE.Vector2(b.x0 + spec.x, b.y0 + (spec.y ?? 0.5)); this.home = this.pos.clone();
    this.vel = new THREE.Vector2(); this.facing = -1; this.yaw = -1.2;
    this.boss = !!(spec.boss || T.boss || T.mini); this.mini = !!(T.mini || spec.mini) && !T.boss; this.dead = false;
    // a regular foe is raised to the level of the room it stands in (catalog.js roomLevel), so its class holds in every act: a
    // Shambler is 1-hit fodder in act 6 too. A regular type named as a miniboss (Ser Aubrine) duels like one: MINI_HITS swings.
    this.lvl = T.cls ? Math.max(T.lvl, spec.lvl || 0, roomLevel(room.def) + (this.boss ? 2 : 0)) : T.lvl;
    const st = T.cls && this.lvl !== T.lvl ? statsAt(T, this.lvl) : T; this.ds = T.cls ? st.dmg / T.dmg : 1; this.xp = st.xp;
    if (T.cls && this.boss) { this.ds *= CLASS.elite.atk / CLASS[T.cls].atk * 0.8; this.xp = Math.round(st.xp * 8); }
    this.hpMax = T.cls && this.boss ? Math.round(MINI_HITS * heroHit(this.lvl)) : Math.round(st.hp * (T.cls ? 1 : spec.hpMul || 1)); if (spec.illusion) this.hpMax = 1; this.hp = this.hpMax;
    this.flying = !!T.fly && !T.dragon; this.air = this.flying; this.phase = 1;
    this.reset(true);
  }

  reset(first) {
    const s = this.spec, T = this.T;
    this.dead = false; this.gone = false; this.hp = this.hpMax; this.pos.copy(this.home); this.vel.set(0, 0); this.t = 0; this.cool = 1 + Math.random();
    this.flash = 0; this.flashCd = 0; this.chill = 0; this.poison = 0; this.burn = 0; this.stun = 0; this.awake = false; this.phase = 1; this.mv = null; this.atk = null; this.curName = null; this.hidden = false;
    this.air = this.flying; this.lastMove = null; this.alpha = 1;
    this.rises = 0; this.reborn = false; this.revived = false; this.cling = 0; this.axe = null; this.orbs = null; this.loose = 0; this.shotQ = null; this.spinA = 0; this.warnCol = null; this.wakeT = 0; this.dropT = 0; this.hopN = 0; if (this.tilt) this.tilt.position.set(0, 0, 0);
    this.state = s.rise ? 'buried' : T.ai === 'worm' || T.ai === 'merman' ? 'under' : ((T.ai === 'dropper' || T.ai === 'bat') && this.canHang()) ? 'hang' : 'idle';
    if (!first && this.root) {
      this.root.visible = !(this.state === 'buried' || this.state === 'under'); this.setAlpha(1);
      this.play(this.state === 'buried' ? T.anim.rise : T.anim.idle, 0, { restart: true }); if (this.state === 'buried' && this.cur) this.cur.paused = true;
      this.sync(0);
    }
  }
  canHang(at = this.home) { // a ceiling or ledge to cling to within reach above the spawn point (or above `at`)
    const y = at.y; let best = null;
    for (const s of this.room.solids) if (!s.oneway && !s.gone && at.x > s.x0 && at.x < s.x1 && s.y0 > y + 3 && s.y0 < y + 9 && (best === null || s.y0 < best)) best = s.y0;
    this.hangY = best; return best !== null;
  }

  async load() {
    const T = this.T, file = T.files[this.id % T.files.length];
    const g = await cloneGLTF(file);
    this.root = new THREE.Group(); this.model = g.scene; this.tilt = new THREE.Group(); this.tilt.add(this.model); this.root.add(this.tilt);
    fitHeight(this.model, T.h); this.model.updateMatrixWorld(true);
    { const bb = new THREE.Box3().setFromObject(this.model); if (isFinite(bb.min.y) && Math.abs(bb.min.y) < T.h * 0.4) this.model.position.y -= bb.min.y; }
    const lift = 1.25; // each model keeps its own texture colours (x1.3, x1.7 on knights, washed them all pale)
    this.mats = [];
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = o.material.clone(); const m = o.material; if (m.color) m.color.multiplyScalar(lift); m.envMapIntensity = 1.4; if (m.emissive && !m.emissiveMap) { m.emissive.setHex(0x030304); m.emissiveIntensity = 1; } m.userData.em = m.emissive ? m.emissive.getHex() : 0; m.userData.emI = m.emissiveIntensity; this.mats.push(m); } });
    const tintHex = this.spec.tint ?? T.tint; if (tintHex) { const tc = new THREE.Color(tintHex); for (const m of this.mats) { m.color.lerp(tc, 0.65); m.metalness = 0.35; m.roughness = 0.45; if (m.emissive) { m.emissive.setHex(0x1a2030); m.userData.em = 0x1a2030; } } } /* pale silver that reads indoors */ /* a named knight in pale silver */
    // a tight edge (power 3.5), so a tell rims the body instead of flooding it. A great four-legged or winged body is mostly
    // slanted surface (wings, flanks, neck): it takes a tighter edge (4.0) and a lower tell ceiling (TELL_K_WIDE), so the
    // warning lives on its outline, the mouth flare and its heat instead of washing the whole dragon scarlet
    this.wide = this.boss && !!(T.quad || T.dragon); this.tellK = this.wide ? TELL_K_WIDE : TELL_K;
    this.rim = { col: RIM_COOL.clone(), k: RIM_K, p: this.wide ? 4.0 : 3.5 }; this.rimP = this.rim.p; for (const m of this.mats) (this.boss ? rimLive : addRim)(m, this.rim); /* a great body's edge power is live (sync) */ this.weaponMats = []; this.model.traverse(o => { if (o.isMesh) o.renderOrder = 2; });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = Object.fromEntries(g.animations.map(c => [c.name, c]));
    try { await this.armUp(); } catch (e) { console.warn('arm', this.spec.t, e); }
    const caster = CASTERS.has(T.ai); this.castArm = caster ? this.findArms() : null; // casters (and shooting fliers) raise an arm into a cast
    this.castGlow = !!this.castArm; [this.armMax, this.armAim] = ARM_LIFT[this.spec.t] || [ARM_MAX, 0.55]; // a caster's hand also kindles (liftArm)
    if (this.wide && !this.hand) { const j = this.model.getObjectByName('jaw') || this.model.getObjectByName('head'); if (j?.isBone) this.maw = j; } // a dragon's tell flares at its jaw
    this.model.traverse(o => { if (o.isMesh) o.renderOrder = 2; }); // weapons too: only stone hides the hero
    if (this.spec.illusion) this.setAlpha(0.55); else if (T.alpha) this.setAlpha(T.alpha);
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
      const w = await weaponModel(id, 1), s = new THREE.Group(); bone.add(s); this.blade ||= w; w.traverse(o => { if (o.isMesh && o.material.emissive) { o.material.userData.em = o.material.emissive.getHex(); this.weaponMats.push(o.material); } }); this.hand ||= s;
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

  // the arms a caster can raise: { R, L } as { up: upper-arm bone, hand: hand bone } (Mixamo or UAL names; a held weapon's hand
  // first). Either may be missing on an odd rig; null when neither is there, and then nothing is ever bent.
  findArms() {
    const get = (...n) => n.map(x => this.model.getObjectByName(x)).find(o => o?.isBone), arm = h => h?.isBone && h.parent?.isBone && h.parent.parent?.isBone ? { up: h.parent.parent, hand: h } : null;
    const R = arm(this.hand?.parent?.isBone ? this.hand.parent : get('mixamorigRightHand', 'hand_r')), L = arm(get('mixamorigLeftHand', 'hand_l'));
    return R || L ? { R, L } : null;
  }
  // A cast must not read as an idle: through the wind-up (the same ramp as the tell, eased) the arm nearest the camera swings up
  // and forward toward the foe, at most ARM_MAX, holds through the release and lets go over about half a second. It is laid on
  // top of the clip after each mixer update and lifted off before the next (sync), so a bone the clip doesn't key never drifts.
  // A caster's raised hand also kindles (castGlow): an additive glow in the colour of its cast (castCol), as bright as the arm is
  // raised, swelling from 0.25 to 0.6 m over the wind-up and gone at the release. One sprite per caster, made at its first cast.
  liftArm(dt) {
    const A = this.castArm, k0 = this.armK || 0; let goal = 0, wind = -1;
    if (this.state === 'attack' && this.atk && !this.dead) { const k = this.t / this.atk.dur, w0 = this.atk.wins[0].a; goal = k < w0 ? smooth01(k / w0) : k < w0 + 0.2 ? 1 : 0; if (k < w0) wind = smooth01(k / w0); }
    const ak = this.armK = k0 + (goal - k0) * Math.min(1, dt * (goal > k0 ? 16 : 5)), cg = this.castFx;
    if (cg) cg.visible = false; // shown again below, at the hand, while the wind-up lasts
    if (ak < 0.01) { this.armSide = 0; return; }
    this.armSide ||= this.facing; // the side is kept until the arm is down again: a turn mid-release doesn't swap arms
    const a = this.hand || this.armSide > 0 ? (A.R || A.L) : (A.L || A.R), sh = a.up.getWorldPosition(_av1), d = a.hand.getWorldPosition(_av2).sub(sh);
    if (d.lengthSq() < 1e-6) return; d.normalize();
    const t = _av3.set(this.armSide * 0.78, this.armAim ?? 0.55, 0.3).normalize(), ang = d.angleTo(t); // up ~35° toward the foe (the Hierophant ~55°), a little toward the camera
    if (ang >= 0.01) {
      _aq1.setFromAxisAngle(_av4.crossVectors(d, t).normalize(), Math.min(ang, this.armMax ?? ARM_MAX) * ak);
      const pq = a.up.parent.getWorldQuaternion(_aq2); this.armBone = a.up; (this.armQ0 ||= new THREE.Quaternion()).copy(a.up.quaternion);
      a.up.quaternion.premultiply(_aq3.copy(pq).invert().multiply(_aq1).multiply(pq)); // the world-space swing, carried into the bone's own frame
    }
    if (!this.castGlow) return;
    let pop = 0; // the glow holds 0.1 s past the release and flares out (x1.6, fading), so the flash lands with the shot leaving
    if (wind >= 0) this.castHold = 0.1; else if (this.castHold > 0 && this.state === 'attack') { this.castHold -= dt; pop = 1 - Math.max(0, this.castHold) / 0.1; } else { this.castHold = 0; return; }
    let s = cg; if (!s) { s = this.castFx = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); this.root.add(s); }
    const at = a.hand.getWorldPosition(_av5); this.root.worldToLocal(at); // the hand after the lift (its chain is brought up to date)
    s.position.set(at.x, at.y, at.z + 0.25); s.scale.setScalar(wind >= 0 ? 0.25 + 0.35 * wind : 0.6 * (1 + 0.6 * pop)); s.material.opacity = wind >= 0 ? ak : ak * (1 - pop) * (1 - pop); s.material.color.setHex(this.castCol || CAST_COL[this.T.shot] || ELEM_COL[this.T.elem] || 0xb070ff); s.visible = true;
  }
  // How far the posed body reaches above its feet: its highest bone in the last drawn frame (plus the flesh over it), held at the
  // peak and let down at 0.8 m/s so a wingbeat doesn't make the camera breathe. A flying great foe's raised wings and head reach
  // well past T.h: the boss camera (main.js cam) frames this crown and skyY() keeps a climb inside that frame.
  measureCrown(dt) {
    const T = this.T, base = T.h * (T.quad ? 0.85 : 1), rw = this.root.matrixWorld.elements;
    if (!this._bones) { this._bones = []; this.model.traverse(o => { if (o.isBone) this._bones.push(o); }); }
    if (!this._bones.length || Math.abs(rw[13] - this.root.position.y) > 0.6) { this.crH ??= base; return; } // not drawn here yet: stale matrices
    let y = -Infinity; for (const b of this._bones) { const v = b.matrixWorld.elements[13]; if (v > y) y = v; }
    const raw = THREE.MathUtils.clamp(y - rw[13] + 0.35, base, T.h * 1.6);
    this.crH = Math.max(raw, (this.crH ?? raw) - dt * 0.8);
  }
  // The highest a flying great foe may hold or climb (`want` capped): a metre under the roof, and low enough that the boss camera's
  // tallest frame (g.bossSpan, set by main.js cam) still holds its crown and the hero's footing together. Never below 2.5 m.
  // Until the camera has told it, the span of the capped frame (z 20, 19 on a phone; fov 34): it was 14.3, the old z 24 frame's.
  skyY(want) {
    const g = this.g, T = this.T, fy = this.arenaFloor ?? this.home.y, foot = g.footY ?? g.player?.pos.y ?? fy, crown = this.crH ?? T.h * (T.quad ? 0.85 : 1);
    const span = g.bossSpan || 2 * Math.tan(THREE.MathUtils.degToRad((g.camera?.fov ?? 34) / 2)) * ((LOW_MEM || innerHeight < 500 ? 19 : 20) - 0.6);
    return Math.min(want, this.room.b.y1 - Math.max(T.h, crown) - 1, Math.max(fy + 2.5, foot + span - 2.5 - crown));
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
  setAlpha(a) { this.alpha = a; const tr = a < 1; for (const m of this.mats || []) { if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = a; m.depthWrite = a > 0.5; } }

  get aabb() {
    const w = this.T.w, h = this.T.h * (this.T.quad ? 0.8 : 0.95), x = this.pos.x, y = this.pos.y, k = this.cling; // cling: a crawler on a side (1, 3) or the underside (2) of its ledge
    return k === 1 ? { x0: x, x1: x + h, y0: y - w / 2, y1: y + w / 2 } : k === 2 ? { x0: x - w / 2, x1: x + w / 2, y0: y - h, y1: y } : k === 3 ? { x0: x - h, x1: x, y0: y - w / 2, y1: y + w / 2 } : { x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + h };
  }
  get cx() { return this.cling ? (this.aabb.x0 + this.aabb.x1) / 2 : this.pos.x; } get cy() { return this.cling ? (this.aabb.y0 + this.aabb.y1) / 2 : this.pos.y + this.T.h * 0.55; }
  get mouth() { return { x: this.pos.x + this.facing * this.T.w * 0.5, y: this.pos.y + this.T.h * (this.T.quad ? 0.6 : 0.8) }; }
  get dmgMul() { return (this.phase >= 3 ? 1.25 : 1) * (this.boss && !this.T.cls && this.T.tier >= 3 ? 1.25 : 1) * (this.ds || 1); } // ds: a regular foe raised to its room's level
  // elites (the shielded knights, the giant, the night demon) take a boss's wind-up; a catalog `elite` flag overrides
  get elite() { return this.T.cls === 'elite'; }

  // ------------------------------------------------------------------------------------------------ update
  update(dt, P) {
    const T = this.T; this.t += dt; if (this.flash > 0) this.flash -= dt; if (this.flashCd > 0) this.flashCd -= dt; if (this.invulnT > 0 && (this.invulnT -= dt) <= 0) this.invuln = false; if (this.cool > 0) this.cool -= dt; if (this.breakT > 0) this.breakT -= dt;
    if (this.chill > 0) this.chill -= dt;
    if (this.poison > 0) { this.poison -= dt; this.pT = (this.pT || 0) + dt; if (this.pT > 0.5) { this.pT = 0; this.damage(Math.max(1.5, this.poisonDmg || 0), 'poison', true, false, 0, true); } }
    if (this.burn > 0) { this.burn -= dt; this.bT = (this.bT || 0) + dt; if (this.bT > 0.4) { this.bT = 0; this.damage(Math.max(2, this.burnDmg || 0), 'fire', true, false, 0, true); this.g.fx.burst(this.cx, this.cy, 0xff6a20, 4, 2); } }
    if (this.dotN > 0 && (this.dotT = (this.dotT || 0) + dt) >= 1) { this.num(Math.round(this.dotN), this.dotE, true); this.dotN = 0; this.dotT = 0; } // damage over time: one small number a second
    if (this.pz > 0 && (this.pzT = (this.pzT || 0) + dt) > 1.5) this.pz = Math.max(0, this.pz - this.hpMax * 0.04 * dt); // poise refills once the pressure lets up
    if (this.axe) this.tickAxe(dt); if (T.ai === 'orbiter') this.tickOrbs(dt, P);
    if (this.dead) { this.tickDead(dt, P); this.physics(dt); this.sync(dt); return; }
    // safety net: a fade outside the states and moves that fade on purpose (a cut blink, a phase landing mid-mirror) must
    // never leave the body a pale see-through ghost, or hidden and unhittable
    if ((this.alpha < 1 || this.hidden) && !this.spec.illusion && !FADE_STATES.has(this.state) && !(this.mv && FADE_MOVES.has(this.mv.m.k))) { this.setAlpha(T.alpha || 1); this.hidden = false; }
    if (this.boss && !this.hidden && (this.chill > 0 || this.burn > 0 || this.poison > 0) && (this.moteT = (this.moteT || 0) - dt) <= 0) { this.moteT = rnd(0.4, 0.6); this.mote(); } // a great foe's status: motes, not a tint (sync)
    if (this.stun > 0) { this.stun -= dt; this.vel.x *= 0.85; if (this.air) this.vel.y *= 0.8; /* a parry mid-climb must not let a flier coast on up through the roof */ if (this.stunStars) this.g.fx.spawn(this.cx + rnd(-0.6, 0.6), this.pos.y + T.h + 0.2, 0.5, 0, 0.6, 0xffe890, 0.3, 0.16, 0); if (this.stun <= 0 && this.state !== 'attack') { this.state = 'chase'; this.t = 0; } if (this.boss && !this.spec.illusion) this.shove(P, dt); this.physics(dt); this.sync(dt * 0.25); return; }
    const dx = P.pos.x - this.pos.x, adx = Math.abs(dx), dy = P.pos.y - this.pos.y;
    const c = { dx, adx, dy, sees: adx < T.aggro && Math.abs(dy) < (this.boss ? 30 : this.flying ? 9 : 4.5) && P.state !== 'dead', slow: this.chill > 0 ? 0.55 : 1 };
    switch (this.state) {
      case 'buried':
        if (adx < 6.5 && Math.abs(dy) < 1.6) { this.state = 'rise'; this.t = 0; this.root.visible = true; const a = this.play(T.anim.rise, 0, { once: true, restart: true }); if (a) a.paused = false; audio.play('squelching_2', 0.5); this.g.fx.dust(this.pos.x, this.pos.y, 0x3a3028); this.facing = sgn(dx); }
        break;
      case 'rise': if (this.t > 1.2) { this.state = 'idle'; this.t = 0; } break;
      case 'intro': this.vel.x = 0; if (this.air) this.vel.y = (Math.min(this.pos.y, this.skyY(Infinity)) - this.pos.y) * 3; /* a phase roar can cut a climb short: hold the height (under the cap), don't coast up out of the hall */ if (this.t > (this.introT || 2.2)) { this.state = 'chase'; this.t = 0; this.cool = 0.4; } break;
      case 'attack': this.tickAttack(dt, P, c); break;
      case 'stagger': case 'hurt': this.vel.x *= 0.88; if (this.t > (this.state === 'stagger' ? 0.7 : 0.35)) { this.state = 'chase'; this.t = 0; } break;
      case 'rest': this.vel.x *= 0.8; if (this.t > (this.restT || 0.6)) { this.state = 'chase'; this.t = 0; } break; // spent after its own attack: the opening
      case 'pile': // a Bonewhelp fallen apart: one more blow scatters it for good, or it knits itself back together at half its life
        this.vel.x = 0; this.warnCol = 0x7ad8ff; this.warn = Math.min(1, this.t / 2.4);
        if (this.t > 2.4) { this.warnCol = null; this.hp = Math.round(this.hpMax * 0.5); this.state = 'chase'; this.t = 0; this.cool = 0.6; this.play(T.anim.idle, 0.3, { restart: true }); this.g.fx.burst(this.cx, this.cy, 0x7ad8ff, 18, 4); audio.play('bone_snap', 0.4, 0.7); }
        break;
      default: (BRAIN[T.ai] || BRAIN.walker)(this, dt, P, c);
    }
    // contact damage; a great foe's body is solid instead (no standing inside a boss), except while it rushes through you
    const mv = this.mv, charging = mv && ['charge', 'ram'].includes(mv.m.k) && mv.s.go, rush = charging || (mv && (['hunt', 'frenzy', 'swoop', 'strafe', 'shellspin'].includes(mv.m.k) || (mv.m.k === 'divebomb' && !mv.s.down)));
    if (this.boss && !this.spec.illusion) { if (!this.hidden && !rush) this.shove(P, dt); }
    else if (!this.hidden && T.touch && !charging && !['buried', 'rise', 'hurt', 'stagger', 'under', 'hang', 'climb', 'pile', 'surface', 'intro', 'crouch'].includes(this.state) && !this.spec.illusion) {
      const a = this.aabb, pa = P.aabb;
      if (a.x0 + 0.1 < pa.x1 && a.x1 - 0.1 > pa.x0 && a.y0 < pa.y1 && a.y1 > pa.y0) P.takeHit(Math.round(T.touch * this.dmgMul), this.pos.x, null, this);
    }
    this.physics(dt);
    this.sync(dt);
  }

  tickDead(dt, P) {
    this.vel.x *= 0.9; const again = this.T.ai === 'riser' && this.spec.rise && this.rises < RISES && !this.summoner, hold = this.boss ? 3.2 : again ? 0.7 : 1.6;
    if (!this.clips[this.T.anim.death]) this.tilt.rotation.z = Math.min(1.4, this.t * 2.2) * -this.facing * 0.6, this.tilt.position.y = -Math.min(1, this.t) * this.T.h * 0.15;
    if (this.boss && this.t < hold && Math.random() < 0.5) this.g.fx.burst(this.cx + rnd(-1, 1) * this.T.w * 0.5, this.pos.y + Math.random() * this.T.h, Math.random() < 0.5 ? 0xffe0a0 : 0xff5030, 6, 4);
    if (this.t > hold) { const k = Math.min(1, (this.t - hold) / 0.8); this.setAlpha(1 - k); if (k >= 1) { this.root.visible = false; if (!(again && P && this.rerise(P))) this.gone = true; } }
  }
  // A buried Shambler's corridor keeps giving up its dead while the hero stands in it: it claws out again a few metres from them,
  // up to RISES times. The ones that come back are worth a sliver of XP and carry nothing (main.js onEnemyDeath: `reborn`).
  rerise(P) {
    const rb = this.room.b, y = this.home.y; if (Math.abs(P.pos.x - this.home.x) > 12 || Math.abs(P.pos.y - y) > 3 || P.state === 'dead') return false;
    for (let i = 0; i < 6; i++) {
      const x = THREE.MathUtils.clamp(P.pos.x + (Math.random() < 0.5 ? -1 : 1) * rnd(3.5, 6), Math.max(rb.x0 + 1.5, this.home.x - 10), Math.min(rb.x1 - 1.5, this.home.x + 10));
      if (Math.abs(x - P.pos.x) < 2.5 || Math.abs(this.g.floorBelow(x, y + 0.5) - y) > 0.3 || this.g.hazardAt?.(x, y) || this.g.activeSolids().some(s => !s.oneway && !s.gone && x + 0.4 > s.x0 && x - 0.4 < s.x1 && y + 1.6 > s.y0 && y + 0.1 < s.y1)) continue;
      this.rises++; this.reborn = true; this.dead = false; this.hp = this.hpMax; this.pos.set(x, y); this.vel.set(0, 0); this.state = 'buried'; this.t = 0; this.cool = 0.5; this.flash = 0; this.poison = this.burn = this.chill = 0; this.setAlpha(1);
      this.tilt.rotation.z = 0; this.tilt.position.set(0, 0, 0); this.play(this.T.anim.rise, 0, { restart: true }); if (this.cur) this.cur.paused = true; this.sync(0); return true;
    }
    return false;
  }

  // ---- generic timed attack: windows of [a,b] fractions during which a box in front connects
  attackStart(o) {
    const T = this.T; this.state = 'attack'; this.t = 0; this.vel.x = 0;
    const anim = this.clipFor(o.anim) || this.clipFor(T.anim.attack);
    const dur0 = o.dur || T.atkDur, wins = (o.hits ? o.hits.map(h => [h - 0.05, h + 0.07]) : [o.windup || T.windup]).map(w => ({ a: w[0], b: w[1], done: false }));
    // below reaction time (goblin .22 s, mannequin .21 s) the whole blow is slowed until its wind-up is long enough to read:
    // a uniform stretch keeps the clip's strike pose on the hit frame. Each active window lasts at least ACTIVE seconds.
    const min = o.told ? 0 : this.boss || this.elite ? LEAD_BIG : LEAD, lead = wins[0].a * dur0, dur = lead > 0 && lead < min ? dur0 * min / lead : dur0;
    for (const w of wins) w.b = Math.max(w.b, w.a + ACTIVE / dur);
    this.atk = { dur, lk: dur0 / dur, wins, reach: o.reach ?? T.reach, dmg: (o.dmg ?? T.dmg) * this.dmgMul, o, fired: false, tele: false }; // lk: a lunge keeps its length
    this.playFor(anim, this.atk.dur);
    this.g.fx.glint(this.pos.x + this.facing * 0.5, this.pos.y + T.h * 0.85, this.boss ? 0xff4040 : 0xfff0c0);
  }
  tickAttack(dt, P, c) {
    const A = this.atk, o = A.o, T = this.T, k = this.t / A.dur, w0 = A.wins[0].a;
    if (k < w0) this.warn = Math.max(this.warn || 0, k / w0);
    if (k > w0 - 0.08 && !A.tele) { A.tele = true; audio.play(this.boss ? 'sword_attack_3' : (T.sword || T.arm) ? 'sword_attack_2' : 'squelching_1', 0.45, this.boss ? 0.7 : 1); }
    this.vel.x = o.lunge && (o.lungeAll ? A.wins.some(w => k > w.a - 0.1 && k < w.b) : (k > w0 - 0.1 && k < A.wins[0].b)) ? this.facing * o.lunge * A.lk : 0;
    if (k >= w0 && !A.fired) { A.fired = true; o.fire?.(this, P); }
    if (A.wins.some(w => k >= w.a - 0.04 && k <= w.b + 0.03) && !o.noHit) this.swingOn = true; // the blade draws its arc
    for (const w of A.wins) if (!w.done && k >= w.a && k <= w.b && !o.noHit) {
      const hb = { x0: this.pos.x + (this.facing > 0 ? -0.2 : -A.reach), x1: this.pos.x + (this.facing > 0 ? A.reach : 0.2), y0: this.pos.y + (o.low ? 0 : 0.2), y1: this.pos.y + (o.low ? 1.0 : T.h + 0.4) };
      const pa = P.aabb;
      if (hb.x0 < pa.x1 && hb.x1 > pa.x0 && hb.y0 < pa.y1 && hb.y1 > pa.y0) {
        const r = P.takeHit(Math.round(A.dmg), this.pos.x, o.elem || (T.venom ? 'poison' : null), this); if (r) w.done = true; if (r && o.flurry) P.inv = Math.min(P.inv, 0.28); /* a flurry's later thrusts can still land */
        if (r === 'block' && !this.boss) { this.state = 'stagger'; this.t = 0; this.vel.x = -this.facing * 2.5; this.play(T.anim.hit, 0.08, { once: true, restart: true }); return; }
      }
    }
    if (k >= 1) { this.state = 'chase'; this.t = 0; this.atk = null; this.cool = o.cool ?? ((this.boss ? 0.55 : 1.0) / (this.phase > 1 ? 1.3 : 1) + Math.random() * 0.6); o.done?.(this, P); }
  }

  // A place this body can actually stand near (x, around height y): on stone, clear of solids, not across a gate.
  // the open floor a big body can run along: walk out from its home until stone (a block, a step, a wall) stands in the way
  arenaSpan() {
    if (this._span) return this._span;
    const fy = this.arenaFloor ?? this.home.y, hw = this.T.w / 2 + 0.2, sol = this.g.activeSolids().filter(q => !q.oneway && !q.gone && q.y0 < fy + 1.8 && q.y1 > fy + 0.3);
    const free = x => !sol.some(q => q.x0 < x + hw && q.x1 > x - hw), go = d => { let x = this.home.x; for (let i = 0; i < 200 && free(x + d * 0.4); i++) x += d * 0.4; return x; };
    return (this._span = [go(-1), go(1)]);
  }
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
    if (this.state === 'buried' || this.state === 'under' || this.state === 'hang' || this.state === 'climb' || this.state === 'crawl' || this.hidden) return;
    if (!this.dead && (this.T.ai === 'ghost' || this.T.ai === 'merman')) return; // a shade drifts through stone; a merman's leap is its own arc
    const flying = this.air && !this.dead; if (this.pullT > 0) { this.pullT -= dt; this.vel.x = this.pullV; }
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
  // Ease the hero out of a great body to its near side (the far side when stone stands there). A dash or a dive passes through.
  shove(P, dt) {
    if (P.state === 'dash' || P.state === 'dive' || P.state === 'dead') return;
    const a = this.aabb, pa = P.aabb; if (!(a.x0 + 0.1 < pa.x1 && a.x1 - 0.1 > pa.x0 && a.y0 < pa.y1 && a.y1 > pa.y0)) return;
    const hw = this.T.w / 2 + 0.21, free = x => !this.g.activeSolids().some(s => !s.oneway && !s.gone && x + 0.31 > s.x0 && x - 0.31 < s.x1 && P.pos.y + 1.5 > s.y0 && P.pos.y + 0.05 < s.y1);
    let d = sgn(P.pos.x - this.pos.x); if (!free(this.pos.x + d * hw) && free(this.pos.x - d * hw)) d = -d;
    P.pos.x += (this.pos.x + d * hw - P.pos.x) * Math.min(1, dt * 14);
  }

  // An afterimage: a ghost of the model frozen in this instant's pose, tinted and fading. A small pool per foe (bosses only
  // call it), so a charge leaves a trail of its own silhouette without new allocations each frame.
  ghost(col = 0xff3a20, life = 0.32, op = 0.42) {
    const n = LOW_MEM ? 2 : 4; this.ghosts ||= []; this.ghostI = (this.ghostI || 0) + 1;
    let gh = this.ghosts[this.ghostI % n];
    if (!gh) {
      const c = SkeletonUtils.clone(this.model), rim = { col: new THREE.Color(col), k: 1.6, p: 1.8 }, mat = addRim(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: col, emissiveIntensity: 0.12, roughness: 1, metalness: 0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), rim);
      c.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; o.frustumCulled = false; o.renderOrder = 1; } if (o.isSprite || o.isLight) o.visible = false; });
      const src = [], dst = []; this.model.traverse(o => src.push(o)); c.traverse(o => dst.push(o));
      gh = this.ghosts[this.ghostI % n] = { c, mat, rim, src, dst, t: 0, life }; this.room.group.add(c);
    }
    for (let i = 0; i < gh.src.length && i < gh.dst.length; i++) { const a = gh.src[i], b = gh.dst[i]; b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); }
    this.model.updateWorldMatrix(true, false); gh.c.matrix.copy(this.model.matrixWorld); gh.c.matrix.decompose(gh.c.position, gh.c.quaternion, gh.c.scale); gh.c.position.z -= 0.55; // set back behind the body, so it trails rather than washing the live model out
    gh.mat.emissive.setHex(col); gh.col = col; gh.t = 0; gh.life = life; gh.op = op; gh.c.visible = true;
  }
  tickGhosts(dt) { for (const g of this.ghosts || []) if (g?.c.visible) { g.t += dt; const k = Math.min(1, g.t / g.life); g.mat.opacity = Math.min(1, g.op * 1.5) * (1 - k) ** 1.5; g.rim.col.setHex(g.col).lerp(_gc.setHex(0xfff2e0), 0.35 * Math.max(0, 1 - k * 2)); if (k >= 1) g.c.visible = false; } } // its own tint with a little heat when fresh (a full white copy read as a second, ghostly boss)

  // One status mote off a great body (update emits about two a second): a small pale-blue frost speck that drifts out and settles,
  // or an ember / a venom bead that rises. Drawn by the shared FX particles (main.js FX.spawn: pooled sprites).
  mote() {
    const T = this.T, i = this.chill > 0 ? 0 : this.burn > 0 ? 1 : 2, x = this.pos.x + rnd(-0.42, 0.42) * T.w, y = this.pos.y + Math.min(T.h, 4) * rnd(0.3, 0.95), out = sgn(x - this.pos.x) * rnd(0.15, 0.5);
    this.g.fx.spawn(x, y, 0.6, out, i ? rnd(0.5, 1.0) : rnd(-0.05, 0.25), MOTE_COL[i], rnd(0.9, 1.3), rnd(0.11, 0.18), i === 1 ? -0.5 : i === 2 ? -0.15 : 0.3);
  }
  // A great foe off the ground (a flier, a dragon aloft, a leap) casts a soft dark blob on the floor straight below it: where it is
  // over the arena, and where a dive comes down. It hugs the floor under the foe and shrinks and fades as the foe climbs. One mesh
  // per foe (made at its first flight, beside its root in the room: not on it, or the drawn root's blend between steps would lift
  // it off the floor during a dive), one shared plane and texture.
  floorShadow() {
    let sh = this.fshadow;
    if (this.dead || this.hidden || this.state === 'hang' || !this.root.visible || (this.ground && !this.air)) { if (sh) sh.visible = false; return; }
    const x = this.pos.x, y = this.pos.y + 0.05; let fy = -Infinity;
    for (const s of this.g.activeSolids()) if (!s.gone && s.kind !== 'ceil' && x > s.x0 && x < s.x1 && s.y1 <= y && s.y1 > fy) fy = s.y1;
    const h = y - fy; if (!(h > 0.3 && h < 40)) { if (sh) sh.visible = false; return; }
    if (!sh) {
      sh = this.fshadow = new THREE.Mesh(_shGeo ||= new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex(), color: 0x000000, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      sh.renderOrder = 1;
    }
    if (sh.parent !== this.root.parent) this.root.parent?.add(sh);
    const k = Math.min(1, h / 12), w = Math.max(this.T.w, (this.visW || 0) * 0.5) * (1 - 0.25 * k); // 12 m up: three quarters the size, still ~.45 dark (at a third it vanished on dark planks)
    sh.position.set(x, fy + 0.04, this.root.position.z); sh.scale.set(w, 1, Math.min(2.6, w * 0.45)); sh.material.opacity = (0.62 - 0.17 * k) * Math.min(1, (h - 0.3) / 0.8); sh.visible = true;
  }

  sync(dt) {
    if (this.ghosts) this.tickGhosts(dt);
    if (this.blade && (this.swingOn || this.trail?.life > 0)) { this.trail ||= new Trail(this.room.group); if (this.swingOn) { this.model.updateMatrixWorld(true); this.trail.push(this.blade, 'foe', this.ground && !this.air ? this.pos.y : null); } else this.trail.end(); this.trail.update(dt); } this.swingOn = false;
    if (this.armBone) { this.armBone.quaternion.copy(this.armQ0); this.armBone = null; } // last step's raised arm comes off before the clip poses it again
    this.mixer.update(dt);
    const T = this.T, target = this.facing * (T.quad ? Math.PI / 2 - 0.22 : Math.PI / 2 - 0.42);
    this.yaw += (target - this.yaw) * Math.min(1, dt * (T.quad ? 6 : 10));
    const hung = this.state === 'hang' || this.state === 'climb', cl = this.dead ? 0 : this.cling;
    this.root.position.set(this.pos.x, this.pos.y + (hung ? T.h : 0), T.quad && !cl ? -1.0 : 0); this.model.rotation.y = this.yaw + (this.spinA || 0); // quadrupeds stand a metre back: their slight yaw no longer swings a head over the hero's lane
    this.root.rotation.z = hung ? Math.PI : cl ? -cl * Math.PI / 2 : 0;
    if (this.castArm) this.liftArm(dt);
    if (this.boss && (this.flying || T.fly)) this.measureCrown(dt);
    // a cool rim keeps every foe readable against dark stone. A wind-up colours the rim from its start and heats it (and
    // the weapon) over the last WARN_HEAT s, with a small flare at the hand for the last WARN_FLARE s. A hit flashes the
    // rim white, but a tell in progress keeps the rim: the warning is never switched off by trading blows.
    // A great body never takes a fill: its flash and its status live on the rim alone, on a tighter edge (RIM_P_TIGHT, rimLive), and
    // a status also sheds motes (mote()). Small foes keep the faint flash fill and the status tint.
    const big = this.boss || this.T.mini || this.T.boss, f = this.flash > 0 ? 1 : 0, fe = f && !big ? 1 : 0, st = this.chill > 0 ? 2 : this.burn > 0 ? 3 : this.poison > 0 ? 4 : this.stun > 0 ? 5 : 0, key = big ? 0 : fe * 10 + st;
    if (big) { this.rim.p = this.rimP ?? this.rim.p; if (dt > 0 && this.g.player) this.floorShadow(); } // (not from load()/reset(): sync(0), maybe before the hero exists)
    // w: share of the wind-up gone (every tell ramps warn = elapsed / wind-up), so its rise per step gives the time left
    const w = Math.min(1, this.warn || 0), wp = this._wPrev || 0, rise = w > wp ? w - wp : w;
    const left = w <= 0 ? Infinity : w >= 1 ? 0 : rise > 1e-6 && dt > 0 ? (1 - w) * dt / rise : Math.max(0, (this._wLeft ?? 9) - dt);
    this._wPrev = w; this._wLeft = left; this.warn = 0;
    // a great wide body (dragons) carries more of its tell on the jaw: the flare kindles with the heat (WARN_HEAT) and burns larger
    const heat = w > 0 ? THREE.MathUtils.clamp(1 - left / WARN_HEAT, 0, 1) : 0, fk = w > 0 ? THREE.MathUtils.clamp(1 - left / (this.wide ? WARN_HEAT : WARN_FLARE), 0, 1) : 0;
    if (w > 0) { this.rim.col.copy(RIM_COOL).lerp(this.warnCol ? _wc.setHex(this.warnCol) : RIM_HOT, Math.min(1, w * 1.3)); this.rim.k = RIM_K + Math.max(w * 0.5, heat) * ((this.tellK ?? TELL_K) - RIM_K); }
    else if (f) { this.rim.col.copy(RIM_HIT); if (big) { this.rim.k = this.wide ? FLASH_K_WIDE : FLASH_K_BIG; this.rim.p = Math.max(this.rim.p, RIM_P_TIGHT); } else this.rim.k = FLASH_K; } // a great body: .28 / .32 on the tight edge (.5 washed Caddoc grey-white)
    else if (this.breakT > 0) { this.rim.col.copy(RIM_BREAK); this.rim.k = 0.55 + Math.sin(this.t * 22) * 0.25; } // a broken stance flickers gold
    else if (st) { this.rim.col.setHex([0, 0, 0x6ab8ff, 0xff7a34, 0x8aff66, 0xffe08a][st]); this.rim.k = big ? 0.2 : 0.28; if (big) this.rim.p = Math.max(this.rim.p, RIM_P_TIGHT); } // chilled / burning / poisoned / stunned: an edge of the element's colour (at .36 the big tripo bodies, whose normals face the camera at a slant, went blue glass)
    else { this.rim.col.copy(RIM_COOL); this.rim.k = RIM_K; }
    if (key !== this._fx) { this._fx = key; const col = fe ? 0xffffff : [0, 0, 0x2060a0, 0x802000, 0x206010, 0x504010][st]; for (const m of this.mats) if (m.emissive && !m.emissiveMap) { m.emissive.setHex(fe || st ? col : m.userData.em); m.emissiveIntensity = fe ? FLASH_EM : st ? 0.16 : m.userData.emI; } } // a small foe's status tints (a great body's never does: even .06 left a chilled boss navy all over); the rim carries the colour
    if (heat !== this._heat || this.warnCol !== this._wcol) { this._wcol = this.warnCol; this._heat = heat; for (const m of this.weaponMats) { m.emissive.setHex(heat ? (this.warnCol || 0xff3a10) : m.userData.em); m.emissiveIntensity = heat * 1.4; } }
    if (fk > 0 || this.flare?.visible) { if (!this.flare) { this.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff5020, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); this.root.add(this.flare); }
      const fl = this.flare; fl.visible = fk > 0; if (fl.visible) { const at = this.hand ? this.hand.getWorldPosition(_av5) : this.maw ? this.maw.getWorldPosition(_av5) : _av5.set(this.mouth.x, this.mouth.y, 0); this.root.worldToLocal(at); fl.position.copy(at); fl.position.z += 0.3; fl.scale.setScalar((0.25 + 0.25 * fk) * (this.wide ? 1.8 : 1)); fl.material.opacity = 0.6 * fk; } } // capped (scale .5, opacity .6): at 1.25 / 1.0 it blew out the hand; a dragon's jaw takes .9
  }

  // Is a blow from this side turned aside right now? (`front`: the hero stands on the side it faces.)
  guardUp(front) {
    const ai = this.T.ai, st = this.state; if (this.stun > 0 || this.dead) return false;
    if (ai === 'shield') return front && !(st === 'rest' || st === 'hurt' || st === 'stagger' || (st === 'attack' && this.atk && this.t / this.atk.dur >= this.atk.wins[0].a));
    if (ai === 'lancer') return front && (st === 'chase' || st === 'idle' || st === 'paw' || st === 'charge');
    if (ai === 'spinner') return st === 'spin';
    if (ai === 'counter') return front && st === 'ward';
    return false;
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
    if (this.guardUp(front) && !sunder) { // a shield, a whirling mace or a ward turns the blow: no way round it but its own opening (or its back)
      this.g.fx.burst(this.pos.x + this.facing * 0.6, this.pos.y + 1.3, 0xfff0b0, 16, 4); audio.play('sword_parry_' + (1 + (Math.random() * 3 | 0)), 0.6);
      this.g.ui.dmg(this.pos.x, this.pos.y + T.h + 0.2, 'GUARD', 'crit'); P.vel.x = -P.facing * 3;
      const hint = T.ai === 'counter' ? ['wardHint', 'A pale ward throws your blow back — wait for it to drop'] : T.ai === 'spinner' ? ['spinHint', 'The whirl turns every blow — back away until it tires'] : ['guardHint', 'Its shield turns the blade — strike after its own swing, or from behind'];
      if (!this.g.flags[hint[0]]) { this.g.flags[hint[0]] = 1; this.g.ui.toast(hint[1], 'magic'); }
      if (T.ai === 'counter') { this.warnCol = null; this.facing = sgn(P.pos.x - this.pos.x); this.attackStart({ anim: T.anim.attack3 || T.anim.attack, dur: 0.8, lunge: 6, reach: T.reach + 0.4, cool: 0.8, done: s => { s.state = 'rest'; s.t = 0; s.restT = 0.7; s.breakT = 0.7; s.vel.x = 0; } }); } // the riposte
      return true;
    }
    let mul = 1;
    if (T.armorFront && front && !high && !sunder) { mul = 1 - T.armorFront; this.g.fx.burst(this.pos.x + this.facing * T.w * 0.4, this.cy, 0xd0d8e0, 10, 4); audio.play('sword_blocked_1', 0.5); if (!this.g.flags.shellHint) { this.g.flags.shellHint = 1; this.g.ui.toast('Its shell turns the blade — strike from behind or above', 'magic'); } }
    if (this.stun > 0 && this.boss) mul *= 1.5;
    const base = Math.max(1, Math.round(roll.dmg * mul)); let total = base, big = null;
    for (const e of roll.elem) {
      total += e.dmg; if (e.dmg > (big?.dmg || 0)) big = e;
      if (e.elem === 'ice') this.chill = 3; if (e.elem === 'poison') { this.poison = 2.5; this.poisonDmg = e.dmg * 0.3; } if (e.elem === 'fire') this.g.fx.burst(this.cx, this.cy, 0xff6a20, 14, 3);
      if (e.elem === 'lightning') this.g.chainLightning(this, e.dmg);
    }
    if (Number.isFinite(total)) this.num(total, [roll.crit && 'crit', big?.elem].filter(Boolean).join(' ')); // one number per blow, tinted by its largest element
    this.damage(total, null, false, roll.crit, hb.proj ? 0 : hb.pull && !T.mini ? sgn(P.pos.x - this.pos.x) * 1.9 : hb.both ? sgn(this.pos.x - P.pos.x) || P.facing : P.facing); // a scythe hooks foes in; a turning strike throws them outward
    if (hb.pull && !this.boss && !this.mini && !this.dead && Math.abs(P.pos.x - this.pos.x) > 1.1) { this.pullT = 0.22; this.pullV = sgn(P.pos.x - this.pos.x) * Math.min(8, (Math.abs(P.pos.x - this.pos.x) - 1) / 0.22); } // dragged in to arm's length, whatever it was doing
    const lp = Math.min(P.d.leech || 0, 8) * (this.boss ? 0.5 : 1); if (lp && Number.isFinite(total) && total > 0) P.heal(Math.max(1, Math.round(total * lp / 100)), true); // leech caps at 8%, half of that from great foes
    return true;
  }

  // A damage number over this foe: one per blow, at most three alive, each in its own slot ~16 px above the last
  // (the oldest gives its slot up). `small`: a damage-over-time sum, drawn at 60%.
  num(n, cls, small) {
    const ui = this.g.ui; if (!ui) return;
    const now = performance.now(), L = this.nums = (this.nums || []).filter(o => o.el.isConnected && now - o.t < 900);
    const slot = this.numSlot = L.length ? ((this.numSlot ?? 0) + 1) % 3 : 0, i = L.findIndex(o => o.s === slot); if (i >= 0) { L[i].el.remove(); L.splice(i, 1); }
    const cam = this.g.camera, px = cam?.isPerspectiveCamera ? 2 * Math.tan(cam.fov * Math.PI / 360) * Math.max(2, cam.position.z) / innerHeight : 0.02; // world metres per screen pixel at the foe's depth
    const r = ui.dmg(this.pos.x, this.pos.y + Math.min(this.T.h, 3.4) + 0.2 + slot * 16 * px, n, cls), el = r?.nodeType === 1 ? r : document.body.lastElementChild; // ui.dmg appends one element
    if (el?.classList?.contains('dmg')) { if (small) el.style.scale = '0.6'; L.push({ el, t: now, s: slot }); }
  }

  damage(n, elem, quiet, crit, pushDir, dot) {
    if (this.dead || this.invuln || !Number.isFinite(n) || n <= 0) return; // a NaN blow (a missile without damage) must never poison the HP
    this.hp -= n; if (!quiet && !(this.flashCd > 0)) { this.flash = 0.06; this.flashCd = FLASH_GAP; } if (pushDir) this.lastPush = pushDir; this.lastMelee = !quiet && !!pushDir;
    if (quiet) { if (dot) { this.dotN = (this.dotN || 0) + n; this.dotE = elem; } else this.num(Math.round(n), elem); } // ticks are summed into one number a second
    if (!quiet) audio.play('sword_impact_hit_' + (1 + (Math.random() * 3 | 0)), 0.55);
    this.g.fx.burst(this.cx, this.cy, this.T.ai === 'stalker' || this.T.revive ? 0xd0c8b0 : 0x8a0a14, quiet ? 3 : 5, 3); if (!quiet) this.g.fx.sparks(this.cx - (pushDir || 0) * 0.3, this.cy + 0.2, 0xffe8c0, 7, 7); /* steel on flesh throws sparks; a little blood */
    if (this.hp <= 0) {
      if (!this.T.revive || this.revived) return this.die();
      this.revived = true; this.hp = 1; this.atk = null; this.state = 'pile'; this.t = 0; this.vel.x = 0; this.tilt.position.set(0, 0, 0); this.play(this.clipFor(this.T.anim.death) || this.T.anim.idle, 0.1, { once: true, restart: true }); audio.play('bone_snap', 0.5); return; // a Bonewhelp falls apart once (update: 'pile')
    }
    if (this.state === 'pile') return;
    // Fodder flinches at every blow and common foes whenever they are not mid-swing (a wind-up included: three quick cuts lock one
    // down until it falls). Elites and great foes never flinch: they flash, and must be answered in their openings.
    const heavy = this.boss || this.T.cls === 'elite' || this.T.ai === 'brute' || this.T.ai === 'worm' || NO_FLINCH.has(this.T.ai) || this.state === 'hang' || this.state === 'climb' || this.state === 'rise';
    const winding = this.state === 'attack' && this.atk && this.t / this.atk.dur < this.atk.wins[0].a;
    if (!quiet && !heavy && (this.state !== 'attack' || winding || this.T.cls === 'fodder') && !this.air) { this.atk = null; this.state = 'hurt'; this.t = 0; this.pounce = false; this.spinA = 0; this.warnCol = null; this.tilt.position.set(0, 0, 0); this.vel.x = (pushDir || -this.facing) * (crit ? 4 : 2.2); this.play(this.T.anim.hit, 0.05, { once: true, restart: true }); }
    else if (!quiet && !heavy && this.air) { this.vel.x = (pushDir || -this.facing) * 3; }
    if (this.boss && !this.spec.illusion) {
      const ph = this.hp < this.hpMax * 0.33 && (this.T.moves || []).some(m => m.phase === 3) ? 3 : this.hp < this.hpMax * 0.6 ? 2 : 1;
      if (ph > this.phase) { this.phase = ph; this.mv?.s.book?.close(); this.mv = null; this.atk = null; this.state = 'intro'; this.air = this.flying || (this.air && !!this.T.fly); /* a cut grimoire mustn't leave Malgrave hovering, its book open */ this.t = 0; this.introT = 1.6; this.playFor(this.clipFor(this.T.anim.roar) || this.T.anim.idle, 1.6); this.invuln = true; this.invulnT = 1.2; /* on the game clock: a paused menu must not eat the roar */ if (this.flying) this.air = true; this.stun = 0; this.hidden = false; this.setAlpha(this.spec.illusion ? 0.55 : 1); /* a phase can land mid-blink: never leave the boss half-faded */ this.g.bossPhase?.(this, ph); }
      if (!quiet && this.state !== 'intro') this.poiseHit(n);
      this.g.bossUpdate?.(this);
    }
  }

  // Poise: a great foe's stance breaks under pressure (12% of its life without a 1.5 s let-up), into a 1 s stagger that
  // takes 1.5x damage (hit()); each break costs 25% more. A move that leaves it hidden or airborne finishes first.
  poiseHit(n) {
    if (this.stun > 0 || this.dead) return;
    this.pz = (this.pz || 0) + n; this.pzT = 0;
    if (this.pz < this.hpMax * 0.12 * Math.pow(1.25, this.breaks || 0)) return;
    this.pz = 0; this.breaks = (this.breaks || 0) + 1;
    if (this.mv && (NO_CUT.has(this.mv.m.k) || (this.mv.m.k === 'leap' && !this.ground))) this.breakQ = true; else this.stagger();
  }
  stagger() {
    this.breakQ = false; this.mv = null; this.atk = null; this.warnCol = null; this.state = 'chase'; this.t = 0; this.setAlpha(this.spec.illusion ? 0.55 : 1); this.hidden = false; // a cancelled blink must not leave it faded
    this.stun = 1.0; this.stunStars = true; this.breakT = 1.0; this.vel.x *= 0.3; if (this.air) this.vel.y = 0;
    this.play(this.clipFor(this.T.anim.hit) || this.T.anim.idle, 0.08, { once: true, restart: true });
    this.g.hitStop(0.12); this.g.shake(0.4); this.g.fx.ring?.(this.cx, this.cy, 0xffd060, 6); this.g.fx.burst(this.cx, this.cy, 0xffe0a0, 24, 5);
    audio.play('sword_parry_2', 0.7, 0.6); audio.play('rock_wall_1', 0.45, 0.8); this.g.ui.dmg(this.pos.x, this.pos.y + Math.min(this.T.h, 3.4) + 1, 'STAGGERED', 'crit');
  }

  die() {
    this.dead = true; this.state = 'dead'; this.t = 0; this.mv = null; this.atk = null; this.air = false; this.hidden = false; this.root.visible = true; this.setAlpha(1); this.root.rotation.z = 0;
    const d = this.clipFor(this.T.anim.death); if (d) this.play(d, 0.1, { once: true, restart: true });
    audio.play(this.boss ? 'rock_wall_2' : 'bone_snap', 0.5);
    if (!this.boss) { this.vel.x = (this.lastPush || -this.facing) * 4.5; if (!this.flying) this.vel.y = 3.2; if (this.lastMelee) this.g.stopT = Math.max(this.g.stopT || 0, 0.1); } // the kill freeze answers your own blade, not a poison tick
    this.cling = 0; this.spinA = 0; this.warnCol = null; this.tilt.position.set(0, 0, 0); if (this.orbs) { for (const s of this.orbs) s.life = 0; this.orbs = null; }
    // a summoner's dead fall with it; a splitter bursts into its young (they answer to a stand-in, so they outlive it)
    if (!this.boss) for (const o of this.room.enemies) if (o.summoner === this && !o.dead) { o.hp = 0; o.die(); this.g.fx.burst(o.cx, o.cy, 0xb070ff, 16, 4); }
    if (this.T.split && !this.summoner && !this.spec.illusion) { const sire = { room: this.room, dead: false, pos: this.pos }; this.g.fx.burst(this.cx, this.cy, 0x8aff5a, 24, 5); for (const d of [-0.7, 0.7]) { const sp = this.safeSpot(this.pos.x + d, this.pos.y); if (sp) this.g.summon(sire, this.T.split, sp.x, sp.y, { lvl: this.lvl }); } }
    this.g.onEnemyDeath(this);
  }
  // ---- the missiles and gear of the regular kinds
  bolt(low) { // a warlock's slow bolt along one of two lanes: ankle height (jump it) or head height (duck it)
    const y = this.pos.y + (low ? 0.45 : 1.6); this.g.shoot({ x: this.pos.x + this.facing * 0.6, y, vx: this.facing * 7, vy: 0, kind: 'bolt', dmg: Math.round(this.T.dmg * 0.8 * this.dmgMul), src: this, life: 2.2 });
    this.g.fx.glint(this.pos.x + this.facing * 0.6, y, 0xff7a30); audio.play('fireball_' + (1 + (Math.random() * 3 | 0)), 0.3, 1.2);
  }
  lobBomb(P) { // a fused bomb: it lands on the sigil 0.85 s after the throw and bursts 0.45 s later
    const g = this.g, m = this.mouth, tx = P.pos.x, fy = g.floorBelow(tx, P.pos.y + 0.6), T2 = 0.85; if (fy < -1e8) return;
    g.shoot({ x: m.x, y: m.y, vx: (tx - m.x) / T2, vy: (fy + 0.3 - m.y) / T2 + 0.5 * 16 * T2, grav: 16, kind: 'slag', dmg: 0, hit: true, src: this, life: T2 + 0.1 }); // the bomb itself only shows the arc
    g.erupt({ x: tx, y: fy, delay: T2 + 0.45, w: 2.4, h: 1.7, dmg: this.T.dmg * this.dmgMul, elem: 'fire', src: this }); audio.play('wave_attack_1', 0.35, 1.2);
  }
  spit(P) { // a slow web: it binds the legs for a moment (swat it out of the air)
    const m = this.mouth, a = Math.atan2(P.pos.y + 0.9 - m.y, P.pos.x - m.x);
    this.g.shoot({ x: m.x, y: m.y, vx: Math.cos(a) * 6.5, vy: Math.sin(a) * 6.5, kind: 'web', dmg: Math.round(this.T.dmg * 0.4 * this.dmgMul), snare: 1.3, src: this, life: 2.2 }); audio.play('wave_attack_1', 0.35, 1.4);
  }
  throwAxe(low) { // out five metres and back to the hand, along the floor or at head height
    const T = this.T, f = this.facing; this.g.shoot({ x: this.pos.x + f * 0.7, y: this.pos.y + (low ? 0.5 : 1.6), vx: f * 10, vy: 0, kind: 'boomerang', model: T.arm?.[this.id % T.arm.length], dmg: Math.round(T.dmg * 0.8 * this.dmgMul), src: this, life: 2.6 });
    this.axe = this.g.shots[this.g.shots.length - 1]; this.axe.dir = f; audio.play('wave_attack_1', 0.4, 0.9);
  }
  tickAxe(dt) { const s = this.axe; if (s.life <= 0 || !this.g.shots.includes(s)) { this.axe = null; return; } s.vx -= s.dir * 10 * dt; if (sgn(s.vx) !== s.dir && (s.x - this.pos.x) * s.dir < 0.6) { s.life = 0; this.axe = null; } }
  // the Hierophant's three circling skulls: they bite, can be swatted, are loosed one by one (`loose`) and grow back
  tickOrbs(dt, P) {
    const g = this.g, L = this.orbs ||= []; for (let i = L.length - 1; i >= 0; i--) if (L[i].life <= 0 || !g.shots.includes(L[i])) L.splice(i, 1);
    if (this.dead) return; this.orbA = (this.orbA || 0) + dt * 2.6;
    L.forEach((s, i) => { const a = this.orbA + i * 2.094; s.x = this.cx + Math.cos(a) * 1.7; s.y = this.cy + Math.sin(a) * 1.2; s.vx = s.vy = 0; s.life = 9; s.t = 0; });
    if (this.loose > 0) { if (!L.length) this.loose = 0; else if ((this.looseT -= dt) <= 0) { const s = L.pop(), a = Math.atan2(P.pos.y + 1 - s.y, P.pos.x - s.x); s.vx = Math.cos(a) * 4.6; s.vy = Math.sin(a) * 4.6; s.homing = 2; s.life = 4; this.loose--; this.looseT = 0.35; this.growT = 3; audio.play('wave_attack_1', 0.35, 1.2); } }
    else if (L.length < 3 && this.state !== 'idle' && g.room === this.room && (this.growT = (this.growT ?? 0.4) - dt) <= 0) { this.growT = 0.6; const a = this.orbA + L.length * 2.094, x = this.cx + Math.cos(a) * 1.7, y = this.cy + Math.sin(a) * 1.2; g.shoot({ x, y, vx: 0, vy: 0, kind: 'skull', dmg: Math.round(this.T.dmg * 0.6 * this.dmgMul), src: this, life: 9 }); L.push(g.shots[g.shots.length - 1]); g.fx.burst(x, y, 0x9affb0, 8, 2); }
  }

  shootAt(P, kind, o = {}) {
    const m = this.mouth, tx = P.pos.x, ty = P.pos.y + 1.0, a = Math.atan2(ty - m.y, tx - m.x) + (o.spread || 0), sp = o.speed || SHOT_SPEED[kind] || 8;
    const dmg = Math.round((o.dmg ?? this.T.dmg * 0.8) * this.dmgMul);
    if (kind === 'bone' || kind === 'lob' || kind === 'acid') { const T2 = Math.max(0.7, Math.abs(tx - m.x) / 7), vx = (tx - m.x) / T2 + (o.spread || 0) * 6, vy = (ty - m.y) / T2 + 0.5 * 16 * T2; this.g.shoot({ x: m.x, y: m.y, vx, vy, grav: 16, kind, dmg, elem: kind === 'acid' ? 'poison' : null, src: this }); }
    else this.g.shoot({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind, dmg, elem: o.elem || (kind === 'orb' ? 'shadow' : kind === 'web' ? 'ice' : null), homing: kind === 'skull' ? 2.4 : 0, src: this, life: kind === 'skull' ? 5 : 3.2 });
    audio.play(kind === 'bolt' || kind === 'orb' ? 'fireball_' + (1 + (Math.random() * 3 | 0)) : kind === 'feather' ? 'bow_attack_1' : 'wave_attack_1', 0.35, 1.2);
  }
}

// ==================================================================================================== brains
// One behaviour per regular type (catalog.js `ai`). Each is built on a classic pattern, shows its blow at least LEAD seconds
// before it lands (a crouch, a raised arm, a floor sigil, a glint at the height the missile will fly) and leaves an opening
// after it. docs/ROOM_SPEC.md lists where each one bites.
const idle = e => { e.vel.x = 0; e.play(e.T.anim.idle); e.state = 'idle'; };
const overlap = (a, b, m = 0) => a.x0 - m < b.x1 && a.x1 + m > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
// the body itself is the blow (a pounce, a swoop, a charge)
const strike = (e, P, k = 1, elem, m = 0) => overlap(e.aabb, P.aabb, m) && P.takeHit(Math.round(e.T.dmg * k * e.dmgMul), e.pos.x, elem ?? (e.T.venom ? 'poison' : null), e);
// stand still for t seconds; `open` flickers the rim gold: the moment to strike a guarded foe
const rest = (e, t, open) => { e.state = 'rest'; e.t = 0; e.restT = t; e.vel.x = 0; if (open) e.breakT = t; e.play(e.T.anim.idle, 0.15); };
// a harmless floor sigil where something is about to arrive
const marker = (e, x, y, delay, w = 1.4, col = 0xff5030) => e.g.erupt({ x, y, delay, w, h: 0.2, dmg: 0, col, quiet: true });
const approach = (e, c, stop = e.T.reach * 0.8, k = 1.1, anim = e.T.anim.walk) => { if (c.adx > stop) e.walk(e.facing, e.T.speed * c.slow, anim, k); else { e.vel.x = 0; e.play(e.T.anim.idle); } };
// back away along its footing; false when a wall or an edge has it cornered
const retreat = (e, c, k = 1.2) => { if (!e.walk(-e.facing, e.T.speed * c.slow, e.T.anim.walk, k)) return false; e.facing = -e.facing; return true; };
// crouch (the tell) then spring: shared by the things that pounce. Returns true while it owns the step.
function pounce(e, P, lead = LEAD, elem) {
  const T = e.T;
  if (e.state === 'crouch') { e.vel.x = 0; e.warn = e.t / lead; e.tilt.position.y = -Math.min(1, e.t / lead) * T.h * 0.12; if (e.t > lead) { e.tilt.position.y = 0; e.state = 'leap'; e.t = 0; e.leapHit = false; e.vel.set(e.leapV.x, e.leapV.y); e.ground = false; e.play(e.clipFor(T.anim.jump) || T.anim.attack, 0.08, { once: true, restart: true }); audio.play('clothing_1', 0.3, 1.5); } return true; }
  if (e.state === 'leap') { if (e.ground && e.t > 0.15) { const hard = e.pounce; e.pounce = false; e.vel.x = 0; if (hard) { e.g.fx.dust(e.pos.x, e.pos.y); rest(e, 0.5); e.cool = 0.6; } else { e.state = 'chase'; e.t = 0; e.cool = 0.12; } } else if (e.pounce && !e.leapHit && strike(e, P, 1, elem)) e.leapHit = true; return true; }
  return false;
}
const crouch = (e, vx, vy) => { e.pounce = true; e.state = 'crouch'; e.t = 0; e.leapV = new THREE.Vector2(vx, vy); e.play(e.T.anim.idle, 0.1); };

const BRAIN = {
  // ------------------------------------------------------------------------------------------ act 1
  // Shambler (Zombie): walks straight at you and rakes. One placed with rise: true claws out of the floor as you come near and
  // keeps rising nearby while you stay in its corridor (Enemy.rerise, RISES times).
  riser(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (c.adx < T.reach + 0.2 && Math.abs(c.dy) < 2 && e.cool <= 0) return e.attackStart({ anim: Math.random() < 0.4 ? T.anim.attack2 : T.anim.attack, cool: 0.9 });
    approach(e, c);
  },
  // Dead Child (Flea Man): two short fidgety hops (now and then away from you), then a high pounce onto where you stand.
  flea(e, dt, P, c) {
    const T = e.T; if (pounce(e, P)) return;
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (!e.ground || e.cool > 0) { if (e.ground) { e.vel.x = 0; e.play(T.anim.idle, 0.1); } return; }
    if ((e.hopN = (e.hopN || 0) + 1) >= 3) { e.hopN = 0; return crouch(e, e.facing * THREE.MathUtils.clamp(c.adx * 1.15, 2, 8), 8.6); }
    const dir = Math.random() < 0.75 ? e.facing : -e.facing;
    e.state = 'leap'; e.t = 0; e.pounce = false; e.vel.set(dir * rnd(2.2, 3.8), rnd(4.2, 5.4)); e.ground = false; e.play(e.clipFor(T.anim.jump) || T.anim.walk, 0.08, { once: true, restart: true });
  },
  // Possessed Thrall (Bloody Zombie): runs you down, then a lunging swing that carries it past; it stumbles afterwards.
  rusher(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && c.adx < 3.0 && Math.abs(c.dy) < 1.6) return e.attackStart({ anim: T.anim.attack2 || T.anim.attack, lunge: T.lunge || 6, reach: T.reach + 0.5, cool: 0.6, done: s => rest(s, 0.7) });
    approach(e, c, T.reach * 0.8, 1.2, e.clipFor(T.anim.run) || T.anim.walk);
  },
  // Gutter Goblin: darts in, stabs, springs back out of reach and waits for its next dart. Punish the retreat.
  skirmisher(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'backhop') { if (e.ground && e.t > 0.15) { e.state = 'chase'; e.t = 0; e.cool = rnd(0.5, 0.9); e.vel.x = 0; } return; }
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && c.adx < T.reach + 0.3 && Math.abs(c.dy) < 2) return e.attackStart({ anim: Math.random() < 0.5 && T.anim.attack2 ? T.anim.attack2 : T.anim.attack, lunge: 3, cool: 0.2,
      done: s => { s.state = 'backhop'; s.t = 0; s.ground = false; s.vel.set(-s.facing * 5.2, 5.4); s.play(s.clipFor(T.anim.jump) || T.anim.idle, 0.08, { once: true, restart: true }); } });
    if (e.cool > 0 && c.adx < 3.2) { e.vel.x = 0; e.play(T.anim.idle, 0.15); return; }
    approach(e, c, T.reach * 0.8, 1.3);
  },
  // Kobold Skulk (Skeleton): holds its ledge and lobs bones in a high arc, down from high ground too. Backs off when you close;
  // cornered, it stabs weakly. Swat the bones or come up under the arc.
  lobber(e, dt, P, c) {
    const T = e.T, sees = c.adx < T.aggro && c.dy > -8 && c.dy < 4.5 && P.state !== 'dead';
    if (!sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0) {
      if (c.adx > 3 && c.adx < SCREEN) return e.attackStart({ anim: T.anim.attack2 || T.anim.attack, noHit: true, cool: rnd(1.5, 2.1), fire: (s, p) => s.shootAt(p, 'bone', { dmg: T.dmg }) });
      if (c.adx < T.reach + 0.2 && Math.abs(c.dy) < 2) return e.attackStart({ anim: T.anim.attack, cool: 1.0, dmg: T.dmg * 0.8 });
    }
    if (c.adx < 3.5 && Math.abs(c.dy) < 2 && retreat(e, c)) return;
    e.vel.x = 0; e.play(T.anim.idle);
  },
  // Hedge Warlock (Bone Pillar): a turret. Its hand kindles, then two slow bolts leave half a second apart, one at ankle height
  // and one at head height (the order swaps each volley): jump one, duck the other.
  turret(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.vel.x = 0; e.play(T.anim.idle);
    if (e.shotQ) { if ((e.shotQ.t -= dt) <= 0) { e.bolt(e.shotQ.low); e.shotQ = null; } return; }
    e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 3 && c.adx < SCREEN) { const low = e.lowFirst = !e.lowFirst; e.castCol = CAST_COL.bolt; return e.attackStart({ anim: T.anim.attack, noHit: true, cool: rnd(1.5, 2.0), fire: s => { s.bolt(low); s.shotQ = { t: 0, low: !low }; } }); }
  },
  // Velscour Knight (Sword Skeleton): a measured duel. Two cuts, each stepping forward, then it has to gather itself.
  dueller(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 2) {
      if (e.spec.flurry && c.adx > 1.6 && c.adx < 5 && Math.random() < 0.04) { e.ghost(0xe8eef8, 0.3, 0.3); return e.attackStart({ anim: T.anim.attack, hits: [0.32, 0.5, 0.68], dur: 1.25, lunge: 6, lungeAll: true, flurry: true, reach: T.reach + 0.5, dmg: T.dmg * 0.55 }); } // Ser Aubrine's three-thrust lunge
      if (c.adx < T.reach + 0.9) return e.attackStart({ anim: T.anim.attack, dur: 0.9, lunge: 3.2, dmg: T.dmg * 0.75, cool: 0.1, done: s => { s.facing = sgn(P.pos.x - s.pos.x); s.attackStart({ anim: T.anim.attack2 || T.anim.attack, dur: 0.9, lunge: 3.2, dmg: T.dmg * 0.75, cool: 0.6, done: q => rest(q, 0.9) }); } });
    }
    approach(e, c);
  },
  // Werebat (Bat): hangs from the ceiling until you pass, then the roost wakes in a wave. Each swoops through where you stood
  // (it spreads its wings first), climbs out the far side and comes round again.
  bat(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'hang') {
      e.pos.y = e.hangY - T.h - 0.05; e.play(T.anim.idle, 0, {}); if (e.cur) e.cur.timeScale = 0.15;
      if (e.wakeT > 0 ? (e.wakeT -= dt) <= 0 : (c.adx < 5.5 && c.dy > -11 && c.dy < 1 && P.state !== 'dead')) {
        e.state = 'chase'; e.t = 0; e.cool = 0.2; e.wakeT = 0; if (e.cur) e.cur.timeScale = 1; audio.play('clothing_1', 0.4, 0.7);
        let n = 0; for (const o of e.room.enemies) if (o !== e && !o.dead && o.state === 'hang' && o.T.ai === 'bat' && !(o.wakeT > 0) && Math.abs(o.pos.x - e.pos.x) < 8) o.wakeT = 0.4 * ++n;
      }
      return;
    }
    if (e.state === 'tell') { e.vel.x *= 0.8; e.vel.y *= 0.8; e.warn = e.t / 0.4; e.facing = sgn(c.dx); if (e.t > 0.4) { e.state = 'swoop'; e.t = 0; e.swHit = false; e.swT = 1.0; e.s0 = e.pos.clone(); e.s1 = new THREE.Vector2(P.pos.x, 2 * (P.pos.y + 0.4) - e.pos.y); e.s2 = new THREE.Vector2(THREE.MathUtils.clamp(P.pos.x + sgn(c.dx || 1) * 5, e.room.b.x0 + 1.5, e.room.b.x1 - 1.5), e.pos.y); e.playFor(T.anim.attack, 1.0); audio.play('wave_attack_1', 0.3, 0.8); } return; }
    if (e.state === 'swoop') {
      const k = e.t / e.swT, u = 1 - k; e.pos.x = u * u * e.s0.x + 2 * u * k * e.s1.x + k * k * e.s2.x; e.pos.y = u * u * e.s0.y + 2 * u * k * e.s1.y + k * k * e.s2.y; e.vel.set(0, 0); e.facing = sgn(e.s2.x - e.s0.x);
      if (!e.swHit && k > 0.2 && k < 0.8 && strike(e, P)) e.swHit = true;
      if (k >= 1) { e.state = 'chase'; e.t = 0; e.cool = rnd(0.9, 1.4); }
      return;
    }
    if (!c.sees) { e.vel.x *= 0.9; e.vel.y = (e.home.y - e.pos.y) * 1.5; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    const hoverY = Math.min(P.pos.y + 3.2, e.room.b.y1 - T.h - 0.8) + Math.sin(e.g.time * 2.2 + e.id) * 0.3, wantX = P.pos.x - sgn(c.dx) * 4;
    e.vel.x += (THREE.MathUtils.clamp((wantX - e.pos.x) * 1.6, -T.speed, T.speed) * c.slow - e.vel.x) * Math.min(1, dt * 3);
    e.vel.y += (THREE.MathUtils.clamp((hoverY - e.pos.y) * 2.5, -4, 4) - e.vel.y) * Math.min(1, dt * 4);
    e.play(T.anim.walk, 0.2);
    if (e.cool <= 0 && c.adx < 8) { e.state = 'tell'; e.t = 0; e.g.fx.glint(e.cx, e.cy, 0xfff0c0); }
  },

  // ------------------------------------------------------------------------------------------ act 2
  // Goblin Reaver (Bomber Armor): keeps its distance and lobs a fused bomb at the spot where you stand: a sigil marks the floor,
  // the blast follows half a second after it lands. Keep moving; rush it between throws.
  bomber(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 4) {
      if (c.adx < T.reach + 0.2 && Math.abs(c.dy) < 2 && e.cornered) return e.attackStart({ anim: T.anim.attack, cool: 0.9 });
      if (c.adx > 2.5 && c.adx < SCREEN) return e.attackStart({ anim: T.anim.attack2 || T.anim.attack, noHit: true, cool: rnd(2.0, 2.6), fire: (s, p) => s.lobBomb(p) });
    }
    e.cornered = false;
    if (c.adx < 4) { if (!retreat(e, c)) { e.cornered = true; e.play(T.anim.idle); } }
    else if (c.adx > 8) e.walk(e.facing, T.speed * c.slow, T.anim.walk, 1.2); else { e.vel.x = 0; e.play(T.anim.idle); }
  },
  // Kobold Trapper (Spear Guard): owns a stretch of floor around its post. Step into it and it crouches, then darts the length of
  // its reach; it never leaves its stretch. Bait the dart, then strike while it walks back.
  sentry(e, dt, P, c) {
    const T = e.T, zone = 4.5, hx = e.home.x;
    if (e.state === 'crouch') { e.vel.x = 0; e.warn = e.t / 0.45; e.tilt.position.y = -Math.min(1, e.t / 0.45) * T.h * 0.1; if (e.t > 0.45) { e.tilt.position.y = 0; e.attackStart({ anim: T.anim.attack, windup: [0.12, 0.5], dur: 0.6, told: true, lunge: 10, reach: T.reach + 0.3, cool: 0.5, done: s => rest(s, 0.7) }); } return; }
    if (!(c.sees && Math.abs(P.pos.x - hx) < zone + 1.5 && Math.abs(c.dy) < 2)) { // back to its post
      if (Math.abs(e.pos.x - hx) > 0.4) { e.state = 'chase'; e.facing = sgn(hx - e.pos.x); e.walk(e.facing, T.speed, T.anim.walk); } else { idle(e); if (c.adx < T.aggro) e.facing = sgn(c.dx); }
      return;
    }
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && c.adx < 4.2) { e.state = 'crouch'; e.t = 0; e.play(T.anim.idle, 0.1); e.g.fx.glint(e.pos.x + e.facing * 0.5, e.pos.y + 0.8, 0xfff0c0); return; }
    const want = THREE.MathUtils.clamp(P.pos.x - e.facing * 3.2, hx - zone, hx + zone);
    if (Math.abs(want - e.pos.x) > 0.3) e.walk(sgn(want - e.pos.x), T.speed * c.slow, T.anim.walk, 1.2); else { e.vel.x = 0; e.play(T.anim.idle); }
  },
  // Crypt Weaver: hangs on its thread; shivers, then drops on whoever walks beneath. It bites for a moment on the floor, then
  // reels back up to the ceiling above where it stands and waits again. (No ceiling within reach: it simply scuttles and bites.)
  dropper(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'hang') {
      e.pos.y = e.hangY - T.h * 0.5;
      if (e.dropT > 0) { e.warn = 1 - e.dropT / 0.4; e.tilt.position.x = Math.sin(e.t * 50) * 0.05; if ((e.dropT -= dt) <= 0) { e.tilt.position.x = 0; e.state = 'leap'; e.t = 0; e.leapHit = false; e.pounce = true; e.vel.set(0, -3); e.pos.y = e.hangY - T.h - 0.1; e.ground = false; e.upT = 2.2; audio.play('squelching_3', 0.4, 1.4); } }
      else if (c.adx < 2.4 && c.dy < 0 && c.dy > -11 && P.state !== 'dead') { e.dropT = 0.4; e.g.fx.glint(e.pos.x, e.pos.y, 0xfff0c0); }
      return;
    }
    if (e.state === 'leap') { if (e.ground && e.t > 0.1) { e.pounce = false; e.g.fx.dust(e.pos.x, e.pos.y); rest(e, 0.5); } else if (!e.leapHit && strike(e, P)) e.leapHit = true; return; }
    if (e.state === 'climb') { e.vel.set(0, 0); e.pos.y += 6 * dt; if (e.pos.y >= e.hangY - T.h * 0.5) { e.state = 'hang'; e.t = 0; e.dropT = 0; } return; }
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx); e.upT = (e.upT ?? 2.2) - dt;
    if (e.cool <= 0 && c.adx < T.reach && Math.abs(c.dy) < 2) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack, cool: 0.8 });
    if (e.upT <= 0 && e.ground && e.canHang(e.pos)) { e.upT = 2.2; e.state = 'climb'; e.t = 0; e.vel.set(0, 0); return; }
    approach(e, c, T.reach * 0.7, 1.2, e.clipFor(T.anim.run) || T.anim.walk);
  },
  // Carrion Harpy (Medusa Head): crosses the screen in a slow sine wave through your height, turns beyond you and comes back.
  // Its body is its attack: strike it as it comes, pass under the crest or jump the trough.
  sine(e, dt, P, c) {
    const T = e.T, rb = e.room.b;
    if (e.state !== 'pass') { if (!c.sees) { e.vel.x *= 0.9; e.vel.y = (e.home.y - e.pos.y) * 1.5; e.play(T.anim.idle); e.state = 'idle'; return; } e.state = 'pass'; e.dir = sgn(c.dx); e.baseY = e.pos.y; e.ph = Math.PI / 2; }
    if (c.adx > T.aggro * 1.6 || P.state === 'dead') { e.state = 'idle'; return; }
    e.facing = e.dir; e.ph += dt * 2.6; e.baseY += THREE.MathUtils.clamp(P.pos.y + 1.6 - e.baseY, -1.6 * dt, 1.6 * dt);
    e.vel.x += (e.dir * T.speed * c.slow - e.vel.x) * Math.min(1, dt * 3); e.vel.y = (e.baseY + Math.sin(e.ph) * 1.6 - e.pos.y) * 6;
    if (e.turnCd > 0) e.turnCd -= dt; else if ((e.pos.x - P.pos.x) * e.dir > 6.5 || e.hitWall || e.pos.x < rb.x0 + 1.2 || e.pos.x > rb.x1 - 1.2) { e.dir = sgn(P.pos.x - e.pos.x); e.turnCd = 0.8; }
    e.play(T.anim.walk, 0.2);
    if (e.hitCd > 0) e.hitCd -= dt; else if (strike(e, P, 0.8)) e.hitCd = 1;
  },
  // Oathsworn Knight (Shield Knight): its shield turns every blow from the front while it walks or winds up. It is open only once
  // its own swing is thrown (the rim flickers gold through the recovery), and it is slow to turn if you get behind it.
  shield(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; const face = sgn(c.dx) === e.facing;
    if (!face) { if ((e.turnT = (e.turnT || 0) + dt) > 0.45) { e.facing = sgn(c.dx); e.turnT = 0; } } else e.turnT = 0;
    if (e.cool <= 0 && c.adx < T.reach + 0.3 && Math.abs(c.dy) < 2 && face) return e.attackStart({ anim: Math.random() < 0.5 && T.anim.attack2 ? T.anim.attack2 : T.anim.attack, cool: 0.5, done: s => rest(s, 0.9, true) });
    if (c.adx > T.reach * 0.8 && face) e.walk(e.facing, T.speed * c.slow, T.anim.walk); else { e.vel.x = 0; e.play(T.anim.idle, 0.2); }
  },

  // ------------------------------------------------------------------------------------------ act 3
  // Haunted Mannequin (weeping angel): a statue while you face it, a sprinter when your back is turned.
  stalker(e, dt, P, c) {
    const T = e.T, watched = sgn(e.pos.x - P.pos.x) === P.facing && c.adx > 1.4;
    if (!c.sees) { e.vel.x = 0; if (e.cur) e.cur.paused = true; e.state = 'idle'; return; }
    e.state = 'chase';
    if (watched) { e.vel.x = 0; if (e.cur) e.cur.paused = true; return; }
    if (e.cur) e.cur.paused = false; e.facing = sgn(c.dx);
    if (c.adx < T.reach + 0.2 && Math.abs(c.dy) < 2 && e.cool <= 0) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack, cool: 0.8 });
    if (c.adx > T.reach * 0.7) { if (e.walk(e.facing, T.speed * c.slow, T.anim.walk, 1.6) && Math.random() < 0.2) audio.play('wood_walk_' + (1 + (Math.random() * 5 | 0)), 0.25, 1.4); } else e.vel.x = 0;
  },
  // Bloodweaver: keeps about six metres off and spits a slow web (swat it). A web that lands binds your legs for a moment, and
  // then it pounces. Close the distance and it is only a biter.
  webber(e, dt, P, c) {
    const T = e.T; if (e.spitT > 0) e.spitT -= dt; if (pounce(e, P, LEAD, 'poison')) return;
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 3) {
      if (c.adx < T.reach) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack, cool: 0.9 });
      if (P.snareT > 0 && c.adx < 8 && e.ground) return crouch(e, e.facing * Math.min(9, c.adx * 1.35), 7.4);
      if (c.adx > 3 && c.adx < 7.5 && !(e.spitT > 0)) { e.spitT = rnd(2.2, 2.8); return e.attackStart({ anim: T.anim.attack2 || T.anim.attack, noHit: true, cool: 0.5, fire: (s, p) => s.spit(p) }); }
    }
    if (c.adx < 4.5) { if (!retreat(e, c, 1.3)) { e.vel.x = 0; e.play(T.anim.idle); } } else if (c.adx > 7.5) e.walk(e.facing, T.speed * c.slow, e.clipFor(T.anim.run) || T.anim.walk, 1.2); else { e.vel.x = 0; e.play(T.anim.idle); }
  },
  // Gravebinder (summoner): raises two Shamblers and keeps them raised; between raisings a slow seeking skull (swat it). It backs
  // away from you. Its dead fall with it.
  summoner(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx); e.sumT = (e.sumT ?? 0.4) - dt;
    if (e.cool <= 0) {
      const mine = e.room.enemies.filter(x => x.summoner === e && !x.dead).length;
      if (e.sumT <= 0 && mine < 2) { e.sumT = 6; e.castCol = CAST_COL.summon; return e.attackStart({ anim: e.clipFor(T.anim.roar) || T.anim.attack2, noHit: true, dur: 1.2, cool: 1.2, fire: s => { for (const d of mine ? [2.4] : [2.4, 4.6]) { const sp = s.safeSpot(s.pos.x + s.facing * d, s.pos.y); if (sp && Math.abs(sp.y - s.pos.y) < 1.5) s.g.summon(s, 'zombie', sp.x, sp.y, { lvl: s.lvl }); } } }); }
      if (c.adx < SCREEN) { e.castCol = CAST_COL.skull; return e.attackStart({ anim: T.anim.attack, noHit: true, cool: rnd(2.4, 3.2), fire: (s, p) => s.shootAt(p, 'skull', { dmg: T.dmg * 0.7 }) }); }
    }
    if (c.adx < 5) { if (!retreat(e, c, 1)) { e.vel.x = 0; e.play(T.anim.idle); } } else { e.vel.x = 0; e.play(T.anim.idle); }
  },
  // Rotbound Acolyte (splitter): shuffles in lobbing slow clots of rot; struck down, it bursts into two Dead Children.
  splitter(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 4) {
      if (c.adx < 2 && Math.abs(c.dy) < 2) return e.attackStart({ anim: T.anim.attack2 || T.anim.attack, reach: 1.7, cool: 1.0 });
      if (c.adx < SCREEN) { e.castCol = CAST_COL.lob; return e.attackStart({ anim: T.anim.attack, noHit: true, cool: rnd(2.0, 2.8), fire: (s, p) => s.shootAt(p, 'lob', { dmg: T.dmg * 0.8 }) }); }
    }
    approach(e, c, 3);
  },
  // Velscour Lancer: lowers its lance (0.7 s), then charges the length of its floor behind its shield. Jump it. It skids to a halt
  // with its back open; a wall stuns it. Its shield turns frontal blows while it walks and while it charges.
  lancer(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'paw') { e.vel.x = 0; e.warn = e.t / 0.7; if (e.t > 0.7) { e.state = 'charge'; e.t = 0; e.chHit = false; e.play(T.anim.run, 0.1, { speed: 1.4 }); } return; }
    if (e.state === 'charge') {
      e.vel.x = e.facing * 9 * c.slow; if (Math.random() < 0.4) e.g.fx.dust(e.pos.x - e.facing * 0.5, e.pos.y);
      if (!e.chHit) { const r = strike(e, P, 1.1, null, 0.3); if (r) e.chHit = true; if (r === 'block') { e.stun = 1.2; e.stunStars = true; e.vel.x = -e.facing * 3; e.state = 'chase'; e.cool = 1.2; return; } }
      if (e.hitWall) { e.stun = 1.3; e.stunStars = true; e.breakT = 1.3; e.g.shake(0.2); audio.play('rock_wall_1', 0.4); e.play(T.anim.hit, 0.1, { once: true, restart: true }); e.state = 'chase'; e.t = 0; e.cool = 1.0; e.vel.x = 0; }
      else if (!e.groundAhead() || e.t > 1.5) { rest(e, 1.0, true); e.cool = 1.4; }
      return;
    }
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 1.6) {
      if (c.adx > 3.5 && c.adx < 12) { e.state = 'paw'; e.t = 0; e.play(e.clipFor(T.anim.bash) || e.clipFor(T.anim.roar) || T.anim.idle, 0.1, { restart: true, once: true }); e.g.fx.glint(e.cx, e.pos.y + T.h, 0xff5040); audio.play('crowd_gasp', 0.2, 1.6); return; }
      if (c.adx < T.reach + 0.2) return e.attackStart({ anim: Math.random() < 0.5 && T.anim.attack2 ? T.anim.attack2 : T.anim.attack, cool: 0.8, done: s => rest(s, 0.7, true) });
    }
    approach(e, c);
  },

  // ------------------------------------------------------------------------------------------ act 4
  // Goat-Headed Reveller (Axe Armor): a slow advance, and an axe thrown to come back to its hand, at head height or along the
  // floor (a glint shows which, and it stoops for the low one): duck or jump, twice. It cannot throw again until the axe is home.
  axer(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 2.5) {
      if (c.adx < T.reach + 0.2) return e.attackStart({ anim: T.anim.attack, cool: 0.9 });
      if (!e.axe && c.adx > 2.5 && c.adx < SCREEN) { const low = Math.random() < 0.5; e.g.fx.glint(e.pos.x + e.facing * 0.6, e.pos.y + (low ? 0.5 : 1.6), 0xffe090); if (low) e.tilt.position.y = -T.h * 0.1; return e.attackStart({ anim: T.anim.attack2 || T.anim.attack, noHit: true, cool: 1.2, fire: s => { s.tilt.position.y = 0; s.throwAxe(low); } }); }
    }
    approach(e, c);
  },
  // Rotwing Harpy: flies a pass high overhead and lets three quills fall where it crosses you (each marks the floor first), then
  // dips to head height at the end of the pass: that is when to strike it.
  strafer(e, dt, P, c) {
    const T = e.T, rb = e.room.b, top = Math.min(P.pos.y + 4.4, rb.y1 - T.h - 1), ease = (vx, y) => { e.vel.x += (vx - e.vel.x) * Math.min(1, dt * 3); e.vel.y += (THREE.MathUtils.clamp((y - e.pos.y) * 3, -6, 6) - e.vel.y) * Math.min(1, dt * 5); };
    if (e.state === 'dip') { e.facing = sgn(c.dx); ease(0, P.pos.y + 0.9); e.play(T.anim.idle, 0.2); if (e.t > 1.4) { e.state = 'chase'; e.t = 0; e.cool = 0.3; } return; }
    if (e.state === 'tell') { ease(0, top); e.warn = e.t / 0.45; if (e.t > 0.45) { e.state = 'run'; e.t = 0; e.dir = sgn(c.dx); e.dropN = 0; e.dropT = 0; e.endX = THREE.MathUtils.clamp(P.pos.x + e.dir * 5.5, rb.x0 + 1.5, rb.x1 - 1.5); } return; }
    if (e.state === 'run') {
      e.facing = e.dir; ease(e.dir * T.speed * 1.2 * c.slow, top); e.play(e.clipFor(T.anim.run) || T.anim.walk, 0.2);
      if (e.dropN < 3 && (e.dropT -= dt) <= 0 && Math.abs(e.pos.x - P.pos.x) < 2.6) { e.dropN++; e.dropT = 0.3; const fy = e.g.floorBelow(e.pos.x, e.pos.y); if (fy > -1e8) marker(e, e.pos.x, fy, 0.5, 1.0, 0xe8e0d0); e.g.shoot({ x: e.pos.x, y: e.pos.y + 0.3, vx: 0, vy: -7.5, kind: 'feather', dmg: Math.round(T.dmg * 0.7 * e.dmgMul), src: e, life: 2.4 }); audio.play('bow_attack_1', 0.25, 1.3); }
      if ((e.pos.x - e.endX) * e.dir >= 0 || e.hitWall || e.t > 4) { e.state = 'dip'; e.t = 0; }
      return;
    }
    if (!c.sees) { e.vel.x *= 0.9; e.vel.y = (e.home.y - e.pos.y) * 1.5; e.play(T.anim.idle); e.state = 'idle'; return; }
    e.state = 'chase'; e.facing = sgn(c.dx);
    const wantX = THREE.MathUtils.clamp(P.pos.x - sgn(c.dx) * 5.5, rb.x0 + 1.5, rb.x1 - 1.5);
    ease(THREE.MathUtils.clamp((wantX - e.pos.x) * 1.6, -T.speed, T.speed) * c.slow, top); e.play(T.anim.walk, 0.2);
    if (e.cool <= 0 && (Math.abs(wantX - e.pos.x) < 1.5 || e.t > 2.5)) { e.state = 'tell'; e.t = 0; e.g.fx.glint(e.cx, e.cy, 0xfff0c0); }
  },
  // Plague Knight: raises its mace (0.6 s), then comes on spinning for a second and a half: the whirl turns every blow and bites
  // on both sides. Back away from it; when it stops it is dizzy, and open.
  spinner(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'wind') { e.vel.x = 0; e.warn = e.t / 0.6; if (e.t > 0.6) { e.state = 'spin'; e.t = 0; e.spinHit = 0; e.play(T.anim.attack, 0.1, { speed: 1.6 }); audio.play('wave_attack_1', 0.4, 0.7); } return; }
    if (e.state === 'spin') {
      e.spinA = (e.spinA || 0) + dt * 16; e.swingOn = true; const d = sgn(c.dx);
      if (c.adx > 0.6 && e.groundAhead(d)) e.vel.x = d * 3.0 * c.slow; else e.vel.x = 0;
      if ((e.spinHit -= dt) <= 0 && c.adx < T.reach + 0.2 && Math.abs(c.dy) < 2 && P.takeHit(Math.round(T.dmg * 0.8 * e.dmgMul), e.pos.x, 'poison', e)) e.spinHit = 0.5;
      if (e.t > 1.5) { e.spinA = 0; e.vel.x = 0; e.state = 'chase'; e.t = 0; e.stun = 1.2; e.stunStars = true; e.breakT = 1.2; e.cool = 1.4; e.play(T.anim.idle, 0.2); }
      return;
    }
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 2 && c.adx < 4.5) { e.state = 'wind'; e.t = 0; e.playFor(e.clipFor(T.anim.attack3) || T.anim.attack, 1.4); e.g.fx.glint(e.pos.x, e.pos.y + T.h, 0x8aff5a); return; }
    approach(e, c, 3);
  },

  // ------------------------------------------------------------------------------------------ act 5
  // Obsidian Borer: travels under the floor (a dust trail), heaves the ground and erupts beneath you, spits one arc of acid,
  // and burrows again after three seconds. It can only be hurt while it is up.
  worm(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'under') {
      e.root.visible = false;
      if (!c.sees || Math.abs(c.dy) > 3) return;
      const rb = e.room.b; e.pos.x = THREE.MathUtils.clamp(e.pos.x + sgn(c.dx) * Math.min(c.adx, T.speed * 1.6 * dt), rb.x0 + 1.5, rb.x1 - 1.5);
      if (Math.random() < 0.5) e.g.fx.dust(e.pos.x + rnd(-0.5, 0.5), e.pos.y, 0x4a4036);
      e.undT = (e.undT ?? 0.8) - dt;
      if (c.adx < 1.2 && e.undT <= 0 && e.g.floorBelow(e.pos.x, e.pos.y + 0.6) > e.pos.y - 0.6) { e.state = 'emerge'; e.t = 0; e.root.visible = true; e.facing = sgn(c.dx || 1); e.playFor(e.clipFor(T.anim.emerge) || T.anim.idle, 0.9); e.g.shake(0.25); audio.play('rock_wall_1', 0.5, 1.2); e.g.erupt({ x: e.pos.x, y: e.pos.y, delay: 0.45, w: 1.3, h: 3.2, dmg: T.dmg * e.dmgMul, src: e, col: 0x8a7a60, quiet: true }); }
      return;
    }
    if (e.state === 'emerge') { if (e.t > 0.9) { e.state = 'chase'; e.t = 0; e.upT = 3; e.cool = 0.5; } return; }
    if (e.state === 'burrow') { if (e.t > 0.7) { e.state = 'under'; e.t = 0; e.undT = 1.0; e.root.visible = false; } return; }
    e.state = 'chase'; e.vel.x = 0; e.facing = sgn(c.dx); e.upT -= dt;
    if (e.upT <= 0) { e.state = 'burrow'; e.t = 0; e.playFor(e.clipFor(T.anim.burrow) || T.anim.idle, 0.7); e.g.fx.dust(e.pos.x, e.pos.y, 0x4a4036); return; }
    if (e.cool <= 0) {
      if (c.adx < T.reach && Math.abs(c.dy) < 3.5) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack, cool: 1.0 });
      if (c.adx < SCREEN) return e.attackStart({ anim: e.clipFor(T.anim.breath) || T.anim.attack2, noHit: true, cool: 1.6, fire: (s, p) => s.shootAt(p, 'acid', { dmg: T.dmg * 0.7 }) });
    }
    e.play(T.anim.idle);
  },
  // Ashscale Whelp / Bonewhelp: snaps up close; at two to five metres it rears (its jaw glows) and breathes a cone along the floor
  // for a second: back off or get behind it. (The Bonewhelp also falls apart and rebuilds itself: Enemy.damage, `revive`.)
  breather(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'breath') { e.vel.x = 0; const k = e.t / 1.5; if (k < 0.3) { e.warnCol = ELEM_COL[T.elem]; e.warn = k / 0.3; } else if (k < 0.9) e.g.breathCone(e, 4.6, T.elem, T.dmg * 0.4, dt); if (k >= 1) { e.warnCol = null; e.state = 'chase'; e.t = 0; e.cool = 1.4; rest(e, 0.5); } return; }
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 2) {
      if (c.adx < T.reach) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack, cool: 0.9 });
      if (c.adx < 5.2) { e.state = 'breath'; e.t = 0; e.playFor(e.clipFor(T.anim.breath) || T.anim.attack, 1.5); e.g.fx.glint(e.mouth.x, e.mouth.y, ELEM_COL[T.elem]); audio.play(T.elem === 'ice' ? 'ice_barrage_1' : 'firespray_1', 0.4); return; }
    }
    approach(e, c, T.reach * 0.8, 1.1);
  },
  // Possessed Knight: crouches (0.5 s) and leaps to where you stand; a sigil marks the landing and the floor bursts under it.
  // Step out of the mark; its blade is stuck for a second afterwards.
  plunger(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'crouch') { e.vel.x = 0; e.warn = e.t / 0.5; e.tilt.position.y = -Math.min(1, e.t / 0.5) * T.h * 0.1; if (e.t > 0.5) { e.tilt.position.y = 0; e.state = 'leap'; e.t = 0; e.ground = false; e.vel.set((e.tx - e.pos.x) / 1.1, 11); e.play(e.clipFor(T.anim.jump) || T.anim.attack, 0.08, { once: true, restart: true }); audio.play('clothing_1', 0.4, 0.8); } return; }
    if (e.state === 'leap') { e.swingOn = e.vel.y < 0; if (e.ground && e.t > 0.2) { e.vel.x = 0; e.g.shake(0.25); e.g.fx.dust(e.pos.x, e.pos.y); audio.play('rock_wall_1', 0.45, 1.1); e.g.erupt({ x: e.pos.x, y: e.pos.y, delay: 0.02, w: 2.6, h: 1.4, dmg: T.dmg * e.dmgMul, elem: 'stone', src: e, quiet: true }); rest(e, 1.0, true); e.cool = 1.4; } return; }
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 2.5) {
      if (c.adx < T.reach + 0.2 && Math.abs(c.dy) < 2) return e.attackStart({ anim: Math.random() < 0.5 && T.anim.attack2 ? T.anim.attack2 : T.anim.attack, cool: 0.9, done: s => rest(s, 0.5, true) });
      if (c.adx > 3 && c.adx < 9 && e.ground) { const rb = e.room.b; e.tx = THREE.MathUtils.clamp(P.pos.x, rb.x0 + 1.5, rb.x1 - 1.5); const fy = e.g.floorBelow(e.tx, P.pos.y + 0.6); if (fy > -1e8) marker(e, e.tx, fy, 1.6, 2.6); e.state = 'crouch'; e.t = 0; e.play(T.anim.idle, 0.1); return; }
    }
    approach(e, c);
  },
  // Plague Giant: fills the lane. From range its overhead slam sends a wave along the floor toward you (jump it); up close it
  // sweeps. Both leave it winded.
  giant(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && Math.abs(c.dy) < 3) {
      if (c.adx < T.reach + 0.3) return e.attackStart({ anim: Math.random() < 0.4 && T.anim.attack2 ? T.anim.attack2 : T.anim.attack, cool: 0.6, done: s => rest(s, 0.7, true) });
      if (c.adx < 8) return e.attackStart({ anim: T.anim.attack3 || T.anim.attack2 || T.anim.attack, noHit: true, dur: T.atkDur * 1.15, cool: 0.6, fire: s => { s.g.shake(0.3); s.g.shockwave(s, s.pos.x + s.facing * 1.4, s.pos.y, s.facing, T.elem); }, done: s => rest(s, 1.0, true) });
    }
    approach(e, c);
  },

  // ------------------------------------------------------------------------------------------ act 6+
  revenant(e, dt, P, c) { return BRAIN.breather(e, dt, P, c); },
  // Vesper Witch (teleporter): appears, casts a fan of three slow orbs, stands a second in the open, then fades and returns at
  // the violet sigil she leaves on the floor. Be standing at the sigil.
  blinker(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'blink') {
      const k = e.t / 0.9; e.vel.x = 0; e.setAlpha(k < 0.3 ? 1 - k / 0.3 : k > 0.7 ? (k - 0.7) / 0.3 : 0.02); e.hidden = k > 0.3 && k < 0.7;
      if (k >= 0.5 && !e.blinked) { e.blinked = true; if (e.dest) e.pos.set(e.dest.x, e.dest.y); e.facing = sgn(P.pos.x - e.pos.x); e.g.fx.burst(e.cx, e.cy, 0xb070ff, 16, 3); }
      if (k >= 1) { e.setAlpha(1); e.hidden = false; e.state = 'chase'; e.t = 0; e.cool = 0.15; e.castN = 0; }
      return;
    }
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx); e.vel.x = 0; e.play(T.anim.idle);
    if (e.cool > 0) return;
    if (!e.castN) { if (c.adx > SCREEN) return; e.castN = 1; e.castCol = CAST_COL.orb; return e.attackStart({ anim: T.anim.attack, noHit: true, cool: 1.0, fire: (s, p) => { for (let i = -1; i <= 1; i++) s.shootAt(p, 'orb', { spread: i * 0.3, dmg: T.dmg * 0.7, speed: 5.5 }); } }); }
    const side = sgn(-c.dx || 1); e.dest = null;
    for (const d of [side, -side]) { const sp = e.safeSpot(P.pos.x + d * rnd(5.5, 7.5), e.pos.y); if (sp && Math.abs(sp.y - e.pos.y) < 3.5 && Math.abs(sp.x - P.pos.x) > 3.5) { e.dest = sp; break; } }
    if (e.dest) marker(e, e.dest.x, e.dest.y, 0.45, 1.4, 0xb070ff);
    e.state = 'blink'; e.t = 0; e.blinked = false; audio.play('wave_attack_2', 0.3, 1.5);
  },
  // Night Paralysis Demon: stalks slowly, then sinks away and rises at your back (a dark sigil shows where) with a claw already
  // winding up. Turn and strike it, or step clear.
  lurker(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'vanish') {
      const k = e.t / 0.9; e.vel.x = 0; e.setAlpha(Math.max(0.04, Math.abs(1 - k * 2))); e.hidden = k > 0.25 && k < 0.75;
      if (k >= 0.5 && !e.blinked) { e.blinked = true; if (e.dest) e.pos.set(e.dest.x, e.dest.y); e.facing = sgn(P.pos.x - e.pos.x); e.g.fx.burst(e.cx, e.cy, 0x7030c0, 20, 3); audio.play('wave_attack_2', 0.4, 0.6); }
      if (k >= 1) { e.setAlpha(1); e.hidden = false; e.attackStart({ anim: T.anim.attack, dur: T.atkDur * 0.85, cool: 1.2, done: s => rest(s, 0.7, true) }); }
      return;
    }
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx); e.vanT = (e.vanT ?? 1.5) - dt;
    if (e.cool <= 0) {
      if (c.adx < T.reach + 0.2 && Math.abs(c.dy) < 2) return e.attackStart({ anim: Math.random() < 0.5 ? T.anim.attack2 : T.anim.attack3 || T.anim.attack, cool: 1.0, done: s => rest(s, 0.5, true) });
      if (e.vanT <= 0 && c.adx > 3) { e.vanT = rnd(3.5, 5); e.dest = e.safeSpot(P.pos.x - P.facing * 2.4, P.pos.y); if (e.dest) marker(e, e.dest.x, e.dest.y, 0.45, 1.6, 0x7030c0); e.state = 'vanish'; e.t = 0; e.blinked = false; return; }
    }
    approach(e, c, T.reach * 0.8, 1, T.anim.walk);
  },
  // Silver Paladin (reflector): when you come close it sets a ward (its rim and blade shimmer pale blue for a second): a blow
  // struck into the ward is thrown back as a lunging riposte. Hold your hand; when the ward drops it comes on with two cuts and
  // is spent afterwards.
  counter(e, dt, P, c) {
    const T = e.T;
    if (e.state === 'ward') { e.vel.x = 0; e.facing = sgn(c.dx); e.warnCol = 0x9ad0ff; e.warn = 0.55 + 0.45 * Math.sin(e.t * 14) ** 2;
      if (e.t > 1.1) { e.warnCol = null; e.attackStart({ anim: T.anim.attack, dur: 0.9, lunge: 3, cool: 0.1, done: s => { s.facing = sgn(P.pos.x - s.pos.x); s.attackStart({ anim: T.anim.attack2 || T.anim.attack, dur: 0.9, lunge: 3, cool: 0.7, done: q => rest(q, 0.9, true) }); } }); }
      return; }
    if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && c.adx < 3.6 && Math.abs(c.dy) < 2) { e.state = 'ward'; e.t = 0; e.vel.x = 0; e.play(T.anim.idle, 0.15); e.g.guardRing?.(e); e.g.fx.glint(e.pos.x + e.facing * 0.5, e.pos.y + 1.2, 0x8ab0ff); audio.play('sword_blocked_2', 0.3, 1.3); return; }
    approach(e, c, 3);
  },
  // Hollow Hierophant: three skulls circle it (they bite, and can be swatted away). Its hand kindles and it looses them one after
  // another to seek you, slowly; until they grow back, three seconds, it stands bare.
  orbiter(e, dt, P, c) {
    const T = e.T; if (!c.sees) return idle(e);
    e.state = 'chase'; e.facing = sgn(c.dx);
    if (e.cool <= 0 && (e.orbs?.length || 0) >= 3 && c.adx < SCREEN) { e.castCol = CAST_COL.skull; return e.attackStart({ anim: T.anim.attack, noHit: true, cool: 1.0, fire: s => { s.loose = 3; s.looseT = 0; } }); }
    if (c.adx < 4.5) { if (!retreat(e, c, 1)) { e.vel.x = 0; e.play(T.anim.idle); } } else { e.vel.x = 0; e.play(T.anim.idle); }
  },

  // ------------------------------------------------------------------------------------------ new kinds
  // Skitterling (crawler): walks round and round the ledge or block it stands on, top, side and underside, ignoring you (faster
  // while you stand on its stone). On the room's own floor it only paces a short beat.
  crawler(e, dt, P, c) {
    const T = e.T;
    if (e.rail === undefined) { const s = e.g.activeSolids().find(q => !q.gone && e.home.x > q.x0 && e.home.x < q.x1 && Math.abs(q.y1 - e.home.y) < 0.4 && !['floor', 'ceil', 'wall', 'ledge', 'gate'].includes(q.kind) && !q.stair); e.rail = s && s.x1 - s.x0 < 16 ? s : null; e.u = e.rail ? e.home.x - e.rail.x0 : 0; e.dir = e.id % 2 ? 1 : -1; }
    e.play(e.clipFor(T.anim.run) || T.anim.walk, 0.2);
    const s = e.rail;
    if (!s) { e.state = 'chase'; if (!e.groundAhead(e.dir) || Math.abs(e.pos.x + e.dir * 0.2 - e.home.x) > 3) e.dir = -e.dir; e.facing = e.dir; e.vel.x = e.dir * T.speed * c.slow; return; }
    const w = s.x1 - s.x0, h = s.y1 - s.y0, per = 2 * (w + h), on = Math.abs(P.pos.y - s.y1) < 0.3 && P.pos.x > s.x0 - 0.3 && P.pos.x < s.x1 + 0.3;
    e.state = 'crawl'; e.vel.set(0, 0); e.u = ((e.u + e.dir * T.speed * (on ? 1.7 : 1) * c.slow * dt) % per + per) % per;
    const u = e.u; // clockwise from the top-left corner: top, right side, underside, left side
    if (u < w) { e.cling = 0; e.pos.set(s.x0 + u, s.y1); } else if (u < w + h) { e.cling = 1; e.pos.set(s.x1, s.y1 - (u - w)); } else if (u < 2 * w + h) { e.cling = 2; e.pos.set(s.x1 - (u - w - h), s.y0); } else { e.cling = 3; e.pos.set(s.x0, s.y0 + (u - 2 * w - h)); }
    e.facing = (e.cling === 2 ? -1 : 1) * e.dir;
  },
  // Pale Shade (Ghost): drifts slowly straight at you through walls and floors. Its touch is its blow; a hit throws it back.
  ghost(e, dt, P, c) {
    const T = e.T;
    if (e.state !== 'drift') { if (!c.sees) { e.vel.set(0, 0); e.play(T.anim.idle); e.state = 'idle'; return; } e.state = 'drift'; }
    const tx = P.pos.x - e.pos.x, ty = P.pos.y + 0.2 - e.pos.y, d = Math.hypot(tx, ty) || 1, sp = T.speed * c.slow;
    if (d > T.aggro * 1.6 || P.state === 'dead') { e.state = 'idle'; return; }
    e.facing = sgn(tx); e.vel.x += (tx / d * sp - e.vel.x) * Math.min(1, dt * 2.5); e.vel.y += (ty / d * sp - e.vel.y) * Math.min(1, dt * 2.5);
    e.pos.x += e.vel.x * dt; e.pos.y += (e.vel.y + Math.sin(e.g.time * 3 + e.id) * 0.3) * dt; e.play(T.anim.idle, 0.2);
    if (e.hitCd > 0) e.hitCd -= dt; else if (strike(e, P, 0.9)) { e.hitCd = 1.2; e.vel.x = -e.facing * 3; }
  },
  // Drowned Thrall (Merman): swims the pool bed to come up beside you; the water churns, it leaps clear, spits one clot at the
  // top of its arc and falls back. Strike it in the air or swat the clot.
  merman(e, dt, P, c) {
    const T = e.T;
    if (e.pool === undefined) { const b = e.room.b, lx = e.home.x - b.x0, ly = e.home.y - b.y0, w = (e.room.def.water || []).find(q => lx > q.x && lx < q.x + q.w && ly > q.y - 1 && ly < q.y + q.h + 0.5); e.pool = w ? { x0: b.x0 + w.x + 0.6, x1: b.x0 + w.x + w.w - 0.6, top: b.y0 + w.y + w.h } : null; }
    const top = e.pool ? e.pool.top : e.home.y;
    if (e.state === 'under') {
      e.root.visible = false; e.hidden = true; e.vel.set(0, 0); if (!c.sees) return;
      const x = e.pos.x + sgn(c.dx) * Math.min(Math.max(0, c.adx - 2), 3 * dt); e.pos.x = e.pool ? THREE.MathUtils.clamp(x, e.pool.x0, e.pool.x1) : x;
      if ((e.undT = (e.undT ?? 0.5) - dt) <= 0 && c.adx < 7.5) { e.state = 'surface'; e.t = 0; audio.play('waterspray_1', 0.3, 1.3); }
      return;
    }
    if (e.state === 'surface') { e.warn = e.t / 0.45; if (Math.random() < 0.6) e.g.fx.spawn(e.pos.x + rnd(-0.5, 0.5), top, 0.5, rnd(-0.6, 0.6), rnd(1, 3), e.pool ? 0x9ad8ff : 0x6a6258, 0.4, 0.2, 6); if (e.t > 0.45) { e.state = 'leap'; e.t = 0; e.hidden = false; e.root.visible = true; e.spat = false; e.pos.y = top - T.h * 0.9; e.facing = sgn(c.dx); e.vel.set(THREE.MathUtils.clamp(c.dx * 0.5, -2.5, 2.5), 10.5); e.ground = false; e.play(e.clipFor(T.anim.jump) || T.anim.attack, 0.08, { once: true, restart: true }); } return; }
    if (e.state === 'leap') {
      e.vel.y -= 20 * dt; e.pos.x += e.vel.x * dt; e.pos.y += e.vel.y * dt; if (e.pool) e.pos.x = THREE.MathUtils.clamp(e.pos.x, e.pool.x0, e.pool.x1);
      if (!e.spat && e.vel.y < 2) { e.spat = true; e.facing = sgn(c.dx); e.shootAt(P, 'lob', { dmg: T.dmg }); }
      if (e.vel.y < 0 && e.pos.y < top - T.h * 0.9) { e.state = 'under'; e.t = 0; e.undT = 1.2; e.pos.y = e.home.y; e.vel.set(0, 0); e.root.visible = false; e.hidden = true; e.g.fx.dust(e.pos.x, top, e.pool ? 0x9ad8ff : 0x6a6258); }
      return;
    }
    e.state = 'under';
  },

  // The Larder Ogre (miniboss): slow, with a two-sided ground slam
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


  // ---------------------------------------------------------------------------------------- bosses
  boss(e, dt, P, c) {
    const T = e.T, rb = e.room.b;
    if (!e.awake) { if (c.sees && c.adx < 14) { e.awake = true; e.state = 'intro'; e.t = 0; e.introT = 2.4; e.facing = sgn(c.dx); e.playFor(e.clipFor(T.anim.roar) || T.anim.idle, 2.2); audio.play('crowd_gasp', 0.4, 0.6); e.g.bossStart(e); } else e.play(T.anim.idle); return; }
    if (e.mv) { if (MOVE[e.mv.m.k](e, e.mv, dt, P, c)) { e.mv = null; e.warnCol = null; e.state = 'chase'; e.t = 0; e.cool = (0.7 + Math.random() * 0.5) / (1 + (e.phase - 1) * 0.35); if (!e.air) e.vel.x = 0;
      // after a string of two or three moves it stops to breathe for 0.8 s: the opening to punish
      if ((e.chainN = (e.chainN || 0) + 1) >= (e.chainAt ||= 2 + (Math.random() < 0.5 ? 1 : 0))) { e.chainN = 0; e.chainAt = 2 + (Math.random() < 0.5 ? 1 : 0); e.cool = Math.max(e.cool, 0.8); e.restT = 0.8; if (!e.air) e.g.fx.puff?.(e.mouth.x, e.mouth.y, 0x8a8478); } } return; }
    if (e.breakQ) return e.stagger(); // a stance broken mid-move gives way as soon as the move is done
    e.state = 'chase'; e.facing = sgn(c.dx); if (e.restT > 0) e.restT -= dt;
    if (e.restT > 0 && !e.air) { e.vel.x = 0; e.play(T.anim.idle, 0.25); }
    else if (e.air) { // hover in the upper arena, drifting toward a point off the player's shoulder
      const fy = e.arenaFloor ?? (e.arenaFloor = e.home.y), hy = e.skyY(fy + (T.dragon ? 6.2 : 4.6) + 0.5) - 0.5 + Math.sin(e.g.time * 1.6) * 0.5, wantX = THREE.MathUtils.clamp(P.pos.x - sgn(c.dx) * (T.dragon ? 7 : 5), rb.x0 + 3, rb.x1 - 3);
      e.vel.x += (THREE.MathUtils.clamp((wantX - e.pos.x) * 1.4, -T.speed, T.speed) - e.vel.x) * Math.min(1, dt * 2.5); e.vel.y += (THREE.MathUtils.clamp((hy - e.pos.y) * 2.5, -5, 5) - e.vel.y) * Math.min(1, dt * 4);
      e.play(e.clipFor(T.anim.fly) || T.anim.walk, 0.3);
    } else if (c.adx > T.reach * 0.75) e.walk(e.facing, T.speed * c.slow * (c.adx > 7 ? 1.7 : 1), c.adx > 7 && e.clipFor(T.anim.run) ? T.anim.run : T.anim.walk);
    else { e.vel.x = 0; e.play(T.anim.idle, 0.25); }
    if (e.cool > 0) return;
    e.aboveT = (P.pos.y > e.pos.y + Math.max(2.2, T.h * 0.8) && !e.air) ? (e.aboveT || 0) + dt + Math.max(0, e.cool) * 0 : 0; const reachUp = e.aboveT > 1.2, UP = ['leap', 'volley', 'fan', 'rain', 'pillars', 'roots', 'wave', 'blink', 'suns', 'takeoff', 'summon', 'cyclone', 'grimoire', 'eclipse', 'hunt', 'stormcall', 'meteor', 'miasma', 'webnet', 'maw'];
    // a move is held back by its phase, or by a life threshold (`below`): Caddoc keeps his leap for his last third
    const held = m => (m.phase || 1) > e.phase || e.hp > e.hpMax * (m.below ?? (e.spec.t === 'caddoc' && m.k === 'leap' ? 0.33 : 1));
    const ok = T.moves.filter(m => (!e.spec.illusion || m.k === 'volley' || m.k === 'fan') && (!reachUp || UP.includes(m.k) || !T.moves.some(q => UP.includes(q.k) && !held(q))) && !held(m) && (reachUp || ((!m.min || c.adx >= m.min) && (!m.range || c.adx <= m.range))) && (T.dragon && T.fly ? (e.air ? m.air : !m.air) : true) && m !== e.lastMove && !(m.k === 'summon' && e.room.enemies.filter(x => x.summoner === e && !x.dead).length >= m.max));
    if (!ok.length) { e.lastMove = null; return; }
    let tot = ok.reduce((s, m) => s + m.w * ((m.phase || 1) === e.phase && e.phase > 1 ? 1.6 : 1), 0), r = Math.random() * tot, m = ok[0];
    for (const o of ok) { r -= o.w * ((o.phase || 1) === e.phase && e.phase > 1 ? 1.6 : 1); if (r <= 0) { m = o; break; } }
    e.lastMove = m; let dur = (m.dur || T.atkDur) / (e.phase >= 3 ? 1.15 : 1), win = null;
    // every move that bites at a share of its length keeps at least LEAD_BIG of tell (the clip is stretched with it), the last
    // phase's quickening included (it squeezed .52 s tells to .45 s); a melee window lasts ACTIVE
    const at = tellAt(m, T); if (at > 0 && at * dur < LEAD_BIG) dur = LEAD_BIG / at;
    if (m.k === 'melee') { const w = m.windup || T.windup; win = [w[0], Math.max(w[1], w[0] + ACTIVE / dur)]; }
    e.mv = { m, t: 0, dur, s: {}, win }; e.restT = 0; e.state = 'move'; e.vel.x = 0; e.warnCol = WARN_COL[m.k] || null; if (e.flare) e.flare.material.color.setHex(e.warnCol || 0xff5020);
    const anim = e.clipFor(m.anim) || e.clipFor(T.anim.attack);
    if (['charge', 'ram', 'strafe'].includes(m.k)) e.play(anim, 0.15, { restart: true, speed: 1.3 }); else if (!['hunt', 'frenzy', 'shellspin'].includes(m.k)) e.playFor(anim, dur);
    e.g.fx.glint(e.pos.x + e.facing * 0.5, e.pos.y + Math.min(T.h, 3.5) * 0.85, 0xff4040);
  },
};

// the share of a move's length that passes before it first bites or fires (keep in step with the MOVE functions below);
// moves timed in seconds (charge, ram, leap, divebomb, frenzy, hunt, shellspin, stormcall) carry their own fixed leads
const TELL_AT = { fissure: 0.5, cyclone: 0.35, geyser: 0.15, grimoire: 0.3, webnet: 0.4, miasma: 0.3, maw: 0.7, meteor: 0.25, frostnova: 0.35, volley: 0.35, fan: 0.5, wave: 0.4, rain: 0.25, pillars: 0.35, breath: 0.28, sweep: 0.25, suns: 0.4, buffet: 0.35 };
function tellAt(m, T) {
  if (m.k === 'melee' || m.k === 'slam') return (m.windup || T.windup)[0];
  if (m.k === 'multi') return m.hits[0] - 0.04;
  if (m.k === 'forgefall' || m.k === 'ossuary') return Math.max(0.5, (m.windup || T.windup)[0]);
  return TELL_AT[m.k] || 0;
}
// Each move: (e, mv, dt, P, c) => true when finished. mv = { m, t, dur, s }
const hitBox = (e, P, x0, x1, y0, y1, dmg, elem) => { const pa = P.aabb; return x0 < pa.x1 && x1 > pa.x0 && y0 < pa.y1 && y1 > pa.y0 && P.takeHit(Math.round(dmg * e.dmgMul), e.pos.x, elem, e); };
const frontBox = (e, P, reach, low, dmg, elem) => hitBox(e, P, e.pos.x + (e.facing > 0 ? -0.3 : -reach), e.pos.x + (e.facing > 0 ? reach : 0.3), e.pos.y, e.pos.y + (low ? 1.0 : Math.max(2.4, e.T.h * 0.9)), dmg, elem);
const MOVE = {
  melee(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, m = mv.m, [a, b] = mv.win || m.windup || e.T.windup;
    if (k < a) e.warn = Math.max(e.warn || 0, k / a);
    if (k >= a && !mv.s.snd) { mv.s.snd = 1; audio.play('sword_attack_3', 0.5, 0.7); if (m.shock) { e.g.shockwave(e, e.pos.x + e.facing * 2, e.pos.y, e.facing, e.T.elem); e.g.shake(0.3); } }
    if (k >= a - 0.04 && k <= b + 0.03) e.swingOn = true;
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
    if (e.boss && (mv.s.gt = (mv.s.gt || 0) - dt) <= 0) { mv.s.gt = 0.07; e.ghost(m.k === 'ram' ? 0xff4020 : 0xffa040, 0.3); e.g.fx.streaks(e, 2, m.k === 'ram' ? 0xff6040 : 0xffa060); } /* and leaves its own silhouette behind */
    const a = e.aabb; if (!mv.s.hit && hitBox(e, P, a.x0 - 0.3, a.x1 + 0.3, a.y0, Math.min(a.y1, a.y0 + 1.8), e.T.dmg * 1.25)) mv.s.hit = 1;
    if (e.hitWall) { e.g.shake(0.5); audio.play('rock_wall_2', 0.6); e.g.fx.dust(e.pos.x + e.facing, e.pos.y, 0x9a9080); if (m.k === 'ram') { e.stun = 2.6; e.stunStars = true; e.g.ui.dmg(e.pos.x, e.pos.y + e.T.h + 0.4, 'STUNNED', 'crit'); e.play(e.T.anim.idle, 0.2); if (e.boss) { e.g.hitStop(0.1); e.g.shake(0.8); const wx = e.pos.x + e.facing * e.T.w * 0.55; e.g.fx.cracks(wx, e.pos.y + 1.8, 2.4, 0x140e0a, true); for (let i = 0; i < 26; i++) e.g.fx.spawn(wx, e.pos.y + rnd(0.5, 3.5), 0.8, -e.facing * rnd(1, 5), rnd(-1, 3), i % 3 ? 0x8a8070 : 0x5a5248, 0.9, rnd(0.25, 0.6), 4, false); e.g.debris(wx - e.facing * 0.5, e.pos.y + 2.5, 5, 0x6a625a, 1.2); /* the wall bursts where he hits it */ const rb = e.room.b, fy = e.arenaFloor ?? e.home.y; for (let i = 0; i < 5; i++) e.g.rainShot(e, THREE.MathUtils.clamp(e.pos.x - e.facing * (1.5 + i * 2.2 + rnd(-0.6, 0.6)), rb.x0 + 1, rb.x1 - 1), fy, 'rock', null, e.T.dmg * 0.6 * e.dmgMul); } } return true; } // the wall shakes loose its masonry: punish him, but mind the ceiling
    return (m.k !== 'ram' && Math.abs(e.pos.x - mv.s.x0) > (m.range || 14)) || mv.t > (m.k === 'ram' ? 4 : 2.6) || (sgn(P.pos.x - e.pos.x) !== e.facing && Math.abs(P.pos.x - e.pos.x) > 3.5 && m.k !== 'ram'); // a ram runs on to the wall
  },
  ram(e, mv, dt, P, c) { return MOVE.charge(e, mv, dt, P, c); },
  leap(e, mv, dt, P, c) {
    mv.t += dt; const m = mv.m, wind = LEAD_BIG, air = 0.95;
    if (mv.t < wind) { e.warn = mv.t / wind; return false; }
    if (!mv.s.go) { mv.s.go = 1; const rb = e.room.b, tx = THREE.MathUtils.clamp(P.pos.x, rb.x0 + 2, rb.x1 - 2); e.vel.set((tx - e.pos.x) / air, 20 * air / 2); e.ground = false; mv.s.tx = tx; audio.play('clothing_1', 0.5, 0.6); e.g.erupt({ x: tx, y: e.pos.y, delay: air, w: 4.8, h: 0.3, dmg: 0, col: 0xff4040, src: e, quiet: true }); return false; }
    if (!e.ground || mv.t < wind + 0.2) { e.vel.x = (mv.s.tx - e.pos.x) > 0 === e.vel.x > 0 ? e.vel.x : 0; if (e.boss && (mv.s.gt = (mv.s.gt || 0) - dt) <= 0) { mv.s.gt = 0.09; e.ghost(0xff6030, 0.28, 0.32); } return false; }
    if (!mv.s.land) { mv.s.land = mv.t; e.vel.x = 0; e.g.shake(0.45); e.g.fx.dust(e.pos.x, e.pos.y); audio.play('rock_wall_1', 0.6); hitBox(e, P, e.pos.x - 2.4, e.pos.x + 2.4, e.pos.y, e.pos.y + 1.6, e.T.dmg * 1.1); if (m.slamOnLand) { e.g.shockwave(e, e.pos.x + 1.4, e.pos.y, 1, e.T.elem); e.g.shockwave(e, e.pos.x - 1.4, e.pos.y, -1, e.T.elem); } }
    return mv.t - mv.s.land > 0.55;
  },
  slam(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, a = (mv.m.windup || e.T.windup)[0];
    if (k < a) e.warn = Math.max(e.warn || 0, k / a);
    if (k >= a && !mv.s.f) { mv.s.f = 1; const el = mv.m.elem || e.T.elem; e.g.shockwave(e, e.pos.x + e.facing * 1.6, e.pos.y, e.facing, el); e.g.shockwave(e, e.pos.x - e.facing * 1.2, e.pos.y, -e.facing, el); e.g.shake(0.5); frontBox(e, P, e.T.reach, false, e.T.dmg); if (e.phase > 1) e.g.after(0.45, () => { if (!e.dead && e.g.room === e.room) { e.g.shockwave(e, e.pos.x + 1.6, e.pos.y, 1, el); e.g.shockwave(e, e.pos.x - 1.6, e.pos.y, -1, el); } }); } // the echo slam waits on the game clock (a menu or a hit-stop holds it)
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
    const a = e.aabb; if (!s.hit && k > Math.max(0.2, LEAD_BIG / mv.dur) && k < 0.8 && hitBox(e, P, a.x0, a.x1, a.y0, a.y1, e.T.dmg)) s.hit = 1;
    if (e.boss && k > 0.1 && (s.gt = (s.gt || 0) - dt) <= 0) { s.gt = 0.06; e.ghost(0xb0c8ff, 0.3, 0.35); }
    return k >= 1;
  },
  divebomb(e, mv, dt, P) {
    mv.t += dt; const s = mv.s, fy = e.arenaFloor ?? e.home.y;
    if (mv.t < 0.7) { e.vel.set((P.pos.x - e.pos.x) * 3, (e.skyY(fy + 8) - e.pos.y) * 3); return false; } // the climb stays under the roof and inside the frame
    if (mv.t < 0.7 + LEAD_BIG) { e.vel.set(0, 0); e.warn = (mv.t - 0.7) / LEAD_BIG; if (!s.mark) { s.mark = 1; e.g.erupt({ x: e.pos.x, y: fy, delay: 0.6, w: 2.6, h: 0.3, dmg: 0, col: 0xff4040, src: e, quiet: true }); } return false; } // it hangs over its mark for half a second
    if (!s.down) { e.vel.set(0, -26); const a = e.aabb; if (!s.hit && hitBox(e, P, a.x0, a.x1, a.y0 - 0.5, a.y1, e.T.dmg * 1.3)) s.hit = 1; if (e.pos.y <= fy + 0.2) { s.down = mv.t; e.pos.y = fy; e.vel.set(0, 0); e.air = false; e.g.shake(0.6); audio.play('rock_wall_2', 0.7); e.g.shockwave(e, e.pos.x + 1.2, fy, 1, e.T.elem); e.g.shockwave(e, e.pos.x - 1.2, fy, -1, e.T.elem); e.g.fx.dust(e.pos.x, fy); e.stunStars = true; e.play(e.clipFor(e.T.anim.hit) || e.T.anim.idle, 0.1, { once: true, restart: true }); } return false; }
    e.vel.set(0, 0); if (mv.t - s.down > (e.T.dragon ? 1.4 : 1.8)) { if (!(e.T.dragon && e.T.fly) || true) e.air = e.flying || e.T.fly; return true; }
    return false;
  },
  takeoff(e, mv, dt, P) { mv.t += dt; const k = mv.t / mv.dur; if (k > 0.45) { e.air = true; e.vel.y = Math.min(5, (e.skyY(Infinity) - e.pos.y) * 4); /* it rises at 5 m/s, levelling off under the cap */ } if (k > 0.3 && !mv.s.f) { mv.s.f = 1; e.g.windPush(e, 9); audio.play('wave_attack_1', 0.7, 0.4); } return k >= 1; },
  land(e, mv, dt, P) { mv.t += dt; const fy = e.arenaFloor ?? e.home.y; e.vel.set(0, -7); if (e.pos.y <= fy + 0.15) { e.pos.y = fy; e.air = false; e.vel.set(0, 0); if (!mv.s.f) { mv.s.f = 1; e.g.shake(0.4); e.g.fx.dust(e.pos.x, fy); e.g.shockwave(e, e.pos.x + 2, fy, 1, e.T.elem); e.g.shockwave(e, e.pos.x - 2, fy, -1, e.T.elem); } } return mv.t >= mv.dur && !e.air; },
  // fly the length of the hall raking the floor below
  strafe(e, mv, dt, P) {
    const rb = e.room.b, s = mv.s, fy = e.arenaFloor ?? e.home.y; mv.t += dt;
    if (!s.dir) { s.dir = e.pos.x < (rb.x0 + rb.x1) / 2 ? 1 : -1; s.x1 = s.dir > 0 ? rb.x1 - 4 : rb.x0 + 4; audio.play('fire_big', 0.6, 1.3); }
    e.facing = s.dir; e.vel.set(s.dir * 11, (e.skyY(fy + 6.5) - e.pos.y) * 3);
    e.g.flameWall(e, e.pos.x + s.dir * 2.5, fy, mv.m.elem, e.T.dmg * 0.6, dt, 6);
    return (s.dir > 0 ? e.pos.x >= s.x1 : e.pos.x <= s.x1) || mv.t > 5;
  },
  // ---- signatures: one per great foe, each with its own telegraph and its own way to be beaten
  // Caddoc drives his blade into the floor: a fissure of stone teeth races out toward you, then a shorter one behind him
  fissure(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, a = 0.5, fy = e.arenaFloor ?? e.home.y;
    if (k < a) { e.warn = k / a; if (k > 0.15) { e.vel.x = 0; for (let i = 0; i < 2; i++) e.g.fx.spawn(e.pos.x + e.facing * rnd(1.2, 1.8), fy + 0.1, 0.8, e.facing * rnd(1, 4), rnd(1, 4), Math.random() < 0.5 ? 0xffd080 : 0xffffff, 0.3, 0.1, 14); if (!mv.s.dr) { mv.s.dr = 1; audio.play('sword_blocked_2', 0.5, 0.6); } } return false; } // the point drags a furrow of sparks before it bites
    if (!mv.s.f) { mv.s.f = 1; const rb = e.room.b, d = sgn(P.pos.x - e.pos.x); e.g.shake(0.5); audio.play('rock_wall_2', 0.7, 0.7); e.g.fx.cracks(e.pos.x + d * 1.2, fy, 3);
      for (const [dir, n, t0] of [[d, mv.m.n || 8, 0.18], [-d, 3, 0.55]]) { let last = e.pos.x; for (let i = 0; i < n; i++) { const x = e.pos.x + dir * (1.8 + i * 1.45); if (x > rb.x0 + 0.8 && x < rb.x1 - 0.8) { last = x; e.g.erupt({ x, y: fy, delay: t0 + i * 0.075, w: 1.3, h: i % 2 ? 1.9 : 1.6, dmg: e.T.dmg * 0.85 * e.dmgMul, elem: 'stone', src: e, line: true }); } } e.g.fx.crackLine(e.pos.x + dir * 1.2, last + dir * 0.6, fy, 0xff8a40, t0 + n * 0.075, t0 + n * 0.075 + 0.5); } } // teeth a single jump clears
    return k >= 1;
  },
  // Sirelle beats up a feather cyclone that wanders the floor, dragging you toward it and spitting quills
  cyclone(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur;
    if (k < 0.35) { e.warn = k / 0.35; e.vel.set(0, 0); return false; }
    if (!mv.s.f) { mv.s.f = 1; e.g.cyclone(e, e.pos.x + e.facing * 2, e.arenaFloor ?? e.home.y, sgn(P.pos.x - e.pos.x), 5.5); audio.play('wave_attack_1', 0.7, 0.5); }
    return k >= 1;
  },
  // the Hydra's geysers chase your feet, then the whole cistern heaves a wave across the floor: jump it
  geyser(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, n = mv.m.n || 3, i = Math.floor((k - 0.15) / 0.5 * n), fy = e.arenaFloor ?? e.home.y;
    if (k < 0.15) e.warn = k / 0.15;
    if (k >= 0.15 && i >= (mv.s.i ?? 0) && (mv.s.i ?? 0) < n) { mv.s.i = (mv.s.i ?? 0) + 1; e.g.erupt({ x: P.pos.x + P.vel.x * 0.25, y: fy, delay: 0.62, w: 1.7, h: 6, dmg: e.T.dmg * 0.8 * e.dmgMul, elem: 'water', src: e }); }
    if (k >= 0.8 && !mv.s.wt) { mv.s.wt = 1; mv.s.wd = sgn(P.pos.x - e.pos.x); const rb = e.room.b; e.g.fx.crackLine(e.pos.x + mv.s.wd * 2, mv.s.wd > 0 ? rb.x1 - 1 : rb.x0 + 1, fy, 0xd8f4ff, 0.35, 0.9); audio.play('waterspray_1', 0.4, 1.4); } // froth races ahead of the wave
    if (k >= 0.8 + 0.5 / mv.dur && !mv.s.w) { mv.s.w = 1; e.g.tide(e, mv.s.wd); }
    return k >= 1;
  },
  // Gravehart melts into the mist; two green eyes kindle at the edge of the court, then it comes through like a hunt
  hunt(e, mv, dt, P, c) {
    const s = mv.s, rb = e.room.b, fy = e.arenaFloor ?? e.home.y; mv.t += dt;
    if (!s.ph) { s.ph = 1; s.n = 0; s.t = 0; }
    s.t += dt;
    if (s.ph === 1) { e.setAlpha(Math.max(0.02, 1 - s.t / 0.5)); e.vel.x = 0; if (Math.random() < 0.8) e.g.fx.spawn(e.pos.x + rnd(-e.T.w * 0.6, e.T.w * 0.6), e.pos.y + rnd(0.2, e.T.h), 0.9, rnd(-0.5, 0.5), rnd(0, 0.6), 0x1a2a14, 1.2, rnd(0.8, 1.5), -0.3, false); if (s.t > 0.5) { /* it sinks into a dark-green fog */ s.ph = 2; s.t = 0; e.hidden = true; s.side = s.n % 2 ? -s.side : (P.pos.x < (e.arenaSpan()[0] + e.arenaSpan()[1]) / 2 ? 1 : -1); const [a0, a1] = e.arenaSpan(); s.a0 = a0; s.a1 = a1; e.pos.set(s.side > 0 ? Math.min(a1 - 0.3, P.pos.x + 11) : Math.max(a0 + 0.3, P.pos.x - 11), fy); e.facing = -s.side; /* close enough that the eyes are on screen */ e.g.huntEyes(e); audio.play('crowd_gasp', 0.3, 0.4); } return false; }
    if (s.ph === 2) { const tell = s.n ? 0.75 : 1.0; e.warn = Math.min(1, s.t / tell); if (s.t > tell) { s.ph = 3; s.t = 0; e.hidden = false; e.setAlpha(1); e.play(e.clipFor(mv.m.anim) || e.T.anim.run || e.T.anim.walk, 0.1, { restart: true, speed: 1.3 }); audio.play('crowd_gasp', 0.4, 0.6); } return false; }
    if (s.ph === 3) { e.vel.x = e.facing * 15; if ((s.gt = (s.gt || 0) - dt) <= 0) { s.gt = 0.05; e.ghost(0x8aff7a, 0.34, 0.4); } const a = e.aabb; if (!s.hit && hitBox(e, P, a.x0 - 0.3, a.x1 + 0.3, a.y0, Math.min(a.y1, a.y0 + 2), e.T.dmg * 1.2)) s.hit = 1; if (Math.random() < 0.5) e.g.fx.puff(e.pos.x - e.facing, e.pos.y, 0x3a4a2a);
      if ((e.facing > 0 ? e.pos.x > s.a1 - 0.8 : e.pos.x < s.a0 + 0.8) || e.hitWall || s.t > 2.5) { s.n++; s.hit = 0; e.vel.x = 0; if (s.n >= (mv.m.n || 2)) return true; s.ph = 1; s.t = 0; } return false; }
    return true;
  },
  // Brannoch brings the hammer down on the forge-floor: molten slag arcs out both ways and burns where it lands
  forgefall(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, a = Math.max(0.5, (mv.m.windup || e.T.windup)[0]);
    if (k < a) { e.warn = Math.max(e.warn || 0, k / a); if (e.hand && k > 0.15) { const h = e.hand.getWorldPosition(new THREE.Vector3()); e.g.fx.spawn(h.x, h.y, 0.8, rnd(-0.3, 0.3), rnd(0.2, 1), k > 0.35 ? 0xfff4e0 : 0xffb060, 0.18, 0.5 + k, 0); if (Math.random() < 0.4) e.g.fx.spawn(h.x, h.y, 0.8, rnd(-2, 2), rnd(1, 3), 0xffd080, 0.4, 0.1, 9); } return false; } // the hammer head heats white
    if (!mv.s.f) { mv.s.f = 1; const fy = e.arenaFloor ?? e.home.y; e.g.shake(0.7); e.g.hitStop(0.06); audio.play('rock_meteor_swarm_2', 0.7, 0.7); e.g.fx.cracks(e.pos.x + e.facing * 1.6, fy, 2.5, 0xff6a14); frontBox(e, P, e.T.reach, false, e.T.dmg);
      for (let i = 0; i < (mv.m.n || 8); i++) { const dir = i % 2 ? 1 : -1, sp = 4 + (i >> 1) * 2.2; e.g.shoot({ x: e.pos.x + e.facing * 1.6, y: fy + 1.2, vx: dir * sp, vy: 11 + rnd(-1, 1.5), grav: 22, kind: 'slag', dmg: Math.round(e.T.dmg * 0.6 * e.dmgMul), elem: 'fire', src: e, life: 3, splash: 'fire' }); } }
    return k >= 1;
  },
  // Malgrave opens every book at once: they wheel around him, then fly out in a turning spiral with gaps to slip through
  grimoire(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, s = mv.s, fy = e.arenaFloor ?? e.home.y;
    if (!s.o) { s.o = 1; s.book = e.g.openBook(e); audio.play('spell_impact_3', 0.6, 0.6); e.air = true; }
    e.vel.set(0, k < 0.9 ? (fy + 2 - e.pos.y) * 4 : -4); // he lifts off the floor to read
    if (k < 0.3) { e.warn = k / 0.3; return false; }
    s.a = (s.a || 0) + dt * (2 * Math.PI / (mv.dur * 0.55)); s.c = (s.c || 0) - dt; // one full sweep across the casting window
    if (k < 0.85 && s.c <= 0) { s.c = 0.1; const y0 = e.cy + 0.5, aim = Math.atan2(P.pos.y + 0.9 - y0, Math.max(2, Math.abs(P.pos.x - e.cx))), sw = aim + Math.sin(s.a) * 0.35; for (const ang of [sw, Math.PI - sw]) e.g.shoot({ x: e.cx + Math.cos(ang) * 0.9, y: y0 + Math.sin(ang) * 0.9, vx: Math.cos(ang) * 6.5, vy: Math.sin(ang) * 6.5, kind: 'book', dmg: Math.round(e.T.dmg * 0.55 * e.dmgMul), src: e, life: 2.6 }); audio.play('clothing_1', 0.25, 1.6); } // two arms swing through your height: read the gaps
    if (k >= 1) { e.air = false; s.book?.close(); }
    return k >= 1;
  },
  // Vhalgor calls the storm down: rune-lines kindle across the floor in a march, then lightning strikes each one
  stormcall(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, rb = e.room.b, fy = e.arenaFloor ?? e.home.y, s = mv.s; e.vel.set(0, 0); // he holds the air while the storm answers
    const march = (t0, dir, gap) => { const n = mv.m.n || 9, c = THREE.MathUtils.clamp(P.pos.x, rb.x0 + 2 + 7.2, rb.x1 - 2 - 7.2); for (let i = 0; i < n; i++) { if (i === gap) continue; const j = dir > 0 ? i : n - 1 - i, x = c + (j - (n - 1) / 2) * 1.8; e.g.erupt({ x, y: fy, delay: t0 + i * 0.11, w: 1.6, h: 14, dmg: e.T.dmg * 0.9 * e.dmgMul, elem: 'lightning', src: e }); } };
    if (!s.f) { s.f = 1; s.dir = P.pos.x < (rb.x0 + rb.x1) / 2 ? 1 : -1; const n = mv.m.n || 9, mid = (n - 1) / 2; s.g1 = Math.round(mid + rnd(-2, 2)); march(0.75, s.dir, s.dir > 0 ? s.g1 : n - 1 - s.g1); audio.play('spell_impact_2', 0.6, 0.6); } // runes 1.8 m apart across your ground; one stays dark
    if (!s.f2 && mv.t > 0.75 + 9 * 0.11 + 0.6) { s.f2 = 1; const n = mv.m.n || 9, mid = (n - 1) / 2; let g2 = Math.round(mid + rnd(-2, 2)); if (g2 === s.g1) g2 += g2 < mid ? 2 : -2; march(0.55, -s.dir, -s.dir > 0 ? g2 : n - 1 - g2); audio.play('spell_impact_2', 0.6, 0.7); } // and back again, the gap moved
    return k >= 1 && s.f2;
  },
  // Velscour eclipses his own sun: the hall darkens, the black sun drags you in and wheels fire around itself
  eclipse(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, s = mv.s;
    if (!s.f) { s.f = 1; s.sun = e.g.blackSun(e, mv.dur); audio.play('firebuff_2', 0.7, 0.4); audio.play('crowd_gasp', 0.4, 0.4); }
    e.g.darken = Math.max(e.g.darken || 0, Math.min(1, k * 4, (1 - k) * 4));
    if (k > 0.2 && k < 0.88) { const sx = s.sun.position.x, sy = s.sun.position.y; P.push = (P.push || 0) + sgn(sx - P.pos.x) * dt * 7; s.a = (s.a ?? 0) + dt * 1.3; s.c = (s.c || 0) - dt;
      if (s.c <= 0) { s.c = 0.16; for (let j = 0; j < 4; j++) { const ang = s.a + j * Math.PI / 2; e.g.shoot({ x: sx + Math.cos(ang) * 1.2, y: sy + Math.sin(ang) * 1.2, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, kind: 'ember', dmg: Math.round(e.T.dmg * 0.55 * e.dmgMul), elem: 'fire', src: e, life: 3 }); } } }
    return k >= 1;
  },
  // ---- minibosses
  // the werewolf's moon-frenzy: three lunging rakes, each re-aimed at you, leaving pale afterimages
  frenzy(e, mv, dt, P) {
    mv.t += dt; const s = mv.s, wind = LEAD_BIG, rk = mv.dur * 0.25, tt = mv.t - wind; // wind-up in seconds (it was a fifth of the move: .28 s); each rake keeps its length
    if (tt < 0) { e.warn = mv.t / wind; e.vel.x = 0; return false; }
    const i = Math.min(2, Math.floor(tt / rk)), u = (tt / rk) % 1;
    if (s.i !== i) { s.i = i; s.hit = 0; e.facing = sgn(P.pos.x - e.pos.x); audio.play('sword_attack_3', 0.5, 0.95 + i * 0.12); e.play(e.clipFor(i === 1 ? 'atk3' : 'atk1') || e.T.anim.attack, 0.06, { restart: true, speed: 1.7, once: true }); }
    if (u < 0.5 && tt < rk * 3) { e.vel.x = e.facing * 12 * (1 - u / 0.5); if (Math.abs(e.vel.x) > 4 && (s.gt = (s.gt || 0) - dt) <= 0) { s.gt = 0.05; e.ghost(0x5a74ff, 0.24, 0.28); } if (!s.hit && u > 0.15 && frontBox(e, P, e.T.reach + 0.3, false, e.T.dmg * 0.7)) s.hit = 1; } else e.vel.x = 0;
    return tt >= rk * 3 + mv.dur * 0.05;
  },
  // the crab tucks into its shell and spins across the floor, throwing sparks; it rebounds off one wall, then reels
  shellspin(e, mv, dt, P) {
    mv.t += dt; const s = mv.s;
    if (mv.t < 0.5) { e.warn = mv.t / 0.5; e.vel.x = 0; e.tilt.rotation.y += dt * 6 * (mv.t / 0.5); return false; }
    if (!s.go) { s.go = 1; s.b = 0; e.facing = sgn(P.pos.x - e.pos.x); audio.play('rock_meteor_throw_1', 0.6, 0.7); }
    e.vel.x = e.facing * 11; e.tilt.rotation.y += dt * 26; if ((s.gt = (s.gt || 0) - dt) <= 0) { s.gt = 0.08; e.ghost(0xff7a30, 0.2, 0.2); }
    if (Math.random() < 0.8) e.g.fx.spawn(e.pos.x - e.facing * e.T.w * 0.4, e.pos.y + 0.1, 0.6, -e.facing * rnd(2, 6), rnd(1, 4), Math.random() < 0.5 ? 0xffd080 : 0xffffff, 0.3, 0.12, 14);
    const a = e.aabb; if (!s.hit && hitBox(e, P, a.x0 - 0.2, a.x1 + 0.2, a.y0, a.y1, e.T.dmg * 1.1)) s.hit = 1;
    if (e.hitWall) { e.g.shake(0.4); audio.play('rock_wall_2', 0.6, 1.1); e.g.fx.burst(e.pos.x + e.facing * e.T.w * 0.5, e.pos.y + 0.8, 0xffe0a0, 16, 4); if (++s.b > 1) { e.tilt.rotation.y = 0; e.stun = 1.4; e.stunStars = true; return true; } e.facing *= -1; s.hit = 0; }
    if (mv.t > 4) { e.tilt.rotation.y = 0; return true; }
    return false;
  },
  // the flesh-spider spits a net: it spreads in flight, and where it lands on you it binds your legs
  webnet(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur;
    if (k < 0.4) { e.warn = k / 0.4; return false; }
    if (!mv.s.f) { mv.s.f = 1; const dx = P.pos.x - e.pos.x, dy = P.pos.y + 1 - (e.pos.y + 1.2), d = Math.hypot(dx, dy) || 1; e.g.shoot({ x: e.pos.x + sgn(dx) * 1.2, y: e.pos.y + 1.2, vx: dx / d * 11, vy: dy / d * 11 + 2, grav: 6, kind: 'net', dmg: Math.round(e.T.dmg * 0.4 * e.dmgMul), src: e, life: 2, snare: 1.6 }); audio.play('squelching_1', 0.6, 0.7); }
    return k >= 1;
  },
  // the green wyrm coughs miasma: pools of poison that hang over the floor for a while; stay out of them
  miasma(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, n = mv.m.n || 3, i = Math.floor((k - 0.3) / 0.45 * n), fy = e.arenaFloor ?? e.home.y;
    if (k < 0.3) e.warn = k / 0.3;
    if (k >= 0.3 && i >= (mv.s.i ?? 0) && (mv.s.i ?? 0) < n) { mv.s.i = (mv.s.i ?? 0) + 1; const [a0, a1] = e.arenaSpan(), x = THREE.MathUtils.clamp(P.pos.x + rnd(-3, 3), a0 - 2, a1 + 2); const T = 0.6, g = 14, mx = e.mouth.x, my = e.mouth.y; e.g.shoot({ x: mx, y: my, vx: (x - mx) / T, vy: (fy + 0.3 - my) / T + 0.5 * g * T, grav: g, kind: 'lob', dmg: Math.round(e.T.dmg * 0.4 * e.dmgMul), elem: 'poison', src: e, life: T + 0.05, splash: 'miasma', cloudDmg: Math.round(e.T.dmg * 0.25 * e.dmgMul) }); audio.play('waterspray_1', 0.5, 0.6); } // a glob of bile arcs out and bursts into a cloud where it lands
    return k >= 1;
  },
  // the bone golem stamps and the ossuary answers: a ring of bone teeth bursts outward on both sides
  ossuary(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, a = Math.max(0.5, (mv.m.windup || e.T.windup)[0]), fy = e.arenaFloor ?? e.home.y;
    if (k < a) { e.warn = k / a; e.vel.x = 0; if (Math.random() < 0.6) e.g.fx.spawn(e.pos.x + rnd(-6, 6), fy + 0.05, 0.7, 0, rnd(0.5, 1.4), 0xe8dcc0, 0.4, rnd(0.08, 0.14), 4, false); if (!mv.s.r) { mv.s.r = 1; audio.play('bone_snap', 0.5, 0.5); } return false; } // the floor rattles: bone shards jump out of the cracks all round him
    if (!mv.s.f) { mv.s.f = 1; const fy = e.arenaFloor ?? e.home.y, rb = e.room.b; e.g.shake(0.5); e.g.fx.cracks(e.pos.x, fy, 3); audio.play('bone_snap', 0.7, 0.7);
      for (const dir of [1, -1]) { const n = mv.m.n || 6; let last = e.pos.x; for (let i = 0; i < n; i++) { const x = e.pos.x + dir * (1.6 + i * 1.3); if (x > rb.x0 + 0.8 && x < rb.x1 - 0.8) { last = x; e.g.erupt({ x, y: fy, delay: 0.12 + i * 0.09, w: 1.1, h: i % 2 ? 1.8 : 1.5, dmg: e.T.dmg * 0.8 * e.dmgMul, elem: 'bone', src: e, hold: 2.5, perch: true, line: true }); } } e.g.fx.crackLine(e.pos.x + dir * 1.1, last + dir * 0.5, fy, 0xf0e0c0, 0.12 + n * 0.09, 0.8 + n * 0.09); } } // a palisade of bone: stand on it, or be penned by it
    return k >= 1;
  },
  // the Abyssal Mouth breathes in: everything slides toward its maw, then it snaps shut
  maw(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, s = mv.s;
    if (k < 0.7) { e.warn = Math.min(1, k / 0.5); e.facing = sgn(P.pos.x - e.pos.x); const d = P.pos.x - e.pos.x; if (Math.abs(d) < 14 && Math.abs(P.pos.y - e.pos.y) < 5) P.push = (P.push || 0) - sgn(d) * dt * 9;
      if ((s.st = (s.st || 0) - dt) <= 0) { s.st = 0.035; const mx = e.pos.x + e.facing * e.T.w * 0.4, my = e.cy + 0.3, sx = e.pos.x + e.facing * rnd(3, 8), sy = e.cy + rnd(-2.2, 2.6), ang = Math.atan2(my - sy, mx - sx); e.g.fx.streak(sx, sy, 1, Math.min(3.2, Math.hypot(mx - sx, my - sy) * 0.6), Math.random() < 0.5 ? 0x9a7ad8 : 0xd8c8ff, 0.1, 0.8, ang); if (Math.random() < 0.3) e.g.fx.spawn(e.pos.x + e.facing * rnd(3, 8), e.pos.y + 0.2, 0.7, -e.facing * rnd(5, 9), rnd(0.5, 2), 0xe0d4b8, 0.6, rnd(0.08, 0.14), 2, false); } /* the air, the dust and loose bones all converge on the maw */
      if (Math.random() < 0.6) e.g.fx.spawn(e.pos.x + e.facing * rnd(2, 9), e.pos.y + 0.15, 0.7, -e.facing * rnd(4, 8), rnd(0, 0.6), 0x5a5048, 0.5, rnd(0.2, 0.4), 0, false); if (!s.snd) { s.snd = 1; audio.play('wave_attack_1', 0.6, 0.35); } return false; }
    if (!s.f) { s.f = 1; audio.play('squelching_4', 0.7, 0.6); e.g.shake(0.4); e.play(e.T.anim.attack, 0.06, { restart: true, once: true, speed: 1.6 }); if (frontBox(e, P, e.T.reach + 1, false, e.T.dmg * 1.3)) e.g.hitStop(0.08); }
    return k >= 1;
  },
  // the red wyrm calls fire down: burning stones fall on runes across the floor
  meteor(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur, n = mv.m.n || 6, i = Math.floor((k - 0.25) / 0.55 * n), fy = e.arenaFloor ?? e.home.y;
    if (k < 0.25) e.warn = k / 0.25;
    if (k >= 0.25 && i >= (mv.s.i ?? 0) && (mv.s.i ?? 0) < n) { mv.s.i = (mv.s.i ?? 0) + 1; const [a0, a1] = e.arenaSpan(), x = THREE.MathUtils.clamp(i % 2 ? P.pos.x + P.vel.x * 0.4 : rnd(a0, a1), a0 - 1, a1 + 1); e.g.erupt({ x, y: fy, delay: 0.85, w: 2.2, h: 0.2, dmg: 0, col: 0xff6a20, quiet: true }); e.g.after(0, () => { if (!e.dead && e.g.room === e.room) e.g.shoot({ x: x - 3, y: fy + 12, vx: 3.6, vy: -14, kind: 'meteor', dmg: Math.round(e.T.dmg * 0.8 * e.dmgMul), elem: 'fire', src: e, life: 2, splash: 'fire' }); }); } // (next step, on the game clock)
    return k >= 1;
  },
  // the undead wyrm's frost nova: a ring of ice crystals that races outward from it both ways
  frostnova(e, mv, dt, P) {
    mv.t += dt; const k = mv.t / mv.dur;
    if (k < 0.35) { e.warn = k / 0.35; for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, r = rnd(2.5, 4); e.g.fx.spawn(e.cx + Math.cos(a) * r, e.cy + Math.sin(a) * r, 0.8, -Math.cos(a) * r * 2, -Math.sin(a) * r * 2, 0xd8f4ff, 0.45, 0.14, 0); } if (!mv.s.ic) { mv.s.ic = 1; audio.play('ice_freeze_2', 0.6, 0.6); } return false; } // frost is drawn in to it from all round: the cold gathering, then the burst
    if (!mv.s.f) { mv.s.f = 1; const fy = e.arenaFloor ?? e.home.y, rb = e.room.b; e.g.fx.ring(e.cx, e.cy, 0x9fe4ff, 10); audio.play('ice_barrage_2', 0.7, 0.7); e.g.shake(0.4);
      for (const dir of [1, -1]) for (let i = 0; i < (mv.m.n || 7); i++) { const x = e.pos.x + dir * (2 + i * 1.5); if (x > rb.x0 + 0.8 && x < rb.x1 - 0.8) { e.g.erupt({ x, y: fy, delay: 0.2 + i * 0.07, w: 1.3, h: 1.9, dmg: e.T.dmg * 0.75 * e.dmgMul, elem: 'ice', src: e }); e.g.erupt({ x, y: fy, delay: 1.25 + i * 0.05, w: 1.5, h: 0.8, dmg: e.T.dmg * 0.5 * e.dmgMul, elem: 'ice', src: e, line: true }); } } } // then the crystals burst into low shards: jump again
    return k >= 1;
  },
  buffet(e, mv, dt, P) { mv.t += dt; const k = mv.t / mv.dur; if (k > 0.35 && k < 0.8) { e.g.windPush(e, 16 * dt * 6); if (!mv.s.f) { mv.s.f = 1; audio.play('wave_attack_1', 0.7, 0.4); for (let i = 0; i < 5; i++) e.g.after(i * 0.13, () => { if (!e.dead && e.g.room === e.room) e.g.shoot({ x: e.pos.x + e.facing * 2.5, y: e.pos.y + 0.8 + i * 0.8, vx: e.facing * 12, vy: 0, kind: 'gust', dmg: Math.round(e.T.dmg * 0.5), elem: e.T.elem, src: e, life: 2.2 }); }); } } return k >= 1; }, // gusts 0.13 s apart on the game clock
};
