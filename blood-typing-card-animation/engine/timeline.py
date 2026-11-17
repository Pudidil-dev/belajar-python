"""The clock and the choreography: every event on the 120 BPM grid (one bar = 2 s, 12 bars = 24 s, looping), the card
slide, the drops and droppers, the stepped time-lapse, the cameras, and where every cell and antibody is.

Two worlds:
  card space  canvas pixels at zoom 1, origin = card centre (the card is 220 x 290 px)
  cell space  canvas pixels at zoom 1, origin = between the two hero cells (a red blood cell has radius 22)
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM
BAR = 4 * BEAT
TOTAL = 24.0
FPS = 30

# ---------------------------------------------------------------- the card
CARD_HW, CARD_HH = 110, 145
SPOT_R = 42
FILL_R = 37
SPOTS = {'A': (-59, -62), 'B': (59, -62), 'D': (-59, 70), 'C': (59, 70)}
ORDER = ('A', 'B', 'D', 'C')
LABEL = {'A': 'Anti-A', 'B': 'Anti-B', 'D': 'Anti-D', 'C': 'Control'}
# dropper tip relative to the spot centre and tilt (deg): bottom spots are reached from the sides, so a dropper never
# hangs over another spot
TIP = {'A': (0, -34, 0.0), 'B': (0, -34, 0.0), 'D': (-7, -35, -55.0), 'C': (7, -35, 55.0)}

# ---------------------------------------------------------------- events (seconds)
LANDS = (0.5, 1.0, 1.5, 2.0)               # the four blood drops: plip, plip, plip, plip (on the beat)
FIRST_RELEASE = -0.22                      # the first drop is already falling on frame 0
FALL = 0.30
SAMPLE_OUT = (2.15, 2.55)
REAGENT_IN = (2.45, 2.85)
REAGENT_LANDS = (3.0, 3.5, 4.0, 4.5)       # Anti-A, Anti-B, Anti-D, Control solution: light taps
REAGENT_FALL = 0.24
REAGENT_OUT = (4.62, 5.0)
SWIRL = (4.55, 5.10)
GROW = (5.15, 5.30, 5.45, 5.60)            # stepped time-lapse: the clusters appear in four steps
PUSH = (5.85, 6.25)                        # a small push toward Anti-A
DIVE = (6.25, 7.35)                        # accelerate into the drop
CUT_IN = (7.35, 7.48)                      # stepped pixel cut: dark speck -> small group of cells
GLIDE = (7.48, 8.75)                       # glide past the group, stop on two separate cells
AB_IN = 9.0
BIND1 = 10.5                               # first antibody tip binds an A marker on cell 1: soft tik
C2_DRIFT = (11.5, 12.5)
BIND2 = 12.5                               # another tip binds cell 2: the bridge (sharper tik)
PULLBACK = (13.5, 16.0)
BRIDGES = (13.9, 14.3, 14.7, 15.1, 15.45, 15.8)    # more bridges: quiet ticks
CUT_B = 16.0                               # match cut to the Anti-B drop, same scale
B_PASS = (16.15, 17.55)
CELL_OUT = (17.15, 17.78)
CUT_OUT = (17.78, 17.91)                   # stepped pixel cut back to the (smooth) drop surface
CARD_PULL = (17.91, 19.0)
OUTLINE = (19.3, 19.4, 19.5, 19.6)         # the blocky outline around Anti-A, four steps
SHIFT = (19.95, 20.3)                      # the card moves down to make room for the result
HEAD = 20.45                               # "His blood type is"
A_POP = 20.75                              # the big A appears and scales up once ...
CHIME = 21.0                               # ... and settles on the two-note chime
SLIDE_OUT = (23.84, 24.0)                  # the card leaves; on the next downbeat a new card slides in

FLASH_FRAMES = 3


def clamp01(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def smoother(x):
    x = clamp01(x)
    return x * x * x * (x * (6 * x - 15) + 10)


def ease_out(x, p=2.0):
    return 1 - (1 - clamp01(x)) ** p


def ease_in(x, p=2.0):
    return clamp01(x) ** p


def frame(t):
    return int(math.floor(t * FPS + 1e-6))


# ---------------------------------------------------------------- card slide (stepped, frame by frame)
_IN_STEPS = (78, 40, 14, -4, 0)
_OUT_STEPS = (0, -20, -70, -150, -250)


def card_offset(t):
    f = frame(t)
    if f < len(_IN_STEPS):
        return _IN_STEPS[f]
    g = frame(t - SLIDE_OUT[0])
    if t >= SLIDE_OUT[0]:
        return _OUT_STEPS[min(g, len(_OUT_STEPS) - 1)]
    return 0


# ---------------------------------------------------------------- droppers and drops
def _tip(spot):
    sx, sy = SPOTS[spot]
    dx, dy, ang = TIP[spot]
    return sx + dx, sy + dy, ang


def sample_dropper(t):
    """(tip x, tip y, tilt) of the sample dropper in card space, or None when it is gone."""
    if t >= SAMPLE_OUT[1]:
        return None
    seq = [(-1.0, 'A'), (0.5, 'B'), (1.0, 'D'), (1.5, 'C')]
    cur = 'A'
    prev = None
    t_move = None
    for tm, sp in seq:
        if t >= tm:
            prev, cur, t_move = cur, sp, tm
    x, y, a = _tip(cur)
    if prev is not None and t_move is not None and t_move >= 0 and t < t_move + 0.13:
        px, py, pa = _tip(prev)
        u = [0.0, 0.45, 0.85, 1.0][min(3, frame(t - t_move))]       # a stepped hop to the next spot
        x, y, a = px + (x - px) * u, py + (y - py) * u, pa + (a - pa) * u
    if t >= SAMPLE_OUT[0]:
        u = ease_in((t - SAMPLE_OUT[0]) / (SAMPLE_OUT[1] - SAMPLE_OUT[0]))
        x, y = x + 120 * u, y - 260 * u
    return x, y, a


def blood_drops(t):
    """Falling blood drops: list of (x, y, size) in card space."""
    out = []
    for k, (sp, land) in enumerate(zip(ORDER, LANDS)):
        rel = FIRST_RELEASE if k == 0 else land - FALL
        if rel <= t < land:
            x, y, _ = _tip(sp)
            sx, sy = SPOTS[sp]
            u = (t - rel) / (land - rel)
            v = u if k == 0 else u * u                  # the first one is caught mid-fall
            out.append((x + (sx - x) * u, y + (sy - y) * v, 1.0))
    return out


def reagent_droppers(t):
    """Tip poses of the four reagent droppers (they enter together and leave together)."""
    if t < REAGENT_IN[0] or t >= REAGENT_OUT[1]:
        return []
    if t < REAGENT_IN[1]:
        u = 1 - ease_out((t - REAGENT_IN[0]) / (REAGENT_IN[1] - REAGENT_IN[0]))
    elif t >= REAGENT_OUT[0]:
        u = ease_in((t - REAGENT_OUT[0]) / (REAGENT_OUT[1] - REAGENT_OUT[0]))
    else:
        u = 0.0
    out = []
    for sp in ORDER:
        x, y, a = _tip(sp)
        out.append((sp, x + math.sin(math.radians(a)) * 0 - (60 if sp in 'AD' else -60) * u * 0.6,
                    y - 230 * u, a))
    return out


def reagent_drops(t):
    out = []
    for sp, land in zip(ORDER, REAGENT_LANDS):
        rel = land - REAGENT_FALL
        if rel <= t < land:
            x, y, _ = _tip(sp)
            sx, sy = SPOTS[sp]
            u = (t - rel) / REAGENT_FALL
            out.append((x + (sx - x) * u, y + (sy - y) * u * u))
    return out


def fill_radius(spot, t):
    land = LANDS[ORDER.index(spot)]
    if t < land:
        return 0.0
    return 5.0 + (FILL_R - 5.0) * ease_out((t - land) / 0.22, 3.0)


def ripple(spot, t):
    """Ring radius and age (0..1) of the landing ripple, or None."""
    land = LANDS[ORDER.index(spot)]
    e = (t - land) / 0.30
    if 0 <= e < 1:
        return 4 + 28 * ease_out(e), e
    return None


def glint(spot, t):
    land = REAGENT_LANDS[ORDER.index(spot)]
    return 0 <= t - land < 1.0 / FPS                       # one frame


def swirl(t):
    """0..1 strength of the brief mixing swirl inside each circle."""
    if not SWIRL[0] <= t < SWIRL[1]:
        return 0.0
    u = (t - SWIRL[0]) / (SWIRL[1] - SWIRL[0])
    return math.sin(math.pi * u)


def clump_stage(t):
    """0..4: the Anti-A clusters appear in four time-lapse steps (no texture before the reagents have reacted)."""
    return sum(1 for g in GROW if t >= g)


# ---------------------------------------------------------------- cameras
BASE = (0.0, 0.0, 1.0)
RESULT = (0.0, -42.0, 1.0)
SPECK = (SPOTS['A'][0] + 5.0, SPOTS['A'][1] + 3.0)     # the dark speck that becomes a group of cells
DIVE_Z = 15.0
B_SURF = (SPOTS['B'][0] - 4.0, SPOTS['B'][1] + 2.0)


def _lerp_cam(a, b, u):
    z = math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * u)
    w = (1 / z - 1 / a[2]) / (1 / b[2] - 1 / a[2]) if abs(b[2] - a[2]) > 1e-9 else u
    return a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, z


def card_camera(t):
    """Camera over the card (card space), or None while the cellular view is on screen."""
    if t < PUSH[0]:
        return BASE
    if t < PUSH[1]:
        return _lerp_cam(BASE, (-18.0, -22.0, 1.25), smoother((t - PUSH[0]) / (PUSH[1] - PUSH[0])))
    if t < CUT_IN[1]:
        u = (t - DIVE[0]) / (DIVE[1] - DIVE[0])
        a = (-18.0, -22.0, 1.25)
        c = (SPOTS['A'][0], SPOTS['A'][1], 2.4)
        if u < 0.3:                                        # centre Anti-A while starting to accelerate
            return _lerp_cam(a, c, smooth(u / 0.3))
        v = ease_in((u - 0.3) / 0.7, 2.2)
        z = math.exp(math.log(2.4) + (math.log(DIVE_Z) - math.log(2.4)) * v)
        w = (1 / z - 1 / 2.4) / (1 / DIVE_Z - 1 / 2.4)
        return c[0] + (SPECK[0] - c[0]) * w, c[1] + (SPECK[1] - c[1]) * w, z
    if t < CUT_OUT[0]:
        return None
    if t < CARD_PULL[1]:
        u = ease_out((t - CUT_OUT[0]) / (CARD_PULL[1] - CUT_OUT[0]), 2.6)
        return _lerp_cam((B_SURF[0], B_SURF[1], 7.0), BASE, u)
    if t < SHIFT[0]:
        return BASE
    if t < SHIFT[1]:
        u = smoother((t - SHIFT[0]) / (SHIFT[1] - SHIFT[0]))
        return 0.0, round(RESULT[1] * u), 1.0
    return RESULT


# ---------------------------------------------------------------- the cellular world
R_CELL = 22
TAB_N = 12                                 # A markers at every 30 deg (all cells), so bridges can line up exactly
TAB_LEN = 3
AB_REACH = 19                              # hub centre to a binding tip
GAP = 2 * (R_CELL + TAB_LEN) + 2 * AB_REACH       # centre distance of two bridged cells (88)

C1 = (-36.0, 0.0)
C2_START, C2_END = (70.0, 16.0), (52.0, 0.0)
GROUP = (-185.0, -130.0)                   # the small clump the dark speck turns into
CELL_CAM_START = (GROUP[0] + 44.0, GROUP[1] + 25.0, 0.55)
CELL_CAM = (8.0, 0.0, 1.0)
CELL_CAM_WIDE = (8.0, 8.0, 0.5)


def _dir(deg):
    a = math.radians(deg)
    return math.cos(a), math.sin(a)


# neighbours that join the clump: (partner, direction deg from partner, bridge time)
NEIGHBOURS = [('C1', 240, BRIDGES[0]), ('C2', 300, BRIDGES[1]), ('C1', 120, BRIDGES[2]),
              ('C2', 60, BRIDGES[3]), ('C1', 180, BRIDGES[4]), ('C2', 0, BRIDGES[5])]
# loose cells further out (they stay put; some are visible when the camera pulls back)
LOOSE = [(-150, -110), (170, -120), (-170, 120), (180, 135), (5, -170), (20, 175), (-230, 10), (250, -20)]
# the group at the start of the glide (relative to GROUP), already bridged
GROUP_CELLS = [(0, 0), (GAP, 0), (GAP / 2, GAP * 0.866), (-GAP / 2, GAP * 0.866), (GAP / 2, -GAP * 0.866)]
GROUP_BRIDGES = [(0, 1), (0, 2), (1, 2), (0, 3), (0, 4)]


def c2_pos(t):
    if t < C2_DRIFT[0]:
        bob = 1.5 * math.sin(t * 1.7)
        return C2_START[0], C2_START[1] + bob
    u = smoother((t - C2_DRIFT[0]) / (C2_DRIFT[1] - C2_DRIFT[0]))
    bob = 1.5 * math.sin(C2_DRIFT[0] * 1.7) * (1 - u)
    return C2_START[0] + (C2_END[0] - C2_START[0]) * u, C2_START[1] + bob + (C2_END[1] - C2_START[1]) * u


def neighbour_pos(k, t, bridged=True):
    partner, deg, tb = NEIGHBOURS[k]
    px, py = C1 if partner == 'C1' else C2_END
    dx, dy = _dir(deg)
    end = (px + dx * GAP, py + dy * GAP)
    start = (px + dx * (GAP + 46), py + dy * (GAP + 46) + 10 * math.sin(k * 1.9))
    if not bridged:
        bob = 3.0 * math.sin(t * 1.1 + k)
        return start[0] + bob, start[1] - bob
    u = smoother((t - (tb - 0.7)) / 0.7)
    return start[0] + (end[0] - start[0]) * u, start[1] + (end[1] - start[1]) * u


def hero_antibody(t):
    """Anti-A antibody hub (x, y) and rotation (rad) in cell space; it binds at BIND1 and then stays."""
    end = (C1[0] + R_CELL + TAB_LEN + AB_REACH, 0.0)
    if t >= BIND1:
        return end, 0.0
    u = ease_out((t - AB_IN) / (BIND1 - AB_IN), 2.4)
    sx, sy = 46.0, -150.0
    wob = 3.0 * math.sin(t * 3.1) * (1 - u)
    return (sx + (end[0] - sx) * u + wob, sy + (end[1] - sy) * u), 0.9 * (1 - u) + 0.15 * math.sin(t * 2.3) * (1 - u)


def bridge_antibody(k, t):
    """Antibody of the k-th extra bridge: drifts in, binds both cells at its bridge time."""
    partner, deg, tb = NEIGHBOURS[k]
    px, py = C1 if partner == 'C1' else C2_END
    dx, dy = _dir(deg)
    mid = (px + dx * GAP / 2, py + dy * GAP / 2)
    if t >= tb:
        return mid, math.radians(deg)
    u = ease_out((t - (tb - 0.6)) / 0.6, 2.0)
    side = (-dy, dx)
    st = (mid[0] + side[0] * 70, mid[1] + side[1] * 70)
    return (st[0] + (mid[0] - st[0]) * u, st[1] + (mid[1] - st[1]) * u), math.radians(deg) + 0.8 * (1 - u)


def anti_b(t):
    """Anti-B antibody passing through the Anti-B scene without attaching."""
    u = (t - B_PASS[0]) / (B_PASS[1] - B_PASS[0])
    x = -10 + 50 * u + 6 * math.sin(u * 7)
    y = -170 + 340 * u
    return (x, y), 0.4 + 1.6 * u


def cell_camera(t):
    if t < CUT_IN[0]:
        return None
    if t < GLIDE[1]:
        u = smoother((t - GLIDE[0]) / (GLIDE[1] - GLIDE[0]))
        return _lerp_cam(CELL_CAM_START, CELL_CAM, u)
    if t < PULLBACK[0]:
        return CELL_CAM
    if t < CUT_B:
        return _lerp_cam(CELL_CAM, CELL_CAM_WIDE, smoother((t - PULLBACK[0]) / (PULLBACK[1] - PULLBACK[0])))
    if t < CELL_OUT[0]:
        return CELL_CAM
    if t < CUT_OUT[1]:
        u = ease_in((t - CELL_OUT[0]) / (CELL_OUT[1] - CELL_OUT[0]), 1.8)
        return _lerp_cam(CELL_CAM, (8.0, 0.0, 0.28), u)
    return None


def in_cells(t):
    return CUT_IN[1] <= t < CUT_OUT[0]


def which_drop(t):
    return 'A' if t < CUT_B else 'B'
