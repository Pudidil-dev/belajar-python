// PHYS — trajectories that the scenes play back. Everything is integrated once at load time with fixed steps and stored,
// so every frame is a pure lookup (deterministic, and frames can be rendered in any order).
(() => {
const PHYS = window.PHYS = {};
// Screened Coulomb attraction between an electron (−) and a nucleus (+): F = −k (1/r² + 1/(a r)) e^(−r/a) r̂.
// The atom's own electrons screen the nucleus, so a distant pass barely bends and a close pass swings hard.
const force = (x, y, cs) => {
  let fx = 0, fy = 0;
  for (const n of cs) {
    const dx = x - n.x, dy = y - n.y, r2 = dx * dx + dy * dy + n.soft * n.soft, r = Math.sqrt(r2);
    const f = -n.k * (1 / r2 + 1 / (n.a * r)) * Math.exp(-r / n.a);
    fx += f * dx / r; fy += f * dy / r;
  }
  return [fx, fy];
};
// o = {x, y, vx, vy, centers: [{x, y, k, a, soft}], T (s), emit: {frac, at: 'peri' | time, center index}, stopAt}
// returns {n, dt, X, Y, VX, VY, tEmit, iEmit, emitX, emitY, emitVx, emitVy, kept}
PHYS.coulomb = o => {
  const sub = 16, dtOut = 1 / 240, dt = dtOut / sub, n = Math.ceil(o.T / dtOut) + 1;
  const X = new Float32Array(n), Y = new Float32Array(n), VX = new Float32Array(n), VY = new Float32Array(n);
  let x = o.x, y = o.y, vx = o.vx, vy = o.vy, [ax, ay] = force(x, y, o.centers);
  let emitted = !o.emit, prevRad = -1, tEmit = null, iEmit = -1, emitX = 0, emitY = 0, emitVx = 0, emitVy = 0;
  const c0 = o.centers[o.emit?.center ?? 0];
  for (let i = 0; i < n; i++) {
    X[i] = x; Y[i] = y; VX[i] = vx; VY[i] = vy;
    for (let s = 0; s < sub; s++) {
      vx += ax * dt / 2; vy += ay * dt / 2; x += vx * dt; y += vy * dt;
      [ax, ay] = force(x, y, o.centers); vx += ax * dt / 2; vy += ay * dt / 2;
      if (!emitted) {
        const rad = (x - c0.x) * vx + (y - c0.y) * vy;               // radial velocity sign: − approaching, + leaving
        const tt = (i * sub + s + 1) * dt;
        if ((o.emit.at === 'peri' && prevRad < 0 && rad >= 0) || (typeof o.emit.at === 'number' && tt >= o.emit.at)) {
          emitted = true; tEmit = tt; iEmit = i; emitX = x; emitY = y; emitVx = vx; emitVy = vy;
          const k = Math.sqrt(Math.max(0, 1 - o.emit.frac)); vx *= k; vy *= k;   // the photon carries the energy away
        }
        prevRad = rad;
      }
    }
  }
  return { n, dt: dtOut, X, Y, VX, VY, tEmit, iEmit, emitX, emitY, emitVx, emitVy };
};
// sample a stored trajectory at time t (s from its start), linear interpolation
PHYS.at = (tr, t) => {
  const f = Math.max(0, Math.min(tr.n - 1.001, t / tr.dt)), i = Math.floor(f), q = f - i;
  return [tr.X[i] + (tr.X[i + 1] - tr.X[i]) * q, tr.Y[i] + (tr.Y[i + 1] - tr.Y[i]) * q, tr.VX[i] + (tr.VX[i + 1] - tr.VX[i]) * q, tr.VY[i] + (tr.VY[i + 1] - tr.VY[i]) * q];
};
// past positions for a trail: k samples spaced dtS seconds back from t
PHYS.trail = (tr, t, k = 10, dtS = 0.03, t0 = 0) => {
  const out = [];
  for (let j = 0; j < k; j++) { const tt = t - j * dtS; if (tt < t0) break; const p = PHYS.at(tr, tt); out.push([p[0], p[1]]); }
  return out;
};
// relativistic speed of an electron with kinetic energy E (keV), as a fraction of c
PHYS.beta = E => { const g = 1 + E / 511; return Math.sqrt(1 - 1 / (g * g)); };
// seeded random stream
PHYS.rng = seed => U.rng(seed);
})();
