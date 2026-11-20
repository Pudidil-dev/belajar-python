// S05 ENTER THE GANTRY (16–20 s): behind the gantry, its ivory cover turns see-through: the X-ray tube at the top of the
// rotating frame, the curved detector array opposite, the head in the bore between them. Tube and detector turn a little
// together (the patient does not move; the housing does not move). A tracking box selects the tube, and the camera swings
// to its side and pushes into the housing (S06 opens it).
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const coverAt = t => 1 - 0.94 * MO.smooth(clamp((t - 0.1) / 0.8));
const spinAt = t => -0.55 + 0.55 * MO.smooth(clamp((t - 0.2) / 1.6));
const swing = t => MO.k75(clamp((t - 2.1) / 1.9));
const camAt = t => {
  const s = swing(t), push = MO.smooth(clamp(t / 2.0));
  if (s <= 0) return ROOM.camera([0, lerp(60, 120, push), lerp(2350, 2150, push)], [0, lerp(0, 40, push), 0], [0, 1, 0], 300);
  const az = lerp(Math.PI, Math.PI / 2, s), dist = Math.exp(lerp(Math.log(Math.hypot(120, 2150)), Math.log(420), s)), T = [0, lerp(40, 610, MO.smooth(clamp((t - 2.2) / 1.5))), 0];
  return ROOM.orbit(T, dist, az, lerp(0.05, 0, s), 300);
};
window.S05 = { camAt };
function fan(c, C, phi, a) {
  if (a <= 0) return;
  const [S, A, B] = ROOM.fan(phi).map(([x, y]) => ROOM.proj(C, [x, y, 0]));
  if (!S || !A || !B) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const img = c.getImageData(0, 0, W, H), d = img.data, cy = PIX.hex(PIX.P.y2);
  const sgn = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]), s0 = sgn(S, A, B);
  const x0 = Math.max(0, Math.floor(Math.min(S[0], A[0], B[0]))), x1 = Math.min(W, Math.ceil(Math.max(S[0], A[0], B[0])));
  const y0 = Math.max(0, Math.floor(Math.min(S[1], A[1], B[1]))), y1 = Math.min(H, Math.ceil(Math.max(S[1], A[1], B[1])));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const P_ = [x + 0.5, y + 0.5];
    if (Math.sign(sgn(S, A, P_)) !== Math.sign(s0) || Math.sign(sgn(A, B, P_)) !== Math.sign(s0) || Math.sign(sgn(B, S, P_)) !== Math.sign(s0)) continue;
    if (K.BAY(x, y) > 0.14 * a) continue;
    const i = (y * W + x) * 4; d[i] = cy[0]; d[i + 1] = cy[1]; d[i + 2] = cy[2];
  }
  c.putImageData(img, 0, 0); c.restore();
  c.save(); c.globalAlpha = a; PIX.bline(c, S[0], S[1], A[0], A[1], 'y3'); PIX.bline(c, S[0], S[1], B[0], B[1], 'y3'); c.restore();
}
SC['s05_gantry'] = {
  draw(c, t, S) {
    const C = camAt(t), phi = spinAt(t), s = swing(t);
    PIX.rect(c, 0, 0, W, H, 'k');
    const img = K.pbegin(c);
    ROOM.render(img, C, { t: S.t, cover: coverAt(t), body: lerp(1, 0.3, MO.smooth(clamp((t - 0.1) / 0.8))), head: 1, spin: phi, frame: true, tz: 0,
      cutX: s > 0 ? lerp(1300, 110, MO.smooth(clamp(s * 1.3))) : 1e9, led: 1 });
    K.pend(c, img);
    c.setTransform(1, 0, 0, 1, 0, 0);
    fan(c, C, phi, MO.smooth(clamp((t - 0.9) / 0.3)) * (1 - MO.smooth(clamp((t - 2.0) / 0.25))));
    // tracking box on the tube housing (2-px corners, cyan), 1.5–2.6 s
    const tb = ROOM.proj(C, [-Math.sin(phi) * 610, Math.cos(phi) * 610, 0]);
    const ta = MO.smooth(clamp((t - 1.45) / 0.2)) * (1 - MO.smooth(clamp((t - 2.7) / 0.2)));
    if (tb && ta > 0) {
      const r = Math.round(lerp(30, 22, MO.smooth(clamp((t - 1.45) / 0.4)))), x = Math.round(tb[0]), y = Math.round(tb[1]);
      c.save(); c.globalAlpha = ta;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { PIX.rect(c, x + sx * r - (sx > 0 ? 6 : 0), y + sy * r - (sy > 0 ? 1 : 0), 7, 2, 'c3'); PIX.rect(c, x + sx * r - (sx > 0 ? 1 : 0), y + sy * r - (sy > 0 ? 6 : 0), 2, 7, 'c3'); }
      c.restore();
    }
    const det = ROOM.proj(C, [Math.sin(phi) * 470, -Math.cos(phi) * 470, 0]);
    if (det) CAP.part(c, t, { text: 'DETEKTOR', ax: det[0], ay: det[1] + 8, x: 30, y: 548, t0: 0.9, t1: 2.1, col: 'e3', lineCol: 'g7' });
    CAP.ctx(c, t, { text: 'RENTGEN MƏNBƏYİ', t0: 1.45, t1: 3.65 });
  },
  cues: [[0.1, 'cover_fade', 0.7, 0, 0.8], [0.2, 'spin_motor', 0.6, 0, 1.6], [0.9, 'tag', 0.5, -0.3], [0.9, 'hw_on', 0.6, 0], [1.45, 'lock', 0.8, 0], [1.45, 'type', 0.4], [2.1, 'swing', 0.7, 0, 1.9], [2.2, 'hum_rise', 0.8, 0, 1.8]],
  xin: 0.3,
};
})();
