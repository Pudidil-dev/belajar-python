"""Overhead and macro artwork: the bench, the test card (an RPG inventory item: square corners, a 1-px stepped border,
a tiny edge highlight), the four printed wells and labels, the blood, the reagents, the droppers.

Drawn per canvas pixel from card-space shapes, so every zoom gets its own crisp artwork. When the camera is close
(zoom >= 2.2) the clusters and the smooth blood are drawn as tiny red cells instead (the macro sprite set).
Flat colour clusters only: no gradients, no glow.
"""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T
from .view import put, poly_sel

W, H = gfx.W, gfx.H
MACRO = 2.2


class Pen:
    def __init__(self, buf, view):
        self.buf, self.view, self.z = buf, view, view.z

    def box(self, x0, y0, x1, y1, pad=2):
        return self.view.box(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1), pad)

    def grid(self, bx):
        U, V = self.view.grid(bx)
        return np.broadcast_arrays(U, V)

    def disc(self, cx, cy, r, pad=1):
        bx = self.box(cx - r, cy - r, cx + r, cy + r, pad)
        if bx is None:
            return None, None, None, None
        U, V = self.grid(bx)
        return bx, (U - cx) ** 2 + (V - cy) ** 2 <= r * r, U, V

    def rect(self, x0, y0, x1, y1):
        bx = self.box(x0, y0, x1, y1, 1)
        if bx is None:
            return None, None, None, None
        U, V = self.grid(bx)
        return bx, (U >= x0) & (U < x1) & (V >= y0) & (V < y1), U, V

    def poly(self, pts):
        us, vs = [p[0] for p in pts], [p[1] for p in pts]
        bx = self.box(min(us), min(vs), max(us), max(vs), 2)
        if bx is None:
            return None, None
        return bx, poly_sel(self.view, pts, bx)

    def outline(self, bx, m, col):
        e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
        put(self.buf, bx, e, col)

    def dot(self, x, y, col, size=1):
        i, j = self.view.px(x, y)
        i, j = int(math.floor(i)), int(math.floor(j))
        self.buf[max(j, 0):max(min(j + size, H), 0), max(i, 0):max(min(i + size, W), 0)] = col


# ------------------------------------------------------------------ bench and card
def bench(pen):
    buf = pen.buf
    buf[...] = P.NAVY[1]
    bx = (0, 0, W, H)
    U, V = pen.grid(bx)
    spec = ((np.floor(U / 6) * 7 + np.floor(V / 6) * 13) % 23 == 0) & ((np.floor(U) % 6 == 0) & (np.floor(V) % 6 == 0))
    put(buf, bx, spec, P.NAVY[2])


def card(pen, off):
    buf = pen.buf
    hw, hh = T.CARD_HW, T.CARD_HH
    x0, x1, y0, y1 = -hw + off, hw + off, -hh, hh
    bx, m, U, V = pen.rect(x0 + 3, y0 + 3, x1 + 3, y1 + 3)               # drop shadow (inventory item)
    if bx is not None:
        put(buf, bx, m, P.NAVY[0])
    bx, m, U, V = pen.rect(x0, y0, x1, y1)
    if bx is None:
        return
    put(buf, bx, m, P.IVORY[3])
    o = 1.0 / pen.z
    edge = m & ((U < x0 + o) | (U >= x1 - o) | (V < y0 + o) | (V >= y1 - o))
    corner = m & ((U < x0 + o) | (U >= x1 - o)) & ((V < y0 + o) | (V >= y1 - o))
    put(buf, bx, edge & ~corner, P.IVORY[0])                              # 1-px border, stepped corners
    inner = m & ~edge & ((U < x0 + 2 * o) | (V < y0 + 2 * o)) & (U < x1 - 2 * o) & (V < y1 - 2 * o)
    put(buf, bx, inner, P.IVORY[4])                                       # tiny highlight along the top / left
    put(buf, bx, m & ~edge & ((U >= x1 - 2 * o) | (V >= y1 - 2 * o)), P.IVORY[2])
    # a printed red band at the top with a tiny blood-drop mark (no text)
    put(buf, bx, m & (V >= y0 + 7) & (V < y0 + 12) & (U >= x0 + 18) & (U < x1 - 8), P.RED[3])
    put(buf, bx, m & (V >= y0 + 12) & (V < y0 + 13) & (U >= x0 + 18) & (U < x1 - 8), P.RED[2])
    db, dm, DU, DV = pen.disc(x0 + 11, y0 + 11, 3.2)
    if db is not None:
        put(buf, db, dm, P.RED[3])
        tb, tm = pen.poly([(x0 + 11, y0 + 4.5), (x0 + 13.6, y0 + 9.5), (x0 + 8.4, y0 + 9.5)])
        if tb is not None:
            put(buf, tb, tm, P.RED[3])
    for sp in T.ORDER:
        sx, sy = T.SPOTS[sp]
        well(pen, sx + off, sy)
        label(pen, T.LABEL[sp], sx + off, sy + T.SPOT_R + 9)


def well(pen, cx, cy):
    bx, m, U, V = pen.disc(cx, cy, T.SPOT_R)
    if bx is None:
        return
    r = np.sqrt((U - cx) ** 2 + (V - cy) ** 2)
    o = 1.0 / pen.z
    put(pen.buf, bx, m, P.IVORY[2])
    put(pen.buf, bx, m & (r < T.SPOT_R - 3) & ((U - cx) + (V - cy) > -T.SPOT_R * 0.45), P.IVORY[3])
    put(pen.buf, bx, m & (r >= T.SPOT_R - o), P.IVORY[1])


def label(pen, text, cx, y):
    if pen.z < 0.6 or pen.z > 1.6:
        return
    w, h = pixfont.text_size(text)
    i, j = pen.view.px(cx, y)
    mk = pixfont.text_mask(text, int(round(i - w / 2)), int(round(j)))
    gfx.fill(pen.buf, mk, P.IVORY[0])


# ------------------------------------------------------------------ the clusters in Anti-A
def _clusters():
    rng = np.random.default_rng(31)
    out = [(5.0, 3.0)]
    while len(out) < 30:
        a = rng.uniform(0, 2 * math.pi)
        r = math.sqrt(rng.uniform(0, 1)) * 31
        x, y = r * math.cos(a), r * math.sin(a)
        if all((x - px) ** 2 + (y - py) ** 2 > 8.5 ** 2 for px, py in out):
            out.append((x, y))
    clusters = []
    for k, (x, y) in enumerate(out):
        n = int(rng.integers(3, 7))
        blobs = []
        bxp, byp = x, y
        for _ in range(n):
            rr = rng.uniform(1.3, 2.9)
            blobs.append((bxp, byp, rr))
            ang = rng.uniform(0, 2 * math.pi)
            bxp, byp = bxp + math.cos(ang) * rr * 0.9, byp + math.sin(ang) * rr * 0.9
        clusters.append(blobs)
    return clusters


CLUSTERS = _clusters()
_STAGE_SCALE = (0.0, 0.35, 0.6, 0.85, 1.0)


def _even_cells(cx, cy, r, seed):
    """Evenly dispersed tiny cells (the smooth surface seen close up)."""
    rng = np.random.default_rng(seed)
    pts = []
    step = 2.3
    for gy in np.arange(-r, r + step, step):
        for gx in np.arange(-r, r + step, step * 1.1):
            x = gx + rng.uniform(-0.7, 0.7) + (step * 0.5 if int(gy / step) % 2 else 0)
            y = gy + rng.uniform(-0.7, 0.7)
            if x * x + y * y < (r - 1.2) ** 2:
                pts.append((cx + x, cy + y))
    return pts


_EVEN = {sp: _even_cells(0, 0, T.FILL_R, 50 + i) for i, sp in enumerate(T.ORDER)}


def _mini_cell(pen, x, y, r):
    bx, m, U, V = pen.disc(x, y, r, 0)
    if bx is None:
        return
    put(pen.buf, bx, m, P.RED[3])
    if r * pen.z >= 3.0:
        put(pen.buf, bx, m & ((U - x) ** 2 + (V - y) ** 2 <= (r * 0.42) ** 2), P.RED[5])
    pen.outline(bx, m, P.RED[1])


def blood(pen, t, off):
    for sp in T.ORDER:
        fr = T.fill_radius(sp, t)
        if fr <= 0:
            continue
        sx, sy = T.SPOTS[sp]
        cx, cy = sx + off, sy
        stage = T.clump_stage(t) if sp == 'A' else 0
        bx, m, U, V = pen.disc(cx, cy, fr)
        if bx is None:
            continue
        macro = pen.z >= MACRO
        base = P.RED[4] if (stage >= 2 or (macro and sp == 'A' and stage > 0)) else P.RED[3]
        put(pen.buf, bx, m, base)
        if not macro:
            r = np.sqrt((U - cx) ** 2 + (V - cy) ** 2)
            hl = m & (r > fr - 5) & ((U - cx) + (V - cy) < -fr * 0.55) & (stage == 0)
            put(pen.buf, bx, hl, P.RED[4])
            sh = m & (r > fr - 3) & ((U - cx) + (V - cy) > fr * 0.6)
            put(pen.buf, bx, sh, P.RED[2])
            if fr > 20 and stage == 0:
                put(pen.buf, bx, m & ((U - (cx - fr * 0.45)) ** 2 + (V - (cy - fr * 0.5)) ** 2 < 2.2 ** 2), P.RED[5])
        else:
            if sp != 'A' or stage == 0:
                for (x, y) in _EVEN[sp]:
                    _mini_cell(pen, cx + x, cy + y, 0.85)
        if stage > 0:
            k = _STAGE_SCALE[stage]
            for blobs in CLUSTERS:
                for (x, y, rr) in blobs:
                    r_ = rr * k
                    if r_ < 0.5:
                        continue
                    if macro:
                        n = max(1, int(r_ * r_ / 0.9))
                        for j in range(n):
                            a = j * 2.399
                            d = math.sqrt(j / n) * r_ * 0.95
                            _mini_cell(pen, cx + x + d * math.cos(a), cy + y + d * math.sin(a), 0.8)
                    else:
                        cb, cm, CU, CV = pen.disc(cx + x, cy + y, r_)
                        if cb is None:
                            continue
                        put(pen.buf, cb, cm, P.RED[2])
                        put(pen.buf, cb, cm & ((CU - cx - x) + (CV - cy - y) > r_ * 0.5), P.RED[1])
                        put(pen.buf, cb, cm & ((CU - cx - x) ** 2 + (CV - cy - y + r_ * 0.4) ** 2 < (r_ * 0.35) ** 2),
                            P.RED[4])
        # the brief mixing swirl after the reagents
        s = T.swirl(t)
        if s > 0.05:
            ph = (t - T.SWIRL[0]) * 2 * math.pi * 1.6
            for arm in range(2):
                for j in range(int(18 * s)):
                    r_ = 6 + j * 1.6
                    a = ph + arm * math.pi + r_ * 0.11
                    pen.dot(cx + r_ * math.cos(a), cy + r_ * math.sin(a), P.RED[5] if j % 3 == 0 else P.RED[4])
        # the landing ripple (stays inside the circle)
        rp = T.ripple(sp, t)
        if rp is not None:
            rr, age = rp
            rb, rm, RU, RV = pen.disc(cx, cy, min(rr, fr - 1))
            if rb is not None:
                ring = rm & ((RU - cx) ** 2 + (RV - cy) ** 2 > (min(rr, fr - 1) - 1.1 / pen.z) ** 2)
                put(pen.buf, rb, ring, P.RED[5] if age < 0.5 else P.RED[4])
        # a one-frame edge glint when the reagent drop touches
        if T.glint(sp, t):
            r = np.sqrt((U - cx) ** 2 + (V - cy) ** 2)
            ang = np.arctan2(V - cy, U - cx)
            g = m & (r > fr - 1.4) & (ang > -2.9) & (ang < -1.0)
            put(pen.buf, bx, g, P.WHITE)


# ------------------------------------------------------------------ droppers and drops
def _rot(pts, ang, x, y):
    ca, sa = math.cos(ang), math.sin(ang)
    return [(x + px * ca - py * sa, y + px * sa + py * ca) for (px, py) in pts]


def dropper(pen, x, y, deg, bulb, liquid):
    """A glass dropper with its tip at (x, y), tilted by deg (0 = straight down)."""
    a = math.radians(deg)
    tube = [(-1.2, 0), (1.2, 0), (2.6, -12), (2.6, -40), (-2.6, -40), (-2.6, -12)]
    inside = [(-0.6, -1.5), (0.6, -1.5), (1.5, -12), (1.5, -24), (-1.5, -24), (-1.5, -12)]
    collar = [(-4.2, -40), (4.2, -40), (4.2, -44), (-4.2, -44)]
    bulb_pts = [(-5.2, -44), (5.2, -44), (6.4, -50), (6.4, -60), (4.5, -64), (-4.5, -64), (-6.4, -60), (-6.4, -50)]
    for pts, fill, line in ((tube, P.GLASS[2], P.GLASS[0]), (inside, liquid, None), (collar, P.GLASS[1], P.GLASS[0]),
                            (bulb_pts, bulb[1], bulb[0])):
        if fill is None:
            continue
        bx, m = pen.poly(_rot(pts, a, x, y))
        if bx is None:
            continue
        put(pen.buf, bx, m, fill)
        if line is not None:
            pen.outline(bx, m, line)
    hl = _rot([(-1.6, -14), (-1.6, -36)], a, x, y)
    n = 12
    for k in range(n + 1):
        f = k / n
        pen.dot(hl[0][0] + (hl[1][0] - hl[0][0]) * f, hl[0][1] + (hl[1][1] - hl[0][1]) * f, P.WHITE)
    hb = _rot([(-3.6, -58)], a, x, y)[0]
    pen.dot(hb[0], hb[1], bulb[2], 2)


def drop(pen, x, y, fill, line, hi):
    bx, m, U, V = pen.disc(x, y + 1.0, 3.2)
    if bx is None:
        return
    tb, tm = pen.poly([(x, y - 5.2), (x + 2.6, y - 0.2), (x - 2.6, y - 0.2)])
    put(pen.buf, bx, m, fill)
    if tb is not None:
        put(pen.buf, tb, tm, fill)
    pen.outline(bx, m, line)
    pen.dot(x - 1.2, y - 0.4, hi)


def props(pen, t, off):
    sd = T.sample_dropper(t)
    if sd is not None:
        x, y, a = sd
        dropper(pen, x + off, y, a, (P.RUBBER[0], P.RUBBER[2], P.RUBBER[3]), P.RED[3])
    for (x, y, _) in T.blood_drops(t):
        drop(pen, x + off, y, P.RED[3], P.RED[1], P.RED[5])
    for sp, x, y, a in T.reagent_droppers(t):
        dropper(pen, x + off, y, a, (P.IVORY[1], P.IVORY[3], P.IVORY[4]), P.GLASS[3])
    for (x, y) in T.reagent_drops(t):
        drop(pen, x + off, y, P.GLASS[3], P.GLASS[0], P.WHITE)


def outline_a(pen, t):
    """A blocky gold outline around Anti-A, drawn in four quick pixel steps."""
    steps = sum(1 for s in T.OUTLINE if t >= s)
    if steps == 0:
        return
    sx, sy = T.SPOTS['A']
    r = T.SPOT_R + 4
    x0, y0, x1, y1 = sx - r, sy - r, sx + r, sy + r
    th = 2.0
    sides = [(x0 + 2, y0, x1 - 2, y0 + th), (x1 - th, y0 + 2, x1, y1 - 2), (x0 + 2, y1 - th, x1 - 2, y1),
             (x0, y0 + 2, x0 + th, y1 - 2)]
    for k in range(steps):
        a0, b0, a1, b1 = sides[k]
        bx, m, U, V = pen.rect(a0 - 1, b0 - 1, a1 + 1, b1 + 1)
        if bx is not None:
            put(pen.buf, bx, m, P.NAVY[0])
        bx, m, U, V = pen.rect(a0, b0, a1, b1)
        if bx is not None:
            put(pen.buf, bx, m, P.GOLD[1])
            put(pen.buf, bx, m & ((U < a0 + 1) | (V < b0 + 1)), P.GOLD[2])
    if steps == 4:                                         # stepped corners
        for cx, cy in ((x0 + 1, y0 + 1), (x1 - 2, y0 + 1), (x0 + 1, y1 - 2), (x1 - 2, y1 - 2)):
            pen.dot(cx, cy, P.GOLD[1], 2)
