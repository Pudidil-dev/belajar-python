"""Camera work for the analyzer shots: 2D camera keys (time, centre (u, v), zoom px/mm), eased between keys.

Tracking moves follow the arms and the hero cuvette across the 3/4 drawing; the pushes at 13.25 s and 35.2 s end on
exactly the camera of the opening composition, so the match cuts into it land on the same framing.
"""
import math
from . import timeline as T
from . import analyzer as AZ
from .view import View

P_ = AZ.proj
S_RIM = P_(AZ.S_POS[0], AZ.S_POS[1], AZ.CUV_Z1)
R_RIM = P_(AZ.R_POS[0], AZ.R_POS[1], AZ.CUV_Z1)
OPEN = ((S_RIM[0], S_RIM[1] - 9.5), 6.4)                  # the opening composition
WIDE = ((0.0, -240.0), 0.37)
BOT = AZ.RA_BOTTLE
TUB = AZ.SA_TUBE
O_POS = AZ.slot_xy(AZ.SLOT_O)
SCREEN_C = P_(530.0, -136.0, 262.0)


def pt(x, y, z):
    return P_(x, y, z)


# the dispense shot frames the bottle (behind, higher on screen) and the hero cuvette (in front) together
_b = P_(BOT[0], BOT[1], 384.0)
_r = P_(AZ.R_POS[0], AZ.R_POS[1], AZ.CUV_Z0)
MID_BR = ((_b[0] + _r[0]) / 2, (_b[1] + _r[1]) / 2)
ZOOM_BR = min(250.0 / (abs(_b[0] - _r[0]) + 60.0), 440.0 / (abs(_b[1] - _r[1]) + 70.0))


K_REVEAL = [
    (2.10, (S_RIM[0], S_RIM[1] + 8.0), 9.0),
    (2.45, (0.0, -250.0), 2.0),
    (2.95, WIDE[0], WIDE[1]),
    (3.55, WIDE[0], WIDE[1] * 1.04),
    (3.849, (S_RIM[0], S_RIM[1] - 6.0), 0.95),
]
K_MAIN = [
    (3.85, (R_RIM[0], R_RIM[1] - 6.0), 0.95),
    (4.05, (R_RIM[0], R_RIM[1] - 6.0), 0.9),
    (4.95, pt(AZ.RT[0] + 20, AZ.RT[1] + 20, 370), 1.2),
    (5.70, pt(BOT[0], BOT[1], 384), 1.8),
    (6.00, pt(BOT[0], BOT[1], 388), 2.6),
    (6.55, pt(BOT[0], BOT[1], 380), 3.6),
    (7.45, pt(BOT[0], BOT[1], 380), 3.6),
    (8.00, pt(BOT[0], BOT[1], 388), 2.2),
    (8.85, MID_BR, ZOOM_BR),
    (9.60, (MID_BR[0] + 4.0, MID_BR[1] + 4.0), ZOOM_BR * 1.04),
    (10.00, (MID_BR[0] + 4.0, MID_BR[1] + 4.0), ZOOM_BR * 1.04),
    (10.75, pt(TUB[0], TUB[1], 372), 3.0),
    (11.60, pt(TUB[0], TUB[1], 372), 3.0),
    (12.00, pt(TUB[0], TUB[1], 382), 2.2),
    (12.80, (S_RIM[0] + 10.0, S_RIM[1] - 40.0), 2.6),
    (13.25, OPEN[0], OPEN[1]),
]
_O = pt(O_POS[0], O_POS[1], 344)
K_OPTIC = [                     # tight enough that the stirrer (left) and the sample arm's column (right) stay outside
    (23.00, (_O[0] + 6.0, _O[1] + 4.0), 3.6),
    (24.30, (_O[0] - 2.0, _O[1] - 6.0), 3.9),
]
K_END = [
    (30.00, pt(O_POS[0], O_POS[1], 344), 3.0),
    (30.75, (SCREEN_C[0] - 92.0, SCREEN_C[1] + 70.0), 0.62),
    (31.95, (SCREEN_C[0] - 92.0, SCREEN_C[1] + 70.0), 0.61),
    (32.55, (S_RIM[0] + 10.0, S_RIM[1] - 40.0), 1.45),
    (34.00, (S_RIM[0] + 8.0, S_RIM[1] - 36.0), 1.6),
    (34.60, (S_RIM[0] + 8.0, S_RIM[1] - 30.0), 3.2),
    (35.20, OPEN[0], OPEN[1]),
]


def hero_point(t):
    x, y = AZ.slot_xy(T.hero_slot(t))
    return P_(x, y, AZ.CUV_Z1)


def _interp(t, ks, dyn=None):
    def c_of(k):
        if callable(k[1]):
            return k[1](t)
        return k[1] if k[1] is not None else dyn(t)
    if t <= ks[0][0]:
        return c_of(ks[0]), ks[0][2]
    for a, b in zip(ks[:-1], ks[1:]):
        if t <= b[0]:
            u = T.smoother((t - a[0]) / max(b[0] - a[0], 1e-6))
            ca, cb = c_of(a), c_of(b)
            za, zb = a[2], b[2]
            z = math.exp(math.log(za) + (math.log(zb) - math.log(za)) * u)
            # move the centre so that the screen motion stays even during zooms
            w = (1 / z - 1 / za) / (1 / zb - 1 / za) if abs(zb - za) > 1e-6 else u
            return (ca[0] + (cb[0] - ca[0]) * w, ca[1] + (cb[1] - ca[1]) * w), z
    return c_of(ks[-1]), ks[-1][2]


def cam(t):
    t = t % T.TOTAL
    if t < T.CUT_BACK:
        c, z = _interp(t, K_REVEAL)
    elif t < 16.0:
        c, z = _interp(t, K_MAIN)
    elif t < 30.0:
        c, z = _interp(t, K_OPTIC, hero_point)
    else:
        c, z = _interp(t, K_END)
    return View(c[0], c[1], z)


def open_view():
    return View(OPEN[0][0], OPEN[0][1], OPEN[1])


def lid_alpha(z):
    return 0.26 * T.clamp01((1.1 - z) / 0.6)
