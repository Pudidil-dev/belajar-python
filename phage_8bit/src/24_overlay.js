'use strict';
// ============================================================================
// PER-SCENE TEXT + RENDER LOOP
// ============================================================================
const SCENE_NAMES = ['BACTERIOPHAGE', 'TARGET', 'LYTIC CYCLE BEGINS', 'ATTACHMENT', 'FIRM ANCHORING', 'TAIL SHEATH CONTRACTION', 'MEMBRANE PENETRATION',
  'DNA INJECTION', 'INSIDE THE BACTERIUM', 'HOST TAKEOVER', 'VIRAL GENE EXPRESSION', 'RIBOSOMES MAKE VIRAL PROTEINS', 'VIRAL DNA REPLICATION', 'COMPONENT FACTORY',
  'HEAD ASSEMBLY', 'DNA PACKAGING', 'TAIL ASSEMBLY', 'FULL VIRUS MATURATION', 'CELL FILLS WITH PHAGES', 'LYSIS PREPARATION', 'CELL BURSTS', 'RELEASE AND LOOP'];
function sceneIndex(t) { for (let i = 1; i < SC_T.length; i++) if (t < SC_T[i]) return i - 1; return SC_T.length - 2; }
const CAPS = [
  [1.95, 3.85, 'IT HIJACKS BACTERIA TO REPRODUCE'], [4.0, 5.94, 'LYTIC CYCLE BEGINS'], [6.05, 8.94, '1. ATTACHMENT'], [9.05, 11.0, 'LOCKED ONTO THE CELL'],
  [11.12, 14.0, '2. DNA INJECTION BEGINS'], [17.12, 20.92, 'VIRAL DNA ENTERS THE CELL'], [24.05, 27.86, '3. HOST TAKEOVER'],
  [27.98, 32.0, 'VIRAL INSTRUCTIONS ARE COPIED'], [32.14, 35.92, 'HOST RIBOSOMES BUILD VIRAL PARTS'], [36.05, 39.86, 'VIRAL DNA IS REPLICATED'],
  [39.98, 44.0, 'THE CELL BECOMES A VIRUS FACTORY'], [44.14, 47.0, 'CAPSID HEADS ASSEMBLE'], [47.14, 50.0, 'DNA IS PACKED INTO NEW HEADS'],
  [50.14, 53.0, 'TAILS ASSEMBLE'], [53.14, 56.0, 'NEW PHAGES ARE ASSEMBLED'], [56.14, 59.92, 'THE BACTERIUM FILLS WITH VIRUSES'], [60.05, 62.7, '4. LYSIS'],
  [66.6, 69.6, 'ONE VIRUS BECAME MANY'],
];
function hookTitle(t) {
  if (!UI_ON || t > T_REV + 0.12) return;
  const out = t > T_REV - 0.05 ? clamp(1 - (t - (T_REV - 0.05)) / 0.17, 0, 1) : 1;
  const n1 = clamp((t - 0.22) * 40, 0, 13) * out, n2 = (t - 0.7) * 48 * out;
  if (n1 > 0) {
    const tw = textW(FT, 'BACTERIOPHAGE', 2, true), x = Math.round(CX - tw / 2), y = 38;
    text(FT, 'BACTERIOPHAGE', CX, y, { sc: 2, bold: true, align: 'center', c: P.PH4, ol: P.SH, n: n1, shadow: P.PH1, sd: 2 });
    const gk = K75(clamp((t - 0.3) / 0.35, 0, 1)) * out; rect(Math.round(CX - tw / 2 * gk), y + 25, Math.round(CX + tw / 2 * gk), y + 26, P.PH3);
  }
  if (n2 > 0) {
    const L = ['A VIRUS THAT', 'INFECTS BACTERIA']; let left = n2;
    L.forEach((ln, i) => { if (left <= 0) return; const lw = textW(FL, ln, 2), x = Math.round(CX - lw / 2), y = 70 + i * 18; text(FL, ln, x, y, { sc: 2, n: left, c: P.INK, shadow: P.SH, sd: 2 }); left -= ln.length + 1; });
  }
}
function overlays(cam, t) {
  hookTitle(t);
  for (const [a, b, s] of CAPS) caption(s, a, b, t);
  const hs = heroState(Math.min(t, T_BURST - 0.01));
  const HP = (lx, ly) => { const c = Math.cos(hs.a), s = Math.sin(hs.a); return [hs.x + lx * c - ly * s, hs.y + lx * s + ly * c]; };
  // S02 target
  if (t >= T_TGT && t < 4.2) { brackets(cam, C0, t, T_TGT); wtag(cam, 'E. COLI', [C0.cx + 70, C0.cy - 40], 200, 250, T_TGT + 0.15, 3.85, t, P.BT4); }
  // S04 - S06
  wtag(cam, 'RECEPTOR', cellAt(C0, BIND[4].s, -2), 26, 350, T_LOCK[0] + 0.12, 8.9, t, P.BT4);
  wtag(cam, 'BASEPLATE', HP(14, -3), 172, 300, T_BP + 0.1, 11.0, t, P.PH4);
  wtag(cam, 'SHEATH CONTRACTS', HP(8, -12), 150, 150, T_SNAP + 0.25, 13.95, t, P.PH4);
  // S07 envelope layers
  wtag(cam, 'OUTER MEMBRANE', [3, 42], 150, 120, T_OM, 17.0, t, P.BT4);
  wtag(cam, 'CELL WALL', [3, 46.5], 150, 180, T_PG + 0.1, 17.0, t, P.PG2);
  wtag(cam, 'INNER MEMBRANE', [3, 51], 150, 240, T_IM, 17.0, t, P.BT3);
  // S08
  wtag(cam, 'CAPSID STAYS OUTSIDE', HP(12, -62), 128, 96, 18.1, 20.9, t, P.PH4);
  // S09 interior tags
  const vg = C0w(VDNA.at(VDNA.L * 0.35)[0], VDNA.at(VDNA.L * 0.35)[1]);
  wtag(cam, 'VIRAL DNA', vg, 170, 100, 21.46, 23.95, t, P.VD3);
  const nearest = (arr, x, y) => arr.reduce((b, q) => Math.hypot((q.cx === undefined ? q.x : q.cx) - x, (q.cy === undefined ? q.y : q.cy) - y) < Math.hypot((b.cx === undefined ? b.x : b.cx) - x, (b.cy === undefined ? b.y : b.cy) - y) ? q : b);
  const lp = nearest(HOST0.loops, 25, -70), lp2 = nearest(HOST0.loops, -15, -45), rf = nearest(HOST0.free, -55, -150);
  wtag(cam, 'BACTERIAL DNA', C0w(lp.cx, lp.cy), 150, 300, 21.92, 23.95, t, P.BD2);
  const rb = C0w(rf.x, rf.y);
  wtag(cam, 'RIBOSOMES', rb, 24, 330, 22.38, 23.95, t, P.RB3);
  // S10
  wtag(cam, 'HOST DNA CHOPPED UP', C0w(lp2.cx, lp2.cy), 60, 360, 25.1, 27.8, t, P.BD2);
  // S11
  { const q = VDNA.at(VDNA.sT + 16); wtag(cam, 'VIRAL DNA', C0w(q[0], q[1] + 2), 150, 330, 29.25, 31.95, t, P.VD3); }
  { const q = VDNA.at(pol2S(t)); wtag(cam, 'VIRAL mRNA', C0w(q[0] - 1, q[1] - 12), 36, 120, 29.9, 31.95, t, P.MR3); }
  // S12
  if (t > 32 && t < 36) {
    const r1 = riboM1(1, t)[0];
    wtag(cam, 'RIBOSOME', r1, 160, 120, 32.6, 33.6, t, P.RB3);
    const names = ['HEAD PROTEIN', 'TAIL PROTEIN', 'FIBER PROTEIN'], pos = [[24, 120], [24, 300], [150, 380]];
    for (let k = 0; k < 3; k++) { const [w, ang] = riboM1(k, t), d = PART_DRIFT[k], age = t - T_PART[k], k2 = eout(clamp(age / 3, 0, 1)); const px = w[0] - Math.sin(ang) * 9 + d[0] * k2, py = w[1] + Math.cos(ang) * 9 + d[1] * k2; wtag(cam, names[k], [px, py], pos[k][0], pos[k][1], T_PART[k] + 0.1, 35.6, t, [P.PH4, P.SV3, P.OR3][k]); }
  }
  // S13 copy counter
  if (t > T_COPY[0] - 0.1 && t < 39.86 && UI_ON) {
    const i = T_COPY.filter(x => t >= x).length, nC = [1, 2, 4, 8, 16][i], k = i ? backOut(clamp((t - T_COPY[i - 1]) / 0.25, 0, 1), 2) : 1;
    const s = String(nC), x = 196, y = 300, sc = 2 + Math.round(k > 1.05 ? 1 : 0);
    rect(x - 6, y - 6, x + 52, y + 36, P.K0); frame(x - 6, y - 6, x + 52, y + 36, P.VD1);
    text(FL, 'x' + s, x + 23, y, { sc: 2 + (k > 1.08 ? 1 : 0), c: P.VD3, align: 'center' });
    text(FM, 'COPIES', x + 23, y + 22, { sc: 2, c: P.SUB, ol: null, align: 'center' });
  }
  // S14 factory part tags
  if (t > 41.4 && t < 44.0) {
    const u1 = UNITS[3], u2 = UNITS[11], u3 = UNITS[17];
    const R = (u, x, y) => { const w = unitWorld(u), c = Math.cos(u.a), s = Math.sin(u.a); return [w[0] + x * c - y * s, w[1] + x * s + y * c]; };
    wtag(cam, 'HEADS', R(u1, -10, -28), 24, 110, 41.54, 43.95, t, P.PH4);
    wtag(cam, 'TAILS', R(u2, 11, 30), 196, 330, 42.0, 43.95, t, P.SV3);
    wtag(cam, 'FIBERS', R(u3, -17, 30), 24, 360, 42.46, 43.95, t, P.OR3);
  }
  // S15 - S17
  { const H_ = heroHeadState(t), hw = C0w(H_.x + 14, H_.y - 2); wtag(cam, 'CAPSID PROTEINS', hw, 140, 120, T_TILE0 + 0.2, 46.95, t, P.PH4); }
  { const H_ = heroHeadState(t), hw = C0w(H_.x, H_.y + 4); wtag(cam, 'PACKAGING MOTOR', hw, 120, 360, T_MOTOR + 0.1, T_PACK1, t, P.OR3); }
  { const w = C0w(TAIL_A[0], TAIL_A[1]); wtag(cam, 'BASEPLATE', [w[0] - 8, w[1] - 2], 24, 330, T_WEDGE0 + 0.3, 52.95, t, P.PH4); wtag(cam, 'TUBE', [w[0] - 2, w[1] - 20], 24, 150, T_TUBE0 + 0.2, 52.95, t, P.SV3); wtag(cam, 'SHEATH', [w[0] + 6, w[1] - 14], 180, 220, T_SH0 + 0.2, 52.95, t, P.PH4); }
  // S19 counter
  if (t > T_FILL0 - 0.3 && t < 59.92 && UI_ON) {
    const nDone = UNITS.filter(u => t >= u.done).length + (t >= T_DONE ? 1 : 0) + (t >= 55.4 ? 1 : 0);
    const shown = t > 59.0 ? '100+' : String(Math.round(nDone * 100 / (UNITS.length + 2)));
    const x = 150, y = 300, bw = 98;
    rect(x - 6, y - 6, x + bw, y + 36, P.K0); frame(x - 6, y - 6, x + bw, y + 36, P.PH2);
    text(FL, shown, x + bw / 2 - 3, y, { sc: 2, c: P.PH4, align: 'center' });
    text(FM, 'NEW PHAGES', x + bw / 2 - 3, y + 22, { sc: 2, c: P.SUB, ol: null, align: 'center' });
  }
  // S20
  { const Wp = cellAt(C0, W_S, 2); wtag(cam, 'ENZYMES WEAKEN THE WALL', Wp, 30, 340, T_ENDO + 0.2, 62.6, t, P.LY3); }
  chip('SIMPLIFIED', 28.3, 31.9, t, P.N5);
  chip('TIME-LAPSE (~25 MIN)', 40.2, 43.9, t, P.N5);
}
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  const cam = camAt(t);
  drawWorld(cam, t);
  overlays(cam, t);
}
