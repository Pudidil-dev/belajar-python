"""Score and sound effects, synthesized in code (no samples): a fun 8-bit quest theme that the machine plays along with.

Chip voices: band-limited pulse waves (PolyBLEP), an NES-style triangle bass, LFSR noise drums, a short echo and FM
bells (the synth core is shared with the repo's other pixel films). 120 BPM in C major, 10 bars = 20 s, and it loops.

The hook opens on the downbeat with the POP and a crash, then freezes (a record scratch) while a three-note question
asks "how did I get in here?". The rewind is the whole mix played backward at tape speed. From LV.1 the machine plays
along: each air puff blows a pocket up a C major chord, the vibrating lane buzzes in the key, the capsules dropping into
their pockets play a music-box arpeggio (one note per 8th; the empty pocket goes "bonk", the hero's lands on the top
note with a pick-up chime), the scanner beeps in 16ths over a tense Dm-E bar, the punches are the stop-time hits, the
final boss gets a minor-key riff, and the press is a snare build-up that lands on the POP at the top of the loop.
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
CHORD = {'C': (48, (0, 4, 7)), 'Am': (45, (0, 3, 7)), 'F': (41, (0, 4, 7)), 'G': (43, (0, 4, 7)),
         'Dm': (38, (0, 3, 7)), 'E': (40, (0, 4, 7))}
BARS = [('C', 'G'),        # 0  the hook: POP! on the downbeat, then the question, frozen
        ('C', 'C'),        # 1  (the rewind plays here)
        ('C', 'Am'),       # 2  LV.1 pockets: the quest theme starts
        ('F', 'G'),        # 3  LV.2 line up
        ('C', 'Am'),       # 4  LV.3 drop: the capsules play the tune
        ('Dm', 'E'),       # 5  LV.4 scan: will it pass?
        ('F', 'G'),        # 6  LV.5 seal
        ('Am', 'F'),       # 7  LV.6 cut: stop-time on the two punches
        ('Am', 'Am'),      # 8  FINAL BOSS
        ('F', 'G')]        # 9  the press: a build-up that resolves on the POP (bar 0)
N_BARS = len(BARS)
assert N_BARS * T.BAR == T.TOTAL

LEAD = {
    0: seq('.  .  E6 D6 G6 -  -  -  .  .  .  .  .  .  .  .'),    # "how did I get in here?" (with the text)
    2: seq('E5 -  G5 -  C6 -  -  B5 A5 -  G5 -  E5 -  -  -'),
    3: seq('F5 -  A5 -  C6 -  -  A5 G5 -  F5 -  D5 -  G5 -'),
    5: seq('D5 .  .  F5 .  .  A5 .  G#5 . .  B5 .  .  E5 .'),   # staccato: tension under the scan
    6: seq('F5 -  A5 C6 -  -  A5 -  G5 -  B5 D6 -  -  -  -'),
    7: seq('.  .  .  .  A5 .  .  .  F5 .  .  .  .  .  E5 G5'),   # hits with the punches (beats 2 and 3)
    8: seq('A4 .  A4 C5 .  A4 E5 .  D5 .  C5 .  B4 .  G#4 .'),  # the boss riff
    9: seq('A4 B4 C5 D5 E5 F5 G5 A5 B5 C6 D6 E6 F6 G6 .  .'),   # up and up; the last 16th is silent
}
STACCATO = (5, 7, 8, 9)
_THIRD = {0: 4, 2: 3, 4: 3, 5: 4, 7: 4, 9: 3, 11: 3}
HARM = {b: [(s, l, m - _THIRD.get(m % 12, 3)) for s, l, m in LEAD[b]] for b in (2, 3, 6)}


def bar_t(b, step=0.0):
    return b * T.BAR + step * STEP


def _bass_notes(b, half, root):
    base = 8 * half
    if b == 0:
        return [(0, 1.5, root, 0.34)] if half == 0 else []
    if b in (2, 3, 6):                                        # bouncy: root, octave, fifth, octave
        return [(base + 2 * k, 1.4, root + iv, 0.3) for k, iv in enumerate((0, 12, 7, 12))]
    if b == 4:
        return [(base, 3.5, root, 0.28), (base + 4, 3.5, root + 7, 0.24)]
    if b == 5:
        return [(base + 2 * k, 0.9, root + (12 if k % 2 else 0), 0.28) for k in range(4)]
    if b == 7:
        if half == 0:
            return [(4, 1.0, root, 0.36)]
        return [(0, 1.0, root, 0.36)] + [(4 + 2 * k, 1.4, m, 0.26) for k, m in enumerate((45, 47, 48, 50))]
    if b == 8:
        return [(base + k, 0.8, root + (12 if k % 2 else 0), 0.3) for k in range(0, 8)]
    if b == 9:
        return [(base + 2 * k, 1.6, root + (0, 12, 7, 12)[k], 0.3) for k in range(4)]
    return []


def music():
    bus = {k: Bus() for k in ('lead', 'harm', 'arp', 'bass', 'drum', 'pad')}
    for b in range(N_BARS):
        if b == 1:
            continue
        for s, l, m in LEAD.get(b, []):
            t0 = bar_t(b, s)
            dur = l * STEP * (0.9 if l <= 2 else 0.96)
            if b in STACCATO:
                bus['lead'].put(lead(m, STEP * 0.7, 0.125, vib=0.0), t0, 0.17, 0.12 * (1 if s % 4 else -1))
            elif b == 0:
                bus['lead'].put(lead(m, dur, 0.25, vib=0.3, slide_from=m - 2 if s == 4 else None), t0, 0.2, 0.0)
            else:
                bus['lead'].put(lead(m, dur, 0.25), t0, 0.19, 0.05)
        for s, l, m in HARM.get(b, []):
            bus['harm'].put(lead(m, l * STEP * 0.9, 0.125, vib=0.1), bar_t(b, s), 0.08, -0.3)
        for half in (0, 1):
            root, iv = CHORD[BARS[b][half]]
            for st, l, m, g in _bass_notes(b, half, root):
                bus['bass'].put(bass(m, l * STEP), bar_t(b, st), g)
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            base = 8 * half
            if b in (2, 3, 6):
                for k in range(4):
                    bus['arp'].put(chip_arp(tones[k], STEP * 1.6, 0.25), bar_t(b, base + 2 * k), 0.035, -0.45)
            elif b in (5, 8):
                for k, p in enumerate((0, 1, 2, 3, 2, 1, 2, 3)):
                    bus['arp'].put(chip_arp(tones[p], STEP * 0.85), bar_t(b, base + k), 0.04, -0.5)
            elif b == 9:
                for k in range(8):
                    bus['arp'].put(chip_arp(tones[k % 4] + (12 if half else 0), STEP * 0.85), bar_t(b, base + k), 0.03 + 0.012 * k, -0.4)
    # the hook: a bright stab on the POP, then a high shimmer while time hangs
    bus['pad'].put(pad([72, 76, 79, 84], 0.25, 0.005), 0.0, 0.16)
    bus['pad'].put(pad([79, 83, 86], 1.2, 0.3), 0.55, 0.05)
    bus['pad'].put(pad([60, 64, 67], 1.9, 0.4), bar_t(4), 0.05)
    _drums(bus['drum'])
    mix = sum(x.x for x in bus.values())
    lead_st = bus['lead'].x + bus['harm'].x
    mix = mix + 0.35 * np.stack([echo(lead_st.sum(0) * 0.5, 0.375, 0.3), echo(lead_st.sum(0) * 0.5, 0.25, 0.28)])
    mix = mix + 0.12 * reverb(mix - 0.9 * bus['bass'].x - 0.6 * bus['drum'].x)
    return mix


def _drums(d):
    K, Sn, Hc, Ho, C = kick(), snare(), hat(False), hat(True), crash()
    d.put(C, 0.0, 0.18, 0.1)                                  # the POP
    d.put(K, 0.0, 0.45)
    for b in (2, 3, 6):
        t0 = bar_t(b)
        for k in (0, 6, 8):
            d.put(K, t0 + k * STEP, 0.4)
        for k in (4, 12):
            d.put(Sn, t0 + k * STEP, 0.22, 0.08)
        for k in range(0, 16, 2):
            d.put(Hc, t0 + k * STEP, 0.07 if k % 4 == 2 else 0.04, 0.3)
    d.put(C, bar_t(2), 0.14, -0.1)
    for i, m in enumerate((57, 55, 52, 48)):                  # a tom fill into the drop
        d.put(tom(m), bar_t(3, 12 + i), 0.18, 0.3 - 0.2 * i)
    t0 = bar_t(4)                                             # LV.3: light, so the capsules can sing
    d.put(K, t0, 0.36)
    d.put(K, t0 + 8 * STEP, 0.3)
    d.put(Sn, t0 + 12 * STEP, 0.14, 0.08)
    for k in range(2, 16, 4):
        d.put(Hc, t0 + k * STEP, 0.03, 0.3)
    t0 = bar_t(5)                                             # LV.4: a heartbeat kick
    for k in (0, 4, 8, 12):
        d.put(K, t0 + k * STEP, 0.3)
    d.put(C, bar_t(6), 0.12, 0.2)
    for tt in (T.THUNK_REJ, T.THUNK_HERO):                    # LV.6: stop-time on the punches
        d.put(K, tt, 0.45)
        d.put(C, tt, 0.1, 0.0)
    for k in range(8, 16):
        d.put(Sn, bar_t(7, k), 0.05 + 0.025 * (k - 8), 0.08)
    t0 = bar_t(8)                                             # the boss: driving
    d.put(C, t0, 0.2, 0.0)
    for k in range(0, 16, 2):
        d.put(K, t0 + k * STEP, 0.38)
    for k in (4, 12):
        d.put(Sn, t0 + k * STEP, 0.24, 0.08)
    for k in range(16):
        d.put(Hc, t0 + k * STEP, 0.06 if k % 2 else 0.035, 0.3)
    t0 = bar_t(9)                                             # the press: a snare roll that keeps speeding up
    for k in (0, 4, 8, 12):
        d.put(K, t0 + k * STEP, 0.36)
    tt = t0
    while tt < T.TOTAL - STEP:
        u = (tt - t0) / (T.BAR - STEP)
        d.put(Sn, tt, 0.06 + 0.2 * u, 0.08)
        tt += STEP * (2 if u < 0.5 else 1 if u < 0.75 else 0.5)


# ================================================================ sound effects
def pop_sfx():
    """The capsule bursting through the foil: a low thump, a bright pok, and a crinkle."""
    pok = glide(900, 1500, 0.07)
    crink = highpass(white(int(0.14 * SR), 5), 3000, 63) * env_exp(int(0.14 * SR), 0.03)
    th = thump(240, 80, 0.16, 0.7, 4)
    n = max(len(pok), len(crink), len(th))
    out = np.zeros(n)
    out[:len(th)] += 0.9 * th
    out[:len(pok)] += 0.7 * pok
    out[:len(crink)] += 0.6 * crink
    return out


def scratch():
    """A record scratch: noise whose pitch whips up and down."""
    dur = 0.22
    y = bandnoise(dur, lambda tt: 500.0 + 2600.0 * np.abs(np.sin(2 * math.pi * 6.0 * tt)), 0.5, 21)
    x = np.arange(len(y)) / SR
    return y * np.minimum(1, x / 0.005) * np.exp(-x / 0.12)


def slam(seed=0):
    """The punch: a heavy metal slam with a short ring."""
    th = thump(130, 42, 0.34, 0.9, seed)
    ring = bell(64, 0.5, 3.2, 1.41)
    n = max(len(th), len(ring))
    out = np.zeros(n)
    out[:len(th)] += th
    out[:len(ring)] += 0.35 * ring
    return out


def buzzer():
    """Wrong answer: two low square waves beating against each other."""
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    y = 0.5 * pulse(110.0, n, 0.5) + 0.5 * pulse(116.5, n, 0.5)
    return lowpass(y, 2400, 63) * np.minimum(1, t / 0.005) * np.clip((0.32 - t) / 0.05, 0, 1)


def boss_hit():
    """The final boss arrives: a low, wide brass-like chord with a slow filter."""
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    y = sum(pulse(f, n, 0.5) * g for f, g in ((55.0, 0.5), (82.4, 0.35), (110.0, 0.3), (130.8, 0.2)))
    y = lowpass(y, 900, 127)
    return y * np.minimum(1, t / 0.01) * np.exp(-t / 0.45)


def strain(dur):
    """The dome under the thumb: a rising, creaking tone and more and more foil crackle."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 160 * (5.0 ** (t / dur))
    y = 0.4 * pulse(f, n, 0.18) * (t / dur) ** 1.5
    rng = np.random.default_rng(9)
    for _ in range(70):
        s = int(dur * SR * (rng.uniform(0, 1) ** 0.45))
        k = click(int(rng.integers(0, 999)), float(rng.uniform(2500, 6000)), 0.01)
        y[s:s + len(k)] += 0.5 * k[:n - s] * (s / n)
    return lowpass(y, 5000, 63)


def sfx():
    bus = Bus()
    # ---- the hook: POP, the capsule shoots up, the record scratch, the clock while time hangs, the rewind cue
    bus.put(pop_sfx(), T.POP, 0.75, 0.0)
    bus.put(whoosh(0.4, 500, 2600, 1, 0.8, 0.25), T.POP + 0.01, 0.12, -0.1)
    bus.put(scratch(), T.FREEZE[0], 0.5, 0.15)
    for tt in (1.0, 1.5):
        bus.put(click(30 + int(tt * 10), 3200, 0.02), tt, 0.16, 0.3)
    bus.put(click(41, 1500, 0.04), T.REW_CUE, 0.3, 0.0)
    bus.put(thump(160, 70, 0.1, 0.5, 42), T.REW_CUE, 0.12, 0.0)
    # ---- every level: a swish and a two-note "level start"
    for i, t0 in enumerate(T.LV):
        bus.put(whoosh(0.2, 2600, 900, 50 + i, 0.8, 0.3), t0 + 0.04, 0.14, 0.4)
        bus.put(blip(mtof(96), mtof(96), 0.06, 0.5), t0 + 0.1, 0.12, 0.3)
        bus.put(blip(mtof(103), mtof(103), 0.09, 0.5), t0 + 0.17, 0.12, 0.3)
    # ---- LV.1: the clamp, five air puffs that blow the pockets up a chord, the mould opening
    bus.put(thump(180, 70, 0.14, 0.7, 6), T.CLAMP, 0.32, -0.2)
    bus.put(click(7, 1800, 0.03), T.CLAMP, 0.25, -0.2)
    for i, (tt, m) in enumerate(zip(T.PUFFS, (72, 76, 79, 84, 88))):
        bus.put(hiss(0.13, 6000, 2500, 60 + i, 0.1, 3.0), tt - 0.02, 0.32, -0.3 + 0.15 * i)
        bus.put(plip(mtof(m) * 0.5, mtof(m), 0.16, 0.0, 0.1, 70 + i), tt, 0.32, -0.3 + 0.15 * i)
    bus.put(bell(96, 0.7, 2.0, 2.0), T.PUFFS[3] + 0.06, 0.06, 0.2)                 # YOUR POCKET
    bus.put(hiss(0.18, 4000, 1500, 80, 0.2, 2.5), T.OPEN, 0.26, -0.2)
    heat = bandnoise(2.0, lambda tt: 300.0 + 0.0 * tt, 0.6, 81)
    bus.put(heat * np.minimum(1, np.arange(len(heat)) / SR / 0.3) * np.clip((2.0 - np.arange(len(heat)) / SR) / 0.3, 0, 1),
            T.LV[0], 0.05, -0.3)
    # ---- LV.2: the vibrating lane buzzes in the key; the queue shuffles at each release
    n = int(2.6 * SR)
    tt_ = np.arange(n) / SR
    buzz = pulse(130.8, n, 0.3) * (0.6 + 0.4 * np.sign(np.sin(2 * math.pi * 30 * tt_)))
    buzz = lowpass(buzz, 2600, 63) * np.minimum(1, tt_ / 0.3) * np.clip((2.6 - tt_) / 0.4, 0, 1)
    bus.put(buzz, T.LV[1], 0.11, 0.2)
    for k, t, kind in T.QUEUE:
        rel = t - T.FALL
        if 6.0 <= rel < 8.0:
            bus.put(click(90 + k, 2600, 0.015), rel, 0.16, 0.25)
    bus.put(blip(mtof(88), mtof(95), 0.08, 0.5), 7.32, 0.14, 0.3)                  # YOU slides into line
    # ---- LV.3: the capsules land on a music-box arpeggio; the empty pocket bonks; the hero gets the top note
    notes = {8: 84, 7: 88, 6: 91, 4: 88, 3: 96, 2: 91, 1: 88, 0: 84}
    for k, t, kind in T.QUEUE:
        if not (7.9 <= t <= 10.1):
            continue
        if kind == 'gap':
            bus.put(thump(110, 60, 0.14, 0.2, 90), t, 0.3, 0.1)
            bus.put(glide(400, 180, 0.22, duty=0.5), t + 0.02, 0.06, 0.1)
            continue
        m = notes.get(k, 84)
        bus.put(bell(m, 0.55, 1.6, 4.0), t, 0.13 if kind == 'pill' else 0.18, 0.05 * (k % 3 - 1))
        bus.put(click(100 + k, 3600, 0.012), t - T.FALL, 0.05, -0.2)
        if kind == 'hero':
            bus.put(blip(mtof(91), mtof(91), 0.06, 0.5), t + 0.02, 0.07, 0.0)
            bus.put(blip(mtof(96), mtof(96), 0.16, 0.5), t + 0.09, 0.07, 0.0)
            for j, mm in enumerate((84, 88, 91, 96, 100)):
                bus.put(blip(mtof(mm), mtof(mm + 5), 0.05, 0.5), t + 0.18 + 0.045 * j, 0.035, -0.3 + 0.15 * j)
    # ---- LV.4: scanner beeps in 16ths; the empty pocket buzzes; PASS chimes
    for tt in T.SCAN_REJ[:-1] + T.SCAN_HERO:
        bus.put(beep(2093.0, 0.045, 0.5), tt, 0.06, 0.2)
    bus.put(buzzer(), T.VERDICT_REJ, 0.22, 0.0)
    for j, mm in enumerate((96, 100, 103, 108)):
        bus.put(bell(mm, 0.7, 2.0, 2.0), T.VERDICT_PASS + 0.05 * j, 0.06, -0.2 + 0.15 * j)
    # ---- LV.5: the hot roller sizzles; the top-view window pops; the shield bounces a drop and a bubble off
    n = int(1.3 * SR)
    sz = bandnoise(1.3, lambda tt: 5200.0 + 0.0 * tt, 0.7, 120)
    crackle = np.zeros(n)
    rng = np.random.default_rng(121)
    for _ in range(60):
        s = int(rng.uniform(0, 1.25) * SR)
        k = click(int(rng.integers(0, 999)), float(rng.uniform(3000, 7000)), 0.006)
        crackle[s:s + len(k)] += k[:n - s]
    e = np.minimum(1, np.arange(n) / SR / 0.1) * np.clip((1.3 - np.arange(n) / SR) / 0.2, 0, 1)
    bus.put((0.6 * sz[:n] + 0.5 * crackle) * e, 12.12, 0.3, 0.1)
    bus.put(blip(mtof(96), mtof(108), 0.08, 0.5), 12.45, 0.14, 0.3)
    bus.put(glide(1900, 900, 0.26, duty=0.25), T.BLOCKS[0] - 0.27, 0.035, -0.3)
    bus.put(boing(420, 0.28), T.BLOCKS[1] - 0.28, 0.05, 0.3)
    for i, tb in enumerate(T.BLOCKS):
        bus.put(glass_ping(2637 if i == 0 else 3136, 0.45, 130 + i), tb, 0.26, -0.3 + 0.6 * i)
        bus.put(click(132 + i, 4200, 0.02), tb, 0.2, -0.3 + 0.6 * i)
    # ---- LV.6: the punches, the air jet, the bin, the stack
    bus.put(slam(140), T.THUNK_REJ, 0.42, 0.0)
    bus.put(slam(141), T.THUNK_HERO, 0.42, 0.0)
    bus.put(hiss(0.32, 5000, 1600, 142, 0.08, 2.2), T.BLAST, 0.2, 0.4)
    bus.put(thump(260, 120, 0.1, 0.8, 143), T.BIN_LAND, 0.2, 0.5)
    bus.put(glass_ping(1320, 0.35, 144), T.BIN_LAND, 0.05, 0.5)
    bus.put(click(145, 2200, 0.03), T.STACK_LAND, 0.24, 0.0)
    bus.put(thump(300, 160, 0.06, 0.6, 146), T.STACK_LAND, 0.12, 0.0)
    # ---- the final boss: it arrives, grabs the card, lifts it; the thumb comes in and presses
    bus.put(boss_hit(), T.FINAL, 0.42, 0.0)
    bus.put(glass_ping(220, 1.2, 149), T.FINAL, 0.12, 0.0)                         # a gong-like ring
    bus.put(whoosh(0.5, 1800, 350, 150, 0.8, 0.6), T.HAND_IN[0], 0.08, -0.4)
    bus.put(thump(320, 140, 0.08, 0.6, 151), T.GRAB, 0.2, -0.3)
    bus.put(whoosh(0.8, 350, 1600, 152, 0.8, 0.5), T.LIFT[0], 0.32, -0.2)
    bus.put(whoosh(0.9, 400, 1400, 153, 0.8, 0.6), T.THUMB_IN[0], 0.32, 0.4)
    bus.put(strain(T.PRESS[1] - T.PRESS[0] - 0.02), T.PRESS[0], 0.2, 0.1)
    return bus.x


def duck_env():
    """The music steps back for the big hits: the POP, the hero's landing, the verdicts, the punches, the boss."""
    t = np.arange(N) / SR
    g = np.ones(N)
    for t0, depth, hold in ((T.POP, 0.45, 0.1), (T.HERO_LAND, 0.25, 0.1), (T.VERDICT_REJ, 0.3, 0.25),
                            (T.VERDICT_PASS, 0.2, 0.1), (T.THUNK_REJ, 0.35, 0.08), (T.THUNK_HERO, 0.35, 0.08),
                            (T.FINAL, 0.25, 0.2)):
        a = np.clip((t - (t0 - 0.02)) / 0.02, 0, 1) * np.clip(1 - (t - t0 - hold) / 0.3, 0, 1)
        g -= depth * a * (t >= t0 - 0.02)
    return np.clip(g, 0.4, 1)


def loop_wrap(x):
    """Fold everything that rings past the end back onto the start, so the loop is seamless."""
    y = x[:, :NT].copy()
    tail = x[:, NT:]
    k = min(tail.shape[1], NT)
    y[:, :k] += tail[:, :k]
    return y


def rewind(mix):
    """The rewind: the whole mix played backward at tape speed along the picture's own rewind curve (slow-fast-slow,
    from the hook back through the loop point to LV.1), muffled, with a tape whir and a warble."""
    r0, r1 = int(round(T.REWIND[0] * SR)), int(round(T.REWIND[1] * SR))
    n = r1 - r0
    tt = T.REWIND[0] + np.arange(n) / SR
    coarse = np.array([T.rewind_source(x) for x in tt[::48]])
    pos = np.interp(np.arange(n), np.arange(0, n, 48)[:len(coarse)], coarse) * SR
    ext = np.concatenate([mix, mix[:, :SR]], axis=1)              # the loop point: 20 s runs on into 0 s
    src = np.arange(ext.shape[1])
    rev = np.stack([np.interp(pos, src, ext[ch]) for ch in range(2)])
    rev = np.stack([lowpass(rev[0], 6000, 127), lowpass(rev[1], 6000, 127)])
    speed = np.abs(np.gradient(np.unwrap(pos / (NT) * 2 * math.pi) * NT / (2 * math.pi)))
    sp = speed / max(speed.max(), 1e-9)
    rev *= (0.6 + 0.08 * np.sin(2 * math.pi * 8.5 * (tt - T.REWIND[0])))[None, :]
    whir = bandnoise(n / SR, lambda x: 500 + 3200 * np.interp(x, np.arange(n)[::480] / SR, sp[::480]), 0.8, 91)
    whir = whir[:n] * np.clip(sp * 1.4, 0, 1) ** 0.7
    hum = pulse(70 + 260 * sp, n, 0.5) * np.clip(sp * 1.4, 0, 1) * 0.25
    out = rev + 0.15 * np.stack([whir, whir]) + 0.05 * np.stack([hum, hum])
    k = click(92, 1800, 0.05)
    out[:, :len(k)] += 0.45 * k
    out[:, -len(k):] += 0.3 * k                                  # the tape stops: PLAY
    e = int(0.006 * SR)
    out[:, :e] *= np.linspace(0, 1, e)
    out[:, -e:] *= np.linspace(1, 0, e)
    res = mix.copy()
    f = int(0.01 * SR)
    res[:, r0 - f:r0] *= np.linspace(1, 0, f)[None, :]
    res[:, r0:r1] = out
    res[:, r1:r1 + f] *= np.linspace(0, 1, f)[None, :]
    return res


def master(mus, fx, target=-14.0):
    mix = loop_wrap(0.62 * mus * duck_env()[None, :] + 1.5 * fx)
    mix = rewind(mix)
    mix = np.stack([lowpass(mix[0], 15500, 127), lowpass(mix[1], 15500, 127)])
    ceiling = -1.6
    pad = int(0.05 * SR)                       # the film loops (the POP is sample 0): limit it wrapped round
    for _ in range(6):
        mix *= 10 ** ((target - lufs(mix)) / 20)
        ext = limiter(np.concatenate([mix[:, -pad:], mix, mix[:, :pad]], axis=1), ceiling)
        mix = ext[:, pad:-pad]
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
