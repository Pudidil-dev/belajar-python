"""Down at cell size: the gel's texture, the rod-shaped bacteria (one by one up to 256 cells, engine/cells.py) and
the packed cells on the surface of our colony once it has become a dome.

Everything here is anchored to our cell's spot on plate 0 (T.CELL_X, T.CELL_Y) and measured in micrometres.
Finer textures fade in as the camera gets closer (each layer only shows while its features are a few pixels to
a few dozen pixels big), so the zoom from the dish down to one bacterium is one continuous move.
"""
import math
import numpy as np
from . import palette as P
from . import timeline as T
from . import cells as C
from .world import hash2, W, H, XX, YY

_LS = np.array([-0.55, -0.6, 0.6]) / np.linalg.norm([-0.55, -0.6, 0.6])   # light in screen space (y down)


def _vnoise(u, v, size, seed):
    gu, gv = u / size, v / size
    i, j = np.floor(gu), np.floor(gv)
    fu, fv = gu - i, gv - j
    fu, fv = fu * fu * (3 - 2 * fu), fv * fv * (3 - 2 * fv)
    h00, h10 = hash2(i, j, seed), hash2(i + 1, j, seed)
    h01, h11 = hash2(i, j + 1, seed), hash2(i + 1, j + 1, seed)
    return (h00 * (1 - fu) + h10 * fu) * (1 - fv) + (h01 * (1 - fu) + h11 * fu) * fv


# ------------------------------------------------------------------ the gel
def gel(buf, ctx):
    """Close up, the gel is a soft rolling surface (a height field lit from the upper left) laced with fine fibres."""
    cam = ctx.cam
    amp = T.S(math.log10(cam.z), math.log10(55.0), math.log10(240.0))
    if amp < 0.01:
        return
    m = ctx.top & (ctx.plate == 0)
    if not np.any(m):
        return
    zu = cam.z / 1000.0
    u = (ctx.px[m] - T.CELL_X) * 1000.0
    v = (ctx.py[m] - T.CELL_Y) * 1000.0
    hgt = np.zeros(u.shape)
    fib = np.zeros(u.shape)
    for k in range(-1, 10):
        size = 2.0 ** k
        f = size * zu
        wgt = math.exp(-0.5 * ((math.log2(f) - 4.6) / 0.9) ** 2)
        if wgt < 0.04:
            continue
        hgt += wgt * f * 0.42 * _vnoise(u, v, size, 100 + k)
        if k <= 2:
            rid = 1 - np.abs(2 * _vnoise(u, v, size * 1.7, 200 + k) - 1)
            fib = np.maximum(fib, wgt * np.clip((rid - 0.93) / 0.05, 0, 1))
    full = np.zeros((H, W))
    full[m] = hgt
    gy, gx = np.gradient(full)
    slope = (-0.62 * gx - 0.78 * gy)[m]
    D = ctx.D[m]
    lv = 4.0 + amp * (np.clip(slope * 1.6, -1.3, 1.2) - 0.7 * fib)
    idx = np.clip(np.floor(lv + D * 0.98), 2, 6).astype(np.int64)
    buf[m] = P.AGAR[idx]


# ------------------------------------------------------------------ single cells
def _cell_list(tau):
    """Every visible cell at time tau: centre (um), angle, tip-to-tip length, pinch, DNA copy progress."""
    k, ph = T.gen_phase(tau)
    if k > C.G_EXPL:
        k, ph = C.G_EXPL, 0.985
    b, r = C.BIRTH[k], C.PUSHED[k]
    mm = T.S(ph, 0.0, 0.85)
    dth = (r[:, 2] - b[:, 2] + math.pi) % (2 * math.pi) - math.pi
    cen = b[:, :2] + (r[:, :2] - b[:, :2]) * mm
    th = b[:, 2] + dth * mm
    length = C.L_BORN + (C.L_DIV - C.L_BORN) * T.S(ph, 0.0, 0.72)
    eps = C.R_CELL * T.S(ph, 0.72, 0.97)
    rho = T.S(ph, 0.15, 0.62)
    return cen, th, length, eps, rho, k


def _seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy + 1e-12
    tt = np.clip(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1)
    ex, ey = px - (ax + tt * vx), py - (ay + tt * vy)
    return np.hypot(ex, ey), ex, ey


def cells(buf, ctx):
    tau = ctx.t % T.TOTAL
    cam, D = ctx.cam, ctx.D
    zu = cam.z / 1000.0
    if not 1.5 <= tau < 9.2 or zu < 1.3:
        return
    alpha = 1 - T.S(tau, 9.05, 9.22)
    cen, th, length, eps, rho, k = _cell_list(tau)
    rpx = C.R_CELL * zu
    sx, sy = cam.px(T.CELL_X + cen[:, 0] / 1000.0, T.CELL_Y + cen[:, 1] / 1000.0, C.R_CELL / 1000.0)
    ax = np.cos(th) * zu                                      # screen vector of 1 um along each cell
    ay = -np.sin(th) * cam.s * zu
    h = (length - 2 * C.R_CELL - 2 * eps) / 4.0                # half-length of each half's straight part
    cc = h + eps                                               # centre of each half, from the cell centre
    reach = (cc + h) * zu + rpx + 3
    vis = (sx > -reach) & (sx < W + reach) & (sy > -reach) & (sy < H + reach)
    idx = np.nonzero(vis)[0]
    if len(idx) == 0:
        return
    fade = T.S(zu, 1.3, 3.0)
    keep = (D < alpha * fade + 1e-6)
    # pass 1: shadows on the gel
    for i in idx:
        _shape(buf, ctx, sx[i] + 0.35 * rpx, sy[i] + 0.65 * rpx, ax[i], ay[i], h, cc, rpx * 1.06, None, keep,
               shadow=True)
    # pass 2: the cells
    for i in idx:
        _shape(buf, ctx, sx[i], sy[i], ax[i], ay[i], h, cc, rpx, (eps, rho, i, th[i], tau, k), keep)


def _shape(buf, ctx, cx, cy, ax, ay, h, cc, rpx, info, keep, shadow=False):
    ext = (cc + h) * math.hypot(ax, ay) + rpx + 2
    X0, X1 = max(0, int(cx - ext)), min(W, int(cx + ext) + 2)
    Y0, Y1 = max(0, int(cy - ext)), min(H, int(cy + ext) + 2)
    if X0 >= X1 or Y0 >= Y1:
        return
    px = XX[X0:X1][None, :]
    py = YY[Y0:Y1][:, None]
    d1, e1x, e1y = _seg_dist(px, py, cx - (cc - h) * ax, cy - (cc - h) * ay, cx - (cc + h) * ax, cy - (cc + h) * ay)
    d2, e2x, e2y = _seg_dist(px, py, cx + (cc - h) * ax, cy + (cc - h) * ay, cx + (cc + h) * ax, cy + (cc + h) * ay)
    first = d1 <= d2
    d = np.where(first, d1, d2)
    m = (d < rpx) & keep[Y0:Y1, X0:X1]
    if not np.any(m):
        return
    sub = buf[Y0:Y1, X0:X1]
    D = ctx.D[Y0:Y1, X0:X1]
    if shadow:
        sm = m & ctx.top[Y0:Y1, X0:X1] & (D < 0.8)
        sub[sm] = P.AGAR[3]
        return
    eps, rho, ci, th, tau, k = info
    ex, ey = np.where(first, e1x, e2x), np.where(first, e1y, e2y)
    nx, ny = ex / rpx, ey / rpx
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    shade = nx * _LS[0] + ny * _LS[1] + nz * _LS[2]
    hv = np.array([_LS[0], _LS[1], _LS[2] + 1.0])
    hv /= np.linalg.norm(hv)
    spec = np.clip(nx * hv[0] + ny * hv[1] + nz * hv[2], 0, 1) ** 24
    lv = 2.4 + 4.0 * np.clip(shade, 0, 1) + 1.4 * spec
    if rpx >= 6:                                               # the cell wall: a slightly darker inner ring
        lv = np.where((d > rpx - 2.8) & (d < rpx - 1.4), lv - 0.9, lv)
    if eps > 0.06 * C.R_CELL:                                   # the septum where the cell pinches in two
        al = ((px - cx) * ax + (py - cy) * ay) / (ax * ax + ay * ay)
        lv = np.where(np.abs(al) * math.hypot(ax, ay) < 0.8, lv - 1.3 * min(1.0, eps / (0.4 * C.R_CELL)), lv)
    col = P.CREAM[np.clip(np.floor(lv + (D - 0.5) * 0.9), 2, 7).astype(np.int64)]
    col[d > rpx - 1.0] = P.CREAM[1]
    sub[m] = col[m]
    if rpx >= 4.5:
        zu = rpx / C.R_CELL
        bx, by = -math.sin(th) * zu, -math.cos(th) * ctx.cam.s * zu      # 1 um across the cell, on screen
        _dna(sub, X0, Y0, m, cx, cy, ax, ay, bx, by, cc, rho, ci, tau, rpx)


def _dna(sub, X0, Y0, m, cx, cy, ax, ay, bx, by, cc, rho, ci, tau, rpx):
    """The nucleoid: a squiggle of DNA; while the cell grows it is copied and the two copies move apart."""
    s = np.linspace(0, 2 * math.pi, 120)
    ph = 1.7 * ci + 2.2 * tau
    copies = [(0.0, 0.0)] if rho <= 0.001 else [(-rho * cc, 0.0), (rho * cc, 1.3)]
    for off, dph in copies:
        xi = 0.30 * np.sin(s) + 0.07 * np.sin(3 * s + ph + dph)
        et = 0.17 * np.sin(2 * s + 0.4) + 0.05 * np.cos(5 * s + ph)
        qx = cx + (off + xi) * ax + et * bx
        qy = cy + (off + xi) * ay + et * by
        ix, iy = np.floor(qx).astype(int) - X0, np.floor(qy).astype(int) - Y0
        ok = (ix >= 0) & (iy >= 0) & (ix < sub.shape[1]) & (iy < sub.shape[0])
        ix, iy = ix[ok], iy[ok]
        inside = m[iy, ix]
        sub[iy[inside], ix[inside]] = P.DNA[1]
        if rpx >= 9:
            jx = np.clip(ix + 1, 0, sub.shape[1] - 1)
            inside2 = m[iy, jx]
            sub[iy[inside2], jx[inside2]] = P.DNA[0]


# ------------------------------------------------------------------ our colony, close up: packed cells on the dome
_G = 1.0                        # one rod per um^2: packed cells, 1.9-3.1 um long, 0.9 um thick
_RR = 0.45


def _rods(U, V, tau):
    """Nearest rod of a packed-cell texture: distance to its axis, offset vector, and an id per rod."""
    gi, gj = np.floor(U / _G), np.floor(V / _G)
    best = np.full(U.shape, np.inf)
    ox = np.zeros(U.shape)
    oy = np.zeros(U.shape)
    rid = np.zeros(U.shape)
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            ci, cj = gi + di, gj + dj
            cx = (ci + 0.1 + 0.8 * hash2(ci, cj, 61)) * _G
            cy = (cj + 0.1 + 0.8 * hash2(ci, cj, 62)) * _G
            th = hash2(ci, cj, 63) * math.pi + 0.06 * np.sin(2.3 * tau + 6.283 * hash2(ci, cj, 64))
            hl = 0.5 + 0.6 * hash2(ci, cj, 65)
            dx, dy = np.cos(th), np.sin(th)
            tt = np.clip((U - cx) * dx + (V - cy) * dy, -hl, hl)
            ex, ey = U - (cx + tt * dx), V - (cy + tt * dy)
            d = np.hypot(ex, ey)
            b = d < best
            best = np.where(b, d, best)
            ox = np.where(b, ex, ox)
            oy = np.where(b, ey, oy)
            rid = np.where(b, ci * 7919.0 + cj, rid)
    return best, ox, oy, rid


def rod_weight(cam):
    return T.S(math.log2(0.9 * cam.z / 1000.0), 0.35, 1.7)


def dome_fringe(ctx, u, v, a, tau):
    """Cells sticking out past the edge of the dome (mm in, bool out): a ragged rim while the cells are visible."""
    if rod_weight(ctx.cam) < 0.3:
        return np.zeros(u.shape, bool)
    r = np.hypot(u, v)
    near = (r > a * 0.85) & (r < a + 0.0016)
    if not np.any(near):
        return near
    d, _, _, _ = _rods(u * 1000.0, v * 1000.0, tau)
    return near & (d < _RR) & (r * 1000.0 - d < a * 1000.0 + 0.9)


def dome_texture(ctx, lv, u, v, w, nx, ny, nz, X0, Y0, hit, a, h, tau):
    """Hook for engine/world.py: our colony's surface shows its packed rod-shaped cells while they are big enough."""
    cam = ctx.cam
    wr = rod_weight(cam)
    if wr <= 0.01:
        return lv
    d, ox, oy, rid = _rods(u * 1000.0, v * 1000.0, tau)
    q = np.clip(d / _RR, 0, 1)
    tx, ty = ox / (d + 1e-9), oy / (d + 1e-9)
    tz = np.sqrt(np.clip(1 - q * q, 0, 1))
    mx, my, mz = nx * tz + tx * q, ny * tz + ty * q, nz * tz
    from .world import key_light
    L = key_light(cam)
    nn = np.sqrt(mx * mx + my * my + mz * mz) + 1e-9
    sh = (mx * L[0] + my * L[1] + mz * L[2]) / nn
    lrod = 3.4 + 3.5 * np.clip(sh, 0, 1)
    edge = np.zeros(d.shape, bool)                             # where one cell meets the next
    edge[1:, :] |= rid[1:, :] != rid[:-1, :]
    edge[:, 1:] |= rid[:, 1:] != rid[:, :-1]
    new = np.where(d < _RR, lrod, 3.0)                          # a 1-px line where one cell meets the next
    new = np.where(edge, np.minimum(new, 3.3), new)
    return lv * (1 - wr) + new * wr
