"""What is on screen at time t: one continuous camera over a slice of skin.

0-2.6 s the hook: the flake of dead skin (the cell we follow, and two neighbours) lifts off into the flowing water and
the camera drifts after it. 2.6-5.4 s it stops and dives back down into the skin to where the flake came from, all the
way to the basal layer. 5.5-6.25 s a basal cell stretches and pops in two; the top one is ours. 6.25-22 s the camera
rides up with it while the conveyor pushes it up on every beat: it turns spiny, then granular, loses its nucleus,
flattens into a dead tile, and its rivets switch off as the tiles above it peel away. 22-25 s the camera settles back
on the opening shot, where our tile is now the top of the skin, ready to lift off: the next frame is the first frame.

Clean captions name the things on screen (white text, a thin line to the object, no boxes, no game marks).
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import tissue as TS
from . import pixfont
from .palette import OUTLINE, WHITE, HERO, SPARK

W, H = gfx.W, gfx.H
CAM_OPEN = (0.0, 121.0, 4.3)
SAFE_R = 230                                         # captions stay left of this canvas x


def hero_xy(t):
    """World centre of the cell we follow (and its height p)."""
    if t < 3.6:                                       # in the hook it is the middle tile of the flake
        dx, dy, _ = T.flake_pose(t)
        x, y, p = TS.cell_xy(0, -T.N, 0.0)
        return x + dx, y + dy, p
    return TS.cell_xy(0, 0, T.P(t))


def flake_centre(t):
    dx, dy, tilt = T.flake_pose(t)
    x, y, _ = TS.cell_xy(0, -T.N, 0.0)
    return x + dx, y + dy


# ---------------------------------------------------------------- the camera
def _keys():
    k = [(0.0,) + CAM_OPEN]
    for tt in (1.2, 2.3):
        fx, fy = flake_centre(tt)
        k.append((tt, 0.6 * fx, CAM_OPEN[1] + 0.4 * (fy - TS.cell_xy(0, -T.N, 0.0)[1]), 4.2))
    k += [(3.0, 26.0, 116.0, 3.9), (4.2, 6.0, 64.0, 4.2), (5.2, 0.0, 26.0, 4.9), (6.25, 0.0, 24.0, 5.3),
          (7.6, 0.0, 32.0, 5.0)]
    for tt, s in ((9.0, 4.7), (10.5, 4.6), (12.0, 4.6), (13.5, 4.8), (15.0, 5.0), (16.5, 5.0), (18.0, 4.7)):
        x, y, p = TS.cell_xy(0, 0, T.P(tt))
        k.append((tt, 0.0, y + 2.0, s))
    k += [(20.0, 0.0, 112.0, 4.2), (22.0, 0.0, 118.0, 4.25), (25.0,) + CAM_OPEN]
    return k


def _pchip(ts, ys):
    """Monotone cubic (Fritsch-Carlson) slopes; zero at both ends."""
    n = len(ts)
    h = np.diff(ts)
    d = np.diff(ys) / h
    m = np.zeros(n)
    for i in range(1, n - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    return m


KEYS = _keys()
_KT = np.array([k[0] for k in KEYS])
_KV = np.array([k[1:] for k in KEYS])
_KM = np.stack([_pchip(_KT, _KV[:, j]) for j in range(3)], 1)


def camera(t):
    t = t % T.TOTAL
    i = int(np.clip(np.searchsorted(_KT, t, side='right') - 1, 0, len(_KT) - 2))
    h = _KT[i + 1] - _KT[i]
    u = (t - _KT[i]) / h
    h00, h10, h01, h11 = 2 * u ** 3 - 3 * u ** 2 + 1, u ** 3 - 2 * u ** 2 + u, -2 * u ** 3 + 3 * u ** 2, u ** 3 - u ** 2
    v = h00 * _KV[i] + h10 * h * _KM[i] + h01 * _KV[i + 1] + h11 * h * _KM[i + 1]
    return float(v[0]), float(v[1]), float(v[2])


# ---------------------------------------------------------------- the shedding tiles (time-lapse)
FLAKE_IDS = set()
for _c, _ahead in T.FLAKE:
    FLAKE_IDS.add((_c, -_ahead))          # in the hook (P = 0)
    FLAKE_IDS.add((_c, T.N - _ahead))     # the same places at the end (P = N): drawn attached, then they lift


def _shed_events():
    """(column, m, film time) for every tile that crosses p = N during the loop (apart from the flake's)."""
    ev = []
    for col in range(-24, 25):
        b = T.base(col)
        for m in range(-T.N - 2, T.N + 2):
            Px = T.N + m - b
            if 0.0 < Px <= T.N and (col, m) not in FLAKE_IDS and (col, m + T.N) not in FLAKE_IDS:
                ev.append((col, m, T.P_inv(Px)))
    return ev


SHED = _shed_events()
SHED_LIFE = 1.6


def shed_pose(age, col):
    side = 1 if (col % 3) else -1
    dx = 10.0 * age + 14.0 * age * age
    dy = 12.0 * T.ease_out(age / 1.2, 2.0) + 3.0 * age
    return dx, dy, side * 7.0 * T.ease_out(age / 1.0, 2.0)


# ---------------------------------------------------------------- captions
def _anchor_hero(t):
    x, y, p = hero_xy(t)
    return x, y


def _anchor_nucleus(t):
    x, y, p = hero_xy(t)
    hw, hh, _ = TS.dims(p)
    return x + 0.15 * hw, y + 0.05 * hh


def _anchor_granule(t):
    x, y, p = hero_xy(t)
    hw, hh, _ = TS.dims(p)
    return x - 0.35 * hw, y - 0.2 * hh


def _anchor_mother(t):
    return 0.0, TS.mother_y(0)


def _anchor_lipid(t):
    x, y, p = hero_xy(t)
    hw, hh, _ = TS.dims(p)
    return x - 0.55 * hw, y + hh + 0.5


def _anchor_rivet(t):
    P = T.P(t)
    col = 1
    b = T.base(col) + P
    m = math.ceil(b - T.N)
    x, y, p = TS.cell_xy(col, m, P)
    return TS.rivet_world(x, y, p, 3)


def _anchor_flake(t):
    if t >= 20.0:
        x, y, p = TS.cell_xy(0, 0, T.P(t))
        return x, y
    return flake_centre(t)


# (text, second line, anchor, start, end, side): side is where the text sits relative to the object
CAPTIONS = [
    ('DEAD SKIN CELL', 'DAY 28', _anchor_flake, 22.4, 27.4, (-1, -1)),
    ('BASAL CELL', None, _anchor_mother, 4.9, 6.15, (-1, -1)),
    ('NEW CELL', 'DAY 1', _anchor_hero, 6.35, 8.1, (1, -1)),
    ('NUCLEUS', None, _anchor_nucleus, 9.0, 10.9, (1, -1)),
    ('GRANULES', 'KERATOHYALIN', _anchor_granule, 11.4, 13.2, (-1, -1)),
    ('NUCLEUS GONE', 'DAY 14', _anchor_hero, 13.4, 15.2, (1, -1)),
    ('DEAD CELL', 'FULL OF KERATIN', _anchor_hero, 15.5, 17.3, (-1, -1)),
    ('LIPID GLUE', None, _anchor_lipid, 17.45, 18.95, (-1, -1)),
    ('BONDS BREAK', None, _anchor_rivet, 19.2, 21.3, (1, -1)),
]


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        k = i / max(n, 1)
        Wd.dot(buf, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, col)


def caption(buf, c, text, sub, ax, ay, age, life, side):
    """A clean caption: a dot on the object, a thin line, the text typed on; it blinks out at the end."""
    if age < 0 or age > life:
        return
    if life - age < 0.12 and int(age * 30) % 2:
        return
    ox, oy = c.to(ax, ay)
    tw = pixfont.text_size(text, scale=2)[0]
    sw = pixfont.text_size(sub, scale=1)[0] if sub else 0
    bw = max(tw, sw)
    tx = ox + side[0] * 34 - (bw if side[0] < 0 else 0)
    ty = oy + side[1] * 46
    tx = min(max(tx, 8), SAFE_R - bw)                  # clear of the app's buttons on the right
    ty = min(max(ty, 44), 372)
    grow = T.ease_out(age / 0.16, 2.0)
    lx = tx + (bw if side[0] < 0 else 0)
    ly = ty + 18 if sub else ty + 16
    ex, ey = ox + (lx - ox) * grow, oy + (ly - oy) * grow
    _line(buf, ox + 1, oy + 1, ex + 1, ey + 1, OUTLINE)
    _line(buf, ox, oy, ex, ey, WHITE)
    Wd.dot(buf, ox, oy, OUTLINE, 5)
    Wd.dot(buf, ox, oy, WHITE, 3)
    if grow < 1.0:
        return
    n = int((age - 0.16) * 48) + 1
    shown = text[:max(0, n)]
    if shown:
        pixfont.draw_text(buf, shown, tx, ty, WHITE, anchor='lt', scale=2, outline=OUTLINE)
    if sub and n > len(text):
        pixfont.draw_text(buf, sub[:n - len(text)], tx, ty + 18, HERO, anchor='lt', scale=1, outline=OUTLINE)


def draw_captions(buf, c, t):
    for text, sub, anchor, t0, t1, side in CAPTIONS:
        for tt in (t, t + T.TOTAL):
            if t0 <= tt < t1:
                at = tt if tt < T.TOTAL else tt - T.TOTAL
                ax, ay = anchor(at)
                caption(buf, c, text, sub, ax, ay, tt - t0, t1 - t0, side)


# ---------------------------------------------------------------- the frame
def story_frame(t):
    t = t % T.TOTAL
    cx, cy, s = camera(t)
    c = Wd.Cam(round(cx * s) / s, round(cy * s) / s, s)
    P = T.P(t)
    buf = np.empty((H, W, 3), np.uint8)
    TS.draw_water(buf, c, t)
    gone = set()
    if t > 1e-6:                                       # at t = 0 the flake is still part of the skin (as at 25 s)
        for col, ahead in T.FLAKE:
            gone.add((col, -ahead))                    # then it has left the skin
    surf = TS.surface_y(c, P, gone)
    TS.draw_dermis(buf, c, t)
    TS.draw_body(buf, c, P, surf)
    c0 = int(math.floor((c.cx - W / 2 / s - 14) / T.COL_W))
    c1 = int(math.ceil((c.cx + W / 2 / s + 14) / T.COL_W))
    y_lo = c.cy - H / 2 / s - 12
    y_hi = c.cy + H / 2 / s + 12
    if y_lo < 40:
        TS.draw_melanocytes(buf, c)
    for col in range(c0, c1 + 1):
        if y_lo < TS.mother_y(col) + 20:
            TS.draw_mother(buf, c, col, P, hero=(col == 0 and 5.0 < t < 6.3), t=t)
    for col in range(c0, c1 + 1):
        b = T.base(col) + P
        for m in range(math.ceil(b - T.N), math.floor(b - T.SPLIT) + 1):
            if (col, m) in gone:
                continue
            x, y, p = TS.cell_xy(col, m, P)
            if not (y_lo < y < y_hi):
                continue
            TS.draw_cell(buf, c, x, y, p, hero=(col == 0 and m % T.N == 0), cid=(col, m % T.N), t=t)
    # the pop when a cell splits off (ours gets a ring of light)
    if 6.25 <= t < 6.6:
        TS.pop_ring(buf, c, 0.0, TS.mother_y(0) + 6.5, t - 6.25)
    # tiles peeling away during the climb
    for col, m, tx_ in SHED:
        for age in (t - tx_, t + T.TOTAL - tx_):
            if 0 <= age < SHED_LIFE:
                x, y, p = TS.cell_xy(col, m, T.N + m - T.base(col))
                dx, dy, tilt = shed_pose(age, col)
                TS.draw_cell(buf, c, x + dx, y + dy, T.N, ang=tilt, cid=(col, m % T.N), t=t,
                             fade=1.0 - T.clamp01((age - 0.8) / (SHED_LIFE - 0.8)))
    # the hook's flake lifting off (the cell we follow is its middle tile)
    if 1e-6 < t < 4.5:
        dx, dy, tilt = T.flake_pose(t)
        curl = T.flake_curl(t)
        fx0, fy0, _ = TS.cell_xy(0, -T.N, 0.0)
        for col, ahead in sorted(T.FLAKE, key=lambda k: -k[1]):
            x, y, p = TS.cell_xy(col, -ahead, 0.0)
            ang = tilt + curl * col * -1.0
            a = math.radians(ang)
            rx, ry = x - fx0, y - fy0
            x2 = fx0 + dx + rx * math.cos(a) - ry * math.sin(a)
            y2 = fy0 + dy + rx * math.sin(a) + ry * math.cos(a) + abs(col) * curl * 0.25
            TS.draw_cell(buf, c, x2, y2, p, ang=ang, hero=(col == 0 and ahead == T.N), cid=(col, (-ahead) % T.N), t=t)
    draw_captions(buf, c, t)
    return buf


def render(t, fps=30, scale=gfx.SCALE):
    return gfx.upscale(story_frame(t), scale)


def frame(t):
    return render(t, 30, 1)


def warm():
    pass
