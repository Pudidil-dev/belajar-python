"""Inside the spinning tube: red cells sediment into a packed layer under clear gold plasma.

The red cells are real biconcave discs: each sprite is a point cloud of the Evans-Fung disc shape, rotated, z-buffered and
lit, then reduced to a few palette tones with a dark outline. They tumble while they are suspended, sink together with
one shared displacement D(t) (so a clear plasma front opens from the top while the packed layer grows from the
bottom, as in real sedimentation), and lock into a hexagonal packing slot each. Everything is a closed-form function
of t, so any frame can be rendered on its own and the film is deterministic.
"""
import math
import numpy as np
from . import gfx
from . import timeline as TLN
from .palette import BL, PK, PL, WC, GL, BG, TL, MW

# ---------------------------------------------------------------- geometry of the magnified tube
XL, XR = 50, 220                 # inner walls
WALLW = 9
CXT = (XL + XR) / 2.0
RB = (XR - XL) / 2.0             # inner radius of the round bottom (85)
YB = 372.0                       # centre of the round bottom -> tip at 457
Y_MEN = 66.0                     # liquid surface at the walls
HCT = 0.45                       # packed cell fraction

T_IN, (T_SEP0, T_SEP1), T_OUT = TLN.IRIS_IN[0], TLN.SEP, TLN.IRIS_OUT[1]

_Y, _X = np.mgrid[0:gfx.H, 0:gfx.W]
_XC, _YC = _X + 0.5, _Y + 0.5
INTERIOR = ((_XC >= XL) & (_XC <= XR) & (_YC <= YB)) | (((_XC - CXT) ** 2 + (_YC - YB) ** 2 <= RB ** 2) & (_YC > YB))
_SURF = Y_MEN + 5.0 * (1 - np.clip((_XC - CXT) / RB, -1, 1) ** 2)
LIQUID = INTERIOR & (_YC >= _SURF)
AIR = INTERIOR & ~LIQUID


def _pile_top():
    rows = LIQUID.sum(1).astype(np.float64)
    total = rows.sum()
    acc = np.cumsum(rows[::-1])[::-1]          # liquid area at or below each row
    return float(np.argmax(acc <= HCT * total))


Y_PILE = _pile_top()                           # final top of the packed red cells (canvas y)


def _cyl(nx):
    nx = np.clip(nx, -1, 1)
    return 0.08 + 0.92 * np.maximum(0.0, -0.55 * nx + 0.83 * np.sqrt(1 - nx * nx))


_NX = (_XC - CXT) / (RB + 2)


def _shade_full(rmp, v):
    n = len(rmp)
    idx = np.clip(np.floor(v * (n - 1) + gfx.BAYER[:gfx.H, :gfx.W]), 0, n - 1).astype(np.int32)
    return np.asarray(rmp, np.uint8)[idx]


_VC = _cyl(_NX)
IMG_PLASMA = _shade_full(PL[3:9], np.clip(_VC * 0.95 + 0.04 - 0.05 * (_YC - Y_MEN) / 300.0, 0, 1))
IMG_HAZE = _shade_full(BL[2:6], np.clip(_VC * 0.9, 0, 1))
IMG_PILE = _shade_full(PK[1:6], np.clip(_VC * 0.85, 0, 1))


# ---------------------------------------------------------------- red cell sprites
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


N_TILT, N_PSI = 12, 6
_SPR = {}


def sprites(kind):
    """kind: ('front', diam) | ('back', diam) | ('pack', diam) -> list[tilt][psi] of sprites."""
    if kind in _SPR:
        return _SPR[kind]
    style, diam = kind
    ramp, ol = {
        'front': (BL[2:9], BL[1]),
        'back': (BL[1:7], BL[0]),
        'pack': (PK[1:8], PK[0]),
    }[style]
    tab = [[rbc_sprite(diam, math.pi * i / N_TILT, math.pi * j / N_PSI, ramp, ol) for j in range(N_PSI)]
           for i in range(N_TILT)]
    _SPR[kind] = tab
    return tab


def wbc_sprite(diam):
    """A white cell: pale granular body with a lobed grey nucleus (no purple: unstained look)."""
    size = int(diam) + 2
    yy, xx = np.mgrid[0:size, 0:size] + 0.5
    c = size / 2.0
    r = np.hypot(xx - c, yy - c)
    ang = np.arctan2(yy - c, xx - c)
    body = r <= diam / 2.0 * (1 + 0.06 * np.sin(5 * ang))
    nx, ny = (xx - c) / (diam / 2), (yy - c) / (diam / 2)
    v = np.clip(0.75 - 0.35 * nx - 0.35 * ny, 0, 1)
    rgb = np.asarray(WC[0:4], np.uint8)[np.clip((v * 3.99).astype(int), 0, 3)]
    nuc = (np.hypot(xx - c + 1.2, yy - c + 0.6) < diam * 0.2) | (np.hypot(xx - c - 1.5, yy - c - 0.8) < diam * 0.18)
    rgb[nuc & body] = MW[2]
    rgb[nuc & body & (nx + ny < -0.2)] = MW[3]
    a = np.pad(body, 1)
    nb = np.zeros_like(a)
    nb[1:, :] |= a[:-1, :]
    nb[:-1, :] |= a[1:, :]
    nb[:, 1:] |= a[:, :-1]
    nb[:, :-1] |= a[:, 1:]
    ol = nb & ~a
    out = np.zeros(a.shape + (3,), np.uint8)
    out[1:-1, 1:-1] = rgb
    out[ol] = BL[1]
    return out, a | ol


# ---------------------------------------------------------------- the simulation (closed form in t)
def _smoother(u):
    u = np.clip(u, 0, 1)
    return u * u * u * (u * (u * 6 - 15) + 10)


def _hex_slots(spacing, margin, y_top, rng, jitter=0.6):
    pts = []
    row = 0
    y = YB + RB - margin
    while y > y_top + margin * 0.6:
        off = (spacing / 2) if row % 2 else 0.0
        x = XL + margin + off
        while x <= XR - margin:
            ok = (y <= YB) or ((x - CXT) ** 2 + (y - YB) ** 2 <= (RB - margin) ** 2)
            if ok:
                pts.append((x + rng.uniform(-jitter, jitter), y + rng.uniform(-jitter, jitter)))
            x += spacing
        y -= spacing * 0.866
        row += 1
    return np.array(pts)


def _random_liquid(n, margin, rng):
    out = []
    while len(out) < n:
        x = rng.uniform(XL + margin, XR - margin, n)
        y = rng.uniform(Y_MEN + 6 + margin * 0.5, YB + RB - margin, n)
        ok = (y <= YB) | ((x - CXT) ** 2 + (y - YB) ** 2 <= (RB - margin) ** 2)
        out.extend(zip(x[ok], y[ok]))
    return np.array(out[:n])


def _assign(starts, slots):
    """Bottom rows of slots get the lowest cells; within a row, left to right (no crossing)."""
    so = np.argsort(-slots[:, 1], kind='stable')
    co = np.argsort(-starts[:, 1], kind='stable')
    target = np.zeros_like(starts)
    i = 0
    rows = np.round(slots[so, 1] / 2.0)
    while i < len(so):
        j = i
        while j < len(so) and rows[j] == rows[i]:
            j += 1
        s_idx = so[i:j][np.argsort(slots[so[i:j], 0])]
        c_idx = co[i:j][np.argsort(starts[co[i:j], 0])]
        target[c_idx] = slots[s_idx]
        i = j
    return target


class Layer:
    def __init__(self, style, diam, spacing, margin, rng, wobble=1.0):
        self.style, self.diam = style, diam
        self.slots = _hex_slots(spacing, margin, Y_PILE, rng)
        n = len(self.slots)
        self.start = _random_liquid(n, margin, rng)
        self.target = _assign(self.start, self.slots)
        self.var = rng.uniform(-0.07, 0.07, n)
        self.need = (self.target[:, 1] - self.start[:, 1]) / (1 + self.var)
        self.tilt0 = rng.uniform(0, 1, n)
        self.trate = rng.uniform(0.25, 0.9, n) * rng.choice([-1, 1], n)
        self.psi = rng.integers(0, N_PSI, n)
        self.wf = rng.uniform(0.6, 1.6, n)
        self.wp = rng.uniform(0, 2 * math.pi, n)
        self.wob = wobble
        self.n = n


_rng = np.random.default_rng(20261113)
BACK = Layer('back', 7, 6.4, 3.5, _rng, 0.7)
FRONT = Layer('front', 10, 10.5, 5.5, _rng, 1.2)
D_MAX = float(max(BACK.need.max(), FRONT.need.max())) + 0.5

# white cells: few, slower, they come to rest on top of the packed red cells (the thin pale buffy coat)
N_WBC = 5
_WX = np.linspace(XL + 18, XR - 18, N_WBC) + _rng.uniform(-6, 6, N_WBC)
WBC_START = np.stack([_rng.uniform(XL + 14, XR - 14, N_WBC), _rng.uniform(Y_MEN + 30, Y_PILE - 30, N_WBC)], 1)
WBC_TARGET = np.stack([_WX, np.full(N_WBC, Y_PILE - 4.0)], 1)


def D(t):
    """Shared sedimentation displacement (px). A small drift while the camera settles, then the full S-curve."""
    pre = 2.0 * _smoother((t - T_IN) / (T_SEP0 - T_IN))
    return pre + (D_MAX - 2.0) * _smoother((t - T_SEP0) / (T_SEP1 - T_SEP0))


_TT = np.linspace(T_IN - 1, T_OUT + 1, 4000)
_DD = D(_TT)


def landed_time(need):
    return np.interp(need, _DD, _TT)


for L in (BACK, FRONT):
    L.t_land = landed_time(L.need)


def layer_state(L, t):
    d = D(t) * (1 + L.var)
    dy = np.minimum(d, L.target[:, 1] - L.start[:, 1])
    landed = d >= (L.target[:, 1] - L.start[:, 1]) - 1e-6
    p = np.clip(dy / np.maximum(L.target[:, 1] - L.start[:, 1], 1e-3), 0, 1)
    ps = p * p * (3 - 2 * p)
    x = L.start[:, 0] + (L.target[:, 0] - L.start[:, 0]) * ps
    y = L.start[:, 1] + dy
    free = ~landed
    x = x + free * L.wob * np.sin(L.wf * t * 2 * math.pi * 0.35 + L.wp)
    y = y + free * 0.6 * L.wob * np.sin(L.wf * t * 2 * math.pi * 0.27 + L.wp * 1.7)
    tt = np.where(landed, L.t_land, t)
    tilt = (L.tilt0 + L.trate * tt * 0.55) % 1.0
    return x, y, landed, tilt


def pile_line(t):
    """Top of the packed cells per canvas column (bumpy, from the slots that are already full)."""
    line = np.full(gfx.W, 1e9)
    for L in (BACK, FRONT):
        d = D(t) * (1 + L.var)
        landed = d >= (L.target[:, 1] - L.start[:, 1]) - 1e-6
        if not landed.any():
            continue
        sx = L.target[landed, 0]
        sy = L.target[landed, 1] - L.diam * 0.42
        xi = np.round(sx).astype(np.int32)
        reach = int(L.diam * 0.5)
        for o in range(-reach, reach + 1):
            np.minimum.at(line, np.clip(xi + o, 0, gfx.W - 1), sy + abs(o) * 0.35)
    return line


# ---------------------------------------------------------------- static background (walls, glass, air)
def _static_bg():
    buf = np.zeros((gfx.H, gfx.W, 3), np.uint8)
    buf[:] = BG[1]
    xc = _XC
    # outer glass silhouette
    outer = ((xc >= XL - WALLW) & (xc <= XR + WALLW) & (_YC <= YB)) | \
            (((xc - CXT) ** 2 + (_YC - YB) ** 2 <= (RB + WALLW) ** 2) & (_YC > YB))
    glass = outer & ~INTERIOR
    # glass: rim light on both edges, tinted middle (colour math over the dark background)
    rr = np.where(_YC > YB, np.hypot(xc - CXT, _YC - YB), np.abs(xc - CXT))
    u = np.clip((rr - RB) / WALLW, 0, 1)                  # 0 inner edge .. 1 outer edge
    v = 0.35 + 0.5 * np.exp(-((u - 0.06) / 0.08) ** 2) + 0.45 * np.exp(-((u - 0.93) / 0.07) ** 2)
    v += np.where(xc < CXT, 0.12, -0.08)
    gimg = _shade_full(GL[1:7], np.clip(v, 0, 1))
    buf[glass] = gimg[glass]
    # specular strips running down the walls
    s1 = glass & (xc > XL - 6.5) & (xc < XL - 4.5) & (_YC < YB - 10) & ~((_YC > 150) & (_YC < 158))
    s2 = glass & (xc > XR + 3) & (xc < XR + 4) & (_YC < YB - 30) & (_YC > 40)
    buf[s1] = GL[7]
    buf[s2] = GL[6]
    # air above the meniscus: dark glass
    buf[AIR] = GL[1]
    buf[AIR & ((_X + _Y) % 2 == 0)] = BG[2]
    # outline of the glass against the background
    out_edge = outer & ~(np.roll(outer, 1, 1) & np.roll(outer, -1, 1) & np.roll(outer, 1, 0) & np.roll(outer, -1, 0))
    buf[out_edge & glass] = GL[5]
    return buf, outer


STATIC, OUTER = _static_bg()


def _streaks(buf, t, inten):
    """Horizontal speed streaks outside the tube: the tube is racing sideways around the rotor."""
    if inten <= 0:
        return
    rng = np.random.default_rng(99)
    n = 46
    ys = rng.uniform(0, gfx.H, n).astype(int)
    lens = rng.uniform(8, 46, n)
    spd = rng.uniform(380, 900, n)
    ph = rng.uniform(0, 1, n)
    cols = [BG[4], BG[5], BG[6], GL[2], GL[3]]
    for i in range(n):
        if rng.uniform() > inten:
            continue
        span = gfx.W + lens[i]
        x = (ph[i] * span + spd[i] * t) % span - lens[i]
        mk = gfx.rect(x, ys[i], x + lens[i], ys[i] + 1) - gfx.Mask(0, 0, OUTER)
        gfx.fill(buf, mk, cols[i % len(cols)])


def _chevrons(buf, t, a):
    """Two columns of downward chevrons beside the tube: the force pushes everything to the tube's bottom."""
    if a <= 0:
        return
    for cx in (21, gfx.W - 22):
        for k in range(-1, 32):
            y0 = 30 + k * 15 + (t * 28) % 15
            if y0 < 20 or y0 > gfx.H - 12:
                continue
            pulse = 0.5 + 0.5 * math.sin((t * 5.0) - k * 0.55)
            pts = [(cx - 5, y0), (cx, y0 + 5), (cx + 5, y0)]
            mk = gfx.polyline(pts, 2) - gfx.Mask(0, 0, OUTER)
            col = TL[5] if pulse > 0.55 else TL[3]
            gfx.fill_dither(buf, mk, None, col, a)


def _twinkles(buf, t, region_full, n, seed, a=1.0, cols=(PL[8], MW[8])):
    rng = np.random.default_rng(seed)
    ys, xs = np.nonzero(region_full)
    if len(xs) == 0 or a <= 0:
        return
    pick = rng.integers(0, len(xs), n)
    ph = rng.uniform(0, 1, n)
    per = rng.uniform(0.6, 1.3, n)
    for i in range(n):
        k = ((t / per[i]) + ph[i]) % 1.0
        b = max(0.0, 1 - abs(k - 0.5) * 4)          # short blink
        if b <= 0 or rng.uniform() > a:
            continue
        x, y = xs[pick[i]], ys[pick[i]]
        c = cols[i % len(cols)]
        buf[y, x] = c
        if b > 0.5:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if 0 <= x + dx < gfx.W and 0 <= y + dy < gfx.H and region_full[y + dy, x + dx]:
                    buf[y + dy, x + dx] = c


def render(t):
    """The inside-the-tube view at film time t."""
    buf = STATIC.copy()
    sep_a = float(np.clip((t - T_SEP0 + 0.3) / 0.5, 0, 1) * np.clip((T_SEP1 + 0.25 - t) / 0.5, 0, 1))
    _streaks(buf, t, 0.75)
    _chevrons(buf, t, sep_a)
    # liquid: plasma above the cell front, red haze in the suspension, dark packed layer below
    d = D(t)
    y_front = min(Y_MEN + 4 + d * 0.93, Y_PILE + 2)
    r = np.clip((_YC - y_front + 16) / 16.0, 0, 1)
    haze = LIQUID & (r > gfx.BAYER[:gfx.H, :gfx.W])
    line = pile_line(t)
    pile = LIQUID & (_YC >= line[None, :])
    plasma = LIQUID & ~haze & ~pile
    buf[plasma] = IMG_PLASMA[plasma]
    buf[haze & ~pile] = IMG_HAZE[haze & ~pile]
    buf[pile] = IMG_PILE[pile]
    # meniscus line
    men = LIQUID & (_YC < _SURF + 1)
    buf[men & plasma] = PL[8]
    buf[men & haze] = BL[6]
    # cells
    for L in (BACK, FRONT):
        x, y, landed, tilt = layer_state(L, t)
        tab_free = sprites((L.style, L.diam))
        tab_pack = sprites(('pack', L.diam))
        order = np.argsort(y) if L is FRONT else np.arange(L.n)
        for i in order:
            ti = int(tilt[i] * N_TILT) % N_TILT
            if landed[i]:
                ti = min(ti, N_TILT - 1 - ti)          # packed cells lie flatter
                spr = tab_pack[ti // 2][L.psi[i]]
            else:
                spr = tab_free[ti][L.psi[i]]
            h, w = spr[1].shape
            gfx.paste_sprite(buf, spr, x[i] - w / 2.0, y[i] - h / 2.0)
    # white cells settle last, on top of the red layer -> a thin pale line
    k = _smoother((t - (T_SEP0 + 1.0)) / (T_SEP1 + 0.35 - (T_SEP0 + 1.0)))
    wspr = wbc_sprite(9)
    for i in range(N_WBC):
        x = WBC_START[i, 0] + (WBC_TARGET[i, 0] - WBC_START[i, 0]) * k
        y = WBC_START[i, 1] + (WBC_TARGET[i, 1] - WBC_START[i, 1]) * k + (1 - k) * math.sin(t * 2 + i)
        gfx.paste_sprite(buf, wspr, x - 5.5, y - 5.5)
    buffy_a = float(np.clip((t - (T_SEP1 - 0.2)) / 0.6, 0, 1))
    if buffy_a > 0:
        band = LIQUID & (_YC >= Y_PILE - 3) & (_YC < Y_PILE)
        sel = band & (gfx.BAYER[:gfx.H, :gfx.W] < buffy_a)
        buf[sel] = np.asarray(WC[3], np.uint8)
        buf[sel & (_YC < Y_PILE - 2)] = np.asarray(WC[5], np.uint8)
    # the layers have settled: one shine sweeps down across the tube
    if T_SEP1 + 0.05 <= t < T_SEP1 + 0.6:
        pos = -60 + 620 * (t - T_SEP1 - 0.05) / 0.55
        d = _XC + 0.6 * _YC - pos
        band = LIQUID & (d >= 0) & (d < 14)
        f = buf[band].astype(np.float32)
        buf[band] = (f + (255 - f) * 0.38).astype(np.uint8)
        band2 = LIQUID & (d >= 18) & (d < 21)
        f = buf[band2].astype(np.float32)
        buf[band2] = (f + (255 - f) * 0.25).astype(np.uint8)
    # sparkle in the clear plasma
    clear_a = float(np.clip((t - (T_SEP0 + 2.0)) / 2.0, 0, 1))
    if clear_a > 0:
        region = plasma & (_YC < y_front - 18)
        _twinkles(buf, t, region, 26, 5, clear_a)
    return buf


def warm():
    for L in (BACK, FRONT):
        sprites((L.style, L.diam))
        sprites(('pack', L.diam))
