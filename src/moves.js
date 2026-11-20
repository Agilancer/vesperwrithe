import * as THREE from 'three';
import { loadGLTF } from './assets.js';
import { STYLES } from './items.js';

// The hero's authored clips (tools/build_anims.py → assets/player/vesper_moves.glb + moves.json).
// Each attack clip starts and ends on the guard pose with an eased wind-up, a strike that travels in the
// side-view plane, a held follow-through and a blended recovery. A style is a chain of [clip, seconds]:
// pressing attack again after a clip's cancel frame flows into the next link. Styles not listed here (thrusts,
// smashes, fists) keep their entries in items.js; an Attack Viewer override of a listed style's clip switches its chain off.
const MOVESET = {
  slash1h: [['vw_slash1', 0.6], ['vw_slash2', 0.5], ['vw_slash3', 0.62]],
  slash2h: [['vw_great', 0.74]],
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
