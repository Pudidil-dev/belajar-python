// S20 TIME THE ACQUISITION (76–80 s): a schematic enhancement curve — how bright the arteries get over time as the bolus
// passes — beside the gantry. The curve rises; a highlighted acquisition window slides along the time axis onto its high
// part (the arterial phase) and the scan fires. No seconds, no rates: the right moment depends on the patient and is
// chosen by the scan protocol. The camera pulls back from the curve to include the gantry.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const PX = 40, PY = 380, PW = 280, PH = 150;
const curve = u => { const x = (u - 0.18) / 0.32; return x <= 0 ? 0.04 : 0.04 + 0.94 * Math.pow(x, 2.2) * Math.exp(-(x - 1) * 2.2) / 1.0; };   // gamma-variate-like
const WIN0 = 0.08, WIN1 = 0.46, WW = 0.14;
const winAt = t => lerp(WIN0, WIN1, MO.cubicInOut(clamp((t - 1.0) / 1.5)));
const zoomAt = t => K.zl(1.55, 1.0, MO.cubicInOut(clamp((t - 0.2) / 2.0)));
SC['s20_phase'] = {
  draw(c, t, S) {
    const z = zoomAt(t), cx = PX + PW * 0.5, cy = PY + PH * 0.5;
    c.save(); c.translate(W / 2, lerp(H * 0.62, H / 2, 1 - (z - 1) / 0.55)); c.scale(z, z); c.translate(-W / 2, -H / 2 - (z - 1) * 120);
    // the gantry (side view: an ivory ring on its base, the patient on the table)
    const gx = 180, gy = 214, fire = clamp((t - 2.55) / 0.6);
    PIX.flat(c, PIX.rectPath(gx - 160, gy + 8, 300, 14, 4), 'g4', 'g2', 'g6');
    PIX.flat(c, PIX.rectPath(gx - 150, gy - 14, 196, 22, 10), 'h1', 'h0', 'h2');
    PIX.flat(c, PIX.rectPath(gx - 40, gy - 118, 80, 236, 18), 'q5', 'q3', 'q6');
    PIX.rect(c, gx - 40, gy + 96, 80, 26, 'q4'); PIX.rect(c, gx - 2, gy - 112, 4, 224, 'q4');
    if (fire > 0 && fire < 1) FX.glowL(c, gx, gy, 60 * (0.5 + fire), ['y0', 'y1', 'y2', 'y3'], (1 - fire), 1.3);
    // the curve panel
    PIX.rect(c, PX - 6, PY - 6, PW + 12, PH + 12, 'k'); PIX.rect(c, PX - 6, PY - 6, PW + 12, 1, 'n3');
    PIX.rect(c, PX, PY + PH, PW, 1, 'g5'); PIX.rect(c, PX, PY, 1, PH, 'g5');
    const w0 = winAt(t), wa = MO.smooth(clamp((t - 0.9) / 0.2));
    if (wa > 0) { c.save(); c.globalAlpha = wa; for (let y = PY; y < PY + PH; y++) for (let x = Math.round(PX + w0 * PW); x < PX + (w0 + WW) * PW; x++) if (K.BAY(x, y) < (fire > 0 ? 0.45 : 0.25)) PIX.rect(c, x, y, 1, 1, fire > 0 ? 'c2' : 'c1'); PIX.rect(c, Math.round(PX + w0 * PW), PY, 1, PH, 'c3'); PIX.rect(c, Math.round(PX + (w0 + WW) * PW), PY, 1, PH, 'c3'); c.restore(); }
    const grow = MO.smooth(clamp(t / 2.4));
    let prev = null;
    for (let i = 0; i <= 200 * grow; i++) { const u = i / 200, x = PX + u * PW, y = PY + PH - curve(u) * (PH - 10); if (prev) { PIX.bline(c, prev[0], prev[1], x, y, 'v2'); PIX.bline(c, prev[0], prev[1] - 1, x, y - 1, 'v3'); } prev = [x, y]; }
    if (prev) PIX.circ(c, prev[0], prev[1], 2.5, 'v3');
    c.restore();
    CAP.ctx(c, t, { text: 'ARTERİAL FAZA', t0: 0.4, t1: 3.6 });
  },
  cues: [[0, 'curve_rise', 0.7, 0, 2.4], [0.4, 'type', 0.4], [1.0, 'window_slide', 0.7, 0, 1.5], [2.55, 'trigger', 1.0, 0], [2.6, 'scan_fire', 0.8, 0]],
  xin: 0.3,
};
})();
