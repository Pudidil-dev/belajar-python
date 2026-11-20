// S09 QUANTUM MEASUREMENT (99–109 s): reading out the Bell pair. A ≈7 GHz readout pulse runs along the feedline past
// the two qubits' readout resonators. Each qubit's state shifts its resonator's frequency a little (dispersive readout),
// so the pulse that comes out carries the state in its phase. It climbs the amplifier chain — a quantum-limited
// amplifier at 15 mK, a HEMT amplifier at 4 K, amplifiers at room temperature — to the digitizer, where every run lands
// in one of two clouds per qubit: a classical 0 or 1. Repeating the whole experiment gives 00 and 11 about half the
// time each; the few 01 and 10 runs are errors of real hardware.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, h = U.hash;
const S8 = window.S08, MM = FR.FS / 10, C0 = FR.toRoom(0, FR.PKG.y + FR.PKG.h / 2);
const QA = CH.Q[S8.IA], QB = CH.Q[S8.IB], MID = S8.MID;
const room = (x, y) => [C0[0] + x * MM, C0[1] + y * MM];
const anchor = (A, sx, sy, zmm) => { const z = zmm / MM; return { x: A[0] - (sx - W / 2) / z, y: A[1] - (sy - H / 2) / z, z }; };
// one tall world the camera climbs: result panel (y 0–480), amplifier chain and digitizer (500–900), chip (900–1380);
// the output line leaves the chip's feedline at y 1128 and runs straight up
const YC = 900, YF = 1128, XL = 228, YD = 500;
const scrollAt = t => YC * (1 - io(clamp((t - 2.5) / 3.0)));
const sigY = t => YF - (YF - YD - 40) * io(clamp((t - 2.4) / 2.6));     // the output signal climbing the chain
const ZC = 22, FEED = -4.3;
const chipCam = t => {
  const u = io(clamp(t / 0.8)), base = anchor(room(...MID), 135, lerp(132, 330, u), K.zl(30, ZC, u));
  return { x: base.x, y: base.y - (YC - scrollAt(t)) / base.z, z: base.z };
};
// the readout pulse along the feedline (chip mm), left → right
const TR0 = 0.6, TR1 = 2.4, FX0 = -4.9, FX1 = 4.9;
const pulseX = t => lerp(FX0 - 0.6, FX1 + 0.4, clamp((t - TR0) / (TR1 - TR0)));
const tapX = q => q.x + 0.18;
const tPass = q => TR0 + (TR1 - TR0) * (tapX(q) - FX0 + 0.6) / (FX1 + 0.4 - FX0 + 0.6);
// repeated runs: accelerating, 400 in all; outcomes of the ideal Bell state plus a few hardware errors
const TRUN = 5.0, NMAX = 400;
const runsAt = t => t < TRUN ? 0 : Math.min(NMAX, Math.floor(1 + 1.6 * (Math.exp(1.2 * (t - TRUN)) - 1)));
const runTime = k => k === 0 ? TRUN : TRUN + Math.log(1 + k / 1.6) / 1.2;
const outcome = k => { if (k === 0) return '00'; const r = h(k, 77); return r < 0.022 ? '01' : r < 0.045 ? '10' : h(k, 78) < 0.5 ? '00' : '11'; };
const gauss = (k, s) => { const u = Math.max(1e-6, h(k, s)), v = h(k, s + 1); return Math.sqrt(-2 * Math.log(u)) * Math.cos(U.TAU * v); };
window.S09 = { scrollAt, runsAt, outcome, NMAX };

function chip(c, t) {
  const cam = chipCam(t), zmm = cam.z * MM, off = YC - scrollAt(t);
  if (off > 480) return;
  FR.chipView(c, cam, t + 99, { hl: new Set([S8.IA, S8.IB]) }, cc => {
    // the two readout resonators ring as the pulse passes their taps
    for (const q of [QA, QB]) {
      const tp = tPass(q), ring = t > tp - 0.1 ? Math.exp(-Math.max(0, t - tp) * 1.6) * clamp((t - tp + 0.1) / 0.15) : 0;
      if (ring > 0.05) { cc.save(); const rp = CH.resPath(q); cc.strokeStyle = PIX.P[ring > 0.5 ? 'o2' : 'o1']; cc.lineWidth = Math.max(0.03, 1.6 / zmm); cc.beginPath(); rp.forEach(([x, y], i) => i ? cc.lineTo(x, y) : cc.moveTo(x, y)); cc.stroke(); cc.restore(); }
    }
    if (t > TR0 && t < TR1 + 0.3) { const x = pulseX(t), pts = [[FX0 - 1, FEED], [FX1 + 1, FEED]], L = FX1 - FX0 + 2; CH.pulse(cc, pts, (x - FX0 + 1) / L, { sig: 0.35, amp: 0.09, lam: 0.12, z: zmm, t }); }
  });
  const [ax, ay] = K.S(cam, ...room(QA.x, QA.y)), [bx, by] = K.S(cam, ...room(QB.x, QB.y));
  // S08's look hands over: its dimming fades out, the pair's glow and outline last until the readout reaches them
  const f = 1 - io(clamp(t / 0.8)), g = 1 - K.sm(t, tPass(QA) - 0.05, tPass(QA) + 0.25);
  S8.decor(c, 15 + t, cam, f, g);
  FX.fadeBelow(c, ay + 40, ay + 90, 0.7 * (1 - f));
  if (off > 0) FX.fadeAbove(c, off - 36, off, 1);                     // the chain's dark band above the chip section
  for (const [x, y, q] of [[ax, ay, QA], [bx, by, QB]]) { const fl = t - tPass(q); if (fl > 0 && fl < 0.5) FX.glowL(c, x, y, 12, ['e0', 'e1', 'e2'], 0.9 * (1 - fl / 0.5), 1.3); }
  // response card: the qubit's state shifts the resonator's dip; the probe sits between the two
  if (t > 0.8 && off < 300) {
    const a = MO.cubicOut(clamp((t - 0.8) / 0.25)), x0 = 152, y0 = 62 + off, w = 108, hh = Math.round(66 * a);
    PIX.rect(c, x0, y0, w, hh, 'd3'); PIX.rect(c, x0 + 1, y0 + 1, w - 2, hh - 2, 'k');
    if (a >= 1) {
      PIX.text(c, 'RESONATOR', x0 + 4, y0 + 4, 'd8', { n: CAP.typed('RESONATOR', t, 1.0) });
      const f0 = x0 + 34, f1 = x0 + 74, base = y0 + 22, lit = t > tPass(QA) ? 0 : -1;
      let prev = null;
      for (let x = x0 + 6; x < x0 + w - 6; x++) {
        const d0 = 30 / (1 + ((x - f0) / 4) ** 2), d1 = 30 / (1 + ((x - f1) / 4) ** 2), y = Math.round(base + Math.max(d0, d1));
        if (prev != null) PIX.rect(c, x, Math.min(prev, y), 1, Math.abs(prev - y) + 1, Math.abs(x - f0) < 8 && lit === 0 ? 'e2' : 'b2'); prev = y;
      }
      PIX.text(c, '|0⟩', f0 - 5, base + 33, 'w', { shadow: null }); PIX.text(c, '|1⟩', f1 - 5, base + 33, 'w', { shadow: null });
      const px = (f0 + f1) / 2; for (let y = base - 6; y < base + 30; y += 2) PIX.rect(c, px, y, 1, 1, 'o1');
      PIX.text(c, '7 GHz', x0 + w - 4, y0 + 4, 'o2', { align: 'right', shadow: null });
    }
  }
  if (off < 200) {
    CAP.note(c, t, { x: 12, y: 64 + off, text: 'READOUT PULSE', t0: 0.7, t1: 2.3, col: 'o2', box: true });
    const [rx, ry] = K.S(cam, ...room(tapX(QA) + 0.15, (QA.y + FEED) / 2));
    CAP.note(c, t, { ax: rx, ay: ry, x: 12, y: 150 + off, text: 'READOUT RESONATOR', t0: 1.0, t1: 2.3, col: 'b3', box: true });
  }
}
// ---------- the amplifier chain (world y; screen y = y − scroll) ----------
const STAGES = [[872, '15 mK'], [742, '4 K'], [628, '300 K']];
const AMPS = [[818, 'QUANTUM-LIMITED AMP', 3], [700, 'HEMT AMPLIFIER', 6], [588, 'AMPLIFIERS + MIXER', 10]];
const tAmp = ya => { for (let t = 2.4; t < 5.2; t += 1 / 240) if (sigY(t) <= ya) return t; return 5.0; };
function chain(c, t) {
  const sc = scrollAt(t), Y = y => Math.round(y - sc);
  if (Y(YF) < -20 || Y(YD) > H + 40) return;
  for (const [y, lab] of STAGES) { if (Y(y) < -10 || Y(y) > H + 10) continue; PIX.rect(c, 20, Y(y), 230, 2, 'y1'); PIX.rect(c, 20, Y(y), 230, 1, 'y2'); PIX.text(c, lab, 22, Y(y) + 5, 'y3'); }
  // the output line: drawn up from the feedline's exit once the readout starts
  const top = lerp(YF, YD + 40, MO.cubicOut(clamp((t - 0.7) / 0.9)));
  if (top < YF) { PIX.rect(c, XL - 1, Y(top), 3, Math.round(YF - top), 'd6'); PIX.rect(c, XL - 1, Y(top), 1, Math.round(YF - top), 'd8'); }
  // the signal, growing at each amplifier (and picking up a little of each amplifier's noise)
  const ys = sigY(t), show = t > TR1 - 0.1 && t < 5.15;
  let amp = 1.6; for (const [ya, , g] of AMPS) if (ys < ya) amp = g;
  if (show) for (let d = -26; d <= 26; d += 0.5) {
    const y = ys + d, e = Math.exp(-((d / 13) ** 2)), off = amp * e * Math.sin(d * 0.9 - t * 26) + (amp > 3 ? (h(Math.round(y), Math.floor(t * 30)) - 0.5) * amp * 0.25 : 0);
    if (e > 0.1) PIX.rect(c, Math.round(XL + off), Y(y), 1, 1, e > 0.55 ? 'o2' : 'o1');
  }
  for (const [ya, lab] of AMPS) {
    const yy = Y(ya); if (yy < -20 || yy > H + 20) continue;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PIX.P[ys < ya && show ? 'o1' : 'd5']; c.beginPath(); c.moveTo(XL, yy - 10); c.lineTo(XL - 9, yy + 7); c.lineTo(XL + 9, yy + 7); c.closePath(); c.fill(); c.restore();
    PIX.rect(c, XL - 3, yy - 1, 7, 3, 'k');
    const n = CAP.typed(lab, t, tAmp(ya) - 0.25);
    if (n > 0) { const w = PIX.textWidth(lab); PIX.rect(c, XL - 16 - w - 3, yy - 3, w + 5, 11, 'k'); PIX.text(c, lab, XL - 16, yy - 1, 'd9', { align: 'right', n }); }
  }
  // digitizer
  const yd = Y(YD); PIX.rect(c, XL - 40, yd, 80, 40, 'd4'); PIX.rect(c, XL - 39, yd + 1, 78, 38, 'd1'); PIX.text(c, 'DIGITIZER', XL, yd + 16, 'e2', { align: 'center', shadow: null });
  if (t > 4.85 && t < 5.6) FX.glowL(c, XL, yd + 20, 30, ['e0', 'e1', 'e2'], 1 - K.lin(t, 5.0, 5.6), 1.4);
}
// ---------- result panel (world y 0–480): IQ planes, the bits, the record of runs ----------
const IQ = [{ x: 22, lab: 'A' }, { x: 150, lab: 'B' }], IQY = 64, IQS = 98, CL0 = [-0.45, 0.32], CL1 = [0.42, -0.36];
function panel(c, t) {
  const sc = scrollAt(t), Y = y => Math.round(y - sc); if (Y(0) > H) return;
  const N = runsAt(t);
  for (const [qi, P] of IQ.entries()) {
    const y0 = Y(IQY);
    PIX.rect(c, P.x, y0, IQS, IQS, 'd3'); PIX.rect(c, P.x + 1, y0 + 1, IQS - 2, IQS - 2, 'k');
    PIX.rect(c, P.x + 4, y0 + IQS / 2, IQS - 8, 1, 'd3'); PIX.rect(c, P.x + IQS / 2, y0 + 4, 1, IQS - 8, 'd3');
    PIX.text(c, 'I', P.x + IQS - 9, y0 + IQS / 2 + 3, 'd6', { shadow: null }); PIX.text(c, 'Q', P.x + IQS / 2 + 3, y0 + 4, 'd6', { shadow: null });
    PIX.text(c, `QUBIT ${P.lab}`, P.x + 4, y0 + IQS + 4, 'd8');
    for (const [cl, lab] of [[CL0, '0'], [CL1, '1']]) {
      const cx = P.x + IQS / 2 + cl[0] * IQS * 0.5 * 1.6, cy = y0 + IQS / 2 - cl[1] * IQS * 0.5 * 1.6;
      for (let k = 0; k < 40; k++) { const an = k / 40 * U.TAU; PIX.rect(c, Math.round(cx + Math.cos(an) * 17), Math.round(cy + Math.sin(an) * 17), 1, 1, k % 2 ? 'd4' : 'd5'); }
      PIX.text(c, lab, cx + 18, cy - 20, 'e2', { shadow: null });
    }
    for (let k = 0; k < N; k++) {
      const bit = outcome(k)[qi] === '1', cl = bit ? CL1 : CL0;
      const x = P.x + IQS / 2 + cl[0] * IQS * 0.8 + gauss(k * 2 + qi, 31) * 5.5, y = y0 + IQS / 2 - cl[1] * IQS * 0.8 + gauss(k * 2 + qi, 47) * 5.5;
      const fresh = t - runTime(k) < 0.25;
      PIX.rect(c, Math.round(x), Math.round(y), fresh ? 2 : 1, fresh ? 2 : 1, fresh ? 'w' : bit ? 'e1' : 'e2');
    }
  }
  // the latest result in big digits, and the stream of earlier ones
  if (N > 0) {
    const k = N - 1, r = outcome(k), fl = t - runTime(k) < 0.12 && N < 30;
    PIX.text(c, 'RESULT', 22, Y(186), 'd8');
    PIX.text(c, r, 70, Y(180), fl ? 'w' : 'e2', { sc: 3, shadow: null });
    const shown = []; for (let j = Math.max(0, N - 9); j < N - 1; j++) shown.push(outcome(j));
    PIX.text(c, shown.join(' '), 250, Y(186), 'e1', { align: 'right' });
  }
  // histogram of all runs so far
  const HX = [44, 96, 148, 200], HB = 382, HH = 130, labs = ['00', '01', '10', '11'], cnt = [0, 0, 0, 0];
  for (let k = 0; k < N; k++) cnt[labs.indexOf(outcome(k))]++;
  PIX.rect(c, 30, Y(HB) + 1, 210, 1, 'd5');
  for (let j = 0; j < 4; j++) {
    const f = N ? cnt[j] / N : 0, hh = Math.round(HH * f), x = HX[j], err = j === 1 || j === 2;
    if (hh > 0) { PIX.rect(c, x, Y(HB) - hh + 1, 26, hh, err ? 'r1' : 'e1'); PIX.rect(c, x, Y(HB) - hh + 1, 26, 1, err ? 'r2' : 'e2'); PIX.rect(c, x, Y(HB) - hh + 1, 1, hh, err ? 'r2' : 'e2'); }
    PIX.text(c, labs[j], x + 13, Y(HB) + 5, err ? 'r2' : 'w', { align: 'center' });
    if (N) PIX.text(c, `${Math.round(f * 100)}%`, x + 13, Y(HB) + 15, err ? 'r2' : 'e2', { align: 'center' });
  }
  if (N) PIX.text(c, `${N} RUNS`, 240, Y(226), 'd8', { align: 'right' });
}
window.S09.overlay = c => {
  panel(c, 10);
  CAP.note(c, 10, { x: 135, y: 422, text: '≈ HALF 00 · ≈ HALF 11', t0: 7.7, align: 'center', col: 'e2', box: true });
  CAP.note(c, 10, { x: 135, y: 436, text: '01 · 10 = REAL HARDWARE ERRORS', t0: 8.5, align: 'center', col: 'r2', box: true });
};
SC['s09_measure'] = {
  draw(c, t, S) {
    chip(c, t);
    chain(c, t);
    panel(c, t);
    if (t < 0.45) window.shifted(c, S8.overlay, -300 * MO.cubicIn(t / 0.45));
    CAP.note(c, t, { x: 135, y: 422, text: 'EACH RUN: ONE CLASSICAL RESULT', t0: 5.3, t1: 7.5, align: 'center', col: 'e2', box: true });
    CAP.note(c, t, { x: 135, y: 422, text: '≈ HALF 00 · ≈ HALF 11', t0: 7.7, align: 'center', col: 'e2', box: true });
    CAP.note(c, t, { x: 135, y: 436, text: '01 · 10 = REAL HARDWARE ERRORS', t0: 8.5, align: 'center', col: 'r2', box: true });
    CAP.scene(c, t, { title: 'QUANTUM MEASUREMENT', t0: 0.15, acc: 'e2' });
  },
  cues: () => {
    const q = [[0, 'whoosh', 0.6, 0], [0.15, 'type', 0.4], [TR0, 'readout', 0.9, -0.6, TR1 - TR0], [tPass(QA), 'ring', 0.8, -0.1], [tPass(QB), 'ring', 0.8, 0.1], [2.4, 'climb', 0.8, 0.3, 2.6]];
    AMPS.forEach(([ya], i) => q.push([tAmp(ya), 'amp', 0.7, 0.3, i]));
    q.push([TRUN, 'digit', 1.0, 0]);
    for (let k = 1; k < 24; k++) q.push([runTime(k), 'run', 0.5, (h(k, 5) - 0.5) * 0.6, outcome(k)]);
    q.push([runTime(24), 'roll', 0.6, 0, 9.6 - runTime(24)], [5.3, 'type', 0.3], [7.7, 'type', 0.3], [8.5, 'type', 0.3]);
    return q;
  },
};
})();
