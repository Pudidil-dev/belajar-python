'use strict';
// ============================================================================
// UI layer: Kurzgesagt-style callouts (a thin leader is drawn first, then the
// label types in at ~40 chars/s), micro-context lines, small tags.
// Safe text area (logical px): x 18..252, y 30..420 (TikTok-safe interior
// x 18..240, y 37..362: captions and tags stay inside it).
// ============================================================================
const SAFE = { l: 18, r: 252, t: 30, b: 420 };
const TYPE_CPS = 40;     // label typing speed (chars / s)
const MICRO_CPS = 58;

// balanced wrap: as many lines as a greedy wrap at maxW, but evened out (no one-word orphan lines)
function wrapBal(f, s, maxW, sc) {
  let best = wrap(f, s, maxW, sc); const n = best.length; if (n < 2) return best;
  for (let w = maxW - 2; w > 24; w -= 2) { const L = wrap(f, s, w, sc); if (L.length > n) break; best = L; }
  return best;
}
// A callout: leader from the object anchor to an underline below the label.
// spec: {text, x, y, ax, ay, t0, micro, mw, align('left'|'right'), c}
function calloutLayout(spec) {
  const sc = 2, tw = textW(FL, spec.text, sc);
  let x = spec.align === 'right' ? spec.x - tw : spec.x;
  const lines = spec.micro ? wrapBal(FM, spec.micro, spec.mw || (SAFE.r - Math.max(SAFE.l, Math.min(x, SAFE.r - tw))), 2) : [];
  let bw = tw; for (const ln of lines) bw = Math.max(bw, textW(FM, ln, 2));
  x = Math.round(clamp(x, SAFE.l, SAFE.r - bw));
  const y = Math.round(spec.y);
  const bh = 14 + (lines.length ? 6 + lines.length * 14 - 4 : 0);
  return { x, y, tw, bw, lines, uy: y + bh + 3 };
}
// A callout: the text block (label + optional micro line) sits on an
// underline; the leader rises/drops from the object anchor to that underline.
function callout(spec, t) {
  const age = t - spec.t0; if (age < 0) return;
  const L = calloutLayout(spec), x = L.x, y = L.y, uy = L.uy;
  const ul0 = x - 2, ul1 = x + L.bw + 1;
  const lead = spec.ax !== undefined && spec.ax !== null;
  const gk = K75(clamp(age / 0.2, 0, 1));
  const lc = spec.lc === undefined ? P.SUB : spec.lc;
  if (lead) {
    const ax = Math.round(spec.ax), ay = Math.round(spec.ay);
    const ex = ax < ul0 ? ul0 : ax > ul1 ? ul1 : ax;
    if (ax !== ex) {
      const hx = Math.round(lerp(ax, ex, gk));
      rect(Math.min(ax, hx), ay, Math.max(ax, hx) + 1, ay + 1, lc);
      if (gk >= 1) rect(ex, Math.min(ay, uy), ex + 1, Math.max(ay, uy) + 1, lc);
    } else { const vy = Math.round(lerp(ay, uy, gk)); rect(ax, Math.min(ay, vy), ax + 1, Math.max(ay, vy) + 1, lc); }
    rect(ax - 1, ay - 1, ax + 2, ay + 2, P.INK); frame(ax - 2, ay - 2, ax + 3, ay + 3, P.SH);
    if (gk >= 1) rect(Math.min(ul0, ex), uy, Math.max(ul1, ex + 1), uy + 1, lc);
  } else {
    rect(ul0, uy, Math.round(lerp(ul0, ul1, gk)), uy + 1, lc);
  }
  const n = clamp((age - (lead ? 0.16 : 0.08)) * TYPE_CPS, 0, spec.text.length);
  const mt0 = spec.mt0 !== undefined ? spec.mt0 - spec.t0 : 0.16 + spec.text.length / TYPE_CPS + 0.12;
  if (spec.plate !== false && n > 0) { // dark plate behind the typed text (busy backgrounds)
    let pw = textW(FL, spec.text.slice(0, Math.ceil(n)), 2), ph = y + 17;
    let left = (age - mt0) * MICRO_CPS;
    L.lines.forEach((ln, i) => { if (left <= 0) return; pw = Math.max(pw, textW(FM, ln.slice(0, Math.ceil(left)), 2)); ph = y + 20 + i * 14 + 12; left -= ln.length + 1; });
    rect(x - 3, y - 3, x + pw + 3, Math.min(ph, uy), spec.plateC === undefined ? P.BG : spec.plateC);
  }
  if (n > 0) text(FL, spec.text, x, y, { sc: 2, c: spec.c === undefined ? P.INK : spec.c, n });
  if (L.lines.length) {
    let left = (age - mt0) * MICRO_CPS;
    L.lines.forEach((ln, i) => {
      if (left <= 0) return;
      text(FM, ln, x, y + 20 + i * 14, { sc: 2, c: P.C4, n: left });
      left -= ln.length + 1;
    });
  }
}
// small tag in the micro font next to an object, with a short tick
function tag(s, x, y, t0, t, opt) {
  opt = opt || {};
  const age = t - t0; if (age < 0) return;
  const n = clamp(age * 50, 0, s.length);
  const tw = textW(FM, s, 2);
  let lx = opt.align === 'center' ? x - tw / 2 : opt.align === 'right' ? x - tw : x;
  lx = clamp(lx, SAFE.l, SAFE.r - tw);
  if (n <= 0) return;
  if (opt.plate) { const pw = textW(FM, s.slice(0, Math.ceil(n)), 2); rect(lx - 3, y - 3, lx + pw + 3, y + 13, P.K0); frame(lx - 3, y - 3, lx + pw + 3, y + 13, opt.plate); }
  text(FM, s, lx, y, { sc: 2, c: opt.c === undefined ? P.INK : opt.c, n });
}

// check mark icon
function tick(x, y, c, s) {
  s = s || 1; const pts = [[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]];
  for (const [a, b] of pts) rect(x + a * s - s, y + b * s - s, x + a * s + s, y + b * s + s, P.SH);
  for (const [a, b] of pts) rect(x + a * s, y + b * s, x + a * s + s, y + b * s + s, c);
}
