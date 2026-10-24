"""Timeline: which world, which camera, which transition and which labels at
time t. 54.0 s at 60 fps, 120 BPM (beat = 0.5 s, 27 bars). Mirrors 镜头表.md.

frame(t) -> Canvas;  events() -> list of (time, kind, info) for the audio.
"""
import math

import numpy as np

import pixfont as F
import world_a as A
import world_b as B
import world_f as WF
from pal import *  # noqa: F401,F403
from px import (BAYER_FULL, H, W, Cam, Canvas, clamp, disc_mask, ease_io, ease_out,
                lerp, seg, text, dilate)
from ui import callout, caption

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


OPEN_CAM = (128.0, 292.0, 2.3)
A1_KEYS = [
    (0.00, *OPEN_CAM, None),
    (0.30, *OPEN_CAM, "io"),
    (2.50, 182.0, 168.0, 2.05, "io"),      # track the blood up the line
    (4.30, 182.0, -190.0, 0.355, "tail"),   # fast pull-out reveal, long tail
    (5.55, 182.0, -190.0, 0.355, "io"),     # hold: machine + dialyzer lights up
    (6.14, 160.0, -362.0, 8.0, "in"),       # push-through into the fiber bundle
]
B_KEYS = [
    (6.08, 135.0, 240.0, 2.8, None),
    (7.55, 135.0, 240.0, 0.92, "tail"),     # pull out of the bundle -> cutaway (fast start, long tail)
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


def cam_a1(t):
    c = _keys(t, A1_KEYS)
    return _snap(c)


def _snap(c):
    # integer-pixel panning keeps the pixel grid steady on slow moves
    c.cx = round(c.cx * c.z) / c.z
    c.cy = round(c.cy * c.z) / c.z
    return c


# ------------------------------------------------------------- compositing
def dissolve(a, b, k):
    """Ordered-dither dissolve: Bayer threshold decides which frame wins."""
    out = a.copy()
    m = BAYER_FULL < k
    out[m] = b[m]
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
    out[(d > r - 1.0) & (d <= r)] = BG0
    return out


def flash(cv, k, color=WHITE):
    if k > 0:
        cv.a[BAYER_FULL < k] = color


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


def near(ax, ay, dx, dy, label, font=F.BOLD):
    """Place a callout's text relative to its anchor, kept inside the safe area."""
    w = font.width(label)
    lx = clamp(ax + dx - (w if dx < 0 else 0), 10, W - 12 - w)
    ly = clamp(ay + dy, 44, 380)
    return lx, ly


def tag(cv, label, age, dur, x, y, color, align="left"):
    callout(cv, label, age, dur, None, None, x, y, align=align, color=color)


def world_a(cv, t, cam, **kw):
    A.draw_world(cv, cam, t, **kw)


def world_b(cv, t, cam, hl=0.0, arrows=0.0):
    B.draw_world(cv, cam, t, hl=hl, arrows=arrows)


def world_f(cv, t, cam, **kw):
    WF.draw_world(cv, cam, t, **kw)


def f_kwargs(t):
    """World F layer switches over time."""
    kw = {}
    kw["show_urea1"] = 1.0 - seg(t, 36.8, 37.6)
    kw["show_cc"] = seg(t, 36.8, 37.6)
    kw["water"] = seg(t, 29.9, 30.6) if t < 37.6 else 1.0 - seg(t, 37.0, 37.6)
    kw["uf"] = 30.8 < t < 39.0
    kw["pressure"] = seg(t, 30.2, 30.6) * (1.0 - seg(t, 36.6, 37.0))
    kw["cc_arrows"] = seg(t, 37.5, 38.1) * (1.0 - seg(t, 42.4, 42.7))
    if 24.3 < t < 27.0:
        kw["hl_rbc"] = 0
    if 27.1 < t < 29.8:
        kw["hl_alb"] = WF.ALB_BOUNCES[0][1]
    return kw


# -------------------------------------------------------------- the frame
def frame(t):
    cv = Canvas()
    if t < 6.08:
        _shot_a_open(cv, t)
    elif t < 9.95:
        _shot_b(cv, t)
    elif t < 10.70:
        _lens_b_to_f(cv, t)
    elif t < 43.40:
        _shot_f(cv, t)
    elif t < 49.5:
        _shot_a_return(cv, t)
    elif t < 51.5:
        _montage(cv, t)
    elif t < 53.5:
        _title(cv, t)
    else:
        _final(cv, t)
    return cv


def _shot_a_open(cv, t):
    cam = cam_a1(t)
    dz = seg(t, 4.95, 5.25) if t < 5.55 else 1.0
    world_a(cv, t, cam, dialyzer_glow=dz if t > 4.95 else 0.0, ven_dim=t < 2.6)
    T = A.TUBES
    if t < 2.9:
        tube_chevrons(cv, cam, T["art"], 30, 150, t, R5)
    # labels
    ax, ay = cam.pt(*T["art"].path.at(96))
    lx, ly = near(ax, ay, -22, -46, "BLOOD OUT")
    callout(cv, "BLOOD OUT", t - 0.6, 1.75, ax, ay, lx, ly)
    if t > 3.6:
        mx, my = cam.pt(220, -580)
        callout(cv, "DIALYSIS MACHINE", t - 3.9, 1.45, mx, my, 22, 60)
        caption(cv, "Cleaned outside the body.", t - 4.25, 1.15, y=330)
    if t > 5.98:
        # push-through: the bundle colour floods the frame
        pass


def _shot_b(cv, t):
    cam = _keys(t, B_KEYS)
    hl = seg(t, 9.35, 9.6)
    arrows = seg(t, 7.95, 8.25)
    world_b(cv, t, cam, hl=hl, arrows=arrows)
    if t < 6.16:
        # match-cut from World A's bundle (±3 frames dither)
        a = Canvas()
        world_a(a, t, cam_a1(t))
        k = seg(t, 6.08, 6.15)
        cv.a[:] = dissolve(a.a, cv.a, k)
        return
    # labels
    hx_, hy_ = cam.pt(B.HX0, 150)
    callout(cv, "DIALYZER", t - 6.55, 1.35, hx_, hy_, 14, 46)
    caption(cv, "Thousands of tiny fibers.", t - 6.95, 0.95, y=372)
    if t >= 8.0:
        tag(cv, "BLOOD", t - 8.2, 1.6, 14, 106, R4)
        tag(cv, "DIALYSATE", t - 8.35, 1.45, 258, 106, B4, align="right")
        fx_, fy_ = cam.pt(B.FRONT_X[2], 300)
        callout(cv, "HOLLOW FIBERS", t - 8.5, 1.25, fx_, fy_, 10, 330)


def _lens_b_to_f(cv, t):
    camb = _keys(t, B_KEYS)
    world_b(cv, t, camb, hl=1.0, arrows=1.0 - seg(t, 9.95, 10.2))
    f = Canvas()
    world_f(f, t, WF.cam_f(t), **f_kwargs(t))
    k = WF._ease("io", seg(t, 9.98, 10.66))
    cx, cy = camb.pt(B.FRONT_X[B.HL_FIBER], 240)
    r = 1.0 + k * 330.0
    cv.a[:] = lens(cv.a, f.a, cx, cy, r)


def _shot_f(cv, t):
    cam = WF.cam_f(t)
    world_f(cv, t, cam, **f_kwargs(t))
    _f_labels(cv, t, cam)
    if t > 42.6:
        # leaving the fiber: the pull-out accelerates
        pass


def _f_labels(cv, t, cam):
    # shot 5: the membrane
    if t < 15.0:
        wx_, wy_ = cam.pt(WF.WR[0] + 3.5, 250)
        callout(cv, "SEMIPERMEABLE", t - 11.3, 2.2, wx_, wy_, 12, 58)
        callout(cv, "MEMBRANE", t - 11.5, 2.0, None, None, 12, 70)
        caption(cv, "Blood and dialysate stay apart.", t - 11.9, 1.6, y=372)
    # compartment tags while zoomed on the wall
    if 15.3 < t < 24.0:
        tag(cv, "BLOOD", t - 15.4, 8.2, 12, 92, R4)
        tag(cv, "DIALYSATE", t - 15.5, 8.1, 258, 92, B4, align="right")
    # shot 6: diffusion
    if 15.2 < t < 19.6:
        callout(cv, "DIFFUSION", t - 15.4, 3.8, None, None, 12, 60)
        p = WF.crosser_pos(WF.CROSSERS[0], t)
        if p is not None and t < 17.4:
            ux, uy = cam.pt(*p)
            callout(cv, "UREA", t - 15.75, 1.4, ux, uy, 40, 150)
        caption(cv, "Small wastes move out.", t - 17.4, 1.9, y=372)
    # shot 7: swept away
    if 19.6 < t < 24.0:
        # point at the stream where crossed urea emerges and is carried away
        ux, uy = cam.pt(WF.WR[1] + 9, cam.cy + 8)
        callout(cv, "WASTE MOVES OUT", t - 20.0, 3.4, ux, uy, 128, 150, align="left")
    # shot 8: red cells retained
    if 24.3 < t < 27.0:
        p = WF.rbc_bouncer_pos(0, t)
        if p is not None:
            rx, ry = cam.pt(*p)
            lx, ly = near(rx - 12, ry, -16, -54, "RED BLOOD CELLS")
            callout(cv, "RED BLOOD CELLS", t - 24.6, 2.1, rx - 12, ry, lx, ly)
    # shot 9: proteins retained
    if 27.0 < t < 30.0:
        p = WF.alb_bouncer_pos(0, t)
        if p is not None:
            ax, ay = cam.pt(*p)
            lx, ly = near(ax, ay, -20, -48, "PROTEINS STAY INSIDE")
            callout(cv, "PROTEINS STAY INSIDE", t - 27.2, 2.5, ax, ay, lx, ly)
        caption(cv, "Large blood components are retained.", t - 28.0, 1.8, y=372)
    # shot 10-11: ultrafiltration
    if 30.2 < t < 37.0:
        callout(cv, "ULTRAFILTRATION", t - 30.5, 6.0, None, None, 12, 60)
        caption(cv, "Pressure helps pull water out.", t - 31.6, 1.8, y=372)
        sx_, sy_ = cam.pt(WF.WR[1] + 22, 150)
        callout(cv, "EXTRA WATER REMOVED", t - 33.6, 2.9, sx_, sy_, 120, 112, align="left")
    # shot 12: counter-current
    if 37.6 < t < 42.6:
        callout(cv, "COUNTERCURRENT FLOW", t - 37.8, 4.5, None, None, 12, 40)
        caption(cv, "Opposite flow helps remove more waste.", t - 39.4, 2.9, y=372)


def _shot_a_return(cv, t):
    cam = _snap(_keys(t, A2_KEYS))
    world_a(cv, t, cam)
    T = A.TUBES
    if t < 43.55:
        f = Canvas()
        world_f(f, t, WF.cam_f(t), **f_kwargs(t))
        k = seg(t, 43.40, 43.50)
        cv.a[:] = dissolve(f.a, cv.a, k)
        return
    if t > 46.3:
        L = T["ven"].path.L
        tube_chevrons(cv, cam, T["ven"], L - 150, L - 20, t, R5)
        hx_, hy_ = cam.pt(*T["ven"].path.at(L - 60))
        callout(cv, "CLEAN BLOOD RETURNS", t - 46.7, 2.6, hx_, hy_, 30, 110)


MONTAGE = ["ARM", "PUMP", "DIALYZER", "DIFFUSION"]


def _montage(cv, t):
    i = min(3, int((t - 49.5) / 0.5))
    lt = t - 49.5 - i * 0.5
    if i == 0:
        world_a(cv, t - 49.5 + 1.0, Cam(*OPEN_CAM), ven_dim=True)
    elif i == 1:
        world_a(cv, t, Cam(300.0, -306.0, 1.25))
    elif i == 2:
        world_b(cv, t, Cam(135.0, 240.0, 0.92), arrows=1.0)
    else:
        tau = 16.75 + lt
        world_f(cv, tau, WF.cam_f(tau), **f_kwargs(tau))
    # beat tag, top-left, with a step counter
    tag(cv, f"{i + 1}/4  {MONTAGE[i]}", lt + 0.4, 9.0, 12, 40, CY3)
    flash(cv, 0.3 * (1.0 - lt / 0.04) if lt < 0.04 else 0.0, WHITE)


TITLE = ["HOW DIALYSIS", "MACHINES CLEAN", "YOUR BLOOD"]


def _title(cv, t):
    cam = Cam(*TITLE_CAM)
    world_a(cv, t, cam)
    lt = t - 51.5
    # backing panel
    y0, y1 = 52, 178
    cv.rect_dither(10, y0, W - 10, y1, BG0, 0.75)
    cv.rect(10, y0, W - 10, y0 + 1, CY1)
    cv.rect(10, y1 - 1, W - 10, y1, CY1)
    scale = 3 if lt < 0.05 else 2
    jig = (1 if (int(lt * 60) % 2) else -1) if lt < 0.17 else 0
    for i, line in enumerate(TITLE):
        if lt < 0.04 * i:
            continue
        y = 66 + i * 22 + jig
        text(cv, F.BOLD, line, W / 2 + jig, y, WHITE, outline=BG0, shadow=CY1, scale=scale,
             align="center")
    if lt > 0.42:
        n = int((lt - 0.42) * 30)
        s = "HEMODIALYSIS"[:n]
        tw = F.BOLD.width("HEMODIALYSIS")
        if s:
            text(cv, F.BOLD, s, W / 2 - tw / 2, 152, CY2, outline=BG0)
            cv.rect(W / 2 - tw / 2 - 16, 155, W / 2 - tw / 2 - 6, 156, CY2)
            cv.rect(W / 2 + tw / 2 + 6, 155, W / 2 + tw / 2 + 16, 156, CY2)
    flash(cv, 0.6 * (1.0 - lt / 0.1) if lt < 0.1 else 0.0, WHITE)


def _final(cv, t):
    # last half second: the opening frame, running on the loop clock (t - 54),
    # drawn exactly like frame 0 so the clip loops without a seam
    tau = t - DUR
    cam = _snap(Cam(*OPEN_CAM))
    world_a(cv, tau, cam, ven_dim=True)
    tube_chevrons(cv, cam, A.TUBES["art"], 30, 150, tau, R5)


# ---------------------------------------------------------------- events
def events():
    ev = []
    ev.append((0.0, "hook", None))
    ev.append((0.6, "pop", "BLOOD OUT"))
    ev.append((2.45, "whoosh_out", 1.9))
    ev.append((3.9, "pop", "DIALYSIS MACHINE"))
    ev.append((4.95, "highlight", None))
    ev.append((5.5, "whoosh_in", 0.6))
    ev.append((6.05, "hit", None))
    ev.append((6.55, "pop", "DIALYZER"))
    ev.append((8.0, "arrows", None))
    ev.append((8.5, "pop", "HOLLOW FIBERS"))
    ev.append((9.35, "highlight", None))
    ev.append((9.95, "lens", 0.7))
    ev.append((10.7, "tick_micro", None))
    ev.append((11.3, "pop", "SEMIPERMEABLE MEMBRANE"))
    ev.append((13.6, "push", 1.6))
    ev.append((15.4, "pop", "DIFFUSION"))
    for (tt, kind, info) in WF.audio_events():
        ev.append((tt, kind, info))
    ev.append((20.0, "pop", "WASTE MOVES OUT"))
    ev.append((24.1, "push", 0.9))
    ev.append((24.6, "pop", "RED BLOOD CELLS"))
    ev.append((27.2, "pop", "PROTEINS STAY INSIDE"))
    ev.append((30.2, "pressure", 1.3))
    ev.append((30.5, "pop", "ULTRAFILTRATION"))
    ev.append((30.8, "uf_flow", 6.0))
    ev.append((33.6, "pop", "EXTRA WATER REMOVED"))
    ev.append((37.0, "whoosh_out", 1.6))
    ev.append((37.6, "dual_sweep", 1.4))
    ev.append((37.8, "pop", "COUNTERCURRENT FLOW"))
    ev.append((40.0, "dual_sweep", 1.4))
    ev.append((42.5, "whoosh_out", 1.0))
    ev.append((43.4, "hit", None))
    ev.append((44.2, "flow_tone", 2.4))
    ev.append((46.7, "pop", "CLEAN BLOOD RETURNS"))
    ev.append((46.8, "complete", None))
    for i in range(4):
        ev.append((49.5 + 0.5 * i, "cut", i))
    # the montage's diffusion cut replays scene time 16.75..17.25: echo its crossings
    for k, c in enumerate(WF.CROSSERS):
        if 16.75 <= c["tc"] < 17.25:
            ev.append((51.0 + c["tc"] - 16.75, "urea_cross", k))
    ev.append((51.4, "riser_end", None))
    ev.append((51.5, "title", None))
    ev.append((51.92, "pop", "HEMODIALYSIS"))
    ev.append((53.5, "loop", None))
    return sorted(ev, key=lambda e: e[0])
