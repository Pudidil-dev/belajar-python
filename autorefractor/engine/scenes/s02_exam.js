// S02 REVEAL THE EXAMINATION (3–6 s): the round aperture of S01 shrinks into a small inset (the patient's view) while the
// room lights up round it: the patient from behind and to the side, chin on the chinrest, forehead on the band, and the
// ivory autorefractor. The measuring head slides a little and settles in line with the eye; a thin amber leader ties the
// inset to the eye. The camera backs off a short way and stops close enough that the eye stays a clear subject.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const CAM1 = { yaw: 0.46, pitch: 0.2, s: 0.78, cx: 180, cy: 414, tx: 62, ty: -30, tz: 32 };
window.EXTCAM = CAM1;
const camAt = t => { const q = MO.cubicOut(clamp(t / 2.2)); return { ...CAM1, s: K.zl(1.5, CAM1.s, q) }; };
const unitAt = t => { const q = MO.backOut(clamp((t - 0.875) / 0.875), 1.4); return [lerp(14, 0, q), lerp(-16, 0, q), lerp(-12, 0, q)]; };
// the inset: from S01's last aperture to its corner position
const insetAt = t => { const q = MO.k75(clamp(t / 1.25)), a = BAL.state(1), I = BAL.INSET; return { x: lerp(a.cx, I.x, q), y: lerp(a.cy, I.y, q), R: lerp(a.R, I.R, q) }; };
window.S02 = { camAt, insetAt };
window.drawExterior = (c, t, cam, o = {}) => {
  EXT.room(c, cam, o.light ?? 1);
  EXT.render(c, cam, { unit: o.unit, light: o.light ?? 1, a: U.clamp((o.light ?? 1) * 1.6) });
};
// the leader from the inset to the eye (amber dots)
window.insetLeader = (c, I, ex, ey, a = 1) => {
  if (a <= 0) return;
  const dx = ex - I.x, dy = ey - I.y, L = Math.hypot(dx, dy), n = Math.floor((L - I.R - 6) / 4);
  for (let k = 0; k < n * a; k++) { const d = I.R + 6 + k * 4; PIX.rect(c, Math.round(I.x + dx / L * d), Math.round(I.y + dy / L * d), 2, 1, 'a2'); }
};
SC['s02_exam'] = {
  draw(c, t, S) {
    const cam = camAt(t), light = MO.smooth(clamp((t - 0.05) / 0.8));
    window.drawExterior(c, t, cam, { light, unit: unitAt(t) });
    const I = insetAt(t), [ex, ey] = EXT.proj(cam, -4, 0, 44);
    window.insetLeader(c, I, ex, ey, MO.smooth(clamp((t - 1.25) / 0.5)));
    if (t < 1.25) { const st = BAL.state(1); BAL.view(c, { cx: I.x, cy: I.y, R: I.R, s: st.s * I.R / st.R, dark: 'k', outside: t < 0.2 }); PIX.circ(c, I.x, I.y, 0, 'k'); FX.ring(c, I.x, I.y, I.R + 1, 'q5', MO.smooth(clamp(t / 1.25))); FX.ring(c, I.x, I.y, I.R + 2, 'q5', MO.smooth(clamp(t / 1.25))); }
    else BAL.inset(c, I);
    CAP.ctx(c, t, { text: 'An eye test', t0: 0.5, t1: 2.7 });
  },
  cues: [[0, 'whoosh_out', 0.6, 0, 1.25], [0.5, 'type', 0.4], [0.875, 'motor', 0.8, 0.3, 0.875], [1.25, 'dock', 0.6, -0.5], [1.75, 'settle', 0.5, 0.3]],
};
})();
