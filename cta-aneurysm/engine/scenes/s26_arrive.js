// S26 ARRIVAL AT THE DETECTOR (100–104 s): the photons that got through the head fall on a row of detector elements; each
// element receives a different amount (the pattern of a real projection through the model: where the skull and the
// enhanced arteries lie, fewer arrive). The camera follows one surviving photon down to its element. (A different photon
// from the one absorbed by iodine.)
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash;
const N = 9, EW = 36, X0 = 180 - N * EW / 2, Y0 = 470, HG = 120;
const prof = () => { const p = AXI.profile(0.4), out = []; for (let k = 0; k < N; k++) { const j = Math.floor((k + 0.5) / N * p.length * 0.7 + p.length * 0.15); out.push(Math.exp(-p[j] * 0.85)); } return out; };
let PR = null;
const camY = t => lerp(-420, 0, MO.sineInOut(clamp(t / 3.2)));
const PH = []; for (let k = 0; k < 120; k++) PH.push({ e: Math.floor(h(k, 1) * N), te: -2 + k * 0.045, r: h(k, 2) });
const FEAT = { e: 4, te: -0.35 };
SC['s26_arrive'] = {
  draw(c, t, S) {
    PR = PR || prof();
    const cy = camY(t), V = 300;
    // the head the photons crossed, above (its axial cross-section; G2.head draws in screen pixels)
    G2.head(c, { x: 0, y: 0, s: 1.9, cx: W / 2, cy: -470 - cy }, { c8: PIX.hex(PIX.P.v2) });
    c.save(); c.translate(0, -cy);
    // rays from above (where the head is): faint dotted guides
    for (let k = 0; k < N; k++) for (let y = -600; y < Y0; y += 6) PIX.rect(c, X0 + k * EW + EW / 2, y, 1, 1, 'n2');
    const fills = PR.map((f, k) => f * clamp((t - 0.2) / 3.2));
    DET.row(c, X0, Y0, N, EW, HG, fills, S.t);
    for (const p of PH) {
      if (p.r > PR[p.e]) continue;                                  // this lane lets fewer through
      const y = -700 + (t - p.te) * V; if (y > Y0 + 6 || y < -700) continue;
      const x = X0 + p.e * EW + EW / 2 + (p.r - 0.5) * 10;
      if (y > Y0 - 4) { FX.flash(c, x, Y0 + 4 - cy, 3, 'e3', 1); continue; }
      FX.ph(c, x, y - cy, Math.PI / 2, 5, 10, 2, 1);
    }
    // the followed photon
    const yF = -700 + (t - FEAT.te) * V * 0.82, xF = X0 + FEAT.e * EW + EW / 2;
    if (yF < Y0) { FX.ph(c, xF, yF - cy, Math.PI / 2, 7, 18, 4, 1); FX.ring(c, xF, yF - cy, 12, 'c4', 1); } else if (yF < Y0 + 40) FX.flash(c, xF, Y0 + 6 - cy, 9 * (1 - (yF - Y0) / 40), 'e3', 1);
    c.restore();
    CAP.ctx(c, t, { text: 'KEÇƏN ŞÜA ÖLÇÜLÜR', t0: 0.35, t1: 3.6 });
  },
  cues: () => { const q = [[0, 'track', 0.6, 0, 3.2], [0.35, 'type', 0.4]]; for (let k = 0; k < 14; k++) q.push([0.8 + k * 0.2, 'arrive_tick', 0.3 + 0.2 * (k % 3 === 0), (k % N - 4) / 5, k]); q.push([3.55, 'land', 0.8, 0]); return q; },
  xin: 0.25,
};
})();
