"""A small vectorized ray tracer that turns simple solids into 16-bit "pre-rendered sprite" pixel art.

Solids: convex polyhedra (boxes, bevelled boxes, wedges), capped cylinders and cone frustums, spheres, and A-minus-B for
holes. Every pixel casts one ray; the nearest hit gives a part id, a depth, a normal and a world point. The caller
shades each part from a palette ramp with ordered dithering, then rt.outline() draws the 1-px dark silhouette and the
darker inner lines between parts, so the result reads as hand-pixelled shading, not a smooth 3D render.
"""
import math
import numpy as np

EPS = 1e-4
INF = np.float64(1e30)


def norm(v):
    v = np.asarray(v, np.float64)
    return v / np.linalg.norm(v)


def frame_from_axis(axis):
    """3x3 matrix whose columns (u, v, w) are an orthonormal frame with w = axis."""
    w = norm(axis)
    a = np.array([1.0, 0, 0]) if abs(w[0]) < 0.9 else np.array([0, 1.0, 0])
    u = norm(np.cross(a, w))
    v = np.cross(w, u)
    return np.stack([u, v, w], 1)


def rot_axis(axis, ang):
    """Rotation matrix about a unit axis (Rodrigues)."""
    k = norm(axis)
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + math.sin(ang) * K + (1 - math.cos(ang)) * K @ K


# ---------------------------------------------------------------- camera
class Camera:
    def __init__(self, eye, target, up=(0, 1, 0), fov=30.0, ortho=None, W=270, H=480):
        self.eye = np.asarray(eye, np.float64)
        self.f = norm(np.asarray(target, np.float64) - self.eye)
        self.r = norm(np.cross(self.f, up))
        self.u = np.cross(self.r, self.f)
        self.fov, self.ortho, self.W, self.H = fov, ortho, W, H
        self.th = math.tan(math.radians(fov) / 2)

    def rays(self):
        W, H = self.W, self.H
        x = (np.arange(W) + 0.5 - W / 2) / (H / 2)
        y = -(np.arange(H) + 0.5 - H / 2) / (H / 2)
        X, Y = np.meshgrid(x, y)
        X, Y = X.ravel(), Y.ravel()
        if self.ortho is None:
            d = self.f[None, :] + (X * self.th)[:, None] * self.r[None, :] + (Y * self.th)[:, None] * self.u[None, :]
            d /= np.linalg.norm(d, axis=1, keepdims=True)
            o = np.broadcast_to(self.eye, d.shape).copy()
        else:
            h = self.ortho / 2
            o = self.eye[None, :] + (X * h)[:, None] * self.r[None, :] + (Y * h)[:, None] * self.u[None, :]
            d = np.broadcast_to(self.f, o.shape).copy()
        return o, d

    def project(self, p):
        """Canvas (x, y, depth) of a world point."""
        v = np.asarray(p, np.float64) - self.eye
        z = v @ self.f
        if self.ortho is None:
            s = (self.H / 2) / (max(z, 1e-6) * self.th)
        else:
            s = self.H / self.ortho
        return self.W / 2 + (v @ self.r) * s, self.H / 2 - (v @ self.u) * s, z

    def bbox(self, c, r):
        """Canvas box (x0, y0, x1, y1) covering a sphere, or None if it is off screen / behind."""
        x, y, z = self.project(c)
        if self.ortho is None:
            if z <= r * 1.05:
                return 0, 0, self.W, self.H
            s = (self.H / 2) / ((z - r) * self.th)
        else:
            s = self.H / self.ortho
        rr = r * s * 1.08 + 2
        x0, x1 = int(math.floor(x - rr)), int(math.ceil(x + rr))
        y0, y1 = int(math.floor(y - rr)), int(math.ceil(y + rr))
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, self.W), min(y1, self.H)
        if x1 <= x0 or y1 <= y0:
            return None
        return x0, y0, x1, y1


# ---------------------------------------------------------------- solids
class Solid:
    """A closed solid. hits(o, d) -> list of (t, normal); inside(p) -> bool array."""
    center = np.zeros(3)
    radius = 1.0

    def first(self, o, d):
        best = np.full(len(o), INF)
        nb = np.zeros_like(o)
        for t, n in self.hits(o, d):
            ok = (t > EPS) & (t < best)
            best = np.where(ok, t, best)
            nb = np.where(ok[:, None], n, nb)
        return best, nb


class Poly(Solid):
    """Convex polyhedron: points p with n_k . p <= d_k for all planes."""

    def __init__(self, normals, offsets):
        self.N = np.array([norm(n) for n in normals])
        self.D = np.asarray(offsets, np.float64) / np.linalg.norm(np.asarray(normals, np.float64), axis=1)

    def hits(self, o, d):
        den = d @ self.N.T
        num = self.D[None, :] - o @ self.N.T
        with np.errstate(divide='ignore', invalid='ignore'):
            tt = num / den
        ent = np.where(den < -1e-12, tt, -INF)
        ext = np.where(den > 1e-12, tt, INF)
        par_out = ((np.abs(den) <= 1e-12) & (num < 0)).any(1)
        k_in = np.argmax(ent, 1)
        k_out = np.argmin(ext, 1)
        t_in = ent[np.arange(len(o)), k_in]
        t_out = ext[np.arange(len(o)), k_out]
        miss = par_out | (t_in > t_out)
        t_in = np.where(miss, INF, t_in)
        t_out = np.where(miss, INF, t_out)
        return [(t_in, self.N[k_in]), (t_out, -self.N[k_out])]

    def inside(self, p):
        return ((p @ self.N.T) <= self.D[None, :] + 1e-6).all(1)


def box(center, half, R=None, bevel=0.0):
    """Box with half sizes (hx, hy, hz); R's columns are its axes; bevel cuts the 12 edges at 45 degrees."""
    c = np.asarray(center, np.float64)
    R = np.eye(3) if R is None else np.asarray(R, np.float64)
    hx, hy, hz = half
    ns, ds = [], []
    for ax, h in ((0, hx), (1, hy), (2, hz)):
        for sgn in (1, -1):
            n = sgn * R[:, ax]
            ns.append(n)
            ds.append(n @ c + h)
    if bevel > 0:
        for a, b in ((0, 1), (0, 2), (1, 2)):
            ha, hb = (hx, hy, hz)[a], (hx, hy, hz)[b]
            for sa in (1, -1):
                for sb in (1, -1):
                    n = norm(sa * R[:, a] + sb * R[:, b])
                    ns.append(n)
                    ds.append(n @ c + (ha + hb - bevel) / math.sqrt(2))
    p = Poly(ns, ds)
    p.center = c
    p.radius = math.sqrt(hx * hx + hy * hy + hz * hz)
    return p


def poly(points_planes, center, radius):
    p = Poly([n for n, _ in points_planes], [d for _, d in points_planes])
    p.center, p.radius = np.asarray(center, np.float64), radius
    return p


class Frustum(Solid):
    """Capped cone frustum (a cylinder when r0 == r1) from `base` along `axis` for length h."""

    def __init__(self, base, axis, r0, r1, h):
        self.base = np.asarray(base, np.float64)
        self.R = frame_from_axis(axis)
        self.r0, self.r1, self.h = float(r0), float(r1), float(h)
        self.s = (self.r1 - self.r0) / self.h
        self.center = self.base + self.R[:, 2] * h / 2
        self.radius = math.sqrt((h / 2) ** 2 + max(r0, r1) ** 2)

    def local(self, p):
        return (p - self.base) @ self.R

    def hits(self, o, d):
        lo = (o - self.base) @ self.R
        ld = d @ self.R
        ox, oy, oz = lo[:, 0], lo[:, 1], lo[:, 2]
        dx, dy, dz = ld[:, 0], ld[:, 1], ld[:, 2]
        s, r0, h = self.s, self.r0, self.h
        k = r0 + s * oz
        A = dx * dx + dy * dy - s * s * dz * dz
        B = 2 * (ox * dx + oy * dy - s * k * dz)
        C = ox * ox + oy * oy - k * k
        disc = B * B - 4 * A * C
        out = []
        with np.errstate(divide='ignore', invalid='ignore'):
            sq = np.sqrt(np.maximum(disc, 0))
            for sgn in (-1, 1):
                t = (-B + sgn * sq) / (2 * A)
                z = oz + t * dz
                ok = (disc >= 0) & (np.abs(A) > 1e-12) & (z >= 0) & (z <= h) & (r0 + s * z >= 0)
                t = np.where(ok, t, INF)
                px, py = ox + t * dx, oy + t * dy
                ln = np.stack([px, py, -s * (r0 + s * z)], 1)
                ln /= np.maximum(np.linalg.norm(ln, axis=1, keepdims=True), 1e-12)
                out.append((t, ln @ self.R.T))
            for zc, rc, nz in ((0.0, r0, -1.0), (h, self.r1, 1.0)):
                t = (zc - oz) / dz
                px, py = ox + t * dx, oy + t * dy
                ok = (np.abs(dz) > 1e-12) & (px * px + py * py <= rc * rc)
                t = np.where(ok, t, INF)
                out.append((t, np.broadcast_to(self.R[:, 2] * nz, o.shape)))
        return out

    def inside(self, p):
        l = (p - self.base) @ self.R
        z = l[:, 2]
        r = self.r0 + self.s * z
        return (z >= -1e-6) & (z <= self.h + 1e-6) & (l[:, 0] ** 2 + l[:, 1] ** 2 <= r * r + 1e-6)


def cyl(base, axis, r, h):
    return Frustum(base, axis, r, r, h)


class Ellipsoid(Solid):
    def __init__(self, center, radii, R=None):
        self.c = np.asarray(center, np.float64)
        self.rad = np.asarray(radii, np.float64)
        self.R = np.eye(3) if R is None else np.asarray(R, np.float64)
        self.center, self.radius = self.c, float(self.rad.max())

    def hits(self, o, d):
        lo = ((o - self.c) @ self.R) / self.rad
        ld = (d @ self.R) / self.rad
        A = (ld * ld).sum(1)
        B = 2 * (lo * ld).sum(1)
        C = (lo * lo).sum(1) - 1
        disc = B * B - 4 * A * C
        out = []
        sq = np.sqrt(np.maximum(disc, 0))
        for sgn in (-1, 1):
            t = np.where(disc >= 0, (-B + sgn * sq) / (2 * A), INF)
            p = lo + t[:, None] * ld
            n = (p / self.rad) @ self.R.T
            n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
            out.append((t, n))
        return out

    def inside(self, p):
        l = ((p - self.c) @ self.R) / self.rad
        return (l * l).sum(1) <= 1 + 1e-6


class Minus(Solid):
    """A with B cut out of it (B's walls show inside the hole)."""

    def __init__(self, a, b):
        self.a, self.b = a, b
        self.center, self.radius = a.center, a.radius

    def hits(self, o, d):
        out = []
        for t, n in self.a.hits(o, d):
            p = o + np.where(t < INF, t, 0)[:, None] * d
            out.append((np.where(self.b.inside(p) & (t < INF), INF, t), n))
        for t, n in self.b.hits(o, d):
            p = o + np.where(t < INF, t, 0)[:, None] * d
            out.append((np.where(self.a.inside(p) & (t < INF), t, INF), -n))
        return out

    def inside(self, p):
        return self.a.inside(p) & ~self.b.inside(p)


# ---------------------------------------------------------------- the trace
def trace(cam, parts):
    """parts: list of (solid, part_id). Returns per-pixel arrays (H, W): id (-1 = background), depth t, normal (H, W, 3),
    world point (H, W, 3), and the view direction (H, W, 3)."""
    W, H = cam.W, cam.H
    o, d = cam.rays()
    n_pix = W * H
    best = np.full(n_pix, INF)
    pid = np.full(n_pix, -1, np.int32)
    nrm = np.zeros((n_pix, 3))
    for solid, part in parts:
        bb = cam.bbox(solid.center, solid.radius)
        if bb is None:
            continue
        x0, y0, x1, y1 = bb
        idx = (np.arange(y0, y1)[:, None] * W + np.arange(x0, x1)[None, :]).ravel()
        t, n = solid.first(o[idx], d[idx])
        ok = t < best[idx]
        sel = idx[ok]
        best[sel] = t[ok]
        pid[sel] = part
        nrm[sel] = n[ok]
    hitp = o + np.where(best < INF, best, 0)[:, None] * d
    return (pid.reshape(H, W), best.reshape(H, W), nrm.reshape(H, W, 3), hitp.reshape(H, W, 3),
            d.reshape(H, W, 3))


def outline(buf, pid, depth, dark_of, bg_col):
    """1-px dark silhouette against the background, and a darker inner line where a nearer part meets a farther one."""
    H, W = pid.shape
    obj = pid >= 0
    edge_bg = np.zeros((H, W), bool)
    inner = np.zeros((H, W), bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        nb = np.full((H, W), -1, np.int32)
        nd = np.full((H, W), INF)
        ys = slice(max(dy, 0), H + min(dy, 0))
        yd = slice(max(-dy, 0), H + min(-dy, 0))
        xs = slice(max(dx, 0), W + min(dx, 0))
        xd = slice(max(-dx, 0), W + min(-dx, 0))
        nb[yd, xd] = pid[ys, xs]
        nd[yd, xd] = depth[ys, xs]
        edge_bg |= obj & (nb < 0)
        inner |= obj & (nb >= 0) & (nb != pid) & (depth < nd - 0.5)
    buf[edge_bg] = bg_col
    ys, xs = np.nonzero(inner & ~edge_bg)
    if len(ys):
        cols = np.array([dark_of(p) for p in range(int(pid.max()) + 1)], np.uint8)
        buf[ys, xs] = cols[pid[ys, xs]]
