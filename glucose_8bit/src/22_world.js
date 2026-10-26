'use strict';
// ============================================================================
// WORLD M (human scale): background, the meter (with the hand and the
// cutaway board), the strip, the fingertip, the drop and the pen.
// ============================================================================
function drawWorldM(cam, t, o) {
  o = o || {};
  bgM(cam, t);
  const g = o.g || meterG(t);
  const sx0 = g.x, sy0 = g.y - (STRIP.L - 8);
  const hand = o.hand !== undefined ? o.hand : (t >= 65 && t < 74.8);
  if (hand) drawHandBack(cam, g, t);
  // the strip: its lower 8 mm sit in the port (hidden by the casing unless it is open)
  const sig = o.sig !== undefined ? o.sig : -1;
  drawStrip(cam, sx0, sy0, t, { fill: o.fill !== undefined ? o.fill : fillM(t), sig });
  drawMeter(cam, g, t);
  if (g.cut > 0) drawCutaway(cam, g, t, o);
  if (hand) drawHandFront(cam, g, t);
  if (g.cut > 0.9 && t > SC_T[16] && t < SC_T[19] + 0.6 && o.cards !== false) drawCards(cam, g, t);
  // the fingertip, drop and pen (only when near the frame)
  if (cam.y(FING.tipY) > -40) {
    drawFinger(cam, t);
    const r = o.dropR !== undefined ? o.dropR : dropR(t);
    const touching = t > T_TOUCH && t < 6.5 || (t > T_RET && t < T_SIP1 + 0.1);
    drawDrop(cam, r, 1, t, { jig: t > 0.6 && t < 2.2 ? 1 - seg(t, 1.2, 2.2) : 0, flat: touching ? 0.6 : 0 });
    if (touching && r > 0.1) {        // the blood bridge into the inlet notch
      const c = dropCenter(r, 1), bx = cam.x(sx0), by = cam.y(sy0);
      lineW(cam.x(c[0]), cam.y(c[1]), bx, by + 1, Math.max(2, r * cam.z * 0.9), P.BL2);
    }
    const u = penU(t);
    if (u < 34) drawLancet(cam, PUNCT[0] + PN[0] * (u + 0.05), PUNCT[1] + PN[1] * (u + 0.05), PA, t, { flash: t > T_CLICK && t < T_CLICK + 0.14 ? 1 - (t - T_CLICK) / 0.14 : 0 });
  }
}
function drawCutaway(cam, g, t, o) {
  const k = g.cut;
  // the board is revealed inside the casing outline; the front shell lifts away (dithered)
  const st = o.pcb || pcbState(t);
  withBuffer(TMPBUF, () => { rect(0, 0, W, H, P.MC1); drawPCB(cam, g, t, st); if (st.bits) drawBits(cam, g, 2, t, 7); if (st.bits3) drawBits(cam, g, 3, t, 4); });
  // a scan line wipes down the casing (top first: that is where the signal comes in) and back up when it closes
  const m = meterMask(cam, g, -1.6), sw = Math.round(cam.y(g.y + lerp(-2, MET.h + 2, k)));
  for (let j = 0; j < m.h; j++) {
    const y = m.y0 + j; if (y < 0 || y >= H || y >= sw) continue;
    for (let i = 0; i < m.w; i++) { if (!m.d[j * m.w + i]) continue; const x = m.x0 + i; if (x < 0 || x >= W) continue; buf[y * W + x] = TMPBUF[y * W + x]; }
  }
  if (k > 0 && k < 1) {
    const xa = cam.x(g.x - (MET.hw - 1.6) * g.sx), xb = cam.x(g.x + (MET.hw - 1.6) * g.sx);
    rect(xa, sw - 4, xb, sw - 1, P.LC3, 0.35); rect(xa, sw - 1, xb, sw + 1, P.LC4); rect(xa, sw + 1, xb, sw + 3, P.LC3, 0.5);
  }
  // the strip end inside the connector
  if (k > 0.5) {
    const X = u => cam.x(g.x + u * g.sx), Y = v => cam.y(g.y + v);
    rect(X(-STRIP.hw), Y(1.5), X(STRIP.hw), Y(8), P.ST3);
    for (let q = 0; q < 3; q++) { const col = q === 1 ? P.AU2 : P.AG2; rect(X(PAD_X[q] - 0.55), Y(2.4), X(PAD_X[q] + 0.85), Y(7.2), col); rect(X(PAD_X[q] - 0.2), Y(5.5), X(PAD_X[q] + 0.5), Y(9.4), P.AU3); }
  }
}
