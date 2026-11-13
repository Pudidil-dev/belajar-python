"""One timeline for picture and sound: the camera flight, the slow-motion clock, the breath and every hit.

120 BPM: a beat is 0.5 s, a bar 2 s, ten bars = the 20 s loop. The whole film is one camera move along the aerosol
path, written as a zoom level over time (zeta = ln z, z = canvas pixels per millimetre) plus a camera centre that is a
function of the zoom level, so the dive in (scene 1) and the flight back out (scene 3) pass through the same
connector and the same outlet rim.

Time dilation. The closer the camera, the slower the world runs: the mist clock `sigma` advances at r(z) seconds per
second (1 at the face, ~1/550 at the mesh holes), so the aerosol keeps a steady speed on screen at every zoom level and
the mesh holes, which pump one droplet per vibration cycle, can be watched in slow motion. The micro clock
`mu = sigma / R_LOCK` is in "close-up seconds": one droplet cycle per hole = 1.5 s of mu.
"""
import math
import numpy as np

FPS_REF = 30
BPM = 120.0
BEAT = 60.0 / BPM            # 0.5 s
BAR = 4 * BEAT               # 2.0 s
BARS = 10
TOTAL = BARS * BAR           # 20.0 s, the loop

# ---------------------------------------------------------------- key times (seconds)
HOLD_END = 0.8               # the opening hold ends, the reverse zoom starts
LAND = 3.0                   # the camera lands on one mesh hole as a droplet pinches off ("tik")
PULL = (3.5, 5.0)            # ease back to the whole mechanism
MECH = (5.0, 8.5)            # the mechanism holds: piezo + vibrating mesh
PUSH = (8.5, 9.75)           # push into three adjacent holes
LOCK = (9.75, 15.0)          # camera locked on the three holes
HERO = 15.0                  # one droplet pinches off and the camera follows it out
RETURN = (15.0, 19.6)        # pull back along the droplet to the patient
LABEL = (5.35, 8.35)         # the tiny "VIBRATING MESH" tag

# ---------------------------------------------------------------- scale (world units: millimetres)
Z0 = 2.0                     # opening close-up: patient, mask, nebulizer
C0 = (35.0, 6.0)
Z_HOLE = 3400.0              # one hole fills the frame
Z_MECH = 6.2                 # reservoir + piezo + mesh + outlet together
Z_MECH2 = 6.55               # slow drift during the mechanism hold
C_MECH = (-4.6, 6.5)
Z_THREE = 2200.0             # three adjacent holes
C_THREE = (0.016, 0.0)

PITCH = 0.070                # hole pitch on the mesh (mm)
CYCLE = 1.5                  # one droplet per hole every 1.5 s of close-up time (three holes -> one pop per beat)
STAGGER = 1.0 / 3.0          # each hole lags the one above by a third of a cycle (a wave travelling down the mesh)
PINCH = 0.70                 # cycle phase at which the neck breaks

ALPHA = 0.85                 # time dilation exponent: r(z) = (Z0 / z) ** ALPHA


def clamp01(u):
    return max(0.0, min(1.0, u))


def smooth(u):
    u = clamp01(u)
    return u * u * (3 - 2 * u)


def smoother(u):
    u = clamp01(u)
    return u * u * u * (u * (u * 6 - 15) + 10)


def lerp(a, b, u):
    return a + (b - a) * u


def u_of(t, span):
    return clamp01((t - span[0]) / (span[1] - span[0]))


# ---------------------------------------------------------------- monotone cubic interpolation (PCHIP)
class Pchip:
    def __init__(self, xs, ys):
        self.x = np.asarray(xs, float)
        self.y = np.asarray(ys, float)
        h = np.diff(self.x)
        d = np.diff(self.y) / h
        m = np.zeros_like(self.y)
        for i in range(1, len(self.x) - 1):
            if d[i - 1] * d[i] > 0:
                w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
                m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
        m[0], m[-1] = d[0], d[-1]
        if len(self.x) > 2:
            m[0] = ((2 * h[0] + h[1]) * d[0] - h[0] * d[1]) / (h[0] + h[1])
            if np.sign(m[0]) != np.sign(d[0]):
                m[0] = 0
            m[-1] = ((2 * h[-1] + h[-2]) * d[-1] - h[-1] * d[-2]) / (h[-1] + h[-2])
            if np.sign(m[-1]) != np.sign(d[-1]):
                m[-1] = 0
        self.m = m

    def __call__(self, x):
        x = float(np.clip(x, self.x[0], self.x[-1]))
        i = int(np.clip(np.searchsorted(self.x, x) - 1, 0, len(self.x) - 2))
        h = self.x[i + 1] - self.x[i]
        s = (x - self.x[i]) / h
        h00, h10 = 2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s
        h01, h11 = -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2
        return h00 * self.y[i] + h10 * h * self.m[i] + h01 * self.y[i + 1] + h11 * h * self.m[i + 1]


def _path(keys):
    """keys: [(z, cx, cy), ...] -> centre as a function of zeta (ln z)."""
    keys = sorted(keys)
    zs = [math.log(k[0]) for k in keys]
    return Pchip(zs, [k[1] for k in keys]), Pchip(zs, [k[2] for k in keys])


# the dive in (scene 1): face -> mask -> connector -> outlet rim -> outlet -> mesh -> one hole
DIVE = _path([(Z0, C0[0], C0[1]), (3.0, 29.0, 3.2), (5.5, 23.0, 1.0), (11.0, 16.0, 0.1), (26.0, 7.8, 0.0),
              (60.0, 1.65, 0.0), (300.0, 0.11, 0.0), (1200.0, 0.034, 0.0), (Z_HOLE, 0.030, 0.0)])
# ease back from the hole to the mechanism (scene 2)
BACK = _path([(Z_MECH, C_MECH[0], C_MECH[1]), (14.0, -2.6, 6.0), (40.0, -0.8, 2.0), (150.0, -0.05, 0.3),
              (800.0, 0.03, 0.0), (Z_HOLE, 0.030, 0.0)])
# push from the mechanism to three holes (scene 2)
INTO = _path([(Z_MECH2, C_MECH[0], C_MECH[1]), (14.0, -2.3, 5.0), (40.0, -0.6, 1.4), (150.0, -0.02, 0.15),
              (600.0, 0.012, 0.0), (Z_THREE, C_THREE[0], C_THREE[1])])
# the hero droplet's flight out (scene 3): hole exit -> spray -> outlet -> connector -> mask -> into the mouth
HERO_PATH = _path([(Z_THREE, 0.0387, 0.0), (1400.0, 0.068, 0.0), (800.0, 0.11, 0.001), (200.0, 0.42, 0.012),
                   (60.0, 2.1, 0.10),
                   (20.0, 7.2, 0.30), (8.0, 16.5, 0.55), (5.0, 26.0, 1.4), (3.2, 37.0, 4.2), (2.4, 45.0, 6.8),
                   (Z0, 50.6, 8.4)])
MOUTH = (50.6, 8.4)


def _seg(t, t0, t1, z0, z1, shape):
    u = clamp01((t - t0) / (t1 - t0))
    return lerp(math.log(z0), math.log(z1), shape(u))


# the reverse zoom is keyed by hand: gentle out of the hold, steady through the connector and the rim (so the rim
# reads), fastest through the mist, then a long braking tail at ~1x slow motion while the droplet tip forms
_DIVE_T = Pchip([HOLD_END, 0.86, 1.0, 1.25, 1.5, 1.72, 1.92, 2.12, 2.32, 2.55, 2.8, 2.94, LAND],
                [math.log(v) for v in (Z0, 2.03, 2.3, 3.7, 7.4, 16.0, 38.0, 125.0, 470.0, 1480.0, 2880.0, 3330.0,
                                       Z_HOLE)])


def _pull_shape(u):
    return smoother(u ** 0.62)


def _ret_shape(u):
    return smoother(u ** 1.08)


def zeta(t):
    """ln of the zoom (canvas px per mm) at time t (t is wrapped into the loop)."""
    t = t % TOTAL
    if t < HOLD_END:
        return math.log(Z0)
    if t < LAND:
        return float(_DIVE_T(t))
    if t < PULL[0]:
        return math.log(Z_HOLE)
    if t < PULL[1]:
        return _seg(t, PULL[0], PULL[1], Z_HOLE, Z_MECH, _pull_shape)
    if t < MECH[1]:
        return _seg(t, MECH[0], MECH[1], Z_MECH, Z_MECH2, smooth)
    if t < PUSH[1]:
        return _seg(t, PUSH[0], PUSH[1], Z_MECH2, Z_THREE, smoother)
    if t < LOCK[1]:
        return math.log(Z_THREE)
    if t < RETURN[1]:
        return _seg(t, RETURN[0], RETURN[1], Z_THREE, Z0, _ret_shape)
    return math.log(Z0)


def zoom(t):
    return math.exp(zeta(t))


def hero_pos(t):
    """World position of the hero droplet during scene 3 (None outside it).

    It leaves the hole exactly like its siblings (the micro droplet kinematics on the slow-motion clock), then hands
    over to the flight path that carries it through the spray, the outlet and the mask into the mouth."""
    t = t % TOTAL
    if t < HERO or t > RETURN[1] + 0.25:
        return None
    if t > RETURN[1]:
        return MOUTH
    from . import micro
    zt = zeta(t)
    a = mu(t) - mu(HERO)
    mx = float(micro.D.dome_x(0.0)) + micro.HT + micro.HEAD_AT_PINCH + float(micro.xdrift(a))
    w = smoother((t - (HERO + 0.55)) / 0.8)
    return lerp(mx, HERO_PATH[0](zt), w), lerp(0.0, HERO_PATH[1](zt), w)


def camera(t):
    """(cx, cy, z): camera centre in world mm and zoom in canvas px per mm."""
    t = t % TOTAL
    zt = zeta(t)
    z = math.exp(zt)
    if t < HOLD_END or t >= RETURN[1]:
        return C0[0], C0[1], z
    if t < PULL[0]:
        return DIVE[0](zt), DIVE[1](zt), z
    if t < MECH[0]:
        return BACK[0](zt), BACK[1](zt), z
    if t < PUSH[0]:
        return C_MECH[0], C_MECH[1], z
    if t < LOCK[1]:
        return INTO[0](zt), INTO[1](zt), z
    # scene 3: follow the droplet (it rides a little left of centre), blend into the dive path near the patient
    hx, hy = hero_pos(t)
    lead = 10.0 / z
    w = smoother((math.log(7.0) - zt) / (math.log(7.0) - math.log(Z0)))
    w0 = smoother((math.log(Z_THREE) - zt) / 0.9)      # ease the follow in over the first moment
    fx, fy = lerp(C_THREE[0], hx + lead, w0), lerp(C_THREE[1], hy, w0)
    return lerp(fx, DIVE[0](zt), w), lerp(fy, DIVE[1](zt), w), z


# ---------------------------------------------------------------- the slow-motion clocks
R_LOCK = (Z0 / Z_THREE) ** ALPHA


def rate(z):
    return min(1.0, max(R_LOCK, (Z0 / z) ** ALPHA))


_DT = 1.0 / 1200.0
_TS = np.arange(0.0, TOTAL + _DT / 2, _DT)
_R = np.array([rate(zoom(x)) for x in _TS[:-1]] + [rate(Z0)])


def _integrate(r):
    return np.concatenate([[0.0], np.cumsum(0.5 * (r[1:] + r[:-1]) * _DT)])


_SIG = _integrate(_R)


def _sig_at(x):
    return float(np.interp(x, _TS, _SIG))


# Scale the excess rate between the landing and the lock so that the centre hole pinches again exactly on the beat
# at 10.5 s (and then every 1.5 s: 12.0, 13.5, 15.0). The correction is a fraction of a percent.
_ia, _ib = int(round(PULL[0] / _DT)), int(round(LOCK[0] / _DT))
_i3, _i105 = int(round(LAND / _DT)), int(round(10.5 / _DT))


def _rates(kappa):
    r = _R.copy()
    r[_ia:_ib] = R_LOCK + (_R[_ia:_ib] - R_LOCK) * kappa
    return r


def _span(kappa):
    s = _integrate(_rates(kappa))
    return (s[_i105] - s[_i3]) / R_LOCK          # close-up seconds between the two pinches


_n = max(1, round(_span(1.0) / CYCLE))
_KAPPA, _k0 = 1.0, 0.98
for _ in range(30):                                # secant solve: span(kappa) = n * CYCLE
    f1, f0 = _span(_KAPPA) - _n * CYCLE, _span(_k0) - _n * CYCLE
    if abs(f1) < 1e-7 or f1 == f0:
        break
    _KAPPA, _k0 = _KAPPA - f1 * (_KAPPA - _k0) / (f1 - f0), _KAPPA
_R2 = _rates(_KAPPA)
SIG = _integrate(_R2)
SIGMA_TOTAL = float(SIG[-1])


def sigma(t):
    """Mist clock (seconds of 'real' aerosol time at the face, slowed down with the zoom). Wraps with the loop."""
    t = t % TOTAL
    return float(np.interp(t, _TS, SIG))


def mu(t):
    """Micro clock in close-up seconds (one droplet cycle per hole = CYCLE)."""
    return sigma(t) / R_LOCK


def mu_rate(t):
    """d mu / dt: how many close-up seconds pass per real second right now (1 when locked on the holes)."""
    t = t % TOTAL
    return float(np.interp(t, _TS, _R2)) / R_LOCK


PHASE0 = (PINCH - mu(LAND) / CYCLE) % 1.0


def hole_phase(k, t):
    """Cycle phase (0..1) of mesh hole k (k = 0 is the hole the camera lands on; +1 is the one below)."""
    return (mu(t) / CYCLE - k * STAGGER + PHASE0) % 1.0


def pinch_times(k, t0, t1):
    """Times in [t0, t1] at which hole k's droplet pinches off (only meaningful where mu runs at ~1x)."""
    out = []
    ts = np.arange(t0, t1 + 1e-9, 1.0 / 600.0)
    ph = np.array([hole_phase(k, x) for x in ts])
    rel = (ph - PINCH) % 1.0
    for i in range(1, len(ts)):
        if rel[i] < rel[i - 1] - 0.5:            # wrapped past the pinch phase
            a, b = rel[i - 1] - 1.0, rel[i]
            out.append(ts[i - 1] + (ts[i] - ts[i - 1]) * (-a) / (b - a))
    return out


# ---------------------------------------------------------------- the breath (4 s cycle, mid-inhale on 0 s)
BREATH = 4.0
INHALE = 0.4                  # fraction of the cycle spent breathing in


def breath_phase(t):
    return ((t + INHALE * BREATH / 2) / BREATH) % 1.0


def inhale(t):
    b = breath_phase(t)
    return math.sin(math.pi * b / INHALE) if b < INHALE else 0.0


def exhale(t):
    b = breath_phase(t)
    return math.sin(math.pi * (b - INHALE) / (1 - INHALE)) if b >= INHALE else 0.0


def chest(t):
    """0 = fully out, 1 = fully in (smooth)."""
    b = breath_phase(t)
    if b < INHALE:
        return 0.5 - 0.5 * math.cos(math.pi * b / INHALE)
    return 0.5 + 0.5 * math.cos(math.pi * (b - INHALE) / (1 - INHALE))


def blink(t):
    """Eyelid closure 0..1 (one blink while the patient is back in frame)."""
    t = t % TOTAL
    c = 18.55
    return max(0.0, 1.0 - abs(t - c) / 0.085) if abs(t - c) < 0.085 else 0.0


# ---------------------------------------------------------------- the outlet-rim portal
PORTAL_Z = (7.0, 26.0)        # zoom range over which the rim opens into the cutaway


def portal(t):
    """0 = outside (exterior), 1 = inside (cutaway everywhere); in between, the rim is opening around the camera.
    Scene 2 stays inside the device the whole time (the camera never leaves through the rim there)."""
    t = t % TOTAL
    if LAND - 0.05 <= t < HERO:
        return 1.0
    z = zoom(t)
    u = (math.log(z) - math.log(PORTAL_Z[0])) / (math.log(PORTAL_Z[1]) - math.log(PORTAL_Z[0]))
    return clamp01(u)


def cut_visible(t):
    return zoom(t) > PORTAL_Z[0] * 0.55


def ext_visible(t):
    return portal(t) < 1.0


# ---------------------------------------------------------------- events for the soundtrack
def events():
    ev = {'tik': LAND, 'hero': HERO}
    pops = []
    for k in (-1, 0, 1):
        for x in pinch_times(k, LOCK[0], HERO + 0.01):
            pops.append((round(x * 8) / 8, k))        # on the 8th-note grid (they already are, to < 1 ms)
    ev['pops'] = sorted(set(pops))
    return ev


def rim_cross_times():
    """When the portal is half open on the way in and on the way out (for the 'through the rim' sound)."""
    ts = np.arange(0, TOTAL, 1 / 300.0)
    p = np.array([portal(x) for x in ts])
    out = []
    for i in range(1, len(ts)):
        if (p[i - 1] - 0.5) * (p[i] - 0.5) < 0:
            out.append(ts[i])
    return out
