import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const gltfCache = new Map(), texCache = new Map();
export let GRIPS = {}, WEAPONS = {};

export function loadGLTF(url) {
  if (!gltfCache.has(url)) gltfCache.set(url, new Promise((res, rej) => gltfLoader.load(url, res, undefined, rej)));
  return gltfCache.get(url);
}
export async function cloneGLTF(url) {
  const g = await loadGLTF(url);
  return { scene: SkeletonUtils.clone(g.scene), animations: g.animations };
}

// Stone/wood surfaces from the BM texture sets: *_c = colour, *_d = tangent normal (rgb) + height (a).
export function surface(name, repX = 1, repY = 1, opts = {}) {
  const key = `${name}|${repX}|${repY}|${opts.tint || ''}|${opts.rough ?? ''}`;
  if (texCache.has(key)) return texCache.get(key);
  const dir = opts.dir || 'assets/game/tex/';
  const mk = (suffix, srgb) => {
    const t = texLoader.load(`${dir}${name}_${suffix}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY); t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const m = new THREE.MeshStandardMaterial({ map: mk('c', true), normalMap: mk('d', false), roughness: opts.rough ?? 0.92, metalness: 0, color: opts.tint ?? 0xffffff });
  m.normalScale.set(1.2, 1.2);
  texCache.set(key, m);
  return m;
}

export async function loadMeta() {
  const [g, w] = await Promise.all([fetch('assets/game/weapons/grips.json').then(r => r.json()), fetch('assets/game/weapons/weapons.json').then(r => r.json())]);
  GRIPS = g; WEAPONS = w;
}

// A weapon model re-centred on its grip with the blade along +Y, ready to parent to a hand socket.
export async function weaponModel(modelId, scale = 1) {
  const W = WEAPONS[modelId], G = GRIPS[modelId];
  const g = await loadGLTF(W.file);
  const inner = g.scene.clone(true);
  inner.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); } });
  const holder = new THREE.Group();
  const pivot = new THREE.Group();
  if (G.grip) {
    inner.position.set(-G.grip[0], -G.grip[1], -G.grip[2]);
    // rotate so that G.dir becomes +Y
    const from = new THREE.Vector3(...G.dir);
    pivot.quaternion.setFromUnitVectors(from, new THREE.Vector3(0, 1, 0));
  } else {
    inner.position.set(-G.center[0], -G.center[1], -G.center[2]);
  }
  pivot.add(inner); holder.add(pivot); holder.scale.setScalar(scale);
  holder.userData = { modelId, len: (G.len || 0.8) * scale, grip: G };
  return holder;
}

// --- audio ---------------------------------------------------------------------------------
const AC = window.AudioContext ? new AudioContext() : null;
const bufs = new Map();
export const audio = {
  master: AC ? AC.createGain() : null,
  musicEl: null,
  init() { if (!AC) return; this.master.gain.value = 0.7; this.master.connect(AC.destination); },
  resume() { AC?.resume(); },
  async load(name) {
    if (!AC) return null;
    if (!bufs.has(name)) bufs.set(name, fetch(`assets/game/audio/${name}.mp3`).then(r => r.arrayBuffer()).then(b => AC.decodeAudioData(b)).catch(() => null));
    return bufs.get(name);
  },
  async play(name, vol = 0.6, rate = 1) {
    const b = await this.load(name); if (!b) return;
    const s = AC.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    const g = AC.createGain(); g.gain.value = vol; s.connect(g).connect(this.master); s.start();
  },
  music(file, vol = 0.35) {
    if (this.musicEl?.dataset.f === file) return;
    const old = this.musicEl;
    if (old) { const fade = setInterval(() => { old.volume = Math.max(0, old.volume - 0.03); if (old.volume <= 0) { old.pause(); clearInterval(fade); } }, 50); }
    const el = new Audio(`assets/game/music/${file}.mp3`); el.loop = true; el.volume = 0; el.dataset.f = file; el.play().catch(() => {});
    const up = setInterval(() => { el.volume = Math.min(vol, el.volume + 0.02); if (el.volume >= vol) clearInterval(up); }, 60);
    this.musicEl = el;
  },
};
audio.init();
