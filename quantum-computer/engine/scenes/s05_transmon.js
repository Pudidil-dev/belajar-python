// S05 QUANTUM STATES (44–55 s): the transmon. The magnified junction shrinks into a bubble as the camera pulls back to
// the chip: the junction is two crossing aluminium leads at the foot of a cross-shaped capacitor pad — a Josephson
// junction shunted by a capacitor, the transmon. In the junction's cosine well its energy is quantised; the levels
// get closer together going up (5.0 GHz, then 4.7 GHz), so a 5.0 GHz pulse drives only |0⟩ ↔ |1⟩ and those two levels
// are the qubit. They become the poles of its Bloch sphere. A calibrated microwave pulse comes down the drive line;
// as it reaches the qubit the Bloch vector starts to turn (S06).
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, h = U.hash;
const S4 = window.S04, MM = FR.FS / 10, C0 = FR.toRoom(0, FR.PKG.y + FR.PKG.h / 2);
const QI = 12, Q = CH.Q[QI], JY = CH.JY(Q);
const room = (x, y) => [C0[0] + x * MM, C0[1] + y * MM];
const anchor = (A, sx, sy, zmm) => { const z = zmm / MM; return { x: A[0] - (sx - W / 2) / z, y: A[1] - (sy - H / 2) / z, z }; };
const QSX = 176, QSY = 172, ZQ = 118;                            // where the qubit ends up (screen px, px per mm)
const camAt = t => {
  if (t < 4.4) { const u = io(t / 4.4); return anchor(room(Q.x, JY), 135, lerp(166, 175 + (JY - Q.y) * 140, u), Math.exp(lerp(Math.log(2e4), Math.log(140), u))); }
  if (t < 6.0) { const u = io((t - 4.4) / 1.6); return anchor(room(Q.x, Q.y), lerp(135, QSX, u), lerp(175, QSY, u), K.zl(140, ZQ, u)); }
  return anchor(room(Q.x, Q.y), QSX, QSY, ZQ);
};
// the bubble: the magnified cross-section of the junction, shrinking away from it
const bubble = t => {
  const u = MO.cubicInOut(clamp(t / 1.5)), v = MO.cubicInOut(clamp((t - 0.3) / 1.3));
  let r = lerp(330, 42, u); if (t > 4.4) r *= 1 - MO.cubicIn(clamp((t - 4.4) / 0.45));
  return { x: lerp(135, 208, v), y: lerp(166, 116, v), r, z: S4.ZP };            // fixed magnification: 3 px between ions
};
const SPH = { cx: 135, cy: 376, R: 56 };
const T_SPH = 6.9, T_PULSE = 8.4, T_ARRIVE = 11.0;
const drive = CH.drivePath(Q), DL = K.polyLen(drive);
const pulseD = t => lerp(DL - 1.45, DL, MO.linear(clamp((t - T_PULSE) / (T_ARRIVE - T_PULSE))));   // envelope centre along the line (mm)
window.S05 = { camAt, SPH, QSX, QSY, ZQ, drive, DL, azAt: t => -0.3 - 0.15 * (T_ARRIVE - t) };   // reaches S06's gate view

// ---------- the energy card: levels in the cosine well, then the hand-over to the Bloch sphere ----------
const KET = n => `|${n}⟩`;
function levels(c, t) {
  for (let n = 0; n < 4; n++) {
    const tn = 2.4 + n * 0.28; if (t < tn) continue;
    const E = JN.level(n), ph = Math.acos(-E), g = MO.cubicOut(clamp((t - tn) / 0.3)), q = n < 2;
    const xl = Math.round(S4.px(-ph * g)), xr = Math.round(S4.px(ph * g)), y = Math.round(S4.py(E));
    PIX.rect(c, xl, y, xr - xl, 1, q ? 'p3' : 'd6'); if (q) PIX.rect(c, xl, y + 1, xr - xl, 1, 'p1');
    if (g >= 1) PIX.text(c, KET(n), xr + 3, y - 3, q ? 'w' : 'd7', { n: CAP.typed(KET(n), t, tn + 0.3) });
  }
  const yl = n => S4.py(JN.level(n));
  const n1 = CAP.typed('5.0 GHz', t, 3.7), n2 = CAP.typed('4.7 GHz', t, 3.95);
  if (n1) PIX.text(c, '5.0 GHz', 141, (yl(0) + yl(1)) / 2 - 3, 'd9', { n: n1 });
  if (n2) PIX.text(c, '4.7 GHz', 141, (yl(1) + yl(2)) / 2 - 3, 'd7', { n: n2 });
  // the drive: a 5.0 GHz pulse matches only the 0 → 1 gap
  if (t > 4.9) {
    const a = K.lin(t, 4.9, 5.2), x = 127, y0 = Math.round(yl(0)) - 2, y1 = Math.round(yl(1)) + 3, n = Math.round((y0 - y1) * a);
    for (let k = 0; k < n; k++) { const y = y0 - k, off = Math.round(1.6 * Math.sin(k * 0.9 - t * 14)); PIX.rect(c, x + off, y, 1, 1, 'o1'); }
    if (a >= 1) PIX.text(c, '↑', x - 2, y1 - 1, 'o2', { shadow: null });
    const y2 = Math.round(yl(2)) + 3, y3 = Math.round(yl(1)) - 2;
    if (t > 5.3) { for (let y = y3; y > y2; y -= 2) PIX.rect(c, x, y, 1, 1, 'd4'); PIX.text(c, '×', x - 1, (y2 + y3) / 2 - 1, 'r2', { shadow: null }); }
  }
}
function card(c, t) {
  const tS4 = 14 + t, fade = K.lin(t, 6.5, 7.0);
  if (fade < 1) {
    S4.plot(c, tS4, { t0: 9.4, marker: t < 2.3 ? S4.phiAt(tS4) : null, levels: (cc) => levels(cc, t), inductor: t < 2.3 });
    if (t > 5.0) CAP.note(c, t, { x: 135, y: 298, text: 'ONLY |0⟩ ↔ |1⟩ MATCH 5.0 GHz', t0: 5.05, t1: 6.4, align: 'center', col: 'o2', box: true });
    if (fade > 0) K.dith(c, 12, 292, 246, 168, 'k', fade);
  }
  if (fade >= 1 && t < 7.7) K.dith(c, 12, 292, 246, 168, 'k', 1 - K.lin(t, 7.0, 7.6));
  // the two qubit levels fly to the poles of the Bloch sphere
  if (t > 6.5 && t < T_SPH + 0.3) {
    const p = MO.cubicInOut(K.lin(t, 6.55, T_SPH)), el = 0.32;
    for (const [n, pole] of [[0, -1], [1, 1]]) {
      const E = JN.level(n), x0 = S4.px(Math.acos(-E)) + 3, y0 = S4.py(E) - 3;
      const x1 = SPH.cx - 5, y1 = pole < 0 ? SPH.cy - SPH.R * 1.2 * Math.cos(el) - 9 : SPH.cy + SPH.R * 1.2 * Math.cos(el) + 2;
      PIX.text(c, KET(n), lerp(x0, x1, p), lerp(y0, y1, p), 'w');
    }
  }
  if (t >= T_SPH) {
    const pop = MO.backOut(K.lin(t, T_SPH, T_SPH + 0.4), 1.5);
    BL.sphere(c, { cx: SPH.cx, cy: SPH.cy, R: SPH.R * pop, az: window.S05.azAt(t), el: 0.32, vec: [0, 0, 1], labels: t > T_SPH + 0.25 });
    if (t > T_SPH + 0.5) { const n = CAP.typed('QUBIT IN |0⟩', t, T_SPH + 0.5); PIX.text(c, 'QUBIT IN |0⟩', SPH.cx, SPH.cy + SPH.R + 30, 'd8', { align: 'center', n }); }
  }
}
// ---------- schematic: junction (boxed X) in parallel with a capacitor ----------
function schematic(c, x, y, a) {
  if (a <= 0) return;
  const col = 'd9', L = (x0, y0, x1, y1) => PIX.bline(c, x0, y0, x1, y1, col);
  L(x, y, x + 34, y); L(x, y + 30, x + 34, y + 30); L(x, y, x, y + 9); L(x, y + 21, x, y + 30); L(x + 34, y, x + 34, y + 12); L(x + 34, y + 18, x + 34, y + 30);
  PIX.rect(c, x - 5, y + 9, 11, 12, 'k'); L(x - 5, y + 9, x + 5, y + 9); L(x - 5, y + 20, x + 5, y + 20); L(x - 5, y + 9, x - 5, y + 20); L(x + 5, y + 9, x + 5, y + 20);
  L(x - 5, y + 9, x + 5, y + 20); L(x + 5, y + 9, x - 5, y + 20);                                         // junction ⊠
  PIX.rect(c, x + 28, y + 12, 13, 1, 'b3'); PIX.rect(c, x + 28, y + 17, 13, 1, 'b3');                   // capacitor
  PIX.text(c, 'JJ', x - 4, y + 34, 'y3', { shadow: null }); PIX.text(c, 'C', x + 32, y + 34, 'b3', { shadow: null });
}
SC['s05_transmon'] = {
  draw(c, t, S) {
    const cam = camAt(t), zmm = cam.z * MM;
    K.cam(c, cam);
    c.save(); c.translate(C0[0], C0[1]); c.scale(MM, MM);
    CH.draw(c, { z: zmm, hl: new Set([QI]), drive: t > 4.6 ? new Set([QI]) : null });
    // the calibrated pulse on the drive line
    if (t > T_PULSE) { const d = pulseD(t); CH.pulse(c, drive, d / DL, { sig: 0.16, amp: 0.035, lam: 0.06, z: zmm, t }); }
    c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const [qx, qy] = K.S(cam, ...room(Q.x, Q.y)), [jx, jy] = K.S(cam, ...room(Q.x, JY));
    FX.spot(c, qx, qy, 64, 150, 0.62 * K.sm(t, 3.0, 5.0));
    if (t > T_ARRIVE - 0.35) FX.glowL(c, qx - CH.ARM * zmm, qy, 18, ['o0', 'o1', 'o2'], K.lin(t, T_ARRIVE - 0.35, T_ARRIVE) * 0.9, 1.3);
    // bubble with the cross-section, a leader to the junction
    const B = bubble(t);
    if (B.r > 1) {
      const cn = { x: S4.camAt(14).x, y: S4.BYM - (B.y - H / 2) / B.z, z: B.z };
      c.save(); c.beginPath(); c.arc(B.x, B.y, B.r, 0, U.TAU); c.clip();
      S4.world(c, 14 + t, { x: cn.x + (W / 2 - B.x) / B.z, y: cn.y, z: B.z });
      S4.electrons(c, 14 + t, { x: cn.x + (W / 2 - B.x) / B.z, y: cn.y, z: B.z }, { a: 0.55, every: 3, links: false, phi: S4.phiAt(14 + t) });
      c.restore();
      if (B.r < 300) {
        FX.ring(c, B.x, B.y, B.r + 1, 'k'); FX.ring(c, B.x, B.y, B.r, 'd8');
        const ang = Math.atan2(jy - B.y, jx - B.x);
        if (t > 1.0) PIX.bline(c, B.x + Math.cos(ang) * (B.r + 1), B.y + Math.sin(ang) * (B.r + 1), jx, jy, 'd8');
        PIX.rect(c, Math.round(jx) - 1, Math.round(jy) - 1, 3, 3, 'w');
      }
    }
    // labels
    if (t > 1.4 && t < 4.9) CAP.note(c, t, { x: 208, y: 64, text: 'JOSEPHSON JUNCTION', t0: 1.5, t1: 4.35, align: 'center', col: 'y4', box: true });
    if (t > 2.5 && t < 4.9) { CAP.note(c, t, { ax: qx + CH.ARM * zmm * 0.8, ay: qy - 2, x: 252, y: 196, text: 'CAPACITOR PAD', t0: 2.6, t1: 4.35, align: 'right', col: 'b3', box: true }); }
    if (t > 3.0 && t < 4.8) { const a = K.lin(t, 3.0, 3.3) * (1 - K.lin(t, 4.35, 4.6)); schematic(c, 206, 226, a); const n = CAP.typed('TRANSMON', t, 3.1, 4.4); if (n) { PIX.rect(c, 196, 212, 52, 11, 'k'); PIX.text(c, 'TRANSMON', 198, 214, 'w', { n }); } }
    if (t > 5.0 && t < 8.6) { const [lx, ly] = K.S(cam, ...room(Q.x - 1.0, Q.y - 0.18)); CAP.note(c, t, { ax: lx, ay: ly, x: 14, y: 236, text: 'MICROWAVE DRIVE LINE', t0: 5.15, t1: 8.3, col: 'o2', box: true }); }
    if (t > T_PULSE + 0.3) { const [lx, ly] = K.S(cam, ...room(Q.x - 1.2, Q.y - 0.18)); CAP.note(c, t, { x: 14, y: 236, text: 'CALIBRATED PULSE', t0: T_PULSE + 0.4, t1: 10.7, col: 'o2', box: true }); if (t < 10.9) { const n = CAP.typed('5.0 GHz · 30 ns', t, T_PULSE + 0.9, 10.75); if (n) { PIX.rect(c, 12, 246, 84, 11, 'k'); PIX.text(c, '5.0 GHz · 30 ns', 14, 248, 'd8', { n }); } } }
    card(c, t);
    CAP.scene(c, t, { title: 'QUANTUM STATES', t0: 0.2, acc: 'p2' });
  },
  cues: () => {
    const q = [[0, 'pull', 0.8, 0, 1.6], [0.2, 'type', 0.4], [1.5, 'type', 0.3], [2.6, 'type', 0.3], [3.1, 'type', 0.3]];
    for (let n = 0; n < 4; n++) q.push([2.4 + n * 0.28, 'level', 0.7, 0.2, n]);
    q.push([4.4, 'swish', 0.5, 0], [4.9, 'zap', 0.6, -0.2], [5.15, 'type', 0.3], [6.55, 'swish', 0.5, 0], [T_SPH, 'pop', 0.8, 0], [T_PULSE, 'riser', 0.8, 0, T_ARRIVE - T_PULSE], [T_PULSE + 0.4, 'type', 0.3]);
    return q;
  },
};
})();
