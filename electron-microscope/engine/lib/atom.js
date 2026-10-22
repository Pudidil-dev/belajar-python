// ATOM — one atom as the beam sees it, and electrons scattering off it. The atom: a tiny positive nucleus (+Z) inside
// its electron cloud (density with shell structure). What a passing fast electron feels is the atom's electrostatic
// potential: the nucleus's pull, screened by the cloud — V(r) ∝ −Z·e^{−r/a}/r with a screening length
// a ≈ 0.885·a₀·Z^{−1/3}. Trajectories are integrated in that potential (attractive: an electron passing on the right is
// pulled across to the left). Far passes are barely deflected; only electrons that pass close to the nucleus swing out
// to large angles — and the heavier the nucleus (gold, Z = 79, vs carbon, Z = 6), the more of them do.
// Drawn with exaggerated angles and a stretched screening length so the geometry is visible (real HAADF angles are
// 70–200 mrad, from electrons passing within a few picometres of the nucleus).
(() => {
const { P, W, H } = PIX;
const ATOM = window.ATOM = {};
const clamp = U.clamp;
// Z-dependent display parameters (screen px): screening length and coupling
ATOM.par = Z => ({ a: 14 * Math.pow(79 / Z, 1 / 3) * 0.62 + 5, k: Z });
// integrate one electron: start above the atom at lateral offset b, moving down; returns points and exit angle
ATOM.path = (b, Z, kappa, o = {}) => {
  const { a } = ATOM.par(Z), y0 = o.y0 ?? -230, y1 = o.y1 ?? 330, dt = 0.25, v0 = 3.2, out = [];
  let x = b, y = y0, vx = (o.slope ?? 0) * v0, vy = v0, n = 0;
  while (y < y1 && Math.hypot(x, y) < 520 && n < 6000) {
    const r = Math.max(1.2, Math.hypot(x, y)), f = kappa * Z * (1 / (r * r) + 1 / (a * r)) * Math.exp(-r / a);
    vx -= f * x / r * dt; vy -= f * y / r * dt;
    const sp = Math.hypot(vx, vy); vx *= v0 / sp; vy *= v0 / sp;                // fast electrons: speed ≈ unchanged
    x += vx * dt; y += vy * dt; n++;
    if (n % 4 === 0) out.push([x, y]);
  }
  out.push([x, y]);
  return { pts: out, ang: Math.atan2(vx, vy) };
};
// coupling such that an electron passing gold at b = 10 px leaves at ~30°
ATOM.KAPPA = (() => { let lo = 1e-4, hi = 10; for (let i = 0; i < 40; i++) { const m = Math.sqrt(lo * hi), a = Math.abs(ATOM.path(10, 79, m).ang); if (a < 0.52) lo = m; else hi = m; } return Math.sqrt(lo * hi); })();
// the atom (screen px): r = cloud radius, Z for labels and the nucleus size; o: {pot (equipotential rings 0..1), t}
const SHELLS = { 79: [[0.06, 0.04, 1.0], [0.16, 0.06, 0.9], [0.3, 0.08, 0.8], [0.5, 0.1, 0.65], [0.72, 0.12, 0.45], [0.92, 0.1, 0.22]], 6: [[0.22, 0.1, 0.9], [0.75, 0.22, 0.55]] };
ATOM.draw = (c, cx, cy, r, Z, o = {}) => {
  const t = o.t ?? 0, gold = Z > 20;
  // the cloud: a dithered density, shell by shell
  const img = K.pbegin(c);
  FX.cloud(img, cx, cy, r, t, { shells: SHELLS[gold ? 79 : 6], ramp: gold ? 'y' : 'd', gain: gold ? 1.0 : 0.9, shimmer: 0.6 });
  K.pend(c, img);
  // equipotential rings of the screened potential (denser toward the nucleus)
  if ((o.pot ?? 0) > 0) {
    const { a } = ATOM.par(Z);
    c.save(); c.globalAlpha = o.pot;
    for (const V of [0.6, 1.2, 2.4, 4.8]) {
      let lo = 1, hi = 200; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, v = Z / 79 * 40 * Math.exp(-m / a) / m; if (v > V / 10) lo = m; else hi = m; }
      const rr = (lo + hi) / 2; if (rr < 2) continue;
      const n = Math.max(24, Math.round(rr * 2.4));
      for (let q = 0; q < n; q++) { if (q % 3 === 2) continue; const an = q / n * U.TAU + t * 0.2; PIX.rect(c, Math.round(cx + Math.cos(an) * rr), Math.round(cy + Math.sin(an) * rr), 1, 1, 'r2'); }
    }
    c.restore();
  }
  // nucleus: a tiny bright core with a red halo
  FX.glowL(c, cx, cy, gold ? 7 : 4, ['r1', 'r2', 'r3'], 0.9);
  PIX.rect(c, Math.round(cx) - 1, Math.round(cy) - 1, gold ? 3 : 2, gold ? 3 : 2, 'w');
};
// electrons arriving one by one (deterministic): impact parameters from the probe (Gaussian, σ px), times from rate
ATOM.events = (n, sigma, seed, t0, gap) => {
  const r = U.rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const u = Math.max(1e-9, r()), v = r(), b = Math.sqrt(-2 * Math.log(u)) * Math.cos(U.TAU * v) * sigma;
    out.push({ t: t0 + i * gap * (0.7 + 0.6 * r()), b });
  }
  return out;
};
})();
