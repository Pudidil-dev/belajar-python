"""The game layer: the hook title, the HUD (RPM and MIX meters), pop-up words, small labels next to the parts they name,
and the top-view window that shows the cup's orbit.

Text is a 5x7 (or 3x5) pixel font in white with a 1-px dark outline. Labels type themselves in and sit next to the thing
they name, with a thin leader line; the HUD is a small panel in the corner, like a game's status box.
"""
import math
import numpy as np
from . import gfx, pixfont
from . import world as Wd
from . import timeline as T
from . import mixer, tube as TB
from .palette import OUTLINE, WHITE, HUD, CYAN, MIXED, RUBBER, LIME, SPARK, BODY

W, H = gfx.W, gfx.H
XC = (np.arange(W) + 0.5)[None, :]
YC = (np.arange(H) + 0.5)[:, None]
CPS = 45.0


def circ(cx, cy, r):
    return (XC - cx) ** 2 + (YC - cy) ** 2 <= r * r


def box(x0, y0, x1, y1):
    return (XC >= x0) & (XC < x1) & (YC >= y0) & (YC < y1)


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0)))
    for i in range(n + 1):
        x = int(round(x0 + (x1 - x0) * i / max(n, 1)))
        y = int(round(y0 + (y1 - y0) * i / max(n, 1)))
        if 0 <= x < W and 0 <= y < H:
            buf[y, x] = col


def pop_scale(t, t0):
    """A pop-in: one frame big, then settle (the classic game text bounce)."""
    u = t - t0
    return 3 if u < 0.07 else 2


# ---------------------------------------------------------------- hook title
def title(buf, t):
    if not (T.TITLE[0] <= t < T.TITLE[1]):
        return
    for i, (word, t0, y) in enumerate((('ONE TOUCH.', T.CONTACT + 0.12, 34), ('ONE VORTEX.', T.CONTACT + 0.62, 56))):
        if t < t0:
            continue
        sc = 3 if t - t0 < 0.06 else 2
        out = T.TITLE[1] - t
        yy = y - (0 if out > 0.12 else int((0.12 - out) * 300))
        pixfont.draw_text(buf, word, W // 2, yy, WHITE if i == 0 else SPARK[1], anchor='mt', scale=sc,
                          shadow=HUD[0])


# ---------------------------------------------------------------- HUD panel
def _bar(buf, x, y, n_on, n=10, col=CYAN[1], col_hi=CYAN[2]):
    for k in range(n):
        m = box(x + 4 * k, y, x + 4 * k + 3, y + 5)
        buf[m] = (col_hi if k == n_on - 1 else col) if k < n_on else HUD[2]


HUD_SHOWN = ((T.HUD_IN, 4.3), (8.6, 15.8))          # only while the meters have something to say


def panel(buf, t):
    k = 0.0
    for a, b in HUD_SHOWN:
        if a <= t < b:
            k = T.ease_out(T.u_of(t, (a, a + 0.2)), 2.0) * (1 - T.ease_in(T.u_of(t, (b - 0.2, b)), 2.0))
    if k <= 0:
        return
    x0 = int(round(-100 + 106 * k))
    y0 = 8
    buf[box(x0 - 1, y0 - 1, x0 + 97, y0 + 25)] = OUTLINE
    buf[box(x0, y0, x0 + 96, y0 + 24)] = HUD[1]
    buf[box(x0, y0, x0 + 96, y0 + 1)] = CYAN[1]
    rpm = T.rpm(t)
    pixfont.draw_text(buf, 'RPM', x0 + 4, y0 + 5, CYAN[2], font='3x5', outline=None)
    _bar(buf, x0 + 20, y0 + 5, int(math.ceil(10 * rpm / T.RPM_MAX - 1e-6)))
    pixfont.draw_text(buf, '%4d' % (int(round(rpm / 10.0)) * 10), x0 + 92, y0 + 5, WHITE, font='3x5', anchor='rt',
                      outline=None)
    mx = T.mix(t)
    pct = int(round(100 * mx))
    pixfont.draw_text(buf, 'MIX', x0 + 4, y0 + 14, MIXED[3], font='3x5', outline=None)
    full = pct >= 100 and (t * 6) % 1.0 < 0.5
    _bar(buf, x0 + 20, y0 + 14, int(math.ceil(10 * mx - 1e-6)), col=MIXED[2] if not full else WHITE, col_hi=MIXED[3])
    pixfont.draw_text(buf, '%3d%%' % pct, x0 + 92, y0 + 14, WHITE, font='3x5', anchor='rt', outline=None)


# ---------------------------------------------------------------- labels next to things
def label(buf, cam_to, text, anchor, t, t0, t1, off=(10, -14), side='l', lead=True):
    if not (t0 <= t < t1):
        return
    ax, ay = cam_to(*anchor)
    w, h = pixfont.text_size(text)
    dx, dy = off
    x = ax + dx if side == 'l' else (ax + dx - w if side == 'r' else ax + dx - w / 2)
    y = ay + dy - h / 2
    x = int(round(min(max(x, 4), W - 4 - w)))
    y = int(round(min(max(y, 4), H - 4 - h)))
    if lead and 0 <= ax < W and 0 <= ay < H:
        cx = min(max(ax, x - 2), x + w + 1)
        cy = min(max(ay, y - 2), y + h + 1)
        if math.hypot(cx - ax, cy - ay) > 4:
            _line(buf, ax, ay, cx, cy, CYAN[2])
            buf[int(ay), int(ax)] = WHITE
    n = int((t - t0) * CPS) + 1
    shown = text[:n]
    if shown.strip():
        pixfont.draw_text(buf, shown, x, y, WHITE)


def pop(buf, text, x, y, t, t0, t1, col=WHITE):
    if not (t0 <= t < t1):
        return
    u = (t1 - t)
    yy = y - int(6 * T.ease_out(T.u_of(t, (t0, t0 + 0.25)), 2.0))
    if u < 0.12 and int(t * 20) % 2:
        return                                                   # blink out
    pixfont.draw_text(buf, text, x, yy, col, anchor='mm', scale=pop_scale(t, t0), shadow=HUD[0])


# ---------------------------------------------------------------- the orbit window (top view)
def orbit_window(buf, t):
    t0, t1 = T.ORBIT_BOX
    if not (t0 <= t < t1):
        return
    k = T.back_out(T.u_of(t, (t0, t0 + 0.18)), 1.6) * (1 - T.ease_in(T.u_of(t, (t1 - 0.15, t1)), 2.0))
    R = 46.0 * k
    if R < 2:
        return
    cx, cy = 196.0, 118.0
    buf[circ(cx, cy, R + 2)] = OUTLINE
    buf[circ(cx, cy, R + 1)] = CYAN[1]
    buf[circ(cx, cy, R)] = HUD[0]
    if k < 0.8:
        return
    ph = 2 * math.pi * 1.1 * (t - t0)
    orb = 9.0
    for j in range(24):                                          # the orbit path, dotted
        a = j * 2 * math.pi / 24
        if j % 2 == 0:
            Wd.dot(buf, cx + orb * math.cos(a), cy + orb * math.sin(a), CYAN[1])
    ux, uy = cx + orb * math.cos(ph), cy + orb * math.sin(ph)
    buf[circ(ux, uy, 24.5)] = OUTLINE
    buf[circ(ux, uy, 23.5)] = RUBBER[2]
    buf[circ(ux, uy, 17)] = RUBBER[0]
    buf[circ(ux - 4, uy - 5, 6) & circ(ux, uy, 23.5) & ~circ(ux, uy, 17.5)] = RUBBER[3]
    for j in range(10):                                          # an arrow on the cup: it keeps pointing up
        Wd.dot(buf, ux, uy + 9 - 2 * j, LIME[2], 2)
    for j in range(4):
        Wd.dot(buf, ux - j, uy - 9 + j, LIME[2], 2)
        Wd.dot(buf, ux + j, uy - 9 + j, LIME[2], 2)
    Wd.dot(buf, cx, cy, WHITE, 2)
    pixfont.draw_text(buf, 'ORBIT 4MM', cx, cy + R + 6, WHITE, anchor='mt')
    pixfont.draw_text(buf, 'NO SPIN', cx, cy - R - 6, LIME[2], anchor='mb')
    pixfont.draw_text(buf, 'TOP VIEW', cx, cy + R - 12, CYAN[1], font='3x5', anchor='mt', outline=None)


def draw(buf, cam, t, tc, xr):
    title(buf, t)
    panel(buf, t)
    pop(buf, 'TOUCH!', 70, 300, t, T.CONTACT + 0.05, T.CONTACT + 0.8, LIME[2])
    if tc is not None:
        x, y = tc.to(TB.RI + 6, TB.H0 + 4)
        pop(buf, 'VORTEX!', min(x + 30, W - 40), y, t, 2.05, 2.95, SPARK[1])
    if xr:
        an = mixer.anchors(t)
        label(buf, cam.to, 'MOTOR', an['motor'], t, 4.55, 5.95, off=(-10, -16), side='r')
        label(buf, cam.to, 'TOUCH SWITCH', an['switch'], t, 4.75, 5.95, off=(-26, -26), side='m')
        label(buf, cam.to, 'SPRING', an['spring'], t, 4.95, 5.95, off=(-12, -10), side='r')
        label(buf, cam.to, 'OFFSET CAM', an['cam'], t, 6.45, 8.0, off=(16, 26), side='l')
    orbit_window(buf, t)
    if tc is not None:
        mx, D, tilt, ph = TB.state(t)
        tip = TB.H0 + 0.33 * D - D
        label(buf, tc.to, 'VORTEX', (TB.RI * 0.35, max(tip + 6, 4)), t, 8.85, 10.1, off=(30, -30), side='l')
        label(buf, tc.to, 'STRETCH', (-TB.RI * 0.5, TB.VI - 2), t, 10.65, 11.95, off=(-6, -44), side='m')
        label(buf, tc.to, 'DYE MIXING', (-3.2, TB.VI - 1), t, 12.5, 13.65, off=(0, -70), side='m', lead=False)
    if T.MIXED_AT <= t < T.MIXED_AT + 1.6:
        u = t - T.MIXED_AT
        if u > 1.4 and int(t * 20) % 2:
            return
        sc = 3 if u < 0.07 else 2
        pixfont.draw_text(buf, 'MIXED!', W // 2, 74 - int(8 * T.ease_out(min(u / 0.2, 1), 2)), MIXED[3], anchor='mm',
                          scale=sc, shadow=HUD[0])
