"""Context captions: a short title and a one-line note at the top of the frame, in the 5x7 pixel font.

Captions are drawn on the 270x480 pixel grid and composited after the camera zoom, so they stay crisp and never zoom.
A caption drops in with a little overshoot and its note types itself out; step captions get a cyan number badge.
"""
import numpy as np
from . import gfx, pixfont
from . import timeline as T
from .palette import BG, CY, INK, OUTLINE

# (start, end, title, note). '*' is the multiplication sign. Every caption is 8 words or fewer.
CAPTIONS = [
    (0.6, 2.0, 'ONE DROP OF BLOOD', ''),                  # short: the opening stays a scene, not a title
    (2.0, 4.0, 'HOW? SMEAR IT THIN', ''),
    (4.0, 6.0, 'DRY IT, STAIN IT', 'CELLS TAKE UP COLOUR'),
    (6.0, 7.5, 'ONTO THE STAGE', ''),
    (7.5, 9.0, 'LIGHT MICROSCOPE', 'LAMP BELOW, LENSES ABOVE'),
    (9.0, 10.5, 'TURN THE NOSEPIECE', ''),
    (10.5, 12.0, '40* OBJECTIVE', 'CLICK! LOCKED OVER THE SMEAR'),
    (12.0, 12.5, 'X-RAY VIEW', ''),
    (12.5, 15.0, '1  LAMP + CONDENSER', 'LIGHT FOCUSED ON THE FILM'),
    (15.0, 17.5, '2  OBJECTIVE 40*', 'REAL IMAGE: BIG, UPSIDE DOWN'),
    (17.5, 20.0, '3  EYEPIECE 10*', 'MAGNIFIES THAT IMAGE AGAIN'),
    (20.0, 22.0, '40 * 10 = 400*', 'TOTAL MAGNIFICATION'),
    (22.0, 24.5, 'FINE FOCUS', 'SHARPER, NOT BIGGER'),
    (24.5, 26.0, 'RED BLOOD CELLS', 'PALE CENTRES'),
    (26.0, 29.5, 'MOVE THE STAGE', 'THE WHOLE FIELD SLIDES'),
    (30.0, 33.0, 'WHITE BLOOD CELL', 'BIGGER, PURPLE NUCLEUS'),
    (33.0, 35.0, 'ALL FROM ONE DROP', ''),
]
Y_TITLE, Y_NOTE = 24, 46


def current(t):
    for c in CAPTIONS:
        if c[0] <= t < c[1]:
            return c
    return None


def overlay(t):
    """(rgb (H, W, 3), mask (H, W)) of the caption at time t on the pixel canvas, or None."""
    c = current(t)
    if c is None:
        return None
    t0, t1, title, note = c
    rgb = np.zeros((gfx.H, gfx.W, 3), np.uint8)
    mask = np.zeros((gfx.H, gfx.W), bool)
    k = T.u_of(t, (t0, t0 + 0.16))
    dy = int(round(-7 * (1 - T.back_out(k, 2.2))))
    badge = None
    if len(title) > 3 and title[0].isdigit() and title[1:3] == '  ':
        badge, title = title[0], title[3:]
    tw, th = pixfont.text_size(title, scale=2)
    bw = 17 if badge else 0
    total = tw + bw
    x0 = int(round(gfx.W / 2 - total / 2))
    # a soft dark plate so the words read over any scene
    nw = pixfont.text_size(note)[0] if note else 0
    pw = max(total, nw) + 16
    px0, px1 = int(gfx.W / 2 - pw / 2), int(gfx.W / 2 + pw / 2)
    py0, py1 = Y_TITLE - 8 + dy, (Y_NOTE + 13 if note else Y_TITLE + 22) + dy
    plate = np.zeros((gfx.H, gfx.W), bool)
    plate[max(py0, 0):max(py1, 0), max(px0, 0):px1] = True
    dith = gfx.BAYER[:gfx.H, :gfx.W] < 0.78
    rgb[plate & dith] = BG[1]
    mask |= plate & dith
    edge = np.zeros_like(plate)
    edge[max(py0, 0), max(px0 + 2, 0):px1 - 2] = True
    rgb[edge] = CY[2]
    mask |= edge
    if badge:
        bx0, by0 = x0, Y_TITLE - 1 + dy
        box = np.zeros_like(plate)
        box[max(by0, 0):by0 + 16, bx0:bx0 + 13] = True
        rgb[box] = CY[3]
        mask |= box
        bm = pixfont.text_mask(badge, bx0 + 6.5, by0 + 8, anchor='mm', scale=2)
        _paint(rgb, mask, bm, OUTLINE)
    tm = pixfont.text_mask(title, x0 + bw, Y_TITLE + dy, scale=2)
    _paint(rgb, mask, tm.dilate(2, diag=True), OUTLINE)
    _paint(rgb, mask, tm, INK)
    if note:
        n_show = int(len(note) * T.clamp01((t - t0 - 0.1) / 0.35)) if t - t0 < 0.45 else len(note)
        if n_show > 0:
            shown = note[:n_show]
            nx = int(round(gfx.W / 2 - nw / 2))
            nm = pixfont.text_mask(shown, nx, Y_NOTE + dy)
            _paint(rgb, mask, nm.dilate(1, diag=True), OUTLINE)
            _paint(rgb, mask, nm, CY[4])
    return rgb, mask


def _paint(rgb, mask, mk, col):
    if mk.empty():
        return
    sl = (slice(mk.y0, mk.y1), slice(mk.x0, mk.x1))
    rgb[sl][mk.m] = col
    mask[sl] |= mk.m


def composite(out, t, scale):
    """Draw the caption onto the finished frame (already at output size)."""
    ov = overlay(t)
    if ov is None:
        return out
    rgb, mask = ov
    up_m = np.repeat(np.repeat(mask, scale, 0), scale, 1)
    up_c = np.repeat(np.repeat(rgb, scale, 0), scale, 1)
    out[up_m] = up_c[up_m]
    return out
