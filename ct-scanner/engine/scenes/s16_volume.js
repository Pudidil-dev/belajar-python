// S16 2D SLICES BECOME A 3D VOLUME (112–118 s): the slice tilts into 3D at its own height in the head; slice 1, 2, 3 at other
// levels join it, then the whole series slides in — contiguous axial images stacked into a volume of voxels. Bone is
// selected by its CT value (> 300 HU): the soft tissue falls away and the stack becomes rings of bone. Then the voxel skull
// builds up layer by layer from the jaw to the vault, on the workstation screen — the same skull as the first frame.
(() => {
const { W, H, P } = PIX;
const lerp = U.lerp, clamp = U.clamp;
const ZS = []; for (let z = -122; z <= 86; z += 8) ZS.push(z);          // 27 slice levels (mm)
const FIRST = [CT.Z, -40, -84];                                         // slice 1 (the reconstructed one), 2, 3
const NI = 72, FOVI = 200;                                              // card images: 72 × 72 over 200 mm
const CARDS = new Map();
const card = z => {
  if (CARDS.has(z)) return CARDS.get(z);
  const img = new Float32Array(NI * NI), px = FOVI / NI;
  // slice 1 is the reconstruction itself (resampled from the gantry frame); the others come from the same model
  const rec = z === CT.Z ? CT.full() : null;
  for (let r = 0; r < NI; r++) for (let c = 0; c < NI; c++) {
    const x = (c + 0.5 - NI / 2) * px, y = (NI / 2 - r - 0.5) * px;
    if (rec) { const fx = (x + CT.OX) / CT.PX + CT.N / 2 - 0.5, fy = CT.N / 2 - (y + CT.OY) / CT.PX - 0.5, i = Math.max(0, Math.min(CT.N - 1, Math.round(fx))), j = Math.max(0, Math.min(CT.N - 1, Math.round(fy))); img[r * NI + c] = CT.toHU(rec[j * CT.N + i]); }
    else img[r * NI + c] = HEAD.hu(x, y, z);
  }
  CARDS.set(z, img); return img;
};
// the 3D view (orthographic, as SKULL's) turns from looking straight down at the slice to the opening's pose
// t = 0 matches S15's last frame: the slice seen from below (radiological view: anterior up, patient's right on the left),
// centred where S15 drew it; then it tilts up into the 3D view from above
const viewAt = t => {
  const q = MO.k75(clamp((t - 0.15) / 1.35)), r = MO.sineInOut(clamp((t - 2.6) / 3.2));
  const pose = MON.POSE, cx0 = 122 + CT.OX * 0.93, cy0 = 268 - CT.OY * 0.93;
  return { cx: lerp(cx0, 135, q), cy: lerp(cy0, lerp(268, pose.cy, r), q), s: lerp(0.93, lerp(0.93, pose.s, r), q), yaw: lerp(0, lerp(0.55, pose.yaw + 0.25, r), q), pitch: lerp(-Math.PI / 2 + 0.001, lerp(0.62, pose.pitch + 0.05, r), q) };
};
// draw one card (axial image at z) through the view: affine map of its grid; mode 'ct' (grey) or 'bone' (bone only, bone white)
function drawCard(c, v, z, mode, a, dz = 0, wb = 1) {
  if (a <= 0) return;
  const img = card(z), px = FOVI / NI, view = SKULL.view(v);
  const [ax, ay] = view(px, 0, 0), [bx, by] = view(0, -px, 0), [ox, oy] = view(-FOVI / 2, FOVI / 2, z + dz);
  const M = [v.s * ax, -v.s * ay, v.s * bx, -v.s * by, v.cx + v.s * ox, v.cy - v.s * oy];
  const R = mode === 'bone' ? SKULL.ramps().bone : CT.ramps().gray;
  CT.blit(c, NI, NI, { M, ramp: R, alpha: a, nearest: true, val: i => { const hu = img[i]; if (hu < -300) return null; if (mode === 'bone') return hu > 300 ? 0.62 + 0.3 * clamp((hu - 300) / 1300) : null; const L = lerp(500, 40, wb), Wd = lerp(2000, 400, wb); return clamp((hu - (L - Wd / 2)) / Wd); } });
}
SC['s16_volume'] = {
  draw(c, t, S) {
    const v = viewAt(t), chrome = MO.smooth(clamp((t - 4.2) / 0.8));
    PIX.rect(c, 0, 0, W, H, chrome > 0.5 ? 'n0' : 'k');
    if (chrome > 0) { c.save(); c.globalAlpha = chrome; PIX.rect(c, 0, 0, W, H, 'n0'); c.restore(); }
    // which cards are in: the three firsts, then the series; bone-only after 2.0
    const boneQ = MO.smooth(clamp((t - 2.0) / 0.5)), build = clamp((t - 3.3) / 2.4), zA = lerp(-134, 100, MO.sineInOut(build));
    const cards = [];
    FIRST.forEach((z, k) => { const t0 = k === 0 ? -1 : 0.4 + k * 0.45; if (t >= t0) cards.push([z, k === 0 ? 1 : MO.cubicOut(clamp((t - t0) / 0.3)), k === 0 ? 0 : (1 - MO.cubicOut(clamp((t - t0) / 0.3))) * 40]); });
    if (t > 1.55) ZS.forEach((z, k) => { if (FIRST.includes(z)) return; const t0 = 1.55 + k * 0.02; if (t >= t0) cards.push([z, MO.cubicOut(clamp((t - t0) / 0.25)), (1 - MO.cubicOut(clamp((t - t0) / 0.25))) * 60]); });
    cards.sort((a, b) => a[0] - b[0]);                                  // painter's order: bottom first (we look from above)
    // the voxel skull, built up to zA; the cards above the build front stay as bone rings until it reaches them
    if (build > 0) {
      const img = K.pbegin(c);
      SKULL.render(img, { ...v, showZ: zA, front: 2.2, cut: false });
      K.pend(c, img);
    }
    for (const [z, a, dz] of cards) {
      if (build > 0 && z < zA) continue;
      if (boneQ < 1) drawCard(c, v, z, 'ct', a * (1 - boneQ), dz, MO.smooth(clamp((t - 0.1) / 0.6)));
      if (boneQ > 0) drawCard(c, v, z, 'bone', a * boneQ, dz);
    }
    if (chrome > 0) MON.chrome(c, v, chrome);
    // labels
    if (t < 1.75) FIRST.forEach((z, k) => { const p = SKULL.proj(v, -FOVI / 2, 0, z); CAP.note(c, t, { ax: p[0] + 6, ay: p[1], x: 20, y: Math.round(p[1]) - 4, text: `SLICE ${k + 1}`, t0: k === 0 ? 0.6 : 0.4 + k * 0.45 + 0.1, t1: 1.7, col: 'g9', box: true }); });
    CAP.note(c, t, { x: 20, y: 384, text: 'BONE: CT VALUE > 300 HU', t0: 2.1, t1: 3.9, col: 'q6', box: true });
    CAP.cap(c, t, { l1: '3D VOLUME', l2: ['2D SLICES BECOME', 'A 3D VOLUME'], t0: 0.12, tSwap: 1.4, t1: 5.85, acc: 'q6' });
  },
  cues: () => {
    const q = [[0, 'tilt_3d', 0.7, 0, 1.4], [0.0, 'slice_click', 0.7, -0.3], [0.45, 'slice_click', 0.7, 0], [0.9, 'slice_click', 0.7, 0.3], [1.4, 'stack_rush', 0.7, 0, 0.6],
      [2.0, 'segment', 0.8, 0, 0.5], [3.3, 'arp_rise', 0.9, 0, 2.4]];
    for (let k = 0; k < 10; k++) q.push([3.3 + k * 0.25, 'assemble_tick', 0.45 + 0.03 * k, (k % 2 ? 0.25 : -0.25), k]);
    q.push([5.7, 'success_impact', 1, 0]);
    return q;
  },
};
})();
