"""The 2.5D camera and screen-space pixel shapes.

The patient lies face down. The back is a slab in world millimetres: x across the back, y along the spine (toward the
head), z up out of the skin. The camera looks at it from an elevation angle e: 90° is straight down (the top view),
0° is level with the skin (the side view), anything between is an angled view. Projection is orthographic:

    screen x  = (x - cx) * s
    screen up = ((y - cy) * sin e + (z - cz) * cos e) * s

An optional cut plane y = ycut removes the part of the back nearer to the camera; its face shows the skin layers.
For every canvas row the camera gives the back's y on the skin plane (YP) and the height on the cut face (ZC), so the
top surface and the cross-section can each be painted per pixel with flat 2D textures.
"""
import math
import numpy as np
from . import gfx

W, H = gfx.W, gfx.H
XC = (np.arange(W) + 0.5)[None, :]
YC = (np.arange(H) + 0.5)[:, None]
CHECK = ((np.arange(H)[:, None] + np.arange(W)[None, :]) % 2) == 0


class View:
    def __init__(self, cx, cy, cz, s, e_deg, ycut=None):
        self.cx, self.cy, self.cz, self.s, self.e = float(cx), float(cy), float(cz), float(s), float(e_deg)
        r = math.radians(e_deg)
        self.se, self.ce = math.sin(r), math.cos(r)
        self.ycut = ycut
        self.X = self.cx + (XC - W / 2) / self.s                      # (1, W) world x of each column
        self.up = (H / 2 - YC) / self.s                               # (H, 1) screen-up distance (mm)
        # the top surface is drawn down to grazing angles (e > 0.25 deg), so it never pops in or out as a big band
        self.YP = self.cy + (self.up + self.cz * self.ce) / self.se if self.se > 0.0045 else None
        self.ZC = None
        if ycut is not None and self.ce > 0.03:
            self.ZC = self.cz + (self.up - (ycut - self.cy) * self.se) / self.ce

    def to(self, x, y, z=0.0):
        """World point -> canvas (px, py)."""
        up = (y - self.cy) * self.se + (z - self.cz) * self.ce
        return W / 2 + (x - self.cx) * self.s, H / 2 - up * self.s

    def cut_row(self):
        """Canvas y of the skin line on the cut plane (z = 0), or None."""
        if self.ycut is None:
            return None
        return self.to(0.0, self.ycut, 0.0)[1]


# ---------------------------------------------------------------- screen-space masks (canvas pixels)
def full(m):
    return np.broadcast_to(m, (H, W))


def ell(cx, cy, rx, ry):
    rx, ry = max(rx, 0.35), max(ry, 0.35)
    return ((XC - cx) / rx) ** 2 + ((YC - cy) / ry) ** 2 <= 1.0


def circ(cx, cy, r):
    return ell(cx, cy, r, r)


def box(x0, y0, x1, y1):
    return (XC >= x0) & (XC < x1) & (YC >= y0) & (YC < y1)


def seg(ax, ay, bx, by, w):
    """Pixels within w/2 of the segment a-b."""
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    if L2 < 1e-9:
        return circ(ax, ay, w / 2)
    u = np.clip(((XC - ax) * dx + (YC - ay) * dy) / L2, 0, 1)
    px, py = ax + u * dx, ay + u * dy
    return (XC - px) ** 2 + (YC - py) ** 2 <= (w / 2) ** 2


def polyline(pts, w):
    m = np.zeros((H, W), bool)
    for a, b in zip(pts[:-1], pts[1:]):
        m |= full(seg(a[0], a[1], b[0], b[1], w))
    return m


def poly(pts):
    """Even-odd point-in-polygon for canvas points."""
    X, Y = np.broadcast_arrays(XC, YC)
    inside = np.zeros(X.shape, bool)
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        cond = (y1 > Y) != (y2 > Y)
        with np.errstate(divide='ignore', invalid='ignore'):
            xint = x1 + (Y - y1) * (x2 - x1) / (y2 - y1)
        inside ^= cond & (X < xint)
    return inside


def erode(m):
    m = full(m)
    e = m.copy()
    e[1:] &= m[:-1]
    e[:-1] &= m[1:]
    e[:, 1:] &= m[:, :-1]
    e[:, :-1] &= m[:, 1:]
    return e


def dilate(m):
    m = full(m)
    d = m.copy()
    d[1:] |= m[:-1]
    d[:-1] |= m[1:]
    d[:, 1:] |= m[:, :-1]
    d[:, :-1] |= m[:, 1:]
    return d


def edge(m):
    m = full(m)
    return m & ~erode(m)


def ring(m):
    m = full(m)
    return dilate(m) & ~m


def dot(buf, x, y, col, size=1):
    x0, y0 = int(math.floor(x - (size - 1) / 2)), int(math.floor(y - (size - 1) / 2))
    x1, y1 = max(x0, 0), max(y0, 0)
    x2, y2 = min(x0 + size, W), min(y0 + size, H)
    if x2 > x1 and y2 > y1:
        buf[y1:y2, x1:x2] = col


def hash01(a, b):
    """A cheap deterministic 0..1 hash of integer arrays (for skin texture, freckles, petechiae)."""
    v = np.sin(a * 12.9898 + b * 78.233) * 43758.5453
    return v - np.floor(v)
