"""Drawing helpers in world space (shapes are tested per canvas pixel, so every zoom gets crisp artwork)."""
import math
import numpy as np
from . import gfx
from .view import put, poly_sel

W, H = gfx.W, gfx.H


class Pen:
    def __init__(self, buf, view):
        self.buf, self.view, self.z = buf, view, view.z

    def box(self, x0, y0, x1, y1, pad=2):
        return self.view.box(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1), pad)

    def grid(self, bx):
        U, V = self.view.grid(bx)
        return np.broadcast_arrays(U, V)

    def disc(self, cx, cy, r, pad=1):
        bx = self.box(cx - r, cy - r, cx + r, cy + r, pad)
        if bx is None:
            return None, None, None, None
        U, V = self.grid(bx)
        return bx, (U - cx) ** 2 + (V - cy) ** 2 <= r * r, U, V

    def rect(self, x0, y0, x1, y1):
        bx = self.box(x0, y0, x1, y1, 1)
        if bx is None:
            return None, None, None, None
        U, V = self.grid(bx)
        return bx, (U >= x0) & (U < x1) & (V >= y0) & (V < y1), U, V

    def poly(self, pts):
        us, vs = [p[0] for p in pts], [p[1] for p in pts]
        bx = self.box(min(us), min(vs), max(us), max(vs), 2)
        if bx is None:
            return None, None
        return bx, poly_sel(self.view, pts, bx)

    def outline(self, bx, m, col):
        e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
        put(self.buf, bx, e, col)

    def dot(self, x, y, col, size=1):
        i, j = self.view.px(x, y)
        i, j = int(math.floor(i)), int(math.floor(j))
        self.buf[max(j, 0):max(min(j + size, H), 0), max(i, 0):max(min(i + size, W), 0)] = col


