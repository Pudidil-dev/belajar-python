"""The blister machine, seen from the side like a side-scrolling game level (millimetres, y up).

From left to right along the web line (y = 100): the reel of clear PVC film, the heater plates, the forming mould (a
lower block with five cavities and an air chamber that clamps down on the film), the feeder (in feeder.py), the
inspection camera over a backlight with its monitor and stack light, the foil reel and the heated sealing roller over a
notched support roller, and the punch, whose bay holds the stack of finished cards, with an air nozzle that blows a
rejected card into the red bin and a winder for the leftover web. Everything stands on one long white cabinet.

back() draws what is behind the web, front() what is in front of it. Every roller turns with the web, so nothing slides.
"""
import math
import numpy as np
from . import timeline as T
from . import pix, pixfont
from .palette import (OUTLINE, WHITE, STEEL, BODY, GLASS, FOIL, HEAT, AIR, SCREEN, LAMP, REJ, PASS, YELLOW, HUD,
                      WALL)

DECK = 80.0
CAB_X = (T.XF - 300.0, T.XP + 135.0)
REEL = (T.XF - 205.0, 170.0, 34.0)          # the film reel (x, y, r)
GUIDE_F = (T.XF - 166.0, T.WEB_Y + 4.6, 4.0)
HEAT_X = (T.XF - 158.0, T.XF - 62.0)
MOULD_X = (T.XF - 55.0, T.XF + 55.0)
VALVE = (T.XF + 30.0, 150.0)
BACK_X = (T.XI - 56.0, T.XI + 56.0)          # the backlight
CAM_Y = 148.0                                # bottom of the camera head
POST_X = T.XI + 46.0
MONITOR = (T.XI - 36.0, T.XI + 36.0, 186.0, 234.0)
FOIL_REEL = (T.XS - 74.0, 194.0, 28.0)
GUIDE_S = (T.XS - 34.0, 126.0, 4.0)
SEAL_R = 19.0
SEAL_C = (T.XS, T.WEB_Y + 0.9 + SEAL_R)
SUP_R = 120.0 / (2 * math.pi)                # one notch per pocket: six notches, 20 mm apart
SUP_C = (T.XS, T.WEB_Y - SUP_R)
BAY = (T.XP - 74.0, T.XP + 96.0)
BIN = (T.XP + 56.0, T.XP + 92.0, T.STACK_Y0, 46.0)
NOZZLE = (T.XP - 64.0, 84.0)
WINDER = (T.XP + 98.0, 152.0, 20.0)


def _v(buf, w):
    return w.view(buf), np.broadcast_arrays(w.X, w.Y)


def rect(buf, c, x0, x1, y0, y1, col, outline=OUTLINE, hi=None, lo=None):
    w = pix.win(c, x0, x1, y0, y1)
    if w is None:
        return
    v, (X, Y) = _v(buf, w)
    m = (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)
    v[m] = col
    px = 1.0 / c.s
    if hi is not None:
        v[m & (Y > y1 - 1.2 * px)] = hi
    if lo is not None:
        v[m & (Y < y0 + 1.2 * px)] = lo
    if outline is not None:
        v[pix.edge(m)] = outline


def reel(buf, c, x, y, r, ang, ramp, core=STEEL):
    """A reel of film or foil, its spokes turned by ang (radians, counter-clockwise)."""
    w = pix.win(c, x - r - 1, x + r + 1, y - r - 1, y + r + 1)
    if w is None:
        return
    v, (X, Y) = _v(buf, w)
    dx, dy = X - x, Y - y
    r2 = dx * dx + dy * dy
    m = r2 <= r * r
    v[m] = ramp[1]
    rr = np.sqrt(r2)
    v[m & ((rr % 3.2) < 0.5 / c.s * 1.6) & (rr > 0.36 * r)] = ramp[0]
    lit = (dx * -0.55 + dy * 0.83) / np.maximum(rr, 1e-6)
    v[m & (lit > 0.55) & (rr > 0.7 * r) & (rr < 0.92 * r)] = ramp[3]
    v[m & (lit > 0.3) & (rr > 0.45 * r) & (rr < 0.7 * r)] = ramp[2]
    hub = r2 <= (0.34 * r) ** 2
    v[hub] = core[2]
    a = np.arctan2(dy, dx) - ang
    spoke = hub & (np.abs(((a + math.pi / 3) % (2 * math.pi / 3)) - math.pi / 3) * rr < 1.1) & (rr > 0.1 * r)
    v[spoke] = core[1]
    v[r2 <= (0.1 * r) ** 2] = core[4]
    v[pix.edge(m)] = OUTLINE
    v[pix.edge(hub)] = core[0]


def stand(buf, c, x, y0, y1, wd=4.0):
    rect(buf, c, x - wd / 2, x + wd / 2, y0, y1, STEEL[2], hi=None)
    w = pix.win(c, x - wd / 2, x + wd / 2, y0, y1)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        v[(np.abs(X - (x - wd / 2 + 0.9)) < 0.5) & (Y > y0) & (Y < y1)] = STEEL[3]


# ---------------------------------------------------------------- the moving parts' states
def clamp_gap(S):
    """How far the forming chamber is lifted off the film (mm): 6 open, 0 clamped."""
    if S < 2.0:
        return 6.0
    if S < T.CLAMP - 0.1:
        return 6.0
    if S < T.CLAMP:
        return 6.0 * (1 - T.ease_in((S - (T.CLAMP - 0.1)) / 0.1, 2.0))
    if S < T.OPEN:
        return 0.0
    return 6.0 * T.ease_out((S - T.OPEN) / 0.15, 2.0)


def strike(S):
    """How far the punch's upper die is down (0..1)."""
    k = 0.0
    for tt in (T.THUNK_REJ, T.THUNK_HERO):
        u = S - tt
        if -0.04 <= u < 0:
            k = max(k, (u + 0.04) / 0.04)
        elif 0 <= u < 0.05:
            k = 1.0
        elif 0.05 <= u < 0.2:
            k = max(k, 1 - (u - 0.05) / 0.15)
    return k


def puffing(S):
    """(pocket index 0..4, progress 0..1) of the air blast in progress, or None."""
    for i, t0 in enumerate(T.PUFFS):
        if t0 - 0.04 <= S < t0 + 0.14:
            return i, (S - t0 + 0.04) / 0.18
    return None


def scan_x(S):
    """The line-scan beam: (x it looks at, flash 0..1 as a pocket passes under it), or None when it is idle."""
    if not (T.SCAN_ON[0] <= S < T.SCAN_ON[1]):
        return None
    flash = max(T.pulse(S, t, 0.08) for t in T.SCAN_REJ + T.SCAN_HERO)
    return T.XI, flash


def lamp_state(S):
    """The stack light: 'green', or 'red' (blinking) after a reject."""
    for t0, t1 in ((T.VERDICT_REJ, T.VERDICT_REJ + 0.7), (T.THUNK_REJ, T.BIN_LAND + 0.25)):
        if t0 <= S < t1:
            return 'red' if int((S - t0) * 8) % 2 == 0 else 'off'
    return 'green'


# ---------------------------------------------------------------- behind the web
def cabinet(buf, c, S):
    x0, x1 = CAB_X
    w = pix.win(c, x0, x1, 0.0, DECK)
    if w is None:
        return
    v, (X, Y) = _v(buf, w)
    px = 1.0 / c.s
    body = (X >= x0) & (X <= x1) & (Y >= 0) & (Y <= DECK)
    bay = (X > BAY[0]) & (X < BAY[1]) & (Y > 8.0) & (Y < DECK - 3.0)
    v[body] = STEEL[1]
    # doors, 150 mm wide every 180 mm: a lighter face, a dark seam, a handle; some with vents, some with a porthole
    dx = (X - x0) % 180.0
    di = np.floor((X - x0) / 180.0)
    door = body & (dx > 15.0) & (dx < 165.0) & (Y > 12.0) & (Y < DECK - 8.0)
    v[door] = STEEL[2]
    v[door & (Y < 30.0) & pix.checker(w)] = STEEL[1]
    v[door & (dx < 15.0 + 1.6 * px) | door & (Y > DECK - 8.0 - 1.6 * px)] = STEEL[3]
    v[pix.ring(door) & body] = STEEL[0]
    v[door & (np.abs(dx - 156.0) < 1.4) & (Y > 36.0) & (Y < 54.0)] = STEEL[4]
    vents = door & ((di % 3) == 1) & (dx > 40) & (dx < 90) & (Y > 18) & (Y < 32) & (((Y - 18) % 4.0) < 1.6)
    v[vents] = STEEL[0]
    # the drive chain under the deck, running with the web
    ch = body & (Y > DECK - 9.0) & (Y < DECK - 4.5)
    v[ch] = STEEL[0]
    link = ch & ((((X - T.web(S)) % 6.0) < 3.4)) & (Y > DECK - 8.2) & (Y < DECK - 5.3)
    v[link] = STEEL[3]
    te = T.env_time(S)
    for k in range(int(math.floor((c.cx - 200 - x0) / 180.0)), int(math.floor((c.cx + 200 - x0) / 180.0)) + 1):
        if k % 2 != 0:
            continue
        hx_, hy_ = x0 + k * 180.0 + 120.0, 46.0
        if BAY[0] - 12 < hx_ < BAY[1] + 12 or hx_ > x1 - 10:
            continue
        r2 = (X - hx_) ** 2 + (Y - hy_) ** 2
        port = r2 <= 11.0 ** 2
        v[port] = HUD[0]
        ang = np.arctan2(Y - hy_, X - hx_) - T.web(S) / 9.0
        gear = (r2 <= 8.0 ** 2) & ((r2 <= 6.2 ** 2) | ((np.mod(ang, math.pi / 4) < math.pi / 8)))
        v[port & gear] = STEEL[2]
        v[port & (r2 <= 2.2 ** 2)] = STEEL[0]
        v[port & (r2 > 9.6 ** 2)] = STEEL[3]
        v[pix.ring(port)] = OUTLINE
        # a warning sticker next to it
        wx, wy = hx_ - 30.0, 52.0
        tri = (Y > wy - 6.0) & (Y < wy + 6.0) & (np.abs(X - wx) < (wy + 6.0 - Y) * 0.58)
        v[tri] = YELLOW[2]
        v[pix.edge(tri)] = OUTLINE
        v[(np.abs(X - wx) < 0.7) & (Y > wy - 2.5) & (Y < wy + 3.0) & ~(np.abs(Y - wy + 1.2) < 0.6)] = OUTLINE
    v[body & (Y < 7.0)] = STEEL[1]
    v[body & (Y < 7.0) & (Y > 5.6)] = STEEL[2]
    v[body & (Y > DECK - 3.0)] = STEEL[3]
    v[body & (Y > DECK - 1.2 * px)] = WHITE
    v[body & (Y > DECK - 3.0) & (Y < DECK - 3.0 + 1.2 * px)] = STEEL[1]
    # the punch's bay: a dark recess with a tray
    v[bay] = STEEL[0]
    v[bay & (Y > DECK - 8.0)] = HUD[1]
    v[bay & (X < BAY[0] + 3.0)] = STEEL[1]
    v[(X > BAY[0]) & (X < BAY[1]) & (Y >= T.STACK_Y0 - 3.0) & (Y < T.STACK_Y0)] = STEEL[2]
    v[pix.edge(body)] = OUTLINE
    v[pix.ring(bay) & body] = OUTLINE
    # feet
    for fx in np.arange(x0 + 30.0, x1, 160.0):
        v[(np.abs(X - fx) < 7.0) & (Y < 2.0)] = STEEL[0]
    # a control panel: screen with the output counter, two buttons, an emergency stop
    sx0, sx1, sy0, sy1 = 30.0, 78.0, 38.0, 62.0
    v[(X > sx0 - 2) & (X < sx1 + 2) & (Y > sy0 - 2) & (Y < sy1 + 2)] = STEEL[1]
    scr = (X > sx0) & (X < sx1) & (Y > sy0) & (Y < sy1)
    v[scr] = SCREEN[0]
    v[scr & (Y > sy1 - 6)] = SCREEN[1]
    for bx, col in ((90.0, LAMP[0]), (102.0, REJ[1])):
        bm = (X - bx) ** 2 + (Y - 50.0) ** 2 <= 4.2 ** 2
        v[bm] = col
        v[pix.edge(bm)] = OUTLINE
    if any(True for _ in [0]):
        ex, ey = T.XP - 96.0, 48.0
        em = (X - ex) ** 2 + (Y - ey) ** 2 <= 7.5 ** 2
        v[em] = YELLOW[2]
        v[(X - ex) ** 2 + (Y - ey) ** 2 <= 4.8 ** 2] = REJ[1]
        v[pix.edge(em)] = OUTLINE
    # the counter text and a nameplate
    n = 1200 + len(T.stack_cards(S)) + (1 if S >= T.GRAB or S < 2.0 else 0)
    tx, ty = c.to(sx0 + 2.0, sy1 - 1.0)
    if c.s >= 1.8:
        pixfont.draw_text(buf, 'OUTPUT', tx, ty, SCREEN[2], font='3x5', outline=None)
        tx2, ty2 = c.to(sx1 - 2.0, sy0 + 2.0)
        pixfont.draw_text(buf, '%05d' % n, tx2, ty2, SCREEN[2], anchor='rb', outline=None)
        px_, py_ = c.to(160.0, 14.0)
        pixfont.draw_text(buf, 'BLISTER LINE', px_, py_, BODY[0], font='3x5', anchor='lm', outline=None)


def film_reel(buf, c, S):
    x, y, r = REEL
    stand(buf, c, x, DECK, y, 6.0)
    reel(buf, c, x, y, r, T.web(S) / r, GLASS)
    gx, gy, gr = GUIDE_F
    stand(buf, c, gx, DECK, gy, 3.0)
    reel(buf, c, gx, gy, gr, -T.web(S) / gr, STEEL, core=STEEL)
    # the film running from the reel down to the guide roller
    w = pix.win(c, x, gx + gr, gy - gr, y)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        a0 = (x + 0.0, y - r)
        a1 = (gx - gr * 0.2, gy - gr + 0.4)
        m = pix.seg(X, Y, a0[0], a0[1], a1[0], a1[1], 0.4 + 0.5 / c.s)
        v[m] = GLASS[2]


def heater_lower(buf, c, S):
    x0, x1 = HEAT_X
    rect(buf, c, x0, x1, 83.0, 97.0, STEEL[1], hi=None)
    w = pix.win(c, x0, x1, 83.0, 97.0)
    if w is None:
        return
    v, (X, Y) = _v(buf, w)
    te = T.env_time(S)
    glow = (Y > 95.0) & (Y < 97.0) & (X > x0) & (X < x1)
    v[glow] = HEAT[1]
    v[glow & (Y > 96.0) & (pix.bayer(w) < 0.55 + 0.25 * math.sin(te * 9.0))] = HEAT[2]
    v[(np.abs(X - (x0 + x1) / 2) < 30) & (Y > 86) & (Y < 90) & (((X - x0) % 6.0) < 2.0)] = STEEL[0]


def mould_lower(buf, c, S):
    x0, x1 = MOULD_X
    rect(buf, c, x0, x1, 80.0, T.WEB_Y - 0.8, STEEL[2], hi=STEEL[3])
    w = pix.win(c, x0, x1, 80.0, T.WEB_Y)
    if w is None:
        return
    v, (X, Y) = _v(buf, w)
    for i in range(T.NPOCK):
        xc = T.XF - T.CARD / 2 + T.pocket_u(i)
        cav = pix.ucup(X, Y, xc - T.POCKET_HALF - 1.0, xc + T.POCKET_HALF + 1.0, T.WEB_Y - T.POCKET_D - 1.8,
                       T.WEB_Y - 0.8, 3.6)
        v[cav] = STEEL[0]
        v[pix.edge(cav) & (X < xc)] = OUTLINE
        hole = (np.abs(X - xc) < 0.7) & (Y > 80.0) & (Y < T.WEB_Y - T.POCKET_D - 1.8)
        v[hole] = STEEL[0]
    v[(Y > 83.0) & (Y < 85.0) & (X > x0) & (X < x1)] = STEEL[1]


def inspection_back(buf, c, S):
    # the post, the arm to the camera, the monitor on top, the stack light
    stand(buf, c, POST_X, DECK, 182.0, 6.0)
    rect(buf, c, T.XI - 4.0, POST_X + 3.0, 168.0, 173.0, STEEL[2], hi=STEEL[3])
    mx0, mx1, my0, my1 = MONITOR
    stand(buf, c, T.XI, 173.0, my0 + 1, 4.0)
    rect(buf, c, mx0, mx1, my0, my1, STEEL[0], hi=STEEL[1])
    rect(buf, c, mx0 + 3, mx1 - 3, my0 + 3, my1 - 3, SCREEN[0], outline=None)
    # the stack light
    lx = POST_X
    rect(buf, c, lx - 4.0, lx + 4.0, 182.0, 186.0, STEEL[1])
    st = lamp_state(S)
    for i, (on, col) in enumerate(((st == 'green', LAMP[0]), (False, LAMP[1]), (st == 'red', LAMP[2]))):
        y0 = 186.0 + 6.0 * i
        rect(buf, c, lx - 3.5, lx + 3.5, y0, y0 + 6.0, col if on else _dim(col), outline=OUTLINE)
        if on:
            w = pix.win(c, lx - 3.5, lx + 3.5, y0, y0 + 6.0)
            if w is not None:
                v, (X, Y) = _v(buf, w)
                v[(X < lx - 1.0) & (X > lx - 2.6) & (Y > y0 + 1.5) & (Y < y0 + 4.5)] = WHITE
    rect(buf, c, lx - 4.5, lx + 4.5, 204.0, 207.0, STEEL[1])
    # the backlight under the web
    x0, x1 = BACK_X
    rect(buf, c, x0, x1, 84.0, 92.0, STEEL[1])
    w = pix.win(c, x0, x1, 84.0, 92.0)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        top = (X > x0 + 1) & (X < x1 - 1) & (Y > 89.5) & (Y < 92.0)
        v[top] = BODY[3]
        v[top & (Y > 91.0)] = WHITE


def _dim(col):
    return tuple(int(v * 0.35 + 12) for v in col)


def sealing_back(buf, c, S):
    x, y, r = FOIL_REEL
    stand(buf, c, x, DECK, y, 6.0)
    reel(buf, c, x, y, r, T.web(S) / r, FOIL)
    gx, gy, gr = GUIDE_S
    stand(buf, c, gx, DECK, gy, 3.0)
    # the foil from the reel down to the guide roller
    w = pix.win(c, x, gx + gr, gy, y)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        m = pix.seg(X, Y, x + r * 0.55, y - r * 0.83, gx - gr * 0.9, gy + gr * 0.35, 0.45 + 0.5 / c.s)
        v[m] = FOIL[3]
    reel(buf, c, gx, gy, gr, -T.web(S) / gr, STEEL)
    # the notched support roller under the web (turns with it: a pocket sits in each notch)
    sx, sy = SUP_C
    w = pix.win(c, sx - SUP_R - 1, sx + SUP_R + 1, sy - SUP_R - 1, sy + SUP_R + 1)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        dx, dy = X - sx, Y - sy
        r2 = dx * dx + dy * dy
        m = r2 <= SUP_R ** 2
        alpha = (T.web(S) - (T.XS - 10.0)) / SUP_R
        beta = np.arctan2(dx, dy)                    # angle from the top, clockwise
        rel = np.mod(beta - alpha + math.pi / 6, math.pi / 3) - math.pi / 6
        notch = m & (np.abs(rel) * SUP_R < T.POCKET_HALF + 1.0) & (np.sqrt(r2) > SUP_R - T.POCKET_D - 1.2)
        v[m] = STEEL[2]
        v[m & (dx * -0.5 + dy * 0.86 > SUP_R * 0.45)] = STEEL[3]
        v[notch] = STEEL[0]
        v[r2 <= 4.0 ** 2] = STEEL[1]
        v[pix.edge(m & ~notch)] = OUTLINE


def punch_back(buf, c, S):
    for sx in (T.XP - 64.0, T.XP + 64.0):
        rect(buf, c, sx - 4.0, sx + 4.0, DECK, 178.0, STEEL[1], hi=None)
    rect(buf, c, T.XP - 72.0, T.XP + 72.0, 168.0, 180.0, STEEL[2], hi=STEEL[3], lo=STEEL[1])
    rect(buf, c, T.XP - 13.0, T.XP + 13.0, 140.0, 168.0, STEEL[1], hi=None)
    rect(buf, c, T.XP - 15.0, T.XP + 15.0, 150.0, 154.0, STEEL[2])
    # the lower die: two blocks, the card drops through the gap between them
    for x0, x1 in ((T.XP - 63.0, T.XP - 51.5), (T.XP + 51.5, T.XP + 63.0)):
        rect(buf, c, x0, x1, 86.0, T.WEB_Y - 0.8, STEEL[2], hi=STEEL[3])
    # the scrap winder for the leftover web
    x, y, r = WINDER
    stand(buf, c, x, DECK, y, 5.0)
    reel(buf, c, x, y, r, -T.web(S) / r, GLASS)
    w = pix.win(c, T.XP + 50.0, x, T.WEB_Y - 1, y)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        m = pix.seg(X, Y, T.XP + 52.0, T.WEB_Y - 0.4, x - r * 0.98, y - r * 0.2, 0.45 + 0.5 / c.s)
        v[m] = GLASS[2]


def reject_bin(buf, c, S):
    """The red reject bin in the punch's bay (old rejects inside)."""
    bx0, bx1, by0, by1 = BIN
    rect(buf, c, bx0, bx1, by0, by1, REJ[1], hi=REJ[2])
    w = pix.win(c, bx0, bx1, by0, by1)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        v[(X > bx0 + 3) & (X < bx1 - 3) & (Y > by1 - 4) & (Y < by1 - 1.5)] = REJ[0]
        mid = (bx0 + bx1) / 2
        my = (by0 + by1) / 2
        xm = (np.abs(np.abs(X - mid) - np.abs(Y - my)) < 1.2) & (np.abs(X - mid) < 7) & (np.abs(Y - my) < 7)
        v[xm] = WHITE


def back(buf, c, S):
    film_reel(buf, c, S)
    heater_lower(buf, c, S)
    mould_lower(buf, c, S)
    inspection_back(buf, c, S)
    sealing_back(buf, c, S)
    punch_back(buf, c, S)
    cabinet(buf, c, S)
    reject_bin(buf, c, S)


# ---------------------------------------------------------------- in front of the web
def heater_upper(buf, c, S):
    x0, x1 = HEAT_X
    rect(buf, c, x0, x1, 103.0, 117.0, STEEL[1], hi=STEEL[2])
    w = pix.win(c, x0, x1, 103.0, 140.0)
    if w is None:
        return
    v, (X, Y) = _v(buf, w)
    te = T.env_time(S)
    glow = (Y > 103.0) & (Y < 105.0) & (X > x0) & (X < x1)
    v[glow] = HEAT[1]
    v[glow & (Y < 104.0) & (pix.bayer(w) < 0.55 + 0.25 * math.sin(te * 9.0 + 1.0))] = HEAT[2]
    v[(Y > 109) & (Y < 113) & (X > x0 + 6) & (X < x1 - 6) & (((X - x0) % 8.0) < 3.0)] = STEEL[0]
    # heat rising off the plate: little wiggles
    for i in range(6):
        hx = x0 + 10.0 + i * 15.5
        ph = (te * 0.9 + i * 0.37) % 1.0
        hy = 118.0 + ph * 18.0
        xo = math.sin(ph * 9.0 + i) * 1.6
        m = (np.abs(X - hx - xo) < 0.55 + 0.4 / c.s) & (np.abs(Y - hy) < 1.6)
        v[m] = HEAT[3] if ph < 0.6 else HEAT[2]


def mould_upper(buf, c, S):
    x0, x1 = MOULD_X
    g = clamp_gap(S)
    y0 = T.WEB_Y + 1.0 + g
    rect(buf, c, x0, x1, y0, y0 + 19.0, STEEL[2], hi=STEEL[3], lo=STEEL[1])
    # the air line and valve, with a pressure gauge
    vx, vy = VALVE
    rect(buf, c, T.XF - 2.5, T.XF + 2.5, y0 + 19.0, vy, STEEL[1], outline=OUTLINE)
    rect(buf, c, T.XF - 2.5, vx, vy - 2.5, vy + 2.5, STEEL[1], outline=OUTLINE)
    rect(buf, c, vx - 8.0, vx + 8.0, vy - 7.0, vy + 7.0, STEEL[2], hi=STEEL[3])
    w = pix.win(c, x0, vx + 14, y0, vy + 16)
    if w is None:
        return
    v, (X, Y) = _v(buf, w)
    gx, gy = vx, vy + 11.0
    r2 = (X - gx) ** 2 + (Y - gy) ** 2
    gm = r2 <= 5.5 ** 2
    v[gm] = BODY[3]
    v[pix.edge(gm)] = OUTLINE
    kick = sum(T.pulse(S, t0, 0.25) for t0 in T.PUFFS)
    a = math.radians(150 - 110 * min(1.0, 0.15 + 0.85 * kick))
    nd = gm & (np.abs((X - gx) * math.sin(a) - (Y - gy) * math.cos(a)) < 0.55) & \
        (((X - gx) * math.cos(a) + (Y - gy) * math.sin(a)) > -0.5)
    v[nd] = REJ[1]
    # air channels down to each cavity, and the blast while a pocket is blown
    pf = puffing(S)
    for i in range(T.NPOCK):
        xc = T.XF - T.CARD / 2 + T.pocket_u(i)
        ch = (np.abs(X - xc) < 1.0) & (Y > y0 + 1.0) & (Y < y0 + 15.0)
        v[ch] = STEEL[0]
        if pf is not None and pf[0] == i:
            u = pf[1]
            for j in range(3):
                cy = y0 + 15.0 - ((u * 3 + j / 3.0) % 1.0) * 14.0
                chev = (np.abs(Y - cy + np.abs(X - xc) * 0.6) < 0.7) & (np.abs(X - xc) < 3.0)
                v[chev] = AIR[2]


def inspection_front(buf, c, S):
    # the camera head and lens, with a ring light
    x = T.XI
    rect(buf, c, x - 14.0, x + 14.0, CAM_Y, CAM_Y + 19.0, BODY[1], hi=BODY[3], lo=BODY[0])
    rect(buf, c, x - 5.5, x + 5.5, CAM_Y - 7.0, CAM_Y, STEEL[1], hi=None)
    rect(buf, c, x - 7.0, x + 7.0, CAM_Y - 9.0, CAM_Y - 7.0, WHITE, outline=OUTLINE)
    w = pix.win(c, x - 14.0, x + 14.0, CAM_Y, CAM_Y + 19.0)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        v[(X > x - 9) & (X < x - 2) & (Y > CAM_Y + 8) & (Y < CAM_Y + 13)] = HUD[0]
        v[(X > x + 4) & (X < x + 8) & (Y > CAM_Y + 13) & (Y < CAM_Y + 16)] = PASS[1] if scan_x(S) else _dim(PASS[1])
    # the beam: a cone of light onto the pocket being checked
    sc = scan_x(S)
    if sc is not None and (sc[1] > 0 or int(S * 30) % 2 == 0):
        sx = sc[0]
        w = pix.win(c, min(x, sx) - 12.0, max(x, sx) + 12.0, T.WEB_Y - 8.0, CAM_Y - 9.0)
        if w is not None:
            v, (X, Y) = _v(buf, w)
            k = (Y - T.WEB_Y) / (CAM_Y - 9.0 - T.WEB_Y)
            cx = sx + (x - sx) * k
            half = 9.5 * (1 - k) + 5.5 * k
            cone = (k > 0) & (k < 1) & (np.abs(X - cx) < half)
            ck = pix.checker(w)
            v[cone & ck & ((np.floor(Y * c.s) % 2) == 0)] = SCREEN[2]
            v[cone & (np.abs(np.abs(X - cx) - half) < 0.6 / c.s * 1.2)] = SCREEN[2]


def sealing_front(buf, c, S):
    gx, gy, gr = GUIDE_S
    # the foil from the guide roller down to the web, under the sealing roller
    w = pix.win(c, gx - gr, T.XS + 2, T.WEB_Y, gy + gr)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        m = pix.seg(X, Y, gx + gr * 0.2, gy - gr * 0.95, T.XS - 1.5, T.WEB_Y + 1.1, 0.45 + 0.5 / c.s)
        v[m] = FOIL[3]
    # the heated, knurled sealing roller, on an arm from above
    x, y = SEAL_C
    rect(buf, c, x - 3.0, x + 3.0, y, y + 44.0, STEEL[1], outline=OUTLINE)
    rect(buf, c, x - 12.0, x + 12.0, y + 38.0, y + 52.0, STEEL[2], hi=STEEL[3])
    w = pix.win(c, x - SEAL_R - 2, x + SEAL_R + 2, y - SEAL_R - 2, y + SEAL_R + 22)
    if w is None:
        return
    v, (X, Y) = _v(buf, w)
    te = T.env_time(S)
    dx, dy = X - x, Y - y
    r2 = dx * dx + dy * dy
    rr = np.sqrt(r2)
    m = r2 <= SEAL_R ** 2
    v[m] = STEEL[2]
    v[m & (dx * -0.5 + dy * 0.86 > SEAL_R * 0.35)] = STEEL[3]
    v[m & (dx * -0.5 + dy * 0.86 < -SEAL_R * 0.5)] = STEEL[1]
    rim = m & (rr > SEAL_R - 3.0)
    gamma = -T.web(S) / SEAL_R
    tooth = ((np.arctan2(dy, dx) - gamma) * 40 / (2 * math.pi)) % 1.0 < 0.5
    v[rim] = HEAT[1]
    v[rim & tooth] = HEAT[2]
    v[rim & tooth & (rr > SEAL_R - 1.2) & (dy > 0)] = HEAT[3]
    hub = r2 <= 6.0 ** 2
    v[hub] = STEEL[1]
    v[r2 <= 2.5 ** 2] = STEEL[3]
    v[pix.edge(m)] = OUTLINE
    # heat shimmer above the roller
    for i in range(4):
        ph = (te * 1.1 + i * 0.29) % 1.0
        hx = x - 12.0 + i * 8.0 + math.sin(ph * 8 + i) * 1.5
        hy = y + SEAL_R + 2.0 + ph * 16.0
        v[(np.abs(X - hx) < 0.55 + 0.4 / c.s) & (np.abs(Y - hy) < 1.5) & ~m] = HEAT[3] if ph < 0.6 else HEAT[2]


def punch_front(buf, c, S):
    k = strike(S)
    yd = T.WEB_Y + 3.5 - 2.6 * k
    rect(buf, c, T.XP - 4.0, T.XP + 4.0, yd + 16.0, 140.0, STEEL[3], outline=OUTLINE)
    rect(buf, c, T.XP - 53.0, T.XP + 53.0, yd, yd + 16.0, STEEL[2], hi=STEEL[3], lo=STEEL[1])
    w = pix.win(c, T.XP - 53.0, T.XP + 53.0, yd, yd + 16.0)
    if w is not None:
        v, (X, Y) = _v(buf, w)
        v[(Y > yd + 5) & (Y < yd + 8) & (np.abs(X - T.XP) < 46)] = YELLOW[1]
        v[(Y > yd + 5) & (Y < yd + 8) & (np.abs(X - T.XP) < 46) & ((((X - T.XP) + 100) % 8.0) < 4.0)] = OUTLINE
    # the air nozzle (it blasts the rejected card into the bin)
    nx, ny = NOZZLE
    rect(buf, c, nx - 8.0, nx + 5.0, ny - 2.0, ny + 2.0, STEEL[2], outline=OUTLINE)
    rect(buf, c, nx - 9.0, nx - 6.0, DECK, ny + 2.0, STEEL[1], outline=OUTLINE)


def front(buf, c, S):
    heater_upper(buf, c, S)
    mould_upper(buf, c, S)
    inspection_front(buf, c, S)
    sealing_front(buf, c, S)
    punch_front(buf, c, S)
