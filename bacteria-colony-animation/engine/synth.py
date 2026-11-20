"""Synth voices, effects and mastering shared by the score and the sound effects (adapted from the repo's
blood-centrifuge film): band-limited pulse waves (PolyBLEP), the NES 4-bit triangle and 15-bit LFSR noise, an
SNES-style echo, FM bells, a small reverb, ITU-R BS.1770 loudness and a true-peak-safe limiter. No samples.
"""
import math
import wave
import numpy as np

SR = 48000


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def tv(dur):
    return np.arange(max(1, int(round(dur * SR)))) / SR


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


