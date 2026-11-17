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


# red blood cell thickness profile (Evans & Fung): D(rho) = sqrt(1 - rho^2) (C0 + C2 rho^2 + C4 rho^4), R0 = 3.91 um
_EF = (0.81, 7.83, -4.39, 3.91)
_LIGHT = np.array([-0.52, -0.64, 0.56])
_LIGHT = _LIGHT / np.linalg.norm(_LIGHT)
_HMAX = 0.31


def half_thickness(rho2):
    """Half thickness of a red blood cell (in units of its radius) at squared normalised radius rho2."""
    c0, c2, c4, r0 = _EF
    rho2 = np.clip(rho2, 0.0, 1.0)
    return np.sqrt(1.0 - rho2) * (c0 + c2 * rho2 + c4 * rho2 * rho2) / (2 * r0)


_A_S = np.linspace(-1.0, 1.0, 81)
_Y_S = np.linspace(0.0, 1.0, 41)
_SIL = {}


def _silhouette(tilt):
    """Half-height of the outline of a tilted cell across its long axis: a surface point (a, y, +-h) projects to
    y*cos(tilt) + h*sin(tilt); take the largest over the face."""
    if tilt not in _SIL:
        ct, st = math.cos(tilt), math.sin(tilt)
        A = _A_S[:, None]
        Y = _Y_S[None, :] * np.sqrt(np.clip(1 - A * A, 0, 1))
        _SIL[tilt] = (Y * ct + half_thickness(A * A + Y * Y) * st).max(axis=1)
        if len(_SIL) > 400:
            _SIL.pop(next(iter(_SIL)))
    return _SIL[tilt]


def _markers(pen, x, y, r, ct, cp, sp):
    """A markers: small gold 'lollipops' (a short stalk and a knob) along the rim, every 30 degrees."""
    for k in range(T.TAB_N):
        th = math.radians(k * 360.0 / T.TAB_N)
        la, lb = math.cos(th), math.sin(th) * ct                  # rim direction in the disc's frame
        na, nb = math.cos(th), math.sin(th) / max(ct, 0.25)        # outward normal (ellipse)
        nl = math.hypot(na, nb)
        na, nb = na / nl, nb / nl
        rx, ry = x + r * (la * cp - lb * sp), y + r * (la * sp + lb * cp)
        ux, uy = na * cp - nb * sp, na * sp + nb * cp
        kx, ky = rx + ux * 2.2, ry + uy * 2.2
        n = max(2, int(2.2 * pen.z) + 1)
        for j in range(n):
            f = j / n * 1.6
            pen.dot(rx + ux * f, ry + uy * f, P.GOLD[0])
        if pen.z >= 0.8:
            bx, m, U, V = pen.disc(kx, ky, 1.25, 0)
            if bx is not None:
                put(pen.buf, bx, m, P.GOLD[1])
            pen.dot(kx - 0.5, ky - 0.6, P.GOLD[2])
        else:
            pen.dot(kx, ky, P.GOLD[1])


def cell(pen, x, y, r=T.R_CELL, tabs=True, tilt=0.0, psi=0.0):
    """A red blood cell: a biconcave disc (thick rim, thin pale centre), tilted by `tilt` about an axis at angle
    `psi` (0 = seen face-on; near 90 deg it shows the dumbbell side profile). Flat 8-bit shading in four reds: the
    rim is lit on the upper left, and inside the dimple the shading is reversed, which is what makes it read as a
    dent and not a bump."""
    ext = r + 4.5
    if pen.view.box(x - ext, y - ext, x + ext, y + ext, 1) is None:
        return
    ct, st = math.cos(tilt), math.sin(tilt)
    cp, sp = math.cos(psi), math.sin(psi)
    if tabs:
        _markers(pen, x, y, r, max(ct, 0.25), cp, sp)
    bx = pen.box(x - r - 1, y - r - 1, x + r + 1, y + r + 1, 1)
    if bx is None:
        return
    U, V = pen.grid(bx)
    dx, dy = U - x, V - y
    a = (dx * cp + dy * sp) / r
    b = (-dx * sp + dy * cp) / r
    face = np.sqrt(np.clip(1 - a * a, 0, 1))
    minor = np.interp(a, _A_S, _silhouette(round(tilt, 3)))       # true outline of the tilted thick disc
    m = (np.abs(a) <= 1) & (np.abs(b) <= minor)
    if not m.any():
        return
    yb = np.where(minor > 1e-6, b / np.maximum(minor, 1e-6) * face, 0.0)
    rho2 = np.clip(a * a + yb * yb, 0, 0.9999)
    rho = np.sqrt(rho2)
    e = 0.02
    dh = (half_thickness((rho + e) ** 2) - half_thickness(np.maximum(rho - e, 0) ** 2)) / (2 * e)
    with np.errstate(invalid='ignore', divide='ignore'):
        nx = np.where(rho > 1e-4, -dh * a / rho, 0.0)
        ny = np.where(rho > 1e-4, -dh * yb / rho, 0.0)
    nz = np.ones_like(nx)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / ln, ny / ln, nz / ln
    ny2, nz2 = ny * ct + nz * st, -ny * st + nz * ct              # tilt about the disc's own a-axis
    sx, sy = nx * cp - ny2 * sp, nx * sp + ny2 * cp               # back to the screen
    lit = np.clip(sx * _LIGHT[0] + sy * _LIGHT[1] + nz2 * _LIGHT[2], 0, 1)
    pallor = 1 - half_thickness(rho2) / _HMAX                      # the thin centre lets more light through
    v = 0.50 * lit + 0.25 * pallor * ct + 0.26
    w = min(1.0, max(0.0, (tilt - 0.85) / 0.55))                  # nearly edge-on: shade the rim like a tube
    if w > 0:
        vb = np.where(minor > 1e-6, b / np.maximum(minor, 1e-6), 0.0)
        v_edge = 0.56 - 0.22 * vb - 0.10 * np.abs(a) ** 3 + 0.14 * (np.abs(a) > 0.55) * (vb < -0.2)
        v = (1 - w) * v + w * v_edge
    col = np.where(v[..., None] < 0.42, np.array(P.RED[2], np.uint8),
                   np.where(v[..., None] < 0.60, np.array(P.RED[3], np.uint8),
                            np.where(v[..., None] < 0.73, np.array(P.RED[4], np.uint8), np.array(P.RED[5], np.uint8))))
    put(pen.buf, bx, m, col)
    pen.outline(bx, m, P.RED[1])


def _tumble(k, t, amp=0.55):
    """Tilt and axis of a free-floating cell that slowly tumbles."""
    return 0.55 + amp * math.sin(0.7 * t + k * 1.7), k * 1.3 + 0.22 * t


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
        tl, ps = _tumble(k, t)
        cell(pen, x + 2 * math.sin(t * 0.9 + k), y + 2 * math.cos(t * 0.8 + k), tilt=tl, psi=ps)
    for k in range(len(T.NEIGHBOURS)):
        x, y = T.neighbour_pos(k, t)
        tb = T.NEIGHBOURS[k][2]
        tl, ps = _tumble(k + 3, t, 0.4)
        f = 1 - T.smooth((t - (tb - 0.7)) / 0.6)                  # it settles face-on as it is pulled into the clump
        cell(pen, x, y, tilt=tl * f, psi=ps)
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
        tl, ps = _tumble(k, t)
        cell(pen, x + 2 * math.sin(t * 0.9 + k), y + 2 * math.cos(t * 0.8 + k), tilt=tl, psi=ps)
    for k in range(len(T.NEIGHBOURS)):
        x, y = T.neighbour_pos(k, t, bridged=False)
        tl, ps = _tumble(k + 3, t, 0.4)
        cell(pen, x + 4 * e * math.cos(k), y + 4 * e * math.sin(k), tilt=tl, psi=ps)
    cell(pen, T.C1[0] - 5 * e, T.C1[1] + 2 * e)
    cell(pen, T.C2_START[0] + 6 * e, T.C2_START[1] - 3 * e)
    if T.B_PASS[0] <= t < T.B_PASS[1]:
        (x, y), rot = T.anti_b(t)
        antibody(pen, x, y, rot, P.MINT, square=True)
