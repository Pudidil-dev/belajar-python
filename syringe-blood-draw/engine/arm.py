"""The arm in side view: first its outside (skin), then a scan line reveals the side cutaway.

World coordinates: the skin surface is y = 0 (the arm runs off both sides of the frame), depth grows downward
(timeline.py holds the layer depths, shared with the sound):
  epidermis 0-14: a thin horny layer of flat dead cells over three rows of living skin cells, each cell drawn on its
    own (border, light top, shaded side, nucleus): flattened granular cells, polygonal spinous cells, columnar basal
    cells on the basement membrane;
  dermis 14-25: soft tissue with wavy collagen, small fibroblast nuclei and little lobules of round fat cells;
  the vein 25-55: a thick wall (outer coat, muscle coat, lining) around a lumen of red cells flowing left;
  deeper soft tissue below it, with larger fat lobules (the arm runs on below the frame).
Once the plunger pulls, red cells near the needle opening peel off the stream and swirl into it.
"""
import math
import numpy as np
from . import gfx, cells
from . import timeline as T
from .palette import SK, TS, FT, VW, BL, CY, OUTLINE

EPI, DERM, VEIN_C, VEIN_R, VEIN_WALL, DEEP, BOTTOM = T.EPI, T.DERM, T.VEIN_C, T.VEIN_R, T.VEIN_WALL, T.DEEP, T.BOTTOM
LUMEN_R = T.LUMEN_R
FLOW_V = 18.0                      # vein flow (px/s, leftward)
TEX_X0, TEX_X1 = -900, 900         # the world span the skin-cell texture covers


# ---------------------------------------------------------------- the skin cells (built once, in world pixels)
def _cell_row(rng, y0, hh, wrange, kinky, cols, nucleus, granules=False):
    """One row of skin cells as an (hh, width, 3) image. cols = (border, light, base, shade, nucleus dark, nucleus
    light); nucleus = (w, h, top row)."""
    border, light, base, shade, ndark, nlight = cols
    xs = np.arange(TEX_X0, TEX_X1)
    b = [TEX_X0 - rng.integers(0, wrange[1])]
    while b[-1] < TEX_X1 + wrange[1]:
        b.append(b[-1] + int(rng.integers(wrange[0], wrange[1] + 1)))
    b = np.array(b)
    kink = rng.integers(-1, 2, len(b)) if kinky else np.zeros(len(b), int)
    njit = rng.integers(-1, 2, len(b))
    gx = rng.integers(2, max(3, wrange[0] - 2), len(b))
    gy = rng.integers(2, hh, len(b))
    img = np.zeros((hh, len(xs), 3), np.uint8)
    nw, nh, ny0 = nucleus
    for ly in range(hh):
        bb = b + (kink if ly >= 2 else 0)
        idx = np.clip(np.searchsorted(bb, xs, side='right') - 1, 0, len(bb) - 2)
        lx = xs - bb[idx]
        wc = bb[idx + 1] - bb[idx]
        row = np.empty((len(xs), 3), np.uint8)
        row[:] = base
        if ly == 1:
            row[(lx >= 1) & (lx <= wc - 2)] = light
        if ly == hh - 1:
            row[:] = shade
        row[lx == wc - 1] = shade
        nx0 = wc // 2 - nw // 2 + njit[idx]
        if ny0 <= ly < ny0 + nh:
            nuc = (lx >= nx0) & (lx < nx0 + nw)
            row[nuc] = ndark
            if ly == ny0:
                row[lx == nx0] = nlight
        if granules:
            row[(lx == gx[idx]) & (ly == gy[idx]) & (lx < wc - 2)] = shade
            row[(lx == wc - gx[idx]) & (ly == hh - gy[idx] + 1) & (lx > 1)] = shade
        if ly in (1, hh - 1):                                # rounded corners: each cell reads as its own blob
            row[(lx == 1) | (lx == wc - 1)] = border
        row[lx == 0] = border
        if ly == 0:
            row[:] = border
        img[ly] = row
    return img


def _epidermis():
    rng = np.random.default_rng(2205)
    w = TEX_X1 - TEX_X0
    tex = np.zeros((int(EPI), w, 3), np.uint8)
    # the horny layer: two 1-px rows of flat dead cells (light, with darker joints)
    for y, base, joint, (lo, hi) in ((0, SK[7], SK[5], (9, 16)), (1, SK[6], SK[4], (7, 12))):
        row = np.empty((w, 3), np.uint8)
        row[:] = base
        x = TEX_X0 - rng.uniform(0, hi)
        while x < TEX_X1:
            xi = int(round(x)) - TEX_X0
            if 0 <= xi < w:
                row[xi] = joint
            x += rng.uniform(lo, hi)
        tex[y] = row
    # granular cells: wide and flattened, a thin nucleus and a few dark granules
    tex[2:6] = _cell_row(rng, 2, 4, (10, 13), False, (SK[3], SK[7], SK[6], SK[5], SK[2], SK[3]), (3, 1, 2), True)
    # spinous cells: polygons with a round nucleus
    tex[6:10] = _cell_row(rng, 6, 4, (7, 9), True, (SK[3], SK[6], SK[5], SK[4], SK[1], SK[3]), (2, 2, 2))
    # basal cells: narrow columns, darker, with large nuclei, on the basement membrane
    tex[10:14] = _cell_row(rng, 10, 4, (5, 6), True, (SK[2], SK[5], SK[4], SK[3], SK[0], SK[2]), (2, 2, 1))
    return tex


SKIN_TEX = _epidermis()

# ---------------------------------------------------------------- tissue details
_rng = np.random.default_rng(1901)
# small fat lobules in the dermis (3 round cells each) and larger ones in the deep tissue (4-7 cells)
_LOBES = []
for x in np.arange(-880, 880, 21.0) + _rng.uniform(-6, 6, len(np.arange(-880, 880, 21.0))):
    if _rng.uniform() < 0.55:
        cy = _rng.uniform(19.0, 21.5)
        _LOBES.append([(x + dx, cy + dy, 2.4) for dx, dy in ((0, 0), (4.3, 0.6), (2.0, -2.6))])
for x in np.arange(-880, 880, 31.0) + _rng.uniform(-8, 8, len(np.arange(-880, 880, 31.0))):
    cy = _rng.uniform(DEEP + 18, DEEP + 110)
    n = int(_rng.integers(3, 7))
    pts = [(x, cy, _rng.uniform(3.0, 3.9))]
    while len(pts) < n:
        px, py, pr = pts[int(_rng.integers(0, len(pts)))]
        a = _rng.uniform(0, 2 * math.pi)
        r = _rng.uniform(3.0, 3.9)
        pts.append((px + math.cos(a) * (pr + r - 0.6), py + math.sin(a) * (pr + r - 0.6), r))
    _LOBES.append(pts)
# fibroblast nuclei (3x1 dark dashes) in the dermis and the deep tissue
_FIB = np.stack([_rng.uniform(-880, 880, 700), np.concatenate([_rng.uniform(EPI + 2.5, DERM - 1.5, 330),
                                                                 _rng.uniform(DEEP + 3, BOTTOM - 20, 370)])], 1)

N_VEIN = 110
SPAN = (-300.0, 300.0)
V_X0 = _rng.uniform(*SPAN, N_VEIN)
V_DY = _rng.uniform(-(LUMEN_R - 3.5), LUMEN_R - 3.5, N_VEIN)
V_TILT = _rng.uniform(0, 1, N_VEIN)
V_RATE = _rng.uniform(0.25, 0.7, N_VEIN)
V_PSI = _rng.integers(0, 4, N_VEIN)
V_DARK = (np.abs(V_DY) > 5.5) & (_rng.uniform(0, 1, N_VEIN) < 0.7)
V_SIZE = np.where(_rng.uniform(0, 1, N_VEIN) < 0.5, 6.0, 5.0)


def _tone(rmp, v, th):
    n = len(rmp)
    idx = np.clip(np.floor(np.asarray(v) * (n - 1) + th), 0, n - 1).astype(np.int32)
    return np.asarray(rmp, np.uint8)[idx]


def cut_x(t):
    """Screen x of the reveal scan line (cutaway to its left)."""
    if t < T.CUTAWAY[0]:
        return -9999.0
    return -12 + (gfx.W + 24) * T.smooth(T.u_of(t, T.CUTAWAY))


def _fat_cells(buf, ox, oy, r0, cutaway, y_lo, y_hi, deep=False):
    """Lobules of round fat cells, clipped to the cutaway and to the band y_lo..y_hi (deep ones sit in shadow)."""
    c_rim, c_base, c_top, c_hi = (FT[0], FT[1], FT[2], FT[3]) if deep else (FT[1], FT[3], FT[4], FT[5])
    for pts in _LOBES:
        if not (y_lo - 6 < pts[0][1] < y_hi + 6) or abs(pts[0][0] - ox - gfx.W / 2) > gfx.W / 2 + 30:
            continue
        for (fx_, fy, rr) in pts:
            e = gfx.ellipse(fx_ - ox, fy - oy, rr, rr)
            if e.empty():
                continue
            band = gfx.Mask(0, r0, cutaway)
            X, Y = e.grid()
            yw = Y + oy
            keep = gfx.Mask(e.x0, e.y0, e.m & (yw >= y_lo) & (yw < y_hi))
            cell = keep & band
            if cell.empty():
                continue
            gfx.fill(buf, cell, c_base)
            gfx.fill(buf, cell.top_edge(), c_top)
            inner = cell.erode()
            if not inner.empty():
                X2, Y2 = inner.grid()
                hl = gfx.Mask(inner.x0, inner.y0, inner.m & ((X2 - (fx_ - ox)) + (Y2 - (fy - oy)) < -rr * 0.6))
                gfx.fill(buf, hl, c_hi)
            gfx.fill(buf, cell - cell.erode(), c_rim)


def draw(buf, ox, oy, t):
    """Draw the arm; (ox, oy) is the world position of canvas pixel (0, 0)."""
    y_top = int(math.floor(0 - oy)) - 1
    y_bot = int(math.ceil(BOTTOM - oy)) + 1
    r0, r1 = max(y_top, 0), min(y_bot, gfx.H)
    if r1 <= r0:
        return
    Xc = (np.arange(gfx.W) + 0.5)[None, :]
    Yc = (np.arange(r0, r1) + 0.5)[:, None]
    Xw, Yw = np.broadcast_arrays(Xc + ox, Yc + oy)
    th = gfx.bayer_at(0, r0, r1 - r0, gfx.W)
    sub = buf[r0:r1]
    inside = (Yw >= 0) & (Yw < BOTTOM)
    cutaway = inside & (Xc < cut_x(t))
    outer = inside & ~cutaway
    # ---- the outside of the arm: skin, lit from above, rounding into shadow
    if outer.any():
        v = np.clip(0.95 - 0.75 * np.clip(Yw / BOTTOM, 0, 1) ** 0.8, 0, 1)
        img = _tone(SK[2:8], np.broadcast_to(v, outer.shape), th)
        sub[outer] = img[outer]
        pores = outer & ((np.floor(Xw * 0.37 + np.floor(Yw / 7) * 3.1) % 11) == 0) & ((np.floor(Yw) % 7) == 3)
        sub[pores] = SK[4]
    if cutaway.any():
        epi = cutaway & (Yw < EPI)
        derm = cutaway & (Yw >= EPI) & (Yw < DERM)
        dv = np.abs(Yw - VEIN_C)
        vein = cutaway & (dv < VEIN_R)
        lum = vein & (dv < LUMEN_R)
        wall = vein & ~lum
        deep = cutaway & (Yw >= DEEP)
        # epidermis: the skin cells, one by one
        if epi.any():
            xi = np.clip(np.floor(Xw).astype(np.int32) - TEX_X0, 0, TEX_X1 - TEX_X0 - 1)
            yi = np.clip(np.floor(Yw).astype(np.int32), 0, int(EPI) - 1)
            sub[epi] = SKIN_TEX[yi[epi], xi[epi]]
        # dermis: light pink tissue, wavy collagen, a dark basement membrane under the basal cells
        if derm.any():
            vt = np.clip(0.9 - (Yw - EPI) / (DERM - EPI) * 0.35, 0, 1)
            timg = _tone(TS[3:7], np.broadcast_to(vt, sub.shape[:2]), th)
            sub[derm] = timg[derm]
            wave = Yw + 1.3 * np.sin(Xw * 0.31 + np.floor(Yw / 3.0) * 2.1)
            fib = derm & ((np.floor(wave) % 3) == 0) & (((Xw * 0.5 + np.floor(Yw / 3) * 5) % 11) < 7)
            sub[fib] = TS[6]
            sub[derm & (Yw < EPI + 1.0)] = TS[1]
        # deeper soft tissue (no extra anatomy: the vein stays the only red tube)
        if deep.any():
            vd = np.clip(0.66 - 0.42 * np.clip((Yw - DEEP) / 150.0, 0, 1), 0, 1)
            dimg = _tone(TS[1:6], np.broadcast_to(vd, sub.shape[:2]), th)
            sub[deep] = dimg[deep]
            dfib = deep & ((np.floor(Xw / 13 + np.sin(Yw * 0.5) * 0.5) % 6) == 0) & ((np.floor(Yw) % 4) == 0)
            sub[dfib] = TS[2]
        # fibroblast nuclei
        for (fx_, fy) in _FIB:
            xx, yy = int(math.floor(fx_ - ox)), int(math.floor(fy - oy))
            if 0 <= xx < gfx.W - 3 and r0 <= yy < r1 and yy < gfx.H:
                seg = cutaway[yy - r0, xx:xx + 3]
                dst = buf[yy, xx:xx + 3]
                dst[seg] = TS[0]
        _fat_cells(buf, ox, oy, r0, cutaway, EPI + 1.0, DERM - 0.5)
        _fat_cells(buf, ox, oy, r0, cutaway, DEEP + 1.0, BOTTOM - 8, deep=True)
        # the vein: outer coat, muscle coat, lining; the lumen shaded as a round tube
        vw = np.clip(0.8 - 0.55 * (Yw - (VEIN_C - VEIN_R)) / (2 * VEIN_R), 0, 1)
        wimg = _tone(VW[1:6], np.broadcast_to(vw, sub.shape[:2]), th)
        sub[wall] = wimg[wall]
        sub[wall & (np.abs(dv - (LUMEN_R + 1.5)) < 0.5)] = VW[2]
        sub[vein & (dv >= VEIN_R - 0.8)] = VW[5]
        sub[wall & (np.abs(dv - LUMEN_R) < 0.6)] = VW[5]
        ly = (Yw - (VEIN_C - LUMEN_R)) / (2 * LUMEN_R)
        vl = np.clip(0.88 - 0.95 * np.abs(ly - 0.3) ** 0.9, 0, 1)
        limg = _tone(BL[1:6], np.broadcast_to(vl, sub.shape[:2]), th)
        sub[lum] = limg[lum]
        sub[lum & (ly < 0.06)] = BL[2]
        sub[lum & (ly >= 0.12) & (ly < 0.17)] = BL[6]
        # the scan line that reveals the cutaway
        xl = cut_x(t)
        if T.CUTAWAY[0] <= t < T.CUTAWAY[1] + 0.05:
            band = inside & (np.abs(Xc - xl) < 1.5)
            sub[band] = CY[4]
            sub[inside & (np.abs(Xc - xl - 2.5) < 0.7)] = CY[2]
    # outline above the skin and below the arm
    sub[(Yw >= -1) & (Yw < 0)] = OUTLINE
    sub[(Yw >= BOTTOM) & (Yw < BOTTOM + 1)] = OUTLINE
    # skin surface highlight on the outside of the arm
    sub[outer & (Yw < 1.0)] = SK[7]
    if cut_x(t) > -100:
        _vein_cells(buf, ox, oy, t)


def _vein_cells(buf, ox, oy, t):
    """Red cells drifting left along the vein; after the plunger pulls, some curve up into the needle opening."""
    xl = cut_x(t)
    lo, hi = SPAN
    w = hi - lo
    xs = (V_X0 - FLOW_V * t - lo) % w + lo
    for i in range(N_VEIN):
        cx, cy = xs[i] - ox, VEIN_C + V_DY[i] - oy
        if cx < -6 or cx > gfx.W + 6 or cx > xl - 3:
            continue
        spr = cells.pick(float(V_SIZE[i]), (V_TILT[i] + V_RATE[i] * t) % 1.0, V_PSI[i], dark=bool(V_DARK[i]))
        h, ww = spr[1].shape
        gfx.paste_sprite(buf, spr, cx - ww / 2, cy - h / 2)
    # cells drawn into the needle
    from . import syringe
    if t < T.FLOW_IN - 0.5:
        return
    ow = T.opening_world()
    tt = min(t, T.FULL)
    for k in range(syringe.N_STREAM):
        t_k = syringe.STREAM_T0[k]
        a = (tt - (t_k - 0.5)) / 0.5
        if a < 0 or a >= 1:
            continue
        a = T.smooth(a)
        sx0, sy0 = ow[0] + 18 + 5 * (k % 3), VEIN_C + 4.0 * ((k % 5) - 2) * 0.7
        cx = (1 - a) * sx0 + a * ow[0]
        cy = (1 - a) * sy0 + a * ow[1] - 5 * math.sin(math.pi * a)
        if cx - ox > xl - 3:
            continue
        spr = cells.pick(5.0 if a < 0.45 else (3.5 if a < 0.8 else 2.5), (k * 0.37 + a) % 1.0, k % 4)
        h, ww = spr[1].shape
        gfx.paste_sprite(buf, spr, cx - ox - ww / 2, cy - oy - h / 2)


def opening_world():
    return T.opening_world()
