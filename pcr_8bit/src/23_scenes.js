'use strict';
// ============================================================================
// SCENE COMPOSITOR: 25 scenes on the 120 BPM grid (SC_T), one journey:
// the machine and its curve (hook) → rewind → the swab and tube → the virus →
// lysis → purification → the reaction mix → the thermal cycler → Peltier
// control → the program → reverse transcription → the DNA template →
// denaturation → primers → probe → polymerase → probe cleavage → fluorescence →
// the optical head → the photodiode → cycles → more signal → data → the curve →
// the result → recap → the machine (loop). Worlds join through lens portals,
// a rewind, dissolves and continuous pans that follow the same molecules.
// ============================================================================
const LENS_R = 420;
function lensComposite(drawInner, cx, cy, r) {
  if (r <= 0.5) return;
  if (r >= LENS_R) { drawInner(); return; }
  withBuffer(FEEDBUF, drawInner);
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy, h = r * r - dy * dy; if (h < 0) continue;
    const s = Math.sqrt(h), a = Math.max(0, Math.ceil(cx - s - 0.5)), b = Math.min(W - 1, Math.floor(cx + s - 0.5));
    for (let x = a; x <= b; x++) buf[y * W + x] = FEEDBUF[y * W + x];
  }
  ring(cx, cy, r + 1, 2, P.C4); ring(cx, cy, r + 3, 1, P.SUB, 0.5);
}
const lensIn = (t, a, b) => LENS_R * ein(seg(t, a, b));
const lensOut = (t, a, b) => LENS_R * ein(1 - seg(t, a, b));
function dissolveWorld(drawB, k) {
  if (k <= 0) return; if (k >= 1) { drawB(); return; }
  withBuffer(TMPBUF, drawB);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (bay(x, y) < k) buf[i] = TMPBUF[i]; }
}
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
// temperature badge (top right, under the caption area)
const BADGE_ON = [[44.6, 47.0], [52.5, 56.0], [57.0, 60.9], [61.0, 63.5]];
function tempBadge(T_, t, k) {
  if (k === undefined) k = 1; if (k <= 0) return;
  if (t < 103 && !BADGE_ON.some(([a, b]) => t >= a && t <= b)) return;
  const s = Math.round(T_) + '°C', w = textW(FS, s, 2) + 26, x1 = 290, x0 = x1 - w, y0 = 92;
  const col = T_ >= 80 ? P.HT3 : T_ <= 57 ? P.RT3 : P.CL3;
  rect(x0, y0, x1, y0 + 18, P.K0); frame(x0, y0, x1, y0 + 18, col);
  rect(x0 + 6, y0 + 4, x0 + 9, y0 + 14, P.M3); disc(x0 + 7.5, y0 + 13, 3, col); rect(x0 + 6.5, y0 + 4 + (1 - (T_ - 40) / 60) * 8, x0 + 8.5, y0 + 13, col);
  text(FS, s, x0 + 16, y0 + 4, { sc: 2, c: col, ol: null });
}
// per-nucleotide synthesis timing: times[k] = moment nucleotide (start + k) joins
function synthState(times, start, t) {
  let n = 0; while (n < times.length && t >= times[n]) n++;
  const prev = n > 0 ? times[n - 1] : -1e9, next = n < times.length ? times[n] : 1e9;
  const slide = smooth(clamp((t - prev) / 0.12, 0, 1));                       // translocation after each join
  return { n, jf: start + n - 1 + slide, next, arrive: clamp(1 - (next - t) / 0.3, 0, 1), sinceJoin: t - prev };
}
// incoming nucleotide falling into the active site above template nucleotide j
function incoming(cam, j, yTop, base, k, z, o) {
  if (k <= 0) return;
  const x = cam.x(j * NT), y = cam.y(lerp(yTop - 110, yTop, smooth(k))) - (BBW / 2 + 1) * z;
  dNTP(x + (1 - k) * 30 * z, y, Math.PI / 2, base, z, o);
}
function ppiAway(cam, j, yTop, since, z) {
  if (since < 0 || since > 0.45) return;
  const u = since / 0.45;
  pyrophosphate(cam.x(j * NT) + 20 * z * u, cam.y(yTop) - (20 + 70 * u) * z, -0.8, z);
}
// ---------------------------------------------------------------- sequences (illustrative, seeded)
const RSEQ = (() => { const s = randSeq(44, 11, true).split(''); s[10] = 'A'; s[11] = 'U'; s[12] = 'G'; return s.join(''); })();
const CSEQ = compSeq(RSEQ);                                        // cDNA, paired with RSEQ position by position
const TBSEQ = CSEQ.split('').reverse().join('');                    // the cDNA after it turns over: 3' on the left
const TTSEQ = compSeq(TBSEQ);                                       // the second strand (5' on the left)
const HSEQ = randSeq(40, 23);                                       // hook template (another copy, later cycle)
// strand helpers for the cDNA template (bottom), which carries the RT primer (yellow) at nts 34..41 after the flip
function drawTB(cam, y, t, o) {
  o = o || {};
  const base = { seq: TBSEQ, x0: 0, y, side: -1, five: 'R', letters: o.letters, wave: o.wave || 0, ph: 0.3, dy: o.dy };
  drawStrand(cam, Object.assign({}, base, { kind: 'cdna', i0: 0, i1: 33, ends: false }), t);
  drawStrand(cam, Object.assign({}, base, { kind: 'primer', i0: 34, i1: 41 }), t);
  if (o.ends) { const sc = Math.max(1, Math.round(cam.z * 0.8)); text(FS, "3'", cam.x(-12), cam.y(y + 12) - 3 * sc, { sc, c: P.CD3, ol: P.SH, align: 'center' }); text(FS, "5'", cam.x(41 * NT + 12), cam.y(y + 12) - 3 * sc, { sc, c: P.PR3, ol: P.SH, align: 'center' }); }
}
// ============================================================================ S01: the hook
function hookMol(cam, t) {
  // a later-cycle copy: deep-blue template, orange new strand, probe on nts 14..22
  const z = cam.z;
  rect(0, 0, W, H, P.BG);
  for (let i = 0; i < 26; i++) { const x = cam.x((hash(i + 4000) - 0.3) * 420), y = cam.y((hash(i + 4001) - 0.5) * 600); disc(x, y, 2 * z, P.N4); }
  const j = lerp(8.2, 10.4, ph(t, 1.4, 2.45, eout)), cut = t >= 2.5, rel = ph(t, 2.5, 3.1, eout);
  const jx = cam.x(j * NT), jy = cam.y(0);
  polymeraseBack(jx, jy, z);
  drawStrand(cam, { kind: 'tmpl', seq: HSEQ, x0: 0, y: BB, side: -1, five: 'R' }, t);
  drawStrand(cam, { kind: 'primer', seq: compSeq(HSEQ), x0: 0, y: -BB, side: 1, five: 'L', i0: 0, i1: 3 }, t);
  drawStrand(cam, { kind: 'new', seq: compSeq(HSEQ), x0: 0, y: -BB, side: 1, five: 'L', i0: 4, i1: Math.floor(j) - 1 }, t);
  drawHBonds(cam, 0, HSEQ, 0, Math.floor(j) - 1, -BB, BB, 1);
  // the probe: whole until the cut, then the reporter end leaves
  drawStrand(cam, { kind: 'probe', seq: compSeq(HSEQ), x0: 0, y: -BB, side: 1, five: 'L', i0: cut ? 15 : 14, i1: 22 }, t);
  drawHBonds(cam, 0, HSEQ, cut ? 15 : 14, 22, -BB, BB, 1);
  quencher(cam.x(22 * NT) + 9 * z, cam.y(-BB) - 3 * z, z);
  const rx = cam.x(14 * NT) - 9 * z - rel * 50 * z, ry = cam.y(-BB) - 3 * z - rel * 70 * z;
  const lit = t >= 3.05 ? 0.6 + 0.4 * Math.sin(t * 30) : 0;
  if (t >= 2.95) { for (let k = 0; k < 6; k++) { const u = clamp((t - 2.95) / 0.15 - k * 0.1, 0, 1); disc(lerp(rx - 40 * z, rx, u), lerp(-10, ry, u), 3 * z, P.XB2, u > 0 && u < 1 ? 1 : 0); } rect(rx - 6 * z, 0, rx + 6 * z, ry, P.XB1, 0.25); }
  reporter(rx, ry, z * 1.2, lit);
  polymeraseFront(jx, jy, z, { fingers: 0.3 + 0.5 * Math.sin(t * 14) ** 2, nuclease: t > 2.3 && t < 2.8 ? 1 : 0 });
  if (t >= 2.5 && t < 2.68) flash(cam.x(14 * NT) - 4 * z, cam.y(-BB), 12 * z, 1 - (t - 2.5) / 0.18, [P.PO1, P.PO3, P.PO4, P.C6]);
  // a green photon leaves for the detector above
  if (t >= 3.1) {
    // the photodetector slides into view at the top; the green photon flies into it and it lights up
    const dk = ph(t, 3.1, 3.35, eout), dy = lerp(-30, 96, dk), dx = CX + 30;
    const u = ph(t, 3.3, 3.6, ein);
    photonWave(rx, ry, dx, dy + 14, 20, 5, u, P.EM2, 70);
    const lit = u >= 1 ? 1 - 0.4 * seg(t, 3.6, 4.0) : 0;
    rect(dx - 44, dy - 22, dx + 44, dy - 10, P.CB2); rect(dx - 30, dy - 10, dx + 30, dy + 14, P.PD1);
    rect(dx - 24, dy - 6, dx + 24, dy + 10, lit > 0 ? P.PD4 : P.PD3); for (let k = 0; k < 5; k++) rect(dx - 20 + k * 10, dy - 6, dx - 19 + k * 10, dy + 10, P.PD5);
    if (lit > 0) { glow(dx, dy + 2, 46, P.EM1, P.EM2, lit * 0.7); if (t < 3.75) flash(dx, dy + 14, 12, 1 - (t - 3.6) / 0.15, [P.EM1, P.EM2, P.EM3, P.C6]); lineW(dx + 30, dy - 16, dx + 30 + 60 * seg(t, 3.62, 3.9), dy - 16, 2, P.SG2); }
    if (dk > 0.5) tag('PHOTODETECTOR', dx - 30, dy, 30, 150, 3.35, 3.98, t, P.PD4);
  }
}
function cam01(t) {
  const wx = wellX(HOOK_WELL), wy = (MCH.wTop + MCH.wBot) / 2 + 2, punch = 1 + 0.03 * Math.max(0, 1 - Math.abs(t - 0.5) / 0.12);
  return camTrack([[0, 180, 320, 1.0], [0.8, 180, 320, 1.0 * punch, lin], [1.5, wx, wy, 9.0, K75]], t);
}
function s01(t) {
  const cam = cam01(t);
  if (t < 1.52) {
    labScene(cam, t, { mon: { cyc: Math.min(40, hookCycle(t)), live: true, banner: ph(t, 0.5, 0.75, lin) }, mach: { xray: ph(t, 0.85, 1.15), focus: HOOK_WELL, focusK: ph(t, 0.75, 0.95), cycle: 27, blockT: 60, read: t > 1 ? 1 : 0, shuttle: 0.45, wellGlow: i => i === HOOK_WELL ? 0.6 : 0.2 } });
    const r = lensIn(t, 1.12, 1.52);
    if (r > 0.5) lensComposite(() => hookMol(new Cam(9 * NT, 0, lerp(0.8, 1.7, ph(t, 1.12, 1.52)), CX, CY), t), cam.x(wellX(HOOK_WELL)), cam.y((MCH.wTop + MCH.wBot) / 2 + 2), r);
    return;
  }
  hookMol(new Cam(lerp(9, 11, ph(t, 1.5, 3.2)) * NT, lerp(0, -20, ph(t, 2.6, 3.4)), 1.7 + 0.15 * ph(t, 2.4, 2.6) - 0.15 * ph(t, 2.6, 2.9), CX, CY), t);
  tag('DNA POLYMERASE', CX - 30, CY + 40, 24, 420, 1.62, 2.45, t, P.PO3);
  tag('PROBE', CX + 70, CY - 20, 190, 210, 1.7, 2.45, t, P.PB2);
}
// ============================================================================ S02: rewind, swab, tube
function rewindFX(t, k) {
  // tape rewind: horizontal tears, scanlines, a ◀◀ mark
  for (let i = 0; i < 7; i++) {
    const y = Math.floor((hash(Math.floor(t * 30) * 7 + i) * H)), h = 3 + Math.floor(hash(i + Math.floor(t * 30)) * 10), off = Math.floor((hash(i * 3 + Math.floor(t * 30)) - 0.5) * 40);
    for (let yy = y; yy < Math.min(H, y + h); yy++) { const row = buf.slice(yy * W, yy * W + W); for (let x = 0; x < W; x++) buf[yy * W + x] = row[((x - off) % W + W) % W]; }
  }
  for (let y = 0; y < H; y += 3) rect(0, y, W, y + 1, P.K0, 0.35);
  const x = 230, y = 40;
  for (const dx of [0, 18]) poly([x + dx + 16, y, x + dx + 16, y + 20, x + dx, y + 10], P.C6);
  text(FS, 'REWIND', x - 2, y + 26, { sc: 2, c: P.C6, ol: P.SH });
}
function swabState(t) {
  const t0 = T(1);
  if (t < t0 + 1.55) { const u = ph(t, t0 + 0.5, t0 + 1.55, K75); return { sx: lerp(-40, TUBE.x, u), sy: lerp(40, 196, u), ang: lerp(0.95, 0.12, u), hand: true }; }
  if (t < t0 + 2.3) { const u = ph(t, t0 + 1.55, t0 + 2.2, K75); return { sx: TUBE.x, sy: lerp(196, 486, u), ang: lerp(0.12, 0.04, u), hand: true, swirl: u > 0.7 ? 1 : 0 }; }
  const lift = ph(t, t0 + 2.35, t0 + 2.9, eout) * 160;
  const capU = ph(t, t0 + 2.55, t0 + 2.95, K75);
  return { sx: TUBE.x, sy: 486, ang: 0.04, hand: true, broken: true, handLift: lift, cap: [lerp(330, TUBE.x, capU), lerp(110, TUBE.rim - 12, capU), (t - t0) * (capU >= 1 ? 0 : 3)] };
}
function s02(t) {
  const t0 = T(1);
  if (t < t0 + 0.5) { s01(clamp(4 - (t - t0) * 7.8, 0.02, 3.98)); rewindFX(t, 1); return; }
  const st = swabState(t);
  const cam = camTrack([[t0 + 0.5, 170, 330, 1.0], [t0 + 2.2, 190, 360, 1.05, lin], [t0 + 3.0, 196, 380, 1.08, lin], [t0 + 3.85, 196, 432, 3.4, K75]], t);
  swabScene(cam, t, st);
  if (t >= t0 + 2.35 && t < t0 + 2.5) flash(cam.x(TUBE.x), cam.y(TUBE.rim - 6), 7, 1 - (t - t0 - 2.35) / 0.15, [P.SW0, P.SW1, P.SW2, P.C6]);
  tag('SWAB', cam.x(st.sx - 20), cam.y(st.sy - 60), 30, 150, t0 + 0.8, t0 + 2.3, t, P.SW2);
  tag('TRANSPORT MEDIUM', cam.x(TUBE.x + 14), cam.y(TUBE.liq + 20), 216, 300, t0 + 1.8, t0 + 3.2, t, P.LQ3);
  const r = lensIn(t, t0 + 3.35, t0 + 3.95);
  if (r > 0.5) lensComposite(() => sampleField(new Cam(0, 0, lerp(0.6, 1.0, ph(t, t0 + 3.35, t0 + 3.95)), CX, CY), t, { ring: ph(t, t0 + 3.7, t0 + 4.0), pick: 0 }), cam.x(TUBE.x), cam.y(432), r);
}
// ============================================================================ S03: inside the virus
function s03(t) {
  const t0 = T(2);
  const pick = FIELD.find(f => f.k === 'virus' && f.id === 0);
  if (t < t0 + 0.6) {
    const fc = camTrack([[t0, 0, 0, 1.0], [t0 + 0.6, pick.x, pick.y, 4, K75]], t);
    sampleField(fc, t, { ring: 1, pick: 0 });
    const r = lensIn(t, t0 + 0.2, t0 + 0.6);
    if (r > 0.5) lensComposite(() => virusWorld(new Cam(0, 0, 0.8, CX, CY), t, {}), fc.x(pick.x + 6 * Math.sin(t * 0.5 + pick.ph)), fc.y(pick.y + 5 * Math.cos(t * 0.4 + pick.ph)), r);
    return;
  }
  const cut = ph(t, t0 + 2.0, t0 + 3.4), hi = ph(t, t0 + 3.4, t0 + 4.0);
  const cam = camTrack([[t0 + 0.6, 0, 0, 1.15], [t0 + 3.4, 0, 0, 1.2, lin], [T(3), 22, 18, 1.75, K75]], t);
  virusWorld(cam, t, { cut, hi });
  tag('SPIKE PROTEIN', cam.x(Math.cos(-2.2 + t * 0.25) * 124), cam.y(Math.sin(-2.2 + t * 0.25) * 124), 20, 120, t0 + 0.8, t0 + 2.9, t, P.VS3);
  tag('LIPID ENVELOPE', cam.x(-98 * 0.72), cam.y(98 * 0.69), 20, 430, t0 + 1.2, t0 + 3.2, t, P.VE4);
  tag('RNA GENOME', cam.x(40), cam.y(10), 170, 420, t0 + 3.3, T(3) - 0.05, t, P.RN3);
}
function virusWorld(cam, t, o) { rect(0, 0, W, H, P.BG); for (let i = 0; i < 30; i++) { const x = cam.x((hash(i + 4100) - 0.5) * 600), y = cam.y((hash(i + 4101) - 0.5) * 900); disc(x, y, (1 + hash(i + 4102) * 2) * cam.z, P.N4); } drawVirus(cam, t, Object.assign({ rot: t * 0.25 }, o)); }
// ============================================================================ S04: lysis
function pipetteDrop(cam, t, t0, col) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(X(TUBE.x - 6), Y(-20), X(TUBE.x + 6), Y(150), P.M2); poly(cam.pts([TUBE.x - 6, 150, TUBE.x + 6, 150, TUBE.x + 2, 200, TUBE.x - 2, 200]), P.TB2);
  for (let k = 0; k < 3; k++) { const u = clamp((t - t0 - k * 0.22) / 0.3, 0, 1); if (u > 0 && u < 1) { disc(X(TUBE.x), Y(lerp(204, TUBE.liq, u)), 4 * z, col); } }
}
function s04(t) {
  const t0 = T(3);
  if (t < t0 + 1.4) {
    const cam = camTrack([[t0, 196, 330, 1.0], [t0 + 0.8, 196, 340, 1.04, lin], [t0 + 1.4, 196, 432, 3.4, K75]], t);
    swabScene(cam, t, { sx: TUBE.x, sy: 486, broken: true, cap: null, swirl: t > t0 + 0.6 ? 1 : 0 });
    pipetteDrop(cam, t, t0 + 0.15, P.LY2);
    tag('LYSIS BUFFER', cam.x(TUBE.x + 8), cam.y(170), 210, 180, t0 + 0.2, t0 + 1.1, t, P.LY2);
    const r = lensIn(t, t0 + 0.95, t0 + 1.4);
    if (r > 0.5) lensComposite(() => lysisWorld(new Cam(0, 0, 1.5, CX, CY), t, 0, 0), cam.x(TUBE.x), cam.y(432), r);
    return;
  }
  const k = ph(t, t0 + 1.4, t0 + 3.2, lin), ly = ph(t, t0 + 2.0, t0 + 5.2, lin);
  const cam = camTrack([[t0 + 1.4, 0, 0, 1.5], [t0 + 4.2, 0, 0, 0.95, K75], [T(4), -40, 0, 0.9, lin]], t);
  lysisWorld(cam, t, k, ly);
  { const d = DETERG[3], r = lerp(d.r0, VR + 4, smooth(clamp(k * d.v, 0, 1))), a = d.a + 0.2 * Math.sin(t * 1.3 + d.ph); tag('DETERGENT', cam.x(Math.cos(a) * r), cam.y(Math.sin(a) * r), 30, 130, t0 + 1.5, t0 + 3.0, t, P.LY2); }
  tag('ENVELOPE BREAKS', cam.x(70), cam.y(-70), 170, 140, t0 + 2.9, t0 + 4.4, t, P.VE4);
  tag('VIRAL RNA', cam.x(RNA_FREE.at(RNA_FREE.L * 0.42)[0]), cam.y(RNA_FREE.at(RNA_FREE.L * 0.42)[1]), 40, 430, t0 + 4.5, T(4) - 0.05, t, P.RN3);
}
function lysisWorld(cam, t, k, ly) { rect(0, 0, W, H, P.BG); debrisField(cam, t, clamp(ly * 2 - 0.6, 0, 1)); drawDetergent(cam, t, k, ly); drawVirus(cam, t, { rot: 0.25 * T(3), lysis: ly, hi: clamp((ly - 0.7) * 3, 0, 1) }); }
// ============================================================================ S05: purification
function s05(t) {
  const t0 = T(4);
  const st = { bind: ph(t, t0 + 0.1, t0 + 1.4), mag: ph(t, t0 + 1.5, t0 + 2.5, lin), wash: ph(t, t0 + 2.0, t0 + 3.0, lin), elute: ph(t, t0 + 3.1, t0 + 4.3, lin) };
  const cam = camTrack([[t0, 70, 0, 1.0], [t0 + 3.2, 80, 0, 1.0, lin], [T(5), -110, 20, 1.15, K75]], t);
  if (t < t0 + 0.4) { lysisWorld(camTrack([[T(3) + 4.2, 0, 0, 0.95], [T(4), -40, 0, 0.9, lin]], t), t, 1, 1); dissolveWorld(() => purifScene(cam, t, st), ph(t, t0, t0 + 0.4, lin)); return; }
  const res = purifScene(cam, t, st);
  const b0 = res.bp[1];
  tag('SILICA-COATED MAGNETIC BEAD', cam.x(b0[0]), cam.y(b0[1] - 30), 20, 120, t0 + 0.3, t0 + 1.6, t, P.TB3);
  tag('RNA BINDS SILICA', cam.x(b0[0] + 30), cam.y(b0[1] + 20), 150, 410, t0 + 0.8, t0 + 1.9, t, P.RN3);
  tag('MAGNET HOLDS THE BEADS', cam.x(WALL_X + 30), cam.y(-120), 40, 150, t0 + 1.7, t0 + 2.9, t, P.MR2);
  tag('WASH REMOVES THE REST', cam.x(-60), cam.y(160), 40, 440, t0 + 2.2, t0 + 3.2, t, P.SUB);
  tag('ELUTED RNA', cam.x(res.bp[2][0] - 200), cam.y(res.bp[2][1] - 40), 40, 160, t0 + 3.6, T(5) - 0.05, t, P.RN3);
}
// ============================================================================ S06: the reaction mixture
const MIX = (() => {
  const r = mulberry(91), m = [];
  const add = (k, n) => { for (let i = 0; i < n; i++) m.push({ k, x: (r() - 0.5) * 340, y: (r() - 0.5) * 560, a: r() * TAU, ph: r() * TAU, v: 0.5 + r() }); };
  add('rt', 3); add('pol', 3); add('fp', 4); add('rp', 4); add('probe', 4); add('dntp', 26); add('mg', 12);
  return m;
})();
[['rt', 0, -80, -120], ['pol', 1, 70, -60], ['fp', 1, -90, 120], ['probe', 2, 80, 170], ['dntp', 5, -30, 220]].forEach(([k, n, x, y]) => { const m = MIX.filter(q => q.k === k)[n]; m.x = x; m.y = y; });
function mixWorld(cam, t, o) {
  o = o || {};
  const z = cam.z;
  rect(0, 0, W, H, P.BG);
  for (const m of MIX) {
    const x = cam.x(m.x + 14 * Math.sin(t * 0.6 * m.v + m.ph)), y = cam.y(m.y + 12 * Math.cos(t * 0.5 * m.v + m.ph)), a = m.a + 0.4 * Math.sin(t * 0.7 + m.ph);
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
    if (m.k === 'rt') enzymeIcon(x, y, z * 1.2, 'rt', a * 0.3);
    else if (m.k === 'pol') enzymeIcon(x, y, z * 1.2, 'pol', a * 0.3);
    else if (m.k === 'fp' || m.k === 'rp') primerIcon(x, y, a, z * 0.9);
    else if (m.k === 'probe') probeIcon(x, y, a, z * 0.8, 0);
    else if (m.k === 'dntp') dNTP(x, y, a, 'ACGT'[Math.floor(hash(m.ph * 1000) * 4)], z * 0.55);
    else mgIon(x, y, z * 0.9);
  }
  // the purified RNA arrives from the pipette (a long magenta strand settling)
  if (o.rna !== undefined) {
    const k = o.rna, pts = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([cam.x(-150 + u * 300), cam.y(lerp(-420, 20, smooth(k)) + 26 * Math.sin(u * 7 + t * 1.5))]); }
    let px_ = null, py_ = null;
    for (const [x, y] of pts) { if (px_ !== null) { lineW(px_, py_, x, y, 3.4 * z, P.RN0); lineW(px_, py_, x, y, 2 * z, P.RN2); } px_ = x; py_ = y; }
    for (let i = 1; i < pts.length; i += 2) lineW(pts[i][0], pts[i][1], pts[i][0], pts[i][1] + 5 * z, 1.4 * z, P.RN3);
  }
}
function wellCloseup(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(0, 0, W, H, P.BG);
  rect(X(-170), Y(40), X(170), Y(260), P.AL1); rect(X(-170), Y(40), X(170), Y(44), P.AL3);
  for (const dx of [-120, 0, 120]) {
    poly(cam.pts([dx - 38, 30, dx + 38, 30, dx + 10, 230, dx - 10, 230]), P.AL0);
    poly(cam.pts([dx - 34, 26, dx + 34, 26, dx + 8, 226, dx - 8, 226]), P.TB2);
    poly(cam.pts([dx - 28, 70, dx + 28, 70, dx + 6, 220, dx - 6, 220]), dx === 0 ? P.LQ3 : P.LQ2);
    rect(X(dx - 40), Y(18), X(dx + 40), Y(28), P.TB1);
  }
  // the optical seal sliding on
  const sk = o.seal || 0;
  if (sk > 0) { const x1 = lerp(-200, 175, sk); rect(X(-175), Y(10), X(x1), Y(18), P.TB3); rect(X(-175), Y(17), X(x1), Y(18), P.C6); }
}
function s06(t) {
  const t0 = T(5);
  if (t < t0 + 3.5) {
    const cam = camTrack([[t0, 0, 0, 1.3], [t0 + 2.0, 0, 0, 1.2, lin], [t0 + 3.5, 0, 0, 1.05, lin]], t);
    mixWorld(cam, t, { rna: ph(t, t0, t0 + 1.4, eout) });
    const pick = (k, n) => MIX.filter(m => m.k === k)[n || 0];
    const at = m => [cam.x(m.x + 14 * Math.sin(t * 0.6 * m.v + m.ph)), cam.y(m.y + 12 * Math.cos(t * 0.5 * m.v + m.ph))];
    const L = (s, m, lx, ly, a, b, col) => { const [x, y] = at(m); tag(s, x, y, lx, ly, a, b, t, col); };
    tag('VIRAL RNA', cam.x(60), cam.y(lerp(-420, 20, ph(t, t0, t0 + 1.4, eout)) + 10), 180, 300, t0 + 0.5, t0 + 1.8, t, P.RN3);
    L('REVERSE TRANSCRIPTASE', pick('rt'), 20, 120, t0 + 0.9, t0 + 2.2, P.RT3);
    L('DNA POLYMERASE', pick('pol', 1), 150, 160, t0 + 1.3, t0 + 2.6, P.PO3);
    L('PRIMERS', pick('fp', 1), 30, 380, t0 + 1.7, t0 + 3.0, P.PR2);
    L('PROBE', pick('probe', 2), 200, 420, t0 + 2.1, t0 + 3.4, P.PB2);
    L('dNTPs', pick('dntp', 5), 40, 450, t0 + 2.4, t0 + 3.5, P.DN2);
    return;
  }
  // back out to the well, which gets sealed, then out to the plate in the block
  const wc = camTrack([[t0 + 3.5, 0, 140, 6], [t0 + 4.3, 0, 120, 1.4, K75], [T(6), 0, 130, 1.25, lin]], t);
  wellCloseup(wc, t, { seal: ph(t, t0 + 4.2, t0 + 4.8, K75) });
  const r = lensOut(t, t0 + 3.5, t0 + 4.2);
  if (r > 0.5) lensComposite(() => mixWorld(new Cam(0, 0, lerp(1.05, 0.5, ph(t, t0 + 3.5, t0 + 4.2)), CX, CY), t, { rna: 1 }), wc.x(0), wc.y(150), r);
  tag('SEALED WELL', wc.x(150), wc.y(14), 170, 120, t0 + 4.6, T(6) - 0.05, t, P.TB3);
}
// ============================================================================ S07: inside the thermal cycler
function s07(t) {
  const t0 = T(6), wx = wellX(HOOK_WELL);
  const cam = camTrack([[t0, wx, 372, 2.4], [t0 + 2.0, wx, 372, 2.5, lin], [t0 + 3.5, 180, 402, 2.4, K75], [T(7), 180, 404, 2.6, lin]], t);
  labBG(cam, t);
  drawMachine(cam, t, { xray: 1, lidHeat: 1, blockT: 60, fan: t * 9, air: 1, shuttle: 0.45, cable: false });
  if (t < t0 + 0.4) dissolveWorld(() => wellCloseup(new Cam(0, 130, 1.25, CX, CY), t, { seal: 1 }), 1 - ph(t, t0, t0 + 0.4, lin));
  tag('HEATED LID', cam.x(wx + 30), cam.y(MCH.heatY0 + 3), 190, 150, t0 + 0.3, t0 + 2.2, t, P.HT3);
  tag('SEALED WELL', cam.x(wx), cam.y(MCH.wTop + 10), 40, 200, t0 + 0.7, t0 + 2.4, t, P.TB3);
  tag('METAL BLOCK', cam.x(wx + 40), cam.y(MCH.blkY0 + 18), 180, 390, t0 + 2.0, t0 + 3.6, t, P.AL3);
  tag('PELTIER MODULES', cam.x(160), cam.y(MCH.pelY0 + 3), 30, 410, t0 + 3.5, T(7) - 0.05, t, P.CE2);
  tag('HEAT SINK + FAN', cam.x(200), cam.y(MCH.hsY0 + 20), 170, 460, t0 + 3.8, T(7) - 0.05, t, P.AL3);
}
// ============================================================================ S08: Peltier temperature control
function pelTemp(t) {
  const t0 = T(7);
  if (t < t0 + 2.0) return lerp(60, 95, ph(t, t0 + 0.3, t0 + 2.0));
  if (t < t0 + 3.5) return lerp(95, 60, ph(t, t0 + 2.0, t0 + 3.4));
  return 60 + 2.2 * Math.exp(-(t - t0 - 3.5) * 2.4) * Math.sin((t - t0 - 3.5) * 9);
}
function s08(t) {
  const t0 = T(7), mode = t < t0 + 2.0 ? 1 : t < t0 + 3.5 ? -1 : 0;
  const cam = camTrack([[t0, 0, -20, 1.0], [t0 + 2, 0, -30, 1.08, lin], [T(8), 0, -10, 1.18, lin]], t);
  if (t < t0 + 0.45) {
    const mc = camTrack([[t0, 180, 404, 2.6], [t0 + 0.45, 160, 402, 10, K75]], t);
    labBG(mc, t); drawMachine(mc, t, { xray: 1, lidHeat: 1, blockT: 60, fan: t * 9, cable: false });
    const r = lensIn(t, t0, t0 + 0.45);
    if (r > 0.5) lensComposite(() => peltierScene(cam, t, { mode: 1, temp: 60 }), mc.x(160), mc.y(402), r);
    return;
  }
  peltierScene(cam, t, { mode, temp: pelTemp(t), loop: t > t0 + 3.5 ? 1 : 0 });
  label(mode > 0 ? 'HEATING: HEAT PUMPED UP' : mode < 0 ? 'COOLING: HEAT PUMPED DOWN' : 'HOLD 60°C', CX, 108, t0 + 0.5, T(8) - 0.05, t, mode > 0 ? P.HT3 : mode < 0 ? P.CL3 : P.INK, 'center');
  tag('CURRENT', cam.x(0), cam.y(PEL.pelY1 + 160), 200, cam.y(PEL.pelY1 + 140), t0 + 0.6, t0 + 2.4, t, P.EL2);
  tag('REVERSED CURRENT', cam.x(0), cam.y(PEL.pelY1 + 160), 180, cam.y(PEL.pelY1 + 140), t0 + 2.1, t0 + 3.5, t, P.EL2);
  tag('SENSOR', cam.x(PEL.x0 + 6), cam.y(PEL.blkY0 + 52), 30, cam.y(PEL.blkY0) - 40, t0 + 3.5, T(8) - 0.05, t, P.YEL);
}
// ============================================================================ S09: the temperature program
function progDraw(t) { const t0 = T(8); return lerp(4, 270, ph(t, t0 + 0.2, t0 + 4.0, lin)); }
// follows the playhead, then pulls back to show the whole program (the next shot dives into the 55 °C hold)
function progCam(t) {
  const t0 = T(8), fx = Math.max(150, progDraw(t) * 3.2 - 40), k = ph(t, t0 + 4.0, t0 + 4.9, K75);
  return new Cam(lerp(fx, 135 * 3.2, k), lerp(0, 20, k), Math.exp(lerp(0, Math.log(0.42), k)), CX, CY);
}
function s09(t) {
  const t0 = T(8), d = progDraw(t);
  const cam = progCam(t);
  programScene(cam, t, { draw: d });
  const sx = v => cam.x(v * 3.2), ty = T_ => cam.y(-(T_ - 70) * 4.2);
  label('REVERSE TRANSCRIPTION', sx(14), ty(55) + 10, t0 + 0.3, t0 + 1.9, t, P.RT3);
  label('INITIAL DENATURATION', sx(56), ty(95) - 20, t0 + 1.6, t0 + 3.1, t, P.HT3);
  label('×40 CYCLES  95°C ↔ 60°C', CX, ty(104) + 6, t0 + 3.0, T(9) - 0.05, t, P.INK, 'center');
  label('FLUORESCENCE READ AT 60°C', CX, ty(36) - 18, t0 + 3.4, T(9) - 0.05, t, P.EM2, 'center');
}
// ============================================================================ S10: reverse transcription
const RT_T = (() => { const s = T(9), a = [s + 3.4, s + 4.5, s + 5.0, s + 5.25, s + 5.5, s + 5.75]; for (let k = 0; k < 28; k++) a.push(s + 6.0 + k * 0.035); return a; })();
function rtWorld(cam, t, o) {
  o = o || {};
  const z = cam.z, t0 = T(9);
  rect(0, 0, W, H, P.BG);
  for (let i = 0; i < 30; i++) { const x = cam.x((hash(i + 4200) - 0.2) * 700), y = cam.y((hash(i + 4201) - 0.5) * 700); disc(x, y, 1.6 * z, P.N4); }
  const S = synthState(RT_T, 10, t), j = Math.min(43.5, S.jf);
  // RT arrives from the upper left and docks at the junction (nt 10)
  const dock = ph(t, t0 + 1.0, t0 + 2.4, K75), jxw = lerp(-40, 10 * NT, dock) + (j - 10) * NT * (dock >= 1 ? 1 : 0), jyw = lerp(-140, 0, dock);
  const jx = cam.x(jxw), jy = cam.y(jyw), gone = o.rtGone || 0;
  if (gone < 1) rtBack(jx + gone * 260 * z, jy - gone * 200 * z, z);
  drawStrand(cam, { kind: 'rna', seq: RSEQ, x0: 0, y: BB, side: -1, five: 'R', ends: true, letters: o.letters }, t);
  drawStrand(cam, { kind: 'primer', seq: CSEQ, x0: 0, y: -BB, side: 1, five: 'L', i0: 2, i1: 9, letters: o.letters, ends: false }, t);
  if (S.n > 0) drawStrand(cam, { kind: 'cdna', seq: CSEQ, x0: 0, y: -BB, side: 1, five: 'L', i0: 10, i1: 9 + S.n, letters: o.letters }, t);
  drawHBonds(cam, 0, RSEQ, 2, 9 + S.n, -BB, BB, 1);
  if (S.n < RT_T.length && dock >= 1) { incoming(cam, 10 + S.n, -BB, CSEQ[10 + S.n], S.arrive, z, { letters: true, greek: S.n === 0 }); }
  ppiAway(cam, 9 + S.n, -BB, S.sinceJoin, z);
  if (S.sinceJoin < 0.12 && S.n > 0) flash(cam.x((9 + S.n) * NT), cam.y(-BB), 6 * z, 1 - S.sinceJoin / 0.12, [P.CD1, P.CD2, P.CD3, P.C6]);
  if (gone < 1) rtFront(jx + gone * 260 * z, jy - gone * 200 * z, z, { fingers: dock >= 1 ? clamp(S.arrive * 1.4 - 0.3, 0, 1) : 0, active: S.sinceJoin < 0.2 ? 1 - S.sinceJoin / 0.2 : 0 });
  return { S, jx, jy };
}
function s10(t) {
  const t0 = T(9);
  if (t < t0 + 0.6) {
    const pc = progCam(T(9) - 0.01);
    const zc = camTrack([[t0, pc.cx, pc.cy, pc.z], [t0 + 0.6, 30 * 3.2, -(55 - 70) * 4.2, 9, K75]], t);
    programScene(zc, t, { draw: progDraw(T(9) - 0.01) });
    const r = lensIn(t, t0 + 0.1, t0 + 0.6);
    if (r > 0.5) lensComposite(() => rtWorld(new Cam(8 * NT, 0, 1.0, CX, CY), t, {}), zc.x(30 * 3.2), zc.y(-(55 - 70) * 4.2), r);
    return;
  }
  const S0 = synthState(RT_T, 10, t);
  const cx = t < t0 + 6.0 ? lerp(8 * NT, (10 + S0.n) * NT, ph(t, t0 + 1.0, t0 + 2.4)) : (16 * NT);
  const cam = camTrack([[t0 + 0.6, 8 * NT, -10, 1.0], [t0 + 2.4, 10 * NT, -10, 1.9, K75], [t0 + 5.9, 15 * NT, -6, 1.9, lin], [T(10), 18 * NT, -6, 1.15, K75]], t);
  const res = rtWorld(cam, t, { letters: true });
  tempBadge(55, t);
  tag('VIRAL RNA (TEMPLATE)', cam.x(16 * NT), cam.y(BB + 6), 40, 420, t0 + 0.7, t0 + 2.6, t, P.RN3);
  tag('PRIMER', cam.x(5 * NT), cam.y(-BB - 4), 30, 200, t0 + 0.9, t0 + 2.7, t, P.PR2);
  tag('REVERSE TRANSCRIPTASE', res.jx - 40, res.jy - 40, 30, 140, t0 + 2.2, t0 + 3.6, t, P.RT3);
  tag('dNTP', cam.x(10 * NT), cam.y(-BB) - 50, 200, 190, t0 + 2.7, t0 + 3.5, t, P.DN2);
  tag('A PAIRS WITH T (DNA)', cam.x(10 * NT), cam.y(-BB + 6), 30, 430, t0 + 3.5, t0 + 4.6, t, P.CD3);
  tag('U PAIRS WITH A (RNA HAS U)', cam.x(11 * NT), cam.y(BB - 6), 30, 460, t0 + 4.6, t0 + 5.8, t, P.RN3);
  if (t > t0 + 4.6 && t < t0 + 6.9) label("5' → 3'", cam.x((10 + Math.max(1, S0.n) / 2) * NT), cam.y(-BB) - 34, t0 + 4.6, t0 + 6.9, t, P.CD3, 'center');
  tag('cDNA', cam.x(14 * NT), cam.y(-BB - 6), 220, 420, t0 + 5.9, T(10) - 0.05, t, P.CD3);
}
// ============================================================================ S11: the DNA template
const T2_T = (() => { const s = T(10) + 3.6, a = []; for (let k = 0; k < 32; k++) a.push(s + k * 0.04); return a; })();
function s11(t) {
  const t0 = T(10), z0 = 1.15;
  const sep = ph(t, t0 + 1.5, t0 + 2.6), flip = ph(t, t0 + 2.2, t0 + 3.0), settle = ph(t, t0 + 2.9, t0 + 3.3);
  const cam = camTrack([[t0, 18 * NT, -6, z0], [t0 + 1.5, 21.5 * NT, -10, 0.82, K75], [t0 + 3.2, 21.5 * NT, 10, 0.82, lin], [T(11), 21.5 * NT, 0, 0.82, lin]], t);
  const z = cam.z;
  rect(0, 0, W, H, P.BG);
  if (sep > 0) rect(0, 0, W, H, P.HT0, 0.25 * sep * (1 - settle));
  // RT leaves; the hybrid; heat parts it; the RNA drifts away; the cDNA turns over into the template position
  if (t < t0 + 1.2) { rtWorld(cam, t, { rtGone: ph(t, t0, t0 + 1.2), letters: false }); tag('RNA–cDNA HYBRID', cam.x(24 * NT), cam.y(BB + 4), 40, 440, t0 + 0.2, t0 + 1.4, t, P.CD3); tempBadge(55, t); return; }
  drawStrand(cam, { kind: 'rna', seq: RSEQ, x0: 0, y: BB + sep * 260, side: -1, five: 'R', wave: 6 * sep }, t);
  if (flip < 1) {
    const cy = -BB - sep * 70, ang = flip * Math.PI;
    drawStrandRot(cam, { kind: 'cdna', kindAt: i => i < 8 ? 'primer' : 'cdna', seq: CSEQ.slice(2), side: 1, five: 'L', wave: 3 * sep }, lerp(22.5, 20.5, flip) * NT, lerp(cy, BB + 40, flip), ang, t);
  } else drawTB(cam, BB + 40 * (1 - settle), t, { ends: true });
  if (sep > 0 && sep < 1) tag('HEAT SEPARATES THE STRANDS', cam.x(21 * NT), cam.y(0), 30, 120, t0 + 1.6, t0 + 3.0, t, P.HT3);
  tempBadge(t < t0 + 1.5 ? 55 : t < t0 + 3.1 ? lerp(55, 95, ph(t, t0 + 1.5, t0 + 1.9)) : lerp(95, 60, ph(t, t0 + 3.1, t0 + 3.4)), t);
  if (t >= t0 + 3.1) {
    // forward primer lands on the cDNA (now the template), the polymerase builds the second strand
    const land = ph(t, t0 + 3.1, t0 + 3.5, K75);
    drawStrand(cam, { kind: 'primer', seq: TTSEQ, x0: 0, y: lerp(-BB - 120, -BB, land), side: 1, five: 'L', i0: 2, i1: 9 }, t);
    if (land >= 1) drawHBonds(cam, 0, TBSEQ, 2, 9, -BB, BB, 1);
    const S = synthState(T2_T, 10, t);
    if (S.n > 0) { drawStrand(cam, { kind: 'new', seq: TTSEQ, x0: 0, y: -BB, side: 1, five: 'L', i0: 10, i1: 9 + S.n }, t); drawHBonds(cam, 0, TBSEQ, 10, 9 + S.n, -BB, BB, 1); }
    if (t >= t0 + 3.4) { const jx = cam.x(Math.min(41.5, 10 + S.n) * NT), jy = cam.y(0); polymeraseBack(jx, jy, z); polymeraseFront(jx, jy, z, { fingers: 0.5 }); }
    tag('FORWARD PRIMER', cam.x(5 * NT), cam.y(-BB - 6), 30, 150, t0 + 3.3, t0 + 4.3, t, P.PR2);
    tag('SECOND STRAND', cam.x(26 * NT), cam.y(-BB - 6), 170, 180, t0 + 4.2, T(11) - 0.05, t, P.NS3);
  }
}
// ============================================================================ S12-S16: the template, primers, probe, polymerase
// shared world: TB (cDNA template) at the bottom, TT (second strand) at the top
function dsWorld(cam, t, o) {
  o = o || {};
  const z = cam.z, sep = o.sep || 0, unzip = o.unzip === undefined ? 0 : o.unzip, jig = o.jig || 0;
  rect(0, 0, W, H, P.BG);
  if (o.heat > 0) rect(0, 0, W, H, P.HT0, 0.3 * o.heat);
  if (o.cool > 0) rect(0, 0, W, H, P.CL0, 0.3 * o.cool);
  const yB = BB + sep * 70, yT = -BB - sep * 70;
  const dyB = i => jig * Math.sin(t * 31 + i * 1.7) * 2.2, dyT = i => jig * Math.sin(t * 29 + i * 2.1 + 1) * 2.2;
  drawTB(cam, yB, t, { ends: o.ends, letters: o.letters, dy: dyB });
  if (o.top !== false) {
    drawStrand(cam, { kind: 'primer', seq: TTSEQ, x0: 0, y: yT, side: 1, five: 'L', i0: 2, i1: 9, letters: o.letters, dy: dyT }, t);
    drawStrand(cam, { kind: 'new', seq: TTSEQ, x0: 0, y: yT, side: 1, five: 'L', i0: 10, i1: 41, letters: o.letters, dy: dyT, ends: o.ends }, t);
  }
  if (sep < 0.02 && o.top !== false) drawHBonds(cam, 0, TBSEQ, 2, 41, -BB, BB, 1, i => (i / 41) < unzip ? 0 : 1);
}
function s12(t) {
  const t0 = T(11), heat = ph(t, t0 + 1.0, t0 + 2.4), unzip = ph(t, t0 + 2.0, t0 + 3.8, lin), sep = ph(t, t0 + 3.4, t0 + 4.8);
  const cam = camTrack([[t0, 21.5 * NT, 0, 0.82], [t0 + 1.8, 14 * NT, 0, 1.6, K75], [t0 + 3.6, 26 * NT, 0, 1.6, lin], [T(12), 21.5 * NT, 0, 0.78, K75]], t);
  dsWorld(cam, t, { sep, unzip: sep > 0 ? 1 : unzip, jig: heat * (1 - sep * 0.5), heat, letters: cam.z > 1.4, ends: true });
  if (unzip > 0 && sep < 0.02) { const xf = cam.x(unzip * 43 * NT); for (let k = 0; k < 3; k++) disc(xf + (hash(k + Math.floor(t * 20)) - 0.5) * 10, cam.y(0) + (hash(k * 7 + Math.floor(t * 20)) - 0.5) * 16, 2, P.HT4); }
  tempBadge(lerp(60, 95, heat), t);
  tag('HYDROGEN BONDS', cam.x(9 * NT), cam.y(0), 30, 150, t0 + 0.4, t0 + 2.2, t, P.C4);
  tag('BASE PAIRS LET GO', cam.x(Math.max(4, unzip * 43) * NT), cam.y(0), 170, 150, t0 + 2.2, t0 + 3.6, t, P.HT3);
  tag('BACKBONES STAY INTACT', cam.x(30 * NT), cam.y(BB + 70), 60, 440, t0 + 4.0, T(12) - 0.05, t, P.CD3);
}
// S13: primers find their sites (a wrong site first)
function primerHB(cam, i0, i1, yTop, yBot, k, seqBot) { drawHBonds(cam, 0, seqBot, i0, i1, yTop, yBot, 1, i => ((i - i0 + 1) / (i1 - i0 + 1)) <= k ? 1 : 0); }
function s13(t) {
  const t0 = T(12), cool = ph(t, t0, t0 + 1.5);
  const yB = BB + 70, yT = -BB - 70;
  const cam = camTrack([[t0, 21.5 * NT, 0, 0.78], [t0 + 1.6, 12 * NT, yB - 30, 1.55, K75], [t0 + 3.9, 9 * NT, yB - 30, 1.55, lin], [t0 + 4.8, 34 * NT, yT + 30, 1.55, K75], [T(13), 21 * NT, 0, 0.7, K75]], t);
  dsWorld(cam, t, { sep: 1, cool, letters: cam.z > 1.4, ends: true, top: true });
  // forward primer: tries nts 14..21 (mismatch), bounces, then binds 2..9
  // it slides in from the left just above the template, tries the wrong site, lifts, then settles on its match
  const fx = t < t0 + 3.0 ? lerp(-12, 14, ph(t, t0 + 1.2, t0 + 2.3, K75)) : lerp(14, 2, ph(t, t0 + 3.0, t0 + 3.6, K75));
  const fy = t < t0 + 2.6 ? lerp(yB - 2 * BB - 50, yB - 2 * BB - 6, ph(t, t0 + 1.9, t0 + 2.4, K75)) : t < t0 + 3.0 ? yB - 2 * BB - 6 - 40 * ph(t, t0 + 2.6, t0 + 3.0, eout) : lerp(yB - 2 * BB - 46, yB - 2 * BB, ph(t, t0 + 3.2, t0 + 3.6, K75));
  const fseq = TTSEQ.slice(2, 10);
  drawStrand(cam, { kind: 'primer', seq: fseq, x0: fx * NT, y: fy, side: 1, five: 'L', letters: cam.z > 1.4, glowEnd: t > t0 + 3.6 && t < t0 + 4.8 ? 0.6 : 0 }, t);
  if (t > t0 + 2.4 && t < t0 + 2.75) { const x = cam.x(17.5 * NT), y = cam.y(yB - BB - 8); crossMark(x, y, 6, P.RED); }
  if (t >= t0 + 3.6) { primerHB(cam, 2, 9, yB - 2 * BB, yB, ph(t, t0 + 3.6, t0 + 4.4, lin), TBSEQ); if (t > t0 + 4.4) checkMark(cam.x(6 * NT), cam.y(yB - BB) - 30, 6, P.RP2); }
  // reverse primer binds the top strand near its 3' end (nts 34..41), extending leftward
  const rk = ph(t, t0 + 4.4, t0 + 5.0, K75);
  const rseq = TBSEQ;
  drawStrand(cam, { kind: 'primer', seq: rseq, x0: 0, y: lerp(yT + 2 * BB + 140, yT + 2 * BB, rk), side: -1, five: 'R', i0: 34, i1: 41, letters: cam.z > 1.4, glowEnd: rk >= 1 && t < T(13) ? 0.6 : 0 }, t);
  if (rk >= 1) primerHB(cam, 34, 41, yT, yT + 2 * BB, 1, TBSEQ);
  // the region between the primers
  if (t > t0 + 5.1) {
    const a = ph(t, t0 + 5.1, t0 + 5.7);
    const y = cam.y(0);
    lineW(cam.x(10 * NT), y, cam.x(lerp(10, 21, a) * NT), y, 2, P.YEL); arrowHead(cam.x(lerp(10, 21, a) * NT), y, 0, 5, P.YEL);
    lineW(cam.x(33 * NT), y, cam.x(lerp(33, 22, a) * NT), y, 2, P.YEL); arrowHead(cam.x(lerp(33, 22, a) * NT), y, Math.PI, 5, P.YEL);
    label('TARGET REGION', cam.x(21.5 * NT), y - 18, t0 + 5.3, T(13) - 0.05, t, P.YEL, 'center');
  }
  tempBadge(lerp(95, 60, cool), t);
  tag('FORWARD PRIMER', cam.x(fx * NT + 30), cam.y(fy) - 10, 150, 150, t0 + 1.8, t0 + 3.0, t, P.PR2);
  label('NO MATCH', cam.x(17.5 * NT) + 14, cam.y(yB - BB - 8) - 4, t0 + 2.45, t0 + 3.0, t, P.RED);
  tag("3'-OH: SYNTHESIS STARTS HERE", cam.x(9.6 * NT), cam.y(yB - 2 * BB), 40, 430, t0 + 3.9, t0 + 4.7, t, P.PR3);
  tag('REVERSE PRIMER', cam.x(37 * NT), cam.y(yT + 2 * BB + 4), 30, 430, t0 + 4.9, t0 + 5.6, t, P.PR2);
}
// S14-S16 share: template TB at the bottom with the forward primer bound; the probe on nts 20..28
const PROBE_I = [20, 28];
function probeWorld(cam, t, o) {
  o = o || {};
  const z = cam.z;
  rect(0, 0, W, H, P.BG);
  if (o.blue > 0) rect(0, 0, W, H, P.XB0, 0.22 * o.blue);
  for (let i = 0; i < 24; i++) { const x = cam.x((hash(i + 4300) - 0.2) * 700), y = cam.y((hash(i + 4301) - 0.5) * 600); disc(x, y, 1.5 * z, P.N4); }
  const S = o.S, jIdx = S ? S.jf : 10;
  if (o.topY !== undefined) {
    // the second strand (top) with the reverse primer bound near its 3' end, drifting out of view
    drawStrand(cam, { kind: 'primer', seq: TTSEQ, x0: 0, y: o.topY, side: 1, five: 'L', i0: 2, i1: 9 }, t);
    drawStrand(cam, { kind: 'new', seq: TTSEQ, x0: 0, y: o.topY, side: 1, five: 'L', i0: 10, i1: 41 }, t);
    drawStrand(cam, { kind: 'primer', seq: TBSEQ, x0: 0, y: o.topY + 2 * BB, side: -1, five: 'R', i0: 34, i1: 41 }, t);
    drawHBonds(cam, 0, TBSEQ, 34, 41, o.topY, o.topY + 2 * BB, 1);
  }
  if (o.back) o.back();
  if (o.pol) polymeraseBack(cam.x(jIdx * NT), cam.y(0), z);
  drawTB(cam, BB, t, { letters: o.letters, ends: o.ends });
  drawStrand(cam, { kind: 'primer', seq: TTSEQ, x0: 0, y: -BB, side: 1, five: 'L', i0: 2, i1: 9, letters: o.letters }, t);
  drawHBonds(cam, 0, TBSEQ, 2, 9, -BB, BB, 1);
  if (S && S.n > 0) { drawStrand(cam, { kind: 'new', seq: TTSEQ, x0: 0, y: -BB, side: 1, five: 'L', i0: 10, i1: 9 + S.n, letters: o.letters }, t); drawHBonds(cam, 0, TBSEQ, 10, 9 + S.n, -BB, BB, 1); }
  // the probe: o.probeY (approach), o.cutTo (first probe nucleotide still bound), reporter / quencher positions
  if (o.probe !== false) {
    const i0 = Math.max(PROBE_I[0], o.cutTo || PROBE_I[0]), py = o.probeY === undefined ? -BB : o.probeY;
    if (i0 <= PROBE_I[1]) {
      drawStrand(cam, { kind: 'probe', seq: TTSEQ, x0: 0, y: py, side: 1, five: 'L', i0, i1: PROBE_I[1], letters: o.letters }, t);
      if (py === -BB) drawHBonds(cam, 0, TBSEQ, i0, PROBE_I[1], -BB, BB, 1, o.hbK ? i => o.hbK(i) : null);
      if (!o.qGone) quencher(cam.x(PROBE_I[1] * NT) + 10 * z, cam.y(py) - 3 * z, z * 1.15);
    }
    if (!o.rFree) reporter(cam.x(PROBE_I[0] * NT) - 10 * z, cam.y(py) - 3 * z, z * 1.15, o.rLit || 0);
  }
  if (o.pol) polymeraseFront(cam.x(jIdx * NT), cam.y(0), z, { fingers: o.fingers || 0, nuclease: o.nuc || 0, active: S && S.sinceJoin < 0.2 ? 1 - S.sinceJoin / 0.2 : 0 });
  return { jIdx };
}
function s14(t) {
  const t0 = T(13);
  const cam = camTrack([[t0, 21 * NT, -70, 0.7], [t0 + 1.4, 22 * NT, -20, 1.55, K75], [t0 + 4.2, 24 * NT, -20, 1.6, lin], [T(14), 23 * NT, -10, 1.85, K50]], t);
  const land = ph(t, t0 + 2.0, t0 + 3.2, K75), zip = ph(t, t0 + 3.0, t0 + 4.0, lin), blue = ph(t, t0 + 4.2, t0 + 4.6);
  probeWorld(cam, t, { letters: cam.z > 1.4, probeY: lerp(-BB - 160, -BB, land), hbK: i => ((i - PROBE_I[0] + 1) / 9) <= zip ? 1 : 0, blue, topY: -BB - 140 - 200 * ph(t, t0 + 0.3, t0 + 1.6), ends: true });
  if (land < 1) { /* hydrogen bonds wait for landing */ }
  // quenching: blue light hits the reporter, the energy hops to the quencher, no green comes out
  if (blue > 0) {
    const rx = cam.x(PROBE_I[0] * NT) - 10 * cam.z, ry = cam.y(-BB) - 3 * cam.z, qx = cam.x(PROBE_I[1] * NT) + 10 * cam.z;
    for (let k = 0; k < 4; k++) { const u = ((t * 1.6 + k / 4) % 1); disc(lerp(rx - 30, rx, u), lerp(20, ry, u), 2.6, P.XB2, 1 - u * 0.3); }
    const hop = (t * 1.2) % 1;
    dashLine(rx, ry - 12, qx, ry - 12, P.QU3, 3, 3, -t * 30); arrowHead(qx, ry - 12, 0, 5, P.QU3);
    disc(lerp(rx, qx, hop), ry - 12, 2.5, P.RP2);
    label('NO GREEN LIGHT: QUENCHED', CX, 430, t0 + 4.4, T(14) - 0.05, t, P.QU3, 'center');
  }
  tag('PROBE', cam.x(24 * NT), cam.y(lerp(-BB - 160, -BB, land)) - 14, 160, 150, t0 + 1.0, t0 + 3.4, t, P.PB2);
  tag("REPORTER (5')", cam.x(PROBE_I[0] * NT) - 10 * cam.z, cam.y(lerp(-BB - 160, -BB, land)) - 6 * cam.z, 20, 190, t0 + 1.4, t0 + 4.4, t, P.RP2);
  tag("QUENCHER (3')", cam.x(PROBE_I[1] * NT) + 10 * cam.z, cam.y(lerp(-BB - 160, -BB, land)) - 6 * cam.z, 170, 220, t0 + 1.8, t0 + 4.4, t, P.QU3);
}
// polymerase timing: docks at 73-75, first nucleotide at 79.1 (after the active-site close-up), then on
const POL_T = (() => { const s = T(14), a = [s + 6.1]; for (let k = 1; k < 6; k++) a.push(s + 6.1 + k * 0.38); a.push(T(15) + 0.9); for (let k = 0; k < 12; k++) a.push(T(15) + 3.1 + k * 0.32); return a; })();
function s15(t) {
  const t0 = T(14);
  const S = synthState(POL_T, 10, t);
  const dock = ph(t, t0 + 0.2, t0 + 1.8, K75);
  const camF = camTrack([[t0, 24 * NT, -20, 1.62], [t0 + 1.4, 11 * NT, -14, 1.85, K75], [t0 + 3.6, 11 * NT, -14, 2.0, lin], [t0 + 6.0, 11 * NT, -14, 2.0, lin], [T(15), 14 * NT, -14, 1.9, K75]], t);
  const inLens = t >= t0 + 3.9 && t < t0 + 6.05;
  const drawMain = () => {
    // polymerase sliding in to the primer end (drawn behind the DNA through the callback)
    const jx = camF.x(lerp(-6, S.jf, dock) * NT), jy = camF.y(lerp(-120, 0, dock));
    probeWorld(camF, t, { letters: true, S: dock >= 1 ? S : null, pol: false, back: () => polymeraseBack(jx, jy, camF.z) });
    if (dock >= 1 && S.n < POL_T.length) incoming(camF, 10 + S.n, -BB, TTSEQ[10 + S.n], t < t0 + 6.0 && S.n === 0 ? ph(t, t0 + 2.0, t0 + 3.4) : S.arrive, camF.z, { letters: true, greek: S.n === 0 });
    ppiAway(camF, 9 + S.n, -BB, S.sinceJoin, camF.z);
    if (S.sinceJoin < 0.12 && S.n > 0) flash(camF.x((9 + S.n) * NT), camF.y(-BB), 6 * camF.z, 1 - S.sinceJoin / 0.12, [P.NS1, P.NS2, P.NS3, P.C6]);
    mgIon(jx - 6 * camF.z, jy - 14 * camF.z, camF.z * 0.9); mgIon(jx + 7 * camF.z, jy - 16 * camF.z, camF.z * 0.9);
    polymeraseFront(jx, jy, camF.z, { fingers: S.n === 0 ? ph(t, t0 + 3.0, t0 + 3.5) : clamp(S.arrive * 1.4 - 0.3, 0, 1), active: S.sinceJoin < 0.2 ? 1 - S.sinceJoin / 0.2 : 0 });
    return { jx, jy };
  };
  if (!inLens) {
    const r = lensOut(t, t0 + 6.0, t0 + 6.5);
    const m = drawMain();
    if (t < t0 + 3.6) {
      tag('DNA POLYMERASE', m.jx - 30, m.jy + 50, 24, 440, t0 + 0.9, t0 + 2.6, t, P.PO3);
      tag("PRIMER 3' END", camF.x(9 * NT), camF.y(-BB), 30, 150, t0 + 1.2, t0 + 2.6, t, P.PR2);
      tag('MATCHING dNTP', camF.x(10 * NT), camF.y(-BB) - 60, 170, 120, t0 + 2.1, t0 + 3.6, t, P.DN2);
    }
    if (r > 0.5 && t >= t0 + 6.0) lensComposite(() => activeSite(new Cam(30, 0, lerp(2.0, 0.8, ph(t, t0 + 6.0, t0 + 6.5)), CX, CY), t, 1), m.jx, m.jy - 10, r);
    if (t >= t0 + 6.5) { label("5' → 3'", camF.x(12 * NT), camF.y(-BB) - 46, t0 + 6.5, T(15) - 0.05, t, P.NS3, 'center'); tag('NEW STRAND', camF.x(11 * NT), camF.y(-BB - 4), 30, 150, t0 + 6.7, T(15) - 0.05, t, P.NS3); }
    if (t >= t0 + 3.5 && t < t0 + 3.9) { const rr = lensIn(t, t0 + 3.5, t0 + 3.9); lensComposite(() => activeSite(new Cam(30, 0, lerp(0.5, 0.8, ph(t, t0 + 3.5, t0 + 3.9)), CX, CY), t, 0), m.jx, m.jy - 10, rr); }
    return;
  }
  // the active site, atom by atom
  const k = ph(t, t0 + 3.9, t0 + 5.9, lin);
  const ac = camTrack([[t0 + 3.9, 30, 0, 0.8], [t0 + 4.4, 30, 0, 2.0, K75], [t0 + 6.05, 30, 0, 2.08, lin]], t);
  const res = activeSite(ac, t, k);
  tag("3'-OH", res.o3[0], res.o3[1], 30, 130, t0 + 4.2, t0 + 5.0, t, P.OX2);
  tag('Mg²⁺', res.mA[0], res.mA[1], 40, 420, t0 + 4.4, t0 + 5.6, t, P.MG2);
  tag('ALPHA PHOSPHATE', res.pa[0], res.pa[1], 170, 130, t0 + 4.6, t0 + 5.2, t, P.PH2);
  tag('PHOSPHODIESTER BOND', (res.o3[0] + res.pa[0]) / 2, (res.o3[1] + res.pa[1]) / 2, 120, 420, t0 + 5.1, t0 + 6.0, t, P.YEL);
  tag('PYROPHOSPHATE LEAVES', res.ppi[0], res.ppi[1], 120, 120, t0 + 5.4, t0 + 6.0, t, P.PH2);
}
// S16: cleavage at 84.0 (bar 43): the nuclease domain cuts the reporter off, then chews through the probe
function s16(t) {
  const t0 = T(15), S = synthState(POL_T, 10, t), cutT = t0 + 3.0;
  const cam = camTrack([[t0, 14 * NT, -14, 1.9], [t0 + 2.0, 17 * NT, -20, 1.9, lin], [cutT, 18 * NT, -20, 2.05, lin], [cutT + 0.2, 18 * NT, -20, 1.95, eout], [T(16), 23 * NT, -40, 1.25, K75]], t);
  const j = S.jf;
  // probe nucleotides are released one by one from the 5' end once the nuclease domain reaches them
  const nucX = j + 3.75;                                     // the nuclease domain sits ~45 units (3.75 nt) ahead
  const cutTo = t < cutT ? PROBE_I[0] : Math.max(PROBE_I[0] + 1, Math.floor(nucX) + 1);
  const rFree = t >= cutT, qGone = cutTo > PROBE_I[1];
  probeWorld(cam, t, { letters: cam.z > 1.4, S, pol: true, cutTo, rFree, qGone, fingers: clamp(S.arrive * 1.4 - 0.3, 0, 1), nuc: t > cutT - 0.6 && t < cutT + 1.6 ? 1 : 0 });
  if (S.n < POL_T.length) incoming(cam, 10 + S.n, -BB, TTSEQ[10 + S.n], S.arrive, cam.z, { letters: true });
  ppiAway(cam, 9 + S.n, -BB, S.sinceJoin, cam.z);
  const z = cam.z;
  if (t >= cutT && t < cutT + 0.2) flash(cam.x(PROBE_I[0] * NT) - 4 * z, cam.y(-BB), 12 * z, 1 - (t - cutT) / 0.2, [P.PO1, P.PO3, P.PO4, P.C6]);
  // the freed reporter drifts up-left; the probe fragments and the quencher drift away
  if (rFree) {
    const u = ph(t, cutT, cutT + 2.6, eout);
    reporter(cam.x(PROBE_I[0] * NT) - 10 * z - u * 60 * z, cam.y(-BB) - 3 * z - u * 80 * z, z * 1.15, 0);
    for (let i = PROBE_I[0] + 1; i < Math.min(cutTo, PROBE_I[1] + 1); i++) {
      const tc = cutT + (i - PROBE_I[0]) * 0.3, v = ph(t, tc, tc + 1.6, eout);
      dNTP(cam.x(i * NT) + v * 40 * z * (hash(i) - 0.3), cam.y(-BB) - 8 * z - v * 140 * z, -Math.PI / 2 + v * 2, TTSEQ[i], z * 0.8, { np: 1, cols: [P.PB0, P.PB1, P.PB2, P.PB3, P.PB3] });
    }
    if (qGone) { const v = ph(t, cutT + 2.6, cutT + 4.0, eout); quencher(cam.x(PROBE_I[1] * NT) + 10 * z + v * 60 * z, cam.y(-BB) - 3 * z - v * 120 * z, z * 1.15); }
  }
  tag("5' NUCLEASE DOMAIN", cam.x((j + 3.75) * NT), cam.y(-30), 170, 120, t0 + 0.6, cutT - 0.1, t, P.PO3);
  tag('PROBE CUT', cam.x(PROBE_I[0] * NT), cam.y(-BB), 40, 150, cutT, cutT + 1.6, t, P.YEL);
  tag('REPORTER FREE', cam.x(PROBE_I[0] * NT) - 10 * z - ph(t, cutT, cutT + 2.6, eout) * 60 * z, cam.y(-BB) - 3 * z - ph(t, cutT, cutT + 2.6, eout) * 80 * z, 30, 120, cutT + 1.4, T(16) - 0.05, t, P.RP2);
  tag('TEMPLATE INTACT', cam.x(26 * NT), cam.y(BB + 10), 150, 440, cutT + 1.8, T(16) - 0.05, t, P.CD3);
}
// ============================================================================ S17: fluorescence physics
function s17(t) {
  const t0 = T(16);
  if (t < t0 + 0.5) {
    const c16 = camTrack([[t0 - 0.3, 23 * NT, -40, 1.25], [t0 + 0.5, 22 * NT, -150, 6, K75]], t);
    s16(Math.min(t, t0 - 0.02));
    const r = lensIn(t, t0, t0 + 0.5);
    if (r > 0.5) lensComposite(() => fluorWorld(t, 0), CX, CY - 60, r);
    return;
  }
  fluorWorld(t, 1);
}
function fluorWorld(t, on) {
  const t0 = T(16);
  rect(0, 0, W, H, P.BG);
  for (let i = 0; i < 40; i++) { const x = ((hash(i + 4500) * 400 + t * 9 * (0.5 + hash(i + 4501))) % 400) - 20, y = (hash(i + 4502) * 660 + 10 * Math.sin(t * 0.7 + i)) % 660 - 10; pset(x, y, i % 3 ? P.N4 : P.N6); }
  const st = ph(t, t0 + 1.4, t0 + 4.6, lin), z = 1 + 0.08 * ph(t, t0 + 0.5, T(17), lin);
  const exc = st > 0.1 && st < 0.6 ? 1 : 0;
  const fx = 100 + exc * 1.5 * Math.sin(t * 47) + 4 * Math.sin(t * 2.6), fy = 190 + exc * 1.5 * Math.cos(t * 53) + 5 * Math.sin(t * 2.2), absorbed = t >= t0 + 1.4, emitted = st >= 0.72;
  bigFluor(fx, fy, 1.25 * z, emitted ? 1 - 0.5 * ph(t, t0 + 4.6, T(17)) : absorbed && st < 0.72 ? 0.35 : 0);
  if (!absorbed) photonWave(-40, 40, fx - 10, fy - 10, 13, 7, ph(t, t0 + 0.6, t0 + 1.4, lin), P.XB2, 90);
  if (absorbed && t < t0 + 1.55) flash(fx - 10, fy - 10, 14, 1 - (t - t0 - 1.4) / 0.15, [P.XB0, P.XB1, P.XB2, P.C6]);
  if (emitted) for (let k = 0; k < 3; k++) { const ts = t0 + 3.75 + k * 0.33; if (t > ts) photonWave(fx + 20, fy, 400, 110 - k * 40, 24, 8, ph(t, ts, ts + 1.0, lin), P.EM2, 140); }
  if (emitted) glow(fx, fy, (40 + 8 * Math.sin(t * 9)), P.EM1, P.EM2, 0.3);
  jablonski(54, 300, 250, 190, st, t);
  if (!on) return;
  tag('BLUE PHOTON', 10, 50, 40, 130, t0 + 0.6, t0 + 1.6, t, P.XB2);
  tag('REPORTER', fx, fy - 30, 160, 140, t0 + 0.6, t0 + 2.0, t, P.RP2);
  label('ABSORBS BLUE', 54, 250, t0 + 1.8, t0 + 2.9, t, P.XB3);
  label('RELAXES (A LITTLE HEAT)', 54, 250, t0 + 2.9, t0 + 3.8, t, P.HT3);
  label('EMITS GREEN', 54, 250, t0 + 3.8, T(17) - 0.05, t, P.EM2);
  label('LOWER ENERGY · LONGER WAVELENGTH', CX, 532, t0 + 4.0, T(17) - 0.05, t, P.EM3, 'center');
}
// ============================================================================ S18: the optical system
function s18(t) {
  const t0 = T(17);
  const cam = camTrack([[t0, 0, 100, 6], [t0 + 0.7, -10, -50, 1.0, K75], [T(18), -10, -60, 1.04, lin]], t);
  const st = { led: 1, ex: ph(t, t0 + 1.2, t0 + 1.6), em: ph(t, t0 + 2.4, t0 + 2.8), block: t > t0 + 2.0, glow: ph(t, t0 + 2.0, t0 + 2.6), pdLit: ph(t, t0 + 3.4, t0 + 3.8) };
  opticsScene(cam, t, st);
  const r = lensOut(t, t0, t0 + 0.6);
  if (r > 0.5) lensComposite(() => fluorWorld(t, 0), cam.x(0), cam.y(OPT.wy), r);
  tag('BLUE LED', cam.x(OPT.led[0]), cam.y(OPT.led[1] - 14), 20, 110, t0 + 0.8, t0 + 2.4, t, P.XB3);
  tag('EXCITATION FILTER', cam.x(OPT.exF[0]), cam.y(OPT.exF[1]), 20, 300, t0 + 1.3, t0 + 2.9, t, P.XB2);
  tag('EMISSION FILTER', cam.x(16), cam.y(OPT.emF[1]), 150, 250, t0 + 2.6, T(18) - 0.05, t, P.EM2);
  tag('PHOTODIODE', cam.x(16), cam.y(OPT.pd[1] - 4), 150, 140, t0 + 3.3, T(18) - 0.05, t, P.PD4);
  label('SCATTERED BLUE IS BLOCKED', CX, 92, t0 + 3.0, T(18) - 0.05, t, P.XB3, 'center');
}
// ============================================================================ S19: photodiode to electricity
const PD_EV = [0.95, 1.45, 1.85, 2.25, 2.6, 2.95];
function s19(t) {
  const t0 = T(18);
  if (t < t0 + 0.6) {
    const oc = camTrack([[t0, -10, -60, 1.04], [t0 + 0.6, 0, OPT.pd[1] - 3, 12, K75]], t);
    opticsScene(oc, t, { led: 1, ex: 1, em: 1, block: true, glow: 1, pdLit: 1 });
    const r = lensIn(t, t0 + 0.15, t0 + 0.6);
    if (r > 0.5) lensComposite(() => junctionScene(new Cam(0, 40, 0.8, CX, CY), t, {}), oc.x(0), oc.y(OPT.pd[1] - 3), r);
    return;
  }
  const cam = camTrack([[t0 + 0.6, 0, 40, 1.0], [t0 + 3.4, 0, 40, 1.05, lin], [T(19), 0, -150, 1.0, K75]], t);
  let cur = 0;
  const res = junctionScene(cam, t, { current: ph(t, t0 + 1.3, t0 + 1.7), adc: ph(t, t0 + 3.6, t0 + 3.9) });
  PD_EV.forEach((e, i) => { cur = Math.max(cur, photoEvent(cam, t, t0 + e, JN.y0 + 40 + i * 44, i * 3 + 1)); });
  tag('GREEN PHOTON', cam.x(160), cam.y(JN.y0 + 40), 170, 110, t0 + 0.7, t0 + 1.6, t, P.EM2);
  tag('ELECTRON', cam.x(-60), cam.y(JN.y0 + 84), 20, 300, t0 + 1.5, t0 + 2.8, t, P.EL1);
  tag('HOLE', cam.x(80), cam.y(JN.y0 + 84), 180, 300, t0 + 1.6, t0 + 2.9, t, P.C4);
  tag('ELECTRIC FIELD', cam.x(10), cam.y(JN.y0 + 194), 120, 460, t0 + 1.9, t0 + 3.3, t, P.SI2);
  tag('PHOTOCURRENT', cam.x(60), cam.y(res.cy), 170, cam.y(res.cy) - 30, t0 + 2.4, T(19) - 0.05, t, P.SG2);
  tag('AMPLIFIER → ADC', cam.x(6), cam.y(res.adcY), 150, cam.y(res.adcY) + 40, t0 + 3.8, T(19) - 0.05, t, P.DT3);
  label('MANY PHOTONS PER READING', CX, 96, t0 + 2.9, T(19) - 0.05, t, P.INK, 'center');
}
// ============================================================================ S20: amplification repeats
function cycleMini(cam, t, u, z) {
  // one cycle in miniature: denature (u 0-.33), primers bind (.33-.6), extension (.6-1) → two duplexes
  const x = cam.x(0), y = cam.y(0), L = 120 * z;
  const sep = u < 0.33 ? smooth(u / 0.33) : 1, ext = smooth(clamp((u - 0.6) / 0.4, 0, 1)), prim = smooth(clamp((u - 0.33) / 0.27, 0, 1));
  const yA = y - 8 * z - sep * 26 * z + Math.sin(t * 5) * 2 * z, yB = y + 8 * z + sep * 26 * z + Math.sin(t * 4.3 + 1) * 2 * z;
  lineW(x - L / 2, yB, x + L / 2, yB, 3 * z, P.CD2); lineW(x - L / 2, yA, x + L / 2, yA, 3 * z, P.NS2);
  if (sep < 1) for (let k = 0; k < 14; k++) { const xx = x - L / 2 + (k + 0.5) * L / 14; line(xx, yA + 2 * z, xx, yB - 2 * z, P.C4); }
  if (prim > 0) {
    lineW(x - L / 2, yB - 8 * z, x - L / 2 + 22 * z, yB - 8 * z, 3 * z, P.PR2, prim);
    lineW(x + L / 2 - 22 * z, yA + 8 * z, x + L / 2, yA + 8 * z, 3 * z, P.PR2, prim);
  }
  if (ext > 0) {
    lineW(x - L / 2 + 22 * z, yB - 8 * z, x - L / 2 + 22 * z + (L - 22 * z) * ext, yB - 8 * z, 3 * z, P.NS2);
    lineW(x + L / 2 - 22 * z, yA + 8 * z, x + L / 2 - 22 * z - (L - 22 * z) * ext, yA + 8 * z, 3 * z, P.CD2);
  }
  return { phase: u < 0.33 ? 'DENATURATION 95°C' : u < 0.6 ? 'PRIMER BINDING 60°C' : 'EXTENSION 60°C', T: u < 0.33 ? 95 : 60 };
}
function s20(t) {
  const t0 = T(19);
  if (t < t0 + 1.5) {
    const cam = camTrack([[t0, wellX(HOOK_WELL), 384, 6], [t0 + 0.7, wellX(HOOK_WELL), 380, 3.2, K75], [t0 + 1.5, wellX(HOOK_WELL), 380, 3.0, lin]], t);
    labBG(cam, t);
    const cyc = Math.floor((t - t0) * 4) % 2;
    drawMachine(cam, t, { xray: 1, lidHeat: 1, blockT: cyc ? 95 : 60, fan: t * 9, cable: false, wellGlow: i => 0.25 });
    const r = lensOut(t, t0, t0 + 0.6);
    if (r > 0.5) lensComposite(() => junctionScene(new Cam(0, -150, lerp(1.0, 0.5, ph(t, t0, t0 + 0.6)), CX, CY), t, { current: 1, adc: 1 }), cam.x(wellX(HOOK_WELL)), cam.y(380), r);
    tag('NEW TARGET DNA EVERY CYCLE', cam.x(wellX(HOOK_WELL)), cam.y(384), 30, 440, t0 + 0.5, t0 + 1.5, t, P.NS3);
    return;
  }
  rect(0, 0, W, H, P.BG);
  if (t < t0 + 3.0) {
    const u = ph(t, t0 + 1.5, t0 + 3.0, lin), res = cycleMini(new Cam(0, 0, 1.0, CX, CY + 10), t, u, 2.3);
    tempBadge(res.T, t);
    label(res.phase, CX, 200, t0 + 1.5, t0 + 3.0, t, res.T > 80 ? P.HT3 : P.CL3, 'center');
    return;
  }
  // doubling on the beats: 1, 2, 4, 8, 16
  const beats = [t0 + 3.0, t0 + 3.5, t0 + 4.0, t0 + 4.5];
  let n = 1, popk = 1; beats.forEach(b => { if (t >= b) { n *= 2; popk = ph(t, b, b + 0.2, eout); } });
  doublingGrid(CX, 330, n, popk, n >= 16 ? 1.25 : n >= 8 ? 1.4 : 1.6);
  const c = Math.round(Math.log2(n)) + 1;
  text(FS, 'CYCLE ' + c, CX, 200, { sc: 3, c: P.INK, ol: P.SH, align: 'center' });
  text(FS, n + (n === 1 ? ' COPY' : ' COPIES'), CX, 470, { sc: 3, c: P.NS3, ol: P.SH, align: 'center' });
}
// ============================================================================ S21: fluorescence increases
function s21(t) {
  const t0 = T(20), k = ph(t, t0 + 0.4, t0 + 4.6, lin);
  const cam = new Cam(0, 0, 1.0 + 0.04 * k, CX, CY);
  if (t < t0 + 0.4) { s20(T(20) - 0.01); dissolveWorld(() => crowdScene(cam, t, 0), ph(t, t0, t0 + 0.4, lin)); return; }
  const lv = crowdScene(cam, t, k);
  label('MORE PROBES CUT', 30, 110, t0 + 0.8, t0 + 2.6, t, P.PB2);
  label('MORE FREE REPORTERS', 30, 110, t0 + 2.6, T(21) - 0.05, t, P.RP2);
  text(FS, Math.round(AMP.base + lv * 3000) + ' RFU', 268, 104, { sc: 2, c: P.RP2, ol: P.SH, align: 'center' });
}
// ============================================================================ S22: digital fluorescence data
function s22(t) {
  const t0 = T(21), cyc = lerp(18, 25, ph(t, t0 + 0.4, T(22), lin));
  const cam = camTrack([[t0, 0, -160, 1.0], [t0 + 1.4, 0, -60, 1.0, K75], [t0 + 3.2, 0, 150, 1.0, K75], [T(22), 0, 190, 1.0, lin]], t);
  if (t < t0 + 0.3) { crowdScene(new Cam(0, 0, 1.04, CX, CY), t, 1); dissolveWorld(() => dataScene(cam, t, { cyc, adc: 1 }), ph(t, t0, t0 + 0.3, lin)); return; }
  dataScene(cam, t, { cyc, adc: 1 });
  label('ONE READING PER CYCLE', CX, 96, t0 + 2.4, T(22) - 0.05, t, P.DT3, 'center');
}
// ============================================================================ S23: the amplification curve
function s23(t) {
  const t0 = T(22), cyc = lerp(1, 40, ph(t, t0 + 0.3, t0 + 3.4, lin));
  const cam = camTrack([[t0, 0, 0, 1.0], [t0 + 2.2, 4, 10, 1.06, lin], [T(23), 14, 34, 1.16, K75]], t);
  curveScene(cam, t, { cyc, notes: ph(t, t0 + 0.6, t0 + 1.4), cq: cyc >= CQ ? ph(t, t0 + 2.0, t0 + 2.6) : 0 });
}
// ============================================================================ S24: result validation
function s24(t) {
  const t0 = T(23), slam = 3.0;            // the banner lands on bar 63 (124.0 s)
  const bz = t >= t0 + slam ? 1 + 0.12 * Math.max(0, 1 - (t - t0 - slam) / 0.18) : 1;
  const cam = new Cam(0, -6 + 16 * ph(t, t0, T(24), lin), bz * (1 + 0.06 * ph(t, t0, T(24), lin)), CX, CY);
  resultScene(cam, t, { rows: ph(t, t0 + 0.2, t0 + 2.6, lin) * 4, banner: ph(t, t0 + slam, t0 + slam + 0.4, lin) });
  // victory sparkles around the banner
  if (t >= t0 + slam) for (let i = 0; i < 18; i++) {
    const u = (t - t0 - slam) * (0.8 + hash(i + 4700)) + hash(i + 4701), a = hash(i + 4702) * TAU, r = 30 + (u % 1) * 140;
    const x = CX + Math.cos(a) * r, y = 520 + Math.sin(a) * r * 0.5, k = 1 - (u % 1);
    if (k > 0.1) { const c = i % 3 ? P.RP3 : P.YEL; pset(x, y, c); pset(x + 1, y, c); pset(x - 1, y, c); pset(x, y + 1, c); pset(x, y - 1, c); }
  }
}
// ============================================================================ S25: recap, back to frame one
function s25(t) {
  const t0 = T(24);
  const cam = camTrack([[t0, 180, 160, 2.2], [t0 + 1.6, 180, 320, 1.0, K75], [DUR, 180, 320, 1.0, lin]], t);
  const reset = t >= t0 + 4.15, cyc = reset ? lerp(0, 20, ph(t, t0 + 4.15, DUR - 0.02, lin)) : 40;
  labScene(cam, t, { mon: { cyc, live: reset, banner: reset ? 0 : 1 }, mach: { cycle: reset ? 27 : 40, blockT: 60 } });
  // the recap chain: one link per eighth note (127.0 → 128.75)
  const k = ph(t, t0 + 1.7, t0 + 2.0) * (1 - ph(t, t0 + 4.2, t0 + 4.6));
  if (k > 0) {
    rect(0, 0, W, H, P.K0, 0.55 * k);
    for (let i = 0; i < 8; i++) {
      const ti = t0 + 2.0 + i * E8, a = ph(t, ti, ti + 0.18, eout) * k; if (a <= 0) continue;
      const col = i % 2, row = Math.floor(i / 2), x = col ? 262 : 98, y = 150 + row * 92;
      const s = backOut(clamp((t - ti) / 0.3, 0, 1), 1.4);
      rect(x - 70, y - 30, x + 70, y + 34, P.DS1, a); frame(x - 70, y - 30, x + 70, y + 34, P.N5);
      if (a > 0.6) { RECAP_ICONS[i](x, y - 6, 34 * s, t); text(FS, RECAP_L[i], x, y + 20, { sc: 1, c: P.INK, ol: null, align: 'center' }); }
      if (i > 0 && a > 0.6) {
        const pc = (i - 1) % 2, pr = Math.floor((i - 1) / 2), px = pc ? 262 : 98, py = 150 + pr * 92;
        if (row === pr) { lineW(px + 72, py, x - 74, y, 2, P.YEL); arrowHead(x - 72, y, 0, 4, P.YEL); }
        else { lineW(px - 60, py + 36, x + 60, y - 32, 2, P.YEL); arrowHead(x + 58, y - 30, Math.atan2(y - 32 - py - 36, x + 60 - px + 60), 4, P.YEL); }
      }
    }
  }
}
// ============================================================================ dispatcher
const SCN_FN = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24, s25];
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  SCN_FN[sceneIndex(t)](t);
  overlays(t);
}
function engineInit() { }
