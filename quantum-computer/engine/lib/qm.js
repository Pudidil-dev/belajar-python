// QM — the state vectors behind every quantum graphic. Amplitudes are complex numbers [re, im]; a gate in progress is
// the real rotation it is made of (a microwave pulse rotates the Bloch vector continuously), times the global phase that
// makes it equal the textbook matrix at the end, so the amplitudes on screen read exactly (|0⟩+|1⟩)/√2 and so on.
(() => {
const QM = window.QM = {};
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const sc = (a, k) => [a[0] * k, a[1] * k], conj = a => [a[0], -a[1]], abs2 = a => a[0] * a[0] + a[1] * a[1];
const cis = t => [Math.cos(t), Math.sin(t)];
QM.add = add; QM.mul = mul; QM.sc = sc; QM.conj = conj; QM.abs2 = abs2; QM.cis = cis;
QM.abs = a => Math.sqrt(abs2(a)); QM.arg = a => Math.atan2(a[1], a[0]);
QM.ket0 = () => [[1, 0], [0, 0]];
QM.ket1 = () => [[0, 0], [1, 0]];
// rotation by theta about unit axis n: U = cos(θ/2) I − i sin(θ/2) n·σ
QM.rot = (n, th) => {
  const c = Math.cos(th / 2), s = Math.sin(th / 2), [nx, ny, nz] = n;
  return [[[c, -s * nz], [-s * ny, -s * nx]], [[s * ny, -s * nx], [c, s * nz]]];
};
QM.apply = (U, psi) => [add(mul(U[0][0], psi[0]), mul(U[0][1], psi[1])), add(mul(U[1][0], psi[0]), mul(U[1][1], psi[1]))];
QM.phase = (psi, t) => psi.map(a => mul(a, cis(t)));
// gates as continuous rotations: s = 0..1 of the way through. H: π about (x+z)/√2; Z: π about z; X: π about x.
const AX = { H: [Math.SQRT1_2, 0, Math.SQRT1_2], Z: [0, 0, 1], X: [1, 0, 0], Y: [0, 1, 0] };
QM.gateU = (g, s) => { const U = QM.rot(AX[g], Math.PI * s), ph = cis(Math.PI / 2 * s); return U.map(r => r.map(e => mul(e, ph))); };
QM.gate = (g, psi, s = 1) => QM.apply(QM.gateU(g, s), psi);
// Bloch vector of a pure single-qubit state a|0⟩ + b|1⟩
QM.bloch = psi => { const [a, b] = psi, ab = mul(conj(a), b); return [2 * ab[0], 2 * ab[1], abs2(a) - abs2(b)]; };
// ---------- two qubits: amplitudes [ψ00, ψ01, ψ10, ψ11], first index = qubit A ----------
QM.ket00 = () => [[1, 0], [0, 0], [0, 0], [0, 0]];
QM.apply1 = (U, psi, q) => {
  const out = psi.map(a => [a[0], a[1]]);
  const pairs = q === 0 ? [[0, 2], [1, 3]] : [[0, 1], [2, 3]];
  for (const [i, j] of pairs) { const [a, b] = QM.apply(U, [psi[i], psi[j]]); out[i] = a; out[j] = b; }
  return out;
};
// CNOT (control A, target B) as a continuous operation: CNOT = I − 2P with P = |1⟩⟨1| ⊗ |−⟩⟨−|, so CNOT(s) = I + (e^{iπs} − 1)P
QM.cnot = (psi, s = 1) => {
  const m = sc(add(psi[2], sc(psi[3], -1)), Math.SQRT1_2), f = add(cis(Math.PI * s), [-1, 0]), fm = mul(f, m);
  const out = psi.map(a => [a[0], a[1]]);
  out[2] = add(out[2], sc(fm, Math.SQRT1_2)); out[3] = add(out[3], sc(fm, -Math.SQRT1_2));
  return out;
};
// Bloch vector of one qubit of a two-qubit state (partial trace): length < 1 when the qubits are entangled
QM.reduced = (psi, q) => {
  const idx = q === 0 ? [[0, 1], [2, 3]] : [[0, 2], [1, 3]];       // [states with this qubit = 0], [= 1], paired by the other qubit
  let r00 = 0, r11 = 0, r01 = [0, 0];
  for (let k = 0; k < 2; k++) { const a = psi[idx[0][k]], b = psi[idx[1][k]]; r00 += abs2(a); r11 += abs2(b); r01 = add(r01, mul(a, conj(b))); }
  return [2 * r01[0], -2 * r01[1], r00 - r11];
};
QM.norm = psi => Math.sqrt(psi.reduce((s, a) => s + abs2(a), 0));
})();
