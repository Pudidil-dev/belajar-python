"""The aerosol as a cloud: a world-space fractal noise carried along the flow by the mist clock.

Level of detail: noise octaves are added as the camera zooms (an octave appears once its wavelength spans a few
canvas pixels), so pushing in uncovers finer wisps; past ~60 px/mm the cloud thins out and the droplet layer
(micro.py) takes over, which is how the white cloud "resolves" into pixel droplets.

Loop: the noise is periodic along the flow with period PERIOD, and the flow speed is chosen so the clock's whole loop
(sigma over 20 s) moves the cloud by a whole number of periods; frame 0 and frame 600 show the same mist.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import put, tones, mix, poly_sel, SDFGrid
from . import person, device as D

PERIOD = 60.0                     # mm, along the flow
LAMBDA0 = 10.0                    # mm, the biggest puffs
N0 = int(round(PERIOD / LAMBDA0))
FLOW = 2 * PERIOD / T.SIGMA_TOTAL  # mm per mist-second (two periods per loop, ~29 mm/s at the face)
KMAX = 10


def _hash(i, j, k):
    h = (i.astype(np.int64) * 374761393 + j.astype(np.int64) * 668265263 + k * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFF).astype(np.float32) / 65535.0


def vnoise(sx, y, k):
    """Value noise, octave k (wavelength LAMBDA0 / 2^k), periodic along sx with PERIOD."""
    lam = LAMBDA0 / (2 ** k)
    n = N0 * (2 ** k)
    fx, fy = sx / lam, y / lam
    ix, iy = np.floor(fx), np.floor(fy)
    ax, ay = fx - ix, fy - iy
    ax = ax * ax * (3 - 2 * ax)
    ay = ay * ay * (3 - 2 * ay)
    ix = ix.astype(np.int64) % n
    iy = iy.astype(np.int64)
    ix1 = (ix + 1) % n
    ix, iy, ix1 = np.broadcast_arrays(ix, iy, ix1)
    v00, v10 = _hash(ix, iy, k), _hash(ix1, iy, k)
    v01, v11 = _hash(ix, iy + 1, k), _hash(ix1, iy + 1, k)
    return (v00 * (1 - ax) + v10 * ax) * (1 - ay) + (v01 * (1 - ax) + v11 * ax) * ay


def fbm(sx, y, z, kmin=0, gain=0.55):
    """Fractal noise with zoom-dependent octaves (0..1)."""
    tot, amp, norm = 0.0, 1.0, 0.0
    for k in range(kmin, KMAX + 1):
        lam_px = LAMBDA0 / (2 ** k) * z
        if lam_px < 2.0:
            break
        w = min(1.0, (lam_px - 2.0) / 2.0) if lam_px < 4.0 else 1.0
        if lam_px > 2500:              # far bigger than the screen: a constant, skip
            amp *= gain
            continue
        tot = tot + amp * w * vnoise(sx, y, k)
        norm += amp * w
        amp *= gain
    if norm == 0:
        return np.full(np.broadcast(sx, y).shape, 0.5, np.float32)
    return tot / norm


_MASKG = {}


def mask_grid():
    if not _MASKG:
        _MASKG['mask'] = SDFGrid(person.MASK, 0.6)
    return _MASKG['mask']


def envelope(X, Y, t, cut):
    """Where the mist can be (0..1): the plume from the mesh, the outlet, the mask port and the mask."""
    shape = np.broadcast(X, Y).shape
    e = np.zeros(shape, np.float32)
    ay = np.abs(Y)
    if cut:
        # plume: leaves the dome face thin and spreads to fill the outlet
        x0 = D.dome_x(Y) + 0.03
        w = 3.7 + (D.OUT_RI - 0.4 - 3.7) * (1 - np.exp(-np.maximum(X, 0) / 2.6))
        grow = np.clip((X - x0) / 1.4, 0, 1)
        plume = np.clip((w - ay) / 1.0, 0, 1) * grow * (X > x0) * (X < D.OUT_X1 + 1)
        e = np.maximum(e, plume)
    # the jet pouring out of the outlet mouth through the port toward the nose and mouth
    inh, exh = T.inhale(t), T.exhale(t)
    xs = np.clip((X - 24.0) / 22.0, 0, 1)
    yj = 1.8 * xs
    wj = 7.6 + 6.0 * xs + 3.0 * exh
    jet = np.exp(-((Y - yj) / wj) ** 2) * (X > D.OUT_X1 - 0.5) * np.clip((52.0 - X) / 6.0, 0, 1)
    jet *= np.clip((X - D.OUT_X1 + 0.5) / 2.0, 0, 1) * (1.15 + 0.2 * inh)
    port = (np.abs(Y) < person.PORT[2] - 0.5) & (X < person.PORT[1] + 3)
    g = mask_grid()
    md = g.sample(X, Y)
    inside = np.clip(-md / 2.0, 0, 1)
    jet = jet * np.maximum(inside, port.astype(np.float32))
    # a lighter haze fills the rest of the mask, thinner over the cheek and toward the seal
    hd = person.grids()['head'].sample(X, Y)
    over_face = np.clip(-hd / 3.0, 0, 1)
    haze = inside * (0.42 + 0.22 * exh) * (1 - 0.65 * over_face) * np.clip(1 - (X - 62) / 26, 0.2, 1)
    return np.maximum(e, np.maximum(jet, haze))


def density(X, Y, t, z, cut):
    e = envelope(X, Y, t, cut)
    if not (e > 0.01).any():
        return e
    s = T.sigma(t)
    inh = T.inhale(t)
    # breathing in pulls the mist toward the nostril and the mouth
    pull = np.clip((X - 28) / 18, 0, 1) * inh
    ty = np.where(Y < 2.0, person.NOSTRIL[1], person.MOUTH[1])
    Yw = Y + (ty - Y) * pull * 0.5
    sx = X - FLOW * s
    n = fbm(sx, Yw, z)
    # streaks: fine in y, long in x (the jets coming off the mesh, stretched by the flow)
    st = fbm(sx * 0.18 + 31.0, Yw * 2.2, z * 0.5, 1)
    near = np.clip(1.0 - X / 16.0, 0, 1) if cut else 0.0
    m = n * (1 - 0.45 * near) + st * 0.45 * near
    v = np.clip((m - 0.34) / 0.30, 0, 1)
    return e * (0.12 + 0.88 * v)


def _streaks(X, Y, t, z):
    """Thin flow lines riding the jet (speed lines, the way games show moving air)."""
    s = T.sigma(t)
    row = 2.4
    j = np.floor(Y / row)
    ph = _hash(j.astype(np.int64), np.zeros_like(j, dtype=np.int64), 7)
    u = ((X - 1.5 * FLOW * s) / 30.0 + ph) % 1.0
    on = (u < 0.16) & (np.abs(Y - (j + 0.5) * row) < 0.55 / z + 0.02)
    return on


def _sparkles(X, Y, t, z):
    """Single bright pixels carried with the flow: droplets glinting in the key light.

    Zoom-coherent: each sparkle is a fixed world point on one of a ladder of cell sizes (halving per level); a level
    shows while its cells span a few pixels, so pushing in spreads the old glints apart and new ones appear between."""
    s = T.sigma(t)
    sx = X - FLOW * s
    shape = np.broadcast(X, Y).shape
    out = np.zeros(shape, bool)
    th = None
    for k in range(0, 16):
        n = N0 * (2 ** k)
        cell = PERIOD / n
        cpx = cell * z
        if cpx < 3.0:
            break
        if cpx > 60.0:
            continue
        vis = min(1.0, (cpx - 3.0) / 3.0) * min(1.0, max(0.0, (60.0 - cpx) / 30.0))
        i = np.floor(sx / cell).astype(np.int64) % n
        j = np.floor(Y / cell).astype(np.int64)
        i, j = np.broadcast_arrays(i, j)
        h = _hash(i, j, 11 + 7 * k)
        ox, oy = _hash(i, j, 12 + 7 * k), _hash(i, j, 13 + 7 * k)
        fx = (sx / cell) % 1.0
        fy = (Y / cell) % 1.0
        hit = (np.abs(fx - ox) < 0.5 / cpx) & (np.abs(fy - oy) < 0.5 / cpx)
        out |= hit & (h > 1.0 - 0.45 * vis)
    return out


def draw(buf, view, t, cut=False, alpha=1.0):
    """Paint the cloud over the frame (SNES-style dithered translucency, lit from the top-left)."""
    if alpha <= 0.01:
        return
    z = view.z
    if cut:
        bx = view.box(-1.0, -person.PORT[2] - 1, 100.0, 60.0)
    else:
        bx = view.box(D.OUT_X1 - 1.0, -45.0, 95.0, 58.0)
    if bx is None:
        return
    X, Y = view.grid(bx)
    rho = density(X, Y, t, z, cut)
    if not (rho > 0.02).any():
        return
    o = 1.0 / z
    up = density(X - o, Y - 1.5 * o, t, z, cut)
    lightv = np.clip(0.6 + 2.4 * (rho - up), 0, 1)
    a = np.clip(rho * 1.0, 0, 1) * alpha
    th = gfx.bayer_at(bx[0], bx[1], bx[3] - bx[1], bx[2] - bx[0])
    lev = np.floor(a * 4 + th) / 4.0                     # four translucency steps, dithered between them
    sel = lev > 0
    col = tones(P.MI, np.clip(0.42 + 0.38 * lightv + 0.35 * rho, 0, 1), bx).astype(np.float32)
    i0, j0, i1, j1 = bx
    sub = buf[j0:j1, i0:i1]
    f = sub.astype(np.float32)
    k = (lev * 0.8)[..., None]
    out = f + (col - f) * k
    sub[sel] = np.clip(out[sel], 0, 255).astype(np.uint8)
    st = _streaks(X, Y, t, z) & (rho > 0.35)
    mix(buf, bx, st, P.MI[6], 0.55 * alpha)
    sp = _sparkles(X, Y, t, z) & (rho > 0.3)
    put(buf, bx, sp & (np.asarray(alpha) > 0.5), P.WHITE)
