'use strict';
// ============================================================================
// THE TEXT LAYER (labeled version only; the clean version skips all of it).
// Every string comes from LABELS (04_labels_en.js), so a translation never
// touches the animation. Style: white pixel letters on a dark dithered band at
// the top with a thin cyan edge; the two key terms (STENOSIS / OCCLUSION) are
// bigger with an orange edge; the final title stays to the last frame. Bands
// open and close in stepped wipes — no fades, no blur.
// ============================================================================
const TXT = { y: 75, sc: 2, lh: 20, padX: 11, padY: 6, maxW: 293 };
const L_ = k => (LABELS[k] === undefined ? '' : String(LABELS[k]));
// band behind a block of text; k = stepped open factor; accent colour on the left edge
function band(x0, y0, bw, bh, k, accent) {
  const ww = Math.round(bw * k); if (ww < 2) return;
  rect(x0 + 2, y0 + 2, x0 + ww + 2, y0 + bh + 2, P.SH, 0.7);
  rect(x0, y0, x0 + ww, y0 + bh, P.BOX, 0.9);
  rect(x0, y0, x0 + 2, y0 + bh, accent);
  rect(x0 + 2, y0 + bh - 1, x0 + ww, y0 + bh, P.N3);
}
// the font for a string: the bold title capitals when they cover every letter, else the caption font
const titleFont = s => [...s.toUpperCase()].every(ch => ch === ' ' || FT.g[ch]) ? FT : FC;
// caption at the top (one at a time)
function caption(s, t0, t1, t, o) {
  if (!UI_ON || !s || t < t0 || t >= t1) return;
  o = o || {};
  const key = !!o.key, f = key ? titleFont(s) : FC, sc = key ? 3 : TXT.sc, str = key && f === FT ? s.toUpperCase() : s;
  const lines = wrapBal(f, str, TXT.maxW, sc), lh = key ? f.h * sc + 4 : TXT.lh;
  const tw = Math.max(...lines.map(l => textW(f, l, sc, key))), bw = tw + 2 * TXT.padX + 2, bh = lines.length * lh + 2 * TXT.padY - (key ? 4 : 2);
  const x0 = Math.round(clamp(CX - bw / 2, SAFE.l, SAFE.r - bw)), y0 = o.y === undefined ? TXT.y : o.y;
  const k = stepK(t, t0, t1, 4, 0.2);
  band(x0, y0, bw, bh, k, key ? P.WARN : P.ACC);
  if (k < 1) return;
  const n = Math.ceil(clamp((t - t0 - 0.2) / 0.25, 0, 1) * 6) / 6;     // the letters wipe in, left to right, in 6 steps
  lines.forEach((ln, i) => {
    const lx = Math.round(x0 + 2 + (bw - 2 - textW(f, ln, sc, key)) / 2), ly = y0 + TXT.padY + i * lh;
    text(f, ln, lx, ly, { sc, c: P.INK, ol: null, shadow: P.SH, sd: 1, bold: key, n: Math.ceil(ln.length * n) });
  });
  if (key && n >= 1) { const u = Math.round((tw / 2) * eout(seg(t, t0 + 0.45, t0 + 0.75))); rect(CX - u, y0 + bh + 3, CX + u, y0 + bh + 5, P.WARN); }
}
// small label centred on x (bars, the two trees, R / L)
function label(s, x, y, t0, t1, t, o) {
  if (!UI_ON || !s || t < t0 || t >= t1) return;
  o = o || {};
  let sc = o.sc || 2; if (o.maxW) while (sc > 1 && textW(FC, s, sc) > o.maxW) sc--;          // long translations step down a size
  const tw = textW(FC, s, sc), x0 = Math.round(o.left ? x : x - tw / 2), k = stepK(t, t0, t1, 3, 0.15);
  if (k <= 0) return;
  const bw = Math.round((tw + 8) * k);
  rect(x0 - 4, y - 3, x0 - 4 + bw, y + FC.h * sc + 2, P.BOX, 0.9);
  if (o.accent) rect(x0 - 4, y + FC.h * sc, x0 - 4 + bw, y + FC.h * sc + 2, o.accent);
  if (k >= 1) text(FC, s, x0, y - 1, { sc, c: o.c || P.INK, ol: null, shadow: P.SH, sd: 1 });
}
function overlays(t) {
  if (!UI_ON) return;
  caption(L_('s01'), EV.cap1, 2.85, t);
  caption(L_('s04'), EV.cap4, 11.85, t);
  caption(L_('s05'), EV.cap5, 14.85, t);
  caption(L_('s06'), EV.cap6, 17.85, t);
  caption(L_('s07'), EV.cap7, 20.85, t);
  caption(L_('s08'), EV.cap8, 23.85, t);
  caption(L_('s09'), EV.cap9, 26.85, t, { key: true });
  caption(L_('s10'), EV.cap10, 29.85, t, { key: true });
  caption(L_('s11'), EV.cap11, 32.85, t);
  caption(L_('s12'), EV.cap12, 35.85, t);
  caption(L_('s13'), EV.cap13, 38.85, t);
  caption(L_('s14'), EV.cap14, 41.85, t);
  caption(L_('s17'), EV.cap17, 50.85, t);
  caption(L_('s18'), EV.cap18, 53.85, t, { key: true });
  caption(L_('s19'), EV.cap19, 56.85, t, { key: true });
  // the bars (12-13)
  label(L_('s12demand'), BARS.lx, BARS.y - 4, EV.cut12 + 0.6, EV.rest13 + 2.85, t, { left: true, c: P.WARN, maxW: BARS.x - BARS.lx - 10 });
  label(L_('s12supply'), BARS.lx, BARS.y + BARS.gap - 4, EV.cut12 + 0.6, EV.rest13 + 2.85, t, { left: true, c: P.ACC, maxW: BARS.x - BARS.lx - 10 });
  // orientation of the CTA display: the patient's right is on the viewer's left
  label(L_('s17right'), VIEW.x0 + 20, VIEW.y0 + 9, EV.cap17, EV.comp20, t);
  label(L_('s17left'), VIEW.x1 - 20, VIEW.y0 + 9, EV.cap17, EV.comp20, t);
  // the comparison and the final title
  label(L_('s20normal'), CX - 90, 135, EV.cap20, DUR + 1, t, { sc: 2, maxW: 166, accent: P.ACC });
  label(L_('s20pad'), CX + 90, 135, EV.cap20 + 0.375, DUR + 1, t, { sc: 2, maxW: 166, accent: P.WARN });
  caption(L_('s21'), EV.cap21, DUR + 1, t, { y: 75 });
}
