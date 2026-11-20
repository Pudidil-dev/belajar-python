"""The game layer: the mint target bracket that locks onto our cell and later rides on our colony, the cell counter
(x1 ... x1,073,741,824) with a little time-lapse clock that stops at overnight, and the reveal effects (pop rings
along the streak, our colony's glint, a light sweep across the plate). Off with --clean, except the effects."""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T
from . import micro as M
from .world import W, H, colony_radius, colony_height

HUD_X, HUD_Y = 10, 34


def _put(buf, x, y, col):
    if 0 <= x < W and 0 <= y < H:
        buf[y, x] = col


def _hline(buf, x0, x1, y, col):
    if 0 <= y < H:
        a, b = max(0, min(x0, x1)), min(W - 1, max(x0, x1))
        if a <= b:
            buf[y, a:b + 1] = col


def _vline(buf, x, y0, y1, col):
    if 0 <= x < W:
        a, b = max(0, min(y0, y1)), min(H - 1, max(y0, y1))
        if a <= b:
            buf[a:b + 1, x] = col


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for k in range(n + 1):
        u = k / max(n, 1)
        _put(buf, int(round(x0 + (x1 - x0) * u)), int(round(y0 + (y1 - y0) * u)), col)


# ------------------------------------------------------------------ the target bracket
def _target(t, cam):
    """Screen centre and half-size of whatever the bracket is locked on."""
    tau = t % T.TOTAL
    zu = cam.z / 1000.0
    if tau < T.DIV[0] + 0.5:
        cen, th, length, eps, rho, k = M._cell_list(tau)
        if tau < T.DIV[0]:
            ends = np.array([[0.0, 0.0]])
            ext = length / 2
        else:
            d = np.stack([np.cos(th), np.sin(th)], 1) * (length / 2)
            pts = np.concatenate([cen + d, cen - d])
            ends = pts.mean(0, keepdims=True)
            ext = float(np.max(np.hypot(*(pts - ends).T)))
        sx, sy = cam.px(T.CELL_X + ends[0, 0] / 1000.0, T.CELL_Y + ends[0, 1] / 1000.0, 0.0)
        return float(sx), float(sy), max(7.0, ext * zu + 7)
    a = colony_radius(T.OUR, tau)
    h = colony_height(T.OUR, tau, a)
    sx, sy = cam.px(T.CELL_X, T.CELL_Y, h / 2)
    return float(sx), float(sy), max(7.0, a * cam.z + 5)


def bracket(buf, t, cam):
    tau = t % T.TOTAL
    if not T.bracket_on(tau):
        return
    sx, sy, half = _target(tau, cam)
    col = P.MINT[2]
    if tau < T.DIV[0] + 0.5:
        u = T.S(tau, T.LOCK - 0.33, T.LOCK)
        half = half + (46 - half) * (1 - u)
        if T.LOCK <= tau < T.LOCK + 0.07:
            col, half = P.MINT[4], half + 2
        if tau > T.DIV[0] + 0.2 and int((tau - T.DIV[0] - 0.2) / 0.05) % 2 == 0:
            return
    else:
        u = T.S(tau, 10.95, 11.25)
        half = half + (30 - half) * (1 - u)
        tp = T.POP_T[T.OUR]
        if tp <= tau < tp + 0.25:                              # our colony pops: the bracket pulses
            half += 3 * math.sin(math.pi * (tau - tp) / 0.25)
            col = P.MINT[3]
        left = 15.6 - tau
        if left < 0.25 and int(left / 0.05) % 2 == 0:
            return
    beat = 1 if (tau % T.BEAT) < 0.08 and T.LOCK + 0.15 < tau < T.DIV[0] else 0
    half = int(round(half + beat))
    cx, cy = int(round(sx)), int(round(sy))
    arm = int(min(10, max(3, half * 0.38)))
    for sgx in (-1, 1):
        for sgy in (-1, 1):
            x, y = cx + sgx * half, cy + sgy * half
            for dd, cc in ((1, P.OUTLINE), (0, col)):          # dark edge first, then the mint corner
                _hline(buf, x - sgx * dd, x - sgx * (arm + dd), y + sgy * dd if dd else y, cc)
                _vline(buf, x + sgx * dd if dd else x, y - sgy * dd, y - sgy * (arm + dd), cc)
            _hline(buf, x, x - sgx * arm, y, col)
            _vline(buf, x, y, y - sgy * arm, col)


# ------------------------------------------------------------------ counter, clock, moon
def _count_text(tau):
    k, _ = T.gen_phase(tau)
    return '×' + format(2 ** k, ',')


def _clock(buf, cx, cy, tau):
    for y in range(cy - 7, cy + 8):
        for x in range(cx - 7, cx + 8):
            d = math.hypot(x + 0.5 - (cx + 0.5), y + 0.5 - (cy + 0.5))
            if d < 6.0:
                _put(buf, x, y, P.TEAL[3])
            elif d < 7.0:
                _put(buf, x, y, P.INK)
    for ddx, ddy in ((0, -5), (5, 0), (0, 5), (-5, 0)):
        _put(buf, cx + ddx, cy + ddy, P.TEAL[6])
    hours = 18.0 + T.g_cont(tau) / 3.0                        # 20 minutes per doubling, from 6 pm
    am = (hours % 1.0) * 2 * math.pi
    ah = (hours % 12.0) / 12.0 * 2 * math.pi
    _line(buf, cx, cy, cx + 4.6 * math.sin(am), cy - 4.6 * math.cos(am), P.MINT[3])
    _line(buf, cx, cy, cx + 3.0 * math.sin(ah), cy - 3.0 * math.cos(ah), P.INK)
    _put(buf, cx, cy, P.MINT[4])


def _moon(buf, cx, cy, pop):
    r = 3.6 * pop
    for y in range(cy - 5, cy + 6):
        for x in range(cx - 5, cx + 6):
            d1 = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            d2 = math.hypot(x + 0.5 - (cx + 1.7), y + 0.5 - (cy - 1.2))
            if d1 < r and d2 > r * 0.82:
                _put(buf, x, y, P.CREAM[6])
    if pop >= 1:
        _put(buf, cx + 5, cy - 4, P.INK)
        _put(buf, cx + 7, cy + 1, P.CREAM[5])


def counter(buf, t):
    tau = t % T.TOTAL
    if not T.hud_on(tau):
        return
    left = 15.6 - tau
    if left < 0.25 and int(left / 0.05) % 2 == 0:
        return
    txt = _count_text(tau)
    tw, th = pixfont.text_size(txt, '5x7', 2)
    label = 'TIME-LAPSE'
    lw, lh = pixfont.text_size(label, '3x5')
    w = max(tw, 18 + lw + 12) + 8
    h = 4 + 15 + 3 + th + 4
    x0, y0 = HUD_X, HUD_Y
    sub = buf[y0:y0 + h, x0:x0 + w].astype(np.float32)
    buf[y0:y0 + h, x0:x0 + w] = (sub + (np.asarray(P.TEAL[0], np.float32) - sub) * 0.82).astype(np.uint8)
    for cx_, cy_ in ((x0, y0), (x0 + w - 1, y0), (x0, y0 + h - 1), (x0 + w - 1, y0 + h - 1)):
        buf[cy_, cx_] = (buf[cy_, cx_].astype(np.float32) * 0.4 + np.float32(P.TEAL[2]) * 0.6).astype(np.uint8)
    _hline(buf, x0 + 1, x0 + w - 2, y0 + h - 1, P.MINT[1])
    _clock(buf, x0 + 10, y0 + 11, tau)
    if tau >= T.CYC0 - 0.1:
        n = int((tau - T.CYC0 + 0.1) * 60) + 1
        gfx.fill(buf, pixfont.text_mask(label[:n], x0 + 20, y0 + 9, '3x5'), P.INK)
    if tau >= T.OVERNIGHT:
        pop = min(1.0, (tau - T.OVERNIGHT) / 0.12)
        _moon(buf, x0 + 20 + lw + 7, y0 + 11, pop)
    k, _ = T.gen_phase(tau)
    col = P.INK
    if k >= 1:
        since = tau - T.DIV[k - 1]
        gap = T.DIV[k - 1] - (T.DIV[k - 2] if k >= 2 else T.CYC0)
        if since < 0.07 and gap >= 0.12:
            col = P.MINT[3]
    gfx.fill(buf, pixfont.text_mask(txt, x0 + 4, y0 + 22, '5x7', 'lt', 2), col)


# ------------------------------------------------------------------ reveal effects
def _ring(buf, D, cx, cy, r, col, alpha):
    if r <= 0:
        return
    x0, x1 = max(0, int(cx - r - 2)), min(W, int(cx + r + 3))
    y0, y1 = max(0, int(cy - r - 2)), min(H, int(cy + r + 3))
    if x0 >= x1 or y0 >= y1:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1]
    d = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy)
    m = (np.abs(d - r) < 0.62) & (D[y0:y1, x0:x1] < alpha)
    buf[y0:y1, x0:x1][m] = col


def _bigstar(buf, cx, cy, arm, diag):
    cx, cy = int(round(cx)), int(round(cy))
    dirs = ((1, 1), (-1, 1), (1, -1), (-1, -1)) if diag else ((1, 0), (-1, 0), (0, 1), (0, -1))
    _put(buf, cx, cy, P.WHITE)
    for ddx, ddy in dirs:
        for k in range(1, arm + 1):
            _put(buf, cx + ddx * k, cy + ddy * k, P.WHITE if k <= arm // 2 else P.CREAM[6])


def effects(buf, ctx):
    tau = ctx.t % T.TOTAL
    cam, D = ctx.cam, ctx.D
    if T.POP0 - 0.01 <= tau < T.POP0 + T.POP_LEN + 0.4:
        for i in range(len(T.SEEDS)):
            u = (tau - T.POP_T[i]) / 0.32
            if not 0 <= u < 1:
                continue
            a = colony_radius(i, tau)
            sx, sy = cam.px(T.SEEDS[i, 0], T.SEEDS[i, 1], 0.0)
            mine = i == T.OUR
            _ring(buf, D, sx, sy, a * cam.z + 1.5 + (13 if mine else 8) * u, P.MINT[3] if mine else P.CREAM[7],
                  (1 - u) ** 1.5 * 0.95)
        u = (tau - T.POP_T[T.OUR]) / 0.45
        if 0 <= u < 1:
            sx, sy = cam.px(T.CELL_X, T.CELL_Y, 0.0)
            _bigstar(buf, sx, sy - 1, int(round(8 * (1 - u) + 2)), int(tau * 15) % 2 == 1)
    if 14.0 <= tau < 14.95:                                   # a light sweep across the plate
        pos = -60 + (tau - 14.0) / 0.95 * 520
        proj = (np.arange(W)[None, :] * 0.8 + np.arange(H)[:, None] * 0.6)
        band = np.abs(proj - pos)
        area = ctx.plate_area | getattr(ctx, 'colony_mask', np.zeros((H, W), bool))
        from .world import blend
        blend(buf, area & (band < 10) & (D < 0.65), P.WHITE, 0.32)
        blend(buf, area & (band < 2.5), P.WHITE, 0.45)
