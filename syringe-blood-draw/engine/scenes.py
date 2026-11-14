"""What is on screen at film time t, where the camera is, and the rewind that closes the loop.

The world is fixed: the arm's skin is y = 0 and the needle enters at (0, 0). The camera is a world point plus a zoom
(timeline.camera). It opens close on the empty syringe standing upright in front of soft light rays (a glint, sparkles,
the tip flashing), pulls back while the syringe swings down to the needle angle, rides alongside it toward the arm,
settles closer on the insertion site and follows the needle in slowly, zooms in on the needle opening, follows the blood
up the needle and pulls back to the whole syringe. When it is full the needle slides out and the camera rides the
syringe back up to the showcase, where it stands upright again, full of blood, with the same glint and sparkles. After
20 s the same film is shown at the rewind's source time, so the camera path and every motion run backward, with two
brief pixel scanlines on top.
"""
import math
import numpy as np
from . import gfx, syringe, arm
from . import timeline as T
from .palette import BG, CY, INK, WHITE

W, H = gfx.W, gfx.H
_Y, _X = np.mgrid[0:H, 0:W]


def _speed(t):
    dt = 1 / 120
    return abs(T.tip_d(t + dt) - T.tip_d(t - dt)) / (2 * dt)


def background(buf, ox, oy, t):
    """Flat navy with a faint parallax dot grid, and speed streaks while the syringe races in."""
    buf[:] = BG[3]
    px, py = ox * 0.55, oy * 0.55
    gx = np.floor(_X + px) % 26
    gy = np.floor(_Y + py) % 26
    big = ((np.floor((_X + px) / 26) + np.floor((_Y + py) / 26)) % 3) == 0
    buf[(gx == 0) & (gy == 0)] = BG[5]
    plus = big & (((gx == 0) & (np.abs(gy - 0) <= 1)) | ((gy == 0) & ((gx <= 1) | (gx >= 25))))
    buf[plus] = BG[6]
    a = T.clamp01((_speed(t) - 30.0) / 160.0)
    if a <= 0:
        return
    rng = np.random.default_rng(7)
    n = 34
    wx = rng.uniform(-600, 600, n)
    wy = rng.uniform(-600, 400, n)
    ln = rng.uniform(14, 44, n)
    for i in range(n):
        if rng.uniform() > a:
            continue
        x = (wx[i] - ox * 0.8) % (W + 120) - 60
        y = (wy[i] - oy * 0.8) % (H + 120) - 60
        L = ln[i] * (0.4 + 0.6 * a)
        mk = gfx.line(x, y, x + L * T.U[0], y + L * T.U[1])
        gfx.fill(buf, mk, BG[7] if i % 3 else BG[8])


def star(buf, x, y, size, col):
    x, y = int(round(x)), int(round(y))
    pts = [(0, 0)]
    if size >= 2:
        pts += [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if size >= 3:
        pts += [(2, 0), (-2, 0), (0, 2), (0, -2)]
    for dx, dy in pts:
        if 0 <= x + dx < W and 0 <= y + dy < H:
            buf[y + dy, x + dx] = col if (dx, dy) == (0, 0) or size < 3 else (CY[4] if abs(dx) + abs(dy) == 2 else col)


def big_star(buf, x, y, r, col, mid=None):
    """A 4-point star with arms of r px (and a 1-px diagonal halo when r >= 3)."""
    x, y = int(round(x)), int(round(y))
    mid = CY[4] if mid is None else mid
    pts = [(0, 0, col)]
    for k in range(1, r + 1):
        c = col if k < r else mid
        pts += [(k, 0, c), (-k, 0, c), (0, k, c), (0, -k, c)]
    if r >= 3:
        pts += [(1, 1, mid), (-1, 1, mid), (1, -1, mid), (-1, -1, mid)]
    for dx, dy, c in pts:
        if 0 <= x + dx < W and 0 <= y + dy < H:
            buf[y + dy, x + dx] = c


def hero_backdrop(buf, ox, oy, t):
    """A soft glow and slowly turning rays behind the upright syringe; they fade as it swings away."""
    a = max(1 - T.smooth(T.u_of(t, (1.45, 2.1))), T.smooth(T.u_of(t, (17.55, 18.1))))
    if a <= 0:
        return
    cx, cy = T.M0[0] - ox, T.M0[1] - oy
    dx, dy = _X + 0.5 - cx, _Y + 0.5 - cy
    ang = np.arctan2(dy, dx) + t * 0.35
    r = np.hypot(dx, dy * 0.62)
    wedge = np.cos(ang * 10) > 0.6
    fade = np.clip(1.0 - r / 150.0, 0, 1) * a * 0.9
    buf[wedge & (fade > gfx.BAYER[:H, :W])] = BG[4]
    g = np.clip(1 - np.hypot(dx / 62.0, dy / 104.0), 0, 1) * 2.2 * a + gfx.BAYER[:H, :W]
    buf[g > 1.0] = BG[4]
    buf[g > 2.0] = BG[5]


def hero_sparkles(buf, t, cx, cy):
    """Sparkles that pop around the syringe while it is shown off: empty at the start, full at the end."""
    for i, (dx, dy, t0) in enumerate(T.TWINKLES + T.FINAL_TWINKLES):
        k = (t - t0) / 0.42
        if k < 0 or k >= 1:
            continue
        size = 1 if k < 0.15 else (3 if k < 0.45 else (2 if k < 0.75 else 1))
        star(buf, cx + dx, cy + dy, size, WHITE if i % 3 else CY[5])


def film(t, hero_fx=True):
    """The film at time t: (canvas, zoom). hero_fx=False drops the opening glint and sparkles (used by the rewind)."""
    cx, cy, z = T.camera(t)
    ox, oy = cx - W / 2, cy - H / 2
    buf = np.empty((H, W, 3), np.uint8)
    background(buf, ox, oy, t)
    hero_backdrop(buf, ox, oy, t)
    arm.draw(buf, ox, oy, t)
    ang = T.syringe_angle(t)
    tw = T.tip_world(t)
    tx, ty = tw[0] - ox, tw[1] - oy
    hl = None
    if hero_fx and T.HIGHLIGHT[0] <= t < T.HIGHLIGHT[1]:
        hl = T.lerp(214.0, -14.0, T.u_of(t, T.HIGHLIGHT))      # the glint runs from the thumb press to the tip
    if hero_fx and T.FINAL_GLINT[0] <= t < T.FINAL_GLINT[1]:
        hl = T.lerp(T.L_FULL + 10.0, -14.0, T.u_of(t, T.FINAL_GLINT))   # the same glint, up the full syringe
    syringe.draw(buf, tx, ty, T.plunger(t), T.flow_front(t), T.barrel_fill(t), hl, ang)
    syringe.draw_cells(buf, tx, ty, t, ang)
    if hero_fx and (t < T.SWING[1] or t >= T.LAND - 0.1):
        pv = T.pivot(t)
        hero_sparkles(buf, t, pv[0] - ox, pv[1] - oy)
        for span in (T.TIP_STAR, T.TIP_STAR2):
            if span[0] <= t < span[1]:
                k = T.u_of(t, span)
                r = int(round(4 * math.sin(math.pi * k)))
                if r >= 1:
                    big_star(buf, tx, ty - 1, r, WHITE)
    # a small glint rides the needle tip so it can be followed through the layers
    if T.TIP_GLINT[0] <= t < T.TIP_GLINT[1]:
        ph = (t * 2.4) % 1.0
        size = 3 if ph < 0.35 else (2 if ph < 0.7 else 1)
        star(buf, tx + 1.0, ty + 0.5, size, WHITE)
    # the opening reaches the vein: one soft ring
    if T.INSERT[1] <= t < T.INSERT[1] + 0.45:
        k = (t - T.INSERT[1]) / 0.45
        ow = T.opening_world()
        r = 2 + 14 * T.ease_out(k, 2.0)
        gfx.fill_dither(buf, gfx.ring(ow[0] - ox, ow[1] - oy, r, r, 1.0), None, CY[4], 1 - k)
    return buf, z


# ---------------------------------------------------------------- the rewind: two brief pixel scanlines
SCANLINES = ((0.20, 0.85, 70.0, 395.0), (1.75, 2.40, 410.0, 95.0))     # (tau in, tau out, y from, y to)


def rewind_fx(out, t, fps, scale):
    tau = t - T.REWIND[0]
    S = scale
    rng = np.random.default_rng(int(round(t * fps)) * 977 + 3)
    for (a, b, y0, y1) in SCANLINES:
        if not (a <= tau < b):
            continue
        k = (tau - a) / (b - a)
        yc = int(round(T.lerp(y0, y1, k)))
        for r in range(yc - 1, yc + 2):
            if 0 <= r < H:
                rows = out[r * S:(r + 1) * S]
                out[r * S:(r + 1) * S] = np.roll(rows, int(rng.integers(-4, 5)) * S, axis=1)
        for r in (yc, yc + 1):
            if 0 <= r < H:
                noise = rng.uniform(0, 1, W) < 0.55
                tone = rng.uniform(0, 1, W) < 0.35
                cols = np.where(tone[:, None], np.asarray(CY[4], np.uint8), np.asarray(INK, np.uint8))
                line = np.repeat(cols, S, 0)
                m = np.repeat(noise, S)
                out[r * S:(r + 1) * S][:, m] = line[m]
    return out


def render(t, fps=30, scale=gfx.SCALE):
    """The finished frame at video time t: (H*scale, W*scale, 3) uint8."""
    s = T.source_time(t)
    rew = t >= T.REWIND[0]
    low, z = film(s, hero_fx=not rew)
    out = gfx.camera(low, z, W / 2, H / 2, scale)
    if rew:
        out = rewind_fx(out, t, fps, scale)
    return out


def warm():
    from . import cells
    for d in (6.0, 5.0):
        cells.sprites(d)
        cells.sprites(d, True)
    cells.sprites(3.5)
    cells.sprites(2.5)
