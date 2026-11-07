// S21 FIND THE IODINE (80–84 s): inside the enhanced artery: plasma, red blood cells and the iodinated contrast molecules
// between them (violet). The camera dives fast into one molecule — a ring carrying three iodine atoms — and a tracking ring
// selects one of them. (The injected material is a stable molecule, not loose or radioactive iodine.)
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash, TAU = U.TAU;
const zAt = t => K.zl(1, 16, MO.expoIn(clamp((t - 0.6) / 1.5)) * 0.7 + MO.cubicOut(clamp((t - 0.6) / 1.9)) * 0.3);
const TGT = { x: 186, y: 330 };
const CELLS = []; for (let k = 0; k < 16; k++) CELLS.push({ x: h(k, 1) * 420 - 30, y: h(k, 2) * 700 - 30, r: 22 + 8 * h(k, 3), a: h(k, 4) * TAU });
const MOLS = []; for (let k = 0; k < 38; k++) MOLS.push({ x: h(k, 5) * 400 - 20, y: h(k, 6) * 680 - 20, a: h(k, 7) * TAU });
SC['s21_molecule'] = {
  draw(c, t, S) {
    const z = zAt(t), drift = S.t * 14;
    const tr = (x, y) => [TGT.x + (x - TGT.x) * z, TGT.y + (y - TGT.y) * z];
    PIX.rect(c, 0, 0, W, H, 'd0');
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (K.BAY(x, y) < 0.18) PIX.rect(c, x, y, 1, 1, 'd1');
    for (const e of CELLS) { const [x, y] = tr(K.wrap(e.x + drift, 440) - 40, e.y); const r = e.r * z; if (x < -r || x > W + r || y < -r || y > H + r) continue; c.fillStyle = P.d3; c.beginPath(); c.ellipse(x, y, r, r * 0.62, e.a, 0, TAU); c.fill(); c.fillStyle = P.d2; c.beginPath(); c.ellipse(x + 1, y + 1, r * 0.5, r * 0.3, e.a, 0, TAU); c.fill(); c.fillStyle = P.d4; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.25, r * 0.3, r * 0.12, e.a, 0, TAU); c.fill(); }
    for (const m of MOLS) { const [x, y] = tr(K.wrap(m.x + drift, 420) - 20, m.y); if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue; if (z < 3) FLOW.mol(c, x, y, m.a + S.t, 1.3 * Math.min(3, z)); }
    // the featured molecule, at the target point, resolving as the camera arrives
    const fr = clamp((z - 2) / 6);
    if (fr > 0) ATOM.molecule(c, TGT.x, TGT.y, 4 * z * 0.55, 0.3 + S.t * 0.25, S.t, { sel: t > 2.85 ? 1 : null });
    else FLOW.mol(c, TGT.x, TGT.y, 0.3 + S.t, 1.3 * z);
    CAP.ctx(c, t, { text: 'YODLU KONTRAST', t0: 0.3, t1: 3.6 });
    if (t > 2.9) { const { io } = ATOM.molPos(TGT.x, TGT.y, 4 * z * 0.55, 0.3 + S.t * 0.25); CAP.part(c, t, { text: 'I', ax: io[1][0] + 10, ay: io[1][1] - 10, x: io[1][0] + 40, y: io[1][1] - 70, t0: 2.95, t1: 3.85, col: 'v3', lineCol: 'g7' }); }
  },
  cues: [[0.3, 'type', 0.4], [0.6, 'zoom_rush', 1.0, 0, 1.5], [2.1, 'molecule_in', 0.8, 0, 0.6], [2.85, 'select', 0.9, 0.2]],
  xin: 0.25,
};
})();
