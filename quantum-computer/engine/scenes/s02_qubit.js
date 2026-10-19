// S02 QUBIT (7–17 s): classical vs quantum. A classical transistor switches its channel on and off with the gate
// voltage: its bit is 0 or 1 and jumps between the two. The camera then pushes into one superconducting qubit on the
// chip. Its two lowest energy states are the basis states |0⟩ and |1⟩, and its state is drawn on a Bloch sphere: a
// vector that can point anywhere between the poles, α|0⟩ + β|1⟩ — one state with two amplitudes that moves smoothly,
// not a bit flickering between 0 and 1.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, h = U.hash;
const C0 = FR.toRoom(0, FR.PKG.y + FR.PKG.h / 2), MM = FR.FS / 10;         // chip centre (room px); room px per mm
const QI = 12, Q = CH.Q[QI], QW = [C0[0] + Q.x * MM, C0[1] + Q.y * MM];     // the featured qubit, (2,2)
const anchor = (A, sx, sy, z) => ({ x: A[0] - (sx - W / 2) / z, y: A[1] - (sy - H / 2) / z, z });
const io = MO.sineInOut;
// camera: S01 ends on the chip centre at zoom 86. The chip slides into the lower half under the transistor panel,
// then a fast push lands on one qubit, which drifts slightly while the levels and the Bloch sphere appear.
const camAt = t => {
  if (t < 3.6) { const b = K.sm(t, 0, 3.6), A = [lerp(C0[0], QW[0], b), lerp(C0[1], QW[1], b)]; return anchor(A, 135, lerp(240, 352, MO.cubicInOut(clamp(t / 0.7))), K.zl(86, 150, io(clamp(t / 3.6)))); }
  if (t < 4.4) { const p = io((t - 3.6) / 0.8); return anchor(QW, lerp(135, 100, p), lerp(352, 190, p), K.zl(150, 600, p)); }
  if (t < 6.8) { const p = io((t - 4.4) / 2.4); return anchor(QW, lerp(100, 97, p), lerp(190, 186, p), K.zl(600, 640, p)); }
  const p = io(clamp((t - 6.8) / 3.2)); return anchor(QW, lerp(97, 94, p), lerp(186, 180, p), K.zl(640, 700, p));
};
window.S02 = { camAt, QI };

// ---------- the classical transistor (screen px, panel offset oy) ----------
const BITS = [[1.0, 1], [1.5, 0], [2.0, 1], [2.5, 0], [3.0, 1]];             // gate voltage toggles on the beat
const bitAt = t => { let b = 0; for (const [tt, v] of BITS) if (t >= tt) b = v; return b; };
const onAt = t => { let v = 0; for (const [tt, b] of BITS) if (t >= tt) v = lerp(v, b, MO.smooth(clamp((t - tt) / 0.12))); return v; };
const panelY = t => t < 3.6 ? -246 + 246 * MO.cubicOut(clamp(t / 0.6)) : -246 * MO.cubicIn(clamp((t - 3.6) / 0.5));
const BOX = { x: 196, y: 56, w: 58, h: 50 };
function transistor(c, t, oy) {
  const R = (x, y, w, hh, col) => PIX.rect(c, x, Math.round(y + oy), w, hh, col);
  const T = (s, x, y, col, o) => PIX.text(c, s, x, Math.round(y + oy), col, o);
  const on = onAt(t), bit = bitAt(t);
  R(0, -12, W, 248, 'k'); R(0, 236, W, 1, 'd4'); R(0, 237, W, 1, 'd2');
  // the gate voltage as a digital trace: two levels joined by hard edges, newest at the right
  let prev = null;
  for (let x = 20; x <= 186; x++) {
    const tau = t - (186 - x) / 62; if (tau < 0.62) { prev = null; continue; }
    const y = bitAt(tau) ? 68 : 82;
    R(x, y, 1, 1, x > 182 ? 'e2' : 'e1');
    if (prev != null && prev !== y) R(x, Math.min(prev, y), 1, Math.abs(prev - y), 'e1');
    prev = y;
  }
  T('1', 12, 66, 'd6', { shadow: null }); T('0', 12, 80, 'd6', { shadow: null });
  // the stored bit
  const flash = BITS.some(([tt]) => t >= tt && t < tt + 0.1);
  R(BOX.x, BOX.y, BOX.w, BOX.h, flash ? 'e2' : 'd4'); R(BOX.x + 1, BOX.y + 1, BOX.w - 2, BOX.h - 2, 'k');
  T('BIT', BOX.x + BOX.w / 2, BOX.y + 4, 'd7', { align: 'center', shadow: null });
  if (t < 3.62) T(String(bit), BOX.x + BOX.w / 2, BOX.y + 17, bit ? 'e2' : 'd7', { sc: 3, align: 'center', shadow: null });
  // p-type silicon with dopant speckle, n+ source and drain wells full of free electrons
  R(16, 150, 238, 76, 'd2'); R(16, 150, 238, 1, 'd3');
  for (let k = 0; k < 90; k++) R(18 + Math.floor(h(k, 1) * 234), 156 + Math.floor(h(k, 2) * 68), 1, 1, 'd4');
  for (const x0 of [24, 178]) { R(x0, 151, 68, 26, 'c0'); R(x0 + 2, 177, 64, 2, 'c0'); R(x0, 151, 68, 1, 'c1'); }
  for (let k = 0; k < 16; k++) { const x0 = k % 2 ? 178 : 24, j = k >> 1; FX.e(c, x0 + 9 + (j % 4) * 16 + Math.sin(t * 7 + k) * 2, oy + 158 + (j >> 2) * 10 + Math.cos(t * 6 + k * 2) * 1.5, 1); }
  // gate oxide and gate electrode; a positive gate pulls a thin channel of electrons under the oxide
  R(86, 146, 98, 4, 'd8'); R(86, 146, 98, 1, 'd9');
  R(92, 114, 86, 32, 'd5'); R(92, 114, 86, 2, 'd7'); R(92, 114, 2, 32, 'd6');
  for (let k = 0; k < 7; k++) if (h(k, 9) < on) T('+', 99 + k * 11, 135, 'e2', { shadow: null });
  if (on > 0.5) R(92, 151, 86, 3, 'c1'); else if (on > 0.15) R(92, 151, 86, 1, 'c1');
  for (let k = 0; k < 13; k++) if (h(k, 5) < on) FX.e(c, 82 + K.wrap(t * 85 + k * 8.8, 112), oy + 152, 1);
  // contacts and wires
  for (const [x, lab] of [[58, 'S'], [212, 'D']]) { R(x - 10, 122, 20, 28, 'd6'); R(x - 10, 122, 20, 2, 'd8'); R(x - 1, 100, 3, 22, 'd6'); T(lab, x + 6, 100, 'd9'); }
  R(134, 100, 3, 14, 'd6'); T('G', 141, 100, 'd9');
  T('TRANSISTOR', 20, 216, 'd6', { shadow: null });
}

// ---------- the qubit's two levels ----------
const LV = { xc: 205, hw: 27, y0: 226, y1: 158 };
const ketX = 236;
function ladder(c, t) {
  const g = MO.cubicOut(K.lin(t, 4.25, 4.6)), dim = t > 6.9 ? 'd5' : null;
  if (g <= 0) return;
  // a dark card behind the levels keeps them clear of the chip wiring
  const ch = Math.round(46 * MO.cubicOut(K.lin(t, 4.2, 4.5)));
  if (ch > 0) { PIX.rect(c, 172, 192 - ch, 82, 2 * ch, 'd3'); PIX.rect(c, 173, 193 - ch, 80, 2 * ch - 2, 'k'); }
  const hw = Math.round(LV.hw * g);
  for (const y of [LV.y0, LV.y1]) { PIX.rect(c, LV.xc - hw, y, 2 * hw, 2, dim || 'p2'); PIX.rect(c, LV.xc - hw, y, 2 * hw, 1, dim || 'p3'); }
  const a = K.lin(t, 4.6, 4.9);
  if (a > 0) {
    const x = 183, n = Math.round((LV.y0 - LV.y1 - 6) * a);
    PIX.rect(c, x, LV.y0 - 3 - n, 1, n, 'd6');
    if (a >= 1) { PIX.text(c, '↑', x - 2, LV.y1 + 3, 'd6', { shadow: null }); PIX.text(c, '↓', x - 2, LV.y0 - 9, 'd6', { shadow: null }); }
    PIX.text(c, '≈5 GHz', 188, 188, 'd8', { n: Math.floor((t - 4.75) * 40) });
  }
  // the qubit sits in its ground state |0⟩ (15 mK is far below the 5 GHz level spacing)
  if (t > 4.6 && t < 7.2) FX.glowL(c, LV.xc, LV.y0 + 1, 8, ['p1', 'p2', 'p3'], (t < 6.9 ? 1 : (7.2 - t) / 0.3) * K.lin(t, 4.6, 4.8), 1.2);
  if (t > 4.4) for (const [lab, y] of [['|1⟩', LV.y1 - 3], ['|0⟩', LV.y0 - 3]]) PIX.text(c, lab, ketX, y, dim ? 'd7' : 'w');
}
// the bit's two values fly down and become the qubit's basis states
function digits(c, t) {
  if (t < 3.62 || t > 4.42) return;
  const p = MO.cubicInOut(K.lin(t, 3.62, 4.4));
  for (const [d, yEnd, k] of [['1', LV.y1 - 3, 0], ['0', LV.y0 - 3, 1]]) {
    const sx = BOX.x + BOX.w / 2, sy = BOX.y + 17 + 10 + panelY(t) * 0.0, ex = ketX + 2 + 2.5, ey = yEnd + 3.5;
    const cx = lerp(sx, ex, 0.5) + 40 + k * 18, cy = lerp(sy, ey, 0.5) - 30;
    const x = (1 - p) * (1 - p) * sx + 2 * (1 - p) * p * cx + p * p * ex, y = (1 - p) * (1 - p) * sy + 2 * (1 - p) * p * cy + p * p * ey;
    const sc = p < 0.4 ? 3 : p < 0.75 ? 2 : 1;
    PIX.text(c, d, x, y - 3.5 * sc, k ? 'p3' : 'p3', { sc, align: 'center' });
  }
}

// ---------- the Bloch sphere ----------
const S0 = 7.35;
const thAt = s => 2.0 * MO.smooth(clamp(s / 1.3)) - 0.75 * MO.smooth(clamp((s - 1.3) / 1.25));
const phAt = s => 0.25 + 1.7 * io(clamp(s / 2.65));
const vecAt = t => { const s = Math.max(0, t - S0), th = thAt(s), ph = phAt(s); return [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]; };
const ampAt = t => { const s = Math.max(0, t - S0), th = thAt(s), ph = phAt(s); return [[Math.cos(th / 2), 0], QM.sc(QM.cis(ph), Math.sin(th / 2))]; };
function sphere(c, t) {
  if (t < 6.8) return;
  const pop = MO.backOut(K.lin(t, 6.8, 7.25), 1.6), R = lerp(60, 65, io(K.lin(t, 7.0, 10))) * pop;
  const o = { cx: 110, cy: 350, R, az: 0.55 + (t - 6.8) * 0.3, el: 0.32, vec: vecAt(t), a: 1 };
  const tr = []; for (let k = 1; k <= 24; k++) { const tt = t - k / 30; if (tt > S0) tr.push(vecAt(tt)); }
  o.trail = tr;
  if (R > 4) BL.sphere(c, o);
  const [al, be] = ampAt(t), a = K.lin(t, 7.1, 7.4);
  if (a > 0) { BL.amp(c, 198, 404, 60, al, 'α', { bw: 13, a }); BL.amp(c, 230, 404, 60, be, 'β', { bw: 13, a }); }
  const n1 = CAP.typed('α|0⟩ + β|1⟩', t, 7.6), n2 = CAP.typed('ANY POINT ON THE SPHERE', t, 8.4);
  if (n1 > 0) PIX.text(c, 'α|0⟩ + β|1⟩', 135, 442, 'w', { align: 'center', n: n1 });
  if (n2 > 0) PIX.text(c, 'ANY POINT ON THE SPHERE', 135, 456, 'd8', { align: 'center', n: n2 });
}

SC['s02_qubit'] = {
  draw(c, t, S) {
    const cam = camAt(t), zc = cam.z * FR.FS, focus = t > 4.2;
    K.cam(c, cam);
    c.save(); c.translate(FR.FX0, FR.FY0); c.scale(FR.FS, FR.FS);
    const chipFn = (cc, z) => { cc.save(); cc.scale(0.1, 0.1); CH.draw(cc, { z: z / 10, hl: focus ? new Set([QI]) : null }); cc.restore(); };
    FR.draw(c, { z: zc, t: S.t, chipFn });
    c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const [qx, qy] = K.S(cam, ...QW);
    if (focus) FX.spot(c, qx, qy, 60, 150, 0.7 * K.sm(t, 4.2, 4.8));
    if (t > 4.3) FX.glowL(c, qx, qy, 30, ['p0', 'p1'], 0.5 * K.sm(t, 4.3, 4.8), 1.3);
    const oy = panelY(t);
    if (oy > -246) transistor(c, t, oy);
    if (t < 3.6) CAP.scene(c, t, { title: 'CLASSICAL BIT', t0: 0.6, t1: 3.55, acc: 'e2' });
    digits(c, t);
    ladder(c, t);
    if (t > 4.4) CAP.scene(c, t, { title: 'QUBIT', t0: 4.45, acc: 'p2' });
    sphere(c, t);
  },
  cues: () => {
    const q = [[0, 'whoosh', 0.5, 0], [0.6, 'type', 0.4]];
    for (const [tt, b] of BITS) q.push([tt, 'click', 0.8, 0.3, b]);
    q.push([3.6, 'swish', 0.8, 0], [4.45, 'type', 0.4], [4.5, 'level', 0.7, 0.4, 0], [4.62, 'level', 0.7, 0.4, 1], [6.8, 'pop', 0.8, -0.2], [S0, 'rot', 0.7, -0.2, 2.6], [7.6, 'type', 0.4]);
    return q;
  },
};
})();
