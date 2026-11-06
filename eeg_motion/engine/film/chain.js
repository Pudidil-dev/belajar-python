// ============================================================================
// CHAIN — the recording system as one vertical signal path (units = pixels at
// zoom 1), followed top to bottom by the camera:
//   1 the O1 electrode on its gel on the scalp: a small potential reaches its lead
//   2 two leads (O1 and a neighbouring electrode) into one differential channel
//   3 the weak signal (microvolts) riding on mains hum and slow drift
//   4 the differential amplifier: the difference grows tall
//   5 common-mode rejection: the hum present on both inputs mostly cancels
//   6 the filter: very slow and very fast components are attenuated
//   7 sampling: the analog voltage becomes a row of digital samples
// Signals are illustrative, drawn from the same EEG model as the monitor.
// ============================================================================
(() => {
  const TAU = Math.PI * 2;
  const CH = window.CHAIN = {};
  const { EV } = TL;
  const Y = { skin: 620, diff: 1500, weak: 2560, amp: 3560, filt: 4860, adc: 5960 };
  CH.Y = Y;
  const LEADA = [[540, 380], [700, 330], [800, 520], [690, 1040], [640, Y.diff - 120]];   // from the O1 cup down to the channel
  const LEADB = [[180, 1020], [300, 1140], [440, Y.diff - 120]];                          // the neighbouring electrode's lead comes in from the left
  // ---------------------------------------------------------------- small helpers
  const pathOf = pts => D.smooth(pts, false, 0.5);
  // draw a short live trace (a window of a signal function) in a box: f(time) -> value (-1..1), x0..x1, centre y, half-height h
  function wave(c, f, x0, x1, y, h, t, o = {}) {
    const n = Math.max(24, Math.round((x1 - x0) / (o.step || 3))), p = new Path2D(), span = o.span || 1.6;
    for (let i = 0; i <= n; i++) { const u = i / n, v = f(t - (1 - u) * span); const x = x0 + u * (x1 - x0), yy = y - v * h; i ? p.lineTo(x, yy) : p.moveTo(x, yy); }
    if (o.glow) D.stroke(c, p, o.col || COL.cyan, (o.w || 4) * 3.5, 0.22 * (o.a ?? 1));
    D.stroke(c, p, o.col || COL.cyan, o.w || 4, o.a ?? 1);
  }
  CH.wave = wave;
  const eegA = t => SIG.eeg(3, t) / 40, eegB = t => SIG.eeg(2, t) / 40;     // O1 and its neighbour P3 (normalised)
  const diffAB = t => (SIG.eeg(3, t) - SIG.eeg(2, t)) / 34;
  const panel = (c, x, y, w, h) => { D.flat(c, D.rr(x, y, w, h, 34), COL.eblue, D.mix(COL.eblue, COL.deep, 0.45), COL.eblue2, 10, 3); c.fillStyle = COL.panel; c.beginPath(); c.roundRect(x + 18, y + 18, w - 36, h - 36, 22); c.fill(); };
  // ---------------------------------------------------------------- 1 the electrode on the scalp
  function electrode(c, t) {
    // under the skin: skull and the field arriving from below
    c.fillStyle = COL.boneSh; c.fillRect(-600, Y.skin + 150, 2300, 520);
    c.fillStyle = COL.bone; c.fillRect(-600, Y.skin + 150, 2300, 80);
    const s = U.clamp((t - EV.sense + 0.4) / 0.5), pul = 0.6 + 0.4 * Math.sin(TAU * TL.per(t) / TL.BEAT);
    if (s > 0) { const g = c.createRadialGradient(540, Y.skin + 380, 0, 540, Y.skin + 380, 620); g.addColorStop(0, D.rgba(COL.cyan, 0.45 * s * pul)); g.addColorStop(1, D.rgba(COL.cyan, 0)); c.fillStyle = g; c.fillRect(-100, Y.skin - 300, 1300, 1200); }
    c.fillStyle = COL.skinSh; c.fillRect(-600, Y.skin + 40, 2300, 110);
    c.fillStyle = COL.skin; c.fillRect(-600, Y.skin, 2300, 60);
    c.fillStyle = COL.skinHi; c.fillRect(-600, Y.skin, 2300, 10);
    for (let i = 0; i < 22; i++) { const x = -500 + i * 95; if (Math.abs(x - 540) < 260) continue; D.stroke(c, D.smooth([[x, Y.skin + 30], [x + 10, Y.skin - 60], [x + 40, Y.skin - 140 - (i % 3) * 20]], false, 0.5), COL.hair, 9, 0.9); }
    // gel dab and the cup
    D.fill(c, D.ellipse(540, Y.skin - 6, 250, 70), COL.gel, 0.75);
    D.fill(c, D.ellipse(520, Y.skin - 20, 150, 26), '#FFFFFF', 0.35);
    const cup = D.smooth([[340, Y.skin - 40], [360, Y.skin - 150], [540, Y.skin - 230], [720, Y.skin - 150], [740, Y.skin - 40]], true, 0.6);
    D.flat(c, cup, COL.silver, COL.silverSh, '#FFFFFF', 22, 8);
    D.fill(c, D.ellipse(540, Y.skin - 44, 180, 14), COL.silverDk, 0.8);
    D.fill(c, D.circle(540, Y.skin - 200, 26), COL.silverDk);
    // the lead and the tiny waveform riding up it once the potential is sensed
    D.stroke(c, pathOf(LEADA), COL.silverDk, 16); D.stroke(c, pathOf(LEADA), COL.silverSh, 8);
    const w = U.clamp((t - EV.wave) / 0.4);
    if (w > 0) { const u = ((t - EV.wave) * 0.6) % 1, pts = LEADA.slice(0, 3); for (let k = 0; k < 3; k++) { const p = CORTEX.along(pts, (u + k * 0.33) % 1); D.spark(c, p[0], p[1], 9, COL.cyan, w * 0.9); } wave(c, eegA, 600, 900, 300, 26, t, { w: 3.5, glow: 1, a: w, span: 1.2 }); }
  }
  // ---------------------------------------------------------------- 2 two inputs into one differential channel
  function channel(c, t) {
    const k2 = U.clamp((t - EV.twoInputs) / 0.4), sub = U.clamp((t - EV.subtract) / 0.4);
    D.stroke(c, pathOf(LEADB), COL.silverDk, 16 * k2 || 0.01, k2); D.stroke(c, pathOf(LEADB), COL.silverSh, 8, k2);
    if (k2 > 0) { c.save(); c.globalAlpha = k2; D.flat(c, D.circle(180, 1010, 48 * MO.backOut(k2, 1.6)), COL.silver, COL.silverSh, '#FFFFFF', 10, 4); c.restore(); }   // the neighbouring electrode
    // input traces beside each lead
    wave(c, eegA, 720, 980, 1150, 34, t, { w: 4, glow: 1, col: COL.cyan, span: 1.4 });
    if (k2 > 0) wave(c, eegB, 100, 360, 1250, 34, t, { w: 4, glow: 1, col: COL.green, a: k2, span: 1.4 });
    // the channel node: a ring with a minus bar, inputs A (cyan) and B (green)
    const nx = 540, ny = Y.diff, R = 78;
    D.flat(c, D.circle(nx, ny, R), COL.eblue2, COL.eblue, COL.eblue3, 10, 4);
    D.stroke(c, D.circle(nx, ny, R - 8), COL.tealHi, 5, 0.9);
    D.stroke(c, D.smooth([[nx - 30, ny], [nx + 30, ny]], false), COL.white, 10);
    D.fill(c, D.circle(nx + 52, ny - 52, 14), COL.cyan); D.fill(c, D.circle(nx - 52, ny - 52, 14), COL.green, Math.max(0.3, k2));
    D.stroke(c, pathOf([[nx, ny + R], [nx, ny + 260]]), COL.silverSh, 8);
    if (sub > 0) { D.glow(c, nx, ny, 160, COL.cyan, 0.6 * sub * Math.max(0, 1 - (t - EV.subtract) / 1.2)); wave(c, diffAB, 380, 700, ny + 340, 44, t, { w: 5, glow: 1, a: sub, span: 1.5 }); }
  }
  // ---------------------------------------------------------------- 3 the weak signal with interference (magnified)
  function weak(c, t) {
    const y = Y.weak, k = U.clamp((t - EV.weak) / 0.4), hum = U.clamp((t - EV.hum) / 0.4), dr = U.clamp((t - EV.drift) / 0.4);
    D.stroke(c, pathOf([[540, Y.diff + 260], [540, y - 300]]), COL.silverSh, 8);
    // the tiny signal on the wire
    wave(c, diffAB, 470, 610, y - 330, 6, t, { w: 2.5, span: 0.6 });
    // a magnifier over it
    D.stroke(c, pathOf([[610, y - 330], [700, y - 250]]), COL.silver, 4, 0.8);
    panel(c, 120, y - 220, 840, 470);
    const f = tt => 0.9 * diffAB(tt) + 0.55 * hum * SIG.hum(tt) + 1.2 * dr * SIG.drift(tt);
    wave(c, f, 170, 910, y + 20, 70, t, { w: 5, glow: 1, a: k, span: 0.9, step: 2 });
    // the components, small, underneath: EEG, hum, drift
    if (hum > 0) wave(c, SIG.hum, 170, 420, y + 190, 16, t, { w: 3, col: COL.amber, a: hum, span: 0.12 });
    if (dr > 0) wave(c, SIG.drift, 660, 910, y + 190, 16, t, { w: 3, col: COL.sub, a: dr, span: 6 });
  }
  // ---------------------------------------------------------------- 4/5 the differential amplifier and common-mode rejection
  function amplifier(c, t) {
    const y = Y.amp, g = MO.backOut(U.clamp((t - EV.gain) / 0.5), 1.3), cm = U.clamp((t - EV.cmrr) / 0.4), cancel = U.clamp((t - EV.cancel) / 0.6);
    D.stroke(c, pathOf([[540, Y.weak + 250], [540, y - 420]]), COL.silverSh, 8);
    // two inputs (A cyan, B green) entering the top of the triangle
    D.stroke(c, pathOf([[300, y - 420], [300, y - 250], [420, y - 200]]), COL.silverSh, 8);
    D.stroke(c, pathOf([[780, y - 420], [780, y - 250], [660, y - 200]]), COL.silverSh, 8);
    D.stroke(c, pathOf([[540, y - 420], [300, y - 420]]), COL.silverSh, 8, 0.6); D.stroke(c, pathOf([[540, y - 420], [780, y - 420]]), COL.silverSh, 8, 0.6);
    // shared hum on both inputs (common mode) once it is shown
    const inA = tt => eegA(tt) * 0.5 + 0.9 * cm * SIG.hum(tt), inB = tt => eegB(tt) * 0.5 + 0.9 * cm * SIG.hum(tt);
    wave(c, inA, 100, 280, y - 330, 30, t, { w: 3.5, col: COL.cyan, glow: 1, span: 0.5 });
    wave(c, inB, 800, 980, y - 330, 30, t, { w: 3.5, col: COL.green, glow: 1, span: 0.5 });
    if (cm > 0) { D.glow(c, 190, y - 330, 120, COL.amber, 0.45 * cm * (1 - 0.6 * cancel)); D.glow(c, 890, y - 330, 120, COL.amber, 0.45 * cm * (1 - 0.6 * cancel)); }
    // the triangle (pointing down: the signal flows downward)
    const tri = D.smooth([[300, y - 220], [780, y - 220], [540, y + 200]], true, 0.08);
    D.flat(c, tri, COL.eblue2, COL.eblue, COL.eblue3, 16, 5);
    D.stroke(c, D.smooth([[340, y - 196], [740, y - 196], [540, y + 152]], true, 0.08), COL.tealHi, 5, 0.85);
    D.stroke(c, D.smooth([[440, y - 150], [480, y - 150]], false), COL.white, 8); D.stroke(c, D.smooth([[600, y - 150], [640, y - 150]], false), COL.white, 8); D.stroke(c, D.smooth([[620, y - 170], [620, y - 130]], false), COL.white, 8);
    D.glow(c, 540, y, 220, COL.cyan, 0.35 * Math.max(0, 1 - Math.abs(t - EV.gain - 0.2) / 0.8));
    // the output: tall; after the cancel the hum is mostly gone (a small residue stays)
    D.stroke(c, pathOf([[540, y + 200], [540, y + 300]]), COL.silverSh, 8);
    const out = tt => diffAB(tt) * (0.35 + 1.25 * g) + 0.9 * cm * (1 - 0.88 * cancel) * SIG.hum(tt) * (0.35 + 1.25 * g) * 0.35;
    wave(c, out, 140, 940, y + 470, 90, t, { w: 6, glow: 1, span: 1.1, step: 2 });
  }
  // ---------------------------------------------------------------- 6 the filter (a spectrum with a band-pass window)
  function filter(c, t) {
    const y = Y.filt, trim = U.clamp((t - EV.trim) / 0.5), pass = U.clamp((t - EV.pass) / 0.4);
    D.stroke(c, pathOf([[540, Y.amp + 600], [540, y - 360]]), COL.silverSh, 8);
    panel(c, 110, y - 340, 860, 560);
    // bars: slow drift (left), EEG band (middle), fast noise (right); bars outside the band shrink
    const NB = 22;
    for (let i = 0; i < NB; i++) {
      const fx = i / (NB - 1), x = 180 + fx * 720, inBand = fx > 0.18 && fx < 0.7, base = inBand ? 0.55 + 0.35 * Math.sin(i * 1.7) ** 2 : 0.45 + 0.3 * U.hash(i, 3);
      const h = 300 * base * (inBand ? 1 : 1 - 0.8 * trim) * (0.92 + 0.08 * Math.sin(TL.per(t) * 9 + i));
      const col = inBand ? COL.cyan : fx <= 0.18 ? COL.sub : COL.amber;
      D.fill(c, D.rr(x - 11, y + 150 - h, 22, h, 8), col, inBand ? 0.95 : 0.85);
    }
    // the band-pass window (a soft plateau curve) sweeping in
    const win = new Path2D();
    for (let i = 0; i <= 80; i++) { const fx = i / 80, x = 180 + fx * 720, v = 1 / (1 + Math.pow((0.08 / Math.max(fx, 0.001)), 6)) / (1 + Math.pow(fx / 0.72, 10)); const yy = y + 150 - 330 * v * Math.min(1, trim * 1.6 + 0.0001); i ? win.lineTo(x, yy) : win.moveTo(x, yy); }
    if (trim > 0) { D.stroke(c, win, COL.white, 5, 0.9 * Math.min(1, trim * 2)); }
    D.fill(c, D.rr(170, y + 162, 740, 6, 3), COL.sub, 0.6);
    // the filtered output below
    D.stroke(c, pathOf([[540, y + 220], [540, y + 340]]), COL.silverSh, 8);
    const clean = tt => diffAB(tt) * 1.5 + 0.12 * (1 - pass) * SIG.hum(tt);
    wave(c, clean, 160, 920, y + 470, 80, t, { w: 6, glow: 1, span: 1.1, step: 2 });
  }
  // ---------------------------------------------------------------- 7 sampling: analog -> digital
  function adc(c, t) {
    const y = Y.adc, dig = U.clamp((t - EV.digital) / 0.45);
    D.stroke(c, pathOf([[540, Y.filt + 560], [540, y - 330]]), COL.silverSh, 8);
    panel(c, 90, y - 320, 900, 640);
    // a frozen window of the analog voltage (sampled at the clock ticks)
    const T0 = EV.adc, x0 = 160, x1 = 920, f = u => (SIG.eeg(3, T0 - 1.1 + u * 1.1) - SIG.eeg(2, T0 - 1.1 + u * 1.1)) / 34 * 1.5;
    const p = new Path2D(); for (let i = 0; i <= 160; i++) { const u = i / 160, x = x0 + u * (x1 - x0), yy = y - f(u) * 150; i ? p.lineTo(x, yy) : p.moveTo(x, yy); }
    D.stroke(c, p, COL.cyan, 14, 0.18 * (1 - 0.6 * dig)); D.stroke(c, p, COL.cyan, 5, 1 - 0.65 * dig);
    // the clock: one tick per sample; samples appear on the beat-synced ticks (8 shown fast, then the rest fill in)
    const NS = 40, base = y + 250;
    D.fill(c, D.rr(x0, base - 3, x1 - x0, 6, 3), COL.sub, 0.55);
    const shown = (() => { let n = 0; for (let k = 0; k < EV.samples.length; k++) if (t >= EV.samples[k]) n = k + 1; const fill = U.clamp((t - EV.samples[EV.samples.length - 1]) / 0.35); return n < EV.samples.length ? n * 5 : Math.round(EV.samples.length * 5 + fill * (NS - EV.samples.length * 5)); })();
    for (let k = 0; k < NS; k++) {
      const u = (k + 0.5) / NS, x = x0 + u * (x1 - x0), v = f(u), yy = y - v * 150, on = k < shown, q = Math.round(v * 6) / 6, yq = y - q * 150;
      D.fill(c, D.rr(x - 2, base - 18, 4, 18, 2), on ? COL.white : COL.sub, on ? 0.9 : 0.4);
      if (!on) continue;
      D.line(c, [[x, base - 18], [x, U.lerp(yy, yq, dig)]], COL.white, 2, 0.35 * (1 - dig));
      const fresh = EV.samples.some(ts => t - ts >= 0 && t - ts < 0.14 && k >= (EV.samples.indexOf(ts)) * 5 && k < (EV.samples.indexOf(ts) + 1) * 5);
      D.fill(c, D.circle(x, U.lerp(yy, yq, dig), 9), dig > 0.5 ? COL.green : COL.white);
      if (fresh) D.glow(c, x, yy, 40, COL.cyan, 1);
    }
    // the digital representation: quantised steps between the samples
    if (dig > 0) { const st = new Path2D(); for (let k = 0; k < NS; k++) { const u0 = k / NS, u1 = (k + 1) / NS, q = Math.round(f((k + 0.5) / NS) * 6) / 6, yq = y - q * 150; if (k === 0) st.moveTo(x0, yq); else st.lineTo(x0 + u0 * (x1 - x0), yq); st.lineTo(x0 + u1 * (x1 - x0), yq); } D.stroke(c, st, COL.green, 4, dig); }
  }
  CH.draw = (c, cam, t) => {
    c.fillStyle = COL.bg; c.fillRect(0, 0, STAGE.W, STAGE.H);
    CAM.layer(c, cam, 0.8, c2 => {
      c2.strokeStyle = D.mix(COL.teal, COL.bg, 0.72); c2.lineWidth = 6; c2.lineJoin = 'round';
      for (let i = 0; i < 26; i++) { const x = -120 + (i % 2 ? 1240 : -60) + (U.hash(i, 31) - 0.5) * 120, y = -400 + i * 290; c2.beginPath(); c2.moveTo(x, y); c2.lineTo(x + (i % 2 ? -1 : 1) * 140, y); c2.lineTo(x + (i % 2 ? -1 : 1) * 140, y + 160); c2.lineTo(x + (i % 2 ? -1 : 1) * 260, y + 160); c2.stroke(); c2.fillStyle = D.mix(COL.teal, COL.bg, 0.6); c2.beginPath(); c2.arc(x + (i % 2 ? -1 : 1) * 260, y + 160, 12, 0, TAU); c2.fill(); }
    });
    CAM.layer(c, cam, 0.55, c2 => { for (let i = 0; i < 60; i++) { const x = -200 + U.hash(i, 21) * 1480 + 20 * D.wob(t, 1, i), y = -600 + U.hash(i, 22) * 7400 + 30 * D.wob(t, 2, i); c2.fillStyle = D.rgba(i % 3 ? COL.tealHi : COL.lavHi, 0.1); c2.beginPath(); c2.arc(x, y, 4 + (i % 4) * 3, 0, TAU); c2.fill(); } });
    CAM.with(c, cam, c2 => {
      const [, wy0] = CAM.toWorld(cam, 0, 0), [, wy1] = CAM.toWorld(cam, 0, STAGE.H), vis = (a, b) => b > wy0 - 200 && a < wy1 + 200;
      if (vis(-200, Y.skin + 700)) electrode(c2, t);
      if (vis(900, Y.diff + 600)) channel(c2, t);
      if (vis(Y.weak - 600, Y.weak + 300)) weak(c2, t);
      if (vis(Y.amp - 450, Y.amp + 600)) amplifier(c2, t);
      if (vis(Y.filt - 380, Y.filt + 600)) filter(c2, t);
      if (vis(Y.adc - 350, Y.adc + 340)) adc(c2, t);
    });
  };
})();
