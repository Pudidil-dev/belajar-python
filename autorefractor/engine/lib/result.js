// RES — the one result of the film (asset G): a fictional example reading, the same on the instrument's screen and on
// its printout: SPH −2.00 D · CYL −0.75 D · AXIS 180°. These are the instrument's own output (picture content), so they
// stay in the clean version; index.html?nodata=1 blanks the values too. The word "Example" is an editor label (CAP).
//   RES.panel(c, o)    the result panel: three small ring thumbnails with checks in its header, three fields
//   RES.printer(c, o)  the printer slot and the paper strip feeding out of it with the same three lines
(() => {
const { W, H, P } = PIX;
const RES = window.RES = { NAME: 'RES' };
const clamp = U.clamp, lerp = U.lerp;
RES.VALS = [['SPH', '−2.00', 'D'], ['CYL', '−0.75', 'D'], ['AXIS', '180', '°']];
RES.BOX = { x: 34, y: 172, w: 292, h: 300 };
RES.TILE = k => ({ x: 52 + k * 58, y: 186, n: 48 });               // header slots of the three readings
RES.ROWY = k => 262 + k * 66;
const R = (c, x, y, w, h, col) => PIX.rect(c, Math.round(x), Math.round(y), Math.round(w), Math.round(h), col);
// o = {dy (screen offset), a (0..1 the frame appears, dithered), rows: 0..1 (labels and placeholders appear),
//      lit: [k0, k1, k2] (seconds since each field lit; < 0 = not yet), tiles: draw the header thumbnails (default true),
//      checks: [k…] 0..1, seeds: [..]}
RES.panel = (c, o = {}) => {
  const B = RES.BOX, dy = Math.round(o.dy || 0), a = o.a ?? 1;
  if (a <= 0) return;
  const x = B.x, y = B.y + dy;
  if (a < 1) { K.dith(c, x, y, B.w, B.h, 'g1', a); K.dith(c, x, y, B.w, 2, 'g4', a); return; }
  // the screen: bezel, glass, header strip
  R(c, x - 6, y - 6, B.w + 12, B.h + 12, 'g3'); R(c, x - 6, y - 6, B.w + 12, 2, 'g5'); R(c, x - 6, y + B.h + 4, B.w + 12, 2, 'g1');
  R(c, x, y, B.w, B.h, 'n0'); R(c, x, y, B.w, 70, 'n1'); R(c, x, y + 70, B.w, 1, 'n3');
  // the right eye's marker in the header (a small eye glyph, not a letter)
  const ex = x + B.w - 40, ey = y + 36;
  for (const [rx, col] of [[13, 'n4'], [8, 'e1'], [4, 'k']]) PIX.circ(c, ex, ey, rx, col); R(c, ex - 2, ey - 3, 2, 2, 'e3');
  if (o.tiles !== false) for (let k = 0; k < 3; k++) {
    const T = RES.TILE(k), ck = o.checks ? o.checks[k] : 1;
    R(c, T.x - 2, T.y - 2 + dy, T.n + 4, T.n + 4, ck >= 1 ? 'e1' : 'n3'); R(c, T.x, T.y + dy, T.n, T.n, 'k');
    if (!o.noThumb) SEN.thumb(c, T.x, T.y + dy, T.n, (o.seeds || [0, 1, 2])[k]);
    SEN.check(c, T.x + T.n - 11, T.y + dy + T.n - 9, ck, 'e3');
  }
  const rows = o.rows ?? 1;
  for (let k = 0; k < 3; k++) {
    const [lab, val, unit] = RES.VALS[k], ry = RES.ROWY(k) + dy, lit = o.lit ? o.lit[k] : 9;
    if (rows <= k / 3) continue;
    if (k) R(c, x + 16, ry - 19, B.w - 32, 1, 'n2');
    if (window.NODATA) R(c, x + 22, ry + 18, 44, 6, lit >= 0 ? 'e2' : 'e1'); else PIX.text(c, lab, x + 22, ry + 14, lit >= 0 ? 'e2' : 'e1', { sc: 2, shadow: null });
    if (lit < 0 || window.NODATA) { for (let q = 0; q < 4; q++) R(c, x + 150 + q * 26, ry + 12, 16, 4, 'n3'); continue; }   // placeholders
    // the value: the digits arrive in a quick left-to-right wipe, bright first, then white
    const n = Math.min([...val].length, Math.floor(lit / 0.03) + 1), col = lit < 0.16 ? 'e4' : 'w', vx = x + 244, uw = unit === '°' ? 0 : 0;
    PIX.text(c, val, vx, ry, col, { sc: 4, align: 'right', n, shadow: 'n2' });
    if (unit === '°') PIX.text(c, '°', vx + 4, ry, col, { sc: 4, shadow: 'n2' }); else PIX.text(c, unit, vx + 10, ry + 14, 'e2', { sc: 2, shadow: null });
    const uwid = Math.round((B.w - 44) * MO.cubicOut(clamp(lit / 0.3)));
    R(c, x + 22, ry + 36, uwid, 2, lit < 0.3 ? 'e3' : 'e1');
    if (lit < 0.12) K.dith(c, x + 8, ry - 10, B.w - 16, 52, 'e3', 0.45 * (1 - lit / 0.12));
  }
};
// ---------- the printout ----------
// o = {dy (screen offset of the whole printer), feed: px of paper out of the slot, done: 0..1 (the cut/settle)}
RES.SLOT = { y: 470, x0: 96, x1: 264 };
RES.PAPER = { x: 104, w: 152, len: 268 };
RES.printer = (c, o = {}) => {
  const dy = Math.round(o.dy || 0), SY = RES.SLOT.y + dy, Pp = RES.PAPER, feed = Math.max(0, Math.round(o.feed || 0));
  // the printer's housing: ivory top face with a recess, the slot and its serrated cutter
  R(c, 22, SY - 22, 316, 240, 'q5'); R(c, 22, SY - 22, 316, 2, 'q6'); R(c, 22, SY - 20, 2, 240, 'q6'); R(c, 336, SY - 22, 2, 240, 'q3');
  R(c, 70, SY - 10, 220, 30, 'q4'); R(c, 70, SY - 10, 220, 2, 'q3'); R(c, 70, SY + 18, 220, 2, 'q6');
  R(c, RES.SLOT.x0, SY, RES.SLOT.x1 - RES.SLOT.x0, 9, 'g0');
  R(c, 304, SY - 2, 10, 10, 'g2'); R(c, 306, SY, 6, 6, feed > 0 && feed < Pp.len ? 'e3' : 't2');             // the busy light
  R(c, 40, SY + 44, 280, 2, 'q4'); R(c, 40, SY + 46, 280, 1, 'q6');
  for (let k = 0; k < 9; k++) R(c, 60 + k * 6, SY + 70, 3, 60, 'q4');                                           // vent slots
  R(c, 230, SY + 66, 84, 30, 'g3'); R(c, 230, SY + 66, 84, 2, 'g5'); R(c, 236, SY + 72, 30, 18, 't1'); R(c, 276, SY + 76, 30, 4, 'g5'); R(c, 276, SY + 84, 20, 4, 'g5');
  if (feed > 0) {
    const top = SY - feed + 2;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.rect(0, 0, W, SY + 3); c.clip();
    // the strip: paper with a shadow down its right edge and a serrated end
    R(c, Pp.x + 3, top + 4, Pp.w, feed, 'n0');                                                                 // its shadow on the wall behind
    R(c, Pp.x, top + 3, Pp.w, feed, 'pp2'); R(c, Pp.x + Pp.w - 5, top + 3, 5, feed, 'pp1'); R(c, Pp.x, top + 3, 2, feed, 'w');
    for (let q = 0; q < Pp.w; q += 6) { R(c, Pp.x + q, top + 1, 4, 2, 'pp2'); R(c, Pp.x + q + 1, top, 2, 1, 'pp2'); }
    // the print: three lines, a rule, and the small ring it was computed from (dark on paper)
    for (let k = 0; k < 3; k++) {
      const [lab, val, unit] = RES.VALS[k], ly = top + 30 + k * 40;
      if (window.NODATA) R(c, Pp.x + 14, ly + 5, 34, 3, 'pp0'); else PIX.text(c, lab, Pp.x + 14, ly, 'g2', { sc: 2, shadow: null });
      if (!window.NODATA) PIX.text(c, val + (unit === '°' ? '°' : ' ' + unit), Pp.x + Pp.w - 14, ly, 'g0', { sc: 2, align: 'right', shadow: null });
      else R(c, Pp.x + 84, ly + 5, 50, 3, 'pp0');
    }
    R(c, Pp.x + 14, top + 150, Pp.w - 28, 1, 'pp0');
    // the printed ring: dark dots where the ring is (thermal print)
    const n = 56, tx = Pp.x + (Pp.w - n) / 2, ty = top + 166;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = SEN.I(Math.floor((i + 0.5) / n * 64), Math.floor((j + 0.5) / n * 64), 1, 0); if (v > 0.3 + 0.4 * K.BAY(i, j)) R(c, tx + i, ty + j, 1, 1, 'g2'); }
    for (let k = 0; k < 4; k++) R(c, Pp.x + 14 + k * 34, top + 236, 22, 2, 'pp0');
    c.restore();
    R(c, RES.SLOT.x0, SY + 2, RES.SLOT.x1 - RES.SLOT.x0, 1, 'g4');                                              // the cutter's edge over the paper
    for (let q = RES.SLOT.x0; q < RES.SLOT.x1; q += 4) R(c, q, SY + 1, 2, 1, 'g6');
  }
};
})();
