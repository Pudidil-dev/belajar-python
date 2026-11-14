"""Score and sound effects, synthesized in code (no samples): a light 16-bit chiptune loop and playful foley.

Chip voices: band-limited pulse waves (PolyBLEP), the NES 4-bit triangle bass, LFSR noise drums, an SNES-style echo and
FM bells (the synth core is shared with the centrifuge film). 120 BPM in F major, 12 bars = 24 s on the I-V-vi-IV loop;
the hook (C6 A5 C6 F6 E6 | E6 C6 E6 G6 F6 E6) comes back five times. The score runs forward the whole time and loops
seamlessly: the last bar turns around into the first, and the echo and reverb tails wrap onto the start.

Effects are tied to the picture's timeline (engine/timeline.py). During the rewind the music keeps moving forward,
ducked under a cassette-rewind sound built from the effects played backward on the picture's own speed curve.
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




# ---------------------------------------------------------------- the score (F major, 12 bars, loops)
HOOK_A = [(0, 2, 84), (2, 1, 81), (3, 1, 84), (4, 2, 89), (6, 2, 88), (8, 2, 88), (10, 1, 84), (11, 1, 88), (12, 2, 91),
          (14, 1, 89), (15, 1, 88)]                                      # over F | C
HOOK_B = [(0, 2, 86), (2, 1, 81), (3, 1, 86), (4, 2, 89), (6, 1, 88), (7, 1, 86), (8, 2, 86), (10, 1, 82), (11, 1, 86),
          (12, 2, 89), (14, 1, 86), (15, 1, 84)]                         # over Dm | Bb
CALM_2 = [(0, 6, 81), (6, 2, 79), (8, 8, 79)]
CALM_3 = [(0, 6, 77), (6, 2, 76), (8, 8, 74)]
RISE_4 = [(0, 4, 72), (4, 4, 77), (8, 4, 79), (12, 4, 84)]
CADENCE = [(0, 2, 86), (2, 2, 89), (4, 2, 86), (6, 2, 82)]               # Bb, then F under the chime
PICKUP = [(12, 1, 77), (13, 1, 81), (14, 1, 84), (15, 1, 88)]            # back into the hook (the loop)
_THIRD = {0: 3, 2: 4, 4: 4, 5: 3, 7: 3, 9: 4, 10: 3}


def third_below(m):
    return m - _THIRD[m % 12]


CHORD = {'F': (41, (0, 4, 7)), 'C': (36, (0, 4, 7)), 'Dm': (38, (0, 3, 7)), 'Bb': (34, (0, 4, 7))}
BARS = [('F', 'C'), ('Dm', 'Bb'), ('F', 'C'), ('Dm', 'Bb'), ('F', 'C'), ('Dm', 'Bb'), ('F', 'C'), ('Dm', 'Bb'),
        ('F', 'C'), ('Bb', 'F'), ('F', 'C'), ('Dm', 'Bb')]
LEAD = {0: HOOK_A, 1: HOOK_B, 2: CALM_2, 3: CALM_3, 4: RISE_4, 5: HOOK_B, 6: HOOK_A, 7: HOOK_B, 8: HOOK_A, 9: CADENCE,
        11: PICKUP}
HARM = {6: [(s, l, third_below(m)) for s, l, m in HOOK_A], 7: [(s, l, third_below(m)) for s, l, m in HOOK_B],
        8: [(s, l, third_below(m)) for s, l, m in HOOK_A]}
CALM_BARS, BUILD_BAR, CADENCE_BAR = (2, 3), 4, 9


def bar_t(b, step=0):
    return b * T.BAR + step * STEP


def music():
    lead_bus, harm_bus, arp_bus, bass_bus, drum_bus, pad_bus = (Bus() for _ in range(6))
    for b, notes in LEAD.items():
        calm = b in CALM_BARS or b == BUILD_BAR
        for s, l, m in notes:
            dur = l * STEP * (0.92 if l <= 2 else 0.97)
            if calm:
                lead_bus.put(lead(m, dur, 0.5, vib=0.14), bar_t(b, s), 0.13, 0.05)
            else:
                lead_bus.put(lead(m, dur, 0.25), bar_t(b, s), 0.19, 0.05)
    for b, notes in HARM.items():
        for s, l, m in notes:
            harm_bus.put(lead(m, l * STEP * 0.92, 0.125, vib=0.1), bar_t(b, s), 0.1, -0.3)
    # bass
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root = CHORD[name][0]
            base = b * T.BAR + half * T.BAR / 2
            if b in CALM_BARS:
                bass_bus.put(bass(root, T.BAR / 2 * 0.95), base, 0.26)
            elif b == CADENCE_BAR and half == 1:
                bass_bus.put(bass(root, 0.95), base, 0.28)
                bass_bus.put(bass(root + 12, 0.95), base, 0.1)
            else:
                for k in range(4):
                    bass_bus.put(bass(root + (12 if k % 2 else 0), STEP * 1.6), base + k * 2 * STEP, 0.28)
    # arpeggios
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root, iv = CHORD[name]
            base = b * T.BAR + half * T.BAR / 2
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            if b == CADENCE_BAR and half == 1:
                continue
            if b in CALM_BARS or b == BUILD_BAR:
                for k in range(4):
                    arp_bus.put(chip_arp(tones[k], STEP * 1.7, 0.25), base + k * 2 * STEP, 0.045, -0.45)
                continue
            pat = [0, 1, 2, 3, 2, 1, 2, 3]
            for k in range(8):
                m = tones[pat[k]] + (12 if b == CADENCE_BAR else 0) * (k // 4)
                arp_bus.put(chip_arp(m, STEP * 0.85), base + k * STEP, 0.055, -0.5)
    # a soft pad under the calm bars and the cadence chord
    for b in CALM_BARS:
        for half, name in ((0, BARS[b][0]), (1, BARS[b][1])):
            root, iv = CHORD[name]
            pad_bus.put(pad([root + 24 + i for i in iv], 0.95), bar_t(b, 8 * half), 0.05)
    pad_bus.put(pad([65, 69, 72, 77], 0.95, 0.03), bar_t(CADENCE_BAR, 8), 0.07)
    # drums
    K, S, Hc, Ho, C = kick(), snare(), hat(False), hat(True), crash()
    for b in range(12):
        t0 = bar_t(b)
        if b in (0, 5):
            drum_bus.put(C, t0, 0.14 if b == 0 else 0.17, 0.25)
        if b in CALM_BARS:
            drum_bus.put(K, t0, 0.3)
            for k in range(0, 16, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.045, 0.3)
            continue
        if b == BUILD_BAR:
            for k in (0, 8):
                drum_bus.put(K, t0 + k * STEP, 0.36)
            for k in range(0, 12, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.05, 0.3)
            for i, k in enumerate((12, 13, 14, 15)):
                drum_bus.put(snare(0.5 + 0.15 * i), t0 + k * STEP, 0.22, 0.08)
            continue
        if b == CADENCE_BAR:
            drum_bus.put(K, t0, 0.4)
            drum_bus.put(K, t0 + 4 * STEP, 0.36)
            drum_bus.put(S, t0 + 4 * STEP, 0.22, 0.08)
            drum_bus.put(Ho, t0 + 8 * STEP, 0.06, 0.3)
            continue
        four = b in (5, 6, 7, 8)
        for k in ((0, 4, 8, 12) if four else (0, 8)):
            drum_bus.put(K, t0 + k * STEP, 0.42)
        for k in (4, 12):
            if b == 11 and k == 12:
                continue
            drum_bus.put(S, t0 + k * STEP, 0.24, 0.08)
        for k in range(16 if four else 16):
            if not four and k % 2:
                continue
            if b == 11 and k >= 12:
                continue
            drum_bus.put(Hc, t0 + k * STEP, 0.1 if k % 4 == 2 else 0.045, 0.3)
        if b in (1, 6, 8):
            drum_bus.put(Ho, t0 + 14 * STEP, 0.07, 0.3)
        if b == 11:                                       # fill back into the top of the loop
            for i, m in enumerate((55, 52, 48, 45)):
                drum_bus.put(tom(m), t0 + (12 + i) * STEP, 0.24, 0.4 - 0.25 * i)
    lead_st = lead_bus.x + harm_bus.x
    dl = np.stack([echo(lead_st.sum(0) * 0.5, 0.375, 0.3), echo(lead_st.sum(0) * 0.5, 0.25, 0.28)])
    mus = lead_st + 0.4 * dl + arp_bus.x + bass_bus.x + drum_bus.x + pad_bus.x
    mus = mus + 0.15 * reverb(mus - 0.9 * bass_bus.x - 0.6 * drum_bus.x)
    # loop: what rings past the end wraps onto the start
    tail = mus[:, NT:]
    mus = mus[:, :NT].copy()
    mus[:, :tail.shape[1]] += tail
    return mus


# ---------------------------------------------------------------- sound effects (the forward film, 0-20 s)
def shup():
    """Arcade 'shup': a quick rising pulse chirp over a puff of noise."""
    n = int(0.16 * SR)
    x = np.arange(n) / SR
    f = 260 * (5.5 ** np.clip(x / 0.1, 0, 1))
    y = pulse(f, n, 0.25) * np.exp(-x / 0.06) * np.minimum(1, x / 0.004)
    nz = bandnoise(0.16, lambda tt: 900 + 6000 * np.clip(tt / 0.12, 0, 1), 0.7, 3)
    return 0.6 * y + 0.5 * nz * np.exp(-x / 0.05)


def plunger_slide(dur, seed=5):
    """Rubber stopper sliding in the barrel: a soft, slightly wobbling squeak with a little hiss."""
    n = int(dur * SR)
    x = np.arange(n) / SR
    f = 180 + 60 * x / dur + 6 * np.sin(2 * math.pi * 5.5 * x)
    sq = pulse(f, n, 0.125)
    sq = lowpass(sq, 1400, 127)
    hiss = bandnoise(dur, lambda tt: 2500 + 0 * tt, 0.9, seed)
    return 0.8 * sq / (np.abs(sq).max() + 1e-9) + 0.25 * hiss


def sfx_forward():
    bus = Bus()
    # hook: the glint, the shup, the tracking whoosh
    bus.put(bell(103, 0.35, 1.0, 2.0), T.HIGHLIGHT[0] + 0.02, 0.07, 0.2)
    bus.put(shup(), T.MOVE0 - 0.01, 0.5)
    w = whoosh(1.9, 1500, 500, 11, 0.8, 0.12)
    bus.put(w, T.MOVE0 + 0.02, 0.3, 0.2)
    # the cutaway scan
    n = int(1.0 * SR)
    x = np.arange(n) / SR
    scan = sine(500 * (3.0 ** (x / 1.0)), n) * np.sin(math.pi * x / 1.0) ** 2
    bus.put(scan, T.CUTAWAY[0], 0.05, -0.3)
    bus.put(bandnoise(1.0, lambda tt: 1200 + 2400 * tt, 0.6, 12) * np.sin(math.pi * x / 1.0) ** 2, T.CUTAWAY[0], 0.06)
    # the needle: a soft tick at the tip glint, gentle pips at the skin and the vein, a confirm when it is in
    bus.put(blip(1396.9, 2093.0, 0.06, 0.5), T.TIP_GLINT[0], 0.05, 0.3)
    t_skin = next(tt for tt in np.arange(T.INSERT[0], T.INSERT[1], 0.005) if T.tip_d(tt) >= 0.0)
    t_vein = next(tt for tt in np.arange(T.INSERT[0], T.INSERT[1], 0.005) if T.tip_d(tt) >= 42.0)
    bus.put(blip(698.5, 880.0, 0.07, 0.5), t_skin, 0.07, 0.3)
    bus.put(blip(880.0, 1046.5, 0.07, 0.5), t_vein, 0.07, 0.3)
    bus.put(bell(84, 0.5, 1.2, 2.0), T.INSERT[1], 0.09, 0.2)
    bus.put(bell(89, 0.5, 1.2, 2.0), T.INSERT[1] + 0.12, 0.09, 0.2)
    # zoom in, plunger slide, blood flow, zoom out
    bus.put(whoosh(0.9, 400, 1800, 13, 0.8, 0.8), T.ZOOM_IN[0], 0.12)
    slide = plunger_slide(T.PULL[1] - T.PULL[0])
    sp = np.gradient(np.array([T.plunger(T.PULL[0] + i / SR) for i in range(0, len(slide), 480)]))
    env = np.interp(np.arange(len(slide)), np.arange(0, len(slide), 480), np.abs(sp) / (np.abs(sp).max() + 1e-9))
    bus.put(slide * env, T.PULL[0], 0.1, -0.2)
    flow_d = T.FULL - T.FLOW_IN
    fl = bandnoise(flow_d, lambda tt: 380 + 120 * np.sin(tt * 2.3), 1.0, 14)
    xf = np.arange(len(fl)) / SR
    fl *= np.clip(xf / 0.4, 0, 1) * np.clip((flow_d - xf) / 0.3, 0, 1)
    bus.put(fl, T.FLOW_IN, 0.12)
    penta = [77, 79, 81, 84, 86, 89, 91, 93]
    steps = np.arange(T.FLOW_IN, T.FULL, STEP)
    for j, st in enumerate(steps):
        if j % 2 and j % 3:
            continue
        m = penta[(j * 3 + j // 5) % len(penta)]
        nn = int(0.1 * SR)
        xx = np.arange(nn) / SR
        pl = (0.7 * np.sin(2 * math.pi * mtof(m) * xx) + 0.3 * tri(mtof(m), nn)) * np.exp(-xx / 0.03)
        bus.put(pl, st, 0.04, 0.5 * math.sin(j * 1.3))
    bus.put(blip(330.0, 660.0, 0.1, 0.5), T.FLOW_HUB + 0.05, 0.08)
    bus.put(whoosh(1.2, 1600, 450, 15, 0.8, 0.2), T.ZOOM_OUT[0], 0.1)
    # the plunger stops; the two-note chime; the final glint
    bus.put(click(16, 900, 0.04), T.FULL, 0.12)
    for i, m in enumerate((84, 89)):
        nn = int(0.5 * SR)
        xx = np.arange(nn) / SR
        ch = pulse(mtof(m), nn, 0.25) * np.minimum(1, xx / 0.003) * np.exp(-xx / 0.16)
        bus.put(ch, T.CHIME + i * 0.15, 0.16, -0.15 + 0.3 * i)
        bus.put(bell(m + 12, 0.6, 1.0, 2.0), T.CHIME + i * 0.15, 0.05)
    gl = bandnoise(0.45, lambda tt: 6000 + 4000 * tt / 0.45, 0.5, 17)
    bus.put(gl * env_exp(len(gl), 0.12, 0.01), T.FINAL_GLINT[0], 0.06, 0.2)
    return bus.x[:, :NT] + 0.1 * reverb(bus.x[:, :NT], 0.8, 21)


def rewind(fx):
    """The rewind sound (20-24 s): an arcade cue, then the film's own effects played backward on the picture's speed
    curve, crushed and warbled like a cassette, with a tape-motor whir. It clears before the loop point."""
    r0, r1 = int(T.REWIND[0] * SR), int((T.REWIND[1] - 0.12) * SR)
    n = r1 - r0
    tt = T.REWIND[0] + np.arange(n) / SR
    coarse = np.array([T.rewind_source(x) for x in tt[::48]])
    pos = np.interp(np.arange(n), np.arange(0, n, 48)[:len(coarse)], coarse) * SR
    src = np.arange(r0)
    rev = np.stack([np.interp(pos, src, fx[ch, :r0]) for ch in range(2)])
    speed = np.abs(np.gradient(pos))
    sp = speed / max(speed.max(), 1e-9)
    # cassette crunch: sample-and-hold + 5-bit steps, then soften
    hold = 3
    idx = (np.arange(n) // hold) * hold
    rev = rev[:, idx]
    rev = np.round(rev * 16) / 16
    rev = np.stack([lowpass(rev[0], 7000, 63), lowpass(rev[1], 7000, 63)])
    rev *= (0.75 + 0.25 * np.sin(2 * math.pi * 9.0 * (tt - T.REWIND[0])))[None, :]
    whir = bandnoise(n / SR, lambda x: 900 + 3600 * np.interp(x, np.arange(n)[::480] / SR, sp[::480]), 0.7, 31)
    whir = np.round(whir * 8) / 8 * np.clip(sp * 1.3, 0, 1) ** 0.6
    chatter = pulse(55 + 90 * sp, n, 0.5) * np.clip(sp * 1.3, 0, 1) * 0.3
    out = 1.6 * rev + 0.14 * np.stack([whir, whir]) + 0.05 * np.stack([chatter, chatter])
    fade = int(0.08 * SR)
    out[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    full = np.zeros_like(fx)
    full[:, r0:r1] = out
    # the arcade rewind cue
    nn = int(0.3 * SR)
    x = np.arange(nn) / SR
    f = np.where(x < 0.17, 1700 * (0.2 ** (x / 0.17)), 340 * (3.0 ** ((x - 0.17) / 0.13)))
    cue = pulse(f, nn, 0.25) * np.minimum(1, x / 0.003) * np.exp(-x / 0.18)
    k = click(32, 2200, 0.04)
    full[:, r0:r0 + nn] += 0.2 * cue[None, :]
    full[:, r0:r0 + len(k)] += 0.25 * k[None, :]
    return full


def duck_env():
    """The music keeps running forward; it ducks under the rewind and is back up exactly as the loop restarts."""
    t = np.arange(NT) / SR
    down = np.clip((t - T.REWIND[0]) / 0.15, 0, 1)
    up = np.clip((t - (T.REWIND[1] - 0.3)) / 0.3, 0, 1)
    return 1 - 0.68 * down * (1 - up)


def master(mus, fx, target=-14.0):
    mix = 0.62 * mus * duck_env()[None, :] + 1.9 * fx
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
    log('audio: effects and rewind ...')
    fwd = sfx_forward()
    fx = fwd + rewind(fwd)
    mix = master(mus, fx)
    g = 10 ** ((-16.0 - lufs(mus)) / 20)
    write_wav(out / 'music.wav', np.clip(mus * g, -1, 1))
    gs = 10 ** ((-16.0 - lufs(fx)) / 20)
    write_wav(out / 'sfx.wav', np.clip(fx * gs, -1, 1))
    write_wav(out / 'mix.wav', mix)
    info = {'lufs': round(lufs(mix), 2), 'true_peak_db': round(true_peak(mix), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP")
    return out / 'mix.wav', info
