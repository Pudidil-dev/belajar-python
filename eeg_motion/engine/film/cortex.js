// ============================================================================
// CORTEX — the occipital cortex under electrode O1 (units: micrometres; the pial
// surface at y = 0, depth downward). Pyramidal neurons (layers II/III and V) with
// apical dendrites perpendicular to the surface, interneurons, axon collaterals
// that carry coordinated pulses. Above the cortex: CSF and meninges, the skull
// (outer table, spongy diploe, inner table), the scalp, and the O1 electrode on
// its gel. Fields are explanatory graphics: sinks (cyan) and sources (amber),
// contour ripples that widen and weaken through the layers.
// ============================================================================
(() => {
  const TAU = Math.PI * 2;
  const CX = window.CORTEX = {};
  const L = { pia: 0, wm: 2500, csf: -1200, skullIn: -2000, skullOut: -5400, skull: -6200, scalp: -11000 };
  CX.L = L;
  // ---------------------------------------------------------------- neurons
  const rnd = U.rng(77);
  const NEU = [];
  function grow(x, y, s, hero) {
    const top = 60 + rnd() * 50, n = { x, y, s, kind: 'pyr', hero: !!hero, seed: (rnd() * 1e6) | 0 };
    // apical shaft up to the surface, slightly wavy
    const ap = []; for (let k = 0; k <= 10; k++) { const v = k / 10; ap.push([x + Math.sin(v * 3 + n.seed) * 6 * s + (rnd() - 0.5) * 2, y - 18 * s - v * (y - 18 * s - top)]); }
    n.ap = ap;
    const tip = ap[ap.length - 1];
    n.tuft = [-1, 1, 0.3].map(d => { const L2 = (60 + rnd() * 70) * s; return [[tip[0], tip[1] + 20], [tip[0] + d * L2 * 0.5, tip[1] - 10], [tip[0] + d * L2, tip[1] - 26 + rnd() * 12]]; });
    n.obl = [0.45, 0.62, 0.78].map((v, i) => { const p = ap[Math.round(v * 10)], d = i % 2 ? 1 : -1, L2 = (70 + rnd() * 70) * s; return [p, [p[0] + d * L2 * 0.5, p[1] - L2 * 0.25], [p[0] + d * L2, p[1] - L2 * 0.35 - rnd() * 20]]; });
    n.basal = [-2.5, -1.9, -1.2, -0.5, 0.6].map(a0 => { const a = a0 + (rnd() - 0.5) * 0.3 + Math.PI / 2, L2 = (90 + rnd() * 70) * s; return [[x, y], [x + Math.cos(a) * L2 * 0.5, y + Math.sin(a) * L2 * 0.5 + 10], [x + Math.cos(a) * L2, y + Math.sin(a) * L2 + 18]]; });
    const ax = []; for (let k = 0; k <= 8; k++) ax.push([x + Math.sin(k * 0.9 + n.seed) * 8, y + 22 * s + k * (45 + rnd() * 10)]);
    n.axon = ax;
    NEU.push(n); return n;
  }
  for (let i = 0; i < 64; i++) {
    const x = -2500 + i * 80 + (rnd() - 0.5) * 30;
    if (Math.abs(x) < 50) continue;
    const deep = i % 3 !== 0;
    grow(x, deep ? 1150 + rnd() * 280 : 430 + rnd() * 220, deep ? 1.0 + rnd() * 0.25 : 0.72 + rnd() * 0.15);
  }
  const HERO = grow(0, 1260, 1.18, true);
  CX.HERO = HERO;
  NEU.sort((a, b) => a.s - b.s);
  // the spine on the hero's apical dendrite where the synapse sits (the lens target)
  const SPINE = (() => { const p = HERO.ap[7]; return [p[0] + 14, p[1]]; })();
  CX.SPINE = SPINE;
  const INT = []; for (let i = 0; i < 40; i++) INT.push({ x: -2500 + rnd() * 5000, y: 250 + rnd() * 2000, r: 8 + rnd() * 4, seed: i });
  // connections: an axon collateral from one neuron to a dendrite of a neighbour (for coordinated pulses)
  const CONN = [];
  for (let i = 0; i < NEU.length; i += 2) {
    const a = NEU[i], b = NEU[(i + 5) % NEU.length]; if (Math.abs(a.x - b.x) > 420) continue;
    const from = a.axon[2], to = b.ap[3 + (i % 4)], mid = [(from[0] + to[0]) / 2 + 60, (from[1] + to[1]) / 2 + 40];
    CONN.push({ a: NEU.indexOf(a), b: NEU.indexOf(b), pts: [from, mid, to], ph: (i % 3) * 0.06 });
  }
  // ---------------------------------------------------------------- drawing helpers
  // a tapered branch as a filled polygon, two-tone shaded
  function taper(c, pts, w0, w1, base, sh, hi, z) {
    const n = pts.length; if (n < 2) return;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
      left.push([p[0] - dy / l * w, p[1] + dx / l * w]); right.push([p[0] + dy / l * w, p[1] - dx / l * w]);
    }
    const poly = D.smooth(left.concat(right.reverse()), true, 0.35);
    if (z < 0.5) { D.fill(c, poly, base); return; }
    D.flat(c, poly, base, sh, hi, Math.max(0.6, w0 * 0.22), Math.max(0.3, w0 * 0.1));
  }
  function bez(p) { const out = []; for (let k = 0; k <= 8; k++) { const v = k / 8, a = 1 - v; out.push([a * a * p[0][0] + 2 * a * v * p[1][0] + v * v * p[2][0], a * a * p[0][1] + 2 * a * v * p[1][1] + v * v * p[2][1]]); } return out; }
  function somaPath(n) { const s = n.s * 1.45 * (n.hero ? 1.1 : 1), x = n.x, y = n.y; return D.smooth([[x, y - 26 * s], [x + 15 * s, y - 2 * s], [x + 12 * s, y + 14 * s], [x - 12 * s, y + 14 * s], [x - 15 * s, y - 2 * s]], true, 0.6); }
  function drawNeuron(c, n, z, act, col) {
    col = col || [COL.lav, COL.lavSh, COL.lavHi];
    const s = n.s * 1.35, wAp = 11 * s;
    for (const b of n.basal) taper(c, bez(b), 6 * s, 1.6 * s, col[0], col[1], col[2], z);
    taper(c, n.axon, 2.6 * s, 1.4 * s, col[1], col[1], col[0], z);
    taper(c, n.ap, wAp, 4.2 * s, col[0], col[1], col[2], z);
    for (const b of n.obl) taper(c, bez(b), 4 * s, 1.4 * s, col[0], col[1], col[2], z);
    for (const b of n.tuft) taper(c, bez(b), 4.4 * s, 1.4 * s, col[0], col[1], col[2], z);
    const sp = somaPath(n);
    D.flat(c, sp, col[0], col[1], col[2], 5 * s, 2 * s);
    D.fill(c, D.circle(n.x, n.y - 2 * s, 5.6 * s), col[1], 0.9);      // nucleus
    if (act > 0) { D.glow(c, n.x, n.y - 4 * s, 70 * s, COL.cyan, act); D.fill(c, sp, COL.cyanHi, 0.35 * act); }
  }
  // a pulse travelling along a polyline (0..1)
  function along(pts, u) { const segs = []; let L2 = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); L2 += d; } let s = u * L2; for (let i = 0; i < segs.length; i++) { if (s <= segs[i]) { const k = s / (segs[i] || 1); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } s -= segs[i]; } return pts[pts.length - 1]; }
  CX.along = along;
  // ---------------------------------------------------------------- background and the layers above the cortex
  function background(c, cam, t) {
    c.fillStyle = COL.bg; c.fillRect(0, 0, STAGE.W, STAGE.H);
    // far-layer ghost neurons (parallax) for depth
    CAM.layer(c, cam, 0.62, c2 => {
      for (let i = 0; i < 26; i++) {
        const x = -3000 + i * 240 + 40 * D.wob(t, 1, i), y = 500 + (i % 4) * 330;
        c2.strokeStyle = D.mix(COL.lavDk, COL.bg, 0.72); c2.lineWidth = 10; c2.lineCap = 'round';
        c2.beginPath(); c2.moveTo(x, y); c2.lineTo(x + 8, y - 600); c2.stroke();
        c2.fillStyle = D.mix(COL.lavDk, COL.bg, 0.7); c2.beginPath(); c2.arc(x, y, 22, 0, TAU); c2.fill();
      }
    });
  }
  // the coral tissue tint (shows as the camera pulls back) and the layers above
  function layers(c, cam, t, o) {
    const z = cam.z, coral = U.clamp((0.75 - z) / 0.4);
    const [wx0, wy0] = CAM.toWorld(cam, 0, 0), [wx1, wy1] = CAM.toWorld(cam, STAGE.W, STAGE.H);
    if (coral > 0) { c.save(); c.globalAlpha = coral; c.fillStyle = D.mix(COL.coral, COL.bg, 0.35); c.fillRect(wx0, L.pia, wx1 - wx0, L.wm); c.fillStyle = D.mix(COL.wm, COL.bg, 0.35); c.fillRect(wx0, L.wm, wx1 - wx0, wy1 - L.wm + 10); c.restore(); }
    if (wy0 > L.pia) return;
    // CSF and meninges
    c.fillStyle = D.mix(COL.csf, COL.bg, 0.55); c.fillRect(wx0, L.csf, wx1 - wx0, L.pia - L.csf);
    c.fillStyle = D.mix(COL.coral, COL.bg, 0.15); c.fillRect(wx0, L.pia - 60, wx1 - wx0, 60);                     // pia on the cortex surface
    c.fillStyle = D.mix(COL.csf, COL.white, 0.25); c.fillRect(wx0, L.csf, wx1 - wx0, 70);                       // dura / arachnoid
    // skull: inner table, spongy diploe, outer table
    c.fillStyle = COL.bone; c.fillRect(wx0, L.skullOut, wx1 - wx0, L.skullIn - L.skullOut); c.fillRect(wx0, L.skull, wx1 - wx0, L.skullOut - L.skull);
    c.fillStyle = COL.boneSh; c.fillRect(wx0, L.skullOut, wx1 - wx0, L.skullIn - L.skullOut);
    c.fillStyle = COL.bone; c.fillRect(wx0, L.skullIn, wx1 - wx0, L.csf - L.skullIn);
    for (let i = 0; i < 140; i++) { const x = -9000 + U.hash(i, 1) * 18000, y = L.skullOut + 150 + U.hash(i, 2) * (L.skullIn - L.skullOut - 300); if (x < wx0 - 400 || x > wx1 + 400) continue; c.fillStyle = COL.boneDk; c.beginPath(); c.ellipse(x, y, 140 + 120 * U.hash(i, 3), 90 + 70 * U.hash(i, 4), 0, 0, TAU); c.fill(); }
    // scalp with hair follicles
    c.fillStyle = COL.skinSh; c.fillRect(wx0, L.scalp, wx1 - wx0, L.skull - L.scalp);
    c.fillStyle = COL.skin; c.fillRect(wx0, L.scalp, wx1 - wx0, (L.skull - L.scalp) * 0.55);
    c.fillStyle = COL.skinHi; c.fillRect(wx0, L.scalp, wx1 - wx0, 120);
    for (let i = 0; i < 70; i++) { const x = -10000 + i * 290 + 90 * U.hash(i, 9); if (x < wx0 - 300 || x > wx1 + 300 || Math.abs(x) < 2300) continue; const h = 1400 + 900 * U.hash(i, 7), lean = (x > 0 ? 1 : -1) * (300 + 300 * U.hash(i, 6)); c.strokeStyle = D.mix(COL.hair, COL.bg, 0.15); c.lineWidth = 55; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, L.scalp + 200); c.quadraticCurveTo(x + lean * 0.3, L.scalp - h * 0.6, x + lean, L.scalp - h); c.stroke(); }
    // the O1 electrode on its gel
    c.fillStyle = D.rgba(COL.gel, 0.75); c.beginPath(); c.ellipse(0, L.scalp - 120, 1900, 520, 0, Math.PI, TAU); c.fill();
    D.flat(c, D.smooth([[-1500, L.scalp - 300], [-1300, L.scalp - 1500], [0, L.scalp - 1900], [1300, L.scalp - 1500], [1500, L.scalp - 300]], true, 0.6), COL.silver, COL.silverSh, '#FFFFFF', 220, 90);
    D.stroke(c, D.smooth([[0, L.scalp - 1900], [300, L.scalp - 3200], [1400, L.scalp - 4200]], false, 0.5), COL.silverSh, 220);
    if (o.scalpGlow > 0) { const g = c.createLinearGradient(-6000, 0, 6000, 0); g.addColorStop(0, D.rgba(COL.cyan, 0)); g.addColorStop(0.5, D.rgba(COL.cyan, 0.55 * o.scalpGlow)); g.addColorStop(1, D.rgba(COL.cyan, 0)); c.fillStyle = g; c.fillRect(-6000, L.scalp - 160, 12000, 900); }
  }
  // ---------------------------------------------------------------- fields: sinks/sources, summation, ripples
  function dipole(c, n, k, z) {
    if (k <= 0) return;
    const sink = n.ap[7], src = [n.x, n.y + 10 * n.s];
    D.glow(c, sink[0], sink[1], 110 * n.s, COL.cyan, 0.9 * k); D.glow(c, src[0], src[1], 120 * n.s, COL.amber, 0.8 * k);
    if (z > 0.7) {   // the current loop: in at the sink, along the dendrite, out at the source, back through the outside
      c.save(); c.globalAlpha = 0.75 * k; c.strokeStyle = COL.white; c.lineWidth = 2.6 / z * 1.4; c.setLineDash([10 / z * 1.6, 9 / z * 1.6]); c.lineDashOffset = -TL.per(TL.EV.sinkSource) * 0;
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(src[0] + d * 26, src[1]); c.bezierCurveTo(src[0] + d * 150, src[1] - 120, sink[0] + d * 150, sink[1] + 120, sink[0] + d * 26, sink[1]); c.stroke(); }
      c.restore();
    }
  }
  function ripples(c, cam, t, o) {
    if (!(o.rip > 0)) return;
    const ctr = [0, 1000], per = TL.BEAT;
    for (let k = 0; k < 7; k++) {
      const age = ((t - o.ripT0) / per - k); if (age < 0) continue;
      const u = age - Math.floor(age), r = 600 + u * 14500, a = o.rip * 0.95 * Math.exp(-r / 15000) * Math.min(1, u * 6) * (1 - u * 0.7);
      if (a < 0.02) continue;
      const p = new Path2D();
      for (let i = 0; i <= 64; i++) {
        const th = 0.06 * Math.PI + i / 64 * 0.88 * Math.PI, y = ctr[1] - r * Math.sin(th), spread = 1 + 1.1 * U.clamp((L.csf - y) / 6000) + 0.5 * U.clamp((L.skull - y) / 4000);
        const x = ctr[0] + r * Math.cos(th) * spread; i ? p.lineTo(x, y) : p.moveTo(x, y);
      }
      c.save(); c.globalAlpha = a; c.strokeStyle = COL.cyanHi; c.lineWidth = 4.5 / cam.z; c.stroke(p); c.globalAlpha = a * 0.35; c.strokeStyle = COL.cyan; c.lineWidth = 18 / cam.z; c.stroke(p); c.restore();
    }
  }
  function sumField(c, k, t) {
    if (k <= 0) return;
    const pul = 0.75 + 0.25 * Math.sin(TAU * 4 * TL.per(t) / TL.BEAT / 4);
    const g = c.createRadialGradient(0, 700, 0, 0, 700, 2400);
    g.addColorStop(0, D.rgba(COL.cyan, 0.32 * k * pul)); g.addColorStop(0.45, D.rgba(COL.cyan, 0.12 * k)); g.addColorStop(1, D.rgba(COL.cyan, 0));
    c.fillStyle = g; c.fillRect(-2600, -1700, 5200, 4800);
    for (let i = 1; i <= 4; i++) { c.save(); c.globalAlpha = k * (0.8 - i * 0.13); c.strokeStyle = COL.cyanHi; c.lineWidth = 5 * (1 + 0.25 * i); c.beginPath(); c.ellipse(0, 700, 520 * i * (0.9 + 0.1 * pul), 300 * i * (0.9 + 0.1 * pul), 0, 0, TAU); c.stroke(); c.restore(); }
  }
  // ---------------------------------------------------------------- activity
  function burstAct(n, i, t, times) { let a = 0; for (const tb of times) { const d = t - tb - (i % 5) * 0.03; if (d >= 0 && d < 0.6) a = Math.max(a, Math.exp(-d * 6)); } return a; }
  // ---------------------------------------------------------------- the world
  CX.draw = (c, cam, t, o = {}) => {
    background(c, cam, t);
    CAM.with(c, cam, c2 => {
      layers(c2, cam, t, o);
      const [wx0, wy0] = CAM.toWorld(cam, -200, -200), [wx1, wy1] = CAM.toWorld(cam, STAGE.W + 200, STAGE.H + 200), z = cam.z;
      sumField(c2, o.sum || 0, t);
      // interneurons (dimmer)
      for (const s of INT) { if (s.x < wx0 || s.x > wx1 || s.y < wy0 || s.y > wy1) continue; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + s.seed; D.line(c2, [[s.x, s.y], [s.x + Math.cos(a) * 46, s.y + Math.sin(a) * 46]], COL.lavDk, 3, 0.9); } D.flat(c2, D.circle(s.x, s.y, s.r), COL.lavSh, COL.lavDk, COL.lav, 3, 1.2); }
      // connections and their pulses
      for (const k of CONN) {
        const A = NEU[k.a], B = NEU[k.b]; if (Math.max(A.x, B.x) < wx0 || Math.min(A.x, B.x) > wx1) continue;
        const pts = bez(k.pts); D.line(c2, pts, COL.lavDk, 3.4, 0.9);
        if (o.bursts) for (const tb of o.bursts) { const u = (t - tb - k.ph) / 0.42; if (u > 0 && u < 1) { const p = along(pts, MO.sineInOut(u)); D.spark(c2, p[0], p[1], 9, COL.cyan, 1); } else if (u >= 1 && u < 1.5) { const p = pts[pts.length - 1]; D.glow(c2, p[0], p[1], 40, COL.yel, 1.5 - u); } }
      }
      // neurons (cull to the view); dipoles where asked
      for (let i = 0; i < NEU.length; i++) {
        const n = NEU[i]; if (n.x < wx0 - 300 || n.x > wx1 + 300 || n.ap[10][1] > wy1 || n.axon[8][1] < wy0) continue;
        const act = o.bursts ? burstAct(n, i, t, o.bursts) : 0;
        const dk = n.hero ? (o.heroDip || 0) : (o.dip ? o.dip(n, i) : 0);
        dipole(c2, n, dk, z);
        drawNeuron(c2, n, z, act, n.hero && o.heroCol ? o.heroCol : null);
        if (o.align > 0) { const u = ((t - o.alignT) / 0.7) % 1; if (u > 0) { const p = along(n.ap.slice().reverse(), 1 - u); D.spark(c2, p[0], p[1], 4.5 * n.s, COL.cyan, o.align); } }
      }
      // the hero spine and its bouton (the synapse the camera dives into)
      { const [sx, sy] = SPINE, ap = HERO.ap[7];
        taper(c2, [[ap[0], ap[1]], [sx - 4, sy]], 4, 3, COL.lav, COL.lavSh, COL.lavHi, z);
        D.flat(c2, D.circle(sx, sy, 7), COL.lav, COL.lavSh, COL.lavHi, 2.2, 0.9);
        D.flat(c2, D.circle(sx + 13, sy - 4, 8), COL.lavSh, COL.lavDk, COL.lav, 2.4, 1);
        if (o.spineGlow > 0) D.glow(c2, sx + 6, sy - 2, 46, COL.yel, o.spineGlow); }
      // the postsynaptic potential spreading down the hero's dendrite
      if (o.psp > 0) { const u = U.clamp(o.psp), path = HERO.ap.slice(0, 8).reverse(); for (let j = 0; j < 6; j++) { const v = U.clamp(u - j * 0.06); if (v <= 0) continue; const p = along(path, v); D.glow(c2, p[0], p[1], 46, COL.cyan, (1 - j / 6) * (1 - 0.6 * u)); } }
      ripples(c2, cam, t, o);
    });
  };
})();
