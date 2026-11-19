"""The film's clock (120 BPM, 20 s = 10 bars) and the whole story laid out on it, in one place.

Story time S. The frames at t in [0, 2) and [4, 20) show story time S = t. The hook, S in [0, 2), is the moment right
after the end: the thumb has just pushed the capsule out, so the last frame (the thumb pressing) runs straight into the
first (the pop). During the rewind, t in [2, 4), the film plays the story backward at speed, from S = 2 back through the
loop point (0 = 20) to S = 4, so the whole line is previewed in reverse before the levels start.

The machine is one long side view in millimetres: the film web runs left to right at height WEB_Y. The web's position
W(S) (how far it has moved) is a set of smooth keyframes chosen so that the hero's pocket reaches every station on the
beat. The stations' x positions are derived from those keyframes, so they stay consistent with the motion.
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
STEP = BEAT / 4            # one 16th = 0.125 s
TOTAL = 20.0

# ---------------------------------------------------------------- the beats
POP = 0.0                  # the foil bursts (the first frame)
HOOK_TEXT = (0.22, 0.55)   # "HOW DID I" / "GET IN HERE?"
FREEZE = (0.3, 0.8)        # the capsule slows to a near freeze in mid-air
REW_CUE = 1.6              # the rewind icon blinks in
REWIND = (2.0, 4.0)
LV = (4.0, 6.0, 8.0, 10.0, 12.0, 14.0)      # LV.1 .. LV.6
LV_NAMES = ('LV.1 POCKETS', 'LV.2 LINE UP', 'LV.3 DROP', 'LV.4 SCAN', 'LV.5 SEAL', 'LV.6 CUT')
FINAL = 16.0

# LV.1: the film softens between hot plates, the mould clamps, air puffs the hero's card into shape, pocket by pocket
CLAMP = 4.5
PUFFS = (4.75, 5.0, 5.25, 5.5, 5.75)        # pockets k = 0..4 of the hero's card (the hero's pocket, k = 3, at 5.5)
OPEN = 5.85
# LV.4: a line-scan camera: the web runs under it one pocket per 16th, the card ahead (one empty pocket) first
SCAN_REJ = (10.375, 10.5, 10.625, 10.75, 10.875)    # the last one is the empty pocket
SCAN_HERO = (11.0, 11.125, 11.25, 11.375, 11.5)
VERDICT_REJ = 10.875
VERDICT_PASS = 11.625
SCAN_ON = (10.3, 11.6)
# LV.5: the shield
BLOCKS = (13.5, 13.75)
# LV.6: the punch
THUNK_REJ = 14.5
THUNK_HERO = 15.0
BLAST = 14.57              # the air jet blows the rejected card into the bin
BIN_LAND = 14.85
STACK_LAND = 15.18
# the final boss: a hand takes the hero's card off the stack, a thumb comes up under the hero's pocket and presses
HAND_IN = (16.0, 16.5)
GRAB = 16.5
LIFT = (16.6, 17.4)
THUMB_IN = (17.55, 18.55)
PRESS = (18.6, 20.0)

# ---------------------------------------------------------------- the parts (mm)
WEB_Y = 100.0              # the top of the film
PITCH = 20.0               # pocket pitch along the web
NPOCK = 5                  # pockets per card (one row seen from the side)
CARD = PITCH * NPOCK       # 100 mm
POCKET_HALF = 8.2          # half the pocket's inside length
POCKET_D = 6.6             # pocket depth below the film
CAP_L = 14.0               # capsule length
CAP_R = 2.9                # capsule radius
HERO_K = 3                 # the hero's pocket (web coordinate u = 70), in card 0
MISS_K = 5                 # the pocket that passes by empty, in card 1 (the card ahead)
HERO_CARD = 0
REJECT_CARD = 1
V1 = 80.0                  # web speed while the feeder drops (one pocket per 8th note) and under the sealing roller
V2 = 160.0                 # web speed under the inspection camera: one pocket per 16th note
LANE_SLOTS = 7
STACK_PITCH = 7.6
STACK_Y0 = 12.0            # the stack tray's top


def pocket_u(k):
    """Web coordinate of pocket k's centre (u = 0 is the hero's card's left end)."""
    return 10.0 + PITCH * k


def card_of(k):
    return int(math.floor(k / NPOCK))


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


def pulse(t, t0, dur):
    """1 at t0, fading to 0 over dur (0 outside)."""
    u = (t - t0) / dur
    return 0.0 if u < 0 or u >= 1 else 1.0 - u


# ---------------------------------------------------------------- the web's motion
def _keys():
    w9 = -70.0                                   # 9.25 s: the hero's pocket (u = 70) is under the gate (x = 0)
    w69 = w9 - V1 * (9.25 - 6.9)                 # constant speed while the feeder drops
    wf = w69 - 0.5 * V1 * 0.9                    # the forming dwell, then a 0.9 s run-up
    w101 = w9 + V1 * (10.1 - 9.25)
    wa = w101 + 0.5 * (V1 + V2) * 0.2            # up to scanning speed
    wb = wa + V2 * 1.3                           # both cards run under the camera
    wc = wb + 0.5 * (V1 + V2) * 0.55             # back down to sealing speed
    wd = wc + V1 * 1.25                          # the hero's card rolls under the sealing roller
    we = wd + 0.5 * V1 * 0.2                     # stop: the card ahead in the punch
    wg = we + CARD                               # index: the hero's card in the punch
    keys = [(4.0, wf, 0.0), (6.0, wf, 0.0), (6.9, w69, V1), (10.1, w101, V1), (10.3, wa, V2), (11.6, wb, V2),
            (12.15, wc, V1), (13.4, wd, V1), (13.6, we, 0.0), (14.6, we, 0.0), (14.85, wg, 0.0), (TOTAL, wg, 0.0)]
    return keys, wa, wc, we


WKEYS, _WA, _WC, _WE = _keys()
W_F = WKEYS[0][1]
W_END = WKEYS[-1][1]
XD = 0.0                                         # the feeder's gate: pills drop here
XF = W_F + CARD / 2                              # the forming mould's centre (the hero's card sits in it)
XI = _WA + V2 * (SCAN_REJ[0] - 10.3) + (10.0 + PITCH * 9)   # the line-scan camera: pocket 9 passes it at SCAN_REJ[0]
XS = _WC + CARD                                  # the sealing roller's contact line
XP = _WE + CARD * REJECT_CARD + CARD / 2         # the punch (the card ahead stops in it)


def web(S):
    """How far the web has moved (mm) at story time S. The hook (S < 2) is the end state."""
    if S < WKEYS[0][0]:
        return W_END
    for (t0, w0, v0), (t1, w1, v1) in zip(WKEYS, WKEYS[1:]):
        if S <= t1:
            h = t1 - t0
            u = (S - t0) / h
            return ((2 * u ** 3 - 3 * u ** 2 + 1) * w0 + (u ** 3 - 2 * u ** 2 + u) * h * v0
                    + (-2 * u ** 3 + 3 * u ** 2) * w1 + (u ** 3 - u ** 2) * h * v1)
    return W_END


_SG = np.arange(4.0, TOTAL + 1e-9, 0.0005)
_WG = np.maximum.accumulate(np.array([web(s) for s in _SG]))


def when_web(w):
    """The first story time at which the web has moved w (None if before the story, inf if never)."""
    if w <= _WG[0]:
        return None
    i = int(np.searchsorted(_WG, w))
    if i >= len(_SG):
        return math.inf
    return float(_SG[i])


# ---------------------------------------------------------------- the feeder: which pocket gets which pill, when
def land_time(k):
    """When a pill lands in pocket k (it passes under the gate then): None = filled before the story."""
    return when_web(XD - pocket_u(k))


K_TOP = int(math.floor((XD - W_F - 10.0) / PITCH))       # the first pocket the story fills
K_LAST = int(math.floor((XD - W_END - 10.0) / PITCH)) + 1  # the last one
QUEUE = []                                               # (k, landing time, kind) in order: 'pill', 'gap', 'hero'
for _k in range(K_TOP, K_LAST - 1, -1):
    _t = land_time(_k)
    if _t is None or _t == math.inf:
        continue
    QUEUE.append((_k, _t, 'gap' if _k == MISS_K else 'hero' if _k == HERO_K else 'pill'))
FALL = 0.2                                               # tip-off to landing
SHIFT = 0.12                                             # the queue closes up after each release
_REL = np.array([q[1] - FALL for q in QUEUE])
HERO_J = [q[2] for q in QUEUE].index('hero')
GAP_J = [q[2] for q in QUEUE].index('gap')
HERO_LAND = QUEUE[HERO_J][1]
MISS_TIME = QUEUE[GAP_J][1]


def released(S):
    """Smoothed count of releases so far: slot positions move by one over SHIFT seconds after each release."""
    u = np.clip((S - _REL) / SHIFT, 0.0, 1.0)
    return float(np.sum(u * u * (3 - 2 * u)))


def slot(j, S):
    """Lane slot of queue item j (0 = at the gate); negative once it has been released."""
    return j - released(S)


def pill_in(k, S):
    """Is there a pill resting in pocket k (on the web) at story time S?"""
    if k == MISS_K:
        return False
    t = land_time(k)
    return t is None or S >= t


# ---------------------------------------------------------------- the forming, the seal, the cuts
def formed(k, S):
    """How far pocket k has been blown into shape (0 flat .. 1, with a little overshoot)."""
    c = card_of(k)
    if c > HERO_CARD or S < 2.0:
        return 1.0
    if c == HERO_CARD:
        t0 = PUFFS[k - NPOCK * HERO_CARD]
        if S < t0:
            return 0.0
        u = (S - t0) / 0.16
        return 1.0 if u >= 1 else back_out(u, 2.2)
    return 1.0 if pocket_u(k) + web(S) >= XF + CARD / 2 + POCKET_HALF else 0.0


def sealed_from(S):
    """Web coordinate u from which the web is sealed (everything with u + W >= XS)."""
    return XS - web(S)


def cut_time(c):
    """When card c is punched out (None: before the story)."""
    if c == REJECT_CARD:
        return THUNK_REJ
    if c == HERO_CARD:
        return THUNK_HERO
    t = when_web(XP - (CARD * c + CARD / 2))
    return t


STACKED = sorted([c for c in range(REJECT_CARD + 1, 40) if cut_time(c) is not None], key=lambda c: cut_time(c))


def stack_cards(S):
    """The cards on the stack at story time S, bottom first (the hero's card while it is there)."""
    if S < 2.0:
        S = TOTAL
    out = [c for c in STACKED if cut_time(c) <= S]
    if THUNK_HERO <= S < GRAB:
        out.append(HERO_CARD)
    return out


def stack_top(n):
    """Film level of the n-th card from the bottom of the stack."""
    return STACK_Y0 + POCKET_D + 0.8 + n * STACK_PITCH


# ---------------------------------------------------------------- the hand at the end
def press(S):
    """How far the thumb has pushed the hero's dome in (0..1); 1 at the end and through the hook."""
    if S < 2.0:
        return 1.0
    return ease_in(u_of(S, PRESS), 1.6)


# ---------------------------------------------------------------- the hook: a freeze-frame flight
def tau(S):
    """Time as the frozen world feels it during the hook: normal at first, then slowed to a near freeze."""
    if S < FREEZE[0]:
        return S
    a, b = FREEZE
    u = clamp01((S - a) / (b - a))
    return a + (b - a) * (u - 0.5 * u * u * 0.94) + max(0.0, S - b) * 0.06


def flight(S):
    """(dx, dy, spin_deg) of the popped capsule from its pocket, S in [0, 2): it shoots up, then hangs in mid-air."""
    tt = tau(S)
    v0, g = 190.0, 400.0
    return -30.0 * tt, v0 * tt - 0.5 * g * tt * tt, -700.0 * tt


def env_time(S):
    """The clock for background motion (pipes, gauges, fans): story time, slowed with the freeze in the hook."""
    return S if S >= REWIND[0] else TOTAL + tau(S)


# ---------------------------------------------------------------- the rewind
def rewind_source(t):
    """Story time shown at film time t during the rewind: from 2 back through the loop point to 4, slow-fast-slow."""
    u = clamp01((t - REWIND[0]) / (REWIND[1] - REWIND[0]))
    eps = 1e-3                                   # stay inside the hook and the story (S never in [2, 4))
    back = (REWIND[0] + TOTAL - REWIND[1] - 2 * eps) * ease_in_out(u, 2.5)
    S = REWIND[0] - eps - back
    return S + TOTAL if S < 0 else S


def story(t):
    """Story time for film time t."""
    if REWIND[0] <= t < REWIND[1]:
        return rewind_source(t)
    return t
