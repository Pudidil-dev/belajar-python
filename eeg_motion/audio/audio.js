'use strict';
// ============================================================================
// AUDIO — an original futuristic electronic scientific score plus precise,
// beat-synced SFX, synthesised sample by sample (Node, no dependencies).
// 104.73 BPM, 24 bars of 4/4 = 55.000 s, F# minor (F#m9 – Dmaj9 – Bm9 – C#7sus4;
// Amaj9 / E6/9 colours). Modern, rhythmic, clean, slightly mysterious and
// restrained (mixed low for a later voiceover): soft electronic pulses, a subtle
// synth bass, minimal digital percussion, gentle ambient pads, glassy plucks.
// A four-note motif (F#–C#–E–A) marks the hook, the signal reaching the
// electrodes, the machine and the alpha rhythm. During the eyes-closed scenes a
// 10 Hz shimmer (the alpha frequency itself) breathes with the posterior alpha
// envelope and stops when the eyes open. Bar 24 (C#7sus4) resolves into bar 1
// (F#m9): the loop lands on the tonic.
// SFX: every cue is read from the event table the picture uses
// (engine/film/timeline.js) and every event sits on the sixteenth-note grid, so
// each sound lands on the beat. Microscopic events make no sound in reality —
// this is artistic sonification.
//   node audio/audio.js <outdir>     writes audio_full.f32, audio_music.f32, audio_sfx.f32 and sfx_events.json
// ============================================================================
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { Math }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'engine', 'film', 'timeline.js'), 'utf8'), ctx);
const TL = ctx.TL, { DUR, BEAT, BAR, EV, q, per, alphaEnv } = TL;
const SR = 48000, NS = Math.round(DUR * SR), TAU = Math.PI * 2, S16 = BEAT / 4;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, k) => a + (b - a) * k;
function hash(n) { n = (n | 0) ^ 0x9e3779b9; n = Math.imul(n ^ (n >>> 16), 0x21f0aaad); n = Math.imul(n ^ (n >>> 15), 0x735a2d97); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
const SIN_N = 4096, SIN_T = new Float32Array(SIN_N + 1); for (let i = 0; i <= SIN_N; i++) SIN_T[i] = Math.sin(i / SIN_N * TAU);
const fsin = x => { const u = x / TAU; return SIN_T[Math.floor((u - Math.floor(u)) * SIN_N)]; };
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12), nm = (n, o) => 12 * (o + 1) + NOTE[n], fq = (n, o) => mtof(nm(n, o));
const FSM = [0, 2, 3, 5, 7, 8, 10];
const scl = (i, o) => mtof(nm('F#', o) + FSM[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7));
// ---------------------------------------------------------------- harmony (one chord per bar)
const CHORDS = ['F#m9', 'Dmaj9', 'F#m9', 'Dmaj9', 'Bm9', 'C#7sus4', 'F#m9', 'Dmaj9', 'Amaj9', 'E69', 'Bm9', 'C#7sus4',
  'F#m9', 'F#m9', 'Dmaj9', 'E69', 'C#7sus4', 'Bm9', 'F#m9', 'Dmaj9', 'Amaj9', 'C#7sus4', 'Dmaj9', 'C#7sus4'];
const CH = { 'F#m9': ['F#', [0, 3, 7, 10, 14]], Dmaj9: ['D', [0, 4, 7, 11, 14]], Bm9: ['B', [0, 3, 7, 10, 14]], 'C#7sus4': ['C#', [0, 5, 7, 10]], Amaj9: ['A', [0, 4, 7, 11, 14]], E69: ['E', [0, 4, 7, 9, 14]] };
const chordNotes = (ch, oct) => { const [r, iv] = CH[ch]; const b = nm(r, oct); return iv.map(i => b + i); };
const rootOf = (ch, oct) => nm(CH[ch][0], oct);
const MOTIF = [[0, nm('F#', 5)], [3, nm('C#', 6)], [6, nm('E', 5)], [10, nm('A', 5)]];
const at = (b, beat) => (b - 1) * BAR + beat * BEAT;
function musicEvents() {
  const ev = [], E = o => ev.push(o), ch = b => CHORDS[b - 1];
  const pad = (b, v, cut, x) => E(Object.assign({ t: at(b, 0), d: BAR + 0.25, k: 'pad', ms: chordNotes(ch(b), 3), v, cut: cut || 1100 }, x || {}));
  const bass = (b, v, pattern) => (pattern || [0, 2]).forEach(x => { const r = rootOf(ch(b), 1); E({ t: at(b, x), d: BEAT * 0.9, k: 'bass', m: r < 30 ? r + 12 : r, v }); });
  const seq = (b, v, oct, n) => { const ns = chordNotes(ch(b), oct); for (let i = 0; i < n; i++) E({ t: at(b, i * 4 / n), d: 4 / n * BEAT * 0.6, k: 'pluck', m: ns[(i * 3 + Math.floor(i / 4)) % ns.length] + (i % 8 === 7 ? 12 : 0), v: v * (i % 4 === 0 ? 1 : i % 2 ? 0.55 : 0.75), p: i % 2 ? 0.3 : -0.3 }); };
  const kick = (b, beats, v) => beats.forEach(x => E({ t: at(b, x), d: 0.5, k: 'kick', v }));
  const snap = (b, beats, v) => beats.forEach(x => E({ t: at(b, x), d: 0.12, k: 'snap', v }));
  const hats = (b, v, n) => { for (let i = 0; i < n; i++) E({ t: at(b, i * 4 / n), d: 0.06, k: 'hat', v: v * (i % 2 ? 1 : 0.6), p: 0.25 }); };
  const motif = (b, v, lift, upto) => MOTIF.slice(0, upto || 4).forEach(([st, m]) => E({ t: at(b, st / 4), d: 1.3, k: 'glass', m: m + 12 * (lift || 0), v }));
  const pulse = (b, v) => { for (let i = 0; i < 4; i++) E({ t: at(b, i), d: BEAT * 0.5, k: 'pulse', m: rootOf(ch(b), 3) + (i % 2 ? 7 : 0), v: v * (i === 0 ? 1 : 0.7) }); };
  // A — the hook (bars 1–2): the pulse and the motif from the very first sample
  for (let b = 1; b <= 2; b++) { pad(b, 0.4, 950); bass(b, 0.42, [0]); pulse(b, 0.26); hats(b, 0.14, 8); }
  motif(1, 0.5); E({ t: at(2, 2), d: 2 * BEAT, k: 'riser', v: 0.2 });
  // B — inside the brain (bars 3–7): layered electronic activity, a soft half-time groove
  for (let b = 3; b <= 7; b++) { pad(b, 0.38, 1100 + 80 * (b - 3)); bass(b, 0.42, [0, 2, 2.5]); kick(b, [0, 2], 0.36); hats(b, 0.12, 8); seq(b, 0.13, 5, 8); }
  // C — fields to the electrodes (bars 8–12): the sequencer opens to sixteenths, the motif returns
  for (let b = 8; b <= 12; b++) { pad(b, 0.36, 1250 + 120 * (b - 8)); bass(b, 0.44, [0, 1.5, 2, 3.5]); kick(b, [0, 2], 0.4); snap(b, [1, 3], 0.22); hats(b, 0.13, 16); seq(b, 0.15, 5, 16); }
  motif(9, 0.36, 0); E({ t: at(12, 0), d: BAR, k: 'riser', v: 0.18 });
  // D — the machine (bars 13–17): precise, clockwork sequencer; the motif an octave up
  for (let b = 13; b <= 17; b++) { pad(b, 0.34, 1500); bass(b, 0.44, [0, 0.75, 2, 2.75]); kick(b, [0, 2], 0.42); snap(b, [1, 3], 0.26); hats(b, 0.15, 16); seq(b, 0.17, 5, 16); }
  motif(13, 0.32, 1); E({ t: at(17, 2), d: 2 * BEAT, k: 'riser', v: 0.18 });
  // E — the payoff (bars 18–22): the groove thins, the 10 Hz alpha shimmer carries the eyes-closed rhythm
  for (let b = 18; b <= 22; b++) { pad(b, 0.4, 1300); bass(b, 0.4, [0, 2]); kick(b, [0], 0.34); hats(b, 0.1, 8); if (b !== 20) seq(b, 0.1, 5, 8); }
  motif(21, 0.4, 0);
  // F — the loop (bars 23–24): back to the hook texture, C#7sus4 leading into bar 1
  for (let b = 23; b <= 24; b++) { pad(b, 0.4, lerp(1150, 980, b - 23)); bass(b, 0.42, [0]); pulse(b, 0.22); hats(b, 0.12, 8); }
  E({ t: at(24, 2), d: 2 * BEAT, k: 'riser', v: 0.16 });
  // the alpha shimmer: present while alpha is (hook, payoff and loop), as one long voice per stretch
  E({ t: at(18, 0), d: DUR - at(18, 0) + at(3, 0), k: 'alphatex', v: 0.5 });
  return ev;
}
// ---------------------------------------------------------------- SFX: one cue per event
function sfxEvents() {
  const ev = [], S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440, d: 0.2 }, x || {}));
  // A — the hook: an immediate pulse and a fast waveform sweep; the reveal; the eyes close; the label; the push; the layers; the dive
  S(EV.pull, 'hook', 0.9, { d: 0.9 }); S(EV.reveal, 'tone', 0.55, { f: scl(7, 4), d: 0.9 }); S(EV.eyesShut, 'soft', 0.4, { d: 0.5 });
  S(EV.label1, 'ui', 0.45); S(EV.pushHead, 'zoom', 0.45, { d: 0.7 }); S(EV.cutaway, 'peel', 0.5, { d: 0.4 });
  EV.layers.forEach((tl, i) => S(tl, 'layer', 0.42, { f: scl(9 - i, 4), p: -0.3 + 0.2 * i })); S(EV.dive, 'dive', 0.6, { d: 0.9 });
  // B — inside the brain
  S(EV.network, 'swell', 0.45, { d: 1.1 }); S(EV.label2, 'ui', 0.45); EV.bursts.forEach((tb, i) => S(tb, 'burst', 0.45, { f: scl(7 + 2 * i, 4) }));
  S(EV.pyramidal, 'shimmer', 0.4, { d: 0.8 }); S(EV.align, 'align', 0.45, { d: 0.9 }); S(EV.spineDive, 'dive', 0.5, { d: 0.75 });
  S(EV.vesicle, 'tick', 0.4, { f: 1900 }); S(EV.release, 'release', 0.55); S(EV.bind, 'bind', 0.5); S(EV.channelsOpen, 'open', 0.55, { d: 0.5 }); S(EV.cap1, 'ui', 0.35);
  EV.ions.forEach((ti, i) => S(ti, 'ion', 0.42, { f: scl(11 + i, 4), p: -0.3 + 0.2 * i }));
  S(EV.pspSpread, 'glide', 0.5, { d: 0.8 }); S(EV.sinkSource, 'dipole', 0.5); S(EV.neighbours, 'echo', 0.42, { d: 0.6 }); S(EV.population, 'swell', 0.42, { d: 0.9 });
  EV.sync.forEach((ts, i) => S(ts, 'sync', 0.45, { f: scl(7 + i, 4), i })); S(EV.cap2, 'ui', 0.35);
  // C — to the electrodes
  S(EV.field, 'field', 0.55, { d: 0.9 }); EV.contours.forEach((tc, i) => S(tc, 'ripple', 0.4, { f: scl(4 - i, 4) })); S(EV.volume, 'whoosh', 0.4, { d: 0.9 }); S(EV.cap3, 'ui', 0.35);
  EV.layersCross.forEach((tl, i) => S(tl, 'thud', 0.45, { i })); S(EV.scalpReach, 'arrive', 0.5);
  S(EV.headOut, 'whoosh', 0.38, { d: 0.6, low: 1 }); EV.electrodes.forEach((te, i) => S(te, 'tick', 0.36, { f: 1500 + 110 * i, p: -0.4 + 0.08 * i })); S(EV.label3, 'ui', 0.4); S(EV.gel, 'gel', 0.4);
  S(EV.electrodeDive, 'dive', 0.5, { d: 0.7 }); S(EV.sense, 'measure', 0.5); S(EV.wave, 'blip', 0.4, { f: scl(9, 4) });
  S(EV.twoInputs, 'twin', 0.45); S(EV.cap4, 'ui', 0.35); S(EV.subtract, 'measure', 0.55, { f: scl(11, 4) }); S(EV.channelOut, 'blip', 0.4, { f: scl(7, 4) });
  // D — the machine
  S(EV.weak, 'weak', 0.45, { d: 0.6 }); S(EV.cap5, 'ui', 0.35); S(EV.hum, 'hum', 0.32, { d: 0.6 }); S(EV.drift, 'drift', 0.35, { d: 0.7 });
  S(EV.amp, 'enter', 0.42); S(EV.label4, 'ui', 0.4); S(EV.gain, 'amp', 0.55, { d: 0.8 });
  S(EV.cmrr, 'noise', 0.4, { d: 0.8 }); S(EV.cap6, 'ui', 0.35); S(EV.cancel, 'cancel', 0.5, { d: 0.8 });
  S(EV.filter, 'enter', 0.42); S(EV.trim, 'filt', 0.5, { d: 0.8 }); S(EV.pass, 'pass', 0.45);
  S(EV.adc, 'enter', 0.42); EV.samples.forEach((ts, i) => S(ts, 'sample', 0.42, { f: 2400 + (i % 2) * 300, p: -0.35 + 0.1 * i })); S(EV.cap7, 'ui', 0.32); S(EV.digital, 'digital', 0.5);
  // E — the payoff
  S(EV.display, 'whoosh', 0.36, { d: 0.6 }); S(EV.channels, 'record', 0.5, { d: 1.2 }); S(EV.toPatient, 'whoosh', 0.3, { d: 0.7, low: 1 });
  S(EV.alphaFocus, 'swell', 0.4, { d: 0.8 }); S(EV.label5, 'ui', 0.4); EV.alphaPulses.forEach((tp, i) => S(tp, 'alpha', 0.42, { f: scl(7 + (i % 2) * 2, 4) }));
  S(EV.eyesOpen, 'open', 0.55, { d: 0.5, eyes: 1 }); S(EV.alphaBlock, 'block', 0.45); S(EV.cap8, 'ui', 0.35);
  S(EV.setup, 'whoosh', 0.34, { d: 0.9, low: 1 }); S(EV.clinician, 'ambience', 0.35, { d: 2.2 }); S(EV.cap9, 'ui', 0.35);
  // F — the loop
  S(EV.returnMon, 'whoosh', 0.34, { d: 0.9 }); S(EV.eyesRelax, 'relax', 0.42, { d: 0.9 }); S(EV.approach, 'riser2', 0.38, { d: DUR - EV.approach }); S(EV.highlight, 'tone', 0.4, { f: scl(4, 4), d: 0.9 });
  return ev;
}
const DUCK = { hook: 0.2, dive: 0.15, amp: 0.15, open: 0.2, field: 0.15, release: 0.1, measure: 0.1 };
// ---------------------------------------------------------------- synthesis core
let SND_L = null, SND_R = null, ECH_L = null, ECH_R = null, SCG = null;
const nz = i => hash(i) * 2 - 1;
function voice(L, R, t0, dur, pan, gain, fn, o) {
  o = o || {};
  const i0 = Math.round(t0 * SR), n = Math.max(1, Math.round(dur * SR)), snd = o.send || 0, ech = o.echo || 0, dk = !!o.duck;
  const pl = Math.cos((pan + 1) * Math.PI / 4) * gain, pr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let k = 0; k < n; k++) {
    let s = fn(k / SR, k); if (s === 0) continue;
    let i = (i0 + k) % NS; if (i < 0) i += NS;
    if (dk) s *= SCG[i >> 6];
    const l = s * pl, r = s * pr; L[i] += l; R[i] += r;
    if (snd) { SND_L[i] += l * snd; SND_R[i] += r * snd; }
    if (ech) { ECH_L[i] += l * ech; ECH_R[i] += r * ech; }
  }
}
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
function lpf() { let lo = 0, bp = 0; return (x, fc, qq) => { const f = Math.min(0.8, TAU * fc / SR); lo += f * bp; const hi = x - lo - qq * bp; bp += f * hi; return lo; }; }
function bpf() { let lo = 0, bp = 0; return (x, fc, qq) => { const f = Math.min(0.8, TAU * fc / SR); lo += f * bp; const hi = x - lo - qq * bp; bp += f * hi; return bp; }; }
const rel = (t, d, r) => t > d ? Math.max(0, 1 - (t - d) / r) : 1;
// tonal instruments
function pluckFn(f, d) { let p = 0; const F = lpf(), dt = f / SR; return t => { p += dt; if (p >= 1) p -= 1; const v = (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt); return F(v, 900 + 3200 * Math.exp(-t * 14), 0.55) * (t < 0.003 ? t / 0.003 : 1) * Math.exp(-t * 7) * rel(t, d, 0.04); }; }
function glassFn(f) { let pc = 0, pm = 0; return t => { pc += f / SR; pm += f * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + 1.2 * Math.exp(-t * 5) * fsin(TAU * pm)) * Math.exp(-t * 2.3) * (t < 0.004 ? t / 0.004 : 1); }; }
function chordFn(ms, d, cut, att) {
  const n = ms.length * 2, ph = new Float64Array(n), dts = []; ms.forEach(m => { const f = mtof(m); dts.push(f * 1.004 / SR, f * 0.996 / SR); }); const F = lpf();
  return t => { let x = 0; for (let j = 0; j < n; j++) { let qq = ph[j] + dts[j]; if (qq >= 1) qq -= 1; ph[j] = qq; x += 2 * qq - 1; } return F(x / n, cut, 0.7) * Math.min(1, t / att) * rel(t, d, 0.45); };
}
function bassFn(f, d) { let s = 0, s2 = 0; const F = lpf(), dt = f / SR; return t => { s += dt; s -= Math.floor(s); s2 += dt * 2.003; s2 -= Math.floor(s2); return (0.85 * fsin(TAU * s) + 0.25 * F(2 * s2 - 1, 380, 0.8)) * (t < 0.006 ? t / 0.006 : 1) * rel(t, d, 0.05); }; }
function pulseFn(f, d) { let p = 0; const F = lpf(), dt = f / SR; return t => { p += dt; if (p >= 1) p -= 1; return F(p < 0.3 ? 1 : -1, 1500, 0.6) * (t < 0.003 ? t / 0.003 : 1) * Math.exp(-t * 9) * rel(t, d, 0.03); }; }
function kickFn(seed) { let p = 0; return (t, k) => { p += (52 + 110 * Math.exp(-t * 36)) / SR; return fsin(TAU * p) * Math.exp(-t * 10) * (t < 0.0015 ? t / 0.0015 : 1) + (t < 0.003 ? nz(k * 7 + seed) * 0.25 * (1 - t / 0.003) : 0); }; }
function snapFn(seed) { const F = bpf(); return (t, k) => F(nz(k * 3 + seed), 2400, 0.6) * Math.exp(-t * 55) * 1.3; }
function hatFn(seed) { const F = bpf(); return (t, k) => F(nz(k * 13 + seed), 7600, 1.0) * (t < 0.002 ? t / 0.002 : Math.exp(-(t - 0.002) * 60)) * 1.3; }
function riserFn(d, seed) { const F = bpf(); return (t, k) => { const u = clamp(t / d, 0, 1); return F(nz(k * 19 + seed), 300 * Math.pow(20, u), 0.7) * u * u * (t > d ? Math.exp(-(t - d) * 14) : 1); }; }
// the alpha shimmer: a soft chord whose amplitude flutters at 10 Hz, scaled by the posterior alpha envelope (and gated to the scenes that show alpha)
function alphaTexFn(t0) {
  const ms = [nm('F#', 4), nm('C#', 5), nm('A', 5), nm('E', 6)], ph = [0, 0, 0, 0]; const F = lpf();
  return t => {
    const ft = per(t0 + t), gate = ft >= q(272) || ft < q(30) ? 1 : 0; if (!gate) return 0;
    let x = 0; for (let j = 0; j < 4; j++) { ph[j] += mtof(ms[j]) / SR; ph[j] -= Math.floor(ph[j]); x += fsin(TAU * ph[j]) * (j === 0 ? 1 : 0.6); }
    const flutter = 0.5 + 0.5 * fsin(TAU * 10 * ft), env = alphaEnv(ft), edge = clamp((ft >= q(272) ? ft - q(272) : 1) / 0.6, 0, 1) * (ft < q(30) ? clamp((q(30) - ft) / 0.8, 0, 1) : 1);
    return F(x * (0.25 + 0.75 * flutter), 2400, 0.7) * env * env * edge;
  };
}
function playMusic(e, L, R) {
  const k = e.k, sd = Math.round(e.t * 1000), v = e.v;
  switch (k) {
    case 'pad': voice(L, R, e.t, e.d + 0.6, 0, 0.15 * v, chordFn(e.ms, e.d, e.cut || 1100, 0.35), { send: 0.5, duck: 1 }); break;
    case 'bass': voice(L, R, e.t, e.d + 0.06, 0, 0.13 * v, bassFn(mtof(e.m), e.d), { duck: 1 }); break;
    case 'pluck': voice(L, R, e.t, e.d + 0.25, e.p || 0, 0.075 * v, pluckFn(mtof(e.m), e.d), { send: 0.3, echo: 0.22 }); break;
    case 'pulse': voice(L, R, e.t, e.d + 0.1, 0, 0.09 * v, pulseFn(mtof(e.m), e.d), { send: 0.25, echo: 0.18 }); break;
    case 'glass': voice(L, R, e.t, 1.8, 0.15, 0.14 * v, glassFn(mtof(e.m)), { send: 0.55, echo: 0.3 }); break;
    case 'kick': voice(L, R, e.t, 0.5, 0, 0.2 * v, kickFn(sd)); break;
    case 'snap': voice(L, R, e.t, 0.15, 0.1, 0.11 * v, snapFn(sd), { send: 0.3 }); break;
    case 'hat': voice(L, R, e.t, 0.08, e.p || 0, 0.085 * v, hatFn(sd)); break;
    case 'riser': voice(L, R, e.t, e.d + 0.3, 0, 0.09 * v, riserFn(e.d, sd), { send: 0.4 }); break;
    case 'alphatex': voice(L, R, e.t, e.d, 0, 0.06 * v, alphaTexFn(e.t), { send: 0.5 }); break;
  }
}
// ---------------------------------------------------------------- SFX recipes
function playSfx(e, L, R) {
  const k = e.k, v = e.v * 1.7, f = e.f || 440, p = e.p || 0, d = e.d || 0.2, sd = Math.round(e.t * 1000);
  const V = (t0, dur, g, fn, snd, pan) => voice(L, R, t0, dur, pan === undefined ? p : pan, g * v, fn, { send: snd === undefined ? 0.3 : snd });
  const sine = (fAt, envFn) => { let ph = 0; return t => { ph += fAt(t) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * envFn(t); }; };
  const bell = (f0, r, idx) => { let pc = 0, pm = 0; return t => { pc += f0 / SR; pm += f0 * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + idx * Math.exp(-t * 8) * fsin(TAU * pm)) * Math.exp(-t * r) * (t < 0.003 ? t / 0.003 : 1); }; };
  const noiseLP = (cutAt, envFn, seed) => { let lp = 0, lp2 = 0; return (t, kk) => { const a = 1 - Math.exp(-TAU * cutAt(t) / SR); lp += a * (nz(kk * 7 + seed) - lp); lp2 += a * (lp - lp2); return lp2 * envFn(t); }; };
  const noiseBP = (fcAt, qq, envFn, seed) => { const F = bpf(); return (t, kk) => F(nz(kk * 13 + seed), fcAt(t), qq) * envFn(t); };
  const swell = dd => t => Math.sin(Math.PI * clamp(t / dd, 0, 1));
  const att = (a, r) => t => (t < a ? t / a : 1) * Math.exp(-Math.max(0, t - a) * r);
  const edge = (dd, a, r) => t => Math.min(1, t / a) * Math.min(1, Math.max(0, dd - t) / r);
  const tick = (t0, g, f0, pan) => { V(t0, 0.01, g, (t, kk) => nz(kk * 3 + sd + Math.round(f0)) * Math.min(1, t / 0.0008) * (1 - t / 0.01), 0.15, pan); V(t0, 0.06, g * 0.6, sine(() => f0, att(0.0008, 70)), 0.25, pan); };
  switch (k) {
    // the hook: an immediate electronic pulse with a fast soft sweep of the waveform
    case 'hook': V(e.t, 0.5, 0.26, sine(t => 62 + 30 * Math.exp(-t * 20), att(0.004, 5)), 0.2); tick(e.t, 0.12, 2200, 0); V(e.t, d, 0.07, noiseBP(t => 600 * Math.pow(9, clamp(t / d, 0, 1)), 0.5, swell(d), sd), 0.45); V(e.t, 0.6, 0.07, bell(fq('F#', 5), 4, 0.6), 0.5); break;
    case 'tone': V(e.t, d, 0.08, sine(() => f, edge(d, 0.02, d * 0.7)), 0.5); V(e.t, d, 0.04, sine(() => f * 1.5, edge(d, 0.05, d * 0.7)), 0.5); break;
    case 'soft': V(e.t, d, 0.05, noiseLP(() => 900, swell(d), sd), 0.45); break;
    case 'ui': V(e.t, 0.12, 0.07, bell(scl(14, 4), 18, 0.4), 0.3); tick(e.t, 0.05, 3200, 0.2); break;
    case 'zoom': V(e.t, d, 0.09, noiseBP(t => 400 * Math.pow(6, clamp(t / d, 0, 1)), 0.6, swell(d), sd), 0.45); V(e.t, d, 0.04, sine(t => 220 * Math.pow(2, t / d), swell(d)), 0.4); break;
    case 'peel': V(e.t, d, 0.08, noiseBP(t => 2200 - 1400 * t / d, 0.5, att(0.004, 9), sd), 0.35); break;
    case 'layer': V(e.t, 0.3, 0.09, bell(f, 9, 0.5), 0.4); V(e.t, 0.08, 0.06, sine(() => 140, att(0.002, 30)), 0.2); break;
    case 'dive': V(e.t, d, 0.1, noiseBP(t => 300 * Math.pow(12, clamp(t / d, 0, 1)), 0.55, t => Math.pow(clamp(t / d, 0, 1), 1.5) * (t > d * 0.92 ? Math.max(0, 1 - (t - d * 0.92) / (d * 0.08)) : 1), sd), 0.5); V(e.t + d * 0.9, 0.5, 0.08, bell(fq('C#', 6), 5, 0.7), 0.6); break;
    case 'swell': V(e.t, d, 0.07, noiseLP(t => 500 + 1500 * t / d, swell(d), sd), 0.5); V(e.t, d, 0.04, sine(() => scl(7, 3), swell(d)), 0.5); break;
    case 'burst': for (let i = 0; i < 5; i++) tick(e.t + i * 0.035, 0.07, f * (1 + 0.12 * i), -0.4 + 0.2 * i); break;
    case 'shimmer': for (let i = 0; i < 6; i++) V(e.t + i * 0.06, 0.7, 0.045, bell(scl(9 + i * 2, 4), 4, 0.5), 0.6, -0.5 + 0.2 * i); break;
    case 'align': for (let i = 0; i < 8; i++) tick(e.t + i * S16 / 2, 0.06, scl(7 + i, 4) * 2, -0.35 + 0.1 * i); break;
    case 'tick': tick(e.t, 0.12, f, p); break;
    case 'release': tick(e.t, 0.1, 1700, -0.1); V(e.t + 0.02, 0.35, 0.07, noiseBP(() => 5200, 0.4, att(0.004, 12), sd), 0.45); V(e.t, 0.3, 0.06, bell(fq('A', 6), 12, 0.5), 0.5); break;
    case 'bind': for (let i = 0; i < 3; i++) tick(e.t + i * 0.05, 0.08, 1400 + i * 260, -0.3 + 0.3 * i); break;
    case 'open': V(e.t, d, 0.09, sine(t => 300 + 500 * clamp(t / d, 0, 1), edge(d, 0.02, 0.2)), 0.4); V(e.t, d, 0.05, noiseBP(t => 900 + 2200 * t / d, 0.5, swell(d), sd), 0.45); if (e.eyes) V(e.t, 0.6, 0.06, bell(fq('A', 5), 4, 0.6), 0.55); break;
    case 'ion': V(e.t, 0.08, 0.09, sine(t => f * (1 + 1.5 * t / 0.08), att(0.001, 40)), 0.35); break;
    case 'glide': { let ph = 0; V(e.t, d, 0.07, t => { ph += lerp(scl(11, 4), scl(4, 4), clamp(t / d, 0, 1)) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * edge(d, 0.02, 0.3)(t); }, 0.5); break; }
    case 'dipole': V(e.t, 0.5, 0.08, bell(scl(7, 4), 6, 0.5), 0.45, -0.3); V(e.t + S16, 0.5, 0.08, bell(scl(4, 4), 6, 0.5), 0.45, 0.3); break;
    case 'echo': for (let i = 0; i < 3; i++) V(e.t + i * S16, 0.4, 0.06 * (1 - i * 0.25), bell(scl(7, 4), 7, 0.5), 0.5, -0.5 + 0.5 * i); break;
    case 'sync': V(e.t, 0.35, 0.09, bell(f, 5, 0.5), 0.45); V(e.t, 0.25, 0.04, sine(() => f / 2, att(0.003, 10)), 0.3); break;
    case 'field': V(e.t, d, 0.14, sine(t => 55 + 8 * Math.sin(TAU * 2 * t), att(0.02, 2.5)), 0.3); V(e.t, d, 0.05, noiseLP(() => 600, swell(d), sd), 0.5); break;
    case 'ripple': V(e.t, 0.6, 0.07, sine(t => f * (1 - 0.15 * t), att(0.004, 4)), 0.55); break;
    case 'whoosh': V(e.t, d, e.low ? 0.15 : 0.12, noiseLP(t => e.low ? 300 + 700 * Math.sin(Math.PI * t / d) : 700 + 2600 * Math.sin(Math.PI * t / d), swell(d), sd), 0.45); break;
    case 'thud': V(e.t, 0.3, 0.12, sine(t => 90 - 15 * e.i + 30 * Math.exp(-t * 30), att(0.003, 12)), 0.25); V(e.t, 0.12, 0.05, noiseLP(() => 900 - 250 * e.i, att(0.002, 30), sd), 0.25); break;
    case 'arrive': V(e.t, 0.7, 0.09, bell(scl(9, 4), 3.5, 0.6), 0.6); V(e.t + S16, 0.7, 0.06, bell(scl(11, 4), 3.5, 0.6), 0.6); break;
    case 'gel': V(e.t, 0.25, 0.07, sine(t => 260 + 90 * Math.sin(TAU * 18 * t), att(0.01, 10)), 0.3); break;
    case 'measure': V(e.t, 0.25, 0.1, sine(() => f === 440 ? scl(9, 4) : f, att(0.002, 14)), 0.35); tick(e.t, 0.06, 2600, 0); break;
    case 'blip': V(e.t, 0.12, 0.08, sine(() => f, att(0.002, 22)), 0.3); break;
    case 'twin': V(e.t, 0.12, 0.08, sine(() => scl(9, 4), att(0.002, 22)), 0.3, -0.4); V(e.t + S16, 0.12, 0.08, sine(() => scl(7, 4), att(0.002, 22)), 0.3, 0.4); break;
    case 'weak': V(e.t, d, 0.05, sine(t => scl(11, 4) * (1 + 0.01 * Math.sin(TAU * 7 * t)), edge(d, 0.05, 0.3)), 0.55); break;
    case 'hum': { let ph = 0; V(e.t, d, 0.05, t => { ph += 100 / SR; ph -= Math.floor(ph); return (2 * ph - 1) * edge(d, 0.05, 0.25)(t) * 0.6; }, 0.2); break; }
    case 'drift': V(e.t, d, 0.06, sine(t => 120 + 40 * Math.sin(TAU * 1.5 * t), edge(d, 0.15, 0.3)), 0.3); break;
    case 'enter': tick(e.t, 0.08, 1800, 0); V(e.t, 0.2, 0.06, sine(() => 160, att(0.002, 16)), 0.25); break;
    case 'amp': V(e.t, d, 0.1, noiseBP(t => 400 * Math.pow(8, clamp(t / d, 0, 1)), 0.6, swell(d), sd), 0.45); V(e.t, d, 0.06, sine(t => scl(4, 3) * Math.pow(2, 1.5 * clamp(t / d, 0, 1)), edge(d, 0.05, 0.3)), 0.45); break;
    case 'noise': V(e.t, d, 0.08, noiseBP(() => 2800, 0.5, edge(d, 0.08, 0.3), sd), 0.3, -0.5); V(e.t, d, 0.08, noiseBP(() => 2800, 0.5, edge(d, 0.08, 0.3), sd + 1), 0.3, 0.5); break;
    case 'cancel': V(e.t, d, 0.09, noiseBP(t => 2800 - 1800 * clamp(t / d, 0, 1), 0.5, t => Math.exp(-t * 4), sd), 0.3); V(e.t + d * 0.6, 0.5, 0.06, bell(scl(11, 4), 6, 0.4), 0.5); break;
    case 'filt': V(e.t, d, 0.08, noiseBP(t => 4000 * Math.pow(0.15, clamp(t / d, 0, 1)), 0.4, swell(d), sd), 0.45); break;
    case 'pass': V(e.t, 0.6, 0.08, bell(scl(9, 4), 4, 0.5), 0.55); break;
    case 'sample': V(e.t, 0.03, 0.12, sine(() => f, att(0.0004, 150)), 0.12); break;
    case 'digital': [0, 2, 4, 7].forEach((s, i) => V(e.t + i * 0.03, 0.12, 0.06, sine(() => scl(7 + s, 4) * 2, att(0.001, 30)), 0.3, -0.3 + 0.2 * i)); break;
    case 'record': for (let i = 0; i < 8; i++) V(e.t + i * S16, 0.1, 0.05 * (1 - i * 0.07), sine(() => scl(7 + (i % 4) * 2, 4), att(0.001, 26)), 0.3, (i % 2 ? 0.3 : -0.3)); break;
    case 'alpha': V(e.t, 0.5, 0.08, bell(f, 5, 0.4), 0.55); break;
    case 'block': V(e.t, 0.25, 0.07, sine(t => 300 - 120 * clamp(t / 0.2, 0, 1), att(0.004, 12)), 0.3); break;
    case 'ambience': V(e.t, d, 0.04, t => (fsin(TAU * 92.5 * t) + 0.4 * fsin(TAU * 185 * t)) * edge(d, 0.4, 0.7)(t), 0.3); V(e.t, d, 0.03, noiseLP(() => 1600, edge(d, 0.4, 0.7), sd), 0.5); break;
    case 'relax': { let ph = 0; V(e.t, d, 0.06, t => { ph += lerp(scl(9, 4), scl(7, 4), clamp(t / d, 0, 1)) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * edge(d, 0.05, 0.4)(t); }, 0.5); break; }
    // into the loop point: a soft rising swell that rings past 55 s into the hook pulse (wraps)
    case 'riser2': V(e.t, d + 0.35, 0.07, noiseBP(t => 300 * Math.pow(10, clamp(t / d, 0, 1)), 0.6, t => t < d ? Math.pow(t / d, 2) : Math.exp(-(t - d) * 12), sd), 0.45); break;
  }
}
// ---------------------------------------------------------------- effects and render
function reverb(inL, inR, outL, outR, wet) {
  const C = [1116, 1188, 1277, 1356].map(n => Math.round(n * SR / 44100)), A = [556, 441].map(n => Math.round(n * SR / 44100));
  [[inL, outL, 0], [inR, outR, 23]].forEach(([inp, out, sp]) => {
    const cs = C.map(n => new Float32Array(n + sp)), as = A.map(n => new Float32Array(n + sp)), ci = [0, 0, 0, 0], fs = [0, 0, 0, 0], ai = [0, 0];
    const fb = 0.85, dm = 0.3, dm1 = 1 - dm;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NS; i++) {
      const x = inp[i] * 0.2; let y = 0;
      for (let j = 0; j < 4; j++) { const b = cs[j], o = b[ci[j]]; fs[j] = o * dm1 + fs[j] * dm; b[ci[j]] = x + fs[j] * fb; if (++ci[j] >= b.length) ci[j] = 0; y += o; }
      for (let j = 0; j < 2; j++) { const b = as[j], o = b[ai[j]]; b[ai[j]] = y + o * 0.5; y = o - y; if (++ai[j] >= b.length) ai[j] = 0; }
      if (pass === 1) out[i] += y * wet;
    }
  });
}
function renderAudio(opts) {
  opts = opts || {};
  const L = new Float32Array(NS), R = new Float32Array(NS);
  SND_L = new Float32Array(NS); SND_R = new Float32Array(NS); ECH_L = new Float32Array(NS); ECH_R = new Float32Array(NS);
  const sfx = sfxEvents();
  if (opts.bus !== 's') {
    const mus = musicEvents();
    SCG = new Float32Array((NS >> 6) + 2).fill(1);
    for (const e of mus) if (e.k === 'kick') { const depth = 0.22 * e.v, j0 = Math.round(e.t * SR) >> 6, n = Math.round(0.24 * SR) >> 6; for (let qq = 0; qq < n; qq++) { const j = (j0 + qq) % SCG.length, u = qq * 64 / SR, a = u < 0.004 ? u / 0.004 : Math.exp(-(u - 0.004) * 13); SCG[j] *= 1 - depth * a; } }
    for (const e of mus) playMusic(e, L, R);
    if (opts.bus !== 'm') for (const e of sfx) { const dk = DUCK[e.k]; if (!dk) continue; const i0 = Math.round(e.t * SR), n = Math.round(0.45 * SR), a0 = Math.round(0.006 * SR); for (let kk = 0; kk < n; kk++) { const i = (i0 + kk) % NS, a = kk < a0 ? kk / a0 : Math.exp(-(kk - a0) / SR * 7), g = 1 - dk * a; L[i] *= g; R[i] *= g; } }
  }
  if (opts.bus !== 'm') for (const e of sfx) playSfx(e, L, R);
  { const Dd = Math.round(0.75 * BEAT * SR), fb = 0.35;   // dotted-eighth ping-pong delay (circular)
    for (let i = 0; i < NS; i++) { let el = 0, er = 0, w = 1; for (let kk = 1; kk <= 4; kk++) { w *= fb; const j = (i - kk * Dd + NS * 4) % NS; if (kk % 2) { el += w * ECH_R[j]; er += w * ECH_L[j]; } else { el += w * ECH_L[j]; er += w * ECH_R[j]; } } L[i] += el; R[i] += er; SND_L[i] += el * 0.3; SND_R[i] += er * 0.3; } }
  ECH_L = ECH_R = SCG = null;
  reverb(SND_L, SND_R, L, R, 0.75);
  SND_L = SND_R = null;
  const a = Math.exp(-TAU * 15000 / SR);
  for (const chn of [L, R]) { let y = 0, x1 = 0, hp = 0; for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NS; i++) { const x = chn[i]; y = a * y + (1 - a) * x; hp = 0.9993 * (hp + y - x1); x1 = y; if (pass === 1) chn[i] = Math.tanh(hp * 1.15) / 1.15; } }
  return { L, R };
}
module.exports = { renderAudio, musicEvents, sfxEvents, SR, NS, EV, DUR, BEAT, S16 };
if (require.main === module) {
  const out = process.argv[2] || path.join(__dirname, '..', 'build'); fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  for (const [name, bus] of [['full', undefined], ['music', 'm'], ['sfx', 's']]) {
    const r = renderAudio({ bus }), n = r.L.length, inter = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { inter[2 * i] = r.L[i]; inter[2 * i + 1] = r.R[i]; }
    fs.writeFileSync(path.join(out, `audio_${name}.f32`), Buffer.from(inter.buffer));
  }
  fs.writeFileSync(path.join(out, 'sfx_events.json'), JSON.stringify(sfxEvents().map(e => ({ t: e.t, k: e.k, d: e.d || 0.15 }))));
  console.log(`audio rendered (full, music, sfx) in ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${out}`);
}
