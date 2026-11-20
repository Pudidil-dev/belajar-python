#!/usr/bin/env python3
"""Score + sound design for "How Does CT Angiography Detect a Brain Aneurysm?" — pure code synthesis, no samples.

  uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score.wav [build/loudness.png] [--notext]

Built from the MRI film's synth (mri-brain/tools/synth_audio.py): the same instruments and helpers (kick, clap, snare,
hats, shaker, crash, toms, sub, pulse and reese bass, pads, supersaw stabs, FM bell and glass, pluck, lead, risers),
the same sidechain pump, reverb send and loudness chain. New here: a 2-bar hook that every scene can carry (a 3-3-2
"tresillo" bar and its answer), written so the same melody fits the whole four-chord loop (Dm – Bb – F – C), and
interactive effects tuned to the key: blips, ladders and chimes take their notes from the chord sounding at that moment,
and soft UI effects snap to the 16th grid, so the picture's events play along with the music.

120 BPM, D minor, 360 beats = exactly 180 s = 90 bars; a scene is 2 bars. The arc follows the brief:
curiosity (0–20 s) → a mechanical, electronic build into the tube, the high-voltage drop and the bremsstrahlung chime
(20–60 s) → flow and the contrast's journey, a breakdown on the iodine atom and the drop on photoelectric absorption
(60–100 s) → ordered "data" arps through the detector (100–120 s) → the reconstruction build and the main drop on the
grayscale image (120–140 s) → discovery, the reviewer's click on the sac (140–160 s) → calm, a short pause on the
limits, a warm phrase for care, and an A-major turnaround that lands on the opening hit when the film loops (160–180 s).
"""
import json, sys
import numpy as np
import scipy.signal as ss
import soundfile as sf

SR = 48000
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4
args = [x for x in sys.argv[1:] if not x.startswith('--')]
NOTEXT = '--notext' in sys.argv
cuesheet = json.load(open(args[0]))
OUT = args[1]
TOTAL = cuesheet['total']
N = int(TOTAL * SR) + 2 * SR
MUS = np.zeros((2, N)); PUMP = np.zeros((2, N)); SFX = np.zeros((2, N)); VERB = np.zeros((2, N))
rng = np.random.default_rng(1927)                          # Moniz's first cerebral angiogram
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

# ---------------------------------------------------------------- harmony (D minor)
CH = {'Dm': (38, [57, 62, 65, 69]), 'Bb': (34, [58, 62, 65, 70]), 'F': (41, [57, 60, 65, 69]), 'C': (36, [55, 60, 64, 67]),
      'Gm': (43, [55, 58, 62, 67]), 'A': (45, [57, 61, 64, 69]), 'Dsus': (38, [57, 62, 67, 69]), 'Am': (45, [57, 60, 64, 69])}
LOOP = ['Dm', 'Bb', 'F', 'C']
PROG = [(b, LOOP[(b // 4) % 4]) for b in range(0, 320, 4)]
PROG += [(320, 'Bb'), (324, 'C'), (328, 'Dm'), (332, 'Dm'), (336, 'Bb'), (340, 'C'), (344, 'F'), (348, 'F'), (352, 'Bb'), (356, 'A')]
def chord_at(beat):
    c = PROG[0][1]
    for b, n in PROG:
        if beat >= b - 1e-9: c = n
    return c
# the hook: bar A in a 3-3-2 rhythm, bar B its answer; one melody that sits on every chord of the loop
HOOK = [(0.0, 69, 0.6), (0.75, 74, 0.6), (1.5, 77, 0.4), (2.0, 76, 0.6), (2.75, 74, 0.6), (3.5, 72, 0.5),
        (4.0, 74, 0.6), (4.75, 77, 0.6), (5.5, 81, 0.4), (6.0, 79, 0.45), (6.5, 77, 0.45), (7.0, 76, 1.0)]
HOOK_A = [(0.0, 76, 0.6), (0.75, 74, 0.6), (1.5, 73, 0.4), (2.0, 74, 0.6), (2.75, 76, 0.6), (3.5, 77, 0.5),
          (4.0, 76, 0.6), (4.75, 73, 0.6), (5.5, 69, 0.4), (6.0, 73, 0.45), (6.5, 76, 0.45), (7.0, 81, 1.0)]     # over the A turnaround
PENT = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89]
def chord_note(t, k, octave=24):                        # a chord tone near the top (for tuned effects): k = 0, 1, 2 …
    ms = CH[chord_at(t / BEAT)][1]; return ms[k % len(ms)] + octave + 12 * (k // len(ms))
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
        if kind == 'knock':                                                    # machine knocks as percussion (the gantry)
            put(MUS, kick(0.9, 0.6), t0, 0.8 * g); KICKS.append(t0)
            for s in range(4):
                put(MUS, S(tom(320 + 60 * ((ib + s) % 3), 0.09) * 0.6, bp(noise(0.05), 800, 3000) * np.exp(-tv(0.05) * 70) * 0.4), t0 + s * S16, (0.22 if s % 2 == 0 else 0.13) * g, (s - 1.5) * 0.3)
            if ib % 2 == 1: put(MUS, clap(), t0, 0.35 * g, 0, 0.3)
        if kind == 'heart':                                                    # lub-dub on the heartbeats (one per 2 beats)
            if ib % 2 == 0: put(MUS, heartbeat(), t0 + 0.5 * BEAT * 0, 0.55 * g); KICKS.append(t0)
            put(MUS, hat(), t0 + 0.5 * BEAT, 0.08 * g, 0.3)
            if ib % 2 == 1: put(MUS, shaker(), t0 + 0.75 * BEAT, 0.12 * g, -0.4)
def bass(b0, b1, kind, g=1.0, cut=None):
    for b in np.arange(b0, b1, 0.5):
        root = CH[chord_at(b)][0]; t0 = tb(b); half = int(round(b * 2)) % 2
        if kind == 'drone' and half == 0 and int(round(b)) % 2 == 0: put(PUMP, subbass(root + 12, BEAT * 2) * 0.9, t0, g)
        if kind == 'pulse8': put(PUMP, pulsebass(root + 12 + (12 if int(round(b * 2)) % 8 == 7 else 0), BEAT / 2 * 0.9, cut or 900), t0, g)
        if kind == 'reese': put(PUMP, reese(root + 12 + (12 if int(round(b * 2)) % 8 in (3, 7) else 0), BEAT / 2 * 0.92, cut or 1500), t0, g)
        if kind == 'offbeat' and half == 1: put(PUMP, pulsebass(root + 12, BEAT * 0.42, cut or 1300), t0, g)
        if kind == 'offbeat' and half == 0: put(PUMP, subbass(root + 12, BEAT * 0.45), t0, 0.7 * g)
        if kind == 'wobble' and half == 0 and int(round(b)) % 2 == 0: put(PUMP, wobble(root + 12, BEAT * 2 * 0.95, 1.0), t0, g * 0.8)
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
def hook(b0, inst='lead', g=1.0, oct=0, half=None):
    notes = HOOK_A if chord_at(b0 + 4) == 'A' else HOOK
    for r, m, dl in notes:
        if half == 'A' and r >= 4: continue
        if half == 'B' and r < 4: continue
        d = dl * BEAT * 1.2; t0 = tb(b0 + r)
        if inst == 'lead': put(MUS, lead(m + oct, d), t0, g * 0.55, 0.1, 0.3); put(MUS, lead(m + oct + 12, d, 0.25, 6000), t0, g * 0.16, -0.2, 0.3)
        if inst == 'bell': put(MUS, bell(m + oct, 1.2), t0, g * 0.45, (r / 8 - 0.5) * 0.8, 0.5)
        if inst == 'glass': put(MUS, glass(m + oct + 12, 0.8), t0, g * 0.35, (r / 8 - 0.5) * 0.9, 0.6)
        if inst == 'pluck': put(MUS, pluck(m + oct, 0.3, 0.5, 3000), t0, g * 0.5, (r / 8 - 0.5) * 0.6, 0.3)
def roll(b0, b1, g0=0.16, g1=0.5):
    n = int(round((b1 - b0) * 4)); half = n // 2
    for k in range(n + half):
        tt = tb(b0) + (k * S16 if k < half else half * S16 + (k - half) * S16 / 2)
        if tt >= tb(b1): break
        put(MUS, snare(0.85), tt, g0 + (g1 - g0) * k / (n + half), (k % 2 - 0.5) * 0.3)
HOLDS = []                                                                     # held breaths: music silent in these windows
def hold(a, b): HOLDS.append((a, b))

# ---------------------------------------------------------------- arrangement (beats; 2 beats = 1 s; a scene = 8 beats)
# ACT 1 · THE HIDDEN SHAPE (0–40): the hook from the first beat, gently; the build into the gantry
put(MUS, boom(66, 31, 1.3), 0, 0.55); put(MUS, crash(1.8), 0, 0.3, 0, 0.4)
drums(0, 16, 'light', 0.75); bass(0, 16, 'drone', 0.5); chords(0, 24, 'pad', 0.34, cut=1500)
hook(0, 'bell', 0.75); hook(8, 'glass', 0.7); hook(16, 'bell', 0.7)
drums(16, 24, 'soft', 0.85); arp(16, 24, 0.5, 0.3, inst='glass', pattern=(0, 1, 2, 3))
drums(24, 40, 'four', 0.8); bass(24, 40, 'offbeat', 0.6, cut=1000); chords(24, 40, 'pad', 0.32, cut=1900)
hook(24, 'pluck', 0.9); arp(32, 40, 0.25, 0.3, 3600)
put(MUS, riser(tb(4), 250, 6000), tb(36), 0.45)
# ACT 2 · ELECTRONS GAIN ENERGY (40–80): the tube's techno groove; the high voltage switches on → drop (beat 65)
drums(40, 64, 'four', 0.9); bass(40, 64, 'pulse8', 0.65, cut=900); chords(40, 64, 'stabs', 0.32)
arp(40, 64, 0.25, 0.32, 4200); hook(48, 'pluck', 0.85); hook(56, 'pluck', 0.9)
hold(tb(64.25), tb(65)); put(MUS, revcym(BEAT * 0.75), tb(64.25), 0.4)
drums(65, 72, 'drive', 1.0); bass(65, 72, 'reese', 0.8, cut=1700); chords(65, 72, 'stabs', 0.42); hook(64, 'lead', 0.85, half='B')
put(MUS, crash(), tb(65), 0.55, 0, 0.4)
drums(72, 79.5, 'drive', 0.95); bass(72, 80, 'pulse8', 0.8, cut=1400); chords(72, 80, 'swell', 0.4, cut=3800)
arp(72, 76, 0.25, 0.36, 6000); arp(76, 79.5, 0.125, 0.4, 7500); put(MUS, riser(tb(8), 250, 9000), tb(72), 0.55); roll(76, 79.5, 0.14, 0.5)
# ACT 3 · X-RAYS ARE PRODUCED (80–120): bullet time in the atom (half time), the emission chime at 44.4 s, then the drive
drums(80, 96, 'half', 0.9); bass(80, 96, 'wobble', 0.75); chords(80, 96, 'pad', 0.38, cut=1600, bright=0.2)
arp(80, 88, 0.5, 0.28, inst='glass', pattern=(3, 2, 1, 0)); put(MUS, crash(2.4), tb(80), 0.5, 0, 0.5)
hold(tb(88.3), tb(88.8))
drums(96, 120, 'drive', 1.0); bass(96, 120, 'reese', 0.8, cut=1800); chords(96, 120, 'stabs', 0.44)
hook(96, 'lead', 0.9); hook(104, 'lead', 0.85); hook(112, 'lead', 0.9); hook(112, 'bell', 0.35, 12)
put(MUS, crash(), tb(96), 0.55, 0, 0.4)
# ACT 4 · CONTRAST REACHES THE ARTERIES (120–160): flow — heartbeat groove, glass hook, the fill motif, the trigger
drums(120, 128, 'groove', 0.85); bass(120, 160, 'offbeat', 0.7, cut=1200); chords(120, 160, 'pad', 0.36, cut=2100)
drums(128, 136, 'heart', 1.0); drums(136, 156, 'groove', 0.9)
hook(120, 'glass', 0.8); hook(136, 'glass', 0.8); hook(144, 'pluck', 0.8); arp(144, 152, 0.25, 0.32, 4500, pattern=(0, 1, 2, 3, 4, 5, 6, 7))
hold(tb(156.6), tb(157)); put(MUS, riser(tb(3), 300, 7000), tb(153.6), 0.45)
drums(157, 160, 'four', 0.9); put(MUS, crash(1.6), tb(157), 0.45, 0, 0.4)
# ACT 5 · PHOTONS INTERACT WITH ATOMS (160–200): the dive, a breakdown on the iodine atom, the drop on absorption (beat 176)
drums(160, 164, 'four', 0.8); bass(160, 164, 'pulse8', 0.6); put(MUS, riser(tb(4), 300, 9000), tb(160), 0.5)
drums(164, 175, 'tick', 0.9); bass(164, 175, 'drone', 0.45); chords(164, 176, 'pad', 0.42, cut=1300); arp(168, 175, 0.5, 0.3, inst='glass', pattern=(0, 2, 1, 3))
hold(tb(175), tb(176))
drums(176, 200, 'drive', 1.0); bass(176, 200, 'reese', 0.85, cut=1900); chords(176, 200, 'stabs', 0.46)
hook(176, 'lead', 0.95); hook(184, 'lead', 0.9); hook(192, 'lead', 0.9); hook(184, 'bell', 0.35, 12)
put(MUS, crash(2.4), tb(176), 0.6, 0, 0.5); put(MUS, boom(54, 27, 1.6), tb(176), 0.7)
# ACT 6 · RADIATION BECOMES DATA (200–240): ordered conversion — data arps, crisp ticks, the bell hook
drums(200, 232, 'four', 0.8); bass(200, 232, 'pulse8', 0.65, cut=1000); chords(200, 232, 'pad', 0.32, cut=2400)
arp(200, 232, 0.25, 0.34, 5200, pattern=(0, 1, 2, 3, 2, 1, 0, 3)); hook(208, 'bell', 0.7); hook(224, 'bell', 0.7); hook(216, 'pluck', 0.7)
drums(232, 239.5, 'drive', 0.95); bass(232, 240, 'pulse8', 0.8, cut=1400); chords(232, 240, 'swell', 0.4, cut=3600)
arp(232, 236, 0.25, 0.36, 6000); arp(236, 239.5, 0.125, 0.4, 7500); put(MUS, riser(tb(8), 250, 9000), tb(232), 0.5)
# ACT 7 · MEASUREMENTS BECOME IMAGES (240–280): the build through projections and reconstruction, the main drop on the image
drums(240, 256, 'knock', 0.85); bass(240, 256, 'pulse8', 0.7, cut=1100); chords(240, 256, 'pad', 0.34, cut=2000); hook(248, 'glass', 0.7)
drums(256, 263.5, 'four', 0.95); bass(256, 264, 'pulse8', 0.85, cut=1500); chords(256, 264, 'swell', 0.45, cut=4200)
put(MUS, riser(tb(8), 250, 10000), tb(256), 0.6); roll(260, 263.5, 0.16, 0.55); put(MUS, revcym(BEAT * 0.5), tb(263.5), 0.55)
hold(tb(263.5) + 0.02, tb(264))
drums(264, 280, 'drive', 1.0); bass(264, 280, 'reese', 0.9, cut=2000); chords(264, 280, 'stabs', 0.5)
hook(264, 'lead', 1.0); hook(272, 'lead', 1.0); hook(264, 'bell', 0.42, 12); hook(272, 'bell', 0.42, 12)
put(MUS, crash(2.6), tb(264), 0.65, 0, 0.5); put(MUS, boom(50, 25, 2.0), tb(264), 0.85)
# ACT 8 · IDENTIFY THE ANEURYSM (280–320): discovery and clarity; the reviewer's click on the sac (beat 308) as the climax
drums(280, 304, 'four', 0.9); bass(280, 304, 'offbeat', 0.75, cut=1500); chords(280, 304, 'pad', 0.4, cut=2600, bright=0.3)
hook(280, 'glass', 0.8); hook(288, 'pluck', 0.85); hook(296, 'glass', 0.85); arp(288, 304, 0.25, 0.3, 5000)
put(MUS, riser(tb(4), 300, 8000), tb(304), 0.5); hold(tb(307.6), tb(308))
drums(308, 320, 'drive', 1.0); bass(308, 320, 'reese', 0.85, cut=1900); chords(308, 320, 'stabs', 0.46)
hook(312, 'lead', 0.95); hook(312, 'bell', 0.4, 12); put(MUS, crash(2.4), tb(308), 0.6, 0, 0.5); put(MUS, boom(52, 26, 1.8), tb(308), 0.75)
# ACT 9 · WHAT THIS MEANS FOR THE PATIENT (320–360): calm; a pause on the limits; a warm phrase; the A turnaround → beat 0
drums(320, 336, 'light', 0.8); bass(320, 336, 'drone', 0.5); chords(320, 336, 'pad', 0.45, cut=2400, bright=0.4)
hook(320, 'bell', 0.6); arp(328, 336, 0.5, 0.28, inst='glass', pattern=(0, 1, 2, 3))
hold(tb(336), tb(338)); chords(338, 344, 'pad', 0.4, cut=1800); drums(340, 344, 'tick', 0.8)
drums(344, 352, 'soft', 0.9); bass(344, 352, 'offbeat', 0.55, cut=1100); chords(344, 352, 'pad', 0.48, cut=2800, bright=0.5)
hook(344, 'glass', 0.75); arp(344, 352, 0.25, 0.26, 4200)
drums(352, 359.5, 'light', 0.85); bass(352, 360, 'offbeat', 0.6); chords(352, 360, 'swell', 0.42, cut=3400)
hook(352, 'bell', 0.8); put(MUS, riser(tb(6), 260, 8000), tb(354), 0.45); put(MUS, revcym(BEAT * 1.0), tb(359), 0.5)

for a_, b_ in HOLDS:
    for bus in (MUS, PUMP): bus[:, int(a_ * SR):int(b_ * SR)] *= 0.0
# sidechain pump under every kick
g = np.ones(N)
for tk in KICKS:
    s = int(tk * SR); L = min(int(0.28 * SR), N - s)
    if L > 0: g[s:s + L] = np.minimum(g[s:s + L], 1 - 0.6 * np.exp(-np.arange(L) / SR / 0.075))
MUS += PUMP * g
# the beam-shaping filter (S14, 52–56 s): the groove itself is filtered down and opens again
a_, b_ = int(52.0 * SR), int(56.0 * SR)
for i in range(2): MUS[i, a_:b_] = sweep_lp(MUS[i, a_:b_], 9000, 900, 2, 48) * 0.5 + sweep_lp(MUS[i, a_:b_], 900, 9000, 2, 48) * 0.5

# ---------------------------------------------------------------- sound effects (from the cue sheet), tuned to the chord
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def whoosh(d, up=True, f0=300, f1=4000):
    t = tv(d) / d; return sweep_lp(noise(d), f0 if up else f1, f1 if up else f0, 2) * np.sin(np.pi * t) ** 1.5
def zip_(f0=2000, f1=9000, d=0.06): return np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-tv(d) * 40)
def blipn(m, d=0.12): return S(fm(mf(m), d, 2.0, 1.2, 14) * 0.8, tick(mf(m) * 2, 0.01) * 0.3)
def crush(x, bits=5, hold_=6):
    y = np.round(x * (2 ** (bits - 1))) / (2 ** (bits - 1)); return np.repeat(y[::hold_], hold_)[:len(x)]
def chip(m, d=0.09, duty=0.25): return crush(osc('sq', mf(m), d, duty) * np.exp(-tv(d) * 18), 5, 3)          # 8-bit square blip
def clicks(d, n, f0=2400, f1=5200, accel=1.0):
    x = np.zeros(int((d + 0.1) * SR))
    for k in range(n):
        tt = d * (k / max(1, n - 1)) ** accel
        ins(x, S(tick(f0 + (f1 - f0) * k / max(1, n - 1), 0.012) * 0.7, crush(osc('sq', (f0 + (f1 - f0) * k / n) / 3, 0.02) * np.exp(-tv(0.02) * 120), 4, 4) * 0.25), tt * SR)
    return x
def hum(d, f0=60, am=0.0):
    t = tv(d); x = sum(np.sin(2 * np.pi * f0 * k * t) / k ** 1.3 for k in range(1, 7))
    return x * (1 + am * np.sin(2 * np.pi * 8 * t)) * env(d, min(0.5, d * 0.2), r=min(0.6, d * 0.3))
def chime(ms, d=1.2, spread=0.04, inst=bell):
    x = np.zeros(int((d + spread * len(ms) + 0.2) * SR))
    for i, m in enumerate(ms): ins(x, inst(m, d) * (0.5 - 0.05 * i), i * spread * SR)
    return x
def ladder(t, k, inst='chip'):                           # the k-th rung of a rising in-key ladder at time t
    m = chord_note(t, k, 24)
    return S(chip(m, 0.08) * 0.6, blipn(m, 0.1) * 0.5) if inst == 'chip' else glass(m, 0.5)
BEDS = {'room_tone', 'flow_bed', 'beam_bed', 'atom_bed', 'det_bed', 'calm_pad', 'pause_pad', 'warm_pad', 'heat_hum', 'spin_motor', 'track', 'orbit', 'anode_spin'}
SNAP = {'type', 'tag', 'click', 'select', 'lock', 'inset_pop', 'card_pop', 'arrive_tick', 'stop_tick', 'row_tick', 'capture_click', 'stack_click', 'bit',
        'data_tick', 'gantry_tick', 'filter_stop', 'light_land', 'pair', 'annot', 'e_release', 'curious', 'ring', 'check', 'land', 'probe', 'paper_land'}
DURS = {'flow_bed', 'room_tone', 'table_motor', 'inject', 'push_in', 'pull_back', 'cover_fade', 'spin_motor', 'swing', 'hum_rise', 'tube_open', 'anode_spin',
        'outline', 'heat_hum', 'track', 'accel_rise', 'zoom_rush', 'lattice_in', 'photon_tail', 'heat_swell', 'blades', 'beam_bed', 'lie_down', 'bone_in', 'cut_open',
        'mix', 'lung_whoosh', 'rise_flow', 'fill_motif', 'sac_fill', 'curve_rise', 'window_slide', 'atom_bed', 'photon_in', 'vacancy_blink', 'det_bed', 'sparkle',
        'charge_up', 'charge_down', 'integrate', 'build_rise', 'smear', 'slide', 'trace', 'orbit', 'reveal_sweep', 'mouse_move', 'calm_pad', 'clear_flow', 'pause_pad',
        'warm_pad', 'paper_slide', 'paths_open', 'resolve_rise', 'swirl', 'field_on', 'molecule_in'}
def make(name, a, t):
    d = a if isinstance(a, (int, float)) and name in DURS and a else None
    k = int(a) if isinstance(a, (int, float)) else 0
    # ---- interface, labels, the reviewer's actions (tuned, short)
    if name == 'type':
        x = np.zeros(int(0.45 * SR))
        for i in range(5): ins(x, tick(rng.uniform(3200, 4600), 0.01) * 0.5, i * 0.06 * SR)
        return x, 0.1
    if name == 'tag': return S(blipn(chord_note(t, 2, 24), 0.12) * 0.7, tick(4200, 0.012) * 0.3), 0.35
    if name == 'click': return S(chip(chord_note(t, k + 1, 24), 0.05) * 0.5, tick(3800, 0.01) * 0.6), 0.2
    if name == 'select': return S(zip_(900, 4800, 0.08) * 0.5, chime([chord_note(t, 1, 24), chord_note(t, 3, 24)], 0.6, 0.05, glass)), 0.5
    if name == 'lock': return np.concatenate([chip(chord_note(t, 0, 24), 0.06), chip(chord_note(t, 2, 24), 0.1)]) * 0.7, 0.3
    if name in ('inset_pop', 'card_pop'): return S(zip_(600, 3000, 0.07) * 0.5, blipn(chord_note(t, 1, 24), 0.12) * 0.6), 0.4
    if name == 'card_slide': return S(whoosh(0.4, True, 600, 6000) * 0.6, blipn(chord_note(t, 2, 24), 0.15) * 0.4), 0.4
    if name == 'paper_slide': dd = d or 1.4; return whoosh(dd, True, 800, 5000) * 0.45, 0.4
    if name == 'paper_land': return S(lp(noise(0.08), 2000) * np.exp(-tv(0.08) * 40) * 0.6, tick(1800, 0.02) * 0.4), 0.2
    if name == 'check': x = np.concatenate([blipn(chord_note(t, 1, 24), 0.09), blipn(chord_note(t, 3, 24), 0.25)]); return S(x, glass(chord_note(t, 3, 36), 0.8) * 0.3), 0.6
    if name == 'probe': return S(np.sin(2 * np.pi * mf(chord_note(t, 0, 24)) * tv(0.5)) * np.exp(-tv(0.5) * 7) * 0.5, tick(5000, 0.01) * 0.4), 0.6
    if name == 'mouse_move': dd = d or 1.4; return bp(noise(dd), 1500, 5000) * env(dd, 0.2, r=0.4) * 0.25, 0.2
    if name == 'slide': dd = d or 0.7; return S(whoosh(dd, True, 500, 3000) * 0.4, np.sin(phase(sweep(mf(chord_note(t, 0, 12)), mf(chord_note(t, 2, 24)), dd), dd)) * env(dd, 0.05, r=0.2) * 0.2), 0.4
    if name == 'trace': dd = d or 1.4; return np.sin(phase(sweep(mf(chord_note(t, 0, 12)), mf(chord_note(t, 0, 24)), dd), dd)) * env(dd, 0.05, r=0.3) * 0.35, 0.5
    if name in ('arrive', 'land'): return S(blipn(chord_note(t, 0, 24), 0.18), lp(kick(0.5, 0.2), 600) * 0.5), 0.4
    if name == 'focus_hit':
        x = S(boom(52, 26, 1.6) * 0.9, crash(1.8) * 0.3); ins(x, chime([chord_note(t, i, 24) for i in range(4)], 1.4, 0.03), 0); return x, 0.6
    if name == 'annot': return S(chip(chord_note(t, k, 24), 0.08) * 0.6, glass(chord_note(t, k, 36), 0.5) * 0.4), 0.4
    if name == 'ring': return S(np.sin(phase(sweep(mf(chord_note(t, 0, 24)), mf(chord_note(t, 2, 36)), 0.5), 0.5)) * env(0.5, 0.02, r=0.3) * 0.35, glass(chord_note(t, 2, 36), 0.7) * 0.4), 0.6
    if name == 'curious': m = [69, 74][k % 2] + 12; return S(bell(m, 1.4, 1.6) * 0.6, glass(m + 12, 1.0) * 0.25), 0.7
    if name == 'question': x = np.zeros(int(1.4 * SR)); ins(x, bell(76, 0.9, 1.5) * 0.5, 0); ins(x, bell(79, 0.9, 1.5) * 0.45, 0.25 * SR); return x, 0.6
    # ---- camera moves
    if name == 'push_in': dd = d or 1.0; return S(whoosh(dd, True, 250, 7000) * 0.8, osc('saw', sweep(80, 600, dd), dd) * (tv(dd) / dd) ** 2 * 0.08), 0.4
    if name == 'pull_back': dd = d or 1.0; return whoosh(dd, False, 300, 7000) * 0.8, 0.4
    if name == 'zoom_rush': dd = d or 0.6; x = whoosh(dd, True, 200, 11000) * 1.1; x += osc('saw', sweep(80, 1400, dd), dd) * (tv(dd) / dd) ** 2 * 0.14; return x, 0.4
    if name in ('swing', 'orbit', 'track'): dd = d or 1.5; return whoosh(dd, True, 400, 3500) * (0.5 if name == 'swing' else 0.3), 0.4
    if name in ('lattice_in', 'molecule_in'): dd = d or 1.0; x = whoosh(dd, True, 600, 9000) * 0.7; ins(x, chime([chord_note(t, i, 24) for i in range(3)], 0.8, 0.06, glass) * 0.6, 0.1 * SR); return x, 0.5
    if name == 'magnify': return S(zip_(500, 3500, 0.12) * 0.5, glass(chord_note(t, 2, 36), 0.8) * 0.4, whoosh(0.3, True, 800, 5000) * 0.4), 0.5
    # ---- the machine
    if name == 'open_hit':
        x = S(boom(62, 30, 1.3) * 0.9, crush(noise(0.25) * np.exp(-tv(0.25) * 14), 4, 6) * 0.2, kick(1.2, 1.0) * 0.6); return x, 0.4
    if name == 'room_tone': dd = d or 4; return (hum(dd, 58, 0.03) * 0.25 + lp(noise(dd), 400) * env(dd, 0.4, r=0.6) * 0.3), 0.3
    if name == 'table_motor': dd = d or 1.6; t_ = tv(dd); return (np.sin(2 * np.pi * 95 * t_) * 0.3 + bp(noise(dd), 200, 900) * 0.4) * env(dd, 0.15, r=0.3) * 0.7, 0.2
    if name == 'table_thud': return lp(kick(0.6, 0.2), 500) * 0.8, 0.2
    if name == 'lie_down': dd = d or 1.5; return whoosh(dd, False, 300, 3000) * 0.5, 0.4
    if name == 'bone_in': dd = d or 1.0; return clicks(dd, 14, 1500, 4500, 0.9) * 0.7, 0.3
    if name == 'cover_fade': dd = d or 0.8; return S(whoosh(dd, True, 800, 6000) * 0.5, np.sin(phase(sweep(mf(chord_note(t, 0, 12)), mf(chord_note(t, 0, 24)), dd), dd)) * env(dd, 0.1, r=0.3) * 0.2), 0.5
    if name == 'spin_motor': dd = d or 2; t_ = tv(dd); f = 70 + 40 * np.clip(t_ / dd, 0, 1); return (np.sin(phase(f, dd)) * 0.4 + np.sin(phase(f * 3.01, dd)) * 0.15) * (0.7 + 0.3 * np.sin(2 * np.pi * 4 * t_)) * env(dd, 0.3, r=0.4) * 0.6, 0.2
    if name == 'hw_on': return S(zip_(300, 2400, 0.12) * 0.5, np.sin(phase(sweep(60, 120, 0.4), 0.4)) * env(0.4, 0.02, r=0.2) * 0.5), 0.3
    if name == 'hum_rise': dd = d or 1.8; t_ = tv(dd); f = mf(38) * 2 ** (np.clip(t_ / dd, 0, 1)); return sweep_lp(osc('saw', f, dd) * 0.3 + osc('saw', f * 1.005, dd) * 0.3, 200, 3000, 2, 32) * env(dd, 0.3, r=0.2), 0.4
    if name == 'tube_open': dd = d or 0.6; return S(whoosh(dd, True, 400, 5000) * 0.5, tick(2000, 0.03) * 0.4), 0.4
    if name == 'anode_spin': dd = d or 3.8; t_ = tv(dd); return (np.sin(2 * np.pi * 180 * t_ + 3 * np.sin(2 * np.pi * 9 * t_)) * 0.25 + bp(noise(dd), 2000, 6000) * 0.06) * env(dd, 0.4, r=0.6), 0.2
    if name == 'outline': dd = d or 0.5; return S(zip_(1200, 5000, dd * 0.8) * 0.4, glass(chord_note(t, 1, 36), 0.6) * 0.3), 0.4
    if name == 'heat_hum': dd = d or 2.6; t_ = tv(dd); return (np.sin(2 * np.pi * 110 * t_) * 0.3 + np.sin(2 * np.pi * 220.7 * t_) * 0.12 + lp(noise(dd), 800) * 0.2) * env(dd, 0.6, r=0.6) * 0.6, 0.3
    if name == 'e_release': m = PENT[(4 + k) % len(PENT)] + 12; return S(chip(m, 0.07) * 0.5, glass(m + 12, 0.35) * 0.35), 0.4
    if name == 'hv_on':
        x = S(boom(60, 32, 1.0) * 0.7, zip_(200, 8000, 0.2) * 0.6, crush(osc('sq', 110, 0.3) * np.exp(-tv(0.3) * 8), 4, 5) * 0.3); return x, 0.4
    if name == 'accel_rise': dd = d or 1.9; t_ = tv(dd); f = sweep(mf(50), mf(86), dd, 'exp'); x = osc('saw', f, dd) * 0.25 + osc('saw', f * 1.006, dd) * 0.25; return sweep_lp(x, 400, 7000, 2, 48) * (t_ / dd) ** 1.2 * env(dd, 0.05, r=0.08), 0.4
    if name == 'hit_tick': return S(tick(2600, 0.03), lp(kick(0.5, 0.4), 2000) * 0.5), 0.3
    if name == 'field_on': return S(np.sin(phase(sweep(mf(38), mf(50), 0.6), 0.6)) * env(0.6, 0.05, r=0.3) * 0.6, whoosh(0.5, True, 200, 3000) * 0.3), 0.5
    if name == 'bend': return np.sin(phase(sweep(mf(chord_note(t, 2, 24)), mf(chord_note(t, 0, 12)), 0.6), 0.6)) * env(0.6, 0.02, r=0.3) * 0.4, 0.5
    if name == 'bend_low': return np.sin(phase(sweep(mf(chord_note(t, 1, 12)), mf(chord_note(t, 0, 0)), 0.6), 0.6)) * env(0.6, 0.02, r=0.3) * 0.4, 0.5
    if name == 'photon_big':                                                   # the bremsstrahlung chime: distinctive, bright, airy
        x = np.zeros(int(2.4 * SR))
        for i, m in enumerate((81, 86, 88, 93)): ins(x, bell(m, 1.8, 2.4) * 0.45, i * 0.035 * SR)
        ins(x, np.sin(phase(sweep(mf(93), mf(105), 0.25), 0.25)) * np.exp(-tv(0.25) * 10) * 0.4, 0); ins(x, crash(1.6) * 0.15, 0)
        return x, 0.7
    if name == 'photon': m = chord_note(t, k % 4 + 1, 24); return S(glass(m, 0.6) * 0.5, zip_(2000, 7000, 0.05) * 0.3), 0.5
    if name == 'photon_tail': dd = d or 1.6; return np.sin(phase(sweep(mf(93), mf(81), dd), dd)) * env(dd, 0.02, r=0.8) * 0.18, 0.7
    if name == 'bar_fill': return np.sin(phase(sweep(mf(chord_note(t, 0, 12)), mf(chord_note(t, 0, 24)), 0.5), 0.5)) * env(0.5, 0.02, r=0.2) * 0.3, 0.3
    if name == 'heat_swell': dd = d or 2.2; return S(sweep_lp(noise(dd), 200, 1500, 2, 24) * env(dd, 0.5, r=0.8) * 0.5, hum(dd, 55, 0.05) * 0.3), 0.4
    if name == 'blades': dd = d or 0.9; x = S(bp(noise(dd), 300, 2000) * env(dd, 0.05, r=0.2) * 0.4, np.sin(phase(sweep(140, 90, dd), dd)) * env(dd, 0.05, r=0.2) * 0.3); ins(x, S(tick(900, 0.05), lp(kick(0.4, 0.3), 900) * 0.4), (dd - 0.05) * SR); return x, 0.3
    if name == 'filter_stop': return S(lp(noise(0.05), 1500) * np.exp(-tv(0.05) * 60) * 0.6, chip(chord_note(t, k % 3, 0), 0.05) * 0.3), 0.2
    if name == 'beam_bed': dd = d or 4; return bp(noise(dd), 3000, 9000) * env(dd, 0.4, r=0.6) * 0.12, 0.3
    if name == 'gantry_tick': return S(tick(1500 + 200 * (k % 4), 0.02) * 0.6, tom(200 + 30 * (k % 3), 0.08) * 0.4), 0.2
    if name == 'tag_soft': return tick(3000, 0.01), 0.1
    # ---- flow and the contrast's route
    if name == 'flow_bed': dd = d or 4; t_ = tv(dd); return lp(noise(dd), 600) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.0 * t_)) * env(dd, 0.4, r=0.6) * 0.35, 0.3
    if name == 'beat': return lp(heartbeat(), 260) * 0.7, 0.2
    if name == 'heartbeat': return heartbeat() * 0.9, 0.3
    if name == 'swirl': dd = d or 1.2; t_ = tv(dd); return (np.sin(phase(mf(81) * (1 + 0.05 * np.sin(2 * np.pi * 3 * t_)), dd)) * 0.3) * env(dd, 0.2, r=0.4), 0.6
    if name == 'inject': dd = d or 1.2; t_ = tv(dd); return S(bp(noise(dd), 400, 2400) * env(dd, 0.1, r=0.3) * 0.35, np.sin(phase(sweep(90, 70, dd), dd)) * env(dd, 0.1, r=0.3) * 0.3), 0.3
    if name == 'cut_open': dd = d or 0.7; return S(whoosh(dd, True, 500, 5000) * 0.5, zip_(800, 3000, 0.1) * 0.3), 0.4
    if name == 'mix':
        dd = d or 2.2; x = np.zeros(int((dd + 0.4) * SR))
        for i in range(int(dd * 10)): ins(x, glass(PENT[int(rng.integers(3, 10))] + 12, 0.3) * rng.uniform(0.15, 0.35), rng.uniform(0, dd) * SR)
        return x, 0.5
    if name == 'lung_whoosh': dd = d or 0.8; return whoosh(dd, True, 300, 3000) * 0.5, 0.5
    if name == 'rise_flow': dd = d or 3.4; return S(sweep_lp(noise(dd), 300, 3000, 2, 32) * env(dd, 0.5, r=0.5) * 0.4, np.sin(phase(sweep(mf(chord_note(t, 0, 0)), mf(chord_note(t, 0, 12)), dd), dd)) * env(dd, 0.3, r=0.4) * 0.15), 0.5
    if name == 'fill_motif':
        dd = d or 1.2; x = np.zeros(int((dd + 1.0) * SR))
        for i in range(8): ins(x, glass(chord_note(t, i, 12), 0.5) * 0.4, i * dd / 8 * SR)
        return x, 0.6
    if name == 'sac_fill':
        dd = d or 1.0; x = np.zeros(int((dd + 1.0) * SR))
        for i in range(6): ins(x, S(glass(chord_note(t, i, 24), 0.6) * 0.4, chip(chord_note(t, i, 24), 0.05) * 0.2), i * dd / 6 * SR)
        return x, 0.6
    if name == 'curve_rise': dd = d or 2.4; return np.sin(phase(sweep(mf(chord_note(t, 0, 0)), mf(chord_note(t, 0, 24)), dd), dd)) * env(dd, 0.1, r=0.3) * 0.25, 0.5
    if name == 'window_slide': dd = d or 1.5; return S(whoosh(dd, True, 700, 4000) * 0.4, tick(3000, 0.02) * 0.3), 0.4
    if name == 'trigger':
        x = S(boom(60, 30, 0.9) * 0.7, zip_(400, 6000, 0.12) * 0.5); ins(x, chime([chord_note(t, i, 24) for i in (0, 2)], 0.9, 0.04) * 0.6, 0); return x, 0.5
    if name == 'scan_fire': return S(zip_(300, 9000, 0.18) * 0.5, bp(noise(0.5), 2000, 8000) * np.exp(-tv(0.5) * 6) * 0.25, hum(0.5, 120, 0.2) * 0.2), 0.5
    if name == 'image_land': return S(chime([chord_note(t, i, 24) for i in range(3)], 0.9, 0.04, glass) * 0.8, tick(4000, 0.015) * 0.4), 0.6
    # ---- atoms
    if name == 'atom_bed': dd = d or 4; t_ = tv(dd); return (np.sin(2 * np.pi * mf(50) * t_) * 0.25 + np.sin(2 * np.pi * mf(57) * 1.003 * t_) * 0.18) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * t_)) * env(dd, 0.6, r=0.8), 0.6
    if name == 'photon_in': dd = d or 3.0; t_ = tv(dd); return np.sin(phase(mf(chord_note(t, 2, 24)) * (1 + 0.01 * np.sin(2 * np.pi * 7 * t_)), dd)) * env(dd, 0.3, r=0.2) * (t_ / dd) * 0.25, 0.5
    if name == 'shell_glow': return glass(chord_note(t, 0, 36), 1.0) * 0.5, 0.6
    if name == 'absorb':                                                       # photoelectric absorption: a hard, short, bright hit
        x = S(boom(56, 28, 1.4) * 0.9, kick(1.3, 1.2) * 0.6, crush(noise(0.12) * np.exp(-tv(0.12) * 30), 4, 5) * 0.3)
        ins(x, chime([chord_note(t, i, 24) for i in range(4)], 1.2, 0.02), 0.01 * SR); return x, 0.6
    if name == 'eject': return S(zip_(1500, 9000, 0.12) * 0.6, chip(chord_note(t, 3, 24), 0.08) * 0.3), 0.4
    if name == 'vacancy_blink':
        dd = d or 2.4; x = np.zeros(int((dd + 0.2) * SR))
        for i in range(int(dd * 2)): ins(x, chip(chord_note(t, 0, 36), 0.04) * 0.25, i * 0.5 * SR)
        return x, 0.3
    if name == 'scatter': m = chord_note(t, 3, 24); return S(np.sin(phase(sweep(mf(m), mf(m - 5), 0.5), 0.5)) * env(0.5, 0.005, r=0.3) * 0.6, tick(5000, 0.01) * 0.4), 0.6
    if name == 'recoil': return zip_(1200, 4000, 0.1) * 0.5, 0.3
    if name == 'arrive_tick': m = chord_note(t, k % 4, 24); return S(chip(m, 0.05) * 0.35, tick(mf(m) * 2, 0.008) * 0.3), 0.25
    if name == 'stop_tick': return S(lp(noise(0.04), 1200) * np.exp(-tv(0.04) * 70) * 0.6, chip(chord_note(t, 0, 0), 0.04) * 0.2), 0.15
    # ---- detector
    if name == 'det_bed': dd = d or 4; return (hum(dd, 50, 0.02) * 0.15 + bp(noise(dd), 4000, 9000) * env(dd, 0.4, r=0.6) * 0.05), 0.3
    if name == 'absorb_soft': x = S(lp(kick(0.8, 0.4), 1200) * 0.5); ins(x, chime([chord_note(t, i, 24) for i in (0, 2)], 0.9, 0.03, glass) * 0.7, 0); return x, 0.5
    if name == 'sparkle':
        dd = d or 0.6; x = np.zeros(int((dd + 0.8) * SR))
        for i in range(10): ins(x, glass(chord_note(t, i % 4 + int(rng.integers(0, 2)) * 4, 24), 0.4) * 0.3, rng.uniform(0, dd) * SR)
        return x, 0.6
    if name == 'light_land': return chip(chord_note(t, k % 4, 24), 0.04) * 0.3, 0.3
    if name == 'pair': m = chord_note(t, k % 4, 24); return S(np.sin(phase(sweep(mf(m), mf(m + 12), 0.15), 0.15)) * np.exp(-tv(0.15) * 14) * 0.4, np.sin(phase(sweep(mf(m), mf(m - 12), 0.15), 0.15)) * np.exp(-tv(0.15) * 14) * 0.4), 0.3
    if name in ('charge_up', 'charge_down'): dd = d or 2.8; up = name == 'charge_up'; return np.sin(phase(sweep(mf(62 if up else 74), mf(74 if up else 62), dd), dd)) * env(dd, 0.2, r=0.4) * 0.15, 0.4
    if name == 'integrate': dd = d or 1.2; return np.sin(phase(sweep(mf(chord_note(t, 0, 0)), mf(chord_note(t, 0, 24)), dd), dd)) * env(dd, 0.05, r=0.1) * 0.3, 0.4
    if name == 'bit': return ladder(t, k) * 0.7, 0.2
    if name == 'data_tick': return chip(chord_note(t, k % 4, 24), 0.04) * 0.3, 0.2
    # ---- projections and reconstruction
    if name == 'capture_click': return S(ladder(t, k) * 0.6, tick(3000 + 300 * k, 0.012) * 0.4), 0.3
    if name == 'row_tick': return S(chip(chord_note(t, k % 4, 24), 0.04) * 0.3, tick(4000, 0.008) * 0.3), 0.2
    if name == 'build_rise': dd = d or 3.2; return S(sweep_lp(noise(dd), 300, 5000, 2, 32) * (tv(dd) / dd) ** 2 * 0.4, np.sin(phase(sweep(mf(50), mf(74), dd), dd)) * env(dd, 0.3, r=0.2) * 0.12), 0.4
    if name == 'smear': dd = d or 0.8; return S(whoosh(dd, True, 400, 6000) * 0.6, np.sin(phase(sweep(mf(62), mf(74), dd), dd)) * env(dd, 0.05, r=0.3) * 0.2), 0.5
    if name == 'assemble_hit': return S(chip(chord_note(t, k, 24), 0.08) * 0.5, glass(chord_note(t, k, 36), 0.5) * 0.4, lp(kick(0.5, 0.3), 1500) * 0.3), 0.4
    if name == 'recon_complete':
        x = S(boom(54, 27, 1.2) * 0.6); ins(x, chime([chord_note(t, i, 24) for i in range(5)], 1.2, 0.03), 0); return x, 0.6
    if name == 'reveal':                                                       # the image reveal: shimmering, wide, unmistakable
        x = np.zeros(int(2.6 * SR))
        for i, m in enumerate((62, 69, 74, 77, 81, 86)): ins(x, glass(m + 12, 2.0) * 0.4, i * 0.05 * SR)
        ins(x, supersaw([62, 69, 74], 1.6, 6000, 0.005) * 0.5, 0); return x, 0.7
    if name == 'stack_click': return S(ladder(t, k) * 0.55, np.sin(phase(sweep(400, 200, 0.05), 0.05)) * np.exp(-tv(0.05) * 60) * 0.4), 0.2
    if name == 'reveal_sweep': dd = d or 0.8; return S(whoosh(dd, True, 500, 9000) * 0.6, chime([chord_note(t, i, 24) for i in range(3)], 0.8, 0.06, glass) * 0.5), 0.6
    # ---- the patient
    if name in ('calm_pad', 'warm_pad', 'pause_pad'):
        dd = d or 4; ms = CH[chord_at(t / BEAT)][1]; x = pad([m + 12 for m in ms], dd, 1600 if name == 'pause_pad' else 2400, 0.3)
        return x * (0.5 if name == 'pause_pad' else 0.7), 0.6
    if name == 'ionize': return S(zip_(1500, 5000, 0.06) * 0.3, glass(chord_note(t, 2, 36), 0.6) * 0.3), 0.5
    if name == 'clear_flow': dd = d or 2.8; return S(lp(noise(dd), 900) * env(dd, 0.4, r=0.8) * 0.3, np.sin(phase(sweep(mf(chord_note(t, 2, 12)), mf(chord_note(t, 0, 0)), dd), dd)) * env(dd, 0.3, r=0.6) * 0.15), 0.5
    if name == 'paths_open': dd = d or 0.6; x = whoosh(dd, True, 500, 5000) * 0.4; ins(x, chime([chord_note(t, i, 24) for i in range(4)], 1.0, 0.08), 0.1 * SR); return x, 0.6
    if name == 'resolve_rise': dd = d or 1.0; return S(riser(dd, 300, 8000) * 0.6, np.sin(phase(sweep(mf(57), mf(69), dd), dd)) * env(dd, 0.1, r=0.05) * 0.2), 0.4
    raise KeyError(name)
missing = set(); stamp = {}
GAIN = {'type': 0.45, 'tag': 0.8, 'arrive_tick': 0.8, 'row_tick': 0.8, 'stack_click': 1.0, 'bit': 1.0, 'room_tone': 0.6, 'flow_bed': 0.7, 'beam_bed': 0.5,
        'photon_big': 1.1, 'absorb': 1.05, 'reveal': 1.0, 'focus_hit': 1.0, 'open_hit': 0.95, 'recon_complete': 1.0, 'heartbeat': 0.9, 'beat': 0.7,
        'calm_pad': 0.6, 'warm_pad': 0.6, 'pause_pad': 0.6, 'atom_bed': 0.7, 'det_bed': 0.6, 'spin_motor': 0.7, 'e_release': 0.8, 'pair': 0.8,
        # long tonal sweeps are normalized to full peak like the hits; keep them under the music
        'trace': 0.32, 'charge_up': 0.28, 'charge_down': 0.28, 'curve_rise': 0.32, 'integrate': 0.4, 'photon_in': 0.4, 'heat_swell': 0.55, 'hum_rise': 0.5,
        'accel_rise': 0.75, 'build_rise': 0.6, 'rise_flow': 0.5, 'clear_flow': 0.5, 'photon_tail': 0.5, 'vacancy_blink': 0.6, 'swirl': 0.5, 'slide': 0.6,
        'window_slide': 0.6, 'mouse_move': 0.6, 'inject': 0.7, 'mix': 0.7, 'anode_spin': 0.6}
TEXT_SFX = {'type', 'tag'}
for cu in cuesheet['cues']:
    nm = cu['sfx']
    if NOTEXT and nm in TEXT_SFX: continue
    t = cu['t']
    if nm in SNAP:                                                             # soft UI effects play on the 16th grid
        q = round(t / S16) * S16
        if abs(q - t) <= 0.045: t = q
    key = (nm, round(t / S16))                                                 # never stack the same effect twice on one 16th
    if key in stamp: continue
    stamp[key] = 1
    try: sig, rv = make(nm, cu.get('arg'), t)
    except KeyError: missing.add(nm); continue
    sig = sig / (np.max(np.abs(sig)) + 1e-9)
    bed = 0.45 if nm in BEDS else 1.0
    put(SFX, sig, t, 0.6 * cu.get('g', 1) * bed * GAIN.get(nm, 1.0), cu.get('pan', 0), rv)
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
    i0, i1 = int(e['t0'] * SR), int(e['t1'] * SR); print(f"{e['id']:16s} music {_db(0.72 * MUS[:, i0:i1]):6.1f}  sfx {_db(2.2 * SFX[:, i0:i1]):6.1f}  dB")
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
# the loop: the tail past 180 s (reverb, ringing chimes) folds back onto the start, so the wrap is seamless
tail = mix[:, int(TOTAL * SR):int(TOTAL * SR) + SR]
mix = mix[:, :int(TOTAL * SR)]
mix[:, :tail.shape[1]] += tail
e5 = int(0.003 * SR); mix[:, :e5] *= np.linspace(0.5, 1, e5); mix[:, -e5:] *= np.linspace(1, 0.5, e5)
for _ in range(3):
    L = lufs(mix); mix *= 10 ** ((-14.0 - L) / 20)
    mix = np.tanh(mix / 0.92) * 0.92
    pk = np.max(np.abs(ss.resample_poly(mix, 4, 1, axis=1)))
    if pk > 10 ** (-1.0 / 20): mix *= 10 ** (-1.0 / 20) / pk
if len(args) > 2:
    from PIL import Image, ImageDraw
    hop = int(0.25 * SR); W_, H_ = 1440, 260; im = Image.new('RGB', (W_, H_), (16, 16, 20)); dr = ImageDraw.Draw(im)
    def curve(x, col):
        v = [_db(x[:, i:i + hop]) for i in range(0, x.shape[1] - hop, hop)]; pts = [(k * W_ / len(v), H_ - (max(-50, vv) + 50) / 50 * H_) for k, vv in enumerate(v)]; dr.line(pts, fill=col, width=2)
    for e in cuesheet['scenes']: x_ = e['t0'] / TOTAL * W_; dr.line([(x_, 0), (x_, H_)], fill=(60, 60, 70)); dr.text((x_ + 2, 2), e['id'][1:3], fill=(140, 140, 150))
    for db_ in (-10, -20, -30, -40): y_ = H_ - (db_ + 50) / 50 * H_; dr.line([(0, y_), (W_, y_)], fill=(40, 40, 48))
    sc = 10 ** ((-14.0 - L) / 20)
    curve(0.72 * MUS[:, :mix.shape[1]] * sc, (90, 160, 255)); curve(2.2 * SFX[:, :mix.shape[1]] * sc, (255, 150, 60)); curve(mix, (240, 240, 240))
    im.save(args[2]); print('curve ->', args[2])
print(f'integrated loudness {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS, {mix.shape[1] / SR:.2f} s' + ('  (no text sounds)' if NOTEXT else ''))
sf.write(OUT, mix.T.astype(np.float32), SR, subtype='PCM_24')
print('->', OUT)
