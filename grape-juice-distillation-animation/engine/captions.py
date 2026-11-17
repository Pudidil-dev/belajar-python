"""Clean context captions: small labels that sit next to the object they explain and move with it.

Each label is a few words in the 5x7 pixel font at 1x (white, with a 1-px dark outline so it reads on any background),
anchored to a point in the world: the grape, the flask in mid-hop, the coil inside the heater, the drop sliding down
the tube. It is drawn after the camera on the canvas grid, so the text keeps its small pixel size at every zoom while
its position follows the object. A label types itself in quickly and disappears when its moment is over. Where the
text has to sit a little away from its object, a thin leader line points at it.

A small fast-forward mark (two triangles) sits in the top-right corner while time is compressed.
"""
import math
import numpy as np
from . import gfx, pixfont, rig, grape
from . import world as Wd
from . import timeline as T
from .palette import WHITE, OUTLINE, GLASS

CPS = 45.0                 # letters per second as a label types in
MARGIN = 4
LINE_H = 9                 # 7-px glyphs + 2 px between lines


def _flask(dx, dy):
    return lambda t: (rig.flask_pos(t)[0] + dx, rig.flask_pos(t)[1] + dy)


def _fixed(x, y):
    return lambda t: (x, y)


def _on(al, ac=0.0):
    p = rig.p_on(al, ac)
    return lambda t: p


def _drop(t):
    d = rig.drop_track(t)
    if d is None:
        return rig.p_on(rig.BEADS[rig.B_IDX][0], -rig.R_IN)
    return d[0], d[1]


def _stream(t):
    """The middle of the falling juice."""
    hy = grape.head_y(t)
    if hy is None:
        return grape.G[0] + 1.5, grape.G_BOTTOM - 4.0
    return grape.G[0] + 1.5, (max(hy, grape.FLOOR) + grape.tail_y(t)) / 2


def _bead():
    a, side, r, _ = rig.BEADS[rig.B_IDX]
    p = rig.p_on(a, side * (rig.R_IN - 0.55 * r))
    return lambda t: p


def _coil(deg, extra=3.7):
    (fx, fy), r = rig.F_HOME, rig.R_F + extra
    p = (fx + r * math.cos(math.radians(deg)), fy + r * math.sin(math.radians(deg)))
    return lambda t: p


G = grape.G
# (start, end, text, anchor(t) -> world (x, y), offset (dx, dy) in canvas px, placement, leader)
# placement: 'l' text to the right of the point, 'r' text to the left, 'm' text centred on the point.
LABELS = [
    (0.33, 1.2, 'SQUISH!', _fixed(G[0] + 12, G[1] - 2), (8, -3), 'l', False),
    (0.85, 1.75, 'GRAPE JUICE', _stream, (8, 0), 'l', False),
    (1.75, 2.9, 'INTO THE\nFLASK', _flask(rig.R_F * 0.72, 8.0), (6, -6), 'l', False),
    (3.0, 3.55, 'HOP!', _flask(rig.R_F * 0.62, rig.R_F * 0.7), (6, -6), 'l', False),
    (3.5, 4.05, 'ELECTRIC HEATER', _fixed(rig.MX, -2.0), (0, 6), 'm', False),
    (4.25, 6.0, 'STILL HEAD', _fixed(rig.J[0] + rig.NECK_HW, 200.0), (5, -3), 'l', False),
    (4.4, 6.0, 'THERMOMETER', _fixed(rig.J[0], 262.0), (0, -8), 'm', False),
    (4.7, 6.0, 'CONDENSER', _on(95.0, rig.R_OUT + 1.0), (4, -8), 'l', False),
    (5.2, 6.0, 'RECEIVER', _fixed(rig.RX, -2.0), (0, 6), 'm', False),
    (5.6, 7.0, 'COLD WATER IN', _on(rig.PORT_LO, -(rig.R_OUT + 7.0)), (-4, 4), 'r', True),
    (7.6, 8.9, 'HEATER X-RAY', _fixed(rig.MX, -2.0), (0, 6), 'm', False),
    (8.3, 9.5, 'WIRE COIL', _coil(-90.0), (0, 13), 'm', True),
    (9.1, 10.4, 'ELECTRIC CURRENT', _fixed(rig.MX - 25.0, 31.0), (0, -9), 'm', False),
    (9.6, 10.9, 'COIL GETS HOT', _coil(-90.0), (0, 13), 'm', True),
    (10.5, 12.0, 'HEAT INTO JUICE', _fixed(rig.F_HOME[0], 56.0), (0, 0), 'm', False),
    (11.0, 12.4, 'NO FLAME!', _fixed(rig.MX + 26.0, -2.0), (0, 6), 'm', False),
    (12.05, 13.6, 'BOILING!', _flask(20.0, -rig.R_F + rig.POOL), (6, -6), 'l', False),
    (12.8, 14.6, 'WATER VAPOUR', _flask(2.0, 45.0), (24, 0), 'l', True),
    (13.4, 15.0, 'PURPLE STAYS', _flask(0.0, -24.0), (0, 0), 'm', False),
    (15.2, 16.4, 'VAPOUR RISES', _fixed(rig.J[0] + 3.0, 172.0), (26, 0), 'l', True),
    (15.6, 16.8, 'THERMOMETER', _fixed(rig.THERMO_BULB[0] - 3.0, rig.THERMO_BULB[1]), (-26, 0), 'r', True),
    (16.4, 17.6, 'INTO CONDENSER', _on(12.0, 0.0), (8, -16), 'l', True),
    (17.9, 19.7, 'COLD WATER', _on(120.0, rig.R_OUT), (6, -10), 'l', True),
    (17.9, 19.7, 'HOT VAPOUR', _on(50.0, 0.0), (-10, 12), 'r', True),
    (20.6, 21.6, 'HEAT LEAVES', _on(rig.SEC - 2.0, rig.R_IN_O + 0.5), (8, -8), 'l', False),
    (21.6, 23.45, 'VAPOUR COOLS\nINTO DROPS', _bead(), (10, 10), 'l', True),
    (23.75, 24.4, 'JOIN!', _bead(), (8, -12), 'l', False),
    (24.4, 25.5, 'SLIDES DOWN', _drop, (8, -10), 'l', False),
    (25.6, 26.3, 'DRIP!', _fixed(rig.TIP[0] + 3.0, rig.TIP[1] - 4.0), (8, 0), 'l', False),
    (26.2, 28.0, 'WATER-RICH\nDISTILLATE', _fixed(rig.RX + 18.0, 6.0), (6, -14), 'l', True),
    (28.6, 29.9, 'COLOUR STAYS', _fixed(rig.MX, -4.0), (0, 6), 'm', False),
    (28.6, 29.9, 'MOSTLY WATER', _fixed(rig.RX, -4.0), (0, 6), 'm', False),
]


def _size(text):
    lines = text.split('\n')
    w = max(pixfont.text_size(l)[0] for l in lines)
    return w, LINE_H * len(lines) - 2


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0)))
    for i in range(n + 1):
        x = int(round(x0 + (x1 - x0) * i / max(n, 1)))
        y = int(round(y0 + (y1 - y0) * i / max(n, 1)))
        if 0 <= x < gfx.W and 0 <= y < gfx.H:
            buf[y, x] = col


def _place(c, t, lab):
    t0, t1, text, anchor, (dx, dy), side, lead = lab
    ax, ay = c.to(*anchor(t))
    w, h = _size(text)
    if side == 'l':
        x, y = ax + dx, ay + dy - h / 2
    elif side == 'r':
        x, y = ax + dx - w, ay + dy - h / 2
    else:
        x, y = ax + dx - w / 2, ay + dy
    x = min(max(x, MARGIN), gfx.W - MARGIN - w)
    y = min(max(y, MARGIN), gfx.H - MARGIN - h)
    return int(round(x)), int(round(y)), w, h, ax, ay


def draw(buf, c, t):
    """Draw the labels that are on at time t, positioned with the camera c (the world camera of this frame)."""
    for lab in LABELS:
        t0, t1, text = lab[0], lab[1], lab[2]
        if not (t0 <= t < t1):
            continue
        x, y, w, h, ax, ay = _place(c, t, lab)
        n = int((t - t0) * CPS) + 1
        if lab[6] and 0 <= ax < gfx.W and 0 <= ay < gfx.H:
            cx = min(max(ax, x - 2), x + w + 1)                  # leader: from the object to the label's edge
            cy = min(max(ay, y - 2), y + h + 1)
            if math.hypot(cx - ax, cy - ay) > 5:
                _line(buf, ax, ay, cx, cy, GLASS[2])
                buf[int(ay), int(ax)] = WHITE
        for i, line in enumerate(text.split('\n')):
            shown = line[:max(0, n)]
            n -= len(line)
            if shown.strip():
                pixfont.draw_text(buf, shown, x, y + i * LINE_H, WHITE, outline=OUTLINE)


def fast_forward(buf, t):
    """Two small white triangles in the top-right corner while time is compressed."""
    for span in T.FAST_FORWARD:
        if span[0] <= t < span[1]:
            if (t * 4.0) % 1.0 < 0.75:
                for k in range(2):
                    ax = gfx.W - 26 + k * 9
                    for j in range(9):
                        wdt = 5 - abs(j - 4)
                        buf[12 + j, ax - 1:ax + wdt + 1] = OUTLINE
                    for j in range(9):
                        wdt = 5 - abs(j - 4)
                        buf[12 + j, ax:ax + wdt] = WHITE
            return
