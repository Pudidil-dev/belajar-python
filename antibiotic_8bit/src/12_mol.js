'use strict';
// ============================================================================
// THE MOLECULAR CROSS-SECTION (2D, units of 0.1 nm, y down): a textbook slice
// through the envelope of the growing Gram-positive cell. From the bottom: the
// cytoplasm (dark green), the membrane bilayer (y -24..24), the growth zone just
// outside it (new strands, the glycosyltransferase, the PBPs), then the mature
// peptidoglycan layers (outermost at the top) and the outside.
// A glycan strand: hexagons alternating GlcNAc (teal) and MurNAc (light cyan),
// one disaccharide per nanometre (10 units). A peptide stem: gold beads from a
// MurNAc — L-Ala, D-Glu, m-DAP, D-Ala, D-Ala (pentapeptide while new; mature
// stems lost the last D-Ala). A cross-link joins D-Ala4 of a donor stem to the
// m-DAP3 of an acceptor stem (a direct 4->3 peptide bond).
// Sizes are exaggerated for legibility; the arrangement is schematic.
// ============================================================================
const MOL = { mem: 24, newY: -70, oldY: -118, dy: 48, x0: -820, x1: 560, sug: 3.3, bead: 2.7, step: 5.2 };
const LAYERS = [0, 1, 2, 3, 4, 5].map(i => MOL.oldY - i * MOL.dy);
// ---------------------------------------------------------------- the mature wall (static data)
const MWALL = (() => {
  const r = mulberry(404), strands = [];
  LAYERS.forEach((y, li) => {
    let x = MOL.x0 - r() * 30, ph = Math.floor(r() * 4);
    while (x < MOL.x1) {
      const n = 10 + Math.floor(r() * 26), s = { li, y, x0: x, n, ph, stems: [] };
      for (let k = 0; k < n; k++) {
        // the stems turn by a quarter turn from one MurNAc to the next: up, toward the viewer, down, away
        const xm = x + k * 10 + 5, q4 = (k + ph) % 4;
        s.stems.push({ x: xm, up: q4 === 0, down: q4 === 2, front: q4 === 1, len: r() < 0.25 ? 3 : 4, link: null, cut: Infinity });
      }
      strands.push(s); x += n * 10 + 4 + r() * 10; ph = Math.floor(r() * 4);
    }
  });
  // cross-links: a down-stem of layer L+1 meets an up-stem of layer L near it (one bond D-Ala4 -> m-DAP3)
  const byLayer = LAYERS.map((_, li) => strands.filter(s => s.li === li));
  for (let li = 0; li + 1 < LAYERS.length; li++) {
    const ups = byLayer[li].flatMap(s => s.stems.filter(q => q.up).map(q => ({ s, q }))), downs = byLayer[li + 1].flatMap(s => s.stems.filter(q => q.down).map(q => ({ s, q })));
    for (const u of ups) {
      if (r() > 0.8) continue;
      let best = null; for (const d of downs) { if (d.q.link) continue; const dx = Math.abs(d.q.x - u.q.x); if (dx <= 12 && (!best || dx < Math.abs(best.q.x - u.q.x))) best = d; }
      if (best) { u.q.link = { other: best.q, s: best.s, donor: true }; best.q.link = { other: u.q, s: u.s, donor: false }; }
    }
  }
  return { strands };
})();
// the remodeling hydrolases cut some of these bonds late in the film (sequence F): pick links in a patch
(function chooseCuts() {
  const r = mulberry(55), pick = [];
  for (const s of MWALL.strands) for (const q of s.stems) if (q.link && q.link.donor && q.x > 150 && q.x < 310 && s.li <= 2) pick.push(q);
  pick.sort((a, b) => Math.abs(a.x - 228) - Math.abs(b.x - 228));
  const six = pick.slice(0, EV.cuts.length).sort((a, b) => a.x - b.x);
  six.forEach((q, i) => { q.cut = EV.cuts[i]; });
})();
// beads of a stem: bead k (0-based) sits at distance 6.5 + k * step from its MurNAc
const stemBead = (x, y, up, k) => [x + (k % 2 ? 0.8 : -0.8), y + (up ? -1 : 1) * (6.5 + k * MOL.step)];
// ---------------------------------------------------------------- small drawing helpers (screen-space sizes from the camera)
function hexAt(cam, x, y, kind, o) {
  o = o || {};
  const sx = cam.x(x), sy = cam.y(y), r = MOL.sug * cam.z * (o.s || 1); if (sx < -12 || sy < -12 || sx > W + 12 || sy > H + 12) return;
  const c = kind === 'G' ? [P.GT2, P.GT4, P.GT1, P.GT0] : [P.GC2, P.GC4, P.GC1, P.GC0];
  if (o.tint) { c[0] = o.tint[0]; c[2] = o.tint[1]; }
  if (r < 3.2) { disc(sx, sy, Math.max(1, r), c[0]); if (r > 1.6) pset(sx - 1, sy - 1, c[1]); return; }
  shade(maskPoly(ngon(sx, sy, r, 6, Math.PI / 6 + (o.rot || 0))), c[0], c[1], c[2], c[3], { k: r > 9 ? 2 : 1 });
}
function beadAt(cam, x, y, ramp, o) {
  o = o || {};
  const sx = cam.x(x), sy = cam.y(y), r = MOL.bead * cam.z * (o.s || 1); if (sx < -12 || sy < -12 || sx > W + 12 || sy > H + 12) return;
  ball(sx, sy, Math.max(0.9, r), ramp[1], ramp[2], ramp[0], ramp[3]);
}
const AA = () => [P.PE1, P.PE3, P.PE4, P.PE0], DALA = () => [P.PE2, P.PE4, P.G8, P.PE1];
function bondAt(cam, a, b, col, w) { w = w || 0.55; lineW(cam.x(a[0]), cam.y(a[1]), cam.x(b[0]), cam.y(b[1]), Math.max(w >= 0.7 ? 2 : 1, w * cam.z), col); }
// a glycan strand from x0 with n disaccharides at height y (GlcNAc, MurNAc, GlcNAc, ...)
function strandAt(cam, x0, y, n, o) {
  o = o || {};
  const a = cam.x(x0), b = cam.x(x0 + n * 10); if (b < -20 || a > W + 20) return;
  lineW(a, cam.y(y), b - 0.1, cam.y(y), Math.max(1, 0.7 * cam.z), o.bondCol || P.GT0);
  for (let k = 0; k < n; k++) { hexAt(cam, x0 + k * 10, y, 'G', o); hexAt(cam, x0 + k * 10 + 5, y, 'M', o); }
}
// a stem of n beads from a MurNAc at (x, y), pointing up or down; opts: drop the last bead (released), link highlight
function stemAt(cam, x, y, up, n, o) {
  o = o || {};
  let prev = [x, y + (up ? -1 : 1) * MOL.sug * 0.9];
  for (let k = 0; k < n; k++) {
    const p = o.pos ? o.pos(k) : stemBead(x, y, up, k);
    bondAt(cam, prev, p, P.PE1, 0.6); prev = p;
  }
  for (let k = 0; k < n; k++) { const p = o.pos ? o.pos(k) : stemBead(x, y, up, k); beadAt(cam, p[0], p[1], k >= 3 ? DALA() : AA(), { s: o.s }); }
}
// ---------------------------------------------------------------- the mature wall
function drawMatureWall(cam, t, o) {
  o = o || {};
  const xl = cam.wx(-30), xr = cam.wx(W + 30), yt = cam.wy(-30), yb = cam.wy(H + 30), sag = o.sag || (() => 0);
  for (const s of MWALL.strands) {
    if (s.x0 > xr || s.x0 + s.n * 10 < xl || s.y < yt - 40 || s.y > yb + 40) continue;
    // stems and cross-links first (behind the sugars)
    for (const q of s.stems) {
      if (q.x < xl - 20 || q.x > xr + 20) continue;
      if (s.li === 0 && !q.up && o.skip0 && o.skip0(q.x)) continue;
      const dy = sag(q.x, s.y);
      if (q.link && q.link.donor && t < q.cut) {
        const o2 = q.link.other, s2 = q.link.s, a = stemBead(q.x, s.y + dy, true, 3), b = stemBead(o2.x, s2.y + sag(o2.x, s2.y), false, 2);
        bondAt(cam, a, b, P.PE3, 0.75);
      }
      const cutK = t >= q.cut ? clamp((t - q.cut) / 0.3, 0, 1) : 0;
      if (q.front) { beadAt(cam, q.x, s.y + dy, AA(), { s: 0.7 }); continue; }
      if (!q.up && !q.down) continue;
      stemAt(cam, q.x, s.y + dy, q.up, q.len, {});
      if (cutK > 0 && cutK < 1 && q.link && q.link.donor) { const a = stemBead(q.x, s.y + dy, true, 3); disc(cam.x(a[0]), cam.y(a[1]) - 4 * cam.z * cutK, Math.max(1, 2.2 * cam.z * (1 - cutK)), P.DM3); }
    }
    for (let k = 0; k < s.n; k++) {
      const xg = s.x0 + k * 10, xm = xg + 5; if (xm < xl - 10 || xg > xr + 10) continue;
      if (k > 0) bondAt(cam, [xg - 5, s.y + sag(xg - 5, s.y)], [xg, s.y + sag(xg, s.y)], P.GT0, 0.7);
      bondAt(cam, [xg, s.y + sag(xg, s.y)], [xm, s.y + sag(xm, s.y)], P.GT0, 0.7);
      hexAt(cam, xg, s.y + sag(xg, s.y), 'G'); hexAt(cam, xm, s.y + sag(xm, s.y), 'M');
    }
  }
}
// ---------------------------------------------------------------- the membrane bilayer (heads on both faces, tails between)
function drawMembrane(cam, t, o) {
  o = o || {};
  const y0 = cam.y(-MOL.mem), y1 = cam.y(MOL.mem); if (y1 < -5 || y0 > H + 5) return;
  rect(0, y0, W, y1, P.MB1);
  const sp = 7.6, hr = Math.max(1, 3.1 * cam.z), xs = Math.floor(cam.wx(-10) / sp) * sp, xe = cam.wx(W + 10);
  for (let x = xs; x <= xe; x += sp) {
    const sx = cam.x(x + 0.6 * Math.sin(t * 1.3 + x * 0.7)), skip = o.skip && o.skip(x);
    if (skip) continue;
    // fatty tails (two per lipid), slightly wavy
    if (cam.z > 0.9) for (const s of [-1, 1]) { const tx = sx + s * 1.2 * cam.z; line(tx, cam.y(-MOL.mem + 3), tx + Math.sin(x) * 0.8 * cam.z, cam.y(-3), P.MB2); line(tx, cam.y(MOL.mem - 3), tx - Math.sin(x * 1.3) * 0.8 * cam.z, cam.y(3), P.MB2); }
    ball(sx, cam.y(-MOL.mem + 2.5), hr, P.MB3, P.MB4, P.MB2, P.MB0);
    ball(sx, cam.y(MOL.mem - 2.5), hr, P.MB3, P.MB4, P.MB2, P.MB0);
  }
}
// ---------------------------------------------------------------- proteins: unions of ellipses, 16-bit shaded
// blobs: [[x, y, rx, ry, rot?], ...] in world units; returns the mask (screen space)
function blobMask(cam, blobs, wob) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const B = blobs.map(b => { const sx = cam.x(b[0]), sy = cam.y(b[1]), rx = b[2] * cam.z, ry = b[3] * cam.z, R = Math.max(rx, ry); x0 = Math.min(x0, sx - R); x1 = Math.max(x1, sx + R); y0 = Math.min(y0, sy - R); y1 = Math.max(y1, sy + R); return [sx, sy, rx, ry, Math.cos(b[4] || 0), Math.sin(b[4] || 0)]; });
  const wz = (wob || 0) * cam.z;
  return maskFn(x0 - 2, y0 - 2, x1 + 2, y1 + 2, (px, py) => {
    for (const b of B) { const dx = px - b[0], dy = py - b[1], u = (dx * b[4] + dy * b[5]) / b[2], v = (-dx * b[5] + dy * b[4]) / b[3]; const e = wz ? 1 + wz / Math.max(b[2], b[3]) * Math.sin(Math.atan2(v, u) * 5 + b[0] * 0.01) : 1; if (u * u + v * v <= e * e) return true; }
    return false;
  });
}
function protein(cam, blobs, ramp, o) { // ramp: [lo, base, hi, outline, gloss]
  o = o || {};
  const m = blobMask(cam, blobs, o.wob === undefined ? 0.8 : o.wob); if (m.empty()) return m;
  shade(m, ramp[1], ramp[2], ramp[0], ramp[3], { k: Math.max(1, Math.round(cam.z * 0.75)), kh: Math.max(1, Math.round(cam.z * 0.55)) });
  // one crisp glossy highlight on the main lobe (flat colour, no texture noise)
  const b = blobs[0];
  if (cam.z > 1.1 && b) ellipse(cam.x(b[0] - b[2] * 0.36), cam.y(b[1] - b[3] * 0.42), Math.max(1, b[2] * 0.3 * cam.z), Math.max(1, b[3] * 0.17 * cam.z), ramp[4] || ramp[2], undefined, b[4] || 0);
  return m;
}
const R_PBP = () => [P.PB1, P.PB3, P.PB4, P.PB0, P.PB5], R_MUR = () => [P.EG1, P.EG2, P.EG3, P.EG0, P.EG4], R_SLATE = () => [P.ES1, P.ES2, P.ES3, P.ES0, P.ES4], R_HYD = () => [P.EH1, P.EH2, P.EH3, P.EH0, P.EH4];
