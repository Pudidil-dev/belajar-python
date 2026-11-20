// S03 SUPERCONDUCTIVITY (17–30 s): inside the refrigerator. The camera tracks down past the cooling stages while the
// thermometer falls 300 K → 50 K → 4 K → 1 K → 100 mK → 15 mK, and the colder plates glitter with frost-blue light.
// At the mixing-chamber plate it pushes into the processor, one qubit's aluminium arm, the film's crystal grains and
// finally the lattice of aluminium ions. Below 1.2 K the conduction electrons condense: electrons with opposite momenta
// become correlated as Cooper pairs whose partners are far apart and whose pairs overlap one another (not tight
// orbiting couples), all sharing one quantum phase — so the whole electron fluid drifts without scattering.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, h = U.hash, TAU = U.TAU;
const io = MO.sineInOut;
const MM = FR.FS / 10, C0 = FR.toRoom(0, FR.PKG.y + FR.PKG.h / 2);
const Q = CH.Q[12], ARMPT = [Q.x + 0.22, Q.y + 0.02];             // target on the featured qubit's right arm (chip mm)
const TGT = [C0[0] + ARMPT[0] * MM, C0[1] + ARMPT[1] * MM];         // the same point in room px
const PLY = FR.PLATES.map(p => FR.FY0 + p[0] * FR.FS);              // plate heights (room px)
const TEMPS = [300, 50, 4, 1, 0.1, 0.015], TLAB = ['300 K', '50 K', '4 K', '1 K', '100 mK', '15 mK'];
const T_ARR = 4.0, T_LAT = 9.9, Z0 = 4;
// ---------- camera ----------
const yAt = t => lerp(52, PLY[5], io(clamp(t / T_ARR)));
const L0 = Math.log(Z0 * MM), LARM = Math.log(150), LEND = Math.log(16 / NANO.A * 1e6);   // ends with 16 px between ions
const LZ = t => {                                                    // log zoom in px per mm
  if (t < T_ARR) return L0;
  if (t < 6.0) return lerp(L0, LARM, io((t - T_ARR) / (6.0 - T_ARR)));
  if (t < 6.5) return LARM + 0.15 * (t - 6.0) / 0.5;
  return lerp(LARM + 0.15, LEND, io(clamp((t - 6.5) / (T_LAT - 6.5))));
};
const roomCam = t => {
  if (t < T_ARR) return { x: 135, y: yAt(t), z: Z0 };
  const z = Math.exp(LZ(t)) / MM, s0y = H / 2 + (TGT[1] - PLY[5]) * Z0, s0x = W / 2 + (TGT[0] - 135) * Z0;
  const u = MO.cubicInOut(clamp((t - T_ARR) / 2.0)), sx = lerp(s0x, W / 2, u), sy = lerp(s0y, H / 2, u);
  return { x: TGT[0] - (sx - W / 2) / z, y: TGT[1] - (sy - H / 2) / z, z };
};
// plate pass times: when each plate crosses the middle of the frame
const PASS = PLY.map(py => { for (let t = 0; t <= T_ARR; t += 1 / 240) if (yAt(t) >= py - 0.01) return t; return T_ARR; });
const tempAt = t => {
  let i = 0; for (let k = 0; k < 6; k++) if (t >= PASS[k]) i = k;
  if (i === 0) return TEMPS[0];
  const p = MO.cubicOut(clamp((t - PASS[i]) / 0.3));
  return Math.exp(lerp(Math.log(TEMPS[i - 1]), Math.log(TEMPS[i]), p));
};
const fmtT = T => T >= 0.9995 ? `${Math.round(T)} K` : `${Math.round(T * 1000)} mK`;
// ---------- the nano world: a point inside one grain, a few tens of nm from its boundaries ----------
const NT = (() => {
  const s = NANO.seed(0, 0); let best = null;
  for (let k = 0; k < 60; k++) {
    const p = [s[0] + (h(k, 91) - 0.5) * 120, s[1] + (h(k, 92) - 0.5) * 120];
    let d1 = 1e9, d2 = 1e9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const q = NANO.seed(i, j), d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    const bd = (d2 - d1) / 2; if (bd > 22 && bd < 34 && (!best || Math.abs(bd - 28) < best[1])) best = [p, Math.abs(bd - 28)];
  }
  return best ? best[0] : s;
})();
const nanoCam = t => {                                                // nm camera, matching the room camera's target
  const rc = roomCam(t), zn = Math.exp(LZ(t)) / 1e6, [sx, sy] = K.S(rc, ...TGT);
  const drift = t > T_LAT ? (t - T_LAT) * 0.05 : 0;
  return { x: NT[0] - (sx - W / 2) / zn, y: NT[1] - (sy - H / 2) / zn + drift, z: zn };
};
// ---------- electrons in the lattice (screen px relative to the lattice view at T_LAT) ----------
const NE = 32, TD = 11.9, VD = 30, TAU_S = 0.28, T0E = 9.3;
const EL = [];
for (let k = 0; k < NE; k++) {
  const gx = k % 4, gy = Math.floor(k / 4);
  EL.push({ x0: 18 + gx * 68 + h(k, 1) * 44, y0: 30 + gy * 54 + h(k, 2) * 40, sp: 42 + h(k, 3) * 18, ph0: h(k, 4) * TAU, w: 2 + 2.5 * h(k, 6), s0: T0E - h(k, 7) * TAU_S });
}
const PAIRS = [];
for (let k = 0; k < 16; k++) {
  const a = k, b = (k + 16 + (k % 4 < 2 ? 2 : -2) + 32) % 32, th = h(k, 8) * TAU, tp = 10.3 + 0.075 * k;
  PAIRS.push({ a, b, tp, v: [22 * Math.cos(th), 22 * Math.sin(th)] });
  EL[a].pair = PAIRS[k]; EL[a].sg = 1; EL[b].pair = PAIRS[k]; EL[b].sg = -1;
}
const walk = (e, k, t) => {                                          // normal-state random walk with scattering kinks
  let x = e.x0, y = e.y0, s = e.s0, n = 0;
  if (t < s) return [x, y];
  while (s + TAU_S <= t) { const th = h(k * 37 + n, 5) * TAU; x += e.sp * Math.cos(th) * TAU_S; y += e.sp * Math.sin(th) * TAU_S; s += TAU_S; n++; }
  const th = h(k * 37 + n, 5) * TAU; return [x + e.sp * Math.cos(th) * (t - s), y + e.sp * Math.sin(th) * (t - s)];
};
const driftAt = t => { if (t <= TD) return 0; const u = (t - TD) / 0.5; return VD * (u < 1 ? 0.5 * (u ** 3 - u ** 4 / 2) : t - TD - 0.25); };
const elecPos = (k, t) => {
  const e = EL[k], tp = e.pair.tp;
  if (t <= tp) return walk(e, k, t);
  const [x, y] = walk(e, k, tp), d = driftAt(t);
  return [x + e.sg * e.pair.v[0] * (t - tp), y + e.sg * e.pair.v[1] * (t - tp) + d];
};
const SYNC = t => MO.smooth(clamp((t - 11.0) / 0.7));
const phaseOf = (k, t) => { const e = EL[k]; return lerp(e.ph0 + e.w * t, 2.2 * t, SYNC(t)); };
window.S03 = { roomCam, nanoCam, elecPos, phaseOf, PAIRS, EL, T_LAT, NT, TGT };

// drawn as world-space tiles (each tile = this frame at T_LAT), so the field continues wherever the camera goes.
// o = {a: density 0..1, phi: phase difference between the two electrodes, hide: [y0, y1] band without electrons
//      (nm), mid: y of the junction, every: keep every n-th electron, links: draw pair correlations}
const ZL = Math.exp(LEND) / 1e6, TW = W / ZL, TH = H / ZL;            // lattice zoom (px/nm) and tile size (nm)
function electrons(c, t, cam, o = {}) {
  const CL = nanoCam(T_LAT), a = o.a ?? 1, phi = o.phi || 0, every = o.every || 1;
  const iz = 1 / cam.z, x0 = cam.x - (W / 2 + 12) * iz, x1 = cam.x + (W / 2 + 12) * iz, y0 = cam.y - (H / 2 + 12) * iz, y1 = cam.y + (H / 2 + 12) * iz;
  const pos = EL.map((e, k) => { const [sx, sy] = elecPos(k, t); return [CL.x + (sx - W / 2) / ZL, CL.y + (sy - H / 2) / ZL]; });
  const sz = cam.z > 25 ? 3 : cam.z > 11 ? 2 : 1, NL = sz === 3 ? 10 : sz === 2 ? 8 : 6;
  for (let tj = Math.floor((y0 - CL.y) / TH) - 1; tj <= Math.ceil((y1 - CL.y) / TH) + 1; tj++) for (let ti = Math.floor((x0 - CL.x) / TW) - 1; ti <= Math.ceil((x1 - CL.x) / TW) + 1; ti++) {
    const ox = ti * TW, oy = tj * TH;
    const vis = k => { const y = pos[k][1] + oy; if (o.hide && y > o.hide[0] && y < o.hide[1]) return false; return k % every === 0 && (a >= 1 || h(k * 7 + ti * 3 + 50, tj * 5 + 11) < a); };
    const S_ = k => NANO.S(cam, pos[k][0] + ox, pos[k][1] + oy);
    if (cam.z > 20 && o.links !== false) for (const p of PAIRS) {
      if (t < p.tp || !vis(p.a) || !vis(p.b)) continue;
      const [ax, ay] = S_(p.a), [bx, by] = S_(p.b);
      if (Math.max(ax, bx) < 0 || Math.min(ax, bx) > W || Math.max(ay, by) < 0 || Math.min(ay, by) > H) continue;
      const L = Math.hypot(bx - ax, by - ay), g = MO.cubicOut(clamp((t - p.tp) / 0.3)), nx = -(by - ay) / L, ny = (bx - ax) / L, br = Math.cos(5 * t + p.a);
      for (let s = 5; s < L * g - 5; s += 1) {
        if (Math.floor(s) % 4 === 3) continue;
        const sn = Math.sin(Math.PI * 3 * s / L), off = 2.5 * sn * br;
        PIX.rect(c, Math.round(ax + (bx - ax) * s / L + nx * off), Math.round(ay + (by - ay) * s / L + ny * off), 1, 1, Math.abs(sn) > 0.8 && br > 0.2 ? 'p3' : 'p2');
      }
    }
    for (let k = 0; k < NE; k++) {
      if (!vis(k)) continue;
      const [x, y] = S_(k); if (x < -12 || y < -12 || x > W + 12 || y > H + 12) continue;
      if (t > EL[k].pair.tp - 0.2 || SYNC(t) > 0) {
        const top = o.mid == null || pos[k][1] + oy < o.mid, ph = phaseOf(k, t) + (top ? phi / 2 : -phi / 2), cx = Math.cos(ph), cy = Math.sin(ph);
        PIX.bline(c, x + cx * (sz + 1), y + cy * (sz + 1), x + cx * NL, y + cy * NL, 'p2'); PIX.bline(c, x + cx * (NL - 3), y + cy * (NL - 3), x + cx * NL, y + cy * NL, 'p3');
      }
      FX.e(c, x, y, sz);
      if (t < EL[k].pair.tp && t > T0E) { const s = K.wrap(t - EL[k].s0, TAU_S); if (s < 0.05) FX.flash(c, x, y, 4, 'c3'); }
    }
  }
}
window.S03.electrons = electrons;
// ---------- HUD ----------
function hud(c, t) {
  CAP.scene(c, t, { title: 'SUPERCONDUCTIVITY', t0: 0.15, acc: 'b2' });
  const T = tempAt(t), s = fmtT(T), cold = clamp(Math.log(300 / T) / Math.log(300 / 0.015));
  const col = cold < 0.15 ? 'o1' : cold < 0.4 ? 'y3' : cold < 0.7 ? 'da' : 'b3';
  PIX.rect(c, 14, 60, 90, 22, 'd3'); PIX.rect(c, 15, 61, 88, 20, 'k');
  PIX.text(c, 'T', 18, 64, 'd7', { shadow: null });
  PIX.text(c, s, 100, 64, col, { sc: 2, align: 'right', shadow: null });
  if (t > 9.6) { const n = CAP.typed('BELOW Tc = 1.2 K', t, 9.7); if (n > 0) { PIX.rect(c, 14, 84, PIX.textWidth('BELOW Tc = 1.2 K') + 6, 11, 'k'); PIX.text(c, 'BELOW Tc = 1.2 K', 17, 86, 'b3', { n }); } }
  // stage indicator, like a lift: all six plates, the current one lit
  const a = t < 6.0 ? 1 : 0;
  if (a) {
    let cur = 0; for (let k = 0; k < 6; k++) if (t >= PASS[k]) cur = k;
    PIX.rect(c, 212, 41, 54, 68, 'd3'); PIX.rect(c, 213, 42, 52, 66, 'k');
    TLAB.forEach((lab, k) => {
      const y = 44 + k * 11, on = k === cur && t >= PASS[0] - 0.2;
      PIX.text(c, lab, 256, y, on ? 'b3' : k < cur ? 'd6' : 'd4', { align: 'right' });
      if (on) PIX.rect(c, 260, y + 2, 3, 3, 'b3');
    });
  }
}
// frost glitter on the plates already passed (the colder, the more)
function frost(c, t, cam) {
  FR.PLATES.forEach(([py, hw], i) => {
    if (i === 0 || t < PASS[i]) return;
    const n = 14 + i * 12, ry = hw * 0.17, g = clamp((t - PASS[i]) / 0.4);
    for (let k = 0; k < n * g; k++) {
      const x = (h(k, i * 7 + 1) * 2 - 1) * hw * 0.92, y = py + (h(k, i * 7 + 2) * 2 - 1) * ry * 0.8;
      const tw = Math.sin(t * (3 + 5 * h(k, i * 7 + 3)) + 9 * h(k, i * 7 + 4)); if (tw < 0.4) continue;
      const [sx, sy] = K.S(cam, ...FR.toRoom(x, y)), X = Math.round(sx), Y = Math.round(sy), L = tw > 0.95 ? 2 : tw > 0.75 ? 1 : 0;
      if (L) { PIX.rect(c, X - L, Y, 2 * L + 1, 1, 'b3'); PIX.rect(c, X, Y - L, 1, 2 * L + 1, 'b3'); }
      PIX.rect(c, X, Y, 1, 1, L ? 'w' : 'b3');
    }
  });
}
const armMask = cam => {                                             // screen rect of the arm (room camera)
  const [x0, y0] = K.S(cam, C0[0] + (Q.x - CH.ARM) * MM, C0[1] + (Q.y - CH.AW / 2) * MM), [x1, y1] = K.S(cam, C0[0] + (Q.x + CH.ARM) * MM, C0[1] + (Q.y + CH.AW / 2) * MM);
  return (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
};
function hardware(c, t) {
  const cam = roomCam(t), zmm = cam.z * MM;
  K.cam(c, cam);
  FR.room(c, { t: t + 17 });
  c.setTransform(1, 0, 0, 1, 0, 0);
  const cold = t < T_ARR ? clamp(yAt(t) / PLY[5]) : 1;
  K.dith(c, 0, 0, W, H, 'b0', 0.15 + 0.45 * cold);
  K.cam(c, cam);
  c.save(); c.translate(FR.FX0, FR.FY0); c.scale(FR.FS, FR.FS);
  const chipFn = (cc, z) => { cc.save(); cc.scale(0.1, 0.1); CH.draw(cc, { z: z / 10 }); cc.restore(); };
  FR.draw(c, { z: cam.z * FR.FS, t: t + 17, chipFn, signal: 0.5, glowMXC: 0.35 * clamp((t - 3.4) / 1.2) });
  c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
  frost(c, t, cam);
  if (zmm > 6000) NANO.grains(c, nanoCam(t), K.sm(Math.log(zmm), Math.log(6000), Math.log(16000)), armMask(cam));
}
SC['s03_cold'] = {
  draw(c, t, S) {
    const zmm = Math.exp(LZ(t));
    if (zmm < 2.5e4) hardware(c, t);
    else {
      const cam = nanoCam(t), p = K.sm(Math.log(zmm), Math.log(3e6), Math.log(1.2e7));
      const lat = cc => { PIX.rect(cc, 0, 0, W, H, 'k'); NANO.lattice(cc, cam, { t, amp: 0.012 }); };
      if (p <= 0) NANO.grains(c, cam); else if (p >= 1) lat(c); else window.dissolve(c, cc => NANO.grains(cc, cam), lat, p);
      if (t > T0E) electrons(c, t, cam);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    // labels
    if (t < 1.6) { const cam = roomCam(t), [ax, ay] = K.S(cam, ...FR.toRoom(-3, -18)); CAP.note(c, t, { ax, ay, x: 252, y: 150, text: 'PULSE-TUBE COOLER', t0: 0.4, t1: 1.45, align: 'right', col: 'd9', box: true }); }
    if (t > 3.1 && t < 4.7) { const cam = roomCam(t), [ax, ay] = K.S(cam, ...FR.toRoom(6, 131)); CAP.note(c, t, { ax, ay, x: 252, y: 300, text: 'MIXING CHAMBER', t0: 3.25, t1: 4.45, align: 'right', col: 'b3', box: true }); }
    if (t > 5.6 && t < 7.2) { const cam = roomCam(t), [ax, ay] = K.S(cam, C0[0] + (Q.x + 0.3) * MM, C0[1] + (Q.y + 0.03) * MM); CAP.note(c, t, { ax, ay, x: 252, y: 330, text: 'ALUMINIUM CIRCUIT', t0: 5.7, t1: 6.75, align: 'right', col: 'b3', box: true }); }
    if (t > 7.6 && t < 9.2) CAP.note(c, t, { x: 135, y: 410, text: 'METAL CRYSTAL GRAINS', t0: 7.7, t1: 8.95, align: 'center', col: 'b3', box: true });
    if (t > T0E - 0.1) {
      CAP.note(c, t, { x: 12, y: 412, text: 'ELECTRONS + Al IONS', t0: 9.5, t1: 10.25, col: 'c3', box: true });
      CAP.note(c, t, { x: 12, y: 412, text: 'ELECTRONS PAIR UP', t0: 10.45, col: 'p3', box: true });
      CAP.note(c, t, { x: 12, y: 424, text: 'ONE SHARED PHASE', t0: 11.1, col: 'p3', box: true });
      CAP.note(c, t, { x: 12, y: 436, text: 'ZERO RESISTANCE', t0: 11.95, col: 'c3', box: true });
    }
    hud(c, t);
  },
  cues: () => {
    const q = [[0, 'cold_amb', 0.9, 0, 13], [0.15, 'type', 0.4], [0.4, 'blip', 0.4, 0.5]];
    PASS.forEach((tp, i) => { if (i > 0) q.push([Math.round(tp * 8) / 8, 'stage', 0.8, (i % 2 ? 0.25 : -0.25), i]); });
    q.push([3.25, 'blip', 0.4, 0.5], [T_ARR, 'push', 0.9, 0, 2.0], [5.7, 'shimmer', 0.6, 0], [6.5, 'push', 0.8, 0, 3.4], [T_LAT - 0.1, 'land', 0.8, 0]);
    for (const p of PAIRS) if (PAIRS.indexOf(p) % 3 === 0) q.push([Math.round(p.tp * 8) / 8, 'pair', 0.5, (h(p.a, 3) - 0.5) * 0.8]);
    q.push([11.0, 'sync', 0.8, 0], [11.95, 'flow', 0.7, 0, 1.0]);
    return q;
  },
};
})();
