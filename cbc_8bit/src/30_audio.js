'use strict';
// ============================================================================
// AUDIO — an original lo-fi hip-hop score plus event-synced SFX, synthesised
// sample by sample in plain JS (no samples, no Web Audio graph). The grid is
// 118.15 BPM (32 bars = 65.000 s) played half-time, so the groove sits at a
// laid-back 59 BPM: swung boom-bap drums, a warm saturated bass, FM electric
// piano with tremolo on jazzy ii–V–I–vi changes in F major (Gm9 – C13 – Fmaj9 –
// Dm9, two bars each), a kalimba riff that keeps coming back (the hook), vinyl
// crackle and tape wobble (wow and flutter that repeat exactly every 65 s).
// Arc: hook groove from frame 0 → lighter sample journey → impedance groove
// with rim clicks (room for the pulse bips) → time-lapse lift → the music goes
// "underwater" (low-pass) exactly on the cut to hemoglobin (27 s) and surfaces
// on the cut to the white cells (32 s) → a short fill into the laser hit (bar
// 22, 42.66 s) → floating, drumless slow-motion → the groove returns as time
// resumes (48.75 s) → data and report → recap on the tonic → a tape stop that
// falls back into bar 1. Every note and tail wraps at 65 s (seamless loop).
// The impedance "bip" is the voltage itself: its loudness is computed from the
// same particle positions that draw the scope trace. Cells, light and current
// make no sound: all effects are sonifications.
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const fq = (n, o) => mtof(nm(n, o));
// ---------------------------------------------------------------- harmony (two bars per chord)
const PROG = ['Gm9', 'C13', 'Fmaj9', 'Dm9'];
const CH = {
  Gm9: { rh: [['F', 3], ['A', 3], ['Bb', 3], ['D', 4]], root: ['G', 2], fifth: ['D', 3] },
  C13: { rh: [['E', 3], ['A', 3], ['Bb', 3], ['D', 4]], root: ['C', 2], fifth: ['G', 2] },
  Fmaj9: { rh: [['E', 3], ['G', 3], ['A', 3], ['C', 4]], root: ['F', 2], fifth: ['C', 3] },
  Dm9: { rh: [['F', 3], ['A', 3], ['C', 4], ['E', 4]], root: ['D', 2], fifth: ['A', 2] },
};
const chordOf = b => PROG[Math.floor((b - 1) / 2) % 4];
// the kalimba riff (8th-note steps over two bars, swung): A C D – C A G – F
const RIFF_A = [[0, 'A', 5, 2], [3, 'C', 6, 2], [6, 'D', 6, 2], [8, 'C', 6, 1], [10, 'A', 5, 1], [11, 'G', 5, 3], [14, 'F', 5, 2]];
const RIFF_A_V = [[0, 'A', 5, 2], [3, 'C', 6, 2], [6, 'D', 6, 2], [8, 'C', 6, 1], [10, 'A', 5, 1], [11, 'G', 5, 3], [14, 'E', 5, 2]];
const RIFF_B = [[0, 'C', 6, 2], [3, 'D', 6, 2], [6, 'F', 6, 2], [8, 'E', 6, 1], [10, 'D', 6, 1], [11, 'C', 6, 3], [14, 'A', 5, 2]];
const RIFF_B_V = [[0, 'C', 6, 2], [3, 'D', 6, 2], [6, 'E', 6, 2], [8, 'D', 6, 1], [10, 'C', 6, 1], [11, 'A', 5, 3], [14, 'G', 5, 2]];
const SCALE = ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'];
function thirdBelow(n, o) { const i = SCALE.indexOf(n), j = i - 2; return j >= 0 ? [SCALE[j], o] : [SCALE[j + 7], o - (NOTE[SCALE[j + 7]] > NOTE[n] ? 1 : 0)]; }
const SWING = 0.09;                                   // off-beat 8ths late by 9 % of a beat
const st8 = (t0, s) => t0 + s * E8 + (s % 2 ? SWING * BEAT : 0);
// sections (bars, 1-based): what plays where
const BREAK = [27.0, 32.0];                           // "underwater" low-pass, on the two hard cuts
const SUSP = [bt(84), barT(25)];                      // drumless slow-motion: the laser hit to "time resumes"
const TAPE = 64.55;                                   // tape stop into the loop
// ---------------------------------------------------------------- score → events
function musicEvents() {
  const ev = [];
  const E = (o) => ev.push(o);
  for (let b = 1; b <= NBARS; b += 2) {
    const t0 = barT(b), name = chordOf(b), c = CH[name], at = beat => t0 + beat * BEAT;
    const susp = at(0) >= SUSP[0] - 0.01 && at(0) < SUSP[1] - 0.01, suspNext = b + 1 === 22;
    // ---- Rhodes comping (strummed, swung): long chord, anticipation, push, top-note pickup
    const rh = c.rh.map(([n, o]) => nm(n, o));
    const hit = (beat, dur, v, notes) => (notes || rh).forEach((m, j) => E({ t: at(beat) + (beat % 1 ? SWING * BEAT : 0) + j * 0.012, d: dur * BEAT, k: 'rhodes', m, v: v * (0.9 + 0.2 * hash(b * 17 + j + beat * 5)) }));
    if (susp) { hit(0, 7.6, 0.3); rh.slice(2).forEach((m, j) => E({ t: at(2) + j * 0.03, d: 5.5 * BEAT, k: 'rhodes', m: m + 12, v: 0.16 })); }
    else if (suspNext) { hit(0, 2.6, 0.34); hit(3.5, 0.5, 0.26, rh.slice(2)); hit(4, 3.8, 0.34); }
    else { hit(0, 2.6, 0.34); hit(3.5, 1.2, 0.26, rh.slice(1)); hit(5, 1.4, 0.3); hit(7, 0.8, 0.22, rh.slice(2)); }
    // ---- bass: root, octave pickup, fifth, root, glide into the next chord
    const R0 = nm(...c.root), F0 = nm(...c.fifth), next = nm(...CH[chordOf(b + 2 > NBARS ? 1 : b + 2)].root);
    const B = (beat, dur, m, v, glide) => E({ t: at(beat) + (beat % 1 ? SWING * BEAT * 0.5 : 0), d: dur * BEAT, k: 'bass', m, v, glide });
    if (susp) { B(0, 3.8, R0, 0.5); B(4, 3.8, R0, 0.45); }
    else if (suspNext) { B(0, 2.4, R0, 0.55); B(3.5, 0.4, R0 + 12, 0.35); B(4, 3.8, R0, 0.5); }
    else { B(0, 2.4, R0, 0.55); B(3.5, 0.4, R0 + 12, 0.35); B(5, 0.9, F0, 0.45); B(6, 1.3, R0, 0.5, next); }
    // ---- pad (white-cell chapter, the slow-motion, the ending)
    if ((b >= 17 && b <= 23) || b >= 29) E({ t: at(0), d: 8 * BEAT, k: 'pad', ms: rh.map(m => m + 12), v: susp ? 0.2 : 0.12 });
  }
  // ---- drums (half-time boom-bap, per two-bar unit; 'rim' replaces the snare while the pulses play)
  for (let b = 1; b <= NBARS; b++) {
    const t0 = barT(b), u = (b - 1) % 2, at = beat => t0 + beat * BEAT;
    const inBreak = tt => tt >= BREAK[0] && tt < barT(17), inSusp = tt => tt >= SUSP[0] && tt < SUSP[1], late = tt => tt >= TAPE;
    const ok = tt => !inSusp(tt) && !late(tt);
    const K = (beat, v) => { const tt = at(beat) + (beat % 1 ? SWING * BEAT * 0.6 : 0); if (ok(tt)) E({ t: tt, d: 0.4, k: 'kick', v }); };
    const S = (beat, v) => { const tt = at(beat); if (ok(tt) && !inBreak(tt)) E({ t: tt, d: 0.3, k: (b >= 7 && b <= 12) ? 'rim' : 'snare', v }); };
    const Hh = (beat, v, open) => { const tt = at(beat) + (beat % 1 ? SWING * BEAT : 0); if (ok(tt) && !inBreak(tt)) E({ t: tt, d: open ? 0.3 : 0.06, k: 'hat', v, open, p: beat % 1 ? 0.25 : -0.2 }); };
    // the 59-BPM pattern across two of our bars: kick 1, 2-a, 3-and; snare 2 and 4; swung 16th hats
    if (u === 0) { K(0, 0.95); K(3.5, 0.7); S(2, 0.8); }
    else { K(1, 0.85); if (b % 4 === 0) K(3.75, 0.45); S(2, 0.8); if (b % 4 === 0) S(3.5, 0.22); }
    for (let i = 0; i < 8; i++) Hh(i / 2, (i % 2 ? 0.5 : 0.85) * (i % 4 === 0 ? 1 : 0.85), u === 1 && i === 7 && b % 4 === 0);
    if ((b >= 13 && b <= 14) || (b >= 25 && b <= 28)) for (let i = 0; i < 16; i++) { const tt = at(i / 4) + (i % 2 ? SWING * BEAT * 0.5 : 0); if (ok(tt) && !inBreak(tt)) E({ t: tt, d: 0.08, k: 'shaker', v: i % 2 ? 0.5 : 0.3, p: 0.3 }); }
  }
  // the fill into the laser hit, the breath before the groove returns, soft crashes on section starts
  for (let i = 0; i < 6; i++) ev.push({ t: bt(84) - 1.5 * BEAT + i * BEAT / 4, d: 0.3, k: 'snare', v: 0.25 + 0.1 * i });
  ev.push({ t: SUSP[1] - 1.0, d: 1.0, k: 'revcym', v: 0.55 });
  for (const tt of [0, barT(17), SUSP[1], barT(31)]) ev.push({ t: tt, d: 1.6, k: 'crash', v: 0.45 });
  ev.push({ t: bt(84), d: 2.5, k: 'crash', v: 0.55 });
  // ---- kalimba riff (the earworm), with a third below when the data pours in
  const riff = (p, set, v, o) => {
    o = o || {}; const t0 = o.t0 !== undefined ? o.t0 : barT(2 * p + 1);
    set.forEach(([s, n, oc, l]) => {
      if (o.only && !o.only(s)) return;
      const tt = st8(t0, s); E({ t: tt, d: l * E8, k: 'kal', m: nm(n, oc), v });
      if (o.third) { const [n2, o2] = thirdBelow(n, oc); E({ t: tt + 0.012, d: l * E8, k: 'kal', m: nm(n2, o2), v: o.third }); }
    });
  };
  riff(0, RIFF_A, 0.36); riff(1, RIFF_A_V, 0.32); riff(2, RIFF_B, 0.22); riff(4, RIFF_A, 0.2, { only: s => s < 8 });
  riff(6, RIFF_A, 0.3); riff(7, RIFF_B, 0.2, { only: s => s === 0 || s === 6 || s === 11 });
  riff(8, RIFF_A, 0.34); riff(9, RIFF_B_V, 0.28); riff(10, RIFF_A, 0.28, { only: s => s < 8 });
  [[44.69, 'A', 5], [45.7, 'E', 5], [46.72, 'F', 5], [47.73, 'C', 6]].forEach(([tt, n, o]) => E({ t: tt, d: 0.9, k: 'kal', m: nm(n, o), v: 0.24 }));
  riff(12, RIFF_A, 0.34, { third: 0.18 }); riff(13, RIFF_B_V, 0.3, { third: 0.16 }); riff(14, RIFF_A, 0.3);
  riff(15, RIFF_A, 0.3, { t0: barT(32), only: s => s <= 6 });           // the title: the riff's first three notes, then the tape stops
  return ev.filter(e => e.t < TAPE);
}
// ---------------------------------------------------------------- SFX map (every cue belongs to a visible event)
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440, d: 0.2 }, x || {}));
  // A: hook
  S(0.14, 'pierce', 0.8); S(0.42, 'suck', 0.5, { d: 0.36 }); S(0.8, 'slam', 0.7, { d: 0.3 });
  S(T_RBC, 'ding', 0.75, { f: fq('A', 5) }); S(T_WBC, 'tick', 0.45, { f: fq('E', 6) }); S(T_PLT, 'tick', 0.45, { f: fq('G', 6) });
  S(1.86, 'dive', 0.5, { d: 0.38 }); S(HOOK_RBC.keys[1][0] - 0.06, 'bip', 0.8, { part: HOOK_RBC, f: fq('A', 4), d: 0.6 }); S(T_HOOKCOUNT, 'count', 0.6, { f: fq('D', 6) });
  S(3.0, 'undive', 0.45, { d: 0.3 });
  // B: the sample
  S(3.35, 'pump', 0.5, { d: 1.65 }); S(5.0, 'dive', 0.45, { d: 0.35 }); S(7.5, 'swish', 0.35, { d: 0.35 }); S(7.75, 'pour', 0.55, { d: 1.15 });
  S(9.0, 'undive', 0.4, { d: 0.35 }); [10.2, 10.3, 10.4].forEach((tt, i) => S(tt, 'tick', 0.4, { f: fq(['A', 'C', 'E'][i], 6) })); S(10.35, 'select', 0.4); S(10.7, 'dive', 0.45, { d: 0.3 });
  // C: impedance (the current hums; each cell's pulse is heard as its voltage)
  S(11.0, 'hum', 0.45, { d: 16.0 }); S(13.35, 'ping', 0.35, { f: fq('C', 6) }); S(14.9, 'scope', 0.4);
  S(RBC1.keys[1][0] - 0.1, 'bip', 0.9, { part: RBC1, f: fq('A', 4), d: RBC1.keys[4][0] - RBC1.keys[1][0] + 0.2 }); S(T_RBC1, 'count', 0.7, { f: fq('D', 6) });
  S(PLT1.keys[1][0] - 0.06, 'bip', 0.8, { part: PLT1, f: fq('E', 6), d: 0.4 }); S(T_PLTC, 'count', 0.55, { f: fq('A', 6) });
  S(RBC2.keys[1][0] - 0.06, 'bip', 0.8, { part: RBC2, f: fq('A', 4), d: 0.4 }); S(T_RBC2, 'count', 0.6, { f: fq('D', 6) });
  STREAM.forEach(p => S(p.keys[1][0] - 0.12, 'bip', 0.32, { part: p, f: p.k === 'rbc' ? fq('A', 4) : fq('E', 6), d: 0.24 }));
  S(25.4, 'build', 0.4, { d: 1.4 });
  // D: hemoglobin
  S(27.0, 'cut', 0.5); HG_RBC.forEach((c, i) => S(27.72 + 0.05 * i + 0.04 * hash(i + 31), 'burst', 0.35, { f: fq(['C', 'D', 'F', 'G', 'A'][i % 5], 5) }));
  S(28.5, 'bind', 0.4, { d: 0.5 }); S(29.0, 'undive', 0.4, { d: 0.3 }); S(29.38, 'led', 0.6); S(29.45, 'beam', 0.4, { d: 2.5 }); S(T_HGB, 'result', 0.75);
  // E: white cells
  S(32.0, 'swish', 0.4, { d: 0.3 }); for (let k = 0; k < 12; k++) S(34.35 + k * 0.11 + 0.04 * hash(k + 51), 'burst', 0.24, { f: fq(['D', 'F', 'G', 'A', 'C'][k % 5], 6) });
  S(36.0, 'dive', 0.45, { d: 0.3 }); for (let k = 0; k < 6; k++) S(36.5 + k * 0.24, 'dye', 0.35, { f: fq(['C', 'D', 'F', 'G', 'A', 'C'][k], k < 5 ? 6 : 7) });
  S(38.0, 'undive', 0.4, { d: 0.3 }); S(38.4, 'flow', 0.4, { d: 2.6 }); S(40.0, 'laser', 0.35, { d: 8.4 });
  S(T_CROSS, 'hit', 0.85); S(T_CROSS + 0.05, 'slowmo', 0.45, { d: 0.9 }); S(43.2, 'glow', 0.5, { d: 1.2 });
  [[45.3, 'A', 5], [45.8, 'C', 6], [46.3, 'E', 6]].forEach(([tt, n, o]) => S(tt, 'scatter', 0.45, { f: fq(n, o) }));
  // F: detection and data
  S(48.4, 'resume', 0.45, { d: 0.4 }); [T_P1, T_P2, T_P3].forEach(tt => S(tt, 'detect', 0.5));
  S(51.0, 'swish', 0.35, { d: 0.3 }); S(51.35, 'plot', 0.55, { f: fq('A', 6) });
  for (let k = 0; k < 26; k++) { const u = k / 25, tt = 51.9 + 1.4 * Math.sqrt(u); S(tt, 'tick', 0.16 + 0.1 * u, { f: fq(['F', 'G', 'A', 'C', 'D'][k % 5], 6) }); }
  S(53.0, 'shimmer', 0.45, { d: 0.8 }); S(54.0, 'swish', 0.35, { d: 0.35 });
  ['F', 'G', 'A', 'C', 'D'].forEach((n, i) => S(55.0 + i * 0.12, 'tick', 0.42, { f: fq(n, 5) }));
  // G: results and loop
  S(56.0, 'swish', 0.35, { d: 0.3 }); S(56.3, 'data', 0.4, { d: 1.4 }); S(57.95, 'undive', 0.4, { d: 0.35 });
  for (let i = 0; i < 5; i++) S(REP0 + i * REPD, 'tick', 0.4, { f: fq(['C', 'D', 'F', 'G', 'A'][i], 6) });
  for (let i = 0; i < 4; i++) S(59.35 + i * 0.11, 'check', 0.4, { f: fq(['A', 'C', 'D', 'F'][i], 6) });
  S(59.6, 'result', 0.7); S(60.0, 'swish', 0.3, { d: 0.6 });
  ['A', 'C', 'D', 'F'].forEach((n, i) => S(T_TILE(i), 'recap', 0.5, { f: fq(n, i < 3 ? 5 : 6) }));
  S(62.8, 'swish', 0.3, { d: 0.35 }); S(63.1, 'retract', 0.4, { d: 0.6 }); S(63.2, 'title', 0.55, { d: 1.2 });
  return ev;
}
const DUCK = { ding: 0.3, result: 0.3, hit: 0.4, slam: 0.25, count: 0.12 };
// ---------------------------------------------------------------- synthesis helpers
let SND_L = null, SND_R = null;                      // reverb send bus (set while rendering)
const WOW = ta => 1 + 0.0022 * fsin(LOOPW(39) * ta) + 0.0007 * fsin(LOOPW(338) * ta + 1.3);
const nz = i => hash(i) * 2 - 1;
// write one voice into (L, R) (and the reverb send); wraps at 65 s; optional tremolo (stereo autopan)
function voice(L, R, t0, dur, pan, gain, fn, o) {
  o = o || {};
  const i0 = Math.round(t0 * SR), n = Math.max(1, Math.round(dur * SR)), snd = o.send || 0, tr = o.trem || 0;
  const pl = Math.cos((pan + 1) * Math.PI / 4) * gain, pr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let k = 0; k < n; k++) {
    const s = fn(k / SR, k); if (s === 0) continue;
    let i = (i0 + k) % NS; if (i < 0) i += NS;
    let l = s * pl, r = s * pr;
    if (tr) { const m = tr * fsin(TAU * 4.3 * (t0 + k / SR)); l *= 1 + m; r *= 1 - m; }
    L[i] += l; R[i] += r;
    if (snd) { SND_L[i] += l * snd; SND_R[i] += r * snd; }
  }
}
const dec = r => t => Math.exp(-t * r);
// electric piano: 1:1 FM pair (index falls after the strike) + a short high tine ping
function rhodesFn(f, t0, d, vel) {
  let pc = 0, pt = 0; const I0 = 1.2 + 1.6 * vel;
  return t => {
    const inc = f * WOW(t0 + t) / SR; pc += inc; pt += inc * 14; pc -= Math.floor(pc); pt -= Math.floor(pt);
    const I = I0 * Math.exp(-t * 5) + 0.35;
    const s = fsin(TAU * pc + I * fsin(TAU * pc)) + 0.14 * Math.exp(-t * 40) * fsin(TAU * pt);
    return s * (t < 0.004 ? t / 0.004 : 1) * Math.exp(-t * 0.85) * (t > d ? Math.exp(-(t - d) * 14) : 1);
  };
}
function kalFn(f, t0) {
  let p1 = 0, p2 = 0;
  return t => {
    const inc = f * WOW(t0 + t) / SR; p1 += inc; p2 += inc * 5.95; p1 -= Math.floor(p1); p2 -= Math.floor(p2);
    return (t < 0.002 ? t / 0.002 : 1) * (fsin(TAU * p1) * Math.exp(-t * 4.0) + 0.3 * fsin(TAU * p2) * Math.exp(-t * 24));
  };
}
function bassFn(f0, f1, d) {
  let p = 0; const tg = d - 0.09;
  return t => {
    const f = f1 && t > tg ? f0 * Math.pow(f1 / f0, Math.min(1, (t - tg) / 0.09)) : f0;
    p += f / SR; p -= Math.floor(p);
    const s = Math.tanh(2.8 * fsin(TAU * p)) * 0.85 + 0.15 * fsin(2 * TAU * p);
    return s * (t < 0.008 ? t / 0.008 : 1) * (0.8 + 0.2 * Math.exp(-t * 7)) * (t > d ? Math.max(0, 1 - (t - d) / 0.06) : 1);
  };
}
function padFn(fs, t0, d) {
  const ph = new Float64Array(fs.length * 2); let lp = 0;
  return t => {
    const w = WOW(t0 + t); let s = 0;
    for (let j = 0; j < fs.length; j++) for (let q = 0; q < 2; q++) { const idx = j * 2 + q; let p = ph[idx] + fs[j] * w * (q ? 1.0045 : 0.9955) / SR; p -= Math.floor(p); ph[idx] = p; s += p < 0.5 ? 4 * p - 1 : 3 - 4 * p; }
    lp += 0.06 * (s - lp);
    return lp / (fs.length * 2) * Math.min(1, t / 0.7) * (t > d ? Math.max(0, 1 - (t - d) / 0.9) : 1);
  };
}
function kickFn(seed) { let p = 0, q = 0; return (t, k) => { p += (54 + 90 * Math.exp(-t * 30)) / SR; q += 1700 / SR; return fsin(TAU * p) * Math.exp(-t * 7) * (t < 0.002 ? t / 0.002 : 1) + fsin(TAU * q) * 0.22 * Math.exp(-t * 90) + (t < 0.005 ? nz(k * 7 + seed) * 0.35 * (1 - t / 0.005) : 0); }; }
function snareFn(seed) { let lp = 0, p = 0; return (t, k) => { lp += 0.32 * (nz(k * 3 + seed) - lp); p += 182 / SR; return lp * Math.exp(-t * 15) * 1.1 + fsin(TAU * p) * Math.exp(-t * 26) * 0.5; }; }
function rimFn(seed) { let p = 0; return (t, k) => { p += 1650 / SR; return fsin(TAU * p) * Math.exp(-t * 70) * 0.6 + nz(k * 11 + seed) * Math.exp(-t * 120) * 0.5; }; }
function hatFn(seed, open) { let hp = 0, prev = 0; return (t, k) => { const x = nz(k * 5 + seed); hp = 0.55 * (hp + x - prev); prev = x; return hp * Math.exp(-t * (open ? 10 : 52)); }; }
function shakerFn(seed) { let hp = 0, prev = 0, lp = 0; return (t, k) => { const x = nz(k * 13 + seed); hp = 0.7 * (hp + x - prev); prev = x; lp += 0.5 * (hp - lp); return lp * (t < 0.012 ? t / 0.012 : Math.exp(-(t - 0.012) * 30)); }; }
function crashFn(seed, d) { let lp = 0; return (t, k) => { lp += 0.45 * (nz(k * 17 + seed) - lp); return lp * Math.exp(-t * 2.2) * (t < 0.003 ? t / 0.003 : 1); }; }
function playMusic(e, L, R, EL, ER) {
  const k = e.k;
  if (k === 'rhodes') voice(L, R, e.t, e.d + 0.3, (e.m % 7 - 3) * 0.06, 0.3 * e.v, rhodesFn(mtof(e.m), e.t, e.d, e.v), { send: 0.28, trem: 0.32 });
  else if (k === 'kal') voice(EL, ER, e.t, 1.3, 0.1, 0.78 * e.v, kalFn(mtof(e.m), e.t), { send: 0.3 });
  else if (k === 'bass') voice(L, R, e.t, e.d + 0.08, 0, 0.27 * e.v, bassFn(mtof(e.m), e.glide ? mtof(e.glide) : 0, e.d));
  else if (k === 'pad') voice(L, R, e.t, e.d + 1.0, 0, 0.65 * e.v, padFn(e.ms.map(mtof), e.t, e.d), { send: 0.5, trem: 0.15 });
  else if (k === 'kick') voice(L, R, e.t, 0.45, 0, 0.6 * e.v, kickFn(Math.round(e.t * 100)));
  else if (k === 'snare') voice(L, R, e.t, 0.35, 0.06, 0.5 * e.v, snareFn(Math.round(e.t * 100)), { send: 0.18 });
  else if (k === 'rim') voice(L, R, e.t, 0.12, 0.1, 0.28 * e.v, rimFn(Math.round(e.t * 100)), { send: 0.15 });
  else if (k === 'hat') voice(L, R, e.t, e.open ? 0.35 : 0.08, e.p, 0.3 * e.v, hatFn(Math.round(e.t * 100), e.open));
  else if (k === 'shaker') voice(L, R, e.t, 0.1, e.p, 0.16 * e.v, shakerFn(Math.round(e.t * 100)));
  else if (k === 'crash') voice(L, R, e.t, e.d, 0, 0.16 * e.v, crashFn(Math.round(e.t * 100), e.d), { send: 0.3 });
  else if (k === 'revcym') { const d = e.d; voice(L, R, e.t, d, 0, 0.16 * e.v, (t, kk) => nz(kk * 19 + 5) * Math.pow(t / d, 2.2) * (t > d - 0.02 ? (d - t) / 0.02 : 1), { send: 0.4 }); }
}
// ---------------------------------------------------------------- SFX: soft, rounded, tuned to F major
function playSfx(e, L, R) {
  const k = e.k, v = e.v, f = e.f || 440, p = e.p || 0, d = e.d || 0.2;
  const V = (t0, dur, g, fn, snd) => voice(L, R, t0, dur, p, g * v, fn, { send: snd === undefined ? 0.2 : snd });
  const sine = (fAt, envFn) => { let ph = 0; return t => { ph += fAt(t) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * envFn(t); }; };
  const bell = (f0, r, idx) => { let pc = 0, pm = 0; return t => { pc += f0 / SR; pm += f0 * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + idx * Math.exp(-t * 8) * fsin(TAU * pm)) * Math.exp(-t * r) * (t < 0.002 ? t / 0.002 : 1); }; };
  const noiseLP = (cutAt, envFn, seed) => { let lp = 0, lp2 = 0; return (t, kk) => { const a = 1 - Math.exp(-TAU * cutAt(t) / SR); lp += a * (nz(kk * 7 + seed) - lp); lp2 += a * (lp - lp2); return lp2 * envFn(t); }; };
  const swell = dd => t => Math.sin(Math.PI * clamp(t / dd, 0, 1));
  switch (k) {
    case 'pierce': V(e.t, 0.02, 0.75, noiseLP(() => 6000, dec(250), 3)); V(e.t, 0.08, 0.75, sine(t => 190 - 900 * t, dec(45))); V(e.t, 0.05, 0.25, sine(() => 2600, dec(120))); break;
    case 'suck': V(e.t, d, 0.35, noiseLP(t => 3500 - 2800 * t / d, swell(d), 5)); break;
    case 'slam': V(e.t, 0.3, 0.7, sine(t => 40 + 60 * Math.exp(-t * 20), dec(10)), 0.1); V(e.t, 0.12, 0.25, noiseLP(() => 2200, dec(30), 7)); break;
    case 'ding': V(e.t, 1.2, 0.36, bell(f, 3.2, 1.4), 0.35); V(e.t + 0.002, 1.0, 0.18, bell(f * 2, 4.5, 0.6), 0.35); break;
    case 'tick': V(e.t, 0.12, 0.4, sine(() => f, dec(45))); break;
    case 'count': V(e.t, 0.1, 0.34, sine(() => f, dec(35))); V(e.t + 0.06, 0.25, 0.3, sine(() => f * 1.5, dec(16)), 0.3); break;
    case 'dive': V(e.t, d, 0.3, noiseLP(t => 600 + 7000 * (t / d) ** 2, swell(d), 9), 0.25); V(e.t, d, 0.12, sine(t => 300 + 700 * t / d, swell(d))); break;
    case 'undive': V(e.t, d, 0.28, noiseLP(t => 6000 - 5200 * t / d, swell(d), 11), 0.25); break;
    case 'swish': V(e.t, d, 0.22, noiseLP(t => 1500 + 3000 * Math.sin(Math.PI * t / d), swell(d), 13), 0.3); break;
    case 'pump': { let ph = 0; V(e.t, d, 0.3, (t) => { ph += (52 + 6 * t) / SR; ph -= Math.floor(ph); return (ph * 2 - 1) * 0.5 * (0.6 + 0.4 * fsin(TAU * 11 * t)) * Math.min(1, t / 0.15) * Math.min(1, (d - t) / 0.2); }, 0.05); V(e.t, d, 0.12, noiseLP(() => 900, t => Math.min(1, t / 0.2) * Math.min(1, (d - t) / 0.2), 15)); break; }
    case 'pour': V(e.t, d, 0.4, noiseLP(t => 1400 + 900 * fsin(TAU * 7 * t), swell(d), 17), 0.3); for (let i = 0; i < 9; i++) { const t1 = e.t + 0.1 + i * 0.11 + 0.05 * hash(i + 3); V(t1, 0.07, 0.3, sine(t => (320 + 150 * hash(i + 9)) * (1 + 6 * t), dec(40))); } break;
    case 'select': V(e.t, 0.18, 0.3, sine(t => t < 0.06 ? fq('C', 6) : fq('F', 6), dec(18))); break;
    case 'hum': { const h = fq('F', 2); V(e.t, d, 0.2, (t) => { const a = Math.min(1, t / 0.6) * Math.min(1, (d - t) / 0.4) * (0.85 + 0.15 * fsin(TAU * 0.7 * t)); return a * (fsin(TAU * h * t) * 0.6 + fsin(TAU * 2 * h * t) * 0.35 + fsin(TAU * 3 * h * t) * 0.22); }, 0.05); break; }
    case 'ping': V(e.t, 0.6, 0.3, bell(f, 6, 0.8), 0.35); break;
    case 'scope': V(e.t, 0.2, 0.28, sine(t => fq('A', 5) * (1 + 1.2 * t / 0.2), dec(10))); break;
    case 'bip': { // the voltage, made audible: loudness = the same sensing-zone response that draws the scope
      const prt = e.part, vn = prt.vol || VOL[prt.k]; let ph = 0;
      V(e.t, d, 0.33, (t) => { const s = impSignal([prt], e.t + t) / vn; if (s <= 0.001) return 0; ph += f / SR; ph -= Math.floor(ph); return s * (fsin(TAU * ph) + 0.22 * fsin(2 * TAU * ph)); }, 0.12); break;
    }
    case 'build': for (let i = 0; i < 10; i++) V(e.t + i * d / 10, 0.12, 0.12 + 0.012 * i, sine(() => fq(['F', 'G', 'A', 'C', 'D'][i % 5], 5 + Math.floor(i / 5)), dec(30))); break;
    case 'cut': V(e.t, 0.25, 0.45, sine(t => 60 + 40 * Math.exp(-t * 25), dec(14)), 0.05); break;
    case 'burst': V(e.t, 0.06, 0.32, sine(t => f * (1.8 - 14 * t), dec(55))); V(e.t, 0.015, 0.12, noiseLP(() => 5000, dec(300), 21)); break;
    case 'bind': for (let i = 0; i < 6; i++) V(e.t + i * d / 6, 0.4, 0.1, bell(fq(['C', 'D', 'F', 'G', 'A', 'C'][i], i < 5 ? 6 : 7), 9, 0.5), 0.4); break;
    case 'led': V(e.t, 0.03, 0.4, noiseLP(() => 5000, dec(300), 23)); V(e.t, 0.05, 0.25, sine(() => 2093, dec(90))); break;
    case 'beam': V(e.t, d, 0.07, sine(() => fq('A', 6), t => Math.min(1, t / 0.3) * Math.min(1, (d - t) / 0.3) * (0.8 + 0.2 * fsin(TAU * 3 * t))), 0.3); break;
    case 'result': V(e.t, 0.6, 0.3, bell(fq('C', 6), 4, 1.0), 0.35); V(e.t + 0.12, 1.2, 0.34, bell(fq('F', 6), 3, 1.0), 0.35); break;
    case 'dye': V(e.t, 0.5, 0.22, bell(f, 7, 1.2), 0.45); break;
    case 'flow': V(e.t, d, 0.2, noiseLP(t => 700 + 300 * fsin(TAU * 1.3 * t), t => Math.min(1, t / 0.4) * Math.min(1, (d - t) / 0.4), 25), 0.2); break;
    case 'laser': V(e.t, d, 0.07, (t) => { const a = Math.min(1, t / 0.5) * Math.min(1, (d - t) / 0.3); return a * (fsin(TAU * fq('E', 6) * t) + 0.3 * fsin(TAU * fq('E', 6) * 1.003 * t)); }, 0.2); break;
    case 'hit': V(e.t, 0.5, 0.5, sine(t => 45 + 50 * Math.exp(-t * 18), dec(8)), 0.1); [['F', 6], ['A', 6], ['C', 7], ['E', 7]].forEach(([n, o], i) => V(e.t + i * 0.018, 1.6, 0.13, bell(fq(n, o), 2.4, 1.2), 0.6)); break;
    case 'slowmo': V(e.t, d, 0.22, noiseLP(t => 5000 * Math.pow(0.08, t / d), swell(d), 27), 0.4); break;
    case 'glow': for (let i = 0; i < 7; i++) V(e.t + i * 0.09, 1.0, 0.09, bell(fq(['F', 'A', 'C', 'E', 'G', 'A', 'C'][i], i < 2 ? 6 : 7), 3.5, 0.5), 0.6); break;
    case 'scatter': V(e.t, 0.8, 0.26, bell(f, 4, 1.1), 0.4); break;
    case 'resume': V(e.t, d, 0.26, noiseLP(t => 500 + 6000 * (t / d) ** 2, swell(d), 29), 0.3); break;
    case 'detect': [['F', 6], ['A', 6], ['C', 7]].forEach(([n, o], i) => V(e.t + i * 0.035, 0.1, 0.38, sine(() => fq(n, o), dec(45)))); break;
    case 'plot': V(e.t, 0.2, 0.36, sine(t => f * (1 + 0.5 * Math.exp(-t * 60)), dec(20)), 0.3); break;
    case 'shimmer': for (let i = 0; i < 10; i++) V(e.t + i * d / 10, 0.4, 0.11, bell(fq(['A', 'C', 'D', 'F', 'G'][i % 5], 6 + (i > 6 ? 1 : 0)), 8, 0.6), 0.5); break;
    case 'data': for (let i = 0; i < 18; i++) if (hash(i + 400) > 0.3) V(e.t + i * d / 18, 0.05, 0.17, sine(() => fq(['F', 'G', 'A', 'C', 'D'][Math.floor(hash(i + 401) * 5)], 6), dec(80))); break;
    case 'check': V(e.t, 0.08, 0.26, sine(() => f, dec(35))); V(e.t + 0.05, 0.16, 0.24, sine(() => f * 1.5, dec(24))); break;
    case 'recap': V(e.t, 0.9, 0.34, bell(f, 3.6, 1.1), 0.4); V(e.t, 0.12, 0.2, sine(t => f * 0.5 * (1 + 3 * t), dec(30))); break;
    case 'retract': { let ph = 0; V(e.t, d, 0.18, (t) => { ph += (70 - 20 * t / d) / SR; ph -= Math.floor(ph); return (ph * 2 - 1) * swell(d)(t); }, 0.05); break; }
    case 'title': [['F', 4], ['A', 4], ['C', 5], ['E', 5], ['G', 5]].forEach(([n, o], i) => V(e.t + i * 0.03, d + 0.8, 0.12, bell(fq(n, o), 1.6, 0.9), 0.5)); break;
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
// two cascaded one-pole low-passes whose cutoff follows cutAt(t), over [ta, tb]
function sweepLP(ch, ta, tb, cutAt) {
  const i0 = Math.round(ta * SR), i1 = Math.min(NS, Math.round(tb * SR)); let y1 = ch[i0], y2 = ch[i0];
  for (let i = i0; i < i1; i++) { const a = 1 - Math.exp(-TAU * cutAt(i / SR) / SR); y1 += a * (ch[i] - y1); y2 += a * (y1 - y2); ch[i] = y2; }
}
// tape stop: the last stretch slows to a halt (pitch and speed fall together) and fades
function tapeStop(ch, ta) {
  const i0 = Math.round(ta * SR), n = NS - i0, src = ch.slice(i0, NS); let pos = 0;
  for (let k = 0; k < n; k++) {
    const u = k / n, sp = Math.pow(1 - u, 1.5), j = Math.floor(pos), fr = pos - j;
    ch[i0 + k] = ((src[j] || 0) * (1 - fr) + (src[j + 1] || 0) * fr) * Math.pow(1 - u, 0.5);
    pos += sp;
  }
}
// ---------------------------------------------------------------- render: opts.bus 'm' (music only) / 's' (SFX only) / both
function renderAudio(opts) {
  opts = opts || {};
  const L = new Float32Array(NS), R = new Float32Array(NS);
  SND_L = new Float32Array(NS); SND_R = new Float32Array(NS);
  const sfx = sfxEvents();
  if (opts.bus !== 's') {
    const mus = musicEvents();
    // tonal parts; the kalimba goes through a dotted-eighth ping-pong echo
    let EL = new Float32Array(NS), ER = new Float32Array(NS);
    for (const e of mus) if (!/^(kick|snare|rim|hat|shaker|crash|revcym)$/.test(e.k)) playMusic(e, L, R, EL, ER);
    const D = Math.round(0.75 * BEAT * SR), fb = 0.4;
    for (let i = 0; i < NS; i++) {
      let el = 0, er = 0, w = 1;
      for (let k = 1; k <= 5; k++) { w *= fb; const j = (i - k * D + NS * 5) % NS; if (k % 2) { el += w * ER[j]; er += w * EL[j]; } else { el += w * EL[j]; er += w * ER[j]; } }
      L[i] += EL[i] + el * 0.55; R[i] += ER[i] + er * 0.55; SND_L[i] += el * 0.25; SND_R[i] += er * 0.25;
    }
    EL = null; ER = null;
    // gentle sidechain: the tonal bed breathes with the kick
    for (const e of mus) if (e.k === 'kick') {
      const i0 = Math.round(e.t * SR), n = Math.round(0.32 * SR), att = Math.round(0.006 * SR);
      for (let k = 0; k < n; k++) { const i = (i0 + k) % NS, a = k < att ? k / att : Math.exp(-(k - att) / SR * 10), g = 1 - 0.26 * e.v * a; L[i] *= g; R[i] *= g; }
    }
    for (const e of mus) if (/^(kick|snare|rim|hat|shaker|crash|revcym)$/.test(e.k)) playMusic(e, L, R);
    // vinyl: a quiet hiss and sparse crackle, all the way round the loop
    let lpL = 0, lpR = 0;
    for (let i = 0; i < NS; i++) { lpL += 0.18 * (nz(i * 3 + 1) - lpL); lpR += 0.18 * (nz(i * 3 + 2) - lpR); L[i] += lpL * 0.016; R[i] += lpR * 0.016; }
    for (let c = 0; c < 420; c++) {
      const i0 = Math.floor(hash(c + 9100) * NS), a = 0.04 + 0.22 * Math.pow(hash(c + 9101), 3), n = 24 + Math.floor(hash(c + 9102) * 80), side = hash(c + 9103);
      for (let k = 0; k < n; k++) { const i = (i0 + k) % NS, s = nz(c * 977 + k) * a * Math.exp(-k / (n * 0.25)); L[i] += s * (side < 0.7 ? 1 : 0.3); R[i] += s * (side > 0.3 ? 1 : 0.3); }
    }
    // the music dips a little under the big hits
    for (const e of sfx) {
      const dk = DUCK[e.k]; if (!dk) continue;
      const i0 = Math.round(e.t * SR), n = Math.round(0.5 * SR), att = Math.round(0.01 * SR);
      for (let k = 0; k < n; k++) { const i = (i0 + k) % NS, a = k < att ? k / att : Math.exp(-(k - att) / SR * 6), g = 1 - dk * a; L[i] *= g; R[i] *= g; }
    }
    // underwater on the hemoglobin cut, surfacing on the white-cell cut
    const cut = t => t < BREAK[0] ? 18000 : t < BREAK[0] + 0.06 ? lerp(18000, 650, (t - BREAK[0]) / 0.06) : t < BREAK[1] ? 650 : t < BREAK[1] + 0.12 ? lerp(650, 18000, (t - BREAK[1]) / 0.12) : 18000;
    for (const ch of [L, R, SND_L, SND_R]) sweepLP(ch, BREAK[0] - 0.05, BREAK[1] + 0.2, cut);
    for (const ch of [L, R, SND_L, SND_R]) tapeStop(ch, TAPE);
  }
  if (opts.bus !== 'm') for (const e of sfx) playSfx(e, L, R);
  reverb(SND_L, SND_R, L, R, 0.9);
  SND_L = null; SND_R = null;
  // master: lo-fi top end (~9 kHz), DC blocking, soft saturation; circular, in place
  const a = Math.exp(-TAU * 9000 / SR);
  for (const ch of [L, R]) {
    let y = 0, x1 = 0, hp = 0;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NS; i++) {
      const x = ch[i];
      y = a * y + (1 - a) * x;
      hp = 0.9993 * (hp + y - x1); x1 = y;
      if (pass === 1) ch[i] = Math.tanh(hp * 1.1) / 1.1;
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
  const s = LIVE.ctx.createBufferSource(); s.buffer = LIVE.buf; s.connect(LIVE.gain);
  LIVE.startAt = LIVE.ctx.currentTime + 0.03; LIVE.offset = t; s.start(LIVE.startAt, t); LIVE.src = s;
}
function livePause() { if (LIVE.src) { try { LIVE.src.stop(); } catch (e) { } LIVE.src = null; } }
function liveNow() { return LIVE.offset + Math.max(0, LIVE.ctx.currentTime - LIVE.startAt); }
function liveMute(m) { LIVE.muted = m; if (LIVE.gain) LIVE.gain.gain.value = m ? 0 : 0.9; }
