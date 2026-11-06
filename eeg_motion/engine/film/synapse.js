// ============================================================================
// SYNAPSE — one excitatory synapse on a dendritic spine (units: nanometres,
// educational model). The presynaptic bouton (top) holds vesicles of
// neurotransmitter (warm yellow); one vesicle fuses and releases transmitter
// into the cleft; molecules bind receptor channels in the postsynaptic membrane
// (teal); the channels open and positive ions (cyan) flow into the spine —
// a transmembrane current that shifts the membrane potential.
// ============================================================================
(() => {
  const TAU = Math.PI * 2;
  const SY = window.SYN = {};
  const { EV } = TL;
  const CLEFT = { y0: -10, y1: 10 };                   // the cleft between the two membranes (20 nm), centre at y = 0
  const BOUTON = { x: 0, y: -350, rx: 420, ry: 320 };  // presynaptic terminal (bottom membrane at y = -30)
  const SPINE = { x: 0, y: 350, rx: 430, ry: 320 };    // postsynaptic spine head (top membrane at y = +30); the cleft is drawn wider than life
  const RECEPT = [-240, -140, -40, 60, 160, 260];      // receptor channels along the postsynaptic membrane
  SY.RECEPT = RECEPT;
  const rnd = U.rng(31);
  const VES = []; for (let i = 0; i < 16; i++) { const a = rnd() * TAU, r = 60 + rnd() * 240; VES.push({ x: Math.cos(a) * r * 1.1, y: -360 + Math.sin(a) * r * 0.7 - 20, r: 20 + rnd() * 3, seed: i }); }
  const FUSE = { x: -20, y: -78, r: 22 };              // the vesicle that docks and fuses
  // transmitter molecules: out of the fusion pore, across the cleft, onto the receptors (bind)
  const MOL = []; for (let i = 0; i < 30; i++) MOL.push({ tx: RECEPT[i % RECEPT.length] + (rnd() - 0.5) * 16, ang: rnd() * TAU, d: 30 + rnd() * 60, w: rnd() });
  function membrane(c, cx, cy, rx, ry, top, z, col) {
    // a lipid bilayer drawn as two rows of heads along an ellipse arc (only the facing half)
    const a0 = top ? 0.12 * Math.PI : 1.12 * Math.PI, a1 = top ? 0.88 * Math.PI : 1.88 * Math.PI, step = 13 / Math.max(rx, ry);
    for (const off of [0, 12]) for (let a = a0; a <= a1; a += step) {
      const x = cx + Math.cos(a) * (rx - off), y = cy + Math.sin(a) * (ry - off);
      c.fillStyle = off ? D.mix(col, COL.white, 0.25) : col; c.beginPath(); c.arc(x, y, 5.2, 0, TAU); c.fill();
    }
  }
  function receptor(c, x, y, open, bound, z) {
    // a channel protein spanning the postsynaptic membrane: two subunits that part when open
    const g = 8 + 10 * open;
    for (const s of [-1, 1]) D.flat(c, D.rr(x + s * g - (s < 0 ? 22 : 0), y - 36, 22, 66, 9), COL.teal2, COL.teal, COL.tealHi, 3, 1.2);
    if (bound > 0) for (const s of [-1, 1]) D.fill(c, D.circle(x + s * (g + 11), y - 40, 7 * bound), COL.yel);
    if (open > 0) D.glow(c, x, y - 4, 60, COL.cyan, 0.6 * open);
  }
  function ion(c, x, y, r, a) {
    if (a <= 0) return;
    D.spark(c, x, y, r, COL.cyan, a);
    c.save(); c.globalAlpha = a; c.strokeStyle = COL.deep; c.lineWidth = r * 0.28; c.beginPath(); c.moveTo(x - r * 0.45, y); c.lineTo(x + r * 0.45, y); c.moveTo(x, y - r * 0.45); c.lineTo(x, y + r * 0.45); c.stroke(); c.restore();
  }
  SY.draw = (c, cam, t, o = {}) => {
    c.fillStyle = COL.bg; c.fillRect(0, 0, STAGE.W, STAGE.H);
    // drifting extracellular particles (environment)
    CAM.layer(c, cam, 0.7, c2 => { for (let i = 0; i < 40; i++) { const x = -900 + U.hash(i, 2) * 1800 + 30 * D.wob(t, 2, i), y = -900 + U.hash(i, 4) * 1800 + 30 * D.wob(t, 3, i * 2); c2.fillStyle = D.rgba(COL.lavHi, 0.12); c2.beginPath(); c2.arc(x, y, 6 + (i % 3) * 3, 0, TAU); c2.fill(); } });
    CAM.with(c, cam, c2 => {
      const z = cam.z;
      // the bouton (axon terminal) and the spine head
      D.flat(c2, D.ellipse(BOUTON.x, BOUTON.y, BOUTON.rx, BOUTON.ry), COL.lavSh, COL.lavDk, COL.lav, 22, 8);
      D.flat(c2, D.ellipse(SPINE.x, SPINE.y, SPINE.rx, SPINE.ry), COL.lav, COL.lavSh, COL.lavHi, 22, 8);
      // the spine neck and the axon above
      D.flat(c2, D.rr(-90, 560, 180, 500, 80), COL.lav, COL.lavSh, COL.lavHi, 14, 5);
      D.flat(c2, D.rr(-70, -1000, 140, 420, 60), COL.lavSh, COL.lavDk, COL.lav, 12, 4);
      membrane(c2, BOUTON.x, BOUTON.y, BOUTON.rx, BOUTON.ry, true, z, COL.lavHi);
      membrane(c2, SPINE.x, SPINE.y, SPINE.rx, SPINE.ry, false, z, COL.lavHi);
      // the postsynaptic density (a darker band under the receptors)
      D.fill(c2, D.rr(-290, 74, 580, 24, 12), COL.lavDk, 0.9);
      // vesicles full of transmitter
      for (const v of VES) { D.flat(c2, D.circle(v.x, v.y, v.r * 1.9), D.mix(COL.lavHi, COL.white, 0.3), COL.lav, '#FFFFFF', 5, 2); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + v.seed; D.fill(c2, D.circle(v.x + Math.cos(a) * v.r * 0.8, v.y + Math.sin(a) * v.r * 0.8, 6), COL.yel); } }
      // the fusing vesicle: docks, merges with the membrane, opens a pore
      const dock = U.clamp((t - EV.vesicle + 0.3) / 0.3), fuse = U.clamp((t - EV.release) / 0.35);
      const vy = U.lerp(-170, FUSE.y, MO.cubicOut(dock));
      if (fuse < 1) { D.flat(c2, D.circle(FUSE.x, vy, FUSE.r * 1.9 * (1 - 0.5 * fuse)), D.mix(COL.lavHi, COL.white, 0.3), COL.lav, '#FFFFFF', 5, 2); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; D.fill(c2, D.circle(FUSE.x + Math.cos(a) * 16 * (1 - fuse), vy + Math.sin(a) * 16 * (1 - fuse), 6), COL.yel); } }
      if (fuse > 0) D.fill(c2, D.ellipse(FUSE.x, -34, 40 * Math.min(1, fuse * 2), 10), COL.bg, 1);
      // transmitter crossing the cleft and binding
      for (let i = 0; i < MOL.length; i++) {
        const m = MOL[i], u = U.clamp((t - EV.release - 0.05 * m.w) / (EV.bind - EV.release + 0.1));
        if (t < EV.release) break;
        const sx = FUSE.x + Math.cos(m.ang) * 8, sy = -36, ex = m.tx, ey = 22, wig = Math.sin(u * 9 + i) * 18 * (1 - u);
        const x = U.lerp(sx, ex, MO.cubicOut(u)) + wig + Math.cos(m.ang) * m.d * Math.sin(u * Math.PI) * 0.6, y = U.lerp(sy, ey, MO.cubicOut(u));
        D.fill(c2, D.circle(x, y, 6.5), COL.yel); D.fill(c2, D.circle(x - 2, y - 2, 2.4), COL.yelHi);
        if (u < 0.15) D.glow(c2, x, y, 20, COL.yel, 0.5);
      }
      // receptor channels: bound, then open; ions stream in through the open ones
      const bound = U.clamp((t - EV.bind) / 0.25), open = U.clamp((t - EV.channelsOpen) / 0.3);
      for (const x of RECEPT) receptor(c2, x, 62, open, bound, z);
      if (t > EV.release && t < EV.bind + 0.3) D.glow(c2, 0, 0, 260, COL.yel, 0.25 * Math.sin(Math.PI * U.clamp((t - EV.release) / (EV.bind + 0.3 - EV.release))));
      // cations outside the membrane, flowing in through the open channels on each pulse
      for (let i = 0; i < 26; i++) {
        // outside: in the cleft and in the extracellular space beside it
        const side = i % 2 ? 1 : -1, inCleft = i % 3 === 0;
        const x0 = inCleft ? -300 + U.hash(i, 7) * 600 : side * (450 + U.hash(i, 7) * 160), y0 = inCleft ? -6 + U.hash(i, 8) * 12 : -170 + U.hash(i, 8) * 190, chx = RECEPT[i % RECEPT.length];
        let x = x0 + 12 * D.wob(t, 3, i), y = y0 + (inCleft ? 3 : 10) * D.wob(t, 4, i * 3), a = 0.95;
        if (open > 0) { const tp = EV.ions[i % EV.ions.length] + (i % 3) * 0.04, u = U.clamp((t - tp) / 0.55); if (t > tp) { const v = MO.sineInOut(u); x = U.lerp(x0, chx, Math.min(1, v * 1.6)); y = v < 0.6 ? U.lerp(y0, 18, v / 0.6) : U.lerp(18, 250 + (i % 4) * 30, (v - 0.6) / 0.4); } }
        ion(c2, x, y, 11, a);
      }
      // inside the spine the potential shifts: a soft cyan swell
      if (o.inside > 0) D.glow(c2, 0, 360, 520, COL.cyan, 0.45 * o.inside);
    });
  };
})();
