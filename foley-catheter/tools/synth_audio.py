#!/usr/bin/env python3
"""Score + sound design for "How Does a Foley Catheter Work?" — pure code synthesis, no samples.

  uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json output/ [--notext]

Writes three stems into the output folder: music.wav, sfx.wav and mix.wav (or *_notext.wav without the label sounds), so a
voice-over can be laid on later and the stems rebalanced. Built from the MRI film's instrument set (helpers and
instruments verbatim from mri-brain/tools/synth_audio.py), kept restrained for a medical explainer:
- **Tempo and length.** 120 BPM, 30 bars = exactly 60 s. A scene is 6 beats, and the harmony changes once per scene:
  Fmaj7 – Am7 – Cmaj7 – G6.
- **Range.** Soft kick and sub below; air, bells and glass above; the 300 Hz – 3 kHz band, where a voice sits, kept thin.
  No lead synth, no claps, no distortion.
- **Arc.**
  - Curiosity and the destination (0–9 s): the opening motif on bell, the reveal chime on the balloon.
  - Retention and the bedside (9–18 s): a light pulse.
  - The second question (18 s): the second curiosity motif.
  - The eye and the two channels (18–33 s): a gentle lift.
  - Ports, tubing and collection (33–48 s): the completion tone on the bag.
  - Recap and the answer (48–60 s): the opening motif returns at 54 s, and the last bar leads into the first, so the file loops.
"""
import json, sys
from pathlib import Path
import numpy as np
import scipy.signal as ss
import soundfile as sf

SR = 48000
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4
args = [x for x in sys.argv[1:] if not x.startswith('--')]
NOTEXT = '--notext' in sys.argv
cuesheet = json.load(open(args[0]))
OUT = Path(args[1]); OUT.mkdir(parents=True, exist_ok=True)
TOTAL = cuesheet['total']
N = int(TOTAL * SR) + 2 * SR
MUS = np.zeros((2, N)); PUMP = np.zeros((2, N)); SFX = np.zeros((2, N)); VERB = np.zeros((2, N))
rng = np.random.default_rng(1929)                          # Frederic Foley's balloon catheter, first described in the 1930s
def tb(beat): return beat * BEAT

# ---------------------------------------------------------------- helpers and instruments (verbatim from the MRI film's synth)
def tv(d): return np.arange(max(1, int(d * SR))) / SR
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def put(bus, sig, t, g=1.0, pan=0.0, verb=0.0):
    s = int(round(t * SR))
    if s >= N or len(sig) == 0: return
    if s < 0: sig = sig[-s:]; s = 0
    sig = sig[:N - s] * g
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4; l, r = np.cos(a), np.sin(a)
    bus[0, s:s + len(sig)] += sig * l; bus[1, s:s + len(sig)] += sig * r
    if verb: VERB[0, s:s + len(sig)] += sig * l * verb; VERB[1, s:s + len(sig)] += sig * r * verb
def env(d, a=0.005, r=None, curve=6.0):
    t = tv(d); e = np.minimum(1, t / max(a, 1e-4))
    return e * np.exp(-curve * t / d) if r is None else e * np.clip((d - t) / max(r, 1e-4), 0, 1)
def adsr(d, a=0.01, dec=0.1, s=0.7, r=0.1):
    t = tv(d + r); e = np.where(t < a, t / a, np.where(t < a + dec, 1 - (1 - s) * (t - a) / dec, s))
    rel = t > d; e[rel] = s * np.clip(1 - (t[rel] - d) / r, 0, 1); return e
def sos(kind, f, order=2):
    nyq = SR / 2
    if kind == 'bp': return ss.butter(order, [max(20, f[0]) / nyq, min(f[1], nyq * 0.95) / nyq], 'band', output='sos')
    return ss.butter(order, min(max(f, 20), nyq * 0.95) / nyq, kind, output='sos')
def lp(x, f, o=2): return ss.sosfilt(sos('low', f, o), x)
def hp(x, f, o=2): return ss.sosfilt(sos('high', f, o), x)
def bp(x, lo, hi, o=2): return ss.sosfilt(sos('bp', (lo, hi), o), x)
def sweep_lp(x, f0, f1, o=2, blocks=64):
    out = np.zeros_like(x); n = len(x); edges = np.linspace(0, n, blocks + 1).astype(int); zi = None
    for k in range(blocks):
        f = f0 * (f1 / f0) ** (k / max(1, blocks - 1)); s_ = sos('low', f, o)
        if zi is None: zi = ss.sosfilt_zi(s_) * 0
        seg, zi = ss.sosfilt(s_, x[edges[k]:edges[k + 1]], zi=zi); out[edges[k]:edges[k + 1]] = seg
    return out
def noise(d): return rng.standard_normal(max(1, int(d * SR)))
def phase(f, d):
    f = np.broadcast_to(np.asarray(f, float), (max(1, int(d * SR)),)) if np.isscalar(f) else f
    return 2 * np.pi * np.cumsum(f) / SR
def osc(kind, f, d, duty=0.5):
    ph = phase(f, d)
    if kind == 'sin': return np.sin(ph)
    if kind == 'tri': return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1
    if kind == 'saw': return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if kind == 'sq': return np.where(((ph / (2 * np.pi)) % 1) < duty, 1.0, -1.0)
def sweep(f0, f1, d, k='exp'):
    t = tv(d) / d
    return f0 * (f1 / f0) ** t if k == 'exp' else f0 + (f1 - f0) * t
def S(*xs):
    L = max(len(x) for x in xs); out = np.zeros(L)
    for x in xs: out[:len(x)] += x
    return out
def ins(x, b, s):
    s = int(s)
    if s >= len(x): return
    n = min(len(b), len(x) - s); x[s:s + n] += b[:n]
def fm(f, d, ratio=3.5, idx=4.0, dec=3.0):
    t = tv(d); I = idx * np.exp(-dec * 1.6 * t)
    return np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-dec * t)
def sat(x, k=2.0): return np.tanh(k * x) / np.tanh(k)

# ---------------------------------------------------------------- instruments
def kick(g=1.0, punch=1.0):
    t = tv(0.34); f = 46 + 130 * np.exp(-t * 32)
    body = np.sin(phase(f, 0.34)) * np.exp(-t * 8)
    return sat(body * 1.2 + 0.35 * punch * hp(noise(0.34), 2500) * np.exp(-t * 110), 1.6) * g
def heartbeat():
    x = np.zeros(int(0.7 * SR)); ins(x, lp(kick(0.9, 0.2), 280), 0); ins(x, lp(kick(0.6, 0.1), 240), int(0.18 * SR)); return x
def clap():
    x = np.zeros(int(0.3 * SR))
    for o in (0, 0.009, 0.019, 0.028): ins(x, bp(noise(0.025), 1000, 6000) * np.exp(-tv(0.025) * 120), int(o * SR))
    x += bp(noise(0.3), 900, 5000) * np.exp(-tv(0.3) * 14) * 0.55
    return x
def snare(g=1.0):
    t = tv(0.24); return (bp(noise(0.24), 1300, 7500) * np.exp(-t * 18) + 0.6 * np.sin(phase(190 * (1 + 0.3 * np.exp(-t * 40)), 0.24)) * np.exp(-t * 28)) * g
def hat(open_=False):
    d = 0.28 if open_ else 0.045; return hp(noise(d), 7500, 4) * np.exp(-tv(d) * (10 if open_ else 80))
def shaker(): return bp(noise(0.07), 4500, 12000) * env(0.07, 0.012, curve=5)
def crash(d=2.2):
    t = tv(d); return (hp(noise(d), 4000, 2) * 0.8 + bp(noise(d), 2500, 9000)) * np.exp(-t * 2.2) * np.minimum(1, t / 0.003)
def tom(f=110, d=0.45):
    t = tv(d); return sat(np.sin(phase(f * (1 + 0.7 * np.exp(-t * 18)), d)) * np.exp(-t * 6) + 0.2 * lp(noise(d), 1500) * np.exp(-t * 30), 1.4)
def subbass(m, d): return osc('sin', mf(m), d) * adsr(d, 0.005, 0.05, 0.9, 0.04)[:int(d * SR)]
def pulsebass(m, d, cut=900):
    f = mf(m); x = 0.55 * osc('sq', f, d, 0.3) + 0.5 * osc('saw', f, d) + 0.7 * osc('sin', f / 2, d)
    return lp(x, cut) * adsr(d, 0.003, 0.07, 0.6, 0.03)[:len(x)]
def reese(m, d, cut=1400):
    f = mf(m); x = osc('saw', f * 0.995, d) + osc('saw', f * 1.005, d) + 0.24 * osc('saw', f * 2.002, d)
    x = lp(sat(x * 0.6, 1.8), cut, 4) + 0.9 * osc('sin', f / 2, d)
    return x * adsr(d, 0.004, 0.1, 0.8, 0.04)[:len(x)]
def pad(ms, d, cut=1800, bright=0.0, att=None):
    x = np.zeros(int(d * SR))
    for m in ms:
        for det in (-0.1, 0.0, 0.1): x += osc('saw', mf(m + det), d) * 0.3 + osc('tri', mf(m + det), d) * 0.25
    x = lp(x, cut + 3000 * bright); a = att if att is not None else min(0.5, d * 0.3)
    return x * env(d, a, r=min(0.8, d * 0.4)) / max(1, len(ms))
def supersaw(ms, d, cut=3500, att=0.01):
    x = np.zeros(int(d * SR))
    for m in ms:
        for det in (-0.2, -0.1, -0.03, 0.03, 0.1, 0.2): x += osc('saw', mf(m + det), d)
    return lp(x, cut) * env(d, att, r=min(0.4, d * 0.5)) / (6 * len(ms))
def bell(m, d=1.4, idx=3.0): return fm(mf(m), d, ratio=3.5, idx=idx, dec=2.6 / d) * 0.8 + fm(mf(m) * 2, d, ratio=1.0, idx=1, dec=4.5) * 0.15
def glass(m, d=0.9): return fm(mf(m), d, ratio=2.76, idx=2.4, dec=3.2 / d) * 0.7 + np.sin(2 * np.pi * mf(m) * 4.02 * tv(d)) * np.exp(-tv(d) * 9) * 0.15
def pluck(m, d=0.22, duty=0.25, cut=5000):
    f = mf(m); x = (osc('sq', f, d, duty) * 0.6 + osc('saw', f, d) * 0.4) * np.exp(-tv(d) * 12); return lp(x, cut)
def lead(m, d, duty=0.5, cut=4500):
    t = tv(d); f = mf(m) * (1 + 0.005 * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.1) * 5, 0, 1))
    x = osc('sq', f, d, duty) * 0.6 + osc('saw', f * 1.003, d) * 0.4
    return lp(x, cut) * adsr(d, 0.006, 0.12, 0.65, 0.06)[:len(t)]
def riser(d, f0=200, f1=4000):
    t = tv(d) / d; return sweep_lp(noise(d), f0, f1, 2) * t ** 2 * 1.3 + osc('saw', sweep(mf(38), mf(62), d), d) * 0.12 * t ** 1.5
def revcym(d): x = crash(d)[::-1]; return x * np.linspace(0.2, 1, len(x)) ** 2
def boom(f0=55, f1=28, d=1.8):
    t = tv(d); return sat(np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-t * 2.2) * 1.4, 1.3)

def wobble(m, d, rate=2.0):
    x = reese(m, d, 3200); t = tv(len(x) / SR); lfo = 0.5 - 0.5 * np.cos(2 * np.pi * rate / BEAT * t)
    return lp(x, 380) * (1 - lfo) + lp(x, 2600) * lfo

# ---------------------------------------------------------------- harmony (one chord per 3-s scene)
CH = {'Fmaj7': (41, [60, 64, 65, 69]), 'Am7': (45, [60, 64, 67, 69]), 'Cmaj7': (36, [59, 60, 64, 67]), 'G6': (43, [59, 62, 64, 67]), 'Dm9': (38, [60, 62, 65, 69])}
LOOP = ['Fmaj7', 'Am7', 'Cmaj7', 'G6']
PROG = [(b, LOOP[(b // 6) % 4]) for b in range(0, 120, 6)]
def chord_at(beat):
    c = PROG[0][1]
    for b, n in PROG:
        if beat >= b - 1e-9: c = n
    return c
def chord_note(t, k, octave=24):
    ms = CH[chord_at(t / BEAT)][1]; return ms[k % len(ms)] + octave + 12 * (k // len(ms))
OPEN = [(0.0, 76, 1.0), (1.0, 81, 1.0), (2.0, 79, 0.5), (2.5, 76, 0.5), (3.0, 72, 1.5), (4.5, 74, 1.5)]   # the opening motif (6 beats)
KICKS = []
def drums(b0, b1, kind, g=1.0):
    for b in np.arange(b0, b1, 1.0):
        t0 = tb(b); ib = int(round(b - b0))
        if kind == 'pulse':                                                 # a soft heartbeat-like pulse: kick on 1 and 4 of each 6
            if ib % 6 in (0, 3): put(MUS, lp(kick(0.75, 0.25), 900), t0, 0.62 * g); KICKS.append(t0)
            put(MUS, hat(), t0 + 0.5 * BEAT, 0.07 * g, 0.4 * np.sin(ib))
        if kind == 'light':
            put(MUS, lp(kick(0.8, 0.3), 1200), t0, 0.62 * g); KICKS.append(t0)
            for s in (1, 3): put(MUS, hat(), t0 + s * S16, 0.06 * g, 0.4 * np.sin(ib + s))
            if ib % 6 == 5: put(MUS, shaker(), t0 + 0.75 * BEAT, 0.08 * g, 0.4)
        if kind == 'tick':
            for s in range(4): put(MUS, hat(), t0 + s * S16, (0.05 if s == 0 else 0.03) * g, 0.4 * np.sin(ib * 4 + s))
def bass(b0, b1, g=1.0):
    for b in np.arange(b0, b1, 1.0):
        root = CH[chord_at(b)][0]; t0 = tb(b)
        if int(round(b)) % 6 in (0, 3): put(PUMP, subbass(root + 12, BEAT * 2.6) * 0.9, t0, g)
def chords(b0, b1, g=1.0, cut=1200, bright=0.0):
    for b in np.arange(b0, b1, 6):
        ms = CH[chord_at(b)][1]; put(PUMP, pad(ms, 6 * BEAT + 0.4, cut, bright), tb(b), g, 0, 0.5)
def arp(b0, b1, step=0.5, g=1.0, octave=24, pattern=(0, 2, 1, 3)):
    for k in range(int(round((b1 - b0) / step))):
        b = b0 + k * step; ms = CH[chord_at(b)][1]; m = ms[pattern[k % len(pattern)] % len(ms)] + octave
        put(MUS, glass(m, 0.55), tb(b), g * (0.8 if k % 4 == 0 else 0.55), np.sin(k * 0.9) * 0.6, 0.5)
def motif(b0, notes, inst='bell', g=1.0, oct=0):
    for r, m, dl in notes:
        if inst == 'bell': put(MUS, bell(m + oct, 1.2 + dl * 0.4, 1.6), tb(b0 + r), g * 0.5, (r / 6 - 0.5) * 0.6, 0.55)
        if inst == 'glass': put(MUS, glass(m + oct + 12, 0.8), tb(b0 + r), g * 0.4, (r / 6 - 0.5) * 0.8, 0.6)
        if inst == 'pluck': put(MUS, pluck(m + oct, 0.35, 0.5, 2400), tb(b0 + r), g * 0.4, (r / 6 - 0.5) * 0.6, 0.4)
HOLDS = []
def hold(a, b): HOLDS.append((a, b))
# ---------------------------------------------------------------- arrangement (beats: a scene = 6 beats)
# S01–S03 (0–18): curiosity and the destination; the reveal chime lands on S03 (beat 12.8)
chords(0, 18, 0.32, 1000); motif(0, OPEN, 'bell', 0.9); drums(6, 18, 'tick', 0.8); bass(6, 18, 0.45); arp(6, 12, 0.5, 0.22)
# S04–S06 (18–36): retention, the bedside, the kidneys — a light pulse, the pad opens a little
chords(18, 36, 0.32, 1300, 0.1); drums(18, 36, 'pulse', 0.9); bass(18, 36, 0.5); arp(24, 36, 0.5, 0.2, pattern=(0, 1, 2, 3))
# S07–S11 (36–66): the second question (beat 37), into the catheter, two channels (a gentle lift at beat 60)
chords(36, 66, 0.3, 1400, 0.15); drums(36, 60, 'light', 0.85); bass(36, 66, 0.55); arp(42, 60, 0.25, 0.18, pattern=(0, 2, 1, 3, 2, 1))
motif(42, OPEN[:2], 'glass', 0.6); hold(tb(59.5), tb(60)); drums(60, 66, 'light', 0.95); put(MUS, riser(tb(2), 300, 5000), tb(57.5), 0.2)
# S12–S16 (66–96): ports, tubing, the bag — steady, then the completion tone on S16 (beat 94)
chords(66, 96, 0.32, 1500, 0.2); drums(66, 92, 'light', 0.8); bass(66, 96, 0.55); arp(66, 90, 0.5, 0.2)
motif(84, OPEN[2:], 'pluck', 0.7); drums(92, 96, 'tick', 0.7)
# S17–S20 (96–120): recap, the answer (the opening motif returns at beat 108), the loop bridge into beat 0
chords(96, 120, 0.34, 1200, 0.1); drums(96, 114, 'pulse', 0.8); bass(96, 120, 0.5); motif(108, OPEN, 'bell', 0.95); arp(114, 119.5, 0.25, 0.16)
put(MUS, revcym(BEAT * 1.0), tb(119), 0.25)
for a_, b_ in HOLDS:
    for bus in (MUS, PUMP): bus[:, int(a_ * SR):int(b_ * SR)] *= 0.0
g = np.ones(N)
for tk in KICKS:
    s = int(tk * SR); L = min(int(0.25 * SR), N - s)
    if L > 0: g[s:s + L] = np.minimum(g[s:s + L], 1 - 0.35 * np.exp(-np.arange(L) / SR / 0.08))
MUS += PUMP * g
# keep the voice band thin in the music: a gentle dip round 300 Hz – 3 kHz
for i in range(2): MUS[i] = MUS[i] - 0.35 * bp(MUS[i], 300, 3000)

# ---------------------------------------------------------------- sound effects (quiet, in key)
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def whoosh(d, up=True, f0=300, f1=4000):
    t = tv(d) / d; return sweep_lp(noise(d), f0 if up else f1, f1 if up else f0, 2) * np.sin(np.pi * t) ** 1.5
def blipn(m, d=0.12): return S(fm(mf(m), d, 2.0, 1.0, 14) * 0.8, tick(mf(m) * 2, 0.01) * 0.25)
def chime(ms, d=1.2, spread=0.04, inst=bell):
    x = np.zeros(int((d + spread * len(ms) + 0.2) * SR))
    for i, m in enumerate(ms): ins(x, inst(m, d) * (0.5 - 0.05 * i), i * spread * SR)
    return x
def flow(d, f0=400, f1=1400, a=0.3): t = tv(d); return bp(noise(d), f0, f1) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.8 * t)) * env(d, min(0.5, d * 0.3), r=min(0.6, d * 0.3)) * a
BEDS = {'flow_bed', 'hold_pad', 'track', 'orbit'}
SNAP = {'type', 'tag', 'id_click', 'curve_tick', 'drip', 'drop', 'ring', 'measure', 'arrive', 'loop_tick', 'settle'}
DURS = {'open_pull', 'glide', 'whoosh_out', 'flow_bed', 'push_soft', 'orbit', 'flow_in', 'track', 'trace_cyan', 'sweep_out', 'level_line', 'trace_amber', 'pull_soft', 'hold_pad', 'push_fast'}
def make(name, a, t):
    d = a if isinstance(a, (int, float)) and name in DURS and a else None
    k = int(a) if isinstance(a, (int, float)) else 0
    if name == 'type':
        x = np.zeros(int(0.4 * SR))
        for i in range(4): ins(x, tick(rng.uniform(3200, 4400), 0.008) * 0.4, i * 0.06 * SR)
        return x, 0.1
    if name == 'tag': return S(blipn(chord_note(t, 2, 24), 0.1) * 0.6, tick(4200, 0.01) * 0.25), 0.35
    if name == 'id_click': return S(blipn(chord_note(t, k + 1, 24), 0.08) * 0.6, tick(3600, 0.01) * 0.4), 0.3
    if name in ('curious', 'curious2'):
        m = [76, 81][k % 2] if name == 'curious' else 81
        x = S(bell(m, 1.3, 1.5) * 0.6, glass(m + 12, 0.9) * 0.2)
        if name == 'curious2': ins(x, bell(84, 1.0, 1.4) * 0.45, 0.25 * SR)
        return x, 0.7
    if name == 'reveal_chime': return chime([81, 84, 88, 91], 1.6, 0.05) * 0.9, 0.7
    if name == 'complete': return S(chime([72, 76, 79, 84], 1.4, 0.06, glass), bell(84, 1.6, 1.2) * 0.3), 0.7
    if name == 'complete_soft': return chime([chord_note(t, i, 24) for i in range(3)], 1.0, 0.06, glass) * 0.7, 0.6
    if name == 'arrive': return S(blipn(chord_note(t, 0, 24), 0.18), lp(kick(0.4, 0.1), 500) * 0.3), 0.4
    if name == 'curve_tick': return blipn(chord_note(t, 1, 24), 0.08) * 0.5, 0.3
    if name == 'measure': return S(tick(2800 + 400 * k, 0.015) * 0.5, glass(chord_note(t, k + 1, 24), 0.5) * 0.4), 0.4
    if name == 'ring': return np.sin(phase(sweep(mf(chord_note(t, 0, 24)), mf(chord_note(t, 2, 24)), 0.4), 0.4)) * env(0.4, 0.02, r=0.25) * 0.4, 0.5
    if name in ('open_pull', 'pull_soft', 'whoosh_out'): dd = d or 0.8; return whoosh(dd, False, 300, 5000) * 0.6, 0.4
    if name in ('push_soft', 'push_fast'): dd = d or 0.8; return whoosh(dd, True, 250, 6000) * (0.7 if name == 'push_fast' else 0.45), 0.4
    if name in ('glide', 'track', 'orbit', 'sweep_out'): dd = d or 2.0; return whoosh(dd, True, 400, 2500) * 0.3, 0.4
    if name == 'cut_soft': return S(tick(1800, 0.02) * 0.3, whoosh(0.25, True, 800, 4000) * 0.3), 0.3
    if name == 'settle': return lp(kick(0.4, 0.1), 400) * 0.4, 0.2
    if name in ('flow_bed', 'flow_in'): dd = d or 2.5; return flow(dd), 0.4
    if name in ('drip', 'drop'): m = chord_note(t, k % 3, 24); return S(np.sin(phase(sweep(mf(m + 12), mf(m), 0.12), 0.12)) * np.exp(-tv(0.12) * 22) * 0.5, tick(5000, 0.005) * 0.2), 0.5
    if name == 'return_soft': return whoosh(0.5, False, 500, 4000) * 0.4, 0.4
    if name == 'section_open': return S(whoosh(0.4, True, 600, 5000) * 0.4, tick(2400, 0.015) * 0.3), 0.3
    if name in ('trace_cyan', 'trace_amber'): dd = d or 2.0; m0 = chord_note(t, 0, 12); return np.sin(phase(sweep(mf(m0), mf(m0 + 12), dd), dd)) * env(dd, 0.1, r=0.3) * 0.25, 0.5
    if name == 'level_line': dd = d or 0.7; return S(np.sin(phase(sweep(mf(chord_note(t, 1, 24)), mf(chord_note(t, 1, 24)), dd), dd)) * env(dd, 0.05, r=0.3) * 0.3, tick(3000, 0.01) * 0.3), 0.4
    if name == 'hold_pad': dd = d or 2.2; ms = CH[chord_at(t / BEAT)][1]; return pad([m + 12 for m in ms], dd, 1500, 0.2) * 0.5, 0.6
    if name == 'loop_tick': return S(bell(76, 0.9, 1.2) * 0.4, tick(3000, 0.01) * 0.2), 0.5
    raise KeyError(name)
missing = set(); stamp = {}
GAIN = {'type': 0.4, 'tag': 0.7, 'flow_bed': 0.6, 'flow_in': 0.6, 'hold_pad': 0.6, 'reveal_chime': 1.0, 'complete': 1.0, 'curious': 0.9, 'curious2': 0.9,
        'trace_cyan': 0.45, 'trace_amber': 0.45, 'glide': 0.7, 'track': 0.6, 'orbit': 0.6, 'sweep_out': 0.6}
TEXT_SFX = {'type', 'tag'}
for cu in cuesheet['cues']:
    nm = cu['sfx']
    if NOTEXT and nm in TEXT_SFX: continue
    t = cu['t']
    if nm in SNAP:
        q = round(t / S16) * S16
        if abs(q - t) <= 0.045: t = q
    key = (nm, round(t / S16))
    if key in stamp: continue
    stamp[key] = 1
    try: sig, rv = make(nm, cu.get('arg'), t)
    except KeyError: missing.add(nm); continue
    sig = sig / (np.max(np.abs(sig)) + 1e-9)
    bed = 0.45 if nm in BEDS else 1.0
    put(SFX, sig, t, 0.5 * cu.get('g', 1) * bed * GAIN.get(nm, 1.0), cu.get('pan', 0), rv)
if missing: print('no generator for:', sorted(missing))
# ---------------------------------------------------------------- mix and stems
def reverb_ir(d=2.0, seed=9):
    r = np.random.default_rng(seed); t = tv(d)
    return [lp(r.standard_normal(len(t)), 6000) * np.exp(-t * 3.2) * 0.03 for _ in range(2)]
ir = reverb_ir()
wet = np.stack([ss.fftconvolve(VERB[i] + 0.25 * MUS[i], ir[i])[:N] for i in range(2)])
music = 0.75 * MUS + 0.55 * wet; sfx = 2.0 * SFX + 0.15 * wet
def fold(x):                                                # the tail past 60 s folds onto the start: the file loops without a click
    tail = x[:, int(TOTAL * SR):int(TOTAL * SR) + SR]; y = x[:, :int(TOTAL * SR)].copy(); y[:, :tail.shape[1]] += tail; return y
music, sfx = fold(np.stack([hp(music[i], 30) for i in range(2)])), fold(np.stack([hp(sfx[i], 30) for i in range(2)]))
def kweight(x):
    hi = ss.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x)
    return ss.lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], hi)
def lufs(st):
    k = [kweight(ch) for ch in st]; blk = int(0.4 * SR); hop = int(0.1 * SR)
    ms = np.array([sum(np.mean(kc[i:i + blk] ** 2) for kc in k) for i in range(0, len(k[0]) - blk, hop)])
    ld = -0.691 + 10 * np.log10(ms + 1e-12); g_ = ms[ld > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g_)) - 10; g2 = ms[(ld > -70) & (ld > rel)]
    return -0.691 + 10 * np.log10(np.mean(g2))
mix = music + sfx
TARGET = -16.0                                              # a bed for a later voice-over: quieter than a finished short
gain = 10 ** ((TARGET - lufs(mix)) / 20)
mix, music, sfx = mix * gain, music * gain, sfx * gain
pk = np.max(np.abs(ss.resample_poly(mix, 4, 1, axis=1)))
if pk > 10 ** (-1.0 / 20): sc = 10 ** (-1.0 / 20) / pk; mix, music, sfx = mix * sc, music * sc, sfx * sc
suf = '_notext' if NOTEXT else ''
for name, x in (('music', music), ('sfx', sfx), ('mix', mix)): sf.write(OUT / f'{name}{suf}.wav', x.T.astype(np.float32), SR, subtype='PCM_24')
print(f'mix {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS, {mix.shape[1] / SR:.2f} s; stems -> {OUT}/music{suf}.wav, sfx{suf}.wav, mix{suf}.wav')
