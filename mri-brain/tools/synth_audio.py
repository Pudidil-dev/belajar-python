#!/usr/bin/env python3
"""Score + sound design for "How MRI Machines Work" — pure code synthesis, no samples.

  uv run --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json build/score.wav

120 BPM, D minor, 140 beats = exactly 70 s; every scene boundary of the brief falls on a beat and each section
counts its bars from its own first beat. Structure from the brief: an immediate digital hit and pulse (0–3 s) → a
curiosity build into the machine and the tissue (3–14 s) → an atomic groove locked to the precession, the bass pulled
out before the RF pulse and slammed back in when M tips (14–28 s) → quiet percussion for relaxation, then gradient
knocking on the beat (28–42 s) → an energy build through signal and k-space (42–58 s) → the main drop on the 3D
reconstruction, its completion hit on beat 124 (58–65 s) → a D-major resolution, the final impact at 68 s and a rewind
that runs straight into the opening hit (seamless loop). Sound effects come from the cue sheet (tools/render.py --cues).
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
rng = np.random.default_rng(1971)                         # Damadian's first NMR tissue measurements
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

# ---------------------------------------------------------------- harmony (D minor)
CH = {'Dm': (38, [57, 62, 65, 69]), 'Bb': (34, [58, 62, 65, 70]), 'F': (41, [57, 60, 65, 69]), 'C': (36, [55, 60, 64, 67]),
      'Gm': (43, [55, 58, 62, 67]), 'A': (45, [57, 61, 64, 69]), 'D': (38, [57, 62, 66, 69])}
LOOP = ['Dm', 'Bb', 'F', 'C']
PROG = [(b, LOOP[(b // 4) % 4]) for b in range(0, 104, 4)]
PROG += [(104, 'Gm'), (108, 'Bb'), (112, 'A'),                                  # the build's tension
         (116, 'Dm'), (120, 'Bb'), (124, 'F'), (128, 'C'),                     # climax
         (130, 'Bb'), (132, 'C'), (134, 'D'), (136, 'D')]                      # resolution
def chord_at(beat):
    c = PROG[0][1]
    for b, n in PROG:
        if beat >= b - 1e-9: c = n
    return c
HOOK_R = [0, 0.75, 1.5, 2.0, 2.75, 3.5]                                         # 3-3-2 rhythm (beats)
HOOK = {'Dm': [74, 69, 65, 74, 72, 69], 'Bb': [74, 70, 65, 74, 72, 70], 'F': [72, 69, 65, 72, 74, 72], 'C': [72, 67, 64, 72, 74, 76],
        'Gm': [74, 70, 67, 74, 72, 70], 'A': [73, 69, 64, 73, 76, 73], 'D': [74, 69, 66, 78, 74, 69]}
PENT = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89]                         # D minor pentatonic
KICKS = []

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
        if kind == 'knock':                                                    # gradient-coil knocking as percussion
            put(MUS, kick(0.9, 0.6), t0, 0.8 * g); KICKS.append(t0)
            for s in range(4):
                put(MUS, S(tom(320 + 60 * ((ib + s) % 3), 0.09) * 0.6, bp(noise(0.05), 800, 3000) * np.exp(-tv(0.05) * 70) * 0.4), t0 + s * S16, (0.22 if s % 2 == 0 else 0.13) * g, (s - 1.5) * 0.3)
            if ib % 2 == 1: put(MUS, clap(), t0, 0.35 * g, 0, 0.3)
def bass(b0, b1, kind, g=1.0, cut=None):
    for b in np.arange(b0, b1, 0.5):
        root = CH[chord_at(b)][0]; t0 = tb(b); half = int(round(b * 2)) % 2
        if kind == 'drone' and half == 0 and int(round(b)) % 2 == 0: put(PUMP, subbass(root + 12, BEAT * 2) * 0.9, t0, g)
        if kind == 'pulse8': put(PUMP, pulsebass(root + 12 + (12 if int(round(b * 2)) % 8 == 7 else 0), BEAT / 2 * 0.9, cut or 900), t0, g)
        if kind == 'reese': put(PUMP, reese(root + 12 + (12 if int(round(b * 2)) % 8 in (3, 7) else 0), BEAT / 2 * 0.92, cut or 1500), t0, g)
        if kind == 'offbeat' and half == 1: put(PUMP, pulsebass(root + 12, BEAT * 0.42, cut or 1300), t0, g)
        if kind == 'offbeat' and half == 0: put(PUMP, subbass(root + 12, BEAT * 0.45), t0, 0.7 * g)
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
# 0–6 (0–3 s) IMMEDIATE IMPACT: the hit on frame 0, the pulse from the first beat
drums(0, 6, 'four', 0.9); bass(0, 6, 'pulse8', 0.65, cut=800); chords(0, 6, 'stabs', 0.32)
put(MUS, crash(1.6), 0, 0.35, 0, 0.4); put(MUS, boom(70, 32, 1.2), 0, 0.5)
# 6–28 (3–14 s) CURIOSITY BUILD: repeating patterns while the camera travels into the machine and the tissue
drums(6, 16, 'light', 0.85); bass(6, 16, 'offbeat', 0.6, cut=900); chords(6, 16, 'pad', 0.32, cut=1400)
arp(8, 16, 0.25, 0.3, 3600)
drums(16, 28, 'soft', 0.9); bass(16, 28, 'drone', 0.5); chords(16, 28, 'pad', 0.38, cut=1800, bright=0.2)
arp(16, 24, 0.5, 0.32, inst='glass', pattern=(0, 1, 2, 3)); arp(24, 28, 0.25, 0.34, inst='glass')
put(MUS, riser(tb(4), 250, 6000), tb(24), 0.4)
# 28–56 (14–28 s) ATOMIC RHYTHM: a groove locked to the precession (one turn per beat); bass out before the RF pulse,
# back in on beat 47 when M tips
drums(28, 44, 'four', 0.9); bass(28, 44, 'pulse8', 0.7, cut=1000); chords(28, 44, 'pad', 0.34, cut=2200)
arp(32, 44, 0.25, 0.32, 4200); hook(36, 'bell', 0.45); hook(40, 'bell', 0.45)
drums(44, 46.5, 'tick', 0.9); chords(44, 47, 'swell', 0.35, cut=2600); put(MUS, riser(tb(3), 300, 7000), tb(44), 0.5)
drums(47, 56, 'drive', 1.0); bass(47, 56, 'reese', 0.8, cut=1700); chords(47, 56, 'stabs', 0.42)
hook(48, 'lead', 0.85); hook(52, 'lead', 0.85); put(MUS, crash(), tb(47), 0.5, 0, 0.4)
# 56–84 (28–42 s) SCIENTIFIC PROCESS: quiet percussion for relaxation, then the gradients knock on the beat
drums(56, 70, 'tick', 1.0); bass(56, 70, 'drone', 0.45); chords(56, 70, 'pad', 0.4, cut=1300)
arp(58, 70, 0.5, 0.28, inst='glass', pattern=(3, 2, 1, 0))
drums(70, 84, 'knock', 0.9); bass(70, 84, 'pulse8', 0.65, cut=900); chords(70, 84, 'pad', 0.32, cut=1800)
arp(76, 84, 0.25, 0.3, 4000)
# 84–116 (42–58 s) ENERGY BUILD: signal → data → k-space; more parts every bar, a long riser, a held breath
drums(84, 98, 'groove', 0.9); bass(84, 98, 'offbeat', 0.72); chords(84, 98, 'pad', 0.36, cut=2200); arp(84, 98, 0.25, 0.34, 4500)
drums(98, 108, 'four', 0.95); bass(98, 108, 'pulse8', 0.75, cut=1100); chords(98, 108, 'swell', 0.32, cut=3000); arp(98, 108, 0.25, 0.36, 5000)
hook(100, 'glass', 0.45); hook(104, 'glass', 0.45)
drums(108, 115.5, 'drive', 1.0); bass(108, 116, 'pulse8', 0.8, cut=1400); chords(108, 116, 'swell', 0.42, cut=3800)
arp(108, 112, 0.25, 0.38, 6000); arp(112, 115.5, 0.125, 0.42, 7500)
put(MUS, riser(tb(8), 250, 9000), tb(108), 0.6); roll(112, 115.5, 0.16, 0.55); put(MUS, revcym(BEAT * 0.5), tb(115.5), 0.55)
# 116–130 (58–65 s) MAIN CLIMAX: the drop on the 3D reconstruction; the voxels complete on beat 124
drums(116, 130, 'drive', 0.95); bass(116, 130, 'reese', 0.8, cut=1900); chords(116, 130, 'stabs', 0.46)
for b in (116, 120, 124, 128): hook(b, 'lead', 0.85)
for b in (124, 128): hook(b, 'bell', 0.4, 12)
put(MUS, crash(), tb(116), 0.6, 0, 0.4); put(MUS, crash(2.4), tb(124), 0.6, 0, 0.5); put(MUS, boom(52, 26, 1.8), tb(124), 0.8)
# 130–140 (65–70 s) RESOLUTION: lighter, D major; the final hit on beat 136, then the rewind into the opening
drums(130, 135.5, 'light', 0.9); bass(130, 136, 'offbeat', 0.65); chords(130, 136, 'pad', 0.45, cut=2600, bright=0.4)
arp(130, 135.5, 0.25, 0.34, inst='glass'); hook(132, 'bell', 0.55)
ring_ = lambda x: x * np.exp(-tv(len(x) / SR) * 1.1)
put(MUS, ring_(supersaw(CH['D'][1] + [74, 78], 2.4, 5200, 0.005)), tb(136), 0.85, 0, 0.5)
put(MUS, ring_(pad([50, 57, 62, 66, 69], 2.4, 2500, 0.6, att=0.02)), tb(136), 0.8, 0, 0.6)
put(MUS, ring_(subbass(38, 2.2)), tb(136), 0.85); put(MUS, crash(2.4), tb(136), 0.5, 0, 0.5)
# held breaths before the big moments (the RF dip is written into the arrangement)
for a_, b_ in ((tb(115.5) + 0.02, tb(116)), (tb(123.6), tb(124)), (tb(135.6), tb(136))):
    for bus in (MUS, PUMP): bus[:, int(a_ * SR):int(b_ * SR)] *= 0.0
# sidechain pump under every kick
g = np.ones(N)
for tk in KICKS:
    s = int(tk * SR); L = min(int(0.28 * SR), N - s)
    if L > 0: g[s:s + L] = np.minimum(g[s:s + L], 1 - 0.6 * np.exp(-np.arange(L) / SR / 0.075))
MUS += PUMP * g
# the RF dip: the groove filtered down before the pulse (22.0–23.5 s)
a_, b_ = int(21.6 * SR), int(23.5 * SR)
for i in range(2): MUS[i, a_:b_] = sweep_lp(MUS[i, a_:b_], 8000, 500, 2, 48)

# ---------------------------------------------------------------- sound effects (from the cue sheet)
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def whoosh(d, up=True, f0=300, f1=4000):
    t = tv(d) / d; return sweep_lp(noise(d), f0 if up else f1, f1 if up else f0, 2) * np.sin(np.pi * t) ** 1.5
def zip_(f0=2000, f1=9000, d=0.06): return np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-tv(d) * 40)
def blipn(m, d=0.12): return S(fm(mf(m), d, 2.0, 1.2, 14) * 0.8, tick(mf(m) * 2, 0.01) * 0.3)
def crush(x, bits=5, hold=6):
    y = np.round(x * (2 ** (bits - 1))) / (2 ** (bits - 1)); return np.repeat(y[::hold], hold)[:len(x)]
def clicks(d, n, f0=2400, f1=5200, accel=1.0):
    x = np.zeros(int((d + 0.1) * SR))
    for k in range(n):
        tt = d * (k / max(1, n - 1)) ** accel
        ins(x, S(tick(f0 + (f1 - f0) * k / max(1, n - 1), 0.012) * 0.7, crush(osc('sq', (f0 + (f1 - f0) * k / n) / 3, 0.02) * np.exp(-tv(0.02) * 120), 4, 4) * 0.25), tt * SR)
    return x
def hum(d, f0=60, am=0.0):
    t = tv(d); x = sum(np.sin(2 * np.pi * f0 * k * t) / k ** 1.3 for k in range(1, 7))
    return x * (1 + am * np.sin(2 * np.pi * 8 * t)) * env(d, min(0.5, d * 0.2), r=min(0.6, d * 0.3))
DURS = {'scroll', 'assemble', 'holo_whoosh', 'scanline', 'zoom_fast', 'whoosh_in', 'slice_sweep', 'pull_back', 'ambience', 'magnet_sweep', 'dive', 'micro_whoosh',
        'cell_ticks', 'rush', 'water_ticks', 'zoom_jump', 'zoom_out', 'thermal', 'align_clicks', 'rf_hum', 'tip', 'relax_spiral', 'recover', 'dephase', 'grad_knock',
        'tilt', 'phase_twist', 'freq_spread', 'induction', 'samples', 'track', 'data_in', 'kfill', 'ifft', 'lift', 'segment', 'voxel_rise', 'rotate', 'room_tone', 'rewind'}
BEDS = {'ambience', 'room_tone', 'rf_hum', 'induction', 'thermal', 'track'}
blip_i = [0]
def make(name, a):
    d = a if isinstance(a, (int, float)) and name in DURS and a else None
    # ---- S01
    if name == 'activate':
        x = S(zip_(900, 6000, 0.07) * 0.6, tick(4200, 0.015) * 0.6, crush(osc('sq', 880, 0.05) * np.exp(-tv(0.05) * 60), 4, 3) * 0.3); return x, 0.2
    if name == 'scroll': dd = d or 0.3; return clicks(dd, 9, 1800, 3600), 0.15
    if name == 'impact_digital':
        x = S(boom(60, 30, 1.2) * 0.9, crush(noise(0.25) * np.exp(-tv(0.25) * 14), 4, 6) * 0.25, kick(1.2, 1.0) * 0.6); return x, 0.4
    if name == 'assemble': dd = d or 1.1; return clicks(dd, 18, 2000, 6000, 0.9) * 0.9, 0.25
    if name == 'holo_whoosh':
        dd = d or 0.6; x = whoosh(dd, True, 400, 9000); x += np.sin(phase(sweep(mf(62), mf(86), dd), dd)) * np.sin(np.pi * tv(dd) / dd) * 0.25; return x, 0.5
    if name == 'recon_impact':
        x = S(boom(58, 29, 1.4) * 0.9, crash(1.6) * 0.3)
        for i, m in enumerate((74, 81, 86)): ins(x, bell(m, 1.4, 2.2) * 0.4, i * 0.04 * SR)
        return x, 0.6
    if name == 'scanline': dd = d or 0.8; t = tv(dd); return np.sin(phase(sweep(2200, 900, dd), dd)) * env(dd, 0.05, r=0.2) * 0.35 + hp(noise(dd), 5000) * 0.08 * env(dd, 0.05, r=0.2), 0.3
    if name == 'zoom_fast': dd = d or 0.5; x = whoosh(dd, True, 200, 9000) * 1.1; x += osc('saw', sweep(80, 1200, dd), dd) * (tv(dd) / dd) ** 2 * 0.12; return x, 0.4
    # ---- S02
    if name == 'whoosh_in': dd = d or 1.0; return whoosh(dd, True, 250, 7000), 0.4
    if name == 'slice_sweep': dd = d or 0.9; return S(np.sin(phase(sweep(400, 1600, dd), dd)) * env(dd, 0.05, r=0.3) * 0.3, whoosh(dd, True, 1000, 6000) * 0.5), 0.4
    if name == 'tone': return S(glass(81, 1.2) * 0.6, bell(69, 1.2, 1.5) * 0.3), 0.6
    if name == 'pull_back': dd = d or 1.0; return whoosh(dd, False, 300, 7000), 0.4
    if name == 'mech_pulse':
        x = np.zeros(int(1.2 * SR))
        for k in range(4): ins(x, S(np.sin(phase(sweep(110, 60, 0.18), 0.18)) * np.exp(-tv(0.18) * 14) * 0.8, bp(noise(0.08), 200, 1200) * np.exp(-tv(0.08) * 40) * 0.5), k * 0.125 * SR)
        return x, 0.3
    if name == 'layer': k = int(a or 0); return S(glass(PENT[6 + k] , 0.7) * 0.6, tick(3000 + 400 * k, 0.012) * 0.4), 0.5
    if name == 'magnet_sweep':
        dd = d or 0.8; t = tv(dd); x = np.sin(phase(mf(38) * (1 + 0.003 * np.sin(2 * np.pi * 3 * t)), dd)) * 0.6 + np.sin(phase(mf(50), dd)) * 0.3
        return sweep_lp(x + 0.2 * noise(dd), 150, 1600, 2, 32) * env(dd, 0.15, r=0.3), 0.6
    if name == 'type':
        x = np.zeros(int(0.4 * SR))
        for k in range(6): ins(x, tick(rng.uniform(2800, 4200), 0.012) * 0.6, k * 0.05 * SR)
        return x, 0.1
    if name == 'ambience': dd = d or 2.0; return (hum(dd, 58, 0.04) * 0.25 + lp(noise(dd), 400) * env(dd, 0.4, r=0.6) * 0.3), 0.3
    # ---- S03
    if name == 'dive': dd = d or 1.3; x = whoosh(dd, True, 200, 9000) * 1.1; x += osc('saw', sweep(60, 900, dd), dd) * (tv(dd) / dd) ** 2 * 0.12; return x, 0.4
    if name == 'voxel': return S(blipn(81, 0.15), tick(5200, 0.012) * 0.4, glass(93, 0.5) * 0.3), 0.4
    if name == 'micro_whoosh': dd = d or 1.2; return S(whoosh(dd, True, 600, 8000) * 0.8, np.sin(phase(sweep(mf(74), mf(98), dd), dd)) * np.sin(np.pi * tv(dd) / dd) * 0.12), 0.5
    if name == 'cell_ticks': dd = d or 0.6; return clicks(dd, 10, 3000, 5000) * 0.6, 0.3
    if name == 'rush': dd = d or 0.35; return S(whoosh(dd, True, 1500, 12000) * 1.2, hp(noise(dd), 6000) * np.sin(np.pi * tv(dd) / dd) * 0.3), 0.3
    if name == 'water_ticks':
        dd = d or 1.6; x = np.zeros(int((dd + 0.2) * SR))
        for k in range(int(dd * 28)): ins(x, tick(rng.uniform(4500, 8500), 0.008) * rng.uniform(0.15, 0.5), rng.uniform(0, dd) * SR)
        return x, 0.3
    if name == 'nuclei_glow':
        x = np.zeros(int(1.6 * SR))
        for i, m in enumerate((86, 93, 98)): ins(x, glass(m, 1.2) * 0.45, i * 0.07 * SR)
        return x, 0.7
    if name == 'zoom_jump': dd = d or 0.7; return S(whoosh(dd, True, 300, 10000), np.sin(phase(sweep(200, 3000, dd), dd)) * (tv(dd) / dd) ** 2 * 0.25), 0.4
    if name == 'proton_tone': return S(bell(74, 1.6, 2.0) * 0.6, glass(86, 1.2) * 0.4, boom(80, 50, 0.6) * 0.3), 0.7
    if name == 'moment_on': return S(zip_(800, 3200, 0.1) * 0.5, glass(93, 0.8) * 0.4), 0.5
    # ---- S04
    if name == 'zoom_out': dd = d or 1.2; return whoosh(dd, False, 300, 7000), 0.4
    if name == 'thermal':
        dd = d or 1.6; x = np.zeros(int((dd + 0.2) * SR))
        for k in range(int(dd * 14)): ins(x, blipn(rng.choice(PENT[4:10]) + 12, 0.05) * rng.uniform(0.1, 0.3), rng.uniform(0, dd) * SR)
        return x, 0.3
    if name == 'field_in': return S(np.sin(phase(sweep(mf(38), mf(50), 0.6), 0.6)) * env(0.6, 0.05, r=0.3) * 0.7, whoosh(0.5, True, 200, 3000) * 0.4), 0.5
    if name == 'resonant_pulse': return S(boom(62, 38, 1.4) * 0.8, np.sin(2 * np.pi * mf(62) * tv(1.4)) * np.exp(-tv(1.4) * 2.2) * 0.4, np.sin(2 * np.pi * mf(62) * 1.004 * tv(1.4)) * np.exp(-tv(1.4) * 2.2) * 0.3), 0.6
    if name == 'align_clicks': dd = d or 0.9; return clicks(dd, 16, 2600, 4200, 0.8) * 0.7, 0.2
    if name == 'formula': return S(bell(81, 1.2, 2.0) * 0.5, tick(3600, 0.012) * 0.3), 0.5
    if name in ('gauge', 'gauge2'): m = 81 if name == 'gauge' else 93; return S(blipn(m, 0.12), glass(m + 12, 0.5) * 0.25), 0.4
    if name == 'precess':
        dd = 0.42; t = tv(dd); f = mf(81) * (1 + 0.01 * np.sin(2 * np.pi * 9 * t))
        return np.sin(phase(f, dd)) * np.exp(-t * 7) * 0.5 + np.sin(phase(f * 1.5, dd)) * np.exp(-t * 10) * 0.15, 0.4
    # ---- S05
    if name == 'rf_on': return S(zip_(400, 5200, 0.12) * 0.6, fm(mf(86), 0.4, 1.5, 2.5, 6) * 0.4, tick(4800, 0.01) * 0.3), 0.4
    if name == 'rf_hum':
        dd = d or 1.9; t = tv(dd); x = np.sin(2 * np.pi * 780 * t + 2.5 * np.sin(2 * np.pi * 13 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * t))
        return x * env(dd, 0.1, r=0.3) * 0.35, 0.4
    if name == 'tuned': return S(glass(86, 0.9) * 0.6, glass(93, 0.9) * 0.4), 0.6
    if name == 'tip':
        dd = d or 2.0; t = tv(dd); f = mf(62) * (2 ** (np.clip(t / dd, 0, 1) * 1.0))
        x = osc('saw', f, dd) * 0.25 + osc('saw', f * 1.005, dd) * 0.25 + np.sin(phase(f * 2, dd)) * 0.2
        return sweep_lp(x, 400, 5000, 2, 48) * env(dd, 0.1, r=0.2), 0.5
    if name == 'flip_land':
        x = S(boom(56, 30, 1.0) * 0.6, crash(1.4) * 0.2)
        for i, m in enumerate((74, 81, 86)): ins(x, bell(m, 1.2, 2.0) * 0.4, i * 0.05 * SR)
        return x, 0.6
    if name == 'rf_off': return S(np.sin(phase(sweep(2400, 300, 0.25), 0.25)) * np.exp(-tv(0.25) * 8) * 0.6, tick(1800, 0.02) * 0.3), 0.3
    # ---- S06
    if name == 'relax_spiral': dd = d or 0.6; return np.sin(phase(sweep(mf(86), mf(74), dd), dd)) * env(dd, 0.03, r=0.3) * 0.5, 0.6
    if name == 'split': return S(whoosh(0.35, False, 800, 5000) * 0.6, tick(2600, 0.015) * 0.4), 0.3
    if name == 'reset_pulse': return S(zip_(600, 3000, 0.08) * 0.5, blipn(74, 0.1) * 0.4), 0.4
    if name == 'recover':
        dd = d or 2.4; t = tv(dd); f = mf(62) * (1.5 ** (1 - np.exp(-t / (dd * 0.35))))
        return (np.sin(phase(f, dd)) * 0.35 + np.sin(phase(f * 2, dd)) * 0.12) * env(dd, 0.05, r=0.4), 0.5
    if name == 'dephase':
        dd = d or 2.4; t = tv(dd); x = np.zeros(len(t))
        for k in range(6): x += np.sin(2 * np.pi * (mf(86) + (k - 2.5) * 9 * t / dd) * t) / 6
        return x * np.exp(-t / (dd * 0.4)) * 0.8, 0.6
    if name == 'images':
        x = np.zeros(int(1.0 * SR))
        for i, m in enumerate((74, 81)): ins(x, S(blipn(m, 0.12), glass(m + 12, 0.6) * 0.3), i * 0.15 * SR)
        return x, 0.5
    # ---- S07
    if name == 'grad_knock':
        dd = d or 1.0; x = np.zeros(int((dd + 0.3) * SR)); n = max(2, int(dd / 0.125))
        for k in range(n): ins(x, S(tom(180 + 40 * (k % 2), 0.08) * 0.7, bp(noise(0.03), 1500, 5000) * np.exp(-tv(0.03) * 90) * 0.5), k * 0.125 * SR)
        return x, 0.25
    if name == 'grid_on': return S(np.sin(phase(sweep(300, 900, 0.3), 0.3)) * env(0.3, 0.01, r=0.1) * 0.4, glass(86, 0.6) * 0.3), 0.4
    if name == 'slice_sel': k = int(a or 0); return S(fm(mf(74 + 3 * k), 0.35, 1.5, 3, 8) * 0.6, zip_(1200, 4000, 0.06) * 0.3), 0.4
    if name == 'tilt': dd = d or 0.7; return whoosh(dd, True, 400, 5000) * 0.7, 0.4
    if name == 'phase_twist':
        dd = d or 0.5; t = tv(dd); return S(np.sin(phase(sweep(mf(74), mf(86), dd), dd)) * env(dd, 0.02, r=0.1) * 0.4, np.sin(phase(sweep(mf(74), mf(62), dd), dd)) * env(dd, 0.02, r=0.1) * 0.4), 0.5
    if name == 'freq_spread':
        dd = d or 1.3; t = tv(dd); x = np.zeros(len(t))
        for k in range(5): x += np.sin(phase(mf(74) * (1 + 0.05 * (k - 2) * np.clip(t / 0.3, 0, 1)), dd)) / 5
        return x * env(dd, 0.05, r=0.3) * 0.8, 0.5
    if name == 'resolve': return S(bell(81, 1.2, 2.0) * 0.5, bell(86, 1.2, 2.0) * 0.4), 0.6
    if name == 'beep': k = int(a or 0); return np.sin(2 * np.pi * mf(86 + (k % 3) * 2) * tv(0.06)) * env(0.06, 0.003, r=0.01) * 0.35, 0.1
    # ---- S08
    if name == 'induction':
        dd = d or 2.4; t = tv(dd); x = np.sin(2 * np.pi * mf(74) * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 2 * t)) * np.exp(-t / (dd * 0.6))
        return x * env(dd, 0.05, r=0.3) * 0.5, 0.5
    if name == 'signal_start': return S(zip_(500, 2500, 0.06) * 0.5, tick(2000, 0.015) * 0.5), 0.3
    if name == 'amp': return S(np.sin(phase(sweep(90, 50, 0.2), 0.2)) * np.exp(-tv(0.2) * 12) * 0.7, zip_(800, 5000, 0.08) * 0.4), 0.3
    if name == 'process': return S(crush(osc('sq', 660, 0.12) * np.exp(-tv(0.12) * 18), 4, 5) * 0.4, tick(3200, 0.012) * 0.4), 0.3
    if name == 'adc': return S(crush(osc('sq', 1200, 0.1) * np.exp(-tv(0.1) * 20), 3, 6) * 0.45, blipn(86, 0.08)), 0.3
    if name == 'samples': dd = d or 2.0; return clicks(dd, int(dd * 16), 3000, 3000, 1.0) * 0.5, 0.2
    if name == 'track': dd = d or 4.0; return whoosh(dd, False, 300, 2500) * 0.35, 0.3
    # ---- S09
    if name == 'data_in': dd = d or 0.8; return clicks(dd, 14, 2500, 5500, 1.0) * 0.6, 0.2
    if name == 'kfill':
        dd = d or 2.3; x = np.zeros(int((dd + 0.2) * SR)); n = int(dd * 24)
        for k in range(n): ins(x, tick(2400 + 2400 * k / n, 0.01) * 0.45, k / n * dd * SR)
        return x, 0.2
    if name == 'shrink': return whoosh(0.4, False, 600, 5000) * 0.5, 0.3
    if name == 'ifft':
        dd = d or 2.2; x = np.zeros(int((dd + 1.0) * SR))
        for k in range(10): ins(x, glass(PENT[k % len(PENT)] + 12, 0.8) * (0.25 + 0.04 * k), (k / 10) ** 1.2 * dd * SR)
        x[:int(dd * SR)] += np.sin(phase(sweep(mf(62), mf(86), dd), dd)) * env(dd, 0.2, r=0.2) * 0.2
        return x, 0.6
    if name == 'image_done':
        x = np.zeros(int(1.2 * SR))
        for i, m in enumerate((74, 81, 86, 93)): ins(x, bell(m, 1.0, 2.0) * 0.35, i * 0.035 * SR)
        return x, 0.6
    if name == 'slice_click': k = int(a or 0); return S(tick(3000 + 120 * k, 0.012) * 0.6, blipn(PENT[(k * 2) % len(PENT)] + 12, 0.06) * 0.4), 0.25
    # ---- S10
    if name == 'lift': dd = d or 0.9; return whoosh(dd, True, 300, 6000) * 0.7, 0.4
    if name == 'stack_click': k = int(a or 0); return S(tick(2200 + 150 * k, 0.014) * 0.6, np.sin(phase(sweep(400, 200, 0.05), 0.05)) * np.exp(-tv(0.05) * 60) * 0.5), 0.2
    if name == 'segment':
        dd = d or 1.0; x = np.zeros(int((dd + 0.5) * SR))
        for k in range(9): ins(x, S(zip_(5000, 1500, 0.07) * 0.4, glass(PENT[11 - k % 6], 0.4) * 0.25), k * dd / 9 * SR)
        return x, 0.4
    if name == 'voxel_rise':
        dd = d or 1.15; t = tv(dd); x = clicks(dd, 30, 2000, 7000, 0.8)[:len(t)] * 0.5
        x += sweep_lp(osc('saw', sweep(mf(50), mf(74), dd), dd) + osc('saw', sweep(mf(50), mf(74), dd) * 1.006, dd), 300, 6000, 2, 48) * (t / dd) ** 1.5 * 0.2
        return x, 0.4
    if name == 'big_impact':
        x = S(boom(48, 24, 2.2) * 1.0, crash(2.2) * 0.4, kick(1.4, 1.2) * 0.8)
        for i, m in enumerate((74, 81, 86, 93)): ins(x, bell(m + 12, 1.6, 2.0) * 0.3, i * 0.03 * SR)
        return x, 0.6
    if name == 'rotate': dd = d or 2.3; return S(whoosh(dd, True, 500, 3000) * 0.4, np.sin(phase(sweep(mf(74), mf(81), dd), dd)) * env(dd, 0.3, r=0.5) * 0.12), 0.5
    # ---- S11
    if name == 'room_tone': dd = d or 3.4; return (hum(dd, 50, 0.02) * 0.2 + lp(noise(dd), 300) * env(dd, 0.4, r=0.6) * 0.2), 0.3
    if name == 'step': k = int(a or 0); return bell([74, 77, 81, 84, 86][k % 5], 1.0, 2.0) * 0.6, 0.6
    if name == 'final_impact': return S(boom(46, 23, 2.2) * 1.0, crash(2.0) * 0.45, kick(1.4, 1.2) * 0.8), 0.5
    if name == 'completion':
        x = np.zeros(int(1.6 * SR))
        for i, m in enumerate((74, 78, 81, 86)): ins(x, crush(osc('sq', mf(m), 0.06) * np.exp(-tv(0.06) * 25), 5, 3) * 0.2, i * 0.05 * SR)
        ins(x, np.sin(2 * np.pi * mf(86) * tv(1.3)) * env(1.3, 0.02, curve=3) * 0.5, 0.2 * SR); return x, 0.7
    if name == 'rewind':
        dd = d or 0.55; t = tv(dd); x = revcym(dd) * 0.6 + whoosh(dd, True, 300, 9000) * 0.6
        x += crush(np.sin(phase(sweep(1800, 300, dd), dd)) * (t / dd) * 0.25, 4, 4)
        return x, 0.3
    raise KeyError(name)
missing = set(); stamp = {}
GAIN = {'type': 0.45, 'precess': 0.6, 'beep': 0.5, 'slice_click': 0.9, 'stack_click': 1.0, 'water_ticks': 0.6, 'kfill': 0.9, 'samples': 0.9, 'ambience': 0.6,
        'recover': 0.45, 'dephase': 0.45, 'voxel_rise': 1.2, 'ifft': 1.1, 'segment': 1.1, 'induction': 1.2, 'amp': 1.1, 'process': 1.1, 'adc': 1.1,
        'room_tone': 0.6, 'big_impact': 1.0, 'final_impact': 1.0, 'impact_digital': 0.95, 'recon_impact': 0.95, 'grad_knock': 0.9, 'assemble': 0.85}
for cu in cuesheet['cues']:
    key = (cu['sfx'], round(cu['t'] / S16))                       # never stack the same effect twice on one 16th
    if key in stamp: continue
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
mix = 0.7 * MUS + 2.3 * SFX + 0.7 * wet
def _db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
for e in cuesheet['scenes']:
    i0, i1 = int(e['t0'] * SR), int(e['t1'] * SR); print(f"{e['id']:20s} music {_db(0.7 * MUS[:, i0:i1]):6.1f}  sfx {_db(2.3 * SFX[:, i0:i1]):6.1f}  dB")
mix = np.stack([hp(mix[i], 30) for i in range(2)])
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
# no fade-out: the rewind runs into the opening hit when the video loops; only a 5 ms ramp at the very edges
e5 = int(0.005 * SR); mix[:, :e5] *= np.linspace(0, 1, e5); mix[:, -e5:] *= np.linspace(1, 0, e5)
for _ in range(3):
    L = lufs(mix); mix *= 10 ** ((-14.0 - L) / 20)
    mix = np.tanh(mix / 0.92) * 0.92
    pk = np.max(np.abs(ss.resample_poly(mix, 4, 1, axis=1)))
    if pk > 10 ** (-1.0 / 20): mix *= 10 ** (-1.0 / 20) / pk
if len(sys.argv) > 3:
    from PIL import Image, ImageDraw
    hop = int(0.25 * SR); W_, H_ = 960, 260; im = Image.new('RGB', (W_, H_), (16, 16, 20)); dr = ImageDraw.Draw(im)
    def curve(x, col):
        v = [_db(x[:, i:i + hop]) for i in range(0, x.shape[1] - hop, hop)]; pts = [(k * W_ / len(v), H_ - (max(-50, vv) + 50) / 50 * H_) for k, vv in enumerate(v)]; dr.line(pts, fill=col, width=2)
    for e in cuesheet['scenes']: x_ = e['t0'] / TOTAL * W_; dr.line([(x_, 0), (x_, H_)], fill=(70, 70, 80)); dr.text((x_ + 2, 2), e['id'][4:9], fill=(140, 140, 150))
    for db_ in (-10, -20, -30, -40): y_ = H_ - (db_ + 50) / 50 * H_; dr.line([(0, y_), (W_, y_)], fill=(40, 40, 48))
    curve(0.7 * MUS[:, :mix.shape[1]] * 10 ** ((-14.0 - L) / 20), (90, 160, 255)); curve(2.3 * SFX[:, :mix.shape[1]] * 10 ** ((-14.0 - L) / 20), (255, 150, 60)); curve(mix, (240, 240, 240))
    im.save(sys.argv[3]); print('curve ->', sys.argv[3])
print(f'integrated loudness {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS, {mix.shape[1] / SR:.2f} s')
sf.write(OUT, mix.T.astype(np.float32), SR, subtype='PCM_24')
print('->', OUT)
