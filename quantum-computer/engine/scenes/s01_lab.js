// S01 THE QUANTUM COMPUTER (0–7 s): the lab — racks of microwave electronics and the gold dilution refrigerator hanging
// in its frame. The camera eases toward it, then dives down through the cooling stages, past the cables and
// attenuators, to the processor package at the bottom, and into the chip.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp;
const PK = () => FR.toRoom(0, FR.PKG.y + FR.PKG.h / 2);
const Z_END = 86;
const DIVE = MO.bezier(0.62, 0, 0.62, 1);           // gathers speed through the stages, lands softly on the chip
const camAt = t => {
  if (t < 3.5) { const p = MO.sineInOut(t / 3.5); return { x: 135, y: lerp(244, 222, p), z: K.zl(1.0, 1.55, p) }; }
  const u = clamp((t - 3.5) / 3.5), [px, py] = PK();
  return { x: lerp(135, px, MO.smooth(u)), y: lerp(222, py, MO.sineInOut(Math.min(1, u * 1.22))), z: K.zl(1.55, Z_END, DIVE(u)) };
};
window.S01 = { camAt, Z_END };
const chipFn = (c, zcm) => { c.save(); c.scale(0.1, 0.1); CH.draw(c, { z: zcm / 10 }); c.restore(); };
SC['s01_lab'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    K.cam(c, cam);
    FR.room(c, { t: S.t });
    c.save(); c.translate(FR.FX0, FR.FY0); c.scale(FR.FS, FR.FS);
    FR.draw(c, { z: cam.z * FR.FS, t: S.t, chipFn, signal: clamp((t - 1.2) / 0.5) * 0.9 });
    c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const L = (x, y) => K.S(cam, ...FR.toRoom(x, y));
    if (t < 3.3) { const [ax, ay] = L(26, 40); CAP.note(c, t, { ax, ay, x: 256, y: 128, text: 'DILUTION REFRIGERATOR', t0: 1.1, t1: 2.9, align: 'right', col: 'y4', box: true }); }
    const n = CAP.typed('QUANTUM COMPUTER', t, 0.35, 3.45);
    if (n > 0) { const tw = PIX.textWidth('QUANTUM COMPUTER', 2); PIX.rect(c, Math.round(W / 2 - tw / 2) - 4, 26, tw + 9, 22, 'k'); PIX.text(c, 'QUANTUM COMPUTER', W / 2, 30, 'w', { sc: 2, align: 'center', n }); }
    if (t > 6.15) CAP.note(c, t, { x: 135, y: 404, text: 'PROCESSOR', t0: 6.2, t1: 6.75, align: 'center', col: 'b3', box: true });
  },
  cues: () => {
    const q = [[0, 'ambience', 1, 0, 7], [0.35, 'type', 0.5], [0.0, 'pulse_tube', 0.7, -0.3, 3.5], [1.1, 'blip', 0.5, 0.5], [3.5, 'dive', 1, 0, 3.5], [6.2, 'reveal', 0.9, 0]];
    // a tick as each cooling plate sweeps past the middle of the frame during the dive
    for (const [py] of FR.PLATES) {
      for (let t = 3.5; t < 7; t += 1 / 120) { const cam = camAt(t), y = K.S(cam, ...FR.toRoom(0, py))[1]; if (y < 240) { if (t > 3.55) q.push([Math.round(t * 8) / 8, 'stage_pass', 0.7, 0, FR.PLATES.findIndex(p => p[0] === py)]); break; } }
    }
    return q;
  },
};
})();
