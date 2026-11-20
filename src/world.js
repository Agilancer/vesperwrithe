import * as THREE from 'three';
import { ROOMS, SW, SH, FLOOR, bounds, rowFloorY } from './rooms.js';
import { surface, cloneGLTF } from './assets.js';

const I = 'assets/game/interior/';
const THEMES = {
  outdoor: { back: null, floor: ['road_sett'], wall: ['ashlar'], fog: [0x1a2238, 18, 110], amb: 0.55, moon: 1.6 },
  hall:    { back: ['wall_ashlar', I], floor: ['flags'], wall: ['ashlar'], fog: [0x0b0810, 16, 48], amb: 0.32, moon: 0.45, pillars: true },
  shaft:   { back: ['block'], floor: ['flags'], wall: ['ashlar'], fog: [0x080a10, 16, 50], amb: 0.32, moon: 0.4 },
  shrine:  { back: ['marble', I, 0xc89a9a], floor: ['floor_diamond', I], wall: ['ashlar'], fog: [0x12060a, 12, 40], amb: 0.4, moon: 0.3 },
  gallery: { back: ['panel', I], floor: ['boards', I], wall: ['ashlar'], fog: [0x0c0a12, 16, 50], amb: 0.34, moon: 0.6, pillars: true, carpet: true },
  crypt:   { back: ['cata_wall', I], floor: ['cata_floor', I], wall: ['cata_wall2', I], fog: [0x05070a, 10, 36], amb: 0.26, moon: 0.2 },
  chapel:  { back: ['wall_rough', I], floor: ['flags'], wall: ['ashlar'], fog: [0x0e0a14, 18, 60], amb: 0.3, moon: 0.8, pillars: true },
  throne:  { back: ['wall_ashlar', I, 0xb0a0c0], floor: ['marble', I, 0x6a6070], wall: ['ashlar'], fog: [0x0a0610, 18, 60], amb: 0.3, moon: 0.6, pillars: true, carpet: true },
};
export const ZB = -3.4, ZF = 2.6; // back wall depth, front lip of floors

function mat(spec, w, h) {
  if (!spec) return null;
  const [name, dir = 'assets/game/tex/', tint] = spec;
  const rx = Math.max(0.5, Math.round(w / 4 * 2) / 2), ry = Math.max(0.5, Math.round(h / 4 * 2) / 2);
  return surface(name, rx, ry, { dir, tint });
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const TRIM = new THREE.MeshStandardMaterial({ color: 0x9a8c70, emissive: 0x5a4628, emissiveIntensity: 0.45, roughness: 0.7 });
function box(m, x0, y0, x1, y1, z0 = ZB, z1 = ZF) {
  const mesh = new THREE.Mesh(boxGeo, m);
  mesh.scale.set(x1 - x0, y1 - y0, z1 - z0); mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// Subtract [a,b] gaps from span [s,e].
function spans(s, e, gaps) {
  let out = [[s, e]];
  for (const [a, b] of gaps) out = out.flatMap(([p, q]) => (b <= p || a >= q) ? [[p, q]] : [[p, a], [b, q]].filter(([u, v]) => v - u > 0.01));
  return out;
}

export class World {
  constructor(scene) {
    this.scene = scene; this.rooms = []; this.solids = []; this.flames = []; this.anim = [];
  }

  async build() {
    for (const def of ROOMS) this.rooms.push(await this.buildRoom(def));
  }

  roomAt(x, y) { return this.rooms.find(r => x >= r.b.x0 && x < r.b.x1 && y >= r.b.y0 && y < r.b.y1); }

  async buildRoom(def) {
    const T = THEMES[def.theme], b = bounds(def), g = new THREE.Group(); g.visible = false; g.name = def.id;
    const room = { def, b, group: g, solids: [], lights: [], theme: T, props: [] };
    const W = b.x1 - b.x0, H = b.y1 - b.y0;
    const add = (o) => { g.add(o); return o; };
    const solid = (x0, y0, x1, y1, extra = {}) => { const s = { x0, y0, x1, y1, room: def.id, ...extra }; room.solids.push(s); this.solids.push(s); return s; };

    const sideGaps = side => def.doors.filter(d => d.side === side).map(d => [rowFloorY(d.row) + FLOOR, rowFloorY(d.row) + FLOOR + 3.8]);
    const vertGaps = side => def.doors.filter(d => d.side === side).map(d => [d.col * SW + SW / 2 - 1.6, d.col * SW + SW / 2 + 1.6]);

    const wallM = mat(T.wall, 1, H), floorM = mat(T.floor, W, 4);
    // floor & ceiling (with vertical door holes)
    for (const [p, q] of spans(b.x0, b.x1, vertGaps('S'))) { add(box(floorM, p, b.y0 - 1.5, q, b.y0 + FLOOR)); solid(p, b.y0 - 1.5, q, b.y0 + FLOOR); }
    if (def.theme !== 'outdoor') for (const [p, q] of spans(b.x0, b.x1, vertGaps('N'))) { add(box(wallM, p, b.y1 - FLOOR, q, b.y1 + 1.5)); solid(p, b.y1 - FLOOR, q, b.y1 + 1.5); }
    // side walls with door gaps; outdoor causeway: invisible wall at the broken west end
    for (const side of ['W', 'E']) {
      const x0 = side === 'W' ? b.x0 - 0.6 : b.x1 - 0.5, x1 = side === 'W' ? b.x0 + 0.5 : b.x1 + 0.6;
      for (const [p, q] of spans(b.y0, b.y1 + 1.5, sideGaps(side))) {
        if (def.theme !== 'outdoor') add(box(wallM, x0, p, x1, q, ZB, 1.2));
        solid(x0, p, x1, q);
      }
      for (const d of def.doors.filter(d => d.side === side)) { // ledge for doors above the bottom row
        const fy = rowFloorY(d.row);
        if (fy > b.y0 + 1) { const lx0 = side === 'W' ? b.x0 : b.x1 - 3, lx1 = lx0 + 3; add(box(floorM, lx0, fy - 0.6, lx1, fy + FLOOR, -2.2, 1.6)); solid(lx0, fy - 0.6, lx1, fy + FLOOR); }
        if (def.theme !== 'outdoor') this.doorFrame(g, side === 'W' ? b.x0 : b.x1, fy + FLOOR, wallM);
      }
    }
    // back wall
    if (T.back) { const bm = mat(T.back, W, H); const p = new THREE.Mesh(new THREE.PlaneGeometry(W, H + 3), bm); p.position.set(b.x0 + W / 2, b.y0 + H / 2, ZB); p.receiveShadow = true; add(p); }
    if (T.carpet) { const c = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.2), surface('carpet', W / 3, 1, { dir: I })); c.rotation.x = -Math.PI / 2; c.position.set(b.x0 + W / 2, b.y0 + FLOOR + 0.01, -0.4); c.receiveShadow = true; add(c); }
    if (T.pillars) for (let x = b.x0 + 3.3; x < b.x1 - 1; x += 6.667) { add(this.pillar(x, b.y0 + FLOOR, H - FLOOR * 2)); }
    if (def.theme === 'outdoor') this.outdoor(g, b);

    // platforms
    for (const p of def.platforms || []) {
      const x0 = b.x0 + p.x, y = b.y0 + p.y;
      add(box(mat(['ashlar'], p.w, 1), x0, y - 0.45, x0 + p.w, y, -1.7, 1.7));
      add(box(TRIM, x0, y - 0.07, x0 + p.w, y + 0.015, 1.64, 1.78)); // lit lip so jumpable ledges read instantly
      add(box(mat(['wood'], p.w, 1), x0 + 0.2, y - 0.75, x0 + 0.5, y - 0.45, -1.2, -0.9)); // corbels
      add(box(mat(['wood'], p.w, 1), x0 + p.w - 0.5, y - 0.75, x0 + p.w - 0.2, y - 0.45, -1.2, -0.9));
      solid(x0, y - 0.45, x0 + p.w, y, { oneway: true });
    }
    // thorns (fire gate)
    for (const t of def.thorns || []) {
      const x = b.x0 + t.x, tg = new THREE.Group(), tm = new THREE.MeshStandardMaterial({ color: 0x1b2a14, roughness: 0.8, emissive: 0x050a02 });
      for (let i = 0; i < 70; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.06 + Math.random() * 0.08, 0.6 + Math.random() * 1.4, 5), tm);
        c.position.set(x + (Math.random() - 0.5) * 1.6, b.y0 + FLOOR + Math.random() * 4, (Math.random() - 0.5) * 3);
        c.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); c.castShadow = true; tg.add(c);
      }
      for (let i = 0; i < 8; i++) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.8 + Math.random() * 0.6, 0.07, 5, 18, 4), tm); v.position.set(x + (Math.random() - 0.5), b.y0 + 1 + Math.random() * 3, (Math.random() - 0.5) * 2); v.rotation.set(Math.random() * 3, Math.random() * 3, 0); tg.add(v); }
      add(tg);
      const s = solid(x - 0.8, b.y0 + FLOOR, x + 0.8, b.y0 + FLOOR + 4.3, { thorn: true, mesh: tg });
      room.thorns = (room.thorns || []).concat(s);
    }
    // props
    for (const p of def.props || []) await this.prop(room, p);
    // SotN-style breakable candle stands in the play plane
    room.breakables = [];
    for (const bk of def.breakables || []) {
      const x = b.x0 + bk.x, y = b.y0 + (bk.y ?? FLOOR), grp = new THREE.Group(); grp.position.set(x, y, 0.2);
      const iron = new THREE.MeshStandardMaterial({ color: 0x3a3026, metalness: 0.8, roughness: 0.4 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 1.1, 6), iron); stem.position.y = 0.55;
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.08, 0.08, 8), iron); dish.position.y = 1.12;
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 8), new THREE.MeshStandardMaterial({ color: 0xeae0c8, roughness: 0.5 })); wax.position.y = 1.29;
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: 0xffb050, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); fl.scale.set(0.2, 0.34, 1); fl.position.y = 1.55;
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff9040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 })); gl.scale.setScalar(1.1); gl.position.y = 1.5;
      grp.add(stem, dish, wax, fl, gl); g.add(grp); room.breakables.push({ x, y, grp, broken: false });
    }
    if (def.save) this.saveStatue(room, b.x0 + def.save.x, b.y0 + FLOOR);
    if (def.warp) this.warpMirror(room, b.x0 + def.warp.x, b.y0 + FLOOR);
    this.scene.add(g);
    return room;
  }

  doorFrame(g, x, y, m) {
    const a = box(m, x - 0.7, y + 3.8, x + 0.7, y + 4.6, ZB, 1.4); g.add(a);
    for (const dz of [-2.6, 1.0]) g.add(box(m, x - 0.75, y - 0.1, x + 0.75, y + 3.8, dz, dz + 0.35));
  }

  pillar(x, y, h) {
    const grp = new THREE.Group();
    const m = surface('ashlar', 1, h / 3);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, h, 12), m); shaft.position.set(x, y + h / 2, ZB + 0.7); shaft.castShadow = shaft.receiveShadow = true;
    const base = box(m, x - 0.65, y, x + 0.65, y + 0.5, ZB + 0.05, ZB + 1.35);
    const cap = box(m, x - 0.7, y + h - 0.6, x + 0.7, y + h, ZB + 0.05, ZB + 1.4);
    grp.add(shaft, base, cap);
    // arch between pillars (thin ribs on the back wall)
    const rib = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.16, 6, 24, Math.PI), m); rib.position.set(x + 3.33, y + h - 3.9, ZB + 0.25); grp.add(rib);
    return grp;
  }

  outdoor(g, b) {
    // moon, sky dome, distant castle, mountains, causeway rails & arches under the road
    const moon = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshBasicMaterial({ color: 0xf3ead2, fog: false }));
    moon.position.set(b.x0 + 18, b.y0 + 26, -150); g.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0x8a9ad0, transparent: true, opacity: 0.5, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(46, 46, 1); halo.position.copy(moon.position); halo.position.z -= 2; g.add(halo);
    const sil = new THREE.MeshBasicMaterial({ color: 0x0a0c16, fog: false });
    const far = new THREE.Group();
    const castle = [[30, 22, 6], [38, 34, 5], [45, 26, 7], [52, 42, 4], [58, 30, 6], [66, 24, 8], [74, 36, 4], [82, 20, 9], [92, 28, 5]];
    for (const [x, h, w] of castle) { far.add(box(sil, b.x0 + x - w / 2, b.y0 - 10, b.x0 + x + w / 2, b.y0 + h, -100, -96)); const cone = new THREE.Mesh(new THREE.ConeGeometry(w * 0.62, w * 1.5, 4), sil); cone.position.set(b.x0 + x, b.y0 + h + w * 0.75, -98); far.add(cone); }
    for (let i = 0; i < 26; i++) { const lw = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshBasicMaterial({ color: 0xffb860, fog: false })); const c = castle[i % castle.length]; lw.position.set(b.x0 + c[0] + (Math.random() - 0.5) * c[2] * 0.7, b.y0 + Math.random() * c[1], -95.5); far.add(lw); }
    g.add(far);
    const mtn = new THREE.MeshBasicMaterial({ color: 0x141a2c, fog: false });
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(18 + Math.random() * 14, 26 + Math.random() * 20, 5), mtn); m.position.set(b.x0 - 20 + i * 14, b.y0 + 2, -130); g.add(m); }
    // fog band below the bridge
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(b.x1 - b.x0 + 120, 14), new THREE.MeshBasicMaterial({ color: 0x5a6a8c, transparent: true, opacity: 0.18, depthWrite: false }));
    mist.position.set((b.x0 + b.x1) / 2, b.y0 - 6, -30); g.add(mist);
    // rails & arches
    const rm = surface('ashlar', 8, 0.5);
    g.add(box(rm, b.x0, b.y0 + FLOOR, b.x1, b.y0 + FLOOR + 1.0, -2.0, -1.6));
    for (let x = b.x0 + 2; x < b.x1; x += 4) g.add(box(rm, x - 0.25, b.y0 + FLOOR, x + 0.25, b.y0 + FLOOR + 1.3, -2.1, -1.5));
    for (let x = b.x0 + 6; x < b.x1; x += 12) { const a = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.9, 6, 16, Math.PI), rm); a.position.set(x, b.y0 - 6, -0.4); a.scale.z = 3.2; g.add(a); g.add(box(rm, x - 5.5, b.y0 - 30, x - 3.7, b.y0 - 6, -2.4, 1.6)); }
    // broken end of the bridge at the west
    for (let i = 0; i < 10; i++) g.add(box(rm, b.x0 - 1.4 + Math.random() * 0.8, b.y0 - Math.random() * 1.5, b.x0 + Math.random() * 0.5, b.y0 + FLOOR + Math.random() * 0.4, -2 + Math.random() * 3, -1.5 + Math.random() * 4));
  }

  torch(room, x, y) {
    const g = room.group;
    const m = new THREE.MeshStandardMaterial({ color: 0x2a2420, metalness: 0.6, roughness: 0.5 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.07, 0.3, 8), m); cup.position.set(x, y, ZB + 0.45);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), m); arm.rotation.x = Math.PI / 2; arm.position.set(x, y - 0.12, ZB + 0.2);
    g.add(cup, arm);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    fl.position.set(x, y + 0.32, ZB + 0.45); fl.scale.set(0.5, 0.8, 1); g.add(fl);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff7a2a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.45 }));
    glow.position.copy(fl.position); glow.scale.set(3, 3, 1); g.add(glow);
    const L = new THREE.PointLight(0xff9a50, 14, 13, 1.6); L.position.set(x, y + 0.4, ZB + 1.3); g.add(L);
    room.lights.push(L); this.flames.push({ fl, L, glow, base: 14, ph: Math.random() * 10 });
  }

  async prop(room, p) {
    const b = room.b; let x = b.x0 + p.x; const y = b.y0 + (p.y ?? 0) + FLOOR, g = room.group;
    switch (p.t) {
      case 'torch': this.torch(room, x, p.y !== undefined ? b.y0 + p.y : b.y0 + 3.1); break;
      case 'lamp': {
        const m = new THREE.MeshStandardMaterial({ color: 0x1c1a18, metalness: 0.7, roughness: 0.45 });
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 8), m); post.position.set(x, y + 1.6, -1.8); g.add(post);
        const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.45, 6, 1, true), m); cage.position.set(x, y + 3.4, -1.8); g.add(cage);
        const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); fl.position.set(x, y + 3.4, -1.8); fl.scale.set(1.6, 1.6, 1); g.add(fl);
        const L = new THREE.PointLight(0xffb060, 10, 11, 1.6); L.position.set(x, y + 3.3, -1.2); g.add(L); room.lights.push(L); this.flames.push({ fl, L, base: 10, ph: Math.random() * 9 });
        break;
      }
      case 'banner': {
        const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.6, 1, 6), surface('cloth_red', 1, 1, { dir: I }));
        ban.position.set(x, b.y0 + 4.8, ZB + 0.08); g.add(ban);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x7a5a2a, metalness: 0.8, roughness: 0.4 })); rod.rotation.z = Math.PI / 2; rod.position.set(x, b.y0 + 6.62, ZB + 0.12); g.add(rod);
        this.anim.push(t => { const pos = ban.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const yy = pos.getY(i); pos.setZ(i, Math.sin(t * 1.3 + yy * 1.4 + x) * 0.05 * (1.8 - yy) / 3.6); } pos.needsUpdate = true; });
        break;
      }
      case 'window': {
        if (room.theme.pillars) { const k = Math.round((p.x - 6.63) / 6.667); const sx = room.b.x0 + 6.63 + k * 6.667; if (Math.abs(sx - x) < 3.4) { p = { ...p, x: sx - room.b.x0 }; } }
        x = room.b.x0 + p.x;
        const big = p.big, w = big ? 3.6 : 2.0, h = big ? 7.5 : 4.0, cy = b.y0 + (big ? 9.5 : 4.6);
        const shape = new THREE.Shape(); shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2 - w / 2); shape.absarc(0, h / 2 - w / 2, w / 2, 0, Math.PI, false); shape.lineTo(-w / 2, -h / 2);
        const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), new THREE.MeshBasicMaterial({ map: glassTex(), fog: false }));
        { const uv = glass.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5); }
        glass.position.set(x, cy, ZB + 0.02); g.add(glass);
        const bars = new THREE.MeshStandardMaterial({ color: 0x15121a, roughness: 0.7 });
        g.add(box(bars, x - 0.05, cy - h / 2, x + 0.05, cy + h / 2 - 0.2, ZB, ZB + 0.12)); g.add(box(bars, x - w / 2, cy - 0.05, x + w / 2, cy + 0.05, ZB, ZB + 0.12));
        const frame = new THREE.Mesh(new THREE.TorusGeometry(w / 2, 0.16, 6, 20, Math.PI), surface('ashlar', 1, 1)); frame.position.set(x, cy + h / 2 - w / 2, ZB + 0.1); g.add(frame);
        // god-ray shaft
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, 13), new THREE.MeshBasicMaterial({ map: rayTex(), color: 0x7b90d0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        ray.position.set(x + 2.4, cy - 4.5, ZB + 1.6); ray.rotation.z = 0.45; ray.rotation.y = 0.25; g.add(ray);
        const L = new THREE.SpotLight(0x8aa0ff, 26, 26, 0.5, 0.6, 1.2); L.position.set(x, cy, ZB + 0.6); L.target.position.set(x + 4, b.y0, 1); g.add(L, L.target); room.lights.push(L);
        break;
      }
      case 'statue': {
        const k = await cloneGLTF('assets/game/knights/knight.glb');
        const stone = surface('limestone_1', 1, 1, { tint: 0x9a9690 });
        k.scene.traverse(o => { if (o.isMesh) { o.material = stone; o.castShadow = true; } });
        fitHeight(k.scene, 2.6); k.scene.position.set(x, y + 0.9, ZB + 1.2); g.add(k.scene);
        g.add(box(surface('ashlar', 1, 1), x - 0.8, y, x + 0.8, y + 0.9, ZB + 0.3, ZB + 2.0));
        break;
      }
      case 'candles': {
        const cm = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.6 });
        for (let i = 0; i < 7; i++) { const h = 0.2 + Math.random() * 0.5; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 6), cm); const cx = x + (Math.random() - 0.5) * 1.2, cz = -2.2 + Math.random(); c.position.set(cx, y + h / 2, cz); g.add(c); const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: 0xffb050, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); f.scale.set(0.12, 0.2, 1); f.position.set(cx, y + h + 0.08, cz); g.add(f); }
        const L = new THREE.PointLight(0xffa860, 6, 7, 1.7); L.position.set(x, y + 0.9, -1.4); g.add(L); room.lights.push(L); this.flames.push({ L, base: 6, ph: Math.random() * 9 });
        break;
      }
      case 'chain': {
        const cm = new THREE.MeshStandardMaterial({ color: 0x302a26, metalness: 0.8, roughness: 0.4 });
        for (let yy = b.y0 + 3; yy < b.y1; yy += 0.32) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 8), cm); l.position.set(x, yy, ZB + 1.2); l.rotation.y = (yy * 3) % 2 > 1 ? Math.PI / 2 : 0; g.add(l); }
        break;
      }
      case 'pews': {
        const wm = surface('wood', 1, 1);
        for (let i = 0; i < 3; i++) { const px = x + i * 2.2 - 2.2; g.add(box(wm, px - 0.9, y, px + 0.9, y + 0.5, -2.8, -2.3)); g.add(box(wm, px - 0.9, y + 0.5, px + 0.9, y + 1.2, -2.85, -2.75)); }
        break;
      }
      case 'throne': {
        const m = surface('marble', 1, 1, { dir: I, tint: 0x6a5a7a });
        g.add(box(m, x - 3, y, x + 3, y + 0.6, ZB + 0.1, ZB + 3)); g.add(box(m, x - 1, y + 0.6, x + 1, y + 1.4, ZB + 0.5, ZB + 2)); g.add(box(m, x - 1, y + 1.4, x + 1, y + 5, ZB + 0.3, ZB + 0.7));
        break;
      }
      case 'gatearch': {
        const m = surface('ashlar', 2, 4);
        g.add(box(m, x - 4, y, x - 2.2, y + 11, -3.2, 0.2)); g.add(box(m, x + 0.1, y, x + 2.2, y + 11, -3.2, 0.2)); g.add(box(m, x - 4, y + 5.2, x + 2.2, y + 7, -3.2, 0.2));
        for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.4, 4), m); c.position.set(x - 3.1 + (i % 2) * 4.2, y + 12.2 + (i > 1 ? 3 : 0), -1.5); if (i > 1) c.scale.setScalar(0.5); g.add(c); }
        this.torch(room, x - 2.6, y + 3.0);
        break;
      }
      case 'portcullis': {
        const m = new THREE.MeshStandardMaterial({ color: 0x2a2522, metalness: 0.7, roughness: 0.5 });
        for (let i = 0; i < 6; i++) g.add(box(m, x + 0.15 * i - 0.4, y + 3.9, x + 0.15 * i - 0.35, y + 6.5, -2.6 + i * 0.7, -2.5 + i * 0.7));
        break;
      }
    }
  }

  saveStatue(room, x, y) {
    const g = room.group, m = surface('marble', 1, 1, { dir: I, tint: 0xa08080 });
    g.add(box(m, x - 1.4, y, x + 1.4, y + 0.6, -2.6, 0.4));
    const coffin = box(new THREE.MeshStandardMaterial({ color: 0x3a0a10, roughness: 0.35, metalness: 0.3, emissive: 0x200004 }), x - 1.1, y + 0.6, x + 1.1, y + 1.5, -2.0, -0.2); g.add(coffin);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff2040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 })); glow.position.set(x, y + 1.6, -1); glow.scale.set(6, 4, 1); g.add(glow);
    const L = new THREE.PointLight(0xff3050, 18, 12, 1.5); L.position.set(x, y + 2.4, 0); g.add(L); room.lights.push(L);
    this.anim.push(t => { glow.material.opacity = 0.45 + Math.sin(t * 2) * 0.15; });
    room.saveAt = { x, y };
  }

  warpMirror(room, x, y) {
    const g = room.group;
    const frame = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.18, 8, 30), new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.9, roughness: 0.35 })); frame.scale.y = 1.6; frame.position.set(x, y + 2.8, -2.4); g.add(frame);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(1.45, 30), new THREE.MeshStandardMaterial({ color: 0x0a0a14, metalness: 1, roughness: 0.08, emissive: 0x050510 })); glass.scale.y = 1.6; glass.position.set(x, y + 2.8, -2.45); g.add(glass);
    const L = new THREE.PointLight(0xd0b060, 6, 9, 1.6); L.position.set(x, y + 3, 0); g.add(L); room.lights.push(L);
    room.warpAt = { x, y };
  }

  update(t) {
    for (const f of this.flames) { const k = 0.82 + Math.sin(t * 9 + f.ph) * 0.08 + Math.sin(t * 23 + f.ph * 2) * 0.06; f.L.intensity = f.base * k; if (f.fl) f.fl.scale.y = (f.fl.scale.x * 1.6) * (0.9 + k * 0.15); }
    for (const a of this.anim) a(t);
  }
}

export function fitHeight(obj, h) {
  obj.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(obj), cur = bb.max.y - bb.min.y;
  if (cur > 0) obj.scale.multiplyScalar(h / cur);
}

let _flame, _glow, _ray;
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function glowTex() { return _glow ||= canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }); }
export function flameTex() { return _flame ||= canvasTex(32, 64, x => { const g = x.createRadialGradient(16, 44, 2, 16, 40, 22); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.4, 'rgba(255,180,60,.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(16, 2); x.quadraticCurveTo(30, 40, 16, 62); x.quadraticCurveTo(2, 40, 16, 2); x.fill(); }); }
function rayTex() { return _ray ||= canvasTex(32, 128, (x) => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 128); const h = x.createLinearGradient(0, 0, 32, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = h; x.fillRect(0, 0, 32, 128); }); }

// Leaded night glass: deep navy, moonlit toward the top, a few cool panes — reads as a window, not a blue card.
let _glass;
function glassTex() {
  if (_glass) return _glass;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#4a5c96'); gr.addColorStop(0.45, '#26335e'); gr.addColorStop(1, '#121a34'); x.fillStyle = gr; x.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${140 + Math.random() * 60 | 0},220,${0.08 + Math.random() * 0.12})`; x.fillRect((Math.random() * 4 | 0) * 16, (Math.random() * 8 | 0) * 16, 16, 16); }
  x.strokeStyle = 'rgba(10,8,16,.85)'; x.lineWidth = 1.5; for (let i = 16; i < 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); } for (let i = 16; i < 128; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); }
  _glass = new THREE.CanvasTexture(c); _glass.colorSpace = THREE.SRGBColorSpace; return _glass;
}
