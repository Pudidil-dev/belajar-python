"""What is on screen at time t: the card view (overhead and macro), the cellular view, the stepped pixel cuts between
them, the captions and the result line. The film loops: at 24 s the card slides out and a new one slides in."""
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from . import card as CD
from . import cells as CE
from . import explain as X
from .view import View

W, H = gfx.W, gfx.H
BLOCK = 12


def card_view(t, cam):
    buf = np.zeros((H, W, 3), np.uint8)
    view = View(*cam)
    pen = CD.Pen(buf, view)
    CD.bench(pen)
    off = T.card_offset(t)
    cpen = CD.Pen(buf, View(cam[0] - off, cam[1], cam[2])) if off else pen
    CD.card(cpen, 0)
    CD.blood(cpen, t, 0)
    CD.outline_a(cpen, t)
    CD.props(pen, t, 0)
    return buf


def cell_view(t, cam):
    buf = np.zeros((H, W, 3), np.uint8)
    pen = CD.Pen(buf, View(*cam))
    CE.scene(pen, t)
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
    if T.CUT_IN[0] <= t < T.CUT_IN[1]:
        frame = stepped_cut(card_view(t, T.card_camera(t)), cell_view(t, T.cell_camera(t)),
                            (t - T.CUT_IN[0]) / (T.CUT_IN[1] - T.CUT_IN[0]))
    elif T.in_cells(t):
        frame = cell_view(t, T.cell_camera(t))
    elif T.CUT_OUT[0] <= t < T.CUT_OUT[1]:
        frame = stepped_cut(cell_view(t, T.cell_camera(t)), card_view(t, T.card_camera(t)),
                            (t - T.CUT_OUT[0]) / (T.CUT_OUT[1] - T.CUT_OUT[0]))
    else:
        frame = card_view(t, T.card_camera(t))
    if info and t < T.SHIFT[0] + 0.35:
        X.caption(frame, t, lang)
    X.result(frame, t, lang, dx=T.card_offset(t))
    return frame


def render(t, scale=gfx.SCALE, info=True, lang='en'):
    return gfx.upscale(render_canvas(t, info, lang), scale)
