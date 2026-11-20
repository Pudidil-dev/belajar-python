"""From syrup to sugar crystals: the crystallizing dish, the thick syrup pouring in, the seed crystals and the glucose
crystals that grow while it cools.

The story the pictures tell (see the README for the science): once most of the water has been distilled off, the juice
is a thick purple syrup. The heater goes off before it can scorch, the syrup is poured into a shallow crystallizing
dish, a few seed crystals are added, and it is left somewhere cool for days (a time-lapse). Pale, faceted crystals of
glucose ("grape sugar") grow on the seeds and on the bottom and walls; the fructose stays dissolved, so the crystals sit
in the purple syrup. They are drawn in world millimetres like everything else, so the close-up shows real facets.
"""
import math
import numpy as np
from . import world as Wd
from .world import circle, rect, poly, edge, ring, CHECK, dot
from . import timeline as T
from . import rig
from .palette import OUTLINE, WHITE, GLASS, JUICE, NAVY

DX = -135.0                  # the dish's centre on the bench
DW, DH = 32.0, 17.0          # half-width and height (mm)
FLOOR = 0.9                  # inside bottom
DEPTH = 7.8                  # syrup depth once it is all poured in (the same volume the flask held)

_rng = np.random.default_rng(31)
SEEDS = [(DX - 15.0, 1.1), (DX - 3.5, 1.2), (DX + 8.5, 1.0), (DX + 19.0, 1.1)]       # (x, size) of the seed crystals


def _crystals():
    """(x, y, size, angle, born, grow) for every crystal: the seeds first, then crystals that start on them and on
    the bottom and walls while the dish cools."""
    out = []
    t0 = T.SEED[1]
    for i, (x, s) in enumerate(SEEDS):
        out.append((x, FLOOR + 1.2, 2.6 + 0.5 * (i % 2), _rng.uniform(-25, 25), t0 - 0.2, 1.6))
    n = 26
    for k in range(n):
        u = k / n
        if k % 5 == 4:                                          # on a wall
            side = -1 if k % 2 else 1
            x = DX + side * (DW - 2.2)
            y = FLOOR + _rng.uniform(2.0, DEPTH - 1.0)
            ang = side * _rng.uniform(55, 80)
        else:                                                   # on the bottom, clustered near the seeds
            sx = SEEDS[k % len(SEEDS)][0]
            x = sx + _rng.uniform(-5.5, 5.5)
            y = FLOOR + _rng.uniform(0.6, 2.4)
            ang = _rng.uniform(-40, 40)
        born = t0 + 0.15 + u * (T.CRYSTAL[1] - t0 - 0.9)
        out.append((x, y, _rng.uniform(1.0, 2.3), ang, born, _rng.uniform(0.6, 1.0)))
    return out


CRYSTALS = _crystals()


def dish_lift(t):
    return T.drop_in(t, T.DISH_IN, 50.0)


def dish_depth(t):
    return DEPTH * rig.pour_fraction(t)


def _body(c):
    body = rect(c, DX - DW, DX + DW, 0.0, DH)
    for sgn in (-1, 1):
        cx = DX + sgn * (DW - 3.0)
        corner = rect(c, min(cx, cx + sgn * 3.0), max(cx, cx + sgn * 3.0), 0.0, 3.0) & ~circle(c, cx, 3.0, 3.0)
        body &= ~corner
    return Wd.full(body)


def _crystal(buf, c, x, y, size, ang):
    """A pale faceted sugar crystal: a hexagonal prism seen from the side, lit from the upper left."""
    if size * c.s < 2.2:
        px, py = c.to(x, y)
        dot(buf, px, py, WHITE)
        return
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    L, Wd_ = size, size * 0.55
    pts = [(0, L), (Wd_, L * 0.55), (Wd_, -L * 0.55), (0, -L), (-Wd_, -L * 0.55), (-Wd_, L * 0.55)]
    world = [(x + u * ca - v * sa, y + u * sa + v * ca) for v, u in pts]
    m = Wd.full(poly(c, world))
    if not m.any():
        return
    buf[m] = GLASS[3]
    right = [(x + u * ca - v * sa, y + u * sa + v * ca) for v, u in ((0, L), (Wd_, L * 0.55), (Wd_, -L * 0.55),
                                                                      (0, -L))]
    buf[m & Wd.full(poly(c, right))] = GLASS[2]                  # the shaded facet
    if c.s * size > 9:                                            # close up: the end facet and a purple tint below
        top = [(x + u * ca - v * sa, y + u * sa + v * ca) for v, u in ((0, L), (Wd_, L * 0.55), (0, L * 0.25),
                                                                        (-Wd_, L * 0.55))]
        buf[m & Wd.full(poly(c, top))] = WHITE
        buf[m & CHECK & Wd.full(c.Y < y - L * 0.5)] = JUICE[3]
    buf[edge(m)] = WHITE
    gx, gy = c.to(x - Wd_ * 0.4, y + L * 0.3)
    dot(buf, gx, gy, WHITE, 2 if c.s * size > 14 else 1)


def draw_dish(buf, c, t):
    """The crystallizing dish on the bench: glass, the syrup in it, and the crystals growing."""
    h = dish_lift(t)
    if h is None:
        return
    c = Wd.lifted(c, h)
    body = _body(c)
    rig._glass_interior(buf, body)
    inner = Wd.full(rect(c, DX - DW + 1.0, DX + DW - 1.0, FLOOR, DH + 1.0)) & body
    d = dish_depth(t)
    if d > 0.05:
        lvl = FLOOR + d
        liq = inner & Wd.full(c.Y <= lvl)
        buf[liq] = JUICE[1]
        buf[liq & CHECK & Wd.full(c.Y < FLOOR + d * 0.45)] = JUICE[0]
        buf[edge(liq) & Wd.full(c.Y > lvl - 1.5 / c.s - 0.25)] = JUICE[2]
    # the seeds drop in, then everything grows
    for i, (x, s) in enumerate(SEEDS):
        t0 = T.SEED[0] + 0.1 * i
        if t < t0:
            continue
        u = T.clamp01((t - t0) / 0.35)
        y = T.lerp(36.0, FLOOR + 1.0, u * u)
        if u < 1:
            px, py = c.to(x, y)
            dot(buf, px, py, WHITE, 2 if c.s > 3 else 1)
            dot(buf, px - 2, py, GLASS[3])
            dot(buf, px + 2, py, GLASS[3])
    for (x, y, size, ang, born, grow) in CRYSTALS:
        if t < born:
            continue
        g = T.back_out(T.u_of(t, (born, born + grow)), 1.2)
        if g > 0.02:
            _crystal(buf, c, x, y, size * g, ang)
    buf[ring(body)] = GLASS[2]
    for x0 in (DX - DW - 1.2, DX + DW):                           # the rim's small lip
        buf[Wd.full(rect(c, x0, x0 + 1.2, DH - 1.0, DH))] = GLASS[2]
    hl = Wd.full(rect(c, DX - DW + 3.0, DX - DW + 4.0, 4.0, DH - 3.0)) & body
    buf[hl] = GLASS[3]
    rig._sparkle(buf, c, t, DX - DW + 6.0, DH - 4.0, 1.7, 3.0)


def draw_stream(buf, c, t):
    """The thick syrup pouring from the tipped flask's mouth into the dish."""
    if not (T.SYRUP_POUR[0] <= t < T.SYRUP_POUR[1] + 0.2):
        return
    mx, my = rig.mouth(t)
    surf = FLOOR + dish_depth(t)
    head = my - 260.0 * (t - T.SYRUP_POUR[0])                      # the front falls from the mouth ...
    tail = my - 260.0 * max(0.0, t - T.SYRUP_POUR[1])             # ... and at the end the tail leaves it
    lo, hi = max(head, surf), min(tail, my)
    if hi <= lo:
        return
    w = 1.7 * (1 - 0.6 * rig.pour_fraction(t)) + 0.15 * math.sin(T.anim(t) * 30.0)
    col = rect(c, mx - w, mx + w, lo, hi)
    m = Wd.full(col)
    buf[m] = JUICE[1]
    buf[Wd.full(rect(c, mx - w, mx - w * 0.3, lo, hi))] = JUICE[3]
    buf[ring(m)] = OUTLINE
    if head <= surf + 0.5:                                        # it piles up a little where it lands
        blob = Wd.full(circle(c, mx, surf, w * 1.8)) & Wd.full(c.Y >= surf - 0.3)
        buf[blob] = JUICE[1]
        buf[edge(blob)] = JUICE[2]
