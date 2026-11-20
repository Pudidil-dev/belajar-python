"""The film's clock (96 BPM, 32.5 s = 13 bars) and what the surgical light is doing at every moment.

0-1 s the hook: the operation from the side. 1-2.5 s the camera rises and turns to face the lamp. Then one bar per
function: the LEDs and their lenses (bar 1), the rays meeting at one spot (2), a hand's shadow, hard under one LED and
soft once they are all back on (3), a head in the way and the sensors (4), brightness (5), colour temperature (6),
field size (7), endo mode (8), the heat going up (9), the sterile handle and its camera (10), the spring arm (11); bar
12 comes back to the opening shot, and the last frame is the first.
Every function of time here is periodic over the film (or at rest at both ends), so the film loops.
"""
import math

BPM = 96
BEAT = 60.0 / BPM          # 0.625 s
BAR = 4 * BEAT             # 2.5 s
STEP = BEAT / 4            # one 16th
N_BARS = 13
TOTAL = N_BARS * BAR       # 32.5 s

HOOK = (0.0, 1.0)
ZOOM_IN = (1.0, 2.5)
OUT = (30.0, 31.4)         # the pull back to the operating room


def bar(b, beat=0.0):
    return b * BAR + beat * BEAT


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


def lerp(a, b, k):
    return a + (b - a) * k


def wob(k):
    """An angular frequency with exactly k whole cycles per film (idle motion that loops)."""
    return 2 * math.pi * k / TOTAL


def pulse(t, t0, up=0.03, down=0.25):
    """A quick rise and a slower fall after t0 (0 before)."""
    d = t - t0
    if d < 0:
        return 0.0
    return (1 - math.exp(-d / up)) * math.exp(-d / down)


# ---------------------------------------------------------------- the light's state
LED_GROUPS = 15                              # bar 1: the LEDs light up in 15 groups, inner ring first, one per 16th
LED_ON = tuple(bar(1) + STEP * (i + 1) for i in range(LED_GROUPS))
T_FACE = 2.3                                 # the camera reaches the lamp's face (a glassy shimmer in the sound)


def led_on(i, t):
    """How far LED group i has lit up in the bar where they come on one by one (1 outside it)."""
    if bar(1) - 0.2 <= t < bar(2):
        return T_led(i, t)
    return 1.0


def T_led(i, t):
    return ease_out(u_of(t, (LED_ON[i], LED_ON[i] + 0.12)), 2.0)


BASE_I = 0.82                                # normal brightness (of full)
BRIGHT_STEPS = (0.3, 0.55, 0.8, 1.0)         # bar 5, one per beat


def intensity(t):
    """The light's output (0..1 of full)."""
    v = BASE_I
    if bar(5) <= t < bar(6) + 0.35:
        k = min(3, int((t - bar(5)) / BEAT))
        v = BRIGHT_STEPS[k] if t < bar(6) else lerp(1.0, BASE_I, smooth((t - bar(6)) / 0.35))
    dim = endo(t)
    return lerp(v, 0.08, dim)


CCT_STEPS = (3000, 4200, 5400, 6700)         # bar 6, one per beat
BASE_K = 4500


def cct(t):
    if bar(6) <= t < bar(6) + BAR:
        return CCT_STEPS[min(3, int((t - bar(6)) / BEAT))]
    if bar(7) <= t < bar(7) + 0.4:
        return lerp(6700, BASE_K, smooth((t - bar(7)) / 0.4))
    return BASE_K


FIELD_D = (20.0, 30.0)                       # light-field diameter (cm): normal, wide


def field_d(t):
    grow = smooth(u_of(t, (bar(7) + 0.3, bar(7) + 1.9)))
    back = smooth(u_of(t, (bar(8) + 0.1, bar(8) + 0.8)))
    return lerp(FIELD_D[0], FIELD_D[1], grow * (1 - back))


def lean(t):
    """The lead surgeon leaning in under the lamp (bar 4, for the sensors) and back (start of bar 5)."""
    return smooth(u_of(t, (bar(4) - 0.3, bar(4) + 0.3))) * (1 - smooth(u_of(t, (bar(5) - 0.1, bar(5) + 0.5))))


SOLO_BACK = bar(3) + 7 * STEP                # bar 3: one LED alone until here, then a group back on every 16th
SOLO_GROUPS = 7


def solo(t):
    """Bar 3: 0 = one LED alone (a hard shadow), 1 = all back on (one group per 16th from SOLO_BACK)."""
    if not (bar(3) <= t < bar(4)):
        return 1.0
    k = (t - SOLO_BACK) / STEP
    if k < 0:
        return 0.0
    return min(1.0, (math.floor(k) + 1) / SOLO_GROUPS)


def reach(t):
    """A gloved hand held up over the field (bar 3), so its shadow shows, and taken back."""
    return smooth(u_of(t, (bar(3) - 0.35, bar(3) + 0.15))) * (1 - smooth(u_of(t, (bar(4) - 0.45, bar(4) - 0.05))))


def demo(t):
    """The shadow demo (bar 3): the room darker and the light a little lower, so every shade of the shadow shows."""
    return smooth(u_of(t, (bar(3) - 0.2, bar(3) + 0.1))) * (1 - smooth(u_of(t, (bar(4) - 0.3, bar(4)))))


def thermal(t):
    """The heat view (bar 9)."""
    return smooth(u_of(t, (bar(9) + 0.05, bar(9) + 0.35))) * (1 - smooth(u_of(t, (bar(10) - 0.3, bar(10)))))


T_DETECT = bar(4) + 3 * STEP                 # the sensors see the head (on a 16th)


def scanning(t):
    return 1.0 if bar(4) <= t < bar(5) else 0.0


def shift(t):
    """The power shifted from the blocked LEDs to the others (bar 4)."""
    return smooth(u_of(t, (T_DETECT + 0.15, T_DETECT + 0.7))) * (1 - smooth(u_of(t, (bar(5) - 0.1, bar(5) + 0.5))))


def focus_dim(t):
    """While the film explains the light (after the zoom in, until the pull back), the room is a little darker, so the
    light and its beams stand out."""
    return smooth(u_of(t, (1.5, 2.6))) * (1 - smooth(u_of(t, (OUT[0], OUT[1] - 0.3))))


def endo(t):
    """Endo mode (bar 8): the light and the room go dim."""
    return smooth(u_of(t, (bar(8) + 0.05, bar(8) + 0.45))) * (1 - smooth(u_of(t, (bar(9) - 0.25, bar(9) + 0.2))))


def heat(t):
    """The heat glowing off the top of the lamp and rising (bar 9)."""
    return smooth(u_of(t, (bar(9) + 0.1, bar(9) + 0.6))) * (1 - smooth(u_of(t, (bar(10) - 0.2, bar(10) + 0.2))))


T_GRIP = bar(10) + 4 * STEP                  # the glove closes round the handle (beat 2)
T_CAM = bar(10) + 8 * STEP                   # the camera starts filming (beat 3)


def hand(t):
    """A gloved hand on the sterile handle: reaching in (bar 10), holding while it moves the lamp (bar 11), gone."""
    return smooth(u_of(t, (bar(10) + 0.05, T_GRIP))) * (1 - smooth(u_of(t, (bar(12) + 2 * STEP, bar(12) + 0.75))))


def camview(t):
    """The handle's camera at work (bar 10)."""
    return smooth(u_of(t, (T_CAM, T_CAM + 0.4))) * (1 - smooth(u_of(t, (bar(11) - 0.1, bar(11) + 0.2))))


ARM_SWING = -16.0                            # degrees the spring arm swings down when the lamp is pulled
ARM_GO = (bar(11) + 2 * STEP, bar(11) + 6 * STEP)      # pulled to its new place, arriving on a 16th
ARM_BACK = (bar(11) + 12 * STEP, bar(12) + 2 * STEP)   # pushed back home


def arm(t):
    """The spring arm's swing (0 = home): pulled to a new place, held there, pushed back home."""
    go = ease_in_out(u_of(t, ARM_GO), 2.0)
    back = ease_in_out(u_of(t, ARM_BACK), 2.0)
    return go * (1 - back)
