"""The back seen from above (the top surface of the slab), painted per pixel in plane coordinates.

Warm skin, lit from the upper left (the shots stop at the shoulders): a soft groove along the spine with the small bumps of the vertebrae every 24 mm,
the muscles either side a touch lighter, the shoulder blades and the sides of the body shaded. Between the two sets of
spots the pattern repeats exactly (the bumps' spacing divides the 240 mm between the sets), so the second set looks
just like the first. On top: the marker rings on the chosen spots, the tiny openings the lancet leaves, the skin
rising under the cups, the blood collected at their rims, and later the round mark and the left-over blood.
"""
import numpy as np
from . import view as V
from . import state as S
from . import timeline as T
from .palette import SKIN, BLOOD, MARK, MARKER, TABLE, GAUZE


FAR = 270.0        # the far end of the back (toward the head): a straight edge, past the top of every shot


def half_width(y):
    """Half the width of the back at y. The back runs straight on to FAR (no shoulders' taper, no neck), so when the
    camera looks along the spine its far end shows only as a straight edge against the dark."""
    return np.interp(y, [-360, -250, -100, 50, 180, 236], [168, 150, 158, 172, 188, 176])


def wipe_pos(t):
    """Centre (plane x, y) of the gauze pad while it wipes, or None."""
    if not (T.WIPE[0] <= t < T.WIPE[1]):
        return None
    sx, sy = S.SPOTS[S.MAIN]
    u = T.u_of(t, T.WIPE)
    k = (u * 2) % 1.0
    k = T.ease_in_out(k, 1.6)
    if u < 0.5:
        return sx + T.lerp(-24, 26, k), sy + T.lerp(6, -2, k)
    return sx + T.lerp(26, -22, k), sy + T.lerp(-6, -12, k)


def wiped(t, x, y):
    """Has the gauze passed over plane point (x, y) yet?"""
    if t < T.WIPE[0]:
        return False
    if t >= T.WIPE[1]:
        return True
    n = 24
    for k in range(n + 1):
        tt = T.WIPE[0] + (t - T.WIPE[0]) * k / n
        p = wipe_pos(tt)
        if p is not None and (p[0] - x) ** 2 + (p[1] - y) ** 2 < 12.0 ** 2:
            return True
    return False


RESIDUAL = [(-5.0, 0.0, 1.5), (0.0, 0.0, 1.8), (5.0, 0.0, 1.5), (-11.0, 3.0, 0.8), (9.0, -4.0, 0.9),
            (3.0, 7.0, 0.7), (-3.0, -8.0, 0.8), (13.0, 5.0, 0.6)]          # left-over drops (dx, dy, radius)


def paint_top(buf, v, t, region):
    """Paint the top surface wherever `region` is set."""
    if v.YP is None or not region.any():
        return
    X = np.broadcast_to(v.X, (V.H, V.W))
    Y = np.broadcast_to(v.YP, (V.H, V.W))
    region = region & (Y <= FAR)                     # past the far end: the dark background, nothing painted
    hw = half_width(Y)
    ax = np.abs(X)
    body = ax <= hw
    # the table at the sides and a towel over the hips
    out = region & ~body
    buf[out] = TABLE[1]
    buf[out & V.full(((X // 9 + Y // 9) % 2) == 0) & (np.abs(X) > hw + 6)] = TABLE[0]
    towel = region & (Y < -300) & (ax <= hw + 30)
    buf[towel] = GAUZE[1]
    buf[towel & V.CHECK & ((Y.astype(int) % 6) < 2)] = GAUZE[0]
    sk = region & body & ~towel
    buf[sk] = SKIN[2]
    # light: the muscles beside the spine catch a little more light (a soft dither), the groove and sides are darker
    lit = (ax > 8) & (ax < 40) & (X < 0) | (ax > 10) & (ax < 34) & (X >= 0)
    buf[sk & lit & V.CHECK] = SKIN[3]
    buf[sk & (ax < 3.0)] = SKIN[1]
    buf[sk & (ax >= 3.0) & (ax < 5.5) & V.CHECK] = SKIN[1]
    ym = np.mod(Y, 24.0)
    buf[sk & (ax < 2.4) & (ym > 3) & (ym < 8)] = SKIN[3]                     # the vertebrae's little bumps
    buf[sk & (ax < 1.4) & (ym > 4) & (ym < 6.5)] = SKIN[4]
    blade = (((ax - 128) / 52.0) ** 2 + ((Y - 150) / 78.0) ** 2) <= 1
    buf[sk & blade & V.CHECK] = SKIN[3]
    buf[sk & V.edge(blade) & (ax < 128)] = SKIN[1]
    buf[sk & (ax > hw - 14) & V.CHECK] = SKIN[1]
    buf[sk & (ax > hw - 7)] = SKIN[1]
    buf[sk & (ax > hw - 3)] = SKIN[0]
    for sets in (S.SPOTS, S.SPOTS2):
        for i, (sx, sy) in enumerate(sets):
            _spot(buf, v, t, sk, X, Y, sx, sy, i, sets is S.SPOTS)


def _spot(buf, v, t, sk, X, Y, sx, sy, i, first):
    r2 = (X - sx) ** 2 + (Y - sy) ** 2
    near = sk & (r2 < (S.R_OUT + 3) ** 2)
    if not near.any():
        return
    r = np.sqrt(r2)
    main_off = first and i == S.MAIN and t >= T.POP
    on = first and S.cup_on(t, i)
    # under a cup: the rim presses a ring, the skin inside rises (lighter, with a highlight toward the light)
    hidden = v.ycut is not None and sy + S.R_OUT * 0.3 < v.ycut
    if on and not hidden and S.cup_drop(t, i) is not None and S.cup_drop(t, i) < 2.0:
        d = S.dome_h(t, i)
        buf[near & (r > S.R_IN) & (r < S.R_OUT + 0.8)] = SKIN[1]
        if d > 0.3:
            k = min(1.0, d / 8.0)
            buf[near & (r < S.R_IN * (0.55 + 0.35 * k))] = SKIN[3]
            hl = ((X - (sx - 6)) ** 2 + (Y - (sy + 6)) ** 2) < (2.0 + 4.0 * k) ** 2
            buf[near & hl] = SKIN[4]
            buf[near & (r > S.R_IN * 0.8) & (r < S.R_IN) & V.CHECK] = SKIN[1]
        pd = S.pool_d(t, i) if t < T.POP or i != S.MAIN else 0.0
        if pd > 0.2:
            rp = S.R_IN * np.sqrt(max(0.0, 1 - (min(pd, d * 0.95) / max(d, 0.01)) ** (1 / 1.5))) if d > 0.3 else \
                S.R_IN - pd
            rp = min(rp, S.R_IN - 1.2)
            ringm = near & (r >= rp) & (r < S.R_IN)
            buf[ringm] = BLOOD[1]
            buf[ringm & (X < sx) & (Y > sy) & (r < rp + 1.2)] = BLOOD[3]
            buf[ringm & (r > S.R_IN - 0.9)] = BLOOD[0]
    # the cupping mark, once the main cup is off
    if main_off:
        k = S.mark_k(t)
        m = near & (r < S.R_OUT + 0.6)
        if k > 0.05:
            buf[m & (V.CHECK if k < 0.5 else True)] = MARK[1]
            buf[m & (r < S.R_IN * 0.55) & V.CHECK] = MARK[2]
            buf[m & (r > S.R_IN - 0.4)] = MARK[0]
            pet = m & (V.hash01(np.floor(X * 1.5), np.floor(Y * 1.5)) < 0.06) & (r < S.R_IN - 1)
            buf[pet] = MARK[0]
    # the marker ring on the chosen spot and the tiny openings
    if not main_off:
        buf[near & (r > 2.3) & (r < 3.3)] = MARKER
    if first and S.tapped(t, i):
        for dx in S.PUNCT:
            buf[near & ((X - sx - dx) ** 2 + (Y - sy) ** 2 < 0.55 ** 2)] = BLOOD[0]
    # left-over blood after the cup comes off, until the gauze wipes it away
    if main_off:
        for dx, dy, rr in RESIDUAL:
            if wiped(t, sx + dx, sy + dy):
                continue
            drop = near & ((X - sx - dx) ** 2 + (Y - sy - dy) ** 2 < rr * rr)
            buf[drop] = BLOOD[1]
            buf[drop & (X < sx + dx - rr * 0.2) & (Y > sy + dy + rr * 0.2)] = BLOOD[3]

