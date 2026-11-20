// S29 PHOTODIODE CONVERSION (112–116 s): a close inset of the silicon photodiode. Green light is absorbed in the depletion
// region; each absorbed packet makes an electron–hole pair; the junction's field (arrows) pulls them apart — electrons
// (cyan dots) down to one electrode, holes (open rings with a plus: an effective positive carrier, not a cavity) up to
// the other — where they are collected as charge. Camera static.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash;
const Y0 = 200, Y1 = 470, DEP0 = 250, DEP1 = 420, X0 = 30, X1 = 330;
const PR = []; for (let k = 0; k < 16; k++) PR.push({ x: X0 + 30 + h(k, 1) * (X1 - X0 - 60), y: DEP0 + 20 + h(k, 2) * (DEP1 - DEP0 - 40), t0: 0.35 + k * 0.14 });
SC['s29_diode'] = {
  draw(c, t, S) {
    PIX.rect(c, X0 - 4, Y0 - 4, X1 - X0 + 8, Y1 - Y0 + 8, 'k');
    PIX.rect(c, X0, Y0, X1 - X0, Y1 - Y0, 'g3');
    PIX.rect(c, X0, Y0, X1 - X0, DEP0 - Y0, 'b0'); PIX.rect(c, X0, DEP1, X1 - X0, Y1 - DEP1, 'g2');
    for (let y = DEP0; y < DEP1; y++) for (let x = X0; x < X1; x++) if (K.BAY(x, y) < 0.18) PIX.rect(c, x, y, 1, 1, 'g4');
    PIX.rect(c, X0, Y0 - 6, X1 - X0, 4, 'u2'); PIX.rect(c, X0, Y1 + 2, X1 - X0, 4, 'u2');
    // the field across the depletion region (points from n to p: electrons drift down here, holes up)
    for (let k = 0; k < 7; k++) { const x = X0 + 22 + k * 44, y = DEP0 + 12 + K.wrap(S.t * 30 + k * 13, DEP1 - DEP0 - 24); K.arrow(c, x, y + 10, x, y - 6, 'n4', 3); }
    // the green light arriving from the scintillator above
    for (const p of PR) {
      const age = t - p.t0, x = p.x;
      if (age < 0) { if (age > -0.35) FX.ph(c, x, lerp(Y0 - 60, p.y, 1 + age / 0.35), Math.PI / 2, 5, 10, 2, 1, ['e0', 'e1', 'e2', 'e3']); continue; }
      if (age < 0.25) FX.flash(c, x, p.y, 5 * (1 - age / 0.25), 'e3', 1 - age / 0.25);
      const ye = Math.min(Y1 - 2, p.y + age * 120), yh = Math.max(Y0 + 2, p.y - age * 70);
      if (ye < Y1 - 2) FX.e(c, x + 3, ye, 2, 1); else PIX.rect(c, Math.round(x + 2), Y1 - 1, 3, 2, 'c3');
      if (yh > Y0 + 2) DET.hole(c, x - 3, yh); else PIX.rect(c, Math.round(x - 4), Y0 - 1, 3, 2, 'b4');
    }
    // the collected charge: a meter on each electrode
    const n = PR.filter(p => t - p.t0 > 0.9).length / PR.length;
    PIX.rect(c, X1 + 8, Y0, 8, Y1 - Y0, 'n1'); PIX.rect(c, X1 + 8, Y1 - Math.round((Y1 - Y0) * n), 8, Math.round((Y1 - Y0) * n), 'b3');
    CAP.ctx(c, t, { text: 'İŞIQ → ELEKTRİK YÜKÜ', t0: 0.4, t1: 3.6 });
  },
  cues: () => { const q = [[0.4, 'type', 0.4], [0, 'det_bed', 0.4, 0, 4]]; PR.forEach((p, k) => { if (k % 2 === 0) q.push([p.t0, 'pair', 0.4, (p.x - 180) / 200, k]); }); q.push([0.9, 'charge_up', 0.6, 0.5, 2.8], [1.0, 'charge_down', 0.6, -0.5, 2.8]); return q; },
  xin: 0.3,
};
})();
