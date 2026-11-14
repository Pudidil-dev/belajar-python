"""The soundtrack: an original 120 BPM chiptune in 4/4, 18 bars = exactly 36 s, plus machine and science sound effects
on the picture's timeline. Everything is synthesized in code (engine/synth.py): no samples, no audio files.

The loop is circular: every sound, echo and reverb tail that runs past 36 s wraps to the start, and the last
carousel click (35.75 s) leads into the opening downbeat.

Score in F major:
  bar 1        the hook with a pocket on beats 1-2 for the opening "plip" (0.375 s)
  bar 2        the reveal; a quick tape-rewind cue on the match cut (3.85 s)
  bars 3-8     the workflow groove; servo whirrs and clacks land on the 16th grid as rhythmic accents
  bars 9-12    the molecular section: lighter, bubbly arpeggios, three combo notes (snap F6, pop A6, dye chord)
  bars 13-14   the optical reading: the music thins to a pad, one dry detector "bip" (28.25 s)
  bars 15-16   the build and the result: a two-note reward (30.75 s)
  bars 17-18   the next cuvette; the groove turns back into bar 1
"""
import math
import numpy as np
from . import synth as S
from . import timeline as T

SR = S.SR
NL = int(round(T.TOTAL * SR))
STEP = T.STEP


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


# ---------------------------------------------------------------- the score
LEAD = {
    0: [(4, 1, 77), (5, 1, 81), (6, 2, 84), (8, 2, 81), (10, 1, 79), (11, 1, 81), (12, 4, 77)],
    1: [(0, 2, 79), (2, 1, 76), (3, 1, 79), (4, 2, 84), (6, 2, 79), (8, 4, 76), (12, 2, 72), (14, 2, 74)],
    2: [(0, 2, 77), (2, 2, 81), (4, 1, 86), (5, 1, 84), (6, 2, 81), (8, 2, 77), (10, 2, 74), (12, 2, 77),
        (14, 2, 81)],
    3: [(0, 3, 82), (3, 1, 81), (4, 2, 77), (6, 2, 74), (8, 4, 77), (12, 2, 79), (14, 2, 81)],
    4: [(0, 2, 84), (2, 1, 81), (3, 1, 84), (4, 2, 89), (6, 2, 84), (8, 2, 81), (10, 2, 84), (12, 4, 81)],
    5: [(0, 2, 79), (2, 2, 84), (4, 4, 88), (8, 2, 84), (10, 2, 79), (12, 4, 76)],
    6: [(0, 2, 77), (2, 2, 81), (4, 2, 86), (6, 2, 84), (8, 2, 82), (10, 2, 77), (12, 4, 74)],
    7: [(0, 4, 82), (8, 4, 84)],
    8: [(0, 2, 74), (2, 2, 77), (4, 2, 81), (6, 1, 79), (7, 1, 77), (10, 2, 81), (12, 4, 84)],
    9: [(0, 2, 81), (2, 2, 84), (4, 2, 88), (6, 2, 84), (10, 2, 79), (12, 4, 76)],
    10: [(0, 2, 82), (2, 2, 86), (4, 2, 89), (6, 2, 86), (8, 2, 82), (12, 4, 77)],
    11: [(0, 4, 79), (4, 4, 84), (8, 8, 88)],
    14: [(6, 1, 77), (7, 1, 79), (8, 1, 81), (9, 1, 82), (10, 1, 84), (11, 1, 86), (12, 1, 88), (13, 1, 89),
         (14, 2, 91)],
    15: [(0, 2, 84), (2, 2, 89), (4, 2, 88), (8, 2, 84), (10, 2, 81), (12, 4, 77)],
    16: [(0, 2, 81), (2, 2, 77), (4, 2, 74), (6, 2, 77), (8, 4, 81), (12, 4, 84)],
    17: [(0, 2, 82), (2, 2, 81), (4, 2, 79), (6, 2, 77), (8, 2, 79), (10, 2, 76), (12, 2, 72), (14, 1, 74),
         (15, 1, 76)],
}
CHORD = {'F': (41, (0, 4, 7)), 'C': (48, (0, 4, 7)), 'Dm': (50, (0, 3, 7)), 'Bb': (46, (0, 4, 7)),
         'Am': (45, (0, 3, 7))}
BARS = [('F', 'F'), ('C', 'C'), ('Dm', 'Dm'), ('Bb', 'Bb'), ('F', 'F'), ('C', 'C'), ('Dm', 'Bb'), ('Bb', 'C'),
        ('Dm', 'Dm'), ('Am', 'Am'), ('Bb', 'Bb'), ('C', 'C'), ('Dm', 'Dm'), ('Bb', 'C'), ('Dm', 'C'), ('F', 'F'),
        ('Dm', 'Dm'), ('Bb', 'C')]
MOLEC = (8, 9, 10, 11)
THIN = (12, 13)
POCKET = (0, 1, 5)            # bar 0, 16ths 1..4: room for the plip


def bar_t(b, step=0.0):
    return b * T.BAR + step * STEP


def _in_pocket(b, s):
    return b == POCKET[0] and POCKET[1] <= s < POCKET[2]


def music():
    lead_b, arp_b, bass_b, drum_b, pad_b = (Loop() for _ in range(5))
    for b, notes in LEAD.items():
        for s, l, m in notes:
            duty = 0.125 if b in MOLEC else 0.25
            lead_b.put(S.lead(m, l * STEP * (0.9 if l <= 2 else 0.96), duty, vib=0.13), bar_t(b, s), 0.19, 0.06)
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root, iv = CHORD[name]
            base_s = half * 8
            # bouncy bass: root / octave in 8ths, a pickup 16th before the next chord
            if b not in THIN:
                for k in range(4):
                    s = base_s + 2 * k
                    if _in_pocket(b, s) or _in_pocket(b, s + 1):
                        continue
                    if b in MOLEC and k % 2:
                        continue
                    m = root + (12 if k % 2 else 0)
                    bass_b.put(S.bass(m, STEP * (1.5 if b not in MOLEC else 3.4)), bar_t(b, s), 0.3)
                if b not in MOLEC and half == 1:
                    bass_b.put(S.bass(root + 7, STEP * 0.7), bar_t(b, 15), 0.22)
            else:
                bass_b.put(S.bass(root, T.BAR / 2 * 0.95), bar_t(b, base_s), 0.18)
            # arpeggios: 16ths in the workflow, a bubbly 12.5 % pulse in the molecular bars
            tones = [root + 24 + i for i in iv] + [root + 36]
            for k in range(8):
                s = base_s + k
                if _in_pocket(b, s):
                    continue
                if b in THIN and k % 2:
                    continue
                pat = [0, 1, 2, 3, 2, 1, 2, 3] if b not in MOLEC else [0, 2, 1, 3, 2, 0, 3, 1]
                m = tones[pat[k]] + (12 if b in MOLEC else 0)
                g = 0.05 if b not in THIN else 0.035
                arp_b.put(S.chip_arp(m, STEP * 0.8, 0.125 if b in MOLEC else 0.25), bar_t(b, s), g, -0.45)
    for b in THIN:
        for half, name in ((0, BARS[b][0]), (1, BARS[b][1])):
            root, iv = CHORD[name]
            pad_b.put(S.pad([root + 12 + i for i in iv], 1.0), bar_t(b, half * 8), 0.08)
    K, Sn, Hc, Ho, C = S.kick(), S.snare(), S.hat(False), S.hat(True), S.crash()
    for b in range(T.BARS):
        t0 = bar_t(b)
        if b in THIN:
            continue
        if b in MOLEC:
            drum_b.put(K, t0, 0.34)
            drum_b.put(K, t0 + 8 * STEP, 0.3)
            for k in range(2, 16, 4):
                drum_b.put(Hc, t0 + k * STEP, 0.05, 0.3)
            continue
        for k in (0, 6, 8) if b not in (0,) else (0, 8):
            drum_b.put(K, t0 + k * STEP, 0.4)
        for k in (4, 12):
            if not _in_pocket(b, k):
                drum_b.put(Sn, t0 + k * STEP, 0.23, 0.08)
        for k in range(16):
            if _in_pocket(b, k):
                continue
            drum_b.put(Hc, t0 + k * STEP, 0.085 if k % 4 == 2 else 0.04, 0.3)
        if b == 1:                                          # roll into the rewind cue
            for i, k in enumerate((12, 13, 14)):
                drum_b.put(S.snare(0.5 + 0.2 * i), t0 + k * STEP, 0.2, 0.08)
        if b == 14:                                         # build into the result
            for i, k in enumerate(range(8, 16)):
                drum_b.put(S.snare(0.35 + 0.08 * i), t0 + k * STEP, 0.18, 0.08)
        if b in (2, 15):
            drum_b.put(C, t0, 0.14, 0.25)
        if b in (5, 16):
            drum_b.put(Ho, t0 + 14 * STEP, 0.07, 0.3)
    lead = lead_b.x
    mono = lead.sum(0) * 0.5
    dl = np.stack([circular(lambda v: S.echo(v, 0.375, 0.3), mono), circular(lambda v: S.echo(v, 0.25, 0.28), mono)])
    mus = lead + 0.38 * dl + arp_b.x + bass_b.x + drum_b.x + pad_b.x
    room = circular(lambda v: S.reverb(v, 1.1, 21), mus - 0.9 * bass_b.x - 0.6 * drum_b.x)
    return mus + 0.14 * room


# ---------------------------------------------------------------- sound effects
def plip():
    """The opening drop touching the reagent: a clean arcade 'plip' (rising sine blip + a tiny click)."""
    n = int(0.11 * SR)
    t = tv(n)
    f = 620 + 1500 * (1 - np.exp(-t / 0.018))
    y = np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t / 0.032)
    y[:int(0.003 * SR)] += S.click(4, 4200, 0.003)[:int(0.003 * SR)] * 0.5
    return y / np.abs(y).max()


def servo(dur, f0, f1, seed=0):
    """Stepper/servo whirr: a gritty pulse whose pitch follows the motion, with a little noise."""
    n = int(dur * SR)
    t = tv(n)
    u = t / dur
    f = f0 + (f1 - f0) * (0.5 - 0.5 * np.cos(math.pi * u))
    y = 0.6 * S.pulse(f, n, 0.3) + 0.4 * S.pulse(f * 2.01, n, 0.5)
    y = S.lowpass(y, 2200, 63) + 0.15 * S.bandnoise(dur, lambda tt: 1800 + 0 * tt, 0.8, seed)
    env = np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.04)
    return y * env * (0.75 + 0.25 * np.sin(2 * math.pi * 40 * t))


def clack(seed=0):
    """A mechanical stop: a hard click and a small thump."""
    th = 0.6 * S.thump(160, 60, 0.12, 0.8, seed + 1)
    ck = 0.7 * S.click(seed, 2600, 0.04)
    th[:len(ck)] += ck
    return th


def slurp(dur, f0, f1, seed=0):
    """Liquid drawn up a probe: bubbly rising bloops."""
    n = int(dur * SR)
    t = tv(n)
    f = f0 * (f1 / f0) ** (t / dur)
    wob = 1 + 0.12 * np.sin(2 * math.pi * 18 * t)
    y = np.sin(2 * math.pi * np.cumsum(f * wob) / SR)
    am = 0.55 + 0.45 * (np.sin(2 * math.pi * 11 * t) > 0)
    return y * am * np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.06)


def pour(dur, seed=0):
    n = int(dur * SR)
    t = tv(n)
    y = np.zeros(n)
    rng = np.random.default_rng(seed)
    for k in range(int(dur * 14)):
        t0 = rng.uniform(0, dur - 0.05)
        m = int(0.04 * SR)
        tt = np.arange(m) / SR
        f = rng.uniform(500, 900) * (1 + 1.5 * tt / 0.04)
        b = np.sin(2 * math.pi * np.cumsum(f) / SR) * np.sin(math.pi * tt / 0.04) ** 2
        s0 = int(t0 * SR)
        y[s0:s0 + m] += b[:max(0, min(m, n - s0))]
    return y / (np.abs(y).max() + 1e-9)


def flutter(dur):
    """Stirrer motor: a short buzzy flutter (6 Hz paddle wobble on a 140 Hz motor)."""
    n = int(dur * SR)
    t = tv(n)
    y = 0.7 * S.pulse(140 + 8 * np.sin(2 * math.pi * 6 * t), n, 0.4) + 0.3 * np.sin(2 * math.pi * 280 * t)
    y = S.lowpass(y, 1800, 63)
    am = 0.6 + 0.4 * np.sin(2 * math.pi * 12 * t)
    return y * am * np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.08)


def combo(m, kind):
    """Molecular handoffs: three related notes of one 'combo' (F6, A6, then a chord on C7)."""
    if kind == 'snap':
        y = S.blip(S.mtof(m) * 1.5, S.mtof(m), 0.09, 0.25)
        ck = 0.8 * S.click(31, 3000, 0.02)
        y[:len(ck)] += ck
        return y
    if kind == 'pop':
        n = int(0.14 * SR)
        t = tv(n)
        f = S.mtof(m) * (0.6 + 0.4 * np.exp(-t / 0.02))
        return np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05) + 0.3 * S.pulse(S.mtof(m), n, 0.5) * \
            np.exp(-t / 0.03)
    out = np.zeros(int(1.0 * SR))
    for i, mm in enumerate((m, m + 4, m + 7, m + 12)):
        b = S.bell(mm, 0.95, 1.4, 2.0)
        out[int(i * 0.03 * SR):int(i * 0.03 * SR) + len(b)] += b[:len(out) - int(i * 0.03 * SR)]
    return out / np.abs(out).max()


def ui_sounds(bus, lang):
    """The explanation layer: soft dialog blips while a caption types, a two-note chime when a box opens, a tick
    when a part tag pops in. Quiet and high, so they sit above the music without masking the machine sounds."""
    from . import explain
    k = 0
    for t, kind in explain.typing_events(lang):
        if kind == 'type':
            f = (1046.5, 1174.7, 1318.5, 1174.7)[k % 4]
            bus.put(S.blip(f, f * 0.94, 0.016, 0.5), t, 0.04, 0.15)
            k += 1
        elif kind == 'open':
            bus.put(S.blip(1568.0, 1568.0, 0.03, 0.25), t, 0.045, -0.2)
            bus.put(S.blip(2093.0, 2093.0, 0.05, 0.25), t + 0.045, 0.045, 0.2)
        else:
            bus.put(S.blip(2637.0, 1760.0, 0.022, 0.5), t, 0.05, 0.3)


def sfx(info=True, lang='en'):
    bus = Loop()
    if info:
        ui_sounds(bus, lang)
    # ---- the opening: the drop plips in its pocket; the cutaway time-lapse whirs; the pull back
    bus.put(plip(), T.LAND, 0.55)
    ff = S.whoosh(1.0, 300, 2600, 3, 0.7, 0.85)
    bus.put(ff, 1.0, 0.1, 0.0)
    bus.put(S.whoosh(0.8, 3200, 400, 4, 0.8, 0.2), 2.12, 0.2)
    # ---- the rewind cue on the match cut back to the empty cuvette
    rw = S.blip(2400, 300, 0.16, 0.5)
    bus.put(rw[::-1].copy(), T.CUT_BACK - 0.16, 0.12)
    bus.put(S.click(5, 1800, 0.03), T.CUT_BACK, 0.25)
    # ---- the reagent tray indexes and clacks; the reagent probe goes down, draws, comes up, swings, dispenses
    bus.put(S.whoosh(0.8, 500, 1800, 6, 0.7, 0.5), 4.1, 0.12)
    bus.put(servo(0.5, 160, 320, 7), 4.95, 0.22, -0.3)
    bus.put(clack(8), T.TRAY_CLACK, 0.5, -0.3)
    bus.put(servo(0.45, 220, 160, 9), 6.0, 0.16, -0.3)
    bus.put(slurp(0.8, 260, 900, 10), 6.6, 0.16, -0.3)
    bus.put(servo(0.4, 160, 240, 11), 7.55, 0.15, -0.3)
    bus.put(servo(0.75, 200, 360, 12), 8.02, 0.17, -0.1)
    bus.put(S.click(13, 2200, 0.03), 8.8, 0.2)
    bus.put(pour(0.45, 14), T.RA_DISP[0], 0.2)
    # ---- the sample tray and the ring index; the sample probe draws serum and comes back
    bus.put(servo(0.4, 180, 300, 15), 9.9, 0.15, 0.3)
    bus.put(clack(16), 10.3, 0.32, 0.3)
    bus.put(clack(17), 10.7, 0.3, 0.0)
    bus.put(slurp(0.7, 340, 1200, 18), 10.85, 0.15, 0.3)
    bus.put(servo(0.75, 220, 380, 19), 12.02, 0.17, 0.2)
    bus.put(servo(0.4, 260, 180, 20), 12.82, 0.12, 0.0)
    pe = plip()
    bus.put(S.lowpass(pe, 2500, 63), T.REJOIN, 0.16)                  # the drop's echo at the rejoin
    bus.put(servo(0.65, 180, 280, 21), T.REJOIN + 0.05, 0.14)
    # ---- the stirrer
    bus.put(S.click(22, 1500, 0.03), T.MIX[0] - 0.05, 0.2)
    bus.put(flutter(T.MIX[1] - T.MIX[0]), T.MIX[0], 0.22)
    bus.put(S.click(23, 1500, 0.03), T.MIX[1] + 0.25, 0.18)
    # ---- into the molecules and the three combo notes, then back out
    bus.put(S.whoosh(0.6, 3000, 300, 24, 0.8, 0.3), 15.9, 0.18)
    bus.put(combo(89, 'snap'), T.SNAP, 0.4, -0.25)
    bus.put(combo(93, 'pop'), T.OXI, 0.4, 0.0)
    bus.put(combo(96, 'chord'), T.DYE, 0.3, 0.25)
    for k in range(10):                                                # dye accumulating: soft sparkles
        bus.put(S.bell(96 + (k * 5) % 12, 0.35, 1.1, 2.0), 21.45 + k * 0.06, 0.035, -0.6 + 0.12 * k)
    bus.put(S.whoosh(0.6, 300, 2800, 25, 0.8, 0.8), 21.95, 0.16)
    # ---- the line indexes the cuvette into the optical station
    bus.put(clack(26), 23.45, 0.3, 0.2)
    bus.put(clack(27), 24.15, 0.32, 0.2)
    # ---- the reading: lamp, a faint beam tone, one dry detector bip, the pulse, the comparison, the packet
    n = int(0.25 * SR)
    lamp = S.bandnoise(0.25, lambda tt: 900 + 2400 * tt, 0.7, 28) * np.exp(-tv(n) / 0.1)
    bus.put(lamp, 25.45, 0.14)
    hum = np.sin(2 * math.pi * 1046.5 * tv(int(2.4 * SR))) * 0.5 + 0.5 * np.sin(2 * math.pi * 1568 * tv(int(2.4 * SR)))
    hum *= np.minimum(1, tv(len(hum)) / 0.3) * np.minimum(1, (2.4 - tv(len(hum))) / 0.4)
    bus.put(hum, 25.6, 0.025)
    bip = S.beep(2093.0, 0.045, 0.5)
    bus.put(bip, T.BIP, 0.22)
    bus.put(S.blip(900, 2400, 0.4, 0.25), T.BIP + 0.02, 0.06)
    bus.put(S.blip(1318.5, 1318.5, 0.08, 0.5), 28.85, 0.1, -0.3)
    bus.put(S.blip(880.0, 880.0, 0.08, 0.5), 29.0, 0.1, 0.3)
    bus.put(S.whoosh(0.3, 800, 4000, 29, 0.6, 0.6), 29.72, 0.14)
    # ---- the result: a two-note reward
    bus.put(S.lead(84, 0.12, 0.25, vib=0.0), T.DING, 0.25)
    bus.put(S.lead(89, 0.32, 0.25, vib=0.1), T.DING + 0.125, 0.25)
    bus.put(S.bell(101, 0.6, 1.2, 2.0), T.DING + 0.125, 0.06)
    # ---- the next cuvette: the ring indexes; the sample arm swings back; the carousel click leads into bar 1
    bus.put(servo(0.4, 200, 320, 30), 32.0, 0.15)
    bus.put(clack(31), 32.4, 0.32)
    bus.put(slurp(0.4, 340, 1000, 32), 32.8, 0.07, 0.4)
    bus.put(servo(1.0, 220, 380, 33), 33.62, 0.17, 0.1)
    bus.put(servo(0.6, 260, 170, 34), 34.62, 0.13)
    bus.put(clack(35), 35.75, 0.3)
    room = circular(lambda v: S.reverb(v, 0.9, 31), bus.x)
    return bus.x + 0.1 * room


def master(mus, fx, target=-14.0):
    mix = 0.6 * mus + 1.4 * fx
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
    log('audio: score ...')
    mus = music()
    log('audio: effects ...')
    fx = sfx(info, lang)
    mix = master(mus, fx)
    g = 10 ** ((-16.0 - S.lufs(mus)) / 20)
    S.write_wav(out / 'music.wav', np.clip(mus * g, -1, 1))
    gs = 10 ** ((-16.0 - S.lufs(fx)) / 20)
    S.write_wav(out / 'sfx.wav', np.clip(fx * gs, -1, 1))
    S.write_wav(out / 'mix.wav', mix)
    info = {'lufs': round(S.lufs(mix), 2), 'true_peak_db': round(S.true_peak(mix), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP, {mix.shape[1] / SR:.3f} s stereo")
    return out / 'mix.wav', info
