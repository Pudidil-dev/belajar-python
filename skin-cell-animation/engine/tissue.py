"""The slice of skin, seen from the side, in pixel art: water on top, the epidermis as columns of cells on a slow
conveyor, the wavy junction, and the dermis below with collagen fibres and one capillary loop.

A cell's look depends only on its height p (see timeline): a rosy basal cell with a big nucleus; a peach spinous
cell with little "spines" joining it to its neighbours and the first keratin fibres; a flatter beige granular cell
with dark granules, its nucleus shrinking, lipid droplets leaving it; and at the top a thin cream tile with no
nucleus, full of keratin, held to its neighbours by "rivets" (corneodesmosomes) that switch off one by one before it
is shed. Every edge is a hard pixel edge; shading is one ramp step lighter on the upper left, one darker on the lower
right.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from .palette import (OUTLINE, WHITE, WATER, DEAD, LIPID, GRAN, SPIN, BASAL, GAP, NUC, GRANULE, KERATIN, DERMIS,
                      COLLAGEN, BLOOD, HERO, SPARK, WARM, MELANIN, FIBRO)

W, H = gfx.W, gfx.H
_B4 = gfx._B4


def win(c, x0, x1, y0, y1, pad=1):
    """The canvas box over the world box [x0, x1] x [y0, y1] and the world coordinates of its pixel centres."""
    lx, ty = c.to(x0, y1)
    rx, by = c.to(x1, y0)
    i0, i1 = max(int(math.floor(min(lx, rx))) - pad, 0), min(int(math.ceil(max(lx, rx))) + pad, W)
    j0, j1 = max(int(math.floor(min(ty, by))) - pad, 0), min(int(math.ceil(max(ty, by))) + pad, H)
    if i0 >= i1 or j0 >= j1:
        return None
    return slice(j0, j1), slice(i0, i1), c.X[:, i0:i1], c.Y[j0:j1, :]


def bayer(sy, sx):
    ys = (np.arange(sy.start, sy.stop) % 4)[:, None]
    xs = (np.arange(sx.start, sx.stop) % 4)[None, :]
    return (_B4[ys, xs] + 0.5) / 16.0


def checker(sy, sx):
    return ((np.arange(sy.start, sy.stop)[:, None] + np.arange(sx.start, sx.stop)[None, :]) % 2) == 0


def edge(m):
    e = m.copy()
    e[1:] &= m[:-1]
    e[:-1] &= m[1:]
    e[:, 1:] &= m[:, :-1]
    e[:, :-1] &= m[:, 1:]
    return m & ~e


def ring(m):
    d = m.copy()
    d[1:] |= m[:-1]
    d[:-1] |= m[1:]
    d[:, 1:] |= m[:, :-1]
    d[:, :-1] |= m[:, 1:]
    return d & ~m


def rrect(u, v, hw, hh, r):
    r = min(r, hw, hh)
    qx = np.abs(u) - (hw - r)
    qy = np.abs(v) - (hh - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r <= 0


def sd_rrect(u, v, hw, hh, r):
    r = min(r, hw, hh)
    qx = np.abs(u) - (hw - r)
    qy = np.abs(v) - (hh - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def blob(u, v, hw, hh, r, t, seed, amp):
    """A rounded cell outline whose membrane gently wobbles (two travelling ripples, looping every 25 s)."""
    th = np.arctan2(v / max(hh, 1e-6), u / max(hw, 1e-6))
    p1, p2 = seed * 6.28, seed * 11.3
    rip = 0.6 * np.sin(2 * th + p1 + T.wob(19) * t) + 0.4 * np.sin(3 * th + p2 - T.wob(27) * t)
    return sd_rrect(u, v, hw, hh, r) <= amp * rip


def hsh(*a):
    """A stable pseudo-random number in [0, 1) from integers."""
    x = 0
    for v in a:
        x = (x * 1000003 + int(v) * 7919 + 12345) & 0xFFFFFFFF
    x ^= x >> 13
    x = (x * 0x5BD1E995) & 0xFFFFFFFF
    x ^= x >> 15
    return (x & 0xFFFF) / 65536.0


# ---------------------------------------------------------------- a cell's shape and colour at height p
def dims(p):
    """(half-width, half-height, corner radius) of a cell at height p."""
    if p < 1.0:
        k = T.clamp01((p - T.SPLIT) / (1.0 - T.SPLIT))
        return T.lerp(4.6, 5.8, k), T.lerp(5.6, 5.5, k), T.lerp(3.6, 2.6, k)
    if p < 4.5:
        k = (p - 1.0) / 3.5
        return T.lerp(5.8, 6.2, k), 5.5, 2.6
    if p < 6.5:
        k = (p - 4.5) / 2.0
        hh = 0.5 * T.slot_h(p) * T.lerp(0.9, 0.62, T.smooth(k))
        return T.lerp(6.2, 9.0, k), hh, T.lerp(2.6, 1.6, k)
    k = T.clamp01((p - 6.5) / 1.5)
    hh = 0.5 * T.slot_h(p) * T.lerp(0.62, 0.45, T.smooth(k))
    return T.lerp(9.0, 11.4, T.smooth(k)), hh, 1.0


def layer(p):
    """The colour ramp at height p, the next one, and how far into the change (for a dithered hand-over)."""
    stops = ((0.8, BASAL), (4.7, SPIN), (6.9, GRAN), (99.0, DEAD))
    prev = None
    for i, (top, rp) in enumerate(stops):
        if p < top:
            if i + 1 < len(stops) and p > top - 0.35:
                return rp, stops[i + 1][1], (p - (top - 0.35)) / 0.35
            return rp, None, 0.0
    return DEAD, None, 0.0


def nucleus_r(p):
    if p < 1.0:
        return 2.7
    if p < 5.4:
        return T.lerp(2.7, 2.4, (p - 1.0) / 4.4)
    if p < 6.8:
        return T.lerp(2.4, 0.0, (p - 5.4) / 1.4)
    return 0.0


def erode(m):
    e = m.copy()
    e[1:] &= m[:-1]
    e[:-1] &= m[1:]
    e[:, 1:] &= m[:, :-1]
    e[:, :-1] &= m[:, 1:]
    return e


def seg(U, V, ax, ay, bx, by, r):
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy + 1e-9
    t = np.clip(((U - ax) * dx + (V - ay) * dy) / L2, 0, 1)
    return np.hypot(U - ax - dx * t, V - ay - dy * t) <= r


def shade_fill(view, m, U, V, hw, hh, rp, sy, sx, dark_edge=True):
    """Pixel-art shading lit from the upper left: a dithered light zone, a dithered shade zone, and a bevel (a light
    inner rim on the lit side, a darker one on the shadow side)."""
    sh = (U / hw) * 0.6 - (V / hh) * 0.8                 # > 0: away from the light
    bz = bayer(sy, sx)
    view[m] = rp[2]
    view[m & (sh < -0.42 - 0.3 * bz)] = rp[3]
    view[m & (sh > 0.34 + 0.32 * bz)] = rp[1]
    m1 = erode(m)
    rim = m1 & ~erode(m1)
    view[rim & (sh < -0.15)] = rp[3]
    if dark_edge:
        view[rim & (sh > 0.25)] = rp[1]
    return sh


def nucleus(view, m, U, V, cx, cy, nr, cid, stage, px):
    """A nucleus with an irregular outline, clumped chromatin, a nucleolus and a highlight; stage > 0 shrinks and
    darkens it (pyknosis) and finally breaks it into fragments."""
    if nr <= 0.25:
        return
    ph1, ph2 = hsh(cid[0], cid[1], 21) * 6.28, hsh(cid[0], cid[1], 22) * 6.28
    du, dv = U - cx, V - cy
    a = np.arctan2(dv, du)
    if stage > 0.75:                                       # fragments
        for i in range(3):
            fx = cx + nr * 0.9 * math.cos(ph1 + i * 2.1)
            fy = cy + nr * 0.7 * math.sin(ph1 + i * 2.1)
            f = m & ((U - fx) ** 2 + (V - fy) ** 2 <= max(0.45, 0.42 * nr) ** 2)
            view[f] = NUC[0]
        return
    rr_ = nr * (1 + 0.05 * np.sin(3 * a + ph1) + 0.03 * np.sin(5 * a + ph2))
    nm = m & (np.hypot(du / 1.12, dv) <= rr_)
    if not nm.any():
        return
    if stage > 0:
        view[nm] = NUC[0] if stage > 0.35 else NUC[1]
        view[nm & ((du + 0.4 * nr) ** 2 + (dv - 0.4 * nr) ** 2 <= (0.3 * nr) ** 2)] = NUC[2]
        view[edge(nm)] = NUC[0]
        return
    view[nm] = NUC[2]
    chrom = (np.sin(du * 3.1 + ph1) * np.sin(dv * 3.5 + ph2) + 0.45 * np.sin((du - dv) * 4.2 + ph1)) > 0.55
    view[nm & chrom] = NUC[1]
    view[nm & ((du + 0.5 * nr) ** 2 + (dv - 0.5 * nr) ** 2 <= (0.2 * nr) ** 2)] = NUC[3]
    no = nm & ((du - 0.3 * nr) ** 2 + (dv + 0.32 * nr) ** 2 <= max(0.42, 0.2 * nr) ** 2)
    view[no] = NUC[1]
    view[edge(nm)] = NUC[0]


def organelles(view, m, U, V, hw, hh, rp, cid, avoid, n=8):
    """Mitochondria (little rods with a highlight) and vesicles, fixed in the cell's own frame."""
    ax, ay, ar = avoid
    for i in range(n):
        fu = (hsh(cid[0], cid[1], i, 31) - 0.5) * 1.5
        fv = (hsh(cid[0], cid[1], i, 32) - 0.5) * 1.5
        ou, ov = fu * hw, fv * hh
        if (ou - ax) ** 2 + (ov - ay) ** 2 < (ar + 0.9) ** 2:
            continue
        if i % 3 == 0:
            r_ = 0.42
            om = m & ((U - ou) ** 2 + (V - ov) ** 2 <= r_ ** 2)
            view[om] = rp[3]
        else:
            a = hsh(cid[0], cid[1], i, 33) * math.pi
            L = 0.8
            om = m & seg(U, V, ou - L * math.cos(a), ov - L * math.sin(a), ou + L * math.cos(a), ov + L * math.sin(a), 0.36)
            view[om] = rp[1]
            view[om & ((U - ou + 0.3 * math.cos(a)) ** 2 + (V - ov + 0.3 * math.sin(a)) ** 2 <= 0.25 ** 2)] = rp[3]


def desmosome_points(hw, hh):
    pts = [(-hw, -0.55 * hh, -1, 0), (-hw, 0.0, -1, 0), (-hw, 0.55 * hh, -1, 0),
           (hw, -0.55 * hh, 1, 0), (hw, 0.0, 1, 0), (hw, 0.55 * hh, 1, 0),
           (-0.45 * hw, hh, 0, 1), (0.45 * hw, hh, 0, 1), (-0.45 * hw, -hh, 0, -1), (0.45 * hw, -hh, 0, -1)]
    return pts


def draw_cell(buf, c, x, y, p, ang=0.0, hero=False, cid=(0, 0), fade=1.0, t=0.0):
    """One cell (or dead tile) centred at world (x, y), turned ang degrees, at height p, at film time t (for its
    wobble and the jelly bounce of each push). Returns its canvas box."""
    hw, hh, rr = dims(p)
    living = p < 6.9
    if living:                                           # no two cells quite alike
        hw *= 1 + 0.07 * (hsh(cid[0], cid[1], 11) - 0.5)
        hh *= 1 + 0.09 * (hsh(cid[0], cid[1], 12) - 0.5)
        ang += 7.0 * (hsh(cid[0], cid[1], 13) - 0.5) * (1 - float(T.smoothstep(4.5, 6.9, p)))
    j = T.jiggle(t, 0.022 * p) * (0.35 if not living else 1.0)
    hh *= 1 - 0.11 * j                                   # squash and stretch, roughly keeping its area
    hw *= 1 + 0.07 * j
    y += 0.5 * j * (0.3 if not living else 1.0)
    ext = math.hypot(hw, hh) + 2.5
    w_ = win(c, x - ext, x + ext, y - ext, y + ext)
    if w_ is None:
        return None
    sy, sx, X, Y = w_
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    U = (X - x) * ca + (Y - y) * sa
    V = -(X - x) * sa + (Y - y) * ca
    m = blob(U, V, hw, hh, rr, t, hsh(cid[0], cid[1], 14), 0.42 if living else 0.1)
    if fade < 1.0:
        m &= bayer(sy, sx) < fade
    if not m.any():
        return None
    view = buf[sy, sx]
    px = 1.0 / c.s
    rp, nxt, k = layer(p)
    if hero:
        kw = 0.35 if living else 0.55                   # among the cream tiles it needs a stronger tint
        rp = [tuple(int(round(a_ + (b_ - a_) * kw)) for a_, b_ in zip(col, WARM)) for col in rp]
    sh = shade_fill(view, m, U, V, hw, hh, rp, sy, sx)
    if nxt is not None:                                   # changing layer: the next colours dither in
        nr_ = nxt
        if hero:
            nr_ = [tuple(int(round(a_ + (b_ - a_) * 0.35)) for a_, b_ in zip(col, WARM)) for col in nxt]
        swap = m & (bayer(sy, sx) < k)
        tmp = view.copy()
        shade_fill(tmp, m, U, V, hw, hh, nr_, sy, sx)
        view[swap] = tmp[swap]
    if living:
        nr = nucleus_r(p)
        ncx, ncy = 0.15 * hw, 0.05 * hh
        organelles(view, m & ~erode(erode(~m | np.zeros_like(m))) if False else m, U, V, hw, hh, rp, cid,
                   (ncx, ncy, nr * 1.15), n=9 if p < 4.6 else 6)
        # keratin filaments: from around the nucleus out to the desmosomes, more and denser as the cell rises
        if p >= 1.0:
            dens = T.clamp01((p - 1.0) / 4.0)
            for j, (du, dv, nu, nv) in enumerate(desmosome_points(hw, hh)):
                if hsh(cid[0], cid[1], j, 41) > 0.35 + 0.6 * dens:
                    continue
                d0 = math.hypot(du - ncx, dv - ncy) + 1e-6
                sx0 = ncx + (du - ncx) / d0 * (nr * 1.2 + 0.4)
                sy0 = ncy + (dv - ncy) / d0 * (nr * 1.2 + 0.4)
                fil = m & seg(U, V, sx0, sy0, du * 0.92, dv * 0.92, 0.55 * px + 0.04)
                view[fil] = KERATIN[0] if p < 4.6 else KERATIN[1]
        # granules (keratohyalin): irregular dark lumps with a glint
        g = T.clamp01((p - 4.3) / 1.4) * T.clamp01((7.1 - p) / 0.9)
        if g > 0:
            for i in range(int(round(9 * g))):
                gx = (hsh(cid[0], cid[1], i, 1) - 0.5) * 1.6 * (hw - 1.2)
                gy = (hsh(cid[0], cid[1], i, 2) - 0.5) * 1.4 * (hh - 0.8)
                r1 = 0.55 + 0.45 * hsh(cid[0], cid[1], i, 5)
                gm = m & (((U - gx) ** 2 + (V - gy) ** 2 <= r1 ** 2) |
                          ((U - gx - 0.6 * r1) ** 2 + (V - gy + 0.35 * r1) ** 2 <= (0.7 * r1) ** 2))
                view[gm] = GRANULE
                view[gm & ((U - gx + 0.35 * r1) ** 2 + (V - gy - 0.35 * r1) ** 2 <= (0.3 * r1 + 0.5 * px) ** 2)] = NUC[2]
        # lamellar bodies: small pale lipid sacs gathering under the membrane
        if 5.6 <= p < 6.9:
            for i in range(4):
                lu = (hsh(cid[0], cid[1], i, 6) - 0.5) * 1.5 * hw
                lv = (hh - 0.9) * (1 if i % 2 else -1)
                view[m & (((U - lu) / 0.9) ** 2 + ((V - lv) / 0.5) ** 2 <= 1.0)] = LIPID[1]
        stage = 0.0 if p < 5.4 else (p - 5.4) / 1.4
        nucleus(view, m, U, V, ncx, ncy, nr, cid, stage, px)
    else:
        # a dead cell: a flat tile woven of keratin, lighter on top, darker beneath
        view[m & (V > 0.32 * hh)] = rp[3]
        view[m & (V < -0.45 * hh)] = rp[1]
        lat = ((((U * 1.4 + V * 3.6) % 2.4) < 0.42) | (((U * 1.4 - V * 3.6) % 2.4) < 0.42))
        view[m & lat & (V >= -0.45 * hh)] = KERATIN[1]
        fib = (np.abs(V - 0.1 * hh - 0.25 * np.sin(U * 0.8 + cid[0])) < 0.5 * px + 0.05) & (np.abs(U) < hw - 1.5)
        view[m & fib] = rp[1]
    view[edge(m)] = HERO if hero else (DEAD[0] if not living else OUTLINE)
    if living and 1.0 <= p < 5.4:                          # desmosomes: plaques at the membrane, bridges across the gap
        for du, dv, nu, nv in desmosome_points(hw, hh):
            br = seg(U, V, du, dv, du + nu * 0.95, dv + nv * 0.95, 0.5 * px + 0.02) & ~m
            view[br] = rp[1]
            pl = (np.abs(U - du) <= 0.55 * px + 0.15 + 0.25 * abs(nv)) & (np.abs(V - dv) <= 0.55 * px + 0.15 + 0.25 * abs(nu))
            view[pl & ~erode(m)] = OUTLINE
    if 6.0 <= p < 7.4:                                     # lipid released into the gaps
        for i in range(3):
            lx = (hsh(cid[0], cid[1], i, 3) - 0.5) * 1.6 * hw
            ly = (hh + 0.6) * (1 if i % 2 else -1)
            view[((U - lx) ** 2 + (V - ly) ** 2 <= 0.6 ** 2) & ~m] = LIPID[1]
    if not living:                                         # rivets (corneodesmosomes) switching off near the top
        for i, (ru, rv) in enumerate(((-0.62, 1), (-0.15, 1), (0.42, 1), (-0.4, -1), (0.1, -1), (0.66, -1))):
            thr = 10.9 + 1.0 * hsh(cid[0], cid[1], i, 4)
            if p < thr:
                rm = (np.abs(U - ru * hw) < 0.55 * px + 0.25) & (np.abs(V - rv * (hh + 0.15)) < 0.55 * px + 0.25)
                view[rm] = DEAD[0]
            elif p < thr + 0.12:
                rm = (np.abs(U - ru * hw) < 0.9) & (np.abs(V - rv * (hh + 0.3)) < 0.9)
                view[rm & checker(sy, sx)] = SPARK[1]
    return sy, sx


def rivet_world(x, y, p, i=1):
    """World position of a dead tile's rivet i (for a caption to point at)."""
    hw, hh, _ = dims(p)
    ru, rv = ((-0.62, 1), (-0.15, 1), (0.42, 1), (-0.4, -1), (0.1, -1), (0.66, -1))[i]
    return x + ru * hw, y + rv * (hh + 0.1)


# ---------------------------------------------------------------- the basal cells and their divisions
def mother_y(c):
    return float(T.junction(T.col_x(c))) + 7.0


def wave_fade(p):
    return 1.0 - float(T.smoothstep(0.0, 5.0, p))


def cell_xy(c, m, P):
    """World centre of the cell born m-th in column c, when the conveyor is at P; and its height p."""
    p = T.base(c) + P - m
    x = T.col_x(c) + 0.7 * math.sin(c * 2.3 + (m % T.N) * 1.7) * (1.0 - float(T.smoothstep(4.0, 7.0, p)))
    y = T.Y(p) + float(T.junction(T.col_x(c))) * wave_fade(p)
    return x, y, p


def draw_mother(buf, c, col, P, hero=False, t=0.0):
    """A column's basal cell, anchored to the basement membrane. While its newest daughter is between p = 0 and
    SPLIT the two are dividing: the chromosomes condense on a spindle, line up, split to the poles, two nuclei form
    and the cell pinches in two."""
    x = T.col_x(col)
    ym = mother_y(col)
    b = T.base(col) + P
    p_new = b - math.floor(b)
    k = p_new / T.SPLIT if p_new < T.SPLIT else None
    hw, hh = 4.6, 6.4
    w_ = win(c, x - 7, x + 7, ym - 8, ym + 22)
    if w_ is None:
        return
    sy, sx, X, Y = w_
    U = X - x
    V = Y - ym
    px = 1.0 / c.s
    view = buf[sy, sx]
    cid = (col, 99)
    rp = BASAL
    if hero:
        rp = [tuple(int(round(a_ + (b_ - a_) * 0.25)) for a_, b_ in zip(cc, WARM)) for cc in rp]
    j = T.jiggle(t, 0.0)
    hh *= 1 - 0.08 * j
    hw *= 1 + 0.05 * j
    sd_ = hsh(col, 15)
    if k is None:
        m = blob(U, V, hw, hh, 3.6, t, sd_, 0.4)
        top = 0.0
    else:
        top = 13.0 * T.smooth(k)
        lo = blob(U, V, hw, hh, 3.6, t, sd_, 0.4)
        hi = blob(U, V - top, hw, hh, 3.6, t, sd_ + 0.37, 0.4)
        waist = 1.0 - 0.8 * T.clamp01((k - 0.55) / 0.42)
        mid = rrect(U, V - top / 2, hw * waist, max(top / 2, 0.1), 1.0)
        m = lo | hi | (mid if k < 0.97 else np.zeros_like(lo))
    Vc = V - top / 2
    shade_fill(view, m, U, Vc, hw, hh + top / 2, rp, sy, sx)
    organelles(view, m, U, Vc, hw, hh + top / 2, rp, cid, (0.0, 0.0, 3.2 if k is None or k < 0.12 else 1.0), n=7)
    if k is None or k < 0.12:
        nucleus(view, m, U, V, 0.1, 0.2, 3.0, cid, 0.0, px)
    else:
        pole_lo, pole_hi = top / 2 - 4.2 - 2.0 * T.clamp01((k - 0.38) / 0.24), top / 2 + 4.2 + 2.0 * T.clamp01((k - 0.38) / 0.24)
        if k < 0.62:                                      # spindle, chromosomes, poles
            if k < 0.38:
                rows = [top / 2]
            else:
                sep = 3.2 * T.smooth((k - 0.38) / 0.24)
                rows = [top / 2 - sep, top / 2 + sep]
            for pv in (pole_lo, pole_hi):
                for i in range(5):
                    cu = (i - 2) * 1.2
                    tv = min(rows, key=lambda r_: abs(r_ - pv))
                    view[m & seg(U, V, 0.0, pv, cu, tv, 0.45 * px + 0.02)] = KERATIN[1]
                view[m & ((U) ** 2 + (V - pv) ** 2 <= 0.7 ** 2)] = SPARK[1]
            for rv in rows:
                for i in range(5):
                    cu = (i - 2) * 1.2
                    view[m & (np.abs(U - cu) <= 0.42) & (np.abs(V - rv) <= 0.95)] = NUC[0]
                    view[m & (np.abs(U - cu) <= 0.95) & (np.abs(V - rv) <= 0.42)] = NUC[0]
        else:                                             # two nuclei forming, the furrow pinching
            for off in (0.0, top):
                nucleus(view, m, U, V, 0.1, off + 0.2, 2.6 * T.clamp01((k - 0.55) / 0.3) + 0.4, (col, 98), 0.0, px)
    for i in (-0.55, 0.0, 0.55):                          # hemidesmosomes anchoring it to the membrane
        view[m & (np.abs(U - i * hw) <= 0.45) & (np.abs(V + hh - 0.45) <= 0.45)] = OUTLINE
    view[edge(m)] = HERO if hero else OUTLINE


def draw_melanocytes(buf, c):
    """Melanocytes sit among the basal cells and reach up between the cells above with long dendrites."""
    for mx in (-54.0, 30.0, 102.0, -126.0):
        if abs(mx - c.cx) > 120:
            continue
        my = float(T.junction(mx)) + 5.0
        w_ = win(c, mx - 22, mx + 22, my - 6, my + 52)
        if w_ is None:
            continue
        sy, sx, X, Y = w_
        U, V = X - mx, Y - my
        view = buf[sy, sx]
        px = 1.0 / c.s
        body = (U / 3.4) ** 2 + (V / 2.8) ** 2 <= 1.0
        den = np.zeros(body.shape, bool)
        for j, (ex, ey) in enumerate(((-12.0, 30.0), (6.0, 44.0), (16.0, 24.0), (-4.0, 18.0))):
            mx2, my2 = ex * 0.5 + 1.5 * math.sin(j), ey * 0.5
            den |= seg(U, V, 0.0, 1.0, mx2, my2, 0.55 * px + 0.1)
            den |= seg(U, V, mx2, my2, ex, ey, 0.55 * px + 0.05)
            for q in range(3):
                qu, qv = mx2 + (ex - mx2) * (0.3 + 0.3 * q), my2 + (ey - my2) * (0.3 + 0.3 * q)
                view[(U - qu) ** 2 + (V - qv) ** 2 <= 0.5 ** 2] = MELANIN[0]
        view[den] = MELANIN[1]
        view[body] = MELANIN[2]
        view[body & ((U + 0.8) ** 2 + (V - 0.6) ** 2 <= 1.2 ** 2)] = MELANIN[1]
        view[edge(body)] = MELANIN[0]


def pop_ring(buf, c, x, y, age):
    """A small ring of light dots where a cell has just split off (age in seconds)."""
    if not (0 <= age < 0.3):
        return
    r = 3.0 + 22.0 * age
    sx_, sy_ = c.to(x, y)
    n = 10
    for i in range(n):
        a = i * 2 * math.pi / n
        Wd.dot(buf, sx_ + r * c.s / 3.5 * math.cos(a), sy_ + r * c.s / 3.5 * math.sin(a), SPARK[1] if age < 0.15
               else SPARK[0], 2 if age < 0.12 else 1)


# ---------------------------------------------------------------- the dermis, the capillary
CAPILLARIES = (-40.0, 56.0)


def capillary_path(cx0, s_):
    """A capillary loop rising into a papilla: points along it, s_ in [0, 1] from one leg up and down the other."""
    top = float(T.junction(cx0)) - 6.0
    s_ = np.asarray(s_)
    leg = 0.42
    xl, xr = cx0 - 5.0, cx0 + 5.0
    x = np.where(s_ < leg, xl, np.where(s_ > 1 - leg, xr, cx0 + 5.0 * np.cos(math.pi * (1 - (s_ - leg) / (1 - 2 * leg)))))
    y = np.where(s_ < leg, T.lerp(-120.0, top - 5.0, s_ / leg),
                 np.where(s_ > 1 - leg, T.lerp(top - 5.0, -120.0, (s_ - (1 - leg)) / leg),
                          top - 5.0 + 5.0 * np.sin(math.pi * (s_ - leg) / (1 - 2 * leg))))
    return x, y


def draw_dermis(buf, c, t):
    w_ = win(c, c.cx - 200, c.cx + 200, -400, 12)
    if w_ is None:
        return
    sy, sx, X, Y = w_
    X, Y = np.broadcast_arrays(X, Y)
    J = T.junction(X)
    m = Y < J - 0.6
    if not m.any():
        return
    view = buf[sy, sx]
    view[m] = DERMIS[2]
    view[m & (Y < J - 26) & (bayer(sy, sx) < 0.5)] = DERMIS[1]
    view[m & (Y < J - 46)] = DERMIS[1]
    wav = np.sin(Y * 0.42 + 2.2 * np.sin(X * 0.07 + Y * 0.02))
    bundle = wav > 0.72
    view[m & bundle & (Y > J - 46)] = DERMIS[3]
    view[m & (wav > 0.9) & (Y > J - 46)] = COLLAGEN[0]
    view[m & (wav > 0.97) & (Y > J - 46)] = COLLAGEN[1]
    view[m & bundle & (Y <= J - 46)] = DERMIS[2]
    fine = np.abs(np.sin(Y * 1.3 + 3.1 * np.sin(X * 0.11 - Y * 0.05))) < 0.07
    view[m & fine & ~bundle & (Y > J - 46)] = DERMIS[1]
    for (fx, fy, fa) in ((-22.0, -14.0, 12.0), (18.0, -26.0, -8.0), (46.0, -12.0, 6.0), (-58.0, -30.0, -14.0),
                         (82.0, -24.0, 10.0), (-90.0, -12.0, 4.0)):
        a = math.radians(fa)
        uu = (X - fx) * math.cos(a) + (Y - fy - float(T.junction(fx)) * 0.3) * math.sin(a)
        vv = -(X - fx) * math.sin(a) + (Y - fy - float(T.junction(fx)) * 0.3) * math.cos(a)
        sp = m & ((uu / 7.5) ** 2 + (vv / 1.7) ** 2 <= 1.0)
        view[sp] = FIBRO[1]
        view[sp & ((uu / 2.2) ** 2 + (vv / 0.9) ** 2 <= 1.0)] = FIBRO[0]
        view[edge(sp)] = DERMIS[0]
    bm = (Y < J - 0.6) & (Y > J - 0.6 - 1.4 / c.s * 1.2)
    view[bm] = DERMIS[0]
    # a capillary loop in two papillae, red cells moving round it
    for cx0 in CAPILLARIES:
        if abs(cx0 - c.cx) > 160:
            continue
        ss = np.linspace(0, 1, 260)
        px_, py_ = capillary_path(cx0, ss)
        tube = np.zeros(X.shape, bool)
        for a, b in zip(range(0, 259, 3), range(3, 262, 3)):
            b = min(b, 259)
            ax, ay, bx, by = px_[a], py_[a], px_[b], py_[b]
            dx, dy = bx - ax, by - ay
            L2 = dx * dx + dy * dy + 1e-9
            tt = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
            tube |= np.hypot(X - ax - dx * tt, Y - ay - dy * tt) < 3.0
        tube &= m
        view[tube] = BLOOD[1]
        view[edge(tube)] = BLOOD[0]
        for i in range(9):
            s0 = (i / 9.0 + 2.0 * t / T.TOTAL) % 1.0
            rx, ry = capillary_path(cx0, s0)
            rbc = tube & ((X - rx) ** 2 + (Y - ry) ** 2 <= 2.1 ** 2)
            view[rbc] = BLOOD[2]


# ---------------------------------------------------------------- water and the epidermis background
def draw_water(buf, c, t):
    """Clear water flowing to the right, with streaks and a few bubbles (the whole canvas; tissue is drawn over)."""
    X, Y = np.broadcast_arrays(c.X, c.Y)
    buf[:] = WATER[2]
    deep = Y > T.SURFACE + 60
    buf[deep & (bayer(slice(0, H), slice(0, W)) < 0.35)] = WATER[1]
    for k in range(12):
        yy = T.SURFACE + 4 + 9.5 * k + 2.0 * math.sin(k * 1.7)
        ph = (X - (70.0 * (16 + 2 * (k % 4)) / T.TOTAL) * t + 37.0 * k) % 70.0      # whole periods per loop
        streak = (np.abs(Y - yy - 0.8 * np.sin(X * 0.05 + k)) < 0.42 / c.s * 2.2) & (ph < 30.0 - 1.5 * (k % 5))
        buf[streak] = WATER[3]
        buf[streak & (ph < 6.0)] = WATER[4]
    for k in range(16):
        bx = (hsh(k, 7) * 300.0 + (300.0 * (3 + k % 3) / T.TOTAL) * t) % 300.0 - 150.0 + c.cx
        by = T.SURFACE + 8 + hsh(k, 9) * 110.0 + 8.0 * math.sin(2 * math.pi * 8 * t / T.TOTAL + k)
        rb = 0.9 + 1.2 * hsh(k, 10)
        sx_, sy_ = c.to(bx, by)
        r_ = max(1.0, rb * c.s)
        if -5 < sx_ < W + 5 and -5 < sy_ < H + 5:
            i0, i1 = int(sx_ - r_ - 1), int(sx_ + r_ + 2)
            j0, j1 = int(sy_ - r_ - 1), int(sy_ + r_ + 2)
            i0c, i1c, j0c, j1c = max(i0, 0), min(i1, W), max(j0, 0), min(j1, H)
            if i1c > i0c and j1c > j0c:
                xs = np.arange(i0c, i1c)[None, :] + 0.5
                ys = np.arange(j0c, j1c)[:, None] + 0.5
                d = np.hypot(xs - sx_, ys - sy_)
                v = buf[j0c:j1c, i0c:i1c]
                v[(d <= r_) & (d > r_ - 1.2)] = WATER[4]
                v[(np.abs(xs - sx_ + r_ * 0.4) < 0.8) & (np.abs(ys - sy_ + r_ * 0.4) < 0.8)] = WHITE


def surface_y(c, P, gone=()):
    """Per canvas column: the world height of the top of the skin there (the tops of the highest attached tiles)."""
    xs = c.X[0]
    top = np.full(xs.shape, -1e9)
    c0 = int(math.floor((c.cx - 200) / T.COL_W))
    c1 = int(math.ceil((c.cx + 200) / T.COL_W))
    for col in range(c0, c1 + 1):
        b = T.base(col) + P
        m = math.ceil(b - T.N)                       # the oldest cell still attached: p = b - m <= N
        while (col, m) in gone:
            m += 1
        x, y, p = cell_xy(col, m, P)
        hw, hh, _ = dims(p)
        span = np.abs(xs - x) <= hw + 0.3
        top = np.where(span, np.maximum(top, y + hh + 0.4), top)
    return top


def draw_body(buf, c, P, surf):
    """The epidermis behind its cells: narrow pink gaps between living cells, pale lipid 'mortar' among the dead."""
    X, Y = np.broadcast_arrays(c.X, c.Y)
    J = T.junction(X)
    body = (Y >= J - 0.6) & (Y <= surf[None, :])
    buf[body] = GAP[1]
    upper = body & (Y > T.Y(6.7))
    buf[upper] = LIPID[1]
    buf[upper & (bayer(slice(0, H), slice(0, W)) < 0.25)] = LIPID[0]
    mid = body & (Y > T.Y(5.6)) & (Y <= T.Y(6.7))
    buf[mid & (bayer(slice(0, H), slice(0, W)) < 0.5)] = LIPID[0]
    # a foam line where the water meets the skin
    foam = (Y > surf[None, :]) & (Y <= surf[None, :] + 1.2 / c.s * 1.6)
    buf[foam] = WATER[4]
