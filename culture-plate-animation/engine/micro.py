"""Up close: the agar surface at the point the camera dived into, and the bacteria on it, in micrometres (u).

One rod-shaped bacterium (1 u wide, 2 u long when newborn) lies on the agar. It grows to twice its length, pinches at
the middle and splits into two; the daughters do the same, and so on: 1, 2, 4 ... 256. The growth is a small physics
simulation: rods grow, divide end to end, and push each other apart (overlapping rods are separated along the line
between their closest points, which also turns them), so the colony spreads into a disc of rods in little aligned
patches, the way real microcolonies look. The film runs it as a time-lapse that speeds up: the first split takes
3 s on screen, the later rounds half a second.

Other bacteria the swab left along the streak (founders) do the same around it: each founder replays one of three
simulated colonies, turned, mirrored and a little early or late, so their colonies meet and merge into one white
crowd. Every split is logged with its time and place, for the pops in the sound and the sparkles in the picture.

Cells are drawn per pixel at the camera's scale: a rounded rod with a warm outline, shaded from the top left, a soft
coil of DNA inside when the camera is close; the waist narrows as it pinches. When the camera is far, the same rods
become small cream dashes in a white mass.
"""
import math
import os
from pathlib import Path

import numpy as np

from . import gfx, raster as R, palette as P, timeline as T

W, H = gfx.W, gfx.H
RAD = 0.5                    # cell radius (u)
LB = 2.0                     # newborn length, tip to tip (u)
T_SIM0, T_SIM1 = 9.0, 20.7   # simulated film-time span
DT = 1.0 / 120
N_GEN = 8                    # rounds of division: 2^8 = 256 cells per colony
JIT = (0.0, 0.06, 0.08, 0.1, 0.1, 0.09, 0.09, 0.09)
BUILD = Path(__file__).resolve().parent.parent / 'build'
L3 = np.array([-0.50, -0.64, 0.58]) / np.linalg.norm([-0.50, -0.64, 0.58])


# ================================================================ the simulation
def _closest(p1x, p1y, d1x, d1y, p2x, p2y, d2x, d2y):
    """Closest points between segments p1 + s d1 and p2 + t d2 (s, t in [0, 1]), vectorised (Ericson's method)."""
    rx, ry = p1x - p2x, p1y - p2y
    a = d1x * d1x + d1y * d1y
    e = d2x * d2x + d2y * d2y
    f = d2x * rx + d2y * ry
    c = d1x * rx + d1y * ry
    b = d1x * d2x + d1y * d2y
    den = a * e - b * b
    s = np.where(den > 1e-9, np.clip((b * f - c * e) / np.maximum(den, 1e-9), 0, 1), 0.0)
    t = (b * s + f) / np.maximum(e, 1e-9)
    s = np.where(t < 0, np.clip(-c / np.maximum(a, 1e-9), 0, 1), np.where(t > 1, np.clip((b - c) / np.maximum(a, 1e-9), 0, 1), s))
    t = np.clip(t, 0, 1)
    return s, t


def _relax(x, y, th, L, iters=3):
    n = len(x)
    if n < 2:
        return
    I, J = np.triu_indices(n, 1)
    for _ in range(iters):
        ax, ay = np.cos(th), np.sin(th)
        h = np.maximum(L / 2 - RAD, 0.0)
        p1x, p1y = x - h * ax, y - h * ay
        dx_, dy_ = 2 * h * ax, 2 * h * ay
        s, t = _closest(p1x[I], p1y[I], dx_[I], dy_[I], p1x[J], p1y[J], dx_[J], dy_[J])
        cix, ciy = p1x[I] + s * dx_[I], p1y[I] + s * dy_[I]
        cjx, cjy = p1x[J] + t * dx_[J], p1y[J] + t * dy_[J]
        vx, vy = cix - cjx, ciy - cjy
        d = np.sqrt(vx * vx + vy * vy)
        ov = 2 * RAD + 0.04 - d
        hit = ov > 0
        if not hit.any():
            return
        I2, J2 = I[hit], J[hit]
        d2 = np.maximum(d[hit], 1e-6)
        nx, ny = vx[hit] / d2, vy[hit] / d2
        k = 0.5 * ov[hit] * 0.8
        fx, fy = nx * k, ny * k
        mx = np.bincount(I2, fx, n) - np.bincount(J2, fx, n)
        my = np.bincount(I2, fy, n) - np.bincount(J2, fy, n)
        # torque: the push acts at the contact point, not the centre, so it turns the rod
        rix, riy = cix[hit] - x[I2], ciy[hit] - y[I2]
        rjx, rjy = cjx[hit] - x[J2], cjy[hit] - y[J2]
        ti = rix * fy - riy * fx
        tj = -(rjx * fy - rjy * fx)
        inert = h ** 2 / 3 + 0.25
        mt = (np.bincount(I2, ti, n) + np.bincount(J2, tj, n)) / inert * 0.5
        cnt = np.bincount(I2, None, n) + np.bincount(J2, None, n)
        scale = 1.0 / np.maximum(1.0, cnt * 0.5)
        x += mx * scale
        y += my * scale
        th += np.clip(mt * scale, -0.08, 0.08)


def simulate(seed, th0):
    """One colony from one cell (born at T_SIM0 at the origin, angle th0). Returns per-step arrays and the splits."""
    rng = np.random.default_rng(seed)
    nmax = 2 ** N_GEN
    steps = int(round((T_SIM1 - T_SIM0) / DT)) + 1
    X = np.zeros((steps, nmax), np.float32)
    Y = np.zeros((steps, nmax), np.float32)
    TH = np.zeros((steps, nmax), np.float32)
    LL = np.zeros((steps, nmax), np.float32)
    PR = np.zeros((steps, nmax), np.float32)             # cycle progress 0..1 (>= 1: will not divide again)
    NC = np.zeros(steps, np.int32)
    x = np.array([0.0])
    y = np.array([0.0])
    th = np.array([th0])
    L = np.array([LB])
    tb = np.array([T_SIM0])
    gen = np.array([0])
    td = np.array([T.DIVISIONS[0]])
    splits = []                                          # time, x, y, generation, angle
    sisters = []                                         # (i, j, birth, axis x, axis y): spring apart after a split
    for k in range(steps):
        t = T_SIM0 + k * DT
        live = []
        for (i, j, t0, ux, uy) in sisters:                # the two daughters spring apart a little (0.24 u)
            a0, a1 = T.ease_out((t - DT - t0) / 0.2, 2.0), T.ease_out((t - t0) / 0.2, 2.0)
            d = 0.12 * (a1 - a0)
            x[i] -= ux * d
            y[i] -= uy * d
            x[j] += ux * d
            y[j] += uy * d
            if t - t0 < 0.2:
                live.append((i, j, t0, ux, uy))
        sisters = live
        # growth
        cyc = np.where(np.isfinite(td), (t - tb) / np.maximum(td - tb, 1e-6), (t - tb) / 1.6)
        L = np.where(np.isfinite(td), LB * 2.0 ** np.clip(cyc, 0, 1), LB * (1 + 0.45 * np.clip(cyc, 0, 1)))
        # division
        due = np.isfinite(td) & (t >= td)
        if due.any():
            for i in np.nonzero(due)[0]:
                a = th[i]
                ax, ay = math.cos(a), math.sin(a)
                q = LB / 2                                  # daughters sit end to end, each LB long
                g = gen[i] + 1
                splits.append((t, x[i], y[i], g, a))
                nx_, ny_ = x[i] + q * ax, y[i] + q * ay
                x[i], y[i] = x[i] - q * ax, y[i] - q * ay
                da, db = rng.normal(0, 0.05, 2)
                th[i] = a + da
                x = np.append(x, nx_)
                y = np.append(y, ny_)
                th = np.append(th, a + db)
                tb[i] = t
                tb = np.append(tb, t)
                gen[i] = g
                gen = np.append(gen, g)
                if g < N_GEN:
                    base = T.DIVISIONS[g]
                    t1 = T.grid(base + JIT[g] * rng.standard_normal())
                    t2 = T.grid(base + JIT[g] * rng.standard_normal())
                    if g == 1:
                        t1, t2 = T.DIVISIONS[1], T.DIVISIONS[1] + T.STEP
                    t1, t2 = max(t1, t + 0.3), max(t2, t + 0.3)
                else:
                    t1 = t2 = np.inf
                td[i] = t1
                td = np.append(td, t2)
                sisters.append((i, len(x) - 1, t, ax, ay))
            cyc = np.where(np.isfinite(td), (t - tb) / np.maximum(td - tb, 1e-6), (t - tb) / 1.6)
            L = np.where(np.isfinite(td), LB * 2.0 ** np.clip(cyc, 0, 1), LB * (1 + 0.45 * np.clip(cyc, 0, 1)))
        _relax(x, y, th, L)
        n = len(x)
        X[k, :n], Y[k, :n], TH[k, :n], LL[k, :n] = x, y, th, L
        PR[k, :n] = np.where(np.isfinite(td), np.clip(cyc, 0, 1), 1.5)
        NC[k] = n
    return dict(x=X, y=Y, th=TH, L=LL, p=PR, n=NC, splits=np.array(splits, np.float64))


SIM_SEEDS = ((11, 1.2), (23, 0.4), (37, -0.7))     # (rng seed, first cell's angle); the hero replays the first


def sims():
    BUILD.mkdir(exist_ok=True)
    f = BUILD / 'micro_v4.npz'
    if f.exists():
        z = np.load(f, allow_pickle=False)
        return [{k: z[f'{i}_{k}'] for k in ('x', 'y', 'th', 'L', 'p', 'n', 'splits')} for i in range(len(SIM_SEEDS))]
    out = [simulate(sd, a) for sd, a in SIM_SEEDS]
    tmp = f.with_name(f'{f.stem}.{os.getpid()}.tmp.npz')            # written whole, then moved into place
    np.savez_compressed(tmp, **{f'{i}_{k}': v for i, s in enumerate(out) for k, v in s.items()})
    os.replace(tmp, f)
    return out


_SIMS = None


def get_sims():
    global _SIMS
    if _SIMS is None:
        _SIMS = sims()
    return _SIMS


# ================================================================ the founders: other bacteria along the streak
def _founders(stroke_dir):
    """Founder positions (u) round the hero (at the origin): denser along the line of the streak, none too close
    to the hero, so the first close-ups show it alone."""
    rng = np.random.default_rng(31)
    d = np.asarray(stroke_dir, float)
    d = d / np.linalg.norm(d)
    nrm = np.array([-d[1], d[0]])
    pts = [(0.0, 0.0, 0, 0.0, 1.0, 0.0)]                 # x, y, sim, rotation, mirror, time offset
    tries = 0
    while len(pts) < 84 and tries < 60000:
        tries += 1
        a = rng.uniform(-150, 150)
        c = rng.normal(0, 29)
        if abs(c) > 72:
            continue
        p = a * d + c * nrm
        if abs(p[0]) > 105 or abs(p[1]) > 165 or math.hypot(*p) < 27:
            continue
        if min(math.hypot(p[0] - q[0], p[1] - q[1]) for q in pts) < 21.5:
            continue
        pts.append((p[0], p[1], int(rng.integers(0, 3)), rng.uniform(0, 2 * math.pi),
                    1.0 if rng.random() < 0.5 else -1.0, float(rng.uniform(-0.3, 0.35))))
    return np.array(pts)


FOUNDERS = None


def setup(stroke_dir):
    global FOUNDERS
    FOUNDERS = _founders(stroke_dir)
    get_sims()


def _state(sim, t):
    k = int(round((min(max(t, T_SIM0), T_SIM1) - T_SIM0) / DT))
    n = int(sim['n'][k])
    return sim['x'][k, :n], sim['y'][k, :n], sim['th'][k, :n], sim['L'][k, :n], sim['p'][k, :n]


def cells_at(t):
    """All cells of all colonies at film time t: x, y (u), angle, length, cycle progress, colony index."""
    S = get_sims()
    xs, ys, ths, Ls, ps, cs = [], [], [], [], [], []
    for ci, (fx, fy, si, rot, mir, dt) in enumerate(FOUNDERS):
        x, y, th, L, p = _state(S[int(si)], t - dt)
        if mir < 0:
            y, th = -y, -th
        c, s_ = math.cos(rot), math.sin(rot)
        xs.append(fx + c * x - s_ * y)
        ys.append(fy + s_ * x + c * y)
        ths.append(th + rot)
        Ls.append(L)
        ps.append(p)
        cs.append(np.full(len(x), ci))
    return (np.concatenate(xs), np.concatenate(ys), np.concatenate(ths), np.concatenate(Ls), np.concatenate(ps),
            np.concatenate(cs))


def splits():
    """Every split of every colony: film time, x, y (u), generation, colony index."""
    S = get_sims()
    out = []
    for ci, (fx, fy, si, rot, mir, dt) in enumerate(FOUNDERS):
        sp = S[int(si)]['splits']
        if len(sp) == 0:
            continue
        x, y = sp[:, 1], sp[:, 2] * mir
        c, s_ = math.cos(rot), math.sin(rot)
        out.append(np.column_stack([sp[:, 0] + dt, fx + c * x - s_ * y, fy + s_ * x + c * y, sp[:, 3],
                                    np.full(len(sp), ci)]))
    return np.concatenate(out)


# ================================================================ the camera
# canvas px per u through the micro scene: close on one cell, then a step back after each round of splits
MKEYS = ((9.5, 9.0), (10.0, 30.0), (12.0, 34.0), (12.4, 21.0), (13.5, 21.0), (13.9, 14.0), (14.75, 14.0),
         (15.15, 9.2), (15.75, 9.2), (16.1, 6.2), (16.5, 6.2), (16.8, 4.4), (17.0, 4.4), (17.3, 3.4), (17.5, 3.4),
         (17.8, 2.75), (18.0, 2.75), (18.45, 2.25), (20.0, 1.95), (20.5, 0.9))


def mscale(t):
    ks = MKEYS
    if t <= ks[0][0]:
        return ks[0][1]
    for (t0, s0), (t1, s1) in zip(ks[:-1], ks[1:]):
        if t <= t1:
            e = T.smooth((t - t0) / (t1 - t0)) if s0 != s1 else 0.0
            return math.exp(math.log(s0) + (math.log(s1) - math.log(s0)) * e)
    return ks[-1][1]


# ================================================================ drawing
def _close(m, n):
    """Morphological closing (fill gaps up to about 2n px between cells)."""
    d = m.copy()
    for _ in range(n):
        e = d.copy()
        e[:, 1:] |= d[:, :-1]
        e[:, :-1] |= d[:, 1:]
        e[1:, :] |= d[:-1, :]
        e[:-1, :] |= d[1:, :]
        d = e
    for _ in range(n):
        e = d.copy()
        e[:, 1:] &= d[:, :-1]
        e[:, :-1] &= d[:, 1:]
        e[1:, :] &= d[:-1, :]
        e[:-1, :] &= d[1:, :]
        d = e
    return d | m


def _tone(rmp, v, px, py):
    n = len(rmp)
    idx = np.clip(np.floor(np.asarray(v) * (n - 1) + R.bayer(px, py)), 0, n - 1).astype(np.int32)
    return np.asarray(rmp, np.uint8)[idx]


def draw_agar(buf, s, stroke_dir, t, lens=None):
    """The agar surface up close: honey-gold gel with soft blotches and the fine furrows the cotton left, shaded
    with a 16-bit dithered gradient; darker towards the rim of the lens (cx, cy, radius) when one is given."""
    px = np.arange(W)[None, :]
    py = np.arange(H)[:, None]
    X = (px + 0.5 - W / 2) / s
    Y = (py + 0.5 - H / 2) / s
    X, Y = np.broadcast_arrays(X, Y)
    d = np.asarray(stroke_dir, float) / np.linalg.norm(stroke_dir)
    along = X * d[0] + Y * d[1]
    across = -X * d[1] + Y * d[0]
    v = 0.66 + 0.32 * (R.vnoise(X / 52.0 + 3.1, Y / 52.0, 21) - 0.5) + 0.13 * (R.vnoise(X / 13.0, Y / 13.0, 22) - 0.5)
    fur = np.sin(2 * math.pi * (across / 15.0 + 0.7 * R.vnoise(along / 90.0, across / 30.0, 23)))
    v = v + 0.05 * fur
    PX, PY = np.broadcast_arrays(px, py)
    if lens is not None:
        cx, cy, rad = lens
        rr = np.hypot(PX + 0.5 - cx, PY + 0.5 - cy) / max(rad, 1.0)
        v = v - 0.34 * np.clip(rr, 0, 1) ** 5 + 0.1 * np.clip(1 - rr * 1.6, 0, 1)
    buf[...] = _tone(P.AG[2:9], np.clip(v, 0, 1), PX, PY)


def draw_cells(buf, s, t, wobble=True):
    """All visible cells at scale s (canvas px per u), camera centred on the hero at the origin.
    Returns the cell mask (for the lens transitions)."""
    x, y, th, L, p, col = cells_at(t)
    if wobble:                                     # a slow wriggle, so the close-ups are alive
        ph = np.arange(len(x)) * 1.7
        th = th + 0.025 * np.sin(2 * math.pi * 0.9 * t + ph)
    sx = W / 2 + x * s
    sy = H / 2 + y * s
    h = np.maximum(L / 2 - RAD, 0) * s
    r = RAD * s
    ext = h + r + 1.5
    on = (sx + ext > 0) & (sx - ext < W) & (sy + ext > 0) & (sy - ext < H)
    idx_cells = np.nonzero(on)[0]
    mask = np.zeros((H, W), bool)
    if len(idx_cells) == 0:
        return mask
    sx, sy, th, h, p, ext = sx[on], sy[on], th[on], h[on], p[on], ext[on]
    ax, ay = np.cos(th), np.sin(th)
    bi, px, py = R.boxes_pixels(np.floor(sx - ext), np.floor(sy - ext), np.ceil(sx + ext), np.ceil(sy + ext))
    ex = px + 0.5 - sx[bi]
    ey = py + 0.5 - sy[bi]
    a = ex * ax[bi] + ey * ay[bi]
    b = -ex * ay[bi] + ey * ax[bi]
    hh = h[bi]
    aa = np.abs(a)
    q = np.clip((p[bi] - 0.7) / 0.3, 0, 1)
    q = q * q * (3 - 2 * q)
    q = np.where(p[bi] > 1.2, 0.0, q)                               # cells that will not divide again
    w_pinch = (1 - q) * r + q * np.sqrt(np.maximum(0, r * r - (r - aa) ** 2))
    w = np.where(aa < r, np.minimum(r, w_pinch), r)
    body = aa <= hh
    cap_d = np.sqrt((aa - hh) ** 2 + b * b)
    inside = np.where(body, np.abs(b) <= w, cap_d <= r)
    key = np.where(body, np.abs(b) / np.maximum(w, 1e-6), cap_d / r)
    bi, px, py, a, b, aa, w, body, key = bi[inside], px[inside], py[inside], a[inside], b[inside], aa[inside], \
        w[inside], body[inside], key[inside]
    if len(bi) == 0:
        return mask
    lin = py * W + px
    win = R.resolve(lin, key)
    bi, px, py, a, b, aa, w, body, key, lin = bi[win], px[win], py[win], a[win], b[win], aa[win], w[win], \
        body[win], key[win], lin[win]
    # shading: a rounded rod lit from the top left
    hh = h[bi]
    na = np.where(body, 0.0, np.sign(a) * (aa - hh) / r)
    nb = np.where(body, b / np.maximum(w, 1e-6), b / r)
    na, nb = np.clip(na, -1, 1), np.clip(nb, -1, 1)
    nz = np.sqrt(np.clip(1 - na * na - nb * nb, 0, 1))
    nx = na * ax[bi] - nb * ay[bi]
    ny = na * ay[bi] + nb * ax[bi]
    inten = (nx * L3[0] + ny * L3[1] + nz * L3[2]) / L3[2]
    waist = np.where(body & (aa < r), w / r, 1.0)
    inten = inten * (0.7 + 0.3 * waist)
    small = min(1.0, max(0.0, (6.0 - s) / 3.5))                     # tiny cells: a flat, bright cream mass
    inten = inten + (1.12 - inten) * small * 0.8
    vv = np.clip((inten - 0.3) / 0.95, 0, 1)
    n5 = 5
    ti = np.clip(np.floor(vv * (n5 - 1) + R.bayer(px, py)), 0, n5 - 1).astype(np.int32)   # 16-bit dithered shading
    cols = np.array(P.CELL[2:7], np.uint8)
    lab = np.zeros(H * W, np.int32)
    lab[lin] = bi + 1
    lab = lab.reshape(H, W)
    mask = lab > 0
    # shadows on the agar
    k = 1 if s < 7 else (2 if s < 18 else 3)
    shadow = R.shift(mask, k, k) & ~mask
    buf[shadow] = P.AG[4]
    buf[py, px] = cols[ti]
    spec = inten > 1.32                                             # a glossy glint on the lit shoulder
    buf[py[spec], px[spec]] = P.WHITE
    # the coiled DNA inside, when the camera is close: one coil, then two moving apart before the split
    if s >= 11:
        pp = p[bi]
        hl = h[bi] + r                                              # half the cell's length (px)
        k2 = np.clip((pp - 0.4) / 0.3, 0, 1)
        k2 = np.where(pp > 1.2, 0.0, k2 * k2 * (3 - 2 * k2))
        sep = k2 * 0.5 * hl                                         # the two copies move to the two ends
        blob_l = hl * (0.4 - 0.13 * k2)
        da = np.minimum(np.abs(a - sep), np.abs(a + sep))
        dna = (da / np.maximum(blob_l, 1e-6)) ** 2 + (b / (0.36 * r)) ** 2 < 1.0
        dna &= ti >= 3
        buf[py[dna], px[dna]] = P.CELL[4]
    if s < 3.6:                                                     # far: the colony reads as one white mound
        close = _close(mask, 1 if s >= 2.6 else 2)
        holes = close & ~mask
        buf[holes] = P.CELL[5]
        lab[holes] = -1
        mask = close
        rim_dark = mask & ~R.shift(mask, -2, -2)                    # the mound's shaded lower right edge
        rim_lit = mask & ~R.shift(mask, 2, 2)
        buf[rim_dark] = P.CELL[3]
        buf[rim_lit & ~rim_dark] = P.CELL[6]
        shadow2 = R.shift(mask, 1, 1) & ~mask
        buf[shadow2] = P.AG[3]
    # outlines: against the agar always; between touching cells a lighter separator when the cells are tiny
    rg, lf, dn, up = R.neighbours_differ(lab)
    nb_bg = np.zeros((H, W), bool)
    bg = ~mask
    nb_bg[:, :-1] |= bg[:, 1:]
    nb_bg[:, 1:] |= bg[:, :-1]
    nb_bg[:-1, :] |= bg[1:, :]
    nb_bg[1:, :] |= bg[:-1, :]
    edge_bg = mask & nb_bg
    lower = np.zeros((H, W), bool)                                 # one side only, so the separator is 1 px
    lower[:, :-1] |= (lab[:, 1:] != lab[:, :-1]) & (lab[:, 1:] > 0) & (lab[:, :-1] > 0)
    lower[:-1, :] |= (lab[1:, :] != lab[:-1, :]) & (lab[1:, :] > 0) & (lab[:-1, :] > 0)
    sep_m = mask & lower & ~edge_bg
    if s >= 7:
        buf[sep_m] = P.CELL[0]
        buf[edge_bg] = P.CELL[0]
    elif s >= 4.5:
        buf[sep_m] = P.CELL[1]
        buf[edge_bg] = P.CELL[0]
    elif s >= 3.0:
        buf[sep_m] = P.CELL[3]
        buf[edge_bg] = P.CELL[1]
    else:                                                           # far: separators fade into the white mass
        chk = ((np.arange(W)[None, :] + np.arange(H)[:, None]) % 3) == 0
        buf[sep_m & chk & (lab > 0)] = P.CELL[4]
        buf[edge_bg] = P.CELL[2]
    return mask
