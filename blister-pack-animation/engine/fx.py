"""Game-feel effects in canvas pixels, all on the beat: air puffs at the forming nozzles, a twinkle as each capsule
lands and a star burst when the hero does, sparks where the hot roller seals, the punch's flash and sparks, the air
blast that kicks the rejected card away, dust as a card lands on the stack, stress marks while the thumb presses, the
burst of the pop with foil flakes flying at the camera, a flash on each cut, and the tape glitch into the past.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import view as Vw
from . import stations as ST
from .palette import OUTLINE, WHITE, SPARK, AIR, FOIL, PASS, YELLOW, HEAT, STEEL, GLASS

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


def burst(buf, px, py, u, r_in=4.0, r_out=12.0, col=WHITE, n=8):
    r0, r1 = r_in + 6.0 * u, r_in + 4.0 + (r_out - r_in) * u
    size = 2 if u < 0.5 else 1
    for k in range(n):
        if k % 2 and u > 0.5:
            continue
        a = k * 2 * math.pi / n
        r = r0
        while r < r1:
            Wd.dot(buf, px + math.cos(a) * r, py - math.sin(a) * r, col, size)
            r += 1.0


def twinkle(buf, x, y, n, col=WHITE):
    if n <= 0:
        return
    for k in range(1, n + 1):
        for ex, ey in ((k, 0), (-k, 0), (0, k), (0, -k)):
            Wd.dot(buf, x + ex, y + ey, col if k < n else SPARK[1])
    Wd.dot(buf, x, y, WHITE)


def ring_dots(buf, x, y, rx, ry, n, col, size=1, phase=0.0):
    for k in range(n):
        a = phase + k * 2 * math.pi / n
        Wd.dot(buf, x + rx * math.cos(a), y + ry * math.sin(a), col, size)


# ---------------------------------------------------------------- the stages
def cloud(buf, x, y, r, u):
    """A pixel-art puff of air: a few round lobes, white, thinning out (checker) as it fades."""
    if r < 1:
        return
    lobes = ((0.0, 0.0, 1.0), (-0.85, 0.15, 0.7), (0.85, 0.2, 0.72), (-0.4, -0.55, 0.62), (0.45, -0.5, 0.6))
    i0, i1 = max(int(x - 2 * r), 0), min(int(x + 2 * r) + 1, W)
    j0, j1 = max(int(y - 2 * r), 0), min(int(y + 2 * r) + 1, H)
    if i0 >= i1 or j0 >= j1:
        return
    X, Y = XC[:, i0:i1], YC[j0:j1]
    m = np.zeros((j1 - j0, i1 - i0), bool)
    for ox, oy, k in lobes:
        m |= (X - x - ox * r) ** 2 + (Y - y - oy * r) ** 2 <= (k * r) ** 2
    v = buf[j0:j1, i0:i1]
    ring = Wd.dilate(np.pad(m, ((j0, H - j1), (i0, W - i1))))[j0:j1, i0:i1] & ~m
    v[ring] = AIR[1]
    fill_ = m if u < 0.5 else m & Wd.CHECK[j0:j1, i0:i1]
    v[fill_] = WHITE
    v[m & (Y > y + 0.25 * r) & ~fill_] = AIR[3]


def mold_fx(buf, c, S):
    """Each row that reaches the nozzles is blown into shape with a puff of air."""
    for card in range(-3, 8):
        for row in range(T.ROWS):
            t = T.cross(T.pocket_v(card, row), T.Y_FORM)
            u = (S - t) / 0.26
            if not (0 <= u < 1):
                continue
            for xc in T.COLS:
                y = T.y_of(T.pocket_v(card, row), S)
                sx, sy = Vw.to(c, xc, y, 0.0)
                cloud(buf, sx + (xc / abs(xc)) * 6 * u, sy - 4 - 6 * u, 7 + 9 * T.ease_out(u, 2.0), u)
                if u < 0.4:
                    ring_dots(buf, sx, sy, 26 + 30 * u, 10 + 12 * u, 10, WHITE, 2, u * 3)


def fill_fx(buf, c, S, hero_xy):
    for card in range(-3, 8):
        for row in range(T.ROWS):
            t = T.land_time(card, row)
            if not (0 <= S - t < 0.12):
                continue
            for col in range(2):
                if (card, row, col) in (T.MISS, T.HERO):
                    continue
                sx, sy = Vw.to(c, T.COLS[col], T.y_of(T.pocket_v(card, row), S), 0.0)
                twinkle(buf, sx + 18, sy - 6, 1 if S - t > 0.05 else 2)
    u = (S - T.T_LAND) / 0.7
    if 0 <= u < 1 and hero_xy is not None:
        x, y = hero_xy
        if u < 0.25:
            burst(buf, x, y, u / 0.25, 16, 60, SPARK[2], 12)
            star(buf, x + 26, y - 18, 10 * (1 - u * 3), spin=u * 4)
        for j in range(10):
            ph = (u * 2.2 + j * 0.37) % 1.0
            n = (0, 1, 2, 2, 1, 0)[int(ph * 6)]
            a = j * 2 * math.pi / 10 + u * 3
            twinkle(buf, x + 46 * math.cos(a), y + 22 * math.sin(a), n)


def seal_fx(buf, c, S):
    te = T.env_time(S)
    for i in range(8):
        ph = (te * 3.0 + i * 0.37) % 1.0
        x = -28.0 + i * 8.0
        sx, sy = Vw.to(c, x, T.Y_SEAL - 7.0, 1.0)
        twinkle(buf, sx + ph * 6, sy + ph * 10, (2, 1, 0, 1, 0)[int(ph * 5)], HEAT[3])


def cut_fx(buf, c, S):
    for card in (3, 2, 1, 0):
        t = T.strike_time(card)
        u = (S - t) / 0.24
        if not (0 <= u < 1):
            continue
        hw, hl = 25.0 + 1.0, 30.0 + 1.0
        corners = [(-hw, T.Y_PRESS - hl), (hw, T.Y_PRESS - hl), (-hw, T.Y_PRESS + hl), (hw, T.Y_PRESS + hl)]
        for (x, y) in corners:
            sx, sy = Vw.to(c, x, y, 1.0)
            burst(buf, sx, sy, u, 2, 16, WHITE if u < 0.5 else SPARK[1], 8)
        if u < 0.3:                                    # the cut line flashes
            ax, ay = Vw.to(c, -hw, T.Y_PRESS + hl, 0.5)
            bx, by = Vw.to(c, hw, T.Y_PRESS - hl, 0.5)
            x0, x1, y0, y1 = int(ax), int(bx), int(ay), int(by)
            for (p, q) in ((slice(max(y0, 0), min(y0 + 2, H)), slice(max(x0, 0), min(x1, W))),
                           (slice(max(y1 - 2, 0), min(y1, H)), slice(max(x0, 0), min(x1, W))),
                           (slice(max(y0, 0), min(y1, H)), slice(max(x0, 0), min(x0 + 2, W))),
                           (slice(max(y0, 0), min(y1, H)), slice(max(x1 - 2, 0), min(x1, W)))):
                buf[p, q] = WHITE
    # the kicker's blast
    t = T.strike_time(T.REJECT_CARD)
    u = (S - t - 0.02) / 0.3
    if 0 <= u < 1:
        kx, ky = ST.KICK
        sx, sy = Vw.to(c, kx - 4.0, ky, 6.0)
        for j in range(6):
            yy = sy + (j - 2.5) * 5 * (0.5 + u)
            for q in range(int(14 + 40 * (1 - u))):
                Wd.dot(buf, sx - u * 90 - q, yy, AIR[2] if (q + j) % 3 else AIR[3], 2 if q % 5 == 0 else 1)
    # dust as a card lands on the stack
    for card in (2, 0):
        t = T.strike_time(card) + T.HOP
        u = (S - t) / 0.3
        if 0 <= u < 1:
            n = len([x for x in T.stack_cards(t + 0.01)])
            sx, sy = Vw.to(c, ST.STACK_XY[0], ST.STACK_XY[1] - 30.0, 2.4 * n)
            for side in (-1, 1):
                for j in range(5):
                    Wd.dot(buf, sx + side * (70 + 10 * u + j * 5), sy - j * 3 * u, WHITE if u < 0.5 else STEEL[4], 2)


def press_fx(buf, sx, sy, S):
    """Manga stress marks around the pocket while the thumb pushes, faster as it nears the pop."""
    p = T.press(S)
    if p < 0.08:
        return
    hz = 8 + 10 * p
    if int(T.env_time(S) * hz) % 3 == 2:
        return
    for side in (-1, 1):
        for j, (ang, r) in enumerate(((-0.55, 40), (-0.1, 46), (0.35, 40))):
            a = ang + (0 if side > 0 else math.pi)
            x0, y0 = sx + math.cos(a) * r, sy - 6 + math.sin(a) * r * 0.7
            for q in range(int(6 + 8 * p)):
                Wd.dot(buf, x0 + math.cos(a) * q, y0 + math.sin(a) * q * 0.7, OUTLINE, 3)
            for q in range(int(6 + 8 * p)):
                Wd.dot(buf, x0 + math.cos(a) * q, y0 + math.sin(a) * q * 0.7, WHITE if p < 0.7 else SPARK[1], 2)


def pop_fx(buf, sx, sy, S):
    """The pop: a white flash at the hole, a burst, and foil flakes flying out at the camera."""
    if S >= 0.45:
        return
    u = S / 0.45
    if S < 0.07:
        r = 40.0 + 300.0 * S
        m = (XC - sx) ** 2 + (YC - sy) ** 2 <= r * r
        buf[m & (Wd.CHECK | (S < 0.035))] = WHITE
    burst(buf, sx, sy, u, 30, 120, WHITE, 16)
    if S < 0.12:
        star(buf, sx, sy, 46.0 * (1 - S * 5), col=WHITE, hi=SPARK[2], spin=0.4 + S * 6)
    rng = np.random.default_rng(3)
    for k in range(22):
        a = rng.uniform(0, 2 * math.pi)
        sp = rng.uniform(140, 380)
        g = 1.0 + 3.0 * u                               # coming at the camera: growing
        fx_ = sx + math.cos(a) * sp * S
        fy_ = sy + math.sin(a) * sp * S * 0.8 + 160 * S * S
        size = int(min(8, 3 + g * (1 if k % 3 else 1.6)))
        Wd.dot(buf, fx_ + 1, fy_ + 1, FOIL[0], size)
        Wd.dot(buf, fx_, fy_, FOIL[4] if k % 2 else FOIL[3], size)
        if k % 4 == 0:
            Wd.dot(buf, fx_ - size // 3, fy_ - size // 3, WHITE, max(1, size // 3))


def focus_lines(buf, cx, cy, S, r0=92.0, n=26):
    """Manga focus lines: thin white wedges pointing in at the frozen capsule, redrawn every other frame."""
    rng = np.random.default_rng(int(S * 15) * 31 + 5)
    ang = rng.uniform(0, 2 * math.pi, n)
    rin = r0 + rng.uniform(0, 40, n)
    dx, dy = XC - cx, YC - cy
    r = np.hypot(dx, dy)
    a = np.arctan2(dy, dx)
    m = np.zeros((H, W), bool)
    for i in range(n):
        da = np.abs(np.angle(np.exp(1j * (a - ang[i]))))
        m |= (r > rin[i]) & (da * r < 0.5 + (r - rin[i]) * 0.018)
    buf[m] = WHITE


def speed_trail(buf, x0, y0, x1, y1, col=WHITE):
    """Three short streaks behind something flying from (x0, y0) to (x1, y1)."""
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    if L < 4:
        return
    ux, uy = dx / L, dy / L
    for off in (-18, 0, 18):
        px_, py_ = x1 - uy * off - ux * 30, y1 + ux * off - uy * 30
        for q in range(int(min(L, 60))):
            Wd.dot(buf, px_ - ux * q, py_ - uy * q, col if q % 6 < 4 else SPARK[1], 2 if q < 20 else 1)


# ---------------------------------------------------------------- cuts and the tape glitch
def cut_flash(buf, S):
    for name, t0 in T.SHOTS[1:]:
        u = (S - t0) / 0.1
        if 0 <= u < 1:
            return gfx.whiten(buf, 0.45 * (1 - u))
    return buf


def _rew_icon():
    m = np.zeros((9, 19), bool)
    for i in range(9):
        for cc in range(9):
            if cc >= 2 * abs(i - 4):
                m[i, cc] = True
                m[i, cc + 10] = True
    return np.kron(m, np.ones((2, 2), bool))       # two triangles pointing left: rewind


REW_ICON = _rew_icon()


def rew_icon(out, scale, x0=None, y0=14):
    S_ = scale
    ic = REW_ICON
    x0 = W - 14 - ic.shape[1] if x0 is None else x0
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
    """The tape glitch: jittered rows, a rolling band of static, scanlines and the rewind icon."""
    a = T.clamp01((t - T.REW[0]) / 0.1)
    if a <= 0 or t >= T.REW[1]:
        return out
    S = scale
    out = out.copy()
    rng = np.random.default_rng(int(round(t * fps)) * 131 + 7)
    for _ in range(int(18 * a)):
        r = int(rng.integers(0, H))
        out[r * S:(r + 1) * S] = np.roll(out[r * S:(r + 1) * S], int(rng.integers(-6, 7)) * S, axis=1)
    y0 = int((t * 520) % (H + 60)) - 30
    for r in range(max(0, y0), min(H, y0 + 22)):
        out[r * S:(r + 1) * S] = np.roll(out[r * S:(r + 1) * S], int(rng.integers(-8, 9)) * S, axis=1)
    band_h = max(0, min(H, y0 + 22) - max(0, y0))
    if band_h > 0:
        noise = rng.uniform(0, 1, (band_h, W)) < 0.35 * a
        tone = rng.uniform(0, 1, (band_h, W))
        cols = np.where(tone[..., None] > 0.5, np.array(WHITE, np.uint8), np.array(GLASS[1], np.uint8))
        nm = np.repeat(np.repeat(noise, S, 0), S, 1)
        nc = np.repeat(np.repeat(cols, S, 0), S, 1)
        seg = out[max(0, y0) * S:max(0, y0) * S + band_h * S]
        seg[nm] = nc[nm]
    if S >= 2:
        out[S - 1::S] = (out[S - 1::S].astype(np.uint16) * 3 // 4).astype(np.uint8)
    if int(t * 8) % 2 == 0:
        rew_icon(out, S)
    return out
