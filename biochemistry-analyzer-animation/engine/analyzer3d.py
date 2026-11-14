"""NOT USED BY THE FILM. An earlier 3D polygon version of the analyzer, kept only as an optional reference
for machine views (the film draws the analyzer in 2D 3/4 view: engine/analyzer.py).

The analyzer as a 3D pixel model: a compact benchtop clinical chemistry analyzer in the spirit of the Furuno CA-310
(off-white body, smoky hinged lid, two circular trays, two pipette arms, a reaction line), plus its workstation.

World: millimetres, x right, y back, z up, the bench at z = 0. The internal layout is a simplified, representative
workflow (reagent tray left, sample tray right, reaction line along the front, cuvettes moving left to right through
reagent R, sample S, mixer M, optical O and wash W positions); it is not a service diagram.
"""
import math
import numpy as np
from . import palette as P
from . import timeline as T
from .w3d import Scene

# ---------------------------------------------------------------- layout
BODY_BOX = (0.0, 720.0, 0.0, 540.0, 0.0, 300.0)
DECK_Z = 302.0
LID_PROFILE = [(8.0, DECK_Z), (8.0, 392.0), (96.0, 506.0), (522.0, 506.0), (532.0, DECK_Z)]   # (y, z)
LID_X = (6.0, 714.0)

RT = (185.0, 332.0)            # reagent tray centre
RT_R, RT_RING, RT_N = 128.0, 86.0, 12
ST = (562.0, 350.0)            # sample tray centre
ST_R, ST_RING, ST_N = 112.0, 88.0, 20

LINE_Y = 110.0
LINE_X0, PITCH = 228.0, 14.0
N_SLOTS = 26
CUV_HALF = 4.2
CUV_Z0, CUV_Z1 = 314.0, 344.0
CUV_IN = 3.2                   # inner half width (liquid)
SLOT_R, SLOT_S, SLOT_M, SLOT_O, SLOT_W = 6, 7, 10, 18, 22

RA_POST = (300.0, 214.0)       # reagent arm pivot (teal)
SA_POST = (444.0, 230.0)       # sample arm pivot (amber)
ARM_HI, ARM_LO_CUV, ARM_LO_BOTTLE, ARM_LO_TUBE = 474.0, 415.0, 428.0, 417.0   # tip = arm - 66 mm
PROBE_LEN = 52.0
MIX_POST = (392.0, 262.0)
OPT = (SLOT_O, 84.0, 140.0)    # optical station around slot O

MON = (760.0, 1030.0, 222.0, 238.0, 150.0, 334.0)  # monitor x0, x1, y0, y1, z0, z1
SCREEN = (774.0, 1016.0, 162.0, 322.0)              # screen x0, x1, z0, z1 (on the front face)


def slot_x(i):
    return LINE_X0 + PITCH * i


def _circle_meet(c0, r0, c1, r1, pick):
    """Intersection of two circles; pick = +1/-1 chooses the solution."""
    (x0, y0), (x1, y1) = c0, c1
    d = math.hypot(x1 - x0, y1 - y0)
    a = (r0 * r0 - r1 * r1 + d * d) / (2 * d)
    h = math.sqrt(max(r0 * r0 - a * a, 0.0))
    xm, ym = x0 + a * (x1 - x0) / d, y0 + a * (y1 - y0) / d
    return xm + pick * h * (y1 - y0) / d, ym - pick * h * (x1 - x0) / d


R_POS = (slot_x(SLOT_R), LINE_Y)
S_POS = (slot_x(SLOT_S), LINE_Y)
RA_LEN = math.hypot(R_POS[0] - RA_POST[0], R_POS[1] - RA_POST[1])
SA_LEN = math.hypot(S_POS[0] - SA_POST[0], S_POS[1] - SA_POST[1])
# where each probe meets its tray's ring of containers
RA_BOTTLE = _circle_meet(RA_POST, RA_LEN, RT, RT_RING, -1)
SA_TUBE = _circle_meet(SA_POST, SA_LEN, ST, ST_RING, -1)


def arm_angle(post, target):
    return math.degrees(math.atan2(target[1] - post[1], target[0] - post[0]))


RA_ANG_R = arm_angle(RA_POST, R_POS)
RA_ANG_B = arm_angle(RA_POST, RA_BOTTLE)
SA_ANG_S = arm_angle(SA_POST, S_POS)
SA_ANG_T = arm_angle(SA_POST, SA_TUBE)
# angle on each tray (from its centre) that sits under its probe
RT_PICK = math.degrees(math.atan2(RA_BOTTLE[1] - RT[1], RA_BOTTLE[0] - RT[0]))
ST_PICK = math.degrees(math.atan2(SA_TUBE[1] - ST[1], SA_TUBE[0] - ST[0]))

CAP_COLORS = ('teal', 'amberc', 'mintc')       # reagent caps repeat every three bottles (the tray loops)


def materials(sc):
    sc.mat('bench', P.NV, 0.55, -0.02, edge=0)
    sc.mat('body', P.BODY, 1.05, 0.02, edge=2)
    sc.mat('bodyd', P.BODY, 0.8, -0.05, edge=1)
    sc.mat('trim', P.GR, 0.7, -0.05, edge=0)
    sc.mat('deck', P.GR, 0.62, 0.12, edge=1)
    sc.mat('dark', P.GR, 0.45, -0.08, edge=0)
    sc.mat('tray', P.GR, 0.85, 0.02, edge=1)
    sc.mat('trayrim', P.BODY, 0.9, 0.0, edge=2)
    sc.mat('bottle', P.BODY, 0.75, 0.25, edge=3)
    sc.mat('teal', P.CY, 0.9, 0.12, edge=2)
    sc.mat('amberc', P.AM, 0.9, 0.08, edge=2)
    sc.mat('mintc', P.MN, 0.9, 0.12, edge=1)
    sc.mat('glass', P.RG, 0.7, 0.32, edge=3)
    sc.mat('serum', P.SE, 0.8, 0.22, edge=3)
    sc.mat('metal', P.MT, 0.95, 0.05, edge=1)
    sc.mat('armt', P.CY, 1.0, 0.0, edge=1)
    sc.mat('arma', P.AM, 1.0, 0.0, edge=1)
    sc.mat('rail', P.GR, 0.5, -0.02, edge=0)
    sc.mat('reagent', P.RG, 0.6, 0.35, edge=3)
    sc.mat('rose', P.RO, 0.8, 0.25, edge=2)
    sc.mat('rose2', P.RO, 0.6, 0.42, edge=3)
    sc.mat('rose1', P.RO, 0.4, 0.6, edge=4)
    sc.mat('pale', P.SE, 0.22, 0.7, edge=5)
    sc.mat('optic', P.GR, 0.5, -0.04, edge=0)
    sc.mat('lamp', P.BEAM, 0.6, 0.4, edge=2)
    sc.mat('bezel', P.GR, 0.35, -0.08, edge=0)
    sc.mat('screen', P.NV, 0.3, 0.1, edge=0)
    sc.mat('key', P.GR, 0.45, 0.05, edge=0)
    sc.mat('led_c', P.CY, 0.3, 0.7, edge=5)
    sc.mat('led_m', P.MN, 0.3, 0.7, edge=4)


def _rot(px, py, cx, cy, ang):
    a = math.radians(ang)
    dx, dy = px - cx, py - cy
    return cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a)


def add_body(sc):
    x0, x1, y0, y1, z0, z1 = BODY_BOX
    sc.bevel_box(x0, x1, y0, y1, z0, z1, 12.0, 'body', 1, cut=22.0)
    # dark plinth, front seam, vent grille, status lights
    sc.box(14, 706, -2.5, 30, 0, 16, 'trim', 2)
    sc.box(30, 690, -1.2, 2, 150, 153, 'bodyd', 3, top=False)
    for k in range(7):
        sc.box(48 + k * 22, 62 + k * 22, -1.6, 2, 52, 124, 'bodyd', 4, top=False)
    sc.box(560, 600, -1.6, 2, 250, 260, 'led_c', 5, top=False)
    sc.box(608, 626, -1.6, 2, 250, 260, 'led_m', 6, top=False)
    sc.box(640, 690, -1.2, 2, 196, 232, 'bodyd', 7, top=False)       # front access panel
    # the work deck inside the rim
    sc.box(26, 694, 26, 514, z1, DECK_Z, 'deck', 8, top=True)


def add_lid(sc, alpha):
    """Smoky tinted hinged lid (translucent faces + glossy edges)."""
    if alpha <= 0.01:
        return
    xa, xb = LID_X
    prof = LID_PROFILE
    col = P.SMOKE
    edge = P.BODY[6] if alpha > 0.12 else None
    # glossy reflections: two thin diagonal streaks on the sloped front and the top
    (ya, za), (yb, zb) = prof[1], prof[2]
    for k, (u0, w) in enumerate(((0.12, 0.05), (0.24, 0.02))):
        x0 = xa + (xb - xa) * u0
        x1 = x0 + (xb - xa) * w
        sc.add_trans([[x0, ya, za], [x1, ya, za], [x1 + 60, yb, zb], [x0 + 60, yb, zb]], P.BODY[8], alpha * 0.9,
                     51 + k, None)
    n = len(prof)
    for i in range(n - 1):
        (ya, za), (yb, zb) = prof[i], prof[i + 1]
        sc.add_trans([[xa, ya, za], [xb, ya, za], [xb, yb, zb], [xa, yb, zb]], col, alpha, 50, edge)
    sc.add_trans([[xa, y, z] for y, z in prof], col, alpha * 0.8, 50, edge)
    sc.add_trans([[xb, y, z] for y, z in prof[::-1]], col, alpha * 0.8, 50, edge)


def add_reagent_tray(sc, ang, hero_bottle_lift=0.0):
    cx, cy = RT
    sc.cyl(cx, cy, RT_R, DECK_Z, 330, 36, 'tray', 20, top=True)
    sc.ring(cx, cy, RT_R - 10, RT_R, 330.2, 36, 'trayrim', 21)
    sc.cyl(cx, cy, 22, 330, 352, 12, 'trim', 22, top=True)
    for k in range(RT_N):
        a = math.radians(ang + k * 360.0 / RT_N)
        ca, sa = math.cos(a), math.sin(a)
        # wedge bottle: narrow toward the centre
        r0, r1 = RT_RING - 26, RT_RING + 18
        w0, w1 = 13.0, 21.0
        poly = [(cx + ca * r0 - sa * w0, cy + sa * r0 + ca * w0), (cx + ca * r1 - sa * w1, cy + sa * r1 + ca * w1),
                (cx + ca * r1 + sa * w1, cy + sa * r1 - ca * w1), (cx + ca * r0 + sa * w0, cy + sa * r0 - ca * w0)]
        oid = 100 + k
        sc.prism(poly, 332, 384, 'bottle', oid)
        nx, ny = cx + ca * RT_RING, cy + sa * RT_RING
        cap = CAP_COLORS[k % 3]
        sc.cyl(nx, ny, 8.0, 384, 390, 8, 'bottle', oid + 20)
        sc.cyl(nx, ny, 9.5, 390, 398, 10, cap, oid + 40, top=False)
        sc.ring(nx, ny, 5.5, 9.5, 398, 10, cap, oid + 41)
        sc.cyl(nx, ny, 5.5, 389, 397.8, 10, 'dark', oid + 42, top=True)
        # label band on the outer face
        lb = [(cx + ca * (r1 + 0.6) - sa * (w1 - 3), cy + sa * (r1 + 0.6) + ca * (w1 - 3)),
              (cx + ca * (r1 + 0.6) + sa * (w1 - 3), cy + sa * (r1 + 0.6) - ca * (w1 - 3))]
        sc.add([[lb[0][0], lb[0][1], 346], [lb[1][0], lb[1][1], 346], [lb[1][0], lb[1][1], 366],
                [lb[0][0], lb[0][1], 366]], cap, oid + 60, two_sided=True)


def add_sample_tray(sc, ang):
    cx, cy = ST
    sc.cyl(cx, cy, ST_R, DECK_Z, 318, 36, 'tray', 30, top=True)
    sc.ring(cx, cy, ST_R - 8, ST_R, 318.2, 36, 'trayrim', 31)
    sc.cyl(cx, cy, 30, 318, 334, 12, 'trim', 32, top=True)
    for k in range(ST_N):
        a = math.radians(ang + k * 360.0 / ST_N)
        tx, ty = cx + math.cos(a) * ST_RING, cy + math.sin(a) * ST_RING
        oid = 200 + k
        sc.cyl(tx, ty, 7.2, 318, 324, 8, 'amberc', oid + 40)                # rack collar
        sc.cyl(tx, ty, 6.2, 324, 356, 8, 'serum', oid, top=True)            # pale-gold serum
        sc.cyl(tx, ty, 6.2, 356, 386, 8, 'glass', oid + 20, top=False)      # empty glass above it
        if k % 5 == 0:                                                      # an inner ring of tubes
            a2 = a + math.radians(9)
            ux, uy = cx + math.cos(a2) * (ST_RING - 30), cy + math.sin(a2) * (ST_RING - 30)
            sc.cyl(ux, uy, 6.2, 318, 350, 8, 'serum', oid + 60)
            sc.cyl(ux, uy, 6.2, 350, 380, 8, 'glass', oid + 80, top=False)


def liquid_mat(state):
    """state: ('empty'|'reagent'|'serum'|'mix', rose 0..1)."""
    kind, rose = state
    if kind == 'empty':
        return None
    if rose > 0.8:
        return 'rose'
    if rose > 0.5:
        return 'rose2'
    if rose > 0.2:
        return 'rose1'
    if kind == 'reagent':
        return 'reagent'
    return 'pale'


LIQ_COL = {'reagent': (P.RG[6], P.RG[5]), 'pale': (P.SE[8], P.SE[7]), 'rose1': (P.RO[8], P.RO[7]),
           'rose2': (P.RO[7], P.RO[6]), 'rose': (P.RO[6], P.RO[5])}


def add_liquid(sc, x, y, z0, z1, m, oid):
    """Translucent liquid: tinted faces blended over what is behind (plus a lighter surface)."""
    top, side = LIQ_COL[m]
    a = CUV_IN
    x0, x1, y0, y1 = x - a, x + a, y - a, y + a
    for f in ([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
              [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
              [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]]):
        sc.add_trans(f, side, 0.62, oid, None, two_sided=True)
    sc.add_trans([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], top, 0.75, oid, None)


def add_line(sc, offset, hero_slot, hero_state, cuv_states, hero_fill=1.0):
    # rail with a groove
    sc.box(LINE_X0 - 18, slot_x(N_SLOTS - 1) + 18, LINE_Y - 18, LINE_Y + 18, DECK_Z, 316, 'rail', 40)
    sc.box(LINE_X0 - 18, slot_x(N_SLOTS - 1) + 18, LINE_Y - 7, LINE_Y + 7, 315.9, 316.3, 'dark', 41, top=True)
    frac = offset - math.floor(offset)
    for j in range(-1, N_SLOTS + 1):
        pos = j + frac
        if pos < -0.5 or pos > N_SLOTS - 0.5:
            continue
        x = slot_x(pos)
        hero = hero_slot is not None and abs(pos - hero_slot) < 0.01
        state = hero_state if hero else cuv_states(pos)
        oid = 400 + j
        m = liquid_mat(state)
        lvl = 18.0 if state[0] == 'reagent' else 20.5
        if hero and state[0] == 'reagent':
            lvl = 18.0 * hero_fill
        if m is not None and lvl > 0.6:
            add_liquid(sc, x, LINE_Y, CUV_Z0 + 1.5, CUV_Z0 + lvl, m, oid + 100)
        rim = P.SE[7] if hero else P.RG[6]
        a = 0.22 if hero else 0.14
        x0, x1, y0, y1 = x - CUV_HALF, x + CUV_HALF, LINE_Y - CUV_HALF, LINE_Y + CUV_HALF
        z0, z1 = CUV_Z0, CUV_Z1
        for f in ([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
                  [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
                  [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]]):
            sc.add_trans(f, P.RG[7], a, oid, rim if hero else P.RG[5], two_sided=True)
        sc.add_trans([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], P.RG[7], 0.0, oid, rim)


def add_arm(sc, post, ang, z_arm, length, accent, oid, probe_fill=0.0, fill_mat='serum'):
    px, py = post
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    # post (column) with an accent band
    sc.cyl(px, py, 13.0, DECK_Z, z_arm - 6, 12, 'body', oid, top=False)
    sc.cyl(px, py, 13.6, z_arm - 16, z_arm - 8, 12, accent, oid + 1, top=False)
    # arm body: a rounded bar from the post to the tip housing
    hw = 8.5
    tipx, tipy = px + ca * length, py + sa * length
    poly = []
    for k in range(7):
        t = math.radians(90 + 180 * k / 6) + a
        poly.append((px + math.cos(t) * 15, py + math.sin(t) * 15))
    for k in range(7):
        t = math.radians(-90 + 180 * k / 6) + a
        poly.append((tipx + math.cos(t) * hw, tipy + math.sin(t) * hw))
    sc.prism(poly, z_arm - 6, z_arm + 8, 'body', oid + 2)
    # accent stripe along the top
    s0, s1 = 18.0, length - 8.0
    stripe = [(px + ca * s0 - sa * 3, py + sa * s0 + ca * 3), (px + ca * s1 - sa * 3, py + sa * s1 + ca * 3),
              (px + ca * s1 + sa * 3, py + sa * s1 - ca * 3), (px + ca * s0 + sa * 3, py + sa * s0 - ca * 3)]
    sc.prism(stripe, z_arm + 8, z_arm + 9.2, accent, oid + 3)
    sc.cyl(px, py, 15.5, z_arm + 8, z_arm + 12, 12, accent, oid + 4)       # pivot cap
    # tip housing and the probe
    sc.cyl(tipx, tipy, 6.5, z_arm - 14, z_arm - 4, 8, accent, oid + 5)
    sc.cyl(tipx, tipy, 1.6, z_arm - 14 - PROBE_LEN, z_arm - 14, 6, 'metal', oid + 6)
    return tipx, tipy, z_arm - 14 - PROBE_LEN


def add_mixer(sc, paddle_down=0.0):
    """A compact stirrer bridge over the line at slot M: two legs, a beam, the motor, the paddle rod."""
    sx = slot_x(SLOT_M)
    for y0, y1 in ((LINE_Y - 24, LINE_Y - 17), (LINE_Y + 17, LINE_Y + 24)):
        sc.box(sx - 6, sx + 6, y0, y1, DECK_Z, 374, 'body', 60 + int(y0 > LINE_Y))
    sc.box(sx - 8, sx + 8, LINE_Y - 24, LINE_Y + 24, 374, 384, 'trim', 62)
    sc.box(sx - 7, sx + 7, LINE_Y - 7, LINE_Y + 7, 384, 398, 'body', 63)
    sc.box(sx - 7.6, sx + 7.6, LINE_Y - 7.6, LINE_Y + 7.6, 394, 397, 'mintc', 64, top=False)
    z_tip = 352 - paddle_down * 26
    sc.cyl(sx, LINE_Y, 1.0, z_tip, 374, 6, 'metal', 65, top=False)
    sc.box(sx - 2.4, sx + 2.4, LINE_Y - 0.5, LINE_Y + 0.5, z_tip - 5, z_tip, 'metal', 66)


def add_optics(sc, glow=0.0):
    sx = slot_x(SLOT_O)
    sc.box(sx - 16, sx + 16, LINE_Y - 26, LINE_Y - 7, DECK_Z, 354, 'optic', 70)      # lamp side (front)
    sc.box(sx - 16, sx + 16, LINE_Y + 7, LINE_Y + 26, DECK_Z, 354, 'optic', 71)      # detector side (back)
    sc.box(sx - 16, sx + 16, LINE_Y - 26, LINE_Y + 26, 354, 360, 'optic', 72)        # bridge over the slot
    sc.box(sx - 10, sx + 10, LINE_Y - 44, LINE_Y - 26, DECK_Z, 344, 'trim', 73)      # lamp housing
    sc.box(sx - 5, sx + 5, LINE_Y - 45.5, LINE_Y - 44, 322, 334, 'lamp', 74, top=False)
    # wash station
    wx = slot_x(SLOT_W)
    sc.box(wx - 9, wx + 9, LINE_Y + 12, LINE_Y + 34, DECK_Z, 410, 'trim', 75)
    sc.box(wx - 9, wx + 9, LINE_Y - 6, LINE_Y + 12, 404, 412, 'trim', 76)
    for k in (-4, 0, 4):
        sc.cyl(wx + k, LINE_Y, 1.0, 372, 404, 5, 'metal', 77 + k, top=False)


def add_workstation(sc):
    x0, x1, y0, y1, z0, z1 = MON
    sc.box(812, 892, 196, 270, 0, 8, 'bezel', 80)                     # stand foot
    sc.box(844, 860, 236, 248, 8, z0 + 10, 'bezel', 81)               # neck
    sc.box(x0, x1, y0, y1, z0, z1, 'bezel', 82)                       # panel
    sx0, sx1, sz0, sz1 = SCREEN
    sc.add([[sx0, y0 - 0.6, sz1], [sx1, y0 - 0.6, sz1], [sx1, y0 - 0.6, sz0], [sx0, y0 - 0.6, sz0]], 'screen', 83,
           two_sided=True)
    # keyboard
    sc.box(770, 990, 40, 112, 0, 10, 'bezel', 84)
    for r in range(4):
        sc.box(778, 982, 48 + r * 16, 58 + r * 16, 10, 12, 'key', 85 + r)
    sc.box(1010, 1040, 60, 104, 0, 9, 'bezel', 90)                    # mouse


def add_bench(sc):
    sc.box(-900, 1900, -700, 1300, -40, 0, 'bench', 0)


def build(st):
    """st: the machine state at one instant (timeline.machine(t))."""
    sc = Scene()
    materials(sc)
    add_bench(sc)
    add_body(sc)
    add_reagent_tray(sc, st['rt_ang'])
    add_sample_tray(sc, st['st_ang'])
    add_line(sc, st['line'], st['hero_slot'], st['hero_state'], st['cuv_state'], st.get('hero_fill', 1.0))
    tips = {}
    tips['r'] = add_arm(sc, RA_POST, st['ra_ang'], st['ra_z'], RA_LEN, 'armt', 500)
    tips['s'] = add_arm(sc, SA_POST, st['sa_ang'], st['sa_z'], SA_LEN, 'arma', 520)
    add_mixer(sc, st.get('mix', 0.0))
    add_optics(sc)
    add_workstation(sc)
    add_lid(sc, st.get('lid', 0.3))
    return sc, tips


def tip_pos(post, ang, z_arm, length):
    a = math.radians(ang)
    return post[0] + math.cos(a) * length, post[1] + math.sin(a) * length, z_arm - 14 - PROBE_LEN
