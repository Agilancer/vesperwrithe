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
  hall:      { arcade: true, back: ['wall_ashlar', I], floor: ['flags', T0], wall: ['ashlar', T0], block: ['ashlar', T0], fog: [0x0b0810, 16, 48], amb: 0.47, moon: 0.45, pillars: true, trim: 0x9a8c70 },
  shaft:     { arcade: true, back: ['block', T0], floor: ['flags', T0], wall: ['ashlar', T0], block: ['ashlar', T0], fog: [0x080a10, 16, 50], amb: 0.47, moon: 0.45, trim: 0x9a8c70 },
  shrine:    { arcade: true, back: ['marble', I, 0x9a7a7a], floor: ['floor_diamond', I], wall: ['ashlar', T0], block: ['oxblood_marble', X], fog: [0x12060a, 12, 40], amb: 0.49, moon: 0.45, trim: 0xc08a6a },
  gallery:   { arcade: true, back: ['panel', I], floor: ['boards', I], wall: ['ashlar', T0], block: ['pv_carved_panels', X], fog: [0x0c0a12, 16, 50], amb: 0.47, moon: 0.6, pillars: true, rug: ['carpet', I], trim: 0xb09060 },
  crypt:     { arcade: true, fire: 0xffd29a, back: ['cata_wall', I], floor: ['cata_floor', I], wall: ['cata_wall2', I], block: ['cata_block', I], fog: [0x05070a, 10, 36], amb: 0.43, moon: 0.45, trim: 0x7a8a80 },
  chapel:    { arcade: true, back: ['wall_rough', I], floor: ['flags', T0], wall: ['ashlar', T0], block: ['pv_carved_stone', X], fog: [0x0e0a14, 18, 60], amb: 0.45, moon: 0.8, pillars: true, trim: 0x9a8c70 },
  throne:    { arcade: true, dress: DRESS_RED, back: ['keep_wall_b', P3, 0xa89cb0], floor: ['rich_flags', P3, 0x8a8090], wall: ['ashlar', T0], block: ['oxblood_marble', X], fog: [0x0a0610, 18, 60], amb: 0.45, moon: 0.6, pillars: true, rug: ['pv_red_gothic', X], trim: 0xc0a060 },
  courtyard: { sky: 'moon', wallH: 4, backWall: ['pv_curtain_granite_a', X], floor: ['pv_courtyard_setts_a', X], wall: ['pv_curtain_granite_b', X], block: ['pv_rusticated_plinth_a', X], fog: [0x161c30, 20, 110], amb: 0.5, moon: 1.7, trim: 0x8a94a8 },
  vestibule: { arcade: true, dress: DRESS_RED, back: ['pv_limestone_interior_a', X, 0x8a847c], floor: ['pv_velscour_inlay_a', X, 0x8a8078], wall: ['pv_keep_dressed_stone_a', X], block: ['oxblood_marble', X], fog: [0x0e0a12, 20, 70], amb: 0.49, moon: 0.6, pillars: true, rug: ['pv_red_gothic', X], trim: 0xd0b070 },
  servants:  { back: ['pv_warm_grey_plaster', X], wainscot: ['pv_wood_panelling', X], floor: ['worn_floorboards', X], wall: ['pv_city_clay_brick_a', X], block: ['pv_hearth_brick', X], fog: [0x100b08, 14, 46], amb: 0.43, moon: 0.45, trim: 0xa07a50, beams: true },
  aqueduct:  { back: ['waterline_wall', X], floor: ['pv_undercroft_blocks_a', X], wall: ['pv_undercroft_blocks_c', X], block: ['pv_undercroft_blocks_b', X], fog: [0x06100e, 12, 44], amb: 0.45, moon: 0.45, trim: 0x6a9a8a, damp: true },
  cistern:   { arcade: true, back: ['pv_bastion_basalt_a', X], floor: ['pv_hall_flagstones_c', X], wall: ['pv_bastion_basalt_b', X], block: ['pv_bastion_basalt_c', X], fog: [0x040c12, 14, 60], amb: 0.45, moon: 0.45, pillars: true, trim: 0x5a9ab0, damp: true },
  ossuary:   { back: ['bone_wall', X], floor: ['bone_joint_flags', X], wall: ['bone_inlay_stone', X], block: ['bone_plaster', X], fog: [0x0c0a08, 14, 52], amb: 0.47, moon: 0.45, trim: 0xd0c4a0 },
  prison:    { back: ['pv_curtain_granite_c', X, 0x8a8a90], floor: ['ward_paving', X], wall: ['riveted_plate', X], block: ['heavy_rust', X], fog: [0x0a0806, 12, 44], amb: 0.43, moon: 0.45, trim: 0xb07040, bars: true },
  portrait:  { back: ['pv_red_damask', X], floor: ['worn_floorboards', X, 0xb09080], wall: ['pv_walnut_panel', X], block: ['black_panelling', X], fog: [0x100608, 16, 50], amb: 0.49, moon: 0.45, rug: ['pv_wine_wool', X], trim: 0xc8a050, wainscot: ['pv_oak_panel', X] },
  library:   { back: ['book_spines', X], floor: ['oak_planks', X], wall: ['pv_dark_walnut', X], block: ['pv_carved_wood', X], fog: [0x0c0806, 16, 52], amb: 0.51, moon: 0.45, rug: ['pv_blue_geometric', X], trim: 0xc09a50 },
  garden:    { sky: 'moon', wallH: 3.6, backWall: ['pv_curtain_granite_b', X], floor: ['dead_grass', X], wall: ['pv_curtain_granite_d', X], block: ['moss_1', T0], fog: [0x101a1a, 18, 100], amb: 0.48, moon: 1.6, trim: 0x6a8a50, trimGlow: 0.07, ivy: true },
  menagerie: { back: ['pv_keep_dressed_stone_b', X], floor: ['straw_ground', X], wall: ['pv_keep_dressed_stone_c', X], block: ['riveted_plate', X], fog: [0x0c0a06, 14, 50], amb: 0.45, moon: 0.45, trim: 0xa08040, bars: true },
  catacomb:  { arcade: true, fire: 0xffd29a, back: ['skulls', I], floor: ['cata_floor2', I], wall: ['cata_wall3', I], block: ['cata_block', I], fog: [0x060606, 9, 34], amb: 0.42, moon: 0.45, trim: 0xb0a890 },
  royalcrypt:{ arcade: true, fire: 0xffdcb0, back: ['mausoleum_marble', X, 0x8a8a98], floor: ['bone_checker', X, 0x8a8078], wall: ['pv_chalk_ashlar', X], block: ['mausoleum_marble', X], fog: [0x0a0a10, 12, 44], amb: 0.47, moon: 0.45, pillars: true, trim: 0xc8c8e0 },
  clock:     { back: ['bronze_plates', X, 0x9a9080], floor: ['walk_paving', X], wall: ['riveted_plate', X], block: ['bronze_plates', X], fog: [0x0c0a06, 16, 56], amb: 0.49, moon: 0.45, trim: 0xd0a040, cogs: true },
  mine:      { back: ['granite_cliff', X], floor: ['ash_clay_ground', X], wall: ['obsidian', X], block: ['keep_basalt', X], fog: [0x06060a, 10, 40], amb: 0.43, moon: 0.45, trim: 0x8070b0 },
  forge:     { back: ['ph_soot_brick', T0], floor: ['ash_street', X], wall: ['pv_smoky_rose_brick', X], block: ['pv_hearth_brick', X, 0x9a8a80], fog: [0x140804, 12, 46], amb: 0.43, moon: 0.45, trim: 0xff8a40, heat: true },
  magma:     { back: ['obsidian', X], floor: ['scree', X, 0x8a7a70], wall: ['keep_basalt', X], block: ['keep_basalt', X, 0xa09088], fog: [0x180604, 12, 48], amb: 0.45, moon: 0.45, trim: 0xff6a20, heat: true },
  mirror:    { arcade: true, back: ['pv_ivory_lime_plaster', X, 0x9a94a8], floor: ['bone_checker', X, 0xc0b8d0], wall: ['mausoleum_marble', X], block: ['pv_carved_stone', X, 0xc8c0d8], fog: [0x0c0a14, 16, 56], amb: 0.49, moon: 0.5, pillars: true, rug: ['pv_plum_wool', X], trim: 0xd0c0ff },
  observatory:{ back: ['pv_keep_dressed_stone_c', X, 0x7078b0], floor: ['pv_velscour_inlay_c', X], wall: ['pv_keep_dressed_stone_c', X], block: ['pv_keep_dressed_stone_b', X, 0xa0a8d0], starBand: true, fog: [0x060814, 16, 60], amb: 0.49, moon: 0.6, trim: 0x90a8ff, stars: true },
  rampart:   { sky: 'storm', wallH: 1.3, backWall: ['castle_stone', P3], floor: ['walk_paving', X, 0x9a9aa8], wall: ['castle_stone', P3], block: ['keep_wall_b', P3], fog: [0x10141e, 20, 120], amb: 0.5, moon: 1.3, trim: 0x8a94a8, merlons: true },
  belfry:    { back: ['pv_curtain_granite_d', X], floor: ['tar_boards', X], wall: ['pv_curtain_granite_a', X], block: ['adzed_beam', X], fog: [0x0a0c14, 16, 60], amb: 0.47, moon: 0.7, trim: 0xb0b8d0, beams: true },
  frost:     { back: ['snowrock_1', T0, 0xa8b8c8], floor: ['frost_1', T0, 0xd8e4ec], wall: ['snowrock_1', T0, 0xb8c8d8], block: ['snowrock_1', T0, 0xd0e0f0], fog: [0x0c1824, 14, 50], amb: 0.51, moon: 0.7, trim: 0x9fe4ff },
  sanctum:   { arcade: true, back: ['keep_smooth', P3, 0x8a84b0], floor: ['pv_bastion_basalt_d', X], wall: ['keep_basalt', X], block: ['pv_bastion_basalt_c', X, 0xb0a8d8], fog: [0x04030a, 12, 50], amb: 0.45, moon: 0.45, trim: 0x9070ff, stars: true },
  hollow:    { arcade: true, back: ['pv_keep_dressed_stone_a', X, 0x9a8a78], dress: DRESS_RED, floor: ['pv_velscour_inlay_d', X, 0x8a8078], wall: ['bloodstone', X], block: ['oxblood_marble', X], fog: [0x100604, 18, 70], amb: 0.49, moon: 0.5, pillars: true, rug: ['pv_red_gothic', X], trim: 0xffc050 },
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
const DOOR_DARK = new THREE.MeshBasicMaterial({ color: 0x020203 }), DOOR_GLOW = new THREE.MeshBasicMaterial({ color: 0x8a9ac0, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending });
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
    for (const set0 of [vc, plain]) for (const set1 of [set0.filter(g => g.index), set0.filter(g => !g.index)]) for (const set of [set1.filter(g => g.userData.walk), set1.filter(g => !g.userData.walk)]) { // merging needs one index layout per set; walkable pieces apart
      if (!set.length) continue; const merged = mergeGeometries(set, false), sh = !m.transparent, ro = set[0].userData.walk && !m.transparent ? WALK_RO : 0;
      if (merged) { const mesh = new THREE.Mesh(merged, m); mesh.castShadow = sh; mesh.receiveShadow = true; mesh.renderOrder = ro; room.group.add(mesh); set.forEach(g => g.dispose()); }
      else for (const g of set) { const mesh = new THREE.Mesh(g, m); mesh.castShadow = sh; mesh.receiveShadow = true; mesh.renderOrder = ro; room.group.add(mesh); } // never drop a piece silently
    }
  }
  room.batch = null;
}
// What the hero stands on (floors, slabs, blocks, stair treads and strings) draws AFTER his x-ray pass (player.js: x-ray at
// renderOrder 1, over a boss 2.5; the hero at 3), so only walls, pillars and props light the x-ray. Seen from below a ledge, its
// front lip (z up to +2.6) projected over his boots and lit them blue, and a boot set against the next stair's riser did the same.
const WALK_RO = 2.75;
const walkable = o => o.traverse(c => { if (c.isMesh && [].concat(c.material).every(m => !m.transparent)) c.renderOrder = WALK_RO; });
// static dressing joins the room's per-material batches (merged in flushKit): geometry already placed in world space
function bat(room, m, g, uv = true) { if (uv) worldUV(g); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); room.batch ||= new Map(); if (!room.batch.has(m)) room.batch.set(m, []); room.batch.get(m).push(g); return g; }
const gBox = (x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };
const pose = (g, x, y, z, rx = 0, ry = 0, rz = 0) => { if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz); return g.translate(x, y, z); }; // rotate, then place
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
const BEAM = std(0x2a1c12, { roughness: 0.85 }), IRON = new THREE.MeshStandardMaterial({ color: 0x6a6460, map: texture(P3 + 'iron_c.webp'), metalness: 0.7, roughness: 0.55 }), BRASS = std(0x7a5a2a, { metalness: 0.9, roughness: 0.42 }), BRASS_R = std(0x6a4e26, { metalness: 0.75, roughness: 0.68 }) /* worn: a flat polished spoke caught a near window light as a white square */, WAX = std(0xe8dcc0, { roughness: 0.6 }), DARK = std(0x15121a, { roughness: 0.7 });
function tex(name, dir = X) { return texture(`${dir}${name}_c.webp`); }
// block dressing (dressBlock): faces that read as one slab get ashlar joints; per-theme stone for quoins and cornices; a stain per theme
// (only genuinely smooth stone: bastion basalt, keep basalt, carved stone and the marbles have their own courses baked in, and a cut grid over them doubled it)
const MONO = /obsidian|bloodstone|plaster|smooth|snowrock|moss_|limestone_1|leaves/;
const QTRIM = { magma: ['keep_basalt', X, 0xc8b4a0], sanctum: ['pv_bastion_basalt_a', X, 0xa8a0d0], ossuary: ['bone_ashlar', P3], catacomb: ['cata_block', I, 0xc0b8a0], crypt: ['cata_block', I], forge: ['pv_hearth_sandstone', X], frost: ['snowrock_1', T0, 0xe0ecf8], aqueduct: ['pv_undercroft_blocks_d', X, 0xb8c0b0], cistern: ['pv_bastion_basalt_a', X, 0xa8b0b8], observatory: ['pv_keep_dressed_stone_b', X, 0xb8c0e0] };
const STAIN = { magma: ['scorch_mark', 0x050302], forge: ['soot_streaks', 0x050302], aqueduct: ['damp_rise', 0x0a1410], cistern: ['damp_rise', 0x081416], prison: ['rust_streaks', 0x3a1808], menagerie: ['grime_noise', 0x100c08], clock: ['rust_streaks', 0x2a1a08], sanctum: ['cracks', 0x1a1030], crypt: ['damp_rise', 0x0a100c], catacomb: ['grime_noise', 0x0a0806], royalcrypt: ['cracks', 0x30303a], ossuary: ['grime_noise', 0x100c08], frost: ['cracks', 0x2a3a4a], library: ['grime_noise', 0x0a0604], portrait: ['grime_noise', 0x0a0604] };
// mortar joints are dark and dull in every theme; in magma basalt and the sanctum a few hairline cracks (jagged, two to four short
// segments) carry the faintest heat: never a straight lit bar
let _jm; function JOINT() { return _jm ||= std(0x0c0a09, { roughness: 1 }); }
const JGLOW = { magma: [0xff4a12, 0.1], sanctum: [0x6a3cc0, 0.08] }, _jg = {}; function JCRACK(th) { const k = JGLOW[th]; return k ? (_jg[th] ||= std(0x0c0a09, { emissive: k[0], emissiveIntensity: k[1], roughness: 1 })) : null; }
let _aom; const AOM = () => _aom ||= new THREE.MeshBasicMaterial({ map: aoTex(), transparent: true, depthWrite: false });
// arcade bay fills (recessFill) and wall rhythms (rhythm) per theme: [style, spacing, first offset]
const RFILL = { mirror: 'mirror', throne: 'drape', hollow: 'drape', vestibule: 'drape', royalcrypt: 'loculi', catacomb: 'loculi', crypt: 'skulls', sanctum: 'void', cistern: 'tide', hall: 'loop' }, RCOL = { throne: 0x6a0c14, hollow: 0x7a1a0c, vestibule: 0x4a0c22 };
const RHYTHM = { servants: ['timber', 5, 2.5], belfry: ['timber', 5, 2.5], portrait: ['walnut', 6.667, 3.333], library: ['book', 3.333, 1.667], menagerie: ['stone', 6.667, 3.333], prison: ['stone', 6.65, 2.65], ossuary: ['bone', 5, 2.5], forge: ['brick', 6.667, 3.333], magma: ['basalt', 8, 4], clock: ['iron', 5, 2.5], mine: ['mine', 4, 2], aqueduct: ['brickarch', 6.667, 3.333], observatory: ['col', 6.667, 3.333], frost: ['stone', 6.667, 3.333],
  // arcade bays by room id (World.arcade; 6.667 m otherwise): one width, or two alternating (a wide bay and a narrow one, the 'alternating system')
  gatehouse: ['arcade', [5.333, 8]], lowerhall: ['arcade', 8.889], greathall: ['arcade', [8.889, 4.444]] };
const PDEP = { timber: 0.2, walnut: 0.14, book: 0.42, iron: 0.12, stone: 0.24, bone: 0.24 }; // how far each rhythm post's face stands off the wall (0.3 otherwise)
const SLIT = new THREE.MeshBasicMaterial({ color: 0x030306 }), SLITGLOW = new THREE.MeshBasicMaterial({ color: 0x6a80c0, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }), TIDE = std(0x5e5e50, { roughness: 1 }); // a dull scum line, not a pale stripe
const _drapeM = {}; const drapeMat = hex => _drapeM[hex] ||= new THREE.MeshStandardMaterial({ map: drapeTex(hex), alphaTest: 0.5, roughness: 0.85, side: THREE.DoubleSide });
let _voidM; const VOIDM = () => _voidM ||= new THREE.MeshBasicMaterial({ map: (() => { const t = voidTex(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.3, 0.3); return t; })() });
// each room's signature dressing (World.furnish), and where the battlement is broken through (room-local centre, half-width)
const SIG = { kitchen: ['pans', 'cauldron'], cellar: ['racks'], arsenal_gate: ['arms'], arsenal_vault: ['arms'], athenaeum: ['lectern', 'books'], librarian_nook: ['lectern'], sealed_stacks: ['books'], last_index: ['lectern'], scribes_labyrinth: ['books', 'lectern'], burning_stacks: ['books', 'crucible'],
  belfry_climb: ['ropes'], queens_roost: ['nest', 'ropes'], tower_crown: ['carillon', 'ropes'], hg_belfry: ['ropes'], hg_narthex: ['ropes'], hg_tempest: ['ropes'], crown: ['sun'], hk_throne: ['sun'], hg_orrery: ['chart'], hg_starvault: ['chart'],
  foundry: ['crucible', 'trough'], warden_hall: ['trough'], slag_run: ['crucible'], roost: ['nest'], warrens: ['burrows'], drowned_charnel: ['tide'], drowned_reliquary: ['tide'], lowerhall: ['staffs'], false_faces: ['masks'], hs_nave: ['voids'], wyrm_lair: ['hoard'],
  menagerie: ['straw', 'trough'], undercroft: ['well'], molten_lake: ['fissures'], hg_breach: ['breach'], adit: ['rails'], longdrop: ['rails'], winding: ['rails'], fungal_reservoir: ['caps'] };
const BREACH = { hg_breach: [20, 2.3] };
// a low slab in a room of giant fungi is drawn as a mushroom cap (furnish 'caps'), not a stone shelf; so is a high slab standing free
// over the floor (no stone within a metre of it, nothing but the floor under it): the cap of the tallest fungus, its stalk from the floor
const capPlat = (room, s) => {
  if (s.kind !== 'plat' || !SIG[room.def.id]?.includes('caps') || s.x1 - s.x0 > 6) return false;
  const fy = room.b.y0 + FLOOR, cx = (s.x0 + s.x1) / 2; if (s.y1 < fy + 8) return true; if (s.y1 > fy + 16) return false;
  const near = room.solids.some(o => o !== s && !o.oneway && o.kind !== 'ceil' && o.y0 < s.y1 + 1 && o.y1 > s.y0 - 1 && o.x0 < s.x1 + 1.2 && o.x1 > s.x0 - 1.2);
  return !near && !room.solids.some(o => !o.oneway && o.kind !== 'ceil' && cx > o.x0 && cx < o.x1 && o.y1 <= s.y0 + 0.01 && o.y1 > fy + 0.05);
};
// per-room theme tweaks on top of the theme (main.js reads room.theme for the ambient and the fog)
// per-room light overrides for the rooms that measured darkest in captures (mean luma < 0.08): big halls whose theme fog
// starts closer than the camera sits when it zooms out, so the far wall went to black
const ROOM_T = {
  fungal_reservoir: { amb: 0.95, moon: 0.9, fog: [0x0e2420, 24, 80], expo: 1.5, tint: 0x80c6b4, vault: 0.4 }, // a 3x3 cavern lit by its own fungi; its walls take a damp teal-green (0x3a5a52's hue, at the brightness of the other theme tints); its vault keeps most of its light (the fade under it at 0.4: the main view is its upper half)
  hs_nave: { amb: 0.62, moon: 0.6, fog: [0x0a0814, 18, 62], expo: 1.5 },
  great_movement: { amb: 0.62, moon: 0.55, fog: [0x14100a, 20, 64], expo: 1.45 },
  pendulum_gallery: { expo: 1.25 },
  charnel_nest: { expo: 1.15 },
  undercroft: { amb: 0.58, moon: 0.55, fog: [0x0a0c10, 14, 44], expo: 1.25 },
  athenaeum: { amb: 0.64, moon: 0.55, fog: [0x140e0a, 20, 62], expo: 1.2 },
  scribes_labyrinth: { amb: 0.64, moon: 0.55, fog: [0x140e0a, 20, 62], expo: 1.2 },
  chimney: { amb: 0.58, moon: 0.55, fog: [0x200a06, 16, 56], expo: 1.2 },
};
const FMAT = {}, fmat = (k, f) => FMAT[k] ||= f(); // furnishing materials, one of each so the room batches merge them
const COPPER = () => fmat('cu', () => new THREE.MeshStandardMaterial({ color: 0xb8683c, metalness: 0.8, roughness: 0.38, envMap: ENV, envMapIntensity: 1.1, emissive: 0x140804 })), STEEL = () => fmat('st', () => new THREE.MeshStandardMaterial({ color: 0xa8acb4, metalness: 0.85, roughness: 0.3, envMap: ENV, envMapIntensity: 1.2 }));
const COIN = () => fmat('coin', () => { const t = coinTex(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return new THREE.MeshStandardMaterial({ map: t, metalness: 0.7, roughness: 0.35, envMap: ENV, envMapIntensity: 1.3, emissive: 0x3a2404, emissiveMap: t, emissiveIntensity: 0.5 }); });
const GLASSB = () => fmat('gb', () => std(0x16261a, { roughness: 0.22, metalness: 0.4, emissive: 0x020604 })), ROPE = () => fmat('rp', () => std(0x8a7050, { roughness: 1 })), BONE = () => fmat('bn', () => std(0xd8ccb0, { roughness: 0.6 })), STRAW = () => fmat('sw', () => std(0xb89a50, { roughness: 1, emissive: 0x100a02 }));
const PORC = () => fmat('pc', () => std(0xe8e2da, { roughness: 0.32, emissive: 0x141210 })), LEATHER = i => fmat('lt' + i, () => std([0x5a1a14, 0x1a3a2a, 0x4a3018, 0x1a2244][i], { roughness: 0.7 })), PAINT = i => fmat('pt' + i, () => std([0x6a1418, 0x14285a, 0xd8d0c0][i], { roughness: 0.6 }));
const SALLY = i => fmat('sa' + i, () => std([0x8a1a1a, 0xd8ccb0][i], { roughness: 1 })), GEM = i => fmat('gem' + i, () => std([0xc01830, 0x18a050][i], { emissive: [0xc01830, 0x18a050][i], emissiveIntensity: 0.6, roughness: 0.15 }));
// Lava, water and falls are drawn by small shaders in room-local metres (value noise, no textures), all on one clock
const FXT = { value: 0 };
const NOISE = `float hh(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y); }`;
const FX_VS = 'varying vec3 vL; varying vec3 vN; varying vec2 vUv; void main() { vL = position; vN = normal; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FX_OUT = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// molten rock: rafts of black crust drifting on the melt, hot seams where they part, and a soft lick wherever it meets the stone
// banks or the wall. The section (front and ends) is no lit pane: an opaque dark crust (0x140a06), only its top ~0.35 m still
// glowing with the melt behind it; the surface's near lip cools to meet it softly. Everything is held under the bloom threshold
// (luminance 0.72 before exposure, 0.3 along the surface's front edge, which an edge-on view crushes into one line): hot orange, never
// a white corner. (uB = x0, x1, surface y; uK scales the surface's noise: (1, 1.8) on a pool seen from above, world-scaled (0.4, 0.4)
// on a raised slab seen edge-on, where finer noise smeared into streaks)
const LAVA_FS = `uniform float uT; uniform vec3 uB; uniform vec2 uK; varying vec3 vL; varying vec3 vN;
${NOISE}
void main() {
  float top = step(0.5, vN.y), t = uT, lim = 0.45;
  vec2 p = mix(vec2(vL.x, vL.y * 1.4), vL.xz * uK, top), q = p * 0.7 + vec2(t * 0.06, t * 0.025);
  float n = vn(q) * 0.62 + vn(q * 2.1 + vec2(-t * 0.09, t * 0.04)) * 0.38, crack = 1.0 - smoothstep(0.015, 0.075, abs(n - 0.5)), plate = smoothstep(0.4, 0.6, vn(q * 0.45 + 3.7)), pulse = 0.8 + 0.2 * sin(t * 1.6 + vn(p * 0.25) * 6.2832);
  vec3 melt = mix(vec3(1.0, 0.34, 0.05), vec3(1.0, 0.7, 0.24), vn(q * 1.6 + t * 0.1)) * pulse, crust = mix(vec3(0.07, 0.025, 0.015), vec3(0.2, 0.06, 0.025), vn(p * 3.3));
  vec3 c = mix(melt, crust, plate * (1.0 - crack)) + vec3(1.0, 0.55, 0.15) * crack * plate * pulse;
  if (top > 0.5) {
    float e = min(min(vL.x - uB.x, uB.y - vL.x), vL.z + 3.35);
    c += vec3(1.0, 0.62, 0.25) * (1.0 - smoothstep(0.0, 0.6, e + (n - 0.5) * 0.5)) * 0.45;
    c = mix(c * 0.55, c, smoothstep(0.0, 0.45, 2.55 - vL.z + (n - 0.5) * 0.2));
    lim = mix(0.3, 0.72, smoothstep(0.0, 0.6, 2.55 - vL.z));
  } else {
    float dd = uB.z - vL.y, band = 1.0 - smoothstep(0.04, 0.36 + (n - 0.5) * 0.1, dd);
    vec3 rock = vec3(0.078, 0.039, 0.024) * mix(0.65, 1.3, vn(p * 3.3 + 7.1));
    c = mix(rock, mix(melt, crust * 1.4, plate * (1.0 - crack)) * mix(0.55, 0.2, smoothstep(0.0, 0.36, dd)), band);
    c += vec3(0.5, 0.15, 0.03) * crack * band * 0.35;
  }
  vec3 lc = pow(c, vec3(2.2)); lc *= min(1.0, lim / max(dot(lc, vec3(0.2126, 0.7152, 0.0722)), 1e-4));
  gl_FragColor = vec4(lc, 1.0);` + FX_OUT;
// water: ripples and moonlit crests on the surface, foam where it laps the banks. The section is no lit glass box: the
// surface's colour at a third, deepening to black-green, faint caustics, a soft broken waterline, more opaque toward the
// bottom (to 0.55), its top edge and its ends feathered; the surface thins out toward its near edge (kept see-through enough
// to show a swimmer). The surface is unlit, so uLit (from the room's ambient) dims it in the dark rooms: never the brightest thing there
const WATER_FS = `uniform float uT; uniform vec3 uB; uniform float uLit; varying vec3 vL; varying vec3 vN;
${NOISE}
void main() {
  float top = step(0.5, vN.y), t = uT; vec2 p = mix(vec2(vL.x, vL.y), vec2(vL.x, vL.z * 1.5), top);
  float r = vn(p * 1.3 + vec2(t * 0.35, t * 0.2)) * 0.6 + vn(p * 3.1 - vec2(t * 0.5, -t * 0.3)) * 0.4, ex = min(vL.x - uB.x, uB.y - vL.x); vec3 c; float a;
  if (top > 0.5) { float e = min(ex, vL.z + 3.4), foam = 1.0 - smoothstep(0.0, 0.5, e + (r - 0.5) * 0.5);
    c = mix(vec3(0.1, 0.3, 0.36), vec3(0.32, 0.58, 0.64), r) + vec3(0.55, 0.75, 0.8) * smoothstep(0.7, 0.82, r) * 0.6; c = mix(c, vec3(0.78, 0.9, 0.92), foam * 0.85); a = 0.5 + foam * 0.4;
    a *= mix(0.6, 1.0, smoothstep(0.0, 0.7, 1.9 - vL.z)); c *= uLit; }
  else { float d = uB.z - vL.y, k = smoothstep(0.0, 1.0, clamp(d / 3.0, 0.0, 1.0));
    c = mix(mix(vec3(0.1, 0.3, 0.36), vec3(0.32, 0.58, 0.64), r) * 0.35, vec3(0.008, 0.03, 0.045), k);
    c += vec3(0.035, 0.085, 0.09) * smoothstep(0.62, 0.86, vn(vec2(vL.x * 1.7 + t * 0.4, vL.y * 2.5 - t * 0.25))) * (1.0 - k);
    float wl = d - 0.06 + sin(vL.x * 2.1 + t * 1.8) * 0.03 + (r - 0.5) * 0.08, foam = (1.0 - smoothstep(0.0, 0.18, abs(wl))) * (0.2 + 0.25 * smoothstep(0.3, 0.6, r));
    c = mix(c, vec3(0.4, 0.5, 0.54), foam); a = (mix(0.3, 0.55, k) + foam * 0.15) * smoothstep(-0.02, 0.1, d) * mix(0.55, 1.0, smoothstep(0.0, 0.4, ex)); }
  gl_FragColor = vec4(pow(c, vec3(2.2)), clamp(a, 0.0, 1.0));` + FX_OUT;
// a fall of water: streaks pouring down, feathered at the sides, a bright tongue at the lip, churned white at the foot (uS = w, h)
const FALL_FS = `uniform float uT; uniform vec2 uS; varying vec2 vUv;
${NOISE}
void main() {
  float s = vn(vec2(vUv.x * uS.x * 4.0, vUv.y * uS.y * 0.4 + uT * 2.2)) * 0.6 + vn(vec2(vUv.x * uS.x * 9.0, vUv.y * uS.y * 0.9 + uT * 3.6)) * 0.4;
  float side = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x), foot = 1.0 - smoothstep(0.0, 1.2 / uS.y, vUv.y), lip = smoothstep(1.0 - 0.6 / uS.y, 1.0, vUv.y);
  vec3 c = mix(vec3(0.3, 0.55, 0.65), vec3(0.85, 0.95, 1.0), clamp(smoothstep(0.45, 0.8, s) + foot * 0.7 + lip * 0.4, 0.0, 1.0));
  float a = side * (0.22 + 0.5 * smoothstep(0.3, 0.78, s) + foot * 0.35) * (1.0 - smoothstep(0.985, 1.0, vUv.y));
  gl_FragColor = vec4(pow(c, vec3(2.2)), a * 0.85);` + FX_OUT;
const fxMat = (fs, u, o = {}) => new THREE.ShaderMaterial({ uniforms: { uT: FXT, ...u }, vertexShader: FX_VS, fragmentShader: fs, ...o });
// white-on-black mask textures become tinted decals
function decal(name, color, opacity = 1) { return new THREE.MeshBasicMaterial({ color, alphaMap: tex(name), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }); }
// The flags a dive breaks (no lit decal: a cyan web read as neon). Eleven jagged dark fissures (0x0a0a0a): a main crack climbing 0.3 m up
// the front face, over the arris and back across the top with a branch off it, a lesser one beside it; a few chips spalled out where they
// cross the arris and along the main run; only the cores glow, a faint cold cyan (emissive 0.35): the hint that it gives under a dive.
// Built in world space, deterministic per slab; returns [the dark fissures and chips, their glowing cores].
let _fis; const FISM = () => _fis ||= [std(0x0a0a0a, { roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), std(0x0a0a0a, { roughness: 1, emissive: 0x5ad6e6, emissiveIntensity: 0.35, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })];
function fissures(s) {
  let sd = hashStr('dive' + Math.round(s.x0 * 10) + ':' + Math.round(s.y1 * 10)) % 2147483646 + 1; const R = (a, b) => a + (sd = sd * 16807 % 2147483647) / 2147483647 * (b - a);
  const u0 = s.x0 + 0.15, u1 = s.x1 - 0.15, pos = [[], []], nor = [[], []];
  // (u, d): u along x; d back from the front arris over the top (z = ZF - d), or, negative, down the front face (y = top + d)
  const tri = (l, lift, ...pts) => { for (const [u, d] of pts) { if (d >= 0) pos[l].push(u, s.y1 + lift, ZF - d), nor[l].push(0, 1, 0); else pos[l].push(u, s.y1 + d, ZF + lift), nor[l].push(0, 0, 1); } };
  const ribbon = (pts, l, k, lift) => { for (let i = 0; i < pts.length - 1; i++) { const [ua, da, wa] = pts[i], [ub, db, wb] = pts[i + 1], L = Math.hypot(ub - ua, db - da) || 1, nu = -(db - da) / L, nd = (ub - ua) / L; // a strip tapering along the run
    const A = [ua + nu * wa * k, da + nd * wa * k], B = [ua - nu * wa * k, da - nd * wa * k], C = [ub + nu * wb * k, db + nd * wb * k], D = [ub - nu * wb * k, db - nd * wb * k]; tri(l, lift, A, B, C, B, D, C); } };
  const run = (u, d, ang, n, len, w) => { const pts = [[u, d, w]]; for (let i = 1; i <= n; i++) { ang += R(-0.65, 0.65); const st = len / n * R(0.7, 1.3); u = Math.min(u1, Math.max(u0, u + Math.sin(ang) * st)); d = Math.min(2.4, Math.max(0.05, d + Math.cos(ang) * st)); pts.push([u, d, w * (1 - i / (n + 1)) + 0.004]); } return pts; };
  const chip = (u, d, rc) => { const v = [], a0 = R(0, 6.28); for (let i = 0; i < 5; i++) { const a = a0 + i / 5 * 6.28, rr = rc * R(0.55, 1); v.push([u + Math.cos(a) * rr, d + Math.sin(a) * rr * 0.8]); } for (let i = 1; i < 4; i++) tri(0, 0.003, v[0], v[i], v[i + 1]); };
  const ua = Math.min(u1 - 0.3, Math.max(u0 + 0.3, (s.x0 + s.x1) / 2 + R(-0.4, 0.4))), main = [[ua + R(-0.1, 0.1), -0.28, 0.012], [ua, 0, 0.034], ...run(ua, 0, R(-0.4, 0.4), 4, R(1.4, 2.0), 0.034).slice(1)]; // 1 + 4 segments
  const bi = 2 + (R(0, 1) < 0.5 ? 1 : 0), branch = run(main[bi][0], main[bi][1], (R(0, 1) < 0.5 ? -1 : 1) * R(0.8, 1.3), 3, R(0.7, 1.1), 0.02); // 3
  const side = ua - u0 > u1 - ua ? -1 : 1, ub = Math.min(u1 - 0.1, Math.max(u0 + 0.1, ua + side * R(0.9, 1.3))), lesser = [[ub + R(-0.08, 0.08), -0.2, 0.008], [ub, 0, 0.024], ...run(ub, 0, R(-0.5, 0.5), 2, R(0.6, 1.0), 0.024).slice(1)]; // 1 + 2
  for (const p of [main, branch, lesser]) ribbon(p, 0, 1, 0.004);
  for (const p of [main, branch]) ribbon(p, 1, 0.32, 0.007); // the cores
  chip(ua, 0, R(0.06, 0.09)); chip(ub, 0, R(0.04, 0.07)); for (const q of [main[2], main[4]]) chip(q[0] + R(-0.05, 0.05), q[1], R(0.03, 0.055));
  return [0, 1].map(l => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos[l], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor[l], 3)); const m = new THREE.Mesh(g, FISM()[l]); m.receiveShadow = true; m.renderOrder = 1; return m; });
}
// a hanging chain: the strip texture tiles down its length instead of stretching
function chain(color, w, h, x, y, z) { color = 0x5a5a5c; const t = tex('chain_strip').clone(); t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, Math.max(1, Math.round(h / (w * 3.2)))); const m = new THREE.MeshStandardMaterial({ color, alphaMap: t, alphaTest: 0.12, metalness: 0.5, roughness: 0.72, side: THREE.DoubleSide }); return plane(m, Math.max(w, 0.34) * 3.2, h, x, y, z); } // dull, black iron: a chain near a lamp must not bloom white
const iron2 = () => std(0x4a4a50, { metalness: 0.8, roughness: 0.45 });
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
  setMetalEnv(env) { ENV = env; for (const m of [IRON, BRASS, _gilt, FMAT.cu, FMAT.st, FMAT.coin].filter(Boolean)) { m.envMap = env; m.envMapIntensity = 1.0; m.needsUpdate = true; } IRON.roughness = 0.45; BRASS.roughness = 0.42; }
  // Room records and collision exist for the whole castle up front; meshes are raised when a room is first needed.
  async build() {
    for (const def of ROOMS) {
      const b = bounds(def), T0_ = THEMES[def.theme] || THEMES.hall, room = { def, b, theme: ROOM_T[def.id] ? { ...T0_, ...ROOM_T[def.id] } : T0_, solids: [], sources: [], flames: [], anim: [], gates: [], cracks: [], movers: [], blades: [], echo: [], breakables: [], props: [], ready: false, group: null };
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
    if (T.tint) for (const k of ['back', 'wall']) if (S_[k]) S_[k] = [S_[k][0], S_[k][1], new THREE.Color(S_[k][2] ?? 0xffffff).multiply(new THREE.Color(T.tint)).getHex()]; // a room's own cast on its walls (ROOM_T)
    const KIT = await castleKit(); room.wallRects = []; Object.assign(room, { floorUsed: [], bays: [], arches: [], cells: null, lancets: 0, _stm: null, posts: [], afterDress: null }); // a rebuilt room starts clean
    const wallM = tm(S_.wall), floorM = tm(S_.floor), blockM = tm(S_.block), soffM = S_.block && tm([S_.block[0], S_.block[1], new THREE.Color(S_.block[2] ?? 0xffffff).multiplyScalar(0.38).getHex()]); // undersides in shade: a lit slab seen from below is not a pale lid
    const capM = [blockM, blockM, floorM, soffM || blockM, blockM, blockM]; // block tops read as floor: the walkable surface shows by value, not glow
    const TRIM = std(T.trim, { emissive: T.trim, emissiveIntensity: Math.min(0.04, T.trimGlow ?? 0.04), roughness: 0.7 });
    room.trim = TRIM;
    const fy = b.y0 + FLOOR, timber = /library|belfry|clock|servants|prison|portrait/.test(def.theme), slots = this.kitSlots(room, KIT); room.kit = KIT; room.slots = slots;
    const hasBelow = (s) => room.solids.some(o => o !== s && !o.oneway && o.y1 <= s.y0 + 0.05 && o.y1 >= s.y0 - 0.05 && o.x0 < s.x1 - 0.2 && o.x1 > s.x0 + 0.2);
    for (const s of room.solids) {
      const n0 = g.children.length;
      switch (s.kind) {
        case 'floor': {
          const z1 = def.open ? ZF : FRONT;
          add(wbox([wallM, wallM, floorM, wallM, blockM, wallM], s.x0, s.y0 - (def.open ? 4 : 1), s.x1, s.y1, ZB, z1));
          add(nosing(blockM, s.x0, s.x1, s.y1 + 0.004, z1, 0.11));
          add(wbox(DARK, s.x0, s.y1 - 0.34, s.x1, s.y1 - 0.2, z1 - 0.04, z1 + 0.01)); // shadow line under the nosing
          break;
        }
        case 'ceil': add(wbox(wallM, s.x0, s.y0, s.x1, s.y1 + 0.99, ZB, FRONT)); break;
        case 'wall': if (!def.open) add(wbox(wallM, s.x0, s.y0, s.x1, Math.min(s.y1, b.y1 + 1.5), ZB, 1.2));
          else { // open air: the end of the yard is a tower's flank, as tall as the collision that stops you (it used to be nothing at all: an invisible wall in the sky)
            const out = s.side === 'W' ? -1 : 1, xa = s.side === 'W' ? s.x0 - 5 : s.x0, xb = s.side === 'W' ? s.x1 : s.x1 + 5, top = Math.min(s.y1, b.y1 + 14);
            add(wbox(wallM, xa, s.y0, xb, top, ZB - 1.5, 1.6));
            if (s.y1 > b.y1) for (let z = ZB - 1.2; z < 1.4; z += 1.5) add(wbox(wallM, xa, top, xb, top + 0.9, z, z + 0.8)); // merlons
            void out; }
          break;
        case 'ledge': add(wbox(capM, s.x0, s.y0, s.x1, s.y1, ZB, 1.6)); add(nosing(blockM, s.x0, s.x1, s.y1 + 0.004, 1.6)); break;
        case 'plat': {
          if (capPlat(room, s)) break; // a giant fungus's cap (furnish 'caps')
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
            const endM = tm(T.dress || DRESS, false, 0.6); add(wbox([endM, endM, floorM, soffM || blockM, endM, blockM], s.x0, s.y0, s.x1, s.y1, ZB, 0.8)); add(nosing(blockM, s.x0, s.x1, s.y1 + 0.004, 0.8));
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
          else if (s.ref.stair) { const st = this.stairMats(room); add(wbox([st.mass, st.mass, st.tread, st.mass, st.mass, st.mass], s.x0, s.y0, s.x1, s.y1, ZB, 1.75)); } // treads and string are added per flight (stairs())
          else { add(wbox(capM, s.x0, s.y0, s.x1, s.y1, ZB, 1.75)); this.dressBlock(room, s); }
          if (T.heat && s.y1 - s.y0 > 0.8) { const ec = plane(decal('cracks', 0xff5a14, 0.75), Math.min(3, s.x1 - s.x0), Math.min(2.4, s.y1 - s.y0), (s.x0 + s.x1) / 2, s.y0 + Math.min(2.4, s.y1 - s.y0) / 2, 1.77); ec.material.blending = THREE.AdditiveBlending; add(ec); }
          if (!s.ref.stair) add(nosing(blockM, s.x0, s.x1, s.y1 + 0.004, 1.75, 0.07));
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
          const sealed = s.by !== 'dive' && s.ref?.hp > 1; // a walled-up doorway: later brick infill, set back in the opening, pale fresh mortar round it, light leaking through its crack
          if (sealed) { grp.children[0].visible = false; const brick = tm(['castle_stone', P3, 0xffe2c0]).clone(), cx = (s.x0 + s.x1) / 2; brick.emissive?.setHex(0x2c1e10); grp.add(wbox(brick, s.x0, s.y0, s.x1, s.y1, ZB, 1.68)); const mort = std(0xcfc2a8, { roughness: 0.95 }), t = 0.07;
            for (const [a, b, c, d] of [[s.x0, s.y0, s.x0 + t, s.y1], [s.x1 - t, s.y0, s.x1, s.y1], [s.x0, s.y1 - t, s.x1, s.y1]]) grp.add(wbox(mort, a, b, c, d, 1.6, 1.72));
            for (let i = 0; i < 4; i++) { const sy = s.y0 + 0.5 + i * (h - 0.8) / 3 + (i % 2) * 0.2, sx = cx + (i % 2 ? 0.18 : -0.22); grp.add(wbox(brick, sx - 0.3, sy - 0.15, sx + 0.3, sy + 0.15, 1.5, 1.8)); } } // a few bricks stand proud: it was built in a hurry
          if (s.by === 'dive') grp.add(...fissures(s)); // dark fissures over the top and the front arris, a faint cold glow deep in them: stone that gives under a dive
          else { const cr = plane(decal('cracks', 0x100c10, sealed ? 0.6 : 0.95), Math.max(w, 1.4), Math.max(h, 1.4), (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, (sealed ? 1.7 : 1.85) + 0.02); grp.add(cr); s.decal = cr; }
          if (sealed) { const gl = plane(decal('cracks', s.ref.glow || 0xffc070, 0.4), Math.max(w, 1.4), Math.max(h, 1.4), (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 1.73); gl.material.blending = THREE.AdditiveBlending; gl.material.depthWrite = false; grp.add(gl); s.glow = gl;
            /* the room-facing side of the infill is what the play camera sees: real masonry, the crack, the leaking light and proud stones there, and a pool of light under the door */
            const rb = room.b, inR = s.x1 > rb.x1 - 0.7, fx = inR ? s.x0 - 0.015 : s.x1 + 0.015, zd = 1.68 - ZB, zc = (1.68 + ZB) / 2, ry = inR ? -Math.PI / 2 : Math.PI / 2, cyy = (s.y0 + s.y1) / 2, gc = s.ref.glow || 0xffc070;
            const sm = surface('castle_stone', zd / 2.4, h / 2.4, { dir: P3, tint: 0xffe2c0 }).clone(); sm.emissive?.setHex(0x2c1e10); const sf = plane(sm, zd, h, fx, cyy, zc); sf.rotation.y = ry; grp.add(sf);
            const cr2 = plane(decal('cracks', 0x100c10, 0.75), Math.min(zd, 3.4), h * 0.95, fx + (inR ? -0.006 : 0.006), cyy, 0.4); cr2.rotation.y = ry; grp.add(cr2); s.decal2 = cr2;
            const gl2 = plane(decal('cracks', gc, 0.5), Math.min(zd, 3.4), h * 0.95, fx + (inR ? -0.012 : 0.012), cyy, 0.4); gl2.rotation.y = ry; gl2.material.blending = THREE.AdditiveBlending; gl2.material.depthWrite = false; grp.add(gl2); s.glow2 = gl2;
            const brick2 = tm(['castle_stone', P3, 0xffe2c0]); for (let i = 0; i < 3; i++) { const by = s.y0 + 0.6 + i * (h - 1.1) / 2, bz = -1.6 + i * 1.3 + rnd(-0.3, 0.3), d = inR ? -1 : 1; grp.add(box(brick2, Math.min(fx, fx + d * 0.14), by - 0.13, Math.max(fx, fx + d * 0.14), by + 0.13, bz - 0.32, bz + 0.32)); }
            const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: glowTex(), color: gc, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.scale.set(1.0, 2.2, 1); pool.position.set(fx + (inR ? -0.7 : 0.7), s.y0 + 0.03, 0.3); grp.add(pool); s.pool = pool; s.face = fx; s.faceDir = inR ? -1 : 1; }
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
      if (s.kind !== 'wall' && s.kind !== 'ceil' && s.kind !== 'gate') for (let i = n0; i < g.children.length; i++) walkable(g.children[i]);
    }
    if (def.stairs?.length) await this.stairs(room);
    // back wall, or open sky
    if (T.back) add(wplane(tm(S_.back), W, H + 3, b.x0 + W / 2, b.y0 + H / 2, ZB));
    // the back wall sits a stop darker and cooler than the stone you walk on, so the play plane reads first (the strongest contrast
    // on screen must be collision against backdrop: docs/research/design_rules_2026.md B9)
    if (T.back) { const veil = plane(new THREE.MeshBasicMaterial({ color: 0x04060c, transparent: true, opacity: T.veil ?? 0.36, depthWrite: false }), W, H + 3, b.x0 + W / 2, b.y0 + H / 2, ZB + 0.012); veil.renderOrder = -1; add(veil); }
    room.hung = []; // wall pieces already placed: { x0, x1, y }
    if (T.sky) await this.sky(room, T.sky, KIT);
    const br = BREACH[def.id], gp = room.gap = br ? [b.x0 + br[0] - br[1], b.x0 + br[0] + br[1]] : null, inGap = (x0, x1, m = 0) => gp && x1 > gp[0] - m && x0 < gp[1] + m;
    if (T.backWall) { // curtain wall behind open-air rooms, crenellated against the sky (a breast-high parapet on the battlements)
      const h = Math.min(H - 1, T.wallH ?? 9), bw = tm(S_.backWall), runs = gp ? [[b.x0, gp[0]], [gp[1], b.x1]] : [[b.x0, b.x1]];
      for (const [p, q] of runs) { add(wbox(bw, p, b.y0, q, b.y0 + h, ZB - 1.2, ZB)); add(plane(new THREE.MeshStandardMaterial({ map: stripTex('coping', Math.max(1, Math.round((q - p) / 3))), roughness: 0.9 }), q - p, 0.5, (p + q) / 2, b.y0 + h - 0.05, ZB + 0.03)); }
      for (let x = b.x0 + 1; x < b.x1 - 1; x += 2.4) if (!inGap(x, x + 1.2, 0.2)) add(wbox(bw, x, b.y0 + h, x + 1.2, b.y0 + h + 0.9, ZB - 1.2, ZB));
      if (gp) for (const d of [-1, 1]) for (let i = 0, e = d < 0 ? gp[0] : gp[1]; i < 10; i++) { // the wall still stands either side of the breach, broken down in steps toward it
        const x0 = d < 0 ? e - (i + 1) * 0.55 : e + i * 0.55, hh = fy + (0.3 + 3.4 * Math.pow(Math.sin(Math.PI * (i + 0.5) / 10), 0.8)) * rnd(0.8, 1.1); bat(room, bw, gBox(x0, b.y0, ZB - 1.2, x0 + 0.55, hh, ZB + 0.06));
        if (i % 2 === 0) bat(room, bw, pose(new THREE.BoxGeometry(0.5, 0.32, 0.6), x0 + 0.27 + rnd(-0.1, 0.1), hh + 0.1, ZB - 0.3 + rnd(-0.3, 0.3), rnd(-0.3, 0.3), 0, rnd(-0.5, 0.5))); } // a loosened stone on each step
    }
    if (T.wainscot) for (let wy = b.y0 + FLOOR; wy < b.y1 - 3; wy += SH) add(wplane(tm(S_.wainscot), W, 1.6, b.x0 + W / 2, wy + 0.8, ZB + 0.03));
    if (T.rug) { const c = plane(surface(T.rug[0], Math.max(1, Math.round(W / 3)), 1, { dir: T.rug[1] }), W - 2, 2.2, b.x0 + W / 2, b.y0 + FLOOR + 0.012, -0.4); c.rotation.x = -Math.PI / 2; c.receiveShadow = true; add(c); }
    room.pillarX = []; if (T.arcade) this.arcade(room, KIT, slots);
    if (false && T.beams) for (let x = b.x0 + 2.5; x < b.x1 - 1; x += 5) add(box(surface('adzed_beam', 1, 0.5, { dir: X }), x - 0.2, b.y1 - FLOOR - 0.45, x + 0.2, b.y1 - FLOOR, ZB, 1.2));
    if (def.theme === 'frost') { const ice = this._ice ||= std(0xd8f2ff, { emissive: 0x2a5a78, roughness: 0.15, transparent: true, opacity: 0.75 }); for (const s of room.solids) if (s.kind === 'plat' || s.kind === 'ledge') { const low = s.y0 - this.groundAt(room, (s.x0 + s.x1) / 2, s.y0 - 0.05) < 3.2; for (let i = 0; i < Math.max(2, (s.x1 - s.x0) * 1.2); i++) { const l = rnd(0.25, 0.8), c = add(new THREE.Mesh(new THREE.ConeGeometry(rnd(0.04, 0.09), l, 5), ice)); c.rotation.x = Math.PI; c.position.set(rnd(s.x0 + 0.1, s.x1 - 0.1), s.y0 - l / 2, low ? rnd(-1.2, 0.1) : rnd(-0.4, 1.2)); } } } /* icicles hang under every ledge (under a low one, behind the hero's head, not in front of it) */
    if (T.damp) for (let x = b.x0 + 4; x < b.x1 - 2; x += rnd(7, 12)) add(plane(decal(Math.random() < 0.5 ? 'damp_rise' : 'soot_streaks', 0x0a1410, 0.75), 6, 5, x, b.y0 + FLOOR + 2.5 + (Math.random() < 0.5 ? 0 : Math.min(H - 6, 3)), ZB + 0.04));
    if (T.heat || def.theme === 'catacomb' || def.theme === 'crypt') for (let x = b.x0 + 5; x < b.x1 - 2; x += rnd(9, 15)) add(plane(decal(T.heat ? 'soot_streaks' : 'blood_splashes', T.heat ? 0x050302 : 0x3a0406, 0.8), 5, 5, x, b.y0 + FLOOR + 3, ZB + 0.04));
    if (T.ivy) for (let x = b.x0 + 3; x < b.x1 - 3; x += rnd(8, 14)) add(plane(decal('dead_ivy', 0x2a3a1a, 0.95), 5, 5, x, b.y0 + FLOOR + 2.6, ZB + 0.05));
    if (T.bars) for (let x = b.x0 + 6; x < b.x1 - 4; x += 13.3) if (!(room.cells || []).some(c => Math.abs(c - x) < 5)) { const p = plane(new THREE.MeshStandardMaterial({ map: tex('wrought_bars'), metalness: 0.6, roughness: 0.6 }), 4, 4, x, b.y0 + FLOOR + 2.2, ZB + 0.06); add(p); room.wallRects.push({ x0: x - 2, x1: x + 2, y0: b.y0 + FLOOR + 0.2, y1: b.y0 + FLOOR + 4.2 }); }
    if (T.cogs) for (let x = b.x0 + 5; x < b.x1 - 3; x += rnd(9, 14)) for (let y = b.y0 + 4; y < b.y1 - 2; y += rnd(9, 14)) this.bgGear(room, x, y, rnd(1.2, 2.6));
    if (T.stars) { const n = Math.round(W * H / 6), pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([b.x0 + Math.random() * W, b.y0 + Math.random() * H, ZB + 0.1 + Math.random() * 0.4], i * 3); const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xc8d0ff, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); add(pts); room.anim.push(t => { pts.material.opacity = 0.65 + Math.sin(t * 1.3) * 0.25; }); }
    if (T.merlons) for (let x = b.x0 + 0.6; x < b.x1 - 1; x += 2.6) if (!inGap(x, x + 1.3, 0.2)) add(box(mat(S_.block, 1, 1), x, b.y0 + FLOOR, x + 1.3, b.y0 + FLOOR + 1.1, ZB + 0.1, ZB + 0.9));
    for (const sh of def.shallow || []) this.water(room, b.x0 + sh.x, b.y0 + (sh.y ?? FLOOR) - 0.02, sh.w, 0.34);
    for (const d of def.doors) if (d.side === 'W' || d.side === 'E') { if (!def.open) this.doorFrame(g, d.side === 'W' ? b.x0 : b.x1, rowFloorY(d.row) + FLOOR, wallM); }
    room.kit = KIT; room.slots = slots;
    // hazards
    for (const s of def.spikes) this.spikes(room, b.x0 + s.x, b.y0 + s.y, s.w);
    for (const l of def.lava) this.lava(room, b.x0 + l.x, b.y0 + l.y, l.w, l.h);
    for (const w of def.water) this.water(room, b.x0 + w.x, b.y0 + w.y, w.w, w.h);
    for (const bl of room.blades) this.blade(room, bl);
    for (const p of [...def.props].sort((a, c) => (/window/.test(c.t) ? 1 : 0) - (/window/.test(a.t) ? 1 : 0))) { try { await this.prop(room, p); } catch (e) { console.warn('prop', def.id, p.t, e); } }
    this.sconces(room); this.ribs(room); await this.furnish(room);
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
    const free = (x, hw, y) => !room.hung.some(o => Math.abs(o.y - y) < 6 && x + hw + 1.2 > o.x0 && x - hw - 1.2 < o.x1), hang = (x, hw, y) => { for (const dx of [0, 3, -3, 6, -6]) if (x + dx > b.x0 + 2 && x + dx < b.x1 - 2 && free(x + dx, hw, y)) { room.hung.push({ x0: x + dx - hw, x1: x + dx + hw, y, wall: true }); return x + dx; } return null; };
    if (T.backWall) { const h = Math.min(H - 1, T.wallH ?? 9), rep = Math.max(1, Math.round(W / 3));
      for (const [p, q] of room.gap ? [[b.x0, room.gap[0]], [room.gap[1], b.x1]] : [[b.x0, b.x1]]) add(plane(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }), q - p, 1.3, (p + q) / 2, b.y0 + FLOOR + 0.65, zw - 0.01));
      if (h > 5) add(plane(stripM('string_course', rep), W, 0.55, b.x0 + W / 2, b.y0 + FLOOR + 4.4, zw));
      if (h > 2.5) add(plane(stripM('coping', rep), W, 0.4, b.x0 + W / 2, b.y0 + h - 0.2, zw));
      for (let x = b.x0 + rr(4, 8); x < b.x1 - 4; x += rr(7, 12)) if (rs() < 0.7 && !(room.gap && x + 2.5 > room.gap[0] && x - 2.5 < room.gap[1])) { const sz = Math.min(rr(3, 4.6), h - 1); if (sz > 1.2) add(plane(decal(rs() < 0.5 ? 'lichen_spots' : 'damp_rise', 0x0a100c, rr(0.4, 0.7)), sz, sz, x, b.y0 + FLOOR + Math.min(rr(1.8, 5.5), h - 0.5 - sz / 2), zw + 0.02)); } }
    if (indoors) {
      // darker plinth, courses at every storey, frieze under the vault, and the wall falling into shadow overhead
      add(plane(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }), W, 1.2, b.x0 + W / 2, b.y0 + FLOOR + 0.6, zw - 0.01));
      const course = stone ? (/throne|sanctum|magma|forge/.test(th) ? 'demon_frieze' : 'string_course') : 'frieze_strip', rep = Math.max(1, Math.round(W / 3));
      if (!room.arcade) for (let y = b.y0 + FLOOR + 4.6; y < b.y1 - 2; y += SH) add(plane(stripM(course, rep), W, 0.55, b.x0 + W / 2, y, zw));
      if (H > 6) add(plane(stripM(stone ? 'frieze_strip' : 'string_course', rep), W, 0.6, b.x0 + W / 2, b.y1 - FLOOR - 0.34, zw));
      const hf = Math.min(H, 7), gm = new THREE.MeshBasicMaterial({ map: gradTex(), transparent: true, depthWrite: false, opacity: T.vault ?? 1 }); add(plane(gm, W, hf, b.x0 + W / 2, b.y1 - hf / 2, zw + 0.012)); // only the vault falls into shadow: lower storeys stay legible
      if (T.starBand) add(plane(new THREE.MeshBasicMaterial({ map: stripTex('pv_blue_tapestry', Math.round(W / 4)), color: 0x8090d0 }), W, 1.6, b.x0 + W / 2, b.y0 + FLOOR + 3.2, zw + 0.004));
    }
    if (T.backWall && !T.merlons && (T.wallH ?? 9) >= 6) { const roof = pick(['slate_roof', 'shingle_roof', 'verdigris_roof', 'burnt_roof', 'roof_1@T', 'roof_2@T', 'roof_3@T', 'roof_4@T', 'roof@I', 'fishscale_slate', 'lead_roof']).split('@'), h = Math.min(H - 1, 9), rm = surface(roof[0], Math.max(1, Math.round(W / 4)), 1, { dir: roof[1] ? DIRS[roof[1]] : X }); const r = plane(rm, W, 2.6, b.x0 + W / 2, b.y0 + h + 1.6, ZB - 1.9); r.rotation.x = -0.75; add(r); add(plane(stripM('ridge_strip', Math.round(W / 3)), W, 0.3, b.x0 + W / 2, b.y0 + h + 2.56, ZB - 2.75)); }
    // (no door leaves on the back wall: a door painted in the backdrop reads as a way through that isn't one)
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
    this.rhythm(room); this.recessFill(room); if (indoors) this.skylight(room); // after every hanging has claimed its wall
    if (room.afterDress) { try { room.afterDress(); } catch (e) { console.warn('afterDress', def.id, e); } room.afterDress = null; } // dressing that needs the wall rhythm stood first (the fungal cavern's shelf fungi on its pilasters)
  }

  // A big block is a piece of building, not a greybox cube: plinth and cornice, quoins on the corners it shows, ashlar
  // joints cut into monolithic stone (dark mortar; a few faint hot cracks in magma basalt and the sanctum), a contact shadow and
  // a stain. Timber themes get framed panels, iron themes angle irons and riveted straps, the mine timber cribbing.
  dressBlock(room, s) {
    const w = s.x1 - s.x0, h = s.y1 - s.y0; if (h < 0.8 || w < 1.2 || (w * h < 6 && h < 2.2)) return;
    const T = room.theme, th = room.def.theme, zf = 1.75, name = (room.spec.block || T.block)[0], B = (m, g) => bat(room, m, g);
    const solid = o => o !== s && !o.oneway && ['block', 'wall', 'floor', 'ceil', 'ledge', 'crack'].includes(o.kind);
    const touch = x => room.solids.some(o => solid(o) && o.x0 < x + 0.08 && o.x1 > x - 0.08 && o.y0 < s.y1 - 0.2 && o.y1 > s.y0 + 0.2);
    const lx = touch(s.x0) ? 0 : 1, rx = touch(s.x1) ? 0 : 1, grounded = room.solids.some(o => solid(o) && Math.abs(o.y1 - s.y0) < 0.06 && o.x0 < s.x1 && o.x1 > s.x0);
    const kind = /library|portrait|servants|gallery/.test(th) ? 'wood' : /prison|menagerie|clock/.test(th) ? 'iron' : th === 'mine' ? 'mine' : 'stone';
    const thin = h < 1.4; // a slab (a gallery floor): cornice and soffit only
    if (kind === 'mine') { // timber cribbing: a cap beam and corner posts, wedged against the rock
      const bm = tm(['adzed_beam', X]); B(bm, gBox(s.x0 - 0.1 * lx, s.y1 - 0.34, zf - 0.45, s.x1 + 0.1 * rx, s.y1 - 0.04, zf + 0.14));
      if (!thin) for (const [e, on] of [[s.x0 + 0.17, lx], [s.x1 - 0.17, rx]]) if (on) { B(bm, gBox(e - 0.16, s.y0, zf - 0.45, e + 0.16, s.y1 - 0.34, zf + 0.12)); B(bm, gBox(e - 0.2, s.y1 - 0.5, zf - 0.45, e + 0.2, s.y1 - 0.34, zf + 0.16)); }
      if (!thin && w > 3) for (let x = s.x0 + 2.2; x < s.x1 - 1.5; x += 2.6) B(bm, gBox(x - 0.13, s.y0, zf - 0.3, x + 0.13, s.y1 - 0.34, zf + 0.08));
    } else if (kind === 'wood') { // framed panelling: stiles and rails proud of the panels, a moulded cornice, a dark plinth
      const wd = tm(th === 'servants' ? ['adzed_beam', X] : ['pv_dark_walnut', X]), dk = tm(['black_panelling', X, 0x8a7a70]);
      B(wd, gBox(s.x0 - 0.09 * lx, s.y1 - 0.26, ZB, s.x1 + 0.09 * rx, s.y1 - 0.08, zf + 0.1));
      if (grounded && !thin) B(dk, gBox(s.x0 - 0.05 * lx, s.y0, ZB, s.x1 + 0.05 * rx, s.y0 + 0.24, zf + 0.06)); else B(wd, gBox(s.x0 - 0.05 * lx, s.y0, ZB, s.x1 + 0.05 * rx, s.y0 + 0.14, zf + 0.06));
      if (!thin) { const y0 = s.y0 + (grounded ? 0.24 : 0.14), y1 = s.y1 - 0.26, n = Math.max(1, Math.round(w / 1.5));
        for (let i = 0; i <= n; i++) { const x = s.x0 + w * i / n; B(wd, gBox(Math.max(s.x0, x - 0.08), y0, zf - 0.02, Math.min(s.x1, x + 0.08), y1, zf + 0.045)); }
        for (const y of [y0 + 0.07, y1 - 0.07, ...(h > 2.6 ? [(y0 + y1) / 2] : [])]) B(wd, gBox(s.x0, y - 0.07, zf - 0.02, s.x1, y + 0.07, zf + 0.045)); }
    } else if (kind === 'iron') { // angle irons on the open corners, riveted straps across
      for (const [e, on] of [[s.x0, lx], [s.x1, rx]]) if (on) B(IRON, gBox(e - 0.03, s.y0, zf - 0.2, e + 0.03, s.y1 - 0.02, zf + 0.04)), B(IRON, gBox(e - (e === s.x0 ? 0.03 : 0.14), s.y0, zf - 0.02, e + (e === s.x0 ? 0.14 : 0.03), s.y1 - 0.02, zf + 0.04));
      let rv = 0; for (let y = s.y0 + (thin ? h / 2 : 0.55); y < s.y1 - 0.3; y += 1.3) { B(IRON, gBox(s.x0, y - 0.07, zf - 0.01, s.x1, y + 0.07, zf + 0.03)); for (let x = s.x0 + 0.25; x < s.x1 - 0.2 && rv < 90; x += 0.45, rv++) B(IRON, gBox(x - 0.035, y - 0.035, zf + 0.03, x + 0.035, y + 0.035, zf + 0.06)); }
      B(IRON, gBox(s.x0 - 0.04 * lx, s.y1 - 0.2, zf - 0.05, s.x1 + 0.04 * rx, s.y1 - 0.06, zf + 0.06));
    } else { // dressed stone
      const D = tm(QTRIM[th] || T.dress || DRESS, false, 0.6), J = JOINT(th);
      B(D, gBox(s.x0 - 0.1 * lx, s.y1 - 0.3, ZB, s.x1 + 0.1 * rx, s.y1 - 0.1, zf + 0.1)); B(D, gBox(s.x0 - 0.05 * lx, s.y1 - 0.38, ZB, s.x1 + 0.05 * rx, s.y1 - 0.3, zf + 0.045)); // cornice over a fillet
      const pl = grounded && !thin && h >= 1.4 ? 0.42 : 0;
      if (pl) { B(D, gBox(s.x0 - 0.07 * lx, s.y0, ZB, s.x1 + 0.07 * rx, s.y0 + 0.34, zf + 0.07)); B(D, gBox(s.x0 - 0.035 * lx, s.y0 + 0.34, ZB, s.x1 + 0.035 * rx, s.y0 + 0.42, zf + 0.035)); }
      else if (!grounded) B(D, gBox(s.x0 - 0.06 * lx, s.y0, ZB, s.x1 + 0.06 * rx, s.y0 + 0.16, zf + 0.06)); // soffit band
      if (!thin && h >= 1.6) for (const [e, d, on] of [[s.x0, 1, lx], [s.x1, -1, rx]]) if (on) // long-and-short quoins up the exposed corners
        for (let y = s.y0 + pl + 0.04, i = 0; y < s.y1 - 0.5; y += 0.5, i++) { const lw = i % 2 ? 0.34 : 0.62, hh = Math.min(0.46, s.y1 - 0.42 - y); if (hh < 0.15) break; B(D, gBox(Math.min(e - d * 0.03, e + d * lw), y, zf - 0.25, Math.max(e - d * 0.03, e + d * lw), y + hh, zf + 0.035)); }
      const rq = (n => () => (n = Math.imul(n ^ (n >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296)((hashStr(room.def.id) ^ Math.imul(Math.round(s.x0 * 10), 73856093) ^ Math.imul(Math.round(s.y0 * 10), 19349663)) >>> 0 || 1), JC = JCRACK(th);
      // a hairline crack from (ax, ay) to (bx, by): two to four short segments wandering off the line, faintly warm (never a straight lit bar)
      const crack = (ax, ay, bx, by) => { const k = 2 + Math.floor(rq() * 3), dx = bx - ax, dy = by - ay, L0 = Math.hypot(dx, dy) || 1, nx = -dy / L0, ny = dx / L0; let px = ax, py = ay;
        for (let i = 1; i <= k; i++) { const t = i / k, j = i === k ? (rq() - 0.5) * 0.06 : (rq() - 0.5) * 0.16, qx = ax + dx * t + nx * j, qy = ay + dy * t + ny * j;
          B(JC, pose(new THREE.BoxGeometry(Math.hypot(qx - px, qy - py) + 0.01, 0.01 + rq() * 0.008, 0.012), (px + qx) / 2, (py + qy) / 2, zf + 0.009, 0, 0, Math.atan2(qy - py, qx - px))); px = qx; py = qy; } };
      if (JC && !MONO.test(name) && !thin && w * h > 6) for (let i = 0, nc = Math.min(2, Math.floor(w * h / 10)); i < nc; i++) { // a textured face keeps its own courses: a stray crack or two across it instead
        const l = 0.5 + rq() * 0.8, a = rq() * Math.PI, cx = s.x0 + 0.7 + rq() * Math.max(0, w - 1.4), cy = s.y0 + 0.6 + rq() * Math.max(0, h - 1.4);
        crack(cx - Math.cos(a) * l / 2, cy - Math.sin(a) * l / 2, cx + Math.cos(a) * l / 2, cy + Math.sin(a) * l / 2); }
      if (MONO.test(name) && !thin) { // ashlar courses cut into a monolithic face: courses of uneven height, a random stagger, a fifth of the head joints left out (long stones)
        const y0 = s.y0 + (pl || 0.16), y1 = s.y1 - 0.38, n = Math.max(1, Math.round((y1 - y0) / 0.72)), qx0 = s.x0 + (lx ? 0.62 : 0.02), qx1 = s.x1 - (rx ? 0.62 : 0.02), L = 1.4;
        const hk = Array.from({ length: n }, () => 1 + (rq() * 2 - 1) * 0.12), hsum = hk.reduce((a, v) => a + v, 0);
        const seam = (a, c, e, f) => { B(J, gBox(a, c, zf - 0.01, e, f, zf + 0.008)); if (!JC || rq() >= 0.15) return; // now and then a hairline crack wanders along part of a seam
          const hz = e - a > f - c, len = hz ? e - a : f - c, l = len * (0.3 + rq() * 0.4), st = rq() * (len - l);
          if (hz) crack(a + st, (c + f) / 2, a + st + l, (c + f) / 2); else crack((a + e) / 2, c + st, (a + e) / 2, c + st + l); };
        let ya = y0, off = rq() * L;
        for (let k = 0; k < n; k++) { const ch = (y1 - y0) * hk[k] / hsum; if (k) seam(qx0, ya - 0.016, qx1, ya + 0.016);
          for (let x = qx0 + off; x < qx1 - 0.3; x += L) if (x > qx0 + 0.3 && rq() >= 0.2) seam(x - 0.016, ya + 0.016, x + 0.016, ya + ch - 0.016);
          ya += ch; off = (off + L * (0.3 + rq() * 0.4)) % L; } // the next course breaks joint 0.3-0.7 of a stone along
      }
    }
    const ao = new THREE.PlaneGeometry(w, h); ao.translate((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, zf + 0.012); bat(room, AOM(), ao, false); // contact shadow at the foot, a band under the cornice
    if (w * h > 9) { const [mk, col] = STAIN[th] || ['cracks', 0x0a0806], sz = Math.min(w, h, 3.6); room.group.add(plane(decal(mk, col, 0.6), sz, sz, s.x0 + sz / 2 + Math.random() * Math.max(0, w - sz), s.y0 + sz / 2 + Math.random() * Math.max(0, h - sz - 0.4), zf + 0.02)); }
  }
  stairMats(room) {
    if (room._stm) return room._stm; const T = room.theme, oss = /ossuary|catacomb/.test(room.def.theme), b = (room.spec.block || T.block);
    return room._stm = { mass: tm(oss ? ['bone_ashlar', P3, 0x9a9080] : [b[0], b[1], 0xa09a94]), tread: tm(oss ? ['bone_ashlar', P3, 0xe0d4bc] : (T.dress || DRESS), false, 0.6), string: tm(oss ? ['bone_ashlar', P3, 0xcabca0] : (T.dress || DRESS), false, 0.6) };
  }
  // A flight of stairs: chamfered treads proud of a closed string that runs under the steps, the stair's mass below it
  // (skull niches in a bone stair, blind arches elsewhere), and an iron rail climbing the wall behind.
  async stairs(room) {
    const def = room.def, b = room.b, oss = /ossuary|catacomb/.test(def.theme), zf = 1.75, M = this.stairMats(room); let skulls = 0;
    const niche = new THREE.MeshBasicMaterial({ color: 0x060403, transparent: true, opacity: 0.82, depthWrite: false });
    for (const st of def.stairs) {
      const d = st.dir || 1, run = st.run || 1, rise = st.rise || 0.5, y0 = b.y0 + (st.y ?? FLOOR), x = b.x0 + st.x, n = st.steps, far = x + d * n * run, k = rise / run, ext = { depth: zf + 0.07 - ZB, bevelEnabled: false };
      for (let i = 0; i < n; i++) { // tread: chamfered nose, overhanging the riser below
        const nr = x + d * i * run, yt = y0 + (i + 1) * rise, P = (u, v) => new THREE.Vector2(nr + d * u, yt + v);
        const g = new THREE.ExtrudeGeometry(new THREE.Shape([P(-0.07, -0.12), P(run - 0.01, -0.12), P(run - 0.01, 0.012), P(-0.02, 0.012), P(-0.07, -0.04)]), ext); g.translate(0, 0, ZB); bat(room, M.tread, g).userData.walk = true;
      }
      const yT = xx => y0 + Math.abs(xx - x) * k - 0.03, xb = x + d * 0.66 / k; // the string's top runs through the inner corners
      const sg = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(x, y0), new THREE.Vector2(far, yT(far)), new THREE.Vector2(far, yT(far) - 0.62), new THREE.Vector2(xb, y0)]), { depth: 0.14, bevelEnabled: false }); sg.translate(0, 0, zf - 0.04); bat(room, M.string, sg).userData.walk = true;
      const L = Math.hypot(far - x, n * rise), roll = new THREE.CylinderGeometry(0.06, 0.06, L, 8); pose(roll, (x + far) / 2, (y0 + yT(far)) / 2 - 0.02, zf + 0.1, 0, 0, Math.atan2(x - far, n * rise)); bat(room, M.string, roll).userData.walk = true; // roll moulding on the string
      const railM = oss ? fmat('bnr', () => std(0x9a8c70, { roughness: 0.65 })) : IRON; // a bone stair's rail is turned bone, a dull one: no pale line across the frame
      const rr = d * (n - 1) * run, Lr = Math.hypot(rr, (n - 1) * rise) + 0.5, rl = new THREE.CylinderGeometry(0.04, 0.04, Lr, 6); pose(rl, x + rr / 2, y0 + rise + (n - 1) * rise / 2 + 0.95, ZB + 0.3, 0, 0, Math.atan2(-rr, (n - 1) * rise)); bat(room, railM, rl); // wall rail over the nosings
      for (let t = 0.05; t < 1; t += 2.4 / Lr) { const xx = x + rr * t, yy = y0 + rise + (n - 1) * rise * t + 0.95; bat(room, IRON, gBox(xx - 0.03, yy - 0.04, ZB, xx + 0.03, yy + 0.02, ZB + 0.3)); }
      for (let i = 0; i < n; i++) { if (i % 2 && i !== n - 1) continue; // the rail stands on posts: a baluster on every other tread, a heavier newel at each end
        const newel = i === 0 || i === n - 1, px = x + d * (i + 0.5) * run, yt = y0 + (i + 1) * rise, ph = 0.95 + 0.5 * rise + (newel ? 0.12 : 0), r = newel ? 0.06 : 0.032;
        bat(room, railM, pose(new THREE.CylinderGeometry(r, r * 1.25, ph, 6), px, yt + ph / 2, ZB + 0.3));
        bat(room, railM, pose(new THREE.SphereGeometry(r * (newel ? 1.6 : 1.5), 8, 6), px, newel ? yt + ph + 0.03 : yt + 0.04, ZB + 0.3)); } // a ball on each newel, a knop at each foot
      for (let i = 1; i < n - 1; i += 2) { // below the string: niches in the stair's mass
        const xx = x + d * (i + 0.5) * run, top = yT(xx) - 0.72, hgt = Math.min(0.75, top - (y0 + 0.2)); if (hgt < 0.45) continue;
        const sh = archShape(0.56, Math.min(0.24, hgt * 0.35), 8, hgt - Math.min(0.24, hgt * 0.35)), ng = new THREE.ShapeGeometry(sh); ng.translate(xx, top - Math.min(0.24, hgt * 0.35), zf + 0.014); bat(room, niche, ng, false);
        bat(room, M.string, gBox(xx - 0.36, top - hgt - 0.08, zf - 0.04, xx + 0.36, top - hgt, zf + 0.07)); // sill
        if (oss && skulls < 14) { skulls++; try { const sk = await cloneGLTF('assets/game/items/skull_0' + (1 + (i + Math.round(x)) % 8) + '.glb'); fitHeight(sk.scene, Math.min(0.34, hgt * 0.5)); sk.scene.position.set(xx, top - hgt + 0.01, zf + 0.09); sk.scene.rotation.y = (i % 3 - 1) * 0.3; sk.scene.traverse(o => { if (o.isMesh) o.castShadow = true; }); room.group.add(sk.scene); } catch (e) { /* the niche stays empty */ } }
      }
    }
  }

  // Each arcade theme fills its bays its own way (once the props have claimed their walls): pointed looking-glasses in the
  // mirror halls, parted damask in the throne rooms, burial loculi, skull niches, a starless void, a drowned tide line,
  // arrow loops in the plain halls. Bays a window or hanging already holds are left as they are.
  recessFill(room) {
    const kind = RFILL[room.def.theme]; if (!kind || !room.bays?.length) return;
    const g = room.group, B = (m, geo, uv) => bat(room, m, geo, uv); let i = 0;
    for (const { c, spring, rise, base, k = 1 } of room.bays) { // k: the bay's width over the standard 6.667 m
      const top = spring + rise, hw = 2.3 * k; i++;
      if ((room.wallRects || []).some(r => !r.cornice && r.x0 < c + hw && r.x1 > c - hw && r.y0 < top - 0.3 && r.y1 > base + 0.2)) continue;
      if ((room.hung || []).some(h => h.wall && h.x0 < c + hw && h.x1 > c - hw && h.y > base - 2 && h.y < top - 1)) continue;
      if (kind === 'mirror') { // a tall pointed glass in a gilt surround
        const mr = 1.0, ms = spring + rise * 0.55 - mr, drop = ms - (base + 0.5); if (drop < 1) continue;
        const sur = new THREE.ShapeGeometry(archShape(3.0, mr + 0.14, 12, drop + 0.14)); sur.translate(c, ms, ZB + 0.05); B(GILT(), sur, false);
        const gl = new THREE.ShapeGeometry(archShape(2.6, mr, 12, drop)), uv = gl.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + 1.3) / 2.6, (uv.getY(k) + drop) / (drop + mr)); gl.translate(c, ms, ZB + 0.065);
        B(_mirM ||= new THREE.MeshBasicMaterial({ map: mirrorTex(), color: 0xb8c0d8 }), gl, false);
        const sh = sprite(glowTex(), 0xc8d0ff, 1.6, drop + mr, c - 0.4, ms - drop / 2 + 0.4, ZB + 0.12, 0.12); g.add(sh); const ph = c * 0.37; room.anim.push(t => { sh.material.opacity = 0.08 + Math.sin(t * 0.7 + ph) * 0.05; sh.position.x = c + Math.sin(t * 0.25 + ph) * 0.7; });
      } else if (kind === 'drape') { // parted damask on a brass rod, every other bay
        if (i % 2) continue; const h = spring - 0.1 - (base + 0.15); if (h < 1.6) continue;
        g.add(plane(drapeMat(RCOL[room.def.theme] || 0x6a1018), 4.4 * k, h, c, base + 0.15 + h / 2, ZB + 0.07));
        const rod = new THREE.CylinderGeometry(0.045, 0.045, 4.8 * k, 8); pose(rod, c, spring - 0.06, ZB + 0.12, 0, 0, Math.PI / 2); B(BRASS, rod);
        for (const d of [-2.45 * k, 2.45 * k]) B(BRASS, pose(new THREE.SphereGeometry(0.09, 8, 6), c + d, spring - 0.06, ZB + 0.12));
      } else if (kind === 'loop') { // an arrow loop: a cross-slit in a dressed frame, moonlight in the slot
        const yc = Math.min(spring + rise * 0.2, base + 3.4), m = tm(room.theme.dress || DRESS, false, 0.6);
        if (room.flames.some(f => Math.abs(f.fl.position.x - c) < 1.0 && f.fl.position.z < ZB + 1.3 && Math.abs(f.fl.position.y - yc) < 2.2)) continue; // a torch already holds this bay
        B(m, gBox(c - 0.32, yc - 1.25, ZB, c + 0.32, yc + 1.25, ZB + 0.06)); B(m, gBox(c - 0.62, yc + 0.18, ZB, c + 0.62, yc + 0.62, ZB + 0.06));
        B(SLIT, gBox(c - 0.08, yc - 1.05, ZB + 0.06, c + 0.08, yc + 1.05, ZB + 0.07)); B(SLIT, gBox(c - 0.45, yc + 0.33, ZB + 0.06, c + 0.45, yc + 0.47, ZB + 0.07));
        B(SLITGLOW, gBox(c - 0.02, yc - 0.95, ZB + 0.072, c + 0.025, yc + 0.95, ZB + 0.075));
      } else { // a surface set into the bay: loculi, skulls, void, tide-stained stone
        const sp = { loculi: ['niches', I, 0x8a8898], skulls: ['skulls_a', I, 0x9a8c7c], tide: ['waterline_wall', X, 0x8a9a9a] }[kind];
        const geo = new THREE.ShapeGeometry(archShape(5.0 * k, rise * 0.86, 14, spring - base - 0.25)); geo.translate(c, spring, ZB + 0.05);
        if (kind === 'void') g.add(new THREE.Mesh(geo, VOIDM())); else B(tm(sp), geo); // (box-mapped: the surface keeps its real size)
        if (kind === 'tide') B(TIDE, gBox(c - 2.45 * k, base + 1.6, ZB + 0.06, c + 2.45 * k, base + 1.66, ZB + 0.065)); // the high-water line
      }
    }
  }
  // Non-arcade interiors get a wall rhythm of their own instead of one blank plane: timber framing under the beams in the
  // servants' wing and the belfry, walnut pilasters with gilt capitals among the portraits, bookcase uprights in the
  // libraries, mine sets, riveted iron ribs, brick buttresses, basalt columns, bone piers. Each storey's run of a post
  // steps aside for a hanging, a window or a torch, or is left out.
  rhythm(room) {
    const th = room.def.theme, R = RHYTHM[th]; if (!R || room.arcade) return;
    const [style, sp, off] = R, b = room.b, fy = b.y0 + FLOOR, cy = b.y1 - FLOOR, T = room.theme, B = (m, geo) => bat(room, m, geo);
    const busy = (x0, x1, y0, y1) => (room.wallRects || []).some(r => !r.cornice && r.x0 < x1 && r.x1 > x0 && r.y0 < y1 && r.y1 > y0) || (room.hung || []).some(h => h.wall && h.x0 < x1 && h.x1 > x0 && h.y < y1 - 0.5 && h.y + 4.5 > y0) || room.flames.some(f => Math.abs(f.fl.position.x - (x0 + x1) / 2) < (x1 - x0) / 2 + 0.35 && f.fl.position.z < ZB + 1.3 && f.fl.position.y > y0 && f.fl.position.y < y1);
    const hw = { timber: 0.16, walnut: 0.3, book: 0.2, stone: 0.34, bone: 0.4, brick: 0.45, basalt: 0.6, iron: 0.26, mine: 0.17, brickarch: 0.34, col: 0.26 }[style];
    const M = { timber: tm(['adzed_beam', X]), walnut: tm(['pv_dark_walnut', X]), book: tm(['pv_carved_wood', X]), stone: tm(QTRIM[th] || T.dress || DRESS, false, 0.6), bone: tm(['bone_ashlar', P3]), brick: tm(['pv_hearth_brick', X, 0xa09088]), basalt: tm(['keep_basalt', X, 0x9a8a80]), iron: IRON, mine: tm(['adzed_beam', X, 0xb09a80]), brickarch: tm(['sewer_brick', P3]), col: tm(QTRIM[th] || DRESS, false, 0.6) }[style];
    const trim = /walnut|col/.test(style) ? GILT() : style === 'bone' ? tm(['bone_ashlar', P3, 0xd8ccb0]) : style === 'iron' ? BRASS : M;
    for (let y0 = fy; y0 < cy - 1; y0 += SH) {
      const y1 = Math.min(cy, y0 + SH);
      if (style === 'book') { B(M, gBox(b.x0 + 0.5, y1 - 0.42, ZB, b.x1 - 0.5, y1 - 0.12, ZB + 0.5)); B(DARK, gBox(b.x0 + 0.5, y0, ZB, b.x1 - 0.5, y0 + 0.28, ZB + 0.36)); } // each storey of cases: a cornice over, a kick plinth under
      for (let x = b.x0 + off; x < b.x1 - 0.8; x += sp) {
        let px = null; for (const dx of [0, 0.7, -0.7, 1.4, -1.4]) { const xx = x + dx; if (xx - hw > b.x0 + 0.6 && xx + hw < b.x1 - 0.6 && !busy(xx - hw - 0.1, xx + hw + 0.1, y0 + 0.1, y1 - 0.1)) { px = xx; break; } } if (px === null) continue;
        const a = px - hw, c = px + hw, h = y1 - y0; room.posts.push({ x: px, hw, y0, y1, zf: ZB + (PDEP[style] ?? 0.3) }); // (where its face stands, for anything that grows on it)
        if (style === 'timber') { B(M, gBox(a, y0, ZB, c, y1, ZB + 0.2)); if (th === 'servants' && y0 === fy) B(M, gBox(px - 2.2, y0 + 1.52, ZB, px + 2.2, y0 + 1.7, ZB + 0.16)); // a post under each beam, the wainscot rail tenoned into it
          for (const d of [-1, 1]) B(M, pose(new THREE.BoxGeometry(0.14, 1.5, 0.14), px + d * 0.5, y1 - 0.85, ZB + 0.1, 0, 0, -d * 0.785)); } // knee braces up to the beam
        else if (style === 'walnut') { B(M, gBox(a, y0 + 0.4, ZB, c, y1 - 0.5, ZB + 0.14)); B(M, gBox(a - 0.07, y0, ZB, c + 0.07, y0 + 0.4, ZB + 0.22)); B(M, gBox(a - 0.1, y1 - 0.5, ZB, c + 0.1, y1 - 0.2, ZB + 0.24)); B(trim, gBox(a - 0.04, y1 - 0.58, ZB, c + 0.04, y1 - 0.5, ZB + 0.2)); B(trim, gBox(a - 0.04, y0 + 0.4, ZB, c + 0.04, y0 + 0.46, ZB + 0.18));
          for (const d of [-0.12, 0, 0.12]) B(DARK, gBox(px + d - 0.02, y0 + 0.6, ZB + 0.14, px + d + 0.02, y1 - 0.7, ZB + 0.15)); } // fluting
        else if (style === 'book') B(M, gBox(a, y0, ZB, c, y1 - 0.1, ZB + 0.42)); // bookcase uprights
        else if (style === 'mine') { B(M, gBox(a, y0, ZB, c, Math.min(y1, y0 + 3.4), ZB + 0.3)); B(M, gBox(px - 0.9, Math.min(y1, y0 + 3.4) - 0.3, ZB, px + 0.9, Math.min(y1, y0 + 3.4), ZB + 0.34)); B(M, pose(new THREE.BoxGeometry(0.1, 0.3, 0.3), px + 0.25, Math.min(y1, y0 + 3.4) - 0.42, ZB + 0.2)); }
        else if (style === 'iron') { B(M, gBox(a, y0, ZB, c, y1, ZB + 0.12)); B(trim, gBox(a - 0.06, y1 - 0.35, ZB, c + 0.06, y1 - 0.15, ZB + 0.2)); B(trim, gBox(a - 0.06, y0, ZB, c + 0.06, y0 + 0.3, ZB + 0.2)); for (let yy = y0 + 0.5; yy < y1 - 0.5; yy += 0.42) for (const d of [-0.16, 0.16]) B(M, gBox(px + d - 0.035, yy - 0.035, ZB + 0.12, px + d + 0.035, yy + 0.035, ZB + 0.16)); }
        else if (style === 'brick') { B(M, gBox(a, y0, ZB, c, y0 + h * 0.62, ZB + 0.55)); B(M, gBox(a + 0.08, y0 + h * 0.62, ZB, c - 0.08, y1, ZB + 0.3)); B(M, pose(new THREE.BoxGeometry(c - a, 0.12, 0.42), px, y0 + h * 0.62 + 0.08, ZB + 0.38, 0.6, 0, 0)); } // a stepped buttress with a weathered set-off
        else if (style === 'basalt') { for (const [dx, r, k] of [[-0.3, 0.3, 1], [0.25, 0.34, 0.86], [0.05, 0.24, 0.7]]) B(M, pose(new THREE.CylinderGeometry(r * 0.94, r, h * k, 6), px + dx, y0 + h * k / 2, ZB + 0.35 - Math.abs(dx) * 0.3)); } // a cluster of hexagonal columns
        else if (style === 'col') { B(M, pose(new THREE.CylinderGeometry(0.17, 0.19, h - 0.9, 12), px, y0 + 0.45 + (h - 0.9) / 2, ZB + 0.3)); B(M, gBox(a - 0.06, y0, ZB, c + 0.06, y0 + 0.45, ZB + 0.6)); B(M, gBox(a - 0.1, y1 - 0.45, ZB, c + 0.1, y1, ZB + 0.62)); for (const yy of [y0 + h * 0.35, y0 + h * 0.7]) B(trim, pose(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 12), px, yy, ZB + 0.3)); }
        else if (style === 'brickarch') { B(M, gBox(a, y0, ZB, c, y1, ZB + 0.3)); if (px + sp < b.x1 - 0.8 && h > 5) { const ar = new THREE.TorusGeometry(sp / 2 - hw, 0.2, 6, 16, Math.PI); pose(ar, px + sp / 2, y1 - 0.6 - (sp / 2 - hw), ZB + 0.12); B(M, ar); } } // pilasters carrying relieving arches
        else { B(M, gBox(a, y0 + 0.4, ZB, c, y1 - 0.4, ZB + 0.24)); B(M, gBox(a - 0.08, y0, ZB, c + 0.08, y0 + 0.4, ZB + 0.32)); B(M, gBox(a - 0.1, y1 - 0.4, ZB, c + 0.1, y1, ZB + 0.34)); // stone or bone pilaster with base and cap
          if (style === 'bone') { B(tm(['skulls_b', I, 0xb0a490]), gBox(a + 0.05, y0 + 0.6, ZB + 0.24, c - 0.05, y1 - 0.6, ZB + 0.26)); B(trim, gBox(a - 0.12, y0 + h * 0.5 - 0.1, ZB, c + 0.12, y0 + h * 0.5 + 0.1, ZB + 0.36)); }
          else if (th === 'menagerie' || th === 'prison') { const ring = new THREE.TorusGeometry(0.16, 0.035, 6, 14); pose(ring, px, y0 + 1.25, ZB + 0.3); B(IRON, ring); B(IRON, gBox(px - 0.06, y0 + 1.38, ZB + 0.2, px + 0.06, y0 + 1.5, ZB + 0.32)); } } // a tether ring
      }
    }
  }
  // A room with no window still takes the moon from somewhere: an oculus high in the wall, or underground a barred
  // light-well, its cold light falling across the room. (main.js rakes the indoor moon only where a room has a source.)
  skylight(room) {
    if (room.lancets) return; room.lancets = 1;
    const b = room.b, cy = b.y1 - FLOOR, th = room.def.theme, under = /crypt|catacomb|royalcrypt|cistern|aqueduct|mine|ossuary|magma|sanctum|forge|prison/.test(th), r = 0.72, y0 = cy - 2.3, g = room.group;
    const x = this.findWall(room, (b.x0 + b.x1) / 2 + 2.2, r + 0.35, y0 - r - 0.25, y0 + r + 0.25, [0, 3.333, -3.333, 6.667, -6.667, 10, -10, 13.333, -13.333, 20, -20], [0, -1.2, -2.4], true); if (x === null) return;
    const y = y0 + room._dy, m = tm(room.theme.dress || QTRIM[th] || DRESS, false, 0.6), fire = /forge|magma/.test(th);
    // underground, a barred light-well: the shaft behind the grille is unfogged (fog had turned shaft and bars alike into one flat navy pane),
    // black at the bars with a faint cold light far up it (none in the fire rooms); the bars are lit iron with a dull glint of their own,
    // so they read against it
    if (under) { g.add(plane(new THREE.MeshBasicMaterial(fire ? { color: 0x050404, fog: false } : { map: wellTex(), fog: false }), 1.3, 1.3, x, y, ZB + 0.05)); for (const [a, c, d, e] of [[-0.85, -0.85, 0.85, -0.65], [-0.85, 0.65, 0.85, 0.85], [-0.85, -0.65, -0.65, 0.65], [0.65, -0.65, 0.85, 0.65]]) bat(room, m, gBox(x + a, y + c, ZB, x + d, y + e, ZB + 0.12));
      const bar = fmat('wellbar', () => std(0x7a7470, { metalness: 0.35, roughness: 0.55, emissive: 0x202428, emissiveIntensity: 0.5 }));
      for (let k = -2; k <= 2; k++) bat(room, bar, gBox(x + k * 0.22 - 0.025, y - 0.65, ZB + 0.08, x + k * 0.22 + 0.025, y + 0.65, ZB + 0.11)); for (const k of [-0.3, 0.3]) bat(room, bar, gBox(x - 0.65, y + k - 0.025, ZB + 0.11, x + 0.65, y + k + 0.025, ZB + 0.13)); }
    else { const gl = new THREE.Mesh(new THREE.CircleGeometry(r, 24), this.nightGlass(1)); gl.position.set(x, y, ZB + 0.04); g.add(gl); const ring = new THREE.TorusGeometry(r + 0.06, 0.13, 6, 28); pose(ring, x, y, ZB + 0.1); bat(room, m, ring); for (const a of [0, Math.PI / 2]) bat(room, m, pose(new THREE.BoxGeometry(2 * r, 0.07, 0.08), x, y, ZB + 0.08, 0, 0, a)); } // an oculus with a cross of tracery
    if (!under) g.add(sprite(glowTex(), 0x7a90d0, 2.6, 2.6, x, y, ZB + 0.3, 0.22));
    if (under && fire) return; // no moonbeam down a shaft into the forge or the magma
    // the moonbeam: from an oculus it crosses the opening; from a light-well it starts under the grille's sill, so it never washes over the shaft
    const rl = Math.min(12, y - b.y0 - (under ? 0.9 : 0)), ray = plane(new THREE.MeshBasicMaterial({ map: rayTex(), color: 0x7b90d0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 1.6, rl, x + rl * (under ? 0.204 : 0.18), under ? y - 0.9 - rl * 0.457 : y - rl * 0.38, ZB + 1.5); ray.rotation.z = 0.42; ray.rotation.y = 0.25; g.add(ray);
  }
  // Every named room shows what it was for: a signature piece or two built from primitives into the room's batches, set on
  // clear wall or floor after the props have claimed theirs (and before the wall rhythm, which steps round them). Each piece
  // looks along its storey, then on the floors and block tops above, then (if it has one) tries its smaller size.
  async furnish(room) {
    const sig = SIG[room.def.id]; if (!sig) return;
    const b = room.b, W = b.x1 - b.x0, fy = b.y0 + FLOOR, top = b.y1 - FLOOR, g = room.group, wz = room.arcade ? ZB + 0.55 : ZB, B = (m, geo, uv) => bat(room, m, geo, uv), put = o => (g.add(o), o);
    const at = f => b.x0 + W * f, R = (a, c) => a + Math.random() * (c - a), stone = () => tm(room.spec.block || room.theme.block), dress = () => tm(room.theme.dress || QTRIM[room.def.theme] || DRESS, false, 0.6);
    const miss = k => console.debug?.('[world] no place for', room.def.id, k), STEPS = [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, 3.333, -3.333, 4.2, -4.2, 5, -5, 6.667, -6.667, 8.3, -8.3, 10, -10, 13.333, -13.333];
    const levels = [fy, ...new Set(room.solids.filter(s => ['floor', 'block', 'ledge'].includes(s.kind) && !s.oneway && s.y1 > fy + 0.5 && s.y1 < top - 2.5 && s.x1 - s.x0 > 2.5).map(s => s.y1))], anchors = x => [x, at(0.5), at(0.25), at(0.75), at(0.1), at(0.9)];
    let dy = 0; // how far above the room's floor the piece ended up: every case builds from F = fy + dy
    const hangAt = (x, hw, y0, y1) => { const dys = [0, 0.8, -0.6, 1.6, SH, SH + 1.6, -SH, 2 * SH].filter(d => y1 + d < top - 0.2 && y0 + d > fy + 0.2); // on the wall, at any height that fits
      for (const ax of anchors(x)) { const px = this.findWall(room, ax, hw, y0, y1, STEPS, dys, true); if (px !== null) { dy = room._dy; room.hung.push({ x0: px - hw, x1: px + hw, y: fy + dy, wall: true }); return px; } } return null; };
    const standAt = (x, hw, h) => { for (const lv of levels) for (const ax of anchors(x)) { const px = this.findWall(room, ax, hw, lv + 0.6, lv + h, STEPS); if (px === null) continue; // against the wall, standing on a floor
      if (lv === fy ? room.solids.some(s => s.kind === 'floor' && s.x0 <= px - hw && s.x1 >= px + hw) : [px - hw, px, px + hw].every(q => Math.abs(this.groundAt(room, q, lv + 0.3) - lv) < 0.06)) { dy = lv - fy; room.hung.push({ x0: px - hw, x1: px + hw, y: lv, wall: true }); return px; }
      room.wallRects.pop(); } return null; };
    const onFloor = (x, hw, main) => { for (const lv of main ? [fy] : levels) for (const ax of anchors(x)) { const px = this.floorSpot(room, ax, hw, lv); if (px !== null) { dy = lv - fy; return px; } } return null; };
    const clearAbove = (x, h) => Math.min(...[-0.6, 0, 0.6].map(d => this.ceilingAt(room, x + d, fy + 0.5))) - fy > h;
    let arms = 0; // the arcade's piers and every wall flame are in the way too, while the pieces find their places
    room.wallRects.push(...(room.pierInfo?.piers || []).map(x => ({ x0: x - 0.6, x1: x + 0.6, y0: b.y0, y1: b.y1, tmp: 1 })), ...room.flames.filter(f => f.fl.position.z < ZB + 1.7).map(f => ({ x0: f.fl.position.x - 0.3, x1: f.fl.position.x + 0.3, y0: f.fl.position.y - 0.8, y1: f.fl.position.y + 0.4, tmp: 1 })));
    try { for (const k of sig) switch (k) {
      case 'pans': { const x = hangAt(at(0.62), 1.9, fy + 1.4, fy + 3.8); if (x === null) { miss(k); break; } const y = fy + dy + 3.5, z = wz; // a rail of copper pans and a ladle over the work table
        B(IRON, pose(new THREE.CylinderGeometry(0.03, 0.03, 3.6, 6), x, y, z + 0.32, 0, 0, Math.PI / 2)); for (const d of [-1.7, 1.7]) B(IRON, gBox(x + d - 0.03, y - 0.03, z, x + d + 0.03, y + 0.03, z + 0.34));
        [0.26, 0.18, 0.32, 0, 0.22, 0.28].forEach((r, i) => { const px = x - 1.45 + i * 0.58; B(IRON, gBox(px - 0.012, y - 0.16, z + 0.3, px + 0.012, y, z + 0.34));
          if (!r) { B(COPPER(), gBox(px - 0.02, y - 0.95, z + 0.3, px + 0.02, y - 0.16, z + 0.33)); B(COPPER(), pose(new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), px, y - 0.95, z + 0.33)); return; }
          const hl = 0.24 + r; B(COPPER(), gBox(px - 0.03, y - 0.16 - hl, z + 0.3, px + 0.03, y - 0.16, z + 0.34)); B(COPPER(), pose(new THREE.CylinderGeometry(r, r * 0.86, 0.07, 16), px, y - 0.16 - hl - r, z + 0.3, Math.PI / 2)); }); break; }
      case 'cauldron': { const x = onFloor(at(0.3), 0.9); if (x === null) { miss(k); break; } const F = fy + dy, z = -2.3, rim = F + 0.9 + 0.62 * Math.cos(Math.PI * 0.28); // an iron pot on its trivet over a low fire
        B(IRON, pose(new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI * 2, Math.PI * 0.28, Math.PI * 0.72), x, F + 0.9, z)); B(IRON, pose(new THREE.TorusGeometry(0.62 * Math.sin(Math.PI * 0.28), 0.045, 6, 20), x, rim, z, Math.PI / 2));
        B(fmat('broth', () => std(0x3a2a12, { roughness: 0.3, emissive: 0x140802 })), pose(new THREE.CircleGeometry(0.44, 18), x, rim - 0.06, z, -Math.PI / 2), false);
        for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; B(IRON, pose(new THREE.BoxGeometry(0.05, 0.62, 0.05), x + Math.cos(a) * 0.5, F + 0.3, z + Math.sin(a) * 0.5, Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2)); }
        for (const a of [0.4, -0.4]) B(tm(['adzed_beam', X, 0x4a3a2a]), pose(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 6), x, F + 0.07, z, Math.PI / 2, a, 0));
        this.flame(room, x, F + 0.26, z + 0.2, 0.36, 9); const st = put(sprite(glowTex(), 0xb8b0a8, 1.4, 1.2, x, rim + 0.6, z + 0.2, 0)); room.anim.push(t => { const q = (t * 0.3) % 1; st.position.y = rim + 0.3 + q * 1.5; st.material.opacity = 0.14 * Math.sin(q * Math.PI); }); break; }
      case 'racks': for (const f of [0.3, 0.7]) { const x = standAt(at(f), 1.35, 2.5); if (x === null) { miss(k); continue; } const F = fy + dy, wd = tm(['adzed_beam', X]), z = wz; // bin racks of bottles laid down
        for (const d of [-1.25, 1.25]) B(wd, gBox(x + d - 0.08, F, z, x + d + 0.08, F + 2.45, z + 0.5)); for (let r = 0; r <= 6; r++) B(wd, gBox(x - 1.25, F + 0.1 + r * 0.38, z, x + 1.25, F + 0.14 + r * 0.38, z + 0.48));
        for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) { if (Math.random() < 0.15) continue; const bx = x - 1.05 + c * 0.3, by = F + 0.3 + r * 0.38; B(GLASSB(), pose(new THREE.CylinderGeometry(0.075, 0.075, 0.3, 7), bx, by, z + 0.36, Math.PI / 2), false); B(GLASSB(), pose(new THREE.CylinderGeometry(0.025, 0.04, 0.1, 5), bx, by, z + 0.56, Math.PI / 2), false); } } break;
      case 'arms': { const f = [0.38, 0.72][arms++] || 0.5; let hw = 0, x = null; for (hw of [1.9, 1.15, 0.8]) if ((x = standAt(at(f), hw, 3.9)) !== null) break; if (x === null) { miss(k); break; } // an armoury rack: spears, kite shields, swords hilt-up
        const F = fy + dy, wd = tm(['adzed_beam', X]), z = wz, full = hw > 1.5, x0 = x - hw + 0.1;
        B(wd, gBox(x - hw + 0.1, F + 3.0, z, x + hw - 0.1, F + 3.18, z + 0.22)); B(wd, gBox(x - hw + 0.1, F + 0.25, z, x + hw - 0.1, F + 0.4, z + 0.3));
        for (let i = 0; i < (full ? 4 : hw > 1 ? 3 : 2); i++) { const sx = x0 + 0.3 + i * 0.32; B(wd, pose(new THREE.CylinderGeometry(0.025, 0.03, 3.1, 6), sx, F + 1.95, z + 0.26)); B(STEEL(), pose(new THREE.ConeGeometry(0.06, 0.4, 4), sx, F + 3.7, z + 0.26), false); }
        for (const [sx, k2] of full ? [[x + 0.2, 0], [x + 1.25, 1]] : [[x + hw - 0.55, 1]]) { const sh = new THREE.Shape(); sh.moveTo(0, -0.62); sh.quadraticCurveTo(0.42, -0.1, 0.4, 0.42); sh.quadraticCurveTo(0, 0.5, -0.4, 0.42); sh.quadraticCurveTo(-0.42, -0.1, 0, -0.62);
          const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 1, curveSegments: 8 }); sg.translate(sx, F + 2.05, z + 0.1); B(PAINT(k2), sg, false);
          if (k2) { B(PAINT(2), gBox(sx - 0.05, F + 1.6, z + 0.17, sx + 0.05, F + 2.45, z + 0.19), false); B(PAINT(2), gBox(sx - 0.3, F + 2.2, z + 0.17, sx + 0.3, F + 2.3, z + 0.19), false); } // a pale cross
          else B(PAINT(2), pose(new THREE.BoxGeometry(0.1, 0.92, 0.02), sx, F + 2.05, z + 0.18, 0, 0, 0.6), false); // a bend
          B(STEEL(), pose(new THREE.SphereGeometry(0.07, 8, 6), sx, F + 2.17, z + 0.2), false); }
        for (const sx of full ? [x - 0.45, x + 0.7] : hw > 1 ? [x + 0.6] : []) { const sy = full ? 0 : -0.25; B(STEEL(), gBox(sx - 0.035, F + 0.5 + sy, z + 0.24, sx + 0.035, F + 1.5 + sy, z + 0.26), false); B(IRON, gBox(sx - 0.18, F + 1.5 + sy, z + 0.22, sx + 0.18, F + 1.56 + sy, z + 0.28)); if (full) { B(LEATHER(2), pose(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 6), sx, F + 1.69, z + 0.25), false); B(IRON, pose(new THREE.SphereGeometry(0.045, 6, 5), sx, F + 1.85, z + 0.25)); } }
        break; }
      case 'lectern': { const x = onFloor(at(0.55), 0.6); if (x === null) { miss(k); break; } const F = fy + dy, wd = tm(['pv_dark_walnut', X]), z = -2.2; // a reading desk, its book left open
        B(wd, gBox(x - 0.4, F, z - 0.35, x + 0.4, F + 0.1, z + 0.35)); B(wd, gBox(x - 0.09, F + 0.1, z - 0.09, x + 0.09, F + 1.05, z + 0.09));
        B(wd, pose(new THREE.BoxGeometry(0.8, 0.05, 0.6), x, F + 1.15, z, 0.5)); B(wd, pose(new THREE.BoxGeometry(0.8, 0.06, 0.05), x, F + 1.02, z + 0.27, 0.5));
        B(LEATHER(0), pose(new THREE.BoxGeometry(0.74, 0.02, 0.5), x, F + 1.177, z + 0.014, 0.5), false); for (const d of [-1, 1]) B(WAX, pose(new THREE.BoxGeometry(0.34, 0.03, 0.46), x + d * 0.18, F + 1.195, z + 0.022, 0.5, 0, -d * 0.08), false); break; }
      case 'books': for (const f of [0.22, 0.78]) { const x = onFloor(at(f), 0.75); if (x === null) { miss(k); continue; } const F = fy + dy; let yy = F; // a pile of folios, a few slid off it, one leant against it
        for (let i = 0; i < 7; i++) { const h = R(0.06, 0.11); B(LEATHER(i % 4), pose(new THREE.BoxGeometry(R(0.36, 0.5), h, R(0.26, 0.34)), x + R(-0.05, 0.05), yy + h / 2, -2.3 + R(-0.04, 0.04), 0, R(-0.35, 0.35)), false); yy += h; }
        for (let i = 0; i < 3; i++) B(LEATHER((i + 2) % 4), pose(new THREE.BoxGeometry(R(0.3, 0.42), 0.08, 0.3), x + 0.5 + i * 0.05, F + 0.04 + i * 0.08, -2.0, 0, R(-0.6, 0.6)), false);
        B(LEATHER(1), pose(new THREE.BoxGeometry(0.42, 0.08, 0.32), x - 0.42, F + 0.2, -2.1, 0, 0.3, 1.15), false); } break;
      case 'ropes': { let n = 0; for (const f of [0.18, 0.46, 0.64, 0.86]) { if (n >= 3) break; const x = at(f) + R(-0.6, 0.6), z = R(-2.5, -1.8), up = this.ceilingAt(room, x, fy + 2); if (up - fy < 4) continue;
        const lo = fy + R(1.3, 2.0), len = up - lo; B(ROPE(), pose(new THREE.CylinderGeometry(0.022, 0.022, len, 5), x, lo + len / 2, z), false); // a bell rope down from the floor above, its striped sally at hand height
        for (let i = 0; i < 4; i++) B(SALLY(i % 2), pose(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8), x, lo + 0.8 + i * 0.16, z), false);
        B(ROPE(), pose(new THREE.TorusGeometry(0.09, 0.02, 4, 10), x, lo - 0.07, z), false); n++; } if (!n) miss(k); break; }
      case 'carillon': { const kk = await loadGLTF('assets/game/items/bells.glb'), y0 = Math.min(top - 1.2, fy + 9), x = hangAt(at(0.5), 2.8, y0 - 1.4, y0 + 0.4); if (x === null) { miss(k); break; } const yb = y0 + dy; // a carillon: five small bells hung from one beam
        B(tm(['adzed_beam', X]), gBox(x - 2.8, yb, wz, x + 2.8, yb + 0.3, wz + 1.0));
        ['bell_treble', 'bell_third', 'bell_second', 'bell_third', 'bell_treble'].forEach((nm, i) => { const src = kk.scene.getObjectByName(nm); if (!src) return; const m = src.clone(); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1); m.updateMatrixWorld(true);
          const sz = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()); m.scale.setScalar([0.55, 0.7, 0.85, 0.7, 0.55][i] / Math.max(sz.x, sz.y, sz.z)); m.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(m);
          m.position.set(x - 2.2 + i * 1.1 - (b2.min.x + b2.max.x) / 2, yb - b2.max.y, wz + 0.5 - (b2.min.z + b2.max.z) / 2); m.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(m); }); break; }
      case 'sun': { let r = 1.7, y0 = 0, x = null; for (r of [1.7, 1.25]) { y0 = Math.min(top - r - 1.3, fy + 8.5); x = hangAt(at(0.5), r + 0.85, y0 - r - 0.9, y0 + r + 0.9); if (x !== null) break; } if (x === null) { miss(k); break; } const yc = y0 + dy, z = wz + 0.1; // the hollow sun: a gilt ring of rays about nothing at all
        B(GILT(), pose(new THREE.TorusGeometry(r, 0.14, 8, 40), x, yc, z), false); B(GILT(), pose(new THREE.TorusGeometry(r * 0.64, 0.06, 6, 32), x, yc, z), false);
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, L = (i % 2 ? 0.55 : 1.05) * r / 1.7, rr = r + 0.08 + L / 2; B(GILT(), pose(new THREE.ConeGeometry(i % 2 ? 0.08 : 0.14, L, 4), x + Math.cos(a) * rr, yc + Math.sin(a) * rr, z, 0, 0, a - Math.PI / 2), false); }
        B(VOIDM(), pose(new THREE.CircleGeometry(r * 0.62, 32), x, yc, z - 0.04), false); g.add(sprite(glowTex(), 0xffb050, r * 4.6, r * 4.6, x, yc, z - 0.06, 0.16)); break; }
      case 'chart': { const r = 1.3, y0 = Math.min(top - r - 1, fy + 3.6), x = hangAt(at(0.42), r + 0.3, y0 - r - 0.3, y0 + r + 0.3); if (x === null) { miss(k); break; } const yc = y0 + dy; // a planisphere: the fixed stars under a turning rete
        const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40), fmat('chart', () => new THREE.MeshStandardMaterial({ map: chartTex(), roughness: 0.6, emissive: 0xffffff, emissiveMap: chartTex(), emissiveIntensity: 0.3 }))); disc.position.set(x, yc, wz + 0.05); g.add(disc);
        for (const [rr, t] of [[r + 0.06, 0.08], [r * 0.7, 0.025]]) B(GILT(), pose(new THREE.TorusGeometry(rr, t, 6, 40), x, yc, wz + 0.07), false);
        const rg = mergeGeometries([0, 1, 2, 3].map(i => new THREE.BoxGeometry(2 * r * 0.95, 0.025, 0.02).rotateZ(i * Math.PI / 4))), rete = new THREE.Mesh(rg, GILT()); rete.position.set(x, yc, wz + 0.1); g.add(rete); room.anim.push(t => { rete.rotation.z = t * 0.02; }); break; }
      case 'crucible': { let x = null; for (const dx of [0, 3, -3, 6, -6, 9, -9]) if (clearAbove(at(0.5) + dx, 5.4)) { x = at(0.5) + dx; break; } if (x === null) { miss(k); break; } const y = fy + 3.6, z = -2.0, up = this.ceilingAt(room, x, fy + 1); // a crucible slung on its chain, the melt glowing in it
        g.add(chain(0x6a6a6a, 0.26, up - y - 0.95, x, (up + y + 0.95) / 2, z)); B(IRON, pose(new THREE.CylinderGeometry(0.55, 0.36, 0.8, 14, 1, true), x, y, z)); B(IRON, pose(new THREE.TorusGeometry(0.55, 0.05, 6, 18), x, y + 0.4, z, Math.PI / 2)); B(IRON, pose(new THREE.CircleGeometry(0.36, 14), x, y - 0.4, z, Math.PI / 2));
        for (const d of [-1, 1]) B(IRON, pose(new THREE.BoxGeometry(0.04, 0.75, 0.04), x + d * 0.3, y + 0.72, z, 0, 0, d * 0.65));
        const melt = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), fmat('melt', () => new THREE.MeshBasicMaterial({ map: lavaTex(), color: 0xffc070 }))); melt.rotation.x = -Math.PI / 2; melt.position.set(x, y + 0.34, z); g.add(melt, sprite(glowTex(), 0xff7a20, 2.6, 2.2, x, y + 0.6, z + 0.3, 0.4)); break; }
      case 'trough': { const wood = room.def.theme === 'menagerie', x = onFloor(at(wood ? 0.62 : 0.4), 1.2); if (x === null) { miss(k); break; } const F = fy + dy, z = -2.55, m = wood ? tm(['adzed_beam', X]) : dress(), hh = wood ? 0.55 : 0.75; // a quench trough (or a feeding trough)
        for (const [a, c, d, e] of [[-1.1, -0.42, 1.1, -0.32], [-1.1, 0.32, 1.1, 0.42], [-1.1, -0.42, -0.98, 0.42], [0.98, -0.42, 1.1, 0.42]]) B(m, gBox(x + a, F, z + c, x + d, F + hh, z + e)); B(m, gBox(x - 1.1, F, z - 0.42, x + 1.1, F + 0.1, z + 0.42));
        if (wood) { B(tm(['straw_ground', X]), gBox(x - 0.98, F + 0.1, z - 0.32, x + 0.98, F + 0.4, z + 0.32)); for (const d of [-0.9, 0.9]) B(m, gBox(x + d - 0.06, F, z - 0.52, x + d + 0.06, F + 0.2, z + 0.52)); break; }
        B(fmat('quench', () => std(0x0a1216, { roughness: 0.08, metalness: 0.6, emissive: 0x020608 })), gBox(x - 0.98, F + 0.1, z - 0.32, x + 0.98, F + 0.62, z + 0.32), false); B(IRON, pose(new THREE.BoxGeometry(0.05, 1.3, 0.05), x + 0.7, F + 0.95, z + 0.1, 0.25, 0, -0.3)); // tongs left standing in it
        const st = put(sprite(glowTex(), 0xc8c8c8, 1.6, 1.2, x, F + 1.2, z + 0.3, 0)); room.anim.push(t => { const q = (t * 0.25) % 1; st.position.y = F + 0.9 + q * 1.4; st.material.opacity = 0.1 * Math.sin(q * Math.PI); }); break; }
      case 'nest': { const x = onFloor(at(0.58), 1.2); if (x === null) { miss(k); break; } const F = fy + dy, z = -2.2, tw = tm(['adzed_beam', X, 0x8a7458]); // a nest of torn timber round a clutch of pale eggs
        B(tm(['straw_ground', X]), pose(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.95, 0.24, 0.55), x, F - 0.02, z));
        for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2 + R(-0.1, 0.1), rr = R(0.8, 1.15); B(tw, pose(new THREE.CylinderGeometry(0.03, 0.04, R(0.8, 1.4), 4), x + Math.cos(a) * rr, F + R(0.12, 0.42), z + Math.sin(a) * rr * 0.55, Math.PI / 2 + R(-0.4, 0.4), -a + R(-0.2, 0.2), R(-0.3, 0.3))); }
        for (const [dx, dz] of [[-0.2, 0.05], [0.18, -0.08], [0.02, 0.18]]) B(BONE(), pose(new THREE.SphereGeometry(0.16, 10, 8).scale(1, 1.35, 1), x + dx, F + 0.4, z + dz), false); break; }
      case 'burrows': { let n = 0; for (const f of [0.2, 0.5, 0.8]) { const x = standAt(at(f), 0.9, 1.6); if (x === null) continue; n++; const F = fy + dy; // a borer's hole through the wall, its spoil round the mouth and spilt below
        B(fmat('pit', () => new THREE.MeshBasicMaterial({ color: 0x040302 })), new THREE.CircleGeometry(0.75, 18).scale(1, 0.72, 1).translate(x, F + 0.62, wz + 0.04), false);
        for (let i = 0; i < 12; i++) { const a = i / 11 * Math.PI + R(-0.1, 0.1); B(stone(), pose(new THREE.DodecahedronGeometry(R(0.14, 0.3), 0), x + Math.cos(a) * 0.82, F + 0.62 + Math.sin(a) * 0.6, wz + 0.12, R(0, 3), R(0, 3), 0)); }
        for (let i = 0; i < 7; i++) { const s = R(0.1, 0.24); B(stone(), pose(new THREE.DodecahedronGeometry(s, 0), x + R(-1.1, 1.1), F + s * 0.4, wz + R(0.3, 1.1), R(0, 3), R(0, 3), 0)); } } if (!n) miss(k); break; }
      case 'tide': { if (room.def.theme === 'cistern') break; const yl = fy + 2.3, z = ZB + 0.03; // the flood's high-water mark: a pale scum line, the stone below it darker
        g.add(plane(fmat('damp', () => new THREE.MeshBasicMaterial({ color: 0x0a1412, transparent: true, opacity: 0.3, depthWrite: false })), W - 1.2, yl - fy, b.x0 + W / 2, (fy + yl) / 2, z)); B(TIDE, gBox(b.x0 + 0.6, yl - 0.035, z, b.x1 - 0.6, yl + 0.035, z + 0.015));
        g.add(plane(decal('damp_rise', 0x0c1814, 0.6), W - 1.2, 1.2, b.x0 + W / 2, yl + 0.5, z + 0.005)); break; }
      case 'staffs': { const x = standAt(at(0.4), 1.8, 2.4); if (x === null) { miss(k); break; } const F = fy + dy, wd = tm(['adzed_beam', X, 0x9a8468]); // the pilgrims' staffs, left against the wall by those who did not come back for them
        for (let i = 0; i < 6; i++) { const sx = x - 1.5 + i * 0.6 + R(-0.12, 0.12), L = R(1.9, 2.4), rx = -R(0.12, 0.22), rz = R(-0.06, 0.06), zc = wz + 0.08 - Math.sin(rx) * L / 2;
          B(wd, pose(new THREE.CylinderGeometry(0.024, 0.034, L, 6), sx, F + L / 2 * Math.cos(rx), zc, rx, 0, rz));
          if (i % 2 === 0) B(fmat('gourd', () => std(0x9a7a3a, { roughness: 0.6 })), pose(new THREE.SphereGeometry(0.1, 8, 6).scale(1, 1.4, 1), sx - Math.sin(rz) * 0.22 * L + 0.08, F + 0.72 * L, zc + Math.sin(rx) * 0.22 * L + 0.06), false); }
        for (const dx of [-0.9, 0.2, 1.1]) B(fmat('sack', () => new THREE.MeshStandardMaterial({ map: tex('hessian'), roughness: 1 })), pose(new THREE.SphereGeometry(0.3, 10, 7).scale(1, 0.7, 0.75), x + dx, F + 0.2, wz + 0.5)); break; }
      case 'masks': { let cols = 5, x = hangAt(at(0.5), 2.2, fy + 1.4, fy + 4.6); if (x === null) x = hangAt(at(0.5), 1.3, fy + 1.4, fy + 4.6), cols = 3; if (x === null) { miss(k); break; } const F = fy + dy; // the false faces: a wall of masks, porcelain and gilt, eyes cut to slits
        for (let r = 0; r < 3; r++) for (let c = 0; c < cols; c++) { if (c === cols - 1 && r % 2) continue; const mx = x - (cols - 1) * 0.45 + c * 0.9 + (r % 2) * 0.45, my = F + 1.9 + r * 1.05, z = wz + 0.05;
          B((r * 5 + c) % 4 === 1 ? GILT() : PORC(), pose(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.8, 0.35, 1.2), mx, my, z, Math.PI / 2, 0, R(-0.15, 0.15)), false);
          for (const d of [-1, 1]) B(SLIT, gBox(mx + d * 0.1 - 0.055, my + 0.05, z + 0.08, mx + d * 0.1 + 0.055, my + 0.085, z + 0.11), false); B(SLIT, gBox(mx - 0.05, my - 0.16, z + 0.07, mx + 0.05, my - 0.14, z + 0.09), false); } break; }
      case 'voids': { let n = 0; for (const f of [0.3, 0.7]) { const x = hangAt(at(f), 0.9, fy + 2.0, fy + 5.6); if (x === null) continue; n++; const yb = fy + dy + 2.0; // lancets that open on nothing
        B(tm(QTRIM.sanctum), new THREE.ShapeGeometry(archShape(1.7, 1.0, 12, 2.6)).translate(x, yb + 2.6, wz + 0.03)); g.add(new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.3, 0.8, 12, 2.4)).translate(x, yb + 2.6, wz + 0.05), VOIDM())); g.add(sprite(glowTex(), 0x6a40c0, 2.2, 4.4, x, yb + 1.8, wz + 0.12, 0.12)); } if (!n) miss(k); break; }
      case 'hoard': { const x = onFloor(at(0.5), 1.6); if (x === null) { miss(k); break; } const F = fy + dy, z = -2.4; // the wyrm's bed of gold: a heap of coin, coins spilt round it, two goblets, a few stones
        B(COIN(), pose(new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, 0.5, 0.75), x, F - 0.02, z));
        for (let i = 0; i < 70; i++) { const a = R(0, 6.283), d = Math.sqrt(Math.random()) * 2.1, px = Math.cos(a) * d, pz = Math.sin(a) * d * 0.4, q = 1 - (px / 1.6) ** 2 - (pz / 0.75) ** 2; B(GILT(), pose(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 8), x + px, F + 0.01 + (q > 0 ? 0.5 * Math.sqrt(q) : 0), z + pz, R(-0.4, 0.4), 0, R(-0.4, 0.4)), false); }
        const cup = new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.09, 0.02], [0.02, 0.04], [0.02, 0.16], [0.1, 0.22], [0.11, 0.34]].map(([u, v]) => new THREE.Vector2(u, v)), 10); for (const [dx, dy2, rz] of [[-0.5, 0.38, 0.2], [0.9, 0.16, -1.3]]) B(GILT(), pose(cup.clone(), x + dx, F + dy2, z + 0.2, 0, 0, rz), false); cup.dispose();
        for (let i = 0; i < 4; i++) B(GEM(i % 2), pose(new THREE.OctahedronGeometry(0.07), x + R(-1.1, 1.1), F + 0.3 + R(0, 0.15), z + 0.25, R(0, 3), R(0, 3), 0), false); g.add(sprite(glowTex(), 0xffc060, 4.4, 2.2, x, F + 0.6, z + 0.6, 0.12)); break; }
      case 'straw': { let n = 0; for (const f of [0.25, 0.75]) { const x = onFloor(at(f), 1.1); if (x === null) continue; n++; const F = fy + dy, z = R(-2.7, -2.2), sw = tm(['straw_ground', X]); // bedding forked into heaps, wisps trodden across the floor
        B(sw, pose(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.45, 0.6), x, F - 0.02, z));
        for (let i = 0; i < 26; i++) B(STRAW(), pose(new THREE.BoxGeometry(R(0.3, 0.6), 0.012, 0.012), x + R(-1.6, 1.6), F + 0.01, z + R(-0.5, 0.9), 0, R(0, 3.1), 0), false); } if (!n) miss(k); break; }
      case 'well': { const x = onFloor(at(0.5), 1.25), hole = room.solids.find(s => s.kind === 'crack' && s.by === 'dive'), wd = tm(['adzed_beam', X]); if (x === null && !hole) { miss(k); break; }
        if (x === null) { const x0 = hole.x0 - 0.3, x1 = hole.x1 + 0.3, xm = (hole.x0 + hole.x1) / 2, z = -2.6; // the well is the broken floor itself: its windlass still stands over it, the rope going down into the dark
          for (const px of [x0, x1]) { B(wd, gBox(px - 0.1, fy, z - 0.1, px + 0.1, fy + 3.0, z + 0.1)); B(wd, pose(new THREE.BoxGeometry(0.1, 1.0, 0.1), px + (px < xm ? 0.35 : -0.35), fy + 2.6, z, 0, 0, px < xm ? -0.7 : 0.7)); }
          B(wd, gBox(x0 - 0.2, fy + 3.0, z - 0.12, x1 + 0.2, fy + 3.2, z + 0.12)); B(wd, pose(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 10), xm, fy + 2.6, z, 0, 0, Math.PI / 2)); for (const d of [-0.75, 0.75]) B(IRON, gBox(xm + d - 0.03, fy + 2.6, z - 0.03, xm + d + 0.03, fy + 3.0, z + 0.03));
          B(ROPE(), pose(new THREE.CylinderGeometry(0.018, 0.018, 1.7, 4), xm + 0.1, fy + 1.75, z), false); B(wd, pose(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 10, 1, true), xm + 0.1, fy + 0.75, z)); break; }
        const F = fy + dy, z = -2.2; // the undercroft well: a stone drum, a windlass, a bucket on its rope
        B(stone(), pose(new THREE.CylinderGeometry(1.0, 1.05, 0.95, 20, 1, true), x, F + 0.47, z)); B(DARK, pose(new THREE.CylinderGeometry(0.9, 0.9, 0.9, 20, 1, true).scale(-1, 1, 1), x, F + 0.5, z), false); B(dress(), pose(new THREE.TorusGeometry(1.0, 0.1, 6, 20), x, F + 0.95, z, Math.PI / 2));
        B(fmat('wellw', () => new THREE.MeshBasicMaterial({ color: 0x040a0c })), pose(new THREE.CircleGeometry(0.92, 20), x, F + 0.55, z, -Math.PI / 2), false);
        for (const d of [-1.05, 1.05]) B(wd, gBox(x + d - 0.08, F + 0.9, z - 0.08, x + d + 0.08, F + 2.6, z + 0.08)); B(wd, gBox(x - 1.2, F + 2.6, z - 0.1, x + 1.2, F + 2.78, z + 0.1));
        B(wd, pose(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 10), x, F + 2.1, z, 0, 0, Math.PI / 2)); B(IRON, gBox(x + 0.9, F + 1.75, z + 0.06, x + 0.94, F + 2.12, z + 0.1)); B(IRON, gBox(x + 0.9, F + 1.71, z + 0.06, x + 1.12, F + 1.75, z + 0.1));
        B(ROPE(), pose(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 4), x + 0.1, F + 1.62, z), false); B(wd, pose(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 10, 1, true), x + 0.1, F + 1.05, z)); break; }
      case 'fissures': { g.add(plane(fmat('rise', () => new THREE.MeshBasicMaterial({ map: riseTex(), color: 0xff4a10, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })), W, 5, b.x0 + W / 2, fy + 2.5, ZB + 0.05)); // the lake lights the wall from below; the rock is split and glowing
        const fm = fmat('fis', () => { const m = decal('cracks', 0xff6a1a, 0.9); m.blending = THREE.AdditiveBlending; return m; }); for (let x = b.x0 + R(3, 6); x < b.x1 - 3; x += R(5, 9)) { const sz = R(2.4, 4); g.add(plane(fm, sz, sz * 1.4, x, fy + R(1.4, 4.5), ZB + 0.07)); }
        // the lake's heat climbs the basalt stacks that stand in it: an additive under-glow up each stack's face, so it reads even with the surface low in the frame
        const hm = fmat('heatup', () => new THREE.MeshBasicMaterial({ map: riseTex(), color: 0xff5a14, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
        for (const l of room.def.lava) { const lx0 = b.x0 + l.x, lx1 = lx0 + l.w, ly = b.y0 + l.y + l.h;
          for (const s of room.solids) if (s.kind === 'block' && s.y0 <= ly && s.y1 > ly + 1 && s.x0 >= lx0 - 0.1 && s.x1 <= lx1 + 0.1) { const hh = Math.min(6, s.y1 - ly); g.add(plane(hm, s.x1 - s.x0 + 0.06, hh, (s.x0 + s.x1) / 2, ly + hh / 2, 1.75 + 0.13)); } }
        room.anim.push(t => { fm.opacity = 0.75 + Math.sin(t * 1.3) * 0.2; hm.opacity = 0.38 + Math.sin(t * 1.1 + 0.6) * 0.06; }); break; }
      case 'caps': { // giant fungi: each low slab over the reservoir is a cap on a dun stalk from the water or the bank, its gills glowing
        // teal underneath; a high slab standing free over the water is the cap of the tallest of them (capPlat). Giants stand against the
        // back wall (one always in the main view, the room's middle), shelf fungi climb the wall's pilasters and the rock's open faces in
        // clusters (most of them up in the top half; never on bare wall), brackets step up the tall stalks and pale pendant fungi hang under
        // every overhanging mass of rock, so the top of the cavern has something to read as well as the bottom.
        // Lights: one teal light per two low caps (four on phones), one under each tall cap, giant and overhang, two low by the west door, and
        // broad teal washes on the back wall up through the middle of the cavern, so the whole of it reads as lit rock rather than a void.
        // the caps are freckled with glowing spots (seen from above, where the gills are hidden): the cavern's light reads from any angle
        const capM = fmat('capT', () => std(0x544236, { roughness: 0.7, emissive: 0x58d8b8, emissiveMap: capSpotTex(), emissiveIntensity: 0.6, side: THREE.DoubleSide }));
        const stemM = fmat('capS', () => new THREE.MeshStandardMaterial({ map: fibreTex(), roughness: 1, vertexColors: true })); // a damp dun stalk: vertical fibres painted 0x2e2a22-0x3a3329 (a dun brown under the cavern's 1.5 exposure, never a pale smooth pipe), darkened toward its foot per vertex
        const vcol = (g, k) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) c.fill(k(p.getY(i)), i * 3, i * 3 + 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }; // (set after the batch has stripped the attributes it does not keep)
        const gillM = fmat('capG', () => { const t = gillTex(); return new THREE.MeshStandardMaterial({ color: 0x1e3a34, map: t, emissive: 0x40c0a0, emissiveMap: t, emissiveIntensity: 0.8, roughness: 0.9, side: THREE.DoubleSide }); });
        const TOP = [[0.96, -0.5], [1.0, -0.4], [0.97, -0.24], [0.9, -0.1], [0.8, -0.02], [0.45, 0.02], [0, 0.03]].map(([u, v]) => new THREE.Vector2(u, v)), GILLS = [[0, -0.28], [0.14, -0.3], [0.55, -0.4], [0.96, -0.49]].map(([u, v]) => new THREE.Vector2(u, v));
        const cap = (x, y, z, sx, sy, sz, seg, half, face = 0) => { const ph = half ? [-Math.PI / 2 + face, Math.PI] : [0, Math.PI * 2]; // (a half cap faces +z, or turned by face about y: a bracket on a wall or a stalk; the lathe's own UVs carry the freckles round it)
          B(capM, new THREE.LatheGeometry(TOP, seg, ...ph).scale(sx, sy, sz).translate(x, y, z), false).userData.walk = true; /* a cap is stood on: no x-ray off its rim */ B(gillM, new THREE.LatheGeometry(GILLS, seg, ...ph).scale(sx, sy, sz).translate(x, y, z), false); };
        // a stalk turned on a lathe, standing at (x, y0, z), h tall: a swollen foot, a slow taper up the stem, a drooping ring (the annulus)
        // a little under the cap, a slight flare into the gills. Ambient occlusion per vertex: 0.45 at the foot rising to 1 at the ring (the
        // top of a short one). Returns the x of its top (it may lean).
        const stalk = (x, y0, z, h, r0, lean = 0, seg = 12) => { const ry = Math.max(h - 0.75 - r0 * 1.2, h * 0.6), ring = h < 2.2 ? h : ry;
          const P = h < 2.2 ? [[0, -0.03], [r0 * 1.6, -0.03], [r0 * 1.7, h * 0.12], [r0 * 1.25, h * 0.3], [r0 * 1.0, h * 0.6], [r0 * 1.1, h * 0.92], [r0 * 1.25, h]]
            : [[0, -0.06], [r0 * 1.7, -0.06], [r0 * 2.05, 0.1], [r0 * 1.95, 0.32], [r0 * 1.45, 0.62], [r0 * 1.15, Math.min(1.2, h * 0.25)], [r0 * 1.04, (Math.min(1.2, h * 0.25) + ry) / 2], [r0 * 0.92, ry - 0.08], [r0 * 1.75, ry - 0.42], [r0 * 1.85, ry - 0.36], [r0 * 1.0, ry + 0.06], [r0 * 0.86, h - 0.45], [r0 * 1.05, h - 0.1], [r0 * 1.25, h]];
          vcol(B(stemM, pose(new THREE.LatheGeometry(P.map(([u, v]) => new THREE.Vector2(u, v)), seg), x, y0, z, 0, 0, lean)), y => { const t = Math.min(1, Math.max(0, (y - y0) / ring)); return 0.45 + 0.55 * t * t * (3 - 2 * t); }); return x - Math.sin(lean) * h; };
        // bracket fungi stepping up a stalk (between lo and just under its ring), turned out to either side of its front
        const brackets = (x, y0, z, h, r0, lean, n, lo) => { const hi = y0 + h - 1.6; lo = Math.max(lo, y0 + 1.4); if (hi - lo < 0.6) return;
          for (let i = 0; i < n; i++) { const yy = lo + (hi - lo) * (i + R(0.2, 0.8)) / n, xa = x - Math.sin(lean) * (yy - y0), th = (i % 2 ? 1 : -1) * R(0.25, 0.85), rs = r0 * 1.02;
            for (let j = 0, k2 = 1 + (Math.random() < 0.5 ? 1 : 0); j < k2; j++) { const r = R(0.2, 0.4) * (1 - j * 0.3); cap(xa + Math.sin(th) * rs, yy + j * 0.3, z + Math.cos(th) * rs, r, r * 0.6, r * 0.8, 10, true, th); } } };
        const caps = room.solids.filter(s => capPlat(room, s)).sort((a, c) => a.x0 - c.x0), low = caps.filter(s => s.y1 < fy + 8), lowTop = Math.max(fy, ...low.map(s => s.y1)) + 0.6, every = LOW_MEM ? 4 : 2;
        for (const s of caps) { const w = s.x1 - s.x0, cx = (s.x0 + s.x1) / 2, sx = 0.6 * w + 0.05, tall = s.y1 >= fy + 8, sy = tall ? 1.2 : 1, cz = tall ? -1.0 : -0.4, zs = tall ? -2.5 : cz - 0.5, stemTop = s.y1 - 0.3 * sy;
          // (the stem stands behind the play plane: nothing walks through it; a tall one stands further back, behind the low caps' rims)
          cap(cx, s.y1, cz, sx, sy, tall ? 1.8 : 1.5, 28); // flat enough on top to walk the whole slab (its edges sit within 0.9 of the cap's radius)
          const gnd = this.groundAt(room, cx, s.y0), sh = stemTop - gnd, r0 = (0.2 + sx * 0.05) * (tall ? 1.35 : 1);
          if (sh > 0.6) stalk(cx, gnd, zs, sh, r0, 0, tall ? 14 : 12);
          put(sprite(glowTex(), 0x40c0a0, sx * 2.6, 2.0, cx, s.y1 - 0.8, -0.2, 0.26));
          if (!tall) continue;
          room.wallRects.push({ x0: cx - 1, x1: cx + 1, y0: gnd, y1: s.y1, tmp: 1 }, { x0: cx - sx, x1: cx + sx, y0: s.y1 - 1.6, y1: s.y1 + 0.5, tmp: 1 }); // its stalk and its cap, while the giants and shelf fungi find their places
          brackets(cx, gnd, zs, sh, r0, 0, LOW_MEM ? 3 : 5, lowTop); // up the tall stalk, above the low caps
          for (let i = 0; i < (LOW_MEM ? 3 : 5); i++) { const px = cx + R(-0.5, 0.5) * sx, pz = R(-2.4, -1.7), hh = R(0.15, 0.5), rr = R(0.1, 0.22); stalk(px, s.y1 - 0.08, pz, hh, rr * 0.28, R(-0.15, 0.15), 6); cap(px, s.y1 - 0.06 + hh, pz, rr, rr * 0.75, rr, 10); } // a few small ones on the back of its cap (behind the hero)
          this.light(room, cx, s.y1 - 1.5, -0.6, 0x60d0b0, 6, 12); } // under the cap, set back (z -0.6, 1.9 m off the stalk) and gentler: at z +0.3 and 9 it blew the stalk out to a pale pipe
        low.forEach((s, i) => { if (i % every === every - 1 || i === low.length - 1) { const a = low[Math.max(0, i - every + 1)]; let mx = ((a.x0 + a.x1) / 2 + (s.x0 + s.x1) / 2) / 2;
          for (const o of low) { const sx = (o.x0 + o.x1) / 2; if (Math.abs(mx - sx) < 1.2) mx = sx + (mx < sx ? -1.2 : 1.2); } // never hard against a stalk
          this.light(room, mx, Math.min(a.y1, s.y1) - 1.3, -0.3, 0x60d0b0, 7, 12); } });
        // giant fungi against the back wall: tall dun stalks with broad spotted caps, each with a soft teal pool on the stone
        const giants = [], nb = LOW_MEM ? 3 : 6, mid = b.x0 + W / 2, place = (x, g0, h, r, z, sz) => { giants.push({ x, g0, h, r, z, sz }); room.wallRects.push({ x0: x - 0.6, x1: x + 0.6, y0: g0, y1: g0 + h, tmp: 1 }, { x0: x - r, x1: x + r, y0: g0 + h - 0.6, y1: g0 + h + 0.8, tmp: 1 }); };
        const clash = (x, r, g0, capY) => giants.some(o => Math.abs(o.x - x) < o.r + r + 0.4) || room.wallRects.some(o => o.tmp && ((o.x0 < x + 0.6 && o.x1 > x - 0.6 && o.y1 > g0 && o.y0 < capY) || (o.x0 < x + r + 0.3 && o.x1 > x - r - 0.3 && o.y1 > capY - 1.2 && o.y0 < capY + 0.8)))
          || room.flames.some(f => Math.abs(f.fl.position.x - x) < 0.9 && f.fl.position.y > g0 && f.fl.position.y < capY + 1) || room.def.props.some(p => /waterfall|window/.test(p.t) && Math.abs(b.x0 + p.x - x) < r + 1);
        const over = (q, y, skip) => { let best = top; for (const s of room.solids) if (q > s.x0 && q < s.x1 && s.y0 >= y && s.y0 < best && !skip(s)) best = s.y0; return best; };
        { // one giant always stands in the main view (within 6 m of the room's middle, where the camera first looks): behind the walk band
          // (z -2.4, nothing of it forward of -1.7), its stalk clear of stone (it may pass behind the caps and echo slabs, which stand forward
          // of it) and its cap a little over the hero's head there, clear of every slab the hero uses by a margin: never sitting on one or
          // hovering just above one
          const eye = this.groundAt(room, mid, top - 1, true) + 3.2, hit = (x0, x1, y0, y1, skip) => room.solids.some(s => !skip(s) && s.x0 < x1 && s.x1 > x0 && s.y0 < y1 && s.y1 > y0);
          seek: for (const r of [1.8, 1.4]) for (const dx of [-4, 4, -4.5, 4.5, -3.5, 3.5, -5, 5, -5.5, 5.5, -3, 3, -6, 6]) for (const dc of [0, 1.2, -1.2, 2.4]) {
            const x = mid + dx, g0 = this.groundAt(room, x, fy + 4.6), capY = Math.min(top - 1.4, eye + dc); if (capY - g0 < 4.4) continue;
            if (hit(x - 0.75, x + 0.75, g0 + 0.05, capY - 0.3, s => s.kind === 'echo' || capPlat(room, s)) || hit(x - r - 0.4, x + r + 0.4, capY - 3.5, capY + 1.0, () => false) || clash(x, r, g0, capY)) continue;
            place(x, g0, capY - 0.35 - g0, r, -2.4, 0.65); break seek; }
          if (!giants.length) miss('giant in view'); }
        for (let tries = 0; tries < nb * 6 && giants.length < nb; tries++) { const x = R(b.x0 + 3, b.x1 - 3), h = R(5, Math.min(12, top - fy - 1.5)), r = R(1.8, 3.2), z = wz + R(0.5, 0.9);
          if (this.clearWall(room, x - r, x + r, fy, fy + h + 0.6, 0.3)) place(x, fy, h, r, z, r * 0.55); }
        if (giants.length < 3) { // the slabs over the reservoir crowd every column from the floor up, so that search rarely finds three: stand the rest
          // anyway, first a little forward (z -2.2) wherever a column is clear from its ground (floor, bank or stair) to some height, then
          // further back (z -2.9, caps slimmed front to back) rising behind the low caps' rims to stand clear above them, tallest first
          const xs = []; for (let x = b.x0 + 3.2; x < b.x1 - 3.2; x += 0.7) xs.push(x); xs.sort(() => Math.random() - 0.5);
          for (const x of xs) { if (giants.length >= 3) break; const r = R(1.6, 2.4), g0 = this.groundAt(room, x, fy + 4.6), up = Math.min(...[x - r - 0.3, x - r / 2, x, x + r / 2, x + r + 0.3].map(q => this.ceilingAt(room, q, g0 + 0.3))), h = Math.min(11, up - g0 - 1.65);
            if (h >= 4 && !clash(x, r, g0, g0 + h + 0.35)) place(x, g0, h, r, -2.2, r * 0.55); }
          const back = xs.map(x => { const r = R(1.3, 1.9), g0 = this.groundAt(room, x, fy + 4.6), lo = lowTop + 1, hi = Math.min(...[x - 0.5, x, x + 0.5].map(q => over(q, g0 + 0.3, s => s.kind === 'echo' || capPlat(room, s))), ...[x - r - 0.3, x - r / 2, x, x + r / 2, x + r + 0.3].map(q => over(q, lowTop, s => s.kind === 'echo'))) - 1.3;
            const capY = Math.min(g0 + 14, lo + (hi - lo) * R(0.45, 0.95)); return { x, r, g0, capY, ok: hi > lo && capY - g0 >= 4.4 }; }).filter(c => c.ok).sort((a, c) => (c.capY - c.g0) - (a.capY - a.g0));
          for (const c of back) { if (giants.length >= 3) break; if (!clash(c.x, c.r, c.g0, c.capY)) place(c.x, c.g0, c.capY - 0.35 - c.g0, c.r, -2.9, 0.45); } }
        for (const { x, g0, h, r, z, sz } of giants) { const r0 = 0.22 + r * 0.06, lean = R(-0.08, 0.08), tx = stalk(x, g0, z, h, r0, lean, 12);
          cap(tx, g0 + h + 0.35, z, r, r * 0.7, sz, 24); brackets(x, g0, z, h, r0, lean, LOW_MEM ? 1 : 2, z < -2.5 ? lowTop : g0 + 1.4);
          put(sprite(glowTex(), 0x40c0a0, r * 3.2, r * 1.8, tx, g0 + h - 0.6, z + 0.3, 0.22)); this.light(room, tx, g0 + h - 0.8, z + 1.6, 0x60d0b0, 6, 10); }
        // pendant fungi under every mass of rock that overhangs the cavern (the hanging rock, the attic floor): pale caps on short
        // stalks hung from its underside, gills glowing down, glow-worm threads among them; all behind the play plane
        const hangs = room.solids.filter(s => s.kind === 'block' && s.y0 > fy + 3 && s.x1 - s.x0 >= 0.8 && !room.solids.some(o => o !== s && !o.oneway && Math.abs(o.y1 - s.y0) < 0.06 && o.x0 < s.x1 && o.x1 > s.x0));
        for (const s of hangs) { const w = s.x1 - s.x0, n = Math.min(LOW_MEM ? 4 : 8, Math.max(2, Math.round(w / 0.6)));
          for (let i = 0; i < n; i++) { const px = s.x0 + 0.2 + (w - 0.4) * (i + R(0.2, 0.8)) / n, pz = R(-2.2, -0.3), L = R(0.12, 0.5), r = R(0.1, 0.24);
            vcol(B(stemM, pose(new THREE.CylinderGeometry(0.022, 0.032, L, 5, 1, true), px, s.y0 - L / 2, pz)), () => 0.7); cap(px, s.y0 - L, pz, r, r * 0.75, r, 10); }
          put(sprite(glowTex(), 0x40c0a0, w + 1.2, 1.6, (s.x0 + s.x1) / 2, s.y0 - 0.6, -0.4, 0.16)); if (w > 1) this.light(room, (s.x0 + s.x1) / 2, s.y0 - 1.1, 0.4, 0x60d0b0, 6, 9); }
        // two fungus lights low by the west door, each over a small glowing cluster, so the way in is lit by the cavern itself
        for (const d of room.def.doors) if (d.side === 'W') { const y = rowFloorY(d.row) + FLOOR;
          for (const [dx, ly, lz, li] of [[1.9, 0.8, -1.0, 7], [4.4, 1.2, -0.5, 6]]) { const lx = b.x0 + dx; this.light(room, lx, y + ly, lz, 0x60d0b0, li, 9);
            for (let i = 0; i < (LOW_MEM ? 3 : 5); i++) { const sx = lx + R(-0.6, 0.6), sz = R(-2.8, -1.9), hh = R(0.15, 0.55), rr = R(0.1, 0.24); stalk(sx, y, sz, hh, rr * 0.28, R(-0.12, 0.12), 6); cap(sx, y + hh + 0.02, sz, rr, rr * 0.75, rr, 10); }
            put(sprite(glowTex(), 0x40c0a0, 2.2, 1.4, lx, y + 0.5, -1.8, 0.16)); } }
        // glow-worms: threads of cold teal beads hanging from the roof of the cavern and under its overhangs, so its upper dark has stars of its own
        { const pts = [], ns = LOW_MEM ? 22 : 44; for (let i = 0; i < ns; i++) { const x = R(b.x0 + 1, b.x1 - 1), z = R(-2.6, -0.8), L = R(0.6, 3.2), k = Math.round(L / 0.22); for (let j = 0; j < k; j++) pts.push(x + R(-0.02, 0.02), top - 0.2 - j * 0.22 - R(0, 0.06), z); }
          for (const s of hangs) for (let i = 0; i < (LOW_MEM ? 2 : 4); i++) { const x = R(s.x0 + 0.1, s.x1 - 0.1), z = R(-2.2, -0.3), k = Math.round(R(0.4, 1.6) / 0.22); for (let j = 0; j < k; j++) pts.push(x + R(-0.02, 0.02), s.y0 - 0.12 - j * 0.22 - R(0, 0.06), z); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const gm = new THREE.PointsMaterial({ map: glowTex(), color: 0x8af0d8, size: 0.13, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
          put(new THREE.Points(geo, gm)).frustumCulled = false; room.anim.push(t => { gm.opacity = 0.75 + Math.sin(t * 0.8) * 0.15; });
          for (let i = 0; i < (LOW_MEM ? 2 : 4); i++) put(sprite(glowTex(), 0x2a8a78, R(8, 12), 5, b.x0 + W * (i + 0.5) / (LOW_MEM ? 2 : 4), top - 2.2, -2.8, 0.14)); }
        // spores: pale teal motes rising slowly through the cavern and swaying (wrapping back to the floor when they reach the roof)
        { const n = LOW_MEM ? 70 : 150, pos = new Float32Array(n * 3), seed = new Float32Array(n * 2), H = top - fy;
          for (let i = 0; i < n; i++) { pos.set([R(b.x0 + 1, b.x1 - 1), fy + Math.random() * H, R(-1.2, 1.4)], i * 3); seed.set([Math.random() * 6.3, R(0.15, 0.45)], i * 2); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const pts = put(new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex(), color: 0x7ae8c8, size: 0.16, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }))); pts.frustumCulled = false;
          let last = 0; room.anim.push(t => { const dt = Math.min(0.05, Math.max(0, t - last)); last = t; for (let i = 0; i < n; i++) { const k = i * 3, ph = seed[i * 2], v = seed[i * 2 + 1]; pos[k + 1] += v * dt; pos[k] += Math.sin(t * 0.6 + ph) * 0.12 * dt; if (pos[k + 1] > top) pos[k + 1] = fy; } geo.attributes.position.needsUpdate = true; }); }
        // the back wall's own light: broad teal washes an arm's length off the stone (wall + 1.1 m, 3.5 over 12 m), stepping up the whole height
        // of the cavern either side of its middle (the main view), so the shelf fungi and the giants stand against lit rock, not a void. Each
        // keeps 1.6 m clear of the stalks standing back by the wall (a light against a stalk would burn it out)
        const backStalks = [...giants.map(o => o.x), ...caps.filter(s => s.y1 >= fy + 8).map(s => (s.x0 + s.x1) / 2)];
        for (const [dx, fh] of LOW_MEM ? [[-4.5, 0.22], [4.5, 0.5], [-4, 0.78]] : [[-5, 0.18], [5, 0.42], [-4, 0.64], [4.5, 0.86]]) { let lx = mid + dx;
          for (const sx of backStalks) if (Math.abs(lx - sx) < 1.6) lx = sx + (lx < sx ? -1.6 : 1.6);
          this.light(room, lx, fy + (top - fy) * fh, wz + 1.1, 0x4ab8a8, 3.5, 12); }
        // shelf fungi in clusters of two to four, only where they have something to hold: on the faces of the wall's pilasters (after the
        // wall rhythm has stood them: dress() calls this back) and on the open side faces of the rock masses and end walls, turned out from
        // them behind the walk band. Two in three in the upper half; none on bare wall, none clear of the giants and tall stalks
        const keep = [...giants.flatMap(o => [{ x0: o.x - 0.9, x1: o.x + 0.9, y0: o.g0, y1: o.g0 + o.h }, { x0: o.x - o.r - 0.3, x1: o.x + o.r + 0.3, y0: o.g0 + o.h - 1.2, y1: o.g0 + o.h + 1.4 }]),
          ...caps.filter(s => s.y1 >= fy + 8).flatMap(s => { const cx = (s.x0 + s.x1) / 2, sx = 0.6 * (s.x1 - s.x0) + 0.05; return [{ x0: cx - 1, x1: cx + 1, y0: fy, y1: s.y1 }, { x0: cx - sx - 0.2, x1: cx + sx + 0.2, y0: s.y1 - 1.8, y1: s.y1 + 0.8 }]; })];
        room.afterDress = () => { const spots = [], made = [], nb = LOW_MEM ? 8 : 16, midY = (fy + top) / 2, ov = (r, x0, x1, y0, y1) => r.x0 < x1 && r.x1 > x0 && r.y0 < y1 && r.y1 > y0;
          for (const p of room.posts) for (let y = p.y0 + R(1.0, 2.0); y < p.y1 - 1.4; y += R(2.0, 3.2)) spots.push({ x: p.x, y, z: p.zf, hw: p.hw, d: 0 }); // on a pilaster's face
          for (const s of room.solids) if ((s.kind === 'block' || s.kind === 'wall') && s.y1 - s.y0 >= 1.5) for (const [fx, d] of [[s.x0, -1], [s.x1, 1]]) { // on a mass's open side
            if ((d < 0 && fx < b.x0 + 0.3) || (d > 0 && fx > b.x1 - 0.3)) continue;
            for (let y = Math.max(s.y0, fy) + R(0.6, 1.4); y < Math.min(s.y1, top) - 1.2; y += R(2.2, 3.4)) spots.push({ x: fx, y, z: R(-3.0, -2.1), hw: 0, d, host: s }); }
          spots.sort(() => Math.random() - 0.5); let lowN = 0;
          for (const o of spots) { if (made.length >= nb) break; const up = o.y > midY; if (!up && lowN >= Math.ceil(nb / 3)) continue;
            const x0 = o.d ? Math.min(o.x, o.x + o.d * 0.6) : o.x - 0.6, x1 = o.d ? Math.max(o.x, o.x + o.d * 0.6) : o.x + 0.6, y0 = o.y - 0.45, y1 = o.y + 1.3;
            if (room.solids.some(s => s !== o.host && ov(s, x0 - 0.05, x1 + 0.05, y0, y1)) || keep.some(r => ov(r, x0, x1, y0, y1)) || made.some(m => Math.abs(m.x - o.x) < 1.6 && Math.abs(m.y - o.y) < 1.8)
              || (!o.d && room.wallRects.some(r => ov(r, x0, x1, y0, y1))) || room.flames.some(f => Math.abs(f.fl.position.x - o.x) < 0.9 && Math.abs(f.fl.position.y - o.y - 0.4) < 1.4)) continue;
            made.push(o); if (!up) lowN++;
            for (let j = 0, k2 = 2 + Math.floor(Math.random() * 3); j < k2; j++) { const r = R(0.22, 0.46), yy = o.y + j * 0.36 + R(-0.08, 0.08);
              if (o.d) cap(o.x, yy, o.z + R(-0.25, 0.25), r * 0.8, r * 0.6, r, 10, true, o.d * Math.PI / 2); else cap(o.x + R(-0.8, 0.8) * o.hw, yy, o.z, r, r * 0.6, r * 0.8, 10, true); } // each held on at its middle, within the post's width or on the face
            if (made.length % 2 === 0) put(sprite(glowTex(), 0x40c0a0, 1.8, 1.4, o.x + o.d * 0.3, o.y - 0.3, o.z + 0.4, 0.2)); }
          if (!made.length) miss('shelf fungi'); };
        if (!caps.length) miss(k); break; }
      case 'rails': { const z = -2.3, sl = tm(['adzed_beam', X, 0x8a7a68]); // a cart road along the gallery floor, and a cart heaped with ore
        for (const s of room.solids) if (s.kind === 'floor' && Math.abs(s.y1 - fy) < 0.05 && s.x1 - s.x0 > 3) { const x0 = Math.max(s.x0, b.x0) + 0.6, x1 = Math.min(s.x1, b.x1) - 0.6;
          for (const dz of [-0.36, 0.36]) B(IRON, gBox(x0, fy + 0.1, z + dz - 0.03, x1, fy + 0.17, z + dz + 0.03)); for (let xx = x0 + 0.3; xx < x1; xx += 0.7) B(sl, gBox(xx - 0.1, fy, z - 0.55, xx + 0.1, fy + 0.1, z + 0.55)); }
        const x = onFloor(at(0.62), 0.8, true); if (x === null) { miss(k); break; } const cy = fy + 0.42, wd = tm(['oak_planks', X, 0x8a7a68]);
        B(wd, gBox(x - 0.75, cy, z - 0.45, x + 0.75, cy + 0.65, z + 0.45)); for (const yy of [cy + 0.05, cy + 0.55]) B(IRON, gBox(x - 0.77, yy, z - 0.47, x + 0.77, yy + 0.07, z + 0.47));
        for (const dx of [-0.48, 0.48]) for (const dz of [-0.4, 0.4]) B(IRON, pose(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 12), x + dx, fy + 0.36, z + dz, Math.PI / 2));
        for (let i = 0; i < 9; i++) { const s = R(0.12, 0.24); B(stone(), pose(new THREE.DodecahedronGeometry(s, 0), x + R(-0.5, 0.5), cy + 0.62 + s * 0.3, z + R(-0.25, 0.25), R(0, 3), R(0, 3), 0)); } break; }
      case 'breach': { const gp = room.gap; if (!gp) break; const xc = (gp[0] + gp[1]) / 2, st = tm(room.spec.backWall || room.theme.backWall); // the wall-walk torn open: fallen masonry heaped through the gap, storm light pouring in
        for (let i = 0; i < 40; i++) { const s = R(0.16, 0.5), px = xc + R(-1, 1) * R(0.4, 1) * 3.4, pz = ZB + 0.15 + Math.random() ** 1.5 * 2.3, hp = Math.max(0, 0.9 - Math.abs(px - xc) * 0.25 - (pz - ZB) * 0.35); B(st, pose(new THREE.DodecahedronGeometry(s, 0).scale(1, R(0.5, 0.9), 1), px, fy + hp + s * 0.3, pz, R(0, 3), R(0, 3), R(0, 3))); }
        for (const [dx, rz, ry] of [[-1.6, 0.35, 0.4], [1.9, -0.6, -0.3]]) B(st, pose(new THREE.BoxGeometry(1.3, 1.1, 0.8), xc + dx, fy + 0.45, ZB + 1.1, 0, ry, rz)); // two merlons, thrown down whole
        g.add(sprite(glowTex(), 0x8aa0e0, 7, 3.4, xc, fy + 1.1, ZB - 0.8, 0.35));
        const ray = plane(new THREE.MeshBasicMaterial({ map: rayTex(), color: 0x9ab0e8, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), gp[1] - gp[0] + 0.6, 4.6, xc, fy + 2.2, ZB + 1.2); ray.rotation.x = -0.5; g.add(ray);
        const pool = plane(new THREE.MeshBasicMaterial({ map: glowTex(), color: 0x8aa0e0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }), 6, 3, xc, fy + 0.02, -1.4); pool.rotation.x = -Math.PI / 2; g.add(pool);
        this.light(room, xc + 1.2, fy + 3.0, 0.6, 0x9ab0f0, 14, 12); break; } // (held forward of the hanging chain in the gap, so it lights the rubble, not the links)
    } } finally { room.wallRects = room.wallRects.filter(r => !r.tmp); }
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
    // the way through is DARK: the passage's back used to show lit ashlar at the wall's own brightness and read as a bricked-up recess
    { const dk = plane(DOOR_DARK, 1.5, DOOR_H + 0.1, x, y + DOOR_H / 2, ZB + 0.03); g.add(dk); const th = plane(DOOR_GLOW, 2.6, 1.3, x, y + 0.02, -0.4); th.rotation.x = -Math.PI / 2; g.add(th); } // and a faint pale threshold on the floor marks it as a door
    g.add(wbox(m, x - 0.75, y - 0.1, x + 0.75, y + DOOR_H, 1.0, 1.35)); // the near jamb only: the far one stood IN the opening and read as brick infill
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
    // the bays: 6.667 m, or the room's own rhythm (RHYTHM[id]: one width, or a wide and a narrow bay alternating); the first is centred on the west wall
    const RW = RHYTHM[def.id]?.[0] === 'arcade' ? [].concat(RHYTHM[def.id][1]) : [6.667], BAYS = [];
    for (let c = b.x0 - 0.033, i = 0; ; i++) { const h = RW[i % RW.length] / 2; if (c >= b.x1 + h) break; BAYS.push({ c, hb: h, k: h * 2 / 6.667 }); c += h + RW[(i + 1) % RW.length] / 2; }
    for (let i = 0; i < BAYS.length - 1; i++) { const x = BAYS[i].c + BAYS[i].hb; if (x < b.x1 - 1) piers.push(x); }
    room.bayList = BAYS; room.bayW = RW.reduce((a, w) => a + w, 0) / RW.length; // (bay centres stay evenly spaced: windows snap to them)
    const onPier = (ls, x) => ls.some(l => Math.abs(Math.abs(l.c - x) - l.hb) < 0.2);
    room.pillarX = piers.slice();
    const tall = C > 8, heavy = def.props.filter(p => /altar|sarcophagus|throne|organ|statue|fountain|bookshelf|furnace|coffin|pews|bigbell/.test(p.t)).map(p => b.x0 + p.x);
    const stands = room.solids.filter(s => s.kind === 'block' && s.y0 <= fy + 0.1);
    const cornice = y => { g.add(wbox(trimM, b.x0, y, b.x1, y + 0.32, ZB, Z + 0.28)); g.add(nosing(trimM, b.x0, b.x1, y + 0.32, Z + 0.28, 0.08)); room.wallRects.push({ x0: b.x0, x1: b.x1, y0: y - 0.05, y1: y + 0.4, cornice: true }); };
    const solidsIn = (x0, x1, y0, y1) => room.solids.some(s => ['plat', 'block', 'ledge', 'crack', 'echo'].includes(s.kind) && s.x0 < x1 && s.x1 > x0 && s.y0 < y1 && s.y1 > y0);
    const underIn = (x0, x1, y0, y1) => room.solids.filter(s => ['plat', 'block', 'ledge', 'crack', 'echo'].includes(s.kind) && s.x0 < x1 && s.x1 > x0 && s.y0 < y1 && s.y1 > y0).reduce((m, s) => Math.min(m, s.y0), Infinity);
    const tier = (name, spring, top, sy, sc) => {
      const rise = (name === 'bay_high' ? 4.9 : 3.6) * sy, base = room._tierBase ?? fy, landed = [];
      for (const { c, hb, k: kx } of BAYS) { // kx: this bay's width over the standard bay: the kit's arches stretch to it
        if (!solidsIn(c - 2.9 * kx, c + 2.9 * kx, spring + 0.4, spring + rise + 0.5)) {
          for (const part of ['_spandrel', '_arch', '_hood']) kitPiece(room, KIT, name + part, part === '_spandrel' ? S : P, c, spring, ZB, kx, sy, 1);
          const rc = new THREE.Mesh(new THREE.ShapeGeometry(archShape(5.6 * kx, rise, 16, spring - base)), RECESS); rc.position.set(c, spring, ZB + 0.04); g.add(rc);
          room.bays.push({ c, spring, rise, base, k: kx }); landed.push({ c, hb }); continue; // (bays: filled per theme once the props have claimed their walls)
        }
        // something crosses this bay. Daises and plinths standing in it only raise the bay's floor; what hangs over it sets the
        // height: a lower arch tucked under it on imposts, else two half-span sub-arches on a colonnette, else a blind pointed panel
        const inBay = s => s.x0 < c + 2.9 * kx && s.x1 > c - 2.9 * kx, standing = s => s.y0 <= base + 0.1;
        const lb = Math.max(base, ...room.solids.filter(s => ['block', 'crack'].includes(s.kind) && standing(s) && inBay(s) && s.y1 < spring + 0.4).map(s => s.y1));
        const hangs = (y0, y1) => room.solids.filter(s => ['plat', 'block', 'ledge', 'crack', 'echo'].includes(s.kind) && !standing(s) && inBay(s) && s.y0 < y1 && s.y1 > y0);
        const under = hangs(lb + 0.3, spring + rise + 0.5).reduce((m, s) => Math.min(m, s.y0), spring + rise + 0.5);
        const clear = (y0, y1) => !hangs(y0, y1).length && !room.solids.some(s => ['block', 'crack'].includes(s.kind) && standing(s) && inBay(s) && s.y1 > y0 + 0.05 && s.y0 < y1);
        const sy2 = Math.min(sy, (under - 0.3 - (lb + 2.0)) / 4.0), sp2 = under - 0.3 - 4.0 * sy2;
        const sy3 = Math.min(0.75, (under - 0.3 - (lb + 1.0)) / 4.0), sp3 = under - 0.3 - 4.0 * sy3;
        if (sy2 >= 0.42 && clear(sp2, sp2 + 3.6 * sy2 + 0.2)) {
          for (const part of ['_spandrel', '_arch', '_hood']) kitPiece(room, KIT, 'bay_low' + part, part === '_spandrel' ? S : P, c, sp2, ZB, kx, sy2, 1);
          const rc = new THREE.Mesh(new THREE.ShapeGeometry(archShape(5.6 * kx, 3.6 * sy2, 16, sp2 - lb)), RECESS); rc.position.set(c, sp2, ZB + 0.04); g.add(rc);
          landed.push({ c, hb }); room._imp = (room._imp || []).concat([[c - hb, sp2], [c + hb, sp2]]);
        } else if (sy3 >= 0.22 && clear(sp3, sp3 + 3.6 * sy3 + 0.2)) {
          for (const cc of [c - hb / 2, c + hb / 2]) {
            for (const part of ['_spandrel', '_arch']) kitPiece(room, KIT, 'bay_low' + part, part === '_spandrel' ? S : P, cc, sp3, ZB, 0.5 * kx, sy3, 1);
            const rc = new THREE.Mesh(new THREE.ShapeGeometry(archShape(2.8 * kx, 3.6 * sy3, 12, sp3 - lb)), RECESS); rc.position.set(cc, sp3, ZB + 0.04); g.add(rc);
          }
          if (sp3 - lb > 1.0) this.kitPier(room, c, lb, sp3, 0.36, Z); else this.respond(room, c, sp3, 0.36, Z); // the colonnette between the two
          landed.push({ c, hb }); room._imp = (room._imp || []).concat([[c - hb, sp3], [c + hb, sp3]]);
        } else if (under - lb > 1.6) { // blind arcading: a recessed panel with a pointed head
          const y0 = lb + 0.4, top = under - 0.35, rp = Math.min(1.8, (top - y0) * 0.45), ys = top - rp, syp = rp / 3.8;
          kitPiece(room, KIT, 'bay_low_arch', P, c, ys, ZB, 0.76 * kx, syp, 0.45);
          for (const [a, c2] of [[c - 2.3 * kx, c - 2.12 * kx], [c + 2.12 * kx, c + 2.3 * kx]]) g.add(wbox(trimM, a, y0, c2, ys, ZB, ZB + 0.22));
          g.add(wbox(trimM, c - 2.4 * kx, y0 - 0.18, c + 2.4 * kx, y0, ZB, ZB + 0.3));
          const rc = new THREE.Mesh(new THREE.ShapeGeometry(archShape(4.2 * kx, rp, 14, ys - y0)), RECESS); rc.position.set(c, ys, ZB + 0.03); g.add(rc);
        }
      }
      for (const x of piers) {
        if (!onPier(landed, x)) continue; // a pier only where an arch lands
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
      room.arches = (room.arches || []).concat(landed.map(l => ({ c: l.c, spring, apex: spring + rise })));
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
          const lit = [], glass = RFILL[def.theme] === 'mirror'; // the mirror halls hang a looking-glass in every other clerestory bay, at the height the galleries are played
          for (const { c, hb } of BAYS) if (c > b.x0 + 1.5 && c < b.x1 - 1.5 && !solidsIn(c - 1.4, c + 1.4, y, y + h + 0.5)) {
            if (glass && lit.length % 2) this.lookingGlass(room, c, y + 0.35, h - 0.1, 2.0 * sc); else { this.lancet(room, c, y + 0.35, sc, T.sky ? GLOW : this.nightGlass(c)); room.lancets = (room.lancets || 0) + 1; } lit.push({ c, hb }); }
          for (const x of piers) if (onPier(lit, x)) kitPiece(room, KIT, 'pier_shaft', P, x, y, Z + 0.15, 0.4, h + 0.4, 0.4);
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
    return; // (off: seen from the side a rib running toward the camera is a loose plank floating under the ceiling, not a vault rib)
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
  // a looking-glass in a clerestory bay of the mirror halls: a pointed glass in a gilt surround, sill at (x, y), h tall, w wide
  lookingGlass(room, x, y, h, w) {
    const mr = w * 0.42, ms = y + h - mr, drop = ms - y;
    const sur = new THREE.ShapeGeometry(archShape(w + 0.36, mr + 0.14, 12, drop + 0.14)); sur.translate(x, ms, ZB + 0.05); bat(room, GILT(), sur, false);
    const gl = new THREE.ShapeGeometry(archShape(w, mr, 12, drop)), uv = gl.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + w / 2) / w, (uv.getY(k) + drop) / (drop + mr)); gl.translate(x, ms, ZB + 0.065);
    bat(room, _mirM ||= new THREE.MeshBasicMaterial({ map: mirrorTex(), color: 0xb8c0d8 }), gl, false);
    const sh = sprite(glowTex(), 0xc8d0ff, w * 0.7, h * 0.85, x - 0.2, y + h * 0.45, ZB + 0.12, 0.1); room.group.add(sh); const ph = x * 0.37; room.anim.push(t => { sh.material.opacity = 0.07 + Math.sin(t * 0.7 + ph) * 0.04; sh.position.x = x + Math.sin(t * 0.25 + ph) * w * 0.3; });
  }
  // the pilgrim's stone on the causeway: where the first blade stands
  pilgrimStone(room, x, y) {
    const KIT = room.kit; if (!KIT) return;
    kitPiece(room, KIT, 'pilgrim_stone', { stone: tm(['limestone_1', T0, 0x8a8a90], true), trim: tm(['ashlar', T0], true), dark: DARK }, x, y, -0.6);
    flushKit(room);
  }

  bgGear(room, x, y, r) { const gm = GEAR(); const c = new THREE.Mesh(gearGeo(r, Math.round(8 + r * 4)), gm); c.position.set(x, y, ZB + 0.25 + (Math.abs(Math.round(x * 3 + y)) % 3) * 0.45); const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.27, r * 0.3, 0.52, 16), BRASS); hub.rotation.x = Math.PI / 2; hub.position.z = 0.15; c.add(hub); const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.13, r * 0.15, 0.14, 12), BRASS); cap.rotation.x = Math.PI / 2; cap.position.z = 0.48; c.add(cap); for (let k = 0; k < 5; k++) { const a = (k + 0.5) / 5 * Math.PI * 2, sp = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.6, 0.22), BRASS_R); sp.position.set(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48, 0.15); sp.rotation.z = a - Math.PI / 2; c.add(sp); } c.castShadow = true; room.group.add(c); const sp = rnd(0.2, 0.6) * (Math.random() < 0.5 ? -1 : 1); room.anim.push(t => { c.rotation.z = t * sp; }); }

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
      const gate = room.def.props.find(p => p.t === 'gatearch'), px1 = gate ? b.x1 - 2.3 : b.x1;
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
  lava(room, x, y, w, h) { // geometry in room-local metres: the shader's noise, banks and depth read straight off it
    const sy = y + h - 0.07, raised = y > room.b.y0 + FLOOR + 1, top = new THREE.PlaneGeometry(w, ZF - ZB - 0.1).rotateX(-Math.PI / 2).translate(x + w / 2, sy, (ZB + ZF) / 2), geo = mergeGeometries([gBox(x, y, ZB + 0.05, x + w, sy - 0.01, ZF - 0.05), top]); top.dispose();
    const body = new THREE.Mesh(geo, fxMat(LAVA_FS, { uB: { value: new THREE.Vector3(x, x + w, sy) }, uK: { value: raised ? new THREE.Vector2(0.4, 0.4) : new THREE.Vector2(1, 1.8) } })); body.castShadow = false; room.group.add(body);
    if (raised) room.group.add(wbox(tm(['keep_basalt', X, 0x4a3c36]), x, sy - 0.03, x + w, sy + 0.07, ZF - 0.2, ZF - 0.03)); // a raised slab is seen edge-on: a 0.15 m dark stone kerb along its front edge, not a white-hot line (the crust front's glowing top 0.35 m still shows under it)
    room.group.add(sprite(glowTex(), 0xff5a10, w * 1.6, 4.5, x + w / 2, y + h + 0.4, 1.2, raised ? 0.22 : 0.35));
    room.group.add(plane(fmat('rise', () => new THREE.MeshBasicMaterial({ map: riseTex(), color: 0xff4a10, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })), w + 1.5, 3.4, x + w / 2, sy + 1.6, ZB + 0.06)); // its light on the wall behind
    for (const [ex, d] of [[x, -1], [x + w, 1]]) if (room.solids.some(s => s.kind !== 'ceil' && s.x0 < ex + 0.15 && s.x1 > ex - 0.15 && s.y1 > sy - 0.3 && s.y0 < sy)) room.group.add(sprite(glowTex(), 0xff6a20, 2.4, 2.2, ex + d * 0.3, sy + 0.25, 1.85, 0.26)); // and on the banks it laps (soft: the corner must not bloom white)
    for (let lx = x + Math.min(w / 2, 3); lx < x + w; lx += 8) this.light(room, lx, y + h + 1.2, 0.5, 0xff6a20, 16, 12);
    room.bubbles = (room.bubbles || []).concat({ x, y: y + h, w });
  }
  water(room, x, y, w, h) {
    const T = room.theme, lit = T.sky ? 1 : THREE.MathUtils.clamp(0.38 + (T.amb - 0.42) * 1.55, 0.38, 1); // open sky keeps the full sheen; a 0.45-ambient vault takes ~0.43 of it
    const m = fxMat(WATER_FS, { uB: { value: new THREE.Vector3(x, x + w, y + h) }, uLit: { value: lit } }, { transparent: true, depthWrite: false });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(x + w / 2, y + h / 2, 1.9), m); front.renderOrder = 5; room.group.add(front);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.9 - ZB).rotateX(-Math.PI / 2).translate(x + w / 2, y + h, (ZB + 1.9) / 2), m); top.renderOrder = 5; room.group.add(top);
    room.anim.push(t => { top.position.y = Math.sin(t * 1.4 + x) * 0.03; });
  }
  blade(room, bl) {
    const piv = new THREE.Group(); piv.position.set(bl.px, bl.py, 0.0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, bl.len, 6), IRON); rod.position.y = -bl.len / 2;
    const shp = new THREE.Shape(); shp.absarc(0, 0, 0.95, Math.PI, Math.PI * 2, false); shp.lineTo(0, 0.35); shp.lineTo(-0.95, 0);
    // a bevelled steel edge (it was a flat mirror card with no environment to reflect: grey paper fans) under a dark iron spine
    const bm = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: 0.04, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 20 }), std(0x4c525a, { metalness: 0.7, roughness: 0.42 })); bm.position.set(0, -bl.len, -0.02);
    const spine = box(IRON, -0.8, -bl.len - 0.03, 0.8, -bl.len + 0.09, -0.07, 0.07);
    piv.add(rod, bm, spine, box(IRON, -0.25, -0.15, 0.25, 0.15, -0.3, 0.3)); room.group.add(piv); bl.mesh = piv;
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
  // a framed picture (k >= 0: an oil portrait; k < 0: an antique looking-glass), centred on its group's origin, facing +z
  picture(room, w, h, k) {
    const grp = new THREE.Group(), gs = [], G = (a, b, c, d, e, f) => gs.push(gBox(a, b, c, d, e, f)), W2 = w / 2, H2 = h / 2, fw = 0.17, th = room.def.theme, lamp = k >= 0 && /portrait|gallery|vestibule|library/.test(th);
    G(-W2 - fw, H2, 0, W2 + fw, H2 + fw, 0.14); G(-W2 - fw, -H2 - fw, 0, W2 + fw, -H2, 0.14); G(-W2 - fw, -H2, 0, -W2, H2, 0.14); G(W2, -H2, 0, W2 + fw, H2, 0.14); // the moulding
    G(-W2 - 0.03, H2 - 0.03, 0.1, W2 + 0.03, H2 + 0.03, 0.18); G(-W2 - 0.03, -H2 - 0.03, 0.1, W2 + 0.03, -H2 + 0.03, 0.18); G(-W2 - 0.03, -H2, 0.1, -W2 + 0.03, H2, 0.18); G(W2 - 0.03, -H2, 0.1, W2 + 0.03, H2, 0.18); // a bead round the sight edge
    for (const [a, c] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) G(a * (W2 + fw / 2) - 0.15, c * (H2 + fw / 2) - 0.15, 0, a * (W2 + fw / 2) + 0.15, c * (H2 + fw / 2) + 0.15, 0.21); // corner bosses
    if (k >= 0) G(-0.3, -H2 - fw - 0.2, 0.02, 0.3, -H2 - fw - 0.06, 0.08); // the name plate
    if (lamp) { G(-0.45, H2 + fw + 0.16, 0.06, 0.45, H2 + fw + 0.26, 0.46); G(-0.03, H2 + fw, 0.02, 0.03, H2 + fw + 0.2, 0.1); } // a picture light on its arm
    const fr = new THREE.Mesh(mergeGeometries(gs, false), GILT()); gs.forEach(g => g.dispose()); fr.castShadow = true; grp.add(fr);
    if (k < 0) { const gm = plane(_mirM ||= new THREE.MeshBasicMaterial({ map: mirrorTex(), color: 0xb8c0d8 }), w, h, 0, 0, 0.1); grp.add(gm);
      const gl = sprite(glowTex(), 0xc8d0ff, w * 0.7, h * 0.9, -w * 0.12, h * 0.1, 0.16, 0.16); grp.add(gl); const ph = Math.random() * 6; room.anim.push(t => { gl.material.opacity = 0.1 + Math.sin(t * 0.8 + ph) * 0.06; gl.position.x = Math.sin(t * 0.3 + ph) * w * 0.2; }); }
    else { grp.add(plane(portraitMat(k), w, h, 0, 0, 0.1)); if (lamp) grp.add(sprite(glowTex(), 0xffc890, w * 1.2, h * 0.75, 0, H2 * 0.4, 0.3, 0.2)); }
    return grp;
  }
  sitter(room, x) { const n = Math.abs(Math.round(x * 3.7 + room.b.y0)); return /gallery|chapel|shrine/.test(room.def.theme) ? 6 + n % 3 : n % 6; } // saints in the chapels, nobles elsewhere
  // a painting with no wall left to hang on stands on an easel; a glass, on a cheval stand
  easel(room, kind, x, y) {
    const sx = this.floorSpot(room, x, 0.9, y); if (sx === null) return false;
    const mir = kind === 'mirror', wd = tm(['pv_dark_walnut', X]), z = -2.35, h = mir ? 2.2 : 1.45, w = mir ? 1.0 : 1.2, cy = y + (mir ? 1.3 : 1.75), leg = (dx, rz, rx, zz) => bat(room, wd, pose(new THREE.BoxGeometry(0.07, 2.75, 0.07), sx + dx, y + 1.3, zz, rx, 0, rz));
    if (mir) { for (const dx of [-0.62, 0.62]) bat(room, wd, gBox(sx + dx - 0.05, y, z - 0.05, sx + dx + 0.05, y + 2.5, z + 0.05)); bat(room, wd, gBox(sx - 0.8, y, z - 0.35, sx + 0.8, y + 0.08, z + 0.35)); }
    else { leg(-0.42, -0.15, -0.06, z); leg(0.42, 0.15, -0.06, z); leg(0, 0, 0.32, z - 0.42); bat(room, wd, gBox(sx - 0.75, cy - h / 2 - 0.12, z - 0.02, sx + 0.75, cy - h / 2 - 0.02, z + 0.22)); }
    const pic = this.picture(room, w, h, mir ? -1 : this.sitter(room, sx)); pic.position.set(sx, cy, z + 0.06); pic.rotation.x = mir ? 0 : -0.09; room.group.add(pic); return true;
  }
  // a clear spot on the floor strip behind the play plane (no block, prop, chest, candle stand or door in the way)
  floorSpot(room, x, hw, y) {
    const b = room.b, d = room.def, used = room.floorUsed ||= [], busy = [...d.chests, ...d.breakables, ...d.items, d.save, d.warp, d.shop].filter(Boolean);
    for (const dx of [0, 0.8, -0.8, 1.6, -1.6, 2.6, -2.6, 3.6, -3.6, 5, -5, 6.5, -6.5]) {
      const xx = x + dx; if (xx - hw < b.x0 + 1.3 || xx + hw > b.x1 - 1.3) continue;
      if ([xx - hw, xx + hw].some(px => Math.abs(this.groundAt(room, px, y + 0.3) - y) > 0.06)) continue;
      if (Math.abs(y - (b.y0 + FLOOR)) < 0.06 && !room.solids.some(s => s.kind === 'floor' && s.x0 <= xx - hw && s.x1 >= xx + hw)) continue; // not over a hole
      if (room.solids.some(s => !['floor', 'wall', 'ceil'].includes(s.kind) && s.x0 < xx + hw && s.x1 > xx - hw && s.y1 > y + 0.05 && s.y0 < y + 2.6)) continue;
      if (used.some(u => Math.abs(u.y - y) < 1 && Math.abs(u.x - xx) < u.hw + hw + 0.3)) continue;
      if (busy.some(o => Math.abs(b.y0 + (o.y ?? FLOOR) - y) < 1 && Math.abs(b.x0 + o.x - xx) < hw + 0.9)) continue;
      if (d.props.some(p => !/torch|banner|tapestry|painting|mirror|window|rose|chain|web|ivy|skullwall|chandelier|stalactite|hook|cage|rug|gear|dial|pipe/.test(p.t) && Math.abs(b.y0 + (p.y ?? FLOOR) - y) < 1 && Math.abs(b.x0 + p.x - xx) < hw + 1.1)) continue;
      used.push({ x: xx, y, hw }); return xx;
    }
    return null;
  }
  async prop(room, p) {
    const b = room.b, g = room.group, T = room.theme; let x = b.x0 + p.x; const y = b.y0 + (p.y ?? FLOOR), top = b.y1 - FLOOR, ceil = top - y < 13 ? top : y + 6.6;
    let hy = 0, hs = 1; // a hanging's shift up/down its wall and its scale, once it has found a clear piece of wall
    if (/^(banner|tapestry|painting|mirror)$/.test(p.t)) { // hangings move to the nearest clear wall: sideways, then up or down, then a size smaller
      const tall = p.t === 'banner', w = { banner: 1.7, tapestry: 3.4, painting: 2.4, mirror: 2.0 }[p.t], h = { banner: 3.6, tapestry: 2.8, painting: 2.8, mirror: 3.2 }[p.t], cy0 = Math.min(top - h / 2 - 0.3, y + (tall ? 4.2 : 3.0));
      const steps = [0, 1.6, -1.6, 3.333, -3.333, 5, -5, 6.667, -6.667, 10, -10, 13.333, -13.333]; let nx = null;
      for (const sc of [1, 0.74]) { const dys = [0, 0.8, -0.6, 1.6, 2.4, -1.1].filter(d => cy0 + d + h * sc / 2 < top - 0.15 && cy0 + d - h * sc / 2 > y + 0.45); nx = this.findWall(room, x, w * sc / 2, cy0 - h * sc / 2, cy0 + h * sc / 2, steps, dys, true); if (nx !== null) { hy = room._dy; hs = sc; break; } }
      if (nx === null) { if (p.t !== 'banner' && p.t !== 'tapestry' && this.easel(room, p.t, x, y)) return; console.debug?.('[world] no wall for', room.def.id, p.t, p.x); return; } // a painting or glass that finds no wall stands on an easel
      x = nx;
    }
    { const hw = { window: p.big ? 2.2 : 1.6, rosewindow: 2.6, banner: 1.2, tapestry: 2, painting: 1.5, mirror: 1.3, bookshelf: 1.9, skullwall: 2.2, furnace: 1.9, organ: 2.6, ivy: 2.5, throne: 1.4, statue: 1 }[p.t]; if (hw) (room.hung ||= []).push({ x0: x - hw, x1: x + hw, y, wall: !/throne|statue/.test(p.t) }); }
    const add = o => { g.add(o); return o; }, wood = surface('wood', 1, 1), stone = mat(T.wall, 1, 1), n0 = g.children.length, s0 = room.sources.length;
    switch (p.t) {
      case 'torch': { // a sconce 2.4 m over its surface, but never up in the vault and never behind a ledge overhead
        let ty = Math.min(y + 2.4, room.b.y1 - FLOOR - 1.5); for (const sl of room.solids) if ((sl.kind === 'plat' || sl.kind === 'block' || sl.kind === 'ledge') && x > sl.x0 - 0.3 && x < sl.x1 + 0.3 && sl.y0 > y + 1.2 && sl.y0 < ty + 0.6) ty = Math.min(ty, sl.y0 - 0.7);
        this.torch(room, x, Math.max(y + 1.3, ty)); break; }
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
        const nm = names[Math.abs(Math.round(x * 7)) % names.length], w = (tall ? 1.7 : 3.4) * hs, h = (tall ? 3.4 : 2.6) * hs, cy = Math.min(top - h / 2 - 0.3, y + (tall ? 4.2 : 3.2) + hy);
        if (tall) { const k = Math.abs(Math.round(x * 7)), file = p.house === 'tess' ? `tess_${'ab'[k % 2]}_${(k >> 1) % 2}` : k % 5 === 4 ? `tess_${'ab'[k % 2]}_${(k >> 1) % 2}` : `vel_${'abcd'[k % 4]}_${(k >> 2) % 2}`; // Velscour's banners, now and then a captured standard
          const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 3.62, 1, 6), new THREE.MeshStandardMaterial({ map: texture(GL + file + '.webp'), alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide, color: file.startsWith('tess') ? 0xa89880 : new THREE.Color(1.7, 1.55, 1.5), emissive: file.startsWith('tess') ? 0x000000 : 0x1c0606 })); ban.position.set(x, cy, ZB + 0.09); ban.scale.set(hs, hs, 1); add(ban);
          room.anim.push(t => { ban.rotation.y = Math.sin(t * 0.7 + x) * 0.03; }); break; }
        const geo = new THREE.PlaneGeometry(w, h, 1, 4), ban = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex(nm), roughness: 0.9, side: THREE.DoubleSide }));
        ban.position.set(x, cy, ZB + 0.09); add(ban); const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, w + 0.4, 6), BRASS)); rod.rotation.z = Math.PI / 2; rod.position.set(x, cy + h / 2 + 0.03, ZB + 0.13);
        break;
      }
      case 'painting': case 'mirror': { // an oil portrait or an antique glass in a moulded gilt frame
        const mir = p.t === 'mirror', w = (mir ? 1.8 : 2.2) * hs, h = (mir ? 3.0 : 2.6) * hs, cy = Math.min(top - h / 2 - 0.4, y + (mir ? 2.9 : 3.0) + hy);
        const pic = this.picture(room, w, h, mir ? -1 : this.sitter(room, x)); pic.position.set(x, cy, ZB + 0.02); add(pic); break;
      }
      case 'window': case 'rosewindow': {
        if (p.t === 'window' && T.arcade) { const bc = (room.bayList || []).reduce((m, q) => Math.abs(q.c - x) < Math.abs(m.c - x) ? q : m, { c: Infinity }); if (Math.abs(bc.c - x) < Math.max(3.4, bc.hb + 0.07)) x = bc.c; } // into the nearest bay of the arcade
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
          const bw = room.bayW || 6.667, nx = this.findWall(room, x, w / 2 + 0.5, sill - 0.3, sill + h + 0.3, T.arcade ? [0, bw, -bw, 2 * bw, -2 * bw, 3 * bw, -3 * bw, 4 * bw, -4 * bw] : [0, 2, -2, 4, -4], arch ? [0] : [0, 1.2, 2.4, -1.2], !!arch); if (nx === null) break; x = nx; // a lancet seated in its arch ignores the cornice its arch already sits under
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
      case 'chain': { if (room.solids.some(s => capPlat(room, s) && Math.abs(s.y1 - y) < 0.1 && x > s.x0 - 0.2 && x < s.x1 + 0.2)) break; // a fungus's cap stands on its own stalk: it is not hung on a chain
        let lo = y; for (const sl of room.solids) if (!['floor', 'wall', 'ceil'].includes(sl.kind) && x > sl.x0 - 0.2 && x < sl.x1 + 0.2 && sl.y1 < top - 0.5 && sl.y1 > lo) lo = sl.y1; add(chain(0x9a9590, 0.35, top - lo, x, (top + lo) / 2, ZB + 1.2)); if (lo > y + 0.1) { const eye = add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12), IRON)); eye.position.set(x, lo + 0.1, ZB + 1.2); } break; }
      case 'hook': { const len = Math.min(3.2, top - y - 2.2); add(chain(0x9a9590, 0.28, len, x, top - len / 2, -1.4)); const hk = add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 5, 12, 4.2), IRON)); hk.position.set(x, top - len - 0.15, -1.4); if (Math.round(x) % 2) { const pts = [[0.03, 0.34], [0.06, 0.26], [0.17, 0.12], [0.23, -0.05], [0.2, -0.22], [0.1, -0.32], [0, -0.34]].map(([r, yy]) => new THREE.Vector2(r, yy)); const meat = add(new THREE.Mesh(new THREE.LatheGeometry(pts, 10), std(0x9a5a4a, { roughness: 0.6 }))); meat.position.set(x, top - len - 0.75, -1.4); const bone = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 5), std(0xe0d8c0))); bone.position.set(x, top - len - 0.2, -1.4); } break; }
      case 'cage': { const cy = Math.min(top - 2.2, y + 4.2), len = top - cy - 1; add(chain(0x9a9590, 0.3, len, x, top - len / 2, -1.3)); const c = add(new THREE.Group()); c.position.set(x, cy, -1.3); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2, 5), IRON); bar.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7); c.add(bar); } for (const ry of [-0.5, 0.4]) c.add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.03, 5, 20), IRON).rotateX(Math.PI / 2).translateZ(-ry)); if (Math.round(x) % 2) { const sk = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), std(0x5e5a50, { roughness: 0.95 })); sk.position.set(0.1, -0.82, 0); c.add(sk); } add(new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 10), IRON)).position.set(x, cy + 1.25, -1.3); add(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 10), IRON)).position.set(x, cy - 1, -1.3); room.anim.push(t => { c.rotation.y = Math.sin(t * 0.5 + x) * 0.3; }); break; }
      case 'pews': if (p.face) { const pw = tm(['oak_planks', X, 0x8a6a50]), d = p.face; for (let i = 0; i < 4; i++) { const px = x + (i - 1.5) * 1.15; add(wbox(pw, px - 0.24, y + 0.42, px + 0.24, y + 0.48, -3.0, -0.9)); add(wbox(pw, px - d * 0.28 - 0.04, y, px - d * 0.28 + 0.04, y + 1.05, -3.0, -0.9)); const end = new THREE.Shape([[-0.32, 0], [0.32, 0], [0.32, 0.55], [0, 0.95], [-0.32, 1.1]].map(([a, c]) => new THREE.Vector2(a * d, c))); const eg = new THREE.ExtrudeGeometry(end, { depth: 0.07, bevelEnabled: false }); eg.translate(px, y, -0.97); worldUV(eg); add(new THREE.Mesh(eg, pw)).castShadow = true; } break; } else { const pw = tm(['pv_dark_walnut', X]); for (let i = 0; i < 3; i++) { const px = x + i * 2.2 - 2.2; add(wbox(pw, px - 0.95, y + 0.44, px + 0.95, y + 0.5, -2.75, -2.3)); add(wbox(pw, px - 0.95, y + 0.55, px + 0.95, y + 1.15, -2.82, -2.76)); for (const ex of [-0.98, 0.98]) { add(wbox(pw, px + ex - 0.04, y, px + ex + 0.04, y + 1.25, -2.85, -2.25)); const fin = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), pw)); fin.position.set(px + ex, y + 1.36, -2.8); } } break; }
      case 'throne': { const cl = add(plane(new THREE.MeshStandardMaterial({ map: (() => { const t = texture(P3 + 'red_damask_c.webp').clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3.2); t.needsUpdate = true; return t; })(), roughness: 0.95, color: 0xb09090 }), 4.2, Math.min(7, top - y - 0.6), x, y + Math.min(7, top - y - 0.6) / 2, ZB + 0.12)); add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 8), BRASS)).position.set(x, y + Math.min(7, top - y - 0.6), ZB + 0.18); const m = surface('oxblood_marble', 1, 1, { dir: X }); add(box(m, x - 3, y, x + 3, y + 0.6, ZB + 0.1, ZB + 3)); add(box(m, x - 1, y + 0.6, x + 1, y + 1.4, ZB + 0.5, ZB + 2)); add(box(m, x - 1, y + 1.4, x + 1, y + 5, ZB + 0.3, ZB + 0.7)); add(box(BRASS, x - 1.15, y + 4.9, x + 1.15, y + 5.2, ZB + 0.25, ZB + 0.75)); for (const dx of [-1, 1]) add(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 6), BRASS)).position.set(x + dx * 0.95, y + 5.6, ZB + 0.5); break; }
      case 'gatearch': if (room.kit || (room.kit = await castleKit())) { // the barbican stands ACROSS the road at the room's east end, its face to the pilgrim: he walks in under its arch
        const gx = room.b.x1 - 0.3; kitPiece(room, room.kit, 'gatehouse', { stone: tm(['castle_stone', P3], true), trim: tm(DRESS, true, 0.6), tunnel: tm(['ashlar', T0, 0x2a2a32], true), dark: std(0x1c1a18, { metalness: 0.3, roughness: 0.85 }), glow: GLOW, glowdim: new THREE.MeshBasicMaterial({ color: 0x6a3a18, fog: false }), roof: tm(['slate_roof', X], true) }, gx, y, 0, 1, 1, 1, -Math.PI / 2);
        this.torch(room, gx - 1.25, y + 3.4, -2.75); this.light(room, gx - 2.2, y + 3.2, 1.2, 0xffa860, 8, 7);
        { const sp = plane(new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xff8a40, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }), 4.2, 3.4, gx - 2.2, y + 0.03, 0); sp.rotation.x = -Math.PI / 2; add(sp); } break; } else { const m = surface('ashlar', 2, 4); add(box(m, x - 4, y, x - 2.2, y + 11, -3.2, 0.2)); add(box(m, x + 0.1, y, x + 2.2, y + 11, -3.2, 0.2)); add(box(m, x - 4, y + 5.2, x + 2.2, y + 7, -3.2, 0.2)); for (let i = 0; i < 4; i++) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.4, 4), m)); c.position.set(x - 3.1 + (i % 2) * 4.2, y + 12.2 + (i > 1 ? 3 : 0), -1.5); if (i > 1) c.scale.setScalar(0.5); } this.torch(room, x - 2.6, y + 3.0); break; }
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
      case 'fountain': { const fz = -1.5, ez = 0.6; // an oval basin (as wide as ever, shallower front to back) whose front stays behind the play plane (z -0.3): no x-rayed shins
        add(new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.7, 20).scale(1, 1, ez), stone)).position.set(x, y + 0.35, fz); add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 10), stone)).position.set(x, y + 1.4, fz); add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.3, 0.3, 14), stone)).position.set(x, y + 2.5, fz); const w = add(new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.05, 20).scale(1, 1, ez), new THREE.MeshStandardMaterial({ color: 0x2a6a7a, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.8 }))); w.position.set(x, y + 0.66, fz); add(sprite(glowTex(), 0x6ab0d0, 2.4, 3, x, y + 1.8, fz, 0.25)); break; }
      case 'grave': { const gm = surface('limestone_1', 0.5, 0.5, { tint: 0x7a7a80 }), h = 1.0 + (Math.round(x) % 3) * 0.2; const sl = add(box(gm, x - 0.35, y, x + 0.35, y + h, -2.6, -2.4)); sl.rotation.z = rnd(-0.08, 0.08); const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12, 1, false, 0, Math.PI), gm)); cap.rotation.x = Math.PI / 2; cap.rotation.y = Math.PI / 2; cap.position.set(x, y + h, -2.5); break; }
      case 'organ': { for (let i = 0; i < 13; i++) { const h = 2 + Math.sin(i / 12 * Math.PI) * 3.4; add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, h, 8), BRASS)).position.set(x - 2.1 + i * 0.35, y + 1.2 + h / 2, ZB + 0.4); } add(box(surface('pv_dark_walnut', 1, 1, { dir: X }), x - 2.4, y, x + 2.4, y + 1.2, ZB + 0.1, ZB + 1.2)); add(box(WAX, x - 1.2, y + 1.2, x + 1.2, y + 1.28, ZB + 0.8, ZB + 1.25)); break; }
      case 'bigbell': { const k = await loadGLTF('assets/game/items/bells.glb'), src = k.scene.getObjectByName('bell_tenor'), cy = Math.min(top - 2.2, y + 5); if (src) { const m = src.clone(); const piv = new THREE.Group(); piv.position.set(x, cy + 1.6, -1.6); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1); piv.add(m); const bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()), sc = 2.4 / Math.max(sz.x, sz.y, sz.z); m.scale.setScalar(sc); const b2 = new THREE.Box3().setFromObject(m); m.position.y -= b2.max.y - piv.position.y; m.position.x -= (b2.min.x + b2.max.x) / 2 - piv.position.x; m.position.z -= (b2.min.z + b2.max.z) / 2 - piv.position.z; m.traverse(o => { if (o.isMesh) o.castShadow = true; }); add(piv); room.anim.push(t => { piv.rotation.z = Math.sin(t * 0.8 + x) * 0.07; }); }
        add(box(surface('adzed_beam', 1, 0.5, { dir: X }), x - 1.8, cy + 1.6, x + 1.8, cy + 1.95, -1.85, -1.35)); break; }
      case 'trophy': { /* an antlered stag skull on an oak shield */ const oak = std(0x4a2e18, { roughness: 0.7 }), bn = std(0xd8ccb0, { roughness: 0.6 }), yy = Math.min(top - 1.6, y + (p.h ?? 3.4)), z = ZB + 0.15;
        const sh = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 20), oak)); sh.rotation.x = Math.PI / 2; sh.position.set(x, yy, z); sh.scale.set(1, 1, 1.3);
        const sk = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bn)); sk.scale.set(0.85, 1.2, 0.9); sk.position.set(x, yy + 0.02, z + 0.22); const sn = add(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 8), bn)); sn.rotation.x = Math.PI; sn.position.set(x, yy - 0.3, z + 0.3);
        const ant = (x0, y0, ang, len, d, sd) => { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018 + d * 0.01, 0.026 + d * 0.012, len, 5), bn)); c.position.set(x0 + Math.sin(ang) * len / 2, y0 + Math.cos(ang) * len / 2, z + 0.24); c.rotation.z = -ang; if (d > 0) { const ex = x0 + Math.sin(ang) * len, ey = y0 + Math.cos(ang) * len; ant(ex, ey, ang + sd * 0.55, len * 0.72, d - 1, sd); ant(ex, ey, ang - sd * 0.3, len * 0.55, d - 1, sd); } };
        for (const sd of [-1, 1]) ant(x + sd * 0.13, yy + 0.2, sd * 0.55, 0.5, 2, sd); break; }
      case 'spears': { /* crossed boar spears with their lugs */ const ash = std(0x6a4a2a, { roughness: 0.8 }), iron = std(0x5a5a60, { metalness: 0.8, roughness: 0.4 }), yy = Math.min(top - 2, y + 3.2), z = ZB + 0.1;
        for (const sd of [-1, 1]) { const g2 = new THREE.Group(); g2.position.set(x, yy, z); g2.rotation.z = sd * 0.62; const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.6, 6), ash); g2.add(sh); const bl = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.5, 4), iron); bl.position.y = 1.55; bl.scale.z = 0.3; g2.add(bl); const lug = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), iron); lug.position.y = 1.22; g2.add(lug); add(g2); } break; }
      case 'frame': { /* an oversized gilt frame, empty, its hooks bent outward */ const gilt = std(0x8a6a2a, { metalness: 0.75, roughness: 0.35 }), w2 = 3.4, h2 = 2.6, yy = Math.min(top - h2 / 2 - 0.4, y + 3.4), z = ZB + 0.1;
        add(box(std(0x0a0806, { roughness: 1 }), x - w2 / 2, yy - h2 / 2, x + w2 / 2, yy + h2 / 2, z - 0.02, z)); for (const [a, b2, c, d] of [[-w2 / 2, h2 / 2 - 0.16, w2 / 2, h2 / 2], [-w2 / 2, -h2 / 2, w2 / 2, -h2 / 2 + 0.16], [-w2 / 2, -h2 / 2, -w2 / 2 + 0.16, h2 / 2], [w2 / 2 - 0.16, -h2 / 2, w2 / 2, h2 / 2]]) add(box(gilt, x + a, yy + b2, x + c, yy + d, z, z + 0.12));
        for (const sd of [-1, 1]) { const hk = add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 6, 10, Math.PI * 1.2), iron2())); hk.position.set(x + sd * (w2 / 2 - 0.35), yy + h2 / 2 + 0.1, z + 0.16); hk.rotation.z = sd * 1.1; } break; }
      case 'pelt': { /* a fur thrown over the gallery rail */ const fur = std(0x5a4030, { roughness: 1 }); add(box(fur, x - 0.8, y - 1.1, x + 0.8, y + 0.04, 0.55, 0.62)); add(box(std(0x3a2a1e, { roughness: 1 }), x - 0.5, y - 0.6, x + 0.3, y + 0.04, 0.62, 0.66)); break; }
      case 'crystal': { const col = room.def.theme === 'frost' ? 0xbfe8ff : [0x8a6aff, 0x4ad0e0, 0xff5a8a][Math.abs(Math.round(x)) % 3], cm = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: room.def.theme === 'frost' ? 0.4 : 0.7, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.9 }); for (let i = 0; i < 5; i++) { const c = add(new THREE.Mesh(new THREE.OctahedronGeometry(rnd(0.18, 0.4)), cm)); c.scale.y = rnd(1.6, 3); c.position.set(x + rnd(-0.6, 0.6), y + rnd(0.3, 0.8), rnd(-2.6, -1.6)); c.rotation.z = rnd(-0.5, 0.5); } add(sprite(glowTex(), col, 3, 3, x, y + 0.8, -2, 0.35)); this.light(room, x, y + 1.2, -1, col, 9, 9); break; }
      case 'stalactite': for (let i = 0; i < 5; i++) { const h = rnd(0.6, 2.2), c = add(new THREE.Mesh(new THREE.ConeGeometry(rnd(0.12, 0.3), h, 6), room.def.theme === 'frost' ? (this._ice ||= std(0xd8f2ff, { emissive: 0x2a5a78, roughness: 0.15, transparent: true, opacity: 0.75 })) : stone)); /* frost hangs ice, not stone */ c.rotation.x = Math.PI; c.position.set(x + rnd(-1.2, 1.2), ceil - h / 2, rnd(-2.8, 0.5)); } break;
      case 'pipe': { const pm = surface('heavy_rust', 2, 0.5, { dir: X, rough: 0.6 }), py = Math.min(top - 1, y + 3.4); const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 6, 10), pm)); c.rotation.z = Math.PI / 2; c.position.set(x, py, ZB + 0.5); for (const dx of [-2.6, 0, 2.6]) add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 5, 12), IRON)).rotateY(Math.PI / 2).position.set(x + dx, py, ZB + 0.5); break; }
      case 'web': add(plane(decal('cobweb', 0xd8d8e0, 0.5), 3.2, 3.2, x, ceil - 1.6, ZB + 0.3)); break;
      case 'telescope': { const tb = add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 10), BRASS)); tb.rotation.z = -0.9; tb.position.set(x, y + 2.3, -1.8); for (const a of [-0.35, 0.35]) { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 5), IRON)); l.rotation.z = a; l.position.set(x - Math.sin(a) * 0.9, y + 0.9, -1.8); } break; }
      case 'orrery': { const grp = new THREE.Group(); grp.position.set(x, Math.min(top - 2.5, y + 3), -1.6); grp.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), new THREE.MeshStandardMaterial({ color: 0xffc050, emissive: 0xff9020, emissiveIntensity: 1 }))); const rings = []; for (let i = 0; i < 3; i++) { const r = new THREE.Group(); r.add(new THREE.Mesh(new THREE.TorusGeometry(0.9 + i * 0.5, 0.025, 5, 40), BRASS)); const pl = new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.03, 8, 8), std([0x6a90ff, 0xc06a4a, 0x9ad0a0][i])); pl.position.x = 0.9 + i * 0.5; r.add(pl); r.rotation.x = 1.2 + i * 0.25; grp.add(r); rings.push(r); } add(grp); add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, grp.position.y - y, 6), BRASS)).position.set(x, (grp.position.y + y) / 2, -1.6); room.anim.push(t => rings.forEach((r, i) => { r.rotation.z = t * (0.7 - i * 0.18); })); this.light(room, x, grp.position.y, -0.6, 0xffc060, 9, 9); break; }
      case 'anvil': add(box(IRON, x - 0.5, y + 0.6, x + 0.6, y + 0.9, -2.2, -1.7)); add(box(IRON, x - 0.2, y + 0.3, x + 0.2, y + 0.6, -2.1, -1.8)); add(box(wood, x - 0.35, y, x + 0.35, y + 0.3, -2.3, -1.6)); break;
      case 'furnace': { const bm = surface('pv_hearth_brick', 1, 1, { dir: X }); add(box(bm, x - 1.7, y, x + 1.7, y + 3.4, ZB + 0.05, ZB + 1.5)); add(box(bm, x - 0.9, y + 3.4, x + 0.9, Math.min(top, y + 7), ZB + 0.05, ZB + 1.1)); add(plane(new THREE.MeshBasicMaterial({ map: lavaTex(), color: 0xffb060 }), 1.6, 1.3, x, y + 1.0, ZB + 1.52)); add(sprite(glowTex(), 0xff6a20, 5, 4, x, y + 1.1, ZB + 1.8, 0.5)); this.light(room, x, y + 1.3, -0.6, 0xff6a20, 18, 12); break; }
      case 'rubble': for (let i = 0; i < 9; i++) { const s = rnd(0.2, 0.7), r = add(box(stone, 0, 0, s, s * rnd(0.5, 1), 0, s)); r.position.set(x + rnd(-1.4, 1.4), y + s * 0.3, rnd(-3.0, -1.7)); r.rotation.set(rnd(0, 1), rnd(0, 3), rnd(0, 1)); } break;
      case 'altar': { if (p.steps) { const sm = tm(DRESS, false, 0.6); for (let i = 0; i < p.steps; i++) add(wbox(sm, x - 2.6 + i * 0.4, y + i * 0.2 - 0.2, x + 2.6 - i * 0.4, y + (i + 1) * 0.2 - 0.2, -3.3 + i * 0.25, -0.6 - i * 0.25)); } const m = p.style === 'bone' ? tm(['bone_ashlar', P3]) : surface('mausoleum_marble', 1, 1, { dir: X, tint: p.style === 'drowned' ? 0x8a98a0 : undefined }); add(box(m, x - 1.5, y, x + 1.5, y + 1.0, -2.8, -1.6)); add(box(std(p.style === 'bone' ? 0xb8a878 : p.style === 'drowned' ? 0x3a4a58 : 0x7a1018, { roughness: 0.9 }), x - 1.0, y + 1.0, x + 1.0, y + 1.03, -2.85, -1.5)); if (p.style === 'drowned') add(box(std(0x2a4a2a, { roughness: 1 }), x - 1.52, y, x + 1.52, y + 0.22, -2.82, -1.58)); /* yellowed linen for bones; a sodden cloth and an algae line in the choir */ for (const dx of [-1.1, 1.1]) { if (p.style === 'bone') { const bn = std(0xa89c80, { roughness: 0.8 }), sk = add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), bn)); sk.scale.set(0.9, 1, 1.15); sk.position.set(x + dx, y + 1.18, -2.2); for (const ex of [-0.05, 0.05]) add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), std(0x0a0806))).position.set(x + dx + ex, y + 1.2, -2.06); /* eye sockets */ add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.18), bn)).position.set(x + dx, y + 1.05, -2.12); continue; } add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 6), BRASS)).position.set(x + dx, y + 1.3, -2.2); if (p.style !== 'drowned') add(sprite(flameTex(), 0xffb050, 0.14, 0.24, x + dx, y + 1.75, -2.2)); } /* skulls stand watch on a bone altar; the drowned candles are long out */ this.light(room, x, y + 1.9, -1.4, 0xffa860, 7, 8); break; }
      case 'arch': { const h = Math.min(6, top - y - 0.6); for (const dx of [-2.2, 2.2]) add(box(stone, x + dx - 0.35, y, x + dx + 0.35, y + h - 2.2, ZB + 0.05, ZB + 0.8)); const a = add(new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.35, 6, 20, Math.PI), stone)); a.position.set(x, y + h - 2.2, ZB + 0.42); break; }
      case 'column': if (!(room.pillarX || []).some(px => Math.abs(px - x) < 0.9)) { room.kit ||= await castleKit(); room.slots ||= this.kitSlots(room); this.kitPier(room, x, y, Math.min(top - 0.2, y + 6.5), 0.8); } break;
      case 'waterfall': { const h = Math.min(top - y, 14); add(plane(fxMat(FALL_FS, { uS: { value: new THREE.Vector2(2.2, h) } }, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 2.2, h, x, y + h / 2, ZB + 0.3));
        add(sprite(glowTex(), 0xe8f6ff, 2.4, 0.9, x, y + 0.25, ZB + 0.6, 0.45)); /* foam where it lands, mist rolling up off the plunge */ const mist = [0, 1, 2].map(i => add(sprite(glowTex(), 0xc8e0ea, 3, 2, x + (i - 1) * 0.8, y + 0.6, ZB + 0.8 + i * 0.3, 0)));
        room.anim.push(t => { for (let i = 0; i < 3; i++) { const m = mist[i], k = (t * 0.3 + i / 3) % 1; m.position.y = y + 0.3 + k * 1.8; m.scale.set(2.4 + k * 2.6, 1.4 + k * 1.6, 1); m.material.opacity = 0.28 * Math.sin(k * Math.PI); } }); this.light(room, x, y + 2, -1, 0x5ab0d0, 7, 9); break; }
      case 'mushroom': { // a cluster of glowing toadstools: the colour is in the caps' glow, held well under the bloom (dark bodies, dull stalks, the light set off them), so they never burn out white
        const col = [0x4ad0c0, 0x9a70ff, 0x70e060][Math.abs(Math.round(x)) % 3], cm = new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(0.25), emissive: col, emissiveIntensity: 0.45, roughness: 0.6 }), sm = fmat('mstem', () => std(0x6a6254, { roughness: 0.9 }));
        for (let i = 0; i < 6; i++) { const h = rnd(0.25, 1.1), cx = x + rnd(-0.9, 0.9), cz = rnd(-2.7, -1.5); add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, h, 6), sm)).position.set(cx, y + h / 2, cz); const cap = add(new THREE.Mesh(new THREE.SphereGeometry(0.1 + h * 0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cm)); cap.position.set(cx, y + h, cz); }
        add(sprite(glowTex(), col, 3, 2.4, x, y + 0.7, -2, 0.15)); this.light(room, x, y + 1.5, -0.4, col, 4, 8); break; }
    }
    for (let k = n0; k < g.children.length; k++) g.children[k].traverse(o => { if (o.isMesh) o.renderOrder = 2; });
    if (room.arcade && /altar|sarcophagus|throne|organ|statue|fountain|furnace|coffin|pews|bigbell|bookshelf/.test(p.t) && (room.pillarX || []).some(px => Math.abs(px - x) < 3.2)) {
      // forward, clear of the arcade's piers, but never so far that what stands in the walk band (floor to 2 m) comes in front of the hero's legs: its front stays behind z -0.3
      let front = -Infinity; const bb = new THREE.Box3();
      for (let k = n0; k < g.children.length; k++) { const c = g.children[k]; c.updateMatrixWorld(true); c.traverse(o => { if (!o.isMesh || o.material?.depthWrite === false) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); if (bb.max.y > y + 0.15 && bb.min.y < y + 2 && bb.max.z > front) front = bb.max.z; }); }
      const dz = Math.max(0, Math.min(1.0, -0.3 - front)); for (let k = n0; k < g.children.length; k++) g.children[k].position.z += dz; for (let k = s0; k < room.sources.length; k++) room.sources[k].z += dz; }
    else if (room.arcade && !/window|rose|column|arch/.test(p.t)) { for (let k = n0; k < g.children.length; k++) { const o = g.children[k]; if (o.position.z < ZB + 0.95) o.position.z += 0.55; } for (let k = s0; k < room.sources.length; k++) if (room.sources[k].z < ZB + 1.5) room.sources[k].z += 0.55; }
  }

  saveStatue(room, x, y) {
    const g = room.group, m = surface('marble', 1, 1, { dir: I, tint: 0xa08080 });
    g.add(box(m, x - 1.4, y, x + 1.4, y + 0.6, -2.6, -0.45)); // the plinth stops behind the play plane: the hero kneels in front of it, his shins never inside it
    g.add(box(std(0x3a0a10, { roughness: 0.35, metalness: 0.3, emissive: 0x200004 }), x - 1.1, y + 0.6, x + 1.1, y + 1.5, -2.0, -0.7));
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
    this.cam = cam; FXT.value = t;
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
// an antique looking-glass: silvering gone to smoke, candles burning in it, foxing round the edge, someone standing where no one is
function mirrorTex() { return _mirror ||= canvasTex(128, 256, x => { const g = x.createLinearGradient(0, 0, 128, 256); g.addColorStop(0, '#4a5270'); g.addColorStop(0.35, '#1a1e2e'); g.addColorStop(0.6, '#262c44'); g.addColorStop(1, '#5c6488'); x.fillStyle = g; x.fillRect(0, 0, 128, 256);
  x.globalAlpha = 0.2; x.fillStyle = '#d8e0ff'; for (const [a, w2] of [[20, 26], [72, 8]]) { x.beginPath(); x.moveTo(a - 30, 256); x.lineTo(a + 40, 0); x.lineTo(a + 40 + w2, 0); x.lineTo(a - 30 + w2, 256); x.fill(); } x.globalAlpha = 1;
  for (const [px, py] of [[30, 150], [96, 122], [60, 206]]) { const c = x.createRadialGradient(px, py, 0, px, py, 14); c.addColorStop(0, 'rgba(255,200,120,.75)'); c.addColorStop(1, 'rgba(255,160,60,0)'); x.fillStyle = c; x.fillRect(px - 14, py - 14, 28, 28); }
  x.fillStyle = 'rgba(8,8,16,.5)'; x.beginPath(); x.ellipse(70, 186, 17, 50, 0, 0, 7); x.fill(); x.beginPath(); x.arc(70, 122, 12, 0, 7); x.fill();
  for (let i = 0; i < 90; i++) { const e = Math.random() < 0.5, px = e ? (Math.random() < 0.5 ? Math.random() * 14 : 114 + Math.random() * 14) : Math.random() * 128, py = e ? Math.random() * 256 : (Math.random() < 0.5 ? Math.random() * 16 : 240 + Math.random() * 16); x.fillStyle = `rgba(${30 + Math.random() * 40 | 0},${24 + Math.random() * 30 | 0},16,${0.3 + Math.random() * 0.4})`; x.beginPath(); x.arc(px, py, 1 + Math.random() * 4, 0, 7); x.fill(); } }); }
let _mirM, _gilt; const GILT = () => _gilt ||= new THREE.MeshStandardMaterial({ color: 0xa07a34, metalness: 0.75, roughness: 0.36, envMap: ENV, envMapIntensity: 1.2, emissive: 0x1a1206 });
// Oil portraits for the galleries, painted once per sitter in the dark manner: an umber ground warmest behind the head, a bust turned
// three-quarters (each head a little more or less, up to 15° either way) and lit hard from the upper left. The head is about a fifth of
// the canvas with the eye line a third of the way down, over a short neck and shoulders out to the frame in dark clothes (a ruff, a
// falling band, a fur gown and a chain of office, a gorget or a standing lace collar). Open eyes with a catchlight, the nose casting its
// shadow, beards and wimples worked into the skin with strokes (never a pale cut-out); brushwork, a yellowed varnish going dark at the
// edges and a faint craquelure. 0-5 nobles (1 and 5 women), 6-8 saints on dull gold under a painted arch.
const _por = [], _porM = []; const portraitMat = k => _porM[k] ||= new THREE.MeshStandardMaterial({ map: portraitTex(k), roughness: 0.45, emissive: 0x2c2822, emissiveMap: portraitTex(k) });
function portraitTex(k) { return _por[k] ||= canvasTex(LOW_MEM ? 160 : 256, LOW_MEM ? 200 : 320, (x, W, H) => {
  let sd = 7 + k * 977; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647, R = (a, b) => a + r() * (b - a), S = W / 100, saint = k >= 6, kind = saint ? k - 6 : k, woman = k === 1 || k === 5 || k === 7, hood = saint && kind < 2;
  const f = k % 2 ? 1 : -1, L = -f, cx = 50 - f * 3, hy = 44, Z = 1.1, NB = 2.5; // f: the way the sitter turns (+1 to our right, with room left in front of the face); L: the light's side in the sitter's own space (it always falls from our upper left); Z: the sitter's scale (the head ~1/5 of the canvas, the eyes 0.33 down); NB: how far the shoulders sit up under the head (a short neck)
  const tr = [0.55, -0.8, 0.25, -0.45, 0.9, -0.15, -0.65, 0.4, 0.8][k], gz = [-0.14, 0.08, -0.2, 0.1, -0.1, -0.16, 0, -0.06, 0.12][k]; // tr: the head turned off three-quarters (±1 = ±15°, + toward profile); gz: where the eyes look along their width
  const cs = () => x.setTransform(S, 0, 0, S, 0, 0), ls = () => x.setTransform(f * S * Z, 0, 0, S * Z, cx * S, hy * S), lb = () => { ls(); x.translate(0, -NB); }; // the canvas as 100 x 125 / the sitter's space: head at the origin, +x the way they face / the body, raised under it
  const ft = () => { x.translate(2.5 + tr * 1.5, 0); x.scale(1 - tr * 0.1, 1); x.translate(-2.5, 0); }; // the face's features slid round the skull by the turn (and foreshortened a little)
  const grad = (gr, st) => { st.forEach((c, i) => gr.addColorStop(i / (st.length - 1), c)); return gr; }, RG = (px, py, r0, r1, st) => grad(x.createRadialGradient(px, py, r0, px, py, r1), st), LG = (x0, y0, x1, y1, st) => grad(x.createLinearGradient(x0, y0, x1, y1), st);
  const fill = (c, path) => { x.fillStyle = c; if (path) path(); x.fill(); }, rect = c => { x.fillStyle = c; x.fillRect(-200, -200, 400, 400); }, blob = (px, py, rx, ry, c) => { x.beginPath(); x.ellipse(px, py, rx, ry, 0, 0, 7); fill(c); };
  const soft = (px, py, rr, c) => { x.fillStyle = RG(px, py, 0, rr, [c, c.replace(/[\d.]+\)$/, '0)')]); x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }; // a soft round glaze
  const line = (c, w, ...p) => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 4) x.quadraticCurveTo(p[i], p[i + 1], p[i + 2], p[i + 3]); x.strokeStyle = c; x.lineWidth = w; x.stroke(); };
  const shape = (...p) => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 6) x.bezierCurveTo(p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5]); x.closePath(); }; // a closed run of cubic curves
  const clipped = (path, paint) => { x.save(); path(); x.clip(); paint(); x.restore(); }, shade = (w, a = 0.45) => rect(LG(L * w * 0.2, 0, -L * w, 0, ['rgba(12,6,2,0)', `rgba(12,6,2,${a})`])); // the side turned from the light
  const skin = woman ? ['#f4dcc0', '#d0a684', '#7a5038', '#24150c'] : k === 2 || k === 6 ? ['#e6c6a0', '#b6865c', '#5c361e', '#1a0e07'] : ['#eecca2', '#c28c60', '#683a20', '#1c0e06'];
  const cloth = saint ? ['#5a1412', '#16224e', '#33291a'][kind] : ['#16110e', '#1c1016', '#241612', '#10131e', '#151414', '#22100f'][k], hc = saint ? ['#a49b8a', '#3a2414', '#2a1c12'][kind] : ['#22160d', '#5a2e16', '#b2a998', '#2e1c10', '#4c4640', '#6a4c2c'][k], hrgb = [1, 3, 5].map(i => parseInt(hc.slice(i, i + 2), 16)).join(','); // (the white beards a warm grey, so they sit in the skin's value range)
  const hair = (path, ox = 1, oy = -12.5) => { fill(hc, path); clipped(path, () => { rect(RG(ox + L * 4, oy + 3, 0, 11, ['rgba(255,232,196,.24)', 'rgba(255,232,196,0)'])); for (let i = 0; i < 26; i++) { const a = R(0.15, 2.99), l = R(6, 22); line(i % 2 ? 'rgba(0,0,0,.28)' : 'rgba(255,236,210,.12)', R(0.25, 0.6), ox, oy, ox - Math.cos(a) * l * 0.55, oy + Math.sin(a) * l * 0.25, ox - Math.cos(a) * l, oy + Math.sin(a) * l); } shade(10); }); };
  x.lineCap = 'round'; cs();
  rect(saint ? RG(50, 30, 4, 90, ['#7e602e', '#4e3a18', '#1e150a']) : RG(cx - 12, 34, 2, 92, [['#46321e', '#1e140b', '#070504'], ['#3e3022', '#1a120a', '#060403'], ['#38341e', '#17150b', '#050503'], ['#46281c', '#1e100a', '#070303'], ['#34302a', '#151311', '#050404'], ['#42301f', '#1b120a', '#060403']][k])); // the ground
  if (saint) { fill('#1c1208', () => { x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 44); x.quadraticCurveTo(1, 8, 50, 5); x.quadraticCurveTo(99, 8, 100, 44); x.lineTo(100, 0); x.closePath(); }); // a painted arch over the gold, punched along its edge
    x.setLineDash([0.5, 1.3]); line('rgba(80,54,18,.8)', 0.6, 2.6, 44, 3.4, 10.5, 50, 8, 96.6, 10.5, 97.4, 44); x.setLineDash([]); }
  ls(); if (!saint && k % 3 !== 2) { const drape = () => { x.beginPath(); x.moveTo(-70, -50); x.lineTo(-17, -50); x.bezierCurveTo(-23, -24, -34, -2, -29, 18); x.bezierCurveTo(-26, 38, -34, 62, -40, 96); x.lineTo(-70, 96); x.closePath(); }; // a curtain behind the sitter's back
    fill(['#4a1210', '#183020', '', '#2a1638', '#3a2410'][k], drape); clipped(drape, () => { for (let i = 0; i < 8; i++) { const u = -68 + i * 6.5 + R(-2, 2); line(i % 2 ? 'rgba(0,0,0,.35)' : 'rgba(255,200,170,.1)', R(2, 4), u + 10, -50, u + 2 + R(-4, 4), 10, u + R(-6, 2), 96); } rect(LG(-17, 0, -70, 0, ['rgba(0,0,0,0)', 'rgba(0,0,0,.4)'])); }); }
  if (saint) { soft(-1, -3, 19, 'rgba(255,224,150,.3)'); x.beginPath(); x.arc(-1, -3, 15, 0, 7); x.lineWidth = 1.2; x.strokeStyle = '#dcb866'; x.stroke(); x.beginPath(); x.arc(-1, -3, 13.4, 0, 7); x.lineWidth = 0.4; x.strokeStyle = 'rgba(96,64,22,.8)'; x.stroke(); // a tooled halo
    for (let i = 0; i < 44; i++) { const a = i / 44 * 6.283; blob(-1 + Math.cos(a) * 14.2, -3 + Math.sin(a) * 14.2, 0.3, 0.3, 'rgba(104,70,24,.85)'); } }
  lb(); const body = () => { x.beginPath(); x.moveTo(-6, 17); x.bezierCurveTo(-11, 18.5, -19, 19.5, -27, 22.5); x.bezierCurveTo(-36, 25.5, -43, 31, -47, 40); x.lineTo(-52, 96); x.lineTo(52, 96); x.lineTo(47, 40); x.bezierCurveTo(43, 31, 35, 25.5, 26, 22.5); x.bezierCurveTo(18, 19.5, 11, 18.5, 6, 17); x.closePath(); }; // shoulders out to the frame
  fill(cloth, body); clipped(body, () => { rect(RG(L * 20, 24, 0, 30, ['rgba(255,236,210,.24)', 'rgba(255,236,210,0)'])); line('rgba(255,232,204,.14)', 1.4, ...(L < 0 ? [-7, 17.5, -20, 19.6, -32, 24.5] : [7, 17.5, 19, 19.6, 30, 24.5])); // the shoulder catching the light, folds
    for (let i = 0; i < 11; i++) { const u = R(-46, 44); line(i % 2 ? 'rgba(0,0,0,.3)' : 'rgba(255,232,200,.07)', R(1.5, 3.5), u, R(26, 36), u + R(-6, 6), 60, u + R(-10, 10), 96); }
    if (k === 0 || k === 3) for (let y = 30; y < 74; y += 4.5) blob(6.5 + (y - 30) * 0.05, y, 0.65, 0.65, '#a88038'); // gilt buttons down the doublet
    if (k === 4) { line('rgba(146,28,26,.9)', 6, -24, 27, 0, 52, 30, 84); line('rgba(255,150,130,.16)', 1.8, -23, 26, 1, 50, 31, 82); } // a silk sash
    shade(48, 0.35); rect(LG(0, 32, 0, 72, ['rgba(0,0,0,0)', 'rgba(0,0,0,.6)'])); });
  if (k === 5) { const fan = () => shape(-9, 18, -18, 13, -22, 2, -19, -6, -12, -2, 9, -2, 15, -6, 17, 2, 14, 12, 8, 18); fill('rgba(226,218,200,.42)', fan); // a standing collar of wired lace
    clipped(fan, () => { for (let i = 0; i <= 16; i++) { const a = Math.PI * (0.92 + i / 16 * 1.16); line('rgba(240,232,214,.45)', 0.35, -1, 17, -1 + Math.cos(a) * 13, 17 + Math.sin(a) * 18, -1 + Math.cos(a) * 26, 17 + Math.sin(a) * 36); } shade(16, 0.4); });
    x.setLineDash([0.4, 0.9]); fan(); x.strokeStyle = 'rgba(244,238,224,.8)'; x.lineWidth = 0.8; x.stroke(); x.setLineDash([]); }
  ls(); if (k === 3) { hair(() => shape(2, -12.5, -8, -13.5, -12.5, -6, -12, 4, -11.5, 12, -13, 17, -10, 23, -8, 22, -6, 23, -4.5, 21, -6, 16, -6.2, 10, -6.4, 4, -4, -2, -1, -6, 2, -12.5)); hair(() => shape(7.5, -7, 10, -2, 10, 8, 8.5, 15, 7, 17, 5, 16, 4, 15, 4.5, 10, 6, 2, 7.5, -7)); } // long hair falling behind
  if (hood) fill(cloth, () => shape(7.4, -8, 10.6, -3, 10.6, 8, 8.4, 16, 7, 18, 5, 18, 4.4, 16, 4.8, 10, 6.6, 2, 7.4, -8)); // the far edge of the hood, behind the cheek
  const neck = () => shape(-6.4, 2, -6.6, 8, -6.8, 15 - NB, -7, 22 - NB, -2, 22 - NB, 2, 22 - NB, 5.2, 22 - NB, 4.6, 16 - NB, 4.2, 12, 3.6, 9); // (down to the raised collar line: a short neck)
  fill(LG(L * 7, 0, -L * 7, 0, [skin[1], skin[2]]), neck); clipped(neck, () => soft(0, 9, 9, 'rgba(24,12,6,.65)')); // the neck, in the jaw's shadow
  lb(); if (k === 5) { const chest = () => shape(-9, 17, -12, 24, -13, 28, -12, 31, -4, 34, 6, 33, 12, 29, 11, 24, 8, 19, 6, 17); fill(LG(L * 12, 14, -L * 12, 30, [skin[0], skin[1], skin[2]]), chest); clipped(chest, () => soft(-1, 17, 6, 'rgba(24,12,6,.4)')); // a low neckline, pearls and a ruby
    for (let i = 0; i <= 12; i++) { const t = i / 12; blob((1 - t) * (1 - t) * -7.5 + 2 * (1 - t) * t * -1 + t * t * 6, (1 - t) * (1 - t) * 20 + 2 * (1 - t) * t * 30 + t * t * 19.5, 0.55, 0.55, '#ece6da'); } blob(-1, 31.5, 1.3, 1.6, '#7a1418'); blob(-1.3, 31, 0.5, 0.5, 'rgba(255,220,200,.6)'); }
  if (k === 0) { soft(-1, 23, 15, 'rgba(0,0,0,.5)'); const ruff = () => { x.beginPath(); x.ellipse(-1, 19.5, 13.5, 4.4, 0, 0, 7); }; fill(LG(L * 13, 0, -L * 13, 0, ['#ece4d4', '#b4ac9c', '#4c463a']), ruff); // a millstone ruff
    clipped(ruff, () => { for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, c = Math.cos(a), s = Math.sin(a); line('rgba(58,50,40,.55)', 0.35, -1 + c * 5, 19.5 + s * 1.6, -1 + c * 9 + s * 1.5, 19.5 + s * 3, -1 + c * 13.5, 19.5 + s * 4.4); } }); }
  if (k === 1 || k === 3) { soft(-2, 30, 16, 'rgba(0,0,0,.35)'); const band = () => shape(-7, 17, -12, 19, -17, 22, -19, 27, -14, 32, -5, 33, 1.5, 30.5, 8, 33, 14, 30.5, 16, 26, 13, 21, 9, 18, 5, 17); // a falling band edged with lace
    fill(LG(L * 18, 0, -L * 18, 0, ['#ebe3d3', '#b8b0a0', '#5a5446']), band); line('rgba(70,62,50,.6)', 0.4, 3, 18, 2.4, 24, 1.5, 30.5);
    const E = [-19, 27, -13, 31.6, -5, 32.8, 1.5, 30.5, 8, 32.8, 14, 30.7, 16, 26]; for (let i = 0; i < 12; i += 2) for (let j = 0; j < 5; j++) { const px = E[i] + (E[i + 2] - E[i]) * j / 5, py = E[i + 1] + (E[i + 3] - E[i + 1]) * j / 5; blob(px, py, 0.9, 0.9, 'rgba(226,218,202,.7)'); blob(px, py - 0.2, 0.3, 0.3, 'rgba(60,52,40,.5)'); }
    if (k === 1) for (let i = 0; i <= 14; i++) { const t = i / 14; blob((1 - t) * (1 - t) * -13 + 2 * (1 - t) * t * -1 + t * t * 11, (1 - t) * (1 - t) * 33 + 2 * (1 - t) * t * 48 + t * t * 33, 0.6, 0.6, '#e6e0d4'); } } // and a rope of pearls
  if (k === 2) { for (const p of [[-8, 16, -15, 18, -22, 21, -27, 28, -33, 50, -38, 70, -42, 96, -34, 96, -26, 96, -18, 96, -16, 60, -12, 38, -7, 24], [5, 17, 11, 19, 18, 22, 22, 29, 28, 50, 33, 70, 38, 96, 31, 96, 24, 96, 17, 96, 14, 60, 11, 40, 6, 24]]) { // a gown faced with fur
      const fur = () => shape(...p); fill('#3e2c1e', fur); clipped(fur, () => { for (let i = 0; i < 140; i++) { const px = R(-42, 38), py = R(14, 96); line(i % 2 ? 'rgba(0,0,0,.3)' : 'rgba(210,180,140,.16)', 0.5, px, py, px + R(-1, 1), py + 1.2, px + R(-1.6, 1.6), py + R(1.8, 3.2)); } rect(RG(L * 24, 24, 0, 26, ['rgba(255,236,210,.16)', 'rgba(255,236,210,0)'])); rect(LG(0, 40, 0, 92, ['rgba(0,0,0,0)', 'rgba(0,0,0,.5)'])); }); }
    for (let i = 0; i <= 30; i++) { const t = i / 30, px = (1 - t) * (1 - t) * -14 + 2 * (1 - t) * t * 3 + t * t * 17, py = (1 - t) * (1 - t) * 22 + 2 * (1 - t) * t * 62 + t * t * 22; blob(px, py, i % 2 ? 1.1 : 0.7, i % 2 ? 0.7 : 1.1, '#94702a'); blob(px + L * 0.3, py - 0.3, 0.35, 0.35, 'rgba(255,230,150,.75)'); } // the chain of office
    x.beginPath(); x.arc(2.3, 43.5, 3.2, 0, 7); fill(RG(2.3 + L, 42.5, 0, 3.4, ['#f2d886', '#a8802e', '#4a3410'])); blob(2.3, 43.5, 1.2, 1.2, '#5a0e0e'); }
  if (k === 4) { const gor = () => shape(-15, 20, -8, 17, 10, 17, 16, 20, 14, 28, 8, 33, 0, 33, -8, 33, -14, 28, -15, 20); fill(LG(L * 15, 0, -L * 15, 0, ['#d6dae0', '#8a9098', '#26282c']), gor); // a steel gorget
    line('rgba(255,250,240,.35)', 0.5, -13, 27, 0, 37, 14, 27); for (const [px, py] of [[-10, 23], [11, 23], [0.5, 30.5]]) blob(px, py, 0.5, 0.5, '#d8c080'); }
  if (k === 8) { x.beginPath(); x.ellipse(-1, 19.5, 12.5, 4.6, 0, 0, 7); fill(LG(L * 12, 0, -L * 12, 0, ['#5a4a30', '#33291a', '#120e08'])); } // a monk's cowl
  ls(); if (k === 7) { const wim = () => { x.beginPath(); x.ellipse(-0.5, 1, 10.6, 14.2, 0, 0, 7); x.moveTo(-8, 6); x.bezierCurveTo(-8.5, 14, -10, 20, -9, 24); x.bezierCurveTo(-2, 27, 5, 26, 8, 23); x.bezierCurveTo(8.5, 16, 8, 10, 7.5, 6); x.closePath(); }; // a wimple: linen in shadow, folded, never a white mask
    fill(LG(L * 10, 0, -L * 10, 0, ['#bdb3a0', '#857d6e', '#36322b']), wim); clipped(wim, () => { for (let i = 0; i < 16; i++) { const a = R(-1, 1); line(i % 2 ? 'rgba(36,30,22,.38)' : 'rgba(236,226,206,.13)', R(0.5, 1.2), a * 9.5, R(-13, -2), a * 10.5 + R(-1, 1), R(6, 14), a * 9.5 + R(-1.5, 1.5), R(18, 27)); } // folds
      soft(1, 1, 12, 'rgba(24,14,8,.32)'); rect(LG(0, 8, 0, 27, ['rgba(0,0,0,0)', 'rgba(0,0,0,.5)'])); line('rgba(60,54,44,.45)', 0.5, -6, 16, 0, 19, 6, 15); }); }
  const head = () => shape(0, -11.5, -5.5, -11.5, -9.5, -7, -9, -1, -8.8, 3.5, -7.5, 7, -5, 9.5, -2.5, 11.8, 1.5, 12.2, 3.5, 11, 5.5, 9.5, 6.5, 6.5, 7.2, 3.5, 7.6, 1.5, 7.2, 0, 8.2, -2, 8.6, -6, 6.5, -11.5, 0, -11.5);
  fill(skin[1], head); clipped(head, () => { rect(RG(L * 5 + 1.5, -5, 1, 19, skin)); shade(9.5, 0.5); // the head, modelled from the light and turning into shadow
    if (hood) { rect(LG(-7.5, 0, -3, 0, ['rgba(10,5,2,.6)', 'rgba(10,5,2,0)'])); rect(LG(0, -9.5, 0, -5, ['rgba(10,5,2,.55)', 'rgba(10,5,2,0)'])); } // in the hood's shadow
    if (k === 7) rect(RG(0.5, 1, 6, 12.5, ['rgba(36,18,8,0)', 'rgba(36,18,8,.5)'])); // the wimple's shadow closing round the face: linen and skin grade together
    x.save(); ft(); // the features, turned with the head
    soft(-0.6, -1.4, 3, 'rgba(70,34,18,.42)'); soft(5.6, -1.5, 2.3, 'rgba(70,34,18,.48)'); soft(L > 0 ? 4 : -1.5, -6, 4.5, 'rgba(255,238,214,.22)'); soft(-2.4, 3.4, 3.6, 'rgba(196,84,62,.15)'); soft(6.4, 2.8, 1.8, 'rgba(196,84,62,.12)'); // sockets, brow, cheeks
    soft(L > 0 ? -4.2 : 7, 4.4, 3.2, 'rgba(48,22,10,.3)'); // the hollow under the cheekbone on the shadow side
    fill('rgba(64,30,14,.34)', () => { x.beginPath(); if (L > 0) { x.moveTo(3.6, -0.8); x.lineTo(4.9, 4.2); x.lineTo(2.8, 4.7); x.lineTo(2.9, 1.5); } else { x.moveTo(4.4, -0.8); x.lineTo(6.5, 3.6); x.lineTo(5.6, 4.8); x.lineTo(4.7, 2.4); } x.closePath(); }); // the nose: its shadow side, ridge, tip and nostril
    fill('rgba(52,22,10,.24)', () => { x.beginPath(); x.moveTo(4.3, -0.6); x.quadraticCurveTo(4.3 - L * 2.6, 2.2, 4.4 - L * 1.9, 5.3); x.lineTo(4.6, 5.0); x.closePath(); }); soft(4.4 - L * 1.3, 3.2, 1.8, 'rgba(52,22,10,.22)'); // and its shadow cast across the cheek away from the light
    line(`rgba(255,234,206,${L > 0 ? 0.32 : 0.16})`, 0.55, 3.7, -0.6, 4.6, 1.8, 5.4, 3.6); blob(5.3, 3.7, 0.5, 0.42, 'rgba(255,238,218,.5)'); blob(4.3, 5, 1.7, 0.55, 'rgba(56,24,12,.55)'); line('rgba(60,28,16,.5)', 0.35, 2.7, 4.8, 2.8, 4, 3.6, 4.1);
    const IR = ['#3a2616', '#4a3a20', '#2e2a26', '#3a4450', '#3a2a18', '#46382a', '#3a2a1a', '#4a4030', '#302418'][k];
    for (const [ex, er, far] of [[-0.6, 1.8 * (1 + tr * 0.05), 0], [5.6, 1.25 * (1 - tr * 0.25), 1]]) { // the eyes, open: a dimmed white, the iris under the lid's shadow, a catchlight, the lid's line and crease
      const ey = -2.3, tp = ey - 1.1, bt = ey + 0.8, ix = ex + er * gz * (far ? 1.4 : 1), iy = ey + 0.02 - (saint ? 0.28 : 0), ir = far ? 0.56 : 0.66, sq = far ? 0.78 : 1; // (saints look up)
      const lid = () => { x.moveTo(ex - er, ey + 0.08); x.bezierCurveTo(ex - er * 0.45, tp, ex + er * 0.4, tp, ex + er, ey - 0.12); }, alm = () => { x.beginPath(); lid(); x.bezierCurveTo(ex + er * 0.4, bt, ex - er * 0.45, bt, ex - er, ey + 0.08); x.closePath(); };
      fill('rgba(206,188,164,.9)', alm);
      clipped(alm, () => { blob(ix, iy, ir * sq, ir, IR); blob(ix, iy, ir * 0.44 * sq, ir * 0.44, '#0a0604'); rect(LG(0, tp + 0.1, 0, ey + 0.3, ['rgba(34,14,6,.78)', 'rgba(34,14,6,0)'])); rect(LG(ex + er * L, 0, ex - er * L, 0, ['rgba(40,20,10,0)', 'rgba(40,20,10,.38)'])); });
      blob(ix + L * ir * 0.38, iy - ir * 0.42, 0.24, 0.24, 'rgba(255,248,236,.92)'); // the catchlight, on the light's side
      x.beginPath(); lid(); x.strokeStyle = 'rgba(26,12,4,.92)'; x.lineWidth = 0.44; x.stroke(); line('rgba(72,34,16,.42)', 0.3, ex - er * 0.8, ey - 0.75, ex + er * 0.05, tp - 0.75, ex + er * 0.92, ey - 0.95); line('rgba(104,50,28,.4)', 0.26, ex - er * 0.85, ey + 0.25, ex, bt + 0.1, ex + er * 0.95, ey); }
    x.globalAlpha = 0.7; line(hc, 0.8, -3, -3.9, -0.8, -4.9, 1.7, -4.2); line(hc, 0.6, 4.5, -4.3, 5.8, -4.9, 7.3, -4); x.globalAlpha = 1; // brows
    const lip = woman ? 'rgba(168,58,50,' : 'rgba(136,66,50,'; blob(3.9, 6.2, 2, 0.5, lip + '.35)'); blob(3.8, 7.5, 1.9, 0.7, lip + '.5)'); line('rgba(66,26,18,.85)', 0.5, 1.2, 6.8, 3.8, 6.2, 6.4, 6.5); blob(3.6 + L * 0.3, 7.3, 1, 0.3, 'rgba(255,222,204,.22)'); blob(4, 8.6, 1.6, 0.45, 'rgba(40,20,10,.3)'); soft(4, 10.2, 2.2, 'rgba(255,230,204,.18)'); // mouth, chin
    x.restore(); x.save(); x.translate(tr * 1.1, 0); // the ear rides round with the turn too
    if (!hood && k !== 3) { blob(-6.6, 0.8, 1.4, 2.6, 'rgba(120,58,36,.45)'); line('rgba(60,26,14,.5)', 0.4, -6.2, -1.2, -7.4, 0.8, -6.4, 2.8); } x.restore(); }); // an ear
  // a beard grown out of the skin: thin over the cheek and full below, laid in with strokes and turned from the light (never a pale cut-out)
  const beard = (path, y0, y1) => clipped(path, () => { rect(LG(0, y0, 0, y0 + (y1 - y0) * 0.55, [`rgba(${hrgb},0)`, `rgba(${hrgb},.6)`, `rgba(${hrgb},.88)`]));
    for (let i = 0; i < 90; i++) { const px = R(-8, 8.5), py = R(y0, y1 - 1), a = Math.min(1, (py - y0) / (y1 - y0) * 1.6), sw = (px - 1) * 0.08; line(i % 3 ? `rgba(${hrgb},${(0.2 + a * 0.5).toFixed(2)})` : `rgba(28,16,8,${(0.15 + a * 0.25).toFixed(2)})`, R(0.18, 0.42), px, py, px + sw + R(-0.4, 0.4), py + 1.2, px + sw * 2 + R(-0.7, 0.7), py + R(2, 3.4)); }
    rect(LG(0, y1 - 5, 0, y1 + 1, ['rgba(20,12,6,0)', 'rgba(20,12,6,.4)'])); shade(9, 0.5); soft(4, 8.4, 2.4, 'rgba(30,16,8,.4)'); });
  x.save(); ft(); // the beard and moustache follow the mouth round
  if (k === 0) beard(() => shape(2.6, 8.2, 3.2, 10.5, 4, 12.5, 4.6, 14, 5, 12, 5.6, 10, 5.4, 8.2), 8, 14.5); // a pointed beard
  if (k === 2 || k === 6) { beard(() => shape(-6.8, 2, -7.2, 8, -3, 15.5, 3, 15.8, 6.4, 14.4, 7.8, 9, 7.2, 4, 5.6, 5.6, 4.5, 5, 4, 5.3, 2, 5.4, -1, 4.6, -3, 3.4, -4.5, 2.5, -6, 1.5, -6.8, 2), 1.5, 16); blob(3.9, 7.4, 1.4, 0.5, 'rgba(120,56,44,.5)'); line('rgba(40,16,10,.8)', 0.45, 2.2, 6.9, 3.9, 6.5, 5.6, 6.8); } // a full beard
  const mw = { 0: 0.9, 2: 1, 3: 0.55, 4: 1.1, 6: 1 }[k]; if (mw) { line(hc, mw, 4.2, 5.5, 2.4, 5.5, 0.6, 6.8); line(hc, mw * 0.8, 4.4, 5.5, 5.8, 5.4, 6.8, 6.4); if (k === 3) blob(4, 8.7, 0.6, 0.9, hc); } // moustaches
  x.restore();
  const cap = (a, b, c, d) => shape(7.4, -7, a, b, c, d, -9.8, -6.5, -10.6, -2.5, -10, 1.5, -8.9, 4, -8.9, 4, -7.4, 3.2, -7.4, 3.2, -7.6, 0, -6.6, -2.6, -5, -3.2, -3.5, -6.4, 1.5, -8.4, 7.4, -7); // hair from the hairline back over the crown
  if (k === 0 || k === 4) hair(() => cap(7.5, -12.5, -6, -14.5)); // cropped
  if (k === 8) hair(() => cap(4, -9.5, -5, -10.5), 1, -9); // a tonsure
  if (k === 3) hair(() => shape(7.4, -7, 7.5, -12.5, -6, -14.5, -10.2, -6, -11, 0, -10.5, 6, -8.5, 11, -8.5, 11, -6.2, 9.5, -6.2, 9.5, -6.6, 4, -5.8, -1, -4.8, -3.6, -3, -6.8, 2, -8.4, 7.4, -7)); // long locks over the ear
  if (k === 1 || k === 5) { hair(() => { x.beginPath(); x.ellipse(-10.6, -5, 3.6, 4, 0, 0, 7); }, -10.6, -9); hair(() => shape(7.6, -6.8, 7.5, -12.8, -6, -14, -9.8, -6, -10.4, -2, -9.6, 1.5, -8.2, 3, -8.2, 3, -6.2, 1, -6.2, 1, -6, -2, -5, -4.2, -3, -5.4, 0, -7.6, 4, -8, 7.6, -6.8)); line('rgba(0,0,0,.4)', 0.35, 2.6, -8, 1.8, -10.5, 0.6, -13); // drawn back into a knot
    if (k === 5) for (let i = 0; i <= 10; i++) { const t = i / 10; blob((1 - t) * (1 - t) * -9.4 + 2 * (1 - t) * t * -4 + t * t * 6.4, (1 - t) * (1 - t) * -4 + 2 * (1 - t) * t * -15 + t * t * -9.6, 0.45, 0.45, '#ece6da'); } else blob(-6.6, 4.4, 0.7, 0.9, '#e6e0d4'); } // pearls in her hair / at her ear
  if (k === 2) { hair(() => shape(-8.4, -7.5, -10.8, -4, -10.5, 2, -8.6, 5, -8.6, 5, -6.6, 3, -6.6, 3, -7.4, 0, -7.4, -4, -6.6, -7.5), -8, -8); fill('#0e0b0a', () => shape(-7, -9, -4.5, -14, 4.5, -14, 6.6, -9.6, 2, -11, -3, -11, -7, -9)); blob(L * 2, -12, 2.5, 0.8, 'rgba(255,240,220,.12)'); } // a white fringe, a skullcap
  if (hood) { const hd = () => shape(6.8, -8.8, 5, -14.5, -7, -16, -11.8, -8, -14, -2, -13.5, 8, -13, 15, -15, 20, -19, 23, -24, 27, -16, 25, -10, 24, -6.5, 22, -7, 12, -7.4, 4, -7, -2, -6.2, -7, -1, -10.2, 6.8, -8.8); fill(cloth, hd); // the mantle drawn up over the head
    clipped(hd, () => { rect(RG(L * 6, -10, 0, 16, ['rgba(255,236,210,.22)', 'rgba(255,236,210,0)'])); line('rgba(0,0,0,.35)', 1.2, -9, -12, -12, 2, -11, 16); line('rgba(255,230,200,.1)', 0.8, -4, -13, -10, -4, -9.5, 14); shade(12, 0.4); }); }
  cs(); if (!saint) { const tx = f > 0 ? 94 : 6; x.textAlign = f > 0 ? 'right' : 'left'; x.font = 'italic 3.4px Georgia, serif'; x.fillStyle = 'rgba(200,164,96,.5)'; x.fillText('ÆTATIS SVÆ ' + [34, 27, 71, 23, 45, 31][k], tx, 12); x.fillText('ANº ' + (1561 + k * 17), tx, 16.5); // the sitter's age and the year, in the corner they face
    if (k % 2 === 0) { const sx = f > 0 ? 90 : 10, sh = () => { x.beginPath(); x.moveTo(sx - 4, 21); x.lineTo(sx + 4, 21); x.lineTo(sx + 4, 26); x.quadraticCurveTo(sx + 4, 31, sx, 32.5); x.quadraticCurveTo(sx - 4, 31, sx - 4, 26); x.closePath(); }; // and arms
      fill(['#6a1a18', '', '#1c2c5c', '', '#24401e'][k], sh); clipped(sh, () => line('#a88438', 2.4, sx - 5, 20, sx, 26, sx + 5, 32)); sh(); x.strokeStyle = 'rgba(168,132,56,.7)'; x.lineWidth = 0.4; x.stroke(); } }
  rect(RG(cx - 4, 40, 8, 82, ['rgba(0,0,0,0)', 'rgba(0,0,0,.22)', `rgba(0,0,0,${saint ? 0.45 : 0.62})`])); // the dark closing in round the sitter
  x.setTransform(1, 0, 0, 1, 0, 0); const id = x.getImageData(0, 0, W, H), d = id.data, nz = new Float32Array(128 * 128).map(r), q = (i, j) => nz[(i & 127) + (j & 127) * 128]; // brushwork: strokes laid on the diagonal, a finer grain over them
  const vn = (u, v) => { const i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, s = a * a * (3 - 2 * a), t = b * b * (3 - 2 * b); return (q(i, j) * (1 - s) + q(i + 1, j) * s) * (1 - t) + (q(i, j + 1) * (1 - s) + q(i + 1, j + 1) * s) * t; };
  for (let py = 0, o = 0; py < H; py++) for (let px = 0; px < W; px++, o += 4) { const u = px / S, v = py / S, m = 0.9 + 0.2 * (vn((u * 0.82 + v * 0.57) / 1.1, (v * 0.82 - u * 0.57) / 7) * 0.7 + vn(u / 0.6, v / 0.6) * 0.3) + (r() - 0.5) * 0.05; d[o] *= m; d[o + 1] *= m; d[o + 2] *= m; }
  x.putImageData(id, 0, 0); cs(); x.globalCompositeOperation = 'multiply'; rect(RG(cx - 4, 38, 4, 86, ['#f8eacc', '#e6cc9c', '#b0905c', '#7a6038'])); x.globalCompositeOperation = 'source-over'; rect(LG(0, 0, 60, 70, ['rgba(255,240,214,.06)', 'rgba(255,240,214,0)'])); // yellowed varnish, darker to the edges, a dull sheen up top
  const gp = [], cr = []; for (let j = 0; j < 31; j++) for (let i = 0; i < 25; i++) gp.push(i * 4.2 + R(-1.6, 1.6), j * 4.2 + R(-1.6, 1.6)); // a faint craquelure: a broken net of hairline cracks, each with a lifted lip
  for (let a = 0; a < 775; a++) for (const b of [a % 25 < 24 ? a + 1 : -1, a < 750 ? a + 25 : -1]) if (b >= 0 && r() < 0.6) cr.push(gp[a * 2], gp[a * 2 + 1], (gp[a * 2] + gp[b * 2]) / 2 + R(-0.7, 0.7), (gp[a * 2 + 1] + gp[b * 2 + 1]) / 2 + R(-0.7, 0.7), gp[b * 2], gp[b * 2 + 1]);
  for (const [o, c] of [[0.25, 'rgba(255,236,204,.05)'], [0, 'rgba(14,8,3,.24)']]) { x.beginPath(); for (let i = 0; i < cr.length; i += 6) { x.moveTo(cr[i] + o, cr[i + 1] + o); x.lineTo(cr[i + 2] + o, cr[i + 3] + o); x.lineTo(cr[i + 4] + o, cr[i + 5] + o); } x.strokeStyle = c; x.lineWidth = 0.2; x.stroke(); } }); }
// soft black fade under the vault (the top ~7 m of a wall only: the storeys below stay lit)
function gradTex() { return _grad ||= canvasTex(4, 128, x => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(0,0,0,.78)'); g.addColorStop(0.2, 'rgba(0,0,0,.42)'); g.addColorStop(0.55, 'rgba(0,0,0,.1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 4, 128); }); }
// a light-well's shaft seen through its grille: near black at the bars, a faint cold light far up it (drawn unfogged)
let _well; function wellTex() { return _well ||= canvasTex(16, 64, x => { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#0b0f1a'); g.addColorStop(0.45, '#05070b'); g.addColorStop(1, '#020203'); x.fillStyle = g; x.fillRect(0, 0, 16, 64); }); }
// contact shadow for a masonry face: dark at the foot, a band under its cornice (alpha only, drawn black)
let _ao; function aoTex() { return _ao ||= canvasTex(4, 64, x => { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.035, 'rgba(0,0,0,.42)'); g.addColorStop(0.16, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); }); }
let _dial; function dialTex() { return _dial ||= canvasTex(512, 512, x => { const g = x.createRadialGradient(256, 256, 40, 256, 256, 256); g.addColorStop(0, '#f2e2b8'); g.addColorStop(0.75, '#c8a870'); g.addColorStop(1, '#3a2a14'); x.fillStyle = g; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill();
  x.strokeStyle = '#2a1c0c'; x.lineWidth = 6; for (const r of [244, 196, 120]) { x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); }
  x.fillStyle = '#20140a'; x.font = 'bold 44px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * Math.PI * 2; x.save(); x.translate(256 + Math.sin(a) * 220, 256 - Math.cos(a) * 220); x.rotate(a); x.fillText(n, 0, 0); x.restore(); });
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; x.beginPath(); x.moveTo(256 + Math.sin(a) * 196, 256 - Math.cos(a) * 196); x.lineTo(256 + Math.sin(a) * (i % 5 ? 184 : 170), 256 - Math.cos(a) * (i % 5 ? 184 : 170)); x.lineWidth = i % 5 ? 2 : 5; x.stroke(); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.sin(a) * 120, 256 - Math.cos(a) * 120); x.lineWidth = 3; x.stroke(); } }); }
// parted curtains: vertical folds in the cloth's colour, a fringed valance, gold tie-backs; the parting is cut out
const _drape = {}; function drapeTex(hex) { return _drape[hex] ||= canvasTex(128, 256, (x, W, H) => { const c = new THREE.Color(hex), rgb = k => `rgb(${Math.min(255, c.r * 255 * k) | 0},${Math.min(255, c.g * 255 * k) | 0},${Math.min(255, c.b * 255 * k) | 0})`;
  for (let i = 0; i < W; i++) { x.fillStyle = rgb(0.5 + 0.9 * Math.pow(Math.abs(Math.sin(i / W * Math.PI * 7)), 0.6)); x.fillRect(i, 0, 1, H); }
  x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(W * 0.5, H * 0.14); x.bezierCurveTo(W * 0.32, H * 0.32, W * 0.2, H * 0.62, W * 0.22, H); x.lineTo(W * 0.78, H); x.bezierCurveTo(W * 0.8, H * 0.62, W * 0.68, H * 0.32, W * 0.5, H * 0.14); x.fill(); x.globalCompositeOperation = 'source-over';
  x.fillStyle = rgb(0.75); x.fillRect(0, 0, W, H * 0.08); x.fillStyle = '#b8902e'; for (let i = 0; i < W; i += 4) x.fillRect(i, H * 0.08, 2, 6); x.fillRect(W * 0.1, H * 0.6, W * 0.14, 5); x.fillRect(W * 0.76, H * 0.6, W * 0.14, 5); }); }
// the starless dark: near-black violet, a faint smear of nebula, a few cold motes
let _void; function voidTex() { return _void ||= canvasTex(128, 128, x => { x.fillStyle = '#07050e'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 5; i++) { const px = Math.random() * 128, py = Math.random() * 128, g = x.createRadialGradient(px, py, 0, px, py, 40); g.addColorStop(0, 'rgba(70,30,120,.22)'); g.addColorStop(1, 'rgba(70,30,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${200 + Math.random() * 55 | 0},${190 + Math.random() * 40 | 0},255,${0.2 + Math.random() * 0.7})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + (Math.random() < 0.15), 1 + (Math.random() < 0.15)); } }); }
// a wash of light rising off a glowing floor: white, strongest at the foot
// the caps' freckles: soft pale spots scattered over the lathe (u round the cap, v from the rim in to the crown); black elsewhere
let _cspot; function capSpotTex() { return _cspot ||= canvasTex(128, 32, x => { x.fillStyle = '#000'; x.fillRect(0, 0, 128, 32); for (let i = 0; i < 46; i++) { const cx = Math.random() * 128, cy = 3 + Math.random() * 24, r = 0.8 + Math.random() * 1.8, g = x.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, 'rgba(160,255,230,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; for (const ox of [0, 128, -128]) { x.beginPath(); x.ellipse(cx + ox, cy, r * 1.6, r * 1.1, 0, 0, 7); x.fill(); } } }); }
// the giant stalks' flesh: fine vertical fibres in dun browns (0x2e2a22-0x3a3329) on 0x342e25, wrapped both ways (world UVs: ~0.67 x 2.5 m a tile)
let _fibre; function fibreTex() { if (_fibre) return _fibre; const C = ['46,42,34', '58,51,41', '50,44,36', '54,48,39', '42,38,30'];
  _fibre = canvasTex(64, 256, x => { x.fillStyle = '#342e25'; x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 120; i++) { const px = Math.random() * 64, y0 = Math.random() * 256, len = 50 + Math.random() * 200, sw = (Math.random() - 0.5) * 3; x.strokeStyle = `rgba(${C[i % 5]},${(0.4 + Math.random() * 0.5).toFixed(2)})`; x.lineWidth = 0.5 + Math.random() * 1.6;
      for (const ox of [0, -64, 64]) for (const oy of [0, -256]) { x.beginPath(); x.moveTo(px + ox, y0 + oy); x.quadraticCurveTo(px + ox + sw, y0 + oy + len / 2, px + ox + sw * 0.4, y0 + oy + len); x.stroke(); } } });
  _fibre.wrapS = _fibre.wrapT = THREE.RepeatWrapping; _fibre.repeat.set(1.5, 0.4); return _fibre; }
let _gill; function gillTex() { return _gill ||= canvasTex(64, 4, x => { x.fillStyle = '#24504a'; x.fillRect(0, 0, 64, 4); x.fillStyle = '#c8fff0'; for (let i = 0; i < 64; i += 2) x.fillRect(i, 0, 1, 4); }); } // the gills: fine radial ribs round a lathe
let _rise; function riseTex() { return _rise ||= canvasTex(4, 64, x => { const g = x.createLinearGradient(0, 64, 0, 0); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.35, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); }); }
// a heap of coin: overlapping gold discs with a lit rim and a dark edge (drawn wrapped, so it tiles)
let _coin; function coinTex() { return _coin ||= canvasTex(128, 128, x => { x.fillStyle = '#5a3a0a'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 140; i++) { const px = Math.random() * 128, py = Math.random() * 128, r = 5 + Math.random() * 4, sq = 0.5 + Math.random() * 0.5;
  for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) { const cx = px + ox, cy = py + oy; if (cx < -r || cx > 128 + r || cy < -r || cy > 128 + r) continue; const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.5, '#d8a030'); g.addColorStop(1, '#6a4008'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, r, r * sq, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(60,30,0,.7)'; x.lineWidth = 1; x.stroke(); } } }); }
// a planisphere: the night in lapis, its rings and hour ticks in gold, a few constellations drawn in
let _chart; function chartTex() { return _chart ||= canvasTex(256, 256, x => { const c = 128; let sd = 11; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647, g = x.createRadialGradient(c, c, 10, c, c, 128); g.addColorStop(0, '#1a2a5a'); g.addColorStop(1, '#0a1028'); x.fillStyle = g; x.beginPath(); x.arc(c, c, 128, 0, 7); x.fill();
  x.strokeStyle = 'rgba(200,170,90,.85)'; x.lineWidth = 1; for (const rr of [124, 106, 88, 50]) { x.beginPath(); x.arc(c, c, rr, 0, 7); x.stroke(); }
  for (let i = 0; i < 72; i++) { const a = i / 72 * 6.283, r0 = i % 6 ? 118 : 108; x.beginPath(); x.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); x.lineTo(c + Math.cos(a) * 124, c + Math.sin(a) * 124); x.stroke(); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; x.beginPath(); x.moveTo(c + Math.cos(a) * 88, c + Math.sin(a) * 88); x.lineTo(c + Math.cos(a) * 106, c + Math.sin(a) * 106); x.stroke(); x.fillStyle = '#c8a050'; x.beginPath(); x.arc(c + Math.cos(a + 0.26) * 97, c + Math.sin(a + 0.26) * 97, 2.5, 0, 7); x.fill(); }
  for (let i = 0; i < 160; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * 86; x.fillStyle = `rgba(230,235,255,${0.3 + r() * 0.7})`; x.fillRect(c + Math.cos(a) * d, c + Math.sin(a) * d, 1 + (r() < 0.1), 1 + (r() < 0.1)); }
  x.strokeStyle = 'rgba(160,190,255,.5)'; x.fillStyle = '#f0f0ff'; for (let k = 0; k < 7; k++) { let px = c + (r() - 0.5) * 130, py = c + (r() - 0.5) * 130; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 4; j++) { const nx = px + (r() - 0.5) * 44, ny = py + (r() - 0.5) * 44; if (Math.hypot(nx - c, ny - c) > 84) break; px = nx; py = ny; x.lineTo(px, py); x.fillRect(px - 1.5, py - 1.5, 3, 3); } x.stroke(); } }); }
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
