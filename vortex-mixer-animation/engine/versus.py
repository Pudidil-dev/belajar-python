"""The battle screen: DIFFUSION vs VORTEX.

Two panels slide in over the lab. Left: a two-layer tube left alone; a clock races through the days while the boundary
only blurs (molecules drift across it by diffusion, over about a centimetre in days). Right: the vortexed tube, already
orange; its MIX bar fills in seconds. "VS" slams in, then VORTEX WINS!
"""
import math
import numpy as np
from . import gfx, pixfont
from . import world as Wd
from . import timeline as T
from . import tube as TB
from . import fx
from .palette import OUTLINE, WHITE, HUD, CYAN, MIXED, SPARK, BODY, STEEL, LIME

W, H = gfx.W, gfx.H
XC = (np.arange(W) + 0.5)[None, :]
YC = (np.arange(H) + 0.5)[:, None]
S_T = 2.5                                   # tube scale in the panels (px per mm)
TUBE_Y = 372                                # canvas y of the tubes' bottoms


def _box(x0, y0, x1, y1):
    return (XC >= x0) & (XC < x1) & (YC >= y0) & (YC < y1)


def _tube_cam(cx_canvas):
    """A world camera that puts a tube (x = 0, bottom at y = 0) at canvas x cx_canvas, bottom at TUBE_Y."""
    return Wd.Cam((W / 2 - cx_canvas) / S_T, (TUBE_Y - H / 2) / S_T, S_T)


def _clock(buf, cx, cy, r, ang):
    m = (XC - cx) ** 2 + (YC - cy) ** 2
    buf[m <= (r + 2) ** 2] = OUTLINE
    buf[m <= (r + 1) ** 2] = STEEL[2]
    buf[m <= r ** 2] = BODY[4]
    for a, ln in ((ang, 0.85 * r), (ang / 12.0, 0.55 * r)):
        for j in range(int(ln)):
            Wd.dot(buf, cx + j * math.sin(a), cy - j * math.cos(a), OUTLINE)
    Wd.dot(buf, cx, cy, OUTLINE, 2)


def _bar(buf, x, y, frac, col, w=100):
    buf[_box(x - 1, y - 1, x + w + 1, y + 9)] = OUTLINE
    buf[_box(x, y, x + w, y + 8)] = HUD[2]
    n = int(round(w * T.clamp01(frac)))
    if n > 0:
        buf[_box(x, y, x + n, y + 8)] = col
        buf[_box(x, y, x + n, y + 2)] = WHITE


def screen(t):
    buf = np.empty((H, W, 3), np.uint8)
    sh = (t * 40.0) % 28.0
    left = XC < W / 2
    stripes_l = (np.floor((XC + 0.6 * YC + sh) / 14.0) % 2 == 0)
    stripes_r = (np.floor((XC - 0.6 * YC - sh) / 14.0) % 2 == 0)
    buf[:] = HUD[1]
    buf[(left & stripes_l) | (~left & stripes_r)] = HUD[2]
    # the zig-zag divider
    for y in range(H):
        x = W // 2 + int(3 * math.sin(y * 0.21 + t * 18) + 2 * ((y // 6 + int(t * 15)) % 2))
        for dx, col in ((-2, CYAN[1]), (-1, WHITE), (0, WHITE), (1, CYAN[1])):
            if 0 <= x + dx < W:
                buf[y, x + dx] = col
    race = T.u_of(t, T.RACE)
    # left: diffusion
    pixfont.draw_text(buf, 'DIFFUSION', 67, 30, CYAN[2], anchor='mt', scale=2)
    pixfont.draw_text(buf, 'LEFT ALONE', 67, 52, BODY[2], anchor='mt')
    _clock(buf, 67, 96, 15, 2 * math.pi * 4.0 * max(0.0, t - T.RACE[0]))
    day = 1 + min(2, int(3 * race))
    pixfont.draw_text(buf, 'DAY %d' % day, 67, 118, WHITE, anchor='mt')
    TB.draw(buf, _tube_cam(67), t, 0.0, -1.0, 0.0, st=(0.0, 0.0, 0.0, 0.0), hand=False, particles=False,
            diff=0.6 + 9.0 * race)
    for j in range(3):                                          # z z z
        ph = (t * 0.7 + j / 3.0) % 1.0
        x = 80 + 10 * ph + 3 * math.sin(ph * 9)
        y = 262 - 60 * ph
        if ph < 0.85:
            pixfont.draw_text(buf, 'Z', x, y, WHITE, anchor='mm', scale=2 if j % 2 else 1)
    # right: vortex
    pixfont.draw_text(buf, 'VORTEX', 203, 30, MIXED[3], anchor='mt', scale=2)
    pixfont.draw_text(buf, 'MIXER', 203, 52, BODY[2], anchor='mt')
    pixfont.draw_text(buf, '3 SEC', 203, 90, WHITE, anchor='mt', scale=2)
    pixfont.draw_text(buf, 'SECONDS!', 203, 118, LIME[2], anchor='mt')
    TB.draw(buf, _tube_cam(203), t, 0.0, -1.0, 0.0, st=(1.0, 0.0, 0.0, 0.0), hand=False, particles=False)
    # the race bars
    pixfont.draw_text(buf, 'MIX', 17, 392, WHITE, font='3x5', outline=None)
    _bar(buf, 17, 400, 0.5 * race, CYAN[1])
    pixfont.draw_text(buf, '%d%%' % int(50 * race), 117, 412, WHITE, font='3x5', anchor='rt', outline=None)
    full = T.ease_out(T.u_of(t, (T.VS_SLAM + 0.25, T.VS_SLAM + 0.6)), 2.0)
    pixfont.draw_text(buf, 'MIX', 153, 392, WHITE, font='3x5', outline=None)
    _bar(buf, 153, 400, full, MIXED[2])
    pixfont.draw_text(buf, '%d%%' % int(100 * full), 253, 412, WHITE, font='3x5', anchor='rt', outline=None)
    if t >= T.WIN:                                              # the winner
        u = t - T.WIN
        buf[_box(0, 212, W, 252)] = OUTLINE
        buf[_box(0, 214, W, 250)] = HUD[0]
        col = SPARK[1] if int(t * 8) % 2 == 0 else WHITE
        pixfont.draw_text(buf, 'VORTEX WINS!', W // 2, 232, col, anchor='mm', scale=3 if u < 0.07 else 2)
        for j in range(8):
            ph = (u * 1.6 + j * 0.29) % 1.0
            n = (0, 1, 2, 2, 1, 0)[int(ph * 6)]
            fx.twinkle(buf, 160 + 86 * ((j * 0.37) % 1.0), 150 + 200 * ((j * 0.61) % 1.0), n)
    elif t >= T.VS_SLAM:                                        # V S
        u = t - T.VS_SLAM
        sc = 6 if u < 0.05 else (5 if u < 0.1 else 4)
        col = SPARK[1] if int(t * 8) % 2 == 0 else WHITE
        pixfont.draw_text(buf, 'VS', W // 2 + 2, 234, col, anchor='mm', scale=sc, shadow=HUD[0])
        if u < 0.2:
            fx.burst(buf, W // 2, 234, u / 0.2, 26, 60, SPARK[2])
    return buf


def frame(t, lab_frame):
    """The battle screen; its two halves slide in over the lab and slide back out."""
    k_in = T.ease_out(T.u_of(t, T.VS_IN), 2.0)
    k_out = T.ease_in(T.u_of(t, T.VS_OUT), 2.0)
    scr = screen(t)
    if k_in >= 1 and k_out <= 0:
        return scr
    out = lab_frame(t)
    half = W // 2
    off = int(round(half * (1 - k_in) + half * k_out))
    if half - off > 0:
        out[:, :half - off] = scr[:, off:half]
        out[:, half + off:] = scr[:, half:W - off]
    return out
