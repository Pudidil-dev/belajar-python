"""The operating room seen from the side (world units: cm, y up, the floor at 0, the ceiling at 300).

The table runs left to right with the patient under teal-blue drapes; the prepped skin shows through a window in the
drape at the surgical field. Two surgeons stand on the far side of the table, facing us (caps, masks and gowns: only
their eyes show), and work at the field. A vital-signs monitor stands at the head end (left), and a monitor on a
ceiling boom hangs at the right (it shows the keyhole camera's picture in endo mode).
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from .palette import (OUTLINE, WALL, CEIL, FLOOR, STEEL, DRAPE, GOWN, CAP, MASK, SKIN, GLOVE, FIELD, INSTR, MONITOR,
                      ECG, SCOPE)

W, H = gfx.W, gfx.H
BAYER = gfx.BAYER[:H, :W]
FIELD_X = (5.0, 27.0)                     # the drape window (the prepped skin)
FIELD_Y = 119.0                           # its surface


def drape_top(x):
    """Height of the draped patient's outline above the floor."""
    x = np.asarray(x, np.float64)
    torso = 22.0 * T_bump(x, -70.0, 55.0, 18.0)
    legs = 14.0 * T_bump(x, 40.0, 110.0, 14.0)
    return 97.0 + np.maximum(torso, legs)


def T_bump(x, a, b, soft):
    return np.clip((x - a) / soft, 0, 1) ** 0.6 * np.clip((b - x) / soft, 0, 1) ** 0.6


# ---------------------------------------------------------------- the people
SURGEONS = ((-22.0, 'A'), (52.0, 'B'))


def head_pos(who, t):
    """Centre and radius of a surgeon's head (A leans in under the lamp in bars 3-4)."""
    bob = 0.6 * math.sin(T.wob(13) * t + (0.0 if who == 'A' else 1.7))
    if who == 'A':
        k = T.lean(t)
        return -22.0 + 25.0 * k, 168.0 + bob - 8.0 * k, 11.0
    return 52.0, 168.0 + bob, 11.0


def shoulders(who, t):
    hx, hy, r = head_pos(who, t)
    base = -22.0 if who == 'A' else 52.0
    return base + 0.55 * (hx - base), hy - 21.0


def hands(who, t):
    """Where a surgeon's two hands are (working at the field: a small, looping movement)."""
    ph = T.wob(9) * t + (0.0 if who == 'A' else 2.1)
    if who == 'A':
        return ((8.0 + 1.5 * math.sin(ph), 121.5 + 0.8 * math.sin(2 * ph)),
                (15.0 + 1.2 * math.sin(ph + 1.3), 122.5 + 0.6 * math.cos(ph)))
    return ((22.0 + 1.2 * math.sin(ph + 0.4), 122.0 + 0.7 * math.cos(2 * ph)),
            (29.0 + 1.0 * math.sin(ph + 2.0), 121.0))


def draw_body(buf, c, who, t):
    """The gown from the shoulders down (the table and the drapes hide the rest)."""
    sx, sy = shoulders(who, t)
    base = -22.0 if who == 'A' else 52.0
    pts = [(sx - 23.0, sy), (sx + 23.0, sy), (base + 26.0, 40.0), (base - 26.0, 40.0)]
    m = Wd.poly(c, pts)
    gfx_fill(buf, m, GOWN[1])
    # folds and a soft shade on the side away from the lamp
    fold = m & (np.abs(np.mod(c.X - base + 0.3 * (c.Y - sy), 9.0) - 4.5) < 0.6)
    buf[fold] = GOWN[0]
    lit = m & (c.X < sx - 10.0) & (BAYER < 0.4)
    buf[lit] = GOWN[2]
    neck = Wd.poly(c, [(sx - 7.0, sy + 0.5), (sx + 7.0, sy + 0.5), (sx, sy - 8.0)])
    buf[full(neck)] = GOWN[0]
    buf[Wd.edge(m)] = OUTLINE


def draw_head(buf, c, who, t):
    """Cap, mask and the eyes between them."""
    hx, hy, r = head_pos(who, t)
    face = Wd.ellipse(c, hx, hy, 9.6, 11.0)
    buf[full(face)] = SKIN[1]
    buf[full(face & (c.X > hx + 4.0) & (BAYER < 0.5))] = SKIN[0]
    cap = Wd.ellipse(c, hx, hy + 1.5, 11.0, 11.4) & (c.Y > hy + 1.8)
    buf[full(cap)] = CAP[1]
    buf[full(cap & (c.Y > hy + 8.0) & (c.X < hx))] = CAP[2]
    buf[full(cap & (np.abs(c.Y - hy - 2.6) < 0.8))] = CAP[0]
    mask = face & (c.Y < hy - 3.2)
    buf[full(mask)] = MASK[1]
    buf[full(mask & (np.abs(np.mod(c.Y - hy, 2.6) - 1.3) < 0.35))] = MASK[0]
    for ex in (-3.6, 3.6):
        buf[full(Wd.ellipse(c, hx + ex, hy - 0.6, 1.25, 1.1))] = OUTLINE
    buf[Wd.edge(face | cap)] = OUTLINE


def draw_arms(buf, c, who, t):
    """Sleeves from the shoulders to the hands at the field, gloved hands."""
    sx, sy = shoulders(who, t)
    for k, (hx, hy) in enumerate(hands(who, t)):
        side = -1 if k == 0 else 1
        if who == 'B':
            side = -side
        shx = sx + side * 16.0
        ex, ey = (shx + hx) / 2 - side * 3.0, (sy + hy) / 2 - 4.0
        m = Wd.band(c, (shx, sy - 2.0), unit(ex - shx, ey - sy + 2.0), 0, dist(shx, sy - 2.0, ex, ey), 5.2, 4.6)
        m |= Wd.band(c, (ex, ey), unit(hx - ex, hy - ey), 0, dist(ex, ey, hx, hy) - 2.0, 4.6, 3.8)
        buf[full(m)] = GOWN[2]
        buf[full(m & (BAYER < 0.3))] = GOWN[3]
        buf[Wd.edge(m)] = OUTLINE
        g = Wd.ellipse(c, hx, hy, 3.8, 2.6)
        buf[full(g)] = GLOVE[1]
        buf[full(g & (c.Y > hy + 0.6))] = GLOVE[2]
        buf[Wd.edge(g)] = OUTLINE


# ---------------------------------------------------------------- the room
def draw_room(buf, c, t):
    """Walls (with their tiles), the ceiling, the floor, the vital-signs monitor at the head end and the boom monitor."""
    X, Y = np.broadcast_arrays(c.X, c.Y)
    buf[:] = WALL[2]
    tiles = (np.abs(np.mod(X + 7.0, 30.0) - 15.0) > 14.4) | (np.abs(np.mod(Y, 30.0) - 15.0) > 14.4)
    buf[tiles] = WALL[1]
    low = Y < 60.0
    buf[low & (BAYER < 0.25 + 0.5 * np.clip((60.0 - Y) / 60.0, 0, 1))] = WALL[1]
    buf[(Y >= 0.0) & (Y < 9.0)] = WALL[0]
    buf[Y < 0.0] = FLOOR[1]
    buf[(Y < 0.0) & (BAYER < 0.3)] = FLOOR[0]
    ceil = Y > 292.0
    buf[ceil] = CEIL[1]
    buf[(Y > 292.0) & (Y < 293.2)] = WALL[0]
    buf[ceil & (np.abs(np.mod(X, 60.0) - 30.0) > 29.0)] = CEIL[0]
    # laminar-flow ceiling panel above the table (a soft, brighter field)
    lam = (Y > 292.0) & (np.abs(X - 15.0) < 70.0)
    buf[lam & (BAYER < 0.5)] = CEIL[2]
    draw_vitals(buf, c, t)
    draw_boom_monitor(buf, c, t)


def draw_vitals(buf, c, t):
    """A vital-signs monitor on a pole at the head end: its green trace beats with the music."""
    pole = Wd.rect(c, -59.5, -56.5, 0.0, 196.0)
    buf[full(pole)] = STEEL[1]
    buf[Wd.edge(pole)] = OUTLINE
    box = Wd.rect(c, -74.0, -42.0, 194.0, 218.0)
    buf[full(box)] = MONITOR[2]
    scr = Wd.rect(c, -72.0, -44.0, 196.5, 215.5)
    buf[full(scr)] = MONITOR[0]
    buf[Wd.edge(box)] = OUTLINE
    # the trace: a beat every 0.625 s, scrolling left
    n = 60
    pts = []
    for k in range(n + 1):
        x = -71.0 + 26.0 * k / n
        ph = (t - (x + 71.0) / 26.0 * 1.25) / T.BEAT
        f = ph - math.floor(ph)
        y = 204.0 + (7.0 * math.exp(-((f - 0.12) / 0.025) ** 2) - 2.0 * math.exp(-((f - 0.18) / 0.03) ** 2)
                     + 1.2 * math.exp(-((f - 0.45) / 0.07) ** 2))
        pts.append(c.to(x, y))
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        line(buf, x0, y0, x1, y1, ECG)


def draw_boom_monitor(buf, c, t):
    """A monitor on a ceiling boom at the right; dark until endo mode, when it shows the keyhole camera's picture."""
    boom = Wd.rect(c, 85.0, 89.0, 222.0, 300.0)
    buf[full(boom)] = STEEL[1]
    buf[Wd.edge(boom)] = OUTLINE
    box = Wd.rect(c, 62.0, 98.0, 198.0, 224.0)
    buf[full(box)] = MONITOR[2]
    buf[Wd.edge(box)] = OUTLINE
    buf[full(Wd.rect(c, 64.0, 96.0, 200.0, 222.0))] = MONITOR[0]


def draw_scope_picture(buf, c, t, k):
    """The keyhole camera's picture on the boom monitor (k: how far it is on). Soft folds, an instrument tip; no
    wound."""
    if k <= 0.0:
        return
    scr = Wd.rect(c, 64.0, 96.0, 200.0, 222.0)
    on = full(scr) & (BAYER < k)
    view = full(Wd.ellipse(c, 80.0, 211.0, 13.0, 10.5)) & on
    X, Y = np.broadcast_arrays(c.X, c.Y)
    buf[view] = SCOPE[1]
    fold = view & (np.sin((X - 80.0) * 0.55 + np.sin((Y - 211.0) * 0.4) * 1.6 + t * 0.8) > 0.45)
    buf[fold] = SCOPE[2]
    buf[view & (np.hypot(X - 75.0, Y - 214.0) < 3.0)] = SCOPE[3]
    buf[view & (((X - 80.0) / 13.0) ** 2 + ((Y - 211.0) / 10.5) ** 2 > 0.75)] = SCOPE[0]
    tip = view & Wd.band(c, (95.0, 204.0), unit(-1.0, 0.45), 0.0, 13.0 + 1.5 * math.sin(t * 3.0), 0.9)
    buf[tip] = INSTR[1]


# ---------------------------------------------------------------- the table and the drapes
def draw_table(buf, c, t):
    base = Wd.rect(c, -32.0, 32.0, 0.0, 6.0)
    pillar = Wd.rect(c, -10.0, 10.0, 6.0, 86.0)
    top = Wd.rect(c, -125.0, 125.0, 86.0, 92.0)
    for m, col in ((base, STEEL[1]), (pillar, STEEL[2]), (top, STEEL[1])):
        buf[full(m)] = col
        buf[Wd.edge(m)] = OUTLINE
    buf[full(pillar & (c.X < -4.0))] = STEEL[3]
    X, Y = np.broadcast_arrays(c.X, c.Y)
    # the draped patient: the mound on the table, and the drape hanging over the near side
    mound = (Y >= 92.0) & (Y <= drape_top(X)) & (np.abs(X) < 125.0)
    hang = (Y >= 56.0) & (Y < 97.0) & (np.abs(X) < 124.0)
    hang_wave = 56.0 + 1.6 * np.sin(X * 0.35)
    hang &= Y >= hang_wave
    buf[hang] = DRAPE[1]
    folds = hang & (np.abs(np.mod(X + 2.0 * np.sin(Y * 0.12), 13.0) - 6.5) < 0.8)
    buf[folds] = DRAPE[0]
    buf[hang & (Y < hang_wave + 1.4)] = DRAPE[0]
    buf[mound] = DRAPE[2]
    buf[mound & (Y > drape_top(X) - 2.2)] = DRAPE[3]
    buf[mound & (BAYER < 0.12)] = DRAPE[1]
    buf[Wd.edge(mound | hang)] = OUTLINE
    # the ether screen at the head end
    scr = Wd.rect(c, -67.0, -59.0, 97.0, 158.0) | Wd.ellipse(c, -63.0, 158.0, 4.0, 3.0)
    buf[full(scr)] = DRAPE[1]
    buf[full(scr & (c.X < -64.0))] = DRAPE[2]
    buf[Wd.edge(scr)] = OUTLINE
    # the drape window: the prepped skin at the surgical field
    win_ = (X > FIELD_X[0]) & (X < FIELD_X[1]) & (Y > drape_top(X) - 1.6) & (Y <= drape_top(X) + 0.6)
    buf[win_] = FIELD[1]
    buf[win_ & (Y > drape_top(X) - 0.4)] = FIELD[2]
    # instruments laid on the drape
    for x0, x1, y_ in ((33.0, 44.0, 0.9), (35.0, 47.0, 2.2)):
        m = (X > x0) & (X < x1) & (np.abs(Y - drape_top(X) - y_) < 0.55)
        buf[m] = INSTR[1]


# ---------------------------------------------------------------- small helpers
def full(m):
    return Wd.full(m)


def gfx_fill(buf, m, col):
    buf[full(m)] = col


def unit(dx, dy):
    n = math.hypot(dx, dy) or 1.0
    return dx / n, dy / n


def dist(x0, y0, x1, y1):
    return math.hypot(x1 - x0, y1 - y0)


def line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        k = i / max(n, 1)
        Wd.dot(buf, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, col)
