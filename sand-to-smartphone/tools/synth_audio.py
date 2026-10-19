#!/usr/bin/env python3
"""Score + sound design for "From Sand to Smartphone" — pure code synthesis, no samples.

  uv run --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json build/score.wav

One 120 BPM grid (beat 0.5 s, bar 2 s) is shared with the picture: scene changes, beat-locked events and the
music all sit on it. Sound effects come from the cue sheet the renderer exports (tools/render.py --cues).
Method follows the huashu-art-motion skill's references/05 and the synth template: grid first, one short motif that
changes instrument per section, hard section starts, effects aligned to picture events, then loudness alignment.
"""
import json, sys
import numpy as np
import scipy.signal as ss
import soundfile as sf

SR = 48000
BEAT = 0.5; BAR = 2.0
cuesheet = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
TOTAL = cuesheet['total']
N = int(TOTAL * SR) + SR                     # one second of tail room, trimmed at the end
MUS = np.zeros((2, N)); SFX = np.zeros((2, N)); VERB = np.zeros((2, N))
rng = np.random.default_rng(2026)

# ---------------------------------------------------------------- helpers
def tv(d): return np.arange(max(1, int(d * SR))) / SR
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def put(bus, sig, t, g=1.0, pan=0.0, verb=0.0):
    s = int(round(t * SR))
    if s >= N or len(sig) == 0: return
    if s < 0: sig = sig[-s:]; s = 0
    sig = sig[:N - s] * g
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    bus[0, s:s + len(sig)] += sig * np.cos(a); bus[1, s:s + len(sig)] += sig * np.sin(a)
    if verb: VERB[0, s:s + len(sig)] += sig * np.cos(a) * verb; VERB[1, s:s + len(sig)] += sig * np.sin(a) * verb
def env(d, a=0.005, r=None, curve=6.0):
    t = tv(d); e = np.minimum(1, t / max(a, 1e-4))
    return e * np.exp(-curve * t / d) if r is None else e * np.clip((d - t) / max(r, 1e-4), 0, 1)
def adsr(d, a=0.01, dec=0.1, s=0.7, r=0.1):
    t = tv(d + r); e = np.where(t < a, t / a, np.where(t < a + dec, 1 - (1 - s) * (t - a) / dec, s))
    rel = t > d; e[rel] = s * np.clip(1 - (t[rel] - d) / r, 0, 1); return e
def sos(kind, f, order=2):
    nyq = SR / 2
    if kind == 'bp': return ss.butter(order, [max(20, f[0]) / nyq, min(f[1], nyq * 0.95) / nyq], 'band', output='sos')
    return ss.butter(order, min(f, nyq * 0.95) / nyq, kind, output='sos')
def lp(x, f, o=2): return ss.sosfilt(sos('low', f, o), x)
def hp(x, f, o=2): return ss.sosfilt(sos('high', f, o), x)
def bp(x, lo, hi, o=2): return ss.sosfilt(sos('bp', (lo, hi), o), x)
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
def S(*xs):                                    # sum signals of different lengths (pads the shorter ones)
    L = max(len(x) for x in xs); out = np.zeros(L)
    for x in xs: out[:len(x)] += x
    return out
def ins(x, b, s):                              # add b into x at sample s, clipped to x
    s = int(s)
    if s >= len(x): return
    n = min(len(b), len(x) - s); x[s:s + n] += b[:n]
def fm(f, d, ratio=3.5, idx=4.0, dec=3.0):
    t = tv(d); I = idx * np.exp(-dec * 1.6 * t)
    return np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-dec * t)

# ---------------------------------------------------------------- instruments (music)
def kick(g=1.0):
    t = tv(0.32); f = 46 + 120 * np.exp(-t * 32)
    return (np.sin(phase(f, 0.32)) * np.exp(-t * 8) + 0.3 * hp(noise(0.32), 2000) * np.exp(-t * 90)) * g
def clap():
    x = np.zeros(int(0.25 * SR))
    for o in (0, 0.011, 0.022): b = bp(noise(0.03), 900, 5000) * np.exp(-tv(0.03) * 120); s = int(o * SR); ins(x, b, s)
    x += bp(noise(0.25), 900, 4000) * np.exp(-tv(0.25) * 16) * 0.6
    return x
def snare():
    t = tv(0.22); return bp(noise(0.22), 1200, 6500) * np.exp(-t * 20) + 0.5 * np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30)
def hat(open_=False):
    d = 0.22 if open_ else 0.045; return hp(noise(d), 7000, 4) * np.exp(-tv(d) * (14 if open_ else 80))
def shaker(): return bp(noise(0.06), 4000, 11000) * env(0.06, 0.01, curve=5)
def clank(f=520):                                  # industrial metal hit (inharmonic FM)
    return S(fm(f, 0.35, ratio=2.76, idx=6, dec=9) * 0.6, bp(noise(0.05), 2000, 6000) * np.exp(-tv(0.05) * 60) * 0.4)
def tom(f=120):
    t = tv(0.3); return np.sin(phase(f * (1 + 0.6 * np.exp(-t * 20)), 0.3)) * np.exp(-t * 9)
def cbass(m, d):                                   # chiptune pulse bass + sub
    f = mf(m); x = 0.55 * osc('sq', f, d, 0.25) + 0.6 * osc('sin', f / 2, d)
    return lp(x, 1400) * adsr(d, 0.004, 0.08, 0.65, 0.04)[:len(x)]
def sawbass(m, d, cut=900):
    f = mf(m); x = osc('saw', f, d) + 0.7 * osc('sin', f / 2, d)
    t = tv(d); x = lp(x, cut) * (0.6 + 0.4 * np.exp(-t * 8)); return x * adsr(d, 0.005, 0.1, 0.7, 0.05)[:len(x)]
def subdrone(m, d): f = mf(m); return osc('sin', f, d) * env(d, 0.3, r=0.5) + 0.25 * osc('tri', f * 2, d) * env(d, 0.3, r=0.5)
def pad(ms, d, cut=1800, bright=0.0):
    x = np.zeros(int(d * SR))
    for m in ms:
        for det in (-0.08, 0.0, 0.08): x += osc('saw', mf(m + det), d) * 0.33 + osc('tri', mf(m + det), d) * 0.2
    x = lp(x, cut + 2500 * bright); return x * env(d, min(0.6, d * 0.3), r=min(0.8, d * 0.4)) / max(1, len(ms))
def bell(m, d=1.4, idx=3.5): return fm(mf(m), d, ratio=3.5, idx=idx, dec=2.2 / d * 1.2) * 0.8 + fm(mf(m) * 2, d, ratio=1.0, idx=1, dec=4) * 0.15
def pluck(m, d=0.25, duty=0.125):
    f = mf(m); x = osc('sq', f, d, duty) * np.exp(-tv(d) * 10); return lp(x, 5000)
def lead(m, d, duty=0.5):
    t = tv(d); f = mf(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) * 4, 0, 1))
    return lp(osc('sq', f, d, duty), 4200) * adsr(d, 0.01, 0.12, 0.6, 0.08)[:len(t)]
def supersaw(ms, d, cut=3000):
    x = np.zeros(int(d * SR))
    for m in ms:
        for det in (-0.18, -0.09, 0, 0.09, 0.18): x += osc('saw', mf(m + det), d)
    x = lp(x, cut); return x * env(d, 0.02, r=min(0.5, d * 0.5)) / (5 * len(ms))

# ---------------------------------------------------------------- arrangement (bar = 2 s; chords per bar)
CH = {'Am': (57, [57, 60, 64]), 'F': (53, [53, 57, 60]), 'C': (48, [55, 60, 64]), 'G': (55, [55, 59, 62]), 'Em': (52, [52, 55, 59]),
      'Dm': (50, [50, 53, 57]), 'E': (52, [52, 56, 59]), 'Csus': (48, [55, 60, 62, 67])}
# (start bar, chords, drums, bass, top) — top: arp / bells / lead / none
# section starts sit on the picture's scene changes (bar 33.5 = 67 s, 65.5 = 131 s, 70.5 = 141 s, 91.5 = 183 s)
SECTIONS = [
    (0, ['Am', 'Am', 'Am'], 'none', 'drone', 'intro'),                                        # S01–S02  sand, lattice
    (3, ['Am', 'F', 'C', 'G', 'Am'], 'soft', 'pulse8', 'pluck8'),                              # S02–S03
    (8, ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E', 'Am'], 'industrial', 'saw8', 'none'),     # S04–S06  furnace
    (17, ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'], 'four', 'pulse8', 'bells16'),  # S07–S09  purification
    (27, ['C', 'G', 'Am', 'F', 'C', 'G', 'Am'], 'half', 'drone', 'bellsWide'),                 # S10–S11  crystal
    (33.5, ['Am', 'Am', 'F', 'G', 'Am', 'F', 'G'], 'tight', 'syncop', 'pluck16'),             # S12–S13  wafering
    (40, ['F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am'], 'four', 'pulse8', 'leadMotif'),          # S14–S16  fab
    (48, ['Am', 'F', 'C', 'G'] * 3, 'drive', 'oct16', 'euv'),                                   # S17–S20  EUV
    (60, ['Dm', 'Am', 'Dm', 'E', 'Am', 'Am'], 'industrial', 'saw8', 'pluck8'),                 # S21–S22  etch, implant
    (65.5, ['Am', 'F', 'C', 'G', 'Am'], 'none', 'drone', 'breakdown'),                         # S23      transistor
    (70.5, ['Am', 'F', 'G', 'G'], 'build', 'pulse8', 'riserArp'),                              # S24      layers
    (74, ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am'], 'four', 'syncop', 'pluckMotif'),   # S25–S28 back end
    (85, ['F', 'G', 'Am'], 'soft', 'drone', 'pads'),                                            # S29      assembly
    (88, ['E', 'E', 'E', 'E'], 'tick', 'droneE', 'none'),                                       # S29      power on, boot
    (91.5, ['Csus', 'C', 'G', 'Am', 'F', 'C'], 'finale', 'drone', 'finale'),                    # S30      finale
]
def chord_at(bar):
    for i, (b0, chs, *_rest) in enumerate(SECTIONS):
        b1 = SECTIONS[i + 1][0] if i + 1 < len(SECTIONS) else 1e9
        if b0 <= bar < b1: return chs[min(len(chs) - 1, int(bar - b0))]
    return 'C'
MOTIF = [(0, 0.5, 2), (0.5, 0.5, 4), (1.0, 1.0, 7)]       # (beat offset, beats, scale-ish step above chord root) — ♪♪♩ rising

def drums(kind, t0, bar_i):
    for s in range(16):
        t = t0 + s * BEAT / 4
        if kind == 'soft':
            if s in (0, 8) and bar_i >= 1: put(MUS, kick(0.7), t, 0.55)
            if s in (4, 12): put(MUS, hat(), t, 0.10, 0.3)
        elif kind in ('four', 'drive', 'industrial', 'finale'):
            if s % 4 == 0: put(MUS, kick(), t, 0.62)
            if s in (4, 12): put(MUS, clap() if kind != 'industrial' else snare(), t, 0.22 if kind != 'drive' else 0.26, 0.05, 0.25)
            if s % 4 == 2: put(MUS, hat(kind == 'finale'), t, 0.13, 0.25)
            if kind == 'drive' and s % 2 == 1: put(MUS, hat(), t, 0.06, -0.3)
            if kind == 'drive' and s == 14: put(MUS, kick(0.7), t, 0.4)
            if kind == 'industrial' and s % 4 == 2: put(MUS, clank(480 + 60 * (s // 4)), t, 0.12, -0.35, 0.3)
            if kind == 'industrial' and bar_i % 4 == 3 and s in (12, 13, 14, 15): put(MUS, tom(160 - 18 * (s - 12)), t, 0.3, 0.2)
        elif kind == 'half':
            if s == 0: put(MUS, kick(), t, 0.55)
            if s == 8: put(MUS, clap(), t, 0.2, 0, 0.3)
            if s % 4 == 2: put(MUS, hat(), t, 0.1, 0.25)
        elif kind == 'tight':
            if s in (0, 6, 8): put(MUS, kick(), t, 0.55)
            if s in (4, 12): put(MUS, snare(), t, 0.16, 0.1, 0.2)
            put(MUS, shaker(), t, 0.05 + 0.03 * (s % 2 == 0), -0.2 + 0.4 * (s % 2))
        elif kind == 'build':
            if s % 4 == 0: put(MUS, kick(), t, 0.55)
            dens = 4 if bar_i < 2 else 2 if bar_i < 3 else 1
            if s % dens == 0: put(MUS, snare(), t, 0.08 + 0.05 * bar_i + 0.01 * s, 0.1)
        elif kind == 'tick':
            rate = [4, 4, 2, 1][min(3, bar_i)]
            if s % rate == 0: put(MUS, hat(), t, 0.03 + 0.02 * bar_i, 0.3 * ((s // rate) % 2 * 2 - 1))
def bassline(kind, t0, ch, bar_i):
    root = CH[ch][0] - 12
    if kind == 'drone': put(MUS, subdrone(root, BAR + 0.4), t0, 0.32)
    elif kind == 'droneE': put(MUS, subdrone(40, BAR + 0.4), t0, 0.14 + 0.04 * bar_i)
    elif kind == 'pulse8':
        for s in range(8): put(MUS, cbass(root + (12 if s in (3, 7) else 0), BEAT / 2 * 0.9), t0 + s * BEAT / 2, 0.3)
    elif kind == 'saw8':
        for s in range(8): put(MUS, sawbass(root, BEAT / 2 * 0.85, 700), t0 + s * BEAT / 2, 0.3)
    elif kind == 'syncop':
        for s in (0, 3, 6, 8, 11, 14): put(MUS, cbass(root + (12 if s in (6, 14) else 0), BEAT / 4 * 1.6), t0 + s * BEAT / 4, 0.32)
    elif kind == 'oct16':
        for s in range(16): put(MUS, sawbass(root + (12 if s % 2 else 0), BEAT / 4 * 0.8, 1300), t0 + s * BEAT / 4, 0.27)
def top(kind, t0, ch, bar_i, b0):
    notes = CH[ch][1]
    if kind == 'intro':
        put(MUS, pad([n - 12 for n in CH['Am'][1]], BAR + 0.8, 1200), t0, 0.22, 0, 0.4)
        if bar_i >= 1:
            for (bo, bl, st) in MOTIF: put(MUS, bell(57 + 12 + st, 1.6, 2.5), t0 + bo * BEAT, 0.09, 0.2, 0.6)
    elif kind == 'pluck8':
        put(MUS, pad([n - 12 for n in notes], BAR, 1000), t0, 0.12, 0, 0.3)
        for s in range(8): put(MUS, pluck(notes[s % 3] + 12, 0.22), t0 + s * BEAT / 2, 0.07, -0.3 + 0.6 * (s % 2), 0.3)
    elif kind == 'bells16':
        put(MUS, pad(notes, BAR, 1600), t0, 0.1, 0, 0.3)
        seq = [0, 1, 2, 1, 2, 3, 2, 1]
        for s in range(16): n = notes[seq[s % 8] % 3] + 12 * (1 + seq[s % 8] // 3); put(MUS, bell(n + 12, 0.5, 2.0), t0 + s * BEAT / 4, 0.05, -0.4 + 0.8 * ((s * 5) % 16) / 15, 0.35)
        if bar_i % 2 == 0:
            for (bo, bl, st) in MOTIF: put(MUS, bell(notes[0] + 12 + st, 1.4, 3.5), t0 + bo * BEAT + BEAT * 2, 0.08, 0, 0.5)
    elif kind == 'bellsWide':
        put(MUS, pad(notes + [notes[0] + 12], BAR + 0.4, 2200, 0.3), t0, 0.13, 0, 0.5)
        for s in range(8): put(MUS, bell(notes[s % 3] + 24 - (s // 3) * 12 % 24, 1.2, 3), t0 + s * BEAT / 2, 0.055, -0.5 + s / 7, 0.6)
    elif kind == 'pluck16':
        for s in range(16): put(MUS, pluck(notes[(s * 2) % 3] + 12 + 12 * (s % 4 == 3), 0.12, 0.25), t0 + s * BEAT / 4, 0.055, 0.35 * (1 if s % 2 else -1), 0.2)
    elif kind == 'leadMotif':
        put(MUS, pad(notes, BAR + 0.3, 2000, 0.4), t0, 0.12, 0, 0.5)
        if bar_i % 2 == 0:
            for (bo, bl, st) in MOTIF: put(MUS, lead(notes[0] + 12 + st, bl * BEAT * 0.9), t0 + bo * BEAT, 0.07, 0.15, 0.35)
        else:
            for (bo, bl, st) in MOTIF: put(MUS, lead(notes[0] + 12 + st + 5, bl * BEAT * 0.9, 0.25), t0 + bo * BEAT + BEAT * 2, 0.06, -0.15, 0.35)
    elif kind == 'euv':
        put(MUS, supersaw(notes, BAR, 2600 + 300 * (bar_i % 4)), t0, 0.13, 0, 0.35)
        arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[0] + 24]
        for s in range(16): put(MUS, pluck(arp[s % 4], 0.11, 0.5 if s % 2 else 0.25), t0 + s * BEAT / 4, 0.05, 0.4 * np.sin(s), 0.25)
        if bar_i % 4 == 2:
            for (bo, bl, st) in MOTIF: put(MUS, lead(notes[0] + 24 + st, bl * BEAT * 0.9), t0 + bo * BEAT, 0.055, 0, 0.4)
    elif kind == 'breakdown':
        put(MUS, pad(notes, BAR + 0.5, 900 + 250 * bar_i), t0, 0.15, 0, 0.6)
        for s in (0, 3, 6): put(MUS, bell(notes[s // 3] + 12, 1.5, 2), t0 + s * BEAT / 2, 0.05, -0.3 + 0.3 * (s // 3), 0.7)
    elif kind == 'riserArp':
        for s in range(16): put(MUS, pluck(notes[s % 3] + 12 + 12 * (s // 8) + bar_i * 2, 0.1, 0.25), t0 + s * BEAT / 4, 0.04 + 0.015 * bar_i, 0.4 * np.sin(s * 1.3), 0.3)
    elif kind == 'pluckMotif':
        put(MUS, pad(notes, BAR, 1500), t0, 0.09, 0, 0.3)
        for s in range(8): put(MUS, pluck(notes[(s + bar_i) % 3] + 12, 0.18, 0.25), t0 + s * BEAT / 2, 0.055, -0.3 + 0.6 * (s % 2), 0.3)
        if bar_i % 2 == 1:
            for (bo, bl, st) in MOTIF: put(MUS, bell(notes[0] + 24 + st, 0.9, 2.5), t0 + bo * BEAT + 2 * BEAT, 0.06, 0.2, 0.4)
    elif kind == 'pads':
        put(MUS, pad(notes + [notes[0] + 12], BAR + 0.6, 1100 - 200 * bar_i), t0, 0.14 - 0.03 * bar_i, 0, 0.6)
    elif kind == 'finale':
        put(MUS, supersaw(notes + [notes[0] + 12], BAR + (2.5 if bar_i == 5 else 0.3), 3200 if bar_i < 5 else 2000), t0, 0.12, 0, 0.5)
        put(MUS, pad([n - 12 for n in notes], BAR + (3 if bar_i == 5 else 0.4), 1500, 0.5), t0, 0.12, 0, 0.5)
        if bar_i in (1, 3):
            for (bo, bl, st) in MOTIF: put(MUS, lead(notes[0] + 12 + st, bl * BEAT * 0.95), t0 + bo * BEAT, 0.07, 0, 0.5)
        if bar_i == 5:
            for i, m in enumerate([72, 76, 79, 84]): put(MUS, bell(m, 2.5, 3), t0 + i * 0.12, 0.07, -0.3 + 0.2 * i, 0.8)

# each section renders into its own buffer and is cut (150 ms release) where the next one starts:
# hard section starts that land exactly on the scene changes, even mid-bar
MUS_MAIN, VERB_MAIN = MUS, VERB
SEC, SECV = np.zeros((2, N)), np.zeros((2, N))
for i, (b0, chs, dk, bk, tk) in enumerate(SECTIONS):
    b1 = SECTIONS[i + 1][0] if i + 1 < len(SECTIONS) else 97.5
    SEC[:] = 0; SECV[:] = 0; MUS, VERB = SEC, SECV
    for bi in range(int(np.ceil(b1 - b0))):
        t0 = (b0 + bi) * BAR
        if t0 >= min(TOTAL, b1 * BAR) - 1e-6: break
        ch = chs[min(len(chs) - 1, bi)]
        drums('none' if (dk == 'finale' and bi >= 5) else dk, t0, bi); bassline(bk, t0, ch, bi); top(tk, t0, ch, bi, b0)
    MUS, VERB = MUS_MAIN, VERB_MAIN
    if i + 1 < len(SECTIONS):
        e, r = int(b1 * BAR * SR), int(0.15 * SR)
        g = np.ones(N); g[e:e + r] = np.linspace(1, 0, r); g[e + r:] = 0
        SEC *= g; SECV *= g
    MUS += SEC; VERB += SECV
del SEC, SECV
# the finale's downbeats: startup (183) and title (185) get a kick + air
put(MUS, kick(1.2), 183.0, 0.75); put(MUS, hp(noise(2.0), 3000) * np.exp(-tv(2.0) * 2.2), 183.0, 0.12, 0, 0.6)
put(MUS, kick(1.2), 185.0, 0.7); put(MUS, hp(noise(1.6), 3000) * np.exp(-tv(1.6) * 2.5), 185.0, 0.1, 0, 0.6)

# ---------------------------------------------------------------- sound effects
def whoosh(d=0.6, up=True, lo=300, hi=5000):
    x = noise(d); t = tv(d) / d; cen = lo * (hi / lo) ** (t if up else 1 - t)
    out = np.zeros_like(x)
    for k in range(8):                                     # piecewise band-pass sweep
        a, b = int(k * len(x) / 8), int((k + 1) * len(x) / 8); c = float(cen[(a + b) // 2])
        out[a:b] = bp(x, c * 0.6, c * 1.6)[a:b]
    return out * np.sin(np.pi * t) ** 1.5
def crackle(d, dens=300, lo=1500, hi=9000):
    x = np.zeros(int(d * SR)); n = int(dens * d)
    idx = rng.integers(0, len(x), n); x[idx] = rng.standard_normal(n) * 3
    return bp(x, lo, hi)
def blip(m, d=0.06, duty=0.25): return pluck(m, d, duty)
def tick(f=2500, d=0.03): return bp(noise(d), f * 0.7, f * 1.4) * np.exp(-tv(d) * 160) + 0.3 * np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 120)
def thump(f=80, d=0.25): t = tv(d); return np.sin(phase(f * (1 + np.exp(-t * 30)), d)) * np.exp(-t * 12)
def motor(f, d, wob=0.02): t = tv(d); fc = float(np.mean(f)) * 4; return lp(osc('saw', f * (1 + wob * np.sin(2 * np.pi * 3 * t)), d), fc) * env(d, 0.1, r=0.2)
def hiss(d, lo=2000, hi=9000): return bp(noise(d), lo, hi) * env(d, 0.05, r=d * 0.4)
def bubbles(d, rate=12):
    x = np.zeros(int(d * SR) + SR // 5)
    for k in range(int(rate * d)):
        t0 = rng.uniform(0, d); bd = rng.uniform(0.03, 0.07); f0 = rng.uniform(250, 600)
        b = np.sin(phase(sweep(f0, f0 * 2.2, bd), bd)) * np.sin(np.pi * tv(bd) / bd)
        s = int(t0 * SR); ins(x, b * rng.uniform(0.4, 1), s)
    return lp(x, 3000)
def rumble(d, f=110):
    t = tv(d); return (lp(noise(d), f, 4) * 6 + 0.5 * np.sin(2 * np.pi * 42 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * t)) * env(d, 0.4, r=0.6)
def hum(d, f=100): t = tv(d); return sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 2, 3, 5)) * env(d, 0.2, r=0.4) * 0.5
def zap(f0, f1, d, kind='sq'): return lp(osc(kind, sweep(f0, f1, d), d), 7000) * np.exp(-tv(d) * 5 / d)

SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103]   # A minor pentatonic, rising
def make(name, arg):
    a = arg if arg is not None else 0
    d = float(arg) if isinstance(arg, (int, float)) and arg and name in DURS else None
    if name == 'grain':
        x = np.zeros(int(0.09 * SR))
        for k in range(5): b = tick(rng.uniform(3000, 7000), 0.012); s = int(rng.uniform(0, 0.07) * SR); ins(x, b * rng.uniform(0.3, 1), s)
        return x, 0.0
    if name == 'wind': return bp(noise(d or 6), 250, 1500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * tv(d or 6))) * env(d or 6, 1.0, r=1.5), 0.2
    if name == 'glint': return S(fm(mf(98), 0.9, 2.0, 2.5, 3), 0.5 * fm(mf(103), 0.7, 3.0, 1.5, 4)) * 0.6, 0.6
    if name == 'type':
        x = np.zeros(int(0.12 * SR))
        for k in range(3): b = blip(84 + int(rng.integers(0, 5)), 0.022, 0.5); s = int(k * 0.035 * SR); ins(x, b, s)
        return x, 0.1
    if name == 'riser':
        dd = d or 1.2; t = tv(dd) / dd
        return (whoosh(dd, True, 300, 7000) * 0.8 + 0.3 * osc('saw', sweep(180, 720, dd), dd) * t ** 2) * t, 0.3
    if name == 'shimmer': dd = d or 4; return sum(np.sin(2 * np.pi * mf(m) * tv(dd)) for m in (88, 91, 95)) * 0.15 * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * tv(dd))) * env(dd, 0.8, r=1.0), 0.6
    if name == 'crystal': return bell(int(a or 76), 1.6, 3.0), 0.6
    if name == 'conveyor':
        dd = d or 5; x = 0.4 * hum(dd, 60)
        for k in range(int(dd * 8)): b = tick(rng.uniform(900, 1600), 0.025); s = int(k * SR / 8); ins(x, b * 0.5, s)
        return x, 0.1
    if name == 'clunk': return S(thump(70, 0.3), 0.4 * bp(noise(0.08), 300, 1500) * np.exp(-tv(0.08) * 50)), 0.15
    if name in ('rumble', 'rumble_in'): return rumble(d or 6), 0.1
    if name == 'hum': return hum(d or 6, 100) * 0.6, 0.1
    if name == 'arc': return crackle(0.18, 900, 1500, 9000) * np.exp(-tv(0.18) * 10) + 0.3 * hum(0.18, 100), 0.2
    if name == 'heat': return lp(noise(d or 6), 700) * 2 * env(d or 6, 0.5, r=1.0), 0.1
    if name == 'pop': return S(np.sin(phase(sweep(650, 1300, 0.05), 0.05)) * np.sin(np.pi * tv(0.05) / 0.05), tick(3000, 0.02)), 0.25
    if name == 'bubble': return bubbles(0.4, 10), 0.2
    if name == 'liquid': t = tv(0.5); return (np.sin(phase(110 + 30 * np.sin(2 * np.pi * 9 * t), 0.5)) * 0.6 + bp(noise(0.5), 300, 1200) * 0.5) * env(0.5, 0.03), 0.3
    if name == 'pour': dd = d or 3; t = tv(dd); return bp(noise(dd), 400, 2200) * (0.7 + 0.3 * np.abs(np.sin(2 * np.pi * 13 * t))) * env(dd, 0.2, r=0.5) + 0.3 * bubbles(dd, 6)[:int(dd * SR)], 0.2
    if name == 'sizzle': return crackle(d or 3, 500, 3000, 11000) * env(d or 3, 0.2, r=0.6), 0.1
    if name == 'crunch': return S(lp(noise(0.18), 1600) * np.exp(-tv(0.18) * 22) * 1.5, crackle(0.18, 120, 800, 5000) * 0.5, thump(60, 0.2) * 0.6), 0.15
    if name in ('bubbling', 'distill'): return bubbles(d or 4, 14 if name == 'bubbling' else 8) * 0.8, 0.3
    if name == 'lens': return np.sin(phase(sweep(600, 950, 0.09), 0.09)) * np.sin(np.pi * tv(0.09) / 0.09) * 0.7, 0.4
    if name == 'snap': return S(tick(4200, 0.02) * 1.4, thump(140, 0.08) * 0.5), 0.15
    if name in ('whoosh', 'whip'): return whoosh(0.25 if name == 'whip' else min(0.8, d or 0.6), True, 300, 6000), 0.25
    if name == 'whoosh_out': return whoosh(min(1.0, d or 0.8), False, 250, 5000), 0.25
    if name == 'dive': dd = min(1.2, d or 0.9); return S(whoosh(dd, True, 200, 7000) * 0.8, np.concatenate([np.zeros(int(dd * 0.75 * SR)), thump(55, 0.4) * 0.8])), 0.3
    if name == 'scan': return whoosh(0.8, True, 800, 9000) * 0.6 + 0.2 * osc('sq', sweep(300, 1200, 0.8), 0.8) * env(0.8, 0.05), 0.3
    if name == 'gas_hiss': return hiss(d or 4, 2500, 9000) * 0.6, 0.2
    if name == 'punch': return S(whoosh(0.3, True, 500, 6000) * 0.7, np.concatenate([np.zeros(int(0.22 * SR)), thump(70, 0.25)])), 0.2
    if name == 'tick': return S(tick(2400 + 200 * a, 0.04) * 0.8, bell(96 + int(a) % 5, 0.3, 1.5) * 0.25), 0.4
    if name == 'blip': return blip(84 + [0, 4, 7, 12][int(a) % 4], 0.12, 0.25) * 0.8, 0.3
    if name == 'clink': return fm(rng.uniform(1100, 1600), 0.25, 2.4, 4, 12) * 0.7, 0.25
    if name == 'drop': return S(np.sin(phase(sweep(1600, 700, 0.06), 0.06)) * np.sin(np.pi * tv(0.06) / 0.06), thump(120, 0.12) * 0.4), 0.25
    if name == 'heat_rise': dd = d or 3.6; t = tv(dd) / dd; return (hum(dd, 100) * 0.5 + lp(noise(dd), 900) * 1.5) * t, 0.15
    if name == 'melt': dd = d or 2.6; return (bubbles(dd, 5)[:int(dd * SR)] * 0.6 + lp(noise(dd), 500) * 1.5) * env(dd, 0.4, r=0.8), 0.2
    if name == 'winch': return motor(140, d or 1.2) * 0.5, 0.1
    if name == 'touch': return S(bell(84, 2.0, 3), bell(91, 2.0, 2) * 0.6, thump(200, 0.1) * 0.3), 0.7
    if name == 'grow': dd = d or 4.4; return pad([69, 76, 81], dd, 2500, 0.5) * 0.6, 0.5
    if name == 'grind': dd = d or 3; t = tv(dd); return bp(noise(dd), 900, 4500) * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t)) * env(dd, 0.1, r=0.3) + 0.3 * motor(90, dd), 0.15
    if name == 'saw': return S(bp(noise(0.07), 2200, 6000) * np.exp(-tv(0.07) * 40), 0.3 * fm(2600, 0.1, 1.41, 2, 25)), 0.2
    if name == 'polish': dd = d or 3.8; t = tv(dd); return (lp(noise(dd), 1200) * 1.6 * (0.7 + 0.3 * np.sin(2 * np.pi * 1.6 * t)) + 0.3 * motor(75, dd)) * env(dd, 0.3, r=0.5), 0.15
    if name == 'servo': dd = min(0.6, d or 0.45); f = 320 + 160 * np.sin(np.pi * tv(dd) / dd); return lp(osc('saw', f, dd), 1800) * env(dd, 0.05, r=0.1) * 0.5, 0.1
    if name == 'spray': return hiss(d or 1.8, 2000, 9000) * 0.7, 0.2
    if name == 'air': return lp(noise(d or 6), 2500) * 0.9 * env(d or 6, 1.0, r=1.0), 0.2
    if name == 'oht': dd = d or 4; t = tv(dd); return (np.sin(2 * np.pi * (420 + 30 * t / dd) * t) * 0.3 + np.sin(2 * np.pi * 840 * t) * 0.1) * env(dd, 0.5, r=0.6), 0.1
    if name == 'hoist': dd = d or 1.3; return motor(sweep(260, 180, dd), dd) * 0.4, 0.1
    if name == 'valve': return S(hiss(0.18, 1500, 7000), tick(1200, 0.03)), 0.15
    if name == 'pins': return S(tick(2000, 0.02), np.concatenate([np.zeros(int(0.06 * SR)), tick(2300, 0.02)])), 0.1
    if name == 'gas_pulse': return hiss(0.18, 2000 if not a else 1200, 7000 if not a else 4000) * 1.2, 0.2
    if name == 'layer': return S(pluck(SCALE[int(a) % len(SCALE)], 0.18, 0.25) * 0.9, thump(90, 0.12) * 0.3), 0.3
    if name == 'dispense': dd = d or 0.7; return lp(noise(dd), 900) * env(dd, 0.05, r=0.2) + bubbles(dd, 4)[:int(dd * SR)] * 0.4, 0.2
    if name == 'spinup': dd = d or 2.6; t = tv(dd) / dd; return lp(osc('saw', sweep(120, 1100, dd), dd), 2500) * 0.4 * np.minimum(1, t * 3) * np.clip((1 - t) * 4, 0, 1) + hiss(dd, 3000, 9000) * 0.2, 0.2
    if name == 'fling': return crackle(d or 1.6, 40, 3000, 9000) * 0.8, 0.2
    if name == 'machine': dd = d or 5.8; return (hum(dd, 50) * 0.6 + lp(noise(dd), 400) * 1.2) * env(dd, 0.5, r=0.8), 0.1
    if name == 'panels': dd = d or 1.2; return S(whoosh(dd, False, 300, 3000) * 0.7, np.concatenate([np.zeros(int(dd * 0.8 * SR)), thump(80, 0.3)])), 0.2
    if name == 'vacuum': dd = d or 7; return (lp(noise(dd), 220) * 2 + 0.2 * np.sin(2 * np.pi * 55 * tv(dd))) * env(dd, 0.5, r=0.8), 0.1
    if name == 'prepulse': return S(zap(2600, 1300, 0.04) * 0.7, tick(5000, 0.015)), 0.25
    if name == 'laser': return S(zap(3200, 180, 0.14, 'saw') * 0.9, tick(6000, 0.01)), 0.35
    if name == 'plasma': return S(crackle(0.16, 1400, 1200, 8000) * np.exp(-tv(0.16) * 14) * 1.2, thump(70, 0.15) * 0.5), 0.35
    if name == 'plasma_big': return crackle(0.5, 1200, 800, 9000) * np.exp(-tv(0.5) * 6) * 1.4 + thump(50, 0.5) + whoosh(0.5, False, 500, 6000) * 0.5, 0.5
    if name == 'optics': dd = d or 6; return sum(np.sin(2 * np.pi * mf(m) * tv(dd)) for m in (81, 88, 93)) * 0.12 * env(dd, 0.8, r=1.0), 0.6
    if name == 'mirror': return fm(mf(88 + [0, 3, 5, 7, 10, 12, 15, 17, 19][int(a) % 9]), 0.7, 2.0, 2.0, 5) * 0.6, 0.6
    if name == 'scanner': dd = d or 2.5; t = tv(dd); return lp(osc('sq', 62, dd), 400) * 0.2 * env(dd, 0.1, r=0.2) + hiss(dd, 3000, 8000) * 0.15, 0.1
    if name == 'scan_tick': return S(tick(3500, 0.025) * 0.8, blip(96, 0.02, 0.5) * 0.2), 0.1
    if name in ('chem', 'fizz'): dd = d or 1.6; return crackle(dd, 900, 4000, 12000) * 0.6 * env(dd, 0.1, r=0.4) + hiss(dd, 5000, 12000) * 0.25, 0.25
    if name == 'plasma_hum': dd = d or 2.1; t = tv(dd); return (hum(dd, 135) * 0.5 + bp(noise(dd), 150, 600) * 0.8) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t)), 0.2
    if name == 'ion_tick': return tick(6500, 0.015) * 0.7, 0.1
    if name == 'ash': dd = d or 1.2; return whoosh(dd, True, 400, 3000) * 0.5 + crackle(dd, 300, 3000, 9000) * 0.3, 0.3
    if name == 'implanter': dd = d or 4.4; t = tv(dd); return (hum(dd, 60) * 0.5 + 0.06 * np.sin(2 * np.pi * 2100 * t)) * env(dd, 0.3, r=0.5), 0.1
    if name == 'ion_zip': return np.sin(phase(sweep(800, 2600, 0.07), 0.07)) * np.sin(np.pi * tv(0.07) / 0.07) * 0.6, 0.25
    if name == 'nano_pad': dd = d or 10; return pad([57, 64, 71], dd, 1300, 0.2) * 0.5, 0.6
    if name == 'flash': return S(whoosh(0.6, True, 1000, 9000) * 0.6, fm(mf(96), 1.0, 2, 2, 3) * 0.3), 0.5
    if name == 'build': return S(pluck(SCALE[4 + int(a) * 2], 0.25, 0.25), thump(110, 0.1) * 0.4, tick(3000, 0.02) * 0.4), 0.3
    if name == 'switch':
        on = int(a) == 1
        return S(tick(4000 if on else 2600, 0.02) * 1.1, blip(88 if on else 76, 0.06, 0.25) * 0.6, thump(150 if on else 110, 0.07) * 0.4), 0.2
    if name == 'current': dd = d or 1.0; t = tv(dd); return bp(noise(dd), 900, 3200) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t)) * env(dd, 0.05, r=0.2) * 0.6, 0.2
    if name == 'deposit': return hiss(d or 0.4, 1500, 6000) * 0.7, 0.2
    if name == 'fill': dd = d or 0.6; return np.sin(phase(sweep(200, 900, dd), dd)) * env(dd, 0.05, r=0.1) * 0.5 + bubbles(dd, 10)[:int(dd * SR)] * 0.4, 0.3
    if name == 'prober': return hum(d or 5, 80) * 0.3, 0.1
    if name == 'probe': return S(tick(2800, 0.02), blip(91 if int(a) % 7 else 79, 0.03, 0.5) * 0.35), 0.15
    if name == 'dicing': dd = d or 2.3; t = tv(dd); return (np.sin(2 * np.pi * 1850 * t) * 0.15 + bp(noise(dd), 3000, 8000) * 0.4) * env(dd, 0.1, r=0.3), 0.15
    if name == 'slice': return S(bp(noise(0.04), 4000, 9000) * np.exp(-tv(0.04) * 80), tick(5000, 0.015) * 0.5), 0.15
    if name == 'stretch': return bp(noise(0.5), 180, 700) * env(0.5, 0.1) * 1.4, 0.2
    if name == 'pick': return lp(noise(0.12), 900) * np.sin(np.pi * tv(0.12) / 0.12) + np.sin(phase(sweep(200, 500, 0.12), 0.12)) * 0.4, 0.15
    if name == 'lift': return whoosh(min(1.2, d or 1.0), True, 300, 3000) * 0.5, 0.25
    if name == 'flip': return whoosh(0.35, True, 600, 6000) * 0.7, 0.25
    if name == 'place_click': return S(tick(3600, 0.015) * 1.3, thump(95, 0.16) * 0.9, fm(2400, 0.12, 2, 1.5, 20) * 0.25), 0.25
    if name == 'underfill': dd = d or 0.7; return lp(noise(dd), 700) * env(dd, 0.1, r=0.2) * 1.2, 0.2
    if name == 'mold': return (lp(noise(0.5), 400) * 1.5 + np.sin(phase(sweep(90, 60, 0.5), 0.5)) * 0.6) * env(0.5, 0.05), 0.2
    if name == 'balls':
        x = np.zeros(int(0.4 * SR))
        for k in range(12): b = tick(rng.uniform(2500, 4500), 0.015); s = int(k * 0.03 * SR); ins(x, b * 0.6, s)
        return x, 0.2
    if name == 'squeegee': dd = d or 1.0; t = tv(dd); return bp(noise(dd), 900, 3200) * (0.7 + 0.3 * np.sin(2 * np.pi * 40 * t)) * env(dd, 0.05, r=0.15) * 0.8, 0.15
    if name == 'flash_cam': return np.sin(phase(sweep(3800, 2600, 0.08), 0.08)) * np.exp(-tv(0.08) * 25) * 0.5, 0.3
    if name == 'tiny_click': return tick(rng.uniform(3000, 5000), 0.012) * 0.8, 0.1
    if name == 'reflow': dd = d or 1.8; return (lp(noise(dd), 1100) * 1.4 + crackle(dd, 200, 2000, 8000) * 0.4) * np.sin(np.pi * tv(dd) / dd), 0.25
    if name == 'slide': dd = d or 0.8; return whoosh(dd, False, 200, 2500) * 0.6 + lp(noise(dd), 400) * 0.5 * env(dd, 0.05), 0.15
    if name == 'thunk': return S(thump(65, 0.35) * 1.1, bp(noise(0.06), 200, 1200) * np.exp(-tv(0.06) * 60) * 0.5), 0.2
    if name == 'glass': return S(fm(mf(91), 0.8, 2.7, 2.5, 5) * 0.5, whoosh(0.5, False, 800, 5000) * 0.3), 0.4
    if name == 'button':
        x = S(tick(4800, 0.012) * 1.6, thump(160, 0.06) * 0.6)
        return np.concatenate([x, np.zeros(int(0.12 * SR)), tick(3800, 0.01) * 0.9]), 0.15
    if name == 'power_rise':
        dd = d or 3.6; t = tv(dd) / dd; f = sweep(70, 880, dd)
        x = lp(osc('saw', f, dd), 600 + 4000 * float(t[-1])) * 0.35 + osc('sin', f / 2, dd) * 0.4 + sum(np.sin(2 * np.pi * mf(m) * tv(dd)) for m in (84, 88, 91)) * 0.04 * t
        return x * np.minimum(1, t * 1.5) ** 2, 0.4
    if name == 'pulse': return np.sin(phase(sweep(200, 650, 0.14), 0.14)) * np.sin(np.pi * tv(0.14) / 0.14) * 0.7, 0.3
    if name == 'clock':
        dd = d or 3.4; x = 0.1 * osc('sin', 1000, dd) * env(dd, 0.2, r=0.3)
        for k in range(int(dd * 8)): b = tick(3000, 0.015); s = int(k * SR / 8); ins(x, b * 0.5, s)
        return x, 0.2
    if name == 'core_on': return S(blip(SCALE[3 + int(a)], 0.14, 0.25) * 0.7, bell(SCALE[3 + int(a)] + 12, 0.4, 1.5) * 0.25), 0.35
    if name == 'data':
        dd = d or 1.0; x = np.zeros(int(dd * SR) + 4000)
        for k in range(int(dd * 30)): b = blip(int(rng.integers(90, 104)), 0.02, 0.5); s = int(rng.uniform(0, dd) * SR); ins(x, b * 0.4, s)
        return x, 0.2
    if name == 'startup':
        dd = 3.2; x = supersaw([60, 64, 67, 74], dd, 3500) * 2.2 + pad([48, 55, 60], dd, 2000, 0.6) * 1.5
        for i, m in enumerate([79, 84, 88, 91, 96]): b = bell(m, 1.8, 3); s = int((0.05 + i * 0.07) * SR); ins(x, b * 0.25, s)
        x[:int(0.35 * SR)] += thump(48, 0.35) * 1.4
        return x * np.minimum(1, tv(dd) / 0.04), 0.6
    if name == 'pixels':
        dd = d or 0.9; x = np.zeros(int((dd + 0.6) * SR))
        for k in range(14): b = bell(SCALE[k % len(SCALE)] + 12, 0.5, 2); s = int(k * dd / 14 * SR); ins(x, b * 0.25, s)
        return x, 0.6
    if name == 'chime':
        x = np.zeros(int(2.0 * SR))
        for i, m in enumerate([79, 84, 88]): b = bell(m, 1.4, 3); s = int(i * 0.14 * SR); ins(x, b * 0.45, s)
        return x, 0.6
    if name == 'title_hit': return S(thump(50, 0.6) * 1.2, hp(noise(1.2), 3000) * np.exp(-tv(1.2) * 3) * 0.35, supersaw([60, 67, 72, 76], 1.2, 4000) * 2.0), 0.6
    raise KeyError(name)
DURS = {'wind', 'riser', 'shimmer', 'conveyor', 'rumble', 'rumble_in', 'hum', 'heat', 'pour', 'sizzle', 'bubbling', 'distill', 'whoosh', 'whoosh_out', 'dive', 'gas_hiss', 'heat_rise', 'melt', 'winch', 'grow', 'grind', 'polish', 'servo', 'spray', 'air', 'oht', 'hoist', 'dispense', 'spinup', 'fling', 'machine', 'panels', 'vacuum', 'optics', 'scanner', 'chem', 'fizz', 'plasma_hum', 'ash', 'implanter', 'nano_pad', 'current', 'deposit', 'fill', 'prober', 'dicing', 'lift', 'underfill', 'squeegee', 'reflow', 'slide', 'power_rise', 'clock', 'data', 'pixels'}

BEDS = {'wind', 'shimmer', 'conveyor', 'rumble', 'rumble_in', 'hum', 'heat', 'pour', 'sizzle', 'bubbling', 'distill', 'gas_hiss', 'heat_rise', 'melt', 'grow', 'grind', 'polish', 'air', 'oht', 'machine', 'vacuum', 'optics', 'scanner', 'plasma_hum', 'implanter', 'nano_pad', 'prober', 'dicing', 'power_rise', 'clock'}
missing = set()
for cu in cuesheet['cues']:
    try: sig, rv = make(cu['sfx'], cu.get('arg'))
    except KeyError: missing.add(cu['sfx']); continue
    sig = sig / (np.max(np.abs(sig)) + 1e-9)
    bed = 0.5 if cu['sfx'] in BEDS else 1.0                    # sustained beds sit under the events, not on top of them
    put(SFX, sig, cu['t'], 0.6 * cu.get('g', 1) * bed, cu.get('pan', 0), rv)
if missing: print('no generator for:', sorted(missing))

# ---------------------------------------------------------------- mix: reverb send → sum → loudness → limit
def reverb_ir(d=1.9, seed=5):
    r = np.random.default_rng(seed); t = tv(d)
    return [lp(r.standard_normal(len(t)), 6000) * np.exp(-t * 3.4) * 0.03 for _ in range(2)]
ir = reverb_ir()
wet = np.stack([ss.fftconvolve(VERB[i] + 0.35 * MUS[i], ir[i])[:N] for i in range(2)])
mix = 0.55 * MUS + 1.0 * SFX + 0.8 * wet
def _db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
for a, b, nm in [(0, 6, 'S01 sand'), (16, 22, 'S04 furnace'), (34, 41, 'S07 chem'), (54, 60, 'S10 seed'), (67, 74, 'S12 saw'), (102, 109, 'S18 EUV'), (131, 141, 'S23 transistor'), (148, 153, 'S25 probe'), (176, 183, 'power-on'), (183, 189, 'finale')]:
    i0, i1 = int(a * SR), int(b * SR); print(f'{nm:16s} music {_db(0.55 * MUS[:, i0:i1]):6.1f}  sfx {_db(SFX[:, i0:i1]):6.1f}  dB')
mix = np.stack([hp(mix[i], 28) for i in range(2)])
def kweight(x):
    b1, a1 = ss.iirfilter(2, 1500 / (SR / 2), btype='highpass', ftype='butter')     # approximate shelf + RLB stages (BS.1770 style)
    hi = ss.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x)
    return ss.lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], hi)
def lufs(st):
    k = [kweight(ch) for ch in st]; blk = int(0.4 * SR); hop = int(0.1 * SR)
    ms = np.array([sum(np.mean(kc[i:i + blk] ** 2) for kc in k) for i in range(0, len(k[0]) - blk, hop)])
    ld = -0.691 + 10 * np.log10(ms + 1e-12); g = ms[ld > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10; g2 = ms[(ld > -70) & (ld > rel)]
    return -0.691 + 10 * np.log10(np.mean(g2))
mix = mix[:, :int(TOTAL * SR)]
fade = int(1.2 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
for _ in range(3):
    L = lufs(mix); mix *= 10 ** ((-14.0 - L) / 20)
    mix = np.tanh(mix / 0.9) * 0.9                                               # soft limiter (gentle)
    pk = np.max(np.abs(ss.resample_poly(mix, 4, 1, axis=1)))
    if pk > 10 ** (-1.0 / 20): mix *= 10 ** (-1.0 / 20) / pk
print(f'integrated loudness {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS, {mix.shape[1] / SR:.2f} s')
sf.write(OUT, mix.T.astype(np.float32), SR, subtype='PCM_24')
print('->', OUT)
