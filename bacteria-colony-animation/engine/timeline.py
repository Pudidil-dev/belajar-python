"""Clocks, layout and the one continuous camera of the 20-second loop (120 BPM: one bar = 2 s, ten bars).

World units are millimetres. The lab bench is a strip along x that repeats every DELTA mm: one Petri dish and the
same set of props (burner, flask, notebook, stirrer ...) in every stretch. Plate n's agar surface is the plane z = 0
around (n*DELTA, 0), and every plate runs the same story on its own clock tau_n = t - n*TOTAL. In one loop the camera
pans in from the previous plate's culture, the swab streaks plate 0, the camera dives, watches the cells, pulls out
over plate 0's colonies, and pans off across the bench toward plate 1. At t = 20 the camera is exactly DELTA further
along than at t = 0 and plate 1 is exactly where plate 0 was, so the last frame flows straight into the first.

The camera is orthographic (2D pixel art has no perspective), described by the ground point at the centre of the
screen (xc, yc), a zoom (pixels per mm) and an elevation e (0 = level with the bench, 90 deg = straight down):
    sx = W/2 + (x - xc) * zoom,   sy = H/2 - ((y - yc) * sin e + z * cos e) * zoom
"""
import math
import numpy as np

W, H = 270, 480
FPS = 30
TOTAL = 20.0
BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT

# ------------------------------------------------------------------ the dish (mm)
DELTA = 320.0                   # one plate (and one set of bench props) every 320 mm along x
R_IN, R_OUT = 42.0, 43.2        # agar radius = inner wall, outer wall
Z_TOP = 8.8                     # rim height above the agar surface
Z_FLOOR = -4.0                  # bottom of the 4 mm agar layer
Z_BENCH = -5.2                  # the bench the dish stands on


def S(t, a, b):
    """Smootherstep from 0 at a to 1 at b (zero first and second derivative at both ends)."""
    u = min(max((t - a) / (b - a), 0.0), 1.0)
    return u * u * u * (u * (u * 6 - 15) + 10)


def S_arr(x, a, b):
    u = np.clip((np.asarray(x, np.float64) - a) / (b - a), 0.0, 1.0)
    return u * u * u * (u * (u * 6 - 15) + 10)


def hermite(p0, v0, p1, v1, t0, t1, t):
    """Cubic Hermite between (p0, v0) at t0 and (p1, v1) at t1 (velocities per second); arrays allowed."""
    d = t1 - t0
    u = min(max((t - t0) / d, 0.0), 1.0)
    h00, h10 = 2 * u ** 3 - 3 * u ** 2 + 1, u ** 3 - 2 * u ** 2 + u
    h01, h11 = -2 * u ** 3 + 3 * u ** 2, u ** 3 - u ** 2
    return (h00 * np.asarray(p0, float) + h10 * d * np.asarray(v0, float)
            + h01 * np.asarray(p1, float) + h11 * d * np.asarray(v1, float))


# ------------------------------------------------------------------ the streak (plate-local mm)
def _raw(u):
    u = np.asarray(u, np.float64)
    return -32.0 + 64.0 * u, 7.5 * np.sin(3 * math.pi * u) * (1 - 0.25 * u)


_U = np.linspace(0, 1, 4001)
_X, _Y = _raw(_U)
_SEG = np.hypot(np.diff(_X), np.diff(_Y))
S_TOT = float(_SEG.sum())                                  # streak length, about 80 mm
_P = np.concatenate([[0.0], np.cumsum(_SEG)]) / S_TOT      # arc-length fraction for every sample


def path_at_x(x):
    """For plate-local x (array): the streak's y there, its slope and the arc fraction p (the streak is a graph
    over x, so this is exact enough for per-pixel work)."""
    u = np.clip((np.asarray(x, np.float64) + 32.0) / 64.0, 0.0, 1.0)
    y = 7.5 * np.sin(3 * math.pi * u) * (1 - 0.25 * u)
    dydu = 7.5 * (3 * math.pi * np.cos(3 * math.pi * u) * (1 - 0.25 * u) - 0.25 * np.sin(3 * math.pi * u))
    return y, dydu / 64.0, np.interp(u, _U, _P)


def path_tan(p):
    p = float(min(max(p, 0.0), 1.0))
    i = min(int(np.searchsorted(_P, p)), len(_P) - 1)
    i = max(i, 1)
    dx, dy = _X[i] - _X[i - 1], _Y[i] - _Y[i - 1]
    n = math.hypot(dx, dy)
    return dx / n, dy / n


def path_xy(p):
    """Point at arc fraction p (constant speed along the streak); straight on along the end tangents outside 0..1."""
    if p < 0:
        tx, ty = path_tan(0.0)
        return float(_X[0] + tx * p * S_TOT), float(_Y[0] + ty * p * S_TOT)
    if p > 1:
        tx, ty = path_tan(1.0)
        return float(_X[-1] + tx * (p - 1) * S_TOT), float(_Y[-1] + ty * (p - 1) * S_TOT)
    return float(np.interp(p, _P, _X)), float(np.interp(p, _P, _Y))


def path_norm(p):
    tx, ty = path_tan(p)
    return -ty, tx


SW0, SW1 = 2.0, 4.0             # the cotton touches the agar for tau in [SW0, SW1]
SW_ACC = 0.35                   # it lands, then speeds up over the first 0.35 s
V_SW = S_TOT / (SW1 - SW0 - SW_ACC / 2)   # top streak speed, mm/s
_S_ACC = 0.5 * V_SW * SW_ACC


def p_of_tau(tau):
    """Arc fraction of the cotton along the streak: a soft start, then constant speed."""
    u = tau - SW0
    if u <= 0:
        return 0.0
    if u < SW_ACC:
        return 0.5 * V_SW * u * u / SW_ACC / S_TOT
    return (_S_ACC + V_SW * (u - SW_ACC)) / S_TOT


def tau_of_p(p):
    """When the cotton passed arc fraction p (array)."""
    sd = np.asarray(p, np.float64) * S_TOT
    return np.where(sd < _S_ACC, SW0 + np.sqrt(2 * np.maximum(sd, 0) * SW_ACC / V_SW),
                    SW0 + SW_ACC + (sd - _S_ACC) / V_SW)


# ------------------------------------------------------------------ the seeds: where the swab left cells
P_OUR = 0.75                    # our cell (and later our colony) sits at 3/4 of the streak
_on = path_norm(P_OUR)
CELL_X, CELL_Y = path_xy(P_OUR)[0] + 0.3 * _on[0], path_xy(P_OUR)[1] + 0.3 * _on[1]
A_OUR = 1.15                    # radius of our colony after one night, mm


def _seeds():
    rng = np.random.default_rng(11)
    out = []                                    # (x, y, final radius mm, p)
    p = 0.004
    while p < 0.27:                             # start of the streak: crowded, colonies run together
        off = float(np.clip(rng.normal(0, 0.6), -1.4, 1.4))
        out.append((p, off, rng.uniform(0.55, 0.92)))
        p += rng.uniform(0.28, 0.5) * (1 + 2.5 * p) / S_TOT
    while p < 0.58:                             # middle: colonies touching, gaps opening
        off = float(np.clip(rng.normal(0, 0.8), -1.6, 1.6))
        out.append((p, off, rng.uniform(0.7, 1.08)))
        k = (p - 0.27) / 0.31
        p += rng.uniform(0.85, 1.25) * (0.9 + 1.7 * k) / S_TOT
    while p < 0.985:                            # end: single, separate dots, each from one cell
        if abs(p - P_OUR) * S_TOT > 2.9:
            off = float(np.clip(rng.normal(0, 0.9), -1.7, 1.7))
            out.append((p, off, rng.uniform(0.82, 1.28)))
        p += rng.uniform(2.9, 4.4) / S_TOT
    res = []
    for p, off, a in out:
        x, y = path_xy(p)
        nx, ny = path_norm(p)
        res.append((x + off * nx, y + off * ny, a, p))
    res.append((CELL_X, CELL_Y, A_OUR, P_OUR))
    res.sort(key=lambda r: r[3])
    return np.array(res)


SEEDS = _seeds()                                    # columns: x, y, a_final, p
OUR = int(np.argmin(np.hypot(SEEDS[:, 0] - CELL_X, SEEDS[:, 1] - CELL_Y)))
POP0, POP_LEN = 12.0, 1.6                           # colonies pop along the streak from 12.0 to 13.6
POP_T = POP0 + POP_LEN * SEEDS[:, 3]

# ------------------------------------------------------------------ growth: one cell, thirty doublings
# divisions on the beat, faster and faster: half bar, quarters, eighths, sixteenths, thirty-seconds
DIV = np.array([8.0, 8.5, 9.0, 9.25, 9.5, 9.75, 10.0]
               + [10.0 + 0.125 * k for k in range(1, 9)]
               + [11.0 + 0.0625 * k for k in range(1, 16)])
NGEN = len(DIV)                                     # 30 doublings: 2**30 = 1,073,741,824 cells
CYC0 = 6.0                                          # the first cell starts to grow at 6.0
STARTS = np.concatenate([[CYC0], DIV[:-1]])
OVERNIGHT = float(DIV[-1])                          # 11.94: the clock stops (about 10 h at 37 C)


def gen_phase(tau):
    """(divisions completed, phase 0..1 of the current cell cycle)."""
    if tau < CYC0:
        return 0, 0.0
    k = int(np.searchsorted(DIV, tau, side='right'))
    if k >= NGEN:
        return NGEN, 0.0
    return k, (tau - STARTS[k]) / (DIV[k] - STARTS[k])


def g_cont(tau):
    k, ph = gen_phase(tau)
    return k + ph


def g_pop(tau):
    """Generation as the colony shows it: it steps up at each division with a quick 70 ms ease (a pop)."""
    k, _ = gen_phase(tau)
    if k == 0:
        return 0.0
    u = min(1.0, (tau - DIV[k - 1]) / 0.07)
    return k - 1 + 1 - (1 - u) ** 3


_TG = np.arange(-1.0, TOTAL + 1.0, 0.002)
_GC = np.array([g_cont(x) for x in _TG])
_KW = np.hanning(int(0.36 / 0.002) | 1)
_GS = np.convolve(np.pad(_GC, len(_KW) // 2, mode='edge'), _KW / _KW.sum(), mode='valid')


def g_smooth(tau):
    """Generation smoothed over a third of a second: what the camera follows."""
    return float(np.interp(tau, _TG, _GS))


# Colony radius (um). Up to 9 doublings it is the size of the simulated patch of single cells (engine/cells.py,
# value at the end of each cycle); after that the cells pile up into a dome that grows more slowly, reaching
# A_OUR (1.15 mm) after 30 doublings.
A_PATCH = np.maximum.accumulate(np.array([1.0, 2.0, 3.36, 4.52, 3.8, 5.03, 6.7, 8.54, 11.16, 14.69]))
G_DOME = 9
KX = math.log2(A_OUR * 1000.0 / A_PATCH[-1]) / (NGEN - G_DOME)


def a_um(g):
    if g <= G_DOME:
        return float(np.exp(np.interp(g, np.arange(G_DOME + 1), np.log(A_PATCH))))
    return float(A_PATCH[-1] * 2.0 ** (KX * (g - G_DOME)))


def dome_ratio(g):
    """Height / radius of the colony: flat while it is one layer, a low dome once the cells pile up."""
    return 0.06 + 0.16 * S(g, 9.0, 14.0)


# ------------------------------------------------------------------ the swab
X0, Y0 = path_xy(0.0)                   # where the cotton lands: the start of the streak on plate 0
ENTER = 0.45                            # it comes in from the top of the frame ...
_ENT = [(ENTER, (X0 + 34.0, Y0 + 108.0, 80.0), (-22.0, -110.0, -60.0)),
        (1.35, (X0 + 8.0, Y0 + 24.0, 22.0), (-16.0, -55.0, -40.0)),
        (SW0, (X0, Y0, 0.0), (0.0, 0.0, 0.0))]           # ... and touches down softly at 2.0
LIFT = 0.9                              # after the streak it lifts away for 0.9 s
T_PASS = float(tau_of_p(P_OUR))         # 3.55: the cotton passes the spot where our cell is left


def swab_tip(t):
    """Bottom of the cotton tip (x, y, z) in world mm, or None when the swab is off the set."""
    t = t % TOTAL
    if ENTER <= t < SW0:
        (ta, pa, va), (tb, pb, vb) = (_ENT[0], _ENT[1]) if t < _ENT[1][0] else (_ENT[1], _ENT[2])
        return tuple(hermite(pa, va, pb, vb, ta, tb, t))
    if SW0 <= t <= SW1:
        x, y = path_xy(p_of_tau(t))
        return x, y, 0.0
    if SW1 < t < SW1 + LIFT:
        u = t - SW1
        tx, ty = path_tan(1.0)
        d = V_SW * u * (1 - 0.35 * u / LIFT)
        x, y = path_xy(1.0)
        return x + tx * d, y + ty * d, 40.0 * (u / LIFT) ** 2
    return None


def swab_vel(t, h=1e-3):
    a, b = swab_tip(t - h), swab_tip(t + h)
    if a is None or b is None:
        return 0.0, 0.0, 0.0
    return tuple((np.asarray(b) - np.asarray(a)) / (2 * h))


def swab_axis(t):
    """Unit vector up the stick: tilted 20 deg back, leaning a little into the motion."""
    vx = swab_vel(t)[0]
    lean = 0.05 * max(-1.5, min(1.5, vx / V_SW))
    a = np.array([lean, math.sin(math.radians(20)), math.cos(math.radians(20))])
    return a / np.linalg.norm(a)


def swab_squash(t):
    t = t % TOTAL
    if SW0 <= t <= SW1:
        b = max(0.0, 1 - abs(t - (SW0 + 0.06)) / 0.2)
        return 0.25 + 0.5 * b
    return 0.0


# glints: bright specks drop off the fibres onto the gel and blink out
def _glints():
    rng = np.random.default_rng(5)
    out, tau = [], SW0 + 0.1
    while tau < SW1 - 0.05:
        out.append((tau, rng.uniform(-1.4, 1.4), rng.uniform(-0.8, 0.8), rng.uniform(0.8, 2.6), rng.random()))
        tau += rng.uniform(0.06, 0.12)
    return np.array(out)


GLINTS = _glints()                  # columns: tau spawn, side offset, along offset, start height, size
GLINT_FALL, GLINT_SIT = 0.1, 0.36   # fall onto the gel, sit, then blink out (sparkle frame)


def glint_end(i):
    return GLINTS[i, 0] + GLINT_FALL + GLINT_SIT


# ------------------------------------------------------------------ the camera
E_RIDE, E_CELL, E_TOP = (math.radians(a) for a in (52.0, 62.0, 90.0))
Z_RIDE, Z_CELL = 7.0, 36000.0
Z_HOLD = 3.075                      # DELTA * Z_HOLD = 984 px: a whole number of 4-px dither tiles
Z_PLATE = Z_HOLD / 1.06
Z_PAN = 2.1                         # the camera pulls back a little while it crosses the bench
TIP_SX, TIP_SY = 112.0, 300.0       # where the cotton rides on screen (lead room to the right, the stick above)
R_SCREEN = 80.0                     # colony radius on screen while it grows
LOCK = 4.95                         # the target bracket locks onto our cell
PAN0, PAN_LEN = 16.0, 5.6           # the pan: off the culture at 16.0, onto the next plate at 1.6 (next loop)
PAN_END = PAN0 + PAN_LEN - TOTAL
X_ARR = DELTA + X0 + (W / 2 - TIP_SX) / Z_HOLD     # where the pan stops (relative to the plate it left)
Y_ARR = Y0 + (TIP_SY - H / 2) / Z_HOLD


class Cam:
    __slots__ = ('xc', 'yc', 'z', 'e', 's', 'c')

    def __init__(self, xc, yc, z, e):
        self.xc, self.yc, self.z, self.e = float(xc), float(yc), float(z), float(e)
        self.s, self.c = math.sin(e), math.cos(e)

    def px(self, x, y, zz=0.0):
        return (W / 2 + (np.asarray(x) - self.xc) * self.z,
                H / 2 - ((np.asarray(y) - self.yc) * self.s + np.asarray(zz) * self.c) * self.z)


def cam_from_anchor(ax, ay, az, sx, sy, z, e):
    s, c = math.sin(e), math.cos(e)
    return Cam(ax - (sx - W / 2) / z, ay - ((H / 2 - sy) / z - az * c) / s, z, e)


def in_pan(t):
    t = t % TOTAL
    return t >= PAN0 or t < PAN_END


def _pan_u(t):
    t = t % TOTAL
    return t - PAN0 if t >= PAN0 else t + TOTAL - PAN0


def ref_plate(t):
    """The plate the camera is working on: from the middle of the closing pan on, already the next one. The switch
    happens where the zoom is exactly Z_PAN and DELTA * Z_PAN = 672 px, a whole number of 4-px dither tiles."""
    return 1 if t % TOTAL >= PAN0 + PAN_LEN / 2 else 0


def elevation(t):
    t = t % TOTAL
    if in_pan(t):
        return E_TOP
    return (E_TOP + (E_RIDE - E_TOP) * S(t, 1.65, 3.0) + (E_CELL - E_RIDE) * S(t, 3.6, 5.6)
            + (E_TOP - E_CELL) * S(t, 10.3, 11.9))


def _smin(a, b, k=0.25):
    m = min(a, b)
    return m - k * math.log(math.exp(-(a - m) / k) + math.exp(-(b - m) / k))


def log_zoom(t):
    t = t % TOTAL
    if in_pan(t):
        w = _pan_u(t) / PAN_LEN
        return math.log(Z_HOLD) + (math.log(Z_PAN) - math.log(Z_HOLD)) * math.sin(math.pi * w) ** 2
    if t < PULL0:
        return _lz_pre(t)
    if t < PULL1:                                  # the pull-out: fast while we are among the cells, then a long,
        return _pchip(t)                           # gentle arrival on the whole dish and the bench around it
    return math.log(Z_PLATE) + math.log(1.06) * S(t, PULL1, 16.0)


def _lz_pre(t):
    """Zoom before the pull-out: the ride, the dive, then the colony kept about R_SCREEN wide as it grows."""
    dive = (math.log(Z_HOLD) + math.log(Z_RIDE / Z_HOLD) * S(t, 1.65, 3.0) + math.log(110 / Z_RIDE) * S(t, 3.6, 5.0)
            + math.log(130 / 110) * S(t, 4.85, 5.35) + math.log(Z_CELL / 130) * S(t, 5.15, 6.5)
            + math.log(1.05) * S(t, 6.5, 8.0))
    return _smin(dive, math.log(R_SCREEN / (a_um(g_smooth(t)) / 1000.0)))


PULL0, PULL1 = 9.9, 12.5                    # the pull-out; it is still settling onto the dish as the colonies pop


def _monotone_slopes(x, y, m0, m1):
    """Fritsch-Carlson slopes for a curve through (x, y) that never overshoots, with given end slopes."""
    d = np.diff(y) / np.diff(x)
    m = np.zeros(len(x))
    m[0], m[-1] = m0, m1
    for i in range(1, len(x) - 1):
        if d[i - 1] * d[i] <= 0:
            m[i] = 0.0
        else:
            w1, w2 = 2 * (x[i + 1] - x[i]) + (x[i] - x[i - 1]), (x[i + 1] - x[i]) + 2 * (x[i] - x[i - 1])
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    return m


_PK_T = np.array([PULL0, 10.5, 11.0, 11.5, PULL1])
_PK_V = np.array([_lz_pre(PULL0), math.log(924.0), math.log(48.0), math.log(6.5), math.log(Z_PLATE)])
_PK_M = _monotone_slopes(_PK_T, _PK_V, (_lz_pre(PULL0 + 1e-3) - _lz_pre(PULL0 - 1e-3)) / 2e-3, 0.0)


def _pchip(t):
    i = int(min(max(np.searchsorted(_PK_T, t) - 1, 0), len(_PK_T) - 2))
    return float(hermite(_PK_V[i], _PK_M[i], _PK_V[i + 1], _PK_M[i + 1], _PK_T[i], _PK_T[i + 1], t))


def zoom(t):
    return math.exp(log_zoom(t))


def _pan_cam(t):
    w = _pan_u(t) / PAN_LEN
    e = w * w * w * (w * (w * 6 - 15) + 10)
    base = 0 if t % TOTAL >= PAN0 else -1
    xc = base * DELTA + X_ARR * e
    yc = Y_ARR * e + 16.0 * math.sin(2 * math.pi * w) * math.sin(math.pi * w) ** 2
    return Cam(xc, yc, zoom(t), E_TOP)


def _ride_cam(t):
    """Over the landing point until the cotton touches down, then riding beside the tip as it streaks."""
    z, e = zoom(t), elevation(t)
    if t < SW0:
        return cam_from_anchor(X0, Y0, 0.0, TIP_SX, TIP_SY, z, e)
    x, y, _ = swab_tip(t)
    return cam_from_anchor(x, y, 0.0, TIP_SX, TIP_SY - 0.5 * y * math.sin(e) * z, z, e)


def _screen_of(cam_fn, pt_fn, t, h=1e-3):
    """Screen position of a moving world point under a moving camera, and its screen velocity."""
    def at(tt):
        return np.array(cam_fn(tt).px(*pt_fn(tt)), float)
    return at(t), (at(t + h) - at(t - h)) / (2 * h)


def _colony_z(t):
    """Half the dome height (mm): the camera looks at the middle of the pile once the cells stack up."""
    g = g_smooth(t)
    return 0.5 * dome_ratio(g) * a_um(g) / 1000.0 * S(g, 9.0, 11.0)


_CELL = lambda tt: (CELL_X, CELL_Y, 0.0)
_D_P0, _D_V0 = _screen_of(_ride_cam, _CELL, 3.6)


def _dive_cam(t):
    p = hermite(_D_P0, _D_V0, (W / 2, H / 2), (0.0, 0.0), 3.6, 5.0, t)
    return cam_from_anchor(CELL_X, CELL_Y, 0.0, p[0], p[1], zoom(t), elevation(t))


def _grow_cam(t):
    return cam_from_anchor(CELL_X, CELL_Y, _colony_z(t), W / 2, H / 2, zoom(t), elevation(t))


_P_END = (W / 2 + CELL_X * Z_PLATE, H / 2 - CELL_Y * Z_PLATE)


def _pull_cam(t):
    p = hermite((W / 2, H / 2), (0.0, 0.0), _P_END, (0.0, 0.0), PULL0, PULL1, t)
    return cam_from_anchor(CELL_X, CELL_Y, _colony_z(t), p[0], p[1], zoom(t), elevation(t))


def _hold_cam(t):
    return cam_from_anchor(0.0, 0.0, 0.0, W / 2, H / 2, zoom(t), elevation(t))


def camera(t):
    t = t % TOTAL
    if in_pan(t):
        return _pan_cam(t)
    if t < 3.6:
        return _ride_cam(t)
    if t < 6.5:
        return _dive_cam(t)
    if t < PULL0:
        return _grow_cam(t)
    if t < PULL1:
        return _pull_cam(t)
    return _hold_cam(t)


# ------------------------------------------------------------------ where the dither pattern is pinned
def _origin(cam, ax, ay):
    sx, sy = cam.px(ax, ay, 0.0)
    return int(round(float(sx))), int(round(float(sy)))


def _matched_switch(t0, t1, a, b):
    """First frame in [t0, t1] where pinning the dither to point a or to point b gives the same 4x4 phase, so
    changing the pin there changes nothing on screen."""
    for k in range(int(math.ceil(t0 * FPS)), int(t1 * FPS) + 1):
        cam = camera(k / FPS)
        oa, ob = _origin(cam, *a), _origin(cam, *b)
        if (oa[0] - ob[0]) % 4 == 0 and (oa[1] - ob[1]) % 4 == 0:
            return k / FPS
    return 0.5 * (t0 + t1)


DITHER_IN = _matched_switch(3.6, 4.4, (0.0, 0.0), (CELL_X, CELL_Y))       # from the dish to our cell
DITHER_OUT = _matched_switch(11.3, PULL1, (CELL_X, CELL_Y), (0.0, 0.0))   # and back to the dish


def dither_anchor(t):
    """The world point the Bayer pattern is pinned to, so dithered surfaces move with the world instead of
    crawling: our cell while the camera is down at cell size, otherwise the dish the camera is working on."""
    t = t % TOTAL
    if DITHER_IN <= t < DITHER_OUT:
        return CELL_X, CELL_Y
    return ref_plate(t) * DELTA, 0.0


# ------------------------------------------------------------------ on-screen helpers
def hud_on(t):
    return 5.0 <= t % TOTAL < 15.6


def bracket_on(t):
    t = t % TOTAL
    return LOCK - 0.33 <= t < DIV[0] + 0.4 or 10.95 <= t < 15.6
