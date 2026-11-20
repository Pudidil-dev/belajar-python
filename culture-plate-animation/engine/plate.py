"""The plate world: a lab bench seen from straight above, measured in millimetres, with a 90 mm culture plate on it,
the swab's zigzag streak, the colonies that grow along it, and the cotton swab itself.

Everything is drawn per pixel from world coordinates at the camera's own scale (canvas px per mm), so a zoom shows
new detail (the agar's sheen, the cotton fibres in the wet streak, the shading of each colony) instead of blowing up
the pixels of the wide shot. World y points down, like the screen. One light from the top left.
"""
import math
import os
from pathlib import Path

import numpy as np

from . import fx, gfx, raster as R, palette as P, timeline as T

W, H = gfx.W, gfx.H

R_OUT = 45.0                 # a 90 mm Petri dish
WALL = 1.8
R_IN = R_OUT - WALL          # the agar fills the dish up to the wall
GAP = 108.0                  # plates sit 108 mm apart on the bench (one screen width at rest)
TILE = 36.0                  # bench tiles; GAP is exactly three tiles, so the bench repeats from plate to plate
S_REST = 2.5                 # canvas px per mm with the whole plate in view
CY_REST = 4.0                # the camera looks 4 mm below the plate centre: the plate sits just above middle
L2 = np.array([-0.62, -0.78])                         # towards the light, in the plane of the bench
L3 = np.array([-0.50, -0.64, 0.58]) / np.linalg.norm([-0.50, -0.64, 0.58])
HALF_W = 0.8                 # half-width of the swab's streak, mm
TEX = 0.08                   # mm per texel of the precomputed streak map
NTEX = int(round(2 * R_OUT / TEX))
BUILD = Path(__file__).resolve().parent.parent / 'build'


class Cam:
    """A top-down camera: canvas centre looks at world (cx, cy); s canvas px per mm."""

    def __init__(self, cx, cy, s):
        self.cx, self.cy, self.s = float(cx), float(cy), float(s)

    def to(self, x, y):
        return W / 2 + (x - self.cx) * self.s, H / 2 + (y - self.cy) * self.s

    def world(self, px, py):
        """World coordinates of canvas pixel centres (px, py arrays)."""
        return self.cx + (np.asarray(px) + 0.5 - W / 2) / self.s, self.cy + (np.asarray(py) + 0.5 - H / 2) / self.s


REST = Cam(0.0, CY_REST, S_REST)


# ================================================================ the zigzag path
def _vertices():
    ys = np.linspace(-32.0, 32.0, T.N_STROKES + 1)
    return np.array([((1 if k % 2 == 0 else -1) * 0.8 * math.sqrt(R_IN ** 2 - y * y), y) for k, y in enumerate(ys)])


VERTS = _vertices()           # v0 top right, v1 left, v2 right ... v6 bottom right


def _build_path(cut=2.2, sag=0.55, ds=0.05):
    """The streak as a dense polyline: straight strokes with a slight bow, corners rounded off; returns points,
    arc length, the arc length of each stroke boundary (the corner apexes), and each point's stroke index."""
    V = VERTS
    pieces = []
    bounds = [0.0]
    n = len(V)
    a_pts, b_pts = [V[0]], []
    for k in range(1, n - 1):
        din = (V[k] - V[k - 1]) / np.linalg.norm(V[k] - V[k - 1])
        dout = (V[k + 1] - V[k]) / np.linalg.norm(V[k + 1] - V[k])
        a_pts.append(V[k] - cut * din)
        b_pts.append(V[k] + cut * dout)
    b_pts = [V[0]] + b_pts
    ends = a_pts[1:] + [V[-1]]
    pts = []
    for k in range(n - 1):
        p0, p1 = b_pts[k], ends[k]
        L = np.linalg.norm(p1 - p0)
        m = max(2, int(L / ds))
        uu = np.linspace(0, 1, m, endpoint=False)
        d = (p1 - p0) / L
        nrm = np.array([-d[1], d[0]])
        bow = sag * (1 if k % 2 == 0 else -1) * np.sin(np.pi * uu)
        pts.append(p0[None, :] + (p1 - p0)[None, :] * uu[:, None] + nrm[None, :] * bow[:, None])
        if k < n - 2:                                   # the rounded corner (a quadratic Bezier through V[k+1])
            c0, c1, c2 = ends[k], V[k + 1], b_pts[k + 1]
            m2 = max(4, int(2 * cut / ds))
            w = np.linspace(0, 1, m2, endpoint=False)[:, None]
            pts.append((1 - w) ** 2 * c0 + 2 * (1 - w) * w * c1 + w ** 2 * c2)
    pts.append(V[-1][None, :])
    pts = np.concatenate(pts)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    lam = np.concatenate([[0.0], np.cumsum(seg)])
    # stroke boundaries: the sample nearest to each interior vertex
    for k in range(1, n - 1):
        i = int(np.argmin(np.linalg.norm(pts - V[k], axis=1)))
        bounds.append(float(lam[i]))
    bounds.append(float(lam[-1]))
    stroke = np.searchsorted(np.array(bounds[1:-1]), lam, side='right')
    return pts, lam, np.array(bounds), stroke


PATH, LAM, BOUNDS, STROKE = _build_path()
LTOT = float(LAM[-1])
TAN = np.gradient(PATH, axis=0)
TAN /= np.linalg.norm(TAN, axis=1, keepdims=True)
NRM = np.stack([-TAN[:, 1], TAN[:, 0]], 1)
NRM_SIDE = np.sign(NRM @ L2)                    # +1 where the path's normal faces the light
NRM_SIDE[NRM_SIDE == 0] = 1


def path_at(lam):
    """World point and tangent at arc length lam (scalar or array)."""
    lam = np.clip(lam, 0, LTOT)
    x = np.interp(lam, LAM, PATH[:, 0])
    y = np.interp(lam, LAM, PATH[:, 1])
    tx = np.interp(lam, LAM, TAN[:, 0])
    ty = np.interp(lam, LAM, TAN[:, 1])
    return np.array([x, y]), np.array([tx, ty])


def _hermite(x, v0, v1):
    x = T.clamp(x)
    return (x ** 3 - 2 * x * x + x) * v0 + (-2 * x ** 3 + 3 * x * x) + (x ** 3 - x * x) * v1


def lam_at(t):
    """How far along the zigzag the swab tip is at time t (0 before the first stroke)."""
    if t <= T.STROKE_T0:
        return 0.0
    if t >= T.STREAK_END:
        return LTOT
    k = min(int((t - T.STROKE_T0) / T.STROKE_DUR), T.N_STROKES - 1)
    x = (t - T.STROKES[k][0]) / T.STROKE_DUR
    v0 = 0.0 if k == 0 else 0.5
    v1 = 0.35 if k == T.N_STROKES - 1 else 0.5
    return BOUNDS[k] + (BOUNDS[k + 1] - BOUNDS[k]) * _hermite(x, v0, v1)


# the stroke 3 point the camera dives into (just left of the plate centre)
P_LAM = BOUNDS[2] + 0.55 * (BOUNDS[3] - BOUNDS[2])
P_ZOOM = path_at(P_LAM)[0]
P_DIR = path_at(P_LAM)[1]


def pass_time(lam):
    """When the swab tip passed arc length lam."""
    ts = np.linspace(T.STROKE_T0, T.STREAK_END, 4001)
    ls = np.array([lam_at(x) for x in ts])
    return np.interp(lam, ls, ts)


# ================================================================ the streak map (cached)
def _streak_maps():
    BUILD.mkdir(exist_ok=True)
    f = BUILD / 'streak_v4.npz'
    if f.exists():
        z = np.load(f)
        return z['tp'], z['off'], z['lam']
    tp_s = pass_time(LAM)
    TP = np.full((NTEX, NTEX), np.inf, np.float32)
    DIST = np.full((NTEX, NTEX), np.inf, np.float32)
    OFF = np.zeros((NTEX, NTEX), np.float32)
    LM = np.zeros((NTEX, NTEX), np.float32)
    rad = int(math.ceil(HALF_W / TEX)) + 1
    step = max(1, int(round(0.06 / np.mean(np.diff(LAM)))))
    for i in range(0, len(PATH), step):
        x, y = PATH[i]
        cx, cy = (x + R_OUT) / TEX, (y + R_OUT) / TEX
        ix0, iy0 = int(cx) - rad, int(cy) - rad
        ix = np.arange(ix0, ix0 + 2 * rad + 1)
        iy = np.arange(iy0, iy0 + 2 * rad + 1)
        wx = (ix + 0.5) * TEX - R_OUT - x
        wy = (iy + 0.5) * TEX - R_OUT - y
        d = np.sqrt(wx[None, :] ** 2 + wy[:, None] ** 2).astype(np.float32)
        sub = (slice(iy0, iy0 + 2 * rad + 1), slice(ix0, ix0 + 2 * rad + 1))
        better = (d < HALF_W) & (d < DIST[sub])
        if not better.any():
            continue
        off = (wx[None, :] * NRM[i, 0] + wy[:, None] * NRM[i, 1]) * NRM_SIDE[i]
        DIST[sub] = np.where(better, d, DIST[sub])
        OFF[sub] = np.where(better, off, OFF[sub])
        LM[sub] = np.where(better, LAM[i], LM[sub])
        TP[sub] = np.where(d < HALF_W, np.minimum(TP[sub], tp_s[i]), TP[sub])
    tmp = f.with_name(f'{f.stem}.{os.getpid()}.tmp.npz')            # written whole, then moved into place
    np.savez_compressed(tmp, tp=TP, off=OFF, lam=LM)
    os.replace(tmp, f)
    return TP, OFF, LM


_MAPS = None


def maps():
    global _MAPS
    if _MAPS is None:
        _MAPS = _streak_maps()
    return _MAPS


# ================================================================ colonies
THRESH = 0.28                # a colony is where the summed field passes this
K_LINE = 1.4                 # peak of the field along a solid line of seeds (sets the line's width)


def _seeds():
    """Colony seeds along the zigzag: a solid line of merged colonies where the swab started (it carried the most
    bacteria), thinning out over the fifth stroke, single round colonies along the last one; a few strays.
    Each seed is a soft round bump; the bumps add up (metaballs), so close seeds melt into one smooth ridge."""
    rng = np.random.default_rng(20261120)
    out = []                                   # lam, off, sigma, amplitude
    lam = 0.4
    while lam < LTOT - 0.3:
        k = int(np.searchsorted(BOUNDS[1:-1], lam, side='right'))
        if k <= 3:
            step, sig, jit = 0.34, 1.0 * (1 + 0.09 * rng.standard_normal()), 0.2
        elif k == 4:
            q = (lam - BOUNDS[4]) / (BOUNDS[5] - BOUNDS[4])
            step, sig, jit = 0.34 * 8.0 ** q, 1.0 + 0.05 * q + 0.07 * rng.standard_normal(), 0.2 + 0.3 * q
        else:
            step, sig, jit = 2.9 + 1.7 * rng.random(), (1.55 + 0.22 * rng.standard_normal()) / 1.6, 0.45
        step *= 0.8 + 0.4 * rng.random()
        amp = min(1.0, K_LINE * step / (sig * math.sqrt(2 * math.pi)))
        off = float(np.clip(jit * rng.standard_normal(), -2 * jit, 2 * jit))
        out.append((lam, off, max(0.4, sig), amp))
        lam += step
    for _ in range(14):                         # strays a little off the line
        lam = BOUNDS[2] + (LTOT - BOUNDS[2]) * rng.random()
        side = 1 if rng.random() < 0.5 else -1
        out.append((lam, side * (1.7 + 1.3 * rng.random()), (0.7 + 0.45 * rng.random()) / 1.6, 1.0))
    S = np.array(out)
    f = S[:, 0] / LTOT
    t0 = T.GROW[0] + 2.5 * f ** 0.9 + 0.05 * rng.standard_normal(len(S))
    dur = 1.35 + 0.35 * (f > 0.82) + 0.1 * rng.random(len(S))
    pt, tg = path_at(S[:, 0])
    nrm = np.stack([-tg[1], tg[0]])
    xy = pt + nrm * S[:, 1][None, :]
    # the colony we watched under the lens: it is a speck already when the lens closes
    near = np.hypot(xy[0] - P_ZOOM[0], xy[1] - P_ZOOM[1])
    i = int(np.argmin(near))
    t0[i], dur[i] = T.LENS_CLOSE[0] - 1.0, 5.4
    return np.column_stack([xy[0], xy[1], S[:, 2], S[:, 3], t0, dur, S[:, 0]])


SEEDS = _seeds()                                # x, y, sigma, amplitude, start, grow time, lam


def colony_growth(t):
    """Each seed's growth 0..1 at time t."""
    return 1 - (1 - np.clip((t - SEEDS[:, 4]) / SEEDS[:, 5], 0, 1)) ** 1.7


def dry_time(lam):
    return T.GROW[0] + 2.5 * (np.asarray(lam) / LTOT) ** 0.9 + 0.7


# ================================================================ drawing
def _px_grid(x0, y0, x1, y1):
    px = np.arange(x0, x1)[None, :]
    py = np.arange(y0, y1)[:, None]
    return px, py


def tone(rmp, v, px, py):
    """A tone from ramp rmp for values v in [0, 1], with ordered (Bayer) dithering: the 16-bit gradient."""
    n = len(rmp)
    idx = np.clip(np.floor(np.asarray(v) * (n - 1) + R.bayer(px, py)), 0, n - 1).astype(np.int32)
    return np.asarray(rmp, np.uint8)[idx]


def draw_stage(buf, cam, t):
    """The dark lab bench (black epoxy): charcoal, a soft pool of lamp light round the plate's spot, a faint grid of
    dots fixed to the bench (so camera moves read) and a few motes of dust drifting through the light."""
    px, py = _px_grid(0, 0, W, H)
    X, Y = cam.world(px, py)
    X, Y = np.broadcast_arrays(X, Y)
    PX, PY = np.broadcast_arrays(px, py)
    v = np.clip(1.0 - np.hypot(X, (Y - 1.0) * 0.9) / 80.0, 0, 1) ** 1.25
    buf[...] = tone([P.BG[2], P.BG[3], P.BG[4], P.BG[5]], v, PX, PY)
    g, s = 12.0, cam.s
    dots = (np.abs((np.mod(X + g / 2, g) - g / 2) * s) < 0.5) & (np.abs((np.mod(Y + g / 2, g) - g / 2) * s) < 0.5)
    buf[dots & (v > 0.3)] = P.BG[6]
    buf[dots & (v <= 0.3)] = P.BG[4]
    _dust(buf, t)


def _dust(buf, t, n=24, seed=8):
    """Motes of dust drifting up through the lamp light; each makes exactly one lap per loop, so the loop is seamless."""
    rng = np.random.default_rng(seed)
    xs, ys, ph = rng.uniform(0, W, n), rng.uniform(0, H, n), rng.uniform(0, 2 * math.pi, n)
    u = (t % T.TOTAL) / T.TOTAL
    for i in range(n):
        y = int((ys[i] - u * H) % H)
        x = int((xs[i] + 3 * math.sin(2 * math.pi * 3 * u + ph[i])) % W)
        buf[y, x] = P.BG[5] if i % 3 else P.BG[6]


def plate_box(cam, ox, oy, pad=4.0):
    sx, sy = cam.to(ox, oy)
    rr = (R_OUT + pad) * cam.s
    x0, x1 = max(0, int(sx - rr)), min(W, int(sx + rr) + 2)
    y0, y1 = max(0, int(sy - rr)), min(H, int(sy + rr) + 2)
    return x0, y0, x1, y1


def _ang_near(ang, deg, width_deg):
    return np.cos(ang - math.radians(deg)) > math.cos(math.radians(width_deg))


def draw_plate(buf, cam, ox, oy, t, active, sheen=None):
    """One plate at world (ox, oy). active: this is the plate being streaked (it carries the streak and colonies).
    Returns the plate's agar mask (canvas-sized bool) for later layers."""
    x0, y0, x1, y1 = plate_box(cam, ox, oy, pad=6.0)
    agar_full = np.zeros((H, W), bool)
    if x1 <= x0 or y1 <= y0:
        return agar_full
    s = cam.s
    px, py = _px_grid(x0, y0, x1, y1)
    X, Y = cam.world(px, py)
    dx, dy = np.broadcast_arrays(X - ox, Y - oy)
    PX, PY = np.broadcast_arrays(px, py)
    r = np.hypot(dx, dy)
    sub = buf[y0:y1, x0:x1]
    with np.errstate(invalid='ignore', divide='ignore'):
        nx, ny = dx / np.maximum(r, 1e-6), dy / np.maximum(r, 1e-6)
    facing = nx * L2[0] + ny * L2[1]                                # +1 on the side towards the light
    ang = np.arctan2(ny, nx)
    # the dish's shadow on the bench, with a darker contact line
    sh = (np.hypot(dx - 1.6, dy - 2.3) < R_OUT + 0.3) & (r >= R_OUT)
    sub[sh] = P.BG[1]
    sub[sh & (r < R_OUT + 0.9)] = P.BG[0]
    # the glass wall: teal-grey, a rim light on both edges, brighter towards the lamp
    wall = (r < R_OUT) & (r >= R_IN)
    u = np.clip((r - R_IN) / WALL, 0, 1)
    v = 0.18 + 0.5 * np.exp(-((u - 0.12) / 0.17) ** 2) + 0.62 * np.exp(-((u - 0.88) / 0.15) ** 2) + 0.22 * facing
    gimg = tone(P.GL[1:8], np.clip(v, 0, 1), PX, PY)
    sub[wall] = gimg[wall]
    rpx = (R_OUT - r) * s
    sub[wall & _ang_near(ang, -128, 24) & (rpx >= 1) & (rpx < 1 + max(1.0, 0.3 * WALL * s))] = P.WHITE
    sub[wall & _ang_near(ang, 52, 7) & (rpx >= 1) & (rpx < 2)] = P.GL[7]
    edge = (rpx >= 0) & (rpx < 1)
    sub[edge & (facing > -0.25)] = P.GL[6]
    sub[edge & (facing <= -0.25)] = P.GL[3]
    # the agar: pale yellow, deep amber where it climbs the wall, a soft reflection of the lamp at the top left
    agar = r < R_IN
    dw = R_IN - r
    v = 0.34 + 0.6 * (1 - np.exp(-dw / 3.0)) + 0.05 * facing
    hu, hv = dx + 17.0, dy + 19.0
    ca, sa = math.cos(0.8), math.sin(0.8)
    q = ((hu * ca + hv * sa) / 15.0) ** 2 + ((-hu * sa + hv * ca) / 4.2) ** 2
    v = v + 0.28 * np.clip(1 - q, 0, 1)
    aimg = tone(P.AG[2:9], np.clip(v, 0, 1), PX, PY)
    sub[agar] = aimg[agar]
    sub[agar & (dw > 1.0) & (dw < 1.0 + max(0.4, 1.0 / s)) & _ang_near(ang, -128, 16)] = P.AG[8]
    sub[agar & (dw * s < 1)] = P.GL[2]
    agar_full[y0:y1, x0:x1] = agar
    if not active:
        return agar_full
    # the wet streak
    TP, OFF, LM = maps()
    if t >= T.STROKE_T0:
        ix = np.floor((dx + R_OUT) / TEX).astype(np.int64)
        iy = np.floor((dy + R_OUT) / TEX).astype(np.int64)
        ok = agar & (ix >= 0) & (ix < NTEX) & (iy >= 0) & (iy < NTEX)
        ixc, iyc = np.clip(ix, 0, NTEX - 1), np.clip(iy, 0, NTEX - 1)
        tp = TP[iyc, ixc]
        lam = LM[iyc, ixc]
        off = OFF[iyc, ixc]
        wet = ok & (tp <= t) & (t < dry_time(lam))
        if wet.any():
            col = np.empty(sub.shape, np.uint8)
            col[...] = P.AG[5]
            col[np.abs(off) > HALF_W - max(0.12, 1.0 / s)] = P.AG[4]
            glint = (off > 0.08) & (off < 0.08 + max(0.1, 1.0 / s)) & (np.mod(lam, 6.0) < 4.6) & (s > 4)
            col[glint] = P.AG[8]
            if s > 5:                                               # cotton fibres dragged through the gel
                fib = R.vnoise(lam * 0.7, off * 7.0, 11)
                col[(fib > 0.66) & ~glint] = P.AG[4]
            if sheen is not None:                                   # a shine running along the fresh zigzag
                col[(lam > sheen - 9.0) & (lam <= sheen - 3.0)] = P.AG[8]
                col[(lam > sheen - 3.0) & (lam <= sheen)] = P.WHITE
            sub[wet] = col[wet]
    return agar_full


def draw_colonies(buf, cam, ox, oy, t, agar_mask, shine=None):
    """White-cream colonies, lit from the top left: each seed is a soft bump, the bumps add up into smooth domes and
    ridges, the colony is where the sum passes THRESH; dithered 16-bit shading, a glint, an outline and a shadow.
    shine: arc length of a white shine running along the zigzag (the reveal)."""
    g = colony_growth(t)
    s = cam.s
    sig = SEEDS[:, 2] * g * s                                       # px
    amp = SEEDS[:, 3] + (1 - SEEDS[:, 3]) * (1 - g) ** 2           # young colonies stand alone, then merge
    vis = (g > 0) & (sig * 1.6 >= 0.4)
    if not vis.any():
        return None
    S, sig, amp = SEEDS[vis], sig[vis], amp[vis]
    sx = W / 2 + (S[:, 0] + ox - cam.cx) * s
    sy = H / 2 + (S[:, 1] + oy - cam.cy) * s
    ext = 3.0 * sig + 1
    on = (sx + ext > 0) & (sx - ext < W) & (sy + ext > 0) & (sy - ext < H)
    S, sig, amp, sx, sy, ext = S[on], sig[on], amp[on], sx[on], sy[on], ext[on]
    if len(S) == 0:
        return None
    bi, px, py = R.boxes_pixels(np.floor(sx - ext), np.floor(sy - ext), np.ceil(sx + ext), np.ceil(sy + ext))
    ddx = px + 0.5 - sx[bi]
    ddy = py + 0.5 - sy[bi]
    s2 = sig[bi] ** 2
    v = amp[bi] * np.exp(-(ddx * ddx + ddy * ddy) / (2 * s2))
    lin = py * W + px
    F = np.bincount(lin, v, H * W)
    GX = np.bincount(lin, -v * ddx / s2, H * W)
    GY = np.bincount(lin, -v * ddy / s2, H * W)
    LMB = np.bincount(lin, v * S[bi, 6], H * W) / np.maximum(F, 1e-9)
    F, GX, GY, LMB = F.reshape(H, W), GX.reshape(H, W), GY.reshape(H, W), LMB.reshape(H, W)
    mask = (F >= THRESH) & agar_mask
    if not mask.any():
        return None
    hs = 0.9 * s                                                    # dome height scale (px)
    nx, ny = -hs * GX[mask], -hs * GY[mask]
    nn = np.sqrt(nx * nx + ny * ny + 1)
    inten = (nx * L3[0] + ny * L3[1] + L3[2]) / nn / L3[2]       # 1 = a flat top facing the camera
    pyw, pxw = np.nonzero(mask)
    vv = np.clip((inten - 0.45) / 0.72, 0, 1)
    if shine is not None:                                           # the reveal: a white shine runs along the line
        lam = LMB[mask]
        vv = np.where((lam > shine - 16.0) & (lam <= shine), np.maximum(vv, 0.9), vv)
    cols = tone(P.COL[1:7], vv, pxw, pyw)
    k = 2 if s >= 6 else 1
    shadow = R.shift(mask, k, k) & ~mask & agar_mask
    buf[shadow] = P.AG[3]
    buf[pyw, pxw] = cols
    glint = inten > 1.24
    buf[pyw[glint], pxw[glint]] = P.WHITE
    lab = mask.astype(np.int8)
    rgt, lft, dn, up = R.neighbours_differ(lab)
    buf[mask & (lft | up)] = P.COL[2]
    buf[mask & (rgt | dn)] = P.COL[0]
    return mask


# ================================================================ the swab
S_FROM = np.array([78.0, -112.0])          # off-screen, top right
S_CTRL = np.array([58.0, -40.0])
S_TO = np.array([96.0, 78.0])              # where it leaves to (off-screen, bottom right)


def swab_state(t):
    """(tip x, tip y, height mm, squash) or None when the swab is out of the picture."""
    v0 = VERTS[0]
    if t < T.SWAB_IN[0] or t >= T.SWAB_OUT[1]:
        return None
    if t < T.STROKE_T0:
        a = T.u(t, (T.SWAB_IN[0], 1.72))
        e = T.ease_out(a, 2.4)
        p = (1 - e) ** 2 * S_FROM + 2 * (1 - e) * e * S_CTRL + e ** 2 * v0
        h = 6.0 + 26.0 * (1 - e) ** 1.6
        if t >= 1.72:
            d = T.u(t, (1.72, T.STROKE_T0))
            h = 6.0 * (1 - d * d)
        return p[0], p[1], h, 0.0
    if t < T.STREAK_END:
        p, _ = path_at(lam_at(t))
        sq = 0.18 * math.exp(-((t - T.STROKE_T0) / 0.06) ** 2) if t < T.STROKE_T0 + 0.2 else 0.0
        return p[0], p[1], 0.0, 0.06 + sq
    a = T.u(t, T.SWAB_OUT)
    p_end, tg = path_at(LTOT)
    e = T.ease_in(a, 2.0)
    p = p_end + tg * 6.0 * T.ease_out(min(1, a * 3)) + (S_TO - p_end) * e
    h = 14.0 * T.ease_out(min(1, a * 2.5), 2) + 18 * e
    return p[0], p[1], h, 0.0


def hand_of(x, y):
    """Where the hand holding the stick is (off-screen to the top right): it follows the tip loosely."""
    return np.array([0.5 * x + 64.0, 0.32 * y - 74.0])


def _segment_field(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    L2_ = vx * vx + vy * vy + 1e-9
    tt = np.clip(((px - ax) * vx + (py - ay) * vy) / L2_, 0, 1)
    cx, cy = ax + tt * vx, ay + tt * vy
    L = math.sqrt(L2_)
    across = ((px - ax) * vy - (py - ay) * vx) / L          # signed distance across the stick
    return np.hypot(px - cx, py - cy), across, tt


def _cyl(nx):
    """Brightness across a rod lit from the upper left (0 dark .. 1 bright)."""
    nx = np.clip(nx, -1, 1)
    return 0.08 + 0.92 * np.maximum(0.0, -0.55 * nx + 0.83 * np.sqrt(1 - nx * nx))


def draw_swab(buf, cam, t, agar_mask):
    st = swab_state(t)
    if st is None:
        return
    x, y, h, squash = st
    s = cam.s
    hand = hand_of(x, y)
    d = hand - np.array([x, y])
    d /= np.linalg.norm(d)
    tip_len, tip_w = 4.2, 2.7 * (1 + squash)
    zoom = 1 + h / 140.0                                    # nearer the camera looks a touch bigger
    c = np.array([x, y]) + d * (tip_len * 0.78)
    ax_, ay_ = cam.to(*c)
    bx_, by_ = cam.to(*hand)
    k_sh = np.array([0.30, 0.42])
    px, py = _px_grid(0, 0, W, H)
    PX, PY = np.broadcast_arrays(px, py)
    # shadows first (tip and stick), cast down and to the right: dark amber on the agar, black on the bench
    shx, shy = cam.to(*(c + k_sh * (h + 1.4)))
    hsx, hsy = cam.to(*(hand + k_sh * (h + 34.0)))
    dist, _, _ = _segment_field(px + 0.5, py + 0.5, shx, shy, hsx, hsy)
    stick_r = 0.85 * s * zoom
    shadow = dist < stick_r
    ex, ey = px + 0.5 - shx, py + 0.5 - shy
    along = (ex * d[0] + ey * d[1]) / (tip_len * s * zoom)
    acr = (-ex * d[1] + ey * d[0]) / (tip_w * s * zoom)
    shadow |= along ** 2 + acr ** 2 < 1.0
    on_agar = shadow & agar_mask if agar_mask is not None else np.zeros_like(shadow)
    gfx.blend(buf, gfx.Mask(0, 0, on_agar), P.AG[1], 0.4)
    gfx.blend(buf, gfx.Mask(0, 0, shadow & ~on_agar), P.BG[0], 0.55)
    # the stick: a white plastic rod, shaded as a cylinder lit from the top left
    dist, across, tt = _segment_field(px + 0.5, py + 0.5, ax_, ay_, bx_, by_)
    rod = dist < stick_r + 0.5
    lit = -1.0 if (d[1] * L2[0] - d[0] * L2[1]) > 0 else 1.0
    simg = tone(P.MW[3:9], _cyl(lit * across / max(stick_r, 0.5)), PX, PY)
    buf[rod] = simg[rod]
    buf[rod & (dist >= stick_r - 0.5)] = P.MW[1]
    # the cotton tip: a fluffy oval along the stick, a dome lit from the top left
    ex, ey = px + 0.5 - ax_, py + 0.5 - ay_
    a_ = (ex * d[0] + ey * d[1]) / (tip_len * s * zoom)
    b_ = (-ex * d[1] + ey * d[0]) / (tip_w * s * zoom)
    q = a_ * a_ + b_ * b_
    tipm = q < 1.0
    nxw = a_ * d[0] - b_ * d[1]
    nyw = a_ * d[1] + b_ * d[0]
    nz = np.sqrt(np.clip(1 - q, 0, 1))
    inten = (nxw * L3[0] + nyw * L3[1] + nz * L3[2]) / L3[2]
    fluff = R.vnoise((px + 0.5) * 0.7, (py + 0.5) * 0.7, 5) - 0.5
    cimg = tone(P.WC[1:6] + [P.WHITE], np.clip(0.55 * inten + 0.12 + 0.25 * fluff, 0, 1), PX, PY)
    buf[tipm] = cimg[tipm]
    lab = tipm.astype(np.int8)
    rg, lf, dn, up = R.neighbours_differ(lab)
    buf[tipm & (rg | dn)] = P.MW[2]
    buf[tipm & (lf | up)] = P.MW[4]
