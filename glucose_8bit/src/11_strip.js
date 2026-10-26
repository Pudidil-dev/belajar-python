'use strict';
// ============================================================================
// WORLD S: a lengthwise cut through the strip (units ~ µm, not to scale).
// The strip stands tip-up, so the capillary channel runs DOWN the frame:
// inlet at the top (y = 0), vent at the bottom (y = 1600). The base with the
// printed electrodes is the left wall, the clear hydrophilic cover the right.
// Electrodes on the base, top to bottom: counter/reference, working (gold),
// fill-detect. The dry reagent (enzyme + mediator) coats the first two.
// ============================================================================
const CH = { x0: -110, x1: 110, y1: 1600, base: -380, el: -124, cov: 240, rg: 11 };
const EL_S = [[160, 520, 'AG'], [620, 1160, 'AU'], [1260, 1460, 'AG']];
const RG_Y = [130, 1190];
const VENT = [1530, 1585];
const DOME = { cx: 0, cy: -760, rx: 830, ry: 780 };            // the drop of blood sitting on the inlet
// ---------------------------------------------------------------- the blood front (capillary filling, slowing down as it goes)
function frontY(t) {
  if (t < T_FILL0) return 300;
  const u = seg(t, T_FILL0, T_FILL1), w = 1 - Math.pow(1 - u, 1.6);
  return 300 + 1300 * w * smooth(clamp(u * 10, 0, 1));
}
const MEN = 24;                                                 // meniscus: the walls lead the centre
function frontAt(x, t) { const f = frontY(t); return f - (f >= CH.y1 - 1 ? 0 : MEN * (1 - (x / CH.x1) * (x / CH.x1))); }
let FD_T = null;
function fillDetectT() { if (FD_T === null) { FD_T = T_FILL1; for (let t = T_FILL0; t < T_FILL1; t += 0.005) if (frontY(t) >= EL_S[2][0]) { FD_T = t; break; } } return FD_T; }
// drift after filling stops (decays), plus everything that jiggles
function settle(t) { return t < T_FILL1 ? 0 : 38 * (1 - Math.exp(-(t - T_FILL1) * 1.1)); }
// parcels carried by the flow: position of a parcel that is L behind the front
function parcelY(L, t) { return frontY(t) - L + settle(t) * clamp((CH.y1 - (frontY(t) - L)) / 300, 0, 1); }
// ---------------------------------------------------------------- populations (deterministic)
const RBC_S = [], GLU_S = [], ENZ_S = [], MED_S = [];
for (let i = 0; i < 420; i++) RBC_S.push({ L: -760 + 2400 * hash(i + 3100), x: -96 + 192 * hash(i + 3101), ph: hash(i + 3102) * TAU, sp: 0.6 + 1.2 * hash(i + 3103), rot: (hash(i + 3104) - 0.5) * 1.2, k: i });
for (let i = 0; i < 230; i++) GLU_S.push({ L: -760 + 2400 * hash(i + 3200), x: -100 + 200 * hash(i + 3201), ph: hash(i + 3202) * TAU, k: i });
for (let i = 0; i < 46; i++) {
  const y = RG_Y[0] + 20 + (RG_Y[1] - RG_Y[0] - 40) * (i + 0.5) / 46 + (hash(i + 3300) - 0.5) * 14;
  ENZ_S.push({ y0: y, x0: -103 + 6 * hash(i + 3301), x1: -100 + 52 * hash(i + 3302), y1: y + (hash(i + 3303) - 0.5) * 40, tw: T_WAKE + Math.floor(hash(i + 3304) * 9) * BEAT / 4, ph: hash(i + 3305) * TAU });
}
for (let i = 0; i < 96; i++) {
  const y = RG_Y[0] + 10 + (RG_Y[1] - RG_Y[0] - 20) * (i + 0.5) / 96 + (hash(i + 3400) - 0.5) * 8;
  MED_S.push({ y0: y, x0: -106 + 9 * hash(i + 3401), x1: -104 + 74 * hash(i + 3402), y1: y + (hash(i + 3403) - 0.5) * 50, tw: T_WAKE + BEAT / 8 + Math.floor(hash(i + 3404) * 9) * BEAT / 4, ph: hash(i + 3405) * TAU, cyc: 0.9 + 1.4 * hash(i + 3406) });
}
const HERO_ENZ_S = [-86, 990];
// the hero glucose in the strip: rides the flow, then wanders to the hero enzyme
function heroGluS(t) {
  const L = 1600 - 920 + 30;
  let x = -14 + 6 * Math.sin(t * 0.9), y = parcelY(L, t);
  const k = smooth(seg(t, 11.2, T_SR1 - 0.15));
  x = lerp(x, HERO_ENZ_S[0] + 14, k) + 4 * Math.sin(t * 1.7) * (1 - k);
  y = lerp(y, HERO_ENZ_S[1] - 10, k) + 3 * Math.cos(t * 1.3) * (1 - k);
  return [x, y];
}
function rbcPosS(c, t) {
  let y = parcelY(c.L, t), x = c.x + 3 * Math.sin(t * 0.8 * c.sp + c.ph);
  if (y < 0) { const sq = clamp(1 + y / 420, 0.15, 1); x = x / sq; if (Math.abs(x) > DOME.rx * 0.9) return null; }
  else { if (y > frontAt(x, t) - 9) return null; y += 2.5 * Math.cos(t * 0.7 * c.sp + c.ph); }
  if (y > 0 && (x < CH.x0 + 9 || x > CH.x1 - 9)) return null;
  return [x, y];
}
// ---------------------------------------------------------------- sprites
function rbcSprite(x, y, R, face, a) {
  if (R < 2.2) { rect(x - 1, y - 1, x + 2, y + 1, P.RC2); pset(x, y - 1, P.RC3); return; }
  const rx = R * (0.34 + 0.66 * face), ry = R;
  const m = maskEll(x, y, rx, ry, a);
  shade(m, P.RC2, P.RC3, P.RC0, null, { k: R > 7 ? 2 : 1 });
  if (face > 0.5 && R > 3.5) ellipse(x + 0.1 * R, y + 0.12 * R, rx * 0.46, ry * 0.46, P.RC1, 1, a);
  if (face > 0.5 && R > 6) ellipse(x - 0.35 * rx, y - 0.4 * ry, Math.max(1, rx * 0.18), Math.max(1, ry * 0.12), P.RC3, 1, a);
}
function hexPts(x, y, s, a) { const o = []; for (let i = 0; i < 6; i++) { const an = a + i * TAU / 6; o.push(x + Math.cos(an) * s, y + Math.sin(an) * s); } return o; }
function gluSprite(x, y, s, a, hero) {
  if (s < 2.4) { rect(x - 1, y - 1, x + 1, y + 1, hero ? P.GL3 : P.GL2); if (hero) { pset(x + 1, y, P.GL2); pset(x - 2, y, P.GL2); } return; }
  poly(hexPts(x, y, s + 1, a), P.GL1);
  poly(hexPts(x, y, s, a), P.GL2);
  poly(hexPts(x - s * 0.15, y - s * 0.15, s * 0.45, a), P.GL3, 0.6);
  if (s > 4) { for (let i = 0; i < 6; i += 2) { const an = a + i * TAU / 6, x1 = x + Math.cos(an) * s * 1.55, y1 = y + Math.sin(an) * s * 1.55; line(x + Math.cos(an) * s, y + Math.sin(an) * s, x1, y1, P.GL1); } }
}
function enzSprite(x, y, R, ph) {
  if (R < 2) { rect(x - 1, y - 1, x + 2, y + 2, P.EZ2); pset(x, y - 1, P.EZ3); return; }
  const m = maskFn(x - R * 1.3, y - R * 1.3, x + R * 1.3, y + R * 1.3, (px, py) => { const dx = px - x, dy = py - y, an = Math.atan2(dy, dx); return Math.hypot(dx, dy) < R * (1 + 0.16 * Math.sin(3 * an + ph) + 0.08 * Math.sin(5 * an - ph)); });
  shade(m, P.EZ2, P.EZ3, P.EZ1, null, { k: R > 7 ? 2 : 1 });
  if (R > 4) disc(x + R * 0.35, y - R * 0.1, Math.max(1, R * 0.28), P.EZ0);         // the pocket
}
function medSprite(x, y, R, green, a) {
  const c1 = green ? P.MG1 : P.MD1, c2 = green ? P.MG2 : P.MD2, c3 = green ? P.MG3 : P.MD3;
  if (R < 2) { rect(x - 1, y - 1, x + 1, y + 1, c2); pset(x - 1, y - 1, c3); return; }
  for (let i = 0; i < 6; i++) { const an = a + i * TAU / 6; lineW(x, y, x + Math.cos(an) * R * 1.25, y + Math.sin(an) * R * 1.25, Math.max(1, R * 0.32), c1); disc(x + Math.cos(an) * R * 1.25, y + Math.sin(an) * R * 1.25, Math.max(1, R * 0.3), c2); }
  disc(x, y, R * 0.62, c2); disc(x - R * 0.18, y - R * 0.18, Math.max(1, R * 0.26), c3);
}
function electronSprite(x, y, R, trail) {
  if (trail) { const [dx, dy, n] = trail; for (let i = 1; i <= n; i++) disc(x - dx * i, y - dy * i, Math.max(1, R * (1 - i / (n + 1)) * 0.8), P.EL1, 0.6); }
  disc(x, y, R * 1.9, P.EL1, 0.35); disc(x, y, R, P.EL2); disc(x - R * 0.25, y - R * 0.25, Math.max(1, R * 0.5), P.EL3);
}
// ---------------------------------------------------------------- the reagent molecules over time
function wokeK(m, t) { return t < m.tw ? 0 : backOut(clamp((t - m.tw) / 0.42, 0, 1), 1.4); }
function enzPosS(m, t) { const k = wokeK(m, t); return [lerp(m.x0, m.x1, Math.min(k, 1.15)) + 2.2 * Math.sin(t * 1.1 + m.ph) * k, lerp(m.y0, m.y1, Math.min(k, 1.15)) + 2.5 * Math.cos(t * 0.9 + m.ph) * k]; }
// mediators shuttle once the reaction runs (green on the way to the electrode)
function medStateS(m, t) {
  const k = wokeK(m, t);
  let x = lerp(m.x0, m.x1, Math.min(k, 1.15)) + 3 * Math.sin(t * 1.4 + m.ph) * k, y = lerp(m.y0, m.y1, Math.min(k, 1.15)) + 3 * Math.cos(t * 1.2 + m.ph) * k;
  let green = false;
  if (t > T_GRIP && m.y0 > EL_S[1][0] - 20 && m.y0 < EL_S[1][1] + 20) {
    const ph = ((t - T_GRIP) / m.cyc + m.ph / TAU) % 1;           // 0..0.5 charged and drifting to the wall, 0.5..1 back out
    if (ph < 0.5) { green = ph > 0.06; x = lerp(x, CH.x0 + 4, smooth(ph * 2)); }
    else x = lerp(CH.x0 + 4, x, smooth((ph - 0.5) * 2));
  }
  return [x, y, green];
}
// electron transfer flashes at the working electrode (count grows with time)
function weSparks(t) {
  const out = []; if (t < T_SURGE - 0.4) return out;
  const rate = 14 + 26 * smooth(seg(t, T_SURGE - 0.4, T_SURGE + 1.2));
  const n0 = Math.floor((t - 1) * rate), n1 = Math.floor(t * rate);
  for (let n = n0; n <= n1; n++) { const tn = n / rate, age = t - tn; if (age < 0 || age > 0.5) continue; out.push([EL_S[1][0] + 10 + (EL_S[1][1] - EL_S[1][0] - 20) * hash(n * 3 + 11), age]); }
  return out;
}
// ---------------------------------------------------------------- draw
function drawWorldS(cam, t, o) {
  o = o || {};
  const z = cam.z, iz = 1 / z;
  // ground
  rect(0, 0, W, H, P.BG);
  for (const d of DUST) { const x = ((d.x + 10 * wob(t, 2, d.ph) - cam.cx * z * 0.15 * d.k) % W + W) % W, y = ((d.y - cam.cy * z * 0.15 * d.k) % H + H) % H; pset(x, y, d.s > 0.7 ? P.N4 : P.N3); }
  const fy = frontY(t), wake = t >= T_WAKE;
  const dissolve = smooth(seg(t, T_WAKE, T_WAKE + 1.4));
  // base pass: materials per pixel
  for (let sy = 0; sy < H; sy++) {
    const wy = (sy + 0.5 - cam.ay) * iz + cam.cy;
    if (wy < -2400 || wy > 2600) continue;
    const row = sy * W;
    for (let sx = 0; sx < W; sx++) {
      const wx = (sx + 0.5 - cam.ax) * iz + cam.cx;
      let c = -1;
      if (wy < 0) {
        const dx = (wx - DOME.cx) / DOME.rx, dy = (wy - DOME.cy) / DOME.ry, dd = dx * dx + dy * dy;
        if (dd < 1) {                                              // the drop, cut open like the channel: plasma + cells, glossy red skin
          const rim = 1 - Math.sqrt(dd);
          c = P.PL1; const sw = Math.sin(wx * 0.045 + wy * 0.012 + t * 0.7) + Math.sin(wy * 0.031 - wx * 0.02 - t * 0.5); if (sw > 1.4 && bay(sx, sy) < 0.5) c = P.PL2;
          if (rim < 14 * iz / DOME.rx * 1.0 + 0.004) c = P.BL3; else if (rim < 0.03) c = dx > 0.2 && dy < 0 ? P.BL3 : P.BL2; else if (rim < 0.05 && bay(sx, sy) < 0.5) c = P.BL1;
        }
        else if (wx >= CH.base && wx < CH.x0 && wy > -6) c = P.N4;
      } else if (wy < 2400) {
        if (wx < CH.base) c = -1;
        else if (wx < CH.el) {                                     // base substrate
          c = wx > CH.el - 3 * iz - 1 ? P.N5 : P.N4;
          if (((wy * 0.02 + wx * 0.003) % 1 + 1) % 1 < 0.03 && wx < CH.el - 8) c = P.N3;
        } else if (wx < CH.x0) {                                   // printed electrode layer / insulation
          let e = null; for (const b of EL_S) if (wy >= b[0] && wy < b[1]) e = b;
          if (e) { const au = e[2] === 'AU'; c = wx > CH.x0 - 3 * iz - 1 ? (au ? P.AU3 : P.AG3) : (au ? P.AU2 : P.AG2); if (wx < CH.el + 3 * iz) c = au ? P.AU1 : P.AG1; }
          else c = P.N5;
        } else if (wx < CH.x1) {                                   // the channel
          if (wy > CH.y1) c = wy < CH.y1 + 3 * iz + 1 ? P.TP2 : P.TP1;                     // spacer that closes the channel
          else {
            const blood = wy < frontAt(wx, t);
            if (blood) { c = P.PL1; const sw = Math.sin(wx * 0.045 + wy * 0.012 + t * 0.7) + Math.sin(wy * 0.031 - wx * 0.02 - t * 0.5); if (sw > 1.4 && bay(sx, sy) < 0.5) c = P.PL2; }
            else c = ((sx + sy) & 3) === 0 ? P.N3 : P.N2;
            // the dry reagent film on the electrodes (swells and lifts off when wet)
            if (wy > RG_Y[0] && wy < RG_Y[1]) {
              const th = CH.rg * (1 - 0.82 * dissolve);
              if (wx < CH.x0 + th) {
                const wet = blood;
                const hs = hash2(Math.floor(wx / 4), Math.floor(wy / 4));
                c = wet ? (bay(sx, sy) < 0.22 ? P.EZ1 : P.PL2) : (bay(sx, sy) < 0.5 ? P.EZ0 : P.EZ1);
                if (hs > (wet ? 0.93 : 0.86)) c = hash2(Math.floor(wy / 4), 7) > 0.5 ? P.MD1 : P.EZ2;
              }
            }
          }
        } else if (wx < CH.cov) {                                  // the clear cover film (vent hole near the end)
          if (wy > VENT[0] && wy < VENT[1]) c = -1;
          else { c = wx < CH.x1 + 3 * iz + 1 ? P.TL1 : P.N3; if (c === P.N3 && ((sx * 3 + sy) % 7 === 0)) c = P.N5; if (wx > CH.cov - 3 * iz - 1) c = P.N5; }
        }
      }
      if (c !== -1) buf[row + sx] = c;
    }
  }
  // meniscus line at the front
  if (fy < CH.y1 - 1) {
    for (let x = CH.x0; x <= CH.x1; x += Math.max(1, 2 * iz)) { const y = frontAt(x, t); const sx_ = cam.x(x), sy_ = cam.y(y); rect(sx_ - 1, sy_ - 1, sx_ + 1, sy_ + 1, P.BL3); }
    // flow chevrons just behind the front
    if (t < T_FILL1) for (let k = 0; k < 3; k++) { const y = fy - 60 - k * 70 - ((t * 120) % 70), x = 0; if (y < 20) continue; const sx_ = cam.x(x), sy_ = cam.y(y), s = Math.max(2, 9 * z); line(sx_ - s, sy_ - s * 0.6, sx_, sy_, P.BL4, 0.7); line(sx_ + s, sy_ - s * 0.6, sx_, sy_, P.BL4, 0.7); }
  }
  // the fill-detect electrode flashes green when the blood reaches it (the meter now knows the strip is full)
  const tfd = fillDetectT();
  if (t > tfd && t < tfd + 1.6) {
    const k = 1 - (t - tfd) / 1.6, x0 = cam.x(CH.el), x1 = cam.x(CH.x0 + 2), ya = cam.y(EL_S[2][0]), yb = cam.y(EL_S[2][1]);
    rect(x0, ya, x1, yb, P.SG2, 0.6 * k); rect(x1, ya, x1 + Math.max(1, 2 * z), yb, P.SG3, k);
  }
  // air leaving through the vent while the channel fills
  if (t > T_FILL0 && t < T_FILL1 + 0.5) for (let k = 0; k < 6; k++) { const a = ((t * 1.6 + k / 6) % 1), y = lerp(VENT[0] + 6, VENT[1] - 6, hash(k + 70)), x = CH.x1 + a * 220; disc(cam.x(x), cam.y(y + Math.sin(a * 9 + k) * 6), Math.max(1, 3 * z * (1 - a)), P.N6, 1 - a); }
  // red cells (in the channel; some still in the drop)
  const R = Math.max(1, 8.5 * z);
  const vx0 = cam.wx(-R), vx1 = cam.wx(W + R), vy0 = cam.wy(-R), vy1 = cam.wy(H + R);
  for (const c of RBC_S) {
    const q = rbcPosS(c, t); if (!q) continue;
    const x = q[0], y = q[1];
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    const face = 0.5 + 0.5 * Math.cos(t * 0.9 * c.sp + c.ph * 2);
    rbcSprite(cam.x(x), cam.y(y), R, face, c.rot + 0.3 * Math.sin(t * 0.4 + c.ph));
  }
  // glucose in the plasma
  const gs = Math.max(1, 2.6 * z);
  for (const g of GLU_S) {
    let y = parcelY(g.L, t), x = g.x + 5 * Math.sin(t * 1.9 + g.ph);
    if (y < 0) { const sq = clamp(1 + y / 420, 0.15, 1); x = x / sq; }
    else { if (y > frontAt(x, t) - 4) continue; y += 5 * Math.cos(t * 1.6 + g.ph * 1.3); }
    if (y > 0 && (x < CH.x0 + 4 || x > CH.x1 - 4)) continue;
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    gluSprite(cam.x(x), cam.y(y), gs, g.ph + t * 0.6, false);
  }
  // reagent molecules (in the dry film until they wake, then free in the plasma near the wall)
  if (wake) {
    const er = Math.max(1, 5.5 * z), mr = Math.max(1, 2.6 * z);
    for (const m of ENZ_S) { if (t < m.tw) continue; const p = enzPosS(m, t), k = clamp((t - m.tw) / 0.12, 0, 1); enzSprite(cam.x(p[0]), cam.y(p[1]), er * (0.4 + 0.6 * k), m.ph + t * 0.3); }
    for (const m of MED_S) { if (t < m.tw) continue; const s = medStateS(m, t); medSprite(cam.x(s[0]), cam.y(s[1]), mr, s[2], m.ph + t * 0.5); }
  }
  // electron transfer at the working electrode + electrons running down the electrode lead
  if (t > T_SURGE - 0.4) {
    for (const [y, age] of weSparks(t)) { const k = 1 - age / 0.5; disc(cam.x(CH.x0 - 3), cam.y(y), Math.max(1, 5 * z * k), P.EL2, k); if (k > 0.6) disc(cam.x(CH.x0 - 3), cam.y(y), Math.max(1, 2 * z), P.EL3); }
    const cur = smooth(seg(t, T_SURGE - 0.2, T_SURGE + 1.0));
    for (let k = 0; k < 40 * cur; k++) { const y = EL_S[1][0] + ((t * 260 + k * 37.3) % 1900); if (y > 2400) continue; const sx_ = cam.x(CH.el + 4 + 6 * hash(k + 81)), sy_ = cam.y(y); disc(sx_, sy_, Math.max(1, 1.8 * z), P.EL2); pset(sx_, sy_ - 1, P.EL3); }
  }
  // the hero glucose (brighter, with a pulse ring)
  if (o.hero !== false && t > 9 && t < T_SR1 + 0.4) {
    const h = heroGluS(t), hx = cam.x(h[0]), hy = cam.y(h[1]), s = Math.max(2.5, 4.2 * z);
    ring(hx, hy, s * 2.2 + 2 * Math.sin(t * 6), 1, P.GL3, 0.7);
    gluSprite(hx, hy, s, t * 0.8, true);
  }
}
