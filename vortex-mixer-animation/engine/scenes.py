"""What is on screen at time t: one 2D camera over the lab bench (in millimetres), and everything drawn in order.

The camera never cuts inside the lab. It starts close on the tube coming down onto the cup, pulls back to the mixer on
the bench, drops into the x-ray of the casing, rises up the motor shaft to the offset cam, pans up into the liquid (in
slow motion), glides down the swirl and dives to the dye particles, then pulls back out for MIXED!, follows the tube up
when it is lifted, and after the battle screen (its own composition) watches the tube go into the rack. The ending is a
tape rewind of the whole film back to the first frame.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import lab, mixer, tube as TB, hud, fx, versus
from .palette import OUTLINE, WHITE, CYAN, HUD as HUDC

W, H = gfx.W, gfx.H
# (cx, cy, s): centre in mm and scale in canvas px per mm
HOOK0 = (0.0, 124.0, 3.9)
HOOK1 = (0.0, 114.0, 4.6)
HOME = lab.HOME
XRAY = (0.0, 42.0, 2.55)
ECC = (0.0, 62.0, 6.0)
TUBE = (0.0, 103.0, 7.0)
BANDS = (-1.0, 97.0, 11.0)
MICRO = (-3.2, 99.0, 34.0)
MIXED_CAM = (0.0, 116.0, 4.2)
LIFT_CAM = (0.0, 152.0, 3.0)
END = (32.0, 96.0, 1.8)
END2 = (36.0, 100.0, 2.15)        # a slow push-in while the stars pop


def _mix(a, b, k):
    """Blend two framings: the centre moves linearly, the scale geometrically."""
    return (T.lerp(a[0], b[0], k), T.lerp(a[1], b[1], k), a[2] * (b[2] / a[2]) ** k)


def camera(t):
    if t < T.REVEAL[0]:
        return _mix(HOOK0, HOOK1, T.ease_out(T.u_of(t, (0.0, 1.6)), 2.0))
    if t < T.TO_XRAY[0]:
        return _mix(HOOK1, HOME, T.ease_in_out(T.u_of(t, T.REVEAL), 2.0))
    if t < T.TO_ECC[0]:
        return _mix(HOME, XRAY, T.ease_in_out(T.u_of(t, T.TO_XRAY), 2.0))
    if t < T.TO_TUBE[0]:
        return _mix(XRAY, ECC, T.ease_in_out(T.u_of(t, T.TO_ECC), 2.0))
    if t < T.TO_BANDS[0]:
        return _mix(ECC, TUBE, T.ease_in_out(T.u_of(t, T.TO_TUBE), 2.0))
    if t < T.TO_MICRO[0]:
        return _mix(TUBE, BANDS, T.ease_in_out(T.u_of(t, T.TO_BANDS), 1.6))
    if t < T.PULL_OUT[0]:
        return _mix(BANDS, MICRO, T.ease_in_out(T.u_of(t, T.TO_MICRO), 2.0))
    if t < T.LIFT[0]:
        return _mix(MICRO, MIXED_CAM, T.ease_in_out(T.u_of(t, T.PULL_OUT), 2.0))
    if t < T.VS[1]:
        return _mix(MIXED_CAM, LIFT_CAM, T.ease_in_out(T.u_of(t, (T.LIFT[0], T.LIFT[1] + 0.3)), 2.0))
    if t < T.TO_RACK[1]:
        return _mix(LIFT_CAM, END, T.ease_in_out(T.u_of(t, (T.VS[1], T.TO_RACK[1])), 2.0))
    return _mix(END, END2, T.ease_in_out(T.u_of(t, (T.TO_RACK[1], T.REWIND[0])), 1.6))


def tube_pos(t):
    """(x, yb, ox, hand): where the tube is (its outside bottom), how far its bottom follows the cup's orbit, and
    whether the hand holds it."""
    ox, dz = mixer.cup_offset(t)
    if t < T.CONTACT:
        k = T.ease_in(T.u_of(t, T.PLUNGE), 2.2)
        return 0.0, mixer.CUP_BOWL + 62.0 * (1 - k), 0.0, True
    if t < T.LIFT[0]:
        return 0.0, mixer.CUP_BOWL - dz, ox if T.rpm(t) > 0 else 0.0, True
    if t < T.VS[1]:
        k = T.ease_out(T.u_of(t, T.LIFT), 2.2)
        return 0.0, mixer.CUP_BOWL - dz + 44.0 * k, ox * (1 - k) if T.rpm(t) > 0 else 0.0, True
    # into the rack: over, then down into the empty hole
    k = T.ease_in_out(T.u_of(t, T.TO_RACK), 2.0)
    x = T.lerp(0.0, lab.RACK_HOLES[lab.RACK_SLOT], k)
    y0 = mixer.CUP_BOWL + 44.0
    yb = T.lerp(y0, 3.0, T.ease_in(T.u_of(t, (T.TO_RACK[0] + 0.35, T.TO_RACK[1])), 2.0)) + 18.0 * math.sin(math.pi * k)
    return x, yb, 0.0, t < T.RACK_CLINK + 0.15


SHAKES = [(T.CONTACT, 2.0, 0.14), (T.MIXED_AT, 2.0, 0.16), (T.RACK_CLINK, 1.0, 0.1)] + \
    [(s_, 1.0, 0.1) for s_ in T.STARS]
_SHAKE = ((1, 0), (-1, 1), (1, -1), (-1, 0), (0, 1), (1, 1), (0, -1))


def shake(t):
    dx = dy = 0.0
    for t0, amp, dur in SHAKES:
        u = (t - t0) / dur
        if 0 <= u < 1:
            ox, oy = _SHAKE[int((t - t0) * 30) % len(_SHAKE)]
            dx += ox * amp * (1 - u)
            dy += oy * amp * (1 - u)
    r = T.rpm(t) / T.RPM_MAX                                    # the bench hums while the motor runs at speed
    if r > 0.6 and T.warp(t) > 0.5 and T.CONTACT < t < T.REVEAL[1] + 0.8:
        dx += ((math.floor(t * 30) % 2) * 2 - 1) * 0.6
    return int(round(dx)), int(round(dy))


def lab_frame(t):
    """The film inside the lab at time t (no battle screen, no rewind)."""
    cx, cy, s = camera(t)
    cx = round(cx * s) / s
    kx, ky = shake(t)
    cam = Wd.Cam(cx + kx / s, cy + ky / s, s)
    buf = np.empty((H, W, 3), np.uint8)
    lab.paint_back(buf, cam, t)
    x, yb, ox, hand = tube_pos(t)
    in_rack = t >= T.VS[1] and yb < 30
    lab.rack(buf, cam, t, slot_tube=(lambda: TB.draw(buf, cam, t, x, yb, 0.0, hand=hand)) if in_rack else None)
    mixer.draw_body(buf, cam, t)
    xr = mixer.draw_xray(buf, cam, t)
    mixer.draw_cup(buf, cam, t)
    tc = None
    if not in_rack:
        tc = TB.draw(buf, cam, t, x, yb, ox, hand=hand)
        if t < T.LIFT[0] + 0.1:
            mixer.draw_cup_front(buf, cam, t)
    mixer.speed_lines(buf, cam, t, 0.0, 70.0, 98.0)
    fx.draw(buf, cam, t, tc)
    hud.draw(buf, cam, t, tc, xr)
    return buf


def film_frame(t):
    if T.VS[0] <= t < T.VS[1]:
        return versus.frame(t, lab_frame)
    return lab_frame(t)


def render(t, fps=30, scale=gfx.SCALE):
    if t < T.REWIND[0]:
        return gfx.upscale(film_frame(t), scale)
    return fx.vhs(gfx.upscale(film_frame(T.rewind_source(t)), scale), t, fps, scale)


def frame(t):
    """The canvas-size frame at time t (with the rewind), for contact sheets and checks."""
    if t < T.REWIND[0]:
        return film_frame(t)
    return fx.vhs(film_frame(T.rewind_source(t)), t, 30, 1)


def warm():
    pass
