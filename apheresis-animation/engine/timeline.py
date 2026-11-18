"""The clock, the clinic layout and the choreography (120 BPM, one bar = 2 s, 28 bars = 56 s).

World space (canvas px at zoom 1, y down): the reclining donor on the left, the apheresis machine on the right, the
tubing between them. One camera travels through the whole film without a cut: it pans along the tubing and zooms in
and out, down into the blood inside the tube, further down to the molecules in the plasma, back out, and later down
into the spinning separation channel. The close-up worlds are nested inside the world at real places:

- the stream (cells in plasma) lives inside the tube, right after the anticoagulant joins (P_S, scale K_S);
- the molecules live in a small parcel of plasma inside that stream (Q, scale K_M);
- the separation channel lives under the centrifuge lid (scale B_C), seen first at the lid's low angle and then,
  as the camera tilts down over it, from straight above.

The machine works in two phases through one needle: DRAW (blood goes from the arm to the machine) and RETURN (the
remaining blood goes back along the same tube); they never happen at the same instant. The film ends on the result
of the donation: the sealed platelet bag.
"""
import math
import numpy as np

BPM = 120
BEAT = 60.0 / BPM
BAR = 4 * BEAT
TOTAL = 56.0
FPS = 30

# ---------------------------------------------------------------- events (seconds)
HOLD = (0.0, 1.5)                  # the arm, still
TRACK = (1.5, 5.0)                 # follow the blood along the tube to the anticoagulant Y fitting
AC_SHOT = (5.0, 7.0)               # the anticoagulant line (from its own pump) joins the donor line
DIVE_TUBE = (7.0, 9.5)             # zoom into the tube just after the Y fitting
IN_TUBE = (9.5, 13.0)              # inside: red cells, platelets, a white cell, plasma, citrate
DIVE_MOL = (13.0, 15.0)            # zoom further, into the plasma
IN_MOL = (15.0, 18.0)              # citrate holds a calcium ion
BIND = 16.2
OUT_MOL = (18.0, 21.0)             # zoom all the way back out
TO_PUMP = (21.0, 22.5)             # up the line, past the drip chamber and the clamps
PUMP_HOLD = (22.5, 26.0)
TO_LID = (26.0, 27.5)
SPIN_UP = (27.5, 30.0)             # pull out to the whole machine while the rotor spins up
DIVE_CH = (30.0, 32.5)             # zoom into the lid; the camera tilts down over the channel
SEPARATE = (32.5, 39.0)            # the separation channel
SEP_PROGRESS = (33.2, 36.4)
DIVERT = (36.4, 39.0)              # the platelet band takes its own exit
OUT_CH = (39.0, 41.5)
TO_BAG = (41.5, 44.0)
TILT = (32.45, 33.75)              # over the channel the camera tilts down to look straight in...
UNTILT = (37.85, 38.95)            # ...and back up before it pulls out
BAG_FILL = (40.5, 46.0)
RETURN = (46.0, 49.0)              # the single needle switches to RETURN: the rest goes back to the donor
TO_FINALE = (49.0, 50.8)
FINALE = (50.8, 56.0)              # the donation is done: the platelet bag, sealed, as a rare item
SEAL = 50.95
LIFT = (51.2, 52.0)
BURST = 52.0                       # the fanfare hit: a shockwave and a burst of gold around the bag
REWARD = 45.4                      # the bag is full enough: a small reward tone
DONE = 49.0


def clamp01(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def smoother(x):
    x = clamp01(x)
    return x * x * x * (x * (6 * x - 15) + 10)


def sine_io(x):
    return 0.5 - 0.5 * math.cos(math.pi * clamp01(x))


def long_tail(x):
    x = clamp01(x)
    return 1 - (1 - x) ** 3


def frame(t):
    return int(math.floor(t * FPS + 1e-6))


def returning(t):
    return RETURN[0] <= t < RETURN[1]


def done(t):
    return t >= RETURN[1]


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
LINE_Y = 203.0                     # the donor line runs straight along the floor here, into the machine
AC_Y = (44.0, LINE_Y)              # the anticoagulant joins the donor line here (Y fitting), close to the needle side
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
R_IN, R_OUT = 1.8, 2.7             # tube lumen and wall radius


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


# the donor line: needle -> along the arm -> a soft sag to the floor -> straight along the floor (the anticoagulant
# joins here) -> up through the drip chamber and the clamps -> into the blood pump at the bottom of its raceway
_DRAW_IN = [NEEDLE, (-95, 118.2), (-86, 116.4), (-76, 114.9), (-66, 115.2), (-57, 117.2), (-48, 122.0), (-36, 133),
            (-22, 149), (-8, 166), (10, 187), (24, 199.4), (34, LINE_Y)]
_DRAW_FLOOR = [(34, LINE_Y), (80, LINE_Y)]
_DRAW_RISE = [(80, LINE_Y), (87, 202.6), (91.2, 199.6), (FILTER[0], FILTER[2] + 1.0)]
_DRAW_UP = [(FILTER[0], FILTER[2] + 1.0), (FILTER[0], 141.0)]
_DRAW_TURN = [(FILTER[0], 141.0), (93.0, 137.5), (100.0, 134.8), (112.0, 134.1), (PUMP[0], PUMP[1] + PUMP_R)]
# blood pump raceway: bottom -> right -> top (counter-clockwise on screen); out at the top, up into the centrifuge
_PUMP_ARC = _arc(PUMP, PUMP_R, 90, -90, 40)
_TO_CENTRIFUGE = [(PUMP[0], PUMP[1] - PUMP_R), (118, 113.6), (106, 111.4), (97.5, 106.5), (93.2, 100.5),
                  (CENTRIFUGE[0], CENTRIFUGE[1] + 1.0)]
# anticoagulant: bag -> down the left pole -> into its pump at the top -> round the right side (clockwise) -> out at
# the bottom -> down the front of the cabinet -> into the donor line at the Y fitting
_AC_IN = [(AC_BAG[0], AC_BAG[1] + AC_H / 2 + 2), (AC_BAG[0] + 1, 60), (30, 92), (36, 105), (46, 112.6),
          (AC_PUMP[0], AC_PUMP[1] - PUMP_R)]
_AC_ARC = _arc(AC_PUMP, PUMP_R, -90, 90, 40)
_AC_OUT = [(AC_PUMP[0], AC_PUMP[1] + PUMP_R), (50, 136.8), (46.2, 146), (44.6, 166), (44.0, 188),
           (AC_Y[0], LINE_Y - R_IN + 0.2)]
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
    'draw1': _path(_DRAW_IN, _DRAW_FLOOR, _DRAW_RISE, _DRAW_UP, _DRAW_TURN),
    'pump': _resample(np.array(_PUMP_ARC, float)),
    'draw2': _path(_TO_CENTRIFUGE),
    'ac': _path(_AC_IN),
    'acpump': _resample(np.array(_AC_ARC, float)),
    'ac2': _path(_AC_OUT),
    'plt': _path(_PLT_LINE),
}


def path_point(name, f):
    """Point at fraction f (0..1) along a tube."""
    pts, s = PATHS[name]
    i = int(clamp01(f) * (len(pts) - 1))
    return float(pts[i][0]), float(pts[i][1])


def _first_fraction(name, test):
    pts, s = PATHS[name]
    for i, (x, y) in enumerate(pts):
        if test(x, y):
            return i / (len(pts) - 1)
    return 1.0


F_FLOOR = _first_fraction('draw1', lambda x, y: x >= 30.0 and y > 200)
F_FILTER = _first_fraction('draw1', lambda x, y: x >= FILTER[0] - 0.5)


# ---------------------------------------------------------------- machine motion
def pump_speed(t):
    """Blood pump rotor (turns per second, + = clockwise on screen). Two rollers: one passes every 1/8 bar. It turns
    counter-clockwise to draw, the other way to return the blood, and stops when the donation is done."""
    if done(t):
        return 0.0
    return 2.0 if returning(t) else -2.0


def ac_pump_speed(t):
    """Anticoagulant pump: a slow, steady clockwise turn while drawing."""
    return 0.6 if not returning(t) and not done(t) else 0.0


def _angle_table(fn):
    return np.cumsum([fn(x / 120.0) for x in range(int(TOTAL * 120) + 2)]) / 120.0


_PUMP_TAB = _angle_table(pump_speed)
_AC_TAB = _angle_table(ac_pump_speed)


def _angle(tab, t):
    x = min(max(t, 0.0), TOTAL) * 120.0
    i = min(int(x), len(tab) - 2)
    return 2 * math.pi * (tab[i] + (tab[i + 1] - tab[i]) * (x - i))


def pump_angle(t):
    return _angle(_PUMP_TAB, t) + math.pi / 2          # a roller passes the raceway inlet on every 1/8 note


def ac_pump_angle(t):
    return _angle(_AC_TAB, t)


def spin_speed(t):
    """Centrifuge rotor (turns per second, as drawn): still until the blood arrives, spins up, slows at the end."""
    if t < SPIN_UP[0]:
        return 0.0
    if t < RETURN[1]:
        return 3.2 * smooth((t - SPIN_UP[0]) / (SPIN_UP[1] - SPIN_UP[0]))
    return 3.2 * (1 - smooth((t - RETURN[1]) / 2.0))


_SPIN_TAB = _angle_table(spin_speed)


def spin_angle(t):
    return _angle(_SPIN_TAB, t)


def separation(t):
    """0 = mixed, 1 = sorted into red cells (outside), platelets (middle) and plasma (inside)."""
    if t < SEP_PROGRESS[0]:
        return 0.0
    return smoother((t - SEP_PROGRESS[0]) / (SEP_PROGRESS[1] - SEP_PROGRESS[0]))


def bag_level(t):
    """Fill of the platelet bag (0..1): it has some product already and fills while the platelets come in."""
    return 0.25 + 0.47 * smooth((t - BAG_FILL[0]) / (BAG_FILL[1] - BAG_FILL[0]))


def flows(t):
    """Speed of the contents of each tube (world px per second, + = along the path, toward the machine). While
    returning, the blood goes back the way it came; the anticoagulant and the platelet line rest; when the donation
    is done everything stops."""
    if done(t):
        return {k: 0.0 for k in PATHS}
    if returning(t):
        return {'draw1': -38.0, 'pump': -38.0, 'draw2': -34.0, 'ac': 0.0, 'acpump': 0.0, 'ac2': 0.0, 'plt': 0.0}
    return {'draw1': 38.0, 'pump': 38.0, 'draw2': 34.0, 'ac': 8.0, 'acpump': 8.0, 'ac2': 8.0, 'plt': 22.0}


# ---------------------------------------------------------------- the nested worlds (scale travel)
TUBE_R = 70.0                      # lumen radius in stream units
P_S = (60.0, LINE_Y)               # the stream lives in the tube here (just after the Y fitting); stream (0, 0)
K_S = R_IN / TUBE_R                # world units per stream unit
STREAM_Z = 1.7                     # the stream seen at its reading scale (stream px per stream unit)
CAM_V = 58.0                       # inside the tube the camera drifts with the flow (stream units per second)
Y_Q = 2.0                          # the plasma parcel we dive into (stream lane, and its start)
X_Q0 = -96.0
K_M = 0.04                         # stream units per molecule unit
MOL_Z = 2.2
MOL_C = (-6.0, 8.0)                # the molecule view's centre (molecule units)
B_C = 22.5 / 140.0                 # world units per channel unit (the channel's outer wall = the lid ring)
CH_RC = (0.0, 180.0)               # the rotor centre in channel units
CH_Z = 4.8                         # the channel seen at its reading scale


def flow_speed(y):
    """Speed of the plasma across the tube (stream units per second): fastest in the middle."""
    return 22.0 + 64.0 * (1 - (y / TUBE_R) ** 2)


def stream_cam_u(t):
    return CAM_V * (t - IN_TUBE[0])


def parcel(t):
    """The parcel of plasma the camera dives into (stream units); it moves with the flow."""
    return X_Q0 + flow_speed(Y_Q) * (t - IN_TUBE[0]), Y_Q


def stream_to_world(u, v):
    return P_S[0] + K_S * u, P_S[1] + K_S * v


def lid_k(t):
    """The lid's vertical squash at time t: once the camera is right over the channel it tilts down to look
    straight in (1.0), and tilts back up (LID_K) before it pulls out."""
    return LID_K + (1 - LID_K) * (smoother((t - TILT[0]) / (TILT[1] - TILT[0])) -
                                  smoother((t - UNTILT[0]) / (UNTILT[1] - UNTILT[0])))


def channel_cam(t):
    """The channel's own camera centre (channel units): drifts to the platelet port while the band leaves."""
    u = smoother((t - DIVERT[0]) / (DIVERT[1] - DIVERT[0]))
    return 0.0 + 42.0 * u, 74.0 - 6.0 * u


# ---------------------------------------------------------------- cameras (world space; z may be very large)
OPEN = (-98.0, 118.0, 3.1)         # the arm close-up
AC_CAM = (52.0, 168.0, 2.1)        # the anticoagulant pump, its line and the Y fitting in one frame
PUMP_CAM = (PUMP[0] - 2.0, PUMP[1] + 3.0, 6.2)
FILTER_CAM = (88.0, 180.0, 3.0)
LID_CAM = (CENTRIFUGE[0], CENTRIFUGE[1] + 4.0, 3.2)
SPIN_CAM = (CENTRIFUGE[0], CENTRIFUGE[1] + 16.0, 1.45)
BAG_CAM = (BAG[0] - 12.0, BAG[1] + 6.0, 3.0)
WIDE = (-22.0, 112.0, 0.72)        # the donor and the machine in one frame
FINALE_CAM = (BAG[0] - 2.0, BAG[1] + 8.0, 4.4)


def _lerp_cam(a, b, u):
    """Zoom-aware camera blend (constant visual speed in and out), u in 0..1."""
    z = math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * u)
    w = (1 / z - 1 / a[2]) / (1 / b[2] - 1 / a[2]) if abs(b[2] - a[2]) > 1e-9 * a[2] else u
    return a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, z


def stream_target(t):
    """World camera that sees the stream at its reading scale, drifting with the flow."""
    x, y = stream_to_world(stream_cam_u(t), 0.0)
    return x, y, STREAM_Z / K_S


def molecule_target(t):
    """World camera that sees the molecules at their reading scale, riding with the plasma parcel."""
    qx, qy = parcel(t)
    x, y = stream_to_world(qx + K_M * MOL_C[0], qy + K_M * MOL_C[1])
    return x, y, MOL_Z / (K_S * K_M)


def channel_target(t):
    """World camera that sees the channel from straight above at its reading scale."""
    cx, cy = channel_cam(t)
    z = CH_Z / B_C
    return CENTRIFUGE[0] + B_C * cx, CENTRIFUGE[1] + lid_k(t) * B_C * (cy - CH_RC[1]), z


def _follow(name, f0, f1, u, z):
    x, y = path_point(name, f0 + (f1 - f0) * u)
    return x, y, z


def world_camera(t):
    """One continuous camera for the whole film."""
    t = min(max(t, 0.0), TOTAL)
    if t < HOLD[1]:
        return OPEN[0] + 0.8 * t, OPEN[1], OPEN[2]
    if t < TRACK[1]:                                           # along the arm, down the sag, to the floor line
        u = smoother((t - TRACK[0]) / (TRACK[1] - TRACK[0]))
        start = (OPEN[0] + 0.8 * HOLD[1], OPEN[1], OPEN[2])
        x, y = path_point('draw1', 0.02 + (F_FLOOR - 0.02) * u)
        k = smooth((t - TRACK[0]) / 0.9)
        c = (start[0] + (x - start[0]) * k, start[1] + (y - start[1]) * k, OPEN[2] + (2.6 - OPEN[2]) * u)
        return c
    end_track = (*path_point('draw1', F_FLOOR), 2.6)
    if t < AC_SHOT[1]:                                         # frame the anticoagulant joining
        return _lerp_cam(end_track, AC_CAM, smoother((t - AC_SHOT[0]) / 1.2))
    if t < DIVE_TUBE[1]:                                       # zoom into the tube
        return _lerp_cam(AC_CAM, stream_target(t), sine_io((t - DIVE_TUBE[0]) / (DIVE_TUBE[1] - DIVE_TUBE[0])))
    if t < IN_TUBE[1]:
        return stream_target(t)
    if t < DIVE_MOL[1]:                                        # zoom further, into the plasma parcel
        return _lerp_cam(stream_target(t), molecule_target(t), sine_io((t - DIVE_MOL[0]) / (DIVE_MOL[1] - DIVE_MOL[0])))
    if t < IN_MOL[1]:
        return molecule_target(t)
    if t < OUT_MOL[1]:                                         # all the way back out, landing by the drip chamber
        return _lerp_cam(molecule_target(t), FILTER_CAM, long_tail((t - OUT_MOL[0]) / (OUT_MOL[1] - OUT_MOL[0])))
    if t < TO_PUMP[1]:                                         # up the line to the blood pump
        return _lerp_cam(FILTER_CAM, PUMP_CAM, smoother((t - TO_PUMP[0]) / (TO_PUMP[1] - TO_PUMP[0])))
    if t < PUMP_HOLD[1]:
        return PUMP_CAM
    if t < TO_LID[1]:
        return _lerp_cam(PUMP_CAM, LID_CAM, smoother((t - TO_LID[0]) / (TO_LID[1] - TO_LID[0])))
    if t < SPIN_UP[1]:
        return _lerp_cam(LID_CAM, SPIN_CAM, long_tail((t - SPIN_UP[0]) / (SPIN_UP[1] - SPIN_UP[0])))
    if t < DIVE_CH[1]:                                         # into the lid, tilting down over the channel
        return _lerp_cam(SPIN_CAM, channel_target(t), sine_io((t - DIVE_CH[0]) / (DIVE_CH[1] - DIVE_CH[0])))
    if t < SEPARATE[1]:
        return channel_target(t)
    plt0 = (*path_point('plt', 0.04), 4.0)
    if t < OUT_CH[1]:
        return _lerp_cam(channel_target(t), plt0, sine_io((t - OUT_CH[0]) / (OUT_CH[1] - OUT_CH[0])))
    if t < TO_BAG[1]:                                          # follow the platelets up to the bag
        u = smoother((t - TO_BAG[0]) / (TO_BAG[1] - TO_BAG[0]))
        c = _follow('plt', 0.04, 0.86, u, 4.0 - 1.3 * math.sin(math.pi * u) - 0.8 * u)
        return _lerp_cam(c, BAG_CAM, smoother((t - (TO_BAG[1] - 0.7)) / 0.7))
    if t < RETURN[0]:
        return BAG_CAM[0] - 0.3 * (t - TO_BAG[1]), BAG_CAM[1], BAG_CAM[2]
    bag_end = (BAG_CAM[0] - 0.3 * (RETURN[0] - TO_BAG[1]), BAG_CAM[1], BAG_CAM[2])
    if t < RETURN[1]:                                          # pull out: the rest goes back to the donor
        return _lerp_cam(bag_end, WIDE, smoother((t - RETURN[0]) / 2.0))
    if t < TO_FINALE[1]:                                       # push in on the result of the donation
        return _lerp_cam(WIDE, FINALE_CAM, sine_io((t - TO_FINALE[0]) / (TO_FINALE[1] - TO_FINALE[0])))
    return FINALE_CAM
