"""The syringe, drawn per pixel from its own axis coordinates: s along the axis (0 at the needle tip, growing toward the
plunger) and v across it (+v is the syringe's top side).

A clear plastic barrel with graduation marks, a black rubber stopper on a plunger rod, a finger flange and a thumb press;
a green hub and a steel needle with the bevel facing up. The needle is drawn in section (two steel walls and the channel
between them) so the blood can be seen travelling up it; the barrel is see-through, so the red column shows as it grows.
"""
import math
import numpy as np
from . import gfx, cells
from . import timeline as T
from .palette import GL, RB, ST, HB, CY, BL, BG, INK, OUTLINE

NEEDLE_L, NEEDLE_R, LUMEN_R, BEVEL = 84.0, 2.4, 1.2, 7.0          # a fine needle
HUB0, HUB1, HUB_R0, HUB_R1 = 84.0, 96.0, 3.6, 7.5
NOZ0, NOZ1, NOZ_R, NOZ_IN = 96.0, 101.0, 3.6, 1.6
BAR0, BAR1, BAR_R, BAR_IN = T.S_BARREL0, T.S_BARREL1, 20.0, 18.2     # a wide barrel: more room for blood
SHOULDER = 2.4                                                       # the barrel's front shoulder slope
FLA0, FLA1, FLA_R = BAR1, BAR1 + 5.0, 31.0
STOP_L, ROD_R, THUMB_L, THUMB_R = 9.0, 9.0, 5.0, 22.0                # rod fins span 18 px; seen through the barrel
ROD_L = T.L_EMPTY - BAR0 - STOP_L - THUMB_L                          # 89: the thumb press sits 13 px behind the flange


def axes(ang=T.ANGLE):
    """(ux, uy, nx, ny): the tip direction and the syringe's top side for an axis at angle ang (radians)."""
    c, s = math.cos(ang), math.sin(ang)
    return c, s, s, -c


def _tone(rmp, v, th):
    n = len(rmp)
    idx = np.clip(np.floor(np.asarray(v) * (n - 1) + th), 0, n - 1).astype(np.int32)
    return np.asarray(rmp, np.uint8)[idx]


def to_canvas(tx, ty, s, v, ang=T.ANGLE):
    """Canvas point at axis coordinates (s, v) for a tip at canvas (tx, ty)."""
    ux, uy, nx, ny = axes(ang)
    return tx - s * ux + v * nx, ty - s * uy + v * ny


def length(plunger):
    return BAR0 + plunger + STOP_L + ROD_L + THUMB_L


def draw(buf, tx, ty, plunger=0.0, front=0.0, fill=0.0, highlight=None, ang=T.ANGLE):
    """Draw the syringe with its needle tip at canvas (tx, ty) and its axis at angle ang.

    plunger: stopper travel (px); front: how far blood has come up from the tip (px); fill: blood column in the barrel
    (px); highlight: axis position of a sweeping glint (or None)."""
    UX, UY, NX, NY = axes(ang)
    s_end = length(plunger)
    pts = [to_canvas(tx, ty, s, v, ang) for s in (0.0, s_end) for v in (-FLA_R - 2, FLA_R + 2)]
    x0 = max(int(math.floor(min(p[0] for p in pts))) - 2, 0)
    x1 = min(int(math.ceil(max(p[0] for p in pts))) + 3, gfx.W)
    y0 = max(int(math.floor(min(p[1] for p in pts))) - 2, 0)
    y1 = min(int(math.ceil(max(p[1] for p in pts))) + 3, gfx.H)
    if x1 <= x0 or y1 <= y0:
        return gfx.EMPTY
    X = (np.arange(x0, x1) + 0.5)[None, :]
    Y = (np.arange(y0, y1) + 0.5)[:, None]
    dx, dy = X - tx, Y - ty
    s = -(dx * UX + dy * UY)
    v = dx * NX + dy * NY
    av = np.abs(v)
    th = gfx.bayer_at(x0, y0, y1 - y0, x1 - x0)
    sub = buf[y0:y1, x0:x1]
    out = sub.copy()
    sf = BAR0 + plunger                       # stopper front
    rod0, rod1 = sf + STOP_L, sf + STOP_L + ROD_L

    # ---- shapes
    face = BEVEL * (v + NEEDLE_R) / (2 * NEEDLE_R)          # the bevel: sharp point at the bottom, opening facing up
    needle = (s >= face) & (s <= NEEDLE_L) & (av <= NEEDLE_R)
    lumen = needle & (av < LUMEN_R)
    nwall = needle & ~lumen
    hub_r = HUB_R0 + (s - HUB0) / (HUB1 - HUB0) * (HUB_R1 - HUB_R0)
    hub = (s > HUB0 - 0.01) & (s <= HUB1) & (av <= hub_r)
    hub_in = hub & (av < hub_r - 1.4)
    noz = (s > NOZ0) & (s <= NOZ1) & (av <= NOZ_R)
    noz_in = noz & (av < NOZ_IN)
    shoulder = np.clip(NOZ_R + (s - BAR0) * SHOULDER, NOZ_R, BAR_R)
    barrel = (s > BAR0) & (s <= BAR1) & (av <= shoulder)
    bar_in = barrel & (av < np.minimum(shoulder - 1.6, BAR_IN)) & (s > BAR0 + 1.2)
    bwall = barrel & ~bar_in
    flange = (s > FLA0) & (s <= FLA1) & (av <= FLA_R)
    flange &= ~((av > FLA_R - 2) & ((s - FLA0) < 1.0) | (av > FLA_R - 2) & ((FLA1 - s) < 1.0))
    rod_out = (s > FLA1) & (s <= rod1) & (av <= ROD_R)
    thumb = (s > rod1) & (s <= rod1 + THUMB_L) & (av <= THUMB_R)
    sil = needle | hub | noz | barrel | flange | rod_out | thumb
    if not sil.any():
        return gfx.EMPTY

    vn = np.clip(v / BAR_R, -1, 1)
    lit = np.clip(0.55 + 0.4 * vn, 0, 1)                    # the top side catches the light

    # ---- barrel inside: blood column, gap, stopper, rod, air
    blood_b = bar_in & (s < BAR0 + fill + 0.5)
    stopper = bar_in & (s >= sf) & (s < sf + STOP_L)
    rod_in = bar_in & (s >= rod0) & (av <= ROD_R)
    air = bar_in & ~(blood_b | stopper)
    if air.any():                                            # see-through plastic: the navy shows, slightly lifted
        f = out[air].astype(np.float32)
        out[air] = (f * 0.72 + np.asarray(GL[1], np.float32) * 0.28 + 3).clip(0, 255).astype(np.uint8)
    if blood_b.any():
        vb = np.clip(0.5 + 0.45 * np.clip(v / BAR_IN, -1, 1), 0, 1)
        out[blood_b] = _tone(BL[3:8], vb[blood_b], th[blood_b])
        streak = blood_b & (v > 0.58 * BAR_IN) & (v < 0.7 * BAR_IN)
        out[streak] = BL[8]
        out[blood_b & (v > 0.36 * BAR_IN) & (v < 0.42 * BAR_IN)] = BL[7]
        meniscus = blood_b & (s > BAR0 + fill - 0.6)
        out[meniscus & ~stopper] = BL[7]
    if stopper.any():
        vs = np.clip(0.45 + 0.4 * vn, 0, 1)
        vs = np.where((np.abs(s - sf - 2.6) < 0.7) | (np.abs(s - sf - 5.4) < 0.7), vs - 0.3, vs)
        vs = np.where(s < sf + 0.9, vs + 0.25, vs)
        out[stopper] = _tone(RB[1:6], np.clip(vs[stopper], 0, 1), th[stopper])
    if rod_in.any():                                         # the clear plastic rod inside: translucent fins, solid rib
        f = out[rod_in].astype(np.float32)
        out[rod_in] = (f * 0.6 + np.asarray(GL[4], np.float32) * 0.4).astype(np.uint8)
        out[rod_in & ((av < 1.2) | (np.abs(av - ROD_R) < 0.7))] = GL[5]
    # barrel wall, graduations, glass streaks
    if bwall.any():
        out[bwall] = _tone(GL[3:7], lit[bwall], th[bwall])
    ticks = bar_in & (v > 0) & (s > BAR0 + 2) & (s < BAR1 - 2)
    k = np.round((s - (BAR0 + 2)) / 6.0)
    on_tick = np.abs(s - (BAR0 + 2) - k * 6.0) < 0.55
    tick_len = np.where((k % 3) == 0, 4.8, 2.8)
    ticks &= on_tick & (v > BAR_IN - tick_len)
    out[ticks & ~blood_b] = INK
    out[ticks & blood_b] = BL[8]
    glare = bar_in & (v > 10.4) & (v < 11.8) & ~stopper
    out[glare & ~blood_b] = GL[5]
    low = bar_in & (v < -14.8) & (v > -16.2) & ~stopper
    out[low & ~blood_b] = GL[3]

    # ---- flange, rod outside, thumb press
    for m in (flange, rod_out, thumb):
        if m.any():
            vv = np.where(av < 1.0, 0.9, 0.35 + 0.5 * lit)
            out[m] = _tone(GL[3:7], np.clip(vv[m], 0, 1), th[m])
    rib = rod_out & (av < 1.0)
    out[rib] = GL[6]

    # ---- nozzle and hub (blood shows through)
    up_to = front
    if noz.any():
        out[noz] = _tone(GL[3:7], lit[noz], th[noz])
        ni = noz_in & (s < up_to)
        out[ni] = BL[5]
        out[noz_in & ~ni] = BG[2]
    if hub.any():
        out[hub] = _tone(HB[2:7], lit[hub], th[hub])
        ribs = hub & ((np.abs(s - 88) < 0.6) | (np.abs(s - 92) < 0.6))
        out[ribs] = HB[1]
        hb = hub_in & (s < up_to)
        out[hb] = _tone([BL[2], BL[3], BL[4]], lit[hb], th[hb])
        out[hub_in & ~hb] = HB[1]

    # ---- needle: steel walls in section, the channel between them
    if needle.any():
        vw = np.clip(0.3 + 0.7 * (v + NEEDLE_R) / (2 * NEEDLE_R), 0, 1)
        out[nwall] = _tone(ST[1:7], vw[nwall], th[nwall])
        fl = lumen & (s < up_to)
        out[fl] = _tone(BL[4:7], np.clip(0.5 + 0.4 * v / LUMEN_R, 0, 1)[fl], th[fl])
        out[lumen & ~fl] = BG[1]
        edge = needle & (s < face + 1.0)                     # the bevel's cut face catches the light
        out[edge & nwall] = ST[6]
        out[edge & lumen & ~fl] = BG[0]

    # ---- a glint sweeping along the syringe
    if highlight is not None:
        g = sil & (np.abs(s - highlight - 0.35 * v) < 2.2)
        g2 = sil & (np.abs(s - highlight - 5 - 0.35 * v) < 0.8)
        for m, kk in ((g, 0.7), (g2, 0.45)):
            if m.any():
                f = out[m].astype(np.float32)
                out[m] = (f + (255 - f) * kk).astype(np.uint8)

    sub[sil] = out[sil]
    mk = gfx.Mask(x0, y0, sil)
    gfx.fill(buf, mk.outline(), OUTLINE)
    return mk


# ---------------------------------------------------------------- red cells travelling inside the syringe
_rng = np.random.default_rng(1953)
N_STREAM = 70
STREAM_T0 = T.FLOW_IN + np.arange(N_STREAM) * 0.135
STREAM_V = _rng.uniform(-0.5, 0.5, N_STREAM)
STREAM_SPEED = T.S_BARREL0 / (T.FLOW_HUB - T.FLOW_IN)
BAR_R01 = _rng.uniform(0.15, 1.0, N_STREAM)
BAR_V = _rng.uniform(-13.5, 13.5, N_STREAM)
BAR_TILT = _rng.uniform(0, 1, N_STREAM)
BAR_PSI = _rng.integers(0, 4, N_STREAM)


def _mini_cell(buf, x, y, ux, uy):
    """A red cell squeezed into the fine needle: a bright dot with a darker tail pointing back down the needle."""
    x, y = int(round(x)), int(round(y))
    bx, by = int(round(x + ux * 1.2)), int(round(y + uy * 1.2))
    for (px, py, c) in ((bx, by, BL[4]), (x, y, BL[8])):
        if 0 <= px < gfx.W and 0 <= py < gfx.H:
            buf[py, px] = c


def draw_cells(buf, tx, ty, t, ang=T.ANGLE):
    """Cells riding up the needle into the barrel, then drifting in the growing column."""
    ux, uy = math.cos(ang), math.sin(ang)
    if t < T.FLOW_IN:
        return
    tt = min(t, T.FULL)                                     # the flow stops when the plunger stops
    fill = T.barrel_fill(t)
    for k in range(N_STREAM):
        age = tt - STREAM_T0[k]
        if age < 0:
            continue
        s = age * STREAM_SPEED
        if s < T.S_BARREL0 - 1:
            if s > T.flow_front(t) - 1:
                continue
            x, y = to_canvas(tx, ty, s + 1.0, STREAM_V[k] * 0.5, ang)
            _mini_cell(buf, x, y, ux, uy)
        elif fill > 4 and k % 2 == 0:
            settle = T.clamp01((s - T.S_BARREL0) / 30.0)
            sb = T.S_BARREL0 + 2 + (fill - 5) * BAR_R01[k] * settle
            vb = BAR_V[k] * settle + math.sin(t * 1.7 + k) * 0.6
            x, y = to_canvas(tx, ty, min(sb, T.S_BARREL0 + fill - 3), vb, ang)
            spr = cells.pick(5.0, (BAR_TILT[k] + 0.3 * min(t, T.FULL)) % 1.0, BAR_PSI[k])
            h, w = spr[1].shape
            gfx.paste_sprite(buf, spr, x - w / 2, y - h / 2)
