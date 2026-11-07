// S12 DIGITAL DETECTION (52–57 s): push into the flat-panel detector under the hand (indirect conversion). An X-ray is
// absorbed in a caesium-iodide needle and makes a flash of green light; the needle guides the light down to a photodiode,
// which turns it into electric charge stored in that pixel. Thin-film transistor switches then read the pixels out row
// by row; each charge travels along its data line to the readout chip, whose analog-to-digital converter turns it into
// a number. Pixels behind bone collected less light, so they give smaller numbers.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
// detector world (px): 4 pixels of 4 needles each; layers top → bottom; data lines run down into the readout chip
const NX0 = -112, NP = 14, NW = 11, CELL = 56, NC = 4;
const Y_COV = 0, Y_NEE = 6, Y_PD = 106, Y_TFT = 122, Y_GL = 136, Y_GL1 = 150;
const KIND = ['soft', 'bone', 'edge', 'soft'], COUNT = [5, 2, 3, 5], VALUE = [3091, 1388, 1904, 3060];   // 12-bit readings
const ADC = { x: -44, y: 202, w: 88, h: 36 };
const READ = j => 2.45 + j * 0.25;                       // readout time of pixel j (16th notes)
// X-ray arrivals per pixel
const XR = [];
for (let j = 0; j < NC; j++) for (let k = 0; k < COUNT[j]; k++) {
  const n = j * 4 + Math.floor(h(j * 10 + k, 1) * 4), t = 0.8 + (j * 5 + k * 3) % 11 * 0.115 + h(j * 10 + k, 2) * 0.05;
  XR.push({ j, needle: n, x: NX0 + n * NP + NW / 2 + 1, t, yAbs: 20 + h(j * 10 + k, 3) * 62 });
}
XR.sort((a, b) => a.t - b.t);
const VPH = 260, VL = 230;                               // X-ray and light speeds (px/s)
const tLand = x => x.t + (x.yAbs + 60) / VPH;            // absorbed at yAbs (photon starts 60 px above the cover)
const tLight = x => tLand(x) + (Y_PD - x.yAbs) / VL;     // light reaches the photodiode
const chargeAt = (j, t) => { if (t > READ(j)) return 0; let q = 0; for (const x of XR) if (x.j === j && t > tLight(x)) q += 4; return q; };
const camAt = t => {
  if (t < 0.55) { const p = MO.cubicOut(clamp(t / 0.55)); return { x: 0, y: lerp(60, 118, p), z: K.zl(0.55, 1.12, p) }; }
  if (t < 3.6) { const p = MO.sineInOut((t - 0.55) / 3.05); return { x: 0, y: lerp(118, 132, p), z: K.zl(1.12, 1.16, p) }; }
  const p = MO.sineInOut(clamp((t - 3.55) / 1.45)); return { x: 0, y: lerp(132, 300, p), z: K.zl(1.16, 1.45, p) };
};
const tOut = j => READ(j) + 0.36;
const numPos = (j, t) => [lerp(-30, 30, j / 3), ADC.y + ADC.h + 8 + (t - tOut(j)) * 62];   // numbers stream down
window.S12 = { camAt, VALUE, numPos, tOut, NC };
const dataLine = j => { const xc = NX0 + j * CELL + CELL - 12; return [[xc, Y_TFT + 9], [xc, 168 + j * 3], [lerp(-30, 30, j / 3), 186 + j * 3], [lerp(-30, 30, j / 3), ADC.y]]; };
function drawDetector(c, t, S) {
  const cam = camAt(t);
  K.cam(c, cam);
  // cover, needles, photodiodes, transistors, glass
  PIX.rect(c, NX0 - 40, Y_COV, CELL * NC + 80, Y_NEE - Y_COV, 'd4'); PIX.rect(c, NX0 - 40, Y_COV, CELL * NC + 80, 1, 'd6');
  PIX.rect(c, NX0 - 40, Y_NEE, CELL * NC + 80, Y_PD - Y_NEE, 'd0');
  for (let n = -3; n < NC * 4 + 3; n++) { const x = NX0 + n * NP + 1; PIX.rect(c, x, Y_NEE + 1, NW, Y_PD - Y_NEE - 1, 'd6'); PIX.rect(c, x, Y_NEE + 1, 2, Y_PD - Y_NEE - 1, 'd8'); PIX.rect(c, x + NW - 2, Y_NEE + 1, 2, Y_PD - Y_NEE - 1, 'd5'); }
  for (let j = -1; j <= NC; j++) {
    const x = NX0 + j * CELL;
    PIX.rect(c, x + 1, Y_PD, CELL - 2, Y_TFT - Y_PD, 'd3'); PIX.rect(c, x + 1, Y_PD, CELL - 2, 2, 'c1');                  // photodiode + its top electrode
    PIX.rect(c, x + 1, Y_TFT, CELL - 2, Y_GL - Y_TFT, 'd2');
    const read = j >= 0 && j < NC && t > READ(j) && t < READ(j) + 0.3;
    PIX.rect(c, x + CELL - 18, Y_TFT + 3, 13, 6, read ? 'c2' : 'd5'); PIX.rect(c, x + CELL - 16, Y_TFT + 9, 9, 2, 'g1');      // TFT gate + channel
    PIX.rect(c, x + 5, Y_TFT + 3, 16, 2, 'd6'); PIX.rect(c, x + 5, Y_TFT + 8, 16, 2, 'd6');                                  // storage capacitor plates
  }
  PIX.rect(c, NX0 - 40, Y_GL, CELL * NC + 80, Y_GL1 - Y_GL, 'd1'); PIX.rect(c, NX0 - 40, Y_GL, CELL * NC + 80, 1, 'd4');
  // data lines and the readout chip
  for (let j = 0; j < NC; j++) { const pts = dataLine(j); for (let i = 1; i < pts.length; i++) PIX.line(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 'g1', 1.4); }
  PIX.rect(c, ADC.x - 1, ADC.y - 1, ADC.w + 2, ADC.h + 2, 'd4'); PIX.rect(c, ADC.x, ADC.y, ADC.w, ADC.h, 'd2'); PIX.rect(c, ADC.x, ADC.y, ADC.w, 2, 'd5'); PIX.circ(c, ADC.x + 6, ADC.y + 6, 1.6, 'd4');
  for (let k = 0; k < 8; k++) { PIX.rect(c, ADC.x + 6 + k * 10, ADC.y - 4, 3, 4, 'd6'); PIX.rect(c, ADC.x + 6 + k * 10, ADC.y + ADC.h, 3, 4, 'd6'); }
  K.wtext(c, 'ADC', ADC.x + ADC.w / 2, ADC.y + 14, 'g2', { shadow: null, align: 'center' });
  c.setTransform(1, 0, 0, 1, 0, 0);
  const S_ = (x, y) => K.S(cam, x, y);
  // X-rays, scintillation light, charge
  for (const x of XR) {
    const tl = tLand(x);
    if (t < tl) { if (t > x.t) { const [sx, sy] = S_(x.x, -60 + (t - x.t) * VPH); FX.ph(c, sx, sy, Math.PI / 2, 5, 12, 2.5, 1); } continue; }
    const a = t - tl;
    if (a < 0.25) { const [sx, sy] = S_(x.x, x.yAbs); FX.flash(c, sx, sy, 6 * (1 - a / 0.25), 'g3', 1 - a / 0.25); }
    const tL = tLight(x);
    if (t < tL + 0.05) for (let k = 0; k < 10; k++) {                                 // light bouncing down the needle
      const y = x.yAbs + (t - tl) * VL * (0.75 + 0.25 * h(k, 7)), xx = x.x + Math.sin((t - tl) * 40 + k * 2.1) * (NW / 2 - 1.5);
      if (y > Y_PD) continue; const [sx, sy] = S_(xx, y); PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, k % 3 ? 'g2' : 'g3');
    }
  }
  for (let j = 0; j < NC; j++) {
    const q = chargeAt(j, t), x0 = NX0 + j * CELL + 8;
    for (let k = 0; k < q; k++) { const [sx, sy] = S_(x0 + (k % 10) * 3.6, Y_PD + 5 + Math.floor(k / 10) * 3.5); FX.e(c, sx, sy, 1, 1); }
    const tr = READ(j), n = COUNT[j] * 4;
    if (t > tr && t < tr + 0.42) {                                                    // charge running down the data line
      const pts = dataLine(j), Ltot = K.polyLen(pts);
      for (let k = 0; k < Math.min(n, 12); k++) { const d = clamp((t - tr) / 0.36 - k * 0.04) * Ltot; if (d <= 0 || d >= Ltot) continue; const [wx, wy] = K.along(pts, d), [sx, sy] = S_(wx, wy); FX.e(c, sx, sy, 1, 1); }
    }
    if (t > tOut(j)) {
      const age = t - tOut(j), [wx, wy] = numPos(j, t), [sx, sy] = S_(wx, wy);
      if (age < 0.15) { const [fx, fy] = S_(lerp(-30, 30, j / 3), ADC.y + ADC.h / 2); FX.flash(c, fx, fy, 6, 'g3', 1 - age / 0.15); }
      PIX.text(c, String(VALUE[j]), Math.round(sx), Math.round(sy), KIND[j] === 'soft' ? 'd9' : 'w', { shadow: 'k', align: 'center' });
    }
  }
}
// top view of the panel: rows are read one after another; each row's pixels take the radiograph's values
function drawTopView(c, t) {
  const a = clamp((t - 2.35) / 0.25) * (1 - clamp((t - 3.95) / 0.2)); if (a <= 0) return;
  const x0 = 206, y0 = 80, cols = 12, rows = 15, cs = 4;
  c.save(); c.globalAlpha = a;
  PIX.rect(c, x0 - 3, y0 - 3, cols * cs + 6, rows * cs + 6, 'd3'); PIX.rect(c, x0 - 2, y0 - 2, cols * cs + 4, rows * cs + 4, 'k');
  const rowNow = Math.floor((t - 2.45) / 1.2 * rows);
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const done = r < rowNow, g = HAND.grey((q + 0.5) / cols, (r + 0.5) / rows), lv = Math.round(Math.max(0.03, g) * 12);
    PIX.rect(c, x0 + q * cs, y0 + r * cs, cs - 1, cs - 1, done ? ['k', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'w'][lv] : 'd1');
  }
  if (rowNow >= 0 && rowNow < rows) PIX.rect(c, x0 - 2, y0 + rowNow * cs - 1, cols * cs + 4, cs + 1, 'c2', 0.6);
  PIX.text(c, 'ROW BY ROW', x0 + cols * cs / 2, y0 + rows * cs + 6, 'c3', { align: 'center', shadow: 'k' });
  c.restore();
}
SC['s12_detector'] = {
  draw(c, t, S) {
    const fade = clamp((t - 0.05) / 0.3);
    const drawPrev = cc => { const q = MO.cubicIn(clamp(t / 0.4)); window.S10.drawWorld(cc, t + 10, S, { x: lerp(-3, -8, q), y: lerp(18, window.S10.DET + 8, q), z: K.zl(2.85, 24, q) }); };
    if (fade >= 1) drawDetector(c, t, S); else dissolve(c, drawPrev, cc => drawDetector(cc, t, S), fade);
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawTopView(c, t);
    const cam = camAt(t), L = (x, y) => K.S(cam, x, y);
    if (t < 3.7) {
      { const [ax, ay] = L(NX0 + 6 * NP + 5, 24); CAP.note(c, t, { ax, ay, x: 256, y: 112, text: 'SCINTILLATOR (CsI)', t0: 0.9, t1: 2.0, col: 'd9', align: 'right', box: true }); }
      { const [ax, ay] = L(NX0 + 30, Y_PD + 8); CAP.note(c, t, { ax, ay, x: 14, y: Math.round(ay) + 40, text: 'PHOTODIODES', t0: 1.5, t1: 3.0, col: 'c3', box: true }); }
      { const [ax, ay] = L(NX0 + 2 * CELL - 12, Y_TFT + 6); CAP.note(c, t, { ax, ay, x: 256, y: Math.round(ay) + 40, text: 'TRANSISTOR SWITCHES', t0: 2.3, t1: 3.5, align: 'right', col: 'g3', box: true }); }
      { const [ax, ay] = L(ADC.x + ADC.w, ADC.y + 18); CAP.note(c, t, { ax, ay, x: 256, y: Math.round(ay) + 2, text: 'READOUT CHIP', t0: 2.9, t1: 3.9, align: 'right', col: 'g3', box: true }); }
    }
    CAP.note(c, t, { x: 14, y: 80, text: 'X-ray → flash of green light', t0: 0.95, t1: 2.05, col: 'g3', box: true });
    CAP.note(c, t, { x: 14, y: 91, text: 'light → electric charge', t0: 1.55, t1: 2.6, col: 'c3', box: true });
    CAP.note(c, t, { x: 14, y: 80, text: 'read out, pixel by pixel', t0: 2.5, t1: 3.55, col: 'w', box: true });
    CAP.note(c, t, { x: 14, y: 91, text: 'charge → a number', t0: 3.05, t1: 4.5, col: 'g3', box: true });
    CAP.note(c, t, { x: 14, y: 102, text: 'behind bone: smaller numbers', t0: 3.5, t1: 4.6, col: 'w', box: true });
    CAP.scene(c, t, { title: 'DIGITAL DETECTION', ctx: 'X-rays → light → charge → numbers.', t0: 0.1, t1: 4.92 });
  },
  cues: () => {
    const q = [[0, 'push_in', 0.7, 0, 0.5], [0.1, 'type', 0.5], [0.9, 'blip', 0.35, -0.5], [1.5, 'blip', 0.35, -0.5], [2.3, 'blip', 0.35, -0.5], [2.9, 'blip', 0.35, 0.5], [3.6, 'follow_data', 0.8, 0, 1.4]];
    for (const x of XR) { q.push([Math.round(tLand(x) * 16) / 16, 'detect_tick', 0.5, x.x / 150, x.j]); }
    for (let j = 0; j < NC; j++) { q.push([READ(j), 'readout_click', 0.7, -0.3 + j * 0.2, j]); q.push([READ(j) + 0.375, 'signal_pulse', 0.5, -0.3 + j * 0.2, VALUE[j]]); }
    return q;
  },
};
})();
