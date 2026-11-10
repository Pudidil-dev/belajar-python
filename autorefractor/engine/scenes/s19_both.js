// S19 CONNECT WHAT YOU SEE WITH WHAT THE MACHINE MEASURES (54–57 s): the whole cutaway once more, with both systems at
// work. First the visible one: the lit balloon slide, the amber line into the eye, and the view the patient has of it.
// Then the invisible one: the cyan beam going in, the magenta return coming back to the sensor, and what the instrument
// makes of it — the ring and its three numbers. The patient sees the balloon; the instrument measures with light the
// patient does not see.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const TILE = { x: 22, y: 438, n: 44 };
SC['s19_both'] = {
  xin: 0.5,
  draw(c, t, S) {
    const cam = DIAG.WIDE, Pth = OPT.paths(window.fogAt(99));
    const fa = clamp((t - 0.5) / 0.5), oa = clamp((t - 1.125) / 0.5), ba = clamp((t - 1.625) / 0.625);
    const uF = OPT.uAtD(Pth.fix[0], MO.sineInOut(fa) * OPT.len(Pth.fix[0])), uO = OPT.uAtD(Pth.out[1], MO.sineInOut(oa) * OPT.len(Pth.out[1])), uB = OPT.uAtD(Pth.back[0], MO.sineInOut(ba) * OPT.len(Pth.back[0]));
    DIAG.draw(c, cam, { t: S.t, lamp: MO.smooth(clamp((t - 0.25) / 0.25)), fog: window.fogAt(99), fix: fa > 0 ? uF : null, src: oa > 0 ? 1 : 0, out: oa > 0 ? uO : null, outOnly: [0, 2],
      back: ba > 0 ? uB : null, spots: MO.smooth(clamp((t - 2.25) / 0.2)) });
    // what the patient sees (top left) …
    const ia = MO.backOut(clamp((t - 0.875) / 0.35), 1.4);
    if (ia > 0) { const I = BAL.INSET, [ex, ey] = K.S(cam, -6, -9); if (ia >= 1) window.insetLeader(c, I, ex, ey, 1); BAL.inset(c, { x: I.x, y: I.y, R: I.R * Math.min(1.06, ia), blur: window.blurAt(99), ring: 'a2' }); }
    // … and what the instrument records (bottom left): the ring and the three numbers
    const da = clamp((t - 2.3) / 0.2);
    if (da > 0) {
      const [sx, sy] = K.S(cam, OPT.L.BS - 5.5, OPT.L.SENS + 1.4), x1 = TILE.x + 128, y1 = TILE.y + 22, L = Math.hypot(sx - x1, sy - y1), n = Math.floor(L / 4 * da);
      for (let k = 0; k < n; k++) PIX.rect(c, Math.round(lerp(sx, x1, k * 4 / L)), Math.round(lerp(sy, y1, k * 4 / L)), 2, 1, 'e2');
      if (da >= 1) {
        PIX.rect(c, TILE.x - 6, TILE.y - 6, 132, TILE.n + 12, 'k'); PIX.rect(c, TILE.x - 6, TILE.y - 6, 132, 1, 'e1'); PIX.rect(c, TILE.x - 6, TILE.y + TILE.n + 5, 132, 1, 'e1'); PIX.rect(c, TILE.x - 6, TILE.y - 6, 2, TILE.n + 12, 'e2');
        SEN.thumb(c, TILE.x, TILE.y, TILE.n, 0);
        CAP.note(c, t, { text: 'Example', x: TILE.x - 4, y: TILE.y - 18, t0: 2.5, t1: 3.2, col: 'ga', sc: 1 });
        RES.VALS.forEach(([lab, val, unit], k) => { if (t < 2.5 + k * 0.0625) return; if (window.NODATA) { PIX.rect(c, TILE.x + 52, TILE.y + 5 + k * 15, 60, 2, 'e1'); return; } PIX.text(c, lab, TILE.x + 52, TILE.y + 2 + k * 15, 'e2', { shadow: null }); if (!window.NODATA) PIX.text(c, val + (unit === '°' ? '°' : ''), TILE.x + 120, TILE.y + 2 + k * 15, 'w', { align: 'right', shadow: null }); });
      }
    }
    CAP.ctx(c, t, { text: 'Your *gaze*.\nIts *measurement*.', t0: 0.4, t1: 2.7, acc: 'a2', em: ['a2', 'c3'], y: 84 });
  },
  cues: [[0.25, 'lamp', 0.6, 0.2], [0.4, 'type', 0.4], [0.5, 'trace_amber', 0.7, 0.2, 0.5], [0.875, 'inset_in', 0.7, -0.5], [1.125, 'beam_run', 0.7, 0.3, 0.5], [1.625, 'return_run', 0.7, -0.2, 0.625], [2.25, 'sensor_hit', 0.8, 0.2], [2.5, 'value', 0.7, -0.4, 2]],
};
})();
