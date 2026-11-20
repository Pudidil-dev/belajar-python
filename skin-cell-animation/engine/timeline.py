"""The film's clock (96 BPM, 35 s = 14 bars) and the tissue's motion, in one place.

The epidermis is drawn as columns of cells on a slow conveyor. A cell is born when a basal cell divides (it starts at
height p = 0), is pushed up by the cells born under it, and its look depends only on how far up it is: p in [1, 4.5]
the spinous layer, [4.5, 6.5] the granular layer, [6.5, 12] the dead, flat cells of the stratum corneum; past
p = 12 it is shed. Every column holds the same cells at the same heights, only out of step with its neighbours, so
the slice looks the same after the conveyor has moved exactly N = 12 cells: that is the loop.

The film, in order (all times are film times; the division wraps round the loop point):
  33.44-34.69  the camera zooms into a basal cell at rest (P = 0)
  34.69-20.00  inside it, the cell divides (engine/inside.py), from the first frame on: the progress k goes 0 -> 0.97
  20.00-21.25  back out of the two new cells; on beat 3 of bar 8 the top one, ours, pops up (k = 1, P = SPLIT)
  21.25-30.00  fast-forward: the conveyor pushes it up on every 8th note, 12 cell heights (about 28 days)
  30.00-32.20  at the top, it lifts off in a flake with its neighbours; the camera follows
  32.20-33.44  the camera dives back down to the basal cell that stayed, which is about to divide again
P(t) is how far the conveyor has moved: SPLIT * k during the division, then pushes, then 12, which looks exactly like
0 (so it is drawn as 0 from the moment the flake lifts). The cell we follow is the one born in column 0 at P = 0: its
height is p = P(t).
"""
import math
import numpy as np

BPM = 96
BEAT = 60.0 / BPM          # 0.625 s
BAR = 4 * BEAT             # 2.5 s
STEP = BEAT / 4            # one 16th
TOTAL = 35.0               # the film: 14 bars

ZOOM_IN = (33.4375, 34.6875)    # into the basal cell (ends on the last 8th of bar 13: through the membrane)
INSIDE = (34.6875, 20.0)        # the division from inside (wraps round the loop point)
ZOOM_OUT = (20.0, 21.25)        # back out of the two new cells
POP = 21.25                     # the top cell pops up (beat 3 of bar 8): the first push
HOOK = (30.0, 32.2)             # the flake lifts off on the downbeat of bar 12; the camera follows it
DIVE = (32.2, 33.4375)          # and dives back down to the basal layer
INSIDE_DUR = INSIDE[1] + TOTAL - INSIDE[0]
# how far the division has got (0 resting .. 1 two cells; the tissue draws it as P = SPLIT * k), at film times
# (before the loop point counted as negative)
DIV_KEYS = ((ZOOM_IN[0] - TOTAL, 0.0), (INSIDE[0] - TOTAL, 0.0), (5.0, 0.12), (7.5, 0.25), (10.0, 0.33),
            (12.5, 0.38), (15.0, 0.62), (17.5, 0.85), (20.0, 0.97), (POP, 1.0))
_DKT = np.array([k_[0] for k_ in DIV_KEYS])
_DKV = np.array([k_[1] for k_ in DIV_KEYS])


def unwrap(t):
    """Film time with the last seconds before the loop point (the zoom in and the start of the division) counted as
    negative, so the division runs on one axis."""
    t = t % TOTAL
    return t - TOTAL if t >= ZOOM_IN[0] else t


def div_k(t):
    """How far the basal cell's division has got at film time t (0 resting .. 1 two cells)."""
    tu = unwrap(t)
    if tu > POP:
        return 1.0
    return float(np.interp(tu, _DKT, _DKV))


def in_division(t):
    """The zoom in, the division and the zoom out."""
    return unwrap(t) < POP


def inside_u(t):
    """Seconds into the look inside at film time t."""
    return (t - INSIDE[0]) % TOTAL


def is_inside(t):
    return inside_u(t) < INSIDE_DUR


N = 12                     # cell heights from birth to shedding
DAYS = 28.0
COL_W = 12.0               # column spacing (world units; a basal cell is ~9 units wide)


def clamp01(u):
    return max(0.0, min(1.0, u))


def u_of(t, span):
    a, b = span
    return clamp01((t - a) / (b - a))


def smooth(u):
    u = clamp01(u)
    return u * u * (3 - 2 * u)


def ease_in(u, p=2.0):
    return clamp01(u) ** p


def ease_out(u, p=2.0):
    return 1 - (1 - clamp01(u)) ** p


def ease_in_out(u, p=2.0):
    u = clamp01(u)
    return 0.5 * (2 * u) ** p if u < 0.5 else 1 - 0.5 * (2 - 2 * u) ** p


def lerp(a, b, k):
    return a + (b - a) * k


def smoothstep(e0, e1, x):
    t = np.clip((np.asarray(x, np.float64) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- the conveyor
EIGHTH = BEAT / 2
SPLIT = 0.25               # a newborn is still part of its mother until p = SPLIT
PUSH = 0.42                # each push takes this long (fast, then settles)
# the fast-forward: a push on every 8th note from the pop: the daughter rises, the climb, flattening, the top, rest
_STEPS = [(3, 1.05), (10, 5.5), (6, 2.8), (6, 1.8), (2, 0.6)]
STEPS = []
_k = 0
for n_, total in _STEPS:
    for i_ in range(n_):
        STEPS.append((POP + _k * EIGHTH, total / n_))
        _k += 1
assert abs(SPLIT + sum(d for _, d in STEPS) - N) < 1e-9
assert STEPS[-1][0] + PUSH < HOOK[0]


def P(t):
    """How far the conveyor has moved (in cell heights) at film time t."""
    t = t % TOTAL
    if in_division(t):
        return SPLIT * div_k(t)
    if t >= HOOK[0]:
        return 0.0                                       # = N: the same picture
    v = SPLIT
    for t0, d in STEPS:
        if t <= t0:
            break
        u = min(1.0, (t - t0) / PUSH)
        v += d * (1 - (1 - u) ** 3)
    return v


# P on one axis from the start of the zoom in (unwrapped, negative) to the flake (where it reaches N)
_TT = np.arange(ZOOM_IN[0] - TOTAL, HOOK[0] + 1e-9, 0.0005)
_PP = np.array([P(x % TOTAL) if x < HOOK[0] else float(N) for x in _TT])
_PP[_TT >= HOOK[0] - 1e-9] = float(N)


def P_inv(p):
    """The first film time at which the conveyor reaches p (0 < p <= N)."""
    i = int(np.searchsorted(_PP, p, side='left'))
    i = min(max(i, 1), len(_TT) - 1)
    a, b = _PP[i - 1], _PP[i]
    k = 0.0 if b <= a else (p - a) / (b - a)
    return float((_TT[i - 1] + (_TT[i] - _TT[i - 1]) * k) % TOTAL)


def jiggle(t, delay=0.0):
    """The jelly wobble each push sends through the tissue: a damped bounce starting at the push, reaching cells
    higher up a little later (delay). Positive = squashed (shorter, wider), negative = stretched."""
    out = 0.0
    tt = (t % TOTAL) - delay
    for t0, d in STEPS:
        a = tt - t0
        if a < 0:
            break
        if a < 0.9:
            out += (d / 0.55) * math.sin(2 * math.pi * a / 0.34) * math.exp(-a / 0.17)
    a = tt - POP                                         # the pop itself
    if 0 <= a < 0.9:
        out += 1.4 * math.sin(2 * math.pi * a / 0.3) * math.exp(-a / 0.2)
    return out


def wob(k):
    """An angular frequency that fits exactly k whole cycles into the film (so idle motion loops seamlessly)."""
    return 2 * math.pi * k / TOTAL


def day(p):
    return 1 + p * (DAYS - 1) / N


# ---------------------------------------------------------------- where things are
def _slot_h(q):
    if q < SPLIT:
        return 13.0 / SPLIT                 # splitting off the top of its mother
    if q < 1.0:
        return 6.0 / (1.0 - SPLIT)
    if q < 4.5:
        return 12.0
    if q < 6.5:
        return lerp(12.0, 6.4, (q - 4.5) / 2.0)
    if q <= 12.0:
        return lerp(6.4, 4.6, (q - 6.5) / 5.5)
    return 4.6


_QQ = np.arange(0.0, N + 3.0 + 1e-9, 0.002)
_HH = np.array([_slot_h(q) for q in _QQ])
_YY = 7.0 + np.concatenate([[0.0], np.cumsum((_HH[1:] + _HH[:-1]) * 0.5 * np.diff(_QQ))])


def Y(p):
    """Height of a cell's centre above the dermal-epidermal junction, at conveyor height p."""
    return float(np.interp(p, _QQ, _YY))


def slot_h(p):
    return _slot_h(p)


SURFACE = Y(N) + 0.5 * 0.46 * _slot_h(N) + 0.3       # the skin's surface


def base(c):
    """A column's phase: neighbours about half a cell out of step (so the dead cells lie like bricks), with a slow
    wave along the slice. No column but ours is caught mid-division while the conveyor is near 0."""
    if c == 0:
        return 0.0
    return (0.35 if c % 2 else 0.85) + 0.08 * math.sin(0.9 * c)


def col_x(c):
    return COL_W * c


def junction(x):
    """The wavy boundary between the epidermis and the dermis (its ridges and papillae)."""
    return 5.0 * np.sin(2 * math.pi * np.asarray(x) / 48.0 + 0.5)


# ---------------------------------------------------------------- the flake (the hook, and the loop)
# (column, how many cells ahead of the column's newborn at P = 0): the six tiles, two deep, that lift off as one flake
FLAKE = ((-1, 11), (0, 12), (1, 11), (-1, 10), (0, 11), (1, 10))


def flake_pose(t):
    """The flake's offset from where it lay (dx, dy), its tilt and its curl (degrees), t seconds after it lifts."""
    if t <= 0:
        return 0.0, 0.0, 0.0
    lift = 26.0 * ease_out(t / 2.0, 2.0) + 5.0 * max(0.0, t - 2.0)
    drift = 10.0 * t + 9.0 * t * t
    tilt = -6.0 * ease_out(t / 1.2, 2.0) + 2.5 * math.sin(t * 2.6)
    return drift, lift, tilt


def flake_curl(t):
    """How much the flake's ends curl up as it peels (degrees at each end)."""
    return 10.0 * ease_out(t / 0.8, 2.0)


