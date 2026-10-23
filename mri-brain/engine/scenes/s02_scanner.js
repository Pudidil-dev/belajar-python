// S02 INSIDE THE MRI (3–8 s): the camera goes into the brain — a cutting plane sweeps from the right side to the midline
// and the cut face is the sagittal MRI image — then the slice widens to the whole head under a translucent skin, and the
// camera pulls back (rolling the head from upright to lying) to the patient in a cutaway 1.5 T scanner. It climbs
// through the layers (bore, RF coil, gradient coils, superconducting coils in liquid helium) and the static field B0
// shows along the bore through the head: always on, closing back through the cryostat between main and shield coils.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth;
const S1 = window.S01, V0 = S1.viewAt(3), SQ = 1.45, F = 700;
const G = SCAN.GEO;
// phase 1: into the brain (VOL view, pure side view of the right hemisphere)
const p1 = t => MO.cubicOut(clamp(t / 1.25));
const viewAt = t => {
  const u = p1(t);
  return { cx: lerp(V0.cx, 139, u), cy: lerp(V0.cy, 226, u), s: Math.exp(lerp(Math.log(V0.s), Math.log(SQ), u)), yaw: -Math.PI / 2, pitch: lerp(V0.pitch, 0, u) };
};
const clipX = t => lerp(-73, 2.5, MO.cubicOut(clamp((t - 0.05) / 1.1)));
// the scanner camera that reproduces the side view of the slice (see notes in SCAN): distance f / (1000 s)
const matched = () => { const Dc = F / (1000 * SQ), Xc = G.HEAD[0] + (H / 2 - 226) / (1000 * SQ), Zc = G.HEAD[2] - (139 - W / 2) / (1000 * SQ); return { T: [Xc, 0, Zc], D: Dc }; };
// camera rig: target T, distance D, azimuth az (toward +X), elevation el, roll ro (−π/2: the head stands upright)
const rig = (T, D, az, el, ro) => {
  const dir = [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), -Math.sin(el)];          // forward
  const pos = [T[0] - dir[0] * D, T[1] - dir[1] * D, T[2] - dir[2] * D];
  const nu = SCAN.vec.norm(SCAN.vec.sub([0, 0, 1], dir.map(v => v * dir[2]))), rt = SCAN.vec.cross(dir, nu);
  const up = [Math.cos(ro) * nu[0] + Math.sin(ro) * rt[0], Math.cos(ro) * nu[1] + Math.sin(ro) * rt[1], Math.cos(ro) * nu[2] + Math.sin(ro) * rt[2]];
  return SCAN.camera(pos, T, up, F);
};
const KEYS = [   // [t, target, distance, azimuth, elevation, roll]
  [1.25, null, null, 0, 0, -Math.PI / 2],
  [1.9, null, null, 0, 0, -Math.PI / 2],
  [3.0, [0.1, 0, -0.06], 5.4, 0.32, 0.2, 0],
  [3.35, [-0.2, 0, 0.32], 2.9, 0.3, 0.17, 0],
  [4.25, [-0.2, 0, 0.78], 2.9, 0.26, 0.15, 0],
  [4.65, [0.05, 0, 0.02], 3.2, 0.26, 0.15, 0],
  [5.0, [0.02, 0, -0.03], 2.5, 0.22, 0.12, 0],
];
const camAt = t => {
  const m = matched(); const ks = KEYS.map(k => [k[0], k[1] || m.T, k[2] || m.D, k[3], k[4], k[5]]);
  let i = 1; while (i < ks.length - 1 && t > ks[i][0]) i++;
  const A = ks[i - 1], B = ks[i], u = io(clamp((t - A[0]) / (B[0] - A[0])));
  return rig([0, 1, 2].map(j => lerp(A[1][j], B[1][j], u)), Math.exp(lerp(Math.log(A[2]), Math.log(B[2]), u)), lerp(A[3], B[3], u), lerp(A[4], B[4], u), lerp(A[5], B[5], u));
};
window.S02 = { camAt, rig, F };
// layer labels on the cut face: [t0, text, X, Z of the anchor, label y on screen]
const LAYERS = [[3.2, 'PATIENT BORE', -0.62, 0.30, 'g9'], [3.35, 'RF COIL', -0.30, 0.327, 'u3'], [3.5, 'GRADIENT COILS', -0.48, 0.42, 'u3'],
  [3.7, 'SUPERCONDUCTING MAGNET', -0.36, 0.60, 'u3'], [3.88, 'IN LIQUID HELIUM, 4 K', -0.12, 0.70, 'g9']];
// static field lines: straight through the bore (toward −X, toward the head), returning (+X) between the coil sets
function field(c, C, t, a) {
  if (a <= 0) return;
  const lines = [];
  for (const z of [-0.22, -0.11, 0.0, 0.11, 0.22]) lines.push({ pts: [[1.05, z], [-1.05, z]], dir: -1 });
  for (const s of [1, -1]) lines.push({ pts: (() => { const p = []; for (let k = 0; k <= 40; k++) { const u = k / 40; let X, Z;
    if (u < 0.25) { const th = Math.PI / 2 * (u / 0.25); X = -0.75 - 0.18 * Math.sin(th); Z = s * (0.30 + 0.38 * (1 - Math.cos(th))); }
    else if (u < 0.75) { X = lerp(-0.93, 0.93, (u - 0.25) / 0.5); Z = s * 0.68; }
    else { const th = Math.PI / 2 * ((u - 0.75) / 0.25); X = 0.75 + 0.18 * Math.cos(th); Z = s * (0.68 - 0.38 * Math.sin(th)); }
    p.push([X, Z]); } return p; })(), dir: 1 });
  for (const L of lines) {
    const P = L.pts.map(([X, Z]) => SCAN.proj(C, [X, 0, Z])).filter(Boolean);
    for (let i = 1; i < P.length; i++) { c.save(); c.globalAlpha = a; PIX.bline(c, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1], 'c2'); c.restore(); }
    // chevrons flowing along the line
    const n = P.length; if (n < 2) continue;
    let Ltot = 0; const seg = []; for (let i = 1; i < n; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); Ltot += l; }
    const gap = 26; for (let d0 = K.wrap(t * 40, gap); d0 < Ltot; d0 += gap) {
      let d = d0, i = 0; while (i < seg.length && d > seg[i]) { d -= seg[i]; i++; } if (i >= seg.length) break;
      const q = d / seg[i], x = lerp(P[i][0], P[i + 1][0], q), y = lerp(P[i][1], P[i + 1][1], q), ang = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]);
      c.save(); c.globalAlpha = a; for (const sgn of [-1, 1]) PIX.bline(c, x, y, x - Math.cos(ang + sgn * 0.6) * 4, y - Math.sin(ang + sgn * 0.6) * 4, 'c4'); c.restore();
    }
  }
}
SC['s02_scanner'] = {
  draw(c, t, S) {
    // phase 1: the cutting plane sweeps through the brain to the midline
    const drawVol = cc => { const img = K.pbegin(cc); VOL.render(img, { ...viewAt(t), clip: { n: [-1, 0, 0], d: -clipX(t) }, cut: true, outline: true }); K.pend(cc, img); };
    const C = camAt(t);
    const scanOpts = { cut: 0, t: S.t, head: 1, skin: sm(clamp((t - 1.35) / 0.4)), env: sm(clamp((t - 1.8) / 0.5)), reveal: t < 1.9 ? lerp(70, 200, sm(clamp((t - 1.3) / 0.6))) : 1e9 };
    const drawScan = cc => { const img = K.pbegin(cc); SCAN.render(img, C, scanOpts); K.pend(cc, img); };
    if (t < 1.25) drawVol(c);
    else window.dissolve(c, drawVol, drawScan, sm(clamp((t - 1.25) / 0.15)));
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (t > 3.2) {
      // the field, always there: drawn faintly from the first wide view, then bright with its label
      field(c, C, S.t, t < 4.2 ? 0.35 : 0.35 + 0.65 * sm(clamp((t - 4.2) / 0.3)));
      LAYERS.forEach(([t0, s, X, Z, col], i) => {
        const pr = SCAN.proj(C, [X, 0, Z]); if (!pr) return;
        CAP.note(c, t, { x: 14, y: pr[1] - (i === 0 ? -6 : 13), text: s, t0, t1: 4.55, ax: pr[0], ay: pr[1], col, lineCol: 'g8', box: true, rate: 75 });
      });
      const pb = SCAN.proj(C, [-0.55, 0, 0.0]);
      if (pb) { CAP.note(c, t, { x: 14, y: 372, text: 'B₀ = 1.5 T', t0: 4.3, ax: pb[0], ay: pb[1], col: 'c3', lineCol: 'c2', box: true }); CAP.note(c, t, { x: 14, y: 384, text: 'ALWAYS ON', t0: 4.45, col: 'c4', box: true }); }
    }
    CAP.scene(c, t, { title: 'INSIDE THE MRI', t0: 0.15, acc: 'c3' });
  },
  cues: () => [[0, 'whoosh_in', 0.9, 0, 1.2], [0.2, 'slice_sweep', 0.7, -0.2, 0.9], [1.25, 'tone', 0.5, 0], [1.9, 'pull_back', 0.9, 0, 1.1], [3.0, 'mech_pulse', 0.8, 0.2],
    ...LAYERS.map(([t0], i) => [t0, 'layer', 0.7, -0.4 + i * 0.2, i]), [4.2, 'magnet_sweep', 1.0, 0, 0.8], [4.3, 'type', 0.4], [3.0, 'ambience', 0.6, 0, 2.0]],
};
})();
