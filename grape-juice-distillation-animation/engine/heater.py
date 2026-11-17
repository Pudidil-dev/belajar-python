"""The heating mantle, outside and in x-ray.

Outside: a grey case with a dial, a red indicator and a power cord; a fabric bowl hugs the flask's round bottom.
Inside (x-ray): an insulated case, a glass-fibre bowl with a resistance-wire coil running through it, and a small
regulator behind the dial. When the dial clicks on, current runs from the cord through the regulator into the coil
(yellow dots), the wire heats from dark red to orange, and heat soaks through the bowl and the glass into the juice
(amber arcs: a visual cue only). It is electric: there is no flame anywhere.

The x-ray is a scan line that slices the case open from the top down, and closes it again from the bottom up.
"""
import math
import numpy as np
from . import world as Wd
from .world import circle, rect, band, edge, ring, CHECK, dot
from . import timeline as T
from . import rig as R
from .palette import (OUTLINE, WHITE, GLASS, MANTLE, LED_OFF, LED_ON, GLOW, METAL, HOSE, AMBER, FABRIC, ELEC, NAVY)

BOWL_IN, BOWL_OUT = 1.0, 6.5           # the fabric bowl, measured outward from the flask's surface
COIL_LO, COIL_HI = 2.4, 5.0            # the coil zigzags between these depths inside the bowl
TH0, TH1 = math.radians(-148), math.radians(-32)
N_ZIG = 13


# ---------------------------------------------------------------- states over time
def dial(t):
    """The dial's setting (0 off .. 1 full); it clicks round to about three quarters, and back to off at the end."""
    on = 0.72 * T.back_out(T.u_of(t, (T.SWITCH, T.SWITCH + 0.22)), 2.0)
    return on * (1 - T.back_out(T.u_of(t, (T.HEAT_OFF, T.HEAT_OFF + 0.22)), 2.0))


def coil_heat(t):
    return T.smooth(T.u_of(t, T.GLOW)) * (1 - T.smooth(T.u_of(t, (T.HEAT_OFF, T.HEAT_OFF + 1.5))))


def is_on(t):
    return T.SWITCH <= t < T.HEAT_OFF


def xray_line(t):
    """World y of the scan line (the case is in x-ray above it), or None when there is no x-ray."""
    if T.XRAY_ON[0] <= t < T.XRAY_OFF[0]:
        return 53.0 - 56.0 * T.smooth(T.u_of(t, T.XRAY_ON))
    if T.XRAY_OFF[0] <= t < T.XRAY_OFF[1]:
        return -3.0 + 56.0 * T.smooth(T.u_of(t, T.XRAY_OFF))
    return None


# ---------------------------------------------------------------- geometry
def _paths():
    """World polylines: the cord, the coil, the two leads, and the whole current path (for the moving dots)."""
    mx, (fx, fy), rf = R.MX, R.F_HOME, R.R_F
    cord_out = [(-260.0, 1.6), (mx - 66, 1.6), (mx - 58, 4.0), (mx - 51, 9.0), (mx - 44, 12.0)]
    cord_in = [(mx - 44, 12.0), (mx - 37, 15.0), (mx - 33, 20.0)]
    coil = []
    for i in range(2 * N_ZIG + 1):
        th = TH0 + (TH1 - TH0) * i / (2 * N_ZIG)
        r = rf + (COIL_LO if i % 2 == 0 else COIL_HI)
        coil.append((fx + r * math.cos(th), fy + r * math.sin(th)))
    lead_l = [(mx - 25, 30.0), (mx - 31, 38.0), coil[0]]
    lead_r = [coil[-1], (mx + 39, 40.0), (mx + 39, 7.0), (mx - 20, 7.0), (mx - 25, 14.0)]
    current = cord_out[1:] + cord_in[1:] + lead_l + coil[1:] + lead_r[1:]
    return cord_out, cord_in, coil, lead_l, lead_r, current


_CACHE = {}


def paths():
    if 'p' not in _CACHE:
        _CACHE['p'] = _paths()
    return _CACHE['p']


def _poly_mask(c, pts, w):
    m = np.zeros((Wd.H, Wd.W), bool)
    for (a, b) in zip(pts[:-1], pts[1:]):
        d = (b[0] - a[0], b[1] - a[1])
        L = math.hypot(*d)
        if L < 1e-6:
            continue
        m |= Wd.full(band(c, a, (d[0] / L, d[1] / L), -w, L + w, w))
    return m


def body_mask(c):
    mx, (fx, fy), rf = R.MX, R.F_HOME, R.R_F
    body = rect(c, mx - 44, mx + 44, 0.0, 52.0) & ~circle(c, fx, fy, rf + 1.0)
    body &= ~(rect(c, mx - 44, mx - 40, 46, 52) | rect(c, mx + 40, mx + 44, 46, 52))
    return Wd.full(body)


# ---------------------------------------------------------------- drawing
def draw_cord(buf, c, t):
    """The power cord, from the case's left side down to the bench and away to the wall socket."""
    w = max(1.3, 0.8 / c.s)
    m = _poly_mask(c, paths()[0], w)
    buf[m] = HOSE[1]
    buf[m & _poly_mask(c, paths()[0], w * 0.35)] = HOSE[2]
    buf[edge(m)] = OUTLINE


def draw_mantle(buf, c, t):
    mx, (fx, fy), rf = R.MX, R.F_HOME, R.R_F
    h = coil_heat(t)
    body = body_mask(c)
    line = xray_line(t)
    xr = Wd.full(c.Y > line) if line is not None else np.zeros_like(body)
    # ---- outside view
    out = body & ~xr
    buf[out] = MANTLE[1]
    buf[out & Wd.full(c.Y > 44)] = MANTLE[2]
    buf[out & Wd.full(c.Y < 6)] = MANTLE[0]
    lining = Wd.full(circle(c, fx, fy, rf + 4.0) & ~circle(c, fx, fy, rf + 1.0) & (c.Y < 52)) & ~xr
    if h > 0:
        buf[lining] = GLOW[0]
        buf[lining & CHECK] = GLOW[1] if h < 0.7 else GLOW[2]
    else:
        buf[lining] = MANTLE[0]
    # ---- x-ray view: cut case, insulation, the fabric bowl, the coil, the regulator, the leads, current
    if xr.any():
        inside = body & xr
        shell = inside & ~Wd.full(rect(c, mx - 41, mx + 41, 3.0, 60.0))
        bowl = Wd.full(circle(c, fx, fy, rf + BOWL_OUT) & ~circle(c, fx, fy, rf + BOWL_IN)) & inside
        wool = inside & ~shell & ~bowl
        buf[wool] = MANTLE[0]
        buf[wool & CHECK & Wd.full(((c.X * 0.7 + c.Y * 1.3) * c.s) % 5.0 < 1.6)] = MANTLE[2]   # insulation
        hatch = Wd.full((((c.X + c.Y) * c.s) % 4.0) < 1.0)
        buf[shell] = METAL[2]
        buf[shell & hatch] = METAL[3]
        buf[bowl] = FABRIC[1]
        buf[bowl & CHECK] = FABRIC[2] if h < 0.5 else FABRIC[0]
        if h > 0:                                          # the bowl warms next to the wire
            warm = Wd.full(circle(c, fx, fy, rf + COIL_HI + 1.2) & ~circle(c, fx, fy, rf + COIL_LO - 1.2)) & bowl
            buf[warm & CHECK] = GLOW[0] if h < 0.6 else GLOW[1]
        # the regulator behind the dial
        reg = Wd.full(rect(c, mx - 33, mx - 17, 14.0, 30.0)) & xr
        buf[reg] = METAL[1]
        buf[reg & Wd.full(rect(c, mx - 30, mx - 20, 24.0, 25.2))] = GLOW[0] if t < T.SWITCH else GLOW[2]
        buf[edge(reg)] = METAL[3]
        cord_out, cord_in, coil, lead_l, lead_r, current = paths()
        wl = max(0.45, 0.7 / c.s)
        for pts in (cord_in, lead_l, lead_r):
            buf[_poly_mask(c, pts, wl) & xr] = METAL[3]
        # the coil: dark copper when cold, then dull red, orange, with a flicker that walks along the wire
        cw = max(0.55, 0.9 / c.s)
        ta = T.anim(t)
        for i, (a, b) in enumerate(zip(coil[:-1], coil[1:])):
            seg = _poly_mask(c, [a, b], cw) & xr
            if h <= 0:
                col = GLOW[0]
            elif h < 0.5:
                col = GLOW[1] if (i + int(ta * 15)) % 4 else GLOW[0]
            else:
                col = GLOW[2] if (i + int(ta * 15)) % 3 else AMBER[2] if h > 0.9 else GLOW[1]
            buf[seg] = col
        buf[edge(inside) & ~Wd.full(c.Y < 0.4)] = GLASS[2]           # the x-ray outline of the case
        # current: yellow dots running cord -> regulator -> coil -> back
        if is_on(t):
            _current_dots(buf, c, t, current, xr)
    else:
        buf[edge(body)] = OUTLINE
    # the scan line itself
    if line is not None and -2.5 < line < 52.5:
        y0 = int(round(c.to(0, line)[1]))
        x0 = int(max(0, math.floor(c.to(mx - 50, 0)[0])))
        x1 = int(min(Wd.W, math.ceil(c.to(mx + 50, 0)[0])))
        if 0 <= y0 < Wd.H and x1 > x0:
            buf[y0, x0:x1] = WHITE
            if y0 + 1 < Wd.H:
                buf[y0 + 1, x0:x1][CHECK[y0 + 1, x0:x1]] = GLASS[3]
            if y0 - 1 >= 0:
                buf[y0 - 1, x0:x1][CHECK[y0 - 1, x0:x1]] = GLASS[3]
    if line is None or xr.sum() < body.sum():
        buf[edge(body) & ~xr] = OUTLINE
    # front panel: dial, indicator light, vents (on top of both views)
    dm = circle(c, mx - 25, 22.0, 6.0)
    buf[Wd.full(dm)] = MANTLE[3]
    buf[edge(dm)] = OUTLINE
    if c.s >= 1.6:
        ang = math.radians(130 - 210 * dial(t))
        k = band(c, (mx - 25, 22.0), (math.cos(ang), math.sin(ang)), 0, 5.0, 0.6)
        buf[Wd.full(k)] = MANTLE[0]
    led = circle(c, mx + 24, 24.0, 2.6)
    on = is_on(t)
    buf[Wd.full(led)] = LED_ON if on else LED_OFF
    if on:
        buf[Wd.full(circle(c, mx + 23.2, 24.8, 0.9))] = WHITE
    buf[edge(led)] = OUTLINE
    if c.s >= 1.4:
        for k in range(3):
            v = rect(c, mx + 8, mx + 34, 10.0 + k * 4.0, 11.4 + k * 4.0)
            buf[Wd.full(v)] = MANTLE[0]


def _current_dots(buf, c, t, pts, xr):
    seg = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts[:-1], pts[1:])]
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    total = cum[-1]
    ta = T.anim(t)
    speed, gap = 34.0, 7.0
    size = 3 if c.s >= 2.6 else 2
    for k in range(int(total / gap) + 1):
        d = (k * gap + speed * (ta - T.SWITCH)) % total
        i = int(np.searchsorted(cum, d, 'right') - 1)
        i = min(max(i, 0), len(seg) - 1)
        u = (d - cum[i]) / max(seg[i], 1e-9)
        x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u
        y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u
        px, py = c.to(x, y)
        ix, iy = int(px), int(py)
        if 0 <= ix < Wd.W and 0 <= iy < Wd.H and xr[iy, ix]:
            dot(buf, px, py, ELEC, size)


def draw_heat_in(buf, c, t):
    """Heat soaking from the hot bowl through the glass into the juice: amber arcs moving inward (a cue only)."""
    if not (T.HEAT_IN[0] <= t < T.HEAT_IN[1] + 0.4):
        return
    (fx, fy), rf = R.flask_pos(t), R.R_F
    ta = T.anim(t)
    X, Y = Wd.full(c.X), Wd.full(c.Y)
    rr = np.hypot(X - fx, Y - fy)
    th = np.arctan2(Y - fy, X - fx)
    span = (th > math.radians(-150)) & (th < math.radians(-30))
    end_fade = 1.0 - T.clamp01((t - T.HEAT_IN[1]) / 0.4)
    for k in range(3):
        ph = ((ta - T.HEAT_IN[0]) / 0.75 + k / 3.0) % 1.0
        if (ta - T.HEAT_IN[0]) / 0.75 + k / 3.0 < 1.0 and k > 0:
            continue                                          # the waves start one after another
        r = rf + 5.0 - 20.0 * ph
        ring_m = span & (np.abs(rr - r) <= max(0.7, 0.9 / c.s))
        core = span & (np.abs(rr - r) <= max(0.25, 0.45 / c.s))
        if ph > 0.65 or end_fade < 0.6:
            ring_m &= CHECK
        buf[ring_m] = AMBER[1]
        buf[core & ~Wd.full(ph > 0.65)] = AMBER[2]
