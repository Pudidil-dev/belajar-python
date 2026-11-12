// SHEETS — reference sheets drawn by the same code as the film (tools/render.py --sheets …). They are documentation, so
// their names and notes are always drawn (they do not go through the caption layer).
(() => {
const { W, H, P } = PIX;
const SH = window.SHEETS = {};
const R = n => window.RAMP[n];
const bar = (c, s) => { PIX.rect(c, 0, 0, W, 20, 'n1'); PIX.rect(c, 0, 20, W, 1, 'n3'); PIX.text(c, s, 6, 7, 'w', { shadow: null }); };
const note = (c, s, x, y, col = 'g8', o = {}) => PIX.text(c, s, x, y, col, { shadow: 'k', ...o });
const lab = (c, text, ax, ay, tx, ty, col = 'w', align) => PIX.label(c, { ax, ay, tx, ty, text, t0: 0, col, lineCol: 'g7', align, shadow: 'k' }, 9);
// the locked circuit, every component named: the source-to-mechanism reference
SH.circuit = c => {
  const cam = { x: -6, y: 392, z: 0.4 }, S = (x, y) => K.S(cam, x, y), L = WORLD.LY;
  WORLD.scene(c, cam, 0.25); PIX.dim(c, 1);
  WORLD.tube(c, cam, 'venous', 0.25, {}); WORLD.tube(c, cam, 'arterial', 0.25, {}); WORLD.tube(c, cam, 'resPump', 0.25, {}); WORLD.tube(c, cam, 'pumpOxy', 0.25, {});
  bar(c, 'THE LOCKED CIRCUIT (ONE LAYOUT, EVERY SCENE)');
  const T = (t, x, y, tx, ty, col, al) => { const [ax, ay] = S(x, y); lab(c, t, ax, ay, tx, ty, col, al); };
  T('VENOUS CANNULA (RA)', -44, 8, 6, 40, 'vb5'); T('ARTERIAL CANNULA', -14, -66, 264, 34, 'ab5', 'right'); T('CROSS-CLAMP', -20, -46, 264, 50, 'g9', 'right');
  T('CARDIOPLEGIA (THIN)', 104, 200, 264, 150, 'hr5', 'right'); T('VENOUS LINE', -96, 300, 6, 200, 'vb5'); T('ARTERIAL LINE', 100, 400, 264, 238, 'ab5', 'right');
  T('RESERVOIR', -80, 760, 6, 300, 'tw4'); T('PUMP (CENTRIFUGAL)', -34, 868, 6, 452, 'g9'); T('OXYGENATOR + HX + FILTER', 42, 790, 264, 300, 'iv5', 'right');
  T('BUBBLE DETECTOR', 66, 688, 264, 268, 'mt4', 'right'); T('GAS (PALE CYAN)', 100, 718, 264, 330, 'ox4', 'right'); T('WATER (BLUE)', 150, 840, 264, 400, 'wa4', 'right');
  note(c, 'DOWN THE LEFT, ACROSS THE MACHINE, UP THE RIGHT.', 6, 466, 'g9');
};
SH.heart = c => {
  const cam = { x: -4, y: -24, z: 2.1 }, S = (x, y) => K.S(cam, x, y);
  HEART.field(c, cam, 0); HEART.draw(c, cam, 0); for (const k of ['cardio', 'venous', 'arterial']) WORLD.tube(c, cam, k, 0, {});
  bar(c, 'THE ARRESTED HEART (ANTERIOR VIEW)');
  const T = (t, x, y, tx, ty, al) => { const [ax, ay] = S(x, y); lab(c, t, ax, ay, tx, ty, 'w', al); };
  T('RA', -46, 14, 14, 330); T('RV', 6, 28, 120, 420, 'center'); T('LV', 42, 30, 262, 380, 'right'); T('AORTA', -14, -44, 14, 40); T('PA', 18, -46, 262, 60, 'right'); T('SVC', -31, -96, 14, 74);
  note(c, 'CANNULA ABOVE THE CLAMP: BODY SIDE.', 6, 452, 'ab5'); note(c, 'CARDIOPLEGIA BELOW IT: HEART SIDE.', 6, 464, 'hr5');
};
SH.machine = c => {
  PIX.rect(c, 0, 0, W, H, 'n0');
  const part = (x, y, w, h, cam, fn) => window.inset(c, x, y, w, h, cc => { cc.translate(0, 0); fn(cc, { ...cam, x: cam.x - (x + w / 2 - W / 2) / cam.z, y: cam.y - (y + h / 2 - H / 2) / cam.z }); });
  part(4, 24, 130, 220, { x: -79, y: 780, z: 2.2 }, (cc, cam) => { PIX.rect(cc, 4, 24, 130, 220, 'n0'); MACHINE.reservoir(cc, cam, 0, { cut: 1, led: 0.4 }); window.resParticles(cc, cam, 0.4); });
  part(136, 24, 130, 220, { x: 42, y: 790, z: 1.9 }, (cc, cam) => { PIX.rect(cc, 136, 24, 130, 220, 'n0'); MACHINE.oxy(cc, cam, 0, { cut: 1 }); });
  part(4, 252, 262, 200, { x: -34, y: 862, z: 3.4 }, (cc, cam) => { PIX.rect(cc, 4, 252, 262, 200, 'n0'); MACHINE.pump(cc, cam, 0.3, { cut: 1 }); window.pumpCells(cc, cam, 0.3, 1); });
  bar(c, 'MACHINE PARTS (CUTAWAY)');
  note(c, 'RESERVOIR', 8, 230, 'tw4'); note(c, 'OUTLET ALWAYS SUBMERGED', 8, 240, 'g8'); note(c, 'OXYGENATOR ASSEMBLY', 140, 230, 'iv5');
  note(c, 'CENTRIFUGAL PUMP: CENTRAL INLET, SMOOTH ROTOR,', 8, 456, 'g9'); note(c, 'PERIPHERAL OUTLET, MAGNETIC DRIVE', 8, 466, 'g9');
};
SH.micro = c => {
  PIX.rect(c, 0, 0, W, H, 'pl0');
  window.inset(c, 0, 22, 135, 150, cc => window.fiberSection(cc, { x: (135 - 67) / 0.55, y: -10 + (240 - 97) / 0.55, z: 0.55 }, 1.5, { turn: 1 }));
  window.inset(c, 135, 22, 135, 150, cc => { const cam = { x: 0, y: 0, z: 1 }; cc.translate(0, 0); window.membraneView(cc, { x: -67, y: 143, z: 1 }, 1.2, 1); });
  const cam3 = { x: 0, y: 0, z: 1.2 };
  window.inset(c, 0, 176, 270, 160, cc => { PIX.rect(cc, 0, 176, 270, 160, 'pl0'); MICRO.hb(cc, { x: 46, y: -14, z: 1.2 }, 0, 0, 40, { bound: [1, 0, 0, 1], shift: 1 }); MICRO.rbc(cc, { x: 0, y: 0, z: 1 }, 220 - 135, 256 - 240, 34, 23, -0.2); });
  MICRO.o2(c, 40, 370, 6, -0.5, {}); MICRO.co2(c, 120, 370, 5, 0.2, {}); MICRO.heme(c, 210, 372, 16, { bound: 1 });
  bar(c, 'THE MICROSCOPIC MODELS (SCHEMATIC SCALE)');
  note(c, 'FIBRE: GAS IN,', 4, 152, 'ox4'); note(c, 'BLOOD OUTSIDE', 4, 162, 'rc5'); note(c, 'MEMBRANE: INTACT', 140, 160, 'iv5');
  note(c, 'HEMOGLOBIN: 4 SUBUNITS, 4 HEMES', 4, 322, 'hb5'); note(c, 'RED CELL', 186, 322, 'rc5');
  note(c, 'O2 (CYAN PAIR)', 8, 392, 'ox4'); note(c, 'CO2 (AMBER)', 98, 392, 'co4'); note(c, 'HEME + O2 ON IRON', 160, 400, 'hm4');
  note(c, 'COLOURS ARE TEACHING CONVENTIONS.', 4, 430, 'g8'); note(c, 'SIZES ARE NOT TO SCALE.', 4, 442, 'g8');
};
SH.people = c => {
  const cam = { x: 0, y: 70, z: 1.25 }; HEART.field(c, cam, 0); HEART.draw(c, cam, 0); PEOPLE.surgeon(c, cam, -1, {}); PEOPLE.surgeon(c, cam, 1, {});
  const cam2 = { x: -170, y: 527, z: 0.55 }; window.inset(c, 0, 300, 270, 180, cc => { PIX.rect(cc, 0, 300, 270, 180, 'n0'); PEOPLE.perfusionist(cc, cam2); });
  bar(c, 'THE TEAM: HANDS AND BACKS ONLY, NO FACES');
  note(c, 'SURGEONS: TEAL GOWNS, LIGHT NEUTRAL GLOVES', 4, 286, 'gw5'); note(c, 'PERFUSIONIST AT THE CONSOLE', 4, 466, 'sc5');
};
SH.palette = c => {
  PIX.rect(c, 0, 0, W, H, 'n0'); bar(c, 'COLOUR CODE (HUE-SHIFTED RAMPS)');
  const rows = [['BACKGROUND NAVY', ['k', 'n0', 'n1', 'n2', 'n3', 'n4', 'n5']], ['HEART (MUTED ROSE)', R('hr')], ['VENOUS BLOOD (BURGUNDY)', R('vb')], ['OXYGENATED BLOOD (RED)', R('ab')], ['RED CELLS', R('rc')],
    ['DRAPES (DESATURATED TEAL)', R('dr')], ['GOWNS (TEAL)', R('gw')], ['GLOVES (LIGHT NEUTRAL)', R('gl')], ['SKIN', R('sk')], ['O2 AND GAS PATH (CYAN)', R('ox')], ['CO2 (AMBER)', R('co')],
    ['WATER (BLUE)', R('wa')], ['HEMOGLOBIN (LAVENDER)', R('hb')], ['HEME (GOLD)', R('hm')], ['STEEL', R('g')], ['DEVICE PLASTIC', R('iv')], ['TUBING WALL', R('tw')]];
  rows.forEach(([name, keys], i) => { note(c, name, 6, 28 + i * 26, 'g9'); keys.forEach((k, j) => PIX.rect(c, 6 + j * 22, 38 + i * 26, 20, 10, k)); });
};
// the cover: the opening frame with the hook (no caption layer: it is a poster)
const cover = (c, text) => {
  WORLD.scene(c, WORLD.CAM0, 0.4);
  if (!text) return;
  const lines = [['The heart is still.', 'w'], ['What keeps', 'ab4'], ['blood moving?', 'ab4']];
  lines.forEach(([s, col], i) => { const w = PIX.textWidth(s, 2), x = Math.round(W / 2 - w / 2), y = 64 + i * 28; PIX.rect(c, x - 8, y - 7, w + 16, 28, 'k'); PIX.rect(c, x - 8, y - 7, 2, 28, 'ab3'); PIX.text(c, s, x, y, col, { sc: 2, shadow: 'n2' }); });
};
SH.cover = c => cover(c, true);
SH.cover_clean = c => cover(c, false);
})();
