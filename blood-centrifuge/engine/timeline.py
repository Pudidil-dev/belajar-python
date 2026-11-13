"""One timeline for picture and sound: 120 BPM, a bar is 2 s, every event sits on the 8th-note grid (0.25 s).

Both the renderer and the synthesizer read these times, so a change here moves the picture and its sound together.
28 s = 14 bars: hook, loading, spin-up, the machine splits open (cutaway: motor, shaft, swing-out rotor), dive into the
tube, separation, back out to the cutaway while it brakes, the casing closes, stop, lid, reveal.
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 28.0

# ---- scene 1: hook
TWIN_POP = 0.5             # the separated twin pops in ("TWO LAYERS.")
TWIN_POOF = 1.0            # ... and vanishes; the red tube slides to the centre
SLIDE = (1.0, 1.5)
# ---- scene 2: into the machine
FLY = (1.5, 2.1)           # machine rises into frame, tube shrinks toward the front bucket
INSERT = (2.1, 2.5)        # tube drops into the bucket
CLINK = 2.5
LID_CLOSE = (2.75, 3.0)
THUNK = 3.0
POWER = 3.5                # panel lights up (beep)
START_BTN = 3.75           # START pressed
# ---- scene 3: spin-up outside, then the casing is cut open
SPIN0 = 4.0
SLICE = (5.5, 5.75)        # a line of light runs around the casing
SPLIT_PUSH = (5.75, 6.0)   # quick push, flash
# ---- scene 4: the cutaway (machine split open)
OPEN = (6.0, 6.5)          # front and top of the casing fly apart
SWING = (6.5, 8.0)         # motor spins up to 3500 RPM, the buckets swing out
SPIN_FULL = 8.0
LABEL_ROTOR = 6.75
LABEL_MOTOR = 7.25
SLOWMO = (8.6, 9.3)        # bullet time on our tube, force arrows
DIVE = (9.4, 10.0)         # push + roll into the tube
# ---- scenes 5-6: inside the tube
IRIS_IN = (10.0, 10.4)
SEP = (11.0, 16.75)
IRIS_OUT = (17.75, 18.0)
# ---- scene 7: back out in the cutaway while it brakes; the casing closes
PULL = (18.0, 18.75)
SLOW = (18.0, 20.0)        # the rotor stops at 20.0, buckets hang down again
CLOSE = (20.0, 20.5)       # casing halves come back together
STOP = 20.5                # clunk; outside view, LCD "End"
DONE_BEEPS = (20.625, 20.75, 20.875)
# ---- scene 8: lid opens, the result
UNLOCK = 21.0
LID_OPEN = (21.0, 21.5)
LIFT = (21.5, 22.0)
FLY_OUT = (22.0, 23.5)
CAM_UP = (22.1, 23.2)      # camera tilts back up to the stage
REVEAL = 23.5
LABEL_PLASMA = 24.0
LABEL_RBC = 25.0
# ---- scene 9: final close-up
GLINT = 26.0
HOP = 26.0
OUTRO = (27.5, 28.0)

OMEGA_MAX = 30.0           # visual rotor speed (rev/s) at full spin in the outside view; the LCD shows 3500 RPM


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


def lerp(a, b, u):
    return a + (b - a) * u


# ---------------------------------------------------------------- the real speed (what the LCD and the motor say)
def rpm_frac(t):
    """Rotor speed as a fraction of 3500 RPM: a slow start outside, the big climb in the cutaway, the brake."""
    if t < SPIN0:
        return 0.0
    if t < SWING[0]:
        return 0.30 * ((t - SPIN0) / (SWING[0] - SPIN0)) ** 1.3
    if t < SPIN_FULL:
        return 0.30 + 0.70 * smooth((t - SWING[0]) / (SPIN_FULL - SWING[0]))
    if t < SLOW[0]:
        return 1.0
    if t < SLOW[1]:
        return (1 - (t - SLOW[0]) / (SLOW[1] - SLOW[0])) ** 2
    return 0.0


def omega(t):
    """Outside-view rotor speed in rev/s (also drives the motor sound)."""
    return OMEGA_MAX * rpm_frac(t)


def rpm(t):
    return int(round(rpm_frac(t) * 3500 / 10.0)) * 10


def swing(t):
    """Bucket swing angle (rad): 0 hanging, pi/2 horizontal. Swing-out buckets fly out early in the climb."""
    x = clamp01((rpm_frac(t) - 0.2) / 0.55)
    return math.pi / 2 * smooth(x)


_TS = np.linspace(0, TOTAL + 1, 60001)
_W = np.array([omega(t) for t in _TS])
_REV = np.concatenate([[0], np.cumsum((_W[1:] + _W[:-1]) * 0.5 * np.diff(_TS))])


def rotor_angle(t):
    """Outside-view rotor angle (rad): turns from SPIN0 until the casing is cut; at rest (front bucket forward) after."""
    if t >= STOP:
        return 0.0
    return 2 * math.pi * (float(np.interp(t, _TS, _REV)) % 1.0)


# ---------------------------------------------------------------- the cutaway's own (stylized) rotation
def _w_cut(t):
    """Visual rev/s in the cutaway: readable speeds with motion trails; bullet time before the dive."""
    if t < OPEN[0]:
        return 0.0
    if t < SLOWMO[0]:
        return 0.35 + 2.9 * rpm_frac(t)
    if t < IRIS_IN[1] + 0.5:
        w0 = 0.35 + 2.9 * rpm_frac(SLOWMO[0])
        return lerp(w0, 0.22, smooth(u_of(t, SLOWMO)))
    if t < PULL[0]:
        return 0.22
    if t < SLOW[1]:
        out_of_bullet = lerp(0.22, 2.6, ease_in(u_of(t, PULL), 1.6))
        return out_of_bullet * rpm_frac(t)
    return 0.0


_TC = np.linspace(OPEN[0], TOTAL, 44001)
_WC = np.array([_w_cut(t) for t in _TC])
_RC = np.concatenate([[0], np.cumsum((_WC[1:] + _WC[:-1]) * 0.5 * np.diff(_TC))])
_REV_DIVE = float(np.interp(IRIS_IN[0], _TC, _RC))
_REV_PULL = float(np.interp(PULL[0], _TC, _RC))
_REV_STOP = float(np.interp(SLOW[1], _TC, _RC))
# bucket 0 (our tube) sits at phi = theta + pi/2. At the dive and at the pull-out it must be on the left (phi = pi);
# when the rotor stops it must be at the front (phi = pi/2). The brake's turn count is nudged to make both true.
_BRAKE_REV = _REV_STOP - _REV_PULL
_BRAKE_TARGET = max(0.75, round(_BRAKE_REV - 0.75) + 0.75)         # nearest count that ends at the front
_BRAKE_SCALE = _BRAKE_TARGET / _BRAKE_REV


def cut_angle(t):
    """Cutaway rotor angle theta (rad); bucket k sits at phi = theta + k*pi/2 + pi/2."""
    if t < PULL[0]:
        rev = float(np.interp(t, _TC, _RC)) - _REV_DIVE + 0.25       # phi_0 = pi at the dive
    else:
        rev = 0.25 + (float(np.interp(t, _TC, _RC)) - _REV_PULL) * _BRAKE_SCALE
    return 2 * math.pi * rev


def cut_omega(t):
    """Cutaway visual speed in rad per second (for motion blur)."""
    w = _w_cut(t)
    if PULL[0] <= t < SLOW[1]:
        w *= _BRAKE_SCALE
    return 2 * math.pi * w
