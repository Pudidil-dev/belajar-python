"""World A: the patient's forearm, fistula needles and blood lines.

Local arm units are close-up pixels (the hook framing is ~1:1). The arm group
can be rotated/scaled into the world, and everything is re-rasterised through
the camera every frame so zooms stay crisp.
"""
import math

import numpy as np

from pal import *  # noqa: F401,F403
from px import (BAYER4, H, W, Canvas, Path, dilate, disc_mask, hash01,
                line_mask, poly_mask, shaded_mask, smooth, clamp)


# ------------------------------------------------------------------ helpers
class Group:
    """local (u, v) -> world (x, y): rotate by ang, scale by s, then offset."""

    def __init__(self, ox, oy, ang=0.0, s=1.0):
        self.ox, self.oy, self.ang, self.s = ox, oy, ang, s
        self.ca, self.sa = math.cos(ang), math.sin(ang)

    def w(self, u, v):
        return (self.ox + (u * self.ca - v * self.sa) * self.s,
                self.oy + (u * self.sa + v * self.ca) * self.s)

    def l(self, x, y):
        dx = (x - self.ox) / self.s
        dy = (y - self.oy) / self.s
        return (dx * self.ca + dy * self.sa, -dx * self.sa + dy * self.ca)


def vhash(a, b, seed=0):
    a = np.asarray(a).astype(np.int64)
    b = np.asarray(b).astype(np.int64)
    h = (a * 73856093) ^ (b * 19349663) ^ (seed * 83492791)
    h = h & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFF) / 65536.0


def screen_poly(cam, G, pts):
    return [cam.pt(*G.w(u, v)) for (u, v) in pts]


def rect_local(u0, v0, u1, v1, ang=0.0):
    cu, cv_ = (u0 + u1) / 2, (v0 + v1) / 2
    hu, hv = (u1 - u0) / 2, (v1 - v0) / 2
    ca, sa = math.cos(ang), math.sin(ang)
    out = []
    for du, dv in ((-hu, -hv), (hu, -hv), (hu, hv), (-hu, hv)):
        out.append((cu + du * ca - dv * sa, cv_ + du * sa + dv * ca))
    return out


def rrect_local(u0, v0, u1, v1, r, n=4):
    pts = []
    corners = [(u1 - r, v0 + r, -math.pi / 2, 0), (u1 - r, v1 - r, 0, math.pi / 2),
               (u0 + r, v1 - r, math.pi / 2, math.pi), (u0 + r, v0 + r, math.pi, 1.5 * math.pi)]
    for cu, cv_, a0, a1 in corners:
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            pts.append((cu + r * math.cos(a), cv_ + r * math.sin(a)))
    return pts


# ------------------------------------------------------------- arm model
U0 = -470.0
UW = 322.0      # wrist
UEND = 398.0    # end of the palm cap
L2 = np.array([-0.55, -0.83])


def arm_vc(u):
    return 3.0 * np.sin(np.asarray(u, dtype=float) / 210.0)


def arm_h(u):
    """Half thickness: elbow -> wrist taper, slight wrist pinch, palm cap."""
    u = np.asarray(u, dtype=float)
    t = np.clip((u + 300.0) / 640.0, 0.0, 1.0)
    h = 62.0 - 17.0 * t + 5.0 * np.exp(-((u + 170.0) / 120.0) ** 2)
    h = h - 4.0 * np.exp(-((u - UW) / 14.0) ** 2) + 3.5 * np.exp(-((u - 356.0) / 22.0) ** 2)
    cap = np.clip((u - 362.0) / (UEND - 362.0), 0.0, 1.0)
    return h * np.sqrt(np.clip(1.0 - cap ** 2, 0.0, 1.0))


def vein_v(u):
    u = np.asarray(u, dtype=float)
    return arm_vc(u) - 13.0 + 4.5 * np.sin((u + 40.0) / 75.0)


VEIN_U0, VEIN_U1 = -330.0, 296.0
# top rim falloff, highlight band, wide base, shadow, core shadow, reflected light
SKIN_RAMP = [S3, S4, S3, S2, S1, S2]
SKIN_T = np.array([-0.93, -0.58, 0.34, 0.76, 0.93])

AR = [hx("#4a6582"), hx("#33495f"), hx("#273a4f"), hx("#1b2a3b"), hx("#131e2b")]


def _paint_bands(cv, m, x0, y0, band, ramp):
    img = np.array(ramp, dtype=np.uint8)[np.clip(band, 0, len(ramp) - 1)]
    cv.blit(m, x0, y0, img)


def draw_armrest(cv, cam, G):
    """Padded vinyl armrest of the dialysis chair: cushion top, stitched welt, side."""
    us = np.linspace(U0 - 80, UEND + 260, 48)
    top = [(u, float(arm_vc(min(u, UW)) + arm_h(min(u, UW))) - 40) for u in us]
    bot = [(u, 320.0) for u in us[::-1]]
    pts = screen_poly(cam, G, top + bot)
    m, x0, y0 = poly_mask(pts)
    if m is None:
        return
    z = cam.z * G.s
    hh, ww = m.shape
    ys, xs = np.mgrid[0:hh, 0:ww]
    u, v = G.l(cam.wx(xs + x0 + 0.5), cam.wy(ys + y0 + 0.5))
    uc = np.minimum(u, UW)
    d = v - (arm_vc(uc) + arm_h(uc))          # distance below the arm's lower edge
    th = BAYER4[(ys + y0) % 4, (xs + x0) % 4]
    band = np.full(m.shape, 1)                 # cushion top
    band = np.where(d > 26 + th * 2, 0, band)  # rounded welt catches the light
    band = np.where(d > 31 + th * 2, 2, band)  # side face
    band = np.where(d > 70 + th * 16, 3, band)
    band = np.where(d > 150 + th * 24, 4, band)
    img = np.array(AR, dtype=np.uint8)[band]
    if z >= 0.6:
        seam = (np.abs(d - 22) < 0.5 / z + 0.25) & ((np.floor(u / 5.0) % 2) == 0)
        img[seam] = AR[0]
    cv.blit(m, x0, y0, img)


def draw_capsule(cv, cam, G, p0, p1, r0, r1, ramp=None, outline=S0, tip_dark=0.0):
    """Tapered capsule with cylinder shading (fingers, thumb)."""
    ramp = ramp or [S5, S4, S3, S2, S1]
    a = np.array(cam.pt(*G.w(*p0)))
    b = np.array(cam.pt(*G.w(*p1)))
    z = cam.z * G.s
    R0, R1 = r0 * z, r1 * z
    x0 = int(math.floor(min(a[0], b[0]) - max(R0, R1))) - 2
    y0 = int(math.floor(min(a[1], b[1]) - max(R0, R1))) - 2
    x1 = int(math.ceil(max(a[0], b[0]) + max(R0, R1))) + 3
    y1 = int(math.ceil(max(a[1], b[1]) + max(R0, R1))) + 3
    if x1 < 0 or y1 < 0 or x0 > W or y0 > H:
        return
    ys, xs = np.mgrid[y0:y1, x0:x1]
    P = np.stack([xs + 0.5, ys + 0.5], -1)
    ab = b - a
    L = float(ab @ ab) or 1.0
    tt = np.clip(((P - a) @ ab) / L, 0.0, 1.0)
    C = a + tt[..., None] * ab
    off = P - C
    r = R0 + (R1 - R0) * tt
    dist = np.sqrt((off ** 2).sum(-1))
    m = dist <= r
    if not m.any():
        return
    s = (off @ L2) / np.maximum(r, 0.5)
    chk = (((xs + ys) & 1) - 0.5) * 0.12
    band = np.full(m.shape, 2)
    band = np.where(s + chk > 0.45, 1, band)
    band = np.where(s + chk > 0.80, 0, band)
    band = np.where(s + chk < -0.30, 3, band)
    band = np.where(s + chk < -0.74, 4, band)
    if tip_dark > 0:
        band = np.where((tt > 1 - tip_dark) & (band < 4), band + 1, band)
    if outline is not None:
        cv.stamp(dilate(m), x0 - 1, y0 - 1, outline)
    _paint_bands(cv, m, x0, y0, band, ramp)


def draw_fist(cv, cam, G):
    """Loosely closed hand, palm up: curled fingers at the end, thumb on top."""
    z = cam.z * G.s
    # curled fingers seen from the palm side: four short pills, pinky (bottom) first
    for vc_, r in ((27, 8.0), (9.5, 9.0), (-8.5, 9.0), (-26, 8.6)):
        draw_capsule(cv, cam, G, (372, vc_), (392, vc_ - 1), r, r * 0.92, tip_dark=0.0)
        if z >= 0.7:
            q0 = cam.pt(*G.w(384, vc_ - r * 0.6))
            q1 = cam.pt(*G.w(384, vc_ + r * 0.6))
            cv.line(q0[0], q0[1], q1[0], q1[1], S2)
    # thumb lies along the top edge toward the index finger
    draw_capsule(cv, cam, G, (334, -45), (376, -40), 9.5, 8.0, tip_dark=0.0)
    if z >= 0.7:
        # palm creases
        for pts in ([(338, -20), (352, -8), (364, 0)], [(342, 14), (356, 18), (366, 16)]):
            cv.polyline(screen_poly(cam, G, pts), S2)


def draw_wristband(cv, cam, G):
    u0, u1 = 296.0, 306.0
    us = np.linspace(u0, u1, 6)
    top = [(u, float(arm_vc(u) - arm_h(u)) - 1.5) for u in us]
    bot = [(u, float(arm_vc(u) + arm_h(u)) + 1.5) for u in us[::-1]]
    m, x0, y0 = poly_mask(screen_poly(cam, G, top + bot))
    if m is None:
        return
    shaded_mask(cv, m, x0, y0, M4, hi=M5, sh=M3, outline=M1, k=max(1, int(round(cam.z * G.s))))
    # printed label patch
    m, x0, y0 = poly_mask(screen_poly(cam, G, rect_local(u0 + 2.5, -16, u1 - 2.5, 4)))
    if m is not None:
        cv.stamp(m, x0, y0, CY1 if cam.z * G.s < 0.9 else M2)


def draw_arm(cv, cam, G, shadow=True, hand=True):
    us = np.linspace(U0, UEND if hand else UW, 220)
    top = [(u, float(arm_vc(u) - arm_h(u))) for u in us]
    bot = [(u, float(arm_vc(u) + arm_h(u))) for u in us[::-1]]
    pts = screen_poly(cam, G, top + bot)
    m, x0, y0 = poly_mask(pts)
    if m is None:
        return
    z = cam.z * G.s
    if shadow:
        sh = max(2, int(round(6 * z)))
        cv.stamp_dither(m, x0, y0 + sh, AR[3], 0.8)
        cv.stamp_dither(m, x0, y0 + sh + max(1, sh // 2), AR[3], 0.4)
    hh, ww = m.shape
    ys, xs = np.mgrid[0:hh, 0:ww]
    SX = xs + x0
    SY = ys + y0
    u, v = G.l(cam.wx(SX + 0.5), cam.wy(SY + 0.5))
    uc = np.minimum(u, 360.0)                  # palm cap keeps the wrist's shading
    h = arm_h(uc)
    wv = (v - arm_vc(u)) / np.maximum(h, 1.0)
    checker = ((SX + SY) & 1).astype(float) - 0.5
    d = 1.1 / np.maximum(h * z, 1.0)
    wmod = wv + 0.05 * np.sin(u / 85.0 + 1.0) + 0.03 * np.sin(u / 33.0 + 2.0)
    band = np.searchsorted(SKIN_T, wmod + checker * 2 * d).astype(np.int64)
    # the palm cap darkens toward its rounded end
    endk = np.clip((u - 372.0) / (UEND - 372.0), 0, 1)
    band = np.where((endk + checker * 0.2 > 0.55) & (band < 3), band + 1, band)

    # fistula vein: raised bulge catches light on top, shadow + mauve underneath
    taper = np.clip(np.minimum(u - VEIN_U0, VEIN_U1 - u) / 60.0, 0.0, 1.0)
    hv = 6.5 * taper
    dv = v - vein_v(u)
    inside = (np.abs(dv) < hv) & (taper > 0)
    up = inside & (dv < -0.2 * hv + checker * 0.6 / max(z, 0.2))
    low = inside & (dv > 0.30 * hv + checker * 0.6 / max(z, 0.2))
    band = np.where(up & (band == 2), 1, band)
    band = np.where(low & (band <= 2), 3, band)
    vein_edge = inside & (dv > 0.74 * hv)

    # skin texture: rare 1px pores, anchored to the arm
    if z >= 0.8:
        # 1px pores anchored to the arm at screen scale (no 'sand' at close range)
        q = vhash(np.floor(u * z / 1.5), np.floor(v * z / 1.5), 7)
        dens = 0.010 if z < 1.6 else 0.006
        band = np.where((q < dens) & (band == 2), 3, band)
        band = np.where((q > 1 - dens * 0.5) & (band == 2), 1, band)

    img = np.array(SKIN_RAMP, dtype=np.uint8)[np.clip(band, 0, len(SKIN_RAMP) - 1)]
    img[vein_edge & (band <= 3)] = VEIN
    cv.stamp(dilate(m), x0 - 1, y0 - 1, S0)
    cv.blit(m, x0, y0, img)
    if hand:
        draw_wristband(cv, cam, G)
        draw_fist(cv, cam, G)


# --------------------------------------------------------------- needles
def draw_needle(cv, cam, G, un, kind, t=0.0):
    """Fistula needle: shaft into the skin, hub, butterfly wings, two tapes.
    The needle points toward the elbow (-u); its tube leaves toward +u."""
    vn = float(vein_v(un))
    z = cam.z * G.s
    wing = (CR0, CR1, CR2) if kind == "A" else (CV0, CV1, CV2)

    def P(pts):
        return screen_poly(cam, G, pts)

    # skin tent where the shaft enters
    m, x0, y0 = poly_mask(P([(un - 13, vn - 3), (un - 6, vn - 4.5), (un - 4, vn + 3.5), (un - 12, vn + 3)]))
    if m is not None:
        shaded_mask(cv, m, x0, y0, S3, hi=S4, sh=S2, k=1)
    # metal shaft (visible part)
    a = cam.pt(*G.w(un - 1, vn - 0.6))
    b = cam.pt(*G.w(un - 11, vn + 0.4))
    cv.line(a[0], a[1] + max(1, z * 0.8), b[0], b[1] + max(1, z * 0.8), M1, w=max(1, z * 1.4))
    cv.line(a[0], a[1], b[0], b[1], M5, w=max(1, z * 1.4))
    # wings (flat, on the skin)
    for sgn in (-1, 1):
        wp = [(un + 0, vn + sgn * 3), (un + 11, vn + sgn * 3), (un + 13, vn + sgn * 16),
              (un + 9, vn + sgn * 18), (un + 1, vn + sgn * 17), (un - 1, vn + sgn * 12)]
        m, x0, y0 = poly_mask(P(wp))
        if m is not None:
            shaded_mask(cv, m, x0, y0, wing[1], hi=wing[2], sh=wing[0], outline=R0 if kind == "A" else CV0,
                        k=max(1, int(round(z))))
            if z >= 0.9:
                for k_ in (5.5, 9.5):
                    p0 = cam.pt(*G.w(un + 2, vn + sgn * k_))
                    p1 = cam.pt(*G.w(un + 11, vn + sgn * k_))
                    cv.line(p0[0], p0[1], p1[0], p1[1], wing[0])
    # hub (clear plastic with blood inside)
    m, x0, y0 = poly_mask(P(rrect_local(un - 2, vn - 3.6, un + 14, vn + 3.6, 2.5)))
    if m is not None:
        shaded_mask(cv, m, x0, y0, M3, hi=M5, sh=M2, outline=M1, k=1)
    m, x0, y0 = poly_mask(P(rrect_local(un + 1, vn - 1.6, un + 13, vn + 1.6, 1.2)))
    if m is not None:
        cv.stamp(m, x0, y0, R2)
    # tape over the shaft entry
    tp = rect_local(un - 9, vn - 17, un - 1, vn + 17, 0.06)
    m, x0, y0 = poly_mask(P(tp))
    if m is not None:
        shd = max(1, int(round(z)))
        cv.stamp_dither(m, x0 + shd, y0 + shd, S1, 0.55)
        shaded_mask(cv, m, x0, y0, T2, hi=T2, sh=T1, outline=T0, k=max(1, int(round(z))))
        if z >= 0.9:
            _tape_dots(cv, cam, G, un - 9, vn - 17, un - 1, vn + 17)


def draw_tape(cv, cam, G, uc, vc, wu, wv, ang=0.0):
    z = cam.z * G.s
    m, x0, y0 = poly_mask(screen_poly(cam, G, rect_local(uc - wu / 2, vc - wv / 2, uc + wu / 2, vc + wv / 2, ang)))
    if m is not None:
        # soft contact shadow on the skin, then the tape with a lifted top-left edge
        sh = max(1, int(round(z)))
        cv.stamp_dither(m, x0 + sh, y0 + sh, S1, 0.55)
        shaded_mask(cv, m, x0, y0, T2, hi=T2, sh=T1, outline=T0, k=max(1, int(round(z))))
        if z >= 0.9:
            _tape_dots(cv, cam, G, uc - wu / 2, vc - wv / 2, uc + wu / 2, vc + wv / 2)


def _tape_dots(cv, cam, G, u0, v0, u1, v1):
    uu = np.arange(math.ceil(u0) + 1.5, u1 - 1, 3.0)
    vv = np.arange(math.ceil(v0) + 1.5, v1 - 1, 3.0)
    for i, u in enumerate(uu):
        for j, v in enumerate(vv):
            if (i + j) % 2 == 0:
                p = cam.pt(*G.w(u, v))
                cv.px(p[0], p[1], T1)


def draw_clamp(cv, cam, path, s, kind, wpx):
    """Pinch clamp across the tube at arc length s."""
    x, y = path.at(s)
    tx, ty = path.tangent(s)
    nx, ny = -ty, tx
    z = cam.z
    col = (CR0, CR1, CR2) if kind == "A" else (CV0, CV1, CV2)
    L = wpx * 1.6
    Wd = 3.2
    pts = []
    for a, b in ((-Wd, -L), (Wd, -L), (Wd, L), (-Wd, L)):
        pts.append(cam.pt(x + tx * a + nx * b, y + ty * a + ny * b))
    m, x0, y0 = poly_mask(pts)
    if m is not None:
        shaded_mask(cv, m, x0, y0, col[1], hi=col[2], sh=col[0], outline=R0 if kind == "A" else CV0,
                    k=max(1, int(round(z))))


# ------------------------------------------------------------------ tubes
class Tube:
    """A blood (or dialysate) line along a world-space spline."""

    def __init__(self, pts, width, kind="blood", speed=70.0, period=22.0, specks=0.0, seed=1,
                 pulse=0.45):
        self.path = Path(pts, samples_per_seg=30)
        self.width = width
        self.kind = kind
        self.speed = speed
        self.period = period
        self.specks = specks
        self.seed = seed
        self.pulse = pulse

    def flow(self, t):
        # pulsatile: the roller pump gives a surge every 0.5 s (one beat)
        w = 2 * math.pi / 0.5
        return self.speed * (t - self.pulse * math.sin(w * t) / w)

    def colors(self):
        if self.kind == "blood":
            return R0, R1, R2, R3, R4, R5
        return B0, B1, B2, B3, B4, CY3

    def draw(self, cv, cam, t, s0=0.0, s1=None, highlight=True, dim=False):
        P = self.path
        s1 = P.L if s1 is None else s1
        if s1 <= s0:
            return
        z = cam.z
        wpx = max(2.0, self.width * z)
        c0, c1, c2, c3, c4, c5 = self.colors()
        if dim:
            c2, c3, c4 = c1, c2, c3
        step = max(0.6, 0.9 / z)
        ss = np.arange(s0, s1, step)
        if len(ss) < 2:
            return
        pts = [P.at(s) for s in ss]
        scr = [cam.pt(*p) for p in pts]
        # cull fully off-screen
        xs = [p[0] for p in scr]
        ys = [p[1] for p in scr]
        if max(xs) < -wpx or min(xs) > W + wpx or max(ys) < -wpx or min(ys) > H + wpx:
            return
        # outline + wall + core via thick polylines
        for w_, col in ((wpx + 2, c0), (wpx, c1)):
            m, ox, oy = line_mask(scr, w_)
            if m is not None:
                cv.stamp(m, ox, oy, col)
        core = max(1.0, wpx - 2)
        # flowing packets: colour by phase along the line
        ph = (ss - self.flow(t)) / self.period
        fr = ph - np.floor(ph)
        r = core / 2.0
        for (sx, sy), f in zip(scr, fr):
            if sx < -r - 2 or sx > W + r + 2 or sy < -r - 2 or sy > H + r + 2:
                continue
            col = c2
            if f > 0.86:
                col = c4
            elif f > 0.58:
                col = c3
            dm, dx0, dy0 = disc_mask(sx, sy, r)
            cv.stamp(dm, dx0, dy0, col)
        # specks: individual cells / urea riding in the flow
        if self.specks > 0 and wpx >= 3:
            n = int(P.L * self.specks)
            for k in range(n):
                base = hash01(self.seed, k) * P.L
                sp = 1.0 + 0.12 * (hash01(self.seed, k, 3) - 0.5)
                s = (base + self.flow(t) * sp) % P.L
                if s < s0 or s > s1:
                    continue
                x, y = P.at(s)
                tx, ty = P.tangent(s)
                off = (hash01(self.seed, k, 5) - 0.5) * 0.6 * core / z
                x += -ty * off
                y += tx * off
                sx, sy = cam.pt(x, y)
                is_urea = (self.kind == "blood") and hash01(self.seed, k, 9) < 0.35
                col = U2 if is_urea else c5
                sz = 1 if wpx < 9 else 2
                cv.rect(sx - sz / 2, sy - sz / 2, sx + sz / 2, sy + sz / 2, col)
        if highlight and wpx >= 4:
            # glossy plastic highlight on the light side (upper-left)
            hl = []
            for s, (sx, sy) in zip(ss, scr):
                tx, ty = P.tangent(s)
                nx, ny = -ty, tx
                if nx * -0.6 + ny * -0.8 < 0:
                    nx, ny = -nx, -ny
                off = wpx / 2 - 1.6
                hl.append((sx + nx * off, sy + ny * off, s))
            seg = []
            for (hx_, hy_, s) in hl:
                if ((s * z) // 7) % 4 == 3:
                    if len(seg) > 1:
                        cv.polyline([(a, b) for a, b in seg], c5, w=1)
                    seg = []
                else:
                    seg.append((hx_, hy_))
            if len(seg) > 1:
                cv.polyline(seg, c5, w=1)


def tube_points(G, local_pts, world_pts):
    return [G.w(u, v) for (u, v) in local_pts] + list(world_pts)


# ------------------------------------------------------------- background
def draw_bg(cv, cam, t, par=0.35, machine_ghost=None):
    a = cv.a
    # flat navy with a gentle dithered darkening toward the bottom
    a[:] = BG1
    ys = np.arange(H)
    lvl = np.clip((ys - 200) / 300.0, 0, 1)[:, None]
    th = BAYER4[ys % 4][:, np.arange(W) % 4]
    a[th < lvl * 0.55] = BG0
    # parallax blueprint grid (dotted)
    z = cam.z ** par
    sp = 30.0 * z
    ox = (-(cam.cx * par) * z) % sp
    oy = (-(cam.cy * par) * z) % sp
    xs = np.arange(ox, W, sp).astype(int)
    yy = np.arange(oy, H, sp).astype(int)
    for x in xs:
        a[0:H:2, x] = BG2
    for y in yy:
        a[y, 0:W:2] = BG2
    # bokeh discs (far layer)
    for k in range(9):
        bx = (hash01(11, k) * 420 - 75 - cam.cx * 0.15 * z + t * (3 + 4 * hash01(12, k))) % 420 - 75
        by = (hash01(13, k) * 640 - 80 - cam.cy * 0.15 * z - t * 2.0) % 640 - 80
        r = (10 + 22 * hash01(14, k)) * z
        m, x0, y0 = disc_mask(bx, by, r)
        cv.stamp_dither(m, x0, y0, BG3, 0.28 + 0.2 * hash01(15, k), ox=int(bx), oy=int(by))
    if machine_ghost is not None:
        machine_ghost(cv, cam, t)
    # dust motes (mid layer), slow drift + twinkle
    for k in range(46):
        d = 0.45 + 0.4 * hash01(21, k)
        zz = cam.z ** d
        x = (hash01(22, k) * 330 - cam.cx * d * zz * 0.25 + 6 * math.sin(t * 0.7 + k)) % 330 - 30
        y = (hash01(23, k) * 540 - cam.cy * d * zz * 0.25 - t * (4 + 6 * hash01(24, k))) % 540 - 30
        tw = 0.5 + 0.5 * math.sin(t * (1.0 + 2.5 * hash01(25, k)) + 6.28 * hash01(26, k))
        col = CY0 if tw < 0.6 else (BG5 if tw < 0.9 else CY1)
        cv.px(x, y, col)
        if d > 0.75 and tw > 0.85:
            cv.px(x + 1, y, col)
