"""The hook: one purple grape on its stem, a glint across its skin, a squash, and its juice falling straight into the
open neck of the round-bottom distilling flask.

The grape hangs above the flask (same x as the neck), so the stream drops through the neck into the flask with no
other container. Its fall uses a slow-motion gravity so it reaches the bottom of the flask on the beat (timeline.PLIP1).
"""
import math
import numpy as np
from . import world as Wd
from .world import circle, ellipse, rect, band, edge, ring, CHECK, dot
from . import timeline as T
from . import rig
from .palette import GRAPE, STEM, JUICE, WHITE, OUTLINE

G = (rig.F_START[0], 172.0)          # the grape's centre (above the flask neck)
RX, RY = 8.5, 9.6                    # grape radii (mm)
G_BOTTOM = G[1] - RY
FLOOR = rig.F_START[1] - rig.R_F + 1.0
GRAV = 2 * (G_BOTTOM - FLOOR) / (T.PLIP1 - T.STREAM0) ** 2     # the stream lands exactly on PLIP1
STREAM_END = T.POUR[1]               # the pressing stops; the tail falls


def sway(t):
    """The grape is already moving: a small swing on its stem until the squash."""
    k = 1 - T.u_of(t, T.SQUASH)
    return 1.1 * math.sin(2 * math.pi * 1.4 * t + 0.6) * k


def squash(t):
    k = T.ease_out(T.u_of(t, T.SQUASH), 2.4)
    return 1 + 0.34 * k, 1 - 0.42 * k                         # (sx, sy)


def head_y(t):
    if t < T.STREAM0:
        return None
    return max(G_BOTTOM - 0.5 * GRAV * (t - T.STREAM0) ** 2, FLOOR)


def tail_y(t):
    if t < STREAM_END:
        return G_BOTTOM
    return G_BOTTOM - 0.5 * GRAV * (t - STREAM_END) ** 2


def draw_grape(buf, c, t):
    if c.cy - 240 / c.s > G[1] + 60:
        return
    dx = sway(t)
    sx, sy = squash(t)
    gx = G[0] + dx
    gy = G[1] - RY * (1 - sy)                                # it sits down as it squashes
    # stem and a small leaf, then the grape
    st = band(c, (gx, gy + RY * sy - 0.5), (0.18, 0.984), 0, 40.0, 1.0)
    buf[Wd.full(st)] = STEM[1]
    buf[edge(st)] = OUTLINE
    leaf = ellipse(c, gx + 7.0, gy + RY * sy + 13.0, 5.5, 2.6)
    buf[Wd.full(leaf)] = STEM[1]
    buf[Wd.full(leaf & (c.Y > gy + RY * sy + 13.6))] = STEM[2]
    buf[edge(leaf)] = OUTLINE
    cap = ellipse(c, gx, gy + RY * sy, 2.4, 1.1)
    body = ellipse(c, gx, gy, RX * sx, RY * sy)
    bm = Wd.full(body)
    X, Y = Wd.full(c.X), Wd.full(c.Y)
    nx, ny = (X - gx) / (RX * sx), (Y - gy) / (RY * sy)
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    lam = -0.52 * nx + 0.55 * ny + 0.65 * nz              # a sphere lit from the upper left, in four flat bands
    shade = bm & (lam < 0.18)
    buf[bm] = GRAPE[2]
    buf[bm & (lam < 0.42)] = GRAPE[1]
    buf[shade] = GRAPE[0]
    buf[bm & (lam > 0.86)] = GRAPE[3]                     # violet highlight
    buf[bm & CHECK & (lam > 0.74) & (lam <= 0.86)] = GRAPE[3]
    buf[bm & (lam > 0.97)] = GRAPE[4]
    rim = bm & (nx > 0.55) & (ny < -0.1) & (nz < 0.45)    # a faint bounce light on the shadow side
    buf[rim & CHECK] = GRAPE[1]
    buf[ring(body)] = OUTLINE
    buf[Wd.full(cap)] = STEM[0]
    # the glint: one bright pixel band sweeping across the skin
    if T.GLINT[0] <= t < T.GLINT[1]:
        u = T.u_of(t, T.GLINT)
        p = -1.2 + 2.4 * u
        g = bm & (np.abs(nx * 0.7 - ny * 0.7 - p) < 0.14)
        buf[g] = WHITE
        buf[bm & (np.abs(nx * 0.7 - ny * 0.7 - p) < 0.26) & ~g & ~shade] = GRAPE[4]
    # the burst at the bottom when it squashes
    if t >= T.SQUASH[0] + 0.08:
        split = ellipse(c, gx, gy - RY * sy + 0.6, 2.6 * sx, 1.0)
        buf[Wd.full(split)] = JUICE[1]


def draw_stream(buf, c, t):
    """The falling juice: a deep-purple column with a lighter edge and a round head."""
    hy = head_y(t)
    if hy is None:
        return
    ty = tail_y(t)
    if ty <= FLOOR + 0.5:
        return
    x = G[0]
    lo, hi = max(hy, FLOOR), ty
    if hi <= lo:
        return
    pulse = 1.0 + 0.18 * math.sin(t * 22.0) if t >= T.PLIP1 else 1.0          # more grapes pressed, off screen
    w = 1.5 * pulse
    col = rect(c, x - w, x + w, lo, hi)
    m = Wd.full(col)
    buf[m] = JUICE[1]
    buf[Wd.full(rect(c, x - w, x - w * 0.35, lo, hi))] = JUICE[3]
    head = circle(c, x, lo + 0.6, w * 1.35)
    if hy > FLOOR + 0.5:
        buf[Wd.full(head)] = JUICE[1]
        buf[edge(head)] = JUICE[3]
    buf[ring(m | Wd.full(head if hy > FLOOR + 0.5 else col)) & ~Wd.full(c.Y < FLOOR)] = OUTLINE


def draw_landing(buf, c, t):
    """The first touch: a few purple pixels hop up from the new pool."""
    if not (T.PLIP1 <= t < T.PLIP1 + 0.45):
        return
    u = (t - T.PLIP1) / 0.45
    lvl = rig.F_START[1] - rig.R_F + rig.pool_depth(t)
    for k, (vx, vy) in enumerate(((-7, 13), (7, 13), (-3, 18), (3, 18))):
        x = G[0] + vx * u
        y = lvl + vy * u - 36 * u * u
        if y < lvl:
            continue
        px, py = c.to(x, y)
        dot(buf, px, py, JUICE[3], 2 if c.s > 2.5 else 1)
