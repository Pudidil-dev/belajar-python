"""The visible world at dish scale, drawn per pixel by casting each pixel's (orthographic) ray: the teal bench, the
Petri dishes (a thin clear plastic wall around a 4 mm layer of pale amber agar), the colonies on the agar (low domes
of cream cells), the cotton swab and the glints it leaves.

Draw order: base() paints everything up to the agar and returns the masks the later passes need; then come the
colonies, the cells (engine/micro.py), the glints and the swab; front() lays the near wall and the near rim over
all of that, except where the swab is closer to the eye than the plastic.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T

W, H = T.W, T.H
XX = np.arange(W) + 0.5
YY = np.arange(H) + 0.5
def key_light(cam):
    """The key light rides with the camera (a pixel-art habit): always from the upper left of the screen and a bit
    toward the viewer, so highlights sit in the same place whether we look from the bench or from above."""
    right = np.array([1.0, 0.0, 0.0])
    up = np.array([0.0, cam.s, cam.c])
    toward = np.array([0.0, -cam.c, cam.s])
    v = -0.5 * right + 0.62 * up + 0.6 * toward
    return v / np.linalg.norm(v)


def hash2(i, j, seed=0):
    """Deterministic pseudo-random numbers in [0, 1) for integer lattice points."""
    h = (np.asarray(i, np.int64) * 73856093) ^ (np.asarray(j, np.int64) * 19349663) ^ (seed * 83492791 + 7)
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF).astype(np.float64) / float(0x1000000)


def blend(buf, mask, col, a):
    if not np.any(mask):
        return
    sub = buf[mask].astype(np.float32)
    buf[mask] = (sub + (np.asarray(col, np.float32) - sub) * a).round().astype(np.uint8)


def dither():
    return gfx.bayer_at(0, 0, H, W)


class Ctx:
    """Per-frame data shared by the passes."""
    pass


# ------------------------------------------------------------------ base: bench, dishes, agar
def base(buf, cam, t):
    s, c = cam.s, cam.c
    cs = max(c, 1e-6)
    x = cam.xc + (XX - W / 2) / cam.z                         # (W,)
    Ys = ((H / 2 - YY) / cam.z)[:, None]                      # (H, 1)
    D = dither()
    ctx = Ctx()
    ctx.cam, ctx.t, ctx.D, ctx.x, ctx.Ys = cam, t, D, x, Ys

    # ---- the bench: dark teal, a faint 20 mm grid (DELTA is a whole number of squares), the dishes' shadows
    yb = cam.yc + (Ys - T.Z_BENCH * c) / s                     # (H, 1)
    n = np.round(x / T.DELTA)                                  # nearest plate for every column
    dx = x - n * T.DELTA
    lv = np.full((H, W), 3.0)
    vx = ((XX - W / 2) / (W * 0.62))[None, :]
    vy = ((YY - H / 2) / (H * 0.62))[:, None]
    lv -= 0.8 * T.S_arr(np.hypot(vx, vy), 0.55, 1.0)            # a soft vignette
    gx = np.abs((x + 10.0) % 20.0 - 10.0) * cam.z               # px to the nearest grid line
    gy = np.abs((yb + 10.0) % 20.0 - 10.0) * cam.z * s
    cov = np.maximum(np.clip(0.9 - gx, 0, 1)[None, :], np.clip(0.9 - gy, 0, 1))
    lv += 0.55 * cov
    rs = np.hypot(dx[None, :] - 3.5, yb + 5.0)                 # cast shadow, toward the front right
    lv -= 0.9 * (1 - T.S_arr(rs, T.R_OUT - 0.5, T.R_OUT + 2.5))
    ra = np.hypot(dx[None, :], yb)                             # contact shadow under the rim
    lv -= 0.6 * (1 - T.S_arr(ra, T.R_OUT, T.R_OUT + 1.6))
    idx = np.clip(np.floor(lv + D * 0.98), 0, 7).astype(np.int64)
    buf[...] = P.TEAL[idx]
    low = 1.0 - T.S(cam.e, math.radians(32), math.radians(52))
    ctx.yb = np.broadcast_to(yb, (H, W))

    # ---- the dish: per column the wall's half-chords, per pixel where the ray meets each surface
    hw_o = np.sqrt(np.clip(T.R_OUT ** 2 - dx ** 2, 0, None))
    hw_i = np.sqrt(np.clip(T.R_IN ** 2 - dx ** 2, 0, None))
    dish = (np.abs(dx) < T.R_OUT)[None, :]
    inner = (np.abs(dx) < T.R_IN)[None, :]
    zfo = (Ys + (hw_o + cam.yc) * s) / cs                      # height where the ray crosses the near outer wall
    zfi = (Ys + (hw_i + cam.yc) * s) / cs                      # ... the near inner wall
    zbi = (Ys - (hw_i - cam.yc) * s) / cs                      # ... the far inner wall
    ya = cam.yc + Ys / s                                       # where the ray meets the agar plane (z = 0)
    yr = cam.yc + (Ys - T.Z_TOP * c) / s                       # ... the rim plane
    side = inner & (zfi >= T.Z_FLOOR) & (zfi <= 0)
    floor = inner & (zfi >= T.Z_BENCH) & (zfi < T.Z_FLOOR)
    interior = inner & (zfi > 0)
    top = interior & (ya < hw_i[None, :])
    back = interior & (ya >= hw_i[None, :]) & (zbi <= T.Z_TOP)
    ring = dish & (np.abs(yr) <= hw_o[None, :]) & (np.abs(yr) >= hw_i[None, :])
    front = dish & (zfo >= T.Z_BENCH) & (zfo <= T.Z_TOP)

    # far wall: the bench seen through clear plastic, a highlight streak
    blend(buf, back, P.PLASTIC[2], 0.2)
    u = dx / T.R_OUT
    blend(buf, back & ((np.abs(u - 0.3) < 0.025) | (np.abs(u + 0.6) < 0.018))[None, :], P.PLASTIC[3], 0.35)
    # agar side and the plastic floor, seen through the near wall at low angles
    lv = np.where(zfi > -0.55, 5.0, np.where(zfi > -3.0, 2.0, 1.0))
    sidx = np.clip(np.floor(lv + (D - 0.5) * 0.3), 0, 7).astype(np.int64)
    buf[side] = P.AGAR[sidx[side]]
    buf[floor] = P.TEAL[4]
    blend(buf, floor, P.PLASTIC[1], 0.45)

    # agar top: pale amber, a sheen toward the far side at low angles, a bright meniscus ring at the wall
    py = np.broadcast_to(ya, (H, W))
    pxl = np.broadcast_to(dx[None, :], (H, W))
    r = np.hypot(pxl, py)
    lv = np.full((H, W), 4.0)
    lv += 0.9 * T.S_arr(py, 0.0, 40.0) * low
    lv += 0.45 * T.S_arr(py - 0.6 * pxl, -50.0, 50.0) * (1 - low)
    lv += 1.6 * T.S_arr(r, T.R_IN - 1.0 - 0.6 / cam.z, T.R_IN - 0.15)
    if 3.5 < cam.z < 60:                                       # a few tiny bubbles in the gel
        fade = T.S(cam.z, 3.5, 6.0) * (1 - T.S(cam.z, 30.0, 60.0))
        gi, gj = np.floor(pxl / 2.5), np.floor(py / 2.5)
        hb = hash2(gi, gj, 21)
        bx = (gi + 0.2 + 0.6 * hash2(gi, gj, 22)) * 2.5
        by = (gj + 0.2 + 0.6 * hash2(gi, gj, 23)) * 2.5
        db = np.hypot(pxl - bx, py - by)
        bub = (hb < 0.13) & (db < 0.17) & (D < fade + 0.01)
        lv = np.where(bub & (py - by > pxl - bx), 6.0, np.where(bub, 3.0, lv))
    tau = t % T.TOTAL                                          # the wet trail the cotton leaves, drying fast
    cols = (np.abs(dx) < 33.5) & (n == 0)
    if T.SW0 < tau < T.SW1 + 2.5 and np.any(cols):
        yp, slope, pp = T.path_at_x(dx[cols])
        age = tau - T.tau_of_p(pp)
        dist = np.abs(py[:, cols] - yp[None, :]) / np.sqrt(1 + slope * slope)[None, :]
        wv = (1 - T.S_arr(dist, 1.1, 2.3)) * (np.exp(-np.clip(age, 0, None) / 1.1) * T.S_arr(age, 0.0, 0.06))[None, :]
        lv[:, cols] += 1.15 * wv
    aidx = np.clip(np.floor(lv + D * 0.98), 0, 7).astype(np.int64)
    buf[top] = P.AGAR[aidx[top]]

    # far rim
    _rim(buf, ring & (yr > 0), dx, yr, hw_o, hw_i, cam, D)

    ctx.top, ctx.px, ctx.py, ctx.plate = top, pxl, py, np.broadcast_to(n[None, :], (H, W))
    ctx.front, ctx.zfo, ctx.dx, ctx.yr, ctx.hw_o, ctx.hw_i = front, zfo, dx, yr, hw_o, hw_i
    ctx.near_ring = ring & (yr <= 0)
    ctx.bench = ~(top | ring | side | floor | back | front)
    ctx.plate_area = (top | ring | side) & dish
    ctx.swab_depth = np.full((H, W), np.inf)
    return ctx


def _rim(buf, m, dx, yr, hw_o, hw_i, cam, D):
    if not np.any(m):
        return
    ew = 0.75 / (cam.z * max(cam.s, 0.2))
    ayr = np.abs(yr)
    outer = ayr > hw_o[None, :] - ew
    inner = ayr < hw_i[None, :] + ew
    hi = (dx[None, :] < -6) & (yr > 6) & ~outer & ~inner
    col = np.zeros(buf.shape, np.uint8)
    col[...] = P.PLASTIC[3]
    col[hi & (D < 0.7)] = P.PLASTIC[4]
    col[inner] = P.PLASTIC[2]
    col[outer] = P.PLASTIC[1]
    buf[m] = col[m]


def front(buf, ctx):
    """The near wall and near rim, in front of everything inside the dish (but behind a swab that is closer)."""
    cam, D = ctx.cam, ctx.D
    s = cam.s
    lam_f = (ctx.Ys * cam.c - ctx.zfo) / s
    m = ctx.front & (lam_f < ctx.swab_depth)
    u = (ctx.dx / T.R_OUT)[None, :]
    blend(buf, m, P.PLASTIC[3], 0.2)
    streak = (np.abs(u + 0.53) < 0.03) | (np.abs(u - 0.135) < 0.016) | (np.abs(u - 0.645) < 0.024)
    blend(buf, m & streak, P.PLASTIC[4], 0.38)
    sil = (np.abs(ctx.dx) > T.R_OUT - 1.3 / cam.z)[None, :]
    blend(buf, m & sil, P.PLASTIC[2], 0.5)
    foot = m & (ctx.zfo < T.Z_BENCH + 1.1 / (cam.z * max(cam.c, 0.05)))
    blend(buf, foot, P.TEAL[1], 0.55)
    lam_r = (ctx.Ys * cam.c - T.Z_TOP) / s
    nr = ctx.near_ring & (lam_r < ctx.swab_depth)
    _rim(buf, nr, ctx.dx, ctx.yr, ctx.hw_o, ctx.hw_i, cam, D)


# ------------------------------------------------------------------ colonies: low domes of cream cells
def colony_radius(i, tau):
    """Radius (mm) of colony i on a plate whose clock reads tau, including the pop bounce of the reveal."""
    g = T.g_pop(tau)
    a = T.SEEDS[i, 2] * T.a_um(g) / (T.A_OUR * 1000.0)
    u = (tau - T.POP_T[i]) / 0.3
    if 0 <= u < 1:
        a *= 1 + 0.42 * math.sin(math.pi * u) * (1 - u) ** 0.6
    return a


def colony_height(i, tau, a):
    return max(T.dome_ratio(T.g_pop(tau)) * a, 1e-6)


def colonies(buf, ctx, tex=None):
    """All colonies of the plates in view; nearest surface wins (z-buffer), outlines on the union of them all."""
    cam, t = ctx.cam, ctx.t
    zb = np.full((H, W), np.inf)
    out = np.zeros((H, W), np.int16) - 1
    flash = np.zeros((H, W), bool)
    x_lo, x_hi = cam.xc - (W / 2 + 4) / cam.z, cam.xc + (W / 2 + 4) / cam.z
    for n in (-1, 0, 1):
        tau = t % T.TOTAL - n * T.TOTAL
        if T.g_pop(tau) < 7.95:
            continue
        for i in range(len(T.SEEDS)):
            x0, y0 = n * T.DELTA + T.SEEDS[i, 0], T.SEEDS[i, 1]
            a = colony_radius(i, tau)
            if a * cam.z < 0.3 or x0 + a < x_lo or x0 - a > x_hi:
                continue
            h = colony_height(i, tau, a)
            _cap(ctx, buf, zb, out, flash, x0, y0, a, h, i, tau, tex if (n == 0 and i == T.OUR) else None)
    ctx.colony_mask = out >= 0
    m = out >= 0
    if not np.any(m):
        return
    e = m.copy()                                              # outline: colony pixels next to a non-colony pixel
    e[1:, :] &= m[:-1, :]
    e[:-1, :] &= m[1:, :]
    e[:, 1:] &= m[:, :-1]
    e[:, :-1] &= m[:, 1:]
    edge = m & ~e
    buf[edge & ~flash] = P.CREAM[1]
    ctx.colony_mask = m


def _cap(ctx, buf, zb, out, flash, x0, y0, a, h, i, tau, tex):
    cam, D = ctx.cam, ctx.D
    s, c = cam.s, cam.c
    sx0, sy0 = cam.px(x0, y0)
    rx = a * cam.z + 1.5
    top = sy0 - (a * s + h * c) * cam.z - 2
    bot = sy0 + a * s * cam.z + 2
    X0, X1 = max(0, int(sx0 - rx)), min(W, int(sx0 + rx) + 2)
    Y0, Y1 = max(0, int(top)), min(H, int(bot) + 2)
    if X0 >= X1 or Y0 >= Y1:
        return
    if a * cam.z < 1.1:                                       # smaller than a pixel: one cream dot
        xi, yi = int(sx0), int(sy0)
        if 0 <= xi < W and 0 <= yi < H and ctx.top[yi, xi]:
            buf[yi, xi] = P.CREAM[5] if a * cam.z > 0.55 or D[yi, xi] < a * cam.z * 1.6 else buf[yi, xi]
        return
    Rs = (a * a + h * h) / (2 * h)
    zs = h - Rs
    u = (XX[X0:X1] - W / 2) / cam.z + cam.xc - x0              # (w,)
    Ys = ((H / 2 - YY[Y0:Y1]) / cam.z)[:, None]                # (h, 1)
    A = Ys * s + cam.yc - y0
    B = Ys * c - zs
    b = A * c - B * s
    cc = A * A + B * B - (Rs * Rs - u[None, :] ** 2)
    disc = b * b - cc
    ok = disc >= 0
    lam = -b - np.sqrt(np.where(ok, disc, 0.0))
    v = A + lam * c
    w = Ys * c - lam * s
    hit = ok & (w >= -1e-9)
    vp = cam.yc + Ys / s - y0
    uu = np.broadcast_to(u[None, :], v.shape)
    if tex is not None:                                        # cells sticking out past the rim of the dome
        fr = tex.dome_fringe(ctx, uu, np.broadcast_to(vp, v.shape), a, tau) & ~hit & ctx.top[Y0:Y1, X0:X1]
        if np.any(fr):
            lam = np.where(fr, Ys * c / s, lam)
            v = np.where(fr, vp, v)
            w = np.where(fr, 0.0, w)
            hit = hit | fr
    # a shadow on the agar, toward the front right
    sh = ((u[None, :] - 0.2 * a) ** 2 + (vp + 0.3 * a) ** 2 < (1.08 * a) ** 2) & ~hit & ctx.top[Y0:Y1, X0:X1]
    shm = sh & (D[Y0:Y1, X0:X1] < 0.75) & (out[Y0:Y1, X0:X1] < 0)
    if np.any(shm):
        sub = buf[Y0:Y1, X0:X1]
        sub[shm] = P.AGAR[3]
    if not np.any(hit):
        return
    zsub = zb[Y0:Y1, X0:X1]
    win = hit & (lam < zsub)
    if not np.any(win):
        return
    nx, ny, nz = uu / Rs, v / Rs, (w - zs) / Rs
    if tex is not None:
        flat = w <= 0.0
        nx, ny, nz = np.where(flat, 0.0, nx), np.where(flat, 0.0, ny), np.where(flat, 1.0, nz)
    L = key_light(cam)
    shade = nx * L[0] + ny * L[1] + nz * L[2]
    hv = np.array([L[0], L[1] - c, L[2] + s])
    hv /= np.linalg.norm(hv)
    spec = np.clip(nx * hv[0] + ny * hv[1] + nz * hv[2], 0, 1) ** 30
    lv = 2.2 + 4.2 * np.clip(shade, 0, 1) + 1.6 * spec
    if tex is not None:
        lv = tex.dome_texture(ctx, lv, uu, v, w, nx, ny, nz, X0, Y0, hit, a, h, tau)
    k = np.clip(np.floor(lv + (D[Y0:Y1, X0:X1] - 0.5) * 0.9), 2, 7).astype(np.int64)
    pu = (tau - T.POP_T[i]) / 0.3
    sub = buf[Y0:Y1, X0:X1]
    col = P.CREAM[k]
    if 0 <= pu < 0.22:                                         # the pop: a white flash
        col = np.where((D[Y0:Y1, X0:X1] < 0.8)[..., None], np.array(P.WHITE, np.uint8), col)
        flash[Y0:Y1, X0:X1] |= win
    sub[win] = col[win]
    zsub[win] = lam[win]
    out[Y0:Y1, X0:X1][win] = i


# ------------------------------------------------------------------ glints and cell markers
def _px_dot(buf, x, y, col):
    xi, yi = int(math.floor(x)), int(math.floor(y))
    if 0 <= xi < W and 0 <= yi < H:
        buf[yi, xi] = col


def _star(buf, x, y, arm, core=P.WHITE, rays=P.COTTON[4], diag=False):
    _px_dot(buf, x, y, core)
    for k in range(1, arm + 1):
        for ddx, ddy in (((1, 1), (-1, 1), (1, -1), (-1, -1)) if diag else ((1, 0), (-1, 0), (0, 1), (0, -1))):
            _px_dot(buf, x + ddx * k, y + ddy * k, rays if k > 1 or arm == 1 else core)


def glints(buf, ctx):
    """Specks flick off the cotton fibres, drop onto the gel, twinkle for a moment and blink out."""
    cam, t = ctx.cam, ctx.t
    for n in (0,):
        tau = t % T.TOTAL - n * T.TOTAL
        if not T.SW0 - 0.1 <= tau <= T.SW1 + 0.6:
            continue
        for gi in range(len(T.GLINTS)):
            t0, side, along, z0, size = T.GLINTS[gi]
            el = tau - t0
            if not 0 <= el < T.GLINT_FALL + T.GLINT_SIT + 0.08:
                continue
            p = T.p_of_tau(t0)
            x, y = T.path_xy(p)
            tx, ty = T.path_tan(p)
            sd = math.copysign(1.9 + abs(side) * 0.75, side)
            x += n * T.DELTA + sd * -ty + along * tx
            y += sd * tx + along * ty
            z = z0 * max(0.0, 1 - (el / T.GLINT_FALL) ** 2)
            sx, sy = cam.px(x, y, z)
            big = size > 0.55
            if el < T.GLINT_FALL:
                _px_dot(buf, sx, sy, P.WHITE)
                _px_dot(buf, sx, sy - 1, P.COTTON[4])
                _px_dot(buf, sx, sy - 2, P.COTTON[3])
            elif el < T.GLINT_FALL + T.GLINT_SIT:
                tw = int(el * 24 + size * 7) % 4
                _star(buf, sx, sy, (2 if big else 1) if tw == 0 else (1 if tw == 2 or big else 0))
                if big:
                    _px_dot(buf, sx + 1, sy, P.WHITE)
            else:
                _star(buf, sx, sy, 3 if big else 2, diag=True)


def markers(buf, ctx):
    """While the camera dives, the cells the swab left along the trail twinkle; ours is the brightest."""
    cam, t = ctx.cam, ctx.t
    tau = t % T.TOTAL
    if not T.T_PASS - 0.2 <= tau <= 6.6:
        return
    zf = T.S(cam.z, 9.0, 20.0) * T.S(tau, T.T_PASS - 0.2, T.T_PASS + 0.3)
    for i in range(len(T.SEEDS)):
        if T.SEEDS[i, 3] < 0.45:
            continue
        mine = i == T.OUR
        fade = zf * (1 - T.S(cam.z, 1100.0, 2600.0)) if mine else zf * (1 - T.S(cam.z, 260.0, 520.0))
        if fade < 0.05:
            continue
        sx, sy = cam.px(T.SEEDS[i, 0], T.SEEDS[i, 1], 0.0)
        if not (-4 < sx < W + 4 and -4 < sy < H + 4):
            continue
        tw = 0.5 + 0.5 * math.sin(2 * math.pi * (tau * 2.3 + T.SEEDS[i, 3] * 7.1))
        if ctx.D[int(min(max(sy, 0), H - 1)), int(min(max(sx, 0), W - 1))] > fade:
            continue
        arm = (1 + (tw > 0.25) + (tw > 0.7)) if mine else (1 + (tw > 0.6))
        _star(buf, sx, sy, int(arm), core=P.WHITE, rays=P.CREAM[7] if mine else P.CREAM[6], diag=(tw > 0.9 and not mine))
        if mine:
            _px_dot(buf, sx + 1, sy, P.WHITE)


# ------------------------------------------------------------------ the swab
L_E, R_E, R_STICK = 4.6, 2.2, 0.85            # cotton half-length and radius, stick radius (mm)


def swab(buf, ctx):
    t = ctx.t % T.TOTAL
    tip = T.swab_tip(t)
    if tip is None:
        return
    cam, D = ctx.cam, ctx.D
    a = T.swab_axis(t)
    sq = T.swab_squash(t)
    tip = np.array(tip, float)
    re = R_E * (1 + 0.07 * sq)
    centre = tip + a * L_E - np.array([0, 0, 0.45 * sq])
    # shadow on the agar under the tip (moves in as the swab comes down)
    zt = max(tip[2], 0.0)
    shx, shy = tip[0] + 0.35 * zt + 0.6, tip[1] - 0.55 * zt - 0.6
    sx, sy = cam.px(shx, shy, 0.0)
    rr = (re + 0.12 * zt) * cam.z
    fade = max(0.0, 1 - zt / 45.0)
    if rr > 0.5 and fade > 0:
        X0, X1 = max(0, int(sx - rr - 1)), min(W, int(sx + rr + 2))
        Y0, Y1 = max(0, int(sy - rr * cam.s - 1)), min(H, int(sy + rr * cam.s + 2))
        if X0 < X1 and Y0 < Y1:
            yy, xx = np.mgrid[Y0:Y1, X0:X1]
            d = np.hypot((xx + 0.5 - sx) / rr, (yy + 0.5 - sy) / max(rr * cam.s, 0.5))
            m = (d < 1) & ctx.top[Y0:Y1, X0:X1] & (D[Y0:Y1, X0:X1] < 0.7 * fade)
            buf[Y0:Y1, X0:X1][m] = P.AGAR[3]
    _stick(buf, ctx, centre, a)
    _cotton(buf, ctx, centre, a, re)


def _ray_origin(cam, X0, X1, Y0, Y1):
    x = cam.xc + (XX[X0:X1] - W / 2) / cam.z
    Ys = ((H / 2 - YY[Y0:Y1]) / cam.z)[:, None]
    ox = np.broadcast_to(x[None, :], (Y1 - Y0, X1 - X0))
    oy = np.broadcast_to(cam.yc + Ys * cam.s, (Y1 - Y0, X1 - X0))
    oz = np.broadcast_to(Ys * cam.c, (Y1 - Y0, X1 - X0))
    return ox, oy, oz


def _cotton(buf, ctx, C, a, re):
    cam, D = ctx.cam, ctx.D
    sx, sy = cam.px(*C)
    r = (L_E + 0.5) * cam.z
    X0, X1 = max(0, int(sx - r)), min(W, int(sx + r) + 2)
    Y0, Y1 = max(0, int(sy - r)), min(H, int(sy + r) + 2)
    if X0 >= X1 or Y0 >= Y1:
        return
    ox, oy, oz = _ray_origin(cam, X0, X1, Y0, Y1)
    d = np.array([0.0, cam.c, -cam.s])
    qx, qy, qz = ox - C[0], oy - C[1], oz - C[2]
    al = qx * a[0] + qy * a[1] + qz * a[2]
    be = float(d @ a)
    qd = qy * d[1] + qz * d[2]
    q2 = qx * qx + qy * qy + qz * qz
    il, ir = 1 / L_E ** 2, 1 / re ** 2
    A2 = be * be * il + (1 - be * be) * ir
    B2 = al * be * il + (qd - al * be) * ir
    C2 = al * al * il + (q2 - al * al) * ir - 1
    disc = B2 * B2 - A2 * C2
    ok = disc >= 0
    lam = (-B2 - np.sqrt(np.where(ok, disc, 0))) / A2
    hz = oz + lam * d[2]
    hit = ok & (hz >= -0.02)
    # a fuzzy edge: a few fibres stick out
    ok2 = disc >= -0.0004 * A2
    fuzz = ok2 & ~hit & (gfx_hash_noise(ox, oy, oz, 3.0) > 0.62) & (oz + ((-B2) / A2) * d[2] >= 0)
    if not np.any(hit | fuzz):
        return
    hx, hy = ox + lam * d[0], oy + lam * d[1]
    px_, py_, pz_ = hx - C[0], hy - C[1], hz - C[2]
    pa = px_ * a[0] + py_ * a[1] + pz_ * a[2]
    nx = pa * il * a[0] + (px_ - pa * a[0]) * ir
    ny = pa * il * a[1] + (py_ - pa * a[1]) * ir
    nz = pa * il * a[2] + (pz_ - pa * a[2]) * ir
    nn = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    L = key_light(cam)
    shade = (nx * L[0] + ny * L[1] + nz * L[2]) / nn
    # fibres: streaks that run along the stick
    b1 = np.cross(a, [0.0, 0.0, 1.0]) if abs(a[2]) < 0.99 else np.array([1.0, 0, 0])
    b1 /= np.linalg.norm(b1)
    b2 = np.cross(a, b1)
    ang = np.arctan2(px_ * b2[0] + py_ * b2[1] + pz_ * b2[2], px_ * b1[0] + py_ * b1[1] + pz_ * b1[2])
    fib = hash2(np.floor(ang * 9.5), np.floor(pa * 1.6), 41) - 0.5
    lv = 1.9 + 2.9 * np.clip(shade, 0, 1) + 0.5 * fib
    k = np.clip(np.floor(lv + (D[Y0:Y1, X0:X1] - 0.5) * 0.8), 0, 4).astype(np.int64)
    col = P.COTTON[k]
    sub = buf[Y0:Y1, X0:X1]
    sub[hit] = col[hit]
    sub[fuzz] = P.COTTON[3]
    e = hit.copy()                                             # dark outline round the tip
    e[1:, :] &= hit[:-1, :]
    e[:-1, :] &= hit[1:, :]
    e[:, 1:] &= hit[:, :-1]
    e[:, :-1] &= hit[:, 1:]
    sub[hit & ~e] = P.COTTON[0]
    dep = ctx.swab_depth[Y0:Y1, X0:X1]
    dep[hit] = np.minimum(dep[hit], lam[hit])


def gfx_hash_noise(ox, oy, oz, f):
    return hash2(np.floor(ox * f * 4.0), np.floor((oy + oz) * f * 4.0), 47)


def _stick(buf, ctx, C, a):
    cam, D = ctx.cam, ctx.D
    p0 = C + a * (0.5 * L_E)
    p1 = C + a * 170.0
    s0 = np.array(cam.px(*p0), float)
    s1 = np.array(cam.px(*p1), float)
    hw = R_STICK * cam.z
    X0, X1 = max(0, int(min(s0[0], s1[0]) - hw - 2)), min(W, int(max(s0[0], s1[0]) + hw + 3))
    Y0, Y1 = max(0, int(min(s0[1], s1[1]) - hw - 2)), min(H, int(max(s0[1], s1[1]) + hw + 3))
    if X0 >= X1 or Y0 >= Y1:
        return
    yy, xx = np.mgrid[Y0:Y1, X0:X1]
    px_, py_ = xx + 0.5, yy + 0.5
    v = s1 - s0
    L2 = float(v @ v) + 1e-9
    tt = np.clip(((px_ - s0[0]) * v[0] + (py_ - s0[1]) * v[1]) / L2, 0, 1)
    ex, ey = px_ - (s0[0] + tt * v[0]), py_ - (s0[1] + tt * v[1])
    nrm = np.array([-v[1], v[0]]) / math.sqrt(L2)
    if nrm[0] < 0:
        nrm = -nrm
    q = (ex * nrm[0] + ey * nrm[1]) / hw
    dist = np.hypot(ex, ey)
    m = dist < hw
    if not np.any(m):
        return
    lv = 2.6 - 1.7 * q + 0.9 * np.exp(-((q + 0.45) / 0.18) ** 2)
    k = np.clip(np.floor(lv + (D[Y0:Y1, X0:X1] - 0.5) * 0.7), 0, 4).astype(np.int64)
    col = P.STICK[k]
    col[dist > hw - 1.0] = P.OUTLINE
    sub = buf[Y0:Y1, X0:X1]
    sub[m] = col[m]
    # depth of the stick surface for the front-wall test (approximate: the axis depth)
    w_ = p0 + (p1 - p0) * tt[..., None]
    lam = (np.broadcast_to(((H / 2 - py_) / cam.z) * cam.c, tt.shape) - w_[..., 2]) / cam.s
    dep = ctx.swab_depth[Y0:Y1, X0:X1]
    dep[m] = np.minimum(dep[m], lam[m])
