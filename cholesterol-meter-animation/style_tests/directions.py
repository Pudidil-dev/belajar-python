"""Style test: three directions for the cholesterol-meter film, two moments each (the hook: a pricked fingertip with a
drop of blood; the zoom: inside the test strip), plus a side-by-side sheet.

    python style_tests/directions.py            # -> style_tests/out/*.png and style_tests/out/_sheet.png
"""
import math
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine.canvas import (Canvas, W, H, hexc, mix, smoothstep, cov, sd_circle, sd_ellipse, sd_box, sd_segment,
                           sd_taper, sd_poly, sd_polyline, smin, inflate, normals, lit, solid, blur, soft_shadow,
                           full_mask, grain, halftone, text, LIGHT)

OUT = ROOT / 'style_tests' / 'out'


def sphere_n(r, cx, cy, R):
    nx = (r.X - cx) / R
    ny = (r.Y - cy) / R
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    n = np.stack(np.broadcast_arrays(nx, ny, nz), -1).astype(np.float32)
    return n


# ================================================================ A: soft 3D, glossy macro
SKIN = hexc('#F2B08E')
SKIN_SH = hexc('#B5523F')
SKIN_RIM = hexc('#FF9C7E')
BLOOD = hexc('#8E0A18')
BLOOD_HI = hexc('#E8323F')
TEAL = hexc('#26A69A')
IVORY = hexc('#F6F2EA')


def blood_drop(cv, cx, cy, R, seat=None):
    """A glossy bead of blood: deep red, light passing through its lower side, a window highlight, a dark rim."""
    r = cv.reg(cx - R - 30, cy - R - 30, cx + R + 30, cy + R + 40)
    if seat is not None:                                   # its shadow on the skin below
        sh = cov(sd_ellipse(r.X, r.Y, cx + 10, cy + 18, R * 1.02, R * 0.98), 14.0) * seat
        cv.multiply(r, sh, (0.62, 0.45, 0.42))
    foot = sd_ellipse(r.X, r.Y, cx + 2, cy + 0.42 * R, 1.06 * R, 0.5 * R)
    cv.paint(r, cov(foot, 6.0) * 0.55, hexc('#8A1A22'))
    d = sd_circle(r.X, r.Y, cx, cy, R)
    n = sphere_n(r, cx, cy, R)
    col = lit(BLOOD, n, amb=0.55, spec=0.0)
    glow = smoothstep(0.15, 0.95, n[..., 0] * 0.45 + n[..., 1] * 0.8)
    col = mix(col, BLOOD_HI, (glow * 0.9)[..., None])
    edge = (1 - n[..., 2]) ** 2.5
    col = mix(col, hexc('#4A020A'), (edge * 0.85)[..., None])
    cv.paint(r, cov(d, 1.2), col)
    # the window highlight and a small second reflection
    hi = sd_box(r.X, r.Y, cx - 0.36 * R, cy - 0.44 * R, 0.24 * R, 0.13 * R, 0.1 * R, ang=-32)
    cv.paint(r, cov(hi, 1.5) * 0.95, (1, 1, 1))
    hi2 = sd_circle(r.X, r.Y, cx - 0.62 * R, cy - 0.08 * R, 0.07 * R)
    cv.paint(r, cov(hi2, 1.5) * 0.85, (1, 1, 1))
    hi3 = sd_ellipse(r.X, r.Y, cx + 0.34 * R, cy + 0.58 * R, 0.2 * R, 0.07 * R, ang=-28)
    cv.paint(r, cov(hi3, 3.0) * 0.45, hexc('#FF8A8A'))


def a1():
    cv = Canvas()
    r = cv.full()
    t = smoothstep(0.0, 1.0, r.Y / H)
    cv.px[:] = mix(hexc('#FFF7EF'), hexc('#F1BFA4'), t[..., None])
    g = 1 - smoothstep(0, 760, np.hypot(r.X - 600, r.Y - 760))
    cv.paint(r, g * 0.7, hexc('#FFFDF9'))
    for x, y, rr, a in ((170, 360, 120, 0.35), (900, 980, 150, 0.25), (130, 1300, 90, 0.3), (960, 1560, 110, 0.3),
                        (310, 160, 60, 0.4), (820, 120, 70, 0.3)):
        b = cv.reg(x - rr - 60, y - rr - 60, x + rr + 60, y + rr + 60)
        cv.paint(b, cov(sd_circle(b.X, b.Y, x, y, rr), 40.0) * a, (1, 1, 1))
    # the finger: a tapered capsule with a fuller pad, its shadow on the backdrop, the nail's edge peeking over the
    # top, a fingerprint, the joint crease, and a blush around the prick
    fx0, fy0, fx1, fy1 = 455.0, 2250.0, 592.0, 935.0
    d = sd_taper(r.X, r.Y, fx1, fy1, fx0, fy0, 258.0, 228.0)
    d = smin(d, sd_ellipse(r.X, r.Y, 588, 1010, 244, 300), 60.0)
    soft_shadow(cv, cov(d, 2.0), 46, 34, 70, 0.32, hexc('#B86E57'))
    n = normals(inflate(d, 250.0))
    col = lit(SKIN, n, amb=0.56, spec=0.14, shine=14, rim=SKIN_RIM, rim_k=0.5, shadow=SKIN_SH)
    pcx, pcy = 600.0, 1095.0
    a = np.arctan2(r.Y - pcy, r.X - pcx)
    rr = np.hypot((r.X - pcx) * 1.0, (r.Y - pcy) * 0.8) + 9 * np.sin(a * 2 + 0.6) + 5 * np.sin(a * 5)
    ridge = 0.5 + 0.5 * np.cos(2 * math.pi * rr / 16.0)
    fade = (1 - smoothstep(120, 290, rr)) * smoothstep(-260, -90, d)
    col = col * (1 - (smoothstep(0.72, 0.95, ridge) * fade * 0.11))[..., None]
    blush = (1 - smoothstep(60, 230, np.hypot(r.X - 604, (r.Y - 790) * 1.2))) * 0.35
    col = mix(col, hexc('#E2756A') * (0.55 + 0.45 * np.clip(n @ LIGHT, 0, 1))[..., None], blush[..., None])
    for k, (yc, amp) in enumerate(((1478.0, 26.0), (1508.0, 30.0))):          # the joint crease
        xx = r.X - 560.0
        crease = np.abs(r.Y - (yc - amp * (1 - (xx / 230.0) ** 2))) - (2.2 if k == 0 else 2.8)
        w_ = smoothstep(-235, -150, d) * (1 - smoothstep(120, 200, np.abs(xx)))
        col = col * (1 - (cov(crease, 2.0) * w_ * 0.2))[..., None]
    hl = np.abs(r.Y - (1492.0 - 28.0 * (1 - ((r.X - 560.0) / 230.0) ** 2))) - 5
    col = mix(col, hexc('#FFD3BC'), (cov(hl, 3.0) * smoothstep(-235, -140, d) * 0.25)[..., None])
    cv.paint(r, cov(d, 1.2), col)
    # the lancet pen pulling away, top right
    lx0, ly0, lx1, ly1, lr = 1180.0, 30.0, 792.0, 560.0, 64.0
    lr_ = cv.reg(700, -100, 1080, 700)
    dl = sd_segment(lr_.X, lr_.Y, lx0, ly0, lx1, ly1, lr)
    soft_shadow(cv, full_mask(cv, lr_, cov(dl, 2.0)), 40, 46, 50, 0.25, hexc('#B86E57'))
    nl = normals(inflate(dl, lr))
    ux, uy = (lx0 - lx1), (ly0 - ly1)
    L = math.hypot(ux, uy)
    along = ((lr_.X - lx1) * ux + (lr_.Y - ly1) * uy) / L
    body = np.where((along > 150) & (along < 210), 1.0, 0.0)
    tip = np.where(along < 70, 1.0, 0.0)
    base = np.where(body[..., None] > 0, TEAL, IVORY)
    base = np.where(tip[..., None] > 0, hexc('#DDEFEA'), base)
    col = lit(base, nl, amb=0.55, spec=0.45, shine=40, rim=hexc('#FFFFFF'), rim_k=0.15)
    cv.paint(lr_, cov(dl, 1.2), col)
    hole = sd_ellipse(lr_.X, lr_.Y, lx1 + 16, ly1 - 22, 22, 12, ang=-54)
    cv.paint(lr_, cov(hole, 1.2), hexc('#2E3B3A'))
    nd = sd_segment(lr_.X, lr_.Y, lx1 + 12, ly1 - 16, lx1 - 18, ly1 + 24, 2.2)
    cv.paint(lr_, cov(nd, 1.0), hexc('#C9D2D2'))
    for k, (ox, oy) in enumerate(((-70, -40), (-40, -75), (-95, 0))):     # "click" lines
        sg = sd_segment(lr_.X, lr_.Y, lx1 + ox, ly1 + oy, lx1 + ox * 1.45, ly1 + oy * 1.45, 4.5)
        cv.paint(lr_, cov(sg, 1.2) * 0.9, (1, 1, 1))
    # the drop of blood on the pad
    blood_drop(cv, 604.0, 752.0, 92.0, seat=1.0)
    return cv


def blob_d(X, Y, cx, cy, s, ang, pocket=True):
    """An enzyme: a rounded, cup-like body with a pocket (its active site) on top, where the molecule sits."""
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    u = (X - cx) * ca + (Y - cy) * sa
    v = -(X - cx) * sa + (Y - cy) * ca
    d = sd_ellipse(u, v, 0.0, 0.12 * s, 0.95 * s, 0.62 * s)
    d = smin(d, sd_circle(u, v, -0.62 * s, 0.32 * s, 0.38 * s), 0.25 * s)
    d = smin(d, sd_circle(u, v, 0.58 * s, 0.4 * s, 0.34 * s), 0.25 * s)
    if pocket:
        d = np.maximum(d, -sd_circle(u, v, 0.0, -0.52 * s, 0.4 * s))
    return d


def label(cv, x, y, num, word, dark=hexc('#3A2A22'), fill=(1, 1, 1), accent=hexc('#E8323F'), size=38):
    """A small rounded tag: a number in a circle, then a word."""
    tw = int(size * 0.62 * len(word)) + 70
    r = cv.reg(x - 10, y - 40, x + tw + 30, y + 40)
    cv.paint(r, cov(sd_box(r.X, r.Y, x + tw / 2 + 12, y, tw / 2 + 16, 32, 32)) * 0.92, fill)
    cv.paint(r, cov(sd_circle(r.X, r.Y, x + 24, y, 24)), accent)
    text(cv, str(num), x + 24, y + 1, 30, (1, 1, 1), weight='Bold')
    text(cv, word, x + 58, y + 2, size, dark, weight='Bold', anchor='lm')


def a2():
    cv = Canvas()
    r = cv.full()
    t = smoothstep(0.0, 1.0, r.Y / H)
    cv.px[:] = mix(hexc('#FFF4D6'), hexc('#F5CF86'), t[..., None])
    rng = np.random.default_rng(7)
    for _ in range(26):                                     # out-of-focus specks in the plasma
        x, y, rr_ = rng.uniform(0, W), rng.uniform(450, 1500), rng.uniform(8, 34)
        b = cv.reg(x - rr_ - 30, y - rr_ - 30, x + rr_ + 30, y + rr_ + 30)
        cv.paint(b, cov(sd_circle(b.X, b.Y, x, y, rr_), 14.0) * 0.35, hexc('#FFF8E6'))
    # 1. the filter: glossy fibres, red cells caught among them
    fib = [(-60, 120, 1140, 330, 15), (-40, 420, 1120, 150, 13), (200, -20, 520, 560, 12), (700, -30, 900, 560, 14),
           (-30, 300, 1120, 470, 12)]
    for x0, y0, x1, y1, rr_ in fib:
        b = cv.reg(min(x0, x1) - 30, min(y0, y1) - 30, max(x0, x1) + 30, max(y0, y1) + 30)
        solid(cv, b, sd_segment(b.X, b.Y, x0, y0, x1, y1, rr_), hexc('#F7F3EC'), R=rr_, amb=0.6, spec=0.5, shine=30)
    for (x, y, ang) in ((180, 250, 20), (420, 330, -15), (640, 210, 35), (870, 330, 5), (300, 450, -30),
                        (760, 440, 15), (520, 120, 0)):
        b = cv.reg(x - 90, y - 90, x + 90, y + 90)
        d = sd_ellipse(b.X, b.Y, x, y, 70, 46, ang)
        n = solid(cv, b, d, hexc('#C8172B'), R=26, amb=0.5, spec=0.45, shine=30, rim=hexc('#FF6B6B'), rim_k=0.3)
        dim = sd_ellipse(b.X, b.Y, x + 6, y + 6, 34, 20, ang)
        cv.multiply(b, cov(dim, 10.0) * 0.45, (0.55, 0.35, 0.38))
    for k in range(5):                                      # plasma getting through
        x, y = 150 + k * 190, 600 + 30 * math.sin(k * 1.3)
        b = cv.reg(x - 30, y - 50, x + 30, y + 50)
        d = smin(sd_circle(b.X, b.Y, x, y + 8, 18), sd_taper(b.X, b.Y, x, y - 30, x, y + 4, 4, 15), 8)
        solid(cv, b, d, hexc('#F9D97A'), R=14, amb=0.6, spec=0.7, shine=40)
    # 2. cut: an ester (cholesterol + its fatty-acid tail) in the first enzyme; the tail snipped off
    def chol(x, y, R=46):
        b = cv.reg(x - R - 6, y - R - 6, x + R + 6, y + R + 6)
        n = sphere_n(b, x, y, R)
        cv.paint(b, cov(sd_circle(b.X, b.Y, x, y, R)), lit(hexc('#F28C28'), n, amb=0.5, spec=0.6, shine=40,
                                                            rim=hexc('#FFD07A'), rim_k=0.4))
    def tail(x, y, k0=0, n_=5, dx=26, col='#F6E27A'):
        for k in range(n_):
            px_, py_ = x + k * dx, y + 12 * math.sin(k * 1.4 + k0)
            b = cv.reg(px_ - 16, py_ - 16, px_ + 16, py_ + 16)
            nn = sphere_n(b, px_, py_, 13)
            cv.paint(b, cov(sd_circle(b.X, b.Y, px_, py_, 13)), lit(hexc(col), nn, amb=0.55, spec=0.5, shine=30))
    b = cv.reg(80, 680, 520, 1040)
    solid(cv, b, blob_d(b.X, b.Y, 300, 860, 150, -10), hexc('#5CC9B0'), R=60, amb=0.5, spec=0.35, shine=24,
          rim=hexc('#C9FFF0'), rim_k=0.35)
    chol(290, 742)
    tail(370, 700, 0.0, 5, 30)
    b = cv.reg(330, 680, 380, 760)
    for k in range(6):                                      # the snip
        a = k * math.pi / 3
        cv.paint(b, cov(sd_segment(b.X, b.Y, 352 + 8 * math.cos(a), 712 + 8 * math.sin(a),
                                   352 + 22 * math.cos(a), 712 + 22 * math.sin(a), 3)), (1, 1, 1))
    # 3. change: cholesterol in the second enzyme, hydrogen peroxide bubbling out
    b = cv.reg(470, 960, 980, 1330)
    solid(cv, b, blob_d(b.X, b.Y, 720, 1150, 155, 15), hexc('#F27A6B'), R=60, amb=0.5, spec=0.35, shine=24,
          rim=hexc('#FFD2C8'), rim_k=0.35)
    chol(705, 1030)
    for (x, y, rr_) in ((860, 1000, 22), (900, 930, 15), (950, 1060, 12), (830, 900, 10), (980, 980, 9)):
        bb = cv.reg(x - rr_ - 4, y - rr_ - 4, x + rr_ + 4, y + rr_ + 4)
        dd = sd_circle(bb.X, bb.Y, x, y, rr_)
        cv.paint(bb, cov(np.abs(dd) - 2.0) * 0.9, (1, 1, 1))
        cv.paint(bb, cov(dd) * 0.25, (1, 1, 1))
        cv.paint(bb, cov(sd_circle(bb.X, bb.Y, x - rr_ * 0.4, y - rr_ * 0.4, rr_ * 0.25)), (1, 1, 1))
    # 4. colour: the third enzyme turns the dye from pale to deep pink
    b = cv.reg(60, 1240, 520, 1600)
    solid(cv, b, blob_d(b.X, b.Y, 260, 1420, 140, -25), hexc('#F4C542'), R=56, amb=0.5, spec=0.35, shine=24,
          rim=hexc('#FFF0B8'), rim_k=0.35)
    for k, (x, y) in enumerate(((440, 1330), (520, 1400), (600, 1460), (680, 1520), (760, 1570))):
        tt = k / 4.0
        bb = cv.reg(x - 34, y - 34, x + 34, y + 34)
        nn = sphere_n(bb, x, y, 28)
        base = mix(hexc('#EDE7E3'), hexc('#E0287A'), tt)
        cv.paint(bb, cov(sd_circle(bb.X, bb.Y, x, y, 28)), lit(base, nn, amb=0.55, spec=0.6, shine=40))
    # the pad at the bottom, deep pink where the dye builds up, and the meter's light reading it
    pad = smoothstep(1560, 1760, r.Y + 30 * np.sin(r.X / 90.0))
    cv.paint(r, pad * 0.88, mix(hexc('#F06AA0'), hexc('#C2185B'), smoothstep(1640, 1920, r.Y)[..., None]))
    beam = (1 - smoothstep(0, 1, np.abs(r.X - 860) / (40 + (1920 - r.Y) * 0.25))) * smoothstep(1500, 1650, r.Y)
    cv.paint(r, beam * 0.45, (1, 1, 1))
    b = cv.reg(780, 1840, 940, 1920)
    solid(cv, b, sd_box(b.X, b.Y, 860, 1900, 60, 34, 16), hexc('#3D4A4A'), R=20, amb=0.6, spec=0.4)
    cv.paint(b, cov(sd_circle(b.X, b.Y, 860, 1880, 14)), (1, 1, 1))
    label(cv, 60, 70, 1, 'SARING')
    label(cv, 60, 640 + 20, 2, 'POTONG')
    label(cv, 640, 1340, 3, 'UBAH')
    label(cv, 60, 1630, 4, 'WARNA')
    return cv


# ================================================================ B: flat illustration with grain
CREAM = hexc('#FFF3E0')
CORAL = hexc('#F7A98F')
CORAL_DK = hexc('#E9876C')
MINT = hexc('#A9DCC7')
TEAL_B = hexc('#2A9D8F')
TEAL_DK = hexc('#1E6F66')
INK = hexc('#21403C')
SKIN_B = hexc('#F5BC9A')
SKIN_B2 = hexc('#E8987A')
RED_B = hexc('#D62839')
RED_B2 = hexc('#A11828')
MUSTARD = hexc('#F2B544')


def star4(cv, x, y, s, color, a=1.0):
    r = cv.reg(x - s, y - s, x + s, y + s)
    ax, ay = np.abs(r.X - x), np.abs(r.Y - y)
    d = np.sqrt(ax) + np.sqrt(ay) - math.sqrt(s * 0.62)
    cv.paint(r, cov(d * 6.0, 1.0) * a, color)


def plus(cv, x, y, s, t, color):
    r = cv.reg(x - s, y - s, x + s, y + s)
    d = np.minimum(sd_box(r.X, r.Y, x, y, s, t, t), sd_box(r.X, r.Y, x, y, t, s, t))
    cv.paint(r, cov(d, 1.0), color)


def b1():
    cv = Canvas(color=CREAM)
    r = cv.full()
    # backdrop: a big coral disc behind the fingertip (with grain), a mint disc, a mustard dot, small marks
    d = sd_circle(r.X, r.Y, 560, 1010, 400)
    cv.paint(r, cov(d), CORAL)
    dens = 0.04 + 0.5 * smoothstep(-250, 420, (r.X - 560) * 0.55 + (r.Y - 1010) * 0.85)
    grain(cv, r, cov(d), dens, CORAL_DK, size=3, seed=1)
    for (x, y, rr_, c) in ((880, 1530, 140, MINT), (170, 760, 60, MUSTARD), (210, 1640, 38, CORAL)):
        cv.paint(r, cov(sd_circle(r.X, r.Y, x, y, rr_)), c)
    grain(cv, r, cov(sd_circle(r.X, r.Y, 880, 1530, 140)), 0.25, hexc('#86C9AE'), size=3, seed=2)
    for (x, y) in ((900, 700), (150, 1300), (960, 1840), (120, 480)):
        plus(cv, x, y, 18, 5, INK)
    for (x, y, rr_) in ((820, 420, 14), (330, 1820, 10), (990, 1240, 9)):
        cv.paint(r, cov(np.abs(sd_circle(r.X, r.Y, x, y, rr_)) - 3.0), INK)
    # the hand from the top, palm down, pointing down: sleeve, fist, tucked thumb, index finger
    def hand_d(dx=0.0, dy=0.0):
        X, Y = r.X - dx, r.Y - dy
        dd = sd_box(X, Y, 560, 470, 175, 165, 70)                                   # the fist
        dd = smin(dd, sd_taper(X, Y, 590, 600, 575, 985, 70, 62), 40)              # index finger
        dd = smin(dd, sd_taper(X, Y, 405, 420, 440, 700, 58, 48), 26)              # the thumb, tucked
        return dd
    sl = sd_box(r.X, r.Y, 560, 150, 200, 190, 36)
    cv.paint(r, cov(hand_d(18, 18)), hexc('#EFD3B6'))
    cv.paint(r, cov(sl), TEAL_B)
    cv.paint(r, cov(sd_box(r.X, r.Y, 560, 318, 196, 22, 10)), TEAL_DK)
    grain(cv, r, cov(sl), 0.12, hexc('#5FC0B3'), size=3, seed=4)
    dh = hand_d()
    dh = np.maximum(dh, -(sd_box(r.X, r.Y, 560, 150, 210, 185, 30)))
    cv.paint(r, cov(dh), SKIN_B)
    shade = np.maximum(dh, -(hand_d(-30, 0)))                                     # the right side a tone darker
    cv.paint(r, cov(shade), SKIN_B2)
    grain(cv, r, cov(shade), 0.18, hexc('#D97E60'), size=3, seed=3)
    for k, y in enumerate((440, 520, 600)):                                       # curled fingers' knuckles
        kd = sd_segment(r.X, r.Y, 640, y, 728, y - 8, 4.0)
        cv.paint(r, cov(kd), SKIN_B2)
    thumb_line = sd_segment(r.X, r.Y, 462, 470, 470, 660, 3.5)
    cv.paint(r, cov(thumb_line) * 0.8, SKIN_B2)
    nail = sd_box(r.X, r.Y, 616, 905, 13, 42, 12)
    cv.paint(r, cov(nail), hexc('#F9D6C6'))
    for y in (780, 800):                                                          # finger crease
        cv.paint(r, cov(sd_segment(r.X, r.Y, 532, y, 600, y + 4, 3.0)) * 0.7, SKIN_B2)
    # the drop hanging from the fingertip: a neck, a round belly, flat shading, a highlight, sparkles
    tx, ty = 572.0, 1030.0
    dd = smin(sd_circle(r.X, r.Y, tx, ty + 70, 62), sd_taper(r.X, r.Y, tx, ty - 30, tx, ty + 50, 30, 46), 30)
    dd = np.maximum(dd, -(hand_d() + 2))
    cv.paint(r, cov(dd), RED_B)
    cres = np.maximum(dd, -sd_circle(r.X, r.Y, tx - 18, ty + 52, 66))
    cv.paint(r, cov(cres), RED_B2)
    cv.paint(r, cov(sd_ellipse(r.X, r.Y, tx - 24, ty + 48, 13, 21, ang=20)), (1, 1, 1))
    cv.paint(r, cov(sd_circle(r.X, r.Y, tx - 32, ty + 92, 5)), (1, 1, 1))
    for (x, y, s_) in ((690, 1010, 30), (455, 1070, 18), (680, 1170, 16)):
        star4(cv, x, y, s_, (1, 1, 1))
    # the lancet, lower right, pulling away from the fingertip
    lx0, ly0, lx1, ly1 = 1080.0, 1500.0, 760.0, 1150.0
    cv.paint(r, cov(sd_segment(r.X, r.Y, lx0 + 14, ly0 + 18, lx1 + 14, ly1 + 18, 50)), hexc('#EFD3B6'))
    dl = sd_segment(r.X, r.Y, lx0, ly0, lx1, ly1, 50)
    cv.paint(r, cov(dl), hexc('#FBF6EE'))
    side = np.maximum(dl, -sd_segment(r.X, r.Y, lx0 - 22, ly0 + 18, lx1 - 22, ly1 + 18, 50))
    cv.paint(r, cov(side), hexc('#E6DCCD'))
    ux, uy = lx0 - lx1, ly0 - ly1
    L = math.hypot(ux, uy)
    along = ((r.X - lx1) * ux + (r.Y - ly1) * uy) / L
    cv.paint(r, cov(dl) * ((along > 170) & (along < 230)), TEAL_B)
    cv.paint(r, cov(dl) * (along < 60), MINT)
    for k, (ox, oy) in enumerate(((-75, 10), (-55, -45), (-15, -80))):
        cv.paint(r, cov(sd_segment(r.X, r.Y, lx1 + ox, ly1 + oy, lx1 + ox * 1.55, ly1 + oy * 1.55, 5.0)), INK)
    return cv


def blob_flat(cv, r, cx, cy, s, ang, color, dark):
    d = blob_d(r.X, r.Y, cx, cy, s, ang)
    cv.paint(r, cov(d), color)
    sh = np.maximum(d, -blob_d(r.X - 14, r.Y - 14, cx, cy, s, ang))
    cv.paint(r, cov(sh), dark)
    grain(cv, r, cov(sh), 0.2, dark * 0.85, size=3, seed=int(cx))


def arrow(cv, r, pts, color, t=6.0):
    cv.paint(r, cov(sd_polyline(r.X, r.Y, pts, t)), color)
    (x0, y0), (x1, y1) = pts[-2], pts[-1]
    a = math.atan2(y1 - y0, x1 - x0)
    tip = [(x1 + 16 * math.cos(a), y1 + 16 * math.sin(a)),
           (x1 + 22 * math.cos(a + 2.4), y1 + 22 * math.sin(a + 2.4)),
           (x1 + 22 * math.cos(a - 2.4), y1 + 22 * math.sin(a - 2.4))]
    cv.paint(r, cov(sd_poly(r.X, r.Y, tip)), color)


def b2():
    cv = Canvas(color=CREAM)
    r = cv.full()
    cv.paint(r, cov(sd_circle(r.X, r.Y, 540, 820, 500)), MINT)
    grain(cv, r, cov(sd_circle(r.X, r.Y, 540, 820, 500)), 0.05 + 0.3 * smoothstep(0, 900, r.Y - 400), hexc('#86C9AE'),
          size=3, seed=11)
    for (x, y) in ((110, 200), (960, 260), (980, 1500), (90, 1460)):
        plus(cv, x, y, 18, 5, INK)
    # the meter at the bottom, the strip sticking up out of it with its pink pad
    md = sd_box(r.X, r.Y, 540, 1720, 250, 280, 90)
    cv.paint(r, cov(sd_box(r.X, r.Y, 556, 1736, 250, 280, 90)), hexc('#E7D3BC'))
    cv.paint(r, cov(md), TEAL_B)
    cv.paint(r, cov(np.maximum(md, -sd_box(r.X, r.Y, 520, 1700, 250, 280, 90))), TEAL_DK)
    grain(cv, r, cov(md), 0.08, hexc('#5FC0B3'), size=3, seed=12)
    cv.paint(r, cov(sd_box(r.X, r.Y, 540, 1690, 170, 110, 30)), INK)
    text(cv, '- - -', 540, 1690, 70, MINT, weight='Bold')
    sd_ = sd_box(r.X, r.Y, 540, 1330, 46, 150, 8)
    cv.paint(r, cov(sd_), (1, 1, 1))
    cv.paint(r, cov(sd_box(r.X, r.Y, 540, 1230, 38, 40, 6)), hexc('#EC6A9C'))
    # the magnifier over the pad
    lx, ly, lr = 540.0, 760.0, 410.0
    cv.paint(r, cov(sd_segment(r.X, r.Y, 830, 1060, 1000, 1290, 40)), TEAL_DK)
    cv.paint(r, cov(sd_segment(r.X, r.Y, 860, 1100, 1000, 1290, 40)), TEAL_B)
    lens = sd_circle(r.X, r.Y, lx, ly, lr)
    cv.paint(r, cov(lens), hexc('#FFEDB8'))
    grain(cv, r, cov(lens), 0.06, hexc('#F3D48A'), size=3, seed=13)
    inside = cov(lens + 4)
    # 1. the mesh holding back the red cells
    for (x0, y0, x1, y1) in ((150, 470, 930, 560), (170, 600, 920, 430), (330, 360, 470, 700), (650, 360, 760, 700)):
        cv.paint(r, cov(sd_segment(r.X, r.Y, x0, y0, x1, y1, 7)) * inside, (1, 1, 1))
    for (x, y) in ((300, 480), (470, 540), (640, 470), (800, 540), (560, 410)):
        dd = sd_ellipse(r.X, r.Y, x, y, 44, 30)
        cv.paint(r, cov(dd) * inside, RED_B)
        cv.paint(r, cov(sd_ellipse(r.X, r.Y, x + 4, y + 3, 20, 12)) * inside, RED_B2)
    # 2-4. the chain: cut, change, colour
    def chol_f(x, y, R=30):
        cv.paint(r, cov(sd_circle(r.X, r.Y, x, y, R)) * inside, hexc('#F28C28'))
        cv.paint(r, cov(np.maximum(sd_circle(r.X, r.Y, x, y, R), -sd_circle(r.X, r.Y, x - 8, y - 8, R))) * inside,
                 hexc('#D16A12'))
    blob_flat(cv, r, 300, 790, 95, -5, hexc('#5CC9B0'), hexc('#3FA58E'))
    chol_f(300, 712)
    tail = [(340 + 18 * k, 694 + 10 * math.sin(k * 1.5)) for k in range(6)]
    cv.paint(r, cov(sd_polyline(r.X, r.Y, tail, 6)) * inside, hexc('#E3B83A'))
    star4(cv, 338, 706, 22, (1, 1, 1))
    blob_flat(cv, r, 620, 860, 95, 10, hexc('#F27A6B'), hexc('#D85A4C'))
    chol_f(612, 780)
    for (x, y, rr_) in ((720, 760, 16), (750, 710, 11), (690, 700, 8), (770, 790, 8)):
        dd = sd_circle(r.X, r.Y, x, y, rr_)
        cv.paint(r, cov(np.abs(dd) - 2.5) * inside, TEAL_DK)
    blob_flat(cv, r, 470, 1040, 90, 0, MUSTARD, hexc('#D99A22'))
    for k in range(4):
        x, y = 600 + k * 52, 1010 + k * 14
        cv.paint(r, cov(sd_circle(r.X, r.Y, x, y, 18)) * inside, mix(hexc('#EAE3DE'), hexc('#E0287A'), k / 3.0))
    arrow(cv, r, [(250, 620), (240, 660), (262, 690)], INK)
    arrow(cv, r, [(420, 760), (480, 760), (530, 800)], INK)
    arrow(cv, r, [(600, 940), (580, 980), (548, 1000)], INK)
    cv.paint(r, cov(np.abs(lens) - 13), TEAL_DK)
    cv.paint(r, cov(np.abs(sd_circle(r.X, r.Y, lx, ly, lr - 30)) - 3) * 0.5, (1, 1, 1))
    for (x, y, n_) in ((140, 330, 1), (130, 620, 2), (770, 920, 3), (330, 1110, 4)):
        cv.paint(r, cov(sd_circle(r.X, r.Y, x, y, 30)), INK)
        text(cv, str(n_), x, y + 1, 36, CREAM, weight='Bold')
    return cv


# ================================================================ C: pop-art comic
YEL = hexc('#FFD60A')
YEL_HI = hexc('#FFE55C')
RED_C = hexc('#E5001E')
RED_C2 = hexc('#A8001A')
BLACK = hexc('#141414')
SKIN_C = hexc('#FFC8A6')
DOT_C = hexc('#F08A6C')
CYAN = hexc('#00B4D8')


def outlined(cv, r, d, color, t=11.0):
    cv.paint(r, cov(d - t), BLACK)
    cv.paint(r, cov(d), color)


def burst(cv, r, cx, cy, r0, r1, n, rot=0.0):
    pts = []
    for k in range(2 * n):
        a = rot + k * math.pi / n
        rr_ = r1 if k % 2 == 0 else r0
        rr_ *= 1.0 + 0.12 * math.sin(k * 2.7)
        pts.append((cx + rr_ * math.cos(a), cy + rr_ * math.sin(a)))
    return sd_poly(r.X, r.Y, pts)


def c1():
    cv = Canvas(color=(1, 1, 1))
    r = cv.full()
    m = 26
    panel = sd_box(r.X, r.Y, W / 2, H / 2, W / 2 - m, H / 2 - m, 0)
    cx, cy = 660.0, 850.0
    a = np.arctan2(r.Y - cy, r.X - cx)
    rays = (np.floor((a + math.pi) / (2 * math.pi) * 36) % 2) == 0
    bg = np.where(rays[..., None], YEL, YEL_HI)
    cv.paint(r, cov(panel), bg)
    tone = np.clip(1 - np.hypot(r.X - cx, r.Y - cy) / 1100.0, 0, 1)
    tone = 0.42 * smoothstep(0.35, 0.95, 1 - tone)
    halftone(cv, r, tone * cov(panel), hexc('#FF6B35'), spacing=22.0)
    # the finger, diagonal from the bottom left
    fx0, fy0, fx1, fy1, fr = -40.0, 2080.0, 640.0, 1000.0, 172.0
    d = sd_taper(r.X, r.Y, fx1, fy1, fx0, fy0, fr, fr * 1.08)
    outlined(cv, r, d, SKIN_C)
    ux, uy = fx1 - fx0, fy1 - fy0
    L = math.hypot(ux, uy)
    side = ((r.X - fx0) * (-uy) + (r.Y - fy0) * ux) / L                   # + = upper left side
    shade = cov(d) * smoothstep(-20, -120, side)
    halftone(cv, r, shade * 0.5, DOT_C, spacing=16.0, ang=20)
    hl = sd_segment(r.X, r.Y, fx0 + ux * 0.35 - uy / L * -110, fy0 + uy * 0.35 + ux / L * -110,
                    fx0 + ux * 0.82 - uy / L * -110, fy0 + uy * 0.82 + ux / L * -110, 13)
    cv.paint(r, cov(hl) * cov(d), (1, 1, 1))
    for k, off in enumerate((0.58, 0.62)):                               # the joint crease
        px, py = fx0 + ux * off, fy0 + uy * off
        nx_, ny_ = -uy / L, ux / L
        cr = sd_segment(r.X, r.Y, px - nx_ * 120, py - ny_ * 120, px + nx_ * 110, py + ny_ * 110, 5)
        cv.paint(r, cov(cr) * cov(d + 18), BLACK)
    # the drop
    dx, dy, R = 640.0, 850.0, 96.0
    dd = sd_circle(r.X, r.Y, dx, dy, R)
    outlined(cv, r, dd, RED_C, 10.0)
    cv.paint(r, cov(np.maximum(dd, -sd_circle(r.X, r.Y, dx - 22, dy - 20, R))), RED_C2)
    cv.paint(r, cov(sd_ellipse(r.X, r.Y, dx - 34, dy - 40, 30, 16, ang=-40)), (1, 1, 1))
    cv.paint(r, cov(sd_circle(r.X, r.Y, dx - 66, dy - 2, 9)), (1, 1, 1))
    # the lancet, top right, with speed lines; a KLIK! burst above it
    lx0, ly0, lx1, ly1 = 1130.0, 300.0, 830.0, 690.0
    for k in range(4):
        o = (k - 1.5) * 40
        sg = sd_segment(r.X, r.Y, 1020 + o * 0.78, 330 - o * 0.6 - 150, 980 + o * 0.78, 330 - o * 0.6 - 60, 5)
        cv.paint(r, cov(sg) * cov(panel), BLACK)
    bd = burst(cv, r, 590, 330, 110, 205, 11, rot=0.2)
    outlined(cv, r, bd, (1, 1, 1), 10.0)
    dl = sd_segment(r.X, r.Y, lx0, ly0, lx1, ly1, 58)
    outlined(cv, r, dl, (1, 1, 1), 11.0)
    ux, uy = lx0 - lx1, ly0 - ly1
    L = math.hypot(ux, uy)
    along = ((r.X - lx1) * ux + (r.Y - ly1) * uy) / L
    cv.paint(r, cov(dl) * ((along > 160) & (along < 240)), CYAN)
    cv.paint(r, cov(np.abs(along - 160) - 4) * cov(dl), BLACK)
    cv.paint(r, cov(np.abs(along - 240) - 4) * cov(dl), BLACK)
    side = ((r.X - lx1) * (-uy) + (r.Y - ly1) * ux) / L
    halftone(cv, r, cov(dl) * smoothstep(10, 45, -side) * 0.45, hexc('#9FB7BD'), spacing=14.0)
    cv.paint(r, cov(sd_segment(r.X, r.Y, lx1 - 14, ly1 + 14, lx1 - 44, ly1 + 52, 4)), BLACK)
    for k, (ox, oy) in enumerate(((-110, -20), (-95, -70), (-60, -110))):
        cv.paint(r, cov(sd_segment(r.X, r.Y, lx1 + ox, ly1 + oy, lx1 + ox * 1.5, ly1 + oy * 1.5, 6)), BLACK)
    text(cv, 'KLIK!', 590, 318, 150, RED_C, weight='Black', italic=True, stroke=12, stroke_color=BLACK, rot=10)
    cv.paint(r, cov(np.abs(panel) - 5), BLACK)                              # the panel border
    return cv


def c2():
    cv = Canvas(color=(1, 1, 1))
    r = cv.full()
    m, gut = 26.0, 22.0
    ph = (H - 2 * m - 3 * gut) / 4
    panels = []
    for k in range(4):
        y0 = m + k * (ph + gut)
        panels.append((m, y0, W - m, y0 + ph))
    bgs = (hexc('#4CC9F0'), hexc('#FF8FAB'), YEL, hexc('#FF9F1C'))
    dots = (hexc('#A5E8FA'), hexc('#FFC2D1'), YEL_HI, hexc('#FFC872'))
    caps = ('1. SARING', '2. POTONG', '3. UBAH', '4. WARNA')
    sfx = (None, 'KRES!', 'BLUP!', 'BYAR!')
    for k, (x0, y0, x1, y1) in enumerate(panels):
        pd = sd_box(r.X, r.Y, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, 0)
        inside = cov(pd + 3)
        cv.paint(r, cov(pd), bgs[k])
        halftone(cv, r, inside * 0.3, dots[k], spacing=20.0)
        cy = (y0 + y1) / 2
        if k == 0:                                            # a mesh, red cells held back, plasma through
            for (ax, ay, bx, by) in ((60, cy - 90, 1020, cy - 30), (60, cy + 10, 1020, cy - 110), (300, y0, 380, cy + 60),
                                     (700, y0, 760, cy + 60)):
                cv.paint(r, cov(sd_segment(r.X, r.Y, ax, ay, bx, by, 9)) * inside, BLACK)
                cv.paint(r, cov(sd_segment(r.X, r.Y, ax, ay, bx, by, 4)) * inside, (1, 1, 1))
            for (x, y) in ((200, cy - 60), (480, cy - 110), (600, cy - 40), (880, cy - 80)):
                dd = sd_ellipse(r.X, r.Y, x, y, 62, 40)
                outlined(cv, r, dd, RED_C, 7)
                cv.paint(r, cov(sd_ellipse(r.X, r.Y, x + 4, y + 4, 26, 14)), RED_C2)
            for x in (260, 540, 820):
                dd = smin(sd_circle(r.X, r.Y, x, cy + 120, 24), sd_taper(r.X, r.Y, x, cy + 70, x, cy + 112, 5, 20), 10)
                outlined(cv, r, dd, hexc('#FFE066'), 6)
        if k == 1:                                            # the first enzyme snips the tail off
            outlined(cv, r, blob_d(r.X, r.Y, 430, cy + 60, 140, 0), hexc('#2EC4B6'), 9)
            outlined(cv, r, sd_circle(r.X, r.Y, 430, cy - 40, 52), hexc('#FF9F1C'), 8)
            tail = [(500 + 34 * j, cy - 70 + 16 * math.sin(j * 1.4)) for j in range(6)]
            cv.paint(r, cov(sd_polyline(r.X, r.Y, tail, 14)), BLACK)
            cv.paint(r, cov(sd_polyline(r.X, r.Y, tail, 8)), hexc('#FFE066'))
            bd = burst(cv, r, 488, cy - 64, 22, 56, 8)
            outlined(cv, r, bd, (1, 1, 1), 6)
        if k == 2:                                            # the second enzyme: hydrogen peroxide bubbles
            outlined(cv, r, blob_d(r.X, r.Y, 400, cy + 60, 140, 0), hexc('#FF6B6B'), 9)
            outlined(cv, r, sd_circle(r.X, r.Y, 400, cy - 40, 52), hexc('#FF9F1C'), 8)
            for (x, y, rr_) in ((560, cy - 70, 30), (620, cy - 130, 22), (520, cy - 150, 16), (650, cy - 40, 14)):
                dd = sd_circle(r.X, r.Y, x, y, rr_)
                cv.paint(r, cov(np.abs(dd) - 4), BLACK)
                cv.paint(r, cov(sd_circle(r.X, r.Y, x - rr_ * 0.35, y - rr_ * 0.35, rr_ * 0.25)), (1, 1, 1))
        if k == 3:                                            # the third enzyme: the dye turns deep pink
            outlined(cv, r, blob_d(r.X, r.Y, 300, cy + 70, 130, 0), hexc('#FFD60A'), 9)
            for j in range(5):
                x = 470 + j * 100
                outlined(cv, r, sd_circle(r.X, r.Y, x, cy + 40 - j * 20, 34), mix(hexc('#FFFFFF'), hexc('#E0287A'), j / 4.0), 7)
            a_ = np.arctan2(r.Y - (cy - 60), r.X - 870)
            rays = (np.floor((a_ + math.pi) / (2 * math.pi) * 24) % 2 == 0) & (np.hypot(r.X - 870, r.Y - cy + 60) > 60)
            cv.paint(r, rays * inside * (np.hypot(r.X - 870, r.Y - cy + 60) < 150) * 0.85, (1, 1, 1))
        cv.paint(r, cov(np.abs(pd) - 5), BLACK)
        cb = sd_box(r.X, r.Y, x0 + 140, y0 + 42, 120, 30, 0)
        cv.paint(r, cov(cb - 4), BLACK)
        cv.paint(r, cov(cb), hexc('#FFF3B0'))
        text(cv, caps[k], x0 + 140, y0 + 43, 34, BLACK, weight='Black')
        if sfx[k]:
            text(cv, sfx[k], x1 - 200, y0 + 110, 100, (1, 1, 1), weight='Black', italic=True, stroke=10,
                 stroke_color=BLACK, rot=8)
    return cv


def sheet(names, path):
    ims = [Image.open(OUT / f'{n}.png').resize((540, 960), Image.LANCZOS) for n in names]
    cols = 3
    rows = (len(ims) + cols - 1) // cols
    pad, lab = 24, 70
    sh = Image.new('RGB', (cols * 540 + (cols + 1) * pad, rows * (960 + lab) + pad), (34, 34, 34))
    d = ImageDraw.Draw(sh)
    f = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf', 34)
    titles = {'a': 'A  3D lembut, mengilap', 'b': 'B  Ilustrasi flat + grain', 'c': 'C  Komik pop-art'}
    for k, (n, im) in enumerate(zip(names, ims)):
        x = pad + (k % cols) * (540 + pad)
        y = pad + (k // cols) * (960 + lab)
        if k < cols:
            d.text((x, y + 8), titles[n[0]], font=f, fill=(255, 255, 255))
        sh.paste(im, (x, y + lab - 10 if k < cols else y + lab - 10))
    sh.save(path)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    which = sys.argv[1:] or ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
    for name in which:
        globals()[name]().save(OUT / f'{name}.png')
        print('wrote', OUT / f'{name}.png')
    if len(which) == 6:
        sheet(['a1', 'b1', 'c1', 'a2', 'b2', 'c2'], OUT / '_sheet.png')
        print('wrote', OUT / '_sheet.png')
