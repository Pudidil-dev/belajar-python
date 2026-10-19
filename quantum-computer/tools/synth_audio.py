#!/usr/bin/env python3
"""Score + sound design for "How Quantum Computers Work" — pure code synthesis, no samples.

  uv run --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json build/score.wav

120 BPM, E minor, 240 beats = exactly 120 s. Every scene boundary of the brief falls on a beat, and each section counts
its bars from its own first beat, so the arrangement follows the picture: a cold lab intro with the pulse-tube cooler
and the dive → a minimal groove for the classical bit, opening up at the qubit → a frozen breakdown down the cooling
stages and a build into the chip → a crystalline groove in the superconductor → a half-time, wobbling tunnelling
section → the transmon's levels and a long build with the pulse → DROP 1 on the Hadamard (superposition) → a lighter
interference groove → DROP 2 on entanglement → a filtered data groove for measurement → tension and syndrome ticks for
error correction → a riser into one last impact and an E-major resolution. One hook (3-3-2 rhythm) returns on lead,
bells, glass and plucks. Sound effects come from the cue sheet the renderer exports (tools/render.py --cues).
"""
import json, sys
import numpy as np
import scipy.signal as ss
import soundfile as sf

SR = 48000
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4
cuesheet = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
TOTAL = cuesheet['total']
N = int(TOTAL * SR) + 2 * SR
MUS = np.zeros((2, N)); PUMP = np.zeros((2, N)); SFX = np.zeros((2, N)); VERB = np.zeros((2, N))
rng = np.random.default_rng(1911)                         # Onnes finds superconductivity
def tb(beat): return beat * BEAT

# ---------------------------------------------------------------- helpers
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

# ---------------------------------------------------------------- harmony (E minor)
CH = {'Em': (40, [55, 59, 64, 67]), 'C': (36, [55, 60, 64, 67]), 'G': (43, [55, 59, 62, 67]), 'D': (38, [57, 62, 66, 69]),
      'Am': (33, [57, 60, 64, 69]), 'B': (35, [54, 59, 63, 66]), 'E': (40, [56, 59, 64, 68])}
PROG = [(0, 'Em'), (8, 'C'), (14, 'Em'), (18, 'C'), (22, 'G'), (26, 'D'), (30, 'Em'),
        (34, 'Em'), (38, 'C'), (42, 'Am'), (46, 'B'), (52, 'Em'), (56, 'C'),                                     # S03
        (60, 'G'), (64, 'D'), (66, 'Em'), (70, 'C'), (74, 'Am'), (78, 'B'), (80, 'Em'), (84, 'C'),                # S04
        (88, 'Em'), (92, 'C'), (96, 'G'), (100, 'D'), (104, 'Am'), (106, 'B'),                                    # S05
        (110, 'Em'), (114, 'C'), (118, 'G'), (122, 'D'), (126, 'Em'), (130, 'C'), (134, 'G'), (138, 'D'),         # S06 drop 1
        (140, 'Em'), (144, 'C'), (148, 'G'), (152, 'D'), (156, 'Em'), (160, 'C'), (164, 'B'),                     # S07
        (168, 'Em'), (172, 'C'), (176, 'G'), (180, 'D'), (184, 'Em'), (188, 'C'), (192, 'G'), (196, 'D'),         # S08 drop 2
        (198, 'Em'), (202, 'C'), (206, 'Am'), (210, 'Em'), (214, 'C'),                                            # S09
        (218, 'Am'), (222, 'B'), (224, 'Em'), (228, 'C'), (232, 'Am'), (234, 'B'), (238, 'E')]                    # S10–S11
def chord_at(beat):
    c = PROG[0][1]
    for b, n in PROG:
        if beat >= b - 1e-9: c = n
    return c
HOOK_R = [0, 0.75, 1.5, 2.0, 2.75, 3.5]                           # 3-3-2 rhythm (beats)
HOOK = {'Em': [76, 71, 67, 76, 74, 71], 'C': [76, 72, 67, 76, 74, 72], 'G': [74, 71, 67, 74, 76, 74], 'D': [74, 69, 66, 74, 76, 78],
        'Am': [76, 72, 69, 76, 74, 72], 'B': [75, 71, 66, 75, 78, 75], 'E': [76, 71, 68, 80, 76, 71]}
PENT = [64, 67, 69, 71, 74, 76, 79, 81, 83, 86, 88, 91]          # E minor pentatonic
KICKS = []

# o = the first beat of the section's bar grid (sections follow the picture, not a fixed bar line)
def drums(b0, b1, kind, g=1.0, o=None):
    o = b0 if o is None else o
    for b in np.arange(b0, b1, 1.0):
        t0 = tb(b); ib = int(round(b - o))
        if kind in ('four', 'drive'):
            put(MUS, kick(1.0), t0, 0.95 * g); KICKS.append(t0)
            if ib % 2 == 1: put(MUS, clap(), t0, 0.5 * g, 0, 0.25)
            for s in range(4): put(MUS, hat(), t0 + s * S16, (0.2 if s % 2 else 0.11) * g, 0.35 if s == 2 else -0.2)
            put(MUS, hat(True), t0 + 0.5 * BEAT, 0.15 * g, 0.3)
            if kind == 'drive' and ib % 4 == 3: put(MUS, kick(0.5, 0.4), t0 + 3 * S16, 0.45 * g); KICKS.append(t0 + 3 * S16)
        if kind == 'light':
            put(MUS, kick(0.8, 0.5), t0, 0.7 * g); KICKS.append(t0)
            for s in range(4): put(MUS, hat(), t0 + s * S16, (0.13 if s % 2 else 0.07) * g, 0.4 * np.sin(ib + s))
            if ib % 4 == 3: put(MUS, shaker(), t0 + 0.75 * BEAT, 0.14 * g, 0.4)
        if kind == 'half':
            if ib % 4 == 0: put(MUS, kick(1.0), t0, 0.9 * g); KICKS.append(t0)
            if ib % 4 == 2: put(MUS, snare(), t0, 0.5 * g, 0, 0.5); put(MUS, clap(), t0, 0.25 * g, 0, 0.5)
            for s in (0, 2): put(MUS, hat(), t0 + s * S16, 0.12 * g, (s - 1) * 0.4)
        if kind == 'soft':
            if ib % 2 == 0: put(MUS, kick(0.7, 0.3), t0, 0.55 * g); KICKS.append(t0)
            put(MUS, hat(), t0 + 0.5 * BEAT, 0.1 * g, 0.4)
            for s in range(4):
                if (ib * 4 + s) % 3 == 1: put(MUS, shaker(), t0 + s * S16, 0.1 * g, 0.5)
        if kind == 'tick':
            for s in range(4): put(MUS, hat(), t0 + s * S16, (0.09 if s == 0 else 0.05) * g, 0.4 * np.sin(ib * 4 + s))
        if kind == 'groove':
            put(MUS, kick(0.95), t0, 0.85 * g); KICKS.append(t0)
            if ib % 2 == 1: put(MUS, snare(0.8), t0, 0.32 * g, 0, 0.4)
            for s in range(4):
                if s != 0: put(MUS, shaker(), t0 + s * S16, (0.12 if s == 2 else 0.07) * g, (s - 2) * 0.3)
def bass(b0, b1, kind, g=1.0, cut=None):
    for b in np.arange(b0, b1, 0.5):
        root = CH[chord_at(b)][0]; t0 = tb(b); half = int(round(b * 2)) % 2
        if kind == 'drone' and half == 0 and int(round(b)) % 2 == 0: put(PUMP, subbass(root + 12, BEAT * 2) * 0.9, t0, g)
        if kind == 'pulse8': put(PUMP, pulsebass(root + 12 + (12 if int(round(b * 2)) % 8 == 7 else 0), BEAT / 2 * 0.9, cut or 900), t0, g)
        if kind == 'reese': put(PUMP, reese(root + 12 + (12 if int(round(b * 2)) % 8 in (3, 7) else 0), BEAT / 2 * 0.92, cut or 1500), t0, g)
        if kind == 'offbeat' and half == 1: put(PUMP, pulsebass(root + 12, BEAT * 0.42, cut or 1300), t0, g)
        if kind == 'offbeat' and half == 0: put(PUMP, subbass(root + 12, BEAT * 0.45), t0, 0.7 * g)
        if kind == 'wobble' and half == 0: put(PUMP, wobble(root + 12, BEAT * 0.98), t0, g)
def chords(b0, b1, kind, g=1.0, cut=2200, bright=0.0):
    seg = []; b = b0
    while b < b1 - 1e-9:
        c = chord_at(b); nb = min([x for x, _ in PROG if x > b + 1e-9] + [b1]); nb = min(nb, b1); seg.append((b, nb, c)); b = nb
    for s0, s1, c in seg:
        ms = CH[c][1]; t0 = tb(s0); d = tb(s1) - t0
        if kind == 'pad': put(PUMP, pad(ms, d + 0.3, cut, bright), t0, g, 0, 0.5)
        if kind == 'stabs':
            for k in np.arange(0, s1 - s0, 1.0): put(PUMP, supersaw(ms, BEAT * 0.45, 4200), t0 + (k + 0.5) * BEAT, g * 1.1, ((int(k) % 2) - 0.5) * 0.4, 0.3)
            put(PUMP, supersaw(ms, d, 2600, 0.03), t0, g * 0.6, 0, 0.3)
        if kind == 'swell': put(PUMP, supersaw(ms, d, cut, att=d * 0.8), t0, g, 0, 0.4)
def arp(b0, b1, step=0.25, g=1.0, cut=4000, octave=12, inst='pluck', pattern=(0, 1, 2, 3, 2, 1)):
    n = int(round((b1 - b0) / step))
    for k in range(n):
        b = b0 + k * step; ms = CH[chord_at(b)][1]; m = ms[pattern[k % len(pattern)] % len(ms)] + octave
        pan = np.sin(2 * np.pi * k / 16) * 0.7
        if inst == 'pluck': put(MUS, pluck(m, max(0.08, step * BEAT * 1.6), 0.25, cut), tb(b), g * (0.9 if k % 4 == 0 else 0.65), pan, 0.25)
        else: put(MUS, glass(m + 12, 0.6), tb(b), g * (0.8 if k % 4 == 0 else 0.55), pan, 0.5)
def hook(b0, inst='lead', g=1.0, oct=0):
    notes = HOOK[chord_at(b0)]
    for r, m in zip(HOOK_R, notes):
        d = (0.75 if r in (0, 2.0) else 0.5) * BEAT * (1.4 if r == 3.5 else 1); t0 = tb(b0 + r)
        if inst == 'lead': put(MUS, lead(m + oct, d), t0, g * 0.55, 0.1, 0.3); put(MUS, lead(m + oct + 12, d, 0.25, 6000), t0, g * 0.16, -0.2, 0.3)
        if inst == 'bell': put(MUS, bell(m + oct, 1.2), t0, g * 0.45, (r / 4 - 0.5) * 0.8, 0.5)
        if inst == 'glass': put(MUS, glass(m + oct + 12, 0.8), t0, g * 0.35, (r / 4 - 0.5) * 0.9, 0.6)
        if inst == 'pluck': put(MUS, pluck(m + oct, 0.3, 0.5, 3000), t0, g * 0.5, (r / 4 - 0.5) * 0.6, 0.3)
def roll(b0, b1, g0=0.16, g1=0.5):
    n = int(round((b1 - b0) * 4)); half = n // 2
    for k in range(n + half):
        tt = tb(b0) + (k * S16 if k < half else half * S16 + (k - half) * S16 / 2)
        if tt >= tb(b1): break
        put(MUS, snare(0.85), tt, g0 + (g1 - g0) * k / (n + half), (k % 2 - 0.5) * 0.3)

# ---------------------------------------------------------------- arrangement (beats; 2 beats = 1 s)
# S01 lab (0–14): cold pad, machinery pulse, ticking; the dive gets a beat, a riser and a tom fill into the chip
chords(0, 14, 'pad', 0.3, cut=650); bass(0, 14, 'drone', 0.32); drums(0, 7, 'tick', 0.7)
drums(7, 14, 'light', 0.55, 7); put(MUS, riser(tb(7), 200, 7000), tb(7), 0.5)
for k, f in enumerate((180, 160, 140, 120)): put(MUS, tom(f), tb(13) + k * S16, 0.45, (k - 1.5) * 0.3)
# S02 classical vs quantum (14–34): minimal groove; at the qubit (22) the harmony opens; bells and glass on the sphere
drums(14, 34, 'soft', 0.85); bass(14, 22, 'pulse8', 0.55, cut=450); bass(22, 34, 'pulse8', 0.65, cut=900)
chords(14, 22, 'pad', 0.3, cut=900); chords(22, 34, 'pad', 0.4, cut=1800, bright=0.2)
hook(28, 'bell', 0.55); arp(28, 34, 0.25, 0.3, inst='glass')
# S03 superconductivity (34–60): frozen breakdown down the stages, a build into the chip, a crystalline groove
chords(34, 44, 'pad', 0.45, cut=700); bass(34, 44, 'drone', 0.45); drums(34, 42, 'tick', 0.7)
drums(42, 52, 'four', 0.72); bass(44, 52, 'pulse8', 0.6, cut=700); chords(44, 52, 'swell', 0.3, cut=2200); arp(46, 52, 0.25, 0.32, 3500)
put(MUS, riser(tb(8), 250, 7000), tb(44), 0.45)
drums(52, 60, 'groove', 0.85); bass(52, 60, 'offbeat', 0.7); chords(52, 60, 'pad', 0.38, cut=2400, bright=0.3); arp(52, 60, 0.25, 0.35, inst='glass')
# S04 tunnelling (60–88): the glide on the groove, then half time with a wobbling bass, then a pluck hook
drums(60, 66, 'groove', 0.85, 52); bass(60, 66, 'offbeat', 0.7); chords(60, 66, 'pad', 0.35, cut=2000)
drums(66, 80, 'half', 0.9); bass(66, 80, 'wobble', 0.62); chords(66, 80, 'pad', 0.42, cut=1200, bright=0.1)
hook(70, 'glass', 0.5); hook(74, 'glass', 0.5)
drums(80, 88, 'light', 0.9); bass(80, 88, 'pulse8', 0.65, cut=1000); chords(80, 88, 'pad', 0.38, cut=1800); hook(80, 'pluck', 0.7); hook(84, 'pluck', 0.7)
# S05 quantum states (88–110): levels climb on glass, then the long build with the pulse; a held breath before drop 1
chords(88, 98, 'pad', 0.42, cut=1600, bright=0.2); bass(88, 98, 'drone', 0.5); drums(88, 98, 'soft', 0.8)
arp(92, 98, 0.5, 0.3, inst='glass', pattern=(0, 1, 2, 3))
drums(98, 109.5, 'four', 0.9); bass(98, 110, 'pulse8', 0.75, cut=900); chords(98, 110, 'swell', 0.4, cut=3000)
arp(98, 104, 0.25, 0.36, 4000); arp(104, 109.5, 0.125, 0.4, 6000)
put(MUS, riser(tb(10), 250, 8000), tb(99.5), 0.6); roll(106, 109.5); put(MUS, revcym(BEAT * 0.5), tb(109.5), 0.5)
# S06 superposition (110–140): DROP 1, then a coherent, glassy plateau with the hook on bells
drums(110, 126, 'four', 1.0); bass(110, 126, 'reese', 0.85); chords(110, 126, 'stabs', 0.5)
for b in (110, 114, 118, 122): hook(b, 'lead', 1.0)
put(MUS, crash(), tb(110), 0.6, 0, 0.4)
drums(126, 140, 'light', 0.95); bass(126, 140, 'offbeat', 0.75); chords(126, 140, 'pad', 0.42, cut=2600, bright=0.3)
arp(126, 140, 0.25, 0.33, inst='glass'); hook(130, 'bell', 0.55); hook(134, 'bell', 0.55)
# S07 interference (140–168): groove with plucks, drive with bells on the second H, build; a held breath before drop 2
drums(140, 150, 'groove', 0.9); bass(140, 150, 'offbeat', 0.75); chords(140, 150, 'pad', 0.38, cut=2000); hook(140, 'pluck', 0.7); hook(144, 'pluck', 0.7)
drums(150, 160, 'drive', 0.9); bass(150, 160, 'pulse8', 0.75, cut=1300); chords(150, 160, 'swell', 0.32, cut=2800); arp(150, 160, 0.25, 0.36, 4200)
hook(152, 'bell', 0.5); hook(156, 'bell', 0.5)
drums(160, 167.5, 'four', 0.95); bass(160, 168, 'pulse8', 0.8, cut=900); chords(160, 168, 'swell', 0.45, cut=3600)
arp(160, 164, 0.25, 0.38, 5000); arp(164, 167.5, 0.125, 0.42, 7000)
put(MUS, riser(tb(8), 250, 9000), tb(160), 0.62); roll(164, 167.5, 0.16, 0.55); put(MUS, revcym(BEAT * 0.5), tb(167.5), 0.55)
# S08 entanglement (168–198): DROP 2 — bigger: drive, wide reese, stabs, the hook doubled on bells; a filter-down exit
drums(168, 196, 'drive', 1.05); bass(168, 196, 'reese', 0.9, cut=1900); chords(168, 196, 'stabs', 0.55)
for b in (168, 172, 176, 180, 184, 188, 192): hook(b, 'lead', 1.05)
for b in (176, 180, 188, 192): hook(b, 'bell', 0.4, 12)
put(MUS, crash(), tb(168), 0.65, 0, 0.4); put(MUS, crash(1.8), tb(184), 0.4, 0, 0.4)
drums(196, 198, 'tick', 1.0); chords(196, 198, 'pad', 0.45, cut=900)
# S09 measurement (198–218): filtered readout, the climb, then a data groove for the repeated runs
drums(198, 204, 'tick', 1.0); bass(198, 204, 'pulse8', 0.5, cut=500); chords(198, 204, 'pad', 0.4, cut=1200)
drums(204, 210, 'four', 0.85); bass(204, 210, 'pulse8', 0.7, cut=1100); put(MUS, riser(tb(6), 300, 6000), tb(204), 0.4)
drums(210, 218, 'groove', 0.95); bass(210, 218, 'offbeat', 0.8); chords(210, 218, 'pad', 0.4, cut=2200); arp(210, 218, 0.25, 0.35, 5000)
# S10 error correction (218–232): noise and tension, then the syndrome cycles on a steady four
drums(218, 224, 'half', 0.85); bass(218, 224, 'wobble', 0.55); chords(218, 224, 'pad', 0.45, cut=900)
drums(224, 232, 'four', 0.95); bass(224, 232, 'pulse8', 0.8, cut=1200); chords(224, 232, 'swell', 0.38, cut=3000); arp(224, 232, 0.25, 0.38, 4500)
hook(228, 'pluck', 0.6)
# S11 the whole chain (232–240): riser into one impact, then E major, struck and left to ring
drums(232, 237.5, 'four', 0.9); bass(232, 238, 'pulse8', 0.8, cut=1400); chords(232, 238, 'swell', 0.45, cut=4000)
put(MUS, riser(tb(5.5), 250, 9000), tb(232.5), 0.6); roll(236, 237.75, 0.2, 0.5)
ring_ = lambda x: x * np.exp(-tv(len(x) / SR) * 1.2)
A_END = tb(238)
put(MUS, ring_(supersaw(CH['E'][1] + [76, 80], 2.6, 5200, 0.005)), A_END, 0.9, 0, 0.5)
put(MUS, ring_(pad([52, 59, 64, 68, 71], 2.6, 2500, 0.6, att=0.02)), A_END, 0.8, 0, 0.6)
put(MUS, ring_(subbass(40, 2.4)), A_END, 0.9); put(MUS, boom(58, 30, 2.0), A_END, 0.8); put(MUS, crash(2.4), A_END, 0.55, 0, 0.5)

# held breaths before the drops and the last hit
for a_, b_ in ((tb(109.5) + 0.02, tb(110)), (tb(167.5) + 0.02, tb(168)), (tb(237.75) + 0.02, tb(238))):
    for bus in (MUS, PUMP): bus[:, int(a_ * SR):int(b_ * SR)] *= 0.0
# sidechain pump under every kick
g = np.ones(N)
for tk in KICKS:
    s = int(tk * SR); L = min(int(0.28 * SR), N - s)
    if L > 0: g[s:s + L] = np.minimum(g[s:s + L], 1 - 0.6 * np.exp(-np.arange(L) / SR / 0.075))
MUS += PUMP * g
# the S08 exit filters down into the measurement (97.5–99 s)
a_, b_ = int(97.6 * SR), int(99.0 * SR)
for i in range(2): MUS[i, a_:b_] = sweep_lp(MUS[i, a_:b_], 9000, 600, 2, 48)

# ---------------------------------------------------------------- sound effects (from the cue sheet)
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def whoosh(d, up=True, f0=300, f1=4000):
    t = tv(d) / d; return sweep_lp(noise(d), f0 if up else f1, f1 if up else f0, 2) * np.sin(np.pi * t) ** 1.5
def crackle(d, rate=120, lo=1500, hi=9000):
    x = np.zeros(int(d * SR) + 2000)
    for _ in range(int(d * rate)): ins(x, bp(noise(0.006), lo, hi) * np.exp(-tv(0.006) * 500) * rng.uniform(0.2, 1), rng.uniform(0, d) * SR)
    return x
def hum(d, f0=73.4, am=0.0):
    t = tv(d); x = sum(np.sin(2 * np.pi * f0 * k * t) / k ** 1.3 for k in range(1, 7))
    return x * (1 + am * np.sin(2 * np.pi * 8 * t)) * env(d, min(0.5, d * 0.2), r=min(0.6, d * 0.3))
def zip_(f0=2000, f1=9000, d=0.06): return np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-tv(d) * 40)
def blipn(m, d=0.12): return S(fm(mf(m), d, 2.0, 1.2, 14) * 0.8, tick(mf(m) * 2, 0.01) * 0.3)
def crush(x, bits=5, hold=6):                                       # digital grit: fewer levels, sample-and-hold
    y = np.round(x * (2 ** (bits - 1))) / (2 ** (bits - 1)); return np.repeat(y[::hold], hold)[:len(x)]
DURS = {'ambience', 'pulse_tube', 'dive', 'rot', 'cold_amb', 'push', 'flow', 'glide', 'wave', 'pull', 'riser', 'phase', 'orbit',
        'paths', 'entangle', 'readout', 'climb', 'roll', 'noise'}
BEDS = {'ambience', 'pulse_tube', 'cold_amb', 'noise', 'flow'}
blip_i = [0]
def make(name, a):
    d = a if isinstance(a, (int, float)) and name in DURS and a else None
    if name == 'ambience':
        dd = d or 7; x = hum(dd, 50, 0.03) * 0.22 + lp(noise(dd), 500) * env(dd, 0.5, r=0.8) * 0.3
        for k in range(int(dd / 1.6)): ins(x, blipn(PENT[(k * 5) % 6 + 5] + 12, 0.08) * 0.08, (0.4 + k * 1.6) * SR)
        return x, 0.3
    if name == 'pulse_tube':
        dd = d or 3.5; x = np.zeros(int((dd + 0.5) * SR))
        for k in range(int(dd * 1.4) + 1):
            c = bp(noise(0.4), 180, 1400) * env(0.4, 0.06, r=0.3) * 0.7; ins(c, np.sin(phase(sweep(90, 50, 0.2), 0.2)) * np.exp(-tv(0.2) * 16) * 0.5, 0)
            ins(x, c, k / 1.4 * SR)
        return x, 0.2
    if name == 'type':
        x = np.zeros(int(0.4 * SR))
        for k in range(6): ins(x, tick(rng.uniform(2800, 4200), 0.012) * 0.6, k * 0.05 * SR)
        return x, 0.1
    if name == 'blip': blip_i[0] += 1; return blipn(PENT[(blip_i[0] * 3) % 8 + 3]), 0.4
    if name == 'dive':
        dd = d or 3.5; x = whoosh(dd, True, 200, 9000) * 1.1; x += osc('saw', sweep(80, 900, dd), dd) * (tv(dd) / dd) ** 2 * 0.15; return x, 0.4
    if name == 'reveal':
        x = np.zeros(int(2.0 * SR))
        for i, m in enumerate((76, 83, 88)): ins(x, bell(m, 1.6, 2.2) * 0.45, i * 0.06 * SR)
        ins(x, boom(70, 40, 0.8) * 0.4, 0); return x, 0.7
    if name == 'stage_pass': k = int(a or 0); return S(whoosh(0.3, False, 600, 5000) * 0.6, glass(PENT[9 - k] + 12, 0.5) * 0.4), 0.4
    if name == 'whoosh': return whoosh(0.5, True, 400, 6000), 0.3
    if name == 'swish': return whoosh(0.45, False, 500, 6000), 0.3
    if name == 'click':
        bit = int(a or 0); f = 2600 if bit else 1500
        return S(tick(f, 0.012), crush(osc('sq', f / 2, 0.03) * np.exp(-tv(0.03) * 90), 3, 4) * 0.35, np.sin(phase(sweep(160, 70, 0.08), 0.08)) * np.exp(-tv(0.08) * 30) * 0.6), 0.15
    if name == 'level': n = int(a or 0); return S(glass(PENT[4 + 2 * n] + 12, 0.9) * 0.8, blipn(PENT[4 + 2 * n], 0.1) * 0.3), 0.6
    if name == 'pop': return np.sin(phase(sweep(500, 1400, 0.09), 0.09)) * np.exp(-tv(0.09) * 25), 0.3
    if name == 'rot':
        dd = d or 3.0; t = tv(dd); f = mf(76) * (1.5 ** (np.clip(t / dd, 0, 1) ** 0.8)) * (1 + 0.006 * np.sin(2 * np.pi * 5 * t))
        x = np.sin(phase(f, dd)) * 0.5 + np.sin(phase(f * 2.01, dd)) * 0.15 + np.sin(phase(f * 0.5, dd)) * 0.25
        return x * env(dd, 0.15, r=min(0.6, dd * 0.3)), 0.6
    if name == 'cold_amb':
        dd = d or 13; t = tv(dd); x = np.sin(phase(mf(28) * (1 + 0.002 * np.sin(2 * np.pi * 0.3 * t)), dd)) * 0.5
        x += sweep_lp(noise(dd), 2400, 300, 2, 64) * 0.25
        for k in range(int(dd * 2.5)): ins(x, glass(rng.choice(PENT[6:]) + 12, 0.6) * rng.uniform(0.03, 0.09), rng.uniform(0, dd) * SR)
        return x * env(dd, 1.0, r=1.5), 0.6
    if name == 'stage': i = int(a or 0); return S(glass(PENT[11 - i] + 12, 1.2) * 0.8, zip_(6000, 1500, 0.08) * 0.25, tick(5000, 0.01) * 0.3), 0.7
    if name == 'push': dd = d or 2.0; x = whoosh(dd, True, 200, 9000); x += osc('saw', sweep(60, 700, dd), dd) * (tv(dd) / dd) ** 2 * 0.15; return x, 0.4
    if name == 'shimmer':
        x = np.zeros(int(1.2 * SR))
        for k in range(8): ins(x, glass(PENT[6 + k % 6] + 12, 0.5) * (0.5 - k * 0.05), k * 0.045 * SR)
        return x, 0.7
    if name == 'land': return S(boom(60, 35, 0.8) * 0.6, glass(88, 1.0) * 0.45), 0.5
    if name == 'pair': k = blip_i[0] = blip_i[0] + 1; m = PENT[5 + k % 4] + 12; return S(glass(m, 0.7) * 0.5, glass(m + 7, 0.7) * 0.4), 0.6
    if name == 'sync': return S(fm(mf(83), 0.25, 2.0, 1.5, 10) * 0.6, fm(mf(88), 0.25, 2.0, 1.5, 10) * 0.5, tick(5200, 0.01) * 0.2), 0.4
    if name == 'flow': dd = d or 1.0; t = tv(dd) / dd; return bp(noise(dd), 600, 2400) * np.sin(np.pi * t) * 0.5 + np.sin(phase(sweep(300, 450, dd), dd)) * np.sin(np.pi * t) * 0.2, 0.5
    if name == 'glide': dd = d or 3.0; x = whoosh(dd, True, 300, 5000) * 0.8; x += osc('saw', sweep(200, 90, dd), dd) * np.sin(np.pi * tv(dd) / dd) * 0.08; return x, 0.4
    if name == 'barrier': return S(boom(70, 45, 0.6) * 0.5, bp(noise(0.3), 300, 1500) * np.exp(-tv(0.3) * 12) * 0.4, glass(76, 0.8) * 0.3), 0.4
    if name == 'wave':
        dd = d or 2.9; t = tv(dd); f = mf(71) * (1 + 0.04 * np.sin(2 * np.pi * 3 * t))
        return (np.sin(phase(f, dd)) * 0.5 + np.sin(phase(f * 1.5, dd)) * 0.15) * (t / dd) ** 0.7 * env(dd, 0.05, r=0.3), 0.6
    if name == 'tunnel':
        dd = 1.0; x = np.sin(phase(sweep(mf(83), mf(95), dd), dd)) * np.exp(-tv(dd) * 3) * 0.4 + np.sin(phase(sweep(mf(83), mf(71), dd), dd)) * np.exp(-tv(dd) * 3) * 0.4
        return S(x, glass(88, 1.0) * 0.4, np.sin(phase(sweep(120, 60, 0.3), 0.3)) * np.exp(-tv(0.3) * 10) * 0.5), 0.7
    if name == 'pct': return blipn(PENT[8] + 12, 0.1), 0.3
    if name == 'pull': dd = d or 1.0; return whoosh(dd, False, 300, 6000), 0.35
    if name == 'card': return S(np.sin(phase(sweep(300, 900, 0.12), 0.12)) * np.exp(-tv(0.12) * 18) * 0.5, tick(2400, 0.015) * 0.4), 0.3
    if name == 'osc': k = int(a or 0); return S(np.sin(phase(sweep(110, 70, 0.3), 0.3)) * np.exp(-tv(0.3) * 9) * 0.7, glass(PENT[6 + 2 * (k % 2)] + 12, 0.6) * 0.35), 0.5
    if name == 'zap': return S(np.sin(phase(sweep(800, 3200, 0.12), 0.12)) * np.exp(-tv(0.12) * 14) * 0.6, fm(mf(81), 0.3, 1.5, 2, 8) * 0.3), 0.4
    if name == 'riser': dd = d or 2.0; return riser(dd, 300, 7000) * 0.8, 0.4
    if name == 'mw_pulse':
        x = S(np.sin(phase(sweep(2600, 700, 0.28), 0.28)) * np.exp(-tv(0.28) * 9) * 0.6, fm(mf(88), 0.6, 1.5, 3, 4) * 0.35, boom(85, 45, 0.5) * 0.45)
        ins(x, zip_(1500, 6000, 0.05) * 0.25, 0); return x, 0.5
    if name == 'equator':
        x = np.zeros(int(1.8 * SR))
        for i, m in enumerate((71, 76, 83)): ins(x, bell(m + 12, 1.3, 2.0) * 0.45, i * 0.07 * SR)
        return x, 0.7
    if name == 'gate_pop': return S(np.sin(phase(sweep(700, 1600, 0.07), 0.07)) * np.exp(-tv(0.07) * 30), tick(3800, 0.01) * 0.3), 0.3
    if name == 'phase':
        dd = d or 2.0; t = tv(dd); base = bp(noise(dd), 400, 6000); dl = (0.0015 + 0.0012 * np.sin(np.pi * t / dd)) * SR
        idx = np.clip(np.arange(len(base)) - dl.astype(int), 0, len(base) - 1)
        return (base + base[idx]) * env(dd, 0.2, r=0.4) * 0.5 + np.sin(phase(sweep(mf(76), mf(83), dd), dd)) * env(dd, 0.2, r=0.4) * 0.2, 0.5
    if name == 'orbit': dd = d or 1.6; return whoosh(dd, True, 400, 5000) * 0.7, 0.4
    if name == 'paths':
        dd = d or 1.0; x = np.zeros(int((dd + 0.6) * SR))
        for i in range(4): ins(x, np.sin(phase(sweep(mf(64 + 3 * i), mf(76 + 3 * i), dd), dd)) * env(dd, 0.05, r=0.3) * 0.2, i * 0.06 * SR)
        return x, 0.5
    if name == 'cancel':
        dd = 0.6; t = tv(dd); f = mf(79); ph = np.pi * np.clip(t / 0.45, 0, 1)                       # two equal tones drifting out of phase
        return (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * f * t + ph)) * 0.35 * env(dd, 0.01, r=0.05), 0.4
    if name == 'add': return S(glass(83, 0.9) * 0.6, glass(95, 0.9) * 0.35, bell(71, 1.0, 1.5) * 0.3), 0.6
    if name == 'land1': return S(boom(55, 30, 1.2) * 0.7, bell(76, 1.4, 2) * 0.6), 0.6
    if name == 'entangle':
        dd = d or 3.0; t = tv(dd); det = 6.0 * (1 - np.clip(t / (dd * 0.85), 0, 1)) ** 1.5             # two tones beating, then locked in unison
        x = osc('saw', mf(40), dd) * 0.3 + osc('saw', mf(40) + det, dd) * 0.3 + np.sin(phase(mf(52), dd)) * 0.3 + np.sin(phase(mf(52) + det * 2, dd)) * 0.3
        return sweep_lp(x, 200, 2400, 2, 48) * env(dd, 0.3, r=0.2), 0.5
    if name == 'lock':
        x = S(boom(50, 28, 1.4) * 0.9, crash(1.6) * 0.25)
        for i, m in enumerate((64, 71, 76, 83)): ins(x, bell(m + 12, 1.4, 2.0) * 0.35, i * 0.03 * SR)
        return x, 0.6
    if name == 'readout':
        dd = d or 1.8; t = tv(dd); x = np.sin(2 * np.pi * 1400 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * env(dd, 0.1, r=0.3) * 0.3
        return S(x, whoosh(dd, True, 500, 4000) * 0.4), 0.4
    if name == 'ring': return S(np.sin(2 * np.pi * mf(91) * tv(1.2)) * np.exp(-tv(1.2) * 3.5) * 0.5, np.sin(2 * np.pi * mf(91) * 1.003 * tv(1.2)) * np.exp(-tv(1.2) * 3.5) * 0.4, glass(88, 0.8) * 0.3), 0.6
    if name == 'climb':
        dd = d or 2.6; t = tv(dd) / dd; f = 90 * (14 ** t)
        x = osc('saw', f, dd) * 0.3 + osc('saw', f * 1.01, dd) * 0.3; return sweep_lp(x, 300, 6000) * t ** 1.3 * 0.6, 0.3
    if name == 'amp': i = int(a or 0); return S(np.sin(phase(sweep(90, 50, 0.2), 0.2)) * np.exp(-tv(0.2) * 12) * 0.7, zip_(800 * (1.6 ** i), 5000, 0.08) * 0.4), 0.3
    if name == 'digit': return S(crush(osc('sq', 1800, 0.08) * np.exp(-tv(0.08) * 30), 4, 5) * 0.35, blipn(88), tick(5000, 0.01) * 0.4), 0.3
    if name == 'run':
        o = str(a or '00')
        if o in ('01', '10'): return crush(S(osc('sq', 466, 0.09), osc('sq', 494, 0.09)) * np.exp(-tv(0.09) * 20) * 0.3, 4, 6), 0.2
        m = 76 if o == '00' else 83; x = np.zeros(int(0.2 * SR)); ins(x, blipn(m, 0.06), 0); ins(x, blipn(m, 0.06), 0.07 * SR); return x, 0.3
    if name == 'roll':
        dd = d or 4.0; x = np.zeros(int((dd + 0.2) * SR)); tt = 0.0; k = 0
        while tt < dd:
            ins(x, blipn(76 if rng.uniform() < 0.5 else 83, 0.04) * 0.3, tt * SR); k += 1; tt += max(0.025, 0.16 * np.exp(-k * 0.05))
        return x, 0.3
    if name == 'noise':
        dd = d or 2.4; t = tv(dd); return (crackle(dd, 90, 1500, 9000)[:len(t)] * 0.6 + hp(noise(dd), 3000) * 0.08 + lp(noise(dd), 120, 4) * 1.5) * env(dd, 0.3, r=0.5), 0.3
    if name == 'kick': return S(crackle(0.08, 300, 2000, 9000)[:int(0.1 * SR)] * 0.8, tick(1900, 0.02) * 0.4), 0.2
    if name == 'decay': return S(np.sin(phase(sweep(1800, 350, 0.4), 0.4)) * np.exp(-tv(0.4) * 6) * 0.5, glass(76, 0.6) * 0.3), 0.5
    if name == 'cycle': return S(tick(3100, 0.012) * 0.6, blipn(PENT[3] + 12, 0.05) * 0.25), 0.2
    if name == 'error': return crush(S(osc('sq', 180, 0.14) * 0.5, noise(0.14) * 0.4) * np.exp(-tv(0.14) * 14), 3, 8), 0.2
    if name == 'syndrome':
        x = np.zeros(int(0.3 * SR))
        for k in range(2): ins(x, osc('sq', 1400, 0.06) * np.exp(-tv(0.06) * 20) * 0.3, k * 0.09 * SR)
        return x, 0.2
    if name == 'fix': return S(bell(83, 0.9, 2.0) * 0.6, glass(100, 0.5) * 0.3), 0.6
    if name == 'logical':
        x = pad([64, 71, 76, 83], 1.4, 3000, 0.4, att=0.05) * 1.2
        for i, m in enumerate((76, 83, 88)): ins(x, bell(m + 12, 1.2, 2.0) * 0.35, i * 0.08 * SR)
        return x, 0.7
    if name == 'step': k = int(a or 0); return bell([76, 79, 83, 86, 88][k % 5] + 12, 1.0, 2.0) * 0.6, 0.6
    if name == 'impact': return S(boom(46, 24, 2.2) * 1.0, crash(2.0) * 0.45, kick(1.4, 1.2) * 0.8), 0.5
    if name == 'final':
        x = np.zeros(int(1.6 * SR))
        for i, m in enumerate((76, 83, 88, 95)): ins(x, crush(osc('sq', mf(m), 0.06) * np.exp(-tv(0.06) * 25), 5, 3) * 0.2, i * 0.05 * SR)
        ins(x, np.sin(2 * np.pi * mf(88) * tv(1.3)) * env(1.3, 0.02, curve=3) * 0.5, 0.2 * SR); return x, 0.7
    raise KeyError(name)
missing = set(); stamp = {}
GAIN = {'blip': 0.55, 'type': 0.5, 'run': 0.9, 'sync': 0.8, 'cycle': 0.8, 'kick': 0.9, 'click': 1.1, 'level': 0.9, 'stage': 0.9,
        'pulse_tube': 0.55, 'ambience': 0.65, 'cold_amb': 0.6, 'noise': 0.8, 'rot': 0.9, 'wave': 0.9, 'entangle': 1.0, 'impact': 1.0, 'final': 0.8}
for cu in cuesheet['cues']:
    key = (cu['sfx'], round(cu['t'] / S16))                       # never stack the same effect twice on one 16th
    if key in stamp and cu['sfx'] not in ('mw_pulse',): continue
    stamp[key] = 1
    try: sig, rv = make(cu['sfx'], cu.get('arg'))
    except KeyError: missing.add(cu['sfx']); continue
    sig = sig / (np.max(np.abs(sig)) + 1e-9)
    bed = 0.45 if cu['sfx'] in BEDS else 1.0
    put(SFX, sig, cu['t'], 0.6 * cu.get('g', 1) * bed * GAIN.get(cu['sfx'], 1.0), cu.get('pan', 0), rv)
if missing: print('no generator for:', sorted(missing))

# ---------------------------------------------------------------- mix: reverb send → sum → loudness → limit
def reverb_ir(d=2.2, seed=9):
    r = np.random.default_rng(seed); t = tv(d)
    return [lp(r.standard_normal(len(t)), 7000) * np.exp(-t * 3.0) * 0.03 for _ in range(2)]
ir = reverb_ir()
wet = np.stack([ss.fftconvolve(VERB[i] + 0.25 * MUS[i], ir[i])[:N] for i in range(2)])
mix = 0.72 * MUS + 2.2 * SFX + 0.7 * wet
def _db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
for e in cuesheet['scenes']:
    i0, i1 = int(e['t0'] * SR), int(e['t1'] * SR); print(f"{e['id']:20s} music {_db(0.72 * MUS[:, i0:i1]):6.1f}  sfx {_db(2.2 * SFX[:, i0:i1]):6.1f}  dB")
mix = np.stack([hp(mix[i], 25) for i in range(2)])
def kweight(x):
    hi = ss.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x)
    return ss.lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], hi)
def lufs(st):
    k = [kweight(ch) for ch in st]; blk = int(0.4 * SR); hop = int(0.1 * SR)
    ms = np.array([sum(np.mean(kc[i:i + blk] ** 2) for kc in k) for i in range(0, len(k[0]) - blk, hop)])
    ld = -0.691 + 10 * np.log10(ms + 1e-12); g_ = ms[ld > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g_)) - 10; g2 = ms[(ld > -70) & (ld > rel)]
    return -0.691 + 10 * np.log10(np.mean(g2))
mix = mix[:, :int(TOTAL * SR)]
fade = int(0.3 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
for _ in range(3):
    L = lufs(mix); mix *= 10 ** ((-14.0 - L) / 20)
    mix = np.tanh(mix / 0.92) * 0.92
    pk = np.max(np.abs(ss.resample_poly(mix, 4, 1, axis=1)))
    if pk > 10 ** (-1.0 / 20): mix *= 10 ** (-1.0 / 20) / pk
if len(sys.argv) > 3:                                            # loudness curve for review: music, effects, mix (dB per 0.25 s)
    from PIL import Image, ImageDraw
    hop = int(0.25 * SR); W_, H_ = 960, 260; im = Image.new('RGB', (W_, H_), (16, 16, 20)); dr = ImageDraw.Draw(im)
    def curve(x, col):
        v = [_db(x[:, i:i + hop]) for i in range(0, x.shape[1] - hop, hop)]; pts = [(k * W_ / len(v), H_ - (max(-50, vv) + 50) / 50 * H_) for k, vv in enumerate(v)]; dr.line(pts, fill=col, width=2)
    for e in cuesheet['scenes']: x_ = e['t0'] / TOTAL * W_; dr.line([(x_, 0), (x_, H_)], fill=(70, 70, 80)); dr.text((x_ + 2, 2), e['id'][4:9], fill=(140, 140, 150))
    for db_ in (-10, -20, -30, -40): y_ = H_ - (db_ + 50) / 50 * H_; dr.line([(0, y_), (W_, y_)], fill=(40, 40, 48))
    curve(0.72 * MUS[:, :mix.shape[1]] * 10 ** ((-14.0 - L) / 20), (90, 160, 255)); curve(2.2 * SFX[:, :mix.shape[1]] * 10 ** ((-14.0 - L) / 20), (255, 150, 60)); curve(mix, (240, 240, 240))
    im.save(sys.argv[3]); print('curve ->', sys.argv[3])
print(f'integrated loudness {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS, {mix.shape[1] / SR:.2f} s')
sf.write(OUT, mix.T.astype(np.float32), SR, subtype='PCM_24')
print('->', OUT)
