"""One timeline for picture and sound: 120 BPM, a bar is 2 s, every event sits on the 8th-note grid.

0-20 s is the film: empty syringe -> needle into the vein -> plunger pulls -> full syringe. 20-24 s plays the same film
backward at about 5x and lands on the opening composition, so the 24 s video loops with no seam.
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 24.0
FILM = 20.0

# ---- geometry shared by the picture (world px; skin surface at y = 0, needle enters at E = (0, 0))
ANGLE = math.radians(30)                         # needle 30 degrees below horizontal (venipuncture 15-30)
U = (math.cos(ANGLE), math.sin(ANGLE))           # tip direction (down-right)
N = (math.sin(ANGLE), -math.cos(ANGLE))          # the syringe's "top" side (up-right)
D_START, D_ABOVE, D_IN = -380.0, -6.0, 60.0      # tip distance past the entry point along U
S_OPEN = 5.0                                     # the bevel opening, measured from the tip along the axis
S_BARREL0, S_BARREL1 = 102.0, 186.0              # barrel inner front / back (the needle, hub and nozzle are 0-102)
S_MID = (S_BARREL0 + S_BARREL1) / 2              # the barrel centre: what the camera keeps centred
P_FULL = 64.0                                    # plunger travel for a full barrel
Z_IN = 2.1                                       # the slight zoom on the needle opening

# ---- events
HIGHLIGHT = (0.0, 0.24)    # a glint slides along the empty barrel
MOVE0 = 0.12               # the syringe sets off ("shup")
APPROACH = (0.12, 4.6)
CUTAWAY = (2.0, 3.0)       # a scan line reveals the arm in side cutaway
CAM_SETTLE = (1.8, 5.0)    # the camera stops tracking and settles on the insertion site
INSERT = (5.0, 8.8)        # tip through skin and tissue into the vein
TIP_GLINT = (4.4, 9.2)
ZOOM_IN = (9.0, 10.0)
PULL = (9.0, 18.8)         # plunger travel
FLOW_IN = 9.4              # blood reaches the opening
FLOW_HUB = 11.9            # blood reaches the barrel
FOLLOW = (10.0, 12.4)      # the camera follows the red flow up the needle
ZOOM_OUT = (12.4, 15.5)    # back to the opening composition
FULL = 18.8
CHIME = 19.0
FINAL_GLINT = (19.0, 19.45)
REWIND = (20.0, 24.0)
REWIND_END = 0.13          # the rewind lands just after MOVE0: the opening pose, before the opening glint


# ---------------------------------------------------------------- easing
def clamp01(u):
    return max(0.0, min(1.0, u))


def u_of(t, span):
    a, b = span
    return clamp01((t - a) / (b - a))


def smooth(u):
    u = clamp01(u)
    return u * u * (3 - 2 * u)


def smoother(u):
    u = clamp01(u)
    return u * u * u * (u * (u * 6 - 15) + 10)


def ease_in(u, p=2.0):
    return clamp01(u) ** p


def ease_out(u, p=3.0):
    return 1 - (1 - clamp01(u)) ** p


def ease_in_out(u, p=3.0):
    u = clamp01(u)
    return 0.5 * (2 * u) ** p if u < 0.5 else 1 - 0.5 * (2 - 2 * u) ** p


def lerp(a, b, u):
    return a + (b - a) * u


def axis_point(d_tip, s):
    """World point on the syringe axis, s px back from a tip that sits d_tip px past the entry point."""
    k = d_tip - s
    return k * U[0], k * U[1]


# ---------------------------------------------------------------- motion
def tip_d(t):
    if t < MOVE0:
        return D_START
    if t < APPROACH[1]:
        return lerp(D_START, D_ABOVE, ease_out(u_of(t, APPROACH), 2.4))
    if t < INSERT[0]:
        return lerp(D_ABOVE, -2.0, smooth(u_of(t, (APPROACH[1], INSERT[0]))))
    return lerp(-2.0, D_IN, smooth(u_of(t, INSERT)))


def plunger(t):
    """How far the stopper has been drawn back (px)."""
    return P_FULL * smoother(u_of(t, PULL))


def flow_front(t):
    """How far the blood has come up from the tip (px along the axis, 0..S_BARREL0)."""
    if t < FLOW_IN:
        return 0.0
    return S_BARREL0 * clamp01((t - FLOW_IN) / (FLOW_HUB - FLOW_IN)) ** 1.15


def barrel_fill(t):
    """Length of the blood column in the barrel (px from the barrel front)."""
    if t < FLOW_HUB:
        return 0.0
    return min(plunger(t), (t - FLOW_HUB) * 48.0)


def tip_world(t):
    return axis_point(tip_d(t), 0.0)


C_INS = (-45.0, -22.0)                          # the steady framing of the insertion
C_HOLD = axis_point(D_IN, S_MID)                # barrel centred, needle in: the payoff framing
OPEN_PT = (axis_point(D_IN, S_OPEN)[0] + 2 * N[0], axis_point(D_IN, S_OPEN)[1] + 2 * N[1])


def camera(t):
    """(world cx, world cy, zoom)."""
    z = 1.0
    if t < CAM_SETTLE[0]:
        cx, cy = axis_point(tip_d(t), S_MID)
    elif t < CAM_SETTLE[1]:
        bx, by = axis_point(tip_d(t), S_MID)
        k = smooth(u_of(t, CAM_SETTLE))
        cx, cy = lerp(bx, C_INS[0], k), lerp(by, C_INS[1], k)
    elif t < ZOOM_IN[0]:
        cx, cy = C_INS
    elif t < FOLLOW[0]:
        k = smooth(u_of(t, ZOOM_IN))
        cx, cy = lerp(C_INS[0], OPEN_PT[0], k), lerp(C_INS[1], OPEN_PT[1], k)
        z = Z_IN ** k
    elif t < ZOOM_OUT[0]:
        k = smooth(u_of(t, FOLLOW))
        s = lerp(S_OPEN, S_BARREL0 - 4, k)
        px, py = axis_point(D_IN, s)
        cx, cy = lerp(OPEN_PT[0], px, min(1.0, k * 3)), lerp(OPEN_PT[1], py, min(1.0, k * 3))
        z = Z_IN
    elif t < ZOOM_OUT[1]:
        k = smooth(u_of(t, ZOOM_OUT))
        px, py = axis_point(D_IN, S_BARREL0 - 4)
        cx, cy = lerp(px, C_HOLD[0], k), lerp(py, C_HOLD[1], k)
        z = Z_IN ** (1 - k)
    else:
        cx, cy = C_HOLD
    return cx, cy, z


# ---------------------------------------------------------------- the rewind: source time shown at video time t
def _speed_profile(tau):
    """Rewind speed shape over tau in [0, 4]: a quick start, a steady ~5x run, a soft landing in the last 0.5 s."""
    up = smooth(tau / 0.18)
    down = smooth((4.0 - tau) / 0.55)
    return up * down


_TAU = np.linspace(0.0, 4.0, 4001)
_G = np.array([_speed_profile(x) for x in _TAU])
_INT = np.concatenate([[0], np.cumsum((_G[1:] + _G[:-1]) * 0.5 * np.diff(_TAU))])
REWIND_SPEED = (FILM - REWIND_END) / _INT[-1]


def rewind_source(t):
    tau = min(max(t - REWIND[0], 0.0), 4.0)
    return FILM - REWIND_SPEED * float(np.interp(tau, _TAU, _INT))


def source_time(t):
    """Film time shown at video time t (identity before the rewind)."""
    return t if t < REWIND[0] else rewind_source(t)
