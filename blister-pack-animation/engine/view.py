"""The 3/4 top-down view, like a classic RPG map: the ground plane is seen from above, and anything with height z is
drawn shifted up the screen (so its front faces show) and slightly enlarged, as if the camera looked down from
Z_CAM mm above the line. A thing held close to the camera grows: the card in the hand, the pill flying out of it.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T

W, H = gfx.W, gfx.H
OBL = 0.5                   # how far up the screen 1 mm of height moves a point (in ground mm)
SHADOW = (0.16, -0.16)      # a raised thing's shadow falls down and to the right (per mm of height)


def kz(z):
    return T.Z_CAM / (T.Z_CAM - min(z, T.Z_CAM - 10.0))


def zcam(c, z):
    """The camera for things lying at height z: same centre line, shifted up by OBL*z, scaled by perspective."""
    if z == 0.0:
        return c
    return Wd.Cam(c.cx, c.cy - OBL * z, c.s * kz(z))


def to(c, x, y, z=0.0):
    k = kz(z)
    return W / 2 + (x - c.cx) * c.s * k, H / 2 - (y - c.cy + OBL * z) * c.s * k


def darken(buf, w, m, k=0.6):
    v = w.view(buf)
    m = np.broadcast_to(m, v.shape[:2])
    v[m] = (v[m].astype(np.float32) * k).astype(np.uint8)


def mix(a, b, k):
    return tuple(int(round(a[i] + (b[i] - a[i]) * k)) for i in range(3))
