"""Score and sound effects, synthesized in code (no samples): an energetic but soft 8-bit RPG loop with arcade
effects on every event on screen.

Chip voices: band-limited pulse waves (PolyBLEP), an NES-style triangle bass, LFSR noise drums, a short echo and FM
bells (the synth core is shared with the repo's other pixel films). C minor, 120 BPM, 11 bars = 22 s, and it loops:
whatever rings past the end is folded back onto the start, and the limiter works on the loop wrapped round.

  bars 0-1   the hook: a driving riff; Cas9's whoosh, the CLICK as it clamps and the SNIP that cuts both strands
  bar 1.5    the tape rewind
  bars 2-3   the search: a bouncy arpeggio, a dull TIK at the wrong site, a bright TIK at the right PAM, then the
             twenty guide bases pairing as a fast rising run, and the LOCK
  bars 4-6   the cut: the two cutting domains swing in, the SNIP lands on the bar line, and the slow motion drops
             the music into a filtered hush
  bars 6-8   the repair: a calm music box, two TIKs as the ends are grabbed, and the SNAP as they are sealed
  bars 9-10  the result and the turnaround back into the first frame
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





# ================================================================ the score (C minor, 120 BPM, 11 bars, loops)
CH = {'Cm': (36, (0, 3, 7)), 'Ab': (32, (0, 4, 7)), 'Eb': (39, (0, 4, 7)), 'Bb': (34, (0, 4, 7)),
      'Fm': (41, (0, 3, 7)), 'G': (43, (0, 4, 7))}
BARS = [('Cm', 'Cm'),      # 0  the hook: Cas9 swoops in and clamps on the downbeat of beat 3
        ('Ab', 'G'),       # 1  the SNIP, and the rush into the break; the rewind starts at 3.0
        ('Cm', 'Cm'),      # 2  the search begins: the helix straightens, Cas9 slides along
        ('Fm', 'G'),       # 3  the wrong site (TIK), the right PAM (TIK), the bases pair, the LOCK at 7.0
        ('Cm', 'Cm'),      # 4  closing in on the cutting domains
        ('Ab', 'Ab'),      # 5  the domains swing in; the SNIP lands on 10.0
        ('Eb', 'Eb'),      # 6  the slow motion: the music drops to a hush
        ('Fm', 'Fm'),      # 7  Cas9 lets go; the repair proteins arrive (TIK, TIK)
        ('Cm', 'G'),       # 8  the ends are trimmed and sealed (SNAP at 16.0)
        ('Ab', 'Bb'),      # 9  the result: before and after, DNA EDITED
        ('Cm', 'G')]       # 10 the turnaround: on to the next target, back into the first frame
N_BARS = len(BARS)
assert abs(N_BARS * T.BAR - T.TOTAL) < 1e-9

LEAD = {0: seq('G5 . C6 . Eb6 - C6 . G5 - . . C6 - D6 .'),
        1: seq('Eb6 - - . C6 . G5 . D6 - - - - - - -'),
        2: seq('. . . . G5 . Bb5 . C6 - - . G5 . F5 .'),
        3: seq('. . . . . . . . Eb6 . F6 . G6 - - -'),
        4: seq('C6 - - . Eb6 - - . G6 - - . Eb6 . C6 .'),
        5: seq('Ab5 - - - C6 - - - Eb6 - - - - - - -'),
        8: seq('. . . . . . . . C6 . Eb6 . G6 - - -'),
        9: seq('Ab5 . C6 . Eb6 - C6 . Bb5 - D6 - F6 - - -'),
        10: seq('Eb6 - C6 - G5 - - . G5 . Bb5 . C6 - - -')}
HARM = {9: seq('C6 . Eb6 . G6 - Eb6 . D6 - F6 - Ab6 - - -'),
        4: seq('G5 - - . C6 - - . Eb6 - - . C6 . G5 .')}
BELL = {7: seq('C6 - - - Eb6 - - - G5 - - - C6 - - -'),
        6: seq('Eb6 - - - - - - - Bb5 - - - - - - -')}
DRIVE = (0, 1, 2, 3, 4, 9, 10)          # bars with the full beat
HUSH = (6,)                             # the slow motion


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
    if b in HUSH:
        return [(base, 7.5, root - 12, 0.2)]
    if b in (7, 8):
        return [(base, 3.5, root, 0.24), (base + 4, 3.5, root + 7, 0.2)]
    return [(base + 2 * k, 1.6, root + iv, 0.3 if k % 2 == 0 else 0.22) for k, iv in enumerate((0, 12, 7, 12))]


def music():
    bus = {k: Bus() for k in ('lead', 'harm', 'arp', 'bass', 'drum', 'pad', 'bell')}
    for b in range(N_BARS):
        for s, l, m in LEAD.get(b, []):
            dur = l * STEP * (0.85 if l <= 2 else 0.95)
            g = 0.18 if b not in HUSH else 0.1
            if abs(bar_t(b, s) - T.TIK1) < 0.26:            # leave a hole for the dull tick at the wrong site
                continue
            bus['lead'].put(lead(m, dur, 0.25, vib=0.14 if l > 2 else 0.05), bar_t(b, s), g, 0.06)
        for s, l, m in HARM.get(b, []):
            bus['harm'].put(lead(m, l * STEP * 0.9, 0.125, vib=0.06), bar_t(b, s), 0.07, -0.3)
        for s, l, m in BELL.get(b, []):
            bus['bell'].put(bell(m, max(0.8, l * STEP + 0.6), 1.5, 3.5), bar_t(b, s), 0.2, 0.1)
        for half in (0, 1):
            root, iv = CH[BARS[b][half]]
            for st, l, m, g in _bass_notes(b, half, root):
                bus['bass'].put(bass(m, l * STEP), bar_t(b, st), g)
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            base = 8 * half
            if b in DRIVE:
                for k, pi in enumerate((0, 1, 2, 3, 2, 1, 2, 3)):
                    bus['arp'].put(chip_arp(tones[pi] + 12, STEP * 0.7), bar_t(b, base + k),
                                   0.02, 0.45 if k % 2 else -0.45)
            elif b == 5:                                     # the build into the cut
                for k, pi in enumerate((0, 1, 2, 3, 0, 1, 2, 3)):
                    bus['arp'].put(chip_arp(tones[pi] + 12 + 12 * half, STEP * 0.7), bar_t(b, base + k),
                                   0.018 + 0.003 * k, -0.4 if k % 2 else 0.4)
    for b in (5, 6, 7, 8):                                   # a soft pad under the quiet half
        for half in (0, 1):
            root, iv = CH[BARS[b][half]]
            bus['pad'].put(pad([root + 36 + i for i in iv], T.BAR / 2 - 0.05, 0.18), bar_t(b, 8 * half), 0.05)
    _drums(bus['drum'])
    mix = sum(x.x for x in bus.values())
    lead_st = bus['lead'].x + bus['harm'].x + 0.6 * bus['bell'].x
    mix = mix + 0.28 * np.stack([echo(lead_st.sum(0) * 0.5, 0.375, 0.3), echo(lead_st.sum(0) * 0.5, 0.25, 0.26)])
    mix = mix + 0.13 * reverb(mix - 0.9 * bus['bass'].x - 0.6 * bus['drum'].x)
    return mix


def _drums(d):
    K, Sn, Hc, C, Ho = kick(), snare(0.8), hat(False), crash(), hat(True)
    for b in DRIVE:
        for k in (0, 8):
            d.put(K, bar_t(b, k), 0.32)
        for k in (4, 12):
            d.put(Sn, bar_t(b, k), 0.12, 0.08)
        for k in range(0, 16, 2):
            d.put(Hc, bar_t(b, k), 0.028 if k % 4 else 0.036, 0.3)
    d.put(C, 0.0, 0.07, -0.1)
    d.put(K, T.SNIP1, 0.42)                                   # the first cut lands with the kick
    d.put(C, T.SNIP1, 0.1, 0.1)
    # bar 5: the build into the big cut
    for k in range(8, 16):
        d.put(Sn, bar_t(5, k), 0.04 + 0.014 * (k - 8), 0.05)
    for k in (0, 4, 8, 12):
        d.put(K, bar_t(5, k), 0.3)
    d.put(K, T.SNIP2, 0.44)                                   # the cut, on the bar line
    d.put(C, T.SNIP2, 0.12, 0.05)
    # the slow motion: just a heartbeat
    for k in (0, 10):
        d.put(K, bar_t(6, k), 0.2)
    # the repair
    for k in (0, 8):
        d.put(K, bar_t(7, k), 0.24)
        d.put(K, bar_t(8, k), 0.26)
    for k in (4, 12):
        d.put(Sn, bar_t(8, k), 0.1, 0.05)
    d.put(C, T.SNAP, 0.09, 0.1)
    d.put(Ho, bar_t(8, 14), 0.04, 0.3)
    # the result
    d.put(C, T.RESULT[0], 0.1, 0.0)
    for k, m in zip((12, 13, 14, 15), (55, 52, 48, 45)):      # a tom fill back into the top
        d.put(tom(m), bar_t(10, k), 0.12 + 0.015 * (k - 12), 0.3 - 0.2 * (k - 12))


# ================================================================ sound effects
def snip(seed=0, big=True):
    """Two blades closing: a short metallic shear, a bright chip blip and a thump under it."""
    dur = 0.3
    n = int(dur * SR)
    t = np.arange(n) / SR
    shear = bandnoise(dur, lambda tt: 5200 * 0.25 ** np.clip(tt / 0.09, 0, 1), 0.55, seed)
    shear = shear * np.minimum(1, t / 0.0012) * np.exp(-t / 0.035)
    ping = np.sin(2 * math.pi * 2600 * t) * np.exp(-t / 0.02) + 0.5 * np.sin(2 * math.pi * 3900 * t) * np.exp(-t / 0.012)
    body = thump(180, 60, 0.26, 0.5, seed + 1) if big else np.zeros(n)
    y = np.zeros(n)
    y[:len(shear)] += 1.0 * shear[:n]
    y += 0.5 * ping
    y[:len(body)] += (0.8 if big else 0.0) * body[:n]
    return y / (np.abs(y).max() + 1e-9)


def tik(f=2200.0, dur=0.05, ok=True):
    """A small arcade tick: bright and rising when it is a match, dull and falling when it is not."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f1 = f * (1.6 if ok else 0.55)
    fr = f * (f1 / f) ** np.clip(t / (dur * 0.7), 0, 1)
    y = pulse(fr, n, 0.3) * np.exp(-t / (dur / 3.2))
    y += 0.4 * highpass(white(n, int(f) % 97), 3000, 63) * np.exp(-t / 0.0025)
    return y / (np.abs(y).max() + 1e-9)


def lock_sfx():
    """The complex locking on: a mechanical clack and a bright chord stab."""
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    cl = click(9, 1800, 0.05)
    y[:len(cl)] += cl
    for k, m in enumerate((72, 75, 79, 84)):
        b = bell(m, 0.42, 1.4, 3.0)
        s0 = int(k * 0.012 * SR)
        y[s0:s0 + len(b)] += b[:n - s0] * 0.5
    return y / (np.abs(y).max() + 1e-9)


def servo(dur=0.5, up=True, seed=0):
    """A domain swinging into place: a filtered sweep with a little motor buzz."""
    y = bandnoise(dur, lambda tt: (600 * 4 ** (tt / dur)) if up else (2400 * 0.25 ** (tt / dur)), 0.75, seed)
    t = np.arange(len(y)) / SR
    buzz = 0.25 * tri(90 + 60 * t / dur, len(y)) * np.exp(-t / (dur * 0.6))
    e = np.minimum(1, t / 0.02) * np.clip((dur - t) / 0.12, 0, 1)
    return (y + buzz) * e


def rewind_sfx(dur):
    """A tape running backwards: a band of noise wowing up and down with a flutter."""
    y = bandnoise(dur, lambda tt: 900 * (1 + 2.2 * np.sin(np.pi * np.clip(tt / dur, 0, 1))), 0.6, 71)
    t = np.arange(len(y)) / SR
    flut = 0.55 + 0.45 * np.sin(2 * math.pi * 22 * t)
    squeal = 0.25 * np.sin(2 * math.pi * (1800 + 900 * np.sin(2 * math.pi * 3 * t)) * t)
    e = np.minimum(1, t / 0.04) * np.clip((dur - t) / 0.08, 0, 1)
    return (y * flut + squeal) * e


def pair_blip(m, dur=0.07):
    """One guide base finding its partner: a tiny bright blip."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = pulse(mtof(m), n, 0.25) * np.exp(-t / (dur / 3.0))
    y += 0.3 * np.sin(2 * math.pi * mtof(m + 12) * t) * np.exp(-t / (dur / 4.0))
    return y / (np.abs(y).max() + 1e-9)


def snap_sfx():
    """The strands sealed: a woody snap and a bright ping."""
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * math.pi * np.cumsum(np.full(n, 520.0) * (1 + 1.4 * np.exp(-t / 0.004))) / SR) * np.exp(-t / 0.03)
    crack = highpass(white(n, 23), 2600, 63) * np.exp(-t / 0.004)
    ping = np.sin(2 * math.pi * 3136 * t) * np.exp(-t / 0.08)
    y = 0.9 * body + 0.8 * crack + 0.35 * ping
    return y / (np.abs(y).max() + 1e-9)


def sfx():
    bus = Bus()
    # --- the hook
    put_pan(bus, whoosh(1.0, 500, 2300, 31, 0.8, 0.62), 0.0, 0.3, -0.7, 0.0)
    bus.put(click(5, 2500, 0.04), T.CLICK, 0.5, 0.0)
    bus.put(thump(240, 110, 0.14, 0.3, 6), T.CLICK, 0.22, 0.0)
    bus.put(snip(1), T.SNIP1, 0.62, 0.0)
    bus.put(whoosh(T.RUSH[1] - T.RUSH[0], 300, 2600, 35, 0.9, 0.8), T.RUSH[0], 0.22, 0.0)
    # --- the rewind
    bus.put(rewind_sfx(T.REWIND[1] - T.REWIND[0]), T.REWIND[0], 0.3, 0.0)
    # --- the search
    bus.put(whoosh(0.5, 3000, 900, 37, 0.8, 0.3), T.XRAY[0], 0.34, 0.0)
    for t0, ok in ((T.TIK1, False), (T.TIK2, True)):
        bus.put(tik(3200.0 if ok else 2600.0, 0.06, ok), t0, 0.85 if ok else 0.9, -0.15 if not ok else 0.15)
        if not ok:
            bus.put(tik(700.0, 0.09, False), t0 + 0.09, 0.5, -0.2)
    # the twenty guide bases pairing: a fast rising run on a pentatonic ladder
    ladder = [60, 63, 65, 67, 70, 72, 75, 77, 79, 82, 84, 87, 89, 91, 94, 96, 99, 101, 103, 106]
    for j in range(T.N_SPACER):
        bus.put(pair_blip(ladder[j]), T.pair_time(j), 0.15, -0.5 + j / (T.N_SPACER - 1))
    bus.put(lock_sfx(), T.LOCK, 0.5, 0.0)
    # --- the cut
    bus.put(servo(0.55, True, 44), T.DOMAINS[0], 0.42, 0.3)
    bus.put(servo(0.6, True, 45), T.DOMAINS[0] + 0.35, 0.42, -0.3)
    bus.put(snip(2), T.SNIP2, 0.75, 0.0)
    bus.put(glide(1400, 180, 1.4, 0.0), T.SNIP2 + 0.05, 0.1, 0.0)          # into the slow motion
    bus.put(hiss(1.6, 500, 160, 51, 0.1, 1.6), T.SNIP2 + 0.1, 0.09, 0.0)
    bus.put(whoosh(0.9, 400, 1500, 53, 0.8, 0.5), T.BACK_OUT[0], 0.13, 0.0)
    # --- the repair
    put_pan(bus, whoosh(0.8, 1600, 450, 55, 0.8, 0.35), T.RELEASE[0], 0.14, 0.0, -0.8)
    for k, t0 in enumerate((T.KU1, T.KU2)):
        bus.put(tik(1500.0, 0.07, True), t0, 0.34, -0.25 + 0.5 * k)
        bus.put(thump(190, 90, 0.12, 0.25, 60 + k), t0, 0.12, -0.25 + 0.5 * k)
    bus.put(burble(0.5, rate=34.0, seed=9, f_lo=2600.0, f_hi=5200.0), T.TRIM[0], 0.3, 0.0)
    bus.put(snap_sfx(), T.SNAP, 0.6, 0.0)
    # --- the result and the loop
    for k, m in enumerate((84, 88, 91, 96)):
        bus.put(bell(m, 0.5, 1.3, 3.0), T.RESULT[0] + 0.1 * k, 0.12, -0.3 + 0.2 * k)
    bus.put(blip(1400, 2800, 0.1, 0.25), T.LABEL_EDITED, 0.42, 0.0)
    bus.put(bell(99, 0.5, 1.3, 3.0), T.LABEL_EDITED + 0.02, 0.16, 0.0)
    put_pan(bus, whoosh(T.LOOP[1] - T.LOOP[0] - 0.2, 1500, 4200, 57, 0.75, 0.6), T.LOOP[0] + 0.1, 0.5, 0.6, -0.6)
    return bus.x


def duck_env():
    """The music steps back for the two cuts and the snap."""
    t = np.arange(N) / SR
    g = np.ones(N)
    for t0, depth, hold in ((T.SNIP1, 0.35, 0.14), (T.SNIP2, 0.4, 0.2), (T.SNAP, 0.25, 0.12),
                            (T.REWIND[0], 0.3, T.REWIND[1] - T.REWIND[0])):
        a = np.clip((t - (t0 - 0.02)) / 0.02, 0, 1) * np.clip(1 - (t - t0 - hold) / 0.3, 0, 1)
        g -= depth * a * (t >= t0 - 0.02)
    return np.clip(g, 0.4, 1)


def slowmo_filter(mus):
    """The music is muffled through the slow motion, as if the whole scene were under water."""
    t = np.arange(mus.shape[1]) / SR % T.TOTAL
    k = np.clip((t - T.SNIP2) / 0.25, 0, 1) * np.clip((T.SLOWMO[1] - t) / 0.5, 0, 1)
    k = np.maximum(k, np.clip((t - T.REWIND[0]) / 0.05, 0, 1) * np.clip((T.REWIND[1] - t) / 0.05, 0, 1))
    lo = np.stack([lowpass(mus[0], 700, 255), lowpass(mus[1], 700, 255)])
    w = 0.85 * k
    return mus * (1 - w) + lo * w


def loop_wrap(x):
    """Fold everything that rings past the end back onto the start, so the loop is seamless."""
    y = x[:, :NT].copy()
    tail = x[:, NT:]
    k = min(tail.shape[1], NT)
    y[:, :k] += tail[:, :k]
    return y


def master(mus, fx, target=-14.0):
    mix = loop_wrap(0.62 * slowmo_filter(mus) * duck_env()[None, :] + 1.5 * fx)
    mix = np.stack([lowpass(mix[0], 15500, 127), lowpass(mix[1], 15500, 127)])
    ceiling = -1.6
    pad_ = int(0.05 * SR)                    # the film loops, so limit it wrapped round
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
