'use strict';
// ============================================================================
// AUDIO — an original, restrained cinematic-electronic score plus event-synced
// SFX, synthesised sample by sample in plain JS. 80 BPM, 21 bars = 63.000 s,
// one bar per scene, D minor. Built as a bed for a voice-over: soft analog
// pads low-passed under the speech band, a quiet sub, sparse glassy figures,
// no busy lead, no constant heartbeat, no alarms; the full mix is mastered to
// −22 LUFS so a narration can sit 6–10 dB above it.
// Sections follow the film: the walk (a steady muted pulse that stops with him),
// the leg (the pad opens), the artery (glassy "molecular" eighths), the disease
// (the rhythm turns irregular, then accumulates; a darker Eb colour; a deepening
// bass), stenosis (thin), occlusion (everything drops to a low pedal), the
// collaterals (the relative major, a rising four-note figure), walking again
// (a steady activity rhythm that builds), rest (it falls away), the scan (a
// precise sixteenth pulse), the contrast's journey (arpeggios), the CTA image
// (the pads open), the lesions (focused, then the pulse stops at the cut-off),
// the comparison (wide) and the resolution: an open D (sus2) that ends by 63 s.
// SFX: every cue reads the event table EV (03_clock.js) that draws the picture,
// so each starts on the frame of its event. They are explanatory sonification
// kept understated: blood flow, plaque and contrast make no such sounds.
// The film does not loop: nothing wraps; the last half second fades to silence.
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const fq = (n, o) => mtof(nm(n, o));
const DMIN = [0, 2, 3, 5, 7, 8, 10];
const scl = (i, o) => mtof(nm('D', o) + DMIN[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7));
const barT = b => (b - 1) * BAR;
// ---------------------------------------------------------------- harmony: one chord per scene
const CHORDS = ['Dm9', 'Bbmaj9', 'Gm9', 'Dm9', 'Bbmaj7', 'Gm9', 'Ebmaj7', 'A7sus4', 'Dm9', 'DmPed', 'Fmaj7', 'Gm9', 'Bbmaj7', 'Dm9', 'Gm9', 'Bbmaj7', 'Fmaj7', 'Gm9', 'A7sus4', 'Bbmaj7', 'Dsus2'];
const CH = {
  Dm9: ['D', [0, 3, 7, 10, 14]], Bbmaj9: ['Bb', [0, 4, 7, 11, 14]], Bbmaj7: ['Bb', [0, 4, 7, 11]], Gm9: ['G', [0, 3, 7, 10, 14]],
  Ebmaj7: ['Eb', [0, 4, 7, 11]], A7sus4: ['A', [0, 5, 7, 10]], DmPed: ['D', [0, 7, 15]], Fmaj7: ['F', [0, 4, 7, 11]], Dsus2: ['D', [0, 2, 7, 12, 14]],
};
function chordNotes(ch, oct) { const [r, iv] = CH[ch]; const b = nm(r, oct); return iv.map(i => b + i); }
const rootOf = (ch, oct) => nm(CH[ch][0], oct);
function musicEvents() {
  const ev = [], E = o => ev.push(o);
  const at = (b, beat) => barT(b) + beat * BEAT, ch = b => CHORDS[b - 1];
  const pad = (b, v, cut, x) => E(Object.assign({ t: at(b, 0), d: 4 * BEAT + 0.3, k: 'pad', ms: chordNotes(ch(b), 3), v, cut: cut || 1000 }, x || {}));
  const sub = (b, v, d) => { const m = rootOf(ch(b), 1); E({ t: at(b, 0), d: d || 4 * BEAT, k: 'sub', m: m < 30 ? m + 12 : m, v }); };
  const PULSE = [0, 12, 7, 12];
  const pulse = (b, v, step, from, to, velFn) => { for (let i = 0; i * step < 4 - 1e-6; i++) { const x = i * step; if (x < (from || 0) || x >= (to === undefined ? 4 : to)) continue; E({ t: at(b, x), d: step * BEAT * 0.7, k: 'pulse', m: rootOf(ch(b), 3) + PULSE[Math.round(x * 4) % 4], v: v * (x % 1 === 0 ? 1 : 0.7) * (velFn ? velFn(x) : 1) }); } };
  const kick = (b, beats, v) => beats.forEach(x => E({ t: at(b, x), d: 0.5, k: 'kick', v }));
  const tick = (b, beats, v) => beats.forEach(x => E({ t: at(b, x), d: 0.1, k: 'snap', v }));
  const shaker = (b, v) => { for (let i = 0; i < 16; i++) E({ t: at(b, i / 4), d: 0.1, k: 'shaker', v: v * (i % 2 ? 1 : 0.55), p: 0.3 }); };
  const arp = (b, v, oct, rate, skip) => { const ns = chordNotes(ch(b), oct), n = rate === 8 ? 8 : 16; for (let i = 0; i < n; i++) { if (skip && skip(i)) continue; E({ t: at(b, i * 4 / n), d: 0.5 * BEAT, k: 'glassArp', m: ns[(i * 2 + Math.floor(i / 4)) % ns.length] + (i % 8 > 5 ? 12 : 0), v: v * (i % 4 === 0 ? 1 : 0.7), p: i % 2 ? 0.35 : -0.35 }); } };
  const shimmer = (b, v) => { const ns = chordNotes(ch(b), 5); [0.5, 1.75, 2.5, 3.25].forEach((x, i) => E({ t: at(b, x), d: 1.0, k: 'glass', m: ns[(i * 3 + b) % ns.length] + 12, v: v * (0.6 + 0.2 * (i % 2)) })); };
  // 1-3 the walk, the stop, into the leg: a muted pulse on his steps that stops when he does
  pad(1, 0.32, 800); sub(1, 0.32); pulse(1, 0.16, 1);
  pad(2, 0.34, 850); sub(2, 0.34); pulse(2, 0.13, 1, 0, 2);
  pad(3, 0.36, 950, { cutTo: 1500 }); sub(3, 0.34); shimmer(3, 0.2); E({ t: at(3, 2), d: 2 * BEAT, k: 'riser', v: 0.2 });
  // 4-5 the artery: calm glassy eighths; glucose adds a soft molecular pulse
  pad(4, 0.34, 1250); sub(4, 0.38); arp(4, 0.15, 5, 8);
  pad(5, 0.34, 1250); sub(5, 0.38); arp(5, 0.16, 5, 8); pulse(5, 0.1, 0.5);
  // 6 dysfunction: the figure turns irregular; 7 plaque: a darker colour, pulses that accumulate; 8 progression: the bass deepens
  pad(6, 0.32, 1000); sub(6, 0.36); arp(6, 0.13, 5, 16, i => [1, 4, 6, 9, 10, 13].includes(i)); pulse(6, 0.09, 0.25, 0, 4, x => [0, 0.75, 1.5, 2.25, 2.5, 3.25].includes(x) ? 1 : 0);
  pad(7, 0.34, 900); sub(7, 0.38); pulse(7, 0.12, 0.5, 0, 4, x => 0.5 + 0.5 * x / 4);
  pad(8, 0.36, 900, { cutTo: 650 }); sub(8, 0.42); pulse(8, 0.11, 1);
  // 9 stenosis: thin; 10 occlusion: everything drops to a low pedal; 11 collaterals: the relative major opens
  pad(9, 0.28, 900); sub(9, 0.34); shimmer(9, 0.16);
  pad(10, 0.3, 600); sub(10, 0.46);
  pad(11, 0.36, 1100, { cutTo: 1700 }); sub(11, 0.38); arp(11, 0.14, 5, 8, i => i < 3);
  // 12 walking again: a steady activity rhythm that builds; 13 rest: it falls away
  pad(12, 0.32, 1150); sub(12, 0.4); kick(12, [0, 2], 0.3); pulse(12, 0.15, 0.5, 0, 4, x => 0.6 + 0.4 * x / 4); shaker(12, 0.1);
  pad(13, 0.34, 1050); sub(13, 0.36); pulse(13, 0.09, 1, 0, 2);
  // 14 the scanner: a precise sixteenth pulse; 15 the contrast's route: arpeggios; 16 the filling: brighter, a riser into the image
  pad(14, 0.3, 1000); sub(14, 0.36); pulse(14, 0.1, 0.25); tick(14, [1, 3], 0.16);
  pad(15, 0.32, 1250); sub(15, 0.36); pulse(15, 0.11, 0.5); arp(15, 0.11, 5, 16);
  pad(16, 0.36, 1500); sub(16, 0.36); arp(16, 0.14, 5, 16); E({ t: at(16, 2), d: 2 * BEAT, k: 'riser', v: 0.18 });
  // 17 the CTA image: the pads open; 18 the stenosis: focused; 19 the occlusion: the pulse stops at the cut-off
  pad(17, 0.38, 1750); sub(17, 0.38); arp(17, 0.12, 5, 8); shimmer(17, 0.16);
  pad(18, 0.32, 1250); sub(18, 0.36); pulse(18, 0.1, 0.25);
  pad(19, 0.32, 1050); sub(19, 0.38); pulse(19, 0.1, 0.25, 0, 1);
  // 20 the comparison: wide; 21 the resolution: an open D that has died away by 63 s
  pad(20, 0.38, 1900); sub(20, 0.38); arp(20, 0.12, 5, 8); shimmer(20, 0.14);
  pad(21, 0.4, 1600, { d: 2.5 }); sub(21, 0.38, 2.4);
  return ev;
}
// ---------------------------------------------------------------- SFX: one sound per picture event
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440, d: 0.2 }, x || {}));
  // 01-02 footsteps (lighter as he slows), the slowing, the stop, the pain
  EV.steps.forEach((ts, i) => S(ts, 'step', 0.55 * gaitAmp(ts + 0.01) + 0.2, { p: i % 2 ? -0.15 : 0.15 }));
  S(EV.slow, 'tension', 0.5, { d: 1.6 }); S(EV.hold, 'stop', 0.6, { d: 0.9 }); S(EV.pain, 'pain', 0.55, { d: 1.2 });
  // 03 into the leg: skin dissolves, muscle, arteries, the dive
  S(EV.reveal, 'sweep', 0.45, { d: 0.9 }); S(EV.muscle, 'layer', 0.4, { d: 0.6 }); S(EV.artery, 'glassReveal', 0.45, { d: 1.0 }); S(EV.dive, 'dive', 0.55, { d: 0.75 });
  // 04 the normal artery: arrival, the flow texture with a gentle surge each beat
  S(EV.cut4, 'arrive', 0.45, { d: 0.6 }); S(EV.cut4, 'flowtex', 0.32, { d: 3.0 });
  // 05 glucose: molecular ticks, more every beat
  EV.glu.forEach((tg, i) => S(tg, 'molecule', 0.36 + 0.06 * i, { n: 3 + 2 * i, p: (i % 2 ? 0.3 : -0.3) }));
  // 06 dysfunction: the push, the sick lining, white cells sticking, irregular ticks
  S(EV.push6, 'whoosh', 0.35, { d: 0.8 }); S(EV.sick, 'dysf', 0.4, { d: 1.2 }); EV.wbc.forEach((tw, i) => S(tw, 'stick', 0.45, { p: -0.2 + 0.2 * i }));
  EV.ticks6.forEach((tt, i) => S(tt, 'tickIrr', 0.3, { f: 1500 + 260 * ((i * 3) % 4), p: (i % 2 ? 0.25 : -0.25) }));
  // 07 plaque: the pull back, lipid entering (accumulating pulses), the foam cell, the bulge
  S(EV.pull7, 'whoosh', 0.3, { d: 0.8, low: 1 }); EV.ldl.forEach((tl, i) => S(tl, 'accum', 0.4 + 0.08 * i, { f: scl(2 + i, 3) }));
  S(EV.foam, 'engulf', 0.45, { d: 0.5 }); S(EV.bulge, 'bulge', 0.4, { d: 0.9 });
  // 08 progression: a deepening tone, calcium
  S(EV.grow8, 'deepen', 0.45, { d: 2.8 }); EV.calc.forEach((tc, i) => S(tc, 'calc', 0.45, { f: 2600 + 300 * i, p: -0.2 }));
  // 09 stenosis: the comparison slides in, the jet
  S(EV.comp9, 'slide', 0.35, { d: 0.5 }); S(EV.jet, 'jet', 0.32, { d: 2.0 });
  // 10 occlusion: the pan down, the low accent
  S(EV.pan10, 'pan', 0.32, { d: 1.0 }); S(EV.block10, 'block', 0.7, { d: 1.6 });
  // 11 collaterals: the pull back, the rising figure, flow through the side channels
  S(EV.pull11, 'whoosh', 0.28, { d: 0.9 }); S(EV.colGrow, 'motifUp', 0.42, { d: 1.2 }); S(EV.colFlow, 'colFlow', 0.3, { d: 1.1 });
  // 12 walking again: the cut, steps with a demand that rises step by step
  S(EV.cut12, 'cutAcc', 0.35, { d: 0.4 }); EV.steps12.forEach((ts, i) => { S(ts, 'step', 0.5, { p: i % 2 ? -0.15 : 0.15 }); S(ts, 'effort', 0.28 + 0.08 * i, { f: scl(i * 2, 3), d: 0.6 }); });
  // 13 rest: the release
  S(EV.relax, 'relax', 0.45, { d: 1.8 });
  // 14 CT: the scanner hum, the table, the injector
  S(EV.ct14, 'hum', 0.32, { d: 2.9 }); S(EV.ct14, 'servo', 0.3, { d: 2.1 }); S(EV.tableStop, 'click', 0.4); S(EV.inject, 'fluid', 0.4, { d: 0.6 });
  // 15 the route: one directional sweep; 16 the filling: an ascending phrase over a long downward sweep
  S(EV.circ15, 'route', 0.38, { d: 2.85 }); S(EV.fill16, 'revealPhrase', 0.4, { d: 2.8 });
  // 17 the CTA image; 18 the push and the annotation; 19 the pan, the cut-off, the collateral figure
  S(EV.cta17, 'imageReveal', 0.45, { d: 1.6 }); S(EV.zoom18, 'push', 0.4, { d: 0.5 }); S(EV.inset18, 'annot', 0.45);
  S(EV.pan19, 'pan', 0.28, { d: 1.0 }); S(EV.cutoff19, 'cutoff', 0.5, { d: 0.6 }); S(EV.col19, 'motifUp', 0.3, { d: 1.2, soft: 1 });
  // 20 the comparison; 21 the three highlights and the resolution
  S(EV.comp20, 'compare', 0.45, { d: 1.6 }); S(EV.cap21, 'resolve', 0.42, { d: 2.55 });
  [fq('A', 4), fq('F', 4), fq('D', 5)].forEach((f, i) => S(EV.hl21[i], 'hl', 0.4, { f, p: 0.35 }));
  return ev;
}
// the music dips a little under the cues that matter (full mix only)
const DUCK = { stop: 0.2, pain: 0.15, block: 0.35, dive: 0.12, cutoff: 0.2, compare: 0.12, resolve: 0.1, imageReveal: 0.1 };
// ---------------------------------------------------------------- synthesis helpers (nothing wraps: the film has an end)
let SND_L = null, SND_R = null, ECH_L = null, ECH_R = null, SCG = null;    // reverb send, delay send, sidechain gain (one value per 64 samples)
const nz = i => hash(i) * 2 - 1;
function voice(L, R, t0, dur, pan, gain, fn, o) {
  o = o || {};
  const i0 = Math.round(t0 * SR), n = Math.max(1, Math.round(dur * SR)), snd = o.send || 0, ech = o.echo || 0, dk = !!o.duck;
  const pl = Math.cos((pan + 1) * Math.PI / 4) * gain, pr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let k = 0; k < n; k++) {
    const i = i0 + k; if (i >= NS) break;
    let s = fn(k / SR, k); if (s === 0 || i < 0) continue;
    if (dk) s *= SCG[i >> 6];
    const l = s * pl, r = s * pr;
    L[i] += l; R[i] += r;
    if (snd) { SND_L[i] += l * snd; SND_R[i] += r * snd; }
    if (ech) { ECH_L[i] += l * ech; ECH_R[i] += r * ech; }
  }
}
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
// state-variable filters (Chamberlin); cutoff in Hz, q = damping (lower = more resonant)
function lpf() { let lo = 0, bp = 0; return (x, fc, q) => { const f = Math.min(0.8, TAU * fc / SR); lo += f * bp; const hi = x - lo - q * bp; bp += f * hi; return lo; }; }
function bpf() { let lo = 0, bp = 0; return (x, fc, q) => { const f = Math.min(0.8, TAU * fc / SR); lo += f * bp; const hi = x - lo - q * bp; bp += f * hi; return bp; }; }
const rel = (t, d, r) => t > d ? Math.max(0, 1 - (t - d) / r) : 1;
// ---- tonal instruments
function squareFn(f, d) { let p = 0; const F = lpf(), dt = f / SR; return t => { p += dt; if (p >= 1) p -= 1; const v = (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt); return F(v, 1900, 0.7) * (t < 0.004 ? t / 0.004 : 1) * (0.5 + 0.5 * Math.exp(-t * 7)) * rel(t, d, 0.05); }; }
function glassFn(f) { let pc = 0, pm = 0; return t => { pc += f / SR; pm += f * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + 1.1 * Math.exp(-t * 5) * fsin(TAU * pm)) * Math.exp(-t * 2.4) * (t < 0.004 ? t / 0.004 : 1); }; }
function chordFn(ms, d, cut, att, cutTo) {   // detuned saws through a low-pass: the pads (cutTo: the filter moves over d)
  const n = ms.length * 2, ph = new Float64Array(n), dts = []; ms.forEach(m => { const f = mtof(m); dts.push(f * 1.005 / SR, f * 0.995 / SR); }); const F = lpf();
  return t => { let x = 0; for (let j = 0; j < n; j++) { let q = ph[j] + dts[j]; if (q >= 1) q -= 1; ph[j] = q; x += 2 * q - 1; } const fc = cutTo ? cut * Math.pow(cutTo / cut, clamp(t / d, 0, 1)) : cut; return F(x / n, fc, 0.7) * Math.min(1, t / att) * rel(t, d, 0.5); };
}
function bassFn(f, d) { let s = 0; const dt = f / SR; return t => { s += dt; s -= Math.floor(s); return (0.9 * fsin(TAU * s) + 0.3 * fsin(2 * TAU * s)) * (t < 0.01 ? t / 0.01 : 1) * rel(t, d, 0.08); }; }
// ---- drums and effects (soft)
function kickFn(seed) { let p = 0; return (t, k) => { p += (52 + 90 * Math.exp(-t * 40)) / SR; return fsin(TAU * p) * Math.exp(-t * 12) * (t < 0.002 ? t / 0.002 : 1) + (t < 0.003 ? nz(k * 7 + seed) * 0.15 * (1 - t / 0.003) : 0); }; }
function snapFn(seed) { const F = bpf(); return (t, k) => F(nz(k * 3 + seed), 3200, 0.6) * Math.exp(-t * 70) * 1.2; }
function shakerFn(seed) { const F = bpf(); return (t, k) => F(nz(k * 13 + seed), 6800, 1.0) * (t < 0.006 ? t / 0.006 : Math.exp(-(t - 0.006) * 34)) * 1.3; }
function riserFn(d, seed) { const F = bpf(); return (t, k) => { const u = clamp(t / d, 0, 1); return F(nz(k * 19 + seed), 250 * Math.pow(16, u), 0.7) * u * u * (t > d ? Math.exp(-(t - d) * 16) : 1); }; }
function playMusic(e, L, R) {
  const k = e.k, sd = Math.round(e.t * 1000), v = e.v;
  switch (k) {
    case 'pulse': voice(L, R, e.t, e.d + 0.05, 0, 0.07 * v, squareFn(mtof(e.m), e.d), { send: 0.25, echo: 0.18, duck: 1 }); break;
    case 'glassArp': voice(L, R, e.t, 0.9, e.p || 0, 0.085 * v, glassFn(mtof(e.m)), { send: 0.45, echo: 0.22 }); break;
    case 'glass': voice(L, R, e.t, 1.8, 0.15, 0.14 * v, glassFn(mtof(e.m)), { send: 0.55, echo: 0.28 }); break;
    case 'pad': voice(L, R, e.t, e.d + 0.6, 0, 0.2 * v, chordFn(e.ms, e.d, e.cut || 1000, 0.6, e.cutTo), { send: 0.5, duck: 1 }); break;
    case 'sub': voice(L, R, e.t, e.d + 0.1, 0, 0.055 * v, bassFn(mtof(e.m), e.d)); break;
    case 'kick': voice(L, R, e.t, 0.45, 0, 0.18 * v, kickFn(sd)); break;
    case 'snap': voice(L, R, e.t, 0.12, 0.1, 0.1 * v, snapFn(sd), { send: 0.35 }); break;
    case 'shaker': voice(L, R, e.t, 0.12, e.p || 0, 0.11 * v, shakerFn(sd)); break;
    case 'riser': voice(L, R, e.t, e.d + 0.3, 0, 0.09 * v, riserFn(e.d, sd), { send: 0.4 }); break;
  }
}
// ---------------------------------------------------------------- SFX: understated sonification in D minor
function playSfx(e, L, R) {
  const k = e.k, v = e.v, f = e.f || 440, p = e.p || 0, d = e.d || 0.2, sd = Math.round(e.t * 1000);
  const V = (t0, dur, g, fn, snd, pan) => voice(L, R, t0, dur, pan === undefined ? p : pan, g * v, fn, { send: snd === undefined ? 0.3 : snd });
  const sine = (fAt, envFn) => { let ph = 0; return t => { ph += fAt(t) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * envFn(t); }; };
  const bell = (f0, r, idx) => { let pc = 0, pm = 0; return t => { pc += f0 / SR; pm += f0 * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + idx * Math.exp(-t * 8) * fsin(TAU * pm)) * Math.exp(-t * r) * (t < 0.003 ? t / 0.003 : 1); }; };
  const noiseLP = (cutAt, envFn, seed) => { let lp = 0, lp2 = 0; return (t, kk) => { const a = 1 - Math.exp(-TAU * cutAt(t) / SR); lp += a * (nz(kk * 7 + seed) - lp); lp2 += a * (lp - lp2); return lp2 * envFn(t); }; };
  const noiseBP = (fcAt, q, envFn, seed) => { const F = bpf(); return (t, kk) => F(nz(kk * 13 + seed), fcAt(t), q) * envFn(t); };
  const swell = dd => t => Math.sin(Math.PI * clamp(t / dd, 0, 1));
  const att = (a, r) => t => (t < a ? t / a : 1) * Math.exp(-Math.max(0, t - a) * r);
  const edge = (dd, a, r) => t => Math.min(1, t / a) * Math.min(1, Math.max(0, dd - t) / r);
  switch (k) {
    // a soft step: a low thump and the scuff of a sole
    case 'step': V(e.t, 0.2, 0.24, sine(t => 62 + 40 * Math.exp(-t * 30), att(0.002, 20)), 0.08); V(e.t, 0.09, 0.07, noiseLP(() => 1100, att(0.001, 40), sd), 0.1); break;
    // tension: a slow swell on a low minor second (no alarm, no pulse)
    case 'tension': V(e.t, d, 0.07, sine(() => fq('D', 3), swell(d)), 0.45, -0.2); V(e.t, d, 0.05, sine(() => fq('Eb', 3), swell(d)), 0.45, 0.2); V(e.t, d, 0.04, noiseLP(t => 300 + 400 * t / d, swell(d), sd), 0.5); break;
    case 'stop': { const env = t => Math.min(1, t / 0.03) * Math.exp(-t * 3.2); V(e.t, d, 0.26, sine(t => 48 + 12 * Math.exp(-t * 6), env), 0.25); V(e.t, d, 0.05, noiseLP(() => 500, env, sd), 0.4); break; }
    // pain: a short glassy sting on a minor second that sighs down (not a beep)
    case 'pain': V(e.t, d, 0.07, bell(fq('Bb', 5), 3.5, 0.9), 0.55, 0.15); V(e.t + 0.02, d, 0.06, bell(fq('A', 5), 3, 0.9), 0.55, -0.15); V(e.t, d, 0.06, sine(t => fq('A', 4) * Math.pow(2, -t / d * 0.25), edge(d, 0.05, 0.6)), 0.5); break;
    case 'sweep': V(e.t, d, 0.1, noiseLP(t => 400 + 3200 * Math.pow(t / d, 1.5), swell(d), sd), 0.45); break;
    case 'layer': V(e.t, d, 0.07, noiseBP(t => 700 + 500 * t / d, 0.5, swell(d), sd), 0.45); V(e.t, 0.5, 0.06, bell(fq('F', 4), 5, 0.4), 0.5); break;
    case 'glassReveal': [['D', 5], ['A', 5], ['F', 5], ['C', 6]].forEach(([n, o], i) => V(e.t + i * 0.07, d, 0.065, bell(fq(n, o), 2.2, 0.6), 0.6, -0.3 + 0.2 * i)); break;
    case 'whoosh': V(e.t, d, e.low ? 0.15 : 0.12, noiseLP(t => e.low ? 300 + 700 * Math.sin(Math.PI * t / d) : 700 + 2400 * Math.sin(Math.PI * t / d), swell(d), sd), 0.45); break;
    case 'dive': V(e.t, d, 0.16, noiseLP(t => 500 + 2600 * Math.pow(t / d, 2), t => Math.pow(clamp(t / d, 0, 1), 1.5) * (t < d ? 1 : 0), sd), 0.4); V(e.t, d, 0.06, sine(t => 180 * Math.pow(2, 1.5 * t / d), edge(d, 0.3, 0.1)), 0.4); break;
    case 'arrive': { const env = t => Math.min(1, t / 0.01) * Math.exp(-t * 6); V(e.t, d, 0.12, sine(t => 70 + 30 * Math.exp(-t * 20), env), 0.4); V(e.t, d, 0.06, noiseLP(() => 1600, env, sd), 0.5); break; }
    // laminar flow with a gentle surge on each beat (a texture, not a heartbeat)
    case 'flowtex': V(e.t, d, 0.075, noiseLP(t => 500 + 350 * Math.pow(Math.max(0, Math.sin(Math.PI * ((t / BEAT) % 1))), 2), edge(d, 0.4, 0.6), sd), 0.4); break;
    case 'molecule': for (let i = 0; i < (e.n || 3); i++) { const tt = e.t + i * 0.055 + 0.02 * Math.sin(i * 7.1); V(tt, 0.25, 0.05, bell(scl(9 + ((i * 3) % 7), 5), 14, 0.5), 0.35, -0.5 + (i % 5) * 0.25); } break;
    case 'dysf': { let ph = 0; V(e.t, d, 0.06, t => { ph += fq('G', 5) * Math.pow(2, 0.05 * fsin(TAU * 5.3 * t)) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * edge(d, 0.08, 0.7)(t); }, 0.5); V(e.t, d, 0.05, bell(fq('F#', 5), 3, 0.7), 0.5, 0.2); break; }
    case 'stick': V(e.t, 0.18, 0.12, sine(t => 420 * Math.pow(0.5, t / 0.08), att(0.002, 22)), 0.3); V(e.t, 0.05, 0.05, noiseLP(() => 900, att(0.001, 60), sd), 0.2); break;
    case 'tickIrr': V(e.t, 0.04, 0.12, sine(() => f, att(0.0005, 110)), 0.2); break;
    case 'accum': V(e.t, 0.35, 0.13, sine(() => f, att(0.004, 9)), 0.35); V(e.t, 0.35, 0.04, sine(() => f * 2, att(0.004, 12)), 0.35); break;
    case 'engulf': V(e.t, d, 0.09, noiseLP(t => 800 - 500 * t / d, swell(d), sd), 0.4); V(e.t, d, 0.08, sine(t => 300 * Math.pow(0.6, t / d), swell(d)), 0.4); break;
    case 'bulge': V(e.t, d, 0.12, sine(() => fq('D', 2), swell(d)), 0.3); V(e.t, d, 0.04, noiseLP(() => 400, swell(d), sd), 0.4); break;
    case 'deepen': V(e.t, d, 0.1, sine(t => fq('A', 2) * Math.pow(2, -5 / 12 * clamp(t / d, 0, 1)), edge(d, 0.6, 0.8)), 0.45); V(e.t, d, 0.04, sine(t => fq('A', 3) * Math.pow(2, -5 / 12 * clamp(t / d, 0, 1)), edge(d, 0.6, 0.8)), 0.5); break;
    case 'calc': V(e.t, 0.2, 0.09, bell(f, 16, 0.4), 0.3); V(e.t, 0.015, 0.1, (t, kk) => nz(kk * 5 + sd) * (1 - t / 0.015), 0.1); break;
    case 'slide': V(e.t, d, 0.1, noiseLP(t => 900 + 1500 * Math.sin(Math.PI * t / d), swell(d), sd), 0.35, -0.5 + t0pan(e)); break;
    case 'jet': V(e.t, d, 0.05, noiseBP(() => 3600, 0.22, edge(d, 0.15, 0.6), sd), 0.3, 0.25); V(e.t, d, 0.03, noiseBP(() => 5200, 0.3, edge(d, 0.15, 0.6), sd + 1), 0.3, 0.3); break;
    case 'pan': V(e.t, d, 0.09, noiseLP(t => 2400 - 1800 * t / d, swell(d), sd), 0.4); break;
    // the block: a deep accent and a muffled low tone (the flow stops here)
    case 'block': { const env = t => Math.min(1, t / 0.015) * Math.exp(-t * 2.4); V(e.t, d, 0.3, sine(t => 41 + 14 * Math.exp(-t * 9), env), 0.25); V(e.t, d, 0.06, sine(() => fq('D', 2), edge(d, 0.05, 1.2)), 0.4); V(e.t, 0.3, 0.06, noiseLP(() => 350, att(0.003, 9), sd), 0.4); break; }
    // the collaterals: four rising glass notes (F A C D); softer the second time
    case 'motifUp': [['F', 5], ['A', 5], ['C', 6], ['D', 6]].forEach(([n, o], i) => V(e.t + i * BEAT / 4, 1.1, e.soft ? 0.05 : 0.07, bell(fq(n, o), 2.6, 0.5), 0.6, -0.3 + 0.2 * i)); break;
    case 'colFlow': V(e.t, d, 0.05, noiseBP(t => 1200 + 400 * Math.sin(TAU * t / BEAT), 0.5, edge(d, 0.2, 0.4), sd), 0.4, -0.2); break;
    case 'cutAcc': { const env = t => Math.min(1, t / 0.004) * Math.exp(-t * 14); V(e.t, d, 0.14, sine(t => 70 + 50 * Math.exp(-t * 30), env), 0.2); V(e.t, d, 0.05, noiseLP(() => 2400, env, sd), 0.3); break; }
    case 'effort': V(e.t, d, 0.06, sine(() => f, edge(d, 0.02, 0.4)), 0.35); V(e.t, d, 0.03, sine(() => f * 1.5, edge(d, 0.02, 0.4)), 0.35); break;
    case 'relax': V(e.t, d, 0.08, noiseLP(t => 1400 - 1000 * t / d, swell(d), sd), 0.5); [['F', 4], ['A', 4], ['D', 5]].forEach(([n, o], i) => V(e.t + 0.1 + i * 0.12, d - 0.3, 0.045, sine(() => fq(n, o), edge(d - 0.3, 0.3, 0.9)), 0.6, -0.2 + 0.2 * i)); break;
    case 'hum': V(e.t, d, 0.05, t => (fsin(TAU * 60 * t) + 0.5 * fsin(TAU * 120 * t) + 0.2 * fsin(TAU * 180 * t)) * edge(d, 0.4, 0.5)(t), 0.3); V(e.t, d, 0.03, noiseLP(() => 2000, edge(d, 0.4, 0.5), sd), 0.4); break;
    case 'servo': { let ph = 0; V(e.t, d, 0.05, t => { ph += (110 + 50 * Math.sin(Math.PI * t / d)) / SR; ph -= Math.floor(ph); return (2 * ph - 1) * edge(d, 0.1, 0.2)(t); }, 0.2); break; }
    case 'click': V(e.t, 0.02, 0.18, (t, kk) => nz(kk * 3 + sd) * (1 - t / 0.02), 0.15); V(e.t, 0.08, 0.08, sine(() => 900, att(0.001, 50)), 0.2); break;
    case 'fluid': V(e.t, d, 0.1, noiseLP(t => 260 + 500 * Math.sin(Math.PI * t / d), swell(d), sd), 0.4); V(e.t + 0.05, 0.25, 0.08, sine(t => 300 * (1 + 0.8 * Math.min(1, t / 0.2)), att(0.01, 9)), 0.4); break;
    // one directional sweep along the contrast's route (arm → heart → lungs → heart → aorta): right to centre, up then down
    case 'route': V(e.t, d, 0.09, noiseBP(t => 500 + 1500 * Math.sin(Math.PI * t / d), 0.6, edge(d, 0.3, 0.6), sd), 0.45, 0.4); V(e.t, d, 0.04, sine(t => fq('D', 4) * Math.pow(2, Math.sin(Math.PI * t / d) * 7 / 12), edge(d, 0.4, 0.6)), 0.5, 0.1); break;
    case 'revealPhrase': [['D', 4], ['F', 4], ['A', 4], ['C', 5], ['D', 5]].forEach(([n, o], i) => V(e.t + i * BEAT / 2, 1.0, 0.055, bell(fq(n, o), 2.6, 0.5), 0.6, -0.4 + 0.2 * i)); V(e.t, d, 0.06, noiseLP(t => 2600 - 2000 * t / d, edge(d, 0.3, 0.6), sd), 0.5); break;
    case 'imageReveal': [['F', 4], ['A', 4], ['C', 5], ['E', 5]].forEach(([n, o], i) => V(e.t + i * 0.05, d, 0.06, bell(fq(n, o), 1.6, 0.6), 0.6, -0.3 + 0.2 * i)); V(e.t, d, 0.05, noiseLP(t => 600 + 2400 * t / d, swell(d), sd), 0.5); break;
    case 'push': V(e.t, d, 0.14, noiseLP(t => 600 + 3200 * Math.pow(t / d, 2), t => Math.pow(clamp(t / d, 0, 1), 1.3) * (t < d ? 1 : 0), sd), 0.3); break;
    case 'annot': V(e.t, 0.015, 0.14, (t, kk) => nz(kk * 3 + sd) * (1 - t / 0.015), 0.1); V(e.t + 0.01, 0.6, 0.06, bell(fq('A', 5), 6, 0.4), 0.45, 0.25); break;
    case 'cutoff': V(e.t, d, 0.1, sine(t => fq('A', 3) * Math.pow(0.5, t / d), t => (t < 0.01 ? t / 0.01 : 1) * (t < d * 0.7 ? 1 : Math.max(0, 1 - (t - d * 0.7) / (d * 0.3)))), 0.3); V(e.t, 0.2, 0.05, noiseLP(() => 600, att(0.002, 14), sd), 0.3); break;
    case 'compare': V(e.t, d, 0.06, bell(fq('D', 4), 1.4, 0.5), 0.6, -0.45); V(e.t + 0.375, d - 0.375, 0.06, bell(fq('A', 4), 1.4, 0.5), 0.6, 0.45); V(e.t, d, 0.04, noiseLP(() => 900, swell(d), sd), 0.5); break;
    case 'hl': V(e.t, 0.7, 0.07, bell(f, 3.5, 0.45), 0.5); break;
    // the resolution: an open D (sus2) that has died away before the last frame
    case 'resolve': [['D', 3], ['A', 3], ['E', 4], ['A', 4], ['D', 5]].forEach(([n, o], i) => V(e.t + i * 0.06, d - i * 0.06, 0.05, bell(fq(n, o), 1.1, 0.35), 0.6, -0.4 + 0.2 * i)); V(e.t, d, 0.07, sine(() => fq('D', 2), edge(d, 0.4, 1.4)), 0.3, 0); break;
  }
}
const t0pan = e => 0;                       // (kept simple: the comparison slide is centred)
// ---------------------------------------------------------------- effects
// plate-like Schroeder reverb (4 damped combs + 2 allpasses per side), one pass (the film has a start and an end)
function reverb(inL, inR, outL, outR, wet) {
  const C = [1116, 1188, 1277, 1356].map(n => Math.round(n * SR / 44100)), A = [556, 441].map(n => Math.round(n * SR / 44100));
  [[inL, outL, 0], [inR, outR, 23]].forEach(([inp, out, sp]) => {
    const c0 = new Float32Array(C[0] + sp), c1 = new Float32Array(C[1] + sp), c2 = new Float32Array(C[2] + sp), c3 = new Float32Array(C[3] + sp);
    const a0 = new Float32Array(A[0] + sp), a1 = new Float32Array(A[1] + sp);
    let i0 = 0, i1 = 0, i2 = 0, i3 = 0, j0 = 0, j1 = 0, f0 = 0, f1 = 0, f2 = 0, f3 = 0;
    const fb = 0.85, dm = 0.35, dm1 = 1 - dm;
    for (let i = 0; i < NS; i++) {
      const x = inp[i] * 0.2; let o, y = 0;
      o = c0[i0]; f0 = o * dm1 + f0 * dm; c0[i0] = x + f0 * fb; if (++i0 >= c0.length) i0 = 0; y += o;
      o = c1[i1]; f1 = o * dm1 + f1 * dm; c1[i1] = x + f1 * fb; if (++i1 >= c1.length) i1 = 0; y += o;
      o = c2[i2]; f2 = o * dm1 + f2 * dm; c2[i2] = x + f2 * fb; if (++i2 >= c2.length) i2 = 0; y += o;
      o = c3[i3]; f3 = o * dm1 + f3 * dm; c3[i3] = x + f3 * fb; if (++i3 >= c3.length) i3 = 0; y += o;
      o = a0[j0]; a0[j0] = y + o * 0.5; y = o - y; if (++j0 >= a0.length) j0 = 0;
      o = a1[j1]; a1[j1] = y + o * 0.5; y = o - y; if (++j1 >= a1.length) j1 = 0;
      out[i] += y * wet;
    }
  });
}
// ---------------------------------------------------------------- render: opts.bus 'm' (music only) / 's' (SFX only) / both
function renderAudio(opts) {
  opts = opts || {};
  const L = new Float32Array(NS), R = new Float32Array(NS);
  SND_L = new Float32Array(NS); SND_R = new Float32Array(NS); ECH_L = new Float32Array(NS); ECH_R = new Float32Array(NS);
  const sfx = sfxEvents();
  SCG = new Float32Array((NS >> 6) + 2).fill(1);
  if (opts.bus !== 's') {
    const mus = musicEvents();
    for (const e of mus) if (e.k === 'kick') {                       // the bed ducks a little under each kick
      const depth = 0.22 * e.v, j0 = Math.round(e.t * SR) >> 6, n = Math.round(0.26 * SR) >> 6;
      for (let q = 0; q < n && j0 + q < SCG.length; q++) { const u = q * 64 / SR, a = u < 0.004 ? u / 0.004 : Math.exp(-(u - 0.004) * 13); SCG[j0 + q] *= 1 - depth * a; }
    }
    for (const e of mus) playMusic(e, L, R);
    if (opts.bus === undefined) for (const e of sfx) {                 // full mix: the music dips under the cues that matter
      const dk = DUCK[e.k]; if (!dk) continue;
      const i0 = Math.round(e.t * SR), n = Math.round(0.5 * SR), at = Math.round(0.008 * SR);
      for (let k = 0; k < n && i0 + k < NS; k++) { const i = i0 + k, a = k < at ? k / at : Math.exp(-(k - at) / SR * 6), g = 1 - dk * a; L[i] *= g; R[i] *= g; SND_L[i] *= g; SND_R[i] *= g; }
    }
  }
  if (opts.bus !== 'm') for (const e of sfx) playSfx(e, L, R);
  // dotted-eighth ping-pong delay on the glass and the pulse
  { const D = Math.round(0.75 * BEAT * SR), fb = 0.34;
    for (let i = 0; i < NS; i++) { let el = 0, er = 0, w = 1; for (let k = 1; k <= 4; k++) { w *= fb; const j = i - k * D; if (j < 0) break; if (k % 2) { el += w * ECH_R[j]; er += w * ECH_L[j]; } else { el += w * ECH_L[j]; er += w * ECH_R[j]; } } L[i] += el; R[i] += er; SND_L[i] += el * 0.3; SND_R[i] += er * 0.3; } }
  ECH_L = null; ECH_R = null; SCG = null;
  reverb(SND_L, SND_R, L, R, 0.75);
  SND_L = null; SND_R = null;
  // master: DC blocking, a gentle top roll-off (~14 kHz), soft saturation; a short fade-in and a fade to silence over the last 0.5 s
  const a = Math.exp(-TAU * 14000 / SR), fi = Math.round(0.01 * SR), fo = Math.round(0.5 * SR);
  for (const ch of [L, R]) {
    let y = 0, x1 = 0, hp = 0;
    for (let i = 0; i < NS; i++) {
      const x = ch[i];
      y = a * y + (1 - a) * x;
      hp = 0.9993 * (hp + y - x1); x1 = y;
      const g = Math.min(1, i / fi, (NS - 1 - i) / fo);
      ch[i] = Math.tanh(hp * 1.1) / 1.1 * g;
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
  const s = LIVE.ctx.createBufferSource(); s.buffer = LIVE.buf; s.loop = true; s.connect(LIVE.gain);   // the player repeats the film; the film itself ends on the diagnosis
  LIVE.startAt = LIVE.ctx.currentTime + 0.03; LIVE.offset = t; s.start(LIVE.startAt, t); LIVE.src = s;
}
function livePause() { if (LIVE.src) { try { LIVE.src.stop(); } catch (e) { } LIVE.src = null; } }
function liveNow() { return (LIVE.offset + Math.max(0, LIVE.ctx.currentTime - LIVE.startAt)) % DUR; }
function liveMute(m) { LIVE.muted = m; if (LIVE.gain) LIVE.gain.gain.value = m ? 0 : 0.9; }
