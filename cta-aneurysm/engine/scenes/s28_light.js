// S28 GENERATE VISIBLE LIGHT (108–112 s): from the absorption point, green visible-light packets spread in all directions,
// bounce off the white reflector and travel down to the photodiode (inside the detector — nothing glows in the patient).
// The camera follows the light a short way down.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash, TAU = U.TAU;
const N = 26, V = 120;
const PK = []; for (let k = 0; k < N; k++) PK.push({ ang: h(k, 1) * TAU, t0: 0.2 + h(k, 2) * 0.4 });
// straight-line flight with reflections off the crystal walls until the bottom (the photodiode surface)
const fly = (p, age) => {
  const L = DET.L, { SX, SY } = window.SCINT;
  let x = SX, y = SY, dx = Math.cos(p.ang), dy = Math.sin(p.ang), d = age * V, pts = [[x, y]];
  for (let i = 0; i < 8 && d > 0; i++) {
    const tx = dx > 0 ? (L.x1 - 2 - x) / dx : dx < 0 ? (L.x0 + 2 - x) / dx : 1e9, ty = dy > 0 ? (L.sy1 - y) / dy : dy < 0 ? (L.sy0 + 2 - y) / dy : 1e9, s = Math.min(tx, ty, d);
    x += dx * s; y += dy * s; d -= s; pts.push([x, y]);
    if (s === ty && dy > 0) return { x, y, done: true, pts, ang: Math.atan2(dy, dx) };
    if (s === tx) dx = -dx; else if (s === ty) dy = -dy;
  }
  return { x, y, done: false, pts, ang: Math.atan2(dy, dx) };
};
window.LIGHT = { fly, PK };
const camY = t => lerp(0, 46, MO.sineInOut(clamp((t - 1.0) / 2.6)));
SC['s28_light'] = {
  draw(c, t, S) {
    const oy = -camY(t);
    c.save(); c.translate(0, oy);
    const { SX, SY } = window.SCINT;
    DET.cross(c, { glow: 0 });
    if (t < 2) FX.glowL(c, SX, SY + oy, 60, ['e0', 'e1', 'e2', 'e3'], Math.max(0, 0.4 - t * 0.2), 1.4);
    let landed = 0;
    for (const p of PK) {
      const age = t - p.t0; if (age < 0) continue;
      const f = fly(p, age);
      if (f.done) { landed++; const a2 = age - (BODY.len(f.pts) / V); if (a2 < 0.4) FX.flash(c, f.x, DET.L.sy1 + 2 + oy, 3, 'e3', 1 - a2 / 0.4); continue; }
      FX.ph(c, f.x, f.y + oy, f.ang, 5, 10, 2, 1, ['e0', 'e1', 'e2', 'e3']);
    }
    c.restore();
    CAP.ctx(c, t, { text: 'RENTGEN → GÖRÜNƏN İŞIQ', t0: 0.4, t1: 3.6 });
  },
  cues: () => { const q = [[0.2, 'sparkle', 0.8, 0, 0.6], [0.4, 'type', 0.4], [1.0, 'track', 0.4, 0, 2.6]]; for (let k = 0; k < 8; k++) q.push([1.3 + k * 0.28, 'light_land', 0.35, (k % 3 - 1) * 0.3, k]); return q; },
};
})();
