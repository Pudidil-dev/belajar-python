"""Vectorised helpers for drawing many small round things at once (colony domes, rod-shaped cells).

Every shape lives in a pixel box. boxes_pixels() lists every (shape, pixel) pair of all the boxes in one go, so a
frame with ten thousand cells is a handful of numpy calls instead of ten thousand small ones. resolve() keeps one
shape per pixel (the one with the lowest key), deterministically. world-anchored value noise and a Bayer dither
helper live here too.
"""
import numpy as np
from . import gfx

W, H = gfx.W, gfx.H


def boxes_pixels(x0, y0, x1, y1):
    """Integer boxes [x0, x1) x [y0, y1) (arrays) -> (box index, px, py) of every on-canvas pixel in every box."""
    x0 = np.clip(np.asarray(x0, np.int64), 0, W)
    x1 = np.clip(np.asarray(x1, np.int64), 0, W)
    y0 = np.clip(np.asarray(y0, np.int64), 0, H)
    y1 = np.clip(np.asarray(y1, np.int64), 0, H)
    ww = np.maximum(x1 - x0, 0)
    hh = np.maximum(y1 - y0, 0)
    n = ww * hh
    total = int(n.sum())
    if total == 0:
        e = np.zeros(0, np.int64)
        return e, e, e
    bi = np.repeat(np.arange(len(n)), n)
    start = np.cumsum(n) - n
    k = np.arange(total, dtype=np.int64) - start[bi]
    w_ = ww[bi]
    px = x0[bi] + k % w_
    py = y0[bi] + k // w_
    return bi, px, py


def resolve(lin, key):
    """For pixel indices `lin` with ranking `key` (lower wins), return the positions (into lin/key) of the winners."""
    if len(lin) == 0:
        return np.zeros(0, np.int64)
    order = np.lexsort((key, lin))
    _, first = np.unique(lin[order], return_index=True)
    return order[first]


def _hash(ix, iy, seed):
    h = (ix.astype(np.uint64) * np.uint64(374761393) + iy.astype(np.uint64) * np.uint64(668265263)
         + np.uint64(seed * 1442695 + 7)) & np.uint64(0xFFFFFFFF)
    h = ((h ^ (h >> np.uint64(13))) * np.uint64(1274126177)) & np.uint64(0xFFFFFFFF)
    h = h ^ (h >> np.uint64(16))
    return (h & np.uint64(0xFFFF)).astype(np.float32) / 65535.0


def vnoise(x, y, seed=0):
    """Smooth value noise in [0, 1], anchored to world coordinates (x, y are arrays in noise cells)."""
    x = np.asarray(x, np.float64)
    y = np.asarray(y, np.float64)
    ix = np.floor(x)
    iy = np.floor(y)
    fx = (x - ix).astype(np.float32)
    fy = (y - iy).astype(np.float32)
    ix = ix.astype(np.int64)
    iy = iy.astype(np.int64)
    m = 0xFFFFF
    ix0, iy0, ix1, iy1 = ix & m, iy & m, (ix + 1) & m, (iy + 1) & m
    sx = fx * fx * (3 - 2 * fx)
    sy = fy * fy * (3 - 2 * fy)
    a = _hash(ix0, iy0, seed)
    b = _hash(ix1, iy0, seed)
    c = _hash(ix0, iy1, seed)
    d = _hash(ix1, iy1, seed)
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy


def bayer(px, py):
    """Bayer 4x4 thresholds in (0, 1) at canvas pixels (arrays)."""
    return (gfx._B4[np.asarray(py) % 4, np.asarray(px) % 4] + 0.5) / 16.0


def band(v, edges, px, py, strip=0.04):
    """Turn a value into a band index: flat bands, mixed with Bayer dither only inside a thin strip at each edge."""
    v = np.asarray(v, np.float32)
    th = (bayer(px, py) - 0.5) * 2 * strip
    idx = np.zeros(v.shape, np.int32)
    for e in edges:
        idx += (v + th >= e).astype(np.int32)
    return idx


def neighbours_differ(lab):
    """For a label image, masks of pixels whose right / left / down / up neighbour has a different label."""
    r = np.zeros(lab.shape, bool)
    l_ = np.zeros(lab.shape, bool)
    d = np.zeros(lab.shape, bool)
    u = np.zeros(lab.shape, bool)
    r[:, :-1] = lab[:, :-1] != lab[:, 1:]
    l_[:, 1:] = lab[:, 1:] != lab[:, :-1]
    d[:-1, :] = lab[:-1, :] != lab[1:, :]
    u[1:, :] = lab[1:, :] != lab[:-1, :]
    return r, l_, d, u


def shift(m, dx, dy, fill=False):
    """Shift a canvas-sized array by (dx, dy) pixels."""
    out = np.full(m.shape, fill, m.dtype)
    hs, ws = m.shape[:2]
    xs0, xs1 = max(0, -dx), min(ws, ws - dx)
    ys0, ys1 = max(0, -dy), min(hs, hs - dy)
    if xs1 > xs0 and ys1 > ys0:
        out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = m[ys0:ys1, xs0:xs1]
    return out
