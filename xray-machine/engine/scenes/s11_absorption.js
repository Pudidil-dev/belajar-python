// S11 DIFFERENTIAL ABSORPTION (47–52 s): push into the edge of a metacarpal, where watery soft tissue meets
// calcium-rich bone mineral. Ten photons into each: soft tissue (mostly H and O, light atoms) lets 6 through; bone
// (hydroxyapatite: calcium, phosphorus) stops 7 — calcium's 20 protons absorb X-rays far more strongly (photoelectric
// effect, roughly ∝ Z³). Then pull back: the detector under the hand receives fewer photons behind each bone. Bones do
// not glow; they cast an X-ray shadow, and that shadow becomes white on the image.
(() => {
const { W, H } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const S10C = () => window.S10.camAt(5);
const camAt = t => {
  const c0 = S10C();
  if (t < 0.85) { const q = MO.cubicIn(clamp(t / 0.85)); return { x: lerp(c0.x, -8.5, q), y: lerp(c0.y, 9, q), z: K.zl(c0.z, 16, q) }; }
  if (t < 2.62) return { x: -8.5, y: 9, z: 16 };
  const q = MO.sineInOut(clamp((t - 2.62) / 1.05)); return { x: lerp(-8.5, -3, q), y: lerp(9, 18, q), z: K.zl(16, 2.85, q) };
};
// micro view: two panels; photons fall in on 8th notes, alternating panels
const PANEL = [{ x: 10, w: 118, name: 'SOFT TISSUE', col: 't3' }, { x: 142, w: 118, name: 'BONE', col: 'b2' }];
const Y0 = 118, Y1 = 318, VP = 390;                    // panel top/bottom (screen px), photon speed (px/s)
const FATE = [[1, 0, 1, 1, 0, 1, 0, 1, 1, 0], [0, 0, 1, 0, 0, 0, 1, 0, 0, 1]];   // 1 = passes (6 of 10 vs 3 of 10)
const PHM = [];
for (let k = 0; k < 20; k++) {
  const side = k % 2, i = k >> 1, P = PANEL[side], pass = FATE[side][i];
  const x = P.x + 12 + h(k, 1) * (P.w - 24), tIn = 0.875 + k * 0.0625 * 0.8;
  const yStop = pass ? null : Y0 + 40 + h(k, 2) * (Y1 - Y0 - 70);
  PHM.push({ side, x, tIn, pass, yStop, sca: !pass && side === 0 && h(k, 3) < 0.6 });
}
// atoms in the panels: water molecules (soft tissue) and a hydroxyapatite lattice with collagen (bone)
const WATER = []; for (let k = 0; k < 34; k++) WATER.push({ x: 14 + h(k, 11) * 110, y: Y0 + 8 + h(k, 12) * (Y1 - Y0 - 16), a: h(k, 13) * 6.28 });
const BONEA = []; for (let r = 0; r < 12; r++) for (let q = 0; q < 6; q++) BONEA.push({ x: 150 + q * 19 + (r % 2) * 9.5, y: Y0 + 10 + r * 16.5, ca: (q + r) % 3 !== 2 });
function drawMicro(c, t) {
  PIX.rect(c, 0, 0, W, H, 'k');
  for (const [pi, P] of PANEL.entries()) {
    PIX.rect(c, P.x - 1, Y0 - 1, P.w + 2, Y1 - Y0 + 2, 'd3'); PIX.rect(c, P.x, Y0, P.w, Y1 - Y0, pi ? 'd0' : 't0');
  }
  // soft tissue: water molecules (O pink, two small H)
  for (const [k, m] of WATER.entries()) {
    const jx = Math.sin(t * 3 + k) * 1.2, jy = Math.cos(t * 2.6 + k * 1.3) * 1.2, a = m.a + t * 0.6;
    K.ball(c, m.x + jx, m.y + jy, 3.2, 't2', 't1', 't3');
    K.ball(c, m.x + jx + Math.cos(a) * 4.2, m.y + jy + Math.sin(a) * 4.2, 1.6, 't3', 't2', 'w'); K.ball(c, m.x + jx + Math.cos(a + 1.82) * 4.2, m.y + jy + Math.sin(a + 1.82) * 4.2, 1.6, 't3', 't2', 'w');
  }
  // bone: collagen strands, then the mineral lattice (Ca big and pale, P smaller)
  c.save(); c.beginPath(); c.rect(142, Y0, 118, Y1 - Y0); c.clip();
  for (let k = 0; k < 6; k++) { c.strokeStyle = PIX.P.t1; c.lineWidth = 2; c.beginPath(); for (let y = Y0; y <= Y1; y += 6) { const x = 150 + k * 20 + Math.sin(y * 0.08 + k) * 4; y === Y0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
  for (const [k, a] of BONEA.entries()) { const j = Math.sin(t * 4 + k) * 0.5; if (a.ca) K.ball(c, a.x + j, a.y, 5, 'b2', 'b1', 'w'); else K.ball(c, a.x + j, a.y, 3, 'b1', 'b0', 'b2'); }
  c.restore();
  // photons and their fates
  const out = [0, 0];
  for (const p of PHM) {
    const age = t - p.tIn; if (age < 0) continue;
    const y = Y0 - 30 + age * VP;
    if (!p.pass && y >= p.yStop) {
      const a2 = (y - p.yStop) / VP;
      if (p.sca) { const d = a2 * VP; if (a2 < 0.5) FX.ph(c, p.x + d * 0.8, p.yStop - d * 0.3, -0.36, 8, 18, 3, 1 - a2 / 0.5); }
      else if (a2 < 0.4) {
        FX.flash(c, p.x, p.yStop, 6 * (1 - a2 / 0.4), 'p3', 1 - a2 / 0.4); FX.ring(c, p.x, p.yStop, 3 + a2 * 40, 'p2', 1 - a2 / 0.4);
        FX.e(c, p.x + a2 * 50, p.yStop - a2 * 30, 2, 1 - a2 / 0.4);                  // photoelectron knocked out
      }
      continue;
    }
    if (y > Y1 + 4) { out[p.side] += p.pass ? 1 : 0; continue; }
    FX.ph(c, p.x, y, Math.PI / 2, 6, 15, 3, 1);
  }
  // panel titles and counters
  for (const [pi, P] of PANEL.entries()) {
    const n = PHM.filter(p => p.side === pi && t >= p.tIn).length;
    PIX.text(c, P.name, P.x + P.w / 2, Y0 - 14, P.col, { align: 'center' });
    PIX.text(c, `IN ${n}`, P.x + 4, Y1 + 6, 'd9');
    PIX.text(c, `OUT ${out[pi]}`, P.x + P.w - 4, Y1 + 6, pi ? 'b2' : 't3', { align: 'right' });
  }
}
function drawSectionView(c, t, S) {
  const cam = camAt(t);
  window.S10.drawWorld(c, t + 5, S, cam);
  c.setTransform(1, 0, 0, 1, 0, 0);
  // transmitted X-rays along the detector: bar per column (more = taller), then the image row it makes
  const grow = MO.cubicOut(clamp((t - 3.05) / 0.9)), DET = window.S10.DET;
  if (grow > 0) {
    for (let sx = 0; sx < W; sx += 2) {
      const [wx] = K.Sinv(cam, sx + 1, 0), T = HAND.transmit(wx), hh = Math.round(34 * T * grow);
      const [, sy] = K.S(cam, 0, DET + 12);
      PIX.rect(c, sx, Math.round(sy) + 2 + 34 - hh, 2, hh, 'g2'); PIX.rect(c, sx, Math.round(sy) + 2 + 34 - hh, 2, 1, 'g3');
      const g = clamp((1 - T) / 0.68), lv = Math.round(g * 12) / 12;                  // image row: few X-rays → bright
      const col = ['k', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'w', 'w'][Math.round(lv * 12)];
      if (t > 3.6) PIX.rect(c, sx, Math.round(sy) + 40, 2, 8, col);
    }
  }
}
SC['s11_absorption'] = {
  draw(c, t, S) {
    const fin = clamp((t - 0.6) / 0.25), fout = clamp((t - 2.6) / 0.22);
    if (fin <= 0 || fout >= 1) drawSectionView(c, t, S);
    else if (fin < 1) dissolve(c, cc => drawSectionView(cc, t, S), cc => drawMicro(cc, t), fin);
    else if (fout > 0) dissolve(c, cc => drawMicro(cc, t), cc => drawSectionView(cc, t, S), fout);
    else drawMicro(c, t);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // notes
    CAP.note(c, t, { x: 135, y: 92, text: 'calcium absorbs X-rays strongly', t0: 1.3, t1: 2.45, align: 'center', col: 'b2', box: true });
    CAP.note(c, t, { x: 14, y: 100, text: 'fewer X-rays reach the detector', t0: 3.1, t1: 4.75, col: 'g3', box: true });
    CAP.note(c, t, { x: 14, y: 111, text: 'behind bone: a shadow', t0: 3.45, t1: 4.75, col: 'g3', box: true });
    CAP.note(c, t, { x: 14, y: 122, text: 'bones do not glow', t0: 3.95, t1: 4.8, col: 'w', box: true });
    if (t > 3.6) { const cam = camAt(t), [, sy] = K.S(cam, 0, window.S10.DET + 12); CAP.note(c, t, { x: 14, y: Math.round(sy) + 52, text: 'IMAGE ROW', t0: 3.65, t1: 4.8, col: 'd9', box: true }); }
    CAP.scene(c, t, { title: 'DIFFERENTIAL ABSORPTION', ctx: 'Calcium-rich bone stops more X-rays.', t0: 0.1, t1: 4.92 });
  },
  cues: () => {
    const q = [[0, 'push_in', 0.7, 0, 0.85], [0.1, 'type', 0.5], [0.6, 'micro_in', 0.6], [2.55, 'pull_back', 0.7, 0, 0.9], [3.05, 'bars', 0.7, 0, 1.0], [3.65, 'blip', 0.4, -0.5], [3.95, 'blip', 0.4, 0.5]];
    for (const p of PHM) { const tEnd = p.pass ? p.tIn + (Y1 + 34 - Y0) / VP : p.tIn + (p.yStop - Y0 + 30) / VP; q.push([Math.round(tEnd * 16) / 16, p.pass ? 'count_tick' : 'absorb', p.pass ? 0.45 : 0.55, p.side ? 0.5 : -0.5, p.side]); }
    return q;
  },
};
})();
