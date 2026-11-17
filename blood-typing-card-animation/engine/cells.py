"""Cellular view (cell space, 1 unit = 1 canvas px at zoom 1):

  * red blood cells: round red discs with a pale centre, flat shading, gold tabs on the rim = A markers;
  * the Anti-A antibody: a small cyan, multi-armed icon (six arms with forked tips); only the two tips that make the
    bridge are highlighted;
  * the Anti-B antibody: the same kind of icon in mint, with square tips that fit B markers, not the gold A tabs;
  * a gold pixel flash at a contact point, for three frames, when a tip binds.
Cells never merge: every cell is drawn whole, and bridges keep them a fixed distance apart.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import put

W, H = gfx.W, gfx.H


def background(pen, t):
    buf = pen.buf
    buf[...] = P.RED[0]
    bx = (0, 0, W, H)
    U, V = pen.grid(bx)
    gx, gy = np.floor((U + t * 3) / 9), np.floor((V - t * 2) / 9)
    spec = ((gx * 7 + gy * 13) % 17 == 0) & (np.floor(U + t * 3) % 9 == 0) & (np.floor(V - t * 2) % 9 == 0)
    put(buf, bx, spec, P.RED[1])


def cell(pen, x, y, r=T.R_CELL, tabs=True):
    if pen.view.box(x - r - 4, y - r - 4, x + r + 4, y + r + 4, 1) is None:
        return
    if tabs:
        for k in range(T.TAB_N):
            a = math.radians(k * 360.0 / T.TAB_N)
            ca, sa = math.cos(a), math.sin(a)
            w = 2.0
            pts = [(x + ca * (r - 1) - sa * w, y + sa * (r - 1) + ca * w),
                   (x + ca * (r + T.TAB_LEN) - sa * w, y + sa * (r + T.TAB_LEN) + ca * w),
                   (x + ca * (r + T.TAB_LEN) + sa * w, y + sa * (r + T.TAB_LEN) - ca * w),
                   (x + ca * (r - 1) + sa * w, y + sa * (r - 1) - ca * w)]
            bx, m = pen.poly(pts)
            if bx is not None and m.any():
                put(pen.buf, bx, m, P.GOLD[1])
                if pen.z >= 0.8:
                    pen.outline(bx, m, P.GOLD[0])
                    tx, ty = x + ca * (r + T.TAB_LEN - 1), y + sa * (r + T.TAB_LEN - 1)
                    pen.dot(tx, ty, P.GOLD[2])
    bx, m, U, V = pen.disc(x, y, r)
    if bx is None:
        return
    dx, dy = U - x, V - y
    rr = np.sqrt(dx * dx + dy * dy)
    put(pen.buf, bx, m, P.RED[3])
    put(pen.buf, bx, m & (rr > r * 0.62) & (dx + dy > r * 0.35), P.RED[2])       # shadow side
    put(pen.buf, bx, m & (rr > r * 0.66) & (dx + dy < -r * 0.55), P.RED[4])      # lit rim
    put(pen.buf, bx, m & (rr <= r * 0.46), P.RED[4])                             # the dimple ...
    put(pen.buf, bx, m & ((dx + 1.0) ** 2 + (dy + 1.0) ** 2 <= (r * 0.36) ** 2), P.RED[5])   # ... pale centre
    pen.outline(bx, m, P.RED[1])


def antibody(pen, x, y, rot, ramp, hi=(), square=False):
    """Six arms with forked (or square) tips; hi = indices of the arms whose tips are highlighted."""
    z = pen.z
    for k in range(6):
        a = rot + k * math.pi / 3
        ca, sa = math.cos(a), math.sin(a)
        nx, ny = -sa, ca
        w = 1.3
        arm = [(x + ca * 3 + nx * w, y + sa * 3 + ny * w), (x + ca * 14 + nx * w, y + sa * 14 + ny * w),
               (x + ca * 14 - nx * w, y + sa * 14 - ny * w), (x + ca * 3 - nx * w, y + sa * 3 - ny * w)]
        col = ramp[3] if k in hi else ramp[2]
        bx, m = pen.poly(arm)
        if bx is not None:
            put(pen.buf, bx, m, col)
        ex, ey = x + ca * 14, y + sa * 14
        if square:                                        # a square socket: fits B markers, not the gold A tabs
            pts = [(ex + nx * 3.2, ey + ny * 3.2), (ex + nx * 3.2 + ca * 5, ey + ny * 3.2 + sa * 5),
                   (ex + nx * 1.6 + ca * 5, ey + ny * 1.6 + sa * 5), (ex + nx * 1.6 + ca * 1.6, ey + ny * 1.6 + sa * 1.6),
                   (ex - nx * 1.6 + ca * 1.6, ey - ny * 1.6 + sa * 1.6), (ex - nx * 1.6 + ca * 5, ey - ny * 1.6 + sa * 5),
                   (ex - nx * 3.2 + ca * 5, ey - ny * 3.2 + sa * 5), (ex - nx * 3.2, ey - ny * 3.2)]
            bx, m = pen.poly(pts)
            if bx is not None:
                put(pen.buf, bx, m, col)
        else:                                             # a fork: two prongs that close round an A tab
            for s in (1, -1):
                b = a + s * 0.62
                tip = (ex + math.cos(b) * 5.6, ey + math.sin(b) * 5.6)
                n = int(max(2, 6 * z))
                for j in range(n + 1):
                    f = j / n
                    pen.dot(ex + (tip[0] - ex) * f, ey + (tip[1] - ey) * f, col, 2 if z >= 0.9 else 1)
        if k in hi and z >= 0.7:
            pen.dot(x + ca * 17.5, y + sa * 17.5, P.WHITE)
    bx, m, U, V = pen.disc(x, y, 4.2)
    if bx is not None:
        put(pen.buf, bx, m, ramp[2])
        put(pen.buf, bx, m & ((U - x + 1) ** 2 + (V - y + 1) ** 2 < 2.2), ramp[3])
        pen.outline(bx, m, ramp[0])


def flash(pen, x, y, t, t0):
    """Gold pixel flash at a contact point for three frames."""
    f = T.frame(t) - T.frame(t0)
    if not 0 <= f < T.FLASH_FRAMES:
        return
    i, j = pen.view.px(x, y)
    i, j = int(i), int(j)
    for (di, dj), c in (((0, 0), P.WHITE), ((-1, 0), P.GOLD[2]), ((1, 0), P.GOLD[2]), ((0, -1), P.GOLD[2]),
                        ((0, 1), P.GOLD[2]), ((-2, 0), P.GOLD[1]), ((2, 0), P.GOLD[1]), ((0, -2), P.GOLD[1]),
                        ((0, 2), P.GOLD[1])):
        if f == 2 and abs(di) + abs(dj) == 2:
            continue
        if 0 <= i + di < W and 0 <= j + dj < H:
            pen.buf[j + dj, i + di] = c


def scene(pen, t):
    background(pen, t)
    if T.which_drop(t) == 'A':
        _anti_a(pen, t)
    else:
        _anti_b(pen, t)


def _group(pen, t):
    gx, gy = T.GROUP
    for (x, y) in T.GROUP_CELLS:
        cell(pen, gx + x, gy + y)
    for i, j in T.GROUP_BRIDGES:
        (x0, y0), (x1, y1) = T.GROUP_CELLS[i], T.GROUP_CELLS[j]
        antibody(pen, gx + (x0 + x1) / 2, gy + (y0 + y1) / 2, math.atan2(y1 - y0, x1 - x0), P.CYAN)


def _anti_a(pen, t):
    _group(pen, t)
    for k, (x, y) in enumerate(T.LOOSE):
        cell(pen, x + 2 * math.sin(t * 0.9 + k), y + 2 * math.cos(t * 0.8 + k))
    for k in range(len(T.NEIGHBOURS)):
        x, y = T.neighbour_pos(k, t)
        cell(pen, x, y)
    cell(pen, *T.C1)
    cx2, cy2 = T.c2_pos(t)
    cell(pen, cx2, cy2)
    for k, (_, _, tb) in enumerate(T.NEIGHBOURS):
        if t >= tb - 0.6:
            (x, y), rot = T.bridge_antibody(k, t)
            antibody(pen, x, y, rot, P.CYAN)
    if t >= T.AB_IN:
        (x, y), rot = T.hero_antibody(t)
        antibody(pen, x, y, rot, P.CYAN, hi=(0, 3))
    c1x = T.C1[0] + T.R_CELL + T.TAB_LEN
    flash(pen, c1x, T.C1[1], t, T.BIND1)
    flash(pen, T.C2_END[0] - T.R_CELL - T.TAB_LEN, T.C2_END[1], t, T.BIND2)


def _anti_b(pen, t):
    e = t - T.CUT_B
    for k, (x, y) in enumerate(T.LOOSE):
        cell(pen, x + 2 * math.sin(t * 0.9 + k), y + 2 * math.cos(t * 0.8 + k))
    for k in range(len(T.NEIGHBOURS)):
        x, y = T.neighbour_pos(k, t, bridged=False)
        cell(pen, x + 4 * e * math.cos(k), y + 4 * e * math.sin(k))
    cell(pen, T.C1[0] - 5 * e, T.C1[1] + 2 * e)
    cell(pen, T.C2_START[0] + 6 * e, T.C2_START[1] - 3 * e)
    if T.B_PASS[0] <= t < T.B_PASS[1]:
        (x, y), rot = T.anti_b(t)
        antibody(pen, x, y, rot, P.MINT, square=True)
