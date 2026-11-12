// S03 FOLLOW THE TUBE (4–6 s): one guided move along the venous line, away from the operative field, down over the drapes
// toward the machine. A brighter flow marker rides the line and stays near the middle of the frame: the camera follows it.
(() => {
SC['s03_follow'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t), d = WORLD.dAtY('venous', cam.y + 30 / cam.z) ?? WORLD.R.venous.S.at(-1);
    WORLD.scene(c, cam, S.t, { tubes: { venous: { marker: d } } });
  },
  cues: [[0.0, 'sweep', 0.6, -0.3, 2.0], [0.0, 'machine_in', 0.5, -0.2, 2.0]],
};
})();
