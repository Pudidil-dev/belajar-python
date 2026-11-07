'use strict';
// ============================================================================
// THE MEMBRANE FROM ABOVE (top-view units: u along the flow, w across the strip).
// Mapped onto the device: 80 units = 1 device pixel; the T band (u 525..685)
// is the device's T line (2 device px), the C band sits where the device's C
// line is; the strip is w = -480..480 (12 device px). Drawn in device
// orientation (flow up) into the square buffer, then turned with rotBlit.
// Each captured label is a separate ruby dot: many dots, not one object,
// make the line.
// ============================================================================
const TOPK = 80, TOP_UT = 605, TOP_UC = TOP_UT + (DEV.yT - DEV.yC) * TOPK;
const TBAND = [TOP_UT - 80, TOP_UT + 80], CBAND = [TOP_UC - 80, TOP_UC + 80];
const devToU = y => TOP_UT - (y - DEV.yT) * TOPK, uToDev = u => DEV.yT - (u - TOP_UT) / TOPK;
// captured labels in the test band: positions + the time each one lands
const TOPDOTS = (() => {
  const r = mulberry(123), out = [];
  for (let i = 0; i < 1500; i++) {
    const u = lerp(TBAND[0] + 4, TBAND[1] - 4, r()), w = lerp(-474, 474, r());
    const near = Math.abs(w - 40) < 260;                                  // the part the camera sees lands on the capture beats
    let ta = near ? EV.captures[Math.floor(r() * EV.captures.length)] : lerp(37.6, 47.5, r());
    if (near && r() < 0.35) ta = lerp(39.8, 40.4, r());
    out.push([u, w, ta, r()]);
  }
  return out;
})();
// control-band labels (for the zoom-out: the C line is forming at the same time)
const TOPDOTS_C = (() => { const r = mulberry(321), out = []; for (let i = 0; i < 1100; i++) out.push([lerp(CBAND[0] + 4, CBAND[1] - 4, r()), lerp(-474, 474, r()), lerp(38, 56, r()), r()]); return out; })();
// a top-view camera: centre (cu, cw), zoom z (px per unit), drawn in device orientation
function topCam(cu, cw, z) { return { cu, cw, z, sx: w => (w - cw) * z + CX, sy: u => -(u - cu) * z + CY, iw: x => (x - CX) / z + cw, iu: y => -(y - CY) / z + cu }; }
function drawTop(tc, t, o) {
  o = o || {};
  const z = tc.z;
  // membrane (wet), strip edges and the tray beyond them
  const ps = z > 0.4 ? 0.09 : z > 0.18 ? 0.045 : 0.02, tex = clamp((z - 0.05) / 0.12, 0, 1);
  for (let y = 0; y < H; y++) {
    const u = tc.iu(y + 0.5);
    for (let x = 0; x < W; x++) {
      const w = tc.iw(x + 0.5);
      let c;
      if (Math.abs(w) > 480) c = Math.abs(w) < 480 + 1.2 / z ? P.IV4 : P.IV3;
      else {
        const n = vn2(u * ps, w * ps, 61);
        c = P.GW0;
        if (tex > 0 && bay(x, y) < tex) c = n > 0.72 ? P.GW3 : n > 0.62 ? P.GW2 : P.GW1;
      }
      buf[y * W + x] = c;
    }
  }
  // the anchored capture antibodies seen from above: mint specks in the T band, violet in the C band
  if (z > 0.22) for (const [b0, b1, col, sd] of [[TBAND[0], TBAND[1], P.MI2, 7], [CBAND[0], CBAND[1], P.VI2, 8]]) {
    const cs = 11, wa = tc.iw(0), wb = tc.iw(W), ua = tc.iu(H), ub = tc.iu(0);
    for (let cu = Math.floor(Math.max(b0, ua) / cs); cu <= Math.floor(Math.min(b1, ub) / cs); cu++)
      for (let cw = Math.floor(Math.max(-480, wa) / cs); cw <= Math.floor(Math.min(480, wb) / cs); cw++) {
        if (hash3(cu, cw, sd) > 0.55) continue;
        const u = cu * cs + hash3(cu, cw, sd + 1) * cs, w = cw * cs + hash3(cu, cw, sd + 2) * cs; if (u < b0 || u > b1) continue;
        const x = tc.sx(w), y = tc.sy(u); pset(x, y, col); if (z > 0.6) pset(x + 1, y, col);
      }
  }
  // labels: each dot lands on its time; far away a dot is one pixel
  const r = RG * z, drawDot = (u, w, hiK) => {
    const x = tc.sx(w), y = tc.sy(u);
    if (x < -6 || x > W + 6 || y < -6 || y > H + 6) return;
    if (r < 1.2) { pset(x, y, P.RU1); return; }
    if (r < 2.6) { rect(x - 1, y - 1, x + 1, y + 1, P.RU1); pset(x - 1, y - 1, P.RU0); pset(x + 1, y + 1, P.RU2); return; }
    const m = maskDisc(x, y, r); mFill(m, P.RU2); disc(x - r * 0.15, y - r * 0.15, r * 0.82, P.RU1); disc(x - r * 0.4, y - r * 0.4, r * 0.3, P.RU0);
    mOutline(m, P.RU3); mOuter(m, hiK ? P.LW : P.AM1);
  };
  for (const d of TOPDOTS) if (t >= d[2]) drawDot(d[0], d[1], false);
  for (const d of TOPDOTS_C) if (t >= d[2] + (o.cDelay || 0)) drawDot(d[0], d[1], false);
  // unbound labels flowing past (cyan flecks = their antibodies); they do not stop in the test band
  if (o.movers) for (let i = 0; i < 9; i++) {
    const u = ((t * 60 + i * 137) % 900) + TOP_UT - 520, w = -150 + i * 40 + 20 * Math.sin(i * 1.7 + t);
    const x = tc.sx(w), y = tc.sy(u);
    if (r >= 2.6) { disc(x, y, r, P.RU1); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + i; pset(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), P.CY1); } }
    else pset(x, y, P.RU1);
  }
  if (o.hero) drawDot(o.hero[0], o.hero[1], o.heroHi);
}
// the hero label in the top view (where the film's conjugate was captured)
const TOP_HERO = [TOP_UT + 6, 24];
