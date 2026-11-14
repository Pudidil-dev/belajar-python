"""Close-ups on the sample tip, drawn over the 3/4 analyzer drawing with the same projection: the forming serum
drop, its fall, the "plip" ripples and the gold plume sinking into the reagent; the reagent stream at the dispense
step; a pale-gold glint that keeps the hero cuvette trackable when it is small."""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from . import analyzer as AZ
from . import shots
from .view import View

W, H = gfx.W, gfx.H
R_DROP = 1.55
LIQ_Z = AZ.CUV_Z0 + 1.5 + AZ.LIQ_LEVEL


def cam_open(t):
    """The opening composition; 0.65-0.95 s the camera follows the drop down to the cuvette's front glass."""
    t = t % T.TOTAL
    (cu, cv), z = shots.OPEN
    if t < 0.65 or t >= 30.0:
        return View(cu, cv, z)
    u = T.smoother((t - 0.65) / 0.3)
    _, v_liq = AZ.proj(AZ.S_POS[0], AZ.S_POS[1] + AZ.CUV_HALF, LIQ_Z - 8.0)
    zz = math.exp(math.log(z) + (math.log(13.0) - math.log(z)) * u)
    return View(cu, cv + (v_liq - cv) * u, zz)


def _tau(t):
    t = t % T.TOTAL
    if T.REJOIN <= t < 14.0:
        return 0.45 + (t - T.REJOIN)
    if t >= 30.0:
        return t - T.TOTAL
    return t


def _ell(buf, view, u, v, rx_mm, ry_mm, col):
    cx, cy = view.px(u, v)
    rx, ry = rx_mm * view.z, ry_mm * view.z
    if rx < 0.6:
        if 0 <= int(cx) < W and 0 <= int(cy) < H:
            buf[int(cy), int(cx)] = col
        return
    x0, x1 = max(int(cx - rx) - 1, 0), min(int(cx + rx) + 2, W)
    y0, y1 = max(int(cy - ry) - 1, 0), min(int(cy + ry) + 2, H)
    if x1 <= x0 or y1 <= y0:
        return
    xs, ys = np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5
    m = ((xs[None, :] - cx) / rx) ** 2 + ((ys[:, None] - cy) / ry) ** 2 <= 1.0
    buf[y0:y1, x0:x1][m] = col


def _drop(buf, view, x, y, z, rx, ry):
    u, v = AZ.proj(x, y, z)
    _ell(buf, view, u, v, rx + 1.0 / view.z, ry + 1.0 / view.z, P.SE[2])
    _ell(buf, view, u, v, rx, ry, P.SE[5])
    _ell(buf, view, u + rx * 0.15, v + ry * 0.2, rx * 0.62, ry * 0.58, P.SE[6])
    _ell(buf, view, u - rx * 0.38, v - ry * 0.42, max(rx * 0.22, 0.7 / view.z), max(ry * 0.2, 0.7 / view.z),
         P.WHITE)


def overlay(buf, view, t, st, tips):
    x, y = AZ.S_POS                                   # the drop always falls into the cuvette at the sample position
    tx, ty, tz = tips['s']
    tau = _tau(t)
    near = abs(tx - x) < 2.5 and abs(ty - y) < 2.5
    if -0.30 <= tau < 0.20 and near:
        r = R_DROP * T.smooth((tau + 0.30) / 0.50)
        if r > 0.05:
            _drop(buf, view, tx, ty, tz - r * 0.9, r * 0.95, r)
    elif 0.20 <= tau < 0.25 and near:
        u = (tau - 0.20) / 0.05
        a, b = AZ.proj(tx, ty, tz), AZ.proj(tx, ty, tz - R_DROP * (1.2 + u))
        _line(buf, view, a, b, P.SE[5])
        _drop(buf, view, tx, ty, tz - R_DROP * (1.0 + 1.1 * u), R_DROP * (0.95 - 0.1 * u), R_DROP * (1 + 0.25 * u))
    elif 0.25 <= tau < T.LAND:
        u = (tau - 0.25) / (T.LAND - 0.25)
        z0, z1 = tz - R_DROP * 2.1, LIQ_Z + R_DROP
        _drop(buf, view, x, y, z0 - (z0 - z1) * u * u, R_DROP * 0.82, R_DROP * 1.35)
    if T.LAND <= tau < 1.4:
        e = tau - T.LAND
        # ripples on the liquid surface (circles on a horizontal plane: squashed by K), inside the cuvette
        cu, cv = AZ.proj(x, y, LIQ_Z)
        for k in range(3):
            rr = (e - k * 0.09) * 11.0
            if 0.25 < rr < AZ.CUV_IN * 1.3:
                _ring(buf, view, cu, cv, rr, rr * AZ.K, AZ.CUV_IN - 0.1, AZ.CUV_IN * AZ.K - 0.06,
                      P.WHITE if k == 0 else P.RG[7])
        # the serum sinks into the reagent as a gold plume behind the front glass
        rng = np.random.default_rng(5)
        fade = 1.0 - min(1.0, e / 1.2)
        for i in range(16):
            a = rng.uniform(-1.0, 1.0)
            sp = rng.uniform(0.4, 1.0)
            depth = min(e * (8.0 + 6 * sp), 15.5) * rng.uniform(0.5, 1.0)
            px = x + a * min(0.3 + e * 2.4 * sp, AZ.CUV_IN - 0.5)
            pu, pv = AZ.proj(px, y + AZ.CUV_IN, LIQ_Z - 0.6 - depth)
            if fade > rng.uniform(0, 1) * 0.95:
                _ell(buf, view, pu, pv, 0.22 + 0.25 * e * sp, 0.18 + 0.2 * e * sp, P.SE[4] if i % 3 else P.SE[5])
    # steel glint on the probe tip
    gu, gv = AZ.proj(tx - 0.5, ty, tz + 3.0)
    px_, py_ = view.px(gu, gv)
    if 0 <= int(px_) < W and 0 <= int(py_) < H:
        buf[int(py_), int(px_)] = P.WHITE


def _ring(buf, view, cu, cv, rx, ry, cx_lim, cy_lim, col):
    n = 64
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    us, vs = cu + rx * np.cos(a), cv + ry * np.sin(a)
    keep = (np.abs(us - cu) < cx_lim) & (np.abs(vs - cv) < cy_lim)
    for i in range(n):
        j = (i + 1) % n
        if keep[i] and keep[j]:
            _line(buf, view, (us[i], vs[i]), (us[j], vs[j]), col)


def _line(buf, view, a, b, col):
    (u0, v0), (u1, v1) = view.px(*a), view.px(*b)
    n = int(max(abs(u1 - u0), abs(v1 - v0))) + 1
    if n > 3000:
        return
    xs = np.linspace(u0, u1, n).astype(int)
    ys = np.linspace(v0, v1, n).astype(int)
    ok = (xs >= 0) & (xs < W) & (ys >= 0) & (ys < H)
    buf[ys[ok], xs[ok]] = col


def small_overlay(buf, view, t, st, tips):
    """Medium shots: the reagent stream while dispensing; a twinkle on the hero rim."""
    t = t % T.TOTAL
    a, b = T.RA_DISP
    if a <= t < b + 0.02:
        tx, ty, tz = tips['r']
        top = AZ.proj(tx, ty, tz)
        bot = AZ.proj(tx, ty, AZ.CUV_Z0 + 2.0 + AZ.LIQ_LEVEL * T.hero_fill(t))
        _line(buf, view, top, bot, P.RG[7])
        for k in range(5):
            u = ((t * 7.0 + k / 5.0) % 1.0)
            pu, pv = top[0], top[1] + (bot[1] - top[1]) * u
            px_, py_ = view.px(pu, pv)
            if 0 <= int(px_) + 1 < W and 0 <= int(py_) < H:
                buf[int(py_), int(px_) + 1] = P.WHITE
    hs = st['hero_slot']
    if hs is not None and view.z > 0.55 and int(t * 4) % 2 == 0:
        x, y = AZ.slot_xy(hs)
        gu, gv = AZ.proj(x - AZ.CUV_HALF, y - AZ.CUV_HALF, AZ.CUV_Z1)
        px_, py_ = view.px(gu, gv)
        if 0 <= int(px_) < W and 0 <= int(py_) < H:
            buf[int(py_), int(px_)] = P.SE[8]
