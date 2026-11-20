// S38 VESSEL DISPLAY (148–152 s): a vessel rendering made from the same volume — bone hidden in the display only (the
// skull is still there: the source slice stays in the corner, and a crossed-out bone icon marks the display setting). The
// vessel tree turns a little so its geometry reads in depth.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const VP = [10, 112, 340, 430];
window.VRVIEW = t => ({ yaw: -0.16 + 0.26 * Math.sin(t * 0.8), pitch: 0.36, roll: 0, s: 3.1, cx: VP[0] + VP[2] / 2, cy: VP[1] + 250, ox: -16, oy: 10, oz: -5 });
window.drawVR = (c, t, v, o = {}) => {
  const [x, y, w, hh] = VP;
  PIX.rect(c, x, y, w, hh, 'n0');
  const img = c.getImageData(0, 0, W, H);
  inset(c, 0, 0, 0, 0, () => {});
  VES.render(img, { ...v, mode: 'vr', fadeZ: [-60, -40], an: o.an || 0, show: sp => true });
  // keep the render inside the viewport
  const d = img.data, src = c.getImageData(0, 0, W, H).data;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (xx < x || xx >= x + w || yy < y || yy >= y + hh) { const i = (yy * W + xx) * 4; d[i] = src[i]; d[i + 1] = src[i + 1]; d[i + 2] = src[i + 2]; }
  c.putImageData(img, 0, 0);
  WS.frame(c, x, y, w, hh, 'VR');
  // the display setting: a small bone icon, crossed out
  const bx = x + w - 30, by = y + 6;
  PIX.rect(c, bx, by, 22, 12, 'n1'); PIX.rect(c, bx + 4, by + 5, 14, 2, 'q5'); PIX.rect(c, bx + 3, by + 3, 3, 3, 'q5'); PIX.rect(c, bx + 3, by + 6, 3, 3, 'q5'); PIX.rect(c, bx + 16, by + 3, 3, 3, 'q5'); PIX.rect(c, bx + 16, by + 6, 3, 3, 'q5');
  PIX.bline(c, bx + 2, by + 10, bx + 20, by + 1, 'r2');
  // the source slice, kept in view
  if (o.thumb !== false) { const tx = x + 8, ty = y + hh - 92, tw = 84; PIX.rect(c, tx - 1, ty - 1, tw + 2, tw + 2, 'n3'); WS.image(c, WS.AX, WS.N, tx, ty, tw, tw, { z: 1.0 }); }
};
SC['s38_vr'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    window.drawVR(c, t, window.VRVIEW(S.t));
    CAP.ctx(c, t, { text: 'DAMARIN FORMASI', t0: 0.3, t1: 3.6 });
  },
  cues: [[0, 'reveal_sweep', 0.8, 0, 0.8], [0.3, 'type', 0.4], [0.6, 'orbit', 0.4, 0, 3.2], [1.0, 'click', 0.4, 0.6]],
  xin: 0.35,
};
})();
