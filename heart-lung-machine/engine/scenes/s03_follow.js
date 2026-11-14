// S03 FOLLOW THE TUBE (4–6 s): one guided move along the venous line, away from the operative field, down over the drapes
// and off the end of the table toward the machine. A brighter flow marker rides the line and stays near the middle of the
// frame: the camera follows it. A label rides with it: this line leads to the machine.
(() => {
SC['s03_follow'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t), d = WORLD.dAtY('venous', cam.y + 30 / cam.z) ?? WORLD.R.venous.S.at(-1);
    WORLD.scene(c, cam, S.t, { tubes: { venous: { marker: d } } });
    const [x, y] = WORLD.at(WORLD.R.venous, WORLD.R.venous.S, d), [ax, ay] = K.S(cam, x, y);
    CAP.part(c, t, { text: 'TO THE MACHINE', ax: ax + 8, ay, x: ax + 30, y: ay - 6, t0: 0.35, t1: 1.75, col: 'w', lineCol: 'g6' });
  },
  cues: [[0.0, 'sweep', 0.6, -0.3, 2.0], [0.0, 'machine_in', 0.5, -0.2, 2.0], [0.35, 'label', 0.4, 0.2]],
};
})();
