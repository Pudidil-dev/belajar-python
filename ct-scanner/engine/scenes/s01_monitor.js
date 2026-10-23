// S01 3D CT RECONSTRUCTION (0–4 s): the result first. A workstation screen fills the frame: a bone-white 3D voxel skull
// turns 30°; a bright scan plane sweeps down through it and stops at the slice level; the vault above it lifts away and
// the cut shows the matching axial CT section (the same model, the same level as the reconstruction in S14–S15). The
// skull then splits into a stack of axial slabs, each top a CT section, and snaps back together. At 3 s the extreme
// pull-back starts (continued in S02): the screen becomes a monitor on a desk.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const Z = () => CT.Z;
// skull pose on the screen: 30° of yaw in the first second, then a slow drift
const yawAt = t => t < 1 ? lerp(-0.30, 0.22, MO.k75(clamp(t / 1))) : 0.22 + 0.035 * (t - 1);
// tilt toward the viewer while the section is shown (1.0–2.95), so the cut face reads as an image, not a sliver
const pitchAt = t => MON.POSE.pitch + 0.42 * MO.cubicInOut(clamp((t - 1.05) / 0.5)) * (1 - MO.cubicInOut(clamp((t - 2.5) / 0.45)));
const viewAt = t => ({ ...MON.POSE, yaw: yawAt(t), pitch: pitchAt(t) });
window.S01 = { viewAt, yawAt };
// what the skull does at time t (layers, band, plane)
const stateAt = t => {
  const z = Z(), so = {}, ov = {};
  // the scan plane: down from the vertex to the slice level
  const pz = lerp(96, z, MO.cubicOut(clamp((t - 0.3) / 0.7)));
  if (t >= 0.3 && t < 1.32) { ov.plane = pz; ov.planeFill = 0.16 * (1 - clamp((t - 1.0) / 0.3)); so.band = { z: pz, w: 1.2, col: 'c4' }; }
  // the vault above the plane lifts away (1.0–1.45), comes back (2.6–3.0)
  const up = MO.cubicIn(clamp((t - 1.0) / 0.45)) * (1 - MO.cubicOut(clamp((t - 2.55) / 0.42)));
  // slabs: separate 2.0–2.35, hold, close 2.55–2.95
  const g = 7.5 * MO.backOut(clamp((t - 2.0) / 0.35), 1.6) * (1 - MO.cubicInOut(clamp((t - 2.5) / 0.32)));
  if (t >= 1.0 && t < 3.0) {
    const layers = [], T = 22, z0 = -134;
    const nS = Math.ceil((z - z0) / T);
    // internal faces only while the slabs are apart (closed, they would show as seams on the surface)
    for (let k = 0; k < nS; k++) { const lo = Math.max(z0 - 10, z - (nS - k) * T), hi = z - (nS - 1 - k) * T, top = k === nS - 1; layers.push({ lo: k === 0 ? -1e9 : lo, hi, dz: k * g, face: top ? up > 0.02 : g > 2.5 }); }
    // the vault: lifted by up·70 mm and fading; its underside is never seen from above
    layers.push({ lo: z, hi: 1e9, dz: (nS - 1) * g + up * 70, a: 1 - up, face: false });
    so.layers = layers;
  }
  return { so, ov };
};
window.S01.stateAt = stateAt;
SC['s01_monitor'] = {
  draw(c, t, S) {
    if (t < 3) {
      const { so, ov } = stateAt(t);
      MON.draw(c, viewAt(t), { cutWin: [40, 110], ...so }, ov);
    } else window.S02.drawRoom(c, S.t, S);
    CAP.cap(c, t, { l2: '3D CT RECONSTRUCTION', t0: 0.15, t1: 3.15, acc: 'c3' });
  },
  cues: () => [[0, 'impact', 1, 0], [0, 'beat_in', 1, 0], [0.3, 'scan_on', 0.8, 0], [0.3, 'plane_sweep', 0.7, 0, 0.7], [0.8, 'voxel_clicks', 0.6, 0.2],
    [1.0, 'lift', 0.6, 0], [1.3, 'recon_shimmer', 0.7, -0.1], [2.0, 'stack_out', 0.7, 0], [2.2, 'layer_scan', 0.6, 0.2], [2.55, 'stack_in', 0.8, 0],
    [3.0, 'whoosh_out', 1, 0, 1.0]],
};
})();
