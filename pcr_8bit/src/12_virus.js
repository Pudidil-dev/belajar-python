'use strict';
// ============================================================================
// THE SAMPLE AND THE VIRUS (world px around the particle centre).
// A generic enveloped RNA virus as an educational model (not one strain):
// club-shaped spike proteins (cyan) in a lipid bilayer envelope (muted purple,
// heads + tails), membrane proteins, and inside a nucleocapsid: the RNA genome
// (magenta) wound round nucleoproteins. The particle is first a shaded sphere;
// a cut-away sector opens to show the cross-section. Lysis buffer (detergent)
// breaks the envelope into micelles and frees the RNA. Also: the microscopic
// field of the collection fluid (mucus, cells, bacteria, a few virus particles).
// ============================================================================
const VR = 100;                                                       // envelope radius
const SPIKES = Array.from({ length: 22 }, (_, i) => ({ a: i * TAU / 22 + (hash(i + 40) - 0.5) * 0.12, l: 18 + hash(i + 41) * 5, v: hash(i + 42) }));
const MPROT = Array.from({ length: 12 }, (_, i) => ({ a: (i + 0.5) * TAU / 12 + hash(i + 60) * 0.2 }));
// the nucleocapsid: a looping path inside the particle, beads (nucleoproteins) along it
const NC_PTS = (() => {
  const pts = [], n = 260;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = u * TAU * 3.2 + 0.4, r = 22 + 58 * (0.5 + 0.5 * Math.sin(u * TAU * 2.3 + 1.2)) * (0.6 + 0.4 * u);
    pts.push(Math.cos(a) * r + 6 * Math.sin(u * 37), Math.sin(a) * r * 0.92 + 6 * Math.cos(u * 29));
  }
  return pts;
})();
const NC_PATH = new Path(NC_PTS);
// extended (released) RNA path after lysis
const RNA_FREE = (() => { const pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120; pts.push(-230 + u * 460, 40 * Math.sin(u * TAU * 1.6 + 0.5) + 18 * Math.sin(u * TAU * 4.1)); } return new Path(pts); })();
function rnaPathAt(s, k) {         // point at arc length s on the coiled (k=0) or released (k=1) genome
  const a = NC_PATH.at(s * NC_PATH.L), b = RNA_FREE.at(s * RNA_FREE.L);
  const e = smooth(k);
  return [lerp(a[0], b[0], e), lerp(a[1], b[1], e)];
}
// draw the genome with nucleoprotein beads; k: 0 coiled .. 1 released; hi: highlight glow
function drawGenome(cam, t, k, hi, o) {
  o = o || {};
  const z = cam.z, N = 180;
  let px_ = null, py_ = null;
  const pts = [];
  for (let i = 0; i <= N; i++) { const [x, y] = rnaPathAt(i / N, k); pts.push([cam.x(x + (o.dx || 0)), cam.y(y + (o.dy || 0))]); }
  if (hi > 0) for (let i = 0; i < pts.length; i += 6) glow(pts[i][0], pts[i][1], 7 * z, P.RN1, null, hi * 0.6);
  // nucleoproteins (they let go as k rises)
  for (let i = 3; i < N; i += 7) {
    const d = smooth(clamp(k * 1.6 - 0.2, 0, 1)), [x, y] = pts[i], ox = (hash(i) - 0.5) * 60 * d * z, oy = (hash(i + 5) - 0.5) * 60 * d * z - 18 * d * z;
    disc(x + ox, y + oy, 5.4 * z, P.VN0); disc(x + ox, y + oy, 4.4 * z, P.VN1); disc(x + ox - z, y + oy - z, 2 * z, P.VN2);
  }
  for (const [x, y] of pts) { if (px_ !== null) { lineW(px_, py_, x, y, 3.4 * z, P.RN0); } px_ = x; py_ = y; }
  px_ = null;
  for (const [x, y] of pts) { if (px_ !== null) { lineW(px_, py_, x, y, 2 * z, P.RN2); } px_ = x; py_ = y; }
  for (let i = 0; i < pts.length; i += 3) { const [x, y] = pts[i]; pset(x, y, P.RN4); }
}
// one spike protein: stalk + club head (a trimer of three lobes)
function spike(cam, cx, cy, a, len, z, col) {
  const ca = Math.cos(a), sa = Math.sin(a);
  const x0 = cam.x(cx + ca * (VR - 2)), y0 = cam.y(cy + sa * (VR - 2)), x1 = cam.x(cx + ca * (VR + len)), y1 = cam.y(cy + sa * (VR + len));
  lineW(x0, y0, x1, y1, 3 * z, P.VS0); lineW(x0, y0, x1, y1, 1.6 * z, P.VS1);
  const hx = x1 + ca * 5 * z, hy = y1 + sa * 5 * z;
  for (const d of [-1, 0, 1]) { const px = hx - sa * d * 4 * z, py = hy + ca * d * 4 * z; disc(px, py, 4.4 * z, P.VS0); disc(px, py, 3.6 * z, col || P.VS2); }
  disc(hx - ca * z - sa * 2 * z, hy - sa * z + ca * 2 * z, 1.6 * z, P.VS3);
}
// o: { rot, cut (0..1 sector opening), hi (genome glow), lysis (0..1), detergent (0..1) }
function drawVirus(cam, t, o) {
  o = o || {};
  const z = cam.z, X = v => cam.x(v), Y = v => cam.y(v), rot = o.rot || 0, ly = o.lysis || 0;
  // spikes (drift away after lysis)
  for (let i = 0; i < SPIKES.length; i++) {
    const sp = SPIKES[i], d = smooth(clamp((ly - 0.3) / 0.5, 0, 1));
    const a = sp.a + rot, ox = Math.cos(a) * d * (60 + 80 * sp.v), oy = Math.sin(a) * d * (60 + 80 * sp.v);
    spike(cam, ox, oy, a + d * (sp.v - 0.5) * 2, sp.l, z);
  }
  if (ly < 0.35) {
    // inside: dark matrix + genome
    disc(X(0), Y(0), (VR - 6) * z, P.VE0);
    drawGenome(cam, t, 0, o.hi || 0);
    // surface shell over the interior, except the open sector
    const cut = o.cut || 0, a0 = -0.9 + rot * 0, span = cut * 2.4;
    const R2 = (VR - 5) * z, cx = X(0), cy = Y(0);
    const y0 = Math.max(0, Math.floor(cy - R2)), y1 = Math.min(H - 1, Math.ceil(cy + R2));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy, hh = R2 * R2 - dy * dy; if (hh < 0) continue;
      const s = Math.sqrt(hh), xa = Math.max(0, Math.ceil(cx - s)), xb = Math.min(W - 1, Math.floor(cx + s));
      for (let x = xa; x <= xb; x++) {
        const dx = x + 0.5 - cx;
        if (span > 0) { let ang = Math.atan2(dy, dx) - a0; ang = ((ang % TAU) + TAU) % TAU; if (ang < span) continue; }
        const nx = dx / R2, ny = dy / R2, l = clamp(0.62 - 0.55 * nx - 0.65 * ny, 0, 1);   // light from upper left
        const b = bay(x, y);
        buf[y * W + x] = l > 0.82 + b * 0.1 ? P.VE4 : l > 0.5 + b * 0.18 ? P.VE3 : l > 0.22 + b * 0.18 ? P.VE2 : P.VE1;
      }
    }
    // surface texture: protein dots on the shell
    for (let i = 0; i < 36; i++) {
      const u = hash(i + 300) * TAU, r = Math.sqrt(hash(i + 301)) * (VR - 14), x = Math.cos(u + rot) * r, y = Math.sin(u + rot) * r;
      let ang = Math.atan2(y, x) - a0; ang = ((ang % TAU) + TAU) % TAU; if (span > 0 && ang < span) continue;
      disc(X(x), Y(y), 2.4 * z, P.VE1); disc(X(x) - 0.6 * z, Y(y) - 0.6 * z, 1.2 * z, P.VE3);
    }
    // cut faces: bilayer cross-section along the two radii of the open sector
    if (span > 0) for (const a of [a0, a0 + span]) {
      const ca = Math.cos(a), sa = Math.sin(a);
      lineW(cx + ca * 6 * z, cy + sa * 6 * z, cx + ca * (VR - 6) * z, cy + sa * (VR - 6) * z, 2 * z, P.VE3);
    }
  } else {
    drawGenome(cam, t, smooth(clamp((ly - 0.35) / 0.6, 0, 1)), o.hi || 0);
  }
  // lipid bilayer envelope: heads outside and inside, tails between; breaks into curling arcs on lysis
  const NA = 14, gap = smooth(clamp((ly - 0.2) / 0.3, 0, 1)), curl = smooth(clamp((ly - 0.45) / 0.4, 0, 1));
  for (let k = 0; k < NA; k++) {
    const am = (k + 0.5) * TAU / NA + rot, half = (TAU / NA) * 0.5 * (1 - 0.35 * gap);
    const drift = (40 + 70 * hash(k + 90)) * curl, dx = Math.cos(am) * drift, dy = Math.sin(am) * drift;
    const rr = lerp(VR, 16, curl);           // arc radius shrinks: the fragment curls into a micelle
    const ccx = dx + Math.cos(am) * (VR - rr), ccy = dy + Math.sin(am) * (VR - rr);
    const n = Math.max(4, Math.round(24 * half * 2 * (1 - 0.6 * curl)));
    for (let j = 0; j <= n; j++) {
      const a = am - half * (1 + curl * 2.2) + (j / n) * half * 2 * (1 + curl * 2.2);
      for (const [r, col] of [[rr - 1.5, P.VE4], [rr - 6.5, P.VE3]]) {
        const x = X(ccx + Math.cos(a) * r), y = Y(ccy + Math.sin(a) * r);
        disc(x, y, 1.5 * z, col);
      }
      const x0 = X(ccx + Math.cos(a) * (rr - 2.8)), y0 = Y(ccy + Math.sin(a) * (rr - 2.8)), x1 = X(ccx + Math.cos(a) * (rr - 5.2)), y1 = Y(ccy + Math.sin(a) * (rr - 5.2));
      line(x0, y0, x1, y1, P.VE2);
    }
  }
  // membrane proteins in the envelope
  if (ly < 0.25) for (const m of MPROT) { const a = m.a + rot; disc(X(Math.cos(a) * (VR - 4)), Y(Math.sin(a) * (VR - 4)), 3.4 * z, P.VN1); disc(X(Math.cos(a) * (VR - 4)), Y(Math.sin(a) * (VR - 4)), 2.2 * z, P.VE4); }
}
// detergent molecules of the lysis buffer: head + tail, drifting in and pushing into the envelope
const DETERG = Array.from({ length: 46 }, (_, i) => ({ a: hash(i + 500) * TAU, r0: 170 + hash(i + 501) * 140, ph: hash(i + 502) * TAU, v: 0.6 + hash(i + 503) * 0.6 }));
function drawDetergent(cam, t, k, ly) {
  const z = cam.z;
  for (const d of DETERG) {
    const r = lerp(d.r0, VR + 4, smooth(clamp(k * d.v, 0, 1))) + 30 * smooth(clamp((ly - 0.4) * 1.5, 0, 1)) * d.v;
    const a = d.a + 0.2 * Math.sin(t * 1.3 + d.ph), x = cam.x(Math.cos(a) * r), y = cam.y(Math.sin(a) * r);
    const ca = Math.cos(a), sa = Math.sin(a);
    lineW(x, y, x + ca * 7 * z, y + sa * 7 * z, 1.4 * z, P.LY1);
    disc(x, y, 2.4 * z, P.LY0); disc(x, y, 1.8 * z, P.LY2);
  }
}
// ---------------------------------------------------------------- the microscopic field of the sample
const FIELD = (() => {
  const r = mulberry(77), items = [];
  for (let i = 0; i < 4; i++) items.push({ k: 'cell', x: (r() - 0.5) * 420, y: (r() - 0.5) * 700, s: 34 + r() * 16, ph: r() * TAU });
  for (let i = 0; i < 9; i++) items.push({ k: 'bact', x: (r() - 0.5) * 420, y: (r() - 0.5) * 700, s: 1, a: r() * TAU, ph: r() * TAU });
  for (let i = 0; i < 6; i++) items.push({ k: 'mucus', x: (r() - 0.5) * 420, y: (r() - 0.5) * 700, a: r() * TAU, ph: r() * TAU });
  for (let i = 0; i < 26; i++) items.push({ k: 'prot', x: (r() - 0.5) * 420, y: (r() - 0.5) * 700, s: 2 + r() * 2, ph: r() * TAU });
  [[30, -60], [-70, 90], [96, 150], [-40, -190], [120, -20]].forEach(([x, y], i) => items.push({ k: 'virus', x, y, ph: i * 1.7, id: i }));
  return items;
})();
function miniVirus(x, y, z, rot) {
  for (let i = 0; i < 10; i++) { const a = rot + i * TAU / 10, ca = Math.cos(a), sa = Math.sin(a); line(x + ca * 5 * z, y + sa * 5 * z, x + ca * 8 * z, y + sa * 8 * z, P.VS1); disc(x + ca * 8.6 * z, y + sa * 8.6 * z, 1.4 * z, P.VS2); }
  disc(x, y, 5.6 * z, P.VE1); disc(x, y, 4.6 * z, P.VE2); disc(x - 1.4 * z, y - 1.4 * z, 1.8 * z, P.VE3);
}
// o: { ring (0..1 highlight the virus particles), pick (index brightened) }
function sampleField(cam, t, o) {
  o = o || {};
  const z = cam.z;
  rect(0, 0, W, H, P.BG);
  for (const it of FIELD) {
    const wx = it.x + 6 * Math.sin(t * 0.5 + it.ph), wy = it.y + 5 * Math.cos(t * 0.4 + it.ph), x = cam.x(wx), y = cam.y(wy);
    if (x < -120 || x > W + 120 || y < -120 || y > H + 120) continue;
    if (it.k === 'cell') {
      const m = blobMask([[x, y, it.s * z, it.s * 0.8 * z, it.ph]], 2); shade(m, P.EC1, P.EC2, P.EC0, P.EC0, { k: 2 });
      disc(x + 6 * z, y - 4 * z, it.s * 0.32 * z, P.EC0); disc(x + 5 * z, y - 5 * z, it.s * 0.2 * z, P.EC1);
    } else if (it.k === 'bact') {
      const a = it.a + 0.2 * Math.sin(t + it.ph), ca = Math.cos(a), sa = Math.sin(a);
      lineW(x - ca * 10 * z, y - sa * 10 * z, x + ca * 10 * z, y + sa * 10 * z, 7 * z, P.BA0); lineW(x - ca * 9 * z, y - sa * 9 * z, x + ca * 9 * z, y + sa * 9 * z, 5 * z, P.BA1);
      lineW(x - ca * 7 * z, y - sa * 7 * z - z, x + ca * 4 * z, y + sa * 4 * z - z, 1.5 * z, P.BA2);
    } else if (it.k === 'mucus') {
      let px_ = null, py_ = null;
      for (let j = 0; j <= 16; j++) { const u = j / 16, ca = Math.cos(it.a), sa = Math.sin(it.a), w = Math.sin(u * 9 + t * 0.6 + it.ph) * 8; const xx = x + (ca * (u - 0.5) * 120 - sa * w) * z, yy = y + (sa * (u - 0.5) * 120 + ca * w) * z; if (px_ !== null) lineW(px_, py_, xx, yy, 2.2 * z, P.MU1); px_ = xx; py_ = yy; }
    } else if (it.k === 'prot') {
      disc(x, y, it.s * z, P.DB1); disc(x - 0.5 * z, y - 0.5 * z, it.s * 0.5 * z, P.DB2);
    } else if (it.k === 'virus') {
      miniVirus(x, y, z, t * 0.6 + it.ph);
      if (o.ring > 0) { const k = clamp(o.ring * 1.5 - it.id * 0.1, 0, 1); if (k > 0) ring(x, y, (16 - 4 * k) * z, Math.max(1, z * 0.8), it.id === o.pick ? P.YEL : P.VS3, k); }
    }
  }
}
// debris after lysis (around the released RNA): proteins, lipid micelles, other nucleic acids
const DEBRIS = Array.from({ length: 34 }, (_, i) => ({ x: (hash(i + 700) - 0.5) * 520, y: (hash(i + 701) - 0.5) * 760, k: hash(i + 702), ph: hash(i + 703) * TAU }));
function debrisField(cam, t, k) {
  const z = cam.z;
  for (const d of DEBRIS) {
    const x = cam.x(d.x + 8 * Math.sin(t * 0.7 + d.ph)), y = cam.y(d.y + 6 * Math.cos(t * 0.5 + d.ph));
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    if (d.k < 0.5) { disc(x, y, (5 + 4 * d.k) * z, P.DB1, k); disc(x - z, y - z, (2 + 2 * d.k) * z, P.DB2, k); }
    else if (d.k < 0.75) { ring(x, y, 8 * z, 2 * z, P.VE3, k); }
    else { if (k > 0.5) strandIcon(x, y, 8, d.ph, z * 0.8, 'host', t + d.ph); }
  }
}
