'use strict';
// ============================================================================
// Patient anatomy: one axial chest section used everywhere (hook, planning
// CT, room views, VMAT dose). Local units ~ logical px at zoom 1; the
// isocentre (tumour centre, patient's right lung) is the local origin.
// Radiological convention: image left = patient's right.
// ============================================================================
const BODY = { BX: 34, BY: 4, A: 100, B: 62, p: 2.5, back: 54 };
const TIS = { OUT: 0, SKIN: 1, FAT: 2, MUS: 3, LUNG: 4, HEART: 5, BONE: 6, AORTA: 7, CORD: 8, TUMOR: 9, MED: 10, VES: 11 };
const TUMOR_R0 = 14, TUMOR_R1 = 6.5;   // before / weeks later (illustrative)
const sp = (v, p) => Math.pow(Math.abs(v), p);
function inBody(lx, ly, sh) {
  if (ly > BODY.BY + BODY.back - sh * 0.8) return false;
  return sp((lx - BODY.BX) / (BODY.A - sh), BODY.p) + sp((ly - BODY.BY) / (BODY.B - sh), BODY.p) <= 1;
}
const RIBS = [];
(function () {
  const ang = [160, 178, 196, 214, 232, 250, 290, 308, 326, 344, 2, 20, 140, 40];
  for (const a of ang) {
    const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const ex = 2 / BODY.p;
    RIBS.push([BODY.BX + (BODY.A - 10.5) * Math.sign(c) * Math.pow(Math.abs(c), ex), BODY.BY + (BODY.B - 10.5) * Math.sign(s) * Math.pow(Math.abs(s), ex), r]);
  }
})();
function tumorRad(th, R) { return R * (1 + 0.10 * Math.sin(3 * th + 0.5) + 0.06 * Math.sin(5 * th + 2.0)); }
function inTumor(lx, ly, R) { if (R <= 0) return false; const r2 = lx * lx + ly * ly; if (r2 > R * R * 1.44) return false; return Math.sqrt(r2) <= tumorRad(Math.atan2(ly, lx), R); }
function tissueAt(lx, ly) {
  if (!inBody(lx, ly, 0)) return TIS.OUT;
  if (!inBody(lx, ly, 2.2)) return TIS.SKIN;
  if (!inBody(lx, ly, 6)) return TIS.FAT;
  for (const [rx, ry, r] of RIBS) {
    const dx = lx - rx, dy = ly - ry, c = Math.cos(r), s = Math.sin(r);
    const u = (dx * c + dy * s) / 2.6, v = (-dx * s + dy * c) / 4.2;
    if (u * u + v * v <= 1) return TIS.BONE;
  }
  if (!inBody(lx, ly, 12)) return TIS.MUS;
  const BX = BODY.BX, BY = BODY.BY;
  // sternum
  if (Math.abs(lx - BX) < 5 && ly > BY - 52 && ly < BY - 46) return TIS.BONE;
  // spine: vertebral body, canal (cord), posterior elements
  if (Math.hypot(lx - BX, ly - BY - 37) < 10) return TIS.BONE;
  if (Math.hypot(lx - BX, ly - BY - 49) < 3.2) return TIS.CORD;
  if (Math.hypot(lx - BX, ly - BY - 49) < 5.2) return TIS.BONE;
  if (Math.abs(lx - BX) < 2.2 && ly > BY + 52) return TIS.BONE;
  for (const sx of [-1, 1]) { const dx = (lx - BX - sx * 12) / 6, dy = (ly - BY - 45) / 2.6; if (dx * dx + dy * dy <= 1) return TIS.BONE; }
  // descending aorta (patient's left of the spine = image right)
  if (Math.hypot(lx - BX - 13, ly - BY - 27) < 6) return TIS.AORTA;
  // heart (anterior, mostly patient's left)
  {
    const dx = lx - BX - 16, dy = ly - BY + 6, c = Math.cos(-0.45), s = Math.sin(-0.45);
    const u = (dx * c + dy * s) / 27, v = (-dx * s + dy * c) / 22;
    if (u * u + v * v <= 1) return TIS.HEART;
  }
  // lungs
  const rl = sp((lx - BX + 46) / 40, 2.2) + sp((ly - BY + 1) / 45, 2.2) <= 1;
  const ll = sp((lx - BX - 50) / 35, 2.2) + sp((ly - BY + 1) / 43, 2.2) <= 1;
  if ((rl || ll) && inBody(lx, ly, 13.5)) {
    const gx = Math.floor(lx / 5), gy = Math.floor(ly / 5);
    const h = hash2(gx * 7 + 3, gy * 13 + 1);
    if (h < 0.16) { const cx = gx * 5 + 1 + hash2(gx, gy) * 3, cy = gy * 5 + 1 + hash2(gy, gx) * 3; if (Math.hypot(lx - cx, ly - cy) < 0.9) return TIS.VES; }
    return TIS.LUNG;
  }
  return TIS.MED;
}
// cached code map at 0.5-unit resolution (the tumour is drawn analytically)
const CMAP = { x0: -70, y0: -66, res: 0.5, w: 420, h: 264, d: null };
function cmapInit() {
  CMAP.d = new Uint8Array(CMAP.w * CMAP.h);
  for (let j = 0; j < CMAP.h; j++) for (let i = 0; i < CMAP.w; i++) CMAP.d[j * CMAP.w + i] = tissueAt(CMAP.x0 + (i + 0.5) * CMAP.res, CMAP.y0 + (j + 0.5) * CMAP.res);
}
function codeAt(lx, ly) {
  const i = Math.floor((lx - CMAP.x0) / CMAP.res), j = Math.floor((ly - CMAP.y0) / CMAP.res);
  if (i < 0 || j < 0 || i >= CMAP.w || j >= CMAP.h) return TIS.OUT;
  return CMAP.d[j * CMAP.w + i];
}
const ILL = [0, P.SK2, P.SK1, P.MU2, P.LU1, P.HE1, P.BO1, P.HE2, P.CO1, P.R3, P.MU1, P.LU3];
const CTP = [P.CT0, P.CT4, P.CT3, P.CT4, P.CT1, P.CT4, P.CT6, P.CT5, P.CT4, P.CT5, P.CT4, P.CT2];

// ---------------------------------------------------------------- dose (VMAT)
const DG = { x0: -70, y0: -66, w: 211, h: 133 };
const NANG = 180;
let DOSE_CUM = null;
function beamAperture(th) {
  const nx = Math.cos(th), ny = Math.sin(th);
  let lo = 1e9, hi = -1e9;
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * TAU, r = tumorRad(a, TUMOR_R0);
    const l = r * Math.cos(a) * nx + r * Math.sin(a) * ny; lo = Math.min(lo, l); hi = Math.max(hi, l);
  }
  return [lo - 2.5, hi + 2.5];
}
function beamDir(th) { return [-Math.sin(th), Math.cos(th)]; }   // head at (R sin th, -R cos th)
function doseInit() {
  const n = DG.w * DG.h;
  const inside = new Uint8Array(n);
  for (let j = 0; j < DG.h; j++) for (let i = 0; i < DG.w; i++) inside[j * DG.w + i] = inBody(DG.x0 + i, DG.y0 + j, 0) ? 1 : 0;
  DOSE_CUM = new Float32Array((NANG + 1) * n);
  for (let k = 0; k < NANG; k++) {
    const th = -Math.PI + (k + 0.5) / NANG * TAU;
    const [dx, dy] = beamDir(th), nx = Math.cos(th), ny = Math.sin(th);
    const [lo, hi] = beamAperture(th);
    let sIn = 0; while (sIn < 200 && inBody(-dx * sIn, -dy * sIn, 0)) sIn += 0.5;
    const base = k * n, nb = (k + 1) * n;
    for (let j = 0; j < DG.h; j++) for (let i = 0; i < DG.w; i++) {
      const id = j * DG.w + i; let d = 0;
      if (inside[id]) {
        const lx = DG.x0 + i, ly = DG.y0 + j;
        const a = lx * dx + ly * dy, l = lx * nx + ly * ny;
        const depth = Math.max(0, a + sIn);
        const f = clamp(0.5 + (l - lo) / 3.5, 0, 1) * clamp(0.5 + (hi - l) / 3.5, 0, 1);
        const out = Math.max(0, lo - l, l - hi);
        const sc = 0.08 * Math.exp(-out / 11);
        const build = 1 - 0.55 * Math.exp(-depth / 2.2);
        d = (f + (1 - f) * sc) * Math.exp(-0.0065 * depth) * build;
      }
      DOSE_CUM[nb + id] = DOSE_CUM[base + id] + d;
    }
  }
  const iso = (0 - DG.y0) * DG.w + (0 - DG.x0);
  const norm = 1 / DOSE_CUM[NANG * n + iso];
  for (let i = 0; i < DOSE_CUM.length; i++) DOSE_CUM[i] *= norm;
}
// dose (relative to final iso dose) at progress p in [0,1] of the arc
function doseSample(lx, ly, p) {
  const n = DG.w * DG.h;
  const fx = lx - DG.x0, fy = ly - DG.y0;
  const i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= DG.w - 1 || j >= DG.h - 1) return 0;
  const u = fx - i, v = fy - j;
  const kf = clamp(p, 0, 1) * NANG, k0 = Math.floor(kf), k1 = Math.min(NANG, k0 + 1), w1 = kf - k0;
  const at = (k, id) => DOSE_CUM[k * n + id];
  const id = j * DG.w + i;
  const g = k => lerp(lerp(at(k, id), at(k, id + 1), u), lerp(at(k, id + DG.w), at(k, id + DG.w + 1), u), v);
  return lerp(g(k0), g(k1), w1);
}
const DBAND = [0.12, 0.30, 0.50, 0.75, 0.92];
const DCOL = [0, P.D0, P.D1, P.D2, P.D3, P.D4];
const DLV = [0, 0.3, 0.5, 0.56, 0.62, 0.7];
function bandOf(d) { let b = 0; for (let i = 0; i < 5; i++) if (d >= DBAND[i]) b = i + 1; return b; }

// ---------------------------------------------------------------- render
// view {ox, oy, s}: screen = o + local*s.
// opt: style 'illus'|'ct', tumorR, ghostR, dose(p in 0..1 or null), doseReveal,
//      lowPulse, clip [x0,y0,x1,y1], dim
const _codes = new Uint8Array(W * H), _bands = new Uint8Array(W * H);
function renderBody(view, opt) {
  opt = opt || {};
  const ct = opt.style === 'ct', pal = ct ? CTP : ILL, s = view.s;
  const tr = opt.tumorR === undefined ? TUMOR_R0 : opt.tumorR;
  let x0 = Math.floor(view.ox + (BODY.BX - BODY.A - 3) * s), x1 = Math.ceil(view.ox + (BODY.BX + BODY.A + 3) * s);
  let y0 = Math.floor(view.oy + (BODY.BY - BODY.B - 3) * s), y1 = Math.ceil(view.oy + (BODY.BY + BODY.back + 3) * s);
  if (ct) { x0 = Math.floor(view.ox - 74 * s); x1 = Math.ceil(view.ox + 142 * s); y0 = Math.floor(view.oy - 70 * s); y1 = Math.ceil(view.oy + 70 * s); }
  const c = opt.clip || [0, 0, W, H];
  x0 = Math.max(x0, c[0], 0); y0 = Math.max(y0, c[1], 0); x1 = Math.min(x1, c[2], W); y1 = Math.min(y1, c[3], H);
  if (x0 >= x1 || y0 >= y1) return;
  const useDose = opt.dose !== undefined && opt.dose !== null;
  const reveal = opt.doseReveal === undefined ? 0 : opt.doseReveal; // 0: all bands; >0 hides low bands
  for (let y = y0; y < y1; y++) {
    const ly = (y + 0.5 - view.oy) / s;
    for (let x = x0; x < x1; x++) {
      const lx = (x + 0.5 - view.ox) / s;
      let code = codeAt(lx, ly);
      if (code !== TIS.OUT && inTumor(lx, ly, tr)) code = TIS.TUMOR;
      _codes[y * W + x] = code;
      if (useDose && code !== TIS.OUT) {
        let b = bandOf(doseSample(lx, ly, opt.dose));
        if (b > 0 && b < reveal) b = 0;
        _bands[y * W + x] = b;
      } else _bands[y * W + x] = 0;
    }
  }
  const cd = (x, y) => (x < x0 || y < y0 || x >= x1 || y >= y1) ? 255 : _codes[y * W + x];
  const pulse = opt.lowPulse || 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const code = _codes[y * W + x];
    let col;
    if (code === TIS.OUT) {
      if (ct) col = P.CT0;
      else {
        const a1 = cd(x - 1, y), a2 = cd(x + 1, y), a3 = cd(x, y - 1), a4 = cd(x, y + 1);
        if ((a1 !== TIS.OUT && a1 !== 255) || (a2 !== TIS.OUT && a2 !== 255) || (a3 !== TIS.OUT && a3 !== 255) || (a4 !== TIS.OUT && a4 !== 255)) col = P.SK0; else continue;
      }
    } else {
      col = pal[code];
      const tl = cd(x - 1, y - 1), br = cd(x + 1, y + 1);
      if (!ct) {
        if (code === TIS.SKIN && tl === TIS.OUT) col = P.SK3;
        else if (code === TIS.LUNG && tl !== TIS.LUNG && tl !== TIS.VES) col = P.LU2;
        else if (code === TIS.HEART) { if (tl !== TIS.HEART) col = P.HE2; else if (br !== TIS.HEART) col = P.HE0; }
        else if (code === TIS.BONE) { if (tl !== TIS.BONE) col = P.BO2; else if (br !== TIS.BONE) col = P.BO0; }
        else if (code === TIS.MUS && tl === TIS.FAT) col = P.MU1;
      } else if (code === TIS.BONE && br !== TIS.BONE) col = P.CT5;
      if (code === TIS.TUMOR) {
        if (!ct) {
          if (cd(x - 1, y) !== TIS.TUMOR || cd(x + 1, y) !== TIS.TUMOR || cd(x, y - 1) !== TIS.TUMOR || cd(x, y + 1) !== TIS.TUMOR) col = P.R1;
          else if (tl !== TIS.TUMOR || cd(x - 2, y - 2) !== TIS.TUMOR) col = P.R4;
          else if (br !== TIS.TUMOR || cd(x + 2, y + 2) !== TIS.TUMOR) col = P.R2;
          else if (((x * 7 + y * 13) % 11) === 0) col = P.R2;
        }
      }
      const b = _bands[y * W + x];
      if (b > 0) {
        const nb = Math.min(b, _bands[Math.max(y0, y - 1) * W + x], _bands[Math.min(y1 - 1, y + 1) * W + x], _bands[y * W + Math.max(x0, x - 1)], _bands[y * W + Math.min(x1 - 1, x + 1)]);
        let lv = DLV[b];
        if (b <= 3 && pulse > 0) lv = Math.min(0.95, lv + 0.35 * pulse);
        if (nb < b && b > 1) col = DCOL[b];          // isodose line (not for the faint bath)
        else if (bay(x, y) < lv) col = DCOL[b];
      }
    }
    if (opt.dim && bay(x, y) < opt.dim) col = P.K0;
    buf[y * W + x] = col;
  }
  if (opt.ghostR) dashedContour(view, opt.ghostR, P.R2, opt.ghostPhase || 0);
}
function contourPts(view, R, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = i / n * TAU, r = tumorRad(a, R); out.push(view.ox + Math.cos(a) * r * view.s, view.oy + Math.sin(a) * r * view.s); }
  return out;
}
function dashedContour(view, R, col, phase) {
  const n = 48, pts = contourPts(view, R, n);
  for (let i = 0; i < n; i++) if (((i + Math.floor(phase)) & 3) < 2) line(pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3], col);
}
// contour traced progressively (planning); k in 0..1
function tracedContour(view, R, col, k, n) {
  n = n || 64; const pts = contourPts(view, R, n); const m = Math.floor(n * clamp(k, 0, 1));
  for (let i = 0; i < m; i++) line(pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3], col);
  const f = n * k - m;
  if (m < n && f > 0) line(pts[2 * m], pts[2 * m + 1], lerp(pts[2 * m], pts[2 * m + 2], f), lerp(pts[2 * m + 1], pts[2 * m + 3], f), col);
  const i = Math.min(n, m); return [lerp(pts[2 * i], pts[2 * Math.min(n, i + 1)], f), lerp(pts[2 * i + 1], pts[2 * Math.min(n, i + 1) + 1], f)];
}
// couch tabletop under the body (local coords)
function drawCouchTop(view, withPed, floorY) {
  const s = view.s, X = l => view.ox + l * s, Y = l => view.oy + l * s;
  const top = BODY.BY + BODY.back - 0.5;
  if (withPed) {
    const py1 = floorY === undefined ? Y(top + 120) : floorY;
    rect(X(BODY.BX - 20), Y(top + 8), X(BODY.BX + 20), py1, P.C1);
    rect(X(BODY.BX - 20), Y(top + 8), X(BODY.BX - 16), py1, P.C2);
    rect(X(BODY.BX + 16), Y(top + 8), X(BODY.BX + 20), py1, P.C0);
    for (let k = 1; k < 4; k++) { const yy = lerp(Y(top + 8), py1, k / 4); rect(X(BODY.BX - 20), yy, X(BODY.BX + 20), yy + 1, P.C0); }
  }
  rect(X(BODY.BX - 98), Y(top), X(BODY.BX + 98), Y(top + 8), P.C2);
  rect(X(BODY.BX - 98), Y(top), X(BODY.BX + 98), Y(top) + Math.max(1, s), P.C4);
  rect(X(BODY.BX - 98), Y(top + 8) - Math.max(1, s), X(BODY.BX + 98), Y(top + 8), P.C0);
  rect(X(BODY.BX - 98), Y(top), X(BODY.BX - 98) + 1, Y(top + 8), P.C0);
  rect(X(BODY.BX + 98) - 1, Y(top), X(BODY.BX + 98), Y(top + 8), P.C0);
}
// skin points where lateral / anterior lasers meet the body (local)
const MARKS = {};
function marksInit() {
  let x = -80; while (x < 40 && !inBody(x, 0, 0)) x += 0.25; MARKS.L = [x, 0];
  x = 160; while (x > 40 && !inBody(x, 0, 0)) x -= 0.25; MARKS.R = [x, 0];
  let y = -80; while (y < 0 && !inBody(0, y, 0)) y += 0.25; MARKS.A = [0, y];
}
// tumour drawn on its own (for glows / highlights over the body)
function drawTumor(view, R, lv) {
  const m = maskFn(view.ox - R * 1.3 * view.s, view.oy - R * 1.3 * view.s, view.ox + R * 1.3 * view.s, view.oy + R * 1.3 * view.s,
    (x, y) => inTumor((x - view.ox) / view.s, (y - view.oy) / view.s, R));
  shade(m, P.R3, P.R4, P.R2, P.R1, { k: Math.max(1, Math.round(view.s * 0.8)) });
}
// small pixel calendar icon; flip 0..1 animates a page turning
function calendarIcon(x, y, flip) {
  x = Math.round(x); y = Math.round(y);
  rect(x - 1, y - 1, x + 19, y + 19, P.SH);
  rect(x, y + 3, x + 18, y + 18, P.C5); rect(x, y, x + 18, y + 5, P.R3);
  rect(x + 3, y - 2, x + 5, y + 3, P.C2); rect(x + 13, y - 2, x + 15, y + 3, P.C2);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) rect(x + 2 + i * 4, y + 7 + j * 3.5, x + 4 + i * 4, y + 9 + j * 3.5, P.C2);
  if (flip > 0 && flip < 1) { const h = Math.round(15 * (1 - Math.abs(flip * 2 - 1))); rect(x, y + 3, x + 18, y + 3 + h, P.C4); rect(x, y + 3 + h, x + 18, y + 4 + h, P.C2); }
}
