"""One timeline for picture and sound: 120 BPM, a bar is 2 s, 13 bars = 26 s; the main hits sit on the beat grid.

Seven scenes: the top-view hook (0-4), the vacuum pump (4-7), the side cutaway (7-13), blood collecting (13-18), the
cup coming off (18-21), the mark and the clean-up (21-24) and the loop (24-26). The camera ends on a second, clean
patch of the back framed exactly like the opening, with the lancet coming in again, so the last frame flows into the
first.
"""
import math

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 26.0

# ---- 1. top-view hook
LANCET_IN = (-0.5, 0.35)   # the lancet is already coming in at t = 0 (the loop needs the motion to continue)
TAPS = (0.5, 0.85, 1.2, 1.55)   # "tik" on the four marked spots
LANCET_OUT = (1.65, 2.05)
CUPS = (1.95, 2.3, 2.65, 3.0)   # four cups drop onto the spots
PUMP_IN = (3.0, 3.45)
HOSE_CLICK = 3.5           # the hose clicks onto the main cup's valve
# ---- 2. the vacuum pump
PUMPS = (4.0, 4.5, 5.0)    # three squeezes: air out, the skin rises
WHOOSH = 5.05
HOSE_OFF = 5.5             # the valve holds the vacuum; the hose comes off
PUMP_OUT = (5.5, 5.95)
TILT_DOWN = (5.7, 7.0)     # top view -> side view of the main cup
SLICE = (6.15, 7.0)        # the near part of the back is cut away: the cross-section appears
# ---- 3. side cutaway
CREEP = (7.0, 9.0)         # the skin keeps rising slowly under the low pressure
VESSEL_ZOOM = (9.0, 9.8)
RBC = (9.8, 11.6)
LEAK = (11.6, 13.0)        # a little blood comes out through the skin openings
# ---- 4. blood collects in the cup
COLLECT = (13.0, 15.0)     # time-lapse: drops run down the dome and collect at the rim
FOLLOW = (14.4, 15.4)
BLOOPS = (14.8, 15.4, 16.25)
MICRO = (15.5, 17.2)       # micro-shot: red blood cells floating in the collected blood
CLOT = (17.0, 18.6)        # the collected blood starts to thicken
BACK_OUT = (17.2, 18.0)
# ---- 5. the cup comes off
VALVE = (18.3, 18.6)       # a gloved hand reaches the valve ...
PSSSH = 18.6               # ... and lets the air back in
GRIP = (18.9, 19.15)
POP = 19.2                 # the seal breaks; the cup lifts straight up, level, the clotted blood inside
LIFT = (19.2, 21.6)
# ---- 6. the mark and the clean-up
TILT_UP = (21.0, 22.0)     # side view -> angled top-down view; the cut closes
WIPE = (22.35, 23.65)      # gauze wipes the left-over blood (two swipes)
SWIPES = (22.6, 23.2)
CLEAN = 23.7
# ---- 7. the loop
ZOOM_OUT = (24.0, 24.8)    # a bigger area of the back: three cups still on, one mark
TO_NEXT = (24.8, 25.6)     # down the spine to the next clean set of spots, framed exactly like the opening
LANCET_AGAIN = (25.5, 26.0)

P = 240.0                  # the spacing between the two identical sets of spots (mm along the back)
FAST_FORWARD = (COLLECT,)


# ---------------------------------------------------------------- easing
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


def anim(t, fps=15.0):
    """Sprite-animation time: ambient loops (air, cells, glints) step on twos, like an 8-bit game."""
    return math.floor(t * fps) / fps
