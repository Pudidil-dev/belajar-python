"""A small ray caster for the operating room in 3D (numpy: one ray per canvas pixel).

World units are centimetres: x runs along the table (to the right), y is up (the floor at 0, the ceiling at 300), z
points towards the camera of the opening shot. The scene is built from spheres, ellipsoids, boxes, capsules and the
lamp head (a short cylinder with a dome). Light comes from the room (a soft ambient light from the ceiling) and from
every LED of the surgical light: each LED is a spotlight aimed at the centre of the light field, with its own beam
cone and its own shadow rays. That is what shows the lamp's effects on the operation: many LEDs from many angles,
so a head in the way leaves a soft, faint shadow instead of a hard one, the light changes colour, the lit spot grows,
and so on. The picture is then turned into pixel art (posterised with an ordered dither, outlined).
"""
import math
import numpy as np
from . import gfx
from . import timeline as T
from .palette import (WALL, CEIL, FLOOR, STEEL, SHELL, DRAPE, GOWN, CAP, MASK, SKIN, GLOVE, FIELD, INSTR, LENS,
                      SENSOR, HEAT, MONITOR, ECG, SCOPE, CCT_RGB, OUTLINE)

W, H = gfx.W, gfx.H
BAYER = gfx.BAYER[:H, :W]
INF = 1e9


def c01(col):
    return np.array(col, np.float32) / 255.0


def norm(v):
    v = np.asarray(v, np.float64)
    return v / np.linalg.norm(v)


# ---------------------------------------------------------------- the camera
class Camera:
    def __init__(self, pos, target, fov=50.0, w=W, h=H):
        self.pos = np.array(pos, np.float64)
        f = norm(np.array(target, np.float64) - self.pos)
        c = np.cross(f, (0.0, 1.0, 0.0))
        if np.linalg.norm(c) < 1e-6:                     # looking straight up or down
            c = np.cross(f, (0.0, 0.0, -1.0))
        r = norm(c)
        u = np.cross(r, f)
        self.f, self.r, self.u, self.w, self.h = f, r, u, w, h
        self.k = math.tan(math.radians(fov) / 2)
        sx = (np.arange(w) + 0.5 - w / 2) / (h / 2) * self.k
        sy = -(np.arange(h) + 0.5 - h / 2) / (h / 2) * self.k
        D = f[None, None, :] + sx[None, :, None] * r[None, None, :] + sy[:, None, None] * u[None, None, :]
        self.D = (D / np.linalg.norm(D, axis=2, keepdims=True)).reshape(-1, 3)

    def project(self, P):
        d = np.asarray(P, np.float64) - self.pos
        z = d @ self.f
        z = np.where(np.abs(z) < 1e-6, 1e-6, z)
        x = (d @ self.r) / (z * self.k) * (self.h / 2) + self.w / 2
        y = -(d @ self.u) / (z * self.k) * (self.h / 2) + self.h / 2
        return x, y, z


# ---------------------------------------------------------------- intersections (O: (3,) or (N,3), D: (N,3))
def dot(a, b):
    return np.einsum('ij,ij->i', a, b) if a.ndim == 2 and b.ndim == 2 else (a * b).sum(-1)


def hit_sphere(O, D, c, r):
    oc = O - c
    b = (oc * D).sum(-1)
    cc = (oc * oc).sum(-1) - r * r
    disc = b * b - cc
    s = np.sqrt(np.maximum(disc, 0))
    t = -b - s
    t = np.where(t > 1e-3, t, -b + s)
    return np.where((disc >= 0) & (t > 1e-3), t, INF)


def hit_ellipsoid(O, D, c, rad):
    o = (O - c) / rad
    d = D / rad
    a = (d * d).sum(-1)
    b = (o * d).sum(-1)
    cc = (o * o).sum(-1) - 1.0
    disc = b * b - a * cc
    s = np.sqrt(np.maximum(disc, 0))
    t = (-b - s) / a
    t = np.where(t > 1e-3, t, (-b + s) / a)
    return np.where((disc >= 0) & (t > 1e-3), t, INF)


def hit_box(O, D, lo, hi):
    with np.errstate(divide='ignore', invalid='ignore'):
        inv = 1.0 / np.where(np.abs(D) < 1e-12, 1e-12, D)
        t1 = (lo - O) * inv
        t2 = (hi - O) * inv
    tmin = np.minimum(t1, t2).max(-1)
    tmax = np.maximum(t1, t2).min(-1)
    t = np.where(tmin > 1e-3, tmin, tmax)
    return np.where((tmax >= np.maximum(tmin, 1e-3)), t, INF)


def hit_capsule(O, D, a, b, r):
    ba = b - a
    oa = O - a
    baba = float(ba @ ba)
    bard = D @ ba
    baoa = oa @ ba if oa.ndim == 2 else np.full(D.shape[0], float(oa @ ba))
    rdoa = (D * oa).sum(-1)
    oaoa = (oa * oa).sum(-1) if oa.ndim == 2 else float(oa @ oa)
    A = baba - bard * bard
    B = baba * rdoa - baoa * bard
    C = baba * oaoa - baoa * baoa - r * r * baba
    h = B * B - A * C
    with np.errstate(divide='ignore', invalid='ignore'):
        t = (-B - np.sqrt(np.maximum(h, 0))) / A
    y = baoa + t * bard
    body = (h >= 0) & (y > 0) & (y < baba) & (t > 1e-3)
    out = np.where(body, t, INF)
    # the rounded ends
    for c in (a, b):
        out = np.minimum(out, hit_sphere(O, D, c, r))
    return out


def hit_disc_y(O, D, cy, cx, cz, r, below_only=False):
    """The horizontal disc y = cy of radius r around (cx, cz)."""
    with np.errstate(divide='ignore', invalid='ignore'):
        t = (cy - O[..., 1]) / D[:, 1]
    P = O + t[:, None] * D
    ok = (t > 1e-3) & ((P[:, 0] - cx) ** 2 + (P[:, 2] - cz) ** 2 <= r * r)
    return np.where(ok, t, INF)


def hit_cylinder_y(O, D, cx, cz, r, y0, y1):
    """A vertical cylinder's side (no caps)."""
    ox, oz = O[..., 0] - cx, O[..., 2] - cz
    dx, dz = D[:, 0], D[:, 2]
    a = dx * dx + dz * dz
    b = ox * dx + oz * dz
    c = ox * ox + oz * oz - r * r
    disc = b * b - a * c
    s = np.sqrt(np.maximum(disc, 0))
    with np.errstate(divide='ignore', invalid='ignore'):
        t = (-b - s) / a
        t2 = (-b + s) / a
    y = O[..., 1] + t * D[:, 1]
    y2 = O[..., 1] + t2 * D[:, 1]
    ok1 = (disc >= 0) & (t > 1e-3) & (y >= y0) & (y <= y1)
    ok2 = (disc >= 0) & (t2 > 1e-3) & (y2 >= y0) & (y2 <= y1)
    return np.where(ok1, t, np.where(ok2, t2, INF))


# ---------------------------------------------------------------- the scene, at time t
FIELD_C = (16.0, 118.0, 0.0)               # the centre of the drape window (the surgical field)
LAMP_R = 35.0
FACE_Y = -5.0                              # the lamp's emitter face, in its own frame
TOP_Y = 4.0
F_DIST = 92.0


def _rings():
    pts = []
    for r, n, ph in ((11.0, 6, 0.0), (20.0, 12, 0.26), (28.5, 16, 0.1)):
        for k in range(n):
            a = ph + 2 * math.pi * k / n
            pts.append((r * math.cos(a), r * math.sin(a)))
    return pts


LEDS = _rings()                            # (u, w) on the face: u along x, w along z (in the lamp's frame)
LED_N = len(LEDS)
LED_WARM = tuple(k % 2 == 0 for k in range(LED_N))     # every other LED is a warm white, the rest cool white
SENSORS = ((LAMP_R - 2.5, 0.0), (-(LAMP_R - 2.5), 0.0), (0.0, LAMP_R - 2.5), (0.0, -(LAMP_R - 2.5)))


def _solo_order():
    """Bar 3: the lone LED (on the outer ring, towards +x), then the rest in groups spread all round the face, so
    every group lights the field from new directions."""
    first = min(range(LED_N), key=lambda j: (LEDS[j][0] - 28.5) ** 2 + LEDS[j][1] ** 2)
    rest = sorted((j for j in range(LED_N) if j != first), key=lambda j: math.atan2(LEDS[j][1], LEDS[j][0]) % (2 * math.pi))
    g = T.SOLO_GROUPS
    return [first] + [j for k in range(g) for j in rest[k::g]]


SOLO_ORDER = _solo_order()

CEIL_MOUNT = (60.0, 300.0, 0.0)
AXIS_LOW = 266.0
J1 = (-6.0, 266.0, 0.0)
ARM_L = 44.0
LAMP_X = 15.0
A0 = -math.degrees(math.acos((LAMP_X - J1[0]) / ARM_L))
YOKE = 15.3


def lamp_pose(t):
    k = T.arm(t)
    a = math.radians(A0 + T.ARM_SWING * k)
    j2 = np.array((J1[0] + ARM_L * math.cos(a), J1[1] + ARM_L * math.sin(a), 0.0))
    tilt = math.radians(-7.0 * k)
    hc = j2 - np.array((0.0, YOKE, 0.0))
    return a, j2, hc, tilt


def rot_z(tilt):
    c, s = math.cos(tilt), math.sin(tilt)
    return np.array([[c, -s, 0.0], [s, c, 0.0], [0.0, 0.0, 1.0]])


def to_world(p, hc, tilt):
    return hc + rot_z(tilt) @ np.asarray(p, np.float64)


def field_centre(t):
    _, _, hc, tilt = lamp_pose(t)
    f = to_world((0.0, -F_DIST, 0.0), hc, tilt)
    return np.array((f[0], FIELD_C[1], 0.0))


def led_world(t):
    _, _, hc, tilt = lamp_pose(t)
    return np.array([to_world((u, FACE_Y - 0.2, w), hc, tilt) for u, w in LEDS])


def head_pos(who, t):
    bob = 0.6 * math.sin(T.wob(13) * t + (0.0 if who == 'A' else 1.7))
    if who == 'A':
        k = T.lean(t)
        return np.array((-18.0 + 26.0 * k, 168.0 + bob - 6.0 * k, -50.0 + 40.0 * k))
    k = T.hand(t)
    return np.array((50.0 - 8.0 * k, 168.0 + bob + 2.0 * k, -50.0 + 14.0 * k))


HOVER = (17.0, 135.0, 1.0)                 # bar 3: where the hand is held, 17 cm over the field
GLOVE_R = np.array((4.8, 2.7, 4.0))        # a gloved hand, palm down


def hands(who, t):
    ph = T.wob(9) * t + (0.0 if who == 'A' else 2.1)
    if who == 'A':
        return (np.array((6.0 + 1.5 * math.sin(ph), 121.5, -7.0 + 1.0 * math.cos(ph))),
                np.array((13.0 + 1.2 * math.sin(ph + 1.3), 122.5, -4.0)))
    k = T.reach(t)
    rest = np.array((22.0 + 1.2 * math.sin(ph + 0.4), 122.0, -6.0))
    held = np.array((HOVER[0] + 0.6 * math.sin(ph), HOVER[1], HOVER[2]))
    h0 = rest + (held - rest) * k
    g = T.hand(t)
    if g > 0:
        h0 = h0 + (handle_grip(t) - h0) * g
    return (h0, np.array((28.0 + 1.0 * math.sin(ph + 2.0), 121.0, -3.0 + 0.8 * math.cos(ph))))


def handle_grip(t):
    """Where the glove holds the sterile handle (it moves with the lamp)."""
    _, _, hc, tilt = lamp_pose(t)
    return to_world((4.6, FACE_Y - 8.0, 2.4), hc, tilt)


def shoulders(who, t):
    h = head_pos(who, t)
    base = np.array((-18.0 if who == 'A' else 50.0, 147.0, -50.0))
    mid = base + 0.55 * (np.array((h[0], h[1] - 21.0, h[2])) - base)
    return mid + np.array((-15.0, 0.0, 0.0)), mid + np.array((15.0, 0.0, 0.0)), mid


def arm_capsules(who, t):
    sl, sr, mid = shoulders(who, t)
    out = []
    for s, hnd in zip((sl, sr), hands(who, t)):
        e = (s + hnd) / 2 + np.array((0.0, -5.0, 6.0))
        fa = hnd - e
        cuff = hnd - fa / np.linalg.norm(fa) * 5.0           # the sleeve ends here; the glove sticks out of it
        out.append((s, e, 5.0))
        out.append((e, cuff, 4.2))
    return out


# ---------------------------------------------------------------- the light's state
def led_power(t, F, L):
    """Every LED's power (0..), its colour, and whether a head is in its way to the field centre."""
    base = T.intensity(t)
    cct = T.cct(t)
    f = min(1.0, max(0.0, (cct - 3000.0) / 3700.0))
    hA = head_pos('A', t)
    blocked = np.zeros(LED_N, bool)
    for j in range(LED_N):
        d = L[j] - F
        dist = np.linalg.norm(d)
        u = d / dist
        oc = F - hA
        b = oc @ u
        cc = oc @ oc - 11.0 ** 2
        disc = b * b - cc
        if disc > 0:
            s1 = -b - math.sqrt(disc)
            blocked[j] = 0.0 < s1 < dist
    p = np.full(LED_N, base)
    on = np.array([T.led_on(j * T.LED_GROUPS // LED_N, t) for j in range(LED_N)])
    p *= on
    so = T.solo(t)
    if so < 1.0:                                       # bar 3: one LED alone, then the rest come back
        mask = np.zeros(LED_N, bool)
        mask[SOLO_ORDER[:max(1, int(round(so * LED_N)))]] = True
        full = p.sum()
        p = np.where(mask, p, 0.0)
        p *= full / max(p.sum(), 1e-6)              # the same light in total, from fewer and fewer directions
    k = T.shift(t)
    if k > 0 and (~blocked).any():
        g = min(1.8, LED_N / max(1, (~blocked).sum()))
        p = np.where(blocked, p * (1 - 0.8 * k), p * (1 + (g - 1) * k))
    warm = np.array(LED_WARM)
    p = p * np.where(warm, 2.0 * (1.0 - f), 2.0 * f)
    cols = np.where(warm[:, None], c01(CCT_RGB[0][1]), c01(CCT_RGB[-1][1]))
    return p, cols, blocked


# ---------------------------------------------------------------- materials
def tiles(a, b, size, line=1.4):
    return (np.abs(np.mod(a, size) - size / 2) > size / 2 - line / 2) | (np.abs(np.mod(b, size) - size / 2) > size / 2 - line / 2)


class Scene:
    """Everything at time t: geometry, materials, lights."""

    def __init__(self, t, cam_view=None):
        self.t = t
        self.a, self.j2, self.hc, self.tilt = lamp_pose(t)
        self.R = rot_z(self.tilt)
        self.F = field_centre(t)
        self.L = led_world(t)
        self.P, self.cols, self.blocked = led_power(t, self.F, self.L)
        self.cam_view = cam_view
        self.room = 1.0 - 0.22 * T.focus_dim(t) - 0.55 * T.endo(t) - 0.3 * T.demo(t)
        self.gain = (1.15 / LED_N) * (1.0 - 0.4 * T.demo(t))
        fw = T.field_d(t) / 2.0
        self.cos_in, self.cos_out = [], []
        for j in range(LED_N):
            d = np.linalg.norm(self.F - self.L[j])
            ang = math.atan2(fw, d)
            self.cos_out.append(math.cos(ang * 1.25))
            self.cos_in.append(math.cos(ang * 0.7))
        self.aim = np.array([(self.F - self.L[j]) / np.linalg.norm(self.F - self.L[j]) for j in range(LED_N)])
        # occluders for the LED shadows: heads, arms, hands
        self.occ = []
        for who in ('A', 'B'):
            self.occ.append(('s', head_pos(who, t), 11.0))
            for a, b, r in arm_capsules(who, t):
                self.occ.append(('c', a, b, r))
            for hnd in hands(who, t):
                self.occ.append(('s', hnd, 3.9))

    def objects(self):
        """(name, kind, params) for every primary-ray object."""
        t = self.t
        ob = [
            ('floor', 'plane_y', 0.0), ('ceiling', 'plane_y', 300.0), ('wall', 'plane_z', -170.0),
            ('wall_l', 'plane_x', -230.0), ('wall_r', 'plane_x', 250.0),
            ('table_base', 'box', (np.array((-32.0, 0.0, -30.0)), np.array((32.0, 6.0, 30.0)))),
            ('table_pillar', 'box', (np.array((-10.0, 6.0, -10.0)), np.array((10.0, 86.0, 10.0)))),
            ('table_top', 'box', (np.array((-112.0, 86.0, -31.0)), np.array((112.0, 92.0, 31.0)))),
            ('drape', 'ellipsoid', (np.array((5.0, 97.0, 0.0)), np.array((95.0, 21.0, 30.0)))),
            ('drape_hang', 'box', (np.array((-112.0, 55.0, 29.0)), np.array((112.0, 92.0, 33.0)))),
            ('drape_hang_b', 'box', (np.array((-112.0, 55.0, -33.0)), np.array((112.0, 92.0, -29.0)))),
            ('instr', 'box', (np.array((34.0, 117.0, 6.0)), np.array((46.0, 118.0, 8.0)))),
            ('vitals_pole', 'capsule', (np.array((-72.0, 0.0, -62.0)), np.array((-72.0, 188.0, -62.0)), 1.6)),
            ('vitals', 'box', (np.array((-88.0, 186.0, -66.0)), np.array((-56.0, 210.0, -58.0)))),
            ('boom', 'capsule', (np.array((82.0, 300.0, -36.0)), np.array((82.0, 226.0, -36.0)), 2.0)),
            ('monitor', 'box', (np.array((58.0, 190.0, -40.0)), np.array((104.0, 220.0, -32.0)))),
        ]
        for who in ('A', 'B'):
            x0 = -18.0 if who == 'A' else 50.0
            sl, sr, mid = shoulders(who, t)
            ob.append(('gown_' + who, 'capsule', (np.array((x0, 30.0, -50.0)), mid + np.array((0.0, -6.0, 0.0)), 19.0)))
            ob.append(('head_' + who, 'sphere', (head_pos(who, t), 11.0)))
            for k, (a, b, r) in enumerate(arm_capsules(who, t)):
                ob.append(('arm_%s%d' % (who, k), 'capsule', (a, b, r)))
            for k, hnd in enumerate(hands(who, t)):
                ob.append(('glove_%s%d' % (who, k), 'ellipsoid', (hnd, GLOVE_R)))
        # the suspension
        ob += [
            ('mount', 'box', (np.array((CEIL_MOUNT[0] - 9, 293.0, -9.0)), np.array((CEIL_MOUNT[0] + 9, 300.0, 9.0)))),
            ('axis', 'capsule', (np.array((CEIL_MOUNT[0], 296.0, 0.0)), np.array((CEIL_MOUNT[0], AXIS_LOW, 0.0)), 3.2)),
            ('ext', 'capsule', (np.array((CEIL_MOUNT[0], AXIS_LOW, 0.0)), np.array(J1), 2.7)),
            ('sarm', 'capsule', (np.array(J1), self.j2, 2.8)),
            ('yoke', 'capsule', (self.j2, to_world((0.0, TOP_Y + 3.0, 0.0), self.hc, self.tilt), 1.6)),
            ('lamp', 'lamp', None),
            ('handle', 'capsule', (to_world((0.0, FACE_Y, 0.0), self.hc, self.tilt),
                                   to_world((0.0, FACE_Y - 14.0, 0.0), self.hc, self.tilt), 3.4)),
        ]
        return ob

    # ------------------------------------------------------------ casting
    def cast(self, O, D):
        """Nearest hit: (t, object index), for rays from O (3,) along D (N,3)."""
        objs = self.objects()
        best = np.full(D.shape[0], INF)
        idx = np.full(D.shape[0], -1, np.int32)
        sub = {}
        for i, (name, kind, prm) in enumerate(objs):
            if kind == 'plane_y':
                with np.errstate(divide='ignore', invalid='ignore'):
                    tt = (prm - O[1]) / D[:, 1]
                tt = np.where(tt > 1e-3, tt, INF)
            elif kind == 'plane_z':
                with np.errstate(divide='ignore', invalid='ignore'):
                    tt = (prm - O[2]) / D[:, 2]
                tt = np.where(tt > 1e-3, tt, INF)
            elif kind == 'plane_x':
                with np.errstate(divide='ignore', invalid='ignore'):
                    tt = (prm - O[0]) / D[:, 0]
                tt = np.where(tt > 1e-3, tt, INF)
            elif kind == 'box':
                tt = hit_box(O, D, prm[0], prm[1])
            elif kind == 'sphere':
                tt = hit_sphere(O, D, prm[0], prm[1])
            elif kind == 'ellipsoid':
                tt = hit_ellipsoid(O, D, prm[0], prm[1])
            elif kind == 'capsule':
                tt = hit_capsule(O, D, prm[0], prm[1], prm[2])
            elif kind == 'lamp':
                Ol = self.R.T @ (O - self.hc)
                Dl = D @ self.R
                t_side = hit_cylinder_y(Ol, Dl, 0.0, 0.0, LAMP_R, FACE_Y, TOP_Y)
                t_face = hit_disc_y(Ol, Dl, FACE_Y, 0.0, 0.0, LAMP_R)
                t_dome = hit_ellipsoid(Ol, Dl, np.array((0.0, TOP_Y, 0.0)), np.array((LAMP_R, 9.0, LAMP_R)))
                Pd = Ol + t_dome[:, None] * Dl
                t_dome = np.where(Pd[:, 1] >= TOP_Y, t_dome, INF)
                tt = np.minimum(np.minimum(t_side, t_face), t_dome)
                part = np.where(tt == t_face, 1, np.where(tt == t_side, 2, 3))
                sub['lamp'] = part
            closer = tt < best
            best = np.where(closer, tt, best)
            idx = np.where(closer, i, idx)
        return best, idx, objs, sub

    # ------------------------------------------------------------ shading
    def shade(self, O, D):
        tt, idx, objs, sub = self.cast(O, D)
        Pts = O + tt[:, None] * D
        n = D.shape[0]
        base = np.zeros((n, 3), np.float32)
        Nrm = np.zeros((n, 3), np.float64)
        emis = np.zeros((n, 3), np.float32)
        lit_ok = np.zeros(n, bool)                       # can the surgical light reach it?
        for i, (name, kind, prm) in enumerate(objs):
            m = idx == i
            if not m.any():
                continue
            P = Pts[m]
            # normals
            if kind == 'plane_y':
                N = np.tile((0.0, 1.0 if name == 'floor' else -1.0, 0.0), (P.shape[0], 1))
            elif kind == 'plane_z':
                N = np.tile((0.0, 0.0, 1.0), (P.shape[0], 1))
            elif kind == 'plane_x':
                N = np.tile((1.0 if name == 'wall_l' else -1.0, 0.0, 0.0), (P.shape[0], 1))
            elif kind == 'box':
                lo, hi = prm
                c = (lo + hi) / 2
                hs = (hi - lo) / 2
                q = (P - c) / hs
                ax = np.argmax(np.abs(q), axis=1)
                N = np.zeros_like(P)
                N[np.arange(P.shape[0]), ax] = np.sign(q[np.arange(P.shape[0]), ax])
            elif kind == 'sphere':
                N = (P - prm[0]) / prm[1]
            elif kind == 'ellipsoid':
                N = (P - prm[0]) / prm[1] ** 2
                N /= np.linalg.norm(N, axis=1, keepdims=True)
            elif kind == 'capsule':
                a, b, r = prm
                ba = b - a
                h = np.clip(((P - a) @ ba) / (ba @ ba), 0, 1)
                N = (P - a - h[:, None] * ba) / r
            elif kind == 'lamp':
                Pl = (P - self.hc) @ self.R
                part = sub['lamp'][m]
                Nl = np.zeros_like(Pl)
                Nl[part == 1] = (0.0, -1.0, 0.0)
                s2 = part == 2
                Nl[s2] = np.column_stack((Pl[s2, 0], np.zeros(s2.sum()), Pl[s2, 2])) / LAMP_R
                s3 = part == 3
                dd = (Pl[s3] - (0.0, TOP_Y, 0.0)) / np.array((LAMP_R, 9.0, LAMP_R)) ** 2
                Nl[s3] = dd / np.linalg.norm(dd, axis=1, keepdims=True)
                N = Nl @ self.R.T
            Nrm[m] = N
            col, em, lit = self.material(name, P, N, m)
            base[m] = col
            emis[m] = em
            lit_ok[m] = lit
        # ambient light from the room (a soft light from above), dimmed in endo mode and while explaining
        up = np.clip(Nrm[:, 1], -1, 1)
        amb = (0.8 + 0.3 * up) * self.room
        light = np.tile(amb[:, None], (1, 3)).astype(np.float32) * c01((255, 252, 246))
        # the surgical light: every LED a spotlight, with its own shadow rays
        tot = np.zeros((n, 3), np.float32)
        cand = np.where(lit_ok & (tt < INF))[0]
        if cand.size:
            Pc = Pts[cand]
            Nc = Nrm[cand]
            for j in range(LED_N):
                if self.P[j] <= 0.01:
                    continue
                Lj = self.L[j]
                v = Lj - Pc
                dist = np.linalg.norm(v, axis=1)
                u = v / dist[:, None]
                cosN = np.clip((Nc * u).sum(1), 0, 1)
                cone = -(u @ self.aim[j])
                spot = np.clip((cone - self.cos_out[j]) / max(self.cos_in[j] - self.cos_out[j], 1e-6), 0, 1)
                spot = spot * spot * (3 - 2 * spot)
                w = cosN * spot
                act = w > 1e-3
                if not act.any():
                    continue
                vis = np.ones(cand.size, bool)
                ai = np.where(act)[0]
                Pa, ua, da = Pc[ai], u[ai], dist[ai]
                for oc in self.occ:
                    if oc[0] == 's':
                        th = hit_sphere(Pa + ua * 0.5, ua, oc[1], oc[2])
                    else:
                        th = hit_capsule(Pa + ua * 0.5, ua, oc[1], oc[2], oc[3])
                    vis[ai[th < da - 1.0]] = False
                e = (w * vis * self.P[j] * (95.0 / np.maximum(dist, 40.0)) ** 2).astype(np.float32)
                tot[cand] += e[:, None] * self.cols[j][None, :]
        lightc = light + tot * self.gain
        rgb = base * lightc + emis
        return rgb, tt, idx, objs, Pts

    def material(self, name, P, N, m):
        """Base colour, emission and whether the surgical light shades it, for the points P of object `name`."""
        t = self.t
        n = P.shape[0]
        col = np.zeros((n, 3), np.float32)
        em = np.zeros((n, 3), np.float32)
        lit = False

        def ramp(r, k):
            return c01(r[k])

        if name == 'floor':
            col[:] = ramp(FLOOR, 1)
            col[tiles(P[:, 0], P[:, 2], 40.0, 1.2)] = ramp(FLOOR, 0)
            lit = True
        elif name in ('wall', 'wall_l', 'wall_r'):
            a = P[:, 0] if name == 'wall' else P[:, 2]
            col[:] = ramp(WALL, 2)
            col[tiles(a, P[:, 1], 30.0, 1.0)] = ramp(WALL, 1)
            col[P[:, 1] < 9.0] = ramp(WALL, 0)
            lit = True
        elif name == 'ceiling':
            col[:] = ramp(CEIL, 1)
            col[tiles(P[:, 0], P[:, 2], 60.0, 1.5)] = ramp(CEIL, 0)
            lam = (np.abs(P[:, 0] - 15.0) < 70.0) & (np.abs(P[:, 2]) < 70.0)
            em[lam] = 0.25 * c01(CEIL[2]) * self.room
        elif name.startswith('table'):
            col[:] = ramp(STEEL, 2 if name == 'table_pillar' else 1)
            lit = True
        elif name == 'drape':
            col[:] = ramp(DRAPE, 2)
            fold = np.abs(np.mod(P[:, 0] + 3.0 * np.sin(P[:, 2] * 0.2), 13.0) - 6.5) < 0.7
            col[fold & (P[:, 1] < 112.0)] = ramp(DRAPE, 1)
            win_ = (np.abs(P[:, 0] - FIELD_C[0]) < 11.0) & (np.abs(P[:, 2]) < 8.0) & (P[:, 1] > 112.0)
            col[win_] = ramp(FIELD, 2)
            edge = win_ & ((np.abs(P[:, 0] - FIELD_C[0]) > 10.0) | (np.abs(P[:, 2]) > 7.0))
            col[edge] = ramp(FIELD, 0)
            lit = True
        elif name.startswith('drape_hang'):
            col[:] = ramp(DRAPE, 1)
            col[np.abs(np.mod(P[:, 0] + 2.0 * np.sin(P[:, 1] * 0.12), 13.0) - 6.5) < 0.8] = ramp(DRAPE, 0)
            lit = True
        elif name == 'instr':
            col[:] = ramp(INSTR, 1)
            lit = True
        elif name in ('vitals_pole', 'boom', 'mount', 'axis', 'ext', 'yoke'):
            col[:] = ramp(STEEL, 2)
            lit = True
        elif name == 'sarm':
            col[:] = ramp(STEEL, 2)
            lit = True
        elif name == 'vitals':
            col[:] = ramp(MONITOR, 2)
            scr = (N[:, 2] > 0.5) & (np.abs(P[:, 0] + 72.0) < 14.0) & (np.abs(P[:, 1] - 198.0) < 10.0)
            col[scr] = ramp(MONITOR, 0)
            x = (P[:, 0] + 86.0) / 28.0
            ph = (t - x * 1.25) / T.BEAT
            f = ph - np.floor(ph)
            y = 198.0 + (6.0 * np.exp(-((f - 0.12) / 0.025) ** 2) - 1.8 * np.exp(-((f - 0.18) / 0.03) ** 2)
                         + 1.0 * np.exp(-((f - 0.45) / 0.07) ** 2))
            trace = scr & (np.abs(P[:, 1] - y) < 0.9)
            em[trace] = c01(ECG)
            lit = True
        elif name == 'monitor':
            col[:] = ramp(MONITOR, 2)
            scr = (N[:, 2] > 0.5) & (np.abs(P[:, 0] - 81.0) < 21.0) & (np.abs(P[:, 1] - 205.0) < 13.0)
            col[scr] = ramp(MONITOR, 0)
            u = np.clip((P[:, 0] - 60.0) / 42.0, 0, 0.999)
            v = np.clip((218.0 - P[:, 1]) / 26.0, 0, 0.999)
            e = T.endo(t)
            cv = T.camview(t)
            if cv > 0 and self.cam_view is not None:
                img = self.cam_view
                hh, ww = img.shape[:2]
                em[scr] = img[(v[scr] * hh).astype(int), (u[scr] * ww).astype(int)] * cv
            elif e > 0:
                cx, cy = (u - 0.5) * 1.5, (v - 0.5)
                rr = cx * cx + cy * cy
                view = scr & (rr < 0.2)
                fold = np.sin(cx * 9.0 + np.sin(cy * 7.0) * 1.6 + t * 0.8) > 0.4
                em[view] = c01(SCOPE[1]) * e
                em[view & fold] = c01(SCOPE[2]) * e
                em[view & (rr > 0.16)] = c01(SCOPE[0]) * e
            lit = True
        elif name.startswith('gown'):
            col[:] = ramp(GOWN, 1)
            lit = True
        elif name.startswith('arm_'):
            col[:] = ramp(GOWN, 2)
            lit = True
        elif name.startswith('glove'):
            col[:] = ramp(GLOVE, 2)
            lit = True
        elif name.startswith('head_'):
            who = name[-1]
            c = head_pos(who, t)
            rel = P - c
            col[:] = ramp(SKIN, 1)
            col[rel[:, 1] > 1.8] = ramp(CAP, 1)
            col[(rel[:, 1] > 1.8) & (np.abs(rel[:, 1] - 2.8) < 0.9)] = ramp(CAP, 0)
            col[rel[:, 1] < -3.2] = ramp(MASK, 1)
            col[(rel[:, 1] < -3.2) & (np.abs(np.mod(rel[:, 1], 2.6) - 1.3) < 0.35)] = ramp(MASK, 0)
            for ex in (-3.6, 3.6):
                eye = ((rel[:, 0] - ex) ** 2 + (rel[:, 1] + 0.6) ** 2 < 1.6) & (rel[:, 2] > 6.0)
                col[eye] = c01(OUTLINE)
            lit = True
        elif name == 'lamp':
            Pl = (P - self.hc) @ self.R
            face = Pl[:, 1] <= FACE_Y + 0.05
            col[:] = ramp(SHELL, 2)
            col[Pl[:, 1] > TOP_Y + 4.0] = ramp(SHELL, 3)
            ang = np.arctan2(Pl[:, 2], Pl[:, 0])
            top = Pl[:, 1] > TOP_Y + 0.5
            fins = top & (np.abs(np.mod(ang * 24.0 / math.pi, 2.0) - 1.0) < 0.22) & \
                (np.hypot(Pl[:, 0], Pl[:, 2]) > 9.0)
            col[fins] = ramp(SHELL, 1)
            hot = T.heat(t)
            if hot > 0:
                em[fins] = c01(HEAT[1]) * 0.9 * hot
                em[top & ~fins] = c01(HEAT[0]) * 0.35 * hot
            col[face] = ramp(STEEL, 1)
            fu, fw_ = Pl[:, 0], Pl[:, 2]
            for j, (u, w) in enumerate(LEDS):
                d2 = (fu - u) ** 2 + (fw_ - w) ** 2
                lensm = face & (d2 < 3.4 ** 2)
                col[lensm] = ramp(LENS, 0)
                core = face & (d2 < 2.2 ** 2)
                col[core] = ramp(LENS, 1)
                pw = self.P[j]
                if pw > 0.01:
                    em[core] = self.cols[j] * min(1.6, 0.35 + 1.1 * pw)
                    em[lensm & ~core] = self.cols[j] * min(0.8, 0.2 + 0.5 * pw)
            for k, (u, w) in enumerate(SENSORS):
                d2 = (fu - u) ** 2 + (fw_ - w) ** 2
                col[face & (d2 < 2.3 ** 2)] = ramp(SHELL, 0)
                col[face & (d2 < 1.6 ** 2)] = ramp(MONITOR, 1)
                if T.scanning(t) and math.sin(t * 2 * math.pi * 3.2 + k) > 0:
                    em[face & (d2 < 0.8 ** 2)] = c01(SENSOR[2])
            lit = False
        elif name == 'handle':
            col[:] = ramp(SHELL, 2)
            Pl = (P - self.hc) @ self.R
            col[(Pl[:, 1] < FACE_Y - 6.0) & (Pl[:, 1] > FACE_Y - 12.0)] = ramp(MASK, 0)
            tip = Pl[:, 1] < FACE_Y - 16.0
            col[tip] = ramp(LENS, 0)
            em[tip & (np.hypot(Pl[:, 0], Pl[:, 2]) < 1.4)] = c01(LENS[2]) * 0.6
            lit = False
        else:
            col[:] = 0.5
            lit = True
        return col, em, np.full(n, lit)


def _palette():
    """Every colour the film may use (the 8-bit palette): the material ramps, the light's whites, the heat view."""
    from . import palette as PL
    cols = [PL.OUTLINE, PL.WHITE, PL.HERO]
    for name in ('WALL', 'CEIL', 'FLOOR', 'STEEL', 'SHELL', 'DRAPE', 'GOWN', 'CAP', 'MASK', 'SKIN', 'GLOVE', 'FIELD',
                 'INSTR', 'LED', 'LENS', 'SENSOR', 'HEAT', 'MONITOR', 'SCOPE', 'SPRING', 'SPARK'):
        cols += list(getattr(PL, name))
    cols += [c for _, c in PL.CCT_RGB] + [PL.ECG]
    cols += [(14, 47, 53), (31, 111, 106), (120, 170, 90), (232, 197, 71), (238, 122, 44), (255, 242, 194)]
    # a few darker shades for the dimmed room (endo mode)
    cols += [(22, 38, 42), (34, 58, 62), (46, 78, 80), (60, 96, 96), (30, 52, 50), (48, 40, 36)]
    # and two warm shades for shadows on the skin in the drape window
    cols += [(150, 112, 86), (98, 72, 58)]
    # and two for the gloves' shaded side (so they stay beige, not grey)
    cols += [(146, 132, 102), (106, 96, 76)]
    out = []
    for c in cols:
        if tuple(c) not in out:
            out.append(tuple(c))
    return np.array(out, np.float32) / 255.0


PALETTE = _palette()


def pixelate(rgb, ids, depth, outline=True, spread=0.075):
    """Snap every pixel to the film's limited palette (nearest colour, with a light ordered dither so the shading
    steps into bands, as in hand-made pixel art) and draw 1-px outlines where one object meets another."""
    hgt, wid = ids.shape
    B = (gfx.BAYER[:hgt, :wid][..., None] - 0.5) * spread
    x = np.clip(rgb, 0, 1).reshape(-1, 3) + B.reshape(-1, 1)
    d = ((x[:, None, :] - PALETTE[None, :, :]) ** 2).sum(-1)
    q = PALETTE[np.argmin(d, axis=1)].reshape(hgt, wid, 3)
    out = (q * 255 + 0.5).astype(np.uint8)
    if outline:
        e = np.zeros((hgt, wid), bool)
        dz = np.abs(np.diff(depth, axis=1)) / np.maximum(depth[:, 1:], 1.0)
        e[:, 1:] |= (ids[:, 1:] != ids[:, :-1]) & (dz > 0.02)
        dz = np.abs(np.diff(depth, axis=0)) / np.maximum(depth[1:, :], 1.0)
        e[1:, :] |= (ids[1:, :] != ids[:-1, :]) & (dz > 0.02)
        out[e] = OUTLINE
    return out


def bloom(rgb, k=0.45, thr=0.95, r=5, mask=None):
    """The light's glow: bright parts (only where `mask` allows) spread a soft halo (a box blur, twice)."""
    lum = rgb.max(-1)
    b = np.clip(lum - thr, 0, None)[..., None] * rgb
    if mask is not None:
        b = b * mask[..., None]
    for _ in range(2):
        for ax in (0, 1):
            c = np.cumsum(np.pad(b, [(r + 1, r) if a == ax else (0, 0) for a in range(3)], mode='edge'), axis=ax)
            if ax == 0:
                b = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
            else:
                b = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return rgb + k * b
