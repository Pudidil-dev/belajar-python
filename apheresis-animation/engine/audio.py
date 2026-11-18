"""Original soundtrack: a 16-bar, 120 BPM chiptune loop in F major (square-wave lead, bouncy triangle bass, light
arcade drums) with the machine sounds, synthesized from code on a circular bus so the end flows into the start.

Chords: F Dm Bb C | F Dm Bb C | Dm Bb F C | Dm Bb C C (the last C leads back into bar 1 when the loop restarts).
Effects: a soft pulse and flow whoosh on the opening, the dive into the tube, little motion tones in the stream,
rhythmic pump clicks (one per roller), one tik for citrate catching calcium, the rising spin-up whirr and a steady
spin tone, small ticks as the paths separate, the bag-fill bubbles and a reward tone, the phase-switch clicks and the
return whoosh, a success chime on the wide reveal. Mastered to -14 LUFS with a -1 dBTP ceiling.
"""
import math
import numpy as np
from . import synth as S
from . import timeline as T

SR = S.SR
NL = int(round(T.TOTAL * SR))


class Loop:
    """Stereo bus exactly one loop long; anything that spills past the end wraps to the start."""

    def __init__(self):
        self.x = np.zeros((2, NL))

    def _add(self, ch, sig, s):
        n, pos = len(sig), 0
        while pos < n:
            start = (s + pos) % NL
            k = min(n - pos, NL - start)
            self.x[ch, start:start + k] += sig[pos:pos + k]
            pos += k

    def put(self, sig, t, gain=1.0, pan=0.0):
        if len(sig) == 0:
            return
        s = int(round((t % T.TOTAL) * SR))
        a = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
        sig = np.asarray(sig, float) * gain
        self._add(0, sig * math.cos(a), s)
        self._add(1, sig * math.sin(a), s)


def circular(fn, x):
    x3 = np.concatenate([x, x, x], axis=-1)
    return fn(x3)[..., NL:2 * NL]


def tv(n):
    return np.arange(n) / SR


# ------------------------------------------------------------------ music
CHORDS = ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'C', 'C']
ROOT = {'F': 41, 'Dm': 38, 'Bb': 34, 'C': 36}
TONES = {'F': (65, 69, 72), 'Dm': (62, 65, 69), 'Bb': (58, 62, 65), 'C': (60, 64, 67)}
MOTIF = {
    'F': [77, None, 81, 84, None, 81, 79, None],
    'Dm': [81, None, 77, 74, None, 77, 79, None],
    'Bb': [82, None, 81, 77, None, 74, 77, None],
    'C': [79, None, 84, 88, None, 84, 82, 79],
}
E8 = T.BEAT / 2
PUMP_BARS = (3, 4)                 # the pump scene: lighter drums so the clicks lead
SPIN_BARS = (7, 8, 9, 10)          # the separation: a spinning arpeggio


def bar_t(b, e=0):
    return b * T.BAR + e * E8


def music():
    lead_b, bass_b, arp_b, drum_b = Loop(), Loop(), Loop(), Loop()
    for b, ch in enumerate(CHORDS):
        root = ROOT[ch]
        for k in range(8):                                     # bouncy octave bass (softer in the calm first bar)
            iv = (0, 12, 0, 12, 7, 12, 0, 12)[k]
            bass_b.put(S.bass(root + iv, 0.2), bar_t(b, k), (0.7 if k % 2 == 0 else 0.5) * (0.6 if b == 0 else 1))
        if b >= 1 and b not in PUMP_BARS and b != 5:           # the melody (rests for the pump and the tik)
            mot = MOTIF[ch]
            for k, m in enumerate(mot):
                if m is None:
                    continue
                nxt = next((j for j in range(k + 1, 8) if mot[j] is not None), 8)
                lead_b.put(S.lead(m, (nxt - k) * E8 * 0.85, duty=0.25 if b not in SPIN_BARS else 0.125),
                           bar_t(b, k), 0.34)
        if b in SPIN_BARS:                                     # 16th-note arpeggio: the rotor turning
            tones = TONES[ch]
            for k in range(16):
                arp_b.put(S.chip_arp(tones[k % 3] + 12, E8 / 2 * 0.8), bar_t(b) + k * E8 / 2, 0.1, -0.5 + (k % 4) / 3)
        if b in PUMP_BARS:                                     # 8th-note arpeggio locked to the pump clicks
            tones = TONES[ch]
            for k in range(8):
                arp_b.put(S.chip_arp(tones[k % 3] + 12, E8 * 0.6), bar_t(b, k), 0.07, 0.3 * (-1) ** k)
        if b in (11, 12):                                      # a little bell answer while the bag fills
            for k, m in enumerate(TONES[ch][::-1]):
                arp_b.put(S.chip_arp(m + 24, E8 * 0.8, 0.25), bar_t(b, 5 + k), 0.06, 0.4)
        for k in range(8):
            t0 = bar_t(b, k)
            if b == 0:
                if k in (0, 4):
                    drum_b.put(S.kick(), t0, 0.55)
                if k % 2 == 1:
                    drum_b.put(S.hat(False, 0.45), t0, 0.15, 0.3)
                continue
            if b in PUMP_BARS:
                if k == 0:
                    drum_b.put(S.kick(), t0, 0.6)
                if k % 2 == 1:
                    drum_b.put(S.hat(False, 0.4), t0, 0.12, 0.3)
                continue
            if k in (0, 4):
                drum_b.put(S.kick(), t0, 0.7)
            if k in (2, 6):
                drum_b.put(S.snare(0.7), t0, 0.24, -0.1)
            drum_b.put(S.hat(k % 4 == 3, 0.6), t0, 0.15 if k % 2 else 0.1, 0.3)
        if b == 15:                                            # a pickup fill back into bar 1
            for k in range(4):
                drum_b.put(S.snare(0.45 + 0.12 * k), bar_t(15, 6) + k * E8 / 2, 0.14 + 0.03 * k)
    for t0, g in ((T.SEPARATE[1], 0.1), (T.REVEAL[0], 0.12)):
        drum_b.put(S.crash(1.4), t0, g, 0.2)
    lead = lead_b.x
    lead = lead + 0.26 * np.stack([circular(lambda v: S.echo(v, 0.375, 0.3), lead[0]),
                                   circular(lambda v: S.echo(v, 0.375, 0.3), lead[1])])
    mus = lead + 0.9 * bass_b.x + arp_b.x + drum_b.x
    t = tv(NL)
    duck = np.ones(NL)
    for t0, depth, a, r in ((T.BIND, 0.35, 0.2, 0.4), (T.SUCCESS, 0.5, 0.03, 0.5), (T.REWARD, 0.6, 0.03, 0.4),
                            (0.0, 0.7, 0.05, 0.3)):
        dt = (t - t0 + T.TOTAL / 2) % T.TOTAL - T.TOTAL / 2        # wrapped, so the duck is seamless at the loop
        e = np.where(dt < -a, 0.0, np.where(dt < 0, (dt + a) / a, np.exp(-dt / r)))
        duck *= 1 - (1 - depth) * e
    return mus * duck[None, :]


# ------------------------------------------------------------------ effects
def pulse_beat():
    """A soft, calm double pulse."""
    n = int(0.5 * SR)
    t = tv(n)
    y = np.zeros(n)
    for t0, g in ((0.0, 1.0), (0.22, 0.6)):
        u = np.clip(t - t0, 0, None)
        y += g * np.sin(2 * math.pi * (60 + 30 * np.exp(-u / 0.04)) * u) * np.exp(-u / 0.09) * (t >= t0)
    return y


def flow(dur, seed, f=700):
    y = S.bandnoise(dur, lambda tt: f + 150 * np.sin(tt * 6), 0.6, seed)
    tt = tv(len(y))
    return y * np.minimum(1, tt / 0.2) * np.minimum(1, (dur - tt) / 0.3)


def click(seed, f=3000):
    n = int(0.03 * SR)
    t = tv(n)
    y = S.click(seed, f, 0.03)[:n]
    return y + 0.4 * np.sin(2 * math.pi * f * 0.5 * t) * np.exp(-t / 0.006)


def tik():
    n = int(0.06 * SR)
    t = tv(n)
    y = S.pulse(2637.0, n, 0.25) * np.exp(-t / 0.012)
    ck = S.click(7, 5000, 0.02)
    y[:len(ck)] += 0.8 * ck
    return y


def chime_note(f, dur=0.6):
    n = int(dur * SR)
    t = tv(n)
    y = 0.5 * S.pulse(f, n, 0.25) * np.exp(-t / 0.18) + 0.8 * np.sin(2 * math.pi * f * t) * np.exp(-t / 0.4)
    return y * np.minimum(1, t / 0.002)


def sfx(info=True):
    bus = Loop()
    if info:
        from . import labels
        for k, t0 in enumerate(labels.events()):
            f = (1568.0, 1760.0, 2093.0)[k % 3]
            bus.put(S.blip(f, f * 1.12, 0.025, 0.25), t0, 0.07, -0.3 + 0.2 * (k % 4))
    # ---- the opening: a soft pulse, the blood starts to move
    bus.put(pulse_beat(), 0.0, 0.32)
    bus.put(S.whoosh(0.7, 300, 1200, 2, 0.7, 0.6), T.TRACK[0] - 0.1, 0.3)
    for (a, b), seed in ((T.TRACK, 3), (T.TO_JUNCTION, 4), (T.TO_SPIN, 5), (T.TO_BAG, 6)):
        bus.put(flow(b - a, seed), a, 0.16, -0.2)
    # ---- into the tube and back out (stepped cuts), little motion tones in the stream
    for t0, down in ((T.STREAM[0], True), (T.MOLECULE[0], True), (T.SEPARATE[0], True)):
        bus.put(S.whoosh(0.4, 2600, 400, 10 + int(t0), 0.7, 0.6), t0 - 0.05, 0.5)
    for t0 in (T.STREAM[0] + 0.2, T.STREAM[2], T.MOLECULE[0] + 0.05, T.MOLECULE[2], T.SEPARATE[0] + 0.15,
               T.SEPARATE[2]):
        for k in range(4):
            bus.put(S.blip(S.mtof(84 - 4 * k), S.mtof(84 - 4 * k), 0.025, 0.25), t0 + k / 30.0, 0.13)
    rng = np.random.default_rng(12)
    for k in range(14):
        t0 = T.STREAM[1] + 0.1 + k * 0.16
        m = (79, 84, 86, 88, 91)[int(rng.integers(0, 5))]
        bus.put(S.blip(S.mtof(m), S.mtof(m + 5), 0.04, 0.5), t0, 0.25, rng.uniform(-0.6, 0.6))
    # ---- the pump: one click per roller, a soft motor whirr
    t0 = T.STREAM[3]
    while t0 < T.TO_JUNCTION[1]:
        bus.put(click(int(t0 * 10)), t0, 0.75, 0.15)
        bus.put(S.thump(160, 80, 0.06, 0.2, int(t0 * 10)), t0, 0.3)
        t0 += 0.25
    n = int((T.TO_JUNCTION[1] - T.STREAM[3]) * SR)
    tt = tv(n)
    hum = (0.6 * np.sign(np.sin(2 * math.pi * 92 * tt)) + 0.4 * np.sin(2 * math.pi * 184 * tt))
    bus.put(S.lowpass(hum, 900, 63) * np.minimum(1, tt / 0.2) * np.minimum(1, (n / SR - tt) / 0.3), T.STREAM[3], 0.12)
    # ---- the anticoagulant: one small tik when citrate catches calcium
    bus.put(tik(), T.BIND, 0.75)
    # ---- the centrifuge: a rising spin-up whirr, then a steady spin tone
    d = T.SEPARATE[2] - T.SPIN_UP[0]
    n = int(d * SR)
    tt = tv(n)
    sp = np.clip(tt / (T.SPIN_UP[1] - T.SPIN_UP[0]), 0, 1)
    f = 110 + 420 * sp * sp * (3 - 2 * sp)
    ph = 2 * math.pi * np.cumsum(f) / SR
    whirr = (0.55 * np.sin(ph) + 0.3 * np.sign(np.sin(2 * ph)) * 0.5 + 0.2 * np.sin(3.01 * ph))
    swell = 0.5 + 0.5 * np.clip(sp * 1.2, 0, 1) * np.exp(-np.clip(tt - (T.SPIN_UP[1] - T.SPIN_UP[0]), 0, None) / 0.8)
    whirr = S.lowpass(whirr, 2200, 63) * swell * np.minimum(1, tt / 0.15) * np.minimum(1, (d - tt) / 0.4)
    bus.put(whirr, T.SPIN_UP[0], 0.32)
    for k, t0 in enumerate((16.5, 17.0, 17.5, 18.0, 18.5, 19.0)):      # small ticks as the paths separate
        bus.put(S.blip(S.mtof(88 + 2 * k), S.mtof(88 + 2 * k), 0.03, 0.25), t0, 0.35, -0.4 + 0.16 * k)
    bus.put(S.blip(523.3, 1046.5, 0.6, 0.25) * np.linspace(1, 0.3, int(0.6 * SR)), T.DIVERT[0] + 0.4, 0.12)
    # ---- the bag: gentle filling bubbles, then a bright little reward tone
    for k in range(18):
        t0 = T.BAG_FILL[0] + k * 0.17
        bus.put(S.blip(S.mtof(72 + (k * 5) % 12), S.mtof(79 + (k * 5) % 12), 0.05, 0.5), t0, 0.35, 0.4)
    for k, m in enumerate((84, 88, 91, 96)):
        bus.put(S.blip(S.mtof(m), S.mtof(m), 0.07, 0.25), T.REWARD + k * 0.06, 0.3, 0.2)
    # ---- return: the phase switch, the flow turns around, back to the arm; then DRAW again
    for t0 in (T.RETURN[0], T.RETURN[1]):
        bus.put(click(int(t0 * 7), 2200), t0, 0.8)
        bus.put(S.blip(1318.5, 988.0 if t0 == T.RETURN[0] else 1760.0, 0.06, 0.25), t0 + 0.05, 0.25)
    bus.put(S.whoosh(0.6, 1800, 400, 70, 0.7, 0.4), T.RETURN[0] + 0.05, 0.45)
    bus.put(flow(T.RETURN[1] - T.RETURN[0] - 0.6, 71, 520), T.RETURN[0] + 0.6, 0.3, 0.2)
    # ---- the wide reveal: a small success chime; the glide back into the arm
    for k, f_ in enumerate((1046.5, 1318.5, 1568.0)):
        bus.put(chime_note(f_, 0.7 if k == 2 else 0.4), T.SUCCESS + k * 0.12, 0.15, -0.2 + 0.2 * k)
    bus.put(S.whoosh(1.2, 400, 2400, 80, 0.7, 0.8), T.BACK[0] + 0.2, 0.4)
    return bus.x


def master(mus, fx, target=-14.0):
    mix = 0.55 * mus + 1.3 * fx
    mix = np.stack([circular(lambda v: S.lowpass(v, 15500, 127), mix[0]),
                    circular(lambda v: S.lowpass(v, 15500, 127), mix[1])])
    ceiling = -1.6
    for _ in range(6):
        mix *= 10 ** ((target - S.lufs(mix)) / 20)
        mix = S.limiter(mix, ceiling)
        tp = S.true_peak(mix)
        if tp <= -1.0 and abs(S.lufs(mix) - target) < 0.15:
            break
        if tp > -1.0:
            ceiling -= (tp + 1.0) + 0.15
    return mix


def render(out_dir, log=print, info=True, lang='en'):
    from pathlib import Path
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    log('audio: music ...')
    mus = music()
    log('audio: effects ...')
    fx = sfx(info)
    mix = master(mus, fx)
    S.write_wav(out / 'music.wav', np.clip(mus * 10 ** ((-16.0 - S.lufs(mus)) / 20), -1, 1))
    S.write_wav(out / 'sfx.wav', np.clip(fx * 10 ** ((-16.0 - S.lufs(fx)) / 20), -1, 1))
    S.write_wav(out / 'mix.wav', mix)
    info_ = {'lufs': round(float(S.lufs(mix)), 2), 'true_peak_db': round(float(S.true_peak(mix)), 2)}
    log(f"audio: mix {info_['lufs']} LUFS, true peak {info_['true_peak_db']} dBTP, {mix.shape[1] / SR:.3f} s stereo")
    return out / 'mix.wav', info_
