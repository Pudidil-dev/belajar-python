"""Score and sound effects, synthesized in code (no samples): a bright, catchy chiptune loop that the surgical light
plays along with, built to be watched on repeat.

Chip voices: band-limited pulse waves (PolyBLEP), an NES-style triangle bass, LFSR noise drums, a short echo and FM
bells (the synth core is shared with the repo's other pixel films). 96 BPM in A minor / C major, 13 bars = 32.5 s, and
it loops: vi-IV-I-V three times (one chord per function), and a last bar that turns to E to lead back to the top.
Bar 0 is the operating room: a heart monitor's beep on every beat over a soft pad, then a rising rush as the camera
turns to the lamp. The LEDs' own notes are the tune of bar 1 (one per 16th as they light up); the brightness steps
are the tune of bar 5. In endo mode (bar 8) the whole mix goes dim and muffled.

Every effect is timed from engine/timeline.py: a shimmer as the camera reaches the lamp's face, a rising blip per LED,
a bright chord as the rays meet, a soft rush as a hand comes up over the field and a rising blip for each group of
LEDs that comes back on (the shadow going soft), a soft rush as a head leans in, the sensors' scanning pips and a
two-tone beep when they find the head, a rising whirr as the power shifts, a switch click per brightness step and per
colour step, the lens panel's servo whirr, a power-down glide and the monitor's ping in endo mode, the heat's soft
rush, the glove's grip and the camera's two beeps, the arm's ratchet clicks, the spring and a soft thunk when it
holds, and a falling rush as the camera pulls back out to the room.
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





# ================================================================ the score
CHORD = {'Am': (45, (0, 3, 7)), 'F': (41, (0, 4, 7)), 'C': (48, (0, 4, 7)), 'G': (43, (0, 4, 7)),
         'E': (40, (0, 4, 7))}
BARS = [('Am', 'Am'),      # 0  the operating room (the heart monitor), then the zoom into the lamp
        ('F', 'F'),        # 1  the lamp's face: the LEDs light up one by one (their notes are the tune)
        ('C', 'C'),        # 2  all the rays meet at one spot
        ('G', 'G'),        # 3  a hand over the field: one LED, a hard shadow; all back on, a soft one
        ('Am', 'Am'),      # 4  a head in the way: the sensors find it and shift the power
        ('F', 'F'),        # 5  brightness, step by step (the tune)
        ('C', 'C'),        # 6  colour: warm to cool white
        ('G', 'G'),        # 7  field size: the lenses move
        ('Am', 'Am'),      # 8  endo mode: everything dims
        ('F', 'F'),        # 9  the heat goes up, the hands stay cool
        ('C', 'C'),        # 10 the sterile handle and its camera
        ('G', 'G'),        # 11 the spring arm
        ('Am', 'E')]       # 12 back out to the room; E turns back to the top
N_BARS = len(BARS)
assert abs(N_BARS * T.BAR - T.TOTAL) < 1e-9
LEAD = {
    2: seq('C5 .  E5 .  G5 .  C6 -  -  -  .  .  E6 .  D6 .'),
    3: seq('B5 -  -  .  G5 .  D5 .  G5 .  B5 .  D6 -  -  .'),
    4: seq('C6 .  B5 .  A5 -  -  .  E5 .  A5 .  C6 -  -  .'),
    6: seq('E6 .  D6 .  C6 .  G5 .  E5 .  G5 .  C6 -  -  .'),
    7: seq('D6 .  B5 .  G5 .  B5 .  D6 -  -  .  G6 -  -  .'),
    8: seq('A5 -  -  -  .  .  .  .  E5 -  -  -  .  .  .  .'),
    9: seq('F5 .  A5 .  C6 .  A5 .  F5 .  A5 .  C6 -  -  .'),
    10: seq('E5 .  G5 .  C6 .  E6 -  -  .  D6 .  C6 .  .  .'),
    11: seq('D6 .  .  G5 .  .  B5 .  D6 .  G6 -  -  .  .  .'),
    12: seq('C6 .  B5 .  A5 -  -  -  G#5 . B5 . E6 -  -  .'),
}
_THIRD = {0: 4, 2: 3, 4: 3, 5: 4, 7: 4, 9: 3, 11: 3}
HARM = {b: [(s_, l, m - _THIRD.get(m % 12, 3)) for s_, l, m in LEAD[b]] for b in (2, 3, 6, 7, 10, 11)}
ARP_BARS = (2, 3, 4, 6, 7, 9, 10, 11)
STEP = T.STEP


def bar_t(b, step=0.0):
    return b * T.BAR + step * STEP


def chord_at(t):
    b = int(t // T.BAR) % N_BARS
    return CHORD[BARS[b][int((t % T.BAR) // (T.BAR / 2))]]


def music():
    bus = {k: Bus() for k in ('lead', 'harm', 'arp', 'bass', 'drum', 'pad')}
    for b in range(N_BARS):
        for s_, l, m in LEAD.get(b, []):
            dur = l * STEP * (0.88 if l <= 2 else 0.95)
            bus['lead'].put(lead(m, dur, 0.25, vib=0.14), bar_t(b, s_), 0.16, 0.08)
        for s_, l, m in HARM.get(b, []):
            bus['harm'].put(lead(m, l * STEP * 0.9, 0.125, vib=0.08), bar_t(b, s_), 0.055, -0.3)
        for half in (0, 1):
            root, iv = CHORD[BARS[b][half]]
            base = 8 * half
            if b == 0:                                       # the room: a long, quiet root
                if half == 0:
                    bus['bass'].put(bass(root, 15.5 * STEP), bar_t(b), 0.24)
            elif b == 8:                                     # endo: long notes
                bus['bass'].put(bass(root, 7.5 * STEP), bar_t(b, base), 0.24)
            else:
                for k, ivb in enumerate((0, 12, 7, 12)):
                    bus['bass'].put(bass(root + ivb, 1.5 * STEP), bar_t(b, base + 2 * k), 0.26 if k % 2 else 0.31)
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            if b in ARP_BARS:
                for k, pi in enumerate((0, 1, 2, 3, 2, 1, 2, 3)):
                    bus['arp'].put(chip_arp(tones[pi] + 12, STEP * 0.8), bar_t(b, base + k), 0.026, -0.45)
            g = 0.05 if b in (0, 1, 5, 8, 12) else 0.035
            bus['pad'].put(pad([root + 24 + i for i in iv], T.BAR / 2 - 0.05, 0.12), bar_t(b, base), g)
    _drums(bus['drum'])
    mix = sum(x.x for x in bus.values())
    lead_st = bus['lead'].x + bus['harm'].x
    mix = mix + 0.3 * np.stack([echo(lead_st.sum(0) * 0.5, 0.46875, 0.3), echo(lead_st.sum(0) * 0.5, 0.3125, 0.28)])
    mix = mix + 0.14 * reverb(mix - 0.9 * bus['bass'].x - 0.6 * bus['drum'].x)
    return mix


def _drums(d):
    K, Sn, Hc, C = kick(), snare(0.8), hat(False), crash()
    d.put(K, bar_t(1), 0.38)                                  # into the lamp
    d.put(C, bar_t(1), 0.06, 0.1)
    for b in range(1, N_BARS):
        t0 = bar_t(b)
        if b == 8:                                            # endo: a soft pulse only
            for k in (0, 8):
                d.put(K, t0 + k * STEP, 0.2)
            continue
        for k in (0, 8):
            d.put(K, t0 + k * STEP, 0.34)
        if b in (3, 7, 11):
            d.put(K, t0 + 14 * STEP, 0.2)
        if b >= 2:
            for k in (4, 12):
                d.put(Sn, t0 + k * STEP, 0.12, 0.08)
        hats = range(0, 16, 1) if b in (6, 7, 10, 11) else range(0, 16, 2)
        for k in hats:
            d.put(Hc, t0 + k * STEP, 0.045 if k % 4 == 2 else 0.026, 0.3)
    d.put(C, bar_t(5), 0.05, -0.15)
    d.put(C, bar_t(9), 0.05, 0.15)
    for k, m in zip((12, 13, 14, 15), (45, 48, 52, 55)):      # a tom run into the pull back
        d.put(tom(m), bar_t(11, k), 0.1 + 0.02 * (k - 12), -0.3 + 0.2 * (k - 12))


# ================================================================ sound effects
def monitor_beep(dur=0.11):
    """The heart monitor's beep: a clean sine with a soft click at the start."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * math.pi * 1046.5 * t)
    return y * np.minimum(1, t / 0.004) * np.clip((dur - t) / 0.02, 0, 1)


def switch_click(seed=0):
    """A wall switch / membrane button: a short snap."""
    a, b = click(seed, 2200, 0.03), click(seed + 1, 900, 0.02)
    a[:len(b)] += 0.4 * b
    return a


def servo(dur, f0, f1):
    """A small motor moving the lens panel: a buzzy pulse glide with a whine."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    y = 0.6 * pulse(f, n, 0.5) + 0.4 * pulse(f * 2.01, n, 0.25)
    y *= 0.75 + 0.25 * np.sin(2 * math.pi * 31 * t)
    return lowpass(fade(y, 0.05, 0.12), 2400, 63)


def ratchet(n_clicks, dur, seed=0):
    out = np.zeros(int(dur * SR) + SR // 10)
    for k in range(n_clicks):
        s0 = int(k * dur / n_clicks * SR)
        ck = click(seed + k, 1500 + 120 * k, 0.025)
        out[s0:s0 + len(ck)] += ck * (0.7 + 0.3 * (k % 2))
    return out


def sfx():
    from . import scenes as SC
    bus = Bus()
    # ---- the operating room: the heart monitor on every beat of bar 0 and of bar 12's second half (into the loop)
    for k in range(4):
        bus.put(monitor_beep(), bar_t(0, 4 * k), 0.09, -0.5)
    for k in (2, 3):
        bus.put(monitor_beep(), bar_t(12, 4 * k), 0.07, -0.5)
    # the camera turns up to the lamp: a rising rush; it reaches the lamp's face: a glassy shimmer
    bus.put(whoosh(T.ZOOM_IN[1] - T.ZOOM_IN[0] + 0.1, 300, 2600, 701, 0.9, 0.92), T.ZOOM_IN[0], 0.22, 0.0)
    for k, m in enumerate((84, 88, 91, 96)):
        bus.put(glass_ping(mtof(m), 0.5, 702 + k), T.T_FACE + 0.08 * k, 0.05, -0.3 + 0.2 * k)
    # ---- bar 1: each LED lights up with a rising blip (F major pentatonic, two octaves): the bar's tune
    pent = (65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91, 93, 96, 98)
    for i, t0 in enumerate(T.LED_ON):
        bus.put(blip(mtof(pent[i]), mtof(pent[i] + 12), 0.08, 0.25), t0, 0.075, -0.6 + 1.2 * i / (T.LED_GROUPS - 1))
    # ---- bar 2: the beams meet at the spot: a bright chord as the camera settles on them
    for k, m in enumerate((72, 76, 79, 84)):
        bus.put(bell(m, 0.9, 1.4, 2.0), bar_t(2, 4) + 0.02 * k, 0.06, -0.2 + 0.13 * k)
    # ---- bar 3: a hand comes up over the field (a soft rush); one LED alone, then a rising blip for every group of
    # LEDs that comes back on (on the 16ths, up the G chord), as the hard shadow goes soft
    bus.put(whoosh(0.5, 900, 2400, 711, 0.6, 0.5), bar_t(3) - 0.35, 0.34, 0.3)
    bus.put(click(718, 1800, 0.03), bar_t(3), 0.32, 0.0)         # the other LEDs off, on the downbeat
    for k, m in enumerate((67, 71, 74, 79, 83, 86, 91)):
        t0 = T.SOLO_BACK + k * STEP
        bus.put(click(712 + k, 2600 + 120 * k, 0.02), t0, 0.2, -0.45 + 0.15 * k)
        bus.put(blip(mtof(m), mtof(m + 12), 0.07, 0.4), t0, 0.055, -0.45 + 0.15 * k)
    # ---- bar 4: the head leans in (a soft rush)
    bus.put(whoosh(0.7, 900, 300, 719, 0.8, 0.4), bar_t(4) - 0.3, 0.24, -0.3)
    # ---- bar 4: the sensors scan (pips on the 8ths), find the head (two-tone beep), shift the power (a rising whirr)
    for k in range(0, 3):
        bus.put(beep(1600, 0.03, 0.5), bar_t(4, k), 0.03, 0.4)
    bus.put(beep(1320, 0.07), T.T_DETECT, 0.06, 0.3)
    bus.put(beep(1760, 0.09), T.T_DETECT + STEP, 0.06, 0.3)
    bus.put(glide(260, 620, 0.55, duty=0.5), T.T_DETECT + 0.15, 0.045, 0.0)
    # ---- bar 5: brightness, one switch click and one step up per beat
    for k, m in enumerate((72, 76, 79, 84)):
        bus.put(switch_click(720 + k), bar_t(5, 4 * k), 0.12, 0.2)
        bus.put(blip(mtof(m), mtof(m), 0.12, 0.5), bar_t(5, 4 * k) + 0.01, 0.05, 0.2)
    # ---- bar 6: colour, one click per beat and a tone that gets brighter (warm to cool)
    for k in range(4):
        bus.put(switch_click(730 + k), bar_t(6, 4 * k), 0.24, -0.2)
        bus.put(bell(84 + 2 * k, 0.4, 0.8 + 0.9 * k, 2.0), bar_t(6, 4 * k) + 0.01, 0.12, -0.2)
    # ---- bar 7: field size, the lens panel's servo and the spot blooming wider
    bus.put(servo(1.6, 300, 520), bar_t(7) + 0.3, 0.05, 0.0)
    bus.put(whoosh(1.3, 500, 1800, 741, 0.9, 0.7), bar_t(7) + 0.5, 0.07, 0.0)
    # ---- bar 8: endo mode, a power-down glide; the monitor lights up with a ping
    bus.put(glide(880, 180, 0.5), bar_t(8) + 0.05, 0.07, 0.0)
    bus.put(glass_ping(mtof(88), 0.6, 751), bar_t(8, 4), 0.07, 0.5)
    # ---- bar 9: the heat rising off the top, a soft rush
    bus.put(hiss(1.8, 400, 1600, 761, 0.4, 2.0), bar_t(9) + 0.1, 0.3, 0.0)
    for k in range(6):                                        # and a few soft crackles as it heats
        bus.put(click(765 + k, 3800, 0.012), bar_t(9, 3 + 2 * k), 0.12, -0.4 + 0.16 * k)
    # ---- bar 10: the glove grips the handle (a click), the camera starts (two short beeps)
    bus.put(click(771, 1200, 0.04), T.T_GRIP, 0.3, 0.0)
    bus.put(switch_click(773), T.T_GRIP + 0.01, 0.2, 0.0)
    bus.put(thump(220, 110, 0.12, 0.4, 772), T.T_GRIP, 0.08, 0.0)
    bus.put(beep(2093, 0.05), T.T_CAM, 0.045, 0.3)
    bus.put(beep(2637, 0.05), T.T_CAM + STEP, 0.045, 0.3)
    # ---- bar 11: the arm, ratchet clicks as it moves, the spring, a soft thunk as it holds; and back
    go0, go1 = T.ARM_GO
    bus.put(ratchet(6, go1 - go0, 781), go0, 0.26, -0.2)
    bus.put(spring(160.0, 420.0, 0.3), go1 - 0.1, 0.06, -0.2)
    bus.put(thump(160, 70, 0.25, 0.3, 782), go1, 0.18, 0.0)
    b0, b1 = T.ARM_BACK
    bus.put(ratchet(6, b1 - b0, 790), b0, 0.2, 0.2)
    bus.put(thump(150, 70, 0.22, 0.3, 791), b1, 0.12, 0.0)
    # ---- bar 12: the pull back out to the room, a falling rush
    bus.put(whoosh(T.OUT[1] - T.OUT[0] + 0.1, 2600, 300, 801, 0.9, 0.15), T.OUT[0], 0.2, 0.0)
    # ---- a caption appears: a soft tick
    for text, sub, anchor, t0, t1, side in SC.CAPTIONS:
        bus.put(click(40 + int(t0 * 10), 5200, 0.015), t0, 0.13, 0.25)
    return bus.x


def duck_env():
    """The music steps back for the zoom in and the beams' chord."""
    t = np.arange(N) / SR
    g = np.ones(N)
    for t0, depth, hold in ((T.ZOOM_IN[1], 0.25, 0.1), (bar_t(4) + 3 * STEP, 0.2, 0.15)):
        a = np.clip((t - (t0 - 0.02)) / 0.02, 0, 1) * np.clip(1 - (t - t0 - hold) / 0.35, 0, 1)
        g -= depth * a * (t >= t0 - 0.02)
    return np.clip(g, 0.4, 1)


def room_filter(mus):
    """The music is quieter and a little muffled in the room (bar 0 and the end of bar 12), opens up inside the lamp,
    and goes dim and muffled in endo mode."""
    t = np.arange(mus.shape[1]) / SR % T.TOTAL
    room = np.clip((T.ZOOM_IN[0] + 0.6 - t) / 0.6, 0, 1) + np.clip((t - (T.OUT[1] - 0.2)) / 0.8, 0, 1)
    endo = np.array([T.endo(x) for x in np.arange(0, T.TOTAL + 1e-9, 0.01)])
    e = np.interp(t, np.arange(0, T.TOTAL + 1e-9, 0.01), endo)
    lo = np.stack([lowpass(mus[0], 1100, 255), lowpass(mus[1], 1100, 255)])
    w = np.clip(0.55 * np.clip(room, 0, 1) + 0.8 * e, 0, 0.9)
    level = 1.0 - 0.3 * np.clip(room, 0, 1) - 0.35 * e
    return (mus * (1 - w) + lo * w) * level


def loop_wrap(x):
    """Fold everything that rings past the end back onto the start, so the loop is seamless."""
    y = x[:, :NT].copy()
    tail = x[:, NT:]
    k = min(tail.shape[1], NT)
    y[:, :k] += tail[:, :k]
    return y


def master(mus, fx, target=-14.0):
    mix = loop_wrap(0.62 * room_filter(mus) * duck_env()[None, :] + 1.5 * fx)
    mix = np.stack([lowpass(mix[0], 15500, 127), lowpass(mix[1], 15500, 127)])
    ceiling = -1.6
    pad_ = int(0.05 * SR)
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
