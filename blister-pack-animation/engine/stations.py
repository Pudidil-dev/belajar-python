"""The blister line's hardware seen from above (3/4 view), and the things moving through it.

The line is a long mint-green machine on a teal factory floor. Along it, from the top of the screen down: a heater and
the forming nozzles (STAGE 1), a hopper with a feeder bar that drops one capsule into each pocket (STAGE 2), a
scanner gantry whose laser crosses the web over a backlight (STAGE 3), a foil roll and a heated, knurled sealing
roller (STAGE 4), and a punch whose die stamps out each card, an air nozzle that kicks the rejected card away, and a
stack tray at the end (STAGE 5). Each station is drawn only when the camera is near it.
"""
import math
import numpy as np
from . import timeline as T
from . import pix
from . import view as Vw
from . import line as L
from .palette import (OUTLINE, WHITE, FLOOR, BED, PAINT, STEEL, GLASS, HEAT, AIR, YELLOW, LASER, FOIL, RED, CAPW)

BED_HALF = 37.0
RAIL = (31.0, 38.0)
HOPPER = (-29.0, 29.0, T.Y_DROP + 13.0, T.Y_DROP + 40.0)   # footprint
HOP_Z = (34.0, 58.0)
FEED_Y = T.Y_DROP + 4.5
FEED_Z = 28.0
STACK_XY = (0.0, T.Y_PRESS - 80.0)
SLOT_Y = T.Y_PRESS - 40.0
KICK = (40.0, T.Y_PRESS + 4.0)


# ---------------------------------------------------------------- floor, bed, rails
def floor(buf, c, S):
    cf = Vw.zcam(c, -45.0)
    xs, ys = cf.X[0], cf.Y[:, 0]
    buf[:] = FLOOR[1]
    tile = ((np.floor(xs / 24.0)[None, :] + np.floor(ys / 24.0)[:, None]) % 2) == 0
    buf[tile] = FLOOR[2]
    buf[:, (xs % 24.0) < 0.9 / cf.s * 1.2] = FLOOR[0]
    buf[(ys % 24.0) < 0.9 / cf.s * 1.2] = FLOOR[0]
    # hazard stripes along the machine
    for sx in (-52.0, 52.0):
        band = np.abs(xs - sx) < 4.0
        stripe = ((xs[None, :] + ys[:, None]) % 10.0) < 5.0
        buf[band[None, :] & stripe] = YELLOW[1]
        buf[band[None, :] & ~stripe] = OUTLINE


def bed(buf, c, S, y_lo, y_hi):
    """The machine bed under the film and the two painted rails beside it."""
    cb = Vw.zcam(c, -6.0)
    w = pix.win(cb, -BED_HALF - 3, BED_HALF + 3, y_lo - 6, y_hi + 6)
    if w is not None:
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        m = (np.abs(X) <= BED_HALF) & (Y >= y_lo - 6) & (Y <= y_hi + 6)
        v[m] = BED[1]
        v[m & ((((Y + 2000.0) % 30.0) < 0.7))] = BED[0]
        v[m & (np.abs(X) > BED_HALF - 1.0)] = BED[3]
        # side faces of the bed (seen from the front at the bottom edge are not needed: it runs off-screen)
    for sgn in (-1, 1):
        x0, x1 = sorted((sgn * RAIL[0], sgn * RAIL[1]))
        # inner face of the rail (facing the web), then its painted top
        cr = Vw.zcam(c, 4.0)
        w = pix.win(cr, x0, x1, y_lo - 6, y_hi + 6)
        if w is None:
            continue
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        m = (X >= x0) & (X <= x1)
        v[m] = PAINT[2]
        v[m & (np.abs(X - (x0 + x1) / 2) < 1.0)] = PAINT[3]
        v[m & ((X < x0 + 0.8) | (X > x1 - 0.8))] = PAINT[1]
        bolts = m & ((((Y + 2000.0) % 30.0) - 15.0) ** 2 + (X - (x0 + x1) / 2) ** 2 < 1.2 ** 2)
        v[bolts] = STEEL[3]
        v[pix.edge(m) & ~((Y < y_lo - 5) | (Y > y_hi + 5))] = OUTLINE


def _box(buf, c, x0, x1, y0, y1, z0, z1, top, front, edge=OUTLINE, top_hi=None):
    """A box from height z0 to z1: its front face, then its top."""
    ct, cb = Vw.zcam(c, z1), Vw.zcam(c, z0)
    ax, ay = Vw.to(c, x0, y0, z1)
    bx, by = Vw.to(c, x1, y0, z0)
    i0, i1 = int(math.floor(min(ax, bx))), int(math.ceil(max(ax, bx)))
    j0, j1 = int(math.floor(ay)), int(math.ceil(by))
    if i1 > 0 and i0 < Vw.W and j1 > 0 and j0 < Vw.H and j1 > j0:
        buf[max(j0, 0):min(j1, Vw.H), max(i0, 0):min(i1, Vw.W)] = front
        if edge is not None and 0 <= j1 - 1 < Vw.H:
            buf[j1 - 1, max(i0, 0):min(i1, Vw.W)] = edge
    w = pix.win(ct, x0, x1, y0, y1)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    m = (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)
    v[m] = top
    if top_hi is not None:
        v[m & (Y > y1 - 1.2 / ct.s * 1.5)] = top_hi
    if edge is not None:
        v[pix.edge(m)] = edge


def _cyl(buf, c, x0, x1, yc, zc, r, base, hi, lo, stripes=None, glow=None):
    """A horizontal cylinder (axis along x) at height zc, seen from above: shaded bands top to bottom."""
    cz = Vw.zcam(c, zc)
    w = pix.win(cz, x0, x1, yc - r, yc + r)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    m = (X >= x0) & (X <= x1) & (np.abs(Y - yc) <= r)
    q = (Y - yc) / r                                   # -1 (bottom/front) .. 1 (top/back)
    v[m] = base
    v[m & (q > 0.15) & (q < 0.65)] = hi
    v[m & (q < -0.55)] = lo
    if stripes is not None:
        ph, col = stripes
        st = m & ((((X * 0.0) + np.arcsin(np.clip(q, -1, 1)) * r + ph) % 2.6) < 1.0)
        v[st & (np.abs(q) < 0.85)] = col
    if glow is not None:
        v[m & (q < -0.2) & pix.checker(w)] = glow
    v[pix.edge(m)] = OUTLINE


# ---------------------------------------------------------------- STAGE 1: heater and forming nozzles
def mold_under(buf, c, S):
    """The mould block under the film (seen through it) at the forming line."""
    cb = Vw.zcam(c, -5.0)
    y0, y1 = T.Y_FORM - 14.0, T.Y_FORM + 10.0
    w = pix.win(cb, -30, 30, y0, y1)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    m = (np.abs(X) <= 29.0) & (Y >= y0) & (Y <= y1)
    v[m] = STEEL[1]
    for xc in T.COLS:
        v[m & L.stadium(X, Y, xc, T.Y_FORM - 2.0, L.PH + 0.8, L.PV + 0.8)] = BED[0]
    v[pix.edge(m)] = OUTLINE


def mold_over(buf, c, S):
    te = T.env_time(S)
    # the heater: a grill of glowing coils over the film, upstream of the nozzles
    hy0, hy1 = T.Y_FORM + 34.0, T.Y_FORM + 76.0
    _box(buf, c, -34.0, 34.0, hy0, hy1, 18.0, 24.0, STEEL[1], STEEL[0])
    cz = Vw.zcam(c, 24.0)
    w = pix.win(cz, -30, 30, hy0 + 3, hy1 - 3)
    if w is not None:
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        inner = (np.abs(X) <= 30.0) & (Y > hy0 + 3) & (Y < hy1 - 3)
        v[inner] = HEAT[0]
        coil = inner & (np.abs(((Y - hy0) % 7.0) - 3.5 - 1.6 * np.sin(X * 0.5)) < 0.9)
        v[coil] = HEAT[2]
        v[coil & (pix.bayer(w) < 0.4 + 0.3 * math.sin(te * 9.0))] = HEAT[3]
    # the forming gantry across the line, with two air nozzles over the two columns
    _box(buf, c, -40.0, 40.0, T.Y_FORM + 2.0, T.Y_FORM + 9.0, 22.0, 28.0, PAINT[2], PAINT[1], top_hi=PAINT[3])
    for sx in (-40.0, 40.0):
        _box(buf, c, sx - 3.0, sx + 3.0, T.Y_FORM + 2.0, T.Y_FORM + 9.0, 0.0, 22.0, PAINT[1], PAINT[0])
    for xc in T.COLS:
        _box(buf, c, xc - 3.5, xc + 3.5, T.Y_FORM - 1.0, T.Y_FORM + 4.0, 12.0, 22.0, STEEL[3], STEEL[2])


# ---------------------------------------------------------------- STAGE 2: the hopper, the feeder bar, falling pills
def _pile(seed=11, n=46):
    rng = np.random.default_rng(seed)
    out = []
    x0, x1, y0, y1 = HOPPER
    tries = 0
    while len(out) < n and tries < 9000:
        tries += 1
        x = rng.uniform(x0 + 7, x1 - 7)
        y = rng.uniform(y0 + 4, y1 - 4)
        if any((x - a) ** 2 + ((y - b) * 1.6) ** 2 < 7.0 ** 2 for a, b, _, _ in out):
            continue
        out.append((x, y, float(rng.uniform(-80, 80)), float(rng.uniform(0, 6))))
    out.sort(key=lambda p: p[3])
    return out


PILE = _pile()
HERO_PILE = (12.5, HOPPER[2] + 6.0, -14.0)
HOPS = (4.5, 5.0, 5.5, 6.0)                            # the hero shuffles forward through the pile, on the beat


def hero_in_hopper(S):
    return 2.0 <= S < T.T_LAND - T.FALL


def hero_pile(S):
    """The hero in the hopper: (x, y, z, angle), hopping from the back of the pile to the front, one hop a beat."""
    k, z_hop = 0.0, 0.0
    for i, th in enumerate(HOPS):
        u = T.clamp01((S - th) / 0.16)
        k += T.smooth(u) / len(HOPS)
        if 0 < u < 1:
            z_hop = 6.0 * math.sin(math.pi * u)
    x = T.lerp(-8.0, HERO_PILE[0], k)
    y = T.lerp(HOPPER[3] - 7.0, HERO_PILE[1], k)
    return x, y, HOP_Z[0] + 9.0 + z_hop, T.lerp(30.0, HERO_PILE[2], k)


def fill_over(buf, c, S):
    te = T.env_time(S)
    x0, x1, y0, y1 = HOPPER
    zb, zt = HOP_Z
    # the hopper: a steel floor, the pile of capsules, a glass front, a painted rim
    cb = Vw.zcam(c, zb)
    w = pix.win(cb, x0, x1, y0, y1)
    if w is not None:
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        m = (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)
        v[m] = STEEL[1]
        v[m & (((X - x0) % 6.0) < 0.6)] = STEEL[0]
    jig = 0.5 if int(te * 24) % 2 == 0 else -0.5
    for i, (px_, py_, pa, pz) in enumerate(PILE):
        pix.capsule(buf, Vw.zcam(c, zb + 2.8 + pz), px_ + (jig if i % 2 else -jig) * 0.5, py_, pa)
    if hero_in_hopper(S):
        hx, hy, hz, ha = hero_pile(S)
        pix.capsule(buf, Vw.zcam(c, hz), hx + jig * 0.4, hy, ha)
    # glass front face
    ax, ay = Vw.to(c, x0, y0, zt)
    bx, by = Vw.to(c, x1, y0, zb)
    j0, j1 = int(ay), int(by)
    i0, i1 = int(ax), int(bx)
    if j1 > 0 and j0 < Vw.H:
        seg = buf[max(j0, 0):min(j1, Vw.H), max(i0, 0):min(i1, Vw.W)]
        if seg.size:
            ck = pix.checker(pix.Win(slice(max(j0, 0), min(j1, Vw.H)), slice(max(i0, 0), min(i1, Vw.W)), None, None, 1))
            seg[ck] = (seg[ck].astype(np.uint16) * 2 // 3 + np.array(GLASS[2], np.uint16) // 3).astype(np.uint8)
            if seg.shape[0] > 2:
                seg[1] = GLASS[3]
    cz = Vw.zcam(c, zt)
    w = pix.win(cz, x0 - 2, x1 + 2, y0 - 2, y1 + 2)
    if w is not None:
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        frame = ((X >= x0 - 2) & (X <= x1 + 2) & (Y >= y0 - 2) & (Y <= y1 + 2)) & \
            ~((X > x0 + 1) & (X < x1 - 1) & (Y > y0 + 1) & (Y < y1 - 1))
        v[frame] = PAINT[2]
        v[frame & (Y > y1)] = PAINT[3]
        v[pix.edge(frame)] = OUTLINE
    # the feeder bar with two funnels over the two columns
    _box(buf, c, -40.0, 40.0, FEED_Y - 3.0, FEED_Y + 5.0, FEED_Z, FEED_Z + 6.0, PAINT[2], PAINT[1], top_hi=PAINT[3])
    for sx in (-40.0, 40.0):
        _box(buf, c, sx - 3.0, sx + 3.0, FEED_Y - 3.0, FEED_Y + 5.0, 0.0, FEED_Z, PAINT[1], PAINT[0])
    cz = Vw.zcam(c, FEED_Z + 6.0)
    w = pix.win(cz, -20, 20, FEED_Y - 3, FEED_Y + 5)
    if w is not None:
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        for xc in T.COLS:
            hole = L.stadium(X, Y, xc, FEED_Y + 1.0, 8.8, 3.2)
            v[hole] = OUTLINE
            v[pix.ring(hole)] = STEEL[3]


def falling(S):
    """The capsules in the air between the funnels and their pockets: (x, y, z, ang, is_hero, is_miss)."""
    out = []
    v_drop = -T.Y_DROP
    # which rows are landing within the next FALL seconds
    for card in range(-6, 12):
        for row in range(T.ROWS):
            t = T.land_time(card, row)
            if not (t - T.FALL <= S < t + 0.7):
                continue
            for col in range(2):
                miss = (card, row, col) == T.MISS
                if S >= t and not miss:
                    continue
                u = T.clamp01(1 - (t - S) / T.FALL)
                xp, yp = L.pocket_xy(card, row, col, S)
                if not miss or S < t:
                    z = T.lerp(FEED_Z - 1.0, -T.POCKET_D + T.CAP_R, u * u)
                    y = T.lerp(FEED_Y + 1.0, yp, T.smooth(u))
                    out.append((xp, y, z, 8.0 * (1 - u) * (1 if col else -1),
                                (card, row, col) == T.HERO, False))
                else:                                  # the miss: it hits the rim and bounces off the line
                    k = (S - t) / 0.7
                    x = xp - 3.0 - 60.0 * k
                    y = T.Y_DROP - 6.0 * k
                    z = 0.5 + 34.0 * k - 80.0 * k * k
                    out.append((x, y, z, -600.0 * k, False, True))
    return out


def draw_falling(buf, c, S, hero_only=False):
    for x, y, z, a, hero, miss in falling(S):
        if hero_only != hero:
            continue
        if z > 0.5:                                    # its shadow on the film
            w = pix.win(c, x - 9, x + 9, y - 6, y + 4)
            if w is not None:
                X, Y = np.broadcast_arrays(w.X, w.Y)
                sm = L.stadium(X, Y, x + 0.12 * z, y - 0.12 * z - 0.4, 7.0, 2.4)
                Vw.darken(buf, w, sm, 0.62)
        if not miss and z > 3.0:                       # speed streaks above it
            sx, sy = Vw.to(c, x, y, z)
            k = Vw.kz(z) * c.s
            for dx in (-4.5, 0.0, 4.5):
                for q in range(3, 3 + int(min(z, 14.0) * 0.9)):
                    if q % 3 != 2:
                        buf_y, buf_x = int(sy - q * k * 0.45 - 2.4 * k), int(sx + dx * k)
                        if 0 <= buf_y < Vw.H and 0 <= buf_x < Vw.W:
                            buf[buf_y, buf_x] = AIR[3] if q < 8 else AIR[2]
        pix.capsule(buf, Vw.zcam(c, z), x, y, a)


# ---------------------------------------------------------------- STAGE 3: the scanner
def scan_under(buf, c, S):
    """The backlight under the film at the laser line."""
    cb = Vw.zcam(c, -4.0)
    w = pix.win(cb, -30, 30, T.Y_SCAN - 6, T.Y_SCAN + 6)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    m = (np.abs(X) <= 29.5) & (np.abs(Y - T.Y_SCAN) <= 5.5)
    v[m] = GLASS[3]
    v[m & (np.abs(Y - T.Y_SCAN) <= 2.5)] = WHITE


def scan_laser(buf, c, S):
    """The laser line on the film (drawn over the web), flickering."""
    te = T.env_time(S)
    w = pix.win(c, -31, 31, T.Y_SCAN - 2, T.Y_SCAN + 2)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    m = (np.abs(X) <= 30.0) & (np.abs(Y - T.Y_SCAN) <= 0.45 + 0.5 / c.s)
    v[m] = LASER[1]
    v[m & ((np.floor(X * c.s) + int(te * 30)) % 5 == 0)] = LASER[2]


def scan_over(buf, c, S):
    y0, y1 = T.Y_SCAN + 7.0, T.Y_SCAN + 15.0
    _box(buf, c, -42.0, 42.0, y0, y1, 26.0, 32.0, PAINT[2], PAINT[1], top_hi=PAINT[3])
    for sx in (-42.0, 42.0):
        _box(buf, c, sx - 3.0, sx + 3.0, y0, y1, 0.0, 26.0, PAINT[1], PAINT[0])
    # the camera head hanging from the gantry, and its laser fan down to the line
    _box(buf, c, -7.0, 7.0, T.Y_SCAN + 1.0, T.Y_SCAN + 9.0, 18.0, 26.0, STEEL[2], STEEL[1], top_hi=STEEL[3])
    ax, ay = Vw.to(c, -1.5, T.Y_SCAN + 1.0, 18.0)
    bx, by = Vw.to(c, 1.5, T.Y_SCAN + 1.0, 18.0)
    lx, ly = Vw.to(c, -30.0, T.Y_SCAN, 0.0)
    rx, ry = Vw.to(c, 30.0, T.Y_SCAN, 0.0)
    X = (np.arange(Vw.W) + 0.5)[None, :]
    Y = (np.arange(Vw.H) + 0.5)[:, None]
    j0, j1 = int(max(ay, 0)), int(min(ly, Vw.H))
    if j1 > j0:
        Ys = Y[j0:j1]
        k = (Ys - ay) / max(ly - ay, 1e-6)
        xl = ax + (lx - ax) * k
        xr = bx + (rx - bx) * k
        fan = (X >= xl) & (X <= xr) & (((X.astype(int) + Ys.astype(int)) % 3) == 0)
        seg = buf[j0:j1]
        seg[np.broadcast_to(fan, seg.shape[:2])] = LASER[0]
    cz = Vw.zcam(c, 26.0)
    w = pix.win(cz, -7, 7, T.Y_SCAN + 1, T.Y_SCAN + 9)
    if w is not None:
        v = w.view(buf)
        X2, Y2 = np.broadcast_arrays(w.X, w.Y)
        lens = (X2 ** 2 + (Y2 - T.Y_SCAN - 4.0) ** 2) <= 2.6 ** 2
        v[lens] = OUTLINE
        v[lens & ((X2 + 0.8) ** 2 + (Y2 - T.Y_SCAN - 4.8) ** 2 <= 0.9 ** 2)] = LASER[2]


# ---------------------------------------------------------------- STAGE 4: the foil and the sealing roller
def _foil_sheet(buf, c, S, yr, top=(31.0, 32.0), bot=(2.0, 10.0), half=30.0):
    """The foil running from its roll down onto the web under the roller: a tilted, mirror-bright sheet. The
    reflections stay put (they come from the room); fine lines carried by the foil show it feeding."""
    ax, ay = Vw.to(c, 0.0, yr + top[0], top[1])
    bx, by = Vw.to(c, 0.0, yr + bot[0], bot[1])
    j0, j1 = int(math.floor(ay)), int(math.ceil(by))
    if j1 <= max(j0, 0) or j0 >= Vw.H:
        return
    rows = np.arange(max(j0, 0), min(j1, Vw.H))
    q = (rows + 0.5 - ay) / max(by - ay, 1e-6)
    z = top[1] + (bot[1] - top[1]) * q
    hw = half * c.s * (T.Z_CAM / (T.Z_CAM - z))          # half-width on the canvas, row by row
    xc = ax + (bx - ax) * q
    X = (np.arange(Vw.W) + 0.5)[None, :]
    inside = np.abs(X - xc[:, None]) <= hw[:, None]
    seg = buf[rows[0]:rows[-1] + 1]
    f = q * math.hypot(top[0] - bot[0], top[1] - bot[1])    # mm along the sheet from its top
    xm = (X - xc[:, None]) / (c.s * (T.Z_CAM / (T.Z_CAM - z[:, None])))
    seg[inside] = FOIL[3]
    band = (xm * 0.55 + f[:, None] * 1.0) % 46.0
    seg[inside & (band < 7.0)] = FOIL[4]
    seg[inside & (band >= 7.0) & (band < 9.5)] = WHITE
    seg[inside & (band > 34.0) & (band < 40.0)] = FOIL[2]
    lines = ((f - T.web(S)) % 5.0)[:, None] < 0.45
    seg[inside & lines & ~((band < 9.5))] = FOIL[2]
    seg[inside & (q[:, None] < 0.12)] = FOIL[1]             # in the shadow of the roll
    edge_ = inside & ~(np.abs(X - xc[:, None]) <= hw[:, None] - 1.0)
    seg[edge_] = OUTLINE


def seal_over(buf, c, S):
    te = T.env_time(S)
    yr = T.Y_SEAL
    # the foil roll up front, and the sheet running down from it to the roller
    _cyl(buf, c, -34.0, 34.0, yr + 40.0, 38.0, 9.0, FOIL[2], FOIL[4], FOIL[1],
         stripes=(T.web(S) * 0.7, FOIL[3]))
    for sx in (-38.0, 38.0):
        _box(buf, c, sx - 2.5, sx + 2.5, yr + 36.0, yr + 44.0, 0.0, 38.0, PAINT[1], PAINT[0])
    _foil_sheet(buf, c, S, yr)
    # the heated, knurled sealing roller, turning with the web
    for sx in (-38.0, 38.0):
        _box(buf, c, sx - 3.0, sx + 3.0, yr - 5.0, yr + 5.0, 0.0, 16.0, PAINT[1], PAINT[0])
    _cyl(buf, c, -34.0, 34.0, yr, 8.0, 7.5, HEAT[1], HEAT[3], HEAT[0], stripes=(T.web(S), HEAT[2]), glow=HEAT[2])
    # heat shimmer rising off it
    for i in range(7):
        ph = (te * 1.3 + i * 0.27) % 1.0
        x = -27.0 + i * 9.0 + math.sin(ph * 7 + i) * 1.5
        sx_, sy_ = Vw.to(c, x, yr, 16.0 + ph * 22.0)
        if 0 <= sx_ < Vw.W and 0 <= sy_ < Vw.H:
            buf[int(sy_), int(sx_)] = HEAT[3] if ph < 0.6 else HEAT[2]
            if sy_ + 1 < Vw.H:
                buf[int(sy_) + 1, int(sx_)] = HEAT[2]


# ---------------------------------------------------------------- STAGE 5: the punch, the kicker, the stack
def cut_under(buf, c, S):
    """The slot where the leftover web dives away, and the stack tray beyond it."""
    w = pix.win(c, -34, 34, SLOT_Y - 4, SLOT_Y + 3)
    if w is not None:
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        m = (np.abs(X) <= 33.0) & (Y > SLOT_Y - 4) & (Y < SLOT_Y + 3)
        v[m] = OUTLINE
        v[m & (Y > SLOT_Y + 1.8)] = STEEL[2]
    sx, sy = STACK_XY
    cz = Vw.zcam(c, -1.0)
    w = pix.win(cz, sx - 31, sx + 31, sy - 36, sy + 36)
    if w is not None:
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        m = pix.rrect(X, Y, sx - 31, sx + 31, sy - 36, sy + 36, 3.0)
        v[m] = STEEL[2]
        v[m & ~pix.rrect(X, Y, sx - 28, sx + 28, sy - 33, sy + 33, 2.0)] = STEEL[3]
        v[pix.edge(m)] = OUTLINE


def cut_over(buf, c, S):
    """The punch: four posts, two side beams, and the die frame that drops onto each card."""
    yp = T.Y_PRESS
    for px_ in (-40.0, 40.0):
        for py_ in (yp - 36.0, yp + 36.0):
            _box(buf, c, px_ - 3, px_ + 3, py_ - 3, py_ + 3, 0.0, 48.0, STEEL[2], STEEL[1], top_hi=STEEL[3])
        _box(buf, c, px_ - 3.5, px_ + 3.5, yp - 39.0, yp + 39.0, 44.0, 50.0, PAINT[2], PAINT[1], top_hi=PAINT[3])
    k = T.die_down(S)
    zd = 30.0 * (1 - k) + 0.8
    cz = Vw.zcam(c, zd)
    hw, hl = L.CARD_HW + 1.0, L.CARD_HL + 1.0
    if zd > 1.0:                                       # the die's shadow on the line
        sx, sy = Vw.SHADOW[0] * zd, Vw.SHADOW[1] * zd
        w = pix.win(c, -hw + sx - 1, hw + sx + 1, yp - hl + sy - 1, yp + hl + sy + 1)
        if w is not None:
            X, Y = np.broadcast_arrays(w.X, w.Y)
            ring = pix.rrect(X - sx, Y - sy, -hw, hw, yp - hl, yp + hl, 4.0) & \
                ~pix.rrect(X - sx, Y - sy, -hw + 3, hw - 3, yp - hl + 3, yp + hl - 3, 2.0)
            Vw.darken(buf, w, ring, 0.6)
    w = pix.win(cz, -hw - 12, hw + 12, yp - hl - 1, yp + hl + 1)
    if w is not None:
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        outer = pix.rrect(X, Y, -hw, hw, yp - hl, yp + hl, 4.0)
        inner = pix.rrect(X, Y, -hw + 3, hw - 3, yp - hl + 3, yp + hl - 3, 2.0)
        fr = outer & ~inner
        v[fr] = STEEL[3]
        v[fr & (Y > yp + hl - 1.5)] = STEEL[4]
        v[fr & ((((X + Y) % 6.0) < 3.0)) & (np.abs(Y - yp) < hl - 4) & (np.abs(X) > hw - 3)] = YELLOW[2]
        arms = (np.abs(Y - yp) < 3.0) & (np.abs(X) > hw) & (np.abs(X) < hw + 12)
        v[arms] = STEEL[2]
        v[pix.edge(fr | arms)] = OUTLINE
    # the kicker nozzle on the right rail
    kx, ky = KICK
    _box(buf, c, kx - 4.0, kx + 2.0, ky - 2.5, ky + 2.5, 3.0, 8.0, STEEL[3], STEEL[2], top_hi=STEEL[4])
