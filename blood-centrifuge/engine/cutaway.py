"""The centrifuge cut open: what spins inside.

The same 3/4 view as the outside shots (x right, y toward the viewer, z up; screen sx = CX + x, sy = CY + KC*y - z),
drawn closer. The front half and the top of the casing are cut away, and the cut faces are hatched like a technical
section. What remains:
  - the back wall with vents, a control board and its cable;
  - the steel bowl, cut in half;
  - the swing-out rotor on its drive shaft: four arms and four buckets that hang down at rest and swing out level as
    the speed climbs, our tube in one of them, the balance tube opposite;
  - the electric motor below, cut in half: copper windings, a spinning armature, bearings, rubber mounts.
The casing comes apart in two pieces at the start of the scene and closes again at the end.
"""
import math
import numpy as np
from . import gfx, tube, fx, pixfont
from . import timeline as T
from .palette import MW, AL, TL, BL, PK, PL, GL, BG, OUTLINE

KC = 0.5
CX, CY = 135, 178                  # screen point of the casing's top centre (x = y = z = 0)
HWc, HDc, FHc = 128, 96, 214       # half width, half depth, height of the casing
BOWL_R, BOWL_TOP, BOWL_FLOOR = 88, -6, -100
HUB_Z, HUB_R = -34, 13
RP, BLEN, BR = 36, 40, 9           # pivot radius, bucket length, bucket radius
MOTOR_R, MOTOR_TOP, MOTOR_BOT = 46, -140, -194
FLOOR_Z = -205
TUBE_S = 0.16

CUT_PAL = np.array(sorted(set(AL + MW + TL + BL + PK + PL + GL + BG)), np.float32)


def P(x, y, z):
    return CX + x, CY + KC * y - z


# ---------------------------------------------------------------- hatched section faces
def hatch(buf, mk, base=MW[6], line=MW[3], edge=MW[0]):
    if mk.empty():
        return
    xs, ys = mk.grid()
    stripes = ((np.floor(xs) + np.floor(ys)) % 4) == 0
    gfx.fill(buf, mk, base)
    gfx.fill(buf, gfx.Mask(mk.x0, mk.y0, mk.m & stripes), line)
    gfx.fill(buf, mk.outline(), edge)


# ---------------------------------------------------------------- static parts (drawn once)
_STATIC = {}


def _arc_y(x, r, z, back=True):
    """Screen y of the bowl/motor circle (radius r, height z) at screen x offset, back half."""
    yy = -np.sqrt(np.maximum(r * r - x * x, 0)) if back else np.sqrt(np.maximum(r * r - x * x, 0))
    return CY + KC * yy - z


def static_layer():
    if 'img' in _STATIC:
        return _STATIC['img']
    from . import machine
    buf = np.zeros((gfx.H, gfx.W, 3), np.uint8)
    machine.draw_room(buf, CX, CY + 140, 0.0, wall_off=0, glow=1.0)
    # shadow on the bench
    gfx.fill_dither(buf, gfx.ellipse(CX, CY + FHc + 2, HWc + 10, 9), None, BG[1], 0.6)
    gfx.fill(buf, gfx.ellipse(CX, CY + FHc + 1, HWc - 4, 5), BG[0])
    Y, X = np.mgrid[0:gfx.H, 0:gfx.W]
    Xc, Yc = X + 0.5, Y + 0.5
    xin0, xin1 = CX - HWc + 5, CX + HWc - 5
    # back wall, inside face (darker toward the floor)
    bw_top, bw_bot = P(0, -HDc + 5, -3)[1], P(0, -HDc + 5, FLOOR_Z)[1]
    back = gfx.rect(xin0, bw_top, xin1, bw_bot)
    _, ys = back.grid()
    gfx.shade(buf, back, MW[2:7], np.broadcast_to(np.clip(0.75 - 0.6 * (ys - bw_top) / (bw_bot - bw_top), 0, 1),
                                                    back.m.shape))
    for k in range(4):                                         # panel seams
        sx = xin0 + (k + 1) * (xin1 - xin0) / 5
        gfx.fill(buf, gfx.rect(sx, bw_top, sx + 1, bw_bot), MW[3])
    for k in range(6):                                         # vents (upper right)
        y = bw_top + 12 + 4 * k
        gfx.fill(buf, gfx.rect(CX + 66, y, CX + 112, y + 2), MW[1])
        gfx.fill(buf, gfx.rect(CX + 66, y + 2, CX + 112, y + 3), MW[5])
    # floor, inside face
    fl = gfx.rect(xin0, bw_bot, xin1, P(0, 0, FLOOR_Z)[1])
    _, ys = fl.grid()
    gfx.shade(buf, fl, MW[1:5], np.broadcast_to(np.clip(0.2 + 0.5 * (ys - bw_bot) / 46, 0, 1), fl.m.shape))
    # control board on the back wall (lower left) with chips and a cable to the motor
    bx0, by0 = CX - 116, bw_bot - 50
    board = gfx.rect(bx0, by0, bx0 + 50, by0 + 34)
    gfx.fill(buf, board.dilate(1), BG[0])
    xs, ys = board.grid()
    gfx.shade(buf, board, TL[1:5], np.clip(0.7 - 0.4 * (ys - by0) / 34, 0, 1))
    for (cx0, cy0, w, h) in ((6, 6, 12, 8), (24, 5, 8, 8), (36, 7, 9, 5), (8, 20, 7, 7), (22, 21, 16, 6)):
        gfx.fill(buf, gfx.rect(bx0 + cx0, by0 + cy0, bx0 + cx0 + w, by0 + cy0 + h), BG[1])
        gfx.fill(buf, gfx.rect(bx0 + cx0, by0 + cy0, bx0 + cx0 + w, by0 + cy0 + 1), BG[4])
    for (tx0, ty0, tx1) in ((3, 16, 47), (19, 3, 21), (33, 3, 35), (3, 29, 40)):
        gfx.fill(buf, gfx.rect(bx0 + tx0, by0 + ty0, bx0 + tx1, by0 + ty0 + 1), TL[5])
    gfx.fill(buf, gfx.rect(bx0 + 41, by0 + 21, bx0 + 47, by0 + 31), PL[4])        # capacitor
    for col, off in ((BL[4], 0), (BG[1], 3)):
        pts = [(bx0 + 50, by0 + 24 + off), (bx0 + 58, by0 + 30 + off), (CX - 52, P(0, 0, MOTOR_TOP - 22)[1] + off),
               (CX - MOTOR_R, P(0, 0, MOTOR_TOP - 22)[1] + off)]
        gfx.fill(buf, gfx.polyline(pts, 2), col)
    # ---- the bowl: back half, inner wall and floor; rim; section faces
    xr = Xc - CX
    inside = np.abs(xr) < BOWL_R
    yt = _arc_y(xr, BOWL_R, BOWL_TOP)
    yb = _arc_y(xr, BOWL_R, BOWL_FLOOR)
    ycut = CY - BOWL_FLOOR
    wall = inside & (Yc >= yt) & (Yc < yb)
    floor = inside & (Yc >= yb) & (Yc < ycut)
    v = 0.25 + 0.55 * np.sqrt(np.clip(1 - np.abs(xr) / BOWL_R, 0, 1)) - 0.25 * np.clip((Yc - yt) / 94, 0, 1)
    v = v + 0.18 * (np.abs(xr + 30) < 4) + 0.1 * (np.abs(xr - 44) < 2)
    shade_w = np.asarray(AL[0:5], np.uint8)[np.clip(np.floor(np.clip(v, 0, 1) * 4 + gfx.BAYER[:gfx.H, :gfx.W]),
                                                    0, 4).astype(int)]
    buf[wall] = shade_w[wall]
    vf = 0.1 + 0.3 * np.clip(1 - np.hypot(xr / BOWL_R, (Yc - ycut) / (BOWL_R * KC)), 0, 1)
    shade_f = np.asarray(AL[0:3], np.uint8)[np.clip(np.floor(vf * 2 + gfx.BAYER[:gfx.H, :gfx.W]), 0, 2).astype(int)]
    buf[floor] = shade_f[floor]
    rim = inside & (np.abs(Yc - yt) < 1.0)
    buf[rim] = AL[6]
    # shaft hole in the floor
    gfx.fill(buf, gfx.ellipse(CX, ycut - 1, 9, 3.5), BG[0])
    for sgn in (-1, 1):
        hatch(buf, gfx.rect(CX + sgn * BOWL_R - (6 if sgn < 0 else 0), CY - BOWL_TOP,
                            CX + sgn * BOWL_R + (6 if sgn > 0 else 0), CY - BOWL_FLOOR + 6), AL[6], AL[3], BG[0])
    hatch(buf, gfx.rect(CX - BOWL_R - 6, CY - BOWL_FLOOR, CX + BOWL_R + 6, CY - BOWL_FLOOR + 6), AL[6], AL[3], BG[0])
    # motor mount struts from the bowl floor to the motor
    for sgn in (-1, 1):
        st = gfx.rect(CX + sgn * 36 - 3, CY - BOWL_FLOOR + 6, CX + sgn * 36 + 3, CY - MOTOR_TOP)
        gfx.fill(buf, st.dilate(1), BG[0])
        xs, _ = st.grid()
        gfx.shade(buf, st, AL[2:7], np.clip(0.7 - 0.25 * (xs - st.x0) / 6, 0, 1))
    # ---- the motor: housing cut in half, windings, bearings; rubber mounts
    mt, mb = CY - MOTOR_TOP, CY - MOTOR_BOT
    inner = gfx.rect(CX - MOTOR_R + 5, mt + 6, CX + MOTOR_R - 5, mb - 6)
    gfx.fill(buf, inner, AL[1])
    for sgn in (-1, 1):                                             # housing walls (section) with cooling fins
        hatch(buf, gfx.rect(CX + sgn * MOTOR_R - (5 if sgn < 0 else 0), mt, CX + sgn * MOTOR_R + (5 if sgn > 0 else 0),
                            mb), AL[5], AL[3], BG[0])
        for k in range(5):
            fy = mt + 6 + k * 10
            gfx.fill(buf, gfx.rect(CX + sgn * (MOTOR_R + 5) - (4 if sgn < 0 else 0), fy,
                                   CX + sgn * (MOTOR_R + 5) + (4 if sgn > 0 else 0), fy + 4), AL[4])
    hatch(buf, gfx.rect(CX - MOTOR_R, mt, CX + MOTOR_R, mt + 6), AL[5], AL[3], BG[0])
    hatch(buf, gfx.rect(CX - MOTOR_R, mb - 6, CX + MOTOR_R, mb), AL[5], AL[3], BG[0])
    for yy in (mt + 1, mb - 7):                                     # bearings around the shaft
        gfx.fill(buf, gfx.rect(CX - 9, yy, CX + 9, yy + 6), BG[0])
        gfx.fill(buf, gfx.rect(CX - 8, yy + 1, CX + 8, yy + 5), AL[2])
        for k in (-6, -2, 2, 6):
            gfx.fill(buf, gfx.ellipse(CX + k, yy + 3, 1.5, 1.5), AL[6])
    for sgn in (-1, 1):                                             # rubber mounts
        m = gfx.rrect(CX + sgn * 30 - 8, mb, CX + sgn * 30 + 8, CY - FLOOR_Z, 2)
        gfx.fill(buf, m.dilate(1), BG[0])
        gfx.fill(buf, m, BG[2])
        gfx.fill(buf, m.top_edge(), BG[5])
    # terminal box with the cable entry
    tb = gfx.rect(CX - MOTOR_R - 12, P(0, 0, MOTOR_TOP - 16)[1], CX - MOTOR_R - 4, P(0, 0, MOTOR_TOP - 30)[1])
    gfx.fill(buf, tb.dilate(1), BG[0])
    gfx.fill(buf, tb, AL[3])
    # ---- casing section: side walls, back wall top edge, bottom panel, plinth
    hatch(buf, gfx.rect(CX - HWc, CY - HDc * KC, CX - HWc + 5, CY + FHc))
    hatch(buf, gfx.rect(CX + HWc - 5, CY - HDc * KC, CX + HWc, CY + FHc))
    hatch(buf, gfx.rect(CX - HWc, CY - HDc * KC, CX + HWc, CY - HDc * KC + 3))
    hatch(buf, gfx.rect(CX - HWc, CY - FLOOR_Z, CX + HWc, CY + FHc - 3))
    gfx.fill(buf, gfx.rect(CX - HWc, CY + FHc - 3, CX + HWc, CY + FHc + 1), AL[1])
    for fxx in (CX - HWc + 16, CX + HWc - 28):
        gfx.fill(buf, gfx.rect(fxx, CY + FHc + 1, fxx + 12, CY + FHc + 4), AL[0])
    _STATIC['img'] = buf
    return buf


# ---------------------------------------------------------------- moving parts
def draw_motor_live(buf, t, theta, running):
    """Copper windings (glow while energised), the spinning armature and the shaft."""
    mt, mb = CY - MOTOR_TOP, CY - MOTOR_BOT
    glow = 0.0 if running <= 0 else running * (0.75 + 0.25 * math.sin(t * 38))
    for sgn in (-1, 1):
        for k in range(5):
            y0 = mt + 8 + k * 8.8
            coil = gfx.rrect(CX + sgn * 41 - (13 if sgn > 0 else 0), y0, CX + sgn * 41 + (13 if sgn < 0 else 0), y0 + 7.5, 2)
            xs, ys = coil.grid()
            v = 0.45 + 0.35 * (1 - (ys - y0) / 7.5) + 0.25 * glow
            gfx.shade(buf, coil, PL[1:7], np.clip(v, 0, 1))
            gfx.fill(buf, coil.bottom_edge(), PL[0])
    # armature: a laminated cylinder whose slots slide across as it turns
    ax0, ax1 = CX - 24, CX + 24
    arm = gfx.rect(ax0, mt + 8, ax1, mb - 8)
    xs, ys = arm.grid()
    u = (xs - CX) / 24.0
    base = 0.25 + 0.55 * np.sqrt(np.clip(1 - u * u, 0, 1)) - 0.15 * u
    ph = np.arcsin(np.clip(u, -1, 1)) + theta * 1.0
    slots = (np.cos(ph * 6) > 0.72)
    v = np.where(slots, base - 0.3, base)
    lam = ((np.floor(ys) - (mt + 8)) % 5) == 0
    v = np.where(lam, v - 0.08, v)
    gfx.shade(buf, arm, AL[1:8], np.clip(v, 0, 1))
    gfx.fill(buf, arm.outline(), BG[0])
    # shaft from the armature up through the bowl floor to the hub
    sh = gfx.rect(CX - 4, CY - HUB_Z + 6, CX + 4, mt + 8)
    xs, ys = sh.grid()
    us = (xs - CX) / 4.0
    vs = 0.3 + 0.6 * np.sqrt(np.clip(1 - us * us, 0, 1)) - 0.2 * us
    key = math.sin(theta)
    if math.cos(theta) > 0:
        vs = np.where(np.abs(us - key) < 0.3, vs - 0.45, vs)
    gfx.fill(buf, sh.dilate(1) - gfx.rect(CX - 9, CY - BOWL_FLOOR - 4, CX + 9, CY - BOWL_FLOOR + 1), BG[0])
    gfx.shade(buf, sh, AL[2:9], np.clip(vs, 0, 1))


def _bucket(buf, phi, beta, sep, has_tube, pv_only=False):
    """One arm + yoke + bucket (+ tube) at rotor angle phi and swing beta. Returns screen points (pivot, bottom)."""
    c, s = math.cos(phi), math.sin(phi)
    r_hat = np.array([c, s, 0.0])
    t_hat = np.array([-s, c, 0.0])
    pv = np.array([RP * c, RP * s, HUB_Z])
    d = np.array([math.sin(beta) * c, math.sin(beta) * s, -math.cos(beta)])
    e2 = np.cross(d, t_hat)
    e2 /= np.linalg.norm(e2)
    bc = pv + BLEN * d
    pvs, bcs = P(*pv), P(*bc)
    if pv_only:
        return pvs, bcs
    # arm (underside, then top) from the hub to the yoke
    h0 = P(*(r_hat * 10 + np.array([0, 0, HUB_Z])))
    a1 = P(*(r_hat * (RP - 6) + np.array([0, 0, HUB_Z])))
    gfx.fill(buf, gfx.line(h0[0], h0[1] + 3, a1[0], a1[1] + 3, 6), AL[2])
    arm = gfx.line(h0[0], h0[1], a1[0], a1[1], 6)
    gfx.fill(buf, arm, AL[5])
    gfx.fill(buf, arm.top_edge(), AL[7])
    # yoke across the tangent, with the pivot pins
    y1, y2 = P(*(pv - (BR + 3) * t_hat)), P(*(pv + (BR + 3) * t_hat))
    gfx.fill(buf, gfx.line(y1[0], y1[1], y2[0], y2[1], 3), AL[3])
    # bucket bottom (closed cup)
    ps = np.linspace(0, 2 * math.pi, 20, endpoint=False)
    ring_b = [P(*(bc + (BR - 1) * (math.cos(q) * t_hat + math.sin(q) * e2))) for q in ps]
    bot = gfx.polygon(ring_b)
    gfx.fill(buf, bot.dilate(1), BG[0])
    gfx.fill(buf, bot, AL[3])
    gfx.fill(buf, bot.top_edge(), AL[5])
    # the tube inside (cap at the opening, bottom against the cup)
    if has_tube:
        cen = pv + (125 * TUBE_S - 2) * d
        tip = pv + (250 * TUBE_S - 2) * d
        top = pv - 2 * d
        a, b = P(*top), P(*tip)
        vx, vy = b[0] - a[0], b[1] - a[1]
        f = max(0.25, math.hypot(vx, vy) / (250 * TUBE_S))
        ang = math.atan2(-vx, vy)
        cs = P(*cen)
        tube.draw(buf, cs[0], cs[1], TUBE_S * f ** (1 / 3.0), ang=ang, sep=sep, squash=f ** (2 / 3.0), label=True)
    # cage rails and the opening ring
    for q in (0.0, math.pi / 2, math.pi, 1.5 * math.pi):
        off = BR * (math.cos(q) * t_hat + math.sin(q) * e2)
        p1, p2 = P(*(pv + off)), P(*(bc + 0.9 * off))
        front = (math.cos(q) * t_hat + math.sin(q) * e2)[1] > -0.2
        gfx.fill(buf, gfx.line(p1[0], p1[1], p2[0], p2[1], 2), AL[6] if front else AL[3])
    ring_o = [P(*(pv + BR * (math.cos(q) * t_hat + math.sin(q) * e2))) for q in ps] + \
             [P(*(pv + BR * (math.cos(ps[0]) * t_hat + math.sin(ps[0]) * e2)))]
    gfx.fill(buf, gfx.polyline(ring_o, 2), AL[7])
    for sgn in (-1, 1):
        pp = P(*(pv + sgn * (BR + 2) * t_hat))
        gfx.fill(buf, gfx.rect(pp[0] - 1, pp[1] - 1, pp[0] + 2, pp[1] + 2), AL[8])
    return pvs, bcs


def draw_rotor(buf, theta, beta, sep):
    """The whole swing-out rotor at angle theta: back buckets, hub, front buckets."""
    items = []
    for k in range(4):
        phi = theta + k * math.pi / 2 + math.pi / 2
        items.append((math.sin(phi), k, phi))
    items.sort()
    back = [it for it in items if it[0] < 0.05]
    front = [it for it in items if it[0] >= 0.05]
    for _, k, phi in back:
        _bucket(buf, phi, beta, sep, k in (0, 2))
    # hub (on the shaft)
    hs = gfx.ellipse(*P(0, 0, HUB_Z - 6), HUB_R, HUB_R * KC)
    gfx.fill(buf, hs.dilate(1), BG[0])
    gfx.fill(buf, hs, AL[2])
    gfx.fill(buf, gfx.rect(CX - HUB_R, P(0, 0, HUB_Z + 5)[1], CX + HUB_R, P(0, 0, HUB_Z - 6)[1]), AL[3])
    ht = gfx.ellipse(*P(0, 0, HUB_Z + 5), HUB_R, HUB_R * KC)
    xs, ys = ht.grid()
    gfx.shade(buf, ht, AL[4:9], np.clip(0.75 - 0.3 * (xs - CX) / HUB_R, 0, 1))
    nx, ny = P(0, 0, HUB_Z + 5)
    gfx.fill(buf, gfx.ellipse(nx, ny, 5, 2.5), AL[2])
    mk = theta + math.pi
    gfx.fill(buf, gfx.ellipse(nx + 9 * math.cos(mk), ny + 4.5 * math.sin(mk), 1.6, 1.2), BL[5])
    for _, k, phi in front:
        _bucket(buf, phi, beta, sep, k in (0, 2))


def tube_screen(t):
    """Screen centre of our tube (bucket 0) in the cutaway at time t, and its screen axis direction."""
    theta = T.cut_angle(t)
    beta = T.swing(t)
    phi = theta + math.pi / 2
    c, s = math.cos(phi), math.sin(phi)
    pv = np.array([RP * c, RP * s, HUB_Z])
    d = np.array([math.sin(beta) * c, math.sin(beta) * s, -math.cos(beta)])
    cen = P(*(pv + (125 * TUBE_S - 2) * d))
    a, b = P(*(pv - 2 * d)), P(*(pv + (250 * TUBE_S - 2) * d))
    return cen, (b[0] - a[0], b[1] - a[1])


_scr = {}


def rotor_layer(buf, t, fps, sep):
    """Draw the rotor over buf with motion blur (sub-frames averaged over the background, then dithered)."""
    theta = T.cut_angle(t)
    beta = T.swing(t)
    sweep = abs(T.cut_omega(t)) / fps
    n = 1 if sweep < 0.06 else int(min(10, math.ceil(sweep / 0.1)))
    x0, y0 = int(CX - RP - BLEN - BR - 8), int(CY - HUB_Z - (RP + BLEN) * KC - 22)
    x1, y1 = int(CX + RP + BLEN + BR + 9), int(CY - HUB_Z + BLEN + BR + 12)
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, gfx.W), min(y1, gfx.H)
    if n == 1:
        draw_rotor(buf, theta, beta, sep)
        return
    if 's' not in _scr:
        _scr['s'] = np.zeros((gfx.H, gfx.W, 3), np.uint8)
    scratch = _scr['s']
    base = buf[y0:y1, x0:x1].copy()
    acc = np.zeros(base.shape, np.float32)
    for i in range(n):
        a = theta - sweep * (i + 0.5) / n
        scratch[y0:y1, x0:x1] = base
        draw_rotor(scratch, a, beta, sep)
        acc += scratch[y0:y1, x0:x1]
    acc /= n
    buf[y0:y1, x0:x1] = gfx.quantize(acc, CUT_PAL, x0, y0, spread=18)


# ---------------------------------------------------------------- casing pieces that fly apart / come back
def _front_piece(buf, dy, keep, rpm_txt):
    if keep <= 0:
        return
    tmp = np.zeros_like(buf)
    m = np.zeros(buf.shape[:2], bool)
    top_y, front_top, front_bot = CY, CY + HDc * KC, CY + HDc * KC + FHc
    topf = gfx.rrect(CX - HWc, top_y - 6, CX + HWc, front_top + 6, 22, 12) & gfx.rect(0, top_y, gfx.W, front_top)
    face = gfx.rrect(CX - HWc, front_top - 14, CX + HWc, front_bot, 18, 10) & gfx.rect(0, front_top, gfx.W, front_bot)
    gfx.fill(tmp, (topf | face).outline(), MW[0])
    xs, ys = topf.grid()
    gfx.shade(tmp, topf, MW[4:9], np.clip(0.8 + 0.15 * (ys - top_y) / 48, 0, 1))
    gfx.fill(tmp, topf.bottom_edge(), MW[8])
    hatch(tmp, gfx.rect(CX - HWc + 2, top_y, CX + HWc - 2, top_y + 4))
    xs, ys = face.grid()
    u = (xs - CX) / HWc
    gfx.shade(tmp, face, MW[2:9], np.clip(0.66 - 0.3 * np.maximum(u, 0) ** 3
                                          - 0.12 * np.clip((ys - front_top - 120) / 90, 0, 1), 0, 1))
    pan = gfx.rrect(CX - 110, front_top + 14, CX + 110, front_top + 60, 3)
    gfx.fill(tmp, pan.outline(), MW[2])
    gfx.fill(tmp, pan, BG[5])
    gfx.fill(tmp, gfx.rect(CX - 102, front_top + 20, CX - 36, front_top + 48), TL[0])
    pixfont.draw_lcd(tmp, rpm_txt, CX - 98, front_top + 24, TL[7], (17, 38, 33))
    for bx, rmp in ((CX + 6, TL), (CX + 40, BL), (CX + 74, MW)):
        b = gfx.ellipse(bx, front_top + 36, 9.5, 8.5)
        gfx.fill(tmp, b.dilate(1), BG[0])
        xs, ys = b.grid()
        gfx.shade(tmp, b, rmp[3:9], np.clip(0.8 - 0.3 * (xs - bx) / 9.5 - 0.4 * (ys - front_top - 36) / 8.5, 0, 1))
    for k in range(6):
        y = front_top + 74 + 3 * k
        gfx.fill(tmp, gfx.rect(CX + 46, y, CX + 110, y + 1), MW[2])
        gfx.fill(tmp, gfx.rect(CX + 46, y + 1, CX + 110, y + 2), MW[8])
    pixfont.draw_text(tmp, 'CENTRIFUGE', CX - 98, front_top + 70, MW[3], font='3x5', outline=None)
    gfx.fill(tmp, gfx.rect(CX - HWc + 1, front_bot - 10, CX + HWc - 1, front_bot), AL[2])
    for mk_ in (topf, face, (topf | face).outline()):
        sub = mk_.shifted(0, 0)
        m[sub.y0:sub.y1, sub.x0:sub.x1] |= sub.m
    _blit(buf, tmp, m, dy, keep)


def _top_piece(buf, dy, keep):
    if keep <= 0:
        return
    tmp = np.zeros_like(buf)
    m = np.zeros(buf.shape[:2], bool)
    topb = gfx.rrect(CX - HWc, CY - HDc * KC, CX + HWc, CY + 6, 22, 12) & gfx.rect(0, 0, gfx.W, CY + 4)
    gfx.fill(tmp, topb.outline(), MW[0])
    xs, ys = topb.grid()
    gfx.shade(tmp, topb, MW[4:9], np.clip(0.7 + 0.12 * (ys - CY) / 48, 0, 1))
    hatch(tmp, gfx.rect(CX - HWc + 2, CY, CX + HWc - 2, CY + 4))
    lid_r = 84
    lid_side = gfx.ellipse(CX, CY + 1, lid_r, lid_r * KC)
    lid = gfx.ellipse(CX, CY - 6, lid_r, lid_r * KC)
    gfx.fill(tmp, (lid | lid_side).outline(), MW[0])
    gfx.fill(tmp, lid_side, MW[3])
    xs, ys = lid.grid()
    gfx.shade(tmp, lid, MW[4:9], np.clip(0.75 - 0.2 * (xs - CX) / lid_r - 0.25 * (ys - CY + 6) / (lid_r * KC), 0, 1))
    trim = gfx.ellipse(CX, CY - 6, 64, 32) - gfx.ellipse(CX, CY - 6, 59, 29.5)
    gfx.fill(tmp, trim, TL[5])
    win = gfx.ellipse(CX, CY - 6, 59, 29.5)
    gfx.fill(tmp, win, GL[1])
    gfx.fill(tmp, (gfx.line(CX - 34, CY + 4, CX - 14, CY - 22, 2) | gfx.line(CX - 20, CY + 10, CX - 4, CY - 12)) & win,
             GL[4])
    for mk_ in (topb, lid, lid_side, (lid | lid_side | topb).outline()):
        m[mk_.y0:mk_.y1, mk_.x0:mk_.x1] |= mk_.m
    _blit(buf, tmp, m, dy, keep)


def _blit(buf, tmp, m, dy, keep):
    dy = int(round(dy))
    H = buf.shape[0]
    src = slice(max(0, -dy), min(H, H - dy))
    dst = slice(max(0, dy), min(H, H + dy))
    mm = m[src]
    if keep < 1:
        mm = mm & (gfx.BAYER[:gfx.H, :gfx.W][dst] < keep)
    buf[dst][mm] = tmp[src][mm]


# ---------------------------------------------------------------- HUD, labels, arrows
def hud(buf, t, a):
    if a <= 0:
        return
    x0, y0 = 10, 12
    box = gfx.rect(x0, y0, x0 + 62, y0 + 24)
    gfx.fill_dither(buf, box.dilate(1), None, BG[0], a)
    gfx.fill_dither(buf, box, None, TL[0], a)
    if a > 0.6:
        pixfont.draw_lcd(buf, '%4d' % T.rpm(t), x0 + 4, y0 + 4, TL[7], (17, 38, 33))
        pixfont.draw_text(buf, 'RPM', x0 + 34, y0 + 8, TL[6], font='3x5', outline=None)
        bar = gfx.rect(x0 + 4, y0 + 17, x0 + 58, y0 + 19)
        gfx.fill(buf, bar, TL[1])
        gfx.fill(buf, gfx.rect(x0 + 4, y0 + 17, x0 + 4 + 54 * T.rpm_frac(t), y0 + 19), TL[6])


def vlabel(buf, t, t0, t1, x, y_from, y_to, text, col):
    """A label above the machine with a vertical leader down to the part."""
    if t < t0 or t >= t1:
        return
    k = T.clamp01((t - t0) / 0.16)
    yb = y_from + (y_to - y_from) * k
    ln = gfx.rect(x - 0.5, min(y_from, yb), x + 1.5, max(y_from, yb))
    gfx.fill(buf, ln.dilate(1, diag=True), OUTLINE)
    gfx.fill(buf, ln, col)
    gfx.fill(buf, gfx.ellipse(x + 0.5, y_from, 2.5, 2.5).dilate(1, diag=True), OUTLINE)
    gfx.fill(buf, gfx.ellipse(x + 0.5, y_from, 2.5, 2.5), col)
    if t - t0 >= 0.16:
        tp = t - t0 - 0.16
        off = -6 * (1 - T.back_out(T.clamp01(tp / 0.22), 2.4))
        pixfont.draw_text(buf, text, x + 1, y_to - 3 + off, MW[8] if tp < 0.06 else MW[7], anchor='mb', shadow=BG[0])


def force_arrows(buf, t, a):
    """Gold chevrons beside our tube and the balance tube, pointing to the tube bottoms (outward)."""
    if a <= 0:
        return
    theta = T.cut_angle(t)
    beta = T.swing(t)
    for k in (0, 2):
        phi = theta + k * math.pi / 2 + math.pi / 2
        pvs, bcs = _bucket(None, phi, beta, 0, False, pv_only=True)
        dx, dy = bcs[0] - pvs[0], bcs[1] - pvs[1]
        n = math.hypot(dx, dy) or 1.0
        ux, uy = dx / n, dy / n
        px, py = -uy, ux
        for j in range(2):
            o = 10 + 7 * j + 5 * ((t * 2.2) % 1.0)
            cx, cy = bcs[0] + ux * o, bcs[1] + uy * o
            pts = [(cx - ux * 4 + px * 4.5, cy - uy * 4 + py * 4.5), (cx, cy), (cx - ux * 4 - px * 4.5, cy - uy * 4 - py * 4.5)]
            mk = gfx.polyline(pts, 2)
            gfx.fill_dither(buf, mk.dilate(1, diag=True), None, OUTLINE, a)
            gfx.fill_dither(buf, mk, None, PL[6] if j == 0 else PL[5], a)


# ---------------------------------------------------------------- the frame
def render(t, fps=30):
    buf = static_layer().copy()
    running = T.clamp01(T.rpm_frac(t) * 3)
    theta = T.cut_angle(t)
    draw_motor_live(buf, t, theta * 3.0, running)
    sep = 1.0 if t >= T.IRIS_OUT[0] else 0.0
    rotor_layer(buf, t, fps, sep)
    spd = T.clamp01((abs(T.cut_omega(t)) / (2 * math.pi) - 1.0) / 1.6)
    fx.speed_arcs(buf, CX, CY - HUB_Z, t, spd, rx0=96, k=KC, n=6, spin=5.0)
    # HUD and labels
    hud_a = T.clamp01((t - T.OPEN[1] + 0.1) / 0.2) * T.clamp01((T.DIVE[0] + 0.05 - t) / 0.15)
    if t >= T.PULL[0]:
        hud_a = T.clamp01((t - T.PULL[1] + 0.2) / 0.2) * T.clamp01((T.CLOSE[0] + 0.1 - t) / 0.15)
    hud(buf, t, hud_a)
    vlabel(buf, t, T.LABEL_ROTOR, T.SLOWMO[0], CX, CY - HUB_Z - 8, 112, 'ROTOR', TL[6])
    if T.LABEL_MOTOR <= t < T.SLOWMO[0]:
        fx.label(buf, t, T.LABEL_MOTOR, CX + MOTOR_R + 6, (CY - MOTOR_TOP + CY - MOTOR_BOT) / 2, +1, ['MOTOR'],
                 PL[6], reach=20)
    arrows = T.clamp01((t - T.SLOWMO[0] - 0.2) / 0.25) * T.clamp01((T.DIVE[1] - t) / 0.3)
    force_arrows(buf, t, arrows)
    # casing pieces
    if t < T.OPEN[1]:
        u = T.u_of(t, T.OPEN)
        k = T.ease_in(u, 2.2)
        _front_piece(buf, 300 * k, 1 - T.clamp01((u - 0.55) / 0.45), '%4d' % T.rpm(t))
        _top_piece(buf, -270 * k, 1 - T.clamp01((u - 0.55) / 0.45))
    elif t >= T.CLOSE[0]:
        u = T.u_of(t, T.CLOSE)
        k = 1 - T.ease_out(u, 2.2)
        _front_piece(buf, 300 * k, T.clamp01(u / 0.4), '   0')
        _top_piece(buf, -270 * k, T.clamp01(u / 0.4))
    return buf


def warm():
    static_layer()
