"""The final boss: a big hand, seen from above, that reaches in from the bottom of the screen, pinches the hero's card
off the stack and lifts it up to the camera. Its fingertips stay on the card's lower edge; the thumb is underneath
(only its tip peeks out from under the card), pushing the hero's pocket up through the foil.

Drawn in the same pixel style as everything else: flat skin tones lit from the upper left, knuckle creases, nails
with a shine, a 1-px outline. No arm beyond the frame's edge, no face.
"""
import math
import numpy as np
from . import timeline as T
from . import pix
from . import view as Vw
from .palette import OUTLINE, SKIN, WHITE

# fingers in the hand's own frame (mm): the index fingertip is the origin; fingers point up the screen
FINGERS = [  # (tip x, tip y, base x, base y, half-width)
    (0.0, 0.0, 4.0, -40.0, 6.6),          # index
    (14.5, 3.0, 17.0, -40.0, 7.0),        # middle
    (28.5, 0.5, 29.5, -38.0, 6.6),        # ring
    (40.5, -7.0, 40.0, -34.0, 5.6),       # little
]
PALM = (-6.0, 50.0, -86.0, -30.0)         # x0, x1, y0, y1
THUMB = ((-8.0, -64.0), (-30.0, -30.0), (-22.0, -8.0), 7.4)   # base, knuckle, tip, half-width


def _shade(v, w, m, X, Y, cx, nx, ny):
    """Fill a part with skin, darker on its lower-right side (light from the upper left)."""
    v[m] = SKIN[2]
    side = ((X - cx) * nx + Y * ny)
    v[m & (side > 0)] = SKIN[1]


def draw(buf, c, ax, ay, z, scale=1.0, thumb_only=False, fingers=True):
    """The hand with its index fingertip at world (ax, ay), lying at height z; scale > 1 opens the grip a little."""
    cz = Vw.zcam(c, z)
    ext = 100.0
    w = pix.win(cz, ax - 45, ax + ext, ay - 110, ay + 12)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X - ax, w.Y - ay)
    if thumb_only:
        (bx, by), (kx, ky), (tx, ty), r = THUMB
        th = pix.seg(X, Y, bx, by, kx, ky, r) | pix.seg(X, Y, kx, ky, tx, ty, r * 0.92)
        v[th] = SKIN[2]
        v[th & (X > tx + 2)] = SKIN[1]
        nail = th & (((X - tx - 1.0) / 4.0) ** 2 + ((Y - ty + 2.5) / 3.2) ** 2 <= 1.0)
        v[nail] = SKIN[4]
        v[pix.edge(th)] = OUTLINE
        return
    palm = pix.rrect(X, Y, PALM[0], PALM[1], PALM[2], PALM[3] + 6.0, 16.0)
    m = palm.copy()
    parts = []
    for tx, ty, bx, by, r in FINGERS:
        f = pix.seg(X, Y, bx, by, tx, ty - r * 0.3, r)
        parts.append((f, tx, ty, bx, by, r))
        m |= f
    v[m] = SKIN[2]
    v[palm & (X > 30.0) & (Y < -40.0)] = SKIN[1]
    v[palm & (pix.bayer(w) < 0.12)] = SKIN[3]
    for f, tx, ty, bx, by, r in parts:
        # the right side of each finger in shadow, the left lit
        dx, dy = tx - bx, ty - by
        L = math.hypot(dx, dy)
        nx, ny = dy / L, -dx / L                     # right-hand normal
        side = (X - bx) * nx + (Y - by) * ny
        v[f & (side > r * 0.35)] = SKIN[1]
        v[f & (side < -r * 0.55)] = SKIN[3]
        # knuckle creases
        for k in (0.42, 0.7):
            px_, py_ = bx + dx * k, by + dy * k
            along = (X - px_) * dx / L + (Y - py_) * dy / L
            v[f & (np.abs(along) < 0.45) & (np.abs(side) < r * 0.6)] = SKIN[0]
        # the nail, with a shine
        nx_, ny_ = tx - dx / L * 4.2, ty - dy / L * 4.2
        nail = f & (((X - nx_) / (r * 0.72)) ** 2 + ((Y - ny_) / 4.8) ** 2 <= 1.0)
        v[nail] = SKIN[3]
        v[nail & ((X - nx_ + r * 0.25) ** 2 + (Y - ny_ - 1.0) ** 2 <= 1.6 ** 2)] = SKIN[4]
        v[pix.edge(nail)] = SKIN[1]
    # gaps between fingers
    for i in range(len(parts) - 1):
        a, b = parts[i][0], parts[i + 1][0]
        v[pix.ring(a) & b] = SKIN[0]
    v[pix.edge(m)] = OUTLINE
