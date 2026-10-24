"""World A assembled: arm + fistula needles + blood lines + roller pump +
dialyzer + venous chamber + dialysis machine (direction C macro opening).

World units = close-up arm pixels (opening camera zoom 2.3). The machine is
drawn in the same units, so a single camera can travel from the needle to
the whole extracorporeal circuit.
"""
import math

import numpy as np

import pixfont as F
from px import glow as halo
from pal import *  # noqa: F401,F403
from px import (Cam, Path, disc_mask, dilate, line_mask, poly_mask, shaded_mask,
                text, W, H, hash01, clamp)
from world_arm import (Group, Tube, draw_arm, draw_armrest, draw_bg, draw_clamp,
                       draw_needle, draw_tape, rrect_local, vein_v)

G = Group(-97, 352, ang=-0.04)
UN_A, UN_V = 200, 80
MY = -110.0             # the machine stands this much higher than first drafted
PUMP_C = (320.0, -200.0 + MY)
PUMP_R = 62.0           # tube centre radius in the raceway
DIALYZER = (130.0, -420.0, 190.0, -84.0)   # housing x0, y0, x1, y1
DZ_CX = 160.0


def pump_angle(t):
    # one revolution per second -> a roller passes the inlet every beat (0.5 s)
    return 2 * math.pi * t


def _arc(cx, cy, r, a0, a1, n=24):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n))
            for i in range(n + 1)]


def _local_ext(un):
    v = float(vein_v(un))
    return [G.w(un + 12, v), G.w(un + 30, v - 1), G.w(un + 48, v - 4)]


def build_tubes():
    a0 = math.radians(135)
    a1 = math.radians(225)
    art_pts = (_local_ext(UN_A) +
               [(158, 262), (166, 214), (184, 140), (214, 40), (236, -60), (256, -150), (272, -232)] +
               _arc(PUMP_C[0], PUMP_C[1], PUMP_R, a0, a1, 18)[1:] +
               [(262, -300 + MY), (248, -380 + MY), (222, -452 + MY), (186, -478 + MY),
                (164, -474 + MY), (DZ_CX, -458 + MY)])
    art = Tube(art_pts, 8.0, "blood", speed=62.0, specks=0.05, seed=3)
    # venous: dialyzer outlet -> drip chamber (separate short line)
    ven_top = Tube([(DZ_CX, -52 + MY), (DZ_CX, -26 + MY), (DZ_CX, 2 + MY)], 8.0, "blood", speed=62.0,
                   specks=0.0, seed=7)
    hub = list(reversed(_local_ext(UN_V)))
    ven_pts = [(DZ_CX, 96 + MY), (DZ_CX, 134 + MY), (150, 48), (112, 78), (86, 124), (76, 182),
               (74, 240), (64, 292), (46, 324)] + hub
    ven = Tube(ven_pts, 8.0, "blood", speed=62.0, specks=0.0, seed=5)
    # dialysate hoses: in at the bottom port, out at the top port
    d_in = Tube([(224, 60 + MY), (236, -10 + MY), (232, -80 + MY), (214, -108 + MY)], 9.0, "dialysate",
                speed=46.0, seed=11)
    d_out = Tube([(214, -390 + MY), (236, -420 + MY), (240, -480 + MY), (224, -540 + MY)], 9.0, "dialysate",
                 speed=46.0, seed=12)
    return {"art": art, "ven_top": ven_top, "ven": ven, "d_in": d_in, "d_out": d_out}


TUBES = build_tubes()


# ------------------------------------------------------------- shape utils
def rr(x0, y0, x1, y1, r, n=4):
    return rrect_local(x0, y0, x1, y1, r, n)


def fill(cv, cam, pts, base, hi=None, sh=None, outline=None, k=8.0, dither=None):
    m, x0, y0 = poly_mask([cam.pt(*p) for p in pts])
    if m is None:
        return None
    if dither is not None:
        cv.stamp_dither(m, x0, y0, base, dither)
        return m, x0, y0
    shaded_mask(cv, m, x0, y0, base, hi, sh, outline, k=max(1, int(round(k * cam.z))))
    return m, x0, y0


def disc_w(cv, cam, x, y, r, color, outline=None):
    sx, sy = cam.pt(x, y)
    m, x0, y0 = disc_mask(sx, sy, r * cam.z)
    if outline is not None:
        cv.stamp(dilate(m), x0 - 1, y0 - 1, outline)
    cv.stamp(m, x0, y0, color)


def shaded_disc_w(cv, cam, x, y, r, base, hi, sh, outline=None, k=4.0):
    sx, sy = cam.pt(x, y)
    m, x0, y0 = disc_mask(sx, sy, r * cam.z)
    shaded_mask(cv, m, x0, y0, base, hi, sh, outline, k=max(1, int(round(k * cam.z))))


def wline(cv, cam, pts, color, w=1.0):
    cv.polyline([cam.pt(*p) for p in pts], color, w=max(1, w * cam.z) if w > 1 else 1)


# ----------------------------------------------------------------- machine
def draw_machine(cv, cam, t, glow=0.0):
    z = cam.z
    if not cam.visible(200, -720, 540, 240, pad=20):
        return
    # body + side face
    fill(cv, cam, rr(220, -660, 520, 170, 26), M3, M4, M2, M1, k=12)
    fill(cv, cam, rr(486, -646, 516, 160, 14), M2, M3, M1, None, k=6)
    # top handle + status LED
    fill(cv, cam, rr(252, -692, 488, -662, 12), M2, M3, M1, M1, k=5)
    blink = (math.sin(t * 6.0) > -0.2)
    if blink:
        gx, gy = cam.pt(466, -677)
        halo(cv, gx, gy, 16 * cam.z, G1, 0.55)
    disc_w(cv, cam, 466, -677, 6, G1 if blink else M1)
    # screen
    fill(cv, cam, rr(240, -630, 500, -388, 14), M1, M2, M0, M0, k=6)
    fill(cv, cam, rr(252, -618, 488, -400, 8), BG0)
    draw_screen_ui(cv, cam, t)
    # pump module (recessed)
    fill(cv, cam, rr(236, -334, 470, -66, 16), M2, M3, M1, M1, k=6)
    for i, yy in enumerate((-306, -270, -234)):
        on = (int(t * 2) + i) % 3 != 0
        if on:
            gx, gy = cam.pt(446, yy)
            halo(cv, gx, gy, 18 * cam.z, CY2, 0.45)
        disc_w(cv, cam, 446, yy, 8, CY2 if on else CY0, outline=M1)
    # lower panel vents
    if z >= 0.25:
        for k_ in range(6):
            y = -36 + k_ * 12
            wline(cv, cam, [(420, y), (480, y)], M2, 1)
    # concentrate jugs (acid / bicarbonate)
    for x0_, cap in ((250, CY1), (330, AMB)):
        fill(cv, cam, rr(x0_, 10, x0_ + 64, 150, 12), M4, M5, M3, M2, k=6)
        fill(cv, cam, rr(x0_ + 20, -6, x0_ + 44, 12, 4), cap, None, None, M1, k=3)
        if z >= 0.3:
            fill(cv, cam, rr(x0_ + 8, 70, x0_ + 56, 104, 4), M3, None, None, None, k=2)
    # base + wheels
    fill(cv, cam, rr(232, 150, 508, 196, 12), M1, M2, M0, M0, k=5)
    for wx in (270, 470):
        shaded_disc_w(cv, cam, wx, 208, 18, M1, M2, M0, outline=M0, k=4)
        disc_w(cv, cam, wx, 208, 6, M2)
    if glow > 0:
        bracket(cv, cam, (220, -692, 520, 196), glow, CY2)


def draw_screen_ui(cv, cam, t):
    z = cam.z
    # header strip
    fill(cv, cam, rr(262, -608, 478, -588, 4), CY0)
    # scrolling pressure waveform
    pts = []
    for i in range(48):
        x = 266 + i * 4.4
        ph = (x * 0.05 - t * 5.0)
        y = -548 + 14 * math.sin(ph) * (0.6 + 0.4 * math.sin(ph * 0.5 + 1.0))
        pts.append((x, y))
    wline(cv, cam, pts, CY2, 1)
    # three readout tiles
    vals = ("QB 300", "UF 2.1", "TMP 140")
    for i in range(3):
        x0_ = 264 + i * 74
        fill(cv, cam, rr(x0_, -510, x0_ + 66, -470, 4), CY0)
        if z >= 0.9:
            sx, sy = cam.pt(x0_ + 6, -500)
            text(cv, F.TINY, vals[i], sx, sy, CY3, outline=None)
        else:
            fill(cv, cam, rr(x0_ + 8, -496, x0_ + 40 + 8 * i, -486, 2), CY2)
    # blood-flow bar animating
    fill(cv, cam, rr(264, -454, 476, -436, 4), M0)
    k = 0.55 + 0.1 * math.sin(t * 4.0)
    fill(cv, cam, rr(266, -452, 266 + 208 * k, -438, 3), R3)
    if z >= 0.9:
        sx, sy = cam.pt(266, -428)
        text(cv, F.TINY, "BLOOD FLOW", sx, sy, M3, outline=None)


def draw_pump(cv, cam, t, art):
    """Roller pump: housing ring, raceway, the pump segment, rotor + rollers."""
    cx, cy = PUMP_C[0], PUMP_C[1] - MY
    shaded_disc_w(cv, cam, cx, cy, 80, M2, M3, M1, outline=M1, k=4)
    disc_w(cv, cam, cx, cy, 71, M0)
    return cx, cy


def draw_pump_rotor(cv, cam, t):
    cx, cy = PUMP_C[0], PUMP_C[1] - MY
    ang = pump_angle(t)
    # rotor arm
    for sgn in (1, -1):
        ex = cx + sgn * 46 * math.cos(ang)
        ey = cy + sgn * 46 * math.sin(ang)
        a = cam.pt(cx, cy)
        b = cam.pt(ex, ey)
        cv.line(a[0], a[1], b[0], b[1], M1, w=max(1, 14 * cam.z))
        cv.line(a[0], a[1], b[0], b[1], M3, w=max(1, 9 * cam.z))
    for sgn in (1, -1):
        ex = cx + sgn * 47 * math.cos(ang)
        ey = cy + sgn * 47 * math.sin(ang)
        shaded_disc_w(cv, cam, ex, ey, 13, M4, M5, M2, outline=M1, k=3)
        disc_w(cv, cam, ex, ey, 4, M2)
    shaded_disc_w(cv, cam, cx, cy, 15, M3, M5, M2, outline=M1, k=3)
    disc_w(cv, cam, cx, cy, 5, M1)


# ----------------------------------------------------------------- dialyzer
def draw_dialyzer(cv, cam, t, glow=0.0):
    x0_, y0_, x1_, y1_ = DIALYZER
    z = cam.z
    if not cam.visible(110, -470, 230, -40, pad=10):
        return
    if glow > 0:
        for yy in np.linspace(-430, -70, 9):
            gx, gy = cam.pt(DZ_CX, yy)
            halo(cv, gx, gy, 70 * cam.z, CY1, 0.42 * glow)
    # holder arm + clamp ring
    fill(cv, cam, rr(184, -270, 226, -240, 6), M1, M2, M0, M0, k=3)
    # housing: clear shell with the red fiber bundle inside
    fill(cv, cam, rr(x0_, y0_, x1_, y1_, 20), M2, None, None, M1, k=3)
    bundle(cv, cam, t, x0_ + 5, y0_ + 6, x1_ - 5, y1_ - 6)
    # clear-plastic reflections
    fill(cv, cam, rr(x0_ + 6, y0_ + 16, x0_ + 12, y1_ - 16, 3), M5, dither=0.55)
    fill(cv, cam, rr(x1_ - 9, y0_ + 16, x1_ - 5, y1_ - 16, 2), M1, dither=0.5)
    fill(cv, cam, rr(124, -266, 196, -244, 6), M1, M2, M0, M0, k=3)
    # caps: arterial (red, top) and venous (blue, bottom)
    fill(cv, cam, rr(124, -444, 196, -404, 10), CR1, CR2, CR0, R0, k=4)
    fill(cv, cam, rr(151, -462, 169, -440, 4), CR1, CR2, CR0, R0, k=2)
    fill(cv, cam, rr(124, -100, 196, -60, 10), VN1, VN2, VN0, R0, k=4)
    fill(cv, cam, rr(151, -64, 169, -44, 4), VN1, VN2, VN0, R0, k=2)
    # dialysate side ports (Hansen connectors)
    for py in (-390, -110):
        fill(cv, cam, rr(186, py - 10, 216, py + 10, 4), M3, M4, M2, M1, k=3)
        fill(cv, cam, rr(206, py - 12, 214, py + 12, 2), B3, B4, B2, B0, k=2)
    if glow > 0:
        bracket(cv, cam, (118, -470, 222, -40), glow, CY2)


def bundle(cv, cam, t, x0_, y0_, x1_, y1_):
    """Fiber bundle seen through the shell: vertical red stripes, flowing down."""
    a = cam.pt(x0_, y0_)
    b = cam.pt(x1_, y1_)
    X0, Y0 = int(round(a[0])), int(round(a[1]))
    X1, Y1 = int(round(b[0])), int(round(b[1]))
    cx0, cy0, cx1, cy1 = max(0, X0), max(0, Y0), min(W, X1), min(H, Y1)
    if cx0 >= cx1 or cy0 >= cy1:
        return
    xs = np.arange(cx0, cx1) + 0.5
    ys = np.arange(cy0, cy1) + 0.5
    wx = cam.wx(xs)
    wy = cam.wy(ys)
    stripe = np.floor((wx - x0_) / 5.0).astype(int)
    lane = (wx - x0_) / 5.0 - stripe
    fiber = lane < 0.62
    # downward flow shimmer per stripe
    ph = (wy[:, None] - 70.0 * t - 37.0 * (stripe[None, :] % 7)) / 46.0
    fr = ph - np.floor(ph)
    img = np.empty((len(ys), len(xs), 3), np.uint8)
    img[:] = R1
    img[np.broadcast_to(fiber[None, :], img.shape[:2])] = R2
    hot = fiber[None, :] & (fr > 0.80)
    img[hot] = R3
    # cylindrical darkening toward the shell edges
    edge = np.abs((wx - (x0_ + x1_) / 2) / ((x1_ - x0_) / 2))
    img[:, edge > 0.86] = R0
    cv.a[cy0:cy1, cx0:cx1] = img


def bracket(cv, cam, box, k, color):
    """Pulsing corner brackets around a component (it 'lights up')."""
    x0_, y0_, x1_, y1_ = box
    a = cam.pt(x0_, y0_)
    b = cam.pt(x1_, y1_)
    pad = 3 + 2 * (1 - k)
    X0, Y0, X1, Y1 = a[0] - pad, a[1] - pad, b[0] + pad, b[1] + pad
    L = max(5, min(14, (X1 - X0) * 0.25))
    for (px_, py_, dx, dy) in ((X0, Y0, 1, 1), (X1, Y0, -1, 1), (X0, Y1, 1, -1), (X1, Y1, -1, -1)):
        cv.line(px_, py_, px_ + dx * L, py_, color, w=2)
        cv.line(px_, py_, px_, py_ + dy * L, color, w=2)


def draw_chamber(cv, cam, t):
    """Venous drip chamber (air trap) + air detector clamp under the dialyzer."""
    if not cam.visible(130, -10, 190, 140, pad=10):
        return
    fill(cv, cam, rr(146, 2, 174, 96, 10), M3, M4, M2, M1, k=3)
    level = 34 + 2 * math.sin(t * 4.0)
    fill(cv, cam, rr(150, level, 170, 92, 7), R2, R3, R1, None, k=2)
    # drip falling from the inlet
    ph = (t * 2.0) % 1.0
    disc_w(cv, cam, DZ_CX, 10 + ph * (level - 10), 2.5, R3)
    fill(cv, cam, rr(140, 100, 180, 132, 6), M1, M2, M0, M0, k=3)
    if math.sin(t * 5) > 0:
        gx, gy = cam.pt(172, 116)
        halo(cv, gx, gy, 10 * cam.z, G1, 0.5)
    disc_w(cv, cam, 172, 116, 3, G1 if math.sin(t * 5) > 0 else M2)


# ------------------------------------------------------------- full world
def draw_world(cv, cam, t, *, labels=None, machine_glow=0.0, dialyzer_glow=0.0,
               ven_dim=False, art_dim=False):
    T = TUBES
    draw_bg(cv, cam, t)
    cm = Cam(cam.cx, cam.cy - MY, cam.z)      # machine parts were drafted MY lower
    draw_machine(cv, cm, t, glow=machine_glow)
    T["d_in"].draw(cv, cam, t)
    T["d_out"].draw(cv, cam, t)
    draw_dialyzer(cv, cm, t, glow=dialyzer_glow)
    draw_chamber(cv, cm, t)
    draw_pump(cv, cm, t, T["art"])
    draw_armrest(cv, cam, G)
    draw_arm(cv, cam, G)
    T["ven"].draw(cv, cam, t, dim=ven_dim)
    T["ven_top"].draw(cv, cam, t, dim=ven_dim)
    T["art"].draw(cv, cam, t, dim=art_dim)
    draw_pump_rotor(cv, cm, t)
    draw_needle(cv, cam, G, UN_V, "V", t)
    draw_needle(cv, cam, G, UN_A, "A", t)
    for un in (UN_V, UN_A):
        draw_tape(cv, cam, G, un + 26, float(vein_v(un)) - 1, 8, 30, 0.05)
    draw_clamp(cv, cam, T["art"].path, 70, "A", 8.0)
    draw_clamp(cv, cam, T["ven"].path, T["ven"].path.L - 70, "V", 8.0)
