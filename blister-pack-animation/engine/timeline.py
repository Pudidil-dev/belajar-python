"""The film's clock (120 BPM, 20 s = 10 bars) and the whole story laid out on it, in one place.

Story time S = film time t. The hook (S in [0, 2)) is the moment right after the end: the thumb has just pushed the
capsule through the foil, so the last frame (the foil bulging under the thumb) runs straight into the first (the pop).

The blister line runs from the top of the screen to the bottom (a top-down, 3/4 RPG view). The clear film web moves
at a constant V mm/s, so one row of pockets passes any point every 16th note: the forming puffs, the pills dropping,
the scanner ticks and the punch all fall on the beat grid by construction. A web point with coordinate v (mm, along
the web, larger = further ahead) is at world y = -(v + web(S)). Each station sits where the hero's pocket passes it
at the right moment, so the stations' positions are derived from the story times below.
"""
import math

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
STEP = BEAT / 4            # one 16th = 0.125 s
TOTAL = 20.0

# ---------------------------------------------------------------- the hook
POP = 0.0                  # the foil bursts (the first frame)
FREEZE = (0.2, 0.6)        # the capsule slows to a near stop in mid-air
DIALOG = (0.25, 1.97)      # the RPG text box
LINE1 = 0.34               # "HOW DID I GET HERE?" types from here (30 letters a second)
LINE2 = 1.14               # "...REWIND!"
REW = (1.62, 2.0)          # the tape glitch back in time

# ---------------------------------------------------------------- the shots (hard cuts on the beat)
SHOTS = (('hook', 0.0), ('mold', 2.0), ('fill', 4.0), ('scan', 8.0), ('seal', 11.0), ('cut', 13.0))
STAGES = (('STAGE 1', 'MOLD', 2.0), ('STAGE 2', 'FILL', 4.0), ('STAGE 3', 'SCAN', 8.0), ('STAGE 4', 'SEAL', 11.0),
          ('STAGE 5', 'CUT', 13.0))
PACKED = 14.32            # the hero's card lands on the stack
WARN = (15.0, 16.0)        # the boss is coming
FINAL = 16.0

# ---------------------------------------------------------------- the parts (mm)
V = 120.0                  # web speed: 15 mm per 16th note
ROW = 15.0                 # row pitch along the web
ROWS = 4
COLS = (-11.0, 11.0)       # the two columns of pockets
CARD_L = ROWS * ROW        # 60 mm along the web
CARD_W = 50.0
WEB_HALF = 30.0
POCKET = (9.0, 3.9)        # half-size of a pocket (across, along the web)
POCKET_D = 4.6             # depth
CAP_L = 15.0               # capsule length
CAP_R = 2.75               # capsule radius
HERO = (0, 1, 1)           # card, row, column of the hero's pocket
MISS = (1, 2, 0)           # the pocket the feeder misses (in the card ahead)
REJECT_CARD = MISS[0]

# when the hero's pocket passes each station
T_FORM = 3.25
T_LAND = 6.75
T_SCAN = 10.0
T_SEAL = 12.0
T_CUT = 14.0
STOP = (14.0, 14.3)        # the line winds down after the hero's card is cut
FALL = 0.22                # a pill's fall from the funnel into its pocket

# ---------------------------------------------------------------- the final boss
HAND_IN = (16.0, 16.65)
GRAB = 16.75
LIFT = (16.85, 17.85)
PRESS = (18.1, 20.0)
Z_HELD = 150.0             # how high the card is held (the camera looks down from Z_CAM)
Z_CAM = 320.0


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


def pulse(t, t0, dur):
    u = (t - t0) / dur
    return 0.0 if u < 0 or u >= 1 else 1.0 - u


# ---------------------------------------------------------------- the web
def web(S):
    """How far the web has moved (mm). Constant speed, then a wind-down once the hero's card is cut."""
    if S < STOP[0]:
        return V * S
    if S < STOP[1]:
        u = (S - STOP[0]) / (STOP[1] - STOP[0])
        return V * STOP[0] + V * (STOP[1] - STOP[0]) * (u - 0.5 * u * u)
    return V * STOP[0] + 0.5 * V * (STOP[1] - STOP[0])


def pocket_v(card, row):
    return CARD_L * card + ROW * (row + 0.5)


def card_v(card):
    """Web coordinate of a card's centre."""
    return CARD_L * card + CARD_L / 2


def y_of(v, S):
    return -(v + web(S))


def cross(v, y_line):
    """When web point v reaches the station line y_line (while the line still runs)."""
    return (-y_line - v) / V


_HV = pocket_v(HERO[0], HERO[1])
Y_FORM = y_of(_HV, T_FORM)          # the forming nozzles
Y_DROP = y_of(_HV, T_LAND)          # the feeder's drop line
Y_SCAN = y_of(_HV, T_SCAN)          # the scanner's laser line
Y_SEAL = y_of(_HV, T_SEAL)          # the heated sealing roller
Y_PRESS = y_of(card_v(HERO[0]), T_CUT)   # the punch (centred on a card when it strikes)


def formed(v, S):
    """How far the pocket at web coordinate v has been blown into shape (0..1, overshooting a little)."""
    t0 = cross(v, Y_FORM)
    if S < t0:
        return 0.0
    u = (S - t0) / 0.14
    return 1.0 if u >= 1 else back_out(u, 2.0)


def land_time(card, row):
    return cross(pocket_v(card, row), Y_DROP)


def has_pill(card, row, col, S):
    if (card, row, col) == MISS:
        return False
    return S >= land_time(card, row)


def scan_time(card, row):
    return cross(pocket_v(card, row), Y_SCAN)


def strike_time(card):
    return cross(card_v(card), Y_PRESS)


def is_cut(card, S):
    t = strike_time(card)
    return t <= STOP[0] + 1e-6 and S >= t


def die_down(S):
    """How far the punch's die is down (0..1): it strikes once per card, on the beat."""
    if S > STOP[0] + 0.3:
        return 0.0
    c = math.floor((-Y_PRESS - web(S) - CARD_L / 2) / CARD_L + 0.5)
    k = 0.0
    for cc in (c - 1, c, c + 1):
        t = strike_time(cc)
        if t > STOP[0] + 1e-6:
            continue
        u = S - t
        if -0.05 <= u < 0:
            k = max(k, (u + 0.05) / 0.05)
        elif 0 <= u < 0.05:
            k = 1.0
        elif 0.05 <= u < 0.2:
            k = max(k, 1 - (u - 0.05) / 0.15)
    return k


# the stack at the end of the line: a few cards already there, then the cards cut on screen land on it
STACK_BASE = 4
HOP = 0.32                 # a cut card's hop from the die onto the stack


def stack_cards(S):
    """Cards on the stack (bottom first) at story time S: base cards (None), then the cut cards that have landed."""
    if S < 2.0:
        S = TOTAL
    out = [None] * STACK_BASE
    for c in (2, 0):
        if S >= strike_time(c) + HOP:
            out.append(c)
    if S >= GRAB:
        out = [c for c in out if c != HERO[0]]
    return out


def press(S):
    """How far the thumb has pushed the hero's pocket up under the foil (0..1); 1 at the end and through the hook."""
    if S < 2.0:
        return 1.0
    return ease_in(u_of(S, PRESS), 1.7)


def tau(S):
    """Time as the frozen hook feels it: normal at first, then slowed to a near stop."""
    a, b = FREEZE
    if S < a:
        return S
    u = clamp01((S - a) / (b - a))
    return a + (b - a) * (u - 0.5 * u * u * 0.95) + max(0.0, S - b) * 0.045


def shot(S):
    name = SHOTS[0][0]
    for n, t0 in SHOTS:
        if S >= t0:
            name = n
    return name


def env_time(S):
    """The clock for idle motion (glints, blinking lights): story time, slowed with the freeze in the hook."""
    return S if S >= 2.0 else TOTAL + tau(S)
