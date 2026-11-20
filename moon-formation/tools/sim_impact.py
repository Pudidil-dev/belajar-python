#!/usr/bin/env python3
"""Giant impact, 2D SPH with self-gravity.

Units: G = 1, proto-Earth radius 1 and mass 1 (one unit of time is about 13 minutes for the real Earth).
Each body is a disc of particles with an iron core and a silicate mantle, relaxed to hydrostatic equilibrium
first. Theia (radius 0.53, Mars-sized) then hits at about 45° from the vertical at roughly the mutual escape
speed, the canonical giant-impact setup. The solver is textbook SPH: cubic-spline kernel, a stiff equation of
state plus thermal pressure, Monaghan artificial viscosity (which turns impact energy into heat, used for the
glow colours) and direct-sum softened gravity with a 1/r² law.

Writes engine/data/impact.bin + impact.json (snapshots for the renderer) and build/impact_end.npz (the state handed
to sim_accrete.py).

  uv run --no-project --with numba --with numpy --with pillow python tools/sim_impact.py [--quick] [--preview]
"""
import argparse, json, math, time
from pathlib import Path
import numpy as np
import numba as nb

ap = argparse.ArgumentParser()
ap.add_argument('--quick', action='store_true', help='coarse particles for tuning')
ap.add_argument('--preview', action='store_true', help='write PNG previews of snapshots to build/sim_preview')
ap.add_argument('--tend', type=float, default=6.5)
ap.add_argument('--angle', type=float, default=45.0, help='impact angle from the line of centres, degrees')
ap.add_argument('--vfac', type=float, default=1.05, help='impact speed / mutual escape speed')
ap.add_argument('--mt', type=float, default=0.12, help='Theia mass (Earth = 1)')
ap.add_argument('--spin', type=float, default=0.0, help='proto-Earth spin rate (rad per time unit), prograde')
ap.add_argument('--c0', type=float, default=2.0, help='bulk sound speed')
ap.add_argument('--tag', default='', help='suffix for diagnostic output only; no export when set')
ap.add_argument('--handoff', default='6', help='also save the full state at these times (build/impact_tXX.npz)')
a = ap.parse_args()

ROOT = Path(__file__).resolve().parent.parent
SP = 0.055 if a.quick else 0.036           # lattice spacing
H = 1.3 * SP                               # smoothing length (kernel support 2H)
C0 = a.c0                                  # bulk sound speed of the cold material
GAM = 5 / 3                                # thermal pressure (γ - 1) ρ u
AV_A, AV_B = 1.0, 2.0                      # artificial viscosity
EPS2 = H * H                               # gravity softening
RT, MT = 0.53, a.mt                        # Theia: radius and mass (Earth = 1, 1)
CORE_E, CORE_T = 0.55, 0.50                # core radius as a fraction of the body radius
FE = 2.2                                   # iron / silicate mass per particle
rng = np.random.default_rng(7)

# ---------------- kernel and solver ----------------
@nb.njit(fastmath=True, inline='always')
def kW(r, h):
    q = r / h; s = 10.0 / (7.0 * math.pi * h * h)
    if q < 1.0: return s * (1.0 - 1.5 * q * q + 0.75 * q * q * q)
    if q < 2.0: return s * 0.25 * (2.0 - q) ** 3
    return 0.0

@nb.njit(fastmath=True, inline='always')
def kdW(r, h):
    q = r / h; s = 10.0 / (7.0 * math.pi * h * h * h)
    if q < 1.0: return s * (-3.0 * q + 2.25 * q * q)
    if q < 2.0: return -s * 0.75 * (2.0 - q) ** 2
    return 0.0

@nb.njit
def grid(x, y, L, cell, nc):
    head = -np.ones(nc * nc, np.int64); nxt = -np.ones(x.size, np.int64)
    for i in range(x.size):
        cx = int((x[i] + L) / cell); cy = int((y[i] + L) / cell)
        if 0 <= cx < nc and 0 <= cy < nc:
            c = cy * nc + cx; nxt[i] = head[c]; head[c] = i
    return head, nxt

@nb.njit(parallel=True, fastmath=True)
def density(x, y, m, head, nxt, L, cell, nc, h, rho):
    for i in nb.prange(x.size):
        cx = int((x[i] + L) / cell); cy = int((y[i] + L) / cell)
        acc = 0.0
        if 0 <= cx < nc and 0 <= cy < nc:
            for oy in range(-1, 2):
                yy = cy + oy
                if yy < 0 or yy >= nc: continue
                for ox in range(-1, 2):
                    xx = cx + ox
                    if xx < 0 or xx >= nc: continue
                    j = head[yy * nc + xx]
                    while j >= 0:
                        rx = x[i] - x[j]; ry = y[i] - y[j]; r = math.sqrt(rx * rx + ry * ry)
                        if r < 2.0 * h: acc += m[j] * kW(r, h)
                        j = nxt[j]
        else:
            acc = m[i] * kW(0.0, h)
        rho[i] = acc

@nb.njit(parallel=True, fastmath=True)
def eos(rho, u, rho0, P, cs, c0, gam):
    for i in nb.prange(rho.size):
        pc = c0 * c0 * (rho[i] - rho0[i])
        if pc < 0.0: pc = 0.0                           # no tension: material can tear apart freely
        uu = u[i] if u[i] > 0.0 else 0.0
        P[i] = pc + (gam - 1.0) * rho[i] * uu
        cs[i] = math.sqrt(c0 * c0 + gam * (gam - 1.0) * uu)

@nb.njit(parallel=True, fastmath=True)
def sph_forces(x, y, vx, vy, m, rho, P, cs, head, nxt, L, cell, nc, h, avA, avB, ax, ay, du):
    for i in nb.prange(x.size):
        cx = int((x[i] + L) / cell); cy = int((y[i] + L) / cell)
        axi = 0.0; ayi = 0.0; dui = 0.0
        if 0 <= cx < nc and 0 <= cy < nc:
            pi_ = P[i] / (rho[i] * rho[i])
            for oy in range(-1, 2):
                yy = cy + oy
                if yy < 0 or yy >= nc: continue
                for ox in range(-1, 2):
                    xx = cx + ox
                    if xx < 0 or xx >= nc: continue
                    j = head[yy * nc + xx]
                    while j >= 0:
                        if j != i:
                            rx = x[i] - x[j]; ry = y[i] - y[j]; r2 = rx * rx + ry * ry
                            if r2 < 4.0 * h * h and r2 > 1e-14:
                                r = math.sqrt(r2); ex = rx / r; ey = ry / r; dw = kdW(r, h)
                                dvx = vx[i] - vx[j]; dvy = vy[i] - vy[j]; vr = dvx * rx + dvy * ry
                                visc = 0.0
                                if vr < 0.0:
                                    mu = h * vr / (r2 + 0.01 * h * h)
                                    visc = (-avA * 0.5 * (cs[i] + cs[j]) * mu + avB * mu * mu) / (0.5 * (rho[i] + rho[j]))
                                f = m[j] * (pi_ + P[j] / (rho[j] * rho[j]) + visc) * dw
                                axi -= f * ex; ayi -= f * ey
                                dui += 0.5 * f * (dvx * ex + dvy * ey)
                        j = nxt[j]
        ax[i] = axi; ay[i] = ayi; du[i] = dui

@nb.njit(parallel=True, fastmath=True)
def gravity(x, y, m, eps2, ax, ay):
    n = x.size
    for i in nb.prange(n):
        gx = 0.0; gy = 0.0; xi = x[i]; yi = y[i]
        for j in range(n):
            dx = x[j] - xi; dy = y[j] - yi; r2 = dx * dx + dy * dy + eps2
            inv = m[j] / (r2 * math.sqrt(r2)); gx += dx * inv; gy += dy * inv
        ax[i] += gx; ay[i] += gy

class State:
    def __init__(s, x, y, vx, vy, m, rho0, u, mat):
        s.x, s.y, s.vx, s.vy, s.m, s.rho0, s.u, s.mat = x, y, vx, vy, m, rho0, u, mat
        n = x.size
        s.rho, s.P, s.cs = np.zeros(n), np.zeros(n), np.zeros(n)
        s.ax, s.ay, s.du = np.zeros(n), np.zeros(n), np.zeros(n)

L, CELL = 12.0, 2.0 * H
NC = int(2 * L / CELL) + 1

def accel(s):
    head, nxt = grid(s.x, s.y, L, CELL, NC)
    density(s.x, s.y, s.m, head, nxt, L, CELL, NC, H, s.rho)
    eos(s.rho, s.u, s.rho0, s.P, s.cs, C0, GAM)
    sph_forces(s.x, s.y, s.vx, s.vy, s.m, s.rho, s.P, s.cs, head, nxt, L, CELL, NC, H, AV_A, AV_B, s.ax, s.ay, s.du)
    gravity(s.x, s.y, s.m, EPS2, s.ax, s.ay)

def step(s, dt, damp=0.0):
    s.vx += 0.5 * dt * s.ax; s.vy += 0.5 * dt * s.ay; s.u += 0.5 * dt * s.du
    s.x += dt * s.vx; s.y += dt * s.vy
    accel(s)
    s.vx += 0.5 * dt * s.ax; s.vy += 0.5 * dt * s.ay; s.u += 0.5 * dt * s.du
    np.maximum(s.u, 0.0, out=s.u)
    if damp: s.vx *= (1 - damp * dt); s.vy *= (1 - damp * dt)

def cfl(s):
    v = np.sqrt(s.vx ** 2 + s.vy ** 2); amax = np.sqrt(s.ax ** 2 + s.ay ** 2).max() + 1e-9
    return min(0.3 * H / (s.cs + v).max(), 0.25 * math.sqrt(H / amax))

# ---------------- bodies ----------------
def hexdisk(R, s):
    pts = []; dy = s * math.sqrt(3) / 2; ny = int(R / dy) + 2; nx = int(R / s) + 2
    for j in range(-ny, ny + 1):
        for i in range(-nx, nx + 1):
            x = i * s + (0.5 * s if j % 2 else 0.0); y = j * dy
            if x * x + y * y <= R * R: pts.append((x, y))
    p = np.array(pts); return p + rng.normal(0, s * 0.02, p.shape)

def body(R, M, core_frac, mat_core, mat_mantle):
    p = hexdisk(R, SP); r = np.hypot(p[:, 0], p[:, 1]); core = r < core_frac * R
    w = np.where(core, FE, 1.0); m = w * M / w.sum()
    mat = np.where(core, mat_core, mat_mantle).astype(np.int8)
    return p, m, mat

def relax(p, m, mat, T=6.0):
    n = len(p); s = State(p[:, 0].copy(), p[:, 1].copy(), np.zeros(n), np.zeros(n), m.copy(), np.ones(n), np.zeros(n), mat)
    # rest density = the density the lattice already has, so the body starts close to equilibrium
    head, nxt = grid(s.x, s.y, L, CELL, NC); density(s.x, s.y, s.m, head, nxt, L, CELL, NC, H, s.rho)
    r = np.hypot(s.x, s.y); inner = r < r.max() - 2.2 * H
    for k in (0, 1):                                          # per material: median interior density
        sel = (mat % 2 == k) & inner
        if sel.any(): s.rho0[mat % 2 == k] = np.median(s.rho[sel]) * 0.97
    accel(s); t = 0.0
    while t < T:
        dt = cfl(s); step(s, dt, damp=3.0); s.u[:] = 0.0; t += dt
    return s

def merge(*ss):
    cat = lambda f: np.concatenate([getattr(s, f) for s in ss])
    return State(cat('x'), cat('y'), cat('vx'), cat('vy'), cat('m'), cat('rho0'), cat('u'), cat('mat'))

t0 = time.time()
pe, me, mate = body(1.0, 1.0, CORE_E, 0, 1)               # mat: 0 Earth core, 1 Earth mantle, 2 Theia core, 3 Theia mantle
pt, mt, matt = body(RT, MT, CORE_T, 2, 3)
print(f'particles: Earth {len(pe)}, Theia {len(pt)}', flush=True)
E = relax(pe, me, mate); T = relax(pt, mt, matt, T=4.0)
print(f'relaxed in {time.time() - t0:.0f}s; Earth radius {np.hypot(E.x, E.y).max():.3f}, Theia {np.hypot(T.x, T.y).max():.3f}', flush=True)

# ---------------- collision geometry ----------------
# Contact at 45° between the relative velocity and the line of centres, at about the mutual escape speed.
# Integrate the point-mass two-body orbit back from contact, so the sim starts with a gap and tides can act.
MU = 1.0 + MT
DC = 1.0 + RT
VESC = math.sqrt(2 * MU / DC)
VC = a.vfac * VESC
PHI = math.radians(-58)                                  # contact direction from Earth (screen coords, y down): upper right
n_ = np.array([math.cos(PHI), math.sin(PHI)]); t_ = np.array([math.sin(PHI), -math.cos(PHI)])
rel_v = VC * (-math.cos(math.radians(a.angle)) * n_ + math.sin(math.radians(a.angle)) * t_)
rel_x = DC * n_
def kepler_back(rx, rv, T, dt=1e-3):                     # relative orbit, integrated backwards
    path = [(0.0, rx.copy(), rv.copy())]; x, v = rx.copy(), rv.copy(); tt = 0.0
    while tt < T:
        acc = lambda q: -MU * q / np.linalg.norm(q) ** 3
        v = v - 0.5 * dt * acc(x); x = x - dt * v; v = v - 0.5 * dt * acc(x); tt += dt
        path.append((-tt, x.copy(), v.copy()))
    return path
back = kepler_back(rel_x, rel_v, 40.0)
TSTART = 0.35                                            # sim starts this long before point-mass contact
_, rx0, rv0 = min(back, key=lambda q: abs(q[0] + TSTART))
# barycentric placement
fE, fT = MT / MU, 1.0 / MU
E.x -= fE * rx0[0]; E.y -= fE * rx0[1]; E.vx[:] = -fE * rv0[0]; E.vy[:] = -fE * rv0[1]
T.x += fT * rx0[0]; T.y += fT * rx0[1]; T.vx[:] = fT * rv0[0]; T.vy[:] = fT * rv0[1]
if a.spin:                                                # prograde spin: same sense as the impact's angular momentum
    Lz = rel_x[0] * rel_v[1] - rel_x[1] * rel_v[0]; w = math.copysign(a.spin, Lz)
    ex0, ey0 = -fE * rx0[0], -fE * rx0[1]
    E.vx += -w * (E.y - ey0); E.vy += w * (E.x - ex0)
# approach path before the sim starts (relative position of Theia from Earth), for the film's scene 2
approach = [[round(tt, 4), round(float(px), 5), round(float(py), 5)] for tt, (px, py), _ in back[::20]]   # Theia relative to Earth, t <= 0 at point-mass contact

# warm start: Earth is a magma ocean (hot mantle), Theia is cooler with a crust
S = merge(E, T)
S.u[:] = 0.0
heat0 = np.where(S.mat == 1, 0.35, np.where(S.mat == 0, 0.5, np.where(S.mat == 3, 0.12, 0.25)))   # display base heat 0..1
tone = rng.random(S.x.size)                                # per-particle texture value for the renderer

# ---------------- run ----------------
def keep_times():
    ts = list(np.arange(0.0, 3.0, 0.025)) + list(np.arange(3.0, a.tend + 1e-9, 0.05))
    return [round(float(v), 4) for v in ts]
want = keep_times(); snaps = []; wi = 0; tcontact = None
handoffs = sorted(float(v) for v in a.handoff.split(',') if v); (ROOT / 'build').mkdir(exist_ok=True)
accel(S); t = 0.0; nstep = 0; last = time.time()
prev = None
while wi < len(want):
    dt = min(cfl(S), 0.01)
    if t + dt > want[wi]: dt = max(want[wi] - t, 1e-6)
    step(S, dt); t += dt; nstep += 1
    if abs(t - want[wi]) < 1e-9 or t > want[wi]:
        snaps.append((want[wi], S.x.astype(np.float32).copy(), S.y.astype(np.float32).copy(), S.u.astype(np.float32).copy()))
        if tcontact is None:
            eE = S.mat < 2; dmin = np.min(np.hypot(S.x[eE][None, :] - S.x[~eE][:, None], S.y[eE][None, :] - S.y[~eE][:, None]))
            if dmin < SP: tcontact = want[wi]; print(f'contact at t={tcontact}', flush=True)
        if handoffs and abs(want[wi] - handoffs[0]) < 1e-6:
            hv = handoffs.pop(0); RE_ = float(np.percentile(np.hypot(E.x - E.x.mean(), E.y - E.y.mean()), 99))
            np.savez(ROOT / 'build' / f'impact_t{hv:g}.npz', x=S.x, y=S.y, vx=S.vx, vy=S.vy, m=S.m, u=S.u, mat=S.mat, t=t, heat0=heat0, tone=tone, re=RE_, sp=SP)
        wi += 1
        if time.time() - last > 20: print(f't={t:.2f} steps={nstep} dt={dt:.4f} umax={S.u.max():.3f} {time.time() - t0:.0f}s', flush=True); last = time.time()
print(f'done t={t:.2f} in {nstep} steps, {time.time() - t0:.0f}s', flush=True)

def census(S):
    core = (S.mat == 0) | (S.mat == 2); w = S.m[core]
    cx, cy = (S.x[core] * w).sum() / w.sum(), (S.y[core] * w).sum() / w.sum()
    r = np.hypot(S.x - cx, S.y - cy); body = r < 1.15 * RE
    M = S.m[body].sum(); vcx, vcy = (S.vx[body] * S.m[body]).sum() / M, (S.vy[body] * S.m[body]).sum() / M
    dx, dy, dvx, dvy = S.x - cx, S.y - cy, S.vx - vcx, S.vy - vcy
    en = 0.5 * (dvx ** 2 + dvy ** 2) - M / np.maximum(r, 1e-6); hh = np.abs(dx * dvy - dy * dvx)
    ecc = np.sqrt(np.maximum(0, 1 + 2 * en * hh ** 2 / M ** 2)); sma = -M / (2 * np.minimum(en, -1e-9)); q = sma * (1 - ecc)
    out = ~body; bound = out & (en < 0); disk = bound & (q > RE); fall = bound & (q <= RE); esc = out & (en >= 0)
    th = np.isin(S.mat, (2, 3))
    return dict(M=M, disk=S.m[disk].sum(), fall=S.m[fall].sum(), esc=S.m[esc].sum(), disk_theia=S.m[disk & th].sum(), ndisk=int(disk.sum()),
                disk_rmed=float(np.median(r[disk])) if disk.any() else 0.0)
RE = float(np.percentile(np.hypot(E.x - E.x.mean(), E.y - E.y.mean()), 99))
c = census(S)
print(f"census t={t:.1f}: body {c['M']:.3f}  disk {c['disk']:.4f} ({c['disk'] / 0.0123:.2f} lunar, {c['ndisk']} particles, Theia share {c['disk_theia'] / max(c['disk'], 1e-9):.0%}, median r {c['disk_rmed'] / RE:.2f} RE)  "
      f"falling {c['fall']:.4f}  escaping {c['esc']:.4f}   [angle {a.angle} vfac {a.vfac} mt {a.mt} spin {a.spin} c0 {a.c0}]", flush=True)
if a.tag: raise SystemExit

# ---------------- export ----------------
out = ROOT / 'engine' / 'data'; out.mkdir(parents=True, exist_ok=True)
n = S.x.size; QS = 1024.0
PAD = (-5 * n) % 4                                        # keep every snapshot 4-byte aligned for typed arrays in JS
# Earth's centre per snapshot: centre of mass of the iron of both cores (follows the merged planet smoothly)
core = (S.mat == 0) | (S.mat == 2)
ec = []
buf = bytearray()
for tt, x, y, u in snaps:
    w = S.m[core]; cx = float((x[core] * w).sum() / w.sum()); cy = float((y[core] * w).sum() / w.sum()); ec.append([round(cx, 5), round(cy, 5)])
    qx = np.clip(np.round(x * QS), -32767, 32767).astype('<i2'); qy = np.clip(np.round(y * QS), -32767, 32767).astype('<i2')
    qu = np.clip(np.round(np.sqrt(np.clip(u, 0, None) / 1.2) * 255), 0, 255).astype(np.uint8)   # sqrt: shows weak heating too
    buf += qx.tobytes() + qy.tobytes() + qu.tobytes() + bytes(PAD)
(out / 'impact.bin').write_bytes(bytes(buf))
meta = {'n': int(n), 'qs': QS, 'h': H, 'sp': SP, 're': RE, 'times': [s[0] for s in snaps], 'earth': ec, 'rt': RT, 'mt': MT,
        'mat': S.mat.tolist(), 'heat0': [round(float(v), 3) for v in heat0], 'tone': [round(float(v), 3) for v in tone],
        'approach': approach, 'tstart': TSTART, 'tcontact': tcontact, 'stride': 5 * int(n) + PAD}
(out / 'impact.json').write_text(json.dumps(meta, separators=(',', ':')))
(ROOT / 'build').mkdir(exist_ok=True)
np.savez(ROOT / 'build' / 'impact_end.npz',
         x=S.x, y=S.y, vx=S.vx, vy=S.vy, m=S.m, u=S.u, mat=S.mat, t=t, heat0=heat0, tone=tone, re=RE, sp=SP)
print(f'export: {len(snaps)} snapshots, {len(buf) / 1e6:.1f} MB', flush=True)

if a.preview:
    from PIL import Image, ImageDraw
    pv = ROOT / 'build' / 'sim_preview'; pv.mkdir(parents=True, exist_ok=True)
    cols = {0: (255, 220, 120), 1: (240, 90, 20), 2: (200, 200, 220), 3: (120, 140, 200)}
    for k in range(0, len(snaps), max(1, len(snaps) // 24)):
        tt, x, y, u = snaps[k]; im = Image.new('RGB', (600, 600), (5, 6, 12)); d = ImageDraw.Draw(im)
        cx, cy = ec[k]; sc = 60
        for i in range(n):
            px, py = 300 + (x[i] - cx) * sc, 300 + (y[i] - cy) * sc
            if 0 <= px < 600 and 0 <= py < 600:
                c = cols[int(S.mat[i])]; hh = min(1.0, u[i] / 0.6); c = tuple(int(c[j] * (1 - hh) + 255 * hh) for j in range(3))
                d.point((px, py), fill=c)
        d.text((8, 8), f't={tt:.2f}', fill=(255, 255, 255)); im.save(pv / f'snap_{k:04d}.png')
    print('preview ->', pv)
