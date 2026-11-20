"""The game layer, drawn in canvas pixels on top of the world: an RPG target cursor, the lens barrel the close-up is
seen through (with reticle ticks), a progress bar that fills one segment per round of splits, a pixel alarm clock
for the time-lapse, and sparkles. No text anywhere."""
import math

import numpy as np

from . import fx, gfx, palette as P, timeline as T

W, H = gfx.W, gfx.H


def _outlined(buf, mk, col, line=P.OUTLINE):
    if mk.empty():
        return
    gfx.fill(buf, mk.dilate(1), line)
    gfx.fill(buf, mk, col)


def cursor(buf, sx, sy, t):
    """Four gold corner brackets locking onto (sx, sy), with a bobbing arrow above. Snaps in at CURSOR[0], flashes
    white at CONFIRM, then opens up and is gone as the camera dives in."""
    t0, t1 = T.CURSOR
    if not (t0 <= t < t1):
        return
    a = (t - t0) / 0.22
    d = 10 + 18 * (1 - T.back_out(a, 2.2))
    if t >= T.CONFIRM:
        z = (t - T.CONFIRM) / (t1 - T.CONFIRM)
        d = 10 + 140 * z ** 2.2
        if z > 0.8:
            return
    elif t >= t0 + 0.25:
        d += 1.0 if int((t - t0) / T.STEP) % 2 else 0.0          # a little pulse on every 16th
    flash = T.CONFIRM <= t < T.CONFIRM + 0.25 and int((t - T.CONFIRM) / 0.0625) % 2 == 0
    col, col2 = (P.WHITE, P.PL[7]) if flash else (P.PL[6], P.PL[4])
    cx, cy = int(round(sx)), int(round(sy))
    di = int(round(d))
    arm, th = 6, 2
    mk = gfx.EMPTY

    def span(u, v):
        return min(u, v), max(u, v) + 1
    for kx in (-1, 1):
        for ky in (-1, 1):
            x0, y0 = cx + kx * di, cy + ky * di                  # the bracket's outer corner
            hx, hy = span(x0, x0 - kx * (arm - 1)), span(y0, y0 - ky * (th - 1))
            vx, vy = span(x0, x0 - kx * (th - 1)), span(y0, y0 - ky * (arm - 1))
            mk = mk | gfx.rect(hx[0], hy[0], hx[1], hy[1]) | gfx.rect(vx[0], vy[0], vx[1], vy[1])
    _outlined(buf, mk, col)
    gfx.fill(buf, mk.bottom_edge(), col2)
    if t < T.CONFIRM + 0.15:                                       # the arrow over the target
        bob = int(round(1.5 + 1.5 * math.sin(2 * math.pi * 4 * (t - t0))))
        ay = cy - di - 10 - bob
        tri = gfx.polygon([(cx - 5, ay), (cx + 6, ay), (cx + 0.5, ay + 6)])
        _outlined(buf, tri, P.PL[5])
        gfx.fill(buf, gfx.rect(cx - 3, ay + 1, cx + 1, ay + 2), P.PL[7])


def lens_rim(buf, cx, cy, rad, t=0.0, ticks=True):
    """The lens barrel: a dark outline, a brushed-aluminium ring lit from the top left, a thin teal glow on the inside
    edge; reticle ticks round the outside turn slowly."""
    if rad <= 1:
        return
    x0, x1 = max(0, int(cx - rad - 12)), min(W, int(cx + rad + 13))
    y0, y1 = max(0, int(cy - rad - 12)), min(H, int(cy + rad + 13))
    if x1 <= x0 or y1 <= y0:
        return
    pxi = np.arange(x0, x1)[None, :]
    pyi = np.arange(y0, y1)[:, None]
    px, py = pxi + 0.5, pyi + 0.5
    d = np.hypot(px - cx, py - cy) - rad
    ang = np.arctan2(py - cy, px - cx)
    sub = buf[y0:y1, x0:x1]
    wid = 6.0 if rad > 40 else max(2.0, rad / 7)
    ring = (d >= 0) & (d < wid)
    lit = np.cos(ang - math.radians(-128))
    u = np.clip(d / wid, 0, 1)
    v = 0.45 + 0.35 * lit * (1 - 2 * np.abs(u - 0.5)) + 0.25 * np.exp(-((u - 0.25) / 0.18) ** 2)
    PX, PY = np.broadcast_arrays(pxi, pyi)
    th = (gfx._B4[PY % 4, PX % 4] + 0.5) / 16.0
    n = 7
    idx = np.clip(np.floor(np.clip(v, 0, 1) * (n - 1) + th), 0, n - 1).astype(np.int32)
    img = np.asarray(P.AL[2:9], np.uint8)[idx]
    sub[ring] = img[ring]
    sub[(d >= -1) & (d < 0)] = P.TL[6]
    sub[(d >= -2) & (d < -1)] = P.TL[3]
    sub[(d >= wid) & (d < wid + 1)] = P.OUTLINE
    sub[ring & (np.cos(ang - math.radians(-128)) > 0.97) & (u > 0.2) & (u < 0.5)] = P.WHITE
    if ticks and rad > 40:
        rot = t * 0.35
        k = ((ang - rot) / (2 * math.pi) * 48) % 1.0
        major = ((ang - rot) / (2 * math.pi) * 8) % 1.0
        tick = (d >= wid + 3) & (d < wid + 6) & ((k < 0.12) | (k > 0.88))
        tick_major = (d >= wid + 3) & (d < wid + 9) & ((major < 0.02) | (major > 0.98))
        sub[tick] = P.BG[6]
        sub[tick_major] = P.TL[5]


def division_bar(buf, t, cx=W // 2, y=388, segs=8, flash_t=None):
    """A gold progress bar under the lens: one segment lights up for each round of splits (1 -> 2 -> 4 ...), with a
    little rod icon in front so it reads as 'bacteria'."""
    seg_w, gap, h = 16, 3, 7
    total = segs * seg_w + (segs - 1) * gap
    x0 = cx - total // 2 + 8
    # the icon: a small rod
    icon = gfx.rrect(x0 - 22, y - 1, x0 - 9, y + h + 1, 3)
    _outlined(buf, icon, P.CELL[5])
    gfx.fill(buf, gfx.rect(x0 - 20, y + 1, x0 - 13, y + 2), P.WHITE)
    for k in range(segs):
        sx = x0 + k * (seg_w + gap)
        box = gfx.rect(sx, y, sx + seg_w, y + h)
        gfx.fill(buf, box.dilate(1), P.OUTLINE)
        on_t = T.DIVISIONS[k]
        if t >= on_t:
            fresh = t < on_t + 0.12
            gfx.fill(buf, box, P.WHITE if fresh else P.PL[5])
            if not fresh:
                gfx.fill(buf, gfx.rect(sx, y, sx + seg_w, y + 2), P.PL[7])
                gfx.fill(buf, gfx.rect(sx, y + h - 1, sx + seg_w, y + h), P.PL[3])
        else:
            gfx.fill(buf, box, P.BG[4])
            gfx.fill(buf, gfx.rect(sx, y, sx + seg_w, y + 1), P.BG[5])


def sparkle(buf, x, y, size, col=None):
    """A two-tone twinkle: white heart, gold arms (size 1 dot .. 4 long cross with diagonals)."""
    fx.star(buf, x, y, max(1, min(4, size + 1)), P.WHITE, P.PL[6] if col is None else col)


def clock(buf, cx, cy, t, turns):
    """A pixel alarm clock whose hands race round (turns of the minute hand so far), with a blinking fast-forward
    sign beside it."""
    cx, cy = int(cx), int(cy)
    face = gfx.ellipse(cx + 0.5, cy + 0.5, 11, 11)
    rim = gfx.ellipse(cx + 0.5, cy + 0.5, 13, 13)
    for sgn in (-1, 1):                                            # the two bells on top
        bx, by = cx + 0.5 + sgn * 9, cy + 0.5 - 10
        bell = gfx.ellipse(bx, by, 4.5, 3.5)
        _outlined(buf, bell, P.PL[5])
        gfx.fill(buf, gfx.rect(bx - 2, by - 2, bx, by - 1), P.PL[7])
    legs = gfx.rect(cx - 9, cy + 11, cx - 6, cy + 15) | gfx.rect(cx + 7, cy + 11, cx + 10, cy + 15)
    _outlined(buf, legs, P.TL[4])
    _outlined(buf, rim, P.TL[5])
    gfx.fill(buf, gfx.ring(cx + 0.5, cy + 0.5, 13, 13, 1).bottom_edge(), P.TL[3])
    gfx.fill(buf, face, P.MW[7])
    gfx.fill(buf, gfx.ring(cx + 0.5, cy + 0.5, 11, 11, 1), P.MW[5])
    for k in range(12):
        a = 2 * math.pi * k / 12
        r = 8.5
        x, y = cx + 0.5 + r * math.sin(a), cy + 0.5 - r * math.cos(a)
        buf[int(y), int(x)] = P.BG[2] if k % 3 == 0 else P.MW[3]
    am = 2 * math.pi * turns
    ah = am / 12 + 1.0
    for ang, ln, w in ((ah, 5.0, 2), (am, 8.0, 1)):
        ex, ey = cx + 0.5 + ln * math.sin(ang), cy + 0.5 - ln * math.cos(ang)
        gfx.fill(buf, gfx.line(cx + 0.5, cy + 0.5, ex, ey, w), P.BG[2])
    gfx.fill(buf, gfx.rect(cx, cy, cx + 1, cy + 1), P.PL[5])
    if int(t / (T.BEAT / 2)) % 2 == 0:                             # fast-forward sign
        fxx, fy = cx + 20, cy - 4
        tri1 = gfx.polygon([(fxx, fy), (fxx, fy + 9), (fxx + 5, fy + 4.5)])
        tri2 = gfx.polygon([(fxx + 5, fy), (fxx + 5, fy + 9), (fxx + 10, fy + 4.5)])
        _outlined(buf, tri1 | tri2, P.PL[5])
