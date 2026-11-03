'use strict';
// ============================================================================
// ASSETS: every mesh is built once (engineInit) and reused by every scene, so
// the patient, the arteries and the aneurysm are the same objects throughout.
// Materials are palette ramps (dark → light); "mix" blends a second ramp in by
// a per-vertex function (the contrast concentration from the arrival times).
// ============================================================================
const A = {};
let CUR_T = 0;
const RAMP = {
  wall: [hexc('#2A1020'), hexc('#561C2C'), hexc('#8E3038'), P.AR3, hexc('#F0A48C')], lumen: [P.BL0, P.BL1, P.BL2, P.BL3, P.AR2], io: [P.IO0, P.IO1, P.IO2, P.IO3, P.IO5], ioIn: [P.IO0, P.IO1, P.IO2, P.IO3],
  vein: [P.ST0, P.ST1, P.ST2, P.ST3, P.ST5], art: [hexc('#2A1020'), hexc('#561C2C'), hexc('#8E3038'), P.AR3, hexc('#F0A48C')], brain: [P.BR1, P.BR2, P.BR3, P.BR4], skin: [P.SK0, P.SK1, P.SK2, P.SK3, P.SK4],
  sheet: [P.SH0, P.SH1, P.SH2, P.SH3, P.SH4], mw: [P.MW0, P.MW1, P.MW2, P.MW3, P.MW4], md: [P.MD0, P.MD1, P.MD2, P.MD3], bone: [P.BO0, P.BO1, P.BO2, P.BO3],
  lung: [P.LU0, P.LU1, P.LU2, P.LU3], cy: [P.CY0, P.CY1, P.CY2, P.CY3, P.CY4], an: [P.AN0, P.AN1, P.AN2, P.AN3],
  vr: [hexc('#24282E'), hexc('#4E5458'), hexc('#868A88'), hexc('#BEBCB0'), hexc('#F4F1E6')],
  hair: [hexc('#120E14'), hexc('#21191F'), hexc('#33262A'), hexc('#4A3733'), hexc('#644A40')],
  veinWall: [P.BL1, P.BL2, P.BL3, P.AR2],
};
function assetsInit() {
  if (A.ready) return;
  A.art = buildArteries(true); A.hero = buildHero();
  A.brain = buildBrain(); A.head = buildHead(); A.skull = buildSkull();
  A.body = buildBody(); A.forearm = buildForearm(); A.board = buildArmBoard();
  A.veins = buildCircMesh(c => c.kind === 'vein'); A.pa = buildCircMesh(c => c.kind === 'pa'); A.pv = buildCircMesh(c => c.kind === 'pv'); A.arts = buildCircMesh(c => c.kind === 'art');
  A.heartR = buildHeartR(); A.heartL = buildHeartL();
  A.lungR = buildLung(LUNG.R, -1); A.lungL = buildLung(LUNG.L, 1);
  A.housing = buildGantryHousing(); A.gbase = buildGantryBase(); A.trim = buildBoreTrim(); A.rotor = buildRotorRing(); A.tube = buildTube(); A.blades = buildBlades(); A.det = buildDetector(); A.detFaces = buildDetFaces(); A.slip = buildSlipRing();
  A.table = buildTable(); A.inj = buildInjector(); A.syr = buildSyringe(); A.tubing = buildTubing(); A.cannula = buildCannula(); A.floor = buildFloor();
  A.rbc = buildRBC();
  A.ready = true;
}
// contrast mixing functions (read the current time)
const mixBrain = a => conc(CUR_T, arrOf(a), 'brain'), mixVein = a => conc(CUR_T, a, 'vein'), mixArt = a => conc(CUR_T, a, 'art');
// background: a calm vertical gradient in navy (drawn before the 3D pass)
function skyBG(top, bot) { for (let y = 0; y < H; y++) { const k = y / (H - 1), c = mixc(top, bot, Math.round(k * 6) / 6); buf.fill(c, y * W, (y + 1) * W); } }
