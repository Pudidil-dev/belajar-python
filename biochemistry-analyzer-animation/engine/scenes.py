"""What is on screen at time t: which artwork (3D analyzer, macro, cutaway, aspiration, molecular, optics), its camera,
and the transitions between them (tracking moves, zooms, dither dissolves, match cuts)."""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from . import analyzer as AZ
from . import shots, macro, cutaway, molecules, optics, screen
from .view import tones

W, H = gfx.W, gfx.H
_JJ, _II = np.mgrid[0:H, 0:W]


def render2d(t, view, macro_detail=False):
    """The analyzer (2D 3/4 drawing) seen through a 2D camera, with the macro or medium overlays."""
    st = T.machine(t)
    buf = np.zeros((H, W, 3), np.uint8)
    tips = AZ.draw(buf, view, st, screen.texture(t), shots.lid_alpha(view.z))
    if macro_detail:
        macro.overlay(buf, view, t, st, tips)
    else:
        macro.small_overlay(buf, view, t, st, tips)
    return buf


def dissolve(a, b, u):
    """SNES-style dither dissolve from a to b (u 0..1)."""
    th = gfx.bayer_at(0, 0, H, W)
    m = (u > th)[..., None]
    return np.where(m, b, a)


def render_canvas(t, fps=30):
    t = t % T.TOTAL
    if t < 0.95:                                   # the opening, then follow the drop down to the front glass
        a = render2d(t, macro.cam_open(t), macro_detail=True)
        return a if t < 0.88 else dissolve(a, cutaway.render(t, 'preview'), (t - 0.88) / 0.07)
    if t < 2.10:
        return cutaway.render(t, 'preview')
    if t < 2.22:                                   # pull back out of the cutaway into the machine
        return dissolve(cutaway.render(t, 'preview'), render2d(t, shots.cam(t)), (t - 2.10) / 0.12)
    if t < 6.55:
        return render2d(t, shots.cam(t))
    if t < 7.45:
        return cutaway.render(t, 'reagent')
    if t < 10.80:
        return render2d(t, shots.cam(t))
    if t < 11.60:
        return cutaway.render(t, 'serum')
    if t < T.REJOIN:
        return render2d(t, shots.cam(t), macro_detail=t > 12.9)
    if t < 14.0:
        return render2d(t, shots.open_view(), macro_detail=True)
    if t < 16.0:
        return cutaway.render(t, 'mix')
    if t < 16.45:
        return dissolve(cutaway.render(t, 'mix'), molecules.render(t), (t - 16.25) / 0.2)
    if t < 22.0:
        return molecules.render(t)
    if t < 22.5:
        return dissolve(molecules.render(t), cutaway.render(t, 'develop'), (t - 22.0) / 0.25)
    if t < 23.0:
        return cutaway.render(t, 'develop')
    if t < 24.3:
        return render2d(t, shots.cam(t))
    if t < 24.55:
        return dissolve(render2d(t, shots.cam(t)), optics.render(t), (t - 24.3) / 0.25)
    if t < 30.0:
        return optics.render(t)
    if t < 35.2:
        return render2d(t, shots.cam(t), macro_detail=t > 34.85)
    return render2d(t, macro.cam_open(t), macro_detail=True)


def render(t, fps=30, scale=gfx.SCALE):
    return gfx.upscale(render_canvas(t, fps), scale)
