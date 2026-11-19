"""The final boss: a hand that takes the hero's card off the stack, and a thumb that comes up under the hero's pocket and
presses until the foil bursts.

Drawn in the same pixel style as everything else: flat skin tones, a 1-px outline, a lighter nail. Only hands, no
arms beyond the wrist edge of the frame and no face.
"""
import math
import numpy as np
from . import timeline as T
from . import pix
from . import web
from .palette import OUTLINE, SKIN


def _blob(buf, c, parts, nails=()):
    """Union of strokes and ellipses in skin, one outline round all of it, then the nails."""
    xs = [p[1] for p in parts] + [p[3] for p in parts if p[0] == 'seg']
    ys = [p[2] for p in parts] + [p[4] for p in parts if p[0] == 'seg']
    pad = max(p[-1] for p in parts) + 2.0
    w = pix.win(c, min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad)
    if w is None:
        return
    X, Y = np.broadcast_arrays(w.X, w.Y)
    m = np.zeros(X.shape, bool)
    shade = np.zeros(X.shape, bool)
    for p in parts:
        if p[0] == 'seg':
            _, x0, y0, x1, y1, r = p
            pm = pix.seg(X, Y, x0, y0, x1, y1, r)
            dx, dy = x1 - x0, y1 - y0
            L = math.hypot(dx, dy) or 1.0
            nx, ny = -dy / L, dx / L
            if ny < 0:
                nx, ny = -nx, -ny
            side = ((X - x0) * nx + (Y - y0) * ny) < -r * 0.35
            shade |= pm & side
        else:
            _, x, y, rx, ry = p
            pm = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2 <= 1.0
            shade |= pm & ((Y - y) < -ry * 0.35)
        m |= pm
    v = w.view(buf)
    v[m] = SKIN[2]
    v[m & shade] = SKIN[1]
    hi = m & ~shade & (pix.bayer(w) < 0.18)
    v[hi] = SKIN[3]
    for nx_, ny_, rx, ry in nails:
        nm = m & (((X - nx_) / rx) ** 2 + ((Y - ny_) / ry) ** 2 <= 1.0)
        v[nm] = SKIN[3]
        v[pix.edge(nm)] = SKIN[1]
    v[pix.edge(m)] = OUTLINE


def holder_pose(S):
    """Where the holding hand grips: the card's left end (x, y), plus how far above it the hand still is."""
    hp = web.hero_card_pose(S if S >= 2.0 else 0.0) if (S < 2.0 or S >= T.THUNK_HERO) else None
    if S >= 2.0 and S < T.HAND_IN[0]:
        return None
    if hp is None:
        return None
    ox, oy, _ = hp
    if S >= 2.0 and S < T.GRAB:
        k = T.ease_out(T.u_of(S, T.HAND_IN), 2.2)
        return ox, oy, (1 - k) * 150.0
    return ox, oy, 0.0


def draw_holder(buf, c, S):
    p = holder_pose(S)
    if p is None:
        return
    ox, oy, up = p
    oy += up
    ox -= up * 0.12
    parts = [
        ('seg', ox - 30.0, oy + 150.0, ox - 16.0, oy + 30.0, 15.0),     # the forearm, coming down from above
        ('ell', ox - 9.0, oy + 16.0, 16.0, 13.0),                        # the back of the hand
        ('seg', ox - 2.0, oy + 21.0, ox + 4.0, oy + 24.0, 4.6),           # folded fingers (knuckles)
        ('seg', ox - 8.0, oy + 24.0, ox - 1.0, oy + 27.5, 4.6),
        ('seg', ox - 4.0, oy + 9.0, ox + 10.0, oy + 2.6, 3.6),            # the index finger, on top of the card
        ('seg', ox - 16.0, oy + 6.0, ox - 4.0, oy - 8.5, 4.4),            # the thumb, round under the first pocket
        ('seg', ox - 4.0, oy - 8.5, ox + 7.0, oy - 10.5, 4.0),
    ]
    _blob(buf, c, parts, nails=((ox + 9.5, oy + 3.6, 2.2, 1.4),))


def thumb_tip(S):
    """Where the pressing thumb's tip is (under the hero's dome), and how far it still has to come in (0..1)."""
    if S >= 2.0 and S < T.THUMB_IN[0]:
        return None
    ox, oy, ang = web.hero_card_pose(S)
    d = web.hero_in_hand(S)[0]
    hx, hy = web.to_world(ox, oy, ang, T.pocket_u(T.HERO_K), -d - 0.6)
    k = 1.0 if S < 2.0 else T.ease_out(T.u_of(S, T.THUMB_IN), 2.4)
    return hx, hy, 1 - k


def draw_thumb(buf, c, S):
    tp = thumb_tip(S)
    if tp is None:
        return
    hx, hy, away = tp
    dx, dy = 46.0 * away, -80.0 * away
    tx, ty = hx + dx + 1.0, hy + dy - 5.2
    parts = [
        ('ell', tx + 44.0, ty - 50.0, 30.0, 26.0),                       # the fist, low right
        ('seg', tx + 30.0, ty - 40.0, tx + 4.0, ty - 6.0, 7.8),          # the thumb, pointing up at the dome
        ('seg', tx + 4.0, ty - 6.0, tx, ty, 6.6),
        ('seg', tx + 26.0, ty - 28.0, tx + 52.0, ty - 30.0, 6.0),        # the index finger curled under
        ('seg', tx + 30.0, ty - 40.0, tx + 58.0, ty - 44.0, 6.0),
    ]
    _blob(buf, c, parts, nails=((tx + 4.6, ty + 1.2, 2.6, 3.4),))
