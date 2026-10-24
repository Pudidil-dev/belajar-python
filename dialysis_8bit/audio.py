"""Score + sound design, synthesised from scratch (no samples).

120 BPM, 27 bars of 4/4 = 54.0 s, D minor (i - VI - III - VII), loopable.
Instruments: polyBLEP pulse arps, NES-style 4-bit triangle bass, synth kick,
clap, hats, warm saw pads, FM bells. SFX are placed from timeline.events(),
the same list the picture uses, so every tick lands on its frame.

    python3 audio.py out.wav
"""
import math
import sys
import wave

import numpy as np
from scipy import signal

import timeline as TL

SR = 48000
DUR = TL.DUR
N = int(SR * DUR)
BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
RNG = np.random.default_rng(7)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def buf():
    return np.zeros((N, 2), np.float32)


def add(out, t0, sig, gain=1.0, pan=0.0):
    """Mix mono or stereo sig into out at time t0 (wraps around the loop)."""
    if sig.ndim == 1:
        l = math.cos((pan + 1) * math.pi / 4)
        r = math.sin((pan + 1) * math.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], -1)
    _add_wrap(out, int(round(t0 * SR)), sig * gain)


def _add_wrap(out, i0, sig):
    i0 %= N
    n = len(sig)
    k = min(n, N - i0)
    out[i0:i0 + k] += sig[:k]
    if k < n:
        out[:n - k] += sig[k:]


def tt(dur):
    return np.arange(int(dur * SR)) / SR


# ------------------------------------------------------------ oscillators
def _blep(ph, dt):
    out = np.zeros_like(ph)
    m = ph < dt
    x = ph[m] / dt
    out[m] = x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt
    out[m] = x * x + x + x + 1
    return out


def saw(f, dur, phase0=0.0):
    t = tt(dur)
    dt = f / SR
    ph = (phase0 + f * t) % 1.0
    return 2 * ph - 1 - _blep(ph, dt)


def pulse(f, dur, duty=0.25):
    t = tt(dur)
    dt = f / SR
    p1 = (f * t) % 1.0
    p2 = (p1 + duty) % 1.0
    s1 = 2 * p1 - 1 - _blep(p1, dt)
    s2 = 2 * p2 - 1 - _blep(p2, dt)
    return 0.5 * (s1 - s2)


def tri4(f, dur):
    """NES triangle: 32-step, 4-bit."""
    t = tt(dur)
    ph = (f * t) % 1.0
    step = np.floor(ph * 32).astype(int)
    tab = np.concatenate([np.arange(15, -1, -1), np.arange(0, 16)])
    return (tab[step] / 7.5 - 1.0)


def env_adsr(n, a, d, s, r, sus_time):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4),
                 np.where(t < a + d, 1 - (1 - s) * (t - a) / max(d, 1e-4), s))
    rel = t > sus_time
    e = np.where(rel, e * np.exp(-(t - sus_time) / max(r, 1e-4)), e)
    return e


def lowpass(x, fc, order=2):
    sos = signal.butter(order, fc, btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def highpass(x, fc, order=2):
    sos = signal.butter(order, fc, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def bandpass(x, f0, f1, order=2):
    sos = signal.butter(order, [f0, f1], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def noise(dur):
    return RNG.standard_normal(int(dur * SR)).astype(np.float64)


def svf_sweep(x, f_start, f_end, q=2.0, curve=1.0):
    """Time-varying band-pass (Chamberlin SVF) for whooshes and sweeps."""
    n = len(x)
    k = np.linspace(0, 1, n) ** curve
    fc = f_start * (f_end / f_start) ** k
    F = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR)
    damp = 1.0 / q
    low = band = 0.0
    out = np.empty(n)
    xs = x.tolist()
    Fs = F.tolist()
    for i in range(n):
        f = Fs[i]
        low += f * band
        high = xs[i] - low - damp * band
        band += f * high
        out[i] = band
    return out


# ---------------------------------------------------------------- drums
def kick(amp=1.0, dur=0.42):
    t = tt(dur)
    f = 48 + 110 * np.exp(-t / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.26)
    click = highpass(noise(0.006), 2500) * 0.25
    s[:len(click)] += click
    return s * amp


def clap(amp=1.0):
    n = noise(0.22)
    e = np.zeros(len(n))
    t = tt(0.22)
    for d in (0.0, 0.011, 0.022):
        e += np.where(t >= d, np.exp(-(t - d) / (0.009 if d < 0.02 else 0.09)), 0)
    s = bandpass(n * e, 900, 5200) * 0.9
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.3
    return (s + body) * amp


def hat(amp=1.0, open_=False):
    d = 0.22 if open_ else 0.05
    t = tt(d)
    s = highpass(noise(d), 7200, order=2) * np.exp(-t / (0.09 if open_ else 0.018))
    return s * amp


def rim(amp=1.0):
    t = tt(0.06)
    s = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.01) + bandpass(noise(0.06), 2000, 6000) * np.exp(-t / 0.008)
    return s * amp * 0.5


# --------------------------------------------------------------- tonal
def bell(f, dur=1.4, amp=1.0, ratio=3.5, index=2.5):
    t = tt(dur)
    I = index * np.exp(-t / 0.35)
    s = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t))
    return s * np.exp(-t / (dur * 0.35)) * amp


def blip(f0, f1, dur=0.06, amp=1.0, kind="sine"):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) if kind == "sine" else np.sign(np.sin(ph)) * 0.6
    return s * np.exp(-t / (dur * 0.35)) * amp


# ---------------------------------------------------------------- music
CHORDS = [
    ([50, 53, 57, 60, 64], 38),   # Dm9
    ([46, 50, 53, 57, 60], 34),   # Bbmaj9
    ([41, 48, 53, 57, 64], 41),   # Fmaj7
    ([48, 55, 60, 62, 67], 36),   # Csus2(add9)
]


def chord_at(bar):
    if bar == 26:
        return CHORDS[3]
    return CHORDS[bar % 4]


def section(bar):
    t = bar * BAR
    if t < 6:
        return "hook"
    if t < 10:
        return "dialyzer"
    if t < 16:
        return "micro"
    if t < 30:
        return "diffusion"
    if t < 36:
        return "uf"
    if t < 42:
        return "cc"
    if t < 44:
        return "break"
    if t < 50:
        return "return"
    return "finale"


def music():
    drums = buf()
    bass = buf()
    arp = buf()
    pad = buf()
    for bar in range(27):
        sec = section(bar)
        t0 = bar * BAR
        notes, root = chord_at(bar)
        # ---- drums
        kick_steps = {"hook": [0, 4, 8, 12], "dialyzer": [0, 8, 11], "micro": [0], "diffusion": [0, 8],
                      "uf": [0, 8] if bar < 16 else [0, 4, 8, 12], "cc": [0, 4, 8, 12], "break": [],
                      "return": [0, 8, 10], "finale": [0, 4, 8, 12]}[sec]
        for st in kick_steps:
            add(drums, t0 + st * BEAT / 4, kick(0.9))
        if sec in ("hook", "cc", "finale", "return"):
            for st in (4, 12):
                add(drums, t0 + st * BEAT / 4, clap(0.32 if sec != "return" else 0.22), pan=0.05)
        if sec in ("diffusion",) and bar % 2 == 1:
            add(drums, t0 + 12 * BEAT / 4, rim(0.35), pan=-0.2)
        hat_steps = range(0, 16, 2) if sec in ("micro", "break") else range(16)
        for st in hat_steps:
            if sec == "break":
                continue
            acc = 0.20 if st % 4 == 2 else 0.09
            if sec == "micro":
                acc *= 0.6
            op = sec in ("cc", "finale") and st % 4 == 2
            add(drums, t0 + st * BEAT / 4, hat(acc * (1.4 if op else 1.0), open_=op), pan=0.25)
        # ---- bass (NES triangle)
        if sec in ("micro", "break"):
            add(bass, t0, tri4(mtof(root), BAR * 0.98) * env_adsr(int(BAR * 0.98 * SR), 0.01, 0.3, 0.7, 0.2, BAR * 0.8),
                0.30)
        else:
            pat = [0, None, 0, 12, None, 0, 7, 12]
            for i, iv in enumerate(pat):
                if iv is None:
                    continue
                d = BEAT / 2 * 0.9
                s = tri4(mtof(root + iv), d) * env_adsr(int(d * SR), 0.004, 0.05, 0.8, 0.03, d * 0.8)
                add(bass, t0 + i * BEAT / 2, s, 0.34)
        # ---- arp (pulse 25 %, D4..D6), 16ths or 8ths
        tones = [n + 12 for n in notes[1:]] + [notes[1] + 24, notes[2] + 24]
        order = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 4, 2, 1, 3]
        step = 1 if sec not in ("micro", "break") else 2
        lvl = {"hook": 0.10, "dialyzer": 0.09, "micro": 0.07, "diffusion": 0.06, "uf": 0.07, "cc": 0.10,
               "break": 0.06, "return": 0.08, "finale": 0.11}[sec]
        for st in range(0, 16, step):
            m = tones[order[st] % len(tones)]
            d = BEAT / 4 * 0.95
            s = pulse(mtof(m), d, 0.25) * np.exp(-tt(d) / 0.07)
            add(arp, t0 + st * BEAT / 4, s, lvl, pan=(-0.35 if st % 2 else 0.35))
        # ---- pad
        if sec not in ("hook",):
            lv = 0.05 if sec in ("micro", "diffusion", "break") else 0.045
            for m in notes[:4]:
                for det in (-0.07, 0.07):
                    s = saw(mtof(m) * 2 ** (det / 12), BAR + 0.4)
                    add(pad, t0, s * env_adsr(len(s), 0.35, 0.3, 0.8, 0.35, BAR), lv / 2, pan=det * 5)
    pad = lowpass(pad, 1300)
    arp = lowpass(arp, 6500)
    # ping-pong echo on the arp (dotted eighth)
    D = int(0.375 * SR)
    echo = np.zeros_like(arp)
    src = arp.copy()
    g = 0.38
    for k in range(1, 5):
        sh = np.roll(src, D * k, axis=0)
        if k % 2:
            sh = sh[:, ::-1]
        echo += sh * (g ** k)
    arp = arp + lowpass(echo, 3500)
    return drums * 0.85 + bass + arp + pad


# --------------------------------------------------------------- reverb
def reverb_wet(x):
    """Small Schroeder room (4 combs + 2 allpasses), returns the wet signal."""
    out = np.zeros_like(x)
    for ch in range(2):
        s = x[:, ch]
        acc = np.zeros_like(s)
        for d, g in ((1557, 0.80), (1617, 0.79), (1491, 0.81), (1422, 0.80)):
            d += 23 * ch
            a = np.zeros(d + 1)
            a[0] = 1
            a[-1] = -g
            acc += signal.lfilter([1.0], a, s)
        for d, g in ((225, 0.5), (556, 0.5)):
            b = np.zeros(d + 1)
            b[0] = -g
            b[-1] = 1
            a = np.zeros(d + 1)
            a[0] = 1
            a[-1] = -g
            acc = signal.lfilter(b, a, acc)
        out[:, ch] = acc * 0.12
    return lowpass(out, 5000)


# ----------------------------------------------------------------- SFX
PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84]  # D minor pentatonic, D4..C6


def sfx():
    out = buf()
    send = buf()  # reverb send
    ev = TL.events()
    urea_n = 0
    for (t, kind, info) in ev:
        if kind == "hook":
            th = tt(0.9)
            boom = np.sin(2 * np.pi * (42 + 40 * np.exp(-th / 0.08)) * th) * np.exp(-th / 0.35)
            hitn = lowpass(noise(0.25), 1800) * np.exp(-tt(0.25) / 0.05)
            add(out, t, boom, 0.9)
            add(out, t, hitn, 0.5)
            add(out, t, blip(2400, 1600, 0.03, 0.25))
        elif kind == "pop":
            add(out, t, blip(1500, 2200, 0.035, 0.12), pan=-0.1)
            n = len(info) if isinstance(info, str) else 6
            for i in range(min(n, 18)):
                tk = highpass(noise(0.008), 4000) * np.exp(-tt(0.008) / 0.002)
                add(out, t + 0.12 + i / 40.0, tk, 0.05, pan=0.2)
        elif kind in ("whoosh_out", "whoosh_in", "push", "lens"):
            d = info if isinstance(info, (int, float)) else 1.0
            d = max(0.4, d)
            x = noise(d)
            if kind == "whoosh_in" or kind == "lens":
                y = svf_sweep(x, 300, 3200, q=1.6, curve=1.6)
                e = np.sin(np.pi * np.clip(np.linspace(0, 1, len(y)) ** 0.7, 0, 1)) ** 2
            else:
                y = svf_sweep(x, 3000, 260, q=1.6, curve=0.6)
                e = np.sin(np.pi * np.clip(np.linspace(0, 1, len(y)) ** 1.3, 0, 1)) ** 2
            g = {"whoosh_out": 0.55, "whoosh_in": 0.5, "push": 0.22, "lens": 0.45}[kind]
            y = y * e
            stereo = np.stack([y * np.linspace(1.0, 0.6, len(y)), y * np.linspace(0.6, 1.0, len(y))], -1)
            add(out, t, stereo, g)
            if kind == "lens":
                add(out, t + 0.15, blip(320, 980, 0.45, 0.25))
        elif kind == "hit":
            add(out, t, kick(0.7, 0.35))
            add(out, t, highpass(noise(0.08), 1500) * np.exp(-tt(0.08) / 0.02), 0.35)
        elif kind == "highlight":
            add(send, t, bell(mtof(81), 0.9, 0.18), pan=0.3)
            add(send, t + 0.12, bell(mtof(88), 0.9, 0.14), pan=0.35)
        elif kind == "arrows":
            for pan0, f0, f1 in ((-0.8, 400, 1600), (0.8, 1600, 400)):
                y = svf_sweep(noise(0.7), f0, f1, q=2.2) * np.sin(np.linspace(0, np.pi, int(0.7 * SR))) ** 2
                add(out, t, y, 0.35, pan=pan0)
        elif kind == "tick_micro":
            add(out, t, blip(3200, 2600, 0.03, 0.22))
            add(send, t, bell(mtof(86), 0.6, 0.1))
        elif kind == "urea_cross":
            note = PENTA[(urea_n * 3) % len(PENTA)] if urea_n < 9 else PENTA[(urea_n * 2 + 1) % len(PENTA)]
            f = mtof(note + 12)
            add(out, t, blip(f, f * 1.06, 0.09, 0.16), pan=0.35)
            add(send, t, bell(f, 0.35, 0.07, ratio=2.0, index=1.2), pan=0.4)
            if urea_n % 4 == 3:
                add(send, t + 0.06, bell(f * 1.5, 0.4, 0.06, ratio=2.0, index=1.0), pan=0.45)
            urea_n += 1
        elif kind in ("rbc_bounce", "alb_bounce"):
            th = tt(0.12)
            thud = np.sin(2 * np.pi * (230 * np.exp(-th / 0.08)) * th) * np.exp(-th / 0.035)
            click = bandpass(noise(0.03), 600, 1600) * np.exp(-tt(0.03) / 0.006)
            add(out, t, thud, 0.32 if kind == "rbc_bounce" else 0.24, pan=0.2)
            add(out, t, click, 0.18, pan=0.25)
            add(out, t + 0.11, blip(330, 300, 0.06, 0.07))
        elif kind == "pressure":
            d = info
            th = tt(d)
            f = 110 * (4.0 ** (th / d))
            ph = 2 * np.pi * np.cumsum(f) / SR
            tone = (2 * ((ph / (2 * np.pi)) % 1.0) - 1) * (th / d) ** 1.5
            tone = lowpass(tone, 1800)
            ns = svf_sweep(noise(d), 200, 2400, q=1.2) * (th / d) ** 2
            add(out, t, tone, 0.16)
            add(out, t, ns, 0.3)
            # servo / control click when the pressure locks in
            add(out, t + d, blip(900, 500, 0.05, 0.18, kind="square"))
            add(out, t + d + 0.07, blip(700, 400, 0.04, 0.12, kind="square"))
        elif kind == "uf_flow":
            d = info
            x = bandpass(noise(d), 500, 1600, order=2)
            th = tt(d)
            e = np.clip(th / 0.6, 0, 1) * np.clip((d - th) / 0.6, 0, 1)
            mod = 0.75 + 0.25 * np.sin(2 * np.pi * 2.0 * th)
            add(out, t, np.stack([x * e * mod, np.roll(x, 900) * e * mod], -1), 0.22)
        elif kind == "dual_sweep":
            d = info
            n = int(d * SR)
            pan_ = np.linspace(-1, 1, n)
            up = svf_sweep(noise(d), 250, 2600, q=2.5) * np.sin(np.linspace(0, np.pi, n)) ** 2
            dn = svf_sweep(noise(d), 2600, 250, q=2.5) * np.sin(np.linspace(0, np.pi, n)) ** 2
            L = up * (1 - pan_) / 2 + dn * (1 + pan_) / 2
            R = up * (1 + pan_) / 2 + dn * (1 - pan_) / 2
            add(out, t, np.stack([L, R], -1), 0.42)
            add(send, t + d * 0.5, bell(mtof(74), 0.8, 0.08, ratio=1.5, index=1.0))
        elif kind == "flow_tone":
            d = info
            th = tt(d)
            e = np.clip(th / 0.4, 0, 1) * np.clip((d - th) / 0.6, 0, 1)
            s = (np.sin(2 * np.pi * mtof(62) * th + 0.3 * np.sin(2 * np.pi * 5 * th)) +
                 0.6 * np.sin(2 * np.pi * mtof(69) * th)) * e
            add(send, t, s, 0.06)
        elif kind == "complete":
            add(out, t, kick(0.35, 0.3))
            for i, m in enumerate((74, 77, 81, 86)):
                add(send, t + 0.09 * i, bell(mtof(m), 1.6, 0.16), pan=-0.3 + 0.2 * i)
        elif kind == "cut":
            i = info
            add(out, t, highpass(noise(0.03), 3000) * np.exp(-tt(0.03) / 0.006), 0.3)
            add(out, t, blip(mtof(62 + 5 * i), mtof(62 + 5 * i) * 0.98, 0.08, 0.14, kind="square"))
        elif kind == "riser_end":
            d = 0.9
            x = svf_sweep(noise(d), 600, 7000, q=1.0, curve=2.0) * np.linspace(0, 1, int(d * SR)) ** 3
            add(out, t + 0.1 - d, x, 0.35)
        elif kind == "title":
            add(out, t, kick(1.0, 0.6))
            crash = highpass(noise(1.8), 3500) * np.exp(-tt(1.8) / 0.45)
            add(out, t, np.stack([crash, np.roll(crash, 400)], -1), 0.28)
            sub = np.sin(2 * np.pi * (55 * np.exp(-tt(1.0) / 0.6)) * tt(1.0)) * np.exp(-tt(1.0) / 0.4)
            add(out, t, sub, 0.5)
            for m in (62, 69, 74, 77):
                add(send, t, bell(mtof(m), 1.8, 0.12, ratio=2.0, index=1.5))
        elif kind == "loop":
            d = DUR - t
            x = svf_sweep(noise(d), 400, 5000, q=1.0, curve=1.5) * np.linspace(0, 1, int(d * SR)) ** 2.5
            add(out, t, x, 0.25)
    # continuous beds
    _beds(out, send)
    return out, send


def _beds(out, send):
    # fluid pulse + pump clicks while the circuit is in view
    for (a, b) in ((0.0, 6.1), (43.6, 49.5), (49.5, 50.5), (51.5, 54.0)):
        n = int((b - a) * SR)
        th = np.arange(n) / SR + a
        beatph = (th % BEAT) / BEAT
        swell = np.exp(-beatph / 0.25) * 0.8 + 0.2
        x = lowpass(noise(b - a), 420) * swell
        add(out, a, np.stack([x, np.roll(x, 700)], -1), 0.30)
    for k in range(int(6.1 / BEAT) + 1):
        tk = k * BEAT + 0.03
        if 2.4 < tk < 6.1:
            add(out, tk, bandpass(noise(0.04), 1800, 4200) * np.exp(-tt(0.04) / 0.008), 0.10, pan=0.3)
            add(out, tk, np.sin(2 * np.pi * 120 * tt(0.08)) * np.exp(-tt(0.08) / 0.02), 0.12)
    for k in range(4):
        tk = 50.0 + k * BEAT / 2 + 0.03
        add(out, tk, bandpass(noise(0.04), 1800, 4200) * np.exp(-tt(0.04) / 0.008), 0.10, pan=0.3)
    # machine hum during the reveal
    a, b = 3.0, 6.2
    th = tt(b - a)
    e = np.clip(th / 0.5, 0, 1) * np.clip((b - a - th) / 0.4, 0, 1)
    hum = (np.sin(2 * np.pi * 50 * th) + 0.5 * np.sin(2 * np.pi * 100 * th) + 0.25 * np.sin(2 * np.pi * 150 * th))
    add(out, a, hum * e * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * th)), 0.05)
    # internal flow inside the dialyzer + molecular ambience in the fiber
    for (a, b, lo, hi, g) in ((6.1, 10.7, 200, 900, 0.10), (10.7, 43.4, 4500, 9000, 0.025)):
        th = tt(b - a)
        e = np.clip(th / 0.4, 0, 1) * np.clip((b - a - th) / 0.4, 0, 1)
        x = bandpass(noise(b - a), lo, hi)
        add(out, a, np.stack([x * e, np.roll(x, 1200) * e], -1), g)
    # soft molecular shimmer blips (random, quiet)
    for k in range(40):
        tk = 10.8 + (43.0 - 10.8) * RNG.random()
        add(send, tk, bell(mtof(PENTA[int(RNG.random() * len(PENTA))] + 24), 0.5, 0.02), pan=RNG.random() * 2 - 1)


def limit(x, target_rms_db=-15.5, ceiling_db=-1.2):
    """Make-up gain to a target RMS, then a look-ahead peak limiter."""
    from scipy.ndimage import maximum_filter1d, minimum_filter1d
    rms = np.sqrt(np.mean(x ** 2)) + 1e-9
    x = x * (10 ** (target_rms_db / 20) / rms)
    ceil = 10 ** (ceiling_db / 20)
    # true-peak aware: detect peaks on a 4x oversampled copy
    up = signal.resample_poly(x, 4, 1, axis=0)
    env = np.max(np.abs(up), axis=1)[:len(x) * 4].reshape(-1, 4).max(axis=1)
    look = int(0.003 * SR)
    pk = maximum_filter1d(env, size=2 * look + 1)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    g = minimum_filter1d(g, size=int(0.010 * SR))
    # release smoothing (one pole), then re-apply the hard minimum so no overshoot
    a = math.exp(-1.0 / (0.060 * SR))
    gs = signal.lfilter([1 - a], [1, -a], g)
    gs = np.minimum(gs, g)
    y = x * gs[:, None]
    return np.clip(y, -ceil, ceil)


def master(path):
    m = music()
    s, send = sfx()
    wet = reverb_wet(send + m * 0.12)
    mix = m * 0.55 + s + send + wet * 0.9
    mix = highpass(mix, 28)
    mix = limit(mix, target_rms_db=-15.4, ceiling_db=-1.6)
    pcm = np.clip(mix * 32767, -32768, 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return mix


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "score.wav"
    mix = master(out)
    rms = np.sqrt(np.mean(mix ** 2))
    print(f"wrote {out}: {len(mix) / SR:.2f}s, rms {20 * np.log10(rms):.1f} dBFS, "
          f"peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
