"""One frame: the camera for time t, then the passes in depth order, then the game layer, then the exact 4x upscale."""
import numpy as np
from . import gfx
from . import timeline as T
from . import world, micro, hud, props

W, H = T.W, T.H


def render_canvas(t, info=True):
    t = t % T.TOTAL
    cam = T.camera(t)
    ax, ay = T.dither_anchor(t)                 # pixel-snap the camera so the pinned point sits on a whole pixel:
    sx, sy = cam.px(ax, ay, 0.0)                # the world and its dither pattern then scroll together
    dx, dy = round(float(sx)) - float(sx), round(float(sy)) - float(sy)
    cam = T.Cam(cam.xc - dx / cam.z, cam.yc + dy / (cam.s * cam.z), cam.z, cam.e)
    gfx.set_dither_origin(*cam.px(ax, ay, 0.0))
    buf = np.zeros((H, W, 3), np.uint8)
    ctx = world.base(buf, cam, t)
    props.ground(buf, ctx)
    props.draw(buf, ctx)
    micro.gel(buf, ctx)
    world.colonies(buf, ctx, micro)
    micro.cells(buf, ctx)
    world.markers(buf, ctx)
    world.swab(buf, ctx)
    world.glints(buf, ctx)
    world.front(buf, ctx)
    hud.effects(buf, ctx)
    props.motes(buf, ctx)
    if info:
        hud.bracket(buf, t, cam)
        hud.counter(buf, t)
    return buf


def render(t, scale=4, info=True):
    buf = render_canvas(t, info)
    if scale == 1:
        return buf
    return np.repeat(np.repeat(buf, scale, axis=0), scale, axis=1)
