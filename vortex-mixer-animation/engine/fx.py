"""Game-feel effects in canvas pixels: an impact star when the tube lands in the cup, item-get sparkles when the liquid
is mixed, a star when the tube clinks into the rack, three rating stars at the end, and the tape-rewind look that
closes the loop.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from .palette import OUTLINE, WHITE, SPARK, CYAN, HUD, MIXED

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


def draw(buf, cam, t, tc):
    if tc is not None:
        u = (t - T.CONTACT) / 0.18                              # the tube lands in the cup
        if 0 <= u < 1:
            x, y = tc.to(0, -1.0)
            burst(buf, x, y, u, 10, 26, WHITE)
        u = (t - T.MIXED_AT) / 1.5                              # item get: sparkles all round the tube
        if 0 <= u < 1:
            from . import tube as TB
            for j in range(9):
                ph = (u * 2.2 + j * 0.37) % 1.0
                n = (0, 1, 2, 2, 1, 0)[int(ph * 6)]
                a = j * 2 * math.pi / 9 + u * 2
                x, y = tc.to((TB.RO + 7) * math.cos(a), TB.H0 * 0.55 + 26 * math.sin(a))
                twinkle(buf, x, y, n)
            if u < 0.15:
                x, y = tc.to(0, TB.H0 * 0.5)
                burst(buf, x, y, u / 0.15, 30, 70, SPARK[2])
    u = (t - T.RACK_CLINK) / 0.2
    if 0 <= u < 1:
        from . import lab
        x, y = cam.to(lab.RACK_HOLES[lab.RACK_SLOT], 29)
        burst(buf, x, y, u, 4, 14, WHITE)
    for i, t0 in enumerate(T.STARS):                             # three rating stars
        if t >= t0 and t < T.REWIND[0]:
            u = t - t0
            r = 15.0 * (1.35 - 0.35 * T.ease_out(min(u / 0.18, 1), 2.0)) if u < 0.18 else 15.0
            cx = W / 2 + (i - 1) * 42
            cy = 70 - (6 if i == 1 else 0)
            star(buf, cx, cy, r, spin=0.0)
            if u < 0.2:
                burst(buf, cx, cy, u / 0.2, 16, 30, SPARK[2])


# ---------------------------------------------------------------- the rewind (VHS look) that closes the loop
def _rew_icon():
    m = np.zeros((9, 19), bool)
    for i in range(9):
        for c in range(9):
            if c >= 2 * abs(i - 4):
                m[i, c] = True
                m[i, c + 10] = True
    return np.kron(m, np.ones((2, 2), bool))


REW_ICON = _rew_icon()


def rewind_strength(t):
    return T.clamp01((t - T.REWIND[0]) / 0.12) * T.clamp01((T.REWIND[1] - 0.05 - t) / 0.35)


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
        cols = np.where(tone[..., None] > 0.5, np.array(WHITE, np.uint8), np.array(CYAN[0], np.uint8))
        nm = np.repeat(np.repeat(noise, S, 0), S, 1)
        nc = np.repeat(np.repeat(cols, S, 0), S, 1)
        seg = out[max(0, y0) * S:max(0, y0) * S + band_h * S]
        seg[nm] = nc[nm]
    thin = int((t * 410 + 200) % H)
    out[thin * S:(thin + 1) * S] = np.where(rng.uniform(0, 1, (S, W * S, 1)) < 0.5 * a,
                                             np.array(CYAN[2], np.uint8), out[thin * S:(thin + 1) * S])
    if S >= 2:
        out[S - 1::S] = (out[S - 1::S].astype(np.uint16) * 3 // 4).astype(np.uint8)
    if a > 0.5 and int(t * 4) % 3 != 2:
        ic = REW_ICON
        x0, y0i = W - 12 - ic.shape[1], 12
        ol = np.zeros((ic.shape[0] + 2, ic.shape[1] + 2), bool)
        for dy in (0, 1, 2):
            for dx in (0, 1, 2):
                ol[dy:dy + ic.shape[0], dx:dx + ic.shape[1]] |= ic
        for m, col, off in ((ol, OUTLINE, -1), (ic, WHITE, 0)):
            big = np.repeat(np.repeat(m, S, 0), S, 1)
            ys, xs = (y0i + off) * S, (x0 + off) * S
            seg = out[ys:ys + big.shape[0], xs:xs + big.shape[1]]
            seg[big[:seg.shape[0], :seg.shape[1]]] = col
    return out
