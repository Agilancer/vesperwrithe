import * as THREE from 'three';
import { ROOMS, SW, SH, FLOOR, bounds, rowFloorY, roomSolids, moverOffset, DOOR_H, HOLE_W } from './rooms.js';
import { surface, cloneGLTF, loadGLTF, texture, LOW_MEM } from './assets.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const T0 = 'assets/game/tex/', I = 'assets/game/interior/', X = 'assets/game/tex2/', P3 = 'assets/game/tex3/', GL = 'assets/game/glass/'; // tex3: the Velscour/Phobos castle set (bm)
// the one dressed stone for every moulding (arcades, piers, cornices, caps): fine limestone; marble halls keep a darkened marble
const DRESS = ['limestone_1', T0, 0x8a847c], DRESS_RED = ['limestone_1', T0, 0x96706e]; // marble halls: the dressed stone with an oxblood wash
// [texture, dir, tint]. back = far wall, floor/wall = room shell, block = solid masonry and ledges, rug = carpet runner.
const THEMES = {
  outdoor:   { sky: 'moon', floor: ['road_sett', T0], wall: ['castle_stone', P3], block: ['castle_stone', P3], fog: [0x1a2238, 18, 110], amb: 0.55, moon: 1.6, trim: 0x9a8c70 },
  hall:      { arcade: true, back: ['wall_ashlar', I], floor: ['flags', T0], wall: ['ashlar', T0], block: ['ashlar', T0], fog: [0x0b0810, 16, 48], amb: 0.34, moon: 0.45, pillars: true, trim: 0x9a8c70 },
  shaft:     { arcade: true, back: ['block', T0], floor: ['flags', T0], wall: ['ashlar', T0], block: ['ashlar', T0], fog: [0x080a10, 16, 50], amb: 0.34, moon: 0.4, trim: 0x9a8c70 },
  shrine:    { arcade: true, back: ['marble', I, 0x9a7a7a], floor: ['floor_diamond', I], wall: ['ashlar', T0], block: ['oxblood_marble', X], fog: [0x12060a, 12, 40], amb: 0.42, moon: 0.3, trim: 0xc08a6a },
  gallery:   { arcade: true, back: ['panel', I], floor: ['boards', I], wall: ['ashlar', T0], block: ['pv_carved_panels', X], fog: [0x0c0a12, 16, 50], amb: 0.36, moon: 0.6, pillars: true, rug: ['carpet', I], trim: 0xb09060 },
  crypt:     { arcade: true, fire: 0xffd29a, back: ['cata_wall', I], floor: ['cata_floor', I], wall: ['cata_wall2', I], block: ['cata_block', I], fog: [0x05070a, 10, 36], amb: 0.3, moon: 0.2, trim: 0x7a8a80 },
  chapel:    { arcade: true, back: ['wall_rough', I], floor: ['flags', T0], wall: ['ashlar', T0], block: ['pv_carved_stone', X], fog: [0x0e0a14, 18, 60], amb: 0.32, moon: 0.8, pillars: true, trim: 0x9a8c70 },
  throne:    { arcade: true, dress: DRESS_RED, back: ['keep_wall_b', P3, 0xa89cb0], floor: ['rich_flags', P3, 0x8a8090], wall: ['ashlar', T0], block: ['oxblood_marble', X], fog: [0x0a0610, 18, 60], amb: 0.32, moon: 0.6, pillars: true, rug: ['pv_red_gothic', X], trim: 0xc0a060 },
  courtyard: { sky: 'moon', wallH: 4, backWall: ['pv_curtain_granite_a', X], floor: ['pv_courtyard_setts_a', X], wall: ['pv_curtain_granite_b', X], block: ['pv_rusticated_plinth_a', X], fog: [0x161c30, 20, 110], amb: 0.5, moon: 1.7, trim: 0x8a94a8 },
  vestibule: { arcade: true, dress: DRESS_RED, back: ['pv_limestone_interior_a', X, 0x8a847c], floor: ['pv_velscour_inlay_a', X, 0x8a8078], wall: ['pv_keep_dressed_stone_a', X], block: ['oxblood_marble', X], fog: [0x0e0a12, 20, 70], amb: 0.4, moon: 0.6, pillars: true, rug: ['pv_red_gothic', X], trim: 0xd0b070 },
  servants:  { back: ['pv_warm_grey_plaster', X], wainscot: ['pv_wood_panelling', X], floor: ['worn_floorboards', X], wall: ['pv_city_clay_brick_a', X], block: ['pv_hearth_brick', X], fog: [0x100b08, 14, 46], amb: 0.36, moon: 0.3, trim: 0xa07a50, beams: true },
  aqueduct:  { back: ['waterline_wall', X], floor: ['pv_undercroft_blocks_a', X], wall: ['pv_undercroft_blocks_c', X], block: ['pv_undercroft_blocks_b', X], fog: [0x06100e, 12, 44], amb: 0.32, moon: 0.25, trim: 0x6a9a8a, damp: true },
  cistern:   { arcade: true, back: ['pv_bastion_basalt_a', X], floor: ['pv_hall_flagstones_c', X], wall: ['pv_bastion_basalt_b', X], block: ['pv_bastion_basalt_c', X], fog: [0x040c12, 14, 60], amb: 0.3, moon: 0.3, pillars: true, trim: 0x5a9ab0, damp: true },
  ossuary:   { back: ['bone_wall', X], floor: ['bone_joint_flags', X], wall: ['bone_inlay_stone', X], block: ['bone_plaster', X], fog: [0x0c0a08, 14, 52], amb: 0.36, moon: 0.4, trim: 0xd0c4a0 },
  prison:    { back: ['pv_curtain_granite_c', X, 0x8a8a90], floor: ['ward_paving', X], wall: ['riveted_plate', X], block: ['heavy_rust', X], fog: [0x0a0806, 12, 44], amb: 0.3, moon: 0.3, trim: 0xb07040, bars: true },
  portrait:  { back: ['pv_red_damask', X], floor: ['worn_floorboards', X, 0xb09080], wall: ['pv_walnut_panel', X], block: ['black_panelling', X], fog: [0x100608, 16, 50], amb: 0.36, moon: 0.4, rug: ['pv_wine_wool', X], trim: 0xc8a050, wainscot: ['pv_oak_panel', X] },
  library:   { back: ['book_spines', X], floor: ['oak_planks', X], wall: ['pv_dark_walnut', X], block: ['pv_carved_wood', X], fog: [0x0c0806, 16, 52], amb: 0.38, moon: 0.3, rug: ['pv_blue_geometric', X], trim: 0xc09a50 },
  garden:    { sky: 'moon', wallH: 3.6, backWall: ['pv_curtain_granite_b', X], floor: ['dead_grass', X], wall: ['pv_curtain_granite_d', X], block: ['moss_1', T0], fog: [0x101a1a, 18, 100], amb: 0.48, moon: 1.6, trim: 0x6a8a50, trimGlow: 0.07, ivy: true },
  menagerie: { back: ['pv_keep_dressed_stone_b', X], floor: ['straw_ground', X], wall: ['pv_keep_dressed_stone_c', X], block: ['riveted_plate', X], fog: [0x0c0a06, 14, 50], amb: 0.34, moon: 0.4, trim: 0xa08040, bars: true },
  catacomb:  { arcade: true, fire: 0xffd29a, back: ['skulls', I], floor: ['cata_floor2', I], wall: ['cata_wall3', I], block: ['cata_block', I], fog: [0x060606, 9, 34], amb: 0.28, moon: 0.15, trim: 0xb0a890 },
  royalcrypt:{ arcade: true, fire: 0xffdcb0, back: ['mausoleum_marble', X, 0x8a8a98], floor: ['bone_checker', X, 0x8a8078], wall: ['pv_chalk_ashlar', X], block: ['mausoleum_marble', X], fog: [0x0a0a10, 12, 44], amb: 0.36, moon: 0.3, pillars: true, trim: 0xc8c8e0 },
  clock:     { back: ['bronze_plates', X, 0x9a9080], floor: ['walk_paving', X], wall: ['riveted_plate', X], block: ['bronze_plates', X], fog: [0x0c0a06, 16, 56], amb: 0.36, moon: 0.4, trim: 0xd0a040, cogs: true },
  mine:      { back: ['granite_cliff', X], floor: ['ash_clay_ground', X], wall: ['obsidian', X], block: ['keep_basalt', X], fog: [0x06060a, 10, 40], amb: 0.28, moon: 0.2, trim: 0x8070b0 },
  forge:     { back: ['ph_soot_brick', T0], floor: ['ash_street', X], wall: ['pv_smoky_rose_brick', X], block: ['pv_hearth_brick', X, 0x9a8a80], fog: [0x140804, 12, 46], amb: 0.34, moon: 0.2, trim: 0xff8a40, heat: true },
  magma:     { back: ['obsidian', X], floor: ['scree', X, 0x8a7a70], wall: ['keep_basalt', X], block: ['bloodstone', X, 0x6a5a58], fog: [0x180604, 12, 48], amb: 0.32, moon: 0.2, trim: 0xff6a20, heat: true },
  mirror:    { arcade: true, back: ['pv_ivory_lime_plaster', X, 0x9a94a8], floor: ['bone_checker', X, 0xc0b8d0], wall: ['mausoleum_marble', X], block: ['pv_carved_stone', X, 0xc8c0d8], fog: [0x0c0a14, 16, 56], amb: 0.42, moon: 0.5, pillars: true, rug: ['pv_plum_wool', X], trim: 0xd0c0ff },
  observatory:{ back: ['pv_keep_dressed_stone_c', X, 0x7078b0], floor: ['pv_velscour_inlay_c', X], wall: ['pv_keep_dressed_stone_c', X], block: ['pv_keep_dressed_stone_b', X, 0xa0a8d0], starBand: true, fog: [0x060814, 16, 60], amb: 0.38, moon: 0.6, trim: 0x90a8ff, stars: true },
  rampart:   { sky: 'storm', wallH: 1.3, backWall: ['castle_stone', P3], floor: ['walk_paving', X], wall: ['castle_stone', P3], block: ['keep_wall_b', P3], fog: [0x10141e, 20, 120], amb: 0.5, moon: 1.3, trim: 0x8a94a8, merlons: true },
  belfry:    { back: ['pv_curtain_granite_d', X], floor: ['tar_boards', X], wall: ['pv_curtain_granite_a', X], block: ['adzed_beam', X], fog: [0x0a0c14, 16, 60], amb: 0.36, moon: 0.7, trim: 0xb0b8d0, beams: true },
  sanctum:   { arcade: true, back: ['keep_smooth', P3, 0x8a84b0], floor: ['pv_bastion_basalt_d', X], wall: ['keep_basalt', X], block: ['obsidian', X], fog: [0x04030a, 12, 50], amb: 0.3, moon: 0.3, trim: 0x9070ff, stars: true },
  hollow:    { arcade: true, back: ['pv_keep_dressed_stone_a', X, 0x9a8a78], dress: DRESS_RED, floor: ['pv_velscour_inlay_d', X, 0x8a8078], wall: ['bloodstone', X], block: ['oxblood_marble', X], fog: [0x100604, 18, 70], amb: 0.4, moon: 0.5, pillars: true, rug: ['pv_red_gothic', X], trim: 0xffc050 },
};
export const ZB = -3.4, ZF = 2.6; // back wall depth, front lip of floors (collision depth)
export const FRONT = 1.6; // where an interior floor's moulded front edge is drawn: the slab no longer eats the frame
// Real size (m) one repeat of a surface covers, so ashlar courses, skulls and book spines read at life size.
const TILE = { castle_stone: 2.4, keep_wall_b: 2.2, keep_smooth: 2.6, keep_plinth: 2.4, rich_flags: 2.6, ossuary_wall: 1.8, bone_ashlar: 1.8, undercroft: 2.4, undercroft_b: 2.4, sewer_brick: 1.8, sewer_floor: 2.4, setts: 2.2, wall_setts: 2.2, limestone_1: 1.1, oxblood_marble: 0.8, wall_ashlar: 2.0, ashlar: 2.2, block: 2.0, flags: 2.6, skulls: 1.3, skulls2: 1.3, skulls3: 1.3, skulls_a: 1.3, skulls_b: 1.3, femurs: 1.5, niches: 3.2, bone_wall: 1.6, book_spines: 2.4, tracery: 3.6, arcade: 3.6, marble: 2.2, panel: 2.4, panel2: 2.4, cata_bones: 1.6, bones_ground: 1.6 };
const tileOf = name => TILE[name] ?? (/damask|brocade|velvet|fabric|leather|wallcloth|wool/.test(name) ? 1.4 : /floor|flag|paving|plank|board|setts|inlay|checker|tiles|road|ground|grass|dirt|scree|straw/.test(name) ? 2.8 : 2.4);

// Alternate surfaces per theme, picked per room (stable hash of the room id) so no two halls of an area are
// dressed alike and the whole Bellmourn texture library is in play. 'name' = tex2, 'name@T' = tex, 'name@I' = interior.
const ALT = {
  outdoor:   { floor: 'road_flag@T road_stones@T road_1@T', block: 'stone@T' },
  hall:      { floor: 'pv_hall_flagstones_a pv_hall_flagstones_b pv_hall_flagstones_d road_flag@T rich_flags@P', block: 'course@T stone@T castle_stone@P' },
  shaft:     { floor: 'road_stones@T' },
  shrine:    { back: 'limewash@I pv_cream_limewash', floor: 'dye_flags' },
  gallery:   { back: 'panel2@I pv_ochre_panels pv_painted_panelling pv_linen_panels', floor: 'wood_a0@I wood_a1@I wood_a2@I wood_a3@I', block: 'pv_brown_oak' },
  crypt:     { back: 'cata_wall4@I cata_blood@I seep@I undercroft@P undercroft_b@P', floor: 'cata_floor3@I cata_floor4@I cata_v_floor@I', block: 'cata_rubble@I cata_roof@I' },
  chapel:    { back: 'pv_warm_limestone arcade@I tracery@I', floor: 'pv_hall_flagstones_b' },
  throne:    {  },
  courtyard: { backWall: 'curtain_granite' },
  servants:  { back: 'pv_aged_lime_plaster pv_aged_ochre_plaster pv_cream_limewash pv_wattle_plaster pv_timber_plaster', floor: 'char_planks ph_boards@T road_plank@T wood_b0@I wood_b1@I wood_b2@I wood_b3@I', wall: 'ph_poor_brick@T pv_cream_brick', block: 'pv_hearth_sandstone' },
  aqueduct:  { back: 'sewer_brick@P undercroft_b@P', floor: 'wharf_deck fen_1@T sewer_floor@P' },
  cistern:   { floor: 'dye_flags', block: 'basalt_columns' },
  ossuary:   { back: 'skulls_a@I skulls_b@I ossuary_wall@P', floor: 'cata_bones@I', block: 'bone_rubble bone_ashlar@P' },
  prison:    { block: 'rust_1@T' },
  portrait:  { back: 'pv_green_damask pv_damask_wall pv_plum_fabric pv_textured_velvet pv_embossed_leather', floor: 'pv_honey_oak', wainscot: 'pv_linen_panels pv_brown_oak' },
  library:   { floor: 'wood_c0@I wood_c1@I', block: 'pv_carved_wood pv_dark_walnut' },
  garden:    { floor: 'grass_1@T grass_2@T grass_3@T dirt_1@T pinefloor_1@T', block: 'leaves@T leaves_2@T leaves_3@T leaves_4@T moss_patches' },
  menagerie: { back: 'pv_keep_dressed_stone_d', floor: 'dirt_2@T street_litter' },
  catacomb:  { back: 'skulls3@I femurs@I niches@I', floor: 'cata_earth@I bones_ground blood_tiles' },
  royalcrypt:{ wall: 'pv_limestone_interior_b' },
  clock:     { floor: 'road_plank@T' },
  mine:      { back: 'basalt_1@T granite_1@T snowrock_1@T', floor: 'dirt_3@T road_gravel@T road_dirt@T', block: 'basalt_columns' },
  forge:     { back: 'sooty_plaster fireback soot@I', floor: 'ash_1@T road_ash@T' },
  mirror:    { back: 'pv_linen_plaster pv_rose_plaster pv_sage_plaster pv_smoke_plaster pv_taupe_limewash pv_linen_wallcloth' },
  rampart:   { floor: 'frost_1@T snow_1@T', backWall: 'curtain_granite' },
  belfry:    { floor: 'road_plank@T' },
  sanctum:   {  },
};
const DIRS = { T: T0, I, P: P3 };
let SEED = 0; // set per room while it is being raised
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
// the theme's surface for this room: its default, or one of the alternates
function pickSpec(themeName, T, key) {
  const base = T[key], alts = ALT[themeName]?.[key]; if (!alts || !base) return base;
  const list = alts.split(' '), i = (SEED >>> (key.length * 3)) % (list.length + 2); if (i >= list.length) return base; // the default stays the most common
  const [n, d] = list[i].split('@'); return [n, d ? DIRS[d] : X, base[2]];
}

function mat(spec, w, h, opts = {}) {
  if (!spec) return null;
  let [name, dir = T0, tint] = spec;
  if (/^pv_.*_a$/.test(name)) name = name.slice(0, -1) + 'abcd'[SEED % 4]; // the four cuts of a stone are interchangeable
  const k = /damask|brocade|velvet|fabric|leather|wallcloth/.test(name) ? 2 : 1; // cloth patterns are fine-grained
  const rx = Math.max(0.5, Math.round(w / 4 * 2 * k) / 2), ry = Math.max(0.5, Math.round(h / 4 * 2 * k) / 2);
  return surface(name, rx, ry, { dir, tint, ...opts });
}
// a surface for world-space UVs (1 UV = 1 m): repeat = 1 / the surface's real size
function tm(spec, vc = false, ns) { if (!spec) return null; let [name, dir = T0, tint] = spec; if (/^pv_.*_a$/.test(name)) name = name.slice(0, -1) + 'abcd'[SEED % 4]; const k = 1 / tileOf(name); return surface(name, k, k, { dir, tint, vc, ns }); }
// box-map any geometry already placed in world space: u, v in metres, picked by the face's dominant axis
function worldUV(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i), ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ax >= ay && ax >= az) { uv[i * 2] = nx > 0 ? -z : z; uv[i * 2 + 1] = y; } else if (ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = ny > 0 ? -z : z; } else { uv[i * 2] = nz > 0 ? x : -x; uv[i * 2 + 1] = y; }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
function wbox(m, x0, y0, x1, y1, z0 = ZB, z1 = ZF) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); worldUV(g);
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; return mesh;
}
function wplane(m, w, h, x, y, z) { const g = new THREE.PlaneGeometry(w, h); g.translate(x, y, z); worldUV(g); const p = new THREE.Mesh(g, m); p.receiveShadow = true; return p; }
// a rounded nosing along x: the lit edge of a walkable surface, carved rather than glowing
function nosing(m, x0, x1, y, z, r = 0.09) { const g = new THREE.CylinderGeometry(r, r, x1 - x0, 8, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); g.rotateX(Math.PI / 2); g.translate((x0 + x1) / 2, y - r, z); worldUV(g); const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; return mesh; }
// a pointed (two-centred) arch outline, springing at (±span/2, 0)
function archShape(span, rise, n = 18, drop = 0) { const h = span / 2, r = (rise * rise + h * h) / (2 * h), c = r - h, a1 = Math.atan2(rise, -c), sh = new THREE.Shape(); sh.moveTo(-h, -drop); for (let i = 0; i <= n; i++) { const a = Math.PI - (Math.PI - a1) * i / n; sh.lineTo(c + r * Math.cos(a), r * Math.sin(a)); } for (let i = n - 1; i >= 0; i--) { const a = Math.PI - (Math.PI - a1) * i / n; sh.lineTo(-(c + r * Math.cos(a)), r * Math.sin(a)); } sh.lineTo(h, -drop); return sh; }

// ---- the Blender castle kit (tools/build_castle_kit.py): baked into world space per room, merged per material
let _ck; function castleKit() { return _ck ||= loadGLTF('assets/game/props/castle_kit.glb').then(g => { g.scene.updateMatrixWorld(true); return g.scene; }); }
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function kitPiece(room, kitScene, name, slots, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) {
  const src = kitScene.getObjectByName(name); if (!src) return;
  const M = new THREE.Matrix4().compose(_v1.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _v2.set(sx, sy, sz)), inv = src.matrixWorld.clone().invert();
  src.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone(); g.applyMatrix4(M.clone().multiply(inv.clone().multiply(o.matrixWorld))); worldUV(g);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    const m = slots[(o.material.name || 'stone').replace(/\.\d+$/, '')] || slots.stone;
    room.batch ||= new Map(); if (!room.batch.has(m)) room.batch.set(m, []); room.batch.get(m).push(g);
  });
}
function flushKit(room) {
  if (!room.batch) return;
  for (const [m, gs] of room.batch) {
    const vc = gs.filter(g => g.attributes.color), plain = gs.filter(g => !g.attributes.color);
    for (const set of [vc, plain]) { if (!set.length) continue; const merged = mergeGeometries(set, false); if (merged) { const mesh = new THREE.Mesh(merged, m); mesh.castShadow = mesh.receiveShadow = true; room.group.add(mesh); } }
    gs.forEach(g => g.dispose());
  }
  room.batch = null;
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function box(m, x0, y0, x1, y1, z0 = ZB, z1 = ZF) {
  const mesh = new THREE.Mesh(boxGeo, m);
  mesh.scale.set(x1 - x0, y1 - y0, z1 - z0); mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const RECESS = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }), GLOW = new THREE.MeshBasicMaterial({ color: 0xffb060, fog: false });
let _gear, ENV = null; const GEAR = () => _gear ||= new THREE.MeshStandardMaterial({ color: 0x9a6c34, metalness: 0.82, roughness: 0.5, roughnessMap: texture(P3 + 'iron_c.webp'), envMap: ENV, envMapIntensity: 1.4, vertexColors: true, emissive: 0x100804 }); // dark worn bronze: wear from the iron map, cavity shading baked per vertex
const BEAM = std(0x2a1c12, { roughness: 0.85 }), IRON = new THREE.MeshStandardMaterial({ color: 0x6a6460, map: texture(P3 + 'iron_c.webp'), metalness: 0.7, roughness: 0.55 }), BRASS = std(0x7a5a2a, { metalness: 0.9, roughness: 0.42 }), WAX = std(0xe8dcc0, { roughness: 0.6 }), DARK = std(0x15121a, { roughness: 0.7 });
function tex(name, dir = X) { return texture(`${dir}${name}_c.webp`); }
// white-on-black mask textures become tinted decals
function decal(name, color, opacity = 1) { return new THREE.MeshBasicMaterial({ color, alphaMap: tex(name), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }); }
// a hanging chain: the strip texture tiles down its length instead of stretching
function chain(color, w, h, x, y, z) { color = 0x6a6a6a; const t = tex('chain_strip').clone(); t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, Math.max(1, Math.round(h / (w * 3.2)))); const m = new THREE.MeshStandardMaterial({ color, alphaMap: t, alphaTest: 0.12, metalness: 0.8, roughness: 0.55, side: THREE.DoubleSide }); return plane(m, Math.max(w, 0.34) * 3.2, h, x, y, z); }
function plane(m, w, h, x, y, z) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); return p; }
const sprite = (map, color, sx, sy, x, y, z, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity })); s.scale.set(sx, sy, 1); s.position.set(x, y, z); return s; };
const rnd = (a, b) => a + Math.random() * (b - a);
// Gothic kit modelled in Blender (tools: Blender MCP): window_tracery, rose_tracery, chandelier, sarcophagus.
let _kit; async function kit(name) { _kit ||= loadGLTF('assets/game/props/gothic_kit.glb'); const src = (await _kit).scene.getObjectByName(name); if (!src) return null; const o = src.clone(true); o.position.set(0, 0, 0); o.traverse(c => { if (c.isMesh) c.castShadow = true; }); return o; }

export class World {
  constructor(scene) {
    this.scene = scene; this.rooms = []; this.solids = []; this.anim = []; this.pool = [];
    ENV = null;
    for (let i = 0; i < (LOW_MEM ? 5 : 9); i++) { const L = new THREE.PointLight(0xff9a50, 0, 14, 1.6); scene.add(L); this.pool.push(L); } // fewer pooled lights on phones
  }

  // metals reflect a dark, torch-lit castle room (not the white studio the rest of the scene uses): small hot glints, dark bodies
  setMetalEnv(env) { ENV = env; for (const m of [IRON, BRASS]) { m.envMap = env; m.envMapIntensity = 1.0; m.needsUpdate = true; } IRON.roughness = 0.45; BRASS.roughness = 0.42; }
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
    SEED = hashStr(def.id); const seed = SEED, P_ = k => pickSpec(def.theme, T, k), S_ = { wall: P_('wall'), floor: P_('floor'), block: P_('block'), back: P_('back'), backWall: P_('backWall'), wainscot: P_('wainscot') }; room.spec = S_;
    const KIT = await castleKit(); room.wallRects = [];
    const wallM = tm(S_.wall), floorM = tm(S_.floor), blockM = tm(S_.block), capM = [blockM, blockM, floorM, blockM, blockM, blockM]; // block tops read as floor: the walkable surface shows by value, not glow
    const TRIM = std(T.trim, { emissive: T.trim, emissiveIntensity: Math.min(0.04, T.trimGlow ?? 0.04), roughness: 0.7 }), NOSE = std(T.trim, { emissive: T.trim, emissiveIntensity: 0.02, roughness: 0.8 });
    room.trim = TRIM;
    const fy = b.y0 + FLOOR, timber = /library|belfry|clock|servants|prison|portrait/.test(def.theme), slots = this.kitSlots(room, KIT); room.kit = KIT; room.slots = slots;
    const hasBelow = (s) => room.solids.some(o => o !== s && !o.oneway && o.y1 <= s.y0 + 0.05 && o.y1 >= s.y0 - 0.05 && o.x0 < s.x1 - 0.2 && o.x1 > s.x0 + 0.2);
    for (const s of room.solids) {
      switch (s.kind) {
        case 'floor': {
          const z1 = def.open ? ZF : FRONT;
          add(wbox([wallM, wallM, floorM, wallM, blockM, wallM], s.x0, s.y0 - (def.open ? 4 : 1), s.x1, s.y1, ZB, z1));
          add(nosing(blockM, s.x0, s.x1, s.y1 + 0.004, z1, 0.11));
          add(wbox(DARK, s.x0, s.y1 - 0.34, s.x1, s.y1 - 0.2, z1 - 0.04, z1 + 0.01)); // shadow line under the nosing
          break;
        }
        case 'ceil': add(wbox(wallM, s.x0, s.y0, s.x1, s.y1 + 0.99, ZB, FRONT)); break;
        case 'wall': if (!def.open || T.backWall) add(wbox(wallM, s.x0, s.y0, s.x1, Math.min(s.y1, b.y1 + 1.5), ZB, 1.2)); break;
        case 'ledge': add(wbox(capM, s.x0, s.y0, s.x1, s.y1, ZB, 1.6)); add(nosing(blockM, s.x0, s.x1, s.y1 + 0.004, 1.6)); break;
        case 'plat': {
          const w = s.x1 - s.x0;
          const ground = Math.max(...[s.x0 + 0.3, s.x1 - 0.3].map(px => this.groundAt(room, px, s.y0, def.open)));
          if (timber) { // a timber gallery: boards on joists; posts to the floor with knee braces in the picture plane, or iron hangers from the vault
            const wood = tm(['oak_planks', X], false), beam = tm(['adzed_beam', X], false);
            add(wbox(wood, s.x0, s.y1 - 0.12, s.x1, s.y1, ZB, 0.9)); add(wbox(beam, s.x0, s.y1 - 0.42, s.x1, s.y1 - 0.12, 0.5, 0.82)); add(wbox(beam, s.x0, s.y1 - 0.42, s.x1, s.y1 - 0.12, ZB + 0.2, ZB + 0.52));
            if (s.y0 - ground < 7.5) for (const [px, d] of [[s.x0 + 0.25, 1], [s.x1 - 0.25, -1]]) {
              add(wbox(beam, px - 0.13, ground, px + 0.13, s.y1 - 0.42, -1.1, -0.84)); add(wbox(beam, px - 0.13, ground, px + 0.13, s.y1 - 0.42, ZB + 0.2, ZB + 0.46));
              const kb = wbox(beam, -0.07, -0.75, 0.07, 0.75, -0.07, 0.07); kb.geometry.rotateZ(d * 0.785); kb.geometry.translate(px + d * 0.5, s.y1 - 0.92, -0.97); worldUV(kb.geometry); add(kb);
            } else for (const px of [s.x0 + 0.3, s.x1 - 0.3]) { const up = this.ceilingAt(room, px, s.y1); add(wbox(IRON, px - 0.035, s.y1 - 0.4, px + 0.035, up, 0.62, 0.69)); add(wbox(IRON, px - 0.035, s.y1 - 0.4, px + 0.035, up, ZB + 0.3, ZB + 0.37)); }
          } else if (def.open && s.y0 - ground < 9 && s.y0 - ground > 1.6) { // open air: a ruined cloister bay — a pointed arch on two piers carries the slab
            const endM = tm(T.dress || DRESS, false, 0.6); add(wbox([endM, endM, floorM, blockM, blockM, blockM], s.x0, s.y0, s.x1, s.y1, -1.6, 0.8)); add(nosing(blockM, s.x0, s.x1, s.y1 + 0.004, 0.8));
            const c = (s.x0 + s.x1) / 2, sx = Math.max(0.5, w / 6.667), H2 = s.y0 - ground, sy = Math.max(0.3, Math.min(1.0, (H2 - 1.7) / 4.0, sx * 1.15)), spring = s.y0 - 4.0 * sy, P = { ...slots, stone: slots.trim }, sc = 0.62;
            for (const part of ['_spandrel', '_arch', '_hood']) kitPiece(room, KIT, 'bay_low' + part, part === '_spandrel' ? { ...slots, stone: tm(S_.block, true) } : P, c, spring, -1.75, sx, sy, 1);
            for (const px of [c - 2.83 * sx, c + 2.83 * sx]) this.kitPier(room, px, ground, spring, sc, -1.25);
          } else if (def.open) { // high in open air: hung on chains
            add(wbox(capM, s.x0, s.y0, s.x1, s.y1, -1.6, 0.8)); add(nosing(blockM, s.x0, s.x1, s.y1 + 0.004, 0.8));
            for (const px of [s.x0 + 0.3, s.x1 - 0.3]) add(chain(0x6a6a6a, 0.22, 9, px, s.y1 + 4.5, -0.4));
          } else { // a stone slab built into the wall, carried on carved corbels
            const endM = tm(T.dress || DRESS, false, 0.6); add(wbox([endM, endM, floorM, blockM, endM, blockM], s.x0, s.y0, s.x1, s.y1, ZB, 0.8)); add(nosing(blockM, s.x0, s.x1, s.y1 + 0.004, 0.8));
            const n = Math.max(2, Math.ceil(w / 2)); for (let i = 0; i < n; i++) { const cx = s.x0 + 0.4 + (w - 0.8) * (n === 1 ? 0.5 : i / (n - 1)); kitPiece(room, KIT, 'corbel', { stone: blockM && tm(S_.block, true) }, cx, s.y0, ZB + 1.7); }
          }
          break;
        }
        case 'block': {
          const niche = /catacomb|ossuary|crypt/.test(def.theme) && s.y1 - s.y0 >= 1.8 && s.x1 - s.x0 <= 3, hang = !hasBelow(s) && s.y0 > fy + 0.2 && room.solids.some(o => o !== s && o.y0 <= s.y1 + 0.05 && o.y0 >= s.y1 - 0.05 && o.x0 < s.x1 && o.x1 > s.x0);
          if (niche) { const nm = tm(['niches', I]); add(wbox([blockM, blockM, floorM, blockM, nm, blockM], s.x0, s.y0, s.x1, s.y1, ZB, 1.75)); } // a pier of burial niches
          else if (hang && def.theme === 'prison' && s.x1 - s.x0 < 1.5) { // a cell front: the hanging stub is its lintel's end; a grille set back between jambs
            const dm = tm(T.dress || DRESS, false, 0.6), x0 = s.x0 - 3.2, x1 = s.x1, gy = s.y0;
            add(wbox(dm, x0 - 0.1, gy - 0.05, x1 + 0.1, gy + 0.55, ZB, ZB + 0.95)); add(nosing(dm, x0 - 0.1, x1 + 0.1, gy + 0.55, ZB + 0.95, 0.07)); // lintel; the wall and its string course run on above it
            add(wbox(dm, x1 - 0.45, fy, x1, gy, ZB, ZB + 0.85)); add(wbox(dm, x0, fy, x0 + 0.45, gy, ZB, ZB + 0.85)); add(wbox(dm, x0 + 0.45, fy, x1 - 0.45, fy + 0.16, ZB, ZB + 0.6)); // jambs and sill
            const cot = tm(['oak_planks', X, 0x7a6a5a]); add(wbox(cot, x0 + 0.7, fy + 0.45, x0 + 2.3, fy + 0.55, ZB + 0.05, ZB + 0.35)); for (const lx of [x0 + 0.8, x0 + 2.2]) add(wbox(cot, lx - 0.05, fy, lx + 0.05, fy + 0.45, ZB + 0.1, ZB + 0.3));
            add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), std(0x7a7468, { roughness: 0.9 }))).position.set(x1 - 1.0, fy + 0.3, ZB + 0.2);
            const bars = new THREE.MeshStandardMaterial({ map: tex('wrought_bars'), metalness: 0.6, roughness: 0.6, transparent: true, alphaTest: 0.3 }), gp = plane(bars, x1 - x0 - 0.9, gy - fy, (x0 + x1) / 2, (gy + fy) / 2, ZB + 0.4); add(gp);
            const cell = plane(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.62, depthWrite: false }), x1 - x0 - 0.9, gy - fy, (x0 + x1) / 2, (gy + fy) / 2, ZB + 0.38); add(cell); room.cells = (room.cells || []).concat((x0 + x1) / 2);
            break;
          }
          else if (def.theme === 'library' && hang && s.x1 - s.x0 >= 2) { // a carved press of books: spines, pilasters, a cornice, a dark kick-space under it
            const wd = tm(['pv_carved_wood', X]), bk = tm(['book_spines', X]); add(wbox([wd, wd, floorM, wd, bk, wd], s.x0, s.y0, s.x1, s.y1, ZB, 1.75)); add(wbox(wd, s.x0 - 0.12, s.y1 - 0.3, s.x1 + 0.12, s.y1, ZB, 1.95)); add(nosing(wd, s.x0 - 0.12, s.x1 + 0.12, s.y1 - 0.3, 1.95, 0.08)); for (const px of [s.x0, s.x1 - 0.3]) add(wbox(wd, px, s.y0, px + 0.3, s.y1 - 0.3, 1.6, 1.85)); add(wbox(DARK, s.x0 + 0.2, s.y0 - 0.02, s.x1 - 0.2, s.y0 + 0.25, 1.4, 1.78));
          }
          else add(wbox(capM, s.x0, s.y0, s.x1, s.y1, ZB, 1.75));
          if (T.heat && s.y1 - s.y0 > 0.8) { const ec = plane(decal('cracks', 0xff5a14, 0.75), Math.min(3, s.x1 - s.x0), Math.min(2.4, s.y1 - s.y0), (s.x0 + s.x1) / 2, s.y0 + Math.min(2.4, s.y1 - s.y0) / 2, 1.77); ec.material.blending = THREE.AdditiveBlending; add(ec); }
          add(nosing(s.ref.stair ? NOSE : blockM, s.x0, s.x1, s.y1 + 0.004, 1.75, 0.07));
          if (s.y0 > fy + 0.2 && !hasBelow(s)) { // a mass that hangs in the air needs a reason: stub piers to the floor, or corbels into the wall
            const pm = tm(T.dress || S_.block);
            if (s.y0 - fy < 4.2 && s.x1 - s.x0 > 1.6) for (const px of [s.x0 + 0.45, s.x1 - 0.45]) { add(wbox(pm, px - 0.32, fy, px + 0.32, s.y0, ZB, ZB + 0.75)); add(wbox(pm, px - 0.42, s.y0 - 0.22, px + 0.42, s.y0, ZB, ZB + 0.85)); }
            else for (const px of [s.x0 + 0.4, s.x1 - 0.4]) kitPiece(room, KIT, 'corbel', { stone: tm(S_.block, true) }, px, s.y0, ZB + 1.7);
          }
          break;
        }
        case 'crack': {
          const w = s.x1 - s.x0, h = s.y1 - s.y0, grp = new THREE.Group();
          grp.add(wbox(s.by === 'dive' ? floorM : blockM, s.x0, s.y0, s.x1, s.y1, ZB, s.by === 'dive' ? ZF : 1.85));
          const cr = plane(decal('cracks', s.by === 'dive' ? 0x7ae0f0 : 0x100c10, 0.95), Math.max(w, 1.4), Math.max(h, 1.4), (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, (s.by === 'dive' ? ZF : 1.85) + 0.02); grp.add(cr);
          if (s.by === 'dive') { const top = plane(decal('cracks', 0x7ae0f0, 0.9), w, 3, (s.x0 + s.x1) / 2, s.y1 + 0.012, -0.4); top.rotation.x = -Math.PI / 2; grp.add(top); }
          s.mesh = grp; add(grp); break;
        }
        case 'gate': this.gate(room, s); break;
        case 'echo': {
          const m = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xb090ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
          m.scale.set(s.x1 - s.x0, 0.3, 3); m.position.set((s.x0 + s.x1) / 2, s.y1 - 0.15, 0); m.visible = false; s.mesh = m; add(m);
          const edge = box(new THREE.MeshBasicMaterial({ color: 0xe0d0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), s.x0, s.y1 - 0.04, s.x1, s.y1, 1.45, 1.52); m.attach(edge);
          break;
        }
        case 'mover': {
          const w = s.x1 - s.x0, grp = new THREE.Group(), cog = !!s.ref.orbit || T.cogs;
          if (cog) { grp.add(box(tm(['oak_planks', X]), -w / 2, -0.16, w / 2, 0, -1.6, 1.6)); for (const zz of [-1.6, 1.5]) grp.add(box(IRON, -w / 2 - 0.05, -0.42, w / 2 + 0.05, -0.12, zz, zz + 0.12)); for (const xx of [-w / 2, w / 2 - 0.1]) grp.add(box(IRON, xx, -0.42, xx + 0.1, -0.12, -1.6, 1.62)); } else grp.add(box(tm(S_.block), -w / 2, -0.45, w / 2, 0, -1.6, 1.6)); grp.add(box(TRIM, -w / 2, -0.07, w / 2, 0.015, 1.56, 1.7));
          if (cog) { const c = new THREE.Mesh(gearGeo(0.8, 10), GEAR()); c.position.set(0, -0.5, -1.9); grp.add(c); room.anim.push((t) => { c.rotation.z = t * 1.5; }); }
          else for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) { const ch = chain(0x8a8580, 0.3, 14, dx, 7, -1.2); grp.add(ch); }
          s.mesh = grp; add(grp); break;
        }
      }
    }
    // back wall, or open sky
    if (T.back) add(wplane(tm(S_.back), W, H + 3, b.x0 + W / 2, b.y0 + H / 2, ZB));
    room.hung = []; // wall pieces already placed: { x0, x1, y }
    if (T.sky) await this.sky(room, T.sky, KIT);
    if (T.backWall) { // curtain wall behind open-air rooms, crenellated against the sky (a breast-high parapet on the battlements)
      const h = Math.min(H - 1, T.wallH ?? 9), bw = tm(S_.backWall); add(wbox(bw, b.x0, b.y0, b.x1, b.y0 + h, ZB - 1.2, ZB));
      for (let x = b.x0 + 1; x < b.x1 - 1; x += 2.4) add(wbox(bw, x, b.y0 + h, x + 1.2, b.y0 + h + 0.9, ZB - 1.2, ZB));
      add(plane(new THREE.MeshStandardMaterial({ map: stripTex('coping', Math.round(W / 3)), roughness: 0.9 }), W, 0.5, b.x0 + W / 2, b.y0 + h - 0.05, ZB + 0.03));
    }
    if (T.wainscot) for (let wy = b.y0 + FLOOR; wy < b.y1 - 3; wy += SH) add(wplane(tm(S_.wainscot), W, 1.6, b.x0 + W / 2, wy + 0.8, ZB + 0.03));
    if (T.rug) { const c = plane(surface(T.rug[0], Math.max(1, Math.round(W / 3)), 1, { dir: T.rug[1] }), W - 2, 2.2, b.x0 + W / 2, b.y0 + FLOOR + 0.012, -0.4); c.rotation.x = -Math.PI / 2; c.receiveShadow = true; add(c); }
    room.pillarX = []; if (T.arcade) this.arcade(room, KIT, slots);
    if (T.beams) for (let x = b.x0 + 2.5; x < b.x1 - 1; x += 5) add(box(surface('adzed_beam', 1, 0.5, { dir: X }), x - 0.2, b.y1 - FLOOR - 0.45, x + 0.2, b.y1 - FLOOR, ZB, 1.2));
    if (T.damp) for (let x = b.x0 + 4; x < b.x1 - 2; x += rnd(7, 12)) add(plane(decal(Math.random() < 0.5 ? 'damp_rise' : 'soot_streaks', 0x0a1410, 0.75), 6, 5, x, b.y0 + FLOOR + 2.5 + (Math.random() < 0.5 ? 0 : Math.min(H - 6, 3)), ZB + 0.04));
    if (T.heat || def.theme === 'catacomb' || def.theme === 'crypt') for (let x = b.x0 + 5; x < b.x1 - 2; x += rnd(9, 15)) add(plane(decal(T.heat ? 'soot_streaks' : 'blood_splashes', T.heat ? 0x050302 : 0x3a0406, 0.8), 5, 5, x, b.y0 + FLOOR + 3, ZB + 0.04));
    if (T.ivy) for (let x = b.x0 + 3; x < b.x1 - 3; x += rnd(8, 14)) add(plane(decal('dead_ivy', 0x2a3a1a, 0.95), 5, 5, x, b.y0 + FLOOR + 2.6, ZB + 0.05));
    if (T.bars) for (let x = b.x0 + 6; x < b.x1 - 4; x += 13.3) if (!(room.cells || []).some(c => Math.abs(c - x) < 5)) { const p = plane(new THREE.MeshStandardMaterial({ map: tex('wrought_bars'), metalness: 0.6, roughness: 0.6 }), 4, 4, x, b.y0 + FLOOR + 2.2, ZB + 0.06); add(p); }
    if (T.cogs) for (let x = b.x0 + 5; x < b.x1 - 3; x += rnd(9, 14)) for (let y = b.y0 + 4; y < b.y1 - 2; y += rnd(9, 14)) this.bgGear(room, x, y, rnd(1.2, 2.6));
    if (T.stars) { const n = Math.round(W * H / 6), pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([b.x0 + Math.random() * W, b.y0 + Math.random() * H, ZB + 0.1 + Math.random() * 0.4], i * 3); const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xc8d0ff, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); add(pts); room.anim.push(t => { pts.material.opacity = 0.65 + Math.sin(t * 1.3) * 0.25; }); }
    if (T.merlons) for (let x = b.x0 + 0.6; x < b.x1 - 1; x += 2.6) add(box(mat(S_.block, 1, 1), x, b.y0 + FLOOR, x + 1.3, b.y0 + FLOOR + 1.1, ZB + 0.1, ZB + 0.9));
    for (const sh of def.shallow || []) this.water(room, b.x0 + sh.x, b.y0 + (sh.y ?? FLOOR) - 0.02, sh.w, 0.34);
    for (const d of def.doors) if (d.side === 'W' || d.side === 'E') { if (!def.open) this.doorFrame(g, d.side === 'W' ? b.x0 : b.x1, rowFloorY(d.row) + FLOOR, wallM); }
    room.kit = KIT; room.slots = slots;
    // hazards
    for (const s of def.spikes) this.spikes(room, b.x0 + s.x, b.y0 + s.y, s.w);
    for (const l of def.lava) this.lava(room, b.x0 + l.x, b.y0 + l.y, l.w, l.h);
    for (const w of def.water) this.water(room, b.x0 + w.x, b.y0 + w.y, w.w, w.h);
    for (const bl of room.blades) this.blade(room, bl);
    for (const p of [...def.props].sort((a, c) => (/window/.test(c.t) ? 1 : 0) - (/window/.test(a.t) ? 1 : 0))) { try { await this.prop(room, p); } catch (e) { console.warn('prop', def.id, p.t, e); } }
    this.sconces(room); this.ribs(room);
    SEED = seed; this.dress(room, seed);
    flushKit(room);
    // SotN-style breakable candle stands in the play plane
    for (const bk of def.breakables) {
      const x = b.x0 + bk.x, y = b.y0 + (bk.y ?? FLOOR), grp = new THREE.Group(); grp.position.set(x, y, -0.55);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 1.1, 6), IRON); stem.position.y = 0.55;
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.08, 0.08, 8), IRON); dish.position.y = 1.12;
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 8), WAX); wax.position.y = 1.29;
      grp.add(stem, dish, wax, sprite(flameTex(), 0xffb050, 0.2, 0.34, 0, 1.55, 0), sprite(glowTex(), 0xff9040, 1.1, 1.1, 0, 1.5, 0, 0.5)); grp.traverse(o => { if (o.isMesh) o.renderOrder = 2; }); g.add(grp); room.breakables.push({ x, y, grp, broken: false });
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
  // Architectural dressing every room gets: plinth and string courses, a fade toward the vault, door leaves and
  // quoins, theme decals, and a staging pass for boss arenas.
  dress(room, seed) {
    const def = room.def, T = room.theme, b = room.b, g = room.group, W = b.x1 - b.x0, H = b.y1 - b.y0, th = def.theme;
    const rs = (n => () => (n = Math.imul(n ^ (n >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296)(seed || 1), pick = a => a[Math.floor(rs() * a.length)], rr = (a, c) => a + rs() * (c - a);
    const add = o => { g.add(o); return o; }, zw = ZB + 0.035, stripM = (name, rep, dir) => new THREE.MeshStandardMaterial({ map: stripTex(name, rep, dir), roughness: 0.9 });
    const indoors = !!T.back, stone = !/library|portrait|gallery|servants|mirror|hollow/.test(th);
    const free = (x, hw, y) => !room.hung.some(o => Math.abs(o.y - y) < 6 && x + hw + 1.2 > o.x0 && x - hw - 1.2 < o.x1), hang = (x, hw, y) => { for (const dx of [0, 3, -3, 6, -6]) if (x + dx > b.x0 + 2 && x + dx < b.x1 - 2 && free(x + dx, hw, y)) { room.hung.push({ x0: x + dx - hw, x1: x + dx + hw, y }); return x + dx; } return null; };
    if (T.backWall) { const h = Math.min(H - 1, T.wallH ?? 9), rep = Math.max(1, Math.round(W / 3));
      add(plane(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }), W, 1.3, b.x0 + W / 2, b.y0 + FLOOR + 0.65, zw - 0.01));
      if (h > 5) add(plane(stripM('string_course', rep), W, 0.55, b.x0 + W / 2, b.y0 + FLOOR + 4.4, zw));
      if (h > 2.5) add(plane(stripM('coping', rep), W, 0.4, b.x0 + W / 2, b.y0 + h - 0.2, zw));
      for (let x = b.x0 + rr(4, 8); x < b.x1 - 4; x += rr(7, 12)) if (rs() < 0.7) { const sz = Math.min(rr(3, 4.6), h - 1); if (sz > 1.2) add(plane(decal(rs() < 0.5 ? 'lichen_spots' : 'damp_rise', 0x0a100c, rr(0.4, 0.7)), sz, sz, x, b.y0 + FLOOR + Math.min(rr(1.8, 5.5), h - 0.5 - sz / 2), zw + 0.02)); } }
    if (indoors) {
      // darker plinth, courses at every storey, frieze under the vault, and the wall falling into shadow overhead
      add(plane(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }), W, 1.2, b.x0 + W / 2, b.y0 + FLOOR + 0.6, zw - 0.01));
      const course = stone ? (/throne|sanctum|magma|forge/.test(th) ? 'demon_frieze' : 'string_course') : 'frieze_strip', rep = Math.max(1, Math.round(W / 3));
      if (!room.arcade) for (let y = b.y0 + FLOOR + 4.6; y < b.y1 - 2; y += SH) add(plane(stripM(course, rep), W, 0.55, b.x0 + W / 2, y, zw));
      if (H > 6) add(plane(stripM(stone ? 'frieze_strip' : 'string_course', rep), W, 0.6, b.x0 + W / 2, b.y1 - FLOOR - 0.34, zw));
      const gm = new THREE.MeshBasicMaterial({ map: gradTex(), transparent: true, depthWrite: false }); add(plane(gm, W, H, b.x0 + W / 2, b.y0 + H / 2, zw + 0.012));
      if (T.starBand) add(plane(new THREE.MeshBasicMaterial({ map: stripTex('pv_blue_tapestry', Math.round(W / 4)), color: 0x8090d0 }), W, 1.6, b.x0 + W / 2, b.y0 + FLOOR + 3.2, zw + 0.004));
    }
    if (T.backWall && !T.merlons && (T.wallH ?? 9) >= 6) { const roof = pick(['slate_roof', 'shingle_roof', 'verdigris_roof', 'burnt_roof', 'roof_1@T', 'roof_2@T', 'roof_3@T', 'roof_4@T', 'roof@I', 'fishscale_slate', 'lead_roof']).split('@'), h = Math.min(H - 1, 9), rm = surface(roof[0], Math.max(1, Math.round(W / 4)), 1, { dir: roof[1] ? DIRS[roof[1]] : X }); const r = plane(rm, W, 2.6, b.x0 + W / 2, b.y0 + h + 1.6, ZB - 1.9); r.rotation.x = -0.75; add(r); add(plane(stripM('ridge_strip', Math.round(W / 3)), W, 0.3, b.x0 + W / 2, b.y0 + h + 2.56, ZB - 2.75)); }
    // doors: a leaf swung open against the wall, dressed quoins up the jamb, voussoirs over the head
    const leaves = stone ? ['door_iron', 'studded_oak', 'door_poor', 'door_1@T', 'door_2@T', 'door_3@T', 'door_iron@I', 'door_iron2@I', 'door_pointed@I', 'door_great@I'] : ['door_rich', 'door_4@T', 'door_5@T', 'door_great@I', 'studded_oak'];
    for (const d of def.doors) if ((d.side === 'W' || d.side === 'E') && !def.open) {
      const dir = d.side === 'W' ? 1 : -1, x = (d.side === 'W' ? b.x0 : b.x1) + dir * 0.5, y = rowFloorY(d.row) + FLOOR, [ln, ld] = pick(leaves).split('@');
      add(plane(new THREE.MeshStandardMaterial({ map: tex(ln, ld ? DIRS[ld] : X), roughness: 0.8, metalness: /iron/.test(ln) ? 0.5 : 0 }), 1.7, 3.5, x + dir * 1.0, y + 1.75, zw + 0.02));
      add(plane(stripM('quoins', 1), 0.55, DOOR_H, x + dir * 2.15, y + DOOR_H / 2, zw + 0.02)).material.map = (() => { const t = tex('quoins').clone(); t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.25, 2); return t; })();
      add(plane(stripM('voussoirs', 1), 3.0, 0.6, x + dir * 1.2, y + DOOR_H + 0.3, zw + 0.02));
    }
    // railings along raised door ledges
    for (const s of room.solids) if (s.kind === 'ledge') add(plane(new THREE.MeshStandardMaterial({ color: 0x2a2624, alphaMap: tex('railing_mask'), alphaTest: 0.4, metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide }), 3, 1.1, (s.x0 + s.x1) / 2, s.y1 + 0.55, -2.25));
    // theme decals on the wall and the floor
    const wallD = { aqueduct: ['damp_rise', 'lichen_spots', 0x0a1410], cistern: ['damp_rise', 'lichen_spots', 0x081416], prison: ['rust_streaks', 'gouges', 0x3a1808], clock: ['rust_streaks', 'grime_noise', 0x2a1a08], forge: ['scorch_mark', 'soot_streaks', 0x050302], magma: ['scorch_mark', 'cracks', 0x050302], menagerie: ['gouges', 'grime_noise', 0x100c08], chapel: ['scorch_mark', 'wax_drips', 0x0c0806], shrine: ['wax_drips', 'wax_drips', 0xe8dcc0], hall: ['grime_noise', 'cracks', 0x0a0806], shaft: ['lichen_spots', 'cracks', 0x0c100a], ossuary: ['grime_noise', 'cracks', 0x100c08], mine: ['cracks', 'lichen_spots', 0x08080c], servants: ['soot_streaks', 'grime_noise', 0x140e08], belfry: ['lichen_spots', 'grime_noise', 0x0a0c10], royalcrypt: ['cracks', 'wax_drips', 0x30303a], vestibule: ['grime_noise', 'cracks', 0x1a1410], throne: ['cracks', 'grime_noise', 0x0a0608], sanctum: ['cracks', 'grime_noise', 0x1a1030] }[th];
    if (wallD && indoors) for (let x = b.x0 + rr(3, 7); x < b.x1 - 3; x += rr(6, 11)) for (let y = b.y0 + FLOOR + 2.4; y < b.y1 - 2.5; y += SH) if (rs() < 0.75) { const sz = rr(3, 5); add(plane(decal(rs() < 0.6 ? wallD[0] : wallD[1], wallD[2], rr(0.45, 0.8)), sz, sz, x, y + rr(-0.6, 0.8), zw + 0.02)); }
    const floorD = { aqueduct: ['puddles', 0x7ab0c0], cistern: ['puddles', 0x6aa8c0], courtyard: ['puddles', 0x8090b0], rampart: ['puddles', 0x8a98b8], forge: ['ash_dust', 0xd0c8c0], magma: ['ash_dust', 0x1a1210], mine: ['ash_dust', 0x8a8478], catacomb: ['ash_dust', 0xb0a890], crypt: ['puddles', 0x6a8a90], prison: ['puddles', 0x7a6a50], garden: ['ash_dust', 0x1a2410], menagerie: ['torn_rags', 0x8a7a5a], servants: ['torn_rags', 0x9a8a6a] }[th];
    if (floorD) for (let x = b.x0 + rr(3, 8); x < b.x1 - 3; x += rr(7, 13)) { const p = plane(decal(floorD[0], floorD[1], floorD[0] === 'puddles' ? 0.4 : 0.5), rr(2.4, 4), 2.6, x, b.y0 + FLOOR + 0.016, rr(-1.4, 0.6)); p.rotation.x = -Math.PI / 2; add(p); }
    if (T.heat && indoors) for (let x = b.x0 + 9; x < b.x1 - 3; x += 9) { let hx = null, gy = 0; for (const dx of [0, 3, -3]) { const gx = x + dx; if (gx < b.x0 + 2 || gx > b.x1 - 2) continue; gy = Math.max(this.groundAt(room, gx - 1.2, b.y1), this.groundAt(room, gx + 1.2, b.y1)); if (gy > b.y0 + FLOOR + 4) continue; if (this.clearWall(room, gx - 1.4, gx + 1.4, gy + 0.3, gy + 2.2, 0.2)) { hx = gx; room.wallRects.push({ x0: gx - 1.5, x1: gx + 1.5, y0: gy, y1: gy + 2.4 }); break; } } if (hx === null) continue;
      const mz = room.arcade ? ZB + 0.55 : ZB + 0.04, mouth = new THREE.Mesh(new THREE.ShapeGeometry(archShape(2.2, 1.0, 12, 0.9)), new THREE.MeshBasicMaterial({ map: lavaTex(), color: 0xffa060 })); mouth.position.set(hx, gy + 0.9, mz); add(mouth);
      add(wbox(tm(['pv_hearth_brick', X]), hx - 1.5, gy + 2.0, hx + 1.5, gy + 2.35, mz - 0.04, mz + 0.5)); add(sprite(glowTex(), 0xff6a20, 4.5, 2.4, hx, gy + 0.6, mz + 0.4, 0.4)); this.light(room, hx, gy + 0.5, mz + 1.4, 0xff7a30, 12, 9); }
    if (/aqueduct|prison/.test(th)) for (let x = b.x0 + 6; x < b.x1 - 4; x += 13.3) { const p = plane(new THREE.MeshStandardMaterial({ map: tex('drain_cover'), metalness: 0.6, roughness: 0.6 }), 1.3, 1.3, x, b.y0 + FLOOR + 0.02, -1.6); p.rotation.x = -Math.PI / 2; add(p); add(plane(stripM('gutter_strip', 4), 12, 0.5, x, b.y0 + FLOOR + 0.25, zw + 0.03)); }
    if (th === 'servants') for (let x = b.x0 + rr(5, 9); x < b.x1 - 4; x += rr(9, 14)) { const hx = hang(x, 1.7, b.y0 + FLOOR); if (hx !== null) add(plane(new THREE.MeshStandardMaterial({ map: tex('jar_shelves'), roughness: 0.85 }), 3.2, 3.2, hx, b.y0 + FLOOR + 3.2, zw + 0.03)); }
    // boss arenas: braziers at the wings, war banners behind, a pool of light on the floor
    if (def.boss) { const fy = b.y0 + (def.enemies.find(e => e.boss)?.y ?? FLOOR), ex = b.x0 + (def.enemies.find(e => e.boss)?.x ?? W / 2);
      for (const x of [b.x0 + 3.2, b.x1 - 3.2]) { add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.24, 0.4, 10), IRON)).position.set(x, fy + 1.25, -2.2); add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 1.1, 8), IRON)).position.set(x, fy + 0.55, -2.2); this.flame(room, x, fy + 1.85, -2.2, 0.85, 18); }
      for (const dx of [-4.5, 4.5]) { const hx = hang(ex + dx, 1.2, fy); if (hx === null) continue; const ban = new THREE.Mesh(bannerGeo(2.2, 5), new THREE.MeshStandardMaterial({ map: texture(GL + 'vel_' + (dx < 0 ? 'a' : 'c') + '_0.webp'), alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide })); ban.geometry.dispose(); ban.geometry = new THREE.PlaneGeometry(2.2, 4.55); ban.position.set(hx, Math.min(b.y1 - 4, fy + 6.2), ZB + (room.arcade ? 0.6 : 0.1)); add(ban); }
      const pool = plane(new THREE.MeshBasicMaterial({ map: glowTex(), color: T.trim, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }), 16, 5, ex, fy + 0.02, -0.4); pool.rotation.x = -Math.PI / 2; add(pool); }
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
    g.add(wbox(m, x - 0.7, y + DOOR_H, x + 0.7, y + DOOR_H + 0.8, ZB, 1.4));
    for (const dz of [-2.6, 1.0]) g.add(wbox(m, x - 0.75, y - 0.1, x + 0.75, y + DOOR_H, dz, dz + 0.35));
  }

  // materials for the castle kit's slots in this room: the wall stone, dressed stone for mouldings, and the rest
  kitSlots(room) {
    const T = room.theme, S_ = room.spec;
    return { stone: tm(S_.back || S_.wall, true), trim: tm(T.dress || DRESS, true, 0.6), dark: DARK, wood: tm(['oak_planks', X], true), glow: GLOW, roof: tm(['slate_roof', X], true), glass: GLOW };
  }
  // the top of whatever stands under x below height y (the floor at least); the underside of whatever is above
  groundAt(room, x, y, oneway = false) { let best = room.b.y0 + FLOOR; for (const s of room.solids) if ((!s.oneway || (oneway && s.kind === 'plat')) && s.kind !== 'ceil' && x > s.x0 && x < s.x1 && s.y1 <= y + 0.01 && s.y1 > best) best = s.y1; return best; }
  ceilingAt(room, x, y) { let best = room.b.y1 - FLOOR; for (const s of room.solids) if (x > s.x0 && x < s.x1 && s.y0 >= y && s.y0 < best) best = s.y0; return best; }
  // a compound pier (base, shaft, capital) standing at y0 and carrying an arch that springs at y1
  kitPier(room, x, y0, y1, sc = 1, z = ZB + 0.5) {
    const KIT = room.kit, P = { ...room.slots, stone: room.slots.trim }, bh = 0.75 * sc, ch = 0.72 * sc, zz = z + 0.36 * sc;
    if (y1 - y0 < bh + ch + 0.25) { kitPiece(room, KIT, 'pier_cap', P, x, y1 - ch, zz, sc, sc, sc); return; }
    kitPiece(room, KIT, 'pier_base', P, x, y0, zz, sc, sc, sc);
    kitPiece(room, KIT, 'pier_shaft', P, x, y0 + bh, zz, sc, y1 - ch - y0 - bh, sc);
    kitPiece(room, KIT, 'pier_cap', P, x, y1 - ch, zz, sc, sc, sc);
  }
  // Gothic elevation for stone interiors: a pointed main arcade on compound piers, then (in tall rooms) alternating
  // galleries and clerestory lancets up to the vault, each storey finished with a cornice.
  arcade(room, KIT, S) {
    const def = room.def, b = room.b, fy = b.y0 + FLOOR, cy = b.y1 - FLOOR, C = cy - fy, Z = ZB + 0.5, g = room.group, T = room.theme;
    room.kit = KIT; room.slots = S; room.arcade = true;
    const P = { ...S, stone: S.trim }, trimM = tm(T.dress || DRESS, false, 0.6), piers = [];
    for (let x = b.x0 + 3.3; x < b.x1 - 1; x += 6.667) piers.push(x);
    room.pillarX = piers.slice();
    const tall = C > 8, heavy = def.props.filter(p => /altar|sarcophagus|throne|organ|statue|fountain|bookshelf|furnace|coffin|pews|bigbell/.test(p.t)).map(p => b.x0 + p.x);
    const stands = room.solids.filter(s => s.kind === 'block' && s.y0 <= fy + 0.1);
    const cornice = y => { g.add(wbox(trimM, b.x0, y, b.x1, y + 0.32, ZB, Z + 0.28)); g.add(nosing(trimM, b.x0, b.x1, y + 0.32, Z + 0.28, 0.08)); room.wallRects.push({ x0: b.x0, x1: b.x1, y0: y - 0.05, y1: y + 0.4, cornice: true }); };
    const solidsIn = (x0, x1, y0, y1) => room.solids.some(s => ['plat', 'block', 'ledge', 'crack', 'echo'].includes(s.kind) && s.x0 < x1 && s.x1 > x0 && s.y0 < y1 && s.y1 > y0);
    const underIn = (x0, x1, y0, y1) => room.solids.filter(s => ['plat', 'block', 'ledge', 'crack', 'echo'].includes(s.kind) && s.x0 < x1 && s.x1 > x0 && s.y0 < y1 && s.y1 > y0).reduce((m, s) => Math.min(m, s.y0), Infinity);
    const tier = (name, spring, top, sy, sc) => {
      const rise = (name === 'bay_high' ? 4.9 : 3.6) * sy, base = room._tierBase ?? fy, landed = [];
      for (let c = piers[0] - 3.333; c < b.x1 + 3.3; c += 6.667) {
        if (!solidsIn(c - 2.9, c + 2.9, spring + 0.4, spring + rise + 0.5)) {
          for (const part of ['_spandrel', '_arch', '_hood']) kitPiece(room, KIT, name + part, part === '_spandrel' ? S : P, c, spring, ZB, 1, sy, 1);
          const rc = new THREE.Mesh(new THREE.ShapeGeometry(archShape(5.6, rise, 16, spring - base)), RECESS); rc.position.set(c, spring, ZB + 0.04); g.add(rc);
          landed.push(c); continue;
        }
        // something crosses this bay. Daises and plinths standing in it only raise the bay's floor; what hangs over it sets the
        // height: a lower arch tucked under it on imposts, else two half-span sub-arches on a colonnette, else a blind pointed panel
        const inBay = s => s.x0 < c + 2.9 && s.x1 > c - 2.9, standing = s => s.y0 <= base + 0.1;
        const lb = Math.max(base, ...room.solids.filter(s => ['block', 'crack'].includes(s.kind) && standing(s) && inBay(s) && s.y1 < spring + 0.4).map(s => s.y1));
        const hangs = (y0, y1) => room.solids.filter(s => ['plat', 'block', 'ledge', 'crack', 'echo'].includes(s.kind) && !standing(s) && inBay(s) && s.y0 < y1 && s.y1 > y0);
        const under = hangs(lb + 0.3, spring + rise + 0.5).reduce((m, s) => Math.min(m, s.y0), spring + rise + 0.5);
        const clear = (y0, y1) => !hangs(y0, y1).length && !room.solids.some(s => ['block', 'crack'].includes(s.kind) && standing(s) && inBay(s) && s.y1 > y0 + 0.05 && s.y0 < y1);
        const sy2 = Math.min(sy, (under - 0.3 - (lb + 2.0)) / 4.0), sp2 = under - 0.3 - 4.0 * sy2;
        const sy3 = Math.min(0.75, (under - 0.3 - (lb + 1.0)) / 4.0), sp3 = under - 0.3 - 4.0 * sy3;
        if (sy2 >= 0.42 && clear(sp2, sp2 + 3.6 * sy2 + 0.2)) {
          for (const part of ['_spandrel', '_arch', '_hood']) kitPiece(room, KIT, 'bay_low' + part, part === '_spandrel' ? S : P, c, sp2, ZB, 1, sy2, 1);
          const rc = new THREE.Mesh(new THREE.ShapeGeometry(archShape(5.6, 3.6 * sy2, 16, sp2 - lb)), RECESS); rc.position.set(c, sp2, ZB + 0.04); g.add(rc);
          landed.push(c); room._imp = (room._imp || []).concat([[c - 3.333, sp2], [c + 3.333, sp2]]);
        } else if (sy3 >= 0.22 && clear(sp3, sp3 + 3.6 * sy3 + 0.2)) {
          for (const cc of [c - 1.667, c + 1.667]) {
            for (const part of ['_spandrel', '_arch']) kitPiece(room, KIT, 'bay_low' + part, part === '_spandrel' ? S : P, cc, sp3, ZB, 0.5, sy3, 1);
            const rc = new THREE.Mesh(new THREE.ShapeGeometry(archShape(2.8, 3.6 * sy3, 12, sp3 - lb)), RECESS); rc.position.set(cc, sp3, ZB + 0.04); g.add(rc);
          }
          if (sp3 - lb > 1.0) this.kitPier(room, c, lb, sp3, 0.36, Z); else this.respond(room, c, sp3, 0.36, Z); // the colonnette between the two
          landed.push(c); room._imp = (room._imp || []).concat([[c - 3.333, sp3], [c + 3.333, sp3]]);
        } else if (under - lb > 1.6) { // blind arcading: a recessed panel with a pointed head
          const y0 = lb + 0.4, top = under - 0.35, rp = Math.min(1.8, (top - y0) * 0.45), ys = top - rp, syp = rp / 3.8;
          kitPiece(room, KIT, 'bay_low_arch', P, c, ys, ZB, 0.76, syp, 0.45);
          for (const [a, c2] of [[c - 2.3, c - 2.12], [c + 2.12, c + 2.3]]) g.add(wbox(trimM, a, y0, c2, ys, ZB, ZB + 0.22));
          g.add(wbox(trimM, c - 2.4, y0 - 0.18, c + 2.4, y0, ZB, ZB + 0.3));
          const rc = new THREE.Mesh(new THREE.ShapeGeometry(archShape(4.2, rp, 14, ys - y0)), RECESS); rc.position.set(c, ys, ZB + 0.03); g.add(rc);
        }
      }
      for (const x of piers) {
        if (!landed.some(c => Math.abs(Math.abs(c - x) - 3.333) < 0.2)) continue; // a pier only where an arch lands
        let y0 = base;
        const on = stands.find(s => x > s.x0 - 0.5 && x < s.x1 + 0.5); if (on && y0 === fy) y0 = on.y1;
        if (spring - y0 >= 0.75 * sc + 0.72 * sc + 0.3) this.kitPier(room, x, y0, spring, sc, Z);
        else if (spring - y0 >= 0.5) { const s2 = (spring - y0) / 1.5; this.kitPier(room, x, y0, spring, Math.min(sc, s2), Z); } // a short pier standing on the block
        else this.respond(room, x, spring, sc, Z); // nowhere to stand: a corbelled respond carries the arch
        room._piersMade = (room._piersMade || []).concat({ x, spring, sc });
      }
      for (const [x, sp2] of room._imp || []) if (room._piersMade?.some(p => Math.abs(p.x - x) < 0.2 && p.spring === spring)) kitPiece(room, KIT, 'pier_cap', P, x, sp2 - 0.72 * sc * 0.75, Z + 0.36 * sc, sc * 0.75, sc * 0.75, sc * 0.75); // impost for the lower arch
      room._imp = null;
      cornice(spring + top * sy);
      room.arches = (room.arches || []).concat(landed.map(c => ({ c, spring, apex: spring + rise })));
      return spring + top * sy + 0.32;
    };
    let y;
    const balcony = room.solids.filter(s => (s.kind === 'plat' || s.kind === 'block') && s.x1 - s.x0 >= 4 && s.y0 > fy + 5.6 && s.y0 < fy + 10.2).reduce((m, s) => Math.min(m, s.y0), Infinity);
    if (!tall) { room._tierBase = fy; y = tier('bay_low', Math.max(fy + 2.3, cy - 4.0), 4.0, 1, 0.72); }
    else {
      room._tierBase = fy;
      y = balcony < Infinity ? tier('bay_low', Math.max(fy + 2.4, balcony - 4.3), 4.0, 1, 0.85) : tier('bay_high', fy + 4.6, 5.6, 1, 1.0); // a long balcony low over the arcade: a gallery carried on it
      // upper storeys: galleries and clerestories alternate up to the vault (phones: lighter clerestories only, and not to the very top)
      for (let k = 0, n = 0; cy - y > 3.0 && (!LOW_MEM || n < 3); k++, n++) {
        if (k % 2 === 0 && cy - y > 4.8 && !LOW_MEM) { room._tierBase = y; y = tier('bay_low', y + 1.3, 4.0, 0.8, 0.5); }
        else { // clerestory: lancets between wall shafts
          const h = Math.min(4.4, cy - y - 0.6), sc = h / 4.6;
          const lit = []; for (let c = piers[0] - 3.333; c < b.x1 + 3.3; c += 6.667) if (c > b.x0 + 1.5 && c < b.x1 - 1.5 && !solidsIn(c - 1.4, c + 1.4, y, y + h + 0.5)) { this.lancet(room, c, y + 0.35, sc, T.sky ? GLOW : this.nightGlass(c)); room.lancets = (room.lancets || 0) + 1; lit.push(c); }
          for (const x of piers) if (lit.some(c => Math.abs(Math.abs(c - x) - 3.333) < 0.2)) kitPiece(room, KIT, 'pier_shaft', P, x, y, Z + 0.15, 0.4, h + 0.4, 0.4);
          y += h + 0.6; cornice(y - 0.3);
        }
      }
    }
    room._tierBase = null;
    for (const pm of room._piersMade || []) for (const sl of room.solids) {
      if (!['plat', 'block'].includes(sl.kind) || sl.y0 <= pm.spring + 0.6 || sl.y0 > pm.spring + 4.5) continue;
      if (Math.min(Math.abs(sl.x0 - pm.x), Math.abs(sl.x1 - pm.x)) > 1.0 && !(sl.x0 < pm.x && sl.x1 > pm.x)) continue;
      kitPiece(room, KIT, 'pier_shaft', P, pm.x, pm.spring, Z + 0.2, 0.42 * pm.sc / 0.72, sl.y0 - 0.5 - pm.spring, 0.42 * pm.sc / 0.72);
      kitPiece(room, KIT, 'pier_cap', P, pm.x, sl.y0 - 0.5, Z + 0.25, 0.55, 0.69, 0.55);
    }
    room.pierInfo = { piers: (room._piersMade || []).map(p => p.x), fy, C }; room._piersMade = null;
  }
  // a capital on a stepped corbel set into the wall: where an arch end has nothing to stand on
  respond(room, x, spring, sc, Z) {
    const P = { ...room.slots, stone: room.slots.trim }, m = tm(room.theme.dress || DRESS, false, 0.6), ch = 0.72 * sc;
    kitPiece(room, room.kit, 'pier_cap', P, x, spring - ch, Z + 0.36 * sc, sc, sc, sc);
    for (let i = 0; i < 3; i++) { const w = (0.55 - i * 0.14) * sc, d = (0.75 - i * 0.18) * sc; room.group.add(wbox(m, x - w, spring - ch - (i + 1) * 0.2 * sc, x + w, spring - ch - i * 0.2 * sc, Z - 0.02, Z + d)); }
  }
  // a dark arcade gets a sconce on every other pier with no fire near it (after the room's own torches are placed)
  // transverse ribs: a chamfered, roll-moulded stone rib across the vault on each pier line, springing from a corbel on the wall
  ribs(room) {
    const I = room.pierInfo; if (!I) return; const m = room.theme.dress ? tm(room.theme.dress, false, 0.6) : tm(['dressed_b', P3, 0xb8b2a8], false, 0.6), b = room.b, cy = b.y1 - FLOOR, lip = std(0x8a8478, { emissive: 0x18140e, roughness: 0.7 });
    if (!room.solids.some(s => s.kind === 'ceil')) return;
    const sec = new THREE.Shape([[-0.24, 0], [0.24, 0], [0.24, -0.12], [0.12, -0.26], [-0.12, -0.26], [-0.24, -0.12]].map(([a, c]) => new THREE.Vector2(a, c)));
    for (const x of I.piers) {
      if (room.solids.some(s => s.kind === 'ceil' && x > s.x0 && x < s.x1) === false) continue;
      const g = new THREE.ExtrudeGeometry(sec, { depth: FRONT - ZB, bevelEnabled: false }); g.translate(x, cy, ZB); worldUV(g); const rb = new THREE.Mesh(g, m); rb.receiveShadow = true; room.group.add(rb);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, FRONT - ZB, 8), lip); roll.rotation.x = Math.PI / 2; roll.position.set(x, cy - 0.27, (ZB + FRONT) / 2); room.group.add(roll);
      kitPiece(room, room.kit, 'pier_cap', { ...room.slots, stone: room.slots.trim }, x, cy - 0.85, ZB + 0.45, 0.42, 0.6, 0.42); // the rib springs from a corbel
    }
  }
  sconces(room) { const I = room.pierInfo; if (!I) return; I.piers.forEach((x, i) => { const ly = I.fy + Math.min(3.0, I.C - 1.5); if (i % 2 === 0 && !room.sources.some(s => Math.hypot(s.x - x, s.y - ly) < 6.5)) this.torch(room, x, ly, ZB + 1.55); }); }
  nightGlass(x) { return new THREE.MeshBasicMaterial({ map: Math.round(x) % 2 ? tex('leaded_glass') : glassTex(), color: Math.round(x) % 2 ? 0x8090b8 : 0xffffff, fog: false }); }
  // a two-light lancet with tracery and its moulded surround; sill at (x, y)
  lancet(room, x, y, sc, glassM, z = ZB) {
    const KIT = room.kit, P = { ...room.slots, stone: room.slots.trim };
    kitPiece(room, KIT, 'lancet_wall', room.slots, x, y, z, sc, sc, 1);
    kitPiece(room, KIT, 'lancet_frame', P, x, y, z, sc, sc, 1);
    kitPiece(room, KIT, 'lancet_tracery', P, x, y, z, sc, sc, 1);
    const src = KIT.getObjectByName('lancet_glass'); if (src) { src.traverse(o => { if (o.isMesh) { if (!o.geometry.userData.flipped) { const uv = o.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); o.geometry.userData.flipped = true; } const m = new THREE.Mesh(o.geometry, glassM); m.position.set(x, y, z + 0.03); m.scale.set(sc, sc, 1); room.group.add(m); } }); }
  }
  // the pilgrim's stone on the causeway: where the first blade stands
  pilgrimStone(room, x, y) {
    const KIT = room.kit; if (!KIT) return;
    kitPiece(room, KIT, 'pilgrim_stone', { stone: tm(['limestone_1', T0, 0x8a8a90], true), trim: tm(['ashlar', T0], true), dark: DARK }, x, y, -0.6);
    flushKit(room);
  }

  bgGear(room, x, y, r) { const gm = GEAR(); const c = new THREE.Mesh(gearGeo(r, Math.round(8 + r * 4)), gm); c.position.set(x, y, ZB + 0.25 + (Math.abs(Math.round(x * 3 + y)) % 3) * 0.45); const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.27, r * 0.3, 0.52, 16), BRASS); hub.rotation.x = Math.PI / 2; hub.position.z = 0.15; c.add(hub); const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.13, r * 0.15, 0.14, 12), BRASS); cap.rotation.x = Math.PI / 2; cap.position.z = 0.48; c.add(cap); for (let k = 0; k < 5; k++) { const a = (k + 0.5) / 5 * Math.PI * 2, sp = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.6, 0.22), BRASS); sp.position.set(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48, 0.15); sp.rotation.z = a - Math.PI / 2; c.add(sp); } c.castShadow = true; room.group.add(c); const sp = rnd(0.2, 0.6) * (Math.random() < 0.5 ? -1 : 1); room.anim.push(t => { c.rotation.z = t * sp; }); }

  async sky(room, kind, KIT) {
    const g = room.group, b = room.b, storm = kind === 'storm';
    const moon = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshBasicMaterial({ color: storm ? 0xaab4c8 : 0xf3ead2, fog: false }));
    moon.position.set(b.x0 + 18, b.y0 + 30, -150); g.add(moon);
    const halo = sprite(glowTex(), storm ? 0x5a6a90 : 0x8a9ad0, 46, 46, moon.position.x, moon.position.y, -152, 0.5); halo.material.fog = false; g.add(halo);
    room.anim.push(() => { const c = this.cam; if (!c) return; const off = THREE.MathUtils.clamp(-(350 - c.x) * 0.35, -62, 62); moon.position.x = c.x + off; moon.position.y = c.y + 30; halo.position.x = moon.position.x; halo.position.y = moon.position.y; });
    const n = Math.ceil((b.x1 - b.x0) / 9) + 6, drop = storm ? 30 : 0;
    // Castle Velscour itself: one modelled skyline (tools/build_castle_kit.py), the same from every open-air room,
    // slid by the camera's place in the castle so the keep, chapel and belfry keep their bearings as you travel
    const src = KIT.getObjectByName('skyline');
    if (src) {
      const sk = src.clone(true), mats = {
        stone: new THREE.MeshStandardMaterial({ color: storm ? 0x0c0e16 : 0x10142a, roughness: 1, vertexColors: true, fog: false }),
        stonelit: (() => { const m = new THREE.MeshStandardMaterial({ color: storm ? 0x262c3c : 0x2c3656, emissive: storm ? 0x0a0c14 : 0x0c1222, roughness: 1, vertexColors: true, fog: false }), base = new THREE.Color(storm ? 0x0c0e16 : 0x10142a);
          m.onBeforeCompile = sh => { sh.uniforms.baseCol = { value: base }; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vLy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLy = position.y;');
            sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLy; uniform vec3 baseCol;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat lk = smoothstep(34.0, 60.0, vLy); diffuseColor.rgb = mix(baseCol, diffuseColor.rgb, lk); totalEmissiveRadiance *= lk;'); };
          m.customProgramCacheKey = () => 'stonelit'; return m; })(), // the moon edge lights the upper castle only: nothing pale floats in the mist
        roof: new THREE.MeshStandardMaterial({ color: storm ? 0x080a10 : 0x0a0d1c, roughness: 1, metalness: 0, vertexColors: true, fog: false }),
        glow: new THREE.MeshBasicMaterial({ color: 0xa8743c, fog: false }), roseglow: new THREE.MeshBasicMaterial({ color: 0x2a1418, fog: false }), dark: new THREE.MeshBasicMaterial({ color: 0x04050a, fog: false }) };
      sk.traverse(o => { if (o.isMesh) { o.material = mats[(o.material.name || 'stone').replace(/\.\d+$/, '')] || mats.stone; o.castShadow = o.receiveShadow = false; o.frustumCulled = false; } });
      sk.scale.setScalar(0.5); sk.position.z = -92; g.add(sk);
      const place = () => { const c = this.cam || { x: (b.x0 + b.x1) / 2, y: b.y0 + 4 }; sk.position.x = c.x + (350 - c.x) * 0.16; sk.position.y = c.y - 40 + (60 - c.y) * 0.1; };
      place(); room.anim.push(place);
      const far = src.clone(true), haze = new THREE.MeshBasicMaterial({ color: storm ? 0x121620 : 0x141a30, fog: false }), hazeLit = new THREE.MeshBasicMaterial({ color: storm ? 0x171c28 : 0x192038, fog: false });
      far.traverse(o => { if (o.isMesh) { const n = (o.material.name || '').replace(/\.\d+$/, ''); o.material = n === 'stonelit' ? hazeLit : haze; /* the far wings show no lit windows: no dashes floating in the mist */ o.frustumCulled = false; } });
      far.scale.set(-0.36, 0.36, 0.36); far.position.z = -125; // (the far wings are no longer shown: they read as glass panes)
      const placeFar = () => { const c = this.cam || { x: (b.x0 + b.x1) / 2, y: b.y0 + 4 }; far.position.x = c.x + (420 - c.x) * 0.1 - 40; far.position.y = c.y - 28 + (60 - c.y) * 0.06; };
      placeFar(); room.anim.push(placeFar);
    }
    const fogM = new THREE.MeshBasicMaterial({ map: cloudTex(), color: storm ? 0x39405a : 0x6a7aa8, transparent: true, opacity: 0.22, depthWrite: false, fog: false }), cards = [];
    for (let i = 0; i < 5; i++) { const c = plane(fogM, rnd(50, 90), rnd(8, 14), b.x0 + rnd(-20, b.x1 - b.x0 + 20), b.y0 + rnd(-4, 6) - drop * 0.3, -40 - i * 5); g.add(c); cards.push(c); }
    room.anim.push((t, dt) => { for (const c of cards) { c.position.x += dt * 0.6; if (c.position.x > b.x1 + 70) c.position.x = b.x0 - 70; } });
    const mtn = new THREE.MeshBasicMaterial({ color: storm ? 0x10141e : 0x141a2c, fog: false }), ridge = new THREE.Shape(), rw = b.x1 - b.x0 + 260; ridge.moveTo(-rw / 2, -40);
    for (let i = 0, xx = -rw / 2, hh = 10; xx < rw / 2; i++) { xx += rnd(4, 11); hh = THREE.MathUtils.clamp(hh + rnd(-7, 7) + (i % 7 === 3 ? 9 : 0), 2, 30); ridge.lineTo(Math.min(xx, rw / 2), hh); }
    ridge.lineTo(rw / 2, -40); const rm = new THREE.Mesh(new THREE.ShapeGeometry(ridge), mtn); rm.position.set((b.x0 + b.x1) / 2, b.y0 - 4 - drop, -130); g.add(rm); // a broken mountain ridge behind the castle
    const mist = plane(new THREE.MeshBasicMaterial({ map: canvasTex(4, 64, x => { const v = x.createLinearGradient(0, 0, 0, 64); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(0.6, 'rgba(255,255,255,.9)'); v.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = v; x.fillRect(0, 0, 4, 64); }), color: 0x5a6a8c, transparent: true, opacity: 0.2, depthWrite: false }), b.x1 - b.x0 + 120, 14, (b.x0 + b.x1) / 2, b.y0 - 6, -30); g.add(mist);
    if (storm) { // racing cloud bank and lightning
      const cm = new THREE.MeshBasicMaterial({ map: cloudTex(), color: 0x39405a, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
      const clouds = []; for (let i = 0; i < 8; i++) { const c = plane(cm, rnd(60, 110), rnd(18, 30), b.x0 + rnd(-40, b.x1 - b.x0 + 40), b.y0 + rnd(34, 62), -120 - i * 3); g.add(c); clouds.push(c); }
      const fl = plane(new THREE.MeshBasicMaterial({ color: 0xc0d0ff, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }), 400, 200, (b.x0 + b.x1) / 2, b.y0 + 30, -160); g.add(fl);
      let next = 3, flash = 0; room.anim.push((t, dt) => { for (const c of clouds) { c.position.x += dt * 3; if (c.position.x > b.x1 + 90) c.position.x = b.x0 - 90; } next -= dt; if (next <= 0) { next = rnd(2.5, 8); flash = 1; room.lightning = 0.25; } flash = Math.max(0, flash - dt * 4); fl.material.opacity = flash * (0.5 + Math.random() * 0.5) * 0.6; if (room.lightning > 0) room.lightning -= dt; });
    }
    if (room.def.theme === 'outdoor') { // the causeway: rails and arches under the road, broken at the west
      const rm = surface('ashlar', 8, 0.5), wm = tm(['castle_stone', P3]), cap = tm(DRESS, false, 0.6);
      const gate = room.def.props.find(p => p.t === 'gatearch'), px1 = gate ? b.x0 + gate.x - 9.4 : b.x1;
      g.add(wbox(wm, b.x0, b.y0 + FLOOR, px1, b.y0 + FLOOR + 1.0, -2.0, -1.6)); g.add(wbox(cap, b.x0, b.y0 + FLOOR + 1.0, px1, b.y0 + FLOOR + 1.12, -2.06, -1.54));
      for (let x = b.x0 + 2; x < px1 + 0.5; x += 4) { g.add(wbox(wm, x - 0.28, b.y0 + FLOOR, x + 0.28, b.y0 + FLOOR + 1.3, -2.12, -1.48)); g.add(wbox(cap, x - 0.36, b.y0 + FLOOR + 1.3, x + 0.36, b.y0 + FLOOR + 1.42, -2.2, -1.4)); const k = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.32, 4), cap); k.rotation.y = Math.PI / 4; k.position.set(x, b.y0 + FLOOR + 1.58, -1.8); g.add(k); }
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
    const t = lavaTex().clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, w / 4), Math.max(1, h / 4));
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
  flame(room, x, y, z, size = 0.5, light = 14, color = room.theme.fire || 0xffa040) {
    const fl = sprite(flameTex(), color, size, size * 1.6, x, y, z), glow = sprite(glowTex(), color === 0xffa040 ? 0xff7a2a : color, size * 6, size * 6, x, y, z, 0.42);
    room.group.add(fl, glow); room.flames.push({ fl, sx: size }); if (light) this.light(room, x, y + 0.1, z + 0.9, color === 0xffa040 ? 0xff9a50 : color, light, 13, fl);
  }
  torch(room, x, y, z = ZB + 0.45) {
    const g = room.group, cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.07, 0.3, 8), IRON); cup.position.set(x, y, z);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), IRON); arm.rotation.x = Math.PI / 2; arm.position.set(x, y - 0.12, z - 0.25);
    g.add(cup, arm); this.flame(room, x, y + 0.32, z);
  }

  // is this piece of wall free of slabs, ledges, blocks and anything already hung there?
  clearWall(room, x0, x1, y0, y1, m = 0.5, hanging = false) {
    return !room.solids.some(s => ['plat', 'block', 'ledge', 'crack', 'echo', 'mover'].includes(s.kind) && s.x0 < x1 + m && s.x1 > x0 - m && s.y0 < y1 + m && s.y1 > y0 - m)
      && !(room.wallRects || []).some(r => !(hanging && r.cornice) && r.x0 < x1 + m && r.x1 > x0 - m && r.y0 < y1 + m && r.y1 > y0 - m);
  }
  findWall(room, x, hw, y0, y1, steps = [0, 3.333, -3.333, 6.667, -6.667, 10, -10], dys = [0], hanging = false) {
    for (const dy of dys) for (const dx of steps) { const xx = x + dx; if (xx - hw < room.b.x0 + 0.8 || xx + hw > room.b.x1 - 0.8) continue; if (this.clearWall(room, xx - hw, xx + hw, y0 + dy, y1 + dy, 0.5, hanging)) { room.wallRects.push({ x0: xx - hw, x1: xx + hw, y0: y0 + dy, y1: y1 + dy }); room._dy = dy; return xx; } }
    return null;
  }
  async prop(room, p) {
    const b = room.b, g = room.group, T = room.theme; let x = b.x0 + p.x; const y = b.y0 + (p.y ?? FLOOR), top = b.y1 - FLOOR, ceil = top - y < 13 ? top : y + 6.6;
    if (/^(banner|tapestry|painting|mirror)$/.test(p.t)) { // hangings move to the nearest clear wall, or stay in the store-room
      const tall = p.t === 'banner', w = { banner: 1.7, tapestry: 3.4, painting: 2.4, mirror: 2.0 }[p.t], h = { banner: 3.6, tapestry: 2.8, painting: 2.8, mirror: 3.2 }[p.t], cy0 = Math.min(top - h / 2 - 0.3, y + (tall ? 4.2 : 3.0));
      const nx = this.findWall(room, x, w / 2, cy0 - h / 2, cy0 + h / 2, undefined, [0], true); if (nx === null) return; x = nx;
    }
    { const hw = { window: p.big ? 2.2 : 1.6, rosewindow: 2.6, banner: 1.2, tapestry: 2, painting: 1.5, mirror: 1.3, bookshelf: 1.9, skullwall: 2.2, furnace: 1.9, organ: 2.6, ivy: 2.5, throne: 1.4, statue: 1 }[p.t]; if (hw) (room.hung ||= []).push({ x0: x - hw, x1: x + hw, y }); }
    const add = o => { g.add(o); return o; }, wood = surface('wood', 1, 1), stone = mat(T.wall, 1, 1), n0 = g.children.length, s0 = room.sources.length;
    switch (p.t) {
      case 'torch': this.torch(room, x, y + 2.6); break;
      case 'lamp': {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 8), IRON)).position.set(x, y + 1.6, -1.8);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.45, 6, 1, true), IRON)).position.set(x, y + 3.4, -1.8);
        add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 6), IRON)).position.set(x, y + 3.78, -1.8); add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 6), IRON)).position.set(x, y + 3.16, -1.8);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), IRON)).position.set(x + Math.cos(a) * 0.21, y + 3.4, -1.8 + Math.sin(a) * 0.21); }
        { const arm = add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 5, 12, Math.PI / 2), IRON)); arm.position.set(x, y + 2.6, -1.8); }
        add(sprite(flameTex(), 0xffb060, 0.16, 0.26, x, y + 3.4, -1.8)); add(sprite(glowTex(), 0xffb060, 1.6, 1.6, x, y + 3.4, -1.8, 0.55)); this.light(room, x, y + 3.3, -1.2, 0xffb060, 12, 12); break;
      }
      case 'brazier': {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.2, 0.35, 10), IRON)).position.set(x, y + 1.0, -1.4);
        for (const a of [0, 2.1, 4.2]) { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5), IRON)); l.position.set(x + Math.cos(a) * 0.22, y + 0.45, -1.4 + Math.sin(a) * 0.22); l.rotation.z = Math.cos(a) * 0.25; }
        this.flame(room, x, y + 1.5, -1.4, 0.6, 10); { const gl = g.children[g.children.length - 1]; gl.material.opacity = 0.2; gl.scale.multiplyScalar(0.7); } break;
      }
      case 'candles': {
        for (let i = 0; i < 7; i++) { const h = 0.2 + Math.random() * 0.5, cx = x + (Math.random() - 0.5) * 1.2, cz = -2.2 + Math.random(); add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 6), WAX)).position.set(cx, y + h / 2, cz); add(sprite(flameTex(), 0xffb050, 0.12, 0.2, cx, y + h + 0.08, cz)); }
        this.light(room, x, y + 0.9, -1.4, 0xffa860, 7, 8); break;
      }
      case 'chandelier': {
        const ctop = this.ceilingAt(room, x, y + 2.5), cy = Math.min(ctop - 1.2, y + 5.2), grp = new THREE.Group(); grp.position.set(x, cy, -0.9); // hung from whatever is overhead
        const k = await kit('chandelier'); if (k) { k.scale.setScalar(1.25); k.traverse(o => { if (o.isMesh && o.material.metalness > 0.4) { o.material = o.material.clone(); o.material.envMap = ENV; o.material.envMapIntensity = 1.0; } }); grp.add(k); }
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; grp.add(sprite(flameTex(), 0xffb050, 0.16, 0.27, Math.cos(a) * 1.25, 0.62, Math.sin(a) * 1.25)); if (i % 2 === 0) grp.add(sprite(flameTex(), 0xffb050, 0.13, 0.22, Math.cos(a) * 0.69, 1.05, Math.sin(a) * 0.69)); }
        const ch = chain(0x8a7a50, 0.22, Math.max(0.5, ctop - cy - 1.2), 0, (ctop - cy - 1.2) / 2 + 1.25, 0); grp.add(ch); add(grp); add(sprite(glowTex(), 0xffa850, 5, 4, x, cy + 0.2, -0.9, 0.3));
        this.light(room, x, cy - 0.3, 0.2, 0xffb060, 18, 15); room.anim.push(t => { grp.rotation.z = Math.sin(t * 0.7 + x) * 0.025; }); break;
      }
      case 'banner': case 'tapestry': {
        const tall = p.t === 'banner', names = tall ? ['banner_blood', 'banner_blue', 'banner_white', 'banner_green', 'banner_greygold', 'war_banner'] : ['tapestry_war', 'tapestry_hunt', 'pv_tapestry_wall', 'pv_blue_tapestry', 'thorn_brocade', 'dyed_cloth', 'wool_blanket'];
        const nm = names[Math.abs(Math.round(x * 7)) % names.length], w = tall ? 1.7 : 3.4, h = tall ? 3.4 : 2.6, cy = Math.min(top - h / 2 - 0.3, y + (tall ? 4.2 : 3.2));
        if (tall) { const k = Math.abs(Math.round(x * 7)), file = k % 5 === 4 ? `tess_${'ab'[k % 2]}_${(k >> 1) % 2}` : `vel_${'abcd'[k % 4]}_${(k >> 2) % 2}`; // Velscour's banners, now and then a captured standard
          const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 3.62, 1, 6), new THREE.MeshStandardMaterial({ map: texture(GL + file + '.webp'), alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide, color: file.startsWith('tess') ? 0xa89880 : new THREE.Color(1.7, 1.55, 1.5), emissive: file.startsWith('tess') ? 0x000000 : 0x1c0606 })); ban.position.set(x, cy, ZB + 0.09); add(ban);
          room.anim.push(t => { ban.rotation.y = Math.sin(t * 0.7 + x) * 0.03; }); break; }
        const geo = new THREE.PlaneGeometry(w, h, 1, 4), ban = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex(nm), roughness: 0.9, side: THREE.DoubleSide }));
        ban.position.set(x, cy, ZB + 0.09); add(ban); const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, w + 0.4, 6), BRASS)); rod.rotation.z = Math.PI / 2; rod.position.set(x, cy + h / 2 + 0.03, ZB + 0.13);
        break;
      }
      case 'painting': case 'mirror': {
        const w = p.t === 'mirror' ? 1.8 : 2.2, h = p.t === 'mirror' ? 3.0 : 2.6, cy = Math.min(top - h / 2 - 0.4, y + 2.6);
        add(box(BRASS, x - w / 2 - 0.12, cy - h / 2 - 0.12, x + w / 2 + 0.12, cy + h / 2 + 0.12, ZB + 0.02, ZB + 0.14));
        const names = ['tapestry_hunt', 'demon_frieze', 'tapestry_war', 'pv_heraldic', 'demon_glass', 'pv_embossed_leather', 'pv_blue_tapestry'];
        if (p.t === 'mirror') { add(plane(new THREE.MeshBasicMaterial({ map: mirrorTex() }), w, h, x, cy, ZB + 0.16)); const gl = add(sprite(glowTex(), 0xc8d0ff, w * 0.7, h * 0.9, x - w * 0.12, cy + h * 0.1, ZB + 0.2, 0.16)); room.anim.push(t => { gl.material.opacity = 0.1 + Math.sin(t * 0.8 + x) * 0.06; gl.position.x = x + Math.sin(t * 0.3 + x) * w * 0.2; }); for (const dx of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), BRASS)).position.set(x + dx * (w / 2 + 0.06), cy + h / 2 + 0.06, ZB + 0.12); }
        else add(plane(new THREE.MeshStandardMaterial({ map: tex(names[Math.abs(Math.round(x * 3)) % names.length]), roughness: 0.8, color: 0xb0a090 }), w, h, x, cy, ZB + 0.16));
        break;
      }
      case 'window': case 'rosewindow': {
        if (p.t === 'window' && T.arcade) { const k = Math.round((p.x - 6.63) / 6.667), sx = 6.63 + k * 6.667; if (Math.abs(sx - p.x) < 3.4) x = b.x0 + sx; }
        const rose = p.t === 'rosewindow', big = p.big, lit = rose || big;
        const glassM = new THREE.MeshBasicMaterial({ transparent: !!(rose || big), alphaTest: rose || big ? 0.05 : 0, map: rose ? texture(GL + 'rose_0.webp') : big ? texture(GL + 'glass_' + 'abcde'[Math.abs(Math.round(x * 3)) % 5] + '_' + (Math.abs(Math.round(x)) % 2) + '.webp') : Math.round(x) % 2 ? tex('leaded_glass') : glassTex(), color: lit ? 0xb8acb0 : Math.round(x) % 2 ? 0x8090b8 : 0xffffff, fog: false });
        let cy, h, w;
        if (rose) {
          w = 4.6; h = 4.6; cy = Math.min(top - h / 2 - 0.5, y + 6.0);
          const glass = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 40), glassM); glass.position.set(x, cy, ZB + 0.02); add(glass);
          const tr = await kit('rose_tracery'); if (tr) { tr.traverse(c => { if (c.isMesh) c.material = stone; }); tr.position.set(x, cy, ZB + 0.14); add(tr); }
        } else {
          // in an arcade the lancet stands in its bay's arch; elsewhere it is cut into the wall
          const want = y + (big ? 4.5 : 3.6), arch = (room.arches || []).filter(a => Math.abs(a.c - x) < 1 && want > a.spring - 4 && want < a.apex + 1).sort((a, c) => Math.abs(a.spring - want) - Math.abs(c.spring - want))[0];
          const sillMin = arch ? Math.max(y + 1.0, arch.spring - 3.2, ...(room.wallRects || []).filter(r => r.cornice && r.y1 < arch.apex).map(r => r.y1 + 0.3)) : 0, room4 = arch ? (arch.apex - 0.4 - sillMin) / 4.6 : 0, /* a lancet stands above any cornice inside its arch */ sc = arch && room4 > 0.55 ? Math.min(big ? 1.4 : 1.0, room4) : big ? 1.3 : 0.9;
          h = 4.6 * sc; w = 2.2 * sc; let sill = arch && room4 > 0.55 ? arch.apex - 0.35 - h : Math.min(top - h - 0.6, y + (big ? 5.0 : 2.0)); cy = sill + h / 2;
          const nx = this.findWall(room, x, w / 2 + 0.5, sill - 0.3, sill + h + 0.3, T.arcade ? [0, 6.667, -6.667, 13.333, -13.333, 20, -20, 26.667, -26.667] : [0, 2, -2, 4, -4], arch ? [0] : [0, 1.2, 2.4, -1.2], !!arch); if (nx === null) break; x = nx; // a lancet seated in its arch ignores the cornice its arch already sits under
          this.lancet(room, x, sill + room._dy, sc, glassM); cy += room._dy; room.lancets = (room.lancets || 0) + 1;
        }
        const rl = rose ? Math.min(26, cy - y + 3) : 13, ray = plane(new THREE.MeshBasicMaterial({ map: rayTex(), color: lit ? 0xd07050 : 0x7b90d0, transparent: true, opacity: rose ? 0.11 : lit ? 0.14 : 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), w * 1.1, rl, x + rl * 0.18, cy - rl * 0.35, ZB + 1.6); ray.rotation.z = rose ? 0.3 : 0.45; ray.rotation.y = 0.25; add(ray); // a rose window's beam reaches the floor
        if (lit) for (const [dx, col, sz] of [[1.2, 0xc02838, 2.6], [2.4, 0x3050c0, 2.2], [0.2, 0xd0a040, 1.6]]) { const pl = plane(new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }), sz * 1.6, sz, x + dx, y + 0.02, -0.9 + dx * 0.2); pl.rotation.x = -Math.PI / 2; add(pl); } // stained light on the flags
        this.light(room, x + 1.5, cy - 2.5, 0.6, lit ? 0xff8060 : 0x8aa0ff, lit ? 14 : 12, 16); break;
      }
      case 'statue': case 'gargoyle': {
        const garg = p.t === 'gargoyle', file = garg ? 'assets/monsters/tripo/dragonling_black.glb' : 'assets/armor/velscour_knight.glb';
        const k = await cloneGLTF(file), sm = surface('limestone_1', 1, 1, { tint: garg ? 0x6a6a70 : 0x9a9690 });
        if (k.animations.length) { const mx = new THREE.AnimationMixer(k.scene), c = k.animations.find(a => a.name === (garg ? 'roar' : ['Sword_Idle', 'Idle_FoldArms_Loop', 'Sword_Block'][Math.abs(Math.round(x)) % 3])) || k.animations[0]; mx.clipAction(c).play(); mx.setTime(c.duration * 0.45); } // statues are posed, never T-posed
        k.scene.traverse(o => { if (o.isMesh) { o.material = sm; o.castShadow = true; o.frustumCulled = false; } });
        fitHeight(k.scene, garg ? 1.5 : 2.6); const ped = garg ? 0 : 0.9; k.scene.position.set(x, y + ped, garg ? -1.2 : ZB + 1.2); if (garg) k.scene.rotation.y = (Math.round(x) % 2 ? 1 : -1) * 1.0; add(k.scene);
        if (!garg) add(wbox(tm(T.dress || DRESS, false, 0.6), x - 0.8, y, x + 0.8, y + 0.9, ZB + 0.3, ZB + 2.0));
        break;
      }
      case 'chain': { let lo = y; for (const sl of room.solids) if (!['floor', 'wall', 'ceil'].includes(sl.kind) && x > sl.x0 - 0.2 && x < sl.x1 + 0.2 && sl.y1 < top - 0.5 && sl.y1 > lo) lo = sl.y1; add(chain(0x9a9590, 0.35, top - lo, x, (top + lo) / 2, ZB + 1.2)); if (lo > y + 0.1) { const eye = add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12), IRON)); eye.position.set(x, lo + 0.1, ZB + 1.2); } break; }
      case 'hook': { const len = Math.min(3.2, top - y - 2.2); add(chain(0x9a9590, 0.28, len, x, top - len / 2, -1.4)); const hk = add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 5, 12, 4.2), IRON)); hk.position.set(x, top - len - 0.15, -1.4); if (Math.round(x) % 2) { const pts = [[0.03, 0.34], [0.06, 0.26], [0.17, 0.12], [0.23, -0.05], [0.2, -0.22], [0.1, -0.32], [0, -0.34]].map(([r, yy]) => new THREE.Vector2(r, yy)); const meat = add(new THREE.Mesh(new THREE.LatheGeometry(pts, 10), std(0x9a5a4a, { roughness: 0.6 }))); meat.position.set(x, top - len - 0.75, -1.4); const bone = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 5), std(0xe0d8c0))); bone.position.set(x, top - len - 0.2, -1.4); } break; }
      case 'cage': { const cy = Math.min(top - 2.2, y + 4.2), len = top - cy - 1; add(chain(0x9a9590, 0.3, len, x, top - len / 2, -1.3)); const c = add(new THREE.Group()); c.position.set(x, cy, -1.3); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2, 5), IRON); bar.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7); c.add(bar); } for (const ry of [-0.5, 0.4]) c.add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.03, 5, 20), IRON).rotateX(Math.PI / 2).translateZ(-ry)); if (Math.round(x) % 2) { const sk = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), std(0x5e5a50, { roughness: 0.95 })); sk.position.set(0.1, -0.82, 0); c.add(sk); } add(new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 10), IRON)).position.set(x, cy + 1.25, -1.3); add(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 10), IRON)).position.set(x, cy - 1, -1.3); room.anim.push(t => { c.rotation.y = Math.sin(t * 0.5 + x) * 0.3; }); break; }
      case 'pews': if (p.face) { const pw = tm(['oak_planks', X, 0x8a6a50]), d = p.face; for (let i = 0; i < 4; i++) { const px = x + (i - 1.5) * 1.15; add(wbox(pw, px - 0.24, y + 0.42, px + 0.24, y + 0.48, -3.0, -0.9)); add(wbox(pw, px - d * 0.28 - 0.04, y, px - d * 0.28 + 0.04, y + 1.05, -3.0, -0.9)); const end = new THREE.Shape([[-0.32, 0], [0.32, 0], [0.32, 0.55], [0, 0.95], [-0.32, 1.1]].map(([a, c]) => new THREE.Vector2(a * d, c))); const eg = new THREE.ExtrudeGeometry(end, { depth: 0.07, bevelEnabled: false }); eg.translate(px, y, -0.97); worldUV(eg); add(new THREE.Mesh(eg, pw)).castShadow = true; } break; } else { const pw = tm(['pv_dark_walnut', X]); for (let i = 0; i < 3; i++) { const px = x + i * 2.2 - 2.2; add(wbox(pw, px - 0.95, y + 0.44, px + 0.95, y + 0.5, -2.75, -2.3)); add(wbox(pw, px - 0.95, y + 0.55, px + 0.95, y + 1.15, -2.82, -2.76)); for (const ex of [-0.98, 0.98]) { add(wbox(pw, px + ex - 0.04, y, px + ex + 0.04, y + 1.25, -2.85, -2.25)); const fin = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), pw)); fin.position.set(px + ex, y + 1.36, -2.8); } } break; }
      case 'throne': { const cl = add(plane(new THREE.MeshStandardMaterial({ map: (() => { const t = texture(P3 + 'red_damask_c.webp').clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3.2); t.needsUpdate = true; return t; })(), roughness: 0.95, color: 0xb09090 }), 4.2, Math.min(7, top - y - 0.6), x, y + Math.min(7, top - y - 0.6) / 2, ZB + 0.12)); add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 8), BRASS)).position.set(x, y + Math.min(7, top - y - 0.6), ZB + 0.18); const m = surface('oxblood_marble', 1, 1, { dir: X }); add(box(m, x - 3, y, x + 3, y + 0.6, ZB + 0.1, ZB + 3)); add(box(m, x - 1, y + 0.6, x + 1, y + 1.4, ZB + 0.5, ZB + 2)); add(box(m, x - 1, y + 1.4, x + 1, y + 5, ZB + 0.3, ZB + 0.7)); add(box(BRASS, x - 1.15, y + 4.9, x + 1.15, y + 5.2, ZB + 0.25, ZB + 0.75)); for (const dx of [-1, 1]) add(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 6), BRASS)).position.set(x + dx * 0.95, y + 5.6, ZB + 0.5); break; }
      case 'gatearch': if (room.kit || (room.kit = await castleKit())) { const gx = x - 3.4; kitPiece(room, room.kit, 'gatehouse', { stone: tm(['castle_stone', P3], true), trim: tm(DRESS, true, 0.6), tunnel: tm(['ashlar', T0, 0x2a2a32], true), dark: std(0x1c1a18, { metalness: 0.3, roughness: 0.85 }), glow: GLOW, glowdim: new THREE.MeshBasicMaterial({ color: 0x6a3a18, fog: false }), roof: tm(['slate_roof', X], true) }, gx, y, -1.0); for (const dx of [-2.75, 2.75]) this.torch(room, gx + dx, y + 3.4, -0.55); { const vb = plane(new THREE.MeshStandardMaterial({ map: texture(GL + 'vel_a_0.webp'), alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide, color: new THREE.Color(1.6, 1.5, 1.45), emissive: 0x200606 }), 1.25, 2.6, gx, y + 8.55, -0.86); add(vb); this.light(room, gx, y + 7.2, 0.4, 0xffa860, 7, 5); } { const sp = plane(new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xff8a40, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), 3.4, 4.2, gx, y + 0.03, -3.6); sp.rotation.x = -Math.PI / 2; add(sp); } this.light(room, gx, y + 1.2, -4.6, 0xff8a40, 6, 6); break; } else { const m = surface('ashlar', 2, 4); add(box(m, x - 4, y, x - 2.2, y + 11, -3.2, 0.2)); add(box(m, x + 0.1, y, x + 2.2, y + 11, -3.2, 0.2)); add(box(m, x - 4, y + 5.2, x + 2.2, y + 7, -3.2, 0.2)); for (let i = 0; i < 4; i++) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.4, 4), m)); c.position.set(x - 3.1 + (i % 2) * 4.2, y + 12.2 + (i > 1 ? 3 : 0), -1.5); if (i > 1) c.scale.setScalar(0.5); } this.torch(room, x - 2.6, y + 3.0); break; }
      case 'portcullis': { const py = y + DOOR_H - 0.15; add(wbox(DARK, x - 0.16, py, x + 0.16, py + 2.4, ZB, 1.25)); // the slot it rises into
        for (let z = -2.9; z <= 1.0; z += 0.39) { add(box(IRON, x - 0.05, py - 0.05, x + 0.05, py + 2.2, z - 0.05, z + 0.05)); const t = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 5), IRON)); t.rotation.x = Math.PI; t.position.set(x, py - 0.2, z); }
        for (const hy of [0.1, 0.8, 1.5]) add(box(IRON, x - 0.06, py + hy, x + 0.06, py + hy + 0.08, -3.0, 1.1)); break; }
      case 'windlass': { const wd = tm(['adzed_beam', X]); for (const dx of [-0.9, 0.9]) { const a = add(wbox(wd, x + dx - 0.1, y, x + dx + 0.1, y + 1.9, -2.7, -2.5)); a.geometry.rotateZ(0); }
        const drum = add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 14), wd)); drum.rotation.z = Math.PI / 2; drum.position.set(x, y + 1.5, -2.6);
        for (let i = 0; i < 6; i++) { const sp = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 5), wd)); sp.position.set(x + 1.05, y + 1.5, -2.6); sp.rotation.x = i / 6 * Math.PI; }
        add(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 20), wd)).position.set(x + 1.05, y + 1.5, -2.6).constructor; g.children[g.children.length - 1].rotation.y = Math.PI / 2;
        add(chain(0x6a6a6a, 0.24, top - y - 1.6, x - 0.3, (top + y + 1.6) / 2, -2.6)); add(chain(0x6a6a6a, 0.24, top - y - 1.6, x + 0.3, (top + y + 1.6) / 2, -2.6)); break; }
      case 'dial': { // the great clock face: a backlit iron-ringed dial, hands still turning though it keeps no hour
        const r = p.r || 3, cyy = Math.min(top - r - 0.6, y + (p.h ?? 7)), DZ = ZB + 0.45, face = add(new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ map: dialTex(), color: 0xd8c8a0, fog: false }))); face.position.set(x, cyy, DZ);
        const bez = add(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.5, r + 0.6, 0.45, 48, 1, true), BRASS)); bez.rotation.x = Math.PI / 2; bez.position.set(x, cyy, DZ - 0.1); const back = add(new THREE.Mesh(new THREE.CircleGeometry(r + 0.55, 48), DARK)); back.position.set(x, cyy, DZ - 0.3);
        const gl = add(new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.9, depthWrite: false }))); gl.position.set(x, cyy, DZ + 0.42);
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(r + 0.12, 0.22, 10, 48), BRASS)); ring.position.set(x, cyy, DZ + 0.12);
        const hand = (len, wdt, sp) => { const h = new THREE.Group(); h.position.set(x, cyy, DZ + 0.12 + wdt); const m = new THREE.Mesh(new THREE.BoxGeometry(wdt, len, 0.12), IRON); m.position.y = len / 2 - 0.25; h.add(m); add(h); room.anim.push(t => { h.rotation.z = -t * sp; }); };
        hand(r * 0.62, 0.2, 0.05); hand(r * 0.88, 0.11, 0.6); add(sprite(glowTex(), 0xffc070, r * 2.6, r * 2.6, x, cyy, DZ - 0.25, 0.3)); this.light(room, x - r * 0.4, cyy + r * 1.1, DZ + 2.6, 0xffc078, 10, 12); const boss = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 16), BRASS)); boss.rotation.x = Math.PI / 2; boss.position.set(x, cyy, DZ + 0.42); break; }
      case 'bellframe': { // the bell hung in its timber frame between the stone cradle piers
        const wd = tm(['adzed_beam', X]), by = y + (p.h ?? 3.6); add(wbox(wd, x - 5.4, by, x + 5.4, by + 0.45, -2.2, -0.9));
        for (const d of [-1, 1]) { const kb = wbox(wd, -0.09, -0.8, 0.09, 0.8, -0.09, 0.09); kb.geometry.rotateZ(d * 0.7); kb.geometry.translate(x + d * 4.3, by - 0.45, -1.55); worldUV(kb.geometry); add(kb); }
        const k = await loadGLTF('assets/game/items/bells.glb'), src = k.scene.getObjectByName('bell_tenor');
        if (src) { const piv = new THREE.Group(); piv.position.set(x, by, -1.55); const m = src.clone(); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); piv.add(m); const bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()); m.scale.setScalar(2.6 / Math.max(sz.x, sz.y, sz.z)); const b2 = new THREE.Box3().setFromObject(m); m.position.y -= b2.max.y; m.position.x -= (b2.min.x + b2.max.x) / 2; m.position.z -= (b2.min.z + b2.max.z) / 2; m.traverse(o => { if (o.isMesh) o.castShadow = true; }); add(piv); room.anim.push(t => { piv.rotation.z = Math.sin(t * 0.6) * 0.03; }); }
        break; }
      case 'bookshelf': { const w = 3.2, h = Math.min(4.6, top - y - 0.4); add(box(surface('pv_dark_walnut', 1, 1, { dir: X }), x - w / 2 - 0.12, y, x + w / 2 + 0.12, y + h + 0.15, ZB + 0.02, ZB + 0.7)); const t2 = tex('book_spines').clone(); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.repeat.set(1, h / 3.2); add(plane(new THREE.MeshStandardMaterial({ map: t2, roughness: 0.85 }), w, h, x, y + h / 2 + 0.05, ZB + 0.72)); break; }
      case 'sarcophagus': { const k = await kit('sarcophagus'); if (k) { const mm = surface('mausoleum_marble', 1, 1, { dir: X }); k.traverse(c => { if (c.isMesh) c.material = Array.isArray(c.material) ? c.material.map(() => mm) : mm; }); k.scale.setScalar(0.92); k.position.set(x, y, -2.0); add(k); break; } const m = surface('mausoleum_marble', 1, 1, { dir: X }); add(box(m, x - 1.3, y, x + 1.3, y + 0.9, -2.6, -1.3)); add(box(m, x - 1.4, y + 0.9, x + 1.4, y + 1.1, -2.7, -1.2)); const eff = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.5, 4, 8), m)); eff.rotation.z = Math.PI / 2; eff.position.set(x, y + 1.25, -1.95); break; }
      case 'coffin': { const cs = new THREE.Shape([[0, 0], [0.24, 0], [0.42, 1.45], [0.3, 2.1], [-0.3, 2.1], [-0.42, 1.45], [-0.24, 0]].map(([a, c]) => new THREE.Vector2(a, c))); const cg = new THREE.ExtrudeGeometry(cs, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }); cg.translate(x, y, ZB + 0.15); worldUV(cg); const c = add(new THREE.Mesh(cg, tm(['pv_dark_walnut', X, 0x8a7060]))); c.castShadow = true; if (false) c.rotation.z = (Math.round(x) % 2 ? 1 : -1) * 0.08; add(box(BRASS, x - 0.2, y + 1.3, x + 0.2, y + 1.36, ZB + 0.6, ZB + 0.63)); add(box(BRASS, x - 0.03, y + 1.0, x + 0.03, y + 1.6, ZB + 0.6, ZB + 0.63)); break; }
      case 'bones': { const bm = std(0x7a7468, { roughness: 0.9 }); for (let i = 0; i < 9; i++) { const L = rnd(0.4, 0.75), c = add(new THREE.Group()); c.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 6), bm)); for (const e of [-1, 1]) c.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), bm).translateY(e * L / 2)); c.position.set(x + rnd(-0.8, 0.8), y + 0.04, rnd(-2.4, -1.2)); c.rotation.set(Math.PI / 2, rnd(0, 6), 0); c.rotateZ(rnd(-0.3, 0.3)); } const sk = await cloneGLTF('assets/game/items/skull_0' + (1 + Math.abs(Math.round(x)) % 8) + '.glb'); fitHeight(sk.scene, 0.34); sk.scene.position.set(x + 0.2, y + 0.12, -1.6); sk.scene.rotation.y = rnd(-1, 1); add(sk.scene); break; }
      case 'skullwall': add(plane(surface('skulls2', 1, 1, { dir: I }), 4, 4, x, Math.min(top - 2.2, y + 2.4), ZB + 0.05)); break;
      case 'gear': this.bgGear(room, x, Math.min(top - 2.5, y + 3.5), p.r || 2.2); break;
      case 'pendulum': { const piv = new THREE.Group(), len = Math.min(6, top - y - 1.5); piv.position.set(x, y + len + 1, ZB + 0.5); piv.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), BRASS).translateY(-len / 2), new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.16, 28), BRASS).rotateX(Math.PI / 2).translateZ(0).translateY(0)); piv.children[1].position.set(0, -len, 0); add(piv); room.anim.push(t => { piv.rotation.z = Math.sin(t * 1.3 + x) * 0.5; }); break; }
      case 'barrel': { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.0, 12), wood)); c.position.set(x, y + 0.5, -1.9); c.castShadow = true; for (const h of [0.25, 0.75]) add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 4, 14), IRON)).rotateX(Math.PI / 2).position.set(x, y + h, -1.9); break; }
      case 'crate': { const s = 0.9 + (Math.round(x * 3) % 3) * 0.12; add(box(surface('oak_planks', 0.5, 0.5, { dir: X }), x - s / 2, y, x + s / 2, y + s, -2.4, -2.4 + s)); if (false) add(box(new THREE.MeshStandardMaterial({ map: tex('awning_canvas'), roughness: 1 }), x - s / 2 - 0.04, y + s * 0.55, x + s / 2 + 0.04, y + s + 0.03, -2.44, -2.36 + s)); break; }
      case 'table': { add(box(wood, x - 1.2, y + 0.82, x + 1.2, y + 0.92, -2.6, -1.5)); if (Math.round(x) % 2) add(box(new THREE.MeshStandardMaterial({ map: tex('hessian'), roughness: 1 }), x - 0.7, y + 0.92, x + 0.7, y + 0.935, -2.64, -1.46)); for (const dx of [-1.05, 1.05]) for (const dz of [-2.5, -1.6]) add(box(wood, x + dx - 0.06, y, x + dx + 0.06, y + 0.82, dz - 0.06, dz + 0.06)); add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), WAX)).position.set(x + 0.4, y + 1.07, -2); add(sprite(flameTex(), 0xffb050, 0.12, 0.2, x + 0.4, y + 1.3, -2)); add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.22, 8), BRASS)).position.set(x - 0.4, y + 1.03, -2.1); break; }
      case 'rug': { const names = ['pv_red_gothic', 'pv_blue_geometric', 'pv_geometric_rug', 'pv_heraldic', 'pv_red_floral', 'pv_green_floral', 'pv_tartan_red', 'pv_woven_stripes', 'pv_red_diamond', 'pv_gold_wool', 'pv_forest_wool', 'pv_rust_wool', 'pv_charcoal_wool', 'pv_ivory_wool', 'pv_brown_wool', 'pv_blue_wool', 'pv_tartan_brown', 'pv_red_wool', 'rag_rug@I', 'wool_blue@I', 'wool_brown@I', 'wool_green@I', 'wool_red@I']; const [rn, rd] = names[Math.abs(Math.round(x * 5)) % names.length].split('@'); const r = plane(new THREE.MeshStandardMaterial({ map: tex(rn, rd ? I : X), roughness: 0.95 }), 5, 2.6, x, y + 0.014, -0.5); const bd = plane(new THREE.MeshStandardMaterial({ color: 0x3a2a14, roughness: 0.9 }), 5.24, 2.84, x, y + 0.011, -0.5); bd.rotation.x = -Math.PI / 2; add(bd); r.rotation.x = -Math.PI / 2; r.receiveShadow = true; add(r); break; }
      case 'tree': {
        const bark = surface(['bark', 'bark_2', 'bark_3', 'bark_4', 'pine_bark', 'pine_bark_2', 'pine_bark_3', 'pine_bark_4', 'pine_bark_5'][Math.abs(Math.round(x)) % 9], 1, 2), root = new THREE.Group(); root.position.set(x, y, -2.5);
        const grow = (par, len, r, depth) => { const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r, len, 6), bark); seg.position.y = len / 2; seg.castShadow = depth === 0; par.add(seg); if (depth >= 3) return;
          for (let i = 0, n = depth === 0 ? 3 : 2; i < n; i++) { const j = new THREE.Group(); j.position.y = len * (depth === 0 ? rnd(0.62, 1) : 1); j.rotation.z = rnd(0.35, 0.95) * (i % 2 ? 1 : -1) * (depth === 0 && i === 2 ? 0.3 : 1); j.rotation.y = rnd(-0.6, 0.6); par.add(j); grow(j, len * rnd(0.5, 0.68), r * 0.55, depth + 1); } };
        grow(root, 3.2 + (Math.abs(Math.round(x)) % 3) * 0.5, 0.36, 0); add(root); break; }
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
      case 'rubble': for (let i = 0; i < 9; i++) { const s = rnd(0.2, 0.7), r = add(box(stone, 0, 0, s, s * rnd(0.5, 1), 0, s)); r.position.set(x + rnd(-1.4, 1.4), y + s * 0.3, rnd(-3.0, -1.7)); r.rotation.set(rnd(0, 1), rnd(0, 3), rnd(0, 1)); } break;
      case 'altar': { if (p.steps) { const sm = tm(DRESS, false, 0.6); for (let i = 0; i < p.steps; i++) add(wbox(sm, x - 2.6 + i * 0.4, y + i * 0.2 - 0.2, x + 2.6 - i * 0.4, y + (i + 1) * 0.2 - 0.2, -3.3 + i * 0.25, -0.6 - i * 0.25)); } const m = surface('mausoleum_marble', 1, 1, { dir: X }); add(box(m, x - 1.5, y, x + 1.5, y + 1.0, -2.8, -1.6)); add(box(std(0x7a1018, { roughness: 0.9 }), x - 1.0, y + 1.0, x + 1.0, y + 1.03, -2.85, -1.5)); for (const dx of [-1.1, 1.1]) { add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 6), BRASS)).position.set(x + dx, y + 1.3, -2.2); add(sprite(flameTex(), 0xffb050, 0.14, 0.24, x + dx, y + 1.75, -2.2)); } this.light(room, x, y + 1.9, -1.4, 0xffa860, 7, 8); break; }
      case 'arch': { const h = Math.min(6, top - y - 0.6); for (const dx of [-2.2, 2.2]) add(box(stone, x + dx - 0.35, y, x + dx + 0.35, y + h - 2.2, ZB + 0.05, ZB + 0.8)); const a = add(new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.35, 6, 20, Math.PI), stone)); a.position.set(x, y + h - 2.2, ZB + 0.42); break; }
      case 'column': if (!(room.pillarX || []).some(px => Math.abs(px - x) < 2.2)) { room.kit ||= await castleKit(); room.slots ||= this.kitSlots(room); this.kitPier(room, x, y, Math.min(top - 0.2, y + 6.5), 0.8); } break;
      case 'waterfall': { const h = Math.min(top - y, 14), t2 = tex('moat_water').clone(); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.repeat.set(1, h / 4); const wf = add(plane(new THREE.MeshBasicMaterial({ map: t2, color: 0x9ad0e0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }), 1.8, h, x, y + h / 2, ZB + 0.3)); add(sprite(glowTex(), 0xa0d8e8, 5, 2.5, x, y + 0.6, ZB + 0.8, 0.4)); room.anim.push(t => { t2.offset.y = t * 0.9; }); this.light(room, x, y + 2, -1, 0x5ab0d0, 7, 9); break; }
      case 'mushroom': { const col = [0x4ad0c0, 0x9a70ff, 0x70e060][Math.abs(Math.round(x)) % 3], cm = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.5 }); for (let i = 0; i < 6; i++) { const h = rnd(0.25, 1.1), cx = x + rnd(-0.9, 0.9), cz = rnd(-2.7, -1.5); add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, h, 6), WAX)).position.set(cx, y + h / 2, cz); const cap = add(new THREE.Mesh(new THREE.SphereGeometry(0.1 + h * 0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cm)); cap.position.set(cx, y + h, cz); } add(sprite(glowTex(), col, 3, 2.4, x, y + 0.7, -2, 0.3)); this.light(room, x, y + 1.0, -1, col, 7, 8); break; }
    }
    for (let k = n0; k < g.children.length; k++) g.children[k].traverse(o => { if (o.isMesh) o.renderOrder = 2; });
    if (room.arcade && /altar|sarcophagus|throne|organ|statue|fountain|furnace|coffin|pews|bigbell|bookshelf/.test(p.t) && (room.pillarX || []).some(px => Math.abs(px - x) < 3.2)) { for (let k = n0; k < g.children.length; k++) g.children[k].position.z += 1.0; for (let k = s0; k < room.sources.length; k++) room.sources[k].z += 1.0; }
    else if (room.arcade && !/window|rose|column|arch/.test(p.t)) { for (let k = n0; k < g.children.length; k++) { const o = g.children[k]; if (o.position.z < ZB + 0.95) o.position.z += 0.55; } for (let k = s0; k < room.sources.length; k++) if (room.sources[k].z < ZB + 1.5) room.sources[k].z += 0.55; }
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
    this.cam = cam;
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
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 1, curveSegments: 8 });
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const rr = Math.hypot(p.getX(i), p.getY(i)) / r, k = rr > 0.97 ? 1.25 : rr > 0.86 ? 0.95 : rr > 0.8 ? 0.55 : rr < 0.32 ? 0.45 : 0.75; col.set([k, k * 0.96, k * 0.9], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
function bannerGeo(w, h) {
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, h / 2); sh.lineTo(w / 2, h / 2); sh.lineTo(w / 2, -h / 2 + w * 0.42); sh.lineTo(0, -h / 2); sh.lineTo(-w / 2, -h / 2 + w * 0.42); sh.lineTo(-w / 2, h / 2);
  const geo = new THREE.ShapeGeometry(sh), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5); return geo;
}

let _flame, _glow, _ray, _lava, _cloud, _glass, _mirror, _grad;
const stripCache = new Map();
// a horizontal moulding strip that tiles along its length
function stripTex(name, rep, dir = X) { const k = name + rep; if (!stripCache.has(k)) { const t = tex(name, dir).clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(Math.max(1, rep), 1); stripCache.set(k, t); } return stripCache.get(k); }
function mirrorTex() { return _mirror ||= canvasTex(64, 128, x => { const g = x.createLinearGradient(0, 0, 64, 128); g.addColorStop(0, '#39405c'); g.addColorStop(0.45, '#10121e'); g.addColorStop(0.55, '#1c2034'); g.addColorStop(1, '#5a6288'); x.fillStyle = g; x.fillRect(0, 0, 64, 128); x.globalAlpha = 0.25; x.fillStyle = '#c8d4ff'; x.beginPath(); x.moveTo(8, 128); x.lineTo(30, 0); x.lineTo(40, 0); x.lineTo(18, 128); x.fill(); x.globalAlpha = 0.5; x.fillStyle = '#0a0a12'; x.beginPath(); x.ellipse(36, 92, 9, 26, 0, 0, 7); x.fill(); x.beginPath(); x.arc(36, 58, 7, 0, 7); x.fill(); }); }
// soft black fade used to ground the tops and bottoms of tall walls
function gradTex() { return _grad ||= canvasTex(4, 128, x => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(0.4, 'rgba(0,0,0,.1)'); g.addColorStop(0.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)'); x.fillStyle = g; x.fillRect(0, 0, 4, 128); }); }
let _dial; function dialTex() { return _dial ||= canvasTex(512, 512, x => { const g = x.createRadialGradient(256, 256, 40, 256, 256, 256); g.addColorStop(0, '#f2e2b8'); g.addColorStop(0.75, '#c8a870'); g.addColorStop(1, '#3a2a14'); x.fillStyle = g; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill();
  x.strokeStyle = '#2a1c0c'; x.lineWidth = 6; for (const r of [244, 196, 120]) { x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); }
  x.fillStyle = '#20140a'; x.font = 'bold 44px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * Math.PI * 2; x.save(); x.translate(256 + Math.sin(a) * 220, 256 - Math.cos(a) * 220); x.rotate(a); x.fillText(n, 0, 0); x.restore(); });
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; x.beginPath(); x.moveTo(256 + Math.sin(a) * 196, 256 - Math.cos(a) * 196); x.lineTo(256 + Math.sin(a) * (i % 5 ? 184 : 170), 256 - Math.cos(a) * (i % 5 ? 184 : 170)); x.lineWidth = i % 5 ? 2 : 5; x.stroke(); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.sin(a) * 120, 256 - Math.cos(a) * 120); x.lineWidth = 3; x.stroke(); } }); }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function glowTex() { return _glow ||= canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }); }
export function flameTex() { return _flame ||= canvasTex(32, 64, x => { const g = x.createRadialGradient(16, 44, 2, 16, 40, 22); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.4, 'rgba(255,180,60,.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(16, 2); x.quadraticCurveTo(30, 40, 16, 62); x.quadraticCurveTo(2, 40, 16, 2); x.fill(); }); }
function rayTex() { return _ray ||= canvasTex(32, 128, (x) => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 128); const h = x.createLinearGradient(0, 0, 32, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = h; x.fillRect(0, 0, 32, 128); }); }
// molten rock: dark crust islands over bright seams
export function lavaTex() { return _lava ||= canvasTex(256, 256, (x) => { x.fillStyle = '#ff7a10'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(255,240,150,.9)'); g.addColorStop(1, 'rgba(255,120,0,0)'); x.save(); x.translate(Math.random() * 256, Math.random() * 256); x.scale(rnd(10, 40), rnd(10, 40)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore(); } for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(${rnd(20, 60) | 0},${rnd(4, 14) | 0},0,${rnd(0.5, 0.95)})`; x.beginPath(); const cx = Math.random() * 256, cy = Math.random() * 256, r = rnd(8, 26); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, rr = r * rnd(0.6, 1.1); x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); } }); }
function cloudTex() { return _cloud ||= canvasTex(256, 128, (x) => { for (let i = 0; i < 46; i++) { const cx = rnd(30, 226), cy = rnd(40, 100), r = rnd(18, 46), g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 128); }
  x.globalCompositeOperation = 'destination-in'; const h = x.createLinearGradient(0, 0, 256, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.22, 'rgba(0,0,0,1)'); h.addColorStop(0.78, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = h; x.fillRect(0, 0, 256, 128);
  const v = x.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.3, 'rgba(0,0,0,1)'); v.addColorStop(0.8, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = v; x.fillRect(0, 0, 256, 128); }); } // feathered on every edge: no hard-ended cards
// Leaded night glass: deep navy, moonlit toward the top, a few cool panes.
function glassTex() {
  return _glass ||= canvasTex(64, 128, (x) => {
    const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#4a5c96'); gr.addColorStop(0.45, '#26335e'); gr.addColorStop(1, '#121a34'); x.fillStyle = gr; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${140 + Math.random() * 60 | 0},220,${0.08 + Math.random() * 0.12})`; x.fillRect((Math.random() * 4 | 0) * 16, (Math.random() * 8 | 0) * 16, 16, 16); }
    x.strokeStyle = 'rgba(10,8,16,.85)'; x.lineWidth = 1.5; for (let i = 16; i < 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); } for (let i = 16; i < 128; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); }
  });
}

// Statue pose for the knight rig (it has no animations, so it would stand in a T-pose): upper arms down at the sides,
// forearms brought forward across the body.
function restPose(root) {
  root.updateMatrixWorld(true);
  const V = THREE.Vector3, Q = THREE.Quaternion;
  const aim = (bone, child, dir) => {
    const o = bone.getWorldPosition(new V()), c = child.getWorldPosition(new V());
    const q = new Q().setFromUnitVectors(c.sub(o).normalize(), dir.clone().normalize());
    const wq = q.multiply(bone.getWorldQuaternion(new Q())), pq = bone.parent.getWorldQuaternion(new Q());
    bone.quaternion.copy(pq.invert().multiply(wq)); bone.updateMatrixWorld(true);
  };
  const b = n => root.getObjectByName(n);
  // the model's forward: from the pelvis towards the toes
  const fwd = b('ball_l') && b('foot_l') ? b('ball_l').getWorldPosition(new V()).sub(b('foot_l').getWorldPosition(new V())).setY(0).normalize() : new V(0, 0, 1);
  for (const side of ['l', 'r']) {
    const up = b('upperarm_' + side), lo = b('lowerarm_' + side), hand = b('hand_' + side);
    if (!up || !lo || !hand) continue;
    const out = up.getWorldPosition(new V()).sub(b('spine_03').getWorldPosition(new V())).setY(0).normalize();
    aim(up, lo, new V(0, -1, 0).addScaledVector(out, 0.18).addScaledVector(fwd, 0.12));
    aim(lo, hand, new V(0, -0.35, 0).addScaledVector(fwd, 1).addScaledVector(out, -0.55));
  }
}
