"""The molecular view (16-23 s): a simplified, clearly schematic picture of the enzymatic total-cholesterol assay.

  16.6-18.0  cholesterol esterase (teal) clamps a cholesterol ester and SNAPS it: the fatty-acid tail drifts off,
             free cholesterol (steroid rings + OH) is released
  18.0-20.5  cholesterol oxidase (amber) takes an O2 (two cyan beads) and acts on the cholesterol: a hydrogen
             peroxide (two red O + two small H) pops out; the camera follows the peroxide
  20.5-22.5  peroxidase (mint, with a heme) uses the peroxide to join two small dye precursors into the rose dye;
             more dye molecules accumulate and the liquid tints rose

Icons only, no text, no faces. The camera pans across one long strip in "molecule units".
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import View, put, tones, mix

W, H = gfx.W, gfx.H
S = 13.0                       # hexagon side (molecule units)
_JJ, _II = np.mgrid[0:H, 0:W]


def _grid(view, bx):
    U, V = view.grid(bx)
    U, V = np.broadcast_arrays(U, V)
    return np.array(U), np.array(V)


def bead(buf, view, x, y, r, ramp, hl=True):
    bx = view.box(x - r - 1, y - r - 1, x + r + 1, y + r + 1)
    if bx is None:
        return
    X, Y = _grid(view, bx)
    d = np.hypot(X - x, Y - y) / r
    m = d <= 1.0
    nx, ny = (X - x) / r, (Y - y) / r
    v = 0.55 + 0.4 * np.clip(-0.6 * nx - 0.7 * ny, -1, 1) * 0.8 - 0.15 * d * d
    put(buf, bx, m, tones(ramp, np.clip(v, 0, 1), bx))
    e = m & (d > 1 - 1.3 / max(r * view.z, 1))
    put(buf, bx, e, ramp[1])
    if hl and r * view.z > 3:
        put(buf, bx, np.hypot(X - (x - 0.35 * r), Y - (y - 0.4 * r)) < max(0.22 * r, 0.8 / view.z), P.WHITE)


def stroke(buf, view, a, b, w, col):
    """Thick segment (bond)."""
    (x0, y0), (x1, y1) = a, b
    bx = view.box(min(x0, x1) - w, min(y0, y1) - w, max(x0, x1) + w, max(y0, y1) + w)
    if bx is None:
        return
    X, Y = _grid(view, bx)
    dx, dy = x1 - x0, y1 - y0
    L = dx * dx + dy * dy or 1.0
    h = np.clip(((X - x0) * dx + (Y - y0) * dy) / L, 0, 1)
    d = np.hypot(X - x0 - dx * h, Y - y0 - dy * h)
    put(buf, bx, d <= w / 2 + 0.5 / view.z, col)


def ring(buf, view, cx, cy, n, r, rot, fill_ramp, line_col, fill_a=0.55):
    pts = [(cx + r * math.cos(rot + 2 * math.pi * k / n), cy + r * math.sin(rot + 2 * math.pi * k / n))
           for k in range(n)]
    bx = view.box(cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3)
    if bx is None:
        return pts
    from .view import poly_sel
    m = poly_sel(view, pts, bx)
    X, Y = _grid(view, bx)
    v = 0.6 - 0.25 * (Y - cy) / r - 0.15 * (X - cx) / r
    col = tones(fill_ramp, np.clip(v, 0, 1), bx)
    i0, j0, i1, j1 = bx
    sub = buf[j0:j1, i0:i1]
    f = sub.astype(np.float32)
    out = f + (col.astype(np.float32) - f) * fill_a
    sub[m] = np.clip(out[m], 0, 255).astype(np.uint8)
    for k in range(n):
        stroke(buf, view, pts[k], pts[(k + 1) % n], 3.2, line_col)
    return pts


def steroid(buf, view, x, y, ramp, head='OH', tail=None, glow=0.0):
    """Cholesterol-like icon: three fused hexagons + a pentagon, an end group on the left, a short side chain."""
    a = math.sqrt(3) * S
    centres = [(x - a, y + 0.5 * S), (x, y + 0.5 * S), (x + 0.5 * a, y - S), (x + 1.45 * a, y - S)]
    line = ramp[2]
    for k, (cx, cy) in enumerate(centres):
        if k < 3:
            ring(buf, view, cx, cy, 6, S, math.pi / 2, ramp, line)
        else:
            ring(buf, view, cx - 1.5, cy, 5, S * 0.93, math.pi, ramp, line)
    # side chain to the right
    sx, sy = x + 1.45 * a + S * 0.9, y - S
    pts = [(sx, sy), (sx + 11, sy - 8), (sx + 22, sy), (sx + 33, sy - 8), (sx + 41, sy - 2)]
    for p0, p1 in zip(pts[:-1], pts[1:]):
        stroke(buf, view, p0, p1, 3.0, ramp[3])
    # the 3-position end group
    ex, ey = x - a - S * 0.87, y + 0.5 * S + S * 0.5
    if head == 'OH':
        stroke(buf, view, (ex + 4, ey - 2), (ex - 6, ey + 4), 3.0, ramp[3])
        bead(buf, view, ex - 9, ey + 6, 5.2, P.OXY)
        bead(buf, view, ex - 15, ey + 10, 3.0, P.GR[4:])
    elif head == 'O':                                     # oxidised: a double-bonded oxygen (ketone)
        stroke(buf, view, (ex + 4, ey - 4), (ex - 6, ey + 2), 2.2, P.OXY[3])
        stroke(buf, view, (ex + 6, ey), (ex - 4, ey + 6), 2.2, P.OXY[3])
        bead(buf, view, ex - 9, ey + 6, 5.2, P.OXY)
    elif head == 'ester':
        stroke(buf, view, (ex + 4, ey - 2), (ex - 6, ey + 4), 3.0, ramp[3])
        bead(buf, view, ex - 9, ey + 6, 6.0, P.AM)
    if tail is not None:                                  # fatty-acid tail hanging off the ester link
        tx, ty = tail
        pts = [(tx + 6 * math.cos(k * 0.0), ty) for k in range(1)]
        pts = [(tx - 11 * k, ty + (6 if k % 2 else 0) + 0.18 * k * k) for k in range(9)]
        for p0, p1 in zip(pts[:-1], pts[1:]):
            stroke(buf, view, p0, p1, 3.2, P.BODY[5])
        for p in pts[1:]:
            bead(buf, view, p[0], p[1], 1.8, P.BODY[4:], hl=False)
    return ex - 9, ey + 6


def enzyme(buf, view, x, y, r, ramp, notch_dir, open_=1.0, heme=False, seed=1):
    """A protein blob (several lobes, no face) with an active-site cleft that closes on its target."""
    bx = view.box(x - r * 1.5, y - r * 1.5, x + r * 1.5, y + r * 1.5)
    if bx is None:
        return
    X, Y = _grid(view, bx)
    rng = np.random.default_rng(seed)
    # a lumpy protein: a core and six irregular lobes (no single round outline, no "mouth")
    lobes = [(0.0, 0.0, 0.72)]
    for k, a in enumerate(np.linspace(0, 2 * math.pi, 6, endpoint=False) + rng.uniform(0, 1)):
        off = r * rng.uniform(0.42, 0.6)
        lobes.append((math.cos(a) * off, math.sin(a) * off, rng.uniform(0.38, 0.52)))
    m = np.zeros(X.shape, bool)
    for dx, dy, k in lobes:
        m |= np.hypot(X - x - dx, Y - y - dy) <= r * k
    # the active site: a narrow groove with rounded walls
    ang = np.arctan2(Y - y, X - x) - notch_dir
    ang = (ang + np.pi) % (2 * np.pi) - np.pi
    rr = np.hypot(X - x, Y - y)
    width = 0.08 + 0.22 * open_
    cleft = (np.abs(ang) < width * (0.6 + 0.6 * rr / r)) & (rr > r * 0.32)
    m &= ~cleft
    nx, ny = (X - x) / r, (Y - y) / r
    v = 0.58 - 0.25 * nx - 0.32 * ny - 0.12 * (nx * nx + ny * ny)
    tex = (np.sin(X * 0.45 + 1.3 * seed) * np.sin(Y * 0.5 - seed) > 0.75)
    v = np.where(tex, v - 0.12, v)
    put(buf, bx, m, tones(ramp, np.clip(v, 0, 1), bx))
    e = np.zeros_like(m)
    e[1:, :] |= m[1:, :] & ~m[:-1, :]
    e[:-1, :] |= m[:-1, :] & ~m[1:, :]
    e[:, 1:] |= m[:, 1:] & ~m[:, :-1]
    e[:, :-1] |= m[:, :-1] & ~m[:, 1:]
    put(buf, bx, e, ramp[1])
    if heme:
        hx_, hy_ = x - 0.25 * r * math.cos(notch_dir), y - 0.25 * r * math.sin(notch_dir)
        hm = (np.abs(X - hx_) < r * 0.16) & (np.abs(Y - hy_) < r * 0.16) & m
        put(buf, bx, hm, P.OXY[2])
        put(buf, bx, hm & (np.abs(X - hx_) < r * 0.06) & (np.abs(Y - hy_) < r * 0.06), P.AM[6])


def peroxide(buf, view, x, y, rot=0.0, scale=1.0):
    c, s = math.cos(rot), math.sin(rot)
    o1 = (x - 7 * c * scale, y - 7 * s * scale)
    o2 = (x + 7 * c * scale, y + 7 * s * scale)
    stroke(buf, view, o1, o2, 3.0, P.OXY[4])
    h1 = (o1[0] - 6 * s * scale - 3 * c * scale, o1[1] + 6 * c * scale - 3 * s * scale)
    h2 = (o2[0] + 6 * s * scale + 3 * c * scale, o2[1] - 6 * c * scale + 3 * s * scale)
    stroke(buf, view, o1, h1, 2.0, P.GR[6])
    stroke(buf, view, o2, h2, 2.0, P.GR[6])
    bead(buf, view, h1[0], h1[1], 3.2 * scale, P.GR[3:])
    bead(buf, view, h2[0], h2[1], 3.2 * scale, P.GR[3:])
    bead(buf, view, o1[0], o1[1], 6.0 * scale, P.OXY)
    bead(buf, view, o2[0], o2[1], 6.0 * scale, P.OXY)


def oxygen(buf, view, x, y):
    stroke(buf, view, (x - 6, y - 2), (x + 6, y - 2), 2.0, P.CY[7])
    stroke(buf, view, (x - 6, y + 2), (x + 6, y + 2), 2.0, P.CY[7])
    bead(buf, view, x - 7, y, 5.6, P.CY)
    bead(buf, view, x + 7, y, 5.6, P.CY)


def small_ring(buf, view, x, y, group, ramp):
    ring(buf, view, x, y, 6, 9.0, math.pi / 2, ramp, ramp[2], 0.6)
    gx, gy = x + 13, y - 7
    stroke(buf, view, (x + 7.8, y - 4.5), (gx, gy), 2.4, ramp[3])
    bead(buf, view, gx + 2, gy - 1, 4.0, P.OXY if group == 'OH' else P.CY)


def dye(buf, view, x, y, a=1.0):
    """The rose quinoneimine-type dye: two rings joined through a nitrogen bridge, filled rose."""
    ring(buf, view, x - 15, y, 6, 10.0, math.pi / 2, P.RO, P.RO[2], 0.85 * a)
    ring(buf, view, x + 15, y, 6, 10.0, math.pi / 2, P.RO, P.RO[2], 0.85 * a)
    stroke(buf, view, (x - 6, y), (x + 6, y), 3.0, P.RO[3])
    bead(buf, view, x, y, 3.6, P.RO)


# ------------------------------------------------------------------ the sequence
def _cam(t):
    """Pan along the strip: the ester (x 0), the oxidase (x 230), the peroxidase (x 470)."""
    ks = [(16.0, 0.0, 1.2), (16.6, 0.0, 1.55), (17.8, 10.0, 1.55), (18.6, 220.0, 1.5), (19.3, 250.0, 1.5),
          (20.4, 455.0, 1.5), (21.4, 470.0, 1.55), (22.0, 470.0, 1.15), (22.5, 470.0, 0.5)]
    x = T.keys(t, [(k[0], k[1]) for k in ks])
    z = T.keys(t, [(k[0], k[2]) for k in ks])
    if t < 16.6:                                     # arriving through the wall: zooming in
        z = 1.55 * math.exp(-2.4 * (1 - T.smoother((t - 16.0) / 0.6)))
    return View(x, 0.0, z)


def _background(buf, view, t, rose):
    base = np.clip(0.36 + 0.08 * np.sin(_JJ / 70.0 + t * 0.3), 0, 1)
    buf[...] = tones(P.NV, base, (0, 0, W, H))
    if rose > 0:
        mix(buf, (0, 0, W, H), np.ones((H, W), bool), P.RO[2], 0.42 * rose)
    # arriving from the cuvette: start in the colour of the mixture and settle into the deep view
    enter = 1.0 - T.smooth((t - 16.25) / 0.35) if t < 16.7 else 0.0
    leave = T.smooth((t - 22.05) / 0.4) if t > 22.0 else 0.0
    a = max(enter, leave)
    if a > 0:
        mix(buf, (0, 0, W, H), np.ones((H, W), bool), P.SE[7] if t < 20 else P.RO[6], 0.85 * a)
    # drifting water / buffer molecules (tiny), and blurred big molecules far behind
    rng = np.random.default_rng(3)
    for i in range(70):
        wx = rng.uniform(-200, 700)
        wy = rng.uniform(-260, 260)
        ph = rng.uniform(0, 6.28)
        x = wx + 6 * math.sin(t * 1.7 + ph)
        y = wy + 5 * math.cos(t * 1.3 + ph * 2)
        u, v = view.px(x, y)
        if 0 <= int(u) < W and 0 <= int(v) < H:
            buf[int(v), int(u)] = P.NV[7] if i % 3 else P.CY[3]
    for i in range(6):
        wx = rng.uniform(-150, 650)
        wy = rng.uniform(-200, 200)
        u, v = view.px(wx + 0.3 * view.cx * 0, wy)
        r = rng.uniform(20, 40) * view.z
        mm = np.hypot(_II - u, _JJ - v) < r
        th = gfx.bayer_at(0, 0, H, W)
        mix(buf, (0, 0, W, H), mm & (th < 0.4), P.NV[6], 0.6)


def render(t):
    t = t % T.TOTAL
    view = _cam(t)
    view.apply()
    buf = np.zeros((H, W, 3), np.uint8)
    rose_bg = T.smooth((t - 21.4) / 0.9)
    _background(buf, view, t, rose_bg)
    jig = lambda ph, a=2.0: (a * math.sin(t * 5.1 + ph), a * math.cos(t * 4.3 + ph * 1.7))
    # ---- 1. the ester and cholesterol esterase
    snap = T.SNAP
    j = jig(0.3)
    cx, cy = 20.0 + j[0], 5.0 + j[1]
    if t < snap:
        head = 'ester'
        tail = (cx - 2 * math.sqrt(3) * S + 2, cy + 18)
    else:
        head = 'OH'
        tail = None
    drift = max(0.0, t - 17.6) * 140.0                    # the freed cholesterol drifts right toward the oxidase
    drift = min(drift, 175.0)
    cxm = cx + drift
    if t >= snap:                                         # the fatty acid drifts away down-left
        e = t - snap
        fx, fy = cx - 2 * math.sqrt(3) * S + 2 - 70 * e, cy + 18 + 40 * e
        steroid_tail(buf, view, fx, fy)
    if t < 19.0:
        steroid(buf, view, cxm, cy, P.SE, head=head, tail=tail)
    ex_ = cx - math.sqrt(3) * S - S * 0.87 - 9
    ey_ = cy + 0.5 * S + S * 0.5 + 6
    if t < 18.2:
        k = T.keys(t, [(16.3, 0.0), (16.95, 1.0), (17.25, 1.0), (18.0, 0.0)])
        epos = (ex_ - 10 + (1 - k) * -30, ey_ + 30 + (1 - k) * 90)
        enzyme(buf, view, epos[0], epos[1], 30, P.CY, -math.pi / 2 + 0.4,
               open_=1.0 - 0.8 * T.smooth((t - 16.8) / 0.2) + 0.8 * T.smooth((t - snap) / 0.15), seed=2)
    if snap <= t < snap + 0.18:
        _flash(buf, view, ex_, ey_, (t - snap) / 0.18, P.CY[8])
    # ---- 2. cholesterol oxidase with O2, the peroxide pops out
    ox, oyy = 230.0, -6.0
    if 17.9 <= t < 20.2:
        k = T.keys(t, [(18.0, 0.0), (18.75, 1.0), (19.15, 1.0), (19.9, 0.0)])
        epos = (ox - 6, oyy + 34 + (1 - k) * 80)
        enzyme(buf, view, epos[0], epos[1], 32, P.AM, -math.pi / 2 - 0.5,
               open_=1.0 - 0.8 * T.smooth((t - 18.75) / 0.2) + 0.8 * T.smooth((t - T.OXI) / 0.15), seed=5)
        if t < T.OXI:
            oxygen(buf, view, epos[0] + 18, epos[1] - 22 - (1 - k) * 10)
    if t >= 19.0:
        j2 = jig(1.1)
        steroid(buf, view, cx + 175 + j2[0] - max(0.0, t - 19.3) * 30, cy + j2[1] + max(0.0, t - 19.3) * 20,
                P.SE, head='O')
    if T.OXI <= t < T.OXI + 0.18:
        _flash(buf, view, ox + 10, oyy - 10, (t - T.OXI) / 0.18, P.AM[8])
    if t >= T.OXI:
        e = t - T.OXI
        px_ = ox + 12 + min(e, 1.5) * 155 + max(0.0, e - 1.5) * 20
        py_ = oyy - 22 + math.sin(e * 4.0) * 6 - min(e, 1.5) * 6
        if t < T.DYE:
            peroxide(buf, view, px_, py_, rot=0.3 * math.sin(e * 3))
    # ---- 3. peroxidase joins the two precursors into the rose dye
    pxd, pyd = 470.0, 10.0
    if 19.8 <= t < 22.6:
        enzyme(buf, view, pxd, pyd + 36, 34, P.MN, -math.pi / 2,
               open_=1.0 - 0.7 * T.smooth((t - 20.9) / 0.25) + 0.7 * T.smooth((t - T.DYE) / 0.2), heme=True, seed=9)
        if t < T.DYE:
            k = T.smooth((t - 20.3) / 0.8)
            small_ring(buf, view, pxd - 34 + 18 * k, pyd - 30 - 30 * (1 - k), 'NH', P.RG)
            small_ring(buf, view, pxd + 26 - 14 * k, pyd - 34 - 34 * (1 - k), 'OH', P.RG)
    if T.DYE <= t < T.DYE + 0.2:
        _flash(buf, view, pxd, pyd - 30, (t - T.DYE) / 0.2, P.RO[8])
    if t >= T.DYE:
        e = t - T.DYE
        dye(buf, view, pxd - 4, pyd - 34 - min(e, 1.0) * 20)
        rng = np.random.default_rng(17)
        n = int(min(1.0, max(0.0, (t - 21.45) / 0.6)) * 22)
        for i in range(22):
            x = pxd + rng.uniform(-140, 140)
            y = pyd + rng.uniform(-220, 220)
            if i < n and abs(x - pxd) + abs(y - pyd + 40) > 60:
                dye(buf, view, x + 3 * math.sin(t * 3 + i), y + 3 * math.cos(t * 2.6 + i))
        for k in range(2):                                  # two waters leave the peroxidase
            bead(buf, view, pxd + 20 + 30 * min(e, 1) * (1 if k else -1), pyd + 10 + 25 * min(e, 1), 3.6, P.CY)
    return buf


def steroid_tail(buf, view, x, y):
    pts = [(x - 11 * k, y + (6 if k % 2 else 0) + 0.18 * k * k) for k in range(9)]
    for p0, p1 in zip(pts[:-1], pts[1:]):
        stroke(buf, view, p0, p1, 3.2, P.BODY[5])
    bead(buf, view, x + 4, y - 2, 4.5, P.AM)


def _flash(buf, view, x, y, u, col):
    """A short starburst marking a molecular change (8 rays, grows and fades in 6 frames)."""
    cx, cy = view.px(x, y)
    r0, r1 = 4 + 10 * u, 10 + 22 * u
    for k in range(8):
        a = k * math.pi / 4 + 0.3
        for rr in np.linspace(r0, r1, 8):
            px_, py_ = int(cx + rr * math.cos(a)), int(cy + rr * math.sin(a))
            if 0 <= px_ < W and 0 <= py_ < H and u < 0.9:
                buf[py_, px_] = col
