"""The lab behind the mixer, in three parallax layers.

Far: a teal tile wall with a window, a clock and a poster. Middle: a wooden shelf with flasks (one of them bubbling).
Near: the bench, with a beaker and a white tube rack. The far layers move and zoom less than the bench, so every camera
move has depth. While the mixer runs, the rack's tubes rattle.
"""
import math
import numpy as np
from . import world as Wd
from . import timeline as T
from . import pixfont
from .palette import (OUTLINE, WHITE, WALL, BENCH, WOOD, BODY, GLASS, STEEL, GREEN, PINK, AMBER, CYAN, SKY, RED,
                      YELLOW, MIXED, LIME)

HOME = (0.0, 105.0, 1.6)            # the framing the layers are laid out for
RACK_X = (56.0, 92.0)
RACK_HOLES = (61.0, 69.0, 77.0, 85.0)
RACK_SLOT = 2                       # the empty hole our tube goes into


def layer(cam, p):
    """The camera for a layer at depth p (1 = the bench's plane; smaller = farther: it pans and zooms less)."""
    cx0, cy0, s0 = HOME
    return Wd.Cam(cam.cx * p, cy0 + (cam.cy - cy0) * p, s0 * (cam.s / s0) ** p)


def _fill(buf, m, col):
    buf[Wd.full(m)] = col


def _hash(a, b):
    return ((np.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1.0 + 1.0) % 1.0


def wall(buf, cam, t):
    c = layer(cam, 0.35)
    X, Y = np.broadcast_arrays(c.X, c.Y)
    tile = 16.0
    gx, gy = np.floor(X / tile), np.floor(Y / tile)
    buf[:] = WALL[2]
    h = _hash(gx, gy)
    buf[(h < 0.22) & Wd.CHECK] = WALL[1]
    buf[(h > 0.85) & Wd.CHECK] = WALL[3]
    px = 1.0 / c.s
    lx = (X / tile - gx) * tile < 1.2 * px                      # the tile's left edge (grout)
    ly = (gy + 1 - Y / tile) * tile < 1.2 * px                  # its top edge
    hi_x = ((X / tile - gx) * tile >= 1.2 * px) & ((X / tile - gx) * tile < 2.4 * px)
    buf[hi_x & ~ly] = WALL[3]
    buf[lx | ly] = WALL[0]
    # a window with sky and a drifting cloud
    win = Wd.rect(c, -66, -24, 168, 236)
    _fill(buf, Wd.rect(c, -69, -21, 165, 239), BODY[2])
    _fill(buf, win, SKY[1])
    _fill(buf, win & (c.Y > 214) & Wd.CHECK, SKY[0])
    _fill(buf, win & (c.Y < 186) & Wd.CHECK, SKY[2])
    cx = -60 + ((t * 2.2) % 50.0)
    for dx, dy, r in ((0, 0, 5), (5, 2, 6), (11, 0, 4.5)):
        _fill(buf, win & Wd.circle(c, cx + dx, 200 + dy, r), WHITE)
    _fill(buf, Wd.rect(c, -46, -44, 168, 236) | Wd.rect(c, -66, -24, 201, 203), BODY[3])
    buf[Wd.edge(Wd.rect(c, -69, -21, 165, 239))] = OUTLINE
    # a clock (the second hand ticks)
    ccx, ccy, r = 42.0, 214.0, 13.0
    _fill(buf, Wd.circle(c, ccx, ccy, r + 1.6), STEEL[1])
    _fill(buf, Wd.circle(c, ccx, ccy, r), BODY[4])
    for k in range(12):
        a = k * math.pi / 6
        _fill(buf, Wd.circle(c, ccx + 0.82 * r * math.sin(a), ccy + 0.82 * r * math.cos(a), 0.9), STEEL[1])
    for ang, ln, w, col in ((300.0, 0.5, 1.2, OUTLINE), (60.0 + 6 * t, 0.75, 0.9, OUTLINE),
                            (6.0 * math.floor(t), 0.85, 0.5, LIME[1])):
        a = math.radians(ang)
        _fill(buf, Wd.band(c, (ccx, ccy), (math.sin(a), math.cos(a)), 0, ln * r, w), col)
    buf[Wd.edge(Wd.circle(c, ccx, ccy, r + 1.6))] = OUTLINE
    # a poster: a swirl and MIX IT!
    _fill(buf, Wd.rect(c, -6, 26, 178, 230), BODY[4])
    sw = np.zeros((1, 1), bool)
    for k in range(40):
        a = k * 0.42
        rr = 0.35 * k
        sw = sw | Wd.circle(c, 10 + rr * math.cos(a), 210 + rr * math.sin(a), 1.4)
    _fill(buf, sw & Wd.rect(c, -6, 26, 178, 230), MIXED[1])
    buf[Wd.edge(Wd.rect(c, -6, 26, 178, 230))] = OUTLINE
    if c.s >= 1.0:
        x0, y0 = c.to(10, 189)
        pixfont.draw_text(buf, 'MIX IT!', x0, y0, OUTLINE, font='3x5', anchor='mm', outline=None)


def shelf(buf, cam, t):
    c = layer(cam, 0.65)
    _fill(buf, Wd.rect(c, -110, 110, 124, 129), WOOD[2])
    _fill(buf, Wd.rect(c, -110, 110, 124, 125.2), WOOD[3])
    _fill(buf, Wd.rect(c, -110, 110, 121.5, 124), WOOD[0])
    for bx in (-80.0, 80.0):
        _fill(buf, Wd.poly(c, [(bx - 2, 121.5), (bx + 2, 121.5), (bx + 2, 108), (bx - 2, 114)]), WOOD[1])
    buf[Wd.edge(Wd.rect(c, -110, 110, 121.5, 129))] = OUTLINE
    # an Erlenmeyer flask with green liquid that bubbles
    ex, base = -66.0, 129.0
    flask = Wd.poly(c, [(ex - 12, base), (ex + 12, base), (ex + 3.5, base + 22), (ex + 3.5, base + 30),
                        (ex - 3.5, base + 30), (ex - 3.5, base + 22)])
    liq = flask & (c.Y < base + 12)
    _fill(buf, flask & Wd.CHECK, GLASS[2])
    _fill(buf, liq, GREEN[1])
    _fill(buf, liq & (c.Y > base + 10.6), GREEN[2])
    ta = T.anim(t, 12)
    for k in range(4):
        ph = (ta * 0.9 + k * 0.27) % 1.0
        bx_ = ex - 5 + 3.3 * k + 0.8 * math.sin(ta * 4 + k)
        _fill(buf, Wd.circle(c, bx_, base + 1.5 + 10 * ph, 0.9 + 0.5 * ph) & liq, GREEN[2])
    buf[Wd.edge(flask)] = GLASS[1]
    # a round-bottom flask with pink liquid on a cork ring
    rx_, ry_ = -44.0, base + 9.5
    rb = Wd.circle(c, rx_, ry_, 8.5) | Wd.rect(c, rx_ - 2.6, rx_ + 2.6, ry_, ry_ + 16)
    _fill(buf, Wd.rect(c, rx_ - 6, rx_ + 6, base, base + 2), WOOD[3])
    _fill(buf, rb & Wd.CHECK, GLASS[2])
    _fill(buf, rb & (c.Y < ry_ + 1) & Wd.circle(c, rx_, ry_, 8.5), PINK[1])
    _fill(buf, rb & (c.Y < ry_ + 1) & (c.Y > ry_ - 0.3) & Wd.circle(c, rx_, ry_, 8.5), PINK[2])
    buf[Wd.edge(rb)] = GLASS[1]
    # a brown bottle and a graduated cylinder
    bt = Wd.rect(c, 46, 60, base, base + 22) | Wd.rect(c, 50, 56, base + 22, base + 27)
    _fill(buf, bt, AMBER[0])
    _fill(buf, Wd.rect(c, 47.5, 49.5, base + 3, base + 19), AMBER[1])
    _fill(buf, Wd.rect(c, 49.5, 56.5, base + 27, base + 30), OUTLINE)
    _fill(buf, Wd.rect(c, 48, 58, base + 7, base + 15), BODY[4])
    buf[Wd.edge(bt)] = OUTLINE
    cy_ = Wd.rect(c, 67, 75, base, base + 34) | Wd.rect(c, 64, 78, base, base + 2)
    _fill(buf, cy_ & Wd.CHECK, GLASS[2])
    _fill(buf, Wd.rect(c, 68, 74, base + 2, base + 20), CYAN[1])
    _fill(buf, Wd.rect(c, 68, 74, base + 19, base + 20), CYAN[2])
    for k in range(6):
        _fill(buf, Wd.rect(c, 70.5, 74, base + 6 + 4.5 * k, base + 6.6 + 4.5 * k), GLASS[1])
    buf[Wd.edge(cy_)] = GLASS[1]


def bench(buf, cam, t):
    c = cam
    _fill(buf, c.Y < 0, BENCH[1])
    _fill(buf, (c.Y < -1.5) & (c.Y > -6), BENCH[2])
    _fill(buf, (c.Y <= 0) & (c.Y > -1.5), BENCH[4])
    _fill(buf, (c.Y < -6) & (c.Y > -7.2), OUTLINE)
    for x0 in (-140.0, -40.0, 60.0):                        # cabinet doors and handles
        _fill(buf, Wd.rect(c, x0 + 2, x0 + 96, -120, -12) & ~Wd.rect(c, x0 + 3.2, x0 + 94.8, -118.8, -13.2), BENCH[0])
        _fill(buf, Wd.rect(c, x0 + 44, x0 + 54, -22, -19), STEEL[2])


def beaker(buf, c, t):
    b = Wd.rect(c, -94, -66, 0, 34) | Wd.rect(c, -95.5, -64.5, 32, 34)
    water = Wd.rect(c, -92.5, -67.5, 1.5, 21)
    _fill(buf, b & Wd.CHECK, GLASS[2])
    _fill(buf, water, GLASS[2])
    _fill(buf, water & Wd.CHECK, SKY[1])
    _fill(buf, water & (c.Y > 19.8), GLASS[3])
    rod = Wd.band(c, (-86, 3), (0.34, 0.94), 0, 44, 0.9)
    _fill(buf, rod, GLASS[3])
    for k in range(5):
        _fill(buf, Wd.rect(c, -70, -66.5, 6 + 5 * k, 6.5 + 5 * k), GLASS[1])
    buf[Wd.edge(b)] = GLASS[1]


def rattle(t, k):
    """A small up-down jitter (mm) for things on the bench while the mixer runs at speed (on twos, like a sprite)."""
    r = T.rpm(t) / T.RPM_MAX
    if r < 0.25 or T.warp(t) < 0.5:
        return 0.0
    f = math.floor(t * 15)
    return 0.7 * r * (((f * 7 + k * 3) % 4) / 3.0)


def rack(buf, c, t, slot_tube=None):
    """The white tube rack with its tubes (two-layer and mixed); slot_tube draws our tube when it is in the rack."""
    from . import tube as TB
    x0, x1 = RACK_X
    for k, hx in enumerate(RACK_HOLES):
        if k == RACK_SLOT:
            continue
        st = ('layers', 'mixed', None, 'layers')[k]
        TB.draw_small(buf, c, hx, 3.0 + rattle(t, k), st)
    _fill(buf, Wd.rect(c, x0, x0 + 3, 0, 30) | Wd.rect(c, x1 - 3, x1, 0, 30), BODY[2])
    top = Wd.rect(c, x0, x1, 24, 29)
    _fill(buf, top, BODY[4])
    _fill(buf, Wd.rect(c, x0, x1, 24, 25.2), BODY[2])
    _fill(buf, Wd.rect(c, x0, x1, 0, 3), BODY[3])
    for hx in RACK_HOLES:
        _fill(buf, Wd.rect(c, hx - 4.6, hx + 4.6, 27.6, 29), BODY[1])
    buf[Wd.edge(top | Wd.rect(c, x0, x0 + 3, 0, 30) | Wd.rect(c, x1 - 3, x1, 0, 30) | Wd.rect(c, x0, x1, 0, 3))] = OUTLINE
    if slot_tube is not None:
        slot_tube()


def paint_back(buf, cam, t):
    """Everything behind the mixer: wall, shelf, bench, beaker. (The rack is drawn separately, in front of the bench.)"""
    wall(buf, cam, t)
    shelf(buf, cam, t)
    bench(buf, cam, t)
    beaker(buf, cam, t)
