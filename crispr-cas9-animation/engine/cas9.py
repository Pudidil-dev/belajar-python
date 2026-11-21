"""Cas9 and its guide RNA, drawn as 8-bit sprites in the DNA's own coordinates, so they scale with the camera.

The protein is a molecular surface, the way a 3D model of Cas9 looks: a few hundred little residue spheres packed
into the shape of its domains, depth-sorted and lit from the top left, so the silhouette is knobbly and full of
grooves and the DNA and the guide RNA can be seen running through them. Each sphere is drawn as a flat 8-bit bead
with a dark rim, so the whole thing stays pixel art rather than a render.

  REC   the big lobe that cradles the 20-base guide RNA : DNA heteroduplex
  NUC   the lobe lying along the DNA
  PI    the gold domain at the PAM end that reads it
  HNH   the red cutting domain; it swings across the DNA and cuts the strand the guide RNA paired with
  RuvC  the teal cutting domain; it cuts the other strand, on Cas9's own side

Local coordinates: the origin is the PAM, +x runs along the DNA away from the PAM towards the spacer's far end
(so the 20 paired bases lie at x = 0 .. -68), +y points away from the DNA on the side Cas9 sits, and +z is towards
the camera. A pose places that origin at a base pair and says how far the clamp is closed and how far each cutting
domain has swung in. Cas9 is about 100 A across in life, five times the DNA's width, and it is drawn that big.
"""
import math

import numpy as np

from . import dna as D, gfx, raster as R, palette as P, timeline as T

W, H = gfx.W, gfx.H

SPAN = T.N_SPACER * D.RISE                       # how far the heteroduplex reaches from the PAM (68 A)
# the domains, as ellipsoids in local A: (name, cx, cy, cz, rx, ry, rz, ramp, residues)
LOBES = [
    ('rec', -SPAN * 0.52, 34.0, 0.0, SPAN * 0.60, 25.0, 23.0, P.AL, 190),     # REC: cradles the guide RNA
    ('rec2', -SPAN * 0.88, 23.0, -2.0, 20.0, 18.0, 17.0, P.AL, 56),
    ('nuc', -SPAN * 0.22, 9.0, 0.0, SPAN * 0.44, 24.0, 22.0, P.AL, 175),      # NUC lobe: it wraps round the DNA
    ('pi', 7.0, 4.0, 0.0, 13.0, 14.0, 13.0, P.PI, 34),                         # PI: reads the PAM
]
CUT_X = -(D.PAM_I - D.CUT_I) * D.RISE            # where both strands are cut, in local A (-10.2)
HNH_HOME = (CUT_X - 6.0, 30.0, 6.0)
HNH_CUT = (CUT_X, -11.0, 2.0)                    # swings right across the DNA to the far (target) strand
RUVC_HOME = (CUT_X + 8.0, 17.0, -8.0)
RUVC_CUT = (CUT_X, 13.0, -2.0)                   # cuts the near (non-target) strand, displaced into Cas9
HNH_R = (10.0, 9.0, 9.0)
RUVC_R = (10.5, 9.0, 9.0)
MOVERS = (('hnh', HNH_HOME, HNH_CUT, HNH_R, P.HNH, 36), ('ruvc', RUVC_HOME, RUVC_CUT, RUVC_R, P.RUVC, 38))


def _cloud(seed, rx, ry, rz, n, rmin=2.5, rmax=4.4):
    """A clump of residue spheres filling one ellipsoid, the outer shell packed more densely: the lumpy surface of
    a protein. Returns (x, y, z, radius) arrays in local A, deterministic."""
    rng = np.random.default_rng(seed)
    pts = []
    while len(pts) < n:
        v = rng.normal(size=3)
        v /= np.linalg.norm(v)
        u = rng.random() ** 0.38                 # bunched towards the surface
        r = rng.uniform(rmin, rmax)
        pts.append((v[0] * rx * u, v[1] * ry * u, v[2] * rz * u, r))
    a = np.array(pts, np.float32)
    return a


CLOUDS = {}
for _k, (_name, _cx, _cy, _cz, _rx, _ry, _rz, _ramp, _n) in enumerate(LOBES):
    CLOUDS[_name] = _cloud(11 + _k, _rx, _ry, _rz, _n)
for _k, (_name, _home, _cut, _rr, _ramp, _n) in enumerate(MOVERS):
    CLOUDS[_name] = _cloud(41 + _k, _rr[0], _rr[1], _rr[2], _n, 2.3, 3.8)
RAMPS = {name: ramp for name, _, _, _, _, _, _, ramp, _ in LOBES}
RAMPS.update({name: ramp for name, _, _, _, ramp, _ in MOVERS})


def domain_centres(pose):
    """Where each domain's cloud sits in local A for this pose."""
    close = pose.get('close', 0.0)
    out = []
    for name, cx, cy, cz, rx, ry, rz, ramp, n in LOBES:
        out.append((name, cx, cy - (4.0 if name in ('nuc', 'pi') else 2.0) * close, cz))
    for name, home, cut, rr, ramp, n in MOVERS:
        k = pose.get(name, 0.0)
        out.append((name, home[0] + (cut[0] - home[0]) * k, home[1] + (cut[1] - home[1]) * k,
                    home[2] + (cut[2] - home[2]) * k))
    return out


def local_to_world(pose, lx, ly):
    return pose['i'] * D.RISE + lx, pose.get('y0', 0.0) + pose['side'] * ly


def _spheres(pose, t):
    """Every residue sphere of this pose: local x, y, z and radius, with its ramp. A slow wobble keeps it alive;
    it is a whole number of cycles per loop, so the film still joins up."""
    wob = 0.10 * math.sin(2 * math.pi * 2 * (t % T.TOTAL) / T.TOTAL)
    ca, sa = math.cos(wob), math.sin(wob)
    xs, ys, zs, rs, ramps = [], [], [], [], []
    for name, cx, cy, cz in domain_centres(pose):
        c = CLOUDS[name]
        x = c[:, 0] * ca + c[:, 2] * sa
        z = -c[:, 0] * sa + c[:, 2] * ca
        xs.append(cx + x)
        ys.append(cy + c[:, 1])
        zs.append(cz + z)
        rs.append(c[:, 3])
        ramps.append(np.full(len(c), name))
    return (np.concatenate(xs), np.concatenate(ys), np.concatenate(zs), np.concatenate(rs),
            np.concatenate(ramps))


def draw(buf, cam, pose, t, xray=0.0, alpha=1.0, half=None):
    """Draw Cas9 as its molecular surface. `half` = 'back' or 'front' draws only the spheres behind or in front of
    the DNA, so the molecule can be drawn in between and really pass through the protein's grooves.
    xray makes the protein see-through (every other pixel); alpha fades it with a dither, never a blend."""
    if alpha <= 0.02:
        return
    side, ox, oy = pose['side'], pose['i'] * D.RISE, pose.get('y0', 0.0)
    lx, ly, lz, lr, names = _spheres(pose, t)
    if half == 'back':
        keep = lz <= 0
    elif half == 'front':
        keep = lz > 0
    else:
        keep = np.ones(len(lx), bool)
    if not keep.any():
        return
    lx, ly, lz, lr, names = lx[keep], ly[keep], lz[keep], lr[keep], names[keep]
    order = np.argsort(lz)                                   # back to front
    for k in order:
        wx, wy = ox + lx[k], oy + side * ly[k]
        sx, sy = cam.to(wx, wy)
        depth = lz[k] / 26.0                                 # -1 back .. 1 front
        r = lr[k] * cam.s * (1.0 + 0.08 * depth)
        if r < 0.45 or not (-r - 2 <= sx < W + r + 2 and -r - 2 <= sy < H + r + 2):
            continue
        ramp = RAMPS[str(names[k])]
        lit = 0.16 + 0.30 * (depth + 1) / 2 + 0.20 * np.clip(ly[k] / 52.0, 0, 1)
        _bead(buf, sx, sy, r, ramp, lit, xray=xray, alpha=alpha)


def draw_cloud(buf, cam, pts, ramp, cx, cy, side=1, alpha=1.0, xray=0.0, lit0=0.30):
    """Draw a cluster of residue spheres (local x, y, z, r) centred on molecule point (cx, cy): the same molecular
    surface the protein is made of, so the repair proteins match Cas9's look."""
    order = np.argsort(pts[:, 2])
    for k in order:
        wx, wy = cx + pts[k, 0], cy + side * pts[k, 1]
        sx, sy = cam.to(wx, wy)
        depth = pts[k, 2] / 14.0
        r = pts[k, 3] * cam.s * (1.0 + 0.08 * depth)
        if r < 0.45 or not (-r - 2 <= sx < W + r + 2 and -r - 2 <= sy < H + r + 2):
            continue
        _bead(buf, sx, sy, r, ramp, lit0 + 0.3 * (depth + 1) / 2, xray=xray, alpha=alpha)


def _bead(buf, cx, cy, r, ramp, lit, xray=0.0, alpha=1.0):
    """One residue sphere: a flat 8-bit bead with a lit top left, a dark rim and, in x-ray, every other pixel."""
    x0, x1 = max(0, int(cx - r - 1)), min(W, int(cx + r + 2))
    y0, y1 = max(0, int(cy - r - 1)), min(H, int(cy + r + 2))
    if x1 <= x0 or y1 <= y0:
        return
    px = np.arange(x0, x1)[None, :] + 0.5
    py = np.arange(y0, y1)[:, None] + 0.5
    dx, dy = px - cx, py - cy
    d = np.hypot(dx, dy)
    inside = d <= r
    if not inside.any():
        return
    PX = np.broadcast_to(np.arange(x0, x1)[None, :], inside.shape)
    PY = np.broadcast_to(np.arange(y0, y1)[:, None], inside.shape)
    n = len(ramp)
    base = int(np.clip(round(1 + lit * (n - 3)), 1, n - 2))
    sub = buf[y0:y1, x0:x1]
    m = inside
    if xray > 0:
        m = m & ((PX + PY) % 2 == 0)
        base = min(n - 1, base + 1)
    if alpha < 1.0:
        m = m & (R.bayer(PX, PY) < alpha)
    if not m.any():
        return
    k = -(dx * 0.55 + dy * 0.83) / max(r, 1e-6)
    col = np.full(inside.shape + (3,), ramp[base], np.uint8)
    col[k > 0.45] = ramp[min(n - 1, base + 1)]
    col[k < -0.35] = ramp[max(0, base - 1)]
    if r >= 2.6:
        col[k > 0.88] = ramp[min(n - 1, base + 2)]
    col[d > r - 0.9] = ramp[max(0, base - 2)]                # the crevice between neighbouring residues
    sub[m] = col[m]


# ---------------------------------------------------------------- the guide RNA
SC_Y = 46.0                 # the scaffold loop sits high in the REC lobe
UP_Y = 25.0                 # an unpaired spacer base waits here, inside the protein
DOWN_Y = 1.1                # a paired one takes the displaced strand's place on the target strand


def scaffold(pose, t):
    """The guide RNA's scaffold: a stem-loop tucked in the REC lobe, down to the start of the spacer."""
    pts = []
    wob = 0.6 * math.sin(2 * math.pi * 0.4 * t)
    for k in range(17):
        a = math.pi * (0.1 + 1.75 * k / 16)
        pts.append((-SPAN * 0.80 + 19.0 * math.cos(a), SC_Y + wob + 13.0 * math.sin(a)))
    pts.append((-SPAN * 0.62, SC_Y - 9.0))
    pts.append((-SPAN * 0.52, 30.0))
    pts.append((-SPAN * 0.30, 27.0))
    pts.append((-SPAN * 0.06, UP_Y))
    return pts


def spacer_xy(j, paired, t):
    """Where guide base j sits (j = 0 is the base next to the PAM). Paired bases lie on the DNA."""
    lx = -1.2 - j * D.RISE
    if j < paired:
        tt = T.clamp((t - T.pair_time(j)) / 0.16)
        return lx, UP_Y + (DOWN_Y - UP_Y) * T.ease_out(tt, 2.0)
    return lx, UP_Y


def draw_grna(buf, cam, pose, paired, t, alpha=1.0):
    """The pink guide RNA: the scaffold in the protein, then the 20-base spacer, which drops onto the DNA base by
    base as it pairs. A freshly paired base glows."""
    side, ox, oy = pose['side'], pose['i'] * D.RISE, pose.get('y0', 0.0)
    wide = max(1, int(round(0.45 * cam.s)))
    pts = [cam.to(ox + lx, oy + side * ly) for lx, ly in scaffold(pose, t)]
    for a, b in zip(pts[:-1], pts[1:]):
        gfx.fill(buf, gfx.line(a[0], a[1], b[0], b[1], wide + 1), P.RNA[1])
        gfx.fill(buf, gfx.line(a[0], a[1], b[0], b[1], wide), P.RNA[3])
    for k in range(0, len(pts), 4):
        D._disc(buf, pts[k][0], pts[k][1], max(0.8, 1.5 * cam.s), P.RNA, 0.55)
    chain = []
    for j in range(T.N_SPACER):
        lx, ly = spacer_xy(j, paired, t)
        chain.append(cam.to(ox + lx, oy + side * (ly + 3.0)))
    for a, b in zip(chain[:-1], chain[1:]):
        gfx.fill(buf, gfx.line(a[0], a[1], b[0], b[1], wide + 1), P.RNA[1])
        gfx.fill(buf, gfx.line(a[0], a[1], b[0], b[1], wide), P.RNA[3])
    for j in range(T.N_SPACER):
        lx, ly = spacer_xy(j, paired, t)
        sx, sy = cam.to(ox + lx, oy + side * ly)
        letter = D.GUIDE[len(D.GUIDE) - 1 - j] if j < len(D.GUIDE) else 'U'
        ramp = P.BASES.get(letter, P.U_)
        glow = 0.0
        if j < paired:
            tt = t - T.pair_time(j)
            glow = max(0.0, 1.0 - tt / 0.4) if tt >= 0 else 0.0
        D._disc(buf, sx, sy, max(0.8, D.BASE_R * cam.s * 1.15), ramp, 0.5, glow=glow)
        if cam.s > 5.5 and D.BASE_R * cam.s > 2.6:
            from . import pixfont as PF
            PF.draw_text(buf, letter, sx, sy, ramp[3], font='3x5', anchor='mm', outline=ramp[0])
