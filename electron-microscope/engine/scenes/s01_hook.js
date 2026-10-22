// S01 · 0:00–0:04 — THE ATOMIC HOOK. The first frame is the micrograph at 1:1 (one image pixel = one screen pixel).
// A dashed cursor ring snaps onto one gold atom (0.25 s), "ONE GOLD ATOM" types on, the camera punches in until the
// atom's image pixels show and a line profile with its Gaussian fit draws underneath (1.2 s), then the micrograph
// shrinks fast and lands as one panel on the workstation monitor (3 s).
(() => {
const { W, H } = PIX;
const T_SNAP = 0.25, T_IN = 1.0, D_IN = 0.45, T_PROF = 1.2, T_OUT = 2.0, T_MON = 3.0;
const ZIN = 6;                                                            // screen px per image px at the punch-in
const atom = () => HA.AU[HA.HOOK];
const atomW = () => { const a = atom(), [px, py] = HA.px(a.x, a.y); return LAB.imgW(px, py); };
const camAt = lt => {
  const c11 = LAB.cam11(), [ax, ay] = atomW(), z11 = c11.z;
  const zin = z11 * ZIN, s0 = CAM.toScreen(c11, ax, ay);
  if (lt < T_IN) { const z = z11 * (1 + 0.03 * MO.smooth(lt / T_IN)); return CAM.anchor(ax, ay, z, s0[0], s0[1]); }
  if (lt < T_OUT) {
    const p = MO.cubicInOut(U.clamp((lt - T_IN) / D_IN)), z0 = z11 * 1.03, z = CAM.zlerp(z0, zin * (1 + 0.05 * U.clamp((lt - T_IN - D_IN) / (T_OUT - T_IN - D_IN))), p);
    return CAM.anchor(ax, ay, z, U.lerp(s0[0], W / 2, p), U.lerp(s0[1], 196, p));
  }
  if (lt < T_MON) {
    // the micrograph shrinks: slow start on the rising whoosh, fastest mid-way, landing on the monitor with the bass hit
    const p = U.clamp((lt - T_OUT) / (T_MON - T_OUT)), e = MO.quintInOut(p), mon = S02.cam(T_MON);
    const z = CAM.zlerp(zin * 1.05, mon.z, e), ca = CAM.anchor(ax, ay, z, W / 2, 196), k = MO.smooth(U.clamp((p - 0.2) / 0.8));
    return { x: U.lerp(ca.x, mon.x, k), y: U.lerp(ca.y, mon.y, k), z };
  }
  return S02.cam(lt);
};
// the cursor: a dashed ring with four ticks, snapped onto the atom (screen px); k = 0..1 grow-in
function cursor(c, sx, sy, r, k, t, col = 'y3') {
  if (k <= 0) return;
  const R = r * (1 + 0.8 * (1 - MO.backOut(U.clamp(k), 2.4)));
  const n = Math.max(16, Math.round(R * 4.2));
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PIX.P[col];
  for (let i = 0; i < n; i++) { if (i % 4 === 3) continue; const a = i / n * U.TAU + t * 0.6; c.fillRect(Math.round(sx + Math.cos(a) * R), Math.round(sy + Math.sin(a) * R), 1, 1); }
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let q = 2; q < 6; q++) c.fillRect(Math.round(sx + dx * (R + q)), Math.round(sy + dy * (R + q)), 1, 1);
  c.restore();
}
SC.cursor = cursor;
// the line-profile graph (screen px): white dots = recorded pixels, red = Gaussian fit
function graph(c, lt, x, y, w, h, k) {
  if (k <= 0) return;
  const a = atom(), [px, py] = HA.px(a.x, a.y), n = 33, L = [px - 16, py, px + 16, py];
  const pr = HA.profile(...L, n), fit = HA.fit(...L, n, a), show = Math.floor(n * U.clamp(k * 1.25));
  PIX.rect(c, x - 3, y - 3, w + 6, h + 18, 'k'); PIX.rect(c, x - 3, y - 3, w + 6, 1, 'g4');
  PIX.bline(c, x, y, x, y + h, 'g6'); PIX.bline(c, x, y + h, x + w, y + h, 'g6');
  for (let i = 0; i <= 4; i++) PIX.rect(c, x + Math.round(i * w / 4), y + h + 1, 1, 2, 'g6');
  let prev = null;
  for (let i = 0; i < n; i++) {
    const xx = x + Math.round(i * w / (n - 1)), yf = y + h - Math.round(fit[i] * (h - 4));
    if (i < show && prev) PIX.bline(c, prev[0], prev[1], xx, yf, 'r2');
    prev = [xx, yf];
  }
  for (let i = 0; i < show; i++) { const xx = x + Math.round(i * w / (n - 1)), yp = y + h - Math.round(pr[i] * (h - 4)); PIX.rect(c, xx - 1, yp - 1, 2, 2, 'w'); }
  PIX.text(c, 'INTENSITY', x + 3, y - 1, 'g7', { shadow: null });
  PIX.text(c, '-0.4', x - 6, y + h + 5, 'g6', { shadow: null }); PIX.text(c, '0', x + w / 2, y + h + 5, 'g6', { shadow: null, align: 'center' });
  PIX.text(c, '0.4 nm', x + w + 4, y + h + 5, 'g6', { shadow: null, align: 'right' });
  if (k > 0.85) { PIX.text(c, 'FIT', x + w - 14, y + 4, 'r2', { shadow: null }); }
}
SC.s01_hook = {
  camAt,
  draw(c, lt) {
    const cam = camAt(lt);
    LAB.draw(c, cam, lt, { screen: {} });
    const [ax, ay] = atomW(), [sx, sy] = K.S(cam, ax, ay), pxs = cam.z * LAB.MON.k;   // screen px per image px
    // the profile line through the atom
    const kL = U.clamp((lt - T_PROF) / 0.25) * (1 - U.clamp((lt - T_OUT) / 0.2));
    if (kL > 0) {
      const half = 16 * pxs * MO.cubicOut(kL);
      PIX.bline(c, sx - half, sy, sx + half, sy, 'r2', 1);
      FX.ring(c, sx, sy, 3 + (lt - T_PROF) * 30, 'w', U.clamp(1 - (lt - T_PROF) * 3));
    }
    // cursor ring
    const kC = U.clamp((lt - T_SNAP) / 0.18), rC = Math.max(12, 2.8 * pxs) * U.lerp(1, 0.4, U.clamp((lt - T_OUT) / (T_MON - T_OUT)));
    cursor(c, sx, sy, Math.max(4, rC), kC, lt);
    if (lt > 0.75 && lt < 1.1) FX.ring(c, sx, sy, 12 + (lt - 0.75) * 50, 'y4', 1 - (lt - 0.75) / 0.35);
    // label
    const lx = sx + Math.max(18, 3.2 * pxs) + 6, ly = sy - Math.max(18, 3.2 * pxs) - 10;
    CAP.note(c, lt, { text: 'ONE GOLD ATOM', x: Math.min(lx, W - 82), y: Math.max(54, ly), ax: sx + Math.max(12, 2.8 * pxs) * 0.72, ay: sy - Math.max(12, 2.8 * pxs) * 0.72, t0: 0.32, t1: 2.25, col: 'y4', lineCol: 'y2', box: true });
    // intensity profile graph
    const kG = U.clamp((lt - T_PROF) / 0.6) * (1 - U.clamp((lt - T_OUT) / 0.18));
    if (kG > 0) window.shifted(c, cc => graph(cc, lt, 52, 300, 166, 76, U.clamp((lt - T_PROF) / 0.55)), 0, Math.round((1 - MO.cubicOut(U.clamp((lt - T_PROF) / 0.3))) * 40 + MO.cubicIn(U.clamp((lt - T_OUT) / 0.18)) * 60));
  },
  cues: [[0, 'impact_digital'], [0.25, 'lock_click'], [0.75, 'crystal'], [1.0, 'zoom_punch', 1, 0, 0.45], [1.2, 'scan_pulse'], [2.0, 'whoosh_rise', 1, 0, 1.0], [3.0, 'bass_drop'], [3.05, 'ui_ticks', 0.8, 0.3, 0.9]],
};
})();
