"""What is on screen at time t: one 2D camera over the blister line (in millimetres), and everything drawn in order.

The camera never cuts. The film opens close on the thumb and the burst pocket, eases back as the capsule flies up and
hangs there, then rewinds the whole story (a fast pan back along the line). From LV.1 it travels the line in order:
pushes in on the forming mould, rises to the hopper, drops to the gate, follows the web to the camera, the sealing
roller and the punch, and finally follows the hero's card up into the hand and pushes in to the thumb, which is where
the film began. Long moves arc out a little (the scale dips mid-way) so they stay readable.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import factory, machine, web, feeder, hand, fx, hud, pix

W, H = gfx.W, gfx.H
# (cx, cy, s): centre in mm and scale in canvas px per mm
END = (T.XP + 6.0, 222.0, 4.3)     # the thumb under the hero's pocket (= the first frame)
HOOK1 = (T.XP + 4.0, 238.0, 3.3)
FORM_A = (-262.0, 124.0, 2.6)
FORM_B = (-240.0, 116.0, 3.4)
HOP = (-92.0, 186.0, 2.2)
HOP2 = (-86.0, 182.0, 2.25)
DROP = (-4.0, 116.0, 3.5)
INSP = (T.XI + 8.0, 160.0, 2.35)
SEAL = (T.XS - 12.0, 156.0, 2.35)
SEAL2 = (T.XS + 46.0, 140.0, 2.8)
SHIELD = (T.XP - 80.0, 110.0, 4.0)
PUNCH = (T.XP + 10.0, 98.0, 2.0)
FIN_A = (T.XP - 14.0, 122.0, 2.0)
FIN_B = (T.XP - 8.0, 206.0, 2.0)


def _mix(a, b, k, arc=0.0):
    """Blend two framings: the centre moves linearly, the scale geometrically, dipping by `arc` mid-way."""
    s = a[2] * (b[2] / a[2]) ** k * (1 - arc * math.sin(math.pi * k))
    return T.lerp(a[0], b[0], k), T.lerp(a[1], b[1], k), s


_PATH = [  # (S0, S1, from, to, ease, arc)
    (0.0, 0.9, END, HOOK1, 'out', 0.0),
    (4.0, 5.8, FORM_A, FORM_B, 'inout', 0.0),
    (5.8, 6.85, FORM_B, HOP, 'smooth', 0.15),
    (6.85, 7.7, HOP, HOP2, 'inout', 0.0),
    (7.7, 8.35, HOP2, DROP, 'smooth', 0.12),
    (9.4, 10.35, DROP, INSP, 'smooth', 0.3),
    (11.7, 12.4, INSP, SEAL, 'smooth', 0.2),
    (12.4, 12.95, SEAL, SEAL2, 'inout', 0.0),
    (12.95, 13.5, SEAL2, SHIELD, 'smooth', 0.0),
    (13.85, 14.45, SHIELD, PUNCH, 'smooth', 0.0),
    (16.0, 16.6, PUNCH, FIN_A, 'smooth', 0.0),
    (16.6, 17.45, FIN_A, FIN_B, 'inout', 0.0),
    (17.45, 19.9, FIN_B, END, 'inout', 0.0),
]


def _ease(kind, u):
    if kind == 'out':
        return T.ease_out(u, 2.0)
    if kind == 'inout':
        return T.ease_in_out(u, 2.0)
    return T.smooth(u)


def camera(S):
    if 2.0 <= S < 4.0:
        S = 4.0
    prev = _PATH[0][2]
    for s0, s1, a, b, kind, arc in _PATH:
        if S < s0:
            return prev
        if S < s1:
            return _mix(a, b, _ease(kind, (S - s0) / (s1 - s0)), arc)
        prev = b
    return prev


SHAKES = [(T.POP, 2.0, 0.22), (T.CLAMP, 1.0, 0.1), (T.HERO_LAND, 1.0, 0.12), (T.THUNK_REJ, 2.0, 0.16),
          (T.THUNK_HERO, 2.0, 0.16), (T.FINAL, 2.0, 0.3), (T.GRAB, 1.0, 0.1)]
_SHAKE = ((1, 0), (-1, 1), (1, -1), (-1, 0), (0, 1), (1, 1), (0, -1))


def shake(S):
    dx = dy = 0.0
    for t0, amp, dur in SHAKES:
        u = (S - t0) / dur
        if 0 <= u < 1:
            ox, oy = _SHAKE[int((S - t0) * 30) % len(_SHAKE)]
            dx += ox * amp * (1 - u)
            dy += oy * amp * (1 - u)
    if S >= T.PRESS[0] and T.press(S) > 0.45:                     # the press trembles
        dx += ((math.floor(S * 30) % 2) * 2 - 1) * 0.6
    return int(round(dx)), int(round(dy))


def hero_state(S):
    """The hero capsule: world position, angle, and where it is ('air', 'feeder', 'pocket')."""
    if S < 2.0:
        x0, y0 = web.hero_pocket_world(T.TOTAL)
        dx, dy, spin = T.flight(S)
        return x0 + dx, y0 + dy, spin, 'air'
    fp = feeder.hero_pos(S)
    if fp is not None:
        return fp[0], fp[1], fp[2], 'feeder'
    x, y = web.hero_pocket_world(S)
    return x, y, 0.0, 'pocket'


def rewind_camera(t):
    """During the rewind the camera flies back along the whole line, pulled far out like a level map, while the
    story runs backward underneath it: from the hook's framing to LV.1's."""
    u = T.clamp01((t - T.REWIND[0]) / (T.REWIND[1] - T.REWIND[0]))
    k = T.ease_in_out(u, 2.0)
    dip = 1 - 0.7 * math.sin(math.pi * u)
    a, b = HOOK1, FORM_A
    return (T.lerp(a[0], b[0], k), T.lerp(a[1], b[1], k) - 40.0 * math.sin(math.pi * u),
            a[2] * (b[2] / a[2]) ** k * dip)


def frame_camera(t):
    if T.REWIND[0] <= t < T.REWIND[1]:
        return rewind_camera(t)
    return camera(T.story(t))


def story_frame(S, cam_xys=None):
    cx, cy, s = camera(S) if cam_xys is None else cam_xys
    cx = round(cx * s) / s
    cy = round(cy * s) / s
    kx, ky = shake(S)
    cam = Wd.Cam(cx + kx / s, cy + ky / s, s)
    buf = np.empty((H, W, 3), np.uint8)
    factory.paint_back(buf, cam, S)
    machine.back(buf, cam, S)
    web.draw_after_punch(buf, cam, S)
    web.draw_web(buf, cam, S)
    feeder.draw(buf, cam, S)
    hx, hy, ha, where = hero_state(S)
    if where == 'feeder' and not feeder.hero_in_pile(S):
        pix.capsule(buf, cam, hx, hy, ha)
    machine.front(buf, cam, S)
    web.draw_hand_card(buf, cam, S)
    hand.draw_holder(buf, cam, S)
    hand.draw_thumb(buf, cam, S)
    if where == 'air':
        pix.capsule(buf, cam, hx, hy, ha)
    tt = hand.thumb_tip(S)
    hero = {'pos': (hx, hy), 'show': S < 2.0 or S >= 6.0, 'pocket': web.hero_pocket_world(S if S >= 2.0 else T.TOTAL),
            'pop': web.to_world(*web.HOLD, 0.0, T.pocket_u(T.HERO_K), 1.0),
            'thumb': None if tt is None else tt[:2]}
    fx.draw(buf, cam, S, hero)
    hud.draw(buf, cam, S, hero)
    return buf


def render(t, fps=30, scale=gfx.SCALE):
    S = T.story(t)
    out = gfx.upscale(story_frame(S, frame_camera(t)), scale)
    if T.REWIND[0] <= t < T.REWIND[1]:
        return fx.vhs(out, t, fps, scale)
    if T.REW_CUE <= t < T.REWIND[0] and int((t - T.REW_CUE) * 8) % 2 == 0:
        out = out.copy()
        fx.rew_icon(out, t, scale)
    return out


def frame(t):
    """The canvas-size frame at time t (with the rewind look), for contact sheets and checks."""
    return render(t, 30, 1)


def warm():
    pass
