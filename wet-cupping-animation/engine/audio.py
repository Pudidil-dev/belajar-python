"""Score and sound effects, synthesized in code (no samples): a playful 8-bit loop and arcade foley for a medical
simulation.

Chip voices: band-limited pulse waves (PolyBLEP), an NES-style triangle bass, LFSR noise percussion, a short echo and
FM bells (the synth core is shared with the repo's other pixel films). 120 BPM in F major, 13 bars of 4/4 = exactly
26 s. The square-wave hook (A5 C6 F6 C6 | E6 D6 C6 G5) opens the loop and comes back over the clean-up; the last bar's
C7 turnaround resolves into the first, and echo and reverb tails wrap onto the start, so the music loops seamlessly.

Effects sit on the picture's clock (engine/timeline.py): "tik" for each lancet tap, a glass "tunk" for each cup, the
hose "click", "pump! pump!", the suction "whoosh", soft drips, "bloop", the valve's "psssh", the seal's "pop", two
gauze "swipe"s and a little sparkle when the skin is clean. The music dips a little under the main effects.
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


# ---------------------------------------------------------------- the score (F major, 13 bars, loops)
_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def nm(s):
    """'E5' -> 76, 'Bb5' -> 82."""
    return 12 * (int(s[-1]) + 1) + _PC[s[0]] + s[1:-1].count('#') - s[1:-1].count('b')


def seq(s):
    """One bar as 16 tokens, one per 16th note: a note name starts a note, '-' holds it, '.' rests."""
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
    0: seq('A5 -  C6 -  F6 .  C6 -  E6 -  D6 C6 G5 -  C6 -'),    # the hook, between the lancet's "tik"s
    1: seq('D6 -  F6 -  A6 .  F6 -  D6 -  C6 Bb5 .  .  A5 -'),   # the cups drop in; the hose clicks on (3.5)
    2: seq('.  .  A5 .  .  .  C6 .  .  .  .  .  .  E6 G6 -'),    # a step up after each squeeze (off the squeezes)
    3: seq('F6 -  D6 -  Bb5 - F5 -  G5 -  C6 -  E6 -  G6 -'),    # the camera tips over into the cutaway
    4: seq('F5 -  -  -  A5 -  -  -  E5 -  -  -  C6 -  -  -'),    # low pressure: the skin rises (soft)
    5: seq('D6 .  F6 .  D6 .  Bb5 . C6 .  A5 .  F5 .  A5 .'),   # cells hop through the capillaries
    6: seq('G5 -  Bb5 - D6 -  -  -  E6 -  G6 -  .  .  .  .'),   # blood beads at the openings
    7: seq('A5 -  C6 -  F6 -  .  .  D6 -  .  .  F5 -  A5 -'),    # collecting: room for the bloops
    8: seq('D6 -  -  -  F6 -  -  -  E6 -  -  -  G6 -  -  -'),    # the cells float, close up
    9: seq('A5 -  C6 -  .  .  .  .  .  .  .  .  G5 -  C6 -'),    # "psssh" and "pop" get the stage
    10: seq('D6 -  F6 -  A6 -  -  -  Bb5 - D6 -  F6 -  -  -'),  # up and away; the camera tips back up
    11: seq('A5 -  C6 -  F6 .  C6 -  E6 -  D6 C6 G5 -  C6 -'),   # the hook again over the wipe
    12: seq('D6 -  Bb5 - F5 -  D6 -  C6 -  E6 -  G6 -  E6 -'),   # C7 turnaround into the opening
}
B_PUMP, B_TILT, B_LOW, B_CELLS, B_LEAK, B_COLLECT, B_MICRO, B_POP, B_UP, B_WIPE, B_TURN = range(2, 13)
SOFT_BARS = (B_LOW, B_MICRO)
STACCATO = (B_PUMP, B_CELLS)
_THIRD = {5: 4, 7: 3, 9: 4, 10: 3, 0: 3, 2: 3, 4: 3}                    # F major: a diatonic third below


def third_below(m):
    return m - _THIRD.get(m % 12, 3)


HARM = {b: [(s, l, third_below(m)) for s, l, m in LEAD[b]] for b in (0, B_WIPE, B_TURN)}
CHORD = {'F': (41, (0, 4, 7)), 'C': (48, (0, 4, 7)), 'Dm': (38, (0, 3, 7)), 'Bb': (46, (0, 4, 7)),
         'Am': (45, (0, 3, 7)), 'Gm': (43, (0, 3, 7)), 'C7': (48, (0, 4, 7, 10))}
BARS = [('F', 'C'), ('Dm', 'Bb'), ('F', 'C'), ('Bb', 'C'), ('Dm', 'Am'), ('Bb', 'F'), ('Gm', 'C'), ('F', 'Dm'),
        ('Bb', 'C'), ('F', 'C'), ('Dm', 'Bb'), ('F', 'C'), ('Bb', 'C7')]
N_BARS = len(BARS)
assert N_BARS * T.BAR == T.TOTAL


def bar_t(b, step=0.0):
    return b * T.BAR + step * STEP


def _bass(b, half, root):
    base = 8 * half
    if b in (B_LOW, B_MICRO):
        return [(base, 3.6, root, 0.26), (base + 4, 1.6, root + 7, 0.2), (base + 6, 1.6, root + 12, 0.2)]
    if b == B_PUMP:                         # answers each squeeze on the off-beat; quiet under the whoosh
        if half == 0:
            return [(2, 0.9, root, 0.32), (6, 0.9, root + 12, 0.24)]
        return [(14, 1.6, root, 0.28)]
    if b == B_POP and half == 0:
        return [(0, 1.6, root, 0.28), (2, 1.6, root + 12, 0.24)]       # then quiet for the release
    if b == B_TURN and half == 1:
        return [(8, 1.6, 43, 0.28), (10, 1.6, 45, 0.28), (12, 1.6, 46, 0.28), (14, 1.6, 47, 0.28)]
    return [(base + 2 * k, 1.6, root + iv, 0.28) for k, iv in enumerate((0, 12, 7, 12))]


def music():
    lead_bus, harm_bus, arp_bus, bass_bus, drum_bus, pad_bus = (Bus() for _ in range(6))
    for b, notes in LEAD.items():
        for s, l, m in notes:
            t0 = bar_t(b, s)
            dur = l * STEP * (0.9 if l <= 2 else 0.96)
            if b in STACCATO:
                lead_bus.put(lead(m, STEP * 0.7, 0.125, vib=0.0), t0, 0.17, 0.12 * (1 if s % 4 else -1))
            elif b in SOFT_BARS:
                lead_bus.put(lead(m, dur, 0.5, vib=0.14), t0, 0.14, 0.05)
            else:
                lead_bus.put(lead(m, dur, 0.25), t0, 0.19, 0.05)
    for b, notes in HARM.items():
        for s, l, m in notes:
            harm_bus.put(lead(m, l * STEP * 0.9, 0.125, vib=0.1), bar_t(b, s), 0.085, -0.3)
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            for st, l, m, g in _bass(b, half, CHORD[name][0]):
                bass_bus.put(bass(m, l * STEP), bar_t(b, st), g)
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root, iv = CHORD[name]
            base = 8 * half
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            if b in (B_TILT, B_CELLS, B_UP) or (b == B_TURN and half == 0):
                for k, p in enumerate((0, 1, 2, 3, 2, 1, 2, 3)):
                    arp_bus.put(chip_arp(tones[p], STEP * 0.85), bar_t(b, base + k), 0.05, -0.5)
            elif b in SOFT_BARS:
                for k in range(4):
                    arp_bus.put(chip_arp(tones[k] + 12, STEP * 1.7, 0.25), bar_t(b, base + 2 * k), 0.03,
                                -0.6 + 0.4 * k)
            elif b == B_TURN and half == 1:
                for k, p in enumerate((0, 1, 2, 3, 0, 1, 2, 3)):
                    arp_bus.put(chip_arp(tones[p] + (12 if k >= 4 else 0), STEP * 0.85), bar_t(b, 8 + k), 0.05,
                                -0.5)
            elif not (b == B_POP and half == 0) and b != B_PUMP:      # the pump bar: room for the effects
                for k in range(4):
                    arp_bus.put(chip_arp(tones[k], STEP * 1.6, 0.25), bar_t(b, base + 2 * k), 0.035, -0.45)
    for b in SOFT_BARS:
        for half in (0, 1):
            root, iv = CHORD[BARS[b][half]]
            pad_bus.put(pad([root + 24 + i for i in iv[:3]], 0.95, 0.15), bar_t(b, 8 * half), 0.045)
    K, Sn, Hc, Ho, C = kick(), snare(), hat(False), hat(True), crash()
    for b in range(N_BARS):
        t0 = bar_t(b)
        if b in (0, B_LOW, B_COLLECT, B_WIPE):
            drum_bus.put(C, t0, 0.13, 0.25)
        if b in SOFT_BARS:                                   # light: the kick on 1 and 3, soft hats
            for k in (0, 8):
                drum_bus.put(K, t0 + k * STEP, 0.3)
            for k in range(2, 16, 4):
                drum_bus.put(Hc, t0 + k * STEP, 0.035, 0.3)
            continue
        if b == B_POP:                                       # out of the way of "psssh" (18.6) and "pop" (19.2)
            drum_bus.put(K, t0, 0.38)
            for k in (12, 14):
                drum_bus.put(Hc, t0 + k * STEP, 0.05, 0.3)
            drum_bus.put(Sn, t0 + 12 * STEP, 0.18, 0.08)
            continue
        if b == B_PUMP:                                      # the squeezes are the beat; the kit stays off them
            for k in (2, 6, 14):
                drum_bus.put(Hc, t0 + k * STEP, 0.06, 0.3)
            for k, g in ((14, 0.2), (15, 0.13)):             # a pickup into the tilt
                drum_bus.put(Sn, t0 + k * STEP, g, 0.08)
            continue
        kicks, snares = [0, 8, 10], [4, 12]
        for k in kicks:
            drum_bus.put(K, t0 + k * STEP, 0.4)
        for k in snares:
            drum_bus.put(Sn, t0 + k * STEP, 0.22, 0.08)
        busy = b in (B_TILT, B_CELLS, B_COLLECT, B_UP)
        for k in range(16 if busy else 8):
            st = k if busy else 2 * k
            if b == B_TURN and st >= 12:
                continue
            drum_bus.put(Hc, t0 + st * STEP, 0.09 if st % 4 == 2 else 0.045, 0.3)
        if b in (1, B_LEAK):
            drum_bus.put(Ho, t0 + 14 * STEP, 0.06, 0.3)
        if b == B_TURN:                                      # a tom fill back into the top of the loop
            for i, m in enumerate((57, 55, 52, 48)):
                drum_bus.put(tom(m), t0 + (12 + i) * STEP, 0.22, 0.4 - 0.25 * i)
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


def spring(f0=180.0, f1=560.0, dur=0.2):
    """A cartoon spring: a triangle wave whose pitch shoots up with a wobble (the flask's hop)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** np.clip(t / (dur * 0.7), 0, 1) * (1 + 0.08 * np.sin(2 * math.pi * 28 * t))
    return tri(f, n) * np.minimum(1, t / 0.004) * np.exp(-t / (dur / 2.5))


# ---------------------------------------------------------------- the effects
def hiss(dur, f0, f1, seed, peak=0.15, tail=2.5):
    """Air through a small valve: bright noise, quick attack, a falling tail."""
    y = bandnoise(dur, lambda tt: f0 * (f1 / f0) ** np.clip(tt / dur, 0, 1), 0.7, seed)
    x = np.arange(len(y)) / SR
    e = np.clip(x / (dur * peak), 0, 1) * np.exp(-np.clip(x - dur * peak, 0, None) * tail / dur)
    return y * e


def pump_stroke(seed):
    """One squeeze of the hand pump: a short "pff" of air through the hose, a plastic click, a little thump."""
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    pf = bandnoise(0.3, lambda tt: 2600 * 0.35 ** np.clip(tt / 0.25, 0, 1), 0.6, seed) * np.exp(-t / 0.08)
    ck = click(seed + 1, 1800, 0.03)
    body = np.sin(2 * math.pi * np.cumsum(120 * np.exp(-t / 0.05) + 60) / SR) * np.exp(-t / 0.06)
    y = 0.7 * pf + 0.4 * body
    y[:len(ck)] += 0.5 * ck
    return y


def sfx_forward():
    from . import state as S
    bus = Bus()
    # 1. the lancet: in, four "tik"s, out (and in again at the very end, which wraps onto the start)
    for t0 in (T.LANCET_IN[0], T.LANCET_AGAIN[0]):
        bus.put(whoosh(0.6, 700, 1800, 3, 0.8, 0.6), t0, 0.03, 0.4)
    for i, t0 in enumerate(T.TAPS):
        bus.put(click(10 + i, 4200, 0.018), t0, 0.26, 0.25 - 0.15 * i)
        bus.put(blip(mtof(96 + 2 * i), mtof(103 + 2 * i), 0.05, 0.5), t0, 0.07, 0.25 - 0.15 * i)
        if i < 3:
            bus.put(whoosh(0.22, 900, 1500, 20 + i, 0.8, 0.5), t0 + 0.12, 0.012, 0.1)
    bus.put(whoosh(0.4, 1400, 600, 24, 0.8, 0.4), T.LANCET_OUT[0], 0.025, 0.4)
    # 2. the cups: each drops onto the skin with a soft glass "tunk" and a pitched blip
    for i, t0 in enumerate(T.CUPS):
        land = t0 + 0.12
        bus.put(glide(1300, 800, 0.22, 0.0, 0.25), t0 - 0.12, 0.008, -0.2 + 0.15 * i)
        bus.put(thump(160, 80, 0.18, 0.4, 30 + i), land, 0.09, -0.2 + 0.15 * i)
        bus.put(glass_ping((2093, 2349, 2637, 3136)[i], 0.3, 34 + i), land + 0.004, 0.05, -0.2 + 0.15 * i)
        bus.put(blip(mtof((77, 81, 84, 89)[i]), mtof((89, 93, 96, 101)[i]), 0.06, 0.5), land + 0.02, 0.025)
    # the pump slides in and its hose clicks onto the valve
    bus.put(whoosh(T.PUMP_IN[1] - T.PUMP_IN[0], 500, 1300, 40, 0.8, 0.6), T.PUMP_IN[0], 0.04, 0.3)
    bus.put(click(41, 2600, 0.025), T.HOSE_CLICK, 0.26, 0.2)
    bus.put(glass_ping(3520, 0.2, 42), T.HOSE_CLICK + 0.004, 0.04, 0.2)
    bus.put(blip(mtof(88), mtof(100), 0.05, 0.5), T.HOSE_CLICK + 0.02, 0.03, 0.2)
    # 3. "pump! pump!": three squeezes, air leaving through the hose, then the "whoosh" of the suction settling
    for i, t0 in enumerate(T.PUMPS):
        bus.put(pump_stroke(50 + 3 * i), t0, 0.32, 0.3)
        bus.put(hiss(0.35, 3000, 1500, 60 + i, 0.2, 3.0), t0 + 0.03, 0.04, 0.4)
        bus.put(blip(mtof(65 + 4 * i), mtof(72 + 4 * i), 0.08, 0.25), t0 + 0.05, 0.025, 0.0)
    bus.put(whoosh(0.55, 350, 1700, 63, 0.8, 0.55), T.WHOOSH, 0.12, 0.0)
    bus.put(click(64, 2200, 0.02), T.HOSE_OFF, 0.12, 0.3)
    bus.put(hiss(0.12, 4000, 3000, 65, 0.3, 5.0), T.HOSE_OFF + 0.01, 0.02, 0.3)
    bus.put(whoosh(T.PUMP_OUT[1] - T.PUMP_OUT[0], 1200, 500, 66, 0.8, 0.4), T.PUMP_OUT[0], 0.03, 0.4)
    # the camera tips over; the slice opens the cross-section
    bus.put(whoosh(T.TILT_DOWN[1] - T.TILT_DOWN[0], 500, 1500, 67, 0.8, 0.5), T.TILT_DOWN[0], 0.04)
    sd = T.SLICE[1] - T.SLICE[0]
    sn = int(sd * SR)
    sx_ = np.arange(sn) / SR
    scan = pulse(1500 * (0.4 ** (sx_ / sd)), sn, 0.125) * np.sin(math.pi * np.clip(sx_ / sd, 0, 1)) ** 2
    bus.put(lowpass(scan, 3500, 63), T.SLICE[0], 0.03, -0.2)
    bus.put(glass_ping(2637, 0.4, 68), T.SLICE[1], 0.04, 0.1)
    # 4. low pressure: a soft, low swell while the skin keeps rising; zooms in
    ln = int(2.0 * SR)
    xl = np.arange(ln) / SR
    swell = (0.6 * tri(87.3, ln) + 0.4 * sine(174.6, ln)) * np.sin(math.pi * np.clip(xl / 2.0, 0, 1)) ** 2
    bus.put(lowpass(swell, 700, 63), T.CREEP[0], 0.03)
    bus.put(whoosh(T.VESSEL_ZOOM[1] - T.VESSEL_ZOOM[0], 600, 2200, 69, 0.8, 0.7), T.VESSEL_ZOOM[0], 0.05)
    # cells hopping through the capillaries: soft bubbly blips on the 8ths
    k = 0
    t = T.RBC[0]
    rng = np.random.default_rng(7)
    while t < T.LEAK[1]:
        bus.put(blub(rng.uniform(500, 900), 0.06), t, 0.035, float(rng.uniform(-0.4, 0.4)))
        k += 1
        t = T.RBC[0] + k * STEP * 2
    for i, t0 in enumerate((T.LEAK[0] + 0.25, T.LEAK[0] + 0.7, T.LEAK[0] + 1.1)):
        bus.put(plip(500, 900, 0.14, 0.2, 0.05, 70 + i), t0, 0.06, -0.2 + 0.2 * i)   # beads forming
    # 5. collecting (time-lapse): a soft whoosh, fast ticks, drips, then "bloop ... bloop"
    bus.put(whoosh(0.6, 1800, 600, 73, 0.8, 0.35), T.COLLECT[0], 0.05)
    ticks(bus, T.COLLECT[0] + 0.1, T.COLLECT[1] - 0.05, 10, 0.02)
    g = T.COLLECT[0] + 0.3
    while g < T.COLLECT[1]:
        bus.put(plip(rng.uniform(600, 800), 1400, 0.1, 0.1, 0.05, int(g * 10)), g, 0.035, float(rng.uniform(-0.5, 0.5)))
        g += 0.5
    for i, t0 in enumerate(T.BLOOPS):
        bus.put(plip(280, 720, 0.26, body=0.5, splash=0.1, seed=80 + i), t0, 0.3, 0.2 - 0.2 * i)
    bus.put(whoosh(0.5, 900, 2600, 83, 0.8, 0.7), T.MICRO[0], 0.04)
    mn = int((T.MICRO[1] - T.MICRO[0]) * SR)
    xm = np.arange(mn) / SR
    md = T.MICRO[1] - T.MICRO[0]
    bus.put(lowpass(sine(196 + 6 * np.sin(2 * math.pi * 0.7 * xm), mn) * np.sin(math.pi * xm / md) ** 2, 900, 63),
            T.MICRO[0], 0.02)
    bus.put(whoosh(T.BACK_OUT[1] - T.BACK_OUT[0], 2200, 700, 84, 0.8, 0.35), T.BACK_OUT[0], 0.04)
    # 6. the release ("psssh"), the seal breaking ("pop"), the cup going up
    bus.put(whoosh(T.VALVE[1] - T.VALVE[0], 600, 1300, 85, 0.8, 0.6), T.VALVE[0], 0.025, 0.3)
    bus.put(hiss(0.6, 6500, 2500, 86, 0.08, 2.0), T.PSSSH, 0.2, 0.1)
    bus.put(click(87, 3000, 0.02), T.PSSSH, 0.1, 0.1)
    pop = highpass(white(int(0.06 * SR), 88), 900, 63) * env_exp(int(0.06 * SR), 0.009, 0.001)
    bus.put(pop, T.POP, 0.28, 0.0)
    bus.put(blip(380, 1300, 0.12, 0.25), T.POP + 0.005, 0.07, 0.0)
    bus.put(thump(200, 90, 0.12, 0.6, 89), T.POP, 0.08)
    bus.put(whoosh(T.LIFT[1] - T.POP, 500, 1500, 90, 0.8, 0.5), T.POP + 0.05, 0.04, 0.2)
    # 7. tipping back up, the mark, two "swipe"s of the gauze, a little sparkle when it is clean
    bus.put(whoosh(T.TILT_UP[1] - T.TILT_UP[0], 1500, 600, 91, 0.8, 0.4), T.TILT_UP[0], 0.04)
    bus.put(bell(93, 0.8, 1.0, 2.0), T.TILT_UP[1] - 0.15, 0.03, -0.2)
    for i, t0 in enumerate(T.SWIPES):
        sw = bandnoise(0.32, lambda tt: 1800 + 2600 * np.sin(math.pi * np.clip(tt / 0.32, 0, 1)), 0.6, 92 + i)
        xs = np.arange(len(sw)) / SR
        bus.put(sw * np.sin(math.pi * np.clip(xs / 0.32, 0, 1)) ** 1.5, t0, 0.14, -0.3 + 0.6 * i)
    for i, m in enumerate((96, 100, 103)):
        bus.put(blip(mtof(m), mtof(m + 7), 0.05, 0.5), T.CLEAN + 0.07 * i, 0.03, -0.2 + 0.2 * i)
    # 8. the loop: zoom out, slide down the spine, the lancet coming in again
    bus.put(whoosh(T.ZOOM_OUT[1] - T.ZOOM_OUT[0], 1600, 500, 94, 0.8, 0.35), T.ZOOM_OUT[0], 0.04)
    bus.put(whoosh(T.TO_NEXT[1] - T.TO_NEXT[0], 500, 1400, 95, 0.8, 0.6), T.TO_NEXT[0], 0.04, -0.1)
    fx = wrap(bus.x)
    return fx + 0.1 * wrap(np.concatenate([reverb(fx, 0.8, 21), np.zeros((2, N - NT))], 1))


def duck_env():
    """The music dips a little under the taps, the squeezes, the whoosh, the bloops, the release, the pop and the
    swipes."""
    t = np.arange(NT) / SR
    g = np.ones(NT)
    events = [(p, 0.25, 0.0) for p in T.PUMPS] + [(b, 0.25, 0.0) for b in T.BLOOPS] + \
        [(tp, 0.12, 0.0) for tp in T.TAPS] + [(T.WHOOSH, 0.3, 0.3)] + \
        [(T.PSSSH, 0.3, 0.3), (T.POP, 0.35, 0.1)] + [(s_, 0.25, 0.0) for s_ in T.SWIPES]
    for t0, depth, hold in events:
        a = np.clip((t - (t0 - 0.03)) / 0.03, 0, 1) * np.clip(1 - (t - t0 - hold) / 0.45, 0, 1)
        g -= depth * a * (t >= t0 - 0.03)
    return np.clip(g, 0.45, 1)


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
