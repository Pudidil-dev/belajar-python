"""One timeline for picture and sound: 120 BPM, a bar is 2 s, 16 bars = 32 s; the main hits sit on the beat grid.

Six chunks: grape to flask (0-4), build the still (4-7), the heater x-ray (7-12.5), follow the vapour (12.5-17.75),
why clear drops form (17.75-26), payoff and loop (26-32). The film ends by dissolving the next hanging drop into the
grape with an 8-bit dithered opacity fade, so the last frame flows into the first.
"""
import math

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 32.0

# ---- A. grape to flask
GLINT = (0.0, 0.3)         # a bright pixel highlight sweeps the grape
SQUASH = (0.3, 0.5)        # the sprite compresses ("squish") and the juice is released
STREAM0 = 0.42             # the juice leaves the grape
PLIP1 = 1.75               # the stream reaches the flask: the pool starts ("plip")
POUR = (1.75, 2.75)        # more grapes pressed, the pool rises
FF_POUR = (2.0, 2.75)      # fast-forward badge: time is compressed
HOP = (3.0, 3.75)          # the flask hops onto the heating mantle ...
HOP_LAND = 3.5             # ... lands (squash, thunk, shake) and settles
NECK_PUSH = (3.75, 4.0)    # push onto the neck ...
MATCH = 4.0                # ... match cut on the neck: the still is built around it
# ---- B. build the still
PART_HEAD = 4.0            # the still head and thermometer drop onto the neck
PART_COND = 4.5            # the stands, clamps and condenser drop in
PART_RECV = 5.0            # the adapter and the receiver drop in
REVEAL = (4.0, 4.75)       # pull back from the neck to the whole route
WATER_ON = 5.5             # cooling water fills the jacket from the lower port, before any heat
# ---- C. the heater x-ray
HEATER_PUSH = (7.0, 7.5)   # push onto the heating mantle
XRAY_ON = (7.5, 8.25)      # a scan line slices the mantle open: the coil inside
SWITCH = 9.0               # the dial clicks on; the indicator lights
GLOW = (9.25, 10.25)       # current warms the coil: dark red -> orange
HEAT_IN = (10.25, 12.25)   # heat waves soak from the hot bowl through the glass into the juice
JUMP = (11.5, 12.25)       # fast-forward: the juice warms up, the thermometer climbs
BOIL = 12.0                # the juice starts bubbling ("!")
EMOTE = (12.0, 12.9)
XRAY_OFF = (12.0, 12.5)    # the scan line closes the slice again
# ---- D. follow the vapour
SURFACE = (12.5, 13.25)    # up to the bubbling surface and the lower neck; hold (micro-shot A)
TILT = (15.0, 16.25)       # tilt up the neck with the vapour
TRACK = (16.25, 17.25)     # track right into the condenser's inner tube
CUT_ON = (17.0, 17.75)     # the glass rim wipes into the cutaway
# ---- E. why clear drops form
PATHS = (17.75, 19.75)     # the whole condenser in cutaway: two paths (micro-shot B)
HEAT_PUSH = (19.75, 20.5)  # push in on one section of the inner wall
HEAT = (20.5, 21.4)        # amber pulses cross the inner glass wall
BEADS = (21.5, 23.25)      # clear beads appear on the inner wall
MERGE = 23.75              # one bead slides into another ("tik")
FOLLOW = (24.25, 25.6)     # track the bigger drop downhill and out
DROP_FALL = (25.6, 26.0)   # it falls from the outlet ...
PLIP2 = 26.0               # ... and lands in the receiver ("plip")
# ---- F. payoff and loop
ITEM = (26.25, 28.0)       # "YOU GOT WATER-RICH DISTILLATE!"
COMPARE = (28.0, 28.75)    # zoom out to both flasks
LAPSE = (28.25, 29.5)      # time-lapse (fast-forward): purple a little lower, clear higher
CHIME = 29.5               # both liquids hold together: a two-note chime
LOOP_PUSH = (30.0, 31.0)   # push in on the next hanging drop ...
DISSOLVE = (31.0, 32.0)    # ... which fades into the grape (dithered opacity) and the film loops

FAST_FORWARD = (FF_POUR, JUMP, LAPSE)


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


def snap(u, s=1.25):
    """A game-camera move: quick start, a small overshoot, settle."""
    return back_out(ease_in_out(u, 1.4), s)


def drop_in(t, t0, height=60.0):
    """A part dropping into place on the beat: falls, lands at t0 + 0.18, bounces once, settles by t0 + 0.4.
    Returns the height above its place (mm), or None before it appears."""
    if t < t0 - 0.12:
        return None
    if t < t0 + 0.18:
        u = clamp01((t - (t0 - 0.12)) / 0.3)
        return height * (1 - u * u)
    u = clamp01((t - (t0 + 0.18)) / 0.22)
    return 5.0 * math.sin(math.pi * u) * (1 - u)


def lerp(a, b, u):
    return a + (b - a) * u


def anim(t, fps=15.0):
    """Sprite-animation time: ambient loops (bubbles, vapour, water, sparks) step on twos, like an 8-bit game."""
    return math.floor(t * fps) / fps


# the grape at t = 0 and the last hanging drop share one place on the canvas
MATCH_XY = (135.0, 200.0)
MATCH_R = 40.0
