"""The artwork: a glass beaker on a magnetic stirrer, drawn in 2D in a slight top-down front view.

World: millimetres; x right, h up from the bench, z toward the viewer. A point projects to (u, v) = (x, -h + K*z), so a
circle of radius r becomes an ellipse r x K*r. Every part is drawn per pixel at the current zoom (no scaled sprites):
dithered 16-bit ramps, 1-px outlines and bright rim highlights.

Two versions of the same picture share one camera:
  outside  the stirrer with its flat top plate and one control knob, the glass beaker, the white stir bar,
           the liquid (cloudy suspension, then clear), particles, bubbles, the two pouring containers;
  cutaway  the same frame cut open through the middle (z = 0): motor, shaft and magnet inside the stirrer,
           the housing skin, the plate and the glass bottom in section, the liquid in section and the stir bar.
"""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T
from .view import View, put, tones, mix, sd_capsule, poly_sel

W, H = gfx.W, gfx.H
K = T.K
_JJ, _II = np.mgrid[0:H, 0:W]


def proj(x, h, z=0.0):
    return x, -h + K * z


class Pen:
    def __init__(self, buf, view):
        self.buf, self.view, self.z = buf, view, view.z
        self.o = 1.0 / view.z

    def box(self, u0, v0, u1, v1, pad=2):
        return self.view.box(min(u0, u1), min(v0, v1), max(u0, u1), max(v0, v1), pad)

    def grid(self, bx):
        U, V = self.view.grid(bx)
        U, V = np.broadcast_arrays(U, V)
        return U, V

    def outline(self, bx, m, col):
        e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
        put(self.buf, bx, e, col)

    def ell(self, cu, cv, rx, ry, pad=2):
        bx = self.box(cu - rx, cv - ry, cu + rx, cv + ry, pad)
        if bx is None:
            return None, None, None, None
        U, V = self.grid(bx)
        m = ((U - cu) / max(rx, 1e-6)) ** 2 + ((V - cv) / max(ry, 1e-6)) ** 2 <= 1.0
        return bx, m, U, V

    def poly(self, pts, pad=2):
        us, vs = [p[0] for p in pts], [p[1] for p in pts]
        bx = self.box(min(us), min(vs), max(us), max(vs), pad)
        if bx is None:
            return None, None
        return bx, poly_sel(self.view, pts, bx)

    def rect(self, u0, v0, u1, v1, pad=1):
        bx = self.box(u0, v0, u1, v1, pad)
        if bx is None:
            return None, None, None, None
        U, V = self.grid(bx)
        m = (U >= u0) & (U <= u1) & (V >= v0) & (V <= v1)
        return bx, m, U, V

    def dot(self, u, v, col, size=1):
        i, j = self.view.px(u, v)
        i, j = int(math.floor(i)), int(math.floor(j))
        for dj in range(size):
            for di in range(size):
                if 0 <= i + di < W and 0 <= j + dj < H:
                    self.buf[j + dj, i + di] = col

    def seg(self, a, b, col, w=1):
        (u0, v0), (u1, v1) = self.view.px(*a), self.view.px(*b)
        n = int(max(abs(u1 - u0), abs(v1 - v0))) + 1
        for k in range(n + 1):
            f = k / max(n, 1)
            x, y = int(round(u0 + (u1 - u0) * f)), int(round(v0 + (v1 - v0) * f))
            for d in range(w):
                if 0 <= x < W and 0 <= y + d < H:
                    self.buf[y + d, x] = col


def _hatch(bx, step=4):
    i0, j0, i1, j1 = bx
    return ((np.arange(i0, i1)[None, :] + np.arange(j0, j1)[:, None]) % step) == 0


# ------------------------------------------------------------------ the room
def background(pen, t):
    buf, view = pen.buf, pen.view
    bx = (0, 0, W, H)
    U, V = pen.grid(bx)
    glow = np.exp(-((U / 120.0) ** 2 + ((V + 85.0) / 130.0) ** 2))
    buf[...] = tones(P.NV, np.clip(0.30 + 0.32 * glow, 0, 1), bx)
    # lab wall tiles (they move with the camera, so zooms read as zooms)
    tile = 22.0
    gx = np.abs(((U + 11.0) / tile) % 1.0 - 0.5) * tile
    gy = np.abs(((V + 3.0) / tile) % 1.0 - 0.5) * tile
    line = ((gx > tile / 2 - 0.45 * pen.o - 0.05) | (gy > tile / 2 - 0.45 * pen.o - 0.05)) & (V < -26)
    mix(buf, bx, line, P.NV[1], 0.55)
    # the bench: top surface, front edge, front face
    top = (V >= -24.0) & (V < 21.0)
    put(buf, bx, top, tones(P.GR, np.clip(0.16 + 0.05 * (V + 24) / 45.0, 0, 1), bx))
    put(buf, bx, top & (np.abs(V - 20.5) < 0.6 * pen.o + 0.1), P.GR[4])
    face = V >= 21.0
    put(buf, bx, face, tones(P.NV, np.clip(0.25 - 0.004 * (V - 21), 0, 1), bx))
    put(buf, bx, face & (np.abs(V - 21.3) < 0.5 * pen.o + 0.05), P.GR[2])


# ------------------------------------------------------------------ the stirrer, outside
def stirrer(pen, t):
    buf = pen.buf
    bw, bd, bh = T.BODY_W, T.BODY_D, T.BODY_H
    # contact shadow on the bench
    bx, m, U, V = pen.ell(0.0, 4.0, bw + 10, (bd + 10) * K)
    if bx is not None:
        mix(buf, bx, m, P.NV[0], 0.55)
    # feet
    for sx in (-1, 1):
        bx, m, U, V = pen.rect(sx * 44 - 5, bd * K - 1, sx * 44 + 5, bd * K + 3.2)
        if bx is not None:
            put(buf, bx, m, P.GR[1])
    # top face of the housing (a rectangle in this projection) and its front face
    vt0, vt1 = -bh - bd * K, -bh + bd * K
    bx, m, U, V = pen.rect(-bw, vt0, bw, vt1)
    if bx is not None:
        put(buf, bx, m, tones(P.BODY, np.clip(0.80 + 0.06 * (V - vt0) / (vt1 - vt0), 0, 1), bx))
        pen.outline(bx, m, P.BODY[3])
    vf0, vf1 = -bh + bd * K, bd * K
    bx, m, U, V = pen.rect(-bw, vf0, bw, vf1)
    if bx is not None:
        sh = 0.70 - 0.22 * (V - vf0) / (vf1 - vf0) - 0.06 * (np.abs(U) / bw) ** 4
        put(buf, bx, m, tones(P.BODY, np.clip(sh, 0, 1), bx))
        put(buf, bx, m & (np.abs(V - vf0) < 0.7 * pen.o + 0.15), P.BODY[9])      # bright top-front edge
        pen.outline(bx, m, P.BODY[2])
    # the flat top plate (ceramic), raised 3 mm, with a printed centring ring
    pp, pt = T.PLATE, T.PLATE_T
    vp0, vp1 = -(bh + pt) - pp * K, -(bh + pt) + pp * K
    bx, m, U, V = pen.rect(-pp, vp0, pp, vp1 + pt)
    if bx is not None:
        topm = m & (V <= vp1)
        put(buf, bx, topm, tones(P.GR, np.clip(0.86 - 0.08 * (V - vp0) / (vp1 - vp0), 0, 1), bx))
        put(buf, bx, m & (V > vp1), P.GR[5])
        put(buf, bx, m & (np.abs(V - vp1) < 0.6 * pen.o + 0.1), P.GR[9])
        pen.outline(bx, m, P.GR[3])
        ring = np.abs(np.sqrt((U / 40.0) ** 2 + ((V + bh + pt) / (40.0 * K)) ** 2) - 1.0) < 0.6 * pen.o / 40 + 0.01
        put(buf, bx, topm & ring, P.GR[6])
    # the dark front panel with the power light, vents and the knob
    bx, m, U, V = pen.rect(-50, -13.5, 50, 12.0)
    if bx is not None:
        put(buf, bx, m, tones(P.NV, np.clip(0.42 - 0.12 * (V + 13.5) / 25.5, 0, 1), bx))
        put(buf, bx, m & (np.abs(V + 13.5) < 0.6 * pen.o + 0.1), P.NV[0])
        put(buf, bx, m & (np.abs(V - 12.0) < 0.6 * pen.o + 0.1), P.BODY[5])
        for k in range(6):                                           # vent slots
            vm = (np.abs(U - (-16 + 5.2 * k)) < 1.0) & (V > -5) & (V < 6)
            put(buf, bx, m & vm, P.NV[0])
    on = T.power(t)
    bx, m, U, V = pen.ell(-36.0, -1.0, 2.6, 2.6)
    if bx is not None:
        put(buf, bx, m, P.AM[7] if on else P.NV[6])
        put(buf, bx, m & (U < -36.6) & (V < -1.6), P.AM[9] if on else P.NV[7])
        pen.outline(bx, m, P.NV[0])
        if on:
            g_bx, g_m, GU, GV = pen.ell(-36.0, -1.0, 6.5, 6.5)
            th = gfx.bayer_at(g_bx[0], g_bx[1], g_bx[3] - g_bx[1], g_bx[2] - g_bx[0])
            led = (GU + 36.0) ** 2 + (GV + 1.0) ** 2 <= 2.6 ** 2
            mix(buf, g_bx, g_m & ~led & (th < 0.35), P.AM[6], 0.45)
    e = (t - T.KNOB - 0.05) / 0.4
    if 0 <= e < 1:                                            # power-on shine across the front panel
        bx, m, U, V = pen.rect(-50, -13.5, 50, 12.0)
        if bx is not None:
            xs = -70 + 140 * e
            band = m & (np.abs(U - 0.5 * V - xs) < 5.0)
            mix(buf, bx, band, P.WHITE, 0.22)
    knob(pen, t, 32.0, -1.0)


def knob(pen, t, cu, cv):
    buf = pen.buf
    # scale dots around the knob
    for k in range(9):
        a = math.radians(-130 + k * 32.5)
        pen.dot(cu + 10.6 * math.sin(a), cv - 10.6 * math.cos(a), P.GR[5] if k else P.GR[3])
    bx, m, U, V = pen.ell(cu, cv + 0.6, 8.2, 8.2)
    if bx is not None:
        put(buf, bx, m, P.GR[1])
    e = (t - T.KNOB) / 0.2
    kr = 7.6 * (1 - 0.14 * math.sin(math.pi * e)) if 0 <= e < 1 else 7.6
    if 0 <= e < 1:                                            # burst rays round the knob
        for k in range(8):
            a = k * math.pi / 4 + 0.2
            r0, r1 = 9.5 + 4 * e, 12.0 + 7 * e
            pen.seg((cu + r0 * math.cos(a), cv + r0 * math.sin(a)), (cu + r1 * math.cos(a), cv + r1 * math.sin(a)),
                    P.AM[7] if e < 0.6 else P.AM[5])
    bx, m, U, V = pen.ell(cu, cv, kr, kr)
    if bx is None:
        return
    rr = np.sqrt((U - cu) ** 2 + (V - cv) ** 2) / kr
    sh = 0.55 + 0.25 * (-(U - cu) - (V - cv)) / 7.6 / 1.4 - 0.15 * rr ** 4
    put(buf, bx, m, tones(P.GR, np.clip(sh * 0.62, 0, 1), bx))
    grip = m & (rr > 0.86) & ((np.floor(np.arctan2(V - cv, U - cu) / (2 * math.pi) * 24) % 2) == 0)
    put(buf, bx, grip, P.GR[1])
    pen.outline(bx, m, P.NV[0])
    a = math.radians(T.knob_angle(t))
    pen.seg((cu + 1.2 * math.sin(a), cv - 1.2 * math.cos(a)), (cu + 6.4 * math.sin(a), cv - 6.4 * math.cos(a)),
            P.AM[6], 2 if pen.z > 2.6 else 1)
    pen.dot(cu + 6.0 * math.sin(a), cv - 6.0 * math.cos(a), P.AM[8])


# ------------------------------------------------------------------ the stirrer, in section
def stirrer_cut(pen, t):
    buf = pen.buf
    bw, bd, bh = T.BODY_W, T.BODY_D, T.BODY_H
    bx, m, U, V = pen.ell(0.0, 4.0, bw + 10, (bd + 10) * K)
    if bx is not None:
        mix(buf, bx, m, P.NV[0], 0.55)
    # back half of the top face and of the plate, seen behind the cut
    bx, m, U, V = pen.rect(-bw, -bh - bd * K, bw, -bh)
    if bx is not None:
        put(buf, bx, m, tones(P.BODY, np.full(m.shape, 0.78), bx))
        pen.outline(bx, m, P.BODY[3])
    pp, pt = T.PLATE, T.PLATE_T
    bx, m, U, V = pen.rect(-pp, -(bh + pt) - pp * K, pp, -(bh + pt))
    if bx is not None:
        put(buf, bx, m, tones(P.GR, np.full(m.shape, 0.84), bx))
        pen.outline(bx, m, P.GR[3])
    # the cut face of the housing: walls and floor hatched, the cavity open
    bx, m, U, V = pen.rect(-bw, -bh, bw, 0.0)
    if bx is None:
        return
    put(buf, bx, m, P.BODY[6])
    put(buf, bx, m & _hatch(bx), P.BODY[4])
    cav = (np.abs(U) < bw - 3) & (V > -bh + 2.2) & (V < -3)
    put(buf, bx, cav, tones(P.NV, np.clip(0.18 + 0.20 * (V + bh) / bh, 0, 1), bx))
    pen.outline(bx, m, P.BODY[2])
    pen.outline(bx, cav, P.NV[0])
    # feet
    for sx in (-1, 1):
        fb, fm, _, _ = pen.rect(sx * 44 - 5, -1, sx * 44 + 5, 2.2)
        if fb is not None:
            put(buf, fb, fm, P.GR[1])
    # the plate in section (on top of the housing skin)
    bx, m, U, V = pen.rect(-pp, -(bh + pt), pp, -bh)
    if bx is not None:
        put(buf, bx, m, P.GR[7])
        put(buf, bx, m & _hatch(bx, 3), P.GR[5])
        pen.outline(bx, m, P.GR[3])
    motor(pen, t)
    magnet(pen, t)


def motor(pen, t):
    buf = pen.buf
    ph = T.magnet_angle(t)
    # bracket from the floor, the can, the copper end, the shaft and the holder disc
    bx, m, U, V = pen.rect(-13, -6.0, 13, -3.0)
    if bx is not None:
        put(buf, bx, m, P.GR[3])
        pen.outline(bx, m, P.NV[0])
    bx, m, U, V = pen.rect(-9.5, -19.0, 9.5, -5.5)
    if bx is not None:
        s = (U / 9.5)
        put(buf, bx, m, tones(P.MT, np.clip(0.62 - 0.38 * s ** 2 - 0.12 * s, 0, 1), bx))
        # a highlight stripe that runs round the can while it turns
        for k in range(3):
            x0 = 9.5 * math.sin(ph * 1.0 + k * 2.09)
            if math.cos(ph * 1.0 + k * 2.09) > 0:
                put(buf, bx, m & (np.abs(U - x0) < 0.9), P.MT[7])
        put(buf, bx, m & (V > -9.0), P.CU[3])
        put(buf, bx, m & (V > -9.0) & ((np.floor(V * 1.5) % 2) == 0), P.CU[4])
        pen.outline(bx, m, P.NV[0])
    bx, m, U, V = pen.rect(-1.1, -T.MAG_H0, 1.1, -19.0)
    if bx is not None:
        put(buf, bx, m, tones(P.MT, np.clip(0.8 - 0.3 * U, 0, 1), bx))
    bx, m, U, V = pen.ell(0.0, -T.MAG_H0 + 0.4, 9.0, 9.0 * K)
    if bx is not None:
        put(buf, bx, m, P.MT[4])
        pen.outline(bx, m, P.NV[0])


def _bar_box(pen, cx, ch, cz, ang, a, b, h0, h1, front_cols, top_cols, letters=False):
    """A rectangular bar lying in the horizontal plane (the drive magnet): two halves (front_cols / top_cols are
    (half +, half -) colour pairs), side faces that face the viewer, the top face, and N / S printed on the
    long side."""
    ca, sa = math.cos(ang), math.sin(ang)

    def P3(s, w, h):
        x = cx + s * ca - w * sa
        z = cz + s * sa + w * ca
        return proj(x, h, z)
    faces = []
    for half, sgn in ((0, 1), (1, -1)):
        s0, s1 = 0.0, sgn * a
        for w in (-b, b):                                     # the two long sides
            nz = w * ca                                       # outward normal's z component
            if nz > 0:
                faces.append(([P3(s0, w, h1), P3(s1, w, h1), P3(s1, w, h0), P3(s0, w, h0)], front_cols[half], 0.62,
                              'long', half, sgn))
        if sgn * sa > 0:                                      # the end cap that faces us
            faces.append(([P3(s1, -b, h1), P3(s1, b, h1), P3(s1, b, h0), P3(s1, -b, h0)], front_cols[half], 0.45,
                          'end', half, sgn))
    for half, sgn in ((0, 1), (1, -1)):
        faces.append(([P3(0, -b, h1), P3(sgn * a, -b, h1), P3(sgn * a, b, h1), P3(0, b, h1)], top_cols[half], 0.8,
                      'top', half, sgn))
    order = sorted(range(len(faces)), key=lambda i: (faces[i][3] == 'top', ))
    for i in order:
        pts, ramp, v, kind, half, sgn = faces[i]
        bx, m = pen.poly(pts)
        if bx is None or not m.any():
            continue
        put(pen.buf, bx, m, tones(ramp, np.full(m.shape, v), bx))
        pen.outline(bx, m, P.NV[0])
        if letters and kind == 'long':
            (u0, v0), (u1, v1) = pts[0], pts[1]
            if abs(u1 - u0) * pen.z > 13:
                cu, cvv = (u0 + u1) / 2, (pts[0][1] + pts[3][1]) / 2
                ch_ = 'N' if half == 0 else 'S'
                bm = pixfont.text_bitmap(ch_, '5x7')
                hh, ww = bm.shape
                i0, j0 = pen.view.px(cu, cvv)
                i0, j0 = int(round(i0 - ww / 2)), int(round(j0 - hh / 2))
                col = P.WHITE if half == 0 else P.NV[2]
                for (yy, xx) in zip(*np.nonzero(bm)):
                    if 0 <= j0 + yy < H and 0 <= i0 + xx < W:
                        pen.buf[j0 + yy, i0 + xx] = col


def magnet(pen, t):
    ang = T.magnet_angle(t)
    _bar_box(pen, 0.0, 0.0, 0.0, ang, T.MAG_L, 4.5, T.MAG_H0 + 0.6, T.MAG_H1,
             (P.MR, P.GR), (P.MR, P.GR), letters=True)


# ------------------------------------------------------------------ the beaker
def _sq(u):
    return np.sqrt(np.clip(T.R_IN ** 2 - u * u, 0, None))


def beaker_back(pen, t, cut=False):
    """Inside of the back wall and the glass bottom (drawn before the contents)."""
    buf = pen.buf
    ro, ri = T.R_OUT, T.R_IN
    bx = pen.box(-ro, -T.RIM - ro * K, ro, -T.GLASS_B + ro * K)
    if bx is None:
        return
    U, V = pen.grid(bx)
    sq = np.sqrt(np.clip(ro ** 2 - U * U, 0, None))
    body = (np.abs(U) <= ro) & (V >= -T.RIM - K * sq) & (V <= -T.GLASS_B + K * sq)
    mix(buf, bx, body, P.GR[6], 0.10)
    # faint vertical reflections on the far wall
    mix(buf, bx, body & (np.abs(U - 17) < 1.2), P.GR[8], 0.10)
    # the glass bottom (3 mm thick disc) seen from above, through the glass
    disc = ((U / ro) ** 2 + ((V + T.FLOOR) / (ro * K)) ** 2 <= 1.0)
    mix(buf, bx, disc, P.GR[7], 0.16)
    ring = disc & ((U / (ro - 1.4)) ** 2 + ((V + T.FLOOR) / ((ro - 1.4) * K)) ** 2 > 1.0)
    mix(buf, bx, ring, P.GR[8], 0.30)
    # back half of the rim
    rim = (np.abs(np.sqrt((U / ro) ** 2 + ((V + T.RIM) / (ro * K)) ** 2) - 1.0) < 1.0 * pen.o / ro + 0.012) & \
        (V < -T.RIM)
    put(buf, bx, rim, P.GR[6])


def beaker_front(pen, t):
    """Front glass: tint, edges, highlights, graduation marks, the front of the rim, the spout and the base."""
    buf = pen.buf
    ro, ri = T.R_OUT, T.R_IN
    bx = pen.box(-ro - 5, -T.RIM - ro * K - 3, ro + 2, -T.GLASS_B + ro * K + 1)
    if bx is None:
        return
    U, V = pen.grid(bx)
    sqo = np.sqrt(np.clip(ro ** 2 - U * U, 0, None))
    body = (np.abs(U) <= ro) & (V >= -T.RIM + K * sqo) & (V <= -T.GLASS_B + K * sqo)
    mix(buf, bx, body, P.GR[7], 0.07)
    # silhouette edges of the glass
    edge = body & (np.abs(U) > ro - 1.1)
    put(buf, bx, edge, P.GR[6])
    put(buf, bx, body & (np.abs(U) > ro - 0.55 * pen.o - 0.05), P.GR[4])
    # tall highlights on the left, a soft one on the right
    put(buf, bx, body & (np.abs(U + 23.5) < 0.9) & (V > -T.RIM + K * sqo + 5) & (V < -T.GLASS_B - 6), P.WHITE)
    mix(buf, bx, body & (np.abs(U + 19.8) < 0.5 * pen.o + 0.15) & (V > -T.RIM + K * sqo + 9) & (V < -T.GLASS_B - 14),
        P.WHITE, 0.6)
    mix(buf, bx, body & (np.abs(U - 26.0) < 0.8) & (V > -T.RIM + K * sqo + 14) & (V < -T.GLASS_B - 10),
        P.WHITE, 0.35)
    # graduation marks
    for h, long_ in ((62, False), (72, True), (82, False), (92, True), (102, False)):
        u0, u1 = 6.0, 12.0 if long_ else 9.5
        n = int((u1 - u0) * pen.z) + 1
        for k in range(n):
            uu = u0 + (u1 - u0) * k / max(n - 1, 1)
            vv = -h + K * math.sqrt(max(ro ** 2 - uu * uu, 0))
            pen.dot(uu, vv, P.GR[8])
    # the base: bottom outer edge and the thick bottom seen edge-on
    base = (np.abs(U) <= ro) & (V > -T.GLASS_B + K * sqo - 3.0) & (V <= -T.GLASS_B + K * sqo)
    mix(buf, bx, base, P.GR[8], 0.28)
    put(buf, bx, base & (V > -T.GLASS_B + K * sqo - 0.6 * pen.o - 0.1), P.GR[7])
    # the rim: a 2 mm glass ring; bright front arc
    rr_o = (U / ro) ** 2 + ((V + T.RIM) / (ro * K)) ** 2
    rr_i = (U / ri) ** 2 + ((V + T.RIM) / (ri * K)) ** 2
    ring = (rr_o <= 1.0) & (rr_i >= 1.0)
    put(buf, bx, ring & (V >= -T.RIM), P.GR[8])
    put(buf, bx, ring & (V < -T.RIM), P.GR[6])
    put(buf, bx, ring & (V >= -T.RIM) & (np.abs(U + 14) < 3), P.WHITE)
    # the pouring spout on the left
    sp = [(-ro + 0.5, -T.RIM - 1.5), (-ro - 4.5, -T.RIM - 3.0), (-ro - 3.5, -T.RIM + 0.6), (-ro + 0.5, -T.RIM + 4.0)]
    sb, sm = pen.poly(sp)
    if sb is not None:
        put(buf, sb, sm, P.GR[7])
        pen.outline(sb, sm, P.GR[5])


# ------------------------------------------------------------------ liquid
def liquid(pen, t, cut=False):
    """The liquid in the beaker: cloudy suspension (hides what is inside) fading to a clear solution."""
    L = T.level(t)
    if L <= 0.3:
        return
    buf = pen.buf
    turb = T.turbidity(t)
    ri = T.R_IN
    top = T.FLOOR + L
    d = T.vortex(t)
    bx = pen.box(-ri, -top - ri * K - 1, ri, -T.FLOOR + ri * K + 1)
    if bx is None:
        return
    U, V = pen.grid(bx)
    sq = _sq(U)
    inside_u = np.abs(U) <= ri
    surf_back, surf_front = -top - K * sq, -top + K * sq
    bottom = -T.FLOOR + K * sq
    region = inside_u & (V >= surf_back) & (V <= bottom)
    surface = inside_u & (V >= surf_back) & (V < surf_front)
    side = region & ~surface
    a_side = 0.06 + 0.72 * turb ** 0.7                # at full cloud ~22 % of the bar still shows: a ghost
    a_top = 0.16 + 0.70 * turb ** 0.7
    shade = 0.62 + 0.16 * (1 - (U / ri) ** 2) - 0.10 * np.clip((V - surf_front) / 60.0, 0, 1)
    # the swirl made visible: bands in the suspension ride round with the liquid (they cross the front face)
    th_c = np.arcsin(np.clip(U / ri, -1, 1)) - T.swirl_angle_w(t)
    band = np.sin(3 * th_c + 0.10 * V + 1.4 * np.sin(2 * th_c - 0.06 * V + 0.7))
    shade = shade + 0.11 * band * min(1.0, turb * 1.4)
    col_side = tones(P.CL, np.clip(shade, 0, 1), bx) if turb > 0.02 else np.broadcast_to(
        np.asarray(P.GR[7], np.uint8), side.shape + (3,))
    _blend(buf, bx, side, col_side, a_side)
    if turb < 0.6:
        th2 = np.arcsin(np.clip(U / ri, -1, 1)) - T.swirl_angle_w(t) * 1.1
        streak = side & (np.sin(5 * th2 + 0.05 * V) > 0.93)
        mix(buf, bx, streak, P.WHITE, 0.10 * (1 - turb / 0.6))
    col_top = tones(P.CL, np.clip(0.78 + 0.08 * (1 - (U / ri) ** 2), 0, 1), bx) if turb > 0.02 else \
        np.broadcast_to(np.asarray(P.GR[8], np.uint8), surface.shape + (3,))
    _blend(buf, bx, surface, col_top, a_top)
    # meniscus: a bright line along the front edge of the surface, a darker one along the back
    put(buf, bx, inside_u & (np.abs(V - surf_front) < 0.55 * pen.o + 0.05), P.GR[8] if turb < 0.5 else P.CL[7])
    put(buf, bx, inside_u & (np.abs(V - surf_back) < 0.45 * pen.o + 0.03) & (np.abs(U) < ri - 1),
        P.GR[6] if turb < 0.5 else P.CL[4])
    # the vortex dip in the middle of the surface, and swirl arcs riding round it
    if d > 0.15:
        rx = 3.0 + 2.6 * d
        vm = ((U / rx) ** 2 + ((V + top) / (rx * K)) ** 2) <= 1.0
        mix(buf, bx, vm, P.CL[3] if turb > 0.4 else P.GR[4], 0.30 + 0.35 * min(1.0, d / 3.0))
        hl = vm & ((U / rx) ** 2 + ((V + top + 0.8) / (rx * K)) ** 2 > 0.75) & (V < -top)
        mix(buf, bx, hl, P.WHITE, 0.5)
    sw = T.swirl_angle_w(t)
    if L > 3:
        for rad, off in ((13.0, 0.0), (13.0, math.pi), (23.5, 1.1), (23.5, 1.1 + math.pi)):
            for k in range(14):
                a = sw * 0.9 + off + k * 0.07
                pen.dot(rad * math.cos(a), -top + K * rad * math.sin(a), P.CL[8] if turb > 0.4 else P.GR[9])
    if cut:
        return


def _blend(buf, bx, sel, col, a):
    i0, j0, i1, j1 = bx
    sub = buf[j0:j1, i0:i1]
    if not sel.any():
        return
    px = sub[sel].astype(np.float32)
    c = np.asarray(col, np.float32)
    c = c[sel] if c.ndim == 3 else c
    sub[sel] = np.clip(px + (c - px) * a, 0, 255).astype(np.uint8)


def liquid_cut(pen, t):
    """The liquid in section (cut through the middle): cloudy face with the vortex dip, the back half of the surface."""
    L = T.level(t)
    if L <= 0.3:
        return
    buf = pen.buf
    turb = T.turbidity(t)
    ri = T.R_IN
    top = T.FLOOR + L
    d = T.vortex(t)
    bx = pen.box(-ri, -top - ri * K - 1, ri, -T.FLOOR + 1)
    if bx is None:
        return
    U, V = pen.grid(bx)
    sq = _sq(U)
    inside_u = np.abs(U) <= ri
    hs = top - d * (1 - (U / ri) ** 2) + d / 3.0                    # surface height across the cut
    back = inside_u & (V >= -top - K * sq) & (V < -(top + d / 3.0))  # far half of the surface; the dip is air
    _blend(buf, bx, back, tones(P.CL, np.full(back.shape, 0.80), bx), 0.2 + 0.6 * turb)
    face = inside_u & (V >= -hs) & (V <= -T.FLOOR)
    sw = T.swirl_angle_w(t)
    streak = 0.5 + 0.5 * np.sin(U * 0.45 + V * 0.05 + sw * 2.2) * np.sin(V * 0.35 - sw * 0.6)
    col = tones(P.CL, np.clip(0.54 + 0.20 * streak + 0.10 * (1 - (U / ri) ** 2), 0, 1), bx)
    _blend(buf, bx, face, col, 0.25 + 0.65 * turb)
    put(buf, bx, inside_u & (np.abs(V + hs) < 0.6 * pen.o + 0.05), P.CL[2] if turb > 0.4 else P.GR[8])


def beaker_cut(pen, t):
    """The glass in section: the two walls and the bottom, hatched."""
    buf = pen.buf
    for x0, x1 in ((-T.R_OUT, -T.R_IN), (T.R_IN, T.R_OUT)):
        bx, m, U, V = pen.rect(x0, -T.RIM, x1, -T.GLASS_B)
        if bx is not None:
            put(buf, bx, m, P.GR[7])
            put(buf, bx, m & _hatch(bx, 3), P.GR[5])
    bx, m, U, V = pen.rect(-T.R_OUT, -T.FLOOR, T.R_OUT, -T.GLASS_B)
    if bx is not None:
        put(buf, bx, m, P.GR[7])
        put(buf, bx, m & _hatch(bx, 3), P.GR[5])
        pen.outline(bx, m, P.GR[4])


# ------------------------------------------------------------------ the stir bar
def _bar_ends(pose):
    (cx, ch, cz), tilt, head = pose
    hl = T.BAR_L / 2 - T.BAR_R
    dx = hl * math.cos(tilt) * math.cos(head)
    dz = hl * math.cos(tilt) * math.sin(head)
    dh = hl * math.sin(tilt)
    return proj(cx - dx, ch - dh, cz - dz), proj(cx + dx, ch + dh, cz + dz)


def _capsule(pen, a, b, r):
    bx = pen.box(min(a[0], b[0]) - r, min(a[1], b[1]) - r, max(a[0], b[0]) + r, max(a[1], b[1]) + r)
    if bx is None:
        return None, None, None, None
    U, V = pen.grid(bx)
    d = sd_capsule(U, V, a[0], a[1], b[0], b[1], r)
    return bx, d <= 0, d, (U, V)


def ghost(pen, pose, alpha):
    a, b = _bar_ends(pose)
    bx, m, d, _ = _capsule(pen, a, b, T.BAR_R)
    if bx is not None and m.any():
        mix(pen.buf, bx, m, P.WB[6], alpha)


def stir_bar(pen, t, shadow=True, xray=0.0):
    pose = T.bar_pose(t)
    (cx, ch, cz), tilt, head = pose
    hl = T.BAR_L / 2 - T.BAR_R
    r = T.BAR_R
    if shadow and t >= T.SETTLE:
        sb, sm, _, _ = pen.ell(cx, -T.FLOOR + K * cz + 0.4, hl + 4.0, (abs(hl * math.sin(head)) + 4.0) * K + 1.2)
        if sb is not None:
            mix(pen.buf, sb, sm, P.NV[1], 0.25)
    # speed: a trail while it falls and zips to the middle, a blur while time runs fast
    if 0.12 < t < T.LAND + 0.02:
        for k, al in ((2, 0.14), (1, 0.28)):
            ghost(pen, T.bar_pose(t - 0.03 * k), al)
    wr = T.warp_rate(t)
    if t >= T.LAND and wr > 1.3:
        step = T.W_MAX * wr / 30.0 / 6.0
        for k in range(5, 0, -1):
            ghost(pen, ((cx, ch, cz), tilt, head - k * step), 0.10 + 0.05 * (5 - k) / 5 * min(1.0, (wr - 1.3) / 2))
    a, b = _bar_ends(pose)
    bx, m, d, (U, V) = _capsule(pen, a, b, r)
    if bx is None or not m.any():
        return
    # light from the upper left: shade by the offset across the bar's axis
    ax, ay = b[0] - a[0], b[1] - a[1]
    ln = math.hypot(ax, ay)
    if ln < 1e-6:
        nx, ny = 0.0, -1.0
    else:
        nx, ny = -ay / ln, ax / ln
        if ny > 0:
            nx, ny = -nx, -ny
    off = ((U - (a[0] + b[0]) / 2) * nx + (V - (a[1] + b[1]) / 2) * ny) / r
    v = 0.60 + 0.30 * np.clip(off, -1, 1) + 0.08 * np.clip(-d / r, 0, 1)
    put(pen.buf, bx, m, tones(P.WB, np.clip(v, 0, 1), bx))
    put(pen.buf, bx, m & (np.abs(off - 0.55) < 0.12 + 0.4 * pen.o / r) & (d < -0.6), P.WHITE)
    if ln > 1e-6:
        along = ((U - (a[0] + b[0]) / 2) * ax + (V - (a[1] + b[1]) / 2) * ay) / ln
        put(pen.buf, bx, m & (np.abs(along) < 0.75 * max(0.35, ln / (2 * hl))) & (d < -0.4), P.WB[4])
        if xray > 0:
            # x-ray: the magnet sealed inside the white plastic (S half above the drive magnet's N, N above its S)
            core = sd_capsule(U, V, a[0], a[1], b[0], b[1], r * 0.55) <= 0
            mix(pen.buf, bx, core & (along >= 0), P.GR[4], 0.85 * xray)
            mix(pen.buf, bx, core & (along < 0), P.MR[4], 0.85 * xray)
            put(pen.buf, bx, core & (np.abs(along) < 0.45 * pen.o + 0.05) & (xray > 0.5), P.WB[2])
    pen.outline(bx, m, P.WB[1])


def field_lines(pen, t, alpha):
    """The magnet's pull drawn as flowing dotted lines: from the drive magnet's N end up through the plate and the
    glass to the bar's S end, and from the bar's N end back down to the magnet's S end."""
    if alpha <= 0.02:
        return
    ph = T.magnet_angle(t)
    th = T.bar_angle_w(t)
    hm = (T.MAG_H0 + T.MAG_H1) / 2
    for sgn in (1, -1):
        mu, mv = proj(sgn * T.MAG_L * 0.85 * math.cos(ph), hm, sgn * T.MAG_L * 0.85 * math.sin(ph))
        bu, bv = proj(sgn * (T.BAR_L / 2 - 2.5) * math.cos(th), T.BAR_H, sgn * (T.BAR_L / 2 - 2.5) * math.sin(th))
        mid_u = (mu + bu) / 2
        out = 1.0 if mid_u > 0.8 else (-1.0 if mid_u < -0.8 else sgn)
        up = sgn > 0                                          # field runs magnet N -> bar S, bar N -> magnet S
        for k in range(3):
            bulge = 3.0 + 4.5 * k
            c_u, c_v = mid_u + out * bulge, (mv + bv) / 2
            n = 34
            for i in range(n + 1):
                f = i / n
                if ((i - int(t * 20) * (1 if up else -1)) % 3) != 0:
                    continue
                u = (1 - f) ** 2 * mu + 2 * (1 - f) * f * c_u + f * f * bu
                v = (1 - f) ** 2 * mv + 2 * (1 - f) * f * c_v + f * f * bv
                if alpha < 0.98 and ((i * 7 + k) % 10) / 10.0 > alpha:
                    continue
                pen.dot(u, v, P.AM[8] if k != 1 else P.WHITE, 2 if pen.z > 3.5 else 1)


def sparkle(pen, u, v, e, col=None):
    """A 4-point arcade star at (u, v), size by e (0..1)."""
    if e <= 0:
        return
    n = int(4 + 10 * e)
    i, j = pen.view.px(u, v)
    i, j = int(i), int(j)
    c = col or P.AM[7]
    for k in range(-n, n + 1):
        for (x, y) in ((i + k, j), (i, j + k), (i + k, j + 1), (i + 1, j + k)):
            if 0 <= x < W and 0 <= y < H and (abs(k) < n * 0.35 or (x == i + k and y == j) or (x == i and y == j + k)):
                pen.buf[y, x] = P.WHITE if abs(k) < n * 0.35 else c
    for k in (-1, 1):
        for kk in (-1, 1):
            x, y = i + k * max(2, n // 3), j + kk * max(2, n // 3)
            if 0 <= x < W and 0 <= y < H:
                pen.buf[y, x] = c


def dither_ok(bx, a):
    i0, j0, i1, j1 = bx
    return gfx.bayer_at(i0, j0, j1 - j0, i1 - i0) < a


def bar_ends(t):
    (cx, ch, cz), tilt, head = T.bar_pose(t)
    hl = T.BAR_L / 2
    return [proj(cx + s * hl * math.cos(head), ch, cz + s * hl * math.sin(head)) for s in (-1, 1)]


def sparkles(pen, t):
    """The bar locks onto the magnet; later it is back in clear view (two stars on the two chime notes)."""
    for t0, which in ((T.LOCK, (0, 1)), (T.CHIME, (0,)), (T.CHIME + 0.25, (1,))):
        e = 1.0 - abs(t - t0 - 0.08) / 0.18
        if e > 0:
            ends = bar_ends(t)
            for w in which:
                u, v = ends[w]
                sparkle(pen, u, v - 8.0, e ** 0.7)
    # the landing: a ripple on the glass bottom under the bar, a puff where the lower end hits first
    e = (t - T.LAND) / 0.32
    if 0 <= e < 1:
        rx = 9.0 + 20.0 * e
        bx, m, U, V = pen.ell(0.0, -T.FLOOR, rx, rx * K + 0.5)
        if bx is not None:
            ring = m & ((U / rx) ** 2 + ((V + T.FLOOR) / (rx * K + 0.5)) ** 2 > 0.62)
            put(pen.buf, bx, ring & dither_ok(bx, 1.0 - e), P.GR[9])
    e = (t - T.FLOOR_HIT) / 0.14
    if 0 <= e < 1:
        x0 = -(T.R_IN - T.BAR_R) + (T.BAR_L - 2 * T.BAR_R) * math.cos(math.radians(72.0))
        for k in (-1, 1):
            pen.dot(x0 + k * (2 + 6 * e), -T.FLOOR - 1.5 - 3 * math.sin(math.pi * e), P.WHITE)
    # the reveal: a burst of stars from the bar on the chime
    e = (t - T.CHIME) / 0.65
    if 0 <= e < 1:
        (cx, ch, cz), _, _ = T.bar_pose(t)
        u0, v0 = proj(cx, ch, cz)
        for k in range(10):
            a = k * 2 * math.pi / 10 + 0.3
            rr = 8 + 34 * (1 - (1 - e) ** 2)
            if (k + int(e * 12)) % 3 != 0 or e < 0.5:
                sparkle(pen, u0 + rr * math.cos(a), v0 + rr * 0.55 * math.sin(a) - 6, 0.45 * (1 - e),
                        P.AM[7] if k % 2 else P.WHITE)
    # the reveal: an amber ring bursts out from the bar on the chime
    e = (t - T.CHIME) / 0.4
    if 0 <= e < 1:
        (cx, ch, cz), _, _ = T.bar_pose(t)
        rx = 15.0 + 16.0 * e
        ry = rx * K + 1.0
        u0, v0 = proj(cx, ch, cz)
        bx, m, U, V = pen.ell(u0, v0, rx, ry)
        if bx is not None:
            ring = m & (((U - u0) / rx) ** 2 + ((V - v0) / ry) ** 2 > 1.0 - 0.9 * pen.o / ry - 0.06)
            put(pen.buf, bx, ring & dither_ok(bx, 1.0 - e), P.AM[7])


def glint(pen, t):
    e = 1.0 - abs(t - T.GLINT) / 0.14
    if e <= 0:
        return
    e = e ** 0.6
    (cx, ch, cz), tilt, head = T.bar_pose(t)
    hl = T.BAR_L / 2
    u, v = proj(cx - hl * math.cos(tilt) * math.cos(head) * 0.7, ch + hl * math.sin(tilt) * 0.8, cz)
    n = int(3 + 8 * e)
    i, j = pen.view.px(u, v)
    i, j = int(i), int(j)
    for k in range(-n, n + 1):
        for (x, y) in ((i + k, j), (i, j + k)):
            if 0 <= x < W and 0 <= y < H:
                pen.buf[y, x] = P.WHITE if abs(k) < n * 0.5 else P.AM[8]
    for k in (-1, 1):
        for kk in (-1, 1):
            x, y = i + k * max(1, n // 3), j + kk * max(1, n // 3)
            if 0 <= x < W and 0 <= y < H:
                pen.buf[y, x] = P.AM[8]


# ------------------------------------------------------------------ particles and bubbles
def particles(pen, t, cut=False):
    ps = T.particles(t)
    if ps is None:
        return
    x, h, z, size, shade, big = ps
    turb = T.turbidity(t)
    cols = (P.CL[8], P.CL[3], P.CL[7])
    for k in range(len(x)):
        if size[k] <= 0:
            continue
        u, v = proj(x[k], h[k], 0.0 if cut else z[k])
        if not cut and z[k] < 0 and turb > 0.55:
            continue                                       # the back ones are lost in the cloud
        if not cut and turb > 0.55 and (k % 2):
            continue                                       # keep the cloud soft: only some grains glint
        col = cols[int(shade[k])]
        s = 2 if (big[k] and size[k] > 0.55 and pen.z > 2.0) else 1
        pen.dot(u, v, col, s)


def bubbles(pen, t, cut=False):
    live, pops = T.bubbles(t)
    turb = T.turbidity(t)
    for (x, h, z, rad) in live:
        u, v = proj(x, h, 0.0 if cut else z)
        rp = rad * pen.z
        if not cut and z < 0 and turb > 0.5:
            if rp < 1.6:
                continue
        i, j = pen.view.px(u, v)
        if rp < 1.4:
            pen.dot(u, v, P.GR[9] if z > 0 or turb < 0.5 else P.GR[7])
            continue
        bx, m, U, V = pen.ell(u, v, rad, rad)
        if bx is None:
            continue
        rim = m & (((U - u) ** 2 + (V - v) ** 2) > (rad - 0.9 * pen.o) ** 2)
        mix(pen.buf, bx, m, P.GR[8], 0.25)
        put(pen.buf, bx, rim, P.GR[8])
        pen.dot(u - rad * 0.35, v - rad * 0.35, P.WHITE)
    for (x, h, z, age) in pops:
        if age > 0.1:
            continue
        u, v = proj(x, h, 0.0 if cut else z)
        rx = 1.2 + 14.0 * age
        bx, m, U, V = pen.ell(u, v, rx, rx * K + 0.4)
        if bx is None:
            continue
        ring = m & (((U - u) / rx) ** 2 + ((V - v) / (rx * K + 0.4)) ** 2 > 0.55)
        put(pen.buf, bx, ring, P.GR[9] if age < 0.05 else P.GR[7])


# ------------------------------------------------------------------ the pouring containers and streams
def _rot(pts, ang, pu, pv):
    ca, sa = math.cos(ang), math.sin(ang)
    return [(pu + x * ca - y * sa, pv + x * sa + y * ca) for (x, y) in pts]


def _flask_shape():
    outer = [(-6.5, 0.0), (6.5, 0.0), (6.5, 1.6), (5.2, 1.8), (5.2, 11.0), (17.0, 38.5), (17.5, 40.5), (16.2, 42.5),
             (-16.2, 42.5), (-17.5, 40.5), (-17.0, 38.5), (-5.2, 11.0), (-5.2, 1.8), (-6.5, 1.6)]
    inner = [(-4.0, 1.8), (4.0, 1.8), (4.0, 11.6), (15.4, 38.6), (15.2, 41.0), (-15.2, 41.0), (-15.4, 38.6),
             (-4.0, 11.6)]
    label = [(-10.5, 22.0), (10.5, 22.0), (12.4, 31.0), (-12.4, 31.0)]
    return outer, inner, label, (0.0, 26.5)


def _bottle_shape():
    outer = [(-4.6, 0.0), (4.6, 0.0), (4.6, 1.8), (3.8, 2.0), (3.8, 10.0), (11.5, 18.0), (12.0, 21.0), (12.0, 51.0),
             (10.5, 53.5), (-10.5, 53.5), (-12.0, 51.0), (-12.0, 21.0), (-11.5, 18.0), (-3.8, 10.0), (-3.8, 2.0),
             (-4.6, 1.8)]
    inner = [(-2.6, 1.0), (2.6, 1.0), (2.6, 10.6), (10.4, 18.8), (10.6, 51.0), (-10.6, 51.0), (-10.4, 18.8),
             (-2.6, 10.6)]
    label = [(-10.6, 27.0), (10.6, 27.0), (10.6, 42.0), (-10.6, 42.0)]
    return outer, inner, label, (0.0, 34.6)


def container(pen, kind, pose, fill, liq_ramp, liq_alpha, text):
    """Draw a glass container at pose = (pivot u, pivot v, angle) (pivot = the mouth): glass, the liquid inside
    (kept level), the paper label with its printed name."""
    pu, pv, ang = pose
    outer, inner, label, lc = _flask_shape() if kind == 'flask' else _bottle_shape()
    O = _rot(outer, ang, pu, pv)
    I = _rot(inner, ang, pu, pv)
    bx, om = pen.poly(O)
    if bx is None:
        return
    im = poly_sel(pen.view, I, bx)
    buf = pen.buf
    U, V = pen.grid(bx)
    mix(buf, bx, om, P.GR[7], 0.22)
    # liquid: fill the lowest part of the inside, level whatever the tilt
    n_in = int(im.sum())
    if n_in > 0 and fill > 0:
        rows = np.nonzero(im.any(axis=1))[0]
        need = int(fill * n_in)
        lm = np.zeros_like(im)
        for r in rows[::-1]:
            if need <= 0:
                break
            row = im[r]
            lm[r] = row
            need -= int(row.sum())
        _blend(buf, bx, lm, tones(liq_ramp, np.clip(0.62 + 0.15 * (U - pu) / 40.0, 0, 1), bx), liq_alpha)
        top_row = np.nonzero(lm.any(axis=1))[0]
        if len(top_row):
            r0 = top_row[0]
            line = np.zeros_like(lm)
            line[r0] = lm[r0]
            put(buf, bx, line, liq_ramp[-2])
    # glass edges and a highlight
    pen.outline(bx, om, P.GR[6])
    hi = _rot([(-3.5, 14.0), (-12.5, 37.0)] if kind == 'flask' else [(-8.5, 22.0), (-8.5, 48.0)], ang, pu, pv)
    pen.seg(hi[0], hi[1], P.WHITE)
    # the label: paper and the printed name, rotated with the container
    L = _rot(label, ang, pu, pv)
    lb, lmask = pen.poly(L, 1)
    if lb is None:
        return
    put(buf, lb, lmask, P.BODY[8])
    pen.outline(lb, lmask, P.BODY[4])
    bm = pixfont.text_bitmap(text, '5x7')
    hh, ww = bm.shape
    cu, cv = _rot([lc], ang, pu, pv)[0]
    ci, cj = pen.view.px(cu, cv)
    ca, sa = math.cos(-ang), math.sin(-ang)
    i0, j0, i1, j1 = lb
    for j in range(j0, j1):
        for i in range(i0, i1):
            if not lmask[j - j0, i - i0]:
                continue
            dx, dy = i + 0.5 - ci, j + 0.5 - cj
            sx = dx * ca - dy * sa + ww / 2
            sy = dx * sa + dy * ca + hh / 2
            xi, yi = int(math.floor(sx)), int(math.floor(sy))
            if 0 <= xi < ww and 0 <= yi < hh and bm[yi, xi]:
                buf[j, i] = P.NV[3]


def _mouth_point(kind, pose):
    pu, pv, ang = pose
    hw = 6.5 if kind == 'flask' else 4.6
    a, b = _rot([(-hw, 0.0), (hw, 0.0)], ang, pu, pv)
    return a if a[1] > b[1] else b


def stream(pen, t, start, end_u, ramp, alpha, width, clear=False, seed=0):
    """A pouring stream from start (u, v) falling into the beaker at u = end_u, ending at the liquid surface."""
    L = T.level(t)
    v_end = -(T.FLOOR + L) + K * float(_sq(np.array([end_u]))[0]) * 0.2
    su, sv = start
    n = 40
    pts_l, pts_r = [], []
    for k in range(n + 1):
        f = k / n
        u = su + (end_u - su) * (1 - (1 - f) ** 2)
        v = sv + (v_end - sv) * f
        wob = 0.35 * math.sin(t * 40 + f * 9 + seed)
        w = width * (1.0 - 0.35 * f) / 2
        pts_l.append((u - w + wob, v))
        pts_r.append((u + w + wob, v))
    poly = pts_l + pts_r[::-1]
    bx, m = pen.poly(poly, 1)
    if bx is None:
        return
    U, V = pen.grid(bx)
    if clear:
        mix(pen.buf, bx, m, P.GR[8], alpha)
        pen.outline(bx, m, P.GR[8])
        th = gfx.bayer_at(bx[0], bx[1], bx[3] - bx[1], bx[2] - bx[0])
        put(pen.buf, bx, m & (th > 0.93), P.WHITE)
    else:
        put(pen.buf, bx, m, tones(ramp, np.clip(0.65 + 0.2 * np.sin(V * 0.8 - t * 25), 0, 1), bx))
        pen.outline(bx, m, ramp[3])
    # splash at the surface: rings and a few flying droplets
    if L > 0.5:
        for k in range(2):
            ph = (t * 3.0 + k * 0.5) % 1.0
            rx = 2.0 + 9.0 * ph
            rb, rm, RU, RV = pen.ell(end_u, v_end, rx, rx * K + 0.3)
            if rb is not None:
                ring = rm & (((RU - end_u) / rx) ** 2 + ((RV - v_end) / (rx * K + 0.3)) ** 2 > 0.6)
                put(pen.buf, rb, ring, P.GR[8] if clear else ramp[-2])
    rng = np.random.default_rng(int(t * 30) + seed)
    for k in range(4):
        e = rng.uniform(0, 1)
        pen.dot(end_u + rng.uniform(-5, 5), v_end - 4.0 * math.sin(math.pi * e) - 1.0, P.WHITE if clear else ramp[-1])


def flask_pose(t):
    a0, a1, a2, a3 = T.FLASK
    if t < a0 or t > a3:
        return None
    if t < a1:
        u = T.smooth((t - a0) / (a1 - a0))
        return (70 + (24 - 70) * u, -205 + (-160 - (-205)) * u, math.radians(-8) * u)
    if t < a2:
        u = T.smooth((t - a1) / 0.12)
        return (24 + (19 - 24) * u, -160 + (-137 - (-160)) * u, math.radians(-8 + (-112 + 8) * u))
    u = T.smooth((t - a2) / (a3 - a2))
    return (19 + (75 - 19) * u, -137 + (-215 - (-137)) * u, math.radians(-112 + 100 * u))


def bottle_pose(t):
    a0, a1, a2, a3 = T.BOTTLE
    if t < a0 or t > a3:
        return None
    if t < a1:
        u = T.smooth((t - a0) / (a1 - a0))
        return (-72 + (-26 - (-72)) * u, -215 + (-168 - (-215)) * u, math.radians(8) * u)
    if t < a2:
        u = T.smooth((t - a1) / 0.12)
        return (-26 + (-20 - (-26)) * u, -168 + (-139 - (-168)) * u, math.radians(8 + (112 - 8) * u))
    u = T.smooth((t - a2) / (a3 - a2))
    return (-20 + (-78 - (-20)) * u, -139 + (-220 - (-139)) * u, math.radians(112 - 100 * u))


def pours_behind(pen, t):
    """The streams (they fall into the beaker, so they go in before the front glass)."""
    fp = flask_pose(t)
    if fp is not None and T.POUR1[0] <= t < T.POUR1[1]:
        stream(pen, t, _mouth_point('flask', fp), 13.0, P.CL, 1.0, 3.4, clear=False, seed=1)
    bp = bottle_pose(t)
    if bp is not None and T.POUR2[0] <= t < T.POUR2[1]:
        stream(pen, t, _mouth_point('bottle', bp), -13.0, P.GR, 0.45, 3.0, clear=True, seed=2)


def pours_front(pen, t):
    fp = flask_pose(t)
    if fp is not None:
        f = 0.78 - 0.62 * T.clamp01((t - T.POUR1[0]) / (T.POUR1[1] - T.POUR1[0]))
        container(pen, 'flask', fp, f, P.CL, 0.92, 'CaCO₃')
    bp = bottle_pose(t)
    if bp is not None:
        f = 0.82 - 0.55 * T.clamp01((t - T.POUR2[0]) / (T.POUR2[1] - T.POUR2[0]))
        container(pen, 'bottle', bp, f, P.GR, 0.28, 'VINEGAR')
