"""Shapes evaluated only inside their own box on the canvas, so dozens of small sprites (capsules, pockets, bolts) stay
cheap, and the capsule itself: a two-tone hard-gelatin capsule, shaded from its surface normal so it lights correctly
at any angle.
"""
import math
import numpy as np
from . import gfx
from . import timeline as T
from .palette import OUTLINE, RED, CAPW, WHITE

W, H = gfx.W, gfx.H


class Win:
    """A canvas box (slices sy, sx) with the world coordinates X, Y of its pixel centres."""
    __slots__ = ('sy', 'sx', 'X', 'Y', 's')

    def __init__(self, sy, sx, X, Y, s):
        self.sy, self.sx, self.X, self.Y, self.s = sy, sx, X, Y, s

    def view(self, buf):
        return buf[self.sy, self.sx]


def win(c, x0, x1, y0, y1, pad=2):
    """The canvas box covering the world box [x0, x1] x [y0, y1] (None if it is off-screen)."""
    lx, ty = c.to(x0, y1)
    rx, by = c.to(x1, y0)
    if lx > rx:
        lx, rx = rx, lx
    if ty > by:
        ty, by = by, ty
    i0, i1 = max(int(math.floor(lx)) - pad, 0), min(int(math.ceil(rx)) + pad, W)
    j0, j1 = max(int(math.floor(ty)) - pad, 0), min(int(math.ceil(by)) + pad, H)
    if i0 >= i1 or j0 >= j1:
        return None
    X = c.X[:, i0:i1] if c.X.shape[0] == 1 else c.X[j0:j1, i0:i1]
    Y = c.Y[j0:j1, :] if c.Y.shape[1] == 1 else c.Y[j0:j1, i0:i1]
    return Win(slice(j0, j1), slice(i0, i1), X, Y, c.s)


def full(w, m):
    return np.broadcast_to(m, (w.sy.stop - w.sy.start, w.sx.stop - w.sx.start))


def paint(buf, w, m, col):
    v = buf[w.sy, w.sx]
    v[full(w, m)] = col


def edge(m):
    """The 1-px inner rim of a mask."""
    e = m.copy()
    e[1:] &= m[:-1]
    e[:-1] &= m[1:]
    e[:, 1:] &= m[:, :-1]
    e[:, :-1] &= m[:, 1:]
    return m & ~e


def ring(m):
    """The 1-px ring just outside a mask."""
    d = m.copy()
    d[1:] |= m[:-1]
    d[:-1] |= m[1:]
    d[:, 1:] |= m[:, :-1]
    d[:, :-1] |= m[:, 1:]
    return d & ~m


def checker(w):
    """The 8-bit checker dither, in canvas phase."""
    j0, i0 = w.sy.start, w.sx.start
    hh, ww = w.sy.stop - j0, w.sx.stop - i0
    return ((np.arange(j0, j0 + hh)[:, None] + np.arange(i0, i0 + ww)[None, :]) % 2) == 0


def bayer(w):
    return gfx.bayer_at(w.sx.start, w.sy.start, w.sy.stop - w.sy.start, w.sx.stop - w.sx.start)


# ---------------------------------------------------------------- masks on a window's X, Y
def box(X, Y, x0, x1, y0, y1):
    return (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)


def circ(X, Y, x, y, r):
    return (X - x) ** 2 + (Y - y) ** 2 <= r * r


def rrect(X, Y, x0, x1, y0, y1, r):
    """A rounded rectangle (all four corners)."""
    r = max(0.0, min(r, (x1 - x0) / 2, (y1 - y0) / 2))
    cx = np.clip(X, x0 + r, x1 - r)
    cy = np.clip(Y, y0 + r, y1 - r)
    return ((X - cx) ** 2 + (Y - cy) ** 2 <= r * r + 1e-9) & (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)


def ucup(X, Y, x0, x1, y0, y1, r):
    """A rectangle with only its two bottom corners rounded (the shape of a blister pocket)."""
    r = max(0.0, min(r, (x1 - x0) / 2, y1 - y0))
    cx = np.clip(X, x0 + r, x1 - r)
    cy = np.maximum(Y, y0 + r)
    return ((X - cx) ** 2 + (Y - cy) ** 2 <= r * r + 1e-9) & (Y <= y1)


def seg(X, Y, x0, y0, x1, y1, r):
    """A stroke of half-width r from (x0, y0) to (x1, y1) with round ends."""
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy
    if L2 < 1e-12:
        return circ(X, Y, x0, y0, r)
    u = np.clip(((X - x0) * dx + (Y - y0) * dy) / L2, 0.0, 1.0)
    return (X - x0 - u * dx) ** 2 + (Y - y0 - u * dy) ** 2 <= r * r


def poly(X, Y, pts):
    X, Y = np.broadcast_arrays(X, Y)
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


def fill_box(buf, c, x0, x1, y0, y1, col, outline=None):
    w = win(c, x0, x1, y0, y1)
    if w is None:
        return None
    m = full(w, box(w.X, w.Y, x0, x1, y0, y1))
    paint(buf, w, m, col)
    if outline is not None:
        paint(buf, w, edge(m), outline)
    return w, m


# ---------------------------------------------------------------- the capsule
_LIGHT = (-0.45, 0.89)


def capsule(buf, c, x, y, ang, L=T.CAP_L, r=T.CAP_R, cap=RED, body=CAPW, outline=OUTLINE, squash=1.0):
    """A two-tone capsule centred at (x, y), its red cap pointing along -ang degrees... i.e. the cap is on the side of
    the axis direction's negative end. Returns the window and mask (for tags and effects), or None."""
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    h = L / 2 - r
    ext = L / 2 + 0.6
    w = win(c, x - ext, x + ext, y - ext, y + ext)
    if w is None:
        return None
    dx, dy = w.X - x, w.Y - y
    s = dx * ca + dy * sa
    n = (-dx * sa + dy * ca) / squash
    sc = np.clip(s, -h, h)
    d2 = (s - sc) ** 2 + n ** 2
    m = full(w, d2 <= r * r)
    if not m.any():
        return None
    nl = (s - sc) / r
    nn = n / r
    wx = nl * ca - nn * sa
    wy = nl * sa + nn * ca
    b = full(w, wx * _LIGHT[0] + wy * _LIGHT[1])
    is_cap = full(w, s < 0.35)
    v = w.view(buf)
    for ramp_, part in ((cap, is_cap), (body, ~is_cap)):
        pm = m & part
        if not pm.any():
            continue
        v[pm] = ramp_[2]
        v[pm & (b > 0.52)] = ramp_[3]
        v[pm & (b < -0.22)] = ramp_[1]
        v[pm & (b < -0.72)] = ramp_[0]
    seam = m & full(w, np.abs(s - 0.35) < 0.55 / w.s) & full(w, np.abs(n) < r * 0.92)
    v[seam] = cap[1]
    if w.s >= 6.0:                                            # close up: a long shine along each half, a rim light
        for lo, hi in ((-h * 0.85, -0.6), (0.9, h * 0.85)):
            sh = m & full(w, (s > lo) & (s < hi) & (np.abs(n - r * 0.5) < r * 0.13))
            v[sh] = WHITE
        rim = m & full(w, (b < -0.55) & (np.abs(n) > r * 0.78) & (n < 0))
        v[rim & is_cap] = cap[2]
        v[rim & ~is_cap] = body[2]
    if w.s >= 2.6:                                            # a glint on the cap
        gx, gy = x + (-h * 0.55) * ca - (r * 0.45) * sa, y + (-h * 0.55) * sa + (r * 0.45) * ca
        gm = m & full(w, (w.X - gx) ** 2 + (w.Y - gy) ** 2 <= (0.55 / w.s * 1.6) ** 2)
        v[gm] = WHITE
    if outline is not None:
        v[edge(m)] = outline
    return w, m
