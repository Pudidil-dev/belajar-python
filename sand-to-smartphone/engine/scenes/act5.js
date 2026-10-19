// ACT 5 — EUV lithography and pattern transfer (S18–S22)
(() => {
const { P, W, H } = PIX;
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;

// ================= S18 · tin droplets → pre-pulse → main pulse → plasma → EUV =================
const TGT = [135, 250], NOZ = 54;
// droplet arrivals at the target: slow-motion first (every 1 s), then real rhythm (every 0.5 s); all on the beat
const ARR = [0, 1, 2, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5];
const gapAt = i => i > 0 ? ARR[i] - ARR[i - 1] : 1;
function drawRays(c, x, y, a, n = 18, len = 120, ph = 0) {
  for (let k = 0; k < n; k++) { const an = k * TAU / n + ph; PIX.line(c, x + Math.cos(an) * 10, y + Math.sin(an) * 10, x + Math.cos(an) * len, y + Math.sin(an) * len, k % 2 ? 'p3' : 'p4', 1, a); }
}
function source(c, t) {
  PIX.vgrad(c, -200, -200, 700, 900, [[0, 'n0'], [0.6, 'p0'], [1, 'n0']]);
  // collector mirror behind: huge concave dish with multilayer interference bands
  for (let r = 0; r < 7; r++) { c.save(); c.strokeStyle = P[['p2', 'c1', 'p3', 'b1', 'p2', 'c2', 'p3'][r]]; c.globalAlpha = 0.55; c.lineWidth = 3; c.beginPath(); c.arc(330, 300, 150 - r * 3, Math.PI * 0.62, Math.PI * 1.32); c.stroke(); c.restore(); }
  for (let n = 0; n < 50; n++) { const x = -50 + K.wrap(h(n, 1) * 400 + t * 90 * (0.5 + h(n, 2)), 400), y = h(n, 3) * 480; PIX.rect(c, Math.round(x), Math.round(y), 3, 1, 'b2', 0.35); }   // H₂ flow
  // droplet generator nozzle
  K.panel(c, 120, -40, 30, 80, 'g3', 'g1', 'g4', { rivets: true }); PIX.flat(c, PIX.polyPath([[124, 40], [146, 40], [138, NOZ], [132, NOZ]]), 'g4', 'g2', 'g5', [2, 1]);
  PIX.glow(c, 135, 20, 18, 'o0', 0.4); PIX.rect(c, 132, 14, 6, 10, 'o0');
  // tin catcher below
  PIX.flat(c, PIX.rectPath(118, 452, 34, 30, 3), 'g3', 'g1', 'g4', [2, 2]);
}
function cycle(c, t, i, a) {                                       // one droplet's life around its arrival time a
  const g = gapAt(i), slow = g >= 1, fall = (TGT[1] - NOZ) / (slow ? 1.0 : 0.5);
  const tp = slow ? 0.25 : 0.125, d = t - a;
  if (d < -(TGT[1] - NOZ) / fall - 0.05) return;
  if (d < 0) { K.ball(c, TGT[0], TGT[1] + d * fall, 9, 'g4', 'g2', 'w'); PIX.rect(c, TGT[0] + 3, Math.round(TGT[1] + d * fall) + 3, 2, 2, 'o1'); return; }
  if (d < tp) {                                                     // pre-pulse hit: flash, droplet flattens into a disc
    const q = d / tp;
    if (d < 0.06) { PIX.line(c, W + 20, TGT[1], TGT[0] + 6, TGT[1], 'm1', 2); PIX.glow(c, TGT[0], TGT[1], 26, 'm1', 0.8); }
    const rw = lerp(9, 30, MO.cubicOut(q)), rh = lerp(9, 3, MO.cubicOut(q));
    c.save(); c.translate(TGT[0], TGT[1] + d * 30); c.scale(rw / 9, rh / 9); K.ball(c, 0, 0, 9, 'g4', 'g2', 'w'); c.restore();
    return;
  }
  const e = d - tp, life = slow ? 0.5 : 0.32;                       // main pulse → plasma → EUV
  if (e < 0.08) { PIX.line(c, W + 20, TGT[1] + tp * 30, TGT[0], TGT[1] + tp * 30, 'r2', 9); PIX.line(c, W + 20, TGT[1] + tp * 30, TGT[0], TGT[1] + tp * 30, 'o1', 3); }
  if (e < life) {
    const q = e / life, y = TGT[1] + tp * 30;
    PIX.glow(c, TGT[0], y, 40 + 100 * q, 'p2', 0.75 * (1 - q)); PIX.glow(c, TGT[0], y, 26 + 30 * q, 'p4', 0.95 * (1 - q * 0.8));
    PIX.circ(c, TGT[0], y, Math.max(0, 9 * (1 - q * 1.2)), 'w');
    drawRays(c, TGT[0], y, 1 - q, 20, 60 + 260 * q, i * 0.4);
    for (let n = 0; n < 14; n++) { const an = h(n, i) * TAU, r = 10 + q * 90 * (0.5 + h(n, i + 5)); PIX.rect(c, Math.round(TGT[0] + Math.cos(an) * r), Math.round(y + Math.sin(an) * r), 1, 1, 'g4', 1 - q); }   // tin debris
  }
}
SC.s18_tin = {
  draw(c, lt) {
    const push = MO.cubicInOut(clamp((lt - 4.0) / 0.3));
    const k = { x: TGT[0], y: lerp(240, TGT[1] + 4, push), z: CAM.zlerp(1, 2.0, push) * (1 + 0.05 * Math.max(0, lt - 4.3)) };
    PIX.cam(c, k); source(c, lt);
    for (let i = 0; i < ARR.length; i++) cycle(c, lt, i, ARR[i]);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const dr = PIX.toScreen(k, TGT[0], TGT[1] + (lt - 1) * 196);
    PIX.label(c, { ax: dr[0] + 9, ay: dr[1], tx: dr[0] + 30, ty: dr[1] - 34, text: 'Sn DROPLET ~27 µm', t0: 0.35, t1: 0.95, col: 'g5' }, lt);
    PIX.label(c, { ax: 160, ay: 252, tx: 150, ty: 186, text: 'PRE-PULSE', t0: 1.0, t1: 2.4, col: 'm1', lineCol: 'm1' }, lt);
    PIX.label(c, { ax: 168, ay: 262, tx: 150, ty: 320, text: 'MAIN PULSE', t0: 1.25, t1: 2.6, col: 'o1', lineCol: 'o0' }, lt);
    PIX.label(c, { tx: W / 2, ty: 412, text: 'Sn PLASMA → EUV LIGHT', t0: 2.3, t1: 3.9, col: 'p4', align: 'center' }, lt);
    PIX.label(c, { tx: W / 2, ty: 40, text: 'λ = 13.5 nm', t0: 4.3, t1: 6.7, col: 'w', align: 'center', sc: 2 }, lt);
    PIX.label(c, { tx: W / 2, ty: 440, text: '50,000 DROPLETS / SECOND', t0: 4.9, t1: 6.7, col: 'g4', align: 'center' }, lt);
  },
  cues: [[-0.4, 'vacuum', 0.45, 0, 7.4], ...ARR.flatMap((a, i) => { const s = gapAt(i) >= 1, tp = s ? 0.25 : 0.125; return [[a, 'prepulse', s ? 0.7 : 0.5, 0.3], [a + tp, 'laser', s ? 0.9 : 0.7, 0.4], [a + tp + 0.01, 'plasma', s ? 0.8 : 0.6, -0.1]]; }).filter(c2 => c2[0] < 7.2), [0.35, 'type', 0.25], [1.0, 'type', 0.25], [1.25, 'type', 0.25], [2.3, 'type', 0.3], [4.0, 'punch', 0.7], [4.3, 'type', 0.3], [4.9, 'type', 0.3]],
};

// ================= S19 · collector → illuminator → reflective mask → projection mirrors (4×) =================
// beam centreline (world) with widths; the mask is at the top, the wafer at the bottom
const BEAM = [[236, 330, 54], [150, 214, 6], [70, 90, 30], [200, -110, 34], [135, -372, 40], [70, -250, 34], [200, -120, 28], [80, 20, 22], [196, 150, 16], [96, 270, 12], [150, 380, 6], [135, 470, 2]];
const MASK_I = 4;
function bandPoly(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return [[a[0] + nx * a[2] / 2, a[1] + ny * a[2] / 2], [b[0] + nx * b[2] / 2, b[1] + ny * b[2] / 2], [b[0] - nx * b[2] / 2, b[1] - ny * b[2] / 2], [a[0] - nx * a[2] / 2, a[1] - ny * a[2] / 2]];
}
function optics(c, t, k) {
  PIX.vgrad(c, -300, -600, 900, 1200, [[0, 'n1'], [0.5, 'n0'], [1, 'p0']]);
  for (let n = 0; n < 40; n++) PIX.rect(c, Math.round(-100 + h(n, 1) * 470), Math.round(-560 + h(n, 2) * 1100), 1, 1, 'n3');
  // collector + intermediate focus aperture
  for (let r = 0; r < 5; r++) { c.save(); c.strokeStyle = P[['p3', 'c1', 'p2', 'c2', 'p3'][r]]; c.lineWidth = 2; c.beginPath(); c.arc(300, 360, 80 - r * 3, Math.PI * 0.75, Math.PI * 1.35); c.stroke(); c.restore(); }
  PIX.rect(c, 120, 210, 20, 8, 'g2'); PIX.rect(c, 158, 210, 20, 8, 'g2');
  PIX.glow(c, 236, 330, 30, 'p4', 0.8); PIX.circ(c, 236, 330, 3, 'w');
  // beam segments; after the mask the light carries the circuit pattern (stripes), shrinking 4× toward the wafer
  for (let i = 0; i < BEAM.length - 1; i++) {
    const poly = PIX.polyPath(bandPoly(BEAM[i], BEAM[i + 1]));
    PIX.fill(c, poly, 'p2', 0.55);
    if (i >= MASK_I) {
      c.save(); c.clip(poly);
      const a = BEAM[i], b = BEAM[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      for (let s = -0.5; s < 0.5; s += 0.125) for (let q = 0; q <= 1; q += 0.02) {
        const w = lerp(a[2], b[2], q), x = lerp(a[0], b[0], q) + nx * w * (s + 0.03), y = lerp(a[1], b[1], q) + ny * w * (s + 0.03);
        PIX.rect(c, Math.round(x), Math.round(y), Math.max(1, Math.round(w * 0.06)), Math.max(1, Math.round(w * 0.06)), 'p4', 0.9);
      }
      c.restore();
    } else PIX.fill(c, PIX.polyPath(bandPoly([BEAM[i][0], BEAM[i][1], BEAM[i][2] * 0.4], [BEAM[i + 1][0], BEAM[i + 1][1], BEAM[i + 1][2] * 0.4])), 'p4', 0.7);
  }
  K.flow(c, BEAM.map(([x, y]) => [x, y]), t, { gap: 26, speed: 220, col: 'w', size: 2 });
  // mirrors at every bounce (multilayer: violet face, cyan highlight)
  for (let i = 2; i < BEAM.length - 1; i++) {
    if (i === MASK_I) continue;
    const [x, y, w] = BEAM[i], a0 = Math.atan2(BEAM[i - 1][1] - y, BEAM[i - 1][0] - x), a1 = Math.atan2(BEAM[i + 1][1] - y, BEAM[i + 1][0] - x), n = (a0 + a1) / 2 + (Math.abs(a0 - a1) > Math.PI ? Math.PI : 0);
    c.save(); c.translate(x, y); c.rotate(n + Math.PI / 2); PIX.flat(c, PIX.rectPath(-w * 0.8 - 6, -3, w * 1.6 + 12, 8, 2), 'p1', 'p0', 'c2', [0, 3], [0, 1]); PIX.rect(c, -w * 0.8 - 8, 5, w * 1.6 + 16, 4, 'g2'); c.restore();
  }
  // reflective mask (reticle) at the top: multilayer mirror with an absorber pattern, scanning sideways
  const mx = 135 + 6 * Math.sin(t * 3);
  K.panel(c, mx - 70, -404, 140, 18, 'g2', 'g1', 'g3'); PIX.rect(c, mx - 50, -386, 100, 8, 'c1');
  for (let s = 0; s < 12; s++) if (h(s, 7) > 0.35) PIX.rect(c, Math.round(mx - 48 + s * 8.2), -386, 5, 8, 'k');
  // wafer at the bottom
  PIX.flat(c, PIX.rectPath(60, 474, 150, 6, 1), 'g4', 'g2', 'g5', [0, 2]); PIX.rect(c, 60, 472, 150, 2, 'o1');
}
function multiLens(c, R, t) {                                      // Mo/Si multilayer: many weak reflections add up in step
  PIX.rect(c, -R, -R, 2 * R, 2 * R, 'n0');
  for (let l = 0; l < 9; l++) PIX.rect(c, -R, 4 + l * 5, 2 * R, 3, l % 2 ? 'b2' : 'g3');
  for (let w = 0; w < 3; w++) {
    const x0 = -R + w * 10;
    for (let s = 0; s < 36; s++) { const x = x0 + s, y = -R + s * 1.2 + 3 * Math.sin(s * 0.7 - t * 14); if (y < 2) PIX.rect(c, Math.round(x), Math.round(y), 1, 1, 'p4'); }
    for (let s = 0; s < 36; s++) { const x = x0 + 30 + s, y = 2 - s * 1.2 + 3 * Math.sin(s * 0.7 - t * 14); PIX.rect(c, Math.round(x), Math.round(y), 1, 1, 'c3'); }
  }
  K.wtext(c, 'Mo', R - 6, -16, 'b2', { align: 'right' }); K.wtext(c, 'Si', R - 6, -7, 'g4', { align: 'right' });   // colour key for the layer stack
}
SC.s19_optics = {
  draw(c, lt) {
    const up = K.inout(lt, 1.4, 2.9), dn = K.inout(lt, 3.9, 5.8), mz = K.inout(lt, 2.9, 3.6) * (1 - K.inout(lt, 3.9, 4.4));
    let k = { x: lerp(196, 135, up), y: lerp(276, -350, up), z: lerp(1.25, 1.1, up) * (1 + 0.4 * mz) };
    k = { x: lerp(k.x, 140, dn), y: lerp(k.y, 400, dn), z: lerp(k.z, 1.0, dn) };
    PIX.cam(c, k); optics(c, lt, k);
    const open = clamp((lt - 0.3) / 0.35) - clamp((lt - 1.5) / 0.3);
    if (open > 0) K.lens(c, 262, 300, 150, 300, 46, open, (c, R) => multiLens(c, R, lt), 'p3');
    c.setTransform(1, 0, 0, 1, 0, 0);
    PIX.label(c, { tx: 12, ty: 30, text: 'Mo/Si MULTILAYER MIRROR', t0: 0.4, t1: 1.6, col: 'p4' }, lt);
    const m = PIX.toScreen(k, 135, -382);
    PIX.label(c, { ax: m[0], ay: m[1] + 6, tx: 14, ty: m[1] + 64, text: 'REFLECTIVE MASK', t0: 2.8, t1: 4.0, col: 'c3', lineCol: 'c2' }, lt);
    PIX.label(c, { tx: 14, ty: m[1] + 76, text: 'CARRIES THE CIRCUIT PATTERN', t0: 3.1, t1: 4.0, col: 'g4' }, lt);
    PIX.label(c, { tx: W - 12, ty: 40, text: 'PATTERN SHRINKS 4×', t0: 4.6, t1: 5.9, col: 'w', align: 'right' }, lt);
  },
  cues: [[-0.3, 'optics', 0.5, 0, 6.4], [0.3, 'lens', 0.4], [0.4, 'type', 0.3], ...[0.5, 1.6, 2.4, 2.9, 4.2, 4.6, 5.0, 5.3, 5.6].map((b, i) => [b, 'mirror', 0.5, (i % 2) * 0.6 - 0.3, i]), [2.8, 'type', 0.3], [4.6, 'type', 0.3]],
};

// ================= S20 · step-and-scan exposure; photons switch the resist chemistry =================
const FW = 22, FH = 28;
const FIELDS = []; for (let j = -4; j <= 4; j++) { const row = []; for (let i = -5; i <= 5; i++) if (Math.hypot(Math.abs(i * FW) + FW / 2, Math.abs(j * FH) + FH / 2) < 118) row.push([i, j]); FIELDS.push(...(j % 2 ? row.reverse() : row)); }
const FT = 0.125;                                                   // seconds per field (16th notes)
function stage(c, t) {
  PIX.vgrad(c, -300, -300, 900, 1100, [[0, 'g1'], [1, 'g0']]);
  K.panel(c, -30, 70, 330, 340, 'g2', 'g1', 'g3', { rivets: true });
  for (let x = -20; x < 300; x += 14) PIX.rect(c, x, 410, 8, 3, 'y0');
  const n = Math.floor(t / FT), cur = FIELDS[Math.min(FIELDS.length - 1, Math.max(0, n))];
  PIX.flat(c, PIX.circPath(135, 240, 128), 'g3', 'g1', 'g4', [3, 3]);                 // chuck
  K.wafer(c, 135, 240, 120, { bg: 'g3' });
  c.save(); c.clip(PIX.circPath(135, 240, 120)); PIX.fill(c, PIX.circPath(135, 240, 120), 'o1', 0.55);   // resist-coated
  FIELDS.forEach(([i, j], idx) => {
    const x = 135 + i * FW - FW / 2, y = 240 + j * FH - FH / 2;
    PIX.rect(c, x, y, FW, 1, 'o0', 0.6); PIX.rect(c, x, y, 1, FH, 'o0', 0.6);
    if (idx < n) { PIX.rect(c, x + 1, y + 1, FW - 1, FH - 1, 'p1', 0.45); for (let s = 3; s < FW - 2; s += 4) PIX.rect(c, x + s, y + 3, 1, FH - 6, 'p3', 0.5); }   // exposed: latent pattern
  });
  if (cur && t < FIELDS.length * FT) {                              // the slit sweeping across the current field
    const q = (t / FT) % 1, [i, j] = cur, x = 135 + i * FW - FW / 2, y = 240 + j * FH - FH / 2 + q * FH;
    PIX.glow(c, x + FW / 2, y, 24, 'p3', 0.8); PIX.rect(c, x - 2, Math.round(y) - 1, FW + 4, 3, 'p4'); PIX.rect(c, x - 2, Math.round(y), FW + 4, 1, 'w');
  }
  c.restore();
}
function resistChem(c, t, a) {
  c.save(); c.globalAlpha = a;
  PIX.vgrad(c, 0, 0, W, H, [[0, 'n0'], [1, 'p0']]);
  PIX.rect(c, 0, 330, W, 150, 'g2'); PIX.rect(c, 0, 316, W, 14, 't2');                  // silicon + film
  for (let x = 4; x < W; x += 10) for (let y = 338; y < H; y += 10) K.ball(c, x + ((y / 10) % 2) * 5, y, 3, 'g3', 'g2', null);
  const open = x => K.wrap(x, 54) < 24;                                                 // mask openings let light through in stripes
  for (let x = 0; x < W; x += 54) { PIX.rect(c, x + 24, 40, 30, 10, 'k'); PIX.rect(c, x, 40, 24, 10, 'c1', 0.6); }
  for (let y = 0; y < 3; y++) for (let x = 0; x < W; x += 9) {           // resist molecules: exposed ones switch colour as photo-acid forms
    const px_ = x + (y % 2) * 4 + 4, py = 270 + y * 14, hit = open(px_) && t > 2.75 + (h(x, y) * 0.9);
    K.ball(c, px_, py, 5, hit ? 'p4' : 'o1', hit ? 'p2' : 'o0', hit ? 'w' : 'y1');
    if (hit && t < 3.4 + h(x, y)) PIX.rect(c, px_ + 4, py - 8, 2, 2, 'y1');
  }
  for (let n = 0; n < 24; n++) {                                    // photons: wiggly violet arrows through the openings
    const x = Math.floor(n / 4) * 54 + 6 + (n % 4) * 5, q = K.wrap(t * 1.6 + h(n, 1), 1), y = 56 + q * 200;
    if (t < 2.6) continue;
    for (let s = 0; s < 8; s++) PIX.rect(c, Math.round(x + Math.sin((y - s * 3) * 0.4) * 2), Math.round(y - s * 3), 1, 2, 'p4', 1 - s / 9);
  }
  c.restore();
}
SC.s20_exposure = {
  draw(c, lt) {
    const fi = Math.min(FIELDS.length - 1, Math.floor(2.4 / FT)), [i, j] = FIELDS[fi];
    const push = MO.cubicInOut(clamp((lt - 2.4) / 0.3));
    const k = { x: lerp(135, 135 + i * FW, push), y: lerp(240, 240 + j * FH, push), z: CAM.zlerp(1, 6, push) };
    PIX.cam(c, k); stage(c, lt); c.setTransform(1, 0, 0, 1, 0, 0);
    const a = clamp((lt - 2.55) / 0.2); if (a > 0) resistChem(c, lt, a);
    PIX.label(c, { tx: 12, ty: 30, text: 'STEP-AND-SCAN EXPOSURE', t0: 0.3, t1: 2.3, col: 'w' }, lt);
    PIX.label(c, { tx: W / 2, ty: 140, text: 'LIGHT CHANGES THE RESIST CHEMISTRY', t0: 3.0, t1: 4.9, col: 'p4', align: 'center' }, lt);
    PIX.label(c, { tx: 12, ty: 420, text: 'EUV: CRITICAL LAYERS', t0: 3.5, t1: 4.9, col: 'c3' }, lt);
    PIX.label(c, { tx: 12, ty: 432, text: 'DUV 193 nm: OTHER LAYERS', t0: 3.8, t1: 4.9, col: 'g4' }, lt);
  },
  cues: [[0, 'scanner', 0.5, 0, 2.5], ...Array.from({ length: 19 }, (_, i) => [i * FT, 'scan_tick', 0.35, (i % 2) * 0.4 - 0.2]), [0.3, 'type', 0.3], [2.4, 'punch', 0.7], [2.75, 'chem', 0.5, 0, 1.6], [3.0, 'type', 0.3], [3.5, 'type', 0.25], [3.8, 'type', 0.25]],
};

// ================= S21 · develop → plasma etch → strip (cross-section) =================
const LINES = [[18, 44], [78, 104], [138, 164], [198, 224]];        // resist lines that stay (x ranges)
const covered = x => LINES.some(([a, b]) => x >= a && x < b);
function etchView(c, t) {
  const dev = K.sm(t, 0.3, 1.5), etch = K.sm(t, 1.9, 3.9), strip = K.sm(t, 4.0, 5.0);
  PIX.vgrad(c, 0, 0, W, H, [[0, 'n0'], [1, 'n1']]);
  const plasma = K.sm(t, 1.7, 2.2) * (1 - K.sm(t, 3.7, 4.1));      // the chamber lights up (and goes out) smoothly
  if (plasma > 0) { PIX.glow(c, W / 2, 40, 260, 'p2', 0.5 * plasma); PIX.rect(c, 0, 0, W, 50, 'p1', 0.35 * plasma); }
  const filmTop = 300, siTop = 330, depth = etch * 90;
  for (let x = 0; x < W; x += 2) {                                   // film + silicon, cut away where the etch reaches
    const open = !covered(x) || t < 1.9;
    const cutF = open && t >= 1.9 ? Math.min(30, depth) : 0, cutS = open && t >= 1.9 ? Math.max(0, depth - 30) : 0;
    PIX.rect(c, x, filmTop + cutF, 2, Math.max(0, siTop - filmTop - cutF), 't2');
    PIX.rect(c, x, siTop + cutS, 2, H - siTop - cutS, 'g2');
  }
  for (let x = 4; x < W; x += 10) for (let y = siTop + 8; y < H; y += 10) if (covered(x) || y > siTop + depth - 30 + 4) K.ball(c, x, y, 3, 'g3', 'g2', null);
  // resist: exposed parts dissolve in developer; remaining lines are ashed off in the strip step
  for (let x = 0; x < W; x += 2) {
    const keep = covered(x), hgt = keep ? 26 * (1 - strip) - etch * 3 : 26 * (1 - dev);
    if (hgt > 0) { PIX.rect(c, x, filmTop - hgt, 2, hgt, keep ? 'o1' : 'p4'); PIX.rect(c, x, Math.round(filmTop - hgt), 2, 1, keep ? 'y1' : 'w'); }
  }
  const devBath = K.sm(t, 0.2, 0.45) * (1 - K.sm(t, 1.4, 1.75));    // developer puddle: flows in, then is rinsed away
  if (devBath > 0) { PIX.rect(c, 0, 240, W, 34, 'c1', 0.35 * devBath); for (let n = 0; n < 20; n++) { const q = K.wrap(t * 1.2 + h(n, 1), 1); if (!covered(h(n, 2) * W)) PIX.circ(c, h(n, 2) * W, 270 - q * 40, 1.5, 'p4', (1 - q) * devBath); } }
  if (t > 1.9 && t < 4.0) for (let n = 0; n < 40; n++) {             // ions fall straight down (anisotropic etch)
    const x = Math.floor(h(n, 3) * 27) * 10 + 5, q = K.wrap(t * 2.2 + h(n, 4), 1), y = 50 + q * (filmTop + depth - 50);
    if (covered(x) && y > filmTop - 30) continue;
    PIX.rect(c, x, Math.round(y), 1, 5, 'p4'); PIX.rect(c, x, Math.round(y) + 5, 1, 2, 'w');
  }
  if (t > 4.0 && t < 5.2) for (let n = 0; n < 16; n++) { const q = K.wrap(t * 1.5 + h(n, 5), 1); PIX.circ(c, LINES[n % 4][0] + 13, 270 - q * 60, 2, 'o1', 1 - q); }   // ashed resist leaving
}
SC.s21_etch = {
  draw(c, lt) {
    const z = 1 + 0.06 * K.sm(lt, 0, 6);
    PIX.cam(c, { x: 135, y: 260, z }); c.setTransform(1, 0, 0, 1, 0, 0);
    etchView(c, lt);
    PIX.label(c, { tx: 12, ty: 30, text: 'DEVELOP: EXPOSED RESIST DISSOLVES', t0: 0.3, t1: 1.55, col: 'c3' }, lt);   // each caption is fully erased before the next types in
    PIX.label(c, { tx: 12, ty: 30, text: 'PLASMA ETCH: IONS CUT STRAIGHT DOWN', t0: 2.05, t1: 3.6, col: 'p4' }, lt);
    PIX.label(c, { tx: 12, ty: 30, text: 'STRIP: RESIST REMOVED', t0: 4.15, t1: 5.6, col: 'o1' }, lt);
    PIX.label(c, { ax: 125, ay: 314, tx: 120, ty: 200, text: 'PATTERNED FILM', t0: 4.9, t1: 5.8, col: 't2', lineCol: 't2' }, lt);
  },
  cues: [[0.2, 'fizz', 0.6, 0, 1.6], [0.3, 'type', 0.3], [1.9, 'plasma_hum', 0.6, 0, 2.1], ...Array.from({ length: 16 }, (_, i) => [2.0 + i * 0.125, 'ion_tick', 0.3, (i % 3 - 1) * 0.4]), [2.0, 'type', 0.3], [4.0, 'ash', 0.5, 0, 1.2], [4.1, 'type', 0.3], [4.9, 'type', 0.25]],
};

// ================= S22 · ion implantation (mass-selected), then anneal =================
function implanter(c, t) {
  PIX.vgrad(c, -300, -300, 900, 1300, [[0, 'g0'], [1, 'k']]);
  K.panel(c, 10, 20, 70, 60, 'g2', 'g1', 'g3', { rivets: true }); PIX.glow(c, 45, 50, 30, 'm1', 0.6); PIX.rect(c, 30, 44, 30, 12, 'm1', 0.8);   // ion source
  // analyzer magnet: beam bends; heavy ions bend less, light ions more; only the chosen mass exits the slit
  PIX.flat(c, PIX.rectPath(80, 30, 120, 120, 30), 'r2', 'r1', 'o0', [4, 4]); PIX.rect(c, 96, 46, 88, 88, 'k');
  const arc = (r, col, len) => { c.save(); c.strokeStyle = P[col]; c.lineWidth = 2; c.beginPath(); c.arc(80, 140, r, -Math.PI / 2, -Math.PI / 2 + len); c.stroke(); c.restore(); };
  PIX.line(c, 60, 50, 80, 50, 'w', 2);
  arc(90, 'y1', 1.57); arc(70, 'g4', 0.9); arc(110, 'c2', 0.7);
  for (let n = 0; n < 6; n++) { const a = -Math.PI / 2 + K.wrap(t * 1.5 + n / 6, 1) * 1.57; PIX.circ(c, 80 + Math.cos(a) * 90, 140 + Math.sin(a) * 90, 2, 'w'); }
  PIX.rect(c, 160, 140, 18, 4, 'g3'); PIX.rect(c, 182, 140, 18, 4, 'g3');                    // resolving slit
  // accelerator column down to the wafer
  for (let r = 0; r < 8; r++) PIX.flat(c, PIX.rectPath(156, 170 + r * 22, 48, 10, 3), 'g3', 'g1', 'g4', [2, 2]);
  K.flow(c, [[170, 144], [170, 330], [140 + 60 * Math.sin(t * 7), 420]], t, { gap: 10, speed: 200, col: 'y1', size: 2 });
  PIX.line(c, 170, 144, 170, 330, 'y0', 1, 0.6);
}
function dopeView(c, t, ox, oy) {
  // wafer cross-section: gate structure masks the channel; dopants land in source and drain
  const dose = K.sm(t, 1.8, 3.9), anneal = t > 4.55;
  PIX.rect(c, ox - 140, oy, 280, 120, 'g2');
  for (let x = -136; x < 140; x += 10) for (let y = 6; y < 120; y += 10) K.ball(c, ox + x, oy + y, 3, 'g3', 'g2', null);
  for (const [a, b] of [[-130, -30], [30, 130]]) {                 // source / drain doped regions grow, then heal on anneal
    const g = PIX.polyPath([[ox + a, oy], [ox + b, oy], [ox + b - 6, oy + 44 * dose], [ox + a + 6, oy + 44 * dose]]);
    PIX.fill(c, g, 'y0', 0.55 * dose); if (!anneal) for (let n = 0; n < 30 * dose; n++) PIX.rect(c, Math.round(ox + a + h(n, a) * (b - a)), Math.round(oy + h(n, b) * 40 * dose), 2, 2, 'y1');
  }
  PIX.flat(c, PIX.rectPath(ox - 26, oy - 40, 52, 40, 2), 'c1', 'c0', 'c3', [3, 3]);       // gate stack (mask for self-aligned implant)
  PIX.rect(c, ox - 30, oy - 4, 60, 4, 'p3');
  for (let n = 0; n < 26; n++) {                                     // incoming ions
    if (t < 1.6 || t > 4.3) break;
    const x = ox - 136 + h(n, 1) * 272, q = K.wrap(t * 2.4 + h(n, 2), 1), y = oy - 140 + q * 150;
    if (Math.abs(x - ox) < 28 && y > oy - 44) continue;
    PIX.rect(c, Math.round(x), Math.round(y), 2, 2, 'y1'); PIX.rect(c, Math.round(x), Math.round(y) - 4, 1, 4, 'y0', 0.6);
  }
}
SC.s22_implant = {
  draw(c, lt) {
    const dn = K.inout(lt, 1.2, 2.6);
    const k = { x: lerp(120, 150, dn), y: lerp(170, 420, dn), z: lerp(1.15, 1.0, dn) };
    PIX.cam(c, k); implanter(c, lt); dopeView(c, lt, 150, 470);
    c.setTransform(1, 0, 0, 1, 0, 0);
    PIX.label(c, { tx: 12, ty: 30, text: 'ION IMPLANTER', t0: 0.2, t1: 1.6, col: 'w' }, lt);
    const mg = PIX.toScreen(k, 160, 70); PIX.label(c, { ax: mg[0], ay: mg[1], tx: 120, ty: mg[1] + 110, text: 'MAGNET PICKS ONE ION MASS', t0: 0.5, t1: 1.8, col: 'y1', lineCol: 'y0', align: 'center' }, lt);
    PIX.label(c, { tx: 12, ty: 30, text: 'DOPANTS: P · As · B', t0: 2.4, t1: 4.2, col: 'y1' }, lt);
    const sd = PIX.toScreen(k, 70, 486); PIX.label(c, { ax: sd[0], ay: sd[1], tx: 14, ty: sd[1] - 70, text: 'SOURCE / DRAIN', t0: 3.0, t1: 4.4, col: 'y0', lineCol: 'y0' }, lt);
    PIX.label(c, { tx: W / 2, ty: 60, text: 'ANNEAL', t0: 4.3, t1: 5.2, col: 'w', align: 'center', sc: 2 }, lt);
  },
  cues: [[0, 'implanter', 0.5, 0, 4.4], [0.2, 'type', 0.3], [0.5, 'type', 0.3], ...Array.from({ length: 10 }, (_, i) => [1.8 + i * 0.25, 'ion_zip', 0.4, (i % 2) * 0.5 - 0.25]), [2.4, 'type', 0.3], [3.0, 'type', 0.3], [4.3, 'type', 0.3]],
};
})();
