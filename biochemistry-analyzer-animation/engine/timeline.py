"""One timeline for picture and sound: 120 BPM, 18 bars = the 36 s loop, and the analyzer's state at every instant.

Story order on screen:
  0-3.85      preview: the drop lands (plip 0.375), the colour time-lapse, the reveal of the analyzer
  3.85        match cut back in time: the same cuvette, still empty
  3.85-13.25  reagent tray indexes, reagent probe aspirates and dispenses, sample probe aspirates serum
  13.25       match cut into the opening composition just after the drop landed; the probe retracts
  14-30       mixing, the enzyme chain (molecular view), colour development, the optical reading, the signal
  30-36       the result on the workstation, the next cuvette, back into the opening composition
"""
import math

BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 18
TOTAL = BARS * BAR            # 36.0 s
STEP = BEAT / 4               # one 16th = 0.125 s

LAND = 0.375                  # the opening drop touches the reagent (plip)
DETACH = 0.25
FORM = 35.70                  # the next drop starts forming (so frame 0 shows it already growing)
CUT_BACK = 3.85               # match cut: the pink cuvette -> the same cuvette, empty
REJOIN = 13.25                # match cut into the opening composition, just after the drop
TRAY_CLACK = 5.5
RA_DISP = (9.05, 9.5)
MIX = (14.35, 15.55)
SNAP, OXI, DYE = 17.0, 19.0, 21.25
BIP = 28.25
DING = 30.75

# reagent / sample / mixing / optics / wash positions on the ring of 36 cuvettes (see analyzer.py)
SLOT_R, SLOT_S, SLOT_M, SLOT_O, SLOT_W = 6, 7, 10, 19, 25
N_RING = 36


def clamp01(u):
    return max(0.0, min(1.0, u))


def smooth(u):
    u = clamp01(u)
    return u * u * (3 - 2 * u)


def smoother(u):
    u = clamp01(u)
    return u * u * u * (u * (u * 6 - 15) + 10)


def lerp(a, b, u):
    return a + (b - a) * u


def seg(t, a, b, v0, v1, ease=smoother):
    return lerp(v0, v1, ease((t - a) / (b - a)))


def keys(t, ks, ease=smoother):
    """Piecewise interpolation through (time, value) keys; holds before the first and after the last."""
    if t <= ks[0][0]:
        return ks[0][1]
    for (t0, v0), (t1, v1) in zip(ks[:-1], ks[1:]):
        if t <= t1:
            if t1 <= t0:
                return v1
            u = ease((t - t0) / (t1 - t0))
            if isinstance(v0, tuple):
                return tuple(a + (b - a) * u for a, b in zip(v0, v1))
            return v0 + (v1 - v0) * u
    return ks[-1][1]


def angle_keys(t, ks):
    return keys(t, ks)


# ---------------------------------------------------------------- the reaction line
def _main_slot(t):
    """Ring position of the cuvette we follow through the test (fractional while the ring indexes)."""
    t = t % TOTAL
    if t < CUT_BACK:
        return float(SLOT_S)                      # preview: the next test's cuvette at the sample position
    ks = [(CUT_BACK, 6.0), (10.3, 6.0), (10.7, 7.0), (13.95, 7.0), (14.3, 10.0), (16.0, 10.0)]
    if t < 16.0:
        return keys(t, ks)
    if t < 22.8:                                  # incubation travel while the molecular view is on screen
        u = (t - 16.0) / 6.8
        k = math.floor(u * 7)
        f = smoother((u * 7 - k) / 0.5)
        return 10.0 + k + f
    ks = [(22.8, 17.0), (23.05, 17.0), (23.45, 18.0), (23.75, 18.0), (24.15, 19.0), (32.0, 19.0), (32.4, 20.0)]
    return keys(t, ks)


def line_offset(t):
    """The whole ring turns together; at the loop point it is back on whole slots with the same layout."""
    t = t % TOTAL
    if t < CUT_BACK:
        return 14.0
    return _main_slot(t) - 6.0


def hero_slot(t):
    """Ring position of the highlighted cuvette. From 32.4 s the highlight passes to the fresh cuvette that has just
    arrived at the sample position: it is the one the opening drop falls into when the loop starts again."""
    t = t % TOTAL
    if t < CUT_BACK or t >= 32.4:
        return float(SLOT_S)
    return _main_slot(t)


def cuvette_state(pos):
    """Liquid in an ordinary cuvette by where it is on the ring (kind, rose 0..1); washed empty after W."""
    pos = pos % N_RING
    if pos < SLOT_R - 0.5 or pos >= SLOT_W - 0.5:
        return ('empty', 0.0)
    if pos < SLOT_S - 0.5:
        return ('reagent', 0.0)
    if pos < SLOT_M - 0.5:
        return ('serum', 0.0)                     # sample added, waiting for the stirrer
    if pos < SLOT_M + 0.5:
        return ('mix', 0.0)
    return ('mix', clamp01((pos - SLOT_M) / (SLOT_O - SLOT_M)))


def hero_state(t):
    t = t % TOTAL
    if t < LAND:
        return ('reagent', 0.0)
    if t < 0.95:
        return ('serum', 0.0)
    if t < CUT_BACK:
        return ('mix', smooth((t - 0.95) / 1.05))
    if t < RA_DISP[0]:
        return ('empty', 0.0)
    if t < REJOIN:
        return ('reagent', 0.0)
    if t < MIX[1]:
        return ('serum', 0.0)
    if t < 22.4:
        return ('mix', 0.04)
    if t < 32.4:
        return ('mix', smooth((t - 22.4) / 0.6))
    return ('reagent', 0.0)                       # the fresh cuvette (next test) now carries the highlight


def hero_fill(t):
    """Reagent level while the reagent probe dispenses (0..1)."""
    t = t % TOTAL
    if CUT_BACK <= t < RA_DISP[0]:
        return 0.0
    if RA_DISP[0] <= t < RA_DISP[1] + 0.05:
        return smooth((t - RA_DISP[0]) / (RA_DISP[1] - RA_DISP[0]))
    return 1.0


# ---------------------------------------------------------------- arms and trays
def _arm_r(t, A):
    """Reagent arm: (angle deg, arm height mm)."""
    hi, lo_b, lo_c = A['hi'], A['lo_b'], A['lo_c']
    B, R = A['ang_b'], A['ang_r']
    t = t % TOTAL
    if t < CUT_BACK:            # preview: busy dispensing into the next cuvette at R during the reveal
        ang = keys(t, [(2.2, B), (2.7, R), (3.4, R), (3.82, B)])
        z = keys(t, [(2.7, hi), (2.9, lo_c), (3.2, lo_c), (3.4, hi)])
        return ang, z
    ang = keys(t, [(8.0, B), (8.8, R), (9.8, R), (10.8, B), (29.6, B), (30.2, R), (31.3, R), (31.9, B)])
    z = keys(t, [(6.0, hi), (6.5, lo_b), (7.5, lo_b), (8.0, hi), (8.8, hi), (9.05, lo_c), (9.5, lo_c),
                 (9.8, hi), (30.2, hi), (30.45, lo_c), (30.95, lo_c), (31.25, hi)])
    return ang, z


def _arm_s(t, A):
    """Sample arm: (angle deg, arm height mm)."""
    hi, lo_t, lo_c = A['hi'], A['lo_t'], A['lo_c']
    Tn, S = A['ang_t'], A['ang_s']
    t = t % TOTAL
    if t < CUT_BACK:            # preview: has just dispensed (the opening drop), retracts, goes back to the tray
        ang = keys(t, [(1.1, S), (2.0, Tn)])
        z = keys(t, [(0.65, lo_c), (1.1, hi), (2.9, hi), (3.15, lo_t), (3.55, lo_t), (3.8, hi)])
        return ang, z
    ang = keys(t, [(12.0, Tn), (12.8, S), (14.0, S), (15.0, Tn), (33.6, Tn), (34.6, S)])
    z = keys(t, [(10.4, hi), (10.8, lo_t), (11.6, lo_t), (12.0, hi), (12.8, hi), (13.2, lo_c + 4.0),
                 (13.25, lo_c), (14.0, hi), (32.5, hi), (32.8, lo_t), (33.2, lo_t), (33.5, hi), (34.6, hi),
                 (35.2, lo_c + 6.0), (35.6, lo_c)])
    return ang, z


def rt_angle(t, pick):
    """Reagent tray: one 30 deg index step on screen (5 s), two more off screen; 90 deg per loop = 3 bottles."""
    t = t % TOTAL
    if t < CUT_BACK:
        return pick + 60.0
    base = pick - 30.0
    a = base + 30.0 * smoother((t - 4.95) / 0.5)
    a += 30.0 * smoother((t - 18.0) / 0.5) + 30.0 * smoother((t - 27.0) / 0.5)
    return a


def st_angle(t, pick):
    """Sample tray: indexes one tube (18 deg) before each aspiration."""
    t = t % TOTAL
    a = pick - 18.0
    if t >= CUT_BACK:
        a += 18.0 * smoother((t - 9.9) / 0.4) + 18.0 * smoother((t - 32.1) / 0.4)
    else:
        a += 36.0
    return a


def mixer(t):
    t = t % TOTAL
    return keys(t, [(MIX[0] - 0.2, 0.0), (MIX[0], 1.0), (MIX[1], 1.0), (MIX[1] + 0.25, 0.0)])


def lamp(t):
    t = t % TOTAL
    return 1.0 if 25.4 <= t < 30.2 else 0.0          # switched on in the optics cutaway, with its click (25.45)


def machine(t):
    from . import analyzer as AZ
    A = {'hi': AZ.ARM_HI, 'lo_b': AZ.ARM_LO_BOTTLE, 'lo_c': AZ.ARM_LO_CUV, 'lo_t': AZ.ARM_LO_TUBE,
         'ang_b': AZ.RA_ANG_B, 'ang_r': AZ.RA_ANG_R, 'ang_t': AZ.SA_ANG_T, 'ang_s': AZ.SA_ANG_S}
    ra_ang, ra_z = _arm_r(t, A)
    sa_ang, sa_z = _arm_s(t, A)
    hs = hero_slot(t)
    off = line_offset(t)
    return {
        'rt_ang': rt_angle(t, AZ.RT_PICK), 'st_ang': st_angle(t, AZ.ST_PICK),
        'ra_ang': ra_ang, 'ra_z': ra_z, 'sa_ang': sa_ang, 'sa_z': sa_z,
        'line': off, 'hero_slot': hs, 'hero_state': hero_state(t), 'hero_fill': hero_fill(t),
        'cuv_state': cuvette_state, 'mix': mixer(t), 'lid': 0.24, 'lamp': lamp(t),
    }
