"""Pixel canvas, camera and shaded primitives.

Everything is drawn at the native 270x480 resolution. Shapes are rasterised
without anti-aliasing every frame through the camera, so zooms stay pixel
crisp (no resampled sprites) and the whole frame keeps the palette.
"""
import math

import numpy as np
from PIL import Image, ImageDraw

from pal import BG0

W, H = 270, 480

BAYER4 = (np.array([[0, 8, 2, 10],
                    [12, 4, 14, 6],
                    [3, 11, 1, 9],
                    [15, 7, 13, 5]], dtype=np.float32) + 0.5) / 16.0
BAYER_FULL = np.tile(BAYER4, (H // 4 + 1, W // 4 + 1))[:H, :W]


def clamp(v, a, b):
    return a if v < a else b if v > b else v


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    t = clamp(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def ease_io(t):
    t = clamp(t, 0.0, 1.0)
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_in(t):
    t = clamp(t, 0.0, 1.0)
    return t * t * t


def ease_out(t):
    t = clamp(t, 0.0, 1.0)
    return 1 - (1 - t) ** 3


def ease_out_back(t, s=1.7):
    t = clamp(t, 0.0, 1.0) - 1
    return 1 + t * t * ((s + 1) * t + s)


def seg(t, a, b):
    """Normalised progress of t through [a, b]."""
    if b <= a:
        return 1.0 if t >= b else 0.0
    return clamp((t - a) / (b - a), 0.0, 1.0)


def bezier_ease(x1, y1, x2, y2):
    """CSS/AE cubic-bezier easing, solved with Newton steps (like MO.bezier)."""
    def f(x):
        x = clamp(x, 0.0, 1.0)
        t = x
        for _ in range(10):
            bx = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3 - x
            dbx = 3 * (1 - t) ** 2 * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2)
            if abs(dbx) < 1e-7:
                break
            t = clamp(t - bx / dbx, 0.0, 1.0)
        return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3
    return f


# Kurzgesagt: "other actions use 75% influence" ~ cubic-bezier(.75,0,.25,1)
K75 = bezier_ease(0.75, 0.0, 0.25, 1.0)


def back_out(t, s=1.4):
    t = clamp(t, 0.0, 1.0) - 1
    return 1 + t * t * ((s + 1) * t + s)


class Cam:
    """World -> screen transform: screen = (p - c) * zoom + screen centre."""

    def __init__(self, cx, cy, zoom):
        self.cx, self.cy, self.z = cx, cy, zoom

    def sx(self, x):
        return (x - self.cx) * self.z + W / 2

    def sy(self, y):
        return (y - self.cy) * self.z + H / 2

    def pt(self, x, y):
        return ((x - self.cx) * self.z + W / 2, (y - self.cy) * self.z + H / 2)

    def wx(self, sx):
        return (sx - W / 2) / self.z + self.cx

    def wy(self, sy):
        return (sy - H / 2) / self.z + self.cy

    def visible(self, x0, y0, x1, y1, pad=0):
        a = self.pt(x0, y0)
        b = self.pt(x1, y1)
        return not (max(a[0], b[0]) < -pad or min(a[0], b[0]) > W + pad or
                    max(a[1], b[1]) < -pad or min(a[1], b[1]) > H + pad)


def cam_lerp(c0, c1, t):
    """Interpolate cameras with log-space zoom (perceptually even zooms)."""
    z = math.exp(lerp(math.log(c0.z), math.log(c1.z), t))
    # keep the motion of the world point under the screen centre consistent
    return Cam(lerp(c0.cx, c1.cx, t), lerp(c0.cy, c1.cy, t), z)


class Canvas:
    def __init__(self, fill=BG0):
        self.a = np.empty((H, W, 3), np.uint8)
        self.a[:] = fill

    # ---------------------------------------------------------- raw stamping
    def stamp(self, mask, x0, y0, color):
        """Paint boolean mask with its top-left at integer (x0, y0)."""
        h, w = mask.shape
        ax0, ay0 = max(0, x0), max(0, y0)
        ax1, ay1 = min(W, x0 + w), min(H, y0 + h)
        if ax0 >= ax1 or ay0 >= ay1:
            return
        m = mask[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]
        self.a[ay0:ay1, ax0:ax1][m] = color

    def blit(self, mask, x0, y0, img):
        """Copy per-pixel colours img (h x w x 3) where mask, top-left (x0, y0)."""
        h, w = mask.shape
        ax0, ay0 = max(0, x0), max(0, y0)
        ax1, ay1 = min(W, x0 + w), min(H, y0 + h)
        if ax0 >= ax1 or ay0 >= ay1:
            return
        m = mask[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]
        sub = img[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]
        self.a[ay0:ay1, ax0:ax1][m] = sub[m]

    def stamp_dither(self, mask, x0, y0, color, level, ox=0, oy=0):
        """Paint mask where the Bayer threshold < level (ordered dithering).
        ox/oy anchor the pattern so it can travel with an object."""
        if level <= 0:
            return
        if level >= 1:
            self.stamp(mask, x0, y0, color)
            return
        h, w = mask.shape
        ax0, ay0 = max(0, x0), max(0, y0)
        ax1, ay1 = min(W, x0 + w), min(H, y0 + h)
        if ax0 >= ax1 or ay0 >= ay1:
            return
        m = mask[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]
        yy = (np.arange(ay0, ay1) - oy) % 4
        xx = (np.arange(ax0, ax1) - ox) % 4
        th = BAYER4[yy][:, xx]
        self.a[ay0:ay1, ax0:ax1][m & (th < level)] = color

    def rect(self, x0, y0, x1, y1, color):
        """Filled rect, inclusive-exclusive integer screen coords."""
        x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
        x0, x1 = max(0, x0), min(W, x1)
        y0, y1 = max(0, y0), min(H, y1)
        if x0 < x1 and y0 < y1:
            self.a[y0:y1, x0:x1] = color

    def rect_dither(self, x0, y0, x1, y1, color, level, ox=0, oy=0):
        x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
        x0, x1 = max(0, x0), min(W, x1)
        y0, y1 = max(0, y0), min(H, y1)
        if x0 < x1 and y0 < y1 and level > 0:
            yy = (np.arange(y0, y1) - oy) % 4
            xx = (np.arange(x0, x1) - ox) % 4
            th = BAYER4[yy][:, xx]
            self.a[y0:y1, x0:x1][th < level] = color

    def px(self, x, y, color):
        x, y = int(math.floor(x)), int(math.floor(y))
        if 0 <= x < W and 0 <= y < H:
            self.a[y, x] = color

    # -------------------------------------------------------- vector shapes
    def poly(self, pts, color, dither=None, outline=None):
        m, x0, y0 = poly_mask(pts)
        if m is None:
            return
        if outline is not None:
            self.stamp(dilate(m), x0 - 1, y0 - 1, outline)
        if dither is None:
            self.stamp(m, x0, y0, color)
        else:
            self.stamp_dither(m, x0, y0, color, dither)

    def disc(self, cx, cy, r, color, outline=None):
        m, x0, y0 = disc_mask(cx, cy, r)
        if outline is not None:
            self.stamp(dilate(m), x0 - 1, y0 - 1, outline)
        self.stamp(m, x0, y0, color)

    def line(self, x0, y0, x1, y1, color, w=1):
        m, ox, oy = line_mask([(x0, y0), (x1, y1)], w)
        if m is not None:
            self.stamp(m, ox, oy, color)

    def polyline(self, pts, color, w=1):
        m, ox, oy = line_mask(pts, w)
        if m is not None:
            self.stamp(m, ox, oy, color)


# ------------------------------------------------------------- mask helpers
def poly_mask(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0 = int(math.floor(min(xs))) - 1
    y0 = int(math.floor(min(ys))) - 1
    x1 = int(math.ceil(max(xs))) + 2
    y1 = int(math.ceil(max(ys))) + 2
    if x1 < 0 or y1 < 0 or x0 > W or y0 > H:
        return None, 0, 0
    # clip huge shapes to a sane window around the screen
    cx0, cy0 = max(x0, -64), max(y0, -64)
    cx1, cy1 = min(x1, W + 64), min(y1, H + 64)
    if cx1 <= cx0 or cy1 <= cy0:
        return None, 0, 0
    img = Image.new("1", (cx1 - cx0, cy1 - cy0), 0)
    ImageDraw.Draw(img).polygon([(p[0] - cx0 - 0.5, p[1] - cy0 - 0.5) for p in pts], fill=1)
    return np.asarray(img, dtype=bool), cx0, cy0


def line_mask(pts, w):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    pad = int(w) + 2
    x0 = int(math.floor(min(xs))) - pad
    y0 = int(math.floor(min(ys))) - pad
    x1 = int(math.ceil(max(xs))) + pad
    y1 = int(math.ceil(max(ys))) + pad
    if x1 < 0 or y1 < 0 or x0 > W or y0 > H:
        return None, 0, 0
    cx0, cy0 = max(x0, -64), max(y0, -64)
    cx1, cy1 = min(x1, W + 64), min(y1, H + 64)
    if cx1 <= cx0 or cy1 <= cy0:
        return None, 0, 0
    img = Image.new("1", (cx1 - cx0, cy1 - cy0), 0)
    d = ImageDraw.Draw(img)
    q = [(p[0] - cx0 - 0.5, p[1] - cy0 - 0.5) for p in pts]
    iw = max(1, int(round(w)))
    d.line(q, fill=1, width=iw, joint="curve" if len(q) > 2 else None)
    if iw >= 3:
        r = iw / 2.0 - 0.5
        for p in (q[0], q[-1]):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=1)
    return np.asarray(img, dtype=bool), cx0, cy0


_disc_cache = {}


def disc_mask(cx, cy, r):
    """Pixel-centre test disc. Returns mask, x0, y0 (integer)."""
    r = max(0.5, r)
    fx, fy = cx - math.floor(cx), cy - math.floor(cy)
    key = (round(r * 4) / 4, round(fx * 4) / 4, round(fy * 4) / 4)
    m = _disc_cache.get(key)
    rr = key[0]
    ri = int(math.ceil(rr)) + 1
    if m is None:
        ys, xs = np.mgrid[-ri:ri + 1, -ri:ri + 1]
        m = ((xs + 0.5 - key[1]) ** 2 + (ys + 0.5 - key[2]) ** 2) <= rr * rr
        if not m.any():
            m[ri, ri] = True
        if len(_disc_cache) < 20000:
            _disc_cache[key] = m
    return m, int(math.floor(cx)) - ri, int(math.floor(cy)) - ri


def ellipse_mask(cx, cy, rx, ry, ang=0.0):
    rx, ry = max(0.5, rx), max(0.5, ry)
    R = int(math.ceil(max(rx, ry))) + 1
    x0, y0 = int(math.floor(cx)) - R, int(math.floor(cy)) - R
    ys, xs = np.mgrid[0:2 * R + 2, 0:2 * R + 2]
    dx = xs + x0 + 0.5 - cx
    dy = ys + y0 + 0.5 - cy
    ca, sa = math.cos(ang), math.sin(ang)
    u = dx * ca + dy * sa
    v = -dx * sa + dy * ca
    m = (u / rx) ** 2 + (v / ry) ** 2 <= 1.0
    if not m.any():
        m[R, R] = True
    return m, x0, y0


def dilate(m, n=1):
    for _ in range(n):
        h, w = m.shape
        o = np.zeros((h + 2, w + 2), dtype=bool)
        o[1:-1, 1:-1] = m
        o[:-2, 1:-1] |= m
        o[2:, 1:-1] |= m
        o[1:-1, :-2] |= m
        o[1:-1, 2:] |= m
        m = o
    return m


def dilate8(m):
    h, w = m.shape
    o = np.zeros((h + 2, w + 2), dtype=bool)
    for dy in range(3):
        for dx in range(3):
            o[dy:dy + h, dx:dx + w] |= m
    return o


def shift(m, dx, dy):
    """Shift mask contents by (dx, dy) keeping shape (zero fill)."""
    h, w = m.shape
    o = np.zeros_like(m)
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    if xs0 < xs1 and ys0 < ys1:
        o[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = m[ys0:ys1, xs0:xs1]
    return o


def shaded_mask(cv, m, x0, y0, base, hi=None, sh=None, outline=None, k=1,
                hi_dir=(-1, -1), spec=None):
    """Paint a mask with Kurzgesagt-ish rim shading: highlight crescent on the
    light side, shadow crescent opposite, optional 1px outline and specular."""
    if outline is not None:
        cv.stamp(dilate(m), x0 - 1, y0 - 1, outline)
    cv.stamp(m, x0, y0, base)
    if sh is not None:
        s = m & ~shift(m, hi_dir[0] * k, hi_dir[1] * k)
        cv.stamp(s, x0, y0, sh)
    if hi is not None:
        hmask = m & ~shift(m, -hi_dir[0] * k, -hi_dir[1] * k)
        cv.stamp(hmask, x0, y0, hi)
    if spec is not None:
        # small specular block toward the light
        ys, xs = np.nonzero(m)
        if len(xs):
            cx = (xs.max() + xs.min()) / 2
            cy = (ys.max() + ys.min()) / 2
            rx = (xs.max() - xs.min() + 1) / 2
            ry = (ys.max() - ys.min() + 1) / 2
            sx = int(round(cx + hi_dir[0] * rx * 0.42))
            sy = int(round(cy + hi_dir[1] * ry * 0.42))
            sz = 1 if rx < 5 else 2
            sm = np.zeros_like(m)
            sm[max(0, sy):max(0, sy) + sz, max(0, sx):max(0, sx) + sz] = True
            cv.stamp(sm & m, x0, y0, spec)


def glow(cv, x, y, r, color, level=0.6):
    """Radial glow (TOON.glow) in pixel form: three nested dithered discs,
    pattern anchored to the light so it does not crawl."""
    if level <= 0 or r < 1:
        return
    ox, oy = int(math.floor(x)), int(math.floor(y))
    for k, lv in ((1.0, 0.28), (0.62, 0.52), (0.34, 0.85)):
        m, x0, y0 = disc_mask(x, y, max(0.8, r * k))
        cv.stamp_dither(m, x0, y0, color, level * lv, ox=ox, oy=oy)


def shaded_disc(cv, cx, cy, r, base, hi=None, sh=None, outline=None, spec=None, k=None):
    m, x0, y0 = disc_mask(cx, cy, r)
    if k is None:
        k = 1 if r < 7 else 2
    shaded_mask(cv, m, x0, y0, base, hi, sh, outline, k=k, spec=spec)


# ----------------------------------------------------------------- text
def text(cv, font, s, x, y, color, outline=BG0, shadow=None, scale=1,
         align="left", reveal=None, outline8=True):
    if reveal is not None:
        s_vis = s[:max(0, int(reveal))]
    else:
        s_vis = s
    full_w = font.width(s) * scale
    if align == "center":
        x = x - full_w / 2
    elif align == "right":
        x = x - full_w
    x, y = int(round(x)), int(round(y))
    if not s_vis:
        return x, y, full_w
    m = font.mask(s_vis, scale)
    om = dilate8(m) if outline8 else dilate(m)
    if shadow is not None:
        # drop shadow: outline silhouette pushed one pixel down
        cv.stamp(om, x - 1, y, shadow)
    if outline is not None:
        cv.stamp(om, x - 1, y - 1, outline)
    cv.stamp(m, x, y, color)
    return x, y, full_w


# ------------------------------------------------------------- spline path
class Path:
    """Catmull-Rom spline through control points with arc-length lookup."""

    def __init__(self, pts, samples_per_seg=24):
        pts = [tuple(map(float, p)) for p in pts]
        P = [pts[0]] + pts + [pts[-1]]
        out = []
        for i in range(1, len(P) - 2):
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            for k in range(samples_per_seg):
                t = k / samples_per_seg
                t2, t3 = t * t, t * t * t
                x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
                           (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                           (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
                y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
                           (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                           (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
                out.append((x, y))
        out.append(pts[-1])
        self.p = np.array(out)
        d = np.sqrt(((self.p[1:] - self.p[:-1]) ** 2).sum(1))
        self.s = np.concatenate([[0.0], np.cumsum(d)])
        self.L = float(self.s[-1])

    def at(self, s):
        s = clamp(s, 0.0, self.L)
        i = int(np.searchsorted(self.s, s) - 1)
        i = clamp(i, 0, len(self.s) - 2)
        ds = self.s[i + 1] - self.s[i]
        f = 0.0 if ds == 0 else (s - self.s[i]) / ds
        a, b = self.p[i], self.p[i + 1]
        return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)

    def tangent(self, s):
        a = self.at(s - 0.5)
        b = self.at(s + 0.5)
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy) or 1.0
        return dx / n, dy / n

    def sub(self, s0, s1, step=1.0):
        s0, s1 = clamp(s0, 0, self.L), clamp(s1, 0, self.L)
        if s1 <= s0:
            return []
        n = max(2, int((s1 - s0) / step) + 1)
        return [self.at(s0 + (s1 - s0) * i / (n - 1)) for i in range(n)]


def hash01(*args):
    """Deterministic pseudo random in [0,1) from integers."""
    h = 2166136261
    for a in args:
        h ^= (int(a) & 0xFFFFFFFF)
        h = (h * 16777619) & 0xFFFFFFFF
        h ^= h >> 13
        h = (h * 0x5bd1e995) & 0xFFFFFFFF
        h ^= h >> 15
    return (h & 0xFFFFFF) / float(0x1000000)


def to_image(cv):
    return Image.fromarray(cv.a, "RGB")
