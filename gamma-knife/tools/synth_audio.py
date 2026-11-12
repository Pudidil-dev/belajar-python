#!/usr/bin/env python3
"""Score + sound design for "HOW GAMMA KNIFE MACHINES WORK" — pure code synthesis, no samples. The brief asked for the
client's own BGM and SFX files; none were supplied or found in the repository, so everything here is synthesized and is
the film's own sound (not a stand-in pretending to be the client's files).

  uv run --no-project --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json output/

Writes music.wav, sfx.wav, mix.wav (−14 LUFS) and mix_vo.wav (a bed for a later voice-over) into the output folder. All are
exactly 90.000 s and loop: the beds are periodic in 90 s and tails that ring past the end fold onto the start.

- **Grid.** 120 BPM in 4/4: a bar is 2 s, the film is 45 bars; every cut of the picture sits on a 16th (0.125 s).
- **Harmony.** A minor: an A pedal under the hook, then G – Am – F – C round and round; the last bar (G) resolves into the
  first (Am) across the loop.
- **The arc.** The hook (precise metallic ticks, a low pulse as the beams converge, a bloom for the dose, small electronic
  snaps and pops for the photon, the electron and the water, a dry crystalline crack for the DNA, a reverse-scale
  whoosh, the machine's deep impact) → a light digital groove for imaging and planning → darker, metallic, half time for
  the cobalt sources and the decay → a mechanical groove for the sectors and collimators → the full drop as the beams
  converge → a lighter groove for shaping the dose → a breakdown of bells and crystal ticks for the cell physics →
  a tense pulse with a short alert for the motion safety → a build that flows into the opening tick.
- **Effects.** Every effect is tied to a visible event (cues from the picture). Radiation is not audible: the "energy"
  sounds are illustrative. No explosions, no laser cannon, no siren.
- **Panning.** Moving sounds travel across the stereo field with the picture.
"""
import json, sys
from pathlib import Path
import numpy as np
import scipy.signal as ss
from scipy.ndimage import maximum_filter1d
import soundfile as sf

SR = 48000
BPM = 120; BEAT = 60 / BPM; S16 = BEAT / 4; BARB = 4; BAR = BARB * BEAT
args = [x for x in sys.argv[1:] if not x.startswith('--')]
NOTEXT = '--notext' in sys.argv
cuesheet = json.load(open(args[0]))
OUT = Path(args[1]); OUT.mkdir(parents=True, exist_ok=True)
TOTAL = cuesheet['total']
NT = int(round(TOTAL * SR)); NBAR = int(round(TOTAL / BAR))
N = NT + 4 * SR
BUS = {k: np.zeros((2, N)) for k in ('drum', 'bass', 'pad', 'hook', 'lead', 'arp', 'fx', 'sfx')}
VERB = {k: np.zeros((2, N)) for k in ('m', 's')}; DLY = {k: np.zeros(N) for k in ('h', 'm', 's')}
rng = np.random.default_rng(1953)                       # 1953: the first successful operation on a heart–lung machine
def tb(beat): return beat * BEAT
SCENES = {s['id']: (s['t0'], s['t1']) for s in cuesheet['scenes']}
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



def put_sweep(bus, sig, t, g=1.0, p0=-0.6, p1=0.6, verb=0.0, dly=0.0):
    """Like put(), but the sound travels across the stereo field from p0 to p1 over its length (the attention pan)."""
    s = int(round(t * SR))
    if s >= N or len(sig) == 0: return
    if s < 0: sig = sig[-s:]; s = 0
    sig = sig[:N - s] * g; n = len(sig)
    a = (np.clip(np.linspace(p0, p1, n), -1, 1) + 1) * np.pi / 4; l, r = np.cos(a), np.sin(a)
    B = BUS[bus]; B[0, s:s + n] += sig * l; B[1, s:s + n] += sig * r
    vk = 's' if bus == 'sfx' else 'm'
    if verb: VERB[vk][0, s:s + n] += sig * l * verb; VERB[vk][1, s:s + n] += sig * r * verb
    if dly: DLY['s' if bus == 'sfx' else 'm'][s:s + n] += sig * dly


# ---------------------------------------------------------------- harmony and the hook (A minor)
CH = {'Am': dict(root=33, tones=[69, 72, 76], pad=[45, 57, 60, 64, 69]), 'F': dict(root=29, tones=[65, 69, 72], pad=[41, 53, 57, 60, 65]),
      'C': dict(root=36, tones=[64, 67, 72], pad=[48, 55, 60, 64, 67]), 'G': dict(root=31, tones=[62, 67, 71], pad=[43, 55, 59, 62, 67])}
LOOP = ['Am', 'F', 'C', 'G']
def chord_of_bar(n): n = n % NBAR; return 'Am' if n < 4 else LOOP[(n - 1) % 4]
def chord_at(t): return chord_of_bar(int((max(0, t) % TOTAL) / BAR + 1e-9))
def cn(t, k, octave=0): tones = CH[chord_at(t)]['tones']; return tones[k % 3] + 12 * (k // 3) + octave
# the hook: a syncopated riff on 0, 1.5, 3 and 3.5 beats: the call steps down, the answer climbs
RIFF = {'Am': [76, 72, 69, 72], 'F': [77, 72, 69, 72], 'C': [76, 72, 67, 72], 'G': [74, 71, 67, 74]}
ANSR = {'Am': [69, 72, 76, 79], 'F': [69, 72, 77, 79], 'C': [67, 72, 76, 79], 'G': [67, 71, 74, 79]}
HR = [0, 1.5, 3.0, 3.5]
PENT = [57, 60, 62, 64, 67]                                           # A minor pentatonic
def pent(k, base=12): return PENT[k % 5] + 12 * (k // 5) + base
KICKS = []
def kick_at(t0, g=0.8, depth=0.45): put('drum', kick(0.9, 0.7), t0, 0.85 * g); KICKS.append((t0, depth))
def drums(n, kick_='none', kg=0.8, clap_g=0.0, hat_g=0.0, shaker_g=0.0, open_g=0.0, depth=0.45, beats=range(4)):
    for ib in beats:
        t0 = tb(n * BARB + ib)
        if kick_ == 'four' or (kick_ == 'half' and ib in (0, 2)): kick_at(t0, kg, depth)
        if clap_g and ib in (1, 3): put('drum', clap(), t0, 0.36 * clap_g, 0.05, 0.25)
        if hat_g:
            put('drum', hat(), t0 + 2 * S16, 0.42 * hat_g, 0.25)
            for s in (1, 3): put('drum', hat(), t0 + s * S16, 0.15 * hat_g, -0.3 if s == 1 else 0.35)
        if open_g and ib in (1, 3): put('drum', hat(True), t0 + 2 * S16, 0.2 * open_g, 0.2)
        if shaker_g:
            for s in range(4): put('drum', shaker(), t0 + s * S16, (0.2 if s % 2 else 0.12) * shaker_g, -0.45)
def machine_bass(n, g=1.0, cut=900, beats=range(4)):                 # the machine pulse: 16ths on the root, accent on the beat
    c = CH[chord_of_bar(n)]
    for ib in beats:
        for s in range(4):
            t0 = tb(n * BARB + ib) + s * S16; m = c['root'] + 12 + (12 if s == 2 and ib % 2 else 0)
            put('bass', pulsebass(m, 0.11, cut), t0, (0.5 if s == 0 else 0.3) * g)
        put('bass', subbass(c['root'] + 12, 0.42), tb(n * BARB + ib), 0.32 * g)
def subhold(n, g=1.0, bars=1): c = CH[chord_of_bar(n)]; d = BAR * bars * 0.97; put('bass', subbass(c['root'] + 12, d) * 0.6 + lp(osc('tri', mf(c['root'] + 24), d), 450) * env(d, 0.3, r=0.6) * 0.25, tb(n * BARB), 0.45 * g)
def padbar(n, g=1.0, cut=1300, bright=0.0, bars=1, att=None, t0=None):
    ms = CH[chord_of_bar(n)]['pad']; put('pad', pad(ms, BAR * bars + 0.4, cut, bright, att), tb(n * BARB) if t0 is None else t0, 0.5 * g, 0, 0.5)
def saws(n, g=1.0, cut=3500):                                         # the drop's chord: a wide supersaw, pumping with the kick
    ms = [m + 12 for m in CH[chord_of_bar(n)]['pad'][1:]]; put('pad', supersaw(ms, BAR, cut, 0.01), tb(n * BARB), 0.34 * g, 0, 0.35)
def arpbar(n, g=1.0, cut=2400, step=0.25, oct_=12):
    tones = CH[chord_of_bar(n)]['tones']; seq = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1], tones[0] + 12, tones[2]]
    for k in range(int(4 / step)):
        put('arp', pluck(seq[k % 8] + oct_, 0.13, 0.3, cut), tb(n * BARB + k * step), 0.3 * g * (1.0 if k % 2 == 0 else 0.65), 0.65 * np.sin(k * 1.3), 0.15, 0.25)
def digital(n, g=1.0, cut=3000):                                      # the controller: square blips in 16ths, pentatonic
    for k in range(16):
        m = pent(5 + (k * 3 + n) % 8); put('arp', S(osc('sq', mf(m), 0.06, 0.25) * env(0.06, 0.002, r=0.05), tick(6000, 0.004) * 0.1), tb(n * BARB) + k * S16, 0.2 * g * (1.0 if k % 4 == 0 else 0.6), 0.5 * np.sin(k * 2.1), 0.1, 0.3)
def hookbar(n, kind='call', inst='pluck', g=1.0):
    ch = chord_of_bar(n); notes = (RIFF if kind == 'call' else ANSR)[ch]
    for i, (r, m) in enumerate(zip(HR, notes)):
        t0 = tb(n * BARB + r); acc = 1.0 if i == 0 else 0.82; pan = (-0.3, 0.15, 0.35, -0.1)[i]
        dur = ((HR[i + 1] if i < 3 else 4) - r) * BEAT * 0.9
        if inst in ('pluck', 'full'):
            put('hook', pluck(m, 0.24, 0.3, 4200), t0, 0.62 * g * acc, pan, 0.3, 0.4)
            put('hook', marimba(m + 12, 0.35), t0, 0.12 * g * acc, -pan, 0.3, 0.3)
        if inst == 'bell': put('hook', bell(m + 12, 1.2, 1.4), t0, 0.3 * g * acc, pan, 0.55, 0.35); put('hook', marimba(m, 0.5), t0, 0.22 * g * acc, -pan, 0.3, 0.3)
        if inst == 'full': put('lead', lead(m, dur, 0.4, 3600), t0, 0.42 * g * acc, -pan * 0.5, 0.35, 0.3)
def snare_roll(t0, t1, g=1.0):
    n = int((t1 - t0) / S16)
    for k in range(n): f = k / max(1, n - 1); put('drum', snare(0.6 + 0.4 * f), t0 + k * S16 * (1 - 0.0 * f), (0.12 + 0.3 * f) * g, 0.1 * np.sin(k))
def beat_kicks(t0, t1, g=0.8, depth=0.45):
    t = t0
    while t < t1 - 1e-6: kick_at(t, g, depth); t += BEAT

# ---------------------------------------------------------------- the arrangement (bar n starts at 2n s; 45 bars = 90 s)
CUE_T = lambda name, dflt: next((c['t'] for c in cuesheet['cues'] if c['sfx'] == name), dflt)
DECAY = CUE_T('nuc_pulse', 22.5)
# 0–7 s, the hook: sound design leads over an A pedal, a pad and a soft 16th tick; a riser into the machine's reveal
subhold(0, 0.45, bars=4)
put('pad', pad(CH['Am']['pad'], 8.2, 1000, 0.05, 0.4), 0.0, 0.26, 0, 0.5)
for n in range(0, 4): drums(n, 'none', 0.0, hat_g=0.45 + 0.1 * n, depth=0.0)
for n in (1, 2): arpbar(n, 0.26, 2000, 0.25, 12)
put('fx', riser(1.5, 200, 6000) * 0.6, 5.5, 0.24, 0, 0.3)
BREATH = (6.875, 7.0)
# 7–8 s: the reveal (cue) and a pickup bar; 8–15.5 s: imaging and planning — a light digital groove
put('fx', crash(2.0), 8.0, 0.14, 0, 0.4)
for n in range(4, 8):
    drums(n, 'four', 0.72, hat_g=0.7, shaker_g=0.35, depth=0.45); machine_bass(n, 0.8, 800); padbar(n, 0.8, 1500, 0.1); digital(n, 0.55)
    hookbar(n, 'call' if n % 2 == 0 else 'answer', 'pluck', 0.8)
# 16–30 s: the cobalt sources and the decay — half time, darker, metallic
for n in range(8, 15):
    drums(n, 'half', 0.7, hat_g=0.55, shaker_g=0.25, depth=0.4); machine_bass(n, 0.75, 650); padbar(n, 0.85, 1100, 0.0)
    if n in (9, 11, 13): hookbar(n, 'answer', 'bell', 0.6)
put('hook', chime([cn(DECAY, i, 12) for i in range(3)] + [cn(DECAY, 0, 24)], 0.9, 0.012, glass), DECAY, 0.4, 0, 0.4)
# 30–42 s: sectors and collimators — the mechanical groove
for n in range(15, 21):
    drums(n, 'four', 0.8, clap_g=0.5, hat_g=0.85, shaker_g=0.45, open_g=0.3 if n % 2 else 0, depth=0.5); machine_bass(n, 0.9, 950); padbar(n, 0.85, 1500, 0.1); arpbar(n, 0.42, 2600)
    hookbar(n, 'call' if n % 2 == 0 else 'answer', 'pluck', 0.9)
snare_roll(40.0, 42.0, 0.8); put('fx', riser(2.0, 200, 7000), 40.0, 0.26, 0, 0.3)
BREATH2 = (41.875, 42.0)
# 42–54 s: beams converge, the dose forms — the full drop
put('fx', crash(2.6), 42.0, 0.26, 0, 0.4)
for n in range(21, 27):
    drums(n, 'four', 0.92, clap_g=0.8, hat_g=0.95, shaker_g=0.6, open_g=0.7, depth=0.6); machine_bass(n, 1.0, 1100)
    saws(n, 0.8, 3600); hookbar(n, 'call' if n % 2 == 0 else 'answer', 'full', 1.0); arpbar(n, 0.48, 3000)
# 54–62 s: shaping the dose — the groove, lighter
for n in range(27, 31):
    drums(n, 'four', 0.75, clap_g=0.45, hat_g=0.8, shaker_g=0.4, depth=0.45); machine_bass(n, 0.85, 900); padbar(n, 0.85, 1400); hookbar(n, 'answer' if n % 2 else 'call', 'pluck', 0.85)
# 62–75 s: the cell physics — a breakdown: pad, bells, crystalline arpeggio, the sub
for n in range(31, 38):
    padbar(n, 0.95, 1000 + 80 * (n - 31), 0.25); subhold(n, 0.5)
    if n % 2: hookbar(n, 'answer', 'bell', 0.65)
    arpbar(n, 0.34, 1800, 0.5, 24)
# 75.5–81.5 s: safety — a tense half-time pulse
for n in range(38, 41):
    drums(n, 'half', 0.7, hat_g=0.7, depth=0.4); machine_bass(n, 0.75, 750); padbar(n, 0.8, 1100); digital(n, 0.5)
# 82–90 s: the loop — the groove returns and builds into the opening tick
for k, n in enumerate(range(41, 45)):
    drums(n, 'four', 0.72 - 0.02 * k, hat_g=0.85 + 0.04 * k, shaker_g=0.5 if n < 43 else 0, depth=0.42); machine_bass(n, 0.85 + 0.02 * k, 950 + 80 * k)
    if n < 43: padbar(n, 0.8, 1500 + 100 * k); hookbar(n, 'call' if n % 2 else 'answer', 'pluck', 0.8)
    digital(n, 0.5 + 0.1 * k)
snare_roll(86.0, 89.75, 0.85); put('fx', riser(4.0, 180, 7500), 86.0, 0.26, 0, 0.3)

# ---------------------------------------------------------------- the continuous sound environment (periodic beds)
TT = np.arange(NT) / SR
def per_noise(lo, hi, seed, tilt=0.0):
    r = np.random.default_rng(seed); X = np.fft.rfft(r.standard_normal(NT)); f = np.fft.rfftfreq(NT, 1 / SR)
    m = ((f >= lo) & (f <= hi)).astype(float) * (np.maximum(f, 1) / max(lo, 1)) ** tilt
    y = np.fft.irfft(X * m, NT); return y / (np.std(y) + 1e-12)
def per_sine(f, ph=0.0): f = round(f * TOTAL) / TOTAL; return np.sin(2 * np.pi * f * TT + ph)
def per_lfo(period, ph=0.0): k = max(1, round(TOTAL / period)); return 0.5 + 0.5 * np.sin(2 * np.pi * k * TT / TOTAL + ph)
# levels per scene: machine hum, fan / room, microscopic shimmer
MACH = {'s06_reveal', 's08_mask', 's09_cbct', 's11_cutaway', 's12_sectors', 's18_focus', 's19_translate', 's20_collimate', 's21_sizes', 's22_onoff', 's23_plan8', 's24_channel', 's32_reset', 's33_couch', 's34_nextshot', 's43_ir', 's45_off'}
MICROS = {'s03_photon', 's04_ionize', 's05_dsb', 's14_decay', 's15_gamma', 's36_enter', 's37_compton', 's38_track', 's39_radiolysis', 's40_radicals', 's41_dnahit', 's42_cell'}
def lv(sid): return (1.0 if sid in MACH else 0.45, 0.4 if sid in MICROS else 0.9, 1.0 if sid in MICROS else 0.15)
def automation(i):
    v = np.zeros(NT)
    for sid, (a, b) in SCENES.items(): v[int(a * SR):int(b * SR)] = lv(sid)[i]
    k = int(0.3 * SR); ker = np.hanning(k) / np.hanning(k).sum()
    ext = np.concatenate([v[-k:], v, v[:k]]); return np.convolve(ext, ker, mode='same')[k:-k]
A_mac, A_room, A_mic = (automation(i) for i in range(3))
bed = np.zeros((2, NT))
def add(sig, g, pan=0.0): a = (np.clip(pan, -1, 1) + 1) * np.pi / 4; bed[0] += sig * g * np.cos(a); bed[1] += sig * g * np.sin(a)
mac = (0.5 * per_sine(110) + 0.3 * per_sine(110.6, 0.7) + 0.2 * per_sine(220, 0.3) + 0.12 * per_sine(330, 1.1)) * (0.85 + 0.15 * per_lfo(7.5))
add(mac * A_mac, 0.03, 0.2); add(per_noise(300, 2400, 61, -0.5) * A_mac, 0.012, 0.3)
add(per_noise(60, 900, 62, -0.6) * A_room, 0.016, -0.25); add(per_noise(60, 900, 63, -0.6) * A_room, 0.016, 0.25)
add(per_noise(3500, 11000, 64, -0.2) * A_mic, 0.008, -0.4); add(per_noise(3500, 11000, 65, -0.2) * A_mic, 0.008, 0.4)

# ---------------------------------------------------------------- effects from the picture's cues
def nz(d, lo, hi, a=0.02, r=None): return bp(noise(d), lo, hi) * env(d, a, r=r if r is not None else d * 0.6)
def air(d, f0, f1, a=0.05, r=None): return sweep_lp(noise(d), f0, f1, 2) * env(d, a, r=r if r is not None else d * 0.5)
def metal(m, d=0.25, ratio=3.71): return fm(mf(m), d, ratio, 2.2, 14 / d)
def click_(f=4200, body=180): return S(tick(f, 0.012) * 0.7, np.sin(2 * np.pi * body * tv(0.05)) * np.exp(-tv(0.05) * 70) * 0.5)
def beep(m, d=0.09): return osc('sin', mf(m), d) * env(d, 0.004, r=0.03)
TEXT_SFX = set()
SILENT = set()
SWEEP = {'path_through', 'energy_sweep', 'beam_whoosh', 'hf_sweep', 'whoosh_down', 'cbct_sweep', 'whoosh_dir', 'swish', 'zoomout', 'airflow', 'trace_up', 'whip', 'glide', 'whoosh_pneu', 'rush', 'sweep', 'reverse_air', 'signal_zip', 'swirl', 'dive', 'zoom_out', 'snap', 'push', 'reveal_sweep', 'exhale', 'tunnel', 'fwoosh'}
def make(name, a, t):
    d = float(a) if isinstance(a, (int, float)) and a else None; k = int(a) if isinstance(a, (int, float)) else 0
    # ---- this film's events ----
    if name in ('ticks', 'loop_ticks', 'asc_pulse', 'rise_pulse'):                 # precise metallic ticks, accelerating
        dd = d or 0.5; x = np.zeros(int((dd + 0.3) * SR)); tt = 0.0; i = 0
        while tt < dd: ins(x, S(click_(4200 + 140 * i, 220) * 0.5, metal(pent(14 + i % 5), 0.08) * 0.35) * (0.5 + 0.5 * tt / dd), tt * SR); i += 1; tt += max(0.045, 0.16 * (1 - tt / dd))
        if name in ('asc_pulse', 'rise_pulse'): x = S(x, gl(45, 57 if name == 'rise_pulse' else 64, dd, dd * 0.6, 0.1) * 0.25)
        return x, 0.3, 0.2
    if name == 'impact': return S(boom(60, 30, 1.0) * 1.0, lp(noise(0.12), 1200) * env(0.12, 0.001, r=0.1) * 0.35, click_(2500, 90) * 0.4), 0.3, 0.05
    if name == 'reveal': return S(boom(55, 26, 2.0) * 1.0, metal(45, 1.0, 2.41) * 0.4, lp(noise(0.3), 1800) * env(0.3, 0.001, r=0.25) * 0.35), 0.45, 0.1
    if name == 'bloom': dd = d or 0.9; return S(sweep_lp(noise(dd), 200, 1800, 2) * env(dd, dd * 0.4, r=dd * 0.5) * 0.35, osc('sin', mf(45), dd) * env(dd, dd * 0.3, r=dd * 0.5) * 0.4, glass(cn(t, 0, 24), dd) * 0.25), 0.5, 0.15
    if name == 'crack': return S(glass(pent(20), 0.3) * 0.45, hp(noise(0.07), 4000) * env(0.07, 0.001, r=0.06) * 0.7, tick(7500, 0.01) * 0.5), 0.35, 0.15
    if name in ('scan_tick', 'check', 'ir_tick', 'dose_pulse', 'layer_tick', 'sector_tick'):
        base = {'scan_tick': 12, 'check': 15, 'ir_tick': 18, 'dose_pulse': 10, 'layer_tick': 13, 'sector_tick': 8}[name]
        m = pent(base + (k % 6)); x = S(tick(5200, 0.008) * 0.5, beep(m, 0.05) * 0.5)
        if name == 'sector_tick': x = S(x, click_(3800, 180) * 0.5)
        return x * (0.6 if name == 'ir_tick' else 1), 0.25, 0.25
    if name == 'volume': dd = d or 0.6; return S(sweep_lp(noise(dd), 600, 5000, 2) * env(dd, 0.05, r=dd * 0.6) * 0.35, glass(cn(t, 2, 24), 0.8) * 0.35), 0.5, 0.2
    if name == 'mask_snap': return S(lp(click_(2200, 140), 4000) * 0.8, nz(0.06, 1500, 5000, 0.002, 0.05) * 0.3), 0.2, 0.05
    if name == 'cbct_sweep': dd = d or 1.6; x = noise(dd); return S(sweep_lp(x, 600, 2400, 2) * env(dd, 0.2, r=0.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.6 * tv(dd))) * 0.45, gl(57, 64, dd, 0.2, 0.3) * 0.12), 0.3, 0.1
    if name == 'align_click': return S(metal(pent(15), 0.15) * 0.5, click_(5200, 260) * 0.6), 0.3, 0.2
    if name in ('calc', 'analysis'): dd = d or 1.0; x = np.zeros(int((dd + 0.2) * SR)); n_ = int(dd / S16); [ins(x, beep(pent(12 + (i * 3) % 7), 0.04) * (0.4 + 0.2 * (i % 2)), i * dd / n_ * SR) for i in range(n_)]; return x * (0.6 if name == 'analysis' else 0.8), 0.25, 0.3
    if name == 'metal_reveal': dd = d or 0.9; return S(sweep_lp(noise(dd), 7000, 500, 2) * env(dd, 0.02, r=dd * 0.6) * 0.4, metal(40, dd, 2.8) * 0.45, boom(62, 34, 0.8) * 0.4), 0.45, 0.1
    if name == 'whoosh_down': dd = d or 0.8; return whoosh(dd, False, 300, 7000) * 0.8, 0.3, 0.05
    if name == 'nuc_pulse': return S(chime([cn(t, i, 24) for i in range(3)], 0.5, 0.01, glass) * 0.55, boom(72, 48, 0.35) * 0.5, gl(69, 57, 0.3, 0.005, 0.2) * 0.3), 0.4, 0.3
    if name == 'beta': return S(gl(pent(16), pent(10), 0.25, 0.005, 0.1) * 0.35, tick(6500, 0.006) * 0.4), 0.25, 0.2
    if name == 'gamma_pulse': return S(glass(pent(18 + 2 * k), 0.45) * 0.5, gl(pent(14 + k), pent(22 + k), 0.18, 0.003, 0.08) * 0.35), 0.45, 0.3
    if name == 'absorb_tick': return S(lp(click_(1800, 120), 2500) * 0.7, metal(pent(9), 0.08) * 0.2), 0.2, 0.05
    if name == 'gamma_out': dd = d or 1.2; return S(gl(pent(12), pent(19), dd, 0.05, 0.3) * 0.22, sweep_lp(noise(dd), 3000, 9000, 2) * env(dd, 0.1, r=0.5) * 0.15), 0.4, 0.3
    if name in ('path_through', 'energy_sweep', 'beam_whoosh', 'hf_sweep'):
        dd = d or {'path_through': 0.8, 'energy_sweep': 1.4, 'beam_whoosh': 1.0, 'hf_sweep': 1.0}[name]; f0, f1 = (1800, 11000) if name == 'hf_sweep' else (300, 7000)
        return S(whoosh(dd, True, f0, f1) * 0.75, gl(pent(10), pent(15), dd, dd * 0.4, 0.1) * 0.12), 0.3, 0.1
    if name in ('servo_start', 'motor', 'servo_off', 'shutdown'):
        dd = d or 0.8; f0, f1 = {'servo_start': (60, 140), 'motor': (80, 95), 'servo_off': (150, 70), 'shutdown': (160, 60)}[name]
        x = lp(np.sign(np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, int(dd * SR))) / SR)), 1200) * env(dd, 0.04, r=dd * 0.4) * 0.3
        if name in ('servo_off', 'shutdown'): x = S(x, *[np.concatenate([np.zeros(int(i * 0.07 * SR)), click_(3600 - 200 * i, 160) * 0.4]) for i in range(8 if name == 'shutdown' else 4)])
        return x, 0.2, 0.05
    if name == 'beam_on': dd = d or 0.7; return S(gl(57, 69, dd, 0.02, 0.3) * 0.25, nz(dd, 2000, 7000, 0.02, dd * 0.6) * 0.25), 0.4, 0.2
    if name == 'harmonic': dd = d or 1.4; return S(chime([cn(t, i, 12) for i in range(3)] + [cn(t, 0, 24)], dd, 0.04, bell) * 0.5, osc('sin', mf(45), dd) * env(dd, 0.3, r=0.6) * 0.3), 0.6, 0.3
    if name == 'pulse_single': return S(beep(pent(10), 0.12) * 0.6, boom(70, 50, 0.25) * 0.3), 0.3, 0.2
    if name == 'pulse_layered': return S(chime([pent(10), pent(12), pent(14), pent(17)], 0.6, 0.02, glass) * 0.6, boom(70, 50, 0.3) * 0.4), 0.4, 0.3
    if name == 'deny': return S(beep(64, 0.09), np.concatenate([np.zeros(int(0.1 * SR)), beep(59, 0.14)])) * 0.55, 0.25, 0.1
    if name == 'complete': dd = d or 1.2; return S(chime([cn(t, i, 24) for i in range(4)], dd, 0.05, glass) * 0.5, bell(cn(t, 0, 12), dd, 1.0) * 0.3), 0.6, 0.35
    if name == 'e_snap': return S(whoosh(0.12, True, 1500, 9000) * 0.5, click_(6000, 300) * 0.6, beep(pent(18), 0.04) * 0.3), 0.25, 0.1
    if name in ('ion_pop', 'liquid_pop'): x = pop(cn(t, k % 3, 24), 0.09) * 0.8; x = S(x, lp(noise(0.08), 3000) * env(0.08, 0.001, r=0.06) * 0.3) if name == 'liquid_pop' else x; return x, 0.3, 0.2
    if name == 'mol_snap': return S(pop(cn(t, 1, 24), 0.07) * 0.5, glass(cn(t, 2, 36), 0.2) * 0.25), 0.3, 0.2
    if name == 'bio_pulse': dd = d or 1.0; return S(boom(52, 40, dd) * 0.6, lp(noise(dd), 300) * env(dd, 0.1, r=dd * 0.6) * 0.3), 0.4, 0.1
    if name == 'alert': return S(beep(81, 0.12), np.concatenate([np.zeros(int(0.18 * SR)), beep(81, 0.12)])) * 0.6, 0.25, 0.15
    if name == 'thump': return S(boom(66, 30, 0.9) * 1.0, lp(noise(0.12), 900) * env(0.12, 0.001, r=0.1) * 0.5, click_(2500, 90) * 0.6), 0.25, 0
    if name == 'fwoosh': dd = d or 0.45; return S(air(dd, 6000, 700, 0.01, dd * 0.8) * 0.9, lp(noise(dd), 400) * env(dd, 0.01, r=dd * 0.7) * 0.5), 0.3, 0.1
    if name in ('whoosh_dir', 'whip', 'glide', 'push', 'snap', 'zoom_out', 'dive', 'whoosh_pneu', 'swish', 'sweep'):
        dd = d or {'swish': 0.13, 'whip': 0.25, 'snap': 0.18, 'sweep': 0.35}.get(name, 0.5)
        if name == 'swish': dd = 0.14; return S(whoosh(dd, True, 1200 + 600 * k, 9000) * 0.8, pluck(pent(12 + 2 * k), 0.12, 0.3, 6000) * 0.45), 0.2, 0.15   # a rising three-note figure
        if name == 'sweep': dd = 0.4; return S(whoosh(dd, True, 400 + 300 * k, 7000) * 0.8, lp(noise(dd), 300) * env(dd, 0.05, r=0.3) * 0.3), 0.25, 0.1
        if name == 'snap': return S(whoosh(0.16, True, 800, 9000) * 0.7, click_(5000, 300) * 0.5), 0.2, 0
        up = name in ('push', 'whoosh_dir', 'whip', 'dive', 'snap')
        return whoosh(dd, up, 250, 6000) * (0.6 if name in ('glide', 'zoom_out') else 0.85), 0.3, 0.05
    if name == 'elastic': dd = 0.4; tt = tv(dd); f = 150 + 120 * (1 - np.exp(-tt * 9)) + 6 * np.sin(2 * np.pi * 18 * tt); return S(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(dd, 0.02, r=0.25) * 0.6, lp(noise(dd), 1200) * env(dd, 0.05, r=0.2) * 0.2), 0.35, 0.1
    if name == 'pop': return pop(cn(t, 0, 24), 0.1) * 0.9, 0.3, 0.2
    if name == 'tick': return S(tick(5200, 0.01) * 0.8, blip(cn(t, 2, 24), 0.06) * 0.5), 0.3, 0.25
    if name == 'shimmer': x = np.zeros(int(1.2 * SR)); [ins(x, glass(pent(10 + 2 * i), 0.7) * (0.4 - 0.05 * i), i * 0.045 * SR) for i in range(5)]; return x, 0.6, 0.35
    if name == 'zoomout': dd = d or 0.625; return S(sweep_lp(noise(dd), 400, 9000, 2) * env(dd, dd * 0.7, r=0.03) * 0.8, gl(45, 69, dd, dd * 0.6, 0.03) * 0.25), 0.2, 0
    if name == 'bass_hit': return S(boom(58, 26, 2.0) * 1.0, metal(45, 1.2, 2.41) * 0.35, lp(noise(0.3), 2000) * env(0.3, 0.001, r=0.25) * 0.4, crash(1.6) * 0.3), 0.45, 0.1
    if name in ('airflow', 'airflow_soft'): dd = d or 1.5; return S(nz(dd, 300, 2500, dd * 0.3, dd * 0.5) * 0.6, lp(noise(dd), 350) * env(dd, dd * 0.3, r=dd * 0.5) * 0.4) * (0.6 if name == 'airflow_soft' else 1), 0.3, 0
    if name == 'trace_up': dd = d or 1.3; m0 = cn(t, 0, 12); return gl(m0, m0 + 12, dd, 0.1, 0.3) * 0.4, 0.5, 0.2
    if name == 'metal_click': return S(metal(pent(12 + 2 * k), 0.2) * 0.6, click_(4500, 220) * 0.6), 0.3, 0.2
    if name == 'reveal_sweep': dd = d or 0.6; return S(sweep_lp(noise(dd), 8000, 600, 2) * env(dd, 0.02, r=dd * 0.6) * 0.5, glass(cn(t, 2, 24), 0.8) * 0.3), 0.5, 0.2
    if name in ('hiss_air', 'hiss_o2', 'o2_stream'): dd = d or 0.8; lo, hi = (1800, 6000) if name == 'hiss_air' else (3500, 11000); return nz(dd, lo, hi, 0.02, dd * 0.5) * (0.7 if name != 'o2_stream' else 0.45), 0.25, 0
    if name in ('pressure_hiss', 'tssh', 'release_hiss'):
        dd = d or (0.5 if name == 'pressure_hiss' else 0.6)
        x = nz(dd, 2200, 9000, 0.004, dd * 0.8)
        if name == 'release_hiss': x = x * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * tv(dd)))
        return x * 0.8, 0.3, 0.05
    if name == 'regulate': dd = 0.3; return nz(dd, 1500, 4000, 0.01, 0.2) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * tv(dd))) * 0.5, 0.2, 0
    if name in ('pneu_click', 'click', 'valve_click'):
        body = 160 if name == 'pneu_click' else 240; x = S(click_(5600 if name == 'valve_click' else 4200, body) * 0.9, metal(pent(14), 0.12) * (0.5 if name != 'pneu_click' else 0.2))
        if name == 'pneu_click': x = S(x, nz(0.18, 2000, 7000, 0.003, 0.15) * 0.4)
        return x, 0.25, 0.15
    if name == 'servo_click': return S(click_(4800, 200) * 0.8, osc('sq', 110, 0.08) * env(0.08, 0.003, r=0.05) * 0.15), 0.2, 0.1
    if name == 'servo': dd = d or 0.3; return lp(osc('saw', 1, dd) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(np.linspace(95, 150, int(dd * SR))) / SR)), 1400) * env(dd, 0.02, r=dd * 0.4) * 0.25, 0.15, 0
    if name == 'swirl': dd = d or 1.5; x = noise(dd); return sweep_lp(x, 500, 3000, 2) * env(dd, 0.2, r=0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * tv(dd))) * 0.5, 0.3, 0
    if name == 'detect': return S(beep(pent(15), 0.06) * 0.6, beep(pent(17), 0.06) * 0.5, gl(pent(20), pent(14), 0.25, 0.01, 0.1) * 0.25), 0.3, 0.3
    if name == 'signal_zip': dd = d or 0.8; return S(gl(pent(10), pent(22), dd, 0.01, 0.1) * 0.3, osc('sq', mf(pent(15)), dd, 0.2) * env(dd, 0.01, r=0.1) * 0.06), 0.25, 0.3
    if name in ('chip_tick', 'vol_tick', 'pulse', 'elec_click'): m = pent(14 + (k % 5)); return S(tick(5000, 0.008) * 0.6, beep(m, 0.05) * 0.5), 0.2, 0.25
    if name == 'count': m = pent(10 + k); return S(beep(m, 0.07) * 0.7, tick(6000, 0.006) * 0.3), 0.2, 0.3
    if name == 'trigger': return S(chime([cn(t, i, 24) for i in range(3)], 0.5, 0.01, glass) * 0.7, boom(70, 50, 0.3) * 0.4, click_(6000, 300) * 0.5), 0.4, 0.3
    if name == 'activate': dd = d or 1.0; x = np.zeros(int((dd + 0.2) * SR)); n_ = int(dd / S16 * 2); [ins(x, beep(pent(10 + (i * 3) % 9), 0.05) * (0.5 + 0.3 * (i % 2)), i * dd / n_ * SR) for i in range(n_)]; return x * 0.7, 0.2, 0.3
    if name == 'ev_close': return S(lp(click_(1500, 110), 3000) * 0.8, nz(0.15, 800, 3000, 0.003, 0.1) * 0.3), 0.2, 0.05
    if name == 'gas_start': dd = d or 0.8; return S(nz(dd, 1200, 7000, 0.005, dd * 0.7) * 0.6, lp(noise(dd), 300) * env(dd, 0.01, r=dd * 0.6) * 0.3), 0.25, 0
    if name == 'measure': return S(tick(4500 + 400 * k, 0.008) * 0.6, beep(pent(15 + k), 0.04) * 0.35), 0.2, 0.2
    if name == 'port_thunk': return S(fm(mf(45), 0.25, 1.5, 2.0, 16) * 0.6, lp(noise(0.08), 600) * env(0.08, 0.001, r=0.06) * 0.4), 0.3, 0
    if name == 'warm': dd = d or 1.5; return S(lp(noise(dd), 500) * env(dd, 0.3, r=0.6) * 0.5, osc('sin', mf(45), dd) * env(dd, 0.4, r=0.6) * 0.18 * (0.8 + 0.2 * np.sin(2 * np.pi * 2.0 * tv(dd)))), 0.4, 0
    if name in ('rush', 'tunnel'): dd = d or 1.5; lo = 160 if name == 'tunnel' else 220; return S(sweep_lp(noise(dd), lo, lo * 5, 2) * env(dd, 0.08, r=dd * 0.5) * 0.9, osc('sin', 55, dd) * env(dd, 0.1, r=0.4) * 0.25), 0.3, 0
    if name == 'crystal': m = pent(15 + (k * 2) % 7); return S(glass(m, 0.25) * 0.4, tick(7000, 0.004) * 0.25), 0.4, 0.3
    if name == 'click_soft': return S(pop(cn(t, 1, 24), 0.07) * 0.5, glass(cn(t, 2, 36), 0.2) * 0.25), 0.3, 0.2
    if name == 'bind': return S(bell(cn(t, 0, 24), 2.0, 1.0) * 0.55, marimba(cn(t, 1, 24), 0.9) * 0.5, glass(cn(t, 2, 36), 1.2) * 0.3, lp(kick(0.5, 0.0), 220) * 0.25), 0.6, 0.35
    if name == 'molecular': dd = d or 2.0; x = np.zeros(int((dd + 0.4) * SR)); [ins(x, pop(pent(int(rng.integers(8, 16))), 0.06) * rng.uniform(0.12, 0.3), rng.uniform(0, dd) * SR) for _ in range(int(dd * 10))]; return x, 0.4, 0.2
    if name == 'co2_out': return S(nz(0.4, 1200, 5000, 0.05, 0.3) * 0.4, gl(cn(t, 2, 12), cn(t, 0, 12), 0.4, 0.05, 0.2) * 0.25), 0.4, 0.1
    if name == 'beep_ok': return S(beep(81, 0.09), np.concatenate([np.zeros(int(0.1 * SR)), beep(88, 0.12)])) * 0.7, 0.3, 0.25
    if name == 'exhale': dd = d or 2.0; tt = tv(dd); x = noise(dd); return sweep_lp(x, 2600, 380, 2) * (np.minimum(1, tt / 0.12) * np.exp(-tt / (dd * 0.55))) * 0.9, 0.35, 0
    if name == 'reverse_air': dd = d or 0.9; x = air(dd, 700, 6000, 0.02, dd * 0.3)[::-1]; return x * 0.8, 0.3, 0.05
    if name == 'stabilize': dd = d or 1.6; return S(lp(click_(1200, 90), 2000) * 0.5, nz(0.5, 1200, 5000, 0.01, 0.4) * 0.35, osc('sin', mf(57), dd) * env(dd, 0.3, r=0.8) * 0.15), 0.4, 0.1
    if name == 'monitor_blip': return beep(88, 0.07) * 0.35, 0.25, 0.2
    if name == 'rise': dd = d or 2.0; x = np.zeros(int((dd + 0.2) * SR)); tt = 0.0; i = 0
    if name == 'rise':
        while tt < dd: ins(x, S(click_(3000 + 120 * i, 150) * 0.5, beep(pent(8 + i % 10), 0.04) * 0.3) * (0.4 + 0.6 * tt / dd), tt * SR); i += 1; tt += max(0.06, 0.25 * (1 - tt / dd))
        return x, 0.25, 0.2
    if name == 'buildup': dd = d or 1.5; return S(sweep_lp(noise(dd), 300, 3000, 2) * env(dd, dd * 0.8, r=0.1) * 0.4, osc('sin', mf(45), dd) * env(dd, dd * 0.6, r=0.2) * 0.15), 0.3, 0
    if name == 'loop_rise': dd = d or 1.5; return S(sweep_lp(noise(dd), 300, 9000, 2) * env(dd, dd * 0.95, r=0.005) * 0.7, gl(45, 69, dd, dd * 0.9, 0.005) * 0.2), 0.2, 0
    raise KeyError(name)
GAIN = {'reveal': 1.15, 'impact': 1.0, 'ticks': 0.75, 'loop_ticks': 0.7, 'crack': 0.95, 'bloom': 0.8, 'nuc_pulse': 0.9, 'gamma_pulse': 0.75, 'alert': 0.6, 'shutdown': 0.7, 'servo_off': 0.6, 'scan_tick': 0.5, 'check': 0.5, 'ir_tick': 0.4, 'sector_tick': 0.55, 'layer_tick': 0.45, 'dose_pulse': 0.5, 'calc': 0.45, 'analysis': 0.4, 'harmonic': 0.8, 'complete': 0.8, 'thump': 1.3, 'bass_hit': 1.1, 'fwoosh': 1.05, 'swish': 1.0, 'shimmer': 0.95, 'tick': 0.95, 'pop': 1.0, 'whoosh_dir': 1.0, 'elastic': 1.0, 'zoomout': 1.0, 'crystal': 0.38, 'molecular': 0.5, 'monitor_blip': 0.4, 'count': 0.6,
        'activate': 0.55, 'measure': 0.5, 'elec_click': 0.5, 'pulse': 0.5, 'chip_tick': 0.45, 'vol_tick': 0.5, 'signal_zip': 0.5, 'beep_ok': 0.7, 'trigger': 0.85, 'bind': 1.1,
        'airflow': 0.65, 'airflow_soft': 0.45, 'warm': 0.6, 'rise': 0.6, 'buildup': 0.55, 'loop_rise': 0.75, 'swirl': 0.55, 'regulate': 0.4, 'servo': 0.5}
missing = set(); used = {}
for cu in cuesheet['cues']:
    nm = cu['sfx']
    if nm in SILENT or (NOTEXT and nm in TEXT_SFX): continue
    try: sig, rv, dl = make(nm, cu.get('arg'), cu['t'])
    except KeyError: missing.add(nm); continue
    pk = np.max(np.abs(sig)) + 1e-9; g = 0.4 * cu.get('g', 1) * GAIN.get(nm, 0.75); p = cu.get('pan', 0)
    if nm in SWEEP and abs(p) > 0.05: put_sweep('sfx', sig / pk, cu['t'], g, -p * 0.9, p, rv, dl)
    else: put('sfx', sig / pk, cu['t'], g, p * 0.75, rv, dl)
    used[nm] = used.get(nm, 0) + 1
if missing: print('no generator for:', sorted(missing))

# ---------------------------------------------------------------- balance, side-chain, sends
def rms_db(x, t0=None, t1=None):
    seg = x[:, int((t0 or 0) * SR):int((t1 or TOTAL) * SR)]; return 10 * np.log10(np.mean(seg ** 2) + 1e-12)
for k in ('drum', 'bass', 'pad', 'hook', 'lead', 'arp', 'fx'):             # one 16th of silence before each drop
    for (a_, b_) in (BREATH, BREATH2): BUS[k][:, int(a_ * SR):int(b_ * SR)] = 0.0
MID = (42, 50); LEAD = (42, 50)
REF = {'drum': (-17.0, *MID), 'bass': (-19.5, *MID), 'pad': (-24.0, *MID), 'hook': (-18.5, *MID), 'arp': (-28.0, *MID), 'lead': (-23.0, *LEAD), 'fx': (-28.0, 0, TOTAL)}
for k, (target, a, b) in REF.items():
    BUS[k] *= 10 ** ((target - rms_db(BUS[k], a, b)) / 20)
duck = {k: np.ones(N) for k in ('bass', 'pad', 'arp')}
for tk, depth in KICKS:
    s = int(tk * SR); L = min(int(0.3 * SR), N - s)
    if L <= 0: continue
    e = np.exp(-np.arange(L) / SR / 0.075)
    for k, mult in (('bass', 0.7), ('pad', 1.0), ('arp', 0.8)): duck[k][s:s + L] = np.minimum(duck[k][s:s + L], 1 - min(0.85, depth * mult) * e)
for k in duck: BUS[k] *= duck[k]
def pingpong(send, fb=0.42, n=6):
    out = np.zeros((2, N)); x = send.copy(); dl = int(round(3 * S16 * SR))    # a dotted eighth
    for k in range(1, n + 1):
        x = lp(x, 5200 - 520 * k); sh = k * dl
        if sh >= N: break
        out[k % 2, sh:] += x[:N - sh] * fb ** k
    return out
def reverb_ir(d=2.4, seed=9):
    r = np.random.default_rng(seed); t = tv(d)
    return [hp(lp(r.standard_normal(len(t)), 6000), 250) * np.exp(-t * 2.8) * 0.03 for _ in range(2)]
ir = reverb_ir()
def conv(x): return np.stack([ss.fftconvolve(x[i], ir[i])[:N] for i in range(2)])
def rel(wet, dry, db): return wet * 10 ** (db / 20) * np.sqrt(np.mean(dry ** 2) + 1e-12) / (np.sqrt(np.mean(wet ** 2)) + 1e-12)
mus_dry = sum(BUS[k] for k in ('drum', 'bass', 'pad', 'arp', 'fx'))
hook_dry = BUS['hook'] + BUS['lead']
hook_ech = rel(pingpong(DLY['h']), hook_dry, -10.0)
mus_wet = rel(conv(VERB['m']), mus_dry + hook_dry, -14.0)
sfx_dry = BUS['sfx']
sfx_pk = np.percentile(np.abs(sfx_dry[sfx_dry != 0]), 99.9) if np.any(sfx_dry) else 1.0
hook_pk = np.percentile(np.abs(hook_dry[:, MID[0] * SR:MID[1] * SR]), 99.9)
sfx_dry = sfx_dry * (0.72 * hook_pk / (sfx_pk + 1e-12))
sfx_ech = rel(pingpong(DLY['s'], 0.38, 4), sfx_dry, -16.0); sfx_wet = rel(conv(VERB['s']), sfx_dry, -10.0)
# the beds sit under everything: about 12 dB below the music in the busy middle of the film
bed_full = np.zeros((2, N)); bed_full[:, :NT] = bed
bed_full *= 10 ** ((rms_db(mus_dry + hook_dry, *MID) - 12.0 - rms_db(bed_full, *MID)) / 20)
music = mus_dry + hook_dry + hook_ech + mus_wet
music_bed = mus_dry + 0.42 * (hook_dry + hook_ech) + mus_wet
sfx = sfx_dry + sfx_ech + sfx_wet + bed_full
def fold(x):                                                # the tail past the end folds onto the start: the file loops without a click
    tail_ = x[:, NT:]; y = x[:, :NT].copy(); y[:, :tail_.shape[1]] += tail_; return y
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
    for _ in range(4):
        g0 = 10 ** ((target - lufs(mix)) / 20); mix = mix * g0; parts = [p * g0 for p in parts]
        gl_ = limiter_gain(mix, 10 ** (-3.0 / 20)); mix = mix * gl_; parts = [p * gl_ for p in parts]
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
bars = [round(float(-0.691 + 10 * np.log10(sum(np.mean(kweight(ch[int(a * SR):int(b * SR)]) ** 2) for ch in mix) + 1e-12)), 1) for (a, b) in SCENES.values()]
rep = {'duration_s': n0 / SR, 'sample_rate': SR, 'bpm': BPM, 'bars': NBAR, 'beats': NBAR * BARB,
       'mix_lufs': round(float(lufs(mix)), 2), 'mix_true_peak_db': round(float(tp(mix)), 2), 'mix_vo_lufs': round(float(lufs(mix_vo)), 2), 'mix_vo_true_peak_db': round(float(tp(mix_vo)), 2),
       'music_lufs': round(float(lufs(music_o)), 2), 'sfx_lufs': round(float(lufs(sfx_o)), 2), 'loop_seam_step': round(seam, 5), 'loop_seam_local_p99': round(local, 5), 'loudness_per_scene_lkfs': bars,
       'bus_levels_db': {k: round(float(rms_db(BUS[k], REF.get(k, (0, *MID))[1], REF.get(k, (0, *MID))[2])), 1) for k in BUS}, 'sfx_events': used}
(OUT.parent / 'build').mkdir(exist_ok=True)
Path(args[2] if len(args) > 2 else OUT.parent / 'build' / f'audio_report{suf}.json').write_text(json.dumps(rep, indent=1))
print(f"mix {rep['mix_lufs']} LUFS, true peak {rep['mix_true_peak_db']} dB, {rep['duration_s']:.3f} s; vo bed {rep['mix_vo_lufs']} LUFS; seam step {seam:.5f} (local p99 {local:.5f})")
print('per scene (LKFS):', ' '.join(f'{b:.0f}' for b in bars))
print(f'stems -> {OUT}/music{suf}.wav, sfx{suf}.wav, mix{suf}.wav, mix_vo{suf}.wav')
