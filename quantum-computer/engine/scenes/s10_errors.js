// S10 QUANTUM ERROR CORRECTION (109–116 s): where the errors come from, and what is done about them. A qubit in
// superposition is nudged by its environment — stray fields, heat, material defects: its phase drifts (T₂, every copy
// of the experiment drifts differently, so the phase information blurs out) and it leaks energy back to |0⟩ (T₁),
// within about 100 µs. Error correction spreads one logical qubit over many physical ones: on the chip's 5 × 5 grid,
// 13 data qubits and 12 measure qubits form a distance-3 surface code. Every cycle the measure qubits check their
// neighbours' parities; an error lights up the checks around it (the syndrome), so it can be located and undone.
// Errors still happen and correction can fail: the logical error rate becomes lower, not zero.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, h = U.hash, TAU = U.TAU;
const S9 = window.S09, MM = FR.FS / 10, C0 = FR.toRoom(0, FR.PKG.y + FR.PKG.h / 2);
const room = (x, y) => [C0[0] + x * MM, C0[1] + y * MM];
const anchor = (A, sx, sy, zmm) => { const z = zmm / MM; return { x: A[0] - (sx - W / 2) / z, y: A[1] - (sy - H / 2) / z, z }; };
const CC = [0, 0.35], ZG = 40, T2 = 3.0;                             // chip centre (mm), grid zoom, start of part 2
// ---------- part 1: one qubit and its environment ----------
const SPH = { cx: 135, cy: 236, R: 74 };
const NG = 9;                                                        // copies of the same experiment (ghosts)
const KICKS = []; for (let k = 0; k < 60; k++) KICKS.push({ t: 0.5 + h(k, 3) * 2.3, g: h(k, 4) < 0.6 ? Math.floor(h(k, 5) * NG) : -1, d: (h(k, 6) - 0.5) * 0.9, a: h(k, 7) * TAU });
const phiOf = (g, t) => { let p = 0; for (const q of KICKS) if (q.t < t && (q.g === g || q.g === -1)) p += q.d * (q.g === -1 ? 0.35 : 1) * (1 + 0.25 * Math.sin(g * 3.1 + q.t * 7)); return p + (g - (NG - 1) / 2) * 0.09 * clamp((t - 0.6) / 1.6); };
const thOf = t => Math.PI / 2 - 1.05 * io(clamp((t - 1.7) / 1.25));  // relaxation toward |0⟩ (north pole)
const vecOf = (g, t) => { const th = thOf(t), p = phiOf(g, t); return [Math.sin(th) * Math.cos(p), Math.sin(th) * Math.sin(p), Math.cos(th)]; };
function part1(c, t) {
  const pop = MO.backOut(K.lin(t, 0.2, 0.55), 1.5), sh = t < T2 ? 1 : 1 - io(clamp((t - T2) / 0.5));
  if (pop * sh <= 0.02) return;
  const R = SPH.R * pop * sh + 9 * (1 - sh), cx = SPH.cx, cy = lerp(SPH.cy, 240, 1 - sh);
  const o = { cx, cy, R, az: 0.35 + 0.1 * t, el: 0.5, vec: vecOf(0, t), glow: true };
  // the environment: hits arriving from every side (red), each one a small random kick
  for (const q of KICKS) {
    const dt = t - q.t + 0.25; if (dt < 0 || dt > 0.3 || t > T2) continue;
    const r0 = R * 1.9 - dt / 0.25 * R * 0.9, x = cx + Math.cos(q.a) * r0, y = cy + Math.sin(q.a) * r0;
    if (dt < 0.25) { PIX.rect(c, Math.round(x), Math.round(y), 2, 2, 'r2'); PIX.rect(c, Math.round(x + Math.cos(q.a) * 4), Math.round(y + Math.sin(q.a) * 4), 1, 1, 'r1'); }
    else FX.flash(c, cx + Math.cos(q.a) * R, cy + Math.sin(q.a) * R, 3, 'r2');
  }
  BL.sphere(c, o);
  // the other copies of the experiment, each drifting its own way
  if (t > 0.6 && sh > 0.5) for (let g = 1; g < NG; g++) { const [x0, y0] = BL.proj(o, [0, 0, 0]), [x1, y1, d] = BL.proj(o, vecOf(g, t)); PIX.bline(c, x0, y0, x1, y1, d > 0.2 ? 'p0' : 'p1', 1); PIX.rect(c, Math.round(x1), Math.round(y1), 1, 1, 'p2'); }
  // energy leaving as a photon (relaxation)
  for (const [t0, an] of [[1.95, -0.7], [2.45, 2.6]]) { const dt = t - t0; if (dt > 0 && dt < 0.7 && t < T2) FX.ph(c, cx + Math.cos(an) * (R + dt * 120), cy + Math.sin(an) * (R + dt * 120), an, 5, 10, 2.5, 1 - dt / 0.7, ['o0', 'o1', 'o2', 'y4']); }
}
// ---------- part 2: a distance-3 surface code on the 5 × 5 chip ----------
const DATA = (i, j) => (i + j) % 2 === 0, ZTYPE = (i, j) => i % 2 === 1 && j % 2 === 0;   // Z checks catch bit flips, X checks phase flips
const CYC = [3.75, 4.25, 4.75, 5.25, 5.75, 6.25, 6.75];
const ERR = [{ i: 2, j: 2, t: 4.05, k: 'X', checks: [[1, 2], [3, 2]] }, { i: 3, j: 3, t: 5.05, k: 'Z', checks: [[2, 3], [4, 3]] }];
const camAt = t => anchor(room(...CC), 135, 240, ZG * (1 + 0.1 * io(clamp((t - 3.6) / 3.4))));   // a slow push on the patch
// the code's look on the chip (for any camera): data qubits as purple diamonds, measure qubits as checks, k = size 0..1
function markers(c, cam, k = 1, blink = false, hitAt = null) {
  for (const q of CH.Q) {
    const [x, y] = K.S(cam, ...room(q.x, q.y)), X = Math.round(x), Y = Math.round(y);
    if (DATA(q.i, q.j)) {
      FX.glowL(c, x, y, 15 * k, ['p1', 'p2'], 1.1, 1.2);
      const r = Math.round(4 * k); for (let d = -r; d <= r; d++) { const w = r - Math.abs(d); PIX.rect(c, X - w, Y + d, 2 * w + 1, 1, Math.abs(d) === r || w === 0 ? 'p1' : 'p2'); }
      if (k > 0.5) { PIX.rect(c, X - 1, Y - 1, 3, 3, 'p3'); PIX.rect(c, X, Y, 1, 1, 'w'); }
    } else {
      const hit = hitAt && hitAt(q), col = ZTYPE(q.i, q.j) ? 'c2' : 'o2', s = Math.round(4 * k);
      if (s < 1) { PIX.rect(c, X, Y, 1, 1, col); continue; }
      PIX.rect(c, X - s, Y - s, 2 * s + 1, 2 * s + 1, hit ? 'r2' : blink ? 'w' : col); PIX.rect(c, X - s + 1, Y - s + 1, 2 * s - 1, 2 * s - 1, hit ? 'r1' : 'k');
      if (hit) FX.glowL(c, x, y, 12, ['r0', 'r1', 'r2'], 0.9, 1.3);
    }
  }
}
function outline(c, cam, g) {
  const [x0, y0] = K.S(cam, ...room(CH.q(0, 0).x, CH.q(0, 0).y)), [x1, y1] = K.S(cam, ...room(CH.q(4, 4).x, CH.q(4, 4).y)), m = 14 * cam.z * MM / ZG;
  const L = Math.round(2 * ((x1 - x0) + (y1 - y0) + 4 * m) * g); let k = 0;
  const dot = (px, py) => { if (k++ < L && k % 2) PIX.rect(c, px, py, 1, 1, 'p3'); };
  for (let px = x0 - m; px <= x1 + m; px++) dot(Math.round(px), Math.round(y0 - m)); for (let py = y0 - m; py <= y1 + m; py++) dot(Math.round(x1 + m), Math.round(py));
  for (let px = x1 + m; px >= x0 - m; px--) dot(Math.round(px), Math.round(y1 + m)); for (let py = y1 + m; py >= y0 - m; py--) dot(Math.round(x0 - m), Math.round(py));
}
window.S10 = { camAt, CC, ZG, DATA, markers, outline };
function part2(c, t) {
  const a = io(clamp((t - (T2 - 0.1)) / 0.5)); if (a <= 0) return;
  const cam = camAt(t), zmm = cam.z * MM, S_ = q => K.S(cam, ...room(q.x, q.y));
  const chipLayer = cc => { FR.chipView(cc, cam, t + 109, {}); FX.fadeBelow(cc, 372, 400, 0.7); };
  if (a < 1) window.dissolve(c, () => {}, chipLayer, a); else chipLayer(c);
  if (a < 0.6) return;
  const lastCyc = CYC.filter(x => x <= t).pop() ?? -1, blink = lastCyc > 0 && t - lastCyc < 0.12;
  markers(c, cam, 1, blink, q => ERR.some(e => t >= e.t + 0.2 && t < e.t + 0.7 && e.checks.some(([i, j]) => i === q.i && j === q.j)));
  // errors: a red hit on a data qubit, the syndrome around it, then located (ring) and undone (green)
  for (const e of ERR) {
    const [x, y] = S_(CH.q(e.i, e.j)), dt = t - e.t;
    if (dt > 0 && dt < 0.2) { FX.flash(c, x, y, 7, 'r2'); }
    if (dt > 0 && dt < 0.7) { PIX.text(c, e.k, x + 9, y - 14, 'r2'); FX.glowL(c, x, y, 12, ['r0', 'r1', 'r2'], 0.8, 1.3); }
    if (dt > 0.45 && dt < 0.95) { const r = 10; for (let k = 0; k < 32; k++) { const an = k / 32 * TAU; PIX.rect(c, Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r), 1, 1, 'y3'); } }
    if (dt > 0.7 && dt < 1.0) FX.glowL(c, x, y, 12, ['e0', 'e1', 'e2'], 1 - (dt - 0.7) / 0.3, 1.3);
  }
  // one logical qubit
  if (t > 6.0) outline(c, cam, MO.cubicOut(clamp((t - 6.0) / 0.35)));
  const [dx, dy] = S_(CH.q(0, 0)), [mx, my] = S_(CH.q(1, 0));
  CAP.note(c, t, { ax: dx, ay: dy - 6, x: 12, y: 64, text: 'DATA QUBITS', t0: 3.55, t1: 5.9, col: 'p3', box: true });
  CAP.note(c, t, { ax: mx + 3, ay: my - 6, x: 258, y: 64, text: 'MEASURE QUBITS', t0: 3.7, t1: 5.9, col: 'c3', align: 'right', box: true });
  CAP.note(c, t, { x: 135, y: 378, text: 'SYNDROME: CHECKS AROUND THE ERROR', t0: 4.3, t1: 5.9, align: 'center', col: 'r2', box: true });
  CAP.note(c, t, { x: 135, y: 64, text: 'ONE LOGICAL QUBIT', t0: 6.05, align: 'center', col: 'p3', box: true });
  CAP.note(c, t, { x: 135, y: 392, text: 'LOGICAL ERRORS: RARER, NOT ZERO', t0: 6.2, align: 'center', col: 'w', box: true });
}
SC['s10_errors'] = {
  draw(c, t, S) {
    part2(c, t);
    part1(c, t);
    if (t < 0.45) window.shifted(c, S9.overlay, -300 * MO.cubicIn(t / 0.45));
    CAP.note(c, t, { x: 135, y: 64, text: 'ENVIRONMENT: HEAT · STRAY FIELDS · DEFECTS', t0: 0.5, t1: 2.8, align: 'center', col: 'r2', box: true });
    CAP.note(c, t, { x: 135, y: 340, text: 'PHASE DRIFTS · T₂', t0: 0.9, t1: 1.75, align: 'center', col: 'p3', box: true });
    CAP.note(c, t, { x: 135, y: 340, text: 'ENERGY LEAKS OUT · T₁', t0: 1.85, t1: 2.85, align: 'center', col: 'o2', box: true });
    CAP.note(c, t, { x: 135, y: 354, text: 'WITHIN ≈ 100 µs', t0: 2.0, t1: 2.85, align: 'center', col: 'd8', box: true });
    CAP.scene(c, t, { title: 'QUANTUM ERROR CORRECTION', t0: 0.15, acc: 'r2' });
  },
  cues: () => {
    const q = [[0, 'whoosh', 0.6, 0], [0.15, 'type', 0.4], [0.2, 'pop', 0.7, 0], [0.5, 'noise', 0.8, 0, 2.4]];
    for (let k = 0; k < 60; k += 6) q.push([Math.round(KICKS[k].t * 8) / 8, 'kick', 0.4, Math.cos(KICKS[k].a) * 0.7]);
    q.push([1.95, 'decay', 0.7, 0.4], [2.45, 'decay', 0.6, -0.4], [T2, 'swish', 0.6, 0], [3.55, 'type', 0.3]);
    for (const c of CYC) q.push([c, 'cycle', 0.45, 0]);
    for (const e of ERR) q.push([e.t, 'error', 0.9, 0], [e.t + 0.2, 'syndrome', 0.8, 0], [e.t + 0.7, 'fix', 0.8, 0]);
    q.push([6.0, 'logical', 0.9, 0], [6.2, 'type', 0.3]);
    return q;
  },
};
})();
