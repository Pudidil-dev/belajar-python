"""Side cutaways, drawn in millimetres with the 2D camera:

  'preview'  0.95-2.1 s   the drop's gold plume spreads in the reagent, then a time-lapse turns the mixture rose
  'mix'      14-16 s      the stirrer paddle lowers, turns and blends serum and reagent into one even mixture
  'develop'  22-23 s      back out of the molecular view: the colour develops evenly (time-lapse)
  'reagent'  6.55-7.45 s  the reagent probe tip in the bottle: a column of reagent rises inside the tip
  'serum'    10.8-11.6 s  the sample probe tip in the serum tube: a small volume of serum enters the tip
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import View, put, tones, mix, sd_box, sd_circle

W, H = gfx.W, gfx.H
IN, OUT = 3.2, 4.2            # inner / outer half width of the cuvette (mm)
LEVEL = 18.0                  # liquid height (mm above the inner bottom)
RIM = 28.5
_JJ, _II = np.mgrid[0:H, 0:W]


def _grid(view, bx):
    X, Y = view.grid(bx)
    X, Y = np.broadcast_arrays(X, Y)
    return np.array(X), np.array(Y)


def _hash(i, j, k):
    h = (i.astype(np.int64) * 374761393 + j.astype(np.int64) * 668265263 + k * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF).astype(np.float32) / 65535.0


def vnoise(x, y, k=0):
    ix, iy = np.floor(x), np.floor(y)
    ax, ay = x - ix, y - iy
    ax, ay = ax * ax * (3 - 2 * ax), ay * ay * (3 - 2 * ay)
    ix, iy = ix.astype(np.int64), iy.astype(np.int64)
    ix, iy = np.broadcast_arrays(ix, iy)
    v00, v10, v01, v11 = _hash(ix, iy, k), _hash(ix + 1, iy, k), _hash(ix, iy + 1, k), _hash(ix + 1, iy + 1, k)
    return (v00 * (1 - ax) + v10 * ax) * (1 - ay) + (v01 * (1 - ax) + v11 * ax) * ay


def fbm(x, y, k=0, oct=3):
    s, a, n = 0.0, 1.0, 0.0
    for o in range(oct):
        s = s + a * vnoise(x * 2 ** o, y * 2 ** o, k + o * 7)
        n += a
        a *= 0.5
    return s / n


def _bg(view):
    """Inside the machine behind the cuvette: dark navy, the rail at the bottom, neighbours as faint outlines."""
    buf = tones(P.NV, np.clip(0.42 - 0.002 * np.abs(_II - W / 2) - 0.0006 * np.abs(_JJ - 200), 0, 1),
                (0, 0, W, H)).copy()
    bx = view.full()
    X, Y = _grid(view, bx)
    rail = (Y > 1.6) & (Y < 6.0)
    put(buf, bx, rail, tones(P.GR, np.full(rail.shape, 0.22), bx))
    put(buf, bx, (np.abs(Y - 1.7) < 0.6 / view.z), P.GR[3])
    for dx in (-14.0, 14.0):
        nb = (np.abs(np.abs(X - dx) - OUT) < 0.5 / view.z + 0.05) & (Y > -RIM) & (Y < 1.5)
        put(buf, bx, nb, P.NV[6])
    return buf


def _glass(buf, view, hero=True):
    bx = view.full()
    X, Y = _grid(view, bx)
    o = 1.0 / view.z
    wall = (np.abs(X) > IN) & (np.abs(X) < OUT) & (Y > -RIM) & (Y < 1.5)
    bottom = (np.abs(X) <= IN) & (Y >= 0) & (Y < 1.5)
    sec = wall | bottom
    hat = ((_II - _JJ) % 4 == 0)
    mix(buf, bx, sec, P.RG[7], 0.55)
    mix(buf, bx, sec & hat, P.RG[4], 0.35)
    edge = sec & ((np.abs(np.abs(X) - IN) < o) | (np.abs(np.abs(X) - OUT) < o) | (np.abs(Y - 1.5) < o))
    put(buf, bx, edge, P.RG[7])
    rim = (np.abs(X) <= OUT) & (np.abs(X) >= IN - 0.05) & (np.abs(Y + RIM) < 1.2 * o + 0.06)
    put(buf, bx, rim, P.SE[7] if hero else P.RG[7])
    # vertical glint on the left wall
    put(buf, bx, wall & (np.abs(X + 3.75) < 0.6 * o + 0.08) & (Y > -RIM + 3) & (Y < -2), P.WHITE)


def _liquid(buf, view, t, rose, gold, swirl, speed, specks=0.0, layer=0.0):
    """Fill the inside with the mixture: base reagent, a gold serum component, rose dye, moving texture."""
    bx = view.full()
    X, Y = _grid(view, bx)
    o = 1.0 / view.z
    surf = -LEVEL - 0.25 * np.cos(X / IN * math.pi / 2) ** 2 * 0 + 0.35 * (np.abs(X) / IN) ** 4
    inside = (np.abs(X) < IN) & (Y < 0) & (Y > surf)
    # swirling texture (rotates about the middle while stirred / time-lapsed)
    cx, cy = 0.0, -LEVEL / 2
    ang = swirl
    rx, ry = X - cx, Y - cy
    r = np.sqrt(rx * rx + ry * ry)
    a = np.arctan2(ry, rx) + ang * np.exp(-r / 6.0)
    u = r * np.cos(a) * 0.55 + 3.0
    v = r * np.sin(a) * 0.55 - speed
    n = fbm(u, v, 3, 3)
    # colours: reagent -> gold (serum) -> rose (dye)
    rg = np.asarray(P.RG[5], np.float32)
    se = np.asarray(P.SE[6], np.float32)
    ro = np.asarray(P.RO[5], np.float32)
    g = np.clip(gold * (0.55 + 0.9 * (n - 0.5)), 0, 1)
    if layer > 0:                                   # a gold band at the top (serum not yet mixed)
        g = np.maximum(g, layer * np.clip(1 - (Y - surf) / 3.0, 0, 1) * (0.6 + 0.6 * (n - 0.5)))
    rr = np.clip(rose * (1.0 + 0.5 * (n - 0.5)), 0, 1)
    col = rg[None, None, :] * (1 - g[..., None]) + se[None, None, :] * g[..., None]
    col = col * (1 - rr[..., None]) + ro[None, None, :] * rr[..., None]
    shade = 0.92 + 0.12 * (n[..., None] - 0.5) - 0.12 * ((-Y[..., None]) / LEVEL) * 0
    col = np.clip(col * shade, 0, 255)
    th = gfx.bayer_at(0, 0, H, W)[..., None]
    col = np.clip(col + (th - 0.5) * 18.0, 0, 255)
    i0, j0, i1, j1 = bx
    sub = buf[j0:j1, i0:i1]
    behind = sub.astype(np.float32)
    col = col * 0.72 + behind * 0.28                          # translucent: the dark interior shows through
    q = (col / 8).astype(np.int32) * 8 + 4                     # posterize: keep it pixel-art
    sub[inside] = np.clip(q[inside], 0, 255).astype(np.uint8)
    # meniscus line and a few dye specks forming
    put(buf, bx, inside & (Y < surf + 0.7 * o + 0.05), P.RG[7] if rose < 0.5 else P.RO[7])
    if specks > 0:
        hs = _hash(np.floor(X * 4).astype(np.int64) % 997, np.floor(Y * 4 + speed * 3).astype(np.int64), 9)
        put(buf, bx, inside & (hs > 1 - 0.03 * specks), P.RO[6])
    return inside, surf


def _paddle(buf, view, t, down, spin):
    bx = view.full()
    X, Y = _grid(view, bx)
    o = 1.0 / view.z
    tipy = -LEVEL - 9.0 + down * 15.5
    rod = (np.abs(X) < 0.32) & (Y < tipy - 3.0)
    put(buf, bx, rod, tones(P.MT, np.clip(0.7 - 0.3 * (X / 0.32), 0, 1), bx))
    w = 2.7 * abs(math.cos(spin))
    face = math.cos(spin) > 0
    blade = (np.abs(X) < max(w, 0.35)) & (Y > tipy - 3.0) & (Y < tipy)
    put(buf, bx, blade, tones(P.MT, np.full(blade.shape, 0.72 if face else 0.5), bx))
    put(buf, bx, blade & ((np.abs(np.abs(X) - max(w, 0.35)) < o) | (np.abs(Y - tipy) < o)), P.MT[2])
    return tipy


def render(t, mode):
    t = t % T.TOTAL
    if mode in ('reagent', 'serum'):
        return aspirate(t, mode)
    zoom, cy = 13.0, -12.5
    if mode == 'preview' and t > 1.95:              # start pulling back out (into the 3D shot)
        u = T.smoother((t - 1.95) / 0.27)
        zoom = 13.0 * (1 - 0.55 * u)
        cy = -12.5 - 6.0 * u
    cx = 0.0
    if mode == 'mix' and t > 15.85:                 # push through the glass into the liquid (toward the molecules)
        u = T.smoother((t - 15.85) / 0.6)
        zoom = 13.0 * math.exp(3.4 * u)
        cx = -1.2 * u
        cy = -12.5 + 3.0 * u
    if mode == 'develop' and t < 22.55:
        u = T.smoother((22.55 - t) / 0.55)
        zoom = 13.0 * math.exp(3.4 * u)
        cx = -1.2 * u
        cy = -12.5 + 3.0 * u
    view = View(cx, cy, zoom)
    view.apply()
    buf = _bg(view)
    hero = True
    if mode == 'preview':
        e = t - T.LAND
        rose = T.smooth((t - 1.05) / 0.95)
        gold = 0.55 * math.exp(-max(0.0, t - 1.0) / 0.5) + 0.08
        _liquid(buf, view, t, rose, gold, swirl=1.2 * e + 3.0 * max(0.0, t - 1.05), speed=t * 2.2,
                layer=0.9 * math.exp(-e / 0.45), specks=rose)
        _plume(buf, view, e, fade=1 - T.smooth((t - 1.05) / 0.6))
        _timelapse_marks(buf, view, t, T.smooth((t - 1.05) / 0.2) * (1 - T.smooth((t - 1.95) / 0.1)))
    elif mode == 'mix':
        down = T.keys(t, [(14.05, 0.0), (14.35, 1.0), (15.55, 1.0), (15.85, 0.0)])
        blend = T.smooth((t - 14.45) / 1.0)
        spin = 0.0 if t < 14.35 else (min(t, 15.55) - 14.35) * 2 * math.pi * 6.0
        _liquid(buf, view, t, 0.03, 0.18 + 0.25 * blend, swirl=spin * 0.12, speed=t * 0.8,
                layer=0.95 * (1 - blend))
        if down > 0.01:
            _paddle(buf, view, t, down, spin)
            if 14.35 < t < 15.55:
                _swirl_lines(buf, view, t)
    else:                                            # develop
        rose = T.smooth((t - 22.3) / 0.65)
        _liquid(buf, view, t, max(rose, 0.05), 0.4, swirl=1.5 + t, speed=t * 2.0, specks=0.6 + rose)
    _glass(buf, view, hero)
    return buf


def _plume(buf, view, e, fade):
    if e < 0 or fade <= 0.01:
        return
    rng = np.random.default_rng(11)
    for i in range(26):
        a = rng.uniform(-0.9, 0.9)
        sp = rng.uniform(0.5, 1.0)
        d = min(e * (7.0 + 5.0 * sp), 16.0)
        x = math.sin(a) * min(0.3 + e * 2.2 * sp, IN - 0.6)
        y = -LEVEL + 0.8 + d * rng.uniform(0.4, 1.0)
        r = (0.18 + 0.28 * e * sp) * view.z
        sx, sy = view.px(x, y)
        if fade > rng.uniform(0, 1) * 0.9:
            _disc(buf, sx, sy, r, P.SE[5] if i % 3 else P.SE[6])


def _disc(buf, cx, cy, r, col):
    x0, x1 = max(int(cx - r) - 1, 0), min(int(cx + r) + 2, W)
    y0, y1 = max(int(cy - r) - 1, 0), min(int(cy + r) + 2, H)
    if x1 <= x0 or y1 <= y0:
        return
    xs = np.arange(x0, x1) + 0.5
    ys = np.arange(y0, y1) + 0.5
    m = (xs[None, :] - cx) ** 2 + (ys[:, None] - cy) ** 2 <= r * r
    th = gfx.bayer_at(x0, y0, y1 - y0, x1 - x0)
    buf[y0:y1, x0:x1][m & (th < 0.75)] = col


def _timelapse_marks(buf, view, t, a):
    """Time-lapse cue without text: tiny light streaks sweeping across the glass, faster and faster."""
    if a <= 0.01:
        return
    bx = view.full()
    X, Y = _grid(view, bx)
    ph = (t * 3.5) % 1.0
    yy = -RIM + ph * (RIM + 1.5)
    band = (np.abs(Y - yy) < 0.18) & (np.abs(X) < OUT) & (np.abs(X) > IN)
    put(buf, bx, band & (gfx.bayer_at(0, 0, H, W) < a), P.WHITE)


def _swirl_lines(buf, view, t):
    bx = view.full()
    X, Y = _grid(view, bx)
    cy = -LEVEL / 2
    r = np.sqrt(X * X + ((Y - cy) * 0.6) ** 2)
    a = np.arctan2((Y - cy) * 0.6, X)
    arc = (np.abs(((r * 1.4 - t * 9.0) % 2.0) - 1.0) < 0.06) & (np.sin(a * 2 + t * 12) > 0.3)
    inside = (np.abs(X) < IN - 0.3) & (Y < -0.3) & (Y > -LEVEL + 0.5)
    mix(buf, bx, arc & inside, P.WHITE, 0.45)


# ------------------------------------------------------------------ probe aspiration
def aspirate(t, kind):
    """A brief cutaway of the probe tip in its container; a small column of liquid rises inside the tip.

    reagent: the neck and shoulder of a reagent bottle (white plastic in section, teal cap collar, clear reagent)
    serum:   a glass sample tube (thin walls in section, amber rack collar, pale-gold serum)"""
    if kind == 'reagent':
        a, b = 6.55, 7.45
        liq, cap = P.RG, P.CY
    else:
        a, b = 10.8, 11.6
        liq, cap = P.SE, P.AM
    u = T.clamp01((t - a) / (b - a))
    zoom = 9.5 + 1.0 * u
    view = View(0.0, 2.0, zoom)
    view.apply()
    buf = tones(P.NV, np.clip(0.3 + 0.0005 * (_JJ - 240), 0, 1), (0, 0, W, H)).copy()
    bx = view.full()
    X, Y = _grid(view, bx)
    o = 1.0 / view.z
    surface = 6.0 if kind == 'reagent' else 0.0
    if kind == 'reagent':
        neck_in, neck_out, body_in, body_out = 5.2, 6.8, 14.0, 15.6
        neck = (np.abs(X) > neck_in) & (np.abs(X) < neck_out) & (Y > -16) & (Y < -1.5)
        shoulder = (np.abs(X) > neck_in) & (np.abs(X) < body_out) & (Y >= -1.5) & (Y < 0.2)
        body = (np.abs(X) > body_in) & (np.abs(X) < body_out) & (Y >= 0.2)
        wallm = neck | shoulder | body
        inside = (np.abs(X) < body_in) & (Y >= 0.2)
        capm = (np.abs(X) > neck_out) & (np.abs(X) < neck_out + 2.4) & (Y > -16) & (Y < -11.5)
        walls_ramp = P.BODY
    else:
        half, wall = 5.6, 0.9
        wallm = (np.abs(X) > half) & (np.abs(X) < half + wall) & (Y > -14)
        inside = np.abs(X) < half
        capm = (np.abs(X) > half) & (np.abs(X) < half + wall + 1.4) & (Y > 14) & (Y < 19)
        walls_ramp = P.RG
    liquid = inside & (Y > surface + 0.35 * np.exp(-(np.abs(X) - 0.9) ** 2 / 1.5) * (np.abs(X) > 0.85))
    put(buf, bx, liquid, tones(liq, np.clip(0.66 - 0.01 * (Y - surface), 0, 1), bx))
    put(buf, bx, liquid & (np.abs(Y - surface) < 0.7 * o + 0.04), liq[-1])
    put(buf, bx, wallm, tones(walls_ramp, np.full(wallm.shape, 0.78), bx))
    put(buf, bx, wallm & (((_II - _JJ) % 4) == 0), walls_ramp[4])
    put(buf, bx, capm, tones(cap, np.full(capm.shape, 0.66), bx))
    put(buf, bx, capm & (((_II - _JJ) % 4) == 0), cap[3])
    # the probe: steel walls in section, the inner channel, dipped ~2 mm into the liquid
    dip = 2.2 * T.smoother(u / 0.15)
    tip = surface + dip
    r_out, r_in = 0.85, 0.36
    steel = (np.abs(X) < r_out) & (np.abs(X) > r_in) & (Y < tip)
    channel = (np.abs(X) <= r_in) & (Y < tip)
    put(buf, bx, steel, tones(P.MT, np.clip(0.75 - 0.35 * X / r_out, 0, 1), bx))
    put(buf, bx, channel, tones(P.NV, np.full(channel.shape, 0.2), bx))
    rise = 9.0 * T.smoother((u - 0.12) / 0.8)
    col_top = tip - rise
    column = channel & (Y > col_top)
    put(buf, bx, column, tones(liq, np.full(column.shape, 0.72), bx))
    put(buf, bx, channel & (np.abs(Y - col_top) < 0.8 * o), liq[-1])
    put(buf, bx, (steel | channel) & (np.abs(np.abs(X) - r_out) < 0.8 * o), P.MT[2])
    # the arm's accent collar at the top of the frame tells which probe this is
    collar = (np.abs(X) < 2.4) & (Y < -20.5) & (Y > -24.5)
    put(buf, bx, collar, tones(cap, np.full(collar.shape, 0.7), bx))
    return buf
