"""Clocks, layout and the one continuous camera of the 20-second loop (120 BPM: one bar = 2 s, ten bars).

World units are millimetres. Plates stand in a row along x, one every DELTA mm; plate n's agar surface is the plane
z = 0 around (n*DELTA, 0). Every plate runs the same story on its own clock tau_n = t - n*TOTAL: plate 0 is streaked
at t = -1.2..2, grows overnight, and at t = 17 the swab picks our colony from it and streaks plate 1, whose tau runs
20 s behind. At t = 20 plate 1 is exactly where plate 0 was at t = 0 and the camera is exactly DELTA further along,
so the last frame flows straight into the first: a loop with no cut.

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
DELTA = 100.0                   # one plate every 100 mm along x
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


SW0, SW1 = -1.2, 2.0            # the cotton touches the agar for tau in [SW0, SW1]
V_SW = S_TOT / (SW1 - SW0)      # streak speed, mm/s


def p_of_tau(tau):
    return (tau - SW0) / (SW1 - SW0)


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
DIV = np.array([6.0, 7.0, 7.5, 8.0, 8.25, 8.5, 8.75, 9.0]
               + [9.0 + 0.125 * k for k in range(1, 9)]
               + [10.0 + 0.0625 * k for k in range(1, 15)])
NGEN = len(DIV)                                     # 30 doublings: 2**30 = 1,073,741,824 cells
CYC0 = 4.0                                          # the first cell starts to grow at 4.0
STARTS = np.concatenate([[CYC0], DIV[:-1]])
OVERNIGHT = float(DIV[-1])                          # 10.875: the clock stops (about 10 h at 37 C)


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
def _tau_plate(t):
    """Which plate the swab is streaking at time t (or None) and that plate's clock."""
    t = t % TOTAL
    if t <= SW1 + 1.0:
        return 0, t
    if t >= TOTAL + SW0:
        return 1, t - TOTAL
    return None, None


def _streak_tip(n, tau):
    """Tip on plate n during the streak and the lift-off after it."""
    if tau <= SW1:
        x, y = path_xy(p_of_tau(tau))
        return n * DELTA + x, y, 0.0
    u = tau - SW1                                       # lifting away, still drifting along
    tx, ty = path_tan(1.0)
    d = V_SW * u * (1 - 0.35 * u / 0.9)
    x, y = path_xy(1.0)
    return n * DELTA + x + tx * d, y + ty * d, 34.0 * (u / 0.9) ** 2


_T0X, _T0Y = path_tan(0.0)
_P0 = path_xy(0.0)
_APP = ((CELL_X + 40.0, CELL_Y + 40.0, 46.0), (-34.0, -30.0, -34.0))
_TRV = [(17.2, (CELL_X, CELL_Y, 0.0), (10.0, 0.0, 50.0)),
        (18.0, (CELL_X + 0.55 * (DELTA + _P0[0] - CELL_X), 0.4 * CELL_Y, 16.0), (56.0, -3.0, -6.0)),
        (18.8, (DELTA + _P0[0], _P0[1], 0.0), (V_SW * _T0X, V_SW * _T0Y, 0.0))]
TOUCH = 17.0                                            # the swab touches our colony
LAND = TOTAL + SW0                                      # 18.8: it lands on the fresh plate


def swab_tip(t):
    """Bottom of the cotton tip (x, y, z) in world mm, or None when the swab is off the set."""
    t = t % TOTAL
    n, tau = _tau_plate(t)
    if n is not None and tau <= SW1 + 0.9:
        return _streak_tip(n, tau)
    if 15.8 <= t < TOUCH:
        return tuple(hermite(_APP[0], _APP[1], (CELL_X, CELL_Y, 0.0), (0.0, 0.0, -6.0), 15.8, TOUCH, t))
    if TOUCH <= t < 17.2:
        return CELL_X, CELL_Y, -0.35 * math.sin(math.pi * (t - TOUCH) / 0.2)
    if 17.2 <= t < LAND:
        (ta, pa, va), (tb, pb, vb) = (_TRV[0], _TRV[1]) if t < _TRV[1][0] else (_TRV[1], _TRV[2])
        return tuple(hermite(pa, va, pb, vb, ta, tb, t))
    return None


def swab_vel(t, h=1e-3):
    a, b = swab_tip(t - h), swab_tip(t + h)
    if a is None or b is None:
        return 0.0, 0.0, 0.0
    return tuple((np.asarray(b) - np.asarray(a)) / (2 * h))


def swab_axis(t):
    """Unit vector up the stick: tilted 20 deg back (square to the opening camera), leaning into the motion."""
    vx = swab_vel(t)[0]
    lean = 0.05 * max(-1.5, min(1.5, vx / V_SW))
    a = np.array([lean, math.sin(math.radians(20)), math.cos(math.radians(20))])
    return a / np.linalg.norm(a)


def swab_squash(t):
    t = t % TOTAL
    if TOUCH <= t < 17.2:
        return math.sin(math.pi * (t - TOUCH) / 0.2)
    n, tau = _tau_plate(t)
    if n is not None and SW0 <= tau <= SW1:
        b = max(0.0, 1 - abs(tau - (SW0 + 0.1)) / 0.18)
        return 0.25 + 0.45 * b
    return 0.0


def swab_cream(t):
    """How much of our colony sits on the cotton: picked up at 17.0, spread out over the first part of the streak."""
    t = t % TOTAL
    if TOUCH <= t < LAND:
        return S(t, TOUCH, TOUCH + 0.15)
    n, tau = _tau_plate(t)
    if n is not None and tau < -0.35:
        return 1 - S(tau, SW0, -0.35)
    return 0.0


# glints: bright specks drop off the fibres onto the gel and blink out (tau-based, so they cross the loop point)
def _glints():
    rng = np.random.default_rng(5)
    out, tau = [], SW0 + 0.04
    while tau < SW1 - 0.05:
        out.append((tau, rng.uniform(-1.4, 1.4), rng.uniform(-0.8, 0.8), rng.uniform(0.8, 2.6), rng.random()))
        tau += rng.uniform(0.07, 0.15)
    return np.array(out)


GLINTS = _glints()                  # columns: tau spawn, side offset, along offset, start height, size
GLINT_FALL, GLINT_SIT = 0.1, 0.36   # fall onto the gel, sit, then blink out (sparkle frame)


def glint_end(i):
    return GLINTS[i, 0] + GLINT_FALL + GLINT_SIT


# ------------------------------------------------------------------ the camera
E_HOOK, E_CELL, E_TOP, E_APP = (math.radians(a) for a in (20.0, 62.0, 90.0, 74.0))
Z_HOOK, Z_CELL, Z_PLATE, Z_APP = 9.0, 36000.0, 2.9, 3.6
TIP_SX, TIP_SY = 110.0, 270.0       # where the tip rides on screen in the opening (lead room to the right)
R_SCREEN = 80.0                     # colony radius on screen while it grows
LOCK = 2.95                         # the target bracket locks onto our cell


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


def elevation(t):
    t = t % TOTAL
    return (E_HOOK + (E_CELL - E_HOOK) * S(t, 1.6, 3.8) + (E_TOP - E_CELL) * S(t, 10.5, 12.0)
            + (E_APP - E_TOP) * S(t, 16.0, 17.4) + (E_HOOK - E_APP) * S(t, 17.4, 19.3))


def _smin(a, b, k=0.25):
    m = min(a, b)
    return m - k * math.log(math.exp(-(a - m) / k) + math.exp(-(b - m) / k))


def log_zoom(t):
    t = t % TOTAL
    if t < 12.0:
        dive = (math.log(Z_HOOK) + math.log(110 / Z_HOOK) * S(t, 1.2, 2.8) + math.log(130 / 110) * S(t, 2.65, 3.15)
                + math.log(Z_CELL / 130) * S(t, 2.95, 4.45) + math.log(1.05) * S(t, 4.45, 6.2))
        grow = math.log(R_SCREEN / (a_um(g_smooth(t)) / 1000.0))
        pre = _smin(dive, grow)
        w = S(t, 10.25, 12.0)
        return (1 - w) * pre + w * math.log(Z_PLATE)
    return (math.log(Z_PLATE) + math.log(1.06) * S(t, 12.0, 16.0)
            + math.log(Z_APP / (Z_PLATE * 1.06)) * S(t, 16.0, 17.4) + math.log(Z_HOOK / Z_APP) * S(t, 17.4, 19.3))


def zoom(t):
    return math.exp(log_zoom(t))


def _hook_cam(t):
    """Riding beside the cotton tip while it streaks (plate 0 for t in 0..2, plate 1 just before the loop)."""
    n, tau = _tau_plate(t)
    x, y, _ = _streak_tip(n, tau)
    z, e = zoom(t), elevation(t)
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
_D_P0, _D_V0 = _screen_of(_hook_cam, _CELL, 1.2)


def _cam_dive(t):
    p = hermite(_D_P0, _D_V0, (W / 2, H / 2), (0.0, 0.0), 1.2, 2.7, t)
    return cam_from_anchor(CELL_X, CELL_Y, 0.0, p[0], p[1], zoom(t), elevation(t))


def _cam_grow(t):
    return cam_from_anchor(CELL_X, CELL_Y, _colony_z(t), W / 2, H / 2, zoom(t), elevation(t))


_P_END = (W / 2 + CELL_X * Z_PLATE, H / 2 - CELL_Y * Z_PLATE)


def _cam_pull(t):
    p = hermite((W / 2, H / 2), (0.0, 0.0), _P_END, (0.0, 0.0), 10.4, 12.0, t)
    return cam_from_anchor(CELL_X, CELL_Y, _colony_z(t), p[0], p[1], zoom(t), elevation(t))


def _cam_hold(t):
    return cam_from_anchor(0.0, 0.0, 0.0, W / 2, H / 2, zoom(t), elevation(t))


_A_P0, _A_V0 = _screen_of(_cam_hold, lambda tt: (CELL_X, CELL_Y, _colony_z(tt)), 16.0)
_A_P1 = (150.0, 272.0)


def _cam_approach(t):
    p = hermite(_A_P0, _A_V0, _A_P1, (0.0, 0.0), 16.0, 17.4, t)
    return cam_from_anchor(CELL_X, CELL_Y, _colony_z(t), p[0], p[1], zoom(t), elevation(t))


def _tip_ground(t):
    x, y, _ = swab_tip(t)
    return x, y, 0.0


_F_P0, _F_V0 = _screen_of(_cam_approach, _tip_ground, 17.4)
_F_P1, _F_V1 = _screen_of(_hook_cam, _tip_ground, 19.3)


def _cam_follow(t):
    p = hermite(_F_P0, _F_V0, _F_P1, _F_V1, 17.4, 19.3, t)
    x, y, _ = _tip_ground(t)
    return cam_from_anchor(x, y, 0.0, p[0], p[1], zoom(t), elevation(t))


def camera(t):
    t = t % TOTAL
    if t < 1.2 or t >= 19.3:
        return _hook_cam(t)
    if t < 4.45:
        return _cam_dive(t)
    if t < 10.4:
        return _cam_grow(t)
    if t < 12.0:
        return _cam_pull(t)
    if t < 16.0:
        return _cam_hold(t)
    if t < 17.4:
        return _cam_approach(t)
    return _cam_follow(t)


# ------------------------------------------------------------------ on-screen helpers
def hud_on(t):
    return 3.0 <= t % TOTAL < 15.6


def bracket_on(t):
    t = t % TOTAL
    return 2.62 <= t < 6.4 or 10.9 <= t < TOUCH + 0.06
