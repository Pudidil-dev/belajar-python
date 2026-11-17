"""Score and sound effects, synthesized in code (no samples): an 8-bit RPG lab loop and arcade foley.

Chip voices: band-limited pulse waves (PolyBLEP), a triangle bass, LFSR noise percussion, a short echo and FM bells
(the synth core is shared with the repo's other pixel films). 120 BPM in C major, 16 bars of 4/4 = exactly 32 s. The
square-wave hook (E5 G5 C6 B5 G5 | A5 C6 E6 D6 C6) opens the loop and comes back for the payoff; an item-get fanfare
follows the bright final plip. The last bar's G7 turnaround resolves into the first, and echo and reverb tails wrap
onto the start, so the music loops seamlessly.

Effects sit on the beat grid of engine/timeline.py: the grape "squish", the purple "plip", the flask's spring hop and
thunk, a clunk and a pitched blip as each part of the still drops in, the water rushing in, the x-ray scan, the switch
"click", a soft electric hum (no zap), warm swells as heat soaks in, the "!" blips, the "blub-blub" boil, the bead
"tik", the bright clear "plip", the two-note chime and a sparkle as the drop turns back into the grape. The music
dips under the squeeze, the merge and the final drop so each has room.
"""
import math
import wave
import numpy as np
from . import timeline as T

SR = 48000
NT = int(round(T.TOTAL * SR))
N = NT + 4 * SR
STEP = T.BEAT / 4                 # one 16th = 0.125 s


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def tv(dur):
    return np.arange(max(1, int(round(dur * SR)))) / SR


# ---------------------------------------------------------------- buses
class Bus:
    def __init__(self, lo=-1e9, hi=1e9):
        self.x = np.zeros((2, N))
        self.lo, self.hi = lo, hi

    def put(self, sig, t, gain=1.0, pan=0.0):
        if not (self.lo <= t < self.hi):
            return
        s = int(round(t * SR))
        if s >= N or len(sig) == 0:
            return
        if s < 0:
            sig = sig[-s:]
            s = 0
        sig = sig[:N - s] * gain
        a = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
        self.x[0, s:s + len(sig)] += sig * math.cos(a)
        self.x[1, s:s + len(sig)] += sig * math.sin(a)

    def put_st(self, st, t, gain=1.0):
        s = int(round(t * SR))
        if s >= N:
            return
        st = st[:, :N - s] * gain
        self.x[:, s:s + st.shape[1]] += st


# ---------------------------------------------------------------- oscillators
def _phase(f, n, ph0=0.0):
    f = np.broadcast_to(np.asarray(f, np.float64), (n,))
    inc = f / SR
    ph = (ph0 + np.concatenate([[0.0], np.cumsum(inc[:-1])])) % 1.0
    return ph, inc


def _blep(t, dt):
    out = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    out[m] = x + x - x * x - 1.0
    m = t > 1.0 - dt
    x = (t[m] - 1.0) / dt[m]
    out[m] = x * x + x + x + 1.0
    return out


def pulse(f, n, duty=0.5, ph0=0.0):
    """Band-limited pulse wave (PolyBLEP), DC removed."""
    ph, dt = _phase(f, n, ph0)
    y = np.where(ph < duty, 1.0, -1.0)
    y += _blep(ph, dt)
    y -= _blep((ph - duty) % 1.0, dt)
    return y - (2 * duty - 1)


def tri(f, n, ph0=0.0):
    """NES triangle: 32-step, 4-bit staircase (its gritty buzz is the point)."""
    ph, _ = _phase(f, n, ph0)
    k = np.floor(ph * 32).astype(np.int64)
    v = np.where(k < 16, 15 - k, k - 16)
    return v / 7.5 - 1.0


def sine(f, n, ph0=0.0):
    ph, _ = _phase(f, n, ph0)
    return np.sin(2 * math.pi * ph)


def _lfsr(short):
    reg, out = 1, np.empty(32767)
    tap = 6 if short else 1
    for i in range(32767):
        b = (reg ^ (reg >> tap)) & 1
        reg = (reg >> 1) | (b << 14)
        out[i] = 1.0 if (reg & 1) == 0 else -1.0
    return out


LFSR_LONG, LFSR_SHORT = _lfsr(False), _lfsr(True)


def noise(n, rate=48000.0, short=False, offset=0):
    seq = LFSR_SHORT if short else LFSR_LONG
    idx = (offset + np.floor(np.arange(n) * rate / SR).astype(np.int64)) % len(seq)
    return seq[idx]


def white(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


# ---------------------------------------------------------------- envelopes and filters
def env_adsr(n, a=0.004, d=0.08, s=0.7, r=0.04, gate=None):
    t = np.arange(n) / SR
    gate = n / SR - r if gate is None else gate
    e = np.where(t < a, t / max(a, 1e-5), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-5)))
    rel = np.clip(1 - (t - gate) / max(r, 1e-5), 0, 1)
    return e * np.where(t > gate, rel, 1.0)


def env_exp(n, tau, a=0.001):
    t = np.arange(n) / SR
    return np.minimum(1.0, t / a) * np.exp(-t / tau)


def fftconv(x, h):
    n = len(x) + len(h) - 1
    nfft = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[:n]


def _lp_kernel(fc, taps):
    m = np.arange(taps) - (taps - 1) / 2
    h = np.sinc(2 * fc / SR * m) * np.blackman(taps)
    return h / h.sum()


def lowpass(x, fc, taps=255):
    h = _lp_kernel(fc, taps)
    return fftconv(x, h)[(taps - 1) // 2:(taps - 1) // 2 + len(x)]


def highpass(x, fc, taps=255):
    return x - lowpass(x, fc, taps)


def stft_filter(x, gains, nfft=1024, hop=256):
    """Time-varying filter: gains(times[F,1], freqs[1,B]) -> (F, B) magnitude per STFT frame."""
    n = len(x)
    win = np.hanning(nfft + 1)[:-1]
    xp = np.concatenate([np.zeros(nfft), x, np.zeros(nfft + hop)])
    frames = np.lib.stride_tricks.sliding_window_view(xp, nfft)[::hop]
    F = frames.shape[0]
    X = np.fft.rfft(frames * win, axis=1)
    times = (np.arange(F) * hop + nfft / 2 - nfft) / SR
    freqs = np.fft.rfftfreq(nfft, 1 / SR)
    Y = np.fft.irfft(X * gains(times[:, None], freqs[None, :]), nfft, axis=1) * win
    out = np.zeros(len(xp))
    idx = (np.arange(F) * hop)[:, None] + np.arange(nfft)[None, :]
    np.add.at(out, idx, Y)
    return out[nfft:nfft + n] / ((win ** 2).sum() / hop)


def bandnoise(dur, fc, bw=0.7, seed=0):
    """Noise through a band-pass whose centre follows fc(t) (t in seconds from the start)."""
    x = white(int(round(dur * SR)), seed)

    def g(tt, ff):
        c = np.maximum(fc(np.clip(tt, 0, dur)), 20.0)
        return np.exp(-0.5 * (np.log2(np.maximum(ff, 1.0) / c) / bw) ** 2)
    y = stft_filter(x, g)
    return y / (np.abs(y).max() + 1e-9)


# ---------------------------------------------------------------- instruments
def lead(m, dur, duty=0.25, vib=0.16, vib_delay=0.12, slide_from=None):
    n = int(round((dur + 0.06) * SR))
    t = np.arange(n) / SR
    f = mtof(m) * 2 ** (vib * np.sin(2 * math.pi * 5.6 * t) * np.clip((t - vib_delay) / 0.15, 0, 1) / 12)
    if slide_from is not None:
        f = f * 2 ** ((slide_from - m) * np.exp(-t / 0.018) / 12)
    y = 0.75 * pulse(f, n, duty) + 0.25 * pulse(f * 1.003, n, duty, 0.37)
    return y * env_adsr(n, 0.003, 0.09, 0.72, 0.05, dur)


def chip_arp(m, dur, duty=0.125):
    n = int(round((dur + 0.02) * SR))
    return pulse(mtof(m), n, duty) * env_adsr(n, 0.002, 0.05, 0.45, 0.02, dur)


def bass(m, dur):
    n = int(round((dur + 0.02) * SR))
    return tri(mtof(m), n) * env_adsr(n, 0.002, 0.2, 0.85, 0.015, dur)


def pad(ms, dur, att=0.25):
    n = int(round((dur + 0.3) * SR))
    t = np.arange(n) / SR
    y = np.zeros(n)
    for m in ms:
        y += pulse(mtof(m) * 1.002, n, 0.5) + pulse(mtof(m) * 0.998, n, 0.5, 0.5)
    y = lowpass(y, 1800, 127)
    e = np.minimum(1, t / att) * np.clip((dur + 0.3 - t) / 0.3, 0, 1)
    return y * e / (2 * len(ms))


def bell(m, dur=0.6, idx=2.4, ratio=3.5):
    n = int(round(dur * SR))
    t = np.arange(n) / SR
    f = mtof(m)
    I = idx * np.exp(-t / 0.12)
    y = np.sin(2 * math.pi * f * t + I * np.sin(2 * math.pi * f * ratio * t))
    return y * env_exp(n, dur / 4.0, 0.002)


def kick():
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 46 + 150 * np.exp(-t / 0.03)
    body = np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14)
    click = noise(n, 24000) * np.exp(-t / 0.004) * 0.5
    return np.tanh(1.6 * (body + click))


def snare(vel=1.0):
    n = int(0.26 * SR)
    t = np.arange(n) / SR
    nz = noise(n, 22000, offset=4321) * np.exp(-t / 0.085)
    body = tri(185 * (1 + 0.5 * np.exp(-t / 0.01)), n) * np.exp(-t / 0.045)
    return (0.75 * highpass(nz, 900, 63) + 0.45 * body) * vel


def hat(open_=False, vel=1.0):
    n = int((0.22 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    nz = highpass(noise(n, 48000, offset=999), 6500, 63)
    return nz * np.exp(-t / (0.09 if open_ else 0.016)) * vel


def crash(dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = highpass(noise(n, 48000, offset=777) * 0.6 + noise(n, 30000, True, 55) * 0.4, 3500, 127)
    return nz * np.exp(-t / 0.55) * np.minimum(1, t / 0.002)


def tom(m):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = mtof(m) * (1 + 0.6 * np.exp(-t / 0.02))
    return tri(f, n) * np.exp(-t / 0.12)


# ---------------------------------------------------------------- effects
def echo(x, delay, fb=0.35, damp=3200.0, taps=6):
    """SNES-style echo: repeated, darker, quieter copies (feedback delay with a lowpass in the loop)."""
    d = int(round(delay * SR))
    out = np.zeros_like(x)
    cur = x
    for _ in range(taps):
        cur = np.concatenate([np.zeros(d), cur[:-d]])
        cur = lowpass(cur, damp, 63) * fb
        out += cur
    return out


def reverb(st, seconds=1.2, seed=11):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    out = np.zeros_like(st)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / seconds)
        ir = lowpass(ir, 5200, 63)
        ir[:int(0.012 * SR)] = 0
        ir /= math.sqrt((ir ** 2).sum())
        out[ch] = fftconv(st[ch], ir)[:st.shape[1]]
    return out


def tape_stop(st, t0, dur):
    """Slow the bus to a halt over `dur` seconds from t0 (pitch and speed fall together); silence after."""
    s0, s1 = int(t0 * SR), int((t0 + dur) * SR)
    tau = np.arange(s1 - s0) / SR
    r = (1 - tau / dur) ** 1.4
    pos = s0 + np.cumsum(r) - r[0]
    out = st.copy()
    src = np.arange(st.shape[1])
    fade = np.clip((s1 - s0 - np.arange(s1 - s0)) / (0.04 * SR), 0, 1)
    for ch in range(2):
        out[ch, s0:s1] = np.interp(pos, src, st[ch]) * fade
        out[ch, s1:] = 0
    return out



# ---------------------------------------------------------------- effect building blocks
def blip(f0, f1, dur, duty=0.25):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** np.clip(t / (dur * 0.6), 0, 1)
    return pulse(f, n, duty) * env_exp(n, dur / 3.0, 0.002)


def whoosh(dur, f0, f1, seed, bw=0.8, peak=0.6):
    y = bandnoise(dur, lambda tt: f0 * (f1 / f0) ** (tt / dur), bw, seed)
    t = np.arange(len(y)) / SR
    u = t / dur
    e = np.where(u < peak, (u / peak) ** 2, ((1 - u) / (1 - peak)) ** 1.5)
    return y * e


def glass_ping(f0, dur=0.5, seed=0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for r, a, tau in ((1.0, 1.0, 0.16), (2.76, 0.5, 0.08), (5.4, 0.3, 0.04), (8.93, 0.15, 0.025)):
        y += a * np.sin(2 * math.pi * f0 * r * t) * np.exp(-t / tau)
    y += 0.3 * white(n, seed) * np.exp(-t / 0.002)
    return y / np.abs(y).max()


def thump(f0=150, f1=48, dur=0.35, click=0.6, seed=0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    body = np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t / (dur / 3.5))
    nz = lowpass(white(n, seed), 900, 63) * np.exp(-t / 0.03)
    ck = highpass(white(n, seed + 1), 2500, 63) * np.exp(-t / 0.003) * click
    y = body + 0.5 * nz / (np.abs(nz).max() + 1e-9) + ck
    return np.tanh(1.3 * y)


def click(seed=0, f=2400, dur=0.03):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return highpass(white(n, seed), f, 63) * np.exp(-t / 0.004) + 0.3 * np.sin(2 * math.pi * f * 0.75 * t) * np.exp(
        -t / 0.008)


def beep(f, dur, duty=0.5):
    n = int(dur * SR)
    e = np.ones(n)
    k = int(0.004 * SR)
    e[:k] = np.linspace(0, 1, k)
    e[-k:] = np.linspace(1, 0, k)
    return pulse(f, n, duty) * e


def boing(f=180, dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fr = f * (1 + 0.25 * np.sin(2 * math.pi * 14 * t) * np.exp(-t / 0.12))
    return tri(fr, n) * np.exp(-t / 0.1)


# ---------------------------------------------------------------- loudness and master
_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def _biquad_mag(b, a, f):
    z = np.exp(-2j * math.pi * f / SR)
    return np.abs((b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z))


def lufs(st):
    """Integrated loudness (ITU-R BS.1770: K-weighting applied in the frequency domain, gated 400 ms blocks)."""
    n = st.shape[1]
    nfft = 1 << (n - 1).bit_length()
    f = np.fft.rfftfreq(nfft, 1 / SR)
    g = _biquad_mag(*_K1, f) * _biquad_mag(*_K2, f)
    y = np.fft.irfft(np.fft.rfft(st, nfft, axis=1) * g, nfft, axis=1)[:, :n]
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = []
    for s in range(0, n - blk, hop):
        ms.append((y[:, s:s + blk] ** 2).mean(1).sum())
    ms = np.array(ms)
    ld = -0.691 + 10 * np.log10(ms + 1e-12)
    g1 = ms[ld > -70]
    rel = -0.691 + 10 * np.log10(g1.mean()) - 10
    g2 = ms[(ld > -70) & (ld > rel)]
    return -0.691 + 10 * np.log10(g2.mean())


def true_peak(st):
    n = st.shape[1]
    up = np.fft.irfft(np.fft.rfft(st, axis=1), n * 4, axis=1) * 4
    return 20 * math.log10(np.abs(up).max() + 1e-12)


def limiter(st, ceiling_db=-1.2, win=0.003):
    c = 10 ** (ceiling_db / 20)
    peak = np.abs(st).max(0)
    g = np.minimum(1.0, c / np.maximum(peak, 1e-9))
    w = int(win * SR)
    m = g.copy()
    s = 1
    while s < w:                                   # running minimum over +-w samples (doubling)
        m = np.minimum(m, np.concatenate([m[s:], np.ones(s)]))
        m = np.minimum(m, np.concatenate([np.ones(s), m[:-s]]))
        s *= 2
    k = w // 2 * 2 + 1
    cs = np.concatenate([[0], np.cumsum(m)])
    sm = np.ones_like(m)
    h = k // 2
    sm[h:len(m) - h] = (cs[k:] - cs[:-k]) / k
    return st * sm[None, :]


def write_wav(path, st):
    x = np.clip(st, -1, 1)
    pcm = (x.T * 32767).round().astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())






# ---------------------------------------------------------------- the score (C major, 16 bars, loops)
_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def nm(s):
    """'E5' -> 76, 'F#4' -> 66."""
    return 12 * (int(s[-1]) + 1) + _PC[s[0]] + s[1:-1].count('#') - s[1:-1].count('b')


def seq(s):
    """One bar as 16 tokens, one per 16th note: a note name starts a note, '-' holds it, '.' rests.
    Returns [(step, length in 16ths, midi)]."""
    tk = s.split()
    assert len(tk) == 16, s
    out = []
    for i, x in enumerate(tk):
        if x in ('-', '.'):
            continue
        n = 1
        while i + n < 16 and tk[i + n] == '-':
            n += 1
        out.append((i, n, nm(x)))
    return out


LEAD = {
    0: seq('E5 -  .  .  G5 -  C6 -  B5 -  -  G5 -  -  .  G5'),    # gaps for the squish (0.3) and the plip (1.75)
    1: seq('A5 -  C6 -  E6 -  -  D6 C6 -  -  -  .  .  G5 A5'),    # the hop: held in the air, silent on the landing
    2: seq('C6 .  .  .  G5 .  .  .  D6 .  .  .  B5 C6 D6 B5'),    # build: a stab as each part drops in
    3: seq('C6 -  -  -  A5 -  C6 -  D6 -  -  -  .  .  .  .'),    # the water runs; the push onto the heater
    4: seq('.  .  E5 .  A5 .  C6 .  .  .  B5 -  -  -  .  .'),    # x-ray: a quiet minor figure; the switch at 9.0
    5: seq('C6 .  C6 .  F6 .  E6 .  D6 .  D6 .  G6 .  F6 E6'),    # current, the coil heats: pulsing staccato
    6: seq('E6 .  E6 C6 .  A5 .  C6 .  .  F6 .  E6 .  C6 .'),    # the boil: staccato and bubbly
    7: seq('G5 .  C6 .  E6 .  G6 .  .  .  B5 .  D6 .  G6 .'),    # climbing with the vapour
    8: seq('C6 -  -  -  E6 -  -  -  G6 -  -  -  -  -  .  .'),    # into the condenser
    9: seq('A6 -  -  F6 -  -  D6 -  B5 -  -  D6 -  -  G5 -'),    # the cutaway: the line runs downhill like the vapour
    10: seq('B5 -  -  -  -  -  G5 -  C6 -  -  -  -  -  E6 -'),   # heat: warm and held
    11: seq('C6 -  -  -  -  -  -  -  D6 -  -  -  .  .  .  .'),   # beads; silence for the merge (23.75)
    12: seq('.  .  .  .  A5 -  G5 -  F5 -  E5 -  D5 -  -  -'),   # the pause, then downhill with the drop
    13: seq('.  .  G5 C6 E6 G6 -  C7 -  -  -  G6 A6 B6 -  -'),   # item-get fanfare after the plip (26.0)
    14: seq('E5 -  G5 -  C6 -  -  -  B5 -  G5 -  .  .  .  .'),   # the payoff; the chime (29.5) answers
    15: seq('A5 -  C6 -  E6 -  -  D6 C6 -  B5 -  G5 -  F5 -'),   # G7 turnaround: the F resolves to bar 0's E
}
B_BUILD, B_WATER, B_XRAY, B_ELEC, B_BOIL, B_CLIMB, B_PATHS = 2, 3, 4, 5, (6, 7), 8, 9
B_HEAT, B_BEADS, B_MERGE, B_ITEM, B_PAYOFF, B_TURN = 10, 11, 12, 13, 14, 15
SOFT_BARS = (B_XRAY, B_PATHS, B_HEAT, B_BEADS, B_MERGE)
STACCATO = (B_ELEC,) + B_BOIL
_THIRD = {0: 3, 2: 3, 4: 4, 5: 3, 7: 3, 9: 4, 11: 4}                      # C major: a diatonic third below


def third_below(m):
    return m - _THIRD[m % 12]


HARM = {b: [(s, l, third_below(m)) for s, l, m in LEAD[b]] for b in (B_BUILD, B_ITEM, B_PAYOFF, B_TURN)}
CHORD = {'C': (48, (0, 4, 7)), 'G': (43, (0, 4, 7)), 'Am': (45, (0, 3, 7)), 'F': (41, (0, 4, 7)),
         'Dm': (50, (0, 3, 7)), 'Em': (40, (0, 3, 7)), 'G7': (43, (0, 4, 7, 10))}
BARS = [('C', 'G'), ('Am', 'F'), ('C', 'G'), ('F', 'G'), ('Am', 'Em'), ('F', 'G'), ('Am', 'F'), ('C', 'G'),
        ('C', 'G'), ('Dm', 'G'), ('Em', 'Am'), ('F', 'G'), ('Am', 'Dm'), ('C', 'G'), ('C', 'G'), ('F', 'G7')]
N_BARS = len(BARS)
assert N_BARS * T.BAR == T.TOTAL


def bar_t(b, step=0.0):
    return b * T.BAR + step * STEP


def _bass_notes(b, half, root):
    base = 8 * half
    bounce = [(base + 2 * k, 1.6, root + iv, 0.28) for k, iv in enumerate((0, 12, 7, 12))]
    drive = [(base + st, 0.8, root + iv, 0.3 if st in (0, 4) else 0.2)
             for st, iv in ((0, 0), (2, 0), (3, 12), (4, 0), (6, 7), (7, 12))]
    soft = [(base, 3.6, root, 0.26), (base + 4, 1.6, root + 7, 0.2), (base + 6, 1.6, root + 12, 0.2)]
    if b in (0, 1, B_CLIMB, B_PAYOFF) or (b == B_TURN and half == 0):
        notes = bounce
        if b == 0:
            notes = [n for n in notes if n[0] not in (2, 14)]               # room for the squish and the plip
        if b == 1:
            notes = [n for n in notes if n[0] != 12]                        # the landing thunk
        return notes
    if b == B_BUILD or b in B_BOIL:
        return drive
    if b == B_WATER:
        return soft if half == 0 else [(8, 3.6, root, 0.28), (12, 3.6, root + 12, 0.18)]
    if b == B_XRAY:
        return [(base, 7.0, root, 0.24)]
    if b == B_ELEC:                                                         # current: a pulsing 8th-note bass
        return [(base + k, 0.7, root + (12 if k % 4 == 2 else 0), 0.26 if k % 2 == 0 else 0.15) for k in range(8)]
    if b == B_PATHS:
        return [(base, 2.0, root, 0.27), (base + 3, 1.5, root + 7, 0.2), (base + 6, 1.5, root + 12, 0.2)]
    if b == B_HEAT:
        return soft
    if b == B_BEADS:
        return soft if half == 0 else [(8, 3.6, root, 0.26), (12, 1.4, root + 7, 0.2)]   # quiet before the merge
    if b == B_MERGE:                                                        # the pause, then walking down
        return [] if half == 0 else [(4, 1.7, 45, 0.26), (6, 1.7, 43, 0.26), (8, 1.7, 41, 0.26),
                                     (10, 1.7, 40, 0.26), (12, 3.6, 38, 0.25)]
    if b == B_ITEM:
        return [(2, 1.6, 48, 0.28), (4, 1.6, 55, 0.26), (6, 1.6, 60, 0.26)] if half == 0 else \
            [(8, 1.6, 43, 0.28), (10, 1.6, 47, 0.28), (12, 1.6, 50, 0.28), (14, 1.6, 55, 0.26)]
    if b == B_TURN:                                                         # G7 arpeggio up into the top of the loop
        return [(8, 1.6, 43, 0.28), (10, 1.6, 47, 0.28), (12, 1.6, 50, 0.28), (14, 1.6, 53, 0.28)]
    return bounce


def music():
    lead_bus, harm_bus, arp_bus, bass_bus, drum_bus, pad_bus = (Bus() for _ in range(6))
    for b, notes in LEAD.items():
        for s, l, m in notes:
            t0 = bar_t(b, s)
            dur = l * STEP * (0.9 if l <= 2 else 0.96)
            if b in STACCATO:
                lead_bus.put(lead(m, STEP * 0.7, 0.125, vib=0.0), t0, 0.17, 0.12 * (1 if s % 4 else -1))
            elif b == B_PATHS:                     # pans left to right: downhill, flask side to receiver side
                lead_bus.put(lead(m, dur, 0.5, vib=0.14), t0, 0.15, -0.5 + s / 15.0)
            elif b in SOFT_BARS:
                lead_bus.put(lead(m, dur, 0.5, vib=0.14), t0, 0.14, 0.05)
            elif b == B_ITEM:
                lead_bus.put(lead(m, dur, 0.25, vib=0.2), t0, 0.2, 0.05)
            else:
                lead_bus.put(lead(m, dur, 0.25), t0, 0.19, 0.05)
    for b, notes in HARM.items():
        for s, l, m in notes:
            harm_bus.put(lead(m, l * STEP * 0.9, 0.125, vib=0.1), bar_t(b, s), 0.085, -0.3)
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            for st, l, m, g in _bass_notes(b, half, CHORD[name][0]):
                bass_bus.put(bass(m, l * STEP), bar_t(b, st), g)
    # arpeggios (pulse 12.5% / 25%)
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root, iv = CHORD[name]
            base = 8 * half
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            if b in (B_BUILD, B_CLIMB, B_PAYOFF) + B_BOIL or (b == B_TURN and half == 0):
                for k, p in enumerate((0, 1, 2, 3, 2, 1, 2, 3)):
                    arp_bus.put(chip_arp(tones[p], STEP * 0.85), bar_t(b, base + k), 0.05, -0.5)
            elif b in (0, 1, B_WATER):
                for k in range(4):
                    st = base + 2 * k
                    if (b == 0 and st in (2, 14)) or (b == 1 and st == 12):
                        continue
                    arp_bus.put(chip_arp(tones[k], STEP * 1.6, 0.25), bar_t(b, st), 0.035, -0.45)
            elif b == B_XRAY:                      # slow, high and wide: something hidden is being revealed
                for k in range(2):
                    arp_bus.put(chip_arp(tones[(k * 2 + half) % 4] + 12, STEP * 3.4, 0.25), bar_t(b, base + 4 * k),
                                0.03, -0.6 if k == 0 else 0.6)
            elif b == B_ELEC:                      # current: a buzzing 16th figure that climbs
                for k, p in enumerate((0, 1, 2, 3, 1, 2, 3, 3)):
                    arp_bus.put(chip_arp(tones[p] + (12 if k >= 6 else 0), STEP * 0.6), bar_t(b, base + k), 0.045,
                                -0.4 + 0.1 * k)
            elif b == B_PATHS:                     # runs uphill, right to left, like the cooling water
                up = [root + 12 + o + i for o in (0, 12, 24) for i in iv[:3]][:8]
                for k, m in enumerate(up):
                    arp_bus.put(chip_arp(m, STEP * 0.85, 0.25), bar_t(b, base + k), 0.04, 0.5 - k / 7.0)
            elif b in (B_HEAT, B_BEADS):
                for k in range(4):
                    st = base + 2 * k
                    if b == B_BEADS and st >= 12:
                        continue
                    arp_bus.put(chip_arp(tones[k] + 12, STEP * 1.6, 0.25), bar_t(b, st), 0.03, -0.45)
            elif b == B_ITEM:                      # bright sparkle under the fanfare
                for k, p in enumerate((0, 1, 2, 3, 1, 2, 3, 3)):
                    if base + k < 2:
                        continue
                    arp_bus.put(chip_arp(tones[p] + 12, STEP * 0.8), bar_t(b, base + k), 0.035, 0.4)
            elif b == B_TURN and half == 1:
                for k, p in enumerate((0, 1, 2, 3, 0, 1, 2, 3)):
                    arp_bus.put(chip_arp(tones[p] + (12 if k >= 4 else 0), STEP * 0.85), bar_t(b, 8 + k), 0.05, -0.5)
    # pads under the x-ray and the slow middle (the cutaway, heat, beads, the merge)
    for b in SOFT_BARS:
        for half in (0, 1):
            root, iv = CHORD[BARS[b][half]]
            ms = [root + 24 + i for i in iv[:3]]
            if b == B_BEADS and half == 1:
                pad_bus.put(pad(ms, 0.6, 0.15), bar_t(b, 8), 0.04)              # out before the merge
            elif b == B_MERGE and half == 0:
                pad_bus.put(pad(ms, 0.55, 0.2), bar_t(b, 3), 0.04)              # in after the pause
            else:
                pad_bus.put(pad(ms, 0.95, 0.15), bar_t(b, 8 * half), 0.045)
    # drums: a light kit, a crash at the big moments
    K, S, Hc, Ho, C = kick(), snare(), hat(False), hat(True), crash()
    for b in range(N_BARS):
        t0 = bar_t(b)
        if b in (0, B_BUILD, 6, B_PAYOFF):
            drum_bus.put(C, t0, 0.14, 0.25)
        if b in (0, 1, B_CLIMB, B_PAYOFF, B_TURN):
            kicks, snares = [0, 8, 10], [4, 12]
            if b == 0:
                snares = [12]                      # the squish owns beat 2
            if b == 1:
                snares = [4]                       # the landing owns beat 4
            if b == B_PAYOFF:
                snares = [4]                       # the chime owns beat 4
            if b == B_TURN:
                snares = [4]
            for k in kicks:
                drum_bus.put(K, t0 + k * STEP, 0.4)
            for k in snares:
                drum_bus.put(S, t0 + k * STEP, 0.22, 0.08)
            for k in range(0, 16, 2):
                if (b == 0 and k in (2, 14)) or (b == 1 and k == 12) or (b == B_TURN and k >= 12):
                    continue
                drum_bus.put(Hc, t0 + k * STEP, 0.09 if k % 4 == 2 else 0.045, 0.3)
            if b == 1:
                drum_bus.put(Ho, t0 + 14 * STEP, 0.06, 0.3)
            if b == B_TURN:                        # a tom fill back into the top of the loop
                for i, m in enumerate((57, 55, 52, 48)):
                    drum_bus.put(tom(m), t0 + (12 + i) * STEP, 0.22, 0.4 - 0.25 * i)
        elif b == B_BUILD:                         # a kick as each part drops in
            for k in (0, 4, 8):
                drum_bus.put(K, t0 + k * STEP, 0.42)
            drum_bus.put(S, t0 + 12 * STEP, 0.22, 0.08)
            for k in range(0, 16, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.08 if k % 4 == 2 else 0.04, 0.3)
        elif b == B_WATER:
            drum_bus.put(K, t0, 0.36)
            drum_bus.put(K, t0 + 8 * STEP, 0.36)
            drum_bus.put(S, t0 + 4 * STEP, 0.15, 0.08)
            for k in range(0, 8, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.05 if k % 4 == 2 else 0.03, 0.3)
        elif b == B_XRAY:
            drum_bus.put(K, t0, 0.3)
            drum_bus.put(K, t0 + 8 * STEP, 0.3)
            for k in range(0, 16, 4):
                drum_bus.put(Hc, t0 + (k + 2) * STEP, 0.03, 0.3)
        elif b == B_ELEC:                          # building toward the boil
            for k in (0, 4, 8, 12):
                drum_bus.put(K, t0 + k * STEP, 0.3 + 0.03 * k / 4)
            for k in range(16):
                drum_bus.put(Hc, t0 + k * STEP, 0.02 + 0.06 * k / 15, 0.3)
            for i, k in enumerate((12, 13, 14, 15)):
                drum_bus.put(S, t0 + k * STEP, 0.08 + 0.05 * i, 0.08)
        elif b in B_BOIL:                          # four on the floor, 16th hats
            for k in (0, 4, 8, 12):
                drum_bus.put(K, t0 + k * STEP, 0.4)
            for k in (4, 12):
                drum_bus.put(S, t0 + k * STEP, 0.2, 0.08)
            for k in range(16):
                drum_bus.put(Hc, t0 + k * STEP, 0.09 if k % 4 == 2 else 0.04, 0.3)
        elif b == B_PATHS:                         # half time
            drum_bus.put(K, t0, 0.36)
            drum_bus.put(K, t0 + 6 * STEP, 0.22)
            drum_bus.put(S, t0 + 8 * STEP, 0.17, 0.08)
            for k in range(0, 16, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.05 if k % 4 == 2 else 0.03, 0.3)
        elif b in (B_HEAT, B_BEADS):
            drum_bus.put(K, t0, 0.32)
            if b == B_HEAT:
                drum_bus.put(K, t0 + 8 * STEP, 0.24)
            for k in range(0, 12 if b == B_BEADS else 16, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.035 if k % 4 == 2 else 0.02, 0.3)
        elif b == B_MERGE:                         # silent through the pause, soft ticks while the drop moves
            for k in (4, 6, 8, 10, 12, 14):
                drum_bus.put(Hc, t0 + k * STEP, 0.025, 0.3)
        elif b == B_ITEM:                          # nothing on the plip; the fanfare gets a crash and a groove
            drum_bus.put(C, t0 + 2 * STEP, 0.13, -0.25)
            for k in (2, 8, 10):
                drum_bus.put(K, t0 + k * STEP, 0.38)
            drum_bus.put(S, t0 + 12 * STEP, 0.2, 0.08)
            for k in range(2, 16, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.07 if k % 4 == 2 else 0.04, 0.3)
    lead_st = lead_bus.x + harm_bus.x
    dl = np.stack([echo(lead_st.sum(0) * 0.5, 0.375, 0.3), echo(lead_st.sum(0) * 0.5, 0.25, 0.28)])
    mus = lead_st + 0.4 * dl + arp_bus.x + bass_bus.x + drum_bus.x + pad_bus.x
    mus = mus + 0.15 * reverb(mus - 0.9 * bass_bus.x - 0.6 * drum_bus.x)
    return wrap(mus)


def wrap(st):
    """The loop: whatever rings past the end is folded back onto the start."""
    tail = st[:, NT:]
    out = st[:, :NT].copy()
    out[:, :tail.shape[1]] += tail
    return out


# ---------------------------------------------------------------- sound effects
def put_pan(bus, sig, t, gain, p0, p1):
    """Place a mono effect whose pan glides from p0 to p1 (-1 left .. +1 right)."""
    p = np.linspace(p0, p1, len(sig))
    a = (np.clip(p, -1, 1) + 1) * math.pi / 4
    bus.put_st(np.stack([sig * np.cos(a), sig * np.sin(a)]), t, gain)


def fade(sig, a=0.02, r=0.05):
    n = len(sig)
    x = np.arange(n) / SR
    return sig * np.clip(x / max(a, 1e-4), 0, 1) * np.clip((n / SR - x) / max(r, 1e-4), 0, 1)


def plip(f0, f1, dur=0.18, body=0.0, splash=0.25, seed=0):
    """A drop landing in liquid: a resonant bloop whose pitch jumps up (the ringing bubble), a chip copy for the 8-bit
    edge, a tiny splash on the attack and, for thick juice, a low body."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.022))
    att = np.minimum(1, t / 0.0015)
    y = np.sin(2 * math.pi * np.cumsum(f) / SR) * att * np.exp(-t / (dur / 4.5))
    y += 0.3 * pulse(f, n, 0.5) * att * np.exp(-t / (dur / 7))
    y += splash * highpass(white(n, seed), 3000, 63) * np.exp(-t / 0.006)
    if body:
        y += body * np.sin(2 * math.pi * np.cumsum(150 - 70 * t / dur) / SR) * att * np.exp(-t / (dur / 3))
    return y / (np.abs(y).max() + 1e-9)


def squish(seed=3):
    """The grape bursts: a wet squelch (a falling, gritty band of noise) and a chip 'blorp' sliding down."""
    dur = 0.28
    n = int(dur * SR)
    t = np.arange(n) / SR
    wet = bandnoise(dur, lambda tt: 2400 * 0.22 ** np.clip(tt / 0.18, 0, 1), 0.5, seed)
    grit = 0.7 + 0.3 * np.sign(np.sin(2 * math.pi * 38 * t + 2 * np.sin(2 * math.pi * 9 * t)))
    wet = wet * grit * np.minimum(1, t / 0.004) * np.exp(-t / 0.075)
    f = 400 * 0.3 ** np.clip(t / 0.16, 0, 1)
    blorp = lowpass(pulse(f, n, 0.25), 2400, 63) * np.minimum(1, t / 0.003) * np.exp(-t / 0.06)
    return 0.75 * wet + 0.55 * blorp


def blub(f0, dur=0.09):
    """One bubble bursting at the surface: a short tone whose pitch rises (the bubble chirp), with a chip edge."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 1.6 * t / dur)
    y = np.sin(2 * math.pi * np.cumsum(f) / SR) + 0.25 * pulse(f, n, 0.5)
    return y * np.minimum(1, t / 0.002) * np.exp(-t / (dur / 3.5))


def burble(dur, rate=18.0, seed=0, f_lo=520.0, f_hi=1300.0):
    """Water running through the condenser jacket: tiny bubble chirps at random times over a soft low rush."""
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    y = np.zeros(n + SR)
    for _ in range(int(dur * rate)):
        s = int(rng.uniform(0, dur) * SR)
        b = blub(rng.uniform(f_lo, f_hi), rng.uniform(0.03, 0.07)) * rng.uniform(0.3, 1.0)
        y[s:s + len(b)] += b
    y = y[:n] / (np.abs(y[:n]).max() + 1e-9)
    rush = lowpass(white(n, seed + 1), 650, 127)
    return 0.6 * y + 0.35 * rush / (np.abs(rush).max() + 1e-9)


def warm_tone(m, dur=0.7):
    """The heat cue's sound: a soft, warm swell (sine and a little triangle), no attack transient, no zap."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(m) * 2 ** (-0.5 * (t / dur) / 12)
    y = 0.65 * sine(f, n) + 0.15 * tri(f, n) + 0.2 * sine(2 * f, n)
    return lowpass(y * np.sin(math.pi * np.clip(t / dur, 0, 1)) ** 2, 2200, 63)


def glide(f0, f1, dur, vib=0.0, duty=None):
    """A smooth pitch glide (sine, or a pulse when duty is given), faded at both ends."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur) * (1 + vib * np.sin(2 * math.pi * 7 * t))
    y = sine(f, n) if duty is None else pulse(f, n, duty)
    return fade(y, 0.03, 0.08)


def ticks(bus, t0, t1, n, gain, f=3200.0, pan=0.25, accel=2.0):
    """A clock running fast: n ticks from t0 to t1, closer and closer together."""
    for i in range(n):
        x = i / max(1, n - 1)
        tt = t0 + (t1 - t0) * (1 - (1 - x) ** accel)
        bus.put(click(80 + i, f + 400 * x, 0.02), tt, gain * (0.7 + 0.3 * x), pan)


def boil_level(t):
    """How loud the boil is: up as the bubbles start, full on the surface (micro-shot A), softer as the camera leaves."""
    pts = [(T.BOIL, 0.0), (T.BOIL + 0.3, 0.6), (T.SURFACE[1], 1.0), (T.TILT[0], 1.0), (T.TRACK[0], 0.35),
           (T.PATHS[0], 0.14), (T.COMPARE[0], 0.12), (T.COMPARE[1], 0.3), (T.LOOP_PUSH[0], 0.3),
           (T.LOOP_PUSH[0] + 0.5, 0.0)]
    xs, ys = zip(*pts)
    return float(np.interp(t, xs, ys, left=0.0, right=0.0))


def spring(f0=180.0, f1=560.0, dur=0.2):
    """A cartoon spring: a triangle wave whose pitch shoots up with a wobble (the flask's hop)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** np.clip(t / (dur * 0.7), 0, 1) * (1 + 0.08 * np.sin(2 * math.pi * 28 * t))
    return tri(f, n) * np.minimum(1, t / 0.004) * np.exp(-t / (dur / 2.5))


def sfx_forward():
    from . import rig
    bus = Bus()
    rng = np.random.default_rng(9)
    # A. grape to flask: a glint, the squish, a trickle, the purple plip, the pour filling up (fast-forward ticks)
    bus.put(bell(100, 0.35, 0.9, 2.0), 0.03, 0.03, 0.1)
    bus.put(blip(3136.0, 4186.0, 0.05, 0.5), 0.05, 0.02, 0.1)
    bus.put(squish(), T.SQUASH[0] + 0.01, 0.42)
    bus.put(click(5, 3800, 0.012), T.SQUASH[0] + 0.08, 0.08)
    tr_d = T.PLIP1 - T.STREAM0
    tr = bandnoise(tr_d, lambda tt: 1500 + 300 * np.sin(2 * math.pi * 3 * tt), 0.45, 6)
    bus.put(fade(tr, 0.08, 0.04), T.STREAM0, 0.035)
    bus.put(plip(330, 820, 0.24, body=0.5, splash=0.2, seed=7), T.PLIP1, 0.34)
    fill_d = T.POUR[1] - T.PLIP1
    fl = bandnoise(fill_d, lambda tt: 380 * (900 / 380) ** np.clip(tt / fill_d, 0, 1), 0.35, 8)
    bus.put(fade(fl, 0.06, 0.15), T.PLIP1 + 0.05, 0.05)
    for i, tt in enumerate((2.0, 2.25, 2.5)):
        bus.put(plip(rng.uniform(380, 480), 900, 0.12, 0.3, 0.1, 20 + i), tt, 0.1 * (1 - 0.2 * i))
    for span in T.FAST_FORWARD:
        ticks(bus, span[0], span[1] - 0.05, 9, 0.025)
    # B. the hop: a spring, a whoosh in the air, a soft thunk on the heater with a puff
    bus.put(spring(), T.HOP[0], 0.09, -0.2)
    bus.put(whoosh(T.HOP_LAND - T.HOP[0] - 0.08, 600, 1600, 11, 0.8, 0.45), T.HOP[0] + 0.08, 0.05, 0.0)
    bus.put(thump(130, 55, 0.3, 0.3, 12), T.HOP_LAND, 0.2)
    bus.put(glass_ping(2093, 0.25, 13), T.HOP_LAND + 0.005, 0.04)
    pf = bandnoise(0.25, lambda tt: 900 - 500 * tt / 0.25, 0.7, 14)
    bus.put(pf * env_exp(len(pf), 0.06, 0.004), T.HOP_LAND, 0.05)
    bus.put(whoosh(T.NECK_PUSH[1] - T.NECK_PUSH[0], 900, 2600, 15, 0.7, 0.9), T.NECK_PUSH[0], 0.05)
    # the still is built: each part whistles down and lands with a clunk and a pitched "placed!" blip
    for i, (t0, m, ping) in enumerate(((T.PART_HEAD, 72, 3136), (T.PART_COND, 76, 1568), (T.PART_RECV, 79, 2637))):
        bus.put(glide(1300, 700, 0.28, 0.0, 0.25), t0 - 0.12, 0.012, -0.2 + 0.25 * i)
        land = t0 + 0.18
        bus.put(thump(170, 70, 0.2, 0.5, 16 + i), land, 0.14, -0.2 + 0.25 * i)
        bus.put(glass_ping(ping, 0.3, 19 + i), land + 0.004, 0.05, -0.2 + 0.25 * i)
        bus.put(blip(mtof(m + 12), mtof(m + 24), 0.07, 0.5), land + 0.02, 0.03, -0.2 + 0.25 * i)
    # the cooling water runs in from the lower port before any heat
    gush = bandnoise(0.7, lambda tt: 500 + 900 * np.clip(tt / 0.7, 0, 1), 0.6, 22)
    bus.put(fade(gush, 0.05, 0.3), T.WATER_ON, 0.05, 0.45)
    bus.put(fade(burble(2.2, 14, 23), 0.3, 0.6), T.WATER_ON, 0.03, 0.45)
    # C. the heater x-ray: push in, a scan beep sweeping down, the switch, the current hum, the warm-up
    bus.put(whoosh(T.HEATER_PUSH[1] - T.HEATER_PUSH[0], 1800, 700, 24, 0.8, 0.4), T.HEATER_PUSH[0], 0.06)
    xd = T.XRAY_ON[1] - T.XRAY_ON[0]
    xn = int(xd * SR)
    xx = np.arange(xn) / SR
    scan = pulse(1400 * (0.35 ** (xx / xd)), xn, 0.125) * np.sin(math.pi * np.clip(xx / xd, 0, 1)) ** 2
    bus.put(lowpass(scan, 3500, 63), T.XRAY_ON[0], 0.035, -0.2)
    bus.put(bandnoise(xd, lambda tt: 5000 - 3000 * tt / xd, 0.5, 25) * np.sin(math.pi * xx / xd) ** 2,
            T.XRAY_ON[0], 0.03, 0.2)
    od = T.XRAY_OFF[1] - T.XRAY_OFF[0]
    on_ = int(od * SR)
    ox = np.arange(on_) / SR
    bus.put(lowpass(pulse(500 * (2.8 ** (ox / od)), on_, 0.125) * np.sin(math.pi * ox / od) ** 2, 3500, 63),
            T.XRAY_OFF[0], 0.025, 0.2)
    bus.put(click(26, 2200, 0.03), T.SWITCH, 0.24, -0.35)
    bus.put(thump(220, 90, 0.12, 0.6, 27), T.SWITCH, 0.1, -0.35)
    bus.put(beep(1568.0, 0.06, 0.25), T.SWITCH + 0.03, 0.03, 0.35)                   # the red indicator
    hd = T.HEAT_IN[1] + 0.4 - T.SWITCH
    hn = int(hd * SR)
    xh = np.arange(hn) / SR
    grow = np.clip((xh - (T.GLOW[0] - T.SWITCH)) / (T.GLOW[1] - T.GLOW[0]), 0.25, 1.0)
    hum = (0.6 * tri(98, hn) + 0.4 * sine(196, hn)) * grow * np.clip(xh / 0.2, 0, 1) * np.clip((hd - xh) / 0.4, 0, 1)
    bus.put(lowpass(hum, 900, 63), T.SWITCH, 0.035, -0.2)                            # electric hum, no zap
    bus.put(glide(220, 330, T.GLOW[1] - T.GLOW[0]), T.GLOW[0], 0.02, 0.0)            # the coil warms up
    k = 0
    while T.HEAT_IN[0] + 0.75 * k < T.HEAT_IN[1]:                                     # heat soaking in, wave by wave
        bus.put(warm_tone(64 + (0, 3, 7)[k % 3], 0.7), T.HEAT_IN[0] + 0.75 * k, 0.045, 0.0)
        k += 1
    bus.put(blip(mtof(84), mtof(96), 0.06, 0.25), T.BOIL, 0.05, 0.4)                 # the "!": bwip-bwip
    bus.put(blip(mtof(91), mtof(103), 0.06, 0.25), T.BOIL + 0.08, 0.05, 0.4)
    # the boil: rhythmic blub-blub on the 16th grid, loud on the surface, softer as the camera leaves
    t = T.BOIL
    k = int(round(T.BOIL / STEP))
    while t < T.LOOP_PUSH[0] + 0.5:
        lv = boil_level(t)
        if lv > 0.01 and k % 4 in (0, 1, 3):
            big = k % 16 == 0
            f0 = rng.uniform(170, 230) if big else rng.uniform(260, 520)
            bus.put(blub(f0, 0.14 if big else 0.09), t + rng.uniform(0, 0.012), 0.16 * lv * (1.25 if big else 1.0),
                    float(rng.uniform(-0.45, -0.15)))
        k += 1
        t = k * STEP
    for _ in range(90):
        tt = rng.uniform(T.BOIL, T.LOOP_PUSH[0])
        lv = boil_level(tt)
        if lv > 0.05:
            bus.put(blub(rng.uniform(450, 900), 0.05), tt, 0.06 * lv, float(rng.uniform(-0.5, -0.1)))
    # D. the vapour: a soft hiss that climbs with the camera, then a bright slice into the cutaway
    vd = T.CUT_ON[1] - T.SURFACE[0]
    vh = bandnoise(vd, lambda tt: 5200 + 2400 * np.clip((tt - 2.5) / 2.5, 0, 1), 0.5, 28)
    vl = np.interp(np.arange(len(vh)) / SR, [0, 0.6, 2.5, vd - 0.4, vd - 0.2, vd], [0, 0.5, 0.6, 1.0, 1.0, 0.0])
    put_pan(bus, vh * vl, T.SURFACE[0], 0.03, -0.4, 0.1)
    bus.put(whoosh(T.CUT_ON[1] - T.CUT_ON[0], 2500, 7000, 29, 0.5, 0.8), T.CUT_ON[0], 0.05, 0.1)
    bus.put(glass_ping(3520, 0.3, 30), T.CUT_ON[1], 0.04, 0.2)
    # E. two paths: water uphill (right to left), vapour downhill (left to right); they never mix
    pd = T.PATHS[1] - T.PATHS[0]
    put_pan(bus, fade(burble(pd, 20, 31), 0.3, 0.5), T.PATHS[0], 0.05, 0.6, -0.6)
    ph = bandnoise(pd, lambda tt: 6000 - 1500 * tt / pd, 0.5, 32)
    put_pan(bus, fade(ph, 0.3, 0.5), T.PATHS[0], 0.025, -0.6, 0.6)
    bus.put(whoosh(T.HEAT_PUSH[1] - T.HEAT_PUSH[0], 600, 1800, 33, 0.8, 0.7), T.HEAT_PUSH[0], 0.05)
    for i, m in enumerate((64, 67, 71, 76, 69)):
        bus.put(warm_tone(m, 0.7), T.HEAT[0] + 0.15 * i, 0.06, -0.25 if i % 2 == 0 else 0.25)
    order = sorted(range(len(rig.BEADS)), key=lambda i: rig.BEADS[i][3])
    pips = {0: (91, 95), 1: (89, 93, 96, 93, 89), 2: (95, 98)}
    used = {0: 0, 1: 0, 2: 0}
    for i in order:
        a, side, r, t0 = rig.BEADS[i]
        sect = 0 if t0 < 22.0 else (1 if t0 < 23.0 else 2)
        m = pips[sect][used[sect] % len(pips[sect])]
        used[sect] += 1
        bus.put(plip(mtof(m) * 0.7, mtof(m), 0.08, 0.0, 0.05, 40 + i), t0 + 0.04, 0.07,
                0.3 * side + 0.02 * (a - rig.SEC))
    bus.put(glide(700, 1400, 0.3), T.MERGE - 0.3, 0.012, 0.1)
    bus.put(click(50, 4200, 0.02), T.MERGE, 0.13, 0.1)
    bus.put(blip(2637.0, 3520.0, 0.04, 0.5), T.MERGE, 0.05, 0.1)
    bus.put(plip(1400, 2200, 0.07, 0.0, 0.1, 51), T.MERGE + 0.01, 0.07, 0.1)
    fd = T.FOLLOW[1] - 0.45 - T.FOLLOW[0]
    put_pan(bus, glide(1050, 560, fd, 0.01), T.FOLLOW[0], 0.025, -0.1, 0.35)
    bus.put(glide(300, 330, 0.4, 0.04), T.FOLLOW[1] - 0.45, 0.012, 0.35)
    bus.put(glide(1600, 700, T.PLIP2 - T.DROP_FALL[0], 0.0, 0.25), T.DROP_FALL[0], 0.02, 0.35)
    bus.put(plip(900, 2400, 0.2, 0.0, 0.3, 52), T.PLIP2, 0.32, 0.3)
    bus.put(bell(96, 0.8, 1.2, 2.0), T.PLIP2 + 0.005, 0.05, 0.3)
    for i, dt in enumerate((0.04, 0.09, 0.15, 0.22)):
        bus.put(blip(mtof(100 + 2 * i), mtof(103 + 2 * i), 0.03, 0.5), T.PLIP2 + dt, 0.018, 0.1 + 0.15 * i)
    # F. item-get twinkles, the zoom out, the time-lapse, the chime, the push, and the magic fade into the grape
    for i in range(10):
        tt = T.ITEM[0] + 0.1 + i * (T.ITEM[1] - T.ITEM[0] - 0.3) / 10
        bus.put(blip(mtof(98 + (i * 5) % 9), mtof(105 + (i * 5) % 9), 0.03, 0.5), tt, 0.012, 0.2 + 0.05 * (i % 4))
    bus.put(whoosh(T.COMPARE[1] - T.COMPARE[0], 1400, 500, 53, 0.8, 0.35), T.COMPARE[0], 0.04)
    ld = T.LAPSE[1] - T.LAPSE[0]
    lf = bandnoise(ld, lambda tt: 600 * (1500 / 600) ** np.clip(tt / ld, 0, 1), 0.35, 54)
    bus.put(fade(lf, 0.2, 0.3), T.LAPSE[0], 0.03, 0.35)
    bus.put(fade(burble(2.0, 10, 55), 0.4, 0.6), T.COMPARE[0], 0.02, 0.4)
    for i, (m, g) in enumerate(((86, 0.14), (91, 0.16))):
        nn = int((0.18 if i == 0 else 0.7) * SR)
        xx = np.arange(nn) / SR
        note = pulse(mtof(m), nn, 0.25) * np.minimum(1, xx / 0.003) * np.exp(-xx / (0.06 if i == 0 else 0.2))
        bus.put(note, T.CHIME + i * STEP, g, -0.15 + 0.3 * i)
        bus.put(bell(m + 12, 0.8, 1.0, 2.0), T.CHIME + i * STEP, 0.05)
    pd = T.LOOP_PUSH[1] - T.LOOP_PUSH[0]
    bus.put(whoosh(pd + 0.3, 350, 2200, 56, 0.8, 0.8), T.LOOP_PUSH[0], 0.06, 0.15)
    dd = T.DISSOLVE[1] - T.DISSOLVE[0]
    for i, m in enumerate((72, 76, 79, 84, 88, 91, 96, 100)):                         # the drop turns into the grape
        bus.put(blip(mtof(m), mtof(m + 7), 0.06, 0.25), T.DISSOLVE[0] + dd * i / 8, 0.016 + 0.003 * i, -0.3 + 0.08 * i)
    sw = bandnoise(dd, lambda tt: 1500 + 5000 * (tt / dd) ** 2, 0.5, 57)
    xs = np.arange(len(sw)) / SR
    bus.put(sw * (xs / dd) ** 2 * np.clip((dd - xs) / 0.03, 0, 1), T.DISSOLVE[0], 0.04)
    fx = wrap(bus.x)
    return fx + 0.1 * wrap(np.concatenate([reverb(fx, 0.8, 21), np.zeros((2, N - NT))], 1))


def duck_env():
    """The music dips under the squeeze, the plips, the landing, the merge (held through its pause) and the chime."""
    t = np.arange(NT) / SR
    g = np.ones(NT)
    for t0, depth, hold in ((T.SQUASH[0] + 0.01, 0.4, 0.15), (T.PLIP1, 0.3, 0.0), (T.HOP_LAND, 0.2, 0.0),
                            (T.SWITCH, 0.2, 0.0), (T.BOIL, 0.15, 0.0), (T.MERGE, 0.5, T.FOLLOW[0] - T.MERGE - 0.1),
                            (T.PLIP2, 0.5, 0.2), (T.CHIME, 0.35, 0.1)):
        a = np.clip((t - (t0 - 0.03)) / 0.03, 0, 1) * np.clip(1 - (t - t0 - hold) / 0.45, 0, 1)
        g -= depth * a * (t >= t0 - 0.03)
    return np.clip(g, 0.4, 1)


def master(mus, fx, target=-14.0):
    mix = 0.62 * mus * duck_env()[None, :] + 1.8 * fx
    mix = np.stack([lowpass(mix[0], 15500, 127), lowpass(mix[1], 15500, 127)])
    ceiling = -1.6
    for _ in range(6):
        mix *= 10 ** ((target - lufs(mix)) / 20)
        mix = limiter(mix, ceiling)
        tp = true_peak(mix)
        if tp <= -1.0 and abs(lufs(mix) - target) < 0.15:
            break
        if tp > -1.0:
            ceiling -= (tp + 1.0) + 0.15
    return mix


def render(out_dir, log=print, target=-14.0):
    from pathlib import Path
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    log('audio: score ...')
    mus = music()
    log('audio: effects ...')
    fx = sfx_forward()
    mix = master(mus, fx, target)
    g = 10 ** ((-16.0 - lufs(mus)) / 20)
    write_wav(out / 'music.wav', np.clip(mus * g, -1, 1))
    gs = 10 ** ((-16.0 - lufs(fx)) / 20)
    write_wav(out / 'sfx.wav', np.clip(fx * gs, -1, 1))
    write_wav(out / 'mix.wav', mix)
    info = {'lufs': round(lufs(mix), 2), 'true_peak_db': round(true_peak(mix), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP")
    return out / 'mix.wav', info
