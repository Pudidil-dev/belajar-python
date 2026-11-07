// ATOM — the schematic atoms and molecules of S21–S25 and S41 (not to scale: a real nucleus would be ~1/100,000 of its
// atom). Nuclei are compact magenta; electrons cyan dots on their shells; X-ray photons yellow wave packets.
//   ATOM.molecule  an iodinated contrast molecule: a six-carbon ring carrying three iodine atoms (violet, each marked
//                  with a white "I") and three side chains — the shape of the common tri-iodinated agents, simplified
//   ATOM.iodine    an iodine atom, Z = 53: magenta nucleus, five shells with 2, 8, 18, 18, 7 electrons over a soft
//                  electron-density haze; o.vacancy hides one K electron (the hole blinks), o.skipK for an ejected one
//   ATOM.water     a water molecule (oxygen with two hydrogens) with one outer electron marked
(() => {
const { W, H, P } = PIX;
const ATOM = window.ATOM = { NAME: 'ATOM' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, h = U.hash;
const SHELL_N = [2, 8, 18, 18, 7], SHELL_R = [0.17, 0.33, 0.52, 0.73, 0.95];
ATOM.SHELL_R = SHELL_R;
// screen position of electron j of shell s (angle advances slowly; inner shells faster)
ATOM.eAt = (x, y, R, s, j, t) => { const n = SHELL_N[s], an = j / n * TAU + t * (0.9 - s * 0.14) * (s % 2 ? -1 : 1) + s * 0.7; return [x + Math.cos(an) * R * SHELL_R[s], y + Math.sin(an) * R * SHELL_R[s] * 0.96]; };
ATOM.iodine = (c, x, y, R, t, o = {}) => {
  // density haze (dithered, faint), shell rings, electrons, the nucleus
  const img = K.pbegin(c);
  FX.cloud(img, x, y, R * 1.02, t, { gain: 0.55, seed: 53, ramp: 'd', shells: SHELL_R.map((r, i) => [r, 0.05 + i * 0.012, 0.9 - i * 0.12]), grain: 0.4, hole: o.hole });
  K.pend(c, img);
  for (let s = 0; s < 5; s++) FX.ring(c, x, y, R * SHELL_R[s], s === 0 && o.kHi ? 'c2' : 'n4', s === 0 && o.kHi ? 1 : 0.9);
  for (let s = 0; s < 5; s++) for (let j = 0; j < SHELL_N[s]; j++) {
    const [ex, ey] = ATOM.eAt(x, y, R, s, j, t);
    if (s === 0 && j === 0 && (o.vacancy || o.skipK)) {
      if (o.vacancy && Math.floor(t * 4) % 2 === 0) { FX.ring(c, ex, ey, 3.5, 'w', 1); }
      continue;
    }
    FX.e(c, ex, ey, R > 120 ? 2 : 1, 1);
  }
  FX.nuc(c, x, y, Math.max(3, R * 0.09), 53, 1);
};
// an iodinated contrast molecule centred at (x, y), ring radius r (px), rotation rot; o.sel: index of the selected iodine
ATOM.IOD = [0, 2, 4];
ATOM.molPos = (x, y, r, rot) => {
  const ring = [], io = [], side = [];
  for (let k = 0; k < 6; k++) { const an = rot + k * TAU / 6 - Math.PI / 2; ring.push([x + Math.cos(an) * r, y + Math.sin(an) * r]); (k % 2 === 0 ? io : side).push([x + Math.cos(an) * r * 2.05, y + Math.sin(an) * r * 2.05, an]); }
  return { ring, io, side };
};
ATOM.molecule = (c, x, y, r, rot, t, o = {}) => {
  const { ring, io, side } = ATOM.molPos(x, y, r, rot);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const lw = Math.max(1, r * 0.16);
  // side chains (amide groups as short zig-zags of small slate atoms)
  for (const [sx, sy, an] of side) {
    const b = [x + Math.cos(an) * r, y + Math.sin(an) * r];
    let px = b[0], py = b[1];
    for (let k = 1; k <= 3; k++) { const a2 = an + (k % 2 ? 0.5 : -0.5), nx = px + Math.cos(a2) * r * 0.75, ny = py + Math.sin(a2) * r * 0.75; PIX.line(c, px, py, nx, ny, 'g5', lw * 0.8); px = nx; py = ny; PIX.circ(c, px, py, r * 0.2, k === 2 ? 'b3' : 'g6'); }
  }
  // the ring bonds (alternating double bonds) and carbons
  for (let k = 0; k < 6; k++) { const a = ring[k], b = ring[(k + 1) % 6]; PIX.line(c, a[0], a[1], b[0], b[1], 'g6', lw); if (k % 2 === 0) { const mx = (a[0] + b[0]) / 2 - x, my = (a[1] + b[1]) / 2 - y, l = Math.hypot(mx, my) || 1; PIX.line(c, a[0] - mx / l * r * 0.2, a[1] - my / l * r * 0.2, b[0] - mx / l * r * 0.2, b[1] - my / l * r * 0.2, 'g4', lw * 0.6); } }
  for (const [px, py] of ring) PIX.circ(c, px, py, r * 0.22, 'g7');
  // the iodine atoms: big violet spheres with a white "I"
  io.forEach(([ix, iy], k) => {
    const b = [x + (ix - x) / 2.05, y + (iy - y) / 2.05];
    PIX.line(c, b[0], b[1], ix, iy, 'g6', lw);
    const rr = r * 0.62;
    K.ball(c, ix, iy, rr, 'v2', 'v1', 'v3');
    if (rr > 5) PIX.text(c, 'I', ix, iy - 3.5 * Math.max(1, Math.round(rr / 9)), 'w', { sc: Math.max(1, Math.round(rr / 9)), align: 'center', shadow: 'v0' });
    if (o.sel === k) { FX.ring(c, ix, iy, rr + 5, 'c4', 1); FX.ring(c, ix, iy, rr + 6, 'c2', 0.7); }
  });
  c.restore();
  return { ring, io, side };
};
ATOM.water = (c, x, y, R, t, o = {}) => {
  const img = K.pbegin(c);
  FX.cloud(img, x, y, R, t, { gain: 0.75, seed: 8, ramp: 'd', grain: 0.45 });
  for (const s of [-1, 1]) FX.cloud(img, x + s * Math.sin(0.91) * R * 0.95, y + Math.cos(0.91) * R * 0.95, R * 0.42, t, { gain: 0.7, seed: 9 + s, ramp: 'd', grain: 0.5 });
  K.pend(c, img);
  FX.nuc(c, x, y, Math.max(3, R * 0.09), 8, 1);
  for (const s of [-1, 1]) FX.nuc(c, x + s * Math.sin(0.91) * R * 0.95, y + Math.cos(0.91) * R * 0.95, 2, 1, 1);
};
})();
