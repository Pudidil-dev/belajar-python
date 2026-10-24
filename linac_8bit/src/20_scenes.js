'use strict';
// ============================================================================
// MASTER TIMELINE: 29 scenes, 0-105 s, renderFrame(t) is a pure function of t.
// Every particle, trail and dose map is reconstructed from t (seek-safe).
// ============================================================================
const BEAT = 60 / 128;
const bt = n => n * BEAT;
function engineInit() { cmapInit(); marksInit(); doseInit(); flightsInit(); trackInit(); }
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) return lerp(a[1], b[1], (b[2] || K75)(seg(t, a[0], b[0]))); }
  return keys[keys.length - 1][1];
}
const LBL_Y = 34;   // standard label row (safe top 30)

// ---------------------------------------------------------------- scale chain
let CH_TR = [[17, 24], [105, 140], [470, 620], [1700, 2300]];
function chainLayer(name, M, cx, cy, t, o) {
  const ox = CX - cx * M, oy = CY - cy * M;
  switch (name) {
    case 'room': drawRoom(new Cam(cx, cy, M), t, o.room || {}); break;
    case 'body': { clear(P.BG); const v = { ox, oy, s: M }; drawCouchTop(v, false); renderBody(v, o.body || {}); if (o.bodyFx) o.bodyFx(v); break; }
    case 'tissue': drawTissue({ ox, oy, s: M * U_T }, o.tissue || {}); break;
    case 'cell': drawCell({ ox, oy, s: M * U_C }, o.cell || {}); break;
    case 'nucleus': drawNucleus({ ox: CX + (NUC_OFF[0] - cx) * M, oy: CY + (NUC_OFF[1] - cy) * M, s: M * U_N }, o.nuc || {}); break;
    case 'dna': dnaBackdrop(); drawDNA({ ox: CX + (NUC_OFF[0] - cx) * M, oy: CY + (NUC_OFF[1] - cy) * M, s: M * U_D }, o.dna || {}); break;
  }
}
function drawChain(M, cx, cy, t, o) {
  const tr = o.tr || CH_TR;
  const names = [o.outer || 'body', 'tissue', 'cell', 'nucleus', 'dna'];
  let i = 0; while (i < tr.length && M >= tr[i][1]) i++;
  if (i < tr.length && M > tr[i][0]) {
    const k = (Math.log(M) - Math.log(tr[i][0])) / (Math.log(tr[i][1]) - Math.log(tr[i][0]));
    withBuffer(CHAINBUF, () => chainLayer(names[i], M, cx, cy, t, o));
    chainLayer(names[i + 1], M, cx, cy, t, o);
    dissolve(CHAINBUF, buf, smooth(k), buf);
  } else chainLayer(names[i], M, cx, cy, t, o);
}
function dnaBackdrop() {
  clear(P.L0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bay(x, y) < 0.18) buf[y * W + x] = P.L1;
}
const sxB = (c, lx) => CX + (lx - c.cx) * c.z, syB = (c, ly) => CY + (ly - c.cy) * c.z;

// opening dive / pull-out camera (0-8 s), body units
const DIVE = [[0, 34, 4, 1.15], [1.3, 31, 3.6, 1.22, eio], [2.0, 18, 2, 1.55, eio], [2.32, 10, 1, 1.85, eio],
  [3.66, NUC_OFF[0], NUC_OFF[1], 2400], [5.0, NUC_OFF[0], NUC_OFF[1], 2650, eio], [5.3, NUC_OFF[0], NUC_OFF[1], 2650],
  [6.95, 0, 8.5, 0.62], [8.0, 0, 8.5, 0.64, eio]];
function dnaPreview(t) {
  const hit = 3.96;
  if (t < hit) return { ph: t * 0.7 };
  const k = backOut(seg(t, hit, hit + 0.38), 1.6);
  return { ph: t * 0.7, breaks: [{ x: -1, strand: 0 }, { x: 4.5, strand: 1 }], split: { x: 1.8, dx: 6 * k, dy: 4 * k, rot: 0.12 * k } };
}
// ---------------------------------------------------------------- S01 hook
function s01(t) {
  const c = camTrack(DIVE, t);
  const wipe = K75(seg(t, 0.1, 0.6)), wx = lerp(6, 264, wipe);
  const tx = sxB(c, 0), ty = syB(c, 0);
  chainLayer('body', c.z, c.cx, c.cy, t, { body: { style: 'illus', tumorR: TUMOR_R1, ghostR: TUMOR_R0, ghostPhase: t * 10 } });
  if (wipe < 1) {
    withBuffer(TMPBUF, () => chainLayer('body', c.z, c.cx, c.cy, t, { body: { style: 'illus', tumorR: TUMOR_R0 } }));
    const x0 = Math.max(0, Math.ceil(wx));
    for (let y = 0; y < H; y++) for (let x = x0; x < W; x++) buf[y * W + x] = TMPBUF[y * W + x];
    if (wipe > 0) { rect(wx - 3, 0, wx + 3, H, P.C3, 0.3); rect(wx - 1, 0, wx + 1, H, P.C6); }
  }
  const lu = seg(t, 1.5, 2.0);
  if (lu > 0) { ring(tx, ty, TUMOR_R1 * c.z + 3 + 2 * lu, 1, P.R4, 0.6 * lu); ring(tx, ty, TUMOR_R1 * c.z + 7 + 4 * lu, 1, P.R2, 0.4 * lu); }
  callout({ text: 'WEEKS LATER', x: 18, y: 92, ax: tx, ay: ty - TUMOR_R1 * c.z - 3, t0: 0.24 }, t);
  if (t > 0.24) calendarIcon(18 + textW(FL, 'WEEKS LATER', 2) + 8, 89, seg(t, 0.24, 0.62) * 0.999);
}
// ---------------------------------------------------------------- S02 DNA damage preview
function s02(t) {
  const c = camTrack(DIVE, t);
  const lu = seg(t, 2.0, 2.32) * (1 - seg(t, 2.6, 2.9));
  drawChain(c.z, c.cx, c.cy, t, {
    outer: 'body', body: { style: 'illus', tumorR: TUMOR_R1 },
    bodyFx: v => { if (lu > 0) { ring(v.ox, v.oy, TUMOR_R1 * v.s + 3 + 3 * lu, 1, P.R4, 0.7 * lu); ring(v.ox, v.oy, TUMOR_R1 * v.s + 8 + 5 * lu, 1, P.R2, 0.5 * lu); } },
    tissue: { R: TUMOR_R1 / U_T, hl: true }, cell: { hl: seg(t, 2.9, 3.2) * (1 - seg(t, 3.3, 3.5)) }, dna: dnaPreview(t),
  });
  // secondary electron track through the helix (direct hit preview)
  const u = seg(t, 3.72, 4.2);
  if (u > 0 && u < 1) {
    const x = lerp(48, 222, u), y = lerp(126, 354, u);
    electron(x, y, 174, 228, { trail: 22, c0: P.S0, c1: P.S1, c2: P.S2, c3: P.S3, r: 1.6 });
  }
  const hk = seg(t, 3.96, 4.2);
  if (hk > 0 && hk < 1) { glow(137, 240, 22 * (1 - hk), P.C3, P.C6, 1 - hk); }
  callout({ text: 'DNA DAMAGE', x: 18, y: 96, ax: 137, ay: 222, t0: 4.04 }, t);
}
// ---------------------------------------------------------------- S03 pull-out to the LINAC
function s03(t) {
  const c = camTrack(DIVE, t);
  drawChain(c.z, c.cx, c.cy, t, { outer: 'room', room: { phi: 0, tumorR: TUMOR_R0 }, tissue: { R: TUMOR_R0 / U_T }, dna: dnaPreview(t) });
  const hx = sxB(c, 0), hy = syB(c, -RM.armR0) - 2;
  callout({ text: 'HOW DOES IT WORK?', x: 18, y: 52, ax: hx, ay: hy, t0: 6.95 }, t);
}
// ---------------------------------------------------------------- planning (S04, S05)
const PLAN_V = { ox: 135 - 34 * 1.05, oy: 208, s: 1.05 };
function drawPlanning(t, ph) {
  clear(P.BG);
  rect(0, 352, W, H, P.N1); rect(0, 352, W, 353, P.N3);
  rect(0, 0, W, 90, P.N1, 0.5);
  drawMonitor(MON.x0, MON.y0, MON.x1, MON.y1, MSCR, 24);
  renderBody(PLAN_V, { style: 'ct', tumorR: TUMOR_R0, dose: ph.dose, doseReveal: ph.reveal, clip: [MSCR[0], MSCR[1] + 12, MSCR[2], MSCR[3]] });
  planChrome(MSCR, t, ph.tool);
  let pen = null;
  if (ph.contour > 0) pen = tracedContour(PLAN_V, TUMOR_R0 + 1.3, P.R3, ph.contour);
  if (ph.oar > 0) {
    const cx = PLAN_V.ox + BODY.BX * PLAN_V.s, cy = PLAN_V.oy + (BODY.BY + 49) * PLAN_V.s, r = 6.5 * PLAN_V.s;
    const n = Math.floor(24 * ph.oar);
    for (let i = 0; i < n; i += 2) { const a0 = i / 24 * TAU, a1 = (i + 1) / 24 * TAU; line(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, P.INK); }
  }
  if (ph.arc > 0) { // VMAT arc indicator + converging beam directions (planning graphics, not radiation)
    const r = 82, n = Math.floor(60 * ph.arc);
    for (let i = 0; i < n; i++) if (i % 2 === 0) { const a = -Math.PI / 2 + i / 60 * TAU; pset(PLAN_V.ox + Math.cos(a) * r, PLAN_V.oy + Math.sin(a) * r, P.SUB); }
    if (n > 0) { const a = -Math.PI / 2 + n / 60 * TAU; disc(PLAN_V.ox + Math.cos(a) * r, PLAN_V.oy + Math.sin(a) * r, 2.5, P.INK); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2; if (i / 8 > ph.arc) break; dashLine(PLAN_V.ox + Math.cos(a) * r, PLAN_V.oy + Math.sin(a) * r, PLAN_V.ox + Math.cos(a) * 18, PLAN_V.oy + Math.sin(a) * 18, P.N6, 2, 3, t * 12); }
  }
  clinician(58, 356, 1.0);
  return pen;
}
function s04(t) {
  const contour = seg(t, 8.75, 9.95), oar = seg(t, 10.15, 10.6);
  const pen = drawPlanning(t, { tool: t < 10.05 ? 0 : 1, contour, oar });
  // cursor path
  const tb = [MSCR[0] + 8, MSCR[1] + 6];
  let cx, cy;
  if (t < 8.75) { const k = K75(seg(t, 8.25, 8.55)), k2 = K75(seg(t, 8.55, 8.75)); cx = lerp(lerp(200, tb[0], k), PLAN_V.ox, k2); cy = lerp(lerp(280, tb[1], k), PLAN_V.oy - 16, k2); }
  else if (t < 9.95) { cx = pen[0]; cy = pen[1]; }
  else { const cord = [PLAN_V.ox + BODY.BX * PLAN_V.s + 7, PLAN_V.oy + (BODY.BY + 49) * PLAN_V.s]; const k = K75(seg(t, 9.95, 10.15)); cx = lerp(pen ? pen[0] : PLAN_V.ox, cord[0], k); cy = lerp(pen ? pen[1] : PLAN_V.oy, cord[1], k); }
  cursor(cx, cy);
  callout({ text: 'TREATMENT PLANNING', x: 18, y: LBL_Y + 18, ax: PLAN_V.ox, ay: PLAN_V.oy - 18 * PLAN_V.s, t0: 8.28 }, t);
}
function s05(t) {
  const arc = seg(t, 11.2, 11.95);
  const rv = t < 11.95 ? 9 : Math.ceil(lerp(6, 0, seg(t, 11.95, 13.05)));
  const pen = drawPlanning(t, { tool: 2, contour: 1, oar: 1, arc: arc * (1 - seg(t, 12.6, 13.0)), dose: t >= 11.95 ? 1 : null, reveal: rv });
  cursor(lerp(MSCR[0] + 34, 210, K75(seg(t, 11.0, 11.4))), lerp(MSCR[1] + 6, 270, K75(seg(t, 11.0, 11.4))));
  callout({ text: 'PLANNED DOSE', x: 18, y: LBL_Y + 18, ax: PLAN_V.ox, ay: PLAN_V.oy - 16 * PLAN_V.s, t0: 11.25 }, t);
}
// ---------------------------------------------------------------- room scenes (S06, S07)
const ROOM_A = [[14.0, 20, -10, 0.75], [17.0, 20, -10, 0.77, eio], [17.42, 0, 2, 0.62], [20.0, 0, 2, 0.63, eio]];
function alignOff(t) {
  const y = lerp(8, -1, K75(seg(t, 14.75, 15.5)));
  const x = lerp(12, 2, K75(seg(t, 15.62, 16.32)));
  const igx = K75(seg(t, 18.7, 19.2));
  return [lerp(x, 0, igx), lerp(y, 0, igx)];
}
function s06(t) {
  const cam = camTrack(ROOM_A, t), off = alignOff(t);
  const lz = seg(t, 14.3, 14.55);
  drawRoom(cam, t, { phi: 0, off, lasers: lz, tattoo: true, tumorR: TUMOR_R0 });
  const lk = seg(t, 16.36, 16.6);
  if (lk > 0) for (const key of ['L', 'R', 'A']) {
    const [lx, ly] = MARKS[key]; const x = cam.x(lx + off[0]), y = cam.y(ly + off[1]);
    ring(x, y, 3 + 6 * backOut(lk, 2), 1, P.G2, 1 - 0.6 * seg(t, 16.6, 17.0));
  }
  const [ax, ay] = MARKS.A;
  callout({ text: 'PATIENT ALIGNMENT', x: 18, y: LBL_Y + 4, ax: cam.x(ax + off[0]), ay: cam.y(ay + off[1]) - 3, t0: 14.35 }, t);
}
function igInset(t, x0, y0) { // kV image with reference outline registering
  const k = backOut(seg(t, 18.12, 18.42), 1.4); if (k <= 0) return;
  const w = Math.round(98 * k), h = Math.round(80 * k);
  const x1 = x0 + w, y1 = y0 + h;
  rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1, P.SH); rect(x0, y0, x1, y1, P.CT0); frame(x0, y0, x1, y1, P.C3);
  if (k < 0.98) return;
  // projection-like image: soft body, spine column, tumour blob
  for (let y = y0 + 2; y < y1 - 2; y++) for (let x = x0 + 2; x < x1 - 2; x++) {
    const u = (x - x0) / w, v = (y - y0) / h;
    let c = P.CT1;
    if (Math.abs(u - 0.5) < 0.42) c = P.CT2;
    if (Math.abs(u - 0.57) < 0.06) c = (y & 3) === 0 ? P.CT4 : P.CT5;      // spine
    if (Math.abs(u - 0.36) < 0.13 && Math.abs(v - 0.5) < 0.38) c = c === P.CT2 ? P.CT1 : c; // lung
    if (Math.hypot(u - 0.33, (v - 0.46) * 0.8) < 0.08) c = P.CT4;          // tumour
    buf[y * W + x] = c;
  }
  const reg = K75(seg(t, 18.7, 19.2));
  const dx = lerp(6, 0, reg), dy = lerp(-4, 0, reg);
  const cx = x0 + 0.33 * w + dx, cy = y0 + 0.46 * h + dy;
  for (let i = 0; i < 20; i++) if (i % 2 === 0) { const a0 = i / 20 * TAU, a1 = (i + 1) / 20 * TAU; line(cx + Math.cos(a0) * 9, cy + Math.sin(a0) * 10, cx + Math.cos(a1) * 9, cy + Math.sin(a1) * 10, P.R3); }
  for (const yy of [y0 + 8, y1 - 8]) dashLine(x0 + 0.57 * w + dx, yy - 2, x0 + 0.57 * w + dx, yy + 2, P.R3, 2, 1, 0);
  dashLine(x0 + 0.57 * w + dx - 5, y0 + 6, x0 + 0.57 * w + dx - 5, y1 - 6, P.R2, 2, 3, 0);
  dashLine(x0 + 0.57 * w + dx + 5, y0 + 6, x0 + 0.57 * w + dx + 5, y1 - 6, P.R2, 2, 3, 0);
  if (t > 19.28) tick(x1 - 18, y0 + 5, P.G2, 2);
}
function s07(t) {
  const cam = camTrack(ROOM_A, t), off = alignOff(t);
  const kv = K75(seg(t, 17.0, 17.5)), las = 1 - seg(t, 17.0, 17.25);
  const exp = seg(t, 17.6, 17.68) * (1 - seg(t, 18.02, 18.12));
  drawRoom(cam, t, { phi: 0, off, lasers: las, tattoo: true, kv, kvBeam: exp, panelGlow: exp, tumorR: TUMOR_R0 });
  // kV tag at the source
  const [sx, sy] = polar(Math.PI / 2, 196);
  tag('kV', cam.x(sx) - 6, cam.y(sy) - 26, 17.55, t, { c: P.Y3 });
  const [px, py] = polar(-Math.PI / 2, 158);
  const ix = 20, iy = 296;
  if (t > 18.12) { const k = seg(t, 18.12, 18.3); rect(cam.x(px), cam.y(py) + 30, cam.x(px) + 1, lerp(cam.y(py) + 30, iy, k), P.SUB); }
  igInset(t, ix, iy);
  callout({ text: 'IMAGE GUIDANCE', x: 18, y: LBL_Y + 4, ax: cam.x(sx) - 10, ay: cam.y(sy), t0: 17.2 }, t);
}
// ---------------------------------------------------------------- S08 console
function s08(t) {
  withBuffer(FEEDBUF, () => drawRoom(new Cam(0, 2, 0.62), t, { phi: 0, off: [0, 0], tumorR: TUMOR_R0 }));
  const checks = (t > 20.39) + (t > 20.86) + (t > 21.33);
  drawConsole(t, { roomFeed: FEEDBUF, checks, key: t > 20.24, armed: seg(t, 21.36, 21.46), hand: K75(seg(t, 21.38, 21.72)), press: t > 21.72 ? 1 : seg(t, 21.66, 21.72) });
  callout({ text: 'SAFETY CHECK', x: 18, y: LBL_Y + 30, ax: CON.mR[0] + 60, ay: CON.mR[1] - 2, t0: 20.15 }, t);
}
// ---------------------------------------------------------------- machine journey (S09-S19)
const MCAM = [
  [22.0, 280, 500, 0.5], [24.0, 280, 497, 0.52, eio],
  [24.32, 112, 722, 1.45], [26.7, 112, 714, 1.45, eio],
  [27.02, 124, 505, 1.3], [29.68, 124, 498, 1.3, eio],
  [30.02, 94, 272, 2.6], [32.98, 97, 272, 2.6, eio],
  [33.3, 150, 274, 2.5],
];
const MCAM2 = [
  [37.7, 306, 274, 2.5], [38.02, 362, 282, 2.4], [39.98, 365, 282, 2.4, eio],
  [40.3, 416, 266, 2.5], [42.42, 416, 268, 2.5, eio], [43.0, 398, 322, 3.2],
];
const MCAM3 = [
  [48.4, 398, 334, 3.0], [49.0, 398, 336, 3.0, eio], [49.3, 398, 368, 3.0], [51.98, 398, 371, 3.0, eio],
  [52.3, 398, 393, 3.6], [54.98, 398, 395, 3.6, eio], [55.3, 398, 421, 3.0], [57.62, 398, 421, 3.0, eio], [58.05, 398, 429, 4.8, ein],
];
function mstate() {
  return { mod: { charge: 0 }, rfs: {}, kly: { rf: 0 }, wg: { rfOut: 0 }, gun: { heat: 0.2 }, awg: { rf: 0 }, tr: {}, mag: {}, head: { jaw: 22, mlc: 24 }, pat: { tumor: 1 } };
}
// --- RF / electron / photon traces for the overview
const RF_TRACE = new Path([86, 576, 136, 576, 136, 466, 184, 466, 184, 248, 226, 248, 226, 268]);
function traceAlong(cam, path, k, w, cOut, cIn, cHead) {
  if (k <= 0) return;
  const s1 = path.L * clamp(k, 0, 1), q = cam.pts(path.sub(0, s1, 3));
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1.5, w * cam.z * 2), cOut);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, w * cam.z), cIn);
  if (k < 1) { const [x, y] = path.at(s1); glow(cam.x(x), cam.y(y), 9, cOut, cHead, 1); disc(cam.x(x), cam.y(y), 2, cHead); }
}
function s09(t) {
  const cam = camTrack(MCAM, t), st = mstate();
  const open = seg(t, 22.3, 22.95);
  st.closed = open >= 1 ? undefined : lerp(0, W + 2, K75(open));
  const rf = seg(t, 22.95, 23.45), el = seg(t, 23.15, 23.65), ph = seg(t, 23.6, 23.85), pw = seg(t, 22.9, 23.1);
  st.pat.tumor = 0.6 + 0.4 * ph;
  drawMachine(cam, t, st);
  if (st.closed === undefined) {
    traceAlong(cam, HV_PATH, pw, 1.5, P.C2, P.C5, P.C6);
    traceAlong(cam, RF_TRACE, rf, 2.2, P.V1, P.V2, P.V3);
    if (rf >= 1) rect(cam.x(112), cam.y(268), cam.x(112 + 220 * seg(t, 23.45, 23.62)), cam.y(292), P.V1, 0.5);
    traceAlong(cam, BEAM_PATH, el, 1.6, P.E1, P.E2, P.E3);
    if (ph > 0) { const yy = lerp(MW.targetY, MW.iso[1], ph); const spread = 12 / (410 - MW.targetY); poly(cam.pts([398 - 3, MW.targetY, 398 + 3, MW.targetY, 398 + spread * (yy - MW.targetY), yy, 398 - spread * (yy - MW.targetY), yy]), P.Y2, 0.75); }
  }
  callout({ text: 'INSIDE THE LINAC', x: 18, y: LBL_Y, ax: cam.x(300), ay: cam.y(212), t0: 22.25 }, t);
}
// modulator charge / fire schedule
const FIRE = [25.55, 26.58];
function modState(t) {
  const ch = t < FIRE[0] ? eout(seg(t, 24.3, 25.5)) : t < FIRE[0] + 0.1 ? 1 - seg(t, FIRE[0], FIRE[0] + 0.1) : t < FIRE[1] ? eout(seg(t, FIRE[0] + 0.15, 26.5)) : 1 - seg(t, FIRE[1], FIRE[1] + 0.1);
  let fire = 0, pulse = -1;
  for (const f of FIRE) { if (t >= f && t < f + 0.3) fire = 1 - (t - f) / 0.3; if (t >= f && t < f + 0.5) pulse = (t - f) / 0.42; }
  return { charge: clamp(ch, 0, 1), ac: t < 26.55 ? 1 : 0, acPh: t, fire, pulse };
}
function scope(x0, y0, w, h, t) {
  rect(x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1, P.SH); rect(x0, y0, x0 + w, y0 + h, P.K0); frame(x0, y0, x0 + w, y0 + h, P.N5);
  for (let i = 1; i < 4; i++) { rect(x0 + i * w / 4, y0 + 1, x0 + i * w / 4 + 1, y0 + h - 1, P.N2); }
  rect(x0 + 1, y0 + h / 2, x0 + w - 1, y0 + h / 2 + 1, P.N2);
  const base = y0 + h - 7, top = y0 + 7, span = 2.2;
  let px = x0 + 2, py = base;
  for (let x = x0 + 2; x < x0 + w - 2; x++) {
    const tt = t - (x0 + w - 2 - x) / (w - 4) * span;
    let on = false; for (const f of FIRE) if (tt >= f && tt < f + 0.07) on = true;
    const y = on ? top : base;
    line(px, py, x, y, P.C5); px = x; py = y;
  }
}
function s10(t) {
  const cam = camTrack(MCAM, t), st = mstate();
  st.mod = modState(t);
  st.kly.hv = st.mod.pulse > 0.85 ? 1 - seg(t, FIRE[st.mod.pulse > 0 && t > FIRE[1] ? 1 : 0] + 0.36, FIRE[t > FIRE[1] ? 1 : 0] + 0.6) : 0;
  drawMachine(cam, t, st);
  scope(20, 74, 96, 40, t);
  callout({ text: 'HIGH-POWER PULSES', x: 18, y: LBL_Y, ax: cam.x(167), ay: cam.y(684), t0: 24.36 }, t);
}
function s11(t) {
  const cam = camTrack(MCAM, t), st = mstate();
  const beatPh = ((t - 27.0) / BEAT) % 1;
  st.mod = { charge: 0.3 + 0.7 * beatPh, pulse: beatPh < 0.25 ? beatPh / 0.25 : -1 };
  st.kly = { rf: eout(seg(t, 27.5, 28.2)), ph: t * 9, hv: t > 27.3 ? 1 - beatPh : 0 };
  st.rfs = { on: t > 27.35, ph: t * 9 };
  st.wg = { rfOut: seg(t, 28.0, 28.3), rfFill: seg(t, 28.0, 29.0), ph: t * 9 };
  drawMachine(cam, t, st);
  callout({ text: 'RF AMPLIFICATION', x: 18, y: LBL_Y, ax: cam.x(136), ay: cam.y(458), t0: 27.4 }, t);
}
// electron gun: bunches leave the cathode through the anode hole
const GUN_BUNCH = [31.0, 31.8, 32.5];
function gunElectrons(cam, t) {
  for (let b = 0; b < GUN_BUNCH.length; b++) {
    const tau = t - GUN_BUNCH[b]; if (tau < 0) continue;
    for (let i = 0; i < 7; i++) {
      const tt = tau - i * 0.035; if (tt < 0) continue;
      const y0 = 272.5 + 15 * hash(b * 31 + i);
      const x = 93 + 26 * tt + 70 * tt * tt;
      if (x > 175) continue;
      const f = smooth(clamp((x - 93) / 14, 0, 1));
      const y = lerp(y0, 280 + (y0 - 280) * 0.12, f);
      const vx = 26 + 140 * tt;
      electron(cam.x(x), cam.y(y), vx, (280 - y0) * 0.4, { trail: clamp(vx * 0.06, 3, 12) });
    }
  }
}
function s12(t) {
  const cam = camTrack(MCAM, t), st = mstate();
  st.gun = { heat: eout(seg(t, 30.3, 30.9)) };
  st.awg = { rf: 1, u: (t - 31.6) * 2.7 };
  st.wg = { rfOut: 1, ph: t * 9 };
  st.mod = { pulse: t > 30.55 && t < 31.1 ? 0.7 + (t - 30.55) / 0.55 * 0.3 : -1 };
  drawMachine(cam, t, st);
  gunElectrons(cam, t);
  callout({ text: 'ELECTRON GUN', x: 18, y: 362, ax: cam.x(91), ay: cam.y(280), t0: 30.35 }, t);
}
// accelerating waveguide: tracked bunch u0(t) in cells
const AWG_T0 = 33.25, AWG_T1 = 37.55;
const u0At = t => -0.6 + (t - AWG_T0) * (11.8 / (AWG_T1 - AWG_T0));
function s13(t) {
  const u0 = u0At(t), xb = MW.awg0 + 20 * u0;
  let cam = camTrack(MCAM, Math.min(t, 33.3));
  if (t > 33.3) cam = new Cam(clamp(xb + 6, 150, 306), 274, 2.5);
  const st = mstate();
  st.awg = { rf: 1, u: u0 }; st.wg = { rfOut: 1, ph: t * 9 }; st.gun = { heat: 1 };
  drawMachine(cam, t, st);
  // bunch train (one bunch every two cells, pi-mode)
  for (let j = -7; j <= 7; j++) {
    const u = u0 + 2 * j; if (u < -0.4 || u > 11.4) continue;
    const e = clamp(u / 11, 0, 1), x = MW.awg0 + 20 * u;
    for (let i = 0; i < 5; i++) {
      const dx = (hash(i * 7 + j * 3 + 100) - 0.5) * 6 * (1 - 0.55 * e), dy = (hash(i * 13 + j * 5 + 200) - 0.5) * 6 * (1 - 0.5 * e);
      electron(cam.x(x + dx), cam.y(280 + dy), 1, 0, { trail: 5 + 7 * e, lv: 0.6 + 0.4 * e });
    }
  }
  // tracked bunch: ring + energy-transfer sparks + attached energy meter
  if (u0 > -0.4 && u0 < 11.4) {
    const bx = cam.x(xb), by = cam.y(280);
    ring(bx, by, 9, 1, P.E3, 0.8);
    const k = Math.floor(u0), f = u0 - k;
    if (k >= 0 && k < 11 && f > 0.15 && f < 0.85) for (let i = 0; i < 4; i++) {
      const ph = (f * 3 + i * 0.25) % 1, wy = i % 2 ? 266 : 294, wx = MW.awg0 + 20 * k + 4 + 12 * hash(i + k * 9);
      pset(lerp(cam.x(wx), bx, ph), lerp(cam.y(wy), by, ph), P.V3);
    }
    const lv = clamp(u0 / 11, 0, 1);
    const mx = clamp(bx - 40, 8, W - 88), my = 316;
    text(FM, 'ENERGY ^', mx, my, { sc: 2, c: P.INK, n: (t - 33.6) * 40 });
    if (t > 33.6) { rect(mx - 1, my + 15, mx + 81, my + 24, P.SH); frame(mx - 1, my + 15, mx + 81, my + 24, P.N5); rect(mx + 1, my + 17, mx + 1 + 78 * lv, my + 22, P.E1); rect(mx + 1, my + 17, mx + 1 + 78 * lv, my + 19, P.E2); }
  }
  callout({ text: 'ELECTRON ACCELERATION', x: 18, y: LBL_Y, ax: cam.x(xb), ay: cam.y(271), t0: 33.35, micro: 'RF fields transfer energy to electrons.' }, t);
}
// transport: continuous stream, focused by the coils
function beamEnv(x, on) {
  const div = lerp(3.5, 7.5, clamp((x - 332) / 90, 0, 1));
  const foc = x < 349 ? lerp(3.5, 5.2, (x - 332) / 17) : x < 371 ? lerp(5.2, 2.0, (x - 349) / 22) : lerp(2.0, 1.2, clamp((x - 371) / 40, 0, 1));
  return lerp(div, foc, on);
}
function s14(t) {
  const cam = camTrack(MCAM2, t), st = mstate();
  const on = K75(seg(t, 38.2, 38.6));
  st.tr = { coils: on }; st.awg = { rf: 1, u: u0At(t) }; st.mag = { field: 1, ph: t };
  drawMachine(cam, t, st);
  for (let x = 330; x < 422; x += 1) { const h = beamEnv(x, on); rect(cam.x(x), cam.y(280 - h), cam.x(x + 1), cam.y(280 + h), P.E0, 0.5); }
  for (let i = 0; i < 46; i++) {
    const x = 330 + ((t * 95 + i * 7.31) % 92), h = beamEnv(x, on), o = hash(i * 17 + 3) * 2 - 1;
    electron(cam.x(x), cam.y(280 + o * h), 1, 0, { trail: 9, glow: false });
  }
  callout({ text: 'BEAM TRANSPORT', x: 18, y: LBL_Y, ax: cam.x(349), ay: cam.y(262), t0: 38.25 }, t);
}
function s15(t) {
  const cam = camTrack(MCAM2, t), st = mstate();
  st.mag = { field: 1, ph: t * 3 }; st.tr = { coils: 1 };
  drawMachine(cam, t, st);
  // faint guide + electrons along the loop (bend electrons only)
  const q = cam.pts(BEAM_PATH.sub(S_MAG0 - 30, S_TGT, 3));
  for (let i = 0; i + 3 < q.length; i += 4) line(q[i], q[i + 1], q[i + 2], q[i + 3], P.E0);
  for (let i = 0; i < 30; i++) {
    const s = S_MAG0 - 60 + ((t * 115 + i * 8.93) % (S_TGT - S_MAG0 + 60));
    const [x, y] = BEAM_PATH.at(s), [tx, ty] = BEAM_PATH.tan(s);
    electron(cam.x(x), cam.y(y), tx, ty, { trail: 9, glow: false });
  }
  if (t > 42.6) { const hk = seg(t, 42.6, 43.0); glow(cam.x(398), cam.y(334), 14 * cam.z * hk, P.HF1, P.HF2, hk * 0.6); }
  callout({ text: 'MAGNETIC BEAM BENDING', x: 18, y: LBL_Y, ax: cam.x(420), ay: cam.y(232), t0: 40.3 }, t);
}
// ---------------------------------------------------------------- S16 bremsstrahlung
let FLIGHTS = [];
const FL_DEF = [ // nucleus, impact b, speed, deflection deg, energy loss, start time
  { n: [0, 0], b: 30, v: 230, th: 72, loss: 0.5, t0: 44.1 },
  { n: [56, 96], b: -36, v: 330, th: 34, loss: 0.22, t0: 45.85 },
  { n: [-56, -96], b: 20, v: 330, th: 80, loss: 0.68, t0: 46.2 },
  { n: [56, -96], b: 32, v: 330, th: 24, loss: 0.14, t0: 46.62 },
];
function flightsInit() {
  FLIGHTS = FL_DEF.map(d => {
    const k = Math.tan(d.th * Math.PI / 360) * Math.abs(d.b) * d.v * d.v;
    const F = flight(d.n[0], d.n[1], d.b, d.v, d.loss, k, -290);
    // emission direction = electron velocity just before emission
    let i = 0; while (i < F.pts.length - 1 && F.pts[i][2] < F.emitT) i++;
    const a = F.pts[Math.max(0, i - 3)], b = F.pts[Math.max(1, i - 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    F.dir = [dx / l, dy / l]; F.d = d;
    return F;
  });
}
function streamElectronsDown(cam, t, n, sp) { // beam hitting the target from above
  for (let i = 0; i < n; i++) {
    const y = MW.targetY - 70 + ((t * sp + i * 11.3) % 70);
    const x = 398 + (hash(i * 5 + 1) - 0.5) * 3;
    electron(cam.x(x), cam.y(y), 0, 1, { trail: 8, glow: false });
  }
}
// photon packets from the target through the head (deterministic stream)
const PH_RATE = 80, PH_V = 150, PH_SIG = 0.3, PH_EDGE = 0.42;
function photonPacket(i) {
  const h1 = Math.max(1e-6, hash(i * 7 + 1)), h2 = hash(i * 13 + 5);
  const a = PH_SIG * Math.sqrt(-2 * Math.log(h1)) * Math.cos(TAU * h2);
  const keep = Math.abs(a) < PH_EDGE ? Math.exp(-(PH_EDGE * PH_EDGE - a * a) / (2 * PH_SIG * PH_SIG)) : 1;
  const stopFilter = hash(i * 29 + 11) > keep;
  return { a, stopFilter, fy: 370 + 12 * hash(i * 3 + 9) };
}
function headPhotons(cam, t, opt) {
  const t0 = opt.t0 === undefined ? -1e9 : opt.t0;
  const jaw = opt.jaw === undefined ? 30 : opt.jaw, mlc = opt.mlc === undefined ? 40 : opt.mlc, filt = opt.filter !== false;
  const span = 1.4;
  for (let i = Math.floor((t - span) * PH_RATE); i <= Math.floor(t * PH_RATE); i++) {
    const te = i / PH_RATE; if (te < t0) continue;
    const age = t - te; if (age < 0) continue;
    const pk = photonPacket(i), ta = Math.tan(pk.a);
    let dist = age * PH_V;
    const y = MW.targetY + 2 + dist * Math.cos(pk.a), x = 398 + dist * Math.sin(pk.a);
    // primary collimator aperture
    const ap = yy => yy < 342 ? 3 : 3 + 11 * (yy - 342) / 24;
    let stopY = null;
    for (let yy = 342; yy <= 366; yy += 2) if (Math.abs(ta * (yy - MW.targetY)) > ap(yy) + 0.5) { stopY = yy; break; }
    if (stopY === null && filt && pk.stopFilter) stopY = pk.fy;
    if (stopY === null && Math.abs(ta * (410 - MW.targetY)) > jaw) stopY = 404;
    if (stopY === null && Math.abs(ta * (428 - MW.targetY)) > mlc) stopY = 421;
    const yEnd = stopY === null ? 9999 : stopY;
    if (y > yEnd) {
      const since = (y - yEnd) / PH_V;
      if (since < 0.12) { const xs = 398 + ta * (yEnd - MW.targetY); disc(cam.x(xs), cam.y(yEnd), 1.5 + 3 * (1 - since / 0.12), P.Y1, 0.7); }
      continue;
    }
    if (opt.onPass) opt.onPass(x, y, i, age);
    const sx = cam.x(x), sy = cam.y(y); if (sy > H + 10) continue;
    photon(sx, sy, Math.sin(pk.a), Math.cos(pk.a), { len: Math.max(5, 3.2 * cam.z), amp: cam.z > 2.4 ? 1.5 : 0, wl: 4 });
  }
}
function s16(t) {
  const st = mstate(); st.head = { jaw: 22, mlc: 24, hot: 0.25 + 0.45 * seg(t, 43.0, 43.3) };
  const diveIn = seg(t, 43.3, 44.15), diveOut = seg(t, 47.6, 48.4);
  const latS = diveOut > 0 ? Math.exp(lerp(Math.log(1.05), Math.log(0.12), K75(diveOut))) : Math.exp(lerp(Math.log(0.12), Math.log(1.0), K75(diveIn))) * (1 + 0.05 * seg(t, 44.15, 47.6));
  const mz = 3.4 * latS / 0.12;
  const showLat = (diveIn > 0.55 && diveOut < 0.45);
  const mixK = diveOut > 0 ? 1 - smooth(seg(diveOut, 0.35, 0.65)) : smooth(seg(diveIn, 0.45, 0.75));
  const drawM = () => {
    const cam = t < 43.3 ? camTrack(MCAM2, Math.min(t, 43.0)) && new Cam(398, lerp(322, 334, seg(t, 43.0, 43.3)), lerp(3.2, 3.4, seg(t, 43.0, 43.3))) : new Cam(398, 334, diveOut > 0 ? Math.min(mz, 3.0 + (mz - 3.0)) : Math.max(3.4, mz));
    drawMachine(cam, t, st);
    streamElectronsDown(cam, t, 10, 120);
    if (t > 47.9) headPhotons(cam, t, { t0: 47.9, jaw: 22, mlc: 24 });
  };
  const drawL = () => {
    const v = { ox: CX, oy: CY, s: latS };
    drawLattice(v, t, {});
    for (let fi = 0; fi < FLIGHTS.length; fi++) {
      const F = FLIGHTS[fi], tt = t - F.d.t0; if (tt < 0) continue;
      const p = flightAt(F, tt), q = flightAt(F, tt - 0.05);
      const after = tt > F.emitT;
      const sx = v.ox + p[0] * v.s, sy = v.oy + p[1] * v.s;
      if (sy < H + 20 && sy > -40) {
        // trail from history
        const tr = after ? 0.06 : 0.11;
        let px = null, py = null;
        for (let k = 8; k >= 0; k--) { const h = flightAt(F, tt - tr * k / 8); const hx = v.ox + h[0] * v.s, hy = v.oy + h[1] * v.s; if (px !== null) lineW(px, py, hx, hy, k > 4 ? 1 : 2, k > 4 ? P.E0 : P.E1); px = hx; py = hy; }
        electron(sx, sy, p[0] - q[0], p[1] - q[1], { trail: 0, r: after ? 1.8 : 2.8, gr: after ? 5 : 9, lv: after ? 0.6 : 1 });
        if (fi === 0) { // energy bar riding above the featured electron
          const e = after ? 1 - F.d.loss : 1;
          rect(sx - 13, sy - 19, sx + 13, sy - 13, P.SH); rect(sx - 12, sy - 18, sx - 12 + 24 * e, sy - 14, P.E2); rect(sx - 12, sy - 18, sx - 12 + 24 * e, sy - 17, P.E3);
        }
      }
      if (after) {
        const pt = tt - F.emitT, ep = F.emitPt;
        if (pt < 0.12) glow(v.ox + ep[0] * v.s, v.oy + ep[1] * v.s, 14 * (1 - pt / 0.12) + 4, P.Y1, P.Y3, 1 - pt / 0.12);
        const d = pt * 260, x = ep[0] + F.dir[0] * d, y = ep[1] + F.dir[1] * d;
        const L = F.d.loss, phx = v.ox + x * v.s, phy = v.oy + y * v.s;
        photon(phx, phy, F.dir[0], F.dir[1], { len: 30 * v.s, amp: 3.4 * v.s, wl: lerp(12, 4.5, L) * v.s, c: L > 0.3 ? P.Y2 : P.Y1, ch: P.Y3, glow: 0.9 });
        if (fi === 0) { rect(phx - 13, phy - 20, phx + 13, phy - 14, P.SH); rect(phx - 12, phy - 19, phx - 12 + 24 * L, phy - 15, P.Y2); rect(phx - 12, phy - 19, phx - 12 + 24 * L, phy - 18, P.Y3); }
      }
    }
  };
  if (t < 43.3 || diveOut >= 1) { drawM(); }
  else if (!showLat && mixK <= 0) drawM();
  else if (mixK >= 1) drawL();
  else { withBuffer(TMPBUF, drawM); drawL(); dissolve(TMPBUF, buf, mixK, buf); }
  if (t < 43.3) { const hk = seg(t, 43.0, 43.3); const cam = new Cam(398, lerp(322, 334, hk), lerp(3.2, 3.4, hk)); ring(cam.x(398), cam.y(334), 18 + 6 * hk, 1, P.E3, hk); }
  callout({ text: 'BREMSSTRAHLUNG', x: 18, y: LBL_Y, ax: CX + 24, ay: CY - 22, t0: 44.3, micro: 'Electrons lose energy and emit X-rays.' }, t);
}
// ---------------------------------------------------------------- head scenes S17-S19
function profileInset(x0, y0, w, h, m, t0, t) {
  const k = K75(seg(t, t0, t0 + 0.25)); if (k <= 0) return;
  const hh = Math.round(h * k);
  rect(x0 - 1, y0 - 1, x0 + w + 1, y0 + hh + 1, P.SH); rect(x0, y0, x0 + w, y0 + hh, P.K0); frame(x0, y0, x0 + w, y0 + hh, P.N5);
  if (k < 1) return;
  rect(x0 + 4, y0 + h - 6, x0 + w - 4, y0 + h - 5, P.N5);
  let px = null, py = null;
  for (let x = x0 + 6; x <= x0 + w - 6; x++) {
    const u = (x - (x0 + w / 2)) / ((w - 12) / 2);
    const peak = Math.exp(-u * u / (2 * 0.32 * 0.32)), flat = Math.abs(u) < 0.82 ? 0.55 : 0.55 * Math.exp(-((Math.abs(u) - 0.82) ** 2) / 0.006);
    const v = lerp(peak, flat, m);
    const y = y0 + h - 7 - v * (h - 16);
    if (px !== null) line(px, py, x, y, m > 0.5 ? P.Y2 : P.Y1);
    px = x; py = y;
  }
}
function s17(t) {
  const cam = camTrack(MCAM3, t), st = mstate();
  st.head = { jaw: 22, mlc: 24, hot: 0.3 };
  drawMachine(cam, t, st);
  streamElectronsDown(cam, t, 10, 120);
  headPhotons(cam, t, { jaw: 22, mlc: 24 });
  const m = K75(seg(t, 49.9, 50.9));
  profileInset(172, 62, 80, 44, m, 49.45, t);
  callout({ text: 'BEAM FILTERING', x: 18, y: LBL_Y, ax: cam.x(390), ay: cam.y(376), t0: 49.3 }, t);
}
function s18(t) {
  const cam = camTrack(MCAM3, t), st = mstate();
  st.head = { jaw: 22, mlc: 24, hot: 0.3 };
  drawMachine(cam, t, st);
  streamElectronsDown(cam, t, 10, 120);
  let pulses = [];
  headPhotons(cam, t, { jaw: 22, mlc: 24, onPass: (x, y, i, age) => {
    // ion pairs created where packets cross the chamber gas
    const tc = (394 - MW.targetY) / PH_V;
    const since = age - tc;
    if (since > 0 && since < 0.22 && Math.abs(x - 398) < 21) {
      const k = since / 0.22;
      pset(cam.x(x + 1), cam.y(lerp(394, 391.4, k)), P.S2); pset(cam.x(x + 1) + 1, cam.y(lerp(394, 391.4, k)), P.S3);
      const py = cam.y(lerp(394, 396.6, k)); rect(cam.x(x) - 1, py, cam.x(x) + 2, py + 1, P.C4); rect(cam.x(x), py - 1, cam.x(x) + 1, py + 2, P.C4);
      if (i % 3 === 0) pulses.push(since);
    }
  } });
  // signal cable from the chamber to the monitor-unit counter
  const cx0 = cam.x(421), cy0 = cam.y(394);
  const px = 160, py = 340, pw = 92, ph = 44;
  const wire = new Path([cx0, cy0, 246, cy0, 246, py]);
  for (let i = 0; i + 3 < wire.p.length; i += 2) { lineW(wire.p[i], wire.p[i + 1], wire.p[i + 2], wire.p[i + 3], 3, P.C0); line(wire.p[i], wire.p[i + 1], wire.p[i + 2], wire.p[i + 3], P.C3); }
  for (const s of pulses) { const [x, y] = wire.at(s / 0.22 * wire.L); rect(x - 1, y - 1, x + 2, y + 2, P.S3); }
  const k = K75(seg(t, 52.45, 52.7));
  if (k > 0) {
    rect(px - 1, py - 1, px + pw + 1, py + ph * k + 1, P.SH); rect(px, py, px + pw, py + ph * k, P.K0); frame(px, py, px + pw, py + ph * k, P.N5);
    if (k >= 1) {
      const mu = Math.floor(clamp(seg(t, 52.6, 54.9), 0, 1) * 118);
      const s = String(mu).padStart(3, '0');
      text(FL, s, px + 8, py + 9, { sc: 2, c: P.INK });
      text(FM, 'MU', px + pw - 8, py + 13, { sc: 2, c: P.SUB, align: 'right' });
      rect(px + 8, py + 33, px + pw - 8, py + 36, P.N3); rect(px + 8, py + 33, px + 8 + (pw - 16) * mu / 118, py + 36, P.S1);
    }
  }
  callout({ text: 'BEAM MONITORING', x: 18, y: LBL_Y, ax: cam.x(380), ay: cam.y(389), t0: 52.3 }, t);
}
function jawAt(t) { return track([[55.3, 30], [55.95, 21, K75], [56.2, 21], [56.85, 12, K75]], t); }
function s19(t) {
  const cam = camTrack(MCAM3, t), st = mstate();
  const jaw = jawAt(t);
  st.head = { jaw, mlc: jaw + 2.5, hot: 0.3 };
  drawMachine(cam, t, st);
  streamElectronsDown(cam, t, 10, 120);
  headPhotons(cam, t, { jaw, mlc: jaw + 2.5 });
  callout({ text: 'BEAM COLLIMATION', x: 18, y: LBL_Y, ax: cam.x(398 - jaw - 6), ay: cam.y(404), t0: 55.3 }, t);
}
// ---------------------------------------------------------------- S20 MLC beam's-eye view
const MLC = { n: 18, y0: 153, pitch: 11, jx0: 34, jx1: 236, jy0: 146, jy1: 356, cx: 135, cy: 252, R: 64 };
const MLC_OUT = (function () { // tumour outline in BEV (screen px)
  const pts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; const r = MLC.R * (1 + 0.11 * Math.sin(3 * a + 1.3) + 0.07 * Math.sin(5 * a + 0.2) + 0.05 * Math.sin(2 * a)); pts.push(MLC.cx + Math.cos(a) * r * 1.05, MLC.cy + Math.sin(a) * r * 0.92); } return pts;
})();
function outlineSpan(y) {
  const xs = [], n = MLC_OUT.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) { const yi = MLC_OUT[2 * i + 1], yj = MLC_OUT[2 * j + 1]; if ((yi > y) !== (yj > y)) xs.push(MLC_OUT[2 * i] + (y - yi) * (MLC_OUT[2 * j] - MLC_OUT[2 * i]) / (yj - yi)); }
  if (xs.length < 2) return null; return [Math.min(...xs), Math.max(...xs)];
}
function leafPos(i, t) { // returns [xL, xR] tip positions
  const yA = MLC.y0 + i * MLC.pitch + 1, yB = yA + MLC.pitch - 2;
  const sA = outlineSpan(yA), sB = outlineSpan(yB), sM = outlineSpan((yA + yB) / 2);
  let conf;
  if (sA || sB || sM) { const lo = Math.min(...[sA, sB, sM].filter(Boolean).map(s => s[0])), hi = Math.max(...[sA, sB, sM].filter(Boolean).map(s => s[1])); conf = [lo - 2, hi + 2]; }
  else conf = [MLC.cx - 1 + (i < 9 ? -18 : 14), MLC.cx + 1 + (i < 9 ? -18 : 14)];
  const open = [MLC.jx0 - 6, MLC.jx1 + 6];
  const st = 58.4 + 0.035 * i;
  const kIn = K75(seg(t, st, st + 0.62));
  let L = lerp(open[0], conf[0], kIn), R = lerp(open[1], conf[1], kIn);
  const mid = (conf[0] + conf[1]) / 2;
  // modulation segments (sliding window, core segment, back to conformal)
  const kA = K75(seg(t, 60.7, 61.25)) - K75(seg(t, 61.5, 62.05));
  const kB = K75(seg(t, 61.5, 62.05)) - K75(seg(t, 62.25, 62.8));
  const kC = K75(seg(t, 62.25, 62.8)) - K75(seg(t, 63.0, 63.5));
  if (conf[1] - conf[0] > 4) {
    R = lerp(R, mid + 3, kA);
    L = lerp(L, mid - 3, kB);
    const w = (conf[1] - conf[0]) * 0.28;
    L = lerp(L, Math.max(conf[0], mid - w), kC); R = lerp(R, Math.min(conf[1], mid + w), kC);
  }
  return [L, R];
}
function s20(t) {
  clear(P.K0);
  // beam light through the jaws (behind the leaves)
  const on = t > 58.25;
  if (on) { rect(MLC.jx0, MLC.jy0, MLC.jx1, MLC.jy1, P.Y1); rect(MLC.jx0, MLC.jy0, MLC.jx1, MLC.jy1, P.Y2, 0.45); }
  else rect(MLC.jx0, MLC.jy0, MLC.jx1, MLC.jy1, P.Y0, 0.6);
  if (on) for (let i = 0; i < 90; i++) { const x = MLC.jx0 + hash(i * 3 + Math.floor(t * 20) * 7) * (MLC.jx1 - MLC.jx0), y = MLC.jy0 + hash(i * 5 + Math.floor(t * 20) * 11) * (MLC.jy1 - MLC.jy0); pset(x, y, P.Y3); }
  // leaves
  for (let i = 0; i < MLC.n; i++) {
    const y0 = MLC.y0 + i * MLC.pitch, y1 = y0 + MLC.pitch - 1;
    const [L, R] = leafPos(i, t);
    for (const [a, b, tip] of [[-30, L, 'r'], [R, W + 30, 'l']]) {
      if (b <= a) continue;
      rect(a, y0, b, y1, P.T3); rect(a, y0, b, y0 + 1, P.T4); rect(a, y1 - 2, b, y1, P.T2); rect(a, y1, b, y1 + 1, P.T0);
      const tx = tip === 'r' ? b - 1 : a;
      rect(tx, y0, tx + 1, y1, P.T5);
      rect(tip === 'r' ? b : a - 1, y0, tip === 'r' ? b + 1 : a, y1 + 1, P.T0);
      for (let x = (tip === 'r' ? a : b) ; tip === 'r' ? x < b - 30 : x > a + 30; x += tip === 'r' ? 22 : -22) rect(x, y0 + 4, x + 1, y0 + 6, P.T1);
    }
  }
  // tumour projection (target outline)
  for (let i = 0; i + 3 < MLC_OUT.length; i += 2) line(MLC_OUT[i], MLC_OUT[i + 1], MLC_OUT[i + 2], MLC_OUT[i + 3], P.R3);
  line(MLC_OUT[MLC_OUT.length - 2], MLC_OUT[MLC_OUT.length - 1], MLC_OUT[0], MLC_OUT[1], P.R3);
  // jaws frame on top
  rect(0, 0, W, MLC.jy0, P.T1); rect(0, MLC.jy1, W, H, P.T1); rect(0, 0, MLC.jx0, H, P.T1); rect(MLC.jx1, 0, W, H, P.T1);
  frame(MLC.jx0 - 1, MLC.jy0 - 1, MLC.jx1 + 1, MLC.jy1 + 1, P.T0); frame(MLC.jx0 - 2, MLC.jy0 - 2, MLC.jx1 + 2, MLC.jy1 + 2, P.T2);
  rect(0, 0, W, 112, P.BG); rect(0, 112, W, 113, P.N3);
  rect(0, 392, W, H, P.BG); rect(0, 391, W, 392, P.N3);
  callout({ text: 'MULTILEAF COLLIMATOR', x: 18, y: LBL_Y, ax: 100, ay: MLC.y0 + 5 * MLC.pitch, t0: 58.35, micro: 'Leaves shape and modulate the field.' }, t);
}
// ---------------------------------------------------------------- S21 VMAT, S22 dose
const VCAM = [[64.0, 0, 6, 0.62], [70.0, 0, 6, 0.64, eio], [70.5, 34, 4, 1.12], [73.0, 34, 4, 1.15, eio]];
function vmatProg(t) { const u = seg(t, 64.3, 69.7); return u < 0.06 ? 0.5 * u * u / 0.06 : u > 0.94 ? 1 - 0.5 * (1 - u) * (1 - u) / 0.06 - 0.03 + 0.03 : u - 0.03 + 0.03 * 1; }
function vmatPhi(t) { return -Math.PI + TAU * clamp(seg(t, 64.3, 69.7), 0, 1); }
function s21(t) {
  const cam = camTrack(VCAM, t), phi = vmatPhi(t), p = clamp(seg(t, 64.3, 69.7), 0, 1);
  const on = t > 64.4 && t < 69.6 ? 1 : 0;
  const [lo, hi] = beamAperture(phi);
  const mod = 1.6 * Math.sin(phi * 3 + 0.7), mod2 = 1.4 * Math.sin(phi * 4 + 2.1);
  const lohi = [lo + Math.max(0, mod), hi - Math.max(0, mod2)];
  drawRoom(cam, t, { phi, off: [0, 0], tumorR: TUMOR_R0, dose: p, beam: on, lohi, mlc: (lohi[1] - lohi[0]) / 2.2, beamOn: on });
  // arc travelled (dots on the drum rim)
  for (let i = 0; i <= 90 * p; i++) { const a = -Math.PI + i / 90 * TAU; const [x, y] = polar(a, 216); pset(cam.x(x), cam.y(y), P.Y1); }
  callout({ text: 'VMAT DELIVERY', x: 18, y: LBL_Y, ax: cam.x(polar(phi, 205)[0]), ay: cam.y(polar(phi, 205)[1]), t0: 64.35, micro: 'Shaped radiation from multiple angles.' }, t);
}
function s22(t) {
  const cam = camTrack(VCAM, t);
  const pulse = seg(t, 71.25, 72.6) > 0 ? 0.5 - 0.5 * Math.cos(seg(t, 71.25, 72.6) * TAU * 2) : 0;
  drawRoom(cam, t, { phi: Math.PI, off: [0, 0], tumorR: TUMOR_R0, dose: 1, lowPulse: pulse });
  doseLegend(124, 330, 96, 70.65, t);
  callout({ text: 'DOSE ACCUMULATION', x: 18, y: LBL_Y, ax: cam.x(86), ay: cam.y(-18), t0: 70.25, micro: 'Healthy tissue also receives some dose.' }, t);
}
// ---------------------------------------------------------------- water-scale scenes S23-S26
const WCX = 0, WCY = 0;   // water field centre
const MSTAR = (function () { let best = null, bd = 1e9; for (const m of WAT) { const d = Math.hypot(m.x - 8, m.y + 6); if (d < bd) { bd = d; best = m; } } return best; })();
const COMPTON_T = 75.0;
let EPATH = null, EION = [], DNA_Y = 230;
function trackInit() {
  // secondary-electron path: starts at the Compton site, slows, turns more as it slows
  const pts = []; let x = MSTAR.x, y = MSTAR.y, a = Math.atan2(150, -110), step = 9;
  pts.push(x, y);
  for (let i = 0; i < 60; i++) { a += (hash(i * 17 + 5) - 0.5) * (0.35 + i * 0.03); step = Math.max(2.2, 9 - i * 0.12); x += Math.cos(a) * step; y += Math.sin(a) * step; pts.push(x, y); }
  EPATH = new Path(pts);
  let ymax = -1e9; for (let i = 1; i < pts.length; i += 2) ymax = Math.max(ymax, pts[i]);
  DNA_Y = ymax + 50;                       // the helix lies just below the end of the track
  // interactions along the track: every ~22 units the nearest free molecule is
  // ionised (most) or excited (some); spacing tightens as the electron slows
  EION = []; const used = new Set([MSTAR.id]);
  for (let s = 40, k = 0; s < EPATH.L - 4; s += Math.max(14, 30 - k * 1.6), k++) {
    const [px, py] = EPATH.at(s);
    let best = null, bd = 22;
    for (const m of WAT) { if (used.has(m.id) || Math.abs(m.y - DNA_Y) < 30) continue; const d = Math.hypot(m.x - px, m.y - py); if (d < bd) { bd = d; best = m; } }
    if (best) { used.add(best.id); EION.push({ id: best.id, s, kind: hash(best.id * 13 + k) < 0.72 ? 'ion' : 'exc' }); }
  }
}
function ePathS(t) { // arc length of the secondary electron along EPATH at time t
  if (t < COMPTON_T) return 0;
  const a = clamp((t - COMPTON_T) / 3.0, 0, 1) * 34;                // slow drift during S23
  const u = seg(t, 78.0, 81.3);
  return a + (EPATH.L - 34) * (1 - (1 - u) * (1 - u));
}
function ePathTime(s) { // inverse of ePathS for s > 34 (S24 part)
  if (s <= 34) return COMPTON_T + s / 34 * 3.0;
  const f = clamp((s - 34) / (EPATH.L - 34), 0, 1); const u = 1 - Math.sqrt(1 - f); return 78.0 + u * 3.3;
}
function waterStateFn(t, extra) {
  return id => {
    if (extra && extra[id]) return extra[id];
    if (id === MSTAR.id && t > COMPTON_T) return { kind: 'ion' };
    for (const e of EION) if (e.id === id) { const tp = ePathTime(e.s); if (t > tp) { if (e.kind === 'ion') return { kind: 'ion', glow: Math.max(0, 1 - (t - tp) / 0.4) }; if (t - tp < 0.6) return { kind: 'w', glow: 1 - (t - tp) / 0.6 }; } }
    return null;
  };
}
function compPhoton(spec, t) { // incoming + scattered photon of a Compton event
  const { at, hit, din, dout, wl0, wl1, v } = spec;
  if (t < at - 2) return null;
  if (t < at) { const d = (at - t) * v; return { x: hit[0] - din[0] * d, y: hit[1] - din[1] * d, dx: din[0], dy: din[1], wl: wl0, c: P.Y2 }; }
  const d = (t - at) * v; return { x: hit[0] + dout[0] * d, y: hit[1] + dout[1] * d, dx: dout[0], dy: dout[1], wl: wl1, c: P.Y1 };
}
const WS23 = 1.8, WS24 = 1.5;
function s23(t) {
  const lu = seg(t, 73.0, 73.3);
  const dive = seg(t, 73.3, 74.15);
  if (dive <= 0) {
    const cam = new Cam(34, 4, 1.15);
    drawRoom(cam, t, { phi: Math.PI, off: [0, 0], tumorR: TUMOR_R0, dose: 1 });
    const v = { ox: cam.x(0), oy: cam.y(0), s: cam.z };
    ring(v.ox, v.oy, TUMOR_R0 * v.s + 3 + 3 * lu, 1, P.R4, lu); ring(v.ox, v.oy, TUMOR_R0 * v.s + 8 + 5 * lu, 1, P.R2, 0.6 * lu);
    return;
  }
  const [mx0, my0] = waterPos(MSTAR, t);
  if (dive < 1) {
    const M = Math.exp(lerp(Math.log(1.15), Math.log(70), K75(dive))), cx = lerp(34, 0, K75(dive)), cy = lerp(4, 0, K75(dive));
    const wk = smooth(seg(dive, 0.62, 0.95));
    const drawC = () => drawChain(M, cx, cy, t, { outer: 'room', room: { phi: Math.PI, tumorR: TUMOR_R0, dose: 1 }, tissue: { R: TUMOR_R0 / U_T } });
    const ws = lerp(0.5, WS23, seg(dive, 0.6, 1));
    const drawW = () => drawWaterField({ ox: CX - mx0 * ws, oy: CY - my0 * ws, s: ws }, t, { state: waterStateFn(t), skip: dnaSkip() });
    if (wk <= 0) drawC(); else if (wk >= 1) drawW(); else { withBuffer(TMPBUF, drawC); drawW(); dissolve(TMPBUF, buf, wk, buf); }
    return;
  }
  const s = WS23, v = { ox: CX - mx0 * s, oy: CY - my0 * s, s };
  drawWaterField(v, t, { state: waterStateFn(t), skip: dnaSkip() });
  drawDNAin(v);
  const X = x => v.ox + x * s, Y = y => v.oy + y * s;
  const [mx, my] = waterPos(MSTAR, t);
  const hit = [mx + 7, my - 8];
  if (t < COMPTON_T) { // bound outer electron around the featured molecule
    const a = t * 3.2; electron(X(mx + Math.cos(a) * 11), Y(my + Math.sin(a) * 11), -Math.sin(a), Math.cos(a), { trail: 4, glow: false, c1: P.S0, c2: P.S1, c3: P.S2, r: 1.6 });
    ring(X(mx), Y(my), 11 * s, 1, P.S0, 0.5);
  }
  const P1 = compPhoton({ at: COMPTON_T, hit, din: [0.58, 0.81], dout: [0.97, 0.25], wl0: 3.6, wl1: 7, v: 170 }, t);
  if (P1) {
    photon(X(P1.x), Y(P1.y), P1.dx, P1.dy, { len: 40, amp: 4, wl: P1.wl * 1.6, c: P1.c, glow: 0.8 });
    const e = t < COMPTON_T ? 1 : 0.62, bx = X(P1.x), by = Y(P1.y);
    rect(bx - 13, by - 22, bx + 13, by - 16, P.SH); rect(bx - 12, by - 21, bx - 12 + 24 * e, by - 17, P.Y2); rect(bx - 12, by - 21, bx - 12 + 24 * e, by - 20, P.Y3);
  }
  if (t > COMPTON_T) {
    const hk = seg(t, COMPTON_T, COMPTON_T + 0.15); if (hk < 1) glow(X(hit[0]), Y(hit[1]), 22 * (1 - hk) + 4, P.C3, P.C6, 1 - hk);
    const ss = ePathS(t), [ex, ey] = EPATH.at(ss), [tx, ty] = EPATH.tan(ss);
    electron(X(ex), Y(ey), tx, ty, { trail: 14, c0: P.S0, c1: P.S1, c2: P.S2, c3: P.S3, r: 2.2, gr: 7 });
    rect(X(ex) - 13, Y(ey) - 20, X(ex) + 13, Y(ey) - 14, P.SH); rect(X(ex) - 12, Y(ey) - 19, X(ex) - 12 + 24 * 0.38, Y(ey) - 15, P.S2); rect(X(ex) - 12, Y(ey) - 19, X(ex) - 12 + 24 * 0.38, Y(ey) - 18, P.S3);
  }
  // other photons: one passes straight through, one more Compton event, one photoelectric absorption
  const P2 = compPhoton({ at: 77.3, hit: [-46, 30], din: [0.2, 0.98], dout: [0.2, 0.98], wl0: 4, wl1: 4, v: 170 }, t);
  if (P2 && t > 75.7) photon(X(P2.x), Y(P2.y), P2.dx, P2.dy, { len: 34, amp: 3.6, wl: 6, c: P.Y2 });
  const P3 = compPhoton({ at: 76.7, hit: [mx + 52, my - 70], din: [-0.3, 0.95], dout: [0.6, 0.8], wl0: 4, wl1: 6.5, v: 170 }, t);
  if (P3 && t > 76.0) { photon(X(P3.x), Y(P3.y), P3.dx, P3.dy, { len: 34, amp: 3.6, wl: P3.wl * 1.6, c: P3.c }); if (t > 76.7) { const d = (t - 76.7) * 60; electron(X(mx + 52 - d * 0.7), Y(my - 70 + d * 0.7), -0.7, 0.7, { trail: 10, c0: P.S0, c1: P.S1, c2: P.S2, c3: P.S3, r: 1.6 }); } }
  const pe = [mx - 40, my + 64];
  if (t > 76.9 && t < 77.45) { const d = (77.45 - t) * 170; photon(X(pe[0] - 0.6 * d), Y(pe[1] - 0.8 * d), 0.6, 0.8, { len: 30, amp: 3, wl: 6, c: P.Y1 }); }
  if (t > 77.45) { const k = seg(t, 77.45, 77.6); if (k < 1) glow(X(pe[0]), Y(pe[1]), 10 * (1 - k) + 3, P.Y0, P.Y1, 1 - k); const d = (t - 77.45) * 55; electron(X(pe[0] + d), Y(pe[1] + d * 0.3), 1, 0.3, { trail: 8, c0: P.S0, c1: P.S1, c2: P.S2, c3: P.S3, r: 1.6 }); }
  callout({ text: 'COMPTON SCATTERING', x: 18, y: LBL_Y, ax: X(hit[0]), ay: Y(hit[1]) - 6, t0: 74.25, micro: 'A photon transfers energy to an electron.' }, t);
}
function waterCamAt(t) { // camera centre (water units) and scale following the electron in S24
  const [ex, ey] = EPATH.at(ePathS(t));
  const [mx, my] = waterPos(MSTAR, t);
  const f = K75(seg(t, 78.0, 78.6));
  return [lerp(mx, ex, f), lerp(my, ey, f), lerp(WS23, WS24, f)];
}
function s24(t) {
  const [cx, cy, sc] = waterCamAt(t);
  const v = { ox: CX - cx * sc, oy: CY - cy * sc, s: sc };
  const X = x => v.ox + x * sc, Y = y => v.oy + y * sc;
  drawWaterField(v, t, { state: waterStateFn(t), skip: dnaSkip() });
  drawDNAin(v);
  // track so far: faint dotted trail + delta rays at ionisations
  const s = ePathS(t);
  const q = EPATH.sub(Math.max(0, s - 400), s, 2);
  for (let i = 0; i + 3 < q.length; i += 4) line(X(q[i]), Y(q[i + 1]), X(q[i + 2]), Y(q[i + 3]), P.S0);
  for (const e of EION) {
    const tp = ePathTime(e.s); if (t < tp || e.kind !== 'ion') continue;
    const m = WAT[e.id], [mx, my] = waterPos(m, t);
    const dk = clamp((t - tp) / 0.35, 0, 1), da = hash(e.id * 3) * TAU;
    if (dk < 1) electron(X(mx + Math.cos(da) * 14 * dk), Y(my + Math.sin(da) * 14 * dk), Math.cos(da), Math.sin(da), { trail: 5, glow: false, c1: P.S0, c2: P.S1, c3: P.S2 });
    if (t - tp < 0.15) glow(X(mx), Y(my), 14, P.C2, P.C5, 1 - (t - tp) / 0.15);
  }
  const [ex, ey] = EPATH.at(s), [tx, ty] = EPATH.tan(s);
  const slow = seg(t, 78.0, 81.3), fade = 1 - seg(t, 81.2, 81.6);
  if (fade > 0) electron(X(ex), Y(ey), tx, ty, { trail: lerp(14, 2, slow), c0: P.S0, c1: P.S1, c2: P.S2, c3: P.S3, r: 2.2, gr: 7, lv: fade });
  callout({ text: 'SECONDARY ELECTRONS', x: 18, y: LBL_Y, ax: X(ex), ay: Y(ey) - 10, t0: 78.25, micro: 'Electrons deposit energy through interactions.' }, t);
}
// radiolysis: pick an ionised molecule near the end of the track and its neighbour
let RAD = null;
function radInit() {
  const ions = EION.filter(e => e.kind === 'ion').sort((a, b) => WAT[b.id].y - WAT[a.id].y);
  const I = WAT[ions[0].id];                                   // ion nearest the DNA
  let N = null, bd = 1e9; for (const m of WAT) { if (m === I || EION.some(e => e.id === m.id) || Math.abs(m.y - DNA_Y) < 30) continue; const d = Math.hypot(m.x - I.x, m.y - I.y); if (d < bd) { bd = d; N = m; } }
  const others = ions.slice(1, 3).map(e => WAT[e.id]);
  RAD = { I, N, others };
}
// water world: molecules (minus the DNA band) + the DNA helix
function dnaSkip(extra) { const s = new Set(extra || []); for (const m of WAT) if (Math.abs(m.y - DNA_Y) < 30) s.add(m.id); return s; }
function drawDNAin(v, opt) { const sy = v.oy + DNA_Y * v.s; if (sy < -60 || sy > H + 60) return; drawDNA({ ox: v.ox, oy: sy, s: v.s }, Object.assign({ ph: 0.4 }, opt || {})); }
function radState(t) {
  const ex = {};
  const hop = seg(t, 83.2, 83.75);
  ex[RAD.I.id] = { kind: hop >= 1 ? 'oh' : 'ion', glow: hop >= 1 ? 0.5 + 0.3 * Math.sin(t * 6) : 0 };
  ex[RAD.N.id] = { kind: hop >= 1 ? 'h3o' : 'w' };
  RAD.others.forEach((m, k) => { const tt = [84.8, 85.3][k]; ex[m.id] = { kind: t > tt ? 'oh' : 'ion', glow: t > tt ? 0.4 : 0 }; });
  return ex;
}
function ohDrift(m, t, t0) { // radical random walk (diffusion) after formation
  const d = Math.max(0, t - t0);
  return [vnoise(d * 0.9, m.id) * 30 - 15 + d * 3, vnoise(d * 0.9, m.id + 50) * 30 - 15 + d * 6];
}
function s25(t) {
  if (!RAD) radInit();
  const [ix, iy] = waterPos(RAD.I, t);
  const s = track([[82.0, WS24], [82.6, 2.4], [84.35, 2.4], [85.0, 1.5]], t);
  const [cx0, cy0] = waterCamAt(Math.min(t, 81.4));
  const f = K75(seg(t, 82.0, 82.6));
  const cx = lerp(cx0, ix, f), cy = lerp(cy0, iy, f);
  const v = { ox: CX - cx * s, oy: CY - cy * s, s };
  const ex = radState(t);
  const hop = seg(t, 83.2, 83.75);
  const skip = dnaSkip(hop > 0 && hop < 1 ? [RAD.I.id, RAD.N.id] : []);
  drawWaterField(v, t, { state: waterStateFn(t, ex), skip });
  drawDNAin(v);
  if (hop > 0 && hop < 1) { // proton transfer H2O+ + H2O -> H3O+ + OH
    const [nx, ny, na] = waterPos(RAD.N, t);
    molecule(v.ox + ix * s, v.oy + iy * s, RAD.I.a, s, 'oh', {});
    molecule(v.ox + nx * s, v.oy + ny * s, na, s, 'w', {});
    const k = K75(hop), hx = lerp(ix + Math.cos(RAD.I.a + 0.92) * 8.5, nx + Math.cos(na + Math.PI) * 8.5, k), hy = lerp(iy + Math.sin(RAD.I.a + 0.92) * 8.5, ny + Math.sin(na + Math.PI) * 8.5, k);
    shade(maskDisc(v.ox + hx * s, v.oy + hy * s, 3.6 * s), P.W3, P.I3, P.W1, P.W0);
    rect(v.ox + hx * s + 5, v.oy + hy * s - 8, v.ox + hx * s + 8, v.oy + hy * s - 7, P.INK); rect(v.ox + hx * s + 6, v.oy + hy * s - 9, v.ox + hx * s + 7, v.oy + hy * s - 6, P.INK);
  }
  if (t > 84.15) tag('•OH', v.ox + ix * s + 12 * s, v.oy + iy * s - 26 * s, 84.15, t, { c: P.O3 });
  callout({ text: 'WATER RADIOLYSIS', x: 18, y: LBL_Y, ax: v.ox + ix * s, ay: v.oy + iy * s - 9 * s, t0: 82.3, micro: 'Ionized water produces reactive species.' }, t);
}
// DNA in the water field (DNA_Y set in trackInit)
function s26(t) {
  if (!RAD) radInit();
  const [ix, iy] = waterPos(RAD.I, 84.35);
  const s = 1.5;
  const pan = K75(seg(t, 87.0, 87.45));
  const cx = lerp(ix, ix + 10, pan), cy = lerp(iy, DNA_Y - 40, pan);
  const v = { ox: CX - cx * s, oy: CY - cy * s, s };
  const ex = radState(t);
  drawWaterField(v, t, { state: waterStateFn(t, ex), skip: dnaSkip([RAD.I.id]) });
  const bx = ix + 18; // attack site on the backbone (local x along DNA)
  const brk = [];
  if (t > 88.75) brk.push({ x: bx, strand: 0 });
  if (t > 89.2) brk.push({ x: bx + 6, strand: 1 });
  const sp = backOut(seg(t, 89.65, 90.4), 1.5);
  drawDNAin(v, { breaks: brk, split: t > 89.6 ? { x: bx + 3, dx: 8 * sp, dy: 5 * sp, rot: 0.14 * sp } : null });
  // the radical diffuses to the backbone and reacts
  const sy0 = strandY(bx, 0, 0.4);
  if (t < 88.75) {
    const k = smooth(seg(t, 87.45, 88.75));
    const wob = Math.sin(t * 7) * 4 * (1 - k);
    const ox = lerp(ix, bx, k) + wob, oy = lerp(iy, DNA_Y + sy0 - 10, k);
    molecule(v.ox + ox * s, v.oy + oy * s, RAD.I.a + t, s, 'oh', { glow: 0.5 });
    if (t < 88.4) tag('•OH', v.ox + ox * s + 10, v.oy + oy * s - 30, 87.0, t, { c: P.O3 });
  } else { const k = seg(t, 88.75, 88.95); if (k < 1) glow(v.ox + bx * s, v.oy + (DNA_Y + sy0) * s, 18 * (1 - k) + 3, P.O1, P.O3, 1 - k); }
  // direct hit by a secondary electron
  const u = seg(t, 88.95, 89.45);
  if (u > 0 && u < 1) { const hx = bx + 6, hy = DNA_Y + strandY(bx + 6, 1, 0.4); const x = lerp(hx - 90, hx + 60, u), y = lerp(hy - 140, hy + 95, u); electron(v.ox + x * s, v.oy + y * s, 150, 235, { trail: 14, c0: P.S0, c1: P.S1, c2: P.S2, c3: P.S3, r: 1.6 }); }
  if (t > 89.2) { const k = seg(t, 89.2, 89.4); if (k < 1) glow(v.ox + (bx + 6) * s, v.oy + (DNA_Y + strandY(bx + 6, 1, 0.4)) * s, 16 * (1 - k) + 3, P.S1, P.S3, 1 - k); }
  callout({ text: 'DNA DOUBLE-STRAND BREAK', x: 18, y: LBL_Y, ax: v.ox + (bx + 3) * s, ay: v.oy + (DNA_Y - 26) * s, t0: 87.3, micro: 'Direct and indirect interactions damage DNA.' }, t);
}
// ---------------------------------------------------------------- S27 cellular response
function protein(x, y, s, c1, c2, c0, a) {
  const m = maskEll(x, y, 13 * s, 9 * s, a || 0); shade(m, c1, c2, c0, P.SH, { k: Math.max(1, Math.round(s)) });
  ring(x, y, 4 * s, 1, c0);
}
function s27(t) {
  clear(P.BG);
  // lanes
  const L1 = [8, 66, 262, 226], L2 = [8, 234, 262, 404];
  for (const L of [L1, L2]) { rect(L[0], L[1], L[2], L[3], P.N1); frame(L[0], L[1], L[2], L[3], P.N3); }
  // --- top lane: repair
  const pull = K75(seg(t, 93.35, 93.95)), join = t > 94.0;
  const sp0 = 1 - pull;
  withBuffer(TMPBUF, () => {
    rect(0, 0, W, H, P.N1);
    drawDNA({ ox: 135, oy: 152, s: 1.6 }, { ph: 0.4 + t * 0.2, breaks: join ? [] : [{ x: -3, strand: 0 }, { x: 3, strand: 1 }], split: join ? null : { x: 0, dx: 8 * sp0, dy: 5 * sp0, rot: 0.14 * sp0 } });
  });
  for (let y = L1[1] + 1; y < L1[3] - 1; y++) for (let x = L1[0] + 1; x < L1[2] - 1; x++) buf[y * W + x] = TMPBUF[y * W + x];
  const pin = K75(seg(t, 92.3, 93.0)), pout = K75(seg(t, 94.2, 94.8));
  if (pout < 1) {
    const ax = lerp(-10, 118, pin) - 40 * pout, ay = lerp(90, 150, pin) - 40 * pout;
    const bx = lerp(280, 152 + 12 * sp0, pin) + 40 * pout, by = lerp(214, 158 + 8 * sp0, pin) + 40 * pout;
    protein(ax, ay, 1.4, P.HC2, P.HC3, P.HC0, 0.3); protein(bx, by, 1.4, P.HC2, P.HC3, P.HC0, -0.4);
  }
  if (join && t < 94.25) glow(135, 152, 20 * (1 - seg(t, 94.0, 94.25)), P.I1, P.I3, 1 - seg(t, 94.0, 94.25));
  tag('REPAIR', 16, 72, 92.4, t, { c: P.INK });
  if (t > 94.1) tick(84, 72, P.G2, 2);
  // --- bottom lane: unrepaired damage -> cell stops dividing
  const zo = K75(seg(t, 93.55, 94.25));
  if (zo < 1) {
    withBuffer(TMPBUF, () => { rect(0, 0, W, H, P.N1); drawDNA({ ox: 135, oy: 320, s: lerp(1.6, 0.25, zo) }, { ph: 0.4, breaks: [{ x: -3, strand: 0 }, { x: 3, strand: 1 }], split: { x: 0, dx: 8, dy: 5, rot: 0.14 } }); });
    for (let y = L2[1] + 1; y < L2[3] - 1; y++) for (let x = L2[0] + 1; x < L2[2] - 1; x++) buf[y * W + x] = TMPBUF[y * W + x];
  }
  if (zo > 0) {
    const ccx = 135, ccy = 322, a = zo;
    const stretch = K75(seg(t, 94.3, 94.9)), frag = K75(seg(t, 95.05, 95.8));
    if (frag <= 0) {
      const rx = 46 * (1 + 0.28 * stretch) * a, ry = 40 * (1 - 0.12 * stretch) * a;
      const m = maskFn(ccx - rx - 2, ccy - ry - 2, ccx + rx + 2, ccy + ry + 2, (x, y) => { const u = (x - ccx) / rx, v = (y - ccy) / ry; const pinch = 1 - 0.18 * stretch * Math.exp(-u * u * 8); return u * u + (v / pinch) * (v / pinch) <= 1; });
      shade(m, P.R2, P.RC1, P.R1, P.R0, { k: 2 });
      disc(ccx, ccy, 16 * a, P.L1); ring(ccx, ccy, 16 * a, 1, P.L0);
      if (a > 0.6) { line(ccx - 5, ccy - 3, ccx + 2, ccy + 4, P.I2); line(ccx + 4, ccy - 4, ccx - 1, ccy + 5, P.I2); disc(ccx + 0.5, ccy + 0.5, 2.5, P.O1, 0.7); }
    } else { // apoptotic fragments drifting apart, shrinking
      for (let i = 0; i < 6; i++) {
        const ang = i / 6 * TAU + 0.4, d = 8 + 26 * frag, r = lerp(22, 9, frag) * (0.7 + 0.5 * hash(i * 3));
        shade(maskDisc(ccx + Math.cos(ang) * d, ccy + Math.sin(ang) * d * 0.8, r), P.R2, P.RC1, P.R1, P.R0);
        if (i % 2 === 0) disc(ccx + Math.cos(ang) * d, ccy + Math.sin(ang) * d * 0.8, r * 0.4, P.L1);
      }
    }
  }
  tag('UNREPAIRED DAMAGE', 16, 240, 92.6, t, { c: P.INK });
  callout({ text: 'CELLULAR RESPONSE', x: 18, y: LBL_Y - 4, ax: null, t0: 92.2 }, t);
}
// ---------------------------------------------------------------- S28 treatment over time
const SESS = [0, 1, 2, 3, 4, 5, 6].map(k => 96.33 + k * BEAT);
const TS_R = 230;
function sessProg(t) { let n = 0; for (const s of SESS) if (t >= s) n += 1; return n; }
function deadFn(prog) { // prog: sessions delivered (0..7, may be fractional)
  return (i, j, tumor) => {
    if (!tumor) return 0;
    const [sx, sy] = tSeed(i, j); const r = Math.hypot(sx, sy) / TS_R;
    const tau = clamp((1 - r) * 0.95 + 0.35 * hash2(i + 77, j + 31), 0.05, 1.3) * 7;
    return clamp((prog - tau) * 1.6, 0, 2);
  };
}
const S28V = { ox: 135, oy: 206, s: 0.5 };
function s28(t) {
  let prog = 0; for (const s of SESS) prog += clamp((t - s) / 0.35, 0, 1);
  drawTissue(S28V, { R: TS_R, dead: deadFn(prog) });
  // each session: a brief yellow sweep across the target (radiation visualised)
  for (const s of SESS) { const k = seg(t, s, s + 0.2); if (k > 0 && k < 1) { const y = lerp(80, 330, k); rect(20, y - 6, 250, y + 6, P.Y1, 0.35); rect(20, y - 1, 250, y + 1, P.Y2, 0.6); } }
  // timeline
  const y = 352, x0 = 26, x1 = 244;
  rect(0, 336, W, H, P.BG); rect(0, 336, W, 337, P.N3);
  rect(x0, y, x1, y + 1, P.N5);
  for (let k = 0; k < 10; k++) { const x = lerp(x0 + 8, x1 - 8, k / 9); const done = k < SESS.length && t >= SESS[k]; rect(x - 2, y - 4, x + 3, y + 5, done ? P.Y2 : P.N4); if (k === 4) rect(x + 9, y - 6, x + 10, y + 7, P.N6); }
  const n = sessProg(t);
  if (n > 0) text(FM, 'SESSION ' + Math.min(n, 99), x0, y - 22, { sc: 2, c: P.INK });
  microText('OVER WEEKS', CX, 372, 96.9, t, { align: 'center', c: P.SUB });
  callout({ text: 'TREATMENT OVER TIME', x: 18, y: LBL_Y, ax: null, t0: 96.25 }, t);
}
// ---------------------------------------------------------------- S29 zoom-out + title
function s29(t) {
  const out = seg(t, 100.15, 101.5);
  const M = Math.exp(lerp(Math.log(0.5 / U_T), Math.log(0.62), K75(out)));
  const g = K75(out);
  const cx = 0, cy = lerp((240 - S28V.oy) / (0.5 / U_T), 8.5, smooth(seg(out, 0.5, 1)));
  const tr = [[5.5, 9], [105, 140], [470, 620], [1700, 2300]];
  const roomO = { phi: 0, off: [0, 0], tumorR: TUMOR_R1, ghostR: TUMOR_R0, ghostPhase: t * 8 };
  const end = seg(t, 104.45, 104.98);
  const drawMain = () => {
    drawChain(M, cx, cy, t, { outer: 'room', room: roomO, tissue: { R: TS_R, dead: deadFn(7) }, tr });
    const dim = seg(t, 101.45, 101.75);
    if (dim > 0) darken(0.62 * dim);
    if (t > 101.5) {
      text(FT, 'HOW MEDICAL LINEAR', CX, 98, { sc: 2, bold: true, align: 'center', shadow: P.N4, sd: 2, n: (t - 101.6) * 55 });
      text(FT, 'ACCELERATORS WORK', CX, 126, { sc: 2, bold: true, align: 'center', shadow: P.N4, sd: 2, n: (t - 101.95) * 55 });
      iconChain(t);
      if (t > 103.75) { const s = 'RESPONSES VARY.'; text(FL, s, CX, 262, { sc: 2, c: P.C5, align: 'center', n: (t - 103.75) * 40 }); }
    }
  };
  if (end <= 0) drawMain();
  else {
    withBuffer(TMPBUF, drawMain);
    const c = new Cam(34, 4, 1.15);
    chainLayer('body', c.z, c.cx, c.cy, t, { body: { style: 'illus', tumorR: TUMOR_R1, ghostR: TUMOR_R0, ghostPhase: t * 10 } });
    dissolve(TMPBUF, buf, smooth(end), buf);
  }
  if (out > 0.02 && out < 0.98) {
    const k = seg(t, 100.3, 100.5) * (1 - seg(t, 101.25, 101.45));
    if (k > 0) tag('ILLUSTRATIVE RESPONSE', CX, 120, 100.3, t, { align: 'center', c: P.R4, plate: P.R1 });
  }
}
function miniDNA(x, y) { // small double helix with a double-strand break
  for (const half of [-1, 1]) {
    const ox = half < 0 ? -2 : 2, oy = half < 0 ? 0 : 3;
    for (let k = 0; k < 2; k++) {
      let prev = null;
      for (let u = 0; u <= 15; u += 1) {
        const xx = x + ox + half * (2 + u), yy = y + oy + 7 * Math.sin(u * 0.42 + k * 2.4 + (half < 0 ? 0 : 0.6));
        if (prev) lineW(prev[0], prev[1], xx, yy, 2, k ? P.I1 : P.I2);
        prev = [xx, yy];
      }
    }
    for (let u = 2; u <= 15; u += 4) { const xx = x + ox + half * (2 + u); line(xx, y + oy + 7 * Math.sin(u * 0.42 + (half < 0 ? 0 : 0.6)), xx, y + oy + 7 * Math.sin(u * 0.42 + 2.4 + (half < 0 ? 0 : 0.6)), P.L2); }
  }
  glow(x, y + 1, 6, P.O1, P.O3, 0.7);
}
function iconChain(t) {
  const y = 198, xs = [42, 104, 166, 228];
  const ts = [102.19, 102.66, 103.13, 103.59];
  for (let i = 0; i < 4; i++) {
    const k = backOut(seg(t, ts[i], ts[i] + 0.25), 2.2); if (k <= 0) continue;
    const x = xs[i], s = k;
    rect(x - 22 * s, y - 20 * s, x + 22 * s, y + 20 * s, P.K0); frame(x - 22 * s, y - 20 * s, x + 22 * s, y + 20 * s, P.N5);
    if (k < 0.9) continue;
    if (i === 0) electron(x + 6, y, 1, 0, { trail: 18, r: 2.4, gr: 8 });
    else if (i === 1) photon(x + 12, y, 1, 0, { len: 26, amp: 4, wl: 6, glow: 0.8 });
    else if (i === 2) { molecule(x - 2, y + 2, 0.6, 1.1, 'ion', {}); electron(x + 13, y - 9, 1, -0.6, { trail: 7, glow: false, c1: P.S1, c2: P.S2, c3: P.S3 }); }
    else miniDNA(x, y);
    if (i < 3) text(FM, '>', x + 26, y - 5, { sc: 2, c: P.SUB, ol: null });
  }
}
// ---------------------------------------------------------------- scene table
const SCENES = [
  [0, 2, s01], [2, 5, s02], [5, 8, s03], [8, 11, s04, 0.25], [11, 14, s05], [14, 17, s06, 0.25], [17, 20, s07],
  [20, 22, s08, 0.2], [22, 24, s09, 0.2], [24, 27, s10], [27, 30, s11], [30, 33, s12], [33, 38, s13], [38, 40, s14],
  [40, 43, s15], [43, 49, s16], [49, 52, s17], [52, 55, s18], [55, 58, s19], [58, 64, s20, 0.25], [64, 70, s21, 0.25],
  [70, 73, s22], [73, 78, s23], [78, 82, s24], [82, 87, s25], [87, 92, s26], [92, 96, s27, 0.25], [96, 100, s28, 0.25],
  [100, 105, s29, 0.25],
];
function sceneIndex(t) { for (let i = 0; i < SCENES.length; i++) if (t < SCENES[i][1]) return i; return SCENES.length - 1; }
// badge intervals
const RAD_IV = [[3.72, 5.3], [17.58, 18.6], [23.15, 24.0], [31.0, 70.0], [74.25, 92.0], [96.3, 99.9]];
const SCALE_IV = [[2.32, 7.0], [43.3, 48.4], [73.3, 96.0], [100.0, 101.5]];
function ivStart(iv, t) { for (const [a, b] of iv) if (t >= a && t < b) return a; return null; }
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  const i = sceneIndex(t), S = SCENES[i];
  S[2](t);
  const d = S[3];
  if (d && i > 0 && t < S[0] + d) {
    withBuffer(TRANSBUF, () => SCENES[i - 1][2](t));
    dissolve(TRANSBUF, buf, smooth((t - S[0]) / d), buf);
  }
  const ra = ivStart(RAD_IV, t), sa = ivStart(SCALE_IV, t);
  if (ra !== null) badgeRad(ra, t);
  if (sa !== null) badgeScale(sa, t, undefined, ra !== null);
}
