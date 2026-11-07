// S15 · 1:39–1:48 — BUILDING THE ATOMIC IMAGE. The detector's pulses run into the electronics: an analog-to-digital
// converter turns each one into a number, and the scan generator says where the probe was — so every scan position
// gets one value, one pixel. On the monitor the micrograph is drawn exactly like that: the first pixels one by one,
// then row after row, faster and faster; dark where little scattered, bright where gold scattered a lot. Bright dots
// appear, then more, until the whole field is there and the software rings every atom it finds.
(() => {
const { W, H } = PIX;
const T_PIPE = 0.0, T_MON = 1.55, T_BUILD = 2.2, T_DONE = 7.0, T_RINGS = 7.25;
const M = LAB.MON;
// how much of the frame has been scanned: the first 12 pixels one per 16th note, then rows accelerating
const scanned = lt => {
  const t = lt - T_BUILD; if (t <= 0) return 0;
  if (t < 1.5) return t * 8;                                                    // 12 pixels in the first 1.5 s
  const u = t - 1.5, D = T_DONE - T_BUILD - 1.5, a = 120, b = (HA.IW * HA.IH - 12 - a * D) / (D * D);
  return Math.min(HA.IW * HA.IH, 12 + a * u + b * u * u);
};
// cameras: on the image at 1:1 (the opening frame) and closer on the first scanned pixels
const c11 = () => LAB.cam11();
const camAt = lt => {
  const C = c11(), Z0 = C.z * 15, [x0, y0] = LAB.imgW(5, 0.5);
  if (lt < T_BUILD + 1.4) return CAM.anchor(x0, y0, Z0, 104, 168);
  // pull back to 1:1 while keeping the line being written on screen (at 1:1 image pixel (i, j) sits at screen (i, j))
  const p = MO.cubicInOut(U.clamp((lt - T_BUILD - 1.4) / 1.7)), rows = Math.min(HA.IH, scanned(lt) / HA.IW);
  const ax = U.lerp(5, HA.IW / 2, p), ay = U.lerp(0.5, Math.max(0.5, rows), p) * (1 - p) + (HA.IH / 2) * p * 0 + U.lerp(0.5, Math.max(0.5, rows), p) * p;
  const [wx, wy] = LAB.imgW(ax, ay), z = CAM.zlerp(Z0, C.z, p);
  const cam = CAM.anchor(wx, wy, z, U.lerp(104, ax, p), U.lerp(168, ay, p));
  return p >= 1 ? C : cam;
};
// the pipe: pulse → ADC → numbers tagged with scan positions → pixels
function pipe(c, lt) {
  PIX.rect(c, 0, 0, W, H, 'k'); for (let y = 0; y < H; y += 24) PIX.rect(c, 0, y, W, 1, 'n0');
  const yW = 220;
  PIX.rect(c, 0, yW, 96, 3, 'g5');                                                               // cable in
  PIX.fill(c, PIX.rectPath(96, yW - 26, 62, 56, 4), 'g3'); PIX.fill(c, PIX.rectPath(99, yW - 23, 56, 50, 3), 'g1');
  PIX.text(c, 'ADC', 127, yW - 14, 'w', { align: 'center' }); PIX.text(c, 'ANALOG', 127, yW + 2, 'g6', { align: 'center', shadow: null }); PIX.text(c, 'TO DIGITAL', 127, yW + 11, 'g6', { align: 'center', shadow: null });
  PIX.rect(c, 158, yW, 30, 3, 'g5');
  // the pixel grid it writes into
  const gx = 190, gy = yW - 40, n = 6, sz = 12;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) PIX.rect(c, gx + i * sz, gy + j * sz, sz - 1, sz - 1, 'g1');
  for (let k = 0; k < 16; k++) {
    const t0 = 0.1 + k * 0.085, a = lt - t0; if (a < 0) continue;
    const v = HA.D[(232 + Math.floor(k / n)) * HA.IW + 150 + (k % n) * 2];
    if (a < 0.35) { const x = U.lerp(0, 96, a / 0.35); PIX.rect(c, Math.round(x), yW - 3, 6, 9, 'e2'); PIX.rect(c, Math.round(x) + 2, yW - 1, 2, 5, 'e3'); }   // pulse
    else if (a < 0.55) { const u = (a - 0.35) / 0.2, s = String(Math.round(v * 255)); PIX.text(c, s, U.lerp(150, gx + (k % n) * sz, u), yW - 22 - (k % 3) * 10 - u * 4, 'c4', { shadow: 'k' }); }
    else { const g = Math.min(1, v), col = g > 0.86 ? 'w' : g > 0.6 ? 'ga' : g > 0.42 ? 'g8' : g > 0.3 ? 'g6' : g > 0.2 ? 'g4' : 'g2'; PIX.rect(c, gx + (k % n) * sz, gy + Math.floor(k / n) * sz, sz - 1, sz - 1, col); }
  }
  PIX.text(c, 'SCAN POSITION (x, y)', 18, yW + 58, 'c4'); PIX.text(c, '+ DETECTOR VALUE', 18, yW + 70, 'e3'); PIX.text(c, '= ONE PIXEL', 18, yW + 82, 'w');
}
SC.s15_image = {
  xin: 0.35,
  camAt,
  draw(c, lt) {
    const T = 99 + lt;
    if (lt < T_MON) { pipe(c, lt); if (lt > T_MON - 0.35) window.dissolve(c, () => {}, cc => this.mon(cc, lt), MO.smooth((lt - T_MON + 0.35) / 0.35)); }
    else this.mon(c, lt);
    const n = scanned(lt), rows = Math.floor(n / HA.IW), cols = n - rows * HA.IW;
    if (lt > T_BUILD && n < HA.IW * HA.IH) {
      const cam = camAt(lt), [px, py] = LAB.imgW(cols + 0.5, rows + 0.5), [sx, sy] = K.S(cam, px, py);
      const pz = cam.z * LAB.MON.k; FX.glowL(c, sx + pz * 0.5, sy, Math.max(6, pz * 1.2), ['c1', 'c2', 'c3'], 0.9); PIX.rect(c, Math.round(sx + pz * 0.5) - 1, Math.round(sy) - 1, 2, 2, 'w');
    }
    // while the camera is close, the empty pixel grid waiting to be filled
    { const cam = camAt(lt), pxs = cam.z * LAB.MON.k;
      if (pxs > 5 && lt > T_MON) {
        const [gx0, gy0] = K.S(cam, ...LAB.imgW(0, 0)), a = U.clamp((pxs - 5) / 4);
        c.save(); c.globalAlpha = 0.45 * a;
        for (let i = 0; i <= HA.IW; i++) { const x = Math.round(gx0 + i * pxs); if (x >= 0 && x < W) PIX.rect(c, x, Math.max(0, Math.round(gy0)), 1, H, 'n2'); if (x > W) break; }
        for (let j = 0; j <= HA.IH; j++) { const y = Math.round(gy0 + j * pxs); if (y >= 0 && y < H) PIX.rect(c, Math.max(0, Math.round(gx0)), y, W, 1, 'n2'); if (y > H) break; }
        c.restore();
      } }
    // the gray scale legend while it builds
    if (lt > T_BUILD + 0.3 && lt < T_RINGS) {
      PIX.rect(c, 14, 420, 104, 30, 'k');
      for (let i = 0; i < 12; i++) PIX.rect(c, 18 + i * 8, 432, 8, 8, ['k', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g8', 'ga', 'gb', 'w'][i]);
      PIX.text(c, 'FEW', 18, 423, 'g6', { shadow: null }); PIX.text(c, 'MANY HITS', 114, 423, 'g9', { shadow: null, align: 'right' });
    }
    // rings around every gold atom the software finds
    if (lt > T_RINGS) {
      const cam = camAt(lt), k = U.clamp((lt - T_RINGS) / 0.6);
      HA.AU.forEach((a, i) => {
        if (i / HA.AU.length > k) return;
        const [px, py] = HA.px(a.x, a.y), [wx, wy] = LAB.imgW(px, py), [sx, sy] = K.S(cam, wx, wy);
        const r = 5; for (let q = 0; q < 24; q++) { const an = q / 24 * U.TAU; PIX.rect(c, Math.round(sx + Math.cos(an) * r), Math.round(sy + Math.sin(an) * r), 1, 1, 'r2'); }
      });
      PIX.rect(c, W - 104, 334, 92, 14, 'k'); PIX.text(c, `ATOMS FOUND: ${Math.round(HA.AU.length * k)}`, W - 16, 337, 'r3', { align: 'right' });   // clear of the raft
    }
    CAP.note(c, lt, { text: 'THE DETECTOR BUILDS THE IMAGE', x: W / 2, y: 378, t0: T_BUILD + 1.4, t1: T_DONE - 0.2, col: 'w', box: true, align: 'center', rate: 60 });
    CAP.note(c, lt, { text: 'ONE PIXEL AT A TIME', x: W / 2, y: 391, t0: T_BUILD + 1.9, t1: T_DONE - 0.2, col: 'w', box: true, align: 'center', rate: 60 });
    CAP.scene(c, lt, { title: lt < T_DONE ? 'BUILDING THE IMAGE' : 'ATOMIC-RESOLUTION IMAGE', ctx: lt < T_DONE ? ['SCANNED PIXEL BY PIXEL'] : ['GOLD ATOMS ON CARBON'], t0: lt < T_DONE ? 0.2 : T_DONE + 0.05, t1: 8.95, acc: 'c2' });
  },
  mon(c, lt) {
    const n = scanned(lt), rows = Math.floor(n / HA.IW), cols = Math.floor(n - rows * HA.IW), T = 99 + lt;
    LAB.draw(c, camAt(lt), T, { screen: { rows: lt < T_BUILD ? 0 : rows, cols: lt < T_BUILD ? 0 : cols } });
  },
  cues: () => {
    const out = [[0.2, 'title_hit', 0.6]];
    for (let k = 0; k < 16; k++) out.push([0.1 + k * 0.085 + 0.35, 'adc_tick', 0.7, 0.3, k]);
    for (let k = 0; k < 12; k++) out.push([T_BUILD + k / 8, 'pixel_click', 1, (k / 12 - 0.5) * 0.6, k]);
    out.push([T_BUILD + 1.5, 'raster_roll', 1, 0, T_DONE - T_BUILD - 1.5], [T_DONE, 'image_done'], [T_RINGS, 'ring_ticks', 1, 0, 0.6], [T_DONE + 0.05, 'title_hit', 0.8]);
    return out;
  },
};
})();
