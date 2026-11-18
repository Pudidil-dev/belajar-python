"""What is on screen at time t: one 2.5D camera over the back, and everything drawn in order.

The camera never cuts. It starts close and hops from spot to spot with the lancet, pulls back as the cups drop on the
beat, leans in on the pump, tips
down to a side view while the near part of the back is sliced away, zooms into the capillaries and an opening, pulls
back while blood collects, dives into the collected blood, follows the cup up, tips back up to an angled view of the
mark, then pulls out and slides down the spine to the next clean set of spots, framed exactly like the opening.
"""
import math
import numpy as np
from . import gfx, back, tissue, cups, tools, fx, captions
from . import view as V
from . import state as S
from . import timeline as T
from .palette import NAVY

W, H = gfx.W, gfx.H
X0, Y0 = S.SPOTS[S.MAIN]
# (cx, cy, cz, s, e)
K0 = (0.0, 110.0, 0.0, 2.0, 90.0)
PUMPK = (14.0, 122.0, 0.0, 2.35, 90.0)
SIDE = (X0, Y0, 10.0, 5.0, 0.0)
OPENK = (X0 + 5.0, Y0, 6.4, 18.0, 0.0)
FOLW = (X0 + 13.0, Y0, 3.0, 9.0, 0.0)
MICRO = (X0 + 16.6, Y0, 2.6, 52.0, 0.0)
ANG = (X0, Y0 + 3.0, 0.0, 3.0, 58.0)
WIDE = (0.0, 12.0, 0.0, 1.05, 90.0)
TAP_S = 2.6                                   # closer than the cups' framing while the lancet taps
# screen shake on impacts: (time, amplitude in canvas pixels, duration)
SHAKES = [(t0, 2.0, 0.12) for t0 in T.TAPS] + [(c, 2.0, 0.15) for c in T.CUP_LAND] + \
    [(p, 1.0, 0.10) for p in T.PUMPS] + [(T.POP, 2.0, 0.14)]
_SHAKE = ((1, 0), (-1, 1), (1, -1), (-1, 0), (0, 1), (1, 1), (0, -1))


TAP_FOLLOW = 0.42                             # how far toward the tapped spot the camera goes (0 = stay in the middle)


def _tap_frame(i):
    """Where the camera looks while the lancet taps spot i: part of the way from the middle of the spots toward it."""
    sx, sy = S.SPOTS[i]
    return TAP_FOLLOW * sx, 110.0 + TAP_FOLLOW * (sy - 110.0)


def _tap_cam(tau, dy=0.0):
    """The camera during the taps (tau: time in the loop; dy moves it to the second set of spots for the loop's end).
    It holds on a spot while the lancet presses, then hops toward the next one, eased, before the next tap."""
    x, y = _tap_frame(0)
    for k in range(1, len(T.TAPS)):
        u = T.u_of(tau, (T.TAPS[k - 1] + T.HOP[0], T.TAPS[k] - T.HOP[1]))
        if u <= 0:
            break
        (x0, y0), (x1, y1) = _tap_frame(k - 1), _tap_frame(k)
        e_ = T.smooth(u)
        x, y = T.lerp(x0, x1, e_), T.lerp(y0, y1, e_)
    return (x, y + dy, 0.0, TAP_S, 90.0)


def shake(t):
    """Canvas-pixel offset of the screen shake at time t (a new offset every 1/30 s, dying away)."""
    dx = dy = 0.0
    for t0, amp, dur in SHAKES:
        u = (t - t0) / dur
        if 0 <= u < 1:
            ox, oy = _SHAKE[int((t - t0) * 30) % len(_SHAKE)]
            dx += ox * amp * (1 - u)
            dy += oy * amp * (1 - u)
    return int(round(dx)), int(round(dy))


def _vessel_cam(t):
    h = float(S.dome_at(t, np.array(X0 + 1.8), Y0))
    return (X0 + 1.8, Y0, h - 2.6, 26.0, 0.0)


def _lift_cam(t):
    return (X0, Y0, 10.0 + 0.3 * min(S.lift(t), 110.0), 4.2, 0.0)


def _mix(a, b, k):
    """Blend two camera states; the scale moves geometrically, the angle linearly."""
    return tuple(T.lerp(a[i], b[i], k) for i in range(3)) + (a[3] * (b[3] / a[3]) ** k, T.lerp(a[4], b[4], k))


def camera(t):
    if t < T.PULL[0]:
        return _tap_cam(t)
    if t < 3.9:
        return _mix(_tap_cam(t), K0, T.ease_in_out(T.u_of(t, T.PULL), 2.0))
    if t < T.TILT_DOWN[0]:
        return _mix(K0, PUMPK, T.ease_in_out(T.u_of(t, (3.9, 4.5)), 2.0))
    if t < 7.0:
        u = T.u_of(t, T.TILT_DOWN)
        k = T.ease_in_out(u, 2.0)
        c = _mix(PUMPK, SIDE, k)
        return c[:4] + (90.0 * (1 - T.ease_in_out(u, 1.6)),)
    if t < 9.0:
        return SIDE
    if t < 11.6:
        return _mix(SIDE, _vessel_cam(t), T.ease_in_out(T.u_of(t, T.VESSEL_ZOOM), 2.2))
    if t < 13.0:
        return _mix(_vessel_cam(t), OPENK, T.ease_in_out(T.u_of(t, (11.6, 12.2)), 2.0))
    if t < T.FOLLOW[0]:
        return _mix(OPENK, SIDE, T.ease_in_out(T.u_of(t, (13.0, 13.6)), 2.0))
    if t < T.MICRO[0]:
        return _mix(SIDE, FOLW, T.ease_in_out(T.u_of(t, T.FOLLOW), 2.0))
    if t < T.BACK_OUT[0]:
        return _mix(FOLW, MICRO, T.ease_in_out(T.u_of(t, (T.MICRO[0], T.MICRO[0] + 0.5)), 2.0))
    if t < T.POP:
        return _mix(MICRO, SIDE, T.ease_in_out(T.u_of(t, T.BACK_OUT), 2.0))
    if t < T.TILT_UP[0]:
        return _mix(SIDE, _lift_cam(t), T.smooth(T.u_of(t, (T.POP, T.POP + 0.5))))
    if t < T.ZOOM_OUT[0]:
        a, b = _lift_cam(T.TILT_UP[0]), ANG
        u = T.u_of(t, T.TILT_UP)
        k = T.ease_in_out(u, 2.0)
        c = _mix(a, b, k)
        return c[:2] + (T.lerp(a[2], b[2], T.ease_out(u, 2.5)),) + c[3:4] + (T.lerp(a[4], b[4], T.ease_in_out(u, 1.6)),)
    if t < T.TO_NEXT[0]:
        return _mix(ANG, WIDE, T.ease_in_out(T.u_of(t, T.ZOOM_OUT), 2.0))
    return _mix(WIDE, _tap_cam(t - T.TOTAL, -T.P), T.ease_in_out(T.u_of(t, T.TO_NEXT), 2.0))


def cut_plane(t, cam):
    """Where the camera's cut plane is (plane y), or None: it slices in from the near edge, stays through the cutaway,
    and closes again."""
    cx, cy, cz, s, e = cam
    se = max(math.sin(math.radians(e)), 0.05)
    near = cy - (H / 2) / (s * se) - 20.0
    if t < T.SLICE[0] or t >= T.TILT_UP[1]:
        return None
    if t < T.SLICE[1]:
        return T.lerp(near, Y0, T.ease_out(T.u_of(t, T.SLICE), 1.8))
    if t < T.TILT_UP[0]:
        return Y0
    return T.lerp(Y0, near, T.ease_in(T.u_of(t, T.TILT_UP), 1.8))


def frame(t):
    cam = camera(t)
    ycut = cut_plane(t, cam)
    cx, cy, cz, s, e = cam
    cx = round(cx * s) / s                             # whole-pixel scrolling across
    kx, ky = shake(t)
    if kx or ky:
        se_, ce_ = math.sin(math.radians(e)), math.cos(math.radians(e))
        cx += kx / s
        if se_ > 0.5:
            cy += ky / (s * se_)
        else:
            cz += ky / (s * ce_)
    v = V.View(cx, cy, cz, s, e, ycut)
    buf = np.empty((H, W, 3), np.uint8)
    buf[:] = NAVY[3]
    if v.YP is not None:
        region = np.ones((H, W), bool) if ycut is None else V.full(v.YP >= ycut)
        back.paint_top(buf, v, t, region)
    tissue.paint_cut(buf, v, t)
    tissue.paint_cells(buf, v, t)
    tissue.paint_blood(buf, v, t)
    tissue.paint_pool_cells(buf, v, t)
    fx.air_side(buf, v, t)
    fx.air_top(buf, v, t)
    cups.draw_all(buf, v, t)
    fx.dust(buf, v, t)
    tools.draw_pump(buf, v, t)
    tools.draw_lancet(buf, v, t)
    tools.draw_gauze(buf, v, t)
    tools.draw_side_hand(buf, v, t)
    fx.sparks(buf, v, t)
    captions.draw(buf, v, t)
    captions.fast_forward(buf, t)
    return buf


def render(t, fps=30, scale=gfx.SCALE):
    return gfx.upscale(frame(t), scale)


def warm():
    pass
