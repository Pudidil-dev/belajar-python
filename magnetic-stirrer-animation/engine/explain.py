"""The short explanation during the cutaway zoom (and the fast-forward badge of the time-lapse).

While the camera is close on the magnet and the bar (about 5.9-8.6 s):
  * an RPG-style caption box types two short lines: the motor spins the magnet below; N pulls S, so the bar spins too;
  * part tags with leader lines: MOTOR, MAGNET, STIR BAR (MAGNET INSIDE), PLATE + GLASS: NO TOUCH;
  * draw.field_lines and the x-ray of the bar (drawn by the scene) show the pull going through the plate and glass.
During the time-lapse a blinking fast-forward badge (two arrows, no number) says that time runs fast.

English by default, Indonesian with lang='id'. render.py --clean leaves all of this out.
"""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T

W, H = gfx.W, gfx.H
CPS = 50.0
TAG_CPS = 60.0

TEXT = {
    'en': {'cap': ['THE MOTOR SPINS A MAGNET BELOW', '[N] PULLS [S]: THE BAR SPINS TOO'],
           'motor': 'MOTOR', 'magnet': 'MAGNET', 'bar': 'STIR BAR (MAGNET INSIDE)',
           'gap': 'NO TOUCH'},
    'id': {'cap': ['MOTOR MEMUTAR MAGNET DI BAWAH', '[N] MENARIK [S]: BATANG IKUT BERPUTAR'],
           'motor': 'MOTOR', 'magnet': 'MAGNET', 'bar': 'BATANG (ADA MAGNETNYA)',
           'gap': 'TAK MENYENTUH'},
}
CAP = (5.85, 8.65)
# (start, end, key, world anchor (u, v), label offset in canvas px)
TAGS = [
    (5.95, 8.60, 'magnet', (-12.0, -31.0), (-66, 40)),
    (6.20, 8.60, 'motor', (-8.0, -13.0), (-72, 26)),
    (6.45, 8.60, 'bar', (-4.0, -49.5), (-60, -62)),
    (6.80, 8.60, 'gap', (-20.0, -37.6), (-26, 10)),
]
_ICON = ['..####..', '.######.', '##..####', '##..####', '.######.', '..####..']


def xray(t):
    return T.smooth((t - 6.2) / 0.3) * (1 - T.smooth((t - 8.35) / 0.3))


def field(t):
    return T.smooth((t - 6.0) / 0.35) * (1 - T.smooth((t - 8.4) / 0.3))


def _parse(line):
    out, col = [], P.INK
    for ch in line:
        if ch == '[':
            col = P.MR[5]
        elif ch == ']':
            col = P.INK
        else:
            out.append((ch, col))
    return out


def _rich(buf, segs, x, y):
    if not segs:
        return
    text = ''.join(c for c, _ in segs)
    gfx.fill(buf, pixfont.text_mask(text, x, y).dilate(1, diag=True), P.NV[0])
    cx = x
    run, rc = '', segs[0][1]
    for ch, col in segs + [('', None)]:
        if col != rc or ch == '':
            if run:
                gfx.fill(buf, pixfont.text_mask(run, cx, y), rc)
                cx += pixfont.text_size(run)[0] + 1
            run, rc = ch, col
        else:
            run += ch


def _box(buf, x0, x1, y0, y1):
    x0c, y0c, x1c, y1c = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
    if x1c <= x0c or y1c <= y0c:
        return
    sub = buf[y0c:y1c, x0c:x1c].astype(np.float32)
    col = np.asarray(P.NV[1], np.float32)
    buf[y0c:y1c, x0c:x1c] = (sub + (col - sub) * 0.86).astype(np.uint8)
    buf[y0, x0 + 1:x1 - 1] = P.INK
    buf[y1 - 1, x0 + 1:x1 - 1] = P.INK
    buf[y0 + 1, x0 + 1:x1 - 1] = P.NV[6]
    buf[y0 + 1:y1 - 1, x0] = P.INK
    buf[y0 + 1:y1 - 1, x1 - 1] = P.INK


def caption(buf, t, lang):
    t0, t1 = CAP
    if not t0 <= t < t1:
        return
    lines = TEXT[lang]['cap']
    el, left = t - t0, t1 - t
    e = min(1.0, el / 0.1, left / 0.1)
    bx0, bx1, by0 = 8, 262, 22
    h = 10 + 7 * len(lines) + 3 * (len(lines) - 1)
    cx, half = (bx0 + bx1) / 2, (bx1 - bx0) / 2 * e
    x0, x1 = int(round(cx - half)), int(round(cx + half))
    if x1 - x0 < 6:
        return
    _box(buf, x0, x1, by0, by0 + h)
    if e < 1.0:
        return
    iy = by0 + (h - 6) // 2                                   # the narrator icon: the white stir bar
    for r, row in enumerate(_ICON):
        for c, ch in enumerate(row):
            if ch == '#':
                buf[iy + r, bx0 + 4 + c] = P.WB[6] if r < 3 else P.WB[4]
    shown = int((el - 0.1) * CPS)
    y = by0 + 5
    for line in lines:
        segs = _parse(line)
        k = max(0, min(len(segs), shown))
        _rich(buf, segs[:k], bx0 + 16, y)
        if k < len(segs):
            break
        shown -= len(segs)
        y += 10


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n):
        u = i / max(n - 1, 1)
        x, y = int(round(x0 + (x1 - x0) * u)), int(round(y0 + (y1 - y0) * u))
        if 0 <= x < W and 0 <= y < H:
            buf[y, x] = col


def tags(buf, view, t, lang):
    for t0, t1, key, (wu, wv), (dx, dy) in TAGS:
        if not t0 <= t < t1:
            continue
        el, left = t - t0, t1 - t
        if left < 0.15 and int(left / 0.05) % 2 == 0:
            continue
        text = TEXT[lang][key]
        ax, ay = view.px(wu, wv)
        w, h = pixfont.text_size(text)
        lx = int(min(max(ax + dx, 3), W - 3 - w))
        ly = int(min(max(ay + dy, 56), H - 3 - h))
        tx = min(max(ax, lx), lx + w)
        ty = ly + h + 1 if ay > ly + h else ly - 2
        g = min(1.0, el / 0.15)
        _line(buf, ax, ay, ax + (tx - ax) * g, ay + (ty - ay) * g, P.SUB)
        for ddx, ddy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            xx, yy = int(ax) + ddx - 1, int(ay) + ddy - 1
            if 0 <= xx < W and 0 <= yy < H:
                buf[yy, xx] = P.INK
        if g < 1.0:
            continue
        n = int((el - 0.15) * TAG_CPS) + 1
        _rich(buf, [(c, P.INK) for c in text[:n]], lx, ly)
        if n >= len(text):
            buf[ly + h + 1, lx:lx + w] = P.AM[6]


def ff_badge(buf, t):
    """Two blinking fast-forward arrows at the top right while time runs fast (no number: just "fast")."""
    k = (T.warp_rate(t) - 1) / (T.TL_RATE - 1)
    if k < 0.15 or (t * 4) % 1.0 > 0.78:
        return
    x0, y0 = W - 36, 26
    sub = buf[y0 - 4:y0 + 13, x0 - 5:x0 + 30].astype(np.float32)
    buf[y0 - 4:y0 + 13, x0 - 5:x0 + 30] = (sub + (np.asarray(P.NV[1], np.float32) - sub) * 0.7).astype(np.uint8)
    for a in (0, 12):
        for r in range(9):
            w = 9 - abs(r - 4) * 2
            buf[y0 + r, x0 + a:x0 + a + max(1, (9 - abs(r - 4) * 2 + 1) // 2 + 3)] = P.AM[7]
            buf[y0 + r, x0 + a] = P.AM[8]


def draw(buf, view, t, lang='en'):
    if 5.8 <= t < 8.7:
        tags(buf, view, t, lang)
        caption(buf, t, lang)
    ff_badge(buf, t)


def typing_events(lang='en'):
    ev = [(CAP[0], 'open')]
    n = sum(len(_parse(l)) for l in TEXT[lang]['cap'])
    for i in range(0, n, 2):
        ev.append((CAP[0] + 0.1 + i / CPS, 'type'))
    for t0, *_ in TAGS:
        ev.append((t0 + 0.15, 'tag'))
    return sorted(ev)
