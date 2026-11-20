"""Inside the cell we follow, while the story stands still (7.5 s): how a skin cell does its job, in four steps.

The camera has zoomed through the membrane; the cell fills the frame, its neighbours just beyond the membrane on
both sides, held to ours by desmosomes. Then:

1. DNA, THE RECIPE: in the nucleus a gene (the keratin recipe) glows and its double helix unzips.
2. RNA COPY, CARRIES IT OUT: a gold RNA copy grows along it, peels off, slides out through a nuclear pore and lies
   down in the cytoplasm.
3. RIBOSOME, BUILDS KERATIN: ribosomes run along the RNA, each spinning out a chain of protein beads.
4. KERATIN FIBERS, GRIP THE NEIGHBORS: the protein joins into fibres that grow across the cell to the desmosomes,
   so the cell holds on to its neighbours.
5. MITOCHONDRIA, POWER IT ALL: the mitochondria glow and send energy (ATP) sparks to the ribosomes.

Drawn in the film's pixel style on the 270x480 canvas, in design pixels that zoom a little at both ends so the cuts
in and out of the cell feel like one continuous move.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import pixfont
from .palette import (OUTLINE, WHITE, SPIN, GAP, NUC, NUC_IN, RNA, RIBO, PROT, MITO, ER, KERATIN, SPARK, HERO, WARM,
                      LIPID)

W, H = gfx.W, gfx.H
DUR = T.INSIDE[1] - T.INSIDE[0]
_B4 = gfx._B4
_BZ = ((_B4[np.arange(H)[:, None] % 4, np.arange(W)[None, :] % 4] + 0.5) / 16.0).astype(np.float32)
_CK = ((np.arange(H)[:, None] + np.arange(W)[None, :]) % 2) == 0


def warm(col, k=0.3):
    return tuple(int(round(a + (b - a) * k)) for a, b in zip(col, WARM))


CYTO = [warm(c_) for c_ in SPIN]
NEIGH = [warm(c_, 0.05) for c_ in SPIN]

NUC_C = (126.0, 150.0)
NUC_R = (92.0, 78.0)
GENE = (92.0, 172.0)          # the gene's span on the helix (x)
HELIX_Y = 168.0
PORT = 70.0                   # the export pore's angle (degrees, measured on the nucleus ellipse, y down)
POLY_Y = 322.0                # where the RNA lies down in the cytoplasm
DESMO_Y = (64.0, 134.0, 204.0, 274.0, 344.0, 414.0)
MITOS = ((64.0, 410.0, 36.0, 18.0, 18.0), (212.0, 414.0, 34.0, 17.0, -22.0), (140.0, 462.0, 27.0, 13.0, 8.0),
         (226.0, 262.0, 24.0, 12.0, 72.0))


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


# the camera's tour of the cell: (u, centre x, centre y, zoom) in design pixels. It keeps pushing in after the cut in
# (onto the gene), follows the RNA out, closes in on the ribosomes, pulls back wide so both walls show when the
# fibres reach them, drifts down to the mitochondria and eases back out toward the cut out.
CAM_KEYS = ((0.0, 135.0, 240.0, 1.10), (0.7, 133.0, 214.0, 1.24), (1.5, 132.0, 206.0, 1.30),
            (2.4, 138.0, 258.0, 1.24), (3.2, 136.0, 300.0, 1.36), (4.4, 134.0, 304.0, 1.40),
            (5.25, 135.0, 246.0, 1.02), (5.9, 135.0, 248.0, 1.00), (6.8, 136.0, 278.0, 1.12),
            (7.5, 135.0, 248.0, 1.06))


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
    return float(v[0]), float(v[1]), float(v[2])


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


# ---------------------------------------------------------------- the pieces
def membranes(buf, X, Y, u):
    """Our membrane on both sides, the narrow gap, the neighbours beyond, and the desmosomes that join them."""
    xl = 14.0 + 3.0 * np.sin(Y / 38.0 + 0.7 * u)
    xr = 256.0 + 3.0 * np.sin(Y / 41.0 + 1.3 + 0.6 * u)
    left_n, right_n = X < xl - 4.0, X > xr + 4.0
    gap = ((X >= xl - 4.0) & (X < xl)) | ((X > xr) & (X <= xr + 4.0))
    buf[left_n | right_n] = NEIGH[1]
    buf[(left_n | right_n) & (_BZ < 0.12)] = NEIGH[2]
    buf[gap] = GAP[1]
    for xx in (xl, xr):
        buf[np.abs(X - xx) < 0.7] = OUTLINE
    buf[np.abs(X - (xl - 4.0)) < 0.6] = OUTLINE
    buf[np.abs(X - (xr + 4.0)) < 0.6] = OUTLINE
    buf[(X > xl + 0.7) & (X < xl + 2.0)] = CYTO[3]
    buf[(X < xr - 0.7) & (X > xr - 2.0)] = CYTO[1]
    for y0 in DESMO_Y:
        for side, xx in ((-1, xl), (1, xr)):
            near = np.abs(Y - y0) < 6.0
            plaque = near & ((np.abs(X - xx + side * 1.6) < 1.1) | (np.abs(X - xx - side * 5.6) < 1.1))
            buf[plaque] = OUTLINE
            for k in (-3.0, 0.0, 3.0):
                br = (np.abs(Y - y0 - k) < 0.6) & (side * (X - xx) > 0.5) & (side * (X - xx) < 3.5)
                buf[br] = KERATIN[1]
    return xl, xr


def cytoplasm(buf, X, Y, u):
    buf[:] = CYTO[2]
    buf[_BZ < 0.07] = CYTO[3]
    buf[(_BZ > 0.93)] = CYTO[1]
    # a little darker toward the membranes, so the cell reads as a rounded volume
    xl = 14.0 + 3.0 * np.sin(Y / 38.0 + 0.7 * u)
    xr = 256.0 + 3.0 * np.sin(Y / 41.0 + 1.3 + 0.6 * u)
    shade = np.clip(1.0 - np.minimum(X - xl, xr - X) / 34.0, 0.0, 1.0)
    buf[_BZ < 0.55 * shade] = CYTO[1]
    rng = np.random.default_rng(5)
    for i in range(16):                                   # vesicles drifting
        vx = rng.uniform(34, 236) + 6.0 * math.sin(u * 0.9 + i)
        vy = rng.uniform(250, 490) + 5.0 * math.cos(u * 0.7 + i * 1.3)
        r = rng.uniform(3.3, 5.2)
        m = (X - vx) ** 2 + (Y - vy) ** 2 <= r * r
        buf[m] = CYTO[3]
        buf[edge(m)] = CYTO[0]
        buf[(X - vx + r * 0.4) ** 2 + (Y - vy + r * 0.4) ** 2 <= 1.1] = KERATIN[1]
    # free ribosomes speckling the cytoplasm
    for i in range(300):
        fx, fy = rng.uniform(20, 250), rng.uniform(-20, 510)
        if ((fx - NUC_C[0]) / (NUC_R[0] + 6)) ** 2 + ((fy - NUC_C[1]) / (NUC_R[1] + 6)) ** 2 < 1.0:
            continue
        buf[(np.abs(X - fx) < 0.9) & (np.abs(Y - fy) < 0.9)] = RIBO[1] if i % 3 else CYTO[0]
    # the cell's existing keratin network (tonofilaments), from the nucleus out to the desmosomes
    for i, y0 in enumerate(DESMO_Y):
        for side, xx in ((-1, 18.0), (1, 252.0)):
            sx_ = NUC_C[0] + side * (NUC_R[0] - 8) * 0.9
            sy_ = NUC_C[1] + (y0 - NUC_C[1]) * 0.35
            pts = [(T.lerp(sx_, xx, q), T.lerp(sy_, y0, q) + 4.0 * math.sin(q * 5.0 + i)) for q in np.linspace(0, 1, 9)]
            buf[polyline(X, Y, pts, 0.8)] = CYTO[1]


def er(buf, X, Y):
    """Rough ER: stacked membrane sheets beside the nucleus, dotted with ribosomes."""
    cx, cy = NUC_C
    rx, ry = NUC_R
    for d in (14.0, 25.0, 36.0):
        for a0, a1 in ((150.0, 215.0), (-35.0, 30.0)):
            th = np.degrees(np.arctan2((Y - cy) / (ry + d), (X - cx) / (rx + d)))
            rr = np.hypot((X - cx) / (rx + d), (Y - cy) / (ry + d))
            band = (np.abs(rr - 1.0) * (rx + d) < 2.6) & (th > a0) & (th < a1)
            buf[band] = ER[1]
            buf[band & (np.abs(rr - 1.0) * (rx + d) > 1.6)] = ER[0]
            for k in range(9):
                a = math.radians(a0 + (a1 - a0) * (k + 0.5) / 9)
                px = cx + (rx + d + 3.2) * math.cos(a)
                py = cy + (ry + d + 3.2) * math.sin(a)
                buf[(np.abs(X - px) < 1.2) & (np.abs(Y - py) < 1.2)] = RIBO[1]


def golgi(buf, X, Y, u):
    """The Golgi: a stack of curved sacs with vesicles budding off."""
    gx, gy = 36.0, 300.0
    d = np.hypot(X - gx, Y - gy)
    a = np.degrees(np.arctan2(Y - gy, X - gx))
    for k in range(4):
        r0 = 30.0 + 6.5 * k
        sac = (np.abs(d - r0) < 2.2) & (np.abs(a) < 38.0 - 4.0 * k)
        buf[sac] = ER[0]
        buf[sac & (d < r0 - 0.6)] = ER[1]
    for k in range(5):
        aa = math.radians(-46 + 23 * k)
        vx, vy = gx + (56.0 + 3.0 * math.sin(u * 2 + k)) * math.cos(aa), gy + (56.0 + 3.0 * math.sin(u * 2 + k)) * math.sin(aa)
        vm = (X - vx) ** 2 + (Y - vy) ** 2 <= 2.6 ** 2
        buf[vm] = ER[1]
        buf[edge(vm)] = ER[0]


def nucleus(buf, X, Y, u):
    cx, cy = NUC_C
    rx, ry = NUC_R
    th = np.arctan2((Y - cy) / ry, (X - cx) / rx)
    rr = np.hypot((X - cx) / rx, (Y - cy) / ry) * (1 + 0.025 * np.sin(3 * th + 0.4 * u) + 0.015 * np.sin(5 * th))
    inside = rr <= 0.94
    buf[inside] = NUC_IN[0]
    buf[inside & (_BZ < 0.18)] = NUC_IN[1]
    chrom = (np.sin(X * 0.21 + np.sin(Y * 0.13) * 2.0) * np.sin(Y * 0.19 + 1.3) +
             0.5 * np.sin((X + Y) * 0.31)) > 0.62
    buf[inside & chrom] = NUC[3]
    nth = np.arctan2(Y - 201.0, X - 86.0)
    nrr = np.hypot((X - 86.0) / 15.0, (Y - 201.0) / 10.5) * (1 + 0.13 * np.sin(3 * nth + 1.0) + 0.07 * np.sin(5 * nth))
    nl = nrr <= 1.0
    buf[nl] = NUC[2]
    buf[nl & (nrr > 0.45) & _CK] = NUC[1]
    buf[edge(nl)] = NUC[1]
    env = (rr > 0.94) & (rr <= 1.02)
    buf[env] = NUC[2]
    buf[(rr > 0.94) & (rr <= 0.955)] = NUC[0]
    buf[(rr > 1.005) & (rr <= 1.02)] = NUC[0]
    # nuclear pores
    for a_deg in (-150, -105, -60, -15, 25, 70, 120, 160):
        a = math.radians(a_deg)
        px, py = cx + rx * 0.98 * math.cos(a), cy + ry * 0.98 * math.sin(a)
        pm = (X - px) ** 2 + (Y - py) ** 2 <= 3.2 ** 2
        buf[pm & env] = CYTO[2]
        buf[((X - px) ** 2 + (Y - py) ** 2 <= 4.3 ** 2) & ~pm & env] = NUC[1]


def unzip(u):
    """How far the gene's strands have pulled apart (0..1)."""
    return T.smooth(T.u_of(u, (0.25, 1.0))) * (1 - T.smooth(T.u_of(u, (2.5, 3.3))))


def helix(buf, X, Y, u):
    """The DNA double helix across the nucleus; the gene's stretch glows and unzips."""
    y0 = HELIX_Y
    k = unzip(u)
    g0, g1 = GENE
    win = np.clip(np.minimum((X - g0) / 10.0, (g1 - X) / 10.0), 0, 1)
    open_ = k * win
    ph = 2 * math.pi * (X - 50.0) / 30.0 + 0.8 * u
    bend = -np.clip(g0 - X, 0, None) ** 2 / 150.0 + np.clip(X - g1, 0, None) ** 2 / 140.0
    top = y0 + bend + 6.5 * np.sin(ph) - 9.0 * open_
    bot = y0 + bend + 6.5 * np.sin(ph + math.pi) + 9.0 * open_
    span = (X > 50) & (X < 200)
    glow = (X >= g0) & (X <= g1) & (u < 3.4)
    for ys, front in ((top, np.cos(ph) > 0), (bot, np.cos(ph) <= 0)):
        m = span & (np.abs(Y - ys) < 1.6)
        buf[m] = NUC[0]
        buf[m & front & (np.abs(Y - ys + 0.8) < 0.6)] = NUC[2]
    rung_x = (np.mod(X - 50.0, 5.0) < 1.0) & span
    lo, hi = np.minimum(top, bot) + 1.6, np.maximum(top, bot) - 1.6
    rung = rung_x & (Y > lo) & (Y < hi) & (open_ < 0.35)
    buf[rung] = NUC_IN[1]
    buf[rung & glow] = RNA[2]
    if 0.1 < u < 3.4:                                     # the gene glows (the recipe being read)
        gc, gr = (g0 + g1) / 2, (g1 - g0) / 2 + 4.0
        halo = (((X - gc) / gr) ** 2 + ((Y - y0) / (14.0 + 8.0 * k)) ** 2 <= 1.0) & span & ~rung & _CK
        buf[halo & (np.abs(Y - top) > 1.6) & (np.abs(Y - bot) > 1.6)] = RNA[2]
    return top, bot


# the RNA's journey: along the gene, out of the pore, down into the cytoplasm, lying along POLY_Y
def _rna_path():
    cx, cy = NUC_C
    rx, ry = NUC_R
    a = math.radians(PORT)
    px, py = cx + rx * math.cos(a), cy + ry * math.sin(a)
    pts = [(GENE[0] + 2, HELIX_Y + 12)]
    for x in np.linspace(GENE[0] + 2, GENE[1], 16)[1:]:
        pts.append((x, HELIX_Y + 12))
    pts += [(px - 4, py - 12), (px, py), (px + 2, py + 18), (150, 272), (120, 296), (70, POLY_Y)]
    for x in np.linspace(70, 205, 18)[1:]:
        pts.append((x, POLY_Y))
    d = [0.0]
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        d.append(d[-1] + math.hypot(bx - ax, by - ay))
    return np.array(pts), np.array(d)


RNA_PTS, RNA_D = _rna_path()
RNA_PORE_D = float(RNA_D[17])                     # how far along the path the pore is (the 18th point)
RNA_LEN = RNA_D[-1] - RNA_D[np.searchsorted(RNA_D, RNA_D[-1] - 135.0)]   # it ends up spanning the polysome


def rna_point(dist):
    dist = float(np.clip(dist, 0, RNA_D[-1]))
    i = int(np.clip(np.searchsorted(RNA_D, dist) - 1, 0, len(RNA_D) - 2))
    k = (dist - RNA_D[i]) / max(RNA_D[i + 1] - RNA_D[i], 1e-9)
    return RNA_PTS[i] + (RNA_PTS[i + 1] - RNA_PTS[i]) * k


def rna_state(u):
    """(tail, head) distances along the path, or None. It grows along the gene, then slides out and lies down."""
    gene_len = GENE[1] - GENE[0]
    if u < 1.0:
        return None
    if u < 2.0:
        return 0.0, gene_len * T.smooth((u - 1.0) / 1.0)
    k = T.ease_in_out(T.u_of(u, (2.0, 3.0)), 2.0)
    head = T.lerp(gene_len, RNA_D[-1], k)
    return max(0.0, head - max(gene_len, RNA_LEN * k + gene_len * (1 - k))), head


def rna(buf, X, Y, u):
    st = rna_state(u)
    if st is None:
        return None
    tail, head = st
    n = max(2, int((head - tail) / 4.0))
    pts = [tuple(rna_point(tail + (head - tail) * i / n)) for i in range(n + 1)]
    wig = [(x, y + 1.5 * math.sin(i * 1.3 + u * 6.0)) for i, (x, y) in enumerate(pts)]
    m = polyline(X, Y, wig, 2.9)
    buf[m] = RNA[1]
    buf[edge(m)] = RNA[0]
    buf[polyline(X, Y, [(x - 0.6, y - 0.8) for x, y in wig], 0.7)] = RNA[2]
    if 1.0 <= u < 2.05:                                   # the enzyme reading the gene sits at the growing tip
        hx, hy = pts[-1]
        em = ((X - hx) / 6.5) ** 2 + ((Y - hy + 1) / 5.0) ** 2 <= 1.0
        buf[em] = RIBO[2]
        buf[edge(em)] = RIBO[0]
    return pts[-1]


RIBOS = 3
RIBO_T0 = tuple(20 * T.STEP + 2 * T.STEP * i for i in range(RIBOS))   # they clamp on, two 16ths apart (3.125 s ..)
BEADS = 12


def ribosome_x(i, u):
    return 74.0 + 34.0 * i + 14.0 * max(0.0, u - RIBO_T0[i])


def ribosomes(buf, X, Y, u):
    """Ribosomes clamp onto the RNA and run along it, each spinning out a chain of protein beads."""
    out = []
    for i in range(RIBOS):
        t0 = RIBO_T0[i]
        if u < t0:
            continue
        x = min(ribosome_x(i, u), 200.0)
        y = POLY_Y
        a = T.ease_out(T.u_of(u, (t0, t0 + 0.2)), 2.0)
        big = ((X - x) / (13.0 * a + 0.1)) ** 2 + ((Y - y - 6.0) / (9.0 * a + 0.1)) ** 2 <= 1.0
        small = ((X - x + 1) / (10.0 * a + 0.1)) ** 2 + ((Y - y + 6.5) / (6.5 * a + 0.1)) ** 2 <= 1.0
        for mm in (big, small):
            buf[mm] = RIBO[1]
            buf[mm & ((X - x + 4) ** 2 + (Y - y - 3) ** 2 <= 9) | mm & (Y < y - 8.5)] = RIBO[2]
            buf[edge(mm)] = RIBO[0]
        # the protein chain: one bead per 16th, hanging and drifting toward the fibres
        n = int(min(BEADS, max(0, math.floor((u - t0) / T.STEP + 1e-6))))
        fade = 1.0 - T.u_of(u, (5.0 + 0.2 * i, 5.6 + 0.2 * i))
        if fade > 0:
            for j in range(n):
                bx = x - 2.0 - 2.4 * j + 3.0 * math.sin(j * 0.9 + i)
                by = y + 16.0 + 4.6 * j
                bm = (X - bx) ** 2 + (Y - by) ** 2 <= 2.9 ** 2
                if fade < 1.0:
                    bm &= _BZ < fade
                buf[bm] = PROT[1]
                buf[bm & ((X - bx + 0.8) ** 2 + (Y - by + 0.8) ** 2 <= 1.0)] = PROT[2]
                buf[edge(bm)] = PROT[0]
        out.append((x, y))
    return out


FIBERS = ((95.0, 352.0, -1, 2), (118.0, 360.0, -1, 3), (100.0, 345.0, -1, 4), (160.0, 352.0, 1, 2),
          (180.0, 360.0, 1, 3), (175.0, 345.0, 1, 4))
FIBER_END = tuple(35 * T.STEP + T.STEP * i for i in range(len(FIBERS)))  # each hooks on a 16th after the last
FIBER_GROW = 0.9


def fibers(buf, X, Y, u, xl, xr):
    """Keratin fibres growing from the protein chains out to the desmosomes on both sides."""
    ends = []
    for i, (sx, sy, side, di) in enumerate(FIBERS):
        f = T.ease_out(T.u_of(u, (FIBER_END[i] - FIBER_GROW, FIBER_END[i])), 2.0)
        if f <= 0:
            continue
        ty = DESMO_Y[di]
        tx = (14.0 + 4.0) if side < 0 else (256.0 - 4.0)
        pts = []
        for k in range(13):
            q = k / 12 * f
            x = T.lerp(sx, tx, q)
            y = T.lerp(sy, ty, q) + 5.0 * math.sin(q * 6.0 + i) * (1 - q)
            pts.append((x, y))
        m = polyline(X, Y, pts, 2.4)
        buf[m] = PROT[1]
        buf[edge(m)] = PROT[0]
        twist = m & (np.abs(np.mod(X * 0.7 + Y * 0.7 + i * 3, 6.0) - 3.0) < 0.9)
        buf[twist] = PROT[0]
        buf[polyline(X, Y, [(x - 0.7, y - 0.7) for x, y in pts], 0.6) & ~twist] = PROT[2]
        ends.append((pts[-1], f >= 0.999, i))
        if f >= 0.999:                                    # it has hooked on: the plaque flashes once
            age = u - FIBER_END[i]
            if age < 0.25:
                fm = (X - tx) ** 2 + (Y - ty) ** 2 <= (4.0 + 18.0 * age) ** 2
                buf[fm & ~((X - tx) ** 2 + (Y - ty) ** 2 <= (2.5 + 18.0 * age) ** 2) & _CK] = SPARK[1]
    return ends


def mitochondria(buf, X, Y, u):
    """Bean-shaped mitochondria with folded inner membranes; they glow, then send energy sparks to the ribosomes."""
    glow = T.smooth(T.u_of(u, (5.9, 6.3)))
    for i, (mx, my, a_, b_, ang) in enumerate(MITOS):
        a = math.radians(ang)
        uu = (X - mx) * math.cos(a) + (Y - my) * math.sin(a)
        vv = -(X - mx) * math.sin(a) + (Y - my) * math.cos(a)
        body = (uu / a_) ** 2 + (vv / b_) ** 2 <= 1.0
        inner = (uu / (a_ - 2.5)) ** 2 + (vv / (b_ - 2.5)) ** 2 <= 1.0
        buf[body] = MITO[1]
        buf[inner] = MITO[2]
        cr = inner & (np.abs(np.mod(uu + 2.0 * np.sin(vv * 0.5), 7.0) - 3.5) < 0.8) & (np.abs(vv) < b_ - 4.0)
        buf[cr] = MITO[1]
        buf[inner & (vv < -b_ * 0.45) & (uu < 0)] = MITO[3]
        buf[edge(body)] = MITO[0]
        pulse = glow * (0.5 + 0.5 * math.sin(u * 9.0 + i))
        if pulse > 0.3:
            rim = edge(((uu / (a_ + 2.0)) ** 2 + (vv / (b_ + 2.0)) ** 2 <= 1.0)) & _CK
            buf[rim] = SPARK[0]


def spark(buf, x, y, col):
    """A 5-pixel diamond: outlined, bright in the middle."""
    x, y = int(math.floor(x)), int(math.floor(y))
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            d = abs(dx) + abs(dy)
            if d <= 2 and 0 <= x + dx < W and 0 <= y + dy < H:
                buf[y + dy, x + dx] = OUTLINE if d == 2 else (WHITE if d == 0 else col)


def sparks(buf, u, z, ribos):
    """ATP: little sparks streaming from each mitochondrion to the ribosomes, once the mitochondria light up."""
    n = int(round(10 * T.smooth(T.u_of(u, (5.8, 6.4)))))
    for i, (mx, my, a_, b_, ang) in enumerate(MITOS):
        for j in range(n):
            ph = (u * 3.5 / 3.0 + j / 10.0 + i * 0.37) % 1.0
            tx, ty = ribos[j % len(ribos)] if ribos else (135.0, POLY_Y)
            x = T.lerp(mx, tx, ph) + 18.0 * math.sin(ph * math.pi) * (1 if i % 2 else -1)
            y = T.lerp(my, ty, ph) - 22.0 * math.sin(ph * math.pi)
            cx_, cy_ = to_canvas(x, y, z)
            spark(buf, cx_, cy_, SPARK[0] if j % 2 else SPARK[1])


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
    ('DNA', 'THE RECIPE', 0.15, 1.55, (1, -1)),
    ('RNA COPY', 'CARRIES IT OUT', 1.6, 3.0, (1, -1)),
    ('RIBOSOME', 'BUILDS KERATIN', 3.15, 4.5, (-1, -1)),
    ('KERATIN FIBERS', 'GRIP THE NEIGHBORS', 4.55, 5.95, (1, -1)),
    ('MITOCHONDRIA', 'POWER IT ALL', 6.0, 7.4, (1, -1)),
)


# ---------------------------------------------------------------- the frame
def frame(u):
    """The inside of the cell at u seconds into the look inside (0 .. 7.5)."""
    X, Y, z = grids(u)
    buf = np.empty((H, W, 3), np.uint8)
    cytoplasm(buf, X, Y, u)
    xl, xr = membranes(buf, X, Y, u)
    er(buf, X, Y)
    golgi(buf, X, Y, u)
    mitochondria(buf, X, Y, u)
    nucleus(buf, X, Y, u)
    helix(buf, X, Y, u)
    head = rna(buf, X, Y, u)
    ends = fibers(buf, X, Y, u, xl, xr)
    ribos = ribosomes(buf, X, Y, u)
    sparks(buf, u, z, ribos)
    anchors = {
        0: ((GENE[0] + GENE[1]) / 2, HELIX_Y),
        1: head if head is not None else ((GENE[0] + GENE[1]) / 2, HELIX_Y + 10),
        2: ribos[1] if len(ribos) > 1 else (110.0, POLY_Y),
        3: ends[1][0] if len(ends) > 1 else (40.0, DESMO_Y[3]),
        4: (MITOS[0][0], MITOS[0][1]),
    }
    for k, (text, sub, t0, t1, side) in enumerate(CAPTIONS):
        if t0 <= u < t1:
            ax, ay = anchors[k]
            ox, oy = to_canvas(ax, ay, z)
            caption(buf, text, sub, ox, oy, u - t0, t1 - t0, side)
    if u < 0.1:                                            # in through the membrane
        buf = gfx.whiten(buf, 0.45 * (1 - u / 0.1))
    return buf
