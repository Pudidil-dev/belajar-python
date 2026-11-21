"""The cell's repair machinery: the rings that grab the two broken ends and the ligase that seals the strands.

This is non-homologous end joining, drawn simply: a ring clamps each end, the two ends are pulled back together,
a couple of base pairs at the ends crumble away (that is where the small deletion comes from), and the ligase seals
each strand. Nothing here rewrites the DNA to a chosen sequence; the ends are simply joined again, shorter.
"""
import math

import numpy as np

from . import cas9 as C, dna as D, fx, gfx, palette as P, raster as R, timeline as T

W, H = gfx.W, gfx.H


def _torus(seed, R0, r0, n):
    """A ring of little residue spheres: the repair protein clamped round the DNA."""
    rng = np.random.default_rng(seed)
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n + rng.uniform(-0.06, 0.06)
        rr = R0 * rng.uniform(0.94, 1.06)
        tilt = rng.uniform(-1, 1)
        pts.append((rr * math.cos(a) * 0.55 + rng.uniform(-1, 1),      # flattened along the DNA
                    rr * math.sin(a) + rng.uniform(-1, 1),
                    tilt * r0 * 1.7,
                    rng.uniform(2.2, 3.6)))
    return np.array(pts, np.float32)


KU_RING = _torus(5, D.RAD + 7.0, 4.0, 26)
LIG_BLOB = np.array([(math.cos(a) * 4.2, math.sin(a) * 3.6, math.cos(a * 2.3) * 3.0, 2.6)
                     for a in np.linspace(0, 2 * math.pi, 9)[:-1]] +
                    [(0.0, 0.0, 0.0, 3.2)], np.float32)


def ring_at(buf, cam, shape, i, k, t, ramp=P.KU, phase=0.0):
    """A repair ring clamped round the DNA at base pair i, built from the same little spheres as the protein.
    k = 0 just arriving .. 1 fully closed."""
    if k <= 0.01:
        return
    x, y = shape.axis(i)
    squeeze = 1.28 - 0.28 * k
    wob = 0.5 * math.sin(2 * math.pi * 1.5 * t + phase)
    pts = KU_RING.copy()
    pts[:, 0] *= squeeze
    pts[:, 1] *= squeeze
    pts[:, 1] += wob
    C.draw_cloud(buf, cam, pts, ramp, x, y, side=1, alpha=min(1.0, k * 1.6), lit0=0.34)


def ligase(buf, cam, shape, i, strand, k, t):
    """The gold ligase sitting on one strand's nick, sealing it. k = 0 arriving .. 1 sealed."""
    if k <= 0.01:
        return
    bx, by, _ = shape.strand_xy(i, strand)
    pts = LIG_BLOB.copy()
    pts[:, :3] *= 1.0 + 0.45 * (1 - k)
    C.draw_cloud(buf, cam, pts, P.LIG, bx, by, side=1, alpha=min(1.0, k * 1.6), lit0=0.42)


def crumbs(buf, cam, shape, i, t, t0, n=10, seed=0):
    """A base pair crumbling away: little pixels that fly off and fade."""
    tau = t - t0
    if tau < 0 or tau > 0.6:
        return
    x, y = shape.axis(i)
    sx, sy = cam.to(x, y)
    rng = np.random.default_rng(seed)
    for j in range(n):
        a = rng.uniform(0, 2 * math.pi)
        sp = rng.uniform(26, 78) * cam.s / 3.0
        k = tau / 0.6
        d = sp * (1 - (1 - k) ** 2) * 0.5
        px = sx + math.cos(a) * d
        py = sy + math.sin(a) * d
        if k < 0.75:
            col = P.BACK[3] if j % 2 else P.BASES['G'][2]
            size = 2 if k < 0.35 else 1
            gfx.fill(buf, gfx.rect(px, py, px + size, py + size), col)


def snap_flash(buf, cam, shape, i, t, t0):
    """The moment the strands are sealed: a ring wave and a few sparks."""
    x, y = shape.axis(i)
    sx, sy = cam.to(x, y)
    fx.ring_wave(buf, t, t0, sx, sy, 70, 0.45, P.LIG[4])
    fx.burst(buf, t, t0, sx, sy, 404, n=16, speed=(90, 190), life=0.5,
             cols=(P.WHITE, P.LIG[3], P.KU[3], P.LIG[2]))
