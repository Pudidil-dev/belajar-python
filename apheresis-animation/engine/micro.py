"""Close-up artworks (each in its own space, 1 unit = 1 canvas px at zoom 1):

  stream     inside the tube: red cells (biconcave discs, tumbling), gold platelet fragments, a few white cells, all
             carried together by pale yellow plasma; the middle of the tube flows faster than the edges;
  molecule   the anticoagulant up close: citrate clicks onto a calcium ion (calcium is needed for clotting);
  channel    a curved section of the spinning separation channel, seen from the rotor: red cells drift to the outer
             wall, plasma stays near the inner wall, platelets gather in a golden band between them and leave
             through their own port. Nothing is created or transformed: the same cells are only sorted.
"""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T
from .view import View, put

W, H = gfx.W, gfx.H

# ------------------------------------------------------------------ cells
_EF = (0.81, 7.83, -4.39, 3.91)
_LIGHT = np.array([-0.52, -0.64, 0.56])
_LIGHT = _LIGHT / np.linalg.norm(_LIGHT)
_A_S = np.linspace(-1.0, 1.0, 81)
_Y_S = np.linspace(0.0, 1.0, 41)
_SIL = {}


def half_thickness(rho2):
    c0, c2, c4, r0 = _EF
    rho2 = np.clip(rho2, 0.0, 1.0)
    return np.sqrt(1.0 - rho2) * (c0 + c2 * rho2 + c4 * rho2 * rho2) / (2 * r0)


def _silhouette(tilt):
    if tilt not in _SIL:
        ct, st = math.cos(tilt), math.sin(tilt)
        A = _A_S[:, None]
        Y = _Y_S[None, :] * np.sqrt(np.clip(1 - A * A, 0, 1))
        _SIL[tilt] = (Y * ct + half_thickness(A * A + Y * Y) * st).max(axis=1)
        if len(_SIL) > 600:
            _SIL.pop(next(iter(_SIL)))
    return _SIL[tilt]


def rbc(pen, x, y, r, tilt=0.0, psi=0.0):
    """A red blood cell: biconcave disc (thick rim, thin pale centre), any tilt; flat 8-bit shading."""
    bx = pen.box(x - r - 1, y - r - 1, x + r + 1, y + r + 1, 1)
    if bx is None:
        return
    tilt = round(tilt, 2)
    ct, st = math.cos(tilt), math.sin(tilt)
    cp, sp = math.cos(psi), math.sin(psi)
    U, V = pen.grid(bx)
    dx, dy = U - x, V - y
    a = (dx * cp + dy * sp) / r
    b = (-dx * sp + dy * cp) / r
    face = np.sqrt(np.clip(1 - a * a, 0, 1))
    minor = np.interp(a, _A_S, _silhouette(tilt))
    m = (np.abs(a) <= 1) & (np.abs(b) <= minor)
    if not m.any():
        return
    yb = np.where(minor > 1e-6, b / np.maximum(minor, 1e-6) * face, 0.0)
    rho2 = np.clip(a * a + yb * yb, 0, 0.9999)
    rho = np.sqrt(rho2)
    e = 0.02
    dh = (half_thickness((rho + e) ** 2) - half_thickness(np.maximum(rho - e, 0) ** 2)) / (2 * e)
    with np.errstate(invalid='ignore', divide='ignore'):
        nx = np.where(rho > 1e-4, -dh * a / rho, 0.0)
        ny = np.where(rho > 1e-4, -dh * yb / rho, 0.0)
    nz = np.ones_like(nx)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / ln, ny / ln, nz / ln
    ny2, nz2 = ny * ct + nz * st, -ny * st + nz * ct
    sx, sy = nx * cp - ny2 * sp, nx * sp + ny2 * cp
    lit = np.clip(sx * _LIGHT[0] + sy * _LIGHT[1] + nz2 * _LIGHT[2], 0, 1)
    pallor = 1 - half_thickness(rho2) / 0.31
    v = 0.50 * lit + 0.25 * pallor * ct + 0.26
    if r * pen.z < 5:                                           # tiny: just body, dent and rim
        v = np.where(rho < 0.45, 0.66, 0.5)
    col = np.where(v[..., None] < 0.42, np.array(P.RED[2], np.uint8),
                   np.where(v[..., None] < 0.60, np.array(P.RED[3], np.uint8),
                            np.where(v[..., None] < 0.73, np.array(P.RED[4], np.uint8), np.array(P.RED[5], np.uint8))))
    put(pen.buf, bx, m, col)
    pen.outline(bx, m, P.RED[1])


def platelet(pen, x, y, r, rot):
    """A platelet: a small, irregular gold fragment (no nucleus)."""
    pts = []
    for k in range(7):
        a = rot + k * 2 * math.pi / 7
        rr = r * (0.75 + 0.35 * math.sin(k * 2.7 + rot * 3))
        pts.append((x + rr * math.cos(a), y + rr * 0.8 * math.sin(a)))
    bx, m = pen.poly(pts)
    if bx is None:
        return
    put(pen.buf, bx, m, P.GOLD[2])
    U, V = pen.grid(bx)
    put(pen.buf, bx, m & ((U - x) + (V - y) < -r * 0.3), P.GOLD[3])
    pen.outline(bx, m, P.GOLD[0])


def wbc(pen, x, y, r):
    """A white cell: larger, pale, with a lobed nucleus."""
    bx, m, U, V = pen.disc(x, y, r)
    if bx is None:
        return
    put(pen.buf, bx, m, P.WBC[2])
    put(pen.buf, bx, m & ((U - x) + (V - y) > r * 0.7), P.WBC[1])
    for k, (ox, oy) in enumerate(((-0.35, -0.2), (0.1, -0.35), (0.3, 0.15))):
        nb, nm, NU, NV = pen.disc(x + ox * r, y + oy * r, r * 0.32)
        if nb is not None:
            put(pen.buf, nb, nm, P.WBC[0])
    pen.outline(bx, m, P.WBC[0])


# ------------------------------------------------------------------ stream (inside the tube)
_rng = np.random.default_rng(5)
TUBE_R = 70.0
WRAP = 340.0                       # the cells repeat every WRAP units around the camera, so the stream never thins
CAM_V = 58.0                       # the camera drifts with the flow (units per second)
_N_RBC, _N_PLT, _N_WBC = 40, 22, 2
S_RBC = np.c_[_rng.uniform(0, WRAP, _N_RBC), _rng.uniform(-60, 60, _N_RBC), _rng.uniform(0, 6.3, _N_RBC),
              _rng.uniform(0.0, 1.4, _N_RBC)]
S_PLT = np.c_[_rng.uniform(0, WRAP, _N_PLT), _rng.uniform(-63, 63, _N_PLT), _rng.uniform(0, 6.3, _N_PLT)]
S_WBC = np.c_[np.array([-28.0, 150.0]), np.array([-22.0, 30.0])]


def _v(y):
    return 22.0 + 64.0 * (1 - (y / TUBE_R) ** 2)               # faster in the middle of the tube


def _cam_x(t):
    return 40.0 + CAM_V * (t - T.STREAM[1])


def stream_camera(t):
    return View(_cam_x(t), 0.0, 1.7)


def stream_pos(kind, i, t):
    e = t - T.STREAM[1]
    if kind == 'rbc':
        x, y = S_RBC[i, 0], S_RBC[i, 1]
    elif kind == 'plt':
        x, y = S_PLT[i, 0], S_PLT[i, 1]
    else:
        x, y = S_WBC[i, 0], S_WBC[i, 1]
    x = x + _v(y) * e
    cx = _cam_x(t)
    x = cx + ((x - cx + WRAP / 2) % WRAP) - WRAP / 2
    return x, y + 2.0 * math.sin(e * 2.0 + i)


def stream(pen, t):
    buf = pen.buf
    e = t - T.STREAM[1]
    buf[...] = P.NAVY[1]
    bx = (0, 0, W, H)
    U, V = pen.grid(bx)
    inside = np.abs(V) < TUBE_R
    put(buf, bx, inside, P.PLASMA[2])
    put(buf, bx, inside & ((np.floor((U - _v(V) * e) / 9) + np.floor(V / 7)) % 11 == 0), P.PLASMA[3])
    wall = (np.abs(V) >= TUBE_R) & (np.abs(V) < TUBE_R + 9)
    put(buf, bx, wall, P.TUBE[2])
    put(buf, bx, wall & (np.abs(np.abs(V) - TUBE_R - 2) < 0.6), P.TUBE[3])
    put(buf, bx, wall & (np.abs(np.abs(V) - TUBE_R - 8.5) < 0.6), P.TUBE[1])
    for i in range(_N_WBC):
        x, y = stream_pos('wbc', i, t)
        wbc(pen, x, y, 15)
    for i in range(_N_RBC):
        x, y = stream_pos('rbc', i, t)
        rbc(pen, x, y, 11, tilt=0.15 + 1.2 * abs(math.sin(e * 0.5 + S_RBC[i, 2])), psi=S_RBC[i, 3] + e * 0.4)
    for i in range(_N_PLT):
        x, y = stream_pos('plt', i, t)
        platelet(pen, x, y, 4.0, S_PLT[i, 2] + e * 1.5)


# ------------------------------------------------------------------ molecule (anticoagulant close-up)
IONS = [(-60.0, 70.0), (64.0, -80.0), (30.0, 18.0), (-30.0, -120.0), (80.0, 120.0)]
TARGET = 2


def citrate_pos(t):
    """Citrate drifts in and clicks onto the target calcium ion at T.BIND."""
    tx, ty = IONS[TARGET]
    end = (tx - 17.0, ty + 2.0)
    if t >= T.BIND:
        d = t - T.BIND
        return end[0] + 6 * d, end[1] - 4 * d
    u = T.smooth((t - T.MOLECULE[1] + 0.25) / (T.BIND - T.MOLECULE[1] + 0.25))
    return -70 + (end[0] + 70) * u, -50 + (end[1] + 50) * u + 5 * math.sin(t * 5) * (1 - u)


def ion_pos(i, t):
    x, y = IONS[i]
    if i == TARGET and t >= T.BIND:
        d = t - T.BIND
        return x + 6 * d, y - 4 * d
    return x + 4 * math.sin(t * 2.1 + i), y + 4 * math.cos(t * 1.7 + i * 2)


def molecule(pen, t):
    buf = pen.buf
    buf[...] = P.PLASMA[3]
    bx = (0, 0, W, H)
    U, V = pen.grid(bx)
    ring = np.sqrt(U * U + (V * 0.6) ** 2)
    put(buf, bx, ring > 150, P.NAVY[1])                              # a round "lens" on the scene
    put(buf, bx, (ring > 146) & (ring <= 150), P.TUBE[2])
    for i in range(len(IONS)):
        x, y = ion_pos(i, t)
        ib, im, IU, IV = pen.disc(x, y, 9)
        if ib is None:
            continue
        put(buf, ib, im, P.ION[2])
        put(buf, ib, im & ((IU - x) + (IV - y) > 5), P.ION[1])
        pen.outline(ib, im, P.ION[0])
        if pen.z >= 0.9:
            w, h = pixfont.text_size('Ca')
            i0, j0 = pen.view.px(x, y)
            gfx.fill(buf, pixfont.text_mask('Ca', int(i0 - w / 2), int(j0 - h / 2)), P.ION[0])
    cx, cy = citrate_pos(t)
    close = T.smooth((t - (T.BIND - 0.12)) / 0.12)
    for k, base in enumerate((-50, 0, 50)):                         # three arms that close round the ion
        a = math.radians(base * (1 - 0.45 * close))
        ex, ey = cx + 13 * math.cos(a), cy + 13 * math.sin(a)
        n = 10
        for j in range(n + 1):
            f = j / n
            pen.dot(cx + (ex - cx) * f, cy + (ey - cy) * f, P.MINT[1], 2)
        kb, km, KU, KV = pen.disc(ex, ey, 3.6)
        if kb is not None:
            put(buf, kb, km, P.MINT[2])
            pen.outline(kb, km, P.MINT[0])
    hb, hm, HU, HV = pen.disc(cx, cy, 5.5)
    if hb is not None:
        put(buf, hb, hm, P.MINT[2])
        put(buf, hb, hm & ((HU - cx) + (HV - cy) < -2), P.MINT[3])
        pen.outline(hb, hm, P.MINT[0])
    f = T.frame(t) - T.frame(T.BIND)                                 # the click: a tiny gold flash (two frames)
    if 0 <= f < 2:
        x, y = ion_pos(TARGET, t)
        i0, j0 = pen.view.px(x - 8, y)
        for di, dj in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            if 0 <= int(i0) + di < W and 0 <= int(j0) + dj < H:
                buf[int(j0) + dj, int(i0) + di] = P.GOLD[3] if (di or dj) else P.WHITE


def molecule_camera(t):
    return View(-6.0, 8.0, 2.2)


# ------------------------------------------------------------------ channel (the separation, seen from the rotor)
RC = (0.0, 180.0)
R_IN, R_OUT = 80.0, 140.0
_rc = np.random.default_rng(9)
_NR, _NP, _NW = 150, 80, 5
C_RBC = np.c_[_rc.uniform(-1.25, 1.25, _NR), _rc.uniform(R_IN + 5, R_OUT - 5, _NR), _rc.uniform(0, 6.3, _NR)]
C_PLT = np.c_[_rc.uniform(-1.25, 1.25, _NP), _rc.uniform(R_IN + 5, R_OUT - 5, _NP), _rc.uniform(0, 6.3, _NP)]
C_WBC = np.c_[_rc.uniform(-1.0, 1.0, _NW), _rc.uniform(R_IN + 10, R_OUT - 10, _NW)]
BAND = {'rbc': (120.0, 137.0), 'plt': (104.0, 112.0), 'wbc': (113.0, 117.0)}
PORT_ANG = 0.62                                     # where the platelet port leaves the channel (rad from vertical)


def channel_camera(t):
    u = T.smoother((t - T.DIVERT[0]) / (T.DIVERT[1] - T.DIVERT[0]))
    return View(0.0 + 40.0 * u, 70.0 - 8.0 * u, 2.6)


def _band_r(r0, band, p, k):
    lo, hi = band
    target = lo + (hi - lo) * ((k * 0.618) % 1.0)
    return r0 + (target - r0) * p


def channel_particle(kind, i, t):
    """(x, y) of a particle in the channel at t."""
    p = T.separation(t)
    e = t - T.SEPARATE[1]
    if kind == 'rbc':
        a0, r0 = C_RBC[i, 0], C_RBC[i, 1]
        band = BAND['rbc']
    elif kind == 'plt':
        a0, r0 = C_PLT[i, 0], C_PLT[i, 1]
        band = BAND['plt']
    else:
        a0, r0 = C_WBC[i, 0], C_WBC[i, 1]
        band = BAND['wbc']
    a = ((a0 + 0.16 * e + 1.25) % 2.5) - 1.25                      # the flow moves along the channel
    r = _band_r(r0, band, p, i)
    if kind == 'plt' and a > PORT_ANG and t >= T.DIVERT[0]:     # platelets leave through their own port
        d = (a - PORT_ANG) * 120
        return (RC[0] + r * math.sin(PORT_ANG) + d * 0.55, RC[1] - r * math.cos(PORT_ANG) - d * 0.85)
    return RC[0] + r * math.sin(a), RC[1] - r * math.cos(a)


def channel(pen, t):
    buf = pen.buf
    p = T.separation(t)
    bx = (0, 0, W, H)
    U, V = pen.grid(bx)
    dx, dy = U - RC[0], V - RC[1]
    rr = np.sqrt(dx * dx + dy * dy)
    ang = np.arctan2(dx, -dy)
    spin = T.spin_angle(t)
    buf[...] = P.NAVY[0]
    # the bay outside rushes past (we ride with the rotor), the rotor body inside
    streak = (((ang + spin * 0.12) * 22) % 1.0 < 0.18) & ((rr.astype(int) % 6) == 0)
    put(buf, bx, (rr > R_OUT + 6) & streak, P.NAVY[3])
    put(buf, bx, rr < R_IN - 4, P.MACH[1])
    put(buf, bx, (rr < R_IN - 4) & (((ang * 40).astype(int) + (rr / 6).astype(int)) % 9 == 0), P.MACH[2])
    ch = (rr >= R_IN) & (rr <= R_OUT)
    put(buf, bx, ch, P.PLASMA[2])                                    # plasma fills the channel
    if p > 0:                                                        # packed red cells along the outer wall
        put(buf, bx, ch & (rr > R_OUT - 20 * p), P.RED[3])
        put(buf, bx, ch & (rr > R_OUT - 20 * p) & (rr < R_OUT - 20 * p + 1.4), P.RED[4])
        put(buf, bx, ch & (rr > BAND['plt'][0]) & (rr < BAND['plt'][1]) & (p > 0.65) & (ang < PORT_ANG),
            P.GOLD[1] if p < 0.85 else P.GOLD[2])
    # walls
    put(buf, bx, (rr > R_OUT) & (rr <= R_OUT + 5), P.MACH[2])
    put(buf, bx, (rr >= R_IN - 4) & (rr < R_IN), P.MACH[2])
    put(buf, bx, (np.abs(rr - R_OUT - 5) < 0.5) | (np.abs(rr - R_IN + 4) < 0.5), P.MACH[0])
    # the platelet port: a branch leaving at the middle band
    r0 = (BAND['plt'][0] + BAND['plt'][1]) / 2
    px, py = RC[0] + r0 * math.sin(PORT_ANG), RC[1] - r0 * math.cos(PORT_ANG)
    for k in range(0, 160, 2):
        x, y = px + k * 0.55, py - k * 0.85
        pb, pm, PU, PV = pen.disc(x, y, 6.5, 0)
        if pb is not None:
            put(buf, pb, pm, P.MACH[2])
    for k in range(0, 160, 2):
            x, y = px + k * 0.55, py - k * 0.85
            pb, pm, PU, PV = pen.disc(x, y, 4.2, 0)
            if pb is not None:
                put(buf, pb, pm, P.PLASMA[3] if t < T.DIVERT[0] else P.GOLD[3])
    for i in range(_NR):
        x, y = channel_particle('rbc', i, t)
        rbc(pen, x, y, 4.6, tilt=0.4 + 0.5 * abs(math.sin(i)), psi=C_RBC[i, 2] + (t - 15) * 0.3)
    for i in range(_NW):
        x, y = channel_particle('wbc', i, t)
        wbc(pen, x, y, 6.0)
    for i in range(_NP):
        x, y = channel_particle('plt', i, t)
        platelet(pen, x, y, 2.0, C_PLT[i, 2] + t)


def channel_point(kind):
    """World point of a band (for the labels), on the left half of the channel."""
    r = {'rbc': 130.0, 'plt': 108.0, 'plasma': 90.0}[kind]
    a = {'rbc': -0.42, 'plt': -0.18, 'plasma': -0.55}[kind]
    return RC[0] + r * math.sin(a), RC[1] - r * math.cos(a)


def channel_port_point():
    """World point on the platelet port, a little way along it (for its label)."""
    r0 = (BAND['plt'][0] + BAND['plt'][1]) / 2
    return RC[0] + r0 * math.sin(PORT_ANG) + 30 * 0.55, RC[1] - r0 * math.cos(PORT_ANG) - 30 * 0.85
