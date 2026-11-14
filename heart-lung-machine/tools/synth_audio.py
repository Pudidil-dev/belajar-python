#!/usr/bin/env python3
"""Score + sound design for "THE HEART IS STILL — How a Heart–Lung Machine Works" — pure code synthesis, no samples.

  uv run --no-project --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json output/ [--notext]

Writes four stems into the output folder (or *_notext.wav without the label ticks):
  music.wav    the score
  sfx.wav      the sound environment: operating-room hum, machine hum, blood flow, pump, gas and water beds, and the
               picture-synced effects
  mix.wav      music + sound, mastered to −14 LUFS: the film's sound when there is no narration
  mix_vo.wav   the same with the melody pulled back and the voice band thinned, at −19 LUFS: a bed for a later voice-over
All are exactly 92.000 s and loop: the beds are periodic in 92 s, and tails that ring past the end fold onto the start.

- **Grid.** 120 BPM in 4/4: a bar is 2 s, the film is 46 bars.
- **Harmony.** The opening and the closing (bars 0–2 and 43–45) hold a suspended G, the question; the turn to the machine
  at 6 s resolves it to C. Then C – Am – F – G, one chord per bar, ten times; a cycle starts exactly at 54.0 s, where
  oxygen binds to hemoglobin (the payoff), and at 70 s (oxygen delivered).
- **The workflow.** In S05 each of the seven steps rings one note higher than the last (a pentatonic ladder).
- **The hook.** A marimba figure in a 3-3-2 eighth-note rhythm: three notes down (a call), next cycle three up (the answer).
- **The arc.** The still heart (no drums) → the machine from the side and its workflow (a light pulse) → its parts
  (forward motion) → the microscopic world (the drums fall away, a quieter space, a held breath) → the binding (the full
  groove) → the way back (it starts to resolve) → the other lines and the perfusionist (thinning) → the opening chord.
- **The rules of this film.** No heartbeat sound at any point; no kick drum while the arrested heart is on screen; no
  alarm, no flatline, no rhythmic monitor beep; the flow is continuous and never pulses; no splashing, bubbling, punctures,
  clamps or impacts. Molecular sounds are soft, tuned, editorial cues.
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


# ---------------------------------------------------------------- harmony and the hook (C major)
CH = {'Gs': dict(root=31, tones=[67, 72, 74], pad=[43, 55, 60, 62, 67]), 'C': dict(root=36, tones=[64, 67, 72], pad=[48, 55, 60, 64, 67]),
      'Am': dict(root=33, tones=[64, 69, 72], pad=[45, 52, 60, 64, 69]), 'F': dict(root=29, tones=[65, 69, 72], pad=[41, 53, 60, 65, 69]),
      'G': dict(root=31, tones=[62, 67, 71], pad=[43, 50, 59, 62, 67])}
LOOP = ['C', 'Am', 'F', 'G']
def chord_of_bar(n): n = n % NBAR; return 'Gs' if n <= 2 or n >= NBAR - 3 else LOOP[(n - 3) % 4]
def chord_at(t): return chord_of_bar(int(max(0, t) / BAR + 1e-9))
def cn(t, k, octave=0): tones = CH[chord_at(t)]['tones']; return tones[k % 3] + 12 * (k // 3) + octave
CALL = {'C': [76, 74, 72], 'Am': [76, 72, 69], 'F': [77, 72, 69], 'G': [74, 71, 67]}       # down
ANSWER = {'C': [72, 76, 79], 'Am': [69, 72, 76], 'F': [69, 72, 77], 'G': [71, 74, 79]}     # up
HR = [0, 1.5, 3]                                                                             # 3-3-2 in eighths
PENT = [60, 62, 64, 67, 69]
def pent(k, base=12): return PENT[k % 5] + 12 * (k // 5) + base
KICKS = []
def drums(n, kick_='none', kg=0.8, clap_g=0.0, hat_g=0.0, shaker_g=0.0, open_g=0.0, depth=0.5, beats=range(4)):
    for ib in beats:
        t0 = tb(n * BARB + ib)
        if kick_ == 'four' or (kick_ == 'half' and ib in (0, 2)): put('drum', kick(0.9, 0.55), t0, 0.85 * kg); KICKS.append((t0, depth))
        if clap_g and ib in (1, 3): put('drum', clap(), t0, 0.36 * clap_g, 0.05, 0.25)
        if hat_g:
            put('drum', hat(), t0 + 2 * S16, 0.42 * hat_g, 0.25)
            for s in (1, 3): put('drum', hat(), t0 + s * S16, 0.15 * hat_g, -0.25 if s == 1 else 0.35)
        if open_g and ib in (1, 3): put('drum', hat(True), t0 + 2 * S16, 0.18 * open_g, 0.2)
        if shaker_g:
            for s in range(4): put('drum', shaker(), t0 + s * S16, (0.2 if s % 2 else 0.12) * shaker_g, -0.45)
def bassline(n, g=1.0, cut=850, beats=range(4)):
    c = CH[chord_of_bar(n)]
    for ib in beats:
        t0 = tb(n * BARB + ib)
        put('bass', pulsebass(c['root'] + 12 + (7 if ib == 3 else 0), 0.2, cut), t0 + 2 * S16, 0.5 * g)
        put('bass', subbass(c['root'] + 12, 0.2), t0 + 2 * S16, 0.3 * g)
def subhold(n, g=1.0, bars=1): c = CH[chord_of_bar(n)]; d = BAR * bars * 0.97; put('bass', subbass(c['root'] + 12, d) * 0.6 + lp(osc('tri', mf(c['root'] + 24), d), 450) * env(d, 0.3, r=0.6) * 0.25, tb(n * BARB), 0.45 * g)
def padbar(n, g=1.0, cut=1300, bright=0.0, bars=1, att=None):
    ms = CH[chord_of_bar(n)]['pad']; put('pad', pad(ms, BAR * bars + 0.4, cut, bright, att), tb(n * BARB), 0.5 * g, 0, 0.5)
def arpbar(n, g=1.0, cut=2400, step=0.5):
    tones = CH[chord_of_bar(n)]['tones']; seq = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1]]
    for k in range(int(4 / step)):
        put('arp', pluck(seq[k % 6] + 12, 0.16, 0.3, cut), tb(n * BARB + k * step), 0.3 * g * (1.0 if k % 2 == 0 else 0.7), 0.6 * np.sin(k * 1.3), 0.15, 0.2)
def hookbar(n, kind='call', inst='mar', g=1.0):
    ch = chord_of_bar(n); notes = (CALL if kind == 'call' else ANSWER)[ch]
    for i, (r, m) in enumerate(zip(HR, notes)):
        t0 = tb(n * BARB + r); acc = 1.0 if i == 0 else 0.85; pan = (-0.25, 0.1, 0.3)[i]
        if inst in ('mar', 'full'):
            put('hook', marimba(m, 0.7), t0, 0.6 * g * acc, pan, 0.3, 0.4)
            put('hook', marimba(m + 12, 0.4), t0, 0.14 * g * acc, -pan, 0.3, 0.3)
        if inst == 'bell': put('hook', bell(m + 12, 1.3, 1.5), t0, 0.32 * g * acc, pan, 0.55, 0.35); put('hook', marimba(m, 0.6), t0, 0.24 * g * acc, -pan, 0.3, 0.3)
        if inst == 'full':
            dur = ((HR[i + 1] if i < 2 else 4) - r) * BEAT * 0.9
            put('lead', lead(m, dur, 0.4, 3400), t0, 0.42 * g * acc, -pan * 0.5, 0.35, 0.3)
def question(t0, g=1.0):                                   # the opening question: a rising fourth that does not resolve
    put('hook', bell(74 + 12, 1.6, 1.3), t0, 0.3 * g, -0.3, 0.6, 0.4); put('hook', marimba(74, 0.7), t0, 0.35 * g, -0.3, 0.4, 0.3)
    put('hook', bell(79 + 12, 2.0, 1.3), t0 + BEAT, 0.3 * g, 0.3, 0.6, 0.4); put('hook', marimba(79, 0.8), t0 + BEAT, 0.4 * g, 0.3, 0.4, 0.3)

# ---------------------------------------------------------------- the arrangement (bar n starts at 2n s)
# Sections follow the scene starts (T0) so that the score stays attached to the picture: the binding (S16 + 1.0 s) and the
# oxygen payoff (S20 + 2.0 s) land on the downbeat of a C bar, the first bar of a C – Am – F – G cycle.
T0 = {k: v[0] for k, v in SCENES.items()}
def bar_at(t): return int(round(t / BAR))
B_BIND = bar_at(T0['s16_hemoglobin'] + 1.0); B_PAY = bar_at(T0['s20_tissue'] + 2.0); B_END = NBAR - 3
assert (B_BIND - 3) % 4 == 0 and (B_PAY - 3) % 4 == 0, 'binding and payoff must start a chord cycle'
def light(n, g=1.0, kick_='half'):                         # the machine's light pulse
    padbar(n, 0.9 * g, 1200 + 40 * (n % 4)); hookbar(n, 'call' if (n - 3) % 8 < 4 else 'answer', 'mar', 0.9 * g)
    drums(n, kick_, 0.6, hat_g=0.6, shaker_g=0.45, depth=0.3); bassline(n, 0.7, 700)
def groove(n, open_=False, clap=True):                     # forward motion through the parts
    padbar(n, 1.0, 1500, 0.1); hookbar(n, 'call' if (n - 7) % 8 < 4 else 'answer', 'mar', 1.0)
    drums(n, 'four', 0.72, clap_g=0.55 if clap else 0, hat_g=0.9, shaker_g=0.6, open_g=(0.4 if n % 2 else 0) + (0.3 if open_ else 0), depth=0.45); bassline(n, 0.95); arpbar(n, 0.6, 2200 + (400 if open_ else 0))
def nokick(n, g=1.0, inst='bell'):                          # the heart on screen: no kick, a lighter pulse
    padbar(n, 0.95 * g, 1400, 0.1); hookbar(n, 'answer' if n % 2 else 'call', inst, 0.85 * g); drums(n, 'none', hat_g=0.7, shaker_g=0.6); bassline(n, 0.75, 750); arpbar(n, 0.5, 2000)
# bars 0–2 (0–6 s): the still heart. The suspended chord, no drums; the question at 2.25 s; a slow swell into the turn
padbar(0, 1.0, 1000, bars=3, att=1.2); subhold(0, 0.6, bars=3)
question(2.25, 0.9)
put('fx', riser(1.8, 200, 2600) * 0.6, 4.2, 0.22, 0, 0.3)
for k in range(8): put('drum', shaker(), 4.0 + k * BEAT / 2, 0.06 + 0.012 * k, -0.4)
# bars 3–4 (6–10 s): the machine from the side — the question resolves to C; the heart is still in the frame: no kick yet
put('fx', chime([72, 76, 79, 84], 1.8, 0.05, bell), 6.0, 0.3, 0, 0.6)
for n in (3, 4): light(n, 0.9, 'none')
# bars 5–8 (10–18 s): the workflow, one drop round the loop — the light pulse with a half-time kick; the steps ring on top
for n in range(5, 9): light(n, 1.0, 'half'); arpbar(n, 0.4, 1800)
# bars 9–10 (18–22 s): drainage from the chest (the heart on screen): hats, shaker and bass carry it, no kick
put('fx', revcym(1.2), 2 * 11 - 1.2, 0.16, 0, 0.3)
for n in (9, 10): nokick(n, 0.95, 'mar')
# bars 11–16 (22–34 s): reservoir, pump, heater–cooler, heat exchanger — smooth forward motion
for n in range(11, 17): groove(n)
# bars 17–20 (34–42 s): gas, the oxygenator, the push into one fibre — the groove opens up
for n in range(17, 21): groove(n, open_=True)
# bars 21–22 (42–46 s): one fibre, end-on — the groove without the clap
for n in (21, 22): groove(n, clap=False)
# bars 23–24: the membrane — the kick falls away, a lighter texture
for n in range(B_BIND - 4, B_BIND - 2):
    padbar(n, 0.9, 1100); hookbar(n, 'answer' if n % 2 else 'call', 'bell', 0.75); drums(n, 'none', hat_g=0.6, shaker_g=0.5); bassline(n, 0.55, 600); arpbar(n, 0.45, 1600)
# bars 25–26: inside the red cell — a quieter space, then a held breath before the binding
for n in range(B_BIND - 2, B_BIND): padbar(n, 0.85, 800); subhold(n, 0.7); arpbar(n, 0.35, 1100, 1.0)
put('fx', riser(2.4, 180, 5200), B_BIND * BAR - 2.0 + 0.2, 0.26, 0, 0.25)
BREATH = (B_BIND * BAR - 0.25, B_BIND * BAR)
# bars 27–30: the binding — the full groove, the hook doubled; CO2 leaves
put('fx', boom(58, 34, 1.4), B_BIND * BAR, 0.18)
for n in range(B_BIND, B_BIND + 4):
    padbar(n, 0.95, 1900, 0.25); hookbar(n, 'call' if n % 2 else 'answer', 'full', 1.0)
    drums(n, 'four', 0.92, clap_g=0.85, hat_g=1.0, shaker_g=0.7, open_g=0.7, depth=0.55); bassline(n, 1.05, 1050); arpbar(n, 0.7, 2700, 0.25)
# bars 31–32: filter and bubble detector — the groove continues, lighter
for n in range(B_BIND + 4, B_BIND + 6):
    padbar(n, 0.95, 1500, 0.1); hookbar(n, 'call' if n % 2 else 'answer', 'mar', 0.9); drums(n, 'four', 0.72, clap_g=0.55, hat_g=0.85, shaker_g=0.5, depth=0.45); bassline(n, 0.9); arpbar(n, 0.55, 2200)
# bars 33–34: back into the aorta (the heart on screen: no kick), then the capillary — the journey starts to resolve
for n in range(B_BIND + 6, B_PAY): nokick(n)
# bar 35: oxygen delivered — a small payoff in the capillary
put('fx', chime([72, 76, 79, 84, 88], 1.6, 0.05, glass), B_PAY * BAR, 0.45, 0, 0.6)
padbar(B_PAY, 1.0, 1700, 0.2); hookbar(B_PAY, 'call', 'full', 0.85); drums(B_PAY, 'four', 0.7, clap_g=0.5, hat_g=0.85, shaker_g=0.5, depth=0.45); bassline(B_PAY, 0.9); arpbar(B_PAY, 0.55, 2300)
# bars 36–39: the machine's other lines — cardioplegia (the heart on screen: no kick, a cool bell) and suction
for n in range(B_PAY + 1, B_PAY + 3): nokick(n, 0.9, 'bell')
for n in range(B_PAY + 3, B_PAY + 5): nokick(n, 1.0, 'mar'); drums(n, 'none', shaker_g=0.3)
# bars 40–42: the perfusionist and the whole loop — thinning, no kick
for i, n in enumerate(range(B_PAY + 5, B_END)):
    padbar(n, 0.9, 1200 - 80 * i); hookbar(n, 'answer' if i == 1 else 'call', 'mar', 0.75 - 0.08 * i); drums(n, 'none', hat_g=0.45, shaker_g=max(0.0, 0.4 - 0.1 * i)); subhold(n, 0.6)
# bars 43–45: back to the opening — the suspended chord, the same balance as bar 0
padbar(B_END, 1.0, 1000, bars=3, att=1.2); subhold(B_END, 0.6, bars=3)
put('hook', bell(74 + 12, 2.2, 1.2), B_END * BAR + 2.0, 0.18, -0.3, 0.6, 0.3); put('hook', bell(79 + 12, 2.6, 1.2), B_END * BAR + 3.0, 0.16, 0.3, 0.6, 0.3)

# ---------------------------------------------------------------- the continuous sound environment (periodic beds)
TT = np.arange(NT) / SR
def per_noise(lo, hi, seed, tilt=0.0):                      # band-limited noise that is exactly periodic in the film length
    r = np.random.default_rng(seed); X = np.fft.rfft(r.standard_normal(NT)); f = np.fft.rfftfreq(NT, 1 / SR)
    m = ((f >= lo) & (f <= hi)).astype(float) * (np.maximum(f, 1) / max(lo, 1)) ** tilt
    y = np.fft.irfft(X * m, NT); return y / (np.std(y) + 1e-12)
def per_sine(f, ph=0.0): f = round(f * TOTAL) / TOTAL; return np.sin(2 * np.pi * f * TT + ph)   # whole cycles in the loop
def per_lfo(period, ph=0.0): k = max(1, round(TOTAL / period)); return 0.5 + 0.5 * np.sin(2 * np.pi * k * TT / TOTAL + ph)
# levels per scene (crossfaded over 0.6 s across each cut, so tails cross the cuts): hum, machine, flow, pump, gas, water
LV = {
 's01_still': (1.0, 0.2, 0.7, 0.1, 0, 0), 's02_moving': (1.0, 0.2, 1.0, 0.1, 0, 0), 's03_follow': (0.9, 0.6, 0.75, 0.2, 0, 0),
 's04_machine': (0.75, 0.85, 0.6, 0.35, 0.05, 0.1), 's05_workflow': (0.6, 0.85, 0.75, 0.45, 0.1, 0.1), 's06_drain': (0.7, 0.6, 0.9, 0.3, 0, 0),
 's07_reservoir': (0.55, 0.8, 0.8, 0.4, 0, 0), 's08_pump': (0.5, 0.85, 0.6, 1.0, 0, 0), 's09_heater': (0.5, 0.8, 0.45, 0.35, 0, 0.8),
 's10_exchanger': (0.45, 0.7, 0.5, 0.3, 0, 0.6), 's11_gas': (0.45, 0.75, 0.4, 0.3, 0.8, 0.1), 's12_oxygenator': (0.45, 0.75, 0.5, 0.3, 0.4, 0.2),
 's13_fiber': (0.25, 0.2, 0.45, 0.05, 0.7, 0), 's14_diffuse': (0.2, 0.15, 0.35, 0.05, 0.55, 0), 's15_rbc': (0.15, 0.1, 0.3, 0.0, 0.15, 0),
 's16_hemoglobin': (0.15, 0.1, 0.25, 0.0, 0.0, 0), 's17_co2': (0.25, 0.3, 0.35, 0.1, 0.7, 0), 's18_filter': (0.55, 0.8, 0.6, 0.35, 0.1, 0.1),
 's19_return': (0.8, 0.45, 1.0, 0.15, 0, 0), 's20_tissue': (0.25, 0.1, 0.45, 0.0, 0, 0), 's21_cardioplegia': (0.7, 0.6, 0.6, 0.45, 0, 0.1),
 's22_suction': (0.7, 0.75, 0.7, 0.5, 0, 0), 's23_perfusionist': (1.0, 0.9, 0.55, 0.35, 0, 0.1), 's24_system': (0.95, 0.6, 0.6, 0.25, 0, 0),
 's25_loop': (1.0, 0.25, 0.7, 0.1, 0, 0)}
def automation(i):
    v = np.zeros(NT); xs = []
    for sid, (a, b) in SCENES.items(): xs.append((a, b, LV[sid][i]))
    xs.sort()
    for a, b, val in xs: v[int(a * SR):int(b * SR)] = val
    k = int(0.6 * SR); ker = np.hanning(k) / np.hanning(k).sum()
    ext = np.concatenate([v[-k:], v, v[:k]]); sm = np.convolve(ext, ker, mode='same')[k:-k]     # circular: the seam too
    return sm
A_hum, A_mac, A_flow, A_pump, A_gas, A_wat = (automation(i) for i in range(6))
A_flow = A_flow * (1 + 0.2 * (np.abs(TT - (T0['s19_return'] + 2.2)) < 1.0))   # S19: the flow broadens as it reaches the aorta
bed = np.zeros((2, NT))
def add(sig, g, pan=0.0):
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    if np.ndim(pan): bed[0] += sig * g * np.cos(a); bed[1] += sig * g * np.sin(a)
    else: bed[0] += sig * g * np.cos(a); bed[1] += sig * g * np.sin(a)
# operating-room hum (tuned to G: 49 Hz and its harmonics) and room tone
hum = 0.6 * per_sine(49) + 0.35 * per_sine(98, 0.3) + 0.18 * per_sine(147, 1.1) + 0.08 * per_sine(196, 2.0)
room = per_noise(60, 900, 11, -0.6)
add(hum * A_hum, 0.05); add(room * A_hum, 0.018, -0.2); add(per_noise(60, 900, 12, -0.6) * A_hum, 0.018, 0.2)
# the machine: a soft motor hum (D, the fifth of G), slowly beating
mac = (0.6 * per_sine(147) + 0.4 * per_sine(147.5, 0.7) + 0.25 * per_sine(294, 0.2)) * (0.85 + 0.15 * per_lfo(8.5))
add(mac * A_mac, 0.03, 0.15)
# blood flow: filtered, continuous, nonpulsatile (only very slow drift, never a beat)
flowL, flowR = per_noise(80, 700, 21, -0.8), per_noise(80, 700, 22, -0.8)
drift = 0.9 + 0.1 * per_lfo(17)
add(flowL * A_flow * drift, 0.035, -0.45); add(flowR * A_flow * drift, 0.035, 0.45)
# the pump: a smooth, stable rotational tone (G3) with a faint band of air; it does not change speed
pump = 0.5 * per_sine(196) + 0.25 * per_sine(196.5, 1.0) + 0.15 * per_sine(392, 0.4) + 0.2 * per_noise(900, 2200, 31)
add(pump * A_pump, 0.028, 0.1)
# the gas compartment: airy (panned to the gas side in S10)
gas = per_noise(2500, 9000, 41, -0.3)
gpan = np.where((TT >= SCENES['s13_fiber'][0]) & (TT < SCENES['s13_fiber'][1]), -0.5, -0.15)
add(gas * A_gas, 0.022, gpan)
# temperature-control water: a smooth mid-low stream in its own channel (no bubbling)
wat = per_noise(250, 1100, 51, -0.5) * (0.9 + 0.1 * per_lfo(4.25))
add(wat * A_wat, 0.03, 0.35)

# ---------------------------------------------------------------- effects from the picture's cues (tuned, quiet)
def nz(d, lo, hi, a=0.02, r=None): return bp(noise(d), lo, hi) * env(d, a, r=r if r is not None else d * 0.6)
TEXT_SFX = {'label', 'chip'}
SILENT = {'question', 'machine_in', 'pump_whirr', 'water_flow', 'gas_in', 'gas_bed', 'blood_bed', 'quiet_space', 'room'}
def make(name, a, t):
    d = float(a) if isinstance(a, (int, float)) and a else None; k = int(a) if isinstance(a, (int, float)) else 0
    if name == 'fabric': return nz(0.4, 350, 2200, 0.08, 0.25) * 0.6, 0.15, 0
    if name == 'instrument': return S(fm(mf(cn(t, 2, 24)), 0.35, 3.7, 1.2, 9) * 0.5, tick(5200, 0.006) * 0.35), 0.35, 0.1
    if name == 'glass_open': return S(glass(cn(t, 1, 24), 1.0) * 0.6, nz(0.5, 4000, 10000, 0.1, 0.3) * 0.15), 0.5, 0.2
    if name in ('sweep', 'glide', 'push', 'pull', 'capillary', 'matchcut', 'turn'): dd = d or 0.8; return whoosh(dd, name in ('push', 'capillary', 'turn'), 250, 4200) * (0.4 if name != 'sweep' else 0.5), 0.3, 0
    if name == 'reveal': return chime([cn(t, i, 12) for i in range(3)], 1.6, 0.06, glass) * 0.7, 0.6, 0.25
    if name in ('path_out', 'path_back'): dd = d or 1.0; m0 = cn(t, 0, 12); up = 7 if name == 'path_out' else 12; return gl(m0, m0 + up, dd, 0.15, 0.3) * 0.35, 0.5, 0.15
    if name in ('drain_flow', 'res_fluid', 'climb', 'broad_flow'):
        dd = d or 1.5; x = lp(noise(dd), 900 if name != 'climb' else 600) * env(dd, dd * 0.35, r=dd * 0.4)
        if name == 'climb': x = sweep_lp(noise(dd), 300, 1600, 2) * env(dd, 0.4, r=0.6)
        return x * 0.6, 0.25, 0
    if name in ('level', 'level_tick', 'tick_soft', 'select'): return S(tick(2600 if name != 'select' else 3200, 0.012) * 0.5, pop(cn(t, 1, 24), 0.08) * 0.35), 0.3, 0.1
    if name == 'pump_reveal': return S(glass(cn(t, 0, 24), 0.9) * 0.4, nz(0.4, 3000, 9000, 0.05, 0.3) * 0.1), 0.5, 0.15
    if name == 'heat_glide': dd = d or 1.2; m0 = cn(t, 0, 12); return gl(m0, m0 + 7, dd, 0.2, 0.4) * 0.35, 0.5, 0.1
    if name == 'shimmer': x = np.zeros(int(1.2 * SR)); [ins(x, glass(cn(t, i, 24 + 12 * (i // 3)), 0.8) * (0.35 - 0.04 * i), i * 0.07 * SR) for i in range(5)]; return x, 0.6, 0.25
    if name == 'label': return S(pop(cn(t, 2, 24), 0.07) * 0.5, tick(4200, 0.006) * 0.2), 0.3, 0.1
    if name == 'scale_in': return S(bell(cn(t, 2, 24), 1.4, 1.1) * 0.5, glass(cn(t, 0, 36), 0.8) * 0.2), 0.6, 0.3
    if name == 'granular':
        dd = d or 2.0; x = np.zeros(int((dd + 0.4) * SR))
        for i in range(int(dd * 9)): ins(x, pop(pent(int(rng.integers(5, 13))), 0.06) * rng.uniform(0.12, 0.3), rng.uniform(0, dd) * SR)
        return x, 0.4, 0.2
    if name in ('cross', 'cross_out', 'membrane_pass'): m = cn(t, 1 if name == 'cross' else 2, 24); return S(marimba(m, 0.5) * 0.5, glass(m + 12, 0.6) * 0.25), 0.5, 0.25
    if name == 'drift': dd = d or 1.5; return nz(dd, 1500, 6000, dd * 0.4, dd * 0.4) * 0.25, 0.4, 0
    if name == 'dive': dd = d or 0.9; return S(whoosh(dd, True, 300, 6000) * 0.4, gl(cn(t, 0, 12), cn(t, 0, 24), dd, 0.3, 0.2) * 0.2), 0.4, 0
    if name == 'bind':                                      # the payoff: a soft, satisfying contact tone (no strike, no clamp)
        return S(bell(cn(t, 0, 24), 2.2, 1.0) * 0.55, marimba(cn(t, 1, 24), 0.9) * 0.5, glass(cn(t, 2, 36), 1.2) * 0.3, lp(kick(0.5, 0.0), 220) * 0.25), 0.7, 0.35
    if name == 'resolve': dd = d or 2.0; return pad([cn(t, i, 12) for i in range(3)] + [cn(t, 0, 24)], dd, 2400, 0.2, 0.5) * 0.8, 0.7, 0.1
    if name == 'site': m = pent(8 + k); return S(bell(m, 0.9, 1.2) * 0.35, tick(4800, 0.006) * 0.15), 0.5, 0.25
    if name == 'bind_soft': return S(bell(cn(t, 1, 24), 1.4, 1.0) * 0.4, marimba(cn(t, 2, 24), 0.6) * 0.3), 0.6, 0.3
    if name == 'sweep_out': dd = d or 0.6; return sweep_lp(noise(dd), 1200, 7000, 2) * env(dd, 0.05, r=dd * 0.6) * 0.45, 0.4, 0
    if name == 'arrive': return S(bell(cn(t, 0, 12), 1.6, 1.1) * 0.45, glass(cn(t, 2, 24), 0.8) * 0.2), 0.6, 0.25
    if name == 'disperse':
        dd = d or 2.5; x = np.zeros((int((dd + 0.6) * SR)))
        for i in range(10): ins(x, glass(pent(6 + (i * 2) % 7), 0.6) * (0.28 - 0.015 * i), (0.1 + i * dd / 11) * SR)
        return x, 0.6, 0.3
    if name == 'payoff': return S(bell(cn(t, 0, 24), 1.8, 1.1) * 0.4, bell(cn(t, 2, 24), 1.8, 1.1) * 0.3), 0.6, 0.3
    if name == 'inset': return S(pop(cn(t, 2, 24), 0.06) * 0.4, tick(3800, 0.005) * 0.2), 0.3, 0.1
    if name == 'func': m = [72, 76, 79][k % 3]; return S(bell(m, 1.6, 1.1) * 0.55, marimba(m, 0.7) * 0.4, glass(m + 12, 0.8) * 0.15), 0.6, 0.3
    if name == 'settle_or': dd = 1.4; return whoosh(dd, False, 200, 2400) * 0.3, 0.4, 0
    if name == 'drop': return S(pop(cn(t, 0, 24), 0.08) * 0.5, glass(cn(t, 2, 24), 0.5) * 0.2), 0.4, 0.2
    if name == 'step': m = pent(4 + k); return S(marimba(m, 0.5) * 0.5, bell(m + 12, 0.9, 1.2) * 0.22, tick(4200, 0.006) * 0.12), 0.45, 0.3   # a ladder: each step one note higher
    if name == 'chip': m = [72, 76, 79][k % 3]; return S(marimba(m, 0.45) * 0.5, glass(m + 12, 0.5) * 0.18), 0.4, 0.25
    if name == 'puff': return nz(0.35, 2500, 9000, 0.03, 0.25) * 0.5, 0.3, 0
    if name == 'roller': dd = d or 1.2; return S(nz(dd, 200, 1400, dd * 0.3, dd * 0.4) * 0.5, gl(cn(t, 0, 12), cn(t, 0, 12), dd, dd * 0.3, dd * 0.4) * 0.12), 0.3, 0
    raise KeyError(name)
GAIN = {'step': 0.6, 'chip': 0.55, 'drop': 0.5, 'puff': 0.45, 'roller': 0.5, 'bind': 1.2, 'func': 0.62, 'reveal': 0.55, 'resolve': 0.55, 'granular': 0.55, 'disperse': 0.6, 'fabric': 0.7, 'instrument': 0.75, 'label': 0.45,
        'path_out': 0.35, 'path_back': 0.35, 'heat_glide': 0.4, 'climb': 0.6, 'arrive': 0.7, 'scale_in': 0.6}
missing = set(); used = {}
for cu in cuesheet['cues']:
    nm = cu['sfx']
    if nm in SILENT or (NOTEXT and nm in TEXT_SFX): continue
    try: sig, rv, dl = make(nm, cu.get('arg'), cu['t'])
    except KeyError: missing.add(nm); continue
    pk = np.max(np.abs(sig)) + 1e-9
    put('sfx', sig / pk, cu['t'], 0.4 * cu.get('g', 1) * GAIN.get(nm, 0.75), cu.get('pan', 0) * 0.7, rv, dl)
    used[nm] = used.get(nm, 0) + 1
if missing: print('no generator for:', sorted(missing))

# ---------------------------------------------------------------- balance, side-chain, sends
def rms_db(x, t0=None, t1=None):
    seg = x[:, int((t0 or 0) * SR):int((t1 or TOTAL) * SR)]; return 10 * np.log10(np.mean(seg ** 2) + 1e-12)
for k in ('drum', 'bass', 'pad', 'hook', 'lead', 'arp', 'fx'):             # the held breath before the binding
    BUS[k][:, int(BREATH[0] * SR):int(BREATH[1] * SR)] = 0.0
MID = (2 * 11, 2 * 17); LEAD = (B_BIND * BAR, B_BIND * BAR + 8)
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
