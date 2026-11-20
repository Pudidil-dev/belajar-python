// S09 ACCELERATION (32–36 s): the tube voltage switches on: a minus at the cathode, a plus at the anode, field arrows
// between them. The camera pulls back to the whole gap; the tracked electron (still ringed) leaves the cloud and
// accelerates across the vacuum to the anode, its energy bar climbing. It gets fast — far from light speed.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash;
const X0 = -18.2, XA = 0, TL = 1.2, TF = 1.9, ACC = 2 * (XA - X0) / (TF * TF);
const selAt = t => {
  const [x0, y0] = window.S08.elPos(window.S08.SEL, 4 + Math.min(t, TL));
  if (t < TL) return { x: x0, y: y0, s: 0 };
  const dt = t - TL, s = 0.5 * ACC * dt * dt, L = XA - x0;
  if (s >= L) return { x: XA, y: 0, s: L, hit: true, tHit: TL + Math.sqrt(2 * L / ACC), L };
  return { x: x0 + s, y: lerp(y0, 0, s / L), s, L };
};
const OTH = []; for (let k = 0; k < 22; k++) OTH.push({ tr: TL + 0.1 + k * 0.08, y: (h(k, 7) - 0.5) * 5, x: -19.5 + h(k, 8) * 1.4 });
const othAt = (e, t) => { if (t < e.tr) return [e.x, e.y + Math.sin(t * 3 + e.y) * 0.2]; const dt = t - e.tr, s = 0.5 * ACC * dt * dt; return s > -e.x ? null : [e.x + s, e.y * (1 - s / -e.x) * 0.8 + e.y * 0.2]; };
const camAt = t => { const a = window.S08.camAt(4), q = MO.cubicInOut(clamp(t / 1.3)); return K.zoomPath(a, { x: -9.6, y: 1.0, z: 15.5 }, q); };
window.S09 = { selAt, camAt };
SC['s09_accel'] = {
  draw(c, t, S) {
    const cam = camAt(t), on = MO.smooth(clamp((t - 0.5) / 0.3));
    K.cam(c, cam);
    TUBE.draw(c, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: 1, hv: on });
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (on > 0) {                                              // the field points from + to −; the electrons go the other way
      const [xa] = K.S(cam, -14.6, 0), [xb] = K.S(cam, -0.8, 0), ys = [-6.2, -3.7, -1.25, 1.25, 3.7, 6.2].map(y => K.S(cam, 0, y)[1]);
      FX.field(c, xa, xb, ys, -1, S.t, 'b2', on);
      const [mx, my] = K.S(cam, -15.2, -8.6), [px_, py] = K.S(cam, -1.6, -8.6);
      // big minus and plus (bars with a dark outline), the cathode's and the anode's signs
      const sign = (x, y, col, plus) => { const X = Math.round(x), Y = Math.round(y); PIX.rect(c, X - 15, Y - 5, 30, 10, 'k'); if (plus) PIX.rect(c, X - 5, Y - 15, 10, 30, 'k'); PIX.rect(c, X - 13, Y - 3, 26, 6, col); if (plus) PIX.rect(c, X - 3, Y - 13, 6, 26, col); };
      c.save(); c.globalAlpha = on; sign(mx, my, 'c3', false); sign(px_, py, 'o1', true); c.restore();
    }
    for (const e of OTH) { const p = othAt(e, t); if (!p) continue; const [sx, sy] = K.S(cam, ...p); FX.e(c, sx, sy, 2, 1); }
    const st = selAt(t), [sx, sy] = K.S(cam, st.x, st.y);
    if (!st.hit) {
      const tr = []; for (let j = 0; j < 12; j++) { const q = selAt(Math.max(0, t - j * 0.025)); tr.push(K.S(cam, q.x, q.y)); } FX.trail(c, tr, 1);
      FX.e(c, sx, sy, 3, 1, true); FX.ring(c, sx, sy, 10, 'c4', 1);
    } else { const age = t - st.tHit; if (age < 0.35) FX.flash(c, sx, sy, 8 * (1 - age / 0.35), 'w', 1 - age / 0.35); }
    // the kinetic-energy teaching bar (no number: it only rises while the field does work)
    const E = st.L ? clamp(st.s / st.L) : 0, ma = MO.smooth(clamp((t - 0.9) / 0.2));
    if (ma > 0) {
      c.save(); c.globalAlpha = ma; const x = 40, y = 548, w = 280;
      PIX.rect(c, x - 3, y - 3, w + 6, 16, 'k'); PIX.rect(c, x, y, w, 10, 'n2'); PIX.rect(c, x, y, Math.round(w * E), 10, 'c2'); PIX.rect(c, x, y, Math.round(w * E), 2, 'c4');
      for (let k = 1; k < 8; k++) PIX.rect(c, x + Math.round(w * k / 8), y + 7, 1, 3, 'n3');
      PIX.text(c, 'E', x - 14, y + 1, 'c3', { shadow: null });
      c.restore();
    }
    CAP.ctx(c, t, { text: 'GƏRGİNLİK → SÜRƏT', t0: 0.55, t1: 3.6 });
  },
  cues: () => [[0, 'pull_back', 0.6, 0, 1.3], [0.5, 'hv_on', 1.0, 0], [0.55, 'type', 0.4], [TL, 'accel_rise', 1.0, 0, TF], [TL + TF, 'hit_tick', 0.8, 0.3]],
};
})();
