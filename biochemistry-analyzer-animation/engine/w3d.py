"""NOT USED BY THE FILM (only by the optional reference engine/analyzer3d.py).

A tiny 3D pixel renderer for the analyzer: perspective camera, z-buffered flat-shaded polygons, ordered dither,
1-px object outlines and lit crease edges, translucent passes (smoky lid, cuvette walls), and one textured quad
(the workstation screen).

The model is in millimetres (x right, y back, z up). Every frame it is projected and rasterized onto the 270x480
canvas at the camera's distance, so pushing in adds detail instead of fattening pixels. Faces are filled through an
ID buffer: the rasterizer only stores which face won each pixel, and shading (light, ramp, Bayer dither, outlines)
is then done for the whole frame at once.
"""
import math
import numpy as np
from PIL import Image, ImageDraw
from . import gfx

W, H = gfx.W, gfx.H
NEAR = 4.0


def _norm(v):
    v = np.asarray(v, float)
    return v / (np.linalg.norm(v) + 1e-12)


class Cam:
    """Orbit camera: look at `target` from `dist` mm away, `yaw` degrees round from the front (positive = from the
    left), `pitch` degrees above the horizon, vertical field of view `fov` degrees, optional screen roll."""

    def __init__(self, target, dist, yaw, pitch, fov=30.0, shift=(0.0, 0.0)):
        self.target = np.asarray(target, float)
        y, p = math.radians(yaw), math.radians(pitch)
        off = np.array([-math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)]) * dist
        self.eye = self.target + off
        self.f = _norm(self.target - self.eye)
        self.r = _norm(np.cross(self.f, [0.0, 0.0, 1.0]))
        self.u = np.cross(self.r, self.f)
        self.F = (H / 2) / math.tan(math.radians(fov) / 2)
        self.shift = shift
        self.dist = dist

    def to_cam(self, P):
        d = np.asarray(P, float) - self.eye
        return np.stack([d @ self.r, d @ self.u, d @ self.f], axis=-1)

    def proj_cam(self, C):
        z = np.maximum(C[..., 2], 1e-6)
        sx = W / 2 + self.shift[0] + self.F * C[..., 0] / z
        sy = H / 2 + self.shift[1] - self.F * C[..., 1] / z
        return sx, sy, z

    def project(self, P):
        return self.proj_cam(self.to_cam(P))

    def scale_at(self, P):
        """Canvas pixels per mm at world point P."""
        z = float(self.to_cam(P)[2])
        return self.F / max(z, 1e-6)


class Mat:
    __slots__ = ('ramp', 'k', 'off', 'edge', 'top')

    def __init__(self, ramp, k=1.0, off=0.0, edge=0, top=1):
        self.ramp, self.k, self.off, self.edge, self.top = ramp, k, off, edge, top


class Scene:
    """Collects faces. A face is a planar polygon (k x 3), a material name, an object id and flags."""

    def __init__(self):
        self.faces = []
        self.trans = []
        self.mats = {}
        self.texquads = []
        self.overlays = []

    def mat(self, name, ramp, k=1.0, off=0.0, edge=0, top=1):
        self.mats[name] = Mat(ramp, k, off, edge, top)

    def add(self, pts, mat, oid, two_sided=False, shade=None):
        self.faces.append((np.asarray(pts, float), mat, oid, two_sided, shade))

    def add_trans(self, pts, color, alpha, oid, edge_col=None, two_sided=True):
        self.trans.append((np.asarray(pts, float), color, alpha, oid, edge_col, two_sided))

    # ------------------------------------------------------------ primitives
    def prism(self, poly2d, z0, z1, mat, oid, top=True, bottom=False, side_mat=None, top_mat=None):
        P = np.asarray(poly2d, float)
        n = len(P)
        if _area(P) < 0:
            P = P[::-1]
        for i in range(n):
            a, b = P[i], P[(i + 1) % n]
            self.add([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], side_mat or mat, oid)
        if top:
            self.add([[p[0], p[1], z1] for p in P], top_mat or mat, oid)
        if bottom:
            self.add([[p[0], p[1], z0] for p in P[::-1]], mat, oid)

    def box(self, x0, x1, y0, y1, z0, z1, mat, oid, top=True, bottom=False, side_mat=None, top_mat=None, cut=0.0):
        if cut > 0:
            c = cut
            poly = [(x0 + c, y0), (x1 - c, y0), (x1, y0 + c), (x1, y1 - c), (x1 - c, y1), (x0 + c, y1), (x0, y1 - c),
                    (x0, y0 + c)]
        else:
            poly = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        self.prism(poly, z0, z1, mat, oid, top, bottom, side_mat, top_mat)

    def bevel_box(self, x0, x1, y0, y1, z0, z1, b, mat, oid, cut=0.0, top_mat=None):
        """A box with chamfered vertical corners and a chamfered top edge (the moulded-plastic look)."""
        def poly(inset):
            c = cut + inset * 0.4
            return [(x0 + c + inset, y0 + inset), (x1 - c - inset, y0 + inset), (x1 - inset, y0 + c + inset),
                    (x1 - inset, y1 - c - inset), (x1 - c - inset, y1 - inset), (x0 + c + inset, y1 - inset),
                    (x0 + inset, y1 - c - inset), (x0 + inset, y0 + c + inset)]
        lo = poly(0.0)
        hi = poly(b)
        n = len(lo)
        for i in range(n):
            a, c = lo[i], lo[(i + 1) % n]
            self.add([[a[0], a[1], z0], [c[0], c[1], z0], [c[0], c[1], z1 - b], [a[0], a[1], z1 - b]], mat, oid)
            a2, c2 = hi[i], hi[(i + 1) % n]
            self.add([[a[0], a[1], z1 - b], [c[0], c[1], z1 - b], [c2[0], c2[1], z1], [a2[0], a2[1], z1]], mat, oid)
        self.add([[p[0], p[1], z1] for p in hi], top_mat or mat, oid)

    def cyl(self, cx, cy, r, z0, z1, n, mat, oid, top=True, top_mat=None, bottom=False, r_top=None):
        rt = r if r_top is None else r_top
        a = np.linspace(0, 2 * math.pi, n, endpoint=False)
        c, s = np.cos(a), np.sin(a)
        for i in range(n):
            j = (i + 1) % n
            self.add([[cx + r * c[i], cy + r * s[i], z0], [cx + r * c[j], cy + r * s[j], z0],
                      [cx + rt * c[j], cy + rt * s[j], z1], [cx + rt * c[i], cy + rt * s[i], z1]], mat, oid)
        if top:
            self.add([[cx + rt * c[i], cy + rt * s[i], z1] for i in range(n)], top_mat or mat, oid)
        if bottom:
            self.add([[cx + r * c[i], cy + r * s[i], z0] for i in range(n)][::-1], mat, oid)

    def ring(self, cx, cy, r0, r1, z, n, mat, oid):
        """Flat annulus facing up (tray rims)."""
        a = np.linspace(0, 2 * math.pi, n + 1)
        for i in range(n):
            p = [[cx + r1 * math.cos(a[i]), cy + r1 * math.sin(a[i]), z],
                 [cx + r1 * math.cos(a[i + 1]), cy + r1 * math.sin(a[i + 1]), z],
                 [cx + r0 * math.cos(a[i + 1]), cy + r0 * math.sin(a[i + 1]), z],
                 [cx + r0 * math.cos(a[i]), cy + r0 * math.sin(a[i]), z]]
            self.add(p, mat, oid)


def _area(P):
    x, y = P[:, 0], P[:, 1]
    return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))


def _clip_near(C):
    """Sutherland-Hodgman clip of a camera-space polygon against z >= NEAR."""
    out = []
    n = len(C)
    for i in range(n):
        a, b = C[i], C[(i + 1) % n]
        ina, inb = a[2] >= NEAR, b[2] >= NEAR
        if ina:
            out.append(a)
        if ina != inb:
            t = (NEAR - a[2]) / (b[2] - a[2])
            out.append(a + (b - a) * t)
    return np.array(out) if len(out) >= 3 else None


LIGHT = _norm([-0.42, -0.62, 0.66])


class Frame:
    """Rasterized frame: id buffer, inverse depth, per-face attributes."""

    def __init__(self, scene, cam):
        self.scene, self.cam = scene, cam
        self.fid = np.full((H, W), -1, np.int32)
        self.invz = np.zeros((H, W), np.float32)
        self.attr = []          # per drawn face: (mat, oid, v, nz)

    def raster_poly(self, C, fid):
        S = self.cam.proj_cam(C)
        sx, sy, z = S
        x0, x1 = int(math.floor(sx.min())), int(math.ceil(sx.max())) + 1
        y0, y1 = int(math.floor(sy.min())), int(math.ceil(sy.max())) + 1
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
        if x1 <= x0 or y1 <= y0:
            return None
        im = Image.new('1', (x1 - x0, y1 - y0), 0)
        lim = 8 * max(W, H)
        ImageDraw.Draw(im).polygon([(float(np.clip(a - x0, -lim, lim)), float(np.clip(b - y0, -lim, lim)))
                                    for a, b in zip(sx, sy)], fill=1)
        m = np.array(im, bool)
        if not m.any():
            return None
        # 1/z is affine in screen space for a planar polygon
        A = np.column_stack([sx[:3], sy[:3], np.ones(3)])
        bz = 1.0 / z[:3]
        try:
            coef = np.linalg.solve(A, bz)
        except np.linalg.LinAlgError:
            # degenerate first triangle: least squares over all vertices
            A = np.column_stack([sx, sy, np.ones(len(sx))])
            coef = np.linalg.lstsq(A, 1.0 / z, rcond=None)[0]
        xs = np.arange(x0, x1) + 0.5
        ys = np.arange(y0, y1) + 0.5
        iz = (coef[0] * xs[None, :] + coef[1] * ys[:, None] + coef[2]).astype(np.float32)
        return (x0, y0, x1, y1), m, iz

    def draw(self):
        cam = self.cam
        eye = cam.eye
        k = 0
        for pts, mat, oid, two, shade in self.scene.faces:
            nrm = np.cross(pts[1] - pts[0], pts[2] - pts[0])
            ln = np.linalg.norm(nrm)
            if ln < 1e-9:
                if len(pts) > 3:
                    nrm = np.cross(pts[2] - pts[0], pts[3] - pts[0])
                    ln = np.linalg.norm(nrm)
                if ln < 1e-9:
                    continue
            nrm = nrm / ln
            facing = float(np.dot(nrm, eye - pts.mean(0)))
            if facing < 0:
                if not two:
                    continue
                nrm = -nrm
            C = cam.to_cam(pts)
            if (C[:, 2] < NEAR).any():
                C = _clip_near(C)
                if C is None:
                    continue
            r = self.raster_poly(C, k)
            if r is None:
                continue
            (x0, y0, x1, y1), m, iz = r
            sub_id = self.fid[y0:y1, x0:x1]
            sub_z = self.invz[y0:y1, x0:x1]
            win = m & (iz > sub_z)
            if not win.any():
                continue
            sub_id[win] = len(self.attr)
            sub_z[win] = iz[win]
            M = self.scene.mats[mat]
            lam = max(0.0, float(np.dot(nrm, LIGHT)))
            v = 0.3 + 0.62 * lam if shade is None else shade
            self.attr.append((mat, oid, v * M.k + M.off, nrm[2]))
            k += 1

    def shade(self, buf):
        """Fill the frame from the id buffer: ramp + dither, then outlines and crease lights."""
        if not self.attr:
            return
        mats = self.scene.mats
        names = sorted(mats)
        mi = {n: i for i, n in enumerate(names)}
        L = max(len(mats[n].ramp) for n in names)
        R = np.zeros((len(names), L, 3), np.uint8)
        RL = np.zeros(len(names), np.int32)
        for n in names:
            rr = mats[n].ramp
            R[mi[n], :len(rr)] = rr
            R[mi[n], len(rr):] = rr[-1]
            RL[mi[n]] = len(rr)
        fm = np.array([mi[a[0]] for a in self.attr], np.int32)
        fo = np.array([a[1] for a in self.attr], np.int32)
        fv = np.array([a[2] for a in self.attr], np.float32)
        fz = np.array([a[3] for a in self.attr], np.float32)
        fedge = np.array([mats[a[0]].edge for a in self.attr], np.int32)
        ftop = np.array([mats[a[0]].top for a in self.attr], np.int32)
        sel = self.fid >= 0
        ids = self.fid[sel]
        mat = fm[ids]
        n = RL[mat]
        th = gfx.bayer_at(0, 0, H, W)[sel]
        idx = np.clip(np.floor(fv[ids] * (n - 1) + th), 0, n - 1).astype(np.int32)
        # crease lines inside one object (box edges): the upper face's edge catches the light
        fid = self.fid
        oid_map = np.where(fid >= 0, fo[np.maximum(fid, 0)], -1)
        crease = np.zeros((H, W), bool)
        sil = np.zeros((H, W), bool)
        iz = self.invz
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb_f = np.full_like(fid, -1)
            nb_o = np.full_like(oid_map, -1)
            nb_z = np.zeros_like(iz)
            ys = slice(max(dy, 0), H + min(dy, 0))
            yd = slice(max(-dy, 0), H + min(-dy, 0))
            xs = slice(max(dx, 0), W + min(dx, 0))
            xd = slice(max(-dx, 0), W + min(-dx, 0))
            nb_f[yd, xd] = fid[ys, xs]
            nb_o[yd, xd] = oid_map[ys, xs]
            nb_z[yd, xd] = iz[ys, xs]
            sil |= (fid >= 0) & (nb_o != oid_map) & (iz >= nb_z)
            crease |= (fid >= 0) & (nb_f != fid) & (nb_o == oid_map) & (nb_f >= 0)
        topface = (fz[ids] > 0.6)
        cr = crease[sel]
        idx = np.where(cr & topface & (ftop[ids] > 0), np.minimum(idx + 2, n - 1), idx)
        idx = np.where(cr & ~topface, np.maximum(idx - 1, 0), idx)
        si = sil[sel]
        idx = np.where(si, np.minimum(fedge[ids], idx), idx)
        buf[sel] = R[mat, idx]

    def depth_mask(self):
        return self.invz

    def trans(self, buf):
        """Translucent faces (smoky lid, cuvette walls): blend over what is behind, z-tested against the opaque."""
        cam = self.cam
        eye = cam.eye
        for pts, color, alpha, oid, edge_col, two in self.scene.trans:
            nrm = np.cross(pts[1] - pts[0], pts[2] - pts[0])
            ln = np.linalg.norm(nrm)
            if ln < 1e-9:
                continue
            nrm /= ln
            if np.dot(nrm, eye - pts.mean(0)) < 0 and not two:
                continue
            C = cam.to_cam(pts)
            if (C[:, 2] < NEAR).any():
                C = _clip_near(C)
                if C is None:
                    continue
            r = self.raster_poly(C, 0)
            if r is None:
                continue
            (x0, y0, x1, y1), m, iz = r
            vis = m & (iz > self.invz[y0:y1, x0:x1])
            if not vis.any():
                continue
            sub = buf[y0:y1, x0:x1]
            if alpha > 0:
                th = gfx.bayer_at(x0, y0, y1 - y0, x1 - x0)
                f = sub.astype(np.float32)
                col = np.asarray(color, np.float32)
                out = f + (col - f) * alpha
                sub[vis] = np.clip(out[vis], 0, 255).astype(np.uint8)
            if edge_col is not None:
                e = np.zeros_like(m)
                e[1:, :] |= m[1:, :] != m[:-1, :]
                e[:-1, :] |= m[1:, :] != m[:-1, :]
                e[:, 1:] |= m[:, 1:] != m[:, :-1]
                e[:, :-1] |= m[:, 1:] != m[:, :-1]
                e &= m & vis
                sub[e] = edge_col


def homography(src, dst):
    """3x3 H with dst ~ H src for 4 point pairs."""
    A = []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y, -u])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y, -v])
    _, _, Vt = np.linalg.svd(np.asarray(A, float))
    Hm = Vt[-1].reshape(3, 3)
    return Hm / Hm[2, 2]


def textured_quad(buf, cam, frame, quad3d, tex, z_test=True):
    """Map texture tex (h, w, 3) onto a 3D quad (4 corners: top-left, top-right, bottom-right, bottom-left)."""
    sx, sy, z = cam.project(np.asarray(quad3d, float))
    if (z < NEAR).any():
        return
    th, tw = tex.shape[:2]
    Hm = homography(list(zip(sx, sy)), [(0, 0), (tw, 0), (tw, th), (0, th)])
    x0, x1 = max(int(math.floor(sx.min())), 0), min(int(math.ceil(sx.max())) + 1, W)
    y0, y1 = max(int(math.floor(sy.min())), 0), min(int(math.ceil(sy.max())) + 1, H)
    if x1 <= x0 or y1 <= y0:
        return
    xs = np.arange(x0, x1) + 0.5
    ys = np.arange(y0, y1) + 0.5
    X, Y = np.meshgrid(xs, ys)
    den = Hm[2, 0] * X + Hm[2, 1] * Y + Hm[2, 2]
    u = (Hm[0, 0] * X + Hm[0, 1] * Y + Hm[0, 2]) / den
    v = (Hm[1, 0] * X + Hm[1, 1] * Y + Hm[1, 2]) / den
    inside = (u >= 0) & (u < tw) & (v >= 0) & (v < th)
    if z_test:
        # only where the screen face itself won the depth test (its id is tagged 'screen')
        inside &= frame.screen_mask[y0:y1, x0:x1] if getattr(frame, 'screen_mask', None) is not None else True
    ui = np.clip(u.astype(np.int32), 0, tw - 1)
    vi = np.clip(v.astype(np.int32), 0, th - 1)
    sub = buf[y0:y1, x0:x1]
    sub[inside] = tex[vi[inside], ui[inside]]
