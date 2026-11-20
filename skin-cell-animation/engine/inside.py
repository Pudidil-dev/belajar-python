"""Inside the basal cell while it divides (8.75 s of the slow-motion division): how one skin cell becomes two.

The camera has zoomed into the basal cell at the bottom of the epidermis. It sits on the basement membrane (the dermis
below), held down by hemidesmosomes, with a neighbour on each side and the cell born before it above. Then:

1. CHROMOSOMES, DNA COPIED AND PACKED. The DNA was copied before the division began; now it packs into X-shaped
   chromosomes (the two halves of an X are the two identical copies), and the two centrosomes move to the top and the
   bottom of the nucleus.
2. SPINDLE, CATCHES EACH ONE. The nuclear envelope breaks up and fibres from the two poles catch every chromosome,
   one fibre from each side.
3. LINED UP. The chromosomes line up across the middle of the cell.
4. PULLED APART, ONE COPY EACH WAY. Each X splits: one copy is pulled up, the other down, and the cell stretches.
   Each chromosome has its own colour, so you can see each new cell get one of each.
5. TWO NEW CELLS, ONE STAYS, ONE GOES UP. A nucleus forms around each set and a ring pinches the cell in two. The
   spindle stood upright, so the new cells sit one above the other: the bottom one stays on the basement membrane (a
   basal cell still), the top one is the cell we follow, about to be pushed up.

Drawn on the 270x480 canvas in design pixels (26 per tissue unit, so the basal cell matches the tissue's at the cut),
seen through a camera that follows the division and pulls back as the cell stretches. Every event that has a sound
(a chromosome packing up, the envelope breaking, a fibre catching, the line-up, the split, the new nuclei) happens on
the 16th-note grid.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import pixfont
from .palette import (OUTLINE, WHITE, SPIN, BASAL, GAP, NUC, NUC_IN, CHROMO, SPINDLE, RIBO, MITO, RING, KERATIN,
                      SPARK, HERO, WARM, DERMIS, COLLAGEN)

W, H = gfx.W, gfx.H
DUR = T.INSIDE[1] - T.INSIDE[0]
_B4 = gfx._B4
_BZ = ((_B4[np.arange(H)[:, None] % 4, np.arange(W)[None, :] % 4] + 0.5) / 16.0).astype(np.float32)
_CK = ((np.arange(H)[:, None] + np.arange(W)[None, :]) % 2) == 0


def warm(col, k=0.3):
    return tuple(int(round(a + (b - a) * k)) for a, b in zip(col, WARM))


CYTO = [warm(c_, 0.28) for c_ in BASAL]          # our basal cell, warm as on the tissue scale
NEIGH = [tuple(c_) for c_ in BASAL]              # the neighbouring basal cells
ABOVE = [warm(c_, 0.08) for c_ in SPIN]          # the cells above them (spinous)

UNIT = 26.0                                      # design px per tissue unit (the zoom-in's scale)
CX, Y0 = 135.0, 300.0                            # the basal cell's centre
HW, HH, RR = 4.6 * UNIT, 6.4 * UNIT, 88.0        # its half width and height (as on the tissue scale), corner radius
E_MAX = 13.0 * UNIT                              # how far above the bottom cell the top one ends up
Y_BM = Y0 + HH + 4.0                             # the basement membrane
GAPW = 6.0                                       # the gap to the neighbours
NUC_R = (78.0, 90.0)

# the events (seconds into the look inside; the film time is T.INSIDE[0] + u, and each is on a 16th)
T_COND = tuple(0.3125 + 0.15625 * i for i in range(4))     # each chromosome packs up
T_ENV = 1.71875                                           # the nuclear envelope breaks up
T_ATT = tuple(1.875 + 0.15625 * j for j in range(8))      # fibre j catches chromosome j // 2 (from the top, then below)
T_LINED = 3.75                                            # all lined up (the downbeat of bar 4)
T_SPLIT = 4.6875                                          # the copies part
T_NUCS = 6.25                                             # two new nuclei (the downbeat of bar 5)

CH_P0 = ((-36.0, -30.0), (30.0, -40.0), (-24.0, 34.0), (38.0, 26.0))   # where each packs up, in the nucleus
CH_A0 = (25.0, -40.0, 70.0, -15.0)
CH_X = (-72.0, -24.0, 24.0, 72.0)                                       # its place across the middle


def edge(m):
    e = m.copy()
    e[1:] &= m[:-1]
    e[:-1] &= m[1:]
    e[:, 1:] &= m[:, :-1]
    e[:, :-1] &= m[:, 1:]
    return m & ~e


def seg(X, Y, ax, ay, bx, by, r):
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy + 1e-9
    t = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
    return np.hypot(X - ax - dx * t, Y - ay - dy * t) <= r


def polyline(X, Y, pts, r):
    m = np.zeros(np.broadcast(X, Y).shape, bool)
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        m |= seg(X, Y, ax, ay, bx, by, r)
    return m


def rrect_sd(U, V, hw, hh, r):
    qx = np.abs(U) - (hw - r)
    qy = np.abs(V) - (hh - r)
    return np.hypot(np.maximum(qx, 0.0), np.maximum(qy, 0.0)) + np.minimum(np.maximum(qx, qy), 0.0) - r


# ---------------------------------------------------------------- how far it has got
def kk(u):
    """The division's progress (the same number the tissue draws it from)."""
    return T.div_k(T.INSIDE[0] + u)


def elong(u):
    """How far the top half has risen out of the bottom one (design px)."""
    return E_MAX * T.smooth((kk(u) - 0.3) / 0.58)


def pinch(u):
    """How far the furrow has cut in (1: the two cells have come apart)."""
    return T.clamp01((kk(u) - 0.55) / 0.35)


def poles(u):
    E = elong(u)
    return Y0 - E - HH + 60.0, Y0 + HH - 60.0


# ---------------------------------------------------------------- the camera
# (u, x offset, y offset from the cell's middle, zoom): it settles in from the zoom, pushes onto the chromosomes as
# they pack up, pulls back to see both poles, leans in on the line-up and stays close while the copies are pulled
# apart, then pulls back as the cell pinches in two, ending where the tissue camera picks up (0.66 = scenes.S_OUT).
CAM_KEYS = ((0.0, 0.0, 0.0, 1.10), (1.3, 0.0, -8.0, 1.24), (2.6, 0.0, 0.0, 1.00), (3.9, 0.0, 0.0, 1.12),
            (5.9, 0.0, 0.0, 1.16), (7.4, 0.0, 0.0, 0.74), (DUR, 0.0, 0.0, 0.66))


def _slopes(ts, ys):
    """Monotone cubic (Fritsch-Carlson) slopes, zero at both ends."""
    h = np.diff(ts)
    d = np.diff(ys) / h
    m = np.zeros(len(ts))
    for i in range(1, len(ts) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    return m


_CT = np.array([k[0] for k in CAM_KEYS])
_CV = np.array([k[1:] for k in CAM_KEYS])
_CM = np.stack([_slopes(_CT, _CV[:, j]) for j in range(3)], 1)


def cam(u):
    """(centre x, centre y, zoom) of the camera inside the cell at u."""
    u = min(max(u, 0.0), DUR)
    i = int(np.clip(np.searchsorted(_CT, u, side='right') - 1, 0, len(_CT) - 2))
    h = _CT[i + 1] - _CT[i]
    k = (u - _CT[i]) / h
    h00, h10, h01, h11 = 2 * k ** 3 - 3 * k ** 2 + 1, k ** 3 - 2 * k ** 2 + k, -2 * k ** 3 + 3 * k ** 2, k ** 3 - k ** 2
    v = h00 * _CV[i] + h10 * h * _CM[i] + h01 * _CV[i + 1] + h11 * h * _CM[i + 1]
    return CX + float(v[0]), Y0 - elong(u) / 2 + float(v[1]), float(v[2])


def grids(u):
    c = cam(u)
    cx, cy, z = c
    X = (np.arange(W)[None, :] + 0.5 - W / 2) / z + cx
    Y = (np.arange(H)[:, None] + 0.5 - H / 2) / z + cy
    X, Y = np.broadcast_arrays(X, Y)
    return X, Y, c


def to_canvas(x, y, c):
    cx, cy, z = c
    return (x - cx) * z + W / 2, (y - cy) * z + H / 2


# ---------------------------------------------------------------- the cell's outline
def cell_sd(X, Y, u):
    """Signed distance to our cell's membrane (negative inside): the bottom cell, the top one rising out of it, the
    body between them, and the furrow pinching it in two until two rounded cells are left."""
    E = elong(u)
    yt, ym = Y0 - E, Y0 - E / 2
    U = X - CX
    lo = rrect_sd(U, Y - Y0, HW, HH, RR)
    hi = rrect_sd(U, Y - yt, HW, HH, RR)
    two = np.minimum(lo, hi)
    sd = two
    if E > 1.0:
        sd = np.minimum(sd, rrect_sd(U, Y - ym, HW, E / 2, 0.0))
    p = pinch(u)
    if p > 0.0:
        g = np.exp(-((Y - ym) / 46.0) ** 2)
        sd = np.maximum(sd, np.abs(U) - HW * (1.0 - 1.12 * p * g))
        b = T.smooth((p - 0.8) / 0.2)
        if b > 0.0:
            sd = sd * (1 - b) + two * b
    return sd + 1.5 * np.sin(X * 0.05 + 1.1 * u) * np.sin(Y * 0.043 - 0.9 * u)


def neck(u):
    """Half the width of the cell at the furrow."""
    return max(0.0, HW * (1.0 - 1.12 * pinch(u)))


# ---------------------------------------------------------------- around the cell
def surroundings(buf, X, Y, u):
    """The neighbours on both sides (and the cells above them), the cell above ours, the gaps between them all, the
    basement membrane and the dermis under it."""
    E = elong(u)
    buf[:] = GAP[1]
    buf[_BZ < 0.2] = GAP[0]
    xl = CX - HW - GAPW + 1.5 * np.sin(Y / 31.0 + 0.6 * u)
    xr = CX + HW + GAPW + 1.5 * np.sin(Y / 29.0 + 1.7 - 0.5 * u)
    for side, xx, top in ((-1, xl, Y0 - HH - 0.15 * E - 30.0), (1, xr, Y0 - HH - 0.15 * E + 22.0)):
        region = (X < xx) if side < 0 else (X > xx)
        basal = region & (Y > top) & (Y < Y0 + HH)
        above = region & (Y < top - GAPW)
        buf[basal] = NEIGH[2]
        buf[basal & (_BZ < 0.12)] = NEIGH[3]
        buf[basal & (_BZ > 0.9)] = NEIGH[1]
        buf[above] = ABOVE[2]
        buf[above & (_BZ < 0.12)] = ABOVE[3]
        # their insides: a darker rim along the membranes, speckles fixed in the tissue (they move with it)
        near = np.abs(X - xx) < 10.0
        buf[basal & near & (_BZ < 0.5)] = NEIGH[1]
        buf[above & near & (_BZ < 0.5)] = ABOVE[1]
        speck = (np.mod(np.floor(X / 3.0) * 7919.0 + np.floor((Y + 0.15 * E) / 3.0) * 104729.0, 61.0) < 1.0)
        buf[basal & speck] = NEIGH[0]
        buf[above & speck] = ABOVE[0]
        for m in (basal, above):
            buf[edge(m)] = OUTLINE
        nx, ny = CX + side * (2 * HW + GAPW), Y0 - 0.1 * E      # its nucleus, mostly out of sight
        rr = np.hypot((X - nx) / 72.0, (Y - ny) / 86.0)
        nm = basal & (rr <= 1.0)
        buf[nm] = NUC[2]
        buf[nm & (np.sin(X * 0.21 + np.sin(Y * 0.13) * 2.0) * np.sin(Y * 0.19 + 1.3) > 0.55)] = NUC[1]
        buf[edge(nm)] = NUC[0]
    # the cell born before ours, above it (pushed up as ours divides)
    ay = Y0 - E - HH - GAPW - 150.0
    am = rrect_sd(X - CX, Y - ay, HW - 2.0, 150.0, 70.0) <= 0
    buf[am] = ABOVE[2]
    buf[am & (_BZ < 0.12)] = ABOVE[3]
    buf[am & (_BZ > 0.9)] = ABOVE[1]
    an = am & (np.hypot((X - CX - 6.0) / 62.0, (Y - ay - 8.0) / 54.0) <= 1.0)
    buf[an] = NUC[2]
    buf[an & (np.sin(X * 0.23 + 1.0) * np.sin(Y * 0.2 + np.sin(X * 0.1)) > 0.5)] = NUC[1]
    buf[edge(an)] = NUC[0]
    buf[edge(am)] = OUTLINE
    # the basement membrane and the dermis
    ybm = Y_BM + 3.0 * np.sin(X / 37.0 + 0.4)
    derm = Y > ybm + 1.2
    buf[derm] = DERMIS[2]
    buf[derm & (_BZ < 0.14)] = DERMIS[3]
    buf[derm & (_BZ > 0.9)] = DERMIS[1]
    for k in range(5):
        cy_ = Y_BM + 22.0 + 17.0 * k
        wave = cy_ + 4.0 * np.sin(X / (21.0 + 3 * k) + k * 1.7 + 0.3 * u)
        fib = derm & (np.abs(Y - wave) < 2.4)
        buf[fib] = COLLAGEN[1]
        buf[fib & (np.abs(Y - wave) > 1.4)] = COLLAGEN[0]
    buf[(Y > ybm - 1.2) & (Y <= ybm + 1.2)] = OUTLINE
    buf[(Y > ybm + 1.2) & (Y <= ybm + 3.4)] = COLLAGEN[1]


# ---------------------------------------------------------------- our cell
def cell_body(buf, X, Y, u, sd):
    """The cytoplasm, its speckles and mitochondria, keratin running to the anchors, the anchors themselves."""
    E = elong(u)
    yt = Y0 - E
    inside = sd <= 0.0
    buf[inside] = CYTO[2]
    buf[inside & (_BZ < 0.08)] = CYTO[3]
    buf[inside & (_BZ > 0.92)] = CYTO[1]
    # a rounded volume: lit at the top left, darker toward the bottom right
    sd2 = cell_sd(X + 3.0, Y + 3.0, u)
    rim = inside & (sd > -9.0)
    buf[rim & (sd2 > sd) & (_BZ < 0.6)] = CYTO[1]
    buf[rim & (sd2 < sd) & (_BZ < 0.6)] = CYTO[3]
    rng = np.random.default_rng(7)
    for half, cy_ in ((0, Y0), (1, yt)):
        for i in range(170):                                 # free ribosomes
            fx, fy = CX + rng.uniform(-HW + 12, HW - 12), cy_ + rng.uniform(-HH + 12, HH - 12)
            buf[inside & (np.abs(X - fx) < 0.9) & (np.abs(Y - fy) < 0.9)] = RIBO[1] if i % 3 else CYTO[0]
    # keratin (its own kind in basal cells) from the anchors into the cell, faint
    for x0 in (-95.0, -48.0, 0.0, 48.0, 95.0):
        pts = [(CX + x0, Y0 + HH - 6.0), (CX + 0.75 * x0 + 6.0, Y0 + 90.0), (CX + 0.45 * x0, Y0 + 20.0)]
        buf[inside & polyline(X, Y, pts, 0.7)] = CYTO[1]
    # mitochondria: three go with each new cell
    for half, cy_ in ((0, Y0), (1, yt)):
        for j, (mx, my, ang) in enumerate((((-86.0, 108.0, 20.0), (82.0, 126.0, -25.0), (-4.0, 142.0, 6.0)),
                                           ((-80.0, -118.0, -15.0), (84.0, -104.0, 30.0), (6.0, -144.0, 0.0)))[half]):
            mitochondrion(buf, X, Y, CX + mx + 2.0 * math.sin(u * 0.8 + j), cy_ + my, 21.0, 9.5, ang, inside)
    # desmosomes holding it to the neighbours, where the side is straight
    p = pinch(u)
    ym = Y0 - E / 2
    for cy_, show in ((Y0, 1.0), (yt, T.smooth((E - 60.0) / 60.0))):
        if show <= 0.0:
            continue
        for d in (-58.0, -18.0, 22.0, 62.0):
            yy = cy_ + d
            if p > 0.15 and abs(yy - ym) < 70.0:
                continue
            for side in (-1, 1):
                xin = CX + side * (HW - 3.5)
                xout = CX + side * (HW + GAPW + 3.0)
                pl = (np.abs(X - xin) < 1.3) & (np.abs(Y - yy) < 5.5)
                buf[pl & (_BZ < show)] = OUTLINE
                buf[(np.abs(X - xout) < 1.3) & (np.abs(Y - yy) < 5.5) & (_BZ < show)] = OUTLINE
                for k in (-2.5, 0.0, 2.5):
                    br = (np.abs(Y - yy - k) < 0.6) & (side * (X - xin) > 1.0) & (side * (X - xout) < -1.0)
                    buf[br & (_BZ < show)] = KERATIN[1]
    # hemidesmosomes holding the bottom cell to the basement membrane (they glow once the cell has split)
    glow = T.smooth((u - 7.5) / 0.3) * (0.5 + 0.5 * math.sin(u * 12.0))
    for x0 in (-95.0, -63.0, -32.0, 0.0, 32.0, 63.0, 95.0):
        hx, hy = CX + x0, Y0 + HH - 4.5
        pl = (np.abs(X - hx) < 4.5) & (np.abs(Y - hy) < 1.6)
        buf[pl] = OUTLINE
        for k in (-2.5, 2.5):
            buf[(np.abs(X - hx - k) < 0.6) & (Y > hy + 1.6) & (Y < Y_BM - 1.0)] = KERATIN[1]
        if glow > 0.25:
            ring_ = edge((np.abs(X - hx) < 7.0) & (np.abs(Y - hy) < 4.0)) & _CK
            buf[ring_] = SPARK[0]


def mitochondrion(buf, X, Y, mx, my, a_, b_, ang, inside):
    a = math.radians(ang)
    uu = (X - mx) * math.cos(a) + (Y - my) * math.sin(a)
    vv = -(X - mx) * math.sin(a) + (Y - my) * math.cos(a)
    body = ((uu / a_) ** 2 + (vv / b_) ** 2 <= 1.0) & inside
    inner = ((uu / (a_ - 2.5)) ** 2 + (vv / (b_ - 2.5)) ** 2 <= 1.0) & inside
    buf[body] = MITO[1]
    buf[inner] = MITO[2]
    cr = inner & (np.abs(np.mod(uu + 2.0 * np.sin(vv * 0.5), 6.0) - 3.0) < 0.7) & (np.abs(vv) < b_ - 3.5)
    buf[cr] = MITO[1]
    buf[inner & (vv < -b_ * 0.4) & (uu < 0)] = MITO[3]
    buf[edge(body)] = MITO[0]


# ---------------------------------------------------------------- the nucleus, the chromosomes, the spindle
def condensed(i, u):
    return T.ease_out(T.u_of(u, (T_COND[i], T_COND[i] + 0.55)), 2.0)


def nucleus(buf, X, Y, u):
    """The resting nucleus: its chromatin packs away into the chromosomes, its envelope breaks into pieces that fade."""
    a = 1.0 - T.smooth((u - T_ENV) / 0.6)
    if a <= 0.0:
        return
    th = np.arctan2((Y - Y0) / NUC_R[1], (X - CX) / NUC_R[0])
    drift = 0.07 * T.ease_out(T.u_of(u, (T_ENV, T_ENV + 0.6)), 2.0)
    rr = np.hypot((X - CX) / NUC_R[0], (Y - Y0) / NUC_R[1]) * (1 + 0.02 * np.sin(3 * th + 0.5 * u))
    fade = _BZ < a
    inside = (rr <= 0.95) & fade
    buf[inside] = NUC_IN[0]
    buf[inside & (_BZ < 0.18 * a)] = NUC_IN[1]
    packed = sum(condensed(i, u) for i in range(4)) / 4.0
    chrom = (np.sin(X * 0.21 + np.sin(Y * 0.13) * 2.0) * np.sin(Y * 0.19 + 1.3) + 0.5 * np.sin((X + Y) * 0.31)) > 0.62
    buf[inside & chrom & (_BZ >= packed)] = NUC[3]
    nl_a = 1.0 - T.smooth(u / 1.2)
    if nl_a > 0:
        nrr = np.hypot((X - CX - 30.0) / 15.0, (Y - Y0 - 40.0) / 11.0) * (1 + 0.12 * np.sin(3 * np.arctan2(Y - Y0 - 40.0, X - CX - 30.0)))
        buf[(nrr <= 1.0) & fade & (_BZ < nl_a)] = NUC[2]
    # the envelope: whole, then in pieces drifting out
    r0 = 0.95 + drift
    env = (rr > r0) & (rr <= r0 + 0.08) & fade
    if u > T_ENV:
        gaps = T.smooth((u - T_ENV) / 0.35)
        env &= np.sin(11.0 * th + 0.7) > -1.0 + 2.0 * gaps * 0.7
    buf[env] = NUC[2]
    buf[env & ((rr <= r0 + 0.015) | (rr > r0 + 0.065))] = NUC[0]
    if u <= T_ENV:
        for a_deg in (-150, -105, -60, -15, 25, 70, 120, 160):
            ar = math.radians(a_deg)
            px, py = CX + NUC_R[0] * 0.985 * math.cos(ar), Y0 + NUC_R[1] * 0.985 * math.sin(ar)
            buf[env & ((X - px) ** 2 + (Y - py) ** 2 <= 3.0 ** 2)] = CYTO[2]


def centrosomes(u):
    """Where the two centrosomes (the spindle's poles) are: together above the nucleus, then one stays at the top and
    the other travels round the nucleus to the bottom."""
    pt, pb = poles(u)
    start = (CX + 30.0, Y0 - NUC_R[1] - 16.0)
    k_top = T.ease_in_out(T.u_of(u, (0.45, 1.6)), 2.0)
    top = (T.lerp(start[0], CX, k_top), T.lerp(start[1], pt, k_top))
    k = T.ease_in_out(T.u_of(u, (0.45, 1.6)), 2.0)
    th = math.radians(T.lerp(-70.0, 90.0, k))
    around = (CX + (NUC_R[0] + 22.0) * math.cos(th), Y0 + (NUC_R[1] + 22.0) * math.sin(th))
    settle = T.smooth(T.u_of(u, (1.4, 1.8)))
    bot = (T.lerp(around[0], CX, settle), T.lerp(around[1], pb, settle))
    if u < 0.45:
        top, bot = (start[0] - 3.0, start[1]), (start[0] + 3.0, start[1] + 2.0)
    return top, bot


def chromosome_state(i, u):
    """(x, y, angle) of the X before it splits, or None once it has; plus the two copies' centromeres after."""
    E = elong(u)
    plate = Y0 - E / 2
    x0, y0 = CX + CH_P0[i][0] + 3.0 * math.sin(u * 1.7 + i), Y0 + CH_P0[i][1] + 2.0 * math.cos(u * 1.3 + i)
    m = T.ease_in_out(T.u_of(u, (T_ATT[2 * i], T_ATT[2 * i] + 0.9)), 2.0)
    x = T.lerp(x0, CX + CH_X[i], m)
    y = T.lerp(y0, plate, m) + 1.5 * math.sin(9.0 * u + i) * T.smooth(T.u_of(u, (T_LINED - 0.3, T_LINED)))
    ang = T.lerp(CH_A0[i], 0.0, m)
    return x, y, ang


def copies(i, u):
    """After the split: the two copies' centromeres (top, bottom) and how far into the pull they are."""
    E = elong(u)
    x, y, _ = chromosome_state(i, T_SPLIT)
    m = T.ease_in_out(T.u_of(u, (T_SPLIT, T_SPLIT + 1.25)), 2.0)
    tx = CX + 0.55 * CH_X[i]
    top = (T.lerp(x, tx, m), T.lerp(y - 2.2, Y0 - E - 22.0, m))
    bot = (T.lerp(x, tx, m), T.lerp(y + 2.2, Y0 + 22.0, m))
    return top, bot, m


def chromatid(buf, X, Y, cx, cy, arms, col, alpha, r=3.4):
    """One copy: a short rod bent at its centromere, its two arms ending at the given offsets."""
    pts_l = [(cx + arms[0][0], cy + arms[0][1]), (cx + 0.45 * arms[0][0], cy + 0.45 * arms[0][1] + 0.8), (cx, cy)]
    pts_r = [(cx, cy), (cx + 0.45 * arms[1][0], cy + 0.45 * arms[1][1] + 0.8), (cx + arms[1][0], cy + arms[1][1])]
    m = polyline(X, Y, pts_l, r) | polyline(X, Y, pts_r, r)
    if alpha < 1.0:
        m &= _BZ < alpha
    buf[m] = col[1]
    hl = polyline(X, Y, [(x_ - 0.9, y_ - 0.9) for x_, y_ in pts_l], 0.8) | polyline(X, Y, [(x_ - 0.9, y_ - 0.9) for x_, y_ in pts_r], 0.8)
    buf[m & hl] = col[2]
    buf[edge(m)] = col[0]
    return m


def rot(v, ang):
    a = math.radians(ang)
    return v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a)


def chromosomes(buf, X, Y, u):
    """The four chromosomes: packing up as X shapes, moving to the middle, splitting, the copies pulled apart, then
    unpacking into the two new nuclei."""
    fade = 1.0 - T.smooth((u - 6.0) / 0.8)
    if fade <= 0.0:
        return
    for i in range(4):
        col = CHROMO[i]
        c = condensed(i, u)
        if c <= 0.0:
            continue
        if u < T_SPLIT:
            x, y, ang = chromosome_state(i, u)
            s = 0.45 + 0.55 * c
            for sgn in (-1, 1):                               # the two copies, joined in the middle: an X
                arms = [rot((-13.0 * s, sgn * 9.0 * s), ang), rot((13.0 * s, sgn * 9.0 * s), ang)]
                ox, oy = rot((0.0, sgn * 2.2 * s), ang)
                chromatid(buf, X, Y, x + ox, y + oy, arms, col, c * fade, 3.4 * (0.6 + 0.4 * c))
        else:
            top, bot, m = copies(i, u)
            b = T.smooth(m / 0.35)                            # the arms swing round to trail behind
            for (cx, cy), sgn in ((top, -1), (bot, 1)):
                ax, ay = T.lerp(13.0, 9.0, b), T.lerp(sgn * 9.0, -sgn * 13.0, b)
                chromatid(buf, X, Y, cx, cy, [(-ax, ay), (ax, ay)], col, fade)


def spindle(buf, X, Y, u):
    """The poles (centrosomes), their rays, and the fibres that catch the chromosomes and pull the copies apart."""
    a = 1.0 - T.smooth((u - 6.0) / 0.7)
    if a <= 0.0:
        return
    fade = _BZ < a
    (tx, ty), (bx, by) = centrosomes(u)
    lines = np.zeros(X.shape, bool)
    # rays around each pole
    ray = 30.0 * T.smooth(T.u_of(u, (0.8, 1.4)))
    if ray > 1.0:
        for (px, py), out in (((tx, ty), -90.0), ((bx, by), 90.0)):
            if u < 1.6:                                      # still on their way: rays point away from the nucleus
                out = math.degrees(math.atan2(py - Y0, px - CX))
            for d in (-75.0, -50.0, -25.0, 0.0, 25.0, 50.0, 75.0):
                ar = math.radians(out + d)
                lines |= seg(X, Y, px, py, px + ray * math.cos(ar), py + ray * math.sin(ar), 0.6)
    if u > T_ENV:
        pt, pb = ty, by
        # fibres from both poles that overlap in the middle (they push the poles apart)
        g = T.smooth(T.u_of(u, (T_ENV, T_ENV + 0.5)))
        mid = (pt + pb) / 2
        for d in (-30.0, -12.0, 12.0, 30.0):
            lines |= seg(X, Y, tx, ty, CX + d, T.lerp(ty, mid + 26.0, g), 0.55)
            lines |= seg(X, Y, bx, by, CX - d, T.lerp(by, mid - 26.0, g), 0.55)
        # the fibres that catch each chromosome, one from each pole
        for j in range(8):
            i, from_top = j // 2, j % 2 == 0
            gj = T.ease_out(T.u_of(u, (T_ATT[j] - 0.3, T_ATT[j])), 2.0)
            if gj <= 0.0:
                continue
            px, py = (tx, ty) if from_top else (bx, by)
            if u < T_SPLIT:
                x, y, ang = chromosome_state(i, u)
                ox, oy = rot((0.0, (-1 if from_top else 1) * 2.2), ang)
                qx, qy = x + ox, y + oy
            else:
                top, bot, m = copies(i, u)
                qx, qy = top if from_top else bot
            ex, ey = T.lerp(px, qx, gj), T.lerp(py, qy, gj)
            for off in (-2.6, 0.0, 2.6):
                lines |= seg(X, Y, px, py, ex + off, ey, 0.55)
    buf[lines & fade] = SPINDLE[1]
    for (px, py) in ((tx, ty), (bx, by)):
        halo = (X - px) ** 2 + (Y - py) ** 2 <= 8.5 ** 2
        buf[halo & fade & _CK] = SPINDLE[1]
        for (dx, dy, w_, h_) in ((-2.0, 0.0, 3.2, 1.2), (2.0, -1.0, 1.2, 3.2)):     # a pair of centrioles at right angles
            buf[(np.abs(X - px - dx) <= w_) & (np.abs(Y - py - dy) <= h_)] = OUTLINE


def new_nuclei(buf, X, Y, u):
    """Telophase: an envelope closes round each set of copies, which unpack into chromatin; each nucleus settles in the
    middle of its new cell."""
    f = T.smooth((u - 5.95) / 0.9)
    if f <= 0.0:
        return
    E = elong(u)
    settle = T.smooth((u - 6.6) / 1.0)
    for cy_ in (T.lerp(Y0 - E - 22.0, Y0 - E, settle), T.lerp(Y0 + 22.0, Y0, settle)):
        rx, ry = 30.0 + 40.0 * f, 34.0 + 46.0 * f
        th = np.arctan2((Y - cy_) / ry, (X - CX) / rx)
        rr = np.hypot((X - CX) / rx, (Y - cy_) / ry) * (1 + 0.02 * np.sin(3 * th + 0.5 * u))
        inside = rr <= 0.94
        buf[inside & (_BZ < f)] = NUC_IN[0]
        chrom = (np.sin(X * 0.21 + np.sin(Y * 0.13) * 2.0) * np.sin(Y * 0.19 + 1.3) + 0.5 * np.sin((X + Y) * 0.31)) > 0.62
        buf[inside & chrom & (_BZ < f)] = NUC[3]
        env = (rr > 0.94) & (rr <= 1.03) & (np.sin(11.0 * th) > 1.0 - 2.2 * f)
        buf[env] = NUC[2]
        buf[env & ((rr <= 0.955) | (rr > 1.015))] = NUC[0]


def contractile_ring(buf, X, Y, u):
    """The ring of actin and myosin that pinches the cell in two, seen edge on: a dense band where the furrow cuts in."""
    p = pinch(u)
    if not (0.02 < p < 0.9):
        return
    a = T.smooth(p / 0.15)
    ym = Y0 - elong(u) / 2
    w = neck(u)
    band = (np.abs(Y - ym) < 2.8) & (np.abs(X - CX) < w - 3.0)
    buf[band & _CK & (_BZ < 0.7 * a)] = RING[1]
    for side in (-1, 1):
        for k in range(4):
            dx_ = w - 4.5 - 1.5 * k
            dy_ = (k - 1.5) * 3.2
            buf[((X - CX - side * dx_) ** 2 + (Y - ym - dy_) ** 2 <= 2.3 ** 2) & (_BZ < a)] = RING[0] if k % 2 else RING[1]


# ---------------------------------------------------------------- captions (canvas pixels)
def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        k = i / max(n, 1)
        Wd.dot(buf, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, col)


def caption(buf, text, sub, ox, oy, age, life, side):
    if age < 0 or age > life:
        return
    if life - age < 0.12 and int(age * 30) % 2:
        return
    tw = pixfont.text_size(text, scale=2)[0]
    sw = pixfont.text_size(sub, scale=1)[0] if sub else 0
    bw = max(tw, sw)
    tx = ox + side[0] * 34 - (bw if side[0] < 0 else 0)
    ty = oy + side[1] * 46
    tx = min(max(tx, 8), 230 - bw)
    ty = min(max(ty, 44), 372)
    grow = T.ease_out(age / 0.16, 2.0)
    lx = tx + (bw if side[0] < 0 else 0)
    ly = ty + 18 if sub else ty + 16
    ex, ey = ox + (lx - ox) * grow, oy + (ly - oy) * grow
    _line(buf, ox + 1, oy + 1, ex + 1, ey + 1, OUTLINE)
    _line(buf, ox, oy, ex, ey, WHITE)
    Wd.dot(buf, ox, oy, OUTLINE, 5)
    Wd.dot(buf, ox, oy, WHITE, 3)
    if grow < 1.0:
        return
    n = int((age - 0.16) * 48) + 1
    shown = text[:max(0, n)]
    if shown:
        pixfont.draw_text(buf, shown, tx, ty, WHITE, anchor='lt', scale=2, outline=OUTLINE)
    if sub and n > len(text):
        pixfont.draw_text(buf, sub[:n - len(text)], tx, ty + 18, HERO, anchor='lt', scale=1, outline=OUTLINE)


CAPTIONS = (
    ('CHROMOSOMES', 'DNA COPIED AND PACKED', 0.2, 1.75, (1, -1)),
    ('SPINDLE', 'CATCHES EACH ONE', 1.85, 3.4, (1, -1)),
    ('LINED UP', None, 3.5, 4.6, (-1, -1)),
    ('PULLED APART', 'ONE COPY EACH WAY', 4.7, 6.45, (1, -1)),
    ('TWO NEW CELLS', 'ONE STAYS, ONE GOES UP', 6.55, 8.65, (1, -1)),
)


def anchors(u):
    E = elong(u)
    top, _ = centrosomes(u)
    x1, y1, _ = chromosome_state(1, u)
    x0, y0, _ = chromosome_state(0, u)
    up = copies(2, u)[0] if u >= T_SPLIT else chromosome_state(2, u)[:2]
    ym = Y0 - E / 2
    return {0: (x1, y1), 1: (top[0] + 4.0, top[1] + 10.0), 2: (x0, y0), 3: up,
            4: (CX + max(neck(u), 34.0) - 8.0, ym)}


# ---------------------------------------------------------------- the frame
def frame(u):
    """The inside of the dividing basal cell at u seconds into the look inside (0 .. 8.75)."""
    X, Y, c = grids(u)
    buf = np.empty((H, W, 3), np.uint8)
    surroundings(buf, X, Y, u)
    sd = cell_sd(X, Y, u)
    cell_body(buf, X, Y, u, sd)
    nucleus(buf, X, Y, u)
    new_nuclei(buf, X, Y, u)
    spindle(buf, X, Y, u)
    chromosomes(buf, X, Y, u)
    contractile_ring(buf, X, Y, u)
    memb = (sd > -2.2) & (sd <= 0.0)
    buf[memb] = CYTO[0]
    buf[(sd > -1.1) & (sd <= 0.0)] = HERO
    buf[(sd > 0.0) & (sd <= 1.2)] = OUTLINE
    an = anchors(u)
    for k, (text, sub, t0, t1, side) in enumerate(CAPTIONS):
        if t0 <= u < t1:
            ox, oy = to_canvas(an[k][0], an[k][1], c)
            caption(buf, text, sub, ox, oy, u - t0, t1 - t0, side)
    if u < 0.1:                                            # in through the membrane
        buf = gfx.whiten(buf, 0.45 * (1 - u / 0.1))
    return buf
