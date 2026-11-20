import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { initBases } from './items.js';

const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const gltfCache = new Map(), texCache = new Map();
export let GRIPS = {}, WEAPONS = {};

// --- phone safety -------------------------------------------------------------------------
// Phones (iPhone Safari especially) kill the page when it runs out of memory ("A problem
// repeatedly occurred"). Textures are the big cost, so every texture the game loads is capped
// here, whatever size the source file is. ?lowmem=1 / ?lowmem=0 force the mode for testing.
const q = new URLSearchParams(location.search).get('lowmem');
export const LOW_MEM = q != null ? q === '1' :
  /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || // iPadOS reports as a Mac
  (navigator.deviceMemory != null && navigator.deviceMemory <= 4);
export const TEX_MAX = LOW_MEM ? 1024 : 2048;
const fitted = new WeakSet();
export function fitTexture(t) {
  const img = t?.image;
  if (!img || fitted.has(t)) return;
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  if (!w || !h) return; // not decoded yet
  fitted.add(t);
  if (Math.max(w, h) <= TEX_MAX) return;
  const k = TEX_MAX / Math.max(w, h), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  img.close?.(); // free an ImageBitmap's memory right away
  t.image = c; t.needsUpdate = true;
  console.info(`[assets] texture ${w}x${h} reduced to ${c.width}x${c.height}`);
}
function fitMaterialTextures(root) {
  root.traverse(o => {
    for (const m of [].concat(o.material || [])) for (const v of Object.values(m)) if (v?.isTexture) fitTexture(v);
  });
}

export function loadGLTF(url) {
  if (!gltfCache.has(url)) gltfCache.set(url, new Promise((res, rej) => gltfLoader.load(url, g => { fitMaterialTextures(g.scene); res(g); }, undefined, rej)));
  return gltfCache.get(url);
}
export async function cloneGLTF(url) {
  const g = await loadGLTF(url);
  return { scene: SkeletonUtils.clone(g.scene), animations: g.animations };
}

// Stone/wood surfaces from the BM texture sets: *_c = colour, *_d = tangent normal (rgb) + height (a).
// One image per file: every repeat/tint variant is a clone sharing the same Source, so the GPU holds it once.
const baseTex = new Map();
function tiled(url, srgb, repX, repY) {
  let b = baseTex.get(url);
  if (!b) { b = { clones: [], ready: false }; b.tex = texLoader.load(url, t => { fitTexture(t); b.ready = true; for (const c of b.clones) c.needsUpdate = true; b.clones.length = 0; }); baseTex.set(url, b); }
  const t = b.tex.clone(); if (!b.ready) b.clones.push(t); else t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY); t.anisotropy = LOW_MEM ? 2 : 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Large-scale breakup so a tiling wall never reads as wallpaper: a slow world-space mottle in value and a little hue,
// darker toward the foot of walls (grime and occlusion where stone meets the floor).
function weather(m) {
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP;
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }`).replace('#include <map_fragment>', `#include <map_fragment>
{ vec2 q = vWP.xy + vWP.zz * 0.7; float n = vn(q * 0.09) * 0.6 + vn(q * 0.31) * 0.4; float m2 = vn(q * 0.9 + 7.0);
  diffuseColor.rgb *= mix(0.74, 1.1, n) * mix(0.9, 1.04, m2);
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.96, 0.98, 1.05), smoothstep(0.55, 0.9, n)); }`);
  };
  m.customProgramCacheKey = () => 'weather';
  return m;
}
export function surface(name, repX = 1, repY = 1, opts = {}) {
  const key = `${name}|${repX}|${repY}|${opts.tint || ''}|${opts.rough ?? ''}|${opts.dir || ''}|${opts.vc ? 1 : 0}`;
  if (texCache.has(key)) return texCache.get(key);
  const dir = opts.dir || 'assets/game/tex/';
  const m = new THREE.MeshStandardMaterial({ map: tiled(`${dir}${name}_c.webp`, true, repX, repY), normalMap: tiled(`${dir}${name}_d.webp`, false, repX, repY), roughness: opts.rough ?? 0.92, metalness: 0, color: opts.tint ?? 0xffffff, vertexColors: !!opts.vc });
  m.normalScale.set(1.2, 1.2);
  if (opts.weather !== false) weather(m);
  texCache.set(key, m);
  return m;
}

// A plain colour/mask texture by URL, cached, with the phone memory cap applied.
const plainCache = new Map();
export function texture(url) { if (!plainCache.has(url)) { const t = texLoader.load(url, fitTexture); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = LOW_MEM ? 2 : 4; plainCache.set(url, t); } return plainCache.get(url); }

export async function loadMeta() {
  const [g, w] = await Promise.all([fetch('assets/game/weapons/grips.json').then(r => r.json()), fetch('assets/game/weapons/weapons.json').then(r => r.json())]);
  GRIPS = g; WEAPONS = w;
  // the hand-made swords and greatswords: blade along +Y from the grip at the origin
  const sw = (await fetch('assets/game/items/swords.json').then(r => r.json())).swords;
  for (const [id, s] of Object.entries(sw)) { if (s.hands === 3 || !s.file || WEAPONS[id]) continue; WEAPONS[id] = { id, file: s.file, kind: s.hands === 2 ? 'great_sword' : 'sword' }; GRIPS[id] = { kind: WEAPONS[id].kind, grip: [0, 0, 0], dir: [0, 1, 0], len: s.frame?.y?.[1] || 1 }; }
  initBases(w, sw);
}

// A weapon model re-centred on its grip with the blade along +Y, ready to parent to a hand socket.
export async function weaponModel(modelId, scale = 1) {
  const W = WEAPONS[modelId] || WEAPONS.iron_sword, G = GRIPS[modelId] || GRIPS.iron_sword;
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
