"""Red blood cell sprites: biconcave discs (Evans-Fung shape) as a lit point cloud, z-buffered and reduced to a few
palette tones with a dark outline. Shared with the centrifuge film's generator."""
import math
import numpy as np
from .palette import BL

def _rbc_points(n_r=46, n_t=110):
    rho = np.linspace(0.0, 0.995, n_r)
    th = np.linspace(0, 2 * math.pi, n_t, endpoint=False)
    R, T = np.meshgrid(rho, th, indexing='ij')
    c0, c1, c2 = 0.207, 2.003, -1.123
    s = np.sqrt(1 - R * R)
    p = c0 + c1 * R ** 2 + c2 * R ** 4
    h = 0.62 * s * p                            # half thickness (exaggerated a little so the dimple reads)
    dh = 0.62 * (-R / s * p + s * (2 * c1 * R + 4 * c2 * R ** 3))
    pts, nrm = [], []
    for sgn in (1, -1):
        P = np.stack([R * np.cos(T), R * np.sin(T), sgn * h], -1).reshape(-1, 3)
        N = np.stack([-dh * np.cos(T), -dh * np.sin(T), sgn * np.ones_like(R)], -1).reshape(-1, 3)
        pts.append(P)
        nrm.append(N / np.linalg.norm(N, axis=1, keepdims=True))
    # the rim band (closes the silhouette when edge-on)
    tt = np.linspace(0, 2 * math.pi, 220, endpoint=False)
    zz = np.linspace(-0.05, 0.05, 5)
    TT, ZZ = np.meshgrid(tt, zz, indexing='ij')
    pts.append(np.stack([np.cos(TT), np.sin(TT), ZZ], -1).reshape(-1, 3))
    nrm.append(np.stack([np.cos(TT), np.sin(TT), np.zeros_like(TT)], -1).reshape(-1, 3))
    return np.concatenate(pts), np.concatenate(nrm)


_PTS, _NRM = _rbc_points()
_L = np.array([-0.45, -0.6, 0.66])
_L /= np.linalg.norm(_L)


def rbc_sprite(diam, tilt, psi, ramp, outline):
    """One red cell: diam px, tilt (0 face-on .. pi/2 edge-on), in-plane angle psi. Returns (rgb, alpha)."""
    ct, st = math.cos(tilt), math.sin(tilt)
    Rx = np.array([[1, 0, 0], [0, ct, -st], [0, st, ct]])
    cp, sp = math.cos(psi), math.sin(psi)
    Rz = np.array([[cp, -sp, 0], [sp, cp, 0], [0, 0, 1]])
    Rm = Rz @ Rx
    P = _PTS @ Rm.T
    N = _NRM @ Rm.T
    ss = 3
    size = int(math.ceil(diam)) + 2
    G = size * ss
    r = diam / 2.0
    gx = np.floor((P[:, 0] * r + size / 2.0) * ss).astype(np.int32)
    gy = np.floor((P[:, 1] * r + size / 2.0) * ss).astype(np.int32)
    ok = (gx >= 0) & (gx < G) & (gy >= 0) & (gy < G)
    gx, gy, z, N = gx[ok], gy[ok], P[ok, 2], N[ok]
    key = gy * G + gx
    order = np.lexsort((-z, key))               # nearest point first within each sub-pixel
    key_s = key[order]
    first = np.ones(len(key_s), bool)
    first[1:] = key_s[1:] != key_s[:-1]
    sel = order[first]
    lam = np.clip(N[sel] @ _L, 0, 1)
    refl = 2 * (N[sel] @ _L)[:, None] * N[sel] - _L[None, :]
    spec = np.clip(refl[:, 2], 0, 1) ** 14
    tone = np.clip(0.12 + 0.8 * lam + 0.55 * spec, 0, 1.2)
    cov = np.zeros(G * G)
    val = np.zeros(G * G)
    cov[key[sel]] = 1
    val[key[sel]] = tone
    cov = cov.reshape(size, ss, size, ss).mean((1, 3))
    val = val.reshape(size, ss, size, ss).sum((1, 3)) / np.maximum(cov * ss * ss, 1e-6)
    alpha = cov >= 0.42
    n = len(ramp)
    idx = np.clip(np.floor(val * (n - 1) + 0.5), 0, n - 1).astype(np.int32)
    rgb = np.asarray(ramp, np.uint8)[idx]
    # outline (4-neighbourhood) in a dark red
    a = np.pad(alpha, 1)
    nb = np.zeros_like(a)
    nb[1:, :] |= a[:-1, :]
    nb[:-1, :] |= a[1:, :]
    nb[:, 1:] |= a[:, :-1]
    nb[:, :-1] |= a[:, 1:]
    ol = nb & ~a
    rgb2 = np.zeros(a.shape + (3,), np.uint8)
    rgb2[1:-1, 1:-1] = rgb
    rgb2[ol] = outline
    return rgb2, (a | ol)


N_TILT, N_PSI = 8, 4
_SPR = {}


def sprites(diam, dark=False):
    """list[tilt][psi] of (rgb, alpha) sprites for one size; dark = the shaded cells further from the light."""
    key = (diam, dark)
    if key not in _SPR:
        ramp, ol = (BL[1:7], BL[0]) if dark else (BL[2:9], BL[1])
        _SPR[key] = [[rbc_sprite(diam, math.pi * i / N_TILT, math.pi * j / N_PSI, ramp, ol) for j in range(N_PSI)]
                     for i in range(N_TILT)]
    return _SPR[key]


def pick(diam, tilt01, psi_idx, dark=False):
    tab = sprites(diam, dark)
    return tab[int(tilt01 * N_TILT) % N_TILT][psi_idx % N_PSI]
