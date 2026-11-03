'use strict';
// ============================================================================
// AUDIO — an original, subtle, futuristic cinematic score plus event-synced
// SFX, synthesised sample by sample in plain JS. 100 BPM, 25 bars = 60.000 s,
// D minor (Dm9 – Bbmaj7 – Gm9 – A7sus4 colours). Minimal and restrained, mixed
// low so a voiceover can sit on top: soft analog pads, a gentle digital pulse,
// minimal sub-bass, sparse soft percussion, fine glassy shimmer. One quiet
// four-note "signal" motif (D–A–F–E on glass) marks the aneurysm at the start,
// at its discovery and at the loop. The sections follow the film: the hidden
// aneurysm (almost only pad and pulse), the circulation (a heartbeat-like soft
// kick), the scanner (a precise sixteenth pulse that builds), reconstruction
// (crystalline arpeggios), the discovery (the pads open), the return (the
// texture thins back into bar 1 — seamless loop).
// SFX: every cue is read from the event table EV (03_clock.js) that draws the
// picture, so each starts on the frame of its event. They are explanatory
// sonification, kept understated: blood flow, X-rays and computation make no
// such sounds in reality.
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const fq = (n, o) => mtof(nm(n, o));
const DMIN = [0, 2, 3, 5, 7, 8, 10];
const scl = (i, o) => mtof(nm('D', o) + DMIN[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7));
// ---------------------------------------------------------------- harmony
const CHORDS = ['Dm9', 'Dm9', 'Bbmaj7', 'Bbmaj7', 'Gm9', 'Gm9', 'Fmaj7', 'A7sus4', 'Dm9', 'Bbmaj7', 'Gm9', 'A7sus4', 'Dm9', 'Dm9', 'Bbmaj7', 'Fmaj7', 'Gm9', 'Gm9', 'Bbmaj7', 'A7sus4', 'Dm9', 'Bbmaj7', 'Gm9', 'A7sus4', 'Dm9'];
const CH = { Dm9: ['D', [0, 3, 7, 10, 14]], Bbmaj7: ['A#', [0, 4, 7, 11, 14]], Gm9: ['G', [0, 3, 7, 10, 14]], Fmaj7: ['F', [0, 4, 7, 11]], A7sus4: ['A', [0, 5, 7, 10]] };
function chordNotes(ch, oct) { const [r, iv] = CH[ch]; const b = nm(r, oct); return iv.map(i => b + i); }
const rootOf = (ch, oct) => nm(CH[ch][0], oct);
const MOTIF = [[0, nm('D', 5)], [3, nm('A', 5)], [6, nm('F', 5)], [10, nm('E', 5)]];   // [sixteenth, note]
function musicEvents() {
  const ev = [], E = o => ev.push(o);
  const at = (b, beat) => barT(b) + beat * BEAT, ch = b => CHORDS[b - 1];
  const pad = (b, v, cut, x) => E(Object.assign({ t: at(b, 0), d: 4 * BEAT + 0.3, k: 'pad', ms: chordNotes(ch(b), 3), v, cut: cut || 1100 }, x || {}));
  const sub = (b, v) => E({ t: at(b, 0), d: 4 * BEAT, k: 'sub', m: rootOf(ch(b), 1) < 30 ? rootOf(ch(b), 1) + 12 : rootOf(ch(b), 1), v });
  const PULSE = [0, 12, 7, 12];
  const pulse = (b, v, step) => { for (let i = 0; i * step < 4 - 1e-6; i++) { const x = i * step; E({ t: at(b, x), d: step * BEAT * 0.7, k: 'pulse', m: rootOf(ch(b), 3) + PULSE[Math.round(x * 4) % 4], v: v * (x % 1 === 0 ? 1 : 0.7) }); } };
  const kick = (b, beats, v) => beats.forEach(x => E({ t: at(b, x), d: 0.5, k: 'kick', v }));
  const tick = (b, beats, v) => beats.forEach(x => E({ t: at(b, x), d: 0.1, k: 'snap', v }));
  const shaker = (b, v) => { for (let i = 0; i < 16; i++) E({ t: at(b, i / 4), d: 0.1, k: 'shaker', v: v * (i % 2 ? 1 : 0.55), p: 0.3 }); };
  const arp = (b, v, oct, rate) => { const ns = chordNotes(ch(b), oct), n = rate === 8 ? 8 : 16; for (let i = 0; i < n; i++) E({ t: at(b, i * 4 / n), d: 0.5 * BEAT, k: 'glassArp', m: ns[(i * 2 + Math.floor(i / 4)) % ns.length] + (i % 8 > 5 ? 12 : 0), v: v * (i % 4 === 0 ? 1 : 0.7), p: i % 2 ? 0.35 : -0.35 }); };
  const motif = (b, v, lift) => MOTIF.forEach(([st, m]) => E({ t: at(b, st / 4), d: 1.2, k: 'glass', m: m + 12 * (lift || 0), v }));
  const shimmer = (b, v) => { const ns = chordNotes(ch(b), 5); [0.5, 1.75, 2.5, 3.25].forEach((x, i) => E({ t: at(b, x), d: 1.0, k: 'glass', m: ns[(i * 3 + b) % ns.length] + 12, v: v * (0.6 + 0.2 * (i % 2)) })); };
  // A — the hidden aneurysm (bars 1–3): pad, a soft pulse, the motif
  for (let b = 1; b <= 3; b++) { pad(b, 0.42, 900 + 150 * b); sub(b, 0.4); pulse(b, 0.22, 1); }
  motif(1, 0.5); shimmer(2, 0.28); E({ t: at(3, 0), d: 4 * BEAT, k: 'riser', v: 0.22 });
  // B — the circulation (bars 3–8): a heartbeat-like soft kick every two beats, pulse eighths, shimmer
  for (let b = 4; b <= 8; b++) { pad(b, 0.4, 1200); sub(b, 0.45); kick(b, [0, 2], 0.42); pulse(b, 0.24, 0.5); if (b % 2 === 0) shimmer(b, 0.26); shaker(b, 0.18); }
  // C — the scanner (bars 9–13): a precise sixteenth pulse that builds, ticks on the off-beats
  for (let b = 9; b <= 12; b++) { pad(b, 0.36, 1300 + 200 * (b - 9)); sub(b, 0.42); kick(b, [0, 2], 0.5); tick(b, [1, 3], 0.35); pulse(b, 0.22 + 0.03 * (b - 9), b >= 11 ? 0.25 : 0.5); shaker(b, 0.22); }
  E({ t: at(12, 2), d: 2 * BEAT, k: 'riser', v: 0.28 });
  // D — reconstruction (bars 13–17): crystalline arpeggios over a held pad
  for (let b = 13; b <= 17; b++) { pad(b, 0.38, 1500); sub(b, 0.4); kick(b, [0], 0.4); tick(b, [2], 0.28); arp(b, 0.24, 5, b >= 15 ? 16 : 8); }
  // E — the discovery (bars 18–22): the pads open, the motif returns on the reveal (bar 20, beat 3 ≈ 47.4 s … carried by the SFX)
  for (let b = 18; b <= 22; b++) { pad(b, 0.44, b >= 20 ? 2200 : 1700); sub(b, 0.42); kick(b, [0, 2], 0.42); pulse(b, 0.2, 0.5); if (b !== 20) shimmer(b, 0.26); }
  motif(20, 0.45, 0);
  // F — the return (bars 23–25): thinning back to the opening texture
  for (let b = 23; b <= 25; b++) { pad(b, 0.42, lerp(1500, 1050, (b - 23) / 2)); sub(b, 0.4); pulse(b, 0.22, 1); }
  shimmer(23, 0.24); E({ t: at(25, 2), d: 2 * BEAT, k: 'riser', v: 0.16 });
  return ev;
}
// ---------------------------------------------------------------- SFX map: one sound per event (from the event table)
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440, d: 0.2 }, x || {}));
  // A — the aneurysm's low pulse (also the loop's landing), the pull-back, the brain, the room
  S(EV.pulse0, 'lowpulse', 0.9, { d: 1.4 }); S(EV.pull, 'whoosh', 0.45, { d: 0.9 }); S(EV.brainRev, 'reveal', 0.5, { d: 1.2 }); S(EV.room, 'ambience', 0.4, { d: 1.6 }); S(EV.swing, 'whoosh', 0.35, { d: 0.6 });
  // B — the injector, the contrast entering the vein, inside the vein, the heartbeats, the lungs, the arteries, the brain
  S(EV.injector, 'servo', 0.5, { d: 0.45 }); S(EV.plunger, 'click', 0.45); S(EV.fluid, 'fluid', 0.55, { d: 0.6 });
  S(EV.enterVein, 'whoosh', 0.4, { d: 0.5, low: 1 }); EV.cells.forEach((tc, i) => S(tc, 'softtick', 0.3, { f: 1100 + 90 * (i % 3), p: (i % 2 ? 0.3 : -0.3) }));
  S(EV.beat1, 'heart', 0.75); S(EV.beat2, 'heart', 0.75); S(EV.lungs, 'branch', 0.45, { d: 1.1 }); S(EV.pvein, 'swell', 0.3, { d: 0.8 });
  S(EV.beat3, 'heart', 0.85, { strong: 1 }); S(EV.aortaFlow, 'flow', 0.4, { d: 1.0 }); S(EV.arterialUp, 'rise', 0.4, { d: 1.4 }); S(EV.fillMCA, 'shimmer', 0.45, { d: 0.6 }); S(EV.confirm, 'confirm', 0.5);
  // C — the gantry spins up, the beam, photons reaching the detector, the measurements, the helical acquisition
  S(EV.motor, 'motor', 0.55, { d: 1.6 }); S(EV.beamOn, 'scan', 0.45, { d: 0.9 });
  EV.photonHits.forEach((th, i) => S(th, 'dettick', 0.42, { f: 3200 + 200 * (i % 3), p: 0.15 })); EV.absorbed.forEach((ta, i) => S(ta, 'absorb', 0.3, { p: -0.1 }));
  EV.detPulses.forEach((tp, i) => S(tp, 'blip', 0.32, { f: scl(7 + (i % 4), 4), p: (i % 2 ? 0.25 : -0.25) })); S(EV.helix, 'helix', 0.4, { d: 2.7 });
  // D — reconstruction pulses, the image sharpening, slice ticks, the volume, the vessels emerging
  EV.recon.forEach((tr, i) => S(tr, 'compute', 0.4, { f: scl(4 + i, 4) })); S(EV.sharpen, 'resolve', 0.35, { d: 0.9 });
  EV.slices.forEach((ts, i) => S(ts, 'slice', 0.4, { f: scl(9 + i, 4), p: -0.3 + 0.15 * i })); S(EV.volume, 'align', 0.45, { d: 1.2 }); S(EV.vascular, 'rise', 0.4, { d: 1.4, bright: 1 });
  // E — the workstation, the discovery, the plane, the confirmation; F — the resolve and the pre-pulse into the loop
  S(EV.workstation, 'ambience', 0.3, { d: 3.2, high: 1 }); S(EV.discover, 'discover', 0.7, { d: 2.0 }); S(EV.mpr, 'swish', 0.35, { d: 0.5 }); S(EV.confirm2, 'confirm', 0.45);
  S(EV.resolve, 'resolve', 0.4, { d: 2.4 }); S(EV.prePulse, 'preswell', 0.5, { d: 0.6 });
  return ev;
}
// the band dips gently under the cues that matter
const DUCK = { lowpulse: 0.2, heart: 0.25, discover: 0.3, confirm: 0.15, dettick: 0.06, compute: 0.1, slice: 0.1, click: 0.1, motor: 0.12 };
// ---------------------------------------------------------------- synthesis helpers
let SND_L = null, SND_R = null, ECH_L = null, ECH_R = null, SCG = null;    // reverb send, delay send, sidechain gain (one value per 64 samples)
const nz = i => hash(i) * 2 - 1;
// write one voice into (L, R); wraps at 60 s (the film loops, so a tail at the end rings on into the start); o: { send (reverb), echo (delay), duck (sidechain) }
function voice(L, R, t0, dur, pan, gain, fn, o) {
  o = o || {};
  const i0 = Math.round(t0 * SR), n = Math.max(1, Math.round(dur * SR)), snd = o.send || 0, ech = o.echo || 0, dk = !!o.duck;
  const pl = Math.cos((pan + 1) * Math.PI / 4) * gain, pr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let k = 0; k < n; k++) {
    let s = fn(k / SR, k); if (s === 0) continue;
    let i = (i0 + k) % NS; if (i < 0) i += NS;
    if (dk) s *= SCG[i >> 6];
    const l = s * pl, r = s * pr;
    L[i] += l; R[i] += r;
    if (snd) { SND_L[i] += l * snd; SND_R[i] += r * snd; }
    if (ech) { ECH_L[i] += l * ech; ECH_R[i] += r * ech; }
  }
}
const dec = r => t => Math.exp(-t * r);
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
// state-variable filters (Chamberlin); cutoff in Hz, q = damping (lower = more resonant)
function lpf() { let lo = 0, bp = 0; return (x, fc, q) => { const f = Math.min(0.8, TAU * fc / SR); lo += f * bp; const hi = x - lo - q * bp; bp += f * hi; return lo; }; }
function bpf() { let lo = 0, bp = 0; return (x, fc, q) => { const f = Math.min(0.8, TAU * fc / SR); lo += f * bp; const hi = x - lo - q * bp; bp += f * hi; return bp; }; }
const rel = (t, d, r) => t > d ? Math.max(0, 1 - (t - d) / r) : 1;
// ---- tonal instruments
function squareFn(f, d) { let p = 0; const F = lpf(), dt = f / SR; return t => { p += dt; if (p >= 1) p -= 1; const v = (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt); return F(v, 2800, 0.6) * (t < 0.004 ? t / 0.004 : 1) * (0.5 + 0.5 * Math.exp(-t * 7)) * rel(t, d, 0.05); }; }
function glassFn(f) { let pc = 0, pm = 0; return t => { pc += f / SR; pm += f * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + 1.2 * Math.exp(-t * 5) * fsin(TAU * pm)) * Math.exp(-t * 2.4) * (t < 0.004 ? t / 0.004 : 1); }; }
function chordFn(ms, d, cut, att, env, cutTo) { // detuned saws through a low-pass: the pads (cutTo: the filter opens over d)
  const n = ms.length * 2, ph = new Float64Array(n), dts = []; ms.forEach(m => { const f = mtof(m); dts.push(f * 1.005 / SR, f * 0.995 / SR); }); const F = lpf();
  return t => { let x = 0; for (let j = 0; j < n; j++) { let q = ph[j] + dts[j]; if (q >= 1) q -= 1; ph[j] = q; x += 2 * q - 1; } const fc = env ? cut * (0.25 + 0.75 * Math.exp(-t * env)) : cutTo ? cut * Math.pow(cutTo / cut, clamp(t / d, 0, 1)) : cut; return F(x / n, fc, 0.7) * Math.min(1, t / att) * rel(t, d, att > 0.1 ? 0.5 : 0.06) * (env ? Math.exp(-t * 3) : 1); };
}
function bassFn(f, d) {
  let s = 0; const dt = f / SR;
  return t => { s += dt; s -= Math.floor(s); return (0.9 * fsin(TAU * s) + 0.3 * fsin(2 * TAU * s)) * (t < 0.004 ? t / 0.004 : 1) * rel(t, d, 0.03); };
}
// ---- drums and effects
function kickFn(seed) { let p = 0, q = 0; return (t, k) => { p += (60 + 120 * Math.exp(-t * 38)) / SR; q += 1600 / SR; return fsin(TAU * p) * Math.exp(-t * 11) * (t < 0.0015 ? t / 0.0015 : 1) + fsin(TAU * q) * 0.18 * Math.exp(-t * 110) + (t < 0.003 ? nz(k * 7 + seed) * 0.3 * (1 - t / 0.003) : 0); }; }
function snapFn(seed) { const F = bpf(); let p = 0; return (t, k) => { p += 900 / SR; return F(nz(k * 3 + seed), 2600, 0.6) * Math.exp(-t * 60) * 1.4 + fsin(TAU * p) * Math.exp(-t * 90) * 0.35; }; }
function shakerFn(seed) { const F = bpf(); return (t, k) => F(nz(k * 13 + seed), 6200, 1.0) * (t < 0.006 ? t / 0.006 : Math.exp(-(t - 0.006) * 32)) * 1.4; }
// a noise riser that peaks at d and then dies away (the release lets a riser that ends on the loop point ring on into bar 1)
function riserFn(d, seed) { const F = bpf(); let p = 0; return (t, k) => { const u = clamp(t / d, 0, 1); p += 110 * Math.pow(4, u) / SR; p -= Math.floor(p); return (F(nz(k * 19 + seed), 300 * Math.pow(22, u), 0.7) + (2 * p - 1) * 0.12) * u * u * (t > d ? Math.exp(-(t - d) * 14) : 1); }; }
// one music event
function playMusic(e, L, R) {
  const k = e.k, sd = Math.round(e.t * 1000), v = e.v;
  switch (k) {
    case 'pulse': voice(L, R, e.t, e.d + 0.05, 0, 0.07 * v, squareFn(mtof(e.m), e.d), { send: 0.25, echo: 0.2, duck: 1 }); break;
    case 'glassArp': voice(L, R, e.t, 0.9, e.p || 0, 0.09 * v, glassFn(mtof(e.m)), { send: 0.45, echo: 0.25 }); break;
    case 'glass': voice(L, R, e.t, 1.8, 0.15, 0.16 * v, glassFn(mtof(e.m)), { send: 0.55, echo: 0.3 }); break;
    case 'pad': voice(L, R, e.t, e.d + 0.8, 0, 0.2 * v, chordFn(e.ms, e.d, e.cut || 1100, 0.6, 0, e.cutTo), { send: 0.5, duck: 1 }); break;
    case 'sub': voice(L, R, e.t, e.d + 0.05, 0, 0.05 * v, bassFn(mtof(e.m), e.d)); break;
    case 'kick': voice(L, R, e.t, 0.5, 0, 0.2 * v, kickFn(sd)); break;
    case 'snap': voice(L, R, e.t, 0.15, 0.1, 0.12 * v, snapFn(sd), { send: 0.35 }); break;
    case 'shaker': voice(L, R, e.t, 0.12, e.p || 0, 0.13 * v, shakerFn(sd)); break;
    case 'riser': voice(L, R, e.t, e.d + 0.4, 0, 0.1 * v, riserFn(e.d, sd), { send: 0.4 }); break;
  }
}
// ---------------------------------------------------------------- SFX: understated, cinematic sonification (D minor)
function playSfx(e, L, R) {
  const k = e.k, v = e.v * 1.0, f = e.f || 440, p = e.p || 0, d = e.d || 0.2, sd = Math.round(e.t * 1000);
  const V = (t0, dur, g, fn, snd, pan) => voice(L, R, t0, dur, pan === undefined ? p : pan, g * v, fn, { send: snd === undefined ? 0.3 : snd });
  const sine = (fAt, envFn) => { let ph = 0; return t => { ph += fAt(t) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * envFn(t); }; };
  const bell = (f0, r, idx) => { let pc = 0, pm = 0; return t => { pc += f0 / SR; pm += f0 * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + idx * Math.exp(-t * 8) * fsin(TAU * pm)) * Math.exp(-t * r) * (t < 0.003 ? t / 0.003 : 1); }; };
  const noiseLP = (cutAt, envFn, seed) => { let lp = 0, lp2 = 0; return (t, kk) => { const a = 1 - Math.exp(-TAU * cutAt(t) / SR); lp += a * (nz(kk * 7 + seed) - lp); lp2 += a * (lp - lp2); return lp2 * envFn(t); }; };
  const noiseBP = (fcAt, q, envFn, seed) => { const F = bpf(); return (t, kk) => F(nz(kk * 13 + seed), fcAt(t), q) * envFn(t); };
  const swell = dd => t => Math.sin(Math.PI * clamp(t / dd, 0, 1));
  const att = (a, r) => t => (t < a ? t / a : 1) * Math.exp(-Math.max(0, t - a) * r);
  const edge = (dd, a, r) => t => Math.min(1, t / a) * Math.min(1, Math.max(0, dd - t) / r);
  switch (k) {
    case 'lowpulse': { const env = t => Math.min(1, t / 0.04) * Math.exp(-t * 2.6); V(e.t, d, 0.24, sine(t => 52 + 10 * Math.exp(-t * 6), env), 0.25); V(e.t, d, 0.07, sine(t => 104 + 20 * Math.exp(-t * 6), env), 0.3); V(e.t, d, 0.05, noiseLP(() => 600, edge(d, 0.3, 0.9), sd), 0.5); break; }
    // swells into the loop point and dies away just after it, under the low pulse of frame 0 (no click at the wrap)
    case 'preswell': { const env = t => t < d ? Math.pow(t / d, 2) : Math.exp(-(t - d) * 12); V(e.t, d + 0.4, 0.22, sine(t => 44 + 6 * Math.min(t, d), env), 0.3); V(e.t, d + 0.4, 0.05, noiseLP(t => 300 + 900 * Math.min(t, d) / d, env, sd), 0.5); break; }
    case 'whoosh': V(e.t, d, e.low ? 0.18 : 0.14, noiseLP(t => e.low ? 300 + 700 * Math.sin(Math.PI * t / d) : 700 + 2600 * Math.sin(Math.PI * t / d), swell(d), sd), 0.45); break;
    case 'reveal': [['D', 4], ['A', 4], ['F', 5], ['C', 6]].forEach(([n, o], i) => V(e.t + i * 0.06, d, 0.08, bell(fq(n, o), 1.8, 0.6), 0.6, -0.3 + 0.2 * i)); break;
    case 'ambience': V(e.t, d, 0.06, t => (fsin(TAU * (e.high ? 120 : 60) * t) + 0.4 * fsin(TAU * (e.high ? 240 : 120) * t)) * edge(d, 0.4, 0.7)(t), 0.3); V(e.t, d, 0.05, noiseLP(() => e.high ? 2400 : 900, edge(d, 0.4, 0.7), sd), 0.5); break;
    case 'servo': { let ph = 0; V(e.t, d, 0.07, t => { ph += (180 + 60 * Math.sin(Math.PI * t / d)) / SR; ph -= Math.floor(ph); return (2 * ph - 1) * edge(d, 0.05, 0.12)(t); }, 0.2); break; }
    case 'click': V(e.t, 0.02, 0.22, (t, kk) => nz(kk * 3 + sd) * (1 - t / 0.02), 0.15); V(e.t, 0.08, 0.1, sine(() => 900, att(0.001, 50)), 0.2); break;
    case 'fluid': V(e.t, d, 0.12, noiseLP(t => 260 + 500 * Math.sin(Math.PI * t / d), swell(d), sd), 0.4); V(e.t + 0.05, 0.25, 0.12, sine(t => 300 * (1 + 0.8 * Math.min(1, t / 0.2)), att(0.01, 9)), 0.4); break;
    case 'softtick': V(e.t, 0.06, 0.16, noiseBP(() => f, 0.4, att(0.001, 60), sd), 0.3); V(e.t, 0.05, 0.05, sine(() => f * 0.5, att(0.001, 70)), 0.2); break;
    // a heartbeat: lub-dub, low and round (the strong one propels the contrast into the aorta)
    case 'heart': { const g = e.strong ? 0.5 : 0.38; V(e.t, 0.35, g, sine(t => 52 + 30 * Math.exp(-t * 18), att(0.006, 9)), 0.15); V(e.t + 0.17, 0.3, g * 0.7, sine(t => 60 + 30 * Math.exp(-t * 20), att(0.006, 11)), 0.15); break; }
    case 'branch': for (let i = 0; i < 6; i++) V(e.t + i * 0.12, 0.5, 0.05, noiseBP(t => 900 + 300 * i + 800 * t, 0.5, swell(0.5), sd + i), 0.5, -0.6 + 0.24 * i); break;
    case 'swell': V(e.t, d, 0.06, noiseLP(() => 700, swell(d), sd), 0.5); break;
    case 'flow': V(e.t, d, 0.1, noiseBP(t => 500 + 1400 * t / d, 0.6, swell(d), sd), 0.45); break;
    case 'rise': V(e.t, d, 0.08, sine(t => (e.bright ? 520 : 260) * Math.pow(2, t / d), edge(d, 0.4, 0.3)), 0.5); V(e.t, d, 0.05, noiseLP(t => 400 + 3000 * t / d, edge(d, 0.4, 0.3), sd), 0.5); break;
    case 'shimmer': for (let i = 0; i < 6; i++) V(e.t + i * 0.07, 0.8, 0.06, bell(scl(9 + i * 2, 4), 4, 0.5), 0.6, -0.5 + 0.2 * i); break;
    case 'confirm': V(e.t, 0.6, 0.12, bell(fq('A', 5), 4, 0.5), 0.5, -0.15); V(e.t + 0.15, 0.9, 0.12, bell(fq('D', 6), 3, 0.5), 0.5, 0.15); break;
    case 'motor': { let ph = 0; V(e.t, d, 0.09, t => { const u = clamp(t / d, 0, 1); ph += (60 + 160 * u * u) / SR; ph -= Math.floor(ph); return (2 * ph - 1) * edge(d, 0.15, 0.3)(t) * (0.8 + 0.2 * fsin(TAU * 17 * t)); }, 0.25); V(e.t, d, 0.04, noiseLP(t => 300 + 1500 * t / d, edge(d, 0.2, 0.3), sd), 0.4); break; }
    case 'scan': V(e.t, d, 0.07, noiseBP(t => 1500 * Math.pow(3, t / d), 0.35, swell(d), sd), 0.5); V(e.t, d, 0.04, sine(t => 880 + 440 * t / d, swell(d)), 0.5); break;
    case 'dettick': V(e.t, 0.03, 0.12, sine(() => f, att(0.0005, 120)), 0.15); break;
    case 'absorb': V(e.t, 0.08, 0.08, sine(() => 220, att(0.002, 40)), 0.15); break;
    case 'blip': V(e.t, 0.12, 0.09, sine(() => f, att(0.002, 22)), 0.3); break;
    case 'helix': for (let i = 0; i < 36; i++) { const u = i / 36, tt = e.t + d * (1 - Math.pow(1 - u, 1.6)); V(tt, 0.05, 0.05 + 0.04 * u, sine(() => scl(7 + (i % 5), 4), att(0.001, 50)), 0.25, (i % 2 ? 0.3 : -0.3)); } V(e.t, d, 0.04, noiseBP(t => 800 + 2400 * t / d, 0.5, edge(d, 0.4, 0.3), sd), 0.4); break;
    case 'compute': V(e.t, 0.3, 0.12, bell(f, 9, 0.9), 0.35); V(e.t, 0.04, 0.05, noiseBP(() => 5000, 0.3, att(0.001, 80), sd), 0.2); break;
    case 'resolve': [['D', 4], ['F', 4], ['A', 4], ['E', 5]].forEach(([n, o], i) => V(e.t + i * 0.04, d, 0.06, sine(() => fq(n, o), edge(d, 0.3, d * 0.6)), 0.6, -0.3 + 0.2 * i)); break;
    case 'slice': V(e.t, 0.18, 0.12, bell(f, 14, 0.5), 0.3); V(e.t, 0.02, 0.08, (t, kk) => nz(kk + sd) * (1 - t / 0.02), 0.1); break;
    case 'align': for (let i = 0; i < 8; i++) V(e.t + i * 0.05, 0.12, 0.06, sine(() => scl(5 + i, 4), att(0.002, 25)), 0.3, -0.4 + 0.1 * i); V(e.t + 0.4, d, 0.07, bell(fq('D', 5), 2.5, 0.8), 0.6); break;
    case 'discover': [['D', 4], ['F', 4], ['A', 4], ['C', 5], ['E', 5]].forEach(([n, o], i) => V(e.t + i * 0.05, d, 0.08, bell(fq(n, o), 1.6, 0.7), 0.6, -0.4 + 0.2 * i)); V(e.t, 0.8, 0.12, sine(() => fq('D', 2), att(0.02, 3)), 0.3); break;
    case 'swish': V(e.t, d, 0.08, noiseLP(t => 1200 + 2500 * Math.sin(Math.PI * t / d), swell(d), sd), 0.4); V(e.t + d * 0.8, 0.02, 0.1, (t, kk) => nz(kk * 5 + sd) * (1 - t / 0.02), 0.15); break;
  }
}
// ---------------------------------------------------------------- effects
// plate-like Schroeder reverb (4 damped combs + 2 allpasses per side), run twice round the loop so the tail wraps
function reverb(inL, inR, outL, outR, wet) {
  const C = [1116, 1188, 1277, 1356].map(n => Math.round(n * SR / 44100)), A = [556, 441].map(n => Math.round(n * SR / 44100));
  [[inL, outL, 0], [inR, outR, 23]].forEach(([inp, out, sp]) => {
    const c0 = new Float32Array(C[0] + sp), c1 = new Float32Array(C[1] + sp), c2 = new Float32Array(C[2] + sp), c3 = new Float32Array(C[3] + sp);
    const a0 = new Float32Array(A[0] + sp), a1 = new Float32Array(A[1] + sp);
    let i0 = 0, i1 = 0, i2 = 0, i3 = 0, j0 = 0, j1 = 0, f0 = 0, f1 = 0, f2 = 0, f3 = 0;
    const fb = 0.86, dm = 0.32, dm1 = 1 - dm;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NS; i++) {
      const x = inp[i] * 0.2; let o, y = 0;
      o = c0[i0]; f0 = o * dm1 + f0 * dm; c0[i0] = x + f0 * fb; if (++i0 >= c0.length) i0 = 0; y += o;
      o = c1[i1]; f1 = o * dm1 + f1 * dm; c1[i1] = x + f1 * fb; if (++i1 >= c1.length) i1 = 0; y += o;
      o = c2[i2]; f2 = o * dm1 + f2 * dm; c2[i2] = x + f2 * fb; if (++i2 >= c2.length) i2 = 0; y += o;
      o = c3[i3]; f3 = o * dm1 + f3 * dm; c3[i3] = x + f3 * fb; if (++i3 >= c3.length) i3 = 0; y += o;
      o = a0[j0]; a0[j0] = y + o * 0.5; y = o - y; if (++j0 >= a0.length) j0 = 0;
      o = a1[j1]; a1[j1] = y + o * 0.5; y = o - y; if (++j1 >= a1.length) j1 = 0;
      if (pass === 1) out[i] += y * wet;
    }
  });
}
// ---------------------------------------------------------------- render: opts.bus 'm' (music only) / 's' (SFX only) / both
function renderAudio(opts) {
  opts = opts || {};
  const L = new Float32Array(NS), R = new Float32Array(NS);
  SND_L = new Float32Array(NS); SND_R = new Float32Array(NS); ECH_L = new Float32Array(NS); ECH_R = new Float32Array(NS);
  const sfx = sfxEvents();
  if (opts.bus !== 's') {
    const mus = musicEvents();
    // sidechain: the bed ducks under every kick
    SCG = new Float32Array((NS >> 6) + 2).fill(1);
    for (const e of mus) if (e.k === 'kick') {
      const depth = 0.25 * e.v, j0 = Math.round(e.t * SR) >> 6, n = Math.round(0.26 * SR) >> 6;
      for (let q = 0; q < n; q++) { const j = (j0 + q) % SCG.length, u = q * 64 / SR, a = u < 0.004 ? u / 0.004 : Math.exp(-(u - 0.004) * 13); SCG[j] *= 1 - depth * a; }
    }
    for (const e of mus) playMusic(e, L, R);
    // the band dips under the SFX (full mix only: the music-only version has nothing to make room for)
    if (opts.bus !== 'm') for (const e of sfx) {
      const dk = DUCK[e.k]; if (!dk) continue;
      const i0 = Math.round(e.t * SR), n = Math.round(0.45 * SR), att = Math.round(0.006 * SR);
      for (let k = 0; k < n; k++) { const i = (i0 + k) % NS, a = k < att ? k / att : Math.exp(-(k - att) / SR * 7), g = 1 - dk * a; L[i] *= g; R[i] *= g; }
    }
  }
  if (opts.bus !== 'm') for (const e of sfx) playSfx(e, L, R);
  // dotted-eighth ping-pong delay on the leads (circular)
  { const D = Math.round(0.75 * BEAT * SR), fb = 0.36;
    for (let i = 0; i < NS; i++) { let el = 0, er = 0, w = 1; for (let k = 1; k <= 4; k++) { w *= fb; const j = (i - k * D + NS * 4) % NS; if (k % 2) { el += w * ECH_R[j]; er += w * ECH_L[j]; } else { el += w * ECH_L[j]; er += w * ECH_R[j]; } } L[i] += el; R[i] += er; SND_L[i] += el * 0.3; SND_R[i] += er * 0.3; } }
  ECH_L = null; ECH_R = null; SCG = null;
  reverb(SND_L, SND_R, L, R, 0.8);
  SND_L = null; SND_R = null;
  // master: DC blocking, a gentle top roll-off (~15 kHz) and soft saturation; circular, in place
  const a = Math.exp(-TAU * 15000 / SR);
  for (const ch of [L, R]) {
    let y = 0, x1 = 0, hp = 0;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NS; i++) {
      const x = ch[i];
      y = a * y + (1 - a) * x;
      hp = 0.9993 * (hp + y - x1); x1 = y;
      if (pass === 1) ch[i] = Math.tanh(hp * 1.15) / 1.15;
    }
  }
  return { L, R };
}
// ---------------------------------------------------------------- player playback (one buffer, the audio clock drives the picture)
const LIVE = { ctx: null, buf: null, src: null, gain: null, muted: false, startAt: 0, offset: 0, ready: false };
function liveInit() {
  if (LIVE.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  LIVE.ctx = new AC({ sampleRate: SR });
  LIVE.gain = LIVE.ctx.createGain(); LIVE.gain.gain.value = 0.9; LIVE.gain.connect(LIVE.ctx.destination);
}
function liveBuild() {
  if (LIVE.buf) return;
  liveInit();
  const a = renderAudio();
  const b = LIVE.ctx.createBuffer(2, NS, SR); b.getChannelData(0).set(a.L); b.getChannelData(1).set(a.R);
  LIVE.buf = b; LIVE.ready = true;
}
function livePlay(t) {
  liveBuild();
  if (LIVE.ctx.state === 'suspended') LIVE.ctx.resume();
  const s = LIVE.ctx.createBufferSource(); s.buffer = LIVE.buf; s.loop = true; s.connect(LIVE.gain);   // the soundtrack loops seamlessly with the picture
  LIVE.startAt = LIVE.ctx.currentTime + 0.03; LIVE.offset = t; s.start(LIVE.startAt, t); LIVE.src = s;
}
function livePause() { if (LIVE.src) { try { LIVE.src.stop(); } catch (e) { } LIVE.src = null; } }
function liveNow() { return (LIVE.offset + Math.max(0, LIVE.ctx.currentTime - LIVE.startAt)) % DUR; }
function liveMute(m) { LIVE.muted = m; if (LIVE.gain) LIVE.gain.gain.value = m ? 0 : 0.9; }
