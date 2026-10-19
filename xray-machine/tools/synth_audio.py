#!/usr/bin/env python3
"""Score + sound design for "How X-Rays Are Made" — pure code synthesis, no samples.

  uv run --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json build/score.wav

120 BPM, D minor, 130 beats (32.5 bars) = exactly 65 s. Every scene boundary of the brief falls on a beat, so the
arrangement follows the picture: hospital intro with the exposure click → tube hum and a minimal groove → a build while
the filament heats → driving acceleration with a riser → half-time slow motion with a held breath → drop 1 on
bremsstrahlung (each photon is a crystalline note pitched by its energy) → glassy characteristic section → heavy heat
section → filtered breakdown for the beam → a new groove through the hand → build through the detector → drop 2 on the
image build → resolution to D major on the final shot. One hook (3-3-2 rhythm) returns on lead, bells and glass.
Sound effects come from the cue sheet the renderer exports (tools/render.py --cues).
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
rng = np.random.default_rng(1895)                         # Röntgen's year
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

# ---------------------------------------------------------------- harmony (D minor)
CH = {'Dm': (38, [57, 62, 65, 69]), 'Bb': (34, [58, 62, 65, 70]), 'F': (41, [57, 60, 65, 69]), 'C': (36, [55, 60, 64, 67]),
      'Gm': (43, [55, 58, 62, 67]), 'A': (33, [57, 61, 64, 69]), 'D': (38, [57, 62, 66, 69])}
# chord changes in beats
PROG = [(0, 'Dm'), (12, 'Bb'), (16, 'Dm'), (20, 'Bb'), (24, 'F'), (26, 'Gm'), (30, 'Dm'), (34, 'A'), (36, 'Dm'), (40, 'Bb'),
        (44, 'Dm'), (48, 'Bb'), (52, 'F'), (56, 'C'), (58, 'Dm'), (60, 'Bb'), (64, 'F'), (66, 'C'), (68, 'Dm'), (72, 'Bb'),
        (76, 'F'), (80, 'C'), (84, 'Dm'), (88, 'Bb'), (92, 'F'), (94, 'C'), (96, 'Dm'), (100, 'Bb'), (104, 'Gm'), (108, 'A'),
        (114, 'Dm'), (116, 'Bb'), (120, 'F'), (122, 'C'), (124, 'D')]
def chord_at(beat):
    c = PROG[0][1]
    for b, n in PROG:
        if beat >= b - 1e-9: c = n
    return c
HOOK_R = [0, 0.75, 1.5, 2.0, 2.75, 3.5]                           # 3-3-2 rhythm (beats)
HOOK = {'Dm': [74, 69, 65, 74, 72, 69], 'Bb': [74, 70, 65, 74, 72, 70], 'F': [72, 69, 65, 72, 74, 72], 'C': [72, 67, 64, 72, 74, 72],
        'Gm': [74, 70, 67, 74, 72, 70], 'A': [73, 69, 64, 73, 76, 73], 'D': [74, 69, 66, 78, 74, 69]}
PENT = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89]          # D minor pentatonic
KICKS = []

def drums(b0, b1, kind, g=1.0):
    for b in np.arange(b0, b1, 1.0):
        t0 = tb(b); ib = int(round(b))
        if kind in ('four', 'drive'):
            put(MUS, kick(1.0), t0, 0.95 * g); KICKS.append(t0)
            if ib % 2 == 1: put(MUS, clap(), t0, 0.5 * g, 0, 0.25)
            for s in range(4): put(MUS, hat(), t0 + s * S16, (0.2 if s % 2 else 0.11) * g, 0.35 if s == 2 else -0.2)
            put(MUS, hat(True), t0 + 0.5 * BEAT, 0.15 * g, 0.3)
            if kind == 'drive' and ib % 4 == 3: put(MUS, kick(0.5, 0.4), t0 + 3 * S16, 0.45 * g); KICKS.append(t0 + 3 * S16)
        if kind == 'light':
            put(MUS, kick(0.8, 0.5), t0, 0.7 * g); KICKS.append(t0)
            for s in range(4): put(MUS, hat(), t0 + s * S16, (0.13 if s % 2 else 0.07) * g, 0.4 * np.sin(ib + s))
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

# ---------------------------------------------------------------- arrangement (beats)
# S01 hook (0–8): dark pad, heartbeat, ticking; the exposure click is an effect; riser + tom fill into the tube
chords(0, 8, 'pad', 0.32, cut=700); bass(0, 8, 'drone', 0.35)
for b in (0, 4): put(MUS, heartbeat(), tb(b), 0.45)
drums(0, 8, 'tick', 0.9)
put(MUS, riser(tb(3), 250, 6000), tb(5), 0.5)
for k, f in enumerate((170, 150, 130, 110)): put(MUS, tom(f), tb(7) + k * S16, 0.45, (k - 1.5) * 0.3)
# S02 vacuum tube (8–16): minimal groove, filtered pulse bass
drums(8, 16, 'soft', 0.9); bass(8, 16, 'pulse8', 0.6, cut=500); chords(8, 16, 'pad', 0.36, cut=1100)
# S03 thermionic emission (16–26): four-on-the-floor arrives, filter opens, the arp starts
drums(16, 26, 'four', 0.8); bass(16, 26, 'pulse8', 0.7, cut=800); chords(16, 26, 'pad', 0.4, cut=1600)
arp(20, 26, 0.25, 0.32, 2500)
# S04 acceleration (26–36): drive, reese bass, riser, snare roll into the slow motion
drums(26, 36, 'drive', 0.95); bass(26, 36, 'reese', 0.75, cut=1200); chords(26, 36, 'swell', 0.32, cut=2600); arp(26, 36, 0.25, 0.36, 4000)
put(MUS, riser(tb(8), 250, 7000), tb(28), 0.55)
for k in range(12): put(MUS, snare(0.8), tb(34) + (k * S16 if k < 4 else 4 * S16 + (k - 4) * S16 / 2), 0.16 + 0.03 * k, (k % 2 - 0.5) * 0.3)
# S05 tungsten target (36–44): half time, sub drone, tension; a held breath on the last beat
drums(36, 43, 'half', 0.9); bass(36, 44, 'drone', 0.6); chords(36, 44, 'pad', 0.45, cut=900)
put(MUS, revcym(BEAT * 1.0), tb(43), 0.5)
# S06 bremsstrahlung (44–58): DROP 1
drums(44, 58, 'four', 1.0); bass(44, 58, 'reese', 0.85); chords(44, 58, 'stabs', 0.5)
for b in (44, 48, 52): hook(b, 'lead', 1.0)
hook(56, 'lead', 0.8)
put(MUS, crash(), tb(44), 0.55, 0, 0.4)
# S07 characteristic (58–68): glassy arps, the hook on bells
drums(58, 68, 'light', 0.95); bass(58, 68, 'offbeat', 0.75); chords(58, 68, 'pad', 0.42, cut=2400, bright=0.2)
arp(58, 68, 0.25, 0.35, inst='glass'); hook(60, 'bell', 0.6); hook(64, 'bell', 0.6)
# S08 heat (68–76): heavy — distorted reese, four on the floor
drums(68, 76, 'drive', 1.0); bass(68, 76, 'reese', 0.9, cut=2200); chords(68, 76, 'swell', 0.3, cut=1800)
put(MUS, crash(1.6), tb(68), 0.35, 0.3, 0.4)
# S09 beam (76–84): breakdown, filtered, then a short build
drums(76, 84, 'tick', 1.0); chords(76, 84, 'pad', 0.5, cut=1300, bright=0.1); arp(78, 84, 0.5, 0.3, 2200)
bass(80, 84, 'pulse8', 0.5, cut=500); put(MUS, riser(tb(4), 300, 5000), tb(80), 0.4)
# S10 attenuation (84–94) + S11 differential absorption (94–104): a new groove
drums(84, 104, 'groove', 0.9); bass(84, 104, 'offbeat', 0.78); chords(84, 104, 'pad', 0.4, cut=2000)
for b in (88, 96): hook(b, 'pluck', 0.8)
arp(96, 104, 0.25, 0.3, 3500)
# S12 detector (104–114): build 2
drums(104, 113.5, 'four', 0.9); bass(104, 114, 'pulse8', 0.8, cut=900); chords(104, 114, 'swell', 0.4, cut=3000)
arp(104, 110, 0.25, 0.38, 4000); arp(110, 114, 0.125, 0.4, 6000)
put(MUS, riser(tb(8), 250, 8000), tb(106), 0.6)
for k in range(16): put(MUS, snare(0.85), tb(112) + (k * S16 if k < 8 else 8 * S16 + (k - 8) * S16 / 2), 0.16 + 0.03 * k, (k % 2 - 0.5) * 0.3)
put(MUS, revcym(BEAT * 0.5), tb(113.5), 0.5)
# S13 radiograph (114–124): DROP 2
drums(114, 124, 'four', 1.05); bass(114, 124, 'reese', 0.9, cut=1800); chords(114, 124, 'stabs', 0.55)
hook(116, 'lead', 1.05); hook(120, 'lead', 1.05); hook(116, 'bell', 0.4, 12); hook(120, 'bell', 0.4, 12)
put(MUS, crash(), tb(114), 0.6, 0, 0.4)
# S14 final (124–130): D major, struck and left to ring
ring = lambda x: x * np.exp(-tv(len(x) / SR) * 0.9)
A_END = tb(124)
put(MUS, ring(supersaw(CH['D'][1] + [74, 78], 3.2, 5200, 0.005)), A_END, 0.9, 0, 0.5)
put(MUS, ring(pad([50, 57, 62, 66, 69], 3.2, 2500, 0.6, att=0.02)), A_END, 0.8, 0, 0.6)
put(MUS, ring(subbass(38, 2.8)), A_END, 0.9); put(MUS, boom(58, 30, 2.0), A_END, 0.8); put(MUS, crash(2.6), A_END, 0.55, 0, 0.5)
drums(124, 128, 'tick', 0.6)

# held breath before each drop: gate the music for the last beat before 22 s and for the last half-beat before 57 s
for a_, b_ in ((tb(43) + 0.02, tb(44)), (tb(113.5) + 0.02, tb(114))):
    for bus in (MUS, PUMP): bus[:, int(a_ * SR):int(b_ * SR)] *= 0.0
# sidechain pump under every kick
g = np.ones(N)
for tk in KICKS:
    s = int(tk * SR); L = min(int(0.28 * SR), N - s)
    if L > 0: g[s:s + L] = np.minimum(g[s:s + L], 1 - 0.6 * np.exp(-np.arange(L) / SR / 0.075))
MUS += PUMP * g
# bullet time in the bremsstrahlung close-up (23.0–23.7 s): the music dips under a low-pass and comes back
a_, b_ = int(23.0 * SR), int(23.9 * SR)
seg = MUS[:, a_:b_].copy()
for i in range(2):
    lo = sweep_lp(seg[i], 9000, 500, 2, 48); hi = sweep_lp(seg[i], 500, 9000, 2, 48)
    w = np.linspace(0, 1, b_ - a_); mix_ = np.where(w < 0.45, lo, hi)
    MUS[i, a_:b_] = mix_

# ---------------------------------------------------------------- sound effects (from the cue sheet)
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def whoosh(d, up=True, f0=300, f1=4000):
    t = tv(d) / d; return sweep_lp(noise(d), f0 if up else f1, f1 if up else f0, 2) * np.sin(np.pi * t) ** 1.5
def crackle(d, rate=120, lo=1500, hi=9000):
    x = np.zeros(int(d * SR) + 2000)
    for _ in range(int(d * rate)): ins(x, bp(noise(0.006), lo, hi) * np.exp(-tv(0.006) * 500) * rng.uniform(0.2, 1), rng.uniform(0, d) * SR)
    return x
def rumble(d, f=110): t = tv(d); return lp(noise(d), f, 4) * 3 * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.6)
def hum(d, f0=73.4, am=0.0):
    t = tv(d); x = sum(np.sin(2 * np.pi * f0 * k * t) / k ** 1.3 for k in range(1, 7))
    return x * (1 + am * np.sin(2 * np.pi * 8 * t)) * env(d, min(0.5, d * 0.2), r=min(0.6, d * 0.3))
def zip_(f0=2000, f1=9000, d=0.06): return np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-tv(d) * 40)
def blipn(m, d=0.12): return S(fm(mf(m), d, 2.0, 1.2, 14) * 0.8, tick(mf(m) * 2, 0.01) * 0.3)
DURS = {'room_tone', 'zoom_rush', 'cut_open', 'tube_hum', 'push_in', 'heat_hum', 'sizzle', 'lattice_in', 'pull_back', 'accel_rise',
        'slowmo_in', 'tension', 'whoosh_e', 'fill_rise', 'pan', 'thermal_rumble', 'anode_spin', 'turn', 'tone_soft', 'drop_down',
        'arrive', 'particles', 'bars', 'follow_data', 'numbers', 'final_tail'}
BEDS = {'room_tone', 'tube_hum', 'heat_hum', 'lattice_in', 'tension', 'anode_spin', 'tone_soft', 'particles', 'slowmo_in'}
blip_i = [0]
def make(name, a):
    d = a if isinstance(a, (int, float)) and name in DURS and a else None
    if name == 'room_tone': dd = d or 2.5; return hum(dd, 60, 0.05) * 0.25 + lp(noise(dd), 600) * env(dd, 0.4, r=0.6) * 0.3, 0.2
    if name == 'type':
        x = np.zeros(int(0.4 * SR))
        for k in range(6): ins(x, tick(rng.uniform(2800, 4200), 0.012) * 0.6, k * 0.05 * SR)
        return x, 0.1
    if name == 'blip': blip_i[0] += 1; return blipn(PENT[(blip_i[0] * 3) % 8 + 3]), 0.4
    if name == 'click':
        return S(tick(1800, 0.015), lp(noise(0.03), 3000) * np.exp(-tv(0.03) * 150) * 0.8, np.sin(phase(sweep(160, 60, 0.12), 0.12)) * np.exp(-tv(0.12) * 25) * 0.9), 0.2
    if name == 'xray_pulse':
        dd = 1.4; x = boom(52, 30, dd) * 1.3; ins(x, sweep_lp(noise(0.6), 6000, 200) * np.exp(-tv(0.6) * 6) * 0.6, 0)
        ins(x, crackle(0.3, 300, 3000, 12000) * 0.5, 0); return x, 0.4
    if name == 'image_ping':
        x = np.zeros(int(1.8 * SR))
        for i, m in enumerate((86, 93, 98)): ins(x, bell(m, 1.4, 2) * 0.45, i * 0.05 * SR)
        return x, 0.7
    if name == 'pop': return np.sin(phase(sweep(500, 1400, 0.09), 0.09)) * np.exp(-tv(0.09) * 25), 0.3
    if name == 'pop_out': return np.sin(phase(sweep(1200, 400, 0.09), 0.09)) * np.exp(-tv(0.09) * 25), 0.3
    if name == 'zoom_rush': dd = d or 1.5; x = whoosh(dd, True, 200, 9000) * 1.1; x += osc('saw', sweep(80, 900, dd), dd) * (tv(dd) / dd) ** 2 * 0.15; return x, 0.4
    if name == 'cut_open': dd = d or 1.4; x = bp(noise(dd), 800, 5000) * np.sin(np.pi * tv(dd) / dd) * 0.5; ins(x, S(tick(900, 0.05), lp(noise(0.08), 1500) * np.exp(-tv(0.08) * 40)), 0.2 * SR); return x, 0.3
    if name == 'tube_hum': dd = d or 4; return hum(dd, 73.4, 0.08) * 0.7 + bp(noise(dd), 3000, 8000) * 0.02, 0.2
    if name == 'hv_charge': dd = 0.9; x = np.sin(phase(sweep(200, 2400, dd), dd)) * (tv(dd) / dd) ** 1.5 * 0.5; ins(x, crackle(0.4, 120, 3000, 9000) * 0.5, 0.5 * SR); return x, 0.3
    if name == 'push_in': dd = d or 1.0; return whoosh(dd, True, 300, 7000), 0.35
    if name == 'heat_hum':
        dd = d or 2.6; t = tv(dd) / dd; f = 60 * (1 + 0.6 * t); x = sum(np.sin(phase(f * k, dd)) / k ** 1.2 for k in range(1, 6)) * 0.5
        return sweep_lp(x + noise(dd) * 0.15, 300, 4000) * env(dd, 0.3, r=0.3), 0.2
    if name == 'sizzle': dd = d or 1.0; return hp(noise(dd), 4000) * env(dd, 0.1, r=0.4) * 0.5 + crackle(dd, 200)[:int(dd * SR)] * 0.5, 0.3
    if name == 'lattice_in':
        dd = d or 2.4; x = np.zeros(int(dd * SR))
        for m in (81, 86, 88, 93): x += np.sin(2 * np.pi * mf(m) * tv(dd)) * 0.1
        return x * env(dd, 0.3, r=0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * tv(dd))), 0.6
    if name == 'e_release': k = int(a or 0); return S(tick(5200, 0.008) * 0.7, blipn(PENT[min(len(PENT) - 1, 2 + k)] + 12, 0.1) * 0.8), 0.3
    if name == 'pull_back': dd = d or 0.8; return whoosh(dd, False, 300, 6000), 0.35
    if name == 'hv_on':
        dd = 1.2; x = boom(70, 40, dd) * 0.9; ins(x, hum(0.9, 110, 0.4) * 0.5, 0); ins(x, crackle(0.25, 400, 2000, 10000) * 0.7, 0); return x, 0.3
    if name == 'accel_rise':
        dd = d or 3.0; t = tv(dd) / dd; f = 90 * (14 ** t)
        x = osc('saw', f, dd) * 0.3 + osc('saw', f * 1.01, dd) * 0.3; return sweep_lp(x, 300, 6000) * t ** 1.3 * 0.7, 0.3
    if name == 'chirp': k = int(a or 0); dd = 0.12; return np.sin(phase(sweep(500 + 60 * k, 3200 + 200 * k, dd), dd)) * np.exp(-tv(dd) * 18), 0.3
    if name == 'hit_tick': k = int(a or 0); return S(fm(mf(PENT[3 + k % 6] + 12), 0.2, 2.76, 3, 12) * 0.7, lp(noise(0.03), 4000) * np.exp(-tv(0.03) * 90) * 0.5), 0.3
    if name == 'slowmo_in':
        dd = d or 3.7; t = tv(dd); x = revcym(0.6); y = np.zeros(int(dd * SR)); ins(y, x, 0)
        y += np.sin(phase(sweep(110, 55, dd), dd)) * env(dd, 0.4, r=0.8) * 0.35; return y, 0.4
    if name == 'tension':
        dd = d or 3.6; t = tv(dd) / dd; x = np.zeros(int(dd * SR))
        for k in range(3): x += osc('saw', sweep(mf(38 + 12 * k), mf(50 + 12 * k), dd), dd) * (0.25 / (k + 1))
        x = sweep_lp(x, 200, 3000) * t ** 1.6 + bp(noise(dd), 400, 3000) * t ** 2.5 * 0.5
        return x * (0.75 + 0.25 * np.sin(2 * np.pi * (4 + 10 * t) * tv(dd))), 0.3
    if name == 'enter': return S(whoosh(0.35, True, 800, 6000) * 0.6, blipn(86, 0.1) * 0.4), 0.4
    if name == 'drop': return boom(50, 26, 1.6) * 1.1, 0.3
    if name == 'whoosh_e': dd = d or 1.0; return S(whoosh(dd, True, 600, 9000) * 0.9, zip_(800, 4000, 0.2) * 0.2), 0.3
    if name == 'bend': dd = 0.5; return np.sin(phase(sweep(900, 300, dd), dd)) * env(dd, 0.02, r=0.2) * 0.6 + whoosh(dd, False, 400, 3000) * 0.4, 0.4
    if name == 'photon':
        E = float(a or 31); m = PENT[min(len(PENT) - 1, int(round((E - 9) / 71 * 10)))] + 12
        x = glass(m, 0.8) * 0.9; ins(x, zip_(2500, 12000, 0.05) * 0.35, 0); ins(x, fm(mf(m + 12), 0.4, 1.0, 0.6, 6) * 0.25, 0); return x, 0.6
    if name == 'fill_rise': dd = d or 0.9; return whoosh(dd, True, 1000, 9000) * 0.5 + np.sin(phase(sweep(600, 1800, dd), dd)) * env(dd, 0.1, r=0.2) * 0.2, 0.5
    if name == 'pan': dd = d or 0.65; return whoosh(dd, True, 400, 5000) * 0.8, 0.3
    if name == 'atom_hit':
        x = S(kick(1.3, 1.4) * 0.9, fm(mf(57), 0.6, 3.5, 6, 4) * 0.5, sat(hp(noise(0.12), 1500) * np.exp(-tv(0.12) * 35), 3) * 0.7); ins(x, crash(1.0) * 0.25, 0); return x, 0.4
    if name == 'vacancy': dd = 0.9; return (np.sin(2 * np.pi * mf(57) * tv(dd)) * 0.5 + np.sin(2 * np.pi * mf(64) * tv(dd)) * 0.3) * env(dd, 0.05, curve=4) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * tv(dd))), 0.5
    if name == 'transition': dd = 0.22; x = np.sin(phase(sweep(1400, 380, dd), dd)) * np.exp(-tv(dd) * 6) * 0.8; ins(x, zip_(300, 1200, 0.05) * 0.4, len(x) - int(0.05 * SR)); return x, 0.5
    if name == 'photon_k':
        x = glass(93, 1.4) * 0.9; ins(x, bell(81, 1.4, 2) * 0.5, 0); ins(x, zip_(3000, 12000, 0.05) * 0.4, 0); return x, 0.7
    if name == 'peak_rise': x = np.zeros(int(1.6 * SR)); ins(x, bell(81, 1.3, 2) * 0.5, 0); ins(x, bell(84, 1.3, 2) * 0.4, 0.18 * SR); return x, 0.6
    if name == 'thermal_rumble': dd = d or 3.8; t = tv(dd); return rumble(dd, 140) * (0.7 + 0.3 * np.sin(2 * np.pi * 2 * t)) + crackle(dd, 60, 800, 5000)[:int(dd * SR)] * 0.4, 0.3
    if name == 'anode_spin':
        dd = d or 3.1; t = tv(dd); f = 150 + 30 * (1 - np.exp(-t * 2)); x = sum(np.sin(phase(f * k, dd)) / k for k in range(1, 5)) * 0.4
        return x * (0.6 + 0.4 * np.sin(2 * np.pi * 16 * t)) * env(dd, 0.3, r=0.5), 0.3
    if name == 'bar_fill': dd = 0.6; return np.sin(phase(sweep(300, 900, dd), dd)) * env(dd, 0.05, r=0.15) * 0.6 + hp(noise(dd), 3000) * env(dd, 0.05, r=0.2) * 0.1, 0.3
    if name == 'turn': dd = d or 1.3; return whoosh(dd, False, 300, 4000) * 0.7, 0.4
    if name == 'heat_tick': return S(crackle(0.08, 300, 1500, 7000)[:int(0.12 * SR)] * 0.8, tick(1200, 0.02) * 0.3), 0.2
    if name == 'energy_pulse': k = int(a or 0); return S(np.sin(phase(sweep(90, 45, 0.18), 0.18)) * np.exp(-tv(0.18) * 14) * 0.8, tick(2400 + 200 * (k % 4), 0.015) * 0.4), 0.2
    if name == 'tone_soft': dd = d or 4; return pad([62, 69, 74], dd, 1500, 0.2) * 0.6, 0.6
    if name == 'shutter':
        x = np.zeros(int(0.35 * SR)); ins(x, S(lp(noise(0.03), 4000) * np.exp(-tv(0.03) * 120), tick(700, 0.04) * 0.8), 0)
        ins(x, S(lp(noise(0.04), 2500) * np.exp(-tv(0.04) * 90), np.sin(phase(sweep(220, 90, 0.08), 0.08)) * np.exp(-tv(0.08) * 30) * 0.8), 0.09 * SR); return x, 0.3
    if name == 'absorb_tick': return S(glass(PENT[int(a or 0) % 6 + 4] + 12, 0.25) * 0.5, tick(5000, 0.01) * 0.3), 0.4
    if name == 'drop_down': dd = d or 0.6; return whoosh(dd, False, 400, 6000) * 0.8, 0.3
    if name == 'arrive': dd = d or 0.7; return whoosh(dd, False, 300, 3000) * 0.6, 0.4
    if name == 'particles':
        dd = d or 4.4; x = np.zeros(int(dd * SR) + 2000)
        for _ in range(int(dd * 30)): ins(x, fm(rng.uniform(1800, 4200), 0.04, 1.4, 1, 30) * rng.uniform(0.1, 0.4), rng.uniform(0, dd) * SR)
        return x, 0.5
    if name == 'pass_tone': return S(glass(81, 0.7) * 0.6, np.sin(phase(sweep(800, 1600, 0.15), 0.15)) * np.exp(-tv(0.15) * 12) * 0.3), 0.5
    if name == 'absorb': return S(np.sin(phase(sweep(220, 70, 0.25), 0.25)) * np.exp(-tv(0.25) * 12) * 0.9, lp(noise(0.05), 1200) * np.exp(-tv(0.05) * 60) * 0.5, fm(mf(62), 0.3, 1.5, 1, 8) * 0.3), 0.3
    if name == 'scatter': return S(np.sin(phase(sweep(1200, 2600, 0.12), 0.12)) * np.exp(-tv(0.12) * 14) * 0.7, glass(88, 0.5) * 0.4), 0.5
    if name == 'interact':
        if a: return S(np.sin(phase(sweep(200, 80, 0.15), 0.15)) * np.exp(-tv(0.15) * 18) * 0.6, tick(1500, 0.01) * 0.3), 0.2
        return S(np.sin(phase(sweep(1500, 2500, 0.08), 0.08)) * np.exp(-tv(0.08) * 25) * 0.5), 0.4
    if name == 'micro_in': x = whoosh(0.5, True, 1000, 8000) * 0.5; ins(x, bell(93, 1.0, 1.5) * 0.3, 0.2 * SR); return x, 0.5
    if name == 'bars':
        dd = d or 1.0; x = np.zeros(int((dd + 0.5) * SR))
        for i in range(8): ins(x, blipn(PENT[i + 2] + 12, 0.1) * 0.5, i * dd / 8 * SR)
        return x, 0.4
    if name == 'count_tick': return S(tick(4200 if a else 3600, 0.012) * 0.7, blipn(PENT[7 if a else 9] + 12, 0.08) * 0.4), 0.3
    if name == 'follow_data':
        dd = d or 1.4; x = whoosh(dd, True, 500, 8000) * 0.5; tt = 0.0
        while tt < dd: ins(x, osc('sq', rng.choice([1200, 1600, 2400, 3200]), 0.02) * np.exp(-tv(0.02) * 80) * 0.15, tt * SR); tt += 0.035
        return x, 0.3
    if name == 'detect_tick': return S(glass(PENT[(int(a or 0) * 2) % 6 + 5] + 12, 0.3) * 0.5, tick(6000, 0.008) * 0.4, zip_(4000, 9000, 0.03) * 0.2), 0.5
    if name == 'readout_click': k = int(a or 0); return S(osc('sq', 1500 + 300 * k, 0.03) * np.exp(-tv(0.03) * 70) * 0.35, tick(900, 0.02) * 0.6), 0.2
    if name == 'signal_pulse': v = float(a or 2000); f = 60 + v / 4095 * 60; return S(np.sin(phase(sweep(f * 2, f, 0.2), 0.2)) * np.exp(-tv(0.2) * 12) * 0.8, osc('sq', 2000 + v / 2, 0.04) * np.exp(-tv(0.04) * 60) * 0.2), 0.2
    if name == 'drop2': return boom(52, 26, 1.6) * 1.1, 0.3
    if name == 'numbers':
        dd = d or 0.6; x = np.zeros(int(dd * SR) + 2000); tt = 0.0
        while tt < dd: ins(x, osc('sq', rng.choice([800, 1200, 1600, 2400]), 0.025) * np.exp(-tv(0.025) * 60) * 0.25, tt * SR); tt += 0.03
        return x, 0.3
    if name == 'sweep': k = int(a or 0); dd = 0.45; return np.sin(phase(sweep(300 * (1.4 ** k), 1200 * (1.4 ** k), dd), dd)) * env(dd, 0.02, r=0.1) * 0.35, 0.4
    if name == 'pixel_click': k = int(a or 0) // 10; return S(osc('sq', 2000 + 400 * k, 0.02) * np.exp(-tv(0.02) * 90) * 0.3, tick(5000 + 500 * k, 0.006) * 0.4), 0.2
    if name == 'complete':
        x = np.zeros(int(1.8 * SR))
        for i, m in enumerate((74, 78, 81, 86)): ins(x, bell(m + 12, 1.4, 2.2) * 0.45, i * 0.06 * SR)
        ins(x, np.sin(phase(sweep(400, 1600, 0.4), 0.4)) * env(0.4, 0.05, r=0.1) * 0.25, 0); return x, 0.7
    if name == 'resolve': return boom(46, 26, 2.2) * 0.7, 0.4
    if name == 'chain': k = int(a or 0); return bell([74, 78, 81, 86, 90, 93][k % 6], 1.0, 2.0) * 0.6, 0.6
    if name == 'final_tail':
        dd = d or 0.75; x = np.zeros(int((dd + 1.6) * SR))
        for i, m in enumerate((86, 90, 93, 98)): ins(x, bell(m, 1.8, 2.2) * 0.35, (0.05 + i * 0.12) * SR)
        return x, 0.8
    raise KeyError(name)
missing = set(); stamp = {}
GAIN = {'blip': 0.55, 'type': 0.5, 'interact': 1.0, 'pixel_click': 0.7, 'count_tick': 0.9, 'detect_tick': 1.2, 'absorb_tick': 0.8, 'heat_tick': 1.2,
        'readout_click': 1.4, 'signal_pulse': 1.3, 'energy_pulse': 1.4, 'photon': 1.1, 'resolve': 0.0, 'final_tail': 0.7, 'xray_pulse': 0.8, 'zoom_rush': 0.8}
for cu in cuesheet['cues']:
    key = (cu['sfx'], round(cu['t'] / S16))                       # never stack the same effect twice on one 16th
    if key in stamp and cu['sfx'] not in ('photon',): continue
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
print(f'integrated loudness {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS, {mix.shape[1] / SR:.2f} s')
sf.write(OUT, mix.T.astype(np.float32), SR, subtype='PCM_24')
print('->', OUT)
