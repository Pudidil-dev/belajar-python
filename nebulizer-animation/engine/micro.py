"""The mesh up close: a 50 um metal plate with tapered holes, the medicine behind it, and droplets pinching off.

Section view (cut through one row of holes). Each hole is a cone, wide on the liquid side (32 um) and narrow at the
exit (9 um). The plate vibrates as a slow wave travelling down the mesh (slow motion: the real thing is ~130 kHz), so
neighbouring holes take turns: liquid bulges out of the exit, grows a tip, the neck narrows and pinches off, the
droplet flies right toward the outlet, the meniscus recoils, and the next cycle starts.

All in world millimetres and on the micro clock (timeline.mu): one cycle per hole = 1.5 close-up seconds.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import put, tones, mix, sd_circle, sd_capsule, smin, lit
from . import device as D

TH = 0.050                      # plate thickness
HT = TH / 2
W_IN, W_EX = 0.016, 0.0045      # hole half-widths: liquid side, exit
RE = W_EX
R_DROP = 1.12 * RE              # droplet radius (~5 um)
AMP = 0.0035                    # plate displacement amplitude (exaggerated)
ACTIVE = 3.4                    # holes only in the middle of the dome (|y| < ACTIVE)
V0, TAU, VF = 0.030, 0.9, 0.010  # droplet launch speed, drag time, drift speed (mm per close-up second)
HEAD_AT_PINCH = 4.2 * RE - 1.15 * RE
A_MAX = 64.0                    # droplets older than this (close-up s) have merged into the cloud
A_FADE = 30.0
DEPTH_ROWS = ((0, 0.0, 0.0, 1.0, 1.0), (1, 0.43, 0.17, 0.62, 0.55), (2, 0.71, -0.29, 0.52, 0.42),
              (3, 0.19, 0.41, 0.44, 0.34), (4, 0.57, -0.11, 0.38, 0.3), (5, 0.86, 0.29, 0.34, 0.26),
              (6, 0.31, -0.43, 0.3, 0.22))   # (row, y offset in pitches, phase offset, size, alpha)


def hole_half_width(xl):
    """xl = position across the plate (-HT liquid side .. +HT exit side)."""
    s = np.clip((HT - xl) / TH, 0, 1)
    return W_EX + (W_IN - W_EX) * s ** 1.5


def phase_y(y, t, m=0):
    """Continuous cycle phase along the mesh (the travelling wave); equals hole_phase(k) at y = k * PITCH."""
    return (T.mu(t) / T.CYCLE - (y / T.PITCH) * T.STAGGER + T.PHASE0 + DEPTH_ROWS[m][2]) % 1.0


def plate_shift(y, t, z):
    """Plate displacement in x (mm). Fades out when the camera is far (it is a slow-motion view of a buzz)."""
    ph = phase_y(y, t)
    vis = np.clip((z - 150.0) / 300.0, 0, 1)
    return AMP * np.cos(2 * math.pi * (ph - 0.05)) * vis


def tip_shape(ph):
    """Protrusion beyond the exit for cycle phase ph -> (length L, head radius Rh, neck radius rn, attached)."""
    if ph < 0.12:
        u = ph / 0.12
        return -0.30 * RE * (1 - u), RE, RE, True
    if ph < 0.32:
        u = (ph - 0.12) / 0.20
        return RE * u, RE, RE, True
    if ph < 0.60:
        u = (ph - 0.32) / 0.28
        e = u * u * (3 - 2 * u)
        return RE * (1 + 2.6 * e), RE * (1 + 0.15 * e), RE * (1 - 0.25 * e), True
    if ph < T.PINCH:
        u = (ph - 0.60) / (T.PINCH - 0.60)
        return RE * (3.6 + 0.6 * u), 1.15 * RE, 0.75 * RE * (1 - u) ** 0.7, True
    # after the pinch: a short tail retracts, the meniscus recoils
    if ph < 0.80:
        u = (ph - T.PINCH) / (0.80 - T.PINCH)
        return RE * 2.2 * (1 - u), 0.0, 0.32 * RE * (1 - u), False
    u = (ph - 0.80) / 0.20
    return -0.30 * RE * math.sin(math.pi * u * 0.5), 0.0, RE, False


def _tip_sdf(X, Y, ex, yk, ph):
    """Signed distance of the liquid protruding from one hole's exit at (ex, yk)."""
    L, Rh, rn, attached = tip_shape(ph)
    lx = X - ex
    ly = Y - yk
    if L <= 0:
        return None
    if attached:
        if L <= RE * 1.0:                 # a growing cap
            c = L - RE
            return np.sqrt((lx - c) ** 2 + ly * ly) - RE
        hx = L - Rh
        neck = sd_capsule(lx, ly, 0.0, 0.0, hx, 0.0, max(rn, 1e-5))
        head = np.sqrt((lx - hx) ** 2 + ly * ly) - Rh
        base = np.sqrt((lx + 0.3 * RE) ** 2 + ly * ly) - RE * 1.05
        return smin(smin(neck, head, 0.6 * RE), base, 0.5 * RE)
    # detached: the tail cone retracting into the meniscus
    tail = sd_capsule(lx, ly, 0.0, 0.0, L, 0.0, max(rn, 1e-5))
    base = np.sqrt((lx + 0.6 * RE) ** 2 + ly * ly) - RE * 1.05
    return smin(tail, base, 0.5 * RE)


def draw_plate(buf, view, t):
    """Plate, holes, medicine and the growing tips, for zooms where the plate is a few pixels thick or more."""
    z = view.z
    o = 1.0 / z
    xr0, yr0, xr1, yr1 = view.world_rect()
    y0, y1 = max(yr0, -D.MESH_R), min(yr1, D.MESH_R)
    if y1 <= y0:
        return
    xa = float(D.dome_x(np.clip((y0 + y1) / 2, -D.MESH_R, D.MESH_R)))
    bx = view.box(max(xr0, xa - 0.6), y0, min(xr1, xa + 0.4), y1)
    if bx is None:
        return
    X, Y = view.grid(bx)
    u = plate_shift(Y, t, z)
    xc = D.dome_x(Y) + u
    xl = X - xc
    k = np.round(Y / T.PITCH)
    yl = Y - k * T.PITCH
    active = np.abs(k * T.PITCH) < ACTIVE
    w = hole_half_width(xl)
    in_plate = np.abs(xl) <= HT
    in_hole = in_plate & (np.abs(yl) < w) & active
    # meniscus inside the hole when it recoils (concave)
    ph = phase_y(k * T.PITCH, t)
    metal = in_plate & ~in_hole
    left = xl < -HT
    shape = (bx[3] - bx[1], bx[2] - bx[0])
    liquid = np.zeros(shape, bool)
    liquid |= left & (np.abs(Y) < D.CHAN[2])
    liquid |= in_hole
    # tips: evaluate per visible hole near the exit
    ks = np.unique(k[0:1, :].ravel()) if False else np.unique(k)
    tip_any = np.zeros(shape, bool)
    tip_d = np.full(shape, np.inf, np.float32)
    concave = np.zeros(shape, bool)
    if z > 120:
        for kk in ks:
            yk = kk * T.PITCH
            if abs(yk) >= ACTIVE:
                continue
            p = float(phase_y(yk, t))
            L, Rh, rn, att = tip_shape(p)
            exx = float(D.dome_x(yk)) + float(plate_shift(np.array(yk), t, z)) + HT
            if L < 0:
                rows = np.abs(Y - yk) < W_EX * 1.2
                depth = -L * (1 - np.clip(((Y - yk) / W_EX) ** 2, 0, 1))
                concave |= rows & in_hole & (X > exx - depth)
                continue
            d = _tip_sdf(X, Y, exx, yk, p)
            if d is None:
                continue
            m = (d < 0) & (X > exx - 0.0005)
            tip_any |= m
            tip_d = np.where(m, np.minimum(tip_d, d), tip_d)
    liquid &= ~concave
    air = ~(liquid | metal | tip_any)
    # ---- paint: air (inside the outlet), liquid, metal
    i0, j0, i1, j1 = bx
    av = 0.32 + 0.1 * np.clip((X - xc) / 0.05, 0, 1)
    put(buf, bx, air & ~left, tones(P.NV, np.clip(av, 0, 1), bx))
    # medicine: deeper is darker; a bright skin along every surface; pressure arcs from the vibrating plate
    lq = liquid | tip_any
    surf_d = np.abs(xl + HT)
    lv = 0.48 + 0.18 * np.clip(1 - surf_d / 0.03, 0, 1)
    arcs = np.cos(2 * math.pi * (T.mu(t) / T.CYCLE - (xl + HT) / 0.045)) > 0.93
    lv = np.where(left & arcs & (surf_d < 0.06) & (surf_d > 0.004) & (z > 300), lv + 0.07, lv)
    put(buf, bx, lq, tones(P.CY, np.clip(lv, 0, 1), bx))
    if tip_any.any():
        gy, gx = np.gradient(np.where(tip_any, tip_d, 0.0), o)
        nn = np.sqrt(gx * gx + gy * gy) + 1e-6
        tv = 0.3 + 0.62 * lit(gx / nn, gy / nn, tip_d, RE * 1.2)
        put(buf, bx, tip_any, tones(P.CY, np.clip(tv, 0, 1), bx))
        put(buf, bx, tip_any & (tip_d > -1.2 * o), P.CY[8])
    # metal section: hatched cut face, bright bevel on the hole walls facing the light
    mv = 0.62 + 0.1 * np.clip(-yl / T.PITCH, -0.5, 0.5)
    put(buf, bx, metal, tones(P.MT, np.clip(mv, 0, 1), bx))
    hat = ((np.arange(i0, i1)[None, :] - int(round(view.ox)) + np.arange(j0, j1)[:, None]
            - int(round(view.oy))) % 5) == 0
    put(buf, bx, metal & hat & (z > 60), P.MT[4])
    # outlines: metal edges dark, liquid surfaces bright
    if z > 40:
        e = np.zeros(shape, bool)
        e[1:, :] |= metal[1:, :] != metal[:-1, :]
        e[:, 1:] |= metal[:, 1:] != metal[:, :-1]
        put(buf, bx, e & metal, P.MT[2])
        sky = np.zeros(shape, bool)
        sky[:, :-1] |= lq[:, :-1] & air[:, 1:]
        sky[:-1, :] |= lq[:-1, :] & air[1:, :]
        sky[1:, :] |= lq[1:, :] & air[:-1, :]
        put(buf, bx, sky, P.CY[8])


# ------------------------------------------------------------------ droplets
def _hash01(*a):
    h = np.int64(0)
    acc = np.zeros(np.broadcast(*a).shape, np.int64)
    mult = (374761393, 668265263, 1442695041, 2246822519, 3266489917)
    for i, x in enumerate(a):
        acc = acc + np.asarray(x, np.int64) * mult[i % len(mult)]
    acc &= 0xFFFFFFFF
    acc = ((acc ^ (acc >> 13)) * 1274126177) & 0xFFFFFFFF
    acc ^= acc >> 16
    return (acc & 0xFFFF).astype(np.float64) / 65535.0


def xdrift(a):
    return V0 * TAU * (1 - np.exp(-a / TAU)) + VF * a


def population(view, t, hero_skip=False):
    """All droplets near the view: arrays x, y, r (mm), alpha, depth row."""
    z = view.z
    xr0, yr0, xr1, yr1 = view.world_rect()
    marg = 0.05
    if xr1 < -0.05 or xr0 > xdrift(A_MAX) + 0.2:
        return None
    mu = T.mu(t)
    out = []
    nmax = int(A_MAX / T.CYCLE) + 1
    n = np.arange(nmax)
    for row, yo, po, sz, al in DEPTH_ROWS:
        if row > 0 and z > 1400:
            al *= 0.85
        if row >= 2 and z < 200:
            continue
        if row >= 4 and z < 900:
            continue
        ka = math.floor((max(yr0, -ACTIVE) - marg) / T.PITCH - yo) - 1
        kb = math.ceil((min(yr1, ACTIVE) + marg) / T.PITCH - yo) + 1
        if kb < ka:
            continue
        ks = np.arange(ka, kb + 1)
        yk = (ks + yo) * T.PITCH
        ph = (mu / T.CYCLE - (yk / T.PITCH) * T.STAGGER + T.PHASE0 + po) % 1.0
        since = ((ph - T.PINCH) % 1.0)[:, None]
        a = (since + n[None, :]) * T.CYCLE                  # ages (close-up seconds)
        KK = np.broadcast_to(ks[:, None], a.shape)
        # the index of each droplet's own emission (stable while it flies)
        emis = np.floor(mu / T.CYCLE - (yk / T.PITCH) * T.STAGGER + T.PHASE0 + po - T.PINCH)[:, None] - n[None, :]
        X = xdrift(a)
        rnd = _hash01(KK, emis.astype(np.int64), row + 3)
        rnd2 = _hash01(KK, emis.astype(np.int64), row + 17)
        spread = 0.28 * np.maximum(X - 0.03, 0) ** 0.9
        wob = 0.6 * np.sin(a * 0.9 + rnd2 * 6.28)
        y = yk[:, None] + spread * ((rnd - 0.5) * 2.6 + wob * 0.4)
        x = D.dome_x(np.clip(yk, -D.MESH_R, D.MESH_R))[:, None] + HT + HEAD_AT_PINCH + X
        r = R_DROP * sz * (0.82 + 0.36 * rnd2)
        alpha = al * np.clip(1 - (a - A_FADE) / (A_MAX - A_FADE), 0, 1) * np.ones_like(a)
        if hero_skip and row == 0:
            hero_k = (ks == 0)[:, None]
            # the droplet that pinched off at HERO from hole 0 is drawn separately (it is the hero)
            tag = np.abs(emis - math.floor(T.mu(T.HERO) / T.CYCLE + T.PHASE0 - T.PINCH + 1e-6)) < 0.5
            alpha = np.where(hero_k & tag, 0.0, alpha)
        sel = (x > xr0 - marg) & (x < xr1 + marg) & (y > yr0 - marg) & (y < yr1 + marg) & (alpha > 0.02)
        out.append((x[sel], y[sel], r[sel], alpha[sel], np.full(sel.sum(), row)))
    if not out:
        return None
    return [np.concatenate(c) for c in zip(*out)]


_STAMPS = {}


def _stamp(rpx):
    """Pre-shaded droplet sprites for small radii: offsets and ramp values."""
    key = round(rpx * 2) / 2
    if key in _STAMPS:
        return _STAMPS[key]
    R = max(key, 0.5)
    n = int(math.ceil(R)) + 1
    pts = []
    for dy in range(-n, n + 1):
        for dx in range(-n, n + 1):
            d = math.hypot(dx, dy)
            if d <= R - 0.15 or (R < 1.0 and dx == 0 and dy == 0):
                nx, ny = dx / max(R, 1), dy / max(R, 1)
                nz = math.sqrt(max(0.0, 1 - min(1.0, nx * nx + ny * ny)))
                v = 0.35 + 0.55 * max(0.0, -0.6 * nx - 0.55 * ny + 0.58 * nz)
                if d > R - 1.15 and R >= 1.5:
                    v -= 0.18
                pts.append((dx, dy, min(1.0, v)))
    _STAMPS[key] = pts
    return pts


def draw_droplets(buf, view, t, alpha=1.0, hero_skip=False):
    if alpha <= 0.01:
        return
    pop = population(view, t, hero_skip)
    if pop is None:
        return
    x, y, r, al, row = pop
    if len(x) == 0:
        return
    z = view.z
    px, py = view.px(x, y)
    rpx = r * z
    al = al * alpha
    big = rpx >= 3.5
    small = ~big
    # ---- small droplets: pre-shaded stamps (vectorized)
    if small.any():
        sx, sy, sr, sa, srow = px[small], py[small], rpx[small], al[small], row[small]
        th = gfx.bayer_at(0, 0, gfx.H, gfx.W)
        buckets = np.round(np.clip(sr, 0.5, 3.5) * 2) / 2
        for b in np.unique(buckets):
            m = buckets == b
            ix = np.floor(sx[m]).astype(np.int64)
            iy = np.floor(sy[m]).astype(np.int64)
            aa = sa[m]
            dep = srow[m]
            for dx, dy, v in _stamp(b):
                xx, yy = ix + dx, iy + dy
                ok = (xx >= 0) & (xx < gfx.W) & (yy >= 0) & (yy < gfx.H)
                if not ok.any():
                    continue
                xx, yy, a2, d2 = xx[ok], yy[ok], aa[ok], dep[ok]
                keep = a2 * (1.0 - 0.18 * d2) > th[yy, xx]
                xx, yy = xx[keep], yy[keep]
                if len(xx) == 0:
                    continue
                ramp = P.MI if b < 1.5 else P.CY
                vi = v if b >= 1.5 else 0.55 + 0.45 * v
                ci = int(np.clip(round(vi * (len(ramp) - 1)), 0, len(ramp) - 1))
                if b >= 1.5:
                    ci = int(np.clip(round((0.45 + 0.55 * v) * (len(ramp) - 1)), 0, len(ramp) - 1))
                buf[yy, xx] = ramp[ci]
    # ---- big droplets: shaded spheres with a rim, a specular glint and a refracted crescent
    if big.any():
        order = np.argsort(row[big])[::-1]                 # far rows first
        for i in np.nonzero(big)[0][order]:
            sphere(buf, view, x[i], y[i], r[i], al[i], row[i])


def sphere(buf, view, x, y, r, a=1.0, depth=0, glint=True):
    z = view.z
    bx = view.box(x - r, y - r, x + r, y + r, 2)
    if bx is None:
        return
    X, Y = view.grid(bx)
    d = np.sqrt((X - x) ** 2 + (Y - y) ** 2) - r
    sel = d < 0
    if not sel.any():
        return
    if a < 0.98:
        sel &= gfx.bayer_at(bx[0], bx[1], bx[3] - bx[1], bx[2] - bx[0]) < a * 1.05
    nx, ny = (X - x) / r, (Y - y) / r
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    v = 0.32 + 0.6 * np.clip(-0.6 * nx - 0.55 * ny + 0.58 * nz, 0, 1)
    v = v + 0.22 * np.clip(0.75 - np.hypot(nx - 0.45, ny - 0.5) * 2.2, 0, 1)   # light focused through the drop
    if depth > 0:
        put(buf, bx, sel, tones(P.CY, np.clip(0.42 + 0.35 * v, 0, 1), bx))
        return
    put(buf, bx, sel, tones(P.CY, np.clip(v, 0, 1), bx))
    put(buf, bx, sel & (d > -1.0 / z), P.CY[2])
    if glint and depth == 0:
        g = np.sqrt((X - (x - 0.38 * r)) ** 2 + (Y - (y - 0.4 * r)) ** 2) < max(0.2 * r, 0.75 / z)
        put(buf, bx, sel & g, P.WHITE)
