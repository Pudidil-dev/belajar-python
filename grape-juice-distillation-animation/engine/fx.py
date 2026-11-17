"""Game-feel effects anchored to the world: the "!" emote when the juice starts boiling, dust puffs when the flask
lands, little stars when a part clicks into place, and the item-get sparkles around the receiver.

They are drawn in canvas pixels at a world anchor, so they keep their pixel size at any zoom and step on twos.
"""
import math
from . import world as Wd
from . import timeline as T
from . import rig
from .palette import WHITE, OUTLINE, LED_ON, SILVER, MANTLE, GLASS


def _px(c, x, y):
    px, py = c.to(x, y)
    return int(round(px)), int(round(py))


def _put(buf, x, y, col):
    if 0 <= x < Wd.W and 0 <= y < Wd.H:
        buf[y, x] = col


def _rect(buf, x0, y0, x1, y1, col):
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, Wd.W), min(y1, Wd.H)
    if x1 > x0 and y1 > y0:
        buf[y0:y1, x0:x1] = col


def emote(buf, c, t):
    """The RPG surprise bubble: a white balloon with a red '!' pops up beside the flask when the boil starts."""
    if not (T.EMOTE[0] <= t < T.EMOTE[1]):
        return
    fx, fy = rig.flask_pos(t)
    ax, ay = _px(c, fx + rig.R_F * 0.74, fy - 2.0)              # just right of the flask
    u = (t - T.EMOTE[0]) / 0.14
    s = 0.5 if u < 0.5 else (1.25 if u < 1.0 else 1.0)            # pops: small, too big, settled
    if t > T.EMOTE[1] - 0.1:
        s = 0.6
    w, h = int(round(15 * s)), int(round(21 * s))
    bob = 1 if (T.anim(t) * 4) % 2 < 1 else 0
    x0, y0 = ax, ay - h - 6 - bob
    _rect(buf, x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1, OUTLINE)
    _rect(buf, x0, y0, x0 + w, y0 + h, WHITE)
    for (dx, dy) in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        _put(buf, x0 + dx, y0 + dy, OUTLINE)
    for k in range(4):                                            # the tail
        _rect(buf, x0 + 2, y0 + h + k, x0 + 2 + max(1, 4 - k), y0 + h + k + 1, WHITE)
        _put(buf, x0 + 2 + max(1, 4 - k), y0 + h + k, OUTLINE)
    if s >= 1.0:
        bx = x0 + w // 2 - 2
        _rect(buf, bx, y0 + 3, bx + 4, y0 + h - 8, LED_ON)
        _rect(buf, bx, y0 + h - 6, bx + 4, y0 + h - 3, LED_ON)


def puffs(buf, c, t):
    """Two dust puffs from under the flask when it lands on the heater."""
    u = (t - T.HOP_LAND) / 0.3
    if not (0 <= u < 1):
        return
    fx, fy = rig.flask_pos(t)
    for sgn in (-1, 1):
        x, y = _px(c, fx + sgn * (rig.R_F * 0.55 + 16 * u), fy - rig.R_F + 2 + 6 * u)
        r = 1 + int(3 * u)
        col = SILVER[1] if u < 0.5 else MANTLE[3]
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r and (dx + dy + int(u * 6)) % 2 == 0:
                    _put(buf, x + dx, y + dy, col)


def _star(buf, x, y, n, col):
    _put(buf, x, y, col)
    for k in range(1, n + 1):
        for (dx, dy) in ((k, 0), (-k, 0), (0, k), (0, -k)):
            _put(buf, x + dx, y + dy, col)


def clicks(buf, c, t):
    """A tiny star where each part of the still lands."""
    spots = ((T.PART_HEAD, (rig.J[0] + 9, rig.F_HOME[1] + rig.NECK_TOP)),
             (T.PART_COND, rig.p_on(rig.CLAMP_AL, rig.R_OUT + 2)),
             (T.PART_RECV, (rig.RX + 13, 60.0)))
    for t0, (x, y) in spots:
        u = (t - (t0 + 0.18)) / 0.25
        if 0 <= u < 1:
            px, py = _px(c, x, y)
            _star(buf, px, py, 1 + int(2 * (1 - abs(2 * u - 1))), WHITE)


def sparkles(buf, c, t):
    """Item-get sparkles twinkling around the receiver's new clear liquid."""
    if not (T.ITEM[0] <= t < T.ITEM[1]):
        return
    ta = T.anim(t)
    spots = ((-24, 30), (22, 36), (-10, 52), (30, 14), (-30, 8), (8, 64))
    for i, (dx, dy) in enumerate(spots):
        ph = ((ta - T.ITEM[0]) * 2.2 + i * 0.37) % 1.0
        n = (0, 1, 2, 3, 2, 1, 0, 0)[int(ph * 8)]
        if n:
            px, py = _px(c, rig.RX + dx, dy)
            _star(buf, px, py, n, WHITE if n > 1 else GLASS[3])


def draw(buf, c, t):
    puffs(buf, c, t)
    clicks(buf, c, t)
    sparkles(buf, c, t)
    emote(buf, c, t)
