#!/usr/bin/env python3
"""Score + sound design for "How CT Scanners Actually Work" — pure code synthesis, no samples.

  uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score.wav [build/loudness.png]

Minimal techno, 120 BPM, A minor: a round four-on-the-floor kick, offbeat open hats, a rim on a syncopated figure, a
rolling 16th bass, dub chord stabs with dotted-eighth echoes, and one FM "bleep" hook that comes back through the film.
No vocals, no heavy distortion. 240 beats = exactly 120 s = 60 bars; every scene boundary falls on a beat.
The arc follows the picture: the full groove on frame 0 with the impact; a lighter bar for the room; the groove under the
gantry spin; a breakdown inside the tube (kick out) that builds into the drop at the high-voltage switch-on (24 s); a
half-time filter dip for the bullet-time photon; mechanical 16ths for the beam shaping; a darker groove under the tissue,
filtered while the two atom diagrams play; a spacious section for the attenuation tones; momentum rising while the angles
are captured, a held breath, the second peak on the helix; stripped back for the measurement; the sinogram rows play the
arpeggio; a build while the backprojection sharpens, a held breath, the big drop on the finished slice (103 s); a filter so
the three calibrated tones ring; a build under the rising arpeggio, the success hit an eighth early; the last bar is the
opening groove again and runs into the opening impact.
Sound effects come from the cue sheet (tools/render.py --cues); they are game-like and artistic, not the sound of the
machine. Everything that rings past 120 s is folded onto the start, so the loop is seamless, tails included.
"""
import json, os, sys
import numpy as np
import scipy.signal as ss
import soundfile as sf

SR = 48000
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4
cuesheet = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
TOTAL = cuesheet['total']
N = int(TOTAL * SR) + 3 * SR
MUS = np.zeros((2, N)); PUMP = np.zeros((2, N)); SFX = np.zeros((2, N)); VERB = np.zeros((2, N))
rng = np.random.default_rng(1971)                         # the first CT scan of a patient (Atkinson Morley's Hospital)
def tb(beat): return beat * BEAT

# ---------------------------------------------------------------- helpers
def tv(d): return np.arange(max(1, int(d * SR))) / SR
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def put(bus, sig, t, g=1.0, pan=0.0, verb=0.0):
    s = int(round(t * SR))
    if s >= N or len(sig) == 0: return
    pan = np.asarray(pan, float)
    if pan.ndim and len(pan) < len(sig): pan = np.pad(pan, (0, len(sig) - len(pan)), 'edge')
    if s < 0:
        sig = sig[-s:]; pan = pan[-s:] if pan.ndim else pan; s = 0
    sig = sig[:N - s] * g
    if pan.ndim: pan = pan[:len(sig)]
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
def kick(g=1.0, punch=1.0):                               # round, short: a sine sweep and a click, only a touch of saturation
    t = tv(0.34); f = 46 + 130 * np.exp(-t * 32)
    body = np.sin(phase(f, 0.34)) * np.exp(-t * 7.0)
    return sat(body * 1.15 + 0.3 * punch * hp(noise(0.34), 2500) * np.exp(-t * 120), 1.5) * g
def clap():
    x = np.zeros(int(0.3 * SR))
    for o in (0, 0.009, 0.019, 0.028): ins(x, bp(noise(0.025), 1000, 6000) * np.exp(-tv(0.025) * 120), int(o * SR))
    x += bp(noise(0.3), 900, 5000) * np.exp(-tv(0.3) * 14) * 0.55
    return x
def chipsnare(g=1.0):                                     # 8-bit noise snare with a body (rolls)
    t = tv(0.2); n = crush(bp(noise(0.2), 1500, 9000), 4, 3) * np.exp(-t * 20)
    return (n * 0.8 + 0.6 * np.sin(phase(200 * (1 + 0.4 * np.exp(-t * 50)), 0.2)) * np.exp(-t * 30)) * g
def hat(open_=False):
    d = 0.26 if open_ else 0.04; return hp(noise(d), 7800, 4) * np.exp(-tv(d) * (11 if open_ else 85))
def shaker(): return bp(noise(0.07), 4500, 12000) * env(0.07, 0.012, curve=5)
def rim(): t = tv(0.06); return (bp(noise(0.06), 1800, 5000) * 0.5 + np.sin(2 * np.pi * 1700 * t) * 0.6) * np.exp(-t * 70)
def metal(f=3200):                                        # mechanical tick: two inharmonic partials
    t = tv(0.05); return (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.47 * t)) * np.exp(-t * 90) * 0.5
def chipperc(m=84):                                       # bit-crushed blip (the "game" sparkle)
    d = 0.06; return crush(osc('sq', mf(m), d, 0.25) * np.exp(-tv(d) * 45), 4, 4)
def crash(d=2.2):
    t = tv(d); return (hp(noise(d), 4000, 2) * 0.8 + bp(noise(d), 2500, 9000)) * np.exp(-t * 2.2) * np.minimum(1, t / 0.003)
def tom(f=110, d=0.4):
    t = tv(d); return sat(np.sin(phase(f * (1 + 0.7 * np.exp(-t * 18)), d)) * np.exp(-t * 6) + 0.2 * lp(noise(d), 1500) * np.exp(-t * 30), 1.4)
def subbass(m, d): return osc('sin', mf(m), d) * adsr(d, 0.005, 0.05, 0.9, 0.04)[:int(d * SR)]
def rbass(m, d, cut=900, dec=9.0):                        # rolling bass note: a sine body, a little saw and pulse, a filter pluck
    f = mf(m); t = tv(d)
    x = 0.8 * np.sin(phase(f * (1 + 0.04 * np.exp(-t * 80)), d)) + 0.3 * osc('saw', f, d) + 0.2 * osc('sq', f, d, 0.3) + 0.3 * np.sin(phase(f / 2, d))
    x = sweep_lp(x, cut * 2.5, cut * 0.8, 2, 6)
    return x * np.minimum(1, t / 0.002) * np.exp(-t * dec) * np.clip((d - t) / 0.006, 0, 1)
def stab_voice(ms, d=0.18, cut=1500):                     # dub chord stab: detuned saws through a closing filter
    x = np.zeros(int(d * SR))
    for m in ms:
        for det in (-0.06, 0.06): x += osc('saw', mf(m + det), d) * 0.5 + osc('sq', mf(m + det), d, 0.5) * 0.15
    return sweep_lp(x / len(ms), cut * 2.4, cut * 0.6, 2, 8) * env(d, 0.003, curve=4.5)
def bleep(m, d=0.14):                                     # the FM bleep of the hook
    f = mf(m); t = tv(d)
    x = np.sin(2 * np.pi * f * t + 1.3 * np.exp(-t * 28) * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 22)
    return x + 0.15 * osc('sq', f, d, 0.5) * np.exp(-t * 45)
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
def riser(d, f0=200, f1=6000):
    t = tv(d) / d; return sweep_lp(noise(d), f0, f1, 2) * t ** 2 * 1.3 + osc('saw', sweep(mf(40), mf(64), d), d) * 0.12 * t ** 1.5
def revcym(d): x = crash(d)[::-1]; return x * np.linspace(0.2, 1, len(x)) ** 2
def boom(f0=55, f1=28, d=1.8):
    t = tv(d); return sat(np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-t * 2.2) * 1.4, 1.3)

# ---------------------------------------------------------------- harmony: A minor; the chords follow the scenes
CH = {'Am': (45, [57, 60, 64, 67, 71]), 'F': (41, [53, 57, 60, 64, 67]), 'G': (43, [55, 59, 62, 64, 69]),
      'Em': (40, [55, 59, 62, 64, 67]), 'Dm': (38, [53, 57, 60, 62, 65]), 'E': (40, [56, 59, 62, 64, 68])}
PROG = [(0, 'Am'), (8, 'F'), (16, 'G'), (20, 'Am'), (28, 'F'), (32, 'Em'),          # S01 hook, S02 room, S03 gantry
        (34, 'Dm'), (40, 'F'), (44, 'E'),                                           # S04 breakdown → the dominant into the drop
        (48, 'Am'), (56, 'F'), (60, 'Em'), (64, 'Am'), (72, 'F'), (76, 'Em'),       # S05 energy, S06 beam
        (78, 'Dm'), (84, 'Am'), (88, 'F'), (92, 'Em'),                              # S07 tissue
        (98, 'Am'), (106, 'F'), (110, 'Em'), (114, 'Am'), (122, 'F'), (126, 'G'),   # S08 attenuation, S09 detector
        (130, 'Am'), (138, 'F'), (142, 'E'),                                        # S10 angles → the dominant run-up
        (146, 'Am'), (152, 'F'), (156, 'G'), (160, 'Am'), (168, 'Dm'), (172, 'Em'), # S11 helix, S12 measurement
        (176, 'Am'), (184, 'F'), (188, 'G'),                                        # S13 sinogram
        (192, 'Dm'), (198, 'F'), (202, 'E'), (206, 'Am'),                           # S14: calm, build on the dominant, the drop
        (216, 'F'), (220, 'Em'), (224, 'F'), (228, 'G'), (232, 'E'), (235.5, 'Am')] # S15, S16 rising; the push into S17
def chord_at(beat):
    c = PROG[0][1]
    for b, n in PROG:
        if beat >= b - 1e-9: c = n
    return c
def tones_at(t, lo=76, span=30):                           # the chord sounding at time t, as notes from `lo` up
    pcs = set(m % 12 for m in CH[chord_at(t / BEAT)][1])
    return [m for m in range(lo, lo + span) if m % 12 in pcs]
# the hook: one bar of FM bleeps on a 16-step grid, re-voiced on each chord; odd bars answer
BLEEP = {'Am': [(0, 76), (3, 81), (6, 79), (8, 76), (10, 74), (11, 76), (14, 72)],
         'F': [(0, 77), (3, 81), (6, 79), (8, 77), (10, 76), (11, 77), (14, 72)],
         'G': [(0, 74), (3, 79), (6, 83), (8, 79), (10, 76), (11, 74), (14, 71)],
         'Em': [(0, 76), (3, 79), (6, 83), (8, 79), (10, 74), (11, 76), (14, 71)],
         'Dm': [(0, 74), (3, 77), (6, 81), (8, 77), (10, 74), (11, 72), (14, 69)],
         'E': [(0, 76), (3, 80), (6, 83), (8, 80), (10, 76), (11, 80), (14, 83)]}
def answer(p): return p[:4] + [(11, p[4][1]), (12, p[1][1]), (14, p[2][1] + 12)]
ARP = [0, 2, 1, 3, 2, 1, 3, 2]
KICKS = []; DIPS = []; BREATHS = []
RIM16 = (3, 6, 11, 14)                                     # the rim figure over a bar of 16ths

def drums(b0, b1, kind, g=1.0):
    for b in np.arange(b0, b1 - 1e-9, 1.0):
        t0 = tb(b); ib = int(round(b)); p = ib % 4; sw = S16 * 0.14       # a light shuffle on the 2nd and 4th 16ths
        at = lambda s: t0 + s * S16 + (sw if s % 2 else 0)
        if kind in ('four', 'mech', 'build', 'lite'): put(MUS, kick(1.0), t0, 0.95 * g); KICKS.append(t0)
        if kind in ('four', 'mech', 'build') and p in (1, 3): put(MUS, clap(), t0, 0.34 * g, 0, 0.3)
        if kind == 'four':
            for s, v in enumerate((0.05, 0.1, 0.0, 0.1)): put(MUS, hat(), at(s), v * g, -0.25 + 0.15 * s)
            put(MUS, hat(True), t0 + 0.5 * BEAT, 0.14 * g, 0.25)
            for s in range(4):
                if 4 * p + s in RIM16: put(MUS, rim(), at(s), 0.15 * g, 0.35, 0.3)
                put(MUS, shaker(), at(s), (0.04 if s % 2 else 0.022) * g, -0.4)
        if kind == 'lite':                                 # kick, the offbeat hat, the rim figure: room to think
            put(MUS, hat(True), t0 + 0.5 * BEAT, 0.12 * g, 0.25)
            if p in (1, 3): put(MUS, rim(), t0, 0.12 * g, -0.2, 0.4)
            for s in range(4):
                if 4 * p + s in RIM16: put(MUS, rim(), at(s), 0.12 * g, 0.35, 0.35)
        if kind == 'break':                                # no kick: ghost hats, rim and shaker keep the pulse
            for s, v in enumerate((0.03, 0.06, 0.04, 0.06)): put(MUS, hat(), at(s), v * g, 0.3 * np.sin(ib + s))
            for s in range(4):
                if 4 * p + s in RIM16: put(MUS, rim(), at(s), 0.14 * g, 0.3, 0.45)
                put(MUS, shaker(), at(s), (0.05 if s % 2 else 0.03) * g, -0.35)
            if p == 2: put(MUS, clap(), t0, 0.2 * g, 0, 0.7)
        if kind == 'half':                                 # bullet time: kick on 1, clap on 3, eighth hats
            if p == 0: put(MUS, kick(1.05, 0.8), t0, 0.9 * g); KICKS.append(t0)
            if p == 2: put(MUS, clap(), t0, 0.4 * g, 0, 0.5); put(MUS, chipsnare(), t0, 0.2 * g, 0, 0.4)
            put(MUS, hat(), t0, 0.06 * g, -0.2); put(MUS, hat(True), t0 + 0.5 * BEAT, 0.08 * g, 0.25)
        if kind == 'mech':                                 # the machine: metallic 16ths in place of the hats
            for s in range(4): put(MUS, metal(3000 + 400 * s), at(s), (0.2 if s == 2 else 0.11) * g, (s - 1.5) * 0.3)
            put(MUS, hat(True), t0 + 0.5 * BEAT, 0.11 * g, 0.3)
            if p == 3: put(MUS, chipperc(84 + 7 * (ib // 4 % 2)), t0 + 0.75 * BEAT + sw, 0.12 * g, 0.5)
        if kind == 'build':                                # 16th hats getting louder; the snare roll comes from roll()
            for s in range(4): put(MUS, hat(), at(s), (0.07 + 0.05 * (s % 2)) * g, 0.4 * np.sin(s + ib))
            put(MUS, hat(True), t0 + 0.5 * BEAT, 0.12 * g, 0.25)
def bass(b0, b1, kind, g=1.0, cut=None):
    for b in np.arange(b0, b1 - 1e-9, 1.0):
        root = CH[chord_at(b)][0]; t0 = tb(b); ib = int(round(b))
        if kind == 'roll':                                 # the rolling techno bass: the three 16ths after each kick
            for s, dm, v in ((1, 0, 0.9), (2, 0, 0.6), (3, 12 if ib % 2 else 7, 0.75)):
                put(PUMP, rbass(root + dm, S16 * 0.92, cut or 900), t0 + s * S16, g * v)
        if kind == 'off': put(PUMP, rbass(root, BEAT * 0.42, cut or 700, 6), t0 + BEAT / 2, g)
        if kind == 'pulse':
            for s in range(4): put(PUMP, rbass(root + (12 if s == 3 and ib % 2 else 0), S16 * 0.85, cut or 800), t0 + s * S16, g * (0.9 if s == 2 else 0.62))
        if kind == 'sub' and ib % 2 == 0: put(PUMP, subbass(root, BEAT * 2), t0, 0.9 * g)
def stabs(b0, b1, g=1.0, cut=1400, steps=(3, 10), fb=0.45, echoes=4):
    for bar in range(int(b0 // 4), int(np.ceil(b1 / 4))):
        for s in steps:
            b = bar * 4 + s / 4
            if b < b0 - 1e-9 or b >= b1 - 1e-9: continue
            v = stab_voice(CH[chord_at(b)][1], 0.18, cut); put(PUMP, v, tb(b), g, 0, 0.35)
            for k in range(1, echoes + 1):                 # dotted-eighth echoes, each darker, ping-ponged
                put(PUMP, lp(v, cut * 0.72 ** k), tb(b) + 3 * k * S16, g * fb ** k, 0.55 if k % 2 else -0.55, 0.35)
def bleeps(b0, b1, g=1.0, oct=0, density=1.0):
    for bar in range(int(b0 // 4), int(np.ceil(b1 / 4))):
        for s in range(16):
            b = bar * 4 + s / 4
            if b < b0 - 1e-9 or b >= b1 - 1e-9: continue
            pat = BLEEP[chord_at(b)]; pat = answer(pat) if bar % 2 else pat
            hit = [m for (st, m) in pat if st == s]
            if not hit or (density < 1 and ((s * 7 + bar * 3) % 10) / 10 >= density): continue
            m = hit[0] + oct; pan = 0.3 * np.sin(s * 1.7 + bar)
            put(MUS, bleep(m), tb(b), 0.5 * g, pan, 0.3); put(MUS, lp(bleep(m), 3000), tb(b) + 3 * S16, 0.17 * g, -pan, 0.4)
def chords(b0, b1, kind, g=1.0, cut=2200, bright=0.0):
    b = b0
    while b < b1 - 1e-9:
        c = chord_at(b); nb = min([x for x, _ in PROG if x > b + 1e-9] + [b1]); nb = min(nb, b1)
        ms = CH[c][1]; t0 = tb(b); d = tb(nb) - t0
        if kind == 'pad': put(PUMP, pad(ms, d + 0.3, cut, bright), t0, g, 0, 0.5)
        if kind == 'swell': put(PUMP, supersaw(ms, d, cut, att=d * 0.8), t0, g, 0, 0.4)
        b = nb
def arp(b0, b1, step=0.25, g=1.0, cut=4800, octave=12, inst='pluck', pattern=ARP):
    n = int(round((b1 - b0) / step))
    for k in range(n):
        b = b0 + k * step; ms = CH[chord_at(b)][1]; m = ms[pattern[k % len(pattern)] % len(ms)] + octave
        pan = np.sin(2 * np.pi * k / 16) * 0.6
        if inst == 'pluck': put(MUS, pluck(m, max(0.07, step * BEAT * 1.5), 0.25, cut), tb(b), g * (1.0 if k % 4 == 0 else 0.7), pan, 0.25)
        elif inst == 'chip': put(MUS, chipperc(m) * 2.2, tb(b), g * (0.9 if k % 4 == 0 else 0.6), pan, 0.2)
        else: put(MUS, glass(m + 12, 0.5), tb(b), g * (0.8 if k % 4 == 0 else 0.55), pan, 0.5)
def roll(b0, b1, g0=0.14, g1=0.5):
    n = int(round((b1 - b0) * 4)); half = n // 2
    for k in range(n + half):
        tt = tb(b0) + (k * S16 if k < half else half * S16 + (k - half) * S16 / 2)
        if tt >= tb(b1) - 1e-9: break
        put(MUS, chipsnare(0.9), tt, g0 + (g1 - g0) * k / (n + half), (k % 2 - 0.5) * 0.3)
def dip(b0, b1, f_lo, a=0.35, r=0.5): DIPS.append((tb(b0), tb(b1), f_lo, a, r))
def breath(b0, b1): BREATHS.append((tb(b0), tb(b1)))
def CRASH(b, g=0.45, d=2.2): put(MUS, crash(d), tb(b), g, 0, 0.4)

# ---------------------------------------------------------------- arrangement (beats; 2 beats = 1 s)
# 0–8 (0–4 s) S01 HOOK: the impact and the whole groove on frame 0 — kick, rolling bass, dub stabs, the bleep hook
drums(0, 8, 'four'); bass(0, 8, 'roll', 0.8); stabs(0, 8, 0.32); bleeps(0, 8, 0.9); CRASH(0, 0.4, 1.8)
# 8–20 (4–10 s) S02 THE ROOM: lighter — offbeat bass and a pad; the hook answers once; a reverse cymbal into the gantry
drums(8, 20, 'four', 0.85); bass(8, 20, 'off', 0.75); chords(8, 20, 'pad', 0.28, cut=1800); stabs(8, 20, 0.22, steps=(3,)); bleeps(12, 16, 0.55)
put(MUS, revcym(BEAT * 2), tb(18), 0.35)
# 20–34 (10–17 s) S03 THE GANTRY: the full groove under the spin
drums(20, 34, 'four'); bass(20, 34, 'roll', 0.8); stabs(20, 34, 0.3); bleeps(24, 34, 0.85); CRASH(20)
# 34–48 (17–24 s) S04 BREAKDOWN inside the tube: kick out, pad and sub; at 22 s the kick comes back under a riser and a roll
drums(34, 44, 'break', 0.8); bass(34, 44, 'sub', 0.55); chords(34, 48, 'pad', 0.32, cut=1400); bleeps(36, 44, 0.4, density=0.5)
drums(44, 47.5, 'build', 0.85); bass(44, 47.5, 'pulse', 0.6, cut=600); roll(46, 47.5, 0.12, 0.45); put(MUS, riser(tb(3.5), 250, 9000), tb(44), 0.5)
breath(47.5, 48)
# 48–64 (24–32 s) S05 ENERGY: the drop on the cut to the high voltage; a half-time dip for the bullet-time photon (26–28 s);
# the full groove back under the spray of photons (29 s)
drums(48, 52, 'four'); bass(48, 52, 'roll', 0.85, cut=1100); stabs(48, 52, 0.34); bleeps(48, 52, 1.0); CRASH(48, 0.55); put(MUS, boom(60, 30, 1.0), tb(48), 0.4)
drums(52, 56, 'half', 0.85); bass(52, 56, 'sub', 0.6); chords(52, 58, 'pad', 0.28, cut=1600); dip(52, 57.5, 650)
drums(56, 58, 'build', 0.85); bass(56, 58, 'pulse', 0.65); roll(57, 58, 0.12, 0.4); put(MUS, revcym(BEAT), tb(57), 0.4)
drums(58, 64, 'four'); bass(58, 64, 'roll', 0.85, cut=1200); stabs(58, 64, 0.3); arp(58, 64, 0.25, 0.24, 5200, inst='chip'); CRASH(58)
# 64–78 (32–39 s) S06 BEAM SHAPING: the mechanical groove (metal 16ths), sparser stabs
drums(64, 78, 'mech', 0.9); bass(64, 78, 'roll', 0.75, cut=950); stabs(64, 78, 0.24, steps=(3,)); bleeps(68, 76, 0.5); CRASH(64, 0.4)
# 78–98 (39–49 s) S07 TISSUE: a darker groove; the music closes down while the two atom diagrams play (42–47 s)
drums(78, 98, 'four', 0.9); bass(78, 98, 'off', 0.75); chords(78, 98, 'pad', 0.24, cut=1500); stabs(78, 84, 0.24); stabs(94, 98, 0.24)
bleeps(78, 84, 0.55); bleeps(94, 98, 0.55); dip(84, 94, 1300); CRASH(78, 0.35)
# 98–114 (49–57 s) S08 ATTENUATION: light and spacious; the three transmission tones lead
drums(98, 114, 'lite', 0.85); bass(98, 114, 'off', 0.65, cut=600); chords(98, 114, 'pad', 0.24, cut=1700); arp(110, 114, 0.5, 0.16, inst='glass', pattern=(0, 2, 1, 3))
# 114–130 (57–65 s) S09 DETECTOR: the groove back; the hit–flash–signal chain is the melody, the stabs answer it
drums(114, 130, 'four', 0.9); bass(114, 130, 'roll', 0.75); stabs(114, 130, 0.26); bleeps(126, 130, 0.55); CRASH(114, 0.4)
# 130–146 (65–73 s) S10 ANGLES: momentum rising — then a run-up (16th bass, a chip arpeggio, a roll) and a held breath
drums(130, 140, 'four', 0.95); bass(130, 140, 'roll', 0.8); stabs(130, 140, 0.28); bleeps(130, 140, 0.7)
drums(140, 145.5, 'build', 0.95); bass(140, 145.5, 'pulse', 0.75, cut=900); arp(141, 145.5, 0.25, 0.26, 6000, inst='chip'); roll(142, 145.5, 0.12, 0.5)
breath(145.5, 146)
# 146–160 (73–80 s) S11 HELICAL: the second peak — everything in
drums(146, 160, 'four'); bass(146, 160, 'roll', 0.85, cut=1200); stabs(146, 160, 0.34); bleeps(146, 160, 1.0); arp(150, 160, 0.25, 0.18, 5200)
CRASH(146, 0.55); put(MUS, boom(58, 29, 1.2), tb(146), 0.4)
# 160–176 (80–88 s) S12 MEASUREMENT: stripped back for the numbers
drums(160, 176, 'lite', 0.85); bass(160, 176, 'off', 0.65, cut=650); chords(160, 176, 'pad', 0.22, cut=1500); bleeps(168, 176, 0.35, density=0.6)
# 176–192 (88–96 s) S13 SINOGRAM: the groove under the rows; the rows themselves play the arpeggio
drums(176, 192, 'four', 0.9); bass(176, 192, 'roll', 0.75); stabs(176, 192, 0.22, steps=(3,)); CRASH(176, 0.35)
# 192–212 (96–106 s) S14 BACKPROJECTION: calm for the filter and the smear; a build while the image sharpens (99–102.75 s);
# a held breath; the big drop on the finished slice (103 s)
drums(192, 198, 'lite', 0.8); bass(192, 198, 'sub', 0.55); chords(192, 198, 'pad', 0.28, cut=1600)
drums(198, 205.5, 'build', 0.95); bass(198, 205.5, 'pulse', 0.75, cut=900); chords(198, 206, 'swell', 0.26, cut=3600); roll(202, 205.5, 0.12, 0.55)
put(MUS, riser(tb(7.5), 250, 10000), tb(198), 0.45); breath(205.5, 206)
drums(206, 212, 'four'); bass(206, 212, 'roll', 0.9, cut=1300); stabs(206, 212, 0.36); bleeps(206, 212, 1.0); arp(206, 212, 0.25, 0.2, 6000)
CRASH(206, 0.6, 2.4); put(MUS, boom(62, 30, 1.2), tb(206), 0.45)
# 212–224 (106–112 s) S15 CT NUMBERS: the groove under a filter so the three calibrated tones ring; it opens for the windows
drums(212, 224, 'four', 0.85); bass(212, 224, 'off', 0.7); stabs(216, 224, 0.24); chords(212, 216, 'pad', 0.22); dip(212, 217, 900)
# 224–236 (112–118 s) S16 VOLUME: slices stack; a build under the rising arpeggio; held breath; the success hit an eighth early
drums(224, 230, 'four', 0.95); bass(224, 230, 'roll', 0.8); stabs(224, 230, 0.3); bleeps(224, 230, 0.65)
drums(230, 235, 'build', 0.95); bass(230, 235, 'pulse', 0.75, cut=1000); roll(232, 235, 0.12, 0.5); put(MUS, riser(tb(5), 300, 10000), tb(230), 0.4)
breath(235, 235.5); put(PUMP, rbass(45, BEAT * 0.45, 1100, 6), tb(235.5), 0.9); CRASH(235.5, 0.5, 1.8)
# 236–240 (118–120 s) S17 FINAL: the opening groove again under the title; a reverse cymbal runs into the loop's impact
drums(236, 240, 'four'); bass(236, 240, 'roll', 0.85); stabs(236, 240, 0.32); bleeps(236, 240, 0.9)
put(MUS, revcym(BEAT * 1.5), tb(238.5), 0.4)

# ---------------------------------------------------------------- bus processing: dips, held breaths, sidechain, phone
for (t0, t1, f_lo, a, r) in DIPS:                         # low-pass the music: down to f_lo, hold, open again; crossfaded edges
    i0, i1 = int(t0 * SR), int(t1 * SR); n = i1 - i0; B = max(8, int((t1 - t0) * 40)); L_ = t1 - t0
    u = (np.arange(B) + 0.5) / B * L_
    fc = np.where(u < a, 16000 * (f_lo / 16000) ** (u / a), np.where(u > L_ - r, f_lo * (16000 / f_lo) ** ((u - (L_ - r)) / r), f_lo))
    edges = np.linspace(0, n, B + 1).astype(int); xf = int(0.03 * SR); w = np.ones(n); w[:xf] = np.linspace(0, 1, xf); w[-xf:] = np.linspace(1, 0, xf)
    for bus in (MUS, PUMP):
        for ch in range(2):
            seg = bus[ch, i0:i1].copy(); y = np.zeros(n); zi = None
            for k in range(B):
                s_ = sos('low', fc[k], 2)
                if zi is None: zi = ss.sosfilt_zi(s_) * seg[0]
                y[edges[k]:edges[k + 1]], zi = ss.sosfilt(s_, seg[edges[k]:edges[k + 1]], zi=zi)
            bus[ch, i0:i1] = seg * (1 - w) + y * w
for (t0, t1) in BREATHS:                                  # silence, with 4 ms edges
    i0, i1 = int(t0 * SR), int(t1 * SR); e = int(0.004 * SR); g_ = np.zeros(i1 - i0); g_[:e] = np.linspace(1, 0, e); g_[-e:] = np.linspace(0, 1, e)
    for bus in (MUS, PUMP): bus[:, i0:i1] *= g_
g = np.ones(N)                                            # sidechain pump under every kick
for tk in KICKS:
    s = int(tk * SR); L = min(int(0.28 * SR), N - s)
    if L > 0: g[s:s + L] = np.minimum(g[s:s + L], 1 - 0.6 * np.exp(-np.arange(L) / SR / 0.075))
# the bass bus is saturated a little: upper harmonics carry the bass line on phone speakers
MUS += np.tanh(2.0 * PUMP) / 2.0 * 0.95 * g
for tk in KICKS:                                          # a short click on every kick, so the beat reads without low end
    tt = tv(0.014); put(MUS, (np.sin(2 * np.pi * 3100 * tt) * 0.6 + bp(noise(0.014), 2500, 6000) * 0.5) * np.exp(-tt * 260), tk, 0.16)
for i in range(2): MUS[i] = MUS[i] - 0.5 * lp(MUS[i], 70, 2) - 0.25 * bp(MUS[i], 70, 140, 2)   # less sub (inaudible on a phone)

# ---------------------------------------------------------------- sound effects (from the cue sheet)
class NoGen(Exception): pass
CNT = {}
def nth(name): CNT[name] = CNT.get(name, -1) + 1; return CNT[name]
PENT = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100]   # A minor pentatonic from A4
def R(x, v=0.3, pan=None, pre=0.0): return (x, v, pan, pre)
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def swoosh(d, f0, f1, shape='bell'):                     # noise through a gliding low-pass, with an amplitude shape
    u = tv(d) / d; x = sweep_lp(noise(d), f0, f1, 2, 48)
    amp = {'bell': np.sin(np.pi * u) ** 1.5, 'rise': u ** 2 * np.minimum(1, (1 - u) / 0.04), 'fall': np.minimum(1, u / 0.02) * (1 - u) ** 1.6}[shape]
    return x * amp
def zip_(f0=2000, f1=9000, d=0.06): return np.sin(phase(sweep(f0, f1, d), d)) * np.exp(-tv(d) * 40)
def blipn(m, d=0.12): return S(fm(mf(m), d, 2.0, 1.2, 14) * 0.8, tick(mf(m) * 2, 0.01) * 0.3)
def chip(m, d=0.08, duty=0.25, dec=35): return crush(osc('sq', mf(m), d, duty) * np.exp(-tv(d) * dec), 4, 3)
def pew(f0, f1, d=0.06): return crush(osc('sq', sweep(f0, f1, d), d, 0.25) * np.exp(-tv(d) * 30), 4, 3)
def hum(d, f0=60, am=0.0):
    t = tv(d); x = sum(np.sin(2 * np.pi * f0 * k * t) / k ** 1.3 for k in range(1, 7))
    return x * (1 + am * np.sin(2 * np.pi * 8 * t)) * env(d, min(0.5, d * 0.2), r=min(0.6, d * 0.3))
def swell(u, peak=0.6): return np.where(u < peak, (u / peak) ** 1.2, np.clip((1 - u) / (1 - peak), 0, 1))
def motor(f, lev, d, ripple=37, ang=None):                # a motor whose pitch and level follow its speed
    tt = tv(d); ph = phase(f, d)
    x = (0.55 * np.sin(ph) + 0.3 * np.sin(2 * ph + 0.3) + 0.18 * np.sin(3.01 * ph)) * (1 + 0.2 * np.sin(2 * np.pi * ripple * tt))
    x = x + 0.35 * bp(noise(d), 500, 2600) * lev
    if ang is not None: x = x * (0.75 + 0.25 * np.cos(2 * ang))     # two swishes per turn: the tube passing top and bottom
    return x * (0.1 + 0.9 * lev ** 0.7) * env(d, 0.04, r=0.2)
def s10_rev(tt):                                          # S10's gantry speed (turns/s) from its betaAt(): 45° steps, then a run-up
    tl = tt + 1.0; STOP = np.radians([0, 45, 90, 135, 180]); u = (tl - 1.0) / 1.1; kk = np.clip(np.floor(u).astype(int), 0, 3); f = u - np.floor(u)
    q = np.clip(f / 0.62, 0, 1); cio = np.where(q < .5, 4 * q ** 3, 1 - (-2 * q + 2) ** 3 / 2)
    step = np.where(u >= 4, STOP[4], STOP[kk] + (STOP[kk + 1] - STOP[kk]) * cio)
    beta = np.where(tl < 1.0, 0, np.where(tl < 5.4, step, STOP[4] + 2.4 * (tl - 5.4) ** 2 + 1.2 * (tl - 5.4)))
    return np.maximum(0, np.gradient(beta, 1 / SR)) / (2 * np.pi)

def make(name, cu):
    a = cu.get('arg'); t = cu['t']; num = isinstance(a, (int, float)) and not isinstance(a, bool); k = int(a) if num else 0
    D = lambda dflt: float(a) if num and a > 0 else dflt
    sc = cu.get('scene', '')
    # ---- the opening, the monitor
    if name == 'impact': return R(S(boom(62, 30, 1.3) * 0.9, crush(noise(0.25) * np.exp(-tv(0.25) * 14), 4, 6) * 0.25, kick(1.3, 1.0) * 0.6, glass(93, 0.8) * 0.15), 0.4)
    if name == 'beat_in': d = 0.28; return R(S(pew(1400, 180, d) * 0.6, lp(noise(d), 900) * np.exp(-tv(d) * 18) * 0.2), 0.2)
    if name == 'scan_on': x = np.zeros(int(0.3 * SR)); ins(x, blipn(88, 0.1), 0); ins(x, blipn(93, 0.16), 0.07 * SR); return R(x, 0.3)
    if name == 'plane_sweep':
        d = D(0.7); tt = tv(d)
        return R(S(np.sin(phase(sweep(2400, 700, d), d)) * (0.6 + 0.4 * np.sin(2 * np.pi * 24 * tt)) * env(d, 0.02, r=0.15) * 0.5, swoosh(d, 5000, 900) * 0.35), 0.3)
    if name == 'voxel_clicks':
        x = np.zeros(int(0.6 * SR))
        for i in range(14): ins(x, chip(PENT[6 + (i * 5) % 7] + 12, 0.03, 0.5, 90) * (1 - i / 18), (i * 0.032 + 0.006 * (i % 3)) * SR)
        return R(x, 0.2)
    if name == 'lift': d = D(0.5); return R(S(np.sin(phase(sweep(260, 820, d), d)) * env(d, 0.03, r=0.15) * 0.5, swoosh(d, 400, 4000) * 0.4), 0.3)
    if name == 'recon_shimmer':
        x = np.zeros(int(1.3 * SR))
        for i, m in enumerate((81, 84, 88, 91, 93, 96)): ins(x, glass(m, 0.7) * 0.4, i * 0.05 * SR)
        ins(x, hp(noise(0.9), 6000) * env(0.9, 0.2, r=0.5) * 0.08, 0); return R(x, 0.6)
    if name in ('stack_out', 'stack_in'):
        up = name == 'stack_out'; x = np.zeros(int(0.5 * SR))
        for i in range(4): j = i if up else 3 - i; ins(x, S(tick(3000 * 1.12 ** j, 0.02) * 0.6, chip(PENT[5 + j] + 12, 0.04) * 0.3), i * 0.06 * SR)
        ins(x, swoosh(0.3, 500, 5000) * 0.3 if up else np.sin(phase(sweep(150, 55, 0.25), 0.25)) * np.exp(-tv(0.25) * 12) * 0.6, 0 if up else 0.2 * SR)
        return R(x, 0.3)
    if name == 'layer_scan':
        d = 0.4; x = np.zeros(int(d * SR))
        for i in range(12): ins(x, tick(2000 + 300 * i, 0.012) * 0.4, i * d / 12 * SR)
        return R(S(x, bp(noise(d), 1800, 6000) * np.sin(np.pi * tv(d) / d) ** 2 * 0.25), 0.3)
    # ---- camera moves
    if name in ('whoosh_out', 'pull_back', 'follow_down'):
        d = D(1.0); x = S(swoosh(d, 7000, 300, 'fall'), np.sin(phase(sweep(900, 260, d), d)) * env(d, 0.01, r=d * 0.6) * 0.12)
        if name == 'whoosh_out': x = S(x, np.sin(phase(sweep(110, 40, d), d)) * np.exp(-tv(d) * 4) * 0.3)
        return R(x, 0.35)
    if name in ('whoosh_long', 'air_glide', 'whoosh_soft'):
        d = D(1.5); return R(S(swoosh(d, 300, 5200 if name == 'whoosh_long' else 2600), np.sin(phase(sweep(420, 260, d), d)) * np.sin(np.pi * tv(d) / d) ** 2 * 0.08), 0.4)
    if name in ('approach', 'push_in', 'whoosh_in', 'zoom_rush'):
        d = D(0.6); u = tv(d) / d; x = swoosh(d, 300, 9000 if name == 'zoom_rush' else 6000, 'rise')
        if name == 'zoom_rush': x = S(x, np.sin(phase(sweep(400, 4200, d), d)) * u ** 1.5 * 0.35)
        if name == 'approach': x = S(x, np.sin(phase(sweep(55, 95, d), d)) * u ** 2 * 0.5)
        return R(x, 0.3)
    if name == 'swing':
        d = D(1.5); u = tv(d) / d
        return R(S(swoosh(d, 400, 3500), np.sin(phase(sweep(300, 520, d), d)) * np.sin(np.pi * u) ** 2 * 0.1), 0.35, np.sin((u - 0.5) * np.pi) * 0.8)
    if name == 'turn':
        d = D(1.2); u = tv(d) / d
        return R(S(swoosh(d, 500, 3000) * 0.8, np.sin(phase(500 + 260 * np.sin(np.pi * u), d)) * np.sin(np.pi * u) ** 2 * 0.15), 0.35, -np.sin((u - 0.5) * np.pi) * 0.6)
    if name == 'tilt_3d':
        d = D(1.4); u = tv(d) / d; x = S(swoosh(d, 300, 4000), np.sin(phase(sweep(300, 760, d), d)) * np.sin(np.pi * u) ** 2 * 0.15)
        ins(x, tick(3600, 0.02) * 0.5, (d - 0.05) * SR); return R(x, 0.35)
    if name == 'spiral_sweep':
        d = D(2.0); tt = tv(d); u = tt / d; f = sweep(300, 1250, d) * (1 + 0.04 * np.sin(2 * np.pi * (2 + 6 * u) * tt))
        return R(S(np.sin(phase(f, d)) * np.sin(np.pi * u) ** 1.2 * 0.4, swoosh(d, 600, 5000) * 0.4), 0.45, 0.7 * np.sin(2 * np.pi * 0.8 * tt))
    if name == 'dive':
        d = D(1.3); u = tv(d) / d; return R(S(swoosh(d, 6000, 500), np.sin(phase(sweep(900, 220, d), d)) * np.sin(np.pi * u) * 0.2), 0.4)
    if name == 'whoosh_e':                                # bullet time: a slowed, low whoosh with a falling tone
        d = D(0.8); u = tv(d) / d; return R(S(lp(swoosh(d, 1200, 400), 1500), np.sin(phase(sweep(640, 240, d), d)) * np.sin(np.pi * u) * 0.3), 0.5)
    if name in ('dissolve_in', 'cover_fade'):             # a reversed glass chord: something thinning out / materialising
        d = D(0.7); x = np.zeros(int(d * SR) + 1)
        for m in tones_at(t, 76)[:4]: ins(x, glass(m + 12, d) * 0.3, 0)
        x = x[::-1] * np.linspace(0.2, 1, len(x)) ** 2; return R(S(x, swoosh(d, 800, 6000, 'rise') * 0.25), 0.5)
    # ---- the room and the machine
    if name == 'room_tone':
        d = D(5.0); tt = tv(d)
        x = S(hum(d, 50, 0.03) * 0.25, lp(noise(d), 700) * 0.35 * (1 + 0.15 * np.sin(2 * np.pi * 0.3 * tt)), np.sin(2 * np.pi * 3520 * tt) * 0.012)
        return R(x * env(d, 0.6, r=1.2), 0.3)
    if name == 'table_motor':                             # S02: one smooth move in; S11: a steady feed
        d = D(2.6); u = tv(d) / d
        sp = 16 * u ** 2 * (1 - u) ** 2 if sc == 's02_room' else np.minimum(1, np.minimum(u * d / 0.4, (1 - u) * d / 0.5))
        return R(motor(170 + 120 * sp, sp, d, 41), 0.2)
    if name in ('spin_motor', 'motor_spin'):              # turns/s from each scene's own rotation curve
        d = D(3.0); tt = tv(d); u = tt / d
        if sc == 's03_gantry': rev = 10 * u ** 2 * (1 - u) ** 2
        elif sc == 's10_angles': rev = s10_rev(tt)
        else: rev = 0.4 * np.minimum(1, np.minimum(tt / 0.4, (d - tt) / 0.5))
        return R(motor(70 + 220 * rev, np.clip(rev / 0.7, 0, 1), d, 37, 2 * np.pi * np.cumsum(rev) / SR), 0.25)
    if name == 'milestone':                               # quarter turns: A, C, E, G, A
        m = (81, 84, 88, 91, 93)[min(4, k // 90)]; x = S(chip(m, 0.1, 0.25, 22) * 0.6, glass(m + 12, 0.5) * 0.3)
        if k == 360: x = S(x, np.concatenate([np.zeros(int(0.08 * SR)), chip(m + 12, 0.18, 0.25, 14) * 0.6]))
        return R(x, 0.4)
    if name == 'tag':                                     # a label appears: a two-note menu blip
        m = (88, 91)[nth('tag') % 2]; x = np.zeros(int(0.09 * SR)); ins(x, chip(m, 0.03, 0.5, 60), 0); ins(x, chip(m + 5, 0.04, 0.5, 50), 0.03 * SR)
        return R(x, 0.2)
    if name == 'hw_on':
        x = np.zeros(int(0.7 * SR)); ins(x, np.sin(phase(sweep(120, 45, 0.3), 0.3)) * np.exp(-tv(0.3) * 9) * 0.7, 0)
        for i, m in enumerate((69, 72, 76, 81)): ins(x, chip(m, 0.06, 0.25, 30) * 0.45, (0.02 + i * 0.045) * SR)
        ins(x, crush(bp(noise(0.08), 1500, 7000) * np.exp(-tv(0.08) * 30), 4, 4) * 0.25, 0); return R(x, 0.3)
    # ---- the tube
    if name == 'open_cut':
        d = D(0.9); x = np.zeros(int((d + 0.3) * SR)); ins(x, metal(2400) * 1.2, 0); ins(x, metal(3400) * 0.8, 0.03 * SR)
        ds = d * 0.75; ins(x, bp(noise(ds), 700, 2600) * np.sin(np.pi * tv(ds) / ds) ** 1.5 * 0.45, 0.08 * SR)
        ins(x, S(np.sin(phase(sweep(160, 70, 0.2), 0.2)) * np.exp(-tv(0.2) * 16) * 0.6, metal(1800) * 0.6), (0.08 + ds) * SR); return R(x, 0.3)
    if name == 'heat_hum':                                # the filament heats: an electric hum rising, a crackle thickening
        d = D(1.6); tt = tv(d); u = tt / d; f = 55 + 25 * u
        x = sweep_lp(osc('saw', f, d) * 0.5 + np.sin(phase(f * 2, d)) * 0.3, 500, 2400, 2, 24) * np.minimum(1, u / 0.3) * np.minimum(1, (1 - u) / 0.15)
        imp = (rng.random(len(tt)) < 0.0004 + 0.003 * u) * rng.standard_normal(len(tt))
        return R(S(x, bp(imp, 2000, 7000) * 0.8), 0.25)
    if name == 'lattice_in':
        d = D(1.2); x = np.zeros(int((d + 0.8) * SR))
        for i, m in enumerate(tones_at(t, 79)[:6]): ins(x, glass(m + 12, 0.6) * 0.35, i * d / 7 * SR)
        return R(x, 0.5)
    if name == 'e_release': m = PENT[3 + k % 9]; return R(S(pew(mf(m) * 2, mf(m), 0.07), tick(mf(m) * 2, 0.008) * 0.3), 0.25)
    if name == 'hv_on':                                   # 120 kV on: a thump, a crackle, a quick rise, a hum dying away
        x = np.zeros(int(0.9 * SR)); ins(x, np.sin(phase(sweep(95, 34, 0.45), 0.45)) * np.exp(-tv(0.45) * 6) * 0.9, 0)
        n3 = int(0.3 * SR); ins(x, crush(bp(noise(0.3), 1800, 8000), 4, 4) * (rng.random(n3) < 0.2) * np.exp(-tv(0.3) * 8) * 0.5, 0)
        ins(x, np.sin(phase(sweep(200, 1400, 0.15), 0.15)) * env(0.15, 0.005, curve=3) * 0.35, 0.02 * SR)
        ins(x, hum(0.6, 100, 0.2) * 0.35 * np.exp(-tv(0.6) * 3), 0.1 * SR); return R(x, 0.35)
    if name == 'accel_rise':                              # the electrons speed up
        d = D(1.2); u = tv(d) / d; f = sweep(150, 2400, d)
        x = S(lp(osc('sq', f, d, 0.3), 5000) * 0.35 + np.sin(phase(f, d)) * 0.3, swoosh(d, 300, 8000, 'rise') * 0.4)
        return R(x * (0.3 + 0.7 * u ** 1.5) * np.minimum(1, (1 - u) / 0.03), 0.3)
    if name == 'chirp': f = mf(81 + 2 * k); d = 0.07; return R(np.sin(phase(sweep(f * 0.6, f, d), d)) * env(d, 0.004, curve=4) * 0.6, 0.3)
    if name == 'hit_tick': return R(S(tick(5200, 0.015) * 0.7, metal(4200) * 0.8, crush(noise(0.02), 3, 2) * np.exp(-tv(0.02) * 200) * 0.3), 0.3)
    if name == 'bend':                                    # the electron swerves past a nucleus and slows: the pitch falls
        d = 0.5; tt = tv(d); u = tt / d; f = 1400 * (0.3 + 0.7 * (1 - u) ** 2) * (1 + 0.01 * np.sin(2 * np.pi * 9 * tt))
        return R(np.sin(phase(f, d)) * env(d, 0.01, r=0.15) * 0.5, 0.4)
    if name == 'photon_big':                              # the featured X-ray photon: a bright golden ding, a fast zap under it
        x = np.zeros(int(1.6 * SR)); ins(x, bell(88, 1.4, 2.4) * 0.5, 0); ins(x, glass(100, 0.8) * 0.25, 0.01 * SR); ins(x, pew(3200, 1100, 0.12) * 0.4, 0)
        ins(x, chip(93, 0.08, 0.5, 30) * 0.3, 0.06 * SR); return R(x, 0.55)
    if name == 'photon': m = PENT[min(len(PENT) - 1, 2 + int(round(k / 120 * 10)))]; return R(S(chip(m + 12, 0.06, 0.25, 40) * 0.6, glass(m + 12, 0.25) * 0.25), 0.3)
    if name == 'fill_rise': d = D(0.6); return R(S(np.sin(phase(sweep(320, 1300, d), d)) * env(d, 0.02, r=0.1) * 0.4, swoosh(d, 400, 5000, 'rise') * 0.3), 0.3)
    if name == 'heat_swell':
        d = D(1.6); tt = tv(d); u = tt / d
        x = sweep_lp(osc('saw', mf(45), d) + osc('saw', mf(52) * 1.003, d) * 0.7, 250, 1600, 2, 32) * swell(u) * 0.5
        imp = (rng.random(len(tt)) < 0.0015 * u) * rng.standard_normal(len(tt)); return R(S(x, bp(imp, 2500, 8000) * 0.6), 0.3)
    if name == 'bar_fill':
        x = np.zeros(int(0.7 * SR))
        for i, m in enumerate(PENT[:9]): ins(x, chip(m + 12, 0.05, 0.5, 40) * (0.4 + 0.06 * i), i * 0.035 * SR)
        return R(x, 0.3)
    # ---- the beam
    if name == 'beam_on':
        d = D(1.0); tt = tv(d)
        x = (np.sin(2 * np.pi * 220 * tt) * 0.25 + np.sin(2 * np.pi * 440 * tt) * 0.2 + np.sin(2 * np.pi * 661 * tt) * 0.1) * (1 + 0.1 * np.sin(2 * np.pi * 13 * tt))
        return R(S((x + bp(noise(d), 3000, 7000) * 0.12) * env(d, 0.04, r=min(0.4, d * 0.3)), pew(2400, 900, 0.08) * 0.4), 0.3)
    if name == 'absorb_tick':
        f = 2600 + 1400 * ((nth('absorb_tick') * 0.618) % 1)
        return R(S(tick(f, 0.012) * 0.5, bp(noise(0.01), 3000, 9000) * np.exp(-tv(0.01) * 400) * 0.4), 0.1)
    if name == 'jaws':                                    # two servo runs, then the jaws seat with a clunk
        d = D(1.0); x = np.zeros(int((d + 0.3) * SR))
        for o, (f0, f1) in ((0, (300, 700)), (0.32, (320, 760))):
            z = np.sin(phase(sweep(f0, f1, 0.22), 0.22)) * 0.4 + crush(osc('sq', sweep(f0 / 2, f1 / 2, 0.22), 0.22, 0.4), 5, 2) * 0.15
            ins(x, z * env(0.22, 0.01, r=0.04), o * SR)
        ins(x, S(metal(2000), np.sin(phase(sweep(170, 60, 0.18), 0.18)) * np.exp(-tv(0.18) * 18) * 0.6), d * 0.7 * SR); return R(x, 0.3)
    if name == 'beam_pulse': return R(S(np.sin(phase(sweep(180, 90, 0.25), 0.25)) * np.exp(-tv(0.25) * 12) * 0.7, lp(noise(0.2), 1500) * np.exp(-tv(0.2) * 20) * 0.3, chip(81, 0.08) * 0.3), 0.35)
    # ---- inside the head
    if name == 'transmit_pulse':
        m = tones_at(t, 84)[nth('transmit_pulse') % 3]; return R(np.sin(2 * np.pi * mf(m) * tv(0.09)) * np.exp(-tv(0.09) * 45) * 0.6, 0.35)
    if name == 'photoelectric':                           # the photon flies in (0.5 s), is swallowed, and an electron is thrown out
        x = np.zeros(int(1.3 * SR)); q = 0.5
        ins(x, np.sin(phase(sweep(mf(84), mf(91), q), q)) * np.linspace(0.1, 1, int(q * SR)) ** 2 * 0.3, 0)
        ins(x, S(crush(lp(noise(0.14), 1400), 4, 6) * np.exp(-tv(0.14) * 22) * 0.5, np.sin(phase(sweep(220, 70, 0.16), 0.16)) * np.exp(-tv(0.16) * 18) * 0.5), q * SR)
        ins(x, pew(500, 2600, 0.14) * 0.55, (q + 0.02) * SR); ins(x, glass(96, 0.5) * 0.2, (q + 0.04) * SR)
        return R(x, 0.4, None, q)
    if name == 'compton':                                 # the photon flies in, glances off an electron, leaves lower and to one side
        x = np.zeros(int(1.3 * SR)); q = 0.5; n = len(x)
        ins(x, np.sin(phase(sweep(mf(84), mf(91), q), q)) * np.linspace(0.1, 1, int(q * SR)) ** 2 * 0.3, 0)
        ins(x, tick(4200, 0.015) * 0.5, q * SR); ins(x, pew(800, 2200, 0.08) * 0.35, (q + 0.01) * SR)
        ds = 0.45; ins(x, np.sin(phase(sweep(mf(88), mf(81), ds), ds)) * env(ds, 0.005, curve=5) * 0.5, (q + 0.02) * SR)
        pan = np.clip((np.arange(n) / SR - q) / 0.4, 0, 1) * 0.7
        return R(x, 0.45, pan, q)
    # ---- attenuation, detector
    if name in ('tone_air', 'tone_tissue', 'tone_bone'):  # same tone, three transmissions (100 %, 67 %, 37 %): levels set in GAIN
        i = ('tone_air', 'tone_tissue', 'tone_bone').index(name); m = (84, 81, 77)[i]
        return R(lp(bell(m, 1.2, 1.4), (9000, 4000, 2000)[i]), 0.45)
    if name == 'xray_hit': return R(S(np.sin(2 * np.pi * 2637 * tv(0.05)) * np.exp(-tv(0.05) * 70) * 0.6, tick(5600, 0.01) * 0.4), 0.2)
    if name == 'crystal_ping':
        m = tones_at(t, 88)[(0, 2, 1, 3, 2, 4, 3, 1, 0)[nth('crystal_ping') % 9]]
        return R(S(glass(m, 0.45) * 0.6, np.sin(2 * np.pi * mf(m) * tv(0.3)) * np.exp(-tv(0.3) * 12) * 0.3), 0.45)
    if name == 'chirp_e': d = 0.06; return R(np.sin(phase(sweep(1100, 2600, d), d)) * env(d, 0.003, curve=4) * 0.5, 0.25)
    if name == 'confirm':
        x = np.zeros(int(0.5 * SR)); ins(x, blipn(88, 0.08), 0); ins(x, blipn(93, 0.2), 0.08 * SR); ins(x, glass(105, 0.4) * 0.2, 0.08 * SR); return R(x, 0.35)
    # ---- angles and the helix
    if name == 'capture_click':
        m = (81, 84, 88, 91, 93)[k % 5]; x = np.zeros(int(0.35 * SR))
        ins(x, S(metal(3000) * 0.9, crush(noise(0.015), 3, 2) * 0.3), 0); ins(x, metal(2200) * 0.6, 0.05 * SR); ins(x, chip(m, 0.1, 0.25, 25) * 0.5, 0.02 * SR)
        return R(x, 0.3)
    if name == 'capture_tick': m = PENT[4 + nth('capture_tick') % 8] + 12; return R(S(chip(m, 0.04, 0.5, 60) * 0.6, tick(mf(m), 0.01) * 0.3), 0.2)
    if name == 'momentum_rise':
        d = D(2.6); u = tv(d) / d
        x = S(swoosh(d, 200, 9500, 'rise') * 0.6, osc('saw', sweep(mf(40), mf(64), d), d) * 0.12 * u ** 1.5)
        return R(x * (0.75 + 0.25 * np.sin(2 * np.pi * np.cumsum(6 + 26 * u) / SR)), 0.35)
    if name == 'rot_pulse':
        d = 0.5; u = tv(d) / d
        return R(S(bp(noise(d), 400, 2600) * np.sin(np.pi * u) ** 3 * 0.6, np.sin(phase(sweep(520, 380, d), d)) * np.sin(np.pi * u) ** 3 * 0.25), 0.3)
    # ---- the measurement
    if name == 'ray_on': d = 0.6; tt = tv(d); return R((np.sin(2 * np.pi * 1760 * tt) * 0.4 + np.sin(2 * np.pi * 3520 * tt) * 0.15) * env(d, 0.04, r=0.3), 0.4)
    if name == 'signal_pulse': d = 0.18; return R(S(sweep_lp(osc('sq', mf(84), d, 0.3), 6000, 700, 2, 12) * np.exp(-tv(d) * 14) * 0.5, tick(2400, 0.015) * 0.4), 0.35)
    if name == 'calc_click':
        i = nth('calc_click'); x = np.zeros(int(0.1 * SR)); ins(x, chip(96 - 3 * i, 0.025, 0.5, 90), 0); ins(x, chip(91 - 3 * i, 0.03, 0.5, 80), 0.035 * SR); return R(x, 0.2)
    if name == 'calc_confirm':
        x = np.zeros(int(0.7 * SR))
        for i, m in enumerate((81, 84, 88)): ins(x, chip(m, 0.07, 0.25, 30) * 0.5, i * 0.05 * SR)
        ins(x, glass(93, 0.5) * 0.3, 0.15 * SR); return R(x, 0.4)
    if name == 'sweep_up': d = D(1.4); return R(S(np.sin(phase(sweep(380, 1500, d), d)) * env(d, 0.05, r=0.2) * 0.35, swoosh(d, 600, 6000) * 0.3), 0.4)
    if name == 'chime_small': x = np.zeros(int(1.0 * SR)); ins(x, glass(93, 0.8) * 0.5, 0); ins(x, glass(100, 0.6) * 0.3, 0.06 * SR); return R(x, 0.55)
    # ---- the sinogram
    if name == 'data_stream':
        d = D(1.2); x = np.zeros(int((d + 0.1) * SR)); n = int(d / 0.03)
        for i in range(n): ins(x, chip(PENT[(i * 7 + i // 3) % 9] + 12, 0.025, 0.5, 90) * (0.5 + 0.5 * np.sin(np.pi * i / n)), i * 0.03 * SR)
        return R(lp(x, 7000), 0.2)
    if name == 'rows_tick':
        d = D(6.0); x = np.zeros(int(d * SR)); st = S16 / 2
        for i in range(int(d / st)): ins(x, bp(noise(0.006), 4000, 10000) * (0.6 if i % 4 == 0 else 0.3), i * st * SR)
        return R(x, 0.1)
    if name == 'pixel_place':                             # each new row is a note: the rows play the arpeggio
        ms = tones_at(t, 76); m = ms[(0, 2, 4, 1, 3, 5)[k % 6]] + (12 if (k // 6) % 2 else 0)
        return R(S(chip(m, 0.09, 0.25, 26) * 0.55, glass(m + 12, 0.3) * 0.2), 0.3)
    if name == 'chime_complete':
        x = np.zeros(int(2.0 * SR))
        for i, m in enumerate((81, 84, 88, 93)): ins(x, bell(m, 1.4, 2.0) * 0.32, i * 0.045 * SR)
        for i, m in enumerate((81, 84, 88, 93, 96)): ins(x, chip(m + 12, 0.06, 0.25, 30) * 0.25, (0.02 + i * 0.04) * SR)
        ins(x, crash(1.2) * 0.12, 0); return R(x, 0.55)
    # ---- filtered backprojection
    if name == 'lift_row': return R(S(np.sin(phase(sweep(600, 1300, 0.08), 0.08)) * env(0.08, 0.004, curve=4) * 0.5, swoosh(0.3, 600, 4000) * 0.3), 0.3)
    if name == 'filter_sweep':                            # the ramp filter: a chord through an opening low-pass
        d = D(0.5); x = np.zeros(int(d * SR))
        for m in CH[chord_at(t / BEAT)][1]: x += osc('saw', mf(m + 12), d) * 0.3
        return R(sweep_lp(x, 250, 7000, 2, 40) * env(d, 0.02, r=0.12), 0.35)
    if name == 'smear':                                   # backprojection: a smeared chord that pans across
        d = D(0.9); u = tv(d) / d; x = S(pad(CH[chord_at(t / BEAT)][1], d, 1500, 0.2, att=d * 0.4), swoosh(d, 800, 3000) * 0.3)
        return R(x, 0.5, -0.7 + 1.4 * u)
    if name == 'build_rise':
        d = D(4.0); u = tv(d) / d
        x = S(swoosh(d, 200, 10000, 'rise') * 0.5, osc('saw', sweep(mf(45), mf(69), d), d) * 0.1 * u ** 2, np.sin(phase(sweep(mf(57), mf(81), d), d)) * 0.12 * u ** 2)
        return R(x * (0.7 + 0.3 * np.sin(2 * np.pi * np.cumsum(4 + 28 * u ** 2) / SR)), 0.35)
    if name == 'assemble_hit':                            # more directions: each hit a step higher
        ms = tones_at(t, 69); m = ms[min(len(ms) - 1, k)]
        return R(S(tom(mf(m - 24), 0.35) * 0.6, chip(m + 12, 0.1, 0.25, 22) * 0.4, crush(noise(0.05), 4, 3) * np.exp(-tv(0.05) * 60) * 0.25), 0.35)
    if name == 'recon_complete':
        x = np.zeros(int(2.4 * SR)); ins(x, crash(2.0) * 0.3, 0); ins(x, boom(64, 30, 1.2) * 0.5, 0)
        for i, m in enumerate((81, 84, 88, 93)): ins(x, bell(m, 1.6, 2.2) * 0.3, i * 0.04 * SR)
        for i, m in enumerate((81, 84, 88, 93, 96, 100)): ins(x, chip(m + 12, 0.06, 0.25, 30) * 0.22, (0.03 + i * 0.035) * SR)
        return R(x, 0.55)
    if name == 'punch': return R(S(kick(1.4, 1.3) * 0.8, boom(70, 32, 0.8) * 0.6), 0.25)
    # ---- CT numbers
    if name in ('tone_low', 'tone_mid', 'tone_high'):     # clean calibration beeps: air, water, bone
        m = {'tone_low': 69, 'tone_mid': 76, 'tone_high': 81}[name]; d = 0.9; tt = tv(d)
        x = (np.sin(2 * np.pi * mf(m) * tt) + 0.2 * np.sin(2 * np.pi * mf(m) * 2 * tt)) * env(d, 0.006, r=0.5)
        return R(S(x, chip(m + 12, 0.03, 0.5, 80) * 0.15), 0.45)
    if name == 'gray_sweep': d = D(0.7); return R(S(np.sin(phase(sweep(220, 880, d), d)) * env(d, 0.03, r=0.15) * 0.4, swoosh(d, 500, 4000) * 0.2), 0.4)
    if name == 'window_shift':                            # brain window: the filter closes; bone window: it opens
        i = nth('window_shift'); d = D(0.9); x = np.zeros(int(d * SR))
        for m in CH[chord_at(t / BEAT)][1]: x += osc('saw', mf(m), d) * 0.25
        return R(sweep_lp(x, *((4500, 400) if i == 0 else (400, 6000)), 2, 40) * env(d, 0.03, r=0.25), 0.4)
    # ---- the volume
    if name == 'slice_click':
        i = nth('slice_click'); return R(S(tick(3000 * 1.15 ** i, 0.02) * 0.6, metal(2600 + 300 * i) * 0.7, chip((81, 84, 88)[i % 3], 0.07, 0.25, 30) * 0.4), 0.3)
    if name == 'stack_rush':
        d = D(0.6); x = np.zeros(int((d + 0.1) * SR))
        for i in range(27): u = i / 26; ins(x, tick(1800 + 3600 * u, 0.012) * (0.3 + 0.3 * u), d * (1 - (1 - u) ** 1.6) * SR)
        return R(S(x, swoosh(d, 400, 7000, 'rise') * 0.35), 0.3)
    if name == 'segment': d = D(0.5); return R(S(pew(2600, 260, 0.22) * 0.5, swoosh(d, 6000, 900, 'fall') * 0.3, tick(4000, 0.02) * 0.4), 0.35)
    if name == 'arp_rise':                                # 16ths climbing through the chords into the success hit
        d = D(2.4); x = np.zeros(int((d + 0.4) * SR)); n = int(round(d / S16))
        for i in range(n):
            ms = tones_at(t + i * S16, 69); m = ms[min(len(ms) - 1, i // 2 + (i % 2) * 2)]
            ins(x, S(chip(m, 0.1, 0.25, 22) * (0.4 + 0.4 * i / n), pluck(m + 12, 0.15) * 0.25), i * S16 * SR)
        return R(x, 0.3)
    if name == 'assemble_tick': return R(S(tick(1500 + 200 * k, 0.015) * 0.4, np.sin(phase(sweep(300, 150, 0.04), 0.04)) * np.exp(-tv(0.04) * 60) * 0.3), 0.2)
    if name == 'success_impact':
        x = np.zeros(int(2.6 * SR)); ins(x, S(boom(66, 30, 1.4) * 0.7, kick(1.4, 1.2) * 0.6, crash(2.2) * 0.35), 0)
        for i, m in enumerate((69, 76, 81, 84, 88, 93)): ins(x, chip(m + 12, 0.07, 0.25, 26) * 0.25, (0.02 + i * 0.04) * SR)
        for i, m in enumerate((81, 88, 93)): ins(x, bell(m, 1.8, 2.0) * 0.3, i * 0.03 * SR)
        return R(x, 0.55)
    # ---- the ending
    if name == 'title_hit':
        x = np.zeros(int(1.6 * SR)); ins(x, S(kick(1.2, 1.0) * 0.6, crash(1.4) * 0.25), 0)
        for i, m in enumerate((81, 88)): ins(x, bell(m, 1.3, 2.0) * 0.35, i * 0.04 * SR)
        ins(x, chip(93, 0.1, 0.5, 25) * 0.25, 0.05 * SR); return R(x, 0.5)
    if name == 'clean_tone':
        d = 1.4; tt = tv(d); return R(S(np.sin(2 * np.pi * mf(81) * tt) * np.exp(-tt * 2.6) * 0.6, np.sin(2 * np.pi * mf(93) * tt) * np.exp(-tt * 4) * 0.2, glass(105, 0.8) * 0.08), 0.6)
    raise NoGen(name)

GAIN = {'room_tone': 0.35, 'table_motor': 0.45, 'spin_motor': 0.55, 'motor_spin': 0.55, 'beam_on': 0.5, 'rows_tick': 0.42, 'heat_hum': 0.6,
        'absorb_tick': 0.63, 'transmit_pulse': 1.5, 'capture_tick': 0.75, 'assemble_tick': 0.6, 'tag': 0.8, 'pixel_place': 3.0,
        'whoosh_long': 0.6, 'air_glide': 0.55, 'approach': 0.87, 'pull_back': 0.96, 'push_in': 1.4, 'whoosh_soft': 0.55, 'follow_down': 1.2,
        'whoosh_out': 1.45, 'whoosh_in': 1.3, 'dive': 1.23, 'turn': 1.08, 'dissolve_in': 1.35, 'stack_out': 2.5, 'segment': 1.7,
        'signal_pulse': 1.8, 'calc_click': 1.5, 'data_stream': 1.36, 'chirp_e': 1.1, 'slice_click': 1.45, 'photon': 1.3, 'hit_tick': 1.2,
        'tone_air': 0.9, 'tone_tissue': 0.9 * 0.67, 'tone_bone': 0.9 * 0.37, 'xray_hit': 0.7, 'crystal_ping': 0.8,
        'impact': 1.0, 'hv_on': 1.0, 'photon_big': 1.0, 'recon_complete': 1.0, 'success_impact': 1.0, 'title_hit': 1.0, 'chime_complete': 1.0,
        'punch': 0.9, 'photoelectric': 1.0, 'compton': 1.0}
QLATE = {'success_impact', 'chime_complete', 'confirm', 'calc_confirm', 'chime_small', 'title_hit', 'recon_complete'}   # may land up to 55 ms late
QANY = {'arp_rise', 'pixel_place'}                                                                                     # musical runs: on the grid
missing = set(); stamp = {}
for cu in cuesheet['cues']:
    t = cu['t']; nm = cu['sfx']; q = round(t / S16) * S16
    if (nm in QLATE and -0.02 <= q - t <= 0.055) or (nm in QANY and abs(q - t) <= 0.07): t = q
    key = (nm, round(t / S16 * 2), cu.get('arg'))
    if key in stamp: continue
    stamp[key] = 1
    try: sig, rv, pan_, pre = make(nm, dict(cu, t=t))
    except NoGen: missing.add(nm); continue
    sig = sig / (np.max(np.abs(sig)) + 1e-9); e1 = min(len(sig), int(0.001 * SR)); sig[:e1] *= np.linspace(0, 1, e1)   # 1 ms: no digital click
    pan = cu.get('pan', 0) + (pan_ if pan_ is not None else 0)
    put(SFX, sig, t - pre, 0.6 * cu.get('g', 1) * GAIN.get(nm, 0.85), pan, rv)
if missing: print('no generator for:', sorted(missing))

# ---------------------------------------------------------------- mix: reverb send → sum → fold the tail → loudness → limit
def reverb_ir(d=2.0, seed=9):
    r = np.random.default_rng(seed); t = tv(d)
    return [lp(r.standard_normal(len(t)), 7000) * np.exp(-t * 3.2) * 0.03 for _ in range(2)]
ir = reverb_ir()
wet = np.stack([ss.fftconvolve(VERB[i] + 0.25 * MUS[i], ir[i])[:N] for i in range(2)])
MG, XG = 0.57, 2.2                                       # bus gains: the music sits under the effects
mix = MG * MUS + XG * SFX + 0.7 * wet
if os.environ.get('DUMP_BUSES'): np.save(os.environ['DUMP_BUSES'], np.stack([MG * MUS, XG * SFX]).astype(np.float32))
def _db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
for e in cuesheet['scenes']:
    i0, i1 = int(e['t0'] * SR), int(e['t1'] * SR); print(f"{e['id']:16s} music {_db(MG * MUS[:, i0:i1]):6.1f}  sfx {_db(XG * SFX[:, i0:i1]):6.1f}  dB")
mix = np.stack([hp(mix[i], 30) for i in range(2)])
L0 = int(round(TOTAL * SR)); tail = mix[:, L0:]; mix = mix[:, :L0].copy(); mix[:, :tail.shape[1]] += tail   # the loop: tails wrap to the start
def kweight(x):
    hi = ss.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x)
    return ss.lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], hi)
def lufs(st):
    k = [kweight(ch) for ch in st]; blk = int(0.4 * SR); hop = int(0.1 * SR)
    ms = np.array([sum(np.mean(kc[i:i + blk] ** 2) for kc in k) for i in range(0, len(k[0]) - blk, hop)])
    ld = -0.691 + 10 * np.log10(ms + 1e-12); g_ = ms[ld > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g_)) - 10; g2 = ms[(ld > -70) & (ld > rel)]
    return -0.691 + 10 * np.log10(np.mean(g2))
for _ in range(3):
    L = lufs(mix); mix *= 10 ** ((-14.0 - L) / 20)
    mix = np.tanh(mix / 0.92) * 0.92
    pk = np.max(np.abs(ss.resample_poly(mix, 4, 1, axis=1)))
    if pk > 10 ** (-1.6 / 20): mix *= 10 ** (-1.6 / 20) / pk
if len(sys.argv) > 3:
    from PIL import Image, ImageDraw
    hop = int(0.25 * SR); W_, H_ = 1400, 260; im = Image.new('RGB', (W_, H_), (16, 16, 20)); dr = ImageDraw.Draw(im)
    def curve(x, col):
        v = [_db(x[:, i:i + hop]) for i in range(0, x.shape[1] - hop, hop)]; pts = [(k * W_ / len(v), H_ - (max(-50, vv) + 50) / 50 * H_) for k, vv in enumerate(v)]; dr.line(pts, fill=col, width=2)
    for e in cuesheet['scenes']: x_ = e['t0'] / TOTAL * W_; dr.line([(x_, 0), (x_, H_)], fill=(70, 70, 80)); dr.text((x_ + 2, 2), e['id'][:3], fill=(140, 140, 150))
    for db_ in (-10, -20, -30, -40): y_ = H_ - (db_ + 50) / 50 * H_; dr.line([(0, y_), (W_, y_)], fill=(40, 40, 48))
    curve(MG * MUS[:, :L0] * 10 ** ((-14.0 - L) / 20), (90, 160, 255)); curve(XG * SFX[:, :L0] * 10 ** ((-14.0 - L) / 20), (255, 150, 60)); curve(mix, (240, 240, 240))
    im.save(sys.argv[3]); print('curve ->', sys.argv[3])
print(f'integrated loudness {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS, {mix.shape[1] / SR:.2f} s')
print(f'through a 300 Hz high-pass (a rough phone speaker): {lufs(np.stack([hp(mix[i], 300, 4) for i in range(2)])):.1f} LUFS')
j = int(0.05 * SR); print(f'loop seam: last 50 ms {_db(mix[:, -j:]):.1f} dB, first 50 ms {_db(mix[:, :j]):.1f} dB, step at the seam {np.max(np.abs(mix[:, 0] - mix[:, -1])):.4f}')
sf.write(OUT, mix.T.astype(np.float32), SR, subtype='PCM_24')
print('->', OUT)
