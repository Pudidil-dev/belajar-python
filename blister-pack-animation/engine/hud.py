"""The game layer: the hook question, a level banner per station (it slides in and out; there is no fixed HUD), the
player tag over the hero capsule and over its pocket, pop-up words, small typed labels next to the parts they name,
and the inspection monitor's top view of the card being checked.

Text is the 5x7 pixel font with a 1-px dark outline. Everything important stays inside the middle of the frame (the
top and bottom of a phone screen are covered by app buttons).
"""
import math
import numpy as np
from . import gfx, pixfont
from . import timeline as T
from . import machine as M
from .palette import OUTLINE, WHITE, YELLOW, REJ, PASS, HUD, SCREEN, GLASS, RED, CAPW, FOIL, HEAT, AIR

W, H = gfx.W, gfx.H
CPS = 40.0


def _txt(buf, s, x, y, col, scale=1, anchor='mm', shadow=HUD[0], font='5x7', outline=OUTLINE):
    pixfont.draw_text(buf, s, x, y, col, font=font, anchor=anchor, scale=scale, shadow=shadow, outline=outline)


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0)))
    for i in range(n + 1):
        x = int(round(x0 + (x1 - x0) * i / max(n, 1)))
        y = int(round(y0 + (y1 - y0) * i / max(n, 1)))
        if 0 <= x < W and 0 <= y < H:
            buf[y, x] = col


# ---------------------------------------------------------------- the hook question
def hook_text(buf, S):
    if not (0.0 <= S < 2.0):
        return
    for word, t0, y, col in (('HOW DID I', T.HOOK_TEXT[0], 66, WHITE), ('GET IN HERE?', T.HOOK_TEXT[1], 90, YELLOW[2])):
        if S < t0:
            continue
        sc = 3 if S - t0 < 0.07 else 2
        _txt(buf, word, W // 2, y, col, scale=sc)


# ---------------------------------------------------------------- level banners
def banners(buf, S):
    for i, t0 in enumerate(T.LV):
        a, b = t0 + 0.05, t0 + 1.55
        if not (a <= S < b):
            continue
        k_in = T.back_out(T.u_of(S, (a, a + 0.24)), 1.4)
        k_out = T.ease_in(T.u_of(S, (b - 0.2, b)), 2.0)
        x = W // 2 + int(round((1 - k_in) * 190 - k_out * 220))
        name = T.LV_NAMES[i]
        lv, rest = name[:4], name[4:]
        wl = pixfont.text_size(lv, scale=2)[0]
        wr = pixfont.text_size(rest, scale=2)[0]
        x0 = x - (wl + wr) // 2
        _txt(buf, lv, x0, 58, YELLOW[2], scale=2, anchor='lm')
        _txt(buf, rest, x0 + wl, 58, WHITE, scale=2, anchor='lm')
        # six pips under the banner: progress through the levels
        for j in range(6):
            cx = x - 25 + j * 10
            col = YELLOW[2] if j <= i else HUD[2]
            buf[72:76, max(cx - 2, 0):max(cx + 2, 0)] = col
    a, b = T.FINAL + 0.02, T.FINAL + 1.6
    if a <= S < b:
        u = S - a
        sc = 3 if u < 0.08 else 2
        jx = int(round(2 * math.sin(u * 60))) if u < 0.4 else 0
        out = T.ease_in(T.u_of(S, (b - 0.2, b)), 2.0)
        if not (b - S < 0.25 and int(S * 20) % 2):
            _txt(buf, 'FINAL BOSS', W // 2 + jx - int(out * 220), 58, REJ[1], scale=sc)


# ---------------------------------------------------------------- tags and pops
def tag(buf, c, x, y, text, S, col=YELLOW[2]):
    """A player-style tag: a word and a down marker, bobbing over a world point."""
    tx, ty = c.to(x, y)
    bob = 1 if int(T.env_time(S) * 4) % 2 else 0
    ty = ty - 6 - bob
    if not (-20 < tx < W + 20 and -20 < ty < H + 20):
        return
    tx = min(max(tx, 20), W - 20)
    _txt(buf, '~', tx, ty, col, anchor='mb')
    _txt(buf, text, tx, ty - 7, col, anchor='mb')


def pop(buf, c, text, x, y, S, t0, t1, col, scale=1, rise=6):
    if not (t0 <= S < t1):
        return
    tx, ty = c.to(x, y)
    ty -= int(rise * T.ease_out(T.u_of(S, (t0, t0 + 0.25)), 2.0))
    if t1 - S < 0.12 and int(S * 20) % 2:
        return
    sc = scale + 1 if S - t0 < 0.07 else scale
    w = pixfont.text_size(text, scale=sc)[0]
    tx = min(max(tx, w // 2 + 4), W - w // 2 - 4)
    _txt(buf, text, tx, ty, col, scale=sc)


def label(buf, c, text, anchor, S, t0, t1, off=(10, -14), col=WHITE):
    """A typed label with a thin leader line to the part it names."""
    if not (t0 <= S < t1):
        return
    ax, ay = c.to(*anchor)
    w, h = pixfont.text_size(text)
    x = int(round(min(max(ax + off[0] - (w / 2 if off[0] == 0 else (w if off[0] < 0 else 0)), 4), W - 4 - w)))
    y = int(round(min(max(ay + off[1] - h / 2, 4), H - 4 - h)))
    if 0 <= ax < W and 0 <= ay < H:
        cx = min(max(ax, x - 2), x + w + 1)
        cy = min(max(ay, y - 2), y + h + 1)
        if math.hypot(cx - ax, cy - ay) > 4:
            _line(buf, ax, ay, cx, cy, YELLOW[1])
            buf[int(ay), int(ax)] = WHITE
    n = int((S - t0) * CPS) + 1
    shown = text[:n]
    if shown.strip():
        pixfont.draw_text(buf, shown, x, y, col)


# ---------------------------------------------------------------- the inspection monitor (top view)
def _box(buf, x0, y0, x1, y1, col):
    x0, y0, x1, y1 = (int(round(v)) for v in (x0, y0, x1, y1))
    x0, x1 = max(x0, 0), min(x1, W)
    y0, y1 = max(y0, 0), min(y1, H)
    if x1 > x0 and y1 > y0:
        buf[y0:y1, x0:x1] = col


def _tick(buf, x, y, col):
    for dx, dy in ((-2, 0), (-1, 1), (0, 2), (1, 1), (2, 0), (3, -1), (4, -2)):
        for oy in (0, 1):
            xx, yy = int(x + dx), int(y + dy + oy)
            if 0 <= xx < W and 0 <= yy < H:
                buf[yy, xx] = col


def _cross(buf, x, y, col):
    for d in range(-3, 4):
        for xx, yy in ((x + d, y + d), (x + d, y - d), (x + d + 1, y + d), (x + d + 1, y - d)):
            xx, yy = int(xx), int(yy)
            if 0 <= xx < W and 0 <= yy < H:
                buf[yy, xx] = col


def monitor(buf, c, S):
    """The line-scan monitor: a live top view of the web running under the camera's scan line. Each pocket gets a
    tick (or a cross, if it is empty: the backlight shines straight through) as it crosses the line."""
    mx0, mx1, my0, my1 = M.MONITOR
    ax, ay = c.to(mx0 + 3, my1 - 3)
    bx, by = c.to(mx1 - 3, my0 + 3)
    if bx < 0 or ax > W or by < 0 or ay > H:
        return
    sw, sh = bx - ax, by - ay
    for yy in range(int(max(ay, 0)), int(min(by, H)), 2):
        buf[yy, int(max(ax, 0)):int(min(bx, W))] = SCREEN[1] if yy % 4 == 0 else SCREEN[0]
    on = T.SCAN_ON[0] - 0.15 <= S < T.SCAN_ON[1] + 0.5
    if not on:
        if c.s > 1.6:
            _txt(buf, 'READY', (ax + bx) / 2, (ay + by) / 2, SCREEN[2], anchor='mm', shadow=None, outline=None)
        return
    k = sw / 150.0                                   # screen px per mm of web
    cx = (ax + bx) / 2
    Wv = T.web(S)
    row_y = (ay + sh * 0.3, ay + sh * 0.55)
    ph = sh * 0.17
    pw = T.POCKET_HALF * 2 * k * 0.92
    for ci in (T.REJECT_CARD + 1, T.REJECT_CARD, T.HERO_CARD, T.HERO_CARD - 1):
        x0 = cx + (T.CARD * ci + Wv - T.XI) * k
        x1 = x0 + T.CARD * k
        if x1 < ax or x0 > bx:
            continue
        _box(buf, max(x0 + 1, ax), row_y[0] - ph * 0.9, min(x1 - 1, bx), row_y[1] + ph * 0.9, FOIL[1])
        for i in range(T.NPOCK):
            kk = ci * T.NPOCK + i
            px = cx + (T.pocket_u(kk) + Wv - T.XI) * k
            if px - pw / 2 < ax or px + pw / 2 > bx:
                continue
            for r, ry in enumerate(row_y):
                empty = (kk == T.MISS_K and r == 1)
                _box(buf, px - pw / 2, ry - ph / 2, px + pw / 2, ry + ph / 2, GLASS[3] if empty else GLASS[1])
                if empty:
                    if int(S * 10) % 2 == 0:
                        _box(buf, px - pw / 2 + 1, ry - ph / 2 + 1, px + pw / 2 - 1, ry + ph / 2 - 1, WHITE)
                    continue
                _box(buf, px - pw * 0.42, ry - ph * 0.28, px, ry + ph * 0.28, RED[2])
                _box(buf, px, ry - ph * 0.28, px + pw * 0.42, ry + ph * 0.28, CAPW[2])
                if kk == T.HERO_K and r == 1 and c.s > 1.8:
                    buf[int(ry - ph / 2) - 3:int(ry - ph / 2) - 1, int(px - 1):int(px + 1)] = YELLOW[2]
            t_k = T.when_web(T.XI - T.pocket_u(kk))
            if t_k is not None and t_k <= S and abs(t_k - T.SCAN_ON[0] - 0.6) < 0.7:
                ty = row_y[1] + ph * 1.25
                if kk == T.MISS_K:
                    _cross(buf, px, ty, REJ[1])
                else:
                    _tick(buf, px, ty, PASS[1])
    # the scan line
    if T.SCAN_ON[0] <= S < T.SCAN_ON[1]:
        _box(buf, cx, ay + 2, cx + 1, by - 2, SCREEN[2])
    # the verdicts
    if T.VERDICT_REJ <= S < T.VERDICT_REJ + 0.6:
        if int(S * 12) % 2 == 0:
            _box(buf, ax + 2, by - sh * 0.22, bx - 2, by - 2, REJ[0])
            _txt(buf, 'REJECT', cx, by - sh * 0.11, REJ[2], anchor='mm', shadow=None)
    if S >= T.VERDICT_PASS:
        _box(buf, ax + 2, by - sh * 0.22, bx - 2, by - 2, PASS[0])
        _txt(buf, 'PASS', cx, by - sh * 0.11, PASS[2], anchor='mm', shadow=None)


# ---------------------------------------------------------------- the seal, seen from above
SEAL_WIN = (T.XS - 0.0, 12.45, 13.3)


def seal_window(buf, S):
    """A round window: the foil seen from above while the hot roller presses the diamond pattern into it."""
    t0, t1 = SEAL_WIN[1], SEAL_WIN[2]
    if not (t0 <= S < t1):
        return
    k = T.back_out(T.u_of(S, (t0, t0 + 0.2)), 1.6) * (1 - T.ease_in(T.u_of(S, (t1 - 0.15, t1)), 2.0))
    R = 44.0 * k
    if R < 3:
        return
    cx, cy = 198.0, 150.0
    XC = (np.arange(W) + 0.5)[None, :]
    YC = (np.arange(H) + 0.5)[:, None]
    d2 = (XC - cx) ** 2 + (YC - cy) ** 2
    buf[d2 <= (R + 2) ** 2] = OUTLINE
    buf[d2 <= (R + 1) ** 2] = HEAT[1]
    inside = d2 <= R * R
    if k < 0.8:
        buf[inside] = HUD[1]
        return
    sc = 1.7                                          # inset px per mm
    shift = T.web(S) * sc
    xs = XC - cx + shift
    roller = cx + 2.0
    buf[inside] = FOIL[2]
    sealed = inside & (XC > roller + 4)
    # pockets under the foil (their domes are not pressed): smooth rounded patches with a glint
    pitch = T.PITCH * sc
    pu = ((XC - cx + shift) % pitch) - pitch / 2
    hw, hh = T.POCKET_HALF * sc * 0.88, 6.5
    pocket = np.zeros(inside.shape, bool)
    for ry in (cy - 13.0, cy + 13.0):
        dxp = np.maximum(np.abs(pu) - (hw - hh), 0.0)
        pocket |= (dxp ** 2 + (YC - ry) ** 2) <= hh * hh
    pocket &= inside
    knurl = sealed & ~pocket & ((((xs + YC) % 8) < 1.0) | (((xs - YC) % 8) < 1.0))
    buf[knurl] = FOIL[0]
    buf[sealed & ~pocket & ((((xs + YC) % 8) < 1.0) & (((xs - YC) % 8) < 1.0))] = FOIL[3]
    buf[pocket] = FOIL[3]
    ring_ = np.zeros_like(pocket)
    ring_[1:] |= pocket[:-1] & ~pocket[1:]
    ring_[:-1] |= pocket[1:] & ~pocket[:-1]
    ring_[:, 1:] |= pocket[:, :-1] & ~pocket[:, 1:]
    ring_[:, :-1] |= pocket[:, 1:] & ~pocket[:, :-1]
    buf[ring_ & inside] = FOIL[1]
    for ry in (cy - 13.0, cy + 13.0):
        buf[pocket & (np.abs(YC - ry + 3) < 1.0) & (pu < -2) & (pu > -hw + 4)] = WHITE
    # before the roller there is no foil yet: clear pockets, the capsules visible inside
    open_ = inside & (XC < roller - 4)
    buf[open_] = GLASS[0]
    op = open_ & pocket
    buf[op] = GLASS[1]
    buf[ring_ & open_] = GLASS[2]
    for ry in (cy - 13.0, cy + 13.0):
        capm = op & (np.abs(YC - ry) < 4.0) & (np.abs(pu) < hw - 3.0)
        buf[capm & (pu < 0)] = RED[2]
        buf[capm & (pu >= 0)] = CAPW[2]
        buf[capm & (np.abs(YC - ry + 2.5) < 0.8) & (pu < -2)] = RED[3]
        buf[capm & (np.abs(YC - ry + 2.5) < 0.8) & (pu > 2)] = WHITE
    # the hot roller, seen from above: a bar across the window
    bar = inside & (np.abs(XC - roller) < 4)
    buf[bar] = HEAT[1]
    buf[bar & (np.abs(XC - roller) < 1.5)] = HEAT[3]
    buf[inside & (np.abs(XC - roller - 4.5) < 0.6)] = OUTLINE
    _txt(buf, 'TOP VIEW', cx, cy + R + 8, WHITE, anchor='mt', shadow=None)


# ---------------------------------------------------------------- all of it
def draw(buf, c, S, hero):
    monitor(buf, c, S)
    seal_window(buf, S)
    Wv = T.web(S)
    # labels next to the parts
    label(buf, c, 'HEAT 110^C', ((M.HEAT_X[0] + M.HEAT_X[1]) / 2, 117.0), S, 4.15, 5.7, off=(-6, -22))
    label(buf, c, 'AIR', (M.VALVE[0] + 8.0, M.VALVE[1]), S, 4.8, 5.85, off=(14, -6))
    label(buf, c, 'BACKLIGHT', (T.XI - 40.0, 90.0), S, 10.45, 11.9, off=(0, 26))
    label(buf, c, 'FOIL', (M.FOIL_REEL[0] - 20.0, M.FOIL_REEL[1] + 10.0), S, 12.2, 13.25, off=(-8, -16))
    label(buf, c, 'HEAT SEAL', (M.SEAL_C[0] + 12.0, M.SEAL_C[1] + 10.0), S, 12.35, 13.3, off=(10, -18))
    # the player tags
    hx, hy = hero['pos']
    if hero['show']:
        tag(buf, c, hx, hy + T.CAP_R + 2.0, 'YOU', S)
    pu = T.pocket_u(T.HERO_K) + Wv
    if 5.55 <= S < 6.25 or 8.45 <= S < T.HERO_LAND - 0.04:
        tag(buf, c, pu, T.WEB_Y + 2.0, 'YOUR POCKET', S, col=YELLOW[3])
    # pops
    mu = T.pocket_u(T.MISS_K) + Wv
    pop(buf, c, 'MISS!', mu, T.WEB_Y - 12.0, S, T.MISS_TIME, T.MISS_TIME + 0.55, REJ[1])
    px_, py_ = hero['pocket']
    pop(buf, c, 'PERFECT FIT!', px_, py_ + 16.0, S, T.HERO_LAND, T.HERO_LAND + 0.75, YELLOW[2], scale=2)
    pop(buf, c, 'PASS!', px_, py_ + 14.0, S, T.VERDICT_PASS, T.VERDICT_PASS + 0.55, PASS[2], scale=2)
    for i, tb in enumerate(T.BLOCKS):
        pop(buf, c, 'BLOCKED!', px_ + (-10 if i == 0 else 10), py_ + 20.0 + 6 * i, S, tb, tb + 0.4, AIR[3])
    pop(buf, c, 'REJECT!', (M.BIN[0] + M.BIN[1]) / 2, M.BIN[3] + 14.0, S, T.BIN_LAND - 0.1, T.BIN_LAND + 0.6, REJ[1],
        scale=2)
    if hero.get('thumb') is not None and 17.9 <= S < 18.9:
        tx, ty = hero['thumb']
        label(buf, c, 'THUMB', (tx + 8.0, ty - 8.0), S, 17.9, 18.9, off=(14, 8))
    banners(buf, S)
    hook_text(buf, S)
