"""Short explanation labels, pinned to the thing they explain: a name and, where it helps, one short line about what
it does, on a small dark plate joined to the object by a dotted leader line. They follow the object on screen and
type in quickly. English by default, Indonesian with lang='id'; off with --clean. No caption box at the top."""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T
from . import micro as M

W, H = gfx.W, gfx.H
TEXT = {
    'en': {
        'draw': 'DRAW\nBLOOD TO THE MACHINE',
        'rbc': 'RED CELL', 'plt': 'PLATELETS', 'wbc': 'WHITE CELL', 'plasma': 'PLASMA\nALL STILL MIXED',
        'cit': 'CITRATE\nFROM THE ANTICOAGULANT', 'ret': 'RETURN: RED CELLS + PLASMA\nGO BACK TO THE DONOR',
        'pump': 'BLOOD PUMP\nROLLERS PUSH THE BLOOD',
        'ac': 'ANTICOAGULANT\nSTOPS CLOTTING',
        'citrate': 'CITRATE', 'calcium': 'CALCIUM', 'bound': 'CALCIUM HELD\nSO NO CLOT FORMS',
        'spin': 'CENTRIFUGE\nSPINS VERY FAST',
        'rbc_ch': 'RED CELLS\nHEAVIEST: OUTSIDE', 'plt_ch': 'PLATELETS\nIN THE MIDDLE',
        'plasma_ch': 'PLASMA\nLIGHTEST: INSIDE', 'plt_out': 'PLATELETS\nLEAVE HERE',
        'bag': 'PLATELETS\nCOLLECTED', 'inbag': 'IN THE BAG:\nPLATELETS IN PLASMA',
        'ret_mix': 'GOING BACK:\nRED CELLS + PLASMA', 'ret_arm': 'BACK TO\nTHE DONOR',
        'collected': 'PLATELETS COLLECTED', 'returned': 'BLOOD RETURNED',
    },
    'id': {
        'draw': 'AMBIL\nDARAH KE MESIN',
        'rbc': 'SEL DARAH MERAH', 'plt': 'TROMBOSIT', 'wbc': 'SEL DARAH PUTIH', 'plasma': 'PLASMA\nMASIH TERCAMPUR',
        'cit': 'SITRAT\nDARI ANTIKOAGULAN', 'ret': 'KEMBALI: SEL MERAH + PLASMA\nMASUK LAGI KE DONOR',
        'pump': 'POMPA DARAH\nROLLER MENDORONG DARAH',
        'ac': 'ANTIKOAGULAN\nCEGAH PEMBEKUAN',
        'citrate': 'SITRAT', 'calcium': 'KALSIUM', 'bound': 'KALSIUM DIIKAT\nJADI TIDAK MEMBEKU',
        'spin': 'SENTRIFUS\nBERPUTAR SANGAT CEPAT',
        'rbc_ch': 'SEL DARAH MERAH\nPALING BERAT: LUAR', 'plt_ch': 'TROMBOSIT\nDI TENGAH',
        'plasma_ch': 'PLASMA\nPALING RINGAN: DALAM', 'plt_out': 'TROMBOSIT\nKELUAR DI SINI',
        'bag': 'TROMBOSIT\nTERKUMPUL', 'inbag': 'ISI KANTONG:\nTROMBOSIT + PLASMA',
        'ret_mix': 'DIKEMBALIKAN:\nSEL MERAH + PLASMA', 'ret_arm': 'KEMBALI\nKE DONOR',
        'collected': 'TROMBOSIT TERKUMPUL', 'returned': 'DARAH DIKEMBALIKAN',
    },
}
C_RED, C_GOLD, C_PLASMA, C_TEAL, C_MINT, C_ION = P.RED[5], P.GOLD[3], P.PLASMA[3], P.TEAL[3], P.MINT[3], P.ION[2]


def _visible(kind, n, t0, t1, x0=36, x1=W - 70):
    """The cell of a kind that stays inside the frame for the whole label and drifts least (stream view)."""
    best, score = 0, None
    for i in range(n):
        xs = []
        for t in np.linspace(t0, t1, 12):
            x, y = M.stream_pos(kind, i, t)
            px, py = M.stream_camera(t).px(x, y)
            if not (x0 < px < x1 and 120 < py < H - 120):
                xs = None
                break
            xs.append(px)
        if xs is not None and (score is None or max(xs) - min(xs) < score):
            best, score = i, max(xs) - min(xs)
    return best


_RBC_I = _visible('rbc', M._N_RBC, 9.9, 12.8)
_PLT_I = _visible('plt', M._N_PLT, 10.2, 12.8)
_CIT_I = _visible('cit', M._N_CIT, 11.2, 12.8)


def _path(name, f):
    return lambda t: T.path_point(name, f)


def _cam_point(dx=0.0, dy=0.0):
    def f(t):
        c = T.world_camera(t)
        return c[0] + dx / c[2], c[1] + dy / c[2]
    return f


def _fixed(x, y):
    return lambda t: (x, y)


# (start, end, key, space, anchor(t) -> point in that space, plate offset px, accent)
LABELS = [
    (2.20, 4.80, 'draw', 'world', _cam_point(14, -2), (12, -40), C_TEAL),
    (5.40, 6.90, 'ac', 'world', _path('ac2', 0.55), (10, -18), C_MINT),
    (9.90, 12.80, 'rbc', 'stream', lambda t: M.stream_pos('rbc', _RBC_I, t), (10, -34), C_RED),
    (10.20, 12.80, 'plt', 'stream', lambda t: M.stream_pos('plt', _PLT_I, t), (10, 30), C_GOLD),
    (10.60, 12.80, 'plasma', 'stream', lambda t: (M.stream_camera(t).cx - 30, 52.0), (-20, 40), C_PLASMA),
    (11.20, 12.80, 'cit', 'stream', lambda t: M.stream_pos('cit', _CIT_I, t), (10, -92), C_MINT),
    (15.30, 16.20, 'citrate', 'molecule', lambda t: M.citrate_pos(t), (-40, 34), C_MINT),
    (15.40, 16.20, 'calcium', 'molecule', lambda t: M.ion_pos(M.TARGET, t), (14, -40), C_ION),
    (16.40, 17.90, 'bound', 'molecule', lambda t: M.ion_pos(M.TARGET, t), (-60, -60), C_MINT),
    (23.00, 25.80, 'pump', 'world', _fixed(T.PUMP[0] - 4, T.PUMP[1] - 6), (-74, -64), C_RED),
    (28.20, 29.90, 'spin', 'world', _fixed(T.CENTRIFUGE[0] - 22, T.CENTRIFUGE[1] + 2), (-78, 46), C_TEAL),
    (33.60, 38.80, 'rbc_ch', 'channel', lambda t: M.channel_point('rbc', t), (-10, -52), C_RED),
    (34.20, 36.60, 'plt_ch', 'channel', lambda t: M.channel_point('plt', t), (-4, 40), C_GOLD),
    (34.80, 38.80, 'plasma_ch', 'channel', lambda t: M.channel_point('plasma', t), (-16, 62), C_PLASMA),
    (37.00, 38.80, 'plt_out', 'channel', lambda t: M.channel_port_point(), (-110, 20), C_GOLD),
    (44.30, 45.90, 'bag', 'world', lambda t: (T.BAG[0] + T.BAG_W / 2, T.BAG[1] - 6), (6, -60), C_GOLD),
    (46.80, 48.90, 'ret', 'world', _fixed(T.NEEDLE[0] + 6, T.NEEDLE[1] - 4), (-30, -64), C_TEAL),
]
CPS = 70.0
LINE2 = 2


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(0, n, 2):
        u = i / max(n - 1, 1)
        x, y = int(round(x0 + (x1 - x0) * u)), int(round(y0 + (y1 - y0) * u))
        if 0 <= x < W and 0 <= y < H:
            buf[y, x] = col


def draw(buf, space, view, t, lang='en'):
    t = t % T.TOTAL
    for t0, t1, key, sp, anchor, (dx, dy), accent in LABELS:
        if sp != space or not t0 <= t < t1:
            continue
        el, left = t - t0, t1 - t
        if left < 0.1 and int(left / 0.034) % 2 == 0:
            continue
        ax, ay = anchor(t) if sp == 'screen' else view.px(*anchor(t))
        if not (-40 < ax < W + 40 and -40 < ay < H + 40):
            continue
        lines = TEXT[lang][key].split('\n')
        sizes = [pixfont.text_size(s) for s in lines]
        lh = sizes[0][1]
        w = max(sw for sw, sh in sizes)
        h = len(lines) * lh + (len(lines) - 1) * (LINE2 + 1)
        lx = ax + dx if ax + dx + w < W - 8 else ax - abs(dx) - w
        if lx < 8:
            lx = ax + abs(dx)
        lx = int(round(min(max(lx, 8), W - 8 - w)))                 # keep the plate clear of the frame edge
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
        n = int((el - 0.08) * CPS) + 1                             # type in, line after line
        for k, s in enumerate(lines):
            if n <= 0:
                break
            gfx.fill(buf, pixfont.text_mask(s[:n], lx, ly + k * (lh + LINE2 + 1)), P.INK if k == 0 else accent)
            n -= len(s)


def events():
    return sorted(t0 + 0.08 for t0, *_ in LABELS)
