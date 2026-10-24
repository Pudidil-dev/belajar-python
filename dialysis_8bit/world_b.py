"""World B: dialyzer cutaway. Thousands of hollow fibers; blood flows down
inside them, dialysate flows up around them (counter-current).

Screen = world at zoom 1 (camera centre 135, 240).
"""
import math

import numpy as np

from pal import *  # noqa: F401,F403
from px import BAYER4, H, W, back_out, disc_mask, glow, poly_mask, shaded_mask, hash01
from world_a import rr, fill, disc_w
from world_arm import Tube, draw_bg

HX0, HX1 = 70.0, 200.0        # housing outer x
HY0, HY1 = 46.0, 434.0        # housing outer y (between caps)
CUT0, CUT1 = 96.0, 384.0      # cutaway window (fibers visible)
POT0, POT1 = (78.0, 96.0), (384.0, 402.0)  # potting bands
FRONT_X = [84 + 10 * i for i in range(11)]  # front fiber centres
FIB_W = 6.0
V_BLOOD = 60.0
V_DIAL = 44.0

IN_TUBE = Tube([(135, -60), (135, 0), (135, 26)], 8.0, "blood", speed=62.0, seed=21)
OUT_TUBE = Tube([(135, 456), (135, 500), (135, 560)], 8.0, "blood", speed=62.0, seed=22)
D_OUT = Tube([(204, 104), (230, 96), (262, 70), (290, 40)], 9.0, "dialysate", speed=46.0, seed=23)
D_IN = Tube([(300, 420), (262, 398), (230, 380), (204, 376)], 9.0, "dialysate", speed=46.0, seed=24)

HL_FIBER = 5  # index of the fiber we dive into (x = 134)


def fiber_x(i):
    return FRONT_X[i]


def _cols(cam, x0, x1):
    a, b = int(math.floor(cam.sx(x0))), int(math.ceil(cam.sx(x1)))
    return max(0, a), min(W, b)


def _rows(cam, y0, y1):
    a, b = int(math.floor(cam.sy(y0))), int(math.ceil(cam.sy(y1)))
    return max(0, a), min(H, b)


def draw_interior(cv, cam, t, hl=0.0):
    """Cutaway window: dialysate space, back fibers, front fibers."""
    c0, c1 = _cols(cam, HX0 + 6, HX1 - 6)
    r0, r1 = _rows(cam, CUT0, CUT1)
    if c0 >= c1 or r0 >= r1:
        return
    xs = np.arange(c0, c1) + 0.5
    ys = np.arange(r0, r1) + 0.5
    wx = cam.wx(xs)[None, :]
    wy = cam.wy(ys)[:, None]
    z = cam.z
    img = np.empty((r1 - r0, c1 - c0, 3), np.uint8)
    # dialysate space, darker toward the shell (depth)
    edge = np.abs((wx - 135.0) / 62.0)
    img[:] = DL3
    th = BAYER4[(np.arange(r0, r1) % 4)[:, None], (np.arange(c0, c1) % 4)[None, :]]
    img[np.broadcast_to(edge > 0.70, img.shape[:2]) & (th < 0.5)] = DL2
    img[np.broadcast_to(edge > 0.86, img.shape[:2])] = DL1
    # back layer: thin fibers behind (2 per front gap), dim
    bx = (wx - 81.5) / 5.0
    bl = bx - np.floor(bx)
    back = np.broadcast_to((bl < 0.30), img.shape[:2])
    ph = (wy - V_BLOOD * 0.8 * t - 23.0 * (np.floor(bx) % 5)) / 30.0
    fr = ph - np.floor(ph)
    img[back] = PL2
    img[back & (fr > 0.80)] = R1
    # dialysate streaks rising between fibers
    sx = np.floor(wx / 1.5)
    q = (wy + V_DIAL * t + 97.0 * (sx % 13)) / 18.0
    sq = q - np.floor(q)
    lanes = np.broadcast_to((sx % 2) == 0, img.shape[:2])
    streak = (sq < 0.16) & ~back & lanes
    img[streak] = B3
    img[(sq < 0.05) & ~back & lanes] = B4
    cv.a[r0:r1, c0:c1] = img
    # front fibers: pale walls, red lumen with flowing packets
    for i, fx in enumerate(FRONT_X):
        a0, a1 = _cols(cam, fx - FIB_W / 2, fx + FIB_W / 2)
        if a0 >= a1:
            continue
        cx = np.arange(a0, a1) + 0.5
        wxx = cam.wx(cx)
        lum = np.abs(wxx - fx) < (FIB_W / 2 - max(1.0 / z, 0.9))
        col = np.empty((r1 - r0, a1 - a0, 3), np.uint8)
        col[:] = M3
        ph = (cam.wy(ys)[:, None] - V_BLOOD * t - 41.0 * i) / 22.0
        fr = ph - np.floor(ph)
        lm = np.broadcast_to(lum[None, :], col.shape[:2])
        col[lm] = R2
        col[lm & (fr > 0.60)] = R3
        col[lm & (fr > 0.88)] = R4
        # wall highlight on the left edge
        col[:, 0] = M4
        if hl > 0 and i == HL_FIBER:
            col[:, 0] = CY3
            col[:, -1] = CY2
        cv.a[r0:r1, a0:a1] = col
    if hl > 0:
        fx = FRONT_X[HL_FIBER]
        for yy in np.linspace(CUT0 + 20, CUT1 - 20, 7):
            gx, gy = cam.pt(fx, yy)
            glow(cv, gx, gy, 16 * cam.z, CY1, 0.45 * hl)
        for dx in (-FIB_W / 2 - 2.5, FIB_W / 2 + 1.5):
            a = cam.pt(fx + dx, CUT0 + 4)
            b = cam.pt(fx + dx, CUT1 - 4)
            cv.rect_dither(a[0], a[1], a[0] + max(1, cam.z), b[1], CY2, 0.5 + 0.5 * hl)


def draw_potting(cv, cam, y0, y1, t):
    fill(cv, cam, rr(HX0 + 4, y0, HX1 - 4, y1, 3), T2, T2, T1, T0, k=2)
    if cam.z >= 0.8:
        for i, fx in enumerate(FRONT_X):
            yy = (y0 + y1) / 2
            disc_w(cv, cam, fx, yy, 1.6, R2)


def draw_dialyzer_b(cv, cam, t, hl=0.0):
    # blood in (top) / out (bottom) and dialysate hoses
    IN_TUBE.draw(cv, cam, t)
    OUT_TUBE.draw(cv, cam, t)
    D_OUT.draw(cv, cam, t)
    D_IN.draw(cv, cam, t)
    # back shell (seen through the cut)
    fill(cv, cam, rr(HX0, HY0, HX1, HY1, 22), M1, M2, M0, M0, k=3)
    draw_interior(cv, cam, t, hl)
    draw_potting(cv, cam, *POT0, t)
    draw_potting(cv, cam, *POT1, t)
    # remaining front shell above / below the window + cut rims
    for (ya, yb) in ((HY0 + 18, CUT0 - 14), (CUT1 + 14, HY1 - 18)):
        fill(cv, cam, rr(HX0, ya, HX1, yb, 6), M3, M4, M2, M1, k=3)
    for yy in (CUT0, CUT1):
        a = cam.pt(HX0 + 2, yy)
        b = cam.pt(HX1 - 2, yy)
        cv.line(a[0], a[1], b[0], b[1], M5 if yy == CUT0 else M2, w=max(1, 2 * cam.z))
    # shell side walls (clear plastic edges)
    for xa, xb, col in ((HX0, HX0 + 6, M4), (HX1 - 6, HX1, M2)):
        fill(cv, cam, rr(xa, CUT0, xb, CUT1, 2), col, None, None, M1, k=1)
    # caps + ports
    fill(cv, cam, rr(HX0 - 6, 28, HX1 + 6, 72, 12), CR1, CR2, CR0, R0, k=5)
    fill(cv, cam, rr(124, 10, 146, 32, 5), CR1, CR2, CR0, R0, k=3)
    fill(cv, cam, rr(HX0 - 6, 408, HX1 + 6, 452, 12), CV1, CV2, CV0, CV0, k=5)
    fill(cv, cam, rr(124, 448, 146, 470, 5), CV1, CV2, CV0, CV0, k=3)
    for py in (104, 376):
        fill(cv, cam, rr(196, py - 11, 214, py + 11, 4), M3, M4, M2, M1, k=2)
        fill(cv, cam, rr(208, py - 13, 216, py + 13, 2), B3, B4, B2, B0, k=2)


def arrow(cv, cam, x, y0, y1, w, color, dark, light, t, up=False, level=1.0):
    """Big flow arrow with marching chevrons inside (screen-space sizes)."""
    sx = cam.sx(x)
    a, b = cam.sy(y0), cam.sy(y1)
    if up:
        a, b = b, a
    # shaft + head polygon pointing from a to b (vertical)
    d = 1 if b > a else -1
    head = w * 1.2
    shaft = [(sx - w / 2, a), (sx + w / 2, a), (sx + w / 2, b - d * head), (sx + w, b - d * head),
             (sx, b), (sx - w, b - d * head), (sx - w / 2, b - d * head)]
    m, x0, y0 = poly_mask(shaft)
    if m is None:
        return
    from px import dilate
    cv.stamp(dilate(m), x0 - 1, y0 - 1, dark)
    cv.stamp_dither(m, x0, y0, color, level)
    # chevrons marching in the flow direction
    hh, ww = m.shape
    ys = np.arange(hh) + y0
    ph = ((ys - a) * d / 10.0 - t * 2.4)
    fr = ph - np.floor(ph)
    xs = np.arange(ww) + x0
    off = np.abs(xs - sx)[None, :]
    chev = np.abs((fr[:, None] * 10.0) - (off * 0.6) - 1.0 * d * 0) < 1.3
    chev = chev & m
    cv.stamp(chev, x0, y0, light)


def draw_world(cv, cam, t, hl=0.0, arrows=0.0):
    draw_bg(cv, cam, t, par=0.25)
    draw_dialyzer_b(cv, cam, t, hl)
    if arrows > 0:
        g = back_out(min(1.0, arrows), 1.4)
        arrow(cv, cam, 40, 150, 150 + 180 * g, 10, R3, R0, R4, t, up=False)
        arrow(cv, cam, 232, 330 - 180 * g, 330, 10, B3, B0, B4, t, up=True)
