// S37 FOLLOW THE ARTERIES (144–148 s): a thick-slab maximum-intensity projection of the volume: each pixel the brightest
// value along its line, so the contrast-filled arteries of the circle of Willis show as continuous bright vessels (and
// bone still overlaps them at the skull base — a reason to check the other views). The radiologist's cursor follows the
// right internal carotid's end along the M1 segment to the bifurcation; the view pans with it.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const PX0 = 10, PY0 = 112, PW = 340, PH = 430, Z = 3.4;
const PATH = () => VES.byName.m1R.pts.map(p => WS.mipToImg(p[0], p[1]));
SC['s37_mip'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    const path = PATH(), q = MO.sineInOut(clamp((t - 0.5) / 2.6)), idx = Math.min(path.length - 1, Math.floor(q * (path.length - 1)));
    const cur = path[idx], c0 = path[0];
    const u0 = lerp(c0[0] - 4, cur[0] + 2, MO.smooth(clamp((t - 0.3) / 3.2))), v0 = lerp(c0[1] + 4, cur[1] + 4, MO.smooth(clamp((t - 0.3) / 3.2)));
    PIX.rect(c, PX0, PY0, PW, PH, 'k');
    const view = WS.image(c, WS.MIP, WS.MIPN, PX0, PY0, PW, PH, { z: Z, u0, v0, L: 330, W: 760 });
    WS.frame(c, PX0, PY0, PW, PH, 'MIP');
    // the traced part of the artery and the cursor
    for (let i = 1; i <= idx; i++) { const [ax, ay] = view.map(...path[i - 1]), [bx, by] = view.map(...path[i]); PIX.bline(c, ax, ay - 7, bx, by - 7, 'c3'); }
    if (t > 0.4) { const [sx, sy] = view.map(...cur); WS.cursor(c, sx + 2, sy + 2); }
    CAP.ctx(c, t, { text: 'ARTERİYALARI İZLƏMƏK', t0: 0.3, t1: 3.6 });
  },
  cues: [[0.3, 'type', 0.4], [0.5, 'trace', 0.8, -0.2, 2.6], [3.1, 'arrive', 0.6, -0.4]],
  xin: 0.3,
};
})();
