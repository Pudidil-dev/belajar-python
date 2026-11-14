"""The workstation display, drawn as a small texture and mapped onto the monitor in the 3D scene.

Before the reading it shows the test running (a growing absorbance trace); at 30.75 s the result appears:
"Total Cholesterol" and one illustrative value in mg/dL. No patient data, no diagnosis, no healthy/unhealthy badge.
"""
import numpy as np
from . import palette as P
from . import pixfont
from . import timeline as T

TW, TH = 120, 80
VALUE = '187'
_cache = {}


def _text(tex, s, x, y, col, scale=1):
    b = pixfont.text_bitmap(s, '5x7', scale=scale)
    h, w = b.shape
    x1, y1 = min(x + w, TW), min(y + h, TH)
    tex[y:y1, x:x1][b[:y1 - y, :x1 - x]] = col


def texture(t):
    t = t % T.TOTAL
    show = 30.75 <= t < 35.6
    pop = show and (t - 30.75) < 0.12 and int((t - 30.75) / 0.04) % 2 == 0
    trace = min(1.0, max(0.0, (t - 24.6) / 5.4)) if 24.6 <= t < 30.75 else (1.0 if show else 0.35)
    key = (show, pop, round(trace, 2))
    if key in _cache:
        return _cache[key]
    tex = np.zeros((TH, TW, 3), np.uint8)
    tex[...] = P.NV[3]
    tex[0:8] = P.NV[5]
    for k, c in enumerate((P.RO[5], P.AM[6], P.MN[5])):
        tex[3:5, 3 + k * 5:5 + k * 5] = c
    tex[2:6, TW - 9:TW - 5] = P.RG[6]
    tex[4:6, TW - 9:TW - 5] = P.RO[5]
    _text(tex, 'Total Cholesterol', 4, 12, P.INK)
    tex[21, 4:116] = P.NV[6]
    if show and not pop:
        _text(tex, VALUE, 6, 26, P.CY[7], 2)
        _text(tex, 'mg/dL', 46, 33, P.SUB)
    else:
        for k in range(3):
            tex[32:34, 8 + k * 9:14 + k * 9] = P.NV[7]
    # absorbance trace (schematic, no numbers)
    tex[48:76, 6] = P.SUB
    tex[75, 6:114] = P.SUB
    n = int(104 * trace)
    xs = np.arange(n)
    ys = (74 - 22 * (1 - np.exp(-xs / 30.0))).astype(int)
    for x, y in zip(xs, ys):
        tex[y, 8 + x] = P.RO[6]
        tex[y + 1, 8 + x] = P.RO[4]
    _cache[key] = tex
    return tex
