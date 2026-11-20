// S20 RETURN TO THE FIXATION VIEW (57–60 s): the patient and the instrument again, as in S02, with the balloon view as an
// inset. The inset grows from the instrument's window toward us while the room goes dark, until the round aperture
// stands where S01 left it: we are back inside the patient's view.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
SC['s20_return'] = {
  xin: 0.5,
  draw(c, t, S) {
    const q = MO.k75(clamp((t - 1.0) / 1.9)), cam0 = window.EXTCAM, cam = { ...cam0, s: K.zl(cam0.s, 1.25, MO.sineInOut(clamp((t - 0.4) / 2.6))) };
    const light = 1 - MO.smooth(clamp((t - 1.2) / 1.5));
    window.drawExterior(c, t, cam, { light });
    const I = BAL.INSET, a = BAL.state(1), [ex, ey] = EXT.proj(cam, -4, 0, 44);
    const cur = { x: lerp(I.x, a.cx, q), y: lerp(I.y, a.cy, q), R: lerp(I.R, a.R, q) };
    if (q < 0.25) window.insetLeader(c, cur, ex, ey, 1 - q / 0.25);
    const blur = window.blurAt(99) * (1 - MO.smooth(clamp((t - 0.6) / 1.2)));
    if (q <= 0) BAL.inset(c, { ...cur, blur });
    else { BAL.view(c, { cx: cur.x, cy: cur.y, R: cur.R, s: a.s * cur.R / a.R, blur, dark: 'k', outside: q > 0.7 }); const ra = 1 - q; FX.ring(c, cur.x, cur.y, cur.R + 1, 'q5', ra); FX.ring(c, cur.x, cur.y, cur.R + 2, 'q5', ra); }
  },
  cues: [[0.125, 'settle', 0.4, 0.2], [1.0, 'whoosh_in', 0.6, 0, 1.9], [1.0, 'motif_back', 1.0, 0]],
};
})();
