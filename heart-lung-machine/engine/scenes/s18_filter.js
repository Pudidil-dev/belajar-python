// S18 STEP 6 · FILTER AND BUBBLE DETECTOR (62–65 s): at the top of the oxygenator the integrated arterial filter lights (a
// pleated screen the blood passes on its way out); then the camera moves up the arterial line to the separate clamp-on
// bubble detector, which lights in turn. It watches the line; it takes nothing out. Blood keeps flowing; no event.
(() => {
const clamp = U.clamp;
SC['s18_filter'] = {
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), fh = Math.sin(Math.PI * clamp((t - 0.25) / 1.3)), dh = Math.sin(Math.PI * clamp((t - 1.7) / 1.2));
    SIDE.scene(c, cam, T, { machine: { filterHi: fh, detHi: dh, mark: { filt: fh, det: dh } } });
    SIDE.label(c, cam, t, { text: 'ARTERIAL FILTER', at: [40, 9], dx: -16, dy: 22, align: 'right', t0: 0.35, t1: 2.85, col: 'ab5' });
    SIDE.label(c, cam, t, { text: 'CATCHES DEBRIS', at: [52, 14], dx: 18, dy: 28, t0: 0.75, t1: 1.9, col: 'g8', dot: false });
    SIDE.label(c, cam, t, { text: 'BUBBLE DETECTOR', at: [59, -16], dx: 14, dy: -24, t0: 1.8, t1: 2.85, col: 'mt4' });
    SIDE.label(c, cam, t, { text: 'WATCHES FOR AIR', at: [45, -16], dx: -14, dy: 18, align: 'right', t0: 2.1, t1: 2.85, col: 'g8', dot: false });
    CAP.scene(c, t, { title: '6 · FILTER + BUBBLE DETECTOR', ctx: 'Debris caught; air watched.', t0: 0.1, t1: 2.92, acc: 'mt3' });
  },
  cues: [[0.25, 'tick_soft', 0.5, 0.2, 0], [0.35, 'label', 0.3, -0.2], [1.0, 'glide', 0.4, 0.3, 0.9], [1.75, 'tick_soft', 0.5, 0.4, 1], [1.8, 'label', 0.3, 0.4]],
};
})();
