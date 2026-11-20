// S13 EXTERNAL PORTS (36–39 s): the catheter's outer end: the bifurcation. Amber runs down the main lumen into the drainage
// connector and on into the bag's tubing; cyan runs up the side arm to the balloon valve. The bag connects to the drainage
// port only. No syringe.
(() => {
const { W, H } = PIX;
const clamp = U.clamp;
SC['s13_ports'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k'); K.dith(c, 0, 0, W, H, 'n1', 0.5);
    const p = DEV.ports(c, { cx: 150, cy: 260, s: 5.2 }, { t: S.t, drain: MO.smooth(clamp((t - 0.3) / 0.4)), chan: MO.cubicOut(clamp((t - 0.9) / 0.8)) });
    CAP.part(c, t, { text: 'Drainage port', ax: p.drain[0] + 20, ay: p.drain[1], x: 186, y: 470, t0: 0.5, t1: 2.75, col: 'a2', lineCol: 'g7' });
    CAP.part(c, t, { text: 'Balloon valve', ax: p.valve[0], ay: p.valve[1] - 12, x: 190, y: 136, t0: 1.1, t1: 2.75, col: 'c4', lineCol: 'g7' });
  },
  cues: [[0, 'cut_soft', 0.5, 0], [0.5, 'tag', 0.6, 0.2], [1.1, 'tag', 0.6, 0.4], [0.3, 'id_click', 0.6, -0.2, 0], [0.9, 'id_click', 0.6, 0.3, 1]],
  xin: 0.3,
};
})();
