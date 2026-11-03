'use strict';
// ============================================================================
// THE CT SCANNER and the room, in the patient frame (mm). The gantry's axis is
// the patient's long axis (y); its centre plane passes through the head. The
// rotor carries the X-ray tube and, opposite it, the curved detector array;
// they turn together around the patient (angle phi in the axial x–z plane).
// The table slides the patient through the gantry (helical acquisition).
// A power injector stands at the patient's right; its tubing ends in the IV
// cannula in the right antecubital vein.
// ============================================================================
const GAN = { y: 24, rIn: 330, rOut: 640, half: 210, rRot: 470, floor: -700 };
// the housing: a rounded-square front face extruded along the axis, with a round bore and a soft lip, standing on the floor
// (no engraved details: at a 20 mm meshing grid they would break up into jagged teeth)
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
// a ring with a rectangular cross-section (r0..r1 radially, y0..y1 along the axis): flat end faces, smooth round faces
// (explicit normals: averaging them across the sharp corners made whole triangles flip between visible and hidden)
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
// the bore trim (light)
function buildBoreTrim() { const mb = new MB(); ringInto(mb, GAN.rIn - 4, GAN.rIn + 18, -GAN.half - 6, -GAN.half + 6, 64); return mb.build(); }
// the rotor: a disc ring behind the tube and the detector, which are mounted on its front (they turn with it)
function buildRotorRing() { const mb = new MB(); ringInto(mb, GAN.rRot - 60, GAN.rRot + 110, 48, 76, 64); return mb.build(); }
// the X-ray tube (built at angle 0, at +z; it turns with the rotor): a cylindrical housing with cooling fins, and the
// collimator whose two blades shape the fan beam toward the centre
function buildTube() {
  const mb = new MB(), r = GAN.rRot;
  tubeInto(mb, [[-80, GAN.y, r + 34], [80, GAN.y, r + 34]], 38, null, 18, true);
  for (const x of [-60, -30, 0, 30, 60]) tubeInto(mb, [[x, GAN.y, r + 34], [x + 4, GAN.y, r + 34]], 44, null, 18, true);   // cooling fins
  boxInto(mb, [0, GAN.y, r - 12], [56, 70, 26]);                                                                   // collimator housing
  return computeNormals(mb.build());
}
function buildBlades() { const mb = new MB(); for (const s_ of [-1, 1]) boxInto(mb, [s_ * 14, GAN.y, GAN.rRot - 28], [22, 64, 6]); return computeNormals(mb.build()); }
const DET_N = 40, DET_SPAN = 0.46, DET_ROWS = 4;                    // detector elements across the arc (radians each side), rows along the axis
const DET_R0 = GAN.rRot - 14, DET_R1 = GAN.rRot + 30, DET_Y = 46;  // the detector arc: inner / outer radius, half length along the axis
function detAngle(k) { return Math.PI + lerp(-DET_SPAN, DET_SPAN, (k + 0.5) / DET_N); }
const detPt = (r, a, y) => [r * Math.sin(a), GAN.y + y, r * Math.cos(a)];
function faceInto(mb, q, nrm, at) { const i = q.map(p => mb.v(p[0], p[1], p[2], nrm[0], nrm[1], nrm[2], at || 0)); mb.quad(i[0], i[1], i[2], i[3]); }
// the detector: one smooth curved block opposite the tube (flat-shaded facets)
function buildDetector() {
  const mb = new MB(), n = 24, a0 = Math.PI - DET_SPAN - 0.03, a1 = Math.PI + DET_SPAN + 0.03;
  for (let k = 0; k < n; k++) {
    const A = lerp(a0, a1, k / n), B = lerp(a0, a1, (k + 1) / n), m = (A + B) / 2;
    faceInto(mb, [detPt(DET_R1, A, -DET_Y), detPt(DET_R1, B, -DET_Y), detPt(DET_R1, B, DET_Y), detPt(DET_R1, A, DET_Y)], [Math.sin(m), 0, Math.cos(m)]);
    faceInto(mb, [detPt(DET_R0, A, -DET_Y), detPt(DET_R0, B, -DET_Y), detPt(DET_R0, B, DET_Y), detPt(DET_R0, A, DET_Y)], [-Math.sin(m), 0, -Math.cos(m)]);
    faceInto(mb, [detPt(DET_R0, A, -DET_Y), detPt(DET_R1, A, -DET_Y), detPt(DET_R1, B, -DET_Y), detPt(DET_R0, B, -DET_Y)], [0, -1, 0]);
    faceInto(mb, [detPt(DET_R0, A, DET_Y), detPt(DET_R1, A, DET_Y), detPt(DET_R1, B, DET_Y), detPt(DET_R0, B, DET_Y)], [0, 1, 0]);
  }
  for (const [a, s] of [[a0, -1], [a1, 1]]) faceInto(mb, [detPt(DET_R0, a, -DET_Y), detPt(DET_R1, a, -DET_Y), detPt(DET_R1, a, DET_Y), detPt(DET_R0, a, DET_Y)], [s * Math.cos(a), 0, -s * Math.sin(a)]);
  return mb.build();
}
// the detector elements (attribute = element index): on the face toward the viewer of the axial views (one strip per element)
// and on the face toward the tube (several rows along the axis: a multi-row detector); they light up with the measured intensity
function buildDetFaces() {
  const mb = new MB(), hw = DET_SPAN / DET_N - 0.0032;
  for (let k = 0; k < DET_N; k++) {
    const m = detAngle(k), A = m - hw, B = m + hw;
    faceInto(mb, [detPt(DET_R0 + 5, A, -DET_Y - 1), detPt(DET_R1 - 5, A, -DET_Y - 1), detPt(DET_R1 - 5, B, -DET_Y - 1), detPt(DET_R0 + 5, B, -DET_Y - 1)], [0, -1, 0], k);
    const rows = (2 * DET_Y - 12) / DET_ROWS;
    for (let rI = 0; rI < DET_ROWS; rI++) { const y0 = -DET_Y + 6 + rI * rows + 1, y1 = y0 + rows - 2; faceInto(mb, [detPt(DET_R0 - 1, A, y0), detPt(DET_R0 - 1, B, y0), detPt(DET_R0 - 1, B, y1), detPt(DET_R0 - 1, A, y1)], [-Math.sin(m), 0, -Math.cos(m)], k); }
  }
  return mb.build();
}
// the slip ring on the back of the rotor: tracks that carry power in and measurements out while it turns
function buildSlipRing() { const mb = new MB(); for (const rr of [540, 558, 576]) ringInto(mb, rr - 5, rr + 5, 76, 82, 64); return mb.build(); }
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
// the power injector on its stand at the patient's right, its syringe, the tubing to the cannula, the cannula
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
// the room: a floor grid as a textured quad
const FLOOR_TEX = makeTex(64, 64, (x, y) => (x % 16 === 0 || y % 16 === 0) ? P.N3 : P.N2);
function buildFloor() { return quadMesh([-3000, -3200, GAN.floor], [6000, 0, 0], [0, 6000, 0]); }
