// S06 (31–39 s) — the same crystals listen. Echoes from the column arrive at the face one after another (in depth
// order, the strongest from the skull); each squeezes the crystals a little, and the squeeze makes a voltage that runs
// up the wires: pressure → deformation → voltage, the piezoelectric effect in reverse. The machine has switched from
// SEND to LISTEN. Then up the wires to the receiver: the echoes arrive as voltage bursts, early and late, weak and strong
// (the trace is the model's echo signal along the same scan line).
(() => {
const S = SC.s06_receive = {}, M = PROBE.M, LINE = 28;
const ARR = SC.s05_echoes.BOUNDS.slice(0, 9).map(b => ({ d: b.d, A: b.A, lt: 0.66 + b.d * 0.34 }));   // skull lands on 2.5 s
S.ARR = ARR;
const vis = A => Math.min(1, Math.sqrt(A / 0.55));
S.state = t => {
  const st = { waves: [], recv: [], gel: 1 };
  for (const a of ARR) {
    const ta = 31 + a.lt, amp = vis(a.A);
    if (amp < 0.1) continue;
    st.waves.push({ y0: 1600, t0: ta - (1600 - M.GND) / M.V, dir: -1, amp, x0: M.ex(-3) - 18, x1: M.ex(3) + 18, col: 'echo', yEnd: M.GND });
    st.recv.push({ t0: ta, amp, e0: -3, e1: 3 });
  }
  return st;
};
S.mcam = lt => ({ x: M.CX, y: lt < 4 ? 268 : U.lerp(268, 40, MO.sineInOut(U.clamp((lt - 4) / 0.6))), z: 1 });
// SEND / LISTEN lamps
S.lamps = (c, lt, a = 1) => {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  const send = lt < 0.25, blink = ARR.some(r => lt >= r.lt && lt < r.lt + 0.12 && vis(r.A) > 0.25);
  PIX.rect(c, 182, 86, 80, 26, 'g4'); PIX.rect(c, 183, 87, 78, 24, 'k');
  PIX.rect(c, 188, 92, 5, 5, send ? 'c3' : 'g2'); PIX.text(c, 'SEND', 197, 91, send ? 'c4' : 'g5', { shadow: null });
  PIX.rect(c, 188, 102, 5, 5, send ? 'g2' : blink ? 'y4' : 'y2'); PIX.text(c, 'LISTEN', 197, 101, send ? 'g5' : 'y4', { shadow: null });
  c.restore();
};
// the receiver: echo voltage against time, time running down the screen (0 → 156 µs for 12 cm)
const PX = { x0: 20, x1: 250, y0: 96, y1: 462, ty0: 110, ty1: 446, cx: 104 };
S.PX = PX;
S.yOfUs = us => PX.ty0 + (PX.ty1 - PX.ty0) * us / 156;
let LI = null;
S.line = () => LI || (LI = US.lineInfo(LINE, 35));
S.drawScope = (c, lt, cursorUs) => {
  const L = S.line(), A = L.A, amax = Math.max(...A);
  PIX.rect(c, PX.x0, PX.y0, PX.x1 - PX.x0, PX.y1 - PX.y0, 'g3'); PIX.rect(c, PX.x0 + 1, PX.y0 + 1, PX.x1 - PX.x0 - 2, PX.y1 - PX.y0 - 2, 'k');
  for (let us = 0; us <= 156; us += 13) PIX.rect(c, PX.x0 + 4, Math.round(S.yOfUs(us)), PX.x1 - PX.x0 - 8, 1, 'n1');
  PIX.rect(c, PX.cx, PX.ty0, 1, PX.ty1 - PX.ty0, 'g2');
  PIX.rect(c, PX.cx, PX.y0 - 96, 1, 96 + PX.ty0 - PX.y0, 'c1');                                      // the wire from the probe
  // the trace, drawn down to the cursor: an RF-like wiggle under each echo's envelope (compressed so weak echoes show)
  const yC = S.yOfUs(cursorUs);
  let prev = null;
  for (let y = PX.ty0; y < Math.min(PX.ty1, yC); y++) {
    const us = (y - PX.ty0) / (PX.ty1 - PX.ty0) * 156, j = Math.min(US.NS - 1, Math.floor(us / 13 / US.DR));
    const e = Math.pow(Math.max(A[Math.max(0, j - 1)], A[j], A[Math.min(US.NS - 1, j + 1)]) / amax, 0.8);   // amplified (gamma 0.8)
    const x = Math.round(PX.cx + 62 * e * Math.sin(y * 1.9));
    if (prev != null) PIX.rect(c, Math.min(prev, x), y, Math.abs(prev - x) + 1, 1, e > 0.6 ? 'c4' : 'c3');
    prev = x;
  }
  if (cursorUs < 156) { PIX.rect(c, PX.x0 + 4, Math.round(yC), PX.x1 - PX.x0 - 8, 1, 'c1'); PIX.rect(c, PX.cx - 3, Math.round(yC), 7, 1, 'c4'); }
};
S.notes = (c, lt, t1) => {
  const yb = d => Math.round(S.yOfUs(13 * d)), tAt = d => 4.45 + 13 * d / 156 * 3.2;
  CAP.note(c, lt, { ax: PX.cx + 18, ay: yb(1.0), x: 168, y: yb(1.0) - 3, text: 'WEAK', t0: tAt(1.0), t1, col: 'c3', lineCol: 'c1', box: true });
  CAP.note(c, lt, { ax: PX.cx + 6, ay: yb(4.4), x: 168, y: yb(4.4) - 3, text: 'NONE: FLUID', t0: tAt(4.4), t1, col: 'g9', lineCol: 'g5', box: true });
  CAP.note(c, lt, { ax: PX.cx + 40, ay: yb(5.45), x: 168, y: yb(5.45) - 3, text: 'STRONG: BONE', t0: tAt(5.45), t1, col: 'c4', lineCol: 'c2', box: true });
};
S.CUR = lt => U.clamp((lt - 4.45) / 3.2) * 156;
S.draw = (c, lt, info) => {
  const t = info ? info.t : 31 + lt;
  const micro = cc => { PROBE.drawMicro(cc, S.mcam(lt), t, S.state(t)); };
  const scope = cc => { cc.save(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.fillStyle = PIX.P.n0; cc.fillRect(0, 0, PIX.W, PIX.H); cc.restore(); S.drawScope(cc, lt, S.CUR(lt)); };
  const dz = U.clamp((lt - 4.25) / 0.35);
  if (dz <= 0) micro(c); else if (dz >= 1) scope(c); else window.dissolve(c, micro, scope, dz);
  if (lt < 4.3) {
    S.lamps(c, lt, 1 - U.clamp((lt - 3.9) / 0.25));
    CAP.scene(c, lt, { title: 'RETURNING ECHO', ctx: 'THE SAME CRYSTALS NOW LISTEN', t0: 0.4, t1: 3.85 });
    SC.s03_crystals.boxSteps(c, lt, [[0.75, 'ECHO ARRIVES', 'y3'], [0.9, 'CRYSTAL SQUEEZED', 'w'], [1.05, 'VOLTAGE SIGNAL', 'c3']], 14, 392, 3.85);
  }
  if (lt >= 4.3) {
    CAP.scene(c, lt, { title: 'ELECTRICAL SIGNAL', ctx: 'ECHOES BECOME VOLTAGE BURSTS', t0: 4.45, t1: 99 });
    S.notes(c, lt, 99);
  }
};
S.xin = 0.35;
S.cues = () => {
  const out = [];
  for (const a of ARR) if (vis(a.A) >= 0.1) out.push([a.lt, 'recv', Math.min(1, 0.3 + vis(a.A) * 0.8)]);
  out.push([0.0, 'switch', 0.7], [4.0, 'sweep', 0.6]);
  // the trace: a chirp for each burst as the cursor reaches it
  for (const a of ARR) if (a.A > 0.015) out.push([4.45 + 13 * a.d / 156 * 3.2, 'chirp', Math.min(1, 0.35 + Math.sqrt(a.A))]);
  return out;
};
})();
