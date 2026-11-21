import * as THREE from 'three';
import { loadGLTF } from './assets.js';
import { STYLES } from './items.js';

// The hero's authored clips (tools/build_anims.py → assets/player/vesper_moves.glb + moves.json).
// Each attack clip starts and ends on the guard pose with an eased wind-up, a strike that travels in the
// side-view plane, a held follow-through and a blended recovery. A style is a chain of [clip, seconds]:
// pressing attack again after a clip's cancel frame flows into the next link. Styles not listed here (thrusts,
// smashes, fists) keep their entries in items.js; an Attack Viewer override of a listed style's clip switches its chain off.
const MOVESET = {
  slash1h: [['vw_slash1', 0.56], ['vw_slash2', 0.5], ['vw_slash3', 0.62]],
  slash2h: [['vw_great', 0.835]],
  // a link may carry its own fields: the staff's second link is the cast, which looses a bolt at frame 14 instead of cutting
  whirl: [['vw_whirl', 0.58], ['vw_cast', 0.62, { ranged: 'staff', shotAt: 14, both: false, hits: null, boxes: null }]], // (the cast must not inherit the whirl's two windows)
  reap: [['vw_reap', 0.72]],
  flurry: [['vw_flurry', 0.5]],
  needle: [['vw_flurry', 0.44]],
  // hand-keyed (build_anims.py weapon_clips): each class swings its own way instead of borrowing a mocap chop or a boxing jab
  chop: [['vw_chop', 0.5]],
  smash: [['vw_smash', 0.58]],
  smash2h: [['vw_maul', 0.9]],
  // spears/lances: a full-body drawn-back drive; `thrust` levels the point through the hit and draws the needle streak
  thrust: [['vw_thrust', 0.46, { thrust: true, upperOnly: false, lunge: 4.2 }]],
  lance: [['vw_lance', 0.62, { thrust: true, upperOnly: false, lunge: 5.2 }]],
  // ranged: full-body when planted (the keyed arm needs the clip's own hips), upper body only on the move; no step-in
  shoot: [['vw_shoot', 0.46, { upperOnly: false, lunge: 0.001, freeHand: true }]],
  hurl: [['vw_hurl', 0.4, { upperOnly: false, lunge: 0.6 }]],
};

export async function loadMoves() {
  const [g, meta] = await Promise.all([loadGLTF('assets/player/vesper_moves.glb'), fetch('assets/player/moves.json').then(r => r.json())]);
  for (const [style, chain] of Object.entries(MOVESET)) {
    const st = STYLES[style]; if (!st) continue;
    st.chain = chain.filter(([clip]) => meta.clips[clip]).map(([clip, dur, extra]) => {
      // moves.json counts the written frames from 0 (the guard); Blender keys frame i at i + 1, which the glTF exporter
      // puts at t = (i + 1) / 30. So written frame i is clip frame i + 1: start on frame 1 (the guard) and shift every window by one.
      const m = meta.clips[clip], o = 1;
      return { anim: clip, dur, from: o, to: m.frames, hit: [m.hit[0] + o, m.hit[1] + o], cancel: m.cancel + o, ...(m.hits ? { hits: m.hits.map(([a, b]) => [a + o, b + o]) } : {}), ...extra };
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
