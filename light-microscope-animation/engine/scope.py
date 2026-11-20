"""The microscope: a white compound light microscope in 3D (millimetres, Y up, Z toward the user, X to the right),
ray-traced with engine/rt.py and shaded like a 16-bit pre-rendered sprite.

Parts: a white base with the lamp housing and a glowing field lens, the arm with coaxial coarse and fine focus knobs on
both sides, a dark stage with its aperture, slide holder, spring clip and coaxial stage controls, the condenser under the
stage, a white head with the inclined eyepiece tube and eyepiece, and a chrome nosepiece (tilted, backward-facing) with
four objectives (red 4x, yellow 10x, blue 40x, white 100x bands). The optical axis is x = 0, z = ZA.
"""
import math
import numpy as np
from . import rt, gfx
from . import timeline as T
from .palette import BG, WH, DK, ST, GL, CY, LT, RING, SM, OUTLINE, WHITE

ZA = 18.0                                   # the optical axis (x = 0, z = ZA)
STAGE_TOP = 136.0
SLIDE_T = 1.1
SLIDE_X = -19.5                             # slide centre x when the smear's thin end sits on the optical axis
ALPHA = math.radians(18)                    # nosepiece tilt
A_DOWN = np.array([0.0, -math.cos(ALPHA), -math.sin(ALPHA)])   # the nosepiece axis (pointing down and back)
R_ACT = np.array([0.0, -math.sin(ALPHA), math.cos(ALPHA)])     # radial direction of the objective in use
MOUNT = np.array([0.0, 186.0, ZA])          # where the objective in use screws in
R_O = 20.0
CT = MOUNT - 6 * A_DOWN - R_O * R_ACT       # nosepiece centre
OBJ = [('red', 30.0), ('yellow', 35.0), ('cyan', 40.0), ('white', 42.0)]   # (band colour, length), 90 deg apart
TUBE_AXIS = np.array([0.0, math.sqrt(0.5), math.sqrt(0.5)])
TUBE_BASE = np.array([0.0, 232.0, 34.0])
KNOB_C = np.array([0.0, 78.0, -84.0])       # focus knob axis (along X)
SC_C = np.array([62.0, 0.0, 32.0])          # stage controls (vertical axis), under the stage's right edge

# light: key from the upper left front, fill from the right, rim from behind
L_KEY = rt.norm([-0.5, 0.78, 0.55])
L_FILL = rt.norm([0.8, 0.15, 0.2])
L_RIM = rt.norm([0.3, 0.3, -0.9])

MATS = {}                                   # part name -> (material, id)


def turret_angle(t):
    """Nosepiece rotation (radians): 10x (yellow) in place, a 90-degree turn to the 40x (blue) that locks at TURN[1]."""
    k = T.u_of(t, T.TURN)
    e = T.ease_in_out(k, 2.4)
    return math.radians(90) * (1 - e)


def objective_dirs(psi):
    """For each objective: (mount point, direction)."""
    out = []
    for i, (col, L) in enumerate(OBJ):
        Rm = rt.rot_axis(A_DOWN, psi + math.radians(90) * (i - 2))
        r = Rm @ R_ACT
        D = rt.norm(A_DOWN * math.cos(ALPHA) + r * math.sin(ALPHA))
        m = CT + 6 * A_DOWN + R_O * r
        out.append((m, D, col, L))
    return out


def slide_pos(t):
    """Slide centre x (it slides in from the right) and the clip's swing (0 closed .. 1 open)."""
    if t < T.SLIDE_IN[0]:
        return SLIDE_X + 95.0, 1.0
    x = T.lerp(SLIDE_X + 95.0, SLIDE_X, T.ease_out(T.u_of(t, T.SLIDE_IN), 2.6))
    clip = 1 - T.ease_in(T.u_of(t, T.CLIP), 2.4)
    return x + stage_dx(t), clip


def stage_dx(t):
    """The mechanical stage moving the slide sideways in scene 8 (mm)."""
    return -3.0 * T.ease_in_out(T.u_of(t, T.STAGE_TURN), 2.0)


def build(t):
    """The list of (solid, part) for time t."""
    P = []

    def add(solid, part):
        P.append((solid, part))

    # base, lamp housing, field lens, intensity dial
    add(rt.box((0, 19, -8), (72, 19, 100), bevel=7), 'body_base')
    add(rt.box((0, 26, -112), (36, 17, 9), bevel=4), 'body_vent')
    add(rt.cyl((0, 37.0, ZA), (0, 1, 0), 21, 3.0), 'dark')
    add(rt.cyl((0, 37.5, ZA), (0, 1, 0), 13.5, 3.2), 'lamp')
    add(rt.cyl((71, 19, 52), (1, 0, 0), 12, 7), 'knurl_x')
    # the arm (leaning back a touch)
    Rl = rt.rot_axis([1, 0, 0], math.radians(-3.5))
    add(rt.box((0, 128, -82), (22, 92, 23), R=Rl, bevel=6), 'body_arm')
    # focus knobs (coaxial coarse + fine), both sides
    for sgn in (1, -1):
        ax = (sgn, 0, 0)
        add(rt.cyl(KNOB_C + (sgn * 22, 0, 0), ax, 25, 13), 'knurl_x')
        add(rt.cyl(KNOB_C + (sgn * 35, 0, 0), ax, 13, 11), 'fine_x')
        add(rt.cyl(KNOB_C + (sgn * 46, 0, 0), ax, 6, 2.5), 'chrome')
    # stage carrier, stage with aperture
    add(rt.box((0, 122, -60), (20, 6, 14), bevel=2), 'dark')
    stage = rt.box((0, 132, 14), (68, 4, 62), bevel=1.5)
    hole = rt.cyl((0, 120, ZA), (0, 1, 0), 12.5, 30)
    add(rt.Minus(stage, hole), 'stage')
    # condenser and its holder, iris lever
    add(rt.box((0, 106, -32), (8, 5, 40), bevel=1.5), 'dark')
    add(rt.cyl((0, 99, ZA), (0, 1, 0), 15, 8), 'dark')
    add(rt.cyl((0, 107, ZA), (0, 1, 0), 16.5, 19), 'chrome')
    add(rt.cyl((0, 113, ZA), (0, 1, 0), 17.4, 3.0), 'dark')
    Rv = rt.rot_axis([0, 1, 0], math.radians(-40))
    add(rt.box((12, 104, ZA + 13), (9, 1.2, 1.8), R=Rv), 'chrome')
    # the slide holder: back stop, left stop, spring clip
    sx, clip = slide_pos(t)
    add(rt.box((-18 + stage_dx(t), 138.2, ZA - 15.6), (42, 2.2, 2.1)), 'holder')
    add(rt.box((-59 + stage_dx(t), 138.2, ZA - 2), (2.2, 2.2, 15.5)), 'holder')
    piv = np.array([36.0 + stage_dx(t), 139.0, ZA - 15.0])
    ang = math.radians(-58) * clip
    Rc = rt.rot_axis([0, 1, 0], ang)
    arm_dir = Rc @ rt.norm([-0.82, 0, 0.57])
    Rarm = np.stack([arm_dir, np.array([0, 1.0, 0]), np.cross(arm_dir, [0, 1.0, 0])], 1)
    add(rt.box(piv + arm_dir * 11.5, (11.5, 1.6, 1.6), R=Rarm), 'clip')
    add(rt.cyl(piv - (0, 2.2, 0), (0, 1, 0), 3.2, 4.4), 'clip')
    # the slide
    add(rt.box((sx, STAGE_TOP + SLIDE_T / 2, ZA), (37.5, SLIDE_T / 2, 12.5)), 'slide')
    # stage controls: shaft, Y knob, X knob
    add(rt.cyl(SC_C + (0, 96, 0), (0, 1, 0), 3, 32), 'chrome')
    add(rt.cyl(SC_C + (0, 104, 0), (0, 1, 0), 8.5, 9), 'knurl_y')
    add(rt.cyl(SC_C + (0, 90, 0), (0, 1, 0), 10.5, 10), 'xknob')
    # head, eyepiece tube, eyepiece, eyecup, glass
    add(rt.box((0, 215, -30), (26, 15, 62), bevel=7), 'body_head')
    add(rt.cyl(TUBE_BASE - TUBE_AXIS * 8, TUBE_AXIS, 12.5, 70), 'body_tube')
    e0 = TUBE_BASE + TUBE_AXIS * 62
    add(rt.cyl(e0 - TUBE_AXIS * 2, TUBE_AXIS, 13.6, 4), 'chrome')
    add(rt.cyl(e0 + TUBE_AXIS * 2, TUBE_AXIS, 13.5, 24), 'eyepiece')
    add(rt.Frustum(e0 + TUBE_AXIS * 26, TUBE_AXIS, 13.8, 15.5, 7), 'rubber')
    add(rt.cyl(e0 + TUBE_AXIS * 31.0, TUBE_AXIS, 9.0, 1.4), 'glass')
    # nosepiece and objectives
    psi = turret_angle(t)
    add(rt.Frustum(CT - 9 * A_DOWN, A_DOWN, 25, 30, 9), 'turret')
    add(rt.Frustum(CT, A_DOWN, 30, 23, 6), 'turret')
    for (m, D, col, L) in objective_dirs(psi):
        add(rt.Frustum(m - D * 1.0, D, 9.2, 8.8, 13), 'chrome')
        add(rt.cyl(m + D * 12, D, 9.3, 3.2), 'ring_' + col)
        add(rt.Frustum(m + D * 15, D, 8.4, 6.6, L - 21), 'chrome')
        add(rt.Frustum(m + D * (L - 6.5), D, 6.0, 3.8, 6.5), 'chrome2')
        add(rt.cyl(m + D * (L - 0.2), D, 2.4, 0.6), 'glass')
    return P


# ---------------------------------------------------------------- shading
def _level(n, extra=0.0, amb=0.2, kd=0.75, kf=0.25):
    return amb + kd * np.clip(n @ L_KEY, 0, 1) + kf * np.clip(n @ L_FILL, 0, 1) + extra


def _ramp_pick(rmp, v, th, spread=1.0):
    n = len(rmp)
    idx = np.clip(np.floor(v * (n - 1) + (th - 0.5) * spread + 0.5), 0, n - 1).astype(np.int32)
    return np.asarray(rmp, np.uint8)[idx]


_PARTS = ['body_base', 'body_arm', 'body_head', 'body_tube', 'body_vent', 'dark', 'lamp', 'knurl_x', 'fine_x', 'chrome', 'chrome2', 'stage', 'holder', 'clip',
          'slide', 'knurl_y', 'xknob', 'eyepiece', 'rubber', 'glass', 'turret',
          'ring_red', 'ring_yellow', 'ring_cyan', 'ring_white']
PID = {p: i for i, p in enumerate(_PARTS)}
_DARK = {'body_base': WH[2], 'body_arm': WH[2], 'body_head': WH[2], 'body_tube': WH[2], 'body_vent': WH[2], 'dark': DK[0], 'lamp': LT[1], 'knurl_x': DK[0], 'fine_x': DK[0],
         'chrome': ST[1], 'chrome2': ST[1], 'stage': DK[0], 'holder': DK[0], 'clip': ST[0], 'slide': GL[1],
         'knurl_y': DK[0], 'xknob': DK[0], 'eyepiece': DK[0], 'rubber': DK[0], 'glass': GL[0], 'turret': ST[1],
         'ring_red': RING['red'][0], 'ring_yellow': RING['yellow'][0], 'ring_cyan': RING['cyan'][0],
         'ring_white': RING['white'][0]}


def _knurl(p, axis, center, phase, n=28):
    """Stripes around an axis (for knurled knobs); phase turns them."""
    v = p - center
    a = np.asarray(axis, np.float64)
    if abs(a[0]) > 0.5:
        ang = np.arctan2(v[:, 2], v[:, 1])
    else:
        ang = np.arctan2(v[:, 2], v[:, 0])
    return (np.floor((ang + phase) / (2 * math.pi) * n) % 2) == 0


def knob_phase(t):
    """Turn of the fine-focus knob (scene 7) and the stage's X control (scene 8), radians."""
    fine = math.radians(32) * T.ease_in_out(T.u_of(t, (T.FINE_TURN[0] + 0.1, T.FINE_TURN[1] - 0.05)), 2.0)
    xk = math.radians(48) * T.ease_in_out(T.u_of(t, (T.STAGE_TURN[0] + 0.1, T.STAGE_TURN[1] - 0.05)), 2.0)
    return fine, xk


def shade(buf, pid, depth, nrm, hit, view, t):
    th_all = gfx.BAYER[:buf.shape[0], :buf.shape[1]]
    fine, xk = knob_phase(t)
    sx, _ = slide_pos(t)
    for name, k in PID.items():
        m = pid == k
        if not m.any():
            continue
        n = nrm[m]
        p = hit[m]
        th = th_all[m]
        v = -view[m]
        h = n @ rt.norm(L_KEY + np.array([0.2, 0.0, 0.9]))
        spec = np.clip(h, 0, 1) ** 18
        if name.startswith('body'):
            lv = _level(n, 0.12, amb=0.28, kd=0.72)
            col = _ramp_pick(WH, np.clip(lv, 0, 1), th, 1.2)
            col[spec > 0.55] = WH[7]
            if name == 'body_vent':
                vent = (np.abs(n[:, 0]) > 0.7) & ((np.floor((p[:, 2] + 200) / 3.2) % 2) == 0) & \
                       (np.abs(p[:, 1] - 26) < 9)
                col[vent] = WH[1]
        elif name in ('dark', 'stage', 'holder', 'eyepiece', 'rubber', 'knurl_x', 'fine_x', 'knurl_y', 'xknob'):
            lv = _level(n, -0.05, amb=0.16, kd=0.62)
            col = _ramp_pick(DK, np.clip(lv, 0, 1), th, 1.0)
            col[spec > 0.45] = DK[5]
            col[spec > 0.8] = DK[6]
            if name in ('knurl_x', 'fine_x'):
                ph = fine if name == 'fine_x' else 0.0
                side = np.abs(n[:, 0]) < 0.6
                stripe = _knurl(p, (1, 0, 0), KNOB_C, ph, 40 if name == 'knurl_x' else 26) & side
                col[stripe] = DK[1]
                face = ~side
                col[face] = _ramp_pick(DK, np.clip(lv[face] + 0.12, 0, 1), th[face], 1.0)
                if name == 'fine_x':                 # a white index line on the face shows the knob turning
                    v_ = p - KNOB_C
                    a_ = np.arctan2(v_[:, 2], v_[:, 1]) - ph
                    rr_ = np.hypot(v_[:, 1], v_[:, 2])
                    mark = face & (np.abs(np.angle(np.exp(1j * (a_ - 0.9)))) < 0.16) & (rr_ > 6.5) & (rr_ < 12)
                    col[mark] = WH[6]
                    ridge = face & (rr_ > 10.6)
                    col[ridge & _knurl(p, (1, 0, 0), KNOB_C, ph, 26)] = DK[2]
            if name in ('knurl_y', 'xknob'):
                ph = xk if name == 'xknob' else 0.0
                side = np.abs(n[:, 1]) < 0.6
                stripe = _knurl(p, (0, 1, 0), SC_C, ph, 24) & side
                col[stripe] = DK[1]
            if name == 'stage':
                rim = np.hypot(p[:, 0], p[:, 2] - ZA) < 14.5
                col[rim & (n[:, 1] > 0.9)] = DK[4]
        elif name in ('chrome', 'chrome2', 'turret', 'clip'):
            env = 0.5 + 0.45 * n[:, 1] + 0.15 * (n @ L_FILL)
            lv = 0.15 + 0.7 * np.clip(env, 0, 1) + 0.25 * np.clip(n @ L_KEY, 0, 1)
            col = _ramp_pick(ST, np.clip(lv, 0, 1), th, 1.4)
            col[spec > 0.35] = ST[6]
            rim = (1 - np.abs((n * v).sum(1))) ** 3
            col[(rim > 0.5) & (n[:, 0] > 0.2)] = CY[4]
            if name == 'chrome2':
                col = _ramp_pick(ST, np.clip(lv - 0.12, 0, 1), th, 1.4)
                col[spec > 0.35] = ST[6]
        elif name.startswith('ring_'):
            rmp = RING[name[5:]]
            lv = _level(n, 0.0, amb=0.3, kd=0.65)
            col = _ramp_pick(rmp, np.clip(lv, 0, 1), th, 1.0)
            col[spec > 0.5] = WHITE
        elif name == 'glass':
            lv = 0.25 + 0.6 * np.clip(n @ L_KEY, 0, 1)
            col = _ramp_pick(GL[:5], np.clip(lv, 0, 1), th, 1.0)
            col[spec > 0.3] = CY[5]
        elif name == 'lamp':
            r = np.hypot(p[:, 0], p[:, 2] - ZA) / 13.5
            lv = 1.0 - 0.7 * r ** 1.5
            col = _ramp_pick(LT[2:], np.clip(lv, 0, 1), th, 1.2)
            col[(r > 0.45) & (r < 0.62) & (p[:, 0] < -2) & (p[:, 2] < ZA)] = WHITE
        elif name == 'slide':
            col = _slide_colours(p, n, th, sx)
        else:
            col = np.full((len(n), 3), 128, np.uint8)
        buf[m] = col
    rt.outline(buf, pid, depth, lambda k: _DARK[_PARTS[k]], OUTLINE)


def _slide_colours(p, n, th, sx):
    from . import slide as SL
    top = n[:, 1] > 0.9
    col = np.empty((len(p), 3), np.uint8)
    col[:] = GL[2]
    col[~top] = CY[4]
    xl = p[:, 0] - sx                     # along the slide: -37.5 .. 37.5
    zl = p[:, 2] - ZA                     # across it
    y_mm = xl - 7.5                       # the macro view's coordinates (the drop at 0, the far end at +34)
    x_mm = zl
    tk = SL.film_thickness(x_mm, y_mm, SL.Y_END)
    a = np.clip(tk * 1.15 + 0.1, 0, 1) * (tk > 0.015)
    show = top & (a > th)
    idx = np.clip(np.floor(7.2 - np.clip(tk, 0, 1) * 6.0 - th * 1.2), 1, 7).astype(int)
    col[show] = np.asarray(SM, np.uint8)[idx[show]]
    fr = top & (y_mm >= SL.FROST[0]) & (y_mm <= SL.FROST[1])
    col[fr] = np.where((th[fr] < 0.5)[:, None], np.asarray(WH[5], np.uint8), np.asarray(WH[4], np.uint8))
    plain = top & ~show & ~fr
    col[plain & (th < 0.4)] = GL[3]
    return col


# ---------------------------------------------------------------- shots
def bench(buf, cam, t):
    """The navy bench with its dot grid and the microscope's soft contact shadow."""
    buf[:] = BG[3]
    Y, X = np.mgrid[0:buf.shape[0], 0:buf.shape[1]]
    gx = (X + int(round(cam.eye[0] * 0.3))) % 24
    gy = (Y + int(round(cam.eye[1] * 0.3))) % 24
    buf[(gx == 0) & (gy == 0)] = BG[5]
    # contact shadow: project a flat ellipse under the base
    cx, cy, _ = cam.project((6, 0, -6))
    ex, _, _ = cam.project((85, 0, -6))
    _, ey, _ = cam.project((6, 0, 100))
    rx = max(abs(ex - cx), 4)
    ry = max(abs(ey - cy), 3)
    sh = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 < 1
    buf[sh] = BG[1]


def orbit(target, dist, az, el, roll_up=(0, 1, 0), fov=30.0):
    az, el = math.radians(az), math.radians(el)
    d = np.array([math.sin(az) * math.cos(el), math.sin(el), math.cos(az) * math.cos(el)])
    return rt.Camera(np.asarray(target, np.float64) + d * dist, target, roll_up, fov)


WIDE = dict(target=(0.0, 150.0, -4.0), dist=780.0, az=48.0, el=14.0)


def camera(t):
    """The 3D camera for scenes 4, 5, 7 and 8."""
    def mix(a, b, k):
        return {key: (T.lerp3(a[key], b[key], k) if isinstance(a[key], tuple) else T.lerp(a[key], b[key], k))
                for key in a}
    sx, _ = slide_pos(t)
    stage = dict(target=(max(sx + 19.5, 0.0) * 0.45 - 8.0, 137.0, ZA - 6.0), dist=235.0, az=26.0, el=36.0)
    turret = dict(target=(0.0, 158.0, 10.0), dist=240.0, az=40.0, el=6.0)
    lamp = dict(target=(0.0, 52.0, ZA), dist=185.0, az=34.0, el=30.0)
    fine = dict(target=(42.0, 80.0, -84.0), dist=125.0, az=58.0, el=12.0)
    ctrl = dict(target=(56.0, 112.0, 26.0), dist=135.0, az=48.0, el=12.0)
    if t < T.PULLBACK[0]:
        c = stage
    elif t < T.TO_TURRET[0]:
        k = T.ease_in_out(T.u_of(t, T.PULLBACK), 2.4)
        c = mix(stage, WIDE, k)
        c['dist'] = stage['dist'] * (WIDE['dist'] / stage['dist']) ** k
    elif t < T.DOWN[0]:
        k = T.ease_in_out(T.u_of(t, T.TO_TURRET), 2.2)
        c = mix(WIDE, turret, k)
        c['dist'] = WIDE['dist'] * (turret['dist'] / WIDE['dist']) ** k
    elif t < T.XRAY_ON[0]:
        k = T.ease_in(T.u_of(t, T.DOWN), 1.6)
        c = mix(turret, lamp, k)
    elif t < T.STAGE_TURN[0]:
        c = dict(fine)
        c['dist'] = fine['dist'] - 8 * T.u_of(t, T.FINE_TURN)
    else:
        c = dict(ctrl)
        c['dist'] = ctrl['dist'] - 8 * T.u_of(t, T.STAGE_TURN)
    return orbit(c['target'], c['dist'], c['az'], c['el'])


def render(buf, t, cam=None):
    cam = cam if cam is not None else camera(t)
    bench(buf, cam, t)
    parts = [(s, PID[name]) for s, name in build(t)]
    pid, depth, nrm, hit, view = rt.trace(cam, parts)
    shade(buf, pid, depth, nrm, hit, view, t)
    return buf
