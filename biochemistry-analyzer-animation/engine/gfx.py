"""Low-level pixel drawing on a 270x480 RGB canvas (numpy uint8, shape (H, W, 3)).

Shapes are boolean masks that live in their own bounding box (Mask), so painting a small sprite does not touch the
whole frame. Shading uses ordered (Bayer 4x4) dithering over a palette ramp: the 16-bit way to draw a gradient with
a handful of colours. Nothing here anti-aliases: every edge is a hard pixel edge.

The dither pattern is anchored to the world (set_dither_origin, called once per frame by the camera), so when the
camera pans the pattern travels with the objects instead of sliding over them like a shower door.
"""
import numpy as np
from PIL import Image, ImageDraw

W, H = 270, 480          # the pixel canvas (9:16)
SCALE = 4                # exact nearest-neighbour upscale -> 1080x1920

_B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32)
BAYER = ((np.tile(_B4, (H // 4 + 2, W // 4 + 2)) + 0.5) / 16.0).astype(np.float32)   # thresholds in (0, 1)


_DOX, _DOY = 0, 0


def set_dither_origin(ox, oy):
    """Canvas position of the world origin (rounded): the Bayer grid is laid from there."""
    global _DOX, _DOY
    _DOX, _DOY = int(round(ox)), int(round(oy))


def bayer_at(x0, y0, h, w):
    """Bayer thresholds for a box whose top-left is (x0, y0); works for boxes partly off-canvas."""
    ys = ((np.arange(y0, y0 + h) - _DOY) % 4)[:, None]
    xs = ((np.arange(x0, x0 + w) - _DOX) % 4)[None, :]
    return (_B4[ys, xs] + 0.5) / 16.0


class Mask:
    """A boolean mask m placed at canvas position (x0, y0)."""
    __slots__ = ('x0', 'y0', 'm')

    def __init__(self, x0, y0, m):
        self.x0, self.y0, self.m = int(x0), int(y0), m

    @property
    def x1(self):
        return self.x0 + self.m.shape[1]

    @property
    def y1(self):
        return self.y0 + self.m.shape[0]

    def empty(self):
        return self.m.size == 0 or not self.m.any()

    def grid(self):
        """Pixel-centre coordinates (x row vector, y column vector) of the box."""
        return (np.arange(self.x0, self.x1) + 0.5)[None, :], (np.arange(self.y0, self.y1) + 0.5)[:, None]

    def clip(self):
        x0, y0 = max(self.x0, 0), max(self.y0, 0)
        x1, y1 = min(self.x1, W), min(self.y1, H)
        if x1 <= x0 or y1 <= y0:
            return Mask(0, 0, np.zeros((0, 0), bool))
        return Mask(x0, y0, self.m[y0 - self.y0:y1 - self.y0, x0 - self.x0:x1 - self.x0])

    def shifted(self, dx, dy):
        return Mask(self.x0 + int(dx), self.y0 + int(dy), self.m).clip()

    def _place(self, x0, y0, x1, y1):
        out = np.zeros((max(y1 - y0, 0), max(x1 - x0, 0)), bool)
        ax0, ay0 = max(x0, self.x0), max(y0, self.y0)
        ax1, ay1 = min(x1, self.x1), min(y1, self.y1)
        if ax1 > ax0 and ay1 > ay0:
            out[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0] = self.m[ay0 - self.y0:ay1 - self.y0, ax0 - self.x0:ax1 - self.x0]
        return out

    def __or__(self, o):
        if o.empty():
            return self
        if self.empty():
            return o
        x0, y0, x1, y1 = min(self.x0, o.x0), min(self.y0, o.y0), max(self.x1, o.x1), max(self.y1, o.y1)
        return Mask(x0, y0, self._place(x0, y0, x1, y1) | o._place(x0, y0, x1, y1))

    def __and__(self, o):
        x0, y0, x1, y1 = max(self.x0, o.x0), max(self.y0, o.y0), min(self.x1, o.x1), min(self.y1, o.y1)
        if x1 <= x0 or y1 <= y0:
            return Mask(0, 0, np.zeros((0, 0), bool))
        return Mask(x0, y0, self._place(x0, y0, x1, y1) & o._place(x0, y0, x1, y1))

    def __sub__(self, o):
        return Mask(self.x0, self.y0, self.m & ~o._place(self.x0, self.y0, self.x1, self.y1))

    def dilate(self, n=1, diag=False):
        m, x0, y0 = self.m, self.x0, self.y0
        for _ in range(n):
            p = np.zeros((m.shape[0] + 2, m.shape[1] + 2), bool)
            p[1:-1, 1:-1] = m
            q = p.copy()
            q[1:, :] |= p[:-1, :]
            q[:-1, :] |= p[1:, :]
            q[:, 1:] |= p[:, :-1]
            q[:, :-1] |= p[:, 1:]
            if diag:
                q[1:, 1:] |= p[:-1, :-1]
                q[1:, :-1] |= p[:-1, 1:]
                q[:-1, 1:] |= p[1:, :-1]
                q[:-1, :-1] |= p[1:, 1:]
            m, x0, y0 = q, x0 - 1, y0 - 1
        return Mask(x0, y0, m).clip()

    def outline(self, diag=False):
        return self.dilate(1, diag) - self

    def erode(self):
        inv = Mask(self.x0 - 1, self.y0 - 1, ~np.pad(self.m, 1))
        return self - inv.dilate()

    def bottom_edge(self):
        """Pixels of the mask whose lower neighbour is outside (for shadow bands)."""
        below = np.zeros_like(self.m)
        below[:-1] = self.m[1:]
        return Mask(self.x0, self.y0, self.m & ~below)

    def top_edge(self):
        above = np.zeros_like(self.m)
        above[1:] = self.m[:-1]
        return Mask(self.x0, self.y0, self.m & ~above)


EMPTY = Mask(0, 0, np.zeros((0, 0), bool))


# ------------------------------------------------------------------ shapes
def _box(x0, y0, x1, y1):
    return int(np.floor(x0)), int(np.floor(y0)), int(np.ceil(x1)), int(np.ceil(y1))


def rect(x0, y0, x1, y1):
    x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
    return Mask(x0, y0, np.ones((max(y1 - y0, 0), max(x1 - x0, 0)), bool)).clip()


def ellipse(cx, cy, rx, ry):
    """Pixels whose centres lie inside the ellipse. Use integer centres for even sizes, .5 centres for odd."""
    if rx <= 0 or ry <= 0:
        return EMPTY
    x0, y0, x1, y1 = _box(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1)
    xs = np.arange(x0, x1) + 0.5
    ys = np.arange(y0, y1) + 0.5
    m = ((xs[None, :] - cx) / rx) ** 2 + ((ys[:, None] - cy) / ry) ** 2 <= 1.0
    return Mask(x0, y0, m).clip()


def ring(cx, cy, rx, ry, t=1.0, ty=None):
    ty = t if ty is None else ty
    return ellipse(cx, cy, rx, ry) - ellipse(cx, cy, rx - t, ry - ty)


def rrect(x0, y0, x1, y1, rx, ry=None):
    """Rounded rectangle with elliptical corners (x1, y1 exclusive)."""
    ry = rx if ry is None else ry
    bx0, by0, bx1, by1 = _box(x0, y0, x1, y1)
    xs = (np.arange(bx0, bx1) + 0.5)[None, :]
    ys = (np.arange(by0, by1) + 0.5)[:, None]
    m = (xs >= x0) & (xs <= x1) & (ys >= y0) & (ys <= y1)
    if rx > 0 and ry > 0:
        cxs = np.clip(xs, x0 + rx, x1 - rx)
        cys = np.clip(ys, y0 + ry, y1 - ry)
        m &= ((xs - cxs) / rx) ** 2 + ((ys - cys) / ry) ** 2 <= 1.0
    return Mask(bx0, by0, m).clip()


def polygon(pts):
    pts = np.asarray(pts, float)
    if len(pts) < 3:
        return EMPTY
    x0, y0 = int(np.floor(pts[:, 0].min())) - 1, int(np.floor(pts[:, 1].min())) - 1
    x1, y1 = int(np.ceil(pts[:, 0].max())) + 2, int(np.ceil(pts[:, 1].max())) + 2
    if x1 - x0 > 4 * W or y1 - y0 > 4 * H:
        x0, y0, x1, y1 = max(x0, -W), max(y0, -H), min(x1, 2 * W), min(y1, 2 * H)
    im = Image.new('1', (max(x1 - x0, 1), max(y1 - y0, 1)), 0)
    ImageDraw.Draw(im).polygon([(float(x - x0), float(y - y0)) for x, y in pts], fill=1)
    return Mask(x0, y0, np.array(im, bool)).clip()


def line(x0, y0, x1, y1, width=1):
    bx0, by0 = int(min(x0, x1)) - width - 1, int(min(y0, y1)) - width - 1
    bx1, by1 = int(max(x0, x1)) + width + 2, int(max(y0, y1)) + width + 2
    im = Image.new('1', (bx1 - bx0, by1 - by0), 0)
    ImageDraw.Draw(im).line([(x0 - bx0, y0 - by0), (x1 - bx0, y1 - by0)], fill=1, width=width)
    return Mask(bx0, by0, np.array(im, bool)).clip()


def polyline(pts, width=1):
    out = EMPTY
    for a, b in zip(pts[:-1], pts[1:]):
        out = out | line(a[0], a[1], b[0], b[1], width)
    return out


def from_full(full):
    ys, xs = np.nonzero(full)
    if len(xs) == 0:
        return EMPTY
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    return Mask(x0, y0, full[y0:y1, x0:x1].copy())


# ------------------------------------------------------------------ painting
def _sub(buf, mk):
    return buf[mk.y0:mk.y1, mk.x0:mk.x1]


def fill(buf, mk, color):
    if mk.empty():
        return
    _sub(buf, mk)[mk.m] = color


def fill_dither(buf, mk, c0, c1, r):
    """c1 where the dither threshold is below r (r scalar or array of the mask's box shape)."""
    if mk.empty():
        return
    th = bayer_at(mk.x0, mk.y0, *mk.m.shape)
    pick = np.asarray(r) > th
    sub = _sub(buf, mk)
    if c0 is not None:
        sub[mk.m & ~pick] = c0
    sub[mk.m & pick] = c1


def shade(buf, mk, ramp, v):
    """Paint the mask with tones of `ramp` chosen by v in [0, 1] (scalar or box-shaped array), dithered."""
    if mk.empty():
        return
    n = len(ramp)
    th = bayer_at(mk.x0, mk.y0, *mk.m.shape)
    idx = np.clip(np.floor(np.asarray(v, np.float32) * (n - 1) + th), 0, n - 1).astype(np.int32)
    idx = np.broadcast_to(idx, mk.m.shape)
    _sub(buf, mk)[mk.m] = np.asarray(ramp, np.uint8)[idx[mk.m]]


def blend(buf, mk, color, a):
    """Colour math (SNES half-add style): mix the mask area towards `color` by a."""
    if mk.empty():
        return
    sub = _sub(buf, mk)
    px = sub[mk.m].astype(np.float32)
    sub[mk.m] = np.clip(px + (np.asarray(color, np.float32) - px) * a, 0, 255).astype(np.uint8)


def quantize(rgb, pal, x0=0, y0=0, spread=24.0):
    """Ordered-dither an RGB float image (h, w, 3) onto palette colours (P, 3)."""
    h, w = rgb.shape[:2]
    th = bayer_at(x0, y0, h, w)[..., None]
    q = rgb + (th - 0.5) * spread
    pal = np.asarray(pal, np.float32)
    d = ((q.reshape(-1, 1, 3) - pal[None, :, :]) ** 2).sum(-1)
    return pal[np.argmin(d, 1)].reshape(h, w, 3).astype(np.uint8)


def paste_rgb(buf, img, x0, y0, mk=None):
    """Paste an (h, w, 3) uint8 image at (x0, y0), optionally only where `mk` (a Mask in canvas space) is set."""
    h, w = img.shape[:2]
    bx0, by0, bx1, by1 = max(x0, 0), max(y0, 0), min(x0 + w, W), min(y0 + h, H)
    if bx1 <= bx0 or by1 <= by0:
        return
    src = img[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0]
    dst = buf[by0:by1, bx0:bx1]
    if mk is None:
        dst[...] = src
    else:
        sel = Mask(bx0, by0, np.ones((by1 - by0, bx1 - bx0), bool)) & mk
        if sel.empty():
            return
        m = Mask(bx0, by0, np.zeros((by1 - by0, bx1 - bx0), bool))
        m.m[sel.y0 - by0:sel.y1 - by0, sel.x0 - bx0:sel.x1 - bx0] = sel.m
        dst[m.m] = src[m.m]


def paste_sprite(buf, spr, x, y):
    """Sprite = (rgb uint8 (h,w,3), alpha bool (h,w)); (x, y) = top-left in canvas pixels."""
    rgb, a = spr
    h, w = a.shape
    x, y = int(x), int(y)
    bx0, by0, bx1, by1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if bx1 <= bx0 or by1 <= by0:
        return
    aa = a[by0 - y:by1 - y, bx0 - x:bx1 - x]
    buf[by0:by1, bx0:bx1][aa] = rgb[by0 - y:by1 - y, bx0 - x:bx1 - x][aa]


# ------------------------------------------------------------------ whole-frame effects
def brightness(buf, level):
    """SNES master brightness: 16 steps (level 0..1)."""
    k = round(max(0.0, min(1.0, level)) * 15) / 15.0
    if k >= 1:
        return buf
    return (buf.astype(np.float32) * k).astype(np.uint8)


def whiten(buf, k, color=(255, 253, 247)):
    k = round(max(0.0, min(1.0, k)) * 15) / 15.0
    if k <= 0:
        return buf
    f = buf.astype(np.float32)
    return (f + (np.asarray(color, np.float32) - f) * k).astype(np.uint8)


def mosaic(buf, n):
    """SNES mosaic: each n x n block takes its top-left pixel."""
    n = int(n)
    if n <= 1:
        return buf
    small = buf[::n, ::n]
    return np.repeat(np.repeat(small, n, 0), n, 1)[:buf.shape[0], :buf.shape[1]]


# ------------------------------------------------------------------ camera / upscale (done at output resolution)
def upscale(buf, scale=SCALE):
    return np.repeat(np.repeat(buf, scale, 0), scale, 1)


def camera(buf, zoom=1.0, cx=W / 2, cy=H / 2, scale=SCALE, sx=0.0, sy=0.0, rot=0.0):
    """Sample the pixel canvas through a camera centred on canvas point (cx, cy) with `zoom`, at output size.

    The pixels grow as one grid, so zooms stay crisp (no blur, no resampling filter). sx, sy shift the frame in
    output pixels (screen shake); rot rolls the camera (radians; a world vector appears rotated by rot)."""
    if abs(zoom - 1) < 1e-6 and abs(cx - W / 2) < 1e-6 and abs(cy - H / 2) < 1e-6 and sx == 0 and sy == 0 \
            and abs(rot) < 1e-6:
        return upscale(buf, scale)
    OW, OH = W * scale, H * scale
    dx = (np.arange(OW) + 0.5 - OW / 2 - sx) / (scale * zoom)
    dy = (np.arange(OH) + 0.5 - OH / 2 - sy) / (scale * zoom)
    if abs(rot) < 1e-6:
        xs = np.floor(cx + dx).astype(np.int32)
        ys = np.floor(cy + dy).astype(np.int32)
        np.clip(xs, 0, W - 1, out=xs)
        np.clip(ys, 0, H - 1, out=ys)
        return buf[ys[:, None], xs[None, :]]
    c, s = np.cos(rot), np.sin(rot)
    X = np.floor(cx + c * dx[None, :] + s * dy[:, None]).astype(np.int32)
    Y = np.floor(cy - s * dx[None, :] + c * dy[:, None]).astype(np.int32)
    np.clip(X, 0, W - 1, out=X)
    np.clip(Y, 0, H - 1, out=Y)
    return buf[Y, X]


def camera_mask(full_mask, zoom=1.0, cx=W / 2, cy=H / 2, scale=SCALE):
    OW, OH = W * scale, H * scale
    xs = np.clip(np.floor(cx + (np.arange(OW) + 0.5 - OW / 2) / (scale * zoom)).astype(np.int32), 0, W - 1)
    ys = np.clip(np.floor(cy + (np.arange(OH) + 0.5 - OH / 2) / (scale * zoom)).astype(np.int32), 0, H - 1)
    return full_mask[ys[:, None], xs[None, :]]
