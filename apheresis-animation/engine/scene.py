"""What is on screen at time t: the clinic (world), the stream inside the tube, the citrate close-up or the
separation channel, stepped pixel cuts between them, and the tiny labels. The last frame flows into the first."""
import numpy as np
from . import gfx
from . import timeline as T
from . import world as WD
from . import micro as M
from . import labels as LB
from .pen import Pen
from .view import View

W, H = gfx.W, gfx.H
BLOCK = 12
_CAMS = {'stream': M.stream_camera, 'molecule': M.molecule_camera, 'channel': M.channel_camera}


def _view(kind, t):
    if kind == 'world':
        return View(*T.world_camera(t))
    return _CAMS[kind](t)


def _render(kind, t, view):
    buf = np.zeros((H, W, 3), np.uint8)
    pen = Pen(buf, view)
    if kind == 'world':
        WD.draw(pen, t)
    else:
        getattr(M, kind)(pen, t)
    return buf


def stepped_cut(a, b, p):
    """Blocks switch from a to b in rings spreading out from the centre (four steps)."""
    bj, bi = np.mgrid[0:H // BLOCK + 1, 0:W // BLOCK + 1]
    cj, ci = (H // 2) / BLOCK, (W // 2) / BLOCK
    ring = np.maximum(np.abs(bi + 0.5 - ci), np.abs(bj + 0.5 - cj))
    lim = (np.floor(p * 4) + 1) / 4 * ring.max()
    sel = (ring <= lim).repeat(BLOCK, 0).repeat(BLOCK, 1)[:H, :W]
    return np.where(sel[..., None], b, a)


def render_canvas(t, info=True, lang='en'):
    t = t % T.TOTAL
    c = T.cut(t)
    if c is not None:
        k0, k1, p = c
        return stepped_cut(_render(k0, t, _view(k0, t)), _render(k1, t, _view(k1, t)), p)
    kind = T.view_kind(t)
    view = _view(kind, t)
    frame = _render(kind, t, view)
    if info:
        LB.draw(frame, kind, view, t, lang)
    return frame


def render(t, scale=gfx.SCALE, info=True, lang='en'):
    return gfx.upscale(render_canvas(t, info, lang), scale)
