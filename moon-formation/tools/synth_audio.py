#!/usr/bin/env python3
"""Score + sound design for "How the Moon Formed" — pure code synthesis, no samples.

  uv run --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json build/score.wav

128 BPM, A minor, 24 bars of 1.875 s = exactly 45 s. Every scene starts on a bar line, so the arrangement follows the
picture: cosmic intro → build while Theia falls (with a silent beat before contact) → drop 1 on the impact → half-time
breakdown inside the plume → orbital groove → accretion build → drop 2 on the Moon → crystal cooling → cinematic finale
resolving to A major. One hook (a 3-3-2 rhythm over chord tones) comes back on bells, lead and the final chord.
Sound effects come from the cue sheet the renderer exports (tools/render.py --cues); collisions are already quantized
to 16th notes there, so they play as rhythm.
"""
import json, sys
import numpy as np
import scipy.signal as ss
import soundfile as sf

SR = 48000
BPM = 128; BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4
cuesheet = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
TOTAL = cuesheet['total']
N = int(TOTAL * SR) + 2 * SR
MUS = np.zeros((2, N)); PUMP = np.zeros((2, N)); SFX = np.zeros((2, N)); VERB = np.zeros((2, N))
rng = np.random.default_rng(1969)
def tb(bar, beat=0.0): return (bar * 4 + beat) * BEAT

# ---------------------------------------------------------------- helpers
def tv(d): return np.arange(max(1, int(d * SR))) / SR
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def put(bus, sig, t, g=1.0, pan=0.0, verb=0.0):
    s = int(round(t * SR))
    if s >= N or len(sig) == 0: return
    if s < 0: sig = sig[-s:]; s = 0
    sig = sig[:N - s] * g
    if np.ndim(pan) == 0:
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4; l, r = np.cos(a), np.sin(a)
    else:                                                        # moving pan (array, -1..1)
        pn = np.interp(np.arange(len(sig)), np.linspace(0, len(sig) - 1, len(pan)), pan); a = (np.clip(pn, -1, 1) + 1) * np.pi / 4; l, r = np.cos(a), np.sin(a)
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
def sweep_lp(x, f0, f1, o=2, blocks=64):                        # time-varying low-pass (block-wise)
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
    t = tv(0.36); f = 44 + 140 * np.exp(-t * 30)
    body = np.sin(phase(f, 0.36)) * np.exp(-t * 7.5)
    return sat(body * 1.2 + 0.35 * punch * hp(noise(0.36), 2500) * np.exp(-t * 110), 1.6) * g
def heartbeat():
    x = np.zeros(int(0.7 * SR)); a = kick(0.9, 0.2); b = kick(0.6, 0.1)
    ins(x, lp(a, 300), 0); ins(x, lp(b, 260), int(0.19 * SR)); return x
def clap():
    x = np.zeros(int(0.3 * SR))
    for o in (0, 0.009, 0.019, 0.028): b = bp(noise(0.025), 1000, 6000) * np.exp(-tv(0.025) * 120); ins(x, b, int(o * SR))
    x += bp(noise(0.3), 900, 5000) * np.exp(-tv(0.3) * 14) * 0.55
    return x
def snare(g=1.0):
    t = tv(0.24); return (bp(noise(0.24), 1300, 7500) * np.exp(-t * 18) + 0.6 * np.sin(phase(200 * (1 + 0.3 * np.exp(-t * 40)), 0.24)) * np.exp(-t * 28)) * g
def hat(open_=False):
    d = 0.3 if open_ else 0.05; return hp(noise(d), 7500, 4) * np.exp(-tv(d) * (10 if open_ else 75))
def shaker(): return bp(noise(0.07), 4500, 12000) * env(0.07, 0.012, curve=5)
def crash(d=2.2):
    t = tv(d); return (hp(noise(d), 4000, 2) * 0.8 + bp(noise(d), 2500, 9000)) * np.exp(-t * 2.2) * np.minimum(1, t / 0.003)
def tom(f=110, d=0.45):
    t = tv(d); return sat(np.sin(phase(f * (1 + 0.7 * np.exp(-t * 18)), d)) * np.exp(-t * 6) + 0.2 * lp(noise(d), 1500) * np.exp(-t * 30), 1.4)
def subbass(m, d):
    f = mf(m); return osc('sin', f, d) * adsr(d, 0.005, 0.05, 0.9, 0.04)[:int(d * SR)]
def pulsebass(m, d, cut=900):
    f = mf(m); x = 0.55 * osc('sq', f, d, 0.3) + 0.5 * osc('saw', f, d) + 0.7 * osc('sin', f / 2, d)
    return lp(x, cut) * adsr(d, 0.003, 0.07, 0.6, 0.03)[:len(x)]
def reese(m, d, cut=1400):
    f = mf(m); x = osc('saw', f * 0.995, d) + osc('saw', f * 1.005, d) + 0.6 * osc('saw', f * 2.002, d) * 0.4
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
    x = lp(x, cut); return x * env(d, att, r=min(0.4, d * 0.5)) / (6 * len(ms))
def bell(m, d=1.4, idx=3.0): return fm(mf(m), d, ratio=3.5, idx=idx, dec=2.6 / d) * 0.8 + fm(mf(m) * 2, d, ratio=1.0, idx=1, dec=4.5) * 0.15
def glass(m, d=0.9): return fm(mf(m), d, ratio=2.76, idx=2.4, dec=3.2 / d) * 0.7 + np.sin(2 * np.pi * mf(m) * 4.02 * tv(d)) * np.exp(-tv(d) * 9) * 0.15
def pluck(m, d=0.22, duty=0.25, cut=5000):
    f = mf(m); x = (osc('sq', f, d, duty) * 0.6 + osc('saw', f, d) * 0.4) * np.exp(-tv(d) * 12); return lp(x, cut)
def lead(m, d, duty=0.5, cut=4500):
    t = tv(d); f = mf(m) * (1 + 0.005 * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.1) * 5, 0, 1))
    x = osc('sq', f, d, duty) * 0.6 + osc('saw', f * 1.003, d) * 0.4
    return lp(x, cut) * adsr(d, 0.006, 0.12, 0.65, 0.06)[:len(t)]
def riser(d, f0=200, f1=4000):
    t = tv(d) / d; x = sweep_lp(noise(d), f0, f1, 2) * t ** 2 * 1.3 + osc('saw', sweep(mf(45), mf(69), d), d) * 0.12 * t ** 1.5
    return x
def revcym(d): x = crash(d)[::-1]; return x * np.linspace(0.2, 1, len(x)) ** 2
def boom(f0=55, f1=28, d=1.8):
    t = tv(d); return sat(np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-t * 2.2) * 1.4, 1.3)

# ---------------------------------------------------------------- harmony
CH = {'Am': (33, [57, 60, 64, 69]), 'F': (29, [53, 57, 60, 65]), 'C': (36, [55, 60, 64, 67]), 'G': (31, [55, 59, 62, 67]),
      'Dm': (38, [50, 57, 62, 65]), 'E': (28, [52, 56, 59, 64]), 'Esus': (28, [52, 57, 59, 64]), 'A': (33, [57, 61, 64, 69])}
PROG = ['Am', 'Am', 'Am', 'F', 'G', 'Am', 'F', 'C', 'Am', 'F', 'Am', 'F', 'C', 'G', 'F', 'E', 'Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'A']
HOOK_R = [0, 0.75, 1.5, 2.0, 2.75, 3.5]                           # 3-3-2 rhythm
HOOK = {'Am': [76, 72, 69, 76, 74, 72], 'F': [77, 72, 69, 77, 76, 72], 'C': [76, 72, 67, 76, 74, 72], 'G': [74, 71, 67, 74, 76, 74],
        'Dm': [77, 74, 69, 77, 76, 74], 'E': [76, 71, 68, 76, 74, 71], 'A': [76, 73, 69, 81, 76, 73]}
KICKS = []

def drums(bar, kind, g=1.0):
    t0 = tb(bar)
    if kind == 'heart':
        for b in (0, 2): put(MUS, heartbeat(), t0 + b * BEAT, 0.55 * g)
    if kind in ('four', 'drive', 'buildk'):
        for b in range(4): put(MUS, kick(1.0), t0 + b * BEAT, 0.95 * g); KICKS.append(t0 + b * BEAT)
        for b in (1, 3): put(MUS, clap(), t0 + b * BEAT, 0.55 * g, 0, 0.25)
        for s in range(16): put(MUS, hat(), t0 + s * S16, (0.22 if s % 2 else 0.12) * g, 0.35 if s % 4 == 2 else -0.2)
        for b in range(4): put(MUS, hat(True), t0 + (b + 0.5) * BEAT, 0.18 * g, 0.3)
        if kind == 'drive':
            for s in (7, 14): put(MUS, kick(0.5, 0.4), t0 + s * S16, 0.5 * g); KICKS.append(t0 + s * S16)
    if kind == 'half':
        put(MUS, kick(1.0), t0, 0.9 * g); KICKS.append(t0); put(MUS, kick(0.8), t0 + 2.75 * BEAT, 0.6 * g); KICKS.append(t0 + 2.75 * BEAT)
        put(MUS, snare(), t0 + 2 * BEAT, 0.55 * g, 0, 0.5); put(MUS, clap(), t0 + 2 * BEAT, 0.3 * g, 0, 0.5)
        for s in range(8): put(MUS, hat(), t0 + s * BEAT / 2, 0.14 * g, (s % 2 - 0.5) * 0.6)
        for s in range(16):
            if s % 3 == 1: put(MUS, shaker(), t0 + s * S16, 0.12 * g, 0.5)
    if kind == 'tick':
        put(MUS, kick(0.9), t0, 0.75 * g); KICKS.append(t0)
        put(MUS, snare(0.9), t0 + 2 * BEAT, 0.4 * g, 0, 0.6)
        for s in range(16): put(MUS, hat(), t0 + s * S16, (0.16 if s % 4 == 0 else 0.08) * g, 0.4 * np.sin(s))
    if kind == 'soft':
        for b in range(4): put(MUS, kick(0.7, 0.3), t0 + b * BEAT, 0.55 * g)
        for s in range(16): put(MUS, shaker(), t0 + s * S16, (0.1 if s % 2 else 0.06) * g, 0.4)

def bass(bar, kind, g=1.0, cut=None, length=4.0):
    root = CH[PROG[bar]][0]; t0 = tb(bar)
    if kind == 'drone': put(PUMP, subbass(root + 12, length * BEAT) * 0.9 + 0.3 * osc('tri', mf(root + 24), length * BEAT) * env(length * BEAT, 0.3, r=0.3), t0, g)
    if kind == 'pulse8':
        for k in range(8):
            c = cut or 900; put(PUMP, pulsebass(root + 12 + (12 if k == 7 else 0), BEAT / 2 * 0.9, c), t0 + k * BEAT / 2, g)
    if kind == 'reese':
        for k in range(8): put(PUMP, reese(root + 12 + (12 if k in (3, 7) else 0), BEAT / 2 * 0.92, cut or 1500), t0 + k * BEAT / 2, g)
    if kind == 'offbeat':
        for b in range(4): put(PUMP, pulsebass(root + 12 + (12 if b == 3 else 0), BEAT * 0.42, cut or 1300), t0 + (b + 0.5) * BEAT, g); put(PUMP, subbass(root + 12, BEAT * 0.45), t0 + b * BEAT, 0.7 * g)

def chords(bar, kind, g=1.0, beats=4.0, cut=2200, bright=0.0):
    ms = CH[PROG[bar]][1]; t0 = tb(bar)
    if kind == 'pad': put(PUMP, pad(ms, beats * BEAT + 0.3, cut, bright), t0, g, 0, 0.5)
    if kind == 'stabs':
        for k in range(4): put(PUMP, supersaw(ms, BEAT * 0.45, 4200), t0 + (k + 0.5) * BEAT, g * 1.1, (k % 2 - 0.5) * 0.4, 0.3)
        put(PUMP, supersaw(ms, BAR, 2600, 0.03), t0, g * 0.6, 0, 0.3)
    if kind == 'swell': put(PUMP, supersaw(ms, beats * BEAT, cut, att=beats * BEAT * 0.8), t0, g, 0, 0.4)

def arp(bar, step=0.25, g=1.0, cut=4000, pan_orbit=False, octave=12, pattern=(0, 1, 2, 3, 2, 1)):
    ms = CH[PROG[bar]][1]; t0 = tb(bar); n = int(4 / step)
    for k in range(n):
        m = ms[pattern[k % len(pattern)] % len(ms)] + octave
        pan = np.sin(2 * np.pi * k / n) * 0.8 if pan_orbit else ((k % 2) - 0.5) * 0.5
        put(MUS, pluck(m, max(0.08, step * BEAT * 1.6), 0.25, cut), t0 + k * step * BEAT, g * (0.9 if k % 4 == 0 else 0.65), pan, 0.25)

def hook(bar, inst='lead', g=1.0, oct=0):
    notes = HOOK[PROG[bar] if PROG[bar] in HOOK else 'Am']; t0 = tb(bar)
    for r, m in zip(HOOK_R, notes):
        d = (0.75 if r in (0, 2.0) else 0.5) * BEAT * (1.4 if r == 3.5 else 1)
        if inst == 'lead': put(MUS, lead(m + oct, d), t0 + r * BEAT, g * 0.55, 0.1, 0.3); put(MUS, lead(m + oct + 12, d, 0.25, 6000), t0 + r * BEAT, g * 0.18, -0.2, 0.3)
        if inst == 'bell': put(MUS, bell(m + oct, 1.2), t0 + r * BEAT, g * 0.45, (r / 4 - 0.5) * 0.8, 0.5)
        if inst == 'glass': put(MUS, glass(m + oct + 12, 0.8), t0 + r * BEAT, g * 0.35, (r / 4 - 0.5) * 0.9, 0.6)

# ---------------------------------------------------------------- arrangement
# intro (bars 0–1): cosmic drone, heartbeat, the hook hinted on far-away bells
for b in (0, 1):
    drums(b, 'heart', 0.7 + 0.2 * b); chords(b, 'pad', 0.28, cut=800); bass(b, 'drone', 0.38)
hook(1, 'bell', 0.45, -12)
# build (bars 2–4): Theia falls — filter opens, kick enters, arps, snare roll, then one silent beat before contact
for i, b in enumerate((2, 3, 4)):
    drums(b, 'soft' if b == 2 else 'four', 0.55 + 0.2 * i)
    bass(b, 'pulse8', 0.75, cut=300 + 600 * i)
    chords(b, 'pad', 0.45, cut=1200 + 900 * i)
    arp(b, 0.25 if b < 4 else 0.125, 0.35 + 0.1 * i, cut=1500 + 1500 * i)
put(MUS, riser(2 * BAR - BEAT, 300, 6000), tb(3), 0.55)
for k in range(12): put(MUS, snare(0.8), tb(4, 1) + (k * S16 if k < 4 else 4 * S16 + (k - 4) * S16 / 2), 0.18 + 0.03 * k, (k % 2 - 0.5) * 0.3)   # 16ths, then 32nds up to the gap
# silence the last beat of bar 4 (the held breath), handled by gating below
# drop 1 (bars 5–7): the impact
for b in (5, 6, 7):
    drums(b, 'four', 1.0); bass(b, 'reese', 0.85); chords(b, 'stabs', 0.55); hook(b, 'lead', 1.0)
put(MUS, crash(), tb(5), 0.55, 0, 0.4)
for k, f in enumerate((180, 150, 120, 95)): put(MUS, tom(f), tb(7, 3) + k * S16, 0.5, (k - 1.5) * 0.3)
# breakdown (bars 8–9): inside the plume, half-time, glitchy droplet plucks
SCALE = [69, 72, 74, 76, 79, 81, 84, 86, 88]
for b in (8, 9):
    drums(b, 'half', 0.85); bass(b, 'drone', 0.6, length=4); chords(b, 'pad', 0.5, cut=1500)
    for k in range(16):
        if rng.random() < 0.62: put(MUS, pluck(int(rng.choice(SCALE)), 0.14, 0.125, 6500), tb(b) + k * S16, 0.28, float(rng.uniform(-0.8, 0.8)), 0.45)
put(MUS, riser(BAR, 400, 5000), tb(9), 0.4)
# orbit groove (bars 10–12): offbeat bass, the arp circles the stereo field like the debris circles Earth
for b in (10, 11, 12):
    drums(b, 'drive', 0.95); bass(b, 'offbeat', 0.8); chords(b, 'pad', 0.45, cut=2400, bright=0.2); arp(b, 0.25, 0.42, 4500, pan_orbit=True)
hook(12, 'bell', 0.6)
put(MUS, crash(1.6), tb(10), 0.35, 0.3, 0.4)
# accretion build (bars 13–15): pulses gather, snare roll, riser, then a beat of silence before the Moon
for i, b in enumerate((13, 14, 15)):
    drums(b, 'four', 0.85 + 0.08 * i); bass(b, 'pulse8', 0.8, cut=700 + 500 * i); chords(b, 'swell', 0.35 + 0.1 * i, cut=1800 + 1200 * i)
    arp(b, 0.25 if b < 15 else 0.125, 0.4, 3000 + 1500 * i, pan_orbit=True)
put(MUS, riser(2 * BAR - BEAT, 250, 8000), tb(14), 0.6)
for k in range(16): put(MUS, snare(0.85), tb(15, 0) + (k * S16 if k < 8 else 8 * S16 + (k - 8) * S16 / 2), 0.2 + 0.03 * k, (k % 2 - 0.5) * 0.3)
# drop 2 (bars 16–17): the Moon
for b in (16, 17):
    drums(b, 'four', 1.05); bass(b, 'reese', 0.9, cut=1800); chords(b, 'stabs', 0.6); hook(b, 'lead', 1.05); hook(b, 'bell', 0.4, 12)
put(MUS, crash(), tb(16), 0.6, 0, 0.4)
# cooling (bars 18–20): crystals — glassy arps, ticking hats, the hook on glass
for i, b in enumerate((18, 19, 20)):
    drums(b, 'tick', 0.8 - 0.1 * i); bass(b, 'drone', 0.55); chords(b, 'pad', 0.45, cut=2600 - 500 * i, bright=0.3)
    for k in range(8): put(MUS, glass(CH[PROG[b]][1][k % 4] + 24, 0.7), tb(b) + k * BEAT / 2, 0.22, np.sin(k) * 0.7, 0.6)
hook(19, 'glass', 0.7)
# finale (bars 21–23): time-lapse — toms and a big swell, then the resolution to A major on the last bar
for i, b in enumerate((21, 22)):
    chords(b, 'swell', 0.55 + 0.15 * i, cut=3000 + 2000 * i); bass(b, 'pulse8', 0.75, cut=1000 + 800 * i); arp(b, 0.125, 0.3, 5000, pan_orbit=True)
    for k in range(8 if b == 21 else 16): put(MUS, tom(140 - (k % 4) * 15), tb(b) + k * (BEAT / 2 if b == 21 else S16), 0.35 + 0.02 * k, ((k % 4) - 1.5) * 0.3, 0.3)
    for bb in range(4): put(MUS, kick(1.0), tb(b, bb), 0.85); KICKS.append(tb(b, bb))
put(MUS, riser(BAR, 400, 9000), tb(22), 0.6)
A_END = tb(23)
ring = lambda x: x * np.exp(-tv(len(x) / SR) * 1.15)                 # the last chord is struck and rings out by the final frame
put(MUS, ring(supersaw(CH['A'][1] + [76, 81], BAR + 1.0, 5200, 0.005)), A_END, 0.95, 0, 0.5)
put(MUS, ring(pad([45, 57, 61, 64, 69], BAR + 1.0, 2500, 0.6, att=0.02)), A_END, 0.8, 0, 0.6)
put(MUS, ring(subbass(45, BAR)), A_END, 0.9); put(MUS, boom(60, 32, 1.8), A_END, 0.8); put(MUS, crash(2.4), A_END, 0.6, 0, 0.5)
for i, m in enumerate([69, 73, 76, 81, 85, 88]): put(MUS, bell(m, 1.6, 2.5), A_END + 0.15 + i * S16 * 2, 0.4, (i / 5 - 0.5) * 1.2, 0.7)

# held breath before each drop: gate the music for the last beat of bars 4 and 15 (the reverse cymbal fills it)
for gb in (4, 15):
    a, b_ = int((tb(gb, 3) + 0.02) * SR), int(tb(gb + 1) * SR)
    for bus in (MUS, PUMP): bus[:, a:b_] *= 0.0

# sidechain: the pad/bass/chord bus ducks under every kick (the pumping of the drops)
g = np.ones(N)
for tk in KICKS:
    s = int(tk * SR); L = min(int(0.3 * SR), N - s)
    if L > 0: g[s:s + L] = np.minimum(g[s:s + L], 1 - 0.62 * np.exp(-np.arange(L) / SR / 0.075))
MUS += PUMP * g

# ---------------------------------------------------------------- sound effects (from the cue sheet)
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def whoosh(d, up=True, f0=300, f1=4000):
    t = tv(d) / d; x = sweep_lp(noise(d), f0 if up else f1, f1 if up else f0, 2) * np.sin(np.pi * t) ** 1.5; return x
def crackle(d, rate=120, lo=1500, hi=9000):
    x = np.zeros(int(d * SR) + 2000)
    for _ in range(int(d * rate)): b = bp(noise(0.006), lo, hi) * np.exp(-tv(0.006) * 500) * rng.uniform(0.2, 1); ins(x, b, rng.uniform(0, d) * SR)
    return x
def bubbles(d, rate=8, f=(120, 500)):
    x = np.zeros(int(d * SR) + int(0.2 * SR))
    for _ in range(int(d * rate)):
        f0 = rng.uniform(*f); dd = rng.uniform(0.04, 0.12); b = np.sin(phase(sweep(f0, f0 * 2.2, dd), dd)) * np.sin(np.pi * tv(dd) / dd) ** 2
        ins(x, b * rng.uniform(0.3, 1), rng.uniform(0, d) * SR)
    return x
def rumble(d, f=110): t = tv(d); return lp(noise(d), f, 4) * 3 * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.6)
def ping(f=1100, d=1.2):
    x = np.zeros(int(d * SR))
    for k, a in enumerate((1, 0.45, 0.2)): b = np.sin(2 * np.pi * f * tv(0.25)) * np.exp(-tv(0.25) * 14); ins(x, b * a, int(k * 0.21 * SR))
    return x
PENT = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88]
def make(name, a):
    d = a if isinstance(a, (int, float)) and name in DURS and a else None
    if name == 'cosmos':
        dd = d or 9.4; t = tv(dd); x = osc('sin', 55, dd) * 0.5 + osc('sin', 27.5, dd) * 0.4 + lp(noise(dd), 400) * 0.25
        x += sum(np.sin(2 * np.pi * mf(m) * t + np.sin(2 * np.pi * 0.11 * k * t) * 2) * 0.04 for k, m in enumerate((81, 88, 93)))
        return x * np.minimum(1, t / 2.0) * np.minimum(1, (dd - t) / 1.5), 0.6
    if name == 'magma_bed': dd = d or 9.4; return rumble(dd, 120) * 0.7 + bubbles(dd, 10)[:int(dd * SR)] * 0.5 + hp(noise(dd), 5000) * 0.03, 0.2
    if name == 'lava_pop': return S(np.sin(phase(sweep(320, 70, 0.18), 0.18)) * np.exp(-tv(0.18) * 14), crackle(0.15, 200) * 0.6), 0.25
    if name == 'type':
        x = np.zeros(int(0.4 * SR))
        for k in range(6): ins(x, tick(rng.uniform(2800, 4200), 0.012) * 0.6, k * 0.055 * SR)
        return x, 0.1
    if name == 'pull_out': dd = d or 2.0; return whoosh(dd, False, 300, 5000) * 0.8 + lp(noise(dd), 200) * env(dd, dd * 0.3, r=dd * 0.4) * 0.6, 0.4
    if name == 'reveal': x = np.zeros(int(2.0 * SR)); [ins(x, bell(m, 1.5, 2) * 0.4, i * 0.06 * SR) for i, m in enumerate((88, 93, 96))]; return x, 0.7
    if name == 'theia_ping': return ping(1150, 1.0), 0.6
    if name == 'tension':
        dd = d or 4.4; t = tv(dd) / dd; x = np.zeros(int(dd * SR))
        for k in range(3): f = sweep(mf(33 + 12 * k), mf(45 + 12 * k), dd); x += osc('saw', f, dd) * (0.25 / (k + 1))
        x = sweep_lp(x, 200, 3000) * t ** 1.6 + bp(noise(dd), 400, 3000) * t ** 2.5 * 0.6
        return x * (0.75 + 0.25 * np.sin(2 * np.pi * (4 + 10 * t) * tv(dd))), 0.3
    if name == 'reverse': dd = max(0.2, d or 0.4); return revcym(dd) * 1.2, 0.5
    if name == 'impact':
        dd = 3.2; x = boom(52, 24, dd) * 1.6
        ins(x, kick(1.4, 1.5) * 1.2, 0); ins(x, sat(hp(noise(0.15), 1500) * np.exp(-tv(0.15) * 30), 3) * 0.8, 0)
        ins(x, sweep_lp(noise(dd), 9000, 120) * np.exp(-tv(dd) * 1.6) * 1.1, 0)
        ins(x, fm(73, 2.5, 2.76, 5, 1.2) * 0.35, 0)
        return x, 0.5
    if name == 'shock': dd = 1.6; return whoosh(dd, False, 250, 6000) * 1.2 + rumble(dd, 90) * 0.8, 0.5
    if name == 'molten_roar':
        dd = d or 5.4; t = tv(dd); m = 0.6 + 0.4 * lp(np.abs(noise(dd)), 6)
        return (rumble(dd, 160) * 0.8 + bp(noise(dd), 300, 2400) * m * 0.5 + crackle(dd, 160)[:int(dd * SR)] * 0.6) * np.minimum(1, (dd - t) / 1.2), 0.3
    if name == 'splat': f0 = 260 - 20 * (a or 0); return S(lp(noise(0.25), 1600) * np.exp(-tv(0.25) * 14), np.sin(phase(sweep(f0, 60, 0.3), 0.3)) * np.exp(-tv(0.3) * 10) * 0.9, bubbles(0.3, 20) * 0.4), 0.3
    if name == 'dive': dd = d or 0.6; return whoosh(dd, True, 300, 7000) * 1.2, 0.4
    if name == 'dive_whoosh': dd = d or 0.7; x = whoosh(dd, True, 200, 9000) * 1.2; ins(x, np.sin(phase(sweep(400, 1600, 0.1), 0.1)) * 0.3, len(x) - int(0.1 * SR)); return x, 0.5
    if name == 'vapour': dd = d or 3.2; t = tv(dd); return bp(noise(dd), 1800, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t) ** 2) * env(dd, 0.4, r=0.6) * 0.6, 0.4
    if name == 'droplet':
        m = PENT[int(a or 0) * 5 % len(PENT)] + 12; dd = 0.22
        return np.sin(phase(sweep(mf(m) * 0.7, mf(m) * 1.25, dd), dd)) * np.exp(-tv(dd) * 18), 0.6
    if name == 'merge_drop': return S(np.sin(phase(sweep(180, 520, 0.18), 0.18)) * np.exp(-tv(0.18) * 10), bell(PENT[8 + int(a or 0)], 0.9, 2) * 0.5), 0.6
    if name == 'orbit_hum':
        dd = d or 5.6; t = tv(dd); x = np.sin(2 * np.pi * 82.4 * t) * 0.4 + np.sin(2 * np.pi * 82.9 * t) * 0.4 + bp(noise(dd), 200, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * t / BAR)) * 0.4
        return x * env(dd, 0.6, r=0.8), 0.4
    if name == 'fall_sizzle': return S(hp(noise(0.16), 3000) * np.exp(-tv(0.16) * 22) * 0.6, np.sin(phase(sweep(160, 50, 0.12), 0.12)) * np.exp(-tv(0.12) * 20)), 0.2
    if name == 'merge_click':
        k = int(a or 0); m = PENT[min(len(PENT) - 1, 3 + k)] + 12
        return S(fm(mf(m), 0.18, 2.0, 2.5, 12) * 0.7, tick(5200, 0.01) * 0.6, np.sin(phase(sweep(140, 55, 0.12), 0.12)) * np.exp(-tv(0.12) * 22) * 0.8), 0.35
    if name == 'grav_pulse': dd = 0.42; return np.sin(phase(sweep(62, 41, dd), dd)) * np.sin(np.pi * tv(dd) / dd) ** 1.5 * 1.0, 0.2
    if name == 'moon_hit':
        dd = 2.4; x = boom(58, 30, dd) * 1.2
        ins(x, supersaw([57, 64, 69, 72, 76], 1.6, 6000) * 2.2, 0)
        for i, m in enumerate((81, 84, 88, 93)): ins(x, bell(m, 1.6, 2.5) * 0.4, i * 0.05 * SR)
        return x, 0.6
    if name == 'moon_glow': dd = d or 3.75; return pad([57, 64, 69, 76], dd, 2400, 0.4) * 0.8 + bubbles(dd, 6)[:int(dd * SR)] * 0.3, 0.5
    if name == 'cool_hiss': dd = d or 3.6; t = tv(dd); return hp(noise(dd), 3000) * np.exp(-t * 0.6) * env(dd, 0.2, r=0.6) * 0.6, 0.4
    if name == 'crystal': m = PENT[(int(a or 0) * 3) % len(PENT)] + 24; return glass(m, 0.7) * 0.9, 0.7
    if name == 'crackle': dd = d or 2.0; return crackle(dd, 90, 800, 7000), 0.3
    if name == 'crater_thud': return S(np.sin(phase(sweep(110, 48, 0.25), 0.25)) * np.exp(-tv(0.25) * 13), lp(noise(0.06), 1200) * np.exp(-tv(0.06) * 50) * 0.5), 0.3
    if name == 'lava_flow': dd = d or 1.7; return lp(noise(dd), 300) * env(dd, 0.3, r=0.5) * 1.2 + bubbles(dd, 6, (70, 200))[:int(dd * SR)] * 0.5, 0.3
    if name == 'timelapse':
        dd = d or 3.6; t = tv(dd) / dd; x = whoosh(dd, True, 500, 8000) * 0.5
        tt = 0.0; k = 0
        while tt < dd: ins(x, tick(3600, 0.012) * 0.5, tt * SR); tt += 0.03 + 0.18 * (abs(np.log(max(1e-3, tt / dd * 2.7 + 0.05)))) * 0.25; k += 1
        return x, 0.4
    if name == 'ocean_shimmer':
        dd = d or 1.6; t = tv(dd); x = bp(noise(dd), 600, 2600) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.3 * t)) * env(dd, 0.3, r=0.5) * 0.6
        for i, m in enumerate((81, 86, 88, 93)): ins(x, bell(m, 0.9, 1.5) * 0.25, (0.2 + i * 0.18) * SR)
        return x, 0.6
    if name == 'final_hit':
        dd = 2.0; x = boom(48, 26, dd) * 1.2; ins(x, kick(1.4, 1.2), 0); ins(x, crash(2.0) * 0.6, 0); return x, 0.5
    if name == 'final_tail':
        dd = d or 1.85; x = np.zeros(int((dd + 1.5) * SR))
        for i, m in enumerate((81, 85, 88, 93, 97)): ins(x, bell(m, 1.8, 2.2) * 0.35, (0.1 + i * 0.16) * SR)
        return x, 0.8
    raise KeyError(name)
DURS = {'cosmos', 'magma_bed', 'pull_out', 'tension', 'reverse', 'molten_roar', 'dive', 'dive_whoosh', 'vapour', 'orbit_hum', 'moon_glow', 'cool_hiss', 'crackle', 'lava_flow', 'timelapse', 'ocean_shimmer', 'final_tail'}
BEDS = {'cosmos', 'magma_bed', 'molten_roar', 'vapour', 'orbit_hum', 'moon_glow', 'cool_hiss', 'crackle', 'lava_flow', 'tension'}
missing = set(); stamp = {}
for cu in cuesheet['cues']:
    key = (cu['sfx'], round(cu['t'] / S16))                       # never stack the same effect twice on one 16th
    if cu['sfx'] in ('merge_click', 'fall_sizzle') and key in stamp: continue
    stamp[key] = 1
    try: sig, rv = make(cu['sfx'], cu.get('arg'))
    except KeyError: missing.add(cu['sfx']); continue
    sig = sig / (np.max(np.abs(sig)) + 1e-9)
    bed = 0.45 if cu['sfx'] in BEDS else 1.0
    put(SFX, sig, cu['t'], 0.6 * cu.get('g', 1) * bed, cu.get('pan', 0), rv)
if missing: print('no generator for:', sorted(missing))

# ---------------------------------------------------------------- mix: reverb send → sum → loudness → limit
def reverb_ir(d=2.2, seed=9):
    r = np.random.default_rng(seed); t = tv(d)
    return [lp(r.standard_normal(len(t)), 7000) * np.exp(-t * 3.0) * 0.03 for _ in range(2)]
ir = reverb_ir()
wet = np.stack([ss.fftconvolve(VERB[i] + 0.25 * MUS[i], ir[i])[:N] for i in range(2)])
mix = 0.8 * MUS + 1.45 * SFX + 0.7 * wet
def _db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
for a_, b_, nm in [(0, 3.75, 'intro'), (3.75, 9.3, 'build'), (9.375, 15, 'drop 1'), (15, 18.75, 'plume'), (18.75, 24.375, 'orbit'), (24.375, 30, 'accretion'), (30, 33.75, 'drop 2'), (33.75, 39.375, 'cooling'), (39.375, 45, 'finale')]:
    i0, i1 = int(a_ * SR), int(b_ * SR); print(f'{nm:10s} music {_db(0.8 * MUS[:, i0:i1]):6.1f}  sfx {_db(1.45 * SFX[:, i0:i1]):6.1f}  dB')
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
fade = int(0.35 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
for _ in range(3):
    L = lufs(mix); mix *= 10 ** ((-13.0 - L) / 20)
    mix = np.tanh(mix / 0.92) * 0.92
    pk = np.max(np.abs(ss.resample_poly(mix, 4, 1, axis=1)))
    if pk > 10 ** (-1.0 / 20): mix *= 10 ** (-1.0 / 20) / pk
print(f'integrated loudness {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS, {mix.shape[1] / SR:.2f} s')
sf.write(OUT, mix.T.astype(np.float32), SR, subtype='PCM_24')
print('->', OUT)
