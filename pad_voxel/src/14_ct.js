'use strict';
// ============================================================================
// THE CT ROOM (scenes 14 and 16), set up the way a leg-artery CT angiogram is
// done: the same patient lies on his back on the table, head first, both arms
// raised above his head, shoes off, a strap over the knees; an IV cannula in
// the right elbow vein is connected to a dual-syringe power injector on its
// pedestal beside the gantry. The gantry (generic, no brand) has its control
// panels, the lit bore ring, the X-ray lamp and the positioning laser, which
// draws a red line across whatever passes through its plane. The table slides
// him into the bore until his belly lies in the scan plane; during the scan it
// carries him on through while the images are taken from the belly to the feet.
// His head is inside the bore from the start (it is never seen).
// Patient frame (mm), fixed to the table: x = the patient's left, y = toward
// his head, z = up. The room (gantry, pedestal, injector, floor) moves by G:
// the gantry's scan plane sits at y = G on the patient; its front faces −y.
// ============================================================================
const GAN = { y: 0, rIn: 330, rOut: 640, half: 210, floor: -700 };
function gantrySDF(x, y, z) {
  const hx = 640, hz = 700, R = 280, re = 46;
  const qx = Math.abs(x) - (hx - R), qz = Math.abs(z) - (hz - R);
  const d2 = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - R;
  const dy = Math.abs(y) - GAN.half, q0 = d2 + re, q1 = dy + re;
  let d = Math.hypot(Math.max(q0, 0), Math.max(q1, 0)) + Math.min(Math.max(q0, q1), 0) - re;
  d = smax(d, -(Math.hypot(x, z) - GAN.rIn), 26);
  return Math.max(d, GAN.floor - z);
}
function buildGantryHousing() { return isoMesh(gantrySDF, -700, -GAN.half - 40, GAN.floor - 10, 700, GAN.half + 40, 730, 26); }
function ringInto(mb, r0, r1, y0, y1, n) {
  const P_ = (r, a, y) => [r * Math.sin(a), y, r * Math.cos(a)];
  for (let k = 0; k < n; k++) {
    const A = k / n * TAU, B = (k + 1) / n * TAU, sa = Math.sin(A), ca = Math.cos(A), sb = Math.sin(B), cb = Math.cos(B);
    const q = (pts, ns) => { const i = pts.map((p, j) => mb.v(p[0], p[1], p[2], ns[j][0], ns[j][1], ns[j][2])); mb.quad(i[0], i[1], i[2], i[3]); };
    q([P_(r1, A, y0), P_(r1, B, y0), P_(r1, B, y1), P_(r1, A, y1)], [[sa, 0, ca], [sb, 0, cb], [sb, 0, cb], [sa, 0, ca]]);
    q([P_(r0, A, y0), P_(r0, B, y0), P_(r0, B, y1), P_(r0, A, y1)], [[-sa, 0, -ca], [-sb, 0, -cb], [-sb, 0, -cb], [-sa, 0, -ca]]);
    q([P_(r0, A, y0), P_(r1, A, y0), P_(r1, B, y0), P_(r0, B, y0)], [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]]);
    q([P_(r0, A, y1), P_(r1, A, y1), P_(r1, B, y1), P_(r0, B, y1)], [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]);
  }
}
// the front face (toward the patient's head, +y): the lit ring round the bore, two control panels, the laser slot, the lamp
function buildGantryFront() {
  const F = -GAN.half;
  const ring = new MB(); ringInto(ring, GAN.rIn - 4, GAN.rIn + 22, F - 6, F + 6, 72);
  const panel = new MB(); for (const sx of [-1, 1]) boxInto(panel, [sx * 470, F - 8, 60], [120, 14, 150]);
  const keys = new MB(); for (const sx of [-1, 1]) for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) boxInto(keys, [sx * 470 + (c - 0.5) * 42, F - 17, 100 - r * 40], [26, 6, 18]);
  const slot = new MB(); boxInto(slot, [0, F - 6, GAN.rIn + 70], [260, 8, 10]);
  const lamp = new MB(); ellipsoidInto(lamp, [0, F - 6, 640], 26, 10, 14, 12, 6);
  return { ring: ring.build(), panel: computeNormals(panel.build()), keys: computeNormals(keys.build()), slot: computeNormals(slot.build()), lamp: computeNormals(lamp.build()) };
}
// ---------------------------------------------------------------- the patient on the table
const TABLE_Z = -132, MATTRESS = 24;
// body frame (forward x, up y, right z) → patient frame (x = left, y = head, z = up), lying on the mattress
const CT_ROOT = [0, 0, -1, 0, 0, 1, 0, -690, 1, 0, 0, TABLE_Z + MATTRESS + 86];
const ctPose = t => patientPose(null, 0, { rootM: CT_ROOT, armsUp: 1, t: t || 0 });
// the IV cannula in the right elbow vein (raised arm) — the contrast's route in scene 15 starts here
const CANNULA = (() => { const p = ctPose(0), el = mApply(p.parts.find(q => q[0] === 'farm')[1], [10, -40, 0]); return { tip: el, hub: add3(el, [-6, 30, 18]) }; })();
const TABLE = { y0: -2100, y1: 620 };
function buildTable() {
  const top = new MB(); boxInto(top, [0, (TABLE.y0 + TABLE.y1) / 2, TABLE_Z - 16], [440, TABLE.y1 - TABLE.y0, 32]);
  const pad = new MB(); boxInto(pad, [0, (TABLE.y0 + TABLE.y1) / 2 + 20, TABLE_Z + MATTRESS / 2], [400, TABLE.y1 - TABLE.y0 - 60, MATTRESS]);
  // the knee strap: a flat band (60 mm wide) over both knees, down to the table edges
  const strap = new MB(), arc = smoothPath([[-214, -1140, TABLE_Z + 14], [-190, -1140, -24], [-156, -1140, 46], [-92, -1140, 74], [-28, -1140, 56], [0, -1140, 44], [28, -1140, 56], [92, -1140, 74], [156, -1140, 46], [190, -1140, -24], [214, -1140, TABLE_Z + 14]], 3);
  for (let i = 0; i + 1 < arc.length; i++) {
    const a = arc[i], b = arc[i + 1], d = norm3(sub3(b, a)), n = [-d[2], 0, d[0]];
    const v = [[a[0], a[1] - 30, a[2]], [a[0], a[1] + 30, a[2]], [b[0], b[1] + 30, b[2]], [b[0], b[1] - 30, b[2]]].map(p => strap.v(p[0] + n[0] * 3, p[1], p[2] + n[2] * 3, n[0], 0, n[2]));
    strap.quad(v[0], v[1], v[2], v[3]); strap.quad(v[0], v[3], v[2], v[1]);
  }
  return { top: computeNormals(top.build()), pad: computeNormals(pad.build()), strap: strap.build() };
}
// the pedestal (room-fixed, in front of the gantry) and the injector beside it
function buildPedestal() { const mb = new MB(); boxInto(mb, [0, -1250, (TABLE_Z - 40 + GAN.floor) / 2], [340, 1000, TABLE_Z - 40 - GAN.floor]); boxInto(mb, [0, -1250, GAN.floor + 25], [520, 1180, 50]); return computeNormals(mb.build()); }
const INJ = { x: -700, y: -980, head: [-700, -980, 120] };
function buildInjector() {
  const mb = new MB();
  tubeInto(mb, [[INJ.x, INJ.y, GAN.floor], [INJ.x, INJ.y, 60]], 18, null, 10, true);
  ellipsoidInto(mb, [INJ.x, INJ.y, GAN.floor + 14], 170, 170, 26, 20, 6, () => 1);
  ellipsoidInto(mb, INJ.head, 80, 110, 66, 20, 14, (x, y, z) => 1 / Math.pow(Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(y), 4) + Math.pow(Math.abs(z), 4), 0.25));
  boxInto(mb, add3(INJ.head, [-70, 0, 20]), [8, 130, 60]);
  return computeNormals(mb.build());
}
// two syringes pointing down at the front of the head: contrast (white-blue) and saline (clear)
function buildSyringes() { const a = new MB(), b = new MB(); tubeInto(a, [[INJ.x + 40, INJ.y - 30, 110], [INJ.x + 52, INJ.y - 30, 20]], 22, null, 14, true); tubeInto(b, [[INJ.x + 40, INJ.y + 34, 110], [INJ.x + 52, INJ.y + 34, 20]], 22, null, 14, true); return { con: computeNormals(a.build()), sal: computeNormals(b.build()) }; }
// the tubing: from the syringe tip (room) down to the table edge (table), along it into the bore and up to the
// cannula at the raised elbow (patient); rebuilt each frame because the table moves and the tube hangs between them
function tubingMesh(G) {
  const tip = [INJ.x + 54, INJ.y - 30 + G, 10], edge = [-215, Math.min(-200, INJ.y + G + 260), TABLE_Z + 8], mid = lerp3(tip, edge, 0.5);
  const sag = [mid[0], mid[1], Math.min(tip[2], edge[2]) - 140];
  const pts = smoothPath([tip, lerp3(tip, sag, 0.6), sag, lerp3(sag, edge, 0.6), edge, [-212, edge[1] + 260, TABLE_Z + 10], [-200, 140, TABLE_Z + 14], add3(CANNULA.hub, [-30, -20, -10]), CANNULA.hub], 18);
  const mb = new MB(); tubeInto(mb, pts, 3.4, (i, u) => u, 6); return computeNormals(mb.build());
}
const FLOOR_TEX = makeTex(64, 64, (x, y) => (x % 16 === 0 || y % 16 === 0) ? P.N3 : P.N2);
function buildCTFloor() { return quadMesh([-3200, -3200, GAN.floor], [6400, 0, 0], [0, 6400, 0]); }
const CTR = { mw: [P.MW0, P.MW1, P.MW2, P.MW3, P.MW4], md: [P.MD0, P.MD1, P.MD2, P.MD3] };
const CTA_ROOM = () => cached('ctroom2', () => Object.assign({ housing: buildGantryHousing(), front: buildGantryFront(), pedestal: buildPedestal(), inj: buildInjector(), syr: buildSyringes(), floor: buildCTFloor() }, buildTable()));
const CTM = (ramp, ol, x) => Object.assign({ ramp, id: newId(ol) }, x || {});
// G: the scan plane's place on the patient (mm along his body: −1580 the soles, −690 the hips, −460 the belly, 0 the neck);
// o: {inj (0..1 contrast down the tube), t (breathing), xray (the lamp lit), fog, laser (draw the laser line)}
function drawCTRoom(cam, G, o) {
  o = o || {};
  const R = CTA_ROOM(), xfR = mT(0, G, 0), fog = o.fog || [900, 6200, P.N2], inj = o.inj || 0;
  drawMesh(cam, R.floor, { ramp: [0], back: [0], tex: FLOOR_TEX, unlit: true, id: 0, fog }, xfR);
  drawMesh(cam, R.pedestal, CTM(CTR.mw, P.MW0, { fog }), xfR);
  const pid0 = OBJN;                                                   // the laser marks what lies on the table
  drawMesh(cam, R.top, CTM(CTR.mw, P.MW0, { fog }));
  drawMesh(cam, R.pad, CTM([hexc('#1C232C'), hexc('#2A3440'), hexc('#3C4A58'), hexc('#566676')], hexc('#0C1014'), { fog }));
  const pose = ctPose(o.t);
  drawPatient(cam, pose, { socks: 1, fog });
  const pid1 = OBJN;
  drawMesh(cam, R.strap, CTM([hexc('#141A20'), hexc('#24303A'), hexc('#38485A')], hexc('#06080A'), { fog }));
  drawMesh(cam, R.housing, CTM(CTR.mw, P.MW0, { back: CTR.md, fog, spec: 0.35, cap: 0.82 }), xfR);
  drawMesh(cam, R.front.ring, CTM([P.CY1, P.CY2, P.CY3, P.CY4], P.CY0, { fog, amb: 0.7, dif: 0.3 }), xfR);
  drawMesh(cam, R.front.panel, CTM(CTR.md, P.MD0, { fog }), xfR);
  drawMesh(cam, R.front.keys, CTM([hexc('#2C6A7A'), P.CY1, P.CY2, P.CY3], P.MD0, { fog, amb: 0.6 }), xfR);
  drawMesh(cam, R.front.slot, CTM([P.MD0, P.MD1], P.MD0, { fog }), xfR);
  drawMesh(cam, R.front.lamp, CTM(o.xray ? [P.PL1, P.PL2, P.PL3, P.PL4] : [P.MW1, P.MW2, P.MW3], P.MD0, { fog, amb: o.xray ? 0.9 : 0.4 }), xfR);
  drawMesh(cam, R.inj, CTM(CTR.mw, P.MW0, { fog }), xfR);
  const plunger = 1 - 0.35 * inj;
  drawMesh(cam, R.syr.con, CTM([P.CO0, P.CO1, P.CO2, P.CO3], P.CO0, { fog, alpha: 0.9 }), mMul(xfR, mMul(mT(INJ.x + 46, INJ.y - 30, 65), mMul(mS(1, 1, plunger), mT(-INJ.x - 46, -INJ.y + 30, -65)))));
  drawMesh(cam, R.syr.sal, CTM([P.MW2, P.MW3, P.MW4], P.MW1, { fog, glass: [0.3, 0.9, 1.5] }), xfR);
  drawMesh(cam, tubingMesh(G), { ramp: CTR.mw, mix: { ramp: [P.CO1, P.CO2, P.CO3], f: u => u < inj ? 1 : 0 }, id: newId(P.MW0), fog });
  if (o.laser) ctLaser(cam, G - GAN.half - 12, pid0, pid1);
}
// the positioning laser: a thin red line where its plane (y = Y on the patient) meets the patient and the table
function ctLaser(cam, Y, id0, id1) {
  const RED = hexc('#FF4A3A'), GLOW = hexc('#B83028');
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px, iz = ZB[i]; if (iz <= 0) continue;
    const id = IDB[i]; if (id < id0 || id >= id1) continue;
    const cz = 1 / iz, cx = (px + 0.5 - CX) * cz / cam.F, cy = (CY - py - 0.5) * cz / cam.F;
    const wy = cam.eye[1] + cam.r[1] * cx + cam.u[1] * cy + cam.f[1] * cz, d = Math.abs(wy - Y);
    if (d < 4 + cz * 0.0016) buf[i] = RED; else if (d < 9 + cz * 0.004) buf[i] = mixc(buf[i], GLOW, 0.45);
  }
}
