"""The film's clock (96 BPM, 25 s = 10 bars) and the tissue's motion, in one place.

The epidermis is drawn as columns of cells on a slow conveyor. A cell is born when a basal cell divides (it starts at
height p = 0), is pushed up by the cells born under it, and its look depends only on how far up it is: p in [1, 4.5]
the spinous layer, [4.5, 6.5] the granular layer, [6.5, 12] the dead, flat cells of the stratum corneum; past
p = 12 it is shed. Every column holds the same cells at the same heights, only out of step with its neighbours, so
the slice looks the same after the conveyor has moved exactly N = 12 cells: that is the loop.

P(t) is how far the conveyor has moved. It stands still during the hook and the dive, then advances in pushes, one
per beat (each push fast, then settling), so divisions, ticks and the cell's rise all land on the beat; after 25 s it
has moved exactly 12 cells and has come to rest, so the last frame is the first frame. The cell we follow is the one
born in column 0 at P = 0: its height is p = P(t). About 28 days pass on its way up (2.33 days per cell height).
"""
import math
import numpy as np

BPM = 96
BEAT = 60.0 / BPM          # 0.625 s
BAR = 4 * BEAT             # 2.5 s
STEP = BEAT / 4            # one 16th
TOTAL = 25.0               # 10 bars

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


# ---------------------------------------------------------------- the story's times
DIVIDE = (5.5, 6.25)       # the cell we follow is born: the basal cell stretches, then pops on beat 10
SPLIT = 0.25               # a newborn is still part of its mother until p = SPLIT
PUSH = 0.42                # each beat's push takes this long (fast, then settles)
# conveyor advance per beat (from beat 10): the daughter rises, the climb, flattening, the top, coming to rest
_STEPS = [(10, 13, 1.05), (13, 23, 5.5), (23, 29, 2.8), (29, 35, 1.8), (35, 40, 0.6)]
STEPS = []
for b0, b1, total in _STEPS:
    for b in range(b0, b1):
        STEPS.append((b * BEAT, total / (b1 - b0)))
assert abs(SPLIT + sum(d for _, d in STEPS) - N) < 1e-9


def P(t):
    """How far the conveyor has moved (in cell heights) at film time t."""
    if t < DIVIDE[0]:
        return 0.0
    if t < DIVIDE[1]:
        return SPLIT * ((t - DIVIDE[0]) / (DIVIDE[1] - DIVIDE[0])) ** 2
    v = SPLIT
    for t0, d in STEPS:
        if t <= t0:
            break
        u = min(1.0, (t - t0) / PUSH)
        v += d * (1 - (1 - u) ** 3)
    return v


_TT = np.arange(0.0, TOTAL + 1e-9, 0.0005)
_PP = np.array([P(x) for x in _TT])


def P_inv(p):
    """The first film time at which the conveyor reaches p (0 < p <= N)."""
    i = int(np.searchsorted(_PP, p, side='left'))
    i = min(max(i, 1), len(_TT) - 1)
    a, b = _PP[i - 1], _PP[i]
    k = 0.0 if b <= a else (p - a) / (b - a)
    return float(_TT[i - 1] + (_TT[i] - _TT[i - 1]) * k)


def jiggle(t, delay=0.0):
    """The jelly wobble each push sends through the tissue: a damped bounce starting at the push, reaching cells
    higher up a little later (delay). Positive = squashed (shorter, wider), negative = stretched."""
    out = 0.0
    tt = t - delay
    for t0, d in STEPS:
        a = tt - t0
        if a < 0:
            break
        if a < 0.9:
            out += (d / 0.55) * math.sin(2 * math.pi * a / 0.34) * math.exp(-a / 0.17)
    a = tt - DIVIDE[1]                                   # the pop itself
    if 0 <= a < 0.9:
        out += 1.4 * math.sin(2 * math.pi * a / 0.3) * math.exp(-a / 0.2)
    return out


def wob(k):
    """An angular frequency that fits exactly k whole cycles into the loop (so idle motion loops seamlessly)."""
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
    wave along the slice. No column but ours is caught mid-division while the conveyor stands still (P = 0)."""
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
    """The flake's offset from where it lay (dx, dy), its tilt and its curl (degrees), t seconds into the loop."""
    if t <= 0:
        return 0.0, 0.0, 0.0
    lift = 26.0 * ease_out(t / 2.0, 2.0) + 5.0 * max(0.0, t - 2.0)
    drift = 10.0 * t + 9.0 * t * t
    tilt = -6.0 * ease_out(t / 1.2, 2.0) + 2.5 * math.sin(t * 2.6)
    return drift, lift, tilt


def flake_curl(t):
    """How much the flake's ends curl up as it peels (degrees at each end)."""
    return 10.0 * ease_out(t / 0.8, 2.0)


# ---------------------------------------------------------------- captions (text, world anchor, times)
DAY_STAMPS = ((6.35, 8.1, 1), (13.4, 15.2, 14), (22.4, 27.4, 28))
