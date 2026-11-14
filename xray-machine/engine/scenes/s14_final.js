// S14 FINAL (62–65 s): the radiograph is the monitor in the room — pull back to the whole setup while the chain lights
// up part by part (ELECTRONS → TUNGSTEN → X-RAY PHOTONS → HUMAN TISSUE → DETECTOR → IMAGE), then push back in to end
// on the radiograph, under the title.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp;
const M = ROOM.MON, SCR = { x: M.x + 3, y: M.y + 3, w: M.w - 6, h: M.h - 6 };
// opening framing = the radiograph exactly where S13 leaves it (S13 rect, scaled by its final camera zoom)
const S13R = () => { const z = 1.03, s = window.S13; return { w: s.RW * z, cx: s.RX + s.RW / 2, cy: s.RY + s.RH / 2 }; };
const camAt = t => {
  const r = S13R(), z0 = r.w / SCR.w, c0 = { x: SCR.x + SCR.w / 2 - (r.cx - W / 2) / z0, y: SCR.y + SCR.h / 2 - (r.cy - H / 2) / z0, z: z0 };
  const c1 = { x: 150, y: 246, z: 1.06 }, c2 = { x: 64, y: 236, z: 2.05 };
  if (t < 1.15) return K.camLerp(c0, c1, MO.cubicOut(clamp(t / 1.15)));
  if (t < 2.05) return { ...c1, x: c1.x - 4 * MO.sineInOut((t - 1.15) / 0.9) };
  const p = MO.sineInOut(clamp((t - 2.05) / 0.85)); return K.camLerp({ ...c1, x: c1.x - 4 }, c2, p);
};
const CHAIN = [['ELECTRONS', 'c2'], ['TUNGSTEN', 'y2'], ['X-RAY PHOTONS', 'p3'], ['HUMAN TISSUE', 't3'], ['DETECTOR', 'g2'], ['IMAGE', 'w']];
const T_W = k => 0.55 + k * 0.25;                       // each word lights on an 8th note
const lit = (k, t) => t >= T_W(k) && t < T_W(k) + 0.6;
SC['s14_final'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    K.cam(c, cam);
    const chainOn = t > 0.4 && t < 2.3;
    ROOM.draw(c, { t: S.t, z: cam.z, lamp: 0, pulse: lit(2, t) ? 0.75 : 0, led: lit(4, t) ? 1 : 0, cut: chainOn ? 0.32 * clamp((t - 0.4) / 0.2) * (1 - clamp((t - 2.1) / 0.2)) : 0, spin: 1.2, fil: lit(0, t) ? 1 : 0.4 });
    c.setTransform(1, 0, 0, 1, 0, 0);
    ROOM.monitorImage(c, cam, { reveal: 1 });
    if (t < 0.35) {                                    // continuity with S13: only the radiograph at first, the room fades in
      const [x0, y0] = K.S(cam, SCR.x, SCR.y), [x1, y1] = K.S(cam, SCR.x + SCR.w, SCR.y + SCR.h), a = 1 - MO.smooth(t / 0.35);
      K.dith(c, 0, 0, W, Math.max(0, y0 - 2), 'k', a); K.dith(c, 0, y1 + 2, W, H - y1, 'k', a);
      K.dith(c, 0, y0 - 2, Math.max(0, x0 - 2), y1 - y0 + 4, 'k', a); K.dith(c, x1 + 2, y0 - 2, W - x1, y1 - y0 + 4, 'k', a);
    }
    // highlights in the room, one per word
    const S_ = (x, y) => K.S(cam, x, y);
    if (lit(0, t)) { const [x, y] = S_(...ROOM.tube(-21, 0)); FX.flash(c, x, y, 6, 'c2', 1); FX.ring(c, x, y, 4 + (t - T_W(0)) * 30, 'c2', 1 - (t - T_W(0)) / 0.6); }
    if (lit(1, t)) { const [x, y] = S_(...ROOM.tube(0, 0)); FX.flash(c, x, y, 6, 'y3', 1); FX.ring(c, x, y, 4 + (t - T_W(1)) * 30, 'y2', 1 - (t - T_W(1)) / 0.6); }
    if (lit(3, t)) { const [x, y] = S_(160, 336); FX.ring(c, x, y, 6 + (t - T_W(3)) * 40, 't3', 1 - (t - T_W(3)) / 0.6); }
    if (lit(4, t)) { const D = ROOM.DET, [x0, y0] = S_(D.x, D.y), [x1] = S_(D.x + D.w, D.y); PIX.rect(c, Math.round(x0), Math.round(y0) - 1, Math.round(x1 - x0), 1, 'g2'); }
    if (lit(5, t)) { const [x0, y0] = S_(M.x - 2, M.y - 2), [x1, y1] = S_(M.x + M.w + 2, M.y + M.h + 2); c.strokeStyle = PIX.P.c2; c.lineWidth = 1; c.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(x1 - x0), Math.round(y1 - y0)); }
    // the chain, two centred lines
    const ca = clamp((t - 0.45) / 0.15) * (1 - clamp((t - 2.15) / 0.2));
    if (ca > 0) {
      const lines = [[0, 1, 2], [3, 4, 5]];
      lines.forEach((ks, li) => {
        const toks = []; ks.forEach((k, i) => { if (i > 0 || li > 0) toks.push(['→', null]); toks.push([CHAIN[k][0], k]); });
        const gap = 4, wsum = toks.reduce((s, [w]) => s + PIX.textWidth(w), 0) + gap * (toks.length - 1);
        let x = Math.round(W / 2 - wsum / 2); const y = 60 + li * 12;
        c.save(); c.globalAlpha = ca; PIX.rect(c, x - 3, y - 2, wsum + 6, 11, 'k');
        for (const [w, k] of toks) {
          const col = k == null ? 'd5' : t < T_W(k) ? 'd3' : lit(k, t) ? CHAIN[k][1] : 'd9';
          PIX.text(c, w, x, y, col, { shadow: null });
          x += PIX.textWidth(w) + gap;
        }
        c.restore();
      });
    }
    // title
    const n = CAP.typed('HOW X-RAYS ARE MADE', t, 0.2, null);
    if (n > 0) { const tw = PIX.textWidth('HOW X-RAYS ARE MADE', 2); PIX.rect(c, Math.round(W / 2 - tw / 2) - 4, 26, tw + 9, 22, 'k'); PIX.text(c, 'HOW X-RAYS ARE MADE', W / 2, 30, 'w', { sc: 2, align: 'center', n }); }
  },
  cues: () => {
    const q = [[0, 'resolve', 1], [0.2, 'type', 0.5], [2.05, 'push_in', 0.6, -0.3, 0.85], [2.25, 'final_tail', 0.9, 0, 0.75]];
    CHAIN.forEach((_, k) => q.push([T_W(k), 'chain', 0.7, -0.5 + k * 0.2, k]));
    return q;
  },
};
})();
