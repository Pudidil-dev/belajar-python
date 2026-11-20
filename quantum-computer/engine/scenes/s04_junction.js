// S04 QUANTUM TUNNELING (30–44 s): the Josephson junction. Riding the paired electrons down the aluminium, the camera
// pulls back and arrives at a 1.4 nm layer of amorphous aluminium oxide between two aluminium electrodes. A Cooper-pair
// wave packet comes down to it (computed: JN, split-step Schrödinger solution). Classically it could not cross; the
// wave's amplitude decays inside the barrier but is not zero at the far side, so about 30 % of the probability comes
// out below — no particle smashing through a wall. Pulling back, each electrode is one condensate with its own phase;
// pairs tunnelling back and forth make the junction's current I = Ic sin φ and its energy U = −EJ cos φ, a cosine
// instead of an ordinary inductor's parabola: the junction is a nonlinear inductor.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, h = U.hash, io = MO.sineInOut;
const S3 = window.S03, END3 = 13, C3 = S3.nanoCam(END3), CL = S3.nanoCam(S3.T_LAT);
const ZJ = 4 / NANO.A, ZP = 3 / NANO.A;                                    // ion spacing 4 px at the barrier, 3 px pulled back
const BY0 = C3.y + 12, BY1 = BY0 + JN.D / ZJ, BYM = (BY0 + BY1) / 2;    // the barrier: 15 px = 1.5 nm of AlOx
const YB = 250, YB2 = 166, TS = 3.3, TP = 8.8;
// camera: keep the barrier on a screen point that moves smoothly while the zoom changes
const onBarrier = (sy, z) => ({ x: C3.x, y: BYM - (sy - H / 2) / z, z });
const camAt = t => {
  if (t < 3.0) { const z = K.zl(C3.z, ZJ, MO.smooth(clamp(t / 2.7))), s0 = H / 2 + (BYM - C3.y) * C3.z; return onBarrier(lerp(s0, YB, io(t / 3.0)), z); }
  if (t < TP) return onBarrier(YB, ZJ);
  const p = io(clamp((t - TP) / 1.0)); return onBarrier(lerp(YB, YB2, p), K.zl(ZJ, ZP, p));
};
// the barrier's screen y when the camera is at onBarrier(sy, z) is exactly sy; at t = 0 the camera equals S03's last
// camera because s0 puts the barrier where it already was.
const phiAt = t => t < 9.6 ? 0 : lerp(0.35, 2.45, MO.smooth(clamp((t - 9.8) / 3.4))) * Math.sin(Math.PI * (t - 9.6));
window.S04 = { camAt, BY0, BY1, BYM, YB2, ZP, phiAt };

// ---------- the wave packet (lighten-only dither on the purple ramp) ----------
const RAMP = ['p0', 'p1', 'p2', 'p3'].map(K.rgb), LUMS = RAMP.map(q => q[0] * 0.3 + q[1] * 0.59 + q[2] * 0.11);
function wave(c, t, a) {
  if (a <= 0) return;
  const st = JN.at(t - TS), img = K.pbegin(c), d = img.data;
  // brightness = amplitude |ψ|; bright bands = wave crests (Re ψ), which slide at half the packet's speed
  for (let y = 0; y < H; y++) {
    const [re, im] = JN.sample(st, y - YB), p2 = re * re + im * im; if (p2 < 1e-9) continue;
    const A = Math.sqrt(p2 / JN.peak), m = Math.pow(0.5 + 0.5 * re / Math.sqrt(p2), 3);
    for (let x = 0; x < W; x++) {
      const e = Math.exp(-Math.pow((x - 110) / 94, 8)); if (e < 0.02) continue;
      const L = a * e * (0.8 * Math.min(1, A * 1.3) + 3.0 * Math.min(1.15, A) * m);
      const k = Math.min(3, Math.floor(L + K.BAY(x, y)) - 1); if (k < 0) continue;
      const i = (y * W + x) * 4; if (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 >= LUMS[k]) continue;
      d[i] = RAMP[k][0]; d[i + 1] = RAMP[k][1]; d[i + 2] = RAMP[k][2];
    }
  }
  K.pend(c, img);
}
function gauge(c, x, y, label, p, col, a) {
  if (a <= 0) return;
  PIX.rect(c, x - 2, y - 2, 56, 30, 'k'); PIX.text(c, label, x, y, 'd8', { n: Math.round(label.length * a) });
  PIX.rect(c, x, y + 10, 50, 5, 'd2'); PIX.rect(c, x, y + 10, Math.round(50 * clamp(p)), 5, col); PIX.rect(c, x, y + 10, Math.round(50 * clamp(p)), 1, 'w');
  PIX.text(c, `${Math.round(p * 100)}%`, x + 50, y + 18, 'w', { align: 'right' });
}
// ---------- the junction's energy against an ordinary inductor's ----------
const PL = { x0: 22, x1: 248, yT: 312, yB: 446, card: [12, 292, 246, 168] };
const px = phi => lerp(PL.x0, PL.x1, (phi + Math.PI) / (2 * Math.PI)), py = u => lerp(PL.yB, PL.yT, (u + 1) / 2);
function plot(c, t, o) {
  const g = MO.cubicOut(clamp((t - o.t0) / 0.35)); if (g <= 0) return;
  const [cx, cy, cw, ch] = PL.card, hh = Math.round(ch * g);
  PIX.rect(c, cx, cy + (ch - hh) / 2, cw, hh, 'd3'); PIX.rect(c, cx + 1, cy + (ch - hh) / 2 + 1, cw - 2, hh - 2, 'k');
  if (g < 1) return;
  const dr = clamp((t - o.t0 - 0.35) / 0.6);                       // curves draw on left → right
  PIX.rect(c, PL.x0, py(-1), PL.x1 - PL.x0, 1, 'd3'); PIX.rect(c, Math.round(px(0)), PL.yT - 4, 1, PL.yB - PL.yT + 6, 'd3');
  const xe = lerp(PL.x0, PL.x1, dr);
  let prev = null;
  for (let x = PL.x0; x <= xe; x++) {
    const phi = lerp(-Math.PI, Math.PI, (x - PL.x0) / (PL.x1 - PL.x0)), yl = py(JN.Ul(phi)), yc = py(JN.U(phi));
    if (yl >= PL.yT - 6 && x % 4 < 2) PIX.rect(c, x, Math.round(yl), 1, 1, 'd6');
    if (prev != null) PIX.rect(c, x, Math.round(Math.min(prev, yc)), 1, Math.max(2, Math.round(Math.abs(prev - yc)) + 1), 'y3');
    prev = yc;
  }
  if (o.levels) o.levels(c, t);
  const nl = (s, x, y, col, t0, al) => { const n = CAP.typed(s, t, t0); if (n > 0) PIX.text(c, s, x, y, col, { n, align: al }); };
  nl('U(φ)', PL.x0, PL.yT - 14, 'd8', o.t0 + 0.5);
  nl('φ', PL.x1 + 3, py(-1) - 4, 'd8', o.t0 + 0.6);
  nl('JUNCTION  U = −EJ cos φ', cx + 6, cy + ch - 12, 'y3', o.t0 + 0.9);
  if (o.inductor !== false) nl('INDUCTOR  U ∝ φ²', cx + cw - 6, PL.yT - 14, 'd7', o.t0 + 1.4, 'right');
  if (o.marker) {
    const phi = o.marker, x = px(phi), y = py(JN.U(phi));
    FX.glowL(c, x, y, 7, ['p1', 'p2', 'p3'], 0.9, 1.4); PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 3, 3, 'w');
  }
}
window.S04.plot = plot; window.S04.PL = PL; window.S04.px = px; window.S04.py = py;
// ---------- world ----------
function world(c, t, cam) {                                       // t = S04 time; ions keep S03's clock
  const t3 = END3 + t;
  PIX.rect(c, 0, 0, W, H, 'k');
  NANO.lattice(c, cam, { t: t3, amp: 0.012, y1: BY0 - 0.12 });
  NANO.lattice(c, cam, { t: t3, amp: 0.012, y0: BY1 + 0.12, oy: BY1 + 0.25 });
  NANO.oxide(c, cam, BY0, BY1, { t: t3 });
}
const electrons = (c, t, cam, o) => S3.electrons(c, END3 + t, cam, Object.assign({ hide: [BY0 - 0.3, BY1 + 0.3], mid: BYM }, o));
window.S04.world = world; window.S04.electrons = electrons;
SC['s04_junction'] = {
  init: () => JN.init(),
  draw(c, t, S) {
    const cam = camAt(t);
    world(c, t, cam);
    const ea = t < TS ? 1 - K.sm(t, 2.9, TS) : K.sm(t, TP + 0.3, TP + 1.0) * 0.55;
    if (ea > 0) electrons(c, t, cam, { a: ea, phi: phiAt(t), every: t > TP ? 3 : 1, links: t < TS });
    if (t > TS - 0.05 && t < TP + 0.4) wave(c, t, MO.smooth(K.lin(t, TS, TS + 0.5)) * (1 - K.sm(t, TP - 0.3, TP + 0.3)));
    const [, yb0] = NANO.S(cam, 0, BY0), [, yb1] = NANO.S(cam, 0, BY1);
    // barrier dimensions
    if (t > 2.8) {
      const a = K.lin(t, 2.8, 3.1), x = 206;
      PIX.rect(c, x, Math.round(yb0), 1, Math.round(yb1 - yb0), 'd8'); PIX.rect(c, x - 2, Math.round(yb0), 5, 1, 'd8'); PIX.rect(c, x - 2, Math.round(yb1) - 1, 5, 1, 'd8');
      const n1 = CAP.typed('AlOx', t, 2.9), n2 = CAP.typed('1.5 nm', t, 3.0);
      PIX.rect(c, x + 4, Math.round((yb0 + yb1) / 2) - 9, 42, 21, 'k', a);
      if (n1) PIX.text(c, 'AlOx', x + 6, (yb0 + yb1) / 2 - 8, 'd9', { n: n1 }); if (n2) PIX.text(c, '1.5 nm', x + 6, (yb0 + yb1) / 2 + 3, 'd8', { n: n2 });
      if (t < TP + 0.5) { PIX.text(c, 'Al', 214, yb0 - 34, 'b3', { n: CAP.typed('Al', t, 3.1) }); PIX.text(c, 'Al', 214, yb1 + 26, 'b3', { n: CAP.typed('Al', t, 3.15) }); }
    }
    // probabilities from the solution
    if (t > 6.15 && t < TP + 0.2) {
      const st = JN.at(t - TS), a = K.lin(t, 6.15, 6.5) * (1 - K.lin(t, TP - 0.2, TP + 0.2));
      gauge(c, 210, 108, 'REFLECTED', st.R, 'p2', a); gauge(c, 210, 352, 'TUNNELED', st.T, 'p3', a);
    }
    if (t > TP) {
      // phases, current, energy
      const phi = phiAt(t), I = Math.sin(phi), L = Math.round(26 * Math.abs(I) * K.lin(t, 9.6, 9.9)), xm = 188, ym = (yb0 + yb1) / 2;
      if (L > 2) { const s = I > 0 ? 1 : -1; PIX.rect(c, xm, Math.round(ym - s * L / 2), 1, L, 'c2'); PIX.rect(c, xm - 1, Math.round(ym - s * L / 2), 3, 1, 'c3'); PIX.text(c, s > 0 ? '↓' : '↑', xm - 2, s > 0 ? ym + L / 2 - 6 : ym - L / 2, 'c2', { shadow: null }); }
      const n = CAP.typed('I = Ic sin φ', t, 10.0);
      if (n > 0) { PIX.rect(c, 150, ym + 16, 70, 11, 'k'); PIX.text(c, 'I = Ic sin φ', 152, ym + 18, 'c3', { n }); }
      CAP.note(c, t, { x: 12, y: Math.round(yb0) - 22, text: 'PHASE φ₁', t0: 9.7, col: 'p3', box: true });
      CAP.note(c, t, { x: 12, y: Math.round(yb1) + 13, text: 'PHASE φ₂', t0: 9.85, col: 'p3', box: true });
      plot(c, t, { t0: 9.4, marker: t > 9.6 ? phi : null });
      if (t > 12.3) CAP.note(c, t, { x: 135, y: 276, text: 'NONLINEAR INDUCTOR', t0: 12.35, align: 'center', col: 'w', box: true });
      const nf = CAP.typed('φ = φ₁ − φ₂', t, 10.3); if (nf > 0) { PIX.rect(c, 12, Math.round(ym) - 4, 60, 11, 'k'); PIX.text(c, 'φ = φ₁ − φ₂', 14, Math.round(ym) - 2, 'w', { n: nf }); }
    }
    // notes
    if (t > 2.3 && t < 3.9) CAP.note(c, t, { x: 12, y: Math.round(yb1) + 12, text: 'JOSEPHSON JUNCTION', t0: 2.4, t1: 3.6, col: 'w', box: true });
    if (t > TS + 0.3 && t < 6.0) CAP.note(c, t, { x: 12, y: 70, text: 'PAIR WAVEFUNCTION ψ', t0: TS + 0.4, t1: 5.7, col: 'p3', box: true });
    if (t > 6.2 && t < 8.3) CAP.note(c, t, { x: 12, y: 70, text: 'AMPLITUDE LEAKS THROUGH', t0: 6.3, t1: 8.0, col: 'p3', box: true });
    CAP.scene(c, t, { title: 'QUANTUM TUNNELING', t0: 0.2, acc: 'p2' });
  },
  cues: () => {
    const q = [[0, 'glide', 0.8, 0, 3.0], [0.2, 'type', 0.4], [2.6, 'barrier', 0.8, 0], [2.4, 'type', 0.3], [TS, 'wave', 0.7, -0.2, 2.9], [TS + 0.4, 'type', 0.3]];
    q.push([TS + 2.9, 'tunnel', 0.9, 0], [6.3, 'type', 0.3], [7.3, 'pct', 0.6, 0.4], [TP, 'pull', 0.7, 0, 1.0], [9.4, 'card', 0.6, 0]);
    for (let k = 0; k < 4; k++) q.push([10.1 + k, 'osc', 0.55 + 0.1 * k, k % 2 ? 0.3 : -0.3, k]);
    q.push([12.35, 'type', 0.4], [12.4, 'shimmer', 0.6, 0]);
    return q;
  },
};
})();
