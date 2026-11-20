// SHEETS — reference sheets of the locked assets, drawn by the same code as the film (tools/render.py --sheets …).
// They are documentation, so their names and notes are always drawn (they do not go through the caption layer).
(() => {
const { W, H, P } = PIX;
const SH = window.SHEETS = {};
const bar = (c, s) => { PIX.rect(c, 0, 0, W, 30, 'n1'); PIX.rect(c, 0, 30, W, 1, 'n3'); PIX.text(c, s, 10, 11, 'w', { shadow: null }); };
const head = (c, s) => { PIX.rect(c, 0, 0, W, H, 'n0'); bar(c, s); };
const note = (c, s, x, y, col = 'g9', o = {}) => PIX.text(c, s, x, y, col, { shadow: null, ...o });
const lab = (c, text, ax, ay, tx, ty, col = 'w', align) => PIX.label(c, { ax, ay, tx, ty, text, t0: 0, col, lineCol: 'g7', align, shadow: 'k' }, 9);
const chips = (c, keys, x, y, w = 14, hh = 10) => keys.forEach((k, i) => { PIX.rect(c, x + i * (w + 2), y, w, hh, k); });

SH.balloon = c => {
  head(c, 'A  THE BALLOON LANDSCAPE');
  BAL.view(c, { cx: 180, cy: 206, R: 150, s: 0.86 * 150 / 176, dark: 'n0' });
  note(c, 'THE PATIENT\'S VIEW: ONE ORIGINAL PICTURE, DRAWN BY CODE', 14, 368);
  BAL.inset(c, { x: 62, y: 446, R: 44 }); note(c, 'INSET, SHARP', 26, 502);
  BAL.inset(c, { x: 180, y: 446, R: 44, blur: 1.5 }); note(c, 'INSET, FOGGED', 142, 502);
  const cam = { x: 19.22 - 118 / 9.5, y: -28.6 - 126 / 9.5, z: 9.5 };
  window.inset(c, 246, 400, 104, 92, cc => { PIX.rect(cc, 246, 400, 104, 92, 'g0'); OPT.slide(cc, cam, 1, true); });
  PIX.rect(c, 246, 400, 104, 1, 'g4'); PIX.rect(c, 246, 491, 104, 1, 'g4'); note(c, 'THE SLIDE', 268, 502);
  note(c, 'SKY', 14, 532); chips(c, ['sk0', 'sk1', 'sk2', 'sk3', 'cl0', 'cl1'], 70, 530);
  note(c, 'HILLS', 14, 548); chips(c, ['hl0', 'hl1', 'hl2', 'hl3'], 70, 546);
  note(c, 'FIELDS', 14, 564); chips(c, ['f0', 'f1', 'f2', 'f3', 'f4', 'f5'], 70, 562);
  note(c, 'ROAD', 14, 580); chips(c, ['rd0', 'rd1', 'rd2'], 70, 578);
  note(c, 'BALLOON', 14, 596); chips(c, ['bc0', 'bc1', 'bc2', 'bc3', 'cr0', 'cr1', 'cr2', 'bk0', 'bk1'], 70, 594);
  note(c, 'A PICTURE INSIDE THE INSTRUMENT. NEVER A REAL BALLOON.', 14, 618, 'a2');
};
SH.patient_instrument = c => {
  head(c, 'B + C  THE PATIENT AND THE AUTOREFRACTOR');
  const cam = { ...window.EXTCAM, cy: 400 };
  window.inset(c, 0, 31, W, 500, cc => { EXT.room(cc, cam, 1); EXT.render(cc, cam, { light: 1, box: [0, 31, W, 531] }); });
  PIX.rect(c, 0, 531, W, 109, 'n0'); PIX.rect(c, 0, 531, W, 1, 'n3');
  note(c, 'ONE CALM ADULT, SEEN ONLY FROM BEHIND AND TO THE SIDE.', 12, 542);
  note(c, 'CHIN ON THE CHIN CUP, FOREHEAD ON THE BAND,', 12, 556); note(c, 'RIGHT EYE ON THE WINDOW\'S AXIS.', 12, 570);
  note(c, 'AN ORIGINAL, UNBRANDED TABLETOP INSTRUMENT:', 12, 590, 'q5'); note(c, 'IVORY HEAD AND COLUMN, GRAPHITE BASE, TEAL RING.', 12, 604, 'q5');
  chips(c, ['q3', 'q4', 'q5', 'q6', 'g2', 'g3', 'g5', 't1', 't2', 't3'], 12, 622);
};
SH.eye = c => {
  head(c, 'D  THE EYE (MILLIMETRES, RAYS TRACED)');
  const cam = { x: -12.6, y: -2.5, z: 12.6 }, S = (x, y) => K.S(cam, x, y), Pth = OPT.paths(0);
  PIX.glow(c, 180, 300, 260, 'n2', 0.7);
  EYE.draw(c, cam, { head: 0 });
  OPT.rays(c, cam, Pth.out, 99, { col: ['c1', 'c2', 'c4'], t: 0.3, w: 2 }); OPT.rays(c, cam, Pth.back, 99, { col: ['m1', 'm2', 'm4'], t: 0.3 });
  const L = (t, x, y, tx, ty, al) => { const [ax, ay] = S(x, y); lab(c, t, ax, ay, tx, ty, 'w', al); };
  L('CORNEA', -0.3, -2.2, 300, 150, 'center'); L('PUPIL', -3.62, 2.0, 318, 470, 'center'); L('IRIS', -3.6, -4.4, 238, 132, 'center'); L('LENS', -5.6, 3.6, 250, 492, 'center');
  L('VITREOUS', -15, 5, 120, 500, 'center'); L('RETINA', -22.4, -5.8, 44, 140); L('SCLERA', -22.6, 8.2, 30, 482);
  note(c, 'CORNEA R 7.8 / 6.5 MM, 0.55 THICK. PUPIL 4 MM.', 12, 528); note(c, 'LENS R 10.2 / 6.0 MM, 4.0 THICK. AXIAL LENGTH 24.0 MM.', 12, 542);
  note(c, 'CYAN: IN, A THIN BEAM THROUGH THE PUPIL CENTRE.', 12, 566, 'c3'); note(c, 'MAGENTA: BACK, THROUGH A RING ZONE OF THE PUPIL.', 12, 580, 'm3');
  note(c, 'THE COLOURS MARK DIRECTION ONLY. THE LIGHT IS INFRARED.', 12, 600);
  chips(c, ['o1', 'i1', 'l1', 'l2', 'v0', 'r1', 'u1', 'x2', 'z1'], 12, 620);
};
SH.optics = c => {
  head(c, 'E  THE OPTICAL DIAGRAM (SIMPLIFIED)');
  const cam = { x: 10.6, y: -6, z: 4.8 }, S = (x, y) => K.S(cam, x, y), L = OPT.L;
  DIAG.draw(c, cam, { t: 0.4, lamp: 1, fix: 6, src: 1, out: 99, back: 99, spots: 1, outOnly: [0, 2] });
  bar(c, 'E  THE OPTICAL DIAGRAM (SIMPLIFIED)');
  const T = (t, x, y, tx, ty, al) => { const [ax, ay] = S(x, y); lab(c, t, ax, ay, tx, ty, 'w', al); };
  T('BALLOON SLIDE', L.DM - 4, L.CHART - 4, 150, 118, 'right'); T('FOGGING LENS', L.DM - 4.6, L.FOG, 150, 196, 'right'); T('MIRROR', L.DM - 2.2, 2.2, 150, 420, 'right');
  T('BEAM SPLITTER', L.BS + 2, 2, 352, 300, 'right'); T('INFRARED SOURCE', L.SRC + 1.5, -2.2, 352, 150, 'right');
  T('RING LENS', L.BS - 4.6, L.RING, 150, 470, 'right'); T('SENSOR', L.BS - 5.6, L.SENS + 1, 150, 500, 'right');
  PIX.rect(c, 0, 548, W, 92, 'n0'); PIX.rect(c, 0, 548, W, 1, 'n3');
  note(c, 'AMBER: THE VISIBLE FIXATION PATH (WHAT THE PATIENT SEES).', 10, 558, 'a2');
  note(c, 'CYAN: OUTGOING INFRARED. MAGENTA: RETURNING INFRARED.', 10, 574, 'c3');
  note(c, 'RETINAL-RETURN, RING-IMAGE ARCHITECTURE. NO PRISM,', 10, 596); note(c, 'NO LENSLET GRID. WORKING DISTANCE COMPRESSED.', 10, 610);
};
SH.sensor_ring = c => {
  head(c, 'F  THE SENSOR AND ITS RING');
  const s = 2, g = 64, row = (y, mode, name, col) => { PIX.rect(c, 20, y - 2, 132, 132, 'g3'); SEN.grid(c, { cx: 20 + 2 + g, cy: y + g, s, mode, gaps: false, box: [22, y, 22 + 128, y + 128] }); note(c, name, 166, y + 6, col); };
  row(44, 'light', 'LIGHT ON THE PIXELS', 'm3'); note(c, 'MAGENTA = RETURNING LIGHT', 166, 62); note(c, '(AN OVERLAY COLOUR)', 166, 76);
  row(186, 'charge', 'COLLECTED CHARGE', 'y3'); note(c, 'PALE GOLD = ELECTRONS', 166, 204); note(c, 'IN EACH PIXEL\'S WELL', 166, 218);
  row(328, 'digital', 'DIGITAL VALUES', 'w'); note(c, 'WHITE AND GREY = NUMBERS', 166, 346);
  SEN.overlay(c, { cx: 22 + g, cy: 328 + g, s, cal: 1, fit: 1, axes: 1, samp: 0 });
  note(c, 'DASHED: THE CALIBRATION CIRCLE', 166, 372, 'e2'); note(c, 'LINE: THE FITTED ELLIPSE', 166, 386, 'e3'); note(c, 'ARROWS: ITS TWO DIRECTIONS', 166, 400, 'e3');
  SEN.die(c, 92, 546, 1); SEN.grid(c, { cx: 92, cy: 546, s: 1, mode: 'light', box: [60, 514, 124, 578] });
  note(c, '64 X 64 SCHEMATIC PIXELS', 166, 512); note(c, 'ONE FICTIONAL READING:', 166, 534); note(c, 'A RING SLIGHTLY SMALLER THAN', 166, 548); note(c, 'THE CIRCLE AND SLIGHTLY FLAT,', 166, 562); note(c, 'LONG AXIS HORIZONTAL.', 166, 576);
  note(c, 'NO VALUE IS ATTACHED TO A SIZE OR AN ANGLE.', 20, 614, 'a2');
};
SH.result = c => {
  head(c, 'G  THE RESULT (ONE FICTIONAL EXAMPLE)');
  PIX.glow(c, 180, 330, 300, 'n2', 0.7);
  RES.panel(c, { lit: [9, 9, 9] });
  PIX.rect(c, 232, 136, 96, 22, 'k'); note(c, 'Example', 240, 140, 'ga', { sc: 2 });
  note(c, 'SPH -2.00 D   CYL -0.75 D   AXIS 180°', 34, 500, 'w');
  note(c, 'THE SAME THREE VALUES ON THE SCREEN AND THE PRINTOUT.', 34, 520); note(c, 'AN ESTIMATE THAT STARTS A CLINICAL REFRACTION,', 34, 540, 'e3'); note(c, 'NOT A PRESCRIPTION. NO CONFIDENCE PERCENTAGE.', 34, 554, 'e3');
  note(c, 'CAPTIONS: PIXEL FONT, SCALE 2 OR 3; LABELS SCALE 2.', 34, 580); note(c, 'ONE DOMINANT CAPTION AT A TIME, TOP CENTRE.', 34, 594);
};
SH.printout = c => {
  head(c, 'G  THE PRINTOUT');
  PIX.glow(c, 180, 330, 300, 'n2', 0.7);
  RES.printer(c, { feed: RES.PAPER.len });
  PIX.rect(c, 8, 244, 90, 22, 'k'); note(c, 'Example', 12, 250, 'ga', { sc: 2 });
  note(c, 'A STARTING', 268, 250, 'e3'); note(c, 'ESTIMATE FOR', 268, 264, 'e3'); note(c, 'THE CLINICIAN', 268, 278, 'e3');
};
SH.palette = c => {
  head(c, 'COLOUR CODE');
  const rows = [['BACKGROUND: DARK NAVY', ['k', 'n0', 'n1', 'n2', 'n3', 'n4', 'n5']], ['DEVICE: IVORY', ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6']], ['DEVICE: GRAPHITE', ['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'ga', 'gb', 'w']],
    ['DEVICE: TEAL ACCENTS', ['t0', 't1', 't2', 't3', 't4']], ['VISIBLE FIXATION PATH: AMBER', ['a0', 'a1', 'a2', 'a3']], ['OUTGOING MEASUREMENT LIGHT: CYAN', ['c0', 'c1', 'c2', 'c3', 'c4', 'c5']],
    ['RETURNING MEASUREMENT LIGHT: MAGENTA', ['m0', 'm1', 'm2', 'm3', 'm4']], ['SENSOR CHARGE: PALE GOLD', ['y0', 'y1', 'y2', 'y3', 'y4']], ['DIGITAL RESULT: WHITE AND MINT', ['e0', 'e1', 'e2', 'e3', 'e4', 'w']],
    ['EYE: CORNEA, IRIS, LENS', ['o0', 'o1', 'o2', 'o3', 'i0', 'i1', 'i2', 'l0', 'l1', 'l2', 'l3']], ['EYE: SCLERA, CHOROID, RETINA, FLUIDS', ['x0', 'x1', 'x2', 'u0', 'u1', 'r0', 'r1', 'r2', 'v0', 'v1', 'v2']],
    ['PATIENT: SKIN, HAIR, TOP', ['s0', 's1', 's2', 's3', 's4', 'h0', 'h1', 'h2', 'h3', 'j0', 'j1', 'j2', 'j3']], ['GLASS, SILICON, PAPER', ['b0', 'b1', 'b2', 'b3', 'si0', 'si1', 'si2', 'si3', 'pp0', 'pp1', 'pp2']],
    ['BALLOON PICTURE', ['sk0', 'sk2', 'hl0', 'hl2', 'f0', 'f2', 'f4', 'rd1', 'bc1', 'bc2', 'cr1', 'cr2', 'bk1']]];
  rows.forEach(([name, keys], i) => { note(c, name, 12, 44 + i * 42); chips(c, keys, 12, 58 + i * 42, 22, 16); });
};
// the cover: the question, the balloon in its round view, and the examination it belongs to
const cover = (c, text) => {
  const cam = { ...window.EXTCAM, cy: 452, s: 0.74, cx: 196 };
  EXT.room(c, cam, 1); EXT.render(c, cam, { light: 1 });
  FX.fadeAbove(c, 60, 300, 0.75);
  const I = { x: 180, y: 250, R: 112 }, [ex, ey] = EXT.proj(cam, -4, 0, 44);
  window.insetLeader(c, I, ex, ey, 1);
  PIX.circ(c, I.x, I.y, I.R + 8, 'k'); PIX.circ(c, I.x, I.y, I.R + 5, 'q5'); PIX.circ(c, I.x, I.y, I.R + 2, 'k');
  BAL.view(c, { cx: I.x, cy: I.y, R: I.R, s: 0.86 * I.R / 176, outside: false });
  if (!text) return;
  const s1 = 'Why THIS balloon?', w = PIX.textWidth(s1, 3), x = Math.round(180 - w / 2);
  PIX.rect(c, x - 10, 70, w + 20, 41, 'k'); PIX.rect(c, x - 10, 70, 3, 41, 'bc2');
  PIX.text(c, 'Why ', x, 80, 'w', { sc: 3, shadow: 'n2' }); PIX.text(c, 'THIS', x + PIX.textWidth('Why ', 3) + 3, 80, 'bc2', { sc: 3, shadow: 'n2' }); PIX.text(c, ' balloon?', x + PIX.textWidth('Why THIS', 3) + 3, 80, 'w', { sc: 3, shadow: 'n2' });
};
SH.cover = c => cover(c, true);
SH.cover_clean = c => cover(c, false);
})();
