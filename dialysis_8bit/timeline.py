"""Timeline: which world, which camera, which transition and which labels at
time t. 54.0 s at 60 fps, 120 BPM (beat = 0.5 s, 27 bars). Mirrors 镜头表.md.

frame(t) -> Canvas (art at 270x480 + .hud overlay ops at full resolution)
events() -> list of (time, kind, info) for the audio.
"""
import math

import numpy as np

import pixfont as F
import world_a as A
import world_b as B
import world_f as WF
from hud import LABEL_FPX, TAG_FPX, TITLE_FPX, Overlay, text_h, text_w
from pal import *  # noqa: F401,F403
from px import (BAYER_FULL, H, W, Cam, Canvas, back_out, clamp, disc_mask, glow, lerp,
                poly_mask, seg)
from ui import SAFE_R, callout, caption, tag

DUR = 54.0
FPS = 60
BEAT = 0.5


# ----------------------------------------------------------------- cameras
def _keys(t, ks):
    if t <= ks[0][0]:
        return Cam(*ks[0][1:4])
    for i in range(1, len(ks)):
        if t <= ks[i][0]:
            t0, x0, y0, z0 = ks[i - 1][:4]
            t1, x1, y1, z1, e = ks[i]
            k = WF._ease(e, (t - t0) / (t1 - t0))
            z = math.exp(lerp(math.log(z0), math.log(z1), k))
            return Cam(lerp(x0, x1, k), lerp(y0, y1, k), z)
    return Cam(*ks[-1][1:4])


# opening: still the macro on the red needle (direction C), framed a little
# wider so the forearm, fistula bulge and wristband read as an arm
OPEN_CAM = (135.0, 292.0, 1.75)
A1_KEYS = [
    (0.00, *OPEN_CAM, None),
    (0.20, *OPEN_CAM, "io"),
    (1.30, 160.0, 214.0, 1.50, "io"),       # short tilt up the line
    (3.40, 182.0, -190.0, 0.355, "tail"),   # fast pull-out reveal, long tail
    (5.55, 182.0, -190.0, 0.355, "io"),     # hold: machine, then the dialyzer lights up
    (6.14, 160.0, -362.0, 8.0, "in"),       # push-through into the fiber bundle
]
B_KEYS = [
    (6.08, 135.0, 240.0, 2.0, None),
    (7.10, 135.0, 240.0, 0.92, "tail"),     # pull out of the bundle -> cutaway
    (9.95, 135.0, 240.0, 0.92, "io"),
    (10.70, B.FRONT_X[B.HL_FIBER], 240.0, 2.2, "in"),
]
A2_KEYS = [
    (43.40, 160.0, -360.0, 5.0, None),
    (44.20, 160.0, -150.0, 2.0, "out"),     # out of the dialyzer at the outlet
    (45.00, 160.0, -40.0, 2.0, "io"),       # drip chamber
    (45.80, 92.0, 150.0, 2.0, "io"),        # follow the return line
    (46.50, 40.0, 300.0, 2.3, "io"),        # venous needle
]
TITLE_CAM = (70.0, 252.0, 1.15)
VEN_CAM = (40.0, 300.0, 2.3)


def cam_a1(t):
    return _snap(_keys(t, A1_KEYS))


def _snap(c):
    # integer-pixel panning keeps the pixel grid steady on slow moves
    c.cx = round(c.cx * c.z) / c.z
    c.cy = round(c.cy * c.z) / c.z
    return c


def cam_f(t):
    c = WF.cam_f(t)
    # a small impact shake when the red cell hits the wall
    for tb in (WF.RBC_BOUNCES[0][0],):
        d = t - tb
        if 0 <= d < 0.3:
            amp = 1.6 * math.exp(-d / 0.07)
            c.cx += amp * math.sin(d * 90.0) / c.z
            c.cy += amp * 0.6 * math.cos(d * 77.0) / c.z
    return c


# ------------------------------------------------------------- compositing
def dissolve(a, b, k):
    """Ordered-dither dissolve: Bayer threshold decides which frame wins."""
    out = a.copy()
    m = BAYER_FULL < k
    out[m] = b[m]
    return out


def wipe(a, b, k):
    """Diagonal pixel sweep (Kurzgesagt 'sweep' transition), no white flash."""
    yy, xx = np.mgrid[0:H, 0:W]
    edge = k * (W + H * 0.5 + 24) - 12
    d = xx + yy * 0.5 - edge
    out = a.copy()
    m = d + BAYER_FULL * 10 < 0
    out[m] = b[m]
    band = (np.abs(d) < 3) & ~m
    out[band] = CY2
    return out


def lens(a, b, cx, cy, r):
    out = a.copy()
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2)
    inside = d <= r
    out[inside] = b[inside]
    ring = (d > r) & (d <= r + 2.0)
    out[ring] = CY2
    out[(d > r + 2.0) & (d <= r + 3.0)] = CY3
    halo = (d > r + 3.0) & (d <= r + 9.0) & (BAYER_FULL < 0.45 * (1 - (d - r - 3.0) / 6.0))
    out[halo] = CY1
    out[(d > r - 1.0) & (d <= r)] = BG0
    return out


# ------------------------------------------------------------------ helpers
def tube_chevrons(cv, cam, tube, s0, s1, t, color, spacing=26.0, size=3.5):
    P = tube.path
    off = (tube.flow(t) * 0.6) % spacing
    s = s0 + off
    while s < s1:
        x, y = P.at(s)
        tx, ty = P.tangent(s)
        nx, ny = -ty, tx
        sx, sy = cam.pt(x, y)
        L = size * cam.z
        for sg in (1, -1):
            ex = sx - tx * L + sg * nx * L
            ey = sy - ty * L + sg * ny * L
            cv.line(sx, sy, ex, ey, color, w=max(1, cam.z * 0.8))
        s += spacing


def tube_pulse(cv, cam, tube, t, s_max=230.0):
    """Peristaltic pulse: each roller pass sends a bulge up the line (on the beat)."""
    ph = (t % BEAT) / BEAT
    s = 18.0 + ph * s_max
    x, y = tube.path.at(s)
    sx, sy = cam.pt(x, y)
    r = tube.width * 0.5 * cam.z * 1.28
    m, x0, y0 = disc_mask(sx, sy, r + 1)
    cv.stamp(m, x0, y0, R0)
    m, x0, y0 = disc_mask(sx, sy, r)
    cv.stamp(m, x0, y0, R3)
    m2, x2, y2 = disc_mask(sx - r * 0.35, sy - r * 0.35, max(1.0, r * 0.35))
    cv.stamp(m2, x2, y2, R4)
    glow(cv, sx, sy, r * 2.2, R4, 0.25 * (1 - ph))


def near(ax, ay, dx, dy, label, fpx=LABEL_FPX, font=F.BOLD):
    """Text position relative to its anchor, kept inside the safe area."""
    w = text_w(font, label, fpx)
    lx = clamp(ax + dx - (w if dx < 0 else 0), 10.0, SAFE_R - w)
    ly = clamp(ay + dy, 44.0, 272.0)
    return lx, ly


def path_arrow(cv, cam, pts, k, t, color=U2, dark=U0):
    """An arrow drawn along a path (progress k), with marching dashes."""
    if k <= 0:
        return
    scr = [cam.pt(*p) for p in pts]
    L = [0.0]
    for i in range(1, len(scr)):
        L.append(L[-1] + math.hypot(scr[i][0] - scr[i - 1][0], scr[i][1] - scr[i - 1][1]))
    total = L[-1] * min(1.0, k)
    pts_v = [scr[0]]
    for i in range(1, len(scr)):
        if L[i] <= total:
            pts_v.append(scr[i])
        else:
            f = (total - L[i - 1]) / max(1e-6, L[i] - L[i - 1])
            pts_v.append((scr[i - 1][0] + (scr[i][0] - scr[i - 1][0]) * f,
                          scr[i - 1][1] + (scr[i][1] - scr[i - 1][1]) * f))
            break
    cv.polyline(pts_v, dark, w=4)
    cv.polyline(pts_v, color, w=2)
    # marching highlight dashes
    off = (t * 40.0) % 10.0
    acc = 0.0
    for i in range(1, len(pts_v)):
        (x0, y0), (x1, y1) = pts_v[i - 1], pts_v[i]
        seg_l = math.hypot(x1 - x0, y1 - y0)
        s = (off - acc) % 10.0
        while s < seg_l:
            f = s / max(seg_l, 1e-6)
            cv.px(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, U3)
            s += 10.0
        acc += seg_l
    # head
    (xa, ya), (xb, yb) = pts_v[-2], pts_v[-1]
    ang = math.atan2(yb - ya, xb - xa)
    hs = 6.0
    head = [(xb + math.cos(ang) * 2, yb + math.sin(ang) * 2),
            (xb - math.cos(ang - 0.6) * hs, yb - math.sin(ang - 0.6) * hs),
            (xb - math.cos(ang + 0.6) * hs, yb - math.sin(ang + 0.6) * hs)]
    m, mx, my = poly_mask(head)
    if m is not None:
        from px import dilate
        cv.stamp(dilate(m), mx - 1, my - 1, dark)
        cv.stamp(m, mx, my, color)


def gauge(cv, x, y, k, t):
    """Pixel pressure gauge: needle swings from low to high, '+' on the blood side."""
    m, x0, y0 = disc_mask(x, y, 13)
    cv.stamp(m, x0, y0, M1)
    m, x0, y0 = disc_mask(x, y, 11.5)
    cv.stamp(m, x0, y0, M4)
    for i in range(7):
        a = math.radians(-210 + i * 40)
        cv.line(x + math.cos(a) * 8.5, y + math.sin(a) * 8.5, x + math.cos(a) * 10.5, y + math.sin(a) * 10.5,
                M1 if i < 5 else CR1)
    a = math.radians(-210 + 220 * k + 4 * math.sin(t * 9.0) * k)
    cv.line(x, y, x + math.cos(a) * 9, y + math.sin(a) * 9, CR1, w=2)
    m, x0, y0 = disc_mask(x, y, 2.2)
    cv.stamp(m, x0, y0, M0)
    # '+' badge
    cv.rect(x + 9, y - 15, x + 17, y - 7, BG0)
    cv.rect(x + 12, y - 14, x + 14, y - 8, CY2)
    cv.rect(x + 10, y - 12, x + 16, y - 10, CY2)


def legend_icon(cv, kind, sx, sy, t):
    if kind == "rbc":
        WF.draw_rbc(cv, _icon_cam(sx, sy, 1.0), 0.0, 0.0, 0.0, 0.0)
    elif kind == "urea":
        WF.draw_urea(cv, _icon_cam(sx, sy, 2.6), 0.0, 0.0)
    else:
        WF.draw_albumin(cv, _icon_cam(sx, sy, 2.4), 0.0, 0.0, t * 0.6)


def _icon_cam(sx, sy, z):
    return Cam((W / 2 - sx) / z, (H / 2 - sy) / z, z)


def world_a(cv, t, cam, **kw):
    A.draw_world(cv, cam, t, **kw)


def world_b(cv, t, cam, **kw):
    B.draw_world(cv, cam, t, **kw)


def world_f(cv, t, cam, **kw):
    WF.draw_world(cv, cam, t, **kw)


def f_kwargs(t):
    """World F layer switches over time."""
    kw = {}
    kw["show_urea1"] = 1.0 - seg(t, 36.8, 37.6)
    kw["show_cc"] = seg(t, 36.8, 37.6)
    kw["water"] = 0.0
    kw["uf"] = 30.8 < t < 40.0
    kw["pressure"] = seg(t, 30.2, 30.6) * (1.0 - seg(t, 36.6, 37.0))
    kw["cc_arrows"] = seg(t, 37.5, 38.0) * (1.0 - seg(t, 42.4, 42.7))
    if 24.3 < t < 27.0:
        kw["hl_rbc"] = 0
    if 27.1 < t < 29.8:
        kw["hl_alb"] = WF.ALB_BOUNCES[0][1]
    return kw


# -------------------------------------------------------------- the frame
def frame(t):
    cv = Canvas()
    cv.hud = Overlay()
    if t < 6.08:
        _shot_a_open(cv, t)
    elif t < 9.95:
        _shot_b(cv, t)
    elif t < 10.70:
        _lens_b_to_f(cv, t)
    elif t < 43.40:
        _shot_f(cv, t)
    elif t < 49.0:
        _shot_a_return(cv, t)
    elif t < 51.0:
        _montage(cv, t)
    elif t < 53.5:
        _title(cv, t)
    else:
        _final(cv, t)
    return cv


def _blood_out(cv, cam, t, pretyped):
    T = A.TUBES
    ax, ay = cam.pt(*T["art"].path.at(96))
    lx, ly = near(ax, ay, -24, -40, "BLOOD OUT")
    callout(cv, "BLOOD OUT", t if not pretyped else 9.0, 2.05 if not pretyped else 99.0, ax, ay, lx, ly,
            pretyped=pretyped)


def _shot_a_open(cv, t):
    cam = cam_a1(t)
    dz = seg(t, 4.95, 5.25) if t < 5.55 else 1.0
    world_a(cv, t, cam, dialyzer_glow=dz if t > 4.95 else 0.0, ven_dim=t < 1.6)
    T = A.TUBES
    if t < 2.2:
        tube_chevrons(cv, cam, T["art"], 30, 150, t, R5)
        tube_pulse(cv, cam, T["art"], t)
    # BLOOD OUT is already on frame 0 (it is also on the loop's last frame)
    if t < 2.4:
        T_ = A.TUBES
        ax, ay = cam.pt(*T_["art"].path.at(96))
        lx, ly = near(ax, ay, -24, -40, "BLOOD OUT")
        callout(cv, "BLOOD OUT", 9.0 + t, 9.0 + 2.05, ax, ay, lx, ly, pretyped=True)
    if t > 3.3:
        mx, my = cam.pt(370, -619)          # the machine's screen
        callout(cv, "DIALYSIS MACHINE", t - 3.5, 1.9, mx, my, 14, 52)
        caption(cv, "Cleaned outside the body.", t - 3.8, 1.75, y=300)


def _shot_b(cv, t):
    cam = _keys(t, B_KEYS)
    hl = seg(t, 9.35, 9.6)
    arrows = seg(t, 8.3, 8.8)
    streak = seg(t, 6.35, 6.9)
    inset_k = seg(t, 6.9, 7.4) * (1.0 - seg(t, 8.5, 8.7))
    world_b(cv, t, cam, hl=hl, arrows=arrows, streak=streak, inset_k=inset_k)
    if t < 6.16:
        # match-cut from World A's bundle (±3 frames dither)
        a = Canvas()
        world_a(a, t, cam_a1(t))
        k = seg(t, 6.08, 6.15)
        cv.a[:] = dissolve(a.a, cv.a, k)
        return
    hx_, hy_ = cam.pt(B.HX0, 150)
    callout(cv, "DIALYZER", t - 6.5, 1.7, hx_, hy_, 12, 46)
    caption(cv, "Thousands of tiny fibers.", t - 6.95, 1.6, y=300)
    if t >= 8.3:
        tag(cv, "BLOOD", t - 8.4, 1.5, 14, 106, R4)
        tag(cv, "DIALYSATE", t - 8.5, 1.4, 236, 106, B4, align="right")
        fx_, fy_ = cam.pt(B.FRONT_X[3], 330)
        callout(cv, "HOLLOW FIBERS", t - 8.7, 1.15, fx_, fy_, 12, 360 - 40)


def _lens_b_to_f(cv, t):
    camb = _keys(t, B_KEYS)
    world_b(cv, t, camb, hl=1.0, arrows=1.0 - seg(t, 9.95, 10.2))
    f = Canvas()
    world_f(f, t, cam_f(t), **f_kwargs(t))
    k = WF._ease("io", seg(t, 9.98, 10.66))
    cx, cy = camb.pt(B.FRONT_X[B.HL_FIBER], 240)
    r = 1.0 + k * 330.0
    cv.a[:] = lens(cv.a, f.a, cx, cy, r)


def _shot_f(cv, t):
    cam = cam_f(t)
    world_f(cv, t, cam, **f_kwargs(t))
    _f_overlays(cv, t, cam)
    _f_labels(cv, t, cam)


def _f_overlays(cv, t, cam):
    # ultrafiltration pressure gauge (top-left, under the label)
    if 30.2 < t < 37.0:
        k = back_out(seg(t, 30.3, 31.3), 1.2) * (1.0 - seg(t, 36.6, 37.0))
        gauge(cv, 26, 92, k, t)
    # waste moves out: an arrow drawn through a pore into the dialysate stream
    if 19.9 < t < 23.9:
        c = WF.CROSSERS[11]
        yp = c["yp"]
        pts = [(150.0, yp - 2.0), (170.0, yp - WF.SLANT / 2), (177.0, yp + WF.SLANT / 2),
               (186.0, yp - 4.0), (192.0, yp - 22.0), (194.0, yp - 40.0)]
        k = seg(t, 20.0, 20.6) * (1.0 - seg(t, 23.4, 23.8))
        path_arrow(cv, cam, pts, k, t)


def _f_labels(cv, t, cam):
    # shot 5: meet the cast, then the membrane (left wall, short leader)
    if 10.8 < t < 14.8:
        for i, (kind, name, t0) in enumerate((("rbc", "RED CELL", 10.9), ("urea", "UREA", 11.3),
                                              ("alb", "PROTEIN", 11.7))):
            age = t - t0
            if age < 0:
                continue
            y = 50 + i * 17
            k = back_out(min(1.0, age / 0.35), 1.6) * (1.0 - seg(t, 14.4, 14.7))
            if k <= 0.02:
                continue
            cv.hud.rect(8, y - 7.5, 8 + 22 + text_w(F.BOLD, name, TAG_FPX) + 4, y + 7.5, BG0)
            legend_icon(cv, kind, 19, y, t)
            tag(cv, name, age, 3.0, 32, y - text_h(F.BOLD, TAG_FPX) / 2, WHITE)
        lwx, lwy = cam.pt((WF.WL[0] + WF.WL[1]) / 2, 296)
        callout(cv, "SEMIPERMEABLE", t - 12.0, 2.2, lwx, lwy, 12, 336 - 52)
        callout(cv, "MEMBRANE", t - 12.15, 2.05, None, None, 12, 336 - 37)
        caption(cv, "Blood and dialysate stay apart.", t - 12.5, 1.8, y=300 + 42)
    # compartment tags while zoomed on the wall
    if 15.6 < t < 24.0:
        tag(cv, "BLOOD", t - 15.8, 8.0, 12, 92, R4)
        tag(cv, "DIALYSATE", t - 15.9, 7.9, 236, 92, B4, align="right")
    # shot 6: diffusion (label rides the first urea across)
    if 15.6 < t < 19.6:
        callout(cv, "DIFFUSION", t - 15.7, 3.7, None, None, 12, 58)
        p = WF.crosser_pos(WF.CROSSERS[0], t)
        if p is not None and t < 17.8:
            ux, uy = cam.pt(*p)
            callout(cv, "UREA", t - 15.9, 1.7, ux, uy, 40, 150)
    # shot 7: swept away (the arrow through the pore carries the label)
    if 20.2 < t < 24.0:
        c = WF.CROSSERS[11]
        ex, ey = cam.pt(194.0, c["yp"] - 40.0)
        callout(cv, "WASTE MOVES OUT", t - 20.3, 3.1, ex, ey, 236, ey - 30, align="right")
    # shot 8: red cells retained
    if 24.3 < t < 27.0:
        p = WF.rbc_bouncer_pos(0, t)
        if p is not None:
            rx, ry = cam.pt(*p)
            lx, ly = near(rx - 12, ry, -16, -56, "RED BLOOD CELLS")
            callout(cv, "RED BLOOD CELLS", t - 24.6, 2.1, rx - 12, ry, lx, ly)
    # shot 9: proteins retained
    if 27.0 < t < 30.0:
        p = WF.alb_bouncer_pos(0, t)
        if p is not None:
            ax, ay = cam.pt(*p)
            lx, ly = near(ax, ay, -20, -50, "PROTEINS STAY INSIDE")
            callout(cv, "PROTEINS STAY INSIDE", t - 27.2, 2.5, ax, ay, lx, ly)
        caption(cv, "Large blood components are retained.", t - 28.0, 1.85, y=300)
    # shots 10-11: ultrafiltration
    if 30.2 < t < 37.0:
        callout(cv, "ULTRAFILTRATION", t - 30.4, 6.0, None, None, 46, 82)
        caption(cv, "Pressure helps pull water out.", t - 31.4, 2.0, y=300)
        jy = int(round((cam.cy + 26) / WF.PS / 3.0)) * 3
        yp = WF.pore_y(jy)
        sx_, sy_ = cam.pt(WF.WR[1] + 14.0, yp - 6.0)
        callout(cv, "EXTRA WATER REMOVED", t - 33.6, 2.9, sx_, sy_, 236, 132, align="right")
    # shot 12: counter-current
    if 37.6 < t < 42.6:
        callout(cv, "COUNTERCURRENT FLOW", t - 37.8, 4.5, None, None, 12, 40)
        caption(cv, "Opposite flow helps remove more waste.", t - 39.4, 2.9, y=300 + 46)


def _shot_a_return(cv, t):
    cam = _snap(_keys(t, A2_KEYS))
    world_a(cv, t, cam)
    T = A.TUBES
    if t < 43.55:
        f = Canvas()
        world_f(f, t, cam_f(t), **f_kwargs(t))
        k = seg(t, 43.40, 43.50)
        cv.a[:] = dissolve(f.a, cv.a, k)
        return
    if t > 46.3:
        L = T["ven"].path.L
        tube_chevrons(cv, cam, T["ven"], L - 150, L - 20, t, R5)
        hx_, hy_ = cam.pt(*T["ven"].path.at(L - 60))
        callout(cv, "CLEAN BLOOD RETURNS", t - 46.6, 2.3, hx_, hy_, 30, 100)
        caption(cv, "Kidney support, not a cure.", t - 47.0, 1.95, y=300 + 40)


MONTAGE = ["DIALYZER", "DIFFUSION", "ULTRAFILTRATION", "CLEAN BLOOD RETURNS"]


def _montage_shot(cv, i, t, lt):
    if i == 0:
        world_b(cv, t, Cam(135.0, 240.0, 0.92), arrows=1.0)
    elif i == 1:
        tau = 16.75 + lt
        world_f(cv, tau, cam_f(tau), **f_kwargs(tau))
    elif i == 2:
        tau = 33.0 + lt
        world_f(cv, tau, cam_f(tau), **f_kwargs(tau))
    else:
        world_a(cv, t, Cam(*VEN_CAM))
        L = A.TUBES["ven"].path.L
        tube_chevrons(cv, Cam(*VEN_CAM), A.TUBES["ven"], L - 150, L - 20, t, R5)


def _montage(cv, t):
    i = min(3, int((t - 49.0) / 0.5))
    lt = t - 49.0 - i * 0.5
    _montage_shot(cv, i, t, lt)
    if i > 0 and lt < 0.07:
        prev = Canvas()
        _montage_shot(prev, i - 1, t, lt + 0.5)
        cv.a[:] = wipe(prev.a, cv.a, lt / 0.07)
    tag(cv, f"{i + 1}/4 {MONTAGE[i]}", lt + 0.4, 9.0, 12, 46, CY3, fpx=LABEL_FPX)


TITLE = ["HOW DIALYSIS", "MACHINES CLEAN", "YOUR BLOOD"]


def _title(cv, t):
    cam = Cam(*TITLE_CAM)
    world_a(cv, t, cam)
    lt = t - 51.0
    if lt < 0.07:
        prev = Canvas()
        _montage_shot(prev, 3, t, 0.5 + lt)
        cv.a[:] = wipe(prev.a, cv.a, lt / 0.07)
    hud = cv.hud
    # slam: a beat of overshoot, then settle (1.55 -> 0.94 -> 1.0, ~0.17 s)
    fpx = TITLE_FPX
    if lt < 0.06:
        fpx = TITLE_FPX + 3
    elif lt < 0.12:
        fpx = TITLE_FPX - 1
    lh = 7 * fpx / 4.0 + 5.0
    y0 = 58.0
    panel_h = lh * 3 + 34.0
    hud.rect(16, y0 - 12, SAFE_R, y0 - 12 + panel_h, BG0)
    hud.rect(16, y0 - 12, SAFE_R, y0 - 11.25, CY1)
    hud.rect(16, y0 - 12 + panel_h - 0.75, SAFE_R, y0 - 12 + panel_h, CY1)
    cx = (16 + SAFE_R) / 2
    for i, line in enumerate(TITLE):
        hud.text(F.BOLD, line, cx, y0 + i * lh, WHITE, fpx, shadow=CY0, align="center")
    sub = "HEMODIALYSIS"
    sw = text_w(F.BOLD, sub, LABEL_FPX)
    sy = y0 + lh * 3 + 4
    hud.text(F.BOLD, sub, cx, sy, CY2, LABEL_FPX, align="center")
    hud.rect(cx - sw / 2 - 16, sy + 4.5, cx - sw / 2 - 5, sy + 5.25, CY2)
    hud.rect(cx + sw / 2 + 5, sy + 4.5, cx + sw / 2 + 16, sy + 5.25, CY2)


def _final(cv, t):
    # last half second: the opening frame on the loop clock (t - 54), drawn
    # exactly like frame 0 (BLOOD OUT included) so the clip loops seamlessly
    tau = t - DUR
    cam = _snap(Cam(*OPEN_CAM))
    world_a(cv, tau, cam, ven_dim=True)
    tube_chevrons(cv, cam, A.TUBES["art"], 30, 150, tau, R5)
    tube_pulse(cv, cam, A.TUBES["art"], tau)
    ax, ay = cam.pt(*A.TUBES["art"].path.at(96))
    lx, ly = near(ax, ay, -24, -40, "BLOOD OUT")
    callout(cv, "BLOOD OUT", 9.0, 99.0, ax, ay, lx, ly, pretyped=True)


# ---------------------------------------------------------------- events
def events():
    ev = []
    ev.append((0.0, "hook", None))
    ev.append((1.3, "whoosh_out", 2.1))
    ev.append((3.5, "pop", "DIALYSIS MACHINE"))
    ev.append((4.95, "highlight", None))
    ev.append((5.5, "whoosh_in", 0.6))
    ev.append((6.08, "hit", None))
    ev.append((6.5, "pop", "DIALYZER"))
    ev.append((6.9, "inset", None))
    ev.append((8.3, "arrows", None))
    ev.append((8.7, "pop", "HOLLOW FIBERS"))
    ev.append((9.35, "highlight", None))
    ev.append((9.95, "lens", 0.7))
    ev.append((10.7, "tick_micro", None))
    for i, tt in enumerate((10.9, 11.3, 11.7)):
        ev.append((tt, "legend", i))
    ev.append((12.0, "pop", "SEMIPERMEABLE MEMBRANE"))
    ev.append((14.3, "push", 1.3))
    ev.append((15.82, "pop", "DIFFUSION"))
    for (tt, kind, info) in WF.audio_events():
        ev.append((tt, kind, info))
    ev.append((20.0, "arrow_draw", 0.6))
    ev.append((20.3, "pop", "WASTE MOVES OUT"))
    ev.append((24.1, "push", 0.9))
    ev.append((24.6, "pop", "RED BLOOD CELLS"))
    ev.append((27.2, "pop", "PROTEINS STAY INSIDE"))
    ev.append((30.0, "push", 1.0))
    ev.append((30.2, "pressure", 1.3))
    ev.append((30.52, "pop", "ULTRAFILTRATION"))
    ev.append((30.8, "uf_flow", 6.0))
    ev.append((33.6, "pop", "EXTRA WATER REMOVED"))
    ev.append((37.0, "whoosh_out", 1.6))
    ev.append((37.6, "dual_sweep", 1.4))
    ev.append((37.92, "pop", "COUNTERCURRENT FLOW"))
    ev.append((40.0, "dual_sweep", 1.4))
    ev.append((42.5, "whoosh_out", 1.0))
    ev.append((43.4, "hit", None))
    ev.append((44.2, "flow_tone", 2.4))
    ev.append((46.6, "pop", "CLEAN BLOOD RETURNS"))
    ev.append((46.7, "complete", None))
    for i in range(4):
        ev.append((49.0 + 0.5 * i, "cut", i))
    # the montage's diffusion cut replays scene time 16.75..17.25: echo its crossings
    for k, c in enumerate(WF.CROSSERS):
        if 16.75 <= c["tc"] < 17.25:
            ev.append((49.5 + c["tc"] - 16.75, "urea_cross", k))
    ev.append((50.0, "uf_flow", 0.5))
    ev.append((50.9, "riser_end", None))
    ev.append((51.0, "title", None))
    ev.append((53.5, "loop", None))
    return sorted(ev, key=lambda e: e[0])
