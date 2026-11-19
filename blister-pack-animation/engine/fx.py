"""Game-feel effects in canvas pixels, all on the beat: the pop's burst and flying foil flakes, air puffs while the
pockets are blown, a twinkle as each capsule lands and a star when the hero lands, the shield that bounces a water drop
and an air bubble off the sealed foil, the punch's impact lines, the air jet that blasts the rejected card, stress marks
while the thumb presses, and the tape-rewind look.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import machine as M
from . import pixfont
from .palette import OUTLINE, WHITE, SPARK, AIR, FOIL, PASS, YELLOW, SCREEN, STEEL, GLASS

W, H = gfx.W, gfx.H
XC = (np.arange(W) + 0.5)[None, :]
YC = (np.arange(H) + 0.5)[:, None]


def poly(pts):
    inside = np.zeros((H, W), bool)
    X, Y = np.broadcast_arrays(XC, YC)
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        cond = (y1 > Y) != (y2 > Y)
        with np.errstate(divide='ignore', invalid='ignore'):
            xint = x1 + (Y - y1) * (x2 - x1) / (y2 - y1)
        inside ^= cond & (X < xint)
    return inside


def star(buf, cx, cy, r, col=SPARK[1], hi=SPARK[2], spin=0.0):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5 + spin
        rr = r if k % 2 == 0 else 0.46 * r
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    m = poly(pts)
    buf[Wd.dilate(m)] = OUTLINE
    buf[m] = col
    buf[m & (YC < cy - 0.15 * r) & (XC < cx + 0.1 * r)] = hi


def burst(buf, px, py, u, r_in=4.0, r_out=12.0, col=WHITE):
    """Eight short rays that fly out and thin away (the diagonals go first)."""
    r0, r1 = r_in + 6.0 * u, r_in + 4.0 + (r_out - r_in) * u
    size = 2 if u < 0.5 else 1
    for k in range(8):
        if k % 2 and u > 0.5:
            continue
        a = k * math.pi / 4
        r = r0
        while r < r1:
            Wd.dot(buf, px + math.cos(a) * r, py - math.sin(a) * r, col, size)
            r += 1.0


def twinkle(buf, x, y, n, col=WHITE):
    """A little plus-shaped sparkle of size n (0..2)."""
    if n <= 0:
        return
    for k in range(1, n + 1):
        for ex, ey in ((k, 0), (-k, 0), (0, k), (0, -k)):
            Wd.dot(buf, x + ex, y + ey, col if k < n else SPARK[1])
    Wd.dot(buf, x, y, WHITE)


def ring_dots(buf, x, y, r, n, col, size=1, phase=0.0):
    for k in range(n):
        a = phase + k * 2 * math.pi / n
        Wd.dot(buf, x + r * math.cos(a), y + r * math.sin(a), col, size)


def _drop(buf, x, y, s, col=AIR):
    """A water drop (a teardrop pointing up), about 3 mm across."""
    r = max(4.0, 2.4 * s)
    m = ((XC - x) ** 2 + (YC - y) ** 2 <= r * r) | \
        ((np.abs(XC - x) < (YC - (y - 2.6 * r)) * 0.42) & (YC < y) & (YC > y - 2.6 * r))
    buf[Wd.dilate(m)] = OUTLINE
    buf[m] = col[1]
    buf[m & (XC < x - r * 0.2) & (YC < y)] = col[3]


def _bubble(buf, x, y, s):
    """An air bubble with O2 written in it."""
    r = max(8.0, 4.4 * s)
    d2 = (XC - x) ** 2 + (YC - y) ** 2
    m = d2 <= r * r
    buf[Wd.dilate(m) & ~m] = OUTLINE
    buf[m & (d2 > (r - 1.5) ** 2)] = AIR[2]
    buf[m & (d2 <= (r - 1.5) ** 2) & Wd.CHECK] = AIR[0]
    Wd.dot(buf, x - r * 0.45, y - r * 0.45, WHITE, 2)
    pixfont.draw_text(buf, 'O2', x, y, WHITE, font='3x5', anchor='mm', outline=None)


def draw(buf, c, S, hero_xy):
    to = c.to
    # ---- the pop: a burst at the hole, foil flakes flying out
    if S < 0.35:
        u = S / 0.35
        x, y = to(*hero_xy['pop'])
        burst(buf, x, y, u, 8, 40, WHITE)
        if S < 0.07:
            star(buf, x, y, 14.0, spin=0.3)
        rng = np.random.default_rng(3)
        for k in range(12):
            a = math.radians(rng.uniform(20, 160))
            sp = rng.uniform(40, 110)
            tt = S
            fx = x + math.cos(a) * sp * tt * 1.6
            fy = y - math.sin(a) * sp * tt * 1.6 + 260 * tt * tt
            Wd.dot(buf, fx, fy, FOIL[3] if k % 2 else WHITE, 2 if k % 3 else 1)
    # ---- LV.1: air puffs as each pocket is blown
    for i, t0 in enumerate(T.PUFFS):
        u = (S - t0) / 0.3
        if 0 <= u < 1:
            xc = T.XF - T.CARD / 2 + T.pocket_u(i)
            x, y = to(xc, T.WEB_Y - T.POCKET_D * 0.5)
            ring_dots(buf, x, y, 6 + 18 * u, 10, AIR[2] if u < 0.6 else AIR[1], 2 if u < 0.4 else 1, u)
            vx, vy = to(M.VALVE[0] + 9.0, M.VALVE[1])
            for j in range(4):
                Wd.dot(buf, vx + 4 + u * 26 + j * 3, vy - 4 + (j - 1.5) * 4 * u, AIR[3], 1)
    # ---- the feeder: a twinkle as each capsule lands, a star when the hero does
    for k, t, kind in T.QUEUE:
        if kind == 'pill' and 0 <= S - t < 0.1:
            x, y = to(T.pocket_u(k) + T.web(S), T.WEB_Y + 1.5)
            twinkle(buf, x, y, 1)
    u = (S - T.HERO_LAND) / 0.6
    if 0 <= u < 1:
        x, y = to(*hero_xy['pocket'])
        if u < 0.25:
            burst(buf, x, y, u / 0.25, 12, 46, SPARK[2])
        for j in range(8):
            ph = (u * 2.0 + j * 0.37) % 1.0
            n = (0, 1, 2, 2, 1, 0)[int(ph * 6)]
            a = j * 2 * math.pi / 8 + u * 3
            twinkle(buf, x + 30 * math.cos(a), y + 22 * math.sin(a), n)
    # ---- LV.4: PASS sparkles
    u = (S - T.VERDICT_PASS) / 0.5
    if 0 <= u < 1:
        x, y = to(*hero_xy['pocket'])
        for j in range(6):
            a = j * math.pi / 3 + u * 2
            twinkle(buf, x + (16 + 10 * u) * math.cos(a), y + (12 + 8 * u) * math.sin(a), 1 if u < 0.7 else 0,
                    PASS[2])
    # ---- LV.5: a glint where the foil leaves the sealing roller
    if 12.15 <= S < 13.4:
        x, y = to(T.XS + 3.0, T.WEB_Y + 1.6)
        n = (2, 1, 0, 1)[int((S - 12.15) / T.STEP) % 4]
        twinkle(buf, x, y, n)
    # ---- the shield: a water drop and an air bubble bounce off the sealed foil
    hx, hy = hero_xy['pocket']
    fx_, fy_ = to(hx, T.WEB_Y + 1.6)
    s = c.s
    for t_hit, side, kind in ((T.BLOCKS[0], -1, 'drop'), (T.BLOCKS[1], 1, 'bubble')):
        a0, a1 = t_hit - 0.28, t_hit + 0.3
        if a0 <= S < a1:
            if S < t_hit:
                k = T.ease_in((S - a0) / 0.28, 1.6)
                ex, ey = fx_ + side * (1 - k) * 34 * s / 4, fy_ - (1 - k) * 46 * s / 4 - 4
            else:
                k = (S - t_hit) / 0.3
                ex, ey = fx_ + side * k * 30 * s / 4, fy_ - k * 40 * s / 4 + 70 * k * k - 4
            if kind == 'drop':
                _drop(buf, ex, ey, s / 4 * 2.6)
            else:
                _bubble(buf, ex, ey, s / 4 * 2.4)
        u = (S - t_hit) / 0.22
        if 0 <= u < 1:
            r = 13 * s / 4 + 8 * u                       # the shield: a dome of light over the sealed pocket
            d = np.sqrt((XC - fx_) ** 2 + (YC - fy_) ** 2)
            arc = (np.abs(d - r) < 1.2) & (YC < fy_ + 1)
            buf[arc & (Wd.CHECK | (u < 0.5))] = WHITE
            buf[(np.abs(d - r + 2.5) < 0.8) & (YC < fy_) & Wd.CHECK & (u < 0.6)] = AIR[2]
            burst(buf, fx_, fy_ - r * 0.7, u, 4, 18, AIR[3])
    # ---- LV.6: the punch strikes; the air jet; the card lands on the stack
    for tt in (T.THUNK_REJ, T.THUNK_HERO):
        u = (S - tt) / 0.22
        if 0 <= u < 1:
            for sx in (-1, 1):
                x, y = to(T.XP + sx * 54.0, T.WEB_Y + 3.0)
                for j in range(3):
                    a = math.radians(90 + sx * (20 + 25 * j))
                    r0, r1 = 3 + 8 * u, 8 + 16 * u
                    rr = r0
                    while rr < r1:
                        Wd.dot(buf, x + math.cos(a) * rr * -sx * -1, y - math.sin(a) * rr, WHITE if u < 0.5 else STEEL[4])
                        rr += 1.0
    u = (S - T.BLAST) / 0.24
    if 0 <= u < 1:
        x, y = to(M.NOZZLE[0] + 6.0, M.NOZZLE[1])
        for j in range(5):
            yy = y + (j - 2) * 3 * (0.6 + u)
            x0 = x + u * 60
            for q in range(int(10 + 22 * (1 - u))):
                Wd.dot(buf, x0 + q - 10, yy, AIR[2] if (q + j) % 3 else AIR[3])
    u = (S - T.STACK_LAND) / 0.25
    if 0 <= u < 1:
        x, y = to(T.XP, T.stack_top(len(T.STACKED)))
        for sx in (-1, 1):
            for j in range(4):
                Wd.dot(buf, x + sx * (50 * s / 2.1 + 6 * u + j * 3), y - 2 - j * 2 * u, WHITE if u < 0.5 else STEEL[4])
    # ---- the press: stress marks round the dome
    if S >= T.PRESS[0] or S < 0.0:
        p = T.press(S)
        if 0.05 < p and int(T.env_time(S) * 12) % 2 == 0:
            x, y = to(*hero_xy['pocket'])
            for sx in (-1, 1):
                for j in range(3):
                    Wd.dot(buf, x + sx * (12 + 3 * j) * s / 4.3, y - (4 + j * 3) * s / 4.3, WHITE)


# ---------------------------------------------------------------- the rewind (VHS look)
def _rew_icon():
    m = np.zeros((9, 19), bool)
    for i in range(9):
        for cc in range(9):
            if cc >= 2 * abs(i - 4):
                m[i, cc] = True
                m[i, cc + 10] = True
    return np.kron(m, np.ones((2, 2), bool))           # two triangles pointing left: rewind


REW_ICON = _rew_icon()


def rewind_strength(t):
    a, b = T.REWIND
    return T.clamp01((t - a) / 0.12) * T.clamp01((b - 0.02 - t) / 0.3)


def rew_icon(out, t, scale, x0=None, y0=12):
    S_ = scale
    ic = REW_ICON
    x0 = W - 12 - ic.shape[1] if x0 is None else x0
    ol = np.zeros((ic.shape[0] + 2, ic.shape[1] + 2), bool)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            ol[dy:dy + ic.shape[0], dx:dx + ic.shape[1]] |= ic
    for m, col, off in ((ol, OUTLINE, -1), (ic, WHITE, 0)):
        big = np.repeat(np.repeat(m, S_, 0), S_, 1)
        ys, xs = (y0 + off) * S_, (x0 + off) * S_
        seg = out[ys:ys + big.shape[0], xs:xs + big.shape[1]]
        seg[big[:seg.shape[0], :seg.shape[1]]] = col


def vhs(out, t, fps, scale):
    """Tape-rewind look on a finished frame: jittered rows, a rolling tracking band with static, scanlines, and the
    blinking rewind icon. All in whole canvas pixels, so it stays pixel art."""
    a = rewind_strength(t)
    if a <= 0:
        return out
    S = scale
    out = out.copy()
    rng = np.random.default_rng(int(round(t * fps)) * 131 + 7)
    for _ in range(int(14 * a)):
        r = int(rng.integers(0, H))
        out[r * S:(r + 1) * S] = np.roll(out[r * S:(r + 1) * S], int(rng.integers(-3, 4)) * S, axis=1)
    y0 = int((t * 260) % (H + 60)) - 30
    for r in range(max(0, y0), min(H, y0 + 16)):
        out[r * S:(r + 1) * S] = np.roll(out[r * S:(r + 1) * S], int(rng.integers(-5, 6)) * S, axis=1)
    band_h = max(0, min(H, y0 + 16) - max(0, y0))
    if band_h > 0:
        noise = rng.uniform(0, 1, (band_h, W)) < 0.32 * a
        tone = rng.uniform(0, 1, (band_h, W))
        cols = np.where(tone[..., None] > 0.5, np.array(WHITE, np.uint8), np.array(GLASS[1], np.uint8))
        nm = np.repeat(np.repeat(noise, S, 0), S, 1)
        nc = np.repeat(np.repeat(cols, S, 0), S, 1)
        seg = out[max(0, y0) * S:max(0, y0) * S + band_h * S]
        seg[nm] = nc[nm]
    thin = int((t * 410 + 200) % H)
    out[thin * S:(thin + 1) * S] = np.where(rng.uniform(0, 1, (S, W * S, 1)) < 0.5 * a,
                                             np.array(SCREEN[2], np.uint8), out[thin * S:(thin + 1) * S])
    if S >= 2:
        out[S - 1::S] = (out[S - 1::S].astype(np.uint16) * 3 // 4).astype(np.uint8)
    if a > 0.5 and int(t * 4) % 3 != 2:
        rew_icon(out, t, S)
    return out
