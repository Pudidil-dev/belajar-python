// S03 THE X-RAY TUBE ROTATES AROUND YOU (10–17 s): behind the gantry, its cover turns see-through: the X-ray tube on top
// with its high-voltage generator and cable, the filter/collimator under it, the curved detector array opposite, the
// electronics and cooling on the rotating drum, the table and the head in the bore. Tube and detector spin round the
// head together (third generation) while a fan of X-rays joins them; a dial counts 0° → 360°; the camera rolls with the
// frame. Then the camera swings to the side (the near half cut away) and pushes in to the tube housing (S04 opens it).
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const T0 = 10;
const coverAt = t => 1 - 0.94 * MO.smooth(clamp((t - 0.15) / 0.85));
const spinAt = t => TAU * MO.smooth(clamp((t - 2.0) / 3.0));
const rollW = t => MO.smooth(clamp((t - 2.5) / 0.6)) * (1 - MO.smooth(clamp((t - 4.35) / 0.6)));
const swing = t => MO.k75(clamp((t - 5.0) / 2.0));
const camAt = t => {
  const s = swing(t), push = MO.smooth(clamp(t / 2.0));
  if (s <= 0) {
    const C = ROOM.camera([0, lerp(60, 40, push), lerp(2250, 2080, push)], [0, 0, 0], [0, 1, 0], 300, spinAt(t) * rollW(t));
    return C;
  }
  // orbit from behind (az = π) to the patient's right side (az = π/2), rising to the tube and closing in
  const az = lerp(Math.PI, Math.PI / 2, s), dist = Math.exp(lerp(Math.log(Math.hypot(40, 2080)), Math.log(430), s)), T = [0, lerp(0, 610, MO.smooth(clamp((t - 5.2) / 1.6))), 0];
  return ROOM.orbit(T, dist, az, lerp(0.02, 0, s), 300);
};
window.S03 = { camAt, spinAt };
// the X-ray fan of the frame: a dithered golden wedge from the focal spot to the detector arc (screen space)
function fan(c, C, phi, a) {
  if (a <= 0) return;
  const [S, A, B] = ROOM.fan(phi).map(([x, y]) => ROOM.proj(C, [x, y, 0]));
  if (!S || !A || !B) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const img = c.getImageData(0, 0, W, H), d = img.data, cy = PIX.hex(PIX.P.y2), cb = PIX.hex(PIX.P.y3);
  const sgn = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const s0 = sgn(S, A, B);
  const x0 = Math.max(0, Math.floor(Math.min(S[0], A[0], B[0]))), x1 = Math.min(W, Math.ceil(Math.max(S[0], A[0], B[0])));
  const y0 = Math.max(0, Math.floor(Math.min(S[1], A[1], B[1]))), y1 = Math.min(H, Math.ceil(Math.max(S[1], A[1], B[1])));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const P = [x + 0.5, y + 0.5];
    if (Math.sign(sgn(S, A, P)) !== Math.sign(s0) || Math.sign(sgn(A, B, P)) !== Math.sign(s0) || Math.sign(sgn(B, S, P)) !== Math.sign(s0)) continue;
    if (K.BAY(x, y) > 0.16 * a) continue;
    const i = (y * W + x) * 4; d[i] = cy[0]; d[i + 1] = cy[1]; d[i + 2] = cy[2];
  }
  c.putImageData(img, 0, 0); c.restore();
  c.save(); c.globalAlpha = a; PIX.bline(c, S[0], S[1], A[0], A[1], 'y3'); PIX.bline(c, S[0], S[1], B[0], B[1], 'y3'); c.restore();
}
// the dial: a ring with a needle and the angle, top right inside the safe area
function dial(c, t, phi, a) {
  if (a <= 0) return;
  const x = 216, y = 128, r = 12, deg = Math.round(phi / TAU * 360) % 361;
  c.save(); c.globalAlpha = a;
  PIX.circ(c, x, y, r + 2, 'k'); FX.ring(c, x, y, r, 'g6', 1);
  for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2; PIX.rect(c, Math.round(x + Math.sin(an) * (r - 2)), Math.round(y - Math.cos(an) * (r - 2)), 1, 1, deg >= k * 90 + 1 || (k === 0 && deg > 0) ? 'y3' : 'g5'); }
  PIX.bline(c, x, y, x + Math.sin(phi) * (r - 3), y - Math.cos(phi) * (r - 3), 'y3');
  const s = String(deg).padStart(3, '0') + '°';
  PIX.rect(c, x - 15, y + r + 4, 31, 11, 'k'); PIX.text(c, s, x, y + r + 6, 'w', { align: 'center' });
  c.restore();
}
SC['s03_gantry'] = {
  draw(c, t, S) {
    const C = camAt(t), phi = spinAt(t), s = swing(t);
    PIX.rect(c, 0, 0, W, H, 'k');
    const img = K.pbegin(c);
    ROOM.render(img, C, { t: S.t, cover: coverAt(t), body: lerp(1, 0.3, MO.smooth(clamp((t - 0.15) / 0.85))), head: 1, spin: phi, frame: true, tz: 0,
      cutX: s > 0 ? lerp(1300, 110, MO.smooth(clamp(s * 1.3))) : 1e9, led: 1 });
    K.pend(c, img);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // X-rays on while the frame turns
    fan(c, C, phi, MO.smooth(clamp((t - 2.0) / 0.3)) * (1 - MO.smooth(clamp((t - 4.85) / 0.25))));
    // part labels (one at a time)
    const tube = ROOM.proj(C, ROOM.fan(phi)[0].concat(0)), arc = ROOM.proj(C, [0, -470, 0].map((v, i) => i === 1 ? ROOM.fan(phi)[0][1] - 1040 : v));
    const [fs, A, B] = ROOM.fan(phi), mid = ROOM.proj(C, [(A[0] + B[0]) / 2 * 1.02, (A[1] + B[1]) / 2 * 1.06, 0]);
    if (tube) CAP.note(c, t, { ax: tube[0], ay: tube[1] - 22, x: 30, y: 112, text: 'X-RAY TUBE', t0: 1.05, t1: 1.95, col: 'y3', lineCol: 'g7', box: true });
    if (mid) CAP.note(c, t, { ax: mid[0], ay: mid[1] + 6, x: 30, y: 352, text: 'DETECTORS', t0: 2.0, t1: 2.95, col: 'e3', lineCol: 'g7', box: true });
    dial(c, t, phi, MO.smooth(clamp((t - 1.9) / 0.2)) * (1 - MO.smooth(clamp((t - 5.0) / 0.25))));
    CAP.note(c, t, { x: 216, y: 160, text: 'SLOWED: 1 TURN ≈ 0.3 s', t0: 2.6, t1: 4.9, col: 'g8', align: 'right', box: true });
    CAP.cap(c, t, { l1: 'CT GANTRY', l2: ['THE X-RAY TUBE', 'ROTATES AROUND YOU'], t0: 0.15, tSwap: 2.0, t1: 6.6, acc: 'c3' });
  },
  cues: () => [[0.15, 'cover_fade', 0.7, 0, 0.85], [1.05, 'tag', 0.5, -0.3], [2.0, 'tag', 0.5, -0.3], [2.0, 'hw_on', 0.9, 0], [2.0, 'spin_motor', 0.9, 0, 3.0],
    [2.75, 'milestone', 0.6, 0.3, 90], [3.5, 'milestone', 0.6, 0.3, 180], [4.25, 'milestone', 0.6, 0.3, 270], [5.0, 'milestone', 0.8, 0.3, 360],
    [5.0, 'swing', 0.7, 0, 2.0], [6.5, 'push_in', 0.7, 0, 0.5]],
};
})();
