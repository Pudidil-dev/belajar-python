'use strict';
// ============================================================================
// AUDIO — an original, subtle, futuristic cinematic ambient score plus
// event-synced scientific SFX, synthesised sample by sample in plain JS.
// 120 BPM with a half-time feel, 30 bars of 2 s = 60.000 s (one bar per
// technical scene), E minor (Em9 – Cmaj7 – Am9 – B7sus4 colours; a darker
// Fmaj7#11 when the enzyme is blocked). Mixed low so a voiceover can sit on top:
// soft analog pads, a gentle digital pulse, a minimal sub, sparse soft
// percussion, fine glassy shimmer. One four-note motif (E–B–G–F# on glass)
// marks the burst at the start, returns bright on the assembly line, dark when
// amoxicillin arrives and broken at the lysis. The sections follow the film:
// the burst (pad and pulse), the journey (a soft half-time groove), the
// envelope (the pads open), wall building (a sequenced glass arpeggio), the
// cross-link (steady), inhibition (darker, a missing beat), failure (low
// swell), the return (thinning back into bar 1 — a seamless loop).
// SFX: every cue is read from the event table EV (03_clock.js) that draws the
// picture, so each starts on the frame of its event. Explanatory sonification,
// kept understated: no gunshots, no lasers, no explosion at the lysis.
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const fq = (n, o) => mtof(nm(n, o));
const EMIN = [0, 2, 3, 5, 7, 8, 10];
const scl = (i, o) => mtof(nm('E', o) + EMIN[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7));
// one chord per bar (bar 30 resolves to Em9, the chord of bar 1: the loop joins on the same harmony)
const CHORDS = ['Em9', 'Em9', 'Cmaj7', 'Am9', 'Cmaj7', 'Em9', 'D69', 'Cmaj7', 'Am9', 'B7sus4', 'Em9', 'Cmaj7', 'Am9', 'B7sus4', 'Em9',
  'Cmaj7', 'Am9', 'Em9', 'Cmaj7', 'D69', 'B7sus4', 'Cmaj7', 'Am9', 'Fmaj7s11', 'Em9', 'B7sus4', 'Am9', 'B7sus4', 'Cmaj7', 'Em9'];
const CH = { Em9: ['E', [0, 3, 7, 10, 14]], Cmaj7: ['C', [0, 4, 7, 11, 14]], Am9: ['A', [0, 3, 7, 10, 14]], B7sus4: ['B', [0, 5, 7, 10]], D69: ['D', [0, 4, 7, 9, 14]], Fmaj7s11: ['F', [0, 4, 7, 11, 18]] };
function chordNotes(ch, oct) { const [r, iv] = CH[ch]; const b = nm(r, oct); return iv.map(i => b + i); }
const rootOf = (ch, oct) => nm(CH[ch][0], oct);
const MOTIF = [[0, nm('E', 5)], [3, nm('B', 5)], [6, nm('G', 5)], [10, nm('F#', 5)]];   // [sixteenth, note]
function musicEvents() {
  const ev = [], E = o => ev.push(o);
  const at = (b, beat) => barT(b) + beat * BEAT, ch = b => CHORDS[b - 1];
  const pad = (b, v, cut, x) => E(Object.assign({ t: at(b, 0), d: 4 * BEAT + 0.3, k: 'pad', ms: chordNotes(ch(b), 3), v, cut: cut || 1100 }, x || {}));
  const sub = (b, v) => { const r = rootOf(ch(b), 1); E({ t: at(b, 0), d: 4 * BEAT, k: 'sub', m: r < 30 ? r + 12 : r, v }); };
  const PULSE = [0, 12, 7, 12];
  const pulse = (b, v, step) => { for (let i = 0; i * step < 4 - 1e-6; i++) { const x = i * step; E({ t: at(b, x), d: step * BEAT * 0.7, k: 'pulse', m: rootOf(ch(b), 3) + PULSE[Math.round(x * 4) % 4], v: v * (x % 1 === 0 ? 1 : 0.7) }); } };
  const kick = (b, beats, v) => beats.forEach(x => E({ t: at(b, x), d: 0.5, k: 'kick', v }));
  const snap = (b, beats, v) => beats.forEach(x => E({ t: at(b, x), d: 0.1, k: 'snap', v }));
  const shaker = (b, v) => { for (let i = 0; i < 8; i++) E({ t: at(b, i / 2), d: 0.1, k: 'shaker', v: v * (i % 2 ? 1 : 0.55), p: 0.3 }); };
  const arp = (b, v, oct, n) => { const ns = chordNotes(ch(b), oct); for (let i = 0; i < n; i++) E({ t: at(b, i * 4 / n), d: 0.5 * BEAT, k: 'glassArp', m: ns[(i * 2 + Math.floor(i / 4)) % ns.length] + (i % 8 > 5 ? 12 : 0), v: v * (i % 4 === 0 ? 1 : 0.7), p: i % 2 ? 0.35 : -0.35 }); };
  const motif = (b, v, lift, upto) => MOTIF.slice(0, upto || 4).forEach(([st, m]) => E({ t: at(b, st / 4), d: 1.2, k: 'glass', m: m + 12 * (lift || 0), v }));
  const shimmer = (b, v) => { const ns = chordNotes(ch(b), 5); [0.5, 1.75, 2.5, 3.25].forEach((x, i) => E({ t: at(b, x), d: 1.0, k: 'glass', m: ns[(i * 3 + b) % ns.length] + 12, v: v * (0.6 + 0.2 * (i % 2)) })); };
  // A — the burst (bars 1–3): pad, a slow pulse, the motif on the hook
  for (let b = 1; b <= 3; b++) { pad(b, 0.42, 900 + 120 * b); sub(b, 0.4); pulse(b, 0.2, 1); }
  motif(1, 0.5); shimmer(3, 0.24);
  // B — the journey (bars 4–7): a soft half-time groove (kick on 1, snap on 3), pulse eighths
  for (let b = 4; b <= 7; b++) { pad(b, 0.4, 1150); sub(b, 0.44); kick(b, [0], 0.42); snap(b, [2], 0.28); pulse(b, 0.22, 0.5); shaker(b, 0.14); if (b % 2) shimmer(b, 0.22); }
  // C — the envelope (bars 8–10): the pads open, a light arpeggio, a riser into the molecular world
  for (let b = 8; b <= 10; b++) { pad(b, 0.4, 1150, { cutTo: 1900 }); sub(b, 0.4); kick(b, [0], 0.36); arp(b, 0.18, 5, 8); }
  E({ t: at(10, 0), d: 4 * BEAT, k: 'riser', v: 0.22 });
  // D — wall building (bars 11–16): the assembly line, a sequenced sixteenth glass arpeggio over a steady groove
  for (let b = 11; b <= 16; b++) { pad(b, 0.36, 1500); sub(b, 0.42); kick(b, [0, 2.5], 0.4); snap(b, [2], 0.3); shaker(b, 0.18); arp(b, 0.2, 5, b >= 13 ? 16 : 8); pulse(b, 0.16, 0.5); }
  motif(11, 0.34, 1);
  // E — the cross-link (bars 17–21): steady, warmer; the motif returns low when amoxicillin arrives (bar 21 = 40 s)
  for (let b = 17; b <= 21; b++) { pad(b, 0.4, 1700); sub(b, 0.42); kick(b, [0], 0.4); snap(b, [2], 0.26); pulse(b, 0.2, 0.5); if (b !== 21) shimmer(b, 0.22); }
  motif(21, 0.46, -1);
  // F — inhibition (bars 22–26): darker; the groove loses its snap; bar 24 (the blocked attempt) drops the second half
  for (let b = 22; b <= 26; b++) { pad(b, 0.42, b === 24 ? 900 : 1200); sub(b, 0.46); kick(b, [0], 0.36); if (b !== 24) pulse(b, 0.18, 1); else pulse(b, 0.18, 2); }
  E({ t: at(26, 0), d: 4 * BEAT, k: 'riser', v: 0.2 });
  // G — failure (bars 27–28): a low swell; the motif breaks off (three notes) at the lysis
  for (let b = 27; b <= 28; b++) { pad(b, 0.44, 1000, { cutTo: 700 }); sub(b, 0.5); }
  motif(28, 0.4, 0, 3);
  // H — the return (bars 29–30): thinning back to the opening texture, into bar 1
  for (let b = 29; b <= 30; b++) { pad(b, 0.42, lerp(1200, 1020, b - 29)); sub(b, 0.4); pulse(b, 0.2, 1); }
  shimmer(29, 0.22);
  return ev;
}
// ---------------------------------------------------------------- SFX map: one sound per event (from the event table)
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440, d: 0.2 }, x || {}));
  // A — the bulge throbs (also the loop's landing), the membrane tears, the contents flow out; pull-back; the match cut; lips; swallow
  S(EV.pulse0, 'lowpulse', 0.85, { d: 1.2 }); S(EV.tear0, 'tear', 0.7, { d: 0.5 }); S(EV.spill0, 'spill', 0.6, { d: 1.6 });
  S(EV.pull, 'whoosh', 0.4, { d: 1.1, low: 1 }); S(EV.drift, 'ambience', 0.35, { d: 1.2 }); S(EV.match, 'swish', 0.4, { d: 0.35 });
  S(EV.lips, 'whoosh', 0.3, { d: 0.4 }); S(EV.swallow, 'swallow', 0.7, { d: 0.6 });
  // B — the stomach, the capsule softens and splits, the gut lining, the blood, the capillary
  S(EV.splash, 'splash', 0.6, { d: 0.7 }); S(EV.shell, 'soften', 0.5, { d: 0.5 }); S(EV.drugOut, 'dissolve', 0.55, { d: 1.0 });
  S(EV.gut, 'whoosh', 0.35, { d: 0.6, low: 1 }); S(EV.villus, 'ambience', 0.3, { d: 1.0, wet: 1 }); S(EV.cross, 'absorb', 0.5, { d: 0.7 });
  S(EV.blood, 'heart', 0.6); S(EV.rbc, 'whoosh', 0.35, { d: 0.5 }); S(EV.capillary, 'swell', 0.3, { d: 0.8 }); S(EV.seep, 'seep', 0.45, { d: 0.8 }); S(EV.diffuse, 'shimmer', 0.35, { d: 0.8 });
  // C — growth, the band of new wall, the cutaway, the layers, the zoom, the mesh
  S(EV.grow, 'stretch', 0.4, { d: 1.2 }); S(EV.band, 'weave', 0.4, { d: 0.6 }); S(EV.cut, 'slice', 0.45, { f: scl(9, 4) }); S(EV.layers, 'layers', 0.45, { d: 0.6 });
  S(EV.zoom, 'rise', 0.4, { d: 0.7 }); S(EV.mesh, 'reveal', 0.45, { d: 1.2 });
  // D — precursor assembly: four ligase clicks (rising), docking at MraY, transfer, UMP off, MurG, the flip, the GT, the carrier recycled
  S(EV.dive, 'whoosh', 0.4, { d: 0.55, low: 1 }); EV.aa.forEach((ta, i) => S(ta, 'click', 0.5, { f: scl(7 + 2 * i, 4), p: -0.3 + 0.2 * i }));
  S(EV.dock, 'dock', 0.5); S(EV.transfer, 'transfer', 0.45, { d: 0.35 }); S(EV.ump, 'pop', 0.35, { f: scl(4, 5) });
  S(EV.udpglc, 'dock', 0.35, { light: 1 }); S(EV.sugar, 'click', 0.5, { f: scl(11, 4) }); S(EV.udp, 'pop', 0.35, { f: scl(5, 5) });
  S(EV.flipIn, 'servo', 0.4, { d: 0.45 }); S(EV.flip, 'flip', 0.45, { d: 0.45 }); S(EV.flipOut, 'click', 0.4, { f: scl(9, 4) });
  S(EV.gtBind, 'dock', 0.4); S(EV.polymer, 'polymer', 0.5); S(EV.release, 'pop', 0.35, { f: scl(2, 5) });
  S(EV.dephos, 'pop', 0.35, { f: scl(6, 5) }); S(EV.flipBack, 'flip', 0.3, { d: 0.4 }); S(EV.reveal, 'reveal', 0.4, { d: 1.0 });
  // E — the PBP glides in and binds; the serine attacks; D-Ala leaves; the acyl-enzyme; the acceptor; the cross-link; more links; amoxicillin drifts in
  S(EV.pbpSlide, 'slide', 0.4, { d: 0.9 }); S(EV.pbpBind, 'dock', 0.45);
  S(EV.serAttack, 'attack', 0.6); S(EV.dalaOut, 'pop', 0.4, { f: scl(3, 5) }); S(EV.acyl, 'bond', 0.4, { f: scl(7, 4) });
  S(EV.acceptor, 'approach', 0.4, { d: 0.45 }); S(EV.xlink, 'bond', 0.65, { f: scl(9, 4), strong: 1 }); S(EV.pbpFree, 'release', 0.4, { d: 0.5 });
  EV.xlinks.forEach((tx, i) => S(tx, 'bond', 0.42, { f: scl(9 + 2 * i, 4), p: -0.4 + 0.4 * i }));
  S(EV.amoxIn, 'drift', 0.45, { d: 0.9 }); S(EV.amoxDown, 'drift', 0.3, { d: 0.7, lo: 1 }); S(EV.amoxNear, 'tension', 0.35, { d: 0.8 });
  // F — docking in the cleft, the enzyme closes, the serine attacks the ring, the ring opens, covalent lock; a donor is blocked; unlinked; hydrolase snips
  S(EV.dock2, 'dock', 0.55); S(EV.fit, 'fit', 0.5, { d: 0.5 }); S(EV.attack2, 'attack', 0.6); S(EV.ringOpen, 'ringopen', 0.6, { d: 0.6 }); S(EV.covalent, 'lock', 0.65, { d: 0.9 });
  S(EV.donorTry, 'approach', 0.4, { d: 0.6 }); S(EV.blocked, 'blocked', 0.6); S(EV.newUnit, 'click', 0.4, { f: scl(4, 4) }); S(EV.unlinked, 'incomplete', 0.45, { d: 1.0 });
  EV.cuts.forEach((tc, i) => S(tc, 'snip', 0.45, { f: scl(8 - i, 4), p: -0.35 + 0.14 * i })); S(EV.gap, 'creak', 0.4, { d: 0.6 });
  // G — strain, the bulge, the rupture (a soft tear and outflow, never a blast); H — the glide, the next cell, the orbit, its wall gives, the swell into the loop
  S(EV.strain, 'creak', 0.5, { d: 0.8, deep: 1 }); S(EV.bulge, 'bulge', 0.5, { d: 1.4 }); S(EV.lysis, 'tear', 0.8, { d: 0.55, big: 1 }); S(EV.outflow, 'spill', 0.65, { d: 1.8 });
  S(EV.glide, 'whoosh', 0.35, { d: 1.1 }); S(EV.nextCell, 'ambience', 0.3, { d: 1.0 }); S(EV.orbit, 'swell', 0.3, { d: 1.0 }); S(EV.weak, 'creak', 0.35, { d: 0.4 });
  S(EV.prePulse, 'preswell', 0.45, { d: 0.4 });
  return ev;
}
// the band dips gently under the cues that matter
const DUCK = { lowpulse: 0.2, tear: 0.25, attack: 0.15, ringopen: 0.2, lock: 0.2, blocked: 0.2, bond: 0.1, swallow: 0.15 };
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
    case 'pulse': voice(L, R, e.t, e.d + 0.05, 0, 0.06 * v, squareFn(mtof(e.m), e.d), { send: 0.25, echo: 0.2, duck: 1 }); break;
    case 'glassArp': voice(L, R, e.t, 0.9, e.p || 0, 0.09 * v, glassFn(mtof(e.m)), { send: 0.45, echo: 0.25 }); break;
    case 'glass': voice(L, R, e.t, 1.8, 0.15, 0.16 * v, glassFn(mtof(e.m)), { send: 0.55, echo: 0.3 }); break;
    case 'pad': voice(L, R, e.t, e.d + 0.8, 0, 0.17 * v, chordFn(e.ms, e.d, e.cut || 1100, 0.6, 0, e.cutTo), { send: 0.5, duck: 1 }); break;
    case 'sub': voice(L, R, e.t, e.d + 0.05, 0, 0.05 * v, bassFn(mtof(e.m), e.d)); break;
    case 'kick': voice(L, R, e.t, 0.5, 0, 0.2 * v, kickFn(sd)); break;
    case 'snap': voice(L, R, e.t, 0.15, 0.1, 0.12 * v, snapFn(sd), { send: 0.35 }); break;
    case 'shaker': voice(L, R, e.t, 0.12, e.p || 0, 0.13 * v, shakerFn(sd)); break;
    case 'riser': voice(L, R, e.t, e.d + 0.4, 0, 0.1 * v, riserFn(e.d, sd), { send: 0.4 }); break;
  }
}
// ---------------------------------------------------------------- SFX: understated scientific sonification (E minor)
// quiet cues lifted so they read over the bed (measured with tools/audio_qa.js)
const SFX_BOOST = { spill: 1.8, tension: 1.7, absorb: 1.8, seep: 1.6, swish: 1.5, servo: 1.4, flip: 1.5, slide: 1.5, weave: 1.5, release: 1.5, pop: 1.3, polymer: 1.35, drift: 1.35, incomplete: 1.2, ambience: 1.2 };
function playSfx(e, L, R) {
  const k = e.k, v = e.v * 1.3 * (SFX_BOOST[e.k] || 1), f = e.f || 440, p = e.p || 0, d = e.d || 0.2, sd = Math.round(e.t * 1000);
  const V = (t0, dur, g, fn, snd, pan) => voice(L, R, t0, dur, pan === undefined ? p : pan, g * v, fn, { send: snd === undefined ? 0.3 : snd });
  const sine = (fAt, envFn) => { let ph = 0; return t => { ph += fAt(t) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * envFn(t); }; };
  const bell = (f0, r, idx) => { let pc = 0, pm = 0; return t => { pc += f0 / SR; pm += f0 * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + idx * Math.exp(-t * 8) * fsin(TAU * pm)) * Math.exp(-t * r) * (t < 0.003 ? t / 0.003 : 1); }; };
  const noiseLP = (cutAt, envFn, seed) => { let lp = 0, lp2 = 0; return (t, kk) => { const a = 1 - Math.exp(-TAU * cutAt(t) / SR); lp += a * (nz(kk * 7 + seed) - lp); lp2 += a * (lp - lp2); return lp2 * envFn(t); }; };
  const noiseBP = (fcAt, q, envFn, seed) => { const F = bpf(); return (t, kk) => F(nz(kk * 13 + seed), fcAt(t), q) * envFn(t); };
  const swell = dd => t => Math.sin(Math.PI * clamp(t / dd, 0, 1));
  const att = (a, r) => t => (t < a ? t / a : 1) * Math.exp(-Math.max(0, t - a) * r);
  const edge = (dd, a, r) => t => Math.min(1, t / a) * Math.min(1, Math.max(0, dd - t) / r);
  const tick = (t0, g, f0, pan) => { V(t0, 0.012, g, (t, kk) => nz(kk * 3 + sd + Math.round(f0)) * (1 - t / 0.012), 0.15, pan); V(t0, 0.07, g * 0.6, sine(() => f0, att(0.0008, 60)), 0.25, pan); };
  switch (k) {
    // the bulge's throb (frame 0 lands on it) and the swell that leads into it at the end
    case 'lowpulse': { const env = t => Math.min(1, t / 0.01) * Math.exp(-t * 2.8); V(e.t, d, 0.24, sine(t => 55 + 9 * Math.exp(-t * 6), env), 0.25); V(e.t, d, 0.06, sine(t => 110 + 18 * Math.exp(-t * 6), env), 0.3); V(e.t, d, 0.04, noiseLP(() => 500, edge(d, 0.25, 0.8), sd), 0.5); break; }
    case 'preswell': { const env = t => t < d ? Math.pow(t / d, 2) : Math.exp(-(t - d) * 12); V(e.t, d + 0.45, 0.2, sine(t => 46 + 6 * Math.min(t, d), env), 0.3); V(e.t, d + 0.45, 0.045, noiseLP(t => 300 + 900 * Math.min(t, d) / d, env, sd), 0.5); break; }
    // a membrane tearing: a falling band of noise over a soft low thud (no blast)
    case 'tear': { const g = e.big ? 1.25 : 1; V(e.t, d, 0.15 * g, noiseBP(t => 600 + 2400 * Math.exp(-t * 5), 0.45, att(0.004, 5.5), sd), 0.4); V(e.t, 0.6, 0.17 * g, sine(t => (e.big ? 58 : 70) + 40 * Math.exp(-t * 10), att(0.006, 6.5)), 0.25); V(e.t + 0.03, 0.2, 0.05 * g, noiseLP(() => 3000, att(0.002, 22), sd + 1), 0.2); break; }
    // the contents flowing out: a soft swell of low noise and small bubbles
    case 'spill': { V(e.t, d, 0.08, noiseLP(t => 380 + 420 * Math.sin(Math.PI * t / d), swell(d), sd), 0.5); for (let i = 0; i < 16; i++) { const tt = e.t + d * 0.8 * hash2(i, sd), f0 = 260 + 620 * hash2(i, sd + 1); V(tt, 0.09, 0.045, sine(t => f0 * (1 + 1.6 * t / 0.09), att(0.002, 38)), 0.45, (hash2(i, sd + 2) - 0.5) * 1.2); } break; }
    case 'whoosh': V(e.t, d, e.low ? 0.17 : 0.13, noiseLP(t => e.low ? 300 + 700 * Math.sin(Math.PI * t / d) : 700 + 2600 * Math.sin(Math.PI * t / d), swell(d), sd), 0.45); break;
    case 'swish': V(e.t, d, 0.08, noiseLP(t => 1200 + 2500 * Math.sin(Math.PI * t / d), swell(d), sd), 0.4); tick(e.t + d * 0.85, 0.08, 1500, 0); break;
    case 'ambience': V(e.t, d, 0.05, t => (fsin(TAU * 82.4 * t) + 0.4 * fsin(TAU * 164.8 * t)) * edge(d, 0.4, 0.6)(t), 0.3); V(e.t, d, 0.045, noiseLP(() => e.wet ? 600 : 1400, edge(d, 0.4, 0.6), sd), 0.5); break;
    case 'swallow': V(e.t, 0.45, 0.2, sine(t => 70 + 160 * Math.exp(-t * 5), att(0.01, 6)), 0.3); V(e.t + 0.08, 0.3, 0.07, noiseLP(() => 420, att(0.01, 9), sd), 0.3); break;
    // the stomach: a plop into fluid, the shell softening, the drug grains dissolving out
    case 'splash': V(e.t, 0.3, 0.16, sine(t => 170 * (1 + 2.5 * Math.exp(-t * 28)), att(0.002, 13)), 0.4); V(e.t, 0.5, 0.09, noiseLP(t => 600 + 2200 * Math.exp(-t * 6), att(0.003, 7), sd), 0.45); for (let i = 0; i < 4; i++) V(e.t + 0.12 + 0.07 * i, 0.06, 0.04, sine(t => 900 + 300 * i + 1200 * t, att(0.001, 50)), 0.4, -0.4 + 0.27 * i); break;
    case 'soften': V(e.t, d, 0.08, sine(t => 120 + 28 * Math.sin(TAU * 7 * t), edge(d, 0.06, 0.25)), 0.3); V(e.t, d, 0.03, noiseLP(() => 900, edge(d, 0.08, 0.25), sd), 0.4); break;
    case 'dissolve': for (let i = 0; i < 18; i++) { const tt = e.t + d * Math.pow(hash2(i, sd), 1.3) * 0.9; V(tt, 0.4, 0.028, bell(scl(14 + (i % 7), 4), 9, 0.4), 0.6, (hash2(i, sd + 3) - 0.5) * 1.6); } V(e.t, d, 0.04, noiseLP(() => 2600, swell(d), sd), 0.5); break;
    // crossing the lining, seeping through a cleft, diffusing out
    case 'absorb': for (let i = 0; i < 6; i++) { const tt = e.t + i * d / 6; V(tt, 0.05, 0.07, noiseBP(() => 1800 - 160 * i, 0.4, att(0.001, 70), sd + i), 0.25, -0.3 + 0.12 * i); V(tt, 0.06, 0.03, sine(() => scl(9 - i, 4), att(0.001, 50)), 0.3, -0.3 + 0.12 * i); } break;
    case 'seep': for (let i = 0; i < 4; i++) V(e.t + i * 0.16, 0.12, 0.05, sine(t => 320 * (1 + 0.9 * t / 0.12), att(0.004, 20)), 0.4, -0.2 + 0.13 * i); break;
    case 'heart': V(e.t, 0.35, 0.36, sine(t => 52 + 30 * Math.exp(-t * 18), att(0.006, 9)), 0.15); V(e.t + 0.17, 0.3, 0.26, sine(t => 60 + 30 * Math.exp(-t * 20), att(0.006, 11)), 0.15); break;
    case 'swell': V(e.t, d, 0.055, noiseLP(() => 700, swell(d), sd), 0.5); break;
    case 'shimmer': for (let i = 0; i < 6; i++) V(e.t + i * 0.07, 0.8, 0.05, bell(scl(9 + i * 2, 4), 4, 0.5), 0.6, -0.5 + 0.2 * i); break;
    // the envelope: growth (an elastic rise), new wall (soft weaving ticks), the cutaway and its layers
    case 'stretch': V(e.t, d, 0.07, sine(t => 98 + 50 * t / d + 3 * Math.sin(TAU * 5 * t), edge(d, 0.3, 0.4)), 0.35); V(e.t, d, 0.03, noiseLP(t => 400 + 600 * t / d, edge(d, 0.3, 0.4), sd), 0.45); break;
    case 'weave': for (let i = 0; i < 8; i++) tick(e.t + i * d / 8, 0.05, scl(7 + i, 4), -0.35 + 0.1 * i); break;
    case 'slice': V(e.t, 0.18, 0.12, bell(f, 14, 0.5), 0.3); V(e.t, 0.02, 0.08, (t, kk) => nz(kk + sd) * (1 - t / 0.02), 0.1); break;
    case 'layers': [11, 9, 7].forEach((s, i) => V(e.t + i * 0.15, 0.6, 0.08, bell(scl(s, 4), 5, 0.5), 0.5, -0.25 + 0.25 * i)); break;
    case 'rise': V(e.t, d, 0.07, sine(t => 260 * Math.pow(2, t / d), edge(d, 0.3, 0.2)), 0.5); V(e.t, d, 0.045, noiseLP(t => 400 + 3000 * t / d, edge(d, 0.3, 0.2), sd), 0.5); break;
    case 'reveal': [['E', 4], ['B', 4], ['G', 5], ['D', 6]].forEach(([n, o], i) => V(e.t + i * 0.06, d, 0.07, bell(fq(n, o), 1.8, 0.6), 0.6, -0.3 + 0.2 * i)); break;
    // molecular assembly: clicks, a magnetic latch, a transfer, little pops, the flippase turning over, a chain growing
    case 'click': tick(e.t, 0.1, f, p); V(e.t, 0.3, 0.05, bell(f * 2, 10, 0.4), 0.45); break;
    case 'dock': { const lt = e.light ? 1.5 : 1; V(e.t, 0.2, 0.15 / lt, sine(t => 120 * lt + 50 * Math.exp(-t * 30), att(0.003, 16)), 0.2); tick(e.t, 0.06 / lt, 2200, p); V(e.t + 0.02, 0.4, 0.04, bell(scl(7, 4) * lt, 7, 0.6), 0.45); break; }
    case 'transfer': { let ph = 0; const a0 = scl(7, 4), a1 = scl(9, 4); V(e.t, d, 0.07, t => { ph += lerp(a0, a1, smooth(clamp(t / d, 0, 1))) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * edge(d, 0.01, 0.08)(t); }, 0.4); V(e.t + d * 0.9, 0.5, 0.06, bell(a1 * 2, 6, 0.5), 0.5); break; }
    case 'pop': V(e.t, 0.07, 0.1, sine(t => f * (1 + 1.8 * t / 0.07), att(0.001, 45)), 0.3); V(e.t, 0.01, 0.04, (t, kk) => nz(kk * 5 + sd) * (1 - t / 0.01), 0.1); break;
    case 'servo': { let ph = 0; V(e.t, d, 0.06, t => { ph += (160 + 70 * Math.sin(Math.PI * t / d)) / SR; ph -= Math.floor(ph); return (2 * ph - 1) * edge(d, 0.05, 0.12)(t) * 0.7; }, 0.2); break; }
    case 'flip': V(e.t, d, 0.06, noiseBP(t => 800 + 1600 * Math.sin(Math.PI * t / d), 0.5, swell(d), sd), 0.45, -0.5); V(e.t, d, 0.06, noiseBP(t => 800 + 1600 * Math.sin(Math.PI * t / d), 0.5, t => swell(d)(t) * clamp(t / d, 0, 1), sd + 1), 0.45, 0.5); tick(e.t + d * 0.9, 0.06, 1700, 0.3); break;
    case 'polymer': [7, 9, 11].forEach((s, i) => tick(e.t + i * 0.06, 0.07, scl(s, 4), -0.2 + 0.2 * i)); V(e.t + 0.18, 0.7, 0.08, bell(scl(14, 4), 4, 0.6), 0.55); break;
    // the PBP: a glide, the serine's precise attack, bonds forming, the release
    case 'slide': V(e.t, d, 0.06, noiseBP(t => 600 + 300 * t / d, 0.6, swell(d), sd), 0.45); V(e.t, d, 0.03, sine(t => scl(2, 3) * (1 + 0.05 * t), swell(d)), 0.4); break;
    case 'attack': tick(e.t, 0.12, 2400, p); V(e.t, 0.4, 0.12, sine(t => 110 + 30 * Math.exp(-t * 25), att(0.003, 9)), 0.25); V(e.t, 0.25, 0.05, bell(fq('B', 5), 12, 0.8), 0.4); break;
    case 'bond': V(e.t, 0.6, e.strong ? 0.13 : 0.09, bell(f, 5, 0.6), 0.5); if (e.strong) V(e.t + 0.08, 0.8, 0.1, bell(f * 1.5, 4, 0.5), 0.55); tick(e.t, 0.05, f * 2, p); break;
    case 'approach': V(e.t, d, 0.06, sine(t => scl(4, 4) * (1 + 0.25 * t / d), edge(d, 0.1, 0.15)), 0.45); break;
    case 'release': V(e.t, 0.5, 0.06, bell(scl(11, 4), 6, 0.4), 0.5); V(e.t, d, 0.04, noiseLP(() => 1600, swell(d), sd), 0.45); break;
    // amoxicillin drifting in (it diffuses: an airy descending tone, no homing beep), tension near the enzyme
    case 'drift': { const hi = e.lo ? 11 : 14, lo = e.lo ? 9 : 11; V(e.t, d, 0.06, sine(t => lerp(scl(hi, 4), scl(lo, 4), t / d) * (1 + 0.004 * Math.sin(TAU * 6 * t)), edge(d, 0.15, 0.35)), 0.55); V(e.t, d, 0.03, noiseLP(() => 2200, edge(d, 0.15, 0.35), sd), 0.5); break; }
    case 'tension': V(e.t, d, 0.06, sine(() => fq('E', 2), edge(d, 0.3, 0.3)), 0.3); V(e.t, d, 0.04, sine(() => fq('F', 2), edge(d, 0.3, 0.3)), 0.3); break;
    // inhibition: the enzyme closes, the serine attacks the ring, the four-membered ring opens, a covalent lock
    case 'fit': V(e.t, 0.3, 0.12, sine(t => 90 + 20 * Math.exp(-t * 20), att(0.004, 10)), 0.25); V(e.t, 0.2, 0.05, noiseLP(() => 500, att(0.003, 16), sd), 0.3); break;
    case 'ringopen': [['B', 5], ['G', 5], ['E', 5], ['C', 5]].forEach(([n, o], i) => V(e.t + i * 0.05, 0.5, 0.07, bell(fq(n, o), 7, 0.7), 0.5, 0.3 - 0.2 * i)); V(e.t, 0.03, 0.08, noiseBP(() => 3500, 0.35, att(0.0008, 90), sd), 0.15); break;
    case 'lock': V(e.t, d, 0.12, bell(fq('E', 3), 2.2, 1.2), 0.45); V(e.t, 0.5, 0.15, sine(t => 60 + 25 * Math.exp(-t * 18), att(0.004, 7)), 0.25); tick(e.t, 0.08, 1300, 0); break;
    // a donor blocked (an interrupted action), stems left unlinked (an unresolved interval), remodeling snips, creaks of strain
    case 'blocked': V(e.t, 0.25, 0.15, sine(t => 150 - 40 * Math.min(1, t / 0.12), att(0.002, 16)), 0.2); V(e.t, 0.12, 0.07, noiseLP(() => 320, att(0.002, 30), sd), 0.2); V(e.t + 0.1, 0.25, 0.05, sine(() => scl(6, 4), att(0.004, 14)), 0.35); break;
    case 'incomplete': V(e.t, 0.7, 0.07, bell(scl(4, 4), 3.5, 0.5), 0.55, -0.2); V(e.t + 0.35, d, 0.07, bell(scl(5, 4), 3, 0.5), 0.55, 0.2); break;
    case 'snip': V(e.t, 0.03, 0.08, noiseBP(() => 4200, 0.3, att(0.0006, 110), sd), 0.15); V(e.t, 0.15, 0.05, bell(f * 2, 16, 0.4), 0.3); break;
    case 'creak': { let ph = 0; const base = e.deep ? 48 : 70; V(e.t, d, e.deep ? 0.09 : 0.06, t => { ph += (base + 8 * Math.sin(TAU * 3.3 * t) + 5 * Math.sin(TAU * 11 * t)) / SR; ph -= Math.floor(ph); return (2 * ph - 1) * edge(d, 0.08, 0.25)(t) * (0.6 + 0.4 * Math.abs(Math.sin(TAU * 13 * t))); }, 0.3); break; }
    case 'bulge': V(e.t, d, 0.12, sine(t => 52 + 32 * Math.pow(t / d, 1.4), edge(d, 0.4, 0.15)), 0.3); V(e.t, d, 0.04, noiseLP(t => 250 + 500 * t / d, edge(d, 0.4, 0.15), sd), 0.45); break;
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
