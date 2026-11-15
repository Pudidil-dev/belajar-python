"""What is on screen at time t: the outside view or the side cutaway (one camera for both), the horizontal pixel
wipes between them, and the camera (a gentle push in on the bubbles, a slow pull back while the liquid clears)."""
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from . import draw as D
from .view import View

W, H = gfx.W, gfx.H
CELL = 6                                    # wipe block size (canvas px)
_ROWS = np.arange(H) // CELL
_BAND = np.arange(H // CELL + 1)
_JIT = ((((_BAND * 2654435761) >> 7) % 5) - 2).astype(np.float32)[_ROWS]   # ragged edge: 0-4 blocks per band
_COLS = (np.arange(W) // CELL) * CELL


def view_at(t):
    cu, cv, z = T.camera(t)
    return View(cu, cv, z)


def outside(t, view):
    buf = np.zeros((H, W, 3), np.uint8)
    view.apply()
    pen = D.Pen(buf, view)
    D.background(pen, t)
    D.stirrer(pen, t)
    D.beaker_back(pen, t)
    D.stir_bar(pen, t)
    D.liquid(pen, t)
    D.particles(pen, t)
    D.bubbles(pen, t)
    D.pours_behind(pen, t)
    D.beaker_front(pen, t)
    D.pours_front(pen, t)
    D.glint(pen, t)
    D.sparkles(pen, t)
    return buf


def cutaway(t, view):
    buf = np.zeros((H, W, 3), np.uint8)
    view.apply()
    pen = D.Pen(buf, view)
    D.background(pen, t)
    D.stirrer_cut(pen, t)
    D.beaker_back(pen, t, cut=True)
    D.liquid_cut(pen, t)
    D.particles(pen, t, cut=True)
    D.bubbles(pen, t, cut=True)
    D.beaker_cut(pen, t)
    D.stir_bar(pen, t, shadow=False)
    D.sparkles(pen, t)
    return buf


def _edge(p, receding):
    """Per-row x threshold of the cutaway area for wipe progress p."""
    e = -2 * CELL + p * (W + 4 * CELL)
    if receding:
        e = W + 2 * CELL - p * (W + 4 * CELL)
    return e + _JIT * CELL


def wipe(out, cut, p, receding):
    thr = _edge(p, receding)[:, None]
    m = _COLS[None, :] < thr
    frame = np.where(m[..., None], cut, out)
    # a bright scanline at the moving edge (two pixels wide, block-aligned)
    xs = np.arange(W)[None, :]
    last = np.floor((thr - 1e-6) / CELL) * CELL                  # left x of the last cutaway block in each row
    lead = (xs >= last + CELL - 2) & (xs < last + CELL)           # a 2-px bright edge on that block
    trail = (xs >= last) & (xs < last + CELL - 2) & ((xs + np.arange(H)[:, None]) % 2 == 0)
    frame[lead] = P.AM[8]
    frame[trail] = P.AM[6]
    return frame


def render_canvas(t):
    t = min(max(t, 0.0), T.TOTAL - 1e-6)
    view = view_at(t)
    a, b = T.WIPE_IN
    c, d = T.WIPE_OUT
    if t < a or t >= d:
        return outside(t, view)
    if b <= t < c:
        return cutaway(t, view)
    out, cut = outside(t, view), cutaway(t, view)
    if t < b:
        return wipe(out, cut, T.smooth((t - a) / (b - a)), False)
    return wipe(out, cut, T.smooth((t - c) / (d - c)), True)


def render(t, scale=gfx.SCALE):
    return gfx.upscale(render_canvas(t), scale)
