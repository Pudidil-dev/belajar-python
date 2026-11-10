#!/usr/bin/env python3
"""Score + sound design for "Why THIS balloon? How an Autorefractor Measures Your Eyes" — pure code synthesis, no samples.

  uv run --no-project --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json output/ [--notext]

Writes four stems into the output folder (or *_notext.wav without the caption-typing sounds):
  music.wav    the score
  sfx.wav      the picture-synced effects
  mix.wav      music + effects, mastered to −14 LUFS: the film's sound when there is no narration
  mix_vo.wav   the same with the melody pulled back and the voice band thinned, at −19 LUFS: a bed for a later voice-over
All four are exactly 63 s and loop: the tail of the last bar is folded onto the first.

How it is built to stay in the ear (instruments and helpers from the MRI film's synth in this repo):
- **Grid.** 120 BPM; a 3-second scene is one bar of six beats (kick–clap–kick–clap–kick–clap); the film is 21 bars, 126 beats.
- **Harmony.** D – A – Bm – G, one chord per scene, five times; scene 21 holds A, which resolves to D when the video restarts.
  The cycle starts again exactly on scenes 1, 5, 9, 13 and 17: the balloon, the infrared, the sensor, the focus, the numbers.
- **The hook.** One bar-long marimba figure in a 3-3-6 sixteenth rhythm (onsets at beats 0, ¾, 1½ and again at 3, 3¾, 4½):
  three notes up — the question — and three notes down — the answer. Its top note climbs a step each bar (B, C#, D, E),
  then the cycle starts over. A dotted-eighth ping-pong delay echoes it in the same rhythm.
- **The bounce.** Bass on every off-beat against a kick on every beat, with the pads ducking under each kick.
- **The effects are part of the music.** Every tonal effect is tuned to the chord of its bar and sits on the 16th-note grid:
  the electrons of scene 11 climb a pentatonic scale as the well fills; the three confirmations of scene 16 are a rising
  triad; the three values of scene 17 are the hook's own first three notes; the printer of scene 18 feeds in sixteenths.
- **The arc** (the brief's): 0–6 s the hook alone, then hats and a half-time kick · 6–15 s bass and shaker come in ·
  15–30 s the full, smooth groove · 30–36 s the drums drop out and the small sounds of the sensor carry the bar ·
  36–48 s the build, with a held breath on the last sixteenths · 48–54 s the payoff: everything, the hook doubled ·
  54–63 s back down to the opening texture, the last bar leaning into the first.
Nothing here is an alarm, a zap, an impact or a heartbeat; the effects are short and quiet next to the music.
"""
import json, sys
from pathlib import Path
import numpy as np
import scipy.signal as ss
from scipy.ndimage import maximum_filter1d
import soundfile as sf

SR = 48000
BPM = 120; BEAT = 60 / BPM; S16 = BEAT / 4; BARB = 6; BAR = BARB * BEAT
args = [x for x in sys.argv[1:] if not x.startswith('--')]
NOTEXT = '--notext' in sys.argv
cuesheet = json.load(open(args[0]))
OUT = Path(args[1]); OUT.mkdir(parents=True, exist_ok=True)
TOTAL = cuesheet['total']
NBAR = int(round(TOTAL / BAR))
N = int(TOTAL * SR) + 3 * SR
BUS = {k: np.zeros((2, N)) for k in ('drum', 'bass', 'pad', 'hook', 'lead', 'arp', 'stab', 'fx', 'sfx')}
VERB = {k: np.zeros((2, N)) for k in ('m', 's')}; DLY = {k: np.zeros(N) for k in ('h', 'm', 's')}
rng = np.random.default_rng(1971)
def tb(beat): return beat * BEAT

# ---------------------------------------------------------------- helpers and instruments (from mri-brain/tools/synth_audio.py)
def tv(d): return np.arange(max(1, int(d * SR))) / SR
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def put(bus, sig, t, g=1.0, pan=0.0, verb=0.0, dly=0.0):
    s = int(round(t * SR))
    if s >= N or len(sig) == 0: return
    if s < 0: sig = sig[-s:]; s = 0
    sig = sig[:N - s] * g
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4; l, r = np.cos(a), np.sin(a)
    B = BUS[bus]; B[0, s:s + len(sig)] += sig * l; B[1, s:s + len(sig)] += sig * r
    vk = 's' if bus == 'sfx' else 'm'
    if verb: VERB[vk][0, s:s + len(sig)] += sig * l * verb; VERB[vk][1, s:s + len(sig)] += sig * r * verb
    if dly: DLY['s' if bus == 'sfx' else 'h' if bus in ('hook', 'lead') else 'm'][s:s + len(sig)] += sig * dly
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
    if s >= len(x) or s < 0: return
    n = min(len(b), len(x) - s); x[s:s + n] += b[:n]
def fm(f, d, ratio=3.5, idx=4.0, dec=3.0):
    t = tv(d); I = idx * np.exp(-dec * 1.6 * t)
    return np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-dec * t)
def sat(x, k=2.0): return np.tanh(k * x) / np.tanh(k)
def kick(g=1.0, punch=1.0):
    t = tv(0.34); f = 46 + 130 * np.exp(-t * 32)
    body = np.sin(phase(f, 0.34)) * np.exp(-t * 8)
    return sat(body * 1.2 + 0.35 * punch * hp(noise(0.34), 2500) * np.exp(-t * 110), 1.6) * g
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
def subbass(m, d): return osc('sin', mf(m), d) * adsr(d, 0.005, 0.05, 0.9, 0.04)[:int(d * SR)]
def pulsebass(m, d, cut=900):
    f = mf(m); x = 0.55 * osc('sq', f, d, 0.3) + 0.5 * osc('saw', f, d) + 0.7 * osc('sin', f / 2, d)
    return lp(x, cut) * adsr(d, 0.003, 0.07, 0.6, 0.03)[:len(x)]
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
# new for this film
def marimba(m, d=0.6):
    f = mf(m); t = tv(d)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 8) + 0.45 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 22) + 0.16 * np.sin(2 * np.pi * f * 10.1 * t) * np.exp(-t * 55) + 0.1 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 12)) * np.minimum(1, t / 0.0015)
def rim(): t = tv(0.05); return (np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 90) + 0.5 * hp(noise(0.05), 3000) * np.exp(-t * 300))
def tick(f=3000, d=0.02): return np.sin(2 * np.pi * f * tv(d)) * np.exp(-tv(d) * 180)
def whoosh(d, up=True, f0=300, f1=4000):
    t = tv(d) / d; return sweep_lp(noise(d), f0 if up else f1, f1 if up else f0, 2) * np.sin(np.pi * t) ** 1.5
def blip(m, d=0.12): return S(fm(mf(m), d, 2.0, 1.0, 14) * 0.8, tick(min(9000, mf(m) * 2), 0.01) * 0.25)
def pop(m, d=0.11):                                                        # a small "bubble": a sine that drops a third as it starts
    t = tv(d); return np.sin(phase(mf(m) * (1 + 0.26 * np.exp(-t * 70)), d)) * np.exp(-t * 26) * np.minimum(1, t / 0.002)
def gl(m0, m1, d, a=0.05, r=0.2): return np.sin(phase(sweep(mf(m0), mf(m1), d), d)) * env(d, a, r=min(r, d * 0.6))
def chime(ms, d=1.2, spread=0.04, inst=bell):
    x = np.zeros(int((d + spread * len(ms) + 0.2) * SR))
    for i, m in enumerate(ms): ins(x, inst(m, d) * (0.5 - 0.04 * i), i * spread * SR)
    return x

# ---------------------------------------------------------------- harmony and the hook
CH = {'D': dict(root=38, tones=[62, 66, 69], pad=[50, 57, 62, 66, 69]), 'A': dict(root=33, tones=[61, 64, 69], pad=[45, 57, 61, 64, 69]),
      'Bm': dict(root=35, tones=[62, 66, 71], pad=[47, 54, 62, 66, 71]), 'G': dict(root=31, tones=[62, 67, 71], pad=[43, 55, 62, 67, 71])}
LOOP = ['D', 'A', 'Bm', 'G']
def chord_of_bar(n): return 'A' if n >= 20 else LOOP[n % 4]
def chord_at(t): return chord_of_bar(max(0, min(NBAR - 1, int(t / BAR + 1e-9))))
def cn(t, k, octave=0): tones = CH[chord_at(t)]['tones']; return tones[k % 3] + 12 * (k // 3) + octave
HOOK = {'D': [66, 69, 71, 69, 66, 64], 'A': [64, 69, 73, 71, 69, 64], 'Bm': [66, 71, 74, 73, 71, 66], 'G': [67, 71, 74, 76, 74, 71]}
HR = [0, 0.75, 1.5, 3, 3.75, 4.5]                                           # the 3-3-6 rhythm, twice in a bar
PENT = [59, 62, 64, 66, 69]                                                 # B D E F# A: the scale the small sounds climb
def pent(k, base=0): return PENT[k % 5] + 12 * (k // 5) + base
KICKS = []
def drums(n, kick_='none', kg=0.8, clap_g=0.0, hat_g=0.0, shaker_g=0.0, rim_g=0.0, open_g=0.0, beats=range(6), depth=0.5):
    for ib in beats:
        t0 = tb(n * BARB + ib)
        if kick_ == 'four' or (kick_ == 'half' and ib in (0, 3)): put('drum', kick(1.0, 0.8), t0, 0.9 * kg); KICKS.append((t0, depth))
        if clap_g and ib % 2 == 1: put('drum', clap(), t0, 0.42 * clap_g, 0.05, 0.25)
        if rim_g and ib % 2 == 1: put('drum', rim(), t0, 0.3 * rim_g, -0.2, 0.2)
        if hat_g:
            put('drum', hat(), t0 + 2 * S16, 0.5 * hat_g, 0.25)
            for s in (1, 3): put('drum', hat(), t0 + s * S16, 0.18 * hat_g, -0.25 if s == 1 else 0.35)
        if open_g: put('drum', hat(True), t0 + 2 * S16, 0.22 * open_g, 0.2)
        if shaker_g:
            for s in range(4): put('drum', shaker(), t0 + s * S16, (0.22 if s % 2 else 0.13) * shaker_g, -0.45)
def bassline(n, g=1.0, beats=range(6), cut=900, pickup=True):
    c = CH[chord_of_bar(n)]; nxt = CH[chord_of_bar((n + 1) % NBAR)]
    for ib in beats:
        t0 = tb(n * BARB + ib)
        put('bass', pulsebass(c['root'] + 12 + (12 if ib in (2, 5) else 0), 0.2, cut), t0 + 2 * S16, 0.5 * g)
        put('bass', subbass(c['root'] + 12, 0.2), t0 + 2 * S16, 0.32 * g)
    if pickup: put('bass', pulsebass(nxt['root'] + 12 + 7, 0.1, cut), tb(n * BARB + 5.75), 0.4 * g)
def subhold(n, g=1.0): c = CH[chord_of_bar(n)]; put('bass', subbass(c['root'] + 12, BAR * 0.96) * 0.6 + lp(osc('tri', mf(c['root'] + 24), BAR * 0.96), 500) * env(BAR * 0.96, 0.05, r=0.4) * 0.25, tb(n * BARB), 0.5 * g)
def padbar(n, g=1.0, cut=1400, bright=0.0, sus=False):
    ms = list(CH[chord_of_bar(n)]['pad'])
    if sus: ms[2] = ms[2] + 1                                                # A sus4: the third held back …
    put('pad', pad(ms, (3 if sus else 6) * BEAT + 0.35, cut, bright), tb(n * BARB), 0.5 * g, 0, 0.5)
    if sus: put('pad', pad(CH[chord_of_bar(n)]['pad'], 3 * BEAT + 0.4, cut, bright), tb(n * BARB + 3), 0.5 * g, 0, 0.5)   # … then let in
def arpbar(n, g=1.0, cut=2600, rise=0.0):
    tones = CH[chord_of_bar(n)]['tones']; seq = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1], tones[2], tones[0] + 12]
    for k in range(24):
        put('arp', pluck(seq[k % 8] + 12, 0.16, 0.3, cut * (1 + rise * k / 24)), tb(n * BARB) + k * S16, 0.3 * g * (1.0 if k % 4 == 0 else 0.7), 0.6 * np.sin(k * 1.3), 0.15, 0.15)
def hookbar(n, inst='mar', g=1.0, cells=(0, 1), octave=0):
    notes = HOOK[chord_of_bar(n)]
    for i, (r, m) in enumerate(zip(HR, notes)):
        if i // 3 not in cells: continue
        t0 = tb(n * BARB + r); acc = 1.0 if i % 3 == 0 else 0.86; pan = -0.25 if i < 3 else 0.25
        if inst in ('mar', 'full'):
            put('hook', marimba(m + octave, 0.7), t0, 0.62 * g * acc, pan, 0.3, 0.4)
            put('hook', marimba(m + octave + 12, 0.4), t0, 0.16 * g * acc, -pan, 0.3, 0.3)
            if i % 3 == 2: put('hook', bell(m + octave + 12, 1.1, 1.4), t0, 0.14 * g, -pan, 0.5, 0.2)
        if inst == 'bell':
            put('hook', bell(m + octave + 12, 1.3, 1.6), t0, 0.34 * g * acc, pan, 0.55, 0.35)
            put('hook', marimba(m + octave, 0.6), t0, 0.26 * g * acc, -pan, 0.3, 0.3)
        if inst == 'full':
            nxt = HR[i + 1] if i + 1 < 6 and (i + 1) // 3 == i // 3 else r + 1.5
            put('lead', lead(m + 12, (nxt - r) * BEAT * 0.92, 0.4, 3800), t0, 0.5 * g * acc, -pan * 0.6, 0.35, 0.3)
def stabbar(n, g=1.0):
    ms = [m + 12 for m in CH[chord_of_bar(n)]['tones']]
    for r in HR: put('stab', supersaw(ms, 0.2, 4200), tb(n * BARB + r), 0.9 * g, 0, 0.3, 0.2)
def snroll(n, b0, b1, g=1.0):
    b = b0
    while b < b1 - 1e-6:
        q = (b - b0) / (b1 - b0); step = 0.5 if q < 0.34 else 0.25 if q < 0.72 else 0.125
        put('drum', snare(0.9) * (0.4 + 0.6 * q), tb(n * BARB + b), 0.34 * g * (0.5 + 0.5 * q), 0.1 * np.sin(b * 9), 0.2); b += step

# ---------------------------------------------------------------- the arrangement, bar by bar (bar n = scene n + 1)
# 0–6 s: the opening motif — the hook nearly alone, then the first light pulse
put('bass', boom(60, 36, 1.4), 0, 0.16); padbar(0, 0.8, 1100); hookbar(0, 'bell', 0.85)
padbar(1, 0.9, 1250); hookbar(1, 'mar', 1.0); drums(1, 'half', 0.7, hat_g=0.7, depth=0.3); subhold(1, 0.6)
# 6–15 s: light rhythmic development — bass on the off-beats, shaker, rim, then the full kick
padbar(2, 0.9, 1300); hookbar(2, 'mar', 0.92); drums(2, 'half', 0.65, hat_g=0.7, shaker_g=0.6, rim_g=0.6, depth=0.35); bassline(2, 0.7, cut=700)
padbar(3, 0.9, 1400, 0.05); hookbar(3, 'mar', 0.95); drums(3, 'half', 0.7, hat_g=0.8, shaker_g=0.7, rim_g=0.7, depth=0.35); bassline(3, 0.8, cut=800); arpbar(3, 0.5, 1800)
put('fx', revcym(1.5), tb(24) - 1.5, 0.2, 0, 0.3)
padbar(4, 0.95, 1500, 0.1); hookbar(4, 'mar', 1.0); drums(4, 'four', 0.72, clap_g=0.55, hat_g=0.85, shaker_g=0.7, depth=0.42); bassline(4, 0.9); arpbar(4, 0.6, 2000)
# 15–30 s: smooth forward motion — the whole groove, the hook every bar
for n in range(5, 10):
    padbar(n, 1.0, 1600, 0.12); hookbar(n, 'mar', 1.0); drums(n, 'four', 0.82, clap_g=0.7, hat_g=0.95, shaker_g=0.8, open_g=0.5 if n % 2 else 0.0, depth=0.5)
    bassline(n, 1.0); arpbar(n, 0.75, 2300)
    if n in (6, 8): hookbar(n, 'bell', 0.35, cells=(1,))                    # the answer doubled on the bell every other bar
put('fx', revcym(1.0), tb(48) - 1.0, 0.18, 0, 0.3)                          # into scene 9
put('fx', whoosh(1.6, False, 250, 7000), tb(60), 0.16, 0, 0.3)              # the floor drops away into the breakdown
# 30–36 s: small satisfying electronic details — no kick; the effects of the sensor carry these two bars
padbar(10, 0.8, 900); subhold(10, 0.9); hookbar(10, 'bell', 0.5, cells=(0,))
padbar(11, 0.85, 1000, 0.05); subhold(11, 0.9)
for n in (10, 11):
    for k in range(24):
        if k % 4 != 0: put('drum', hat(), tb(n * BARB) + k * S16, 0.035 + 0.02 * (k % 2), 0.5 * np.sin(k))
    for ib in (1, 4): put('drum', rim(), tb(n * BARB + ib), 0.16, 0.2, 0.3)
# 36–48 s: build anticipation — the pulse returns, then the full kick, claps, a roll and a held breath
padbar(12, 0.9, 1300); hookbar(12, 'mar', 0.85); drums(12, 'half', 0.7, hat_g=0.7, depth=0.35); bassline(12, 0.75, cut=750)
padbar(13, 0.95, 1500, 0.1); hookbar(13, 'mar', 0.92); drums(13, 'four', 0.74, hat_g=0.85, shaker_g=0.6, depth=0.42); bassline(13, 0.85); arpbar(13, 0.6, 1900, 0.3)
padbar(14, 1.0, 1700, 0.18); hookbar(14, 'mar', 0.97); drums(14, 'four', 0.8, clap_g=0.6, hat_g=0.95, shaker_g=0.8, depth=0.48); bassline(14, 0.95); arpbar(14, 0.75, 2100, 0.5)
padbar(15, 1.0, 1900, 0.3); hookbar(15, 'mar', 1.0); drums(15, 'four', 0.8, hat_g=1.0, shaker_g=0.9, beats=range(4), depth=0.48); bassline(15, 0.95, beats=range(4), pickup=False); arpbar(15, 0.9, 2300, 0.9)
snroll(15, 0, 5.5, 1.0); put('fx', riser(tb(5.5), 250, 7000), tb(90), 0.3, 0, 0.2); put('fx', revcym(1.5), tb(95.5) - 1.5, 0.25, 0, 0.3)
BREATH = (tb(95.5), tb(96))                                                 # 47.75–48.00 s: everything but the tails stops
# 48–54 s: the payoff — everything, the hook doubled by the lead and the chords stabbing its rhythm
put('fx', crash(2.4), tb(96), 0.3, 0, 0.4); put('fx', boom(62, 34, 1.6), tb(96), 0.45)
for n in (16, 17):
    padbar(n, 0.9, 2000, 0.3); hookbar(n, 'full', 1.0); stabbar(n, 1.0); drums(n, 'four', 1.0, clap_g=0.95, hat_g=1.0, shaker_g=0.9, open_g=0.9, depth=0.58); bassline(n, 1.1, cut=1100); arpbar(n, 0.8, 2800)
put('fx', whoosh(1.2, False, 300, 8000), tb(108), 0.14, 0, 0.3)
# 54–63 s: return to the opening texture — the pulse thins, the hook on the bell again, the last bar leaning into bar 1
padbar(18, 0.95, 1400, 0.08); hookbar(18, 'mar', 0.9); drums(18, 'half', 0.66, hat_g=0.7, shaker_g=0.4, depth=0.35); bassline(18, 0.7, cut=700)
padbar(19, 0.9, 1200); hookbar(19, 'bell', 0.95); subhold(19, 0.7)
for k in range(24):
    if k % 2 == 0: put('drum', hat(), tb(19 * BARB) + k * S16, 0.04, 0.5 * np.sin(k))
padbar(20, 0.9, 1150, 0.0, sus=True); subhold(20, 0.75)
put('hook', marimba(64, 0.6), tb(20 * BARB + 4.5), 0.5, -0.2, 0.3, 0.3); put('hook', marimba(69, 0.6), tb(20 * BARB + 5.25), 0.55, 0.2, 0.3, 0.2)   # the pick-up: E, A … then F# on the restart
put('fx', revcym(2.0), TOTAL - 2.0, 0.2, 0, 0.3)

# ---------------------------------------------------------------- sound effects: tuned to the bar, on the grid, quiet
def nz(d, lo, hi, a=0.02, r=None): return bp(noise(d), lo, hi) * env(d, a, r=r if r is not None else d * 0.6)
TEXT_SFX = {'type', 'label'}
def make(name, a, t):
    """→ (signal, reverb send, delay send). a = the cue's argument: a duration for the moving sounds, an index for the counted ones."""
    d = float(a) if isinstance(a, (int, float)) and a else None; k = int(a) if isinstance(a, (int, float)) else 0
    if name == 'type':
        x = np.zeros(int(0.3 * SR))
        for i in range(3): ins(x, tick(rng.uniform(3200, 4400), 0.008) * 0.4, i * 0.055 * SR)
        return x, 0.05, 0
    if name == 'label': return S(blip(cn(t, 2, 24), 0.07) * 0.5, tick(4200, 0.008) * 0.2), 0.3, 0.1
    if name == 'glass': return S(glass(86, 1.6) * 0.8, bell(74, 1.8, 1.4) * 0.45, glass(93, 1.0) * 0.2), 0.8, 0.3
    if name == 'defocus':                                                   # the view going soft and coming back: a tone that sags and returns
        dd = d or 1.0; tt = tv(dd) / dd; f = mf(cn(t, 2, 12)) * (1 - 0.055 * np.sin(np.pi * tt) ** 2)
        return S(np.sin(phase(f, dd)) * np.sin(np.pi * tt) ** 1.5 * 0.5, sweep_lp(noise(dd), 3000, 3000, 2) * np.sin(np.pi * tt) ** 2 * 0.05), 0.5, 0
    if name in ('aperture', 'aperture_open'):                               # the round stop: a soft sweep and a few leaf ticks
        dd = d or 1.2; x = whoosh(dd, name == 'aperture_open', 250, 3500) * 0.5
        for i in range(7): ins(x, tick(2400 + 180 * i, 0.012) * 0.25, (0.08 + 0.84 * (i / 6) ** (1.5 if name == 'aperture' else 0.7)) * dd * SR)
        return x, 0.4, 0
    if name in ('whoosh_out', 'pull', 'shrink', 'fade'): dd = d or 0.6; return whoosh(dd, False, 300, 5200) * 0.6, 0.35, 0
    if name in ('whoosh_in', 'push', 'pan', 'glide', 'orbit', 'rays_in'): dd = d or 0.6; return whoosh(dd, True, 280, 4800) * (0.35 if name in ('orbit', 'rays_in') else 0.55), 0.35, 0
    if name in ('motor', 'chip_turn'):                                      # a small servo: a soft buzz gliding up a fifth
        dd = d or 0.8; m0 = cn(t, 0, -12); x = lp(osc('saw', sweep(mf(m0), mf(m0 + 7), dd), dd), 900) * (0.75 + 0.25 * np.sin(2 * np.pi * 31 * tv(dd))) * env(dd, 0.05, r=0.15)
        return S(x * 0.5, whoosh(dd, True, 500, 3000) * 0.25), 0.25, 0
    if name == 'dock': return S(blip(cn(t, 1, 12), 0.1) * 0.7, lp(kick(0.4, 0.1), 500) * 0.35, tick(3000, 0.01) * 0.3), 0.3, 0.15
    if name == 'settle': return S(lp(kick(0.4, 0.1), 420) * 0.5, tick(2200, 0.012) * 0.2), 0.2, 0
    if name == 'cover': dd = d or 0.6; return nz(dd, 3500, 9000, 0.1) * 0.5, 0.4, 0
    if name == 'lamp': return S(bell(cn(t, 0, 0), 0.9, 1.2) * 0.6, np.sin(2 * np.pi * mf(cn(t, 0, -12)) * tv(0.5)) * env(0.5, 0.03) * 0.5, tick(2600, 0.01) * 0.2), 0.5, 0.15
    if name == 'trace_amber': dd = d or 1.0; m0 = cn(t, 0, 0); return S(gl(m0, m0 + 12, dd, 0.08, 0.25) * 0.5, gl(m0 + 7, m0 + 19, dd, 0.08, 0.25) * 0.15), 0.5, 0.15
    if name == 'lock': return S(blip(cn(t, 1, 12), 0.09) * 0.6, np.concatenate([np.zeros(int(0.06 * SR)), bell(cn(t, 2, 12), 1.0, 1.5) * 0.7]), tick(3600, 0.012) * 0.5), 0.5, 0.3
    if name == 'lens_glide': dd = d or 0.95; m0 = cn(t, 0, 12); return S(gl(m0, m0 + 5, dd, 0.1, 0.3) * 0.4, nz(dd, 1800, 4200, 0.2) * 0.18), 0.4, 0
    if name == 'ir_on':                                                     # a bloom, not a zap: a slow octave rise into a glassy top
        m0 = cn(t, 0, -12); x = gl(m0, m0 + 12, 0.32, 0.06, 0.1) * 0.6
        return S(x, np.concatenate([np.zeros(int(0.22 * SR)), glass(cn(t, 0, 24), 1.2) * 0.6, ]), np.concatenate([np.zeros(int(0.22 * SR)), bell(cn(t, 2, 12), 1.4, 1.2) * 0.35])), 0.6, 0.35
    if name == 'beam_run':                                                  # the trace on its way: an airy shimmer with a soft high tone
        dd = d or 1.5; tt = tv(dd); m0 = cn(t, 2, 24)
        return S(nz(dd, 2500, 7000, 0.3, 0.3) * 0.22, np.sin(2 * np.pi * mf(m0) * tt) * (0.6 + 0.4 * np.sin(2 * np.pi * 8 * tt)) * env(dd, 0.25, r=0.3) * 0.2), 0.5, 0
    if name == 'return_run':
        dd = d or 1.5; tt = tv(dd); m0 = cn(t, 0, 12)
        return S(nz(dd, 1200, 3600, 0.3, 0.3) * 0.22, np.sin(2 * np.pi * mf(m0) * tt) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * tt)) * env(dd, 0.25, r=0.3) * 0.22), 0.5, 0
    if name == 'inset_out': return gl(81, 74, 0.12, 0.01, 0.08) * 0.5, 0.3, 0
    if name == 'inset_in': return S(gl(74, 81, 0.12, 0.01, 0.08) * 0.5, glass(86, 0.6) * 0.3), 0.4, 0.2
    if name == 'tick': m = pent(k + 5) if a is not None else cn(t, 1, 12); return S(pop(m, 0.09) * 0.6, tick(3800, 0.008) * 0.3), 0.3, 0.15
    if name == 'enter': m = cn(t, 2, 12); return S(gl(m + 4, m, 0.16, 0.01, 0.12) * 0.6, tick(2600, 0.01) * 0.15), 0.45, 0.2
    if name == 'bend': m = cn(t, 0, 24); return S(gl(m, m + 2, 0.18, 0.01, 0.1) * 0.5, blip(cn(t, 1, 24), 0.08) * 0.3), 0.45, 0.25
    if name == 'converge':                                                  # three tones drawing together into one
        dd = d or 1.5; tgt = cn(t, 1, 12)
        return S(*[gl(tgt + off, tgt, dd, 0.2, 0.3) * 0.22 for off in (-5, 0, 7)]), 0.5, 0
    if name == 'spot': return S(bell(cn(t, 2, 12), 1.2, 1.6) * 0.7, glass(cn(t, 0, 24), 0.7) * 0.25, tick(4200, 0.01) * 0.3), 0.6, 0.35
    if name == 'scatter':                                                   # a spray of tiny grains spreading out
        x = nz(0.35, 2500, 9000, 0.005, 0.3) * 0.25
        for i in range(14): ins(x, pop(pent(int(rng.integers(8, 16))), 0.06) * (0.35 - 0.015 * i), (0.01 + 0.3 * (i / 14) ** 1.4) * SR)
        return x, 0.6, 0.3
    if name == 'answer': return S(marimba(cn(t, 1, 12), 0.6) * 0.8, np.concatenate([np.zeros(int(S16 * SR)), marimba(cn(t, 0, 12), 0.7) * 0.7]), np.concatenate([np.zeros(int(S16 * SR)), bell(cn(t, 0, 24), 1.0, 1.2) * 0.25])), 0.5, 0.3
    if name == 'turn': return S(blip(cn(t, 2, 12), 0.08) * 0.6, tick(2800, 0.012) * 0.4), 0.3, 0.2
    if name == 'sensor_hit': return S(tick(4600, 0.012) * 0.6, glass(cn(t, 0, 24), 0.8) * 0.6, np.concatenate([np.zeros(int(0.06 * SR)), glass(cn(t, 2, 24), 0.8) * 0.5]), lp(kick(0.3, 0.1), 300) * 0.3), 0.5, 0.3
    if name == 'acquire':                                                   # noise resolving into a clear tone, as the ring clears
        dd = d or 1.0; tt = tv(dd) / dd; ms = [cn(t, i, 12) for i in range(3)]
        tone = sum(np.sin(2 * np.pi * mf(m) * tv(dd)) for m in ms) / 3
        return S(nz(dd, 900, 5000, 0.02, 0.2) * (1 - tt) ** 1.5 * 0.4, tone * tt ** 2 * env(dd, 0.01, r=0.12) * 0.5, np.concatenate([np.zeros(int((dd - 0.05) * SR)), bell(cn(t, 2, 24), 1.0, 1.4) * 0.5])), 0.5, 0.2
    if name == 'charge_pop': return S(pop(pent(k), 0.12) * 0.8, marimba(pent(k), 0.25) * 0.35, tick(5000, 0.006) * 0.15), 0.35, 0.2
    if name == 'packet': return chime([pent(11), pent(13), pent(15)], 1.0, 0.045, glass) * 0.9, 0.6, 0.3
    if name == 'readout':                                                   # ten clicks down the rows, in sixteenths
        dd = d or 1.25; n = int(round(dd / S16)); x = np.zeros(int((dd + 0.3) * SR))
        for i in range(n): ins(x, S(tick(3000, 0.006) * 0.5, pluck(pent(14 - i), 0.07, 0.25, 3800) * 0.5), i * S16 * SR)
        return x, 0.3, 0.2
    if name == 'data_done': return S(blip(cn(t, 0, 24), 0.1) * 0.5, np.concatenate([np.zeros(int(S16 * SR)), bell(cn(t, 2, 24), 1.3, 1.5) * 0.7, ]), np.concatenate([np.zeros(int(S16 * SR)), glass(cn(t, 0, 36), 0.9) * 0.3])), 0.6, 0.35
    if name == 'panel': return S(pop(cn(t, 0, 12), 0.08) * 0.5, tick(2400, 0.01) * 0.2), 0.3, 0
    if name == 'focus_on': return S(bell(cn(t, 0, 24), 1.3, 1.5) * 0.7, glass(cn(t, 2, 24), 0.9) * 0.3), 0.6, 0.3
    if name == 'focus_front': return lp(S(bell(cn(t, 2, 12), 0.7, 1.2) * 0.7, gl(cn(t, 2, 12), cn(t, 2, 12) - 0.6, 0.5, 0.01, 0.3) * 0.25), 2600), 0.5, 0.2
    if name == 'focus_a': return S(bell(cn(t, 1, 24), 1.0, 1.4) * 0.65, tick(3600, 0.01) * 0.3), 0.55, 0.3
    if name == 'focus_b': return S(bell(cn(t, 2, 24), 1.2, 1.4) * 0.65, tick(4200, 0.01) * 0.3), 0.55, 0.3
    if name == 'span': dd = d or 0.3; return gl(cn(t, 1, 24), cn(t, 2, 24), dd, 0.02, 0.1) * 0.4, 0.4, 0.2
    if name == 'cal': dd = d or 0.45; return S(*[np.concatenate([np.zeros(int(i * dd / 6 * SR)), tick(2600, 0.008) * 0.3]) for i in range(6)]), 0.3, 0
    if name == 'fit': dd = d or 0.4; return S(gl(cn(t, 0, 12), cn(t, 2, 24), dd, 0.03, 0.12) * 0.45, nz(dd, 2500, 6000, 0.1) * 0.08), 0.5, 0.25
    if name == 'axes': return S(marimba(cn(t, 0, 24), 0.6) * 0.6, marimba(cn(t, 2, 24), 0.6) * 0.5, tick(3600, 0.01) * 0.3), 0.5, 0.3
    if name == 'capture': return S(nz(0.03, 2500, 9000, 0.002) * 0.5, np.concatenate([np.zeros(int(0.07 * SR)), nz(0.04, 2000, 8000, 0.002) * 0.4])), 0.2, 0
    if name == 'confirm': m = [cn(t, 2, 12), cn(t, 0, 24), cn(t, 1, 24)][k % 3]; return S(tick(4200, 0.01) * 0.55, marimba(m, 0.5) * 0.8, bell(m + 12, 0.9, 1.3) * 0.3), 0.45, 0.25
    if name == 'value': m = [78, 81, 86][k % 3]; return S(bell(m, 1.5, 1.8) * 0.75, marimba(m, 0.7) * 0.6, glass(m + 12, 0.8) * 0.2, lp(kick(0.4, 0.1), 300) * 0.25), 0.6, 0.35
    if name == 'complete': return S(chime([74, 78, 81, 86, 90], 1.8, 0.05, glass), bell(86, 2.0, 1.3) * 0.35), 0.75, 0.3
    if name == 'feed':                                                      # one step of the printer: a short dry burst with a tiny motor
        x = S(nz(0.05, 1800, 6000, 0.003, 0.03) * 0.7, lp(osc('saw', mf(50 + (k % 4 == 0) * 5), 0.045), 1200) * env(0.045, 0.004, r=0.02) * 0.35)
        return x, 0.12, 0
    if name == 'tear': return S(sweep_lp(noise(0.12), 2500, 9000, 2) * env(0.12, 0.004, r=0.05) * 0.6, tick(3000, 0.012) * 0.4), 0.3, 0
    if name == 'resolve': return S(marimba(71, 0.6) * 0.8, bell(83, 1.0, 1.3) * 0.25, np.concatenate([np.zeros(int(2 * S16 * SR)), marimba(69, 0.9) * 0.85]), np.concatenate([np.zeros(int(2 * S16 * SR)), bell(81, 1.6, 1.3) * 0.35])), 0.6, 0.3
    if name == 'motif_back': return S(glass(86, 1.4) * 0.6, bell(74, 1.6, 1.3) * 0.3), 0.8, 0.3
    if name == 'bridge': dd = d or 3.0; return nz(dd, 600, 2600, dd * 0.8, 0.1) * 0.15, 0.5, 0
    raise KeyError(name)
GAIN = {'type': 0.35, 'label': 0.5, 'glass': 0.8, 'value': 1.15, 'complete': 1.0, 'confirm': 1.0, 'charge_pop': 0.95, 'packet': 0.9, 'readout': 0.8, 'data_done': 0.95,
        'lock': 0.9, 'sensor_hit': 0.95, 'spot': 0.9, 'answer': 0.95, 'ir_on': 0.9, 'feed': 0.75, 'resolve': 1.0, 'beam_run': 0.6, 'return_run': 0.6, 'converge': 0.7,
        'trace_amber': 0.6, 'defocus': 0.6, 'motor': 0.55, 'chip_turn': 0.55, 'orbit': 0.5, 'bridge': 0.6, 'cal': 0.5, 'capture': 0.5, 'tick': 0.8, 'focus_on': 0.9, 'focus_front': 0.8,
        'focus_a': 0.85, 'focus_b': 0.85, 'scatter': 0.8, 'acquire': 0.8, 'lens_glide': 0.7, 'cover': 0.5, 'aperture': 0.6, 'aperture_open': 0.6}
missing = set(); used = {}
for cu in cuesheet['cues']:
    nm = cu['sfx']
    if NOTEXT and nm in TEXT_SFX: continue
    try: sig, rv, dl = make(nm, cu.get('arg'), cu['t'])
    except KeyError: missing.add(nm); continue
    pk = np.max(np.abs(sig)) + 1e-9
    put('sfx', sig / pk, cu['t'], 0.42 * cu.get('g', 1) * GAIN.get(nm, 0.75), cu.get('pan', 0) * 0.7, rv, dl)
    used[nm] = used.get(nm, 0) + 1
if missing: print('no generator for:', sorted(missing))

# ---------------------------------------------------------------- balance, side-chain, sends
def rms_db(x, t0=None, t1=None):
    seg = x[:, int((t0 or 0) * SR):int((t1 or TOTAL) * SR)]; return 10 * np.log10(np.mean(seg ** 2) + 1e-12)
for k in ('drum', 'bass', 'pad', 'hook', 'lead', 'arp', 'stab', 'fx'):     # the held breath before the payoff
    BUS[k][:, int(BREATH[0] * SR):int(BREATH[1] * SR)] = 0.0
# each bus is brought to a set level over a reference stretch (bars 6–10 for the groove, 17–18 for the payoff layers), so
# the balance does not depend on how loud each generator happens to be
REF = {'drum': (-15.0, 15, 30), 'bass': (-18.5, 15, 30), 'pad': (-24.0, 15, 30), 'hook': (-18.0, 15, 30), 'arp': (-27.5, 15, 30), 'stab': (-23.0, 48, 54), 'lead': (-22.5, 48, 54), 'fx': (-27.0, 45, 51)}
for k, (target, a, b) in REF.items():
    BUS[k] *= 10 ** ((target - rms_db(BUS[k], a, b)) / 20)
duck = {k: np.ones(N) for k in ('bass', 'pad', 'arp', 'stab')}
for tk, depth in KICKS:
    s = int(tk * SR); L = min(int(0.3 * SR), N - s)
    if L <= 0: continue
    e = np.exp(-np.arange(L) / SR / 0.075)
    for k, mult in (('bass', 0.75), ('pad', 1.3), ('arp', 1.0), ('stab', 1.1)): duck[k][s:s + L] = np.minimum(duck[k][s:s + L], 1 - min(0.9, depth * mult) * e)
for k in duck: BUS[k] *= duck[k]
def pingpong(send, fb=0.46, n=6):
    out = np.zeros((2, N)); x = send.copy(); dl = int(round(3 * S16 * SR))    # a dotted eighth
    for k in range(1, n + 1):
        x = lp(x, 5200 - 520 * k); sh = k * dl
        if sh >= N: break
        out[k % 2, sh:] += x[:N - sh] * fb ** k
    return out
def reverb_ir(d=2.2, seed=9):
    r = np.random.default_rng(seed); t = tv(d)
    return [hp(lp(r.standard_normal(len(t)), 6500), 250) * np.exp(-t * 3.0) * 0.03 for _ in range(2)]
ir = reverb_ir()
def conv(x): return np.stack([ss.fftconvolve(x[i], ir[i])[:N] for i in range(2)])
# the sends were written before the buses were balanced, so each return is set to its own level against the dry signal
mus_dry = sum(BUS[k] for k in ('drum', 'bass', 'pad', 'arp', 'stab', 'fx'))
hook_dry = BUS['hook'] + BUS['lead']
hook_ech = pingpong(DLY['h']); hook_ech *= 10 ** (-9.5 / 20) * np.sqrt(np.mean(hook_dry[:, 15 * SR:30 * SR] ** 2) + 1e-12) / (np.sqrt(np.mean(hook_ech[:, 15 * SR:30 * SR] ** 2)) + 1e-12)
mus_ech = pingpong(DLY['m']); mus_ech *= 10 ** (-33.0 / 20) / (np.sqrt(np.mean(mus_ech[:, 15 * SR:30 * SR] ** 2)) + 1e-12)
mus_wet = conv(VERB['m']); mus_wet *= 10 ** (-27.0 / 20) / (np.sqrt(np.mean(mus_wet[:, 15 * SR:30 * SR] ** 2)) + 1e-12)
sfx_dry = BUS['sfx']
# the effects sit under the music: their loudest tonal moments reach about the level of the hook's notes
sfx_pk = np.percentile(np.abs(sfx_dry[sfx_dry != 0]), 99.9) if np.any(sfx_dry) else 1.0
hook_pk = np.percentile(np.abs(hook_dry[:, 15 * SR:30 * SR]), 99.9)
sg = 0.95 * hook_pk / (sfx_pk + 1e-12)
sfx_dry = sfx_dry * sg
def rel(wet, dry, db): return wet * 10 ** (db / 20) * np.sqrt(np.mean(dry ** 2) + 1e-12) / (np.sqrt(np.mean(wet ** 2)) + 1e-12)
sfx_ech = rel(pingpong(DLY['s'], 0.4, 4), sfx_dry, -15.0); sfx_wet = rel(conv(VERB['s']), sfx_dry, -9.0)
music = mus_dry + hook_dry + hook_ech + mus_ech + mus_wet
music_bed = mus_dry + 0.42 * (hook_dry + hook_ech) + mus_ech + mus_wet
sfx = sfx_dry + sfx_ech + sfx_wet
def fold(x):                                                # the tail past 63 s folds onto the start: the file loops without a click
    n0 = int(TOTAL * SR); tail = x[:, n0:]; y = x[:, :n0].copy(); y[:, :tail.shape[1]] += tail; return y
music, music_bed, sfx = [fold(np.stack([hp(x[i], 28) for i in range(2)])) for x in (music, music_bed, sfx)]

# ---------------------------------------------------------------- master: glue, limit, loudness
def kweight(x):
    hi = ss.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x)
    return ss.lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], hi)
def lufs(st):
    k = [kweight(ch) for ch in st]; blk = int(0.4 * SR); hop = int(0.1 * SR)
    ms = np.array([sum(np.mean(kc[i:i + blk] ** 2) for kc in k) for i in range(0, len(k[0]) - blk, hop)])
    ld = -0.691 + 10 * np.log10(ms + 1e-12); g_ = ms[ld > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g_)) - 10; g2 = ms[(ld > -70) & (ld > rel)]
    return -0.691 + 10 * np.log10(np.mean(g2))
def limiter_gain(x, thr, look=0.004, rel=0.09):
    pk = np.max(np.abs(x), axis=0); w = int(look * SR) * 2 + 1
    g = np.minimum(1.0, thr / np.maximum(maximum_filter1d(pk, w, mode='wrap'), 1e-9))
    a = np.exp(-1 / (rel * SR)); sm = ss.lfilter([1 - a], [1, -a], np.concatenate([g[-SR:], g]))[SR:]   # wrapped: the loop point is treated like any other
    return np.minimum(g, sm)
def master(mix, parts, target):
    """Normalise mix to the loudness target with a look-ahead limiter at −1 dBFS; the same gains go on every part."""
    for _ in range(3):
        g0 = 10 ** ((target - lufs(mix)) / 20); mix = mix * g0; parts = [p * g0 for p in parts]
        gl_ = limiter_gain(mix, 10 ** (-2.2 / 20)); mix = mix * gl_; parts = [p * gl_ for p in parts]
    return mix, parts
mix, (music_o, sfx_o) = master(music + sfx, [music, sfx], -14.0)
vo_music = np.stack([music_bed[i] - 0.4 * bp(music_bed[i], 300, 3000) for i in range(2)])
mix_vo, _ = master(vo_music + sfx, [], -19.0)
suf = '_notext' if NOTEXT else ''
for name, x in (('music', music_o), ('sfx', sfx_o), ('mix', mix), ('mix_vo', mix_vo)): sf.write(OUT / f'{name}{suf}.wav', x.T.astype(np.float32), SR, subtype='PCM_24')

# ---------------------------------------------------------------- report (numbers only: nobody has listened to this yet)
def tp(x): return 20 * np.log10(np.max(np.abs(ss.resample_poly(x, 4, 1, axis=1))) + 1e-12)
n0 = mix.shape[1]
seam = float(np.max(np.abs(mix[:, 0] - mix[:, -1])))
local = float(np.percentile(np.abs(np.diff(mix[:, -int(0.05 * SR):], axis=1)), 99))
bars = [round(float(-0.691 + 10 * np.log10(sum(np.mean(kweight(ch[int(n * BAR * SR):int((n + 1) * BAR * SR)]) ** 2) for ch in mix) + 1e-12)), 1) for n in range(NBAR)]
rep = {'duration_s': n0 / SR, 'sample_rate': SR, 'bpm': BPM, 'bars': NBAR, 'beats': NBAR * BARB,
       'mix_lufs': round(float(lufs(mix)), 2), 'mix_true_peak_db': round(float(tp(mix)), 2), 'mix_vo_lufs': round(float(lufs(mix_vo)), 2), 'mix_vo_true_peak_db': round(float(tp(mix_vo)), 2),
       'music_lufs': round(float(lufs(music_o)), 2), 'sfx_lufs': round(float(lufs(sfx_o)), 2), 'loop_seam_step': round(seam, 5), 'loop_seam_local_p99': round(local, 5), 'loudness_per_scene_lkfs': bars,
       'bus_levels_db': {k: round(float(rms_db(BUS[k], REF.get(k, (0, 15, 30))[1], REF.get(k, (0, 15, 30))[2])), 1) for k in BUS}, 'sfx_events': used}
(OUT.parent / 'build').mkdir(exist_ok=True)
Path(args[2] if len(args) > 2 else OUT.parent / 'build' / f'audio_report{suf}.json').write_text(json.dumps(rep, indent=1))
print(f"mix {rep['mix_lufs']} LUFS, true peak {rep['mix_true_peak_db']} dB, {rep['duration_s']:.3f} s; vo bed {rep['mix_vo_lufs']} LUFS; seam step {seam:.5f} (local p99 {local:.5f})")
print('per scene (LKFS):', ' '.join(f'{b:.0f}' for b in bars))
print(f'stems -> {OUT}/music{suf}.wav, sfx{suf}.wav, mix{suf}.wav, mix_vo{suf}.wav')
