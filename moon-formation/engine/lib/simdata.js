// SIMDATA — loads the two physics runs and samples them at any time.
//   impact (tools/sim_impact.py): 2D SPH of the giant impact, particle x, y and shock heat per snapshot
//   accrete (tools/sim_accrete.py): N-body debris → Moon, fragment x, y and size per snapshot, plus merge/fallback events
// Everything is returned in the film's world frame: Earth's centre at the origin, sim units (Earth radius RE ≈ 0.93),
// rotated by PSI so that Theia falls in from the top of the vertical frame (the physics is rotation-invariant).
(() => {
const PSI = -Math.PI / 2, CP = Math.cos(PSI), SPS = Math.sin(PSI);
const rot = (x, y) => [x * CP - y * SPS, x * SPS + y * CP];
const D = window.SIMD = { ready: false, rot };

async function load() {
  const get = (f, t) => fetch('data/' + f).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return t === 'json' ? r.json() : r.arrayBuffer(); });
  const [im, ib, am, ab] = await Promise.all([get('impact.json', 'json'), get('impact.bin'), get('accrete.json', 'json'), get('accrete.bin')]);
  D.imp = im; D.impBuf = ib; D.acc = am; D.accBuf = ab; D.RE = im.re;
  const n = im.n; D.impN = n; D.impMat = Int8Array.from(im.mat); D.impHeat0 = Float32Array.from(im.heat0); D.impTone = Float32Array.from(im.tone);
  D.impX = new Float32Array(n); D.impY = new Float32Array(n); D.impU = new Float32Array(n); D.impVX = new Float32Array(n); D.impVY = new Float32Array(n);
  const an = am.n; D.accN = an; D.accX = new Float32Array(an); D.accY = new Float32Array(an); D.accS = new Float32Array(an); D.accA = new Uint8Array(an);
  D.accTone = Float32Array.from(am.tone); D.accMat = Int8Array.from(am.mat);
  // approach path (Theia relative to Earth, point-mass), ascending in time
  D.approach = im.approach.slice().sort((a, b) => a[0] - b[0]);
  // events in film-world coordinates
  D.events = am.events.map(([t, type, x, y, m, small, big]) => { const [X, Y] = rot(x, y); return { t, type, x: X, y: Y, m, small, big }; });
  D.ready = true;
}
const bracket = (ts, t) => {                                   // index k with ts[k] <= t < ts[k+1]
  if (t <= ts[0]) return [0, 0];
  if (t >= ts[ts.length - 1]) return [ts.length - 1, 0];
  let lo = 0, hi = ts.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ts[mid] <= t) lo = mid; else hi = mid; }
  return [lo, (t - ts[lo]) / (ts[lo + 1] - ts[lo])];
};

// ---- impact: fills D.impX/impY/impU at sim time t; returns Earth's centre (sim frame) used for the shift ----
function impactAt(t) {
  const m = D.imp, n = D.impN, [k, f] = bracket(m.times, t), k2 = Math.min(k + 1, m.times.length - 1), st = m.stride;
  const A = k * st, B = k2 * st, qs = m.qs, buf = D.impBuf;
  const xa = new Int16Array(buf, A, n), ya = new Int16Array(buf, A + 2 * n, n), ua = new Uint8Array(buf, A + 4 * n, n);
  const xb = new Int16Array(buf, B, n), yb = new Int16Array(buf, B + 2 * n, n), ub = new Uint8Array(buf, B + 4 * n, n);
  const ea = m.earth[k], eb = m.earth[k2], ex = ea[0] + (eb[0] - ea[0]) * f, ey = ea[1] + (eb[1] - ea[1]) * f;
  const dt = k2 > k ? m.times[k2] - m.times[k] : 1, evx = (eb[0] - ea[0]) / dt, evy = (eb[1] - ea[1]) / dt;
  for (let i = 0; i < n; i++) {
    const x = (xa[i] + (xb[i] - xa[i]) * f) / qs - ex, y = (ya[i] + (yb[i] - ya[i]) * f) / qs - ey;
    D.impX[i] = x * CP - y * SPS; D.impY[i] = x * SPS + y * CP;
    const vx = (xb[i] - xa[i]) / qs / dt - evx, vy = (yb[i] - ya[i]) / qs / dt - evy;   // velocity relative to Earth
    D.impVX[i] = vx * CP - vy * SPS; D.impVY[i] = vx * SPS + vy * CP;
    const u = (ua[i] + (ub[i] - ua[i]) * f) / 255; D.impU[i] = u * u * 1.2;     // undo the sqrt packing
  }
  return [ex, ey];
}
// Theia's centre of mass relative to Earth during the SPH run (before contact), film-world frame
function theiaCM() {
  let sx = 0, sy = 0, c = 0; for (let i = 0; i < D.impN; i++) if (D.impMat[i] >= 2) { sx += D.impX[i]; sy += D.impY[i]; c++; }
  return [sx / c, sy / c];
}
// Theia relative to Earth on the point-mass approach (tau <= 0 is the approach clock, sim t = tau + tstart)
function approachAt(tau) {
  const a = D.approach, ts = a.map(v => v[0]); const [k, f] = bracket(ts, tau), k2 = Math.min(k + 1, a.length - 1);
  const x = a[k][1] + (a[k2][1] - a[k][1]) * f, y = a[k][2] + (a[k2][2] - a[k][2]) * f;
  return rot(x, y);
}

// ---- accretion: fills D.accX/accY (world), D.accS (radius in sim units), D.accA (1 alive, 0 gone) at time tB ----
// A fragment that disappears before the next snapshot slides toward whatever absorbed it, so nothing pops.
function accreteAt(tB) {
  const m = D.acc, n = D.accN, [k, f] = bracket(m.times, tB), k2 = Math.min(k + 1, m.times.length - 1), st = m.stride;
  const A = k * st, B = k2 * st, qs = m.qs, buf = D.accBuf;
  const xa = new Int16Array(buf, A, n), ya = new Int16Array(buf, A + 2 * n, n), sa = new Uint8Array(buf, A + 4 * n, n);
  const xb = new Int16Array(buf, B, n), yb = new Int16Array(buf, B + 2 * n, n), sb = new Uint8Array(buf, B + 4 * n, n);
  const into = m.into, RE = m.re, mmax = m.mmax;
  const rad = code => code ? 0.273 * RE * Math.cbrt(Math.pow((code - 1) / 254, 3) * mmax / m.mlunar) : 0;
  for (let i = 0; i < n; i++) {
    if (!sa[i]) { D.accA[i] = 0; continue; }
    let x, y, s;
    if (sb[i]) { x = (xa[i] + (xb[i] - xa[i]) * f) / qs; y = (ya[i] + (yb[i] - ya[i]) * f) / qs; s = rad(sa[i]) + (rad(sb[i]) - rad(sa[i])) * f; }
    else {                                                          // dies before k2: head to its absorber
      const j = into[i]; let tx, ty;
      if (j >= 0) { tx = xb[j] / qs; ty = yb[j] / qs; }
      else if (j === -2) { const r = Math.hypot(xa[i], ya[i]) / qs; tx = xa[i] / qs / r * m.rabs; ty = ya[i] / qs / r * m.rabs; }   // fallback: onto Earth's surface
      else { tx = xa[i] / qs * 1.2; ty = ya[i] / qs * 1.2; }
      x = xa[i] / qs + (tx - xa[i] / qs) * f; y = ya[i] / qs + (ty - ya[i] / qs) * f; s = rad(sa[i]) * (1 - 0.5 * f);
    }
    D.accX[i] = x * CP - y * SPS; D.accY[i] = x * SPS + y * CP; D.accS[i] = s; D.accA[i] = 1;
  }
}
// largest live body at tB (the proto-Moon): index, world position, radius
function biggest() {
  let bi = -1, bs = 0; for (let i = 0; i < D.accN; i++) if (D.accA[i] && D.accS[i] > bs) { bs = D.accS[i]; bi = i; }
  return bi < 0 ? null : { i: bi, x: D.accX[bi], y: D.accY[bi], r: bs };
}
Object.assign(D, { load, impactAt, theiaCM, approachAt, accreteAt, biggest, bracket });
})();
