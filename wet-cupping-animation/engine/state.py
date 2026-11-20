"""Where everything is, and how big, at time t (world millimetres; see view.py for the axes).

Two identical sets of four spots sit on the back, P = 240 mm apart along the spine. The film treats the upper set;
the lower set is still clean when the camera reaches it at the end, framed exactly like the opening.
"""
import math
from . import timeline as T

SPOTS = [(38.0, 140.0), (38.0, 80.0), (-38.0, 80.0), (-38.0, 140.0)]     # in the order the lancet taps them
MAIN = 0                                      # the cup the film follows
SPOTS2 = [(x, y - T.P) for x, y in SPOTS]     # the next, clean set
PUNCT = (-5.0, 0.0, 5.0)                      # the three tiny openings at each spot (x offsets)
CUP_ORDER = (0, 1, 2, 3)

R_IN, R_OUT = 19.0, 20.6                      # cup inner / outer radius
WALL_H, CAP_H = 24.0, 12.0                    # straight wall, then a rounded top
STEM_R, STEM_Z0, STEM_Z1 = 3.0, 34.6, 41.5    # the valve stem
VCAP_R, VCAP_Z1 = 4.6, 43.6                   # the valve cap
DEPTH = 22.0                                  # how deep the cross-section goes
LAMBDA = 7.0                                  # how fast the upward pull fades with depth
CUP_VOL = math.pi * R_IN ** 2 * (WALL_H + 2.0 / 3.0 * (CAP_H - 1.6))   # inside of a cup (mm^3, ~35 ml)
FILL = 0.30                                   # the blood collected fills 30% of the cup


def tapped(t, i):
    return t >= T.TAPS[i] + 0.04


def cup_drop(t, i):
    """Height (mm) of cup i above the skin as it drops onto its spot, or None before it appears."""
    t0 = T.CUPS[i]
    if t < t0 - 0.12:
        return None
    if t < t0 + 0.12:
        u = T.clamp01((t - (t0 - 0.12)) / 0.24)
        return 34.0 * (1 - u * u)
    u = T.clamp01((t - (t0 + 0.12)) / 0.2)
    return 3.0 * math.sin(math.pi * u) * (1 - u)


def cup_on(t, i):
    """Cup i sits on the skin (it may still be bouncing) and has not been taken off."""
    if cup_drop(t, i) is None:
        return False
    return not (i == MAIN and t >= T.POP)


def lift(t):
    """Height of the main cup above the skin once it is taken off (it goes straight up, level, then away)."""
    if t < T.POP:
        return 0.0
    return 110.0 * T.ease_in_out(T.u_of(t, T.LIFT), 1.7) + 400.0 * T.ease_in(T.u_of(t, (T.LIFT[1], T.LIFT[1] + 0.6)), 2.0)


def cup_gone(t):
    """The main cup has been carried out of the picture."""
    return t >= T.LIFT[1] + 0.6


def dome_h(t, i):
    """Height of the skin dome under cup i (mm)."""
    if cup_drop(t, i) is None:
        return 0.0
    if i != MAIN:                               # the other cups are pumped while the camera is in the cutaway
        return 8.0 * T.smooth(T.u_of(t, (7.5, 9.5)))
    h = 0.0
    for p in T.PUMPS:                           # each squeeze lifts the skin a step
        h += 2.0 * T.back_out(T.u_of(t, (p + 0.05, p + 0.3)), 1.3)
    h += 3.0 * T.smooth(T.u_of(t, T.CREEP))     # then it keeps rising slowly
    if t >= T.PSSSH:                            # air back in: it sinks ...
        h -= 5.5 * T.smooth(T.u_of(t, (T.PSSSH, T.PSSSH + 0.3)))
    if t >= T.POP:                              # ... and relaxes once the cup is off
        h -= 2.6 * T.smooth(T.u_of(t, (T.POP, T.POP + 2.5)))
    return max(h, 0.0)


def blood_frac(t, i):
    """How much of cup i the collected blood fills (a fraction of the cup's volume)."""
    if i == MAIN:
        return FILL * T.smooth(T.u_of(t, (T.LEAK[0] + 0.6, T.COLLECT[1])))
    return FILL * T.smooth(T.u_of(t, (12.0, 17.0)))


def level_for(vol, d):
    """Height (mm, above the rim) of the surface of vol mm^3 of blood around a dome of height d.

    The dome is d * (1 - r^2/R^2)^1.5 inside a cup of inner radius R. On a flat floor the blood would stand v high
    (v = vol / (pi R^2)). Below the dome's top it fills a ring: v = 0.6 L (L/d)^(2/3). Once it covers the dome:
    L = v + 0.4 d (the dome takes 0.4 pi R^2 d of the room). So when the skin sinks, the level drops with it."""
    v = vol / (math.pi * R_IN ** 2)
    if v <= 0.0:
        return 0.0
    if d < 1e-6 or v >= 0.6 * d:
        return v + 0.4 * max(d, 0.0)
    return (v * d ** (2.0 / 3.0) / 0.6) ** 0.6


def pool_d(t, i):
    """Height (mm, above the rim) of the surface of the blood collected in cup i. It rises past the top of the dome,
    and drops a little when the air goes back in and the skin sinks."""
    return level_for(blood_frac(t, i) * CUP_VOL, dome_h(t, i))


def clot(t):
    return T.smooth(T.u_of(t, T.CLOT))


def air(t):
    """Air left in the main cup, 1 = normal pressure .. ~0.25 = the low pressure after pumping."""
    a = 1.0
    for p in T.PUMPS:
        a -= 0.25 * T.smooth(T.u_of(t, (p, p + 0.35)))
    if t >= T.PSSSH:
        a += 0.75 * T.smooth(T.u_of(t, (T.PSSSH, T.PSSSH + 0.35)))
    return a


def mark_k(t):
    """How visible the main spot's cupping mark is."""
    return T.smooth(T.u_of(t, (T.POP, T.POP + 0.7)))


def dome_at(t, x, y):
    """Skin height (mm) at plane point (x, y): the domes under the cups (works on numpy arrays)."""
    import numpy as np
    h = 0.0
    for i, (sx, sy) in enumerate(SPOTS):
        d = dome_h(t, i)
        if d <= 0:
            continue
        r2 = ((x - sx) ** 2 + (y - sy) ** 2) / (R_IN * R_IN)
        h = h + d * np.clip(1 - r2, 0, 1) ** 1.5
    return h
