"""One timeline for picture and sound: 120 BPM, a bar is 2 s, 13 bars = 26 s; the main hits sit on the beat grid.

Five chunks, fourteen beats: grape to flask (0-3), reveal the apparatus (3-7), follow the vapour (7-12), why clear drops
form (12-20), payoff and loop (20-26). The last frame is the next hanging drop at the grape's size and place, so the
video cuts back to the grape on the downbeat and loops.
"""
import math

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 26.0

# ---- A. grape to flask
GLINT = (0.0, 0.3)         # a bright pixel highlight sweeps the grape
SQUASH = (0.3, 0.5)        # the sprite compresses ("squish" at 0.35) and the juice is released
STREAM0 = 0.42             # the juice leaves the grape
PLIP1 = 1.75               # the stream reaches the flask: the pool starts ("plip")
POUR = (1.75, 2.8)         # time compression: more grapes pressed, the pool rises
# ---- B. reveal the apparatus
MOVE = (3.0, 3.75)         # the flask is carried onto the heating mantle
NECK_PUSH = (3.7, 4.0)     # push onto the neck ...
MATCH = 4.0                # ... match cut on the neck: the apparatus is assembled
REVEAL = (4.0, 5.0)        # tilt up the still head, track toward the condenser
WIDE = (5.0, 6.0)          # zoom out: both flasks and the condenser
MANTLE_ON = 6.0            # the mantle indicator clicks on (the water is already circulating)
JUMP = (6.0, 7.0)          # a brief time jump: the lining glows, the thermometer climbs
BOIL = 6.75                # the juice starts bubbling
# ---- C. follow the vapour
SURFACE = (7.0, 7.9)       # push in on the bubbling surface and the lower neck; hold to 9 (micro-shot A)
TILT = (9.0, 10.4)         # tilt up the neck with the vapour
TRACK = (10.4, 11.6)       # track right into the condenser's inner tube
CUT_ON = (11.4, 12.0)      # the glass rim wipes into the cutaway
# ---- D. why clear drops form
PATHS = (12.0, 14.0)       # the whole condenser in cutaway: two paths (micro-shot B)
HEAT_PUSH = (13.85, 14.6)  # push in on one section of the inner wall
HEAT = (14.5, 15.4)        # an amber pulse crosses the inner glass wall
BEADS = (15.5, 18.0)       # clear beads appear on the inner wall
MERGE = 18.75              # one bead slides into another ("tik")
FOLLOW = (19.2, 20.6)      # track the bigger drop downhill and out
# ---- E. payoff and loop
DROP_FALL = (20.6, 21.0)   # it falls from the outlet ...
PLIP2 = 21.0               # ... and lands in the receiver ("plip")
COMPARE = (22.0, 22.8)     # zoom out to both flasks
LAPSE = (22.2, 23.5)       # time-lapse: purple a little lower, clear higher
CHIME = 23.0
LOOP_PUSH = (24.5, 26.0)   # push in on the next hanging drop; cut to the grape


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


# the grape at t = 0 and the last hanging drop share one place on the canvas
MATCH_XY = (135.0, 200.0)
MATCH_R = 40.0
