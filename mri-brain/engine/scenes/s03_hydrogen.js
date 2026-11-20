// S03 HYDROGEN NUCLEI (8–14 s): powers of ten into the patient. The camera dives into the head's slice (rolling it
// upright again, so B0 — along the bore, pointing toward the top of the head — points up), picks one MRI voxel of
// cortex (1.25 mm) and goes into it: neurons, glia, a capillary; then the fluid between the cells, liquid water,
// one H₂O molecule with its two hydrogen nuclei lit, one hydrogen atom, and its nucleus: a single proton. Its spin is a
// quantum property; what MRI uses is the magnetic moment that comes with it, drawn as a cyan vector.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth;
const S2 = window.S02, G = SCAN.GEO;
const HT = { fu: 270, fv: 300, cy: -6, cz: -55, vs: 1.25 };
// the voxel we dive into: a texel of cortex near the top of the frontal lobe
let TGT = null;
const target = () => {
  if (TGT) return TGT;
  const T = SCAN.headTex(); let best = null;
  for (let r = 0; r < T.h; r++) for (let c = 0; c < T.w; c++) {
    const y = HT.cy - HT.fu / 2 + (c + 0.5) * HT.vs, z = HT.cz + HT.fv / 2 - (r + 0.5) * HT.vs, v = T.im[r * T.w + c];
    if (v < 0.42 || v > 0.52) continue;
    const d = Math.hypot(y - 30, z - 46); if (!best || d < best[0]) best = [d, y, z, c, r];
  }
  const [, y, z] = best;
  TGT = { y, z, P: SCAN.headToScanner(2.5, y, z) }; TGT.P[1] = 0; return TGT;
};
const D_END = 0.0042, T_SCAN = 1.35;
const scanCam = t => {
  const A = S2.camAt(5.0), u = io(clamp(t / T_SCAN)), P = target().P;
  // distance on a log scale; roll back to the head-upright view (up = −X): B0 points up on screen
  const D0 = 2.5, D = Math.exp(lerp(Math.log(D0), Math.log(D_END), MO.cubicInOut(clamp(t / T_SCAN))));
  const T0 = [0.02, 0, -0.03], T = [0, 1, 2].map(j => lerp(T0[j], P[j], sm(clamp(t / 0.9))));
  return S2.rig(T, D, lerp(0.22, 0, u), lerp(0.12, 0, u), lerp(0, -Math.PI / 2, u));
};
// micro scale, px per µm: continues the scanner's scale at the hand-off, then the long zoom
const SM0 = 700 / (D_END * 1e6);
const KS = [[T_SCAN, SM0], [2.95, 26], [3.25, 6750], [4.25, 150000], [4.7, 1.1e6]];
const sAt = t => { if (t <= KS[0][0]) return KS[0][1]; for (let i = 1; i < KS.length; i++) if (t <= KS[i][0]) { const [ta, sa] = KS[i - 1], [tb, sb] = KS[i], u = (t - ta) / (tb - ta); return Math.exp(lerp(Math.log(sa), Math.log(sb), i === 2 ? u : io(u))); } return KS[KS.length - 1][1]; };
// the molecule at the centre and its right-hand hydrogen
const focusH = t => { const [x, y, a] = MICRO.waterAt(0, 0, t), [h1, h2] = MICRO.hPos(x, y, a); return { x, y, a, h1, h2, hR: h1[0] > h2[0] ? h1 : h2 }; };
const MOM = -Math.PI / 2 + 0.55;                                               // the proton's moment: up and to the right
window.S03 = { MOM };
// B0 drawn faintly as rising streaks at every scale
function field(c, t, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  for (let k = 0; k < 9; k++) { const x = 18 + k * 30 + 6 * Math.sin(k * 2.3), y = K.wrap(-t * 120 + U.hash(k, 4) * 480, 520) - 20; PIX.rect(c, Math.round(x), Math.round(y), 1, 14, 'c1'); PIX.rect(c, Math.round(x), Math.round(y), 1, 3, 'c2'); }
  c.restore();
}
SC['s03_hydrogen'] = {
  init() { target(); MICRO.init(); },
  draw(c, t, S) {
    const tg = target();
    // 1) the dive into the slice; the voxel lights up
    if (t < 1.45) {
      const draw1 = cc => { const img = K.pbegin(cc), C = scanCam(Math.min(t, T_SCAN)); SCAN.render(img, C, { cut: 0, t: S.t, head: 1, skin: 1, env: 1 }); K.pend(cc, img);
        // the voxel's outline
        if (t > 0.75) { const vs = 1.25, pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => SCAN.proj(C, SCAN.headToScanner(2.5, tg.y + a * vs / 2, tg.z + b * vs / 2)));
          if (pts.every(Boolean)) { for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; PIX.bline(cc, p[0], p[1], q[0], q[1], 'c4'); } } } };
      const draw2 = cc => { MICRO.tissue(cc, { x: 0, y: 0, s: sAt(t), r: 0 }, S.t); };
      if (t < 1.25) draw1(c); else window.dissolve(c, draw1, draw2, sm((t - 1.25) / 0.2));
      if (t > 0.8 && t < 1.6) CAP.note(c, t, { x: 135, y: 300, text: '1 VOXEL ≈ 1 mm', t0: 0.85, t1: 1.5, align: 'center', col: 'c4', box: true, rate: 60 });
    }
    // 2) tissue, 3) the fluid between cells, 4) water, 5) one atom, 6) the proton
    else if (t < 3.25) {
      const s = sAt(t);
      if (t < 2.97) MICRO.tissue(c, { x: 0, y: 0, s, r: 0 }, S.t);
      else {                                                                     // the rush through the fluid: its contents stream past
        PIX.rect(c, 0, 0, W, H, 'n1');
        const u = (t - 2.97) / 0.28;
        for (let k = 0; k < 420; k++) {
          const an = U.hash(k, 1) * U.TAU, sp = 0.6 + U.hash(k, 3), r0 = K.wrap(U.hash(k, 2) * 320 + u * 1100 * sp, 320), r1 = Math.max(0, r0 - 10 * sp * (0.4 + u));
          const x0 = W / 2 + Math.cos(an) * r1, y0 = H / 2 + Math.sin(an) * r1 * 1.6, x1 = W / 2 + Math.cos(an) * r0, y1 = H / 2 + Math.sin(an) * r0 * 1.6;
          PIX.bline(c, x0, y0, x1, y1, k % 7 === 0 ? 'q2' : k % 3 ? 'n3' : 'g6');
        }
      }
      if (t > 2.8) { const a = sm((t - 2.8) / 0.45); c.save(); c.globalAlpha = a * 0.6; PIX.rect(c, 0, 0, W, H, 'n0'); c.restore(); }
    }
    else if (t < 4.75) {
      const sn = sAt(t) / 1000, F = focusH(t), u = sm(clamp((t - 3.3) / 0.9)), v = sm(clamp((t - 4.25) / 0.45));
      const cx = lerp(lerp(0, F.x, u), F.hR[0], v), cy = lerp(lerp(0, F.y, u), F.hR[1], v), cam = { x: cx, y: cy, s: sn, r: 0 };
      const nuc = sm(clamp((t - 3.9) / 0.25)), fadeM = 1 - sm(clamp((t - 4.3) / 0.28));
      if (fadeM > 0) MICRO.water(c, cam, S.t * 0.6, { nuc, a: fadeM });
      else PIX.rect(c, 0, 0, W, H, 'n0');
      // the two nuclei of the focus molecule ring out
      if (t > 3.9 && t < 4.45) for (const hh of [F.h1, F.h2]) { const [px, py] = MICRO.S(cam, hh[0], hh[1]), q = ((t - 3.85) * 1.6) % 1; FX.ring(c, px, py, 3 + q * 26, 'y3', 1 - q); }
      // entering the atom: its electron cloud (a soft haze around the nucleus — not the spin) grows past the screen
      if (t > 4.25) {
        const [px, py] = MICRO.S(cam, F.hR[0], F.hR[1]), Rr = 0.053 * sn * 2.6, k = sm(clamp((t - 4.25) / 0.2));
        FX.glowL(c, px, py, Math.min(420, Rr), ['n2', 'n3', 'n4', 'g5'], 0.95 * k * (1 - sm(clamp((t - 4.5) / 0.25))), 1.1);
        c.save(); c.fillStyle = PIX.P.y3; c.fillRect(Math.round(px), Math.round(py), 1, 1); c.restore();
      }
      if (t < 4.2) { const [px, py] = MICRO.S(cam, F.x, F.y); CAP.note(c, t, { x: px + 22, y: py - 30, text: 'H₂O', t0: 3.55, t1: 4.2, ax: px + 6, ay: py - 6, col: 'w', lineCol: 'g7', box: true }); }
      if (t > 3.9 && t < 4.6) CAP.note(c, t, { x: 135, y: 392, text: 'HYDROGEN NUCLEI', t0: 3.95, t1: 4.5, align: 'center', col: 'y3', box: true, rate: 60 });
    } else {
      // the jump through the empty atom to the nucleus
      PIX.rect(c, 0, 0, W, H, 'n0');
      const u = sm(clamp((t - 4.72) / 0.45)), R = lerp(2.5, 26, u);
      MICRO.proton(c, W / 2, 232, R, { a: 1 });
      const m = sm(clamp((t - 5.2) / 0.35));
      MICRO.moment(c, W / 2, 232, MOM, 96 * m, { a: m, field: sm(clamp((t - 5.4) / 0.4)) });
      CAP.note(c, t, { x: 40, y: 300, text: '1 PROTON', t0: 5.05, ax: W / 2 - 18, ay: 246, col: 'y3', lineCol: 'y1', box: true });
      CAP.note(c, t, { x: 135, y: 372, text: 'QUANTUM SPIN', t0: 5.35, align: 'center', col: 'w', box: true });
      CAP.note(c, t, { x: 135, y: 384, text: '→ MAGNETIC MOMENT', t0: 5.5, align: 'center', col: 'c3', box: true });
    }
    field(c, S.t, t < 1.3 ? 0 : 0.5);
    // the scale of the dive
    const pxPerM = t < T_SCAN ? 700 / (scanCam(t).o ? SCAN.vec.dot(SCAN.vec.sub(target().P, scanCam(t).o), scanCam(t).fz) : 1) : t < 4.75 ? sAt(t) * 1e6 : 26 / 0.85e-15;
    MICRO.scaleBar(c, pxPerM, t < 0.3 ? 0 : 1);
    CAP.scene(c, t, { title: 'HYDROGEN NUCLEI', t0: 0.15, acc: 'y3' });
  },
  cues: () => [[0, 'dive', 0.9, 0, 1.3], [0.85, 'voxel', 0.7, 0], [1.3, 'micro_whoosh', 0.8, 0, 1.2], [2.0, 'cell_ticks', 0.5, 0.2, 0.6], [2.97, 'rush', 0.8, 0, 0.3],
    [3.25, 'water_ticks', 0.7, 0, 1.3], [3.55, 'type', 0.4], [3.9, 'nuclei_glow', 0.9, 0], [4.25, 'zoom_jump', 0.8, 0, 0.6], [4.95, 'proton_tone', 0.9, 0], [5.2, 'moment_on', 0.9, 0.1], [5.35, 'type', 0.35]],
};
})();
