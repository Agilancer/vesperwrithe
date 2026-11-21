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

# The camera sits on the sword side. A cut that drives the sword shoulder through turns the chest away from it, and the mocap
# lunge's hips twist it a further ~30 deg, so every blow landed with the hero's back to the camera (bun and shoulder blades,
# no face). Past CHEST_LO (deg, + = away from the camera) the turn is eased toward CHEST_LO + CHEST_R: the hips carry the
# correction, so the whole figure turns about them and the hand path / blade aim (keyed in screen terms) are untouched.
CHEST_LO, CHEST_R = -6.0, 10.0
FACE = {}  # clip -> chest yaw per frame after the cap (printed at the end, for the record)
def face_cam(body):
    a = chest_yaw(body)
    if a <= CHEST_LO: return body
    return yaw_hips(body, -(a - (CHEST_LO + CHEST_R * math.tanh((a - CHEST_LO) / CHEST_R))))

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

# ---- keyed swings: the wrist travels a designed arc (two-bone IK), the blade is aimed every frame ------------------------
# Why: the mocap sword cuts fold the hero over at the waist and finish with the blade at the floor or behind him. A keyed
# swing is authored in the side-view plane: the cut always lands in front, the torso stays up, and every phase is timed.
def rot_world(Pz, bone, axis, deg):
    """Rotate a bone about an armature-space axis through its head (children follow)."""
    if not deg: return Pz
    apply(Pz); pb = PB[bone]; M = pb.matrix.copy(); h = M.translation.copy()
    pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, Vector(axis)) @ Matrix.Translation(-h) @ M; VL.update()
    out = dict(Pz); out[bone] = (pb.rotation_quaternion.copy(), Pz[bone][1]); return out

def _aim(pb, target):
    M = pb.matrix.copy(); h = M.translation.copy(); y = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    R = y.rotation_difference((target - h).normalized())
    pb.matrix = Matrix.Translation(h) @ R.to_matrix().to_4x4() @ Matrix.Translation(-h) @ M; VL.update()

def arm_ik(Pz, off, pole, side='Right'):
    """Two-bone IK in armature space: the wrist goes to shoulder + off, the elbow bends toward `pole` (a direction)."""
    apply(Pz); up, fo, ha = (PB[P + side + n] for n in ('Arm', 'ForeArm', 'Hand'))
    S = up.matrix.translation.copy(); E = fo.matrix.translation.copy(); W = ha.matrix.translation.copy(); T = S + Vector(off)
    a, c = (E - S).length, (W - E).length; n = (T - S).normalized(); d = min((T - S).length, (a + c) * 0.995)
    pv = Vector(pole); pl = pv - n * pv.dot(n); pl.normalize()
    cA = max(-1.0, min(1.0, (a * a + d * d - c * c) / (2 * a * d)))
    _aim(up, S + n * (a * cA) + pl * (a * math.sqrt(1 - cA * cA))); _aim(fo, S + n * d)
    out = dict(Pz); out[up.name] = (up.rotation_quaternion.copy(), None); out[fo.name] = (fo.rotation_quaternion.copy(), None)
    return out

def hand_off(Pz):
    apply(Pz); return tuple((PB[P + 'RightHand'].matrix.translation - PB[P + 'RightArm'].matrix.translation))

def _cr(p0, p1, p2, p3, t):  # Catmull-Rom on tuples
    return tuple(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3) for a, b, c, d in zip(p0, p1, p2, p3))

EASE = {'in': ease_in, 'out': ease_out, 'io': ease, 'lin': lambda t: max(0, min(1, t))}

def swing(name, keys, rec=8, hit=None, hits=None, cancel=None, guard=GUARD, post=None):
    """keys: [(frame, dict(body=pose, hand=(dx,dy,dz) from the right shoulder, blade=(x,y,z) armature dir, pole=dir,
    yaw=chest turn deg (+ = away from the foe), lean=deg forward, ease='out'|'in'|'io'|'lin' into this key))].
    Frame 0 is the guard; after the last key the pose eases back to guard over `rec` frames."""
    G = pose(*guard)
    g = dict(body=G, hand=hand_off(G), blade=None, pole=(-0.5, 0.3, -0.8), yaw=0, lean=0)
    ks = [(0, g)] + [(f, {**g, **k}) for f, k in keys]
    out = [G]
    for f in range(1, ks[-1][0] + 1):
        i = next(j for j in range(1, len(ks)) if ks[j][0] >= f)
        (f0, A), (f1, B) = ks[i - 1], ks[i]
        u = EASE[B.get('ease', 'io')]((f - f0) / (f1 - f0))
        body = blend(A['body'], B['body'], u)
        body = rot_world(body, P + 'Spine1', (0, 0, 1), -(A['yaw'] + (B['yaw'] - A['yaw']) * u))  # + yaw = sword shoulder back
        body = rot_world(body, P + 'Spine', (0, 1, 0), A['lean'] + (B['lean'] - A['lean']) * u)    # + lean = chest forward
        body = face_cam(body); FACE.setdefault(name, []).append(round(chest_yaw(body)))
        H = [k['hand'] for _, k in ks]; h = _cr(H[max(0, i - 2)], H[i - 1], H[i], H[min(len(H) - 1, i + 1)], u)
        pole = tuple(a + (b - a) * u for a, b in zip(A['pole'], B['pole']))
        p = arm_ik(body, h, pole)
        if B['blade'] is not None:
            D = [Vector(k['blade']).normalized() if k['blade'] else Vector(blade_dir0) for _, k in ks]
            d = Vector(_cr(D[max(0, i - 2)], D[i - 1], D[i], D[min(len(D) - 1, i + 1)], u)).normalized()
            p = aim_blade(p, tuple(d), 1.0)
        if post: p = post(p, f)
        out.append(p)
    E = out[-1]
    for i in range(1, rec + 1): out.append(blend(E, G, ease(i / rec)))
    write(name, out)
    m = {'frames': len(out), 'hit': list(hit or (hits[0][0], hits[-1][1])), 'cancel': cancel or ks[-1][0]}
    if hits: m['hits'] = [list(h) for h in hits]
    META['clips'][name] = m

# Pose-bone (armature) space here: +X is the hero's forward, -Y his right (sword) side, +Z up. The game turns the hero 22 deg
# toward the camera (src/player.js: facing * (PI/2 - 0.38)), so the screen plane is spanned by SR (screen-forward: +X turned
# toward +Y) and +Z. sv(fwd, up, cam) builds a vector in screen terms;
# cam > 0 comes toward the camera (the sword side), so the blade never slips behind the body.
SR = Vector((math.cos(0.38), math.sin(0.38), 0)); SC = Vector((math.sin(0.38), -math.cos(0.38), 0)); SU = Vector((0, 0, 1))
def sv(f, u, c=0.0): return tuple(SR * f + SU * u + SC * c)

def sword_chain():
    """The one-hand sword string: a quick diagonal cut, a rising cut, then a leaping overhead cleave."""
    global blade_dir0
    G = pose(*GUARD); apply(G); blade_dir0 = tuple((arm.matrix_world.to_3x3().inverted() @ blade_axis()).normalized())
    lunge = blend(G, pose('sword_and_shield_slash', 22), 1.0, LOWER)
    half = blend(G, lunge, 0.55, LOWER)
    EL_LO, EL_HI, EL_BK = sv(-0.15, -1, 0.45), sv(0.35, 0.6, 0.6), sv(-0.6, -0.4, 0.5)   # elbow down / up-forward / back
    K = lambda f, h, bl, pole, yaw=0, lean=0, body=None, ease='io': (f, dict(hand=sv(*h), blade=sv(*bl), pole=pole, yaw=yaw, lean=lean, ease=ease, **({'body': body} if body else {})))
    # 1: cocked back over the shoulder, a fast diagonal through the foe; the arm finishes long, the point just below level
    swing('vw_slash1', [
        K(2, (-0.04, 0.13, 0.10), (-0.85, 0.35, 0.40), EL_HI, yaw=10, lean=-3, ease='out'),
        K(4, (0.07, 0.18, 0.10), (0.20, 0.95, 0.25), EL_HI, yaw=2, lean=1, body=half, ease='in'),
        K(5, (0.19, 0.08, 0.10), (0.92, 0.30, 0.25), EL_LO, yaw=-3, lean=4, body=lunge, ease='lin'),
        K(6, (0.24, -0.02, 0.10), (0.93, -0.25, 0.25), EL_LO, yaw=-5, lean=5, body=lunge, ease='lin'),
        K(8, (0.24, -0.06, 0.10), (0.85, -0.48, 0.20), EL_LO, yaw=-6, lean=6, body=lunge, ease='out'),
        K(11, (0.23, -0.07, 0.10), (0.83, -0.50, 0.20), EL_LO, yaw=-5, lean=5, body=lunge),
    ], rec=8, hit=(5, 8), cancel=10)
    # 2: from low behind the hip, a rising cut that finishes high in front
    swing('vw_slash2', [
        K(3, (-0.06, -0.06, 0.10), (-0.88, -0.28, 0.35), EL_BK, yaw=12, lean=4, body=half, ease='out'),
        K(5, (0.12, -0.06, 0.10), (0.90, -0.28, 0.35), EL_LO, yaw=0, lean=5, body=lunge, ease='in'),
        K(6, (0.22, -0.03, 0.10), (0.97, 0.05, 0.25), EL_LO, yaw=-4, lean=4, body=lunge, ease='lin'),
        K(7, (0.20, 0.10, 0.10), (0.62, 0.75, 0.20), EL_LO, yaw=-5, lean=2, body=lunge, ease='lin'),
        K(9, (0.13, 0.19, 0.08), (-0.05, 0.99, 0.12), EL_HI, yaw=-5, lean=0, body=lunge, ease='out'),
        K(12, (0.12, 0.19, 0.08), (-0.22, 0.96, 0.12), EL_HI, yaw=-4, lean=0, body=lunge),
    ], rec=8, hit=(5, 8), cancel=11)
    # 3: the finisher is a leaping overhead cleave with its own body (it used to share slash1's lunge and read as the opener):
    # a gather (knees bent, blade cocked behind the head), a short hop with the knees drawn up while the blade goes over the top,
    # then it lands deep (hips ~0.14 m under the lunge) as the blade comes down through the front and finishes pointing at the floor
    crouch = blend(G, pose('jump_attack', 27), 0.7, LOWER)
    air = blend(G, pose('jump_attack', 47), 0.32, LOWER)
    land = blend(lunge, pose('jump_attack', 101), 0.5, LOWER)  # the lunge's wide stance, its knees bent deeper (a full landing squat read as sitting)
    swing('vw_slash3', [
        K(3, (-0.03, 0.18, 0.08), (-0.90, -0.10, 0.38), EL_HI, yaw=14, lean=-6, body=crouch, ease='out'),
        K(5, (0.00, 0.24, 0.08), (-0.35, 0.93, 0.25), EL_HI, yaw=8, lean=-4, body=air, ease='io'),
        K(6, (0.06, 0.25, 0.08), (0.10, 0.99, 0.22), EL_HI, yaw=4, lean=0, body=air, ease='in'),
        K(7, (0.20, 0.12, 0.10), (0.88, 0.42, 0.22), EL_LO, yaw=-3, lean=7, body=land, ease='lin'),
        K(8, (0.26, -0.04, 0.10), (0.85, -0.50, 0.25), EL_LO, yaw=-6, lean=11, body=land, ease='lin'),
        K(10, (0.25, -0.13, 0.10), (0.56, -0.82, 0.22), EL_LO, yaw=-6, lean=13, body=land, ease='out'),
        K(15, (0.24, -0.14, 0.10), (0.55, -0.83, 0.22), EL_LO, yaw=-6, lean=12, body=land),
    ], rec=10, hit=(7, 10), cancel=14)

def arm_to(Pz, target, pole, side):  # IK a hand to an armature-space point
    apply(Pz); S = PB[P + side + 'Arm'].matrix.translation.copy()
    return arm_ik(Pz, tuple(Vector(target) - S), pole, side)

def weapon_clips():
    """Hand-keyed clips for the classes that used to borrow other moves: axe chop, mace smash, maul slam, great cleave, spear/lance
    thrusts, the bow's draw-and-loose, the boomerang's throw, dagger/rapier drives, the scythe's hook and the staff's windmill.
    Same screen-plane keying as sword_chain(). Hit/cancel numbers index the written frames (0 = the guard)."""
    global blade_dir0
    G = pose(*GUARD); apply(G); blade_dir0 = tuple((arm.matrix_world.to_3x3().inverted() @ blade_axis()).normalized())
    lunge = blend(G, pose('sword_and_shield_slash', 22), 1.0, LOWER); half = blend(G, lunge, 0.55, LOWER)
    # each class lands in its own stance (they all shared the sword's lunge, so at the moment of impact only the weapon mesh
    # told them apart): the axe takes a short step, the mace plants square with the knees bent, the maul drops into a squat
    # under the slam; the great blades and the thrusts keep the long lunge; the scythe and staff work from a planted half step
    crush = blend(half, pose('jump_attack', 101), 0.35, LOWER)
    slam = blend(G, pose('jump_attack', 101), 0.6, LOWER)
    EL_LO, EL_HI, EL_BK = sv(-0.15, -1, 0.45), sv(0.35, 0.6, 0.6), sv(-0.6, -0.4, 0.5)
    def K(f, h, bl, pole, yaw=0, lean=0, body=None, ease='io'):
        return (f, dict(hand=sv(*h), blade=sv(*bl) if bl else None, pole=pole, yaw=yaw, lean=lean, ease=ease, **({'body': body} if body else {})))
    # axe: a one-hand overhead hack, the head travels over the shoulder and bites down in front (heavier than a sword cut)
    swing('vw_chop', [
        K(4, (-0.05, 0.16, 0.09), (-0.62, 0.72, 0.30), EL_HI, yaw=12, lean=-6, ease='out'),
        K(6, (0.03, 0.22, 0.09), (-0.15, 0.97, 0.20), EL_HI, yaw=6, lean=-2, body=half, ease='in'),
        K(7, (0.17, 0.13, 0.10), (0.80, 0.55, 0.22), EL_LO, yaw=-2, lean=5, body=half, ease='lin'),
        K(8, (0.25, -0.03, 0.10), (0.80, -0.55, 0.22), EL_LO, yaw=-4, lean=9, body=half, ease='lin'),
        K(10, (0.24, -0.11, 0.10), (0.50, -0.84, 0.20), EL_LO, yaw=-5, lean=11, body=half, ease='out'),
        K(14, (0.23, -0.11, 0.10), (0.48, -0.85, 0.20), EL_LO, yaw=-4, lean=10, body=lunge),
    ], rec=9, hit=(7, 10), cancel=13)
    # mace: straight overhead and down onto the foe's crown; the follow-through stops low with a jolt
    swing('vw_smash', [
        K(4, (-0.02, 0.20, 0.08), (-0.45, 0.86, 0.25), EL_HI, yaw=10, lean=-7, ease='out'),
        K(6, (0.06, 0.24, 0.08), (0.10, 0.98, 0.18), EL_HI, yaw=4, lean=-3, body=half, ease='in'),
        K(7, (0.20, 0.14, 0.10), (0.78, 0.60, 0.20), EL_LO, yaw=-2, lean=6, body=crush, ease='lin'),
        K(8, (0.27, -0.03, 0.10), (0.85, -0.48, 0.22), EL_LO, yaw=-4, lean=11, body=crush, ease='lin'),
        K(10, (0.26, -0.14, 0.10), (0.58, -0.80, 0.18), EL_LO, yaw=-5, lean=14, body=crush, ease='out'),
        K(14, (0.25, -0.13, 0.10), (0.60, -0.79, 0.18), EL_LO, yaw=-4, lean=13, body=lunge),
    ], rec=10, hit=(7, 10), cancel=13)
    # maul (two hands; the game pulls the left hand onto the haft): heaved up behind the head, a beat of hang, then a full slam
    swing('vw_maul', [
        K(5, (-0.03, 0.22, 0.07), (-0.80, 0.52, 0.28), EL_HI, yaw=10, lean=-9, ease='out'),
        K(8, (0.03, 0.25, 0.07), (-0.55, 0.80, 0.25), EL_HI, yaw=8, lean=-7, body=half, ease='io'),
        K(10, (0.16, 0.18, 0.09), (0.55, 0.82, 0.20), EL_HI, yaw=0, lean=2, body=slam, ease='in'),
        K(11, (0.27, 0.00, 0.10), (0.90, -0.36, 0.22), EL_LO, yaw=-4, lean=11, body=slam, ease='lin'),
        K(13, (0.25, -0.15, 0.10), (0.60, -0.78, 0.18), EL_LO, yaw=-5, lean=17, body=slam, ease='out'),
        K(19, (0.24, -0.15, 0.10), (0.60, -0.78, 0.18), EL_LO, yaw=-4, lean=15, body=lunge),
    ], rec=12, hit=(10, 14), cancel=24)  # a maul commits: ~0.67 s before the next swing
    # greatsword / great axe (two hands; the game pulls the left hand onto the grip): hauled back over the shoulder, then one long
    # diagonal cleave through the foe that drags the body into a deep lunge and holds there — weight over speed
    swing('vw_great', [
        K(5, (-0.06, 0.17, 0.08), (-0.80, 0.50, 0.32), EL_HI, yaw=14, lean=-7, ease='out'),
        K(8, (0.02, 0.23, 0.08), (-0.20, 0.96, 0.22), EL_HI, yaw=8, lean=-3, body=half, ease='in'),
        K(10, (0.17, 0.14, 0.10), (0.78, 0.58, 0.22), EL_LO, yaw=0, lean=4, body=lunge, ease='lin'),
        K(11, (0.26, 0.01, 0.10), (0.93, -0.25, 0.22), EL_LO, yaw=-3, lean=8, body=lunge, ease='lin'),
        K(13, (0.25, -0.10, 0.10), (0.75, -0.62, 0.20), EL_LO, yaw=-5, lean=11, body=lunge, ease='out'),
        K(19, (0.24, -0.11, 0.10), (0.72, -0.66, 0.20), EL_LO, yaw=-4, lean=10, body=lunge),
    ], rec=16, hit=(10, 14), cancel=23)  # a long recovery: the haft comes back to the guard two-handed, no pop
    # spear (forward grip: the shaft lies along the forearm): drawn back by the ribs, then driven out level from the shoulder
    swing('vw_thrust', [
        K(4, (-0.13, -0.04, 0.10), None, EL_BK, yaw=14, lean=-3, body=half, ease='out'),
        K(6, (0.14, 0.00, 0.08), None, EL_LO, yaw=2, lean=4, body=lunge, ease='in'),
        K(7, (0.29, 0.01, 0.07), None, EL_LO, yaw=-6, lean=8, body=lunge, ease='out'),
        K(11, (0.28, 0.00, 0.07), None, EL_LO, yaw=-5, lean=7, body=lunge),
    ], rec=9, hits=[(6, 10)], cancel=12)
    # lance: a longer draw and a deeper, held drive (couched charge)
    swing('vw_lance', [
        K(5, (-0.15, -0.05, 0.10), None, EL_BK, yaw=16, lean=-5, body=half, ease='out'),
        K(8, (0.12, 0.00, 0.08), None, EL_LO, yaw=2, lean=5, body=lunge, ease='in'),
        K(9, (0.29, 0.01, 0.07), None, EL_LO, yaw=-6, lean=10, body=lunge, ease='out'),
        K(15, (0.28, 0.00, 0.07), None, EL_LO, yaw=-5, lean=9, body=lunge),
    ], rec=10, hits=[(8, 13)], cancel=15)
    # bow (held in the sword hand, limb up): raise, nock, draw the string hand back to the cheek, loose with a flick
    DRAW = [(0, 0.0), (3, 0.03), (7, 0.25), (8, 0.29), (9, 0.31), (13, 0.31)]
    def string_hand(p, f):
        d = next(((a1, b1, a2, b2) for (a1, b1), (a2, b2) in zip(DRAW, DRAW[1:]) if a1 <= f <= a2), None)
        if d is None or f > DRAW[-1][0]: return p
        a1, b1, a2, b2 = d; k = ease((f - a1) / max(1, a2 - a1)); amt = b1 + (b2 - b1) * k
        if amt <= 0: return p
        apply(p); R = PB[P + 'RightHand'].matrix.translation.copy()
        T = R - SR * amt + SU * (0.015 + 0.02 * min(1, amt / 0.25)) - SC * 0.03
        q = arm_to(p, tuple(T), sv(-1, 0.25, -0.6), 'Left')
        return blend(p, q, min(1, f / 3.0), None) if f < 3 else q
    swing('vw_shoot', [
        K(3, (0.22, 0.00, 0.06), (0.06, 0.99, 0.10), EL_LO, yaw=-2, lean=1, ease='out'),
        K(7, (0.25, 0.01, 0.06), (0.04, 0.99, 0.10), EL_LO, yaw=4, lean=0, ease='io'),
        K(9, (0.25, 0.00, 0.06), (0.10, 0.99, 0.10), EL_LO, yaw=6, lean=1, ease='out'),
        K(13, (0.24, -0.01, 0.06), (0.10, 0.99, 0.10), EL_LO, yaw=5, lean=1),
    ], rec=8, hit=(8, 9), cancel=11, post=string_hand)
    # boomerang: a whipped side-arm throw — cocked back by the ear, released level in front, the arm follows through low
    swing('vw_hurl', [
        K(3, (-0.12, 0.11, 0.09), (-0.70, 0.55, 0.40), EL_BK, yaw=16, lean=-3, ease='out'),
        K(5, (0.06, 0.12, 0.10), (0.35, 0.85, 0.35), EL_HI, yaw=6, lean=2, body=half, ease='in'),
        K(6, (0.22, 0.05, 0.10), (0.95, 0.15, 0.25), EL_LO, yaw=-3, lean=5, body=half, ease='lin'),
        K(8, (0.21, -0.09, 0.10), (0.60, -0.75, 0.25), EL_LO, yaw=-5, lean=7, body=half, ease='out'),
        K(11, (0.20, -0.10, 0.10), (0.55, -0.80, 0.25), EL_LO, yaw=-4, lean=6, body=half),
    ], rec=8, hit=(6, 7), cancel=10)
    # dagger / rapier: three straight drives with the legs planted (no mocap kicks): each is chambered by the ribs, then the
    # arm snaps out level from the shoulder; the last one steps into a lunge and drops the point a little
    CH = lambda f, yaw, lean=0, d=0.0: K(f, (0.00, -0.10, 0.10), (0.97, 0.10 - d, 0.20), EL_BK, yaw=yaw, lean=lean, body=half, ease='io')
    DR = lambda f, h, d, yaw, lean, body=half: K(f, h, (1.0, d, 0.12), EL_LO, yaw=yaw, lean=lean, body=body, ease='out')
    swing('vw_flurry', [
        CH(2, 14), DR(4, (0.29, 0.02, 0.07), 0.10, -6, 5), DR(5, (0.29, 0.02, 0.07), 0.10, -6, 5),
        CH(7, 12, d=0.05), DR(9, (0.30, 0.00, 0.07), 0.00, -6, 6), DR(10, (0.30, 0.00, 0.07), 0.00, -6, 6),
        CH(12, 16, -2, d=0.10), DR(14, (0.31, -0.03, 0.07), -0.10, -8, 9, lunge), DR(18, (0.30, -0.03, 0.07), -0.10, -7, 8, lunge),
    ], rec=8, hits=[(4, 6), (9, 11), (14, 17)], cancel=18)
    # scythe (two hands): heaved up behind the shoulder, a wide hooking arc that brings the blade down in front at waist height,
    # then the reaping pull: the haft is drawn back level so the blade drags toward the hero (the second hit). Chest <= 16 deg.
    swing('vw_reap', [
        K(5, (-0.08, 0.16, 0.09), (-0.75, 0.60, 0.30), EL_HI, yaw=16, lean=-5, ease='out'),
        K(8, (0.04, 0.22, 0.09), (0.10, 0.98, 0.20), EL_HI, yaw=6, lean=-1, body=half, ease='in'),
        K(10, (0.20, 0.12, 0.10), (0.85, 0.50, 0.20), EL_LO, yaw=-2, lean=5, body=half, ease='lin'),
        K(11, (0.27, 0.00, 0.10), (0.96, -0.18, 0.20), EL_LO, yaw=-5, lean=8, body=half, ease='lin'),
        K(14, (0.26, -0.04, 0.10), (0.92, -0.34, 0.20), EL_LO, yaw=-6, lean=9, body=half, ease='out'),
        K(17, (0.12, -0.06, 0.11), (0.97, -0.25, 0.20), EL_BK, yaw=6, lean=4, body=half, ease='io'),
        K(19, (0.03, -0.05, 0.11), (0.99, -0.10, 0.22), EL_BK, yaw=10, lean=2, body=half, ease='out'),
        K(22, (0.06, 0.05, 0.10), (0.45, 0.85, 0.25), EL_HI, yaw=5, lean=0, body=half, ease='io'),
        K(25, (0.06, 0.05, 0.10), (0.42, 0.86, 0.25), EL_HI, yaw=4, lean=0, body=half),
    ], rec=10, hits=[(9, 14), (16, 20)], cancel=24)
    # staff (two hands): a windmill in the screen plane; the head goes up and over, sweeps down through the foe in front and on
    # round behind the hero low, then comes back up to the guard ready for the cast. Two windows follow the head: the front
    # (it passes the foe between keys 8 and 11) and then behind (keys 13-16); items.js gives each its own box
    swing('vw_whirl', [
        K(4, (-0.04, 0.12, 0.09), (-0.80, 0.55, 0.25), EL_HI, yaw=12, lean=-4, ease='out'),
        K(6, (0.04, 0.20, 0.09), (-0.10, 0.99, 0.20), EL_HI, yaw=6, lean=-1, body=half, ease='in'),
        K(8, (0.16, 0.14, 0.10), (0.80, 0.55, 0.20), EL_LO, yaw=0, lean=4, body=half, ease='lin'),
        K(10, (0.22, 0.02, 0.10), (0.90, -0.35, 0.20), EL_LO, yaw=-4, lean=7, body=half, ease='lin'),
        K(12, (0.16, -0.06, 0.10), (0.20, -0.97, 0.25), EL_LO, yaw=-3, lean=6, body=half, ease='lin'),
        K(14, (0.08, -0.06, 0.11), (-0.70, -0.65, 0.30), EL_BK, yaw=4, lean=3, body=half, ease='lin'),
        K(16, (0.06, 0.00, 0.11), (-0.95, 0.10, 0.30), EL_BK, yaw=8, lean=1, body=half, ease='out'),
        K(19, (0.10, 0.10, 0.09), (-0.30, 0.95, 0.20), EL_HI, yaw=4, lean=0, body=half, ease='io'),
        K(21, (0.10, 0.10, 0.09), (-0.28, 0.95, 0.20), EL_HI, yaw=3, lean=0, body=half),
    ], rec=9, hits=[(7, 11), (13, 16)], cancel=20)

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
    weapon_clips()  # axe/mace/maul/spear/lance/bow/boomerang, keyed the same way
    sword_chain()   # one-hand sword: three hand-keyed cuts (IK hand path + blade direction per key), lunge legs from mocap
    # ---- new weapon classes ---------------------------------------------------------------------------------
    # staff link 2: both hands present the staff head-up and drive it forward (the bolt leaves at the hit frame)
    attack('vw_cast', 'standing_2h_magic_attack_01', 40, 58, 69, 74, na=5, rate=1.1, nf=6, nr=10, legs='guard', legs_w=0.5)
    # ---- grip: finger curl used whenever a weapon is in hand ------------------------------------------------
    g = pose('sword_and_shield_idle', 1); rest = pose('axe_unarmed_idle', 1)
    write('vw_grip', [blend(rest, g, 1, RFING + LFING)] * 2); META['clips']['vw_grip'] = {'frames': 2}
    json.dump(META, open(os.path.join(ROOT, 'assets', 'player', 'moves.json'), 'w'), indent=1)
    print(json.dumps(META['clips'])); print('FACE', json.dumps(FACE))

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
