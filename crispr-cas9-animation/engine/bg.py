"""The world around the molecule: the inside of a cell nucleus, in parallax layers.

Nothing here is the subject, so everything is dim, out of focus and slow. Three layers, each with its own parallax
factor, so a zoom or a move feels like travelling through a crowded nucleus instead of over a flat backdrop:

  1  chromatin: fat, soft loops of packed DNA drifting far behind
  2  other DNA molecules, drawn as little double helices, crossing the frame at angles
  3  the soup: nucleosome beads, free proteins and specks that drift and blink

Each layer is a tile of world that repeats for ever, so the frame is never empty however far the camera travels or
zooms, and every drift is a whole number of laps per loop, so the film joins back to its own first frame.
"""
import math

import numpy as np

from . import gfx, raster as R, palette as P, timeline as T

W, H = gfx.W, gfx.H
SEED = 20261121

PAR = (0.0, 0.22, 0.45, 0.72)      # how much each layer follows the camera
ZPAR = (0.0, 0.16, 0.34, 0.58)     # ... and its zoom
TILE = (0.0, 560.0, 300.0, 190.0)  # the world tile each layer repeats
BASE_S = 2.2


def _rng(k):
    return np.random.default_rng(SEED + k)


def _items(k, n, make):
    rng = _rng(k)
    return [make(rng) for _ in range(n)]


CHROM = _items(1, 2, lambda r: dict(x=r.uniform(0, TILE[1]), y=r.uniform(0, TILE[1]),
                                    rad=r.uniform(70, 150), w=r.uniform(16, 30),
                                    sq=r.uniform(0.5, 1.0), rot=r.uniform(0, 3.14), ph=r.uniform(0, 6.28)))
OTHERS = _items(2, 2, lambda r: dict(x=r.uniform(0, TILE[2]), y=r.uniform(0, TILE[2]),
                                     ang=r.uniform(0, 3.14), n=int(r.integers(20, 30)),
                                     rise=r.uniform(7.0, 9.5), rad=r.uniform(15.0, 23.0),
                                     turn=r.uniform(9.0, 12.0), ph=r.uniform(0, 6.28), col=int(r.integers(0, 2))))
SOUP = _items(3, 7, lambda r: dict(x=r.uniform(0, TILE[3]), y=r.uniform(0, TILE[3]),
                                   rad=r.uniform(2.0, 6.0), kind=int(r.integers(0, 3)),
                                   ph=r.uniform(0, 1), sp=float(r.integers(1, 4))))


class _LCam:
    """A camera for one layer: it follows the real one only partly, and keeps its rotation."""

    def __init__(self, cam, k):
        self.s = BASE_S * (max(cam.s, 0.05) / BASE_S) ** ZPAR[k]
        self.cx, self.cy = cam.cx * PAR[k], cam.cy * PAR[k]
        self.c, self.sn = math.cos(cam.rot), math.sin(cam.rot)

    def to(self, x, y):
        dx, dy = (x - self.cx) * self.s, (y - self.cy) * self.s
        return W / 2 + dx * self.c - dy * self.sn, H / 2 + dx * self.sn + dy * self.c

    def tiles(self, tile):
        """Which tiles of this layer can be on screen."""
        rad = math.hypot(W, H) / 2 / self.s + tile
        i0, i1 = int(math.floor((self.cx - rad) / tile)), int(math.ceil((self.cx + rad) / tile))
        j0, j1 = int(math.floor((self.cy - rad) / tile)), int(math.ceil((self.cy + rad) / tile))
        return [(i, j) for i in range(i0, i1 + 1) for j in range(j0, j1 + 1)]


def _dim_disc(buf, cx, cy, r, body, top=None):
    if r < 0.9:
        if 0 <= int(cx) < W and 0 <= int(cy) < H:
            buf[int(cy), int(cx)] = body
        return
    gfx.fill(buf, gfx.ellipse(cx, cy, r, r), body)
    if top is not None and r >= 1.8:
        gfx.fill(buf, gfx.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.42, r * 0.38), top)


def draw_chromatin(buf, cam, t):
    """Fat, soft loops of packed DNA far behind everything, drifting slowly."""
    lc = _LCam(cam, 1)
    if lc.s < 0.015:
        return
    u = (t % T.TOTAL) / T.TOTAL
    for (ti, tj) in lc.tiles(TILE[1]):
        for d in CHROM:
            ox = ti * TILE[1] + d['x'] + 26.0 * math.cos(2 * math.pi * u + d['ph'])
            oy = tj * TILE[1] + d['y'] + 26.0 * math.sin(2 * math.pi * u + d['ph'] * 1.3)
            pts = []
            for k in range(25):
                a = 2 * math.pi * k / 24 + d['rot']
                rr = d['rad'] * (1 + 0.24 * math.sin(3 * a + d['ph']))
                pts.append(lc.to(ox + rr * math.cos(a), oy + rr * d['sq'] * math.sin(a)))
            if all(p[0] < -60 or p[0] > W + 60 or p[1] < -60 or p[1] > H + 60 for p in pts):
                continue
            wpx = max(1, int(round(d['w'] * lc.s * 0.5)))
            for a, b in zip(pts[:-1], pts[1:]):
                gfx.fill(buf, gfx.line(a[0], a[1], b[0], b[1], wpx), P.NAVY[4])
            if wpx >= 3:
                for a, b in zip(pts[:-1], pts[1:]):
                    gfx.fill(buf, gfx.line(a[0], a[1] - wpx // 3, b[0], b[1] - wpx // 3, max(1, wpx // 3)),
                             P.NAVY[5])


def draw_others(buf, cam, t):
    """Other double helices drifting past: beads on two winding strands, dim and small."""
    lc = _LCam(cam, 2)
    if lc.s < 0.03:
        return
    u = (t % T.TOTAL) / T.TOTAL
    for (ti, tj) in lc.tiles(TILE[2]):
        for d in OTHERS:
            ca, sa = math.cos(d['ang']), math.sin(d['ang'])
            ox = ti * TILE[2] + d['x'] + 16.0 * math.cos(2 * math.pi * u + d['ph'])
            oy = tj * TILE[2] + d['y'] + 16.0 * math.sin(2 * math.pi * u + d['ph'])
            cx0, cy0 = lc.to(ox, oy)
            reach = d['n'] * d['rise'] * lc.s
            if cx0 + reach < -30 or cx0 - reach > W + 30 or cy0 + reach < -30 or cy0 - reach > H + 30:
                continue
            prev1 = None
            for i in range(d['n']):
                a = 2 * math.pi * i / d['turn'] + d['ph'] + 2 * math.pi * u
                axis = (i - d['n'] / 2) * d['rise']
                for strand in (0, 1):
                    off = d['rad'] * math.cos(a + (0 if strand == 0 else math.pi * 0.62))
                    sx, sy = lc.to(ox + axis * ca - off * sa, oy + axis * sa + off * ca)
                    if not (-12 <= sx < W + 12 and -12 <= sy < H + 12):
                        if strand == 1:
                            prev1 = None
                        continue
                    depth = math.sin(a + (0 if strand == 0 else math.pi * 0.62))
                    r = max(0.8, (1.1 + 0.6 * (depth + 1) / 2) * lc.s * 0.9)
                    col = P.DUST[0] if depth < -0.2 else (P.DUST[1] if d['col'] == 0 else P.DUST[2])
                    _dim_disc(buf, sx, sy, r, col, P.DUST[3] if depth > 0.7 else None)
                    if strand == 0 and prev1 is not None and i % 3 == 0 and r > 1.4:
                        gfx.fill(buf, gfx.line(sx, sy, prev1[0], prev1[1], 1), P.DUST[0])
                    if strand == 1:
                        prev1 = (sx, sy)


def draw_soup(buf, cam, t):
    """Nucleosome beads, free proteins and specks drifting through the nucleoplasm."""
    lc = _LCam(cam, 3)
    u = (t % T.TOTAL) / T.TOTAL
    for (ti, tj) in lc.tiles(TILE[3]):
        for d in SOUP:
            ox = ti * TILE[3] + d['x']
            oy = tj * TILE[3] + d['y'] + TILE[3] * ((u * d['sp'] + d['ph']) % 1.0)   # whole laps per loop
            sx, sy = lc.to(ox, oy)
            if not (-16 <= sx < W + 16 and -16 <= sy < H + 16):
                continue
            r = max(0.7, d['rad'] * lc.s * 0.6)
            if d['kind'] == 0:
                _dim_disc(buf, sx, sy, r, P.DUST[1], P.DUST[2])
            elif d['kind'] == 1:
                _dim_disc(buf, sx, sy, r * 0.8, P.DUST[0], P.DUST[2])
            else:
                k = (u * d['sp'] * 3 + d['ph']) % 1.0
                if 0 <= int(sx) < W and 0 <= int(sy) < H:
                    buf[int(sy), int(sx)] = P.DUST[3] if k < 0.15 else P.DUST[1]


def draw(buf, cam, t):
    """Fill the frame with the nucleus: a navy wash, lighter in the middle, then the three layers."""
    px = np.arange(W)[None, :] + 0.5
    py = np.arange(H)[:, None] + 0.5
    r = np.hypot((px - W / 2) / (W * 0.66), (py - H / 2) / (H * 0.56))
    v = np.clip(1.18 - r, 0, 1)
    PX, PY = np.broadcast_arrays(np.arange(W)[None, :], np.arange(H)[:, None])
    idx = np.clip(np.floor(v * 3.4 + R.bayer(PX, PY) * 0.9), 0, 3).astype(np.int32)
    buf[...] = np.asarray([P.NAVY[0], P.NAVY[1], P.NAVY[2], P.NAVY[3]], np.uint8)[idx]
    draw_chromatin(buf, cam, t)
    draw_others(buf, cam, t)
    draw_soup(buf, cam, t)
