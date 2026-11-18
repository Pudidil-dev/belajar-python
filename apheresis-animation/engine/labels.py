"""Tiny context labels, only where they help: a short word on a small dark plate, pinned by a dotted leader line to
the thing it names and following it on screen. English by default, Indonesian with lang='id'; off with --clean."""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T
from . import micro as M

W, H = gfx.W, gfx.H
TEXT = {
    'en': {'draw': 'DRAW', 'rbc': 'RBC', 'plt': 'PLATELETS', 'plasma': 'PLASMA', 'ac': 'ANTICOAGULANT',
           'citrate': 'CITRATE', 'calcium': 'CALCIUM', 'bag': 'PLATELETS', 'return': 'RETURN',
           'collected': 'PLATELETS COLLECTED'},
    'id': {'draw': 'AMBIL', 'rbc': 'SEL DARAH MERAH', 'plt': 'TROMBOSIT', 'plasma': 'PLASMA', 'ac': 'ANTIKOAGULAN',
           'citrate': 'SITRAT', 'calcium': 'KALSIUM', 'bag': 'TROMBOSIT', 'return': 'KEMBALI',
           'collected': 'TROMBOSIT TERKUMPUL'},
}
C_RED, C_GOLD, C_PLASMA, C_TEAL, C_MINT, C_ION = P.RED[5], P.GOLD[3], P.PLASMA[3], P.TEAL[3], P.MINT[3], P.ION[2]


def _visible(kind, n, t0, t1):
    """The first cell of a kind that stays well inside the frame for the whole label (stream view)."""
    for i in range(n):
        ok = True
        for t in np.linspace(t0, t1, 8):
            x, y = M.stream_pos(kind, i, t)
            px, py = M.stream_camera(t).px(x, y)
            if not (50 < px < W - 90 and 150 < py < H - 150):
                ok = False
                break
        if ok:
            return i
    return 0


_RBC_I = _visible('rbc', M._N_RBC, 3.7, 5.5)
_PLT_I = _visible('plt', M._N_PLT, 3.95, 5.5)


def _path(name, f):
    return lambda t: T.path_point(name, f)


def _cam_point(dx=0.0, dy=0.0):
    def f(t):
        c = T.world_camera(t)
        return c[0] + dx / c[2], c[1] + dy / c[2]
    return f


def _bag(t):
    return T.BAG[0] - T.BAG_W / 2, T.BAG[1]


# (start, end, key, space, anchor(t) -> point in that space, label offset px, accent)
LABELS = [
    (0.70, 2.80, 'draw', 'world', _cam_point(18, 0), (10, -30), C_TEAL),
    (3.70, 5.50, 'rbc', 'stream', lambda t: M.stream_pos('rbc', _RBC_I, t), (10, -34), C_RED),
    (3.95, 5.50, 'plt', 'stream', lambda t: M.stream_pos('plt', _PLT_I, t), (10, 30), C_GOLD),
    (4.20, 5.50, 'plasma', 'stream', lambda t: (M.stream_camera(t).cx - 30, 52.0), (-20, 40), C_PLASMA),
    (8.55, 9.55, 'ac', 'world', _path('ac2', 0.45), (4, 14), C_MINT),
    (9.75, 10.50, 'citrate', 'molecule', lambda t: M.citrate_pos(t), (-40, 34), C_MINT),
    (9.85, 10.50, 'calcium', 'molecule', lambda t: M.ion_pos(M.TARGET, t), (14, -40), C_ION),
    (16.80, 20.90, 'rbc', 'channel', lambda t: M.channel_point('rbc'), (-10, -44), C_RED),
    (17.40, 20.90, 'plt', 'channel', lambda t: M.channel_point('plt'), (-4, 36), C_GOLD),
    (18.00, 20.90, 'plasma', 'channel', lambda t: M.channel_point('plasma'), (-16, 58), C_PLASMA),
    (23.00, 25.00, 'bag', 'world', _bag, (-72, 26), C_GOLD),
    (26.90, 28.95, 'return', 'world', _cam_point(-14, 4), (-30, -34), C_TEAL),
    (29.72, 30.72, 'collected', 'world', _bag, (-120, -36), C_GOLD),
]
CPS = 70.0


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(0, n, 2):
        u = i / max(n - 1, 1)
        x, y = int(round(x0 + (x1 - x0) * u)), int(round(y0 + (y1 - y0) * u))
        if 0 <= x < W and 0 <= y < H:
            buf[y, x] = col


def draw(buf, space, view, t, lang='en'):
    for t0, t1, key, sp, anchor, (dx, dy), accent in LABELS:
        if sp != space or not t0 <= t < t1:
            continue
        el, left = t - t0, t1 - t
        if left < 0.1 and int(left / 0.034) % 2 == 0:
            continue
        ax, ay = view.px(*anchor(t))
        if not (-40 < ax < W + 40 and -40 < ay < H + 40):
            continue
        text = TEXT[lang][key]
        w, h = pixfont.text_size(text)
        lx = ax + dx if ax + dx + w < W - 8 else ax - abs(dx) - w
        if lx < 8:
            lx = ax + abs(dx)
        lx = int(round(min(max(lx, 8), W - 8 - w)))     # keep the plate clear of the frame edge
        ly = int(round(min(max(ay + dy, 8), H - 12 - h)))
        g = min(1.0, el / 0.08)
        tx = min(max(ax, lx - 2), lx + w + 1)
        ty = ly + h + 2 if ay > ly + h else ly - 3
        _line(buf, ax, ay, ax + (tx - ax) * g, ay + (ty - ay) * g, accent)
        for ddx, ddy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            xx, yy = int(ax) + ddx - 1, int(ay) + ddy - 1
            if 0 <= xx < W and 0 <= yy < H:
                buf[yy, xx] = accent
        if g < 1.0:
            continue
        x0, y0, x1, y1 = max(lx - 3, 0), max(ly - 3, 0), min(lx + w + 3, W), min(ly + h + 3, H)
        sub = buf[y0:y1, x0:x1].astype(np.float32)
        buf[y0:y1, x0:x1] = (sub + (np.asarray(P.NAVY[0], np.float32) - sub) * 0.86).astype(np.uint8)
        buf[y1 - 1, x0:x1] = accent
        n = int((el - 0.08) * CPS) + 1
        gfx.fill(buf, pixfont.text_mask(text[:n], lx, ly), P.INK)


def events():
    return sorted(t0 + 0.08 for t0, *_ in LABELS)
