"""The only text in the film: small captions that track the thing they name. Each one is a dot pinned on the
object, a thin elbow line and a line or two of 5x7 pixel text typed on, and it follows the object while it moves.
Nothing else is written anywhere: no title, no subtitles, no counters.

Captions keep out of the bands a phone app covers (its buttons at the top, its own caption area at the bottom) and
flip to the other side of the object rather than run off the edge of the frame.
"""
import math

import numpy as np

from . import gfx, palette as P, pixfont as PF, timeline as T

W, H = gfx.W, gfx.H


SAFE = (14, 64, W - 14, H - 112)       # x0, y0, x1, y1: where a caption may sit on a phone screen


def _line_text(line):
    """A caption line is a string, or a list of (text, colour) pieces when part of it is a different colour."""
    return line if isinstance(line, str) else ''.join(seg[0] for seg in line)


def _line_w(line, scale):
    if isinstance(line, str):
        return PF.text_size(line, '5x7', scale)[0]
    w = 0
    for k, (txt, _) in enumerate(line):
        w += PF.text_size(txt, '5x7', scale)[0] + (scale if k else 0)
    return w


def _text_w(lines, scale):
    return max(_line_w(l, scale) for l in lines)


def label(buf, t, t0, sx, sy, lines, col=P.UI_TEXT, side=0, life=2.0, reach=22, scale=2, up=True, box=True):
    """A caption pinned to the point (sx, sy), which is recomputed every frame, so it tracks the object.
    side = +1 text to the right, -1 to the left, 0 = pick whichever side fits. The text is clamped into the safe
    band so it never lands under a phone app's buttons."""
    tau = t - t0
    if tau < 0 or tau > life:
        return
    if not (-40 <= sx < W + 40 and -40 <= sy < H + 40):
        return
    fade = 1.0
    if tau > life - 0.35:
        fade = (life - tau) / 0.35
        if int(tau * 24) % 2 == 0 and fade < 0.6:
            return
    tw = _text_w(lines, scale)
    if side == 0:                                            # whichever side has room for the text
        side = 1 if sx + reach + tw + 8 < SAFE[2] else -1
        if side < 0 and sx - reach - tw - 8 < SAFE[0]:
            side = 1
    grow = T.ease_out(min(1.0, tau / 0.18), 2.0)
    lift = (-13 if up else 13) * grow
    ex = sx + side * reach * grow
    ey = sy + lift
    # keep the whole caption inside the safe band
    th = 8 * scale * (len(lines) - 1) + 7 * scale
    y_lo, y_hi = SAFE[1] + th / 2 + 4, SAFE[3] - th / 2 - 4
    ey = min(max(ey, y_lo), y_hi)
    x_edge = ex + side * (3 + tw)
    if x_edge > SAFE[2]:
        ex -= x_edge - SAFE[2]
    elif x_edge < SAFE[0]:
        ex += SAFE[0] - x_edge
    gfx.fill(buf, gfx.ellipse(sx, sy, 2.4, 2.4), P.OUTLINE)
    gfx.fill(buf, gfx.ellipse(sx, sy, 1.6, 1.6), col)
    gfx.fill(buf, gfx.ellipse(sx, sy, 0.6, 0.6), P.WHITE)
    mx = sx + (ex - sx) * 0.55                               # an elbow, so the line reads as a pointer
    gfx.fill(buf, gfx.line(sx, sy, mx, ey, 1), P.OUTLINE)
    gfx.fill(buf, gfx.line(mx, ey, ex, ey, 1), P.OUTLINE)
    gfx.fill(buf, gfx.line(sx, sy, mx, ey, 1).shifted(0, -1), P.UI_LINE)
    gfx.fill(buf, gfx.line(mx, ey, ex, ey, 1).shifted(0, -1), P.UI_LINE)
    if grow < 1:
        return
    tx = ex + side * 4
    anchor = 'l' if side > 0 else 'r'
    n_ch = max(1, int((tau - 0.18) / 0.019))
    y0 = ey - (th - 7 * scale) / 2
    if box:                                                  # a dark plate, so the text reads over anything
        bx0 = min(tx, tx + side * (tw + 3)) - 3
        bx1 = max(tx, tx + side * (tw + 3)) + 3
        plate = gfx.rect(bx0, y0 - 4 * scale - 1, bx1, y0 + th - 3 * scale + 3)
        gfx.fill(buf, plate.dilate(1), P.OUTLINE)
        gfx.fill(buf, plate, P.NAVY[2])
        gfx.fill(buf, plate.top_edge(), P.NAVY[4])
    done = 0
    for k, line in enumerate(lines):
        y = y0 + k * (8 * scale)
        lw = _line_w(line, scale)
        x = tx if side > 0 else tx - lw                      # every line is laid out left to right
        segs = [(line, col)] if isinstance(line, str) else line
        cursor_x = None
        for si, (txt, scol) in enumerate(segs):
            shown = txt[:max(0, n_ch - done)]
            done += len(txt)
            if shown:
                PF.draw_text(buf, shown, x, y, scol, font='5x7', anchor='lm', outline=P.OUTLINE,
                             shadow=P.NAVY[0], scale=scale)
            if len(shown) < len(txt):
                cursor_x = x + PF.text_size(shown, '5x7', scale)[0] + 1
                break
            x += PF.text_size(txt, '5x7', scale)[0] + scale
        if cursor_x is not None:
            if int(t * 12) % 2 == 0:
                gfx.fill(buf, gfx.rect(cursor_x, y - 3 * scale, cursor_x + 2, y + 3 * scale), P.UI_LINE)
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
