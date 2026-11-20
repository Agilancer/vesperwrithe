import * as THREE from 'three';
import { loadGLTF } from './assets.js';
import { STYLES } from './items.js';

// The hero's authored clips (tools/build_anims.py → assets/player/vesper_moves.glb + moves.json).
// Each attack clip starts and ends on the guard pose with an eased wind-up, a strike that travels in the
// side-view plane, a held follow-through and a blended recovery. A style is a chain of [clip, seconds]:
// pressing attack again after a clip's cancel frame flows into the next link.
const MOVESET = {
  slash1h: [['vw_slash1', 0.5], ['vw_slash2', 0.5], ['vw_slash3', 0.62]],
  slash2h: [['vw_great', 0.74]],
  smash:   [['vw_smash', 0.64]],
  smash2h: [['vw_smash', 0.82]],
  chop:    [['vw_slash3', 0.54], ['vw_slash1', 0.5]],
  thrust:  [['vw_thrust', 0.54]],
  lance:   [['vw_thrust', 0.72]],
  stab:    [['vw_thrust', 0.34], ['vw_slash2', 0.36]],
  punch:   [['vw_punch', 0.38]],
  hurl:    [['vw_slash2', 0.46]],
};

export async function loadMoves() {
  const [g, meta] = await Promise.all([loadGLTF('assets/player/vesper_moves.glb'), fetch('assets/player/moves.json').then(r => r.json())]);
  for (const [style, chain] of Object.entries(MOVESET)) {
    const st = STYLES[style]; if (!st) continue;
    st.chain = chain.filter(([clip]) => meta.clips[clip]).map(([clip, dur]) => {
      const m = meta.clips[clip]; // frames in moves.json are 1-based
      return { anim: clip, dur, from: 0, to: m.frames - 1, hit: [m.hit[0] - 1, m.hit[1] - 1], cancel: m.cancel - 1 };
    });
    if (st.chain.length) Object.assign(st, st.chain[0]); else delete st.chain;
  }
  return { clips: g.animations, meta };
}

// How fast a planted foot travels backwards under the hips, in m/s: run clips are played at
// (movement speed / this) so the feet do not skate. Call with the model facing +Z.
export function strideSpeed(mixer, model, clip, fps = 30) {
  const a = mixer.clipAction(clip), feet = ['mixamorigLeftFoot', 'mixamorigRightFoot'].map(n => model.getObjectByName(n)), v = new THREE.Vector3();
  a.reset().play(); const P = [];
  for (let t = 0; t <= clip.duration + 1e-6; t += 1 / fps) { a.time = Math.min(t, clip.duration - 1e-4); mixer.update(0); model.updateMatrixWorld(true); P.push(feet.map(f => f.getWorldPosition(v).clone())); }
  a.stop(); mixer.update(0);
  const floor = Math.min(...P.flat().map(p => p.y)), out = [];
  for (let i = 1; i < P.length; i++) for (const s of [0, 1]) if (P[i][s].y < floor + 0.07 && P[i - 1][s].y < floor + 0.07) out.push((P[i - 1][s].z - P[i][s].z) * fps);
  out.sort((x, y) => x - y);
  return out.length ? out[out.length >> 1] : 0;
}

// Finger curl held whenever something is in the hand. Mocap from unarmed packs leaves the fingers splayed
// around the hilt; this pins them to the authored grip after the mixer has run.
export class Grip {
  constructor(model, clip) {
    this.r = []; this.l = [];
    for (const t of clip?.tracks || []) {
      const m = /^(mixamorig(Right|Left)Hand(Thumb|Index|Middle|Ring|Pinky)\d)\.quaternion$/.exec(t.name); if (!m) continue;
      const bone = model.getObjectByName(m[1]); if (!bone) continue;
      (m[2] === 'Right' ? this.r : this.l).push([bone, new THREE.Quaternion().fromArray(t.values, 0)]);
    }
  }
  apply(right, left) {
    if (right) for (const [b, q] of this.r) b.quaternion.copy(q);
    if (left) for (const [b, q] of this.l) b.quaternion.copy(q);
  }
}

// Two-bone reach for the off hand, so two-handed weapons are actually held with two hands.
const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), T = new THREE.Vector3();
const ac = new THREE.Vector3(), ab = new THREE.Vector3(), bc = new THREE.Vector3(), at = new THREE.Vector3(), ax0 = new THREE.Vector3(), ax1 = new THREE.Vector3();
const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), uW = new THREE.Quaternion(), fW = new THREE.Quaternion(), pW = new THREE.Quaternion();
const ang = (u, v) => Math.acos(THREE.MathUtils.clamp(u.dot(v), -1, 1));
export function reach(upper, fore, hand, target, w) {
  if (w <= 0.001) return;
  upper.getWorldPosition(A); fore.getWorldPosition(B); hand.getWorldPosition(C); T.copy(C).lerp(target, w);
  const lab = A.distanceTo(B), lcb = B.distanceTo(C), lat = THREE.MathUtils.clamp(A.distanceTo(T), 0.02, (lab + lcb) * 0.995);
  ac.copy(C).sub(A).normalize(); ab.copy(B).sub(A).normalize(); bc.copy(C).sub(B).normalize(); at.copy(T).sub(A).normalize();
  const a0 = ang(ac, ab), b0 = Math.PI - ang(ab, bc);
  const a1 = Math.acos(THREE.MathUtils.clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
  const b1 = Math.acos(THREE.MathUtils.clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));
  ax0.crossVectors(ac, ab); if (ax0.lengthSq() < 1e-8) ax0.set(0, 0, 1); ax0.normalize();
  ax1.crossVectors(ac, at); if (ax1.lengthSq() < 1e-8) ax1.copy(ax0); ax1.normalize();
  q0.setFromAxisAngle(ax0, a1 - a0); q1.setFromAxisAngle(ax0, b1 - b0); q2.setFromAxisAngle(ax1, ang(ac, at));
  upper.getWorldQuaternion(uW); fore.getWorldQuaternion(fW); upper.parent.getWorldQuaternion(pW);
  // forearm first (its local frame only sees the elbow bend), then swing the whole arm onto the target
  fore.quaternion.copy(uW).invert().multiply(q1).multiply(fW);
  upper.quaternion.copy(pW).invert().multiply(q2).multiply(q0).multiply(uW);
  upper.updateMatrixWorld(true);
}
