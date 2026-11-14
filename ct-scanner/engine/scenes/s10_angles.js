// S10 MANY ANGLES PROVIDE SPATIAL INFORMATION (65–73 s): the whole gantry face-on, the head in the bore. The fan crosses the
// head; along the detector arc the transmitted intensity I/I₀ shows as light and shadow (a profile, computed from HEAD).
// The frame turns: at 0°, 45°, 90°, 135°, 180° … each profile is different (the head is seen from another side) and is
// captured into a stack of data beside the scanner. Then the rotation runs up toward full speed and the profiles pour in.
// (A real rotation takes ≈ 0.3 s and records ≈ 1,000 views; shown slowed.)
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp, TAU = U.TAU;
const DEG = Math.PI / 180;
// gantry angle: steps of 45° with short holds, then a run-up
const STOPS = [0, 45, 90, 135, 180, 225, 270, 315, 360].map(d => d * DEG);
const betaAt = t => {
  if (t < 1.0) return 0;
  if (t < 5.4) { const u = (t - 1.0) / 1.1, k = Math.floor(u), f = u - k; return k >= 4 ? STOPS[4] : lerp(STOPS[k], STOPS[k + 1], MO.cubicInOut(clamp(f / 0.62))); }
  // run-up: from 180° on, accelerating
  const u = t - 5.4; return STOPS[4] + 2.4 * u * u + 1.2 * u;
};
const capT = [1.0, 2.1, 3.2, 4.3, 5.4];                               // capture times (at 0°, 45°, 90°, 135°, 180°)
const NCH = 72;
const profileAt = beta => { const p = new Float32Array(NCH); for (let j = 0; j < NCH; j++) p[j] = CT.lineInt(beta, (j + 0.5 - NCH / 2) * (2 * CT.FAN / NCH), 1.4); return p; };
const PROF = new Map();
const prof = beta => { const key = Math.round(beta / DEG * 2); if (!PROF.has(key)) { if (PROF.size > 400) PROF.clear(); PROF.set(key, profileAt(key / 2 * DEG)); } return PROF.get(key); };
const camAt = t => ({ x: 0, y: 20, s: lerp(0.2, 0.19, MO.smooth(clamp((t - 6.0) / 1.5))), cx: 135, cy: lerp(214, 206, MO.smooth(clamp((t - 6.0) / 1.5))) });
// the data stack panel (bottom): one strip per captured profile, then a stream of thin ones
const PAN = { x: 26, y: 352, w: 218, rowH: 4 };
function strip(c, p, x, y, w, hgt, a = 1) {
  const R = CT.ramps().blue;
  PIX.rect(c, Math.round(x), y, Math.round(w), hgt, 'n1');
  for (let j = 0; j < NCH; j++) { const v = clamp(p[j] / 4.6), x0 = Math.round(x + j * w / NCH), x1 = Math.round(x + (j + 1) * w / NCH);
    for (let yy = 0; yy < hgt; yy++) for (let xx = x0; xx < x1; xx++) { if (v < 0.02 || (a < 1 && K.BAY(xx, y + yy) > a)) continue; const k = Math.max(1, Math.min(R.length - 1, Math.round(v * (R.length - 1) + K.BAY(xx, y + yy) - 0.5))); c.fillStyle = `rgb(${R[k].join(',')})`; c.fillRect(xx, y + yy, 1, 1); } }
}
SC['s10_angles'] = {
  draw(c, t, S) {
    const beta = betaAt(t), cam = camAt(t);
    PIX.rect(c, 0, 0, W, H, 'k');
    G2.ring(c, cam, 1);
    G2.table(c, cam, 1);
    G2.head(c, cam, {});
    G2.fan(c, cam, beta, 0.9);
    // the detector lights up with the transmitted intensity across the fan
    const p = prof(beta);
    G2.frame(c, cam, beta, { lit: u => Math.exp(-p[Math.min(NCH - 1, Math.floor(u * NCH))]) > 0.5 });
    // the profile itself, drawn just outside the detector arc: the longer the bar, the more X-ray got through
    c.setTransform(1, 0, 0, 1, 0, 0);
    for (let j = 0; j < NCH; j++) {
      const g = (j + 0.5 - NCH / 2) * (2 * CT.FAN / NCH), D = CT.det(beta, g), Do = CT.det(beta, g).map((v, i) => v + CT.rayDir(beta, g)[i] * (40 + 160 * Math.exp(-p[j])));
      const [ax, ay] = G2.S(cam, D[0] + CT.rayDir(beta, g)[0] * 40, D[1] + CT.rayDir(beta, g)[1] * 40), [bx, by] = G2.S(cam, ...Do);
      PIX.bline(c, ax, ay, bx, by, Math.exp(-p[j]) > 0.5 ? 'b3' : 'b1');
    }
    // captures fly into the stack
    const nCap = capT.filter(x => t >= x).length;
    for (let k = 0; k < nCap; k++) {
      const age = t - capT[k], pp = prof(STOPS[k]), y = PAN.y + k * (PAN.rowH + 1);
      if (age < 0.35) { const q = MO.cubicIn(age / 0.35), D = CT.det(STOPS[k], 0), [sx, sy] = G2.S(cam, ...D); strip(c, pp, lerp(sx - 40, PAN.x, q), Math.round(lerp(sy + 14, y, q)), lerp(80, PAN.w, q), PAN.rowH, 1); }
      else strip(c, pp, PAN.x, y, PAN.w, PAN.rowH);
    }
    // the run-up: thin strips pour in under the five
    if (t > 5.6) {
      const n = Math.min(40, Math.floor((t - 5.6) * 30));
      for (let k = 0; k < n; k++) { const b = STOPS[4] + (k + 1) * 4.5 * DEG; strip(c, prof(b), PAN.x, PAN.y + 5 * (PAN.rowH + 1) + k, PAN.w, 1); }
    }
    if (nCap > 0 || t > 0.8) { PIX.rect(c, PAN.x - 2, PAN.y - 2, PAN.w + 4, 1, 'g4'); PIX.text(c, 'PROJECTIONS', PAN.x, PAN.y - 11, 'g7', { shadow: null }); }
    // HUD: angle and acquisition
    const deg = Math.round(((beta / DEG) % 360 + 360) % 360);
    if (t > 0.6 && t < 7.85) {
      PIX.rect(c, 150, 98, 98, 25, 'k'); PIX.rect(c, 150, 98, 1, 25, 'g4');
      PIX.text(c, `ANGLE: ${String(deg).padStart(3, '0')}°`, 155, 101, 'w', { shadow: null });
      const recent = capT.some(x => t >= x && t < x + 0.7) || (t > 5.6 && Math.floor(t * 8) % 2 === 0);
      if (recent) PIX.text(c, 'PROJECTION ACQUIRED', 155, 112, 'e2', { shadow: null });
    }
    CAP.note(c, t, { x: 248, y: 300, text: 'SLOWED: ≈1,000 VIEWS PER TURN', t0: 5.5, t1: 7.8, col: 'g8', align: 'right', box: true });
    CAP.cap(c, t, { l1: 'PROJECTIONS', l2: ['MANY ANGLES PROVIDE', 'SPATIAL INFORMATION'], t0: 0.12, tSwap: 2.15, t1: 7.85, acc: 'b3' });
  },
  cues: () => {
    const q = [[1.0, 'motor_spin', 0.8, 0, 6.9]];
    capT.forEach((tt, k) => { q.push([tt, 'capture_click', 0.8, -0.2 + 0.1 * k, k]); if (k % 2 === 0) q.push([tt, 'milestone', 0.6, 0, k * 45]); });
    for (let k = 0; k < 40; k++) { const tt = 5.6 + k / 30; if (k % 4 === 0) q.push([Math.round(tt * 8) / 8, 'capture_tick', 0.3, 0.2]); }
    q.push([5.4, 'momentum_rise', 0.8, 0, 2.6]);
    return q;
  },
};
})();
