'use strict';
// ============================================================================
// THE CT ROOM (scene 14): a generic CT scanner (no brand), its sliding table,
// a contrast injector on a stand with an IV line to the patient's arm. The
// patient lies supine, head first in the bore (his face is never seen); the
// table slides him toward the acquisition position. CTA is a diagnostic scan:
// nothing is threaded into the leg arteries.
// World mm: bore axis along z (into the gantry = −z), bore centre at y 1000.
// ============================================================================
const M_GANT = mat('gantry', ['#5C6670', '#8C96A0', '#C2CAD2', '#DCE2E8', '#F2F5F8']);
const M_GDK = mat('gantryDark', ['#10161C', '#1C242E', '#2A3440', '#3A4654', '#4C5A6A']);
const M_GACC = mat('gantryAccent', ['#0E4A55', '#1A7A88', '#2EA8B8', '#5CCAD6', '#9CE6EE']);
const M_TABLE = mat('table', ['#3A424C', '#56606C', '#7A8592', '#98A3B0', '#B8C2CE']);
const M_PAD = mat('pad', ['#1A2A3A', '#26405A', '#34587A', '#46709A', '#6290BA']);
const M_INJ = mat('injector', ['#606A74', '#98A2AC', '#CED6DE', '#E4EAF0', '#F6F8FA']);
const M_SYR = mat('syringe', ['#4A7FA6', '#8DBBDC', '#CDEBFF', '#E8F6FF', '#FFFFFF'], { ol: 0 });
function buildCT() {
  const C = {};
  const gg = new VoxGrid(-1100, 0, -450, 1100, 2050, 450, 20);
  gg.paint(-1100, 0, -450, 1100, 2050, 450, (x, y, z) => {
    const outer = sdB(x, y, z, 0, 1000, 0, 1000, 1000, 380, 260), bore = Math.hypot(x, y - 1000) - 360;
    if (outer >= 0) return 0;
    if (bore < 0) return 0;
    if (bore < 40) return M_GDK;                                                      // bore liner
    if (Math.abs(bore - 70) < 12 && z > 300) return M_GACC;                           // accent ring on the front face
    if (z > 360 && x > 420 && x < 700 && y > 1280 && y < 1420) return M_GDK;          // small control panel
    return M_GANT;
  });
  C.gantry = voxMesh(gg);
  // pedestal and the sliding table top (table top drawn with an offset each frame)
  const pg = new VoxGrid(-300, 0, 300, 300, 820, 2400, 20);
  pg.paint(-300, 0, 300, 300, 820, 2400, (x, y, z) => (sdB(x, y, z, 0, 380, 1500, 200, 380, 800, 60) < 0 ? M_TABLE : 0));
  C.base = voxMesh(pg);
  const tg = new VoxGrid(-280, 820, -1600, 280, 900, 2400, 20);
  tg.paint(-280, 820, -1600, 280, 900, 2400, (x, y, z) => { const d = sdB(x, y, z, 0, 850, 400, 260, 30, 1980, 40); if (d >= 0) return 0; return y > 865 && Math.abs(x) < 230 ? M_PAD : M_TABLE; });
  C.table = voxMesh(tg);
  // injector: wheeled stand, column, head with two syringes (one with contrast)
  const ig = new VoxGrid(-200, 0, -200, 200, 1500, 200, 10);
  ig.paint(-200, 0, -200, 200, 1500, 200, (x, y, z) => {
    if (sdB(x, y, z, 0, 40, 0, 170, 25, 170, 20) < 0) return M_GDK;
    if (sdC(x, y, z, 0, 60, 0, 0, 1180, 0, 28, 28) < 0) return M_INJ;
    if (sdB(x, y, z, 0, 1270, 0, 120, 100, 90, 30) < 0) return M_INJ;
    if (sdC(x, y, z, -55, 1380, 30, -55, 1480, 60, 32, 32) < 0 || sdC(x, y, z, 55, 1380, 30, 55, 1480, 60, 32, 32) < 0) return x < 0 ? M_SYR : M_GANT;
    return 0;
  });
  C.inj = voxMesh(ig);
  return C;
}
const CT = () => cached('ct', buildCT);
// supine on the table, head first (−z), face up (+y); right side toward −x
function lyingRoot(tableZ) {
  // body axes: up(+y_b) → −z, forward(+x_b) → +y, right(+z_b) → −x
  const R = [0, 0, -1, 0, 1, 0, 0, 0, 0, -1, 0, 0];
  return mMul(mT(0, 1000, tableZ), R);
}
function drawCT(cam, t, tableZ, o) {
  o = o || {};
  const C = CT();
  drawVox(cam, C.gantry, null);
  drawVox(cam, C.base, null);
  drawVox(cam, C.table, mT(0, 0, tableZ));
  const pose = patientPose(null, 0, { amp: 0, rootM: lyingRoot(400 + tableZ) });
  drawPatient(cam, pose, {});
  // injector beside the table, IV line to the left forearm (left side faces +x)
  const injP = [820, 0, 1500];                     // beside the foot end of the table, clear of the bore
  drawVox(cam, C.inj, mT(injP[0], injP[1], injP[2]));
  const syr = proj(cam, [injP[0] - 55, 1480, injP[2] + 60]), arm = proj(cam, mApply(pose.parts.find(p => p[0] === 'farm' && mApply(p[1], [0, 0, 0])[0] > 0)[1], [10, -120, 0]));
  if (syr && arm) {
    const mx = (syr[0] + arm[0]) / 2, my = Math.max(syr[1], arm[1]) + 40;
    let px = syr[0], py = syr[1];
    for (let i = 1; i <= 20; i++) { const u = i / 20, x = (1 - u) * (1 - u) * syr[0] + 2 * u * (1 - u) * mx + u * u * arm[0], y = (1 - u) * (1 - u) * syr[1] + 2 * u * (1 - u) * my + u * u * arm[1]; line(px, py, x, y, P.ACC); line(px, py + 1, x, y + 1, P.N5); px = x; py = y; }
    if (o.inject > 0) { const u = clamp(o.inject, 0, 1); const x = (1 - u) * (1 - u) * syr[0] + 2 * u * (1 - u) * mx + u * u * arm[0], y = (1 - u) * (1 - u) * syr[1] + 2 * u * (1 - u) * my + u * u * arm[1]; rect(x - 2, y - 2, x + 3, y + 3, P.C6); }
  }
  return pose;
}
