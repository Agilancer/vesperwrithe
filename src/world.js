import * as THREE from 'three';
import { ROOMS, SW, SH, FLOOR, bounds, rowFloorY, roomSolids, moverOffset, DOOR_H, HOLE_W } from './rooms.js';
import { surface, cloneGLTF, loadGLTF } from './assets.js';

const T0 = 'assets/game/tex/', I = 'assets/game/interior/', X = 'assets/game/tex2/';
// [texture, dir, tint]. back = far wall, floor/wall = room shell, block = solid masonry and ledges, rug = carpet runner.
const THEMES = {
  outdoor:   { sky: 'moon', floor: ['road_sett', T0], wall: ['ashlar', T0], block: ['bridge_ashlar', X], fog: [0x1a2238, 18, 110], amb: 0.55, moon: 1.6, trim: 0x9a8c70 },
  hall:      { back: ['wall_ashlar', I], floor: ['flags', T0], wall: ['ashlar', T0], block: ['ashlar', T0], fog: [0x0b0810, 16, 48], amb: 0.34, moon: 0.45, pillars: true, trim: 0x9a8c70 },
  shaft:     { back: ['block', T0], floor: ['flags', T0], wall: ['ashlar', T0], block: ['ashlar', T0], fog: [0x080a10, 16, 50], amb: 0.34, moon: 0.4, trim: 0x9a8c70 },
  shrine:    { back: ['marble', I, 0xc89a9a], floor: ['floor_diamond', I], wall: ['ashlar', T0], block: ['oxblood_marble', X], fog: [0x12060a, 12, 40], amb: 0.42, moon: 0.3, trim: 0xc08a6a },
  gallery:   { back: ['panel', I], floor: ['boards', I], wall: ['ashlar', T0], block: ['pv_carved_panels', X], fog: [0x0c0a12, 16, 50], amb: 0.36, moon: 0.6, pillars: true, rug: ['carpet', I], trim: 0xb09060 },
  crypt:     { back: ['cata_wall', I], floor: ['cata_floor', I], wall: ['cata_wall2', I], block: ['cata_block', I], fog: [0x05070a, 10, 36], amb: 0.3, moon: 0.2, trim: 0x7a8a80 },
  chapel:    { back: ['wall_rough', I], floor: ['flags', T0], wall: ['ashlar', T0], block: ['pv_carved_stone', X], fog: [0x0e0a14, 18, 60], amb: 0.32, moon: 0.8, pillars: true, trim: 0x9a8c70 },
  throne:    { back: ['wall_ashlar', I, 0xb0a0c0], floor: ['marble', I, 0x6a6070], wall: ['ashlar', T0], block: ['oxblood_marble', X], fog: [0x0a0610, 18, 60], amb: 0.32, moon: 0.6, pillars: true, rug: ['pv_red_gothic', X], trim: 0xc0a060 },
  courtyard: { sky: 'moon', backWall: ['pv_curtain_granite_a', X], floor: ['pv_courtyard_setts_a', X], wall: ['pv_curtain_granite_b', X], block: ['pv_rusticated_plinth_a', X], fog: [0x161c30, 20, 110], amb: 0.5, moon: 1.7, trim: 0x8a94a8 },
  vestibule: { back: ['pv_limestone_interior_a', X], floor: ['pv_velscour_inlay_a', X], wall: ['pv_keep_dressed_stone_a', X], block: ['oxblood_marble', X], fog: [0x0e0a12, 20, 70], amb: 0.4, moon: 0.6, pillars: true, rug: ['pv_red_gothic', X], trim: 0xd0b070 },
  servants:  { back: ['pv_timber_plaster', X], floor: ['worn_floorboards', X], wall: ['pv_city_clay_brick_a', X], block: ['pv_hearth_brick', X], fog: [0x100b08, 14, 46], amb: 0.36, moon: 0.3, trim: 0xa07a50, beams: true },
  aqueduct:  { back: ['waterline_wall', X], floor: ['pv_undercroft_blocks_a', X], wall: ['pv_undercroft_blocks_c', X], block: ['pv_undercroft_blocks_b', X], fog: [0x06100e, 12, 44], amb: 0.32, moon: 0.25, trim: 0x6a9a8a, damp: true },
  cistern:   { back: ['pv_bastion_basalt_a', X], floor: ['pv_hall_flagstones_c', X], wall: ['pv_bastion_basalt_b', X], block: ['pv_bastion_basalt_c', X], fog: [0x040c12, 14, 60], amb: 0.3, moon: 0.3, pillars: true, trim: 0x5a9ab0, damp: true },
  ossuary:   { back: ['bone_wall', X], floor: ['bone_joint_flags', X], wall: ['bone_inlay_stone', X], block: ['bone_plaster', X], fog: [0x0c0a08, 14, 52], amb: 0.36, moon: 0.4, trim: 0xd0c4a0 },
  prison:    { back: ['pv_curtain_granite_c', X, 0x8a8a90], floor: ['ward_paving', X], wall: ['riveted_plate', X], block: ['heavy_rust', X], fog: [0x0a0806, 12, 44], amb: 0.3, moon: 0.3, trim: 0xb07040, bars: true },
  portrait:  { back: ['pv_red_damask', X], floor: ['worn_floorboards', X, 0xb09080], wall: ['pv_walnut_panel', X], block: ['black_panelling', X], fog: [0x100608, 16, 50], amb: 0.36, moon: 0.4, rug: ['pv_wine_wool', X], trim: 0xc8a050, wainscot: ['pv_oak_panel', X] },
  library:   { back: ['book_spines', X], floor: ['oak_planks', X], wall: ['pv_dark_walnut', X], block: ['pv_carved_wood', X], fog: [0x0c0806, 16, 52], amb: 0.38, moon: 0.3, rug: ['pv_blue_geometric', X], trim: 0xc09a50 },
  garden:    { sky: 'moon', backWall: ['pv_curtain_granite_b', X], floor: ['dead_grass', X], wall: ['pv_curtain_granite_d', X], block: ['moss_1', T0], fog: [0x101a1a, 18, 100], amb: 0.48, moon: 1.6, trim: 0x6a8a50, ivy: true },
  menagerie: { back: ['pv_keep_dressed_stone_b', X], floor: ['straw_ground', X], wall: ['pv_keep_dressed_stone_c', X], block: ['riveted_plate', X], fog: [0x0c0a06, 14, 50], amb: 0.34, moon: 0.4, trim: 0xa08040, bars: true },
  catacomb:  { back: ['skulls', I], floor: ['cata_floor2', I], wall: ['cata_wall3', I], block: ['cata_block', I], fog: [0x060606, 9, 34], amb: 0.28, moon: 0.15, trim: 0xb0a890 },
  royalcrypt:{ back: ['mausoleum_marble', X, 0xa0a0b0], floor: ['bone_checker', X], wall: ['pv_chalk_ashlar', X], block: ['mausoleum_marble', X], fog: [0x0a0a10, 12, 44], amb: 0.36, moon: 0.3, pillars: true, trim: 0xc8c8e0 },
  clock:     { back: ['bronze_plates', X, 0x9a9080], floor: ['walk_paving', X], wall: ['riveted_plate', X], block: ['bronze_plates', X], fog: [0x0c0a06, 16, 56], amb: 0.36, moon: 0.4, trim: 0xd0a040, cogs: true },
  mine:      { back: ['granite_cliff', X], floor: ['ash_clay_ground', X], wall: ['obsidian', X], block: ['keep_basalt', X], fog: [0x06060a, 10, 40], amb: 0.28, moon: 0.2, trim: 0x8070b0 },
  forge:     { back: ['ph_soot_brick', T0], floor: ['ash_street', X], wall: ['pv_smoky_rose_brick', X], block: ['pv_hearth_brick', X, 0x9a8a80], fog: [0x140804, 12, 46], amb: 0.34, moon: 0.2, trim: 0xff8a40, heat: true },
  magma:     { back: ['obsidian', X], floor: ['scree', X, 0x8a7a70], wall: ['keep_basalt', X], block: ['bloodstone', X], fog: [0x180604, 12, 48], amb: 0.32, moon: 0.2, trim: 0xff6a20, heat: true },
  mirror:    { back: ['pv_ivory_lime_plaster', X, 0xb8b0c8], floor: ['bone_checker', X, 0xc0b8d0], wall: ['mausoleum_marble', X], block: ['pv_carved_stone', X, 0xc8c0d8], fog: [0x0c0a14, 16, 56], amb: 0.42, moon: 0.5, pillars: true, rug: ['pv_plum_wool', X], trim: 0xd0c0ff },
  observatory:{ back: ['fishscale_slate', X, 0x7080c0], floor: ['pv_velscour_inlay_c', X], wall: ['pv_keep_dressed_stone_c', X], block: ['lead_roof', X], fog: [0x060814, 16, 60], amb: 0.38, moon: 0.6, trim: 0x90a8ff, stars: true },
  rampart:   { sky: 'storm', backWall: ['bridge_ashlar', X], floor: ['walk_paving', X], wall: ['bridge_ashlar', X], block: ['coping', X], fog: [0x10141e, 20, 120], amb: 0.5, moon: 1.3, trim: 0x8a94a8, merlons: true },
  belfry:    { back: ['pv_curtain_granite_d', X], floor: ['tar_boards', X], wall: ['pv_curtain_granite_a', X], block: ['adzed_beam', X], fog: [0x0a0c14, 16, 60], amb: 0.36, moon: 0.7, trim: 0xb0b8d0, beams: true },
  sanctum:   { back: ['obsidian', X, 0x7068a0], floor: ['pv_bastion_basalt_d', X], wall: ['keep_basalt', X], block: ['obsidian', X], fog: [0x04030a, 12, 50], amb: 0.3, moon: 0.3, trim: 0x9070ff, stars: true },
  hollow:    { back: ['pv_gold_damask', X, 0x8a7060], floor: ['pv_velscour_inlay_d', X], wall: ['bloodstone', X], block: ['oxblood_marble', X], fog: [0x100604, 18, 70], amb: 0.4, moon: 0.5, pillars: true, rug: ['pv_red_gothic', X], trim: 0xffc050 },
};
export const ZB = -3.4, ZF = 2.6; // back wall depth, front lip of floors

function mat(spec, w, h, opts = {}) {
  if (!spec) return null;
  const [name, dir = T0, tint] = spec;
  const rx = Math.max(0.5, Math.round(w / 4 * 2) / 2), ry = Math.max(0.5, Math.round(h / 4 * 2) / 2);
  return surface(name, rx, ry, { dir, tint, ...opts });
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function box(m, x0, y0, x1, y1, z0 = ZB, z1 = ZF) {
  const mesh = new THREE.Mesh(boxGeo, m);
  mesh.scale.set(x1 - x0, y1 - y0, z1 - z0); mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const IRON = std(0x2a2522, { metalness: 0.75, roughness: 0.45 }), BRASS = std(0xb08a3a, { metalness: 0.9, roughness: 0.35 }), WAX = std(0xe8dcc0, { roughness: 0.6 }), DARK = std(0x15121a, { roughness: 0.7 });
const texCache = new Map(), loader = new THREE.TextureLoader();
function tex(name, dir = X) { const k = dir + name; if (!texCache.has(k)) { const t = loader.load(`${dir}${name}_c.webp`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(k, t); } return texCache.get(k); }
// white-on-black mask textures become tinted decals
function decal(name, color, opacity = 1) { return new THREE.MeshBasicMaterial({ color, alphaMap: tex(name), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }); }
function plane(m, w, h, x, y, z) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); return p; }
const sprite = (map, color, sx, sy, x, y, z, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity })); s.scale.set(sx, sy, 1); s.position.set(x, y, z); return s; };
const rnd = (a, b) => a + Math.random() * (b - a);
// Gothic kit modelled in Blender (tools: Blender MCP): window_tracery, rose_tracery, chandelier, sarcophagus.
let _kit; async function kit(name) { _kit ||= loadGLTF('assets/game/props/gothic_kit.glb'); const src = (await _kit).scene.getObjectByName(name); if (!src) return null; const o = src.clone(true); o.position.set(0, 0, 0); o.traverse(c => { if (c.isMesh) c.castShadow = true; }); return o; }

export class World {
  constructor(scene) {
    this.scene = scene; this.rooms = []; this.solids = []; this.anim = []; this.pool = [];
    for (let i = 0; i < 9; i++) { const L = new THREE.PointLight(0xff9a50, 0, 14, 1.6); scene.add(L); this.pool.push(L); }
  }

  // Room records and collision exist for the whole castle up front; meshes are raised when a room is first needed.
  async build() {
    for (const def of ROOMS) {
      const b = bounds(def), room = { def, b, theme: THEMES[def.theme] || THEMES.hall, solids: [], sources: [], flames: [], anim: [], gates: [], cracks: [], movers: [], blades: [], echo: [], breakables: [], props: [], ready: false, group: null };
      for (const s of roomSolids(def)) {
        if (s.kind === 'mover') { s.mover = true; room.movers.push(s); }
        if (s.kind === 'echo') { s.gone = true; room.echo.push(s); }
        if (s.kind === 'crack') room.cracks.push(s);
        if (s.kind === 'gate') room.gates.push(s);
        room.solids.push(s); this.solids.push(s);
      }
      for (const bl of def.blades) room.blades.push({ ...bl, px: b.x0 + bl.x, py: b.y0 + bl.y, tx: 0, ty: 0 });
      this.rooms.push(room);
    }
  }
  roomAt(x, y) { return this.rooms.find(r => x >= r.b.x0 && x < r.b.x1 && y >= r.b.y0 && y < r.b.y1); }
  byId(id) { return this.rooms.find(r => r.def.id === id); }

  async ensure(room) {
    if (room.ready) return room;
    if (!room.building) room.building = this.buildRoom(room).then(() => { room.ready = true; });
    await room.building; return room;
  }

  async buildRoom(room) {
    const def = room.def, T = room.theme, b = room.b, g = new THREE.Group(); g.visible = false; g.name = def.id; room.group = g;
    const W = b.x1 - b.x0, H = b.y1 - b.y0, add = o => { g.add(o); return o; };
    const wallM = mat(T.wall, 1, Math.min(H, 16)), floorM = mat(T.floor, Math.min(W, 16), 4), blockM = (w, h) => mat(T.block, w, h);
    const TRIM = std(T.trim, { emissive: T.trim, emissiveIntensity: 0.22, roughness: 0.7 });
    room.trim = TRIM;
    for (const s of room.solids) {
      switch (s.kind) {
        case 'floor': add(box(floorM, s.x0, s.y0, s.x1, s.y1)); break;
        case 'ceil': add(box(wallM, s.x0, s.y0, s.x1, s.y1)); break;
        case 'wall': if (!def.open || T.backWall) add(box(wallM, s.x0, s.y0, s.x1, Math.min(s.y1, b.y1 + 1.5), ZB, 1.2)); break;
        case 'ledge': add(box(floorM, s.x0, s.y0, s.x1, s.y1, -2.2, 1.6)); break;
        case 'plat': {
          const w = s.x1 - s.x0;
          add(box(blockM(w, 1), s.x0, s.y0, s.x1, s.y1, -1.7, 1.7));
          add(box(TRIM, s.x0, s.y1 - 0.07, s.x1, s.y1 + 0.015, 1.64, 1.78)); // lit lip so jumpable ledges read instantly
          const cm = mat(T.wall, 1, 1); add(box(cm, s.x0 + 0.2, s.y0 - 0.3, s.x0 + 0.5, s.y0, -1.2, -0.9)); add(box(cm, s.x1 - 0.5, s.y0 - 0.3, s.x1 - 0.2, s.y0, -1.2, -0.9));
          break;
        }
        case 'block': {
          const w = s.x1 - s.x0, h = s.y1 - s.y0;
          add(box(blockM(w, h), s.x0, s.y0, s.x1, s.y1, ZB, 1.85));
          if (!s.ref.stair || w < 1.2) add(box(TRIM, s.x0, s.y1 - 0.06, s.x1, s.y1 + 0.012, 1.8, 1.9)); else add(box(TRIM, s.x0, s.y1 - 0.06, s.x0 + 0.04, s.y1 + 0.012, 1.8, 1.9));
          break;
        }
        case 'crack': {
          const w = s.x1 - s.x0, h = s.y1 - s.y0, grp = new THREE.Group();
          grp.add(box(s.by === 'dive' ? floorM : blockM(w, h), s.x0, s.y0, s.x1, s.y1, s.by === 'dive' ? ZB : ZB, s.by === 'dive' ? ZF : 1.85));
          const cr = plane(decal('cracks', s.by === 'dive' ? 0x7ae0f0 : 0x100c10, 0.95), Math.max(w, 1.4), Math.max(h, 1.4), (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, (s.by === 'dive' ? ZF : 1.85) + 0.02); grp.add(cr);
          if (s.by === 'dive') { const top = plane(decal('cracks', 0x7ae0f0, 0.9), w, 3, (s.x0 + s.x1) / 2, s.y1 + 0.012, -0.4); top.rotation.x = -Math.PI / 2; grp.add(top); }
          s.mesh = grp; add(grp); break;
        }
        case 'gate': this.gate(room, s); break;
        case 'echo': {
          const m = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xb090ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
          m.scale.set(s.x1 - s.x0, 0.3, 3); m.position.set((s.x0 + s.x1) / 2, s.y1 - 0.15, 0); m.visible = false; s.mesh = m; add(m);
          const edge = box(new THREE.MeshBasicMaterial({ color: 0xe0d0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), s.x0, s.y1 - 0.04, s.x1, s.y1, 1.45, 1.52); m.attach(edge);
          break;
        }
        case 'mover': {
          const w = s.x1 - s.x0, grp = new THREE.Group(), cog = !!s.ref.orbit || T.cogs;
          grp.add(box(cog ? BRASS : blockM(w, 1), -w / 2, -0.45, w / 2, 0, -1.6, 1.6)); grp.add(box(TRIM, -w / 2, -0.07, w / 2, 0.015, 1.56, 1.7));
          if (cog) { const c = new THREE.Mesh(gearGeo(0.8, 10), BRASS); c.position.set(0, -0.5, -1.9); grp.add(c); room.anim.push((t) => { c.rotation.z = t * 1.5; }); }
          else for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) { const ch = plane(decal('chain_strip', 0x8a8580), 0.3, 14, dx, 7, -1.2); grp.add(ch); }
          s.mesh = grp; add(grp); break;
        }
      }
    }
    // back wall, or open sky
    if (T.back) { const p = plane(mat(T.back, W, H), W, H + 3, b.x0 + W / 2, b.y0 + H / 2, ZB); p.receiveShadow = true; add(p); }
    if (T.sky) this.sky(room, T.sky);
    if (T.backWall) { // curtain wall behind open-air rooms, crenellated against the sky
      const h = Math.min(H - 1, 9); add(box(mat(T.backWall, W, h), b.x0, b.y0, b.x1, b.y0 + h, ZB - 1.2, ZB));
      for (let x = b.x0 + 1; x < b.x1 - 1; x += 2.4) add(box(mat(T.backWall, 1, 1), x, b.y0 + h, x + 1.2, b.y0 + h + 0.9, ZB - 1.2, ZB));
    }
    if (T.wainscot) add(plane(mat(T.wainscot, W, 1.5), W, 1.6, b.x0 + W / 2, b.y0 + FLOOR + 0.8, ZB + 0.03));
    if (T.rug && H < 9) { const c = plane(surface(T.rug[0], Math.max(1, Math.round(W / 3)), 1, { dir: T.rug[1] }), W - 2, 2.2, b.x0 + W / 2, b.y0 + FLOOR + 0.012, -0.4); c.rotation.x = -Math.PI / 2; c.receiveShadow = true; add(c); }
    if (T.pillars) for (let x = b.x0 + 3.3; x < b.x1 - 1; x += 6.667) add(this.pillar(x, b.y0 + FLOOR, Math.min(H - FLOOR * 2, 14), T));
    if (T.beams) for (let x = b.x0 + 2.5; x < b.x1 - 1; x += 5) add(box(surface('adzed_beam', 1, 0.5, { dir: X }), x - 0.2, b.y1 - FLOOR - 0.45, x + 0.2, b.y1 - FLOOR, ZB, 1.2));
    if (T.damp) for (let x = b.x0 + 4; x < b.x1 - 2; x += rnd(7, 12)) add(plane(decal(Math.random() < 0.5 ? 'damp_rise' : 'soot_streaks', 0x0a1410, 0.75), 6, 5, x, b.y0 + FLOOR + 2.5 + (Math.random() < 0.5 ? 0 : Math.min(H - 6, 3)), ZB + 0.04));
    if (T.heat || def.theme === 'catacomb' || def.theme === 'crypt') for (let x = b.x0 + 5; x < b.x1 - 2; x += rnd(9, 15)) add(plane(decal(T.heat ? 'soot_streaks' : 'blood_splashes', T.heat ? 0x050302 : 0x3a0406, 0.8), 5, 5, x, b.y0 + FLOOR + 3, ZB + 0.04));
    if (T.ivy) for (let x = b.x0 + 3; x < b.x1 - 3; x += rnd(8, 14)) add(plane(decal('dead_ivy', 0x2a3a1a, 0.95), 5, 5, x, b.y0 + FLOOR + 2.6, ZB + 0.05));
    if (T.bars) for (let x = b.x0 + 6; x < b.x1 - 4; x += 13.3) { const p = plane(new THREE.MeshStandardMaterial({ map: tex('wrought_bars'), metalness: 0.6, roughness: 0.6 }), 4, 4, x, b.y0 + FLOOR + 2.2, ZB + 0.06); add(p); }
    if (T.cogs) for (let x = b.x0 + 5; x < b.x1 - 3; x += rnd(9, 14)) for (let y = b.y0 + 4; y < b.y1 - 2; y += rnd(9, 14)) this.bgGear(room, x, y, rnd(1.2, 2.6));
    if (T.stars) { const n = Math.round(W * H / 6), pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([b.x0 + Math.random() * W, b.y0 + Math.random() * H, ZB + 0.1 + Math.random() * 0.4], i * 3); const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xc8d0ff, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); add(pts); room.anim.push(t => { pts.material.opacity = 0.65 + Math.sin(t * 1.3) * 0.25; }); }
    if (T.merlons) for (let x = b.x0 + 0.6; x < b.x1 - 1; x += 2.6) add(box(mat(T.block, 1, 1), x, b.y0 + FLOOR, x + 1.3, b.y0 + FLOOR + 1.1, ZB + 0.1, ZB + 0.9));
    for (const d of def.doors) if (d.side === 'W' || d.side === 'E') { if (!def.open) this.doorFrame(g, d.side === 'W' ? b.x0 : b.x1, rowFloorY(d.row) + FLOOR, wallM); }
    // hazards
    for (const s of def.spikes) this.spikes(room, b.x0 + s.x, b.y0 + s.y, s.w);
    for (const l of def.lava) this.lava(room, b.x0 + l.x, b.y0 + l.y, l.w, l.h);
    for (const w of def.water) this.water(room, b.x0 + w.x, b.y0 + w.y, w.w, w.h);
    for (const bl of room.blades) this.blade(room, bl);
    for (const p of def.props) { try { await this.prop(room, p); } catch (e) { console.warn('prop', def.id, p.t, e); } }
    // SotN-style breakable candle stands in the play plane
    for (const bk of def.breakables) {
      const x = b.x0 + bk.x, y = b.y0 + (bk.y ?? FLOOR), grp = new THREE.Group(); grp.position.set(x, y, 0.2);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 1.1, 6), IRON); stem.position.y = 0.55;
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.08, 0.08, 8), IRON); dish.position.y = 1.12;
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 8), WAX); wax.position.y = 1.29;
      grp.add(stem, dish, wax, sprite(flameTex(), 0xffb050, 0.2, 0.34, 0, 1.55, 0), sprite(glowTex(), 0xff9040, 1.1, 1.1, 0, 1.5, 0, 0.5)); g.add(grp); room.breakables.push({ x, y, grp, broken: false });
    }
    if (def.save) this.saveStatue(room, b.x0 + def.save.x, b.y0 + FLOOR);
    if (def.warp) this.warpMirror(room, b.x0 + def.warp.x, b.y0 + FLOOR);
    if (def.shop) await this.shop(room, b.x0 + def.shop.x, b.y0 + FLOOR);
    this.scene.add(g);
  }

  // Let a far-away room go: drop its meshes so a long journey does not hold the whole castle in memory.
  unload(room, keep = []) {
    if (!room.ready) return;
    const skip = new Set(); for (const o of keep) o.traverse(c => skip.add(c));
    room.group.traverse(o => { if (o.geometry && o.geometry !== boxGeo && !skip.has(o)) o.geometry.dispose(); });
    this.scene.remove(room.group);
    Object.assign(room, { group: null, ready: false, building: null, sources: [], flames: [], anim: [], breakables: [], props: [], bubbles: null, saveAt: null, warpAt: null, shopAt: null, warpFx: null });
    for (const s of room.solids) s.mesh = null; for (const b of room.blades) b.mesh = null;
  }
  light(room, x, y, z, color, intensity, dist = 13, fl = null) { const s = { x, y, z, color, intensity, dist, ph: Math.random() * 10, fl }; room.sources.push(s); return s; }

  gate(room, s) {
    const g = room.group, x = (s.x0 + s.x1) / 2, h = s.y1 - s.y0, grp = new THREE.Group();
    if (s.gate === 'thorn') {
      const tm = std(0x1b2a14, { roughness: 0.8, emissive: 0x050a02 });
      for (let i = 0; i < 70; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.06 + Math.random() * 0.08, 0.6 + Math.random() * 1.4, 5), tm); c.position.set(x + (Math.random() - 0.5) * 1.6, s.y0 + Math.random() * h, (Math.random() - 0.5) * 3); c.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); c.castShadow = true; grp.add(c); }
      for (let i = 0; i < 8; i++) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.8 + Math.random() * 0.6, 0.07, 5, 18, 4), tm); v.position.set(x + (Math.random() - 0.5), s.y0 + 0.5 + Math.random() * 3, (Math.random() - 0.5) * 2); v.rotation.set(Math.random() * 3, Math.random() * 3, 0); grp.add(v); }
    } else if (s.gate === 'ghost') {
      const m = new THREE.MeshBasicMaterial({ color: 0xa060ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 7; i++) grp.add(box(m, x - 0.05, s.y0, x + 0.05, s.y1, -2.4 + i * 0.7, -2.3 + i * 0.7));
      for (let i = 0; i < 3; i++) grp.add(box(m, x - 0.04, s.y0 + 0.8 + i * 1.3, x + 0.04, s.y0 + 0.9 + i * 1.3, -2.4, 1.9));
      const glow = sprite(glowTex(), 0x8040ff, 3, h + 2, x, s.y0 + h / 2, 0.5, 0.35); grp.add(glow); room.anim.push(t => { glow.material.opacity = 0.25 + Math.sin(t * 3) * 0.1; m.opacity = 0.45 + Math.sin(t * 5) * 0.12; });
      this.light(room, x, s.y0 + 2, 1, 0x8040ff, 8, 8);
    } else { // veil: a false wall
      grp.add(box(mat(room.theme.wall, 1, h), s.x0, s.y0, s.x1, s.y1, ZB, 1.85));
      const sh = sprite(glowTex(), 0xb090ff, 2.4, h, x, s.y0 + h / 2, 1.95, 0.0); grp.add(sh); room.anim.push(t => { sh.material.opacity = Math.max(0, Math.sin(t * 0.9 + x) - 0.86) * 1.2; });
    }
    s.mesh = grp; g.add(grp);
  }

  doorFrame(g, x, y, m) {
    g.add(box(m, x - 0.7, y + DOOR_H, x + 0.7, y + DOOR_H + 0.8, ZB, 1.4));
    for (const dz of [-2.6, 1.0]) g.add(box(m, x - 0.75, y - 0.1, x + 0.75, y + DOOR_H, dz, dz + 0.35));
  }

  pillar(x, y, h, T) {
    const grp = new THREE.Group(), m = mat(T.wall, 1, h / 3);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, h, 12), m); shaft.position.set(x, y + h / 2, ZB + 0.7); shaft.castShadow = shaft.receiveShadow = true;
    grp.add(shaft, box(m, x - 0.65, y, x + 0.65, y + 0.5, ZB + 0.05, ZB + 1.35), box(m, x - 0.7, y + h - 0.6, x + 0.7, y + h, ZB + 0.05, ZB + 1.4));
    const rib = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.16, 6, 24, Math.PI), m); rib.position.set(x + 3.33, y + h - 3.9, ZB + 0.25); grp.add(rib);
    return grp;
  }

  bgGear(room, x, y, r) { const c = new THREE.Mesh(gearGeo(r, Math.round(8 + r * 4)), std(0x6a5a3a, { metalness: 0.8, roughness: 0.5 })); c.position.set(x, y, ZB + 0.25); room.group.add(c); const sp = rnd(0.2, 0.6) * (Math.random() < 0.5 ? -1 : 1); room.anim.push(t => { c.rotation.z = t * sp; }); }

  sky(room, kind) {
    const g = room.group, b = room.b, storm = kind === 'storm';
    const moon = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshBasicMaterial({ color: storm ? 0xaab4c8 : 0xf3ead2, fog: false }));
    moon.position.set(b.x0 + 18, b.y0 + 26, -150); g.add(moon);
    const halo = sprite(glowTex(), storm ? 0x5a6a90 : 0x8a9ad0, 46, 46, moon.position.x, moon.position.y, -152, 0.5); halo.material.fog = false; g.add(halo);
    const sil = new THREE.MeshBasicMaterial({ color: storm ? 0x07080e : 0x0a0c16, fog: false }), far = new THREE.Group();
    const n = Math.ceil((b.x1 - b.x0) / 9) + 6, drop = storm ? 30 : 0;
    for (let i = 0; i < n; i++) { const x = b.x0 - 10 + i * 10 + rnd(-2, 2), h = rnd(18, 44) - drop, w = rnd(4, 9); far.add(box(sil, x - w / 2, b.y0 - 40, x + w / 2, b.y0 + h, -100, -96)); const cone = new THREE.Mesh(new THREE.ConeGeometry(w * 0.62, w * 1.5, 4), sil); cone.position.set(x, b.y0 + h + w * 0.75, -98); far.add(cone);
      for (let k = 0; k < 3; k++) { const lw = plane(new THREE.MeshBasicMaterial({ color: 0xffb860, fog: false }), 0.5, 0.9, x + rnd(-w * 0.35, w * 0.35), b.y0 + Math.random() * h, -95.5); far.add(lw); } }
    g.add(far);
    const mtn = new THREE.MeshBasicMaterial({ color: 0x141a2c, fog: false });
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(rnd(18, 32), rnd(26, 46), 5), mtn); m.position.set(b.x0 - 20 + i * 14, b.y0 + 2 - drop, -130); g.add(m); }
    const mist = plane(new THREE.MeshBasicMaterial({ color: 0x5a6a8c, transparent: true, opacity: 0.18, depthWrite: false }), b.x1 - b.x0 + 120, 14, (b.x0 + b.x1) / 2, b.y0 - 6, -30); g.add(mist);
    if (storm) { // racing cloud bank and lightning
      const cm = new THREE.MeshBasicMaterial({ map: cloudTex(), color: 0x39405a, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
      const clouds = []; for (let i = 0; i < 8; i++) { const c = plane(cm, rnd(60, 110), rnd(18, 30), b.x0 + rnd(-40, b.x1 - b.x0 + 40), b.y0 + rnd(22, 50), -120 - i * 3); g.add(c); clouds.push(c); }
      const fl = plane(new THREE.MeshBasicMaterial({ color: 0xc0d0ff, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }), 400, 200, (b.x0 + b.x1) / 2, b.y0 + 30, -160); g.add(fl);
      let next = 3, flash = 0; room.anim.push((t, dt) => { for (const c of clouds) { c.position.x += dt * 3; if (c.position.x > b.x1 + 90) c.position.x = b.x0 - 90; } next -= dt; if (next <= 0) { next = rnd(2.5, 8); flash = 1; room.lightning = 0.25; } flash = Math.max(0, flash - dt * 4); fl.material.opacity = flash * (0.5 + Math.random() * 0.5) * 0.6; if (room.lightning > 0) room.lightning -= dt; });
    }
    if (room.def.theme === 'outdoor') { // the causeway: rails and arches under the road, broken at the west
      const rm = surface('ashlar', 8, 0.5);
      g.add(box(rm, b.x0, b.y0 + FLOOR, b.x1, b.y0 + FLOOR + 1.0, -2.0, -1.6));
      for (let x = b.x0 + 2; x < b.x1; x += 4) g.add(box(rm, x - 0.25, b.y0 + FLOOR, x + 0.25, b.y0 + FLOOR + 1.3, -2.1, -1.5));
      for (let x = b.x0 + 6; x < b.x1; x += 12) { const a = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.9, 6, 16, Math.PI), rm); a.position.set(x, b.y0 - 6, -0.4); a.scale.z = 3.2; g.add(a); g.add(box(rm, x - 5.5, b.y0 - 30, x - 3.7, b.y0 - 6, -2.4, 1.6)); }
      for (let i = 0; i < 10; i++) g.add(box(rm, b.x0 - 1.4 + Math.random() * 0.8, b.y0 - Math.random() * 1.5, b.x0 + Math.random() * 0.5, b.y0 + FLOOR + Math.random() * 0.4, -2 + Math.random() * 3, -1.5 + Math.random() * 4));
    }
  }

  // ---------------------------------------------------------------------------------------------- hazards
  spikes(room, x, y, w) {
    const m = std(0x8a8a90, { metalness: 0.85, roughness: 0.3 }), n = Math.max(2, Math.round(w / 0.32));
    for (let i = 0; i < n; i++) for (const z of [-0.9, -0.3, 0.3, 0.9]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 5), m); c.position.set(x + (i + 0.5) * w / n, y + 0.27, z + (i % 2) * 0.15); room.group.add(c); }
    room.group.add(box(IRON, x, y - 0.02, x + w, y + 0.05, -1.3, 1.3));
  }
  lava(room, x, y, w, h) {
    const t = lavaTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, w / 4), Math.max(1, h / 4));
    const m = new THREE.MeshBasicMaterial({ map: t, color: 0xffffff, fog: false });
    const body = box(m, x, y, x + w, y + h - 0.08, ZB + 0.05, ZF - 0.05); body.castShadow = false; room.group.add(body);
    const top = plane(m, w, ZF - ZB - 0.1, x + w / 2, y + h - 0.07, (ZB + ZF) / 2); top.rotation.x = -Math.PI / 2; room.group.add(top);
    room.group.add(sprite(glowTex(), 0xff5a10, w * 1.6, 4.5, x + w / 2, y + h + 0.4, 1.2, 0.35));
    for (let lx = x + Math.min(w / 2, 3); lx < x + w; lx += 8) this.light(room, lx, y + h + 1.2, 0.5, 0xff6a20, 16, 12);
    room.anim.push((tt) => { t.offset.set(tt * 0.02, Math.sin(tt * 0.3) * 0.05); });
    room.bubbles = (room.bubbles || []).concat({ x, y: y + h, w });
  }
  water(room, x, y, w, h) {
    const m = new THREE.MeshStandardMaterial({ color: 0x1a5a6a, transparent: true, opacity: 0.42, roughness: 0.08, metalness: 0.3, depthWrite: false, emissive: 0x04202a });
    const front = plane(m, w, h, x + w / 2, y + h / 2, 1.9); front.renderOrder = 5; room.group.add(front);
    const tm = new THREE.MeshStandardMaterial({ color: 0x3a9ab0, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.6, depthWrite: false, emissive: 0x06303a });
    const top = plane(tm, w, 1.9 - ZB, x + w / 2, y + h, (ZB + 1.9) / 2); top.rotation.x = -Math.PI / 2; top.renderOrder = 5; room.group.add(top);
    const line = box(new THREE.MeshBasicMaterial({ color: 0xb0f0ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), x, y + h - 0.03, x + w, y + h + 0.02, 1.88, 1.93); room.group.add(line);
    room.anim.push(t => { line.material.opacity = 0.35 + Math.sin(t * 2 + x) * 0.15; top.position.y = y + h + Math.sin(t * 1.4 + x) * 0.03; });
  }
  blade(room, bl) {
    const piv = new THREE.Group(); piv.position.set(bl.px, bl.py, 0.0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, bl.len, 6), IRON); rod.position.y = -bl.len / 2;
    const shp = new THREE.Shape(); shp.absarc(0, 0, 0.95, Math.PI, Math.PI * 2, false); shp.lineTo(0, 0.35); shp.lineTo(-0.95, 0);
    const bm = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: 0.06, bevelEnabled: false }), std(0xb8c0d0, { metalness: 0.95, roughness: 0.2 })); bm.position.set(0, -bl.len, -0.03);
    piv.add(rod, bm, box(IRON, -0.25, -0.15, 0.25, 0.15, -0.3, 0.3)); room.group.add(piv); bl.mesh = piv;
  }

  // ---------------------------------------------------------------------------------------------- props
  flame(room, x, y, z, size = 0.5, light = 14, color = 0xffa040) {
    const fl = sprite(flameTex(), color, size, size * 1.6, x, y, z), glow = sprite(glowTex(), color === 0xffa040 ? 0xff7a2a : color, size * 6, size * 6, x, y, z, 0.42);
    room.group.add(fl, glow); room.flames.push({ fl, sx: size }); if (light) this.light(room, x, y + 0.1, z + 0.9, color === 0xffa040 ? 0xff9a50 : color, light, 13, fl);
  }
  torch(room, x, y) {
    const g = room.group, cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.07, 0.3, 8), IRON); cup.position.set(x, y, ZB + 0.45);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), IRON); arm.rotation.x = Math.PI / 2; arm.position.set(x, y - 0.12, ZB + 0.2);
    g.add(cup, arm); this.flame(room, x, y + 0.32, ZB + 0.45);
  }

  async prop(room, p) {
    const b = room.b, g = room.group, T = room.theme; let x = b.x0 + p.x; const y = b.y0 + (p.y ?? FLOOR), top = b.y1 - FLOOR, ceil = Math.min(top, y + 6.6);
    const add = o => { g.add(o); return o; }, wood = surface('wood', 1, 1), stone = mat(T.wall, 1, 1);
    switch (p.t) {
      case 'torch': this.torch(room, x, y + 2.6); break;
      case 'lamp': {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 8), IRON)).position.set(x, y + 1.6, -1.8);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.45, 6, 1, true), IRON)).position.set(x, y + 3.4, -1.8);
        add(sprite(glowTex(), 0xffb060, 1.6, 1.6, x, y + 3.4, -1.8)); this.light(room, x, y + 3.3, -1.2, 0xffb060, 12, 12); break;
      }
      case 'brazier': {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.2, 0.35, 10), IRON)).position.set(x, y + 1.0, -1.4);
        for (const a of [0, 2.1, 4.2]) { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5), IRON)); l.position.set(x + Math.cos(a) * 0.22, y + 0.45, -1.4 + Math.sin(a) * 0.22); l.rotation.z = Math.cos(a) * 0.25; }
        this.flame(room, x, y + 1.5, -1.4, 0.7, 16); break;
      }
      case 'candles': {
        for (let i = 0; i < 7; i++) { const h = 0.2 + Math.random() * 0.5, cx = x + (Math.random() - 0.5) * 1.2, cz = -2.2 + Math.random(); add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 6), WAX)).position.set(cx, y + h / 2, cz); add(sprite(flameTex(), 0xffb050, 0.12, 0.2, cx, y + h + 0.08, cz)); }
        this.light(room, x, y + 0.9, -1.4, 0xffa860, 7, 8); break;
      }
      case 'chandelier': {
        const cy = Math.min(top - 1.2, y + 5.2), grp = new THREE.Group(); grp.position.set(x, cy, -0.9);
        const k = await kit('chandelier'); if (k) { k.scale.setScalar(1.25); grp.add(k); }
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; grp.add(sprite(flameTex(), 0xffb050, 0.16, 0.27, Math.cos(a) * 1.25, 0.62, Math.sin(a) * 1.25)); if (i % 2 === 0) grp.add(sprite(flameTex(), 0xffb050, 0.13, 0.22, Math.cos(a) * 0.69, 1.05, Math.sin(a) * 0.69)); }
        const ch = plane(decal('chain_strip', 0x8a7a50), 0.22, Math.max(0.5, top - cy - 1.2), 0, (top - cy - 1.2) / 2 + 1.25, 0); grp.add(ch); add(grp); add(sprite(glowTex(), 0xffa850, 5, 4, x, cy + 0.2, -0.9, 0.3));
        this.light(room, x, cy - 0.3, 0.2, 0xffb060, 18, 15); room.anim.push(t => { grp.rotation.z = Math.sin(t * 0.7 + x) * 0.025; }); break;
      }
      case 'banner': case 'tapestry': {
        const tall = p.t === 'banner', names = tall ? ['banner_blood', 'banner_blue', 'banner_white', 'banner_green', 'banner_greygold', 'war_banner'] : ['tapestry_war', 'tapestry_hunt', 'pv_tapestry_wall', 'pv_blue_tapestry', 'thorn_brocade'];
        const nm = names[Math.abs(Math.round(x * 7)) % names.length], w = tall ? 1.7 : 3.4, h = tall ? 3.4 : 2.6, cy = Math.min(top - h / 2 - 0.3, y + (tall ? 4.2 : 3.2));
        const geo = tall ? bannerGeo(w, h) : new THREE.PlaneGeometry(w, h, 1, 4), ban = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex(nm), roughness: 0.9, side: THREE.DoubleSide }));
        ban.position.set(x, cy, ZB + 0.09); add(ban); const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, w + 0.4, 6), BRASS)); rod.rotation.z = Math.PI / 2; rod.position.set(x, cy + h / 2 + 0.03, ZB + 0.13);
        break;
      }
      case 'painting': case 'mirror': {
        const w = p.t === 'mirror' ? 1.8 : 2.2, h = p.t === 'mirror' ? 3.0 : 2.6, cy = Math.min(top - h / 2 - 0.4, y + 2.6);
        add(box(BRASS, x - w / 2 - 0.12, cy - h / 2 - 0.12, x + w / 2 + 0.12, cy + h / 2 + 0.12, ZB + 0.02, ZB + 0.14));
        const names = ['tapestry_hunt', 'demon_frieze', 'tapestry_war', 'pv_heraldic', 'demon_glass'];
        add(plane(p.t === 'mirror' ? new THREE.MeshStandardMaterial({ color: 0x8a90b0, metalness: 1, roughness: 0.06, emissive: 0x101428, map: tex('demon_glass') }) : new THREE.MeshStandardMaterial({ map: tex(names[Math.abs(Math.round(x * 3)) % names.length]), roughness: 0.8, color: 0xb0a090 }), w, h, x, cy, ZB + 0.16));
        break;
      }
      case 'window': case 'rosewindow': {
        if (p.t === 'window' && T.pillars) { const k = Math.round((p.x - 6.63) / 6.667), sx = 6.63 + k * 6.667; if (Math.abs(sx - p.x) < 3.4) x = b.x0 + sx; }
        const rose = p.t === 'rosewindow', big = p.big, w = rose ? 4.6 : big ? 3.6 : 2.0, h = rose ? 4.6 : big ? 7.5 : 4.0, cy = Math.min(top - h / 2 - 0.5, y + (rose ? 6.0 : big ? 9.0 : 4.1));
        let geo; if (rose) geo = new THREE.CircleGeometry(w / 2, 40); else { const sh = new THREE.Shape(); sh.moveTo(-w / 2, -h / 2); sh.lineTo(w / 2, -h / 2); sh.lineTo(w / 2, h / 2 - w / 2); sh.absarc(0, h / 2 - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, -h / 2); geo = new THREE.ShapeGeometry(sh, 16); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5); }
        const lit = rose || big, glass = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: rose ? tex('leaded_lit') : big ? tex('demon_glass') : glassTex(), color: lit ? 0xc8b8b8 : 0xffffff, fog: false }));
        glass.position.set(x, cy, ZB + 0.02); add(glass);
        if (!lit) { add(box(DARK, x - 0.05, cy - h / 2, x + 0.05, cy + h / 2 - 0.2, ZB, ZB + 0.12)); add(box(DARK, x - w / 2, cy - 0.05, x + w / 2, cy + 0.05, ZB, ZB + 0.12)); }
        const tr = lit ? await kit(rose ? 'rose_tracery' : 'window_tracery') : null;
        if (tr) { tr.traverse(c => { if (c.isMesh) c.material = stone; }); tr.scale.set(w / (rose ? 4.6 : 3.6), h / (rose ? 4.6 : 7.5), 1); tr.position.set(x, rose ? cy : cy - h / 2, ZB + 0.14); add(tr); }
        else { const frame = new THREE.Mesh(new THREE.TorusGeometry(w / 2, 0.18, 6, 28, rose ? Math.PI * 2 : Math.PI), stone); frame.position.set(x, rose ? cy : cy + h / 2 - w / 2, ZB + 0.1); add(frame); }
        const ray = plane(new THREE.MeshBasicMaterial({ map: rayTex(), color: lit ? 0xd07050 : 0x7b90d0, transparent: true, opacity: lit ? 0.16 : 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), w * 1.1, 13, x + 2.4, cy - 4.5, ZB + 1.6); ray.rotation.z = 0.45; ray.rotation.y = 0.25; add(ray);
        this.light(room, x + 1.5, cy - 2.5, 0.6, lit ? 0xff8060 : 0x8aa0ff, lit ? 14 : 12, 16); break;
      }
      case 'statue': case 'gargoyle': {
        const garg = p.t === 'gargoyle', file = garg ? 'assets/monsters/tripo/dragonling_black.glb' : ['assets/game/knights/knight.glb', 'assets/game/knights/paladin_bellwright.glb', 'assets/game/knights/paladin_fifthwatch.glb'][Math.abs(Math.round(x)) % 3];
        const k = await cloneGLTF(file), sm = surface('limestone_1', 1, 1, { tint: garg ? 0x6a6a70 : 0x9a9690 });
        if (garg && k.animations.length) { const mx = new THREE.AnimationMixer(k.scene), c = k.animations.find(a => a.name === 'roar') || k.animations[0]; mx.clipAction(c).play(); mx.setTime(c.duration * 0.45); }
        k.scene.traverse(o => { if (o.isMesh) { o.material = sm; o.castShadow = true; o.frustumCulled = false; } });
        fitHeight(k.scene, garg ? 1.5 : 2.6); const ped = garg ? 0 : 0.9; k.scene.position.set(x, y + ped, garg ? -1.2 : ZB + 1.2); if (garg) k.scene.rotation.y = (Math.round(x) % 2 ? 1 : -1) * 1.0; add(k.scene);
        if (!garg) add(box(stone, x - 0.8, y, x + 0.8, y + 0.9, ZB + 0.3, ZB + 2.0));
        break;
      }
      case 'chain': add(plane(decal('chain_strip', 0x9a9590), 0.35, top - y, x, (top + y) / 2, ZB + 1.2)); break;
      case 'hook': { const len = Math.min(3.2, top - y - 2.2); add(plane(decal('chain_strip', 0x9a9590), 0.28, len, x, top - len / 2, -1.4)); const hk = add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 5, 12, 4.2), IRON)); hk.position.set(x, top - len - 0.15, -1.4); if (Math.round(x) % 2) { const meat = add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), std(0x6a1a1a, { roughness: 0.5 }))); meat.scale.set(0.8, 1.6, 0.6); meat.position.set(x, top - len - 0.9, -1.4); } break; }
      case 'cage': { const cy = Math.min(top - 2.2, y + 4.2), len = top - cy - 1; add(plane(decal('chain_strip', 0x9a9590), 0.3, len, x, top - len / 2, -1.3)); const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2, 10, 1, true), new THREE.MeshStandardMaterial({ map: tex('wrought_bars'), alphaTest: 0.35, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 }))); c.position.set(x, cy, -1.3); add(new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 10), IRON)).position.set(x, cy + 1.25, -1.3); add(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 10), IRON)).position.set(x, cy - 1, -1.3); room.anim.push(t => { c.rotation.y = Math.sin(t * 0.5 + x) * 0.3; }); break; }
      case 'pews': for (let i = 0; i < 3; i++) { const px = x + i * 2.2 - 2.2; add(box(wood, px - 0.9, y, px + 0.9, y + 0.5, -2.8, -2.3)); add(box(wood, px - 0.9, y + 0.5, px + 0.9, y + 1.2, -2.85, -2.75)); } break;
      case 'throne': { const m = surface('oxblood_marble', 1, 1, { dir: X }); add(box(m, x - 3, y, x + 3, y + 0.6, ZB + 0.1, ZB + 3)); add(box(m, x - 1, y + 0.6, x + 1, y + 1.4, ZB + 0.5, ZB + 2)); add(box(m, x - 1, y + 1.4, x + 1, y + 5, ZB + 0.3, ZB + 0.7)); add(box(BRASS, x - 1.15, y + 4.9, x + 1.15, y + 5.2, ZB + 0.25, ZB + 0.75)); for (const dx of [-1, 1]) add(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 6), BRASS)).position.set(x + dx * 0.95, y + 5.6, ZB + 0.5); break; }
      case 'gatearch': { const m = surface('ashlar', 2, 4); add(box(m, x - 4, y, x - 2.2, y + 11, -3.2, 0.2)); add(box(m, x + 0.1, y, x + 2.2, y + 11, -3.2, 0.2)); add(box(m, x - 4, y + 5.2, x + 2.2, y + 7, -3.2, 0.2)); for (let i = 0; i < 4; i++) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.4, 4), m)); c.position.set(x - 3.1 + (i % 2) * 4.2, y + 12.2 + (i > 1 ? 3 : 0), -1.5); if (i > 1) c.scale.setScalar(0.5); } this.torch(room, x - 2.6, y + 3.0); break; }
      case 'portcullis': for (let i = 0; i < 6; i++) add(box(IRON, x + 0.15 * i - 0.4, y + 3.9, x + 0.15 * i - 0.35, y + 6.5, -2.6 + i * 0.7, -2.5 + i * 0.7)); break;
      case 'bookshelf': { const w = 3.2, h = Math.min(4.6, top - y - 0.4); add(box(surface('pv_dark_walnut', 1, 1, { dir: X }), x - w / 2 - 0.12, y, x + w / 2 + 0.12, y + h + 0.15, ZB + 0.02, ZB + 0.7)); const t2 = tex('book_spines').clone(); t2.needsUpdate = true; t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.repeat.set(1, h / 3.2); add(plane(new THREE.MeshStandardMaterial({ map: t2, roughness: 0.85 }), w, h, x, y + h / 2 + 0.05, ZB + 0.72)); break; }
      case 'sarcophagus': { const k = await kit('sarcophagus'); if (k) { const mm = surface('mausoleum_marble', 1, 1, { dir: X }); k.traverse(c => { if (c.isMesh) c.material = Array.isArray(c.material) ? c.material.map(() => mm) : mm; }); k.scale.setScalar(0.92); k.position.set(x, y, -2.0); add(k); break; } const m = surface('mausoleum_marble', 1, 1, { dir: X }); add(box(m, x - 1.3, y, x + 1.3, y + 0.9, -2.6, -1.3)); add(box(m, x - 1.4, y + 0.9, x + 1.4, y + 1.1, -2.7, -1.2)); const eff = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.5, 4, 8), m)); eff.rotation.z = Math.PI / 2; eff.position.set(x, y + 1.25, -1.95); break; }
      case 'coffin': { const c = add(box(std(0x2a1410, { roughness: 0.5 }), x - 0.45, y, x + 0.45, y + 2.1, ZB + 0.15, ZB + 0.6)); c.rotation.z = (Math.round(x) % 2 ? 1 : -1) * 0.08; add(box(BRASS, x - 0.2, y + 1.3, x + 0.2, y + 1.36, ZB + 0.6, ZB + 0.63)); add(box(BRASS, x - 0.03, y + 1.0, x + 0.03, y + 1.6, ZB + 0.6, ZB + 0.63)); break; }
      case 'bones': { const bm = std(0xd8d0b8, { roughness: 0.8 }); for (let i = 0; i < 9; i++) { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, rnd(0.4, 0.8), 5), bm)); c.position.set(x + rnd(-0.8, 0.8), y + rnd(0.05, 0.25), rnd(-2.4, -1.2)); c.rotation.set(rnd(0, 3), rnd(0, 3), Math.PI / 2 + rnd(-0.5, 0.5)); } const sk = await cloneGLTF('assets/game/items/skull_0' + (1 + Math.abs(Math.round(x)) % 8) + '.glb'); fitHeight(sk.scene, 0.34); sk.scene.position.set(x + 0.2, y + 0.12, -1.6); sk.scene.rotation.y = rnd(-1, 1); add(sk.scene); break; }
      case 'skullwall': add(plane(surface('skulls2', 1, 1, { dir: I }), 4, 4, x, Math.min(top - 2.2, y + 2.4), ZB + 0.05)); break;
      case 'gear': this.bgGear(room, x, Math.min(top - 2.5, y + 3.5), p.r || 2.2); break;
      case 'pendulum': { const piv = new THREE.Group(), len = Math.min(6, top - y - 1.5); piv.position.set(x, y + len + 1, ZB + 0.5); piv.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), BRASS).translateY(-len / 2), new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 20), BRASS).rotateX(Math.PI / 2).translateZ(0).translateY(0)); piv.children[1].position.set(0, -len, 0); add(piv); room.anim.push(t => { piv.rotation.z = Math.sin(t * 1.3 + x) * 0.5; }); break; }
      case 'barrel': { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.0, 12), wood)); c.position.set(x, y + 0.5, -1.9); c.castShadow = true; for (const h of [0.25, 0.75]) add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 4, 14), IRON)).rotateX(Math.PI / 2).position.set(x, y + h, -1.9); break; }
      case 'crate': { const s = 0.9 + (Math.round(x * 3) % 3) * 0.12; add(box(surface('oak_planks', 0.5, 0.5, { dir: X }), x - s / 2, y, x + s / 2, y + s, -2.4, -2.4 + s)); break; }
      case 'table': { add(box(wood, x - 1.2, y + 0.82, x + 1.2, y + 0.92, -2.6, -1.5)); for (const dx of [-1.05, 1.05]) for (const dz of [-2.5, -1.6]) add(box(wood, x + dx - 0.06, y, x + dx + 0.06, y + 0.82, dz - 0.06, dz + 0.06)); add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), WAX)).position.set(x + 0.4, y + 1.07, -2); add(sprite(flameTex(), 0xffb050, 0.12, 0.2, x + 0.4, y + 1.3, -2)); add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.22, 8), BRASS)).position.set(x - 0.4, y + 1.03, -2.1); break; }
      case 'rug': { const names = ['pv_red_gothic', 'pv_blue_geometric', 'pv_geometric_rug', 'pv_heraldic', 'pv_red_floral', 'pv_green_floral', 'pv_tartan_red', 'pv_woven_stripes', 'pv_red_diamond', 'pv_gold_wool', 'pv_forest_wool', 'pv_rust_wool', 'pv_charcoal_wool', 'pv_ivory_wool', 'pv_brown_wool', 'pv_blue_wool', 'pv_tartan_brown']; const r = plane(new THREE.MeshStandardMaterial({ map: tex(names[Math.abs(Math.round(x * 5)) % names.length]), roughness: 0.95 }), 5, 2.6, x, y + 0.014, -0.5); r.rotation.x = -Math.PI / 2; r.receiveShadow = true; add(r); break; }
      case 'tree': { const bark = surface('bark', 1, 2), h = 4.5 + (Math.round(x) % 3); const tr = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, h, 7), bark)); tr.position.set(x, y + h / 2, -2.4); tr.castShadow = true; for (let i = 0; i < 7; i++) { const l = rnd(1.2, 2.8), br = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.1, l, 5), bark)); const a = rnd(0.5, 1.2) * (i % 2 ? 1 : -1); br.position.set(x + Math.sin(a) * l / 2, y + h * rnd(0.5, 0.98) + Math.cos(a) * l / 2, -2.4 + rnd(-0.4, 0.4)); br.rotation.z = -a; } break; }
      case 'thornbush': { const tm = std(0x1b2a14, { roughness: 0.8 }); for (let i = 0; i < 26; i++) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(0.05 + Math.random() * 0.06, 0.5 + Math.random() * 1.0, 5), tm)); c.position.set(x + rnd(-1, 1), y + rnd(0.1, 1.2), rnd(-2.8, -1.6)); c.rotation.set(rnd(-1, 1), rnd(0, 6), rnd(-1, 1)); } break; }
      case 'ivy': add(plane(decal('dead_ivy', 0x33451f, 0.95), 5, 5, x, Math.min(top - 2.6, y + 2.6), ZB + 0.06)); break;
      case 'fountain': { add(new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.7, 20), stone)).position.set(x, y + 0.35, -1.6); add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 10), stone)).position.set(x, y + 1.4, -1.6); add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.3, 0.3, 14), stone)).position.set(x, y + 2.5, -1.6); const w = add(new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x2a6a7a, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.8 }))); w.position.set(x, y + 0.66, -1.6); add(sprite(glowTex(), 0x6ab0d0, 2.4, 3, x, y + 1.8, -1.6, 0.25)); break; }
      case 'grave': { const gm = surface('limestone_1', 0.5, 0.5, { tint: 0x7a7a80 }), h = 1.0 + (Math.round(x) % 3) * 0.2; const sl = add(box(gm, x - 0.35, y, x + 0.35, y + h, -2.6, -2.4)); sl.rotation.z = rnd(-0.08, 0.08); const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12, 1, false, 0, Math.PI), gm)); cap.rotation.x = Math.PI / 2; cap.rotation.y = Math.PI / 2; cap.position.set(x, y + h, -2.5); break; }
      case 'organ': { for (let i = 0; i < 13; i++) { const h = 2 + Math.sin(i / 12 * Math.PI) * 3.4; add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, h, 8), BRASS)).position.set(x - 2.1 + i * 0.35, y + 1.2 + h / 2, ZB + 0.4); } add(box(surface('pv_dark_walnut', 1, 1, { dir: X }), x - 2.4, y, x + 2.4, y + 1.2, ZB + 0.1, ZB + 1.2)); add(box(WAX, x - 1.2, y + 1.2, x + 1.2, y + 1.28, ZB + 0.8, ZB + 1.25)); break; }
      case 'bigbell': { const k = await loadGLTF('assets/game/items/bells.glb'), src = k.scene.getObjectByName('bell_tenor'), cy = Math.min(top - 2.2, y + 5); if (src) { const m = src.clone(); const piv = new THREE.Group(); piv.position.set(x, cy + 1.6, -1.6); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1); piv.add(m); const bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()), sc = 2.4 / Math.max(sz.x, sz.y, sz.z); m.scale.setScalar(sc); const b2 = new THREE.Box3().setFromObject(m); m.position.y -= b2.max.y - piv.position.y; m.position.x -= (b2.min.x + b2.max.x) / 2 - piv.position.x; m.position.z -= (b2.min.z + b2.max.z) / 2 - piv.position.z; m.traverse(o => { if (o.isMesh) o.castShadow = true; }); add(piv); room.anim.push(t => { piv.rotation.z = Math.sin(t * 0.8 + x) * 0.07; }); }
        add(box(surface('adzed_beam', 1, 0.5, { dir: X }), x - 1.8, cy + 1.6, x + 1.8, cy + 1.95, -1.85, -1.35)); break; }
      case 'crystal': { const col = [0x8a6aff, 0x4ad0e0, 0xff5a8a][Math.abs(Math.round(x)) % 3], cm = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.9 }); for (let i = 0; i < 5; i++) { const c = add(new THREE.Mesh(new THREE.OctahedronGeometry(rnd(0.18, 0.4)), cm)); c.scale.y = rnd(1.6, 3); c.position.set(x + rnd(-0.6, 0.6), y + rnd(0.3, 0.8), rnd(-2.6, -1.6)); c.rotation.z = rnd(-0.5, 0.5); } add(sprite(glowTex(), col, 3, 3, x, y + 0.8, -2, 0.35)); this.light(room, x, y + 1.2, -1, col, 9, 9); break; }
      case 'stalactite': for (let i = 0; i < 5; i++) { const h = rnd(0.6, 2.2), c = add(new THREE.Mesh(new THREE.ConeGeometry(rnd(0.12, 0.3), h, 6), stone)); c.rotation.x = Math.PI; c.position.set(x + rnd(-1.2, 1.2), ceil - h / 2, rnd(-2.8, 0.5)); } break;
      case 'pipe': { const pm = surface('heavy_rust', 2, 0.5, { dir: X, rough: 0.6 }), py = Math.min(top - 1, y + 3.4); const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 6, 10), pm)); c.rotation.z = Math.PI / 2; c.position.set(x, py, ZB + 0.5); for (const dx of [-2.6, 0, 2.6]) add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 5, 12), IRON)).rotateY(Math.PI / 2).position.set(x + dx, py, ZB + 0.5); break; }
      case 'web': add(plane(decal('cobweb', 0xd8d8e0, 0.5), 3.2, 3.2, x, ceil - 1.6, ZB + 0.3)); break;
      case 'telescope': { const tb = add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 10), BRASS)); tb.rotation.z = -0.9; tb.position.set(x, y + 2.3, -1.8); for (const a of [-0.35, 0.35]) { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 5), IRON)); l.rotation.z = a; l.position.set(x - Math.sin(a) * 0.9, y + 0.9, -1.8); } break; }
      case 'orrery': { const grp = new THREE.Group(); grp.position.set(x, Math.min(top - 2.5, y + 3), -1.6); grp.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), new THREE.MeshStandardMaterial({ color: 0xffc050, emissive: 0xff9020, emissiveIntensity: 1 }))); const rings = []; for (let i = 0; i < 3; i++) { const r = new THREE.Group(); r.add(new THREE.Mesh(new THREE.TorusGeometry(0.9 + i * 0.5, 0.025, 5, 40), BRASS)); const pl = new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.03, 8, 8), std([0x6a90ff, 0xc06a4a, 0x9ad0a0][i])); pl.position.x = 0.9 + i * 0.5; r.add(pl); r.rotation.x = 1.2 + i * 0.25; grp.add(r); rings.push(r); } add(grp); add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, grp.position.y - y, 6), BRASS)).position.set(x, (grp.position.y + y) / 2, -1.6); room.anim.push(t => rings.forEach((r, i) => { r.rotation.z = t * (0.7 - i * 0.18); })); this.light(room, x, grp.position.y, -0.6, 0xffc060, 9, 9); break; }
      case 'anvil': add(box(IRON, x - 0.5, y + 0.6, x + 0.6, y + 0.9, -2.2, -1.7)); add(box(IRON, x - 0.2, y + 0.3, x + 0.2, y + 0.6, -2.1, -1.8)); add(box(wood, x - 0.35, y, x + 0.35, y + 0.3, -2.3, -1.6)); break;
      case 'furnace': { const bm = surface('pv_hearth_brick', 1, 1, { dir: X }); add(box(bm, x - 1.7, y, x + 1.7, y + 3.4, ZB + 0.05, ZB + 1.5)); add(box(bm, x - 0.9, y + 3.4, x + 0.9, Math.min(top, y + 7), ZB + 0.05, ZB + 1.1)); add(plane(new THREE.MeshBasicMaterial({ map: lavaTex(), color: 0xffb060 }), 1.6, 1.3, x, y + 1.0, ZB + 1.52)); add(sprite(glowTex(), 0xff6a20, 5, 4, x, y + 1.1, ZB + 1.8, 0.5)); this.light(room, x, y + 1.3, -0.6, 0xff6a20, 18, 12); break; }
      case 'rubble': for (let i = 0; i < 9; i++) { const s = rnd(0.2, 0.7), r = add(box(stone, 0, 0, s, s * rnd(0.5, 1), 0, s)); r.position.set(x + rnd(-1.4, 1.4), y + s * 0.3, rnd(-2.8, -1.4)); r.rotation.set(rnd(0, 1), rnd(0, 3), rnd(0, 1)); } break;
      case 'altar': { const m = surface('mausoleum_marble', 1, 1, { dir: X }); add(box(m, x - 1.5, y, x + 1.5, y + 1.0, -2.8, -1.6)); add(box(std(0x7a1018, { roughness: 0.9 }), x - 1.0, y + 1.0, x + 1.0, y + 1.03, -2.85, -1.5)); for (const dx of [-1.1, 1.1]) { add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 6), BRASS)).position.set(x + dx, y + 1.3, -2.2); add(sprite(flameTex(), 0xffb050, 0.14, 0.24, x + dx, y + 1.75, -2.2)); } this.light(room, x, y + 1.9, -1.4, 0xffa860, 7, 8); break; }
      case 'arch': { const h = Math.min(6, top - y - 0.6); for (const dx of [-2.2, 2.2]) add(box(stone, x + dx - 0.35, y, x + dx + 0.35, y + h - 2.2, ZB + 0.05, ZB + 0.8)); const a = add(new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.35, 6, 20, Math.PI), stone)); a.position.set(x, y + h - 2.2, ZB + 0.42); break; }
      case 'column': add(this.pillar(x, y, Math.min(top - y, 12), T)); break;
      case 'waterfall': { const h = Math.min(top - y, 14), t2 = tex('moat_water').clone(); t2.needsUpdate = true; t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.repeat.set(1, h / 4); const wf = add(plane(new THREE.MeshBasicMaterial({ map: t2, color: 0x9ad0e0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), 2.4, h, x, y + h / 2, ZB + 0.3)); add(sprite(glowTex(), 0xa0d8e8, 5, 2.5, x, y + 0.6, ZB + 0.8, 0.4)); room.anim.push(t => { t2.offset.y = t * 0.9; }); this.light(room, x, y + 2, -1, 0x5ab0d0, 7, 9); break; }
      case 'mushroom': { const col = [0x4ad0c0, 0x9a70ff, 0x70e060][Math.abs(Math.round(x)) % 3], cm = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.5 }); for (let i = 0; i < 6; i++) { const h = rnd(0.25, 1.1), cx = x + rnd(-0.9, 0.9), cz = rnd(-2.7, -1.5); add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, h, 6), WAX)).position.set(cx, y + h / 2, cz); const cap = add(new THREE.Mesh(new THREE.SphereGeometry(0.1 + h * 0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cm)); cap.position.set(cx, y + h, cz); } add(sprite(glowTex(), col, 3, 2.4, x, y + 0.7, -2, 0.3)); this.light(room, x, y + 1.0, -1, col, 7, 8); break; }
    }
  }

  saveStatue(room, x, y) {
    const g = room.group, m = surface('marble', 1, 1, { dir: I, tint: 0xa08080 });
    g.add(box(m, x - 1.4, y, x + 1.4, y + 0.6, -2.6, 0.4));
    g.add(box(std(0x3a0a10, { roughness: 0.35, metalness: 0.3, emissive: 0x200004 }), x - 1.1, y + 0.6, x + 1.1, y + 1.5, -2.0, -0.2));
    const glow = sprite(glowTex(), 0xff2040, 6, 4, x, y + 1.6, -1, 0.6); g.add(glow);
    this.light(room, x, y + 2.4, 0, 0xff3050, 18, 12); room.anim.push(t => { glow.material.opacity = 0.45 + Math.sin(t * 2) * 0.15; });
    room.saveAt = { x, y };
  }
  warpMirror(room, x, y) {
    const g = room.group;
    const frame = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.18, 8, 30), BRASS); frame.scale.y = 1.6; frame.position.set(x, y + 2.8, -2.4); g.add(frame);
    const gm = new THREE.MeshStandardMaterial({ color: 0x0a0a14, metalness: 1, roughness: 0.08, emissive: 0x050510 });
    const glass = new THREE.Mesh(new THREE.CircleGeometry(1.45, 30), gm); glass.scale.y = 1.6; glass.position.set(x, y + 2.8, -2.45); g.add(glass);
    const sw = sprite(glowTex(), 0xd0b060, 3.4, 5.4, x, y + 2.8, -2.3, 0); g.add(sw);
    const src = this.light(room, x, y + 3, 0, 0xd0b060, 6, 9);
    room.warpAt = { x, y }; room.warpFx = on => { gm.emissive.setHex(on ? 0x1c1a2e : 0x050510); gm.color.setHex(on ? 0x2a2a4a : 0x0a0a14); sw.material.opacity = on ? 0.32 : 0; src.intensity = on ? 16 : 6; };
  }
  async shop(room, x, y) {
    const g = room.group, wood = surface('pv_dark_walnut', 1, 1, { dir: X });
    g.add(box(wood, x - 1.6, y, x + 1.6, y + 1.05, -1.9, -1.2)); g.add(box(wood, x - 1.7, y + 1.05, x + 1.7, y + 1.13, -2.0, -1.1));
    try { const k = await cloneGLTF('assets/monsters/tripo/necromancer_2.glb'); fitHeight(k.scene, 1.95); k.scene.position.set(x, y, -2.6); k.scene.rotation.y = 0.3; k.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = o.material.clone(); o.material.color.multiplyScalar(1.5); } }); const mx = new THREE.AnimationMixer(k.scene), c = k.animations.find(a => a.name === 'idle2') || k.animations.find(a => a.name === 'idle'); if (c) mx.clipAction(c).play(); g.add(k.scene); room.anim.push((t, dt) => mx.update(dt)); } catch (e) { console.warn(e); }
    for (const dx of [-1.2, 1.2]) { g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), WAX).translateX(x + dx).translateY(y + 1.33).translateZ(-1.5)); g.add(sprite(flameTex(), 0xffb050, 0.14, 0.24, x + dx, y + 1.62, -1.5)); }
    this.light(room, x, y + 2.2, -0.6, 0xffc070, 14, 10);
    room.shopAt = { x, y };
  }

  // ---------------------------------------------------------------------------------------------- per frame
  update(t, dt, room, cam) {
    for (const a of this.anim) a(t, dt);
    if (!room?.ready) return;
    for (const a of room.anim) a(t, dt);
    for (const f of room.flames) { const k = 0.82 + Math.sin(t * 9 + f.sx * 40) * 0.08 + Math.sin(t * 23) * 0.06; f.fl.scale.y = f.sx * 1.6 * (0.9 + k * 0.15); }
    for (const s of room.movers) { // moving platforms: remember this frame's delta so riders are carried
      const o = moverOffset(s.ref, t), w = s.w, nx = s.bx + o.x, ny = s.by + o.y; s.dx = nx - s.x0; s.dy = ny - s.y1; s.x0 = nx; s.x1 = nx + w; s.y1 = ny; s.y0 = ny - 0.45;
      if (s.mesh) s.mesh.position.set(nx + w / 2, ny, 0);
    }
    for (const bl of room.blades) { const a = Math.sin((t / (bl.period || 3) + (bl.phase || 0)) * Math.PI * 2) * 1.1; bl.tx = bl.px + Math.sin(a) * bl.len; bl.ty = bl.py - Math.cos(a) * bl.len; if (bl.mesh) bl.mesh.rotation.z = a; }
    // the nearest light sources borrow the pooled lights (constant light count = no shader recompiles between rooms)
    const src = room.sources; for (const s of src) s.d = Math.hypot(s.x - cam.x, (s.y - cam.y) * 1.3);
    src.sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.pool.length; i++) { const L = this.pool[i], s = src[i];
      if (!s || s.d > 30) { L.intensity = 0; continue; }
      const k = 0.84 + Math.sin(t * 9 + s.ph) * 0.08 + Math.sin(t * 23 + s.ph * 2) * 0.05, fade = THREE.MathUtils.clamp(1 - (s.d - 20) / 10, 0, 1);
      L.position.set(s.x, s.y, s.z); L.color.setHex(s.color); L.intensity = s.intensity * 1.5 * k * fade; L.distance = s.dist * 1.15; }
  }
}

export function fitHeight(obj, h) {
  obj.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(obj), cur = bb.max.y - bb.min.y;
  if (cur > 0) obj.scale.multiplyScalar(h / cur);
}

function gearGeo(r, teeth) {
  const sh = new THREE.Shape(), n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = (i % 4 < 2) ? r : r * 0.84; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.22, 0, Math.PI * 2, true); sh.holes.push(hole);
  for (let k = 0; k < 5; k++) { const h2 = new THREE.Path(), a = k / 5 * Math.PI * 2; h2.absarc(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.14, 0, Math.PI * 2, true); sh.holes.push(h2); }
  return new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false, curveSegments: 8 });
}
function bannerGeo(w, h) {
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, h / 2); sh.lineTo(w / 2, h / 2); sh.lineTo(w / 2, -h / 2 + w * 0.42); sh.lineTo(0, -h / 2); sh.lineTo(-w / 2, -h / 2 + w * 0.42); sh.lineTo(-w / 2, h / 2);
  const geo = new THREE.ShapeGeometry(sh), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5); return geo;
}

let _flame, _glow, _ray, _lava, _cloud, _glass;
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function glowTex() { return _glow ||= canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }); }
export function flameTex() { return _flame ||= canvasTex(32, 64, x => { const g = x.createRadialGradient(16, 44, 2, 16, 40, 22); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.4, 'rgba(255,180,60,.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(16, 2); x.quadraticCurveTo(30, 40, 16, 62); x.quadraticCurveTo(2, 40, 16, 2); x.fill(); }); }
function rayTex() { return _ray ||= canvasTex(32, 128, (x) => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 128); const h = x.createLinearGradient(0, 0, 32, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = h; x.fillRect(0, 0, 32, 128); }); }
// molten rock: dark crust islands over bright seams
export function lavaTex() { return _lava ||= canvasTex(256, 256, (x) => { x.fillStyle = '#ff7a10'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(255,240,150,.9)'); g.addColorStop(1, 'rgba(255,120,0,0)'); x.save(); x.translate(Math.random() * 256, Math.random() * 256); x.scale(rnd(10, 40), rnd(10, 40)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore(); } for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(${rnd(20, 60) | 0},${rnd(4, 14) | 0},0,${rnd(0.5, 0.95)})`; x.beginPath(); const cx = Math.random() * 256, cy = Math.random() * 256, r = rnd(8, 26); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, rr = r * rnd(0.6, 1.1); x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); } }); }
function cloudTex() { return _cloud ||= canvasTex(256, 128, (x) => { for (let i = 0; i < 46; i++) { const cx = rnd(30, 226), cy = rnd(40, 100), r = rnd(18, 46), g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 128); } }); }
// Leaded night glass: deep navy, moonlit toward the top, a few cool panes.
function glassTex() {
  return _glass ||= canvasTex(64, 128, (x) => {
    const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#4a5c96'); gr.addColorStop(0.45, '#26335e'); gr.addColorStop(1, '#121a34'); x.fillStyle = gr; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${140 + Math.random() * 60 | 0},220,${0.08 + Math.random() * 0.12})`; x.fillRect((Math.random() * 4 | 0) * 16, (Math.random() * 8 | 0) * 16, 16, 16); }
    x.strokeStyle = 'rgba(10,8,16,.85)'; x.lineWidth = 1.5; for (let i = 16; i < 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); } for (let i = 16; i < 128; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); }
  });
}
