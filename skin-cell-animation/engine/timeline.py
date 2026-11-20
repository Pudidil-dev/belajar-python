"""The film's clock (96 BPM, 35 s = 14 bars) and the tissue's motion, in one place.

The epidermis is drawn as columns of cells on a slow conveyor. A cell is born when a basal cell divides (it starts at
height p = 0), is pushed up by the cells born under it, and its look depends only on how far up it is: p in [1, 4.5]
the spinous layer, [4.5, 6.5] the granular layer, [6.5, 12] the dead, flat cells of the stratum corneum; past
p = 12 it is shed. Every column holds the same cells at the same heights, only out of step with its neighbours, so
the slice looks the same after the conveyor has moved exactly N = 12 cells: that is the loop.

P(t) is how far the conveyor has moved. It stands still during the hook and the dive, then advances in pushes, one
per beat (each push fast, then settling), so divisions, ticks and the cell's rise all land on the beat; after 25 s of
story it has moved exactly 12 cells and has come to rest, so the last frame is the first frame. The film is 35 s:
the basal cell's division is watched from inside, in slow motion (film 5-16.25 s, 4 extra bars); story(t) and
film(s) convert.
The cell we follow is the one born in column 0 at P = 0: its height is p = P(t) (t in story time). About 28 days
pass on its way up (2.33 days per cell height).
"""
import math
import numpy as np

BPM = 96
BEAT = 60.0 / BPM          # 0.625 s
BAR = 4 * BEAT             # 2.5 s
STEP = BEAT / 4            # one 16th
STORY = 25.0               # the cell's life, from the hook back to the hook
TOTAL = 35.0               # the film: 14 bars (the story, with its cell division watched from inside in slow motion)

# The basal cell's division in slow motion (film time): the camera zooms into the basal cell at the end of the dive,
# watches it divide from the inside, and comes back out as the two new cells pop apart. Story time crawls through it:
# the cell rests (story 5.0-5.5), then divides (5.5-6.25, the span the tissue's own division takes), while 11.25 s of
# film pass. The extra 10 s are 4 bars.
SLOW = (5.0, 16.25)
ZOOM_IN = (5.0, 6.25)
INSIDE = (6.25, 15.0)
ZOOM_OUT = (15.0, 16.25)
SLOW_STORY = (5.0, 6.25)
EXTRA = (SLOW[1] - SLOW[0]) - (SLOW_STORY[1] - SLOW_STORY[0])
_REST_END = 5.5            # story time the division starts (DIVIDE[0])
# how far the division has got (0 resting .. 1 two cells; the tissue draws it as P = SPLIT * k) at film times
DIV_KEYS = ((5.0, 0.0), (6.25, 0.0), (7.85, 0.12), (9.45, 0.25), (10.85, 0.38), (12.25, 0.62), (13.65, 0.85),
            (15.0, 0.97), (16.25, 1.0))
_DKT = np.array([k_[0] for k_ in DIV_KEYS])
_DKV = np.array([k_[1] for k_ in DIV_KEYS])


def div_k(t):
    """How far the basal cell's division has got at film time t (0 resting .. 1 two cells)."""
    return float(np.interp(t, _DKT, _DKV))


def story(t):
    """Story time at film time t: it runs, crawls through the division while we watch it from inside, runs on."""
    if t < SLOW[0]:
        return t
    if t < SLOW[1]:
        k = div_k(t)
        if k <= 0.0:                                     # resting, while the camera zooms in
            f = min(1.0, max(0.0, (t - SLOW[0]) / (INSIDE[0] - SLOW[0])))
            return SLOW_STORY[0] + (_REST_END - SLOW_STORY[0]) * f
        return _REST_END + (SLOW_STORY[1] - _REST_END) * math.sqrt(k)
    return t - EXTRA


def film(s):
    """Film time of a story event (one exactly at the end of the division happens after the slow motion)."""
    if s < SLOW_STORY[0]:
        return s
    if s >= SLOW_STORY[1]:
        return s + EXTRA
    if s <= _REST_END:
        return SLOW[0] + (s - SLOW_STORY[0]) / (_REST_END - SLOW_STORY[0]) * (INSIDE[0] - SLOW[0])
    k = ((s - _REST_END) / (SLOW_STORY[1] - _REST_END)) ** 2
    return float(np.interp(k, _DKV[1:], _DKT[1:]))

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
assert DIVIDE == (_REST_END, SLOW_STORY[1])
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
    """How far the conveyor has moved (in cell heights) at story time t."""
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


_TT = np.arange(0.0, STORY + 1e-9, 0.0005)
_PP = np.array([P(x) for x in _TT])


def P_inv(p):
    """The first story time at which the conveyor reaches p (0 < p <= N)."""
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
DAY_STAMPS = ((6.35, 8.1, 1), (13.4, 15.2, 14), (22.4, 27.4, 28))   # (story time)
