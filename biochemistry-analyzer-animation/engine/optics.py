"""The optical station in cutaway (24.3-30 s): light source on the left, the rose cuvette in the middle, the
detector on the right, the electronics below.

  25.5-26.7  a clean pixel beam (a teaching overlay, not a visible laser) leaves the lamp, passes the lens and the
             filter, enters the coloured mixture, gets weaker and thinner on the way through, and a weaker beam
             reaches the detector
  28.25      the detector answers with one electronic pulse that runs down to the electronics
  28.8-29.6  a compact comparison: the reference light level (blank cuvette icon) next to the measured light level
             (rose cuvette icon), lower
  29.6-30    the comparison resolves into one data packet that leaves for the workstation
The analyzer turns calibrated absorbance into a concentration; nothing here counts molecules.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import View, put, tones, mix

W, H = gfx.W, gfx.H
_JJ, _II = np.mgrid[0:H, 0:W]
BEAM_Y = 4.0
TRANS = 0.42                   # fraction of the light that gets through the rose mixture (illustrative)


def _grid(view, bx):
    U, V = view.grid(bx)
    U, V = np.broadcast_arrays(U, V)
    return np.array(U), np.array(V)


def _box(buf, view, x0, y0, x1, y1, ramp, v=0.5, hatch=False, edge=True):
    bx = view.box(x0, y0, x1, y1, 1)
    if bx is None:
        return None
    X, Y = _grid(view, bx)
    m = (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)
    put(buf, bx, m, tones(ramp, np.clip(v - 0.1 * (Y - y0) / max(y1 - y0, 1e-6), 0, 1), bx))
    if hatch:
        ii = np.arange(bx[0], bx[2])[None, :]
        jj = np.arange(bx[1], bx[3])[:, None]
        put(buf, bx, m & (((ii + jj) % 4) == 0), ramp[max(0, int(v * (len(ramp) - 1)) - 2)])
    if edge:
        o = 1.0 / view.z
        e = m & ((X < x0 + o) | (X > x1 - o) | (Y < y0 + o) | (Y > y1 - o))
        put(buf, bx, e, ramp[0])
    return bx, m


def render(t):
    t = t % T.TOTAL
    view = View(0.0, -2.0, 4.4)
    view.apply()
    buf = np.zeros((H, W, 3), np.uint8)
    buf[...] = tones(P.NV, np.clip(0.34 + 0.0006 * (_JJ - 240), 0, 1), (0, 0, W, H))
    bx_all = view.full()
    X, Y = _grid(view, bx_all)
    o = 1.0 / view.z
    lamp_on = T.smooth((t - 25.4) / 0.15)
    # ---- housing in section (hatched cut faces), the light tunnel and the cuvette slot
    _box(buf, view, -34, -22, 34, -5, P.GR, 0.42, hatch=True)
    _box(buf, view, -34, 9, 34, 26, P.GR, 0.38, hatch=True)
    tunnel = (np.abs(Y - BEAM_Y) < 4.6) & (np.abs(X) < 34)
    put(buf, bx_all, tunnel, P.NV[2])
    slot = (np.abs(X) < 6.0) & (Y > -22) & (Y < 26)
    put(buf, bx_all, slot, P.NV[3])
    # ---- the lamp: reflector, bulb, glowing filament
    refl = (np.hypot(X + 30, (Y - BEAM_Y) * 0.9) < 9) & (np.hypot(X + 30, (Y - BEAM_Y) * 0.9) > 7.6) & (X < -28)
    put(buf, bx_all, refl, P.MT[6])
    bulb = np.hypot(X + 26.5, Y - BEAM_Y) < 4.2
    put(buf, bx_all, bulb, tones(P.BEAM, np.clip(0.35 + 0.6 * lamp_on - 0.06 * np.hypot(X + 27.5, Y - BEAM_Y + 1), 0, 1),
                                 bx_all))
    fil = (np.abs(Y - BEAM_Y - 0.9 * np.sin((X + 26.5) * 3.0)) < 0.4) & (np.abs(X + 26.5) < 2.2)
    put(buf, bx_all, fil, P.WHITE if lamp_on > 0.5 else P.AM[4])
    if lamp_on > 0.5:
        glow = (np.hypot(X + 26.5, Y - BEAM_Y) < 7.5) & ~bulb
        th = gfx.bayer_at(0, 0, H, W)
        mix(buf, bx_all, glow & (th < 0.35), P.BEAM[5], 0.6)
    # lens and filter
    lens = ((X + 17.5) ** 2 / 1.6 ** 2 + (Y - BEAM_Y) ** 2 / 4.4 ** 2) <= 1.0
    put(buf, bx_all, lens, P.RG[6])
    put(buf, bx_all, lens & (np.abs(X + 18.0) < 0.4), P.WHITE)
    filt = (np.abs(X + 11.5) < 0.9) & (np.abs(Y - BEAM_Y) < 4.4)
    put(buf, bx_all, filt, P.MN[5])
    # ---- the detector on the right, on its little board, and the electronics below
    _box(buf, view, 25, BEAM_Y - 5.5, 31, BEAM_Y + 5.5, P.GR, 0.25)
    win = (np.abs(X - 25.6) < 0.7) & (np.abs(Y - BEAM_Y) < 3.6)
    put(buf, bx_all, win, P.CY[3])
    _box(buf, view, -26, 34, 30, 44, P.PC, 0.5)
    _box(buf, view, 6, 36, 18, 42, P.NV, 0.15)
    for k in range(5):
        put(buf, bx_all, (np.abs(X - (7.5 + 2.4 * k)) < 0.35) & (np.abs(Y - 35.2) < 0.9), P.MT[6])
        put(buf, bx_all, (np.abs(X - (7.5 + 2.4 * k)) < 0.35) & (np.abs(Y - 42.8) < 0.9), P.MT[6])
    trace = [(28.0, BEAM_Y + 5.5), (28.0, 30.0), (12.0, 30.0), (12.0, 36.0)]
    for (x0, y0), (x1, y1) in zip(trace[:-1], trace[1:]):
        seg = (np.minimum(x0, x1) - 0.3 <= X) & (X <= np.maximum(x0, x1) + 0.3) & \
            (np.minimum(y0, y1) - 0.3 <= Y) & (Y <= np.maximum(y0, y1) + 0.3)
        put(buf, bx_all, seg, P.AM[4])
    # ---- the cuvette in section with the rose mixture
    wall = (np.abs(X) > 3.2) & (np.abs(X) < 4.2) & (Y > -20) & (Y < 16)
    put(buf, bx_all, wall, P.RG[6])
    liq = (np.abs(X) <= 3.2) & (Y > -8) & (Y < 15)
    put(buf, bx_all, liq, tones(P.RO, np.clip(0.62 - 0.01 * Y, 0, 1), bx_all))
    put(buf, bx_all, liq & (np.abs(Y + 8) < 0.6 * o + 0.05), P.RO[7])
    put(buf, bx_all, (np.abs(X) <= 4.2) & (np.abs(Y + 20) < 0.7 * o + 0.1), P.SE[7])         # hero rim
    put(buf, bx_all, (np.abs(Y - 15.5) < 0.6) & (np.abs(X) < 4.2), P.RG[6])
    # ---- the beam (teaching overlay)
    front = T.keys(t, [(25.55, -24.0), (26.1, -3.2), (26.4, 3.2), (26.7, 25.0)])
    if t >= 25.55:
        xs = X
        inside = (xs > -3.2) & (xs < 3.2)
        after = xs >= 3.2
        frac = np.clip((xs + 3.2) / 6.4, 0, 1)
        inten = np.where(xs < -3.2, 1.0, np.where(inside, 1.0 - (1.0 - TRANS) * frac, TRANS))
        half = 2.3 * np.where(xs < -3.2, 1.0, np.where(inside, 1.0 - 0.5 * frac, 0.5)) + 0.25
        beam = (np.abs(Y - BEAM_Y) < half) & (xs > -23.0) & (xs < front) & (xs < 25.0)
        th = gfx.bayer_at(0, 0, H, W)
        core = beam & (np.abs(Y - BEAM_Y) < half * 0.45)
        lvl = np.clip(inten * 1.1 + 0.05 * np.sin(t * 30 + xs), 0, 1)
        put(buf, bx_all, beam & (th < lvl), P.BEAM[5])
        put(buf, bx_all, core & (th < lvl), P.BEAM[6])
        put(buf, bx_all, beam & inside & (th < 0.25), P.RO[7])
        if front > 25.0:                                         # the detector window lights up (weakly)
            put(buf, bx_all, win, P.BEAM[4])
    # ---- the electronic pulse
    if 28.25 <= t < 28.75:
        u = (t - 28.25) / 0.5
        lens_ = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(trace[:-1], trace[1:])]
        dist = u * sum(lens_)
        for (x0, y0), (x1, y1), L in zip(trace[:-1], trace[1:], lens_):
            if dist <= L:
                px_, py_ = x0 + (x1 - x0) * dist / L, y0 + (y1 - y0) * dist / L
                break
            dist -= L
        pulse = np.hypot(X - px_, Y - py_) < 1.3
        put(buf, bx_all, pulse, P.AM[8])
        put(buf, bx_all, np.hypot(X - px_, Y - py_) < 0.6, P.WHITE)
    if 28.2 <= t < 28.45:
        put(buf, bx_all, win, P.WHITE)
    # ---- the comparison: reference light level vs measured light level
    if t >= 28.8:
        grow = T.smooth((t - 28.8) / 0.4)
        squash = T.smooth((t - 29.6) / 0.25)
        _comparison(buf, view, X, Y, grow, squash, t)
    return buf


def _cuvette_icon(buf, view, X, Y, x, y, fill):
    bx = view.full()
    put(buf, bx, (np.abs(X - x) < 2.6) & (np.abs(Y - y) < 3.8) & ~((np.abs(X - x) < 1.8) & (Y < y + 3.0)), P.RG[6])
    if fill is not None:
        put(buf, bx, (np.abs(X - x) < 1.8) & (Y > y - 1.0) & (Y < y + 3.0), fill)


def _comparison(buf, view, X, Y, grow, squash, t):
    bx = view.full()
    base_y = -26.0
    full_h = 15.0
    x_ref, x_mea = -9.0, 9.0
    panel = (np.abs(X) < 19) & (Y > base_y - full_h - 11.5) & (Y < base_y + 3)
    mix(buf, bx, panel, P.NV[1], 0.8)
    put(buf, bx, panel & ((np.abs(np.abs(X) - 19) < 0.25) | (np.abs(Y - base_y - 3) < 0.25) |
                          (np.abs(Y - (base_y - full_h - 11.5)) < 0.25)), P.NV[6])
    sx = 1.0 - squash
    for x, level, fill in ((x_ref, 1.0, P.RG[7]), (x_mea, TRANS, P.RO[5])):
        h = full_h * level * grow
        cx = x * sx
        bar = (np.abs(X - cx) < 4.0 * max(sx, 0.15)) & (Y > base_y - h) & (Y <= base_y)
        put(buf, bx, bar, P.BEAM[6] if x < 0 else P.BEAM[4])
        put(buf, bx, bar & (np.abs(Y - (base_y - h)) < 0.5), P.WHITE)
        if squash < 0.3:
            _cuvette_icon(buf, view, X, Y, x, base_y - full_h - 6, fill if x > 0 else None)
    put(buf, bx, (np.abs(X) < 16) & (np.abs(Y - base_y - 0.6) < 0.3), P.SUB)
    if squash > 0.6:                                             # the packet leaves for the workstation
        u = T.smooth((t - 29.75) / 0.25)
        px_, py_ = 2.0 + 60.0 * u, base_y - 6.0 - 20.0 * u
        pk = (np.abs(X - px_) < 3.0) & (np.abs(Y - py_) < 2.0)
        put(buf, bx, pk, P.CY[7])
        put(buf, bx, pk & (np.abs(X - px_) < 2.0) & (np.abs(Y - py_) < 1.0) & ((np.floor(X * 2) % 2) == 0), P.NV[2])
