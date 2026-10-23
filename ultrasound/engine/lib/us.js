// US — the film's ultrasound: a sagittal slice through a pregnant abdomen at about 14 weeks, described as acoustic
// tissue properties, and the B-mode image a convex probe makes of it — computed the way the machine does it.
//
// Body coordinates are centimetres: x lateral (right +), z depth (down +), z = 0 the skin under the probe's centre.
// The probe face is an arc of radius RP about the virtual apex (0, −RP); scan line i leaves the apex at angle φ_i
// (−30°…+30°) and is sampled every DR cm from the face down to DEPTH cm.
// Each tissue has an acoustic impedance Z (MRayl) and a backscatter strength. Along each line the echo is
//   • a specular reflection at every boundary, pressure ratio (Z₂ − Z₁)/(Z₂ + Z₁), times what is left of the pulse;
//   • speckle: the sum of many sub-resolution scatterers, a Rayleigh-like grain fixed in each tissue (so it moves
//     with the fetus), times the tissue's backscatter and what is left of the pulse;
//   • transmission losses (1 − R²) at boundaries and strong absorption in bone → the acoustic shadow behind it.
// Depth attenuation is assumed compensated (time-gain compensation). The amplitude is log-compressed (48 dB) to the
// gray level: fluid (no scatterers) is black, soft tissue mid-gray, boundaries and bone bright.
// The fetus moves: its hand comes up to its face and goes back, a leg kicks, the heart beats at 150 per minute — all
// periodic over 5 s / 0.4 s, so the 50 s film loops exactly.
(() => {
const US = window.US = {};
const RP = 4.0, DEPTH = 12, HALF = 30 * Math.PI / 180, NL = 96, NS = 224, DR = DEPTH / NS;
Object.assign(US, { RP, DEPTH, HALF, NL, NS, DR });
// tissue table: Z (MRayl), backscatter, absorption in the tissue (per cm, beyond ordinary attenuation)
const TIS = [
  { id: 'gel', Z: 1.50, sc: 0.0 },
  { id: 'skin', Z: 1.70, sc: 0.55 },
  { id: 'fat', Z: 1.38, sc: 0.15 },
  { id: 'muscle', Z: 1.70, sc: 0.36 },
  { id: 'deep', Z: 1.62, sc: 0.22 },
  { id: 'uterus', Z: 1.64, sc: 0.40 },
  { id: 'fluid', Z: 1.51, sc: 0.004 },
  { id: 'placenta', Z: 1.62, sc: 0.62 },
  { id: 'fetus', Z: 1.60, sc: 0.42 },
  { id: 'fskin', Z: 1.66, sc: 0.95 },
  { id: 'brain', Z: 1.58, sc: 0.06 },
  { id: 'choroid', Z: 1.62, sc: 0.75 },
  { id: 'bone', Z: 6.0, sc: 1.0, ab: 3.5 },
  { id: 'blood', Z: 1.61, sc: 0.02 },
  { id: 'myo', Z: 1.66, sc: 0.55 },
  { id: 'septum', Z: 1.70, sc: 0.6 },
];
const TI = Object.fromEntries(TIS.map((t, i) => [t.id, i]));
US.TIS = TIS; US.TI = TI;

// ---------- small geometry helpers ----------
const len = (x, y) => Math.hypot(x, y);
const capsule = (px, py, ax, ay, bx, by) => {                                  // distance to segment a–b
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return len(px - ax - dx * t, py - ay - dy * t);
};
const ell = (px, py, cx, cy, a, b, ang) => {                                    // ellipse "radius" (≤ 1 inside)
  const c = Math.cos(ang), s = Math.sin(ang), dx = px - cx, dy = py - cy, u = dx * c + dy * s, v = -dx * s + dy * c;
  return Math.sqrt((u / a) ** 2 + (v / b) ** 2);
};

// ---------- the static anatomy (everything but the fetus) ----------
// superficial layers follow the probe face (it presses the belly flat against itself)
const UT = { cx: 0.6, cz: 7.4, a: 8.6, b: 5.0, w: 0.85 };                     // uterus (outer) and its wall
function staticAt(x, z) {
  const dFace = len(x, z + RP) - RP;                                            // depth below the probe face
  if (dFace < 0) return TI.gel;
  if (dFace < 0.15) return TI.skin;
  // fat with thin, meandering connective-tissue septa (a level line of a stretched noise)
  if (dFace < 1.5) { if (dFace > 0.4 && dFace < 1.3) { const n = vnoise(x * 0.45 + 3, dFace * 2.6, 5); if (Math.abs(n - 0.5) < 0.014) return TI.septum; } return TI.fat; }
  if (dFace < 1.6) return TI.septum;                                             // fascia
  if (dFace < 2.4) return TI.muscle;
  if (dFace < 2.5) return TI.septum;
  const eu = ell(x, z, UT.cx, UT.cz, UT.a, UT.b, 0);
  if (eu > 1) return TI.deep;
  const ei = ell(x, z, UT.cx, UT.cz, UT.a - UT.w, UT.b - UT.w, 0);
  if (ei > 1) return TI.uterus;
  // placenta: a crescent on the posterior (lower) wall, thicker on the right
  const pl = z - (UT.cz + (UT.b - UT.w) * Math.sqrt(Math.max(0, 1 - ((x - UT.cx) / (UT.a - UT.w)) ** 2))) + 1.25 + 0.45 * Math.tanh((x - 1) / 3);
  if (pl > 0) return TI.placenta;
  return TI.fluid;
}

// ---------- the fetus (supine, head to the left, face up toward the probe) ----------
// pose at film time t: everything periodic over 5 s (hand, kick, bob) and 0.4 s (heart)
US.pose = t => {
  const ph = (t % 5) / 5, tau = Math.PI * 2;
  const hand = 0.5 - 0.5 * Math.cos(tau * ph);                                  // 0 → 1 → 0: hand to the face and back
  const kick = Math.max(0, Math.sin(tau * (ph - 0.55))) ** 2;                   // one kick per cycle
  const bob = 0.12 * Math.sin(tau * ph + 1.0);
  const beat = 0.5 + 0.5 * Math.sin(tau * (t % 0.4) / 0.4);
  return { hand, kick, bob, beat, t };
};
// body parts in body coordinates for a pose; returns a classifier and the bounding box
function fetusParts(p) {
  const oy = p.bob, H = { x: -2.55, z: 7.15 + oy, r: 1.25 };                     // head
  const B = { x: 0.55, z: 7.95 + oy, a: 2.0, b: 1.22, ang: 0.10 };               // body
  const sh = [-1.05, 7.15 + oy];                                                // shoulder
  const el = [sh[0] + 0.5, sh[1] - 0.42];                                       // elbow: upper arm forward along the chest
  // forearm: from resting on the chest (pointing right-down) up in front of the chin — it never covers the face profile
  const th = 0.5 - 2.15 * p.hand, wrist = [el[0] + 0.95 * Math.cos(th), el[1] + 0.95 * Math.sin(th)];
  const hip = [2.3, 8.2 + oy], kn = [hip[0] + 0.1 - 0.35 * p.kick, hip[1] - 1.05 + 0.35 * p.kick];
  const ank = [kn[0] + 0.85 + 0.25 * p.kick, kn[1] + 0.25 + 0.45 * p.kick];
  const hip2 = [2.1, 8.45 + oy], kn2 = [hip2[0] + 0.55, hip2[1] - 0.85], ank2 = [kn2[0] + 0.9, kn2[1] + 0.35];
  const heart = { x: -0.45, z: 7.55 + oy, r: 0.36 * (1 + 0.12 * p.beat) };
  const bb = [US.fromF(-4.4, 5.0 + oy), US.fromF(4.6, 9.9 + oy)];
  return { H, B, sh, el, wrist, hip, kn, ank, hip2, kn2, ank2, heart, oy, bbox: [bb[0][0], bb[0][1], bb[1][0], bb[1][1]] };
}
US.parts = fetusParts;
// the fetus is drawn 45 % larger than the part sizes above (crown–rump ≈ 9 cm, about 15 weeks), centred at FP
const FS = 1.45, FC = [0.0, 7.6], FP = [0.6, 7.2];
const toF = (x, z) => [FC[0] + (x - FP[0]) / FS, FC[1] + (z - FP[1]) / FS];
US.fromF = (u, v) => [FP[0] + (u - FC[0]) * FS, FP[1] + (v - FC[1]) * FS];
// classify a point against the fetus: returns [tissue, frame] or null; frame tells the speckle which body part it is
function fetusAt(x0, z0, F) {
  const [x, z] = toF(x0, z0);
  const r = fetusRaw(x, z, F);
  if (!r) return null;
  // skin: a bright rim where the point is near the outside (a ring of neighbours ~0.7 mm out)
  if (r[0] === TI.fetus) { const e = 0.07 / FS; for (const [dx, dz] of [[e, 0], [-e, 0], [0, e], [0, -e]]) if (!fetusRaw(x + dx, z + dz, F)) return [TI.fskin, r[1]]; }
  return r;
}
function fetusRaw(x, z, F) {
  const { H, B } = F;
  // head: skull ring, brain, choroid plexus
  const dh = len((x - H.x) / 1.08, z - H.z);                                     // slightly long head (front to back)
  // face profile on the upper right of the head: forehead, nose, lips, chin (head-local angles, up = −z)
  const ang = Math.atan2(-(z - H.z), x - H.x);                                  // 0 = toward the body, π/2 = up
  let rim = H.r;
  const bump = (a0, w, h) => h * Math.exp(-(((ang - a0) / w) ** 2));
  rim += bump(1.72, 0.42, 0.18) + bump(1.16, 0.12, 0.56) + bump(0.94, 0.06, 0.24) + bump(0.81, 0.06, 0.21) + bump(0.60, 0.12, 0.2) - bump(0.36, 0.12, 0.10);
  if (dh < rim) {
    if (dh < H.r - 0.13) {
      if (ell(x, z, H.x + 0.15, H.z + 0.15, 0.42, 0.22, 0.4) < 1) return [TI.choroid, 1];
      return [TI.brain, 1];
    }
    if (dh < H.r && ang > -2.4 && ang < 1.45) return [TI.bone, 1];                // ossified skull (not the face side)
    if (dh < H.r && (ang <= -2.4 || ang >= 2.0)) return [TI.bone, 1];
    // nasal bone: a short bright bar inside the nose bridge
    if (ang > 1.12 && ang < 1.3 && dh > H.r + 0.05 && dh < H.r + 0.16) return [TI.bone, 1];
    return [TI.fetus, 1];
  }
  // neck
  if (capsule(x, z, H.x + 0.8, H.z + 0.45, B.x - 1.6, B.z - 0.1) < 0.62) return [TI.fetus, 2];
  // body, with the heart, the stomach and the spine
  const eb = ell(x, z, B.x, B.z, B.a, B.b, B.ang);
  if (eb < 1) {
    const hr = len(x - F.heart.x, z - F.heart.z);
    if (hr < F.heart.r) return [hr < F.heart.r * 0.62 ? (Math.abs(x - F.heart.x) < 0.04 ? TI.septum : TI.blood) : TI.myo, 2];
    if (ell(x, z, B.x + 0.55, B.z - 0.1, 0.32, 0.22, 0.2) < 1) return [TI.blood, 2];          // stomach (fluid-filled)
    // spine: vertebrae along the back (lower edge), from the neck to the rump
    if (eb > 0.7 && eb < 0.86) {
      const a = Math.atan2((z - B.z) / B.b, (x - B.x) / B.a);
      if (a > 0.35 && a < 2.75) { const k = ((a - 0.35) / 2.4) * 14; if (Math.abs(k - Math.round(k)) < 0.3) return [TI.bone, 2]; }
    }
    return [TI.fetus, 2];
  }
  // arm (upper arm, forearm, hand) with its bones
  const da = capsule(x, z, F.sh[0], F.sh[1], F.el[0], F.el[1]), df = capsule(x, z, F.el[0], F.el[1], F.wrist[0], F.wrist[1]);
  if (da < 0.24 || df < 0.21 || len(x - F.wrist[0], z - F.wrist[1]) < 0.27) return [da < 0.06 || df < 0.05 ? TI.bone : TI.fetus, 3];
  // legs: the near one kicks, the far one stays flexed
  const dt = capsule(x, z, F.hip[0], F.hip[1], F.kn[0], F.kn[1]), ds = capsule(x, z, F.kn[0], F.kn[1], F.ank[0], F.ank[1]);
  if (dt < 0.3 || ds < 0.24 || len(x - F.ank[0] - 0.15, z - F.ank[1]) < 0.26) return [dt < 0.07 || ds < 0.055 ? TI.bone : TI.fetus, 4];
  const dt2 = capsule(x, z, F.hip2[0], F.hip2[1], F.kn2[0], F.kn2[1]), ds2 = capsule(x, z, F.kn2[0], F.kn2[1], F.ank2[0], F.ank2[1]);
  if (dt2 < 0.28 || ds2 < 0.22) return [dt2 < 0.065 || ds2 < 0.05 ? TI.bone : TI.fetus, 5];
  return null;
}
US.fetusAt = fetusAt;
// tissue anywhere (body coordinates) for a pose: [tissue index, frame]
US.tissueAt = (x, z, F) => {
  const s = staticAt(x, z);
  if (F && (s === TI.fluid) && x > F.bbox[0] && x < F.bbox[2] && z > F.bbox[1] && z < F.bbox[3]) { const f = fetusAt(x, z, F); if (f) return f; }
  return [s, 0];
};

// ---------- speckle: Rayleigh-like grain from two smooth noises (lateral cell ~1.1 mm, axial ~0.45 mm) ----------
const hsh = (i, j, s) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hsh(xi, yi, s), b = hsh(xi + 1, yi, s), c = hsh(xi, yi + 1, s), d = hsh(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// speckle cells: ~1.8 mm across the beam, ~0.8 mm along it (about the pulse length and the beam width at these depths)
const speck = (u, v, s) => { const a = vnoise(u / 0.18, v / 0.08, s) - 0.5, b = vnoise(u / 0.18, v / 0.08, s + 91) - 0.5; return Math.hypot(a, b) * 3.2; };
US.speck = speck;
// static tissue: the same grain laid on the beam grid (cells ~1.25 lines × 1.5 samples), so it widens with depth like a real beam
const speckGrid = (i, j, s) => { const a = vnoise(i / 1.25, j / 1.5, s) - 0.5, b = vnoise(i / 1.25, j / 1.5, s + 91) - 0.5; return Math.hypot(a, b) * 3.2; };

// ---------- precomputed static lines ----------
let ST = null;                                                                  // per sample: tissue, speckle
US.init = () => {
  const tis = new Uint8Array(NL * NS), spk = new Float32Array(NL * NS);
  for (let i = 0; i < NL; i++) {
    const phi = -HALF + 2 * HALF * i / (NL - 1), sn = Math.sin(phi), cs = Math.cos(phi);
    for (let j = 0; j < NS; j++) {
      const r = RP + (j + 0.5) * DR, x = r * sn, z = -RP + r * cs;
      tis[i * NS + j] = staticAt(x, z);
      spk[i * NS + j] = speckGrid(i, j, 17);
    }
  }
  ST = { tis, spk };
};
// one frame: the gray level (0..1) for every line and sample, plus the raw echo amplitude (for the A-line in S06–S07).
// Frames are cached (small LRU): the live display mixes lines acquired at different moments.
const FCACHE = new Map();
US.frame = t => {
  const key = Math.round(t * 1200);
  if (FCACHE.has(key)) { const v = FCACHE.get(key); FCACHE.delete(key); FCACHE.set(key, v); return v; }
  const F = fetusParts(US.pose(t)), B = new Float32Array(NL * NS), A = new Float32Array(NL * NS), TID = new Uint8Array(NL * NS);
  const SPEC = new Float32Array(NL * NS), TR = new Float32Array(NL * NS), SP = new Float32Array(NL * NS);
  // pass 1: walk each line — tissue, speckle, specular echoes at boundaries, and what is left of the pulse
  for (let i = 0; i < NL; i++) {
    const phi = -HALF + 2 * HALF * i / (NL - 1), sn = Math.sin(phi), cs = Math.cos(phi);
    let T = 1, Zp = TIS[TI.gel].Z, spec = 0;
    for (let j = 0; j < NS; j++) {
      const k = i * NS + j; let ti = ST.tis[k], sp = ST.spk[k];
      if (ti === TI.fluid) {
        const r = RP + (j + 0.5) * DR, x = r * sn, z = -RP + r * cs;
        if (x > F.bbox[0] && x < F.bbox[2] && z > F.bbox[1] && z < F.bbox[3]) {
          const f = fetusAt(x, z, F);
          if (f) { ti = f[0]; sp = speck(x - (f[1] === 3 ? F.wrist[0] * FS : 0), z - F.oy * FS, 30 + f[1]); }
        }
      }
      TID[k] = ti;
      const tt = TIS[ti];
      if (tt.Z !== Zp) { const R = (tt.Z - Zp) / (tt.Z + Zp); spec += Math.abs(R) * T; T *= 1 - R * R; Zp = tt.Z; }
      if (tt.ab) T *= Math.exp(-tt.ab * DR);
      SPEC[k] = spec; TR[k] = T; SP[k] = tt.sc * sp; spec *= 0.35;               // the pulse is ~1.5 samples long
    }
  }
  // pass 2: the beam is a few lines wide, so the shadow behind a thin bone is soft-edged (5-line average of what passes)
  for (let i = 0; i < NL; i++) for (let j = 0; j < NS; j++) {
    let s = 0, w = 0;
    for (let d = -2; d <= 2; d++) { const ii = i + d; if (ii < 0 || ii >= NL) continue; const ww = [1, 4, 6, 4, 1][d + 2]; s += TR[ii * NS + j] * ww; w += ww; }
    const k = i * NS + j; A[k] = SPEC[k] * 0.85 + SP[k] * 0.12 * (s / w);
  }
  // log compression (48 dB) and a touch of lateral beam width (3-line blur)
  for (let i = 0; i < NL; i++) for (let j = 0; j < NS; j++) {
    const a = A[i * NS + j] * 0.5 + 0.25 * (A[Math.max(0, i - 1) * NS + j] + A[Math.min(NL - 1, i + 1) * NS + j]);
    B[i * NS + j] = Math.max(0, Math.min(1, (20 * Math.log10(a + 1e-5) + 46) / 42));
  }
  const out = { t, B, A, TID, F };
  FCACHE.set(key, out); if (FCACHE.size > 128) FCACHE.delete(FCACHE.keys().next().value);
  return out;
};
// the machine's frame clock: lines are acquired in sweeps; the display quantizes acquisition times to 1/30 s
US.q30 = t => Math.floor(t * 30 + 1e-6) / 30;
// live display with a visible refresh sweep of period P: the frame each line i shows at film time t
US.sweepFrames = (t, P = 0.5) => {
  const tA = Math.floor(t / P + 1e-9) * P, s = (t - tA) / P, out = new Array(NL);
  for (let i = 0; i < NL; i++) { const f = i / NL, ta = f < s ? tA + f * P : tA - P + f * P; out[i] = US.frame(US.q30(ta)); }
  out.s = s;
  return out;
};
// the gray level at body point (x, z) (bilinear in line and depth); −1 outside the fan, −2 for a line not acquired yet.
// fr is one frame, or an array of frames, one per line (live display)
US.sampleAt = (fr, x, z, nLines = NL, nearest = false) => {
  const r = len(x, z + RP), phi = Math.atan2(x, z + RP);
  if (r < RP || r > RP + DEPTH || Math.abs(phi) > HALF) return -1;
  const fi = (phi + HALF) / (2 * HALF) * (NL - 1), fj = (r - RP) / DR - 0.5;
  if (nearest) {
    const i = Math.round(fi), j = Math.max(0, Math.min(NS - 1, Math.round(fj)));
    if (i >= nLines) return -2;
    const f = Array.isArray(fr) ? fr[i] : fr; if (!f) return -2;
    return f.B[i * NS + j];
  }
  const i0 = Math.floor(fi), j0 = Math.max(0, Math.floor(fj)), di = fi - i0, dj = Math.max(0, fj - j0);
  if (i0 >= nLines) return -2;
  const i1 = Math.min(NL - 1, i0 + 1, nLines - 1), j1 = Math.min(NS - 1, j0 + 1);
  const fa = Array.isArray(fr) ? fr[i0] : fr, fb = Array.isArray(fr) ? fr[i1] : fr;
  if (!fa) return -2;                                                           // line not acquired (image build)
  const Ba = fa.B, Bb = (fb || fa).B;
  const a = Ba[i0 * NS + j0] * (1 - dj) + Ba[i0 * NS + j1] * dj;
  if (!fb) return a;
  const b = Bb[i1 * NS + j0] * (1 - dj) + Bb[i1 * NS + j1] * dj;
  return a * (1 - di) + b * di;
};
// gray level → one of the palette's 14 grays, ordered-dithered between neighbours (display gamma 1.15)
const RAMPK = ['k', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'ga', 'gb', 'w'];
const RAMP = RAMPK.map(k => PIX.hex(PIX.P[k])), RL = RAMP.map(c => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]);
const GLO = new Uint8Array(256), GFR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const L = Math.max(RL[0], 255 * Math.pow(i / 255, 1.15));
  let k = 0; while (k < RL.length - 2 && RL[k + 1] <= L) k++;
  GLO[i] = k; GFR[i] = Math.min(1, (L - RL[k]) / (RL[k + 1] - RL[k]));
}
US.grayRGB = (v, px, py) => { const i = Math.round(Math.max(0, Math.min(1, v)) * 255); return RAMP[GLO[i] + (GFR[i] > K.BAY(px, py) ? 1 : 0)]; };
// draw the fan with the camera: apex at world (ax, ay), k world units per body cm, rotation rot (0 = pointing down)
// o: {t, fr (a frame, or per-line frames), lines (how many lines acquired, for the build), clip [x0, y0, x1, y1] screen
//     rect, a (0..1 dither fade), gain (multiplies the gray level), hot (line index drawn brighter)}
US.drawFan = (c, cam, ax, ay, k, o = {}) => {
  const fr = o.fr || US.frame(o.t ?? 0), z = cam.z * k, [sx, sy] = K.S(cam, ax, ay), rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot);
  const R = (RP + DEPTH) * z, W = PIX.W, H = PIX.H;
  let x0 = Math.floor(sx - R * Math.sin(HALF) - 2), x1 = Math.ceil(sx + R * Math.sin(HALF) + 2), y0 = Math.floor(sy + RP * z * Math.cos(HALF) - 2), y1 = Math.ceil(sy + R + 2);
  if (rot) { x0 = Math.floor(sx - R); x1 = Math.ceil(sx + R); y0 = Math.floor(sy - R); y1 = Math.ceil(sy + R); }
  const cl = o.clip || [0, 0, W, H];
  x0 = Math.max(x0, cl[0], 0); y0 = Math.max(y0, cl[1], 0); x1 = Math.min(x1, cl[2] - 1, W - 1); y1 = Math.min(y1, cl[3] - 1, H - 1);
  if (x1 < x0 || y1 < y0) return;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, a = o.a ?? 1, nL = o.lines ?? NL, gain = o.gain ?? 1, blank = o.blank || null;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const img = c.getImageData(x0, y0, bw, bh), d = img.data;
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    if (a < 1 && K.BAY(px, py) >= a) continue;
    const dx = (px + 0.5 - sx) / z, dy = (py + 0.5 - sy) / z, bx = dx * cr + dy * sr, bz = -dx * sr + dy * cr - RP;
    const v = US.sampleAt(fr, bx, bz, nL, o.nearest); if (v === -1) continue;
    const q = ((py - y0) * bw + (px - x0)) * 4;
    const g = v === -2 ? (blank || RAMP[0]) : US.grayRGB(v * gain, px, py);
    d[q] = g[0]; d[q + 1] = g[1]; d[q + 2] = g[2]; d[q + 3] = 255;
  }
  c.putImageData(img, x0, y0); c.restore();
};
// screen position of body point (bx, bz) for a fan drawn at apex (ax, ay), scale k, rotation rot
US.toScreen = (cam, ax, ay, k, bx, bz, rot = 0) => {
  const cr = Math.cos(rot), sr = Math.sin(rot), dz = bz + RP, wx = ax + k * (bx * cr - dz * sr), wy = ay + k * (bx * sr + dz * cr);
  return K.S(cam, wx, wy);
};
// direction of scan line i (angle from straight down, radians)
US.phi = i => -HALF + 2 * HALF * i / (NL - 1);
// the same slice as a flat Kurzgesagt-style illustration (two-tone facets: shade bottom-right, light top-left)
const ILL = {
  gel: ['l1', 'l0', 'l2'], skin: ['s3', 's2', 's4'], fat: ['f2', 'f1', 'f2'], septum: ['f1', 'f0', 'f2'], muscle: ['r2', 'r1', 'r3'],
  deep: ['s1', 's0', 's2'], uterus: ['p1', 'p0', 'p2'], fluid: ['t1', 't0', 't2'], placenta: ['r1', 'r0', 'r2'], fetus: ['p2', 'p1', 'p3'],
  fskin: ['p2', 'p1', 'p3'], brain: ['p3', 'p2', 'w'], choroid: ['p3', 'p2', 'w'], bone: ['gb', 'g9', 'w'], blood: ['r1', 'r0', 'r2'], myo: ['r2', 'r1', 'r3'],
};
const ILLRGB = {}; for (const k in ILL) ILLRGB[k] = ILL[k].map(c => K.rgb(c));
US.ILL = ILL;
// draw the anatomy inside a fan (or everywhere if o.full) — same geometry as drawFan
US.drawAnatomy = (c, cam, ax, ay, k, o = {}) => {
  const F = fetusParts(US.pose(o.t ?? 0)), z = cam.z * k, [sx, sy] = K.S(cam, ax, ay), W = PIX.W, H = PIX.H;
  const rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), e = 0.9 / z * 1.0;                // facet offset ≈ 1 screen px
  const R = (RP + DEPTH + (o.extra || 0)) * z;
  const cl = o.clip || [0, 0, W, H];
  const x0 = Math.max(0, cl[0], Math.floor(sx - R)), x1 = Math.min(W - 1, cl[2] - 1, Math.ceil(sx + R)), y0 = Math.max(0, cl[1], Math.floor(sy - R)), y1 = Math.min(H - 1, cl[3] - 1, Math.ceil(sy + R));
  if (x1 < x0 || y1 < y0) return;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, a = o.a ?? 1;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const img = c.getImageData(x0, y0, bw, bh), d = img.data;
  const at = (bx, bz) => US.tissueAt(bx, bz, F)[0];
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    if (a < 1 && K.BAY(px, py) >= a) continue;
    const dx = (px + 0.5 - sx) / z, dy = (py + 0.5 - sy) / z, bx = dx * cr + dy * sr, bz = -dx * sr + dy * cr - RP;
    if (!o.full) { const r = len(bx, bz + RP), phi = Math.atan2(bx, bz + RP); if (r < RP || r > RP + DEPTH || Math.abs(phi) > HALF) continue; }
    else if (o.inside && !o.inside(bx, bz)) continue;
    const ti = at(bx, bz), name = TIS[ti].id;
    let shade = 0;
    if (at(bx + e * 1.6, bz + e * 1.6) !== ti) shade = 1; else if (at(bx - e, bz - e) !== ti) shade = 2;
    const rgb = (ILLRGB[name] || ILLRGB.deep)[shade], q = ((py - y0) * bw + (px - x0)) * 4;
    d[q] = rgb[0]; d[q + 1] = rgb[1]; d[q + 2] = rgb[2]; d[q + 3] = 255;
  }
  c.putImageData(img, x0, y0); c.restore();
};
// one scan line: boundaries with depth (cm below the face), tissues either side and the reflection; raw echo amplitude
US.lineInfo = (i, t = 0) => {
  const fr = US.frame(t), out = [];
  let prev = null;
  for (let j = 0; j < NS; j++) { const ti = fr.TID[i * NS + j]; if (prev != null && ti !== prev) { const Z1 = TIS[prev].Z, Z2 = TIS[ti].Z, Rr = (Z2 - Z1) / (Z2 + Z1); out.push({ j, d: j * DR, from: TIS[prev].id, to: TIS[ti].id, R: Rr, RI: Rr * Rr }); } prev = ti; }
  return { i, bounds: out, A: fr.A.slice(i * NS, (i + 1) * NS), B: fr.B.slice(i * NS, (i + 1) * NS), TID: fr.TID.slice(i * NS, (i + 1) * NS) };
};
US.centralLine = (t = 0) => US.lineInfo(Math.floor(NL / 2), t);
})();
