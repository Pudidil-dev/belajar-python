'use strict';
// ============================================================================
// FROM THE HEART TO THE SKIN (torso world, same coordinates as the ward).
// The heart's coordinated activity acts like a changing electrical dipole; the
// body's conductive tissues let it set up time-varying potentials everywhere,
// drawn as equipotential bands (warm = positive, cool = negative). Nothing
// travels from the heart to the skin: the bands simply change with the beat.
// Lead II reads the difference between LL and RA (its axis points down to the
// patient's left, along the main direction of ventricular activation, so its
// R wave is tall). Then a cross-section of one electrode on the skin.
// ============================================================================
const LEAD_II = [0.5, 0.866];                          // RA → LL direction (viewer's right and down)
// potential at world point (x, y) for the heart vector p = [px, py]
function dipoleV(x, y, p) { const dx = x - HEART_AT.x, dy = y - HEART_AT.y, r2 = dx * dx + dy * dy + 900; return (p[0] * dx + p[1] * dy) / r2 * 60; }
// the heart vector during the beat: along the Lead II axis, sized and signed by the Lead II voltage (simplified)
function heartVec(ms) { const v = ecgMV(ms); return [LEAD_II[0] * v, LEAD_II[1] * v]; }
const POS_C = () => [P.FP1, P.FP2, P.FP3, P.FP4], NEG_C = () => [P.FN1, P.FN2, P.FN3, P.FN4];
// o: { ms, bands (0..1), arrow (0..1), axis (0..1) }
function torsoField(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, ms = o.ms, p = heartVec(ms);
  wardBG(cam, t);
  rect(0, Y(640), W, H, P.BE1);
  // the see-through body
  for (const A of [ARM_L, ARM_R]) { const m = maskPoly(cam.pts(A)); mFill(m, mixc(P.BE1, P.SK1, 0.55)); mOutline(m, P.SK2); }
  const m = maskPoly(cam.pts(TORSO)); mFill(m, mixc(P.BE1, P.SK0, 0.85)); mOutline(m, P.SK3);
  // equipotential bands inside the body
  const k = o.bands === undefined ? 1 : o.bands, pc = POS_C(), nc = NEG_C();
  if (k > 0) for (let j = 0; j < m.h; j++) {
    const sy = m.y0 + j; if (sy < 0 || sy >= H) continue; const wy = cam.wy(sy + 0.5);
    for (let i = 0; i < m.w; i++) {
      if (!m.d[j * m.w + i]) continue; const sx = m.x0 + i; if (sx < 0 || sx >= W) continue;
      const v = dipoleV(cam.wx(sx + 0.5), wy, p), lvl = Math.max(-4, Math.min(4, Math.round(v / 0.22)));
      if (lvl === 0) continue;
      const c = lvl > 0 ? pc[lvl - 1] : nc[-lvl - 1], idx = sy * W + sx;
      const vr = dipoleV(cam.wx(sx + 1.5), wy, p), vd = dipoleV(cam.wx(sx + 0.5), cam.wy(sy + 1.5), p), edge = Math.round(vr / 0.22) !== Math.round(v / 0.22) || Math.round(vd / 0.22) !== Math.round(v / 0.22);
      buf[idx] = mixc(buf[idx], edge ? mixc(c, P.C6, 0.35) : c, 0.75 * k);
    }
  }
  // ribs faintly, the heart (beating in real time), the electrodes and leads
  for (let kk = 0; kk < 6; kk++) for (const s_ of [-1, 1]) { let px_ = null, py_ = null; for (let i = 0; i <= 12; i++) { const u = i / 12, x = 180 + s_ * (14 + u * 128), y = 650 + kk * 44 + 30 * Math.sin(u * 2.4) - 6; if (px_ !== null) lineW(px_, py_, X(x), Y(y), 3 * z, mixc(P.SK0, P.BN0, 0.4)); px_ = X(x); py_ = Y(y); } }
  drawHeart(cam, ms, { at: HEART_AT, cond: 0.6 });
  // the heart vector: an arrow from the heart along the current direction, length with the voltage
  if ((o.arrow || 0) > 0) {
    const L = 90 * Math.abs(ecgMV(ms)) / 1.15, sg = Math.sign(ecgMV(ms)) || 1, ex = HEART_AT.x + sg * LEAD_II[0] * L, ey = HEART_AT.y + sg * LEAD_II[1] * L;
    if (L > 4) withDither(o.arrow, () => { lineW(X(HEART_AT.x), Y(HEART_AT.y), X(ex), Y(ey), 3 * z, P.C6); arrowHead(X(ex), Y(ey), Math.atan2(ey - HEART_AT.y, ex - HEART_AT.x), 6 * z, P.C6); });
  }
  // Lead II: the axis from RA to LL
  if ((o.axis || 0) > 0) withDither(o.axis, () => dashLine(X(ELEC.RA[0]), Y(ELEC.RA[1]), X(ELEC.LL[0]), Y(ELEC.LL[1]), P.EG2, 5, 4, -t * 20));
  for (const A of [ARM_L, ARM_R]) { const mm = maskPoly(cam.pts(A)); mOutline(mm, P.SK2); }
  tintRect(0, Y(996), W, H, P.SH0, 0.6);
  drawLeads(cam, t, { hiElec: o.hiElec || {} });
}
// ---------------------------------------------------------------- one electrode on the skin, in cross-section
// layers (local px, y down): snap stud, foam backing, Ag/AgCl sensor, gel sponge, skin (stratum corneum, epidermis, dermis)
function electrodeSection(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, ms = beatMs(t), v = dipoleV(ELEC.LL[0], ELEC.LL[1], heartVec(ms));
  rect(0, 0, W, H, P.BG);
  // skin: dermis, epidermis, stratum corneum, tinted by the local potential (positive at LL during the QRS)
  const tint = clamp(v / 1.2, -1, 1), skinTop = 30;
  rect(0, Y(skinTop + 30), W, H, P.SK1); rect(0, Y(skinTop + 4), W, Y(skinTop + 30), P.SK2); rect(0, Y(skinTop), W, Y(skinTop + 4), P.SK3);
  if (tint > 0.05) tintRect(0, Y(skinTop), W, H, P.FP3, 0.35 * tint); if (tint < -0.05) tintRect(0, Y(skinTop), W, H, P.FN3, -0.35 * tint);
  for (let i = 0; i < 9; i++) { const x = -170 + i * 44 + 10 * Math.sin(i * 1.7); disc(X(x), Y(skinTop + 70 + 30 * hash(i + 40)), 5 * z, P.HM2); disc(X(x), Y(skinTop + 70 + 30 * hash(i + 40)), 3 * z, P.HM3); }
  for (let i = 0; i < 26; i++) { const x = -180 + i * 14; rect(X(x), Y(skinTop + 6), X(x + 10), Y(skinTop + 14), P.SK3); }
  // foam backing with adhesive edges, the gel sponge, the sensor, the stud
  poly(cam.pts([-140, skinTop, -140, -2, 140, -2, 140, skinTop, 80, skinTop, 70, 2, -70, 2, -80, skinTop]), P.EW); rect(X(-140), Y(skinTop - 3), X(-80), Y(skinTop), P.AL3); rect(X(80), Y(skinTop - 3), X(140), Y(skinTop), P.AL3);
  const gm = maskEll(X(0), Y(skinTop - 10), 68 * z, 22 * z); mFill(gm, P.GL1, 0.9, (x, y) => y >= Y(6)); mFill(gm, P.GL2, 0.35, (x, y) => y >= Y(6) && y < Y(12));
  for (let i = 0; i < 14; i++) { const gx = -56 + i * 8.5 + 3 * Math.sin(t * 3 + i), gy = skinTop - 8 + 6 * Math.sin(t * 2 + i * 1.3); disc(X(gx), Y(gy), 1.6 * z, P.GL2); }
  rect(X(-44), Y(0), X(44), Y(6), P.AL2); rect(X(-44), Y(4), X(44), Y(6), P.AL1);
  const sm = maskRR(X(-14), Y(-40), X(14), Y(-2), 5 * z); shade(sm, P.AL2, P.AL4, P.AL1, P.AL0, {});
  rect(X(-6), Y(-2), X(6), Y(2), P.AL1);
  // the lead-wire clip and wire
  const cm = maskRR(X(-22), Y(-66), X(40), Y(-34), 8 * z); shade(cm, P.CR, mixc(P.CR, P.C6, 0.4), mixc(P.CR, P.K0, 0.5), P.K0, {});
  lineW(X(38), Y(-52), X(150), Y(-140), 6 * z, P.CB0); lineW(X(38), Y(-52), X(150), Y(-140), 3.6 * z, mixc(P.CB1, P.CR, 0.35));
  return v;
}
