"""The cut face: skin in cross-section, and the blood on it, at the cut plane through the main cup.

Schematic, not to scale (the layers and cells are drawn much bigger than life so they can be read): epidermis with a
pale outer line and wavy papillae, dermis with collagen fibres, a capillary loop rising into every papilla and a small
vessel running along the bottom of the dermis, fat lobules, and striated muscle. Under the cup the low pressure pulls
everything up into a dome; the pull fades with depth, so the skin rises most and the muscle hardly at all. The vessels
widen a little and tiny spots of blood (petechiae) appear in the upper dermis: that is where the round mark comes from.

The lancet's three tiny openings cross the epidermis into the upper dermis. Under suction a little blood leaves a cut
capillary through them, beads on the skin, runs down the dome and collects at the rim inside the cup.
"""
import math
import numpy as np
from . import gfx
from . import view as V
from . import state as S
from . import timeline as T
from .back import half_width, wiped
from .palette import EPI, DERMIS, FAT, MUSCLE, BLOOD, VESSEL, MARK, OUTLINE, NAVY, PLASMA

PAP = 2.4                      # papilla spacing (mm)
PLEX = -4.2                    # the small vessel along the bottom of the dermis
CAP_W = 0.3                    # capillary limb offset


def _z0(Z, h):
    """Undo the upward pull: the undeformed depth z0 of a point now at height Z (h = dome height above it), i.e. the
    exact inverse of _zof: Z = z0 + h * exp(min(z0, 0) / LAMBDA).

    Above the old skin level the tissue just moves up by h. Below it, Newton's method, started from min(Z, 0), which
    lies on the far side of the root: there the function is increasing and convex, so the steps close in from one side
    and cannot overshoot (a plain fixed-point iteration diverges once h > LAMBDA)."""
    Z, h = np.asarray(Z, float), np.asarray(h, float)
    z0 = np.minimum(Z, 0.0)
    for _ in range(8):
        e = h * np.exp(z0 / S.LAMBDA)
        z0 = z0 - (z0 + e - Z) / (1.0 + e / S.LAMBDA)
    return np.where(Z >= h, Z - h, z0)


def _zof(x, z0, t, ycut):
    """Where an undeformed point (x, z0) is now (its height after the pull)."""
    h = S.dome_at(t, x, ycut)
    return z0 + h * math.exp(min(z0, 0.0) / S.LAMBDA)


def papilla(x):
    return -1.15 + 0.35 * np.sin(2 * np.pi * (x - 0.6) / PAP + np.pi / 2)


def suction_at(t, x, ycut):
    sx, sy = S.SPOTS[S.MAIN]
    d = S.dome_h(t, S.MAIN)
    r2 = ((x - sx) ** 2 + (ycut - sy) ** 2) / (S.R_IN ** 2)
    return np.clip(1 - r2, 0, 1) * min(1.0, d / 6.0) * (1.0 if t < T.PSSSH else 0.4)


def paint_cut(buf, v, t):
    """The cross-section on the cut face (only where the camera has a cut and can see it)."""
    if v.ZC is None:
        return np.zeros((V.H, V.W), bool)
    X = np.broadcast_to(v.X, (V.H, V.W))
    Z = np.broadcast_to(v.ZC, (V.H, V.W))
    h = np.broadcast_to(S.dome_at(t, v.X, v.ycut), (V.H, V.W))
    body = np.abs(X) <= half_width(v.ycut)
    face = (Z <= h) & (Z >= -S.DEPTH) & body
    if not face.any():
        return face
    z0 = _z0(Z, h)
    b = papilla(X)
    suc = np.broadcast_to(suction_at(t, v.X, v.ycut), (V.H, V.W))
    epi = face & (z0 > b)
    der = face & (z0 <= b) & (z0 > -6.5)
    fat = face & (z0 <= -6.5) & (z0 > -14.0)
    mus = face & (z0 <= -14.0)
    buf[epi] = EPI[1]
    buf[epi & (z0 > -0.22)] = EPI[2]                                        # the outer, horny layer
    buf[epi & (z0 < b + 0.16)] = EPI[0]                                     # the basal layer
    buf[der] = DERMIS[1]
    buf[der & (z0 > -2.3) & V.CHECK] = DERMIS[2]                            # the looser upper dermis
    fib = np.mod(z0 * 2.6 + 0.6 * np.sin(X * 1.9), 1.25) < 0.16
    buf[der & fib & (z0 < -2.3)] = DERMIS[0]
    # fat lobules (a hex grid of round cells with thin walls)
    gx, gz = X / 3.6, (z0 + 6.5) / 3.1
    rz = np.floor(gz)
    rx = np.floor(gx + 0.5 * (rz % 2))
    cx = (rx - 0.5 * (rz % 2) + 0.5) * 3.6
    cz = (rz + 0.5) * 3.1 - 6.5
    dd = np.sqrt(((X - cx) / 1.8) ** 2 + ((z0 - cz) / 1.55) ** 2)
    buf[fat] = FAT[1]
    buf[fat & (dd > 0.86)] = FAT[0]
    buf[fat & (dd < 0.45) & (X < cx) & (z0 > cz)] = FAT[2]
    buf[mus] = MUSCLE[1]
    buf[mus & (np.mod(z0, 1.15) < 0.28)] = MUSCLE[0]
    buf[mus & (np.mod(X * 0.8 + np.floor(z0 / 1.15) * 0.5, 2.6) < 0.18)] = MUSCLE[2]
    buf[face & (Z < -S.DEPTH + 0.45)] = OUTLINE
    # vessels: a small one along the bottom of the dermis, a capillary loop in every papilla, two deeper ones in the fat
    dil = 1.0 + 0.5 * suc
    plex = face & (np.abs(z0 - PLEX) < 0.42 * dil)
    buf[plex] = VESSEL[1]
    buf[plex & (np.abs(z0 - PLEX) < 0.14 * dil)] = VESSEL[2]
    xc = np.round((X - 0.6) / PAP) * PAP + 0.6
    top = papilla(xc) - 0.3
    limb = (np.abs(np.abs(X - xc) - CAP_W * dil) < 0.13 * dil) & (z0 < top) & (z0 > PLEX)
    arc = (np.abs(np.sqrt((X - xc) ** 2 + (z0 - top) ** 2) - CAP_W * dil) < 0.13 * dil) & (z0 >= top)
    buf[face & (limb | arc)] = VESSEL[2]
    for zz, rr, col in ((-10.0, 0.75, VESSEL[2]), (-11.9, 0.95, VESSEL[0])):
        ves = face & (np.abs(z0 - zz) < rr)
        buf[ves] = col
        buf[ves & (np.abs(z0 - zz) > rr - 0.18)] = VESSEL[0] if col != VESSEL[0] else OUTLINE
    # petechiae: tiny spots of blood in the upper dermis under the cup, growing with the suction
    sx, sy = S.SPOTS[S.MAIN]
    under = face & (np.abs(X - sx) < S.R_IN * 0.92) & (z0 < -0.9) & (z0 > -2.6)
    k = S.mark_k(t) if t >= T.POP else T.smooth(T.u_of(t, (9.5, 13.0))) * 0.7
    if k > 0:
        cx_, cz_ = np.floor(X / 0.35), np.floor(z0 / 0.35)
        hit = V.hash01(cx_, cz_) < 0.09 * k
        inside = ((X - (cx_ + 0.5) * 0.35) ** 2 + (z0 - (cz_ + 0.5) * 0.35) ** 2) < max(0.07, 0.6 / v.s) ** 2
        buf[under & hit & inside] = MARK[0]
    # the tiny openings: through the epidermis into the upper dermis
    if S.tapped(t, S.MAIN) and abs(v.ycut - sy) < 1.0:
        bleeding = T.LEAK[0] - 0.3 <= t < T.POP + 0.5
        for dx in S.PUNCT:
            w = 0.16 if bleeding else max(0.07, 0.55 / v.s)
            op = face & (np.abs(X - (sx + dx)) < w) & (z0 > -1.8)
            buf[op] = BLOOD[0] if bleeding else EPI[0]
    return face


# ---------------------------------------------------------------- red blood cells (drawn when the camera is close)
def rbc(buf, v, x, z, r, phase=0.0, col=None):
    """A red blood cell at world (x, z) on the cut plane: a disc, darker rim, pale centre when big enough."""
    px, py = v.to(x, v.ycut, z)
    rp = r * v.s
    if rp < 1.2:
        V.dot(buf, px, py, BLOOD[1] if col is None else col, 2 if rp > 0.7 else 1)
        return
    tumble = 0.55 + 0.45 * abs(math.cos(phase))
    m = V.ell(px, py, rp, rp * tumble)
    buf[V.full(m)] = BLOOD[2] if col is None else col
    buf[V.edge(m)] = BLOOD[0]
    if rp > 4 and tumble > 0.7:
        buf[V.full(V.ell(px + rp * 0.1, py + rp * 0.1, rp * 0.42, rp * 0.42 * tumble))] = BLOOD[1]
        V.dot(buf, px - rp * 0.45, py - rp * 0.35 * tumble, BLOOD[3], max(1, int(rp / 5)))


def _loop_point(xc, top, p):
    """A point a fraction p (0..1) along a capillary loop: up one limb, over the top, down the other."""
    L1 = top - PLEX
    La = math.pi * CAP_W
    tot = 2 * L1 + La
    d = p * tot
    if d < L1:
        return xc - CAP_W, PLEX + d
    d -= L1
    if d < La:
        a = math.pi - d / CAP_W
        return xc + CAP_W * math.cos(a), top + CAP_W * math.sin(a)
    d -= La
    return xc + CAP_W, top - d


def paint_cells(buf, v, t):
    """Red blood cells moving through the capillaries and along the small vessel (only visible close up)."""
    if v.ZC is None or v.s < 9:
        return
    ta = T.anim(t)
    x_lo, x_hi = v.cx - V.W / 2 / v.s - 1, v.cx + V.W / 2 / v.s + 1
    r = 0.24
    k0, k1 = int(math.floor((x_lo - 0.6) / PAP)), int(math.ceil((x_hi - 0.6) / PAP))
    for k in range(k0, k1 + 1):
        xc = 0.6 + k * PAP
        top = float(papilla(xc)) - 0.3
        for j in range(3):
            p = (ta * 0.55 + j / 3.0 + (k * 0.37) % 1.0) % 1.0
            x, z0 = _loop_point(xc, top, p)
            rbc(buf, v, x, _zof(x, z0, t, v.ycut), r, ta * 3 + j + k)
    span = x_hi - x_lo
    for j in range(int(span / 0.9) + 1):
        x = x_lo + ((j * 0.9 + ta * 2.4) % span)
        rbc(buf, v, x, _zof(x, PLEX + 0.12 * math.sin(j * 1.7), t, v.ycut), r, ta * 2 + j)
    # through an opening: cells leave a cut capillary, rise through the opening and join the bead on the skin
    if T.LEAK[0] - 0.3 <= t < T.COLLECT[1]:
        sx, sy = S.SPOTS[S.MAIN]
        for dx in S.PUNCT:
            xp = sx + dx
            for j in range(4):
                p = ((ta - T.LEAK[0]) * 0.8 + j / 4.0) % 1.0
                z0 = T.lerp(-1.7, 0.1, p)
                rbc(buf, v, xp + 0.05 * math.sin(j * 2.1 + ta * 5), _zof(xp, z0, t, v.ycut), r * 0.9, ta * 4 + j)


# ---------------------------------------------------------------- blood on the skin and in the cup
def _bead_r(t, i):
    """Radius (mm) of the bead at opening i, and whether it is rolling down (fraction of the way to the rim)."""
    if t < T.LEAK[0]:
        return 0.0, None
    if t < T.COLLECT[0]:
        return 1.25 * T.smooth(T.u_of(t, (T.LEAK[0] + 0.15 * i, T.COLLECT[0]))), None
    if t < T.COLLECT[1] + 1.0:                                  # time-lapse: beads grow and roll, again and again
        per = 0.5
        ph = ((t - T.COLLECT[0]) / per + i * 0.33) % 1.0
        if ph < 0.6:
            return 0.5 + 0.9 * T.smooth(ph / 0.6), None
        return 1.4, (ph - 0.6) / 0.4
    return 0.6, None


def paint_blood(buf, v, t):
    """Beads at the openings, their runs, the pool at the rim; after the cup comes off, the clot inside it and the
    left-over blood on the skin."""
    if v.ZC is None:
        return
    sx, sy = S.SPOTS[S.MAIN]
    if abs(v.ycut - sy) > 6.0:
        return
    X = np.broadcast_to(v.X, (V.H, V.W))
    Z = np.broadcast_to(v.ZC, (V.H, V.W))
    near = np.abs(X - sx) < S.R_IN
    h = np.broadcast_to(S.dome_at(t, v.X, v.ycut), (V.H, V.W))
    k_clot = S.clot(t)
    bay = gfx.BAYER[:V.H, :V.W]
    if t < T.POP:
        d = S.pool_d(t, S.MAIN)
        # the runs: once beads have rolled, a thin red film stays on the dome
        if t >= T.COLLECT[0] + 0.2:
            film = near & (Z > h) & (Z < h + max(0.25, 1.2 / v.s)) & (np.abs(X - sx) > 2.5) & \
                (np.abs(X - sx) < 4 + 15 * T.smooth(T.u_of(t, (T.COLLECT[0], T.COLLECT[0] + 1.2))))
            buf[film] = BLOOD[1]
        for i, dx in enumerate(S.PUNCT):
            rb, roll = _bead_r(t, i)
            if rb < 0.05:
                continue
            xp = sx + dx
            if roll is not None:
                side = -1 if (dx < 0 or (dx == 0 and int((t - T.COLLECT[0]) / 0.5) % 2 == 0)) else 1
                xp = xp + side * (S.R_IN - 2.0 - abs(dx)) * roll ** 1.6
                rb *= 1 - 0.4 * roll
            zp = float(S.dome_at(t, np.array(xp), v.ycut)) + rb * 0.75
            _bead(buf, v, xp, zp, rb)
        # the collected blood, painted last: below its surface it covers the dome, the runs and the beads
        if d > 0.05:
            px1 = 1.0 / v.s                                   # one canvas pixel, in mm
            pool = near & (Z > h) & (Z < d)
            _pool_shade(buf, pool, Z < 0.35 * d, bay, k_clot)
            buf[pool & (Z < h + max(0.25, 1.2 * px1))] = BLOOD[0]       # where it lies on the skin
            wav = 0.12 * (1 - k_clot) * np.sin(X * 2.0 + T.anim(t) * 6.0)   # the surface stills as it thickens
            buf[pool & (Z > d - 0.35 / max(v.s / 5, 1) + wav - 0.1)] = BLOOD[2]
    else:
        # the clot goes up with the cup; a little blood stays on the skin until the gauze wipes it
        lz = S.lift(t)
        d = S.pool_d(T.POP - 1e-3, S.MAIN)
        hp = np.broadcast_to(S.dome_at(T.POP - 1e-3, v.X, v.ycut), (V.H, V.W))
        Zc = Z - lz
        clotm = near & (Zc > hp) & (Zc < d)
        _pool_shade(buf, clotm, Zc < 0.35 * d, bay, 1.0)
        buf[clotm & (Zc < hp + max(0.25, 1.2 / v.s))] = BLOOD[0]
        buf[clotm & (Zc > d - 0.45)] = BLOOD[2]
        for dx, _, rr in ((-5.0, 0, 0.7), (0.0, 0, 0.8), (5.0, 0, 0.7)):
            if wiped(t, sx + dx, sy):
                continue
            zp = float(S.dome_at(t, np.array(sx + dx), v.ycut)) + rr * 0.6
            _bead(buf, v, sx + dx, zp, rr)


def _pool_shade(buf, pool, lower, bay, k):
    """The collected blood: plain red, darker toward the bottom; as it thickens (k 0..1) an ordered dither darkens
    it a step. It stays a clear red throughout (no dark, "dirty" look)."""
    buf[pool] = BLOOD[1]
    buf[pool & (bay < 0.5 * k)] = BLOOD[0]
    buf[pool & lower & (bay < 0.5 + 0.5 * k)] = BLOOD[0]


def _bead(buf, v, x, z, r):
    px, py = v.to(x, v.ycut, z)
    rp = max(r * v.s, 0.8)
    m = V.circ(px, py, rp)
    buf[V.full(m)] = BLOOD[1]
    buf[V.edge(m) & V.full(V.YC > py)] = BLOOD[0]
    V.dot(buf, px - rp * 0.4, py - rp * 0.4, BLOOD[3], max(1, int(rp / 3)))


# ---------------------------------------------------------------- the micro-shot: cells in the collected blood
_rng = np.random.default_rng(12)
POOL_CELLS = [(_rng.uniform(-19.0, 19.0), _rng.uniform(0.0, 1.0), _rng.uniform(0, 6.28), _rng.uniform(0.6, 1.4))
              for _ in range(800)]                       # (x offset, height as a fraction of the level, phase, speed)


MICRO_S = (14.0, 26.0)        # camera scales (px/mm) over which the close-up look comes in


def paint_pool_cells(buf, v, t):
    """Red blood cells floating and tumbling in the collected blood (visible in the close-up). The cells appear from
    MICRO_S[0] on; the plasma around them comes in through an ordered dither over MICRO_S, so zooming in or out never
    switches the whole pool's colour in one frame."""
    if v.ZC is None or v.s < MICRO_S[0] or t >= T.POP:
        return
    sx, sy = S.SPOTS[S.MAIN]
    d = S.pool_d(t, S.MAIN)
    ta = T.anim(t)
    X = np.broadcast_to(v.X, (V.H, V.W))
    Z = np.broadcast_to(v.ZC, (V.H, V.W))
    h = np.broadcast_to(S.dome_at(t, v.X, v.ycut), (V.H, V.W))
    pool = (np.abs(X - sx) < S.R_IN) & (Z > h) & (Z < d)
    k = T.clamp01((v.s - MICRO_S[0]) / (MICRO_S[1] - MICRO_S[0]))
    plasma = pool & (gfx.BAYER[:V.H, :V.W] < k)
    buf[plasma] = PLASMA[0]
    buf[plasma & V.CHECK & (Z > d * 0.5)] = PLASMA[1]
    for (ox, oz, ph, sp) in POOL_CELLS:
        x = sx + ox + 0.25 * math.sin(ta * 0.9 * sp + ph)
        z = 0.2 + oz * (d - 0.35) + 0.18 * math.cos(ta * 0.7 * sp + ph * 1.3)
        px, py = v.to(x, v.ycut, z)
        if not (-20 < px < V.W + 20 and -20 < py < V.H + 20):
            continue                                          # off screen
        hz = float(S.dome_at(t, np.array(x), v.ycut))
        if abs(x - sx) >= S.R_IN - 0.25 or z <= hz + 0.2 or z >= d - 0.15:
            continue
        rbc(buf, v, x, z, 0.26, ta * 1.6 * sp + ph)
