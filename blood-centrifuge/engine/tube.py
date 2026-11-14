"""The blood tube, drawn per pixel from its own local coordinates ("pixel shader").

Because every canvas pixel is classified from the tube's local geometry, the same tube can be drawn crisp at any
scale or angle: big for the hook and the reveal, 10 px wide when it drops into the rotor slot. A lithium-heparin tube
(teal cap, a real plasma tube) with a barcode label, glass highlights and the blood in one of three states:
sep = 0 whole blood, 0..1 separating, 1 = gold plasma / thin pale buffy coat / dark packed red cells.
"""
import math
import numpy as np
from . import gfx
from .palette import TL, GL, BL, PK, PL, WC, MW, OUTLINE

# local geometry (1 local unit = 1 canvas pixel at scale 1)
CAP_R, CAP_H = 24.0, 36.0          # cap radius and height
R_OUT, WALL = 21.0, 2.6            # glass outer radius and wall
TLEN = 250.0                       # cap top to the bottom tip
LIQ, MEN = 88.0, 2.6               # liquid surface at the wall, meniscus depth
LABEL = (43.0, 80.0)               # paper label band (above the blood, so the blood stays in view)
ANCHOR = TLEN / 2                  # (cx, cy) of draw() is this local point on the axis
BC = TLEN - R_OUT                  # centre of the round bottom
PLASMA_END = 172.0                 # plasma / buffy interface after spinning (45 % packed cells by volume)
BUFFY = 2.2                        # buffy coat thickness


def cyl(nx):
    """Brightness across a cylinder lit from the upper left (0 dark .. 1 bright)."""
    nx = np.clip(nx, -1, 1)
    i = np.maximum(0.0, -0.55 * nx + 0.83 * np.sqrt(1 - nx * nx))
    return 0.08 + 0.92 * i


def _tone(rmp, v, th):
    n = len(rmp)
    idx = np.clip(np.floor(v * (n - 1) + th), 0, n - 1).astype(np.int32)
    return np.asarray(rmp, np.uint8)[idx]


def to_canvas(cx, cy, s, lx, ly, ang=0.0, squash=1.0):
    sx, sy = s / math.sqrt(squash), s * squash
    u, v = lx * sx, (ly - ANCHOR) * sy
    c, sn = math.cos(ang), math.sin(ang)
    return cx + u * c - v * sn, cy + u * sn + v * c


def layer_mid(which):
    """Local y of the middle of a layer in the separated tube (for label leader lines)."""
    if which == 'plasma':
        return (LIQ + PLASMA_END) / 2
    return (PLASMA_END + BUFFY + TLEN - WALL) / 2


def draw(buf, cx, cy, s, ang=0.0, sep=0.0, glint=None, clip=None, squash=1.0, label=True, outline=True,
         ly_min=None, ly_max=None, checker=False):
    """Draw the tube with its axis point ANCHOR at canvas (cx, cy), scale s, rotation ang (radians, clockwise)."""
    if s <= 0.02:
        return gfx.EMPTY
    sx, sy = s / math.sqrt(squash), s * squash
    c, sn = math.cos(ang), math.sin(ang)
    corners = [(-CAP_R - 2, -2), (CAP_R + 2, -2), (-CAP_R - 2, TLEN + 2), (CAP_R + 2, TLEN + 2)]
    pts = [to_canvas(cx, cy, s, a, b, ang, squash) for a, b in corners]
    x0 = int(math.floor(min(p[0] for p in pts))) - 2
    x1 = int(math.ceil(max(p[0] for p in pts))) + 3
    y0 = int(math.floor(min(p[1] for p in pts))) - 2
    y1 = int(math.ceil(max(p[1] for p in pts))) + 3
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, gfx.W), min(y1, gfx.H)
    if x1 <= x0 or y1 <= y0:
        return gfx.EMPTY
    X = (np.arange(x0, x1) + 0.5)[None, :]
    Y = (np.arange(y0, y1) + 0.5)[:, None]
    dx, dy = X - cx, Y - cy
    lx = (dx * c + dy * sn) / sx
    ly = (-dx * sn + dy * c) / sy + ANCHOR
    px = 1.0 / s                                     # local units per canvas pixel
    alx = np.abs(lx)
    th = gfx.bayer_at(x0, y0, y1 - y0, x1 - x0)

    # ---- silhouette
    cr = 5.0
    cap = (ly >= 0) & (ly <= CAP_H) & (alx <= CAP_R)
    corner = (ly < cr) & (alx > CAP_R - cr)
    cap &= ~corner | ((alx - (CAP_R - cr)) ** 2 + (ly - cr) ** 2 <= cr * cr)
    cap &= ~((ly > 25.5) & (alx > CAP_R - max(1.6, px)))
    rout = np.where(ly <= BC, R_OUT, np.sqrt(np.maximum(R_OUT ** 2 - (ly - BC) ** 2, 0)))
    glass = (ly > CAP_H) & (ly <= TLEN) & (alx <= rout)
    w = max(WALL, px * 1.05)
    rr = R_OUT - w
    rin = np.where(ly <= BC, rr, np.sqrt(np.maximum(rr ** 2 - (ly - BC) ** 2, 0)))
    inside = glass & (alx < rin)
    wall = glass & ~inside
    sil = cap | glass
    keep = None
    if clip is not None:
        keep = clip(X + 0 * Y, Y + 0 * X)
    if ly_min is not None or ly_max is not None or checker:
        k2 = np.ones_like(sil)
        if ly_min is not None:
            k2 &= ly >= ly_min
        if ly_max is not None:
            k2 &= ly <= ly_max
        if checker:                      # x-ray: every other pixel, so what is in front shows through
            k2 &= ((np.floor(X) + np.floor(Y)) % 2 == 0)
        keep = k2 if keep is None else (keep & k2)
    if keep is not None:
        sil &= keep
        cap &= keep
        glass &= keep
        inside &= keep
        wall &= keep
    if not sil.any():
        return gfx.EMPTY

    sub = buf[y0:y1, x0:x1]
    out = sub.copy()
    nxg = lx / R_OUT
    vg = cyl(nxg)

    # ---- glass interior: air (see-through, SNES colour-math tint), label, liquid layers
    surface = LIQ + MEN * (1 - np.clip(lx / rr, -1, 1) ** 2)
    liq = inside & (ly >= surface)
    air = inside & ~liq
    a = air & ~((ly >= LABEL[0]) & (ly <= LABEL[1]) & label)
    if a.any():
        base = out[a].astype(np.float32)
        out[a] = (base * 0.55 + np.asarray(GL[2], np.float32) * 0.45 + 6).clip(0, 255).astype(np.uint8)

    p_end, b_end, tip = PLASMA_END, PLASMA_END + BUFFY, TLEN - w
    front = LIQ + sep * (p_end - LIQ)
    pile = tip - sep * (tip - b_end)
    plasma = liq & (ly < front)
    whole = liq & (ly >= front) & (ly < pile)
    rbc = liq & (ly >= pile)
    buffy = whole & (sep >= 0.98)
    whole &= ~buffy
    if sep >= 0.98 and s < 0.35:          # too small for a buffy line: keep the crisp two-layer read
        plasma |= buffy & (ly < p_end + BUFFY / 2)
        rbc |= buffy & ~(ly < p_end + BUFFY / 2)
        buffy = buffy & False
    vl = cyl(lx / rr) * 0.94 + 0.03
    for m, rmp in ((plasma, PL[2:9]), (whole, BL[2:8]), (rbc, PK[1:8]), (buffy, WC[1:6])):
        if m.any():
            out[m] = _tone(rmp, vl[m] * (0.92 if rmp is not PL[2:9] else 1.0), th[m])
    # meniscus: the first row of liquid catches the light
    top_row = liq & (ly < surface + px * 1.01)
    for m, rmp in ((top_row & plasma, PL), (top_row & whole, BL), (top_row & rbc, PK)):
        if m.any():
            out[m] = rmp[-2]
    # crisp interface: one darker row on top of the packed cells reads as a clean boundary
    if 0.02 < sep:
        edge = rbc & (ly < pile + px * 1.01)
        if edge.any():
            out[edge] = PK[2]

    # ---- paper label with barcode
    if label:
        lab = (inside | wall) & (ly >= LABEL[0]) & (ly <= LABEL[1])
        if lab.any():
            out[lab] = _tone(MW[3:9], vg[lab], th[lab])
            stripe = lab & (ly < LABEL[0] + max(3.0, px))
            out[stripe] = _tone(TL[3:8], vg[stripe], th[stripe])
            if s >= 0.42:
                bars = lab & (ly > LABEL[0] + 7) & (ly < LABEL[1] - 8) & (lx > -0.62 * R_OUT) & (lx < 0.38 * R_OUT)
                code = np.array([1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1], bool)
                k = np.clip(((ly - (LABEL[0] + 7)) / 1.0).astype(np.int32), 0, len(code) - 1)
                bars &= code[k]
                out[bars] = MW[1]
                txt = lab & (ly > LABEL[1] - 6) & (ly < LABEL[1] - 3) & (lx > -0.62 * R_OUT) & (lx < 0.1 * R_OUT)
                txt &= ((np.floor(lx) % 3) != 0)
                out[txt] = MW[3]

    # ---- glass wall
    wv = np.clip(vg * 1.05, 0, 1)
    wa = wall & ~((ly >= LABEL[0]) & (ly <= LABEL[1]) & label)
    if wa.any():
        out[wa] = _tone(GL[2:8], wv[wa], th[wa])
    # bottom of the round end and the right side catch less light
    # ---- specular highlights on the glass (not on the cap)
    body = glass & (ly > CAP_H + 5) & (ly < BC - 4)
    hw = max(2.6, px * 1.0) / R_OUT
    sa = body & (nxg > -0.66) & (nxg < -0.66 + hw) & ~((ly > LIQ - 7) & (ly < LIQ + 3))
    sa &= ~((ly > BC - 34) & (ly < BC - 29))
    for m, col in ((sa & air, GL[7]), (sa & plasma, PL[8]), (sa & whole, BL[8]), (sa & rbc, PK[7]),
                   (sa & buffy, WC[5]), (sa & wall, GL[7])):
        if m.any():
            out[m] = col
    if s >= 0.3:
        hb = max(1.2, px * 1.0) / R_OUT
        sb = glass & (ly > CAP_H + 16) & (ly < BC - 22) & (nxg > 0.56) & (nxg < 0.56 + hb)
        for m, col in ((sb & air, GL[6]), (sb & plasma, PL[7]), (sb & whole, BL[7]), (sb & rbc, PK[6])):
            if m.any():
                out[m] = col

    # ---- the cap (teal, grip ridges, a step to the skirt, darker rim against the glass)
    if cap.any():
        vc = cyl(lx / CAP_R)
        vcap = vc.copy()
        if s >= 0.45:
            phi = np.arcsin(np.clip(lx / CAP_R, -1, 1))
            ridge = (ly > 5) & (ly < 23) & ((phi * 11 / math.pi) % 1.0 < 0.34)
            vcap = np.where(ridge, vcap - 0.22, vcap)
        vcap = np.where(ly < 3.2, vcap + 0.18, vcap)
        vcap = np.where((ly > 23.5) & (ly < 26.5), vcap - 0.35, vcap)
        vcap = np.where(ly > CAP_H - 3, vcap - 0.25, vcap)
        out[cap] = _tone(TL[1:9], np.clip(vcap[cap], 0, 1), th[cap])

    # ---- glint: a diagonal sweep of light across the glass and cap
    if glint is not None:
        g = sil & ((ly + 0.85 * lx - glint) >= 0) & ((ly + 0.85 * lx - glint) < 9)
        g2 = sil & ((ly + 0.85 * lx - glint) >= 12) & ((ly + 0.85 * lx - glint) < 14)
        for m, k in ((g, 0.62), (g2, 0.4)):
            if m.any():
                f = out[m].astype(np.float32)
                out[m] = (f + (255 - f) * k).astype(np.uint8)

    sub[sil] = out[sil]
    mk = gfx.Mask(x0, y0, sil)
    if outline:
        gfx.fill(buf, mk.outline(), OUTLINE)
    return mk
