// S13 DIGITAL RADIOGRAPH (57–62 s, second drop at 57): the numbers from the detector become pixels. The image builds
// coarse to fine — a grid of numbers turns into grey blocks (the outline), then finer passes resolve the finger bones,
// then the joints, then every pixel. Many X-rays reached a pixel → dark; few → bright, so bone comes out white.
(() => {
const { W, H } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const RX = 18, RY = 84, RW = 234, RH = 292;              // image rect on screen (4:5)
window.S13 = { RX, RY, RW, RH };
const LV = [[32, 0.25], [16, 0.95], [8, 1.6], [4, 2.25], [1, 2.9]];   // block size (px), sweep start (s)
const SW = 0.45;                                          // sweep duration per level
const sweep = (k, t) => clamp((t - LV[k][1]) / SW);
const blockAt = (v, t) => { let b = 0; for (let k = 0; k < LV.length; k++) if (v < sweep(k, t)) b = LV[k][0]; return b; };
const camZ = t => 1 + 0.03 * MO.sineInOut(clamp(t / 5));
SC['s13_radiograph'] = {
  draw(c, t, S) {
    const z = camZ(t), cx = RX + RW / 2, cy = RY + RH / 2, rx = cx - RW * z / 2, ry = cy - RH * z / 2, rw = RW * z, rh = RH * z;
    // frame + faint pixel grid of the panel
    PIX.rect(c, Math.round(rx) - 2, Math.round(ry) - 2, Math.round(rw) + 4, Math.round(rh) + 4, 'd3');
    PIX.rect(c, Math.round(rx), Math.round(ry), Math.round(rw), Math.round(rh), 'k');
    if (t < 1.2) K.grid(c, Math.round(rx), Math.round(ry), Math.round(rw), Math.round(rh), 32 * z, 'd2', 0.9 * (1 - clamp((t - 0.8) / 0.4)));
    HAND.draw(c, rx, ry, rw, rh, { block: (u, v) => Math.max(1, blockAt(v, t) * z), mask: (u, v) => blockAt(v, t) > 0 ? 1 : 0, marker: t > 3.3 });
    // the first pass shows the numbers themselves, which then turn into grey
    if (t > 0.05 && t < 1.25) {
      const bs = 32 * z;
      for (let by = 0; by * bs < rh; by++) for (let bx = 0; bx * bs < rw; bx++) {
        const v = (by + 0.5) * bs / rh, u = (bx + 0.5) * bs / rw; if (v > 1 || u > 1) continue;
        const shown = t >= v * 0.12 && t < LV[0][1] + v * SW + 0.25;
        if (!shown) continue;
        const n = Math.round(4095 * (1 - HAND.grey(u, v) * 0.82));   // 12-bit: more X-rays → bigger number
        PIX.text(c, String(n), Math.round(rx + bx * bs + bs / 2), Math.round(ry + by * bs + bs / 2 - 3), 'g3', { align: 'center', shadow: 'k', n: 5 });
      }
    }
    // sweep lines of the current pass
    for (let k = 0; k < LV.length; k++) { const s = sweep(k, t); if (s > 0 && s < 1) PIX.rect(c, Math.round(rx), Math.round(ry + rh * s), Math.round(rw), 1, 'c2'); }
    // stage labels
    const L = (u, v) => [rx + u * rw, ry + v * rh];
    { const [ax, ay] = L(0.08, 0.36); CAP.note(c, t, { ax, ay, x: 22, y: 92, text: 'OUTLINE', t0: 0.75, t1: 1.6, col: 'd9', box: true }); }
    { const [ax, ay] = L(0.62, 0.15); CAP.note(c, t, { ax, ay, x: 248, y: 92, text: 'FINGER BONES', t0: 1.5, t1: 2.6, col: 'w', align: 'right', box: true }); }
    { const [ax, ay] = L(0.5, 0.335); CAP.note(c, t, { ax, ay, x: 248, y: 104, text: 'JOINTS', t0: 2.2, t1: 3.2, col: 'w', align: 'right', box: true }); }
    CAP.note(c, t, { x: 135, y: 340, text: 'one number per pixel', t0: 2.9, t1: 3.7, col: 'g3', align: 'center', box: true });
    CAP.note(c, t, { x: 22, y: 92, text: 'dose of a hand X-ray ≈ 3 hours', t0: 3.7, t1: 4.85, col: 'd9', box: true });
    CAP.note(c, t, { x: 22, y: 103, text: 'of natural background radiation', t0: 4.0, t1: 4.85, col: 'd9', box: true });
    // grey-scale legend
    const la = clamp((t - 3.2) / 0.25) * (1 - clamp((t - 4.8) / 0.15));
    if (la > 0) {
      c.save(); c.globalAlpha = la;
      const x0 = 70, y0 = 356, w = 130;
      PIX.rect(c, x0 - 4, y0 - 3, w + 8, 21, 'k');
      for (let k = 0; k < w; k++) { const g = k / (w - 1), lv = Math.round(g * 12); PIX.rect(c, x0 + k, y0, 1, 5, ['k', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'w'][lv]); }
      PIX.rect(c, x0, y0, w, 1, 'd4'); PIX.rect(c, x0, y0 + 5, w, 1, 'd4');
      PIX.text(c, 'MANY X-RAYS', x0, y0 + 8, 'd8', { shadow: null }); PIX.text(c, 'FEW', x0 + w, y0 + 8, 'w', { align: 'right', shadow: null });
      c.restore();
    }
    CAP.scene(c, t, { title: 'DIGITAL RADIOGRAPH', ctx: 'More X-rays = darker. Fewer = brighter.', t0: 0.1, t1: 4.92 });
  },
  cues: () => {
    const q = [[0, 'drop2', 1], [0.1, 'type', 0.5], [0.05, 'numbers', 0.6, 0, 0.6]];
    for (let k = 0; k < LV.length; k++) { q.push([LV[k][1], 'sweep', 0.6, -0.3 + k * 0.15, k]); const n = [4, 6, 8, 8, 8][k]; for (let i = 0; i < n; i++) q.push([LV[k][1] + i * SW / n, 'pixel_click', 0.45, (i % 2) - 0.5, k * 10 + i]); }
    q.push([0.75, 'blip', 0.35, -0.5], [1.5, 'blip', 0.35, 0.5], [2.2, 'blip', 0.35, 0.5], [3.35, 'complete', 1, 0], [3.75, 'blip', 0.3, 0]);
    return q;
  },
};
})();
