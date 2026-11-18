"""Original soundtrack: a 28-bar, 120 BPM chiptune in F major (square-wave lead, bouncy triangle bass, light arcade
drums) with the machine sounds, synthesized from code. The film does not loop: the score builds through the last
bars into an original "rare item" fanfare and ends on a held F major chord.

Chords: F Dm Bb C | F Dm Bb C | Dm Bb F C | F Dm Bb C | Bb C Am Dm | Bb C F Dm | Bb C F F.
Effects follow the one continuous camera: a soft pulse and a gentle flow on the opening, a soft rising shimmer for
every zoom in and a falling one for every zoom out, sparkle tones in the stream, one tik for citrate holding
calcium, the pump clicks (one per roller), the spin-up whirr and its steady tone, ticks as the layers separate, a
plip for each drop that lands in the bag, the phase-switch clicks and the pump clicking backwards on RETURN, a soft
"done" chime, the seal clicking shut, a shimmer as the bag lifts, an impact for the banner and a ting for each star.
Mastered to -14 LUFS with a -1 dBTP ceiling.
"""
import math
import numpy as np
from . import synth as S
from . import timeline as T

SR = S.SR
NL = int(round(T.TOTAL * SR))


class Bus:
    """Stereo bus exactly as long as the film; anything past the end is cut."""

    def __init__(self):
        self.x = np.zeros((2, NL))

    def put(self, sig, t, gain=1.0, pan=0.0):
        sig = np.asarray(sig, float) * gain
        s = int(round(t * SR))
        if len(sig) == 0 or s >= NL:
            return
        if s < 0:
            sig, s = sig[-s:], 0
        n = min(len(sig), NL - s)
        a = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
        self.x[0, s:s + n] += sig[:n] * math.cos(a)
        self.x[1, s:s + n] += sig[:n] * math.sin(a)


def tv(n):
    return np.arange(n) / SR


# ------------------------------------------------------------------ music
CHORDS = ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'F', 'Dm', 'Bb', 'C',
          'Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'F', 'F']
ROOT = {'F': 41, 'Dm': 38, 'Bb': 34, 'C': 36, 'Am': 33}
TONES = {'F': (65, 69, 72), 'Dm': (62, 65, 69), 'Bb': (58, 62, 65), 'C': (60, 64, 67), 'Am': (69, 72, 76)}
MOTIF = {
    'F': [77, None, 81, 84, None, 81, 79, None],
    'Dm': [81, None, 77, 74, None, 77, 79, None],
    'Bb': [82, None, 81, 77, None, 74, 77, None],
    'C': [79, None, 84, 88, None, 84, 82, 79],
    'Am': [81, None, 76, 72, None, 76, 79, None],
}
E8 = T.BEAT / 2
CALM = (0,)                        # the arm: no melody yet
MOL_BARS = (7, 8)                  # the molecules: soft held chords, the tik
PUMP_BARS = (11, 12)               # the pump: an arpeggio locked to the clicks
SPIN_BARS = (16, 17, 18, 19)       # the separation: a spinning arpeggio
BAG_BARS = (21, 22)                # the bag fills: little bell answers
BUILD = 25                         # seal and lift: a build-up
FANFARE = (26, 27)                 # the rare item


def bar_t(b, e=0):
    return b * T.BAR + e * E8


def brass(m, dur, duty=0.25):
    """A bright fanfare voice: two detuned square waves with a fast attack and a little vibrato."""
    n = int((dur + 0.08) * SR)
    t = tv(n)
    f = S.mtof(m) * 2 ** (0.12 * np.sin(2 * math.pi * 6.0 * t) * np.clip((t - 0.15) / 0.2, 0, 1) / 12)
    y = 0.6 * S.pulse(f, n, duty) + 0.4 * S.pulse(f * 1.004, n, 0.5)
    return y * S.env_adsr(n, 0.004, 0.12, 0.75, 0.08, dur)


def music():
    lead_b, bass_b, arp_b, drum_b, fan_b = Bus(), Bus(), Bus(), Bus(), Bus()
    for b, ch in enumerate(CHORDS):
        root = ROOT[ch]
        if b not in FANFARE:
            for k in range(8):                                 # bouncy octave bass
                iv = (0, 12, 0, 12, 7, 12, 0, 12)[k]
                bass_b.put(S.bass(root + iv, 0.2), bar_t(b, k), (0.7 if k % 2 == 0 else 0.5) * (0.6 if b == 0 else 1))
        if b not in CALM + MOL_BARS + PUMP_BARS + FANFARE and b != BUILD:   # the melody
            mot = MOTIF[ch]
            for k, m in enumerate(mot):
                if m is None:
                    continue
                nxt = next((j for j in range(k + 1, 8) if mot[j] is not None), 8)
                lead_b.put(S.lead(m, (nxt - k) * E8 * 0.85, duty=0.25 if b not in SPIN_BARS else 0.125),
                           bar_t(b, k), 0.28 if b == 23 else 0.34)
        if b in SPIN_BARS:                                     # 16th-note arpeggio: the rotor turning
            for k in range(16):
                arp_b.put(S.chip_arp(TONES[ch][k % 3] + 12, E8 / 2 * 0.8), bar_t(b) + k * E8 / 2, 0.1,
                          -0.5 + (k % 4) / 3)
        if b in PUMP_BARS:                                     # 8th-note arpeggio locked to the pump clicks
            for k in range(8):
                arp_b.put(S.chip_arp(TONES[ch][k % 3] + 12, E8 * 0.6), bar_t(b, k), 0.07, 0.3 * (-1) ** k)
        if b in BAG_BARS:                                      # a little bell answer while the bag fills
            for k, m in enumerate(TONES[ch][::-1]):
                arp_b.put(S.chip_arp(m + 24, E8 * 0.8, 0.25), bar_t(b, 5 + k), 0.06, 0.4)
        if b in MOL_BARS:                                      # the molecules: a soft held chord
            for m in TONES[ch]:
                arp_b.put(S.chip_arp(m + 12, T.BAR * 0.9, 0.5) * 0.5, bar_t(b), 0.05, 0.0)
        if b == BUILD:                                         # seal and lift: rising arpeggio, snare roll
            for k in range(16):
                arp_b.put(S.chip_arp(TONES[ch][k % 3] + 12 + 12 * (k // 8), E8 / 2 * 0.8), bar_t(b) + k * E8 / 2,
                          0.06 + 0.005 * k, -0.4 + 0.05 * k)
                drum_b.put(S.snare(0.3 + 0.04 * k), bar_t(b) + k * E8 / 2, 0.06 + 0.012 * k, -0.1)
            drum_b.put(S.kick(), bar_t(b), 0.6)
            continue
        if b in FANFARE:
            continue
        for k in range(8):
            t0 = bar_t(b, k)
            if b == 0:
                if k in (0, 4):
                    drum_b.put(S.kick(), t0, 0.5)
                if k % 2 == 1:
                    drum_b.put(S.hat(False, 0.45), t0, 0.13, 0.3)
                continue
            if b in PUMP_BARS or b in MOL_BARS:
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
    # ---- the fanfare (original): F hit, Bb, C, a big F with a sparkle run, then a last "ta-da"
    b0 = T.BANNER
    for t0, dur, chord in ((b0, 0.42, (77, 81, 84)), (b0 + 0.5, 0.22, (74, 77, 82)), (b0 + 0.75, 0.22, (76, 79, 84)),
                           (b0 + 1.0, 1.35, (77, 81, 84, 89)), (b0 + 2.5, 0.16, (79, 84, 88)),
                           (b0 + 2.7, 1.25, (77, 81, 84, 89))):
        for k, m in enumerate(chord):
            fan_b.put(brass(m, dur), t0, 0.16, -0.3 + 0.2 * k)
        low = 41 if chord[0] in (77, 79) else (34 if chord[0] == 74 else 36)
        bass_b.put(S.bass(low, dur), t0, 0.8)
        bass_b.put(S.bass(low + 12, dur), t0, 0.5)
    for k in range(12):                                        # sparkle run over the big chord
        arp_b.put(S.chip_arp((89, 93, 96, 101)[k % 4], E8 / 2 * 0.7, 0.25), b0 + 1.05 + k * E8 / 2, 0.07,
                  -0.5 + (k % 4) / 3)
    for t0, g in ((b0, 0.75), (b0 + 1.0, 0.7), (b0 + 2.7, 0.75)):
        drum_b.put(S.kick(), t0, g)
        drum_b.put(S.crash(1.6), t0, 0.12, 0.2)
    for k in range(4):                                         # a tom fill into the banner
        drum_b.put(S.tom(50 - 3 * k), b0 - 0.5 + k * 0.125, 0.3)
    drum_b.put(S.crash(1.4), T.SEPARATE[0], 0.07, 0.2)
    echo = np.stack([S.echo(lead_b.x[0], 0.375, 0.3), S.echo(lead_b.x[1], 0.375, 0.3)])[:, :NL]
    mus = lead_b.x + 0.26 * echo + 0.9 * bass_b.x + arp_b.x + drum_b.x + fan_b.x
    t = tv(NL)
    duck = np.ones(NL)
    for t0, depth, a, r in ((T.BIND, 0.35, 0.2, 0.4), (T.REWARD, 0.6, 0.03, 0.4), (T.DONE, 0.6, 0.03, 0.5),
                            (T.SEAL, 0.7, 0.02, 0.3)):
        dt = t - t0
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


def shimmer(rising, dur, lo=300.0, hi=1400.0, seed=31):
    """A soft scale-travel sound for a zoom: a sine glide with a breath of air and a few twinkles."""
    n = int(dur * SR)
    t = tv(n)
    u = t / dur
    w = u * u * (3 - 2 * u)
    f = lo * (hi / lo) ** (w if rising else 1 - w)
    ph = 2 * math.pi * np.cumsum(f) / SR
    env = np.sin(math.pi * np.clip(u, 0, 1)) ** 1.4
    air = S.lowpass(S.white(n, seed), 2400, 63)
    tw = np.sin(3 * ph) * (0.5 + 0.5 * np.sin(2 * math.pi * 7 * t))
    return (0.7 * np.sin(ph) + 0.15 * tw + 0.25 * air / (np.abs(air).max() + 1e-9)) * env


def plip(f=1200.0):
    """One drop landing in the bag."""
    n = int(0.12 * SR)
    t = tv(n)
    fr = f * (1 + 0.6 * (1 - np.exp(-t / 0.02)))
    return np.sin(2 * math.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.035) * np.minimum(1, t / 0.002)


def _drop_landings(t0, t1):
    """Times when a drop reaches the surface in the platelet bag (matches world.bag)."""
    out, per = [], 0.22
    n = math.floor(t0 / per)
    while n * per < t1:
        tn = n * per
        lv = T.bag_level(tn)
        d = (T.BAG[1] + T.BAG_H / 2 - 3 - (T.BAG_H - 6) * lv) - (T.BAG[1] - T.BAG_H / 2 + 2) - 2.5
        tl = tn + math.sqrt(max(2 * d / 420.0, 1e-6))
        if t0 <= tl < t1 and not T.returning(tn) and not T.done(tn):
            out.append(tl)
        n += 1
    return out


def sfx(info=True):
    bus = Bus()
    if info:
        from . import labels
        for k, t0 in enumerate(labels.events()):
            f = (1568.0, 1760.0, 2093.0)[k % 3]
            bus.put(S.blip(f, f * 1.12, 0.025, 0.25), t0, 0.06, -0.3 + 0.2 * (k % 4))
    # ---- the opening: a soft pulse, the blood starts to move
    bus.put(pulse_beat(), 0.05, 0.32)
    bus.put(flow(T.TRACK[1] - T.TRACK[0], 3), T.TRACK[0], 0.14, -0.2)
    bus.put(flow(T.TO_BAG[1] - T.TO_BAG[0], 6), T.TO_BAG[0], 0.14, 0.2)
    # ---- zooms: a rising shimmer in, a falling one out
    for (a, b), rising, lo, hi, g in ((T.DIVE_TUBE, True, 260, 1100, 0.3), (T.DIVE_MOL, True, 600, 2200, 0.26),
                                      (T.OUT_MOL, False, 220, 2000, 0.3), (T.DIVE_CH, True, 280, 1200, 0.28),
                                      (T.OUT_CH, False, 260, 1200, 0.26), (T.TO_FINALE, True, 300, 900, 0.2)):
        bus.put(shimmer(rising, b - a, lo, hi, 31 + int(a)), a, g, -0.15 if rising else 0.15)
    rng = np.random.default_rng(12)
    t0 = T.IN_TUBE[0] + 0.2
    while t0 < T.IN_TUBE[1] - 0.2:                               # little motion tones in the stream
        m = (79, 84, 86, 88, 91)[int(rng.integers(0, 5))]
        bus.put(S.blip(S.mtof(m), S.mtof(m + 5), 0.04, 0.5), t0, 0.18, rng.uniform(-0.6, 0.6))
        t0 += 0.32
    bus.put(tik(), T.BIND, 0.6)
    # ---- the pump: one click per roller, fading in as the camera arrives and out as it leaves
    t0 = T.TO_PUMP[0]
    while t0 < T.TO_LID[1]:
        g = min(1.0, (t0 - T.TO_PUMP[0]) / 1.2, max(0.0, (T.TO_LID[1] - t0) / 1.2))
        bus.put(click(int(t0 * 10)), t0, 0.7 * g, 0.15)
        bus.put(S.thump(160, 80, 0.06, 0.2, int(t0 * 10)), t0, 0.28 * g)
        t0 += 0.25
    n = int((T.TO_LID[1] - T.TO_PUMP[0]) * SR)
    tt = tv(n)
    hum = (0.6 * np.sign(np.sin(2 * math.pi * 92 * tt)) + 0.4 * np.sin(2 * math.pi * 184 * tt))
    bus.put(S.lowpass(hum, 900, 63) * np.minimum(1, tt / 1.2) * np.minimum(1, (n / SR - tt) / 1.2), T.TO_PUMP[0], 0.11)
    # ---- the centrifuge: a rising spin-up whirr, then a steady spin tone
    d = T.OUT_CH[1] + 1.0 - T.SPIN_UP[0]
    n = int(d * SR)
    tt = tv(n)
    sp = np.clip(tt / (T.SPIN_UP[1] - T.SPIN_UP[0]), 0, 1)
    f = 110 + 420 * sp * sp * (3 - 2 * sp)
    ph = 2 * math.pi * np.cumsum(f) / SR
    whirr = (0.55 * np.sin(ph) + 0.3 * np.sign(np.sin(2 * ph)) * 0.5 + 0.2 * np.sin(3.01 * ph))
    swell = 0.4 + 0.6 * np.clip(sp * 1.2, 0, 1) * np.exp(-np.clip(tt - (T.SPIN_UP[1] - T.SPIN_UP[0]), 0, None) / 0.8)
    whirr = S.lowpass(whirr, 2200, 63) * swell * np.minimum(1, tt / 0.15) * np.minimum(1, (d - tt) / 1.0)
    bus.put(whirr, T.SPIN_UP[0], 0.4)
    k, t0 = 0, T.SEP_PROGRESS[0]
    while t0 <= T.SEP_PROGRESS[1] + 1e-6:                        # small ticks as the layers separate
        bus.put(S.blip(S.mtof(86 + 2 * k), S.mtof(86 + 2 * k), 0.03, 0.25), t0, 0.6, -0.4 + 0.12 * k)
        k, t0 = k + 1, t0 + 0.5
    bus.put(S.blip(523.3, 1046.5, 0.6, 0.25) * np.linspace(1, 0.3, int(0.6 * SR)), T.DIVERT[0] + 0.4, 0.12)
    # ---- the bag: a plip for each drop that lands, a small reward tone
    for k, tl in enumerate(_drop_landings(T.TO_BAG[1] - 0.6, T.RETURN[0])):
        bus.put(plip(1100 + 140 * (k % 4)), tl, 0.35, 0.35)
    for k, m in enumerate((84, 88, 91, 96)):
        bus.put(S.blip(S.mtof(m), S.mtof(m), 0.07, 0.25), T.REWARD + k * 0.06, 0.3, 0.2)
    # ---- return: the phase switch, the pump clicking backwards, the flow back to the arm; then done
    bus.put(click(int(T.RETURN[0] * 7), 2200), T.RETURN[0], 1.0)
    bus.put(S.blip(1318.5, 988.0, 0.06, 0.25), T.RETURN[0] + 0.05, 0.25)
    t0 = T.RETURN[0] + 0.25
    while t0 < T.RETURN[1] - 0.2:
        bus.put(click(int(t0 * 13), 1500), t0, 0.45, 0.1)
        t0 += 0.25
    bus.put(flow(T.RETURN[1] - T.RETURN[0] - 0.4, 71, 520), T.RETURN[0] + 0.3, 0.32, -0.2)
    for k, f_ in enumerate((1046.5, 1568.0)):
        bus.put(chime_note(f_, 0.5 if k else 0.3), T.DONE + k * 0.14, 0.14, -0.1 + 0.2 * k)
    # ---- the finale: the seal clicks shut, the bag lifts, the banner lands, five stars
    bus.put(click(5, 1800), T.SEAL, 1.0)
    bus.put(S.thump(240, 120, 0.08, 0.6, 4), T.SEAL, 0.3)
    bus.put(shimmer(True, T.LIFT[1] - T.LIFT[0] + 0.2, 500, 2600, 77), T.LIFT[0], 0.26)
    bus.put(S.thump(120, 46, 0.4, 0.5, 9), T.BANNER, 0.55)
    for k, m in enumerate((84, 86, 89, 91, 93)):
        bus.put(chime_note(S.mtof(m + 12), 0.35), T.BANNER + 0.35 + 0.14 * k, 0.2, -0.4 + 0.2 * k)
    return bus.x


def master(mus, fx, target=-14.0):
    mix = 0.55 * mus + 1.3 * fx
    mix = np.stack([S.lowpass(mix[0], 15500, 127), S.lowpass(mix[1], 15500, 127)])
    n_out = int(0.6 * SR)                                       # let the last chord fade at the very end
    mix[:, -n_out:] *= np.linspace(1, 0, n_out) ** 1.5
    n_in = int(0.02 * SR)
    mix[:, :n_in] *= np.linspace(0, 1, n_in)
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
