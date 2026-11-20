"""One timeline for picture and sound: 120 BPM, a bar is 2 s, 15 bars = 30 s.

The hook (0-2): a gloved hand presses a two-layer tube onto the rubber cup, the switch clicks, the motor starts and a
vortex opens in the tube. The reveal (2-4): the mixer on a lab bench, the RPM climbing. The x-ray (4-8): the motor, the
touch switch, and the offset cam that makes the cup orbit without spinning. Into the tube (8-14), in slow motion: the
vortex, the layers stretched into thin swirls, the dyes mixing. Mixed! (14-16). Lift-off (16-18): the motor stops and the
orange liquid settles. Diffusion vs vortex (18-24), a battle screen. The tube goes into the rack and three stars pop
(24-27). Then the tape rewinds to the first frame (27-30), so the video loops.
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 30.0
STEP = BEAT / 4            # one 16th = 0.125 s

# ---- 1. hook
PLUNGE = (-0.45, 0.5)      # the tube comes down onto the cup (already moving at t = 0)
CONTACT = 0.5              # the tube lands in the cup: CLICK
PRESS = (0.5, 0.62)        # the cup head dips: the touch switch closes
MOTOR_ON = 0.625          # one 16th after the click: the motor and the music drop in together
SPIN_UP = (0.625, 2.6)     # 0 -> top speed
TITLE = (0.12, 1.95)       # "ONE TOUCH. / ONE VORTEX."
VORTEX_FORM = (0.9, 3.2)   # the funnel opens
# ---- 2. reveal
REVEAL = (1.95, 2.75)      # pull back to the mixer on the bench
HUD_IN = 2.2
# ---- 3. x-ray
TO_XRAY = (3.55, 4.15)
XRAY_SCAN = (4.0, 4.55)    # a scan line slices the casing open
TO_ECC = (5.9, 6.5)        # zoom onto the offset cam and the cup's mount
ORBIT_BOX = (6.55, 8.15)   # the top-view inset: the cup orbits, it does not spin
XRAY_CLOSE = (8.05, 8.5)
# ---- 4. into the tube (slow motion)
TO_TUBE = (8.0, 8.8)
BULLET = (8.3, 13.9)       # time slows while we look inside
TO_BANDS = (10.0, 10.6)
TO_MICRO = (11.9, 12.5)
PULL_OUT = (13.6, 14.2)
# ---- 5. mixed!
MIXED_AT = 14.0
# ---- 6. lift-off
LIFT = (16.2, 16.9)
MOTOR_OFF = 16.3
SPIN_DOWN = (16.3, 17.5)
SETTLE = (16.3, 18.0)
# ---- 7. diffusion vs vortex
VS = (18.0, 24.0)
VS_IN = (18.0, 18.4)
VS_SLAM = 18.5
RACE = (18.8, 22.4)        # diffusion: days pass; the vortex is done in seconds
WIN = 22.5
VS_OUT = (23.65, 24.0)
# ---- 8. the rack and the stars
TO_RACK = (24.15, 25.0)
RACK_CLINK = 25.0
STARS = (25.5, 26.0, 26.5)
# ---- 9. rewind to the first frame (loop)
REWIND = (27.0, 30.0)

RPM_MAX = 2800.0           # a typical top speed (2500-3000 rpm)
ORBIT_R = 2.0              # orbit radius, mm (a 4 mm orbit)


def clamp01(u):
    return max(0.0, min(1.0, u))


def u_of(t, span):
    a, b = span
    return clamp01((t - a) / (b - a))


def smooth(u):
    u = clamp01(u)
    return u * u * (3 - 2 * u)


def ease_in(u, p=2.0):
    return clamp01(u) ** p


def ease_out(u, p=2.0):
    return 1 - (1 - clamp01(u)) ** p


def ease_in_out(u, p=2.0):
    u = clamp01(u)
    return 0.5 * (2 * u) ** p if u < 0.5 else 1 - 0.5 * (2 - 2 * u) ** p


def back_out(u, k=1.7):
    u = clamp01(u)
    return 1 + (k + 1) * (u - 1) ** 3 + k * (u - 1) ** 2


def lerp(a, b, k):
    return a + (b - a) * k


def anim(t, fps=15.0):
    """Sprite time on twos: steps 15 times a second, like an 8-bit game."""
    return math.floor(t * fps) / fps


# ---------------------------------------------------------------- the machine
def rpm(t):
    """Motor speed (rpm): spins up after the switch closes, winds down after the tube is lifted."""
    if t < MOTOR_ON:
        return 0.0
    if t < MOTOR_OFF:
        return RPM_MAX * ease_out(u_of(t, SPIN_UP), 2.2)
    return RPM_MAX * (1 - ease_out(u_of(t, SPIN_DOWN), 1.6))


def warp(t):
    """How fast the inner motion plays: 1 normally, slowed right down in the bullet time inside the tube."""
    k = smooth(u_of(t, (BULLET[0], BULLET[0] + 0.6))) * (1 - smooth(u_of(t, (BULLET[1] - 0.4, BULLET[1]))))
    return 1.0 - 0.965 * k


_DT = 0.001
_TT = np.arange(-1.0, TOTAL + 1.0, _DT)
_RATE = np.array([rpm(x) / 60.0 * warp(x) for x in _TT])            # turns per second, as seen
_PHASE = np.concatenate([[0.0], np.cumsum(_RATE[:-1]) * _DT])       # turns


def turns(t):
    """Motor turns (as seen on screen) up to time t; the orbit phase is 2*pi*turns."""
    return float(np.interp(t, _TT, _PHASE))


def press(t):
    """How far (mm) the tube pushes the cup head down (the spring gives 3 mm)."""
    if t < CONTACT:
        return 0.0
    if t < LIFT[0]:
        return 3.0 * back_out(u_of(t, PRESS), 1.4)
    return 3.0 * (1 - ease_out(u_of(t, (LIFT[0], LIFT[0] + 0.12)), 2.0))


def vortex(t):
    """Depth of the vortex funnel, 0..1 (it grows with the speed, collapses after the motor stops, with a wobble)."""
    if t < VORTEX_FORM[0]:
        return 0.0
    k = ease_in_out(u_of(t, VORTEX_FORM), 1.6)
    if t >= MOTOR_OFF:
        u = t - MOTOR_OFF
        k *= math.exp(-u / 0.32)
    return k


def slosh(t):
    """Surface tilt (-1..1) as the liquid settles after the motor stops."""
    if t < MOTOR_OFF:
        return 0.0
    u = t - MOTOR_OFF
    return math.exp(-u / 0.45) * math.sin(2 * math.pi * 2.6 * u) * smooth(u / 0.15)


def mix(t):
    """How mixed the two layers are, 0..1: the vortex stretches the interface into thinner and thinner swirls."""
    if t < 1.2:
        return 0.0
    if t < BULLET[0]:
        return 0.28 * smooth(u_of(t, (1.2, BULLET[0])))
    if t < 13.7:
        return 0.28 + 0.72 * ease_in_out(u_of(t, (BULLET[0] + 0.4, 13.7)), 1.5)
    return 1.0


def swirl(t):
    """Turns of the swirling liquid as seen on screen (it follows the motor, a little behind, and coasts to a stop)."""
    return 0.18 * turns(t)


def rewind_source(t):
    """Film time shown during the rewind: from the start of the rewind back to 0, slow-fast-slow, landing on frame 0."""
    u = clamp01((t - REWIND[0]) / (REWIND[1] - REWIND[0]))
    return REWIND[0] * (1 - ease_in_out(u, 2.5))
