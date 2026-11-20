"""Small pixel effects: air in the main cup (it leaves through the hose as the pump works, and rushes back in through
the valve when it is opened), a spark at each lancet tap, and a little sparkle when the skin is clean.

The air dots are a visual cue for pressure: fewer dots inside the cup means lower pressure.
"""
import math
import numpy as np
from . import view as V
from . import state as S
from . import timeline as T
from .tools import lancet_state, hose_points
from .palette import AIR, WHITE, GLASS, SKIN

_rng = np.random.default_rng(4)
TOP_AIR = [(_rng.uniform(0, 2 * math.pi), math.sqrt(_rng.uniform(0.02, 1.0)) * (S.R_IN - 2.0), _rng.uniform(0, 6.28))
           for _ in range(22)]
SIDE_AIR = [(_rng.uniform(-1, 1), _rng.uniform(0.0, 1.0), _rng.uniform(0, 6.28)) for _ in range(46)]


def air_top(buf, v, t):
    """Air dots inside the main cup seen from above, and the air leaving along the hose while pumping."""
    if v.se < 0.6 or S.cup_drop(t, S.MAIN) is None or t >= T.POP:
        return
    sx, sy = S.SPOTS[S.MAIN]
    ta = T.anim(t)
    n = int(round(len(TOP_AIR) * S.air(t)))
    for k, (a, r, ph) in enumerate(TOP_AIR[:n]):
        x = sx + r * math.cos(a + 0.3 * math.sin(ta * 1.3 + ph))
        y = sy + r * math.sin(a + 0.3 * math.sin(ta * 1.3 + ph))
        px, py = v.to(x, y, 6.0)
        V.dot(buf, px, py, AIR)
    if T.HOSE_CLICK <= t < T.HOSE_OFF:
        pts = hose_points(v, t)
        for p in T.PUMPS:
            u = (t - p) / 0.45
            if 0 <= u < 1:
                for j in range(5):
                    q = min(0.999, max(0.0, u * 1.3 - j * 0.07))
                    i = int(q * (len(pts) - 1))
                    f = q * (len(pts) - 1) - i
                    x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f
                    y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
                    V.dot(buf, x, y, WHITE if j == 0 else AIR, 2)


def air_side(buf, v, t):
    """Air dots inside the cut main cup, side view; on release they stream in through the valve."""
    if v.ZC is None or v.e > 30 or S.cup_drop(t, S.MAIN) is None:
        return
    sx, sy = S.SPOTS[S.MAIN]
    if abs(v.ycut - sy) > 1.0:
        return
    zl = S.lift(t)
    lev = S.pool_d(t, S.MAIN) if t < T.POP else S.pool_d(T.POP - 1e-3, S.MAIN)   # the air is above the blood
    ta = T.anim(t)
    n = int(round(len(SIDE_AIR) * S.air(t)))
    for k, (fx, fz, ph) in enumerate(SIDE_AIR[:n]):
        x = sx + fx * (S.R_IN - 1.5) + 0.6 * math.sin(ta * 1.1 + ph)
        h = float(S.dome_at(t, np.array(x), sy))
        h = lev if t >= T.POP else max(h, lev)
        z_hi = S.WALL_H + S.CAP_H * math.sqrt(max(0.0, 1 - ((x - sx) / S.R_IN) ** 2)) - 2.0
        z = zl + h + 1.0 + fz * max(0.5, z_hi - h - 1.0) + 0.5 * math.cos(ta * 0.9 + ph)
        if t >= T.PSSSH and k >= int(round(len(SIDE_AIR) * S.air(T.PSSSH - 0.01))):
            u = T.u_of(t, (T.PSSSH + (k % 7) * 0.03, T.PSSSH + 0.35 + (k % 7) * 0.03))
            x = T.lerp(sx + 0.6 * math.sin(k), x, u)
            z = T.lerp(zl + S.STEM_Z1, z, u)
        px, py = v.to(x, sy, z)
        V.dot(buf, px, py, AIR, 2 if v.s > 6 else 1)


def _burst(buf, px, py, u):
    """An 8-bit impact star: eight short rays fly out from just outside the tapped ring and thin away (the diagonals
    go first)."""
    r0, r1 = 9.0 + 6.0 * u, 13.0 + 10.0 * u
    size = 2 if u < 0.5 else 1
    for k in range(8):
        if k % 2 and u > 0.5:
            continue
        a = k * math.pi / 4
        r = r0
        while r < r1:
            V.dot(buf, px + math.cos(a) * r, py - math.sin(a) * r, WHITE, size)
            r += 1.0


def sparks(buf, v, t):
    """An impact star where the lancet taps; a sparkle on the clean skin."""
    for tau, spots in ((t, S.SPOTS), (t - T.TOTAL, S.SPOTS2)):
        for i, t0 in enumerate(T.TAPS):
            u = (tau - t0) / 0.16
            if 0 <= u < 1:
                sx, sy = spots[i]
                px, py = v.to(sx, sy, 0)
                _burst(buf, px, py, u)
    u = (t - T.CLEAN) / 0.5
    if 0 <= u < 1 and v.se > 0.5:
        sx, sy = S.SPOTS[S.MAIN]
        for j, (dx, dy) in enumerate(((-10, 12), (12, 8), (3, -10))):
            ph = (u * 2 + j * 0.3) % 1.0
            n = (0, 1, 2, 1, 0)[int(ph * 5)]
            if n:
                px, py = v.to(sx + dx, sy + dy, 0)
                for k in range(1, n + 1):
                    for ex, ey in ((k, 0), (-k, 0), (0, k), (0, -k)):
                        V.dot(buf, px + ex, py + ey, WHITE if n > 1 else GLASS[3])
                V.dot(buf, px, py, WHITE)


def dust(buf, v, t):
    """A ring of dust puffs where a cup lands (top view)."""
    if v.se < 0.9:
        return
    for i, c in enumerate(T.CUP_LAND):
        u = (t - c) / 0.24
        if not (0 <= u < 1):
            continue
        sx, sy = S.SPOTS[i]
        r = S.R_OUT + 1.0 + 6.0 * T.ease_out(u, 2.0)
        for k in range(12):
            a = 2 * math.pi * (k + 0.5 * (i % 2)) / 12
            px, py = v.to(sx + r * math.cos(a), sy + r * math.sin(a), 0)
            V.dot(buf, px, py, SKIN[4] if u < 0.6 else SKIN[3], 2 if u < 0.5 else 1)
