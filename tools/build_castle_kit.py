"""Castle Velscour architecture kit, modelled in Blender (headless).

    blender -b --python tools/build_castle_kit.py            (or: python -c "import bpy" env, see below)
    python tools/build_castle_kit.py                          (with the `bpy` wheel installed)

Writes assets/game/props/castle_kit.glb. Every piece faces the camera (Blender -Y = game +Z), sits with its origin
where the game places it (documented per piece), carries box-mapped UVs at 1 UV unit = 4 m (so the game's 4 m stone
textures tile at true scale with repeat 1), and a baked ambient-occlusion vertex colour ("Color").
Materials are placeholders named for the slot the game fills from the room's theme:
  stone (theme wall), trim (theme block / mouldings), dark (iron, lead), wood, glass, glow (lit windows), roof.
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'game', 'props', 'castle_kit.glb')
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
MATS = {}
def mat(name, col=(0.6, 0.6, 0.6)):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.diffuse_color = (*col, 1); MATS[name] = m
    return MATS[name]
for n, c in [('roseglow', (.6, .2, .2)), ('tunnel', (.25, .25, .27)), ('stone', (.55, .53, .5)), ('trim', (.62, .58, .52)), ('dark', (.08, .08, .09)), ('wood', (.25, .16, .1)),
             ('glass', (.3, .35, .5)), ('glow', (1, .7, .35)), ('roof', (.12, .13, .16))]: mat(n, c)

# ------------------------------------------------------------------------------------------------ helpers
def link(ob):
    SC.collection.objects.link(ob); return ob

def mesh_from_bm(name, bm, material='stone'):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me)); ob.data.materials.append(mat(material)); return ob

def join(name, obs):
    obs = [o for o in obs if o]
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active; ob.name = name; ob.data.name = name
    return ob

def apply(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

def convert(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.convert(target='MESH'); return bpy.context.view_layer.objects.active

def box(name, x0, y0, z0, x1, y1, z1, material='stone', bevel=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    if bevel > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES', profile=0.5)
    return mesh_from_bm(name, bm, material)

def cyl(name, x, y, z0, z1, r, seg=16, material='stone', r2=None):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0)
    for v in bm.verts: v.co += Vector((x, y, (z0 + z1) / 2))
    return mesh_from_bm(name, bm, material)

def lathe(name, prof, seg=16, material='stone', at=(0, 0, 0), sx=1.0, sy=1.0):
    """prof: [(r, z), ...] bottom to top; revolved around Z."""
    bm = bmesh.new(); rings = []
    for i in range(seg):
        a = i / seg * math.tau; rings.append([bm.verts.new((at[0] + math.cos(a) * r * sx, at[1] + math.sin(a) * r * sy, at[2] + z)) for r, z in prof])
    for i in range(seg):
        A, B = rings[i], rings[(i + 1) % seg]
        for k in range(len(prof) - 1): bm.faces.new((A[k], B[k], B[k + 1], A[k + 1]))
    bot = [r[0] for r in rings]; top = [r[-1] for r in rings]
    if prof[0][0] > 1e-4: bm.faces.new(list(reversed(bot)))
    if prof[-1][0] > 1e-4: bm.faces.new(top)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_from_bm(name, bm, material)

def profile_obj(name, pts):
    """A closed 2D profile curve (x = across the path, y = up from the path) for sweeps."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, (x, y) in zip(sp.points, pts): p.co = (x, y, 0, 1)
    sp.use_cyclic_u = True
    return link(bpy.data.objects.new(name, cu))

def sweep(name, path, prof, material='trim', closed=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.twist_mode = 'MINIMUM'
    sp = cu.splines.new('POLY'); sp.points.add(len(path) - 1)
    for p, c in zip(sp.points, path): p.co = (*c, 1)
    sp.use_cyclic_u = closed
    cu.bevel_mode = 'OBJECT'; cu.bevel_object = prof; cu.use_fill_caps = True
    ob = link(bpy.data.objects.new(name, cu)); ob.data.materials.append(mat(material))
    return convert(ob)

def pointed(span, rise, n=24, z0=0.0, y=0.0):
    """Points of a two-centred pointed arch in the XZ plane, springing at (±span/2, z0), apex at (0, z0+rise)."""
    h = span / 2; r = (rise * rise + h * h) / (2 * h); c = r - h   # centres at (+c,0) [left arc] and (-c,0) [right arc]
    pts = []; a_end = math.atan2(rise, -c)                           # angle of the apex seen from the left arc's centre (c, 0)
    for i in range(n + 1):
        a = math.pi - (math.pi - a_end) * i / n; pts.append((c + r * math.cos(a), y, z0 + r * math.sin(a)))
    pts += [(-x, yy, z) for x, yy, z in reversed(pts[:-1])]
    return pts

def miter_sweep(name, path, prof, y0=0.0, closed=False, material='trim'):
    """Sweep a profile along a polyline in the XZ plane with mitred joins (no twisting at an arch's apex).
    path: [(x, z)]; prof: closed [(u, v)] with u = offset to the LEFT of travel (outward on an arch drawn left to
    right) and v = depth toward the camera (the piece's back sits at y = y0, its face at y0 - max v)."""
    P = [Vector((x, z)) for x, z in path]; n = len(P)
    seg = []
    for i in range(n - 1 if not closed else n):
        t = (P[(i + 1) % n] - P[i]).normalized(); seg.append(Vector((-t.y, t.x)))
    norms = []
    for i in range(n):
        if closed: a, b = seg[i - 1], seg[i % len(seg)]
        else: a = seg[max(0, i - 1)]; b = seg[min(i, len(seg) - 1)]
        m = (a + b); m = m.normalized() if m.length > 1e-6 else a
        k = 1.0 / max(0.25, m.dot(a)); norms.append(m * k)
    bm = bmesh.new(); rings = []
    for p, m in zip(P, norms):
        rings.append([bm.verts.new((p.x + m.x * u, y0 - v, p.y + m.y * u)) for u, v in prof])
    k = len(prof)
    for i in range(n - 1 if not closed else n):
        A, B = rings[i], rings[(i + 1) % n]
        for j in range(k): bm.faces.new((A[j], A[(j + 1) % k], B[(j + 1) % k], B[j]))
    if not closed: bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_from_bm(name, bm, material)

def roll_uv(w=0.55, t=0.5):
    """Archivolt section as (u radial, v depth): chamfered back, a hollow, a big roll, a fillet."""
    pts = [(-t / 2, 0.0), (-t / 2, 0.08)]
    for i in range(7):
        a = math.pi * (1.5 - i / 12); pts.append((-t / 2 + 0.13 + 0.12 * math.sin(a), 0.21 + 0.12 * math.cos(a)))
    pts.append((-0.06, 0.3))
    for i in range(10):
        a = -math.pi / 2 + math.pi * i / 9; pts.append((0.05 + 0.13 * math.sin(a), 0.38 + 0.13 * math.cos(a)))
    pts += [(0.17, w), (t / 2 - 0.06, w), (t / 2, w - 0.06), (t / 2, 0.0)]
    return pts

def cham_uv(w=0.3, t=0.3, c=0.07):
    return [(-t / 2, 0), (-t / 2, w - c), (-t / 2 + c, w), (t / 2 - c, w), (t / 2, w - c), (t / 2, 0)]

def arch_xz(span, rise, n=28, z0=0.0, dx=0.0):
    return [(x + dx, z) for x, _, z in pointed(span, rise, n, z0)]

def solid_face(name, outer, holes=(), depth=0.3, material='stone', y0=0.0):
    """Extruded planar shape in XZ (outer and hole polygons as [(x, z)]), from y0 back to y0+depth."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.extrude = depth / 2
    for poly in [outer, *holes]:
        sp = cu.splines.new('POLY'); sp.points.add(len(poly) - 1)
        for p, (x, z) in zip(sp.points, poly): p.co = (x, z, 0, 1)
        sp.use_cyclic_u = True
    ob = link(bpy.data.objects.new(name, cu)); ob.data.materials.append(mat(material))
    ob.rotation_euler = (math.pi / 2, 0, 0); ob.location = (0, y0 + depth / 2, 0)
    ob = convert(ob); apply(ob); bpy.ops.object.transform_apply(location=True, rotation=False, scale=False); return ob

def noise_displace(ob, amp=0.05, scale=1.3, seed=0):
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, 100) for _ in range(9)]
    def n(p): return (math.sin(p.x * scale + ph[0]) * math.sin(p.y * scale * 1.3 + ph[1]) * math.sin(p.z * scale * 0.9 + ph[2])
                      + 0.5 * math.sin(p.x * scale * 2.7 + ph[3]) * math.sin(p.y * scale * 2.1 + ph[4]) * math.sin(p.z * scale * 3.1 + ph[5]))
    me = ob.data; me.calc_loop_triangles() if hasattr(me, 'calc_loop_triangles') else None
    for v in me.vertices: v.co += v.normal * amp * n(v.co)

def box_uv(ob, size=4.0):
    me = ob.data; bm = bmesh.new(); bm.from_mesh(me)
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            c = l.vert.co
            if ax == 0: u, v = c.y * (1 if n.x > 0 else -1), c.z
            elif ax == 1: u, v = c.x * (-1 if n.y > 0 else 1), c.z
            else: u, v = c.x, c.y * (1 if n.z > 0 else -1)
            l[uv].uv = (u / size, v / size)
    bm.to_mesh(me); bm.free()

def bake_ao(ob, samples=40, dist=1.6, floor=0.42):
    """Per-vertex ambient occlusion by ray casting against the piece itself, stored as the 'Color' attribute."""
    me = ob.data; bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    tree = BVHTree.FromBMesh(bm); rnd = random.Random(1)
    dirs = []
    for i in range(samples):  # cosine-weighted hemisphere samples around +Z, rotated per vertex
        u, v = (i + 0.5) / samples, rnd.random(); r = math.sqrt(u); a = math.tau * v
        dirs.append(Vector((r * math.cos(a), r * math.sin(a), math.sqrt(max(0, 1 - u)))))
    occ = []
    for vt in bm.verts:
        nrm = vt.normal if vt.normal.length > 0 else Vector((0, 0, 1))
        rot = nrm.to_track_quat('Z', 'Y'); o = vt.co + nrm * 0.004; hit = 0
        for d in dirs:
            loc, *_ = tree.ray_cast(o, rot @ d, dist)
            if loc is not None: hit += 1
        occ.append(1 - hit / samples)
    bm.free()
    attr = me.color_attributes.get('Color') or me.color_attributes.new('Color', 'FLOAT_COLOR', 'POINT')
    for i, a in enumerate(occ):
        k = floor + (1 - floor) * a; attr.data[i].color = (k, k, k, 1)
    me.color_attributes.active_color = attr

def white(ob):
    me = ob.data; attr = me.color_attributes.get('Color') or me.color_attributes.new('Color', 'FLOAT_COLOR', 'POINT')
    for d in attr.data: d.color = (1, 1, 1, 1)
    me.color_attributes.active_color = attr

PIECES = []
def finish(ob, uv=True, ao=True, uvsize=4.0, **kw):
    for m in ob.modifiers: pass
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_flat()
    if uv: box_uv(ob, uvsize)
    if ao: bake_ao(ob, **kw)
    else: white(ob)
    PIECES.append(ob); print('piece', ob.name, len(ob.data.vertices), 'verts', flush=True); return ob

def material_slots_by_name(ob):
    return [s.material.name for s in ob.material_slots]

# Mouldings (x = depth out from the wall toward the camera, y = radial / up) ----------------------------------
def roll_profile(name, w=0.55, t=0.5):
    """Archivolt: a chamfered back, a hollow, a big roll, a fillet — reads as carved stone in side light."""
    pts = [(0, -t / 2), (0.08, -t / 2)]
    for i in range(7):  # hollow (cavetto)
        a = math.pi * (1.5 - i / 12); pts.append((0.08 + 0.13 + 0.12 * math.cos(a), -t / 2 + 0.13 + 0.12 * math.sin(a)))
    pts += [(0.3, -0.06)]
    for i in range(10):  # roll
        a = -math.pi / 2 + math.pi * i / 9; pts.append((0.38 + 0.13 * math.cos(a) * 1.0, 0.05 + 0.13 * math.sin(a)))
    pts += [(w, 0.17), (w, t / 2 - 0.06), (w - 0.06, t / 2), (0, t / 2)]
    return profile_obj(name, [(x - 0.0, y) for x, y in pts])

def chamfer_profile(name, w=0.3, t=0.3, c=0.07):
    return profile_obj(name, [(0, -t / 2), (w - c, -t / 2), (w, -t / 2 + c), (w, t / 2 - c), (w - c, t / 2), (0, t / 2)])

def ovolo_profile(name, d=3.4, h=0.45):
    """Platform slab cross-section: x = depth (-d/2..d/2), y = height (-h..0); front nosing with an ovolo and a fillet."""
    pts = [(-d / 2, -h + 0.08), (-d / 2, 0), (d / 2 - 0.16, 0)]
    for i in range(7): a = math.pi / 2 - math.pi / 2 * i / 6; pts.append((d / 2 - 0.16 + 0.16 * math.cos(a), -0.16 + 0.16 * math.sin(a)))
    pts += [(d / 2, -0.2), (d / 2 - 0.05, -0.24), (d / 2 - 0.05, -h + 0.12), (d / 2 - 0.17, -h), (-d / 2 + 0.1, -h)]
    return pts

# ------------------------------------------------------------------------------------------------ pieces
BAY = 6.667  # pier spacing used by the game (rooms.js grid, pillar prop)

def pier_section(z0, z1, name, mat_='stone'):
    parts = [box(name + '_core', -0.42, -0.36, z0, 0.42, 0.36, z1, mat_)]
    for x, y, r in [(0, -0.42, 0.18), (-0.42, -0.34, 0.13), (0.42, -0.34, 0.13), (-0.5, 0.02, 0.12), (0.5, 0.02, 0.12)]:
        parts.append(cyl(name + '_sh', x, y, z0, z1, r, 14, mat_))
    return parts

def make_pier():
    # origin at the floor, centre of the pier, back face at y=+0.36 (against the wall)
    shaft = join('pier_shaft', pier_section(0, 1, 'ps'))
    finish(shaft, ao=False)
    base = [box('pb0', -0.72, -0.62, 0, 0.72, 0.42, 0.32, 'trim', 0.04), box('pb1', -0.62, -0.55, 0.32, 0.62, 0.4, 0.5, 'trim', 0.05)]
    for x, y, r in [(0, -0.42, 0.18), (-0.42, -0.34, 0.13), (0.42, -0.34, 0.13), (-0.5, 0.02, 0.12), (0.5, 0.02, 0.12)]:
        base.append(lathe('pbt', [(r + 0.09, 0.5), (r + 0.1, 0.56), (r + 0.06, 0.62), (r + 0.02, 0.64), (r + 0.05, 0.7), (r, 0.75)], 14, 'trim', (x, y, 0)))
    base += pier_section(0.5, 0.75, 'pbs')
    finish(join('pier_base', base))
    cap = []
    for x, y, r in [(0, -0.42, 0.18), (-0.42, -0.34, 0.13), (0.42, -0.34, 0.13), (-0.5, 0.02, 0.12), (0.5, 0.02, 0.12)]:
        cap.append(lathe('pca', [(r + 0.03, 0.0), (r + 0.05, 0.06), (r + 0.02, 0.1), (r + 0.03, 0.18), (r + 0.12, 0.42), (r + 0.18, 0.52)], 14, 'trim', (x, y, 0)))
    cap += pier_section(0, 0.52, 'pcs', 'trim')
    # leafy bell: a ring of stiff-leaf lobes under the abacus
    for i in range(9):
        a = -math.pi * 0.95 + math.pi * 0.9 * i / 8; cx, cy = math.cos(a) * 0.55, math.sin(a) * 0.45 - 0.05
        leaf = lathe('leaf', [(0.0, 0.18), (0.09, 0.28), (0.11, 0.4), (0.06, 0.5), (0.0, 0.53)], 8, 'trim', (cx, cy, 0)); cap.append(leaf)
    cap.append(box('abacus', -0.78, -0.72, 0.52, 0.78, 0.4, 0.72, 'trim', 0.05))
    finish(join('pier_cap', cap))

def make_bay(name, rise, top):
    """A blind arcade bay, centred at x=0, from springing height 0 (the game puts it on the capitals) up to `top`.
    spandrel: wall face around the arch (front at y=-0.5, back at y=0); archivolt: moulded arch ring proud of it."""
    span = BAY - 1.0
    hole = arch_xz(span, rise, 28)
    outer = [(-BAY / 2, 0), (BAY / 2, 0), (BAY / 2, top), (-BAY / 2, top)]
    finish(solid_face(name + '_spandrel', outer, [hole], 0.5, 'stone', -0.5))
    finish(miter_sweep(name + '_arch', arch_xz(span + 0.36, rise + 0.2, 36), roll_uv(0.55, 0.5), -0.5, False, 'trim'))
    finish(miter_sweep(name + '_hood', arch_xz(span + 1.3, rise + 0.75, 36), [(-0.1, 0), (-0.1, 0.16), (-0.02, 0.22), (0.08, 0.18), (0.1, 0)], -0.5, False, 'trim'))

def make_lancet(name='lancet', w=2.2, h=4.6):
    """Two-light lancet with a quatrefoil in the head. Origin bottom-centre (sill), glass plane at y=0."""
    rise = w * 0.95; spring = h - rise
    outline = [(-w / 2, 0), (w / 2, 0)] + list(reversed(arch_xz(w, rise, 20, spring)))
    frame_out = [(-w / 2 - 0.42, -0.3), (w / 2 + 0.42, -0.3)] + list(reversed(arch_xz(w + 0.84, rise + 0.55, 20, spring)))
    finish(miter_sweep(name + '_frame', [(-w / 2, 0)] + arch_xz(w, rise, 20, spring) + [(w / 2, 0)], [(0, 0), (0, 0.5), (0.12, 0.62), (0.34, 0.62), (0.42, 0.5), (0.42, 0)], 0.0, False, 'trim'))
    finish(solid_face(name + '_wall', frame_out, [outline], 0.3, 'stone', -0.3))
    parts = [box(name + '_mull', -0.08, -0.36, 0, 0.08, -0.06, spring + 0.25, 'trim')]
    sw2 = w / 2 - 0.08
    for sx in (-1, 1):
        parts.append(miter_sweep(name + '_sub', [(sx * w / 4 - sw2 / 2, spring - 0.6)] + arch_xz(sw2, sw2 * 0.95, 14, spring - 0.1, sx * w / 4) + [(sx * w / 4 + sw2 / 2, spring - 0.6)], cham_uv(0.3, 0.13, 0.04), -0.06, False, 'trim'))
    cz = spring + rise * 0.52; R = w * 0.19
    parts.append(miter_sweep(name + '_oc', [(math.cos(a) * R, cz + math.sin(a) * R) for a in [i / 28 * math.tau for i in range(28)]], cham_uv(0.3, 0.12, 0.04), -0.06, True, 'trim'))
    for i in range(4):
        a = i / 4 * math.tau + math.pi / 4; cx, cc = math.cos(a) * R * 0.5, cz + math.sin(a) * R * 0.5
        parts.append(miter_sweep(name + '_cusp', [(cx + math.cos(b) * R * 0.42, cc + math.sin(b) * R * 0.42) for b in [k / 16 * math.tau for k in range(16)]], cham_uv(0.26, 0.08, 0.03), -0.06, True, 'trim'))
    parts.append(box(name + '_sill', -w / 2 - 0.55, -0.7, -0.22, w / 2 + 0.55, 0.0, 0.02, 'trim', 0.03))
    finish(join(name + '_tracery', parts))
    g = solid_face(name + '_glass', outline, [], 0.02, 'glass', 0.02)
    me = g.data; bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for l in f.loops: l[uv].uv = (l.vert.co.x / w + 0.5, l.vert.co.z / h)
    bm.to_mesh(me); bm.free(); white(g); PIECES.append(g)

def make_ledge():
    """Platform slab, 1 m long (the game stretches it along x), top at z=0, depth 3.4 centred on y=0."""
    pts = ovolo_profile('lp')
    # build as an extrusion along X of the profile (profile in YZ, -y toward camera)
    bm = bmesh.new(); L = []; R = []
    for (d, hh) in pts: L.append(bm.verts.new((-0.5, -d, hh))); R.append(bm.verts.new((0.5, -d, hh)))
    n = len(pts)
    for i in range(n): bm.faces.new((L[i], L[(i + 1) % n], R[(i + 1) % n], R[i]))
    bm.faces.new(L); bm.faces.new(list(reversed(R)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    finish(mesh_from_bm('ledge', bm, 'trim'), ao=False)
    # corbel: a carved bracket from the wall (y=+1.7 .. back) under the slab end; origin at its top-front edge
    prof = [(0, 0), (2.0, 0), (2.0, -0.18), (1.6, -0.22), (1.2, -0.36), (0.9, -0.62), (0.75, -0.66), (0.55, -0.84), (0.0, -0.9)]
    bm = bmesh.new(); A = [bm.verts.new((-0.22, 1.7 - y, z)) for y, z in prof]; B = [bm.verts.new((0.22, 1.7 - y, z)) for y, z in prof]
    n = len(prof)
    for i in range(n): bm.faces.new((A[i], A[(i + 1) % n], B[(i + 1) % n], B[i]))
    bm.faces.new(A); bm.faces.new(list(reversed(B))); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for e in bm.edges: pass
    finish(mesh_from_bm('corbel', bm, 'stone'))

def make_scaffold():
    """Timber platform 1 m long unit: planks on joists, with a raking brace back to the wall. Top at z=0."""
    parts = []
    for i in range(5): parts.append(box('plank', -0.5, -1.7 + i * 0.68, -0.09, 0.5, -1.7 + i * 0.68 + 0.64, 0, 'wood'))
    parts.append(box('joist', -0.5, -1.65, -0.32, 0.5, -1.45, -0.09, 'wood')); parts.append(box('joist2', -0.5, 1.2, -0.32, 0.5, 1.4, -0.09, 'wood'))
    finish(join('scaffold', parts), ao=False)
    br = []
    br.append(box('post', -0.12, -1.75, -0.6, 0.12, -1.5, -0.09, 'wood'))
    b = box('brace', -0.09, -0.1, -1.6, 0.09, 0.1, 1.6, 'wood'); b.rotation_euler = (math.radians(-52), 0, 0); b.location = (0, 0.7, -1.1); apply(b); bpy.ops.object.transform_apply(location=True, rotation=False, scale=False); br.append(b)
    br.append(box('strap', -0.14, -1.58, -0.28, 0.14, -1.48, -0.12, 'dark'))
    finish(join('scaffold_brace', br))

def make_rock_altar():
    """The pilgrim's stone: a weathered crag with a dressed top, origin at the floor. The blade stands in a slot at x=0."""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=0.75)
    for v in bm.verts: v.co.x *= 1.25; v.co.y *= 0.95; v.co.z = v.co.z * 0.75 + 0.42
    ob = mesh_from_bm('crag', bm, 'stone'); noise_displace(ob, 0.11, 2.4, 3)
    top = box('crag_top', -0.62, -0.5, 0.86, 0.62, 0.5, 1.02, 'trim', 0.04)
    slot = box('crag_slot', -0.05, -0.16, 1.02, 0.05, 0.16, 1.03, 'dark')
    steps = [box('step%d' % i, -1.5 + i * 0.25, -1.1 + i * 0.2, i * 0.12, 1.5 - i * 0.25, 1.0 - i * 0.2, (i + 1) * 0.12, 'trim', 0.03) for i in range(2)]
    finish(join('pilgrim_stone', [ob, top, slot, *steps]))

def tower(name, x, y, r, z0, z1, roof=1.6, mat_='stone', seg=12, cren=True, win=3):
    p = [cyl(name, x, y, z0, z1, r, seg, mat_)]
    if cren:
        p.append(cyl(name + 'c', x, y, z1, z1 + 0.6, r + 0.35, seg, mat_))
        for i in range(seg):
            if i % 2: continue
            a = i / seg * math.tau; p.append(box(name + 'm', x + math.cos(a) * (r + 0.1) - 0.35, y + math.sin(a) * (r + 0.1) - 0.35, z1 + 0.6, x + math.cos(a) * (r + 0.1) + 0.35, y + math.sin(a) * (r + 0.1) + 0.35, z1 + 1.5, mat_))
    if roof: p.append(cyl(name + 'r', x, y, z1 + (0.6 if cren else 0), z1 + (0.6 if cren else 0) + r * roof * 2.2, r + (0.25 if cren else 0.15), seg, 'roof', 0.0))
    return p

def windows(x0, x1, z0, z1, y, n, w=0.35, h=0.8, chance=0.55, rnd=random.Random(3)):
    out = []
    for i in range(n):
        if rnd.random() > chance: continue
        x = rnd.uniform(x0, x1); z = rnd.uniform(z0, z1)
        out.append(box('win', x - w / 2, y - 0.05, z, x + w / 2, y, z + h, 'glow'))
    return out

def make_gatehouse():
    """Barbican seen from the causeway: the gate passage runs through it along x. Origin at the floor of the gate's
    west face, centre of the play plane (y=0). Everything at y<-0.9 is behind the hero; the front face is at y=-3.2
    only ABOVE the passage (z>5.6), so the hero walks under the overhang into the dark tunnel."""
    S, T = [], []
    # back mass and towers (behind the hero)
    S.append(box('gh_back', 0, 0.9, 0, 12, 7.0, 5.6, 'tunnel')); S.append(box('gh_back2', 0, 0.9, 5.6, 12, 7.0, 21, 'stone'))
    S += tower('gh_tw', -0.6, 3.6, 3.1, 0, 23, 1.15, seg=16)
    S += tower('gh_tw2', 12.2, 4.2, 2.8, 0, 25, 1.25, seg=16)
    # upper storey spanning over the passage toward the camera
    S.append(box('gh_upper', 0.3, -3.2, 5.6, 12, 0.9, 19.5, 'stone'))
    # machicolations: a corbelled parapet on the front, with merlons
    for i in range(12):
        x = 0.7 + i * 0.95; T.append(box('mc', x, -3.75, 17.6, x + 0.38, -3.2, 18.4, 'trim', 0.03))
    T.append(box('gh_par', 0.2, -3.85, 18.4, 12.1, -3.0, 19.6, 'stone'))
    for i in range(7): x = 0.4 + i * 1.7; T.append(box('mer', x, -3.85, 19.6, x + 1.0, -3.0, 20.7, 'stone', 0.03))
    # pointed gate arch on the WEST face (seen edge-on) - a deep arch ring framing the tunnel mouth
    ga = miter_sweep('gh_arch', [(-2.3, 0)] + arch_xz(4.6, 3.6, 20, 2.0) + [(2.3, 0)], roll_uv(0.9, 0.8), 0.0, False, 'trim')
    ga.rotation_euler = (0, 0, -math.pi / 2); ga.location = (0.0, -1.2, 0); apply(ga); bpy.ops.object.transform_apply(location=True, rotation=False, scale=False); T.append(ga)
    # tunnel vault seen from below: ribs across the passage
    for i in range(6):
        x = 0.9 + i * 2.0; T.append(box('rib', x, -3.2, 5.25, x + 0.4, 0.9, 5.6, 'tunnel', 0.04))
    # portcullis teeth hanging in the slot just inside the mouth
    for i in range(7):
        y_ = -2.6 + i * 0.6; T.append(box('pc', 1.2, y_ - 0.05, 4.6, 1.32, y_ + 0.05, 5.6, 'dark')); T.append(cyl('pct', 1.26, y_, 4.25, 4.6, 0.06, 6, 'dark', 0.0))
    T.append(box('pcbar', 1.15, -2.8, 5.0, 1.38, 1.0, 5.12, 'dark'))
    # arrow loops and a heraldic panel on the front face
    for x, z in [(2.2, 9), (5.5, 12.5), (9.0, 9), (2.2, 14.5), (9.0, 14.5)]:
        T.append(box('loop', x - 0.09, -3.3, z, x + 0.09, -3.15, z + 1.6, 'dark')); T.append(box('loopx', x - 0.4, -3.3, z + 0.7, x + 0.4, -3.15, z + 0.86, 'dark'))
    T.append(box('panel', 4.4, -3.35, 7.2, 7.4, -3.18, 10.6, 'trim', 0.05))
    T.append(box('panelhood', 4.1, -3.55, 10.6, 7.7, -3.1, 10.95, 'trim', 0.04))
    # string course
    T.append(box('course', 0.2, -3.45, 11.2, 12.1, -3.1, 11.55, 'trim', 0.04))
    T += windows(1, 11, 7, 16, -3.25, 6, chance=0.5)
    finish(join('gatehouse', S + T), ao=True, samples=24, dist=3.0)

def make_skyline():
    """Castle Velscour seen from afar: one model, the same from every open-air room. Origin = base centre.
    ~300 m wide, the keep crowned at ~150 m. Front faces at y<0. Lit windows use 'glow'."""
    rnd = random.Random(11); S = []
    # the crag the castle stands on
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1)
    for v in bm.verts: v.co.x *= 170; v.co.y *= 40; v.co.z = v.co.z * 46 - 22
    crag = mesh_from_bm('crag', bm, 'stone'); noise_displace(crag, 9, 0.035, 5); S.append(crag)
    # curtain wall with drum towers
    S.append(box('curtain', -140, -8, 14, 140, 4, 34, 'stone'))
    for i in range(29):
        x = -140 + i * 10; S.append(box('mer', x, -9, 34, x + 5, 4, 37.5, 'stone'))
    for x in (-140, -96, -52, 52, 96, 140):
        S += tower('ct', x, -9, 7, 10, 46 + rnd.uniform(-4, 6), 1.5, seg=12)
    # the great keep (centre), with four corner turrets and the hollow-sun crown
    S.append(box('keep', -24, -6, 20, 24, 30, 112, 'stone'))
    for x in (-24, 24):
        S += tower('kt', x, -6, 5.5, 60, 128, 1.9, seg=10, cren=True)
    S.append(box('keepcrown', -14, 0, 112, 14, 24, 128, 'stone'))
    S.append(cyl('crown', 0, 12, 128, 148, 6, 10, 'roof', 1.0)); S.append(cyl('spire', 0, 12, 148, 172, 1.0, 8, 'roof', 0.0))
    # buttresses on the keep face
    for x in (-16, -6, 6, 16):
        S.append(box('kb', x - 1.8, -11, 20, x + 1.8, -6, 92, 'stone')); S.append(cyl('kbp', x, -9, 92, 100, 1.2, 4, 'roof', 0.0))
    # chapel (west): long nave roof, flying buttresses, rose window, a needle spire
    S.append(box('nave', -110, -2, 30, -50, 24, 66, 'stone'))
    roof = cyl('naveroof', 0, 0, 0, 1, 1, 3, 'roof'); roof.rotation_euler = (0, math.pi / 2, 0); roof.scale = (18, 13, 60); roof.location = (-80, 11, 74); apply(roof); bpy.ops.object.transform_apply(location=True, rotation=False, scale=False); S.append(roof)
    for i in range(6):
        x = -106 + i * 10.5; S.append(box('fb', x - 1.4, -16, 30, x + 1.4, -11, 70, 'stone')); S.append(cyl('fbp', x, -13.5, 70, 80, 1.3, 4, 'roof', 0.0))
        fly = box('fly', x - 0.8, -11, 56, x + 0.8, -2, 59, 'stone'); S.append(fly)
    S.append(box('westwork', -54, -6, 30, -40, 26, 96, 'stone')); S.append(cyl('wspire', -47, 10, 96, 138, 6.5, 8, 'roof', 0.0))
    rose = [cyl('rose', -82, -2.2, 0, 0.3, 4.5, 20, 'roseglow')]
    rose[0].rotation_euler = (math.pi / 2, 0, 0); rose[0].location = (-82, -2.2, 56); apply(rose[0]); bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    # belfry (east): tall square tower with open lancets and a pyramid roof
    S.append(box('belfry', 62, -6, 30, 82, 14, 132, 'stone'))
    for z in (100, 114):
        for x in (65, 70.5, 76):
            S.append(box('bopen', x, -6.4, z, x + 3.2, -6.0, z + 9, 'dark'))
    S.append(cyl('broof', 72, 4, 132, 160, 15, 4, 'roof', 0.0))
    # observatory dome (far east)
    S.append(cyl('obs', 116, 6, 34, 90, 10, 14, 'stone'))
    dome = lathe('dome', [(11, 0), (10.5, 3), (9, 6), (6.5, 8.5), (3.5, 10), (0.01, 10.6)], 16, 'roof', (116, 6, 90)); S.append(dome)
    # minor towers and pinnacles to break the skyline
    for x in (-128, -100, -66, -34, 36, 46, 92, 100, 130):
        h = rnd.uniform(60, 104); S += tower('mt', x, rnd.uniform(-2, 8), rnd.uniform(3, 5), 30, h, rnd.uniform(1.6, 2.4), seg=8, cren=rnd.random() < 0.5)
    glow = rose
    for x0, x1, z0, z1, y, n in [(-22, 22, 26, 108, -6.1, 70), (-108, -52, 34, 62, -2.1, 26), (62, 82, 34, 96, -6.1, 26), (-52, -42, 34, 92, -6.1, 14), (-138, 138, 16, 32, -8.1, 50)]:
        glow += windows(x0, x1, z0, z1, y, max(4, n // 3), 0.5, 1.8, 0.5, rnd)
    sk = join('skyline', S + glow)
    finish(sk, uvsize=16.0, ao=True, samples=16, dist=18.0)

# ------------------------------------------------------------------------------------------------ build
make_pier()
make_bay('bay_low', 3.6, 4.0)     # single-storey halls: springs at ~2.6 m above the floor, apex ~5.9 m
make_bay('bay_high', 4.9, 5.6)    # tall naves and the vestibule
make_lancet('lancet', 2.2, 4.6)
make_ledge()
make_scaffold()
make_rock_altar()
make_gatehouse()
make_skyline()

# drop profile curves and anything that is not a finished piece
for ob in list(SC.objects):
    if ob not in PIECES: bpy.data.objects.remove(ob, do_unlink=True)
for ob in PIECES:
    ob.select_set(True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_vertex_color='ACTIVE',
                          export_all_vertex_colors=False, export_normals=True, export_materials='EXPORT', export_yup=True)
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
