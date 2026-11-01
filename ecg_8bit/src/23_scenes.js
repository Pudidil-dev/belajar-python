'use strict';
// ============================================================================
// SCENE COMPOSITOR: 20 micro-scenes in 6 continuous sequences (SC_T, 120 BPM).
// One patient, one monitor, three electrodes, one heart, one heartbeat followed
// in slow motion, one Lead II waveform, one amplifier chain:
// the monitor beeps → the cable → the electrodes → through the chest → the SA
// node → one pacemaker cell's ion currents → gap junctions → the atria and the
// P wave → the AV-node delay → His bundle and bundle branches → Purkinje
// fibres → one ventricular cell → the QRS (the beep on the drop) → recovery and
// the T wave → voltage bands across the body → one electrode on the skin → the
// difference amplifier → amplification → filtering → the ADC → back to the
// monitor (loop). Calm zoom crossfades join the scales; no flashes.
// The picture is built in four passes: visual (the worlds and their
// crossfades, by time, not by scene), hud (graphs and panels), tags (leader
// labels), overlays (captions, chips, title).
// ============================================================================
function crossWorld(drawB, k) {
  if (k <= 0) return; if (k >= 1) { drawB(); return; }
  withBuffer(TMPBUF, drawB);
  mixInto(buf, TMPBUF, k);
}
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
const xf = (t, a, b) => smooth(seg(t, a, b));
const zin = (t, a, b, from) => lerp(from === undefined ? 0.72 : from, 1, eout(seg(t, a, b)));   // from < 1 grows in, from > 1 settles out
// ============================================================================ cameras (pure functions of t)
const HA = [165, 236];                                                    // where the heart-world focus sits on screen
const HC = (cx, cy, z) => new Cam(cx, cy, z, HA[0], HA[1]);
// the heart-map camera that shows exactly what a ward / torso camera shows of the heart in the chest
const heartFrom = cam => new Cam((cam.cx - HEART_AT.x) / HEART_AT.s, (cam.cy - HEART_AT.y) / HEART_AT.s, cam.z * HEART_AT.s, cam.ax, cam.ay);
const zoomBy = (cam, f) => new Cam(cam.cx, cam.cy, cam.z * f, cam.ax, cam.ay);
const HOOK = [180, 270, 1.12];
// A: the monitor → down the cable → the three electrodes → into the chest (ends registered with the heart world)
const hookCam = t => camTrack([[0.0, HOOK[0], HOOK[1], HOOK[2]], [1.0, 180, 274, 1.15, lin], [1.55, 246, 520, 1.02, K50], [2.05, 188, 742, 0.86, K50], [3.0, 195.6, 800, 2.5, K75]], t);
// B: the whole heart → the SA node (and on into one of its cells); later the atria for the P wave
function heartCamB(t) {
  if (t < 7.0) { const u = K50(seg(t, 3.4, 5.0)); return HC(lerp(-6, -92, u), lerp(-14, -134, u), Math.exp(lerp(0, Math.log(2.6), u)) * (1 + 0.6 * ein(seg(t, 4.85, 5.4)))); }
  return HC(-10, -96, 1.5 * zin(t, 9.55, 10.4, 1.9) * (1 + 0.05 * ph(t, 10.0, 12.0, lin)));
}
const paceCam = t => new Cam(0, -30, 1.45 * zin(t, 4.95, 5.6, 0.7) * (1 - 0.3 * xf(t, 7.8, 8.25)), 165, 330);
const gjCam = t => { const u = K50(seg(t, 7.8, 10.0)); return new Cam(lerp(-110, 0, u), 0, Math.exp(lerp(Math.log(2.1), Math.log(0.8), u)), 165, 300); };
// C: AV node → His bundle → bundle branches → Purkinje network → the whole ventricles
const heartCamC = t => camTrack([[12.0, -10, -96, 1.575], [13.2, -6, -46, 3.2, K50], [15.0, -4, -42, 3.3, lin], [16.6, 14, 30, 1.9, K50], [17.0, 14, 30, 1.9, lin], [18.3, 0, 14, 1.02, K50], [22.0, 0, 14, 1.06, lin], [24.0, 0, 14, 1.08, lin], [26.0, 0, 14, 1.04, lin]], t, HA[0], HA[1]);
// around the two visits to a ventricular cell the heart swells as we dive in and settles as we come back out
function heartCamV(t) {
  const f = t < 20.6 ? 1 + 0.8 * ein(seg(t, 19.55, 19.95)) : t < 23.0 ? lerp(1.8, 1, eout(seg(t, 21.35, 21.9))) : t < 25.0 ? 1 + 0.8 * ein(seg(t, 24.2, 24.6)) : lerp(1.8, 1, eout(seg(t, 25.45, 26.0)));
  return zoomBy(heartCamC(t), f);
}
const ventCam = (t, t0, t1) => new Cam(0, -30, 1.45 * zin(t, t0, t0 + 0.6, 0.6) * (1 - 0.3 * xf(t, t1, t1 + 0.4)), 165, 330);
const vent1 = t => ventCam(t, 19.55, 21.35), vent2 = t => ventCam(t, 24.2, 25.45);
// D: pull out of the heart to the whole chest (starts registered with the heart world), then dive into the LL electrode
const fieldCam = t => camTrack([[26.0, 192, 813.8, 2.6], [27.2, 186, 792, 0.82, K50], [29.0, 186, 792, 0.84, lin], [29.75, 248, 878, 2.6, ein]], t, 165, 330);
// the field map follows one more beat, slowed hard around the R wave so the strongest pattern can be read
const FIELD_MS = [[26.0, 480], [26.5, 900], [26.85, 1000], [27.2, 1030], [28.7, 1037], [29.1, 1073], [29.6, 1150], [30.0, 1230]];
function fieldMs(t) {
  let i = 0; while (i + 2 < FIELD_MS.length && t > FIELD_MS[i + 1][0]) i++;
  const [ta, ma] = FIELD_MS[i], [tb, mb] = FIELD_MS[i + 1], m = lerp(ma, mb, clamp((t - ta) / (tb - ta), 0, 1));
  return m > 633 ? m - RR * 1000 : m;
}
const elecCam = t => { const u = ein(seg(t, 31.5, 32.3)); return new Cam(lerp(0, 120, u), lerp(-10, -120, u), 1.6 * zin(t, 29.5, 30.1, 0.7), 165, 300); };
// E: along the board, following the wires: connector → IN-AMP → FILTER → ADC → CPU
const boardCam = t => camTrack([[31.9, -250, -170, 1.15], [32.8, -150, 0, 1.15, K50], [34.8, BRD.amp - 20, 0, 1.15, K50], [35.8, BRD.amp, 0, 1.5, K50], [38.0, BRD.amp + 10, 0, 1.5, lin], [38.6, BRD.flt, 0, 1.5, K50], [40.0, BRD.flt + 10, 0, 1.5, lin], [40.7, BRD.adc + 30, 0, 1.3, K50], [43.0, BRD.cpu + 40, 0, 1.25, lin]], t, 165, 324);
const boardHot = t => t < 33.0 ? null : t < 38.4 ? 'amp' : t < 40.5 ? 'flt' : t < 42.2 ? 'adc' : 'cpu';
// F: from the monitor's screen back out to the opening composition
const endCam = t => camTrack([[42.8, 180, 176, 2.3], [44.2, HOOK[0], HOOK[1], HOOK[2], K50], [48.0, HOOK[0], HOOK[1], HOOK[2], lin]], t);
// ============================================================================ worlds used here
const HEART_DUST = Array.from({ length: 40 }, (_, i) => ({ x: (hash(i + 3100) - 0.5) * 700, y: (hash(i + 3101) - 0.5) * 900, k: 0.3 + 0.7 * hash(i + 3102), ph: hash(i + 3103) * TAU }));
function heartWorld(cam, t, ms, cond) {
  rect(0, 0, W, H, P.BG);
  for (const d of HEART_DUST) { const x = cam.x(d.x + 10 * wob(t, 1, d.ph)), y = cam.y(d.y + 8 * wob(t, 2, d.ph)); disc(x, y, Math.max(1, d.k * 1.6 * Math.min(2, cam.z)), d.k > 0.7 ? P.N4 : P.N3); }
  drawHeart(cam, ms, { cond: cond === undefined ? 1 : cond });
}
function fieldView(t) {
  const off = 1 - ph(t, 29.0, 29.3);
  torsoField(fieldCam(t), t, { ms: fieldMs(t), bands: ph(t, 26.2, 26.8), arrow: ph(t, 27.0, 27.3) * off, axis: ph(t, 27.8, 28.1) * off, hiElec: { LL: ph(t, 29.0, 29.3) } });
}
// ============================================================================ pass 1: the worlds and the crossfades between them
function visual(t) {
  if (t < 3.0) {                                                         // A: monitor → cable → electrodes → into the chest
    const cam = hookCam(t), ms = beatMs(t), he = k => k * (1 - ph(t, 2.2, 2.35));
    wardScene(cam, t, { xray: ph(t, 2.12, 2.55), heartMs: ms, cond: ph(t, 2.35, 2.75), hiElec: { RA: he(ph(t, 1.5, 1.65)), LA: he(ph(t, 1.625, 1.775)), LL: he(ph(t, 1.75, 1.9)) } });
    if (t > 2.6) crossWorld(() => heartWorld(heartFrom(cam), t, ms, 1), xf(t, 2.6, 3.0));
  }
  else if (t < 4.95) heartWorld(heartCamB(t), t, physMs(t), 1);          // B: the SA node
  else if (t < 5.4) { heartWorld(heartCamB(t), t, physMs(t), 1); crossWorld(() => membraneWorld(paceCam(t), t, 'pace'), xf(t, 4.95, 5.4)); }
  else if (t < 7.8) membraneWorld(paceCam(t), t, 'pace');                //    one pacemaker cell's membrane
  else if (t < 8.25) { membraneWorld(paceCam(t), t, 'pace'); crossWorld(() => gapJunctionWorld(gjCam(t), t), xf(t, 7.8, 8.25)); }
  else if (t < 9.55) gapJunctionWorld(gjCam(t), t);                      //    cell to cell
  else if (t < 10.0) { gapJunctionWorld(gjCam(t), t); crossWorld(() => heartWorld(heartCamB(t), t, physMs(t), 1), xf(t, 9.55, 10.0)); }
  else if (t < 12.0) heartWorld(heartCamB(t), t, physMs(t), 1);          //    the atria: P wave
  else if (t < 19.55) heartWorld(heartCamC(t), t, physMs(t), 1);         // C: AV node, His, branches, Purkinje
  else if (t < 19.95) { heartWorld(heartCamV(t), t, physMs(t), 1); crossWorld(() => membraneWorld(vent1(t), t, 'vent'), xf(t, 19.55, 19.95)); }
  else if (t < 21.35) membraneWorld(vent1(t), t, 'vent');                //    one ventricular cell: fast Na⁺, Ca²⁺ plateau
  else if (t < 21.75) { membraneWorld(vent1(t), t, 'vent'); crossWorld(() => heartWorld(heartCamV(t), t, physMs(t), 1), xf(t, 21.35, 21.75)); }
  else if (t < 24.2) heartWorld(heartCamV(t), t, physMs(t), 1);          //    QRS
  else if (t < 24.6) { heartWorld(heartCamV(t), t, physMs(t), 1); crossWorld(() => membraneWorld(vent2(t), t, 'vent'), xf(t, 24.2, 24.6)); }
  else if (t < 25.45) membraneWorld(vent2(t), t, 'vent');                //    K⁺ out
  else if (t < 25.85) { membraneWorld(vent2(t), t, 'vent'); crossWorld(() => heartWorld(heartCamV(t), t, physMs(t), 1), xf(t, 25.45, 25.85)); }
  else if (t < 26.0) heartWorld(heartCamV(t), t, physMs(t), 1);          //    T wave
  else if (t < 26.45) { heartWorld(heartFrom(fieldCam(t)), t, fieldMs(t), 1); crossWorld(() => fieldView(t), xf(t, 26.0, 26.45)); }
  else if (t < 29.5) fieldView(t);                                       // D: voltage across the body
  else if (t < 29.95) { fieldView(t); crossWorld(() => electrodeSection(elecCam(t), t), xf(t, 29.5, 29.95)); }
  else if (t < 31.9) electrodeSection(elecCam(t), t);                    //    one electrode on the skin
  else if (t < 32.3) { electrodeSection(elecCam(t), t); crossWorld(() => boardWorld(boardCam(t), t, {}), xf(t, 31.9, 32.3)); }
  else if (t < 42.8) boardWorld(boardCam(t), t, { hot: boardHot(t) });  // D–E: difference, gain, filter, ADC
  else if (t < 43.25) { boardWorld(boardCam(t), t, { hot: boardHot(t) }); crossWorld(() => wardScene(endCam(t), t, {}), xf(t, 42.8, 43.25)); }
  else wardScene(endCam(t), t, { marks: ph(t, 44.25, 44.45) * (1 - ph(t, 44.9, 45.1)), markR: DUR - 5 * RR, pip: ph(t, 43.5, 43.75) * (1 - ph(t, 44.85, 45.05)) });   // F: the waveform on the monitor
}
// ============================================================================ pass 2: graphs and panels
// the slowed Lead II strip (one beat, real proportions; a playhead walks through it while the heart works above)
const STRIP = [16, 404, 292, 494];
function ecgStrip(t, a) {
  if (a <= 0) return;
  withDither(a, () => {
    const [x0, y0, x1, y1] = STRIP, gx0 = x0 + 6, gx1 = x1 - 6, base = y1 - 24, amp = 40, X_ = ms => lerp(gx0, gx1, ms / 600), Yv = ms => base - ecgMV(ms) * amp;
    rect(x0, y0, x1, y1, P.SC0); frame(x0, y0, x1, y1, P.EG1);
    text(FS, 'LEAD II · SLOWED DOWN', x0 + 6, y0 + 5, { sc: 2, c: P.EG2, ol: null });
    for (let k = 1; k < 12; k++) rect(X_(k * 50), y0 + 19, X_(k * 50) + 1, y1 - 3, P.SC2);
    let px_ = null, py_ = null;
    for (let x = gx0; x <= gx1; x++) { const y = Yv((x - gx0) / (gx1 - gx0) * 600); if (px_ !== null) line(px_, py_, x, y, P.SC3); px_ = x; py_ = y; }
    const now = physMs(t), mNow = clamp(now, 0, 600); px_ = null;
    for (let x = gx0; x <= X_(mNow); x++) { const y = Yv((x - gx0) / (gx1 - gx0) * 600); if (px_ !== null) lineW(px_, py_, x, y, 2.5, P.EG2); px_ = x; py_ = y; }
    if (now > 0 && now < 600) { rect(X_(mNow), y0 + 19, X_(mNow) + 1, y1 - 3, P.EG3); disc(X_(mNow), Yv(mNow), 3, P.EG4); }
    // each wave is named as soon as it has been drawn
    const nm_ = (s, ms, c, dy, when) => { const k = clamp((now - when) / 12, 0, 1); if (k > 0) text(FC, s, X_(ms), Yv(ms) - dy, { sc: 2, c, ol: P.SH, align: 'center', n: k * 4 }); };
    nm_('P', 45, P.SA2, 24, 70); nm_('T', 395, P.KK1, 26, 410);
    { const k = clamp((now - 206) / 12, 0, 1); if (k > 0) text(FC, 'QRS', X_(200) + 9, Yv(200) + 6, { sc: 2, c: P.EG4, ol: P.SH, n: k * 4 }); }
  });
}
const VM_BOX = [16, 96, 292, 196];
const PT = [16, 96, 292, 174], PT2 = [16, 96, 292, 204], PM = [16, 180, 292, 248], PB = [16, 392, 292, 476];
const panel = (r, t, fn, o) => wavePanel(r[0], r[1], r[2], r[3], t, fn, o);
const SAMPLE = 0.0625;                                                     // ADC sample period (drawn far slower than real; 2 per 16th note)
const sampleCount = ts => Math.round(2048 + leadFiltered(ts) * 1100);    // 12-bit numbers (illustrative)
const RECAP = ['HEART CELLS', 'SKIN VOLTAGE', 'ELECTRODES', 'SIGNAL PROCESSING', 'ECG'];
function hud(t) {
  // B, C: the slowed strip under the heart
  if (t >= 10.0 && t < 26.3) ecgStrip(t, ph(t, 10.0, 10.35) * (1 - ph(t, 25.95, 26.3)));
  // membrane voltage during the cell visits
  const gp = ph(t, 5.3, 5.6) * (1 - ph(t, 7.75, 8.0));
  if (gp > 0) withDither(gp, () => vmGraph(VM_BOX[0], VM_BOX[1], VM_BOX[2], VM_BOX[3], t, 5.0, 8.0, vmPacemaker, -70, 20, { thr: -40 }));
  const gv = ph(t, 19.8, 20.05) * (1 - ph(t, 21.25, 21.45)) + ph(t, 24.45, 24.65) * (1 - ph(t, 25.3, 25.5));
  if (gv > 0) withDither(gv, () => vmGraph(VM_BOX[0], VM_BOX[1], VM_BOX[2], VM_BOX[3], t, 19.8, 25.8, vmVentricle, -95, 35));
  // D–E: what the electrodes see, and what the front end does to it (panels morph into each other)
  const a1 = ph(t, 30.0, 30.3) * (1 - ph(t, 34.85, 35.2)), a2 = ph(t, 32.3, 32.6) * (1 - ph(t, 34.85, 35.2)), a3 = ph(t, 33.5, 33.7) * (1 - ph(t, 34.85, 35.2));
  if (a1 > 0) withDither(a1, () => panel(PT, t, vLL, { label: 'V(LL)', unit: 'mV', lo: -1.6, hi: 1.9, lcol: P.CR }));
  if (a2 > 0) withDither(a2, () => panel(PM, t, vRA, { label: 'V(RA)', unit: 'mV', lo: -1.6, hi: 1.9, lcol: P.EW }));
  if (a3 > 0) withDither(a3, () => panel(PB, t, leadRaw, { label: 'V(LL) - V(RA)', unit: 'mV', lo: -1.0, hi: 1.7, lcol: P.YEL }));
  const a4 = ph(t, 34.9, 35.25) * (1 - ph(t, 38.0, 38.3));
  if (a4 > 0) withDither(a4, () => { panel(PT, t, leadRaw, { label: 'IN  ≈ 1 mV', lo: -9, hi: 14, lcol: P.SUB }); panel(PB, t, leadRaw, { label: 'OUT  ≈ 1 V', lo: -1.0, hi: 1.7, lcol: P.EG3, lw: 3 }); });
  const a5 = ph(t, 38.0, 38.3) * (1 - ph(t, 40.0, 40.3));
  if (a5 > 0) withDither(a5, () => { panel(PT2, t, leadRaw, { label: 'RAW', lo: -1.0, hi: 1.8, lcol: P.NZ2, col: P.NZ2 }); panel(PB, t, leadFiltered, { label: 'FILTERED', lo: -1.0, hi: 1.7, lcol: P.EG3 }); });
  const a6 = ph(t, 40.0, 40.3) * (1 - ph(t, 42.8, 43.2));
  if (a6 > 0) withDither(a6, () => {
    panel(PT2, t, leadFiltered, { label: 'ANALOG', lo: -1.0, hi: 1.7, lcol: P.EG3 });
    withDither(ph(t, 40.3, 40.7), () => panel(PT2, t, leadFiltered, { lo: -1.0, hi: 1.7, dots: SAMPLE, ticks: 1, dcol: P.DT4, overlay: true }));
    panel(PB, t, leadFiltered, { label: 'DIGITAL', lo: -1.0, hi: 1.7, lcol: P.DT3, dots: SAMPLE, steps: 1, col: P.DT2, dcol: P.DT3 });
    // the numbers ride the data bus from the ADC to the CPU
    const cam = boardCam(t), pk = ph(t, 40.45, 40.6);
    if (pk > 0) for (let k = Math.ceil((t - 1.5) / 0.5); k <= Math.floor(t / 0.5); k++) {
      const ts = k * 0.5, u = (t - ts) / 1.5; if (u < 0 || u > 1 || ts < 40.4) continue;
      const s = String(sampleCount(ts)), x = cam.x(lerp(BRD.adc + 52, BRD.cpu - 62, u)) - textW(FS, s, 2) / 2, y = cam.y(0) - 7;
      rect(x - 4, y - 4, x + textW(FS, s, 2) + 4, y + 16, P.K0); frame(x - 4, y - 4, x + textW(FS, s, 2) + 4, y + 16, P.DT2);
      text(FS, s, x, y, { sc: 2, c: P.DT4, ol: null });
    }
  });
  // F: the heart beside the waveform, then the recap
  const a = ph(t, 44.95, 45.1) * (1 - ph(t, 46.6, 46.85));
  if (a > 0) {
    tintAll(P.K0, 0.62 * a);
    RECAP.forEach((s, i) => {
      const t0 = 45.0 + i * 0.25, k = ph(t, t0, t0 + 0.12) * (1 - ph(t, 46.6, 46.85)); if (k <= 0) return;
      const y = 140 + i * 66, tw = textW(FC, s, 2), x = Math.round(154 - tw / 2), last = i === RECAP.length - 1;
      withDither(k, () => {
        rect(x - 10, y - 8, x + tw + 10, y + 26, P.K0); frame(x - 10, y - 8, x + tw + 10, y + 26, last ? P.EG2 : P.DT2);
        text(FC, s, x, y, { sc: 2, c: last ? P.EG2 : P.INK, ol: null });
        if (!last) { lineW(154, y + 30, 154, y + 48, 2, P.YEL); arrowHead(154, y + 52, Math.PI / 2, 5, P.YEL); }
      });
    });
  }
}
// ============================================================================ pass 3: leader-line tags on the things themselves
function tags(t) {
  if (t < 3.0) {
    const cam = hookCam(t);
    tag('RA', cam.x(ELEC.RA[0]), cam.y(ELEC.RA[1]), 34, 196, 1.5, 2.3, t, P.C6, 3);
    tag('LA', cam.x(ELEC.LA[0]), cam.y(ELEC.LA[1]), 238, 196, 1.625, 2.3, t, P.C4, 3);
    tag('LL', cam.x(ELEC.LL[0]), cam.y(ELEC.LL[1]), 238, 452, 1.75, 2.3, t, P.RED, 3);
    return;
  }
  if (t < 12.0) {
    let cam = heartCamB(t);
    tag('SA NODE', cam.x(SA_NODE[0]), cam.y(SA_NODE[1]), 150, 128, 3.5, 4.9, t, P.SA2, 3);
    cam = paceCam(t);
    tag('Na⁺ IN (SLOW)', cam.x(MEM.chX[0]), cam.y(-40), 22, 226, 5.5, 6.45, t, P.NA1, 3);
    tag('Ca²⁺ IN', cam.x(MEM.chX[1]), cam.y(-40), 120, 226, 6.5, 7.3, t, P.CA1, 3);
    tag('K⁺ OUT', cam.x(MEM.chX[2]), cam.y(40), 150, 466, 7.0, 7.75, t, P.KK1, 3);
    cam = gjCam(t);
    tag('GAP JUNCTIONS', cam.x((GJ.xs[1] + GJ.xs[2]) / 2), cam.y(-GJ.hh), 60, 160, 8.5, 9.5, t, P.CY2, 3);
    cam = heartCamB(t);
    tag('ATRIA', cam.x(70), cam.y(-130), 200, 110, 10.45, 11.95, t, P.HM5, 3);
    return;
  }
  if (t < 26.0) {
    let cam = heartCamC(t);
    tag('AV NODE', cam.x(AV_NODE[0]), cam.y(AV_NODE[1] + AV_NODE[3]), 40, 330, 12.5, 14.95, t, P.AV2, 3);
    tag('≈ 0.1 s DELAY', cam.x(AV_NODE[0] + AV_NODE[2]), cam.y(AV_NODE[1] - AV_NODE[3]), 150, 120, 13.5, 14.95, t, P.AV3, 2);
    tag('BUNDLE OF HIS', cam.x(-1), cam.y(-32), 26, 120, 15.25, 16.6, t, P.CY2, 3);
    tag('BUNDLE BRANCHES', cam.x(17), cam.y(28), 40, 340, 16.25, 16.98, t, P.CY2, 3);
    tag('PURKINJE FIBERS', cam.x(98), cam.y(60), 70, 110, 17.75, 18.98, t, P.CY2, 3);
    cam = vent1(t);
    tag('FAST Na⁺ IN', cam.x(MEM.chX[0]), cam.y(-40), 22, 226, 20.25, 20.95, t, P.NA1, 3);
    tag('Ca²⁺ PLATEAU', cam.x(MEM.chX[1]), cam.y(-40), 110, 226, 20.5, 21.3, t, P.CA1, 3);
    cam = heartCamV(t);
    tag('VENTRICLES ACTIVE', cam.x(66), cam.y(96), 96, 350, 22.15, 23.95, t, P.HM5, 2);
    tag('ATRIA RECOVER', cam.x(-70), cam.y(-130), 22, 112, 22.3, 23.95, t, P.SUB, 2);
    cam = vent2(t);
    tag('K⁺ OUT', cam.x(MEM.chX[2]), cam.y(40), 150, 300, 24.5, 25.4, t, P.KK1, 3);
    return;
  }
  if (t < 32.0) {
    let cam = fieldCam(t);
    tag('NEGATIVE', cam.x(ELEC.RA[0]), cam.y(ELEC.RA[1]), 20, 112, 27.25, 28.95, t, P.FN4, 3);
    tag('POSITIVE', cam.x(ELEC.LL[0]), cam.y(ELEC.LL[1]), 165, 438, 27.5, 28.95, t, P.FP4, 3);
    tag('LEAD II', cam.x(lerp(ELEC.RA[0], ELEC.LL[0], 0.55)), cam.y(lerp(ELEC.RA[1], ELEC.LL[1], 0.55)), 20, 398, 28.0, 28.95, t, P.EG2, 3);
    cam = elecCam(t);
    tag('LEAD WIRE', cam.x(100), cam.y(-100), 196, 196, 30.25, 31.6, t, P.CR, 3);
    tag('Ag/AgCl SENSOR', cam.x(-40), cam.y(3), 20, 236, 30.5, 31.6, t, P.AL3, 2);
    tag('CONDUCTIVE GEL', cam.x(-50), cam.y(20), 20, 268, 30.75, 31.6, t, P.GL2, 2);
    tag('SKIN', cam.x(-80), cam.y(50), 20, 444, 31.0, 31.6, t, P.SK4, 3);
    return;
  }
  if (t < 43.0) {
    const cam = boardCam(t);
    tag('+ INPUT: LL', cam.x(BRD.amp - 34), cam.y(-24), 150, 256, 33.0, 34.9, t, P.FP4, 2);
    tag('- INPUT: RA', cam.x(BRD.amp - 34), cam.y(24), 150, 374, 33.25, 34.9, t, P.FN4, 2);
    tag('× 1000', cam.x(BRD.amp + 30), cam.y(-48), 210, 196, 36.0, 37.95, t, P.YEL, 3);
    const r = { Yv: v => lerp(PT2[3] - 5, PT2[1] + 18, (v + 1.0) / 2.8), x: tt => PT2[2] - 4 - (t - tt) / 2.4 * (PT2[2] - PT2[0] - 8) };
    tag('BASELINE WANDER', r.x(t - 2.0), r.Yv(leadRaw(t - 2.0)), 20, 214, 38.5, 39.95, t, P.NZ2, 2);
    tag('MAINS HUM', r.x(t - 1.12), r.Yv(leadRaw(t - 1.12)), 196, 214, 38.75, 39.95, t, P.NZ2, 2);
    tag('MUSCLE NOISE', r.x(t - 0.45), r.Yv(leadRaw(t - 0.45)), 100, 240, 39.0, 39.95, t, P.NZ2, 2);
    const ts = Math.floor((t - 0.3) / SAMPLE) * SAMPLE, ra = { Yv: v => lerp(PT2[3] - 5, PT2[1] + 18, (v + 1.0) / 2.7), x: tt => PT2[2] - 4 - (t - tt) / 2.4 * (PT2[2] - PT2[0] - 8) };
    tag('SAMPLES', ra.x(ts), ra.Yv(leadFiltered(ts)), 24, 220, 40.5, 42.95, t, P.DT4, 3);
    tag('NUMBERS', cam.x(lerp(BRD.adc + 52, BRD.cpu - 62, 0.5)), cam.y(0) + 12, 150, 372, 41.0, 42.95, t, P.DT3, 3);
  }
}
// ============================================================================ frame
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  visual(t);
  hud(t);
  tags(t);
  overlays(t);
}
function engineInit() { }
