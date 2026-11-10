// S03 STEADY GAZE (6–9 s): the same patient and instrument, now in side cutaway. The cover dissolves off the measuring
// head; inside, a small lamp lights the balloon slide, and an amber line runs from the slide through a lens, off the
// mirror, out of the window and into the eye, to the centre of the retina. When it arrives, a bracket closes round the
// pupil: the gaze is held on the instrument's axis. (The picture is a slide; the amber line is the visible light.)
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
// four corner brackets closing round the pupil (k: 0 open … 1 locked)
window.lockMark = (c, cam, k, col = 'a2') => {
  if (k <= 0) return;
  const [px, py] = K.S(cam, -1.2, 0), r = lerp(30, 14, MO.backOut(clamp(k), 1.6)) * cam.z / 5, L = Math.max(3, Math.round(cam.z));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const x = Math.round(px + sx * r), y = Math.round(py + sy * r); PIX.rect(c, sx < 0 ? x : x - L + 1, y, L, 1, col); PIX.rect(c, x, sy < 0 ? y : y - L + 1, 1, L, col); }
};
// the patient-view inset with its leader to the eye, as a fixed corner element of the cutaway scenes
window.viewInset = (c, cam, o = {}) => {
  const a = o.a ?? 1; if (a <= 0) return;
  const I = BAL.INSET, [ex, ey] = K.S(cam, -6, -9);
  if (a >= 1) { if (o.leader !== false) window.insetLeader(c, I, ex, ey, 1); BAL.inset(c, { ...I, blur: o.blur || 0, ring: o.ring }); return; }
  // leaving: it shrinks toward its own centre
  if (I.R * a > 7) BAL.inset(c, { x: I.x, y: I.y, R: I.R * a, blur: o.blur || 0, ring: o.ring });
};
SC['s03_gaze'] = {
  xin: 0.5,
  draw(c, t, S) {
    const T = S.t, cam = DIAG.track(T), F = DIAG.fronts(T);
    const cover = 1 - MO.smooth(clamp((t - 0.3) / 0.6)), lamp = MO.smooth(clamp((t - 0.75) / 0.25));
    DIAG.draw(c, cam, { t: T, cover, lamp, fix: F.fix, src: 0, eye: { acc: 0.8 } });
    window.lockMark(c, cam, clamp((t - 2.0) / 0.35));
    window.viewInset(c, cam, { ring: t > 2.0 && t < 2.3 ? 'a3' : 'q5' });
    CAP.ctx(c, t, { text: 'Steady gaze', t0: 0.5, t1: 2.7 });
  },
  cues: [[0.3, 'cover', 0.6, 0.2, 0.6], [0.5, 'type', 0.4], [0.75, 'lamp', 0.7, 0.2], [0.875, 'trace_amber', 0.8, 0.2, 1.125], [2.0, 'lock', 1.0, -0.2]],
};
})();
