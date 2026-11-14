#!/usr/bin/env python3
"""From debris disk to Moon: N-body with merging, starting where sim_impact.py ends.

Earth is a point mass at the origin (the merged body's centre of mass), and the debris is followed in Earth's frame.
Each SPH parcel left outside Earth is split into a few fragments (a parcel is a swarm, not one rock). Fragments feel
Earth and each other (softened direct sum). Two fragments that touch merge only outside the Roche limit (~2.9 Earth
radii for lunar-density rock); inside it, tides stop them from sticking. A fragment that reaches Earth's surface is
absorbed, which is the fallback. Collisions inside a swarm are inelastic, so a weak damping of each fragment toward a
circular orbit stands in for that dissipation. Merge and fallback events are logged for flashes and sound cues.

  uv run --no-project --with numba --with numpy python tools/sim_accrete.py [--tend 1500] [--frag 6]
"""
import argparse, json, math, time
from pathlib import Path
import numpy as np
import numba as nb

ap = argparse.ArgumentParser()
ap.add_argument('--tend', type=float, default=160.0)
ap.add_argument('--frag', type=int, default=4)
ap.add_argument('--fcoll', type=float, default=0.1, help='collision radius / physical radius for the smallest fragments (rises to 1 for moon-sized bodies)')
ap.add_argument('--damp', type=float, default=0.004, help='collisional damping rate toward circular orbits')
ap.add_argument('--tag', default='')
ap.add_argument('--start', default='impact_t6', help='build/<name>.npz to start from')
a = ap.parse_args()
ROOT = Path(__file__).resolve().parent.parent
d = np.load(ROOT / 'build' / f'{a.start}.npz'); T0 = float(d['t'])
RE = float(d['re']) if 're' in d else 0.91                   # relaxed proto-Earth radius in sim units
MLUNAR = 0.0123                                             # Moon / Earth mass
AR = 2.9 * RE                                               # Roche limit for lunar-density rock
RABS = 1.06 * RE                                            # hot, puffed-up post-impact Earth
rng = np.random.default_rng(11)

x, y, vx, vy, m, u, mat = (d[k].astype(np.float64) if k != 'mat' else d[k] for k in ('x', 'y', 'vx', 'vy', 'm', 'u', 'mat'))
core = (mat == 0) | (mat == 2); w = m[core]
cx, cy = (x[core] * w).sum() / w.sum(), (y[core] * w).sum() / w.sum()
r = np.hypot(x - cx, y - cy); body = r < 1.3 * RE
M = m[body].sum(); bvx, bvy = (vx[body] * m[body]).sum() / M, (vy[body] * m[body]).sum() / M
deb = ~body
X, Y, VX, VY = x[deb] - cx, y[deb] - cy, vx[deb] - bvx, vy[deb] - bvy
MD, UD, MATD, TONE = m[deb], u[deb], mat[deb], d['tone'][deb]
print(f'Earth body {M:.4f}, debris parcels {deb.sum()} mass {MD.sum():.4f} ({MD.sum() / MLUNAR:.2f} lunar)')

# split parcels into fragments
k = a.frag; sp = float(d['sp']) if 'sp' in d else 0.036
fx = np.repeat(X, k) + rng.normal(0, 0.35 * sp, X.size * k); fy = np.repeat(Y, k) + rng.normal(0, 0.35 * sp, X.size * k)
fvx = np.repeat(VX, k) + rng.normal(0, 0.012, X.size * k); fvy = np.repeat(VY, k) + rng.normal(0, 0.012, X.size * k)
fm = np.repeat(MD / k, k); fu = np.repeat(UD, k); fmat = np.repeat(MATD, k).astype(np.int8); ftone = rng.random(X.size * k)
N = fx.size
def rad(mass): return 0.273 * RE * np.cbrt(mass / MLUNAR)      # physical radius of a lunar-density body
M0 = float(fm.min())
def rcoll(mass):                                                # small fragments: a fraction of it (they are loose swarms); moonlets: all of it
    f = a.fcoll + (1 - a.fcoll) * np.clip(np.log10(mass / M0) / 3.0, 0, 1)
    return rad(mass) * f
print(f'fragments {N}; fragment radius {rad(fm[0]):.4f} ({rad(fm[0]) / RE:.3f} RE)')

@nb.njit(parallel=True, fastmath=True)
def accel(x, y, m, alive, M, eps2, ax, ay):
    n = x.size
    for i in nb.prange(n):
        if not alive[i]: ax[i] = 0.0; ay[i] = 0.0; continue
        r2 = x[i] * x[i] + y[i] * y[i]; r3 = r2 * math.sqrt(r2)
        gx = -M * x[i] / r3; gy = -M * y[i] / r3
        for j in range(n):
            if j == i or not alive[j]: continue
            dx = x[j] - x[i]; dy = y[j] - y[i]; q2 = dx * dx + dy * dy + eps2
            inv = m[j] / (q2 * math.sqrt(q2)); gx += dx * inv; gy += dy * inv
        ax[i] = gx; ay[i] = gy

@nb.njit
def collide(x, y, vx, vy, m, u, alive, into, rr, fcoll, ar, rabs, t, ev, merge_pass):
    n = x.size; ne = 0
    # fallback onto Earth
    for i in range(n):
        if alive[i] and x[i] * x[i] + y[i] * y[i] < rabs * rabs:
            alive[i] = False; into[i] = -2
            if ne < ev.shape[0]: ev[ne, 0] = t; ev[ne, 1] = 1; ev[ne, 2] = x[i]; ev[ne, 3] = y[i]; ev[ne, 4] = m[i]; ev[ne, 5] = i; ev[ne, 6] = -2; ne += 1
    # merging outside the Roche limit (O(n^2), so only every few steps); far escapers are dropped
    for i in range(n):
        if alive[i] and x[i] * x[i] + y[i] * y[i] > 1600.0 * rr[n] * rr[n]: alive[i] = False; into[i] = -3
    if not merge_pass: return ne
    for i in range(n):
        if not alive[i]: continue
        ri = math.sqrt(x[i] * x[i] + y[i] * y[i])
        if ri < ar: continue
        for j in range(i + 1, n):
            if not alive[j]: continue
            dx = x[j] - x[i]; dy = y[j] - y[i]; s = rr[i] + rr[j]
            if dx * dx + dy * dy < s * s:
                rj = math.sqrt(x[j] * x[j] + y[j] * y[j])
                if rj < ar: continue
                big, small = (i, j) if m[i] >= m[j] else (j, i)
                mt = m[i] + m[j]
                x[big] = (x[i] * m[i] + x[j] * m[j]) / mt; y[big] = (y[i] * m[i] + y[j] * m[j]) / mt
                vx[big] = (vx[i] * m[i] + vx[j] * m[j]) / mt; vy[big] = (vy[i] * m[i] + vy[j] * m[j]) / mt
                u[big] = (u[i] * m[i] + u[j] * m[j]) / mt + 0.05          # impact heat
                m[big] = mt
                lg = math.log10(mt / rr[n + 1]) / 3.0
                if lg < 0.0: lg = 0.0
                if lg > 1.0: lg = 1.0
                rr[big] = 0.273 * rr[n] * (mt / 0.0123) ** (1.0 / 3.0) * (fcoll + (1.0 - fcoll) * lg)   # rr[n] = RE, rr[n+1] = M0
                alive[small] = False; into[small] = big
                if ne < ev.shape[0]: ev[ne, 0] = t; ev[ne, 1] = 2; ev[ne, 2] = x[big]; ev[ne, 3] = y[big]; ev[ne, 4] = mt; ev[ne, 5] = small; ev[ne, 6] = big; ne += 1
                if big == j: break
    return ne

@nb.njit(parallel=True, fastmath=True)
def damp_circ(x, y, vx, vy, alive, M, rate, dt):
    for i in nb.prange(x.size):
        if not alive[i]: continue
        r = math.sqrt(x[i] * x[i] + y[i] * y[i]); vc = math.sqrt(M / r)
        tx = -y[i] / r; ty = x[i] / r
        sgn = 1.0 if vx[i] * tx + vy[i] * ty >= 0 else -1.0
        k = rate * dt
        vx[i] += k * (sgn * vc * tx - vx[i]); vy[i] += k * (sgn * vc * ty - vy[i])

alive = np.ones(N, np.bool_); into = -np.ones(N, np.int64)
rr = np.concatenate([rcoll(fm), [RE, M0]])                  # collision radii; the two extra slots are read by collide()
ax, ay = np.zeros(N), np.zeros(N)
EPS2 = (0.01 * RE) ** 2
ev_all = []; snaps = []
want = [round(v, 3) for v in list(np.arange(0, 10, 0.05)) + list(np.arange(10, 40, 0.1)) + list(np.arange(40, a.tend + 1e-9, 0.5))]
wi = 0; t = 0.0; t0 = time.time(); last = t0
ev = np.zeros((4096, 7))
accel(fx, fy, fm, alive, M, EPS2, ax, ay)
while wi < len(want):
    rmin = np.sqrt(fx[alive] ** 2 + fy[alive] ** 2).min() if alive.any() else 1.0
    dt = min(0.02, 0.02 * rmin ** 1.5)                       # ~300 steps per orbit at the innermost fragment
    if t + dt > want[wi]: dt = max(want[wi] - t, 1e-6)
    fvx += 0.5 * dt * ax; fvy += 0.5 * dt * ay
    fx += dt * fvx; fy += dt * fvy
    accel(fx, fy, fm, alive, M, EPS2, ax, ay)
    fvx += 0.5 * dt * ax; fvy += 0.5 * dt * ay
    if a.damp: damp_circ(fx, fy, fvx, fvy, alive, M, a.damp, dt)
    t += dt
    nstep = locals().get('nstep', 0) + 1
    ne = collide(fx, fy, fvx, fvy, fm, fu, alive, into, rr, a.fcoll, AR, RABS, t, ev, nstep % 4 == 0)
    if ne: ev_all += ev[:ne].tolist(); accel(fx, fy, fm, alive, M, EPS2, ax, ay)
    fu *= (1 - 0.0005 * dt)                                     # slow radiative cooling of the debris
    if t >= want[wi] - 1e-9:
        snaps.append((want[wi], fx.astype(np.float32).copy(), fy.astype(np.float32).copy(), alive.copy(), fm.copy(), fu.copy())); wi += 1
        if time.time() - last > 15:
            big = fm[alive].max() if alive.any() else 0
            print(f't={t:.0f} alive={alive.sum()} biggest={big / MLUNAR:.3f} lunar  {time.time() - t0:.0f}s', flush=True); last = time.time()

alive_m = fm[alive]; order = np.argsort(-alive_m)
r_alive = np.hypot(fx[alive], fy[alive])
falls = sum(1 for e in ev_all if e[1] == 1); merges = sum(1 for e in ev_all if e[1] == 2)
print(f'done t={t:.0f} in {time.time() - t0:.0f}s: alive {alive.sum()}, merges {merges}, fallbacks {falls}')
print('largest bodies (lunar masses @ r/RE):', [(round(alive_m[i] / MLUNAR, 3), round(float(r_alive[i] / RE), 2)) for i in order[:6]])
print(f'mass fallen to Earth {sum(e[4] for e in ev_all if e[1] == 1) / MLUNAR:.2f} lunar; still orbiting {alive_m.sum() / MLUNAR:.2f} lunar')
hist = [(tt, mm[al].max() / MLUNAR if al.any() else 0, int(al.sum())) for tt, X_, Y_, al, mm, uu in snaps]
fin = hist[-1][1]
for frac in (0.1, 0.25, 0.5, 0.75, 0.9, 0.97):
    tt = next(h[0] for h in hist if h[1] >= frac * fin); print(f'  biggest reaches {frac:.0%} of final at t={tt:.1f} (alive {next(h[2] for h in hist if h[0] == tt)})')
for tt in (0, 5, 10, 20, 40, 60, 80, 100, 150, 200, 300):
    h = min(hist, key=lambda q: abs(q[0] - tt)); print(f'  t={h[0]:6.1f} biggest {h[1]:.3f} lunar, alive {h[2]}')
if a.tag: raise SystemExit

out = ROOT / 'engine' / 'data'; QS = 512.0
buf = bytearray(); n = N; PAD = (-(4 * n + n) % 4)
for tt, X_, Y_, al, mm, uu in snaps:
    qx = np.clip(np.round(X_ * QS), -32767, 32767).astype('<i2'); qy = np.clip(np.round(Y_ * QS), -32767, 32767).astype('<i2')
    qa = np.where(al, np.clip(np.round(np.cbrt(mm / fm.max()) * 254) + 1, 1, 255), 0).astype(np.uint8)   # 0 = gone, else size code
    buf += qx.tobytes() + qy.tobytes() + qa.tobytes() + bytes(PAD)
(out / 'accrete.bin').write_bytes(bytes(buf))
meta = {'n': int(n), 'qs': QS, 're': RE, 'ar': AR, 'rabs': RABS, 'M': M, 'mlunar': MLUNAR, 'mmax': float(fm.max()), 'm0': float(fm.min()),
        'times': [s[0] for s in snaps], 'stride': 5 * n + PAD, 'mat': fmat.tolist(), 'tone': [round(float(v), 3) for v in ftone],
        'heat': [round(float(v), 3) for v in np.repeat(UD, k)], 'events': [[round(e[0], 3), int(e[1]), round(e[2], 4), round(e[3], 4), round(e[4], 6), int(e[5]), int(e[6])] for e in ev_all],
        'parent': np.repeat(np.nonzero(deb)[0], k).tolist(), 'center': [cx, cy], 'bodyv': [bvx, bvy], 't0': T0, 'into': into.tolist()}
(out / 'accrete.json').write_text(json.dumps(meta, separators=(',', ':')))
print(f'export: {len(snaps)} snapshots, {len(buf) / 1e6:.1f} MB')
