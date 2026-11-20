"""Score and sound effects, synthesized in code (no samples): a catchy 16-bit chiptune loop and playful lab foley.

Chip voices: band-limited pulse waves (PolyBLEP), the NES 4-bit triangle bass, LFSR noise drums, an SNES-style echo and
FM bells (the synth core is shared with the repo's other pixel films). 120 BPM in G major, 15 bars of 4/4 = exactly
30 s. The square-wave hook (D6 B5 D6 G6 F#6 | A5 D6 F#6 E6 D6) opens the loop and comes back after the focus. The score
loops seamlessly: the last bar's D7 turnaround resolves into the first, and echo and reverb tails wrap onto the start.

The effects sit on the beat grid of engine/timeline.py so they play as part of the rhythm: the glass "shhk", the
focus "tik", the stage clip "tik", the nosepiece "click", the rising whoosh up the light path, the crisp note as the
cells snap into focus and the two-note chime on the white cell. The music thins under the focus and ducks a touch
under each main action so every one has room.
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




# ---------------------------------------------------------------- the score (G major, 18 bars, loops)
HOOK_A = [(0, 2, 86), (2, 1, 83), (3, 1, 86), (4, 2, 91), (6, 2, 90), (8, 1, 81), (9, 1, 86), (10, 2, 90),
          (12, 2, 88), (14, 2, 86)]                                         # over G | D
HOOK_B = [(0, 2, 88), (2, 1, 83), (3, 1, 88), (4, 2, 91), (6, 1, 90), (7, 1, 88), (8, 2, 88), (10, 1, 86),
          (11, 1, 84), (12, 2, 86), (14, 2, 83)]                            # over Em | C
HOOK_A2 = HOOK_A[:-2] + [(12, 1, 93), (13, 1, 91), (14, 2, 90)]
HOOK_C = [(0, 2, 88), (2, 1, 91), (3, 1, 95), (4, 2, 93), (6, 2, 91), (10, 1, 86), (11, 1, 84), (12, 4, 86)]  # rest: clip
MACH_1 = [(0, 1, 79), (2, 1, 84), (3, 1, 88), (6, 1, 91), (8, 1, 81), (10, 1, 86), (11, 1, 90), (14, 1, 93)]
MACH_2 = [(0, 2, 83), (2, 1, 86), (6, 2, 91), (8, 2, 88), (10, 1, 91), (12, 2, 95), (14, 2, 93)]  # rest: the click
# the x-ray explainer: a softer lead that leaves each step's ding alone (steps at 12.5, 15.0, 17.5; total at 20.0)
XR_1 = [(4, 2, 84), (6, 2, 88), (8, 4, 86), (12, 4, 90)]
XR_2 = [(0, 4, 88), (4, 4, 91), (10, 2, 88), (12, 4, 84)]
XR_3 = [(0, 4, 86), (4, 2, 91), (6, 2, 90), (8, 4, 86), (14, 2, 81)]
XR_4 = [(0, 4, 83), (4, 4, 88), (8, 4, 91), (12, 4, 95)]
XR_5 = [(0, 1, 86), (1, 1, 91), (2, 1, 95), (3, 1, 98), (4, 4, 98), (8, 4, 95), (12, 4, 91)]  # 400x fanfare
PICKUP = [(12, 1, 79), (13, 1, 81), (14, 1, 83), (15, 1, 84)]
REVEAL = [(4, 2, 91), (6, 2, 93), (8, 4, 90), (12, 4, 86)]                  # after the chime
SOFT = [(0, 6, 88), (6, 2, 86), (8, 8, 84)]
TURN = [(0, 4, 81), (4, 2, 86), (6, 2, 90), (8, 1, 93), (9, 1, 90), (10, 1, 86), (11, 1, 81), (12, 1, 84),
        (13, 1, 86), (14, 1, 88), (15, 1, 90)]                              # D7 turnaround into the top of the loop
HOOK_A0 = [n for n in HOOK_A if n[0] != 4] + [(5, 1, 91)]                 # bar 0 leaves the snap's beat alone
LEAD = {0: HOOK_A0, 1: HOOK_B, 2: HOOK_A2, 3: HOOK_C, 4: MACH_1, 5: MACH_2, 6: XR_1, 7: XR_2, 8: XR_3, 9: XR_4,
        10: XR_5, 12: PICKUP, 13: HOOK_A, 14: HOOK_B, 15: REVEAL, 16: SOFT, 17: TURN}
SOFT_BARS = (6, 7, 8, 9, 16)
_THIRD = {0: 4, 2: 3, 4: 3, 5: 4, 7: 4, 9: 3, 11: 3, 6: 3}                # G major: a diatonic third below


def third_below(m):
    return m - _THIRD.get((m - 7) % 12, 3)


HARM = {b: [(s, l, third_below(m)) for s, l, m in LEAD[b]] for b in (10, 13, 14)}
CHORD = {'G': (43, (0, 4, 7)), 'D': (50, (0, 4, 7)), 'Em': (52, (0, 3, 7)), 'C': (48, (0, 4, 7)),
         'Am': (45, (0, 3, 7)), 'D7': (50, (0, 4, 7, 10))}
BARS = [('G', 'D'), ('Em', 'C'), ('G', 'D'), ('Em', 'C'), ('C', 'D'), ('G', 'Em'),
        ('C', 'D'), ('Em', 'C'), ('G', 'D'), ('Em', 'C'), ('G', 'D'),
        ('C', 'C'), ('Am', 'D'), ('G', 'D'), ('Em', 'C'), ('G', 'D'), ('C', 'Am'), ('D', 'D7')]
N_BARS = len(BARS)
assert N_BARS * T.BAR == T.TOTAL
THIN = (11, 12)                       # the focus: the music thins until the cells snap into focus (24.5 s)
B_MACH, B_XRAY, B_FANFARE, B_THIN, B_SNAP, B_HOOK2, B_REVEAL, B_SOFT, B_TURN = (4, 5), (6, 7, 8, 9), 10, 11, 12, \
    (13, 14), 15, 16, 17


def bar_t(b, step=0):
    return b * T.BAR + step * STEP


def music():
    lead_bus, harm_bus, arp_bus, bass_bus, drum_bus, pad_bus = (Bus() for _ in range(6))
    for b, notes in LEAD.items():
        for s, l, m in notes:
            dur = l * STEP * (0.9 if l <= 2 else 0.96)
            if b in SOFT_BARS:
                lead_bus.put(lead(m, dur, 0.5, vib=0.14), bar_t(b, s), 0.14, 0.05)
            elif b in B_MACH:
                lead_bus.put(lead(m, STEP * 0.7, 0.125, vib=0.0), bar_t(b, s), 0.17, 0.12 * (1 if s % 4 else -1))
            else:
                lead_bus.put(lead(m, dur, 0.25), bar_t(b, s), 0.19, 0.05)
    for b, notes in HARM.items():
        for s, l, m in notes:
            harm_bus.put(lead(m, l * STEP * 0.9, 0.125, vib=0.1), bar_t(b, s), 0.09, -0.3)
    # bass: bouncy octaves in the hook, staccato in the machine bars, held through the focus
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root = CHORD[name][0]
            base = bar_t(b, 8 * half)
            if b == B_THIN or (b == B_SNAP and half == 0):
                bass_bus.put(bass(root, 0.95), base, 0.22)
            elif b == B_SOFT:
                bass_bus.put(bass(root, 0.95), base, 0.25)
            elif b == B_TURN:
                walk = [0, 0, 2, 4, 5, 7, 9, 10] if half else [0, 12, 7, 12, 0, 12, 7, 12]
                for k, iv in enumerate(walk):
                    bass_bus.put(bass(root + iv, STEP * 1.6), base + 2 * k * STEP, 0.27)
            elif b in B_MACH:
                for k in range(4):
                    bass_bus.put(bass(root + (12 if k == 3 else 0), STEP * 0.8), base + 2 * k * STEP, 0.3)
                    bass_bus.put(bass(root, STEP * 0.6), base + (2 * k + 1) * STEP, 0.16)
            elif b in B_XRAY:
                for k in range(4):
                    bass_bus.put(bass(root + (7 if k == 2 else 0), STEP * 1.7), base + 2 * k * STEP, 0.24)
            else:
                pat = [0, 12, 7, 12]
                for k in range(4):
                    bass_bus.put(bass(root + pat[k], STEP * 1.6), base + 2 * k * STEP, 0.28)
    # arpeggios
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root, iv = CHORD[name]
            base = bar_t(b, 8 * half)
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            if b in B_MACH + (B_FANFARE,) + B_HOOK2:
                pat = [0, 1, 2, 3, 2, 1, 2, 3]
                for k in range(8):
                    arp_bus.put(chip_arp(tones[pat[k]], STEP * 0.85), base + k * STEP, 0.05, -0.5)
            elif b in B_XRAY:                              # a glassy, slower arpeggio under the explanation
                for k in range(4):
                    arp_bus.put(chip_arp(tones[k] + 12, STEP * 1.6, 0.25), base + 2 * k * STEP, 0.038, -0.45)
            elif b in (B_THIN, B_SOFT):
                for k in range(4):
                    arp_bus.put(chip_arp(tones[k], STEP * 1.7, 0.25), base + 2 * k * STEP, 0.04, -0.45)
    # pads under the x-ray, the focus and the reveal
    for b in B_XRAY + (B_THIN, B_SNAP, B_REVEAL, B_SOFT):
        for half in (0, 1):
            if b == B_SNAP and half:
                continue
            root, iv = CHORD[BARS[b][half]]
            pad_bus.put(pad([root + 24 + i for i in iv], 0.95, 0.12), bar_t(b, 8 * half), 0.05)
    # drums
    K, S, Hc, Ho, C = kick(), snare(), hat(False), hat(True), crash()
    for b in range(N_BARS):
        t0 = bar_t(b)
        if b in (0, B_FANFARE, B_HOOK2[0]):
            drum_bus.put(C, t0, 0.15, 0.25)
        if b == B_THIN:                                # thin: only soft ticks
            for k in range(0, 16, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.03, 0.3)
            continue
        if b == B_SNAP:                                # the cells snap into focus at 24.5; the groove is back at 25
            drum_bus.put(C, t0 + 8 * STEP, 0.12, -0.25)
            for k in (8, 12):
                drum_bus.put(K, t0 + k * STEP, 0.42)
            drum_bus.put(S, t0 + 12 * STEP, 0.24, 0.08)
            for k in range(8, 16):
                drum_bus.put(Hc, t0 + k * STEP, 0.08 if k % 2 == 0 else 0.04, 0.3)
            continue
        if b == B_SOFT:                                # half time while the white cell holds the screen
            drum_bus.put(K, t0, 0.36)
            drum_bus.put(S, t0 + 8 * STEP, 0.18, 0.08)
            for k in range(0, 16, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.04, 0.3)
            continue
        if b in B_XRAY:                                # a steady, lighter groove under the explanation
            for k in (0, 8):
                drum_bus.put(K, t0 + k * STEP, 0.36)
            for k in (4, 12):
                drum_bus.put(S, t0 + k * STEP, 0.15, 0.08)
            for k in range(0, 16, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.06 if k % 4 == 2 else 0.035, 0.3)
            continue
        four = b in B_MACH
        for k in ((0, 4, 8, 12) if four else (0, 8, 10)):
            drum_bus.put(K, t0 + k * STEP, 0.42)
        for k in (4, 12):
            if b == 5 and k == 4:                      # the nosepiece click owns this beat
                continue
            if b == B_TURN and k == 12:
                continue
            drum_bus.put(S, t0 + k * STEP, 0.24, 0.08)
        for k in range(16):
            if not four and k % 2:
                continue
            if b == B_TURN and k >= 12:
                continue
            drum_bus.put(Hc, t0 + k * STEP, 0.1 if k % 4 == 2 else 0.045, 0.3)
        if b in (1, 3, 14):
            drum_bus.put(Ho, t0 + 14 * STEP, 0.07, 0.3)
        if b == B_TURN:                                # a tom fill back into the top of the loop
            for i, m in enumerate((55, 52, 48, 45)):
                drum_bus.put(tom(m), t0 + (12 + i) * STEP, 0.24, 0.4 - 0.25 * i)
    lead_st = lead_bus.x + harm_bus.x
    dl = np.stack([echo(lead_st.sum(0) * 0.5, 0.375, 0.3), echo(lead_st.sum(0) * 0.5, 0.25, 0.28)])
    mus = lead_st + 0.4 * dl + arp_bus.x + bass_bus.x + drum_bus.x + pad_bus.x
    mus = mus + 0.15 * reverb(mus - 0.9 * bass_bus.x - 0.6 * drum_bus.x)
    tail = mus[:, NT:]                                 # the loop: what rings past the end wraps onto the start
    mus = mus[:, :NT].copy()
    mus[:, :tail.shape[1]] += tail
    return mus


# ---------------------------------------------------------------- sound effects
def shhk(dur, seed=41):
    """Glass drawn across glass through a film of blood: a bright, slightly gritty noise sweep."""
    y = bandnoise(dur, lambda tt: 1700 + 4200 * np.clip(tt / dur, 0, 1) ** 0.8, 0.45, seed)
    x = np.arange(len(y)) / SR
    grit = 0.75 + 0.25 * np.sign(np.sin(2 * math.pi * 47 * x + 3 * np.sin(2 * math.pi * 3.1 * x)))
    env = np.clip(x / 0.03, 0, 1) * (0.75 + 0.25 * np.sin(math.pi * np.clip(x / dur, 0, 1))) * \
        np.clip((dur - x) / 0.07, 0, 1)
    hiss = bandnoise(dur, lambda tt: 7500 + 0 * tt, 0.6, seed + 1)
    return (y * grit + 0.35 * hiss) * env


def ratchet(bus, t0, t1, gain, f0=2200, f1=3000, step=STEP):
    n = int(round((t1 - t0) / step))
    for i in range(n):
        u = i / max(1, n - 1)
        bus.put(click(60 + i, f0 + (f1 - f0) * u, 0.02), t0 + i * step, gain, 0.25)


def sfx_forward():
    bus = Bus()
    # 1. the hook: inside the microscope the red cells snap into focus on a crisp arcade "tik"
    bus.put(blip(2637.0, 3136.0, 0.05, 0.5), T.HOOK_SNAP, 0.11, 0.0)
    bus.put(click(7, 6000, 0.012), T.HOOK_SNAP, 0.08)
    # 2. how it was made: the edge touches the drop (a glassy tink), the blood runs along the edge, the swipe ("shhk")
    bus.put(glass_ping(3300, 0.25, 3), T.TOUCH, 0.05, 0.1)
    wk = bandnoise(0.25, lambda tt: 900 + 400 * tt / 0.25, 0.6, 4)
    bus.put(wk * env_exp(len(wk), 0.12, 0.02), T.TOUCH + 0.02, 0.06)
    bus.put(shhk(T.SWIPE[1] - T.SWIPE[0] - 0.1), T.SWIPE[0], 0.32, -0.1)
    bus.put(whoosh(0.3, 2400, 900, 5, 0.8, 0.3), T.LIFT[0], 0.08, 0.3)
    # 3. time passes: a soft glassy swell under the dissolve; the slide is slid away
    sw = bandnoise(1.0, lambda tt: 2500 + 3500 * tt, 0.7, 8)
    xs = np.arange(len(sw)) / SR
    bus.put(sw * np.clip(xs / 0.8, 0, 1) ** 2 * np.clip((1.0 - xs) / 0.15, 0, 1), T.DISSOLVE[0], 0.05, -0.2)
    bus.put(bell(91, 0.9, 1.2, 2.0), T.DISSOLVE[1], 0.035, 0.2)
    bus.put(whoosh(0.45, 900, 2200, 9, 0.8, 0.7), 5.55, 0.1, -0.4)          # the slide is slid away
    # 4. onto the stage: glass sliding on metal, the clip settles ("tik"), the camera pulls back
    sl = bandnoise(T.SLIDE_IN[1] - T.SLIDE_IN[0], lambda tt: 1400 - 600 * tt, 0.5, 10)
    xs = np.arange(len(sl)) / SR
    bus.put(sl * np.exp(-xs / 0.35), T.SLIDE_IN[0], 0.09, 0.3)
    bus.put(glass_ping(4400, 0.18, 11), T.CLIP[1], 0.09, 0.25)
    bus.put(click(12, 5200, 0.015), T.CLIP[1], 0.09, 0.25)
    bus.put(whoosh(1.6, 1800, 500, 13, 0.8, 0.25), T.PULLBACK[0] + 0.05, 0.08)
    # 5. the nosepiece turns (ratchet) and locks with one firm click; the camera drops toward the lamp
    bus.put(whoosh(0.8, 500, 1600, 14, 0.8, 0.6), T.TO_TURRET[0], 0.06)
    ratchet(bus, T.TURN[0], T.TURN[1] - 0.05, 0.035, 1500, 2600)
    bus.put(thump(170, 60, 0.25, 0.8, 15), T.TURN[1], 0.32)
    bus.put(click(16, 2600, 0.03), T.TURN[1], 0.18)
    bus.put(glass_ping(1760, 0.3, 17), T.TURN[1] + 0.005, 0.05)
    bus.put(whoosh(0.6, 1600, 450, 18, 0.8, 0.3), T.DOWN[0], 0.07)
    # 6. the x-ray scan; each step dings; the light rises with a short arcade whoosh; rays zip; 400x fanfare blips
    n = int(0.5 * SR)
    xs = np.arange(n) / SR
    buzz = pulse(220 * (2.0 ** (xs / 0.5)), n, 0.125) * np.sin(math.pi * xs / 0.5) ** 2
    bus.put(lowpass(buzz, 3000, 63), T.XRAY_ON[0], 0.05, -0.2)
    bus.put(bandnoise(0.5, lambda tt: 2000 + 5000 * tt, 0.5, 30) * np.sin(math.pi * xs / 0.5) ** 2, T.XRAY_ON[0], 0.05)
    for i, t_step in enumerate((T.STEP1[0], T.STEP2[0], T.STEP3[0])):
        bus.put(bell(88 + 3 * i, 0.6, 1.4, 2.0), t_step, 0.06, -0.2 + 0.2 * i)
    ld = T.LIGHT[1] - T.LIGHT[0]
    hum_d = T.TOTALMAG[1] - T.LIGHT[0]
    hn = int(hum_d * SR)
    xh = np.arange(hn) / SR
    hum = (tri(110, hn) * 0.6 + sine(220, hn) * 0.4) * np.clip(xh / 0.3, 0, 1) * np.clip((hum_d - xh) / 0.5, 0, 1)
    bus.put(hum, T.LIGHT[0], 0.035)
    bus.put(whoosh(ld, 500, 4200, 19, 0.7, 0.85), T.LIGHT[0], 0.12, -0.15)
    for i, m in enumerate((67, 71, 74, 79, 83, 86)):
        bus.put(blip(mtof(m), mtof(m + 12), 0.08, 0.25), T.LIGHT[0] + 0.1 + i * ld / 7, 0.03, -0.5 + 0.15 * i)
    for t_rays, base_m in ((T.STEP2[0] + 0.5, 83), (T.STEP3[0] + 0.5, 86)):
        for i in range(3):
            bus.put(blip(mtof(base_m + 4 * i), mtof(base_m + 4 * i + 12), 0.1, 0.25), t_rays + 0.25 * i, 0.035, 0.3)
    bus.put(boing(330, 0.3), T.STEP2[0] + 1.6, 0.05)                                  # the image pops up
    bus.put(glass_ping(2093, 0.4, 31), T.STEP3[0] + 1.6, 0.04, -0.3)                 # light reaches the eye
    for i, m in enumerate((91, 98, 103)):
        bus.put(blip(mtof(m), mtof(m), 0.07, 0.5), T.TOTALMAG[0] + 0.12 * i, 0.04, 0.2)
    # 7. fine focus: soft ticks as the knob turns; the image comes into focus; a crisp high note when it is sharp
    ratchet(bus, T.FINE_TURN[0] + 0.1, T.FINE_TURN[1] - 0.05, 0.022, 2800, 2800, STEP)
    fn = int((T.FOCUS[1] - T.FOCUS[0]) * SR)
    xf = np.arange(fn) / SR
    rise = sine(440 * (2.0 ** (xf / 1.5)), fn) * (xf / 1.5) ** 2 * 0.6
    bus.put(rise, T.FOCUS[0], 0.03)
    for i, (m, g) in enumerate(((95, 0.12), (107, 0.05))):
        nn = int(0.35 * SR)
        xx = np.arange(nn) / SR
        note = pulse(mtof(m), nn, 0.25) * np.minimum(1, xx / 0.002) * np.exp(-xx / 0.09)
        bus.put(note, T.FOCUS[1], g, 0.1)
    bus.put(bell(107, 0.7, 1.8, 2.0), T.FOCUS[1], 0.05)
    # 8. a small turn of the stage control; the field glides; the larger cell slides in
    ratchet(bus, T.STAGE_TURN[0] + 0.1, T.STAGE_TURN[1] - 0.05, 0.022, 2300, 2300, STEP)
    gd = T.GLIDE[1] - T.GLIDE[0]
    gl = bandnoise(gd, lambda tt: 600 + 300 * np.sin(math.pi * tt / gd), 0.9, 21)
    xg = np.arange(len(gl)) / SR
    bus.put(gl * np.sin(math.pi * np.clip(xg / gd, 0, 1)), T.GLIDE[0], 0.035, -0.3)
    nb = int(0.35 * SR)
    xb = np.arange(nb) / SR
    bus.put(sine(196 * (1.5 ** np.clip(xb / 0.2, 0, 1)), nb) * np.exp(-xb / 0.12), 22.75, 0.07, 0.4)
    # 9. the field settles on the white blood cell: a short two-note chime
    for i, m in enumerate((91, 98)):
        nn = int(0.55 * SR)
        xx = np.arange(nn) / SR
        ch = pulse(mtof(m), nn, 0.25) * np.minimum(1, xx / 0.003) * np.exp(-xx / 0.17)
        bus.put(ch, T.CHIME + i * 0.15, 0.15, -0.15 + 0.3 * i)
        bus.put(bell(m + 12, 0.7, 1.0, 2.0), T.CHIME + i * 0.15, 0.05)
    # 10. the stage glides back to the opening field and the focus softens into the loop
    gd = T.GLIDE_BACK[1] - T.GLIDE_BACK[0]
    gb = bandnoise(gd, lambda tt: 700 + 500 * np.sin(math.pi * tt / gd), 0.9, 24)
    xg = np.arange(len(gb)) / SR
    bus.put(gb * np.sin(math.pi * np.clip(xg / gd, 0, 1)), T.GLIDE_BACK[0], 0.04, 0.3)
    ratchet(bus, T.GLIDE_BACK[0] - 0.4, T.GLIDE_BACK[0], 0.02, 2300, 2300, STEP)
    dn = int((T.DEFOCUS[1] - T.DEFOCUS[0]) * SR)
    xd = np.arange(dn) / SR
    dd = T.DEFOCUS[1] - T.DEFOCUS[0]
    bus.put(sine(1200 * (0.5 ** (xd / dd)), dn) * (xd / dd) * np.clip((dd - xd) / 0.05, 0, 1), T.DEFOCUS[0], 0.025)
    # a soft pop each time a caption drops in
    from .captions import CAPTIONS
    for t0, t1, title, note in CAPTIONS:
        if t0 > 0.0:
            bus.put(blip(1568.0, 2093.0, 0.035, 0.5), t0 + 0.02, 0.02, 0.35)
    return bus.x[:, :NT] + 0.1 * reverb(bus.x[:, :NT], 0.8, 21)


def duck_env():
    """The music dips a little under each main action so the sound effect has room."""
    t = np.arange(NT) / SR
    g = np.ones(NT)
    for t0, depth in ((T.HOOK_SNAP, 0.35), (T.CLIP[1], 0.3), (T.TURN[1], 0.4), (T.FOCUS[1], 0.35),
                      (T.CHIME, 0.4), (T.SWIPE[0], 0.2)):
        a = np.clip((t - (t0 - 0.03)) / 0.03, 0, 1) * np.clip(1 - (t - t0) / 0.45, 0, 1)
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


def render(out_dir, log=print):
    from pathlib import Path
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    log('audio: score ...')
    mus = music()
    log('audio: effects ...')
    fx = sfx_forward()
    mix = master(mus, fx)
    g = 10 ** ((-16.0 - lufs(mus)) / 20)
    write_wav(out / 'music.wav', np.clip(mus * g, -1, 1))
    gs = 10 ** ((-16.0 - lufs(fx)) / 20)
    write_wav(out / 'sfx.wav', np.clip(fx * gs, -1, 1))
    write_wav(out / 'mix.wav', mix)
    info = {'lufs': round(lufs(mix), 2), 'true_peak_db': round(true_peak(mix), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP")
    return out / 'mix.wav', info
