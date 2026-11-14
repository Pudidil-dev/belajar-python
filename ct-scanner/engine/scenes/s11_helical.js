// S11 ROTATION + TABLE MOVEMENT = HELICAL SCAN (73–80 s): the gantry in 3D, its cover see-through. The frame spins while
// the table carries the head steadily through the scan plane. Relative to the patient, the focal spot therefore traces a
// helix round the head — at the tube's radius (57 cm from the axis), not on the skin — and the scanned part of the head
// (cyan) grows with it: a whole volume, not just one slice.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, TAU = U.TAU;
const REV = 0.4;                                                      // rotations per second (shown much slowed: a real one takes ≈ 0.3 s)
const phiAt = t => TAU * REV * t;
const tzAt = t => lerp(-70, 140, MO.smooth(clamp((t - 0.6) / 6.0)) * 0.15 + clamp((t - 0.6) / 6.0) * 0.85);
const camAt = t => {
  const q = MO.sineInOut(clamp(t / 7));
  return ROOM.orbit([0, -20, lerp(-60, 0, q)], lerp(2500, 2050, q), lerp(0.85, 1.12, q), lerp(0.36, 0.30, q), 300);
};
// the focal spot in world coordinates at frame angle phi (the frame's local tube is at the top, world X mirrored)
const focal = phi => { const c = Math.cos(phi), s = Math.sin(phi), x = 0, y = CT.D; return [-(x * c + y * s), -x * s + y * c]; };
SC['s11_helical'] = {
  draw(c, t, S) {
    const C = camAt(t), phi = phiAt(t), tz = tzAt(t), hz = ROOM.G.HZ + tz;
    PIX.rect(c, 0, 0, W, H, 'k');
    // the scanned range in head coordinates: from the vertex down to the plane's current height
    const zNow = -hz, zTop = 92;
    const img = K.pbegin(c);
    ROOM.render(img, C, { t: S.t, cover: lerp(0.12, 0.08, clamp(t)), body: 0.35, head: 1, spin: phi, frame: true, tz, led: 1, scan: zNow < zTop ? [zNow, zTop] : null, scanA: 0.55 });
    K.pend(c, img);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the helix: where the focal spot has been, seen from the patient (it moves with the table)
    const pts = [];
    const t0 = 0.6;
    for (let tau = t0; tau <= t; tau += 1 / 90) { const [x, y] = focal(phiAt(tau)); const pr = ROOM.proj(C, [x, y, tz - tzAt(tau)]); if (pr) pts.push([pr, t - tau]); }
    for (let i = 1; i < pts.length; i++) {
      const [a, ag] = pts[i - 1], [b] = pts[i], col = ag < 0.5 ? 'y4' : ag < 2.5 ? 'y3' : 'y2';
      PIX.bline(c, a[0], a[1], b[0], b[1], col);
    }
    const [fx, fy] = focal(phi), F = ROOM.proj(C, [fx, fy, 0]);
    if (F) FX.flash(c, F[0], F[1], 3, 'y4', 1);
    // labels
    if (pts.length > 40) { const [a] = pts[Math.floor(pts.length * 0.35)]; CAP.note(c, t, { ax: a[0], ay: a[1], x: 248, y: 150, text: 'TUBE PATH (HELIX)', t0: 2.4, t1: 6.85, col: 'y3', align: 'right', box: true }); }
    { const Hd = ROOM.proj(C, [0, 40, hz + 60]); if (Hd) CAP.note(c, t, { ax: Hd[0], ay: Hd[1], x: 20, y: 352, text: 'SCANNED VOLUME', t0: 3.6, t1: 6.85, col: 'c3', box: true }); }
    CAP.cap(c, t, { l1: 'SCANNING A VOLUME', l2: ['ROTATION + TABLE MOVEMENT', '= HELICAL SCAN'], t0: 0.12, tSwap: 2.2, t1: 6.85, acc: 'y3' });
  },
  cues: () => {
    const q = [[0, 'swing', 0.6, 0, 1.0], [0.6, 'table_motor', 0.7, 0, 6.2], [0.6, 'spin_motor', 0.8, 0, 6.3], [2.4, 'tag', 0.4, 0.4], [3.6, 'tag', 0.4, -0.4]];
    // a rhythmic pulse per rotation
    let k = 0; for (let tt = 0.6; tt < 6.9; tt += 1 / REV / 2) q.push([Math.round(tt * 4) / 4, 'rot_pulse', 0.45, (k++ % 2) ? 0.3 : -0.3]);
    q.push([2.2, 'spiral_sweep', 0.8, 0, 2.0]);
    return q;
  },
  xin: 0.35,
};
})();
