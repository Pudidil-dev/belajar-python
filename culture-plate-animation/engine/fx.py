"""Game-feel effects shared with the blood centrifuge film: sparkles, twinkles, bursts, ring waves, light rays,
glows and floating dust. All hard-edged pixel sprites or Bayer-dithered fills."""
import math
import numpy as np
from . import gfx
from .palette import BG, MW, TL, PL


def clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def ease_out(x, p=2.0):
    return 1 - (1 - clamp01(x)) ** p


def star(buf, x, y, size, col, col2=None):
    """A pixel sparkle: 1 = dot, 2 = plus, 3 = long plus, 4 = plus with diagonals."""
    x, y = int(round(x)), int(round(y))
    pts = [(0, 0)]
    if size >= 2:
        pts += [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if size >= 3:
        pts += [(2, 0), (-2, 0), (0, 2), (0, -2)]
    if size >= 4:
        pts += [(3, 0), (-3, 0), (0, 3), (0, -3), (1, 1), (-1, -1), (1, -1), (-1, 1)]
    for dx, dy in pts:
        xx, yy = x + dx, y + dy
        if 0 <= xx < gfx.W and 0 <= yy < gfx.H:
            buf[yy, xx] = col if (dx, dy) == (0, 0) or col2 is None or abs(dx) + abs(dy) <= 1 else col2


def twinkles(buf, t, x0, y0, x1, y1, n, seed, cols=(MW[8], PL[7]), a=1.0, avoid=None):
    rng = np.random.default_rng(seed)
    xs = rng.uniform(x0, x1, n)
    ys = rng.uniform(y0, y1, n)
    ph = rng.uniform(0, 1, n)
    per = rng.uniform(0.7, 1.6, n)
    for i in range(n):
        k = ((t / per[i]) + ph[i]) % 1.0
        b = 1 - abs(k - 0.5) * 2
        if b < 0.45 or rng.uniform() > a:
            continue
        if avoid is not None and avoid(xs[i], ys[i]):
            continue
        size = 1 + int((b - 0.45) / 0.55 * 3.0)
        star(buf, xs[i], ys[i], size, cols[i % len(cols)])


def burst(buf, t, t0, cx, cy, seed, n=26, speed=(60, 150), life=0.8, cols=(MW[8], PL[7], PL[5], TL[6])):
    """Radial particles that fly out and slow down, shrinking from stars to dots."""
    tau = t - t0
    if tau < 0 or tau > life:
        return
    rng = np.random.default_rng(seed)
    ang = rng.uniform(0, 2 * math.pi, n)
    spd = rng.uniform(*speed, n)
    lf = life * rng.uniform(0.6, 1.0, n)
    for i in range(n):
        if tau > lf[i]:
            continue
        k = tau / lf[i]
        dist = spd[i] * lf[i] * (1 - (1 - k) ** 2) * 0.55
        x = cx + math.cos(ang[i]) * dist
        y = cy + math.sin(ang[i]) * dist * 0.9
        size = 3 if k < 0.3 else (2 if k < 0.65 else 1)
        star(buf, x, y, size, cols[i % len(cols)])


def ring_wave(buf, t, t0, cx, cy, r1, life, col, ry_k=1.0):
    tau = t - t0
    if tau < 0 or tau > life:
        return
    k = ease_out(tau / life, 2.5)
    r = 4 + (r1 - 4) * k
    rg = gfx.ring(cx, cy, r, r * ry_k, 2.0 if k < 0.6 else 1.0)
    gfx.fill_dither(buf, rg, None, col, 1 - k * 0.85)


def rays(buf, cx, cy, t, n=12, col=PL[1], a=0.5, spin=0.12, rmax=400):
    """Slowly turning light rays behind a reveal (dithered wedges)."""
    if a <= 0:
        return
    Y, X = np.mgrid[0:gfx.H, 0:gfx.W]
    ang = np.arctan2(Y + 0.5 - cy, X + 0.5 - cx) + t * spin
    wedge = (np.cos(ang * n) > 0.55)
    r = np.hypot(X + 0.5 - cx, (Y + 0.5 - cy) * 0.75)
    fade = np.clip(1.0 - r / rmax, 0, 1) * a
    m = wedge & (fade > gfx.BAYER[:gfx.H, :gfx.W])
    buf[m] = col


def glow(buf, cx, cy, rx, ry, cols, strength=1.0):
    Y, X = np.mgrid[0:gfx.H, 0:gfx.W]
    r = np.hypot((X + 0.5 - cx) / rx, (Y + 0.5 - cy) / ry)
    v = np.clip(1 - r, 0, 1) * len(cols) * strength + gfx.BAYER[:gfx.H, :gfx.W]
    for i, c in enumerate(cols):
        buf[v > i + 1] = c


def dust(buf, t, n, seed, col=BG[5], speed=6.0):
    rng = np.random.default_rng(seed)
    xs = rng.uniform(0, gfx.W, n)
    ys = rng.uniform(0, gfx.H, n)
    sp = rng.uniform(0.4, 1.0, n) * speed
    for i in range(n):
        y = int((ys[i] - t * sp[i]) % gfx.H)
        x = int((xs[i] + 3 * math.sin(t * 0.7 + i)) % gfx.W)
        buf[y, x] = col
