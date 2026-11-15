"""The view through the eyepiece: a stained blood smear in a round field of light.

The cells live at fixed places on the slide, in micrometres. A frame is a window onto the slide: moving the stage moves
the window (the whole field glides together), focusing changes only the sharpness (the stain's optical density is
blurred, never zoomed), and the final pull-back shrinks the round field onto the opening drop.

Each red cell is a biconcave disc: more stain at the rim, a pale centre. The white cell is a neutrophil: pale lilac,
finely granular cytoplasm and a plum nucleus in three to four lobes. Light through the stain follows Beer-Lambert
(image = lamp x exp(-optical density)); the result is ordered-dithered onto the palette, so blur shows as dither.
"""
import math
import numpy as np
from . import gfx
from . import timeline as T
from .palette import BG, PK, PU, LI, FD, CY, OUTLINE

PX_PER_UM = 2.4                       # at full eyepiece size: a red cell is ~19 px across
LAMP = np.array([0.975, 0.95, 0.905])  # the bright field, warm white
ABS_RBC = np.array([0.24, 1.05, 0.74])    # eosin: absorbs green most, the cells read pink-red
ABS_NUC = np.array([0.86, 1.62, 0.98])    # the nucleus: deep plum (red channel kept above blue)
ABS_CYT = np.array([0.10, 0.27, 0.12])    # neutrophil cytoplasm: pale lilac-pink
ABS_GRN = np.array([0.30, 0.62, 0.30])    # its fine granules
ABS_PLT = np.array([0.62, 1.25, 0.80])    # platelets

# ---- where things sit on the slide (micrometres)
V_HOOK = (80.0, 6.0)                  # the opening field: dense red cells, the white cell just out of view
V_FOCUS = (-132.0, 0.0)               # scene 7
WBC_C = (6.0, -5.0)                   # the neutrophil
V_FINAL = (0.0, 0.0)                  # scene 9: the white cell sits just off centre


def _cells():
    rng = np.random.default_rng(4207)
    pts = []
    grid = {}
    cell = 8.0

    def ok(x, y, dmin):
        gx, gy = int(math.floor(x / cell)), int(math.floor(y / cell))
        for i in (-1, 0, 1):
            for j in (-1, 0, 1):
                for (px, py, pd) in grid.get((gx + i, gy + j), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < (0.5 * (dmin + pd)) ** 2:
                        return False
        return True

    def add(x, y, d):
        pts.append((x, y, d))
        grid.setdefault((int(math.floor(x / cell)), int(math.floor(y / cell))), []).append((x, y, d))

    # the white cell keeps a clear space around it
    add(WBC_C[0], WBC_C[1], 17.4)
    # the monolayer: dense in the middle of the strip, thinning toward the far left (the feathered end)
    tries = 0
    while tries < 26000:
        tries += 1
        x = rng.uniform(-330, 300)
        y = rng.uniform(-95, 95)
        dens = 0.93 if x > -240 else 0.93 - (-240 - x) / 160
        if rng.uniform() > dens:
            continue
        d = rng.uniform(7.2, 8.5)
        if ok(x, y, d * rng.uniform(0.86, 0.98)):
            add(x, y, d)
    rbc = np.array(pts[1:], np.float64)
    n = len(rbc)
    ell = rng.uniform(1.0, 1.09, n)
    rot = rng.uniform(0, math.pi, n)
    pal = rng.uniform(0.34, 0.46, n)           # pale centre size
    amt = rng.uniform(0.86, 1.06, n)           # how much stain
    return np.column_stack([rbc, ell, rot, pal, amt])


RBC = _cells()                                 # x, y, d, ellipticity, rotation, pallor, stain


def _platelets():
    rng = np.random.default_rng(77)
    out = []
    while len(out) < 70:
        x, y = rng.uniform(-330, 300), rng.uniform(-95, 95)
        d2 = (RBC[:, 0] - x) ** 2 + (RBC[:, 1] - y) ** 2
        if d2.min() < (0.5 * RBC[np.argmin(d2), 2] + 2.4) ** 2:
            continue
        if (x - WBC_C[0]) ** 2 + (y - WBC_C[1]) ** 2 < 12.5 ** 2:
            continue
        out.append((x, y, rng.uniform(0.9, 1.5), rng.integers(0, 1 << 30)))
    return out


PLT = _platelets()

# the neutrophil's nucleus: lobes along a curve, joined by thin strands
_WS = 1.2                                       # the neutrophil is ~16 um across, twice a red cell
_NUC = [(-2.9 * _WS, -1.6 * _WS, 2.35 * _WS, 1.85 * _WS, 0.5), (0.4 * _WS, -2.7 * _WS, 2.2 * _WS, 1.75 * _WS, -0.2),
        (2.9 * _WS, -0.2 * _WS, 2.3 * _WS, 1.8 * _WS, 1.1), (0.9 * _WS, 2.6 * _WS, 2.05 * _WS, 1.65 * _WS, 0.3)]
_rng_g = np.random.default_rng(91)
_GRAN = _rng_g.uniform(-6.8, 6.8, (330, 2))
_GRAN = _GRAN[(_GRAN ** 2).sum(1) < 6.6 ** 2]


def _smoothstep(e0, e1, x):
    u = np.clip((x - e0) / (e1 - e0), 0, 1)
    return u * u * (3 - 2 * u)


def _seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    u = np.clip(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0, 1)
    return np.hypot(px - ax - u * vx, py - ay - u * vy)


def optical_density(wx, wy, px_per_um):
    """Optical density (h, w, 3) of the stained smear at world points wx (1, w), wy (h, 1)."""
    h, w = wy.shape[0], wx.shape[1]
    od = np.zeros((h, w, 3))
    x0, x1, y0, y1 = wx[0, 0], wx[0, -1], wy[0, 0], wy[-1, 0]
    aa = 0.9 / px_per_um                      # edge softness: about one pixel
    # red cells
    sel = np.nonzero((RBC[:, 0] > x0 - 6) & (RBC[:, 0] < x1 + 6) & (RBC[:, 1] > y0 - 6) & (RBC[:, 1] < y1 + 6))[0]
    for k in sel:
        cx, cy, d, e, rot, pal, amt = RBC[k]
        r = d / 2
        i0 = max(int(np.searchsorted(wx[0], cx - r - 1)), 0)
        i1 = min(int(np.searchsorted(wx[0], cx + r + 1)), w)
        j0 = max(int(np.searchsorted(wy[:, 0], cy - r - 1)), 0)
        j1 = min(int(np.searchsorted(wy[:, 0], cy + r + 1)), h)
        if i1 <= i0 or j1 <= j0:
            continue
        dx = wx[:, i0:i1] - cx
        dy = wy[j0:j1, :] - cy
        c, s = math.cos(rot), math.sin(rot)
        u = (dx * c + dy * s) / e
        v = (-dx * s + dy * c) * e
        rho = np.hypot(u, v) / r
        prof = 0.26 + 0.74 * _smoothstep(pal * 0.75, 0.78, rho) + 0.16 * _smoothstep(0.80, 0.94, rho)
        relief = 1.0 + 0.10 * (dx + dy) / (r * 1.414) * _smoothstep(0.55, 1.0, rho)   # a 16-bit hint of form
        edge = 1 - _smoothstep(1.0 - aa / r, 1.0 + aa / r, rho)
        od[j0:j1, i0:i1] += (amt * prof * relief * edge)[..., None] * ABS_RBC
    # the white cell (computed only in its own small window)
    wcx, wcy = WBC_C
    win = _window(wx, wy, wcx - 10, wcx + 10, wcy - 10, wcy + 10)
    if win is not None:
        (j0, j1, i0, i1) = win
        dx, dy = wx[:, i0:i1] - wcx, wy[j0:j1, :] - wcy
        sub = od[j0:j1, i0:i1]
        rr = np.hypot(dx, dy)
        wob = 6.7 * _WS + 0.3 * np.sin(np.arctan2(dy, dx) * 5 + 0.7)
        cyt = 1 - _smoothstep(wob - aa, wob + aa, rr)
        sub += (1.0 * cyt)[..., None] * ABS_CYT
        sub += (0.35 * cyt * _smoothstep(wob - 1.1, wob - 0.2, rr))[..., None] * ABS_CYT
        gr = np.zeros(rr.shape)
        for gx, gy in _GRAN:
            gr += np.exp(-((dx - gx) ** 2 + (dy - gy) ** 2) / (2 * 0.33 ** 2))
        sub += (0.55 * gr * cyt)[..., None] * ABS_GRN
        nuc = np.zeros(rr.shape)
        for (lx, ly, ax, ay, ang) in _NUC:
            c, s_ = math.cos(ang), math.sin(ang)
            u = ((dx - lx) * c + (dy - ly) * s_) / ax
            v = (-(dx - lx) * s_ + (dy - ly) * c) / ay
            q = np.hypot(u, v)
            nuc = np.maximum(nuc, 1 - _smoothstep(1.0 - aa / ax, 1.0 + aa / ax, q))
        for a, b in zip(_NUC[:-1], _NUC[1:]):
            dd = _seg_dist(dx, dy, a[0], a[1], b[0], b[1])
            nuc = np.maximum(nuc, 1 - _smoothstep(0.62 - aa, 0.62 + aa, dd))
        clump = 0.82 + 0.18 * np.sin(dx * 2.3 + 0.5) * np.sin(dy * 2.1 - 0.3) + 0.12 * np.sin((dx - dy) * 3.7)
        sub += (1.15 * nuc * clump)[..., None] * ABS_NUC
    # platelets
    for (px, py, pr, seed) in PLT:
        win = _window(wx, wy, px - 3, px + 3, py - 3, py + 3)
        if win is None:
            continue
        (j0, j1, i0, i1) = win
        dx, dy = wx[:, i0:i1] - px, wy[j0:j1, :] - py
        ang = np.arctan2(dy, dx)
        rad = pr * (1 + 0.18 * np.sin(ang * 3 + seed % 7) + 0.1 * np.sin(ang * 5 + seed % 11))
        b = 1 - _smoothstep(rad - aa, rad + aa, np.hypot(dx, dy))
        od[j0:j1, i0:i1] += (0.75 * b * (0.8 + 0.2 * np.sin(dx * 5.0 + dy * 4.0)))[..., None] * ABS_PLT
    return od


def _window(wx, wy, xa, xb, ya, yb):
    """Index window (j0, j1, i0, i1) of the grid inside a world box, or None."""
    i0 = max(int(np.searchsorted(wx[0], xa)), 0)
    i1 = min(int(np.searchsorted(wx[0], xb)), wx.shape[1])
    j0 = max(int(np.searchsorted(wy[:, 0], ya)), 0)
    j1 = min(int(np.searchsorted(wy[:, 0], yb)), wy.shape[0])
    if i1 <= i0 or j1 <= j0:
        return None
    return j0, j1, i0, i1


def _blur(img, sigma):
    """Gaussian blur of an (h, w, c) image (FFT, edges padded)."""
    if sigma < 0.25:
        return img
    pad = int(math.ceil(3 * sigma)) + 2
    a = np.pad(img, ((pad, pad), (pad, pad), (0, 0)), mode='edge')
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (math.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    out = np.fft.irfft2(np.fft.rfft2(a, axes=(0, 1)) * g[..., None], s=(h, w), axes=(0, 1))
    return out[pad:-pad, pad:-pad]


FIELD_PAL = np.array([FD[0], FD[1], FD[2], FD[3], FD[4]] + PK + PU + LI + [(240, 222, 218), (231, 199, 199)],
                     np.float32)


def draw(buf, view, blur=0.0, circle=None, scale=1.0, rim=True):
    """Draw the eyepiece view into buf. view = (x, y) slide point at the centre (um); blur = defocus (px at full
    size); circle = (cx, cy, r) on the canvas (default: full size); scale = 1 at full size, smaller when pulling out."""
    cx, cy, r = circle if circle is not None else (T.EYE_XY[0], T.EYE_XY[1], T.EYE_R)
    s = PX_PER_UM * scale
    m = int(math.ceil(3 * blur * scale)) + 2
    bx0, bx1 = int(math.floor(cx - r)) - 2, int(math.ceil(cx + r)) + 3
    by0, by1 = int(math.floor(cy - r)) - 2, int(math.ceil(cy + r)) + 3
    # snap the slide to whole pixels so the field moves rigidly (no shimmer) while the stage glides
    ox = round(view[0] * s)
    oy = round(view[1] * s)
    xs = np.arange(bx0 - m, bx1 + m) + 0.5
    ys = np.arange(by0 - m, by1 + m) + 0.5
    wx = ((xs - cx + ox) / s)[None, :]
    wy = ((ys - cy + oy) / s)[:, None]
    od = optical_density(wx, wy, s)
    od = _blur(od, blur * scale)[m:-m, m:-m]
    yy = (np.arange(by0, by1) + 0.5)[:, None]
    xx = (np.arange(bx0, bx1) + 0.5)[None, :]
    rr = np.hypot(xx - cx, yy - cy)
    vign = 1 - 0.13 * np.clip(rr / max(r, 1), 0, 1) ** 2.2
    img = LAMP[None, None, :] * vign[..., None] * np.exp(-od)
    rgb = (img * 255).clip(0, 255)
    q = gfx.quantize(rgb, FIELD_PAL, bx0 - ox, by0 - oy, spread=22.0)
    inside = rr < r
    X0, Y0 = max(bx0, 0), max(by0, 0)
    X1, Y1 = min(bx1, gfx.W), min(by1, gfx.H)
    if X1 <= X0 or Y1 <= Y0:
        return
    sl = (slice(Y0 - by0, Y1 - by0), slice(X0 - bx0, X1 - bx0))
    dst = buf[Y0:Y1, X0:X1]
    ins = inside[sl]
    dst[ins] = q[sl][ins]
    # the field stop: a crisp dark ring; a cool glint on the rim of the eyepiece glass
    ring = (rr >= r) & (rr < r + 1.6)
    dst[ring[sl]] = OUTLINE
    if rim and r > 30:
        ang = np.degrees(np.arctan2(yy - cy, xx - cx))
        arc = (rr >= r + 1.6) & (rr < r + 3.0) & (ang > -160) & (ang < -110)
        dst[arc[sl]] = CY[3]
        arc2 = (rr >= r + 1.6) & (rr < r + 2.6) & (((ang > -175) & (ang <= -160)) | ((ang >= -110) & (ang < -95)))
        dst[arc2[sl]] = CY[1]
