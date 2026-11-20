// S01 THE HOOK (0–4 s): the patient's cerebral artery network, seen from the front and a little above, muted red on deep
// navy over the faint outline of the brain. A small saccular bulge sits on the right MCA bifurcation (screen left). The
// arteries pulse with the heartbeat (one beat per second). 0–1 s the network; 1–2 s a controlled push toward the bulge;
// 2–4 s hold while the amber editorial ring draws round it and the question types on.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
// the opening view — S45 lands exactly here
const V0 = { yaw: -0.16, pitch: 0.32, roll: 0, s: 2.75, cx: W / 2, cy: 352, ox: 0, oy: 4, oz: -4 };
window.S01 = { V0 };
const viewAt = t => {
  const q = MO.smooth(clamp((t - 1.0) / 1.1));
  const a = VES.AN.cDraw;
  // push toward the bulge: zoom about the bulge's screen position, ending with it a little left of centre
  const s = lerp(V0.s, 4.6, q);
  return { ...V0, s, ox: lerp(V0.ox, a[0] * 0.8, q), oy: lerp(V0.oy, a[1] * 0.8, q), oz: lerp(V0.oz, a[2] * 0.8 + 3, q), cy: lerp(V0.cy, 360, q) };
};
// heartbeat: one beat per second from 0.05 s; a soft pressure wave runs out along the tree (≈ 90 mm/s on screen)
const pulseAt = t => (s, kind) => { let v = 0; for (let k = 0; k < 5; k++) { const tk = 0.05 + k; if (t < tk) break; const x = s - (t - tk) * 110; v += Math.exp(-(x * x) / 260) * (1 - (t - tk) * 0.4); } return clamp(v); };
window.drawNetwork = (c, t, v, o = {}) => {
  BRAIN.backdrop(c, v, { a: o.brainA ?? 1, t });
  const img = c.getImageData(0, 0, W, H);
  VES.render(img, { ...v, mode: o.mode || 'blood', pulse: o.pulse === false ? null : pulseAt(t), fill: o.fill, an: o.an || 0, show: o.show, fadeZ: o.fadeZ || [-78, -46] });
  c.putImageData(img, 0, 0);
};
SC['s01_hook'] = {
  draw(c, t, S) {
    const v = viewAt(t);
    drawNetwork(c, t, v);
    const a = VES.anScreen(v), ring = MO.cubicOut(clamp((t - 1.7) / 0.6));
    VES.ring(c, a.x, a.y, a.r + 5, ring, t);
    CAP.ctx(c, t, { text: 'BUNU NECƏ GÖRMƏK OLAR?', t0: 1.25, t1: 3.7 });
  },
  cues: [[0, 'open_hit', 1], [0.05, 'curious', 0.8, -0.2, 0], [0.55, 'curious', 0.7, 0.2, 1], [1.0, 'push_in', 0.6, 0, 1.1], [1.7, 'ring', 0.8, -0.3], [1.25, 'type', 0.4]],
};
})();
