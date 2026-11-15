"""What is on screen at time t: the outside view or the side cutaway (one camera for both), the horizontal pixel
wipes between them, and the camera (a gentle push in on the bubbles, a slow pull back while the liquid clears)."""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from . import draw as D
from . import explain as X
from .view import View

W, H = gfx.W, gfx.H
CELL = 6                                    # wipe block size (canvas px)
_ROWS = np.arange(H) // CELL
_BAND = np.arange(H // CELL + 1)
_JIT = ((((_BAND * 2654435761) >> 7) % 5) - 2).astype(np.float32)[_ROWS]   # ragged edge: 0-4 blocks per band
_COLS = (np.arange(W) // CELL) * CELL


def view_at(t):
    cu, cv, z = T.camera(t)
    # a one-pixel shake on the big hits (landing, click, lock)
    for t0, amp in ((T.LAND, 1.0), (T.KNOB, 0.7), (T.LOCK, 0.6)):
        if t0 <= t < t0 + 0.1:
            k = int((t - t0) * 30)
            cu += amp * (1 if k % 2 else -1) / z
            cv += amp * (-1 if k % 3 else 1) * 0.6 / z
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


def cutaway(t, view, info=True):
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
    D.stir_bar(pen, t, shadow=False, xray=X.xray(t) if info else 0.0)
    if info:
        D.field_lines(pen, t, X.field(t))
    D.sparkles(pen, t)
    return buf


def _edge(p, receding):
    """Per-row x threshold of the cutaway area for wipe progress p."""
    e = -2 * CELL + p * (W + 4 * CELL)
    if receding:
        e = W + 2 * CELL - p * (W + 4 * CELL)
    return e + _JIT * CELL


def _cell_hash(t):
    k = int(t * 30) * 7919
    cx = (np.arange(W) // CELL)[None, :]
    cy = _ROWS[:, None]
    return (((cx * 73856093) ^ (cy * 19349663) ^ k) % 97) / 97.0


def wipe(out, cut, p, receding, t):
    """Scanner wipe: a bright vertical beam sweeps across; behind it the picture flips block by block to the other
    view, blocks just ahead of it flicker early, and sparks trail off the beam."""
    thr = _edge(p, receding)[:, None]
    cols = _COLS[None, :]
    hsh = _cell_hash(t)
    m = cols < thr
    if not receding:
        m = m | ((cols >= thr) & (cols < thr + 2 * CELL) & (hsh < 0.3))
    else:
        m = m & ~((cols < thr) & (cols >= thr - 2 * CELL) & (hsh < 0.3))
    frame = np.where(m[..., None], cut, out)
    flip = (cols >= thr - CELL) & (cols < thr) if not receding else (cols >= thr) & (cols < thr + CELL)
    f = frame[flip].astype(np.float32)
    frame[flip] = (f + (255 - f) * 0.45).astype(np.uint8)
    xb = int(round(float(np.mean(thr))))
    for dx, col, a in ((0, P.WHITE, 1.0), (1, P.WHITE, 1.0), (-1, P.AM[8], 0.85), (2, P.AM[8], 0.85),
                       (-2, P.AM[6], 0.5), (3, P.AM[6], 0.5), (-3, P.AM[5], 0.25), (4, P.AM[5], 0.25)):
        x = xb + dx
        if 0 <= x < W:
            c = frame[:, x].astype(np.float32)
            frame[:, x] = (c + (np.asarray(col, np.float32) - c) * a).astype(np.uint8)
    rng = np.random.default_rng(int(t * 30) + 5)
    for _ in range(18):
        y = int(rng.integers(0, H))
        x = xb + int(rng.integers(-14, -2) if not receding else rng.integers(3, 15))
        if 0 <= x < W:
            frame[y, x] = P.AM[8] if rng.uniform() < 0.5 else P.WHITE
    return frame


def ff_glitch(frame, t):
    """Tape fast-forward: bands of rows slip sideways, colour splits, a bright line rolls down (speeding up at the
    start of the time-lapse, slowing down at its end)."""
    for t0, dur in ((T.TL_UP[0], 0.30), (T.TL_DOWN[0] + 0.25, 0.25)):
        e = (t - t0) / dur
        if not 0 <= e < 1:
            continue
        amp = math.sin(math.pi * e)
        fr = int(t * 30)
        out = frame.copy()
        for band in range(0, H, 6):
            sh = int(round((((band // 6) * 37 + fr * 11) % 9 - 4) * 2.0 * amp))
            if sh:
                out[band:band + 6] = np.roll(frame[band:band + 6], sh, axis=1)
        out[..., 0] = np.roll(out[..., 0], int(round(2 * amp)), axis=1)
        y = int((e * 2 % 1.0) * H)
        seg = out[y:y + 2].astype(np.float32)
        out[y:y + 2] = (seg + (255 - seg) * 0.5 * amp).astype(np.uint8)
        frame = out
    # while time runs fast: faint tape scanlines
    k = (T.warp_rate(t) - 1) / (T.TL_RATE - 1)
    if k > 0.05:
        rows = frame[::3].astype(np.float32)
        frame[::3] = (rows * (1 - 0.10 * k)).astype(np.uint8)
    return frame


def flash(frame, t):
    e = t - T.CHIME
    if 0 <= e < 0.2:
        a = 0.28 * math.exp(-e / 0.05)
        f = frame.astype(np.float32)
        frame = (f + (255 - f) * a).astype(np.uint8)
    return frame


def render_canvas(t, info=True, lang='en'):
    """The frame at t. info=False is the clean cut: no caption, tags, field lines, x-ray or fast-forward badge."""
    t = min(max(t, 0.0), T.TOTAL - 1e-6)
    view = view_at(t)
    a, b = T.WIPE_IN
    c, d = T.WIPE_OUT
    if t < a or t >= d:
        frame = outside(t, view)
    elif b <= t < c:
        frame = cutaway(t, view, info)
    else:
        out, cut = outside(t, view), cutaway(t, view, info)
        if t < b:
            frame = wipe(out, cut, T.smooth((t - a) / (b - a)), False, t)
        else:
            frame = wipe(out, cut, T.smooth((t - c) / (d - c)), True, t)
    frame = ff_glitch(frame, t)
    frame = flash(frame, t)
    if info:
        X.draw(frame, view, t, lang)
    return frame


def render(t, scale=gfx.SCALE, info=True, lang='en'):
    return gfx.upscale(render_canvas(t, info, lang), scale)
