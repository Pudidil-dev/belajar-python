"""Score and sound effects, synthesized in code (no samples): a fun 8-bit lab theme and arcade foley.

Chip voices: band-limited pulse waves (PolyBLEP), an NES-style triangle bass, LFSR noise drums, a short echo and FM
bells (the synth core is shared with the repo's other pixel films). 120 BPM in C major, 15 bars = 30 s.

The hook is a beat drop: four toms fall with the tube, the switch CLICKs on beat 2, and one 16th later the motor and
the music drop in together. The motor hum is tuned to the key (C3 at full speed) and pulses in 16ths, so it grooves;
in the slow motion inside the tube it sinks to a deep, slow wub. The x-ray gets a clockwork groove and a circling
"orbit" figure; the slow motion gets bells over a half-time beat and a snare roll into the item-get fanfare (MIXED!).
When the tube comes off, the whole band winds down with the motor (a tape stop). Then battle music for DIFFUSION vs
VORTEX, a VS slam, an original victory jingle, a clink, three star dings and a ta-da. The last three seconds are the
whole mix played backward at tape speed, landing on the opening, so the video loops.
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
         'Em': (40, (0, 3, 7)), 'Dm': (38, (0, 3, 7)), 'E': (40, (0, 4, 7))}
BARS = [('C', 'Am'), ('F', 'G'),                     # 0-1  the hook: toms fall with the tube, the drop after the click
        ('C', 'C'), ('Am', 'Am'),                    # 2-3  the x-ray: a clockwork groove, a circling "orbit" figure
        ('F', 'G'), ('Em', 'Am'), ('Dm', 'G'),       # 4-6  slow motion inside the tube, building to ...
        ('C', 'C'),                                  # 7    MIXED! (item get)
        ('F', 'G'),                                  # 8    the tube comes off: the music winds down with the motor
        ('Am', 'Am'), ('F', 'G'),                    # 9-10 the battle
        ('C', 'G'),                                  # 11   ... VORTEX WINS!
        ('C', 'F'), ('G', 'C'),                      # 12-13 the rack, three stars, ta-da
        ('C', 'C')]                                  # 14   (the rewind plays here)
N_BARS = len(BARS)
assert N_BARS * T.BAR == T.TOTAL

LEAD = {
    0: seq('.  .  .  .  .  E5 G5 C6 -  B5 G5 -  A5 G5 E5 -'),    # the hook drops in one 16th after the click
    1: seq('F5 -  A5 C6 -  B5 A5 -  G5 -  E5 -  D5 E5 C5 -'),
    2: seq('C6 .  C6 .  G5 .  C6 .  E6 .  D6 .  C6 .  G5 .'),    # the x-ray: a little machine
    3: seq('A5 C6 E6 C6 A5 C6 E6 C6 A5 C6 E6 C6 A5 C6 E6 C6'),   # round and round: the orbit
    4: seq('A5 -  -  -  -  -  -  -  B5 -  -  -  -  -  -  -'),    # slow motion: long bell notes
    5: seq('G5 -  -  -  -  -  -  -  C6 -  -  -  -  -  -  -'),
    6: seq('D6 -  -  -  E6 -  -  -  F6 -  -  -  G6 -  B5 -'),    # rising to the payoff
    7: seq('C6 .  E6 .  G6 .  C7 -  -  -  G6 .  C7 -  -  -'),    # MIXED! the item-get fanfare
    8: seq('E6 -  D6 -  C6 -  B5 -  .  .  .  .  .  .  .  .'),    # (tape-stopped with the motor at 16.3)
    9: seq('.  .  .  .  A5 -  C6 E6 -  D6 C6 -  B5 C6 A5 -'),    # the battle riff starts on the VS slam
    10: seq('F5 -  A5 C6 -  A5 G5 -  G5 -  B5 D6 -  B5 G5 -'),
    11: seq('.  .  .  .  C6 C6 C6 -  A5 -  B5 -  C6 -  E6 -'),   # VORTEX WINS! (a victory jingle)
    12: seq('G6 -  -  -  E6 -  C6 -  .  .  D6 E6 .  .  .  .'),   # the clink (25.0) and the first star (25.5) in rests
    13: seq('.  .  .  .  C7 -  -  -  -  -  -  -  -  -  -  -'),   # the third star: ta-da
}
STACCATO = (2, 3, 7, 9, 10)
SOFT = (4, 5, 6)
_THIRD = {0: 4, 2: 3, 4: 3, 5: 4, 7: 4, 9: 3, 11: 3}                  # C major: a diatonic third below
HARM = {b: [(s, l, m - _THIRD.get(m % 12, 3)) for s, l, m in LEAD[b]] for b in (0, 1, 7, 11, 12, 13)}


def bar_t(b, step=0.0):
    return b * T.BAR + step * STEP


def _bass_notes(b, half, root):
    base = 8 * half
    if b == 0 and half == 0:
        return [(5, 0.9, root, 0.3), (6, 1.6, root + 12, 0.22)]
    if b in (2, 3):                                          # clockwork 16ths
        return [(base + k, 0.7, root + (12 if k % 2 else 0), 0.24 if k % 2 else 0.3) for k in range(8)]
    if b in SOFT:
        return [(base, 3.6, root, 0.28), (base + 4, 3.6, root + 7, 0.22)]
    if b in (9, 10):                                         # the battle: driving 8ths
        return [(base + 2 * k, 1.5, root + (12 if k == 3 else 0), 0.3) for k in range(4)]
    if b == 13:
        return [(0, 1.6, root, 0.28), (2, 1.6, root + 12, 0.24)] if half == 0 else []
    return [(base + 2 * k, 1.6, root + iv, 0.28) for k, iv in enumerate((0, 12, 7, 12))]


def music():
    """Part A (up to the lift-off) is tape-stopped at 16.3 s with the motor; part B starts again at 16.9 s."""
    A = [Bus() for _ in range(6)]
    B = [Bus() for _ in range(6)]
    for b in range(N_BARS):
        if b == 14:
            continue
        lead_b, harm_b, arp_b, bass_b, drum_b, pad_b = A if b <= 8 else B
        for s, l, m in LEAD.get(b, []):
            t0 = bar_t(b, s)
            dur = l * STEP * (0.9 if l <= 2 else 0.96)
            if b in STACCATO:
                lead_b.put(lead(m, STEP * 0.7, 0.125, vib=0.0), t0, 0.17, 0.12 * (1 if s % 4 else -1))
            elif b in SOFT:
                lead_b.put(bell(m + 12, 1.6, 1.6, 2.0), t0, 0.16, 0.1)
                lead_b.put(lead(m, dur, 0.5, vib=0.14), t0, 0.08, -0.1)
            else:
                lead_b.put(lead(m, dur, 0.25), t0, 0.19, 0.05)
        for s, l, m in HARM.get(b, []):
            harm_b.put(lead(m, l * STEP * 0.9, 0.125, vib=0.1), bar_t(b, s), 0.085, -0.3)
        for half in (0, 1):
            root, iv = CHORD[BARS[b][half]]
            for st, l, m, g in _bass_notes(b, half, root):
                bass_b.put(bass(m, l * STEP), bar_t(b, st), g)
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            base = 8 * half
            if b in (2, 3, 9, 10):                           # fast arpeggios: clockwork / battle
                for k, p in enumerate((0, 1, 2, 3, 2, 1, 2, 3)):
                    arp_b.put(chip_arp(tones[p], STEP * 0.85), bar_t(b, base + k), 0.045, -0.5)
            elif b in SOFT:
                for k in range(4):
                    arp_b.put(chip_arp(tones[k] + 12, STEP * 1.7, 0.25), bar_t(b, base + 2 * k), 0.03,
                              -0.6 + 0.4 * k)
                pad_b.put(pad([root + 24 + i for i in iv[:3]], 0.95, 0.15), bar_t(b, base), 0.05)
            elif not (b == 0 and half == 0) and b not in (8, 13):
                for k in range(4):
                    arp_b.put(chip_arp(tones[k], STEP * 1.6, 0.25), bar_t(b, base + 2 * k), 0.035, -0.45)
        if b == 13:
            pad_b.put(pad([60, 64, 67, 72], 1.6, 0.05), bar_t(13, 4), 0.07)
    _drums(A[4], B[4])
    a = sum(x.x for x in A)
    lead_st = A[0].x + A[1].x
    a = a + 0.4 * np.stack([echo(lead_st.sum(0) * 0.5, 0.375, 0.3), echo(lead_st.sum(0) * 0.5, 0.25, 0.28)])
    a = a + 0.13 * reverb(a - 0.9 * A[3].x - 0.6 * A[4].x)
    a = tape_stop(a, T.MOTOR_OFF, 0.55)
    b_ = sum(x.x for x in B)
    lead_b = B[0].x + B[1].x
    b_ = b_ + 0.4 * np.stack([echo(lead_b.sum(0) * 0.5, 0.375, 0.3), echo(lead_b.sum(0) * 0.5, 0.25, 0.28)])
    b_ = b_ + 0.13 * reverb(b_ - 0.9 * B[3].x - 0.6 * B[4].x)
    return a + b_


def _drums(da, db):
    K, Sn, Hc, Ho, C = kick(), snare(), hat(False), hat(True), crash()
    for i, m in enumerate((64, 60, 57, 53)):                  # 0: four toms fall with the tube
        da.put(tom(m), bar_t(0, i), 0.2 + 0.03 * i, 0.3 - 0.2 * i)
    da.put(C, bar_t(0, 5), 0.15, 0.2)                         # the drop, one 16th after the click
    da.put(K, bar_t(0, 5), 0.42)
    for b in range(N_BARS):
        dr = da if b <= 8 else db
        t0 = bar_t(b)
        if b == 0:
            for k in (8, 10):
                dr.put(K, t0 + k * STEP, 0.4)
            dr.put(Sn, t0 + 12 * STEP, 0.22, 0.08)
            for k in (6, 8, 10, 12, 14):
                dr.put(Hc, t0 + k * STEP, 0.05, 0.3)
            continue
        if b in SOFT:                                         # half time, and a snare roll into MIXED!
            dr.put(K, t0, 0.32)
            dr.put(Sn, t0 + 8 * STEP, 0.16, 0.08)
            for k in range(0, 16, 4):
                dr.put(Hc, t0 + (k + 2) * STEP, 0.035, 0.3)
            if b == 6:
                for k in range(8, 16):
                    dr.put(Sn, t0 + k * STEP, 0.05 + 0.02 * (k - 8), 0.08)
            continue
        if b == 7:
            dr.put(C, t0, 0.15, 0.25)
        if b == 8:                                            # the lift-off: then silence, then a pickup (part B)
            dr.put(K, t0, 0.4)
            for k in range(8, 16):
                db.put(Sn, t0 + k * STEP, 0.04 + 0.025 * (k - 8), 0.08)
            continue
        if b == 9:
            dr.put(C, T.VS_SLAM, 0.17, 0.0)
            for k in (0, 8, 12):                              # (beat 2 is the VS slam's own thump)
                dr.put(K, t0 + k * STEP, 0.42)
            for k in (4, 12):
                dr.put(Sn, t0 + k * STEP, 0.24, 0.08)
            for k in range(16):
                dr.put(Hc, t0 + k * STEP, 0.07 if k % 2 else 0.04, 0.3)
            continue
        if b == 10:
            for k in (0, 4, 8, 12):
                dr.put(K, t0 + k * STEP, 0.42)
            for k in (4, 12):
                dr.put(Sn, t0 + k * STEP, 0.24, 0.08)
            for k in range(16):
                dr.put(Hc, t0 + k * STEP, 0.07 if k % 2 else 0.04, 0.3)
            continue
        if b == 11:                                           # a tom fill, then the win
            for i, m in enumerate((57, 55, 52, 48)):
                dr.put(tom(m), t0 + i * STEP, 0.22, 0.4 - 0.25 * i)
            dr.put(C, T.WIN, 0.16, -0.1)
            for k in (4, 8, 12):
                dr.put(K, t0 + k * STEP, 0.38)
            dr.put(Sn, t0 + 12 * STEP, 0.2, 0.08)
            continue
        if b == 12:
            for k in (0, 4):
                dr.put(K, t0 + k * STEP, 0.36)
            dr.put(Sn, t0 + 4 * STEP, 0.18, 0.08)
            for k in (0, 2, 4, 6):
                dr.put(Hc, t0 + k * STEP, 0.045, 0.3)
            continue
        if b == 13:
            dr.put(C, bar_t(13, 4), 0.15, 0.0)
            dr.put(K, bar_t(13, 4), 0.42)
            continue
        if b == 14:
            continue
        kicks, snares = [0, 8, 10], [4, 12]
        for k in kicks:
            dr.put(K, t0 + k * STEP, 0.4)
        for k in snares:
            dr.put(Sn, t0 + k * STEP, 0.22, 0.08)
        busy = b in (2, 3)
        for k in range(16 if busy else 8):
            st = k if busy else 2 * k
            dr.put(Hc, t0 + st * STEP, 0.09 if st % 4 == 2 else 0.045, 0.3)


# ================================================================ sound effects
def motor_hum():
    """The motor, as seen: its hum follows the speed on screen (C3 at full speed, in tune with the score), pulses in 16ths
    so it grooves, buzzes on top, and in slow motion sinks to a deep, slow wub at the orbit's pace."""
    t = np.arange(N) / SR
    rate = np.interp(t, T._TT, T._RATE)                       # turns per second as seen
    real = np.array([T.rpm(x) / 60.0 for x in t[::480]])
    real = np.interp(np.arange(N), np.arange(0, N, 480)[:len(real)], real)
    w = rate / np.maximum(real, 1e-6)
    w = np.where(real > 0.5, w, 1.0)
    f = 2.8 * real * (0.32 + 0.68 * w)
    on = np.clip(real / 6.0, 0, 1)
    y = 0.55 * pulse(np.maximum(f, 20), N, 0.25) + 0.45 * tri(np.maximum(f, 20) * 0.5, N)
    y = lowpass(y, 1400, 127)
    groove = 0.72 + 0.28 * ((np.floor(t / STEP) % 2) == 0)
    wub = 0.55 + 0.45 * np.cos(2 * math.pi * np.cumsum(np.minimum(rate, 6.0)) / SR) ** 2
    slow = 1 - w
    amp = on * (groove * w + wub * slow)
    buzz = bandnoise(N / SR, lambda tt: 2600.0 + 0.0 * tt, 0.5, 31)[:N] * np.clip(real / 40.0, 0, 1) * w * 0.35
    return (y * amp + buzz[:N]) * 0.5


def swirl_noise():
    """The vortex: a whoosh that swells and falls with each turn of the swirl (twice a beat at full speed; slow and deep
    inside the tube)."""
    t = np.arange(N) / SR
    v = np.array([T.vortex(x) for x in t[::480]])
    v = np.interp(np.arange(N), np.arange(0, N, 480)[:len(v)], v)
    rate = np.interp(t, T._TT, T._RATE)
    lr = np.minimum(0.18 * rate, 2.0)
    ph = np.cumsum(lr) / SR
    lfo = 0.5 + 0.5 * np.sin(2 * math.pi * ph)
    y = bandnoise(N / SR, lambda tt: 380 + 900 * np.interp(tt, t[::480], lfo[::480]), 0.9, 41)[:N]
    dip = 1 - 0.5 * np.clip((t - 12.3) / 0.15, 0, 1) * np.clip((13.8 - t) / 0.3, 0, 1)   # under the dye bubbles
    return y * v * (0.35 + 0.65 * lfo) * 0.55 * dip


def sfx():
    bus = Bus()
    # the hook: the tube comes down (a falling whoosh), lands: CLICK + the cup's spring
    bus.put(whoosh(0.95, 2400, 500, 1, 0.8, 0.85), T.PLUNGE[0], 0.15, 0.1)
    bus.put(click(2, 3000, 0.03), T.CONTACT, 0.42, 0.0)
    bus.put(thump(170, 70, 0.16, 0.5, 3), T.CONTACT, 0.14, 0.0)
    bus.put(spring(160, 520, 0.18), T.CONTACT + 0.02, 0.06, -0.2)
    bus.put(blip(mtof(84), mtof(96), 0.07, 0.25), T.CONTACT + 0.06, 0.05, 0.3)     # TOUCH!
    hum = motor_hum()
    bus.put_st(np.stack([hum, np.roll(hum, 96)]), 0.0, 0.2)
    sw = swirl_noise()
    bus.put_st(np.stack([sw, np.roll(sw, 240)]), 0.0, 0.33)
    bus.put(blip(mtof(96), mtof(108), 0.08, 0.5), 2.05, 0.14, 0.4)                   # VORTEX! (above the lead)
    bus.put(blip(mtof(101), mtof(113), 0.08, 0.5), 2.17, 0.14, 0.4)
    bus.put(whoosh(0.8, 1800, 500, 5, 0.8, 0.4), T.REVEAL[0], 0.05, 0.0)
    # the x-ray: a scan zap, label blips, the orbit window
    n = int((T.XRAY_SCAN[1] - T.XRAY_SCAN[0]) * SR)
    xs = np.arange(n) / SR
    zap = pulse(300 + 1500 * np.sin(math.pi * xs / (n / SR)), n, 0.125) * np.sin(math.pi * xs / (n / SR)) ** 2
    bus.put(lowpass(zap, 4000, 63), T.XRAY_SCAN[0], 0.05, -0.1)
    bus.put(whoosh(0.6, 600, 1600, 7, 0.8, 0.5), T.TO_XRAY[0], 0.04)
    for i, t0 in enumerate((4.55, 4.75, 4.95, 6.45)):
        bus.put(blip(mtof(100 + 2 * i), mtof(107 + 2 * i), 0.05, 0.5), t0, 0.18, 0.3)
    bus.put(plip(500, 1100, 0.16, 0.0, 0.1, 9), T.ORBIT_BOX[0], 0.08, 0.3)
    bus.put(bell(96, 0.6), T.ORBIT_BOX[0] + 0.06, 0.12, 0.3)
    bus.put(whoosh(0.5, 1400, 500, 10, 0.8, 0.4), T.XRAY_CLOSE[0], 0.03)
    # into the tube: time slows (a falling swell), the dyes bubble, time speeds back up
    bus.put(glide(900, 110, 0.9), T.BULLET[0], 0.05, 0.0)
    bus.put(whoosh(1.0, 2600, 300, 11, 0.8, 0.25), T.BULLET[0], 0.06)
    for i, t0 in enumerate((8.85, 10.65, 12.5)):
        bus.put(blip(mtof(98 + 3 * i), mtof(105 + 3 * i), 0.05, 0.5), t0, 0.16, 0.3)
    for k in range(8):                                                               # the dyes: bubbles on the offbeats
        f0 = 620.0 * 2 ** (k / 8)
        bus.put(plip(f0, 2.3 * f0, 0.12, 0.0, 0.2, 30 + k), 12.4375 + 0.125 * k, 0.16, 0.3 * (-1) ** k)
    bus.put(whoosh(0.7, 300, 2600, 12, 0.8, 0.9), T.BULLET[1] - 0.7, 0.07)
    # MIXED!
    bus.put(bell(96, 1.4, 2.0, 2.0), T.MIXED_AT, 0.13, 0.0)
    for i, m in enumerate((96, 100, 103, 108)):
        bus.put(blip(mtof(m), mtof(m + 5), 0.05, 0.5), T.MIXED_AT + 0.08 * i + 0.1, 0.035, -0.3 + 0.2 * i)
    # the lift-off: the tube pops out, the cup springs back, the liquid sloshes
    bus.put(thump(220, 120, 0.1, 0.6, 14), T.LIFT[0], 0.16, 0.0)
    bus.put(blip(300, 1100, 0.1, 0.25), T.LIFT[0] + 0.01, 0.1, 0.0)
    bus.put(spring(520, 160, 0.22), T.LIFT[0] + 0.08, 0.06, -0.2)
    for i, t0 in enumerate((16.45, 16.75, 17.1, 17.45)):
        bus.put(blub(260 - 30 * i, 0.12), t0, 0.12 * (1 - 0.2 * i), -0.2 + 0.15 * i)
    # the battle
    bus.put(whoosh(0.4, 600, 2400, 15, 0.8, 0.6), T.VS_IN[0], 0.07)
    bus.put(thump(120, 40, 0.4, 0.8, 16), T.VS_SLAM, 0.3)
    bus.put(glide(260, 70, 0.5, duty=0.5), T.VS_SLAM, 0.06)
    for i in range(6):
        bus.put(blip(mtof(72 + 3 * i), mtof(76 + 3 * i), 0.05, 0.5), T.VS_SLAM + 0.25 + 0.06 * i, 0.035, 0.4)
    bus.put(bell(91, 0.6), T.VS_SLAM + 0.62, 0.11, 0.4)                               # the vortex bar: full
    ticks(bus, T.RACE[0], T.RACE[1], 36, 0.05, 3400.0, -0.35, 1.0)
    for t0 in (T.RACE[0] + (T.RACE[1] - T.RACE[0]) / 3, T.RACE[0] + 2 * (T.RACE[1] - T.RACE[0]) / 3):
        bus.put(bell(96, 0.5), t0, 0.1, -0.4)                                          # DAY 2, DAY 3
    for i in range(10):
        bus.put(blip(mtof(96 + (i % 5) * 2), mtof(103 + (i % 5) * 2), 0.04, 0.5), T.WIN + 0.05 * i, 0.14,
                -0.5 + 0.1 * i)
    bus.put(whoosh(0.35, 2400, 600, 17, 0.8, 0.4), T.VS_OUT[0], 0.06)
    # the rack and the stars
    bus.put(whoosh(0.85, 700, 1600, 18, 0.8, 0.5), T.TO_RACK[0], 0.04, 0.3)
    bus.put(glass_ping(2637, 0.5, 19), T.RACK_CLINK, 0.12, 0.4)
    bus.put(glass_ping(3520, 0.4, 20), T.RACK_CLINK + 0.01, 0.06, 0.4)
    bus.put(click(21, 4000, 0.02), T.RACK_CLINK, 0.18, 0.4)
    for i, (t0, m) in enumerate(zip(T.STARS, (84, 88, 91))):
        bus.put(bell(m + 12, 0.9, 2.2, 2.0), t0, 0.09 if i < 2 else 0.13, -0.3 + 0.3 * i)     # the 3rd: over the ta-da
        for j in range(3):
            bus.put(blip(mtof(m + 12 + 4 * j), mtof(m + 19 + 4 * j), 0.04, 0.5), t0 + 0.05 * j + 0.04, 0.025,
                    -0.3 + 0.3 * i)
    return bus.x


def duck_env():
    """The music steps back a little for the click, VORTEX!, MIXED!, the VS slam, VORTEX WINS! and the clink."""
    t = np.arange(NT) / SR
    g = np.ones(NT)
    for t0, depth, hold in ((T.CONTACT, 0.5, 0.05), (2.05, 0.2, 0.1), (T.MIXED_AT, 0.25, 0.1), (T.VS_SLAM, 0.3, 0.1),
                            (T.WIN, 0.3, 0.12), (T.RACK_CLINK, 0.25, 0.05)):
        a = np.clip((t - (t0 - 0.02)) / 0.02, 0, 1) * np.clip(1 - (t - t0 - hold) / 0.3, 0, 1)
        g -= depth * a * (t >= t0 - 0.02)
    return np.clip(g, 0.4, 1)


def rewind(mix):
    """The ending: the whole mix played backward at tape speed, following the picture's rewind curve exactly
    (slow-fast-slow, landing on time 0), with a tape-motor whir and a warble. It ends on the opening played backward
    (the toms and the falling whoosh, reversed), which leads straight into the real opening when the video loops."""
    r0 = int(round(T.REWIND[0] * SR))
    n = NT - r0
    tt = T.REWIND[0] + np.arange(n) / SR
    coarse = np.array([T.rewind_source(x) for x in tt[::48]])
    pos = np.interp(np.arange(n), np.arange(0, n, 48)[:len(coarse)], coarse) * SR
    src = np.arange(r0)
    rev = np.stack([np.interp(pos, src, mix[ch, :r0]) for ch in range(2)])
    rev = np.stack([lowpass(rev[0], 6500, 127), lowpass(rev[1], 6500, 127)])
    speed = np.abs(np.gradient(pos))
    sp = speed / max(speed.max(), 1e-9)
    rev *= (0.62 + 0.08 * np.sin(2 * math.pi * 8.5 * (tt - T.REWIND[0])))[None, :]
    whir = bandnoise(n / SR, lambda x: 500 + 3200 * np.interp(x, np.arange(n)[::480] / SR, sp[::480]), 0.8, 91)
    whir = whir[:n] * np.clip(sp * 1.4, 0, 1) ** 0.7
    hum = pulse(70 + 260 * sp, n, 0.5) * np.clip(sp * 1.4, 0, 1) * 0.25
    out = rev + 0.16 * np.stack([whir, whir]) + 0.05 * np.stack([hum, hum])
    k = click(92, 1800, 0.05)
    out[:, :len(k)] += 0.45 * k
    th = thump(140, 60, 0.18, 0.6, 93)
    out[:, :len(th)] += 0.3 * th
    e = int(0.004 * SR)
    out[:, :e] *= np.linspace(0, 1, e)
    out[:, -e:] *= np.linspace(1, 0, e)
    res = mix.copy()
    f = int(0.012 * SR)
    res[:, r0 - f:r0] *= np.linspace(1, 0, f)[None, :]
    res[:, r0:] = out
    return res


def master(mus, fx, target=-14.0):
    mix = 0.62 * mus[:, :NT] * duck_env()[None, :] + 1.5 * fx[:, :NT]
    mix = rewind(mix)
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
    fx = sfx()
    mix = master(mus, fx, target)
    g = 10 ** ((-16.0 - lufs(mus[:, :NT])) / 20)
    write_wav(out / 'music.wav', np.clip(mus[:, :NT] * g, -1, 1))
    gs = 10 ** ((-16.0 - lufs(fx[:, :NT])) / 20)
    write_wav(out / 'sfx.wav', np.clip(fx[:, :NT] * gs, -1, 1))
    write_wav(out / 'mix.wav', mix)
    info = {'lufs': round(lufs(mix), 2), 'true_peak_db': round(true_peak(mix), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP")
    return out / 'mix.wav', info
