// VIEW — the film camera and the sky.
// cam = { x, y (world centre, sim units), z (screen px per sim unit), r (roll, radians), sx, sy (shake, px) }.
// Earth sits at the world origin; everything else is placed in world units and projected with toS().
(() => {
const { W, H, P, BAYER } = PIX;
const h = U.hash;
function toS(cam, x, y) {
  const dx = x - cam.x, dy = y - cam.y, c = Math.cos(cam.r || 0), s = Math.sin(cam.r || 0);
  return [W / 2 + (dx * c + dy * s) * cam.z + (cam.sx || 0), H / 2 + (-dx * s + dy * c) * cam.z + (cam.sy || 0)];
}
// direction of the sun in the screen frame for a camera with roll r (the sun is to the world's left, a little toward us)
function sun(cam) { const c = Math.cos(cam.r || 0), s = Math.sin(cam.r || 0), lx = -0.78, ly = -0.22; return [lx * c + ly * s, -lx * s + ly * c, 0.58]; }
// log-space zoom interpolation
const zl = (a, b, t) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);

// Stars: three depth layers on a wrapping tile. Pans move near stars more; zooms spread them slightly (depth cue).
const STARS = []; for (let i = 0; i < 260; i++) STARS.push({ x: h(i, 1), y: h(i, 2), d: [0.012, 0.03, 0.06][i % 3], b: h(i, 3), tw: 1 + h(i, 4) * 3, ph: h(i, 5) * 6.28 });
function sky(c, cam, t, o = {}) {
  c.fillStyle = P.k; c.fillRect(0, 0, W, H);
  const img = c.getImageData(0, 0, W, H), d = img.data;
  // faint warm dust band across the sky (the young solar system was dusty), kept very dark and dithered
  const band = o.dust ?? 0.5, rr = (cam.r || 0);
  if (band > 0) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x - W / 2) * Math.cos(rr * 0.3) + (y - H / 2) * Math.sin(rr * 0.3), v = -(x - W / 2) * Math.sin(rr * 0.3 + 0.6) + (y - H / 2) * Math.cos(rr * 0.3 + 0.6);
    const n = SPH.fbm(u * 0.012 + cam.x * 0.02, v * 0.03 + cam.y * 0.02, 3.3, 3), a = Math.exp(-v * v / 9000) * (n - 0.35) * band;
    if (a > BAYER[(y & 3) << 2 | (x & 3)] + 0.5) { const i = (y * W + x) * 4, col = a > 0.75 ? PIX.hex(P.q1) : PIX.hex(P.q0); d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; }
  }
  c.putImageData(img, 0, 0);
  const zs = Math.log(Math.max(1e-3, cam.z) / 40);
  for (const s of STARS) {
    const k = 1 + zs * s.d * 1.6, px = ((s.x * W * 1.6 - (cam.x * cam.z * s.d * 0.08)) * k) % (W * 1.6), py = ((s.y * H * 1.3 - (cam.y * cam.z * s.d * 0.08)) * k) % (H * 1.3);
    const X = Math.round(((px % (W * 1.6)) + W * 1.6) % (W * 1.6) - W * 0.3), Y = Math.round(((py % (H * 1.3)) + H * 1.3) % (H * 1.3) - H * 0.15);
    if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
    const tw = 0.6 + 0.4 * Math.sin(t * s.tw + s.ph), lum = s.b * tw;
    c.fillStyle = lum > 0.8 ? P.w : lum > 0.5 ? P.q4 : lum > 0.25 ? P.q3 : P.q2; c.fillRect(X, Y, 1, 1);
    if (s.b > 0.93 && tw > 0.85) { c.fillStyle = P.q3; c.fillRect(X - 1, Y, 1, 1); c.fillRect(X + 1, Y, 1, 1); c.fillRect(X, Y - 1, 1, 1); c.fillRect(X, Y + 1, 1, 1); }
  }
}
// the young Sun as a big warm glow off the left edge (light source of every body)
function sunGlow(c, a = 1) { if (a <= 0) return; PIX.glow(c, -60, 150, 230, 'o1', 0.16 * a); PIX.glow(c, -40, 150, 120, 'y1', 0.12 * a); }
window.VIEW = { toS, sun, zl, sky, sunGlow };
})();
