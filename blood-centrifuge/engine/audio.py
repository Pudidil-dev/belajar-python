"""Score and sound effects, synthesized in code (no samples): a 16-bit style chiptune and machine foley.

Chip voices: band-limited pulse waves (PolyBLEP) at 12.5/25/50 % duty, the NES 4-bit stepped triangle for bass and the
NES 15-bit LFSR noise for drums, plus two 16-bit touches: an SNES-style feedback echo with a lowpass in the loop, and FM
bells for the sparkle. 120 BPM in C major, 12 bars = 24 s, every note and every effect on the picture's timeline
(engine/timeline.py). The hook motif (A5 C6 A5 G5 A5 | B5 D6 B5 A5 B5) comes back four times; the harmony is the
"royal road" IV-V-iii-vi loop of game music, and the ending is a bVI-bVII-I fanfare.

The music tape-stops as the rotor brakes, goes silent for the beeps and the lid, then lands the fanfare on the reveal.
"""
import math
import wave
import numpy as np
from . import timeline as T

SR = 48000
NT = int(round(T.TOTAL * SR))
N = NT + 2 * SR
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


# ---------------------------------------------------------------- the score
A1 = [(0, 2, 81), (2, 2, 84), (4, 1, 81), (5, 1, 79), (6, 2, 81), (8, 2, 83), (10, 2, 86), (12, 1, 83), (13, 1, 81),
      (14, 2, 83)]
_THIRD = {0: 3, 2: 3, 4: 4, 5: 3, 7: 3, 9: 4, 11: 4}       # diatonic third below, by pitch class (C major)


def third_below(m):
    return m - _THIRD[m % 12]


A1H = [(s, l, third_below(m)) for s, l, m in A1]
A2 = [(0, 3, 88), (3, 1, 86), (4, 2, 83), (6, 2, 79), (8, 4, 81), (12, 2, 84), (14, 2, 88)]
B2 = [(0, 4, 84), (4, 2, 88), (6, 2, 86), (8, 6, 84)]
B2H = [(0, 4, 79), (4, 2, 84), (6, 2, 83), (8, 6, 79)]
DESC = [(0, 2, 88), (2, 2, 86), (4, 2, 84), (6, 2, 83), (8, 2, 81), (10, 2, 79), (12, 2, 77), (14, 2, 76)]
FAN = [(0, 1, 72), (1, 1, 75), (2, 1, 80), (3, 5, 84), (8, 1, 74), (9, 1, 77), (10, 1, 82), (11, 5, 86)]
FANH = [(3, 5, 80), (11, 5, 82)]
FINAL = [(0, 12, 88)]
FINALH = [(0, 12, 84), (0, 12, 79)]
PICKUP = [(12, 1, 72), (13, 1, 76), (14, 1, 79), (15, 1, 82)]       # C7 arpeggio -> F

CHORD = {'C': (36, (0, 4, 7)), 'F': (41, (0, 4, 7)), 'G': (43, (0, 4, 7)), 'Em': (40, (0, 3, 7)),
         'Am': (45, (0, 3, 7)), 'Ab': (44, (0, 4, 7)), 'Bb': (46, (0, 4, 7))}
BARS = [('F', 'G'), ('Em', 'Am'), ('F', 'G'), ('F', 'G'), ('Em', 'Am'), ('F', 'G'), ('Em', 'Am'), ('F', 'G'),
        ('C', 'C'), ('Am', 'F'), ('G', 'G'), ('F', 'G'), ('Ab', 'Bb'), ('C', 'C')]
LEAD = {0: A1, 1: A2, 3: A1, 4: A2, 5: A1, 6: A2, 7: A1, 8: B2, 9: DESC, 10: PICKUP, 11: A1, 12: FAN, 13: FINAL}
HARM = {3: A1H, 5: A1H, 7: A1H, 8: B2H, 11: A1H, 12: FANH, 13: FINALH}
BUILD, DIVE_BAR, FILL_BAR, BREAK, SILENT, FINAL_BAR = 2, 4, 8, 9, 10, 13
CRASH_BARS = (0, 3, 5, 7, 11)


def bar_t(b, step=0):
    return b * T.BAR + step * STEP


def music_part(lo, hi):
    """All music events that start inside [lo, hi), mixed with their own echo and reverb tails."""
    lead_bus, harm_bus, arp_bus, bass_bus, drum_bus, pad_bus = (Bus(lo, hi) for _ in range(6))
    # ---- melody
    for b, notes in LEAD.items():
        for s, l, m in notes:
            dur = l * STEP * (0.92 if l <= 2 else 0.97)
            lead_bus.put(lead(m, dur, 0.25), bar_t(b, s), 0.2, 0.05)
    for b, notes in HARM.items():
        for s, l, m in notes:
            harm_bus.put(lead(m, l * STEP * 0.92, 0.125, vib=0.1), bar_t(b, s), 0.11, -0.3)
    # ---- bass
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root = CHORD[name][0]
            base = b * T.BAR + half * T.BAR / 2
            if b == BUILD:                                 # build: driving 16ths, crescendo, gap before the drop
                for k in range(8):
                    if half == 1 and k >= 6:
                        continue
                    bass_bus.put(bass(root, STEP * 0.7), base + k * STEP, 0.32 * (0.55 + 0.45 * (half * 8 + k) / 15))
            elif b == BREAK:
                bass_bus.put(bass(root, T.BAR / 2 * 0.95), base, 0.3)
            elif b == SILENT:
                continue
            elif b == FINAL_BAR:
                if half == 0:
                    bass_bus.put(bass(root, 1.6), base, 0.32)
                    bass_bus.put(bass(root + 12, 1.6), base, 0.12)
            else:
                for k in range(4):
                    if b == DIVE_BAR and half == 1 and k == 3:
                        continue                           # the dive: one 8th of silence before inside the tube
                    m = root + (12 if k % 2 else 0)
                    bass_bus.put(bass(m, STEP * 1.6), base + k * 2 * STEP, 0.3)
    # ---- arpeggios (12.5 % pulse, quiet, left)
    for b, (c1, c2) in enumerate(BARS):
        if b in (BREAK, SILENT, FINAL_BAR):
            continue
        for half, name in ((0, c1), (1, c2)):
            root, iv = CHORD[name]
            base = b * T.BAR + half * T.BAR / 2
            tones = [root + 24 + iv[0], root + 24 + iv[1], root + 24 + iv[2], root + 36]
            if b == BUILD:                                 # riser: one climb through F then G, ending early
                climb = [53, 57, 60, 65, 69, 72, 77, 81] if half == 0 else [79, 83, 86, 91, 95, 98]
                for k, m in enumerate(climb):
                    arp_bus.put(chip_arp(m, STEP * 0.8, 0.25), base + k * STEP,
                                0.05 + 0.06 * (half * 8 + k) / 15, -0.45)
                continue
            pat = [0, 1, 2, 3, 2, 1, 2, 3]
            for k in range(8):
                if b == DIVE_BAR and half == 1 and k >= 6:
                    continue
                if b == DIVE_BAR and half == 1:            # the dive climbs instead of turning around
                    m = tones[k % 4] + 12 * (k // 4)
                else:
                    m = tones[pat[k]]
                arp_bus.put(chip_arp(m, STEP * 0.85), base + k * STEP, 0.055 if b in (0, 1) else 0.065, -0.5)
    # breakdown: slower 8th-note arp, darker
    for half, name in ((0, 'Am'), (1, 'F')):
        root, iv = CHORD[name]
        tones = [root + 12 + iv[0], root + 12 + iv[1], root + 12 + iv[2], root + 24]
        for k in range(4):
            arp_bus.put(chip_arp(tones[k], STEP * 1.6, 0.5), bar_t(BREAK) + half * 1.0 + k * 2 * STEP, 0.05, -0.4)
    # ---- pads under the breakdown and the final chord
    pad_bus.put(pad([57, 60, 64], 1.0), bar_t(BREAK), 0.07)
    pad_bus.put(pad([53, 57, 60], 1.0), bar_t(BREAK, 8), 0.07)
    pad_bus.put(pad([60, 64, 67, 72], 1.7, 0.02), bar_t(FINAL_BAR), 0.07)
    # ---- drums
    K, S, Hc, Ho, C = kick(), snare(), hat(False), hat(True), crash()
    for b in range(len(BARS)):
        t0 = bar_t(b)
        if b in CRASH_BARS:
            drum_bus.put(C, t0, 0.16, 0.25)
        if b == BUILD:
            for k in range(0, 16, 4):
                drum_bus.put(K, t0 + k * STEP, 0.42)
            roll = [0, 2, 4, 6, 8, 9, 10, 11, 12, 13]
            for i, k in enumerate(roll):
                drum_bus.put(snare(0.45 + 0.55 * i / len(roll)), t0 + k * STEP, 0.25, 0.08)
            continue
        if b == BREAK:
            drum_bus.put(C, t0, 0.13, -0.25)
            drum_bus.put(K, t0, 0.4)
            drum_bus.put(S, t0 + 8 * STEP, 0.22, 0.08)
            for k in (0, 4, 8, 12):
                drum_bus.put(Hc, t0 + k * STEP, 0.06, 0.3)
            continue
        if b == SILENT:
            continue
        if b == FINAL_BAR:
            drum_bus.put(C, t0, 0.18, 0.2)
            drum_bus.put(K, t0, 0.45)
            continue
        last = 11 if b == DIVE_BAR else (12 if b == FILL_BAR else 16)
        for k in (0, 4, 8, 12):
            if k < last:
                drum_bus.put(K, t0 + k * STEP, 0.42)
        for k in (4, 12):
            if k < last:
                drum_bus.put(S, t0 + k * STEP, 0.25, 0.08)
        for k in range(min(16, last)):
            drum_bus.put(Hc, t0 + k * STEP, 0.1 if k % 4 == 2 else 0.045, 0.3)
        if b in (1, 6, 12):
            drum_bus.put(Ho, t0 + 14 * STEP, 0.07, 0.3)
        if b == DIVE_BAR:                                   # snare roll into the tube, then one 8th of silence
            for i, k in enumerate((11, 12, 13)):
                drum_bus.put(snare(0.6 + 0.2 * i), t0 + k * STEP, 0.25, 0.08)
        if b == FILL_BAR:                                   # tom fill into the breakdown
            for i, m in enumerate((52, 48, 45, 40)):
                drum_bus.put(tom(m), t0 + (12 + i) * STEP, 0.26, 0.4 - 0.25 * i)
            drum_bus.put(snare(0.8), t0 + 15 * STEP, 0.2, 0.1)
        if b == 11:                                         # the reveal hit on beat 4
            drum_bus.put(C, T.REVEAL, 0.17, -0.2)
            drum_bus.put(snare(1.0), T.REVEAL, 0.22)
        if b == 12:
            drum_bus.put(Ho, t0, 0.08, -0.2)
            drum_bus.put(Ho, t0 + 8 * STEP, 0.08, 0.2)
    # ---- final sparkle arpeggio (FM bells)
    for i, m in enumerate((84, 88, 91, 96, 100)):
        pad_bus.put(bell(m, 1.0), bar_t(FINAL_BAR) + i * STEP / 2, 0.07, -0.4 + 0.2 * i)
    # ---- mix the music buses: echo on the lead, light reverb on everything
    lead_st = lead_bus.x + harm_bus.x
    dl = np.stack([echo(lead_st.sum(0) * 0.5, 0.375, 0.32), echo(lead_st.sum(0) * 0.5, 0.25, 0.3)])
    mus = lead_st + 0.42 * dl + arp_bus.x + bass_bus.x + drum_bus.x + pad_bus.x
    return mus + 0.16 * reverb(mus - 0.9 * bass_bus.x - 0.6 * drum_bus.x)


def bullet_time(st):
    """Slow-motion feel: the music sinks under a lowpass during the bullet time, then opens up again on the dive."""
    lo_f, hi_f = 650.0, 18000.0
    t_a, t_b = T.SLOWMO[0] - 0.05, T.SLOWMO[0] + 0.3
    t_c, t_d = T.DIVE[0] - 0.05, T.IRIS_IN[0] - 0.05

    def fc(tt):
        down = hi_f * (lo_f / hi_f) ** np.clip((tt - t_a) / (t_b - t_a), 0, 1)
        up = lo_f * (hi_f / lo_f) ** (np.clip((tt - t_c) / (t_d - t_c), 0, 1) ** 2)
        return np.where(tt < t_c, down, up)

    def g(tt, ff):
        return 1.0 / (1.0 + (ff / fc(tt)) ** 4)
    s0, s1 = int((t_a - 0.5) * SR), int((t_d + 0.5) * SR)
    out = st.copy()
    for ch in range(2):
        seg = stft_filter(st[ch, s0:s1], lambda tt, ff: g(tt + s0 / SR, ff))
        fade = np.ones(s1 - s0)
        r = int(0.2 * SR)
        fade[:r] = np.linspace(0, 1, r)
        fade[-r:] = np.linspace(1, 0, r)
        out[ch, s0:s1] = st[ch, s0:s1] * (1 - fade) + seg * fade
    return out


def music():
    """The score. Everything up to the rotor stop goes through the bullet-time lowpass and then a tape stop (the music
    winds down with the rotor); the pickup, the reveal and the fanfare start clean after the silence."""
    a = tape_stop(bullet_time(music_part(-1, T.SLOW[1])), T.SLOW[1] - 0.5, 0.55)
    b = music_part(T.SLOW[1], 1e9)
    return a + b


# ---------------------------------------------------------------- sound effects
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


def motor():
    """The centrifuge motor over the whole run: rising whine with a 'whoom' pulse per turn, air hiss, low hum,
    soft ticks while slow; muffled while the camera is inside the tube."""
    t = np.arange(NT) / SR
    w = np.array([T.omega(x) for x in t[::64]])
    w = np.interp(np.arange(NT), np.arange(0, NT, 64), w)
    k = w / T.OMEGA_MAX
    fw = 70 + (523.25 - 70) * k ** 0.75                     # whine tops out on C5, in key
    rot = np.cumsum(w) / SR                                 # revolutions
    am = 1 - 0.35 * (0.5 + 0.5 * np.cos(2 * math.pi * 2 * rot)) * np.clip(1.4 - k * 1.2, 0.15, 1)
    whine = (np.sin(2 * math.pi * np.cumsum(fw) / SR) + 0.35 * np.sin(2 * math.pi * np.cumsum(2 * fw) / SR)
             + 0.12 * pulse(fw / 2, NT, 0.5)) * am
    hum = np.sin(2 * math.pi * np.cumsum(55 + 40 * k) / SR) * 0.6
    air = bandnoise(T.TOTAL, lambda tt: 250 + 2600 * np.interp(tt, t[::480], k[::480]) ** 1.2, 0.9, 77)
    ka = k ** 1.4
    y = (0.5 * whine * np.clip(k * 3, 0, 1) + 0.35 * hum * np.clip(k * 2, 0, 1)) + 0.45 * air * ka
    # ticks once per half turn while the rotor is slow (start and stop)
    turns = np.floor(rot * 2)
    edges = np.nonzero(np.diff(turns) > 0)[0]
    for e in edges:
        if w[e] < 6.0:
            c = click(int(e) % 97, 1800, 0.03) * (0.5 + 0.08 * w[e])
            y[e:e + len(c)] += c[:max(0, min(len(c), NT - e))] * 0.6
    cut = np.clip((t - T.OPEN[0]) / 0.2, 0, 1) * np.clip((T.IRIS_IN[0] - t) / 0.2, 0, 1) + \
        np.clip((t - T.PULL[0]) / 0.3, 0, 1) * np.clip((T.CLOSE[1] - t) / 0.2, 0, 1)
    coil = (np.sin(2 * math.pi * 100 * t) + 0.5 * np.sign(np.sin(2 * math.pi * 200 * t)) * 0.3
            + 0.25 * np.sin(2 * math.pi * 300 * t)) * np.clip(k * 1.5, 0, 1)
    y = y + 0.22 * coil * np.clip(cut, 0, 1)
    on = (t >= T.SPIN0 - 0.05) & (t <= T.SLOW[1] + 0.3)
    y *= on
    # inside the tube: muffled and lower
    inside = np.clip((t - T.IRIS_IN[0]) / 0.25, 0, 1) * np.clip((T.IRIS_OUT[1] - t) / 0.25, 0, 1)
    muff = lowpass(y, 380, 255)
    y = y * (1 - inside) + 0.7 * muff * inside
    return y


def micro_sounds(bus):
    """Inside the tube: a low bubbly bed, bloops while the cells drift, and soft pitched plinks as cells lock
    into the packed layer (quantized to 16ths, notes of the C major pentatonic)."""
    from . import micro
    dur = T.IRIS_OUT[1] - T.IRIS_IN[0]
    bed = bandnoise(dur, lambda tt: 160 + 60 * np.sin(tt * 1.3), 1.0, 5)
    tt = np.arange(len(bed)) / SR
    bed *= np.clip(tt / 0.4, 0, 1) * np.clip((dur - tt) / 0.3, 0, 1) * (0.7 + 0.3 * np.sin(tt * 2.1))
    bus.put(bed, T.IRIS_IN[0], 0.22)
    rng = np.random.default_rng(23)
    for i in range(26):                                     # bloops while the cells still float
        t0 = rng.uniform(T.IRIS_IN[0] + 0.3, T.SEP[0] + 3.0)
        n = int(0.07 * SR)
        x = np.arange(n) / SR
        f = rng.uniform(260, 520) * (1 + 1.2 * x / 0.07)
        b = np.sin(2 * math.pi * np.cumsum(f) / SR) * np.sin(math.pi * x / 0.07) ** 2
        bus.put(b, t0, 0.07 * (1.2 - (t0 - T.IRIS_IN[0]) / 6), rng.uniform(-0.7, 0.7))
    lands = np.concatenate([micro.BACK.t_land, micro.FRONT.t_land])
    penta = [84, 86, 88, 91, 93, 96, 98, 100]
    steps = np.arange(T.SEP[0], T.SEP[1] + 0.25, STEP)
    for j, s in enumerate(steps):
        c = int(((lands >= s - STEP / 2) & (lands < s + STEP / 2)).sum())
        if c == 0:
            continue
        m = penta[(j * 3 + (j // 4)) % len(penta)]
        n = int(0.12 * SR)
        x = np.arange(n) / SR
        pl = (0.7 * np.sin(2 * math.pi * mtof(m) * x) + 0.3 * tri(mtof(m), n)) * np.exp(-x / 0.035)
        bus.put(pl, s, 0.08 * min(1.0, (c / 25.0) ** 0.5), 0.6 * math.sin(j * 1.7))
    # layers settled: a soft glassy rising arpeggio on C
    for i, m in enumerate((84, 88, 91, 96)):
        bus.put(bell(m, 0.7, 1.6, 2.0), T.SEP[1] + i * STEP / 2, 0.11, -0.3 + 0.2 * i)


def sfx():
    bus = Bus()
    # ---- hook
    bus.put(blip(880, 1760, 0.09), 0.0, 0.16)
    bus.put(blip(1046.5, 2093, 0.09), T.TWIN_POP, 0.16)
    for i, m in enumerate((93, 96, 101)):
        bus.put(bell(m, 0.5, 1.4, 2.0), T.TWIN_POP + 0.04 + i * 0.05, 0.1, 0.4)
    poof = lowpass(white(int(0.3 * SR), 3), 1500, 63) * env_exp(int(0.3 * SR), 0.06, 0.004)
    bus.put(poof / np.abs(poof).max(), T.TWIN_POOF, 0.32, 0.45)
    bus.put(blip(900, 300, 0.12, 0.5), T.TWIN_POOF, 0.07, 0.45)
    # ---- into the machine
    bus.put(whoosh(0.62, 500, 2600, 1, 0.8, 0.45), T.FLY[0], 0.42, 0.0)
    for i in range(2):                                         # the flip
        bus.put(whoosh(0.16, 1400, 3000, 30 + i, 0.6, 0.5), 1.62 + i * 0.16, 0.18, -0.3 + 0.6 * i)
    bus.put(glass_ping(2637.0, 0.6, 4), T.CLINK, 0.3)
    bus.put(click(5, 3000, 0.03), T.CLINK, 0.25)
    bus.put(whoosh(0.25, 300, 900, 6, 0.9, 0.8), T.LID_CLOSE[0], 0.25)
    bus.put(thump(160, 46, 0.4, 0.8, 7), T.THUNK, 0.62)
    bus.put(click(8, 2200, 0.04), T.THUNK + 0.06, 0.35)
    bus.put(beep(1760.0, 0.06), T.POWER, 0.11)
    bus.put(beep(2637.0, 0.1), T.POWER + 0.08, 0.11)
    bus.put(click(9, 1500, 0.03), T.START_BTN, 0.3)
    bus.put(beep(2093.0, 0.09), T.START_BTN + 0.02, 0.1)
    # ---- the motor (spin up, run, brake) and the push into the window
    bus.put(motor(), 0.0, 0.38)
    # ---- the cut: a laser line runs around the casing, sparks
    n = int(0.26 * SR)
    x = np.arange(n) / SR
    las = sine(900 * (4.0 ** (x / 0.26)), n) * 0.7 + 0.3 * pulse(450 * (4.0 ** (x / 0.26)), n, 0.25)
    bus.put(las * np.minimum(1, x / 0.01) * np.clip((0.26 - x) / 0.03, 0, 1), T.SLICE[0], 0.12, -0.3)
    for i in range(7):
        bus.put(click(40 + i, 3500, 0.02), T.SLICE[0] + 0.03 + i * 0.03, 0.12, -0.6 + 0.2 * i)
    bus.put(whoosh(0.3, 600, 3000, 41, 0.7, 0.9), T.SPLIT_PUSH[0], 0.22)
    # ---- the casing splits: ka-chunk, metal, two halves flying apart
    bus.put(thump(150, 55, 0.45, 0.9, 42), T.OPEN[0], 0.55)
    bus.put(glass_ping(660.0, 0.5, 43), T.OPEN[0] + 0.01, 0.16)
    bus.put(click(44, 1600, 0.05), T.OPEN[0] + 0.05, 0.3)
    bus.put(whoosh(0.45, 300, 2500, 45, 0.8, 0.3), T.OPEN[0] + 0.02, 0.26, -0.2)
    bus.put(whoosh(0.45, 2500, 300, 46, 0.8, 0.3), T.OPEN[0] + 0.04, 0.22, 0.2)
    # ---- labels in the cutaway
    bus.put(blip(880.0, 1760.0, 0.08, 0.5), T.LABEL_ROTOR, 0.12, 0.0)
    bus.put(blip(987.77, 1975.5, 0.08, 0.5), T.LABEL_MOTOR, 0.12, 0.4)
    # ---- the buckets reach level: a little clatter of metal
    t_level = next(tt for tt in np.arange(T.SWING[0], T.SPIN_FULL, 0.005) if T.swing(tt) > 1.55)
    for i in range(4):
        bus.put(click(50 + i, 2800 - 300 * i, 0.03), t_level + i * 0.025, 0.16, -0.5 + 0.33 * i)
    bus.put(glass_ping(1320.0, 0.35, 54), t_level + 0.02, 0.08)
    # ---- bullet time: a deep whoom and a frozen shimmer; the force arrows blink in
    n = int(0.9 * SR)
    x = np.arange(n) / SR
    whoom = sine(170 * (0.28 ** (x / 0.9)), n) * np.minimum(1, x / 0.02) * np.exp(-x / 0.5)
    bus.put(whoom, T.SLOWMO[0], 0.45)
    for i, m in enumerate((93, 100, 105)):
        bus.put(bell(m, 1.4, 1.2, 2.0), T.SLOWMO[0] + 0.02 + i * 0.07, 0.06, -0.4 + 0.4 * i)
    for i in range(2):
        bus.put(blip(1046.5, 1568.0, 0.06, 0.5), T.SLOWMO[0] + 0.3 + i * 0.12, 0.08, 0.3)
    # ---- the dive into the tube
    up = whoosh(0.62, 400, 5200, 12, 0.7, 0.92)
    bus.put(up, T.DIVE[0] - 0.05, 0.36)
    sw = sine(200 * (6.0 ** (np.arange(int(0.6 * SR)) / (0.6 * SR))), int(0.6 * SR)) * np.linspace(0, 1, int(0.6 * SR)) ** 2
    bus.put(sw, T.DIVE[0], 0.08)
    # ---- entering the blood: a splash and a sub drop
    spl = bandnoise(0.5, lambda tt: 1800 * (0.15 ** (tt / 0.5)), 1.0, 13)
    bus.put(spl * env_exp(len(spl), 0.12, 0.003), T.IRIS_IN[0], 0.42)
    bus.put(thump(90, 38, 0.6, 0.0, 14), T.IRIS_IN[0], 0.5)
    micro_sounds(bus)
    # ---- out again
    bus.put(whoosh(0.32, 3000, 500, 15, 0.8, 0.85), T.IRIS_OUT[0] - 0.05, 0.3)
    bus.put(thump(70, 40, 0.45, 0.2, 16), T.PULL[0], 0.42)
    # ---- braking in the cutaway: the buckets drop back, the rotor stops, the casing closes
    t_hang = next(tt for tt in np.arange(T.SLOW[0], T.SLOW[1], 0.005) if T.swing(tt) < 0.05)
    bus.put(click(60, 1400, 0.04), t_hang, 0.14)
    bus.put(glass_ping(990.0, 0.3, 61), t_hang + 0.01, 0.06)
    bus.put(click(62, 900, 0.05), T.SLOW[1], 0.18)
    bus.put(whoosh(0.5, 2600, 400, 63, 0.8, 0.85), T.CLOSE[0], 0.24, -0.2)
    bus.put(whoosh(0.5, 300, 2400, 64, 0.8, 0.85), T.CLOSE[0] + 0.02, 0.2, 0.2)
    # ---- the stop, the beeps, the lid
    bus.put(thump(130, 48, 0.4, 1.0, 17), T.STOP, 0.58)
    bus.put(click(18, 1200, 0.05), T.STOP + 0.02, 0.3)
    for tb in T.DONE_BEEPS:
        bus.put(beep(1568.0, 0.075), tb, 0.12)
    bus.put(click(19, 2600, 0.03), T.UNLOCK, 0.4)
    bus.put(click(20, 1900, 0.03), T.UNLOCK + 0.05, 0.3)
    pssh = bandnoise(0.45, lambda tt: 4200 - 2400 * tt / 0.45, 1.1, 21)
    bus.put(pssh * env_exp(len(pssh), 0.12, 0.01), T.UNLOCK + 0.02, 0.28)
    bus.put(boing(200, 0.32), T.UNLOCK + 0.1, 0.16)
    # ---- the tube comes out: shing, whoosh up, the reveal
    shing = whoosh(0.45, 2000, 6500, 22, 0.5, 0.35)
    bus.put(shing, T.LIFT[0], 0.22, 0.1)
    bus.put(glass_ping(3136.0, 0.5, 23), T.LIFT[0] + 0.12, 0.12)
    bus.put(whoosh(1.35, 350, 2400, 24, 0.8, 0.75), T.FLY_OUT[0] + 0.05, 0.34)
    for i, m in enumerate((86, 91, 95, 98, 103)):
        bus.put(bell(m, 1.1, 2.2, 3.5), T.REVEAL + i * 0.035, 0.12, -0.4 + 0.2 * i)
    shim = bandnoise(1.0, lambda tt: 7000 + 0 * tt, 0.6, 25)
    bus.put(shim * env_exp(len(shim), 0.25, 0.005), T.REVEAL, 0.12)
    bus.put(thump(80, 40, 0.5, 0.0, 26), T.REVEAL, 0.32)
    # ---- labels and the final glint
    bus.put(blip(622.25, 1244.5, 0.08, 0.5), T.LABEL_PLASMA, 0.13, -0.5)
    bus.put(bell(87, 0.4, 1.2, 2.0), T.LABEL_PLASMA + 0.03, 0.07, -0.5)
    bus.put(blip(698.46, 1396.9, 0.08, 0.5), T.LABEL_RBC, 0.13, 0.5)
    bus.put(bell(89, 0.4, 1.2, 2.0), T.LABEL_RBC + 0.03, 0.07, 0.5)
    gl = bandnoise(0.6, lambda tt: 5000 + 5000 * tt / 0.6, 0.5, 27)
    bus.put(gl * env_exp(len(gl), 0.14, 0.02), T.GLINT, 0.16, 0.2)
    bus.put(bell(108, 0.7, 1.0, 2.0), T.GLINT + 0.1, 0.06, 0.3)
    hop = sine(400 * (2.2 ** (np.arange(int(0.12 * SR)) / (0.12 * SR))), int(0.12 * SR)) * env_exp(int(0.12 * SR), 0.05)
    bus.put(hop, T.HOP, 0.12)
    bus.put(click(28, 900, 0.04), T.HOP + 0.3, 0.2)
    out = bus.x + 0.12 * reverb(bus.x, 0.9, 31)
    return out


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


def duck_env():
    """Music steps back for the motor spin-up and for the soft cell sounds inside the tube."""
    t = np.arange(NT) / SR

    def win(a, b, r=0.25):
        return np.clip((t - a) / r, 0, 1) * np.clip((b - t) / r, 0, 1)
    return 1 - 0.2 * win(T.SWING[0], T.SPIN_FULL + 0.3) - 0.22 * win(T.SEP[0], T.SEP[1] + 0.3, 0.5)


def master(mus, fx, target=-14.0):
    mix = 0.62 * mus[:, :NT] * duck_env()[None, :] + 1.45 * fx[:, :NT]
    mix = np.stack([lowpass(mix[0], 15500, 127), lowpass(mix[1], 15500, 127)])
    fade = int(0.02 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade)
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


def write_wav(path, st):
    x = np.clip(st, -1, 1)
    pcm = (x.T * 32767).round().astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def render(out_dir, log=print):
    from pathlib import Path
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    log('audio: score ...')
    mus = music()
    log('audio: effects ...')
    fx = sfx()
    mix = master(mus, fx)
    g = 10 ** ((-16.0 - lufs(mus[:, :NT])) / 20)
    write_wav(out / 'music.wav', np.clip(mus[:, :NT] * g, -1, 1))
    gs = 10 ** ((-16.0 - lufs(fx[:, :NT])) / 20)
    write_wav(out / 'sfx.wav', np.clip(fx[:, :NT] * gs, -1, 1))
    write_wav(out / 'mix.wav', mix)
    info = {'lufs': round(lufs(mix), 2), 'true_peak_db': round(true_peak(mix), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP")
    return out / 'mix.wav', info
