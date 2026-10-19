// ROOM — the X-ray room in side view (scenes 1 and 14). World units = screen px at z = 1. The tube head hangs from a
// ceiling column, its beam points down at a hand lying on a flat-panel detector on the table; the in-room monitor on
// the left wall shows the radiograph. The tube is TUBE drawn at 0.3 px/mm with its focal spot at TX, TY.
(() => {
const { P } = PIX;
const ROOM = window.ROOM = {};
const TX = 160, TY = 150, TS = 0.3;                  // tube focal spot in room px, tube scale (px per mm)
ROOM.TX = TX; ROOM.TY = TY; ROOM.TS = TS;
ROOM.tube = (x, y) => [TX + x * TS, TY + y * TS];   // tube mm → room px
ROOM.MON = { x: 14, y: 196, w: 70, h: 86 };          // monitor frame; the screen (inset 3 px) is 64×80, the radiograph's 4:5
ROOM.DET = { x: 92, y: 346, w: 142, h: 9 };          // flat-panel detector on the table
const F = (c, p, col, a) => PIX.fill(c, p, col, a);
const rr = (x, y, w, h, r = 0) => PIX.rectPath(x, y, w, h, r);
// side-view hand lying palm down on the detector, fingers pointing left
const HAND_SIDE = (() => {
  const top = [[104, 343], [106, 339.5], [112, 338.5], [124, 338.8], [128, 337.6], [140, 337.8], [150, 336.6], [166, 335.4], [182, 334.6],
    [196, 333], [206, 331.5], [214, 329.5], [226, 328.4], [246, 327.6], [270, 327]];
  const bot = [[270, 346], [104, 346]];
  return U.poly(top.concat(bot), true);
})();
ROOM.draw = (c, o) => {
  const t = o.t || 0, cz = o.z || 1;
  // back wall: dark teal panels, lead-lined dado band, ceiling
  F(c, rr(-200, -200, 670, 880), 'n0');
  for (let x = -180; x < 460; x += 46) F(c, rr(x, 20, 1, 400), 'n1');
  F(c, rr(-200, 300, 670, 3), 'n1');
  F(c, rr(-200, -200, 670, 216), 'd1'); F(c, rr(-200, 14, 670, 3), 'd3');
  // ceiling rails + column carrying the tube head
  F(c, rr(-200, 8, 670, 4), 'd4'); F(c, rr(-200, 8, 670, 1), 'd6');
  F(c, rr(TX - 14, 4, 28, 12, 2), 'd4');
  F(c, rr(TX - 6, 14, 12, 44, 0), 'd5'); F(c, rr(TX - 5, 56, 10, 30, 0), 'd6'); F(c, rr(TX - 4, 84, 8, 26, 0), 'd7');
  F(c, rr(TX - 6, 14, 2, 96, 0), 'd8');
  // warning lamp over the door
  const lamp = o.lamp || 0;
  F(c, rr(16, 96, 46, 16, 2), 'd3'); F(c, rr(18, 98, 42, 12, 1), lamp > 0 ? 'r2' : 'r0');
  if (lamp > 0) { FX.glowW(c, 39, 104, 30, ['r0', 'r1', 'r2'], 0.75 * lamp, 1.6); F(c, rr(18, 98, 42, 12, 1), 'o0', lamp); }
  K.wtext(c, 'X-RAY', 25, 101, lamp > 0 ? 'w' : 'r1', { shadow: null });
  // door frame below the lamp
  F(c, rr(14, 118, 52, 182, 0), 'n1'); F(c, rr(18, 122, 44, 178, 0), 'd1'); F(c, rr(52, 210, 4, 10, 1), 'd5');
  // floor
  F(c, rr(-200, 430, 670, 300), 'd1'); F(c, rr(-200, 430, 670, 2), 'd3');
  // table: radiolucent top, pedestal
  F(c, rr(150, 362, 30, 70, 0), 'd3'); F(c, rr(150, 362, 6, 70, 0), 'd4'); F(c, rr(138, 424, 54, 8, 2), 'd3');
  F(c, rr(30, 355, 300, 9, 2), 'd5'); F(c, rr(30, 355, 300, 2, 1), 'd7'); F(c, rr(30, 362, 300, 2, 0), 'd3');
  // flat-panel detector
  const D = ROOM.DET;
  F(c, rr(D.x, D.y, D.w, D.h, 2), 'd3'); F(c, rr(D.x, D.y, D.w, 2, 1), 'd6'); F(c, rr(D.x + 2, D.y + 3, D.w - 4, 1, 0), 'd2');
  const led = o.led || 0;
  F(c, rr(D.x + D.w - 10, D.y + 4, 4, 2, 0), led > 0 ? 'g2' : 'g1'); if (led > 0) FX.glowW(c, D.x + D.w - 8, D.y + 5, 7, ['g0', 'g1', 'g2'], 0.8 * led);
  // the hand (and sleeve) on the detector
  F(c, HAND_SIDE, 't2');
  c.save(); c.clip(HAND_SIDE); F(c, rr(90, 343, 190, 4), 't1'); F(c, rr(90, 326, 190, 2.6), 't3', 0.9); c.restore();
  F(c, rr(104, 342, 4, 2, 1), 't3');                                 // fingertip / nail
  for (const x of [128, 150, 166]) F(c, rr(x, 337, 1, 1), 't1');     // knuckle creases
  F(c, U.poly([[232, 325], [270, 323], [270, 346], [236, 346], [230, 336]], true), 'd4');
  F(c, rr(232, 325, 38, 2, 1), 'd6'); for (const x of [242, 256]) F(c, rr(x, 327, 1, 18), 'd3');
  // X-ray pulse (only at the moment of exposure; invisible in reality, drawn violet)
  if (o.pulse > 0) {
    const [bx, by] = ROOM.tube(0, 122), a = o.pulse;
    const pts = [[bx - 8, by], [bx + 8, by], [D.x + D.w * 0.72, D.y], [D.x + D.w * 0.12, D.y]];
    c.save(); c.globalAlpha = 0.5 * a; F(c, U.poly(pts, true), 'p1'); c.restore();
    c.save(); c.globalAlpha = 0.9 * a; PIX.line(c, bx, by, D.x + D.w * 0.42, D.y, 'p2', 1); c.restore();
  }
  // the tube head (TUBE drawn at TS px/mm)
  c.save(); c.translate(TX, TY); c.scale(TS, TS);
  TUBE.draw(c, { z: cz * TS, t, cut: o.cut || 0, spin: o.spin ?? 0, fil: o.fil || 0, hv: o.hv || 0, heat: o.heat || 0, coll: true, collCut: o.collCut });
  c.restore();
  // monitor on its arm (left wall), showing the radiograph
  const M = ROOM.MON;
  F(c, rr(M.x + M.w - 2, M.y + 40, 18, 5, 1), 'd4');
  F(c, rr(M.x - 2, M.y - 2, M.w + 4, M.h + 4, 3), 'd2'); F(c, rr(M.x, M.y, M.w, M.h, 2), 'd4'); F(c, rr(M.x + 3, M.y + 3, M.w - 6, M.h - 6, 0), 'k');
};
// draws the radiograph into the monitor screen (screen-space, after the camera transform is known)
ROOM.monitorImage = (c, cam, o) => {
  const M = ROOM.MON;
  const [x0, y0] = K.S(cam, M.x + 3, M.y + 3), [x1, y1] = K.S(cam, M.x + M.w - 3, M.y + M.h - 3);
  const rv = o.reveal ?? 1;
  if (rv <= 0) return;
  HAND.draw(c, x0, y0, x1 - x0, y1 - y0, { mask: (u, v) => v < rv ? 1 : 0, marker: (x1 - x0) > 90, lv: o.lv ?? 1 });
  if (rv < 1) { const yy = y0 + (y1 - y0) * rv; PIX.rect(c, Math.round(x0), Math.round(yy), Math.round(x1 - x0), 1, 'c2'); }
};
})();
