'use strict';
// ============================================================================
// UI layer: callout labels (leader first, then typed text), micro-context
// lines, the RADIATION VISUALIZED badge, scale tag, legends and meters.
// Safe text area (logical px): x 18..252, y 30..420.
// ============================================================================
const SAFE = { l: 18, r: 252, t: 30, b: 420 };
const TYPE_CPS = 40;     // label typing speed (chars / s)
const MICRO_CPS = 58;

// A callout: leader from the object anchor to an underline below the label.
// spec: {text, x, y, ax, ay, t0, micro, mw, align('left'|'right'), c}
function calloutLayout(spec) {
  const sc = 2, tw = textW(FL, spec.text, sc);
  let x = spec.align === 'right' ? spec.x - tw : spec.x;
  const lines = spec.micro ? wrap(FM, spec.micro, spec.mw || (SAFE.r - Math.max(SAFE.l, Math.min(x, SAFE.r - tw))), 2) : [];
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
// plain micro-context line(s) (no label), typed
function microText(s, x, y, t0, t, opt) {
  opt = opt || {};
  const age = t - t0; if (age < 0) return;
  const lines = wrap(FM, s, opt.mw || (SAFE.r - x), 2);
  let left = age * (opt.cps || MICRO_CPS);
  lines.forEach((ln, i) => {
    if (left <= 0) return;
    const lw = textW(FM, ln, 2);
    const lx = opt.align === 'center' ? x - lw / 2 : opt.align === 'right' ? x - lw : x;
    text(FM, ln, lx, y + i * 14, { sc: 2, c: opt.c === undefined ? P.C4 : opt.c, n: left });
    left -= ln.length + 1;
  });
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

// Badges (bottom-left, stacked): RADIATION VISUALIZED / NOT TO SCALE
const BADGE_Y = 404;
function badgeRad(t0, t, t1) {
  if (t < t0 || (t1 !== undefined && t > t1)) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1));
  const s = 'RADIATION VISUALIZED';
  const tw = textW(FM, s, 2);
  const x = Math.round(lerp(-tw - 30, SAFE.l, k)), y = BADGE_Y;
  rect(x - 2, y - 3, x + tw + 17, y + 13, P.K0); frame(x - 2, y - 3, x + tw + 17, y + 13, P.Y1);
  // tiny photon zigzag icon
  const zx = x + 1, zy = y + 5;
  const zz = [0, 2, 2, -2, 4, 2, 6, -2, 8, 2, 10, 0];
  for (let i = 0; i + 3 < zz.length; i += 2) line(zx + zz[i], zy + zz[i + 1], zx + zz[i + 2], zy + zz[i + 3], P.Y2);
  text(FM, s, x + 14, y, { sc: 2, c: P.Y3, ol: null });
}
function badgeScale(t0, t, t1, above) {
  if (t < t0 || (t1 !== undefined && t > t1)) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1));
  const s = 'NOT TO SCALE';
  const tw = textW(FM, s, 2);
  const y = above ? BADGE_Y - 18 : BADGE_Y;
  const x = Math.round(lerp(-tw - 10, SAFE.l, k));
  rect(x - 2, y - 3, x + tw + 3, y + 13, P.K0); frame(x - 2, y - 3, x + tw + 3, y + 13, P.N5);
  text(FM, s, x + 1, y, { sc: 2, c: P.SUB, ol: null });
}

// Relative dose legend: title, 5-band bar, LOW/HIGH
function doseLegend(x, y, w, t0, t) {
  const age = t - t0; if (age < 0) return;
  w = Math.max(w, textW(FM, 'RELATIVE DOSE', 2));
  const k = K75(clamp(age / 0.3, 0, 1));
  const cols = [P.D0, P.D1, P.D2, P.D3, P.D4];
  rect(x - 4, y - 4, x + w + 4, y + 44, P.K0); frame(x - 4, y - 4, x + w + 4, y + 44, P.N4);
  text(FM, 'RELATIVE DOSE', x, y, { sc: 2, c: P.C4, ol: null, n: age * 50 });
  const bw = Math.round(w * k), by = y + 15;
  for (let i = 0; i < 5; i++) { const a = Math.round(x + i * w / 5), b = Math.round(x + (i + 1) * w / 5); rect(a, by, Math.min(b, x + bw), by + 7, cols[i]); }
  frame(x - 1, by - 1, x + w + 1, by + 8, P.SH);
  if (age > 0.3) { text(FM, 'LOW', x, by + 11, { sc: 2, c: P.SUB, ol: null }); text(FM, 'HIGH', x + w, by + 11, { sc: 2, c: P.SUB, ol: null, align: 'right' }); }
}
// vertical meter with a label above it
function meter(x, y, h, lv, label, col, colD, t0, t) {
  const age = t - t0; if (age < 0) return;
  const k = K75(clamp(age / 0.25, 0, 1));
  const hh = Math.round(h * k);
  rect(x, y + h - hh, x + 12, y + h, P.K0); frame(x - 1, y + h - hh - 1, x + 13, y + h + 1, P.N5);
  const fh = Math.round((h - 4) * clamp(lv, 0, 1) * k);
  rect(x + 2, y + h - 2 - fh, x + 10, y + h - 2, colD);
  rect(x + 2, y + h - 2 - fh, x + 5, y + h - 2, col);
  if (fh > 1) rect(x + 2, y + h - 2 - fh, x + 10, y + h - 1 - fh, P.E3);
  for (let i = 1; i < 5; i++) rect(x + 10, Math.round(y + h - 2 - (h - 4) * i / 5), x + 12, Math.round(y + h - 1 - (h - 4) * i / 5), P.N6);
  if (label) text(FM, label, x + 6, y - 14, { sc: 2, c: P.INK, align: 'center', n: age * 50 });
}
// pixel arrow (cursor) for the planning UI
function cursor(x, y) {
  const rows = ['#', '##', '#.#', '#..#', '#...#', '#....#', '#..###', '#.#', '##', '#'];
  x = Math.round(x); y = Math.round(y);
  for (let r = 0; r < rows.length; r++) for (let i = 0; i < rows[r].length; i++) {
    if (rows[r][i] === '#') pset(x + i, y + r, P.SH);
    else pset(x + i, y + r, P.INK);
  }
  // white fill inside
  for (let r = 2; r < 7; r++) for (let i = 1; i < r && i < 5; i++) if (rows[r][i] === '.') pset(x + i, y + r, P.INK);
}
// check mark icon
function tick(x, y, c, s) {
  s = s || 1; const pts = [[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]];
  for (const [a, b] of pts) rect(x + a * s - s, y + b * s - s, x + a * s + s, y + b * s + s, P.SH);
  for (const [a, b] of pts) rect(x + a * s, y + b * s, x + a * s + s, y + b * s + s, c);
}
