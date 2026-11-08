// ============================================================================
// Reference panels (docs/), drawn inside the engine closure by tools/refs.js —
// the same models, materials and lesion map as the film. Not part of the film.
// Each function draws one 540x960 panel into buf.
// ============================================================================
const REF_BG = P.BG;
function refTitle(s, sub) {
  rect(0, 0, W, 64, P.BOX); rect(0, 63, W, 64, P.N4); rect(0, 0, 4, 64, P.ACC);
  text(FC, s, 18, 14, { sc: 2, c: P.INK, ol: null });
  if (sub) text(FC, sub, 18, 38, { sc: 1, c: P.SUB, ol: null });
}
function refNote(lines, y) { lines.forEach((l, i) => text(FC, l, 18, y + i * 13, { sc: 1, c: P.SUB, ol: null })); }
// a name with a leader line from a projected world point to a label column at x (left or right aligned)
function callout(c, xf, p, s, lx, ly, col, right) {
  const q = proj(c, xf ? mApply(xf, p) : p); if (!q) return;
  const tw = textW(FC, s, 1), tx = right ? lx - tw : lx, ex = right ? lx + 3 : lx - 3;
  line(Math.round(q[0]), Math.round(q[1]), ex, ly + 4, col || P.SUB);
  rect(Math.round(q[0]) - 1, Math.round(q[1]) - 1, Math.round(q[0]) + 2, Math.round(q[1]) + 2, col || P.SUB);
  rect(tx - 3, ly - 3, tx + tw + 3, ly + 11, P.BOX);
  text(FC, s, tx, ly, { sc: 1, c: col || P.INK, ol: null });
}
const midPt = (name, u) => { const a = ART[name].pts, f = clamp(u, 0, 1) * (a.length - 1), i = Math.min(a.length - 2, Math.floor(f)), h = f - i; return [lerp(a[i][0], a[i + 1][0], h), lerp(a[i][1], a[i + 1][1], h), lerp(a[i][2], a[i + 1][2], h)]; };
// ---------------------------------------------------------------- the patient
function standingPose(q) {
  const p0 = patientPose([0, 0, 0], 0, q);
  let low = 1e9; for (const s of [p0.right, p0.left]) for (const x of [-20, 160]) low = Math.min(low, mApply(s.ft, [x, -86, 0])[1]);
  return patientPose([0, -low, 0], 0, q);
}
function refPatient(view) {
  voxBegin(); clear(REF_BG);
  if (view === 'supine') {
    const C = CT(), c = camLook([1700, 2500, 2300], [0, 950, 500], [0, 1, 0], 34);
    drawVox(c, C.table, null); drawVox(c, C.base, null);
    const pose = patientPose(null, 0, { amp: 0, rootM: lyingRoot(400) });
    drawPatient(c, pose, { skipParts: ['head'] });
  } else {
    const hold = view === 'hold', pose = standingPose({ amp: 0, hold: hold ? 1 : 0 });
    const c = view === 'front' ? camLook([2700, 800, 0], [0, 760, 0], [0, 1, 0], 32) : view === 'back' ? camLook([-2700, 800, 0], [0, 760, 0], [0, 1, 0], 32) : camLook([60, 800, 2700], [60, 760, 0], [0, 1, 0], 32);
    drawVox(c, FLOOR(), null); footShadows(c, pose);
    drawPatient(c, pose, { skipParts: ['head'], pain: hold ? 0.7 : 0 });
  }
  voxOutlines();
  const T = { front: ['FRONT', 'standing, neck down'], side: ['RIGHT SIDE', 'the camera side: the symptomatic right leg is the near leg'], back: ['BACK', 'standing, neck down'],
    hold: ['HOLDING THE RIGHT CALF', 'scenes 2-3 and 13; the calf glows orange where it hurts'], supine: ['SUPINE, HEAD FIRST', 'scene 14: CT table; the head is inside the gantry'] }[view];
  refTitle(T[0], T[1]);
}
// ---------------------------------------------------------------- normal anatomy (both legs, aorta to feet)
const TREE_NN = () => cached('treeNN', () => treeMeshes(buildTree({ normal: true, rk: TREE_RK })));
function refAnatomy(part) {
  voxBegin(); clear(REF_BG);
  if (part === 'whole') {
    const c = camLook([0, 600, 2150], [0, 600, 0], [0, 1, 0], 34);
    ghostBody(c, null, ['pelvis', 'R', 'L']); voxBegin();
    treeExpl(c, TREE_NN(), { wallA: 0.3 }); voxOutlines();
    const L = [['Abdominal aorta', [0, 1150, -38], 64], ['Common iliac', midPt('RCIA', 0.5), 112], ['External iliac', midPt('REIA', 0.5), 160], ['Internal iliac', midPt('RIIA', 0.6), 208],
      ['Common femoral', midPt('RCFA', 0.5), 256], ['Profunda femoris', midPt('RPFA', 0.55), 320], ['Superficial femoral (SFA)', midPt('RSFA', 0.55), 384], ['Popliteal', midPt('RPOP', 0.5), 470],
      ['Tibioperoneal trunk', midPt('RTPT', 0.5), 545], ['Anterior tibial', midPt('RATA', 0.3), 600], ['Peroneal', midPt('RPER', 0.6), 660], ['Posterior tibial', midPt('RPTA', 0.55), 715], ['Dorsalis pedis', midPt('RATA', 0.97), 800]];
    L.forEach(([s, p, ly]) => callout(c, null, p, s, 14, ly + 60, P.INK));
    refTitle('ARTERIAL ANATOMY (NORMAL)', 'front view; the patient\'s right is on the left; calibres drawn 3.45x for legibility');
  } else {
    const xf = mT(83, 0, 0), c = camLook([0, 420, 900], [0, 420, 0], [0, 1, 0], 34);
    ghostBody(c, xf, ['R']); voxBegin();
    treeExpl(c, TREE_N(), { xf, wallA: 0.3 }); voxOutlines();
    const R = [['Popliteal', midPt('RPOP', 0.4), 150], ['Genicular branches', midPt('RGEN1', 0.4), 200], ['Anterior tibial', midPt('RATA', 0.25), 300], ['Tibioperoneal trunk', midPt('RTPT', 0.5), 380],
      ['Posterior tibial', midPt('RPTA', 0.3), 470], ['Peroneal', midPt('RPER', 0.4), 560]];
    R.forEach(([s, p, ly], i) => callout(c, xf, p, s, i % 2 ? 526 : 14, ly + 60, P.INK, i % 2 === 1));
    refTitle('BELOW THE KNEE (RIGHT LEG)', 'popliteal -> anterior tibial + tibioperoneal trunk -> posterior tibial + peroneal');
  }
}
// ---------------------------------------------------------------- the lesion map (this patient, fixed for the whole film)
function refLesions() {
  voxBegin(); clear(REF_BG);
  const xf = mT(83, 0, 0), c = camLook([0, 560, 1650], [0, 560, 0], [0, 1, 0], 34);
  ghostBody(c, xf, ['R']); voxBegin();
  const hot = [{ y0: LES.L1.y0 + 14, y1: LES.L1.y1 - 14, k: 1 }, { y0: LES.L2.y0 + 4, y1: LES.L2.y1 - 4, k: 1 }];
  treeExpl(c, TREE_R(), { xf, wallA: 0.3, hot }); voxOutlines();
  const L = [['L1  SFA stenosis, mid thigh', [-76, 690, 4], 250, P.PAIN], ['L2  popliteal occlusion, above the knee', [-75, 520, -40], 360, P.PAIN],
    ['collaterals (genicular) around L2', midPt('RGEN1', 0.45), 420, P.WARN], ['L3a  anterior tibial stenosis', [-96, 378, 8], 520, P.WARN],
    ['L3c  peroneal narrowing', [-92, 268, -22], 580, P.WARN], ['L3b  anterior tibial stenosis', [-97, 252, 15], 640, P.WARN],
    ['medial (rail-track) calcification', [-66, 220, -30], 700, P.INK], ['posterior tibial: open', [-63, 140, -28], 760, P.ACC]];
  L.forEach(([s, p, ly, col], i) => callout(c, xf, p, s, i % 2 ? 526 : 14, ly, col, i % 2 === 1));
  refTitle('LESION MAP: RIGHT LEG', 'one map for every scene; same positions in the micro views, the CTA and the comparison');
}
// the legend panel: what each lesion is and where it appears
function refLegend() {
  voxBegin(); clear(REF_BG);
  refTitle('LESION CONTINUITY', 'where each lesion appears in the film (scene numbers)');
  const rows = [
    ['L1', 'SFA stenosis (mid thigh)', 'Eccentric wall plaque with calcium; the channel stays open and narrow, faster jet through it.', 'micro (stenosis site): 4-9 | CTA: 17-18 | comparison: 20-21 (highlight 1)'],
    ['L2', 'Popliteal occlusion (above the knee)', 'No channel through the segment; the wall outline remains; no contrast through it.', 'micro (occlusion site): 10-11 | demand: 12 | CTA: 19 | comparison: 20-21 (highlight 2)'],
    ['COL', 'Genicular collaterals', 'Pre-existing small side channels that enlarge and bypass L2; they never reopen it.', 'micro: 11 | CTA: 19 | comparison: 20-21 (highlight 3)'],
    ['L3', 'Below-knee disease', 'Two anterior tibial stenoses, a narrowed peroneal, medial (rail-track) calcification; posterior tibial open.', 'tree views: 16-21'],
    ['LEFT', 'Left leg (milder)', 'Calcified tibials, one mild anterior tibial and one mild SFA narrowing.', 'tree views: 16-19'],
    ['RULES', 'Always true', 'Glucose stays in the blood (no plug). Plaque stays in the wall. Calcium is opaque white, distinct from contrast. Rest lowers demand; the lesions remain. CTA only shows.', ''],
  ];
  let y = 92;
  for (const [id, name, what, where] of rows) {
    rect(14, y - 6, W - 14, y + 108, P.N1); rect(14, y - 6, 18, y + 108, id === 'RULES' ? P.ACC : id === 'COL' ? P.WARN : id === 'LEFT' || id === 'L3' ? P.SUB : P.PAIN);
    text(FC, id, 28, y, { sc: 2, c: P.INK, ol: null }); text(FC, name, 96, y + 4, { sc: 1, c: P.INK, ol: null });
    wrap(FC, what, W - 60, 1).forEach((l, i) => text(FC, l, 28, y + 26 + i * 12, { sc: 1, c: P.SUB, ol: null }));
    if (where) wrap(FC, where, W - 60, 1).forEach((l, i) => text(FC, l, 28, y + 76 + i * 12, { sc: 1, c: P.ACC, ol: null }));
    y += 126;
  }
}
