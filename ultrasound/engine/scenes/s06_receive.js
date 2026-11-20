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
// the receiver: echo voltage against time, time running down the screen (0 → 156 µs for 12 cm). Drawn through its own
// camera (panel coordinates; identity = {x: 135, y: 240, z: 1}) so the shot can push in and follow the cursor, with
// geometry re-rasterized at every scale. Beside the time axis, a strip of the real slice along the same scan line at
// the same scale: each burst sits next to the tissue boundary it came from.
const PX = { x0: 20, x1: 232, y0: 96, y1: 376, ty0: 108, ty1: 362, cx: 120, amp: 46, sx: 24, sw: 12 };
S.PX = PX;
S.yOfUs = us => PX.ty0 + (PX.ty1 - PX.ty0) * us / 156;
let LI = null;
S.line = () => LI || (LI = US.lineInfo(LINE, 35));
S.ampAtUs = us => { const A = S.line().A, j = Math.min(US.NS - 1, Math.floor(us / 13 / US.DR)); return Math.max(A[Math.max(0, j - 1)], A[j], A[Math.min(US.NS - 1, j + 1)]); };
S.ID = { x: 135, y: 240, z: 1 };
S.toS = (pc, x, y) => [135 + (x - pc.x) * pc.z, 240 + (y - pc.y) * pc.z];
const PH = US.phi(LINE), KP = (PX.ty1 - PX.ty0) / 12;
const strip = hw => (bx, bz) => { const r = bz + US.RP, along = bx * Math.sin(PH) + r * Math.cos(PH), perp = bx * Math.cos(PH) - r * Math.sin(PH); return Math.abs(perp) <= hw && along >= US.RP && along <= US.RP + 12; };
const STRIP = strip(PX.sw / 2 / KP);
S.drawScope = (c, lt, cursorUs, pc = S.ID, dy = 0) => {
  const A = S.line().A, amax = Math.max(...A), z = pc.z, T = (x, y) => { const p = S.toS(pc, x, y); return [p[0], p[1] + dy]; };
  const R = (x, y, w, h, col) => { const [a, b] = T(x, y); PIX.rect(c, Math.round(a), Math.round(b), Math.max(1, Math.round(w * z)), Math.max(1, Math.round(h * z)), col); };
  R(PX.x0, PX.y0, PX.x1 - PX.x0, PX.y1 - PX.y0, 'g4'); R(PX.x0 + 1, PX.y0 + 1, PX.x1 - PX.x0 - 2, PX.y1 - PX.y0 - 2, 'n1');
  for (let us = 0; us <= 156; us += 13) R(PX.x0 + 4, S.yOfUs(us), PX.x1 - PX.x0 - 8, 1 / z, 'n2');
  R(PX.cx, PX.ty0, 1 / z, PX.ty1 - PX.ty0, 'n3');
  { const [a, b] = T(PX.cx, PX.ty0); PIX.rect(c, Math.round(a), 0, Math.max(1, Math.round(z)), Math.max(0, Math.round(b)), 'c1'); }   // the wire from the probe
  // the tissue strip (same depth scale as the time axis)
  { const [ax, ay] = T(PX.sx + PX.sw / 2, PX.ty0), zc = KP * z, cc = { x: (135 - ax) / zc, y: (240 - ay) / zc, z: zc };
    const [c0x, c0y] = T(PX.sx, PX.ty0), [c1x, c1y] = T(PX.sx + PX.sw, PX.ty1);
    US.drawAnatomy(c, cc, 0, -US.RP, 1, { t: 0, rot: PH, full: true, inside: STRIP, clip: [Math.max(0, Math.floor(c0x) - 1), Math.max(0, Math.floor(c0y)), Math.ceil(c1x) + 1, Math.ceil(c1y)] }); }
  // the trace down to the cursor: an RF-like wiggle under each echo's envelope (amplified, gamma 0.8)
  const yC = S.yOfUs(cursorUs), sy0 = Math.max(0, Math.ceil(T(0, PX.ty0)[1])), sy1 = Math.min(PIX.H, Math.floor(T(0, Math.min(PX.ty1, yC))[1]));
  let prev = null; const lw = Math.max(1, Math.round(z));
  for (let sy = sy0; sy < sy1; sy++) {
    const y = pc.y + (sy - dy - 240) / z, us = (y - PX.ty0) / (PX.ty1 - PX.ty0) * 156, e = Math.pow(S.ampAtUs(us) / amax, 0.8);
    const x = Math.round(T(PX.cx + PX.amp * e * Math.sin(y * 1.9), 0)[0]);
    if (prev != null) PIX.rect(c, Math.min(prev, x), sy, Math.abs(prev - x) + lw, 1, e > 0.6 ? 'c5' : e > 0.2 ? 'c4' : 'c3');
    prev = x;
  }
  if (cursorUs > 0 && cursorUs < 156) {
    R(PX.x0 + 4, yC, PX.x1 - PX.x0 - 8, 1 / z, 'c1'); R(PX.cx - 3, yC, 7, 1 / z, 'c4');
    // the signal arriving down the wire: a packet for every burst just ahead of the cursor
    const e = Math.pow(S.ampAtUs(cursorUs) / amax, 0.8);
    if (e > 0.12) R(PX.cx - 1, yC - 16, 3, 14, e > 0.5 ? 'c5' : 'c3');
  }
};
// the shot: slide up, push in and follow the cursor down, pull back out as the trace completes
S.scopeCam = lt => {
  const yC = S.yOfUs(S.CUR(lt)), follow = { x: 115, y: U.clamp(yC - 30, 170, 290), z: 1.4 };
  if (lt < 4.85) return S.ID;
  if (lt < 7.55) { const e = MO.sineInOut(U.clamp((lt - 4.85) / 0.6)); return K.camLerp(S.ID, follow, e); }
  return K.camLerp(follow, S.ID, MO.sineInOut(U.clamp((lt - 7.55) / 0.45)));
};
S.CUR = lt => U.clamp((lt - 4.75) / 3.15) * 156;
const yb = d => S.yOfUs(13 * d), tAt = d => 4.75 + 13 * d / 156 * 3.15;
S.notes = (c, lt, t1, pc = S.ID) => {
  const P = (x, y) => S.toS(pc, x, y);
  for (const [d, dx, text, col, lc] of [[1.0, 14, 'WEAK', 'c3', 'c1'], [4.4, 6, 'NONE: FLUID', 'g9', 'g5'], [5.45, 40, 'STRONG: BONE', 'c4', 'c2']]) {
    const a = P(PX.cx + dx, yb(d)), tx = Math.min(P(170, 0)[0], 238 - PIX.textWidth(text));
    if (a[1] < 98 || a[1] > 466) continue;                                        // out of the pushed-in frame
    CAP.note(c, lt, { ax: a[0], ay: a[1], x: tx, y: a[1] - 3, text, t0: tAt(d), t1, col, lineCol: lc, box: true });
  }
};
S.draw = (c, lt, info) => {
  const t = info ? info.t : 31 + lt;
  // the crystals listening; from 4.2 s the camera rises up the wires and the receiver slides up into view
  const slide = MO.cubicOut(U.clamp((lt - 4.45) / 0.4));
  if (lt < 4.85) PROBE.drawMicro(c, S.mcam(lt), t, S.state(t));
  if (slide > 0) {
    const dy = Math.round(480 * (1 - slide));
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PIX.P.n0; c.fillRect(0, lt >= 4.85 ? 0 : dy, PIX.W, PIX.H); c.restore();
    S.drawScope(c, lt, S.CUR(lt), S.scopeCam(lt), dy);
  }
  if (lt < 4.5) {
    S.cycle(c, lt, 1 - U.clamp((lt - 4.1) / 0.25));
    const cam = S.mcam(lt), fronts = ARR.filter(a => a.lt > lt && vis(a.A) > 0.25).map(a => K.S(cam, M.ex(-3) - 18, M.GND + M.V * (31 + a.lt - t))).filter(p => p[1] < 440 && p[1] > 90);
    const ep = fronts.length ? fronts[0] : null;
    CAP.note(c, lt, { ax: ep ? ep[0] + 2 : null, ay: ep ? ep[1] : null, x: CAP.X0 + 5, y: CAP.Y0, text: 'RETURNING ECHO', t0: 0.35, t1: 3.9, col: 'y4', lineCol: 'y2', box: true });
    CAP.note(c, lt, { x: CAP.X0 + 5, y: CAP.Y0 + 11, text: 'THE SAME CRYSTALS', t0: 0.6, t1: 3.9, col: 'w', box: true });
    CAP.note(c, lt, { x: CAP.X0 + 5, y: CAP.Y0 + 22, text: 'NOW LISTEN', t0: 0.85, t1: 3.9, col: 'w', box: true });
  } else {
    const pc = S.scopeCam(lt), a = S.toS(pc, PX.cx - 20, yb(2.0));
    CAP.note(c, lt, { ax: a[0], ay: a[1], x: CAP.X0 + 5, y: CAP.Y0, text: 'ELECTRICAL SIGNAL', t0: 4.7, t1: 7.1, col: 'c4', lineCol: 'c2', box: true });
    S.notes(c, lt, 99, pc);
    SC.s07_build.tofCaption(c, t);
  }
};
S.cues = () => {
  const out = [[0.0, 'switch', 0.7], [L_END, 'crystal', 0.6], [4.2, 'sweep', 0.6]];
  for (const a of ARR) if (vis(a.A) >= 0.1) out.push([a.lt, 'recv', Math.min(1, 0.3 + vis(a.A) * 0.8)]);
  for (const a of ARR) if (a.A > 0.015) out.push([tAt(a.d), 'chirp', Math.min(1, 0.35 + Math.sqrt(a.A))]);
  return out;
};
})();
