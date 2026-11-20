"""One frame: the camera for time t, then the passes in depth order, then the game layer, then the exact 4x upscale."""
import numpy as np
from . import gfx
from . import timeline as T
from . import world, micro, hud

W, H = T.W, T.H


def render_canvas(t, info=True):
    t = t % T.TOTAL
    cam = T.camera(t)
    gfx.set_dither_origin(W / 2 - cam.xc * cam.z, H / 2 + cam.yc * cam.s * cam.z)
    buf = np.zeros((H, W, 3), np.uint8)
    ctx = world.base(buf, cam, t)
    micro.gel(buf, ctx)
    world.colonies(buf, ctx, micro)
    micro.cells(buf, ctx)
    world.markers(buf, ctx)
    world.swab(buf, ctx)
    world.glints(buf, ctx)
    world.front(buf, ctx)
    hud.effects(buf, ctx)
    if info:
        hud.bracket(buf, t, cam)
        hud.counter(buf, t)
    return buf


def render(t, scale=4, info=True):
    buf = render_canvas(t, info)
    if scale == 1:
        return buf
    return np.repeat(np.repeat(buf, scale, axis=0), scale, axis=1)
