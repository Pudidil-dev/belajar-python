"""Small effects: background motes, the hero droplet's glint, the tiny VIBRATING MESH tag, vibration ticks."""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from . import pixfont, micro
from .view import put

W, H = gfx.W, gfx.H
_rng = np.random.default_rng(7)
_MOTES = np.column_stack([_rng.random(36), _rng.random(36), _rng.integers(1, 3, 36), _rng.random(36)])


def motes(buf, view, t):
    """Dim 1-2 px specks drifting up through the navy (one screen height per loop, so they loop too)."""
    par_x = view.cx * view.z * 0.08
    par_y = view.cy * view.z * 0.08
    for u, v, n, ph in _MOTES:
        x = int((u * W - par_x) % W)
        y = int((v * H - n * H * (t % T.TOTAL) / T.TOTAL - par_y) % H)
        tw = 0.5 + 0.5 * math.sin(2 * math.pi * (t / T.TOTAL * 5 + ph))
        col = P.NV[6] if tw > 0.35 else P.NV[5]
        if buf[y, x].sum() < 160:                  # only over the dark background
            buf[y, x] = col
            if n > 1 and x + 1 < W and buf[y, x + 1].sum() < 160:
                buf[y, x + 1] = col


def hero_droplet(buf, view, t):
    """The droplet we follow out: a real shaded sphere up close, a twinkling glint with a short trail when small."""
    pos = T.hero_pos(t)
    if pos is None:
        return
    x, y = pos
    fade = 1.0 - T.clamp01((t - (T.RETURN[1] - 0.12)) / 0.3)
    if fade <= 0:
        return
    z = view.z
    rpx = micro.R_DROP * z
    if rpx >= 3.5:
        micro.sphere(buf, view, x, y, micro.R_DROP, fade)
        return
    px, py = view.px(x, y)
    ix, iy = int(math.floor(px)), int(math.floor(py))
    tw = 0.5 + 0.5 * math.sin(t * 2 * math.pi * 4)

    def dot(xx, yy, col):
        if 0 <= xx < W and 0 <= yy < H:
            buf[yy, xx] = col
    # short trail (where it was a moment ago, in screen space)
    prev = T.hero_pos(max(T.HERO, t - 0.06))
    if prev is not None:
        qx, qy = view.px(*prev)
        for k, c in ((1, P.CY[7]), (2, P.CY[5])):
            fx_ = px + (qx - px) * k / 2.0
            fy_ = py + (qy - py) * k / 2.0
            if abs(fx_ - px) + abs(fy_ - py) > 1.5:
                dot(int(fx_), int(fy_), c)
    if fade > 0.4:
        arm = 3 + int(round(2 * tw))
        for k in range(1, arm + 1):
            col = P.WHITE if k <= 1 else (P.MI[6] if k < arm else P.CY[7])
            for dx, dy in ((k + 1, 0), (-k, 0), (0, k + 1), (0, -k)):
                dot(ix + dx, iy + dy, col)
        for dx, dy in ((1, 1), (-1, -1), (1, -1), (-1, 1)):
            dot(ix + dx + (dx > 0), iy + dy + (dy > 0), P.CY[7])
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        dot(ix + dx, iy + dy, P.WHITE if fade > 0.5 else P.MI[5])


def mesh_label(buf, view, t):
    """Tiny 'VIBRATING MESH' tag with a leader line, typed in during the mechanism shot."""
    a, b = T.LABEL
    if t < a or t > b:
        return
    ax, ay = view.px(0.25, -4.6)
    text = 'VIBRATING MESH'
    n = min(len(text), int((t - a) / 0.035) + 1)
    blink_out = (b - t) < 0.2 and int((b - t) / 0.05) % 2 == 0
    if blink_out:
        return
    tx, ty = int(round(ax)) - 8, int(round(ay)) - 60
    tx = min(max(tx, 4), W - 4 - 84)
    # leader: down from the tag to the top of the dome
    grow = T.clamp01((t - a) / 0.25)
    y_end = int(round(ty + 9 + (ay - 3 - ty - 9) * grow))
    lx = int(round(ax))
    for yy in range(ty + 9, y_end):
        if 0 <= yy < H and 0 <= lx < W:
            buf[yy, lx] = P.SUB
    if grow >= 1.0 and 0 <= int(ay) - 2 < H:
        for dx in (-1, 0, 1):
            if 0 <= lx + dx < W:
                buf[int(ay) - 3, lx + dx] = P.INK
    pixfont.draw_text(buf, text[:n], tx, ty, P.INK, '5x7', 'lt', outline=P.NV[0])
    # underline in the accent
    if n == len(text):
        w = pixfont.text_size(text)[0]
        for xx in range(tx, tx + w):
            if 0 <= xx < W and 0 <= ty + 8 < H:
                buf[ty + 8, xx] = P.CY[6]
