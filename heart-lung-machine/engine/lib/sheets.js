// SHEETS — reference sheets drawn by the same code as the film (tools/render.py --sheets …). They are documentation, so
// their names and notes are always drawn (they do not go through the caption layer).
(() => {
const { W, H, P } = PIX;
const SH = window.SHEETS = {};
const R = n => window.RAMP[n];
const bar = (c, s) => { PIX.rect(c, 0, 0, W, 20, 'n1'); PIX.rect(c, 0, 20, W, 1, 'n3'); PIX.text(c, s, 6, 7, 'w', { shadow: null }); };
const note = (c, s, x, y, col = 'g8', o = {}) => { const w = PIX.textWidth(s), x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x; PIX.rect(c, Math.round(x0) - 2, y - 2, w + 4, 11, 'k'); PIX.text(c, s, x, y, col, { shadow: null, ...o }); };
const lab = (c, text, ax, ay, tx, ty, col = 'w', align) => { const w = PIX.textWidth(text), x0 = align === 'right' ? tx - w : align === 'center' ? tx - w / 2 : tx; PIX.rect(c, Math.round(x0) - 2, Math.round(ty) - 2, w + 4, 11, 'k'); PIX.label(c, { ax, ay, tx, ty, text, t0: 0, col, lineCol: 'g6', align, shadow: null }, 9); };
// the locked circuit from the side, every part named: the source-to-mechanism reference
SH.circuit = c => {
  const cam = { x: 0, y: 6, z: 0.92 }, S = (x, y) => K.S(cam, x, y), L = SIDE.LY;
  SIDE.scene(c, cam, 0.25, {});
  bar(c, 'THE CIRCUIT, SEEN FROM THE SIDE');
  const T = (t, x, y, tx, ty, col, al) => { const [ax, ay] = S(x, y); lab(c, t, ax, ay, tx, ty, col, al); };
  T('HEART (CUTAWAY)', -36, -110, 96, 28, 'hr5', 'center'); T('VENOUS LINE', -67.5, -60, 4, 112, 'vb5'); T('ARTERIAL LINE', 46, -80, 266, 64, 'ab5', 'right');
  T('CARDIOPLEGIA LINE', 25, -44, 266, 78, 'hr4', 'right'); T('SUCTION LINE', -97, -40, 4, 40, 'vb4'); T('MONITOR', -38, -40, 40, 190, 'mt4', 'center');
  T('BUBBLE DETECTOR', 59, -16, 266, 172, 'mt4', 'right'); T('GAS BLENDER', 90, -16, 266, 158, 'ox4', 'right'); T('CARDIOPLEGIA PUMP', 34, 4, 266, 206, 'hr5', 'right');
  T('RESERVOIR', -76, 30, 4, 268, 'vb5'); T('ARTERIAL FILTER', 64, 9, 266, 220, 'ab5', 'right'); T('OXYGENATOR', 64, 44, 266, 250, 'ox4', 'right');
  T('HEAT EXCHANGER', 64, 84, 266, 300, 'wa4', 'right'); T('CENTRIFUGAL PUMP', -14, 108, 70, 318, 'g9', 'center'); T('SUCTION PUMP', -87, 122, 4, 300, 'vb5');
  T('HEATER-COOLER', 120, 160, 266, 412, 'wa4', 'right'); T('EXHAUST', 75, 72, 266, 278, 'ox3', 'right');
  note(c, 'DOWN BY GRAVITY, THROUGH THE MACHINE, BACK UP.', 4, 466, 'g9');
};
SH.heart = c => {
  const cam = { x: -4, y: -24, z: 2.1 }, S = (x, y) => K.S(cam, x, y);
  HEART.field(c, cam, 0); HEART.draw(c, cam, 0); for (const k of ['cardio', 'venous', 'arterial']) WORLD.tube(c, cam, k, 0, {});
  bar(c, 'THE ARRESTED HEART (FROM ABOVE)');
  const T = (t, x, y, tx, ty, al) => { const [ax, ay] = S(x, y); lab(c, t, ax, ay, tx, ty, 'w', al); };
  T('RA', -46, 14, 14, 330); T('RV', 6, 28, 120, 420, 'center'); T('LV', 42, 30, 262, 380, 'right'); T('AORTA', -14, -44, 14, 40); T('PA', 18, -46, 262, 60, 'right'); T('SVC', -31, -96, 14, 74);
  note(c, 'CANNULA ABOVE THE CLAMP: BODY SIDE.', 6, 452, 'ab5'); note(c, 'CARDIOPLEGIA BELOW IT: HEART SIDE.', 6, 464, 'hr5');
};
// the machine's parts in cutaway, each in its own panel at a readable zoom
SH.machine = c => {
  PIX.rect(c, 0, 0, W, H, 'k');
  const panel = (x, y, w, h, cam, fn) => { const pc = { ...cam, x: cam.x - (x + w / 2 - W / 2) / cam.z, y: cam.y - (y + h / 2 - H / 2) / cam.z }; window.inset(c, x, y, w, h, cc => { PIX.rect(cc, x, y, w, h, 'n0'); fn(cc, pc); }); PIX.rect(c, x, y, w, 1, 'g3'); };
  panel(2, 24, 132, 140, { x: -62, y: 30, z: 1.9 }, (cc, cam) => { MACHINE.reservoir(cc, cam, 0.4, { led: 1 }); window.resParticles(cc, cam, 0.4); });
  panel(136, 24, 132, 140, { x: 52, y: 46, z: 1.35 }, (cc, cam) => { MACHINE.oxy(cc, cam, 0.4, {}); });
  panel(2, 168, 132, 140, { x: -14, y: 120, z: 3.2 }, (cc, cam) => { MACHINE.pump(cc, cam, 0.3, { cut: 1 }); window.pumpCells(cc, cam, 0.3, 1); });
  panel(136, 168, 132, 140, { x: -87, y: 128, z: 4.6 }, (cc, cam) => { const S_ = SIDE.LY.suc; MACHINE.roller(cc, cam, S_.head[0], S_.head[1], S_.hr, S_.y0, 0.3, { fluid: 'vb' }); });
  panel(2, 312, 132, 140, { x: 120, y: 160, z: 1.8 }, (cc, cam) => { MACHINE.hcu(cc, cam, 0.3, { cut: 1 }); });
  panel(136, 312, 132, 140, { x: 78, y: -9, z: 3.6 }, (cc, cam) => { MACHINE.blender(cc, cam, 0.3, { cut: 1 }); });
  bar(c, 'THE PARTS, FROM THE SIDE (CUTAWAY)');
  note(c, 'RESERVOIR', 6, 150, 'vb5'); note(c, 'OXYGENATOR', 140, 150, 'ox4');
  note(c, 'CENTRIFUGAL PUMP', 6, 294, 'g9'); note(c, 'ROLLER PUMP (SUCTION,', 140, 284, 'w'); note(c, 'CARDIOPLEGIA)', 140, 295, 'w');
  note(c, 'HEATER-COOLER', 6, 438, 'wa4'); note(c, 'GAS BLENDER', 140, 438, 'ox4');
  note(c, 'MAGNETS TURN THE ROTOR THROUGH THE WALL.', 4, 466, 'g9');
};
SH.micro = c => {
  PIX.rect(c, 0, 0, W, H, 'pl0');
  window.inset(c, 0, 22, 135, 150, cc => window.fiberSection(cc, { x: (135 - 67) / 0.55, y: -10 + (240 - 97) / 0.55, z: 0.55 }, 1.5, { turn: 1 }));
  window.inset(c, 135, 22, 135, 150, cc => { cc.translate(0, 0); window.membraneView(cc, { x: -67, y: 143, z: 1 }, 1.2, 1); });
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
  window.inset(c, 0, 300, 270, 180, cc => { PIX.rect(cc, 0, 300, 270, 180, 'n0'); PEOPLE.perfusionist(cc, { x: -170, y: 527, z: 0.55 }); });
  bar(c, 'THE TEAM: HANDS AND BACKS ONLY, NO FACES');
  note(c, 'SURGEONS: TEAL GOWNS, LIGHT NEUTRAL GLOVES', 4, 286, 'gw5'); note(c, 'PERFUSIONIST AT THE CONSOLE, FROM BEHIND', 4, 466, 'sc5');
};
SH.palette = c => {
  PIX.rect(c, 0, 0, W, H, 'k'); bar(c, 'COLOUR CODE (HUE-SHIFTED RAMPS)');
  const rows = [['BACKGROUND', ['k', 'n0', 'n1', 'n2', 'n3', 'n4', 'n5']], ['HEART (MUTED ROSE)', R('hr')], ['VENOUS BLOOD (BURGUNDY)', R('vb')], ['OXYGENATED BLOOD (RED)', R('ab')], ['RED CELLS', R('rc')],
    ['DRAPES (DESATURATED TEAL)', R('dr')], ['GOWNS (TEAL)', R('gw')], ['GLOVES (LIGHT NEUTRAL)', R('gl')], ['SKIN', R('sk')], ['O2 AND GAS PATH (CYAN)', R('ox')], ['CO2 (AMBER)', R('co')],
    ['WATER (BLUE)', R('wa')], ['HEMOGLOBIN (LAVENDER)', R('hb')], ['HEME (GOLD)', R('hm')], ['STEEL / CONSOLE', R('g')], ['DEVICE PLASTIC', R('iv')], ['HIGHLIGHT (MINT)', R('mt')]];
  rows.forEach(([name, keys], i) => { note(c, name, 6, 28 + i * 26, 'g9'); keys.forEach((k, j) => PIX.rect(c, 6 + j * 22, 38 + i * 26, 20, 10, k)); });
};
// the cover: the opening frame with the hook (no caption layer: it is a poster)
const cover = (c, text) => {
  WORLD.scene(c, WORLD.CAM0, 0.4);
  if (!text) return;
  const lines = [['THE HEART IS STILL.', 'w'], ['WHAT KEEPS', 'ab4'], ['BLOOD MOVING?', 'ab4']];
  lines.forEach(([s, col], i) => { const w = PIX.textWidth(s, 2), x = Math.round(W / 2 - w / 2), y = 64 + i * 28; PIX.rect(c, x - 8, y - 7, w + 16, 28, 'k'); PIX.rect(c, x - 8, y - 7, 2, 28, 'ab3'); PIX.text(c, s, x, y, col, { sc: 2, shadow: null }); });
};
SH.cover = c => cover(c, true);
SH.cover_clean = c => cover(c, false);
})();
