"""A 2D camera over a world measured in millimetres, and shape masks evaluated per pixel.

Everything is redrawn at the camera's own scale (canvas px per mm), so zooming in reveals new detail and the pixel grid
never stretches: a shot at 8 px/mm is a different drawing from the wide shot at 1 px/mm, not an enlargement of it.
"""
import math
import numpy as np
from . import gfx

W, H = gfx.W, gfx.H


class Cam:
    def __init__(self, cx, cy, s):
        self.cx, self.cy, self.s = float(cx), float(cy), float(s)
        self.X = self.cx + ((np.arange(W) + 0.5) - W / 2)[None, :] / self.s
        self.Y = self.cy - ((np.arange(H) + 0.5) - H / 2)[:, None] / self.s

    def to(self, x, y):
        return W / 2 + (x - self.cx) * self.s, H / 2 - (y - self.cy) * self.s

    def px(self, mm):
        return mm * self.s


class Squash:
    """A camera that squashes and stretches everything around an anchor point: squash-and-stretch for one sprite."""

    def __init__(self, c, ax, ay, sx, sy):
        self.cx, self.cy, self.s = c.cx, c.cy, c.s
        self.X = ax + (c.X - ax) / sx
        self.Y = ay + (c.Y - ay) / sy
        self._c, self._a, self._k = c, (ax, ay), (sx, sy)

    def to(self, x, y):
        (ax, ay), (sx, sy) = self._a, self._k
        return self._c.to(ax + (x - ax) * sx, ay + (y - ay) * sy)

    def px(self, mm):
        return mm * self.s


def lifted(c, dy):
    """The same camera, with what it draws shifted up by dy mm (a part dropping into place)."""
    if not dy:
        return c
    return Cam(c.cx, c.cy - dy, c.s)


def circle(c, x, y, r):
    return (c.X - x) ** 2 + (c.Y - y) ** 2 <= r * r


def ellipse(c, x, y, rx, ry):
    return ((c.X - x) / rx) ** 2 + ((c.Y - y) / ry) ** 2 <= 1.0


def rect(c, x0, x1, y0, y1):
    return (c.X >= x0) & (c.X <= x1) & (c.Y >= y0) & (c.Y <= y1)


def axis(c, p0, d):
    """(along, across) coordinates relative to a line through p0 with unit direction d (across: to the left of d)."""
    rx, ry = c.X - p0[0], c.Y - p0[1]
    return rx * d[0] + ry * d[1], -rx * d[1] + ry * d[0]


def band(c, p0, d, a0, a1, r0, r1=None):
    """A straight tube from along=a0 to a1 with half-width r0 (tapering to r1)."""
    al, ac = axis(c, p0, d)
    r = r0 if r1 is None else r0 + (r1 - r0) * np.clip((al - a0) / max(a1 - a0, 1e-9), 0, 1)
    return (al >= a0) & (al <= a1) & (np.abs(ac) <= r)


def poly(c, pts):
    """Even-odd point-in-polygon for a world polygon."""
    X, Y = np.broadcast_arrays(c.X, c.Y)
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


def full(m):
    return np.broadcast_to(m, (H, W))


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
    """The 1-px inner rim of a mask (a stepped pixel outline)."""
    m = full(m)
    return m & ~erode(m)


def ring(m):
    """The 1-px ring just outside a mask."""
    m = full(m)
    return dilate(m) & ~m


CHECK = ((np.arange(H)[:, None] + np.arange(W)[None, :]) % 2) == 0     # the one dither the 8-bit look allows


def dot(buf, x, y, col, size=1):
    """A square pixel dot at canvas (x, y)."""
    x0, y0 = int(math.floor(x - (size - 1) / 2)), int(math.floor(y - (size - 1) / 2))
    x1, y1 = max(x0, 0), max(y0, 0)
    x2, y2 = min(x0 + size, W), min(y0 + size, H)
    if x2 > x1 and y2 > y1:
        buf[y1:y2, x1:x2] = col
