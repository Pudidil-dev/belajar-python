"""Three composition directions for the hook frame (huashu-art-motion hard gate).

Same palette, same pixel scale, same moment (t = 1.2 s: blood flowing out,
"BLOOD OUT" callout typed); only the composition changes.

    python3 directions.py [outdir]
"""
import os
import sys

from PIL import Image

import pixfont as F
from pal import *  # noqa: F401,F403
from px import Cam, Canvas, W, H
from ui import callout
from world_arm import (Group, Tube, draw_arm, draw_armrest, draw_bg, draw_clamp,
                       draw_needle, draw_tape, tube_points, vein_v)

T = 1.2


def needles_and_tubes(G, un_a, un_v, art_world, ven_world):
    va = float(vein_v(un_a))
    vv = float(vein_v(un_v))
    art = Tube(tube_points(G, [(un_a + 12, va), (un_a + 30, va - 1), (un_a + 48, va - 4)], art_world),
               8.0, "blood", speed=78.0, specks=0.06, seed=3)
    ven = Tube(tube_points(G, [(un_v + 12, vv), (un_v + 30, vv - 1), (un_v + 48, vv - 4)], ven_world),
               8.0, "blood", speed=78.0, specks=0.03, seed=5)
    return art, ven


def scene(cv, cam, G, art, ven, un_a, un_v, t, ghost=None, label=None):
    draw_bg(cv, cam, t, machine_ghost=ghost)
    draw_armrest(cv, cam, G)
    draw_arm(cv, cam, G)
    ven.draw(cv, cam, t, dim=True)
    art.draw(cv, cam, t)
    draw_needle(cv, cam, G, un_v, "V", t)
    draw_needle(cv, cam, G, un_a, "A", t)
    for un in (un_v, un_a):
        draw_tape(cv, cam, G, un + 26, float(vein_v(un)) - 1, 8, 30, 0.05)
    draw_clamp(cv, cam, ven.path, 70, "V", 8.0)
    draw_clamp(cv, cam, art.path, 70, "A", 8.0)
    if label:
        s, lx, ly, align = label
        ax, ay = cam.pt(*art.path.at(s))
        callout(cv, "BLOOD OUT", 1.5, 9.0, ax, ay, lx, ly, align=align)


def ghost_machine(cv, cam, t):
    """Far, dim silhouette of the machine the lines run into (depth layer)."""
    from px import poly_mask, disc_mask
    from world_arm import rrect_local
    ox, oy = 128, -18

    def rr(u0, v0, u1, v1, r):
        return [(ox + u, oy + v) for (u, v) in rrect_local(u0, v0, u1, v1, r)]
    m, x0, y0 = poly_mask(rr(-78, -120, 78, 150, 10))
    cv.stamp_dither(m, x0, y0, BG3, 0.7)
    m, x0, y0 = poly_mask(rr(-64, -100, 64, 30, 5))
    cv.stamp_dither(m, x0, y0, CY0, 0.45)
    for k in range(4):
        cv.rect(ox - 54, oy - 88 + 26 * k, ox - 54 + 40 + 30 * (k % 2), oy - 87 + 26 * k, CY0)
    m, x0, y0 = disc_mask(ox - 22, oy + 92, 24)
    cv.stamp_dither(m, x0, y0, BG4, 0.6)
    m, x0, y0 = disc_mask(ox - 22, oy + 92, 15)
    cv.stamp_dither(m, x0, y0, BG2, 0.9)
    m, x0, y0 = poly_mask(rr(30, 50, 52, 140, 6))
    cv.stamp_dither(m, x0, y0, BG4, 0.6)


def direction_a(t=T):
    """A - grounded side view: arm horizontal on the armrest, hand and ID band
    on the right, both lines rise straight up out of frame."""
    cv = Canvas()
    G = Group(-40, 330, ang=-0.035, s=0.8)
    cam = Cam(135, 240, 1.0)
    un_a, un_v = 205, 82
    art_w = [(160, 262), (172, 200), (164, 130), (146, 60), (140, -60)]
    ven_w = [(62, 264), (70, 200), (84, 130), (104, 60), (112, -60)]
    art, ven = needles_and_tubes(G, un_a, un_v, art_w, ven_w)
    scene(cv, cam, G, art, ven, un_a, un_v, t, ghost=ghost_machine, label=(150, 176, 150, "left"))
    return cv


def direction_b(t=T):
    """B - diagonal sweep: the arm climbs from bottom-left; the arterial line
    loops up and sweeps across the upper frame toward the machine (top-right)."""
    cv = Canvas()
    G = Group(-50, 384, ang=-0.42, s=1.0)
    cam = Cam(135, 240, 1.0)
    un_a, un_v = 196, 92
    art_w = [(196, 214), (176, 160), (146, 116), (128, 70), (150, 30), (214, 6), (320, -14)]
    ven_w = [(60, 300), (34, 240), (24, 160), (30, 70), (40, -60)]
    art, ven = needles_and_tubes(G, un_a, un_v, art_w, ven_w)
    scene(cv, cam, G, art, ven, un_a, un_v, t, label=(180, 168, 150, "left"))
    return cv


def direction_c(t=T):
    """C - macro access: extreme close-up on the red-winged needle; a fat tube
    rises through the centre with individual cells streaming up inside."""
    cv = Canvas()
    G = Group(-97, 352, ang=-0.04)
    cam = Cam(128, 292, 2.3)
    un_a, un_v = 200, 80
    art_w = [(158, 262), (164, 214), (158, 160), (150, 90), (146, -60)]
    ven_w = [(10, 262), (-6, 200), (-20, 120), (-30, 30), (-40, -80)]
    art, ven = needles_and_tubes(G, un_a, un_v, art_w, ven_w)
    scene(cv, cam, G, art, ven, un_a, un_v, t, label=(110, 24, 120, "left"))
    return cv


def save(cv, path, scale=4):
    Image.fromarray(cv.a, "RGB").resize((W * scale, H * scale), Image.NEAREST).save(path)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "directions"
    os.makedirs(out, exist_ok=True)
    frames = [("A_side", direction_a()), ("B_diagonal", direction_b()), ("C_macro", direction_c())]
    for name, cv in frames:
        save(cv, os.path.join(out, f"direction_{name}.png"))
    # contact sheet: three frames side by side at x2 with captions
    import numpy as np
    import pixfont as PF
    from px import text as ptext
    names = ["A  SIDE VIEW", "B  DIAGONAL SWEEP", "C  MACRO ACCESS"]
    sheet = Canvas(BG0)
    sheet.a = np.zeros((H + 24, W * 3 + 20, 3), np.uint8)
    sheet.a[:] = BG0
    for i, (name, cv) in enumerate(frames):
        sheet.a[18:18 + H, 5 + i * (W + 5):5 + i * (W + 5) + W] = cv.a
    big = Image.fromarray(sheet.a, "RGB")
    lab = Canvas(BG0)
    lab.a = np.zeros((14, W * 3 + 20, 3), np.uint8)
    lab.a[:] = BG0
    import px as PXM
    oldW, oldH = PXM.W, PXM.H
    PXM.W, PXM.H = lab.a.shape[1], lab.a.shape[0]
    for i, nm in enumerate(names):
        ptext(lab, PF.BOLD, nm, 5 + i * (W + 5) + 2, 4, CY2)
    PXM.W, PXM.H = oldW, oldH
    sheet.a[0:14] = lab.a
    Image.fromarray(sheet.a, "RGB").resize((sheet.a.shape[1] * 2, sheet.a.shape[0] * 2),
                                           Image.NEAREST).save(os.path.join(out, "directions_sheet.png"))
    print("ok")
