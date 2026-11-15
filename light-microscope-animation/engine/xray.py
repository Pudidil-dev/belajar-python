"""Scene 6: an x-ray side view of the same microscope, showing how the light and the lenses make the image.

The outside comes from the 3D model, ray-traced in an orthographic side view (front to the left, arm to the right). A
scan line turns it into an x-ray: see-through body, cyan edges, a blueprint grid behind, the optics glowing inside.

Then three steps, drawn as a real (paraxial, thin-lens) ray diagram along the folded optical axis:
  1. lamp -> collector -> condenser: a cone of light focused onto the thin blood film;
  2. objective: three classic rays from a cell converge into a real, magnified, upside-down image in the tube;
  3. eyepiece: the image sits inside its focal length, so it works like a magnifying glass and sends the light to the eye.
Last, the camera pulls back over the whole path for the total magnification (40x objective x 10x eyepiece = 400x).
The diagram's distances are the model's; the magnifications on screen are diagram values, the captions give the real ones.
"""
import math
import numpy as np
from . import rt, gfx, scope
from . import timeline as T
from .palette import BG, WH, DK, GL, CY, LT, PK, PU, SM, OUTLINE, WHITE

ZA = scope.ZA
Y0 = 13.0                                      # the lamp filament (s = 0)
PRISM_Y = 215.0
S_P = PRISM_Y - Y0                             # the fold at the prism
D2 = np.array([scope.TUBE_AXIS[2], scope.TUBE_AXIS[1]])     # (z, y) direction of the tube
N1 = np.array([1.0, 0.0])                      # transverse direction below the prism (toward the front, +z)
N2 = np.array([D2[0], -D2[1]])                 # ... and above it
NM = np.array([0.414, 1.0]) / math.hypot(0.414, 1.0)       # normal of the fold's mirror line
PP = np.array([ZA, PRISM_Y])

# thin-lens model along the unfolded axis s (mm from the filament)
S_COL, F_COL = 14.0, 14.0                      # collector: makes the lamp's light parallel
S_CON, F_CON = 102.0, 22.0                     # condenser: focuses it onto the film
S_SPEC = scope.STAGE_TOP + scope.SLIDE_T + 0.3 - Y0
S_OBJ, F_OBJ = 142.5, 15.4                     # objective
S_EYE, F_EYE = S_P + 66.0, 26.0                # eyepiece
S_VIEW = S_P + 106.0                           # the eye
H_OBJ = 0.9                                    # half the cell's size in the diagram (its marked edge sits at +H_OBJ)
S_IMG = S_OBJ + 1 / (1 / F_OBJ - 1 / (S_OBJ - S_SPEC))
M_OBJ = -(S_IMG - S_OBJ) / (S_OBJ - S_SPEC)


def world(s, h):
    """World (z, y) of a point at axis position s with transverse offset h (folded at the prism)."""
    if s <= S_P:
        return np.array([ZA + h, Y0 + s])
    return PP + (s - S_P) * D2 + h * N2


def trace(s0, h0, u0, s1, lenses):
    """Paraxial ray from (s0, h0) with slope u0 to s1 through thin lenses [(s, f)]: list of (s, h)."""
    pts = [(s0, h0)]
    s, h, u = s0, h0, u0
    for ls, f in lenses:
        if ls <= s or ls > s1:
            continue
        h += u * (ls - s)
        s = ls
        pts.append((s, h))
        u -= h / f
    h += u * (s1 - s)
    pts.append((s1, h))
    return pts


def ray_polyline(pts, step=1.0):
    """Sample a piecewise-linear (s, h) ray densely and fold it at the prism: list of world (z, y)."""
    out = []
    ss = []
    for (sa, ha), (sb, hb) in zip(pts[:-1], pts[1:]):
        n = max(2, int(math.ceil((sb - sa) / step)))
        for k in range(n):
            u = k / n
            ss.append((sa + (sb - sa) * u, ha + (hb - ha) * u))
    ss.append(pts[-1])
    corner_done = False
    for s, h in ss:
        p = world(s, h)
        side = (p - PP) @ NM
        if s <= S_P and side > 0:
            continue
        if s > S_P and side < 0:
            continue
        if s > S_P and not corner_done:
            out.append(PP + h * (N1 + N2) / (1 + N1 @ N2))
            corner_done = True
        out.append(p)
    return out


LAMP_RAYS = [trace(0.0, 0.0, u, S_SPEC, [(S_COL, F_COL), (S_CON, F_CON)]) for u in (-0.5, -0.25, 0.25, 0.5)]
IMAGE_RAYS = [trace(S_SPEC, H_OBJ, u, S_VIEW, [(S_OBJ, F_OBJ), (S_EYE, F_EYE)])
              for u in (0.0, -H_OBJ / (S_OBJ - S_SPEC), -H_OBJ / (S_OBJ - F_OBJ - S_SPEC))]
RAY_COLS = [CY[5], WHITE, PK[5]]


def lenses():
    """(s, half width, half thickness) of every lens drawn in the x-ray."""
    return [(S_COL, 11.0, 2.2), (27.0, 13.0, 1.4), (S_CON - 4, 12.5, 2.4), (S_CON + 6, 8.5, 2.6),
            (S_OBJ - 7.5, 2.8, 1.1), (S_OBJ, 4.6, 1.5), (S_OBJ + 12, 6.0, 1.7),
            (S_EYE - 6, 9.0, 1.8), (S_EYE + 14, 8.0, 2.0)]


class SideCam:
    def __init__(self, zc, yc, s):
        self.zc, self.yc, self.s = zc, yc, s

    def to(self, z, y):
        return gfx.W / 2 + (self.zc - z) * self.s, gfx.H / 2 - (y - self.yc) * self.s

    def world_grid(self):
        X = (np.arange(gfx.W) + 0.5)[None, :]
        Y = (np.arange(gfx.H) + 0.5)[:, None]
        return np.broadcast_arrays(self.zc - (X - gfx.W / 2) / self.s, self.yc - (Y - gfx.H / 2) / self.s)

    def rt_camera(self):
        return rt.Camera((600.0, self.yc, self.zc), (0.0, self.yc, self.zc), (0, 1, 0), ortho=gfx.H / self.s)


VIEWS = {'lamp': (ZA - 2.0, 80.0, 2.55), 'obj': (33.0, 190.0, 3.0), 'eye': (70.0, 268.0, 3.0),
         'whole': (-8.0, 172.0, 1.3)}


def view(t):
    def mix(a, b, k):
        return (T.lerp(a[0], b[0], k), T.lerp(a[1], b[1], k), a[2] * (b[2] / a[2]) ** k)
    if t < T.STEP2[0]:
        return VIEWS['lamp']
    if t < T.STEP3[0]:
        return mix(VIEWS['lamp'], VIEWS['obj'], T.ease_in_out(T.u_of(t, (T.STEP2[0], T.STEP2[0] + 0.7)), 2.4))
    if t < T.TOTALMAG[0]:
        return mix(VIEWS['obj'], VIEWS['eye'], T.ease_in_out(T.u_of(t, (T.STEP3[0], T.STEP3[0] + 0.7)), 2.4))
    return mix(VIEWS['eye'], VIEWS['whole'], T.ease_in_out(T.u_of(t, (T.TOTALMAG[0], T.TOTALMAG[0] + 0.8)), 2.4))


def _xray_body(buf, pid, scan_rows):
    """Turn the shaded side view into an x-ray below the scan line: see-through fill, glowing cyan edges."""
    obj = pid >= 0
    th = gfx.BAYER[:gfx.H, :gfx.W]
    xr = np.where((th < 0.42)[..., None], np.asarray(BG[6], np.uint8), np.asarray(BG[5], np.uint8))
    dark = np.isin(pid, [scope.PID[n] for n in ('dark', 'stage', 'holder', 'eyepiece', 'rubber', 'knurl_x',
                                                    'fine_x', 'knurl_y', 'xknob')])
    xr[dark] = np.where((th[dark] < 0.3)[:, None], np.asarray(BG[5], np.uint8), np.asarray(BG[4], np.uint8))
    edge = np.zeros_like(obj)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.roll(np.roll(pid, dy, 0), dx, 1)
        edge |= obj & (sh != pid)
    m = obj & scan_rows
    buf[m] = xr[m]
    e = edge & scan_rows
    buf[e] = CY[2]
    sil = e & (np.roll(pid, 1, 0) < 0) | e & (np.roll(pid, -1, 0) < 0) | e & (np.roll(pid, 1, 1) < 0) | \
        e & (np.roll(pid, -1, 1) < 0)
    buf[sil] = CY[3]


def _paint_lens(buf, cam, s, hw, ht, zw, yw, on):
    p = world(s, 0.0)
    if s <= S_P:
        a, n = np.array([0.0, 1.0]), N1
    else:
        a, n = D2, N2
    rz, ry = zw - p[0], yw - p[1]
    u = (rz * n[0] + ry * n[1]) / hw
    v = (rz * a[0] + ry * a[1]) / ht
    lens = (np.abs(u) < 1) & (np.abs(v) < np.sqrt(np.clip(1 - u * u, 0, 1))) & on
    buf[lens] = GL[4]
    buf[lens & (v > 0.2)] = GL[6]
    buf[lens & (np.abs(u) > 0.84)] = CY[3]


def _poly(buf, cam, pts, col, upto=None, width=1):
    """Draw a world polyline (optionally only its first `upto` mm of length)."""
    if len(pts) < 2:
        return
    P = [cam.to(*p) for p in pts]
    if upto is not None:
        L = 0.0
        keep = [P[0]]
        for a, b, wa, wb in zip(P[:-1], P[1:], pts[:-1], pts[1:]):
            seg = float(np.hypot(*(np.asarray(wb) - np.asarray(wa))))
            if L + seg >= upto:
                u = (upto - L) / max(seg, 1e-9)
                keep.append((a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u))
                break
            keep.append(b)
            L += seg
        P = keep
    if len(P) < 2:
        return
    mk = gfx.polyline(P, width)
    gfx.fill(buf, mk, col)


def _cell_glyph(buf, cam, s, h_tip, scale_px, inverted):
    """A pink cell centred on the axis with a plum spot at its h_tip edge: the textbook arrow, drawn as a cell, so the
    image shows the spot on the other side (upside down)."""
    c = world(s, 0.0)
    tip = world(s, np.sign(h_tip) * max(abs(h_tip) * 0.62, 2.2 / cam.s))
    r = max(abs(h_tip) * cam.s, 3.6)
    cx, cy = cam.to(*c)
    tx, ty = cam.to(*tip)
    mk = gfx.ellipse(cx, cy, max(r, 1.5), max(r * 0.8, 1.2))
    gfx.fill(buf, mk.dilate(1), OUTLINE)
    gfx.fill(buf, mk, PK[3])
    gfx.fill(buf, gfx.ellipse(cx, cy, max(r * 0.42, 0.8), max(r * 0.34, 0.7)), PK[5])
    gfx.fill(buf, gfx.ellipse(tx, ty, max(r * 0.3, 0.9), max(r * 0.3, 0.9)), PU[2])


def _eye(buf, cam):
    """The viewer's eye above the eyepiece, looking down the tube."""
    c = world(S_VIEW + 9.0, 0.0)
    cx, cy = cam.to(*c)
    r = 5.5 * cam.s
    mk = gfx.ellipse(cx, cy, r, r)
    gfx.fill(buf, mk.dilate(1), OUTLINE)
    gfx.fill(buf, mk, WH[6])
    gfx.fill(buf, gfx.ellipse(cx + r * 0.25, cy - r * 0.25, r * 0.55, r * 0.55), WH[7])
    look = world(S_VIEW + 2.5, 0.0)
    lx, ly = cam.to(*look)
    gfx.fill(buf, gfx.ellipse(lx, ly, r * 0.42, r * 0.42), GL[3])
    gfx.fill(buf, gfx.ellipse(lx, ly, r * 0.22, r * 0.22), BG[0])
    gfx.fill(buf, gfx.ellipse(lx - r * 0.1, ly - r * 0.12, max(r * 0.07, 0.6), max(r * 0.07, 0.6)), WHITE)


def _band(buf, cam, zw, yw, reach_s, t, alpha=1.0):
    """The soft band of light from the lamp along the axis up to reach_s (dithered, not a laser)."""
    th = gfx.BAYER[:gfx.H, :gfx.W]
    prof = [(0.0, 1.0), (S_COL, 9.5), (S_CON - 6, 9.5), (S_SPEC, 1.2), (S_OBJ, 5.0), (S_P, 4.4), (S_EYE, 7.0),
            (S_VIEW, 1.8)]
    ss = np.array([p[0] for p in prof])
    hw = np.array([p[1] for p in prof])
    acc = np.zeros(zw.shape)
    # the vertical part
    s_v = yw - Y0
    on_v = (s_v >= 0) & (s_v <= min(reach_s, S_P)) & (((np.stack([zw - PP[0], yw - PP[1]], -1)) @ NM) <= 0)
    w_v = np.interp(s_v, ss, hw)
    acc = np.maximum(acc, on_v * np.clip(1.1 - np.abs(zw - ZA) / w_v, 0, 1))
    if reach_s > S_P:
        rz, ry = zw - PP[0], yw - PP[1]
        k = rz * D2[0] + ry * D2[1]
        h = rz * N2[0] + ry * N2[1]
        s_t = S_P + k
        on_t = (k >= 0) & (s_t <= reach_s) & ((np.stack([rz, ry], -1) @ NM) >= 0)
        w_t = np.interp(s_t, ss, hw)
        acc = np.maximum(acc, on_t * np.clip(1.1 - np.abs(h) / w_t, 0, 1))
    flick = 0.88 + 0.12 * np.sin((yw + zw) * 0.4 - t * 8.0)
    acc *= flick * alpha
    buf[acc > 0.1 + 0.8 * th] = LT[3]
    buf[acc > 0.62 + 0.38 * th] = LT[4]


def draw(buf, t):
    zc, yc, s = view(t)
    cam = SideCam(zc, yc, s)
    zw, yw = cam.world_grid()
    X = np.arange(gfx.W)[None, :]
    Yg = np.arange(gfx.H)[:, None]
    # blueprint grid on navy
    buf[:] = BG[3]
    gx = np.floor(zw / 10.0)
    gy = np.floor(yw / 10.0)
    fine = (np.abs(zw - np.round(zw / 10.0) * 10) < 0.5 / s) | (np.abs(yw - np.round(yw / 10.0) * 10) < 0.5 / s)
    buf[fine] = BG[4]
    major = (np.abs(zw - np.round(zw / 50.0) * 50) < 0.5 / s) | (np.abs(yw - np.round(yw / 50.0) * 50) < 0.5 / s)
    buf[major] = BG[5]
    # the microscope from the 3D model, then the x-ray sweep (bottom to top)
    rcam = cam.rt_camera()
    parts = [(sol, scope.PID[name]) for sol, name in scope.build(T.XRAY_ON[0])]
    pid, depth, nrm, hit, vw = rt.trace(rcam, parts)
    shaded = buf.copy()
    scope.shade(shaded, pid, depth, nrm, hit, vw, T.XRAY_ON[0])
    obj = pid >= 0
    buf[obj] = shaded[obj]
    k = T.smooth(T.u_of(t, T.XRAY_ON))
    scan_y = gfx.H + 6 - (gfx.H + 12) * k
    scan_rows = np.broadcast_to(Yg > scan_y, (gfx.H, gfx.W))
    _xray_body(buf, pid, scan_rows)
    on = scan_rows
    # the optics inside
    sock = (np.abs(zw - ZA) < 4.5) & (yw > 3) & (yw < 8.5) & on
    buf[sock] = CY[1]
    bulb = (((zw - ZA) / 6.0) ** 2 + ((yw - 14.0) / 7.5) ** 2 < 1) & on
    buf[bulb] = GL[2]
    fil = bulb & (np.abs(yw - 14.0 - 1.6 * np.sin((zw - ZA) * 2.2)) < 0.6) & (np.abs(zw - ZA) < 3.2)
    buf[fil] = LT[6]
    for (ls, hw, ht) in lenses():
        _paint_lens(buf, cam, ls, hw, ht, zw, yw, on)
    iris = (np.abs(yw - (S_CON - 11 + Y0)) < 0.6) & (np.abs(np.abs(zw - ZA) - 11.5) < 3.5) & on
    buf[iris] = CY[3]
    sl = (np.abs(zw - ZA) < 12.5) & (yw >= scope.STAGE_TOP) & (yw <= scope.STAGE_TOP + scope.SLIDE_T) & on
    buf[sl] = CY[4]
    film = (np.abs(zw - ZA) < 10.5) & (yw > scope.STAGE_TOP + scope.SLIDE_T) & \
        (yw < scope.STAGE_TOP + scope.SLIDE_T + 0.4 + 0.7 / s) & on
    buf[film] = SM[4]
    pr = gfx.polygon([cam.to(ZA - 7.5, PRISM_Y - 7.5), cam.to(ZA + 7.5, PRISM_Y - 7.5), cam.to(ZA + 7.5, PRISM_Y + 7.5)])
    if not pr.empty():
        pm = gfx.Mask(pr.x0, pr.y0, pr.m & on[pr.y0:pr.y1, pr.x0:pr.x1])
        gfx.fill(buf, pm, GL[3])
        gfx.fill(buf, pm.outline() & gfx.Mask(0, 0, on), CY[3])
    if t < T.XRAY_ON[1] + 0.02:
        band = np.abs(Yg + 0.5 - scan_y) < 1.2
        buf[np.broadcast_to(band, buf.shape[:2])] = CY[4]
        return buf
    # ---- step 1: the lamp's light, made parallel by the collector, focused by the condenser onto the film
    reach = S_SPEC * T.ease_in_out(T.u_of(t, T.LIGHT), 1.5)
    if t >= T.STEP2[0]:
        reach = S_SPEC + (S_VIEW - S_SPEC) * T.ease_in_out(T.u_of(t, (T.STEP2[0], T.STEP3[1] - 0.6)), 1.3)
    _band(buf, cam, zw, yw, reach, t, 0.8 if t < T.STEP2[0] else 0.55)
    l1 = T.u_of(t, (T.STEP1[0] + 0.1, T.STEP1[0] + 1.6))
    for r in LAMP_RAYS:
        pts = ray_polyline(r)
        _poly(buf, cam, pts, OUTLINE, upto=S_SPEC * 1.08 * l1, width=3)
        _poly(buf, cam, pts, WHITE, upto=S_SPEC * 1.08 * l1)
    if t >= T.STEP1[0] + 1.6:
        p = world(S_SPEC, 0.0)
        x, y = cam.to(*p)
        rr = 2 + 2 * math.sin(t * 9.0) ** 2
        gfx.fill(buf, gfx.ellipse(x, y, rr, rr * 0.6), LT[6])
    # ---- step 2: the objective forms a real, magnified, upside-down image in the tube
    if t >= T.STEP2[0]:
        _cell_glyph(buf, cam, S_SPEC, H_OBJ, cam.s, False)
        l2 = T.u_of(t, (T.STEP2[0] + 0.5, T.STEP2[0] + 1.7))
        for r, col in zip(IMAGE_RAYS, RAY_COLS):
            pts = ray_polyline([q for q in r if q[0] <= S_IMG + 1e-6] + [(S_IMG, _h_at(r, S_IMG))])
            _poly(buf, cam, pts, OUTLINE, upto=(S_IMG - S_SPEC + 30) * l2, width=4)
            _poly(buf, cam, pts, col, upto=(S_IMG - S_SPEC + 30) * l2, width=2)
        if t >= T.STEP2[0] + 1.6:
            pop = T.back_out(T.u_of(t, (T.STEP2[0] + 1.6, T.STEP2[0] + 1.85)), 2.0)
            _cell_glyph(buf, cam, S_IMG, M_OBJ * H_OBJ * pop, cam.s, True)
    # ---- step 3: the eyepiece magnifies the image again for the eye
    if t >= T.STEP3[0]:
        _eye(buf, cam)
        l3 = T.u_of(t, (T.STEP3[0] + 0.5, T.STEP3[0] + 1.6))
        for r, col in zip(IMAGE_RAYS, RAY_COLS):
            seg = [(S_IMG, _h_at(r, S_IMG))] + [q for q in r if q[0] > S_IMG]
            pts = ray_polyline(seg)
            _poly(buf, cam, pts, OUTLINE, upto=(S_VIEW - S_IMG + 20) * l3, width=4)
            _poly(buf, cam, pts, col, upto=(S_VIEW - S_IMG + 20) * l3, width=2)
    return buf


def _h_at(r, s):
    for (sa, ha), (sb, hb) in zip(r[:-1], r[1:]):
        if sa <= s <= sb:
            return ha + (hb - ha) * (s - sa) / max(sb - sa, 1e-9)
    return r[-1][1]
