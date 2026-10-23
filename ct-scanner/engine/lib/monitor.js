// MON — the CT workstation screen: the 3D skull (SKULL.render) inside minimal viewer chrome — a navy viewport, a thin top
// bar with tool icons and "VR", an orientation cube that turns with the skull. Drawn full-frame in S01 and S17, and into
// an offscreen texture (with box-filtered mip levels) for the monitor the camera pulls away from in S01–S02.
(() => {
const { W, H, P } = PIX;
const MON = window.MON = {};
// the opening pose and the view used on the screen
MON.POSE = { cx: 135, cy: 256, s: 1.04, yaw: -0.30, pitch: 0.12 };
MON.chrome = (c, view, a = 1) => {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  PIX.rect(c, 2, 2, W - 4, 1, 'n2'); PIX.rect(c, 2, H - 3, W - 4, 1, 'n2'); PIX.rect(c, 2, 2, 1, H - 4, 'n2'); PIX.rect(c, W - 3, 2, 1, H - 4, 'n2');
  PIX.rect(c, 3, 3, W - 6, 12, 'n1');
  PIX.text(c, 'VR', 8, 6, 'g6', { shadow: null });
  for (let k = 0; k < 5; k++) { const x = 30 + k * 11; PIX.rect(c, x, 6, 7, 7, 'n2'); PIX.rect(c, x + 2, 8, 3, 3, k === 0 ? 'c2' : 'g4'); }
  for (let k = 0; k < 3; k++) PIX.rect(c, W - 14 - k * 7, 8, 4, 4, k === 0 ? 'e2' : 'g3');
  // orientation cube, bottom right, turning with the skull
  const o = { ...view, cx: W - 30, cy: H - 34, s: 7 };
  const V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => SKULL.proj(o, x, y, z));
  for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) PIX.bline(c, V[i][0], V[i][1], V[j][0], V[j][1], 'g5');
  const [fx, fy] = SKULL.proj(o, 0, 1.5, 0); PIX.text(c, 'A', fx - 2, fy - 3, 'c3', { shadow: null });
  // scale bar: 5 cm at the skull's scale
  const L = Math.round(50 * view.s); PIX.rect(c, 10, H - 22, L, 1, 'g5'); PIX.rect(c, 10, H - 25, 1, 4, 'g5'); PIX.rect(c, 10 + L, H - 25, 1, 4, 'g5');
  c.restore();
};
// the whole screen: background, skull (with any SKULL options), scan-plane overlay, chrome
MON.draw = (c, view, so = {}, ov = {}) => {
  PIX.rect(c, 0, 0, W, H, 'n0');
  const img = K.pbegin(c);
  SKULL.render(img, { ...view, ...so });
  if (ov.plane != null) SKULL.plane(img, ov.plane, { fill: ov.planeFill ?? 0.16 });
  K.pend(c, img);
  MON.chrome(c, view, ov.chrome ?? 1);
};
// offscreen texture of the screen with mip levels (2×2 box averages) for the room's monitor
const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
const cx = cv.getContext('2d', { willReadFrequently: true });
MON.texture = (view, so = {}, ov = {}) => {
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1;
  MON.draw(cx, view, so, ov);
  PIX.quantize(cx);
  const base = cx.getImageData(0, 0, W, H), mips = [{ w: W, h: H, data: base.data }];
  while (mips.length < 5) {
    const m = mips[mips.length - 1], w = m.w >> 1, h = m.h >> 1, d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) {
      const a = (y * 2 * m.w + x * 2) * 4 + k; d[(y * w + x) * 4 + k] = (m.data[a] + m.data[a + 4] + m.data[a + m.w * 4] + m.data[a + m.w * 4 + 4]) / 4;
    }
    mips.push({ w, h, data: d });
  }
  return mips;
};
// pick the mip whose texel size matches the screen's projected height (px)
MON.mip = (mips, projH) => { let i = 0; while (i < mips.length - 1 && mips[i].h > projH * 1.5) i++; return mips[i]; };
})();
