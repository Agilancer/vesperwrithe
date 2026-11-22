import * as THREE from 'three';

// The hero's weapon swings: ONE swing per weapon class, posed in the side-view plane.
//
// Why not mocap clips: a clip is authored for a free camera, so its blade leaves the play plane, its arc changes with every
// weapon length, and it brings its own legs (so it cannot be swung crouching or in the air). Symphony of the Night draws one
// wind-up pose, a couple of smeared swing poses and a settle, with the weapon overlaid as a crescent (docs/research:
// sotn_swing_frames.md): hitbox out by frame 3, the cut over inside ten frames, the same cut standing, crouching and airborne.
// The BM knights and heroes add the body rules (wind up slow and short, land fast, the chest turns into the blow, never fold
// face down, the fist's speed is one hump that peaks just before the hit, the off hand rides the shaft).
//
// So a swing here is a few keys: where the fist is (metres from the sword shoulder: forward, up), where the blade points
// (degrees in the play plane: 0 = straight ahead, 90 = up, 180 = behind), how far the chest has turned and leaned. The arm is
// solved to the fist (two-bone IK), the hand is turned so the blade lies exactly on its line with the edge leading, and the
// legs keep doing whatever they were doing: stand, crouch, run-up, jump, fall.
//
// key: [t, fwd, up, angle, twist, lean, ease]   t = share of the swing · ease: how the segment ENDING at this key is travelled
//   'in' accelerates into the key (a strike) · 'out' settles into it (a wind-up, a follow-through) · 'io' both
// hit: [t0, t1] the share during which the blow is live · cancel: from here a new press or a step ends the recovery
// reach/height/yOff: the hit box (metres ahead of the hero, its height, its centre above his feet)
const K = (t, fwd, up, a, tw = 0, ln = 0, ease = 'io') => ({ t, fwd, up, a, tw, ln, ease });
export const SWINGS = {
  // one-hand sword: the SotN cut. Blade up behind the shoulder, down through the front, held low.
  sword: { dur: 0.3, hit: [0.16, 0.46], cancel: 0.6, reach: 1.75, height: 2.1, yOff: 1.1, lunge: 2.6,
    keys: [K(0.14, -0.06, 0.34, 138, -0.4, -0.1, 'out'), K(0.42, 0.5, 0.0, -28, 0.5, 0.2, 'in'), K(0.62, 0.46, -0.14, -46, 0.55, 0.24, 'out'), K(1, 0.3, -0.2, -30, 0.25, 0.1)] },
  // greatsword / greataxe: both hands, a full half-circle from behind the head to the floor in front
  great_sword: { dur: 0.46, hit: [0.26, 0.56], cancel: 0.72, reach: 2.25, height: 2.7, yOff: 1.25, lunge: 2.2, heavy: true,
    keys: [K(0.24, -0.12, 0.4, 158, -0.5, -0.18, 'out'), K(0.52, 0.5, -0.06, -40, 0.55, 0.3, 'in'), K(0.7, 0.44, -0.22, -58, 0.6, 0.36, 'out'), K(1, 0.3, -0.24, -40, 0.3, 0.16)] },
  great_axe: { dur: 0.5, hit: [0.28, 0.58], cancel: 0.74, reach: 2.2, height: 2.7, yOff: 1.25, lunge: 2.0, heavy: true,
    keys: [K(0.26, -0.14, 0.42, 165, -0.5, -0.2, 'out'), K(0.54, 0.5, -0.1, -48, 0.55, 0.34, 'in'), K(0.72, 0.42, -0.26, -66, 0.6, 0.4, 'out'), K(1, 0.3, -0.26, -45, 0.3, 0.18)] },
  // axe: a tighter, steeper chop that bites down
  axe: { dur: 0.34, hit: [0.2, 0.5], cancel: 0.64, reach: 1.6, height: 2.0, yOff: 1.0, lunge: 2.4,
    keys: [K(0.18, -0.04, 0.38, 128, -0.35, -0.12, 'out'), K(0.46, 0.46, -0.08, -50, 0.5, 0.26, 'in'), K(0.64, 0.4, -0.2, -66, 0.55, 0.3, 'out'), K(1, 0.28, -0.22, -45, 0.25, 0.12)] },
  // mace: SotN's overhead loop: hangs a beat behind the head, comes over the top and down in front
  mace: { dur: 0.38, hit: [0.26, 0.56], cancel: 0.7, reach: 1.55, height: 2.2, yOff: 1.1, lunge: 2.0, heavy: true,
    keys: [K(0.22, -0.1, 0.36, 170, -0.4, -0.16, 'out'), K(0.52, 0.46, -0.06, -42, 0.5, 0.28, 'in'), K(0.7, 0.4, -0.2, -62, 0.55, 0.32, 'out'), K(1, 0.28, -0.22, -40, 0.25, 0.12)] },
  // maul: the slowest thing he carries; hauled up, then dropped on the floor (main.js shakes when the head lands)
  great_mace: { dur: 0.58, hit: [0.34, 0.6], cancel: 0.78, reach: 2.1, height: 2.8, yOff: 1.2, lunge: 1.6, heavy: true, slam: 0.56,
    keys: [K(0.32, -0.16, 0.44, 172, -0.45, -0.22, 'out'), K(0.56, 0.48, -0.2, -62, 0.5, 0.4, 'in'), K(0.76, 0.44, -0.3, -72, 0.5, 0.44, 'out'), K(1, 0.3, -0.26, -45, 0.25, 0.2)] },
  // scythe: wide and low, the hook pulls what it catches
  scythe: { dur: 0.48, hit: [0.26, 0.58], cancel: 0.74, reach: 2.6, height: 2.4, yOff: 1.05, lunge: 2.0, heavy: true, pull: true,
    keys: [K(0.24, -0.16, 0.36, 168, -0.55, -0.14, 'out'), K(0.54, 0.5, -0.16, -52, 0.6, 0.32, 'in'), K(0.72, 0.36, -0.3, -80, 0.6, 0.34, 'out'), K(1, 0.28, -0.24, -40, 0.25, 0.14)] },
  // dagger: a flick. Short reach, over before most foes can answer
  dagger: { dur: 0.2, hit: [0.14, 0.5], cancel: 0.58, reach: 1.25, height: 1.5, yOff: 1.1, lunge: 3.4,
    keys: [K(0.14, 0.0, 0.2, 118, -0.3, -0.06, 'out'), K(0.46, 0.5, 0.02, -18, 0.45, 0.16, 'in'), K(0.64, 0.46, -0.08, -34, 0.5, 0.18, 'out'), K(1, 0.3, -0.16, -20, 0.2, 0.08)] },
  // thrusts: the point stays on its line; the fist draws back past the hip and drives out to a straight arm
  rapier: { dur: 0.24, hit: [0.22, 0.56], cancel: 0.62, reach: 2.25, height: 0.9, yOff: 1.2, lunge: 5.0, thrust: true, star: true,
    keys: [K(0.2, -0.26, 0.0, 4, -0.55, -0.06, 'out'), K(0.44, 0.6, 0.02, 0, 0.55, 0.22, 'in'), K(0.66, 0.6, 0.02, 0, 0.55, 0.22, 'out'), K(1, 0.3, -0.1, 14, 0.2, 0.08)] },
  spear: { dur: 0.34, hit: [0.26, 0.6], cancel: 0.66, reach: 2.7, height: 0.9, yOff: 1.05, lunge: 4.2, thrust: true,
    keys: [K(0.24, -0.3, -0.1, 6, -0.6, -0.08, 'out'), K(0.48, 0.58, -0.08, 0, 0.55, 0.26, 'in'), K(0.68, 0.58, -0.08, 0, 0.55, 0.26, 'out'), K(1, 0.24, -0.16, 12, 0.2, 0.1)] },
  lance: { dur: 0.44, hit: [0.3, 0.64], cancel: 0.7, reach: 3.3, height: 0.9, yOff: 1.05, lunge: 5.4, thrust: true, heavy: true,
    keys: [K(0.28, -0.32, -0.12, 5, -0.6, -0.1, 'out'), K(0.52, 0.56, -0.1, 0, 0.55, 0.3, 'in'), K(0.72, 0.56, -0.1, 0, 0.55, 0.3, 'out'), K(1, 0.22, -0.18, 10, 0.2, 0.1)] },
  // staff: a short crack with the head, and the bolt leaves the head as it points (shot = the share at which it is loosed)
  staff: { dur: 0.4, hit: [0.24, 0.5], cancel: 0.7, reach: 1.7, height: 2.0, yOff: 1.15, lunge: 0.001, ranged: 'staff', shot: 0.44, melee: 0.6,
    keys: [K(0.22, -0.06, 0.26, 112, -0.35, -0.1, 'out'), K(0.46, 0.5, 0.1, 12, 0.45, 0.16, 'in'), K(0.7, 0.52, 0.1, 8, 0.45, 0.16, 'out'), K(1, 0.3, -0.1, 50, 0.2, 0.06)] },
  // bow: the bow hand goes out and holds; the string hand draws to the cheek and lets go (off = the off hand, metres behind the grip)
  bow: { dur: 0.4, hit: [0.5, 0.56], cancel: 0.72, reach: 0.6, height: 0.6, yOff: 1.25, lunge: 0.001, ranged: 'arrow', shot: 0.5, freeHand: true,
    keys: [K(0.2, 0.52, 0.02, 90, 0.5, 0.0, 'out'), K(0.5, 0.56, 0.04, 90, 0.6, -0.04, 'out'), K(0.74, 0.56, 0.04, 86, 0.55, 0.0, 'out'), K(1, 0.34, -0.12, 70, 0.2, 0.0)],
    off: [[0, 0.06], [0.2, 0.1], [0.48, 0.52], [0.52, 0.56], [0.6, 0.2], [1, 0.1]] },
  // boomerang: an overhand throw; it leaves the hand as the hand comes past the shoulder
  boomerang: { dur: 0.34, hit: [0.4, 0.46], cancel: 0.68, reach: 0.6, height: 0.6, yOff: 1.2, lunge: 0.6, ranged: 'boomerang', shot: 0.4,
    keys: [K(0.22, -0.14, 0.34, 150, -0.5, -0.12, 'out'), K(0.46, 0.54, 0.12, 10, 0.55, 0.2, 'in'), K(0.68, 0.5, -0.08, -30, 0.55, 0.22, 'out'), K(1, 0.3, -0.16, -20, 0.2, 0.08)] },
  // fists: one straight right
  unarmed: { dur: 0.2, hit: [0.2, 0.56], cancel: 0.6, reach: 0.95, height: 0.9, yOff: 1.25, lunge: 3.0, fist: true,
    keys: [K(0.18, -0.02, -0.08, 20, -0.45, -0.04, 'out'), K(0.44, 0.6, 0.0, 0, 0.6, 0.2, 'in'), K(0.64, 0.6, 0.0, 0, 0.6, 0.2, 'out'), K(1, 0.24, -0.14, 30, 0.2, 0.06)] },
};
export const swingFor = kind => SWINGS[kind] || SWINGS.sword;

const EASE = { in: u => u * u * (2.2 - 1.2 * u), out: u => 1 - (1 - u) * (1 - u), io: u => u * u * (3 - 2 * u) };
const lerp = (a, b, u) => a + (b - a) * u;
// The pose at share t of a swing. w = how much of the swing's pose is laid over the body's own (it comes in over the first
// key and goes out over the last), so the cut starts from wherever the arm was and hands it back without a pop.
export function poseAt(S, t, out = {}) {
  const ks = S.keys; let i = 0; while (i < ks.length - 1 && t > ks[i].t) i++;
  const b = ks[i], a = i ? ks[i - 1] : null, t0 = a ? a.t : 0, u = EASE[b.ease](Math.min(1, Math.max(0, (t - t0) / Math.max(1e-4, b.t - t0))));
  const A = a || b; // before the first key: hold its pose and bring the weight in
  out.fwd = lerp(A.fwd, b.fwd, u); out.up = lerp(A.up, b.up, u); out.a = lerp(A.a, b.a, u); out.tw = lerp(A.tw, b.tw, u); out.ln = lerp(A.ln, b.ln, u);
  const last = ks[ks.length - 2].t;
  out.w = !a ? EASE.out(Math.min(1, t / Math.max(1e-4, b.t * 0.55))) : t > last ? 1 - EASE.io((t - last) / (1 - last)) : 1;
  out.off = null;
  if (S.off) { const o = S.off; let j = 0; while (j < o.length - 1 && t > o[j + 1][0]) j++; const p = o[j], q = o[Math.min(o.length - 1, j + 1)]; out.off = lerp(p[1], q[1], q[0] > p[0] ? Math.min(1, Math.max(0, (t - p[0]) / (q[0] - p[0]))) : 0); }
  return out;
}

const V = THREE.Vector3, Q = THREE.Quaternion;
const _p = new Q(), _a = new V(), _b = new V(), _o = new V(), _m = new THREE.Matrix4();
function setWorldQuat(bone, wq) { bone.parent.getWorldQuaternion(_p); bone.quaternion.copy(_p.invert().multiply(wq)); bone.updateMatrixWorld(true); }
function turnWorld(bone, q) { setWorldQuat(bone, q.clone().multiply(bone.getWorldQuaternion(new Q()))); }
function aimBone(bone, from, to) { bone.getWorldPosition(_o); _a.copy(from).sub(_o).normalize(); _b.copy(to).sub(_o).normalize(); turnWorld(bone, new Q().setFromUnitVectors(_a, _b)); }
// two-bone reach: shoulder bone `arm`, elbow bone `fore`, wrist bone `hand` to world point `tgt`, the elbow kept toward `pole`
function reach(arm, fore, hand, tgt, pole) {
  const S = arm.getWorldPosition(new V()), E = fore.getWorldPosition(new V()), W = hand.getWorldPosition(new V());
  const a = S.distanceTo(E), c = E.distanceTo(W), n = tgt.clone().sub(S), d = Math.min(n.length(), (a + c) * 0.985); n.normalize();
  const pl = pole.clone().addScaledVector(n, -pole.dot(n)); if (pl.lengthSq() < 1e-6) pl.set(0, -1, 0); pl.normalize();
  const cosA = Math.min(1, Math.max(-1, (a * a + d * d - c * c) / (2 * a * Math.max(1e-4, d))));
  const elbow = S.clone().addScaledVector(n, a * cosA).addScaledVector(pl, a * Math.sqrt(1 - cosA * cosA));
  aimBone(arm, E, elbow); aimBone(fore, hand.getWorldPosition(new V()), S.clone().addScaledVector(n, d));
}

export class SwingRig {
  constructor(model) {
    const b = n => model.getObjectByName('mixamorig' + n);
    this.sp = [b('Spine'), b('Spine1'), b('Spine2')];
    this.R = { arm: b('RightArm'), fore: b('RightForeArm'), hand: b('RightHand'), mid: b('RightHandMiddle1') };
    this.L = { arm: b('LeftArm'), fore: b('LeftForeArm'), hand: b('LeftHand') };
    this.bones = [...this.sp, this.R.arm, this.R.fore, this.R.hand, this.L.arm, this.L.fore, this.L.hand];
    this.keep = this.bones.map(() => new Q()); this.pose = {};
  }
  // Lay the swing's pose over the animated body. facing = ±1; wm = the weapon in the right hand (or null: a fist);
  // crouch squeezes the arc under a low ceiling's worth of height. Returns the pose (for the trail and the muzzle).
  apply(S, t, facing, wm, crouch) {
    const p = poseAt(S, t, this.pose), f = facing; if (p.w <= 0.001) return p;
    this.bones.forEach((b, i) => this.keep[i].copy(b.quaternion));
    let ang = p.a, up = p.up; if (crouch && !S.thrust && !S.ranged) { ang = ang > 0 ? ang * 0.72 : ang * 0.8; up = up * 0.7 - 0.04; }
    // the chest turns into the blow and leans with it, shared down the spine (never folding face down: lean is capped by the keys)
    const tq = new Q().setFromAxisAngle(_a.set(0, 1, 0), p.tw * 0.36), lq = new Q().setFromAxisAngle(_a.set(0, 0, 1), -f * p.ln * 0.4);
    for (const s of this.sp) turnWorld(s, lq.clone().multiply(tq));
    // fist to its point, elbow down and out from the body (toward the hero's own right)
    const R = this.R, sh = R.arm.getWorldPosition(new V()), tgt = new V(sh.x + f * p.fwd, sh.y + up, sh.z + f * 0.1);
    reach(R.arm, R.fore, R.hand, tgt, new V(-f * 0.35, -1, f * 0.4));
    // the blade on its line, edge leading down the cut; a fist just points its knuckles down the line
    const a = ang * Math.PI / 180, d = new V(f * Math.cos(a), Math.sin(a), 0), e = new V(f * Math.sin(a), -Math.cos(a), 0);
    if (wm && !S.fist) {
      const want = new Q().setFromRotationMatrix(_m.makeBasis(new V().crossVectors(d, e), d, e));
      const cur = wm.getWorldQuaternion(new Q()), hq = R.hand.getWorldQuaternion(new Q());
      setWorldQuat(R.hand, want.multiply(cur.invert()).multiply(hq));
    } else if (R.mid) { const k = R.mid.getWorldPosition(new V()).sub(R.hand.getWorldPosition(new V())).normalize(); turnWorld(R.hand, new Q().setFromUnitVectors(k, d)); }
    // the off hand of a draw (bow): to a point behind the grip along the arrow's line
    if (p.off != null && wm) { const g = wm.getWorldPosition(new V()), L = this.L; reach(L.arm, L.fore, L.hand, new V(g.x - f * p.off, g.y + 0.02, g.z - f * 0.04), new V(-f * 0.5, -0.8, -f * 0.3)); this.offHeld = true; } else this.offHeld = false;
    if (p.w < 0.999) this.bones.forEach((b, i) => { b.quaternion.slerpQuaternions(this.keep[i], b.quaternion, p.w); });
    this.sp[0].updateMatrixWorld(true);
    return p;
  }
}
