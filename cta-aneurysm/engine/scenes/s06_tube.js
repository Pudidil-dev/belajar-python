// S06 THE VACUUM TUBE (20–24 s): the X-ray tube insert in side cutaway: the cathode cup with its tungsten filament on the
// left (−), the angled rotating tungsten anode on the right (+), the evacuated glass envelope between them inside the
// oil-filled housing. The anode disc spins; the cathode cup and filament get a cyan outline. Camera locked. A small
// context thumbnail (the gantry ring, the tube marked) keeps the viewer oriented after the push in from S05.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const CAM = { x: -14, y: -34, z: 1.75 };
window.S06 = { CAM };
// the gantry thumbnail: a ring, the head, the tube at the top highlighted
window.gantryThumb = (c, x, y, r, a, t) => {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  PIX.circ(c, x, y, r + 4, 'k'); PIX.circ(c, x, y, r, 'q4'); PIX.circ(c, x, y, r - 4, 'q2'); PIX.circ(c, x, y, r * 0.42, 'k');
  PIX.circ(c, x, y + 1, r * 0.2, 's2');
  PIX.rect(c, x - 5, y - r + 2, 10, 7, Math.floor(t * 4) % 2 ? 'c3' : 'y3');
  PIX.rect(c, x - 14, y + r * 0.55, 28, 3, 'e2');
  c.restore();
};
SC['s06_tube'] = {
  draw(c, t, S) {
    K.cam(c, CAM);
    TUBE.draw(c, { z: CAM.z, t: S.t, cut: 1, spin: 1.2, fil: 0.3, hv: 0 });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the cathode outline: a dashed cyan box round the focusing cup and filament, drawn on at 1.4 s
    const o = MO.cubicOut(clamp((t - 1.4) / 0.5));
    if (o > 0) {
      const [x0, y0] = K.S(CAM, -30, -10), [x1, y1] = K.S(CAM, -13, 10), per = 2 * ((x1 - x0) + (y1 - y0)), n = Math.round(per * o);
      for (let k = 0; k < n; k += 2) { let p = k, x, y; const w = x1 - x0, hh = y1 - y0;
        if (p < w) { x = x0 + p; y = y0; } else if ((p -= w) < hh) { x = x1; y = y0 + p; } else if ((p -= hh) < w) { x = x1 - p; y = y1; } else { p -= w; x = x0; y = y1 - p; }
        PIX.rect(c, Math.round(x), Math.round(y), 1, 1, 'c3'); }
    }
    const [kx, ky] = K.S(CAM, -22, 12), [ax, ay] = K.S(CAM, 8, 28);
    CAP.part(c, t, { text: 'KATOD (−)', ax: kx, ay: ky, x: 22, y: 470, t0: 0.8, t1: 3.6, col: 'c3', lineCol: 'g7' });
    CAP.part(c, t, { text: 'ANOD (+)', ax: ax, ay: ay, x: 338, y: 520, t0: 1.6, t1: 3.6, col: 'o2', lineCol: 'g7', align: 'right' });
    gantryThumb(c, 304, 150, 22, MO.smooth(clamp((t - 0.2) / 0.4)) * (1 - MO.smooth(clamp((t - 3.4) / 0.3))), S.t);
    CAP.ctx(c, t, { text: 'VAKUUM BORUSU', t0: 0.3, t1: 3.6 });
  },
  cues: [[0, 'tube_open', 0.8, 0, 0.6], [0.2, 'anode_spin', 0.6, 0.3, 3.8], [0.3, 'type', 0.4], [0.8, 'tag', 0.5, -0.4], [1.4, 'outline', 0.6, -0.4, 0.5], [1.6, 'tag', 0.5, 0.4]],
  xin: 0.3,
};
})();
