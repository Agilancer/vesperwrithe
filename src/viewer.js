// Attack Viewer: preview every attack clip on the real hero rig with a real weapon in hand, pick the swing,
// trim its frames and save it as the attack for a weapon class. The game reads the saved choice on load.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadMeta, surface, LOW_MEM } from './assets.js';
import { Player } from './player.js';
import { glowTex } from './world.js';
import { BASES, makeItem } from './items.js';
import { FPS, KINDS, ATTACK_CLIPS, readAttackConfig, writeAttackConfig, attackFor, startWeapon, detectStrikes } from './attacks.js';

const $ = id => document.getElementById(id);
const YAW = Math.PI / 2 - 0.38; // the game's 3/4 facing-right yaw

// ------------------------------------------------------------------ scene
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW_MEM });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW_MEM ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e0b14); scene.fog = new THREE.Fog(0x0e0b14, 14, 40);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;
scene.add(new THREE.HemisphereLight(0x8a90c0, 0x201418, 0.9));
const key = new THREE.DirectionalLight(0xffe8d0, 2.2); key.position.set(3, 6, 6); key.castShadow = true; key.shadow.mapSize.setScalar(1024);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -1 }); scene.add(key);
const rimL = new THREE.DirectionalLight(0x9fb4ff, 1.6); rimL.position.set(-2, 4, -6); scene.add(rimL);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), surface('flags', 7, 3)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(30, 30, 0x3d3226, 0x241d18); grid.position.y = 0.002; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.target.set(0.8, 1.0, 0); controls.enableDamping = true;
let camMode = 'side';
function sideCam() { camera.position.set(0.8, 1.6, 5.2); camera.lookAt(0.8, 1.0, 0); controls.target.set(0.9, 1.0, 0); }
sideCam();

// spell preview: an orb gathers between the hands through the wind-up and flies off on the release frame
const orb = new THREE.Group(); scene.add(orb); orb.visible = false;
const orbCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffd0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
const orbHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff6a20, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
const orbLight = new THREE.PointLight(0xff7a30, 0, 5, 1.5); orb.add(orbHalo, orbCore, orbLight);
function spellFX(f) {
  const meta = ATTACK_CLIPS.find(c => c.name === S.clip);
  if (meta?.use !== 'spell') { orb.visible = false; return; }
  const hands = ['RightHand', 'LeftHand'].map(n => P.model.getObjectByName('mixamorig' + n).getWorldPosition(new THREE.Vector3()));
  const at = meta.hands === 'L' ? hands[1] : meta.hands === 'R' ? hands[0] : hands[0].clone().add(hands[1]).multiplyScalar(0.5);
  const fly = (f - S.hit[0]) / FPS;
  if (f < S.from || fly > 0.6) { orb.visible = false; return; }
  orb.visible = true;
  if (fly < 0) { const k = (f - S.from) / Math.max(1, S.hit[0] - S.from); orb.position.copy(at); orb.scale.setScalar(0.15 + 0.35 * k); orbLight.intensity = 4 * k; }
  else { orb.position.set(at.x + fly * 9, at.y, at.z); orb.scale.setScalar(0.5); orbLight.intensity = 6 * (1 - fly / 0.6); }
  orbCore.scale.setScalar(0.35); orbHalo.scale.setScalar(0.9 + Math.sin(performance.now() / 60) * 0.08);
}

const hitMat = new THREE.MeshBasicMaterial({ color: 0xe2394f, transparent: true, opacity: 0.22, depthWrite: false });
const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.05), hitMat); hitBox.visible = false; scene.add(hitBox);
const hitEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 0.05)), new THREE.LineBasicMaterial({ color: 0xff6070 })); hitBox.add(hitEdge);
let showHit = true;

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas.parentElement);

// ------------------------------------------------------------------ hero
const fakeGame = { scene, fx: { burst() {}, dust() {} }, ui: { dmg() {} } };
const P = new Player(fakeGame);

const S = { // viewer state
  kind: 'sword', weapon: null, clip: null, swings: [], from: 0, to: 0, hit: [0, 0], dur: 0.36, grip: 'normal', upperOnly: false, legs: null,
  frame: 0, playing: true, loopWin: true, speed: 1, action: null, cfg: readAttackConfig(),
};

const weaponsOf = kind => Object.entries(BASES).filter(([, b]) => b.slot === 'weapon' && b.kind === kind).map(([id]) => id);
const clipLen = () => Math.floor(P.clips[S.clip].dur * FPS);

async function setWeapon(id) {
  S.weapon = id;
  P.equip.weapon = id ? makeItem(id) : null;
  await P.attachVisual('weapon', S.grip);
  $('weapon').value = id || '';
}

// a point that sweeps with the attack: the blade tip, or the right fist when unarmed
const tipLocal = new THREE.Vector3();
function tipWorld() {
  const m = P.weaponMesh;
  if (m) { tipLocal.set(0, m.userData.len * 1.8 / m.scale.x, 0); return m.localToWorld(tipLocal.clone()); }
  return P.socketR.getWorldPosition(new THREE.Vector3());
}

const bone = n => P.model.getObjectByName('mixamorig' + n);
let LIMBS = null;
function strikeSample() {
  LIMBS ||= { chest: bone('Spine2'), L: bone('LeftHand'), RF: bone('RightToeBase'), LF: bone('LeftToeBase') };
  const v = o => o.getWorldPosition(new THREE.Vector3());
  return { chest: v(LIMBS.chest), fwd: new THREE.Vector3(Math.sin(YAW), 0, Math.cos(YAW)),
    limbs: { R: tipWorld(), L: v(LIMBS.L), RF: v(LIMBS.RF), LF: v(LIMBS.LF) } };
}
const fullWin = () => ({ name: 'Whole clip', from: 0, to: clipLen(), hit: [0, clipLen()], box: null });
function useStrike(s) {
  S.from = s.from; S.to = s.to; S.hit = [...s.hit]; S.box = s.box ? { ...s.box } : null; S.frame = S.from;
  S.dur = +Math.max(0.15, Math.min(1.2, (S.to - S.from) / FPS * 0.62)).toFixed(2);
  $('dur').value = S.dur; $('durText').textContent = S.dur.toFixed(2) + ' s';
}

function pose(frame) {
  S.action.time = Math.min(frame / FPS, P.clips[S.clip].dur - 1e-4);
  if (S.legs) S.legs.time = (performance.now() / 1000) % S.legs.getClip().duration;
  P.mixer.update(0); P.root.updateMatrixWorld(true); P.twoHandIK();
}

function selectClip(name, keepWindow) {
  S.clip = name;
  P.mixer.stopAllAction();
  S.action = P.mixer.clipAction(P.clips[name].game); S.action.reset().play(); S.action.timeScale = 0; S.legs = null;
  S.swings = detectStrikes(P.clips[name].dur, t => { pose(t * FPS); return strikeSample(); }, { weapon: !!P.weaponMesh });
  if (!keepWindow) {
    // default to the clip's main blow: the fastest strike of the weapon hand (any limb when unarmed)
    const pool = S.swings.filter(x => !P.weaponMesh || x.limb === 'R');
    const meta = ATTACK_CLIPS.find(c => c.name === name);
    const pushes = S.swings.filter(x => / jab| thrust/.test(x.name));
    // spells release on the last forward push; everything else on its fastest blow
    const s = (meta?.use === 'spell' && pushes.length ? pushes[pushes.length - 1] : null) ||
      (pool.length ? pool : S.swings).reduce((m, x) => (!m || x.peak > m.peak ? x : m), null) || fullWin();
    const keep = S.dur; useStrike(s); if (keep && S.swings.length === 0) S.dur = keep;
  }
  S.frame = S.from; applyUpper();
  renderClipList(); renderSwings(); renderTrack();
  const meta = ATTACK_CLIPS.find(c => c.name === name);
  $('clipName').textContent = pretty(name); $('clipNote').textContent = meta ? meta.note : '';
  $('scrub').max = clipLen();
  $('dur').value = S.dur; $('durText').textContent = S.dur.toFixed(2) + ' s';
}

// upper body only: the clip drives the arms and torso while the legs keep the idle stance, as the game plays it
function applyUpper() {
  P.mixer.stopAllAction(); const c = P.clips[S.clip];
  if (S.upperOnly) { const idle = P.clips[S.weapon ? 'sword_and_shield_idle' : 'axe_unarmed_idle']; S.action = c.up; S.legs = idle.lo; S.legs.reset().play(); S.legs.timeScale = 0; }
  else { S.action = P.mixer.clipAction(c.game); S.legs = null; }
  S.action.reset().play(); S.action.timeScale = 0; S.action.setEffectiveWeight(1);
  $('upperOnly').checked = S.upperOnly;
}

async function selectKind(kind) {
  S.kind = kind; $('kind').value = kind;
  const ids = weaponsOf(kind);
  const st = attackFor(ids[0] ? BASES[ids[0]] : null, S.cfg);
  S.grip = st.grip || 'normal'; $('grip').value = S.grip; S.upperOnly = !!st.upperOnly;
  fillWeapons();
  await setWeapon(kind === 'unarmed' ? null : (S.weapon && BASES[S.weapon]?.kind === kind ? S.weapon : ids[0]));
  S.from = st.from; S.to = st.to; S.hit = [...st.hit]; S.dur = st.dur; S.box = { reach: st.reach, height: st.height, yOff: st.yOff };
  selectClip(P.clips[st.anim] ? st.anim : ATTACK_CLIPS[0].name, true);
  renderKindNow();
}

// ------------------------------------------------------------------ UI
const pretty = n => n.replace(/_/g, ' ').replace(/\bver (\d)/, 'v$1');
function fillKinds() {
  $('kind').innerHTML = Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v.label}${S.cfg.kinds[k] ? ' ★' : ''}</option>`).join('');
  $('kind').value = S.kind;
}
function fillWeapons() {
  const mine = weaponsOf(S.kind), other = Object.keys(BASES).filter(id => BASES[id].slot === 'weapon' && !mine.includes(id));
  const opt = id => `<option value="${id}">${BASES[id].name}${startWeapon(S.cfg) === id ? ' (starting weapon)' : ''}</option>`;
  $('weapon').innerHTML = (S.kind === 'unarmed' ? '<option value="">Bare fists</option>' : '') + mine.map(opt).join('') +
    (other.length ? `<optgroup label="Other classes">${other.map(opt).join('')}</optgroup>` : '') + (S.kind !== 'unarmed' ? '<option value="">Bare fists</option>' : '');
  $('weapon').value = S.weapon || '';
}
function renderKindNow() {
  const st = attackFor(S.kind === 'unarmed' ? null : BASES[weaponsOf(S.kind)[0]], S.cfg);
  $('kindNow').textContent = `In game: ${pretty(st.anim)} · frames ${st.from}–${st.to} · ${S.cfg.kinds[S.kind] ? 'your choice' : 'default'}`;
}
function renderClipList() {
  const used = {}; for (const k of Object.keys(KINDS)) { const ids = weaponsOf(k); const a = attackFor(k === 'unarmed' ? null : BASES[ids[0]], S.cfg).anim; (used[a] ||= []).push(k); }
  let html = '', grp = '';
  for (const c of ATTACK_CLIPS) {
    if (!P.clips[c.name]) continue;
    if (c.group !== grp) { grp = c.group; html += `<div class="grp">${grp}</div>`; }
    const tags = (used[c.name] || []).map(k => `<span class="tag">${KINDS[k].label.split(' ')[0]}</span>`).join('');
    const role = { air: 'AIR', finisher: 'NEEDS A VICTIM', spell: 'SPELL' }[c.use];
    html += `<button class="clip${c.name === S.clip ? ' sel' : ''}" data-clip="${c.name}">${tags}<b>${pretty(c.name)}</b>${role ? `<i class="role role-${c.use}">${role}</i>` : ''}<small>${c.note} · ${P.clips[c.name].dur.toFixed(1)} s</small></button>`;
  }
  $('clips').innerHTML = html; $('count').textContent = ATTACK_CLIPS.filter(c => P.clips[c.name]).length;
  $('clips').querySelector('.sel')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function renderSwings() {
  const same = s => s.from === S.from && s.to === S.to;
  $('swings').innerHTML = (S.swings.length ? '' : '<span class="dim">No clear strike found — set the frames by hand.</span>') +
    S.swings.map((s, i) => `<button data-swing="${i}" class="${same(s) ? 'on' : ''}" title="hit frames ${s.hit[0]}–${s.hit[1]}">${i + 1}. ${s.name} <span class="dim">f${s.hit[0]}</span></button>`).join('') +
    `<button data-swing="all" class="${S.from === 0 && S.to === clipLen() ? 'on' : ''}">Whole clip</button>`;
}
function renderTrack() {
  const n = clipLen() || 1, pct = f => (f / n * 100) + '%';
  Object.assign($('win').style, { left: pct(S.from), width: pct(S.to - S.from) });
  Object.assign($('hitwin').style, { left: pct(S.hit[0]), width: pct(Math.max(0.5, S.hit[1] - S.hit[0])) });
  $('markText').textContent = `start ${S.from} · hit ${S.hit[0]}–${S.hit[1]} · end ${S.to}`;
}
function say(t) { $('msg').textContent = t; clearTimeout(say.t); say.t = setTimeout(() => $('msg').textContent = '', 4000); }

$('kind').onchange = e => selectKind(e.target.value);
$('weapon').onchange = async e => { await setWeapon(e.target.value || null); selectClip(S.clip, true); };
$('clips').onclick = e => { const b = e.target.closest('[data-clip]'); if (b) selectClip(b.dataset.clip); };
$('swings').onclick = e => {
  const b = e.target.closest('[data-swing]'); if (!b) return;
  useStrike(b.dataset.swing === 'all' ? fullWin() : S.swings[+b.dataset.swing]);
  renderSwings(); renderTrack();
};
$('play').onclick = () => { S.playing = !S.playing; $('play').textContent = S.playing ? '❚❚' : '▶'; };
$('scrub').oninput = e => { S.frame = +e.target.value; S.playing = false; $('play').textContent = '▶'; };
$('upperOnly').onchange = e => { S.upperOnly = e.target.checked; applyUpper(); };
$('loopWin').onchange = e => { S.loopWin = e.target.checked; };
$('speed').onchange = e => { S.speed = +e.target.value; };
$('dur').oninput = e => { S.dur = +e.target.value; $('durText').textContent = S.dur.toFixed(2) + ' s'; };
$('grip').onchange = async e => { S.grip = e.target.value; await P.attachVisual('weapon', S.grip); };
document.querySelector('.marks').onclick = e => {
  const m = e.target.closest('[data-mark]')?.dataset.mark; if (!m) return; const f = Math.round(S.frame);
  if (m === 'from') S.from = Math.min(f, S.to - 1); if (m === 'to') S.to = Math.max(f, S.from + 1);
  if (m === 'hit0') S.hit[0] = f; if (m === 'hit1') S.hit[1] = Math.max(f, S.hit[0]);
  S.hit = [Math.max(S.from, Math.min(S.hit[0], S.to)), Math.max(S.from, Math.min(S.hit[1], S.to))];
  renderSwings(); renderTrack();
};
$('use').onclick = () => {
  S.cfg.kinds[S.kind] = { anim: S.clip, from: S.from, to: S.to, hit: [...S.hit], dur: S.dur, grip: S.grip, upperOnly: S.upperOnly, ...(S.box || {}) };
  const ok = writeAttackConfig(S.cfg); fillKinds(); renderKindNow(); renderClipList();
  say(ok ? `Saved: ${KINDS[S.kind].label} now swings “${pretty(S.clip)}”. Reload the game to use it.` : 'Could not save (browser storage is blocked). Use “Copy config” instead.');
};
$('reset').onclick = () => { delete S.cfg.kinds[S.kind]; writeAttackConfig(S.cfg); fillKinds(); selectKind(S.kind); say(`${KINDS[S.kind].label} is back to the default attack.`); };
$('startBtn').onclick = () => {
  if (!S.weapon) { say('Pick a weapon first.'); return; }
  S.cfg.start = S.weapon; writeAttackConfig(S.cfg); fillWeapons();
  say(`${BASES[S.weapon].name} now waits on the causeway pedestal (new game).`);
};
$('copy').onclick = async () => {
  const txt = JSON.stringify(S.cfg, null, 1);
  try { await navigator.clipboard.writeText(txt); say('Config copied — paste it to Claude to make it the default.'); }
  catch { window.prompt('Copy this config:', txt); }
};
for (const [id, mode] of [['camSide', 'side'], ['camOrbit', 'orbit']]) $(id).onclick = () => {
  camMode = mode; controls.enabled = mode === 'orbit'; if (mode === 'side') sideCam();
  $('camSide').classList.toggle('on', mode === 'side'); $('camOrbit').classList.toggle('on', mode === 'orbit');
};
$('showHit').onclick = () => { showHit = !showHit; $('showHit').classList.toggle('on', showHit); };

// ------------------------------------------------------------------ loop
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.action) {
    if (S.playing) {
      // "Game" speed plays the window in the swing time, like the game does; the whole clip plays at its own pace
      const fps = S.loopWin ? (S.to - S.from) / Math.max(0.05, S.dur) : FPS;
      S.frame += dt * fps * S.speed;
      const lo = S.loopWin ? S.from : 0, hi = S.loopWin ? S.to : clipLen();
      if (S.frame > hi) { S.frame = lo; P.trail.end(); }
    }
    S.frame = Math.max(0, Math.min(S.frame, clipLen()));
    pose(S.frame);
    const f = S.frame, st = attackFor(S.weapon ? BASES[S.weapon] : null, S.cfg);
    if (f >= S.hit[0] - 3 && f <= S.hit[1] + 2 && S.playing) P.trail.push(P.weaponMesh, null);
    P.trail.update(dt); P.scarf.update(dt, 1, { x: 0, y: 0 });
    spellFX(f);
    const on = f >= S.hit[0] && f <= S.hit[1];
    hitBox.visible = showHit && on;
    const bx = S.box || st;
    if (on) { hitBox.scale.set(bx.reach, bx.height, 1); hitBox.position.set(0.15 + bx.reach / 2, bx.yOff, 0.3); }
    $('scrub').value = Math.round(f); $('frame').textContent = `${Math.round(f)} / ${clipLen()}`;
    $('play').textContent = S.playing ? '❚❚' : '▶';
  }
  if (camMode === 'orbit') controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

(async () => {
  try {
    await loadMeta(); await P.load(); P.refreshStats();
    P.model.rotation.set(0, YAW, 0); P.rim.intensity = 4; P.fill.intensity = 4;
    resize(); fillKinds();
    const want = new URLSearchParams(location.search);
    await selectKind(KINDS[want.get('kind')] ? want.get('kind') : 'sword');
    if (want.get('clip') && P.clips[want.get('clip')]) selectClip(want.get('clip'));
    $('loading').remove(); window.VIEWER_READY = true;
    requestAnimationFrame(tick);
  } catch (e) { console.error(e); $('loading').textContent = 'Failed to load: ' + e.message; }
})();
window.viewer = { S, P, selectClip, selectKind, pose, setWeapon }; window.camera = camera;
