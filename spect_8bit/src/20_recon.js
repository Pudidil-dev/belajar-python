'use strict';
// ============================================================================
// MANY ANGLES -> ONE VOLUME -> THE MEDICAL IMAGE (panels 19, 20; s23..s26):
// projection tiles, the semicircle of views around a heart model, the
// workstation, the voxel volume (the MLEM estimate, iteration by iteration),
// the estimate/project/compare/update loop and the perfusion slices.
// ============================================================================
let PMAX = 1;
const VOXC = [];
function buildVoxels() {
  PMAX = 0; for (const p of MODEL.projClean) for (let i = 0; i < p.length; i++) if (p[i] > PMAX) PMAX = p[i];
  const R = 6.4, st = MD.vox / 2;
  MODEL.recon.forEach((vol, k) => {
    let mx = 0; for (let i = 0; i < vol.length; i++) if (vol[i] > mx) mx = vol[i];
    const out = [];
    for (let z = -R; z <= R; z += st) for (let y = -R; y <= R; y += st) for (let x = -R; x <= R; x += st) {
      const h = x * LVA[0] + y * LVA[1] + z * LVA[2], r2 = x * x + y * y + z * z - h * h;
      if (h < -3.4 || (h / 6.2) * (h / 6.2) + r2 / (4.5 * 4.5) > 1) continue;          // the LV region only (not the liver)
      const v = volAt(vol, LVC[0] + x, LVC[1] + y, LVC[2] + z) / mx;
      if (v > 0.36) out.push(x, y, z, v);
    }
    VOXC[k] = new Float32Array(out);
  });
}
// ---------------------------------------------------------------- projection tiles (cyan)
function projTile(v, x, y, s, o) {
  o = o || {};
  const h = s / 2;
  rect(x - h - 3, y - h - 3, x + h + 3, y + h + 3, P.K0); frame(x - h - 3, y - h - 3, x + h + 3, y + h + 3, o.col || P.PJ2);
  drawValueImage(projImage(v, true), MD.n, x - h, y - h, s, s, RAMP_PJ(), PMAX * 0.95, { nearest: s < 48 });
  if (o.hl) frame(x - h - 5, y - h - 5, x + h + 5, y + h + 5, P.PJ4);
}
// screen direction of a camera angle (seen from the foot of the table: patient's left = screen right, anterior = up)
const thDir = th => [Math.sin(th), -Math.cos(th)];
// ---------------------------------------------------------------- the simplified heart model (centre of the semicircle)
function heartIcon(x, y, s, t) {
  const beat = 1 + 0.03 * Math.max(0, Math.sin(t * TAU * 1.1)) ;
  const pts = spline([0, -0.62, 0.42, -0.98, 0.95, -0.7, 0.98, -0.05, 0.55, 0.62, 0.05, 1.02, -0.5, 0.58, -0.95, -0.02, -0.9, -0.66, -0.42, -0.98], 6, true).map((v, i) => i % 2 ? y + v * s * beat : x + v * s * beat);
  const m = maskPoly(pts);
  organShade(m, x - s * 0.1, y - s * 0.1, s, s, [P.HT6, P.HT5, P.HT4, P.HT3, P.HT2, P.HT1], -0.5, -0.6);
  mOutline(m, P.HT0);
  // great vessels stubs and a coronary line
  tube([x - s * 0.15, y - s * 0.8, x - s * 0.2, y - s * 1.25], s * 0.24, TUBE_RED(), 1);
  tube([x + s * 0.25, y - s * 0.75, x + s * 0.42, y - s * 1.15, x + s * 0.7, y - s * 1.2], s * 0.2, TUBE_DARK(), 1);
  const cor = spline([x - s * 0.1, y - s * 0.5, x + s * 0.1, y, x + s * 0.05, y + s * 0.6], 6, false); polyline(cor, P.HT2);
}
// ---------------------------------------------------------------- the workstation
function workstation(cx, cy, s, t, o) {
  o = o || {};
  const w = 150 * s, h = 96 * s;
  rect(cx - 14 * s, cy + h / 2, cx + 14 * s, cy + h / 2 + 22 * s, P.G5); rect(cx - 40 * s, cy + h / 2 + 22 * s, cx + 40 * s, cy + h / 2 + 28 * s, P.G4);
  rect(cx - w / 2 - 8 * s, cy - h / 2 - 8 * s, cx + w / 2 + 8 * s, cy + h / 2 + 8 * s, P.G4);
  rect(cx - w / 2 - 8 * s, cy - h / 2 - 8 * s, cx + w / 2 + 8 * s, cy - h / 2 - 6 * s, P.G2);
  rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, P.K0);
  if (o.content) o.content(cx - w / 2, cy - h / 2, w, h);
  disc(cx + w / 2 + 2 * s, cy + h / 2 + 4 * s, Math.max(1, 1.5 * s), Math.sin(t * 4) > 0 ? P.SG2 : P.SG1);
  // keyboard
  const ky = cy + h / 2 + 36 * s;
  poly([cx - 70 * s, ky, cx + 70 * s, ky, cx + 80 * s, ky + 14 * s, cx - 80 * s, ky + 14 * s], P.G4);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 14; c++) rect(cx - 66 * s + c * 9.5 * s + r * 2 * s, ky + 2 * s + r * 4 * s, cx - 66 * s + c * 9.5 * s + r * 2 * s + 7 * s, ky + 2 * s + r * 4 * s + 3 * s, P.G2);
}
// ---------------------------------------------------------------- the voxel volume
// list: Float32Array [x,y,z,v]*; centre (cx, cy) on screen, sc px per cm, rotation about the body axis,
// o.cut: hide voxels nearer than this depth (cm) to reveal the cavity, o.sweep [y, oldList]: update sweep
const _vox = [];
// shown in the LV's own frame: the long axis vertical (base up, apex down), spinning about that axis,
// tipped 0.35 rad toward the viewer so the base opening shows; o.thr hides weak voxels
function drawVoxels(list, cx, cy, sc, rot, o) {
  o = o || {};
  const ca = Math.cos(rot), sa = Math.sin(rot), s = Math.max(2, Math.round(sc * MD.vox / 2) + 1), ramp = RAMP_RM();
  const ct = Math.cos(0.35), stt = Math.sin(0.35), thr = o.thr || 0;
  _vox.length = 0;
  const add = (L, keep) => {
    for (let i = 0; i < L.length; i += 4) {
      const v = L[i + 3]; if (v < thr) continue;
      const x = L[i], y = L[i + 1], z = L[i + 2];
      const u1 = x * LVE1[0] + y * LVE1[1] + z * LVE1[2], u2 = x * LVE2[0] + y * LVE2[1] + z * LVE2[2], h = x * LVA[0] + y * LVA[1] + z * LVA[2];
      const xr = u1 * ca + u2 * sa, dz0 = -u1 * sa + u2 * ca;           // spin about the axis
      const py0 = h * ct - dz0 * stt, dz = h * stt + dz0 * ct;          // tip toward the viewer
      if (o.cut !== undefined && dz0 > o.cut) continue;
      const px = cx + xr * sc, py = cy + py0 * sc;
      if (keep && !keep(py)) continue;
      _vox.push([dz, px, py, v]);
    }
  };
  if (o.sweep) { add(list, py => py <= o.sweep[0]); add(o.sweep[1], py => py > o.sweep[0]); }
  else add(list);
  _vox.sort((a, b) => a[0] - b[0]);
  const lo = Math.max(0.36, thr);
  for (const [dz, px, py, v] of _vox) {
    const q = clamp((v - lo) / (1 - lo), 0, 1) * 6.5 + 1.8, i = clamp(Math.round(q), 1, 8);
    const x0 = Math.round(px - s / 2), y0 = Math.round(py - s / 2);
    rect(x0, y0, x0 + s, y0 + s, ramp[i]);
    rect(x0, y0, x0 + s, y0 + 1, ramp[Math.min(8, i + 1)]); rect(x0, y0, x0 + 1, y0 + s, ramp[Math.min(8, i + 1)]);
    rect(x0, y0 + s - 1, x0 + s, y0 + s, ramp[i - 1]); rect(x0 + s - 1, y0, x0 + s, y0 + s, ramp[i - 1]);
    void dz;
  }
}
// ---------------------------------------------------------------- the iterative loop diagram
const LOOP_W = ['ESTIMATE', 'PROJECT', 'COMPARE', 'UPDATE'];
function loopDiagram(cx, cy, rx, ry, active, k, iter, t) {
  for (let i = 0; i < 64; i++) { const a = i / 64 * TAU, b = (i + 0.5) / 64 * TAU; line(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, cx + Math.cos(b) * rx, cy + Math.sin(b) * ry, i % 2 ? P.N5 : P.N4); }
  // a data dot travelling around the loop
  const a0 = -Math.PI / 2 + (active + k) * TAU / 4;
  glow(cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry, 7, P.PJ2, P.PJ4, 0.9); disc(cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry, 2.5, P.C6);
  LOOP_W.forEach((w, i) => {
    const a = -Math.PI / 2 + i * TAU / 4, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, on = i === active;
    const tw = textW(FS, w, 2);
    rect(x - tw / 2 - 5, y - 9, x + tw / 2 + 5, y + 9, on ? P.PJ1 : P.K0); frame(x - tw / 2 - 5, y - 9, x + tw / 2 + 5, y + 9, on ? P.PJ4 : P.N5);
    text(FS, w, x, y - 5, { sc: 2, c: on ? P.C6 : P.SUB, align: 'center' });
    // arrowheads on the ring between nodes
    const am = -Math.PI / 2 + (i + 0.5) * TAU / 4; arrowHead(cx + Math.cos(am) * rx, cy + Math.sin(am) * ry, am + Math.PI / 2, 5, P.N6);
  });
  text(FS, 'REPEAT', cx, cy - 12, { sc: 2, c: P.SUB, align: 'center' });
  text(FC, '×' + iter, cx, cy + 2, { sc: 2, c: P.PJ4, align: 'center' });
}
// ---------------------------------------------------------------- perfusion slices
const _slc = {};
function sliceImg(kind, h) { const key = kind + h; if (!_slc[key]) _slc[key] = cardiacSlice(MODEL.recon[MODEL.recon.length - 1], kind, h, 48); return _slc[key]; }
function slicePanel(kind, h, x, y, w, hh, k, lbl) {
  if (k <= 0) return;
  const sc = backOut(clamp(k, 0, 1), 1.4), cw = w * sc, ch = hh * sc;
  rect(x - cw / 2 - 4, y - ch / 2 - 4, x + cw / 2 + 4, y + ch / 2 + 4, P.K0);
  drawValueImage(sliceImg(kind, h), 48, x - cw / 2, y - ch / 2, cw, ch, RAMP_RM(), 0.74, {});
  frame(x - cw / 2 - 4, y - ch / 2 - 4, x + cw / 2 + 4, y + ch / 2 + 4, P.LBL);
  if (k < 0.25) rect(x - cw / 2, y - ch / 2, x + cw / 2, y + ch / 2, P.C6, 1 - k * 4);
  void lbl;
}
function colourBar(x, y, w, k) {
  if (k <= 0) return;
  const ramp = RAMP_RM(), ww = w * eout(clamp(k, 0, 1));
  for (let i = 0; i < ww; i++) { const q = i / w * 8 + (bay(x + i, y) - 0.5) * 0.8; rect(x + i, y, x + i + 1, y + 8, ramp[clamp(Math.round(q), 0, 8)]); }
  frame(x - 1, y - 1, x + w + 1, y + 9, P.N6);
}
