// ============================================================================
// Reference panels (docs/), drawn inside the engine closure by tools/refs.js —
// the same models, materials and lesion map as the film. Not part of the film.
// Each function draws one 360x640 panel into buf.
// ============================================================================
function refTitle(s, sub) {
  rect(0, 0, W, 44, P.BOX); rect(0, 43, W, 44, P.N4); rect(0, 0, 3, 44, P.ACC);
  text(FC, s, 12, 8, { sc: 2, c: P.INK, ol: null });
  if (sub) wrap(FC, sub, W - 24, 1).slice(0, 1).forEach(l => text(FC, l, 12, 30, { sc: 1, c: P.SUB, ol: null }));
}
// a name with a leader line from a projected world point to a label column at x (left or right aligned)
function callout(c, xf, p, s, lx, ly, col, right) {
  const q = project(c, xf ? mApply(xf, p) : p); if (!q) return;
  const tw = textW(FC, s, 1), tx = right ? lx - tw : lx, ex = right ? lx + 2 : lx - 2;
  line(Math.round(q[0]), Math.round(q[1]), ex, ly + 4, col || P.SUB);
  rect(Math.round(q[0]) - 1, Math.round(q[1]) - 1, Math.round(q[0]) + 1, Math.round(q[1]) + 1, col || P.SUB);
  rect(tx - 2, ly - 2, tx + tw + 2, ly + 10, P.BOX);
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
  r3dBegin(); skyBG(P.K0, P.N2);
  if (view === 'supine') {
    const cam = camLook([-1700, -2300, 1500], [-80, -700, -60], [0, 0, 1], 34);
    drawCTRoom(cam, 0, 0); r3dOutlines();
  } else {
    const hold = view === 'hold', pose = standingPose({ amp: 0, hold: hold ? 1 : 0 });
    const c = view === 'front' ? camLook([2700, 800, 0], [0, 760, 0], [0, 1, 0], 32) : camLook([60, 800, 2700], [60, 760, 0], [0, 1, 0], 32);
    drawFloor(c); footShadows(c, pose);
    drawPatient(c, pose, { skipParts: ['head'], pain: hold ? 0.85 : 0 });
    r3dOutlines();
  }
  const T = { front: ['FRONT', 'standing, neck down'], side: ['RIGHT SIDE', 'the camera side: the symptomatic right leg is the near leg'],
    hold: ['HOLDING THE CALF', 'scenes 2 and 13: the right calf glows orange where it hurts'], supine: ['ON THE CT TABLE', 'scene 14: supine under a sheet, the head inside the gantry'] }[view];
  refTitle(T[0], T[1]);
}
// ---------------------------------------------------------------- normal anatomy (both legs, aorta to feet)
function refAnatomy(part) {
  r3dBegin(); skyBG(P.K0, P.N2);
  if (part === 'whole') {
    const c = camLook([0, 600, 2250], [0, 600, 0], [0, 1, 0], 34);
    ghostBody(c, null, ['pelvis', 'R', 'L']); drawTreeExpl(c, TREE_NN(), {}); r3dOutlines();
    const L = [['Abdominal aorta', [0, 1150, -38], 52], ['Common iliac', midPt('RCIA', 0.5), 84], ['External iliac', midPt('REIA', 0.5), 116], ['Internal iliac', midPt('RIIA', 0.6), 148],
      ['Common femoral', midPt('RCFA', 0.5), 180], ['Profunda femoris', midPt('RPFA', 0.55), 226], ['Superficial femoral', midPt('RSFA', 0.55), 262], ['Popliteal', midPt('RPOP', 0.5), 318],
      ['Tibioperoneal trunk', midPt('RTPT', 0.5), 368], ['Anterior tibial', midPt('RATA', 0.3), 404], ['Peroneal', midPt('RPER', 0.6), 444], ['Posterior tibial', midPt('RPTA', 0.55), 480], ['Dorsalis pedis', midPt('RATA', 0.97), 540]];
    L.forEach(([s, p, ly]) => callout(c, null, p, s, 8, ly + 40, P.INK));
    refTitle('ARTERIAL ANATOMY', 'normal; front view, the patient\'s right on the left; calibres drawn 3.9x');
  } else {
    const xf = mT(83, 0, 0), c = camLook([0, 420, 820], [0, 420, 0], [0, 1, 0], 34);
    ghostBody(c, xf, ['R']); drawTreeExpl(c, TREE_N(), { xf }); r3dOutlines();
    const R = [['Popliteal', midPt('RPOP', 0.4), 100], ['Genicular branches', midPt('RGEN1', 0.4), 136], ['Anterior tibial', midPt('RATA', 0.25), 200], ['Tibioperoneal trunk', midPt('RTPT', 0.5), 252],
      ['Posterior tibial', midPt('RPTA', 0.3), 312], ['Peroneal', midPt('RPER', 0.4), 372]];
    R.forEach(([s, p, ly], i) => callout(c, xf, p, s, i % 2 ? 352 : 8, ly + 40, P.INK, i % 2 === 1));
    refTitle('BELOW THE KNEE', 'popliteal -> anterior tibial + tibioperoneal trunk -> posterior tibial + peroneal');
  }
}
// ---------------------------------------------------------------- the lesion map (this patient, fixed for the whole film)
function refLesions() {
  r3dBegin(); skyBG(P.K0, P.N2);
  const xf = mT(83, 0, 0), c = camLook([0, 560, 1500], [0, 560, 0], [0, 1, 0], 34);
  ghostBody(c, xf, ['R']); drawTreeExpl(c, TREE_R(), { xf, hot: [{ k: 1 }, { k: 1 }] }); r3dOutlines();
  const L = [['L1 SFA stenosis, mid thigh', [-76, 690, 4], 166, P.PAIN], ['L2 popliteal occlusion', [-75, 520, -40], 240, P.PAIN],
    ['collaterals around L2', midPt('RGEN1', 0.45), 280, P.WARN], ['L3a anterior tibial', [-96, 378, 8], 346, P.WARN],
    ['L3c peroneal narrowing', [-92, 268, -22], 386, P.WARN], ['L3b anterior tibial', [-97, 252, 15], 426, P.WARN],
    ['rail-track calcium', [-66, 220, -30], 466, P.INK], ['posterior tibial: open', [-63, 140, -28], 506, P.CO2]];
  L.forEach(([s, p, ly, col], i) => callout(c, xf, p, s, i % 2 ? 352 : 8, ly, col, i % 2 === 1));
  refTitle('LESION MAP: RIGHT LEG', 'one map for every scene: the micro views, the CTA and the comparison');
}
// the legend panel: what each lesion is and where it appears
function refLegend() {
  r3dBegin(); skyBG(P.K0, P.N2);
  refTitle('LESION CONTINUITY', 'where each lesion appears in the film (scene numbers)');
  const rows = [
    ['L1', 'SFA stenosis (mid thigh)', 'Eccentric wall plaque with calcium; the channel stays open and narrow, a faster jet through it.', 'micro 4-9 | CTA 17-18 | final 20-21'],
    ['L2', 'Popliteal occlusion', 'No channel through the segment; the wall outline remains; no contrast through it.', 'micro 10-11 | walk 12 | CTA 19 | final 20-21'],
    ['COL', 'Genicular collaterals', 'Small side channels that enlarge and bypass L2; they never reopen it.', 'micro 11 | CTA 19 | final 20-21'],
    ['L3', 'Below the knee', 'Two anterior tibial stenoses, a narrowed peroneal, rail-track calcium; posterior tibial open.', 'trees 16-21'],
    ['LEFT', 'Left leg (milder)', 'Calcified tibials, one mild anterior tibial and one mild SFA narrowing.', 'trees 16-19'],
    ['RULES', 'Always true', 'Glucose stays in the blood. Plaque stays in the wall. Calcium is opaque white, not contrast. Rest lowers demand; the lesions remain. CTA only shows.', ''],
  ];
  let y = 58;
  for (const [id, name, what, where] of rows) {
    rect(8, y - 4, W - 8, y + 86, P.N1); rect(8, y - 4, 11, y + 86, id === 'RULES' ? P.ACC : id === 'COL' ? P.WARN : id === 'LEFT' || id === 'L3' ? P.SUB : P.PAIN);
    text(FC, id, 18, y, { sc: 2, c: P.INK, ol: null }); text(FC, name, Math.max(76, 18 + textW(FC, id, 2) + 10), y + 4, { sc: 1, c: P.INK, ol: null });
    wrap(FC, what, W - 40, 1).forEach((l, i) => text(FC, l, 18, y + 24 + i * 11, { sc: 1, c: P.SUB, ol: null }));
    if (where) text(FC, where, 18, y + 68, { sc: 1, c: P.ACC, ol: null });
    y += 96;
  }
}
