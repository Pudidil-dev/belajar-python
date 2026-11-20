// PEOPLE — the clinical team, kept small and simple (codixel: no reference was given, so no detailed figures; no faces).
// Two surgeons stand at the left and right sides of the table: seen from above, only a shoulder, an arm in a teal gown and
// a gloved hand with an instrument enter the opening frame from each edge. The perfusionist stands at the console, seen
// from behind. Every part is a LIT form (lit from the top left), so the 2D shapes read as 3D bodies.
(() => {
const PEOPLE = window.PEOPLE = { NAME: 'PEOPLE' };
const R = n => window.RAMP[n];
const sm = (p, s = 1.5) => WORLD.smooth(p, s);
const tube = (c, cam, pts, w, ramp, o = {}) => LIT.tube(c, cam, sm(pts), w, R(ramp), o);
const blob = (c, cam, pts, ramp, o = {}) => { const b = HEART.blob(pts); return LIT.path(c, cam, b.path, b.box, R(ramp), o); };
const mirror = pts => pts.map(([x, y]) => [-x, y]);
// one surgeon. side −1: the viewer's left, +1: the right. o.hand = [dx, dy] small hand offset (world units)
PEOPLE.surgeon = (c, cam, side, o = {}) => {
  const M = side < 0 ? (p => p) : mirror, [hx, hy] = o.hand || [0, 0], yo = side < 0 ? 0 : 26, sh = 14;
  const P_ = pts => M(pts.map(([x, y]) => [x + sh, y + yo]));
  const H_ = pts => M(pts.map(([x, y]) => [x + sh + hx * (side < 0 ? 1 : -1), y + hy + yo]));
  blob(c, cam, P_([[-160, -14], [-146, 40], [-148, 112], [-166, 176], [-214, 182], [-236, 110], [-230, 20], [-206, -26]]), 'gw', { amb: 0.2, bias: -0.02 });
  const hp = M([[-196 + sh, -42 + yo]])[0], head = HEART.ell(hp[0], hp[1], 22, 24); LIT.path(c, cam, head.path, head.box, R('gw'), { amb: 0.24, bias: 0.06 });
  tube(c, cam, P_([[-158, 10], [-146, 42], [-134, 72]]), 24, 'gw', { amb: 0.2 });                // upper arm
  tube(c, cam, [...P_([[-134, 72]]), ...H_([[-120, 62], [-108, 50]])], 19, 'gw', { amb: 0.22, bias: 0.04 });   // forearm
  tube(c, cam, H_([[-112, 54], [-104, 46]]), 14, 'gl', { amb: 0.24, bias: -0.06 });              // glove cuff over the sleeve
  // the hand holds the instrument like a pen: a closed glove, the index finger along the shaft, the thumb beside it
  blob(c, cam, H_([[-106, 36], [-96, 32], [-89, 36], [-90, 46], [-99, 50], [-107, 45]]), 'gl', { amb: 0.22, bias: -0.06 });
  tube(c, cam, H_([[-93, 36], [-85, 32]]), 4, 'gl', { amb: 0.26 });                              // index finger
  tube(c, cam, H_([[-96, 44], [-88, 41]]), 4, 'gl', { amb: 0.22, bias: -0.06 });                 // thumb
  const tip = side < 0 ? [[-86, 33], [-62, 20]] : [[-86, 35], [-64, 30]];
  tube(c, cam, H_([tip[0], tip[1]]), 2.2, 'g', { amb: 0.3, edge: false });
  tube(c, cam, H_([[tip[0][0], tip[0][1] + 2.5], [tip[1][0] + 1, tip[1][1] + 1]]), 1.8, 'g', { amb: 0.3, edge: false });
};
// the perfusionist at the console, seen from behind and to the left, facing the machine
PEOPLE.perfusionist = (c, cam, o = {}) => {
  const { x, y } = WORLD.LY.perf, T = (pts, dx = 0, dy = 0) => pts.map(([a, b]) => [x + a + dx, y + b + dy]);
  tube(c, cam, T([[-8, 196], [-10, 300]]), 22, 'sc', { amb: 0.16, bias: -0.1 });                // legs (scrub trousers)
  tube(c, cam, T([[14, 196], [16, 300]]), 22, 'sc', { amb: 0.16, bias: -0.06 });
  for (const sx of [-10, 16]) { const sh = HEART.ell(x + sx + 2, y + 306, 13, 6); LIT.path(c, cam, sh.path, sh.box, R('g'), { amb: 0.2 }); }
  blob(c, cam, T([[-26, 40], [8, 32], [34, 44], [40, 110], [34, 200], [-24, 204], [-32, 120]]), 'sc', { amb: 0.2 });   // back
  tube(c, cam, T([[30, 52], [46, 104], [64, 150]]), 16, 'sc', { amb: 0.2, bias: 0.04 });         // the right arm toward the console
  tube(c, cam, T([[-24, 52], [-30, 112], [-26, 160]]), 15, 'sc', { amb: 0.18 });                 // left arm at the side
  blob(c, cam, T([[58, 146], [70, 144], [74, 156], [64, 162]]), 'sk', { amb: 0.26 });            // hand resting on the console edge
  blob(c, cam, T([[-24, 158], [-16, 162], [-20, 174], [-30, 170]]), 'sk', { amb: 0.24 });
  tube(c, cam, T([[2, 26], [4, 40]]), 13, 'sk', { amb: 0.24, bias: -0.04 });                      // neck
  const head = HEART.ell(x + 2, y + 12, 15, 17); LIT.path(c, cam, head.path, head.box, R('sc'), { amb: 0.26, bias: 0.12 });   // cap over the head
  blob(c, cam, T([[14, 6], [18, 18], [14, 28], [10, 22]]), 'sk', { amb: 0.24 });                  // ear and cheek edge (turned away)
};
PEOPLE.init = () => {};
})();
