// S09 X-RAY BEAM (38–42 s): side cutaway under the focal spot. Photons (all energies) stream down through the window;
// the aluminium filter absorbs most of the weak, low-energy ones (they would only be absorbed in the skin and add dose);
// the lead shutters close in and stop every photon that would miss the hand. A controlled beam heads down.
(() => {
const { W, H } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const SPD = 62;                                         // photon speed on screen scale (mm/s, film time)
const camAt = t => {
  if (t < 0.3) return { x: 0, y: 22, z: 3.0 };
  if (t < 3.4) { const p = MO.sineInOut((t - 0.3) / 3.1); return { x: 0, y: lerp(22, 92, p), z: K.zl(3.0, 2.45, p) }; }
  const p = MO.cubicIn(clamp((t - 3.4) / 0.6)); return { x: 0, y: lerp(92, 250, p), z: K.zl(2.45, 2.2, p) };
};
window.S09 = { camAt };
const shutAt = t => MO.cubicInOut(clamp((t - 1.2) / 0.6));
const gapAt = t => lerp(30, 12, shutAt(t));
const T_AL = E => Math.exp(-Math.pow(17 / E, 3));
// photons: energy sampled from the tube spectrum (bremsstrahlung number spectrum with inherent filtration, plus K lines)
const PHOT = [];
{
  const cdf = []; let acc = 0;
  for (let E = 6; E <= 79; E++) { acc += (80 - E) / E * Math.exp(-Math.pow(9 / E, 3)); cdf.push([E, acc]); }
  for (let k = 0; k < 190; k++) {
    const u = h(k, 1) * acc, E = h(k, 5) < 0.06 ? (h(k, 6) < 0.7 ? 59 : 67) : cdf.find(q => q[1] >= u)[0];
    const ts = -2.2 + k * 0.032, th = Math.PI / 2 + (h(k, 2) - 0.5) * 1.15;
    // fate: absorbed in the aluminium filter, stopped by a shutter, or through
    const yF = 64.5, tF = ts + yF / Math.sin(th) / SPD, xF = Math.cos(th) / Math.sin(th) * yF;
    let stop = null;
    const yP = 46, xP = Math.cos(th) / Math.sin(th) * yP;                  // the lead-lined housing only lets the port through
    if (Math.abs(xP) > 14) stop = { t: ts + yP / Math.sin(th) / SPD, y: yP, why: 'pb' };
    else if (h(k, 3) > T_AL(E)) stop = { t: tF, y: yF, why: 'al' };
    else for (const y of [87, 107]) { const ty = ts + y / Math.sin(th) / SPD, x = Math.cos(th) / Math.sin(th) * y; if (Math.abs(x) > gapAt(ty) - 1) { stop = { t: ty, y, why: 'pb' }; break; } }
    PHOT.push({ ts, th, E, stop, xF });
  }
}
SC['s09_beam'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    K.cam(c, cam);
    TUBE.draw(c, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: 1, hv: 1, heat: 0.9, coll: true, shut: shutAt(t) });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the electron beam still hitting the focal spot
    { const [x0, y0] = K.S(cam, -15, 0), [x1, y1] = K.S(cam, 0, 0); for (let k = 0; k < 10; k++) { const q = K.wrap(S.t * 2.6 + k / 10, 1); FX.e(c, lerp(x0, x1, q * q), lerp(y0, y1, q * q), 1, 1); } }
    // photons
    for (const p of PHOT) {
      const age = t - p.ts; if (age < 0) continue;
      let d = age * SPD; const dyStop = p.stop ? p.stop.y / Math.sin(p.th) : 1e9;
      if (p.stop && d > dyStop) {
        const a2 = t - p.stop.t;
        if (a2 < 0.22) { const [sx, sy] = K.S(cam, Math.cos(p.th) * dyStop, Math.sin(p.th) * dyStop); FX.flash(c, sx, sy, 3 * (1 - a2 / 0.22), p.stop.why === 'al' ? 'p3' : 'd8', 1 - a2 / 0.22); }
        continue;
      }
      const [sx, sy] = K.S(cam, Math.cos(p.th) * d, Math.sin(p.th) * d);
      if (sy > H + 20) continue;
      const lam = FX.lamFor(p.E) * 0.95; FX.ph(c, sx, sy, p.th, lam, lam * 2.5, 2.5, clamp(age / 0.06));
    }
    // labels
    const L = (x, y) => K.S(cam, x, y);
    { const [ax, ay] = L(13, 30); CAP.note(c, t, { ax, ay, x: 196, y: Math.round(ay) - 16, text: 'WINDOW', t0: 0.3, t1: 1.6, col: 'd9', box: true }); }
    { const [ax, ay] = L(30, 64.5); CAP.note(c, t, { ax, ay, x: 256, y: Math.round(ay) - 26, text: 'ALUMINIUM FILTER', t0: 0.75, t1: 3.0, align: 'right', col: 'd9', box: true }); }
    { const [ax, ay] = L(30, 87); CAP.note(c, t, { ax, ay, x: 256, y: Math.round(ay) + 22, text: 'LEAD SHUTTERS', t0: 1.25, t1: 3.2, align: 'right', col: 'd9', box: true }); }
    CAP.note(c, t, { x: 14, y: 300 - 22, text: 'weak X-rays stopped: less dose', t0: 0.95, t1: 2.5, col: 'p3', box: true });
    CAP.note(c, t, { x: 14, y: 289, text: 'beam trimmed to fit the hand', t0: 2.5, t1: 3.6, col: 'w', box: true });
    CAP.note(c, t, { x: 135, y: 384 - 12, text: 'X-rays are invisible: violet is for illustration', t0: 2.6, t1: 3.8, col: 'd8', align: 'center', box: true });
    HUD.spec(c, 144, 82, { f: 0.95, events: [], t: S.t, kpk: 1, filt: MO.smooth(clamp((t - 0.7) / 0.8)), a: 1 - clamp((t - 2.9) / 0.25) });
    CAP.scene(c, t, { title: 'X-RAY BEAM', ctx: 'Filtered and shaped before it leaves.', t0: 0.1, t1: 3.92 });
  },
  cues: () => {
    const q = [[0, 'tone_soft', 0.7, 0, 4], [0.1, 'type', 0.5], [0.3, 'blip', 0.4, 0.5], [0.75, 'blip', 0.4, 0.5], [1.2, 'shutter', 1, -0.5], [1.5, 'shutter', 0.9, 0.5], [1.25, 'blip', 0.4, 0.5], [2.6, 'blip', 0.3, 0]];
    let n = 0;
    for (const p of PHOT) if (p.stop && p.stop.t > 0 && p.stop.t < 4 && n < 14 && p.stop.why === 'al') { const tq = Math.round(p.stop.t * 8) / 8; if (!q.some(x => x[1] === 'absorb_tick' && x[0] === tq)) { q.push([tq, 'absorb_tick', 0.3, (h(n, 9) - 0.5), n]); n++; } }
    q.push([3.4, 'drop_down', 0.7, 0, 0.6]);
    return q;
  },
};
})();
