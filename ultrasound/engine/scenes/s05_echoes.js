// S05 (22–31 s) — echoes. A column along one scan line through the fetal skull (depths from the model, line 28):
// skin, fat, muscle, uterine wall, amniotic fluid, fetal skin, skull, brain, skull, fluid, placenta. The pulse goes
// down; at every boundary part of it turns back (pressure ratio R = (Z₂ − Z₁)/(Z₂ + Z₁)) and the rest goes on, weaker.
// Bars on the right show each echo's strength at the probe (|R| times what was lost on the way down and back);
// the labels give the reflected share of the sound at that boundary, R². Fluid has no echoes inside it; bone sends back
// a third of the sound and absorbs much of the rest, so what lies beyond it is in shadow.
(() => {
const S = SC.s05_echoes = {};
const V = 1.69, T0 = 0.3, HW = 0.7;                       // HW: half-width of the drawn column (cm)                                  // drawn speed (cm/s) and the moment the pulse leaves the face
const LAYERS = [[0, 0.16, 'skin'], [0.16, 1.55, 'fat'], [1.55, 2.6, 'muscle'], [2.6, 3.59, 'uterus'], [3.59, 5.14, 'fluid'], [5.14, 5.41, 'fskin'],
  [5.41, 5.63, 'bone'], [5.63, 8.57, 'brain'], [8.57, 8.79, 'bone'], [8.79, 10.5, 'fluid'], [10.5, 11.36, 'placenta'], [11.36, 12.6, 'uterus']];
const Z = id => US.TIS[US.TI[id === 'fskin' ? 'fskin' : id]].Z;
// boundaries with their reflection, the pulse left after them, and the echo that gets back to the probe
const BOUNDS = (() => {
  const out = []; let Tdown = 1, prev = 'gel';
  for (const [d0, d1, id] of LAYERS) {
    const R = (Z(id) - Z(prev)) / (Z(id) + Z(prev)), back = Math.abs(R) * Tdown * Tdown;
    out.push({ d: d0, R, RI: R * R, A: back, T: Tdown, id });
    Tdown *= Math.sqrt(1 - R * R);
    if (id === 'bone') Tdown *= Math.exp(-3.5 * (d1 - d0));                       // absorbed in the bone
    out[out.length - 1].Tafter = Tdown;
    prev = id;
  }
  return out;
})();
S.BOUNDS = BOUNDS;
const tHit = d => T0 + d / V, tBack = d => T0 + 2 * d / V;
const pulseD = lt => (lt - T0) * V;
const ampAt = d => { let a = 1; for (const b of BOUNDS) if (b.d <= d) a = b.Tafter; return a; };
S.cam = lt => {
  const track = { x: 5 / 60, y: Math.max(1.2, pulseD(Math.min(lt, 4)) - 1.5), z: 60 }, wide = { x: 30 / 30, y: 4.53, z: 30 };
  if (lt < 4) return track;
  // in the wide shot the column sits left of centre, so the notes on its right stay clear of the frame's right edge
  if (lt < 7.6) { const e = MO.k75(U.clamp((lt - 4) / 1.4)), zz = K.zl(60, 30, e); return { x: U.lerp(5, 30, e) / zz, y: U.lerp(track.y, wide.y, e), z: zz }; }
  return K.zoomPath(wide, { x: 0, y: -0.25, z: 150 }, MO.cubicIn(U.clamp((lt - 7.6) / 1.4)));
};
const PH = US.phi(28), VIEW_Y = 92;
// the column is the real slice along scan line 28 (the same model as the image), turned so the line runs straight down
const inStrip = (bx, bz) => { const r = bz + US.RP, along = bx * Math.sin(PH) + r * Math.cos(PH), perp = bx * Math.cos(PH) - r * Math.sin(PH); return Math.abs(perp) <= HW && along >= US.RP && along <= US.RP + 12.6; };
const NAMES = [[0.08, 'SKIN'], [0.85, 'FAT'], [2.07, 'MUSCLE'], [3.1, 'UTERINE WALL'], [4.36, 'FLUID'], [5.05, 'FETAL SKIN'], [5.55, 'SKULL'], [7.1, 'BRAIN']];
const PCT = b => b.RI >= 0.1 ? Math.round(b.RI * 100) + '%' : b.RI >= 0.0095 ? (b.RI * 100).toFixed(0) + '%' : b.RI >= 0.001 ? (b.RI * 100).toFixed(1) + '%' : '<0.1%';
// a few crest lines of a pulse travelling in the column (depth d of the leading crest, amplitude a)
const fronts = (c, cam, d, a, dir, kind, dmin, dmax) => {
  const lam = 0.2;
  for (let n = 0; n < 3; n++) {
    const dd = d - dir * n * lam, aa = a * [1, 0.45, 0.17][n];
    if (dd < dmin || dd > dmax || aa < 0.02) continue;
    const vis = Math.min(1, Math.sqrt(aa / 0.6) * 1.4);
    const col = kind === 'tx' ? (vis > 0.7 ? 'w' : vis > 0.4 ? 'y4' : 'y3') : (vis > 0.6 ? 'y4' : vis > 0.3 ? 'y3' : 'y2');
    const [x0, y] = K.S(cam, -HW, dd), x1 = K.S(cam, HW, dd)[0];
    if (y < VIEW_Y + 2) continue;
    PIX.rect(c, Math.round(x0) + 1, Math.round(y) - 1, Math.round(x1 - x0) - 2, 2, col);
    if (n === 0) { const cx = Math.round((x0 + x1) / 2); for (let k = 1; k <= 3; k++) { const yy = Math.round(y) - 1 + dir * (k + 1) + (dir < 0 ? 1 : 0); PIX.rect(c, cx - (4 - k), yy, 1, 1, col); PIX.rect(c, cx + (4 - k), yy, 1, 1, col); } PIX.rect(c, cx, Math.round(y) - 1 + dir * 5 + (dir < 0 ? 1 : 0), 1, 1, col); }
  }
};
S.draw = (c, lt, info) => {
  const t = info ? info.t : 22 + lt, cam = S.cam(lt), z = cam.z;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PIX.P.n0; c.fillRect(0, 0, PIX.W, PIX.H); c.restore();
  // depth grid behind the column
  for (let d = 0; d <= 12; d++) { const y = Math.round(K.S(cam, 0, d)[1]); if (y >= VIEW_Y) PIX.rect(c, 0, y, PIX.W, 1, d % 5 ? 'n1' : 'n2'); }
  US.drawAnatomy(c, cam, 0, -US.RP, 1, { t: 0, rot: PH, full: true, inside: inStrip, clip: [0, VIEW_Y, PIX.W, PIX.H] });
  // the probe face at the top of the column
  c.save(); c.beginPath(); c.rect(0, VIEW_Y, PIX.W, PIX.H); c.clip();
  PIX.cam(c, cam);
  ROOM.FL(c, z, PIX.rectPath(-1.5, -0.62, 3, 0.62, 0.1), 'ga', 'g8', 'gb', 1.5, 1);
  PIX.fill(c, PIX.rectPath(-1.4, -0.14, 2.8, 0.14), 'g3');
  c.restore(); c.setTransform(1, 0, 0, 1, 0, 0);
  // the pulse going down, and the echo coming back from every boundary it has passed
  const dp = pulseD(lt);
  if (dp > -0.1) fronts(c, cam, dp, ampAt(dp), 1, 'tx', 0, 12.6);
  for (const b of BOUNDS) {
    if (lt < tHit(b.d)) continue;
    const de = b.d - (lt - tHit(b.d)) * V;
    if (de > -0.05) fronts(c, cam, de, b.A, -1, 'echo', 0, b.d);
  }
  // names on the left, echo bars and shares on the right
  const xl = Math.round(K.S(cam, -HW, 0)[0]) - 5, xr = Math.round(K.S(cam, HW, 0)[0]) + 6;
  for (const [d, s] of NAMES) {
    const y = Math.round(K.S(cam, 0, d)[1]) - 3; if (y < VIEW_Y + 2 || y > 470 || xl - PIX.textWidth(s) < 2) continue;
    PIX.label(c, { tx: xl, ty: y, text: s, t0: tHit(Math.max(0, d - 0.2)) - 0.1, t1: 99, col: 'g9', align: 'right' }, lt);
  }
  let lastY = -99;
  BOUNDS.forEach((b, i) => {
    if (i === 0 || i > 6 || lt < tHit(b.d)) return;
    const y = Math.round(K.S(cam, 0, b.d)[1]), grow = MO.backOut(U.clamp((lt - tHit(b.d)) / 0.3), 2.2), L = Math.max(1, Math.round(b.A * 90 * grow));
    if (y < VIEW_Y + 4 || y > 472) return;
    PIX.rect(c, xr, y - 1, L, 3, b.A > 0.3 ? 'y4' : 'y3');
    if (i <= 6) { const ty = Math.max(y - 3, lastY + 9); PIX.text(c, PCT(b), xr + L + 4, ty, b.A > 0.3 ? 'y4' : 'g9', { n: Math.floor((lt - tHit(b.d)) * PIX.RATE) }); lastY = ty; }
  });
  CAP.scene(c, lt, { title: 'ECHOES', ctx: ['DIFFERENT TISSUES REFLECT', 'SOUND DIFFERENTLY.'], t0: 0.15, t1: 7.5 });
  const fl = K.S(cam, HW, 4.36), br = K.S(cam, HW, 7.1), sb = K.S(cam, HW, 5.41), xn = xr + 2;
  CAP.note(c, lt, { ax: fl[0] + 1, ay: fl[1], x: xn, y: fl[1] - 3, text: 'NO ECHOES IN FLUID', t0: 5.6, t1: 7.5, col: 'g9', lineCol: 'g5', box: true });
  CAP.note(c, lt, { ax: br[0] + 1, ay: br[1], x: xn, y: br[1] + 6, text: 'WEAKER BEHIND BONE', t0: 6.0, t1: 7.5, col: 'g9', lineCol: 'g5', box: true });
  CAP.note(c, lt, { x: xn, y: Math.max(sb[1] + 12, VIEW_Y + 4), text: 'BIG IMPEDANCE JUMP', t0: 4.4, t1: 7.5, col: 'y4', box: true });
  CAP.note(c, lt, { x: xn, y: Math.max(sb[1] + 23, VIEW_Y + 15), text: '= STRONG ECHO', t0: 4.55, t1: 7.5, col: 'y4', box: true });
};
S.cues = () => {
  const out = [];
  BOUNDS.forEach((b, i) => { if (i <= 9 && tHit(b.d) < 9) out.push([tHit(b.d), 'bounce', Math.min(1, 0.25 + Math.sqrt(b.A) * 1.0)]); if (i <= 6 && tBack(b.d) < 9) out.push([tBack(b.d), 'ret', Math.min(1, 0.3 + Math.sqrt(b.A))]); });
  out.push([4.0, 'sweep', 0.6], [7.6, 'whoosh', 0.7]);
  return out;
};
})();
