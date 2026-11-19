"""The feeder: a clear hopper full of capsules over a vibrating lane that lines them up in single file, and a gate at
the end that lets one capsule drop into each pocket passing below, on the beat.

The lane is a queue (timeline.QUEUE): one item per pocket, in the order the pockets pass the gate; one item is a gap,
so its pocket passes by empty (MISS!), and one is the hero. Each release tips the front capsule off the gate and the
rest close up by one slot. New capsules slide out of the hopper into the top slot.
"""
import math
import numpy as np
from . import timeline as T
from . import pix
from . import machine as M
from .palette import OUTLINE, WHITE, STEEL, GLASS, BODY, HUD

R = T.CAP_R
LANE_TOP = (-110.0, 150.5)
LANE_END = (-7.0, 118.0)
_dx, _dy = LANE_END[0] - LANE_TOP[0], LANE_END[1] - LANE_TOP[1]
_L = math.hypot(_dx, _dy)
D = (_dx / _L, _dy / _L)                     # along the lane, downhill
N = (-D[1], D[0])                            # its upward normal
LANE_ANG = math.degrees(math.atan2(D[1], D[0]))
SLOT = T.CAP_L + 1.0
HOP_TOP = (-154.0, -66.0, 240.0)             # x0, x1, y of the hopper's rim
HOP_OUT = (-119.0, -101.0, 158.0)            # x0, x1, y of its outlet
OUTLET = (-110.0, 163.0)


def _vib(S):
    """The vibration: a one-pixel buzz, normal to the lane."""
    te = T.env_time(S)
    return 0.45 if int(te * 30) % 2 == 0 else -0.45


def slot_pos(q, S):
    j = _vib(S)
    return (LANE_END[0] - (q + 0.5) * SLOT * D[0] + N[0] * (R + 0.35 + j),
            LANE_END[1] - (q + 0.5) * SLOT * D[1] + N[1] * (R + 0.35 + j))


def _inside_hopper(x, y, m=0.0):
    k = (y - HOP_OUT[2]) / (HOP_TOP[2] - HOP_OUT[2])
    xl = HOP_OUT[0] + (HOP_TOP[0] - HOP_OUT[0]) * k + m
    xr = HOP_OUT[1] + (HOP_TOP[1] - HOP_OUT[1]) * k - m
    return xl < x < xr


def _make_pile(n=38, seed=7):
    rng = np.random.default_rng(seed)
    out = []
    tries = 0
    while len(out) < n and tries < 20000:
        tries += 1
        y = rng.uniform(HOP_OUT[2] + 9.0, 216.0)
        x = rng.uniform(HOP_TOP[0], HOP_TOP[1])
        if not _inside_hopper(x, y, R + 4.5):
            continue
        if any((x - a) ** 2 + (y - b) ** 2 < 8.2 ** 2 for a, b, _, _ in out):
            continue
        out.append((x, y, float(rng.uniform(-90, 90)), float(rng.uniform(0, 1))))
    out.sort(key=lambda p: p[3])
    return out


PILE = _make_pile()
HERO_PILE = (-106.5, 168.0, -32.0)           # the hero waits just above the outlet


def released_items(S):
    return T.released(S)


def hero_in_pile(S):
    return T.slot(T.HERO_J, S) >= T.LANE_SLOTS


def hero_pos(S):
    """(x, y, ang) of the hero while it is in the feeder (pile, lane or falling), else None."""
    if S < 4.0:
        return None
    q = T.slot(T.HERO_J, S)
    rel = T.HERO_LAND - T.FALL
    if S >= T.HERO_LAND:
        return None
    if S >= rel:
        return _falling(T.HERO_K, S, rel)
    if q >= T.LANE_SLOTS:
        j = _vib(S) * 0.6
        return HERO_PILE[0] + j, HERO_PILE[1], HERO_PILE[2]
    if q > T.LANE_SLOTS - 1:
        k = q - (T.LANE_SLOTS - 1)
        x0, y0 = slot_pos(T.LANE_SLOTS - 1, S)
        return T.lerp(x0, HERO_PILE[0], k), T.lerp(y0, HERO_PILE[1], k), T.lerp(LANE_ANG, HERO_PILE[2], k)
    x, y = slot_pos(max(q, 0.0), S)
    return x, y, LANE_ANG


def _falling(k, S, rel):
    u = T.clamp01((S - rel) / T.FALL)
    x0, y0 = slot_pos(0.0, S)
    xp = T.pocket_u(k) + T.web(S)
    yp = T.WEB_Y - T.POCKET_D + R + 0.15
    return T.lerp(x0 + 2.0, xp, T.smooth(u)), T.lerp(y0, yp, u * u), T.lerp(LANE_ANG, 0.0, T.smooth(u))


def gate_open(S):
    """How far the gate flap is swung open (0..1): it flicks open at each release."""
    k = 0.0
    for _, t, kind in T.QUEUE:
        rel = t - T.FALL
        if kind != 'gap' and rel - 0.03 <= S < rel + 0.14:
            k = max(k, math.sin(math.pi * T.clamp01((S - rel + 0.03) / 0.17)))
    return k


def draw_hopper(buf, c, S):
    """The hopper (clear acrylic on a steel frame) with the pile of capsules inside."""
    x0, x1, yt = HOP_TOP
    o0, o1, yo = HOP_OUT
    w = pix.win(c, x0 - 3, x1 + 3, yo - 6, yt + 4)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    shape = pix.poly(X, Y, [(x0, yt), (x1, yt), (o1, yo), (o0, yo)])
    ck = pix.checker(w)
    v[shape & ck] = GLASS[0]
    # the pile, jiggling with the feeder (kept inside the hopper's walls)
    keep = v.copy()
    jig = _vib(S) * 0.7
    hero_here = hero_in_pile(S)
    for i, (px, py, pa, _) in enumerate(PILE):
        dj = jig if i % 2 == 0 else -jig
        pix.capsule(buf, c, px + dj * 0.4, py + dj, pa)
    if hero_here:
        pix.capsule(buf, c, HERO_PILE[0] + jig * 0.6, HERO_PILE[1], HERO_PILE[2])
    v = w.view(buf)
    v[~shape] = keep[~shape]
    # the acrylic front: a light tint and two glints; the steel frame
    glint = shape & (np.abs((X - x0) - (yt - Y) * 0.18 - 10.0) < 1.2)
    v[glint] = GLASS[3]
    v[shape & (np.abs((X - x0) - (yt - Y) * 0.18 - 15.0) < 0.6)] = GLASS[2]
    fr = pix.edge(shape)
    v[fr] = STEEL[3]
    v[pix.ring(shape)] = OUTLINE
    v[(Y > yt - 1.0) & (Y < yt + 3.0) & (X > x0 - 3) & (X < x1 + 3)] = STEEL[2]
    v[(Y > yt + 2.0) & (Y < yt + 3.0) & (X > x0 - 3) & (X < x1 + 3)] = STEEL[3]
    v[(Y > yo - 5.0) & (Y < yo) & (X > o0 - 3) & (X < o1 + 3)] = STEEL[2]


def draw_lane(buf, c, S):
    """The vibrating lane, its drive (with springs), the queue of capsules and the gate."""
    jit = _vib(S)
    # the drive box on two legs, springs up to the lane
    bx0, bx1 = -78.0, -46.0
    M.rect(buf, c, bx0 - 6.0, bx0 - 2.0, M.DECK, 120.0, STEEL[1])
    M.rect(buf, c, bx1 + 2.0, bx1 + 6.0, M.DECK, 120.0, STEEL[1])
    M.rect(buf, c, bx0 - 8.0, bx1 + 8.0, 116.0 + jit * 0.3, 124.0 + jit * 0.3, BODY[1], hi=BODY[3], lo=BODY[0])
    w = pix.win(c, bx0 - 10, bx1 + 10, 112, 150)
    if w is not None:
        v = w.view(buf)
        X, Y = np.broadcast_arrays(w.X, w.Y)
        for sx in (bx0 + 4.0, bx1 - 4.0):
            ytop = LANE_TOP[1] + (sx - LANE_TOP[0]) * D[1] / D[0] - 2.0
            zz = (np.abs(X - sx - 2.0 * np.sign(np.sin((Y - 124.0) * 1.6))) < 0.7) & (Y > 124.0) & (Y < ytop)
            v[zz] = STEEL[3]
        te = T.env_time(S)
        if int(te * 15) % 2 == 0:                    # buzz lines
            for lx in (bx0 - 12.0, bx1 + 12.0):
                v[(np.abs(X - lx) < 0.6) & (np.abs(Y - 120.0) < 3.0)] = WHITE
    # the lane: a steel channel (back wall above, floor below the capsules)
    w = pix.win(c, LANE_TOP[0] - 4, LANE_END[0] + 4, LANE_END[1] - 6, LANE_TOP[1] + 10)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    al = (X - LANE_TOP[0]) * D[0] + (Y - LANE_TOP[1]) * D[1]
    ac = (X - LANE_TOP[0]) * N[0] + (Y - LANE_TOP[1]) * N[1] - jit
    on = (al >= -2.0) & (al <= _L + 1.0)
    back = on & (ac > 0.0) & (ac < 2 * R + 2.2)
    v[back & pix.checker(w)] = STEEL[0]
    v[on & (ac > 2 * R + 1.6) & (ac < 2 * R + 2.8)] = STEEL[2]
    floor_ = on & (ac <= 0.0) & (ac > -2.4)
    v[floor_] = STEEL[2]
    v[floor_ & (ac > -0.8)] = STEEL[3]
    v[pix.ring(floor_ | (on & (ac > 2 * R + 1.6) & (ac < 2 * R + 2.8)))] = OUTLINE
    # the queue: slots 0..LANE_SLOTS-1, plus the one sliding in from the hopper
    n = T.released(S)
    j0 = int(math.floor(n))
    for j in range(j0, j0 + T.LANE_SLOTS + 1):
        q = j - n
        if q < 0 or q >= T.LANE_SLOTS:
            continue
        kind = T.QUEUE[j][2] if j < len(T.QUEUE) else 'pill'
        if kind == 'gap':
            continue
        if kind == 'hero':
            continue                                  # drawn by draw_hero (on top, with its tag)
        if q > T.LANE_SLOTS - 1:
            k = q - (T.LANE_SLOTS - 1)
            x0, y0 = slot_pos(T.LANE_SLOTS - 1, S)
            pix.capsule(buf, c, T.lerp(x0, OUTLET[0], k), T.lerp(y0, OUTLET[1], k), T.lerp(LANE_ANG, -60.0, k))
        else:
            x, y = slot_pos(q, S)
            pix.capsule(buf, c, x, y, LANE_ANG)
    # the gate flap at the end of the lane
    g = gate_open(S)
    ang = math.radians(-90.0 + 70.0 * g)
    gx, gy = LANE_END[0] + 1.0, LANE_END[1] + 2 * R + 2.6
    ex, ey = gx + 9.0 * math.cos(ang), gy + 9.0 * math.sin(ang)
    gm = pix.seg(X, Y, gx, gy, ex, ey, 0.9)
    v[gm] = STEEL[3]
    v[pix.ring(gm)] = OUTLINE
    v[(X - gx) ** 2 + (Y - gy) ** 2 <= 1.6 ** 2] = STEEL[1]


def draw_falling(buf, c, S):
    """Capsules on their way from the gate into the pockets (not the hero: draw_hero does that)."""
    for k, t, kind in T.QUEUE:
        rel = t - T.FALL
        if kind != 'pill' or not (rel <= S < t):
            continue
        x, y, a = _falling(k, S, rel)
        pix.capsule(buf, c, x, y, a)


def draw(buf, c, S):
    if S < 2.0:
        S = T.TOTAL
    draw_hopper(buf, c, S)
    draw_lane(buf, c, S)
    draw_falling(buf, c, S)
