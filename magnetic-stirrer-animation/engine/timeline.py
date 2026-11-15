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
SLIDE0 = -0.40                      # the bar started sliding just before frame 0: it is already moving on frame 0
GLINT = 0.80                        # a highlight catches the bar just before it lands
SETTLE = 0.86                       # its lower end reaches the bottom; it tips over flat
LAND = 1.00                         # flat on the glass bottom: "tik"
FLASK = (1.05, 1.40, 2.75, 3.20)    # enter upright, tilted and pouring, stop pouring, gone
POUR1 = (1.42, 2.75)
KNOB = 4.00                         # the knob turns: "click", the power light comes on
WIPE_IN = (4.40, 4.90)              # horizontal pixel wipe into the side cutaway
MOTOR = 4.50                        # the motor starts
WIPE_OUT = (10.00, 10.45)           # wipe back to the outside view
BOTTLE = (10.25, 10.60, 11.45, 11.95)
POUR2 = (10.62, 11.45)
FIZZ = 11.60                        # the first CO2 bubbles
PUSH = (11.60, 14.60)               # gentle push in on the bubbles
CLEAR = (15.00, 20.80)              # time-lapse: the cloudiness fades
PULL = (15.00, 21.00)               # slow pull back to the full beaker
CHIME = 21.00                       # the bar is back in clear view: two-note chime
LOCK = 5.375                        # the bar has caught the magnet (sparkle + sound; see lock_time())
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
    for i in range(1, n):
        t = ts[i]
        lag = phim[i] - a
        tq = k_mag * math.sin(lag)
        if t >= LAND:
            if not free and abs(math.sin(lag)) > stick:   # it sits still until the pull beats the grip, then snaps
                free = True
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
    return ts, phim, th, wb, wl, phil, wm


_TS, _PHIM, _TH, _WB, _WL, _PHIL, _WM = _simulate()


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
    phi = P_PHI[alive] + swirl_angle(t) * (0.8 + 0.35 * (1 - r / R_IN))
    x, z = r * np.cos(phi), r * np.sin(phi)
    h = FLOOR + 0.6 + hf * (L - 1.2) + 0.5 * np.sin(t * 2.3 + P_BOB[alive])
    size = np.clip((P_GONE[alive] - t) / 1.4, 0, 1)
    return x, h, z, size, P_SHADE[alive], P_BIG[alive]


def _make_bubbles():
    rng = np.random.default_rng(2718)
    out = []
    step = 1 / 240.0
    t = FIZZ
    while t < TOTAL:
        lam = bubble_rate(t) * step
        for _ in range(rng.poisson(lam) if lam > 0 else 0):
            alive = np.nonzero(t < P_GONE)[0]
            if len(alive) == 0:
                k = int(rng.integers(0, N_P))
            else:
                k = int(alive[rng.integers(0, len(alive))])
            phi0 = P_PHI[k] + swirl_angle(t) * (0.8 + 0.35 * (1 - P_R[k] / R_IN))
            h0 = FLOOR + 0.6 + P_HF[k] * (level(t) - 1.2)
            size = rng.uniform(0.45, 1.15) * (1.15 if t < 13.0 else 1.0)
            v0 = rng.uniform(16.0, 30.0)
            acc = rng.uniform(10.0, 22.0)
            surf = FLOOR + level(t) - 0.6
            dh = max(surf - h0, 0.5)
            tt = (-v0 + math.sqrt(v0 * v0 + 2 * acc * dh)) / acc      # time to reach the surface
            out.append((t, P_R[k], phi0, h0, size, v0, acc, t + tt, rng.uniform(0, 6.28), k))
        t += step
    return out


BUBBLES = _make_bubbles()
_B_T0 = np.array([b[0] for b in BUBBLES]) if BUBBLES else np.zeros(0)
_B_T1 = np.array([b[7] for b in BUBBLES]) if BUBBLES else np.zeros(0)


def bubbles(t):
    """Bubbles in the liquid at t: list of (x, h, z, radius) and the ones popping now: list of (x, h, z, age)."""
    live, pops = [], []
    idx = np.nonzero((_B_T0 <= t) & (t < _B_T1 + 0.1))[0]
    s0 = swirl_angle(t)
    for i in idx:
        t0, r, phi0, h0, size, v0, acc, t1, wob, _ = BUBBLES[i]
        e = min(t, t1) - t0
        phi = phi0 + (s0 - swirl_angle(t0)) * 0.7
        rr = r * (1 - 0.1 * e)
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
def bar_pose(t):
    """Stir bar centre (x, h, z), tilt from horizontal (rad) and heading (rad)."""
    if t >= LAND:
        bounce = 0.0
        if t < LAND + 0.16:
            e = (t - LAND) / 0.16
            bounce = 1.6 * math.sin(math.pi * e) * (1 - e)
        return (0.0, BAR_H + bounce, 0.0), 0.0, bar_angle(t)
    alpha = math.radians(68.0)
    # sliding down the left inner wall, end first, picking up speed
    s = (t - SLIDE0) / (SETTLE - SLIDE0)
    hb = 92.0 + (BAR_H - 92.0) * s * s                        # lower end height
    xb = -15.5
    cx, ch = xb - BAR_L / 2 * math.cos(alpha), hb + BAR_L / 2 * math.sin(alpha)
    if t < SETTLE:
        return (cx, ch, -6.0), alpha, math.pi
    # it tips over and lands flat in the middle
    e = (t - SETTLE) / (LAND - SETTLE)
    f = e * e
    a = alpha * (1 - f)
    return (cx + (0.0 - cx) * f, ch + (BAR_H - ch) * f, -6.0 * (1 - f)), a, math.pi * (1 - f)


# ---------------------------------------------------------------- camera
BASE = (0.0, -70.0, 2.25)           # centre (u, v) and zoom px/mm of the full view
PUSHED = (0.0, -64.0, 2.95)


def camera(t):
    if t < PUSH[0]:
        return BASE
    if t < PUSH[1]:
        u = smoother((t - PUSH[0]) / (PUSH[1] - PUSH[0]))
    elif t < PULL[0]:
        u = 1.0
    elif t < PULL[1]:
        u = 1.0 - smoother((t - PULL[0]) / (PULL[1] - PULL[0]))
    else:
        u = 0.0
    z = math.exp(math.log(BASE[2]) + (math.log(PUSHED[2]) - math.log(BASE[2])) * u)
    w = (1 / z - 1 / BASE[2]) / (1 / PUSHED[2] - 1 / BASE[2])
    return BASE[0] + (PUSHED[0] - BASE[0]) * w, BASE[1] + (PUSHED[1] - BASE[1]) * w, z


def knob_angle(t):
    """Knob pointer angle (deg, 0 = up): off at -130, turned to +40 with the click."""
    return -130.0 + 170.0 * smooth((t - KNOB + 0.02) / 0.12)


def power(t):
    return t >= KNOB + 0.03
