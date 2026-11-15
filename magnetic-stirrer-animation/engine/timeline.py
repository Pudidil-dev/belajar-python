"""The clock of the film: the 120 BPM grid, every event time, and the physics of stirring.

Precomputed once from fixed seeds (the same frame always renders the same):
  * the motor and the magnet under the plate, the stir bar that follows it through the glass (a magnetic torque
    pulls the bar toward the magnet's angle, the liquid's drag holds it back, so it lags, wobbles once, then locks);
  * the swirl of the liquid that the spinning bar drives, and the vortex dip at the surface;
  * the liquid level (cloudy pour, vinegar pour) and the cloudiness, which only falls once vinegar reacts;
  * the suspended chalk particles (they ride the swirl and shrink away as they react) and the CO2 bubbles, which
    start on particles, ride the swirl, rise and pop at the surface.
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM
BAR = 4 * BEAT
TOTAL = 24.0

# ---------------------------------------------------------------- events (seconds)
SLIDE0 = -0.45                      # the bar started sliding just before frame 0: it is already moving on frame 0
FLOOR_HIT = 0.58                    # its lower end reaches the bottom ("tk"), the top end still on the wall
SETTLE = FLOOR_HIT
GLINT = 0.76                        # a highlight catches it as it tips, just before it lies flat
FLAT = 0.86                         # flat on the glass ("tok"), near the wall
LAND = 1.00                         # the hidden magnet has pulled it to the middle: "tik"
FLASK = (1.05, 1.40, 2.75, 3.20)    # enter upright, tilted and pouring, stop pouring, gone
POUR1 = (1.42, 2.75)
KNOB = 4.00                         # the knob turns: "click", the power light comes on
WIPE_IN = (4.25, 4.75)              # horizontal pixel (scanner) wipe into the side cutaway
MOTOR = 4.75                        # the motor starts once the cutaway is open
WIPE_OUT = (10.00, 10.45)           # wipe back to the outside view
BOTTLE = (10.25, 10.60, 11.45, 11.95)
POUR2 = (10.62, 11.45)
FIZZ = 11.60                        # the first CO2 bubbles
PUSH = (11.60, 14.60)               # gentle push in on the bubbles
FF = (14.90, 15.20)                 # "fast-forward" glitch into the time-lapse
CLEAR = (15.00, 20.80)              # time-lapse: the cloudiness fades
PULL = (15.00, 21.00)               # slow pull back to the full beaker
CHIME = 21.00                       # the bar is back in clear view: two-note chime
HOLD = 23.00                        # the last second on the full beaker

# ---------------------------------------------------------------- geometry (mm; h up from the bench, z toward us)
K = 0.30                            # slight top-down view: a circle of radius r shows as an ellipse r x K*r
BODY_W, BODY_D, BODY_H = 56.0, 56.0, 36.0     # stirrer housing half width / half depth / height
PLATE = 48.0                        # top plate half size
PLATE_T = 3.0                       # plate thickness (36 -> 39)
GLASS_B = 39.0                      # beaker outer bottom (on the plate)
FLOOR = 42.0                        # inside bottom of the beaker (3 mm glass)
R_IN, R_OUT = 30.0, 32.0            # beaker radii
RIM = 121.0                         # beaker rim height
BAR_L, BAR_R = 28.0, 4.0            # stir bar length and radius (a capsule)
BAR_H = FLOOR + BAR_R               # its axis height when lying flat
MAG_L, MAG_H0, MAG_H1 = 20.0, 28.0, 33.0      # magnet half length, bottom, top (3 mm below the plate)
LEVEL1, LEVEL2 = 46.0, 60.0         # liquid depth after the suspension, after the vinegar

SIM = 1200                          # physics steps per second
W_MAX = 2 * math.pi * 2.0           # 2 turns per second (drawn speed: readable at 30 fps)


def clamp01(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def smoother(x):
    x = clamp01(x)
    return x * x * x * (x * (6 * x - 15) + 10)


def ease_out(x):
    x = clamp01(x)
    return 1 - (1 - x) ** 2


def keys(t, ks):
    """Piecewise smooth interpolation through (time, value) keys."""
    if t <= ks[0][0]:
        return ks[0][1]
    for (a, va), (b, vb) in zip(ks[:-1], ks[1:]):
        if t <= b:
            return va + (vb - va) * smooth((t - a) / max(b - a, 1e-9))
    return ks[-1][1]


# ---------------------------------------------------------------- stirring physics
def _simulate():
    n = int(TOTAL * SIM) + 4
    ts = np.arange(n) / SIM
    u = np.clip((ts - MOTOR) / 0.55, 0, 1)
    wm = W_MAX * u * u * (3 - 2 * u)                      # the motor spins up in about half a second
    phim = np.cumsum(wm) / SIM                            # magnet angle (starts aligned with the bar)
    th = np.zeros(n)
    wb = np.zeros(n)
    wl = np.zeros(n)
    k_mag, drag, stick = 650.0, 8.0, 0.30                 # torque, liquid drag, static grip of the glass
    t_on, w, a, free, lq = 0.0, 0.0, 0.0, False, 0.0
    t_free = None
    for i in range(1, n):
        t = ts[i]
        lag = phim[i] - a
        tq = k_mag * math.sin(lag)
        if t >= LAND:
            if not free and abs(math.sin(lag)) > stick:   # it sits still until the pull beats the grip, then snaps
                free = True
                t_free = t
            if free:
                w += (tq - drag * w) / SIM
                a += w / SIM
        th[i], wb[i] = a, w
        target = 0.42 * w
        pour = 0.0
        if POUR1[0] <= t < POUR1[1] + 0.6:                # the pour stream stirs a little on its own
            pour = 2.2 * math.sin(math.pi * clamp01((t - POUR1[0]) / (POUR1[1] + 0.6 - POUR1[0])))
        if POUR2[0] <= t < POUR2[1] + 0.4:
            pour += 1.2 * math.sin(math.pi * clamp01((t - POUR2[0]) / (POUR2[1] + 0.4 - POUR2[0])))
        lq += ((target + pour) - lq) / (0.75 * SIM)
        wl[i] = lq
    phil = np.cumsum(wl) / SIM
    return ts, phim, th, wb, wl, phil, wm, t_free


_TS, _PHIM, _TH, _WB, _WL, _PHIL, _WM, SNAP = _simulate()      # SNAP: the bar breaks its grip and starts to turn


def _at(arr, t):
    x = min(max(t, 0.0), TOTAL) * SIM
    i = int(x)
    f = x - i
    return float(arr[i] * (1 - f) + arr[i + 1] * f)


def magnet_angle(t):
    return _at(_PHIM, t)


def motor_speed(t):
    return _at(_WM, t) / W_MAX


def bar_angle(t):
    return _at(_TH, t)


def bar_speed(t):
    return _at(_WB, t)


def swirl_angle(t):
    return _at(_PHIL, t)


def swirl_speed(t):
    return _at(_WL, t)


def lock_time():
    """When the bar has caught the magnet for good (speed within 4 % from then on)."""
    i0 = int(MOTOR * SIM)
    ok = np.abs(_WB - _WM) <= 0.04 * W_MAX
    bad = np.nonzero(~ok[i0:int(9 * SIM)])[0]
    return (i0 + (bad[-1] + 1 if len(bad) else 0)) / SIM


LOCK = round(lock_time() * 8) / 8          # the bar has caught the magnet (sparkle + sound)

# ---------------------------------------------------------------- the time-lapse: a fast-forward clock
TL_UP = (14.90, 15.45)              # speeding up
TL_DOWN = (20.15, 20.80)            # slowing back to real time just before the bar is clear
TL_RATE = 6.0                       # how much faster the reaction world runs at full fast-forward


def warp_rate(t):
    if t < TL_UP[0] or t >= TL_DOWN[1]:
        return 1.0
    if t < TL_UP[1]:
        return 1 + (TL_RATE - 1) * smooth((t - TL_UP[0]) / (TL_UP[1] - TL_UP[0]))
    if t < TL_DOWN[0]:
        return TL_RATE
    return 1 + (TL_RATE - 1) * (1 - smooth((t - TL_DOWN[0]) / (TL_DOWN[1] - TL_DOWN[0])))


_TAU = np.cumsum(np.array([warp_rate(x) for x in _TS])) / SIM


def tau(t):
    """Fast-forward clock: equals t, except that it runs up to 6x faster during the time-lapse."""
    return _at(_TAU, t)


def tau_inv(x):
    return float(np.interp(x, _TAU, _TS))


def _extrap(arr, speed, x):
    if x <= TOTAL:
        return _at(arr, x)
    return _at(arr, TOTAL) + speed * (x - TOTAL)


def bar_angle_w(t):
    """The bar's angle on the fast-forward clock (it spins faster during the time-lapse)."""
    return _extrap(_TH, W_MAX, tau(t))


def swirl_angle_w(t):
    return _extrap(_PHIL, float(_WL[-2]), tau(t))


def vortex(t):
    """Depth of the dip in the middle of the surface (mm)."""
    return 3.2 * min(1.0, (swirl_speed(t) / (0.42 * W_MAX)) ** 2)


# ---------------------------------------------------------------- the liquid
def level(t):
    """Liquid depth above the inside bottom (mm)."""
    if t < POUR1[0] + 0.07:
        return 0.0
    if t < POUR2[0] + 0.05:
        return LEVEL1 * ease_out((t - POUR1[0] - 0.07) / (POUR1[1] - POUR1[0] - 0.07))
    return LEVEL1 + (LEVEL2 - LEVEL1) * ease_out((t - POUR2[0] - 0.05) / (POUR2[1] - POUR2[0] - 0.05))


def turbidity(t):
    """How cloudy the liquid is (1 = the suspension, 0 = clear). Stirring alone never changes it; only the reaction
    with vinegar does, slowly at first, then fast in the time-lapse."""
    if t < POUR2[0]:
        return 1.0
    if t < FIZZ:
        return 1.0 - 0.06 * smooth((t - POUR2[0]) / (FIZZ - POUR2[0]))
    if t < CLEAR[0]:
        return 0.94 - 0.10 * (t - FIZZ) / (CLEAR[0] - FIZZ)
    u = clamp01((t - CLEAR[0]) / (CLEAR[1] - CLEAR[0]))
    return max(0.0, 0.84 * (1 - smoother(u ** 1.4)))  # the bar comes back in the last seconds before the chime


def bubble_rate(t):
    """CO2 bubbles per second in the beaker: a burst when the vinegar arrives, then fewer as the chalk runs out."""
    if t < FIZZ:
        return 0.0
    if t < FIZZ + 0.15:
        return 120.0 * (t - FIZZ) / 0.15
    if t < 13.0:
        return 120.0 - 65.0 * smooth((t - FIZZ - 0.15) / (13.0 - FIZZ - 0.15))
    if t < CLEAR[0]:
        return 55.0
    r = 55.0 * max(0.0, turbidity(t) / 0.84) ** 1.3
    if t > CLEAR[1]:
        r = max(r, 1.6 * (1 - smooth((t - CLEAR[1]) / 1.6)))
    return r


# ---------------------------------------------------------------- particles and bubbles
_rng = np.random.default_rng(1729)
N_P = 900
P_R = np.sqrt(_rng.uniform(0, 1, N_P)) * (R_IN - 1.2)
P_PHI = _rng.uniform(0, 2 * math.pi, N_P)
P_HF = _rng.uniform(0.04, 0.97, N_P)
P_SHADE = _rng.integers(0, 3, N_P)
P_BIG = _rng.uniform(0, 1, N_P) < 0.22
P_BOB = _rng.uniform(0, 2 * math.pi, N_P)
_u = _rng.uniform(0, 1, N_P)
P_GONE = np.where(_rng.uniform(0, 1, N_P) < 0.08, FIZZ + 0.4 + 3.0 * _u, CLEAR[0] + 0.2 + 5.4 * _u ** 0.85)


def particles(t):
    """Arrays (x, h, z, size 0..1, shade) of the particles still in suspension at t."""
    L = level(t)
    if L <= 0.5:
        return None
    alive = t < P_GONE
    if not alive.any():
        return None
    r, hf = P_R[alive], P_HF[alive]
    phi = P_PHI[alive] + swirl_angle_w(t) * (0.8 + 0.35 * (1 - r / R_IN))
    x, z = r * np.cos(phi), r * np.sin(phi)
    h = FLOOR + 0.6 + hf * (L - 1.2) + 0.5 * np.sin(tau(t) * 2.3 + P_BOB[alive])
    size = np.clip((P_GONE[alive] - t) / 1.4, 0, 1)
    return x, h, z, size, P_SHADE[alive], P_BIG[alive]


def bubble_rate_seen(t):
    """Bubbles per real second on screen: the reaction rate times the fast-forward (capped so it stays readable)."""
    return bubble_rate(t) * min(warp_rate(t), 4.0)


def _make_bubbles():
    rng = np.random.default_rng(2718)
    out = []
    step = 1 / 480.0
    t = FIZZ
    while t < TOTAL:
        lam = bubble_rate_seen(t) * step
        for _ in range(rng.poisson(lam) if lam > 0 else 0):
            alive = np.nonzero(t < P_GONE)[0]
            k = int(alive[rng.integers(0, len(alive))]) if len(alive) else int(rng.integers(0, N_P))
            phi0 = P_PHI[k] + swirl_angle_w(t) * (0.8 + 0.35 * (1 - P_R[k] / R_IN))
            h0 = FLOOR + 0.6 + P_HF[k] * (level(t) - 1.2)
            size = rng.uniform(0.45, 1.15) * (1.15 if t < 13.0 else 1.0)
            v0 = rng.uniform(16.0, 30.0)
            acc = rng.uniform(10.0, 22.0)
            dh = max(FLOOR + level(t) - 0.6 - h0, 0.5)
            ttau = (-v0 + math.sqrt(v0 * v0 + 2 * acc * dh)) / acc      # time to the surface, fast clock
            t1 = tau_inv(tau(t) + ttau)
            out.append((t, P_R[k], phi0, h0, size, v0, acc, t1, rng.uniform(0, 6.28), k))
        t += step
    return out


BUBBLES = _make_bubbles()
_B_T0 = np.array([b[0] for b in BUBBLES]) if BUBBLES else np.zeros(0)
_B_T1 = np.array([b[7] for b in BUBBLES]) if BUBBLES else np.zeros(0)


def bubbles(t):
    """Bubbles in the liquid at t: list of (x, h, z, radius) and the ones popping now: list of (x, h, z, age)."""
    live, pops = [], []
    idx = np.nonzero((_B_T0 <= t) & (t < _B_T1 + 0.1))[0]
    s0 = swirl_angle_w(t)
    ta = tau(t)
    for i in idx:
        t0, r, phi0, h0, size, v0, acc, t1, wob, _ = BUBBLES[i]
        e = min(ta, tau(t1)) - tau(t0)
        phi = phi0 + (s0 - swirl_angle_w(t0)) * 0.7
        rr = r * (1 - 0.1 * min(e, 1.0))
        x = rr * math.cos(phi) + 0.35 * math.sin(wob + 9 * e)
        z = rr * math.sin(phi)
        h = h0 + v0 * e + 0.5 * acc * e * e
        if t < t1:
            live.append((x, h, z, size * (0.55 + 0.45 * min(1.0, e / 0.12))))
        else:
            pops.append((x, FLOOR + level(t), z, t - t1))
    return live, pops


def pop_times():
    return [b[7] for b in BUBBLES]


# ---------------------------------------------------------------- the stir bar's fall into the beaker
def ease_out_back(x, k=1.6):
    x = clamp01(x) - 1.0
    return 1 + (k + 1) * x ** 3 + k * x ** 2


def bar_pose(t):
    """Stir bar centre (x, h, z), tilt from horizontal (rad) and heading (rad, constant until it starts to turn).

    0 -> FLOOR_HIT  it slides down the left inside wall like a ladder, top end on the glass, gaining speed;
    -> FLAT         its lower end on the bottom, it tips over (the top end slides down the wall) and lies flat;
    -> LAND         the magnet under the plate pulls it to the middle: a quick zip with a little overshoot, "tik"."""
    seg = BAR_L - 2 * BAR_R                                  # distance between the two end-cap centres
    xw = -(R_IN - BAR_R)                                     # an end cap touching the left wall
    a0 = math.radians(72.0)
    zb = -4.0
    if t >= LAND:
        bounce = 0.0
        if t < LAND + 0.16:
            e = (t - LAND) / 0.16
            bounce = 1.6 * math.sin(math.pi * e) * (1 - e)
        return (0.0, BAR_H + bounce, 0.0), 0.0, bar_angle_w(t)
    if t < FLOOR_HIT:
        s = clamp01((t - SLIDE0) / (FLOOR_HIT - SLIDE0))
        low_h = 104.0 + (BAR_H - 104.0) * s * s
        low_x = xw + seg * math.cos(a0)
        top_h = low_h + seg * math.sin(a0)
        return ((xw + low_x) / 2, (low_h + top_h) / 2, zb), a0, math.pi
    if t < FLAT:
        s = (t - FLOOR_HIT) / (FLAT - FLOOR_HIT)
        a = a0 * (1 - s * s)
        low_x = xw + seg * math.cos(a)
        top_h = BAR_H + seg * math.sin(a)
        return ((xw + low_x) / 2, (BAR_H + top_h) / 2, zb), a, math.pi
    s = (t - FLAT) / (LAND - FLAT)
    x0 = xw + seg / 2
    f = ease_out_back(s, 1.2)
    hop = 0.9 * math.sin(math.pi * clamp01((t - FLAT) / 0.07)) if t < FLAT + 0.07 else 0.0
    return (x0 * (1 - f), BAR_H + hop, zb * (1 - f)), 0.0, math.pi


def pulse(t):
    """A tiny punch on the big hits (landing, click, lock, first fizz, chime): 0..1, decays fast."""
    p = 0.0
    for t0, a in ((LAND, 1.0), (KNOB, 0.8), (LOCK, 0.6), (FIZZ, 0.7), (CHIME, 1.0)):
        if t0 <= t < t0 + 0.4:
            p = max(p, a * math.exp(-(t - t0) / 0.09))
    return p


# ---------------------------------------------------------------- camera
BASE = (0.0, -70.0, 2.25)           # centre (u, v) and zoom px/mm of the full view
PUSHED = (0.0, -64.0, 2.95)


EXPLAIN = (5.00, 5.80, 8.70, 9.55)  # zoom in on magnet + bar, hold for the explanation, zoom back out
CLOSE = (0.0, -41.0, 5.0)


def _lerp_cam(a, b, u):
    z = math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * u)
    w = (1 / z - 1 / a[2]) / (1 / b[2] - 1 / a[2]) if abs(b[2] - a[2]) > 1e-9 else u
    return a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, z


def camera(t):
    e0, e1, e2, e3 = EXPLAIN
    if t < e0:
        c = BASE
    elif t < e1:
        c = _lerp_cam(BASE, CLOSE, smoother((t - e0) / (e1 - e0)))
    elif t < e2:
        c = (CLOSE[0], CLOSE[1], CLOSE[2] * (1 + 0.04 * (t - e1) / (e2 - e1)))
    elif t < e3:
        c = _lerp_cam((CLOSE[0], CLOSE[1], CLOSE[2] * 1.04), BASE, smoother((t - e2) / (e3 - e2)))
    elif t < PUSH[0]:
        c = BASE
    elif t < PUSH[1]:
        c = _lerp_cam(BASE, PUSHED, smoother((t - PUSH[0]) / (PUSH[1] - PUSH[0])))
    elif t < PULL[0]:
        c = PUSHED
    elif t < PULL[1]:
        c = _lerp_cam(PUSHED, BASE, smoother((t - PULL[0]) / (PULL[1] - PULL[0])))
    else:
        c = BASE
    return c[0], c[1], c[2] * (1 + 0.022 * pulse(t))


def knob_angle(t):
    """Knob pointer angle (deg, 0 = up): off at -130, turned to +40 with the click."""
    return -130.0 + 170.0 * smooth((t - KNOB + 0.02) / 0.12)


def power(t):
    return t >= KNOB + 0.03
