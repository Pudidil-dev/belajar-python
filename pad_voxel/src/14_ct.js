'use strict';
// ============================================================================
// THE CT ROOM (scene 14), from the CTA film's scanner: a generic CT gantry (no
// brand), its table, the patient supine under a sheet with the right forearm
// on an arm board and an IV cannula in the antecubital vein, the power
// injector on its stand with the tubing. Patient frame (mm): x = the
// patient's left, y = superior, z = anterior (room "up"); the head lies in
// the gantry (never seen). CTA only images: nothing is threaded into the legs.
// ============================================================================
const GAN = { y: 24, rIn: 330, rOut: 640, half: 210, rRot: 470, floor: -700 };
function gantrySDF(x, y, z) {
  const hx = 640, hz = 700, R = 280, re = 46, cz = 0;
  const qx = Math.abs(x) - (hx - R), qz = Math.abs(z - cz) - (hz - R);
  const d2 = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - R;
  const dy = Math.abs(y - GAN.y) - GAN.half, q0 = d2 + re, q1 = dy + re;
  let d = Math.hypot(Math.max(q0, 0), Math.max(q1, 0)) + Math.min(Math.max(q0, q1), 0) - re;
  d = smax(d, -(Math.hypot(x, z) - GAN.rIn), 26);
  return Math.max(d, GAN.floor - z);
}
function buildGantryHousing() { return isoMesh(gantrySDF, -700, GAN.y - GAN.half - 40, GAN.floor - 10, 700, GAN.y + GAN.half + 40, 730, 20); }
function buildGantryBase() { const mb = new MB(); boxInto(mb, [0, GAN.y, GAN.floor + 20], [1400, 560, 40]); return computeNormals(mb.build()); }
function ringInto(mb, r0, r1, y0, y1, n) {
  const P_ = (r, a, y) => [r * Math.sin(a), GAN.y + y, r * Math.cos(a)];
  for (let k = 0; k < n; k++) {
    const A = k / n * TAU, B = (k + 1) / n * TAU, sa = Math.sin(A), ca = Math.cos(A), sb = Math.sin(B), cb = Math.cos(B);
    const q = (pts, ns) => { const i = pts.map((p, j) => mb.v(p[0], p[1], p[2], ns[j][0], ns[j][1], ns[j][2])); mb.quad(i[0], i[1], i[2], i[3]); };
    q([P_(r1, A, y0), P_(r1, B, y0), P_(r1, B, y1), P_(r1, A, y1)], [[sa, 0, ca], [sb, 0, cb], [sb, 0, cb], [sa, 0, ca]]);
    q([P_(r0, A, y0), P_(r0, B, y0), P_(r0, B, y1), P_(r0, A, y1)], [[-sa, 0, -ca], [-sb, 0, -cb], [-sb, 0, -cb], [-sa, 0, -ca]]);
    q([P_(r0, A, y0), P_(r1, A, y0), P_(r1, B, y0), P_(r0, B, y0)], [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]]);
    q([P_(r0, A, y1), P_(r1, A, y1), P_(r1, B, y1), P_(r0, B, y1)], [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]);
  }
}
function buildBoreTrim() { const mb = new MB(); ringInto(mb, GAN.rIn - 4, GAN.rIn + 18, -GAN.half - 6, -GAN.half + 6, 64); return mb.build(); }
const ARM = { sh: [-200, -250, -36], el: [-366, -488, -92], wr: [-522, -696, -92], hand: [-566, -756, -90] };
const CANNULA = { tip: [-378, -500, -63], hub: [-407, -541, -47] };
function bodySDF(x, y, z) {
  const ax = Math.abs(x);
  let d = sdB(x, y, z, 0, -430, -42, 158, 215, 92, 70);                                       // chest and abdomen
  d = smin(d, sdC(x, y, z, -168, -232, -44, 168, -232, -44, 60), 40);                        // shoulders
  d = smin(d, sdE(x, y, z, 0, -690, -48, 166, 120, 92), 40);                                 // hips
  d = smin(d, sdC(ax, y, z, 92, -740, -52, 104, -1530, -58, 78, 50), 46);                    // legs, the sheet bridging between them
  d = smin(d, sdE(ax, y, z, 104, -1585, 2, 40, 34, 58), 16);                                 // feet tenting the sheet
  d = smin(d, sdC(x, y, z, 205, -250, -34, 232, -770, -32, 48, 38), 24);                     // the left arm under the sheet
  d = smin(d, sdC(x, y, z, -200, -250, -36, -290, -380, -66, 50, 44), 22);                    // the right upper arm in its sleeve
  d += 1.6 * Math.sin(y * 0.045 + Math.sin(x * 0.02) * 2) * (z > -60 ? 1 : 0.3);             // soft folds in the sheet
  return Math.max(d, TABLE_Z - z);
}
const TABLE_Z = -132;
function buildBody() { return isoMesh(bodySDF, -290, -1680, -140, 290, -150, 80, 15); }
function buildForearm() {
  const mb = new MB();
  tubeInto(mb, smoothPath([lerp3(ARM.sh, ARM.el, 0.5), ARM.el, lerp3(ARM.el, ARM.wr, 0.5), ARM.wr], 6), (i, u) => u < 0.45 ? lerp(42, 38, u / 0.45) : lerp(38, 27, (u - 0.45) / 0.55), null, 20, true);
  ellipsoidInto(mb, ARM.hand, 36, 44, 15, 14, 10, (x, y, z) => 1 + 0.1 * Math.max(0, -z));
  return computeNormals(mb.build());
}
function buildArmBoard() {
  const mb = new MB(); boxInto(mb, [0, 0, 0], [120, 420, 18]);
  const m = mb.build(), R = mMul(mT(-450, -615, -110), mRotAxis([0, 0, 0], [0, 0, 1], -0.62));
  for (let i = 0; i < m.nv; i++) { const q = mApply(R, [m.p[3 * i], m.p[3 * i + 1], m.p[3 * i + 2]]); m.p[3 * i] = q[0]; m.p[3 * i + 1] = q[1]; m.p[3 * i + 2] = q[2]; }
  return computeNormals(m);
}
const TABLE = { z: TABLE_Z, y0: -1900, y1: 280 };
function buildTable() {
  const mb = new MB();
  boxInto(mb, [0, (TABLE.y0 + TABLE.y1) / 2, TABLE.z - 22], [470, TABLE.y1 - TABLE.y0, 44]);
  boxInto(mb, [0, -1250, (TABLE.z - 44 + GAN.floor) / 2], [300, 700, TABLE.z - 44 - GAN.floor]);
  boxInto(mb, [0, -1250, GAN.floor + 30], [560, 900, 60]);
  // the head holder (a cradle)
  tubeInto(mb, [[0, -20, TABLE.z + 6], [0, 120, TABLE.z + 6]], 46, null, 18, true);
  return computeNormals(mb.build());
}
const INJ = { head: [-590, -560, 40], tip: [-574, -560, -46] };
function buildInjector() {
  const mb = new MB();
  tubeInto(mb, [[-600, -560, GAN.floor], [-600, -560, -30]], 14, null, 10, true);
  ellipsoidInto(mb, [-600, -560, GAN.floor + 12], 150, 150, 24, 20, 6, (x, y, z) => 1);
  // a rounded injector head (superellipsoid look) with a dark front panel
  ellipsoidInto(mb, INJ.head, 70, 105, 58, 20, 14, (x, y, z) => 1 / Math.pow(Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(y), 4) + Math.pow(Math.abs(z), 4), 0.25));
  boxInto(mb, add3(INJ.head, [-58, 0, 14]), [8, 120, 52]);
  return computeNormals(mb.build());
}
function buildSyringe() { const mb = new MB(); tubeInto(mb, [[-577, -560, -12], [-574, -560, -52]], 26, null, 16, true); return computeNormals(mb.build()); }
const IV_LINE = smoothPath([INJ.tip, [-560, -566, -84], [-520, -570, -96], [-470, -560, -70], [-436, -552, -52], CANNULA.hub], 5);
function buildTubing() { const mb = new MB(); tubeInto(mb, IV_LINE, 3.4, (i, u) => u, 8); return computeNormals(mb.build()); }
function buildCannula() {
  const mb = new MB();
  tubeInto(mb, [CANNULA.hub, lerp3(CANNULA.hub, CANNULA.tip, 0.5), CANNULA.tip], 1.3, null, 8, true);
  ellipsoidInto(mb, CANNULA.hub, 7, 9, 6, 12, 8);
  boxInto(mb, add3(CANNULA.hub, [0, 2, -4]), [24, 18, 3]);
  return computeNormals(mb.build());
}
const FLOOR_TEX = makeTex(64, 64, (x, y) => (x % 16 === 0 || y % 16 === 0) ? P.N3 : P.N2);
function buildFloor() { return quadMesh([-3000, -3200, GAN.floor], [6000, 0, 0], [0, 6000, 0]); }
const CTR = {
  mw: [P.MW0, P.MW1, P.MW2, P.MW3, P.MW4], md: [P.MD0, P.MD1, P.MD2, P.MD3], sheet: [P.SH0, P.SH1, P.SH2, P.SH3, P.SH4], skin: [P.SK0, P.SK1, P.SK2, P.SK3, P.SK4],
};
const CTA_ROOM = () => cached('ctroom', () => ({ housing: buildGantryHousing(), gbase: buildGantryBase(), trim: buildBoreTrim(), body: buildBody(), forearm: buildForearm(), board: buildArmBoard(),
  table: buildTable(), inj: buildInjector(), syr: buildSyringe(), tubing: buildTubing(), cannula: buildCannula(), floor: buildFloor() }));
const CTM = (ramp, ol, x) => Object.assign({ ramp, id: newId(ol) }, x || {});
// the room with the table slid in by dy (the gantry and the floor move toward the feet in the patient frame);
// inj (0..1): how far the contrast has run down the tubing
function drawCTRoom(cam, dy, inj, fog) {
  const R = CTA_ROOM(), xfR = mT(0, -dy, 0);
  fog = fog || [900, 5200, P.N2];
  drawMesh(cam, R.floor, { ramp: [0], back: [0], tex: FLOOR_TEX, unlit: true, id: 0, fog }, xfR);
  drawMesh(cam, R.table, CTM(CTR.mw, P.MW0, { fog }));
  drawMesh(cam, R.body, CTM(CTR.sheet, P.SH0, { fog, back: CTR.md }));
  drawMesh(cam, R.forearm, CTM(CTR.skin, P.SK0, { fog, spec: 0.1 }));
  drawMesh(cam, R.board, CTM(CTR.md, P.MD0, { fog }));
  drawMesh(cam, R.gbase, CTM(CTR.mw, P.MW0, { fog }), xfR);
  drawMesh(cam, R.housing, CTM(CTR.mw, P.MW0, { back: CTR.md, fog, spec: 0.35, cap: 0.82 }), xfR);
  drawMesh(cam, R.trim, CTM([P.MW2, P.MW3, P.MW4, P.CY3], P.MW0, { fog }), xfR);
  drawMesh(cam, R.inj, CTM(CTR.mw, P.MW0, { fog }));
  drawMesh(cam, R.syr, CTM([P.CO0, P.CO1, P.CO2, P.CO3], P.CO0, { fog, alpha: 0.85 }));
  drawMesh(cam, R.tubing, { ramp: CTR.mw, mix: { ramp: [P.CO1, P.CO2, P.CO3], f: u => u < inj ? 1 : 0 }, id: newId(P.MW0), fog });
  drawMesh(cam, R.cannula, CTM([P.MW1, P.MW2, P.MW3, P.CY2], P.MD1, {}));
}
