// MICRO — the molecular scale: a dim field of cells behind (parallax), gamma photons (wavy yellow paths), electrons
// (violet spheres with a minus sign), water molecules (a red oxygen, two white hydrogens), the products of ionization and
// radiolysis (H⁺, •OH, H•), and the DNA double helix with its strand breaks. Ionization flashes stay small and short.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, hh = U.hash;
const MICRO = window.MICRO = { NAME: 'MICRO' };
let cellTex = null;
const CW = 720, CH = 1280;
MICRO.init = () => {
  // a far field of soft cells (drawn once): dark wine discs with a lighter rim and a darker nucleus
  cellTex = document.createElement('canvas'); cellTex.width = CW; cellTex.height = CH;
  const x = cellTex.getContext('2d'); x.fillStyle = P.ti0; x.fillRect(0, 0, CW, CH);
  for (let k = 0; k < 150; k++) {
    const cx = hh(k, 1) * CW, cy = hh(k, 2) * CH, r = 26 + 34 * hh(k, 3), ry = r * (0.8 + 0.3 * hh(k, 4)), rot = hh(k, 5) * 3;
    x.save(); x.translate(cx, cy); x.rotate(rot);
    x.fillStyle = P.ti2; x.beginPath(); x.ellipse(0, 0, r, ry, 0, 0, TAU); x.fill();
    x.fillStyle = P.ti1; x.beginPath(); x.ellipse(1.5, 1.5, r - 4, ry - 4, 0, 0, TAU); x.fill();
    x.fillStyle = P.ti3; x.beginPath(); x.ellipse(-r * 0.15, -ry * 0.1, r * 0.38, ry * 0.36, 0, 0, TAU); x.fill();
    x.fillStyle = P.ti2; x.beginPath(); x.ellipse(-r * 0.1, -ry * 0.05, r * 0.3, ry * 0.28, 0, 0, TAU); x.fill();
    x.restore();
  }
};
// the background: cells far behind, moving at a third of the camera (depth), drifting slowly
MICRO.bg = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).micro = cam;
  const par = o.par ?? 0.33, ox = ((-(cam.x * par + T * (o.drift ?? 4)) % CW) + CW) % CW, oy = ((-(cam.y * par) % CH) + CH) % CH;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  for (const dx of [-CW, 0]) for (const dy of [-CH, 0]) c.drawImage(cellTex, Math.round(ox + dx), Math.round(oy + dy));
  if (o.tint) { c.globalAlpha = o.tint; c.fillStyle = P.n0; c.fillRect(0, 0, W, H); }
  c.restore();
};
// big foreground cells (S36): pink membranes with a nucleus, slightly bumpy
MICRO.cell = (c, cam, x, y, r, o = {}) => {
  const n = 18, pts = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = r * (1 + 0.05 * Math.sin(a * 5 + (o.seed || 0)) + 0.03 * Math.sin(a * 9 + 1)); pts.push([x + Math.cos(a) * rr * (o.sx || 1), y + Math.sin(a) * rr]); }
  D.blob(c, cam, pts, o.ramp || ['ti3', 'ti4', 'ti5', 'br3', 'br4'], { bias: o.bias ?? 0 });
  D.blob(c, cam, pts.map(([px, py]) => [x + (px - x) * 0.86, y + (py - y) * 0.86]), ['ti2', 'ti3', 'ti4', 'ti5'], { edge: false, bias: 0.05 });
  if (o.nucleus !== false) D.ell(c, cam, x - r * 0.12, y - r * 0.08, r * 0.36, r * 0.32, 0.3, ['ti4', 'ti5', 'br2', 'br3', 'br4'], { bias: 0.02 });
};
// an electron: a violet sphere with a minus sign; streaks behind it when it moves (vx, vy: screen direction)
MICRO.electron = (c, sx, sy, r, o = {}) => {
  if (o.vx || o.vy) { const L = Math.hypot(o.vx, o.vy) || 1, ux = o.vx / L, uy = o.vy / L, n = o.streaks ?? 4; for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * r * 0.45, L2 = r * (1.6 + 0.8 * hh(k, 7)) * (o.speed ?? 1); D.stroke(c, [[sx - ux * r * 1.1 - uy * off, sy - uy * r * 1.1 + ux * off], [sx - ux * (r * 1.1 + L2) - uy * off, sy - uy * (r * 1.1 + L2) + ux * off]], k % 2 ? 'cy3' : 'cy4', 1, 0.8); } }
  LIT.sphere(c, sx, sy, r, ['el1', 'el2', 'el3', 'el4', 'el5'], { amb: 0.3 });
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.w; const L = Math.max(3, Math.round(r * 0.8)); c.fillRect(Math.round(sx - L / 2), Math.round(sy) - (r > 6 ? 1 : 0), L, r > 6 ? 2 : 1); c.restore();
};
// atoms and small molecules as labelled spheres (the storyboard's look): kind 'O', 'H', 'H+', 'OH', 'Hr' (H•)
const SPH = { O: ['ox1', 'ox2', 'ox3', 'ox4', 'ox5'], H: ['g5', 'g6', 'g7', 'g8', 'w'], OH: ['oh1', 'oh2', 'oh3', 'oh4', 'oh5'] };
MICRO.atom = (c, sx, sy, r, kind, o = {}) => {
  const ramp = kind === 'O' ? SPH.O : kind === 'OH' ? SPH.OH : SPH.H;
  if (o.glow) FX.glowL(c, sx, sy, r * 1.7, kind === 'OH' ? ['oh1', 'oh2', 'oh3', 'oh4'] : ['g5', 'g6', 'g7', 'g8'], 0.35 * o.glow, 1.6);
  LIT.sphere(c, sx, sy, r, ramp, { amb: 0.32, alpha: o.a ?? 1 });
  const txt = kind === 'H+' ? 'H⁺' : kind === 'OH' ? 'OH•' : kind === 'Hr' ? 'H•' : kind;
  if (r >= 5 && (o.a ?? 1) > 0.5) PIX.text(c, txt, Math.round(sx), Math.round(sy) - 3, kind === 'O' || kind === 'OH' ? 'w' : 'n1', { align: 'center', shadow: null });
};
// a water molecule: O with two H at ±52° from its axis (104.5° apart); s = O radius px; ang = axis angle (screen)
MICRO.water = (c, sx, sy, s, ang, o = {}) => {
  const hs = s * 0.72, d = s * 1.15, a = o.a ?? 1;
  const hp = [ang - 0.91, ang + 0.91].map(q => [sx + Math.cos(q) * d, sy + Math.sin(q) * d]).sort((p, q) => p[1] - q[1]);
  if (o.split) { const k = o.split; hp[0][0] += Math.cos(ang - 0.91) * k * s * 3; hp[0][1] += Math.sin(ang - 0.91) * k * s * 3; }
  MICRO.atom(c, hp[0][0], hp[0][1], hs, 'H', { a });
  MICRO.atom(c, sx, sy, s, 'O', { a });
  MICRO.atom(c, hp[1][0], hp[1][1], hs, 'H', { a });
};
// the DNA double helix along x (world): x0..x1 at y, radius A, wave number k; o.break = { x, open (0..1) } breaks both
// strands at x (a double-strand break, with the ends parting slightly); o.nick = [{x, open}] single-strand breaks
const BASES = ['bp3', 'ga3', 'cy3', 'bp4', 'ga4', 'oh3'];
MICRO.dna = (c, cam, x0, x1, y, o = {}) => {
  (window.__cams = window.__cams || {}).dna = cam;
  const A = o.A ?? 22, k = o.k ?? 0.075, ph = o.ph ?? 0, step = 1.5, w = o.w ?? 7, br = o.break, nicks = o.nick || [];
  const gapA = x => (br && Math.abs(x - br.x) < 3 + 5 * br.open) || nicks.some(n => n.s === 0 && Math.abs(x - n.x) < 2 + 4 * n.open);
  const gapB = x => (br && Math.abs(x - (br.x + 4)) < 3 + 5 * br.open) || nicks.some(n => n.s === 1 && Math.abs(x - n.x) < 2 + 4 * n.open);
  const part = x => br ? Math.sign(x - br.x - 2) * br.open * 5 : 0;
  const strand = (s, front) => {
    const seg = []; let cur = [];
    for (let x = x0; x <= x1; x += step) {
      const th = k * x + ph + s * Math.PI, depth = Math.cos(th), isFront = depth > 0;
      if (isFront !== front || (s ? gapB(x) : gapA(x))) { if (cur.length > 1) seg.push(cur); cur = []; continue; }
      cur.push([x + part(x), y + A * Math.sin(th) + part(x) * 0.3]);
    }
    if (cur.length > 1) seg.push(cur);
    for (const sg of seg) D.tube(c, cam, sg, w, s ? ['dn1', 'dn2', 'dn3', 'dn4', 'dn5'] : ['oh1', 'oh2', 'oh3', 'oh4', 'oh5'], { bias: front ? 0.08 : -0.12 });
  };
  strand(0, false); strand(1, false);
  // the base pairs (rungs), coloured, between the strands
  for (let x = Math.ceil(x0 / 9) * 9; x <= x1; x += 9) {
    if (br && Math.abs(x - br.x - 2) < 6 + 5 * br.open) continue;
    const th = k * x + ph, ya = y + A * Math.sin(th), yb = y + A * Math.sin(th + Math.PI), px = x + part(x), i = Math.round(x / 9);
    const [sx, sa] = K.S(cam, px, ya), [, sb] = K.S(cam, px, yb), mid = (sa + sb) / 2, bw = Math.max(1, Math.round(cam.z * 2.2));
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[BASES[((i % 6) + 6) % 6]]; c.fillRect(Math.round(sx - bw / 2), Math.round(Math.min(sa, mid)), bw, Math.round(Math.abs(mid - sa))); c.fillStyle = P[BASES[((i * 7 + 3) % 6 + 6) % 6]]; c.fillRect(Math.round(sx - bw / 2), Math.round(Math.min(mid, sb)), bw, Math.round(Math.abs(sb - mid))); c.restore();
  }
  strand(0, true); strand(1, true);
};
// small flying fragments at a break (screen space)
MICRO.fragments = (c, sx, sy, q, o = {}) => {
  if (q <= 0 || q >= 1) return;
  for (let k = 0; k < 7; k++) { const a = hh(k, 3) * TAU, d = (6 + 18 * hh(k, 4)) * MO.cubicOut(q), s = 2 + Math.round(hh(k, 5) * 2); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1 - q; c.fillStyle = P[k % 2 ? 'rd3' : 'ga4']; c.fillRect(Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), s, s); c.restore(); }
};
})();
