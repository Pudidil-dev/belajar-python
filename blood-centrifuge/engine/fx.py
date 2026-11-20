"""Game-feel effects: sparkles, bursts, poofs, light rays, speed arcs, shake marks, labels, little icons, iris."""
import math
import numpy as np
from . import gfx, pixfont
from .palette import BG, MW, TL, PL, BL, GL, OUTLINE
from .timeline import clamp01, back_out, ease_out


def star(buf, x, y, size, col, col2=None):
    """A pixel sparkle: 1 = dot, 2 = plus, 3 = long plus, 4 = plus with diagonals."""
    x, y = int(round(x)), int(round(y))
    pts = [(0, 0)]
    if size >= 2:
        pts += [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if size >= 3:
        pts += [(2, 0), (-2, 0), (0, 2), (0, -2)]
    if size >= 4:
        pts += [(3, 0), (-3, 0), (0, 3), (0, -3), (1, 1), (-1, -1), (1, -1), (-1, 1)]
    for dx, dy in pts:
        xx, yy = x + dx, y + dy
        if 0 <= xx < gfx.W and 0 <= yy < gfx.H:
            buf[yy, xx] = col if (dx, dy) == (0, 0) or col2 is None or abs(dx) + abs(dy) <= 1 else col2


def twinkles(buf, t, x0, y0, x1, y1, n, seed, cols=(MW[8], PL[7]), a=1.0, avoid=None):
    rng = np.random.default_rng(seed)
    xs = rng.uniform(x0, x1, n)
    ys = rng.uniform(y0, y1, n)
    ph = rng.uniform(0, 1, n)
    per = rng.uniform(0.7, 1.6, n)
    for i in range(n):
        k = ((t / per[i]) + ph[i]) % 1.0
        b = 1 - abs(k - 0.5) * 2
        if b < 0.45 or rng.uniform() > a:
            continue
        if avoid is not None and avoid(xs[i], ys[i]):
            continue
        size = 1 + int((b - 0.45) / 0.55 * 3.0)
        star(buf, xs[i], ys[i], size, cols[i % len(cols)])


def burst(buf, t, t0, cx, cy, seed, n=26, speed=(60, 150), life=0.8, cols=(MW[8], PL[7], PL[5], TL[6])):
    """Radial particles that fly out and slow down, shrinking from stars to dots."""
    tau = t - t0
    if tau < 0 or tau > life:
        return
    rng = np.random.default_rng(seed)
    ang = rng.uniform(0, 2 * math.pi, n)
    spd = rng.uniform(*speed, n)
    lf = life * rng.uniform(0.6, 1.0, n)
    for i in range(n):
        if tau > lf[i]:
            continue
        k = tau / lf[i]
        dist = spd[i] * lf[i] * (1 - (1 - k) ** 2) * 0.55
        x = cx + math.cos(ang[i]) * dist
        y = cy + math.sin(ang[i]) * dist * 0.9
        size = 3 if k < 0.3 else (2 if k < 0.65 else 1)
        star(buf, x, y, size, cols[i % len(cols)])


def ring_wave(buf, t, t0, cx, cy, r1, life, col, ry_k=1.0):
    tau = t - t0
    if tau < 0 or tau > life:
        return
    k = ease_out(tau / life, 2.5)
    r = 4 + (r1 - 4) * k
    rg = gfx.ring(cx, cy, r, r * ry_k, 2.0 if k < 0.6 else 1.0)
    gfx.fill_dither(buf, rg, None, col, 1 - k * 0.85)


def poof(buf, t, t0, cx, cy, seed, n=12, rad=26, life=0.45):
    """Dust puffs blowing outward when something vanishes."""
    tau = t - t0
    if tau < 0 or tau > life:
        return
    rng = np.random.default_rng(seed)
    k = tau / life
    for i in range(n):
        a = 2 * math.pi * i / n + rng.uniform(-0.2, 0.2)
        d = rad * ease_out(k, 2) * rng.uniform(0.7, 1.1)
        r = (4.5 - 3.5 * k) * rng.uniform(0.8, 1.2)
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d * 1.6
        e = gfx.ellipse(x, y, r, r)
        gfx.fill_dither(buf, e, None, MW[7] if k < 0.5 else MW[4], 1 - k)


def rays(buf, cx, cy, t, n=12, col=PL[1], a=0.5, spin=0.12, rmax=400):
    """Slowly turning light rays behind a reveal (dithered wedges)."""
    if a <= 0:
        return
    Y, X = np.mgrid[0:gfx.H, 0:gfx.W]
    ang = np.arctan2(Y + 0.5 - cy, X + 0.5 - cx) + t * spin
    wedge = (np.cos(ang * n) > 0.55)
    r = np.hypot(X + 0.5 - cx, (Y + 0.5 - cy) * 0.75)
    fade = np.clip(1.0 - r / rmax, 0, 1) * a
    m = wedge & (fade > gfx.BAYER[:gfx.H, :gfx.W])
    buf[m] = col


def glow(buf, cx, cy, rx, ry, cols, strength=1.0):
    Y, X = np.mgrid[0:gfx.H, 0:gfx.W]
    r = np.hypot((X + 0.5 - cx) / rx, (Y + 0.5 - cy) / ry)
    v = np.clip(1 - r, 0, 1) * len(cols) * strength + gfx.BAYER[:gfx.H, :gfx.W]
    for i, c in enumerate(cols):
        buf[v > i + 1] = c


def dust(buf, t, n, seed, col=BG[5], speed=6.0):
    rng = np.random.default_rng(seed)
    xs = rng.uniform(0, gfx.W, n)
    ys = rng.uniform(0, gfx.H, n)
    sp = rng.uniform(0.4, 1.0, n) * speed
    for i in range(n):
        y = int((ys[i] - t * sp[i]) % gfx.H)
        x = int((xs[i] + 3 * math.sin(t * 0.7 + i)) % gfx.W)
        buf[y, x] = col


def crosses(buf, t, col=BG[3], step=30, drift=4.0):
    """Faint medical crosses on the wall, drifting slowly upward."""
    off = int(t * drift) % step
    for y in range(-step, gfx.H + step, step):
        for x in range(0, gfx.W + step, step):
            xx = x + (step // 2 if (y // step) % 2 else 0) - 5
            yy = y - off + 8
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                px, py = xx + dx, yy + dy
                if 0 <= px < gfx.W and 0 <= py < gfx.H:
                    buf[py, px] = col


def spin_icon(buf, cx, cy, t, r=10, col=TL[6], col2=TL[4], speed=5.0):
    """A turning circular arrow with an arrowhead (reads as 'spin')."""
    Y, X = np.mgrid[int(cy - r - 4):int(cy + r + 5), int(cx - r - 4):int(cx + r + 5)]
    dx, dy = X + 0.5 - cx, Y + 0.5 - cy
    rr = np.hypot(dx, dy)
    ang = (np.arctan2(dy, dx) - t * speed) % (2 * math.pi)
    band = (rr >= r - 2) & (rr <= r) & (ang < 2 * math.pi * 0.78)
    sub = buf[int(cy - r - 4):int(cy + r + 5), int(cx - r - 4):int(cx + r + 5)]
    shadow = np.zeros_like(band)
    shadow[1:, 1:] = band[:-1, :-1]
    sub[shadow & ~band] = OUTLINE
    sub[band] = col
    sub[band & (rr < r - 1)] = col2
    a = t * speed + 2 * math.pi * 0.78
    hx, hy = cx + (r - 1) * math.cos(a), cy + (r - 1) * math.sin(a)
    tx, ty = -math.sin(a), math.cos(a)                     # tangent (direction of travel)
    nx, ny = math.cos(a), math.sin(a)
    tri = gfx.polygon([(hx + tx * 5, hy + ty * 5), (hx - nx * 4.5, hy - ny * 4.5), (hx + nx * 4.5, hy + ny * 4.5)])
    gfx.fill(buf, tri.outline(), OUTLINE)
    gfx.fill(buf, tri, col)


def arrow_right(buf, cx, cy, col=MW[7], length=18):
    x0 = cx - length // 2
    body = gfx.rect(x0, cy - 1, x0 + length - 5, cy + 2)
    head = gfx.polygon([(x0 + length - 6, cy - 5), (x0 + length + 1, cy + 0.5), (x0 + length - 6, cy + 6)])
    m = body | head
    gfx.fill(buf, m.dilate(1, diag=True), OUTLINE)
    gfx.fill(buf, m, col)


def speed_arcs(buf, cx, cy, t, a, rx0=90, k=0.6, n=7, spin=7.0):
    """Motion arcs whirling around the lid while the rotor is fast."""
    if a <= 0:
        return
    rng = np.random.default_rng(3)
    for i in range(n):
        rx = rx0 + 7 * (i % 3) + rng.uniform(0, 4)
        ry = rx * k
        start = rng.uniform(0, 2 * math.pi) + t * spin * (1 + 0.15 * (i % 3))
        span = rng.uniform(0.45, 0.9)
        if rng.uniform() > a:
            continue
        ts = np.linspace(start, start + span, 26)
        pts = [(cx + rx * math.cos(q), cy + ry * math.sin(q)) for q in ts]
        visible = [p for p, q in zip(pts, ts) if math.sin(q) < 0.15]       # behind / beside the lid only
        if len(visible) < 2:
            continue
        mk = gfx.polyline(visible, 1)
        if mk.empty():
            continue
        sub = buf[mk.y0:mk.y1, mk.x0:mk.x1]
        lum = sub[..., 0].astype(int) + sub[..., 1] + sub[..., 2]
        bright = mk.m & (lum > 380)
        dark = mk.m & ~bright
        sub[bright] = MW[3]
        sub[dark] = MW[6] if i % 2 else TL[6]


def shake_marks(buf, x, y, t, a, side=1):
    """Comic vibration ticks beside the machine."""
    if a <= 0 or int(t * 30) % 3 == 0:
        return
    for k in range(3):
        if (k + int(t * 20)) % 2 and a < 0.8:
            continue
        xx = x + side * (2 + 4 * k)
        h = 10 - 3 * k
        gfx.fill(buf, gfx.rect(xx, y - h, xx + 1, y + h), MW[6] if k == 0 else MW[3])


def label(buf, t, t0, ax, ay, side, lines, line_col, text_col=MW[7], reach=16, pop=0.12):
    """Leader line from a point on the object to a small label. side = -1 left, +1 right."""
    tau = t - t0
    if tau < 0:
        return
    k = clamp01(tau / 0.16)
    ex = ax + side * reach * k
    gfx.fill(buf, gfx.ellipse(ax, ay, 2.5, 2.5).dilate(1, diag=True), OUTLINE)
    gfx.fill(buf, gfx.ellipse(ax, ay, 2.5, 2.5), line_col)
    if k > 0:
        ln = gfx.rect(min(ax, ex), ay - 0.5, max(ax, ex) + 1, ay + 1.5)
        gfx.fill(buf, ln.dilate(1, diag=True), OUTLINE)
        gfx.fill(buf, ln, line_col)
    if tau < 0.16:
        return
    tp = tau - 0.16
    off = -6 * (1 - back_out(clamp01(tp / 0.22), 2.4))
    flash = tp < 0.06
    lh = 9
    y0 = ay - (len(lines) * lh - 2) / 2.0 + off
    for i, s in enumerate(lines):
        tx = ex + side * 3
        anchor = 'lt' if side > 0 else 'rt'
        pixfont.draw_text(buf, s, tx, y0 + i * lh, MW[8] if flash else text_col, anchor=anchor,
                          outline=OUTLINE, shadow=BG[0])


def iris_mask(cx, cy, r):
    Y, X = np.mgrid[0:gfx.H, 0:gfx.W]
    return np.hypot(X + 0.5 - cx, Y + 0.5 - cy) <= r


def iris_ring(buf, cx, cy, r, col=MW[7], col2=TL[5]):
    if r <= 1:
        return
    gfx.fill(buf, gfx.ring(cx, cy, r + 1, r + 1, 1.0), col2)
    gfx.fill(buf, gfx.ring(cx, cy, r, r, 1.0), col)
