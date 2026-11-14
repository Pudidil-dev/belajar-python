// S31 DIFFERENT ANGLES (120–124 s): the axial schematic again, now with contrast in the arteries (violet). The tube and
// detector stop at six angles; at each one the transmission profile measured across the detector drops out behind the
// arc (pale blue) — a different shadow of the same head from every direction. One tick per angle.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const ANG = [0, 1, 2, 3, 4, 5].map(k => k * TAU / 6 + 0.3), TT = [0.35, 0.9, 1.45, 2.0, 2.55, 3.1];
const betaAt = t => { let k = 0; while (k < 5 && t > TT[k + 1] - 0.2) k++; const q = k < 5 ? MO.cubicInOut(clamp((t - (TT[k + 1] - 0.45)) / 0.25)) : 0; return lerp(ANG[k], ANG[Math.min(5, k + 1)], q); };
const V2 = PIX.hex(PIX.P.v2), V1 = PIX.hex(PIX.P.v1);
SC['s31_angles'] = {
  draw(c, t, S) {
    const o = AXI.O, beta = betaAt(t);
    AXI.ring(c, o, 1);
    AXI.head(c, o, { c8: V2, c8b: V1 });
    // the profiles already measured: ghost tubes and their curves
    TT.forEach((tt, k) => {
      if (t < tt) return;
      const b = ANG[k], p = AXI.profile(b), a = k === TT.filter(x => t >= x).length - 1 ? 1 : 0.55;
      let prev = null;
      for (let j = 0; j < AXI.NCH; j++) { const an = b + Math.PI + ((j + 0.5) / AXI.NCH - 0.5) * o.fan, T = Math.exp(-p[AXI.NCH - 1 - j]), [x, y] = AXI.at(o, an, o.Rd + 16 + 20 * T); if (prev) PIX.bline(c, prev[0], prev[1], x, y, a > 0.9 ? 'b4' : 'b2'); prev = [x, y]; }
      if (a < 0.9) { const [sx, sy] = AXI.at(o, b, o.Rs); PIX.circ(c, sx, sy, 4, 'g3'); }
    });
    AXI.parts(c, beta, o, {});
    CAP.ctx(c, t, { text: 'HƏR BUCAQ — YENİ GÖRÜNÜŞ', t0: 0.35, t1: 3.6 });
  },
  cues: () => { const q = [[0.35, 'type', 0.4]]; TT.forEach((tt, k) => q.push([tt, 'capture_click', 0.8, (k - 2.5) / 4, k])); return q; },
  xin: 0.3,
};
})();
