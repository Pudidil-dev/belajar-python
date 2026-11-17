"""Original soundtrack: a 12-bar, 120 BPM chiptune loop in C major (square-wave melody, bouncy triangle bass, light
arcade drums) and the sound effects, synthesized from code, on a circular bus so the end flows into the start.

Chords: C Am F G | C Am F G | Am F Dm G (the last G resolves into bar 1 when the loop restarts).
Story sounds: four wet plips (0.5 / 1.0 / 1.5 / 2.0 s), lighter reagent taps, a clock-like stepped time-lapse, one
quick descending whoosh into the drop, a soft tik (first binding) and a sharper tik (the bridge) with the music
thinned around them, quiet ticks for the clump, a rising whoosh back out, the outline blips, the two-note reward
chime (21.0 s), and the card swap at the loop point. Mastered to -14 LUFS with a -1 dBTP ceiling.
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
CHORDS = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'Am', 'F', 'Dm', 'G']
ROOT = {'C': 36, 'Am': 45, 'F': 41, 'G': 43, 'Dm': 38}
TONES = {'C': (60, 64, 67), 'Am': (57, 60, 64), 'F': (53, 57, 60), 'G': (55, 59, 62), 'Dm': (50, 53, 57)}
MOTIF = {
    'C': [72, None, 76, 79, None, 76, 74, None],
    'Am': [76, None, 72, 69, None, 72, 74, None],
    'F': [77, None, 76, 72, None, 69, 72, None],
    'G': [74, None, 79, 83, None, 79, 77, 74],
    'Dm': [74, None, 77, 81, None, 77, 74, None],
}
E8 = T.BEAT / 2
CELLS = (4, 5, 6)                 # bars inside the drop: the music thins to bass, arps and soft hats
REWARD = 11


def bar_t(b, e=0):
    return b * T.BAR + e * E8


def music():
    lead_b, bass_b, arp_b, drum_b = Loop(), Loop(), Loop(), Loop()
    for b, ch in enumerate(CHORDS):
        root = ROOT[ch]
        # ---- bass: bouncy octaves; in bar 1 it plays off the beat so the plips land in the gaps
        for k in range(8):
            t0 = bar_t(b, k)
            if b == 0 and k % 2 == 0:
                continue
            if b == 1 and k == 0:
                continue
            iv = (0, 12, 0, 12, 7, 12, 0, 12)[k]
            g = 0.7 if k % 2 == 0 else 0.5
            if b in CELLS:
                g *= 0.7
            bass_b.put(S.bass(root + iv, 0.2), t0, g)
        # ---- melody: the hook motif from bar 3; it rests inside the drop while the antibody works
        if b >= 2 and b not in CELLS and b != 10:
            mot = MOTIF[ch]
            up = 12 if b == REWARD else 0
            for k, m in enumerate(mot):
                if m is None:
                    continue
                nxt = next((j for j in range(k + 1, 8) if mot[j] is not None), 8)
                lead_b.put(S.lead(m + up, (nxt - k) * E8 * 0.85, duty=0.25 if b != REWARD else 0.125), bar_t(b, k),
                           0.38)
        if b == 10:                                            # the answer bar: two notes, then room for the chime
            lead_b.put(S.lead(76, 0.4, duty=0.25), bar_t(b, 0), 0.34)
            lead_b.put(S.lead(79, 0.4, duty=0.25), bar_t(b, 1), 0.34)
        # ---- arpeggios: soft, bubbly, inside the drop and on the reward
        if b in CELLS or b == REWARD:
            tones = TONES[ch]
            for k in range(16):
                if b in CELLS and k % 2:
                    continue
                m = tones[(k * 2) % 3] + 24
                arp_b.put(S.chip_arp(m, E8 / 2 * 0.8), bar_t(b) + k * E8 / 2, 0.12, -0.5 + (k % 4) / 3)
        # ---- drums
        for k in range(8):
            t0 = bar_t(b, k)
            if b == 0:
                if k in (1, 3, 5, 7):
                    drum_b.put(S.hat(False, 0.45), t0, 0.16, 0.3)
                continue
            if b in CELLS:
                if k % 2 == 1:
                    drum_b.put(S.hat(False, 0.4), t0, 0.12, 0.3)
                continue
            if b == 10 and k in (2, 3):
                continue                                       # the chime gets a clean beat
            if k in (0, 4):
                drum_b.put(S.kick(), t0, 0.7)
            if k in (2, 6):
                drum_b.put(S.snare(0.7), t0, 0.26, -0.1)
            drum_b.put(S.hat(k % 4 == 3, 0.6), t0, 0.16 if k % 2 else 0.11, 0.3)
        if b == 9:                                             # a little roll into the reveal
            for k in range(4):
                drum_b.put(S.snare(0.45 + 0.12 * k), bar_t(9, 6) + k * E8 / 2, 0.14 + 0.03 * k)
    lead = lead_b.x
    lead = lead + 0.28 * np.stack([circular(lambda v: S.echo(v, 0.375, 0.3), lead[0]),
                                   circular(lambda v: S.echo(v, 0.375, 0.3), lead[1])])
    mus = lead + 0.9 * bass_b.x + arp_b.x + drum_b.x
    # thin the music under the plips, the two binding ticks and the chime
    t = tv(NL)
    duck = np.ones(NL)
    events = [(x, 0.55, 0.02, 0.15) for x in T.LANDS] + [(T.BIND1, 0.3, 0.25, 0.5), (T.BIND2, 0.3, 0.25, 0.5),
                                                         (T.CHIME, 0.45, 0.03, 0.5)]
    for t0, depth, a, r in events:
        e = np.where(t < t0 - a, 0.0, np.where(t < t0, (t - t0 + a) / a, np.exp(-(t - t0) / r)))
        duck *= 1 - (1 - depth) * e
    return mus * duck[None, :]


# ------------------------------------------------------------------ effects
def plip(f0, seed):
    """A wet drop: a falling 'bloop' with a tiny splash."""
    n = int(0.16 * SR)
    t = tv(n)
    f = f0 * (0.42 + 0.58 * np.exp(-t / 0.018))
    y = np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    y += 0.25 * np.sin(2 * math.pi * np.cumsum(f * 2.01) / SR) * np.exp(-t / 0.02)
    nz = S.highpass(S.white(n, seed), 2500, 63) * np.exp(-t / 0.006)
    return np.tanh(1.4 * (y + 0.5 * nz))


def tap(seed):
    n = int(0.05 * SR)
    t = tv(n)
    y = S.pulse(2400 * (1 + 0.2 * np.exp(-t / 0.004)), n, 0.5) * np.exp(-t / 0.012)
    ck = S.click(seed, 4000, 0.02)
    y[:len(ck)] += 0.6 * ck
    return y


def tik(f, sharp):
    n = int(0.07 * SR)
    t = tv(n)
    if sharp:
        y = S.pulse(f, n, 0.25) * np.exp(-t / 0.014)
        ck = S.click(7, 5000, 0.02)
        y[:len(ck)] += 0.9 * ck
    else:
        y = np.sin(2 * math.pi * f * t) * np.exp(-t / 0.02) + 0.3 * S.pulse(f, n, 0.5) * np.exp(-t / 0.008)
    return y


def chime_note(f, dur=0.6):
    n = int(dur * SR)
    t = tv(n)
    y = 0.55 * S.pulse(f, n, 0.25) * np.exp(-t / 0.18) + 0.8 * np.sin(2 * math.pi * f * t) * np.exp(-t / 0.4)
    y += 0.2 * np.sin(2 * math.pi * f * 2.0 * t) * np.exp(-t / 0.12)
    return y * np.minimum(1, t / 0.002)


def ui_sounds(bus, lang):
    from . import explain
    k = 0
    for t, kind in explain.typing_events(lang):
        if kind == 'type':
            f = (1046.5, 1174.7, 1318.5, 1174.7)[k % 4]
            bus.put(S.blip(f, f * 0.94, 0.016, 0.5), t, 0.03, 0.15)
            k += 1
        else:
            bus.put(S.blip(1568.0, 1568.0, 0.03, 0.25), t, 0.035, -0.2)
            bus.put(S.blip(2093.0, 2093.0, 0.04, 0.25), t + 0.04, 0.035, 0.2)


def sfx(info=True, lang='en'):
    bus = Loop()
    if info:
        ui_sounds(bus, lang)
    # ---- the card swap at the loop point: the old card slides out, a new one slides in with a stepped stop
    bus.put(S.whoosh(0.3, 2500, 600, 3, 0.7, 0.4), T.SLIDE_OUT[0], 0.12)
    for k in range(4):
        bus.put(S.click(10 + k, 2200 - 200 * k, 0.02), k / 30.0, 0.18, 0.3)
    bus.put(S.thump(180, 80, 0.08, 0.2, 14), 4 / 30.0, 0.22)
    # ---- the hook: four wet plips on the beat
    for k, (t0, f0) in enumerate(zip(T.LANDS, (1150, 980, 1300, 880))):
        bus.put(plip(f0, 20 + k), t0, 0.7, (-0.25, 0.25, -0.25, 0.25)[k])
    # ---- the reagents: lighter taps with a tiny glint ting, the swirl, the stepped time-lapse
    for k, t0 in enumerate(T.REAGENT_LANDS):
        bus.put(tap(30 + k), t0, 0.12, (-0.25, 0.25, -0.25, 0.25)[k])
        bus.put(np.sin(2 * math.pi * 4186 * tv(int(0.04 * SR))) * np.exp(-tv(int(0.04 * SR)) / 0.01), t0 + 0.01,
                0.05)
    sw = S.bandnoise(T.SWIRL[1] - T.SWIRL[0], lambda tt: 900 + 900 * np.sin(tt * 12), 0.6, 40)
    bus.put(sw * np.sin(np.pi * np.clip(tv(len(sw)) / (T.SWIRL[1] - T.SWIRL[0]), 0, 1)), T.SWIRL[0], 0.08)
    for k, t0 in enumerate(T.GROW):
        bus.put(S.blip(S.mtof(84 + 3 * k), S.mtof(84 + 3 * k), 0.035, 0.25), t0, 0.08)
        bus.put(S.click(50 + k, 3000, 0.02), t0, 0.12)
    # ---- the dive: one quick descending whoosh, the stepped cut, the glide
    bus.put(S.whoosh(0.35, 400, 1400, 41, 0.7, 0.7), T.PUSH[0], 0.06)
    bus.put(S.whoosh(T.CUT_IN[0] - T.DIVE[0] + 0.1, 3600, 260, 42, 0.8, 0.7), T.DIVE[0], 0.24)
    for k in range(4):
        bus.put(S.blip(S.mtof(79 - 5 * k), S.mtof(79 - 5 * k), 0.03, 0.25), T.CUT_IN[0] + k / 30.0, 0.07)
    # ---- the bridge: soft tik, sharper tik; then quiet ticks while more bridges form
    bus.put(tik(1760.0, False), T.BIND1, 0.42)
    bus.put(tik(2637.0, True), T.BIND2, 0.5)
    for k, t0 in enumerate(T.BRIDGES):
        bus.put(tik(2093.0 + 120 * k, False)[:int(0.04 * SR)], t0, 0.14, -0.4 + 0.16 * k)
    # ---- Anti-B: a match-cut blip, the antibody passes (no tik), a little 'no match' boop
    bus.put(S.blip(1318.5, 1318.5, 0.04, 0.5), T.CUT_B, 0.08)
    pas = S.bandnoise(1.0, lambda tt: 600 + 500 * tt, 0.7, 60)
    bus.put(pas * np.sin(np.pi * tv(len(pas)) / 1.0), T.B_PASS[0] + 0.3, 0.05)
    bus.put(S.blip(659.3, 523.3, 0.08, 0.5), 16.9, 0.06)
    bus.put(S.blip(523.3, 392.0, 0.1, 0.5), 17.0, 0.06)
    # ---- back out: rising whoosh, the stepped cut, the outline steps
    bus.put(S.whoosh(T.CARD_PULL[1] - T.CELL_OUT[0], 300, 3200, 61, 0.8, 0.5), T.CELL_OUT[0], 0.16)
    for k in range(4):
        bus.put(S.blip(S.mtof(72 + 5 * k), S.mtof(72 + 5 * k), 0.03, 0.25), T.CUT_OUT[0] + k / 30.0, 0.06)
    for k, t0 in enumerate(T.OUTLINE):
        bus.put(S.blip(S.mtof(76 + 4 * k), S.mtof(76 + 4 * k), 0.05, 0.25), t0, 0.12, -0.3 + 0.2 * k)
    # ---- the result: a pop for the A, then the two-note reward chime
    bus.put(S.blip(784, 1568, 0.06, 0.25), T.A_POP, 0.14)
    bus.put(chime_note(1318.5), T.CHIME, 0.3, -0.15)
    bus.put(chime_note(2093.0, 0.9), T.CHIME + 0.25, 0.3, 0.15)
    return bus.x


def master(mus, fx, target=-14.0):
    mix = 0.5 * mus + 1.3 * fx
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
    fx = sfx(info, lang)
    mix = master(mus, fx)
    S.write_wav(out / 'music.wav', np.clip(mus * 10 ** ((-16.0 - S.lufs(mus)) / 20), -1, 1))
    S.write_wav(out / 'sfx.wav', np.clip(fx * 10 ** ((-16.0 - S.lufs(fx)) / 20), -1, 1))
    S.write_wav(out / 'mix.wav', mix)
    info_ = {'lufs': round(float(S.lufs(mix)), 2), 'true_peak_db': round(float(S.true_peak(mix)), 2)}
    log(f"audio: mix {info_['lufs']} LUFS, true peak {info_['true_peak_db']} dBTP, {mix.shape[1] / SR:.3f} s stereo")
    return out / 'mix.wav', info_
