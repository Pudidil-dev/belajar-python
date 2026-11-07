// GUN — the cold field-emission source up close. A tungsten wire tip, spot-welded to a hairpin and etched to a point
// with an apex radius of about 100 nm; the extraction field crowds onto that point (~5 V/nm). At the apex surface the
// metal's electrons sit below a barrier ~4.5 eV high (the work function). The field tilts the vacuum side of the
// barrier, so at the Fermi level it is only about 1 nm thick, and an electron's wave — oscillating inside the metal —
// decays through it and leaks out the other side: tunnelling. Only past the barrier does the film draw an electron as
// a cyan particle. Drawing frame: apex at the origin, tip pointing along +y (down the column); `rot` rolls the view
// (−π/2 points the tip to the right, so the barrier diagram reads left → right).
(() => {
const { P, W, H } = PIX;
const GUN = window.GUN = {};
const clamp = U.clamp;
const R = (c, x, y, w, hh, col) => { c.fillStyle = P[col] || col; c.fillRect(x, y, w, hh); };
const APEX = 0.1;                                                          // apex radius, µm
// the tip profile: radius (µm) at height y (µm above the apex, y < 0): a rounded apex on a 7° cone, then the wire
GUN.radius = yu => {
  const d = -yu; if (d < 0) return 0;
  if (d < APEX) return Math.sqrt(Math.max(0, APEX * APEX - (APEX - d) ** 2));
  return Math.min(62.5, APEX + (d - APEX) * Math.tan(7 * Math.PI / 180) + 0.0002 * (d - APEX) ** 2);
};
// draw the tip and hairpin for a field of view fov (m) centred on the apex; units: µm
GUN.tipView = (c, fov, rot, t, o = {}) => {
  const s = W / (fov * 1e6);                                               // px per µm
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  R(c, 0, 0, W, H, 'k');
  c.translate(W / 2 + (o.ox || 0), H / 2 + (o.oy || 0)); c.rotate(rot); c.scale(s, s);
  // field lines (orange) converging on the apex, from the anode far below
  if ((o.field ?? 0) > 0) {
    c.save(); c.globalAlpha = o.field; c.strokeStyle = P.u2; c.lineWidth = 1 / s;
    for (let k = -7; k <= 7; k++) {
      const a = k / 7 * 1.05, r0 = APEX * 1.02;
      c.beginPath(); c.moveTo(Math.sin(a) * r0, -APEX + Math.cos(a) * r0 + APEX);
      // leave the surface along its normal, then bend down toward the anode
      const L = fov * 1e6 * 0.9;
      c.bezierCurveTo(Math.sin(a) * L * 0.25, APEX + Math.cos(a) * L * 0.25, Math.sin(a) * L * 0.45, L * 0.55, Math.sin(a) * L * 0.5 + k * L * 0.03, L * 1.2);
      c.stroke();
    }
    c.restore();
  }
  // hairpin filament (two 125 µm wires meeting above the tip wire)
  const pin = (sx) => { c.beginPath(); c.moveTo(0, -560); c.lineTo(sx * 1600, -2600); c.lineWidth = 125; c.strokeStyle = P.g6; c.lineCap = 'round'; c.stroke();
    c.lineWidth = 60; c.strokeStyle = P.g8; c.beginPath(); c.moveTo(-15, -580); c.lineTo(sx * 1600 - 15, -2620); c.stroke(); };
  pin(-1); pin(1);
  // the tip: profile polygon
  const pts = [];
  for (let k = 0; k <= 80; k++) { const yu = -Math.pow(k / 80, 2.2) * 620; pts.push([GUN.radius(yu), yu]); }
  c.beginPath(); c.moveTo(0, 0); for (const [x, y] of pts) c.lineTo(x, y); for (let i = pts.length - 1; i >= 0; i--) c.lineTo(-pts[i][0], pts[i][1]); c.closePath();
  c.fillStyle = P.g6; c.fill();
  // rim light on one flank, a darker band on the other
  c.save(); c.clip(); c.fillStyle = P.g8; c.beginPath(); for (const [x, y] of pts) c.lineTo(-x * 0.55, y); for (let i = pts.length - 1; i >= 0; i--) c.lineTo(-pts[i][0], pts[i][1]); c.fill();
  c.fillStyle = P.g4; c.beginPath(); for (const [x, y] of pts) c.lineTo(x * 0.6, y); for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1]); c.fill(); c.restore();
  c.restore();
};
// the apex surface at the atomic scale (fov ≲ 30 nm): bcc tungsten, 0.316 nm cell; metal above (−y), vacuum below
GUN.surface = (c, fov, rot, t, o = {}) => {
  const s = W / (fov * 1e9);                                               // px per nm
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  R(c, 0, 0, W, H, 'k');
  c.translate(W / 2 + (o.ox || 0), H / 2 + (o.oy || 0)); c.rotate(rot);
  const Rnm = APEX * 1000, a = 0.316, k = clamp((s - 6) / 10);
  // the metal: a curved body (radius 100 nm) filled dark, atoms appearing as the scale allows
  c.fillStyle = P.n2; c.beginPath(); c.arc(0, -Rnm * s, Rnm * s, 0, U.TAU); c.fill();
  c.fillStyle = P.n1; c.beginPath(); c.arc(0, -Rnm * s, Rnm * s - Math.max(2, 0.25 * s), 0, U.TAU); c.fill();
  if (k > 0) {
    const n = Math.ceil(fov * 1e9 / a / 1.2) + 2;
    for (let j = 0; j <= n; j++) for (let i = -n; i <= n; i++) for (const off of [0, 0.5]) {
      const x = (i + off) * a, y = -(j + off) * a - 0.05;
      if (Math.hypot(x, y + Rnm) > Rnm) continue;
      const sx = x * s, sy = y * s; if (Math.abs(sx) > W || Math.abs(sy) > H) continue;
      const m = c.getTransform(), X = m.a * sx + m.c * sy + m.e, Y = m.b * sx + m.d * sy + m.f;
      FX.glowL(c, X, Y, 0.16 * s, ['n3', 'n4', 'g6', 'g8'], 0.95 * k, 1.1);
    }
  }
  c.restore();
};
// ---------- the barrier diagram (screen px, drawn for the rolled view: metal left, vacuum right) ----------
// xs = surface x on screen, s = px per nm, F = field 0..1 (1 = 5 V/nm), w = wave amount, t = time
GUN.barrier = (c, xs, s, F, w, t, o = {}) => {
  const yF = o.yF ?? 280, eV = o.eV ?? 21, phi = 4.5, yV = yF - phi * eV;   // Fermi level, vacuum level
  const xEnd = W - 6, xTurn = xs + (F > 0.02 ? Math.min(phi / (5 * F), 40) * s : 1e4);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  // occupied states in the metal (up to the Fermi level)
  for (let y = Math.round(yF); y < Math.min(H, yF + 120); y++) for (let x = 0; x < Math.round(xs); x++) if ((0.55 - (y - yF) / 400) > K.BAY(x, y)) R(c, x, y, 1, 1, ((x + y) & 1) ? 'c0' : 'c1');
  PIX.bline(c, 0, yF, xs, yF, 'c2');
  // potential energy outside: the vacuum level tilted down by the field (with a rounded image-charge corner)
  let prev = null;
  for (let x = Math.round(xs); x <= xEnd; x++) {
    const d = (x - xs) / s, V = phi - 5 * F * d - 0.36 / Math.max(0.12, d + 0.12) * 0.25, y = yF - V * eV;
    if (prev) PIX.bline(c, prev[0], prev[1], x, y, 'w'); prev = [x, y];
  }
  PIX.bline(c, xs, yF + 24, xs, yV + 4, 'w');
  // Fermi level continued as a dashed line through the barrier
  PIX.bline(c, xs, yF, xEnd, yF, 'g5', 1);
  // the electron wave at the Fermi level: oscillating inside, decaying through the barrier, leaking out
  if (w > 0) {
    const A = 15 * w, kIn = U.TAU / (0.42 * s), ph = t * 9;
    const kap = 3.6;                                                        // decay per nm in the barrier (drawn, not to scale)
    const out = F > 0.05 ? Math.exp(-kap * (xTurn - xs) / s) : 0;
    let pv = null;
    for (let x = 0; x <= xEnd; x++) {
      let v;
      if (x < xs) v = Math.cos(kIn * (x - xs) - ph);
      else if (x < xTurn) v = Math.cos(-ph) * Math.exp(-kap * (x - xs) / s);
      else { const d = (x - xTurn) / s, kk = kIn * (1 + d * 1.2); v = out * 2.4 * Math.cos(-ph + kk * (x - xTurn) * 0.5); }
      const y = yF - v * A;
      if (pv) PIX.bline(c, pv[0], pv[1], x, y, x < xs ? 'c4' : x < xTurn ? 'c3' : 'c3');
      pv = [x, y];
    }
  }
  c.restore();
  return { yF, yV, xTurn };
};
})();
