// S45 COMPLETE THE LOOP (176–180 s): the vessel rendering on the workstation monitor; the camera pushes through the screen,
// the processed ivory display turns back into the opening's muted-red network, and the view lands exactly on the first
// frame of the film: the same arteries, the same bulge, the same camera, colours and backdrop. The question returns once;
// the ring and the words leave before the last frame, so the cut to frame 0 is seamless.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const V0 = () => window.S01.V0;
const viewAt = t => { const q = MO.cubicInOut(clamp((t - 0.2) / 2.8)), v = V0(); return { ...v, s: K.zl(v.s * 0.52, v.s, q), cy: lerp(318, v.cy, q), cx: lerp(W / 2, v.cx, q) }; };
const cvA = document.createElement('canvas'); cvA.width = W; cvA.height = H; const xa = cvA.getContext('2d', { willReadFrequently: true });
SC['s45_loop'] = {
  draw(c, t, S) {
    const v = viewAt(t), mix = MO.smooth(clamp((t - 1.0) / 1.4)), bz = K.zl(1, 3.2, MO.cubicIn(clamp((t - 0.2) / 1.5)));
    // the opening's network (blood) on its backdrop, and the processed display (vr) on navy, mixed by dither
    if (mix > 0) window.drawNetwork(c, t - 4, v, { brainA: mix, pulse: false });
    if (mix < 1) {
      xa.setTransform(1, 0, 0, 1, 0, 0); xa.fillStyle = P.n0; xa.fillRect(0, 0, W, H);
      const img = xa.getImageData(0, 0, W, H); VES.render(img, { ...v, mode: 'vr', fadeZ: [-78, -46] }); xa.putImageData(img, 0, 0);
      const a = c.getImageData(0, 0, W, H), b = xa.getImageData(0, 0, W, H);
      for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) if (mix <= K.BAY(x, y) || mix === 0) { a.data[i] = b.data[i]; a.data[i + 1] = b.data[i + 1]; a.data[i + 2] = b.data[i + 2]; }
      c.putImageData(a, 0, 0);
    }
    // the monitor bezel, scaling past the frame as the camera goes through the screen
    if (bz < 3.1) {
      const sw = 300 * bz, sh = 380 * bz, x0 = W / 2 - sw / 2, y0 = 318 - sh / 2, b = 14 * bz;
      c.save(); c.fillStyle = P.g2; c.beginPath(); c.rect(-10, -10, W + 20, H + 20); c.rect(x0 + sw, y0, -sw, sh); c.fill('evenodd'); c.restore();
      PIX.rect(c, x0 - 1, y0 - 1, sw + 2, 1, 'g4'); PIX.rect(c, x0 - 1, y0 + sh, sw + 2, 1, 'g1');
      if (bz < 1.6) { PIX.rect(c, x0, y0 + sh + b * 0.4, sw, b * 0.6, 'g1'); PIX.rect(c, W / 2 - 4, y0 + sh + b * 0.5, 8, 2, 'e2'); }
    }
    const a = VES.anScreen(v), ring = MO.cubicOut(clamp((t - 1.3) / 0.5)) * (1 - MO.smooth(clamp((t - 3.0) / 0.4)));
    if (ring > 0.02) VES.ring(c, a.x, a.y, a.r + 5, Math.min(1, ring * 1.2), S.t);
    CAP.ctx(c, t, { text: 'BUNU NECƏ GÖRMƏK OLAR?', t0: 0.9, t1: 2.95 });
  },
  cues: [[0, 'warm_pad', 0.5, 0, 2], [0.2, 'push_in', 0.7, 0, 1.6], [0.9, 'type', 0.4], [1.0, 'curious', 0.7, -0.2, 0], [1.5, 'curious', 0.6, 0.2, 1], [1.3, 'ring', 0.7, -0.3], [3.0, 'resolve_rise', 0.8, 0, 1.0]],
  xin: 0.3,
};
})();
