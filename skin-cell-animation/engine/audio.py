"""Score and sound effects, synthesized in code (no samples): a calm, catchy chiptune loop that the skin plays along
with, built to be watched on repeat.

Chip voices: band-limited pulse waves (PolyBLEP), an NES-style triangle bass, LFSR noise drums, a short echo and FM
bells (the synth core is shared with the repo's other pixel films). 96 BPM in F major, 14 bars = 35 s, and it loops:
a hook phrase over F, a falling answer for the dive, a stretch that pops on the beat, then I-vi-IV-V while the cell
climbs and the hook phrase again at the top. Inside the cell (bars 4-7, Bb-F-Gm-C) the tune moves to a soft
music-box bell over a pad and a light pulse.

The sound follows the picture's own clock (engine/timeline.py): the whoosh of the flake lifting off on the first
downbeat; a stretch that snaps into a juicy pop when the cell divides; a soft pop for the pushes that follow; a
rising tick for every cell height the cell climbs (it climbs a scale); a crackle as granules form, a falling bloop as
the nucleus goes, a squish as it flattens; little tinks as the bonds between the dead cells break, and soft flicks
as tiles peel away; the water's hush swells at the end into the whoosh at the top of the loop. Inside the cell every
step has its own sound on the 16th-note grid: a zipper as the DNA opens, a rising blip per 16th as the RNA copy
grows, a plip as it leaves the nucleus, a clack per ribosome and a mallet note per protein bead, a hook per fibre,
and soft pings for the mitochondria's energy. The music is muffled while the camera is inside the skin (deepest in
the dive and on the way into and out of the cell), opens up inside the cell and opens fully at the surface.
"""
import math
import wave
import numpy as np
from . import timeline as T

SR = 48000
NT = int(round(T.TOTAL * SR))
N = NT + 4 * SR
STEP = T.BEAT / 4                 # one 16th = 0.15625 s at 96 BPM


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


# ---------------------------------------------------------------- the score (F major, 14 bars, loops)
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




# ================================================================ the score
from . import timeline as T

CHORD = {'F': (41, (0, 4, 7)), 'Dm': (38, (0, 3, 7)), 'Bb': (34, (0, 4, 7)), 'C': (36, (0, 4, 7)),
         'Gm': (43, (0, 3, 7))}
BARS = [('F', 'F'),        # 0  the hook: the flake lifts off on the downbeat
        ('Dm', 'Dm'),      # 1  the dive back into the skin
        ('Bb', 'C'),       # 2  a basal cell stretches; it pops on beat 3
        ('F', 'F'),        # 3  the climb: I
        ('Bb', 'Bb'),      # 4  the zoom into the cell; beat 3: through the membrane, the DNA unzips
        ('F', 'F'),        # 5  the RNA copy carries the recipe out
        ('Gm', 'Gm'),      # 6  ribosomes build keratin; the fibres hook on to the walls
        ('C', 'C'),        # 7  the mitochondria; beat 3: back out of the cell
        ('Dm', 'Dm'),      # 8  the climb goes on: vi
        ('Bb', 'Bb'),      # 9  IV
        ('C', 'C'),        # 10 V: it flattens into a dead cell
        ('F', 'F'),        # 11 the hook phrase again: at the top
        ('Bb', 'Bb'),      # 12 the bonds break, tiles peel away
        ('C', 'C')]        # 13 ready to lift off: back to the top of the loop
N_BARS = len(BARS)
assert abs(N_BARS * T.BAR - T.TOTAL) < 1e-9
assert abs(T.INSERT[0] - 4 * T.BAR) < 1e-9 and abs(T.INSERT[1] - 8 * T.BAR) < 1e-9
CELL_BARS = (4, 5, 6, 7)   # the look inside the cell
# the story's bar (0-9: the 10 bars of the story) that each film bar plays; the cell's bars have their own music
STORY_BAR = {0: 0, 1: 1, 2: 2, 3: 3, 8: 4, 9: 5, 10: 6, 11: 7, 12: 8, 13: 9}
STEP = T.STEP

LEAD = {
    0: seq('A5 .  C6 .  F6 -  -  E6 C6 -  A5 -  -  -  .  .'),
    1: seq('D6 .  A5 .  F5 .  D5 -  -  -  .  .  .  .  .  .'),
    2: seq('D5 .  F5 .  Bb5 - -  -  .  .  .  .  C6 .  E6 .'),
    3: seq('A5 .  A5 C6 .  A5 F5 .  G5 .  A5 .  C6 -  -  .'),
    8: seq('D6 .  D6 C6 .  A5 F5 .  E5 .  F5 .  A5 -  -  .'),
    9: seq('Bb5 . Bb5 A5 . F5 D5 .  F5 .  Bb5 . D6 -  -  .'),
    10: seq('C6 .  E6 .  G6 -  -  E6 C6 .  G5 .  C6 -  D6 .'),
    11: seq('A5 .  C6 .  F6 -  -  E6 C6 -  A5 -  -  -  .  .'),
    12: seq('Bb5 . D6 .  F6 -  -  D6 Bb5 - F5 -  -  -  .  .'),
    13: seq('G5 .  C6 .  E6 -  -  G6 E6 -  C6 -  .  .  .  .'),
}
_THIRD = {0: 4, 2: 3, 4: 3, 5: 4, 7: 4, 9: 3, 10: 4, 11: 3}
HARM = {b: [(s, l, m - _THIRD.get(m % 12, 3)) for s, l, m in LEAD[b]] for b in (3, 8, 9, 10, 11, 12, 13)}
# inside the cell the tune moves to a soft music-box bell, sparser, leaving room for the cell's own sounds; it rests
# through the zoom in and the zoom out
BELL = {
    4: seq('.  .  .  .  .  .  .  .  D5 .  F5 .  Bb5 - -  .'),
    5: seq('A5 .  F5 .  C5 .  .  .  A4 .  C5 .  F5 -  -  .'),
    6: seq('G5 .  D5 .  Bb4 . .  .  D5 .  G5 .  Bb5 - -  .'),
    7: seq('C6 .  G5 .  E5 .  .  .  .  .  .  .  .  .  .  .'),
}


def bar_t(b, step=0.0):
    return b * T.BAR + step * STEP


def chord_at(t):
    b = int(t // T.BAR) % N_BARS
    return CHORD[BARS[b][int((t % T.BAR) // (T.BAR / 2))]]


def _bass_notes(b, half, root):
    base = 8 * half
    if b in (0, 1):
        return [(0, 15.5, root, 0.3)] if half == 0 else []
    if b == 2:
        return [(base, 7.5, root, 0.3)]
    if b in CELL_BARS:                                      # inside the cell: long, floating notes
        return [(base, 7.5, root, 0.24)]
    return [(base + 2 * k, 1.5, root + iv, 0.26 if k % 2 else 0.32) for k, iv in enumerate((0, 12, 7, 12))]


def in_cell(t):
    return T.INSIDE[0] <= t < T.INSIDE[1]


def music():
    bus = {k: Bus() for k in ('lead', 'harm', 'arp', 'bass', 'drum', 'pad', 'bell')}
    for b in range(N_BARS):
        for s, l, m in LEAD.get(b, []):
            t0 = bar_t(b, s)
            dur = l * STEP * (0.88 if l <= 2 else 0.95)
            bus['lead'].put(lead(m, dur, 0.25, vib=0.14), t0, 0.17 if b not in (1,) else 0.12, 0.08)
        for s, l, m in HARM.get(b, []):
            bus['harm'].put(lead(m, l * STEP * 0.9, 0.125, vib=0.08), bar_t(b, s), 0.06, -0.3)
        for s, l, m in BELL.get(b, []):
            bus['bell'].put(bell(m, max(0.7, l * STEP + 0.5), 1.6, 3.5), bar_t(b, s), 0.2, 0.1)
            bus['bell'].put(bell(m + 12, 0.3, 0.8, 2.0), bar_t(b, s), 0.035, -0.2)
        sb = STORY_BAR.get(b)
        for half in (0, 1):
            root, iv = CHORD[BARS[b][half]]
            for st, l, m, g in _bass_notes(b, half, root):
                bus['bass'].put(bass(m, l * STEP), bar_t(b, st), g)
            tones = [root + 36 + iv[0], root + 36 + iv[1], root + 36 + iv[2], root + 48]
            base = 8 * half
            if b in CELL_BARS:                               # a music-box arpeggio while we are inside the cell
                if in_cell(bar_t(b, base)):
                    for k, pi in enumerate((0, 2, 1, 3, 2, 1, 3, 2)):
                        bus['arp'].put(chip_arp(tones[pi] + 12, STEP * 0.7, 0.5), bar_t(b, base + k),
                                       0.016, 0.45 if k % 2 else -0.45)
            elif 3 <= sb <= 6:
                up = 12 if sb >= 5 else 0                    # the arpeggio climbs with the cell
                for k, pi in enumerate((0, 1, 2, 3, 2, 1, 2, 3)):
                    bus['arp'].put(chip_arp(tones[pi] + up, STEP * 0.8), bar_t(b, base + k), 0.032, -0.45)
            elif sb >= 7:
                for k in range(4):
                    bus['arp'].put(chip_arp(tones[k] + 12, STEP * 1.5, 0.25), bar_t(b, base + 2 * k), 0.026, -0.45)
    for b in (0, 1, 2, 11, 12, 13) + CELL_BARS:              # a soft pad where the groove is not
        for half in (0, 1):
            root, iv = CHORD[BARS[b][half]]
            g = 0.055 if b in CELL_BARS else 0.045
            bus['pad'].put(pad([root + 36 + i for i in iv], T.BAR / 2 - 0.05, 0.12), bar_t(b, 8 * half), g)
    _drums(bus['drum'])
    mix = sum(x.x for x in bus.values())
    lead_st = bus['lead'].x + bus['harm'].x + 0.6 * bus['bell'].x
    mix = mix + 0.3 * np.stack([echo(lead_st.sum(0) * 0.5, 0.46875, 0.3), echo(lead_st.sum(0) * 0.5, 0.3125, 0.28)])
    mix = mix + 0.14 * reverb(mix - 0.9 * bus['bass'].x - 0.6 * bus['drum'].x)
    return mix


def _drums(d):
    K, Sn, Hc, C = kick(), snare(0.8), hat(False), crash()
    d.put(K, 0.0, 0.4)
    d.put(C, 0.0, 0.08, 0.1)
    d.put(K, bar_t(2), 0.32)
    d.put(K, bar_t(2, 8), 0.42)                               # with the pop
    for k in range(8, 16, 2):
        d.put(Hc, bar_t(2, k), 0.04, 0.3)
    for b in (3, 8, 9, 10, 11, 12, 13):
        sb = STORY_BAR[b]
        t0 = bar_t(b)
        for k in (0, 8):
            d.put(K, t0 + k * STEP, 0.36)
        if sb in (4, 6, 8):
            d.put(K, t0 + 14 * STEP, 0.22)
        if sb >= 4:
            for k in (4, 12):
                d.put(Sn, t0 + k * STEP, 0.13, 0.08)
        hats = range(0, 16, 1) if sb in (5, 6) else range(0, 16, 2)
        for k in hats:
            d.put(Hc, t0 + k * STEP, 0.05 if k % 4 == 2 else 0.028, 0.3)
    # inside the cell: through the membrane on beat 3 of bar 4, then a soft, light pulse (kick, rim, shaker)
    d.put(K, T.INSIDE[0], 0.3)
    d.put(C, T.INSIDE[0], 0.045, -0.1)
    rim = click(77, 1700, 0.03)
    k0 = int(round(T.INSIDE[0] / STEP))
    for k in range(k0, int(round(T.INSIDE[1] / STEP))):
        t = k * STEP
        j = k % 16
        if j in (0, 8) and t > T.INSIDE[0]:
            d.put(K, t, 0.24)
        if j in (4, 12):
            d.put(rim, t, 0.06, 0.15)
        d.put(Hc, t, 0.022 if j % 2 else 0.032, -0.3 if j % 4 == 2 else 0.3)
    # out of the cell: a tom run into the climb, and a crash as the story moves again
    for k, m in zip((12, 13, 14, 15), (45, 48, 52, 55)):
        d.put(tom(m), bar_t(7, k), 0.11 + 0.02 * (k - 12), -0.3 + 0.2 * (k - 12))
    d.put(K, bar_t(8), 0.4)
    d.put(C, bar_t(8), 0.07, 0.1)
    d.put(C, bar_t(11), 0.07, -0.15)


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


def flutter(dur, seed=0):
    """Paper-thin flake fluttering in water: soft noise opening and closing about 11 times a second."""
    y = bandnoise(dur, lambda tt: 1800.0 + 0.0 * tt, 0.9, seed)
    t = np.arange(len(y)) / SR
    am = 0.5 + 0.5 * np.sin(2 * math.pi * 11.0 * t) ** 2
    return y * am * np.minimum(1, t / 0.2) * np.clip((dur - t) / 0.5, 0, 1)


def flick(seed=0):
    """A dead tile peeling off: a soft, papery flick with a little upward chirp."""
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    y = highpass(white(n, seed), 2400, 63) * np.exp(-t / 0.018)
    ch = glide(900, 1400, 0.06, duty=0.5)
    y[:len(ch)] += 0.3 * ch[:n]
    return y


def tink(m, seed=0):
    """One bond letting go: a tiny high bell."""
    return bell(m, 0.32, 1.4, 3.0)


def water_bed():
    """The water's hush for the whole loop: bright noise with a slow swell that repeats exactly once per loop."""
    dur = T.TOTAL + 1.0
    y = bandnoise(dur, lambda tt: 900.0 + 300.0 * np.sin(2 * math.pi * 2 * tt / T.TOTAL), 1.1, 501)
    t = np.arange(len(y)) / SR
    am = 0.75 + 0.25 * np.sin(2 * math.pi * 5 * t / T.TOTAL)
    return y * am


def surface_gain(t):
    """How much of the water we hear: full at the surface, a muffled trace inside the skin."""
    t = np.asarray(t)
    inside = np.clip((t - 2.4) / 1.6, 0, 1) * np.clip((T.film(18.5) - t) / 2.0, 0, 1)
    return 1.0 - 0.8 * inside


def sfx():
    from . import scenes as SC
    from . import tissue as TS
    bus = Bus()
    # ---- the water, all the time (muffled inside), swelling into the whoosh at the top of the loop
    wb = water_bed()
    n = min(len(wb), N)
    tt = np.arange(n) / SR
    g = surface_gain(tt % T.TOTAL)
    inside = lowpass(wb[:n], 700, 255)
    bed = (wb[:n] * g + inside * (1 - g) * 0.8)
    swell = 1.0 + 1.6 * np.clip((tt - (T.TOTAL - 1.8)) / 1.8, 0, 1) ** 2 * (tt < T.TOTAL)
    bus.put(bed * swell, 0.0, 0.13, 0.0)
    # ---- the hook: the flake tears free and flutters off to the right
    bus.put(whoosh(0.9, 420, 2600, 11, 0.8, 0.25), 0.0, 0.34, 0.1)
    crack = highpass(white(int(0.22 * SR), 12), 3000, 63) * np.exp(-np.arange(int(0.22 * SR)) / SR / 0.05)
    bus.put(crack, 0.0, 0.16, 0.0)
    put_pan(bus, flutter(2.3, 13), 0.25, 0.34, 0.0, 0.8)
    # ---- the dive: a falling bloop and bubbles
    bus.put(glide(900, 160, 1.6, vib=0.02), 2.7, 0.06, 0.0)
    rng = np.random.default_rng(14)
    for k in range(10):
        bt = 2.7 + 2.0 * k / 10 + rng.uniform(0, 0.12)
        bus.put(blub(rng.uniform(380, 900), 0.07), bt, 0.08, rng.uniform(-0.5, 0.5))
    # ---- a caption appears: a soft tick
    for text, sub, anchor, t0, t1, side in SC.CAPTIONS:
        bus.put(click(40 + int(t0 * 10), 3800, 0.015), t0 % T.TOTAL, 0.07, 0.25)
    # ---- the division: the stretch, then the pop on beat 3 of bar 2
    bus.put(stretch(T.DIVIDE[1] - T.DIVIDE[0]), T.DIVIDE[0], 0.12, 0.0)
    bus.put(pop(300, 1300, 21, 0.5), T.DIVIDE[1], 0.62, 0.0)
    bus.put(bell(96, 0.5, 2.0, 2.0), T.DIVIDE[1] + 0.02, 0.07, 0.15)
    # ---- every push of the conveyor: a soft pop (cells dividing below), on the beat, pitched to the chord
    for i, (t0, d) in enumerate(T.STEPS):
        if abs(t0 - T.DIVIDE[1]) < 1e-6:
            continue
        tf = T.film(t0)
        root, iv = chord_at(tf + 0.01)
        m = root + 48 + iv[i % 3]
        gain = 0.34 if t0 < 11.5 else (0.2 if t0 < 16.0 else 0.1)
        bus.put(pop(mtof(m - 12), mtof(m), 30 + i, 0.2), tf + 0.01, gain, -0.3 + 0.6 * ((i * 7) % 5) / 4)
    # ---- the climb: a rising tick each time the cell moves up a whole cell height (a scale)
    scale = [65, 67, 69, 70, 72, 74, 76, 77, 79, 81, 82, 84]
    for k in range(1, T.N + 1):
        tk = T.film(round(T.P_inv(k - 0.02) / STEP) * STEP)
        bus.put(blip(mtof(scale[k - 1] + 12), mtof(scale[k - 1] + 12), 0.07, 0.5), tk, 0.07, 0.2)
    # ---- the granular layer: a faint crackle; the nucleus goes: a falling bloop; flattening: a squish
    t_gr = T.P_inv(4.6)
    rng = np.random.default_rng(15)
    for k in range(40):
        ct = t_gr + rng.uniform(0, T.P_inv(6.6) - t_gr)
        bus.put(click(200 + k, float(rng.uniform(2200, 5200)), 0.012), T.film(ct), 0.16, rng.uniform(-0.6, 0.6))
    bus.put(glide(620, 140, 0.45, duty=0.5), T.film(T.P_inv(6.75)), 0.07, 0.0)
    bus.put(squish(16), T.film(T.P_inv(7.1)), 0.12, -0.1)
    bus.put(blub(180.0, 0.14), T.film(17.45), 0.12, -0.2)                 # the lipid glue
    # ---- the bonds break (little tinks) and tiles peel away (soft flicks), all on the 16th-note grid
    taken = set()
    notes = (89, 91, 93, 96, 98, 100)
    for col in range(-4, 5):
        b = T.base(col)
        for m in range(-2, T.N + 2):
            for i in range(6):
                thr = 10.9 + 1.0 * TS.hsh(col, m % T.N, i, 4)
                Px = thr + m - b
                if 0.0 < Px <= T.N:
                    tx = round(T.P_inv(Px) / STEP) * STEP
                    if 16.5 <= tx < 24.4 and tx not in taken:
                        taken.add(tx)
                        bus.put(tink(notes[(col * 3 + m + i) % len(notes)]), T.film(tx), 0.17, 0.15 * col)
    used = set()
    for col, m, tx in SC.SHED:                                         # (film time)
        if abs(T.col_x(col)) <= 46.0 and T.film(16.0) <= tx < T.film(24.6):
            q = round(tx / STEP) * STEP
            if q in used:
                continue
            used.add(q)
            bus.put(flick(300 + col * 7 + m), q, 0.22, 0.12 * col)
    inside_sfx(bus)
    return bus.x


def pip(m, dur=0.16):
    """A protein bead clicking onto the chain: a short, soft mallet note."""
    return bell(m, dur, 0.8, 2.0)


def inside_sfx(bus):
    """The look inside the cell: the zoom in and out, and one sound for each thing the cell does, on the 16ths."""
    from . import inside as IN
    t_in = T.INSIDE[0]

    def grid(t):
        return round(t / STEP) * STEP

    # the zoom in: a rising rush, then through the membrane (beat 3 of bar 4) with a deep bloop
    bus.put(whoosh(T.ZOOM_IN[1] - T.ZOOM_IN[0] + 0.05, 260, 2400, 601, 0.9, 0.95), T.ZOOM_IN[0], 0.22, 0.0)
    bus.put(plip(220, 640, 0.32, 0.5, 0.4, 602), t_in, 0.4, 0.0)
    for text, sub, t0, t1, side in IN.CAPTIONS:                        # the captions' soft ticks
        bus.put(click(620 + int(t0 * 10), 5200, 0.015), t_in + t0, 0.16, 0.25)
    # 1. DNA: the gene unzips, a little zipper running left to right
    z0, z1 = t_in + 0.25, t_in + 1.0
    for i in range(18):
        x = i / 17
        bus.put(click(640 + i, 1700 + 1900 * x, 0.02), z0 + (z1 - z0) * x ** 0.85, 0.085, -0.35 + 0.7 * x)
    # 2. RNA: one blip per 16th while the copy grows along the gene (a rising scale) ...
    scale = (65, 67, 69, 72, 74, 77, 79)
    ks = range(int(math.ceil((t_in + 1.0) / STEP)), int(math.floor((t_in + 2.0) / STEP)) + 1)
    for j, k in enumerate(ks):
        m = scale[min(j, len(scale) - 1)] + 12
        bus.put(blip(mtof(m), mtof(m), 0.07, 0.25), k * STEP, 0.09, -0.2 + 0.08 * j)
    # ... a slurp as it squeezes out through the pore, a plip as it comes free, a soft landing in the cytoplasm
    us = np.linspace(2.0, 3.0, 2001)
    heads = np.array([IN.rna_state(x)[1] for x in us])
    t_pore = t_in + float(us[np.searchsorted(heads, IN.RNA_PORE_D)])
    bus.put(glide(330, 880, 0.24, duty=0.5), t_pore - 0.2, 0.05, 0.15)
    bus.put(plip(520, 1150, 0.14, 0.0, 0.2, 650), t_pore + 0.04, 0.22, 0.2)
    bus.put(blub(200.0, 0.14), t_in + 3.0, 0.1, -0.1)
    # 3. ribosomes clamp on (two 16ths apart, the last on the downbeat of bar 6), then a bead per 16th, rising
    for i, r0 in enumerate(IN.RIBO_T0):
        bus.put(thump(300, 130, 0.13, 0.8, 660 + i), t_in + r0, 0.2, -0.3 + 0.3 * i)
        bus.put(click(670 + i, 1500, 0.025), t_in + r0, 0.1, -0.3 + 0.3 * i)
    beads = sorted({grid(t_in + r0 + (j + 1) * STEP) for r0 in IN.RIBO_T0 for j in range(IN.BEADS)})
    last = t_in + IN.FIBER_END[0] - 2 * STEP
    notes = (77, 79, 81, 84, 86, 89, 91, 93)
    for j, bt in enumerate(b for b in beads if b <= last):
        bus.put(pip(notes[j % len(notes)] - (12 if (j // len(notes)) % 2 else 0)), bt, 0.07, 0.35 * math.sin(j))
    # 4. keratin fibres stretch across the cell and hook on to the walls, one 16th apart, up the chord
    f0 = t_in + IN.FIBER_END[0] - IN.FIBER_GROW
    bus.put(glide(260, 620, IN.FIBER_GROW + 0.1, vib=0.01, duty=0.5), f0, 0.035, -0.4)
    bus.put(glide(262, 627, IN.FIBER_GROW + 0.1, vib=0.01, duty=0.5), f0 + STEP, 0.035, 0.4)
    for i, (fe, m) in enumerate(zip(IN.FIBER_END, (79, 82, 86, 91, 94, 96))):
        side = IN.FIBERS[i][2]
        bus.put(click(680 + i, 2000, 0.03), t_in + fe, 0.12, 0.5 * side)
        bus.put(bell(m, 0.3, 1.2, 1.0), t_in + fe, 0.11, 0.5 * side)
    # 5. the mitochondria light up (a warm swell) and energy sparks stream to the ribosomes (soft pings on the 8ths)
    bus.put(warm_tone(60, 1.7), t_in + 5.9, 0.16, 0.0)
    rng = np.random.default_rng(690)
    pent = (84, 86, 88, 91, 93, 96)
    for k in range(int(round((t_in + 6.25) / STEP)), int(round(T.INSIDE[1] / STEP)), 2):
        bus.put(bell(int(rng.choice(pent)), 0.26, 1.4, 3.0), k * STEP, 0.055, float(rng.uniform(-0.6, 0.6)))
    # the zoom out: a bloop out through the membrane (pitch falling) and a falling rush back to the tissue
    bus.put(plip(760, 250, 0.26, 0.3, 0.35, 695), T.ZOOM_OUT[0], 0.32, 0.0)
    bus.put(whoosh(T.ZOOM_OUT[1] - T.ZOOM_OUT[0], 2400, 300, 696, 0.9, 0.12), T.ZOOM_OUT[0], 0.18, 0.0)


def duck_env():
    """The music steps back for the whoosh and the pop."""
    t = np.arange(N) / SR
    g = np.ones(N)
    for t0, depth, hold in ((0.0, 0.4, 0.25), (T.DIVIDE[1], 0.35, 0.12), (T.INSIDE[0], 0.25, 0.1),
                            (T.ZOOM_OUT[0], 0.25, 0.1)):
        a = np.clip((t - (t0 - 0.02)) / 0.02, 0, 1) * np.clip(1 - (t - t0 - hold) / 0.35, 0, 1)
        g -= depth * a * (t >= t0 - 0.02)
    return np.clip(g, 0.4, 1)


def inside_filter(mus):
    """Muffle the music while the camera is inside the skin: crossfade to a low-passed copy, deepest in the dive and
    on the way into and out of the cell. Inside the cell itself the music opens up again."""
    t = np.arange(mus.shape[1]) / SR % T.TOTAL
    dive = np.clip((t - 2.5) / 1.0, 0, 1) * np.clip((5.6 - t) / 0.8, 0, 1)
    z_in = np.clip((t - (T.ZOOM_IN[0] + 0.2)) / 0.9, 0, 1) * np.clip((T.ZOOM_IN[1] - t) / 0.04, 0, 1)
    z_out = np.clip((t - T.ZOOM_OUT[0]) / 0.04, 0, 1) * np.clip((T.ZOOM_OUT[1] - t) / 1.2, 0, 1)
    deep = np.maximum(dive, np.maximum(z_in, z_out))
    cell = np.clip((t - T.INSIDE[0]) / 0.04, 0, 1) * np.clip((T.INSIDE[1] - t) / 0.04, 0, 1)
    inside = np.clip((t - 2.5) / 1.0, 0, 1) * np.clip((T.film(18.5) - t) / 2.0, 0, 1) * (1 - cell)
    lo = np.stack([lowpass(mus[0], 900, 255), lowpass(mus[1], 900, 255)])
    mid = np.stack([lowpass(mus[0], 3200, 255), lowpass(mus[1], 3200, 255)])
    w_lo = 0.85 * deep
    w_mid = 0.6 * inside * (1 - deep)
    return mus * (1 - w_lo - w_mid) + lo * w_lo + mid * w_mid


def loop_wrap(x):
    """Fold everything that rings past the end back onto the start, so the loop is seamless."""
    y = x[:, :NT].copy()
    tail = x[:, NT:]
    k = min(tail.shape[1], NT)
    y[:, :k] += tail[:, :k]
    return y


def master(mus, fx, target=-14.0):
    mix = loop_wrap(0.62 * inside_filter(mus) * duck_env()[None, :] + 1.5 * fx)
    mix = np.stack([lowpass(mix[0], 15500, 127), lowpass(mix[1], 15500, 127)])
    ceiling = -1.6
    pad_ = int(0.05 * SR)                    # the film loops (the whoosh is sample 0): limit it wrapped round
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
