"""The clock, the clinic layout and the choreography (120 BPM, one bar = 2 s, 24 bars = 48 s, looping).

World space (canvas px at zoom 1, y down): the reclining donor on the left, the apheresis machine on the right, the
tubing between them. The machine works in two phases through one needle: DRAW (blood goes from the arm to the
machine) and RETURN (the remaining blood goes back along the same tube); they never happen at the same instant.
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM
BAR = 4 * BEAT
TOTAL = 48.0
FPS = 30

# ---------------------------------------------------------------- events (seconds)
# Close-ups open and close through a round magnifier lens (start, fully open, closing, closed), never a hard flash.
TRACK = (1.0, 4.4)                 # hold on the arm, then follow the blood along the tube
STREAM = (4.4, 5.4, 9.6, 10.6)     # lens into the tube, the stream, lens back out onto the blood pump
PUMP_HOLD = (10.6, 14.4)
TO_JUNCTION = (14.4, 15.6)         # glide to the anticoagulant pump and the Y fitting, then hold
MOLECULE = (16.6, 17.6, 20.0, 21.0)
BIND = 18.6                        # citrate closes on a calcium ion: tik
TO_SPIN = (21.0, 22.2)             # follow the blood into the centrifuge
SPIN_UP = (22.2, 24.2)             # pull out to the whole machine while the rotor spins up
INTO_CHANNEL = (24.2, 25.4)        # slow push into the lid
SEPARATE = (25.4, 26.4, 33.4, 34.4)   # lens into the channel, separation, lens out
SEP_PROGRESS = (27.2, 30.4)
DIVERT = (30.4, 33.4)              # the platelet band takes its own exit
TO_BAG = (34.4, 36.4)
BAG_FILL = (34.8, 40.0)
BAG_CALLOUT = (37.4, 40.0)         # magnifier bubble on what is in the bag
RETURN = (40.0, 45.0)              # the single needle switches to RETURN, then back to DRAW
RETURN_CALLOUT = (41.0, 42.6)      # magnifier bubble on what goes back
REVEAL = (45.0, 46.6)
WIDE_AT = 45.8                     # the pull-out lands on the wide shot here and holds it until BACK
BACK = (46.6, 48.0)
REWARD = 39.4
SUCCESS = 45.6


def clamp01(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def smoother(x):
    x = clamp01(x)
    return x * x * x * (x * (6 * x - 15) + 10)


def frame(t):
    return int(math.floor(t * FPS + 1e-6))


def returning(t):
    return RETURN[0] <= t % TOTAL < RETURN[1]


# ---------------------------------------------------------------- the clinic layout (world space)
# The machine is a generic bedside console (no brand): a wide, low cabinet in a 3/4 view from slightly above. Its top
# carries the round centrifuge lid, the touchscreen on a post and two IV poles; the sloped front deck carries the
# anticoagulant pump (blue rotor, left) and the blood pump (red rotor, right), pinch clamps and, in a recess below,
# a drip chamber on the donor line.
FLOOR = 214
NEEDLE = (-104.0, 121.0)
CAB = (30.0, 154.0)                # cabinet left / right edge
TOP_Y, DECK_Y, CREASE_Y, BASE_Y = 80.0, 106.0, 156.0, 205.0   # top surface (back edge), deck, crease, bottom
PUMP = (128.0, 124.0)              # blood pump (red rotor)
AC_PUMP = (56.0, 124.0)            # anticoagulant pump (blue rotor)
PUMP_R = 10.0                      # raceway radius: the tube runs round the rotor here
ROLLER_R = 7.0                     # roller centres
JUNCTION = (92.0, 110.0)           # the anticoagulant line joins the blood line here (Y fitting)
CENTRIFUGE = (92.0, 93.0)          # centre of the round centrifuge lid on top of the cabinet
BAY_R = 30.0                       # lid window radius (horizontal)
LID_K = 0.34                       # the lid is a circle seen from above at a low angle: vertical squash
SCREEN = (62.0, 22.0, 122.0, 66.0) # touchscreen bezel
POLES = (34.0, 150.0)              # IV poles at the back corners
POLE_TOP = -20.0
AC_BAG = (26.0, 12.0)              # anticoagulant bag (left pole)
AC_W, AC_H = 20.0, 32.0
BAG = (158.0, 16.0)                # platelet collection bag centre (right pole)
BAG_W, BAG_H = 24.0, 44.0
FILTER = (92.0, 166.0, 194.0)      # drip chamber in the front recess: x, top, bottom
CLAMPS = ((92.0, 152.0), (92.0, 143.0))   # pinch clamps on the donor line


def _catmull(pts, n=12):
    pts = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = (np.array(pts[i + k], float) for k in (-1, 0, 1, 2))
        for j in range(n):
            u = j / n
            out.append(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    out.append(np.array(pts[-2], float))
    return np.array(out)


def _resample(pts, step=0.6):
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(pts, axis=0).T))]
    s = np.arange(0, d[-1], step)
    return np.stack([np.interp(s, d, pts[:, 0]), np.interp(s, d, pts[:, 1])], 1), s


def _arc(c, r, a0, a1, n=40):
    return [(c[0] + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)),
             c[1] + r * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]


# the donor line: needle -> along the arm -> a soft sag to the machine -> up through the drip chamber and the clamps ->
# into the blood pump at the bottom of its raceway
_DRAW_IN = [NEEDLE, (-95, 118.2), (-86, 116.4), (-76, 114.9), (-66, 115.2), (-57, 117.2), (-48, 122.0), (-36, 133),
            (-22, 149), (-8, 166), (12, 188), (38, 200), (64, 204), (82, 203), (90, 199.5), (FILTER[0], FILTER[2] + 1.0)]
_DRAW_UP = [(FILTER[0], FILTER[2] + 1.0), (FILTER[0], 141.0)]
_DRAW_TURN = [(FILTER[0], 141.0), (93.0, 137.5), (100.0, 134.8), (112.0, 134.1), (PUMP[0], PUMP[1] + PUMP_R)]
# blood pump raceway: bottom -> right -> top (counter-clockwise on screen); out at the top, left to the junction
_PUMP_ARC = _arc(PUMP, PUMP_R, 90, -90, 40)
_TO_JUNCTION = [(PUMP[0], PUMP[1] - PUMP_R), (118, 113.8), (106, 112.4), (98, 111), JUNCTION]
_TO_CENTRIFUGE = [JUNCTION, (CENTRIFUGE[0], CENTRIFUGE[1] + 1.0)]
# anticoagulant: bag -> down the left pole -> into its pump at 9 o'clock -> round the bottom -> up to the junction
_AC_IN = [(AC_BAG[0], AC_BAG[1] + AC_H / 2 + 2), (AC_BAG[0] + 1, 60), (31, 92), (40, 104), (45.4, 110),
          (AC_PUMP[0] - PUMP_R, AC_PUMP[1])]
_AC_ARC = _arc(AC_PUMP, PUMP_R, 180, 0, 40)
_AC_OUT = [(AC_PUMP[0] + PUMP_R, AC_PUMP[1]), (66.3, 117), (70, 112.6), (80, 110.6), JUNCTION]
# platelets: out of the centrifuge hub, over the back of the lid, up beside the screen to the bag on the right pole
_PLT_LINE = [(CENTRIFUGE[0] + 2, CENTRIFUGE[1] - 1), (108, 88), (124, 84), (134, 72), (139, 48), (142, 20),
             (145, -2), (150, -9), (BAG[0] - 4, BAG[1] - BAG_H / 2 + 1)]


def _path(*parts):
    pts = []
    for part in parts:
        c = _catmull(part) if len(part) > 2 else np.array(part, float)
        pts.extend(c if not pts else c[1:])
    return _resample(np.array(pts))


PATHS = {
    'draw1': _path(_DRAW_IN, _DRAW_UP, _DRAW_TURN),
    'pump': _resample(np.array(_PUMP_ARC, float)),
    'draw2': _path(_TO_JUNCTION),
    'draw3': _path(_TO_CENTRIFUGE),
    'ac': _path(_AC_IN),
    'acpump': _resample(np.array(_AC_ARC, float)),
    'ac2': _path(_AC_OUT),
    'plt': _path(_PLT_LINE),
}


def _first_fraction(name, test):
    pts, s = PATHS[name]
    for i, (x, y) in enumerate(pts):
        if test(x, y):
            return i / (len(pts) - 1)
    return 1.0


F_DIVE = _first_fraction('draw1', lambda x, y: x >= -16.0)       # where the camera dives into the tube
F_FILTER = _first_fraction('draw1', lambda x, y: x >= FILTER[0] - 0.5)


def path_point(name, f):
    """Point at fraction f (0..1) along a tube."""
    pts, s = PATHS[name]
    i = int(clamp01(f) * (len(pts) - 1))
    return float(pts[i][0]), float(pts[i][1])


# ---------------------------------------------------------------- machine motion
def _integral(fn, t, n=400):
    xs = np.linspace(0, t, n)
    return float(np.trapz([fn(x) for x in xs], xs)) if t > 0 else 0.0


def pump_speed(t):
    """Blood pump rotor (turns per second, + = clockwise on screen). Two rollers: one passes every 1/8 bar. It turns
    counter-clockwise to draw and the other way to return the blood."""
    return 2.0 if returning(t) else -2.0


def ac_pump_speed(t):
    """Anticoagulant pump: a slow, steady turn while drawing, still while returning."""
    return 0.0 if returning(t) else -0.6


def _angle_table(fn):
    return np.cumsum([fn(x / 120.0) for x in range(int(TOTAL * 120) + 2)]) / 120.0


_PUMP_TAB = _angle_table(pump_speed)
_AC_TAB = _angle_table(ac_pump_speed)


def _angle(tab, t):
    x = (t % TOTAL) * 120.0
    i = int(x)
    return 2 * math.pi * (tab[i] + (tab[i + 1] - tab[i]) * (x - i))


def pump_angle(t):
    return _angle(_PUMP_TAB, t) + math.pi / 2         # a roller passes the raceway inlet on every 1/8 note


def ac_pump_angle(t):
    return _angle(_AC_TAB, t)


def spin_speed(t):
    """Centrifuge rotor (turns per second, as drawn): still until the blood arrives, spins up, then keeps going."""
    t = t % TOTAL
    if t < SPIN_UP[0]:
        return 0.0
    return 3.2 * smooth((t - SPIN_UP[0]) / (SPIN_UP[1] - SPIN_UP[0]))


_SPIN_TAB = np.cumsum([spin_speed(x / 120.0) for x in range(int(TOTAL * 120) + 2)]) / 120.0


def spin_angle(t):
    x = (t % TOTAL) * 120.0
    i = int(x)
    return 2 * math.pi * (_SPIN_TAB[i] + (_SPIN_TAB[i + 1] - _SPIN_TAB[i]) * (x - i))


def separation(t):
    """0 = mixed, 1 = sorted into red cells (outside), platelets (middle) and plasma (inside)."""
    t = t % TOTAL
    if t < SEP_PROGRESS[0]:
        return 0.0
    return smoother((t - SEP_PROGRESS[0]) / (SEP_PROGRESS[1] - SEP_PROGRESS[0]))


def bag_level(t):
    """Fill of the platelet bag (0..1): it has some product already and gains more each cycle."""
    t = t % TOTAL
    return 0.22 + 0.36 * smooth((t - BAG_FILL[0]) / (BAG_FILL[1] - BAG_FILL[0]))


def flows(t):
    """Speed of the contents of each tube (world px per second, + = along the path, toward the machine). While
    returning, the blood goes back the way it came; the anticoagulant and the platelet line rest."""
    t = t % TOTAL
    if returning(t):
        return {'draw1': -38.0, 'pump': -38.0, 'draw2': -38.0, 'draw3': -32.0, 'ac': 0.0, 'acpump': 0.0, 'ac2': 0.0,
                'plt': 0.0}
    return {'draw1': 38.0, 'pump': 38.0, 'draw2': 38.0, 'draw3': 32.0, 'ac': 10.0, 'acpump': 10.0, 'ac2': 10.0,
            'plt': 22.0}


# ---------------------------------------------------------------- cameras
OPEN = (-98.0, 118.0, 3.1)         # the arm close-up (first and last frame)
WIDE = (-44.0, 84.0, 0.62)         # the whole setup: donor, tubing, machine
PUMP_CAM = (PUMP[0] - 2.0, PUMP[1] + 3.0, 6.2)
JUNCTION_CAM = (JUNCTION[0] - 2.0, JUNCTION[1] + 2.0, 3.3)
LID_CAM = (CENTRIFUGE[0], CENTRIFUGE[1] + 4.0, 3.2)
SPIN_CAM = (CENTRIFUGE[0], CENTRIFUGE[1] + 16.0, 1.45)
CHANNEL_CAM = (CENTRIFUGE[0], CENTRIFUGE[1] - 0.72 * BAY_R * LID_K, 7.0)
BAG_CAM = (BAG[0] - 14.0, BAG[1] + 6.0, 3.0)
FRONT_CAM = (112.0, 96.0, 2.5)     # the screen and the blood pump in one frame

# where each magnifier lens opens and closes (world points)
LENS_FOCUS = {
    ('stream', 'in'): None,                                   # the dive point on the tube (filled in below)
    ('stream', 'out'): (PUMP[0], PUMP[1] + PUMP_R),           # the blood entering the pump
    ('molecule', 'in'): JUNCTION,
    ('molecule', 'out'): JUNCTION,
    ('channel', 'in'): CHANNEL_CAM[:2],
    ('channel', 'out'): None,                                 # the platelet outlet (filled in below)
}
LENS_FOCUS[('stream', 'in')] = path_point('draw1', F_DIVE)
LENS_FOCUS[('channel', 'out')] = path_point('plt', 0.04)


def _lerp_cam(a, b, u):
    z = math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * u)
    w = (1 / z - 1 / a[2]) / (1 / b[2] - 1 / a[2]) if abs(b[2] - a[2]) > 1e-9 else u
    return a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, z


def _push(c, k, u):
    """Slow push on the same centre: zoom times k at u = 1 (sine in-out)."""
    return c[0], c[1], c[2] * math.exp(math.log(k) * (0.5 - 0.5 * math.cos(math.pi * clamp01(u))))


def _long_tail(u):
    u = clamp01(u)
    return 1 - (1 - u) ** 3


def world_camera(t):
    """Camera over the clinic (world space). The close-ups use their own cameras."""
    t = t % TOTAL
    if t < TRACK[0]:
        return OPEN[0] + 1.5 * t, OPEN[1], OPEN[2]
    if t < STREAM[1]:
        u = smoother((t - TRACK[0]) / (TRACK[1] - TRACK[0]))
        x, y = path_point('draw1', 0.03 + (F_DIVE - 0.03) * u)
        z = OPEN[2] + (3.0 - OPEN[2]) * u
        k = smooth(min(1.0, (t - TRACK[0]) / 0.8))             # ease from the opening hold onto the tube
        sx, sy = OPEN[0] + 1.5 * TRACK[0], OPEN[1]
        c = (sx + (x - sx) * k, sy + (y - sy) * k, z)
        if t >= STREAM[0]:                                     # slow push into the tube while the lens opens
            return _push(c, 1.2, (t - STREAM[0]) / (STREAM[1] - STREAM[0]))
        return c
    if t < STREAM[3]:                                          # the lens closes onto the pump; settle back
        v = _long_tail((t - STREAM[2]) / (STREAM[3] - STREAM[2]))
        return PUMP_CAM[0], PUMP_CAM[1], PUMP_CAM[2] * (1.1 - 0.1 * v)
    if t < PUMP_HOLD[1]:
        return PUMP_CAM
    if t < MOLECULE[0]:
        return _lerp_cam(PUMP_CAM, JUNCTION_CAM, smoother((t - TO_JUNCTION[0]) / (TO_JUNCTION[1] - TO_JUNCTION[0])))
    if t < MOLECULE[1]:
        return _push(JUNCTION_CAM, 1.2, (t - MOLECULE[0]) / (MOLECULE[1] - MOLECULE[0]))
    if t < MOLECULE[3]:
        v = _long_tail((t - MOLECULE[2]) / (MOLECULE[3] - MOLECULE[2]))
        return JUNCTION_CAM[0], JUNCTION_CAM[1], JUNCTION_CAM[2] * (1.2 - 0.2 * v)
    if t < TO_SPIN[1]:
        return _lerp_cam(JUNCTION_CAM, LID_CAM, smoother((t - TO_SPIN[0]) / (TO_SPIN[1] - TO_SPIN[0])))
    if t < SPIN_UP[1]:
        return _lerp_cam(LID_CAM, SPIN_CAM, _long_tail((t - SPIN_UP[0]) / (SPIN_UP[1] - SPIN_UP[0])))
    if t < SEPARATE[0]:
        return _lerp_cam(SPIN_CAM, CHANNEL_CAM, smoother((t - INTO_CHANNEL[0]) / (INTO_CHANNEL[1] - INTO_CHANNEL[0])))
    if t < SEPARATE[1]:
        return _push(CHANNEL_CAM, 1.12, (t - SEPARATE[0]) / (SEPARATE[1] - SEPARATE[0]))
    x0, y0 = path_point('plt', 0.04)
    if t < SEPARATE[3]:
        v = _long_tail((t - SEPARATE[2]) / (SEPARATE[3] - SEPARATE[2]))
        return x0, y0, 4.4 - 0.4 * v
    if t < TO_BAG[1]:
        u = smoother((t - TO_BAG[0]) / (TO_BAG[1] - TO_BAG[0]))
        x, y = path_point('plt', 0.04 + 0.84 * u)
        c = (x, y, 4.0 - 0.9 * u)
        return _lerp_cam(c, BAG_CAM, smoother((t - (TO_BAG[1] - 0.7)) / 0.7)) if t > TO_BAG[1] - 0.7 else c
    if t < RETURN[0]:
        return BAG_CAM[0] - 0.4 * (t - TO_BAG[1]), BAG_CAM[1], BAG_CAM[2]
    if t < RETURN[1]:
        tt = t - RETURN[0]
        bag_end = (BAG_CAM[0] - 0.4 * (RETURN[0] - TO_BAG[1]), BAG_CAM[1], BAG_CAM[2])
        if tt < 1.0:                                    # the screen flips to RETURN; glide to the pump
            return _lerp_cam(bag_end, FRONT_CAM, smoother(tt / 1.0))
        if tt < 2.4:
            return FRONT_CAM
        x0, y0 = path_point('draw1', 1.0)
        if tt < 2.8:                                    # settle onto the donor line at the pump
            return _lerp_cam(FRONT_CAM, (x0, y0, 2.4), smoother((tt - 2.4) / 0.4))
        if tt < 4.4:                                    # follow the blood back along the same line to the arm
            v = smoother((tt - 2.8) / 1.6)
            x, y = path_point('draw1', 1.0 - v)
            return x, y, 2.4 + 1.0 * v - 0.5 * math.sin(math.pi * v)
        x, y = path_point('draw1', 0.0)
        return x - 4.0, y, 3.4
    if t < REVEAL[1]:
        x, y = path_point('draw1', 0.0)
        return _lerp_cam((x - 4.0, y, 3.4), WIDE, smoother(min(1.0, (t - REVEAL[0]) / (WIDE_AT - REVEAL[0]))))
    return _lerp_cam(WIDE, OPEN, smoother((t - BACK[0]) / (BACK[1] - BACK[0] - 0.1)))   # lands 3 frames early


_LENSES = (('stream', STREAM), ('molecule', MOLECULE), ('channel', SEPARATE))


def view_kind(t):
    """Which artwork fills the screen: 'world', 'stream', 'molecule' or 'channel'."""
    t = t % TOTAL
    for kind, ev in _LENSES:
        if ev[1] <= t < ev[2]:
            return kind
    return 'world'


def lens(t):
    """(close-up kind, 'in' / 'out', progress 0..1, focus world point) while a magnifier lens opens or closes."""
    t = t % TOTAL
    for kind, ev in _LENSES:
        if ev[0] <= t < ev[1]:
            return kind, 'in', (t - ev[0]) / (ev[1] - ev[0]), LENS_FOCUS[(kind, 'in')]
        if ev[2] <= t < ev[3]:
            return kind, 'out', (t - ev[2]) / (ev[3] - ev[2]), LENS_FOCUS[(kind, 'out')]
    return None
