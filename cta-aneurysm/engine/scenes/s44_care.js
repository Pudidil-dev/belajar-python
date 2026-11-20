// S44 INFORMATION GUIDES CARE (172–176 s): the radiologist's report (the vessel rendering on it, the text only as grey
// lines) travels to the clinical team, seen from behind at a table. Two paths open from them: monitoring with follow-up
// imaging, or evaluating whether treatment is needed. The scan itself repairs nothing and treatment is not automatic.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const zAt = t => K.zl(1.35, 1, MO.cubicInOut(clamp(t / 1.4)));
// a person seen from behind: head and shoulders only (a dark silhouette with a soft rim light), no face
const back = (c, x, y, s, col, rim) => {
  const p = new Path2D(); p.ellipse(x, y - 34 * s, 15 * s, 17 * s, 0, 0, TAU); p.moveTo(x - 40 * s, y + 30 * s); p.quadraticCurveTo(x - 38 * s, y - 14 * s, x, y - 16 * s); p.quadraticCurveTo(x + 38 * s, y - 14 * s, x + 40 * s, y + 30 * s); p.closePath();
  PIX.flat(c, p, col, 'k', rim, [2, 2], [-1, -1]);
};
SC['s44_care'] = {
  draw(c, t, S) {
    const z = zAt(t);
    c.save(); c.translate(W / 2, 330); c.scale(z, z); c.translate(-W / 2, -330);
    // the table and the team (from behind)
    PIX.flat(c, PIX.rectPath(30, 430, 300, 26, 6), 'u0', 'k', 'u1');
    back(c, 90, 470, 1.0, 'n2', 'n4'); back(c, 180, 478, 1.1, 'h0', 'h1'); back(c, 270, 470, 1.0, 'n2', 'n4');
    // the report travelling from the top left onto the table
    const q = MO.cubicInOut(clamp((t - 0.3) / 1.4)), rx = lerp(40, 152, q), ry = lerp(130, 360, q), rr = lerp(-0.25, 0.05, q);
    c.save(); c.translate(rx + 28, ry + 36); c.rotate(rr); c.translate(-28, -36);
    PIX.flat(c, PIX.rectPath(0, 0, 56, 72, 3), 'q6', 'q4', 'w');
    PIX.rect(c, 6, 6, 44, 28, 'n0'); for (let k = 0; k < 5; k++) PIX.rect(c, 10 + k * 7, 26 - (k % 3) * 5, 3, 8, 'q5'); PIX.circ(c, 14, 22, 2.5, 'a1');
    for (let k = 0; k < 4; k++) PIX.rect(c, 6, 40 + k * 7, k === 3 ? 26 : 44, 3, 'q3');
    c.restore();
    c.restore();
    // the two paths
    const pa = MO.cubicOut(clamp((t - 1.6) / 0.6));
    if (pa > 0) {
      const ox = 180, oy = 410;
      const L1 = [ox - 20, oy - 40, lerp(ox - 20, 84, pa), lerp(oy - 40, 196, pa)], L2 = [ox + 20, oy - 40, lerp(ox + 20, 276, pa), lerp(oy - 40, 196, pa)];
      for (const [a, b, cc, d] of [L1, L2]) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) K.arrow(c, a + dx, b + dy, cc + dx, d + dy, 'k', 6); K.arrow(c, a, b, cc, d, 'c3', 6); }
      if (pa > 0.9) {
        // monitoring: a calendar with a repeat arrow
        PIX.flat(c, PIX.rectPath(60, 140, 48, 44, 4), 'q5', 'q3', 'q6'); PIX.rect(c, 60, 140, 48, 10, 'r2'); for (let k = 0; k < 6; k++) PIX.rect(c, 66 + (k % 3) * 13, 156 + Math.floor(k / 3) * 12, 8, 7, 'q3');
        FX.ring(c, 84, 116, 10, 'c3', 1); PIX.rect(c, 92, 110, 4, 4, 'c3');
        // treatment evaluation: two speech bubbles (a discussion) without words
        PIX.flat(c, PIX.rectPath(246, 140, 44, 28, 8), 'n3', 'n1', 'n4'); PIX.flat(c, PIX.rectPath(262, 160, 44, 28, 8), 'h1', 'h0', 'h2');
        for (let k = 0; k < 3; k++) PIX.rect(c, 256 + k * 8, 152, 4, 4, 'g8');
      }
    }
    CAP.part(c, t, { text: 'İZLƏMƏ', ax: 84, ay: 196, x: 84, y: 214, t0: 2.25, t1: 3.75, col: 'w', align: 'center', dot: false });
    CAP.part(c, t, { text: 'MÜALİCƏ', ax: 276, ay: 196, x: 342, y: 214, t0: 2.3, t1: 3.75, col: 'w', align: 'right', dot: false });
    CAP.part(c, t, { text: 'QİYMƏTLƏNDİRMƏSİ', ax: 276, ay: 196, x: 342, y: 236, t0: 2.4, t1: 3.75, col: 'w', align: 'right', dot: false });
    CAP.ctx(c, t, { text: 'QƏRAR ÜÇÜN MƏLUMAT', t0: 0.35, t1: 3.6 });
  },
  cues: [[0, 'warm_pad', 0.6, 0, 4], [0.35, 'type', 0.4], [0.3, 'paper_slide', 0.6, -0.4, 1.4], [1.7, 'paper_land', 0.6, 0], [1.6, 'paths_open', 0.8, 0, 0.6], [2.25, 'tag', 0.4, -0.5], [2.375, 'tag', 0.4, 0.5]],
  xin: 0.3,
};
})();
