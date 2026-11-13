"""One timeline for picture and sound: 120 BPM, a bar is 2 s, every event sits on the 8th-note grid (0.25 s).

Both the renderer and the synthesizer read these times, so a change here moves the picture and its sound together.
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 24.0

# ---- scene 1: hook
TWIN_POP = 0.5             # the separated twin pops in ("TWO LAYERS.")
TWIN_POOF = 1.0            # ... and vanishes; the red tube slides to the centre
SLIDE = (1.0, 1.5)
# ---- scene 2: into the machine
FLY = (1.5, 2.1)           # machine rises into frame, tube shrinks toward the front slot
INSERT = (2.1, 2.5)        # tube drops into the slot
CLINK = 2.5
LID_CLOSE = (2.75, 3.0)
THUNK = 3.0
POWER = 3.5                # panel lights up (beep)
START_BTN = 3.75           # START pressed
# ---- scene 3: spin up, camera rushes into the window
SPIN0 = 4.0
SPIN_FULL = 5.6
PUSH = (4.25, 5.5)         # slow push on the machine
ZOOM_IN = (5.5, 6.0)       # fast push into the lid window (accent)
# ---- scenes 4-5: inside the tube
IRIS_IN = (6.0, 6.4)
SEP = (7.0, 12.75)
IRIS_OUT = (13.75, 14.0)
# ---- scene 6: pull out, slow down
ZOOM_OUT = (14.0, 14.75)
SLOW = (14.0, 16.5)
STOP = 16.5
DONE_BEEPS = (16.625, 16.75, 16.875)
# ---- scene 7: lid opens
UNLOCK = 17.0
LID_OPEN = (17.0, 17.5)
# ---- scene 8: the result
LIFT = (17.5, 18.0)
FLY_OUT = (18.0, 19.5)
REVEAL = 19.5
LABEL_PLASMA = 20.0
LABEL_RBC = 21.0
# ---- scene 9: final close-up
GLINT = 22.0
HOP = 22.0
OUTRO = (23.5, 24.0)

OMEGA_MAX = 30.0           # visual rotor speed (rev/s) at full spin; the LCD shows 3500 RPM


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


def back_out(u, s=1.9):
    u = clamp01(u) - 1
    return u * u * ((s + 1) * u + s) + 1


def bounce_settle(u, amp=1.0, cycles=2.0):
    """Damped oscillation that ends at 0 (for overshoot wobbles)."""
    u = clamp01(u)
    return amp * math.sin(u * cycles * 2 * math.pi) * (1 - u) ** 2


def lerp(a, b, u):
    return a + (b - a) * u


# ---------------------------------------------------------------- rotor kinematics (revolutions)
def omega(t):
    """Visual rotor speed in rev/s."""
    if t < SPIN0:
        return 0.0
    if t < SPIN_FULL:
        return OMEGA_MAX * ((t - SPIN0) / (SPIN_FULL - SPIN0)) ** 2
    if t < SLOW[0]:
        return OMEGA_MAX
    if t < STOP:
        u = (t - SLOW[0]) / (STOP - SLOW[0])
        return OMEGA_MAX * (1 - u) ** 2
    return 0.0


_TS = np.linspace(0, TOTAL + 1, 60001)
_W = np.array([omega(t) for t in _TS])
_REV = np.concatenate([[0], np.cumsum((_W[1:] + _W[:-1]) * 0.5 * np.diff(_TS))])
_TOTAL_REV = float(np.interp(STOP, _TS, _REV))
_FIX = round(_TOTAL_REV) - _TOTAL_REV       # hidden correction while the camera is inside the tube


def rotor_angle(t):
    """Rotor angle (rad). Starts and stops with our tube in the front slot; the correction that makes the stop land
    exactly there is spread over the seconds when the rotor is off screen."""
    rev = float(np.interp(t, _TS, _REV)) + _FIX * smoother((t - 6.6) / (13.4 - 6.6))
    return 2 * math.pi * (rev % 1.0)


def rpm(t):
    return int(round(omega(t) / OMEGA_MAX * 3500 / 10.0)) * 10
