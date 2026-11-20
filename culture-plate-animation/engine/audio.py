"""Score and sound effects, synthesized in code (no samples): a bright, bouncy chiptune loop and small, satisfying
lab sounds tied to every event on screen.

Chip voices: band-limited pulse waves (PolyBLEP), an NES-style triangle bass, LFSR noise drums, a short echo and FM
bells (the synth core is shared with the repo's other pixel films). C major, 120 BPM, 15 bars = 30 s, and it loops:
whatever rings past the end is folded back onto the start, and the limiter works on the loop wrapped round.

  bars 0-3   theme A (I-vi-IV-V) with a light groove; the swab's six swipes, panned with the swab
  bar 4      IV-V with the drums out and a rising line: the cursor blips, the camera dives in, the lens opens
  bars 5-8   up close: a music-box tune over plucked bass; every split of a bacterium is a pop, pitched to the chord
  bar 9      the build: the pops turn into a fizz, a snare roll into the lens closing
  bar 10     release: the camera pulls out to the plate
  bars 11-12 time-lapse: four on the floor, a ticking clock, a pip for every colony as the zigzag fills in
  bar 13     the reveal: a short fanfare, a shine and twinkles
  bar 14     turnaround: the plates slide, the new one lands on the loop point
"""
import math
import wave

import numpy as np

from . import timeline as T

SR = 48000
NT = int(round(T.TOTAL * SR))
N = NT + 4 * SR
STEP = T.BEAT / 4                 # one 16th = 0.125 s at 120 BPM


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


# ---------------------------------------------------------------- the score (Bb/F major, 14 bars, loops)
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




# ---------------------------------------------------------------- shared effect helpers
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



# ================================================================ sound effects
def pop(f0=320.0, f1=1250.0, seed=0, body=0.35):
    """A juicy bubble pop: a resonant bloop whose pitch jumps up, a click on the attack, a little low body."""
    p = plip(f0, f1, 0.16, body, 0.35, seed)
    k = click(seed + 1, 2600, 0.02)
    n = max(len(p), len(k))
    out = np.zeros(n)
    out[:len(p)] += p
    out[:len(k)] += 0.5 * k
    return out


def stretch(dur):
    """A cell stretching before it splits: a rubbery tone bending up, getting louder, with a wobble."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    f = 150.0 * (6.0 ** (u ** 1.6)) * (1 + 0.02 * np.sin(2 * math.pi * 11 * t))
    y = 0.6 * tri(f, n) + 0.25 * pulse(f * 2, n, 0.25)
    return lowpass(y * (0.15 + 0.85 * u ** 1.5), 4000, 63)



# ================================================================ the score (C major, 120 BPM, 15 bars, loops)
CH = {'C': (36, (0, 4, 7)), 'Am': (45, (0, 3, 7)), 'F': (41, (0, 4, 7)), 'G': (43, (0, 4, 7))}
BARS = [('C', 'C'),       # 0  the fresh plate gleams; the swab swoops in
        ('Am', 'Am'),     # 1  touchdown on the downbeat; swipes on the dotted quarters
        ('F', 'F'),       # 2  swipes
        ('G', 'G'),       # 3  the last swipe, the swab lifts away; a shine runs along the zigzag
        ('F', 'G'),       # 4  the cursor locks on; the camera dives; the lens opens
        ('C', 'C'),       # 5  up close: one bacterium grows and pinches
        ('Am', 'Am'),     # 6  downbeat: the first split; beat 4: the second round
        ('F', 'F'),       # 7  4, then 8
        ('G', 'G'),       # 8  16, 32, 64
        ('C', 'G'),       # 9  128, 256 ... the colonies merge; snare roll
        ('Am', 'Am'),     # 10 the lens closes, the camera pulls out
        ('F', 'F'),       # 11 time-lapse: the clock races, colonies rise along the zigzag
        ('G', 'G'),       # 12 ... and the clock rings
        ('C', 'C'),       # 13 the reveal: fanfare
        ('F', 'G')]       # 14 the plates slide; the new one lands on the loop point
N_BARS = len(BARS)
assert abs(N_BARS * T.BAR - T.TOTAL) < 1e-9

LEAD = {0: seq('E5 . G5 . C6 - G5 . A5 - G5 . E5 - D5 .'),
        1: seq('C5 . E5 . A5 - E5 . G5 - E5 . C5 - D5 .'),
        2: seq('F5 . A5 . C6 - A5 . G5 - A5 . F5 - E5 .'),
        3: seq('D5 . G5 . B5 - D6 . C6 - B5 . A5 - G5 .'),
        4: seq('A5 - - - C6 - - - B5 . D6 . G6 . B6 .'),
        9: seq('C6 . E6 . G6 . C7 . B6 . G6 . D6 . B5 .'),
        10: seq('A5 - - - - - - - C6 - - - E6 - - -'),
        11: seq('C6 . A5 . F5 . A5 . C6 - - . A5 . C6 .'),
        12: seq('B5 . G5 . D5 . G5 . B5 - - . D6 . F6 .'),
        13: seq('C6 . E6 . G6 . C7 - - - - - G6 . C7 -'),
        14: seq('C6 . A5 . F5 . A5 . D5 . G5 . B5 . D5 .')}
HARM = {13: seq('G5 . C6 . E6 . G6 - - - - - E6 . G6 -'),
        11: seq('A5 . F5 . C5 . F5 . A5 - - . F5 . A5 .'),
        12: seq('G5 . D5 . B4 . D5 . G5 - - . B5 . D6 .')}
BELL = {5: seq('E6 - - - D6 - - - C6 - - - G5 - - -'),           # the music box up close
        6: seq('. . . . A5 - C6 - E6 - - - . . . .'),
        7: seq('F5 - A5 - . . . . C6 - A5 - . . . .'),
        8: seq('G5 - . . B5 - . . D6 - . . G6 - . .')}
GROOVE = (0, 1, 2, 3, 14)
MICRO_BARS = (5, 6, 7, 8)
LAPSE = (11, 12)


def bar_t(b, step=0.0):
    return b * T.BAR + step * STEP


def chord_at(t):
    t = t % T.TOTAL
    b = int(t // T.BAR) % N_BARS
    return CH[BARS[b][int((t % T.BAR) // (T.BAR / 2))]]


def chord_tones(t, octave=6):
    root, iv = chord_at(t)
    base = 12 * (octave + 1) + root % 12
    return [base + i for i in iv] + [base + 12]


def _bass_notes(b, half, root):
    base = 8 * half
    if b in GROOVE or b in LAPSE:                                    # bouncy: root, octave, fifth, octave
        return [(base + 2 * k, 1.6, root + iv, 0.27 if k % 2 == 0 else 0.21) for k, iv in enumerate((0, 12, 7, 12))]
    if b == 4:
        return [(base, 3.6, root, 0.25), (base + 4, 3.6, root + 7, 0.22)]
    if b in MICRO_BARS:                                              # plucked, light
        return [(base, 1.4, root, 0.26), (base + 4, 1.4, root + 7, 0.19)]
    if b == 9:
        return [(base + 2 * k, 1.5, root, 0.22 + 0.015 * (k + 4 * half)) for k in range(4)]
    if b == 10:
        return [(0, 15.5, root, 0.27)] if half == 0 else []
    if b == 13:
        return [(0, 1.5, root, 0.3), (2, 1.5, root, 0.3), (4, 1.5, root, 0.3), (6, 9.5, root, 0.28)] if half == 0 \
            else []
    return []


def music():
    bus = {k: Bus() for k in ('lead', 'harm', 'arp', 'bass', 'drum', 'pad', 'bell')}
    for b in range(N_BARS):
        for s, l, m in LEAD.get(b, []):
            dur = l * STEP * (0.85 if l <= 2 else 0.95)
            g = {13: 0.19, 10: 0.12, 4: 0.14, 9: 0.12}.get(b, 0.15)
            bus['lead'].put(lead(m, dur, 0.25, vib=0.14 if l > 2 else 0.04), bar_t(b, s), g, 0.06)
        for s, l, m in HARM.get(b, []):
            bus['harm'].put(lead(m, l * STEP * 0.9, 0.125, vib=0.06), bar_t(b, s), 0.06, -0.3)
        for s, l, m in BELL.get(b, []):
            bus['bell'].put(bell(m, max(0.7, l * STEP + 0.5), 1.6, 3.5), bar_t(b, s), 0.2, 0.1)
            bus['bell'].put(bell(m + 12, 0.3, 0.8, 2.0), bar_t(b, s), 0.03, -0.2)
        for half in (0, 1):
            root, iv = CH[BARS[b][half]]
            for st, l, m, g in _bass_notes(b, half, root):
                bus['bass'].put(bass(m, l * STEP), bar_t(b, st), g)
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            base = 8 * half
            if b in GROOVE:
                for k, pi in enumerate((0, 1, 2, 3, 2, 1, 2, 3)):
                    bus['arp'].put(chip_arp(tones[pi] + 12, STEP * 0.7), bar_t(b, base + k), 0.017,
                                   0.45 if k % 2 else -0.45)
            elif b == 9:                                             # the build: the arpeggio climbs
                up = 12 * half
                for k, pi in enumerate((0, 1, 2, 3, 0, 1, 2, 3)):
                    bus['arp'].put(chip_arp(tones[pi] + 12 + up, STEP * 0.7), bar_t(b, base + k),
                                   0.022 + 0.002 * k, -0.4 if k % 2 else 0.4)
            elif b == 4 and half == 1:                               # the dive: a quick run up
                for k, pi in enumerate((0, 1, 2, 3, 0, 1, 2, 3)):
                    bus['arp'].put(chip_arp(tones[pi] + 12 * (1 + k // 4), STEP * 0.6), bar_t(b, base + k), 0.02,
                                   0.3)
    for b in MICRO_BARS + (4, 10):                                   # a soft pad where the groove is not
        for half in (0, 1):
            root, iv = CH[BARS[b][half]]
            bus['pad'].put(pad([root + 36 + i for i in iv], T.BAR / 2 - 0.05, 0.15), bar_t(b, 8 * half), 0.05)
    _drums(bus['drum'])
    mix = sum(x.x for x in bus.values())
    lead_st = bus['lead'].x + bus['harm'].x + 0.6 * bus['bell'].x
    mix = mix + 0.3 * np.stack([echo(lead_st.sum(0) * 0.5, 0.375, 0.3), echo(lead_st.sum(0) * 0.5, 0.25, 0.26)])
    mix = mix + 0.14 * reverb(mix - 0.9 * bus['bass'].x - 0.6 * bus['drum'].x)
    return mix


def _drums(d):
    K, Sn, Hc, C, Ho = kick(), snare(0.8), hat(False), crash(), hat(True)
    for b in GROOVE:                                                 # a light groove
        for k in (0, 8):
            d.put(K, bar_t(b, k), 0.3)
        for k in (4, 12):
            d.put(Sn, bar_t(b, k), 0.11, 0.08)
        for k in range(0, 16, 2):
            d.put(Hc, bar_t(b, k), 0.026 if k % 4 else 0.034, 0.3)
    d.put(K, bar_t(3, 10), 0.22)
    d.put(Ho, bar_t(3, 14), 0.035, 0.3)
    for k, m in zip((12, 13, 14, 15), (55, 52, 48, 45)):            # bar 14: a tom fill back to the top
        d.put(tom(m), bar_t(14, k), 0.12 + 0.015 * (k - 12), 0.3 - 0.2 * (k - 12))
    # bar 4: the drums drop out for the dive; a snare roll swells into the lens
    for k in range(8, 16):
        d.put(Sn, bar_t(4, k), 0.03 + 0.012 * (k - 8), 0.1)
    d.put(K, bar_t(4), 0.26)
    # up close: a soft pulse, kick and rim; the pops are the rest of the kit
    rim = click(77, 1700, 0.03)
    d.put(C, bar_t(5), 0.05, -0.1)
    for b in MICRO_BARS:
        for k in (0, 8):
            d.put(K, bar_t(b, k), 0.22)
        for k in (4, 12):
            d.put(rim, bar_t(b, k), 0.05, 0.15)
        for k in range(2, 16, 4):
            d.put(Hc, bar_t(b, k), 0.018, -0.3)
    # bar 9: the build
    for k in range(0, 16, 4):
        d.put(K, bar_t(9, k), 0.3)
    for k in range(8, 16):
        d.put(Sn, bar_t(9, k), 0.05 + 0.01 * (k - 8), 0.05)
    for k in range(12, 16):
        d.put(Sn, bar_t(9, k + 0.5), 0.05 + 0.012 * (k - 12), -0.05)
    for k in range(0, 16, 2):
        d.put(Hc, bar_t(9, k), 0.03, 0.3)
    # bar 10: release, half time
    d.put(C, bar_t(10), 0.09, 0.1)
    d.put(K, bar_t(10), 0.36)
    d.put(K, bar_t(10, 10), 0.24)
    d.put(Sn, bar_t(10, 8), 0.1)
    # bars 11-12: the time-lapse drives: four on the floor and 16th hats (the clock)
    for b in LAPSE:
        for k in range(0, 16, 4):
            d.put(K, bar_t(b, k), 0.32)
        for k in (4, 12):
            d.put(Sn, bar_t(b, k), 0.12, 0.08)
        for k in range(16):
            d.put(Hc, bar_t(b, k), 0.04 if k % 4 == 2 else 0.022, 0.3 if k % 2 else -0.2)
    for k in (12, 13, 14, 15):
        d.put(Sn, bar_t(12, k), 0.06 + 0.02 * (k - 12), 0.05)
    # bar 13: the fanfare hits
    d.put(C, bar_t(13), 0.11, 0.1)
    for k in (0, 2, 4, 6):
        d.put(K, bar_t(13, k), 0.34)
        d.put(Sn, bar_t(13, k), 0.08, 0.05)
    d.put(K, bar_t(13, 12), 0.22)


# ================================================================ sound effects
def swipe(dur, seed):
    """A cotton tip swiped across soft gel: band noise that swells and fades, its colour rising then falling, with a
    faint flutter of fibres."""
    y = bandnoise(dur, lambda tt: 950.0 * (1 + 1.3 * np.sin(np.pi * np.clip(tt / dur, 0, 1))), 0.8, seed)
    t = np.arange(len(y)) / SR
    u = np.clip(t / dur, 0, 1)
    env = np.sin(np.pi * u) ** 1.2 * (0.8 + 0.2 * np.sin(2 * math.pi * 37 * t))
    return y * env


def tock(seed=0):
    """A plastic dish settling on the bench: a soft knock with a short hollow ring."""
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    knock = lowpass(white(n, seed), 1400, 63) * np.exp(-t / 0.012)
    ring = np.sin(2 * math.pi * 820 * t) * np.exp(-t / 0.035) + 0.4 * np.sin(2 * math.pi * 1930 * t) * np.exp(-t / 0.02)
    y = 0.8 * knock / (np.abs(knock).max() + 1e-9) + 0.5 * ring
    return y / np.abs(y).max()


def tik(m, seed=0):
    """A tiny pitched pop for a far-away split."""
    f = mtof(m)
    n = int(0.07 * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * math.pi * np.cumsum(f * (0.6 + 0.4 * (1 - np.exp(-t / 0.006)))) / SR) * np.exp(-t / 0.018)
    y += 0.35 * highpass(white(n, seed), 3500, 63) * np.exp(-t / 0.003)
    return y


def chime(ms, gap, dur=0.5):
    """Notes rung one after another on a small bell."""
    n = int((gap * (len(ms) - 1) + dur + 0.1) * SR)
    y = np.zeros(n)
    for k, m in enumerate(ms):
        b = bell(m, dur, 1.2, 3.5)
        s = int(k * gap * SR)
        y[s:s + len(b)] += b
    return y / (np.abs(y).max() + 1e-9)


def alarm(dur=0.3):
    """The alarm clock ringing: two bells struck fast in turn."""
    n = int(dur * SR)
    y = np.zeros(n)
    k = 0
    for s in range(0, n, int(0.028 * SR)):
        b = bell(96 if k % 2 else 93, 0.12, 2.0, 3.5)
        y[s:s + len(b)] += b[:n - s]
        k += 1
    return y * np.clip((dur - np.arange(n) / SR) / 0.08, 0, 1) / (np.abs(y).max() + 1e-9)


def split_sounds(bus):
    """A pop for every split the camera can see clearly (pitched to the chord), and a fizz of tiny tiks once the
    splits are too many to count."""
    from . import micro as M, plate as PL
    M.setup(PL.P_DIR)
    sp = M.splits()
    rng = np.random.default_rng(5)
    hero = sp[(sp[:, 4] == 0) & (sp[:, 3] <= 3)]
    big = set()
    for i, (ts, x, y, g, ci) in enumerate(hero):
        s = M.mscale(ts)
        pan = float(np.clip(x * s / 135.0, -0.8, 0.8))
        tones = chord_tones(ts, 6)
        m = tones[[3, 2, 1][int(g) - 1] if g <= 3 else 0] + (0 if g > 1 else 0)
        body = 0.5 if g == 1 else 0.3
        bus.put(pop(mtof(m) * 0.32, mtof(m), seed=10 + i, body=body), ts, 0.4 if g == 1 else 0.3, pan)
        if g == 1:
            bus.put(chime([84, 88, 91, 96], 0.045, 0.6), ts + 0.02, 0.1, 0.0)
        big.add(round(ts / STEP))
    rest = sp[~((sp[:, 4] == 0) & (sp[:, 3] <= 3))]
    sc = np.array([M.mscale(x) for x in rest[:, 0]])
    on = np.hypot(rest[:, 1] * sc, rest[:, 2] * sc) < 132.0                    # only splits inside the lens
    rest = rest[on]
    steps = np.round(rest[:, 0] / STEP).astype(int)
    for k in np.unique(steps):
        tk = k * STEP
        if tk >= T.MICRO[1] or tk < T.MICRO[0] - 0.4:
            continue
        cnt = int((steps == k).sum())
        s = M.mscale(tk)
        n_play = 1 if cnt < 3 else (2 if cnt < 40 else 3)
        if k in big:
            n_play = max(0, n_play - 1)
        tones = chord_tones(tk, 6 if s > 4 else 7)
        for j in range(n_play):
            m = tones[int(rng.integers(0, len(tones)))]
            g = 0.3 / (1 + 0.5 * j) if s > 5 else 0.17 / (1 + 0.4 * j)
            sig = pop(mtof(m) * 0.35, mtof(m), seed=int(k * 7 + j), body=0.1) if s > 5 else tik(m, int(k * 7 + j))
            bus.put(sig, tk + 0.012 * j, g, float(rng.uniform(-0.6, 0.6)))
    # the crowd: once the splits are uncountable, a bubbly fizz that swells into the lens closing
    fz = burble(2.4, rate=60.0, seed=8, f_lo=1500.0, f_hi=3600.0)
    fz *= np.clip(np.arange(len(fz)) / SR / 1.6, 0, 1) ** 1.5 * np.clip((2.4 - np.arange(len(fz)) / SR) / 0.25, 0, 1)
    bus.put(fz, 17.6, 0.24, 0.0)


def colony_pips(bus):
    """The time-lapse: a pip for each step of the zigzag filling in, climbing the chord as the line grows."""
    k0, k1 = int(round(T.GROW[0] / STEP)), int(round((T.GROW[1] - 0.8) / STEP))
    for i, k in enumerate(range(k0, k1)):
        tk = k * STEP
        tones = chord_tones(tk, 5)
        ladder = [tones[j % 3] + 12 * (j // 3) for j in range(12)]
        m = ladder[min(len(ladder) - 1, int(i * len(ladder) / max(1, k1 - k0)))]
        sig = chip_arp(m + 12, STEP * 0.6, 0.25)
        bus.put(sig, tk, 0.06, 0.5 * math.sin(i * 1.3))


def sfx():
    from . import plate as PL
    bus = Bus()
    # the new plate settles on the loop point; a glint runs across it
    bus.put(tock(1), 0.0, 0.55, 0.0)
    bus.put(glass_ping(2093, 0.6, 3), 0.18, 0.1, -0.25)
    bus.put(glass_ping(3136, 0.5, 4), 0.34, 0.07, 0.25)
    # the swab swoops in from the top right and touches down on the downbeat of bar 1
    put_pan(bus, whoosh(1.0, 700, 2400, 31, 0.8, 0.6), 0.75, 0.42, 0.8, 0.4)
    bus.put(click(5, 2900, 0.03), T.STROKE_T0, 0.6, 0.4)
    bus.put(thump(260, 120, 0.12, 0.2, 6), T.STROKE_T0, 0.3, 0.4)
    # six swipes, each panned with the swab across the plate
    for k, (a, b) in enumerate(T.STROKES):
        x0, x1 = PL.VERTS[k][0], PL.VERTS[k + 1][0]
        put_pan(bus, swipe(b - a + 0.08, 40 + k), a, 0.19, float(np.clip(x0 / 38, -0.8, 0.8)),
                float(np.clip(x1 / 38, -0.8, 0.8)))
    # the swab lifts away
    bus.put(blip(900, 1700, 0.07, 0.25), T.SWAB_OUT[0], 0.24, 0.4)
    put_pan(bus, whoosh(0.8, 2200, 700, 33, 0.8, 0.35), T.SWAB_OUT[0] + 0.05, 0.3, 0.4, 0.9)
    # a shine runs along the wet zigzag
    bus.put(chime([79, 84, 88, 91, 96, 100], 0.09, 0.45), T.SHEEN[0], 0.17, 0.0)
    # the cursor: two menu blips, then a confirm
    for k in range(2):
        bus.put(beep(1318.5, 0.045, 0.25), T.CURSOR[0] + 0.125 * k, 0.07, 0.0)
    bus.put(beep(1046.5, 0.05, 0.5), T.CONFIRM, 0.07, 0.0)
    bus.put(beep(1568.0, 0.08, 0.5), T.CONFIRM + 0.06, 0.07, 0.0)
    # the dive and the lens
    bus.put(whoosh(1.0, 350, 3400, 35, 0.9, 0.85), T.ZOOM_IN[0], 0.28, 0.0)
    bus.put(glide(700, 2600, 0.5, 0.01), T.LENS_OPEN[0], 0.07, 0.0)
    bus.put(glass_ping(2637, 0.7, 7), T.MICRO[0], 0.09, 0.0)
    bus.put(plip(260, 700, 0.2, 0.3, 0.1, 9), T.MICRO[0], 0.16, 0.0)
    # the first bacterium stretches before it splits
    bus.put(stretch(1.05), T.DIVISIONS[0] - 1.05, 0.035, 0.1)
    split_sounds(bus)
    # out again: the lens closes, the camera pulls back
    bus.put(whoosh(0.5, 3200, 600, 37, 0.9, 0.2), T.LENS_CLOSE[0], 0.2, 0.0)
    bus.put(plip(700, 300, 0.18, 0.2, 0.05, 11), T.LENS_CLOSE[1], 0.12, 0.0)
    bus.put(whoosh(1.25, 1800, 280, 39, 0.8, 0.3), T.ZOOM_OUT[0], 0.13, 0.0)
    # the time-lapse: the clock bounces in, ticks, rings; colonies pip as the zigzag fills in
    bus.put(spring(200, 620, 0.22), T.CLOCK[0], 0.08, 0.0)
    for k in range(int(round((T.GROW[1] - T.GROW[0]) / STEP))):
        bus.put(click(60 + k, 3800 if k % 2 else 3300, 0.02), T.GROW[0] + k * STEP, 0.07 if k % 4 == 0 else 0.045,
                0.25 if k % 2 else -0.25)
    bus.put(alarm(0.3), T.GROW[1] - 0.05, 0.12, 0.0)
    bus.put(whoosh(0.3, 900, 2600, 41, 0.8, 0.5), T.CLOCK[1] - 0.28, 0.06, 0.0)
    colony_pips(bus)
    # the reveal: a run of bells rides the shine along the zigzag; then twinkles
    bus.put(chime([84, 86, 88, 91, 93, 96, 98, 100, 103, 105, 108], 0.065, 0.5), T.REVEAL[0], 0.22, 0.0)
    for k in range(8):
        t0 = T.TWINKLE[0] + 0.125 * k
        tt = t0
        while tt < T.PAN[0] + 0.3:
            bus.put(glass_ping(5274 if k % 2 else 4186, 0.3, 50 + k), tt + 0.05, 0.13, 0.6 * math.sin(k * 2.1))
            tt += 0.75
    # the plates slide along: the finished one out to the left, the next one in
    put_pan(bus, whoosh(T.SLIDE[1] - T.SLIDE[0], 380, 1500, 43, 0.75, 0.5), T.SLIDE[0], 0.19, 0.7, -0.7)
    return bus.x


def duck_env():
    """The music steps back for the touchdown, the first split and the reveal."""
    t = np.arange(N) / SR
    g = np.ones(N)
    for t0, depth, hold in ((T.STROKE_T0, 0.15, 0.08), (T.DIVISIONS[0], 0.35, 0.15), (T.REVEAL[0], 0.25, 0.2)):
        a = np.clip((t - (t0 - 0.02)) / 0.02, 0, 1) * np.clip(1 - (t - t0 - hold) / 0.35, 0, 1)
        g -= depth * a * (t >= t0 - 0.02)
    return np.clip(g, 0.4, 1)


def loop_wrap(x):
    """Fold everything that rings past the end back onto the start, so the loop is seamless."""
    y = x[:, :NT].copy()
    tail = x[:, NT:]
    k = min(tail.shape[1], NT)
    y[:, :k] += tail[:, :k]
    return y


def master(mus, fx, target=-14.0):
    mix = loop_wrap(0.62 * mus * duck_env()[None, :] + 1.5 * fx)
    mix = np.stack([lowpass(mix[0], 15500, 127), lowpass(mix[1], 15500, 127)])
    ceiling = -1.6
    pad_ = int(0.05 * SR)                    # the film loops (the tock is sample 0): limit it wrapped round
    for _ in range(6):
        mix *= 10 ** ((target - lufs(mix)) / 20)
        ext = limiter(np.concatenate([mix[:, -pad_:], mix, mix[:, :pad_]], axis=1), ceiling)
        mix = ext[:, pad_:-pad_]
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
    fx = sfx()
    mix = master(mus, fx, target)
    m = loop_wrap(mus)
    g = 10 ** ((-16.0 - lufs(m)) / 20)
    write_wav(out / 'music.wav', np.clip(m * g, -1, 1))
    f = loop_wrap(fx)
    gs = 10 ** ((-16.0 - lufs(f)) / 20)
    write_wav(out / 'sfx.wav', np.clip(f * gs, -1, 1))
    write_wav(out / 'mix.wav', mix)
    info = {'lufs': round(lufs(mix), 2), 'true_peak_db': round(true_peak(mix), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP")
    return out / 'mix.wav', info
