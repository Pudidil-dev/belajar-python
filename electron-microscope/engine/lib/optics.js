// OPT — electron optics as diagrams. A round magnetic lens in section (iron yoke and pole pieces around a copper coil),
// its field crossing the pole-piece gap and bulging into the bore, and electron paths through it computed for a
// bell-shaped (Glaser) field: in the frame that turns with the electrons the paraxial ray obeys r'' = −K·b(z)²·r, while
// the frame itself turns by θ' = √K·b(z), so each electron spirals as it is focused. K ∝ (coil current)², so more
// current = shorter focus. The aberration diagram uses the same lens: a round lens bends outer rays too strongly
// (spherical aberration, always positive for round magnetic lenses); a multipole corrector gives those rays a
// compensating outward kick. The probe it makes is computed as a wave: ψ(r) = ∫ e^{−iχ(k)} J0(2πkr) 2πk dk over the
// aperture, χ = πλΔf k² + ½πCsλ³k⁴, at 200 kV (λ = 2.508 pm).
(() => {
const { P, W, H } = PIX;
const OPT = window.OPT = {};
const clamp = U.clamp;
const R = (c, x, y, w, hh, col) => { c.fillStyle = P[col] || col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(hh)); };

// ---------- lens section diagram: units are "lens units", outer half-width 100; screen = (cx + x·s, cy + y·s) ----------
OPT.GEO = { bore: 20, gapTip: 13, outer: 100, half: 58 };
OPT.lens = (c, cx, cy, s, o = {}) => {
  const hot = o.hot ?? 1, t = o.t ?? 0, G = OPT.GEO;
  const S = (x, y) => [cx + x * s, cy + y * s];
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (const sg of [-1, 1]) {
    const poly = (pts, col) => { c.fillStyle = P[col]; c.beginPath(); pts.forEach(([x, y], i) => { const [X, Y] = S(sg * x, y); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath(); c.fill(); };
    // iron yoke: outer wall, top and bottom plates, and the two pole pieces tapering to the gap
    poly([[90, -G.half], [100, -G.half], [100, G.half], [90, G.half]], 'g5');
    poly([[34, -G.half], [100, -G.half], [100, -G.half + 10], [34, -G.half + 10]], 'g5');
    poly([[34, G.half], [100, G.half], [100, G.half - 10], [34, G.half - 10]], 'g5');
    poly([[G.bore, -G.half], [40, -G.half], [40, -G.half + 12], [31, -G.gapTip - 4], [G.bore + 4, -G.gapTip], [G.bore, -G.gapTip]], 'g6');
    poly([[G.bore, G.half], [40, G.half], [40, G.half - 12], [31, G.gapTip + 4], [G.bore + 4, G.gapTip], [G.bore, G.gapTip]], 'g6');
    // hatching on the cut iron
    c.save(); c.globalAlpha = 0.5; c.strokeStyle = P.g4; c.lineWidth = 1;
    for (let k = -160; k < 160; k += 7) { const [x0, y0] = S(sg * 90, k * 0.4), [x1, y1] = S(sg * 100, k * 0.4 + 10 * sg); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    c.restore();
    // copper coil, its current shown as ⊙ (left: out of the page) and ⊗ (right: into the page)
    const [qx0, qy0] = S(sg > 0 ? 44 : -86, -42), cw = 42 * s, ch = 84 * s;
    R(c, qx0, qy0, cw, ch, hot > 0.5 ? 'u1' : 'u0');
    for (let k = 0; k < ch; k += 3) R(c, qx0, qy0 + k, cw, 1, hot > 0.5 ? 'u2' : 'u1');
    if (hot > 0.3) for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) {
      const x = qx0 + cw * (0.28 + 0.44 * i), y = qy0 + ch * (0.2 + 0.3 * j), r = Math.max(2.5, 4 * s);
      c.fillStyle = P.u3; c.beginPath(); c.arc(x, y, r, 0, U.TAU); c.fill(); c.fillStyle = P.u0; c.beginPath(); c.arc(x, y, r - 1, 0, U.TAU); c.fill();
      if (sg < 0) R(c, x - 1, y - 1, 2, 2, 'u3'); else { PIX.bline(c, x - r + 1.5, y - r + 1.5, x + r - 1.5, y + r - 1.5, 'u3'); PIX.bline(c, x - r + 1.5, y + r - 1.5, x + r - 1.5, y - r + 1.5, 'u3'); }
    }
  }
  c.restore();
};
// magnetic field lines (magenta): loops around each coil through the iron, and the gap field bulging into the bore
OPT.field = (c, cx, cy, s, k, t = 0) => {
  if (k <= 0) return;
  const G = OPT.GEO, S = (x, y) => [cx + x * s, cy + y * s];
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const line = (pts, col) => { let pv = null; for (const [x, y] of pts) { const [X, Y] = S(x, y); if (pv) PIX.bline(c, pv[0], pv[1], X, Y, col); pv = [X, Y]; } };
  for (const sg of [-1, 1]) {
    // gap field: from the upper pole tip to the lower one, bowing toward the axis (strongest near the tips)
    for (let j = 0; j < 4; j++) {
      const x0 = G.bore + 1 + j * 3, bulge = 9 - j * 1.5, pts = [];
      for (let q = 0; q <= 16; q++) { const y = U.lerp(-G.gapTip, G.gapTip, q / 16), u = y / G.gapTip; pts.push([sg * (x0 - bulge * (1 - u * u) * k), y]); }
      line(pts, j < 2 ? 'm3' : 'm2');
    }
    // loops through the iron around the coil
    for (let j = 0; j < 3; j++) {
      const a = 3 + j * 2.6, pts = [[34 + a, -G.half + a], [96 - a * 0.2, -G.half + a], [96 - a * 0.2, G.half - a], [34 + a, G.half - a], [28 + a * 0.3, G.gapTip + 6], [28 + a * 0.3, -G.gapTip - 6], [34 + a, -G.half + a]];
      c.save(); c.globalAlpha = 0.55 * k; line(pts.map(([x, y]) => [sg * x, y]), 'm1'); c.restore();
    }
  }
  // on the axis the field points along it: a few arrowheads drifting with the current
  c.save(); c.globalAlpha = k;
  for (let q = -1; q <= 1; q++) { const [X, Y] = S(0, q * 9 + K.wrap(t * 8, 9) - 4.5); PIX.bline(c, X - 2, Y - 2, X, Y, 'm4'); PIX.bline(c, X + 2, Y - 2, X, Y, 'm4'); }
  c.restore();
  c.restore();
};
// ---------- paraxial rays through the Glaser field, rotating frame ----------
// returns [{z, r, th}] from z0 to z1 (lens units), field half-width a, strength K
OPT.trace = (r0, K, a, z0 = -120, z1 = 140, n = 260) => {
  const b = z => 1 / (1 + (z / a) ** 2), dz = (z1 - z0) / n, out = [];
  let r = r0, v = 0, th = 0, z = z0;
  for (let i = 0; i <= n; i++) {
    out.push({ z, r, th });
    const f = (zz, rr) => -K * b(zz) ** 2 * rr;
    const k1v = f(z, r), k1r = v, k2v = f(z + dz / 2, r + k1r * dz / 2), k2r = v + k1v * dz / 2, k3v = f(z + dz / 2, r + k2r * dz / 2), k3r = v + k2v * dz / 2, k4v = f(z + dz, r + k3r * dz), k4r = v + k3v * dz;
    r += dz * (k1r + 2 * k2r + 2 * k3r + k4r) / 6; v += dz * (k1v + 2 * k2v + 2 * k3v + k4v) / 6;
    th += Math.sqrt(K) * (b(z) + b(z + dz)) / 2 * dz; z += dz;
  }
  return out;
};
// strength for a focus (axis crossing of a parallel ray) at zf, found by bisection
OPT.Kfor = (zf, a) => { let lo = 1e-6, hi = 1e-2; for (let i = 0; i < 50; i++) { const m = Math.sqrt(lo * hi), tr = OPT.trace(5, m, a), k = tr.findIndex(p => p.r < 0); const zc = k < 0 ? 1e9 : tr[k].z; if (zc > zf) lo = m; else hi = m; } return Math.sqrt(lo * hi); };


// ---------- the multipole corrector ----------
// side section of one multipole stage (screen px): pole tips around the bore, each with its coil; on = 0..1 glow
OPT.multipoleSide = (c, cx, cy, s, on = 0, t = 0) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (const sg of [-1, 1]) {
    R(c, sg > 0 ? cx + 66 * s : cx - 72 * s, cy - 22 * s, 6 * s, 44 * s, 'g5');                       // yoke ring (cut)
    for (let k = 0; k < 3; k++) {
      const y = cy + (k - 1) * 14 * s, x0 = sg > 0 ? cx + 18 * s : cx - 66 * s;
      R(c, x0, y - 2 * s, 48 * s, 4 * s, 'g6');                                                        // pole shaft
      const cw = 20 * s, cxx = sg > 0 ? cx + 34 * s : cx - 54 * s, glow = on * (0.6 + 0.4 * Math.sin(t * 7 + k + sg));
      R(c, cxx, y - 5 * s, cw, 10 * s, glow > 0.5 ? 'u2' : 'u1'); for (let q = 0; q < 10 * s; q += 2) R(c, cxx, y - 5 * s + q, cw, 1, glow > 0.5 ? 'u3' : 'u2');
      R(c, sg > 0 ? cx + 16 * s : cx - 18 * s, y - 3 * s, 2 * s, 6 * s, (k + (sg > 0 ? 1 : 0)) % 2 ? 'm3' : 'g9');   // pole tip
    }
  }
  c.restore();
};
// end view of a 12-pole element: alternating poles around the beam, its field pattern when on
OPT.multipoleEnd = (c, cx, cy, r, on = 0, t = 0) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = P.g3; c.beginPath(); c.arc(cx, cy, r + 4, 0, U.TAU); c.fill(); c.fillStyle = P.k; c.beginPath(); c.arc(cx, cy, r - 1, 0, U.TAU); c.fill();
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * U.TAU + 0.26, x = cx + Math.cos(a) * (r - 4), y = cy + Math.sin(a) * (r - 4);
    c.fillStyle = P[k % 2 ? 'm3' : 'g9']; c.beginPath(); c.arc(x, y, Math.max(1.5, r * 0.16), 0, U.TAU); c.fill();
    if (on > 0.2) { const b = cx + Math.cos(a) * (r - 4) * (0.55 - 0.1 * Math.sin(t * 6 + k)), d = cy + Math.sin(a) * (r - 4) * (0.55 - 0.1 * Math.sin(t * 6 + k)); PIX.bline(c, x, y, b, d, k % 2 ? 'm2' : 'g6'); }
  }
  R(c, cx - 1, cy - 1, 2, 2, 'c3');
  c.restore();
};
// ---------- rays through corrector + objective (screen px) ----------
// Parallel rays at heights h. In a real probe corrector, transfer lenses image the multipoles onto the objective, so
// the correction arrives at the objective without changing the ray heights; here that shows as an outward bulge of
// the outer rays inside the corrector (yA..yB) and a straight run to the lens plane yL. After the lens the slope is
// −h/f − csd·h³·(1 − k): spherical aberration bends outer rays too much, the corrector (k = 1) cancels it.
OPT.fan = (cx, hs, y0, yA, yB, yL, f, csd, k, y1) => hs.map(h => {
  const pts = [[cx + h, y0], [cx + h, yA]];
  for (let q = 1; q < 12; q++) { const u = q / 12, y = U.lerp(yA, yB, u); pts.push([cx + h + k * 520 * csd * h * Math.abs(h) * Math.sin(Math.PI * u) * Math.sign(h) * Math.abs(h) / 17, y]); }
  pts.push([cx + h, yB], [cx + h, yL]);
  const slope = -h / f - csd * h ** 3 * (1 - k);
  pts.push([cx + h + slope * (y1 - yL), y1]);
  return pts;
});
// ---------- the probe, as a wave ----------
function J0(x) {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const a1 = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456)))));
    const a2 = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y))));
    return a1 / a2;
  }
  const z = 8 / ax, y = z * z, xx = ax - 0.785398164;
  const b1 = 1 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
  const b2 = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)));
  return Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * b1 - z * Math.sin(xx) * b2);
}
OPT.LAMBDA = 0.002508;                                                        // nm at 200 kV
// radial intensity I(r) for r = 0 … rmax nm (n samples), unit total current
OPT.probe = (alphaMrad, CsMm, dfNm, rmax = 0.6, n = 240) => {
  const lam = OPT.LAMBDA, kmax = alphaMrad * 1e-3 / lam, Cs = CsMm * 1e6, NK = 600, I = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const r = j / (n - 1) * rmax; let re = 0, im = 0;
    for (let i = 0; i < NK; i++) {
      const k = (i + 0.5) / NK * kmax, chi = Math.PI * lam * dfNm * k * k + 0.5 * Math.PI * Cs * lam ** 3 * k ** 4, w = J0(U.TAU * k * r) * U.TAU * k * kmax / NK;
      re += Math.cos(chi) * w; im -= Math.sin(chi) * w;
    }
    I[j] = re * re + im * im;
  }
  let tot = 0; for (let j = 1; j < n; j++) { const r = j / (n - 1) * rmax; tot += I[j] * U.TAU * r * rmax / (n - 1); }
  for (let j = 0; j < n; j++) I[j] /= tot;
  const half = I[0] / 2; let fw = 0; for (let j = 0; j < n; j++) if (I[j] < half) { fw = 2 * j / (n - 1) * rmax; break; }
  return { I, rmax, n, fwhm: fw, peak: I[0] };
};
OPT.init = () => {
  OPT.AFTER = OPT.probe(18, 0.0, 0);                                          // corrected: Cs ≈ 0, 18 mrad → diffraction-limited, ~0.07 nm
  OPT.BEFORE = OPT.probe(10, 1.2, -Math.sqrt(1.2e6 * OPT.LAMBDA));             // uncorrected: Cs = 1.2 mm forces a 10 mrad aperture, Scherzer defocus
  console.log(`probe FWHM: before ${OPT.BEFORE.fwhm.toFixed(3)} nm, after ${OPT.AFTER.fwhm.toFixed(3)} nm`);
};
// heat map of a probe (screen px), s = px per nm, mix between two probes, normalised to `ref` peak with a soft gamma
OPT.HOT = ['k', 'r0', 'r1', 'r2', 'u2', 'y3', 'y4', 'w'].map(k => PIX.hex(P[k]));
OPT.heat = (c, cx, cy, s, A, B, mix, ref, o = {}) => {
  const img = c.getImageData(0, 0, W, H), d = img.data, Rm = Math.min(A.rmax, B.rmax), gam = o.gamma ?? 0.5;
  const x0 = Math.max(0, Math.floor(cx - Rm * s)), x1 = Math.min(W - 1, Math.ceil(cx + Rm * s)), y0 = Math.max(0, Math.floor(cy - Rm * s)), y1 = Math.min(H - 1, Math.ceil(cy + Rm * s));
  const at = (P_, r) => { const f = r / P_.rmax * (P_.n - 1), i = Math.floor(f); if (i >= P_.n - 1) return 0; return P_.I[i] * (1 - (f - i)) + P_.I[i + 1] * (f - i); };
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const r = Math.hypot(x - cx, y - cy) / s; if (r >= Rm) continue;
    const v = Math.pow(Math.max(0, U.lerp(at(A, r), at(B, r), mix) / ref), gam) * (OPT.HOT.length - 1) + (K.BAY(x, y) - 0.5) * 0.9;
    const k = Math.max(0, Math.min(OPT.HOT.length - 1, Math.round(v))); if (k === 0) continue;
    const p = OPT.HOT[k], i = (y * W + x) * 4; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
  }
  c.putImageData(img, 0, 0);
};
})();
