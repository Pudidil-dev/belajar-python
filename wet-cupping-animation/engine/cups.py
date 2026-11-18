"""The clear cupping cups, drawn for any camera angle.

A cup is a short glass bell standing on the skin: a straight wall, a rounded top and a steel valve on top (the hose of
the hand pump clicks onto it, and pulling the valve lets air back in). Its outline in the 2.5D view is exact for an
orthographic camera: the rim and the top of the wall are ellipses (squashed by sin e), the wall between them is a band,
and the rounded top is the projection of an ellipsoid. The glass is clear: a light dither, a pale outline, a white
streak and a glint. When the camera's cut plane passes through the main cup, it is drawn as a cross-section instead:
the cut glass walls, so you look straight into the cup.
"""
import math
import numpy as np
from . import view as V
from . import state as S
from . import timeline as T
from .palette import GLASS, WHITE, STEEL, OUTLINE, SKIN


def _sil(v, x0, y0, zl, grow=1.0):
    """Silhouette pieces (canvas masks) of a cup standing at (x0, y0), lifted zl."""
    s, se, ce = v.s, v.se, v.ce
    R = S.R_OUT * grow
    bx, by = v.to(x0, y0, zl)
    tx, ty = v.to(x0, y0, zl + S.WALL_H * grow)
    rx, ry = R * s, R * s * se
    base = V.ell(bx, by, rx, ry)
    wall = (np.abs(V.XC - bx) <= rx) & (V.YC >= ty) & (V.YC <= by)
    cap_ry = math.sqrt((R * se) ** 2 + (S.CAP_H * grow * ce) ** 2) * s
    cap = V.ell(tx, ty, rx, cap_ry) & (V.YC <= ty + ry)
    stem_parts = []
    for z0, z1, r in ((S.STEM_Z0, S.STEM_Z1, S.STEM_R), (S.STEM_Z1, S.VCAP_Z1, S.VCAP_R)):
        ax, ay = v.to(x0, y0, zl + z0 * grow)
        cx_, cy_ = v.to(x0, y0, zl + z1 * grow)
        rr, rry = r * grow * s, r * grow * s * se
        stem_parts.append(V.ell(ax, ay, rr, rry) | V.ell(cx_, cy_, rr, rry) |
                          ((np.abs(V.XC - ax) <= rr) & (V.YC >= cy_) & (V.YC <= ay)))
    glass = V.full(base | wall | cap)
    return glass, stem_parts, (bx, by, rx, ry), (tx, ty)


def _valve(buf, parts):
    stem, vcap = parts
    st = V.full(stem)
    buf[st] = STEEL[1]
    buf[V.edge(st)] = STEEL[0]
    vc = V.full(vcap)
    buf[vc] = STEEL[2]
    buf[V.edge(vc)] = STEEL[0]


def draw_cup(buf, v, t, x0, y0, zl=0.0, grow=1.0, clip=None):
    """A whole clear cup."""
    glass, stem_parts, (bx, by, rx, ry), (tx, ty) = _sil(v, x0, y0, zl, grow)
    if clip is not None:
        glass = glass & clip
    if not glass.any():
        return
    sheen = V.full(((V.XC.astype(int) + 2 * V.YC.astype(int)) % 4) == 0)
    buf[glass & sheen] = GLASS[3]
    if v.se < 0.97:                                           # the far half of the rim, seen through the glass
        rim = V.full(V.edge(V.ell(bx, by, rx, ry)))
        buf[rim & glass & V.full(V.YC < by)] = GLASS[1]
        buf[rim & glass & V.full(V.YC >= by)] = GLASS[3]
        if v.ce > 0.15:
            top = V.full(V.edge(V.ell(tx, ty, rx, ry))) & V.full(V.YC >= ty)
            buf[top & glass] = GLASS[2]
    buf[V.edge(glass)] = GLASS[2]
    # a white streak on the lit side and a small glint that blinks
    if v.se > 0.9:
        arc = V.full(V.ell(bx, by, rx * 0.84, ry * 0.84) & ~V.ell(bx + rx * 0.06, by + ry * 0.06, rx * 0.8, ry * 0.8))
        buf[arc & V.full((V.XC < bx - rx * 0.2) & (V.YC < by - ry * 0.2))] = WHITE
    else:
        sx_ = bx - rx * 0.62
        streak = V.full((np.abs(V.XC - sx_) < max(1.0, rx * 0.05)) & (V.YC > ty) & (V.YC < by - ry * 0.3))
        buf[streak & glass] = WHITE
    k = ((T.anim(t) + x0 * 0.013 + y0 * 0.007) % 2.6) / 2.6
    if k < 0.1:
        gx, gy = bx - rx * 0.45, (ty if v.ce > 0.3 else by) - ry * 0.45
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)) + (((2, 0), (-2, 0), (0, 2), (0, -2)) if k < 0.05 else ()):
            V.dot(buf, gx + dx, gy + dy, WHITE)
    _valve(buf, stem_parts)


def draw_cut_cup(buf, v, t, x0, zl=0.0):
    """The main cup cut in half by the camera's cut plane: glass walls as cut faces, open to the eye."""
    if v.ZC is None:
        return
    X = np.broadcast_to(v.X, (V.H, V.W))
    Z = np.broadcast_to(v.ZC, (V.H, V.W)) - zl
    ax = np.abs(X - x0)
    wall = (ax >= S.R_IN) & (ax <= S.R_OUT) & (Z >= 0) & (Z <= S.WALL_H)
    zc = Z - S.WALL_H
    outer = (ax / S.R_OUT) ** 2 + (zc / S.CAP_H) ** 2 <= 1
    inner = (ax / S.R_IN) ** 2 + (zc / (S.CAP_H - 1.6)) ** 2 <= 1
    cap = outer & ~inner & (zc >= 0) & (ax >= S.STEM_R - 0.9)
    stem = (ax <= S.STEM_R) & (ax >= S.STEM_R - 0.9) & (Z >= S.STEM_Z0 - 1.0) & (Z <= S.STEM_Z1)
    vcap = (ax <= S.VCAP_R) & (Z > S.STEM_Z1) & (Z <= S.VCAP_Z1)
    glass = wall | cap | stem
    hatch = V.full((((V.XC + V.YC).astype(int)) % 4) == 0)
    buf[glass] = GLASS[3]
    buf[glass & hatch] = GLASS[2]
    buf[V.edge(glass)] = GLASS[1]
    buf[vcap] = STEEL[2]
    buf[V.edge(vcap)] = STEEL[0]
    lip = (ax >= S.R_IN - 0.3) & (ax <= S.R_OUT + 0.5) & (Z >= 0) & (Z <= 0.8)
    buf[lip] = GLASS[3]
    # the white streak on the near glass, and a glint
    streak = (np.abs(ax - (S.R_IN - 2.2)) < 0.12 + 0.6 / v.s) & (X < x0) & (Z > 6) & (Z < S.WALL_H - 2)
    buf[streak & V.CHECK] = WHITE


def draw_all(buf, v, t):
    """Every cup that is on the back (far ones first), and the main cup while it is lifted away."""
    items = []
    for i, (sx, sy) in enumerate(S.SPOTS):
        h = S.cup_drop(t, i)
        if h is None:
            continue
        if i == S.MAIN and t >= T.POP:
            if not S.cup_gone(t):
                items.append((sy, i, sx, sy, S.lift(t)))
        elif S.cup_on(t, i):
            items.append((sy, i, sx, sy, 0.0))
    for _, i, sx, sy, zl in sorted(items, key=lambda q: -q[0]):
        cut = v.ycut is not None
        if cut and sy + S.R_OUT < v.ycut:
            continue                                         # in the part of the back the cut has taken away
        if cut and i == S.MAIN and abs(v.ycut - sy) < 1.0 and v.e < 40:
            draw_cut_cup(buf, v, t, sx, zl)
            continue
        if cut and sy + S.R_OUT * 0.3 < v.ycut:
            continue                                         # mostly sliced away
        drop = S.cup_drop(t, i) or 0.0
        if v.se > 0.9 and drop > 0.05:                       # falling toward the skin: bigger, with a shadow
            px, py = v.to(sx, sy, 0)
            sh = V.full(V.ell(px + 2, py + 2, S.R_OUT * v.s * 0.9, S.R_OUT * v.s * 0.9 * v.se))
            buf[sh & V.CHECK] = SKIN[1]
        draw_cup(buf, v, t, sx, sy, zl + (drop if v.se < 0.9 else 0.0), grow=1.0 + (0.012 * drop if v.se > 0.9 else 0))
