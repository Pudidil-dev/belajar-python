"""Smooth 2D drawing on a float RGB canvas (no pixel art): every shape is a signed distance in pixels, so edges are
anti-aliased; a shape can be filled flat, with a gradient, or lit like a soft 3D object (its height is "inflated"
from the distance to its edge); plus blur, soft shadows, grain, halftone dots and text.

Coordinates are canvas pixels, x to the right and y down. Light comes from the upper left, toward the viewer.
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
FONTS = '/usr/share/fonts/opentype/inter/'
LIGHT = np.array([-0.5, -0.65, 0.58], np.float32)
LIGHT /= np.linalg.norm(LIGHT)


def hexc(s):
    return np.array([int(s[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0


def mix(a, b, t):
    return a + (np.asarray(b, np.float32) - a) * t


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


class Reg:
    """A box of the canvas and the pixel-centre coordinates inside it."""
    __slots__ = ('sy', 'sx', 'X', 'Y')

    def __init__(self, sy, sx, X, Y):
        self.sy, self.sx, self.X, self.Y = sy, sx, X, Y


class Canvas:
    def __init__(self, w=W, h=H, color=(1.0, 1.0, 1.0)):
        self.w, self.h = w, h
        self.px = np.empty((h, w, 3), np.float32)
        self.px[:] = color

    def reg(self, x0, y0, x1, y1, pad=3):
        i0, i1 = max(int(math.floor(x0)) - pad, 0), min(int(math.ceil(x1)) + pad, self.w)
        j0, j1 = max(int(math.floor(y0)) - pad, 0), min(int(math.ceil(y1)) + pad, self.h)
        if i0 >= i1 or j0 >= j1:
            return None
        X = np.arange(i0, i1, dtype=np.float32)[None, :] + 0.5
        Y = np.arange(j0, j1, dtype=np.float32)[:, None] + 0.5
        return Reg(slice(j0, j1), slice(i0, i1), X, Y)

    def full(self):
        return self.reg(0, 0, self.w, self.h, pad=0)

    def view(self, r):
        return self.px[r.sy, r.sx]

    def paint(self, r, alpha, color):
        """Blend `color` (an RGB triple or an image the size of the box) in, with coverage `alpha`."""
        v = self.view(r)
        a = np.clip(alpha, 0, 1)[..., None]
        c = np.asarray(color, np.float32)
        v[:] = v * (1 - a) + c * a

    def multiply(self, r, alpha, factor):
        v = self.view(r)
        a = np.clip(alpha, 0, 1)[..., None]
        v[:] = v * (1 - a + a * np.asarray(factor, np.float32))

    def save(self, path):
        Image.fromarray((np.clip(self.px, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path)

    def image(self):
        return Image.fromarray((np.clip(self.px, 0, 1) * 255 + 0.5).astype(np.uint8))


# ---------------------------------------------------------------- signed distances (pixels; negative inside)
def sd_circle(X, Y, cx, cy, r):
    return np.hypot(X - cx, Y - cy) - r


def sd_ellipse(X, Y, cx, cy, rx, ry, ang=0.0):
    a = math.radians(ang)
    dx, dy = X - cx, Y - cy
    u = dx * math.cos(a) + dy * math.sin(a)
    v = -dx * math.sin(a) + dy * math.cos(a)
    k = np.hypot(u / rx, v / ry)
    return (k - 1.0) * min(rx, ry)


def sd_box(X, Y, cx, cy, hw, hh, r=0.0, ang=0.0):
    a = math.radians(ang)
    dx, dy = X - cx, Y - cy
    u = dx * math.cos(a) + dy * math.sin(a)
    v = -dx * math.sin(a) + dy * math.cos(a)
    qx, qy = np.abs(u) - (hw - r), np.abs(v) - (hh - r)
    out = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
    return out + np.minimum(np.maximum(qx, qy), 0) - r


def sd_segment(X, Y, ax, ay, bx, by, r):
    """A capsule: the segment a-b thickened by r."""
    px, py = X - ax, Y - ay
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy
    t = np.clip((px * vx + py * vy) / max(L2, 1e-9), 0, 1)
    return np.hypot(px - vx * t, py - vy * t) - r


def sd_taper(X, Y, ax, ay, bx, by, ra, rb):
    """A capsule whose radius goes from ra at a to rb at b."""
    px, py = X - ax, Y - ay
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy
    t = np.clip((px * vx + py * vy) / max(L2, 1e-9), 0, 1)
    return np.hypot(px - vx * t, py - vy * t) - (ra + (rb - ra) * t)


def sd_poly(X, Y, pts):
    pts = np.asarray(pts, np.float32)
    n = len(pts)
    d = np.full(np.broadcast(X, Y).shape, np.inf, np.float32)
    inside = np.zeros(d.shape, bool)
    for i in range(n):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % n]
        px, py = X - ax, Y - ay
        vx, vy = bx - ax, by - ay
        t = np.clip((px * vx + py * vy) / max(vx * vx + vy * vy, 1e-9), 0, 1)
        d = np.minimum(d, np.hypot(px - vx * t, py - vy * t))
        cond = (ay > Y) != (by > Y)
        with np.errstate(divide='ignore', invalid='ignore'):
            xi = ax + (Y - ay) * (bx - ax) / (by - ay)
        inside ^= cond & (X < xi)
    return np.where(inside, -d, d)


def sd_polyline(X, Y, pts, r):
    d = None
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        s = sd_segment(X, Y, ax, ay, bx, by, r)
        d = s if d is None else np.minimum(d, s)
    return d


def smin(a, b, k):
    """Smooth union (blobby join of radius k)."""
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)


def cov(d, aa=1.0):
    return np.clip(0.5 - d / aa, 0.0, 1.0)


# ---------------------------------------------------------------- soft 3D
def inflate(d, R):
    """Height of a shape inflated like a pillow: round within R of its edge, flat beyond."""
    depth = np.clip(-d, 0, None)
    t = np.clip(depth / R, 0, 1)
    return R * np.sqrt(1 - (1 - t) ** 2)


def normals(z):
    gy, gx = np.gradient(z)
    n = np.stack([-gx, -gy, np.ones_like(z)], -1)
    return n / np.linalg.norm(n, axis=-1, keepdims=True)


def lit(base, n, amb=0.38, spec=0.35, shine=24.0, rim=None, rim_k=0.0, shadow=None, light=LIGHT):
    """Light a surface: Lambert + Blinn specular + an optional rim colour at grazing angles and a tinted shadow."""
    base = np.asarray(base, np.float32)
    diff = np.clip(n @ light, 0, 1)
    h = light + np.array([0, 0, 1], np.float32)
    h /= np.linalg.norm(h)
    sp = np.clip(n @ h, 0, 1) ** shine
    col = base * (amb + (1 - amb) * diff)[..., None]
    if shadow is not None:
        col = mix(col, np.asarray(shadow, np.float32) * (amb + 0.25), ((1 - diff) * 0.55)[..., None])
    if rim is not None and rim_k > 0:
        g = (1 - np.clip(n[..., 2], 0, 1)) ** 2.2
        col = mix(col, rim, (g * rim_k)[..., None])
    return col + (sp * spec)[..., None]


def solid(cv, r, d, base, R=40.0, aa=1.2, **kw):
    """Fill a shape as a lit soft-3D object. Returns the normals (for extra effects)."""
    n = normals(inflate(d, R))
    cv.paint(r, cov(d, aa), lit(base, n, **kw))
    return n


# ---------------------------------------------------------------- blur, shadows
def _box1(a, r, axis):
    if r < 1:
        return a
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    p = np.pad(a, pad, mode='edge')
    c = np.cumsum(p, axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def blur(a, r):
    r = int(round(r / 1.7))
    for _ in range(3):
        a = _box1(_box1(a, r, 0), r, 1)
    return a


def soft_shadow(cv, mask_full, dx, dy, radius, strength, color=(0, 0, 0)):
    """A blurred, offset copy of a full-canvas coverage mask, darkening (or tinting) what is below."""
    m = np.roll(np.roll(mask_full, int(dy), 0), int(dx), 1)
    m = blur(m, radius) * strength
    cv.px[:] = cv.px * (1 - m[..., None]) + np.asarray(color, np.float32) * m[..., None]


def full_mask(cv, r, alpha):
    m = np.zeros((cv.h, cv.w), np.float32)
    m[r.sy, r.sx] = alpha
    return m


# ---------------------------------------------------------------- grain and halftone
def grain(cv, r, mask, density, color, size=3, seed=0):
    """Stipple: square dots scattered inside `mask`, `density` (0..1, scalar or array) of the cells."""
    h, w = mask.shape
    rng = np.random.default_rng(seed)
    gh, gw = (h + size - 1) // size, (w + size - 1) // size
    pick = rng.random((gh, gw)) < 1.0
    field = rng.random((gh, gw))
    dots = np.kron(field, np.ones((size, size)))[:h, :w]
    dens = np.broadcast_to(np.asarray(density, np.float32), (h, w))
    hit = (dots < dens) & (mask > 0.5) & np.kron(pick, np.ones((size, size), bool))[:h, :w]
    cv.paint(r, hit.astype(np.float32), color)


def halftone(cv, r, tone, color, spacing=18.0, ang=45.0, aa=1.0):
    """Ben-Day dots on a rotated grid; `tone` (0..1, scalar or array) sets each dot's area."""
    a = math.radians(ang)
    u = r.X * math.cos(a) + r.Y * math.sin(a)
    v = -r.X * math.sin(a) + r.Y * math.cos(a)
    fu = (u / spacing) % 1.0 - 0.5
    fv = (v / spacing) % 1.0 - 0.5
    dist = np.hypot(fu, fv) * spacing
    rad = np.sqrt(np.clip(tone, 0, 1) / math.pi) * spacing
    cv.paint(r, cov(dist - rad, aa), color)


# ---------------------------------------------------------------- text
def text_mask(s, size, weight='Bold', italic=False, stroke=0):
    name = 'Inter-%s%s.otf' % (weight, 'Italic' if italic else '')
    if weight == 'Regular' and italic:
        name = 'Inter-Italic.otf'
    f = ImageFont.truetype(FONTS + name, size)
    l, t, rr, b = f.getbbox(s, stroke_width=stroke)
    im = Image.new('L', (rr - l + 4, b - t + 4), 0)
    ImageDraw.Draw(im).text((2 - l, 2 - t), s, font=f, fill=255, stroke_width=stroke, stroke_fill=255)
    return np.asarray(im, np.float32) / 255.0


def text(cv, s, x, y, size, color, weight='Bold', italic=False, anchor='mm', stroke=0, stroke_color=None, rot=0.0):
    """Draw text; with stroke > 0 it gets an outline of that width in stroke_color."""
    layers = []
    if stroke > 0:
        layers.append((text_mask(s, size, weight, italic, stroke), stroke_color))
    layers.append((text_mask(s, size, weight, italic, 0), color))
    big = layers[0][0]
    for m, col in layers:
        if rot:
            im = Image.fromarray((m * 255).astype(np.uint8)).rotate(rot, resample=Image.BICUBIC, expand=True)
            m = np.asarray(im, np.float32) / 255.0
        hh, ww = m.shape
        ox = {'l': 0, 'm': ww / 2, 'r': ww}[anchor[0]]
        oy = {'t': 0, 'm': hh / 2, 'b': hh}[anchor[1]]
        x0, y0 = int(round(x - ox)), int(round(y - oy))
        r = cv.reg(x0, y0, x0 + ww, y0 + hh, pad=0)
        if r is None:
            continue
        mm = m[r.sy.start - y0:r.sy.stop - y0, r.sx.start - x0:r.sx.stop - x0]
        cv.paint(r, mm, col)
