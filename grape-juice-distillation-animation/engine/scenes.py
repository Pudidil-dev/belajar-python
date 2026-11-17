"""What is on screen at time t: one world, one 2D camera (centre in mm, scale in px/mm), the grape, the game-feel
effects, and small clean captions that follow the objects they explain.

The beats are timing marks on one continuous camera that moves like a game camera: quick starts, a small overshoot,
whole-pixel scrolling, and a short screen shake on every impact. It follows the falling juice and the flask's hop onto
the heater, cuts on the neck as the still drops into place, pulls back, pushes onto the heater for the x-ray, rises
with the vapour, tracks into the condenser cutaway, studies one piece of inner wall, follows a drop to the receiver,
pulls back to both flasks and pushes in on the next hanging drop. That drop then fades into the grape (a dithered
opacity fade), so the last frame flows into the first. Flask on the left, receiver on the right, always.
"""
import math
import numpy as np
from . import gfx, rig, grape, fx, captions
from . import world as Wd
from . import timeline as T

W, H = gfx.W, gfx.H
S_GRAPE = T.MATCH_R / grape.RX
K0 = (grape.G[0], grape.G[1] - (H / 2 - T.MATCH_XY[1]) / S_GRAPE, S_GRAPE)
POUR1 = (grape.G[0], 108.0, 2.2)
POUR2 = (grape.G[0], 90.0, 1.8)
HOME = (rig.F_HOME[0], rig.F_HOME[1] + 4.0, 1.7)
NECK = (rig.F_HOME[0], rig.F_HOME[1] + rig.NECK_TOP - 6.0, 3.2)
WIDE = (12.0, 128.0, 1.0)
XR = (rig.MX, 50.0, 3.0)
SURF = (-55.0, 84.0, 3.0)
STILL = (-55.0, 168.0, 3.0)
INLET = (-20.0, 160.0, 3.0)
COND = (rig.p_on(85.0)[0], rig.p_on(85.0)[1], 1.55)
SEC = (rig.p_on(rig.SEC)[0], rig.p_on(rig.SEC)[1], 10.0)
RECV = (rig.TIP[0], 20.0, 2.6)
R_END = 3.0
S_END = T.MATCH_R / R_END

# screen shakes: (time, amplitude in canvas px, duration)
SHAKES = [(T.SQUASH[0] + 0.02, 2, 0.25), (T.PLIP1, 1, 0.2), (T.HOP_LAND, 2, 0.3), (T.PART_HEAD + 0.18, 1, 0.15),
          (T.PART_COND + 0.18, 1, 0.15), (T.PART_RECV + 0.18, 1, 0.15), (T.SWITCH, 1, 0.15), (T.BOIL, 1, 0.25),
          (T.PLIP2, 2, 0.3)]
_JIT = [(1, 0), (-1, 1), (1, -1), (0, 1), (-1, 0), (0, -1)]


def _mix(a, b, k):
    """Blend two camera states; the scale moves geometrically so zooms feel even."""
    return (T.lerp(a[0], b[0], k), T.lerp(a[1], b[1], k), a[2] * (b[2] / a[2]) ** k)


def _push_to(a, target_world, target_canvas, s_end, k):
    """A push-in that carries one world point to a chosen canvas point while the scale grows."""
    s = a[2] * (s_end / a[2]) ** k
    p0x = W / 2 + (target_world[0] - a[0]) * a[2]
    p0y = H / 2 - (target_world[1] - a[1]) * a[2]
    px = T.lerp(p0x, target_canvas[0], k)
    py = T.lerp(p0y, target_canvas[1], k)
    return (target_world[0] - (px - W / 2) / s, target_world[1] + (py - H / 2) / s, s)


def camera(t):
    if t < 0.45:
        return K0
    if t < 1.5:
        return _mix(K0, POUR1, T.ease_in_out(T.u_of(t, (0.45, 1.5)), 2.0))
    if t < T.HOP[0]:
        return _mix(POUR1, POUR2, T.ease_in_out(T.u_of(t, (1.5, 2.6)), 2.0))
    if t < T.NECK_PUSH[0]:                                   # follow the hop, landing a beat after the flask
        return _mix(POUR2, HOME, T.snap(T.u_of(t, (T.HOP[0] + 0.05, T.HOP[1] - 0.05))))
    if t < T.MATCH:
        return _mix(HOME, NECK, T.ease_in(T.u_of(t, T.NECK_PUSH), 1.6))
    if t < T.HEATER_PUSH[0]:                                 # the still head lands, then pull back to the route
        return _mix(NECK, WIDE, T.snap(T.u_of(t, (T.MATCH + 0.12, T.REVEAL[1]))))
    if t < T.XRAY_OFF[1]:
        return _mix(WIDE, XR, T.snap(T.u_of(t, T.HEATER_PUSH)))
    if t < T.TILT[0]:
        return _mix(XR, SURF, T.snap(T.u_of(t, T.SURFACE)))
    if t < T.TRACK[0]:
        return _mix(SURF, STILL, T.ease_in_out(T.u_of(t, T.TILT), 2.0))
    if t < T.CUT_ON[1]:
        return _mix(STILL, INLET, T.ease_in_out(T.u_of(t, T.TRACK), 2.0))
    if t < T.HEAT_PUSH[0]:
        return _mix(INLET, COND, T.snap(T.u_of(t, (T.CUT_ON[1], T.CUT_ON[1] + 0.7))))
    if t < T.FOLLOW[0]:
        return _mix(COND, SEC, T.snap(T.u_of(t, T.HEAT_PUSH)))
    if t < T.DROP_FALL[0]:
        x, y, r = rig.drop_track(t)
        k = T.ease_in_out(T.u_of(t, T.FOLLOW), 1.6)
        s = SEC[2] * (RECV[2] / SEC[2]) ** k
        lead = 0.25 * k
        fx_, fy_ = T.lerp(x, rig.TIP[0], lead), T.lerp(y, RECV[1], lead) - 6.0 * k
        w = T.smooth(T.u_of(t, (T.FOLLOW[0], T.FOLLOW[0] + 0.5)))      # ease from the section onto the drop
        return (T.lerp(SEC[0], fx_, w), T.lerp(SEC[1], fy_, w), s)
    if t < T.COMPARE[0]:
        k = T.ease_in_out(T.u_of(t, (T.DROP_FALL[0], T.PLIP2 + 0.2)), 2.0)
        x0, y0, r0 = rig.drop_track(T.DROP_FALL[0] - 1e-3)
        a = (T.lerp(x0, rig.TIP[0], 0.25), T.lerp(y0, RECV[1], 0.25) - 6.0, RECV[2])
        return _mix(a, RECV, k)
    if t < T.LOOP_PUSH[0]:
        return _mix(RECV, WIDE, T.snap(T.u_of(t, T.COMPARE)))
    x, y, r = rig.hanging_drop(t)
    k = T.ease_in_out(T.u_of(t, T.LOOP_PUSH), 2.2)
    return _push_to(WIDE, (x, y), T.MATCH_XY, S_END, k)


def shake(t):
    """Whole-pixel screen shake (canvas px) after impacts."""
    n = int(round(t * 30))
    dx = dy = 0
    for t0, amp, dur in SHAKES:
        if t0 <= t < t0 + dur:
            a = int(round(amp * (1 - (t - t0) / dur) + 0.49))
            jx, jy = _JIT[n % len(_JIT)]
            dx += a * jx
            dy += a * jy
    return dx, dy


def snapped(t):
    """The camera with whole-pixel scrolling (no sub-pixel shimmer when it pans) plus the shake."""
    cx, cy, s = camera(t)
    cx, cy = round(cx * s) / s, round(cy * s) / s
    dx, dy = shake(t)
    return cx - dx / s, cy + dy / s, s


def _world(t):
    c = Wd.Cam(*snapped(t))
    buf = np.empty((H, W, 3), np.uint8)
    rig.draw_rig(buf, c, t)
    if t < T.HOP[0] + 0.1:
        grape.draw_stream(buf, c, t)
        grape.draw_landing(buf, c, t)
        grape.draw_grape(buf, c, t)
    fx.draw(buf, c, t)
    return buf, c


def frame(t):
    buf, c = _world(t)
    if t >= T.DISSOLVE[0]:
        # the loop: the hanging drop fades into the grape through the ordered-dither pattern (an 8-bit opacity fade)
        a = T.u_of(t, T.DISSOLVE)
        start, _ = _world(t - T.TOTAL)
        m = gfx.BAYER[:H, :W] < a
        buf[m] = start[m]
    captions.draw(buf, c, t)
    captions.fast_forward(buf, t)
    return buf


def render(t, fps=30, scale=gfx.SCALE):
    return gfx.upscale(frame(t), scale)


def warm():
    pass
