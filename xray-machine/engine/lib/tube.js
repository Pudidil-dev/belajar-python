// TUBE — the X-ray tube head in side cutaway, in millimetres. Origin = the focal spot on the anode; x runs along the tube
// axis (cathode at −x, anode at +x); y points down (the beam leaves downward through the window). The anode disc spins
// about y = AXIS. Drawn with the canvas under a camera transform, so it re-rasterizes cleanly at every zoom; finer
// parts (filament helix, rotor stripes) appear only when the camera is close enough to see them.
(() => {
const { P } = PIX;
const TUBE = window.TUBE = {};
const h = U.hash, TAU = U.TAU, clamp = U.clamp, lerp = U.lerp;
const AX = -40;                          // anode rotation axis (y)
TUBE.AX = AX;
const poly = pts => U.poly(pts, true);
const F = (c, path, col, a = 1) => PIX.fill(c, path, col, a);
const rr = (x, y, w, hh, r) => PIX.rectPath(x, y, w, hh, r);
// anode disc profile (side view): conical front face tilted 12° from the beam direction (the anode angle)
const TAN = Math.tan(12 * Math.PI / 180);
const faceX = y => (Math.abs(y - AX) - 40) * TAN;          // x of the front face at height y (0 at the focal spot)
TUBE.faceX = faceX;
const DISC = (() => { const p = []; for (let y = 10; y >= -90; y -= 2) p.push([faceX(y), y]); p.push([9, -90], [9, 10]); return p; })();
const TRACK = [[faceX(10), 10], [faceX(-16), -16], [faceX(-16) + 1.6, -16], [faceX(10) + 1.6, 10]];
const TRACK2 = [[faceX(-90), -90], [faceX(-64), -64], [faceX(-64) + 1.6, -64], [faceX(-90) + 1.6, -90]];
// glass envelope (outline polygon): cathode neck, bulb, rotor neck
const ENV = (() => {
  const top = [], bot = [];
  const prof = x => x < -78 ? 27 : x < -46 ? lerp(27, 70, MO.smooth((x + 78) / 32)) : x < 62 ? 70 : x < 92 ? lerp(70, 31, MO.smooth((x - 62) / 30)) : 31;
  for (let x = -142; x <= 152; x += 2) { const r = prof(x); top.push([x, AX - r]); bot.push([x, AX + r]); }
  return { top, bot, prof };
})();
const ENV_PATH = (() => { const p = new Path2D(); const pts = ENV.top.concat(ENV.bot.slice().reverse()); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; })();
TUBE.ENV = ENV;

// filament coil (helix seen from the side): returns points along the wire
const COIL = (() => { const pts = []; const n = 15, L = 9.4, r = 0.8; for (let k = 0; k <= n * 24; k++) { const a = k / 24 * TAU, y = -L / 2 + L * k / (n * 24); pts.push([-21.4 + Math.cos(a) * r, y, Math.sin(a)]); } return pts; })();
TUBE.COIL = COIL;
const COIL_RAMP = [[0, 'd6'], [0.2, 'r1'], [0.36, 'r2'], [0.52, 'o0'], [0.66, 'o1'], [0.82, 'y2'], [1, 'y3']].map(([g, k]) => [g, PIX.hex(PIX.P[k])]);
TUBE.coilColor = g => {                                 // continuous: an RGB between ramp stops (the quantizer dithers it)
  g = clamp(g); let i = 0; while (i < COIL_RAMP.length - 2 && g > COIL_RAMP[i + 1][0]) i++;
  const [g0, c0] = COIL_RAMP[i], [g1, c1] = COIL_RAMP[i + 1], q = clamp((g - g0) / (g1 - g0));
  return `rgb(${c0.map((v, j) => Math.round(lerp(v, c1[j], q))).join(',')})`;
};

// o: { z (px/mm for LOD), t, cut (0 = closed housing, 1 = fully cut away), spin (anode turns per second, visual),
//      fil (filament glow 0..1), beam (electron beam 0..1), xr (X-ray emission 0..1), heat (focal spot heat 0..1),
//      shut (collimator shutters closing 0..1), coll (draw the collimator box), hv (cable pulse 0..1) }
TUBE.draw = (c, o) => {
  const z = o.z || 1, t = o.t || 0, cut = o.cut ?? 1;
  // HV cables (behind the housing); electrons flow in through the cathode cable and out through the anode cable
  for (const [x, sgn] of [[-140, -1], [140, 1]]) {
    K.pipe(c, [[x, -126], [x, -175], [x + sgn * 12, -215], [x + sgn * 12, -330]], 16, 'd3', 'd5', 'd1');
    if (o.hv > 0) for (let k = 0; k < 6; k++) {
      const q = K.wrap(t * 1.2 * -sgn + k / 6, 1), y = lerp(-330, -140, q);
      const xx = y < -215 ? x + sgn * 12 : y < -175 ? lerp(x, x + sgn * 12, (-175 - y) / 40) : x;
      PIX.circ(c, xx, y, 2.6, 'c2', 0.85 * o.hv);
    }
    F(c, rr(x - 12, -140, 24, 14, 3), 'd5'); F(c, rr(x - 12, -140, 24, 3, 2), 'd7');
  }
  // housing shell
  const HOUS = rr(-178, -132, 356, 184, 52);
  F(c, HOUS, 'd5');
  const wipe = cut <= 0 ? 0 : cut >= 1 ? 999 : 200 * MO.cubicInOut(cut);      // half-width of the opened part (mm)
  if (cut > 0) {
    c.save(); c.globalAlpha = 1;
    F(c, rr(-171, -125, 342, 170, 46), 'd2');                        // lead lining
    F(c, rr(-169, -123, 338, 166, 44), 'k');                         // oil space
    c.restore();
    if (z > 0.3) {                                                   // insulating oil: a faint warm stipple that drifts
      const m = c.getTransform(), A = 1;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.y0;
      const sx0 = Math.max(0, Math.floor(m.e + m.a * -169)), sx1 = Math.min(PIX.W, Math.ceil(m.e + m.a * 169));
      const sy0 = Math.max(0, Math.floor(m.f + m.d * -123)), sy1 = Math.min(PIX.H, Math.ceil(m.f + m.d * 43));
      for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) {
        if ((sx + sy) % 2) continue;
        const wx = (sx - m.e) / m.a, wy = (sy - m.f) / m.d;
        const ex = Math.max(0, Math.abs(wx) - 125), ey = wy < -79 ? -79 - wy : wy > -1 ? wy + 1 : 0;   // rounded corners
        if (Math.hypot(ex, ey) > 44) continue;
        if (wx > -142 && wx < 152 && Math.abs(wy - AX) < ENV.prof(wx) + 1) continue;          // not inside the glass
        const n = K.vn(wx * 0.08 + t * 0.12, wy * 0.11 - t * 0.08, 5);
        if (n > 0.66 && K.BAY(sx, sy) < (n - 0.66) * 1.6 * A) c.fillRect(sx, sy, 1, 1);
      }
      c.restore();
    }
  }
  // the insert (always drawn; hidden under the closed shell until the cutaway)
  if (cut > 0) {
    c.save();
    // stator coils outside the rotor neck
    for (const y0 of [-90, 1]) {
      F(c, rr(48, y0, 70, 13, 2), 'u0');
      if (z > 0.5) for (let x = 50; x < 117; x += 3) F(c, rr(x, y0 + 1, 2, 11, 0), 'u1');
      F(c, rr(48, y0, 70, 2, 1), 'u2');
    }
    // vacuum inside the envelope
    F(c, ENV_PATH, 'k');
    // cathode stem and arm
    K.pipe(c, [[-150, AX], [-84, AX], [-62, -3], [-34, -3]], 7, 'd5', 'd7', 'd3');
    K.pipe(c, [[-150, AX], [-84, AX], [-62, 3], [-34, 3]], 3, 'd4', 'd6', 'd2');
    // focusing cup with its slot
    F(c, rr(-35, -11, 20, 22, 2), 'd5'); F(c, rr(-35, -11, 20, 4, 2), 'd7'); F(c, rr(-35, 7, 20, 4, 2), 'd4');
    F(c, rr(-23, -5.6, 8, 11.2, 0.8), 'd1');
    // filament
    const g = o.fil || 0;
    if (z < 6) { c.save(); c.fillStyle = TUBE.coilColor(g); c.fill(rr(-22.6, -4.8, 2.4, 9.6, 0.6)); c.restore(); }
    else {
      c.save(); c.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) for (let k = 1; k < COIL.length; k++) {
        const [x0, y0, z0] = COIL[k - 1], [x1, y1] = COIL[k];
        if ((pass === 0) !== (z0 < 0)) continue;                     // back half of each turn first, darker
        c.strokeStyle = pass === 0 ? TUBE.coilColor(g * 0.72) : TUBE.coilColor(g); c.lineWidth = 0.32;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.restore();
      PIX.line(c, -21.4, -4.7, -32, -4.7, 'd6', 0.4); PIX.line(c, -21.4, 4.7, -32, 4.7, 'd6', 0.4);   // filament leads
    }
    if (g > 0.2) FX.glowW(c, -21.4, 0, Math.min(8 + 8 * g, 150 / z), ['r0', 'r1', 'r2', 'o0', 'o1', 'y2'], 0.95 * (g - 0.2), 1.8);
    // anode: stem, rotor, bearing, terminal
    F(c, rr(17, AX - 4, 26, 8, 2), 'd6');
    F(c, rr(42, AX - 22, 80, 44, 6), 'u1'); F(c, rr(42, AX - 22, 80, 6, 4), 'u2'); F(c, rr(42, AX + 14, 80, 8, 4), 'u0');
    if (z > 0.45) {                                                  // stripes rolling over the rotor = it spins
      const ph = t * (o.spin ?? 0);
      for (let k = 0; k < 10; k++) {
        const a = K.wrap(ph + k / 10, 1) * TAU, yy = AX - 22 * Math.cos(a);
        if (Math.sin(a) > 0) F(c, rr(46, yy - 0.8, 72, 1.6, 0), 'u0', 0.7);
      }
    }
    F(c, rr(122, AX - 6, 30, 12, 3), 'd5'); F(c, rr(150, AX - 14, 26, 28, 4), 'd4');
    // the disc: molybdenum body, tungsten track on the bevel, graphite backing
    if (!o.noDisc) {
    F(c, poly(DISC), 'd6');
    F(c, rr(9, -84, 9, 88, 2), 'd2'); F(c, rr(9, -84, 2, 88, 0), 'd3');                 // graphite heat-storage backing
    F(c, poly(TRACK), 'y1'); F(c, poly(TRACK2), 'y1'); PIX.line(c, faceX(10), 10, faceX(-16), -16, 'y2', Math.min(0.5, 1.2 / z)); PIX.line(c, faceX(-90), -90, faceX(-64), -64, 'y2', Math.min(0.5, 1.2 / z));
    if (z > 0.6) {                                                  // the track moving past on the spinning disc face
      const ph = t * (o.spin ?? 0) * 3;
      const n = z > 8 ? 40 : 8, sz = Math.min(z > 8 ? 0.35 : 1.2, 3 / z);
      for (let k = 0; k < n; k++) { const q = K.wrap(ph * 8 / n + k / n + h(k, 9) * 0.3 / n, 1); const y = lerp(-15, 9, q); F(c, rr(faceX(y) + 0.15 + h(k, 8) * 1.1, y, sz, sz * 0.6, 0), h(k, 7) < 0.5 ? 'y2' : 'y0'); }
    }
    PIX.line(c, faceX(-90), -90, faceX(AX), AX, 'd8', 1.2 / z); PIX.line(c, faceX(AX), AX, faceX(10), 10, 'd8', 1.2 / z);
    }
    // focal spot heat
    if (o.heat > 0) FX.glowW(c, 0, 0, Math.min(2 + 3 * o.heat, 70 / z), ['r1', 'r2', 'o0', 'o1', 'y2', 'y3'], 1.05 * o.heat, 1.3);
    // glass envelope outline + highlights
    c.save(); c.strokeStyle = P.d6; c.lineWidth = 1.1 / z; c.stroke(ENV_PATH);
    c.strokeStyle = P.d8; c.lineWidth = 0.7 / z;
    c.beginPath(); ENV.top.slice(8, 60).forEach(([x, y], i) => i ? c.lineTo(x, y + 3) : c.moveTo(x, y + 3)); c.stroke();
    c.restore();
    // window: the thin part of the envelope under the focal spot
    F(c, rr(-13, AX + 68, 26, 4, 1), 'c0'); PIX.line(c, -13, AX + 69, 13, AX + 69, 'c1', Math.min(0.6, 1.5 / z));
    // housing port
    F(c, rr(-16, 40, 32, 13, 0), 'k');
    c.restore();
  }
  if (cut < 1) {                                                     // closed shell over everything outside the wipe
    c.save(); const keep = new Path2D(); keep.rect(-400, -400, 400 - wipe, 800); keep.rect(wipe, -400, 400, 800); c.clip(keep);
    F(c, HOUS, 'd5'); F(c, rr(-175, -130, 350, 178, 50), 'd6'); F(c, rr(-170, -128, 340, 42, 44), 'd7'); F(c, rr(-178, 18, 356, 34, 30), 'd4');
    for (const x of [-120, 120]) F(c, rr(x - 1, -130, 2, 180, 0), 'd5');
    F(c, rr(-40, -112, 80, 26, 3), 'd3'); F(c, rr(-36, -108, 72, 18, 2), 'd2');
    for (let k = 0; k < 4; k++) F(c, rr(-30 + k * 16, -103, 10, 2, 0), 'y1');
    c.restore();
    if (wipe > 0 && wipe < 200) for (const sg of [-1, 1]) F(c, rr(sg * wipe - 1.2, -132, 2.4, 184, 0), 'c3', 0.9);   // the cut edge
  }
  // collimator box under the port
  if (o.coll !== false) {
    F(c, rr(-38, 52, 76, 70, 4), 'd5'); F(c, rr(-38, 52, 76, 5, 3), 'd7'); F(c, rr(-38, 114, 76, 8, 3), 'd3');
    if (cut >= 1 || o.collCut) {
      c.save();
      F(c, rr(-33, 57, 66, 60, 2), 'd1');
      F(c, rr(-33, 63, 66, 3, 0), 'd8');                             // aluminium filter
      const s = o.shut ?? 0, gap = lerp(30, 12, s);                  // lead shutter pairs
      for (const y of [84, 104]) { F(c, rr(-33, y, 33 - gap, 6, 1), 'd3'); F(c, rr(gap, y, 33 - gap, 6, 1), 'd3'); F(c, rr(-33, y, 33 - gap, 1.5, 0), 'd6'); F(c, rr(gap, y, 33 - gap, 1.5, 0), 'd6'); }
      F(c, rr(-30, 118, 60, 3, 0), 'd2');
      c.restore();
    } else {
      F(c, rr(-30, 66, 22, 14, 2), 'd3'); PIX.circ(c, 18, 74, 6, 'd3'); PIX.circ(c, 18, 74, 3, 'd6');
    }
  }
};
// screen position of a tube point under a camera
TUBE.S = (cam, x, y) => K.S(cam, x, y);
})();
