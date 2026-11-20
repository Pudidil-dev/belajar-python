"""What is on screen at time t: the basal cell dividing (seen from inside), then the new cell's whole life on a
slice of skin, in one camera move that loops.

0-20 s inside the basal cell, already dividing (engine/inside.py; it began 0.31 s before the loop point). 20-21.25 s
the camera comes back out of the two new cells; on beat 3 the top one, ours, pops up. 21.25-30 s fast-forward: the
conveyor pushes it up on every 8th note, through the spinous and granular layers, until it is a dead tile at the top
(the tiles above it peel away on the way). 30-32.2 s it lifts off with its neighbours in a flake, carried off by the
water, and the camera follows. 32.2-33.44 s the camera dives back down to the basal cell that stayed; 33.44-34.69 s
it zooms into it, through its membrane, and the next frame is the first frame.

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
    """World centre of the cell we follow (and its height p) at film time t."""
    th = t % T.TOTAL - T.HOOK[0]
    if 0.0 <= th < 3.6:                               # lifting off, it is the middle tile of the flake
        dx, dy, _ = T.flake_pose(th)
        x, y, p = TS.cell_xy(0, -T.N, 0.0)
        return x + dx, y + dy, p
    return TS.cell_xy(0, 0, T.P(t))


def flake_centre(th):
    """The flake's centre, th seconds after it lifts."""
    dx, dy, tilt = T.flake_pose(th)
    x, y, _ = TS.cell_xy(0, -T.N, 0.0)
    return x + dx, y + dy


# ---------------------------------------------------------------- the camera
def _keys():
    """The tissue camera's keys (film time), from the pop to the zoom into the next division."""
    k = [(T.POP, 0.0, 24.0, 5.3)]
    for tt, s in ((22.1, 5.1), (23.0, 4.9), (23.9, 4.8), (24.8, 4.7), (25.7, 4.7), (26.6, 4.7), (27.5, 4.6),
                  (28.4, 4.5)):
        x, y, p = TS.cell_xy(0, 0, T.P(tt))
        k.append((tt, 0.0, y + 2.0, s))
    k += [(29.3, 0.0, 117.0, 4.3), (T.HOOK[0],) + CAM_OPEN]
    for dt in (1.0, 1.7):                                # follow the flake for a moment
        fx, fy = flake_centre(dt)
        k.append((T.HOOK[0] + dt, 0.6 * fx, CAM_OPEN[1] + 0.4 * (fy - TS.cell_xy(0, -T.N, 0.0)[1]), 4.2))
    k += [(T.DIVE[0], 22.0, 112.0, 3.9), (32.9, 5.0, 60.0, 4.2), (T.ZOOM_IN[0], 0.0, 30.0, 4.75)]
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


S_IN = 26.0                                         # going in: the basal cell fills the frame
S_OUT = 26.0 * 0.66                                 # coming out: the two new cells fill it (the inside camera ends at 0.66)


def camera(t):
    """The film's camera: the keyed tissue camera, a zoom into the basal cell (at the end of the dive) and one back
    out of the two new cells (as they pop apart). In between, engine/inside.py has its own camera."""
    t = t % T.TOTAL
    if T.ZOOM_IN[0] <= t < T.ZOOM_IN[1]:
        bx, by, bs = camera_keys(T.ZOOM_IN[0])
        hy, s_end = TS.mother_y(0), S_IN
        k = T.ease_in(T.u_of(t, T.ZOOM_IN), 2.2)
    elif T.ZOOM_OUT[0] <= t < T.ZOOM_OUT[1]:
        bx, by, bs = camera_keys(T.ZOOM_OUT[1])
        hy, s_end = TS.mother_y(0) + 6.5 * T.smooth(T.div_k(t)), S_OUT   # the middle of the dividing cell
        k = 1.0 - T.ease_out(T.u_of(t, T.ZOOM_OUT), 2.2)
    else:
        return camera_keys(t)
    g = T.smooth(min(1.0, k * 1.6))
    return T.lerp(bx, 0.0, g), T.lerp(by, hy, g), bs * (s_end / bs) ** k


def camera_keys(t):
    t = min(max(t % T.TOTAL, _KT[0]), _KT[-1])
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


def _anchor_mother(t):
    return 0.0, TS.mother_y(0)


def _anchor_flake(t):
    th = t % T.TOTAL - T.HOOK[0]
    if th < 0:                                        # still in the skin: our tile at the top
        x, y, p = TS.cell_xy(0, 0, T.P(t))
        return x, y
    return flake_centre(th)


# (text, second line, anchor, start, end, side): side is where the text sits relative to the object (the captions
# inside the dividing cell are engine/inside.py's)
CAPTIONS = [
    ('NEW CELL', 'DAY 1', _anchor_hero, 21.35, 23.1, (1, -1)),
    ('NUCLEUS GONE', 'DAY 14', _anchor_hero, 24.75, 26.45, (1, -1)),
    ('DEAD SKIN CELL', 'DAY 28', _anchor_flake, 28.9, 31.9, (-1, -1)),
    ('BASAL CELL', 'DIVIDES AGAIN', _anchor_mother, 33.0, 34.6, (-1, -1)),
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
    if T.is_inside(t):
        from . import inside
        return inside.frame(T.inside_u(t))
    ts = t
    cx, cy, s = camera(t)
    c = Wd.Cam(round(cx * s) / s, round(cy * s) / s, s)
    P = T.P(t)
    buf = np.empty((H, W, 3), np.uint8)
    TS.draw_water(buf, c, t)
    gone = set()
    th = t - T.HOOK[0]
    if th > 1e-6 or t < T.POP + 1.0:                   # the flake has left the skin (as it lifts, the tiles at the
        for col, ahead in T.FLAKE:                     # top are drawn at P = 0: from then on, until the conveyor
            gone.add((col, -ahead))                    # has carried their places past the top, they are gone)
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
            TS.draw_mother(buf, c, col, P, hero=(col == 0 and (t >= T.DIVE[0] or t < T.POP + 0.05)), t=t, ts=ts)
    for col in range(c0, c1 + 1):
        b = T.base(col) + P
        for m in range(math.ceil(b - T.N), math.floor(b - T.SPLIT) + 1):
            if (col, m) in gone:
                continue
            x, y, p = TS.cell_xy(col, m, P)
            if not (y_lo < y < y_hi):
                continue
            TS.draw_cell(buf, c, x, y, p, hero=(col == 0 and m % T.N == 0), cid=(col, m % T.N), t=t, ts=ts)
    # the pop when a cell splits off (ours gets a ring of light)
    if T.POP <= t < T.POP + 0.35:
        TS.pop_ring(buf, c, 0.0, TS.mother_y(0) + 6.5, t - T.POP)
    # tiles peeling away during the climb
    for col, m, tx_ in SHED:
        for age in (t - tx_, t + T.TOTAL - tx_):
            if 0 <= age < SHED_LIFE:
                x, y, p = TS.cell_xy(col, m, T.N + m - T.base(col))
                dx, dy, tilt = shed_pose(age, col)
                TS.draw_cell(buf, c, x + dx, y + dy, T.N, ang=tilt, cid=(col, m % T.N), t=t, ts=ts,
                             fade=1.0 - T.clamp01((age - 0.8) / (SHED_LIFE - 0.8)))
    # the flake lifting off (the cell we follow is its middle tile)
    if 1e-6 < th < 4.5:
        dx, dy, tilt = T.flake_pose(th)
        curl = T.flake_curl(th)
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
    if T.ZOOM_OUT[0] <= t < T.ZOOM_OUT[0] + 0.1:          # back out through the membrane
        buf = gfx.whiten(buf, 0.45 * (1 - (t - T.ZOOM_OUT[0]) / 0.1))
    return buf


def render(t, fps=30, scale=gfx.SCALE):
    return gfx.upscale(story_frame(t), scale)


def frame(t):
    return render(t, 30, 1)


def warm():
    pass
