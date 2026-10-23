// S07 (39–47 s) — from signal to image. On the receiver trace a cursor runs down to the skull echo while a counter
// ticks the microseconds: arrival time is depth (sound goes down and back at 1540 m/s, so 13 µs per cm). A second
// pass turns the size of each echo into a brightness: the scan line as a column of gray pixels. That column flies into
// its place in the fan on the monitor, and line after line fills the fan (each line is one pulse sent and its echoes
// heard), faster and faster, while the camera pulls back to the whole monitor.
(() => {
const S = SC.s07_build = {}, R6 = SC.s06_receive, PX = R6.PX, LINE = 28;
const PH = US.phi(LINE);
const MID = ROOM.fanW((US.RP + 6) * Math.sin(PH), (US.RP + 6) * Math.cos(PH) - US.RP);
S.CAM0 = { x: MID[0] + 2.0, y: MID[1] + 1.0, z: 19 };
S.cam = lt => lt < 4.2 ? S.CAM0 : K.zoomPath(S.CAM0, ROOM.FINAL, MO.k75(U.clamp((lt - 4.2) / 2.8)));
// acquisition order: lines 0 → 95, accelerating; line i is acquired at local time TL(i)
const B0 = 3.5, B1 = 6.6;
S.TL = i => i === LINE ? 3.3 : B0 + (B1 - B0) * Math.pow(i / (US.NL - 1), 0.75);
S.nAt = lt => { let n = 0; for (let i = 0; i < US.NL; i++) if (i !== LINE && S.TL(i) <= lt) n++; return n; };
S.frames = (lt, t) => {
  if (lt >= 7.0) return US.sweepFrames(t, 0.5);
  const out = new Array(US.NL);
  for (let i = 0; i < US.NL; i++) out[i] = S.TL(i) <= lt ? US.frame(US.q30(39 + S.TL(i))) : null;
  return out;
};
// the gray column beside the trace: each depth's brightness from the echo there
const GX = 206, GW = 12, SK = 13 * 5.41;
const colGray = (j, x, y) => US.grayRGB(R6.line().B[j], x, y);
S.column = (c, a, pc = R6.ID) => {
  if (a <= 0) return;
  const T = (x, y) => R6.toS(pc, x, y), [x0] = T(GX, 0), [x1] = T(GX + GW, 0), sy0 = Math.max(0, Math.ceil(T(0, PX.ty0)[1])), sy1 = Math.min(PIX.H, Math.floor(T(0, PX.ty1)[1]));
  for (let sy = sy0; sy < sy1; sy++) {
    const q = (pc.y + (sy - 240) / pc.z - PX.ty0) / (PX.ty1 - PX.ty0); if (q > a) break;
    const j = Math.min(US.NS - 1, Math.max(0, Math.floor(q * US.NS)));
    for (let x = Math.round(x0); x < Math.round(x1); x++) { const g = colGray(j, x, sy); c.fillStyle = `rgb(${g[0]},${g[1]},${g[2]})`; c.fillRect(x, sy, 1, 1); }
  }
};
// the column in flight, from beside the trace to its scan line in the fan (e = 0 → 1)
S.flight = (c, e) => {
  const pts = [];
  for (let j = 0; j < US.NS; j += 2) {
    const q = (j + 1) / US.NS, r = US.RP + (j + 1) * US.DR;
    const a = [GX + GW / 2, PX.ty0 + q * (PX.ty1 - PX.ty0)], b = US.toScreen(S.CAM0, ROOM.FAN.ax, ROOM.FAN.ay, ROOM.FAN.k, r * Math.sin(PH), r * Math.cos(PH) - US.RP);
    pts.push([U.lerp(a[0], b[0], e), U.lerp(a[1], b[1], e), j]);
  }
  const w = Math.max(2, Math.round(U.lerp(GW, 3, e)));
  for (let k = 0; k < pts.length; k++) {
    const [x, y, j] = pts[k], h = k + 1 < pts.length ? Math.max(1, Math.ceil(Math.abs(pts[k + 1][1] - y)) + 1) : 2;
    const g = colGray(j, Math.round(x), Math.round(y)); c.fillStyle = `rgb(${g[0]},${g[1]},${g[2]})`;
    c.fillRect(Math.round(x - w / 2), Math.round(y), w, h);
  }
};
// the receiver shot: push in on the skull echo while the cursor counts the microseconds, then back out
S.panelCam = lt => {
  const tgt = { x: 140, y: R6.yOfUs(SK), z: 1.4 };
  if (lt < 0.35) return R6.ID;
  if (lt < 1.3) return K.camLerp(R6.ID, tgt, MO.sineInOut(U.clamp((lt - 0.35) / 0.8)));
  return K.camLerp(tgt, R6.ID, MO.sineInOut(U.clamp((lt - 1.3) / 0.45)));
};
S.panel = (c, lt) => {
  const pc = S.panelCam(lt), T = (x, y) => R6.toS(pc, x, y);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PIX.P.n0; c.fillRect(0, 0, PIX.W, PIX.H); c.restore();
  R6.drawScope(c, lt + 8, 156, pc);
  R6.notes(c, lt + 8, 8.3, pc);
  // time (µs) and depth (cm) on the same ticks
  for (const [us, d] of [[0, 0], [65, 5], [130, 10]]) {
    const [a, y] = T(PX.x0 + 20, R6.yOfUs(us)), [b] = T(170, 0);
    if (a > 1) PIX.text(c, us + ' µs', a, y - 3, 'c3');
    if (b + PIX.textWidth(d + ' cm') < 269) PIX.text(c, d + ' cm', b, y - 3, 'w');
  }
  // the cursor runs down to the skull echo, counting microseconds; then the depth that time means
  const cu = Math.min(SK, SK * MO.cubicInOut(U.clamp((lt - 0.35) / 0.8)));
  if (lt > 0.35 && lt < 3.0) {
    const [x0, y] = T(PX.x0 + 4, R6.yOfUs(cu)), [x1] = T(PX.x1 - 4, 0), [xl] = T(166, 0);
    PIX.rect(c, Math.round(x0), Math.round(y), Math.round(x1 - x0), 1, cu >= SK ? 'w' : 'c3');
    const s = Math.round(cu) + ' µs', nearTick = [0, 65].some(u => Math.abs(R6.yOfUs(cu) - R6.yOfUs(u)) < 15);
    if (cu >= SK || !nearTick) { PIX.rect(c, Math.round(xl), Math.round(y) + 2, PIX.textWidth(s) + 4, 11, 'k'); PIX.text(c, s, xl + 2, y + 4, 'c4'); }
    if (cu >= SK) { const t2 = lt - 1.15; if (t2 > 0) { const s2 = '→5.4 cm'; PIX.rect(c, Math.round(xl), Math.round(y) + 13, Math.min(PIX.textWidth(s2), t2 * 360) + 4, 11, 'k'); PIX.text(c, s2, xl + 2, y + 15, 'w', { n: Math.floor(t2 * 60) }); } }
  }
  // echo strength → brightness, filled top to bottom by a second, faster pass
  S.column(c, lt < 2.6 ? U.clamp((lt - 1.6) / 0.7) : 1, pc);
  if (lt > 1.6 && lt < 2.3) { const [x0, y] = T(PX.x0 + 4, PX.ty0 + (PX.ty1 - PX.ty0) * U.clamp((lt - 1.6) / 0.7)), [x1] = T(PX.x1 - 4, 0); PIX.rect(c, Math.round(x0), Math.round(y), Math.round(x1 - x0), 1, 'g7'); }
  const cb = T(GX, PX.ty1 - 24);
  CAP.note(c, lt, { ax: cb[0] - 1, ay: cb[1], x: 200, y: 344, text: 'ECHO INTENSITY', t0: 1.65, t1: 3.1, col: 'w', lineCol: 'g6', align: 'right', box: true });
};
// TIME OF FLIGHT: starts while the trace finishes (38.35 s) so the required sentence gets its reading time
S.tofCaption = (c, t) => CAP.scene(c, t - 38.35, { title: 'TIME OF FLIGHT', ctx: ['THE MACHINE CALCULATES', 'DEPTH FROM ECHO TIME.'], t0: 0, t1: 42.05 - 38.35 });
S.fan = (c, lt, t) => {
  const cam = S.cam(lt), fr = S.frames(lt, t);
  ROOM.drawWall(c, cam); ROOM.drawMachine(c, cam, t, { fr, sweep: false, blank: PIX.hex(PIX.P.k) });
  const clip = ROOM.screenRect(cam);
  if (lt < 7.0) {
    const edge = U.clamp(1 - (lt - 6.2) / 0.5);
    if (edge > 0) {
      const P2 = (r, p) => US.toScreen(cam, ROOM.FAN.ax, ROOM.FAN.ay, ROOM.FAN.k, r * Math.sin(p), r * Math.cos(p) - US.RP), r0 = US.RP, r1 = US.RP + US.DEPTH;
      c.save(); c.globalAlpha *= edge;
      for (const p of [-US.HALF, US.HALF]) { const A = P2(r0, p), B = P2(r1, p); PIX.bline(c, A[0], A[1], B[0], B[1], 'c1', 1); }
      for (const r of [r0, r1]) { let q = null; for (let k = 0; k <= 48; k++) { const p = -US.HALF + 2 * US.HALF * k / 48, w = P2(r, p); if (q) PIX.bline(c, q[0], q[1], w[0], w[1], 'c1', 1); q = w; } }
      c.restore();
    }
    if (lt >= B0 && lt < B1 + 0.1) ROOM.sweepLine(c, cam, (S.nAt(lt) + 0.5) / US.NL, clip);
  } else ROOM.sweepLine(c, cam, fr.s, clip);
};
S.draw = (c, lt, info) => {
  const t = info ? info.t : 39 + lt;
  const panel = cc => S.panel(cc, lt), fan = cc => S.fan(cc, lt, t);
  const dz = U.clamp((lt - 2.9) / 0.4);
  if (dz <= 0) panel(c); else if (dz >= 1) fan(c); else window.dissolve(c, panel, fan, dz);
  if (lt > 2.6 && lt < 3.4) S.flight(c, MO.cubicInOut(U.clamp((lt - 2.6) / 0.7)));
  S.tofCaption(c, t);
  CAP.scene(c, lt, { title: 'IMAGE RECONSTRUCTION', t0: 3.35, t1: 4.85 });
  if (lt > 3.5 && lt < 5.1) {
    const n = Math.min(US.NL, S.nAt(lt) + 1), s = `LINE ${String(n).padStart(2, ' ')}/${US.NL} · SLOWED`;
    c.save(); c.globalAlpha *= lt < 4.85 ? 1 : 1 - (lt - 4.85) / 0.25;
    PIX.rect(c, CAP.X0 + 3, CAP.Y0 + CAP.LH, PIX.textWidth(s) + 5, 11, 'k'); PIX.text(c, s, CAP.X0 + 5, CAP.Y0 + CAP.LH + 2, 'c4');
    c.restore();
  }
  if (lt >= 6.5) SC.s08_final.chain(c, lt - 6.5);
};
S.cues = () => {
  const out = [[0.35, 'tick', 0.6], [1.15, 'chirp', 0.9], [1.6, 'build', 0.7], [2.6, 'whoosh', 0.6], [3.3, 'tone', 0.8], [4.2, 'sweep', 0.5]];
  for (let k = 0; k < 8; k++) out.push([0.4 + k * 0.1, 'tick', 0.35]);
  for (let i = 0; i < US.NL; i++) if (i !== LINE && i % 2 === 0) out.push([S.TL(i), 'line', 0.35 + 0.3 * (i / US.NL), (i % 4 ? 0.3 : -0.3), i]);
  out.push([6.6, 'resolve', 0.9]);
  for (let i = 0; i < 6; i++) out.push([6.5 + i * 0.25, 'pop', 0.55 + 0.07 * i, (i % 2 ? 0.25 : -0.25), i]);
  return out;
};
})();
