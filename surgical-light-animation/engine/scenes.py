"""What is on screen at time t: the operating room in 3D, and the surgical light working in it.

0-1 s the hook: the operation from the side. 1-2.5 s the camera rises and turns to face the lamp. Then one bar per
function, each showing what the light does to the operation: the lamp's face with its LEDs (bar 1), the rays meeting
at one spot (2), a hand's shadow on the field, hard under one LED and soft once they are all back on (3), a head in the
way and the sensors (4), brightness (5), the warm and cool LEDs mixing the colour (6), the size of the lit spot (7),
endo mode (8), a heat view (9), the sterile handle and its camera's picture on the monitor (10), the spring arm (11);
bar 12 comes back to the opening shot, and the last frame is the first.

Each frame is ray-cast (engine/r3d.py), the rays of light are drawn over it, the light sources glow, and the result is
drawn as 8-bit pixel art: every pixel snapped to the film's limited palette with a light ordered dither, and 1-px
outlines where objects meet. Clean captions name the things on screen.
"""
import math
import numpy as np
from . import gfx
from . import timeline as T
from . import pixfont
from . import r3d as R
from .palette import OUTLINE, WHITE, HERO, SENSOR, HEAT

W, H = gfx.W, gfx.H
SAFE_R = 230

SIDE = ((15.0, 168.0, 262.0), (15.0, 138.0, 0.0), 52.0)
# (time, camera position, target, vertical field of view); interpolated as a monotone cubic
KEYS = (
    (0.0,) + SIDE, (T.HOOK[1],) + SIDE,
    (T.ZOOM_IN[1], (18.0, 132.0, 74.0), (15.0, 209.0, 0.0), 52.0),
    (4.9, (16.0, 142.0, 46.0), (15.0, 210.0, 0.0), 54.0),
    (5.9, (128.0, 178.0, 168.0), (14.0, 160.0, 0.0), 50.0), (7.3, (120.0, 176.0, 176.0), (14.0, 160.0, 0.0), 50.0),
    (7.8, (12.0, 190.0, 72.0), (14.0, 123.0, -2.0), 40.0), (9.9, (16.0, 190.0, 72.0), (16.0, 123.0, -2.0), 40.0),
    (10.6, (34.0, 132.0, 92.0), (12.0, 196.0, -6.0), 56.0), (12.4, (30.0, 134.0, 94.0), (12.0, 196.0, -6.0), 56.0),
    (13.0, (70.0, 202.0, 128.0), (15.0, 121.0, 0.0), 46.0), (14.9, (62.0, 196.0, 120.0), (15.0, 121.0, 0.0), 44.0),
    (15.5, (12.0, 150.0, 58.0), (15.0, 209.0, 0.0), 54.0), (17.4, (14.0, 148.0, 56.0), (15.0, 209.0, 0.0), 54.0),
    (18.0, (20.0, 236.0, 150.0), (15.0, 121.0, 0.0), 46.0), (19.9, (22.0, 240.0, 156.0), (15.0, 121.0, 0.0), 46.0),
    (20.6, (-56.0, 186.0, 222.0), (36.0, 166.0, -18.0), 52.0), (22.4, (-50.0, 186.0, 216.0), (36.0, 166.0, -18.0), 52.0),
    (23.1, (96.0, 250.0, 150.0), (15.0, 180.0, 0.0), 54.0), (24.9, (90.0, 246.0, 146.0), (15.0, 180.0, 0.0), 54.0),
    (25.6, (66.0, 178.0, 168.0), (46.0, 203.0, -16.0), 44.0), (27.4, (64.0, 178.0, 164.0), (46.0, 203.0, -16.0), 44.0),
    (28.2, (150.0, 214.0, 250.0), (12.0, 222.0, 0.0), 54.0), (T.OUT[0], (146.0, 214.0, 246.0), (12.0, 222.0, 0.0), 54.0),
    (T.OUT[1],) + SIDE, (T.TOTAL,) + SIDE,
)


def _pchip(ts, ys):
    n = len(ts)
    h = np.diff(ts)
    d = np.diff(ys) / h
    m = np.zeros(n)
    for i in range(1, n - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    return m


_KT = np.array([k[0] for k in KEYS])
_KV = np.array([tuple(k[1]) + tuple(k[2]) + (k[3],) for k in KEYS])
_KM = np.stack([_pchip(_KT, _KV[:, j]) for j in range(_KV.shape[1])], 1)


def camera(t):
    t = t % T.TOTAL
    i = int(np.clip(np.searchsorted(_KT, t, side='right') - 1, 0, len(_KT) - 2))
    h = _KT[i + 1] - _KT[i]
    u = (t - _KT[i]) / h
    h00, h10, h01, h11 = 2 * u ** 3 - 3 * u ** 2 + 1, u ** 3 - 2 * u ** 2 + u, -2 * u ** 3 + 3 * u ** 2, u ** 3 - u ** 2
    v = h00 * _KV[i] + h10 * h * _KM[i] + h01 * _KV[i + 1] + h11 * h * _KM[i + 1]
    return v[0:3], v[3:6], float(v[6])


def dot(buf, x, y, col, size=1):
    """A square pixel dot at canvas (x, y)."""
    x0, y0 = int(math.floor(x - (size - 1) / 2)), int(math.floor(y - (size - 1) / 2))
    x1, y1 = max(x0, 0), max(y0, 0)
    x2, y2 = min(x0 + size, W), min(y0 + size, H)
    if x2 > x1 and y2 > y1:
        buf[y1:y2, x1:x2] = col


# ---------------------------------------------------------------- captions (3D anchors)
def _a_led(t, sc):
    return sc.L[3]


def _a_spot(t, sc):
    return sc.F + np.array((-6.0, 1.0, 4.0))


def _a_hand(t, sc):
    return R.hands('B', t)[0] + np.array((-1.0, 2.5, 1.0))


def _a_sensor(t, sc):
    return R.to_world((R.SENSORS[1][0], R.FACE_Y, R.SENSORS[1][1]), sc.hc, sc.tilt)


def _a_led_cool(t, sc):
    return sc.L[1]


def _a_edge(t, sc):
    return sc.F + np.array((T.field_d(t) / 2.0, 0.0, 0.0))


def _a_monitor(t, sc):
    return np.array((66.0, 210.0, -32.0))


def _a_top(t, sc):
    return R.to_world((-6.0, R.TOP_Y + 8.0, 0.0), sc.hc, sc.tilt)


def _a_handle(t, sc):
    return R.to_world((0.0, R.FACE_Y - 9.0, 3.0), sc.hc, sc.tilt)


def _a_arm(t, sc):
    return np.array(R.J1) + 0.5 * (sc.j2 - np.array(R.J1))


CAPTIONS = (
    ('LED LIGHTS', 'EACH WITH A LENS', _a_led, T.bar(1) + 0.3, T.bar(2) - 0.1, (1, 1)),
    ('ALL AIMED', 'AT ONE SPOT', _a_spot, T.bar(2) + 0.6, T.bar(3) - 0.1, (-1, -1)),
    ('HANDS IN THE LIGHT', 'SOFT SHADOWS', _a_hand, T.bar(3) + 0.55, T.bar(4) - 0.1, (-1, -1)),
    ('SENSORS', 'SHIFT THE POWER', _a_sensor, T.bar(4) + 0.2, T.bar(5) - 0.1, (-1, 1)),
    ('BRIGHTNESS', 'UP TO 160,000 LUX', _a_spot, T.bar(5) + 0.2, T.bar(6) - 0.1, (-1, -1)),
    ('WARM + COOL LEDS', 'MIX THE COLOR', _a_led_cool, T.bar(6) + 0.2, T.bar(7) - 0.1, (1, 1)),
    ('FIELD SIZE', 'SMALL TO WIDE', _a_edge, T.bar(7) + 0.2, T.bar(8) - 0.1, (1, -1)),
    ('ENDO MODE', 'DIM FOR KEYHOLE SURGERY', _a_monitor, T.bar(8) + 0.4, T.bar(9) - 0.1, (-1, -1)),
    ('HEAT GOES UP', 'HANDS STAY COOL', _a_top, T.bar(9) + 0.4, T.bar(10) - 0.1, (-1, -1)),
    ('STERILE HANDLE', 'CAMERA INSIDE', _a_handle, T.bar(10) + 0.6, T.bar(11) - 0.1, (-1, -1)),
    ('SPRING ARM', 'STAYS PUT', _a_arm, T.bar(11) + 0.3, T.bar(12) - 0.1, (-1, -1)),
)


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        k = i / max(n, 1)
        dot(buf, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, col)


def caption(buf, text, sub, ox, oy, age, life, side):
    """A clean caption: a dot on the object, a thin line, the text typed on; it blinks out at the end."""
    if age < 0 or age > life:
        return
    if life - age < 0.12 and int(age * 30) % 2:
        return
    tw = pixfont.text_size(text, scale=2)[0]
    sw = pixfont.text_size(sub, scale=1)[0] if sub else 0
    bw = max(tw, sw)
    tx = ox + side[0] * 34 - (bw if side[0] < 0 else 0)
    ty = oy + side[1] * 46
    tx = min(max(tx, 8), SAFE_R - bw)
    ty = min(max(ty, 44), 372)
    grow = T.ease_out(age / 0.16, 2.0)
    lx = tx + (bw if side[0] < 0 else 0)
    ly = ty + 18 if sub else ty + 16
    if side[1] > 0:
        ly = ty - 3
    ex, ey = ox + (lx - ox) * grow, oy + (ly - oy) * grow
    _line(buf, ox + 1, oy + 1, ex + 1, ey + 1, OUTLINE)
    _line(buf, ox, oy, ex, ey, WHITE)
    dot(buf, ox, oy, OUTLINE, 5)
    dot(buf, ox, oy, WHITE, 3)
    if grow < 1.0:
        return
    n = int((age - 0.16) * 48) + 1
    shown = text[:max(0, n)]
    if shown:
        pixfont.draw_text(buf, shown, tx, ty, WHITE, anchor='lt', scale=2, outline=OUTLINE)
    if sub and n > len(text):
        pixfont.draw_text(buf, sub[:n - len(text)], tx, ty + 18, HERO, anchor='lt', scale=1, outline=OUTLINE)


# ---------------------------------------------------------------- light in the air
def first_hit(sc, a, u):
    """How far a ray from a along u goes before it meets a head, an arm or a hand (inf if nothing)."""
    D = u[None, :]
    best = R.INF
    for oc in sc.occ:
        th = R.hit_sphere(a, D, oc[1], oc[2]) if oc[0] == 's' else R.hit_capsule(a, D, oc[1], oc[2], oc[3])
        best = min(best, float(th[0]))
    return best


def rays(rgb, depth, cam, sc, t):
    """Every LED's ray to the field, drawn as light in the air (stronger where they cross), hidden behind things."""
    air = 0.6 + 0.6 * T.smooth(T.u_of(t, (T.bar(2), T.bar(2) + 0.4))) * (1 - T.smooth(T.u_of(t, (T.bar(3) - 0.3,
                                                                                                   T.bar(3)))))
    air *= 1.0 - T.thermal(t)
    if air <= 0.02:
        return
    acc = np.zeros((H, W, 3), np.float32)
    for j in range(R.LED_N):
        p = sc.P[j]
        if p <= 0.02:
            continue
        a, b = sc.L[j], sc.F
        d = b - a
        L = np.linalg.norm(d)
        u = d / L
        cut = min(L, first_hit(sc, a, u))
        n = 90
        s = np.linspace(0.0, cut, n)
        P = a[None, :] + s[:, None] * u[None, :]
        x, y, z = cam.project(P)
        xi, yi = np.round(x).astype(int), np.round(y).astype(int)
        ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H) & (z > 1.0)
        xi, yi, z, s = xi[ok], yi[ok], z[ok], s[ok]
        vis = z <= depth[yi, xi] + 2.0
        w = (0.11 + 0.22 * s / max(L, 1.0)) * p * air
        np.add.at(acc, (yi[vis], xi[vis]), (w[vis][:, None] * sc.cols[j][None, :]).astype(np.float32))
    # soften the rays a little (a 3x3 box), then add
    k = acc.copy()
    k[1:-1, 1:-1] = (acc[:-2, 1:-1] + acc[2:, 1:-1] + acc[1:-1, :-2] + acc[1:-1, 2:] + 2 * acc[1:-1, 1:-1]) / 6.0
    rgb += np.clip(k, 0, 0.6)


def heat_view(rgb, ids, objs, Pts, sc, t, k):
    """The heat view: every surface coloured by how warm it is (teal cool .. orange and white hot)."""
    ramp = np.array([(14, 47, 53), (31, 111, 106), (120, 170, 90), (232, 197, 71), (238, 122, 44), (255, 242, 194)],
                    np.float32) / 255.0
    temp = np.full(ids.shape, 0.12, np.float32)
    names = [o[0] for o in objs]
    for i, nm in enumerate(names):
        m = ids == i
        if not m.any():
            continue
        if nm.startswith(('head_', 'glove', 'arm_', 'gown')):
            temp[m] = 0.3 if nm.startswith(('head_', 'glove')) else 0.24
        elif nm == 'drape':
            temp[m] = 0.2
        elif nm == 'lamp':                          # cool at the face (LEDs send little heat forward), hot at the top
            P = Pts.reshape(H, W, 3)[m]
            Pl = (P - sc.hc) @ sc.R
            hgt = np.clip((Pl[:, 1] - R.FACE_Y) / (R.TOP_Y + 9.0 - R.FACE_Y), 0, 1)
            temp[m] = 0.32 + 0.66 * hgt ** 1.3
        elif nm in ('yoke', 'handle'):
            temp[m] = 0.45
        elif nm in ('monitor', 'vitals'):
            temp[m] = 0.32
    x = np.clip(temp, 0, 1) * (len(ramp) - 1)
    i0 = np.floor(x).astype(int)
    i1 = np.minimum(i0 + 1, len(ramp) - 1)
    f = (x - i0)[..., None]
    th = ramp[i0] * (1 - f) + ramp[i1] * f
    sel = gfx.BAYER[:H, :W] < k
    rgb[sel] = th[sel]


def heat_rising(buf_rgb, depth, cam, sc, t, k):
    """Warm specks rising off the top of the lamp."""
    if k <= 0:
        return
    rng = np.random.default_rng(5)
    for i in range(70):
        ang = rng.uniform(0, 2 * math.pi)
        rr = rng.uniform(4.0, 30.0)
        ph = (t * 0.5 + rng.uniform(0, 1)) % 1.0
        p = R.to_world((rr * math.cos(ang), R.TOP_Y + 6.0 + ph * 50.0, rr * math.sin(ang)), sc.hc, sc.tilt)
        p = p + np.array((2.5 * math.sin(ph * 8 + i), 0.0, 0.0))
        x, y, z = cam.project(p[None, :])
        xi, yi = int(round(x[0])), int(round(y[0]))
        if 0 <= xi < W - 1 and 0 <= yi < H - 1 and z[0] > 1 and z[0] <= depth[yi, xi] + 2:
            c = np.array(HEAT[2] if ph < 0.35 else (HEAT[1] if ph < 0.7 else HEAT[0]), np.float32) / 255.0
            buf_rgb[yi:yi + 2, xi:xi + 2] = buf_rgb[yi:yi + 2, xi:xi + 2] * (1 - k) + c * k


def sensor_scan(buf, depth, cam, sc, t):
    """The sensors at work (bar 4): each sends a dotted line down to the field, marching; once the head is in the way
    the lines stop at it with a bright tip, and a ring pings round the head."""
    if not T.scanning(t):
        return
    hA = R.head_pos('A', t)
    found = t > T.T_DETECT
    march = (t * 4.0) % 1.0
    for k, (u, w) in enumerate(R.SENSORS):
        s0 = R.to_world((u, R.FACE_Y - 0.5, w), sc.hc, sc.tilt)
        d = sc.F - s0
        L = float(np.linalg.norm(d))
        ud = d / L
        cut = L
        oc = s0 - hA
        b = oc @ ud
        disc = b * b - (oc @ oc - 11.0 ** 2)
        if found and disc > 0 and 0 < -b - math.sqrt(disc) < L:
            cut = -b - math.sqrt(disc)
        x0, y0, _ = cam.project(s0[None, :])
        x1, y1, _ = cam.project((s0 + ud * cut)[None, :])
        n = int(max(abs(x1[0] - x0[0]), abs(y1[0] - y0[0]))) + 2
        for j in range(n + 1):
            if (j + int(march * 8)) % 8 >= 4 and j < n:          # dashes of 4 px, marching down
                continue
            p = s0 + ud * cut * j / n
            x, y, z = cam.project(p[None, :])
            xi, yi = int(round(x[0])), int(round(y[0]))
            if z[0] <= 1 or not (0 <= xi < W and 0 <= yi < H) or z[0] > depth[yi, xi] + 3.0:
                continue
            tip = cut < L and j == n
            dot(buf, x[0], y[0], OUTLINE, 5 if tip else 3)
            dot(buf, x[0], y[0], SENSOR[2] if tip else SENSOR[1], 3 if tip else 1)
    age = t - T.T_DETECT
    if 0 <= age < 0.6:
        x, y, z = cam.project(hA[None, :])
        if z[0] > 1:
            r = (13.0 + 26.0 * age) / (z[0] * cam.k) * (H / 2)
            n = max(24, int(2 * math.pi * r / 1.5))
            ring = [(x[0] + r * math.cos(2 * math.pi * j / n), y[0] + r * math.sin(2 * math.pi * j / n)) for j in range(n)]
            for px, py in ring:
                dot(buf, px, py, OUTLINE, 3)
            for px, py in ring:
                dot(buf, px, py, SENSOR[2] if age < 0.3 else SENSOR[1], 1)


def handle_camera(sc, t):
    """What the camera in the handle sees (for the monitor): the field from straight above, small."""
    pos = R.to_world((0.0, R.FACE_Y - 18.0, 0.0), sc.hc, sc.tilt)       # just past the handle's tip
    cam = R.Camera(pos, sc.F, 34.0, 48, 32)
    rgb, tt, idx, objs, Pts = sc.shade(cam.pos, cam.D)
    return np.clip(rgb.reshape(32, 48, 3), 0, 1)


# ---------------------------------------------------------------- the frame
GLOWS = ('lamp', 'drape', 'monitor', 'vitals', 'handle', 'ceiling')     # what may glow: light sources, the lit field


def story_frame(t):
    t = t % T.TOTAL
    pos, tgt, fov = camera(t)
    cam = R.Camera(pos, tgt, fov)
    sc0 = R.Scene(t)
    cv = None
    if T.camview(t) > 0:
        cv = handle_camera(sc0, t)
    sc = R.Scene(t, cam_view=cv) if cv is not None else sc0
    rgb, tt, idx, objs, Pts = sc.shade(cam.pos, cam.D)
    rgb = rgb.reshape(H, W, 3)
    depth = tt.reshape(H, W)
    ids = idx.reshape(H, W)
    rays(rgb, depth, cam, sc, t)
    th = T.thermal(t)
    if th > 0:
        heat_view(rgb, ids, objs, Pts, sc, t, th)
    heat_rising(rgb, depth, cam, sc, t, T.heat(t))
    names = [o[0] for o in objs]
    glow = np.isin(ids, [i for i, nm in enumerate(names) if nm in GLOWS])
    rgb = R.bloom(rgb, mask=glow)
    buf = R.pixelate(rgb, ids, depth)
    sensor_scan(buf, depth, cam, sc, t)
    for text, sub, anchor, t0, t1, side in CAPTIONS:
        if t0 <= t < t1:
            p = anchor(t, sc)
            x, y, z = cam.project(np.asarray(p)[None, :])
            if z[0] > 1:
                caption(buf, text, sub, x[0], y[0], t - t0, t1 - t0, side)
    return buf


def render(t, fps=30, scale=gfx.SCALE):
    return gfx.upscale(story_frame(t), scale)


def frame(t):
    return render(t, 30, 1)


def warm():
    pass
