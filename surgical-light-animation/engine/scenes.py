"""What is on screen at time t: one camera move over the operating room and into the surgical light, and back.

0-1 s the hook: the operation from the side, under the light. 1-2.5 s the camera rises and pushes into the lamp
head. Then one bar per function, mostly framed with the lamp at the top and the light field at the bottom: the LEDs
and their lenses (in x-ray), the beams meeting at one spot, a head in the way, the sensors, brightness, colour
temperature, field size, endo mode (panning to the monitor), the heat sink (close on the top), the sterile handle and
its camera (close on the handle), the spring arm (pulled back to see it whole). 30-31.4 s the camera pulls back out to
the operating room, which it holds until the loop point: the last frame is the first frame.

Clean captions name the things on screen (white text, a thin line to the object, no boxes, no game marks).
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import pixfont
from . import room as RM
from . import lamp as LP
from .palette import OUTLINE, WHITE, HERO

W, H = gfx.W, gfx.H
SAFE_R = 230                                         # captions stay left of this canvas x

OR_SHOT = (15.0, 150.0, 1.6)
# (time, centre x, centre y, px per cm); interpolated as a monotone cubic in x, y and log(scale)
KEYS = (
    (0.0,) + OR_SHOT, (T.HOOK[1],) + OR_SHOT,
    (T.ZOOM_IN[1], 15.0, 212.0, 4.1), (4.8, 15.0, 211.0, 4.55),
    (5.6, 15.0, 166.0, 3.5), (12.5, 15.0, 166.0, 3.5), (14.8, 15.0, 161.0, 3.75), (15.4, 15.0, 165.0, 3.55),
    (17.5, 15.0, 166.0, 3.5), (19.8, 15.0, 168.0, 3.25),
    (20.6, 45.0, 172.0, 2.75), (22.5, 45.0, 172.0, 2.75),
    (23.6, 15.0, 220.0, 4.7), (25.0, 15.0, 219.0, 4.7),
    (25.8, 15.0, 201.0, 5.0), (27.5, 15.0, 201.0, 4.9),
    (28.5, 18.0, 236.0, 2.35), (T.OUT[0], 18.0, 236.0, 2.35),
    (T.OUT[1],) + OR_SHOT, (T.TOTAL,) + OR_SHOT,
)


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


_KT = np.array([k[0] for k in KEYS])
_KV = np.array([(k[1], k[2], math.log(k[3])) for k in KEYS])
_KM = np.stack([_pchip(_KT, _KV[:, j]) for j in range(3)], 1)


def camera(t):
    t = t % T.TOTAL
    i = int(np.clip(np.searchsorted(_KT, t, side='right') - 1, 0, len(_KT) - 2))
    h = _KT[i + 1] - _KT[i]
    u = (t - _KT[i]) / h
    h00, h10, h01, h11 = 2 * u ** 3 - 3 * u ** 2 + 1, u ** 3 - 2 * u ** 2 + u, -2 * u ** 3 + 3 * u ** 2, u ** 3 - u ** 2
    v = h00 * _KV[i] + h10 * h * _KM[i] + h01 * _KV[i + 1] + h11 * h * _KM[i + 1]
    return float(v[0]), float(v[1]), math.exp(float(v[2]))


# ---------------------------------------------------------------- captions
def _a_led(t):
    _, _, hc, tilt = LP.pose(t)
    return LP.to_world(*LP.lens_pos(4, t), hc, tilt)


def _a_spot(t):
    return LP.focus(t)


def _a_beam(t):
    bl = LP.beams(t)
    (px, py), d, L, cut, it = bl[2]
    return px + d[0] * L * 0.45, py + d[1] * L * 0.45


def _a_sensor(t):
    _, _, hc, tilt = LP.pose(t)
    return LP.to_world(LP.SENSOR_U[1], float(LP.bottom(LP.SENSOR_U[1])), hc, tilt)


def _a_lens(t):
    _, _, hc, tilt = LP.pose(t)
    return LP.to_world(*LP.lens_pos(10, t), hc, tilt)


def _a_monitor(t):
    return 66.0, 214.0


def _a_fins(t):
    _, _, hc, tilt = LP.pose(t)
    return LP.to_world(-6.0, float(LP.top(-6.0)) - 1.5, hc, tilt)


def _a_handle(t):
    _, _, hc, tilt = LP.pose(t)
    return LP.to_world(2.5, -10.0, hc, tilt)


def _a_arm(t):
    a, j2, hc, tilt = LP.pose(t)
    return LP.J1[0] + (j2[0] - LP.J1[0]) * 0.45, LP.J1[1] + (j2[1] - LP.J1[1]) * 0.45


# (text, second line, anchor, start, end, side): side is where the text sits relative to the object
CAPTIONS = (
    ('LEDS', 'EACH WITH ITS OWN LENS', _a_led, T.bar(1) + 0.3, T.bar(2) - 0.1, (1, 1)),
    ('ALL AIMED', 'AT ONE SPOT', _a_spot, T.bar(2) + 0.6, T.bar(3) - 0.1, (1, -1)),
    ('MANY ANGLES', 'NO HARD SHADOW', _a_spot, T.bar(3) + 0.7, T.bar(4) - 0.1, (1, -1)),
    ('SENSORS', 'SHIFT THE POWER', _a_sensor, T.bar(4) + 0.2, T.bar(5) - 0.1, (-1, 1)),
    ('BRIGHTNESS', 'UP TO 160,000 LUX', _a_spot, T.bar(5) + 0.2, T.bar(6) - 0.1, (1, -1)),
    ('COLOR', 'WARM TO COOL WHITE', _a_beam, T.bar(6) + 0.2, T.bar(7) - 0.1, (-1, -1)),
    ('FIELD SIZE', 'LENSES MOVE, SPOT GROWS', _a_lens, T.bar(7) + 0.2, T.bar(8) - 0.1, (1, 1)),
    ('ENDO MODE', 'DIM FOR KEYHOLE SURGERY', _a_monitor, T.bar(8) + 0.4, T.bar(9) - 0.1, (-1, -1)),
    ('HEAT SINK', 'LED HEAT LEAVES UP TOP', _a_fins, T.bar(9) + 0.5, T.bar(10) - 0.1, (-1, -1)),
    ('STERILE HANDLE', 'CAMERA INSIDE', _a_handle, T.bar(10) + 0.6, T.bar(11) - 0.1, (1, -1)),
    ('SPRING ARM', 'STAYS WHERE YOU LEAVE IT', _a_arm, T.bar(11) + 0.3, T.bar(12) - 0.1, (1, -1)),
)


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
    if side[1] > 0:
        ly = ty - 3
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
        if t0 <= t < t1:
            ax, ay = anchor(t)
            caption(buf, c, text, sub, ax, ay, t - t0, t1 - t0, side)


# ---------------------------------------------------------------- the frame
def darken(buf, k, col=(10, 22, 26)):
    """Endo mode: the room light goes down (an ordered-dither blend towards a dark teal)."""
    if k <= 0:
        return buf
    out = buf.astype(np.float32) * (1 - k) + np.array(col, np.float32) * k
    return out.astype(np.uint8)


def story_frame(t):
    t = t % T.TOTAL
    cx, cy, s = camera(t)
    c = Wd.Cam(round(cx * s) / s, round(cy * s) / s, s)
    buf = np.empty((H, W, 3), np.uint8)
    RM.draw_room(buf, c, t)
    RM.draw_body(buf, c, 'B', t)
    RM.draw_head(buf, c, 'B', t)
    RM.draw_body(buf, c, 'A', t)
    RM.draw_table(buf, c, t)
    RM.draw_arms(buf, c, 'A', t)
    RM.draw_arms(buf, c, 'B', t)
    LP.draw_arm(buf, c, t)
    e = T.endo(t)
    k = 0.38 * T.focus_dim(t) + 0.4 * e
    if k > 0:
        buf = darken(buf, k)
    RM.draw_scope_picture(buf, c, t, e)
    LP.draw_light(buf, c, t)
    RM.draw_head(buf, c, 'A', t)
    LP.light_head(buf, c, t)
    LP.draw_head(buf, c, t)
    LP.draw_effects(buf, c, t)
    draw_captions(buf, c, t)
    return buf


def render(t, fps=30, scale=gfx.SCALE):
    return gfx.upscale(story_frame(t), scale)


def frame(t):
    return render(t, 30, 1)


def warm():
    pass
