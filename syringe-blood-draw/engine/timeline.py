"""One timeline for picture and sound: 120 BPM, a bar is 2 s, every event sits on the 8th-note grid.

0-20 s is the film: the empty syringe stands upright and is shown off -> it swings to the needle angle and shoots at
the arm -> needle into the vein -> plunger pulls -> full syringe. 20-24 s plays the same film backward at about 5x and
lands on the opening composition, so the 24 s video loops with no seam.
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 24.0
FILM = 20.0

# ---- the arm (world px; the skin surface is y = 0 and depth grows downward; the needle enters at E = (0, 0))
EPI = 14.0                                       # epidermis: a horny layer over three rows of skin cells
DERM = 25.0                                      # the dermis (soft tissue) runs from EPI down to the vein
VEIN_R, VEIN_WALL = 15.0, 3.0
VEIN_C = DERM + VEIN_R                           # 40: the vein's centre line
LUMEN_R = VEIN_R - VEIN_WALL
DEEP = VEIN_C + VEIN_R                           # deeper soft tissue below the vein
BOTTOM = 340.0

# ---- the syringe and its path (axis coordinate s: 0 at the needle tip, growing toward the thumb press)
ANGLE = math.radians(30)                         # needle 30 degrees below horizontal (venipuncture: 15-30)
U = (math.cos(ANGLE), math.sin(ANGLE))           # tip direction (down-right)
N = (math.sin(ANGLE), -math.cos(ANGLE))          # the syringe's "top" side (up-right)
D_START, D_ABOVE, D_IN = -380.0, -6.0, 72.0      # tip distance past the entry point along U
S_OPEN = 3.5                                     # the centre of the bevel opening, from the tip along the axis
S_BARREL0, S_BARREL1 = 101.0, 181.0              # barrel inner front / back (needle 0-84, hub 84-96, nozzle 96-101)
S_MID = (S_BARREL0 + S_BARREL1) / 2              # the barrel centre
L_EMPTY = 204.0                                  # tip to thumb press with the plunger fully forward
S_PIV = L_EMPTY / 2                              # the empty syringe's middle: it turns about this point
P_FULL = 65.0                                    # plunger travel for a full barrel
Z_HERO, Z_IN = 1.75, 2.5                         # camera zooms: the upright syringe, the needle opening

A_HERO = math.radians(-90)                       # upright, needle up, thumb press down
A_WIND = math.radians(-102)                      # the wind-up before the swing
A_AIM = ANGLE

# ---- events
HIGHLIGHT = (0.0, 0.45)    # a glint runs up the whole empty syringe
TWINKLE = (0.15, 1.45)     # sparkles around it
TWINKLES = [(-52, -86, 0.15), (47, 104, 0.40), (50, -40, 0.32), (-46, 14, 0.48), (55, 66, 0.62),
            (-58, 92, 0.78), (44, -98, 0.90), (-50, -30, 1.02), (58, 20, 1.14), (-40, 70, 1.24)]
                           # (x, y offset from the syringe's middle in canvas px, start time); each lives 0.42 s
TIP_STAR = (0.95, 1.35)    # the needle tip shines
BOB_OFF = (1.05, 1.3)      # the idle bob settles
WINDUP = (1.25, 1.5)       # a small counter-turn and crouch
SWING = (1.5, 2.0)         # it swings down to the needle angle (aim)
HERO_ZOOM = (1.35, 1.75)   # the camera pulls back from the close showcase
MOVE0 = 2.0                # the syringe shoots off ("shup")
APPROACH = (2.0, 4.6)
CUTAWAY = (3.0, 4.0)       # a scan line reveals the arm in side cutaway
CAM_SETTLE = (3.0, 5.0)    # the camera stops tracking and settles, closer, on the insertion site
                           # (then a slow follow and push-in while the needle goes in)
INSERT = (5.0, 8.8)        # tip through skin and tissue into the vein
TIP_GLINT = (4.6, 9.2)
ZOOM_IN = (9.0, 10.0)
PULL = (9.0, 18.8)         # plunger travel
FLOW_IN = 9.4              # blood reaches the opening
FLOW_HUB = 11.9            # blood reaches the barrel
FOLLOW = (10.0, 12.4)      # the camera follows the red flow up the needle
ZOOM_OUT = (12.4, 15.5)    # back out to the whole syringe
FULL = 18.8
CHIME = 19.0
FINAL_GLINT = (19.0, 19.45)
REWIND = (20.0, 24.0)
REWIND_END = -1.0 / 30     # the rewind lands one frame before t = 0: the opening pose, just before the opening glint


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


def back_out(u, s=1.7):
    u = clamp01(u) - 1
    return u * u * ((s + 1) * u + s) + 1


def lerp(a, b, u):
    return a + (b - a) * u


def axis_point(d_tip, s):
    """World point on the 30-degree syringe axis, s px back from a tip that sits d_tip px past the entry point."""
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


def syringe_angle(t):
    """Axis direction (radians, screen coordinates): upright, a small wind-up, then a swing with overshoot to 30 deg."""
    if t < WINDUP[0]:
        return A_HERO
    if t < SWING[0]:
        return lerp(A_HERO, A_WIND, ease_in_out(u_of(t, WINDUP), 2.0))
    if t < SWING[1]:
        return lerp(A_WIND, A_AIM, back_out(u_of(t, SWING) ** 1.4, 1.6))
    return A_AIM


M0 = axis_point(D_START, S_PIV)                  # where the syringe's middle sits in the opening pose


def pivot(t):
    """World position of the syringe's middle (s = S_PIV)."""
    if t < MOVE0:
        bob = 2.0 * math.sin(2 * math.pi * 0.9 * t) * (1 - smooth(u_of(t, BOB_OFF)))
        crouch = 3.0 * ease_in_out(u_of(t, WINDUP), 2.0) * (1 - ease_out(u_of(t, SWING), 2.0))
        return M0[0], M0[1] + bob + crouch
    return axis_point(tip_d(t), S_PIV)


def tip_world(t):
    a = syringe_angle(t)
    px, py = pivot(t)
    return px + S_PIV * math.cos(a), py + S_PIV * math.sin(a)


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


def opening_world():
    """The centre of the bevel opening once the needle is in."""
    ax, ay = axis_point(D_IN, S_OPEN)
    return ax + 1.2 * N[0], ay + 1.2 * N[1]


C_INS = ((-25.0, -10.0, 1.6), (36.0, 15.0, 1.9))  # (x, y, zoom) framing the insertion as it starts / ends
C_HOLD = axis_point(D_IN, S_MID)                # the full syringe centred, needle in: the payoff framing
OPEN_PT = (opening_world()[0] + 1.0 * N[0], opening_world()[1] + 1.0 * N[1])


def camera(t):
    """(world cx, world cy, zoom)."""
    z = 1.0
    if t < MOVE0:
        cx, cy = M0
        z = lerp(Z_HERO, 1.0, ease_in_out(u_of(t, HERO_ZOOM), 3.0))
    elif t < CAM_SETTLE[0]:
        cx, cy = pivot(t)
    elif t < CAM_SETTLE[1]:
        bx, by = pivot(t)
        k = smooth(u_of(t, CAM_SETTLE))
        a = C_INS[0]
        cx, cy = lerp(bx, a[0], k), lerp(by, a[1], k)
        z = a[2] ** k
    elif t < ZOOM_IN[0]:
        a, b = C_INS
        k = smooth(u_of(t, INSERT))
        cx, cy = lerp(a[0], b[0], k), lerp(a[1], b[1], k)
        z = a[2] * (b[2] / a[2]) ** k
    elif t < FOLLOW[0]:
        b = C_INS[1]
        k = smooth(u_of(t, ZOOM_IN))
        cx, cy = lerp(b[0], OPEN_PT[0], k), lerp(b[1], OPEN_PT[1], k)
        z = b[2] * (Z_IN / b[2]) ** k
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
