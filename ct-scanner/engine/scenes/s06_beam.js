// S06 THE BEAM IS FILTERED AND SHAPED (32–39 s): the X-rays leave the tube window as many separate golden photons inside a
// widening envelope (not a laser). Seen first from the side (the patient axis across the screen, as the tube was): a flat
// metal filter stops low-energy photons (red events — they would only add dose); the collimator blades close in and set
// the beam's thickness. The view turns in 2.5D to face the scan plane: a bowtie filter, thick at the edges, thins the beam
// where the patient is thinner; pulling back, the shaped beam is a wide fan in the scan plane and a thin cone across the
// rows of the curved detector. Beam coordinates (mm): origin at the focal spot, x across the fan, y down, z patient axis.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp, TAU = U.TAU;
const FAN = 26 * Math.PI / 180, SDD = 1040, YF = 64, YB0 = 70, YJ = 100, ZDET = 70;
const bowT = x => 3 + 17 * Math.min(1, (x / 75) ** 2);                    // bowtie thickness at x (mm)
const gapAt = t => lerp(30, 6.5, MO.cubicInOut(clamp((t - 2.0) / 1.0)));   // collimator half-gap at the jaws (z, mm)
// view: yaw (π/2 side → 0 front), pitch (oblique), scale and centre
const viewAt = t => {
  const yaw = Math.PI / 2 * (1 - MO.k75(clamp((t - 3.4) / 1.2)));
  const pitch = 0.42 * MO.sineInOut(clamp((t - 4.9) / 0.8)) * (1 - MO.sineInOut(clamp((t - 6.2) / 0.75)));
  let s, cy0;
  if (t < 0.4) { s = 2.1; cy0 = 0; }
  else if (t < 3.3) { const q = MO.sineInOut(clamp((t - 0.4) / 1.2)); s = lerp(2.1, 2.5, q); cy0 = lerp(0, 72, q); }
  else if (t < 4.7) { const q = MO.sineInOut(clamp((t - 3.3) / 1.2)); s = K.zl(2.5, 1.45, q); cy0 = lerp(72, 66, q); }
  else { const q = MO.k75(clamp((t - 4.7) / 1.6)); s = K.zl(1.45, 0.25, q); cy0 = lerp(66, 545, q); }
  return { yaw, pitch, s, cx: lerp(156, 135, MO.smooth(clamp((t - 0.3) / 1.0))), cy: lerp(286, 240, MO.smooth(clamp((t - 0.3) / 1.0))), y0: cy0 };
};
const proj = (v, x, y, z) => {
  const cyw = Math.cos(v.yaw), syw = Math.sin(v.yaw), sx = x * cyw + z * syw, d = -x * syw + z * cyw;
  const yy = (y - v.y0) * Math.cos(v.pitch) - d * Math.sin(v.pitch);
  return [v.cx + v.s * sx, v.cy + v.s * yy, d * Math.cos(v.pitch) + (y - v.y0) * Math.sin(v.pitch)];
};
// ---------- solids as faces (painter's order) ----------
function boxFaces(x0, x1, y0, y1, z0, z1, col) {
  const V = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  return [[0, 1, 2, 3, 0], [4, 5, 6, 7, 1], [0, 1, 5, 4, 2], [3, 2, 6, 7, 3], [0, 3, 7, 4, 4], [1, 2, 6, 5, 5]].map(f => ({ pts: f.slice(0, 4).map(i => V[i]), shade: f[4], col }));
}
const SHADE = [0.7, 0.55, 1.0, 0.45, 0.8, 0.6];
function drawFaces(c, v, faces) {
  const fs = faces.map(f => { const q = f.pts.map(p => proj(v, ...p)); return { q, d: q.reduce((a, b) => a + b[2], 0) / q.length, f }; });
  fs.sort((a, b) => a.d - b.d);
  for (const { q, f } of fs) {
    const ramp = f.col, k = Math.min(ramp.length - 1, Math.round(SHADE[f.shade] * (ramp.length - 1)));
    c.beginPath(); q.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
    c.fillStyle = P[ramp[k]]; c.fill();
    c.strokeStyle = P[ramp[0]]; c.lineWidth = 1; c.stroke();
  }
}
// the bowtie as slices across x (each a box from YB0 to YB0 + thickness)
function bowtieFaces() {
  const out = [];
  for (let i = -8; i < 8; i++) { const x0 = i * 9.4, x1 = x0 + 9.4, tk = bowT((x0 + x1) / 2); out.push(...boxFaces(x0, x1, YB0, YB0 + tk, -34, 34, ['g2', 'g4', 'g6', 'g7', 'g8'])); }
  return out;
}
const BOW = bowtieFaces();
// ---------- photons ----------
// clock: the beam runs slow in the close-ups and speeds up for the wide view
const vAt = t => t < 4.6 ? 70 : lerp(70, 900, MO.cubicIn(clamp((t - 4.6) / 1.4)));
const TAUt = (() => { const n = 800, tab = new Float64Array(n + 1); let acc = 0; for (let i = 1; i <= n; i++) { acc += vAt((i - 0.5) / n * 8) * 8 / n; tab[i] = acc; } return t => { const f = clamp(t / 8) * n, i = Math.min(n - 1, Math.floor(f)); return tab[i] + (tab[i + 1] - tab[i]) * (f - i); }; })();
const PH = [];
for (let k = 0; k < 260; k++) {
  const te = -0.6 + k * 0.03, ax = (h(k, 1) * 2 - 1) * FAN, az = (h(k, 2) * 2 - 1) * Math.atan(34 / 100), u = h(k, 3);
  const E = 20 + 100 * (1 - Math.sqrt(1 - u * 0.98));                       // more low-energy photons than high (Kramers-like)
  PH.push({ te, ax, az, E, r1: h(k, 4), r2: h(k, 5) });
}
const dirOf = p => { const dx = Math.tan(p.ax), dz = Math.tan(p.az); return [dx, 1, dz]; };
// fate along y: filter (low energy), bowtie (thick edges), jaws (outside the gap at the time it gets there), else the detector
function fate(p) {
  if (p.fate) return p.fate;
  const pFilt = p.E < 32 ? 0.85 : p.E < 45 ? 0.3 : 0.04, pBow = clamp((bowT(Math.tan(p.ax) * YB0) - 3) / 17) * 0.75;
  if (p.r1 < pFilt) return (p.fate = { y: YF + 1.5, kind: 'filter' });
  if (p.r2 < pBow) return (p.fate = { y: YB0 + bowT(Math.tan(p.ax) * YB0) * 0.5, kind: 'bowtie' });
  return (p.fate = { y: SDD, kind: 'jaws?' });
}
function photonAt(p, t) {
  if (t < p.te) return null;
  const r = TAUt(t) - TAUt(Math.max(0, p.te)) + Math.max(0, -p.te) * 70, d = dirOf(p);
  let yStop = fate(p).y, kind = fate(p).kind;
  if (kind === 'jaws?') {
    // reaching the jaws: its |z| there against the gap at that moment
    const tJ = p.te + (YJ - 0) / 70, zJ = d[2] * YJ;
    if (Math.abs(zJ) > gapAt(tJ)) { yStop = YJ; kind = 'jaw'; } else kind = 'det';
  }
  const y = Math.min(r, yStop), done = r >= yStop;
  return { x: d[0] * y, y, z: d[2] * y, done, kind, age: done ? (r - yStop) / 70 : 0, d };
}
// ---------- the scene ----------
function drawBeam(c, t, S) {
  const v = viewAt(t), gap = gapAt(t);
  PIX.rect(c, 0, 0, W, H, 'k');
  // the envelope: fan × cone from the focal spot to the detector, dithered
  const zH = y => Math.min(34 * y / 100, gap * y / YJ);
  const env = [[-Math.tan(FAN) * SDD, SDD, -zH(SDD)], [Math.tan(FAN) * SDD, SDD, -zH(SDD)], [Math.tan(FAN) * SDD, SDD, zH(SDD)], [-Math.tan(FAN) * SDD, SDD, zH(SDD)]].map(p => proj(v, ...p));
  const o = proj(v, 0, 0, 0);
  // a faint envelope (sparse dither) with thin edges: the beam is the photons, not a solid ray
  { const img = c.getImageData(0, 0, W, H), dd = img.data, col = PIX.hex(P.y1), poly = [o, ...env];
    const inside = (x, y) => { let s0 = 0, ok = false; for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0]]) { const A = env[a], B = env[b];
      const s1 = Math.sign((A[0] - o[0]) * (y - o[1]) - (A[1] - o[1]) * (x - o[0])), s2 = Math.sign((B[0] - A[0]) * (y - A[1]) - (B[1] - A[1]) * (x - A[0])), s3 = Math.sign((o[0] - B[0]) * (y - B[1]) - (o[1] - B[1]) * (x - B[0]));
      if (s1 === s2 && s2 === s3 && s1 !== 0) ok = true; } return ok; };
    for (let y = 0; y < H; y += 1) for (let x = (y & 1); x < W; x += 2) { if (K.BAY(x, y) > 0.14 || !inside(x, y)) continue; const i = (y * W + x) * 4; dd[i] = col[0]; dd[i + 1] = col[1]; dd[i + 2] = col[2]; }
    c.putImageData(img, 0, 0);
    for (const e of env) PIX.bline(c, o[0], o[1], e[0], e[1], 'y1'); }
  // tube port + window (top), flat filter, bowtie, jaws, detector rows
  const faces = [];
  faces.push(...boxFaces(-60, 60, 40, 52, -40, 40, ['g1', 'g2', 'g3', 'g4', 'g5']));
  faces.push(...boxFaces(-70, 70, YF, YF + 3, -36, 36, ['g5', 'g6', 'g7', 'g8', 'g9']));
  faces.push(...BOW);
  faces.push(...boxFaces(-80, 80, YJ, YJ + 8, gap, 46, ['g1', 'g2', 'g3', 'g4']), ...boxFaces(-80, 80, YJ, YJ + 8, -46, -gap, ['g1', 'g2', 'g3', 'g4']));
  drawFaces(c, v, faces);
  // the port opening: dark slot
  { const a = proj(v, -14, 52, -10), b = proj(v, 14, 52, 10); }
  // detector arc: 48 columns × 16 rows, curved round the focal spot
  if (v.s < 1.2) {
    const NC = 48, NR = 16;
    for (let i = 0; i < NC; i++) for (let j = 0; j < NR; j++) {
      const a0 = -FAN + 2 * FAN * i / NC, a1 = a0 + 2 * FAN / NC, z0 = -ZDET + 2 * ZDET * j / NR, z1 = z0 + 2 * ZDET / NR;
      const q = [[a0, z0], [a1, z0], [a1, z1], [a0, z1]].map(([a, z]) => proj(v, Math.sin(a) * SDD, Math.cos(a) * SDD, z));
      const lit = Math.abs((z0 + z1) / 2) < zH(SDD);
      c.beginPath(); q.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
      c.fillStyle = P[lit ? ((i + j) % 2 ? 'e2' : 'e1') : ((i + j) % 2 ? 'g3' : 'g2')]; c.fill();
    }
  }
  // photons
  c.setTransform(1, 0, 0, 1, 0, 0);
  for (const p of PH) {
    const st = photonAt(p, t); if (!st) continue;
    if (st.done) {
      if (st.kind === 'det') continue;
      if (st.age < 0.3) { const [sx, sy] = proj(v, st.x, st.y, st.z); FX.flash(c, sx, sy, 4 * (1 - st.age / 0.3), 'r2', 1 - st.age / 0.3); }
      continue;
    }
    const [sx, sy] = proj(v, st.x, st.y, st.z), [ex, ey] = proj(v, st.x + st.d[0] * 6, st.y + 6, st.z + st.d[2] * 6), ang = Math.atan2(ey - sy, ex - sx);
    if (v.s > 1.0) FX.ph(c, sx, sy, ang, FX.lamFor(p.E * 0.67) * 0.8, 6, 2, 1);
    else PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, p.E > 60 ? 'y4' : 'y3');
  }
  return v;
}
SC['s06_beam'] = {
  draw(c, t, S) {
    const xin = clamp(t / 0.4);
    let v;
    if (xin < 1) { dissolve(c, cc => SC.s05_anode.draw(cc, 8 - 1 / 120 + 0 * t, { id: 's05_anode', dur: 8, t: 32 - 1 / 120 }), cc => { v = drawBeam(cc, t, S); }, MO.smooth(xin)); }
    else v = drawBeam(c, t, S);
    v = v || viewAt(t);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const L = (x, y, z) => proj(v, x, y, z);
    // the pairs alternate sides, so each explanation can stay up long enough to read
    if (t < 4.35) {
      { const [ax, ay] = L(0, YF + 1, 34); CAP.note(c, t, { ax, ay, x: 250, y: 150, text: 'FILTER', t0: 0.8, t1: 2.8, col: 'g9', align: 'right', box: true }); }
      CAP.note(c, t, { x: 250, y: 161, text: 'stops low-energy X-rays', t0: 1.0, t1: 2.8, col: 'r3', align: 'right', box: true });
      { const [ax, ay] = L(0, YJ + 4, gapAt(t) + 6); CAP.note(c, t, { ax, ay, x: 20, y: 161, text: 'COLLIMATOR', t0: 2.05, t1: 4.05, col: 'g9', box: true }); }
      CAP.note(c, t, { x: 20, y: 172, text: 'sets the beam thickness', t0: 2.25, t1: 4.05, col: 'g8', box: true });
    }
    if (t > 3.9 && t < 6.2) { const [ax, ay] = L(60, YB0 + 14, 0); CAP.note(c, t, { ax, ay, x: 250, y: 150, text: 'BOWTIE FILTER', t0: 4.0, t1: 5.9, col: 'g9', align: 'right', box: true }); CAP.note(c, t, { x: 250, y: 161, text: 'less dose at the edges', t0: 4.15, t1: 5.9, col: 'g8', align: 'right', box: true }); }
    if (t > 5.4) {
      const [ax, ay] = L(Math.sin(0.35) * SDD, Math.cos(0.35) * SDD, ZDET * 0.7);
      CAP.note(c, t, { ax, ay, x: 20, y: 372, text: 'DETECTOR ROWS', t0: 5.5, t1: 6.85, col: 'e3', box: true });
      CAP.note(c, t, { x: 20, y: 150, text: 'FAN BEAM', t0: 5.7, t1: 6.85, col: 'y3', box: true });
    }
    CAP.cap(c, t, { l1: 'BEAM SHAPING', l2: ['THE BEAM IS', 'FILTERED AND SHAPED'], t0: 0.12, tSwap: 2.0, t1: 6.85, acc: 'y3' });
  },
  cues: () => {
    const q = [[0.4, 'beam_on', 0.7, 0, 1.0], [0.8, 'tag', 0.4, 0.4], [2.0, 'jaws', 0.9, 0, 1.0], [2.05, 'tag', 0.4, 0.4], [3.4, 'turn', 0.8, 0, 1.2], [4.0, 'tag', 0.4, 0.4],
      [4.6, 'pull_back', 0.8, 0, 1.7], [5.5, 'tag', 0.4, 0.4], [6.2, 'beam_pulse', 0.6, 0]];
    // absorbed photons as soft ticks (grouped: one per 1/8 beat at most)
    const seen = new Set();
    for (const p of PH) { const st = photonAt(p, 7.9); if (!st || !st.done || st.kind === 'det') continue; const tt = p.te + fate(p).y / 70; const k = Math.round(tt * 16); if (tt < 0.4 || tt > 6.9 || seen.has(k)) continue; seen.add(k); q.push([k / 16, 'absorb_tick', 0.25, (st.x / 80), st.kind === 'jaw' ? 1 : 0]); }
    return q;
  },
};
})();
