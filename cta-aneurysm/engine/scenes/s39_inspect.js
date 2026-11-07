// S39 INSPECT THE OUTPOUCHING (152–156 s): the radiologist's hand on the mouse (the only part of a person shown). The
// cursor moves across the vessel rendering to the focal sac and clicks: an amber annotation rings it, and the same spot is
// ringed in the axial source image beside it — a reviewer's annotation, not an automatic detection. Accent: a fast push in.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const TC = 2.0;
const hand = (c, x, y, press) => {
  // seen from behind the reviewer: a right hand resting on a mouse — the mouse body, two long fingers on its buttons, the
  // thumb along its left side, the back of the hand and the wrist going down into a sleeve (flat two-tone, no outline)
  const X = Math.round(x), Y = Math.round(y);
  PIX.flat(c, PIX.rectPath(X - 17, Y - 30, 34, 60, 15), 'g3', 'g1', 'g5');                     // the mouse
  PIX.rect(c, X - 1, Y - 28, 2, 16, 'g1');
  const back = new Path2D(); back.moveTo(X - 19, Y + 52); back.quadraticCurveTo(X - 24, Y + 8, X - 10, Y - 6); back.lineTo(X + 12, Y - 6); back.quadraticCurveTo(X + 26, Y + 10, X + 22, Y + 52); back.closePath();
  PIX.flat(c, back, 's2', 's1', 's3', [2, 3], [-1, -1]);
  // index and middle finger on the buttons (the index presses on the click), ring finger curled at the right edge
  PIX.flat(c, PIX.rectPath(X - 13, Y - 30 + (press ? 3 : 0), 9, 30, 4), 's3', 's1', 's4', [1, 2], [-1, -1]);
  PIX.flat(c, PIX.rectPath(X - 2, Y - 32, 9, 32, 4), 's3', 's1', 's4', [1, 2], [-1, -1]);
  PIX.flat(c, PIX.rectPath(X + 9, Y - 20, 8, 24, 4), 's2', 's1', 's3', [1, 2], [-1, -1]);
  // the thumb along the left side
  const th = new Path2D(); th.moveTo(X - 20, Y + 20); th.quadraticCurveTo(X - 30, Y + 2, X - 24, Y - 12); th.lineTo(X - 18, Y - 12); th.quadraticCurveTo(X - 18, Y + 4, X - 12, Y + 14); th.closePath();
  PIX.flat(c, th, 's2', 's1', 's3', [1, 2], [-1, -1]);
  PIX.rect(c, X - 9, Y - 31 + (press ? 3 : 0), 3, 1, 's4'); PIX.rect(c, X + 2, Y - 33, 3, 1, 's4');
  PIX.flat(c, PIX.rectPath(X - 24, Y + 46, 52, 60, 4), 'h1', 'h0', 'h2');                       // the sleeve
};
SC['s39_inspect'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    // the accent: the view punches in on the sac at the click
    const v0 = window.VRVIEW(148 + 4), pz = MO.cubicOut(clamp((t - TC) / 0.35)), a = VES.anScreen(v0);
    const v = { ...v0, s: lerp(v0.s, 6.2, pz), ox: lerp(v0.ox, VES.AN.cDraw[0], pz), oy: lerp(v0.oy, VES.AN.cDraw[1], pz), oz: lerp(v0.oz, VES.AN.cDraw[2], pz), cy: lerp(v0.cy, 320, pz) };
    window.drawVR(c, t, v, { an: t > TC ? 0.35 : 0, thumb: false });
    const as = VES.anScreen(v);
    // cursor path to the sac, then the hand presses
    const q = MO.cubicInOut(clamp((t - 0.3) / 1.4)), cx = lerp(300, a.x, q), cy = lerp(470, a.y, q);
    const press = t > TC - 0.08 && t < TC + 0.15;
    if (t < TC + 0.4) WS.cursor(c, cx + 2, cy + 2);
    if (t > TC) VES.ring(c, as.x, as.y, as.r + 6, MO.cubicOut(clamp((t - TC) / 0.4)), S.t, 'a1');
    // the axial source panel beside it, the same spot ringed
    if (t > TC + 0.3) {
      const ia = MO.smooth(clamp((t - TC - 0.3) / 0.25)), x = 206, y = 120, w = 136;
      c.save(); c.globalAlpha = ia;
      PIX.rect(c, x - 2, y - 2, w + 4, w + 4, 'k');
      const A = WS.P0, [u, vv] = WS.toImg('ax', A[0], A[1], A[2]), view = WS.image(c, WS.AX, WS.N, x, y, w, w, { z: 2.2, u0: u, v0: vv });
      WS.frame(c, x, y, w, w, 'AX', 1, true);
      const [sx, sy] = view.map(u, vv); VES.ring(c, sx, sy, 3.2 * view.k + 3, 1, S.t, 'a1');
      c.restore();
    }
    hand(c, 262 + (cx - 300) * 0.08, 572 + (cy - 470) * 0.04, press);
    CAP.ctx(c, t, { text: 'QABARIQLIĞA BAXIŞ', t0: 0.3, t1: 3.6 });
  },
  cues: [[0.3, 'type', 0.4], [0.3, 'mouse_move', 0.5, 0.4, 1.4], [TC, 'click', 1.0, -0.2], [TC, 'focus_hit', 1.0, -0.3], [TC + 0.3, 'inset_pop', 0.6, 0.4]],
};
})();
