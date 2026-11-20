"""The things the practitioner handles, in teal nitrile gloves: a lancet pen, a hand vacuum pump with a clear hose, a
gauze pad, and (in the side view) a hand on the cup's valve.

They are drawn in canvas pixels from world anchors, so they keep their 8-bit look at any zoom: simple solid shapes,
1-px dark outlines, a highlight on the lit side.
"""
import math
import numpy as np
from . import view as V
from . import state as S
from . import timeline as T
from .back import wipe_pos
from .palette import GLOVE, STEEL, ORANGE, PUMP, HOSE, GAUZE, OUTLINE, WHITE, GLASS


def _fill(buf, m, col, line=OUTLINE):
    m = V.full(m)
    buf[m] = col
    if line is not None:
        buf[V.edge(m)] = line


# ---------------------------------------------------------------- the lancet (top view)
def lancet_state(tau, spots):
    """Plane position of the lancet tip and how hard it is pressed (0..1), or None when it is not on screen.
    tau is time relative to the opening (it runs into negative values for the loop's last half-second)."""
    sx0, sy0 = spots[0]
    start = (sx0 + 120.0, sy0 + 70.0)
    if tau < T.LANCET_IN[0] or tau >= T.LANCET_OUT[1]:
        return None
    taps = T.TAPS
    if tau < taps[0] - 0.12:
        u = T.ease_out(T.u_of(tau, (T.LANCET_IN[0], taps[0] - 0.12)), 2.2)
        return (T.lerp(start[0], sx0 + 2, u), T.lerp(start[1], sy0 + 4, u)), 0.0
    for i in range(len(taps)):
        t0 = taps[i]
        sx, sy = spots[i]
        if tau < t0 + 0.12:
            press = max(0.0, 1 - abs(tau - t0) / 0.07)
            return (sx + 2 * (1 - press), sy + 4 * (1 - press)), press
        if i + 1 < len(taps) and tau < taps[i + 1] - 0.12:
            nx, ny = spots[i + 1]
            u = T.ease_in_out(T.u_of(tau, (t0 + 0.12, taps[i + 1] - 0.12)), 2.0)
            return (T.lerp(sx, nx, u) + 2, T.lerp(sy, ny, u) + 4 + 6 * math.sin(math.pi * u)), 0.0
    sx, sy = spots[-1]
    u = T.ease_in(T.u_of(tau, (taps[-1] + 0.12, T.LANCET_OUT[1])), 1.8)
    return (T.lerp(sx + 2, sx + 170, u), T.lerp(sy + 4, sy + 60, u)), 0.0


def draw_lancet(buf, v, t):
    for tau, spots in ((t, S.SPOTS), (t - T.TOTAL, S.SPOTS2)):
        st = lancet_state(tau, spots)
        if st is None:
            continue
        (x, y), press = st
        tx, ty = v.to(x, y, 0)
        sc = v.s * (1.06 - 0.12 * press)
        ang = math.radians(-32)                              # the pen points down-left; its back end is up-right
        dx, dy = math.cos(ang), math.sin(ang)

        def P(d, o=0.0):
            return tx + (dx * d - dy * o) * sc, ty + (dy * d + dx * o) * sc
        body = V.poly([P(5, -4.2), P(52, -4.6), P(52, 4.6), P(5, 4.2)])
        cone = V.poly([P(1.2, -0.8), P(5.2, -4.2), P(5.2, 4.2), P(1.2, 0.8)])
        needle = V.seg(*P(0.0), *P(1.6), max(1.0, 0.5 * sc))
        button = V.poly([P(52, -3.0), P(58, -3.0), P(58, 3.0), P(52, 3.0)])
        _fill(buf, needle, STEEL[2], None)
        _fill(buf, cone, STEEL[1])
        _fill(buf, body, GAUZE[2])
        buf[V.full(V.poly([P(6, -4.2), P(51, -4.6), P(51, -2.0), P(6, -1.8)]))] = GAUZE[0]
        _fill(buf, button, ORANGE[1])
        # the gloved hand around the pen
        hx, hy = P(40, 1.0)
        palm = V.ell(hx + 2 * sc, hy + 3 * sc, 9 * sc, 7.5 * sc)
        _fill(buf, palm, GLOVE[1])
        for k in range(3):
            fx, fy = P(30 + 4 * k, -5.5)
            f = V.ell(fx, fy, 2.4 * sc, 3.6 * sc)
            _fill(buf, f, GLOVE[1])
        thumb = V.ell(*P(28, 5.5), 2.6 * sc, 4.2 * sc)
        _fill(buf, thumb, GLOVE[2])
        buf[V.full(V.ell(hx - 2 * sc, hy, 3 * sc, 2 * sc))] = GLOVE[2]


# ---------------------------------------------------------------- the hand pump and hose (top view)
def pump_offset(t):
    """How far (mm) the pump is from its place to the right (it slides in and out)."""
    if t < T.PUMP_IN[0] or t >= T.PUMP_OUT[1]:
        return None
    if t < T.PUMP_IN[1]:
        return 130.0 * (1 - T.ease_out(T.u_of(t, T.PUMP_IN), 2.5))
    if t >= T.PUMP_OUT[0]:
        return 130.0 * T.ease_in(T.u_of(t, T.PUMP_OUT), 2.0)
    return 0.0


def squeeze(t):
    k = 0.0
    for p in T.PUMPS:
        if p <= t < p + 0.4:
            u = (t - p) / 0.4
            k = max(k, math.sin(math.pi * min(1.0, u / 0.7)) if u < 0.7 else 0.0)
    return k


PUMP_AT = (-14.0, 50.0)            # the pump's nozzle, relative to the main cup (above it, in the frame)


def hose_points(v, t):
    """Canvas points along the hose from the valve to the pump nozzle."""
    off = pump_offset(t)
    sx, sy = S.SPOTS[S.MAIN]
    nz = (sx + PUMP_AT[0], sy + PUMP_AT[1] + off)
    if t < T.HOSE_CLICK - 0.08:
        u = T.u_of(t, (T.PUMP_IN[0], T.HOSE_CLICK - 0.08))
        end = (sx - 10 * (1 - u), sy + 14 + 20 * (1 - u) + off * 0.6)
    elif t < T.HOSE_OFF:
        end = (sx, sy)
    else:
        u = T.u_of(t, (T.HOSE_OFF, T.HOSE_OFF + 0.2))
        end = (sx - 6 * u, sy + 12 * u + off * 0.6)
    ctrl = ((end[0] + nz[0]) / 2 - 16, (end[1] + nz[1]) / 2 + 2)
    pts = []
    for k in range(13):
        u = k / 12
        x = (1 - u) ** 2 * end[0] + 2 * (1 - u) * u * ctrl[0] + u * u * nz[0]
        y = (1 - u) ** 2 * end[1] + 2 * (1 - u) * u * ctrl[1] + u * u * nz[1]
        z = S.VCAP_Z1 * (1 - u) + 12 * u if T.HOSE_CLICK <= t < T.HOSE_OFF else 10.0
        pts.append(v.to(x, y, z))
    return pts


def draw_pump(buf, v, t):
    off = pump_offset(t)
    if off is None:
        return
    sx, sy = S.SPOTS[S.MAIN]
    pts = hose_points(v, t)
    w = 4.0 * v.s
    hose = V.polyline(pts, w)
    buf[hose] = HOSE[1]
    buf[V.polyline(pts, max(1.0, w * 0.3))] = HOSE[2]
    buf[V.edge(hose)] = HOSE[0]
    ex, ey = pts[0]
    _fill(buf, V.circ(ex, ey, 3.2 * v.s), STEEL[1])                           # the connector on the valve
    buf[V.full(V.circ(ex - v.s, ey - v.s, 1.0 * v.s))] = STEEL[2]

    def P(dx, dy):                                  # the pump lies along +x from its nozzle, grip pointing up
        return v.to(sx + PUMP_AT[0] + dx, sy + PUMP_AT[1] + off + dy, 12)
    barrel = V.poly([P(0, -7), P(46, -7), P(46, 7), P(0, 7)])
    nozzle = V.poly([P(-6, -3), P(0, -3), P(0, 3), P(-6, 3)])
    grip = V.poly([P(34, 6), P(46, 6), P(56, 34), P(44, 36)])
    k = squeeze(t)
    lever = V.poly([P(22 + 6 * k, 6), P(30 + 6 * k, 6), P(40 + 4 * k, 32), P(33 + 4 * k, 33)])
    gauge = V.circ(*P(14, 0), 5.2 * v.s)
    _fill(buf, grip, PUMP[1])
    _fill(buf, lever, ORANGE[1])
    _fill(buf, barrel, PUMP[2])
    buf[V.full(V.poly([P(1, 2.5), P(45, 2.5), P(45, 6), P(1, 6)]))] = PUMP[3]
    _fill(buf, nozzle, STEEL[1])
    _fill(buf, gauge, GAUZE[2])
    gx, gy = P(14, 0)
    ang = math.radians(150 - 120 * (1 - S.air(t)))
    buf[V.seg(gx, gy, gx + math.cos(ang) * 4.2 * v.s, gy - math.sin(ang) * 4.2 * v.s, max(1.0, 0.6 * v.s))] = ORANGE[0]
    # the gloved hand on the grip, fingers round the lever
    hx, hy = P(46, 24)
    _fill(buf, V.ell(hx, hy, 10 * v.s, 8 * v.s), GLOVE[1])
    for j in range(3):
        fx, fy = P(34 + 6 * k + 2 * j, 16 + 6 * j)
        _fill(buf, V.ell(fx, fy, 3.0 * v.s, 2.4 * v.s), GLOVE[1])
    buf[V.full(V.ell(hx - 3 * v.s, hy - 3 * v.s, 3.5 * v.s, 2.4 * v.s))] = GLOVE[2]


# ---------------------------------------------------------------- the gauze pad (angled top view)
def draw_gauze(buf, v, t):
    p = wipe_pos(t)
    if p is None:
        ins = T.u_of(t, (T.WIPE[0] - 0.3, T.WIPE[0]))
        out = T.u_of(t, (T.WIPE[1], T.WIPE[1] + 0.3))
        if 0 < ins < 1:
            p0 = wipe_pos(T.WIPE[0] + 1e-3)
            p = (p0[0] - 40 * (1 - ins), p0[1] + 30 * (1 - ins))
        elif 0 < out < 1:
            p0 = wipe_pos(T.WIPE[1] - 1e-3)
            p = (p0[0] - 40 * out, p0[1] + 30 * out)
        else:
            return
    x, y = p
    corners = [v.to(x - 7, y + 6, 0.5), v.to(x + 7, y + 6, 0.5), v.to(x + 7, y - 6, 0.5), v.to(x - 7, y - 6, 0.5)]
    pad = V.poly(corners)
    buf[V.full(pad)] = GAUZE[1]
    buf[V.full(pad) & V.CHECK & V.full(((V.XC.astype(int) // 2 + V.YC.astype(int) // 2) % 2) == 0)] = GAUZE[2]
    buf[V.edge(pad)] = GAUZE[0]
    hx, hy = v.to(x + 6, y + 9, 9)
    _fill(buf, V.ell(hx, hy, 9 * v.s, 7 * v.s * max(v.se, 0.6)), GLOVE[1])
    for j in range(3):
        _fill(buf, V.ell(hx - (6 - 2 * j) * v.s, hy + (4 + j) * v.s * 0.6, 2.6 * v.s, 2.2 * v.s), GLOVE[1])
    buf[V.full(V.ell(hx - 2 * v.s, hy - 2 * v.s, 3 * v.s, 2 * v.s))] = GLOVE[2]


# ---------------------------------------------------------------- a gloved hand in the side view
def side_hand(t):
    """(x, z) of the hand on the cut plane, and whether it is pinching the valve or holding the cup; or None."""
    sx, sy = S.SPOTS[S.MAIN]
    if t < T.VALVE[0] or t >= T.LIFT[1]:
        return None
    if t < T.VALVE[1]:
        u = T.ease_out(T.u_of(t, T.VALVE), 2.2)
        return (T.lerp(sx + 46, sx + 4, u), T.lerp(S.VCAP_Z1 + 30, S.VCAP_Z1 + 3, u)), 'valve'
    if t < T.GRIP[0]:
        pull = 2.0 * T.smooth(T.u_of(t, (T.PSSSH, T.PSSSH + 0.15)))
        return (sx + 4, S.VCAP_Z1 + 3 + pull), 'valve'
    if t < T.POP:
        u = T.ease_in_out(T.u_of(t, T.GRIP), 2.0)
        return (T.lerp(sx + 4, sx + S.R_OUT + 4, u), T.lerp(S.VCAP_Z1 + 5, 15, u)), 'cup'
    return (sx + S.R_OUT + 4, 15 + S.lift(t)), 'cup'


def draw_side_hand(buf, v, t):
    st = side_hand(t)
    if st is None or v.ZC is None:
        return
    (x, z), mode = st
    px, py = v.to(x, v.ycut, z)
    s = v.s
    if mode == 'valve':
        _fill(buf, V.ell(px + 9 * s, py - 6 * s, 9 * s, 6.5 * s), GLOVE[1])
        _fill(buf, V.ell(px + 1.5 * s, py - 1.5 * s, 3.2 * s, 2.0 * s), GLOVE[1])          # finger and thumb
        _fill(buf, V.ell(px + 1.5 * s, py + 1.6 * s, 3.2 * s, 1.8 * s), GLOVE[2])
        buf[V.full(V.ell(px + 7 * s, py - 8 * s, 3.5 * s, 2.0 * s))] = GLOVE[2]
    else:
        _fill(buf, V.ell(px + 6 * s, py, 6.5 * s, 9 * s), GLOVE[1])
        for j in range(3):
            _fill(buf, V.ell(px - 0.5 * s, py - (5 - 5 * j) * s, 2.6 * s, 2.2 * s), GLOVE[1])
        buf[V.full(V.ell(px + 4 * s, py - 4 * s, 2.4 * s, 3.2 * s))] = GLOVE[2]
