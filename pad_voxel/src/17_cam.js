'use strict';
// ============================================================================
// 3D CAMERA PATHS. A key is {t, tg (target), eye (or off = eye - tg), up, fov,
// e (ease)}. Between keys the target moves (zoom-aware), the view direction
// turns along a great circle (an orbit), the distance changes on a log scale
// (smooth pull-backs over big scale changes), and the up vector turns too.
// ============================================================================
function slerp3(a, b, t) {
  const d = clamp(dot3(a, b), -1, 1), th = Math.acos(d);
  if (th < 1e-4) return norm3(add3(mul3(a, 1 - t), mul3(b, t)));
  const s = Math.sin(th); return add3(mul3(a, Math.sin((1 - t) * th) / s), mul3(b, Math.sin(t * th) / s));
}
function camPath(keys, t) {
  let i = 0; while (i + 1 < keys.length - 1 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const offA = a.off || sub3(a.eye, a.tg), offB = b.off || sub3(b.eye, b.tg);
  let f = b === a ? 0 : clamp((t - a.t) / (b.t - a.t), 0, 1); f = (b.e || K75)(f);
  if (t <= a.t) f = 0;
  const la = Math.hypot(...offA), lb = Math.hypot(...offB), l = Math.exp(lerp(Math.log(la), Math.log(lb), f));
  // zoom-aware target blend: on a big pull-back the near target stays put until the view is wide
  let g = f; if (Math.abs(Math.log(lb / la)) > 0.4) { g = clamp((1 / la - 1 / l) / (1 / la - 1 / lb), 0, 1); }
  const tg = lerp3(a.tg, b.tg, g), dir = slerp3(norm3(offA), norm3(offB), f), up = slerp3(norm3(a.up || [0, 1, 0]), norm3(b.up || [0, 1, 0]), f);
  const cam = camLook(add3(tg, mul3(dir, l)), tg, up, lerp(a.fov || 40, b.fov || 40, f));
  return cam;
}
// an orbit pose around a target: azimuth psi (from +z toward +x), elevation el, distance d (up = +y)
function orbitEye(tg, psi, el, d) { return add3(tg, [d * Math.cos(el) * Math.sin(psi), d * Math.sin(el), d * Math.cos(el) * Math.cos(psi)]); }
// cubic Hermite through [t, value, slope] keys (used for orbit angles whose speed must match at a seam)
function hermite(keys, t) {
  if (t <= keys[0][0]) return keys[0][1] + keys[0][2] * (t - keys[0][0]);
  for (let i = 0; i + 1 < keys.length; i++) {
    const [t0, v0, s0] = keys[i], [t1, v1, s1] = keys[i + 1];
    if (t <= t1) { const h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * s0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * s1; }
  }
  const k = keys[keys.length - 1]; return k[1] + k[2] * (t - k[0]);
}
// background: a calm vertical gradient in navy (drawn before the 3D pass), stepped so it stays pixel-flat
function skyBG(top, bot) { for (let y = 0; y < H; y++) { const k = y / (H - 1), c = mixc(top, bot, Math.round(k * 6) / 6); buf.fill(c, y * W, (y + 1) * W); } }
