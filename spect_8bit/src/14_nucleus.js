'use strict';
// ============================================================================
// THE ATOMIC SCALE (panels 7 and 8): one sestamibi molecule (Tc at the centre
// of six MIBI ligands), the technetium atom's electron shells, and the Tc-99m
// nucleus: 43 orange protons and 56 blue neutrons packed in a ball (a teaching
// picture, not a real nuclear shape), beside its energy-level diagram.
// ============================================================================
// nucleon positions: a deterministic packed ball (golden-spiral shells)
const NUC = [];
(function packNucleus() {
  const shells = [[1, 0], [8, 0.85], [20, 1.7], [32, 2.55], [38, 3.35]];
  let idx = 0;
  for (const [n, r] of shells) for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996 + r;
    NUC.push({ x: Math.cos(a) * rr * r, y: y * r, z: Math.sin(a) * rr * r, p: 0 });
    idx++;
  }
  // 43 protons spread through the ball (deterministic shuffle)
  const order = NUC.map((q, i) => [hash(i + 1500), i]).sort((a, b) => a[0] - b[0]);
  for (let k = 0; k < 43; k++) NUC[order[k][1]].p = 1;
})();
function ballSprite(x, y, r, proton, excite) {
  const ramp = proton ? [P.PR5, P.PR4, P.PR3, P.PR2, P.PR1, P.PR0] : [P.NE4, P.NE3, P.NE2, P.NE1, P.NE0, P.NE0];
  const m = maskDisc(x, y, r);
  organShade(m, x, y, r, r, ramp, -0.55, -0.6);
  if (r > 4) { disc(x - r * 0.38, y - r * 0.4, Math.max(1, r * 0.2), ramp[0]); }
  mRim(m, ramp[5], -1, -1);
}
// the nucleus at (x, y), ball radius br (px), rotation rot, excitation glow ex (0..1)
function drawNucleus(x, y, br, rot, t, o) {
  o = o || {};
  const ca = Math.cos(rot), sa = Math.sin(rot), cb = Math.cos(0.35), sb = Math.sin(0.35);
  const items = NUC.map(q => { const x1 = q.x * ca + q.z * sa, z1 = -q.x * sa + q.z * ca, y1 = q.y * cb - z1 * sb, z2 = q.y * sb + z1 * cb; return [x1, y1, z2, q.p]; }).sort((a, b) => a[2] - b[2]);
  const R = br * 3.9;
  if (o.ex > 0) { disc(x, y, R * 1.35, P.GA1, 0.18 * o.ex); disc(x, y, R * 1.18, P.GA2, 0.22 * o.ex * (0.7 + 0.3 * Math.sin(t * 9))); }
  const jig = o.jig === undefined ? 0.06 : o.jig;
  for (const [nx, ny, nz, p] of items) {
    const j = jig * Math.sin(t * 11 + nx * 5 + ny * 3);
    ballSprite(x + (nx + j) * br * 1.02, y + (ny - j) * br * 1.02, br * (0.92 + 0.08 * (nz / 3.4)), p, o.ex);
  }
}
// energy-level diagram (panel 7): the metastable level, the lower level, the ~140 keV drop.
// x: left end of the level bars, y: upper level, h: gap; k: 0 before .. 1 transition done (>1 after)
function levelDiagram(x, y, h, k, t, o) {
  o = o || {};
  const w = 70, yU = y, yL = y + h, done = k >= 1;
  for (const [yy, act] of [[yU, !done], [yL, done]]) {
    rect(x, yy - 2, x + w, yy + 3, act ? P.XR5 : P.XR4); rect(x, yy - 2, x + w, yy - 1, P.XR6); rect(x, yy + 2, x + w, yy + 3, P.XR3);
  }
  text(FC, 'Tc-99m', x + w + 8, yU - 10, { sc: 2, c: done ? P.SUB : P.YEL, ol: P.SH });
  text(FS, 'METASTABLE', x + w + 8, yU + 10, { sc: 2, c: P.SUB, ol: P.SH });
  text(FC, 'Tc-99', x + w + 8, yL - 10, { sc: 2, c: done ? P.INK : P.SUB, ol: P.SH });
  text(FS, 'LOWER STATE', x + w + 8, yL + 10, { sc: 2, c: P.SUB, ol: P.SH });
  const ax = x + w / 2;
  if (k > 0) {
    const yy = lerp(yU + 5, yL - 8, clamp(k, 0, 1));
    lineW(ax, yU + 4, ax, yy, 4, P.GA2); line(ax, yU + 4, ax, yy, P.GA4);
    arrowHead(ax, yy + 2, Math.PI / 2, 9, P.GA3);
    if (done) text(FC, '~140 keV', ax - 8, (yU + yL) / 2 - 8, { sc: 2, c: P.YEL, ol: P.SH, align: 'right', n: o.n });
  }
  const sy = done ? yL : yU; disc(ax, sy, 5, done ? P.XR6 : P.GA3); if (!done) glow(ax, sy, 13, P.GA1, P.GA2, 0.5 + 0.5 * Math.sin(t * 8));
}
// the sestamibi molecule: Tc centre + six isonitrile ligands (octahedral), slowly turning
function drawSestamibi(x, y, s, rot, t, tcMax) {
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const ca = Math.cos(rot), sa = Math.sin(rot), cb = Math.cos(0.5), sb = Math.sin(0.5);
  const P3 = v => { const x1 = v[0] * ca + v[2] * sa, z1 = -v[0] * sa + v[2] * ca, y1 = v[1] * cb - z1 * sb, z2 = v[1] * sb + z1 * cb; return [x1, y1, z2]; };
  const atoms = [];
  for (const d of dirs) {
    const chain = [[1.0, 'C'], [1.7, 'N'], [2.6, 'C'], [3.3, 'C'], [3.9, 'O'], [4.6, 'C']];
    chain.forEach(([r, el], i) => { const bend = i > 2 ? 0.35 * (i - 2) : 0; const v = [d[0] * r + d[1] * bend * 0.5, d[1] * r + d[2] * bend * 0.5, d[2] * r + d[0] * bend * 0.5]; atoms.push([P3(v), el]); });
  }
  atoms.push([[0, 0, 0], 'Tc']);
  atoms.sort((a, b) => a[0][2] - b[0][2]);
  for (const [[ax, ay, az], el] of atoms) {
    const px = x + ax * s, py = y + ay * s, r = (el === 'Tc' ? 0.72 : el === 'O' ? 0.4 : 0.36) * s * (1 + 0.06 * az);
    if (el === 'Tc') { const rr = Math.min(r * 0.9, tcMax === undefined ? 1e9 : tcMax); if (rr > 0.5) tracerDot(px, py, rr, 0.8 + 0.2 * Math.sin(t * 6), false); continue; }
    const ramp = el === 'N' ? [P.NE4, P.NE3, P.NE2, P.NE1, P.NE0, P.NE0] : el === 'O' ? [P.HT6, P.HT5, P.HT4, P.HT3, P.HT2, P.HT1] : [P.PM5, P.PM4, P.PM3, P.PM2, P.PM1, P.PM0];
    const m = maskDisc(px, py, r); organShade(m, px, py, r, r, ramp); mRim(m, ramp[5], -1, -1);
  }
}
// the technetium atom: electron shells around a bright nucleus
function drawAtomShells(x, y, R, t, k) {
  for (let s = 1; s <= 5; s++) { const r = R * s / 5; ring(x, y, r, 1, P.EL1, 0.55 * k); const n = [2, 8, 18, 14, 1][s - 1]; for (let e = 0; e < Math.min(n, 12); e++) { const a = e * TAU / Math.min(n, 12) + t * (1.4 / s) + s; disc(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.max(1, R * 0.012 + 1), P.EL2, k); } }
}
