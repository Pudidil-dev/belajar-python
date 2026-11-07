// S43 LIMITS OF THE IMAGE (168–172 s): two separate examples, not this patient's finding. Top: a section at the skull base
// where a very small bulge on an artery sits right against bright bone — easy to miss. Bottom: a slice from a scan where
// the head moved — the edges smear and double. A card slides in: further imaging, when the clinical question needs it.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
SC['s43_limits'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    // example 1: coronal section near the skull base (the right carotid siphon among bone), a tiny bulge marked "?"
    const x1 = 30, y1 = 112, w = 300, h1 = 200;
    PIX.rect(c, x1 - 2, y1 - 2, w + 4, h1 + 4, 'k');
    const A = WS.P0, [u, v] = WS.toImg('co', -14, 0, -20), view = WS.image(c, WS.CO, WS.N, x1, y1, w, h1, { z: 3.2, u0: u, v0: v });
    WS.frame(c, x1, y1, w, h1, 'COR');
    const [bx, by] = view.map(u + 1.5, v - 3);
    PIX.rect(c, Math.round(bx), Math.round(by), 3, 3, 'gb'); PIX.rect(c, Math.round(bx) + 1, Math.round(by) - 1, 1, 1, 'ga');
    const qa = MO.smooth(clamp((t - 0.6) / 0.3)); if (qa > 0) { c.save(); c.globalAlpha = qa; for (let k = 0; k < 24; k += 2) { const an = k / 24 * U.TAU; PIX.rect(c, Math.round(bx + 1 + Math.cos(an) * 12), Math.round(by + 1 + Math.sin(an) * 12), 1, 1, 'a1'); } PIX.text(c, '?', bx + 16, by - 18, 'a2', { sc: 2 }); c.restore(); }
    // example 2: a motion-degraded axial slice (ghost copies and smear)
    const x2 = 30, y2 = 338, h2 = 200, mv = MO.smooth(clamp((t - 1.0) / 0.8));
    PIX.rect(c, x2 - 2, y2 - 2, w + 4, h2 + 4, 'k');
    inset(c, x2, y2, w, h2, cc => {
      for (let k = 0; k < 3; k++) CT.drawSlice(cc, CT.full(), x2 + w / 2 + (k - 1) * 7 * mv, y2 + h2 / 2 + 8 + (k - 1) * 2 * mv, 0.95, { L: WS.L, W: WS.W, alpha: k === 1 ? 1 : 0.4 * mv });
      if (mv > 0) for (let k = 0; k < 7; k++) { const yy = y2 + 20 + k * 27; for (let xx = x2; xx < x2 + w; xx += 2) if (K.BAY(xx, yy) < 0.5 * mv) PIX.rect(cc, xx, yy, 1, 1, 'g6'); }
    });
    WS.frame(c, x2, y2, w, h2, 'AX');
    // the card: further imaging
    const ca = MO.cubicOut(clamp((t - 2.0) / 0.45));
    if (ca > 0) {
      const cx = lerp(W + 10, 70, ca), cy = 556, cw = 250;
      PIX.flat(c, PIX.rectPath(cx, cy, cw, 56, 6), 'n3', 'n1', 'n4');
      FX.ring(c, cx + 26, cy + 26, 11, 'c3', 1); PIX.bline(c, cx + 34, cy + 34, cx + 42, cy + 42, 'c3'); PIX.bline(c, cx + 35, cy + 34, cx + 43, cy + 42, 'c3');
      if (!window.NOTEXT) PIX.text(c, 'ƏLAVƏ MÜAYİNƏ', cx + 54, cy + 20, 'w', { sc: 2, n: Math.floor((t - 2.2) * 50), shadow: 'n1' });
    }
    CAP.ctx(c, t, { text: 'KİÇİK TAPINTILAR ÇƏTİNDİR', t0: 0.35, t1: 3.6 });
  },
  cues: [[0, 'pause_pad', 0.5, 0, 4], [0.35, 'type', 0.4], [0.6, 'question', 0.6, -0.3], [1.0, 'smear', 0.5, 0.2, 0.8], [2.0, 'card_slide', 0.7, 0.5]],
  xin: 0.3,
};
})();
