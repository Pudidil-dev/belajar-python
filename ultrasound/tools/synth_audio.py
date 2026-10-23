#!/usr/bin/env python3
"""Score + sound design for "How Ultrasound Machines Work" — pure code synthesis, no samples.

  uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score.wav [build/loudness.png]

A clean, punchy electronic groove: 120 BPM, A minor, chip-style pulse voices over a modern kick, sidechain pump and a
bouncing octave bass. One chord loop and one lead hook come back through the film; each scene re-orchestrates them.
100 beats = exactly 50 s = 25 bars; every scene boundary falls on a beat. The beat is there on frame 0 with the impact;
the drop lands on the pull-back out of the image (3 s); tight mechanical 16ths inside the probe, a held breath before
the crystals fire (9.5 s); a pulsing groove for the waves; lighter bells under the echoes so the bounces read; a build
of accelerating arpeggios and rolls while the image assembles line by line; the strongest groove on the final monitor
shot; the last bar resolves on A minor and a reverse swell runs into the opening impact, so the loop is seamless.
Sound effects come from the cue sheet (tools/render.py --cues); they are artistic, not the sound of the process itself.
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
rng = np.random.default_rng(1942)                         # Karl Dussik's first medical ultrasound images
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
def crush(x, bits=5, hold=6):
    y = np.round(x * (2 ** (bits - 1))) / (2 ** (bits - 1)); return np.repeat(y[::hold], hold)[:len(x)]

# ---------------------------------------------------------------- instruments
def kick(g=1.0, punch=1.0):
    t = tv(0.34); f = 48 + 140 * np.exp(-t * 34)
    body = np.sin(phase(f, 0.34)) * np.exp(-t * 7.5)
    return sat(body * 1.25 + 0.35 * punch * hp(noise(0.34), 2500) * np.exp(-t * 110), 1.7) * g
def clap():
    x = np.zeros(int(0.3 * SR))
    for o in (0, 0.009, 0.019, 0.028): ins(x, bp(noise(0.025), 1000, 6000) * np.exp(-tv(0.025) * 120), int(o * SR))
    x += bp(noise(0.3), 900, 5000) * np.exp(-tv(0.3) * 14) * 0.55
    return x
def chipsnare(g=1.0):                                     # 8-bit noise snare with a body
    t = tv(0.2); n = crush(bp(noise(0.2), 1500, 9000), 4, 3) * np.exp(-t * 20)
    return (n * 0.8 + 0.6 * np.sin(phase(200 * (1 + 0.4 * np.exp(-t * 50)), 0.2)) * np.exp(-t * 30)) * g
def hat(open_=False):
    d = 0.26 if open_ else 0.04; return hp(noise(d), 7800, 4) * np.exp(-tv(d) * (11 if open_ else 85))
def shaker(): return bp(noise(0.07), 4500, 12000) * env(0.07, 0.012, curve=5)
def rim(): t = tv(0.06); return (bp(noise(0.06), 1800, 5000) * 0.5 + np.sin(2 * np.pi * 1700 * t) * 0.6) * np.exp(-t * 70)
def metal(f=3200):                                        # mechanical tick: two inharmonic partials
    t = tv(0.05); return (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.47 * t)) * np.exp(-t * 90) * 0.5
def chipperc(m=84):                                       # bit-crushed blip on the offbeat (the "game" sparkle)
    d = 0.06; return crush(osc('sq', mf(m), d, 0.25) * np.exp(-tv(d) * 45), 4, 4)
def crash(d=2.2):
    t = tv(d); return (hp(noise(d), 4000, 2) * 0.8 + bp(noise(d), 2500, 9000)) * np.exp(-t * 2.2) * np.minimum(1, t / 0.003)
def tom(f=110, d=0.4):
    t = tv(d); return sat(np.sin(phase(f * (1 + 0.7 * np.exp(-t * 18)), d)) * np.exp(-t * 6) + 0.2 * lp(noise(d), 1500) * np.exp(-t * 30), 1.4)
def subbass(m, d): return osc('sin', mf(m), d) * adsr(d, 0.005, 0.05, 0.9, 0.04)[:int(d * SR)]
def chipbass(m, d, cut=1400, duty=0.25):                   # plucky pulse bass with a filter "blip"
    f = mf(m); x = 0.6 * osc('sq', f, d, duty) + 0.7 * osc('sin', f / 2, d) + 0.3 * osc('tri', f, d)
    t = tv(d); x = sweep_lp(x, cut * 3, cut, 2, 8) if d > 0.05 else x
    return x * adsr(d, 0.002, 0.08, 0.55, 0.03)[:len(x)]
def reese(m, d, cut=1500):
    f = mf(m); x = osc('saw', f * 0.995, d) + osc('saw', f * 1.005, d) + 0.25 * osc('saw', f * 2.002, d)
    x = lp(sat(x * 0.6, 1.8), cut, 4) + 0.9 * osc('sin', f / 2, d)
    return x * adsr(d, 0.004, 0.1, 0.8, 0.04)[:len(x)]
def pad(ms, d, cut=1800, bright=0.0, att=None):
    x = np.zeros(int(d * SR))
    for m in ms:
        for det in (-0.08, 0.0, 0.08): x += osc('saw', mf(m + det), d) * 0.3 + osc('tri', mf(m + det), d) * 0.25
    x = lp(x, cut + 3000 * bright); a = att if att is not None else min(0.5, d * 0.3)
    return x * env(d, a, r=min(0.8, d * 0.4)) / max(1, len(ms))
def supersaw(ms, d, cut=3800, att=0.01):
    x = np.zeros(int(d * SR))
    for m in ms:
        for det in (-0.2, -0.1, -0.03, 0.03, 0.1, 0.2): x += osc('saw', mf(m + det), d)
    return lp(x, cut) * env(d, att, r=min(0.4, d * 0.5)) / (6 * len(ms))
def bell(m, d=1.2, idx=3.0): return fm(mf(m), d, ratio=3.5, idx=idx, dec=2.6 / d) * 0.8 + fm(mf(m) * 2, d, ratio=1.0, idx=1, dec=4.5) * 0.15
def glass(m, d=0.8): return fm(mf(m), d, ratio=2.76, idx=2.4, dec=3.2 / d) * 0.7 + np.sin(2 * np.pi * mf(m) * 4.02 * tv(d)) * np.exp(-tv(d) * 9) * 0.15
def pluck(m, d=0.2, duty=0.25, cut=5200):
    f = mf(m); x = (osc('sq', f, d, duty) * 0.65 + osc('saw', f, d) * 0.35) * np.exp(-tv(d) * 13); return lp(x, cut)
def lead(m, d, duty=0.25, cut=5200, slide=0.0):
    t = tv(d); vib = 0.006 * np.sin(2 * np.pi * 6.0 * t) * np.clip((t - 0.12) * 5, 0, 1)
    f = mf(m) * (1 + vib) * (2 ** (slide * np.exp(-t * 40) / 12))
    x = osc('sq', f, d, duty) * 0.6 + osc('sq', f * 1.004, d, 0.5) * 0.3 + osc('tri', f / 2, d) * 0.25
    return lp(x, cut) * adsr(d, 0.004, 0.1, 0.7, 0.06)[:len(t)]
def riser(d, f0=200, f1=6000):
    t = tv(d) / d; return sweep_lp(noise(d), f0, f1, 2) * t ** 2 * 1.3 + osc('saw', sweep(mf(40), mf(64), d), d) * 0.12 * t ** 1.5
def revcym(d): x = crash(d)[::-1]; return x * np.linspace(0.2, 1, len(x)) ** 2
def boom(f0=55, f1=28, d=1.8):
    t = tv(d); return sat(np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-t * 2.2) * 1.4, 1.3)

# ---------------------------------------------------------------- harmony: A minor, one loop for the whole film
CH = {'Am': (45, [57, 60, 64, 69]), 'F': (41, [57, 60, 65, 69]), 'C': (36, [55, 60, 64, 67]), 'G': (43, [55, 59, 62, 67]),
      'E': (40, [56, 59, 64, 68]), 'Dm': (38, [57, 62, 65, 69])}
PROG = [(0, 'Am'), (4, 'F'), (8, 'C'), (12, 'G'), (16, 'Am'), (20, 'F'), (24, 'E'), (28, 'Am'), (32, 'F'), (36, 'C'), (40, 'G'),
        (44, 'Am'), (48, 'F'), (52, 'C'), (56, 'G'), (60, 'Am'), (64, 'Dm'), (68, 'Am'), (72, 'F'), (76, 'E'), (80, 'Am'), (84, 'F'),
        (88, 'G'), (92, 'E'), (96, 'Am')]
HOOK = {'Am': [(0, 76, .5), (0.75, 74, .25), (1.5, 72, .5), (2.0, 69, .5), (2.75, 72, .25), (3.5, 74, .5)],
        'F': [(0, 77, .5), (0.75, 76, .25), (1.5, 72, .5), (2.0, 69, .5), (2.75, 72, .25), (3.25, 76, .75)],
        'C': [(0, 79, .5), (0.75, 76, .25), (1.5, 72, .5), (2.0, 76, .5), (2.75, 79, .25), (3.5, 81, .5)],
        'G': [(0, 79, .5), (0.75, 74, .25), (1.5, 71, .5), (2.0, 74, .25), (2.5, 79, .5), (3.25, 76, .75)],
        'E': [(0, 76, .5), (0.75, 74, .25), (1.5, 71, .5), (2.0, 68, 1.5)], 'Dm': [(0, 77, .5), (0.75, 74, .25), (1.5, 69, .5), (2.0, 74, 1.5)]}
def chord_at(beat):
    c = PROG[0][1]
    for b, n in PROG:
        if beat >= b - 1e-9: c = n
    return c
ARP = [0, 2, 1, 3, 2, 1, 3, 2]                            # chord-tone pattern for the 16th arpeggio (up-down-skip)
KICKS = []

def drums(b0, b1, kind, g=1.0):
    for b in np.arange(b0, b1, 1.0):
        t0 = tb(b); ib = int(round(b))
        swing = S16 * 0.18                                  # the 2nd and 4th 16ths come late: the bounce
        if kind in ('game', 'drive', 'build'):
            put(MUS, kick(1.0), t0, 0.95 * g); KICKS.append(t0)
            if ib % 2 == 1: put(MUS, clap(), t0, 0.45 * g, 0, 0.25); put(MUS, chipsnare(), t0, 0.35 * g, 0, 0.2)
            for s in range(4):
                tt = t0 + s * S16 + (swing if s % 2 else 0)
                put(MUS, hat(), tt, (0.2 if s % 2 else 0.1) * g, 0.35 if s == 2 else -0.2)
            put(MUS, hat(True), t0 + 0.5 * BEAT, 0.13 * g, 0.3)
            if kind != 'build' and ib % 2 == 0: put(MUS, chipperc(84 + 7 * (ib % 4 == 2)), t0 + 0.75 * BEAT + swing, 0.16 * g, 0.5)
            if kind == 'drive' and ib % 4 == 3: put(MUS, kick(0.5, 0.4), t0 + 3 * S16, 0.45 * g); KICKS.append(t0 + 3 * S16)
            if kind == 'build':
                for s in range(8): put(MUS, hat(), t0 + s * S16 / 2, 0.09 * g, 0.5 * np.sin(s + ib))
        if kind == 'mystery':                               # curiosity: kick, rim, ghost shakers
            if ib % 4 == 0: put(MUS, kick(0.9, 0.5), t0, 0.8 * g); KICKS.append(t0)
            if ib % 4 == 2: put(MUS, kick(0.6, 0.3), t0 + 0.75 * BEAT, 0.5 * g); KICKS.append(t0 + 0.75 * BEAT)
            if ib % 2 == 1: put(MUS, rim(), t0, 0.3 * g, 0.2, 0.4)
            for s in range(4): put(MUS, shaker(), t0 + s * S16 + (swing if s % 2 else 0), (0.09 if s % 2 else 0.05) * g, 0.4 * np.sin(ib * 4 + s))
        if kind == 'tick':
            for s in range(4): put(MUS, hat(), t0 + s * S16, (0.08 if s == 0 else 0.045) * g, 0.4 * np.sin(ib * 4 + s))
        if kind == 'pulse':                                 # vacuum: a slow pulse, like a pump
            if ib % 2 == 0: put(MUS, kick(0.7, 0.2), t0, 0.6 * g); KICKS.append(t0)
            put(MUS, metal(2600), t0 + 0.5 * BEAT, 0.12 * g, -0.3)
        if kind == 'mech':                                  # optics: four on the floor + metallic 16ths
            put(MUS, kick(1.0), t0, 0.9 * g); KICKS.append(t0)
            if ib % 2 == 1: put(MUS, clap(), t0, 0.4 * g, 0, 0.2)
            for s in range(4): put(MUS, metal(3000 + 400 * s), t0 + s * S16 + (swing if s % 2 else 0), (0.22 if s == 2 else 0.12) * g, (s - 1.5) * 0.3)
            put(MUS, hat(True), t0 + 0.5 * BEAT, 0.1 * g, 0.3)
        if kind == 'half':                                  # the heavy half-time drop
            if ib % 4 == 0: put(MUS, kick(1.15, 1.2), t0, 1.0 * g); KICKS.append(t0)
            if ib % 4 == 3 and ib % 8 == 7: put(MUS, kick(0.8, 0.6), t0 + 0.5 * BEAT, 0.6 * g); KICKS.append(t0 + 0.5 * BEAT)
            if ib % 4 == 2: put(MUS, chipsnare(1.1), t0, 0.55 * g, 0, 0.4); put(MUS, clap(), t0, 0.35 * g, 0, 0.4)
            for s in (0, 2): put(MUS, hat(), t0 + s * S16, 0.12 * g, (s - 1) * 0.4)
            put(MUS, chipperc(91), t0 + 0.75 * BEAT, 0.12 * g, 0.5)
def bass(b0, b1, kind, g=1.0, cut=None):
    for b in np.arange(b0, b1, 0.5):
        root = CH[chord_at(b)][0]; t0 = tb(b); half = int(round(b * 2)) % 2; ib = int(round(b * 2))
        if kind == 'bounce':                                # the game bass: low / high octave, a pickup every 2 beats
            put(PUMP, chipbass(root + (12 if half else 0), BEAT / 2 * 0.85, cut or 1300), t0, g)
            if ib % 4 == 3: put(PUMP, chipbass(root + 12, S16 * 0.8, cut or 1300), t0 + S16, 0.7 * g)
        if kind == 'sub' and half == 0 and int(round(b)) % 2 == 0: put(PUMP, subbass(root, BEAT * 2), t0, 0.9 * g)
        if kind == 'pulse16':
            for s in range(2): put(PUMP, chipbass(root + (12 if (ib * 2 + s) % 8 == 6 else 0), S16 * 0.8, cut or 1100), t0 + s * S16, g * (0.9 if s == 0 else 0.7))
        if kind == 'reese': put(PUMP, reese(root + (12 if ib % 8 in (3, 7) else 0), BEAT / 2 * 0.92, cut or 1500), t0, g)
def chords(b0, b1, kind, g=1.0, cut=2200, bright=0.0):
    b = b0
    while b < b1 - 1e-9:
        c = chord_at(b); nb = min([x for x, _ in PROG if x > b + 1e-9] + [b1]); nb = min(nb, b1)
        ms = CH[c][1]; t0 = tb(b); d = tb(nb) - t0
        if kind == 'pad': put(PUMP, pad(ms, d + 0.3, cut, bright), t0, g, 0, 0.5)
        if kind == 'stabs':
            for k in np.arange(0, nb - b, 1.0): put(PUMP, supersaw(ms, BEAT * 0.3, 4200), t0 + (k + 0.5) * BEAT, g * 1.1, ((int(k) % 2) - 0.5) * 0.4, 0.3)
        if kind == 'swell': put(PUMP, supersaw(ms, d, cut, att=d * 0.8), t0, g, 0, 0.4)
        b = nb
def arp(b0, b1, step=0.25, g=1.0, cut=4800, octave=12, inst='pluck', pattern=ARP):
    n = int(round((b1 - b0) / step))
    for k in range(n):
        b = b0 + k * step; ms = CH[chord_at(b)][1]; m = ms[pattern[k % len(pattern)] % len(ms)] + octave + (12 if pattern[k % len(pattern)] >= 4 else 0)
        pan = np.sin(2 * np.pi * k / 16) * 0.6
        if inst == 'pluck': put(MUS, pluck(m, max(0.07, step * BEAT * 1.5), 0.25, cut), tb(b), g * (1.0 if k % 4 == 0 else 0.7), pan, 0.25)
        elif inst == 'chip': put(MUS, chipperc(m) * 2.2, tb(b), g * (0.9 if k % 4 == 0 else 0.6), pan, 0.2)
        else: put(MUS, glass(m + 12, 0.5), tb(b), g * (0.8 if k % 4 == 0 else 0.55), pan, 0.5)
def hook(b0, b1, inst='lead', g=1.0, oct=0):
    for bar in range(int(b0 // 4), int(np.ceil(b1 / 4))):
        bs = bar * 4; c = chord_at(bs + 0.01)
        for (o, m, d) in HOOK[c]:
            t_ = bs + o
            if t_ < b0 - 1e-9 or t_ >= b1 - 1e-9: continue
            dd = d * BEAT * 0.95
            if inst == 'lead': put(MUS, lead(m + oct, dd, slide=-1 if o == 0 else 0), tb(t_), g * 0.5, 0.1, 0.3); put(MUS, lead(m + oct + 12, dd, 0.125, 7000), tb(t_), g * 0.12, -0.2, 0.3)
            if inst == 'bell': put(MUS, bell(m + oct, 1.0), tb(t_), g * 0.42, (o / 4 - 0.5) * 0.8, 0.5)
            if inst == 'glass': put(MUS, glass(m + oct + 12, 0.7), tb(t_), g * 0.32, (o / 4 - 0.5) * 0.9, 0.6)
def roll(b0, b1, g0=0.14, g1=0.5):
    n = int(round((b1 - b0) * 4)); half = n // 2
    for k in range(n + half):
        tt = tb(b0) + (k * S16 if k < half else half * S16 + (k - half) * S16 / 2)
        if tt >= tb(b1): break
        put(MUS, chipsnare(0.9), tt, g0 + (g1 - g0) * k / (n + half), (k % 2 - 0.5) * 0.3)


# ---------------------------------------------------------------- arrangement (beats; 2 beats = 1 s)
# 0–6 (0–3 s) INSTANT HOOK: impact on frame 0 and the full groove from the first beat; a riser into the punch-in (beat 4)
drums(0, 6, 'game', 1.0); bass(0, 6, 'bounce', 0.75, cut=1200); arp(0, 6, 0.25, 0.36, 4200)
put(MUS, crash(1.6), 0, 0.35, 0, 0.4); put(MUS, boom(70, 32, 1.2), 0, 0.5); put(MUS, riser(tb(1.5), 400, 8000), tb(2.5), 0.4)
# 6–14 (3–7 s) THE DROP on the pull-back out of the image: the hook on the lead
drums(6, 14, 'game', 1.0); bass(6, 14, 'bounce', 0.8); arp(6, 14, 0.25, 0.32, 5200); chords(6, 14, 'stabs', 0.28)
hook(8, 14, 'lead', 0.85); put(MUS, crash(), tb(6), 0.5, 0, 0.4)
# 14–28 (7–14 s) INSIDE THE TRANSDUCER: tight and mechanical; a held breath, then the crystals fire on beat 19
drums(14, 18.5, 'mech', 0.9); bass(14, 18.5, 'pulse16', 0.65, cut=1000); arp(14, 18.5, 0.25, 0.26, 4200, inst='chip'); chords(14, 19, 'pad', 0.28, cut=1500)
put(MUS, riser(tb(1.5), 300, 7000), tb(17), 0.35)
drums(19, 28, 'mech', 0.95); bass(19, 28, 'pulse16', 0.72, cut=1300); arp(19, 28, 0.25, 0.28, 5200, inst='chip'); chords(19, 28, 'pad', 0.3, cut=2200)
hook(20, 28, 'glass', 0.45); put(MUS, crash(1.8), tb(19), 0.45, 0, 0.4); put(MUS, boom(60, 30, 1.0), tb(19), 0.45)
# 28–44 (14–22 s) WAVES: a pumping pulse through the gel demo, then the full drive as the wave travels into the body
drums(28, 36, 'pulse', 0.9); bass(28, 36, 'sub', 0.55); chords(28, 36, 'pad', 0.32, cut=1300); arp(28, 36, 0.5, 0.24, inst='glass', pattern=(0, 2, 1, 3))
drums(36, 44, 'drive', 0.95); bass(36, 44, 'reese', 0.7, cut=1500); chords(36, 44, 'swell', 0.28, cut=3000); arp(36, 44, 0.25, 0.3, 5600)
put(MUS, crash(), tb(36), 0.45, 0, 0.4)
# 44–62 (22–31 s) ECHOES: a lighter, bouncing groove under the echo accents; bells carry the hook
drums(44, 62, 'game', 0.85); bass(44, 62, 'bounce', 0.7, cut=1100); chords(44, 62, 'pad', 0.28, cut=1800); hook(48, 60, 'bell', 0.45)
arp(44, 62, 0.5, 0.2, inst='glass', pattern=(0, 2, 1, 3)); put(MUS, crash(), tb(44), 0.45, 0, 0.4)
# 62–78 (31–39 s) RECEIVE: switch to listening — sparse ticks and sub, then a driving pulse under the receiver trace
drums(62, 70, 'tick', 1.0); bass(62, 70, 'sub', 0.6); chords(62, 70, 'pad', 0.3, cut=1400); arp(62, 70, 0.5, 0.24, 3800, inst='chip')
drums(70, 78, 'drive', 0.9); bass(70, 78, 'pulse16', 0.7, cut=1300); arp(70, 78, 0.25, 0.3, 5200, inst='chip'); chords(70, 78, 'pad', 0.3, cut=2400)
# 78–94 (39–47 s) TIME OF FLIGHT, then the IMAGE BUILD: accelerating arpeggios, a riser and a roll into the final shot
drums(78, 84, 'mech', 0.9); bass(78, 84, 'pulse16', 0.7, cut=1200); arp(78, 84, 0.25, 0.28, 4800, inst='chip'); chords(78, 84, 'pad', 0.3, cut=2000)
drums(84, 93.5, 'build', 0.95); bass(84, 94, 'pulse16', 0.75, cut=1700); arp(84, 89, 0.25, 0.32, 6000); arp(89, 93.5, 0.125, 0.34, 8000)
chords(84, 94, 'swell', 0.34, cut=4200); put(MUS, riser(tb(9.5), 250, 10000), tb(84), 0.55); roll(90, 93.5, 0.14, 0.5); put(MUS, revcym(BEAT * 0.5), tb(93.5), 0.5)
# 94–100 (47–50 s) FINAL: the strongest groove and the hook; Am resolves; a reverse swell runs into the opening impact
drums(94, 100, 'game', 1.0); bass(94, 100, 'reese', 0.8, cut=1900); chords(94, 100, 'stabs', 0.4); arp(94, 100, 0.25, 0.32, 6000)
hook(94, 98, 'lead', 0.95); hook(96, 100, 'bell', 0.4, 12)
put(MUS, crash(2.4), tb(94), 0.55, 0, 0.5); put(MUS, boom(54, 27, 1.6), tb(95), 0.55)
put(MUS, revcym(BEAT * 2), tb(98), 0.5); roll(98.5, 100, 0.12, 0.42)
# held breaths
for a_, b_ in ((tb(18.5) + 0.03, tb(19)), (tb(93.75), tb(94))):
    for bus in (MUS, PUMP): bus[:, int(a_ * SR):int(b_ * SR)] *= 0.0
# sidechain pump under every kick
g = np.ones(N)
for tk in KICKS:
    s = int(tk * SR); L = min(int(0.28 * SR), N - s)
    if L > 0: g[s:s + L] = np.minimum(g[s:s + L], 1 - 0.6 * np.exp(-np.arange(L) / SR / 0.075))
MUS += PUMP * g
# the gel demo is darker (14–19 s)
for i in range(2):
    a_, b_ = int(tb(28) * SR), int(tb(38) * SR); MUS[i, a_:b_] = sweep_lp(MUS[i, a_:b_], 4200, 1800, 2, 48)

# ---------------------------------------------------------------- sound effects (from the cue sheet)
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def whoosh(d, up=True, f0=300, f1=4000):
    t = tv(d) / d; return sweep_lp(noise(d), f0 if up else f1, f1 if up else f0, 2) * np.sin(np.pi * t) ** 1.5
def zip_(f0=2000, f1=9000, d=0.06): return np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-tv(d) * 40)
def blipn(m, d=0.12): return S(fm(mf(m), d, 2.0, 1.2, 14) * 0.8, tick(mf(m) * 2, 0.01) * 0.3)
def hum(d, f0=60, am=0.0):
    t = tv(d); x = sum(np.sin(2 * np.pi * f0 * k * t) / k ** 1.3 for k in range(1, 7))
    return x * (1 + am * np.sin(2 * np.pi * 8 * t)) * env(d, min(0.5, d * 0.2), r=min(0.6, d * 0.3))
PENT = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96]   # A minor pentatonic
BEDS = {'hum'}
def make(name, a, t):
    k = int(a) if isinstance(a, (int, float)) and a is not None else 0
    if name == 'impact': return S(boom(62, 30, 1.3) * 0.9, crush(noise(0.25) * np.exp(-tv(0.25) * 14), 4, 6) * 0.25, kick(1.3, 1.0) * 0.6, glass(93, 0.8) * 0.15), 0.4
    if name == 'click': return S(tick(4200, 0.015) * 0.7, crush(osc('sq', 1320, 0.05) * np.exp(-tv(0.05) * 60), 4, 3) * 0.4, zip_(2500, 6000, 0.04) * 0.3), 0.2
    if name == 'scan': dd = 0.3; tt = tv(dd); return np.sin(phase(sweep(1800, 3600, dd), dd)) * (0.5 + 0.5 * np.sin(2 * np.pi * 24 * tt)) * env(dd, 0.01, r=0.1) * 0.4, 0.3
    if name == 'whoosh': dd = 0.5; x = whoosh(dd, True, 300, 10000) * 1.1; x += osc('saw', sweep(90, 1400, dd), dd) * (tv(dd) / dd) ** 2 * 0.12; return x, 0.4
    if name == 'thud': return S(np.sin(phase(sweep(140, 55, 0.3), 0.3)) * np.exp(-tv(0.3) * 10) * 0.8, lp(noise(0.3), 400) * np.exp(-tv(0.3) * 12) * 0.4), 0.4
    if name == 'hum': dd = 2.6; return S(hum(dd, 50, 0.05) * 0.35, whoosh(dd, False, 300, 6000) * 0.3), 0.3
    if name == 'gel':                                       # a soft wet contact: a damped low squelch and a little high fizz
        dd = 0.35; tt = tv(dd); return S(np.sin(phase(sweep(320, 120, dd), dd)) * np.exp(-tt * 12) * 0.6, bp(noise(dd), 900, 3500) * np.exp(-tt * 18) * 0.35 * (1 + np.sin(2 * np.pi * 38 * tt))), 0.3
    if name == 'tone':
        x = np.zeros(int(1.4 * SR))
        for i, m in enumerate((76, 81, 88)): ins(x, bell(m, 1.1, 1.8) * 0.4, i * 0.04 * SR)
        return x, 0.6
    if name == 'chirp': dd = 0.12; return S(np.sin(phase(sweep(1500, 3800, dd), dd)) * env(dd, 0.005, curve=5) * 0.5, tick(4800, 0.01) * 0.3), 0.3
    if name == 'trigger': return S(zip_(1200, 7000, 0.07) * 0.5, crush(osc('sq', 880, 0.06) * np.exp(-tv(0.06) * 50), 4, 3) * 0.35, tick(5200, 0.01) * 0.4), 0.2
    if name == 'crystal': return S(tick(5200, 0.012) * 0.6, glass(93, 0.5) * 0.4, crush(osc('sq', mf(81), 0.04) * np.exp(-tv(0.04) * 60), 5, 3) * 0.25), 0.4
    if name == 'buzz':                                      # the crystal ringing: a tone pulsing 4 times a second, dying away
        dd = 0.75; tt = tv(dd); return np.sin(2 * np.pi * mf(88) * tt) * np.abs(np.sin(2 * np.pi * 4 * tt)) * np.exp(-tt / 0.24) * 0.5, 0.4
    if name == 'sweep': dd = 0.9; return S(np.sin(phase(sweep(mf(64), mf(88), dd), dd)) * env(dd, 0.1, r=0.2) * 0.3, whoosh(dd, True, 500, 7000) * 0.35), 0.4
    if name == 'bounce':                                    # an echo turning back: a light pitched ping, higher for stronger echoes
        m = PENT[min(len(PENT) - 1, 3 + int(6 * min(1, a or 0)))]
        return S(np.sin(phase(sweep(mf(m) * 1.5, mf(m), 0.09), 0.09)) * np.exp(-tv(0.09) * 30) * 0.6, tick(mf(m) * 2, 0.01) * 0.3), 0.4
    if name == 'pass': return S(lp(noise(0.4), 600) * env(0.4, 0.02, curve=7) * 0.5, np.sin(phase(sweep(90, 160, 0.3), 0.3)) * np.exp(-tv(0.3) * 9) * 0.6), 0.3
    if name == 'wave':                                      # a pressure pulse going out: a soft swelling burst
        dd = 0.35; tt = tv(dd); return np.sin(2 * np.pi * mf(64) * tt) * np.sin(np.pi * tt / dd) ** 2 * (1 + 0.5 * np.sin(2 * np.pi * 16 * tt)) * 0.4, 0.4
    if name == 'ret': dd = 0.32; return S(np.sin(phase(sweep(mf(91), mf(74), dd), dd)) * env(dd, 0.01, r=0.1) * 0.3, whoosh(dd, False, 800, 6000) * 0.2), 0.5
    if name == 'recv': return S(np.sin(phase(sweep(mf(57), mf(69), 0.12), 0.12)) * np.exp(-tv(0.12) * 18) * 0.6, tick(3600, 0.012) * 0.4), 0.3
    if name == 'switch': x = np.zeros(int(0.4 * SR)); ins(x, blipn(88, 0.08), 0); ins(x, blipn(81, 0.12), 0.08 * SR); return x, 0.3
    if name == 'tick': return S(tick(4600, 0.012) * 0.6, crush(osc('sq', 2300, 0.02) * np.exp(-tv(0.02) * 120), 4, 3) * 0.25), 0.2
    if name == 'build':
        x = np.zeros(int(0.9 * SR))
        for i, m in enumerate((69, 72, 76, 81, 84)): ins(x, crush(osc('sq', mf(m), 0.06) * np.exp(-tv(0.06) * 40), 5, 3) * 0.35, i * 0.1 * SR)
        return x, 0.3
    if name == 'line': m = PENT[min(len(PENT) - 1, k // 9)] + 12; return S(tick(mf(m), 0.012) * 0.5, crush(osc('sq', mf(m), 0.03) * np.exp(-tv(0.03) * 80), 4, 3) * 0.3), 0.2
    if name == 'resolve':
        x = np.zeros(int(1.6 * SR))
        for i, m in enumerate((69, 76, 81, 88)): ins(x, bell(m, 1.2, 2.0) * 0.35, i * 0.04 * SR)
        return x, 0.6
    if name == 'pop': m = [81, 84, 88, 91, 93, 96][k % 6]; return S(blipn(m, 0.12), glass(m + 12, 0.4) * 0.2), 0.4
    if name == 'finish':
        x = np.zeros(int(1.8 * SR)); ins(x, S(crash(1.6) * 0.3, kick(1.2, 1.0) * 0.6), 0)
        for i, m in enumerate((81, 88, 93)): ins(x, bell(m, 1.4, 2.0) * 0.3, i * 0.05 * SR)
        return x, 0.6
    raise KeyError(name)
missing = set(); stamp = {}
GAIN = {'hum': 0.6, 'buzz': 0.7, 'wave': 0.75, 'ret': 0.7, 'line': 0.75, 'scan': 0.55, 'sweep': 0.7, 'tone': 0.85, 'resolve': 0.9, 'impact': 1.0, 'finish': 1.0}
QUANT = {'pop', 'resolve', 'finish', 'tone', 'switch'}
for cu in cuesheet['cues']:
    t = cu['t']
    if cu['sfx'] in QUANT: q = round(t / S16) * S16; t = q if abs(q - t) < 0.07 else t      # nudge accents onto the 16th grid
    key = (cu['sfx'], round(t / S16 * 2), cu.get('arg'))
    if key in stamp: continue
    stamp[key] = 1
    try: sig, rv = make(cu['sfx'], cu.get('arg') if cu.get('arg') is not None else cu.get('g', 1), t)
    except KeyError: missing.add(cu['sfx']); continue
    sig = sig / (np.max(np.abs(sig)) + 1e-9)
    bed = 0.45 if cu['sfx'] in BEDS else 1.0
    put(SFX, sig, t, 0.6 * cu.get('g', 1) * bed * GAIN.get(cu['sfx'], 1.0), cu.get('pan', 0), rv)
if missing: print('no generator for:', sorted(missing))

# ---------------------------------------------------------------- mix: reverb send → sum → loudness → limit
def reverb_ir(d=2.0, seed=9):
    r = np.random.default_rng(seed); t = tv(d)
    return [lp(r.standard_normal(len(t)), 7000) * np.exp(-t * 3.2) * 0.03 for _ in range(2)]
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
mix = mix[:, :int(TOTAL * SR)]
# no fade-out: the rewind runs into the opening impact when the video loops; only a 5 ms ramp at the very edges
e5 = int(0.005 * SR); mix[:, :e5] *= np.linspace(0, 1, e5); mix[:, -e5:] *= np.linspace(1, 0, e5)
for _ in range(3):
    L = lufs(mix); mix *= 10 ** ((-14.0 - L) / 20)
    mix = np.tanh(mix / 0.92) * 0.92
    pk = np.max(np.abs(ss.resample_poly(mix, 4, 1, axis=1)))
    if pk > 10 ** (-1.0 / 20): mix *= 10 ** (-1.0 / 20) / pk
if len(sys.argv) > 3:
    from PIL import Image, ImageDraw
    hop = int(0.25 * SR); W_, H_ = 1150, 260; im = Image.new('RGB', (W_, H_), (16, 16, 20)); dr = ImageDraw.Draw(im)
    def curve(x, col):
        v = [_db(x[:, i:i + hop]) for i in range(0, x.shape[1] - hop, hop)]; pts = [(k * W_ / len(v), H_ - (max(-50, vv) + 50) / 50 * H_) for k, vv in enumerate(v)]; dr.line(pts, fill=col, width=2)
    for e in cuesheet['scenes']: x_ = e['t0'] / TOTAL * W_; dr.line([(x_, 0), (x_, H_)], fill=(70, 70, 80)); dr.text((x_ + 2, 2), e['id'][4:9], fill=(140, 140, 150))
    for db_ in (-10, -20, -30, -40): y_ = H_ - (db_ + 50) / 50 * H_; dr.line([(0, y_), (W_, y_)], fill=(40, 40, 48))
    curve(0.72 * MUS[:, :mix.shape[1]] * 10 ** ((-14.0 - L) / 20), (90, 160, 255)); curve(2.2 * SFX[:, :mix.shape[1]] * 10 ** ((-14.0 - L) / 20), (255, 150, 60)); curve(mix, (240, 240, 240))
    im.save(sys.argv[3]); print('curve ->', sys.argv[3])
print(f'integrated loudness {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS, {mix.shape[1] / SR:.2f} s')
sf.write(OUT, mix.T.astype(np.float32), SR, subtype='PCM_24')
print('->', OUT)
