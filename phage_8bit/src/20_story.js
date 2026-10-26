'use strict';
// ============================================================================
// STORY STATE — one continuous world, one continuous camera.
// Grid: 130 BPM, 39 bars = 72.000 s (13 beats = 6 s). Every key event sits on
// the beat grid. The same T4 phage, the same E. coli cell (C0) and the same
// viral genome are followed from frame one to the burst; the phage assembled
// in scene 18 is the one that flies to a new cell and becomes frame one.
// ============================================================================
const BEAT = 60 / 130, E8 = BEAT / 2, BARL = 4 * BEAT;
const barT = n => (n - 1) * BARL, e8 = n => n * E8;
const SC_T = [0, 8, 17, 26, 39, 48, 61, 74, 91, 104, 121, 139, 156, 173, 191, 204, 217, 230, 243, 260, 272, 288, 312].map(e8);
// key moments (s)
const T_REV = barT(2), T_TGT = 6 * BEAT, T_GO = SC_T[2];
const T_TOUCH = 13.5 * BEAT, T_LOCK = [14.5, 15, 15.5, 16, 16.5, 17].map(b => b * BEAT);
const T_BP = barT(6), T_STF = [21, 21.5, 22, 22.5].map(b => b * BEAT);
const T_CHG = barT(7), T_SNAP = 25 * BEAT;
const T_OM = 31 * BEAT, T_PG = 32 * BEAT, T_IM = 34 * BEAT, T_PORE = 35 * BEAT, T_DNA0 = barT(10);
const T_INJ0 = 37.5 * BEAT, T_INJ1 = 44.5 * BEAT;
const T_TAKE = barT(14);
const T_POL = 62 * BEAT, T_TX0 = 63 * BEAT, T_TX1 = 69.5 * BEAT;
const T_PART = [73, 74, 75].map(b => b * BEAT);
const T_COPY = [80, 82, 84, 86].map(b => b * BEAT);
const T_FACT = SC_T[13];
const T_TILE0 = 96.5 * BEAT, T_TILE1 = 100.5 * BEAT;
const T_DETACH = 102.5 * BEAT, T_MOTOR = 103.5 * BEAT, T_PACK0 = 104 * BEAT, T_PACK1 = 107.5 * BEAT;
const T_WEDGE0 = 109 * BEAT, T_TUBE0 = 110.5 * BEAT, T_SH0 = 112 * BEAT, T_CAP = 114 * BEAT;
const T_DOCK = 117 * BEAT, T_FIB0 = 118 * BEAT, T_DONE = barT(31);
const T_FILL0 = 122 * BEAT, T_FILL1 = 128 * BEAT;
const T_LYS = SC_T[19], T_HOL = 130.5 * BEAT, T_ENDO = 131.5 * BEAT, T_CRACK = 132 * BEAT;
const T_BURST = barT(35), T_REL = SC_T[21], T_LAND = barT(38), T_PUSH = 69.3;
// ---------------------------------------------------------------- the cells
const C0 = { cx: 0, cy: 300, a: 0, hl: 260, r: 100, seed: 1, detail: true, receptors: true };
const CELLS_O = [
  { cx: 300, cy: -100, a: -0.45, hl: 250, r: 95, seed: 2, detail: true, receptors: true },
  { cx: -300, cy: -120, a: 0, hl: 260, r: 100, seed: 3, detail: true, receptors: true },      // = C0 + LOOP_SHIFT: the next cycle's cell
  { cx: -310, cy: 640, a: 0.3, hl: 240, r: 95, seed: 4 },
  { cx: 320, cy: 640, a: -0.7, hl: 250, r: 98, seed: 5 },
];
let HOST0 = null, HOSTO = [];
// sites (C0-local) kept clear of host ribosomes so the close-ups read cleanly
const SITES = [[35, -177, 26], [64, -140, 22], [-80, -100, 34], [-58, -80, 30], [28, -60, 34], [64, -40, 28], [-20, -86, 26], [62, -96, 26]];
function siteExcl(lx, ly, m) {
  for (const [x, y, r] of SITES) if (Math.hypot(lx - x, ly - y) < r + m * 0.3) return true;
  if (VDNA) for (let s = 0; s < VDNA.L; s += 4) { const q = VDNA.at(s); if (Math.hypot(lx - q[0], ly - q[1]) < 9 + m * 0.2) return true; }
  for (let i = 0; i < M1_CP.length; i += 2) if (Math.hypot(lx - M1_CP[i], ly - M1_CP[i + 1]) < 20 + m * 0.3) return true;
  return false;
}
// ---------------------------------------------------------------- receptors and the hero's fibres
function receptorS(k) { return k * 15.5 + 3.5 * hash(k + 101); }
function receptorNear(s) { const k = Math.round(s / 15.5); let best = receptorS(k); for (const kk of [k - 1, k + 1]) if (Math.abs(receptorS(kk) - s) < Math.abs(best - s)) best = receptorS(kk); return best; }
// fibre i -> receptor arc position and bind time (index order: back L, back R, side L, side R, front L, front R)
const BIND = [[-12, 5], [12, 4], [-40, 2], [40, 3], [-23, 0], [23, 1]].map(([s, o]) => ({ s: receptorNear(s), t: T_LOCK[o] }));
// ---------------------------------------------------------------- the hero phage (original)
const A0 = [0, -60];
function heroFree(t) {      // free drift + turn + approach (t may be < 0: the progeny's arrival at the end uses heroFree(t - DUR))
  const bob = 0.8 * Math.sin(TAU * t / 1.8);
  let x = A0[0], y = A0[1] + 3 * t + bob, a = -0.17 + 0.03 * Math.sin(TAU * t / 3.6);
  if (t > 2.3) a = lerp(a, 0, K75(seg(t, 2.3, 3.4)));
  if (t > T_GO) { const k = K75(seg(t, T_GO, 6.15)); y = lerp(y, 16, k); }
  return [x, y, a];
}
function heroExt(t) {       // tail fibres: folded along the sheath -> unfold like landing legs on the beat -> spread on the approach
  const tb = [0.46, 0.46, 0.69, 0.69, 0.92, 0.92];
  return tb.map((b, i) => { let e = backOut(clamp((t - (b - 0.3)) / 0.42, 0, 1), 1.6); if (t > T_GO) e += 0.22 * K75(seg(t, T_GO + 0.3, 5.6)); return e; });
}
function heroY(t) {         // baseplate height on the approach / attachment
  if (t < 6.15) return heroFree(t)[1];
  let y = 16;
  y = lerp(y, 22, K75(seg(t, 8.0, 9.0)));
  y = lerp(y, 32.5, backOut(seg(t, 9.0, T_BP + 0.05), 0.6));
  return y;
}
function heroState(t) {
  const st = { x: 0, y: heroY(t), a: 0, s: 0, bp: 0, stf: 0, dna: 1, ghost: 0, tube: 0, dnaFlow: 0 };
  if (t < 6.15) { const f = heroFree(t); st.x = f[0]; st.y = f[1]; st.a = f[2]; }
  const ext = heroExt(t);
  const fibL = FIB_ROOT.map((_, i) => fibPose(i, ext[i], t, 0, 1));
  if (t >= 5.6) {             // reach for the receptors (IK), lock on the beat
    const c = Math.cos(st.a), s = Math.sin(st.a);
    st.fibW = fibL.map((q, i) => {
      const R = fibRoot(i, st.bp), rw = [st.x + R[0] * c - R[1] * s, st.y + R[0] * s + R[1] * c];
      const free = [st.x + q[2] * c - q[3] * s, st.y + q[2] * s + q[3] * c];
      const B = BIND[i];
      let tgt = cellAt(C0, B.s, -1.2);
      if (i === 4 && t < B.t) {       // the first fibre taps a bare spot, then slides to a receptor
        const bare = cellAt(C0, B.s - 9, -0.6), k = seg(t, T_TOUCH + 0.05, B.t);
        tgt = [lerp(bare[0], tgt[0], smooth(k)), lerp(bare[1], tgt[1], smooth(k))];
        const reach = K75(seg(t, 5.6, T_TOUCH));
        tgt = [lerp(free[0], tgt[0], reach), lerp(free[1], tgt[1], reach)];
      } else { const reach = K75(seg(t, B.t - 0.55, B.t)); tgt = [lerp(free[0], tgt[0], reach), lerp(free[1], tgt[1], reach)]; }
      const sd = FIB_ROOT[i][2];
      const k1 = ik(rw[0], rw[1], tgt[0], tgt[1], PHG.f1, PHG.f2, -sd), k2 = ik(rw[0], rw[1], tgt[0], tgt[1], PHG.f1, PHG.f2, sd);
      const kn = (k1[0] - rw[0]) * sd > (k2[0] - rw[0]) * sd ? k1 : k2;
      const reachK = i === 4 ? seg(t, 5.6, T_TOUCH) : seg(t, B.t - 0.55, B.t);
      const fk = [st.x + q[0] * c - q[1] * s, st.y + q[0] * s + q[1] * c];
      const kk = [lerp(fk[0], kn[0], smooth(reachK)), lerp(fk[1], kn[1], smooth(reachK))];
      return [kk[0], kk[1], tgt[0], tgt[1]];
    });
  } else st.fibL = fibL;
  st.bp = backOut(seg(t, 9.0, T_BP + 0.08), 1.2);
  st.stf = clamp((t - T_STF[0] + 0.1) / (T_STF[3] - T_STF[0] + 0.2), 0, 1);
  st.charge = seg(t, T_CHG, T_SNAP);
  if (t >= T_SNAP) st.wave = seg(t, T_SNAP, T_SNAP + 0.16);
  st.tube = 4.5 * K75(seg(t, T_IM, T_PORE));
  st.dnaFlow = t >= T_DNA0 && t < T_INJ1 + 0.3 ? 1 : 0;
  st.dna = 1 - smooth(seg(t, T_INJ0, T_INJ1));
  st.ghost = t > T_INJ1 - 0.15 ? 1 : 0;
  st.glint = seg(t, 1.12, 1.62);
  return st;
}
