"""The clinic, drawn in world space: a quiet room, the reclining chair with the donor (a calm silhouette under a
blanket; only the arm is drawn in detail), the tubing with the blood moving inside, and the apheresis machine.

The machine is a generic bedside console (no brand, no logo), in a 3/4 view from slightly above: a wide, low
off-white cabinet with a darker diagonal panel, a sloped front deck with the anticoagulant pump (blue rotor) and the
blood pump (red rotor) in black housings, pinch clamps, a recess with a drip chamber on the donor line, the
centrifuge under a round lid on top, the touchscreen on a post with a red stop button, and two IV poles carrying the
anticoagulant bag and the platelet collection bag.

Flat 8-bit shading, 1-px outlines. The blood always stays inside the tubing or the machine.
"""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T
from .pen import Pen
from .view import put, poly_sel

W, H = gfx.W, gfx.H
R_OUT, R_IN = 2.7, 1.8


# ------------------------------------------------------------------ room
def room(pen, t):
    buf = pen.buf
    buf[...] = P.NAVY[1]
    bx = (0, 0, W, H)
    U, V = pen.grid(bx)
    put(buf, bx, V >= T.FLOOR, P.NAVY[2])
    put(buf, bx, (V >= T.FLOOR) & (V < T.FLOOR + 1.0 / pen.z + 0.4), P.NAVY[3])
    put(buf, bx, (V >= T.FLOOR - 26) & (V < T.FLOOR - 24.5), P.NAVY[2])            # skirting line
    # a soft wall panel behind the chair (quiet, just to place the scene)
    put(buf, bx, (U > -250) & (U < -60) & (V > -60) & (V < 0) & (((U + V) // 3) % 9 == 0), P.NAVY[2])


# ------------------------------------------------------------------ chair, donor, arm
def chair_and_donor(pen, t):
    poly = lambda pts, col, line=None: _poly(pen, pts, col, line)
    # chair: base, backrest, seat, armrest (muted cool colours)
    poly([(-175, 207), (-95, 207), (-92, 214), (-178, 214)], P.CHAIR[0])
    poly([(-148, 166), (-122, 166), (-124, 208), (-146, 208)], P.CHAIR[1], P.CHAIR[0])
    poly([(-214, 148), (-246, 50), (-226, 42), (-196, 146)], P.CHAIR[2], P.CHAIR[0])
    poly([(-218, 144), (-58, 144), (-54, 150), (-56, 166), (-218, 168)], P.CHAIR[2], P.CHAIR[0])
    poly([(-218, 144), (-58, 144), (-56, 148), (-218, 148)], P.CHAIR[3])
    # the donor: a calm silhouette reclining, head on a pillow, a blanket over the legs
    bx, m, U, V = pen.disc(-236, 46, 9)
    if bx is not None:
        put(pen.buf, bx, m, P.MACH[4])
    poly([(-226, 50), (-204, 56), (-176, 92), (-166, 140), (-204, 146), (-222, 98)], P.SIL[1], P.SIL[0])
    bx, m, U, V = pen.disc(-222, 38, 13)
    if bx is not None:
        put(pen.buf, bx, m, P.SIL[1])
        put(pen.buf, bx, m & ((U + 222) + (V - 38) < -12), P.SIL[2])
        pen.outline(bx, m, P.SIL[0])
    poly([(-206, 132), (-150, 126), (-60, 128), (-46, 136), (-50, 146), (-206, 150)], P.BLANKET[1], P.BLANKET[0])
    poly([(-206, 132), (-150, 126), (-60, 128), (-60, 131), (-150, 129), (-206, 135)], P.BLANKET[2])
    # armrest pad under the arm
    poly([(-182, 128), (-62, 128), (-60, 138), (-182, 138)], P.CHAIR[1], P.CHAIR[0])
    arm(pen, t)


def _poly(pen, pts, col, line=None):
    bx, m = pen.poly(pts)
    if bx is None:
        return
    put(pen.buf, bx, m, col)
    if line is not None:
        pen.outline(bx, m, line)


def _limb(pen, a, b, ra, rb, cols, outline, bulge=0.0):
    """A tapered limb segment with flat shading: lit top, base, shaded underside (cols: shade, base, lit)."""
    r = max(ra, rb) + bulge
    bx = pen.box(min(a[0], b[0]) - r, min(a[1], b[1]) - r, max(a[0], b[0]) + r, max(a[1], b[1]) + r, 1)
    if bx is None:
        return None, None
    U, V = pen.grid(bx)
    ax, ay = b[0] - a[0], b[1] - a[1]
    h = np.clip(((U - a[0]) * ax + (V - a[1]) * ay) / (ax * ax + ay * ay), 0, 1)
    rr = ra + (rb - ra) * h + bulge * np.sin(np.pi * np.clip(h * 1.6, 0, 1))
    dx, dy = U - (a[0] + ax * h), V - (a[1] + ay * h)
    m = dx * dx + dy * dy <= rr * rr
    put(pen.buf, bx, m, cols[1])
    put(pen.buf, bx, m & (dy < -rr * 0.42), cols[2])
    put(pen.buf, bx, m & (dy > rr * 0.5), cols[0])
    pen.outline(bx, m, outline)
    return bx, m


def _shape(pen, pts, cols, outline, lit=1.6, shade=1.9, open_left=None):
    """A filled outline with flat shading: a lit band along its top edge and a shaded band along its bottom edge.
    open_left: no outline left of this x (where the shape joins another one)."""
    bx, m = pen.poly(pts)
    if bx is None:
        return None, None
    put(pen.buf, bx, m, cols[1])
    put(pen.buf, bx, m & ~poly_sel(pen.view, pts, bx, 0.0, lit), cols[2])
    put(pen.buf, bx, m & ~poly_sel(pen.view, pts, bx, 0.0, -shade), cols[0])
    e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    if open_left is not None:
        U, V = pen.grid(bx)
        e &= U >= open_left
    put(pen.buf, bx, e, outline)
    return bx, m


# a relaxed right hand resting palm-down on the armrest, seen from the thumb side, fingers pointing to the machine
HAND = [(-87.5, 119.5), (-80, 118.8), (-73, 117.5), (-67, 118.0), (-62, 119.1), (-58.4, 120.9), (-56.3, 123.5),
        (-55.9, 126.0), (-56.9, 127.7), (-60, 128.1), (-68, 128.3), (-78, 128.1), (-87.5, 128.0)]


def arm(pen, t):
    """The donor's arm resting on the armrest: sleeve, upper arm, elbow, forearm, wrist and a relaxed hand."""
    skin = (P.SKIN[2], P.SKIN[3], P.SKIN[4])
    buf = pen.buf
    _limb(pen, (-198, 89), (-161, 108), 9.6, 9.0, (P.CHAIR[1], P.CHAIR[2], P.CHAIR[3]), P.CHAIR[0])   # sleeve
    _limb(pen, (-163, 108.5), (-137, 120.6), 7.4, 6.5, skin, P.SKIN[1])                             # upper arm
    _limb(pen, (-138, 121.3), (-84, 123.7), 6.3, 4.3, skin, P.SKIN[1], bulge=0.7)                   # forearm
    _shape(pen, HAND, skin, P.SKIN[1], open_left=-86.0)                                            # hand
    for line in (((-72, 121.2), (-64, 121.6), (-59.6, 123.2), (-58.1, 125.6)),                      # finger lines
                 ((-71, 124.6), (-63.5, 125.0), (-60.2, 126.4))):
        for (xa, ya), (xb, yb) in zip(line[:-1], line[1:]):
            _segment(pen, (xa, ya), (xb, yb), 0.32, P.SKIN[1])
    _disc(pen, -57.5, 122.6, 1.05, P.SKIN[4], None, None, P.SKIN[2])                              # fingernail
    _limb(pen, (-84.5, 123.0), (-70.0, 122.6), 2.2, 1.9, skin, P.SKIN[1])                           # thumb
    _disc(pen, -70.2, 122.3, 0.8, P.SKIN[4])
    bx, m, U, V = pen.disc(-137.5, 116.5, 2.2)                                                     # elbow crease
    if bx is not None:
        put(buf, bx, m & (np.abs((U + 137.5) * 0.9 + (V - 116.5) * 0.4) < 0.35), P.SKIN[1])


def arm_overlay(pen, t):
    """The tape over the needle site, the clear needle hub and a second strip of tape holding the tube."""
    _poly(pen, [(-127, 115.6), (-109, 114.9), (-108.6, 123.8), (-126.6, 124.3)], P.MACH[5], P.MACH[2])
    for k in range(4):
        pen.dot(-123.5 + 4.5 * k, 119.8, P.MACH[3])
    _poly(pen, [(-110, 118.4), (-103.4, 119.0), (-103.4, 123.0), (-110, 123.6)], P.TUBE[3], P.TUBE[1])
    _poly(pen, [(-93.5, 113.0), (-87.5, 112.2), (-86.6, 121.0), (-92.6, 121.8)], P.MACH[5], P.MACH[2])
    pen.dot(-90.0, 116.8, P.MACH[3])


# ------------------------------------------------------------------ tubing
def _flow_table(name):
    return np.cumsum([T.flows(x / 60.0)[name] for x in range(int(T.TOTAL * 60) + 2)]) / 60.0


_FLOW = {name: _flow_table(name) for name in T.PATHS}
CELL = 4.2                          # spacing of the cells drawn flowing inside a tube


def _period(name):
    """Cell spacing nudged so that a whole number of cells passes per loop (seamless at the loop point)."""
    tab = _FLOW[name]
    total = abs(tab[int(T.TOTAL * 60)] - tab[0])
    return total / max(1, round(total / CELL)) if total > 1e-6 else CELL


_PERIOD = {name: _period(name) for name in T.PATHS}
LIGHT = np.array([-0.53, -0.85])    # toward the light: upper left, mostly above


def _frames(name):
    pts, s = T.PATHS[name]
    d = np.gradient(pts, axis=0)
    d /= np.hypot(d[:, 0], d[:, 1])[:, None] + 1e-9
    n = np.c_[-d[:, 1], d[:, 0]]
    return n, np.clip((n @ LIGHT) / 0.3, -1, 1)              # +1: the +n side faces the light


_FRAMES = {name: _frames(name) for name in T.PATHS}


def flow_shift(name, t):
    x = (t % T.TOTAL) * 60.0
    i = int(x)
    tab = _FLOW[name]
    return tab[i] + (tab[i + 1] - tab[i]) * (x - i)


def _content(name, t):
    """(base, shade, gloss, particle, particle core, style) of what is inside a tube right now."""
    if name in ('ac', 'acpump', 'ac2'):
        return P.TUBE[3], P.TUBE[2], P.WHITE, P.MINT[2], P.MINT[3], 'fleck'
    if name == 'plt':
        return P.PLASMA[3], P.PLASMA[2], P.WHITE, P.GOLD[2], P.GOLD[3], 'fleck'
    if T.returning(t):                                           # going back: red cells and plasma, no platelets
        return P.RED[2], P.RED[1], P.RED[3], P.RED[1], P.RED[3], 'cell'
    return P.RED[3], P.RED[2], P.RED[4], P.RED[2], P.RED[4], 'cell'


def _hash(i):
    x = np.sin(i * 12.9898 + 4.1) * 43758.5453
    return x - np.floor(x)


def tube(pen, name, t, squeeze=None):
    """A clear plastic tube and what flows inside, drawn per pixel from the nearest point of its path: a lit and a
    shaded side, a glossy band, cells (or flecks) moving with the flow, squeezed flat under a pump roller."""
    pts, s = T.PATHS[name]
    nrm, lit = _FRAMES[name]
    z = pen.z
    x0, y0, x1, y1 = pen.view.world_rect()
    pad = R_OUT + 1.0
    vis = (pts[:, 0] > x0 - pad) & (pts[:, 0] < x1 + pad) & (pts[:, 1] > y0 - pad) & (pts[:, 1] < y1 + pad)
    idx = np.nonzero(vis)[0]
    if len(idx) == 0:
        return
    idx = idx[::max(1, int(0.8 / (0.6 * z)))]
    sq = squeeze(pts[idx]) if squeeze is not None else np.zeros(len(idx))
    q = pts[idx]
    bx = pen.box(q[:, 0].min() - pad, q[:, 1].min() - pad, q[:, 0].max() + pad, q[:, 1].max() + pad, 1)
    if bx is None:
        return
    U, V = pen.grid(bx)
    hh, ww = U.shape
    best = np.full((hh, ww), np.inf)
    S, LAT, LIT, K = np.zeros((hh, ww)), np.zeros((hh, ww)), np.zeros((hh, ww)), np.zeros((hh, ww))
    view, rpx = pen.view, pad * z + 1
    for k, i in enumerate(idx):
        x, y = pts[i]
        ci, cj = view.px(x, y)
        a0, a1 = max(int(ci - rpx) - bx[0], 0), min(int(ci + rpx) + 2 - bx[0], ww)
        b0, b1 = max(int(cj - rpx) - bx[1], 0), min(int(cj + rpx) + 2 - bx[1], hh)
        if a1 <= a0 or b1 <= b0:
            continue
        u, v = U[b0:b1, a0:a1] - x, V[b0:b1, a0:a1] - y
        d2 = u * u + v * v
        win = best[b0:b1, a0:a1]
        upd = d2 < win
        if not upd.any():
            continue
        win[upd] = d2[upd]
        S[b0:b1, a0:a1][upd] = s[i]
        LAT[b0:b1, a0:a1][upd] = (u * nrm[i, 0] + v * nrm[i, 1])[upd]
        LIT[b0:b1, a0:a1][upd] = lit[i]
        K[b0:b1, a0:a1][upd] = sq[k]
    d = np.sqrt(best)
    r_out, r_in = R_OUT * (1 - 0.35 * K), R_IN * (1 - 0.92 * K)
    wall = d < r_out
    if not wall.any():
        return
    lumen = d < r_in
    side = LAT * LIT                                             # > 0: toward the lit side
    buf = pen.buf
    base, shade, gloss, part, core, style = _content(name, t)
    put(buf, bx, wall, P.TUBE[1])
    put(buf, bx, wall & (side > 0), P.TUBE[2])
    put(buf, bx, lumen, base)
    if z >= 0.9:
        put(buf, bx, lumen & (side < -0.42 * r_in), shade)
    if 1.4 <= z < 7.0:
        L = _PERIOD[name]
        shift = flow_shift(name, t)
        for row in (0, 1):
            u = (S - shift) / L + 0.5 * row
            cid = np.floor(u)
            off = (_hash(cid + 37 * row) - 0.5) * 1.1 * R_IN
            hl, hw = (1.15, 0.85) if style == 'cell' else (0.55, 0.5)
            e = ((u - cid - 0.5) * L / hl) ** 2 + ((LAT - off) / hw) ** 2
            m = lumen & (e < 1.0)
            if style != 'cell':
                m &= _hash(cid * 3.1 + row) < 0.55
            put(buf, bx, m, part)
            if z >= 2.4 and style == 'cell':
                put(buf, bx, m & (e < 0.22), core)
    if z >= 1.4:
        put(buf, bx, lumen & (side > 0.38 * r_in) & (side < 0.72 * r_in), gloss)
    pen.outline(bx, wall, P.TUBE[0])
    if z >= 1.0:
        put(buf, bx, wall & ~lumen & (side > 0) & (d < r_out - 0.45), P.TUBE[3])


# ------------------------------------------------------------------ the machine
def _rrect_mask(U, V, x0, y0, x1, y1, r):
    qx, qy = np.clip(U, x0 + r, x1 - r), np.clip(V, y0 + r, y1 - r)
    return (U >= x0) & (U <= x1) & (V >= y0) & (V <= y1) & ((U - qx) ** 2 + (V - qy) ** 2 <= r * r)


def _rrect(pen, x0, y0, x1, y1, r, col, line=None):
    bx = pen.box(x0, y0, x1, y1, 1)
    if bx is None:
        return None, None, None, None
    U, V = pen.grid(bx)
    m = _rrect_mask(U, V, x0, y0, x1, y1, r)
    put(pen.buf, bx, m, col)
    if line is not None:
        pen.outline(bx, m, line)
    return bx, m, U, V


def _disc(pen, x, y, r, col, lit=None, shade=None, line=None):
    bx, m, U, V = pen.disc(x, y, r)
    if bx is None:
        return
    put(pen.buf, bx, m, col)
    if lit is not None:
        put(pen.buf, bx, m & ((U - x) + (V - y) < -r * 0.55), lit)
    if shade is not None:
        put(pen.buf, bx, m & ((U - x) + (V - y) > r * 0.7), shade)
    if line is not None:
        pen.outline(bx, m, line)


def _segment(pen, a, b, r, col, line=None):
    bx = pen.box(min(a[0], b[0]) - r, min(a[1], b[1]) - r, max(a[0], b[0]) + r, max(a[1], b[1]) + r, 1)
    if bx is None:
        return
    U, V = pen.grid(bx)
    ax, ay = b[0] - a[0], b[1] - a[1]
    h = np.clip(((U - a[0]) * ax + (V - a[1]) * ay) / max(ax * ax + ay * ay, 1e-9), 0, 1)
    m = (U - a[0] - ax * h) ** 2 + (V - a[1] - ay * h) ** 2 <= r * r
    put(pen.buf, bx, m, col)
    if line is not None:
        pen.outline(bx, m, line)


def poles(pen, t):
    """Two IV poles at the back corners; each ends in a short arm with a coloured hook."""
    for px, hang, col in ((T.POLES[0], T.AC_BAG[0], P.RED), (T.POLES[1], T.BAG[0], P.BLUE)):
        _poly(pen, [(px - 1.3, T.POLE_TOP), (px + 1.3, T.POLE_TOP), (px + 1.3, T.TOP_Y + 3), (px - 1.3, T.TOP_Y + 3)],
              P.MACH[3], P.MACH[1])
        _poly(pen, [(px - 2.4, T.TOP_Y - 22), (px + 2.4, T.TOP_Y - 22), (px + 2.4, T.TOP_Y - 18),
                    (px - 2.4, T.TOP_Y - 18)], P.NAVY[0])                      # a clamp collar
        _segment(pen, (px, T.POLE_TOP), (hang, T.POLE_TOP), 1.1, col[2], col[0])
        bx, m, U, V = pen.disc(hang, T.POLE_TOP + 2.4, 3.0)                     # the curl the bag hangs from
        if bx is not None:
            d2 = (U - hang) ** 2 + (V - T.POLE_TOP - 2.4) ** 2
            put(pen.buf, bx, m & (d2 > 1.4 ** 2), col[2])
            put(pen.buf, bx, m & (d2 > 1.4 ** 2) & (V < T.POLE_TOP + 1.8), col[3])


def screen(pen, t):
    """The touchscreen on its post: phase (DRAW / RETURN), flow arrow, platelet yield; red stop button below."""
    x0, y0, x1, y1 = T.SCREEN
    cx = (x0 + x1) / 2
    _poly(pen, [(cx - 4, y1 - 2), (cx + 4, y1 - 2), (cx + 4, T.TOP_Y + 2), (cx - 4, T.TOP_Y + 2)], P.MACH[3], P.MACH[1])
    _poly(pen, [(cx - 3, y1 - 2), (cx - 1, y1 - 2), (cx - 1, T.TOP_Y + 2), (cx - 3, T.TOP_Y + 2)], P.MACH[4])
    bx, m, U, V = _rrect(pen, x0, y0, x1, y1, 4.0, P.MACH[4], P.MACH[1])
    if bx is not None:
        put(pen.buf, bx, m & (V < y0 + 2.0) & (U > x0 + 3) & (U < x1 - 3), P.MACH[5])
        put(pen.buf, bx, m & (V > y1 - 2.0) & (U > x0 + 3) & (U < x1 - 3), P.MACH[3])
    sx0, sy0, sx1, sy1 = x0 + 4, y0 + 4, x1 - 4, y1 - 11
    _poly(pen, [(sx0, sy0), (sx1, sy0), (sx1, sy1), (sx0, sy1)], P.NAVY[0], P.MACH[2])
    _disc(pen, cx, y1 - 5.5, 2.7, P.RED[3], P.RED[5], P.RED[2], P.RED[1])     # stop button
    if not (0.5 < pen.z < 7.5):
        return
    ret = T.returning(t)
    if T.done(t):                                                # the donation is complete
        col = P.MINT[2]
        if pen.z >= 1.4:
            w, h = pixfont.text_size('DONE')
            i, j = pen.view.px(cx, sy0 + 3)
            gfx.fill(pen.buf, pixfont.text_mask('DONE', int(i - w / 2), int(j)), P.MINT[3])
        ay = sy0 + 16
        _segment(pen, (cx - 8, ay), (cx - 3, ay + 5), 1.4, col)
        _segment(pen, (cx - 3, ay + 5), (cx + 8, ay - 5), 1.4, col)
        return
    col = P.GOLD[2] if ret else P.TEAL[2]
    if pen.z >= 1.4:
        text = 'RETURN' if ret else 'DRAW'
        w, h = pixfont.text_size(text)
        i, j = pen.view.px(cx, sy0 + 3)
        gfx.fill(pen.buf, pixfont.text_mask(text, int(i - w / 2), int(j)), P.GOLD[3] if ret else P.TEAL[3])
    ay = sy0 + 15                                                # arrow: to the machine, or back to the donor
    if ret:
        _poly(pen, [(cx - 16, ay), (cx - 7, ay - 5), (cx - 7, ay - 2), (cx + 4, ay - 2), (cx + 4, ay + 2),
                    (cx - 7, ay + 2), (cx - 7, ay + 5)], col)
    else:
        _poly(pen, [(cx + 4, ay), (cx - 5, ay - 5), (cx - 5, ay - 2), (cx - 16, ay - 2), (cx - 16, ay + 2),
                    (cx - 5, ay + 2), (cx - 5, ay + 5)], col)
    lv = max(0.05, min(1.0, (T.bag_level(t) - 0.2) / 0.4))      # platelet yield
    _poly(pen, [(cx + 8, ay - 3), (sx1 - 4, ay - 3), (sx1 - 4, ay + 3), (cx + 8, ay + 3)], P.NAVY[2])
    _poly(pen, [(cx + 8, ay - 3), (cx + 8 + (sx1 - 12 - cx) * lv, ay - 3), (cx + 8 + (sx1 - 12 - cx) * lv, ay + 3),
                (cx + 8, ay + 3)], P.GOLD[2])


def cabinet(pen, t):
    """The low cabinet: feet, vertical lower front with a darker diagonal panel and a recess, sloped front deck,
    the top surface (seen from slightly above)."""
    X0, X1 = T.CAB
    mid = (X0 + X1) / 2
    buf = pen.buf
    for fx in (X0 + 9, X1 - 9):                                  # feet
        _rrect(pen, fx - 4, T.BASE_Y - 3, fx + 4, T.FLOOR, 1.5, P.NAVY[0])
    bx, m, U, V = _rrect(pen, X0, T.CREASE_Y - 4, X1, T.BASE_Y, 5.0, P.MACH[4], P.MACH[1])   # lower front
    if bx is not None:
        k = (T.BASE_Y - T.CREASE_Y - 12) / 44.0
        diag = m & (V > T.BASE_Y - (U - (X1 - 44)) * k)
        put(buf, bx, diag, P.MACH[2])
        put(buf, bx, diag & (V < T.BASE_Y - (U - (X1 - 44)) * k + 1.0 / pen.z + 0.3), P.MACH[3])
        put(buf, bx, m & (V > T.BASE_Y - 2.0) & ~diag, P.MACH[3])
    crease = [(x, T.CREASE_Y + 3.0 * (1 - ((x - mid) / (X1 - X0) * 2) ** 2)) for x in np.linspace(X1, X0, 13)]
    deck = [(X0 + 3, T.DECK_Y), (X1 - 3, T.DECK_Y)] + crease                     # sloped front deck
    bx, m = pen.poly(deck)
    if bx is not None:
        U, V = pen.grid(bx)
        put(buf, bx, m, P.MACH[4])
        put(buf, bx, m & (V < T.DECK_Y + 1.2), P.MACH[5])
        pen.outline(bx, m, P.MACH[1])
    for (xa, ya), (xb, yb) in zip(crease[:-1], crease[1:]):                    # the crease line, a soft shadow
        _segment(pen, (xa, ya + 0.9), (xb, yb + 0.9), 0.55, P.MACH[3])
    _rrect(pen, mid - 18, T.CREASE_Y + 9, mid + 18, T.BASE_Y - 6, 4.0, P.MACH[3], P.MACH[2])   # front recess
    _rrect(pen, mid - 16.5, T.CREASE_Y + 10.5, mid + 16.5, T.CREASE_Y + 12.5, 0.8, P.MACH[2])
    top = [(X0 + 9, T.TOP_Y), (X1 - 9, T.TOP_Y), (X1 - 3, T.DECK_Y), (X0 + 3, T.DECK_Y)]   # top surface
    _poly(pen, top, P.MACH[5], P.MACH[2])
    # a white bottle standing at the back left
    _rrect(pen, X0 + 11, T.TOP_Y - 24, X0 + 21, T.TOP_Y + 3, 2.5, P.MACH[5], P.MACH[2])
    _poly(pen, [(X0 + 13.5, T.TOP_Y - 28), (X0 + 18.5, T.TOP_Y - 28), (X0 + 18.5, T.TOP_Y - 24),
                (X0 + 13.5, T.TOP_Y - 24)], P.MACH[3], P.MACH[1])
    _poly(pen, [(X0 + 18, T.TOP_Y - 20), (X0 + 19.5, T.TOP_Y - 20), (X0 + 19.5, T.TOP_Y), (X0 + 18, T.TOP_Y)], P.MACH[3])


def centrifuge(pen, t):
    """The centrifuge under its round lid, seen from slightly above (an ellipse) through smoked glass."""
    cx, cy = T.CENTRIFUGE
    K, R = T.lid_k(t), T.BAY_R
    s = R / 36.0
    c_in, c_out = 80.0 * T.B_C, 140.0 * T.B_C                       # the channel walls (same as the close-up)
    bx = pen.box(cx - R - 4, cy - (R + 4) * K - 1, cx + R + 4, cy + (R + 4) * K + 3, 1)
    if bx is None:
        return
    U, V = pen.grid(bx)
    buf = pen.buf
    dx = U - cx
    lip = (dx / (R + 3.2)) ** 2 + ((V - cy - 1.8) / ((R + 3.2) * K)) ** 2 <= 1      # the lid's front edge
    put(buf, bx, lip, P.MACH[0])
    dy = (V - cy) / K
    rr = np.sqrt(dx * dx + dy * dy)
    m = rr < R + 3.2
    put(buf, bx, m, P.NAVY[0])
    put(buf, bx, m & (rr >= R + 0.8) & (dy < -R * 0.45), P.MACH[0])         # lit back of the frame
    put(buf, bx, m & (rr < R), P.NAVY[1])
    rot = rr < 31 * s
    put(buf, bx, rot, P.MACH[1])
    put(buf, bx, rot & (dx + dy < -14 * s), P.MACH[2])
    ang = np.arctan2(dy, dx) - T.spin_angle(t)
    sp = T.spin_speed(t)
    if sp < 1.6:                                                 # spokes (blur into rings when fast)
        put(buf, bx, rot & (rr > 7 * s) & (np.abs(((ang * 3 / math.pi) % 2) - 1) < 0.12) & (rr < c_in - 1), P.MACH[0])
    else:
        put(buf, bx, rot & (rr > 7 * s) & (rr < c_in - 1) & (((rr / s).astype(int) % 4) == 0), P.MACH[0])
    # the ring-shaped separation channel: mixed blood, sorting into red / gold / pale yellow as it spins
    sep = T.separation(t)
    ch = rot & (rr > c_in) & (rr < c_out)
    if sep < 0.5:
        put(buf, bx, ch, P.RED[3])
        put(buf, bx, ch & ((np.floor(ang * 5) % 2) == 0) & (sp < 1.6), P.RED[2])
    else:
        put(buf, bx, ch, P.PLASMA[2])
        put(buf, bx, ch & (rr >= 120.0 * T.B_C), P.RED[3])
        put(buf, bx, ch & (rr >= 104.0 * T.B_C) & (rr < 112.0 * T.B_C), P.GOLD[2])
    pen.outline(bx, ch, P.MACH[0])
    if sp >= 1.6:                                                # motion streaks on the rotor
        put(buf, bx, rot & (rr > c_out + 0.5) & (np.abs(((ang * 8 / math.pi) % 2) - 1) < 0.18), P.MACH[3])
    hub = rr < 5 * s
    put(buf, bx, hub, P.MACH[3])
    pen.outline(bx, hub, P.MACH[0])
    put(buf, bx, (rr < R) & (rr > R - 1.4) & (dx < -R * 0.2) & (dy < -R * 0.2), P.MACH[4])   # glass glint
    put(buf, bx, (rr < R - 3) & (np.abs(dx + dy * 0.6 + R * 0.45) < 1.0) & (dy < 0), P.MACH[3])


def pump_housing(pen, c, arc):
    """Black pump housing with a lit bevel; the raceway groove where the tube runs round the rotor."""
    cx, cy = c
    bx, m, U, V = _rrect(pen, cx - 15, cy - 14, cx + 15, cy + 14, 4.5, P.NAVY[1], P.NAVY[0])
    if bx is None:
        return
    inner = _rrect_mask(U, V, cx - 13, cy - 12, cx + 13, cy + 12, 3.5)
    put(pen.buf, bx, m & ~inner & ((U - cx) + (V - cy) < -4), P.MACH[0])
    put(pen.buf, bx, inner, P.NAVY[0])
    d = np.sqrt((U - cx) ** 2 + (V - cy) ** 2)
    a = np.degrees(np.arctan2(V - cy, U - cx))
    on = ((a - arc[0]) % 360 <= (arc[1] - arc[0]) % 360) if arc[1] > arc[0] else ((arc[0] - a) % 360 <= (arc[0] - arc[1]) % 360)
    put(pen.buf, bx, inner & on & (d > T.PUMP_R - 3.4) & (d < T.PUMP_R + 3.4), P.NAVY[2])


def _squeeze(pts, c, ang):
    a = np.arctan2(pts[:, 1] - c[1], pts[:, 0] - c[0])
    q = np.zeros(len(pts))
    for k in range(2):
        d = np.abs((a - (ang + math.pi * k) + math.pi) % (2 * math.pi) - math.pi)
        q = np.maximum(q, np.clip(1 - d / math.radians(18), 0, 1))
    return q


def pump_head(pen, t, c, name, ang, cols):
    """The tube round the raceway (squeezed under the rollers), the coloured rotor with its bar and two rollers."""
    tube(pen, name, t, squeeze=lambda pts: _squeeze(pts, c, ang))
    cx, cy = c
    _disc(pen, cx, cy, 6.4, cols[2], cols[3], cols[1], cols[0])
    ex, ey = math.cos(ang), math.sin(ang)
    a, b = (cx - T.ROLLER_R * ex, cy - T.ROLLER_R * ey), (cx + T.ROLLER_R * ex, cy + T.ROLLER_R * ey)
    _segment(pen, a, b, 1.5, P.MACH[5], P.MACH[1])
    for rx, ry in (a, b):
        _disc(pen, rx, ry, 2.7, P.MACH[4], P.MACH[5], P.MACH[3], P.MACH[0])
    _disc(pen, cx, cy, 1.7, P.MACH[2], None, None, P.MACH[0])


def knob(pen, x, y, r=4.0):
    """A pinch clamp: a black knob seen from slightly above."""
    bx, m, U, V = pen.disc(x, y, r)
    if bx is None:
        return
    put(pen.buf, bx, m, P.NAVY[0])
    top = (U - x) ** 2 + (V - y + 0.9) ** 2 < (r * 0.66) ** 2
    put(pen.buf, bx, m & top, P.NAVY[2])
    put(pen.buf, bx, m & ~top & ((U - x) + (V - y) < -r * 0.75), P.MACH[0])


def fittings(pen, t):
    """Clamps on the donor line, two spare clamps, an air detector, the Y fitting, the drip chamber."""
    for x, y in T.CLAMPS:
        knob(pen, x, y)
    for x in (T.AC_PUMP[0] - 9, T.AC_PUMP[0] + 7):
        knob(pen, x, T.CREASE_Y - 8, 3.6)
    _disc(pen, T.PUMP[0] - 14, T.CREASE_Y - 7, 3.8, P.MACH[3], P.MACH[4], P.MACH[2], P.MACH[1])   # air detector
    _disc(pen, T.PUMP[0] - 14, T.CREASE_Y - 7, 1.6, P.MACH[5], None, None, P.MACH[2])
    _disc(pen, T.AC_Y[0], T.AC_Y[1] - 1.0, 2.6, P.TEAL[3], P.WHITE, P.TEAL[2], P.TEAL[1])       # Y fitting
    x, y0, y1 = T.FILTER                                         # drip chamber on the donor line
    _rrect(pen, x - 3.6, y0, x + 3.6, y1, 1.6, P.TUBE[3], P.TUBE[1])
    blood = P.RED[2] if T.returning(t) else P.RED[3]
    _poly(pen, [(x - 2.4, y0 + 5), (x + 2.4, y0 + 5), (x + 2.4, y1 - 1.5), (x - 2.4, y1 - 1.5)], blood)
    _poly(pen, [(x - 2.4, y0 + 5), (x - 1.2, y0 + 5), (x - 1.2, y1 - 1.5), (x - 2.4, y1 - 1.5)], P.RED[4])
    for yy in (y0 - 0.5, y1 + 0.5):
        _rrect(pen, x - 3.0, yy - 2.0, x + 3.0, yy + 2.0, 0.8, P.TEAL[2], P.TEAL[1])
    for yy in (y0 + 8, y1 - 8):
        _rrect(pen, x - 5.5, yy - 1.2, x + 5.5, yy + 1.2, 0.5, P.NAVY[0])


def bag(pen, c, w, h, edge, fill, level, t, hook, gold=False, port=None):
    """A hanging plastic bag; the contents keep level, with a small wave. The platelet bag has a label sticker, and
    drops fall in from its inlet while the platelets flow."""
    x, y = c
    buf = pen.buf
    _poly(pen, [(hook[0] - 0.8, hook[1]), (hook[0] + 0.8, hook[1]), (hook[0] + 0.8, y - h / 2 - 4),
                (hook[0] - 0.8, y - h / 2 - 4)], P.MACH[2])
    pts = [(x - w / 2 + 3, y - h / 2), (x + w / 2 - 3, y - h / 2), (x + w / 2, y - h / 2 + 6), (x + w / 2 + 1, y + h / 2 - 6),
           (x + w / 2 - 4, y + h / 2), (x - w / 2 + 4, y + h / 2), (x - w / 2 - 1, y + h / 2 - 6), (x - w / 2, y - h / 2 + 6)]
    bx, m = pen.poly(pts)
    if bx is None:
        return
    U, V = pen.grid(bx)
    put(buf, bx, m, P.NAVY[2])
    surf0 = y + h / 2 - 3 - (h - 6) * level
    surf = surf0 + 0.8 * np.sin((U - x) * 0.5 + t * 4)
    liq = m & (V >= surf)
    put(buf, bx, liq, fill)
    if gold:
        put(buf, bx, liq & (((U + V * 0.5 + t * 6) // 3) % 5 == 0), P.GOLD[3])
        put(buf, bx, liq & (V < surf + 1.2), P.WHITE)
    put(buf, bx, m & (np.abs(U - (x - w / 2 + 4)) < 0.8) & (V > y - h / 2 + 6) & (V < y + h / 2 - 8), P.TUBE[3])
    pen.outline(bx, m, edge)
    _poly(pen, [(x - 2, y - h / 2 - 4), (x + 2, y - h / 2 - 4), (x + 2, y - h / 2), (x - 2, y - h / 2)], P.TUBE[2])
    if not gold:
        return
    sx0, sy0, sx1, sy1 = x - w / 2 + 4, y + h / 2 - 16, x + w / 2 - 3, y + h / 2 - 6         # label sticker
    _poly(pen, [(sx0, sy0), (sx1, sy0), (sx1, sy1), (sx0, sy1)], P.MACH[5], P.MACH[2])
    if pen.z >= 2.2:
        i, j = pen.view.px(sx0 + 1.5, sy0 + 1.6)
        gfx.fill(buf, pixfont.text_mask('PLT', int(i), int(j), font='3x5'), P.NAVY[0])
        for k in range(6):
            bxx = sx1 - 9 + 1.4 * k
            _poly(pen, [(bxx, sy0 + 2), (bxx + (0.5 if k % 2 else 0.9), sy0 + 2), (bxx + (0.5 if k % 2 else 0.9), sy1 - 2),
                        (bxx, sy1 - 2)], P.NAVY[0])
    if port is None or T.returning(t):
        return
    px_, top = port[0], y - h / 2 + 2                                    # drops falling in, ripples where they land
    _poly(pen, [(px_ - 0.9, top - 1), (px_ + 0.9, top - 1), (px_ + 0.9, top + 2.5), (px_ - 0.9, top + 2.5)], P.TUBE[2])
    g, per = 420.0, 0.22
    fall = math.sqrt(max(2 * (surf0 - top - 2.5) / g, 1e-6))
    for k in range(5):
        tn = (math.floor(t / per) - k) * per
        age = t - tn
        if age < fall:
            _disc(pen, px_, top + 2.5 + 0.5 * g * age * age, 1.1, P.GOLD[3], P.WHITE, P.GOLD[2])
        elif age < fall + 0.3:
            v = (age - fall) / 0.3
            rb = pen.box(px_ - 7, surf0 - 3, px_ + 7, surf0 + 3, 1)
            if rb is not None:
                RU, RV = pen.grid(rb)
                rx, ry = 1.5 + 5.0 * v, 0.6 + 1.0 * v
                e = ((RU - px_) / rx) ** 2 + ((RV - surf0 - 0.8) / ry) ** 2
                put(buf, rb, (e <= 1.0) & (e >= 0.45) & (v < 0.9), P.WHITE)


def machine(pen, t):
    poles(pen, t)
    bag(pen, T.AC_BAG, T.AC_W, T.AC_H, P.TUBE[3], P.MINT[3], 0.82, t, hook=(T.AC_BAG[0], T.POLE_TOP + 5))
    if t < T.LIFT[0]:
        bag(pen, T.BAG, T.BAG_W, T.BAG_H, P.TUBE[3], P.PLASMA[3], T.bag_level(t), t, hook=(T.BAG[0], T.POLE_TOP + 5),
            gold=True, port=T.path_point('plt', 1.0))
    screen(pen, t)
    cabinet(pen, t)
    centrifuge(pen, t)
    pump_housing(pen, T.AC_PUMP, (180, 0))
    pump_housing(pen, T.PUMP, (90, -90))


def draw(pen, t):
    room(pen, t)
    chair_and_donor(pen, t)
    machine(pen, t)
    for name in ('ac', 'ac2', 'plt', 'draw2', 'draw1'):
        tube(pen, name, t)
    pump_head(pen, t, T.AC_PUMP, 'acpump', T.ac_pump_angle(t), P.BLUE)
    pump_head(pen, t, T.PUMP, 'pump', T.pump_angle(t), (P.RED[1], P.RED[2], P.RED[3], P.RED[4]))
    fittings(pen, t)
    arm_overlay(pen, t)
    if t >= T.SEAL:                                              # the platelet line is sealed off the bag
        x, y = T.path_point('plt', 0.955)
        _rrect(pen, x - 3.4, y - 1.6, x + 3.4, y + 1.6, 0.8, P.WHITE, P.MACH[2])
