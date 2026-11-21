# Authors the hero's gameplay clips inside Blender from the retargeted Mixamo library.
# Run inside assets/player/vesper_player_rig.blend:   exec(open('tools/build_anims.py').read())
# Output: vw_* actions in the .blend, assets/player/vesper_moves.glb (skeleton + vw_* clips only) and
# assets/player/moves.json (hit windows, cancel points, stride speeds) that src/player.js reads.
#
# Why: the raw mocap was being scrubbed linearly through sub-ranges, so strikes landed in ~3 frames with no
# anticipation or settle, the armed idle squared the chest to the camera and the run carried the sword upright.
# Every attack clip here starts and ends on the guard pose, has an eased wind-up, a readable strike arc in the
# side-view plane, a held follow-through and a blended recovery. The jump, thrusts, smashes and two-hand hold are
# handled in src/player.js and src/attacks.js and are not rebuilt here.
import bpy, re, json, math, os
from mathutils import Quaternion, Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(bpy.data.filepath))) if bpy.data.filepath else os.getcwd()
ROOT = os.path.dirname(ROOT) if os.path.basename(ROOT) == 'assets' else ROOT
arm = bpy.data.objects['Armature']
# always work in the rig's own scene: the Blender instance may have another scene active
sc = next(s for s in bpy.data.scenes if arm.name in s.objects); VL = sc.view_layers[0]
PB = arm.pose.bones; BONES = [b.name for b in arm.data.bones]
P = 'mixamorig:'
LOWER = [P + n for n in ('Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase')]
RARM = [P + n for n in ('RightShoulder', 'RightArm', 'RightForeArm', 'RightHand')]
LARM = [P + n for n in ('LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand')]
RFING = [b for b in BONES if 'RightHand' in b and b != P + 'RightHand']
LFING = [b for b in BONES if 'LeftHand' in b and b != P + 'LeftHand']
HIPS = P + 'Hips'
_rx = re.compile(r'pose\.bones\["(.+?)"\]\.(\w+)')
_cache = {}

def curves(name):
    if name in _cache: return _cache[name]
    a = bpy.data.actions[name]; out = {}
    for fc in a.layers[0].strips[0].channelbag(a.slots[0]).fcurves:
        m = _rx.match(fc.data_path)
        if m: out.setdefault(m.group(1), {}).setdefault(m.group(2), {})[fc.array_index] = fc
    _cache[name] = out; return out

def pose(name, f):
    """Sample an action at a (fractional) frame -> {bone: (quat, loc|None)}"""
    C = curves(name); out = {}
    for b in BONES:
        ch = C.get(b, {}); q = ch.get('rotation_quaternion'); l = ch.get('location')
        Q = Quaternion([q[i].evaluate(f) if q and i in q else (1 if i == 0 else 0) for i in range(4)]) if q else Quaternion()
        Q.normalize()
        L = Vector([l[i].evaluate(f) if i in l else 0 for i in range(3)]) if l and b == HIPS else None
        out[b] = (Q, L)
    return out

def blend(A, B, w, bones=None):
    out = dict(A)
    for b in (bones or BONES):
        qa, la = A[b]; qb, lb = B[b]
        q = qa.slerp(qb, w)
        l = la.lerp(lb, w) if la is not None and lb is not None else (la if la is not None else lb)
        out[b] = (q, l)
    return out

def ease(t): t = max(0, min(1, t)); return t * t * (3 - 2 * t)
def ease_out(t): t = max(0, min(1, t)); return 1 - (1 - t) ** 2.2
def ease_in(t): t = max(0, min(1, t)); return t ** 2.2

def apply(Pz):
    for b, (q, l) in Pz.items():
        pb = PB[b]; pb.rotation_quaternion = q
        if l is not None: pb.location = l
    VL.update()

GRIP_TILT = 0.28  # must match GRIP.tilt in src/player.js (makeGrip): the blade runs across the fist, out of the thumb side

def blade_axis():
    """World direction of the held blade, built from the knuckles exactly as the game's grip is."""
    MW = arm.matrix_world; h = lambda n: (MW @ PB[P + n].matrix).translation
    across = (h('RightHandIndex1') - h('RightHandPinky1')).normalized(); fingers = (h('RightHandMiddle1') - h('RightHand')).normalized()
    return (across * math.cos(GRIP_TILT) + fingers * math.sin(GRIP_TILT)).normalized()

def aim_blade(Pz, dir_arm, w):
    """Rotate the right hand so the blade points along dir_arm (armature space: -Y fwd, +Z up, +X left)."""
    apply(Pz)
    MW = arm.matrix_world
    d0 = blade_axis(); d1 = (MW.to_3x3() @ Vector(dir_arm)).normalized()
    R = Quaternion().slerp(d0.rotation_difference(d1), w)
    hb = PB[P + 'RightHand']; Mh = MW @ hb.matrix; pos = Mh.translation.copy()
    newW = Matrix.Translation(pos) @ R.to_matrix().to_4x4() @ Matrix.Translation(-pos) @ Mh
    hb.matrix = MW.inverted() @ newW; VL.update()
    out = dict(Pz); out[hb.name] = (hb.rotation_quaternion.copy(), None); return out

def twist(Pz, bone, axis, deg):
    """Extra local rotation on a bone (applied after the sampled rotation)."""
    out = dict(Pz); q, l = out[bone]; out[bone] = (q @ Quaternion(axis, math.radians(deg)), l); return out

def write(name, poses):
    old = bpy.data.actions.get(name)
    if old: bpy.data.actions.remove(old)
    a = bpy.data.actions.new(name); a.use_fake_user = True
    slot = a.slots.new(id_type='OBJECT', name='Armature'); layer = a.layers.new('Layer'); st = layer.strips.new(type='KEYFRAME')
    cb = st.channelbag(slot, ensure=True); n = len(poses)
    def fc(path, idx, vals):
        c = cb.fcurves.new(path, index=idx); c.keyframe_points.add(n)
        co = [0.0] * (2 * n)
        for i, v in enumerate(vals): co[2 * i] = i + 1; co[2 * i + 1] = v
        c.keyframe_points.foreach_set('co', co)
        for k in c.keyframe_points: k.interpolation = 'LINEAR'
        c.update()
    for b in BONES:
        qs = [p[b][0].copy() for p in poses]
        for i in range(1, n):
            if qs[i].dot(qs[i - 1]) < 0: qs[i].negate()
        for k in range(4): fc(f'pose.bones["{b}"].rotation_quaternion', k, [q[k] for q in qs])
        if b == HIPS:
            for k in range(3): fc(f'pose.bones["{b}"].location', k, [p[b][1][k] for p in poses])
    return a

META = {'fps': 30, 'clips': {}}
GUARD = ('vw_guard', 1)
SPINE = [P + n for n in ('Spine', 'Spine1', 'Spine2')]
LEGS = [b for b in LOWER if b != HIPS]

def yaw_hips(Pz, deg):
    """Turn the whole figure about the vertical through the hips (world space)."""
    apply(Pz); MW = arm.matrix_world; hb = PB[HIPS]; M = MW @ hb.matrix; pos = M.translation.copy()
    hb.matrix = MW.inverted() @ (Matrix.Translation(pos) @ Matrix.Rotation(math.radians(deg), 4, 'Z') @ Matrix.Translation(-pos) @ M); VL.update()
    out = dict(Pz); out[HIPS] = (hb.rotation_quaternion.copy(), Pz[HIPS][1]); return out

def chest_yaw(Pz):
    """Degrees the chest is turned away from the travel axis (+ = toward the figure's left)."""
    apply(Pz); MW = arm.matrix_world
    l = (MW @ PB[P + 'LeftArm'].matrix).translation - (MW @ PB[P + 'RightArm'].matrix).translation
    f = l.cross(Vector((0, 0, 1))); return math.degrees(math.atan2(f.x, -f.y))

def guard_pose(f):
    """Sword-ready stance for a side-scroller: the mocap guard squares the chest to the camera in a wide squat, so turn
    it to a three-quarter profile, narrow the feet and keep the blade up in front of the lead leg."""
    p = pose('sword_and_shield_idle', f)
    p = blend(p, pose('axe_unarmed_idle', 1), 0.42, LEGS)
    a = chest_yaw(p); p = yaw_hips(p, -(a - math.copysign(min(abs(a), 30), a)))
    return aim_blade(p, (-0.10, -0.62, 0.78), 0.6)

def attack(name, src, a0, s0, s1, s2, na=3, rate=1.0, nf=3, nr=7, legs='src', guard=GUARD, legs_w=1.0, fix=None):
    """a0→s0 wind-up (blending in from guard), s0→s1 strike at `rate` source frames per frame, s1→s2 eased
    follow-through, then nr frames back to guard. legs='guard' keeps the stance planted (upper-body source only)."""
    G = pose(*guard); out = []
    def S(f):
        p = pose(src, f)
        if legs == 'guard':  # plant the stance but keep the source's hip turn, so the cut still travels in the side-view plane
            hq = p[HIPS][0]; p = blend(p, G, legs_w, LOWER); p[HIPS] = (hq, p[HIPS][1])
        return fix(p, f) if fix else p
    out.append(G)
    for i in range(1, na + 1):
        t = i / na; out.append(blend(G, S(a0 + (s0 - a0) * ease(t)), ease_out(t)))
    ns = max(1, round((s1 - s0) / rate))
    for i in range(1, ns + 1): out.append(S(s0 + (s1 - s0) * i / ns))
    # live from the moment the blade comes over the top until it has landed (the cut finishes in the first follow-through frames)
    hit = [na + 3, na + ns + 1 + min(3, nf)]
    for i in range(1, nf + 1): out.append(S(s1 + (s2 - s1) * ease_out(i / nf)))
    cancel = len(out)
    E = S(s2)
    for i in range(1, nr + 1): out.append(blend(E, G, ease(i / nr)))
    write(name, out)
    META['clips'][name] = {'frames': len(out), 'hit': hit, 'cancel': cancel}

def loop(name, src, f0, f1, fn=None):
    out = []
    for f in range(f0, f1 + 1):
        p = pose(src, f); out.append(fn(p, (f - f0) / (f1 - f0)) if fn else p)
    write(name, out)
    # ground speed = how fast a planted foot travels backwards under the hips (median over the stance frames);
    # the game divides its run speed by this so the feet never skate
    MW = arm.matrix_world; prev = None; v = []
    P_ = [{s: (MW @ PB[P + s + 'Foot'].matrix).translation.copy() for s in ('Left', 'Right') if not apply(p)} for p in out]
    floor = min(min(c['Left'].z, c['Right'].z) for c in P_)
    for prev, cur in zip(P_, P_[1:]):
        for s in ('Left', 'Right'):
            if cur[s].z < floor + 0.06 and prev[s].z < floor + 0.06: v.append((cur[s].y - prev[s].y) * 30)
    v.sort(); META['clips'][name] = {'frames': len(out), 'speed': round(v[len(v) // 2], 3) if v else 0}

def flurry(name='vw_flurry'):
    """Three quick drives from the guard: the arm shoots out to the combo's longest straight reach (standing combo, f60),
    chest kept in profile, the blade aimed dead ahead (high, level, then a lower finishing lunge). Three hit windows."""
    G = pose(*GUARD)
    def E(aim):
        p = pose('standing_melee_combo_attack_ver_3', 60); hq = p[HIPS][0]; p = blend(p, G, 0.9, LOWER); p[HIPS] = (hq, p[HIPS][1])
        p = blend(p, G, 0.5, SPINE); a = chest_yaw(p); p = yaw_hips(p, -(a - math.copysign(min(abs(a), 35), a)))
        return aim_blade(p, aim, 1.0)
    C = aim_blade(blend(G, pose('standing_melee_combo_attack_ver_3', 54), 0.35, RARM), (-0.05, -0.75, 0.35), 0.8)   # chambered: fist drawn back by the ribs
    out = [G]; hits = []
    for i in range(1, 4): out.append(blend(G, C, ease_out(i / 3)))
    for j, aim in enumerate(((0, -1, 0.16), (0, -1, 0.0), (0, -1, -0.12))):
        X = E(aim); a = len(out)
        out.append(blend(C, X, 0.55)); out.append(X); out.append(X)
        if j < 2: hits.append([a + 1, a + 3]); out.append(blend(X, C, 0.5)); out.append(blend(X, C, 0.85))
        else: out.append(X); out.append(X); hits.append([a + 1, a + 4])
    cancel = len(out)
    for i in range(1, 9): out.append(blend(X, G, ease(i / 8)))
    write(name, out)
    META['clips'][name] = {'frames': len(out), 'hit': [hits[0][0], hits[-1][1]], 'hits': hits, 'cancel': cancel}

def build():
    arm.animation_data.action = None
    g = [guard_pose(f) for f in range(1, 110)]
    write('vw_guard', g); META['clips']['vw_guard'] = {'frames': len(g)}; _cache.pop('vw_guard', None)
    # ---- locomotion ---------------------------------------------------------------------------------------
    loop('vw_run', 'running', 1, 43)
    carry = pose('axe_unarmed_jump', 8)  # sword arm relaxed low at the side
    def armed(p, t):
        p = blend(p, carry, 0.62, RARM)                       # stop pumping the sword arm; carry it low, a little swing left
        p = blend(p, carry, 0.5, LARM); p = blend(p, carry, 0.8, LFING)   # the shield arm stops punching forward as a fist
        p = aim_blade(p, (-0.58, 0.68, -0.45), 0.92)          # blade trails behind and down, on the camera side so it stays readable
        return p
    loop('vw_run_armed', 'sword_and_shield_run', 1, 22, armed)
    # ---- attacks ------------------------------------------------------------------------------------------
    upright = lambda w: (lambda p, f: blend(p, pose(*GUARD), w, SPINE))   # cap the forward pitch so the head stays up
    # link 1: keep the torso up, and turn the wrist as the cut lands so the blade finishes in the screen plane, pointing
    # down and forward (the mocap ends with it foreshortened toward the camera, which read as a bow with no sword)
    def cut1(p, f):
        p = blend(p, pose(*GUARD), 0.6, SPINE)
        return aim_blade(p, (-0.12, -0.80, -0.58), max(0, min(1, (f - 158) / 3)))
    attack('vw_slash1', 'standing_melee_combo_attack_ver_2', 150, 155, 162, 164, na=3, rate=1.2, nf=5, nr=9, legs='guard', legs_w=0.6, fix=cut1)
    attack('vw_slash2', 'sword_and_shield_attack', 29, 34, 42, 45, na=3, rate=1.3, nf=3, nr=7, legs='guard', legs_w=0.85)
    attack('vw_slash3', 'standing_melee_attack_downward', 44, 49, 55, 58, na=4, rate=1.0, nf=4, nr=9)
    attack('vw_great', 'great_sword_slash', 40, 45, 55, 58, na=5, rate=0.9, nf=7, nr=10)   # long held follow-through: weight
    # ---- new weapon classes ---------------------------------------------------------------------------------
    # staff link 1: a leaping full turn that lands in a low sweep (the staff hits on both sides while it spins)
    attack('vw_whirl', 'axe_standing_melee_attack_360_low', 12, 21, 33, 38, na=4, rate=1.0, nf=5, nr=9)
    # staff link 2: both hands present the staff head-up and drive it forward (the bolt leaves at the hit frame)
    attack('vw_cast', 'standing_2h_magic_attack_01', 40, 58, 69, 74, na=5, rate=1.1, nf=6, nr=10, legs='guard', legs_w=0.5)
    # scythe: a full turn that opens into a long, low reaping lunge
    attack('vw_reap', 'standing_melee_attack_360_high', 38, 49, 67, 74, na=5, rate=1.2, nf=6, nr=10)
    flurry()
    # ---- grip: finger curl used whenever a weapon is in hand ------------------------------------------------
    g = pose('sword_and_shield_idle', 1); rest = pose('axe_unarmed_idle', 1)
    write('vw_grip', [blend(rest, g, 1, RFING + LFING)] * 2); META['clips']['vw_grip'] = {'frames': 2}
    json.dump(META, open(os.path.join(ROOT, 'assets', 'player', 'moves.json'), 'w'), indent=1)
    print(json.dumps(META['clips']))

def export():
    """Skeleton + vw_* clips only: the game binds them to the main hero GLB by bone name."""
    ad = arm.animation_data; ad.action = None
    for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
    for a in sorted(bpy.data.actions, key=lambda a: a.name):
        if not a.name.startswith('vw_'): continue
        t = ad.nla_tracks.new(); t.name = a.name; s = t.strips.new(a.name, 1, a); s.action_slot = a.slots[0]
    for o in sc.objects: o.select_set(False, view_layer=VL)
    arm.select_set(True, view_layer=VL); VL.objects.active = arm
    with bpy.context.temp_override(scene=sc, view_layer=VL):
      bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'player', 'vesper_moves.glb'), export_format='GLB', use_selection=True,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_skins=False,
                              export_optimize_animation_size=False, export_yup=True)
    for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)


if bpy.app.background:  # blender -b assets/player/vesper_player_rig.blend --python tools/build_anims.py
    build(); export()
