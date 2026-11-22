import * as THREE from 'three';
import { loadGLTF } from './assets.js';
import { STYLES } from './items.js';
import { SWINGS } from './swing.js';

// The hero's authored body clips (tools/build_anims.py → assets/player/vesper_moves.glb + moves.json): guard stance, stride-matched
// run, jump. Weapon swings are not clips any more: src/swing.js poses one swing per weapon class onto the arm each frame.
export async function loadMoves() {
  const [g, meta] = await Promise.all([loadGLTF('assets/player/vesper_moves.glb'), fetch('assets/player/moves.json').then(r => r.json())]);
  // The swings themselves are posed in src/swing.js (one per weapon class). The style table only keeps what the pack's numbers
  // need: how long a swing takes before the next can start, and its reach.
  const KIND = { slash1h: 'sword', slash2h: 'great_sword', chop: 'axe', smash: 'mace', smash2h: 'great_mace', thrust: 'spear', lance: 'lance', flurry: 'dagger', needle: 'rapier', whirl: 'staff', reap: 'scythe', shoot: 'bow', hurl: 'boomerang', punch: 'unarmed', stab: 'dagger' };
  for (const [style, kind] of Object.entries(KIND)) { const st = STYLES[style], S = SWINGS[kind]; if (!st || !S) continue;
    for (const k of ['hits', 'hitMul', 'boxes', 'chain', 'cancel', 'lunge', 'thrust', 'upperOnly']) delete st[k];
    Object.assign(st, { dur: S.dur * S.cancel, reach: S.reach, height: S.height, yOff: S.yOff });
    if (kind === 'staff') { const d = S.dur * S.cancel / 2; st.chain = [{ anim: st.anim, dur: d, from: 0, to: 10, cancel: 10 }, { ranged: 'staff', dur: d, from: 0, to: 10, cancel: 11 }]; } }
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
