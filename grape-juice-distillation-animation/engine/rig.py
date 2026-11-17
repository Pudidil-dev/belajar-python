"""The simple-distillation apparatus in side view, drawn in world millimetres (y up, the bench at y = 0).

Left to right: a heating mantle cradling the round-bottom distilling flask; the still head with a thermometer whose bulb
sits just below the side arm; a Liebig condenser sloping down to the right (cooling water in at the lower port near the
receiver, out at the upper port near the flask: counter-flow, so the jacket stays full); a bent adapter; the receiving
flask below the outlet. Retort stands and clamps hold it; hoses carry the water.

The condenser can be shown as a cutaway (its walls drawn as cut faces), wiped in from the upper rim. Everything is
evaluated per pixel at the camera's scale, and some details only appear when the camera is close.
"""
import math
import numpy as np
from . import world as Wd
from .world import circle, ellipse, rect, band, axis, poly, edge, ring, CHECK, dot
from . import timeline as T
from .palette import (NAVY, OUTLINE, WHITE, GLASS, JUICE, WATER, AMBER, MANTLE, LED_OFF, LED_ON, GLOW, METAL, HOSE,
                      CORK, VAPOR, CLEAR, BENCH, SILVER)

# ---------------------------------------------------------------- geometry
R_F = 38.0
F_HOME = (-55.0, 72.0)            # flask centre in the mantle
F_START = (-125.0, 59.0)          # flask centre on its cork ring (the opening)
NECK_HW = 7.5
NECK_TOP = 66.0                   # neck top above the flask centre
POOL = 30.0                       # depth of the juice once poured
J = (-55.0, 186.0)                # the still head's side-arm junction
STILL_TOP = 206.0
ANG = math.radians(35)
D = (math.cos(ANG), -math.sin(ANG))          # down the condenser, toward the receiver
NRM = (-D[1], D[0])                          # the condenser's upper side
S0 = (J[0] + 20 * D[0], J[1] + 20 * D[1])    # where the condenser's inner tube begins
L_IN = 170.0                                 # inner tube length
JACKET = (8.0, 156.0)
R_OUT, R_JW, R_IN_O, R_IN = 11.0, 9.8, 5.0, 3.8   # jacket outer / its inner wall / inner tube outer / bore
PORT_UP, PORT_LO = 24.0, 140.0               # along-positions of the water outlet (upper) and inlet (lower)
E = (S0[0] + L_IN * D[0], S0[1] + L_IN * D[1])
B = (E[0] + 10 * D[0], E[1] + 10 * D[1])
TIP = (B[0], 50.0)
RX = B[0]                                    # receiver centre x
MX = -55.0                                   # mantle centre x
STAND_L, STAND_R = -112.0, 52.0
THERMO_BULB = (J[0], 181.0)
CLAMP_AL = 62.0                              # where the condenser clamp holds the jacket


def p_on(along, across=0.0):
    """World point on the condenser axis frame."""
    return (S0[0] + along * D[0] + across * NRM[0], S0[1] + along * D[1] + across * NRM[1])


# ---------------------------------------------------------------- states over time
def flask_pos(t):
    """On its cork ring, then one game-style hop onto the heating mantle: a crouch, a jump arc, a landing."""
    t0 = T.HOP[0] + 0.08
    if t < t0:
        return F_START
    if t < T.HOP_LAND:
        u = (t - t0) / (T.HOP_LAND - t0)
        x = T.lerp(F_START[0], F_HOME[0], T.ease_in_out(u, 1.3))
        y = T.lerp(F_START[1], F_HOME[1], u) + 46.0 * 4 * u * (1 - u)
        return (x, y)
    return F_HOME


def flask_squash(t):
    """(sx, sy) of the flask: it crouches before the hop, stretches in the air, squashes on landing and wobbles."""
    if t < T.HOP[0] or t >= T.HOP[1]:
        return 1.0, 1.0
    if t < T.HOP[0] + 0.08:
        k = (t - T.HOP[0]) / 0.08
        return 1 + 0.10 * k, 1 - 0.14 * k
    if t < T.HOP_LAND:
        return 0.95, 1.07
    u = (t - T.HOP_LAND) / (T.HOP[1] - T.HOP_LAND)
    w = math.cos(u * math.pi * 2.5) * (1 - u)
    return 1 + 0.14 * w, 1 - 0.18 * w


def assembled(t):
    return t >= T.MATCH


def pool_depth(t):
    """Juice depth above the flask's lowest point (mm)."""
    if t < T.PLIP1:
        return 0.0
    d = POOL * T.ease_out(T.u_of(t, T.POUR), 1.8)
    return d - 6.0 * T.smooth(T.u_of(t, T.LAPSE))        # a little water leaves as vapour


def clear_depth(t):
    """Distillate depth in the receiver (mm)."""
    if t < T.PLIP2:
        return 0.0
    return 1.2 + 21.0 * T.smooth(T.u_of(t, T.LAPSE))


def thermo_level(t):
    return T.lerp(195.0, 236.0, T.ease_in_out(T.u_of(t, (T.GLOW[0], T.JUMP[1])), 2.0))


def cut_along(t):
    """How far down the condenser the cutaway has been wiped (mm along the axis; <0 none)."""
    if t < T.CUT_ON[0]:
        return -10.0
    if t >= T.DROP_FALL[0] + 1.2:
        return -10.0 if t >= T.COMPARE[0] else L_IN + 10
    return -10.0 + (L_IN + 20) * T.smooth(T.u_of(t, T.CUT_ON))


def water_front(t):
    """Along-position of the cooling water's front: it enters at the lower port and fills the jacket uphill."""
    if t < T.WATER_ON:
        return JACKET[1] + 30.0
    return T.lerp(PORT_LO + 4.0, JACKET[0] - 2.0, T.ease_in_out(T.u_of(t, (T.WATER_ON, T.WATER_ON + 0.6)), 1.5))


# ---------------------------------------------------------------- drawing
def background(buf, c):
    """Navy lab wall with large pixel tiles, and the bench."""
    buf[:] = NAVY[3]
    X, Y = Wd.full(c.X), Wd.full(c.Y)
    tile = 26.0
    tx = np.floor((X - (np.floor(Y / tile) % 2) * tile / 2) / tile)
    gx = (X - (np.floor(Y / tile) % 2) * tile / 2) - tx * tile
    gy = Y - np.floor(Y / tile) * tile
    lw = max(0.6 / c.s, 0.18)
    mortar = (gx < lw * 2.2) | (gy < lw * 2.2)
    buf[mortar & (Y > 0)] = NAVY[2]
    hi = (gy > tile - lw * 2.2) & ~mortar & (Y > 0)
    buf[hi] = NAVY[4]
    bench = Y <= 0
    buf[bench] = BENCH[1]
    buf[bench & (Y > -1.6)] = BENCH[2]
    buf[bench & (Y < -14)] = BENCH[0]


def draw_stand(buf, c, t):
    if not assembled(t) or c.s > 3.2:                  # close up, the stands would only be big grey bars
        return
    for sx, top in ((STAND_L, 238.0), (STAND_R, 160.0)):
        rod = rect(c, sx - 2.0, sx + 2.0, 4.0, top)
        buf[Wd.full(rod)] = METAL[1]
        buf[Wd.full(rect(c, sx - 2.0, sx - 0.8, 4.0, top))] = METAL[2]
        base = rect(c, sx - 24, sx + 24, 0.0, 4.5)
        buf[Wd.full(base)] = METAL[1]
        buf[edge(base)] = METAL[0]
        buf[edge(rod)] = METAL[0]
    # clamp arms (behind the glass): to the flask neck and to the condenser
    fx, fy = flask_pos(t)
    arm1 = rect(c, STAND_L, fx - NECK_HW - 2, fy + 52, fy + 56)
    cm = p_on(CLAMP_AL)
    arm2 = rect(c, cm[0] - 2, STAND_R, cm[1] - 2.0, cm[1] + 2.0)
    for a in (arm1, arm2):
        buf[Wd.full(a)] = METAL[2]
        buf[edge(a)] = METAL[0]
    boss = rect(c, STAND_L - 4, STAND_L + 4, fy + 50, fy + 58)
    boss2 = rect(c, STAND_R - 4, STAND_R + 4, cm[1] - 4, cm[1] + 4)
    for bm in (boss, boss2):
        buf[Wd.full(bm)] = METAL[3]
        buf[edge(bm)] = METAL[0]


def draw_clamp_jaws(buf, c, t):
    """The clamp jaws in front of the glass."""
    if not assembled(t) or c.s > 3.2:
        return
    fx, fy = flask_pos(t)
    for jx in (fx - NECK_HW - 2.6, fx + NECK_HW + 0.4):
        jaw = rect(c, jx, jx + 2.2, fy + 50.5, fy + 57.5)
        buf[Wd.full(jaw)] = METAL[3]
        buf[edge(jaw)] = METAL[0]
    for sgn in (1, -1):
        p = p_on(CLAMP_AL, sgn * (R_OUT + 1.0))
        jaw = band(c, p, D, -4.0, 4.0, 1.4)
        buf[Wd.full(jaw)] = METAL[3]
        buf[edge(jaw)] = METAL[0]


def draw_cork(buf, c, t):
    ck = ellipse(c, F_START[0], 21.0 - 4.0, 21.0, 5.0)
    buf[Wd.full(ck)] = CORK[1]
    buf[Wd.full(ck & (c.Y > 18.5))] = CORK[2]
    buf[edge(ck)] = OUTLINE


def _glass_interior(buf, m):
    """Glass seen against the navy: the background a touch lighter, in the one checker dither we allow."""
    m = Wd.full(m)
    buf[m & CHECK] = NAVY[4]


def _frost(buf, c, m):
    m = Wd.full(m)
    buf[m] = GLASS[0]
    buf[m & CHECK] = GLASS[1]


def flask_shapes(c, f):
    fx, fy = f
    sphere = circle(c, fx, fy, R_F)
    neck = rect(c, fx - NECK_HW, fx + NECK_HW, fy, fy + NECK_TOP)
    return sphere, neck


def draw_flask(buf, c, t, bubbles=True):
    fx, fy = flask_pos(t)
    sx, sy = flask_squash(t)
    if (sx, sy) != (1.0, 1.0):
        c = Wd.Squash(c, fx, fy - R_F, sx, sy)
    sphere, neck = flask_shapes(c, (fx, fy))
    body = Wd.full(sphere | neck)
    _glass_interior(buf, body)
    # the juice
    dep = pool_depth(t)
    if dep > 0:
        lvl = fy - R_F + dep
        X = Wd.full(c.X)
        ripple = 0.0
        juice = Wd.full(sphere & (c.Y <= lvl))
        if T.PLIP1 <= t < T.PLIP1 + 0.7:
            u = (t - T.PLIP1) / 0.7
            for sgn in (1, -1):
                cx_r = fx + sgn * 18 * u
                bump = np.exp(-((X - cx_r) / 2.2) ** 2) * 1.6 * (1 - u)
                juice = juice | Wd.full(sphere & (c.Y <= lvl + bump))
        buf[juice] = JUICE[1]
        buf[juice & Wd.full(c.Y < fy - R_F + dep * 0.32)] = JUICE[0]
        surf = edge(juice) & Wd.full(c.Y > lvl - 2.0 / c.s - 0.4)
        buf[surf] = JUICE[3]
        if t >= T.BOIL:
            _bubbles(buf, c, t, fx, fy, lvl)
        # boiling chips on the bottom
        if c.s >= 1.5:
            for k, dx in enumerate((-6.0, 1.5, 7.5)):
                ch = ellipse(c, fx + dx, fy - R_F + 1.6, 1.6, 1.1)
                buf[Wd.full(ch)] = GLASS[1] if k % 2 else GLASS[2]
    # glass outline, the neck's frosted joint, highlights
    buf[ring(body)] = GLASS[2]
    if c.s >= 1.6:
        _frost(buf, c, rect(c, fx - NECK_HW - 0.8, fx + NECK_HW + 0.8, fy + NECK_TOP - 7, fy + NECK_TOP) &
               ~rect(c, fx - NECK_HW + 0.8, fx + NECK_HW - 0.8, fy + NECK_TOP - 7, fy + NECK_TOP + 1))
    arc = circle(c, fx, fy, R_F - 3.0) & ~circle(c, fx, fy, R_F - 4.6) & (c.X < fx - 14) & (c.Y > fy + 8)
    buf[Wd.full(arc)] = GLASS[3]
    buf[Wd.full(rect(c, fx - NECK_HW + 1.5, fx - NECK_HW + 2.6, fy + 44, fy + NECK_TOP - 9))] = GLASS[3]
    gl = circle(c, fx - 20, fy + 22, 2.4)
    buf[Wd.full(gl)] = WHITE
    _sparkle(buf, c, t, fx - 24, fy + 15, 0.0)


def _sparkle(buf, c, t, x, y, phase, period=3.2):
    """A small glint that blinks on the glass now and then."""
    k = ((T.anim(t) + phase) % period) / period
    if k < 0.12:
        px, py = c.to(x, y)
        r = 2 if k < 0.06 else 1
        for dx, dy in [(0, 0)] + [(i, 0) for i in range(-r, r + 1)] + [(0, i) for i in range(-r, r + 1)]:
            dot(buf, px + dx, py + dy, WHITE)


_rng_b = np.random.default_rng(23)
_BUB = [(_rng_b.uniform(-24, 24), _rng_b.uniform(0, 1), _rng_b.uniform(0.9, 1.7), _rng_b.uniform(0.7, 1.2))
        for _ in range(40)]


def _bubbles(buf, c, t, fx, fy, lvl):
    t = T.anim(t)
    on = T.smooth(T.u_of(t, (T.BOIL, T.BOIL + 0.4)))
    bottom = fy - R_F + 3.0
    for i, (dx, ph, r, sp) in enumerate(_BUB):
        if i / len(_BUB) > on:
            continue
        period = (lvl - bottom) / (24.0 * sp)
        k = ((t - T.BOIL) / period + ph) % 1.0
        y = bottom + (lvl - bottom) * k
        x = fx + dx * (1 - 0.35 * k) + 0.8 * math.sin(t * 6 + i)
        rr = r * (0.6 + 0.6 * k)
        b = circle(c, x, y, rr)
        bm = Wd.full(b)
        buf[bm] = JUICE[0]
        buf[edge(b)] = JUICE[3]
        if k > 0.93:                                   # it pops at the surface
            px, py = c.to(x, lvl + 0.8)
            dot(buf, px - 1, py, JUICE[3])
            dot(buf, px + 1, py, JUICE[3])


def draw_still_head(buf, c, t):
    if not assembled(t):
        return
    fx, fy = flask_pos(t)
    tube = rect(c, J[0] - NECK_HW, J[0] + NECK_HW, fy + NECK_TOP, STILL_TOP)
    arm = band(c, J, D, 0.0, 22.0, 5.5)
    adp = rect(c, J[0] - 4.6, J[0] + 4.6, STILL_TOP, STILL_TOP + 9)
    body = Wd.full(tube | arm | adp)
    _glass_interior(buf, body)
    buf[ring(body)] = GLASS[2]
    if c.s >= 1.6:
        _frost(buf, c, adp & ~rect(c, J[0] - 2.4, J[0] + 2.4, STILL_TOP, STILL_TOP + 10))
    buf[Wd.full(rect(c, J[0] - NECK_HW + 1.5, J[0] - NECK_HW + 2.6, fy + NECK_TOP + 4, STILL_TOP - 4))] = GLASS[3]
    # the thermometer: bulb just below the side arm, the column rising as the vapour arrives
    rod = rect(c, J[0] - 2.2, J[0] + 2.2, THERMO_BULB[1], 262.0)
    bulb = ellipse(c, THERMO_BULB[0], THERMO_BULB[1], 2.7, 4.2)
    th = Wd.full(rod | bulb)
    buf[th] = GLASS[1]
    buf[Wd.full(bulb)] = SILVER[0]
    col = rect(c, J[0] - 0.8, J[0] + 0.8, THERMO_BULB[1], thermo_level(t))
    buf[Wd.full(col)] = SILVER[1]
    buf[ring(th)] = OUTLINE if c.s < 2 else GLASS[0]
    if c.s >= 2.2:                                     # graduations only close up
        for k in range(16):
            y = 196 + k * 4.0
            tick = rect(c, J[0] + 0.6, J[0] + (2.0 if k % 5 == 0 else 1.4), y, y + 0.35 + 0.5 / c.s)
            buf[Wd.full(tick)] = GLASS[0]


def draw_condenser(buf, c, t):
    if not assembled(t):
        return
    al, ac = axis(c, S0, D)
    aac = np.abs(ac)
    cut = Wd.full(al <= cut_along(t))
    in_jacket = Wd.full((al >= JACKET[0]) & (al <= JACKET[1]) & (aac <= R_OUT))
    tube = Wd.full((al >= -0.5) & (al <= L_IN) & (aac <= R_IN_O))
    bore = Wd.full((al >= -0.5) & (al <= L_IN + 0.5) & (aac <= R_IN))
    front = water_front(t)
    jacket_space = in_jacket & Wd.full((aac <= R_JW) & (aac > R_IN_O))
    water = jacket_space & Wd.full(al >= front)
    # ports (water out at the top near the flask, in at the bottom near the receiver)
    port_u = Wd.full(band(c, p_on(PORT_UP, R_OUT - 1), NRM, 0, 9.0, 2.6))
    port_l = Wd.full(band(c, p_on(PORT_LO, -(R_OUT - 1)), (-NRM[0], -NRM[1]), 0, 9.0, 2.6))
    flow = (T.anim(t) * 26.0)
    stripes = Wd.full(((al + flow) % 9.0) < 1.6)
    # --- the outside view: water seen through the glass
    seen = ~cut
    _glass_interior(buf, jacket_space & ~water & seen)
    w_out = water & seen
    buf[w_out] = WATER[0]
    buf[w_out & CHECK] = WATER[1]
    buf[w_out & stripes & Wd.full(aac > R_IN_O + 1.2)] = WATER[2]
    _glass_interior(buf, bore & seen)
    buf[tube & seen & ~bore] = GLASS[0]
    buf[edge(tube) & seen & ~bore] = GLASS[1]
    # --- the cutaway: walls as cut faces, water solid, the bore dark so vapour and beads read
    if cut.any():
        hatch = Wd.full((((c.X + c.Y) * c.s) % 4.0) < 1.0)
        outer_wall = in_jacket & Wd.full(aac > R_JW) & cut
        inner_wall = Wd.full((al >= -0.5) & (al <= L_IN) & (aac <= R_IN_O) & (aac > R_IN)) & cut
        w_cut = water & cut
        buf[jacket_space & ~water & cut] = NAVY[2]
        buf[w_cut] = WATER[1]
        buf[w_cut & stripes & Wd.full(aac > R_IN_O + 0.8)] = WATER[2]
        buf[w_cut & Wd.full((aac > R_JW - 0.6) | (aac < R_IN_O + 0.5))] = WATER[0]
        for wall in (outer_wall, inner_wall):
            buf[wall] = GLASS[3]
            if c.s >= 2.0:
                buf[wall & hatch] = GLASS[2]
        buf[bore & cut] = NAVY[2]
    # ports and the water running through them
    for pm, sgn in ((port_u, 1), (port_l, -1)):
        if (sgn > 0 and front > PORT_UP) or t < T.WATER_ON:      # the outlet runs only once the jacket is full
            _glass_interior(buf, pm)
            buf[ring(pm) & ~in_jacket] = GLASS[2]
            continue
        buf[pm] = WATER[1]
        if c.s >= 1.5:
            ps = Wd.full(((ac * sgn - flow * (1 if sgn > 0 else -1)) % 5.0) < 1.2) & pm
            buf[ps] = WATER[2]
        buf[ring(pm) & ~in_jacket] = GLASS[2]
    # outlines and seals
    jk = in_jacket
    buf[ring(jk) & ~port_u & ~port_l] = GLASS[2]
    buf[ring(tube) & ~jk] = GLASS[2]
    for a0 in JACKET:
        seal = Wd.full(band(c, p_on(a0), D, -0.8, 0.8, R_OUT)) & ~bore
        buf[seal] = GLASS[2]
    if c.s < 4:
        hl = Wd.full((al > JACKET[0] + 6) & (al < JACKET[1] - 6) & (ac > R_OUT - 2.2) & (ac < R_OUT - 1.2)) & ~cut
        buf[hl] = GLASS[3]
    _sparkle(buf, c, t, *p_on(60.0 + 50 * math.sin(t * 0.7), R_OUT - 1.5), 1.1, 4.1)


def draw_hoses(buf, c, t):
    if not assembled(t):
        return
    pu = p_on(PORT_UP, R_OUT + 8.0)
    pl = p_on(PORT_LO, -(R_OUT + 8.0))
    for pts in ((pu, (pu[0] + 8, pu[1] + 34), (pu[0] + 20, pu[1] + 120)),
                (pl, (pl[0] - 4, pl[1] - 26), (pl[0] - 40, -2.0))):
        for (a, b) in zip(pts[:-1], pts[1:]):
            d = (b[0] - a[0], b[1] - a[1])
            L = math.hypot(*d)
            d = (d[0] / L, d[1] / L)
            h = band(c, a, d, -1.5, L + 1.5, 3.2)
            buf[Wd.full(h)] = HOSE[1]
            buf[Wd.full(band(c, a, d, -1.5, L + 1.5, 1.0)) & Wd.full(h)] = HOSE[2]
            buf[edge(h)] = OUTLINE


def draw_adapter(buf, c, t):
    if not assembled(t):
        return
    a1 = band(c, E, D, -1.0, 10.5, 5.0)
    a2 = rect(c, B[0] - 4.6, B[0] + 4.6, TIP[1], B[1] + 3.0)
    body = Wd.full(a1 | a2)
    _glass_interior(buf, body)
    buf[ring(body)] = GLASS[2]
    if c.s >= 1.6:
        _frost(buf, c, band(c, E, D, -3.0, 2.0, 6.2) & ~band(c, E, D, -3.0, 2.0, 5.0))


def receiver_shape(c):
    pts = [(RX - 30, 0.0), (RX + 30, 0.0), (RX + 30, 3.0), (RX + 9.5, 40.0), (RX + 9.5, 58.0),
           (RX + 11.0, 60.0), (RX - 11.0, 60.0), (RX - 9.5, 58.0), (RX - 9.5, 40.0), (RX - 30, 3.0)]
    return poly(c, pts)


def draw_receiver(buf, c, t):
    if not assembled(t):
        return
    shp = receiver_shape(c)
    body = Wd.full(shp)
    behind = buf.copy()                                   # the wall behind the flask, before the glass tint
    _glass_interior(buf, body)
    dep = clear_depth(t)
    if dep > 0:
        lvl = 1.0 + dep
        liq = body & Wd.full(c.Y <= lvl)
        # transparent: the wall's tiles and mortar stay visible through the liquid, just lifted a little
        buf[liq] = CLEAR[1]
        buf[liq & np.all(behind == NAVY[2], axis=2)] = CLEAR[0]
        buf[liq & np.all(behind == NAVY[4], axis=2)] = CLEAR[2]
        buf[liq & Wd.full((c.Y > lvl - 2.6 / c.s - 0.8) & (c.Y <= lvl - 1.2 / c.s))] = CLEAR[2]
        buf[edge(liq) & Wd.full(c.Y > lvl - 1.5 / c.s - 0.3)] = WHITE          # the surface
        buf[edge(liq) & edge(body)] = WHITE                                   # the clear liquid's edges
        if c.s >= 1.6:
            sh = liq & Wd.full(band(c, (RX - 10.0, 2.0), (0.42, 0.907), 0, lvl, 0.7))
            buf[sh] = CLEAR[2]
    buf[ring(body)] = GLASS[2]
    hl = Wd.full(band(c, (RX - 24.0, 8.0), (0.48, 0.877), 0, 18.0, 0.9)) & body
    buf[hl] = GLASS[3]
    _sparkle(buf, c, t, RX - 18.0, 20.0, 2.3, 3.6)


# ---------------------------------------------------------------- vapour, heat, beads, drops
_rng_v = np.random.default_rng(71)
N_V = 620
V_T0 = T.BOIL + np.sort(_rng_v.uniform(0, T.TOTAL - T.BOIL + 2.0, N_V)) - 0.6
V_SP = _rng_v.uniform(46, 70, N_V)
V_X0 = _rng_v.uniform(-20, 20, N_V)
V_OFF = _rng_v.uniform(-0.8, 0.8, N_V)
V_LIFE = _rng_v.uniform(95.0, 175.0, N_V)              # how far down the inner tube each one gets before it condenses


def vapour_path(dist, x0, off, lvl, fx):
    """World point at `dist` mm along a vapour particle's path: up from the surface, up the neck, into the condenser."""
    base = 111.0
    rise = base - lvl
    if dist < rise:
        k = dist / rise
        return (fx + x0 * (1 - k * k) + off * NECK_HW * 0.6 * k, lvl + dist)
    dist -= rise
    up = J[1] - base
    if dist < up:
        return (J[0] + off * NECK_HW * 0.6, base + dist)
    dist -= up
    return p_on(dist - 20.0, off * (R_IN - 0.9))


def draw_vapour(buf, c, t):
    t = T.anim(t)
    if t < T.BOIL or not assembled(t):
        return
    fx, fy = flask_pos(t)
    lvl = fy - R_F + pool_depth(t)
    size = 3 if c.s >= 6 else (2 if c.s >= 2.2 else 1)
    rise = 111.0 - lvl
    for k in range(N_V):
        age = t - V_T0[k]
        if age < 0:
            continue
        dist = age * V_SP[k]
        limit = rise + (J[1] - 111.0) + 20 + V_LIFE[k]
        if dist > limit:
            continue
        x, y = vapour_path(dist, V_X0[k], V_OFF[k], lvl, fx)
        px, py = c.to(x, y)
        if -2 <= px < Wd.W + 2 and -2 <= py < Wd.H + 2:
            dot(buf, px, py, VAPOR, size)


SEC = 112.0                                            # the section of inner wall the camera studies


def draw_heat(buf, c, t):
    """The heat cue (a visual cue only): bold amber arcs leave the vapour, light up the inner glass wall while they cross
    it, and die out just past its outer face. The cooling water never changes colour."""
    if not (T.HEAT[0] <= t < T.HEAT[1] + 0.4):
        return
    al, ac = axis(c, S0, D)
    for i, (a, side) in enumerate(((SEC - 9.0, -1), (SEC - 2.0, 1), (SEC + 4.5, -1), (SEC + 11.0, 1), (SEC - 15.0, 1))):
        t0 = T.HEAT[0] + 0.15 * i
        u = (t - t0) / 0.7
        if u < 0 or u >= 1:
            continue
        pos = T.lerp(R_IN - 2.4, R_IN_O + 0.7, T.ease_in_out(u, 1.5))     # the arc's front, measured from the axis
        fade = 1.0 - T.clamp01((u - 0.72) / 0.28)
        half = 2.8 - 0.8 * u
        da = al - a
        bow = pos - 0.16 * da * da                                         # an arc bulging toward the water
        q = ac * side
        span = Wd.full(np.abs(da) <= half)
        if R_IN - 0.3 <= pos <= R_IN_O + 0.5:                            # the glass glows where the pulse is crossing it
            wall = span & Wd.full((q > R_IN) & (q <= R_IN_O) & (np.abs(da) <= half + 0.6))
            buf[wall & CHECK] = AMBER[0]
        if fade <= 0:
            continue
        arc = span & Wd.full(np.abs(q - bow) <= 0.32)
        core = span & Wd.full(np.abs(q - bow) <= 0.12) & Wd.full(np.abs(da) <= half * 0.7)
        trail = span & Wd.full((q < bow - 0.32) & (q > bow - 1.1)) & CHECK
        if fade < 0.5:
            arc &= CHECK
        buf[trail & Wd.full(q < R_IN)] = AMBER[0]
        buf[arc] = AMBER[1]
        buf[core] = AMBER[2]


# beads on the inner wall: (along, side (-1 floor / +1 ceiling), radius mm, appear time)
_rng_d = np.random.default_rng(5)
_B0 = T.BEADS[0]
BEADS = [(SEC - 4.2, -1, 1.0, _B0 + 0.05), (SEC + 2.4, -1, 1.15, _B0 + 0.25), (SEC - 11.0, -1, 0.8, _B0 + 0.5),
         (SEC + 8.6, -1, 0.9, _B0 + 0.7), (SEC - 7.0, 1, 0.75, _B0 + 0.4), (SEC + 5.0, 1, 0.8, _B0 + 0.9),
         (SEC - 14.0, 1, 0.7, _B0 + 1.1), (SEC + 12.5, -1, 0.75, _B0 + 1.35)]
A_IDX, B_IDX = 0, 1                                    # the two that merge
R_MERGED = (BEADS[0][2] ** 3 + BEADS[1][2] ** 3) ** (1 / 3)


def _bore(c):
    return band(c, S0, D, -0.5, L_IN + 0.5, R_IN)


def _bead(buf, c, x, y, r, clip=None):
    """A clear bead: see-through (the dark tube behind, a touch lighter), a bright crescent below, a thin white edge.
    `clip` (the bore) flattens it against the wall it sits on, so it reads as a dome stuck to the glass."""
    m = circle(c, x, y, r)
    if clip is not None:
        m = m & clip
    mm = Wd.full(m)
    if not mm.any():
        px, py = c.to(x, y)
        dot(buf, px, py, WHITE)
        return
    buf[mm] = NAVY[4]
    buf[mm & CHECK] = NAVY[5]
    cres = mm & ~Wd.full(circle(c, x + r * 0.12, y + r * 0.22, r * 0.86))
    buf[cres & Wd.full(c.Y < y)] = CLEAR[2]
    buf[edge(m)] = WHITE
    gx, gy = c.to(x - r * 0.38, y + r * 0.38)
    dot(buf, gx, gy, WHITE, 2 if r * c.s > 7 else 1)


def drop_track(t):
    """(world x, y, radius) of the merged drop after the merge, or None."""
    if t < T.MERGE:
        return None
    a0 = BEADS[B_IDX][0]
    if t < T.FOLLOW[0]:
        return p_on(a0, -(R_IN - 0.55 * R_MERGED)) + (R_MERGED,)
    if t < T.FOLLOW[1] - 0.45:
        k = T.ease_in((t - T.FOLLOW[0]) / (T.FOLLOW[1] - 0.45 - T.FOLLOW[0]), 1.6)
        a = T.lerp(a0, L_IN + 10.0, k)
        r = R_MERGED + 0.5 * k
        if a <= L_IN:
            return p_on(a, -(R_IN - 0.55 * r)) + (r,)
        u = (a - L_IN) / 10.0
        p = (E[0] + 10 * D[0] * u, E[1] + 10 * D[1] * u - (3.4 - r) * 0.0)
        return (p[0], p[1] - 2.0, r)
    if t < T.DROP_FALL[0]:
        k = T.smooth((t - (T.FOLLOW[1] - 0.45)) / 0.45)
        r = R_MERGED + 0.5 + 0.4 * k
        return (TIP[0], T.lerp(B[1] - 2.0, TIP[1] - r, k), r)
    if t < T.PLIP2:
        r = R_MERGED + 0.9
        k = T.ease_in(T.u_of(t, T.DROP_FALL), 2.0)
        return (TIP[0], T.lerp(TIP[1] - r, 1.0 + r * 0.6, k), r)
    return None


def draw_beads(buf, c, t):
    if t < T.BEADS[0] or t >= T.COMPARE[0]:
        return
    for i, (a, side, r, t0) in enumerate(BEADS):
        if t < t0 or (i in (A_IDX, B_IDX) and t >= T.MERGE):
            continue
        g = T.back_out(T.u_of(t, (t0, t0 + 0.35)), 1.4)
        rr = r * g
        if rr < 0.08:
            continue
        aa = a
        if i == A_IDX and t >= T.MERGE - 0.3:
            aa = T.lerp(a, BEADS[B_IDX][0] - 0.2, T.ease_in(T.u_of(t, (T.MERGE - 0.3, T.MERGE)), 2.0))
        x, y = p_on(aa, side * (R_IN - 0.55 * rr))
        _bead(buf, c, x, y, rr, _bore(c))
    dt = drop_track(t)
    if dt is not None:
        x, y, r = dt
        along = (x - S0[0]) * D[0] + (y - S0[1]) * D[1]
        inside = t < T.FOLLOW[1] - 0.45 and along <= L_IN          # still sliding on the inner tube's floor
        _bead(buf, c, x, y, r, _bore(c) if inside else None)


def draw_splash(buf, c, t):
    if not (T.PLIP2 <= t < T.PLIP2 + 0.5):
        return
    u = (t - T.PLIP2) / 0.5
    lvl = 1.0 + clear_depth(t)
    for k, (vx, vy) in enumerate(((-9, 14), (9, 14), (-4, 19), (4, 19), (-13, 8), (13, 8))):
        x = TIP[0] + vx * u
        y = lvl + vy * u - 34 * u * u
        if y < lvl:
            continue
        px, py = c.to(x, y)
        dot(buf, px, py, WHITE, 2 if c.s > 3 and k < 4 else 1)
    cr = Wd.full(ellipse(c, TIP[0], lvl, 3 + 8 * u, 1.0 + 1.2 * (1 - u))) & ~Wd.full(
        ellipse(c, TIP[0], lvl, 2 + 8 * u, 0.6 + 1.0 * (1 - u)))
    buf[cr] = WHITE


def hanging_drop(t):
    """The next drop growing at the outlet (the last shot), as (x, y, r)."""
    if t < T.LOOP_PUSH[0] - 0.2:
        return None
    r = T.lerp(1.4, 3.0, T.ease_out(T.u_of(t, (T.LOOP_PUSH[0] - 0.2, T.LOOP_PUSH[1] - 0.2)), 2.0))
    wob = 0.06 * r * math.sin(t * 11.0)
    return (TIP[0] + wob, TIP[1] - r * 0.92, r)


def draw_hanging_drop(buf, c, t):
    hd = hanging_drop(t)
    if hd is None:
        return
    x, y, r = hd
    neck = band(c, (x, TIP[1] + 0.2), (0.0, -1.0), 0, r * 0.55, r * 0.42, r * 0.7)
    body = circle(c, x, y, r) | neck
    bm = Wd.full(body)
    buf[bm] = NAVY[4]                                    # see-through: the navy behind, a touch lighter
    buf[bm & CHECK] = NAVY[5]
    cres = bm & ~Wd.full(circle(c, x + r * 0.1, y + r * 0.2, r * 0.84)) & Wd.full(c.Y < y)
    buf[cres] = CLEAR[2]
    buf[edge(body)] = WHITE
    gl = ellipse(c, x - r * 0.38, y + r * 0.34, r * 0.2, r * 0.26)
    buf[Wd.full(gl)] = WHITE


def draw_rig(buf, c, t):
    """All the apparatus at time t (the grape and its stream are drawn by grape.py). From the match cut the still is
    built around the flask: each part drops into place on the beat (see timeline.drop_in)."""
    from . import heater
    background(buf, c)
    built = assembled(t)
    h_head = T.drop_in(t, T.PART_HEAD) if built else None
    h_cond = T.drop_in(t, T.PART_COND) if built else None
    h_recv = T.drop_in(t, T.PART_RECV) if built else None
    c_head, c_cond, c_recv = (Wd.lifted(c, h) for h in (h_head, h_cond, h_recv))
    if h_cond is not None:
        draw_stand(buf, c_cond, t)
    heater.draw_cord(buf, c, t)
    draw_cork(buf, c, t)
    if h_cond is not None:
        draw_hoses(buf, c_cond, t)
    heater.draw_mantle(buf, c, t)
    if h_recv is not None:
        draw_receiver(buf, c_recv, t)
    if h_cond is not None:
        draw_condenser(buf, c_cond, t)
    if h_recv is not None:
        draw_adapter(buf, c_recv, t)
    draw_flask(buf, c, t)
    heater.draw_heat_in(buf, c, t)
    if h_head is not None:
        draw_still_head(buf, c_head, t)
    draw_vapour(buf, c, t)
    draw_heat(buf, c, t)
    draw_beads(buf, c, t)
    draw_splash(buf, c, t)
    draw_hanging_drop(buf, c, t)
    if h_cond is not None:
        draw_clamp_jaws(buf, c_cond, t)
