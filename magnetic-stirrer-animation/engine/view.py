"""The world camera: millimetres in, crisp canvas pixels out.

Nothing in this film is a fixed sprite. Every frame re-rasterizes the world (head, mask, nebulizer, mesh, droplets) at
the camera's zoom on the 270x480 canvas, so a 1-px outline stays 1 px at every scale and pushing in reveals new
structure (the mesh holes, the liquid tip) instead of fattening pixels.

Helpers here: world<->canvas transforms, canvas boxes for world rectangles, per-pixel world grids, signed-distance
primitives, a ramp painter with Bayer dither, and precomputed signed-distance grids for hand-drawn outlines
(used to light the head and the hand like 3D surfaces).
"""
import math
import numpy as np
from PIL import Image, ImageDraw
from . import gfx

W, H = gfx.W, gfx.H


class View:
    __slots__ = ('cx', 'cy', 'z', 'ox', 'oy')

    def __init__(self, cx, cy, z):
        self.cx, self.cy, self.z = float(cx), float(cy), float(z)
        self.ox = W / 2 - self.cx * self.z         # canvas x of world x = 0
        self.oy = H / 2 - self.cy * self.z

    def apply(self):
        gfx.set_dither_origin(self.ox, self.oy)

    # ---- transforms
    def px(self, x, y):
        return x * self.z + self.ox, y * self.z + self.oy

    def wx(self, i):
        return (i + 0.5 - self.ox) / self.z

    def wy(self, j):
        return (j + 0.5 - self.oy) / self.z

    def world_rect(self):
        return self.wx(-0.5), self.wy(-0.5), self.wx(W - 0.5), self.wy(H - 0.5)

    def visible(self, x0, y0, x1, y1, pad=0.0):
        a, b, c, d = self.world_rect()
        p = pad / self.z
        return not (x1 < a - p or x0 > c + p or y1 < b - p or y0 > d + p)

    def box(self, x0, y0, x1, y1, pad=2):
        """Canvas box (i0, j0, i1, j1) covering the world rectangle, clipped; None when off screen."""
        i0 = int(math.floor(x0 * self.z + self.ox)) - pad
        j0 = int(math.floor(y0 * self.z + self.oy)) - pad
        i1 = int(math.ceil(x1 * self.z + self.ox)) + pad
        j1 = int(math.ceil(y1 * self.z + self.oy)) + pad
        i0, j0, i1, j1 = max(i0, 0), max(j0, 0), min(i1, W), min(j1, H)
        if i1 <= i0 or j1 <= j0:
            return None
        return i0, j0, i1, j1

    def grid(self, bx):
        i0, j0, i1, j1 = bx
        X = ((np.arange(i0, i1) + 0.5 - self.ox) / self.z)[None, :]
        Y = ((np.arange(j0, j1) + 0.5 - self.oy) / self.z)[:, None]
        return X, Y

    def full(self):
        return 0, 0, W, H


# ------------------------------------------------------------------ signed distances (world units, negative inside)
def sd_circle(X, Y, cx, cy, r):
    return np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) - r


def sd_box(X, Y, x0, y0, x1, y1, r=0.0):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    hx, hy = (x1 - x0) / 2 - r, (y1 - y0) / 2 - r
    qx, qy = np.abs(X - cx) - hx, np.abs(Y - cy) - hy
    out = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2)
    return out + np.minimum(np.maximum(qx, qy), 0) - r


def sd_ellipse(X, Y, cx, cy, rx, ry):
    """Cheap ellipse distance (exact on the axes, good enough for outlines and bevels)."""
    k0 = np.sqrt(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2)
    k1 = np.sqrt(((X - cx) / rx ** 2) ** 2 + ((Y - cy) / ry ** 2) ** 2)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sd_capsule(X, Y, ax, ay, bx, by, r):
    pax, pay = X - ax, Y - ay
    bax, bay = bx - ax, by - ay
    h = np.clip((pax * bax + pay * bay) / max(bax * bax + bay * bay, 1e-12), 0, 1)
    return np.sqrt((pax - bax * h) ** 2 + (pay - bay * h) ** 2) - r


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)


# ------------------------------------------------------------------ painting
def put(buf, bx, sel, colors):
    """Write colours (h, w, 3 array or one rgb) into the box where sel (h, w bool) is set."""
    i0, j0, i1, j1 = bx
    sub = buf[j0:j1, i0:i1]
    if isinstance(colors, np.ndarray) and colors.ndim == 3:
        sub[sel] = colors[sel]
    else:
        sub[sel] = colors


def tones(ramp, v, bx):
    """Ramp colours for values v in [0, 1] over box bx, ordered-dithered (16-bit gradient)."""
    i0, j0, i1, j1 = bx
    th = gfx.bayer_at(i0, j0, j1 - j0, i1 - i0)
    n = len(ramp)
    idx = np.clip(np.floor(np.asarray(v, np.float32) * (n - 1) + th), 0, n - 1).astype(np.int32)
    idx = np.broadcast_to(idx, (j1 - j0, i1 - i0))
    return np.asarray(ramp, np.uint8)[idx]


def mix(buf, bx, sel, color, a):
    """Colour math: mix toward `color` by a (scalar or box array), only where sel."""
    i0, j0, i1, j1 = bx
    sub = buf[j0:j1, i0:i1]
    a = np.broadcast_to(np.asarray(a, np.float32), sel.shape)
    m = sel & (a > 0)
    if not m.any():
        return
    px = sub[m].astype(np.float32)
    col = np.asarray(color, np.float32)
    if col.ndim == 3:
        col = col[m]
    sub[m] = np.clip(px + (col - px) * a[m][:, None], 0, 255).astype(np.uint8)


def dither_mask(a, bx):
    """Boolean mask that is set on a fraction a (0..1) of the pixels, Bayer-ordered (SNES-style transparency)."""
    i0, j0, i1, j1 = bx
    return np.asarray(a) > gfx.bayer_at(i0, j0, j1 - j0, i1 - i0)


def edge(d, z, width=1.0):
    """Inner outline: pixels inside the shape within `width` canvas px of its edge."""
    return (d < 0) & (d > -width / z)


# ------------------------------------------------------------------ hand-drawn outlines
def catmull(pts, n=8, closed=True):
    """Smooth a control polygon with a Catmull-Rom spline (n points per segment)."""
    P = np.asarray(pts, float)
    if closed:
        P = np.vstack([P[-1], P, P[0], P[1]])
    else:
        P = np.vstack([P[0], P, P[-1]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            s = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * s ** 3))
    if not closed:
        out.append(P[-2])
    return np.array(out)


def poly_sel(view, pts, bx, ox=0.0, oy=0.0):
    """Rasterize a world polygon (shifted by ox, oy) inside canvas box bx -> (h, w) bool."""
    i0, j0, i1, j1 = bx
    P = np.asarray(pts, float)
    xs = (P[:, 0] + ox) * view.z + view.ox - i0
    ys = (P[:, 1] + oy) * view.z + view.oy - j0
    im = Image.new('1', (i1 - i0, j1 - j0), 0)
    lim = 4 * max(W, H)
    pts_c = [(float(np.clip(x, -lim, lim)), float(np.clip(y, -lim, lim))) for x, y in zip(xs, ys)]
    ImageDraw.Draw(im).polygon(pts_c, fill=1)
    return np.array(im, bool)


def poly_bounds(pts, pad=0.0):
    P = np.asarray(pts, float)
    return P[:, 0].min() - pad, P[:, 1].min() - pad, P[:, 0].max() + pad, P[:, 1].max() + pad


class SDFGrid:
    """Signed distance to a closed outline, precomputed on a world grid (res mm) and sampled bilinearly.

    Used for lighting only (the silhouette itself is rasterized crisp every frame), so 0.5 mm resolution is plenty.
    Also stores the gradient, i.e. the outward surface normal of the inflated shape."""

    def __init__(self, pts, res=0.5, pad=6.0):
        P = np.asarray(pts, float)
        x0, y0, x1, y1 = poly_bounds(P, pad)
        self.x0, self.y0, self.res = x0, y0, res
        nx, ny = int(math.ceil((x1 - x0) / res)) + 1, int(math.ceil((y1 - y0) / res)) + 1
        gx = x0 + np.arange(nx) * res
        gy = y0 + np.arange(ny) * res
        GX, GY = np.meshgrid(gx, gy)
        d2 = np.full(GX.shape, np.inf)
        A = P
        B = np.roll(P, -1, axis=0)
        for (ax, ay), (bx_, by_) in zip(A, B):
            dx, dy = bx_ - ax, by_ - ay
            L = dx * dx + dy * dy
            if L < 1e-12:
                continue
            h = np.clip(((GX - ax) * dx + (GY - ay) * dy) / L, 0, 1)
            d2 = np.minimum(d2, (GX - ax - dx * h) ** 2 + (GY - ay - dy * h) ** 2)
        im = Image.new('1', (nx, ny), 0)
        ImageDraw.Draw(im).polygon([((x - x0) / res, (y - y0) / res) for x, y in P], fill=1)
        inside = np.array(im, bool)
        self.d = np.where(inside, -np.sqrt(d2), np.sqrt(d2)).astype(np.float32)
        gyy, gxx = np.gradient(self.d, res)
        nrm = np.sqrt(gxx ** 2 + gyy ** 2) + 1e-6
        self.gx, self.gy = (gxx / nrm).astype(np.float32), (gyy / nrm).astype(np.float32)

    def sample(self, X, Y, ox=0.0, oy=0.0, what='d'):
        arr = {'d': self.d, 'gx': self.gx, 'gy': self.gy}[what]
        fx = (X - ox - self.x0) / self.res
        fy = (Y - oy - self.y0) / self.res
        h, w = arr.shape
        fx = np.clip(fx, 0, w - 1.001)
        fy = np.clip(fy, 0, h - 1.001)
        ix, iy = np.floor(fx).astype(np.int32), np.floor(fy).astype(np.int32)
        ax, ay = fx - ix, fy - iy
        ix, iy = np.broadcast_arrays(ix, iy)
        ax, ay = np.broadcast_arrays(ax, ay)
        v00, v10 = arr[iy, ix], arr[iy, ix + 1]
        v01, v11 = arr[iy + 1, ix], arr[iy + 1, ix + 1]
        return (v00 * (1 - ax) + v10 * ax) * (1 - ay) + (v01 * (1 - ax) + v11 * ax) * ay


def lit(gx, gy, d, R, L=(-0.62, -0.52, 0.59)):
    """Lambert light on an 'inflated' outline: height rises over R mm from the edge, normal from the SDF gradient.

    gx, gy = outward unit normal in the picture plane; d = signed distance (negative inside). Returns 0..1."""
    u = np.clip(-d / R, 0, 1)
    slope = (1 - u) / np.sqrt(np.maximum(1 - (1 - u) ** 2, 0.02))          # d(height)/d(depth) of a quarter circle
    slope = np.minimum(slope, 6.0)
    nx, ny, nz = gx * slope, gy * slope, np.ones_like(u)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    lx, ly, lz = L
    ln = math.sqrt(lx * lx + ly * ly + lz * lz)
    return np.clip((nx * lx + ny * ly + nz * lz) / (n * ln), 0, 1)
