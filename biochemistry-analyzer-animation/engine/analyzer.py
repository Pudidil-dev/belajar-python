"""The analyzer, drawn as 2D pixel art in the 3/4 top-down view of 16-bit games (the repo's centrifuge film uses the
same view): front faces straight on, top faces squashed by K, every surface shaded per pixel with dithered ramps,
1-px outlines, bright top-front edges and soft contact shadows. It is a 2D drawing whose shapes all follow one
projection, so the camera can pan and zoom across the deck; closer views switch on finer detail (bottle labels, tube
menisci, thick cuvette glass, glints) instead of enlarging a sprite.

World: millimetres, x right, y toward the viewer, z up; projected plane (u, v) = (x, K*y - z), then the 2D camera.

A compact benchtop chemistry analyzer in the spirit of the Furuno CA-310:
- off-white body, smoky hinged lid;
- reagent tray (left back), sample tray (right back);
- the reaction disk with its ring of cuvettes at the front;
- two pipette arms (reagent = teal, sample = amber), a stirrer, the optical unit, a wash station;
- the workstation monitor on the bench behind it, on the right.

The cuvettes travel round the ring through R (reagent), S (sample), M (mix) and O (optical reading). The internal
geometry and station order are a simplified, representative workflow, not a service diagram.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import put, tones, mix, poly_sel

W, H = gfx.W, gfx.H
K = 0.6

BODY = (-360.0, 360.0, -270.0, 270.0, 0.0, 300.0)
DECK_Z = 300.0
DISK = (0.0, 92.0)             # reaction disk centre
DISK_R, RING_R, N_RING = 128.0, 110.0, 36
RT = (-200.0, -72.0)           # reagent tray
RT_R, RT_RING, RT_N = 118.0, 80.0, 12
ST = (215.0, -95.0)            # sample tray
ST_R, ST_RING, ST_N = 104.0, 78.0, 20
RA_POST = (-152.0, 72.0)
SA_POST = (150.0, 40.0)
MIX_POST = (96.0, 246.0)
PROBE_LEN, HOUSING = 30.0, 14.0
ARM_HI, ARM_LO_CUV, ARM_LO_BOTTLE, ARM_LO_TUBE = 446.0, 393.0, 406.0, 394.0   # tip = arm - 44 mm
CUV_HALF, CUV_IN, CUV_Z0, CUV_Z1 = 4.2, 3.2, 314.0, 344.0
LIQ_LEVEL = 18.0
SLOT_R, SLOT_S, SLOT_M, SLOT_O, SLOT_W = T.SLOT_R, T.SLOT_S, T.SLOT_M, T.SLOT_O, 25
MON = (400.0, 660.0, -150.0, -136.0, 170.0, 350.0)   # monitor x0, x1, y0, y1, z0, z1
SCREEN = (414.0, 646.0, 182.0, 338.0)                 # screen x0, x1, z0, z1 on its front face
BENCH_BACK = -420.0


def slot_angle(p):
    """Angle (deg, from +x toward +y = toward the viewer) of ring position p; S sits at the front (90 deg)."""
    return 90.0 + (SLOT_S - p) * 10.0


def slot_xy(p):
    a = math.radians(slot_angle(p))
    return DISK[0] + RING_R * math.cos(a), DISK[1] + RING_R * math.sin(a)


def proj(x, y, z):
    return x, K * y - z


def _meet(c0, r0, c1, r1, pick):
    (x0, y0), (x1, y1) = c0, c1
    d = math.hypot(x1 - x0, y1 - y0)
    a = (r0 * r0 - r1 * r1 + d * d) / (2 * d)
    h = math.sqrt(max(r0 * r0 - a * a, 0.0))
    xm, ym = x0 + a * (x1 - x0) / d, y0 + a * (y1 - y0) / d
    return xm + pick * h * (y1 - y0) / d, ym - pick * h * (x1 - x0) / d


R_POS, S_POS = slot_xy(SLOT_R), slot_xy(SLOT_S)
RA_LEN = math.hypot(R_POS[0] - RA_POST[0], R_POS[1] - RA_POST[1])
SA_LEN = math.hypot(S_POS[0] - SA_POST[0], S_POS[1] - SA_POST[1])
RA_BOTTLE = min((_meet(RA_POST, RA_LEN, RT, RT_RING, k) for k in (1, -1)),
                key=lambda q: math.hypot(q[0] - R_POS[0], q[1] - R_POS[1]))
SA_TUBE = _meet(SA_POST, SA_LEN, ST, ST_RING, -1)


def ang(post, target):
    return math.degrees(math.atan2(target[1] - post[1], target[0] - post[0]))


RA_ANG_R, RA_ANG_B = ang(RA_POST, R_POS), ang(RA_POST, RA_BOTTLE)
SA_ANG_S, SA_ANG_T = ang(SA_POST, S_POS), ang(SA_POST, SA_TUBE)
# the sample arm swings the short way over the deck (through "back"), never out past the body's right edge
if SA_ANG_S - SA_ANG_T > 180:
    SA_ANG_S -= 360.0
RT_PICK = math.degrees(math.atan2(RA_BOTTLE[1] - RT[1], RA_BOTTLE[0] - RT[0]))
ST_PICK = math.degrees(math.atan2(SA_TUBE[1] - ST[1], SA_TUBE[0] - ST[0]))
CAPS = (P.CY, P.AM, P.MN)


def tip_pos(post, angle, z_arm, length):
    a = math.radians(angle)
    return post[0] + math.cos(a) * length, post[1] + math.sin(a) * length, z_arm - HOUSING - PROBE_LEN


# ------------------------------------------------------------------ drawing kit (3/4 projection)
class Pen:
    def __init__(self, buf, view):
        self.buf, self.view = buf, view
        self.z = view.z
        self.o = 1.0 / view.z

    def box_of(self, pts, pad=2):
        u = [p[0] for p in pts]
        v = [p[1] for p in pts]
        return self.view.box(min(u), min(v), max(u), max(v), pad)

    def grid(self, bx):
        U, V = self.view.grid(bx)
        U, V = np.broadcast_arrays(U, V)
        return np.array(U), np.array(V)

    def outline(self, bx, m, col):
        e = np.zeros_like(m)
        e[1:, :] |= m[1:, :] & ~m[:-1, :]
        e[:-1, :] |= m[:-1, :] & ~m[1:, :]
        e[:, 1:] |= m[:, 1:] & ~m[:, :-1]
        e[:, :-1] |= m[:, :-1] & ~m[:, 1:]
        put(self.buf, bx, e, col)

    def shadow(self, x, y, rx, ry, a=0.5, z=DECK_Z):
        """Soft contact shadow under an object (dithered navy)."""
        cu, cv = proj(x, y, z)
        bx = self.view.box(cu - rx * 1.3, cv - ry * 1.3, cu + rx * 1.3, cv + ry * 1.3)
        if bx is None:
            return
        U, V = self.grid(bx)
        d = ((U - cu) / rx) ** 2 + ((V - cv) / ry) ** 2
        th = gfx.bayer_at(bx[0], bx[1], bx[3] - bx[1], bx[2] - bx[0])
        mix(self.buf, bx, (d < 1.0) & (th < a * (1.2 - d)), P.NV[1], 0.5)

    def cyl(self, x, y, r, z0, z1, ramp, top=None, base=0.5, amp=0.42, hl=True, edge=None, top_v=0.82, rim=True):
        """Vertical cylinder: straight front, elliptic top and bottom, lit from the left."""
        cu, vt = proj(x, y, z1)
        _, vb = proj(x, y, z0)
        ry = K * r
        bx = self.view.box(cu - r, vt - ry, cu + r, vb + ry)
        if bx is None:
            return None
        U, V = self.grid(bx)
        s = (U - cu) / r
        topm = s * s + ((V - vt) / ry) ** 2 <= 1.0
        botm = s * s + ((V - vb) / ry) ** 2 <= 1.0
        bodym = (np.abs(s) <= 1.0) & (V >= vt) & (V <= vb)
        allm = topm | bodym | botm
        side = allm & ~topm if top is not False else allm
        val = base + amp * (0.55 * np.sqrt(np.clip(1 - s * s, 0, 1)) - 0.45 * s) \
            - 0.08 * np.clip((V - vt) / max(vb - vt, 1e-6), 0, 1)
        put(self.buf, bx, side, tones(ramp, np.clip(val, 0, 1), bx))
        if hl and r * self.z > 3:
            put(self.buf, bx, side & (np.abs(s + 0.55) < 0.6 / (r * self.z) + 0.04) & (V > vt + 1.5 * self.o),
                ramp[-1])
        if top is not False:
            tr = top if top is not None else ramp
            tv = top_v - 0.18 * ((V - vt) / ry) - 0.1 * s
            put(self.buf, bx, topm, tones(tr, np.clip(tv, 0, 1), bx))
            if rim and r * self.z > 2:
                ring = topm & (s * s + ((V - vt) / ry) ** 2 > (1 - 1.3 / max(r * self.z, 1)) ** 2)
                put(self.buf, bx, ring & (V > vt), tr[-1])
        self.outline(bx, allm, edge if edge is not None else ramp[0])
        return bx, allm

    def prism(self, foot, z0, z1, ramp, top=None, base=0.5, top_v=0.85, edge=None, light=(-0.55, 0.83),
              lift=True):
        """Upright prism on a footprint polygon (x, y): the sides that face the viewer + the top, lit per face."""
        F = [(float(a), float(b)) for a, b in foot]
        n = len(F)
        area = sum(F[i][0] * F[(i + 1) % n][1] - F[(i + 1) % n][0] * F[i][1] for i in range(n))
        if area < 0:
            F = F[::-1]                                       # counter-clockwise: outward normal = (ey, -ex)
        pts_all = [proj(x, y, z) for x, y in F for z in (z0, z1)]
        bx = self.box_of(pts_all)
        if bx is None:
            return None
        allm = np.zeros((bx[3] - bx[1], bx[2] - bx[0]), bool)
        U, V = self.grid(bx)
        for i in range(n):
            (ax, ay), (bx_, by) = F[i], F[(i + 1) % n]
            ex, ey = bx_ - ax, by - ay
            nx, ny = ey, -ex
            ln = math.hypot(nx, ny) or 1.0
            nx, ny = nx / ln, ny / ln
            if ny <= 0.02:
                continue                                      # faces away from the viewer (or edge-on)
            quad = [proj(ax, ay, z1), proj(bx_, by, z1), proj(bx_, by, z0), proj(ax, ay, z0)]
            m = poly_sel(self.view, quad, bx)
            lam = 0.5 + 0.5 * (nx * light[0] + ny * light[1])
            top_v_ = min(quad[0][1], quad[1][1])
            val = base - 0.14 + 0.38 * lam - 0.12 * np.clip((V - top_v_) / max(z1 - z0, 1e-6), 0, 1)
            put(self.buf, bx, m, tones(ramp, np.clip(val, 0, 1), bx))
            allm |= m
        topq = [proj(x, y, z1) for x, y in F]
        tm = poly_sel(self.view, topq, bx)
        tr = top if top is not None else ramp
        vmin = min(p[1] for p in topq)
        vmax = max(p[1] for p in topq)
        vv = np.clip((V - vmin) / max(vmax - vmin, 1e-6), 0, 1)
        put(self.buf, bx, tm, tones(tr, np.clip(top_v - 0.12 * vv, 0, 1), bx))
        allm |= tm
        if lift:                                              # bright top-front edge
            ed = np.zeros_like(tm)
            ed[:-1, :] = tm[:-1, :] & ~tm[1:, :]
            put(self.buf, bx, ed, tr[-1])
        self.outline(bx, allm, edge if edge is not None else ramp[0])
        return bx, allm

    def rbox(self, x0, x1, y0, y1, z0, z1, ramp, top=None, base=0.55, top_v=0.85, corner=0.0, lift=True):
        c = corner
        if c > 0:
            foot = []
            for (cx, cy, a0) in ((x1 - c, y1 - c, 0), (x0 + c, y1 - c, 90), (x0 + c, y0 + c, 180),
                                 (x1 - c, y0 + c, 270)):
                for k in range(4):
                    a = math.radians(a0 + k * 30)
                    foot.append((cx + c * math.cos(a), cy + c * math.sin(a)))
        else:
            foot = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        return self.prism(foot, z0, z1, ramp, top, base, top_v, lift=lift)

    def seg(self, a, b, col, w=1):
        """Line between two projected points (u, v)."""
        (u0, v0), (u1, v1) = self.view.px(*a), self.view.px(*b)
        n = int(max(abs(u1 - u0), abs(v1 - v0))) + 1
        if n > 4000:
            return
        us, vs = np.linspace(u0, u1, n), np.linspace(v0, v1, n)
        for d in range(max(1, w)):
            xs = (us + d).astype(int)
            ys = vs.astype(int)
            ok = (xs >= 0) & (xs < W) & (ys >= 0) & (ys < H)
            self.buf[ys[ok], xs[ok]] = col

    def ell(self, cu, cv, rx, ry, col, ring=False):
        bx = self.view.box(cu - rx, cv - ry, cu + rx, cv + ry, 1)
        if bx is None:
            return
        U, V = self.grid(bx)
        d = ((U - cu) / rx) ** 2 + ((V - cv) / ry) ** 2
        m = d <= 1.0
        if ring:
            m &= d >= (1 - 1.3 / max(min(rx, ry) * self.z, 1)) ** 2
        put(self.buf, bx, m, col)

    def quad(self, pts, col, alpha=1.0):
        bx = self.box_of(pts, 1)
        if bx is None:
            return None
        m = poly_sel(self.view, pts, bx)
        if alpha >= 1.0:
            put(self.buf, bx, m, col)
        else:
            mix(self.buf, bx, m, col, alpha)
        return bx, m


# ------------------------------------------------------------------ the room and the body
def draw_room(pen):
    """Navy lab wall with a soft light behind the machine; the bench top (dark slate) under it."""
    buf, view = pen.buf, pen.view
    jj, ii = np.mgrid[0:H, 0:W]
    r = np.hypot((ii - W * 0.5) / W, (jj - H * 0.40) / H)
    v = np.clip(0.62 - 0.55 * r, 0, 1) * 0.5 + 0.18
    buf[...] = tones(P.NV, v, (0, 0, W, H))
    _, bench_v = view.px(0.0, K * BENCH_BACK)
    if bench_v < H:
        b0 = int(max(math.ceil(bench_v), 0))
        rows = np.arange(b0, H)[:, None]
        vb = 0.3 + 0.18 * np.clip((rows - bench_v) / 300.0, 0, 1)
        buf[b0:, :] = tones(P.NV, np.broadcast_to(vb + 0.25, (H - b0, W)), (0, b0, W, H))
        if 0 <= int(bench_v) < H:
            buf[int(bench_v), :] = P.NV[7]


def draw_body(pen):
    x0, x1, y0, y1, z0, z1 = BODY
    c = 30.0
    pen.shadow(0, 0, 400, 300 * K * 1.1, 0.8, z=0.0)
    pen.rbox(x0, x1, y0, y1, z0, z1, P.BODY, top=P.BODY, base=0.74, top_v=0.93, corner=c)
    # front details: dark plinth, seam, vent slats, status lights, a service door
    pen.prism([(x0 + 16, y1 - 6), (x1 - 16, y1 - 6), (x1 - 16, y1 + 2), (x0 + 16, y1 + 2)], 0, 16, P.GR,
              base=0.32, top_v=0.4, lift=False)
    pen.seg(proj(x0 + 26, y1, 160), proj(x1 - 26, y1, 160), P.BODY[5])
    pen.seg(proj(x0 + 26, y1, 159), proj(x1 - 26, y1, 159), P.BODY[8])
    if pen.z > 0.25:
        for k in range(9):
            pen.seg(proj(-312 + k * 16, y1, 118), proj(-312 + k * 16, y1, 50), P.BODY[3], max(1, int(pen.z * 5)))
    for k, col in enumerate((P.CY[6], P.MN[6], P.AM[6])):
        u, v = proj(226 + k * 24, y1, 248)
        pen.ell(u, v, 5.5, 4.0, P.NV[2])
        pen.ell(u, v, 3.8, 2.8, col)
    d0, d1 = proj(150, y1, 136), proj(326, y1, 28)
    pen.seg(d0, (d1[0], d0[1]), P.BODY[4])
    pen.seg((d0[0], d1[1]), d1, P.BODY[4])
    pen.seg(d0, (d0[0], d1[1]), P.BODY[4])
    pen.seg((d1[0], d0[1]), d1, P.BODY[4])
    pen.seg(proj(300, y1, 92), proj(300, y1, 72), P.BODY[2], max(1, int(pen.z * 4)))
    # the work deck inside the rim (recessed, cool gray), with the rim's shadow on it
    inner = 20.0
    foot = []
    for (cx, cy, a0) in ((x1 - c, y1 - c, 0), (x0 + c, y1 - c, 90), (x0 + c, y0 + c, 180), (x1 - c, y0 + c, 270)):
        for k in range(4):
            a = math.radians(a0 + k * 30)
            foot.append((cx + (c - inner) * math.cos(a) - math.copysign(inner, math.cos(a)) * 0,
                         cy + (c - inner) * math.sin(a)))
    deck = [proj(x * (1 - inner / 360.0), y * (1 - inner / 270.0), z1 + 0.5) for x, y in foot]
    bx = pen.box_of(deck)
    if bx is not None:
        m = poly_sel(pen.view, deck, bx)
        U, V = pen.grid(bx)
        vv = np.clip((V - deck[0][1]) / 300.0, -1, 1)
        put(pen.buf, bx, m, tones(P.GR, np.clip(0.52 + 0.1 * vv, 0, 1), bx))
        sh = m & ~np.roll(m, max(2, int(pen.z * 6)), axis=0)
        mix(pen.buf, bx, sh, P.NV[1], 0.4)
        pen.outline(bx, m, P.GR[3])


# ------------------------------------------------------------------ trays
def bottle(pen, a_deg, cap_ramp):
    """Reagent bottle: a wedge (narrow toward the tray centre), neck, and an open cap collar."""
    a = math.radians(a_deg)
    ca, sa = math.cos(a), math.sin(a)
    r0, r1, w0, w1 = RT_RING - 24, RT_RING + 16, 12.0, 20.0
    tx, ty = RT
    foot = [(tx + ca * r0 - sa * w0, ty + sa * r0 + ca * w0), (tx + ca * r1 - sa * w1, ty + sa * r1 + ca * w1),
            (tx + ca * r1 + sa * w1, ty + sa * r1 - ca * w1), (tx + ca * r0 + sa * w0, ty + sa * r0 - ca * w0)]
    pen.prism(foot, 332, 382, P.BODY, top=P.BODY, base=0.72, top_v=0.92)
    if pen.z > 0.7 and sa > -0.3:                            # coloured label on the outer face
        fx, fy = tx + ca * (r1 + 0.2), ty + sa * (r1 + 0.2)
        l0 = (fx - sa * (w1 - 4), fy + ca * (w1 - 4))
        l1 = (fx + sa * (w1 - 4), fy - ca * (w1 - 4))
        pen.quad([proj(l0[0], l0[1], 370), proj(l1[0], l1[1], 370), proj(l1[0], l1[1], 344),
                  proj(l0[0], l0[1], 344)], cap_ramp[5])
        if pen.z > 1.6:
            pen.seg(proj(l0[0], l0[1], 362), proj(l1[0], l1[1], 362), cap_ramp[-1])
            pen.seg(proj(l0[0], l0[1], 352), proj(l1[0], l1[1], 352), cap_ramp[-2])
    nx, ny = tx + ca * RT_RING, ty + sa * RT_RING
    pen.cyl(nx, ny, 7.0, 382, 390, P.BODY, top=False, base=0.66, hl=False)
    pen.cyl(nx, ny, 9.0, 390, 397, cap_ramp, top=cap_ramp, base=0.55, top_v=0.72)
    cu, cv = proj(nx, ny, 397.3)
    pen.ell(cu, cv, 5.0, 5.0 * K, P.NV[1])


def tube(pen, x, y):
    """Sample tube: amber rack collar, pale-gold serum, clear glass above it, an open rim."""
    pen.shadow(x, y, 9, 9 * K, 0.6)
    pen.cyl(x, y, 7.6, DECK_Z + 18, DECK_Z + 25, P.AM, top=P.AM, base=0.48, top_v=0.68, hl=False)
    pen.cyl(x, y, 6.2, DECK_Z + 25, 356, P.SE, top=P.SE, base=0.62, top_v=0.86)
    if pen.z > 0.4:
        pen.cyl(x, y, 6.2, 356, 386, P.RG, top=False, base=0.86, amp=0.2, hl=pen.z > 1.0)
        cu, cv = proj(x, y, 386)
        pen.ell(cu, cv, 6.2, 6.2 * K, P.RG[6], ring=True)


def draw_reagent_tray(pen, angle):
    x, y = RT
    pen.shadow(x, y, RT_R + 8, (RT_R + 8) * K, 0.7)
    pen.cyl(x, y, RT_R, DECK_Z, 330, P.GR, top=P.GR, base=0.42, top_v=0.6)
    pen.cyl(x, y, 26, 330, 352, P.GR, base=0.36, top_v=0.52)
    items = []
    for k in range(RT_N):
        a = angle + k * 360.0 / RT_N
        items.append((math.sin(math.radians(a)), a, CAPS[k % 3]))
    for _, a, cap in sorted(items):
        bottle(pen, a, cap)


def draw_sample_tray(pen, angle):
    x, y = ST
    pen.shadow(x, y, ST_R + 8, (ST_R + 8) * K, 0.7)
    pen.cyl(x, y, ST_R, DECK_Z, 318, P.GR, top=P.GR, base=0.42, top_v=0.6)
    pen.cyl(x, y, 30, 318, 334, P.GR, base=0.36, top_v=0.52)
    pts = []
    for k in range(ST_N):
        a = math.radians(angle + k * 360.0 / ST_N)
        pts.append((y + math.sin(a) * ST_RING, x + math.cos(a) * ST_RING))
    for ty, tx in sorted(pts):
        tube(pen, tx, ty)


# ------------------------------------------------------------------ the reaction disk and its cuvettes
LIQ = {'reagent': P.RG, 'pale': P.SE, 'rose1': P.RO, 'rose2': P.RO, 'rose': P.RO}
LIQ_V = {'reagent': 0.8, 'pale': 0.93, 'rose1': 0.86, 'rose2': 0.72, 'rose': 0.6}


def liquid_kind(state):
    kind, rose = state
    if kind == 'empty':
        return None
    if rose > 0.8:
        return 'rose'
    if rose > 0.5:
        return 'rose2'
    if rose > 0.2:
        return 'rose1'
    return 'reagent' if kind in ('reagent', 'serum') else 'pale'      # serum not yet mixed: a gold layer on top


def cuvette(pen, x, y, state, hero=False, fill=1.0):
    """A square plastic cuvette: the liquid seen through the glass, front glass edges, a bright rim."""
    h = CUV_HALF
    z0, z1 = CUV_Z0, CUV_Z1
    kind = liquid_kind(state)
    rim = P.SE[7] if hero else P.RG[6]
    if pen.z < 0.55:                                          # far away: a chip of colour on the ring
        u, v = pen.view.px(*proj(x, y, z1 - 8))
        col = LIQ[kind][int(LIQ_V[kind] * (len(LIQ[kind]) - 1))] if kind else P.RG[3]
        for dy in range(2):
            for dx in range(2):
                if 0 <= int(u) + dx < W and 0 <= int(v) + dy < H:
                    pen.buf[int(v) + dy, int(u) + dx] = col
        if hero and 0 <= int(u) < W and 0 <= int(v) - 1 < H:
            pen.buf[int(v) - 1, int(u)] = P.SE[8]
        return
    front = [proj(x - h, y + h, z1), proj(x + h, y + h, z1), proj(x + h, y + h, z0), proj(x - h, y + h, z0)]
    top = [proj(x - h, y - h, z1), proj(x + h, y - h, z1), proj(x + h, y + h, z1), proj(x - h, y + h, z1)]
    bx = pen.box_of(front + top, 3)
    if bx is None:
        return
    fm = poly_sel(pen.view, front, bx)
    tm = poly_sel(pen.view, top, bx)
    U, V = pen.grid(bx)
    mix(pen.buf, bx, fm | tm, P.RG[7], 0.14)
    if kind is not None:
        a = CUV_IN
        lvl = LIQ_LEVEL * (fill if state[0] == 'reagent' else 1.0) + (1.5 if state[0] != 'reagent' else 0.0)
        if lvl > 0.5:
            zl0, zl1 = z0 + 1.5, z0 + 1.5 + lvl
            lf = [proj(x - a, y + a, zl1), proj(x + a, y + a, zl1), proj(x + a, y + a, zl0), proj(x - a, y + a, zl0)]
            lt = [proj(x - a, y - a, zl1), proj(x + a, y - a, zl1), proj(x + a, y + a, zl1), proj(x - a, y + a, zl1)]
            lfm = poly_sel(pen.view, lf, bx)
            ltm = poly_sel(pen.view, lt, bx)
            ramp = LIQ[kind]
            base = LIQ_V[kind]
            s = (U - x) / a
            val = base - 0.1 * np.clip(s, -1, 1) - 0.08 * np.clip((V - lf[0][1]) / max(lf[2][1] - lf[0][1], 1e-6), 0, 1)
            col = tones(ramp, np.clip(val, 0, 1), bx).astype(np.float32)
            i0, j0, i1, j1 = bx
            sub = pen.buf[j0:j1, i0:i1]
            f = sub.astype(np.float32)
            out = f + (col - f) * 0.8
            sub[lfm] = np.clip(out[lfm], 0, 255).astype(np.uint8)
            put(pen.buf, bx, ltm, tones(ramp, np.full(ltm.shape, min(base + 0.1, 1.0)), bx))
            if state[0] == 'serum':                           # the sample sits on top until the stirrer mixes it
                vt, vb = lf[0][1], lf[3][1]
                d = (V - vt) / max(vb - vt, 1e-6)
                th = gfx.bayer_at(bx[0], bx[1], bx[3] - bx[1], bx[2] - bx[0])
                band = lfm & ((d < 0.10) | ((d < 0.22) & (th > (d - 0.10) / 0.12)))
                mix(pen.buf, bx, band, P.SE[6], 0.75)
                put(pen.buf, bx, ltm, P.SE[7])
            if pen.z > 1.5:
                pen.outline(bx, ltm, ramp[-1] if state[0] != 'serum' else P.SE[8])
    pen.outline(bx, fm | tm, P.RG[5])
    pen.outline(bx, tm, rim)
    if hero and pen.z < 1.6:                                  # keep the hero trackable when it is small
        put(pen.buf, bx, tm, rim)
    if pen.z > 2.5:
        gl = fm & (np.abs(U - (x - h * 0.55)) < 0.5 * pen.o + 0.12) & (V > front[0][1] + 2.0) & \
            (V < front[3][1] - 3.0)
        put(pen.buf, bx, gl, P.WHITE)
        inner = [proj(x - CUV_IN, y - CUV_IN, z1), proj(x + CUV_IN, y - CUV_IN, z1),
                 proj(x + CUV_IN, y + CUV_IN, z1), proj(x - CUV_IN, y + CUV_IN, z1)]
        im = poly_sel(pen.view, inner, bx)
        pen.outline(bx, im, P.RG[6] if not hero else P.SE[6])


def draw_disk(pen, offset, hero_slot, hero_state, cuv_state, hero_fill):
    x, y = DISK
    pen.shadow(x, y, DISK_R + 8, (DISK_R + 8) * K, 0.7)
    pen.cyl(x, y, DISK_R, DECK_Z, 316, P.GR, top=P.GR, base=0.38, top_v=0.5)
    cu, cv = proj(x, y, 316.2)
    for rr, col in ((RING_R + 10, P.GR[2]), (RING_R - 10, P.GR[2])):
        pen.ell(cu, cv, rr, rr * K, col, ring=True)
    if pen.z > 0.8:                                           # index ticks round the rim (it is a turning tray)
        off = (offset - math.floor(offset)) * 10.0
        for k in range(N_RING):
            a = math.radians(slot_angle(k) + off * 0 - (offset % 1.0) * 10.0 + 5.0)
            r0, r1 = DISK_R - 7, DISK_R - 2
            pen.seg(proj(x + r0 * math.cos(a), y + r0 * math.sin(a), 316.3),
                    proj(x + r1 * math.cos(a), y + r1 * math.sin(a), 316.3), P.GR[6])
    pen.cyl(x, y, 22, 316, 330, P.MT, top=P.MT, base=0.4, top_v=0.58)
    if pen.z > 1.2:                                           # bolts on the hub
        for k in range(6):
            a = math.radians(k * 60 + 15 - (offset % 1.0) * 10.0)
            bu, bv = proj(x + 14 * math.cos(a), y + 14 * math.sin(a), 330.2)
            pen.ell(bu, bv, 1.6, 1.0, P.MT[2])
            pen.ell(bu - 0.4, bv - 0.3, 0.8, 0.5, P.MT[7])
    frac = offset - math.floor(offset)
    items = []
    for j in range(N_RING):
        p = j + frac
        cx, cy = slot_xy(p)
        hero = hero_slot is not None and abs(((p - hero_slot + N_RING / 2) % N_RING) - N_RING / 2) < 0.01
        items.append((cy, cx, p, hero))
    for cy, cx, p, hero in sorted(items):
        st = hero_state if hero else cuv_state(p % N_RING)
        cuvette(pen, cx, cy, st, hero, hero_fill if hero else 1.0)


# ------------------------------------------------------------------ arms, stirrer, optics, wash
def draw_column(pen, post, z_top, accent):
    px, py = post
    pen.shadow(px, py, 18, 18 * K, 0.7)
    pen.cyl(px, py, 13, DECK_Z, z_top - 6, P.BODY, top=False, base=0.68)
    pen.cyl(px, py, 13.8, z_top - 18, z_top - 10, accent, top=False, base=0.55)


def draw_arm(pen, post, angle, z_arm, length, accent):
    """Pipette arm bar on its column: rounded bar, accent stripe, pivot cap, tip housing and the steel probe."""
    px, py = post
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    tx, ty = px + ca * length, py + sa * length
    tz = z_arm - HOUSING - PROBE_LEN
    # probe and housing first when the tip is behind the bar, the bar on top
    pen.cyl(tx, ty, 1.0, tz, z_arm - HOUSING, P.MT, top=False, base=0.72, amp=0.5)
    pen.cyl(tx, ty, 6.0, z_arm - HOUSING, z_arm - 5, accent, top=False, base=0.55)
    hw = 8.0
    foot = []
    for k in range(9):
        t = a + math.radians(90 + 180 * k / 8)
        foot.append((px + math.cos(t) * 15, py + math.sin(t) * 15))
    for k in range(9):
        t = a + math.radians(-90 + 180 * k / 8)
        foot.append((tx + math.cos(t) * hw, ty + math.sin(t) * hw))
    pen.prism(foot, z_arm - 6, z_arm + 8, P.BODY, top=P.BODY, base=0.62, top_v=0.93)
    s0, s1 = 18.0, length - 6.0
    stripe = [(px + ca * s0 - sa * 3, py + sa * s0 + ca * 3), (px + ca * s1 - sa * 3, py + sa * s1 + ca * 3),
              (px + ca * s1 + sa * 3, py + sa * s1 - ca * 3), (px + ca * s0 + sa * 3, py + sa * s0 - ca * 3)]
    pen.quad([proj(x_, y_, z_arm + 8.3) for x_, y_ in stripe], accent[6])
    pen.cyl(px, py, 15.5, z_arm + 8, z_arm + 12, accent, top=accent, base=0.5, top_v=0.76)
    cu, cv = proj(tx, ty, z_arm + 8.4)
    pen.ell(cu, cv, 4.0, 2.4, accent[7])
    return tx, ty, tz


def draw_mixer(pen, down):
    """Stirrer at M: a small column beside the ring and an arm reaching over the cuvette, paddle on a rod."""
    sx, sy = slot_xy(SLOT_M)
    mx, my = MIX_POST
    pen.shadow(mx, my, 12, 12 * K, 0.7)
    pen.cyl(mx, my, 9, DECK_Z, 392, P.BODY, top=P.BODY, base=0.64, top_v=0.86)
    dx, dy = sx - mx, sy - my
    ln = math.hypot(dx, dy)
    nx, ny = -dy / ln * 5, dx / ln * 5
    pen.prism([(mx + nx, my + ny), (sx + nx, sy + ny), (sx - nx, sy - ny), (mx - nx, my - ny)], 392, 400, P.BODY,
              base=0.58, top_v=0.88)
    zt = 352 - 26 * down
    pen.cyl(sx, sy, 0.9, zt, 392, P.MT, top=False, base=0.72)
    pen.cyl(sx, sy, 5, 392, 404, P.MN, top=P.MN, base=0.5, top_v=0.72)


def draw_optics(pen, glow=0.0):
    """Optical unit straddling the ring at O: lamp housing outside (its port faces the cuvette slot), detector block
    inside, a bridge over the slot. While the lamp is on, the port glows and a little light spills onto the slot."""
    a = math.radians(slot_angle(SLOT_O))
    ca, sa = math.cos(a), math.sin(a)

    def at(r, w=0.0):
        return DISK[0] + ca * r - sa * w, DISK[1] + sa * r + ca * w

    def blk(r0, r1, w, z0, z1, ramp, base, top_v):
        foot = [at(r0, w), at(r1, w), at(r1, -w), at(r0, -w)]
        pen.prism(foot, z0, z1, ramp, top=ramp, base=base, top_v=top_v)
    blk(RING_R - 32, RING_R - 9, 14, DECK_Z, 360, P.GR, 0.3, 0.45)            # detector block (inside the ring)
    blk(RING_R + 9, RING_R + 32, 14, DECK_Z, 360, P.GR, 0.34, 0.5)            # lamp housing (outside)
    blk(RING_R - 32, RING_R + 32, 14, 360, 368, P.GR, 0.3, 0.48)              # bridge
    # lamp port on the inner face of the housing, facing the cuvette in the slot
    port = [proj(*at(RING_R + 9.2, w), z) for w, z in ((-6, 338), (6, 338), (6, 322), (-6, 322))]
    bx = pen.box_of(port, 2)
    if bx is not None:
        m = poly_sel(pen.view, port, bx)
        put(pen.buf, bx, m, P.BEAM[3] if glow < 0.5 else P.BEAM[6])
        pen.outline(bx, m, P.NV[2])
        if glow >= 0.5:                                       # light spills across the slot toward the detector
            spill = [proj(*at(RING_R + 9.2, w), z) for w, z in ((-5, 336), (5, 336), (5, 324), (-5, 324))] + \
                    [proj(*at(RING_R - 9.2, w), z) for w, z in ((5, 324), (-5, 324))]
            bx2 = pen.box_of(spill, 2)
            if bx2 is not None:
                lo = [proj(*at(RING_R + 9.2, w), z) for w, z in ((-5, 336), (5, 336), (5, 324), (-5, 324))]
                hi = [proj(*at(RING_R - 9.2, w), z) for w, z in ((-5, 336), (5, 336), (5, 324), (-5, 324))]
                hull = [lo[0], lo[1], hi[1], hi[2], lo[2], lo[3], hi[3], hi[0]]
                sm = poly_sel(pen.view, hull, bx2)
                th = gfx.bayer_at(bx2[0], bx2[1], bx2[3] - bx2[1], bx2[2] - bx2[0])
                mix(pen.buf, bx2, sm & (th < 0.4), P.BEAM[6], 0.55)
    # detector eye on top of the inner block, with its cable
    du, dv = proj(*at(RING_R - 20), 360.2)
    pen.ell(du, dv, 4.5, 4.5 * K, P.CY[4] if glow < 0.5 else P.CY[6])
    pen.ell(du, dv, 4.5, 4.5 * K, P.NV[2], ring=True)
    lx, ly = at(RING_R + 36)
    pen.cyl(lx, ly, 6, 330, 344, P.BEAM, top=P.BEAM, base=0.55 + 0.3 * glow, top_v=0.85)


def draw_wash(pen):
    wx, wy = slot_xy(SLOT_W)
    pen.rbox(wx - 10, wx + 10, wy - 44, wy - 18, DECK_Z, 404, P.GR, base=0.42, top_v=0.56)
    pen.rbox(wx - 10, wx + 10, wy - 18, wy + 6, 396, 404, P.GR, base=0.4, top_v=0.56)
    for k in (-4, 0, 4):
        pen.cyl(wx + k, wy, 0.8, 372, 396, P.MT, top=False, base=0.7)


def draw_workstation(pen, screen_tex):
    x0, x1, y0, y1, z0, z1 = MON
    pen.shadow(530, -120, 90, 26, 0.7, z=0.0)
    # the cable that connects it to the analyzer, along the bench
    pen.seg(proj(360, -60, 2), proj(470, -60, 2), P.NV[1], 2)
    pen.seg(proj(470, -60, 2), proj(530, -110, 2), P.NV[1], 2)
    pen.rbox(490, 570, y0 + 4, y1 + 50, 0, 8, P.GR, base=0.24, top_v=0.36)            # foot
    pen.rbox(522, 538, y0 + 2, y1 - 2, 8, z0 + 12, P.GR, base=0.24, top_v=0.36)       # neck
    pen.rbox(x0, x1, y0, y1, z0, z1, P.GR, base=0.22, top_v=0.34, corner=6)           # panel
    sx0, sx1, sz0, sz1 = SCREEN
    a, b = proj(sx0, y1 + 0.5, sz1), proj(sx1, y1 + 0.5, sz0)
    (u0, v0), (u1, v1) = pen.view.px(*a), pen.view.px(*b)
    w, h = int(round(u1 - u0)), int(round(v1 - v0))
    if w >= 4 and h >= 3 and screen_tex is not None:
        th, tw = screen_tex.shape[:2]
        xs = np.clip(((np.arange(w) + 0.5) / w * tw).astype(int), 0, tw - 1)
        ys = np.clip(((np.arange(h) + 0.5) / h * th).astype(int), 0, th - 1)
        img = screen_tex[ys[:, None], xs[None, :]]
        X0, Y0 = int(round(u0)), int(round(v0))
        cx0, cy0 = max(X0, 0), max(Y0, 0)
        cx1, cy1 = min(X0 + w, W), min(Y0 + h, H)
        if cx1 > cx0 and cy1 > cy0:
            pen.buf[cy0:cy1, cx0:cx1] = img[cy0 - Y0:cy1 - Y0, cx0 - X0:cx1 - X0]
    # keyboard and mouse on the bench in front of it
    pen.rbox(430, 620, -30, 20, 0, 9, P.GR, base=0.22, top_v=0.33, corner=4)
    if pen.z > 0.4:
        for r in range(3):
            pen.seg(proj(442, -22 + r * 14, 9.5), proj(608, -22 + r * 14, 9.5), P.GR[3])
    pen.rbox(636, 658, -20, 8, 0, 8, P.GR, base=0.26, top_v=0.4, corner=8)


def draw_lid(pen, alpha):
    """Smoky tinted lid over the deck (translucent), glossy edges and two reflection streaks."""
    if alpha <= 0.02:
        return
    x0, x1 = -352.0, 352.0
    yb, yf, ys = -262.0, 196.0, 262.0
    zt, zf = 500.0, 392.0
    top = [proj(x0, yb, zt), proj(x1, yb, zt), proj(x1, yf, zt), proj(x0, yf, zt)]
    slope = [proj(x0, yf, zt), proj(x1, yf, zt), proj(x1, ys, zf), proj(x0, ys, zf)]
    front = [proj(x0, ys, zf), proj(x1, ys, zf), proj(x1, ys, DECK_Z + 2), proj(x0, ys, DECK_Z + 2)]
    for poly, a in ((top, alpha * 0.85), (slope, alpha), (front, alpha * 0.9)):
        r = pen.quad(poly, P.SMOKE, a)
        if r is not None:
            pen.outline(r[0], r[1], P.BODY[6] if alpha > 0.12 else P.BODY[4])
    for k, (u0, w) in enumerate(((0.16, 0.035), (0.25, 0.012))):
        xa = x0 + (x1 - x0) * u0
        streak = [proj(xa, ys, zf + 4), proj(xa + (x1 - x0) * w, ys, zf + 4),
                  proj(xa + (x1 - x0) * w + 70, yf, zt - 4), proj(xa + 70, yf, zt - 4)]
        pen.quad(streak, P.BODY[8], alpha * 1.2)


def draw(buf, view, st, screen_tex=None, lid=0.25):
    """The whole analyzer scene at one instant. Returns the probe tips {'r': (x, y, z), 's': (x, y, z)}."""
    view.apply()
    pen = Pen(buf, view)
    draw_room(pen)
    draw_workstation(pen, screen_tex)
    draw_body(pen)
    draw_reagent_tray(pen, st['rt_ang'])
    draw_sample_tray(pen, st['st_ang'])
    draw_wash(pen)
    draw_optics(pen, st.get('lamp', 0.0))
    draw_column(pen, RA_POST, st['ra_z'], P.CY)
    draw_column(pen, SA_POST, st['sa_z'], P.AM)
    draw_disk(pen, st['line'], st['hero_slot'], st['hero_state'], st['cuv_state'], st.get('hero_fill', 1.0))
    draw_mixer(pen, st.get('mix', 0.0))
    tips = {'r': draw_arm(pen, RA_POST, st['ra_ang'], st['ra_z'], RA_LEN, P.CY),
            's': draw_arm(pen, SA_POST, st['sa_ang'], st['sa_z'], SA_LEN, P.AM)}
    draw_lid(pen, lid)
    return tips
