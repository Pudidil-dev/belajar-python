// S08 DIFFERENT TISSUES WEAKEN X-RAYS DIFFERENTLY (49–57 s): three samples are cut from the head slice — air beside the head,
// brain tissue, skull bone — and lined up as blocks of the same thickness (2 cm). The same stream of photons falls on
// each. Behind air almost all arrive; behind soft tissue about two thirds (e^(−0.20 × 2) = 67%); behind bone about a
// third (e^(−0.50 × 2) = 37%). Lost photons are scattered (purple) or absorbed (red) on the way. How much a material
// weakens the beam depends on what it is made of, its density, the path length and the photon energy.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const LANES = [{ name: 'AIR', mu: 0.0002, col: 'n2', edge: 'n3', x: 46 }, { name: 'SOFT TISSUE', mu: 0.200, col: 'p2', edge: 'p1', x: 135 }, { name: 'BONE', mu: 0.50, col: 'q5', edge: 'q3', x: 224 }];
const BY0 = 196, BH = 60, LW = 62, Y_TOP = 112, Y_DET = 330, VY = 150;     // block top / height (px = 2 cm), lane width, photon speed px/s
const NPH = 34;
// photons per lane: same emission times in every lane; each one's fate from e^(−μ x)
const PH = LANES.map((L, li) => { const out = []; for (let k = 0; k < NPH; k++) {
  const te = 2.0 + k * 0.105 + h(k, 7) * 0.02, x = L.x + (h(k, 3) - 0.5) * (LW - 16), u = h(k, 11 + li * 0);
  const pT = Math.exp(-L.mu * 2), pass = u < pT, depth = pass ? null : -Math.log(1 - (1 - u) * (1 - pT) / (1 - pT) * 0.999) / L.mu;
  const yHit = pass ? null : BY0 + clamp(h(k, 5) * 0.98, 0, 0.98) * BH, absorbed = !pass && h(k, 6) < (li === 2 ? 0.45 : 0.08);
  out.push({ te, x, pass, yHit, absorbed, sdir: h(k, 8) < 0.5 ? -1 : 1 });
} return out; });
const count = (li, t) => PH[li].reduce((n, p) => n + (p.pass && t > p.te + (Y_DET - Y_TOP) / VY ? 1 : 0), 0);
const total = (li, t) => PH[li].reduce((n, p) => n + (t > p.te + (Y_DET - Y_TOP) / VY ? 1 : 0), 0);
// the cut-outs leave the head slice (S07's last view) and settle as blocks
const lift = t => MO.k75(clamp((t - 0.3) / 1.3));
function drawHeadGhost(c, t) {
  const a = 1 - MO.smooth(clamp((t - 0.6) / 0.8)); if (a <= 0) return;
  const cam = { x: CT.OX, y: CT.OY + 4, s: 1.05, cx: 135, cy: 240 };
  G2.table(c, cam, a); G2.head(c, cam, { alpha: a });
}
// where each sample sat in the head view (screen), for the lift-out
const SRC = () => { const cam = { x: CT.OX, y: CT.OY + 4, s: 1.05, cx: 135, cy: 240 }; return [G2.S(cam, CT.OX - 112, CT.OY + 40), G2.S(cam, CT.OX + 28, CT.OY + 30), G2.S(cam, CT.OX + 66, CT.OY + 62)]; };
SC['s08_attenuation'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k');
    drawHeadGhost(c, t);
    const q = lift(t), src = SRC();
    // detector strip at the bottom: one cell per lane
    const da = MO.smooth(clamp((t - 1.4) / 0.4));
    if (da > 0) { c.save(); c.globalAlpha = da; for (const L of LANES) { PIX.rect(c, L.x - LW / 2, Y_DET, LW, 10, 'e1'); PIX.rect(c, L.x - LW / 2, Y_DET, LW, 2, 'e2'); } c.restore(); }
    LANES.forEach((L, i) => {
      const [sx, sy] = src[i], bw = lerp(16, LW, q), bh = lerp(14, BH, q), cx = lerp(sx, L.x, q), cy = lerp(sy, BY0 + BH / 2, q);
      if (t > 0.25) { PIX.rect(c, Math.round(cx - bw / 2) - 1, Math.round(cy - bh / 2) - 1, Math.round(bw) + 2, Math.round(bh) + 2, L.edge); PIX.rect(c, Math.round(cx - bw / 2), Math.round(cy - bh / 2), Math.round(bw), Math.round(bh), L.col); }
      if (i === 0 && t > 0.25) { c.save(); c.globalAlpha = 0.6; PIX.text(c, '·', cx - 4, cy - 2, 'n4', { shadow: null }); c.restore(); }
    });
    // photons
    c.setTransform(1, 0, 0, 1, 0, 0);
    LANES.forEach((L, li) => {
      for (const p of PH[li]) {
        const age = t - p.te; if (age < 0) continue;
        const y = Y_TOP + age * VY;
        if (!p.pass && y >= p.yHit) {
          const a2 = (y - p.yHit) / VY;
          if (p.absorbed) { if (a2 < 0.3) FX.flash(c, p.x, p.yHit, 4 * (1 - a2 / 0.3), 'r2', 1 - a2 / 0.3); }
          else if (a2 < 0.6) FX.ph(c, p.x + p.sdir * a2 * 70, p.yHit + a2 * 25, p.sdir > 0 ? 0.35 : Math.PI - 0.35, 6.5, 8, 2, 1 - a2 / 0.6, ['v0', 'v1', 'v2', 'v3']);
          continue;
        }
        if (y > Y_DET) { if (y < Y_DET + 8) FX.flash(c, p.x, Y_DET + 2, 2, 'e3', 1); continue; }
        FX.ph(c, p.x, y, Math.PI / 2, 4.5, 7, 2, 1);
      }
    });
    // counters: the transmitted share behind each block
    const ca = MO.smooth(clamp((t - 2.6) / 0.3)) * (1 - MO.smooth(clamp((t - 7.75) / 0.2)));
    if (ca > 0) LANES.forEach((L, li) => {
      const n = count(li, t), tot = Math.max(1, total(li, t)), f = n / tot, pct = Math.round(Math.exp(-L.mu * 2) * 100);
      c.save(); c.globalAlpha = ca;
      PIX.rect(c, L.x - LW / 2, Y_DET + 16, LW, 6, 'g2'); PIX.rect(c, L.x - LW / 2, Y_DET + 16, Math.round(LW * f), 6, 'y2');
      PIX.text(c, `${pct}%`, L.x, Y_DET + 26, 'w', { align: 'center', n: t > 4.6 ? 9 : 0 });
      c.restore();
    });
    // names above the blocks (all three at once: they are one comparison)
    LANES.forEach((L, li) => CAP.note(c, t, { x: L.x, y: BY0 - 16, text: L.name, t0: 1.55 + li * 0.15, t1: 7.85, col: ['g8', 'p3', 'q5'][li], align: 'center', box: true }));
    CAP.note(c, t, { x: 135, y: BY0 + BH + 8, text: 'same thickness: 2 cm', t0: 1.9, t1: 4.2, col: 'g7', align: 'center', box: true });
    CAP.note(c, t, { x: 20, y: 372, text: 'MORE WEAKENING: DENSER, THICKER,', t0: 5.1, t1: 7.85, col: 'g9', box: true });
    CAP.note(c, t, { x: 20, y: 383, text: 'HIGHER ATOMIC NUMBER, LOWER ENERGY', t0: 5.35, t1: 7.85, col: 'g9', box: true });
    CAP.cap(c, t, { l1: 'ATTENUATION', l2: ['DIFFERENT TISSUES WEAKEN', 'X-RAYS DIFFERENTLY'], t0: 0.12, tSwap: 2.2, t1: 7.85, acc: 'y3' });
  },
  cues: () => {
    const q = [[0.3, 'lift', 0.7, 0, 1.3], [1.55, 'tag', 0.4, -0.5], [1.7, 'tag', 0.4, 0], [1.85, 'tag', 0.4, 0.5], [2.0, 'beam_on', 0.5, 0, 5.6],
      [4.6, 'tone_air', 0.8, -0.6], [4.85, 'tone_tissue', 0.8, 0], [5.1, 'tone_bone', 0.8, 0.6], [5.4, 'tag', 0.3, -0.3], [7.4, 'follow_down', 0.6, 0, 0.6]];
    return q;
  },
};
})();
