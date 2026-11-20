"""What is on screen at time t: the ten scenes, their cuts and the dissolve.

  0-2   inside the microscope: red blood cells snap into focus (engine/field.py)
  2-4   how it was made: the glass swipe (engine/slide.py)
  4-6   the same slide; a dithered match dissolve to the stained slide while the light moves across the glass
  6-12  the microscope (engine/scope.py): onto the stage, pull back, the nosepiece clicks, down toward the lamp
  12-22 the x-ray side view: how the light and the lenses make the image, step by step (engine/xray.py)
  22-26 the fine-focus knob, then the eyepiece: the cells sharpen in place
  26-30 the stage control, then the eyepiece: the whole field glides; the white cell slides in
  30-33 hold on the white cell
  33-36 the stage glides back to the opening field and the focus softens into the first frame (the loop)
Captions (engine/captions.py) go on last, on the pixel grid, after the camera zoom.
"""
import numpy as np
from . import gfx, slide, field, scope, xray, captions
from . import timeline as T
from .palette import BG

W, H = gfx.W, gfx.H


LOOP_BLUR = 3.6


def hook_blur(t):
    """Soft, drifting a little sharper, then the snap into focus at HOOK_SNAP."""
    soft = LOOP_BLUR - 0.6 * T.u_of(t, (0.0, T.HOOK_SNAP - 0.06))
    return soft * (1 - T.ease_out(T.u_of(t, (T.HOOK_SNAP - 0.06, T.HOOK_SNAP + 0.06)), 2.0))


def loop_view(t):
    k = T.ease_in_out(T.u_of(t, T.GLIDE_BACK), 2.0)
    return (T.lerp(field.V_FINAL[0], field.V_HOOK[0], k), T.lerp(field.V_FINAL[1], field.V_HOOK[1], k))


def loop_blur(t):
    return LOOP_BLUR * T.smooth(T.u_of(t, T.DEFOCUS))


def focus_blur(t):
    return 3.8 * (1 - T.smooth(T.u_of(t, T.FOCUS))) ** 1.25


def pan_view(t):
    k = T.ease_in_out(T.u_of(t, T.GLIDE), 2.0)
    return (T.lerp(field.V_FOCUS[0], field.V_FINAL[0], k), T.lerp(field.V_FOCUS[1], field.V_FINAL[1], k))


def eyepiece(buf, view, blur, t):
    buf[:] = BG[3]
    cx, cy, r = T.eye_circle(t)
    # the dark surround of the eyepiece
    Y, X = np.ogrid[0:H, 0:W]
    rr = np.hypot(X + 0.5 - cx, Y + 0.5 - cy)
    buf[(rr < r + 7) & (rr >= r)] = BG[2]
    buf[(rr < r + 4) & (rr >= r)] = BG[1]
    field.draw(buf, view, blur, circle=(cx, cy, r), scale=r / T.EYE_R)


def prepared(buf, t):
    """Scene 3: the fresh smear, a match dissolve to the stained slide, then the slide slides off to the stage."""
    k = T.smooth(T.u_of(t, T.DISSOLVE))
    glint = T.smooth(T.u_of(t, (T.DISSOLVE[0] - 0.2, T.DISSOLVE[1] + 0.3)))
    dx = -42.0 * T.ease_in(T.u_of(t, (5.55, 6.0)), 2.2)
    if k <= 0:
        return slide.draw(buf, t, stained=False, glint=glint)
    stained = np.empty_like(buf)
    slide.draw(stained, t, stained=True, slide_dx=dx, glint=glint)
    if k >= 1:
        buf[:] = stained
        return buf
    slide.draw(buf, t, stained=False, glint=glint)
    m = gfx.BAYER[:H, :W] < k
    buf[m] = stained[m]
    return buf


def frame(t):
    """The pixel canvas at time t and the camera zoom applied on output."""
    name, a, b = T.scene_at(t)
    buf = np.empty((H, W, 3), np.uint8)
    zoom = 1.0
    if name == 'swipe':
        slide.draw(buf, t)
        zoom = slide.camera(t)[1]
    elif name == 'hook':
        eyepiece(buf, field.V_HOOK, hook_blur(t), t)
    elif name == 'prepared':
        prepared(buf, t)
    elif name in ('stage', 'turret'):
        scope.render(buf, t)
    elif name == 'xray':
        xray.draw(buf, t)
    elif name == 'focus':
        if t < T.FOCUS_CUT:
            scope.render(buf, t)
        else:
            eyepiece(buf, field.V_FOCUS, focus_blur(t), t)
    elif name == 'pan':
        if t < T.PAN_CUT:
            scope.render(buf, t)
        else:
            eyepiece(buf, pan_view(t), 0.0, t)
    elif name == 'reveal':
        eyepiece(buf, field.V_FINAL, 0.0, t)
    else:                                       # the loop back to the opening field
        eyepiece(buf, loop_view(t), loop_blur(t), t)
    return buf, zoom


def render(t, fps=30, scale=gfx.SCALE):
    """The finished frame at video time t: (H*scale, W*scale, 3) uint8."""
    low, z = frame(t)
    out = gfx.camera(low, z, W / 2, H / 2, scale)
    return captions.composite(out, t, scale)


def warm():
    pass
