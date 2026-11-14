"""The arm in side view: first its outside (skin), then a scan line reveals the side cutaway.

World coordinates: the skin surface is y = 0 (the arm runs off both sides of the frame), depth grows downward:
  epidermis 0-5 (with small pixel cells), soft tissue 5-19 (with fat lobules), the vein 19-41 (wall + lumen with red
  cells flowing left), deeper soft tissue below it (the arm runs on below the frame).
Once the plunger pulls, red cells near the needle opening peel off the stream and swirl into it.
"""
import math
import numpy as np
from . import gfx, cells
from . import timeline as T
from .palette import SK, TS, FT, MU, VW, BL, CY, BG, OUTLINE

EPI, TIS, VEIN_C, VEIN_R, VEIN_WALL, MUS, BOTTOM = 5.0, 19.0, 30.0, 11.0, 2.2, 41.0, 340.0
LUMEN_R = VEIN_R - VEIN_WALL
FLOW_V = 18.0                      # vein flow (px/s, leftward)

_rng = np.random.default_rng(1901)
_FX = np.arange(-700, 700, 17.0)
FAT = [(x, _rng.uniform(8.5, 15.5), _rng.uniform(3.5, 6.0), _rng.uniform(2.2, 3.2))
       for x in _FX + _rng.uniform(-5, 5, len(_FX))]
_DX = np.arange(-700, 700, 23.0)
FAT += [(x, _rng.uniform(52, 120), _rng.uniform(4.5, 8.0), _rng.uniform(2.8, 4.2))
        for x in _DX + _rng.uniform(-8, 8, len(_DX))]
N_VEIN = 64
SPAN = (-300.0, 300.0)
V_X0 = _rng.uniform(*SPAN, N_VEIN)
V_DY = _rng.uniform(-4.5, 4.5, N_VEIN)
V_TILT = _rng.uniform(0, 1, N_VEIN)
V_RATE = _rng.uniform(0.25, 0.7, N_VEIN)
V_PSI = _rng.integers(0, 4, N_VEIN)
V_DARK = _rng.uniform(0, 1, N_VEIN) < 0.35


def _tone(rmp, v, th):
    n = len(rmp)
    idx = np.clip(np.floor(np.asarray(v) * (n - 1) + th), 0, n - 1).astype(np.int32)
    return np.asarray(rmp, np.uint8)[idx]


def cut_x(t):
    """Screen x of the reveal scan line (cutaway to its left)."""
    if t < T.CUTAWAY[0]:
        return -9999.0
    return -12 + (gfx.W + 24) * T.smooth(T.u_of(t, T.CUTAWAY))


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
        lay = np.zeros(cutaway.shape, np.int8)
        epi = cutaway & (Yw < EPI)
        tis = cutaway & (Yw >= EPI) & (Yw < TIS)
        dv = np.abs(Yw - VEIN_C)
        vein = cutaway & (dv < VEIN_R)
        wall = vein & (dv >= LUMEN_R)
        lum = vein & (dv < LUMEN_R)
        mus = cutaway & (Yw >= MUS) & (Yw < BOTTOM - 6)
        low = cutaway & (Yw >= BOTTOM - 6)
        tis2 = cutaway & (Yw >= TIS) & ~vein & (Yw < MUS)
        # epidermis: two rows of small cells
        img = np.broadcast_to(np.asarray(SK[6], np.uint8), sub.shape).copy()
        row = np.floor(Yw / 2.5)
        cx_ = (Xw + row * 3.0) % 6.0
        border = (cx_ < 1.0) | (np.abs(Yw - 2.5) < 0.5)
        nucleus = (np.abs(cx_ - 3.5) < 0.8) & (np.abs((Yw % 2.5) - 1.5) < 0.6)
        sub[epi] = img[epi]
        sub[epi & border] = SK[4]
        sub[epi & nucleus & ~border] = SK[3]
        sub[epi & (Yw < 1.0)] = SK[7]
        # soft tissue with fat lobules
        vt = np.clip(0.85 - (Yw - EPI) / (MUS - EPI) * 0.45, 0, 1)
        timg = _tone(TS[2:7], np.broadcast_to(vt, sub.shape[:2]), th)
        st = tis | tis2
        sub[st] = timg[st]
        fib = st & ((np.floor(Xw / 9 + np.sin(Yw * 0.9) * 0.4) % 5) == 0) & ((np.floor(Yw) % 3) == 0)
        sub[fib] = TS[3]
        for (fx_, fy, rx, ry) in FAT:
            cxs = fx_ - ox
            if cxs < -10 or cxs > gfx.W + 10:
                continue
            e = gfx.ellipse(cxs, fy - oy, rx, ry)
            e_rows = gfx.Mask(e.x0, e.y0, e.m) & gfx.Mask(0, r0, cutaway)
            if e_rows.empty():
                continue
            gfx.fill(buf, e_rows, FT[3])
            gfx.fill(buf, e_rows.top_edge(), FT[4])
            gfx.fill(buf, e_rows.bottom_edge() & gfx.Mask(0, r0, cutaway), FT[1])
        # vein wall and lumen
        vw = np.clip(0.75 - 0.5 * (Yw - (VEIN_C - VEIN_R)) / (2 * VEIN_R), 0, 1)
        wimg = _tone(VW[1:6], np.broadcast_to(vw, sub.shape[:2]), th)
        sub[wall] = wimg[wall]
        inner_line = wall & (np.abs(dv - LUMEN_R) < 0.6)
        sub[inner_line] = VW[5]
        vl = np.clip(0.7 - 0.55 * (Yw - (VEIN_C - LUMEN_R)) / (2 * LUMEN_R), 0, 1)
        limg = _tone(BL[2:5], np.broadcast_to(vl, sub.shape[:2]), th)
        sub[lum] = limg[lum]
        # deeper soft tissue (no extra anatomy: the vein stays the only red tube)
        deep = mus | low
        vd = np.clip(0.62 - 0.4 * np.clip((Yw - MUS) / 140.0, 0, 1), 0, 1)
        dimg = _tone(TS[1:6], np.broadcast_to(vd, sub.shape[:2]), th)
        sub[deep] = dimg[deep]
        dfib = deep & ((np.floor(Xw / 13 + np.sin(Yw * 0.5) * 0.5) % 6) == 0) & ((np.floor(Yw) % 4) == 0)
        sub[dfib] = TS[2]
        # the vein reads as a tube: light outer edge, darker wall, a sheen along the top of the lumen
        sub[vein & (np.abs(dv - VEIN_R) < 0.7)] = VW[5]
        sub[lum & (Yw < VEIN_C - LUMEN_R + 1.6) & (Yw >= VEIN_C - LUMEN_R + 0.6)] = BL[5]
        # the scan line that reveals the cutaway
        xl = cut_x(t)
        if T.CUTAWAY[0] <= t < T.CUTAWAY[1] + 0.05:
            band = inside & (np.abs(Xc - xl) < 1.5)
            sub[band] = CY[4]
            sub[inside & (np.abs(Xc - xl - 2.5) < 0.7)] = CY[2]
    # outline above the skin and below the arm
    top_line = (Yw >= -1) & (Yw < 0)
    sub[top_line] = OUTLINE
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
        spr = cells.pick(5.0, (V_TILT[i] + V_RATE[i] * t) % 1.0, V_PSI[i], dark=bool(V_DARK[i]))
        h, ww = spr[1].shape
        gfx.paste_sprite(buf, spr, cx - ww / 2, cy - h / 2)
    # cells drawn into the needle
    from . import syringe
    if t < T.FLOW_IN - 0.5:
        return
    ow = opening_world()
    tt = min(t, T.FULL)
    for k in range(syringe.N_STREAM):
        t_k = syringe.STREAM_T0[k]
        a = (tt - (t_k - 0.5)) / 0.5
        if a < 0 or a >= 1:
            continue
        a = T.smooth(a)
        sx0, sy0 = ow[0] + 16 + 5 * (k % 3), VEIN_C + 3 * ((k % 5) - 2) * 0.7
        cx = (1 - a) * sx0 + a * ow[0]
        cy = (1 - a) * sy0 + a * ow[1] - 4 * math.sin(math.pi * a)
        if cx - ox > xl - 3:
            continue
        spr = cells.pick(5.0 if a < 0.55 else 3.5, (k * 0.37 + a) % 1.0, k % 4)
        h, ww = spr[1].shape
        gfx.paste_sprite(buf, spr, cx - ox - ww / 2, cy - oy - h / 2)


def opening_world():
    ax, ay = T.axis_point(T.D_IN, T.S_OPEN)
    return ax + 1.5 * T.N[0], ay + 1.5 * T.N[1]
