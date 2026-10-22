#!/usr/bin/env python3
"""Score + sound design for "How Electron Microscopes See Atoms" — pure code synthesis, no samples.

  uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score.wav [build/loudness.png]

A game-soundtrack groove: 120 BPM, A minor, chip-style square and pulse voices over a modern kick, sidechain pump and
a bouncing octave bass. One four-chord loop (Am–F–C–G) and one lead hook carry the whole film, so the ear has
something to come back to; each scene re-orchestrates them. 230 beats = exactly 115 s; scene boundaries fall on beats.
Structure from the brief: an instant hook (impact on frame 0, the drop on the zoom-out at 3 s) → mysterious, precise
curiosity through the machine, the sample and the vacuum (9–30 s) → acceleration: arpeggios and subdivisions that
speed up through the gun and the accelerator, a drop on the wave comparison (30–52 s) → tight mechanical optics and
the raster scan (52–74 s) → a held breath before the first scattering event, then a heavy half-time drop (74–91 s) →
rapid digital percussion building through detection and the image (91–106 s) → the climax and the strongest
resolution on the final reveal, an A-major final hit at 112 s, and a rewind that runs into the opening impact (loop).
Sound effects come from the cue sheet (tools/render.py --cues).
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
rng = np.random.default_rng(1931)                         # Knoll and Ruska, the first electron microscope
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
      'E': (40, [56, 59, 64, 68]), 'Dm': (38, [57, 62, 65, 69]), 'A': (45, [57, 61, 64, 69])}
PROG = [(0, 'Am'), (4, 'F'), (8, 'C'), (12, 'G'), (16, 'Am'),
        (20, 'Am'), (24, 'F'), (28, 'E'), (32, 'Am'), (36, 'F'), (40, 'Dm'), (44, 'E'),          # curiosity
        (48, 'Dm'), (52, 'Am'), (56, 'E'),                                                          # vacuum
        (60, 'Am'), (64, 'F'), (68, 'C'), (72, 'G'), (76, 'F'), (80, 'G'), (84, 'Am'), (88, 'E'),   # emission → acceleration
        (92, 'C'), (96, 'G'), (100, 'Am'),                                                          # the wave drop
        (104, 'Am'), (108, 'F'), (112, 'C'), (116, 'G'), (120, 'Am'), (124, 'F'), (128, 'C'), (132, 'G'),
        (136, 'Am'), (140, 'F'), (144, 'C'), (148, 'Am'), (152, 'Am'), (156, 'F'), (160, 'C'), (164, 'G'),
        (168, 'Am'), (172, 'F'), (176, 'C'), (180, 'G'), (184, 'F'), (188, 'G'), (192, 'Am'), (196, 'Am'),
        (200, 'F'), (204, 'G'), (208, 'E'), (212, 'Am'), (216, 'Am'), (220, 'F'), (224, 'A'), (228, 'G')]
def chord_at(beat):
    c = PROG[0][1]
    for b, n in PROG:
        if beat >= b - 1e-9: c = n
    return c
# the hook: a 4-bar lead over Am–F–C–G (beat offsets within the bar, MIDI)
HOOK = {'Am': [(0, 76, .5), (0.75, 74, .25), (1.5, 72, .5), (2.0, 69, .5), (2.75, 72, .25), (3.5, 74, .5)],
        'F': [(0, 77, .5), (0.75, 76, .25), (1.5, 72, .5), (2.0, 69, .5), (2.75, 72, .25), (3.25, 76, .75)],
        'C': [(0, 79, .5), (0.75, 76, .25), (1.5, 72, .5), (2.0, 76, .5), (2.75, 79, .25), (3.5, 81, .5)],
        'G': [(0, 79, .5), (0.75, 74, .25), (1.5, 71, .5), (2.0, 74, .25), (2.5, 79, .5), (3.25, 76, .75)],
        'A': [(0, 81, 1.5), (1.5, 76, .5), (2.0, 73, 1.0)], 'E': [(0, 76, .5), (0.75, 74, .25), (1.5, 71, .5), (2.0, 68, 1.5)],
        'Dm': [(0, 77, .5), (0.75, 74, .25), (1.5, 69, .5), (2.0, 74, 1.5)]}
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
# 0–6 (0–3 s) INSTANT HOOK: impact on frame 0, the groove from the first beat, filtered, rising to the drop
drums(0, 6, 'game', 0.85); bass(0, 6, 'bounce', 0.6, cut=700); arp(0, 6, 0.25, 0.42, 3200)
put(MUS, crash(1.6), 0, 0.35, 0, 0.4); put(MUS, boom(70, 32, 1.2), 0, 0.5)
put(MUS, riser(tb(2), 300, 7000), tb(4), 0.45)
# 6–18 (3–9 s) DROP on the zoom-out: the whole groove and the hook
drums(6, 18, 'game', 1.0); bass(6, 18, 'bounce', 0.8); arp(6, 18, 0.25, 0.38, 5200); chords(6, 18, 'stabs', 0.3)
hook(8, 16, 'lead', 0.9); put(MUS, crash(), tb(6), 0.55, 0, 0.4)
# 18–46 (9–23 s) SCIENTIFIC CURIOSITY: the machine and the sample — mysterious, precise
drums(18, 46, 'mystery', 0.95); bass(18, 46, 'sub', 0.55); chords(18, 46, 'pad', 0.34, cut=1300)
arp(18, 32, 0.5, 0.3, inst='glass', pattern=(0, 2, 1, 3)); arp(32, 46, 0.25, 0.26, 3000, inst='pluck', pattern=(0, 1, 2, 1, 3, 2, 1, 2))
hook(32, 44, 'bell', 0.45, -12)
# 46–60 (23–30 s) VACUUM: a slow pump pulse under a drone; a rise toward the gun
drums(46, 58, 'pulse', 0.9); bass(46, 60, 'sub', 0.5); chords(46, 60, 'pad', 0.38, cut=900)
arp(50, 58, 0.5, 0.22, inst='glass', pattern=(3, 2, 1, 0)); put(MUS, riser(tb(4), 250, 6000), tb(56), 0.4)
# 60–92 (30–46 s) ELECTRON ACCELERATION: arpeggios and subdivisions that speed up; the drop lands on the waves
drums(60, 68, 'tick', 1.0); bass(60, 76, 'pulse16', 0.6, cut=900); arp(60, 68, 0.5, 0.32, 4200); chords(60, 76, 'pad', 0.3, cut=1800)
drums(68, 76, 'game', 0.8); arp(68, 76, 0.25, 0.34, 4800)
drums(76, 90, 'drive', 0.95); bass(76, 92, 'reese', 0.72, cut=1600); chords(76, 92, 'swell', 0.32, cut=3200)
arp(76, 84, 0.25, 0.36, 5600); arp(84, 91.5, 0.125, 0.38, 7000)
put(MUS, riser(tb(10), 250, 9000), tb(80), 0.55); roll(86, 91.5, 0.14, 0.5); put(MUS, revcym(BEAT * 0.5), tb(91.5), 0.5)
# 92–104 (46–52 s) THE WAVE DROP: bright, melodic
drums(92, 104, 'game', 1.0); bass(92, 104, 'bounce', 0.8); chords(92, 104, 'stabs', 0.34); arp(92, 104, 0.25, 0.32, 5600)
hook(92, 104, 'lead', 0.85); put(MUS, crash(), tb(92), 0.55, 0, 0.4)
# 104–148 (52–74 s) MICROSCOPE OPTICS and the raster scan: tight, mechanical, locked to the beam
drums(104, 132, 'mech', 0.95); bass(104, 132, 'pulse16', 0.72, cut=1200); chords(104, 132, 'pad', 0.3, cut=2000); arp(104, 132, 0.25, 0.3, 4800, inst='chip')
hook(120, 128, 'glass', 0.5)
drums(132, 148, 'game', 0.95); bass(132, 148, 'bounce', 0.75); arp(132, 148, 0.25, 0.32, 5200); chords(132, 148, 'pad', 0.3, cut=2400)
for k in range(16): put(MUS, metal(4200 + 200 * (k % 4)), tb(140 + k * 0.5), 0.14, (k % 2 - 0.5) * 0.6)
# 148–150 the dive to the atom; 150–152 held breath; 152–166 the heavy half-time drop on the first scattering
drums(148, 150, 'game', 0.8); bass(148, 150, 'bounce', 0.6); put(MUS, riser(tb(2), 300, 8000), tb(149), 0.4)
chords(150, 152, 'swell', 0.25, cut=1500)
drums(152, 166, 'half', 1.0); bass(152, 166, 'reese', 0.8, cut=1300); chords(152, 166, 'pad', 0.32, cut=1600); arp(156, 166, 0.5, 0.26, 3800, inst='glass')
put(MUS, crash(2.4), tb(152), 0.6, 0, 0.5); put(MUS, boom(52, 26, 1.8), tb(152), 0.7)
# 166–182 (83–91 s) gold vs carbon: full groove, the hook on bells
drums(166, 182, 'game', 0.95); bass(166, 182, 'bounce', 0.78); arp(166, 182, 0.25, 0.3, 5200); chords(166, 182, 'stabs', 0.28); hook(168, 180, 'bell', 0.55)
# 182–212 (91–106 s) SIGNAL DETECTION: rapid digital percussion building to the finished image
drums(182, 198, 'drive', 0.9); bass(182, 198, 'pulse16', 0.7, cut=1300); arp(182, 198, 0.25, 0.32, 5600, inst='chip'); chords(182, 198, 'pad', 0.3, cut=2600)
drums(198, 211.5, 'build', 0.95); bass(198, 212, 'pulse16', 0.75, cut=1700); arp(198, 206, 0.25, 0.34, 6400); arp(206, 211.5, 0.125, 0.36, 8000)
chords(198, 212, 'swell', 0.36, cut=4200); put(MUS, riser(tb(14), 250, 10000), tb(198), 0.6); roll(204, 211.5, 0.16, 0.55); put(MUS, revcym(BEAT * 0.5), tb(211.5), 0.55)
# 212–216 the image is complete; 216–224 FINAL REVEAL: the strongest groove and the hook; 224 the A-major final hit
drums(212, 224, 'game', 1.0); bass(212, 224, 'reese', 0.8, cut=1900); chords(212, 224, 'stabs', 0.42); arp(212, 224, 0.25, 0.34, 6000)
hook(212, 216, 'bell', 0.6, 12); hook(216, 224, 'lead', 0.95); hook(216, 224, 'bell', 0.35, 12)
put(MUS, crash(), tb(212), 0.55, 0, 0.4); put(MUS, crash(2.4), tb(216), 0.6, 0, 0.5); put(MUS, boom(54, 27, 1.6), tb(216), 0.6)
ring_ = lambda x: x * np.exp(-tv(len(x) / SR) * 1.0)
put(MUS, ring_(supersaw(CH['A'][1] + [73, 76], 2.2, 5600, 0.005)), tb(224), 0.85, 0, 0.5)
put(MUS, ring_(pad([45, 57, 61, 64, 69], 2.2, 2600, 0.6, att=0.02)), tb(224), 0.8, 0, 0.6)
put(MUS, ring_(subbass(33, 2.0)), tb(224), 0.85); put(MUS, crash(2.4), tb(224), 0.55, 0, 0.5); put(MUS, boom(46, 23, 2.0), tb(224), 0.7)
drums(225, 227.5, 'tick', 1.0); hook(224, 227.5, 'bell', 0.4, 12)
# 227.5–230 the rewind: a reverse swell and a roll into the opening impact (loop)
put(MUS, revcym(BEAT * 2.5), tb(227.5), 0.6); roll(228, 230, 0.12, 0.45)
# held breaths
for a_, b_ in ((tb(150) + 0.03, tb(152)), (tb(211.75), tb(212)), (tb(91.75), tb(92))):
    for bus in (MUS, PUMP): bus[:, int(a_ * SR):int(b_ * SR)] *= 0.0
# sidechain pump under every kick
g = np.ones(N)
for tk in KICKS:
    s = int(tk * SR); L = min(int(0.28 * SR), N - s)
    if L > 0: g[s:s + L] = np.minimum(g[s:s + L], 1 - 0.6 * np.exp(-np.arange(L) / SR / 0.075))
MUS += PUMP * g
# the opening: the groove is filtered until the drop (0–3 s); the vacuum section is darker
for i in range(2):
    a_, b_ = 0, int(tb(6) * SR); MUS[i, a_:b_] = sweep_lp(MUS[i, a_:b_], 900, 9000, 2, 48)
    a_, b_ = int(tb(46) * SR), int(tb(58) * SR); MUS[i, a_:b_] = sweep_lp(MUS[i, a_:b_], 5000, 1400, 2, 48)

# ---------------------------------------------------------------- sound effects (from the cue sheet)
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def whoosh(d, up=True, f0=300, f1=4000):
    t = tv(d) / d; return sweep_lp(noise(d), f0 if up else f1, f1 if up else f0, 2) * np.sin(np.pi * t) ** 1.5
def zip_(f0=2000, f1=9000, d=0.06): return np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-tv(d) * 40)
def blipn(m, d=0.12): return S(fm(mf(m), d, 2.0, 1.2, 14) * 0.8, tick(mf(m) * 2, 0.01) * 0.3)
def clicks(d, n, f0=2400, f1=5200, accel=1.0):
    x = np.zeros(int((d + 0.1) * SR))
    for k in range(n):
        tt = d * (k / max(1, n - 1)) ** accel
        ins(x, S(tick(f0 + (f1 - f0) * k / max(1, n - 1), 0.012) * 0.7, crush(osc('sq', (f0 + (f1 - f0) * k / n) / 3, 0.02) * np.exp(-tv(0.02) * 120), 4, 4) * 0.25), tt * SR)
    return x
def hum(d, f0=60, am=0.0):
    t = tv(d); x = sum(np.sin(2 * np.pi * f0 * k * t) / k ** 1.3 for k in range(1, 7))
    return x * (1 + am * np.sin(2 * np.pi * 8 * t)) * env(d, min(0.5, d * 0.2), r=min(0.6, d * 0.3))
PENT = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96]   # A minor pentatonic
BEDS = {'room_tone', 'machine_hum', 'pump_hum', 'field_hum', 'gas_ticks', 'pass_through', 'scan_sweep'}
def make(name, a):
    d = a if isinstance(a, (int, float)) and a else None
    k = int(a) if isinstance(a, (int, float)) and a is not None else 0
    # ---- hook, zooms, transitions
    if name == 'impact_digital':
        return S(boom(62, 30, 1.3) * 0.9, crush(noise(0.25) * np.exp(-tv(0.25) * 14), 4, 6) * 0.25, kick(1.3, 1.0) * 0.6, glass(93, 0.8) * 0.15), 0.4
    if name == 'lock_click': return S(tick(4200, 0.015) * 0.7, crush(osc('sq', 1320, 0.05) * np.exp(-tv(0.05) * 60), 4, 3) * 0.4, zip_(2500, 6000, 0.04) * 0.3), 0.2
    if name == 'crystal':
        x = np.zeros(int(1.4 * SR))
        for i, m in enumerate((88, 93, 100)): ins(x, glass(m, 1.0) * 0.45, i * 0.035 * SR)
        return x, 0.7
    if name == 'zoom_punch': dd = d or 0.45; x = whoosh(dd, True, 300, 10000) * 1.1; x += osc('saw', sweep(90, 1400, dd), dd) * (tv(dd) / dd) ** 2 * 0.12; return x, 0.4
    if name == 'scan_pulse': dd = 0.5; t = tv(dd); return np.sin(phase(sweep(1800, 3600, dd), dd)) * (0.5 + 0.5 * np.sin(2 * np.pi * 24 * t)) * env(dd, 0.02, r=0.15) * 0.4, 0.4
    if name == 'whoosh_rise': dd = d or 1.0; x = whoosh(dd, True, 250, 9000) * 1.1; x += np.sin(phase(sweep(mf(57), mf(81), dd), dd)) * (tv(dd) / dd) ** 2 * 0.15; return x, 0.5
    if name == 'bass_drop': return S(boom(64, 26, 1.8) * 1.1, sweep_lp(noise(0.6), 3000, 200, 2, 16) * np.exp(-tv(0.6) * 5) * 0.3), 0.3
    if name == 'ui_ticks': dd = d or 0.8; return clicks(dd, int(dd * 14), 3000, 4200) * 0.5, 0.2
    if name in ('lab_whoosh', 'whoosh_back'): dd = d or 1.0; return whoosh(dd, False, 300, 7000), 0.4
    if name == 'room_tone': dd = d or 4.0; return (hum(dd, 50, 0.02) * 0.2 + lp(noise(dd), 300) * env(dd, 0.4, r=0.6) * 0.25), 0.3
    if name == 'title_hit': return S(crush(osc('sq', mf(81), 0.08) * np.exp(-tv(0.08) * 30), 5, 3) * 0.35, bell(81, 0.9, 2.0) * 0.35, tick(5000, 0.012) * 0.3), 0.5
    if name == 'machine_hum': dd = d or 2.4; return hum(dd, 50, 0.05) * 0.35, 0.3
    if name == 'blip': return S(blipn(88, 0.1), tick(5200, 0.01) * 0.3), 0.3
    if name == 'approach': dd = d or 2.6; return whoosh(dd, True, 200, 4000) * 0.8, 0.4
    if name == 'cut_sweep': dd = d or 1.9; return S(np.sin(phase(sweep(400, 2400, dd), dd)) * env(dd, 0.05, r=0.4) * 0.35, whoosh(dd, True, 1500, 9000) * 0.45), 0.4
    if name == 'part': m = PENT[(k * 2) % len(PENT)]; return S(crush(osc('sq', mf(m), 0.07) * np.exp(-tv(0.07) * 35), 5, 3) * 0.35, glass(m + 12, 0.5) * 0.3), 0.4
    if name == 'path_trace': dd = d or 3.6; return clicks(dd, int(dd * 8), 2600, 5000, 1.0) * 0.45, 0.2
    if name == 'glide': dd = d or 0.8; return whoosh(dd, True, 400, 3500) * 0.6, 0.4
    if name == 'servo':
        dd = d or 0.5; t = tv(dd); f = 420 + 160 * np.sin(np.pi * t / dd)
        return (osc('saw', f, dd) * 0.25 + osc('sq', f * 2, dd, 0.3) * 0.1) * env(dd, 0.04, r=0.1) * (1 + 0.2 * np.sin(2 * np.pi * 30 * t)), 0.2
    if name == 'place': return S(tick(2600, 0.02) * 0.6, np.sin(phase(sweep(300, 120, 0.08), 0.08)) * np.exp(-tv(0.08) * 40) * 0.6), 0.3
    if name == 'slide': dd = d or 1.0; return S(bp(noise(dd), 600, 2600) * env(dd, 0.08, r=0.2) * 0.35, osc('saw', sweep(90, 140, dd), dd) * env(dd, 0.1, r=0.2) * 0.12), 0.3
    if name == 'seat': x = np.zeros(int(0.5 * SR)); ins(x, tick(2200, 0.02) * 0.7, 0); ins(x, S(tick(1800, 0.02) * 0.7, np.sin(phase(sweep(160, 60, 0.15), 0.15)) * np.exp(-tv(0.15) * 18) * 0.8), 0.07 * SR); return x, 0.3
    if name == 'dive': dd = d or 2.4; x = whoosh(dd, True, 200, 10000) * 1.1; x += osc('saw', sweep(60, 1500, dd), dd) * (tv(dd) / dd) ** 2 * 0.12; return x, 0.4
    if name == 'reveal':
        x = np.zeros(int(1.6 * SR))
        for i, m in enumerate((81, 88, 93)): ins(x, bell(m, 1.3, 2.0) * 0.4, i * 0.05 * SR)
        return x, 0.6
    if name == 'pass_through':
        dd = d or 1.4; x = np.zeros(int((dd + 0.2) * SR))
        for i in range(int(dd * 10)): ins(x, tick(rng.uniform(4000, 7000), 0.008) * rng.uniform(0.2, 0.5), rng.uniform(0, dd) * SR)
        return x, 0.3
    if name == 'chamber_close':
        return S(np.sin(phase(sweep(120, 40, 0.4), 0.4)) * np.exp(-tv(0.4) * 9) * 1.0, lp(noise(0.5), 700) * np.exp(-tv(0.5) * 7) * 0.6, tick(1500, 0.03) * 0.6,
                 np.concatenate([np.zeros(int(0.15 * SR)), hp(noise(0.6), 3000) * env(0.6, 0.1, r=0.3) * 0.15])), 0.4
    if name == 'pump_spin':
        dd = d or 5.0; t = tv(dd); f = 80 + 1400 * (1 - np.exp(-t / (dd * 0.35)))
        return (np.sin(phase(f, dd)) * 0.25 + np.sin(phase(f * 2.01, dd)) * 0.1) * env(dd, 0.3, r=0.6) * 0.8, 0.3
    if name == 'pump_hum': dd = d or 4.6; return S(hum(dd, 47, 0.1) * 0.35, lp(noise(dd), 220) * env(dd, 0.5, r=0.8) * 0.3), 0.3
    if name == 'gas_ticks':
        dd = d or 3.6; x = np.zeros(int((dd + 0.2) * SR))
        for i in range(140):
            tt = dd * (i / 140) ** 2.4                       # collisions grow rare as the gas thins
            ins(x, tick(rng.uniform(3500, 7500), 0.007) * rng.uniform(0.2, 0.5) * (1 - 0.7 * i / 140), tt * SR)
        return x, 0.3
    if name == 'pressure_fall': dd = d or 4.2; t = tv(dd); return np.sin(phase(sweep(1600, 120, dd), dd)) * env(dd, 0.2, r=0.6) * 0.25 + np.sin(phase(sweep(2400, 180, dd), dd)) * env(dd, 0.2, r=0.6) * 0.1, 0.5
    if name == 'confirm': x = np.zeros(int(0.5 * SR)); ins(x, blipn(84, 0.1), 0); ins(x, blipn(91, 0.14), 0.09 * SR); return x, 0.4
    if name == 'rise': dd = d or 1.1; return whoosh(dd, True, 300, 8000) * 0.8, 0.4
    # ---- the gun
    if name == 'field_on': dd = d or 0.6; t = tv(dd); return S(np.sin(phase(sweep(200, 1600, dd), dd)) * env(dd, 0.05, r=0.15) * 0.4, hp(noise(dd), 5000) * (t / dd) ** 2 * 0.15 * (1 + np.sin(2 * np.pi * 60 * t))), 0.4
    if name == 'tilt_tone': dd = d or 0.6; return np.sin(phase(sweep(mf(69), mf(62), dd), dd)) * env(dd, 0.05, r=0.2) * 0.45, 0.5
    if name == 'leak': dd = d or 0.8; t = tv(dd); return S(np.sin(phase(sweep(mf(81), mf(93), dd), dd)) * env(dd, 0.2, r=0.3) * 0.3, glass(93, dd) * 0.2), 0.6
    if name == 'emit': m = PENT[(k * 3 + 4) % len(PENT)] + 12; return S(tick(mf(m), 0.012) * 0.6, crush(osc('sq', mf(m) / 2, 0.03) * np.exp(-tv(0.03) * 90), 4, 3) * 0.3), 0.3
    if name == 'beam_on': dd = d or 1.2; t = tv(dd); return (osc('saw', 110, dd) * 0.2 + np.sin(2 * np.pi * 880 * t) * 0.1) * env(dd, 0.05, r=0.4) * (0.7 + 0.3 * np.sin(2 * np.pi * 16 * t)), 0.3
    if name == 'accel_sweep': dd = d or 4.5; t = tv(dd); f = sweep(110, 1760, dd); return sweep_lp(osc('saw', f, dd) * 0.3 + osc('sq', f * 1.5, dd, 0.3) * 0.12, 600, 7000, 2, 48) * env(dd, 0.2, r=0.15) * 0.8, 0.4
    if name == 'kick':                                      # a gap of the accelerator: a zap that climbs with each stage
        m = 52 + 3 * k; return S(np.sin(phase(sweep(mf(m + 24), mf(m), 0.12), 0.12)) * np.exp(-tv(0.12) * 25) * 0.7, zip_(1500 + 300 * k, 6000 + 600 * k, 0.05) * 0.35, kick(0.6, 0.6) * 0.3), 0.3
    # ---- waves, lenses, correction
    if name == 'wave_on': dd = d or 0.9; t = tv(dd); return np.sin(phase(mf(76) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t)), dd)) * env(dd, 0.1, r=0.3) * 0.35, 0.6
    if name == 'swoosh': return whoosh(0.35, True, 800, 8000) * 0.6, 0.3
    if name == 'light_wave': dd = d or 1.4; t = tv(dd); return np.sin(phase(mf(52) * (1 + 0.05 * np.sin(2 * np.pi * 1.5 * t)), dd)) * env(dd, 0.2, r=0.4) * 0.35, 0.5
    if name == 'blur_thud': return S(np.sin(phase(sweep(140, 60, 0.3), 0.3)) * np.exp(-tv(0.3) * 10) * 0.8, lp(noise(0.3), 400) * np.exp(-tv(0.3) * 12) * 0.4), 0.4
    if name == 'e_wave': dd = d or 1.8; t = tv(dd); return np.sin(phase(mf(88) * (1 + 0.02 * np.sin(2 * np.pi * 21 * t)), dd)) * env(dd, 0.1, r=0.3) * 0.22, 0.5
    if name == 'p_sweep': dd = d or 1.3; return S(np.sin(phase(sweep(mf(64), mf(100), dd), dd)) * env(dd, 0.1, r=0.1) * 0.3, whoosh(dd, True, 800, 9000) * 0.25), 0.4
    if name == 'current_on': return S(tick(1200, 0.02) * 0.5, np.sin(phase(sweep(40, 90, 0.5), 0.5)) * env(0.5, 0.1, r=0.2) * 0.5), 0.3
    if name == 'field_hum': dd = d or 3.0; t = tv(dd); return (np.sin(2 * np.pi * 73 * t) * 0.4 + np.sin(2 * np.pi * 146.3 * t) * 0.2) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.5 * t)) * env(dd, 0.4, r=0.6) * 0.6, 0.4
    if name == 'beam_focus': dd = d or 1.4; t = tv(dd); return sweep_lp(osc('saw', sweep(mf(57), mf(69), dd), dd) * 0.3 + osc('saw', sweep(mf(57), mf(69), dd) * 1.006, dd) * 0.3, 4000, 600, 2, 32) * env(dd, 0.1, r=0.2), 0.5
    if name == 'focus_lock':
        x = S(tick(5200, 0.012) * 0.6, crush(osc('sq', mf(88), 0.05) * np.exp(-tv(0.05) * 40), 5, 3) * 0.35)
        ins(x := np.concatenate([x, np.zeros(int(1.0 * SR))]), bell(93, 0.9, 2.0) * 0.35, 0.03 * SR); return x, 0.5
    if name == 'current_up': dd = d or 1.2; return np.sin(phase(sweep(60, 160, dd), dd)) * env(dd, 0.1, r=0.2) * 0.5 + hum(dd, 60) * 0.1, 0.3
    if name == 'tune_clicks': dd = d or 1.0; return clicks(dd, 10, 3200, 4400, 0.9) * 0.6, 0.2
    if name == 'focus_sweep': dd = d or 1.0; return np.sin(phase(sweep(mf(100), mf(76), dd), dd)) * env(dd, 0.05, r=0.3) * 0.35, 0.6
    # ---- scanning and scattering
    if name == 'scan_sweep': dd = d or 2.6; t = tv(dd); return np.sin(2 * np.pi * 5200 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.2 * t)) * env(dd, 0.2, r=0.3) * 0.06, 0.2
    if name == 'scan_tick': m = PENT[k % 8] + 12; return S(tick(mf(m), 0.012) * 0.5, crush(osc('sq', mf(m), 0.035) * np.exp(-tv(0.035) * 70), 4, 3) * 0.3), 0.2
    if name == 'scan_roll': dd = d or 3.0; return clicks(dd, int(dd * 40), 3400, 6800, 0.55) * 0.45, 0.2
    if name == 'hop': return S(np.sin(phase(sweep(300, 1200, 0.08), 0.08)) * np.exp(-tv(0.08) * 30) * 0.6, tick(3800, 0.01) * 0.4), 0.4
    if name == 'approach_tone':
        dd = d or 0.9; t = tv(dd); f = sweep(mf(57), mf(69), dd)
        return (np.sin(phase(f, dd)) * 0.3 + np.sin(phase(f * 1.5, dd)) * 0.12) * (t / dd) ** 1.5 * np.clip((dd - t) / 0.02, 0, 1), 0.5
    if name == 'scatter_big': return S(zip_(6000, 1500, 0.12) * 0.5, tick(5600, 0.015) * 0.5, glass(PENT[rng.integers(4, 9)] + 12, 0.6) * 0.35, np.sin(phase(sweep(400, 90, 0.15), 0.15)) * np.exp(-tv(0.15) * 18) * 0.4), 0.5
    if name == 'scatter_tick': return S(tick(rng.uniform(3000, 5000), 0.01) * 0.5, crush(osc('sq', rng.uniform(1400, 2200), 0.02) * np.exp(-tv(0.02) * 120), 4, 3) * 0.25), 0.2
    if name == 'gold_ping': m = PENT[rng.integers(5, 10)]; return S(glass(m + 12, 0.45) * 0.45, tick(mf(m) * 2, 0.01) * 0.3), 0.5
    if name == 'carbon_tick': return tick(1600, 0.02) * 0.5, 0.2
    if name == 'pixel_dark': return S(crush(osc('sq', mf(57), 0.12) * np.exp(-tv(0.12) * 20), 4, 4) * 0.4, np.sin(phase(sweep(200, 90, 0.12), 0.12)) * np.exp(-tv(0.12) * 20) * 0.4), 0.3
    if name == 'pixel_bright': return S(crush(osc('sq', mf(93), 0.12) * np.exp(-tv(0.12) * 16), 5, 3) * 0.35, glass(100, 0.7) * 0.4), 0.5
    # ---- detection and the image
    if name == 'det_tick': return S(tick(rng.uniform(4800, 6200), 0.01) * 0.5, crush(osc('sq', 2400, 0.02) * np.exp(-tv(0.02) * 140), 4, 3) * 0.2), 0.2
    if name == 'scint_flash': return S(glass(100, 0.5) * 0.4, hp(noise(0.15), 6000) * np.exp(-tv(0.15) * 30) * 0.25, tick(6000, 0.01) * 0.3), 0.5
    if name == 'pmt_cascade':
        dd = d or 0.55; x = np.zeros(int((dd + 0.2) * SR))
        for i in range(7): ins(x, crush(osc('sq', mf(64 + i * 4), 0.05) * np.exp(-tv(0.05) * 50), 5, 3) * (0.15 + 0.05 * i), i * 0.085 * SR)
        return x, 0.3
    if name == 'signal_pulse': return S(np.sin(phase(sweep(mf(76), mf(64), 0.15), 0.15)) * np.exp(-tv(0.15) * 14) * 0.45, tick(2800, 0.012) * 0.3), 0.3
    if name == 'adc_tick': m = PENT[k % 8] + 12; return S(crush(osc('sq', mf(m), 0.04) * np.exp(-tv(0.04) * 60), 3, 5) * 0.35, tick(4000, 0.008) * 0.3), 0.2
    if name == 'pixel_click': m = PENT[k % 10] + 12; return S(tick(mf(m), 0.014) * 0.6, crush(osc('sq', mf(m), 0.05) * np.exp(-tv(0.05) * 45), 5, 3) * 0.3), 0.3
    if name == 'raster_roll':
        dd = d or 3.3; x = clicks(dd, int(dd * 60), 2200, 7600, 0.5) * 0.4; t = tv(dd)
        x[:len(t)] += sweep_lp(osc('saw', sweep(mf(57), mf(81), dd), dd) * 0.15, 400, 6000, 2, 32) * (t / dd) ** 1.5; return x, 0.3
    if name == 'image_done':
        x = np.zeros(int(1.6 * SR))
        for i, m in enumerate((69, 76, 81, 88)): ins(x, bell(m, 1.2, 2.0) * 0.35, i * 0.04 * SR)
        return x, 0.6
    if name == 'ring_ticks': dd = d or 0.6; return clicks(dd, 18, 3800, 6400, 0.8) * 0.4, 0.2
    if name == 'chain_step': m = [81, 84, 88, 91, 93, 96][k % 6]; return S(blipn(m, 0.14), glass(m + 12, 0.5) * 0.25), 0.4
    if name == 'final_hit': return S(boom(48, 24, 2.0) * 1.0, crash(2.0) * 0.4, kick(1.4, 1.2) * 0.8), 0.5
    if name == 'rewind':
        dd = d or 1.25; t = tv(dd); x = revcym(dd) * 0.6 + whoosh(dd, True, 300, 10000) * 0.6
        x += crush(np.sin(phase(sweep(2200, 300, dd), dd)) * (t / dd) * 0.25, 4, 4); return x, 0.3
    raise KeyError(name)
missing = set(); stamp = {}
GAIN = {'ui_ticks': 0.5, 'room_tone': 0.6, 'machine_hum': 0.6, 'blip': 0.8, 'part': 0.9, 'title_hit': 0.95, 'scatter_tick': 0.7, 'det_tick': 0.6,
        'gold_ping': 0.75, 'adc_tick': 0.8, 'pixel_click': 0.9, 'scan_tick': 0.85, 'emit': 0.85, 'kick': 1.0, 'gas_ticks': 0.8, 'pump_hum': 0.8,
        'impact_digital': 1.0, 'final_hit': 1.0, 'bass_drop': 0.9, 'scatter_big': 0.95, 'path_trace': 0.7, 'pass_through': 0.7, 'field_hum': 0.45,
        # long tonal effects sit under the music, not on top of it
        'pump_spin': 0.3, 'pressure_fall': 0.35, 'light_wave': 0.35, 'e_wave': 0.3, 'wave_on': 0.5, 'p_sweep': 0.55, 'accel_sweep': 0.45,
        'beam_focus': 0.55, 'beam_on': 0.5, 'tilt_tone': 0.6, 'leak': 0.6, 'current_up': 0.55, 'scan_sweep': 0.5, 'approach_tone': 0.75,
        'cut_sweep': 0.6, 'lab_whoosh': 0.7, 'whoosh_back': 0.75, 'dive': 0.8, 'raster_roll': 0.8, 'chamber_close': 0.9}
QUANT = {'title_hit', 'part', 'chain_step', 'blip', 'confirm', 'crystal', 'reveal', 'image_done', 'final_hit', 'focus_lock'}
for cu in cuesheet['cues']:
    t = cu['t']
    if cu['sfx'] in QUANT: q = round(t / S16) * S16; t = q if abs(q - t) < 0.07 else t      # nudge accents onto the 16th grid
    key = (cu['sfx'], round(t / S16), cu.get('arg'))
    if key in stamp: continue
    stamp[key] = 1
    try: sig, rv = make(cu['sfx'], cu.get('arg'))
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
