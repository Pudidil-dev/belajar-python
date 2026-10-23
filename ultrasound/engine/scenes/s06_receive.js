// S06 (31–39 s) — the same crystals listen. Seen from further back than in S03 (the crystals near the top, the tissue
// below), echoes from the column arrive one after another in depth order, the strongest from the skull; each squeezes
// the crystals and the squeeze makes a voltage that runs up the wires: pressure → deformation → voltage, the
// piezoelectric effect in reverse. A cycle bar shows the rhythm: SEND for about a microsecond, then LISTEN for the
// ~156 µs the echoes from 12 cm take, then the next pulse. Then up the wires to the receiver: the echoes arrive as
// voltage bursts, early and late, weak and strong (the trace is the model's echo signal along the same scan line).
(() => {
const S = SC.s06_receive = {}, M = PROBE.M, LINE = 28;
const ARR = SC.s05_echoes.BOUNDS.slice(0, 9).map(b => ({ d: b.d, A: b.A, lt: 0.66 + b.d * 0.34 }));   // skull lands on 2.5 s
S.ARR = ARR;
const vis = A => Math.min(1, Math.sqrt(A / 0.55));
const L_END = 0.66 + 12 * 0.34;                                     // the listening window ends (12 cm) → next pulse
S.state = t => {
  const st = { waves: [], recv: [], gel: 1, fires: [{ t0: 31 + L_END, e0: -3, e1: 3 }] };
  for (const a of ARR) {
    const ta = 31 + a.lt, amp = vis(a.A);
    if (amp < 0.1) continue;
    st.waves.push({ y0: 2400, t0: ta - (2400 - M.GND) / M.V, dir: -1, amp, x0: M.ex(-3) - 18, x1: M.ex(3) + 18, col: 'echo', yEnd: M.GND });
    st.recv.push({ t0: ta, amp, e0: -3, e1: 3 });
  }
  return st;
};
S.mcam = lt => ({ x: M.CX, y: lt < 4.2 ? 420 : U.lerp(420, 60, MO.cubicIn(U.clamp((lt - 4.2) / 0.55))), z: 0.8 });
// the pulse–echo cycle: SEND (~1 µs) then LISTEN (~156 µs), a cursor running along it; SEND lights again at the end
S.cycle = (c, lt, a = 1) => {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  const x0 = 128, y0 = 46, w = 104;
  PIX.rect(c, x0 - 2, y0 - 2, w + 4, 36, 'g4'); PIX.rect(c, x0 - 1, y0 - 1, w + 2, 34, 'k');
  const q = U.clamp((lt + 0.15) / (L_END + 0.15)), send = lt < 0.12 || (lt >= L_END && lt < L_END + 0.2);
  const blink = ARR.some(r => lt >= r.lt && lt < r.lt + 0.12 && vis(r.A) > 0.25);
  PIX.text(c, 'SEND', x0 + 3, y0 + 2, send ? 'c4' : 'g5', { shadow: null });
  PIX.text(c, 'LISTEN', x0 + 34, y0 + 2, send ? 'g5' : blink ? 'w' : 'y4', { shadow: null });
  PIX.rect(c, x0 + 3, y0 + 13, 4, 5, send ? 'c3' : 'c1');                                   // send: a sliver
  PIX.rect(c, x0 + 9, y0 + 13, w - 12, 5, 'y1');                                            // listen: the long part
  if (!send) PIX.rect(c, x0 + 9, y0 + 13, Math.round((w - 12) * q), 5, 'y3');
  PIX.text(c, '1 µs', x0 + 3, y0 + 22, 'g7', { shadow: null }); PIX.text(c, '156 µs', x0 + w - 3, y0 + 22, 'g7', { shadow: null, align: 'right' });
  c.restore();
};
// the receiver: echo voltage against time, time running down the screen (0 → 156 µs for 12 cm)
const PX = { x0: 20, x1: 232, y0: 96, y1: 376, ty0: 108, ty1: 362, cx: 104 };
S.PX = PX;
S.yOfUs = us => PX.ty0 + (PX.ty1 - PX.ty0) * us / 156;
let LI = null;
S.line = () => LI || (LI = US.lineInfo(LINE, 35));
S.ampAtUs = us => { const A = S.line().A, j = Math.min(US.NS - 1, Math.floor(us / 13 / US.DR)); return Math.max(A[Math.max(0, j - 1)], A[j], A[Math.min(US.NS - 1, j + 1)]); };
S.drawScope = (c, lt, cursorUs, dy = 0) => {
  const A = S.line().A, amax = Math.max(...A);
  c.save(); c.translate(0, dy);
  PIX.rect(c, PX.x0, PX.y0 + dy, PX.x1 - PX.x0, PX.y1 - PX.y0, 'g3'); PIX.rect(c, PX.x0 + 1, PX.y0 + 1 + dy, PX.x1 - PX.x0 - 2, PX.y1 - PX.y0 - 2, 'k');
  for (let us = 0; us <= 156; us += 13) PIX.rect(c, PX.x0 + 4, Math.round(S.yOfUs(us)) + dy, PX.x1 - PX.x0 - 8, 1, 'n1');
  PIX.rect(c, PX.cx, PX.ty0 + dy, 1, PX.ty1 - PX.ty0, 'g2');
  PIX.rect(c, PX.cx, 0, 1, Math.max(0, PX.ty0 + dy), 'c1');                                 // the wire from the probe
  // the trace down to the cursor: an RF-like wiggle under each echo's envelope (amplified, gamma 0.8)
  const yC = S.yOfUs(cursorUs);
  let prev = null;
  for (let y = PX.ty0; y < Math.min(PX.ty1, yC); y++) {
    const us = (y - PX.ty0) / (PX.ty1 - PX.ty0) * 156, e = Math.pow(S.ampAtUs(us) / amax, 0.8);
    const x = Math.round(PX.cx + 56 * e * Math.sin(y * 1.9));
    if (prev != null) PIX.rect(c, Math.min(prev, x), y + dy, Math.abs(prev - x) + 1, 1, e > 0.6 ? 'c4' : 'c3');
    prev = x;
  }
  if (cursorUs > 0 && cursorUs < 156) {
    PIX.rect(c, PX.x0 + 4, Math.round(yC) + dy, PX.x1 - PX.x0 - 8, 1, 'c1'); PIX.rect(c, PX.cx - 3, Math.round(yC) + dy, 7, 1, 'c4');
    // the signal arriving down the wire: a packet for every strong burst just ahead of the cursor
    const e = Math.pow(S.ampAtUs(cursorUs) / amax, 0.8);
    if (e > 0.12) PIX.rect(c, PX.cx - 1, Math.round(yC) - 14 + dy, 3, 12, e > 0.5 ? 'c5' : 'c3');
  }
  c.restore();
};
S.CUR = lt => U.clamp((lt - 4.75) / 3.15) * 156;
const yb = d => Math.round(S.yOfUs(13 * d)), tAt = d => 4.75 + 13 * d / 156 * 3.15;
S.notes = (c, lt, t1) => {
  CAP.note(c, lt, { ax: PX.cx + 14, ay: yb(1.0), x: 166, y: yb(1.0) - 3, text: 'WEAK', t0: tAt(1.0), t1, col: 'c3', lineCol: 'c1', box: true });
  CAP.note(c, lt, { ax: PX.cx + 6, ay: yb(4.4), x: 166, y: yb(4.4) - 3, text: 'NONE: FLUID', t0: tAt(4.4), t1, col: 'g9', lineCol: 'g5', box: true });
  CAP.note(c, lt, { ax: PX.cx + 40, ay: yb(5.45), x: 166, y: yb(5.45) - 3, text: 'STRONG: BONE', t0: tAt(5.45), t1, col: 'c4', lineCol: 'c2', box: true });
};
S.draw = (c, lt, info) => {
  const t = info ? info.t : 31 + lt;
  // the crystals listening; from 4.2 s the camera rises up the wires and the receiver slides up into view
  const slide = MO.cubicOut(U.clamp((lt - 4.45) / 0.4));
  if (lt < 4.85) PROBE.drawMicro(c, S.mcam(lt), t, S.state(t));
  if (slide > 0) {
    if (lt >= 4.85) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PIX.P.n0; c.fillRect(0, 0, PIX.W, PIX.H); c.restore(); }
    else { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PIX.P.n0; c.fillRect(0, Math.round(480 * (1 - slide)), PIX.W, PIX.H); c.restore(); }
    S.drawScope(c, lt, S.CUR(lt), Math.round(480 * (1 - slide)));
  }
  if (lt < 4.5) {
    S.cycle(c, lt, 1 - U.clamp((lt - 4.1) / 0.25));
    // point at the next echo on its way up (the nearest one inside the frame)
    const cam = S.mcam(lt), fronts = ARR.filter(a => a.lt > lt && vis(a.A) > 0.25).map(a => K.S(cam, M.ex(-3) - 18, M.GND + M.V * (31 + a.lt - t))).filter(p => p[1] < 440);
    const ep = fronts.length ? fronts[0] : K.S(cam, M.ex(-3) - 18, M.GND + 6);
    CAP.note(c, lt, { ax: ep[0] + 2, ay: ep[1], x: 14, y: 140, text: 'RETURNING ECHO', t0: 0.35, t1: 3.9, col: 'y4', lineCol: 'y2', box: true });
    CAP.note(c, lt, { x: CAP.X0 + 5, y: CAP.Y0, text: 'THE SAME CRYSTALS', t0: 0.6, t1: 3.9, col: 'w', box: true });
    CAP.note(c, lt, { x: CAP.X0 + 5, y: CAP.Y0 + 11, text: 'NOW LISTEN', t0: 0.85, t1: 3.9, col: 'w', box: true });
  } else {
    const yt = yb(2.0);
    CAP.note(c, lt, { ax: PX.cx - 30, ay: yt, x: CAP.X0 + 5, y: CAP.Y0, text: 'ELECTRICAL SIGNAL', t0: 4.7, t1: 99, col: 'c4', lineCol: 'c2', box: true });
    S.notes(c, lt, 99);
  }
};
S.cues = () => {
  const out = [[0.0, 'switch', 0.7], [L_END, 'crystal', 0.6], [4.2, 'sweep', 0.6]];
  for (const a of ARR) if (vis(a.A) >= 0.1) out.push([a.lt, 'recv', Math.min(1, 0.3 + vis(a.A) * 0.8)]);
  for (const a of ARR) if (a.A > 0.015) out.push([tAt(a.d), 'chirp', Math.min(1, 0.35 + Math.sqrt(a.A))]);
  return out;
};
})();
