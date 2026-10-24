"""Full-resolution HUD layer.

The art is drawn at 270x480 and scaled x4. Text is drawn afterwards at the
output resolution with bigger font pixels (the skill's 14_8bit recipe draws
its HUD at full resolution with a 6-screen-pixel font pixel), so labels read
on a phone without breaking the art's pixel grid.

Positions are given in native (270x480) units; sizes in output pixels.
"""
import numpy as np

from px import dilate8

OUT = 4            # output pixels per native pixel
LABEL_FPX = 6      # 42 px caps
TAG_FPX = 5        # 35 px caps
CAPTION_FPX = 6    # 42 px caps, 30 px x-height
TITLE_FPX = 9      # 63 px caps


def text_w(font, s, fpx):
    """Text width in native units."""
    return font.width(s) * fpx / OUT


def text_h(font, fpx):
    return font.h * fpx / OUT


class Overlay:
    def __init__(self):
        self.ops = []

    def rect(self, x0, y0, x1, y1, color):
        self.ops.append(("rect", x0, y0, x1, y1, color))

    def text(self, font, s, x, y, color, fpx=LABEL_FPX, outline=None, shadow=None, align="left"):
        if s:
            self.ops.append(("text", font, s, x, y, color, fpx, outline, shadow, align))


def _stamp(full, m, X, Y, color):
    h, w = m.shape
    Hf, Wf = full.shape[:2]
    x0, y0 = max(0, X), max(0, Y)
    x1, y1 = min(Wf, X + w), min(Hf, Y + h)
    if x0 >= x1 or y0 >= y1:
        return
    sub = m[y0 - Y:y1 - Y, x0 - X:x1 - X]
    full[y0:y1, x0:x1][sub] = color


def composite(full, ops):
    Hf, Wf = full.shape[:2]
    for op in ops:
        if op[0] == "rect":
            _, x0, y0, x1, y1, col = op
            X0, Y0 = int(round(x0 * OUT)), int(round(y0 * OUT))
            X1, Y1 = int(round(x1 * OUT)), int(round(y1 * OUT))
            X0, Y0, X1, Y1 = max(0, X0), max(0, Y0), min(Wf, X1), min(Hf, Y1)
            if X0 < X1 and Y0 < Y1:
                full[Y0:Y1, X0:X1] = col
            continue
        _, font, s, x, y, col, fpx, outline, shadow, align = op
        m = font.mask(s)
        w = m.shape[1] * fpx
        X = int(round(x * OUT))
        if align == "center":
            X -= w // 2
        elif align == "right":
            X -= w
        Y = int(round(y * OUT))
        if outline is not None or shadow is not None:
            om = dilate8(m).repeat(fpx, 0).repeat(fpx, 1)
            if shadow is not None:
                _stamp(full, om, X - fpx, Y, shadow)
            if outline is not None:
                _stamp(full, om, X - fpx, Y - fpx, outline)
        _stamp(full, m.repeat(fpx, 0).repeat(fpx, 1), X, Y, col)


def upscale(a):
    return a.repeat(OUT, 0).repeat(OUT, 1)
