"""The test tube, its liquid, and the gloved hand that holds it.

The liquid is drawn per pixel in the tube's own frame (u across the axis, v up from the inside of the round bottom):
a dense red layer under a light yellow one. When the tube orbits, the whole liquid turns: a vortex funnel opens (the
liquid climbs the wall and dips in the middle) and the boundary between the layers is wound into helical bands. The
bands get thinner and thinner (seen from the side, a helix on a cylinder is an S-shaped stripe); once they are finer
than a pixel they blend, and the liquid reads orange. Close up, the dyes show as particles that wander across the
bands: that is the mixing itself, red and yellow side by side everywhere.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from .palette import OUTLINE, WHITE, GLASS, RED, YELLOW, MIXED, GLOVE

RI, RO = 7.0, 8.0          # inner / outer radius (mm): a 16 mm test tube
LEN = 100.0
H0 = 36.0                  # liquid height at rest (above the inside of the bottom)
VI = 18.0                  # the boundary between the red and the yellow layer
PIVOT = 78.0               # the hand holds the tube here; below it the tube follows the cup's orbit
_LUT = np.array([RED, YELLOW, MIXED], np.uint8)                     # [kind][shade] -> colour


class TubeCam:
    """A camera expressed in the tube's own frame. The tube's outside bottom is at (x + ox, yb); ox (the cup's orbit)
    fades to nothing at the hand, so the tube pivots in the fingers."""

    def __init__(self, cam, x, yb, ox=0.0):
        self.cam, self.x, self.yb, self.ox, self.s = cam, x, yb, ox, cam.s
        V = cam.Y - (yb + 1.0)
        self.w = np.clip(1 - V / PIVOT, 0, 1)
        self.U = cam.X - x - ox * self.w
        self.V = np.broadcast_to(V, self.U.shape)

    def to(self, u, v):
        w = max(0.0, 1 - v / PIVOT)
        return self.cam.to(self.x + u + self.ox * w, self.yb + 1.0 + v)


def _inner(U, V):
    return np.where(V >= RI, np.abs(U) <= RI, U * U + (V - RI) ** 2 <= RI * RI) & (V <= LEN - 1)


def _outer(U, V):
    return np.where(V >= RI, np.abs(U) <= RO, U * U + (V - RI) ** 2 <= RO * RO) & (V <= LEN - 1)


def state(t):
    """(mix, funnel depth mm, surface tilt mm, swirl turns) at time t."""
    D = 34.0 * T.vortex(t)
    tilt = 5.0 * T.slosh(t)
    if T.MOTOR_ON <= t < T.VORTEX_FORM[0] + 0.6:                 # the first wobble as the orbit starts
        tilt += 1.6 * math.sin(2 * math.pi * T.turns(t)) * T.smooth(T.u_of(t, (T.MOTOR_ON, T.MOTOR_ON + 0.2)))
    return T.mix(t), D, tilt, T.swirl(t)


def zone(m):
    """The swirled zone around the boundary (half-thickness Z, mm) and the period P (mm) of the bands in it: at rest
    there is no zone (a clean boundary); the vortex winds it into more and more, thinner and thinner bands."""
    Z = H0 * min(1.0, 1.25 * m)
    n = 1.0 + 32.0 * m * m
    return Z, max(2 * Z / n, 0.05)


def orange_k(m):
    """How much of the liquid already reads orange (the bands finer than the eye can see)."""
    return T.smooth((m - 0.88) / 0.12)


def _liquid(buf, tc, m, D, tilt, ph, t, particles=True, diff=0.0):
    U, V, s = tc.U, tc.V, tc.s
    inner = _inner(U, V)
    top = H0 + 0.33 * D
    zw = top + tilt * np.clip(U / RI, -1, 1)
    liq = inner & (V <= zw)
    if not liq.any():
        return liq
    px = 1.0 / s
    # where the dyes are: the boundary bows with the turning liquid, then winds into helical bands
    Ve = V - 0.25 * D * ((U / RI) ** 2 - 0.5)
    Z, P = zone(m)
    q = (Ve - VI) / P - np.arcsin(np.clip(U / RI, -1, 1)) / (2 * math.pi) - ph
    bay = gfx.BAYER[:gfx.H, :gfx.W]
    bay2 = np.roll(bay, (2, 1), axis=(0, 1))
    band_px = s * P / 2.0
    b_mix = T.clamp01((3.0 - band_px) / 2.0)
    striped = np.where(bay < b_mix, bay2 < 0.5, (q % 1.0) < 0.5)
    red = np.where(np.abs(Ve - VI) < Z, striped, Ve < VI)
    if diff > 0:                                               # left alone: the boundary only blurs (diffusion)
        red = bay2 < 0.5 * (1 - np.tanh((Ve - VI) / diff))
    k_or = orange_k(m)
    kind = np.where(bay < k_or, 2, np.where(red, 0, 1))
    # shading: lit from the left through the glass, darker on the right and at the bottom
    shade = np.full(U.shape, 2, np.int8)
    shade[(U < -0.55 * RI) & Wd.CHECK] = 3
    shade[U > 0.62 * RI] = 1
    shade[V < 2.5] = 1
    if D > 0.3:
        z_tip = top - D
        fr = np.clip((V - z_tip) / max(top - z_tip, 1e-6), 0, 1)
        rf = RI * fr ** 1.7
        core = (V >= z_tip) & (np.abs(U) < rf)
        shade[core] = 3                                        # you look through less liquid in the funnel
        edge = (V >= z_tip) & (np.abs(np.abs(U) - rf) < 1.1 * px) & (V < top - 0.5)
    shade[zw - V < 1.2 * px] = 3                               # the meniscus catches the light
    paint = liq
    if D > 0.3:
        paint = liq & ~(core & Wd.CHECK)                        # the funnel is half see-through
    k, sh = kind[paint], shade[paint]
    buf[paint] = _LUT[k, sh]
    if D > 0.3:
        buf[liq & edge] = WHITE                                 # the funnel's walls catch the light
    if particles and s >= 14:
        _particles(buf, tc, m, ph, t)
    return liq


_rng = np.random.default_rng(5)
_NP = 1500
_P_R = _rng.uniform(0.0, 1.0, _NP) ** 0.5          # radius fraction (uniform over the cross-section)
_P_A = _rng.uniform(0, 2 * math.pi, _NP)
_P_V = _rng.uniform(0.6, H0 - 0.6, _NP)
_P_T = _rng.uniform(0.6, H0 - 0.6, _NP)
_P_J = _rng.normal(0, 1, _NP)
_P_H = _rng.uniform(0, 1, _NP)


def _particles(buf, tc, m, ph, t):
    """Dye particles, close up: each sits in its band, and as the bands thin out they wander across them."""
    s = tc.s
    k_show = T.clamp01((s - 14.0) / 10.0)
    size = max(1, int(round(0.17 * s)))
    a = _P_A + 2 * math.pi * ph * (0.85 + 0.3 * _P_R)
    front = np.cos(a) > -0.15
    u = _P_R * (RI - 0.4) * np.sin(a)
    v = _P_V + (_P_T - _P_V) * m ** 1.4 + 0.25 * np.sin(a * 2 + _P_J)
    Z, Pp = zone(m)
    ve = v + 0.9 * m * _P_J                                    # dye wanders across the thin bands (it diffuses)
    qq = (ve - VI) / Pp - np.arcsin(np.clip(u / RI, -1, 1)) / (2 * math.pi) - ph
    is_red = np.where(np.abs(ve - VI) < Z, (qq % 1.0) < 0.5, ve < VI)
    W_, H_ = gfx.W, gfx.H
    for i in np.nonzero(front & (_P_H < k_show))[0]:
        x, y = tc.to(u[i], v[i])
        if not (-size <= x < W_ + size and -size <= y < H_ + size):
            continue
        col = RED if is_red[i] else YELLOW
        x0, y0 = int(round(x - size / 2)), int(round(y - size / 2))
        xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + size, W_), min(y0 + size, H_)
        if xb <= xa or yb <= ya:
            continue
        if size >= 4:
            buf[ya:yb, xa:xb] = col[0]
            ia, ib = max(x0 + 1, 0), min(x0 + size - 1, W_)
            ja, jb = max(y0 + 1, 0), min(y0 + size - 1, H_)
            if ib > ia and jb > ja:
                buf[ja:jb, ia:ib] = col[2]
            for cx_, cy_ in ((x0, y0), (x0 + size - 1, y0), (x0, y0 + size - 1), (x0 + size - 1, y0 + size - 1)):
                if 0 <= cx_ < W_ and 0 <= cy_ < H_:
                    buf[cy_, cx_] = col[1] if (cy_ > y0) else col[1]
            if 0 <= y0 + 1 < H_ and 0 <= x0 + 1 < W_:
                buf[y0 + 1, x0 + 1] = col[3]
        else:
            buf[ya:yb, xa:xb] = col[2] if size > 1 else col[1]


def _glass(buf, tc, behind=False):
    U, V, s = tc.U, tc.V, tc.s
    outer, inner = _outer(U, V), _inner(U, V)
    wall = outer & ~inner
    lip = (V >= LEN - 4) & (V <= LEN - 1) & (np.abs(U) <= RO + 0.7)
    buf[wall & Wd.CHECK] = GLASS[2]
    buf[lip] = GLASS[2]
    buf[lip & (V >= LEN - 2.2)] = GLASS[3]
    buf[Wd.edge(outer | lip)] = GLASS[1]
    px = 1.0 / s
    streak = (U > -RI + 0.9) & (U < -RI + 0.9 + max(0.55, 1.05 * px)) & (V > 8) & (V < LEN - 9)
    buf[streak] = WHITE
    spot = (np.abs(U - (RI - 2.0)) < max(0.5, px)) & (V > LEN - 30) & (V < LEN - 22)
    buf[spot & Wd.CHECK] = WHITE


def _palm(buf, tc):
    c = tc
    palm = (((c.U - 5.5) / 12.5) ** 2 + ((c.V - 81) / 13.0) ** 2 <= 1)
    al = (c.U - 12) * 0.56 + (c.V - 88) * 0.83
    ac = -(c.U - 12) * 0.83 + (c.V - 88) * 0.56
    wrist = (al >= 0) & (al <= 34) & (np.abs(ac) <= 9.0)
    cuff = (al >= 27) & (al <= 34) & (np.abs(ac) <= 10.0)
    m = palm | wrist | cuff
    buf[m] = GLOVE[1]
    buf[m & (c.U < 4) & (c.V > 86)] = GLOVE[2]
    buf[m & (c.U > 14) & (c.V < 82) & Wd.CHECK] = GLOVE[0]
    buf[cuff] = GLOVE[2]
    buf[cuff & (ac < -5)] = GLOVE[1]
    buf[Wd.edge(m)] = OUTLINE


def _fingers(buf, tc):
    c = tc
    m = np.zeros(c.U.shape, bool)
    tips = np.zeros(c.U.shape, bool)
    for k in range(4):
        v0 = 70.0 + 5.0 * k
        f = (c.U >= -2.6) & (c.U <= RO + 3.6) & (c.V >= v0) & (c.V <= v0 + 4.4)
        tip = ((c.U + 2.6) / 2.2) ** 2 + ((c.V - v0 - 2.2) / 2.2) ** 2 <= 1
        m |= f | tip
        tips |= tip
        buf[Wd.full(f | tip)] = GLOVE[1]
        buf[Wd.full((f | tip) & (c.V >= v0 + 3.3))] = GLOVE[2]
    thumb = ((c.U + RI + 1.2) / 3.4) ** 2 + ((c.V - 84) / 7.0) ** 2 <= 1
    buf[Wd.full(thumb)] = GLOVE[1]
    buf[Wd.full(thumb & (c.U < -RI - 1.6))] = GLOVE[2]
    m |= thumb
    buf[Wd.edge(m)] = OUTLINE
    for k in range(1, 4):                                        # the creases between the fingers
        v0 = 70.0 + 5.0 * k
        buf[Wd.full((c.U >= -1.0) & (c.U <= RO + 3.0) & (np.abs(c.V - v0) < 0.55 / c.s + 0.12))] = GLOVE[0]


def draw(buf, cam, t, x=0.0, yb=82.0, ox=0.0, st=None, hand=True, particles=True, diff=0.0):
    """The main tube at (x, yb) (its outside bottom), the cup's orbit ox, the liquid state st (from state(t)).
    Returns the TubeCam (for labels)."""
    tc = TubeCam(cam, x, yb, ox)
    if st is None:
        st = state(t)
    m, D, tilt, ph = st
    if hand:
        _palm(buf, tc)
    _liquid(buf, tc, m, D, tilt, ph, t, particles, diff)
    _glass(buf, tc)
    if hand:
        _fingers(buf, tc)
    return tc


def draw_small(buf, cam, x, yb, kind):
    """A tube standing in the rack: two still layers, or already mixed, or empty (kind None)."""
    tc = TubeCam(cam, x, yb, 0.0)
    if kind is not None:
        inner = _inner(tc.U, tc.V)
        liq = inner & (tc.V <= H0)
        if kind == 'mixed':
            buf[liq] = MIXED[2]
            buf[liq & (tc.U > 0.6 * RI)] = MIXED[1]
        else:
            buf[liq & (tc.V < VI)] = RED[2]
            buf[liq & (tc.V >= VI)] = YELLOW[2]
            buf[liq & (tc.U > 0.6 * RI) & (tc.V < VI)] = RED[1]
            buf[liq & (tc.U > 0.6 * RI) & (tc.V >= VI)] = YELLOW[1]
        buf[liq & (H0 - tc.V < 1.2 / tc.s)] = (MIXED if kind == 'mixed' else YELLOW)[3]
    _glass(buf, tc)
    return tc
