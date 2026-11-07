// S25 TRANSMISSION CHANGES (96–100 s): pull back to tissue scale: two short stretches of artery side by side, plain blood
// (top) and blood with iodine (bottom). Equal streams of photons enter from the left. Some stop in both (small red marks),
// many more in the iodine path; two counters on the right fill unequally. Some photons still get through the enhanced path.
// The contrast does not glow and does not make the beam.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash, TAU = U.TAU;
const LANES = [{ y: 250, iod: false }, { y: 430, iod: true }], X0 = 60, X1 = 300, VPH = 150;
const PH = []; for (let k = 0; k < 44; k++) for (const [li, L] of LANES.entries()) {
  const te = 0.5 + k * 0.07, p = h(k * 2 + li, 3), stop = L.iod ? p < 0.55 : p < 0.12, xs = X0 + 20 + h(k * 2 + li, 4) * (X1 - X0 - 40);
  PH.push({ li, te, y: L.y + (h(k * 2 + li, 5) - 0.5) * 50, stop, xs });
}
const zAt = t => K.zl(2.2, 1, MO.cubicOut(clamp(t / 0.9)));
SC['s25_transmit'] = {
  draw(c, t, S) {
    const z = zAt(t);
    c.save(); c.translate(W / 2, 340); c.scale(z, z); c.translate(-W / 2, -340);
    for (const L of LANES) {
      PIX.flat(c, PIX.rectPath(X0 - 10, L.y - 40, X1 - X0 + 20, 80, 30), 'p1', 'p0', 'p2');
      PIX.rect(c, X0 - 10, L.y - 32, X1 - X0 + 20, 64, 'd0');
      for (let k = 0; k < 10; k++) { const x = X0 + K.wrap(h(k, L.y) * 260 + S.t * 30, 260) - 10, y = L.y + (h(k, L.y + 1) - 0.5) * 40; c.fillStyle = P.d3; c.beginPath(); c.ellipse(x, y, 9, 6, 0.4, 0, TAU); c.fill(); }
      if (L.iod) for (let k = 0; k < 18; k++) { const x = X0 + K.wrap(h(k, 91) * 260 + S.t * 30, 260) - 10, y = L.y + (h(k, 92) - 0.5) * 48; FLOW.mol(c, x * z + (1 - z) * W / 2 - 0, (y - 340) * z + 340, k + S.t, z); }
    }
    c.restore();
    for (const p of PH) {
      const age = t - p.te; if (age < 0) continue;
      const x = X0 - 40 + age * VPH;
      if (p.stop && x > p.xs) { const a2 = t - p.te - (p.xs - X0 + 40) / VPH; if (a2 < 0.5) { FX.flash(c, p.xs, p.y, 4 * (1 - a2 / 0.5), 'r2', 1 - a2 / 0.5); PIX.rect(c, Math.round(p.xs) - 1, Math.round(p.y) - 1, 3, 3, 'r1'); } continue; }
      if (x > X1 + 30) continue;
      FX.ph(c, x, p.y, 0, 6, 14, 3, 1);
    }
    // the counters: photons that got through, per lane
    for (const [li, L] of LANES.entries()) {
      const n = PH.filter(p => p.li === li && !p.stop && t - p.te > (X1 + 30 - X0 + 40) / VPH).length, tot = 44;
      const x = 316, y = L.y - 60, hgt = 120, f = n / tot;
      PIX.rect(c, x - 2, y - 2, 18, hgt + 4, 'k'); PIX.rect(c, x, y, 14, hgt, 'n2'); PIX.rect(c, x, y + Math.round(hgt * (1 - f)), 14, Math.round(hgt * f), 'y2'); PIX.rect(c, x, y + Math.round(hgt * (1 - f)), 14, 1, 'y4');
    }
    CAP.ctx(c, t, { text: 'YOD ZƏİFLƏMƏNİ ARTIRIR', t0: 0.5, t1: 3.6 });
  },
  cues: () => { const q = [[0, 'pull_back', 0.7, 0, 0.9], [0.5, 'type', 0.4]]; for (let k = 0; k < 22; k++) q.push([0.5 + 1.9 + k * 0.07 * 2, 'arrive_tick', k % 2 ? 0.25 : 0.4, 0.6, k]); for (let k = 0; k < 6; k++) q.push([1.0 + k * 0.35, 'stop_tick', 0.35, -0.2, k]); return q; },
  xin: 0.25,
};
})();
