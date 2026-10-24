"""World F: one hollow fiber and its membrane, down to molecules.

Fiber axis vertical at x = 135: lumen (blood) 100..170, membrane walls
93..100 and 170..177 with pores, dialysate outside. Blood flows down,
dialysate flows up (counter-current).

Every particle is a pure function of time (no simulation state), so any
frame can be rendered alone and audio events are known exactly:
  * urea crosses the membrane at scheduled, beat-quantised times (diffusion)
  * red cells and albumin drift into the wall and bounce back (retained)
  * water streams through the pores in straight lines under pressure (UF)
  * a second urea set crosses along the whole fiber (counter-current view)
"""
import math

import numpy as np

from pal import *  # noqa: F401,F403
from px import (BAYER4, H, W, Cam, clamp, dilate, disc_mask, ellipse_mask, hash01,
                lerp, poly_mask, seg, shift, smooth, ease_io)

FX = 135.0
LUM = 35.0
WALL = 7.0
XL0, XL1 = FX - LUM, FX + LUM            # 100, 170
WL = (XL0 - WALL, XL0)                   # 93..100
WR = (XL1, XL1 + WALL)                   # 170..177
PS = 11.0                                # pore spacing
SLANT = 1.4                              # pore channel drop across the wall
V_B = 24.0                               # blood flow (down, +y)
V_D = 32.0                               # dialysate flow (up, -y)
R_RBC = 6.5
R_UREA = 0.95
R_WATER = 0.62
Y_LO, PY = -700.0, 1800.0                # wrap window for steady streams


J0, J1 = -400, 600
_PORE_Y = np.array([PS * j + 4.0 * (hash01(91, j) - 0.5) for j in range(J0, J1)])
_PORE_G = np.array([2.35 * (0.92 + 0.16 * hash01(92, j)) for j in range(J0, J1)])


def pore_y(j):
    return float(_PORE_Y[int(j) - J0])


def pore_gap(j):
    return float(_PORE_G[int(j) - J0])


def nearest_pore(y):
    j = int(round(y / PS))
    return j, pore_y(j)


def wrapy(y):
    return Y_LO + np.mod(y - Y_LO, PY)


# ------------------------------------------------------------------ camera
def _k(t, a, b, ease):
    return ease(seg(t, a, b))


CAM_KEYS = [
    # (t, cx, cy, zoom, ease into this key)
    (9.90, 135.0, 240.0, 0.60, None),
    (10.70, 135.0, 240.0, 1.45, "out"),
    (13.60, 135.0, 240.0, 1.45, "io"),
    (15.20, 173.5, 240.0, 2.60, "io"),
    (19.60, 173.5, 240.0, 2.60, "io"),
    (23.80, 173.5, 172.0, 2.60, "io"),
    (24.10, 173.5, 172.0, 2.60, "io"),
    (25.00, 168.0, 178.0, 3.20, "io"),
    (27.00, 168.0, 178.0, 3.20, "io"),
    (27.80, 173.5, 172.0, 2.60, "io"),
    (30.00, 173.5, 172.0, 2.60, "io"),
    (31.00, 160.0, 172.0, 2.00, "io"),
    (37.00, 160.0, 172.0, 2.00, "io"),
    (38.60, 135.0, 210.0, 0.95, "tail"),
    (42.50, 135.0, 210.0, 0.95, "io"),
    (43.50, 135.0, 210.0, 0.18, "in"),
]


def _ease(name, x):
    x = clamp(x, 0.0, 1.0)
    if name == "out":
        return 1 - (1 - x) ** 4
    if name == "in":
        return x ** 3
    if name == "tail":
        return 1 - (1 - x) ** 3.2
    return ease_io(x)


def cam_f(t):
    ks = CAM_KEYS
    if t <= ks[0][0]:
        return Cam(ks[0][1], ks[0][2], ks[0][3])
    for i in range(1, len(ks)):
        if t <= ks[i][0]:
            t0, x0, y0, z0, _ = ks[i - 1]
            t1, x1, y1, z1, e = ks[i]
            k = _ease(e, (t - t0) / (t1 - t0))
            z = math.exp(lerp(math.log(z0), math.log(z1), k))
            return Cam(lerp(x0, x1, k), lerp(y0, y1, k), z)
    k = ks[-1]
    return Cam(k[1], k[2], k[3])


# ---------------------------------------------------------- event schedule
UREA_TIMES = ([16.25, 17.0, 17.5, 17.75, 18.0, 18.5, 18.75, 19.0, 19.25] +
              [19.5, 19.75, 20.0, 20.5, 20.75, 21.0, 21.25, 21.5, 22.0, 22.25, 22.5, 22.75, 23.0, 23.5, 23.75] +
              [24.25, 25.5, 26.25, 27.25, 27.75, 28.5, 29.0, 29.5] +
              [30.5, 31.5, 32.5, 33.5, 34.5, 35.5, 36.25])
RBC_BOUNCES = [(25.10, 180.0), (26.35, 150.0)]
ALB_BOUNCES = [(27.55, 182.0), (28.30, 150.0), (29.10, 198.0)]


def _crossers():
    out = []
    for k, tc in enumerate(UREA_TIMES):
        c = cam_f(tc)
        if k == 0:
            off = -8.0
        else:
            rng = 40.0 if c.z > 2.5 else 52.0
            off = (hash01(301, k) * 2 - 1) * rng - 4.0
        j, yp = nearest_pore(c.cy + off)
        out.append({"tc": tc, "j": j, "yp": yp, "x0": 118.0 + 40.0 * hash01(302, k),
                    "ph": 6.28 * hash01(303, k)})
    return out


CROSSERS = _crossers()


def audio_events():
    """(time, kind, info) for the sound designer."""
    ev = [(c["tc"], "urea_cross", i) for i, c in enumerate(CROSSERS)]
    ev += [(tb, "rbc_bounce", i) for i, (tb, _) in enumerate(RBC_BOUNCES)]
    ev += [(tb, "alb_bounce", i) for i, (tb, _) in enumerate(ALB_BOUNCES)]
    return ev


# ------------------------------------------------------------- particles
def _bounce_x(t, tb, x_rest, x_contact, t_in=0.75, t_out=0.45):
    if t <= tb:
        k = math.exp(-((tb - t) / t_in) ** 2)
    else:
        k = math.exp(-((t - tb) / t_out) ** 2)
    return x_rest + (x_contact - x_rest) * k


class RBCs:
    def __init__(self):
        lanes = [114.0, 135.0, 156.0]
        self.items = []
        for li, lx in enumerate(lanes):
            n = 26
            for k in range(n):
                y0 = PY * k / n + 40.0 * hash01(401, li, k) + 23.0 * li
                self.items.append({"x": lx + 3 * (hash01(402, li, k) - 0.5), "y0": y0, "b": None,
                                   "w": 0.5 + 1.1 * hash01(403, li, k), "p": 6.28 * hash01(404, li, k),
                                   "th": 0.9 * (hash01(405, li, k) - 0.5), "id": (li, k)})
        # bouncers replace lattice cells in the right lane near their path
        for bi, (tb, yb) in enumerate(RBC_BOUNCES):
            y0 = yb - V_B * tb
            keep = []
            for it in self.items:
                if abs(it["x"] - 156) < 4:
                    dy = (it["y0"] - y0 - Y_LO) % PY
                    if dy < 34 or dy > PY - 34:
                        continue
                keep.append(it)
            self.items = keep
            self.items.append({"x": 152.0, "y0": y0, "b": (tb, yb), "w": 0.7, "p": 1.2 + bi,
                               "th": 0.2, "id": ("b", bi), "free": True})

    def state(self, t):
        out = []
        for it in self.items:
            if it.get("free"):
                y = it["y0"] + V_B * t
            else:
                y = float(wrapy(it["y0"] + V_B * t))
            x = it["x"] + 2.2 * math.sin(0.55 * t + it["p"])
            squash = 1.0
            if it["b"] is not None:
                tb, yb = it["b"]
                x = _bounce_x(t, tb, it["x"], XL1 - R_RBC * 0.92)
                squash = 1.0 - 0.16 * math.exp(-((t - tb) / 0.09) ** 2)
            phi = it["p"] + it["w"] * t
            out.append((x, y, phi, it["th"] + 0.25 * math.sin(0.4 * t + it["p"]), squash, it["id"]))
        return out


class Albumin:
    def __init__(self):
        self.items = []
        n = 120
        for k in range(n):
            self.items.append({"x": 104.0 + 62.0 * hash01(501, k), "y0": PY * hash01(502, k),
                               "p": 6.28 * hash01(503, k), "w": 0.4 + 0.8 * hash01(504, k), "b": None})
        for bi, (tb, yb) in enumerate(ALB_BOUNCES):
            y0 = yb - V_B * tb
            self.items = [it for it in self.items
                          if not (it["x"] > 150 and abs(((it["y0"] - y0 - Y_LO) % PY) - PY / 2) > PY / 2 - 14)]
            self.items.append({"x": 158.0 - 4 * bi, "y0": y0, "p": 2.0 + bi, "w": 0.6, "b": (tb, yb),
                               "free": True})

    def state(self, t):
        out = []
        for it in self.items:
            y = it["y0"] + V_B * t if it.get("free") else float(wrapy(it["y0"] + V_B * t))
            x = it["x"] + 2.4 * math.sin(0.8 * t + it["p"])
            if it["b"] is not None:
                tb, _ = it["b"]
                x = _bounce_x(t, tb, it["x"], XL1 - 2.6, t_in=0.6, t_out=0.4)
            out.append((x, y, it["p"] + it["w"] * t, it["b"] is not None))
        return out


class Urea1:
    """Diffusion scenes: dense urea in blood, sparse in dialysate, scheduled crossers."""

    def __init__(self):
        n = 380
        self.lx = 102.0 + 66.0 * np.array([hash01(601, k) for k in range(n)])
        self.ly = np.array([PY * hash01(602, k) for k in range(n)])
        self.lp = np.array([6.28 * hash01(603, k) for k in range(n)])
        m = 46
        side = np.array([1 if hash01(604, k) < 0.5 else -1 for k in range(m)])
        self.dx = np.where(side > 0, 182.0 + 70.0 * np.array([hash01(605, k) for k in range(m)]),
                           88.0 - 70.0 * np.array([hash01(606, k) for k in range(m)]))
        self.dy = np.array([PY * hash01(607, k) for k in range(m)])
        self.dp = np.array([6.28 * hash01(608, k) for k in range(m)])

    def state(self, t):
        x = self.lx + 1.6 * np.sin(1.3 * t + self.lp)
        y = wrapy(self.ly + V_B * t + 1.2 * np.sin(1.7 * t + self.lp * 1.3))
        dx = self.dx + 1.6 * np.sin(1.1 * t + self.dp)
        dy = wrapy(self.dy - V_D * t)
        pts = list(zip(x, y)) + list(zip(dx, dy))
        for c in CROSSERS:
            p = crosser_pos(c, t)
            if p is not None:
                pts.append(p)
        return pts


def crosser_pos(c, t):
    tc, yp = c["tc"], c["yp"]
    ta = tc - 0.10
    if t < tc - 6.0 or t > tc + 6.0:
        return None
    if t <= ta:
        k = smooth((t - (ta - 1.3)) / 1.3)
        wob = (1 - k) * 1.6 * math.sin(1.3 * t + c["ph"])
        x = lerp(c["x0"], XL1 - R_UREA - 0.2, k) + wob
        y = yp + V_B * (t - ta) + (1 - k) * 1.2 * math.sin(1.7 * t + c["ph"])
        return (x, y)
    if t <= tc + 0.10:
        k = (t - ta) / 0.20
        return (lerp(XL1 - R_UREA, WR[1] + R_UREA, k), yp + SLANT * (k - 0.5))
    dt = t - (tc + 0.10)
    x = WR[1] + R_UREA + 12.0 * (1 - math.exp(-dt / 0.5)) + min(1.0, dt) * 1.6 * math.sin(1.1 * t + c["ph"])
    return (x, yp + SLANT * 0.5 - V_D * dt)


class UreaCC:
    """Counter-current view: urea enters at the top of the fiber, crosses either
    wall at an exponentially distributed height, then rides the dialysate up."""

    def __init__(self):
        self.p = []
        rate = 16.0
        t = -12.0
        k = 0
        while t < 45.0:
            yc = -160.0 + -260.0 * math.log(1.0 - 0.98 * hash01(701, k))
            self.p.append({"te": t, "x": 104 + 62 * hash01(702, k), "yc": yc,
                           "side": 1 if hash01(703, k) < 0.5 else -1, "ph": 6.28 * hash01(704, k),
                           "drift": 6 + 30 * hash01(705, k)})
            t += 1.0 / rate
            k += 1

    def state(self, t):
        pts = []
        for q in self.p:
            age = t - q["te"]
            if age < 0:
                break
            y = -160.0 + V_B * age
            if y < q["yc"]:
                if y > 640:
                    continue
                pts.append((q["x"] + 1.4 * math.sin(1.3 * t + q["ph"]), y))
            else:
                tc = q["te"] + (q["yc"] + 160.0) / V_B
                dt = t - tc
                yy = q["yc"] - V_D * dt
                if yy < -220:
                    continue
                if q["side"] > 0:
                    xx = WR[1] + 2 + q["drift"] * (1 - math.exp(-dt / 0.8))
                else:
                    xx = WL[0] - 2 - q["drift"] * (1 - math.exp(-dt / 0.8))
                if dt < 0.12:
                    k = dt / 0.12
                    xx = lerp(XL1 if q["side"] > 0 else XL0, WR[1] if q["side"] > 0 else WL[0], k)
                    yy = q["yc"]
                pts.append((xx, yy))
        return pts


class Water:
    """Background water (shown when the story turns to water) + UF streams."""

    def __init__(self):
        n = 260
        self.x = np.array([102.0 + 66.0 * hash01(801, k) for k in range(n)])
        self.y = np.array([PY * hash01(802, k) for k in range(n)])
        self.p = np.array([6.28 * hash01(803, k) for k in range(n)])
        m = 220
        side = np.array([1 if hash01(804, k) < 0.5 else -1 for k in range(m)])
        self.dx = np.where(side > 0, 180.0 + 80.0 * np.array([hash01(805, k) for k in range(m)]),
                           90.0 - 80.0 * np.array([hash01(806, k) for k in range(m)]))
        self.dy = np.array([PY * hash01(807, k) for k in range(m)])

    def background(self, t):
        x = self.x + 2.0 * np.sin(2.1 * t + self.p)
        y = wrapy(self.y + V_B * t + 1.5 * np.sin(2.6 * t + self.p))
        dx = self.dx + 2.0 * np.sin(1.9 * t + self.dy)
        dy = wrapy(self.dy - V_D * t)
        return np.concatenate([x, dx]), np.concatenate([y, dy])

    def streams(self, t, t_start=31.0, t_end=36.7):
        """Ultrafiltration: water pushed in straight chains through every third
        pore (directed bulk flow, unlike the random walk of diffusion)."""
        if t < t_start - 2.0 or t > t_end + 2.0:
            return []
        c = cam_f(min(max(t, 31.0), 36.0))
        jy0 = int(math.floor((c.cy - 160) / PS))
        jy1 = int(math.ceil((c.cy + 160) / PS))
        U_IN, U_OUT = 34.0, 30.0
        STEP = 0.11
        pts = []
        for j in range(jy0, jy1 + 1):
            if j % 3:
                continue
            yp = pore_y(j)
            ph = STEP * hash01(811, j)
            ramp0 = t_start + 0.8 * hash01(812, j)
            n0 = int(math.floor((t - 1.5 - ramp0 - ph) / STEP))
            for n in range(max(0, n0), n0 + 26):
                tc = ramp0 + ph + n * STEP
                if tc > t_end:
                    break
                d = t - tc
                if d < -1.1 or d > 1.5:
                    continue
                if d <= -0.08:
                    x = XL1 - R_WATER + U_IN * (d + 0.08)
                    y = yp - SLANT * 0.5 + V_B * 0.15 * (d + 0.08)
                elif d < 0.08:
                    k = (d + 0.08) / 0.16
                    x = lerp(XL1 - R_WATER, WR[1] + R_WATER, k)
                    y = yp + SLANT * (k - 0.5)
                else:
                    e = d - 0.08
                    x = WR[1] + R_WATER + U_OUT * min(e, 0.45) + 6.0 * max(0.0, e - 0.45)
                    y = yp + SLANT * 0.5 - V_D * 0.9 * max(0.0, e - 0.15) ** 1.2
                pts.append((x, y, d))
        return pts


RBC_SET = RBCs()
ALB_SET = Albumin()
UREA1 = Urea1()
UREACC = UreaCC()
WATER = Water()


# --------------------------------------------------------------- drawing
def _xrange(cam, x0, x1):
    a = int(math.floor(cam.sx(x0)))
    b = int(math.ceil(cam.sx(x1)))
    return max(0, a), min(W, b), a, b


def draw_backdrop(cv, cam, t):
    """Dialysate space, neighbour fibers (depth), lumen ground with plasma specks."""
    a = cv.a
    a[:] = DL1
    ys = np.arange(H)
    # far bundle layer (parallax): dim vertical fibers drifting slower
    par = 0.55
    zf = cam.z ** par
    spacing = 46.0 * zf
    off = (-(cam.cx * par) * zf) % spacing
    xs = np.arange(W)
    rel = ((xs - off) % spacing) / spacing
    far = (rel < 0.34)
    th = BAYER4[(ys % 4)[:, None], (xs % 4)[None, :]]
    a[np.broadcast_to(far[None, :], (H, W)) & (th < 0.75)] = DL2
    # dialysate streamlines beside the hero fiber: dashed lanes marching upward
    if cam.z >= 1.2:
        for side in (-1, 1):
            for i, off_ in enumerate((14.0, 30.0, 50.0, 74.0)):
                lx = FX + side * (LUM + WALL + off_)
                sx = cam.sx(lx)
                if not (0 <= sx < W):
                    continue
                ph = (np.arange(H) / cam.z + cam.cy - H / 2 / cam.z + V_D * t + 17.0 * i) / 34.0
                fr = ph - np.floor(ph)
                dash = fr < 0.30
                head = fr < 0.035
                col = int(sx)
                a[dash, col] = DL3
                a[head, col] = B2
    for k in range(110):
        depth = 0.6 if k % 2 else 1.0
        wx = hash01(905, k) * 900 - 300
        if XL0 - 10 < wx < XL1 + 10:
            continue
        wy = float(wrapy(hash01(906, k) * PY - V_D * depth * t))
        sx, sy = cam.pt(wx, wy)
        ln = (5 + 9 * hash01(907, k)) * cam.z
        if -ln < sy < H and 0 <= sx < W:
            cv.rect(sx, sy, sx + 1, sy + ln, DL3 if depth < 1 else B1)
            if depth >= 1:
                cv.px(sx, sy, B2)
    # dialysate texture rising
    for k in range(70):
        wx = (hash01(901, k) * 900 - 300)
        wy = float(wrapy(hash01(902, k) * PY - V_D * t))
        sx, sy = cam.pt(wx, wy)
        if 0 <= sx < W and 0 <= sy < H and not (XL0 - 8 < wx < XL1 + 8):
            cv.px(sx, sy, B1 if k % 3 else DL3)
    # neighbour fibers (same plane), dimmer than the hero fiber; when the
    # camera pulls far out they read as the whole bundle again
    span = 1 if cam.z > 0.6 else 6
    for k in range(-span, span + 1):
        if k:
            _fiber_body(cv, cam, FX + 160.0 * k, t, dim=True)
    _fiber_body(cv, cam, FX, t, dim=False)


def _fiber_body(cv, cam, cx, t, dim):
    c0, c1, a0, a1 = _xrange(cam, cx - LUM, cx + LUM)
    if c0 >= c1:
        return
    xs = np.arange(c0, c1) + 0.5
    wx = cam.wx(xs)
    r = np.abs(wx - cx) / LUM
    col = np.empty((H, c1 - c0, 3), np.uint8)
    col[:] = PL1 if not dim else PL0
    th = BAYER4[(np.arange(H) % 4)[:, None], (np.arange(c0, c1) % 4)[None, :]]
    edge = np.broadcast_to(r[None, :] > 0.78, col.shape[:2])
    col[edge & (th < 0.6)] = PL0
    cv.a[:, c0:c1] = col
    # walls
    for wa, wb, inner_left in ((cx - LUM - WALL, cx - LUM, False), (cx + LUM, cx + LUM + WALL, True)):
        _wall(cv, cam, wa, wb, inner_left, dim)
    if not dim:
        # plasma specks drifting down
        for k in range(90):
            wx_ = cx - LUM + 2 + (2 * LUM - 4) * hash01(911, k)
            wy_ = float(wrapy(hash01(912, k) * PY + V_B * t))
            sx, sy = cam.pt(wx_, wy_)
            if 0 <= sx < W and 0 <= sy < H:
                cv.px(sx, sy, PL3 if k % 2 else PL2)


def _wall(cv, cam, wa, wb, inner_left, dim):
    c0, c1, a0, a1 = _xrange(cam, wa, wb)
    if c0 >= c1:
        return
    z = cam.z
    xs = np.arange(c0, c1) + 0.5
    ys = np.arange(H) + 0.5
    wx = cam.wx(xs)[None, :]
    wy = cam.wy(ys)[:, None]
    img = np.empty((H, c1 - c0, 3), np.uint8)
    base = M2 if dim else M3
    img[:] = base
    # porous texture
    if not dim and z >= 0.9:
        q = _vh(np.floor(wx * 1.1), np.floor(wy * 1.1))
        img[q < 0.16] = M2
        img[q > 0.95] = M4
    # pores
    j = np.clip(np.round(wy / PS).astype(np.int64), J0, J1 - 1)
    yp = _PORE_Y[j - J0]
    gap = _PORE_G[j - J0]
    sl = SLANT * ((wx - wa) / (wb - wa) - 0.5) * (1.0 if inner_left else -1.0)
    in_pore = np.abs(wy - yp - sl) < gap / 2
    pore_col = PL2 if not dim else PL0
    pm = np.broadcast_to(in_pore, img.shape[:2])
    img[pm] = pore_col
    if not dim and z >= 1.4:
        # pore rims: light above, dark below
        dyp = wy - yp - sl
        rim_hi = np.broadcast_to((dyp > -gap / 2 - 1.0 / z) & (dyp <= -gap / 2), img.shape[:2])
        rim_lo = np.broadcast_to((dyp >= gap / 2) & (dyp < gap / 2 + 1.0 / z), img.shape[:2])
        img[rim_hi & ~pm] = M4
        img[rim_lo & ~pm] = M1
        # inner half of each channel picks up the dialysate tint
        outer = (wx > (wa + wb) / 2) if inner_left else (wx < (wa + wb) / 2)
        img[pm & np.broadcast_to(outer, img.shape[:2])] = DL3
    # edges: the lumen-side face catches light, the outer face is shaded
    if c1 - c0 >= 3:
        if inner_left:
            img[:, 0] = M4 if not dim else M3
            img[:, -1] = M1
        else:
            img[:, -1] = M4 if not dim else M3
            img[:, 0] = M1
    cv.a[:, c0:c1] = img


def _vh(a, b, salt=0):
    a = np.asarray(a).astype(np.int64)
    b = np.asarray(b).astype(np.int64)
    h = (a * 73856093) ^ (b * 19349663) ^ (salt * 83492791)
    h = h & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFF) / 65536.0


def draw_rbc(cv, cam, x, y, phi, th, squash=1.0, hl=False):
    sx, sy = cam.pt(x, y)
    r = R_RBC * cam.z
    if sx < -r - 3 or sx > W + r + 3 or sy < -r - 3 or sy > H + r + 3:
        return
    c = abs(math.cos(phi))
    rx = r * squash
    ry = r * max(0.30, c)
    m, x0, y0 = ellipse_mask(sx, sy, ry, rx, th + math.pi / 2)
    k = 1 if r < 9 else 2
    cv.stamp(dilate(m), x0 - 1, y0 - 1, R0 if not hl else CY2)
    cv.stamp(m, x0, y0, R3)
    sh = m & ~shift(m, -k, -k)
    cv.stamp(sh, x0, y0, R2)
    hi = m & ~shift(m, k, k)
    cv.stamp(hi, x0, y0, R4)
    if c > 0.5 and r >= 5:
        # biconcave dimple: darker centre, its lower-right rim lit
        dm, dx0, dy0 = ellipse_mask(sx, sy, ry * 0.42, rx * 0.42, th + math.pi / 2)
        cv.stamp(dm, dx0, dy0, R2)
        lit = dm & ~shift(dm, -1, -1)
        cv.stamp(lit, dx0, dy0, R4)
    if r >= 6:
        cv.px(sx - r * 0.45, sy - ry * 0.55 if ry < rx else sy - r * 0.45, R5)


def draw_albumin(cv, cam, x, y, ang, hl=False):
    z = cam.z
    sx, sy = cam.pt(x, y)
    if sx < -12 or sx > W + 12 or sy < -12 or sy > H + 12:
        return
    lobes = [(0.0, 0.0, 1.55), (1.25, 0.55, 1.15), (-0.7, 1.15, 1.05), (-0.95, -0.95, 1.0), (0.6, -1.15, 0.95)]
    ms = []
    for dx, dy, rr_ in lobes:
        ca, sa = math.cos(ang), math.sin(ang)
        px_ = sx + (dx * ca - dy * sa) * z
        py_ = sy + (dx * sa + dy * ca) * z
        ms.append(disc_mask(px_, py_, max(0.7, rr_ * z)))
    x0 = min(m[1] for m in ms)
    y0 = min(m[2] for m in ms)
    x1 = max(m[1] + m[0].shape[1] for m in ms)
    y1 = max(m[2] + m[0].shape[0] for m in ms)
    M = np.zeros((y1 - y0, x1 - x0), bool)
    for m, mx, my in ms:
        M[my - y0:my - y0 + m.shape[0], mx - x0:mx - x0 + m.shape[1]] |= m
    cv.stamp(dilate(M), x0 - 1, y0 - 1, P0 if not hl else CY2)
    cv.stamp(M, x0, y0, P2)
    cv.stamp(M & ~shift(M, -1, -1), x0, y0, P1)
    cv.stamp(M & ~shift(M, 1, 1), x0, y0, P3)
    if z >= 1.6:
        # folded-chain texture
        for i in range(3):
            q = hash01(551, i, int(x * 7) % 97)
            cv.px(sx + (q - 0.5) * 3 * z, sy + (hash01(552, i) - 0.5) * 3 * z, P1)


def draw_urea(cv, cam, x, y, glow=True, level=1.0):
    sx, sy = cam.pt(x, y)
    if sx < -4 or sx > W + 4 or sy < -4 or sy > H + 4:
        return
    r = R_UREA * cam.z
    if r < 1.0:
        cv.rect(sx - 0.5, sy - 0.5, sx + 1.0, sy + 1.0, U2)
        return
    if glow and r >= 1.6:
        gm, gx, gy = disc_mask(sx, sy, r + 2.2)
        cv.stamp_dither(gm, gx, gy, U0, 0.45, ox=int(sx), oy=int(sy))
    m, x0, y0 = disc_mask(sx, sy, r + 0.35)
    cv.stamp(dilate(m), x0 - 1, y0 - 1, U0)
    cv.stamp(m, x0, y0, U2)
    cv.stamp(m & ~shift(m, -1, -1), x0, y0, U1)
    cv.px(sx - r * 0.35, sy - r * 0.35, U3)


def draw_water(cv, cam, x, y, bright=True):
    sx, sy = cam.pt(x, y)
    if sx < -3 or sx > W + 3 or sy < -3 or sy > H + 3:
        return
    r = R_WATER * cam.z
    if not bright:
        cv.px(sx, sy, W0)
        return
    if r < 1.0:
        cv.px(sx, sy, W1)
        return
    # H2O: oxygen + two hydrogens (tiny "mickey" shape)
    cv.rect(sx - 1, sy - 0.5, sx + 1, sy + 1.5, W1)
    cv.px(sx - 1.5, sy - 1.5, W2)
    cv.px(sx + 1.0, sy - 1.5, W2)


def pore_flash(cv, cam, j, side, k, color):
    yp = pore_y(j)
    xa, xb = (WR if side > 0 else WL)
    a = cam.pt(xa, yp - pore_gap(j) / 2 - SLANT / 2 - 0.6)
    b = cam.pt(xb, yp + pore_gap(j) / 2 + SLANT / 2 + 0.6)
    cv.rect_dither(a[0] - 1, a[1], b[0] + 1, b[1], color, k)


def bump_flash(cv, cam, y, k):
    a = cam.pt(XL1 - 0.6, y - 6)
    b = cam.pt(XL1 + 0.8, y + 6)
    cv.rect_dither(a[0] - 1, a[1], b[0], b[1], WHITE, k)


def chevron(cv, x, y, s, color, dark, level=1.0, right=True):
    d = 1 if right else -1
    pts = [(x - d * s, y - s), (x, y), (x - d * s, y + s), (x - d * s * 0.45, y + s), (x + d * s * 0.55, y),
           (x - d * s * 0.45, y - s)]
    m, x0, y0 = poly_mask(pts)
    if m is None:
        return
    cv.stamp(dilate(m), x0 - 1, y0 - 1, dark)
    cv.stamp_dither(m, x0, y0, color, level)


def big_arrow(cv, x, y0, y1, w, color, dark, light, t, level=1.0):
    """Vertical arrow from y0 to y1 (screen px) with marching chevrons."""
    d = 1 if y1 > y0 else -1
    head = w * 1.25
    pts = [(x - w / 2, y0), (x + w / 2, y0), (x + w / 2, y1 - d * head), (x + w, y1 - d * head),
           (x, y1), (x - w, y1 - d * head), (x - w / 2, y1 - d * head)]
    m, mx, my = poly_mask(pts)
    if m is None:
        return
    cv.stamp(dilate(m), mx - 1, my - 1, dark)
    cv.stamp_dither(m, mx, my, color, level)
    hh, ww = m.shape
    ys = np.arange(hh) + my
    ph = ((ys - y0) * d / 12.0 - t * 2.0)
    fr = ph - np.floor(ph)
    xs = np.arange(ww) + mx
    off = np.abs(xs - x)[None, :]
    chev = (np.abs(fr[:, None] * 12.0 - off * 0.7) < 1.3) & m
    cv.stamp(chev, mx, my, light)


def draw_world(cv, cam, t, *, show_urea1=1.0, show_cc=0.0, water=0.0, uf=False,
               pressure=0.0, cc_arrows=0.0, hl_urea=None, hl_rbc=None, hl_alb=None):
    draw_backdrop(cv, cam, t)
    # albumin + red cells (behind the small molecules)
    for (x, y, ang, isb) in ALB_SET.state(t):
        draw_albumin(cv, cam, x, y, ang, hl=(hl_alb is not None and isb and abs(y - hl_alb) < 1.0))
    for (x, y, phi, th, sq, ident) in RBC_SET.state(t):
        draw_rbc(cv, cam, x, y, phi, th, sq, hl=(hl_rbc is not None and ident == ("b", hl_rbc)))
    # water background (revealed for the ultrafiltration story)
    if water > 0:
        wx, wy = WATER.background(t)
        n = len(wx)
        lim = int(n * clamp(water, 0, 1))
        for i in range(lim):
            draw_water(cv, cam, wx[i], wy[i], bright=False)
    if uf:
        for (x, y, d) in WATER.streams(t):
            draw_water(cv, cam, x, y, bright=True)
    # urea
    if show_urea1 > 0:
        pts = UREA1.state(t)
        n = len(pts)
        for i, (x, y) in enumerate(pts):
            if show_urea1 < 1 and hash01(990, i) > show_urea1:
                continue
            draw_urea(cv, cam, x, y)
    if show_cc > 0:
        for i, (x, y) in enumerate(UREACC.state(t)):
            if show_cc < 1 and hash01(991, i) > show_cc:
                continue
            draw_urea(cv, cam, x, y)
    # membrane feedback: pore flashes on crossings, soft flashes on bounces
    for c in CROSSERS:
        d = t - c["tc"]
        if -0.05 < d < 0.30:
            pore_flash(cv, cam, c["j"], 1, 1.0 - max(0.0, d) / 0.30, U3)
    for tb, yb in RBC_BOUNCES + ALB_BOUNCES:
        d = t - tb
        if -0.02 < d < 0.28:
            bump_flash(cv, cam, yb, 0.85 * (1.0 - max(0.0, d) / 0.28))
    # pressure arrows (ultrafiltration)
    if pressure > 0:
        wx_ = cam.sx(XL1)
        beat = (t * 2.0) % 1.0
        push = 3.0 * math.sin(beat * math.pi)
        for i, yy in enumerate((150, 230, 310)):
            for k in range(2):
                chevron(cv, wx_ - 34 + 11 * k + push, yy + 8 * (i % 2), 7, CY3, BG0,
                        level=pressure * (0.55 + 0.45 * k))
        for i, yy in enumerate((180, 270)):
            chevron(cv, cam.sx(WR[1]) + 26 + push, yy, 5, CY2, BG0, level=pressure * 0.8)
    if cc_arrows > 0:
        lv = min(1.0, cc_arrows)
        big_arrow(cv, cam.sx(FX), 110, 300, 12, R3, R0, R4, t, level=lv * 0.9)
        for xx in (FX - 82.0, FX + 82.0):
            big_arrow(cv, cam.sx(xx), 330, 130, 10, B3, B0, B4, t, level=lv * 0.9)


def rbc_bouncer_pos(i, t):
    for (x, y, phi, th, sq, ident) in RBC_SET.state(t):
        if ident == ("b", i):
            return x, y
    return None


def alb_bouncer_pos(i, t):
    tb, yb = ALB_BOUNCES[i]
    for it in ALB_SET.items:
        if it.get("b") == (tb, yb):
            y = it["y0"] + V_B * t
            x = _bounce_x(t, tb, it["x"], XL1 - 2.6, t_in=0.6, t_out=0.4)
            return x, y
    return None
