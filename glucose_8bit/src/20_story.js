'use strict';
// ============================================================================
// STORY STATE of the human-scale props: the pen, the drop, the strip window,
// the meter group (rise, follow, turn, cutaway) and its display.
// ============================================================================
// ---------------------------------------------------------------- the macro props
const DROP_R = 1.55;
const DOCK = { x: dropCenter(DROP_R, 1)[0], y: dropBottom(DROP_R, 0.6) - 0.3 };   // strip tip (top centre) when it touches the drop
const MTOP = DOCK.y + STRIP.L - 8;                                   // meter top: 8 mm of the strip sits in the port
function penU(t) {                                                   // pen offset along its axis (0 = pressed on the pad)
  const tremble = 0.03 * wob(t, 88, 0);                               // the hand holding the pen (periodic: seamless loop)
  let u = tremble * (1 - seg(t, 0.3, 0.46));
  if (t >= T_CLICK) u = 0.35 * pulse(t, T_CLICK, 0.12) + 36 * eio(seg(t, 0.6, 1.45));
  if (t >= T_PEN0) u = 36 * (1 - eout(seg(t, T_PEN0, T_PEN1))) + tremble * seg(t, T_PEN1 - 0.6, T_PEN1);
  if (t > T_PEN1) u = tremble;
  return u;
}
function dropR(t) {
  if (t < 0.62) return 0;
  let r = DROP_R * backOut(seg(t, 0.62, 1.55), 1.3);
  if (t > T_TOUCH) r = lerp(DROP_R, 1.12, eout(seg(t, T_TOUCH, 6.0)));
  if (t > 60) r = 1.12;
  if (t > T_RET) r = 1.12 * (1 - smooth(seg(t, T_RET + 0.05, T_SIP1)));
  return r;
}
function fillM(t) {                                                  // blood in the strip window (fraction)
  if (t < T_TOUCH) return 0;
  if (t < 7.5) return 0.19 * eout(seg(t, T_TOUCH, 5.7));
  if (t < T_FILL1) return frontY(t) / 1600;
  return 1;
}
// meter group: position offset, squash (turn), side face, cutaway
function meterG(t) {
  const g = { x: DOCK.x, y: MTOP, sx: 1, side: 0, cut: 0 };
  let dy = 0;
  if (t < T_TOUCH) dy = 84 * (1 - eout(seg(t, T_STRIP0, T_TOUCH)));
  else if (t < 65) dy = dropBottom(Math.max(dropR(Math.min(t, 6.2)), 1.12), 0.6) - dropBottom(DROP_R, 0.6);   // the hand follows the shrinking drop
  if (t >= 65) dy = 14;
  if (t >= 70.9) { const d1 = dropBottom(1.12, 0.6) - dropBottom(DROP_R, 0.6); dy = lerp(14, d1, eout(seg(t, 71.1, T_RET))); if (t > T_RET) dy = dropBottom(Math.max(dropR(t), 0.3), 0.6) - dropBottom(DROP_R, 0.6); if (t > T_AWAY0) dy = lerp(dy, 90, ein(seg(t, T_AWAY0, T_AWAY1))); }
  g.y += dy; g.dy = dy;
  if (t >= 65 && t < 71.5) { const k = smooth(seg(t, T_TURN0, T_TURN1)); const th = lerp(0.95, 0, k); g.sx = Math.cos(th); g.side = 9 * Math.sin(th); g.y += 0.7 * Math.sin(TAU * (t - 68) / 2.4) * (1 - seg(t, 70.9, 71.4)); }
  g.cut = t < 52 ? K75(seg(t, T_OPEN0, T_OPEN1)) : 1 - K75(seg(t, T_CLOSE0, T_CLOSE1));
  g.disp = dispState(t);
  return g;
}
function dispState(t) {
  if (t < T_TOUCH) return { mode: 'apply', blink: (t % (2 * BEAT)) < BEAT, digits: '   ', k: [0, 0, 0], unit: 0 };
  if (t < T_CLOSE0) { const i = Math.floor((t - T_TOUCH) / E8) % 3; return { mode: 'busy', digits: '---', k: [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0], unit: 0 }; }
  if (t < T_D1) { const on = ((t - T_CLOSE0) % BEAT) < BEAT * 0.6 ? 1 : 0; return { mode: 'busy', digits: '---', k: [on, on, on], unit: t > T_UNIT ? 1 : 0 }; }
  const k = [T_D1, T_D2, T_NUM].map(tt => t < tt ? 0 : 1 + 0.9 * (1 - eout(clamp((t - tt) / 0.16, 0, 1))));
  const digits = (t < T_D1 ? ' ' : '1') + (t < T_D2 ? ' ' : '0') + (t < T_NUM ? ' ' : '4');
  const beatGlow = t > T_NUM && t < T_RECAP ? Math.max(0, 1 - ((t - T_NUM) % BEAT) / 0.3) * (t < T_NUM + 0.6 ? 1 : 0.45) : 0;
  return { mode: 'num', digits, k, unit: t > T_NUM ? 2 : 1, hot: t > T_NUM && t < T_NUM + 0.3, glow: t > T_GLOW && t < 71.5 ? 0.6 + 0.4 * Math.sin(t * 6) : beatGlow };
}
