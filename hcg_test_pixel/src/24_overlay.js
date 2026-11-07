'use strict';
// ============================================================================
// TEXT LAYER (the editor's layer, never part of the art): one dominant caption
// at a time in a game-style dialog box at the top, short annotation tags with
// leader lines beside the object they name, one honesty chip at a time, the
// strip mini-map during magnification. Safe area for short-video apps:
// x 6..150 below y 130 (right-hand buttons), y 22..254 (top bar, description).
// ============================================================================
const SAFE = { l: 6, r: 174, t: 22, b: 254, rb: 150 };
const CAP_Y = 28;
// dialog-box caption: box grows in 3 steps, text types at 40 chars/s, a cursor blinks while it holds; erased backwards
function caption(s, t0, t1, t, opt) {
  if (!UI_ON || t < t0 || t >= t1) return;
  opt = opt || {};
  const lines = wrapBal(FC, s, 156, 1), lh = 10, n = s.length;
  const tw = Math.max(...lines.map(l => textW(FC, l, 1)));
  const bw = tw + 12, bh = lines.length * lh + 7;
  const cx = opt.cx === undefined ? CX : opt.cx, y0 = opt.y === undefined ? CAP_Y : opt.y;
  const x0 = Math.round(clamp(cx - bw / 2, SAFE.l, SAFE.r - bw)), age = t - t0, left = t1 - t;
  const open = opt.instant ? 1 : Math.min(1, Math.floor(age / 0.05 + 1) / 3);          // 3 stepped frames
  const close = left < 0.15 ? Math.max(0, Math.ceil(left / 0.05) / 3) : 1;
  const k = Math.min(open, close); if (k <= 0) return;
  const hh = Math.max(3, Math.round(bh * k)), yy = y0 + Math.round((bh - hh) / 2);
  rect(x0 + 2, yy + 2, x0 + bw + 2, yy + hh + 2, P.SH);                                   // hard shadow
  rect(x0, yy, x0 + bw, yy + hh, P.BOX);
  frame(x0, yy, x0 + bw, yy + hh, P.TE1);
  rect(x0 + 1, yy + 1, x0 + bw - 1, yy + 2, P.N3);
  if (k < 1) return;
  // typed text; erased backwards in the last 0.3 s
  let shown = opt.instant ? n : Math.floor((age - 0.12) * 40);
  if (left < 0.45) shown = Math.min(shown, Math.floor(n * Math.max(0, (left - 0.15) / 0.3)));
  let rem = shown;
  lines.forEach((ln, i) => {
    if (rem <= 0) return;
    const lx = Math.round(x0 + (bw - textW(FC, ln, 1)) / 2);
    text(FC, ln, lx, y0 + 4 + i * lh, { sc: 1, c: P.INK, ol: null, n: Math.min(ln.length, rem), shadow: P.N2 });
    rem -= ln.length + 1;
  });
  if (shown >= n && left > 0.45 && Math.floor(t * 4) % 2 === 0) {                       // blinking ▼ on the frame (global phase: loops cleanly)
    const bx = x0 + bw - 7, by = yy + hh - 1;
    rect(bx, by, bx + 5, by + 1, P.TE0); rect(bx + 1, by + 1, bx + 4, by + 2, P.TE0); pset(bx + 2, by + 2, P.TE0);
  }
}
// leader-line tag: anchor (ax, ay) on the object, label at (lx, ly) (top-left of the text)
function tag(s, ax, ay, lx, ly, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t >= t1 || ax === null || !isFinite(ax) || !isFinite(ay)) return;
  col = col === undefined ? P.INK : col;
  const age = t - t0, left = t1 - t, out = left < 0.2 ? left / 0.2 : 1, gk = K75(clamp(age / 0.2, 0, 1)) * out;
  const tw = textW(FS, s, 1), x0 = Math.round(clamp(lx, SAFE.l + 1, SAFE.r - tw - 1)), y0 = Math.round(clamp(ly, SAFE.t + 30, SAFE.b - 8));
  ax = Math.round(ax); ay = Math.round(ay);
  const ux = ax < x0 ? x0 - 2 : ax > x0 + tw ? x0 + tw + 1 : ax, uy = ay < y0 ? y0 - 2 : y0 + 6;
  const ex = Math.round(lerp(ax, ux, gk)), ey = Math.round(lerp(ay, uy, gk));
  line(ax + 1, ay + 1, ex + 1, ey + 1, P.SH); line(ax, ay, ex, ey, col);
  rect(ax - 1, ay - 1, ax + 1, ay + 1, col);
  if (gk < 1) return;
  const n = clamp((age - 0.2) * 45, 0, s.length) * out;
  if (n <= 0) return;
  const pw = textW(FS, s.slice(0, Math.ceil(n)), 1);
  rect(x0 - 2, y0 - 2, x0 + pw + 2, y0 + 7, P.BOX); rect(x0 - 2, y0 + 7, x0 + pw + 2, y0 + 8, col);
  text(FS, s, x0, y0, { sc: 1, c: P.INK, ol: null, n });
}
// small chip (bottom-left): honesty notes, one at a time
function chip(s, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t >= t1) return;
  const age = t - t0, left = t1 - t;
  const k = Math.min(1, Math.floor(age / 0.05 + 1) / 3) * (left < 0.15 ? Math.ceil(left / 0.05) / 3 : 1);
  const tw = textW(FS, s, 1), y = 244, x = SAFE.l + 1;
  const w = Math.round((tw + 6) * k); if (w < 2) return;
  rect(x, y - 2, x + w, y + 8, P.BOX); frame(x, y - 2, x + w, y + 8, col === undefined ? P.N4 : col);
  if (k >= 1) text(FS, s, x + 3, y, { sc: 1, c: P.SUB, ol: null });
}
// the strip mini-map: horizontal thumbnail (sample left → absorbent right), a blinking "you are here" marker
const MAP = { x: 7, y: 230, w: 70, h: 7 };
function miniMap(t, u, t0, t1, hilite) {
  if (!UI_ON || t < t0 || t >= t1) return;
  const age = t - t0, left = t1 - t, k = Math.min(1, Math.floor(age / 0.05 + 1) / 3) * (left < 0.15 ? Math.ceil(left / 0.05) / 3 : 1);
  if (k < 1) { if (k > 0) rect(MAP.x, MAP.y + 3, MAP.x + MAP.w * k, MAP.y + 4, P.N4); return; }
  const { x, y, w, h } = MAP;
  rect(x - 2, y - 2, x + w + 9, y + h + 2, P.BOX); frame(x - 2, y - 2, x + w + 9, y + h + 2, P.N4);
  // sample 0-26%, conjugate 22-40%, membrane 36-86%, absorbent 82-100%
  const X = f => Math.round(x + f * w);
  rect(X(0), y, X(0.26), y + h, P.AB1);
  rect(X(0.22), y + 1, X(0.40), y + h - 1, P.RU2);
  rect(X(0.38), y + 1, X(0.86), y + h - 1, P.GR0);
  rect(X(0.84), y, X(1), y + h, P.AB2);
  rect(X(0.56), y + 1, X(0.56) + 1, y + h - 1, hilite === 'T' ? P.MI1 : P.RL2);
  rect(X(0.68), y + 1, X(0.68) + 1, y + h - 1, hilite === 'C' ? P.VI1 : P.RL2);
  text(FS, 'T', X(0.56) - 1, y - 8, { sc: 1, c: P.SUB, ol: null }); text(FS, 'C', X(0.68) - 1, y - 8, { sc: 1, c: P.SUB, ol: null });
  // flow arrow at the right end
  const ax = x + w + 2;
  rect(ax, y + 3, ax + 4, y + 4, P.LB1); pset(ax + 4, y + 2, P.LB1); pset(ax + 4, y + 4, P.LB1); pset(ax + 5, y + 3, P.LB1); pset(ax + 3, y + 1, P.LB1); pset(ax + 3, y + 5, P.LB1);
  // marker (u in 0..1 along the strip)
  if (u !== null && Math.floor(t * 4) % 2 === 0) { const mx = X(u); rect(mx - 1, y - 2, mx + 2, y - 1, P.LW); rect(mx, y - 1, mx + 1, y + h + 1, P.LW); }
}
