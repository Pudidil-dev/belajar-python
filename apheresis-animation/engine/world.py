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
from .view import put

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


def _capsule(pen, a, b, r, cols, outline):
    """A limb segment with flat shading: lit top, base, shaded underside."""
    x0, y0 = min(a[0], b[0]) - r, min(a[1], b[1]) - r
    x1, y1 = max(a[0], b[0]) + r, max(a[1], b[1]) + r
    bx = pen.box(x0, y0, x1, y1, 1)
    if bx is None:
        return None, None
    U, V = pen.grid(bx)
    ax, ay = b[0] - a[0], b[1] - a[1]
    L2 = ax * ax + ay * ay
    h = np.clip(((U - a[0]) * ax + (V - a[1]) * ay) / L2, 0, 1)
    dx, dy = U - (a[0] + ax * h), V - (a[1] + ay * h)
    d = np.sqrt(dx * dx + dy * dy)
    m = d <= r
    put(pen.buf, bx, m, cols[1])
    put(pen.buf, bx, m & (dy < -r * 0.45), cols[2])
    put(pen.buf, bx, m & (dy > r * 0.5), cols[0])
    pen.outline(bx, m, outline)
    return bx, m


def arm(pen, t):
    """The donor's arm resting on the armrest: sleeve, upper arm, forearm, relaxed hand, the taped needle."""
    skin = (P.SKIN[2], P.SKIN[3], P.SKIN[4])
    _capsule(pen, (-196, 88), (-160, 108), 9.5, (P.CHAIR[1], P.CHAIR[2], P.CHAIR[3]), P.CHAIR[0])   # sleeve
    _capsule(pen, (-162, 108), (-134, 121), 7.0, skin, P.SKIN[0])
    _capsule(pen, (-136, 121), (-76, 124), 6.2, skin, P.SKIN[0])
    bx, m, U, V = pen.disc(-68, 124, 7.6)                                              # relaxed hand
    if bx is not None:
        put(pen.buf, bx, m, P.SKIN[3])
        put(pen.buf, bx, m & (V - 124 > 3.5), P.SKIN[2])
        put(pen.buf, bx, m & (V - 124 < -4.5), P.SKIN[4])
        pen.outline(bx, m, P.SKIN[0])
        for k in range(3):
            pen.dot(-64 + 2.3 * k, 126.5, P.SKIN[1])
    # the needle site: a strip of white tape, the clear hub, the tube leaving to the right
    _poly(pen, [(-126, 116.5), (-109, 116.5), (-109, 123.5), (-126, 123.5)], P.MACH[5], P.MACH[2])
    for k in range(3):
        pen.dot(-122 + 5 * k, 120, P.MACH[3])
    _poly(pen, [(-110, 118.6), (-103.5, 119.2), (-103.5, 122.8), (-110, 123.4)], P.TUBE[3], P.TUBE[1])


# ------------------------------------------------------------------ tubing
def _flow_table(name):
    return np.cumsum([T.flows(x / 60.0)[name] for x in range(int(T.TOTAL * 60) + 2)]) / 60.0


_FLOW = {name: _flow_table(name) for name in T.PATHS}


def _period(name):
    """Dash length of the flow texture, nudged so a whole number of dashes passes per loop (seamless at 32 s)."""
    tab = _FLOW[name]
    total = abs(tab[int(T.TOTAL * 60)] - tab[0])
    return total / max(1, round(total / 7.0)) if total > 1e-6 else 7.0


_PERIOD = {name: _period(name) for name in T.PATHS}


def flow_shift(name, t):
    x = (t % T.TOTAL) * 60.0
    i = int(x)
    tab = _FLOW[name]
    return tab[i] + (tab[i + 1] - tab[i]) * (x - i)


def _content(name, t):
    """(base, dash, light) colours of what is inside a tube right now."""
    if name in ('ac', 'acpump', 'ac2'):
        return P.TUBE[3], P.MINT[3], P.WHITE
    if name == 'plt':
        return P.PLASMA[3], P.GOLD[3], P.WHITE
    if T.returning(t):                                           # going back: red cells and plasma, no platelets
        return P.RED[2], P.RED[1], P.RED[3]
    return P.RED[3], P.RED[2], P.RED[4]


def tube(pen, name, t, squeeze=None):
    pts, s = T.PATHS[name]
    x0, y0, x1, y1 = pen.view.world_rect()
    vis = (pts[:, 0] > x0 - 6) & (pts[:, 0] < x1 + 6) & (pts[:, 1] > y0 - 6) & (pts[:, 1] < y1 + 6)
    idx = np.nonzero(vis)[0]
    if len(idx) == 0:
        return
    step = max(1, int(round(0.9 / (0.6 * pen.z)))) if pen.z < 1.6 else 1
    idx = idx[::step]
    base, dash, light = _content(name, t)
    shift = flow_shift(name, t)
    sq = squeeze(pts[idx]) if squeeze is not None else np.zeros(len(idx))
    for k, i in enumerate(idx):                                  # transparent wall
        x, y = pts[i]
        bx, m, U, V = pen.disc(x, y, R_OUT * (1 - 0.35 * sq[k]), 0)
        if bx is not None:
            put(pen.buf, bx, m, P.TUBE[1])
    for k, i in enumerate(idx):                                  # what flows inside
        x, y = pts[i]
        r = R_IN * (1 - 0.92 * sq[k])
        if r < 0.25:
            continue
        f = ((s[i] - shift) / _PERIOD[name]) % 1.0
        col = dash if f < 0.32 else (light if f < 0.40 else base)
        bx, m, U, V = pen.disc(x, y, r, 0)
        if bx is not None:
            put(pen.buf, bx, m, col)
    if pen.z >= 1.2:                                             # a glint along the top of the tube
        for k, i in enumerate(idx[::2]):
            x, y = pts[i]
            pen.dot(x, y - R_IN * 0.75, P.TUBE[3])


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
    K, R = T.LID_K, T.BAY_R
    s = R / 36.0
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
        put(buf, bx, rot & (rr > 7 * s) & (np.abs(((ang * 3 / math.pi) % 2) - 1) < 0.12) & (rr < 17 * s), P.MACH[0])
    else:
        put(buf, bx, rot & (rr > 7 * s) & (rr < 17 * s) & (((rr / s).astype(int) % 4) == 0), P.MACH[0])
    # the ring-shaped separation channel: mixed blood, sorting into red / gold / pale yellow as it spins
    tt = t % T.TOTAL
    sep = T.separation(t) if tt >= T.SEPARATE[1] else 0.0
    if T.TO_SPIN[0] - 0.2 <= tt < T.SPIN_UP[0] + 0.4:
        filled = (ang % (2 * math.pi)) < 2 * math.pi * T.clamp01((tt - (T.TO_SPIN[0] - 0.2)) / 1.4)
    else:
        filled = np.ones_like(rr, bool)
    ch = rot & (rr > 18 * s) & (rr < 27 * s)
    put(buf, bx, ch, P.NAVY[2])
    if sep < 0.5:
        put(buf, bx, ch & filled, P.RED[3])
        put(buf, bx, ch & filled & ((np.floor(ang * 5) % 2) == 0) & (sp < 1.6), P.RED[2])
    else:
        put(buf, bx, ch & (rr >= 23.5 * s), P.RED[3])
        put(buf, bx, ch & (rr >= 21.5 * s) & (rr < 23.5 * s), P.GOLD[2])
        put(buf, bx, ch & (rr < 21.5 * s), P.PLASMA[2])
    pen.outline(bx, ch, P.MACH[0])
    if sp >= 1.6:                                                # motion streaks on the rotor
        put(buf, bx, rot & (rr > 27.5 * s) & (np.abs(((ang * 8 / math.pi) % 2) - 1) < 0.18), P.MACH[3])
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
    _disc(pen, T.JUNCTION[0], T.JUNCTION[1], 2.3, P.TEAL[3], P.WHITE, P.TEAL[2], P.TEAL[1])     # Y fitting
    x, y0, y1 = T.FILTER                                         # drip chamber on the donor line
    _rrect(pen, x - 3.6, y0, x + 3.6, y1, 1.6, P.TUBE[3], P.TUBE[1])
    blood = P.RED[2] if T.returning(t) else P.RED[3]
    _poly(pen, [(x - 2.4, y0 + 5), (x + 2.4, y0 + 5), (x + 2.4, y1 - 1.5), (x - 2.4, y1 - 1.5)], blood)
    _poly(pen, [(x - 2.4, y0 + 5), (x - 1.2, y0 + 5), (x - 1.2, y1 - 1.5), (x - 2.4, y1 - 1.5)], P.RED[4])
    for yy in (y0 - 0.5, y1 + 0.5):
        _rrect(pen, x - 3.0, yy - 2.0, x + 3.0, yy + 2.0, 0.8, P.TEAL[2], P.TEAL[1])
    for yy in (y0 + 8, y1 - 8):
        _rrect(pen, x - 5.5, yy - 1.2, x + 5.5, yy + 1.2, 0.5, P.NAVY[0])


def bag(pen, c, w, h, edge, fill, level, t, hook, gold=False):
    """A hanging plastic bag; the contents keep level, with a small wave."""
    x, y = c
    _poly(pen, [(hook[0] - 0.8, hook[1]), (hook[0] + 0.8, hook[1]), (hook[0] + 0.8, y - h / 2 - 4),
                (hook[0] - 0.8, y - h / 2 - 4)], P.MACH[2])
    pts = [(x - w / 2 + 3, y - h / 2), (x + w / 2 - 3, y - h / 2), (x + w / 2, y - h / 2 + 6), (x + w / 2 + 1, y + h / 2 - 6),
           (x + w / 2 - 4, y + h / 2), (x - w / 2 + 4, y + h / 2), (x - w / 2 - 1, y + h / 2 - 6), (x - w / 2, y - h / 2 + 6)]
    bx, m = pen.poly(pts)
    if bx is None:
        return
    U, V = pen.grid(bx)
    put(pen.buf, bx, m, P.NAVY[2])
    surf = y + h / 2 - 3 - (h - 6) * level + 0.8 * np.sin((U - x) * 0.5 + t * 4)
    liq = m & (V >= surf)
    put(pen.buf, bx, liq, fill)
    if gold:
        put(pen.buf, bx, liq & (((U + V * 0.5 + t * 6) // 3) % 5 == 0), P.GOLD[3])
        put(pen.buf, bx, liq & (V < surf + 1.2), P.WHITE)
    put(pen.buf, bx, m & (np.abs(U - (x - w / 2 + 4)) < 0.8) & (V > y - h / 2 + 6) & (V < y + h / 2 - 8), P.TUBE[3])
    pen.outline(bx, m, edge)
    _poly(pen, [(x - 2, y - h / 2 - 4), (x + 2, y - h / 2 - 4), (x + 2, y - h / 2), (x - 2, y - h / 2)], P.TUBE[2])


def machine(pen, t):
    poles(pen, t)
    bag(pen, T.AC_BAG, T.AC_W, T.AC_H, P.TUBE[3], P.MINT[3], 0.82, t, hook=(T.AC_BAG[0], T.POLE_TOP + 5))
    bag(pen, T.BAG, T.BAG_W, T.BAG_H, P.TUBE[3], P.PLASMA[3], T.bag_level(t), t, hook=(T.BAG[0], T.POLE_TOP + 5),
        gold=True)
    screen(pen, t)
    cabinet(pen, t)
    centrifuge(pen, t)
    pump_housing(pen, T.AC_PUMP, (180, 0))
    pump_housing(pen, T.PUMP, (90, -90))


def draw(pen, t):
    room(pen, t)
    chair_and_donor(pen, t)
    machine(pen, t)
    for name in ('ac', 'ac2', 'plt', 'draw3', 'draw2', 'draw1'):
        tube(pen, name, t)
    pump_head(pen, t, T.AC_PUMP, 'acpump', T.ac_pump_angle(t), P.BLUE)
    pump_head(pen, t, T.PUMP, 'pump', T.pump_angle(t), (P.RED[1], P.RED[2], P.RED[3], P.RED[4]))
    fittings(pen, t)
