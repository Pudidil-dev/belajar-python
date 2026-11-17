"""What is on screen at time t: one world, one 2D camera (centre in mm, scale in px/mm) and the grape on top.

The fourteen beats are timing marks on one continuous camera: it follows the falling juice, tracks the flask onto the
mantle, cuts on the neck to the assembled apparatus, pulls out, pushes in on the boiling surface, climbs with the vapour,
tracks into the condenser (which wipes into a cutaway from its rim), studies one piece of inner wall, follows a drop
out to the receiver, pulls back to both flasks and pushes in on the next hanging drop until it sits exactly where the
grape was. Flask on the left, receiver on the right, always.
"""
import math
import numpy as np
from . import gfx, rig, grape
from . import world as Wd
from . import timeline as T

W, H = gfx.W, gfx.H
S_GRAPE = T.MATCH_R / grape.RX
K0 = (grape.G[0], grape.G[1] - (H / 2 - T.MATCH_XY[1]) / S_GRAPE, S_GRAPE)
WIDE = (12.0, 128.0, 1.0)
SURF = (-55.0, 84.0, 3.0)
STILL = (-55.0, 168.0, 3.0)
INLET = (-20.0, 160.0, 3.0)
COND = (rig.p_on(85.0)[0], rig.p_on(85.0)[1], 1.55)
SEC = (rig.p_on(rig.SEC)[0], rig.p_on(rig.SEC)[1], 10.0)
RECV = (rig.TIP[0], 20.0, 2.6)
R_END = 3.0
S_END = T.MATCH_R / R_END


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
        k = T.ease_in_out(T.u_of(t, (0.45, 1.5)), 2.0)
        return _mix(K0, (grape.G[0], 96.0, 2.5), k)
    if t < T.MOVE[0]:
        k = T.ease_in_out(T.u_of(t, (1.5, 2.6)), 2.0)
        return _mix((grape.G[0], 96.0, 2.5), (grape.G[0], 68.0, 1.8), k)
    if t < T.NECK_PUSH[0]:
        fx, fy = rig.flask_pos(t)
        k = T.smooth(T.u_of(t, (T.MOVE[0], T.MOVE[0] + 0.3)))
        a = (grape.G[0], 68.0, 1.8)
        return _mix(a, (fx, fy + 4.0, 1.7), k)
    if t < T.MATCH:
        fx, fy = rig.flask_pos(t)
        k = T.ease_in(T.u_of(t, T.NECK_PUSH), 1.6)
        return _mix((fx, fy + 4.0, 1.7), (fx, fy + rig.NECK_TOP - 6.0, 3.2), k)
    neck = (rig.F_HOME[0], rig.F_HOME[1] + rig.NECK_TOP - 6.0, 3.2)
    if t < T.WIDE[0]:
        return _mix(neck, (-40.0, 176.0, 2.2), T.ease_in_out(T.u_of(t, T.REVEAL), 2.0))
    if t < T.SURFACE[0]:
        return _mix((-40.0, 176.0, 2.2), WIDE, T.ease_in_out(T.u_of(t, T.WIDE), 2.2))
    if t < T.TILT[0]:
        return _mix(WIDE, SURF, T.ease_in_out(T.u_of(t, T.SURFACE), 1.8))
    if t < T.TRACK[0]:
        return _mix(SURF, STILL, T.ease_in_out(T.u_of(t, T.TILT), 2.0))
    if t < T.CUT_ON[1]:
        return _mix(STILL, INLET, T.ease_in_out(T.u_of(t, T.TRACK), 2.0))
    if t < T.HEAT_PUSH[0]:
        return _mix(INLET, COND, T.ease_in_out(T.u_of(t, (T.CUT_ON[1], T.CUT_ON[1] + 0.7)), 2.2))
    if t < T.FOLLOW[0]:
        return _mix(COND, SEC, T.ease_in_out(T.u_of(t, T.HEAT_PUSH), 2.0))
    if t < T.DROP_FALL[0]:
        x, y, r = rig.drop_track(t)
        k = T.ease_in_out(T.u_of(t, T.FOLLOW), 1.6)
        s = SEC[2] * (RECV[2] / SEC[2]) ** k
        lead = 0.25 * k
        fx, fy = T.lerp(x, rig.TIP[0], lead), T.lerp(y, RECV[1], lead) - 6.0 * k
        w = T.smooth(T.u_of(t, (T.FOLLOW[0], T.FOLLOW[0] + 0.5)))      # ease from the section onto the drop
        return (T.lerp(SEC[0], fx, w), T.lerp(SEC[1], fy, w), s)
    if t < T.COMPARE[0]:
        k = T.ease_in_out(T.u_of(t, (T.DROP_FALL[0], T.PLIP2 + 0.2)), 2.0)
        x0, y0, r0 = rig.drop_track(T.DROP_FALL[0] - 1e-3)
        a = (T.lerp(x0, rig.TIP[0], 0.25), T.lerp(y0, RECV[1], 0.25) - 6.0, RECV[2])
        return _mix(a, RECV, k)
    if t < T.LOOP_PUSH[0]:
        return _mix(RECV, WIDE, T.ease_in_out(T.u_of(t, T.COMPARE), 2.2))
    x, y, r = rig.hanging_drop(t)
    k = T.ease_in_out(T.u_of(t, T.LOOP_PUSH), 2.6)
    kk = 1 - (1 - k) ** 1.0
    return _push_to(WIDE, (x, y), T.MATCH_XY, S_END, kk)


def frame(t):
    cx, cy, s = camera(t)
    c = Wd.Cam(cx, cy, s)
    buf = np.empty((H, W, 3), np.uint8)
    rig.draw_rig(buf, c, t)
    if t < T.MOVE[0] + 0.1:
        grape.draw_stream(buf, c, t)
        grape.draw_landing(buf, c, t)
        grape.draw_grape(buf, c, t)
    return buf


def render(t, fps=30, scale=gfx.SCALE):
    return gfx.upscale(frame(t), scale)


def warm():
    pass
