"""The only text in the film: four tiny labels that point at a thing on screen, typed on and gone a second later.
Nothing else is written anywhere: no title, no subtitles, no counters.
"""
import math

import numpy as np

from . import gfx, palette as P, pixfont as PF, timeline as T

W, H = gfx.W, gfx.H


def label(buf, t, t0, sx, sy, lines, col=P.UI_TEXT, side=1, life=2.0, reach=22, scale=1):
    """A label beside the point (sx, sy): a dot on the thing, a thin elbow line, then the text typed on.
    side = +1 puts the text to the right, -1 to the left."""
    tau = t - t0
    if tau < 0 or tau > life:
        return
    fade = 1.0
    if tau > life - 0.35:
        fade = (life - tau) / 0.35
        if int(tau * 24) % 2 == 0 and fade < 0.6:
            return
    grow = T.ease_out(min(1.0, tau / 0.18), 2.0)
    ex = sx + side * reach * grow
    ey = sy - 13 * grow
    gfx.fill(buf, gfx.ellipse(sx, sy, 2, 2), P.UI_LINE)
    gfx.fill(buf, gfx.ellipse(sx, sy, 1, 1), P.WHITE)
    gfx.fill(buf, gfx.line(sx, sy, ex, ey, 1), P.UI_LINE)
    if grow < 1:
        return
    tx = ex + side * 3
    anchor = 'l' if side > 0 else 'r'
    n_ch = max(1, int((tau - 0.18) / 0.028))
    for k, s in enumerate(lines):
        shown = s[:max(0, n_ch - k * len(s))]
        if not shown:
            break
        y = ey - 4 + k * (8 * scale)
        PF.draw_text(buf, shown, tx, y, col, font='5x7', anchor=anchor + 'm', outline=P.OUTLINE, scale=scale)
        if len(shown) < len(s):
            cx = tx + (side * (PF.text_size(shown, '5x7', scale)[0] + 1))
            if int(t * 12) % 2 == 0:
                gfx.fill(buf, gfx.rect(min(cx, cx + side * 3), y - 3 * scale, max(cx, cx + side * 3), y + 3 * scale),
                         P.UI_LINE)
            break


def banner(buf, t, t0, text, life=1.6, y=None):
    """The one big-ish label of the film (DNA EDITED): it pops in on the beat, holds, then fades."""
    tau = t - t0
    if tau < 0 or tau > life:
        return
    y = (H // 2 + 120) if y is None else y
    k = T.back_out(min(1.0, tau / 0.22), 2.0)
    if tau > life - 0.3:
        k = 1 - T.ease_in((tau - (life - 0.3)) / 0.3, 2)
        if k <= 0.05:
            return
    scale = 2
    w, h = PF.text_size(text, '5x7', scale)
    bw, bh = w + 14, h + 10
    bx, by = W // 2 - bw // 2, int(y - bh // 2)
    sh = int(bh * k)
    if sh < 3:
        return
    box = gfx.rect(bx, y - sh // 2, bx + bw, y - sh // 2 + sh)
    gfx.fill(buf, box.dilate(1), P.OUTLINE)
    gfx.fill(buf, box, P.NAVY[3])
    gfx.fill(buf, gfx.rect(bx, y - sh // 2, bx + bw, y - sh // 2 + 1), P.RNA[4])
    gfx.fill(buf, gfx.rect(bx, y - sh // 2 + sh - 1, bx + bw, y - sh // 2 + sh), P.RNA[1])
    if sh > h + 4:
        PF.draw_text(buf, text, W // 2, y, P.UI_TEXT, font='5x7', anchor='mm', outline=P.OUTLINE, scale=scale)


def arrow(buf, x, y, t, col=P.RNA[5], size=4, dirn=-1):
    """A small bobbing arrow pointing at something."""
    bob = int(round(1.6 * math.sin(2 * math.pi * 3 * t)))
    yy = y + dirn * (size + 3 + bob)
    pts = [(x - size, yy), (x + size, yy), (x, yy - dirn * size)]
    tri = gfx.polygon([(px, py) for px, py in pts])
    gfx.fill(buf, tri.dilate(1), P.OUTLINE)
    gfx.fill(buf, tri, col)
