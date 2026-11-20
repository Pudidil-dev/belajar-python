"""Original soundtrack for the 20-second loop, synthesized from code: a 120 BPM chiptune in C major (square-wave
lead, triangle bass, light arcade drums) and the effects, all on stereo buses exactly one loop long, so anything
that rings past the end comes back in at the start. The last bar (G) is a pickup into the first (C): V to I
across the loop point, and the soft "shff" of the swab runs straight through it.

Bars (2 s each): 0 hook (C) | 1 dive (Am) | 2 one cell becomes two (F) | 3-4 build (G, Am) | 5 overnight and riser
(F G) | 6 drop (C) | 7 hold (Am F) | 8 the swab comes back (F) | 9 pickup (G).
Effects follow the picture: the streak "shff", a glassy tink for every glint that blinks out, a riser into the
dive, a click-beep when the bracket locks on, the stretch, the DNA copy blips and the pinch of the first division,
one tick per division (climbing the scale, then a roll), a chime when the clock stops at overnight, a riser and a
bright chord on the drop, a pop for every colony that pops up along the streak, a sparkle for ours, a shimmer for
the light sweep, a soft "tup" when the swab touches our colony, whooshes as it travels, a soft landing.
Mastered to -14 LUFS with a -1 dBTP ceiling, the limiter running round the loop too.
"""
import math
import numpy as np
from . import synth as S
from . import timeline as T

SR = S.SR
NL = int(round(T.TOTAL * SR))
B16 = T.BEAT / 4


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

    def put(self, sig, t, gain=1.0, pan=0.0, pan_to=None):
        if len(sig) == 0:
            return
        s = int(round((t % T.TOTAL) * SR))
        sig = np.asarray(sig, float) * gain
        if pan_to is None:
            a = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
            self._add(0, sig * math.cos(a), s)
            self._add(1, sig * math.sin(a), s)
        else:
            p = np.clip(np.linspace(pan, pan_to, len(sig)), -1, 1)
            a = (p + 1) * math.pi / 4
            self._add(0, sig * np.cos(a), s)
            self._add(1, sig * np.sin(a), s)


def circular(fn, x):
    """Run a filter as if the loop played forever (three copies, keep the middle one)."""
    x3 = np.concatenate([x, x, x], axis=-1)
    return fn(x3)[..., NL:2 * NL]


def bt(bar, beat=0.0):
    return bar * T.BAR + beat * T.BEAT


def env(n, a=0.01, r=0.05):
    e = np.ones(n)
    ka, kr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:ka] = np.linspace(0, 1, ka)
    e[-kr:] *= np.linspace(1, 0, kr)
    return e


def glide(f0, f1, dur, wave='sine', duty=0.25, vib=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    if vib:
        f = f * 2 ** (vib * np.sin(2 * math.pi * 5.5 * t) / 12)
    if wave == 'tri':
        return S.tri(f, n)
    if wave == 'pulse':
        return S.pulse(f, n, duty)
    return S.sine(f, n)


# ------------------------------------------------------------------ music
TONES = {'C': (60, 64, 67), 'Am': (57, 60, 64), 'F': (53, 57, 60), 'G': (55, 59, 62)}
HOOK = [(0, 84, 2), (2, 79, 1), (3, 76, 1), (4, 79, 2), (6, 84, 1), (7, 86, 1), (8, 88, 2), (10, 86, 1), (11, 84, 1),
        (12, 79, 2), (14, 76, 2)]
DROP = [(0, 88, 3), (3, 86, 1), (4, 84, 2), (6, 86, 2), (8, 91, 4), (12, 88, 2), (14, 86, 2)]
HOLD = [(0, 84, 2), (2, 88, 2), (4, 86, 3), (7, 84, 1), (8, 81, 2), (10, 84, 2), (12, 81, 4)]
BACK = [(0, 81, 4), (4, 79, 4), (8, 77, 6)]
PICK = [(10, 79, 1), (11, 81, 1), (12, 83, 1), (13, 79, 1), (14, 83, 1), (15, 86, 1)]


def music():
    lead, bass, arp, pad, drums = Loop(), Loop(), Loop(), Loop(), Loop()

    def bn(m, t0, dur, g):
        bass.put(S.bass(m, dur), t0, g)

    for k, iv in enumerate((0, 12, 0, 12, 0, 12, 7, 12)):             # bar 0: racing octaves
        bn(36 + iv, bt(0) + k * 0.25, 0.2, 0.75 if k % 2 == 0 else 0.55)
    bn(33, bt(1), 1.85, 0.42)                                          # bar 1: one long A under the dive
    bn(29, bt(2), 1.85, 0.36)                                          # bar 2: F, calm
    for k in range(4):                                                 # bar 3: G quarters
        bn(31, bt(3, k), 0.42, 0.55)
    for k in range(8):                                                 # bar 4: A eighths
        bn(33 + 12 * (k % 2), bt(4) + k * 0.25, 0.2, 0.58)
    for k in range(4):                                                 # bar 5: F eighths, then G sixteenths
        bn(29 + 12 * (k % 2), bt(5) + k * 0.25, 0.2, 0.6)
    for k in range(7):
        bn(31 + 12 * (k % 2), bt(5, 2) + k * B16, 0.1, 0.5 + 0.04 * k)
    for k, iv in enumerate((0, 12, 0, 12, 0, 12, 7, 12)):             # bar 6: the drop
        bn(36 + iv, bt(6) + k * 0.25, 0.2, 0.85 if k % 2 == 0 else 0.62)
    for k in range(8):                                                 # bar 7: Am, then F
        bn((33 if k < 4 else 29) + 12 * (k % 2), bt(7) + k * 0.25, 0.2, 0.6)
    for k in (0, 2):                                                   # bar 8: F, sparse
        bn(29, bt(8, k), 0.9, 0.5)
    for k in range(8):                                                 # bar 9: G eighths, building
        bn(31 + 12 * (k % 2), bt(9) + k * 0.25, 0.2, 0.45 + 0.05 * k)

    def phrase(bar, notes, g=0.34, duty=0.25):
        for slot, m, ln in notes:
            lead.put(S.lead(m, ln * B16 * 0.9, duty=duty), bt(bar) + slot * B16, g)
    phrase(0, HOOK)
    phrase(6, DROP, 0.36, 0.125)
    phrase(7, HOLD, 0.3)
    phrase(8, BACK, 0.2, 0.5)
    phrase(9, PICK, 0.32)

    def arp_bar(bar, chord, g, half=None):
        tones = TONES[chord]
        for k in range(16):
            if half == 0 and k >= 8 or half == 1 and k < 8:
                continue
            m = tones[k % 3] + 12 + 12 * ((k // 3) % 2)
            arp.put(S.chip_arp(m, B16 * 0.8), bt(bar) + k * B16, g, -0.45 + 0.3 * (k % 4))
    arp_bar(0, 'C', 0.07)
    arp_bar(6, 'C', 0.12)
    arp_bar(7, 'Am', 0.1, 0)
    arp_bar(7, 'F', 0.1, 1)
    arp_bar(9, 'G', 0.06)

    for bar, ch in ((1, 'Am'), (2, 'F'), (3, 'G'), (4, 'Am'), (8, 'F'), (9, 'G')):
        pad.put(S.pad([m + 12 for m in TONES[ch]], T.BAR - 0.25, 0.35), bt(bar), 0.26)
    pad.put(S.pad([m + 12 for m in TONES['F']], 0.95, 0.15), bt(5), 0.22)
    pad.put(S.pad([m + 12 for m in TONES['G']], 0.85, 0.15), bt(5, 2), 0.24)

    def kick(t, g=1.0):
        drums.put(S.kick(), t, 0.8 * g)

    def snare(t, g=1.0):
        drums.put(S.snare(), t, 0.48 * g)

    def hat(t, g=1.0, op=False):
        drums.put(S.hat(op), t, 0.24 * g, 0.25)

    kick(0.0)
    kick(1.0)
    snare(0.5, 0.8)
    snare(1.5, 0.8)
    for k in range(8):
        hat(k * 0.25, 0.7 if k % 2 else 1.0)
    for k in range(4):                                                 # bar 3: four on the floor, growing
        kick(bt(3, k), 0.55 + 0.1 * k)
    for k in range(4):
        kick(bt(4, k), 0.9)
    snare(bt(4, 1), 0.6)
    snare(bt(4, 3), 0.7)
    for k in range(8):
        hat(bt(4) + k * 0.25, 0.6)
    for k in range(4):                                                 # bar 5: the roll into the drop
        kick(bt(5, k), 0.9)
    for k in range(4):
        snare(bt(5, 2) + k * 0.125, 0.45 + 0.08 * k)
    for k in range(6):
        snare(bt(5, 3) + k * 0.0625, 0.7 + 0.05 * k)
    drums.put(S.crash(1.8), bt(6), 0.42)                               # bar 6: the drop
    for bar in (6, 7):
        g = 1.0 if bar == 6 else 0.8
        kick(bt(bar), g)
        kick(bt(bar, 2), g)
        snare(bt(bar, 1), 0.8 * g)
        snare(bt(bar, 3), 0.8 * g)
        for k in range(8):
            hat(bt(bar) + k * 0.25, (0.8 if k % 2 else 1.0) * g, op=(k == 7))
    kick(bt(8), 0.7)                                                   # bar 8: thin out
    for k in range(2, 8):
        hat(bt(8) + k * 0.25, 0.45)
    kick(bt(9), 0.8)                                                   # bar 9: fill into the loop
    kick(bt(9, 1), 0.7)
    for k in range(4):
        snare(bt(9, 2) + k * 0.125, 0.35 + 0.07 * k)
    for k, m in enumerate((50, 47, 45, 43)):
        drums.put(S.tom(m), bt(9, 3) + k * 0.125, 0.32)

    lx = circular(lambda x: np.stack([x[0] + S.echo(x[0], 0.375, 0.28), x[1] + S.echo(x[1], 0.375, 0.28)]), lead.x)
    pd = np.stack([S.lowpass(pad.x[0], 2600, 127), S.lowpass(pad.x[1], 2600, 127)])
    return 0.9 * lx + 1.0 * bass.x + 0.9 * arp.x + 0.7 * pd + 1.0 * drums.x


# ------------------------------------------------------------------ effects
SCALE = [72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96, 98]


def _shff():
    """The cotton dragging over the gel: soft, papery, a little brighter where the streak turns."""
    dur = T.SW1 - T.SW0
    y = S.bandnoise(dur, lambda x: 2100 + 700 * np.abs(np.cos(3 * math.pi * (x / dur))), 0.9, 3)
    n = len(y)
    grain = S.lowpass(S.white(n, 31), 45, 255)
    grain = grain / (np.abs(grain).max() + 1e-9)
    body = S.bandnoise(dur, lambda x: 700 + 0 * x, 0.6, 4)
    out = (0.8 * y + 0.35 * body) * (0.72 + 0.28 * grain)
    return out * env(n, 0.05, 0.22)


def sfx():
    fx, sp = Loop(), Loop()                       # sp: sparkles, sent through a reverb
    # ---- the hook: the streak, a low note under it, glints that blink out
    fx.put(_shff(), T.TOTAL + T.SW0, 0.24, -0.15)
    fx.put(S.thump(95, 38, 0.6, 0.15, 2), 0.0, 0.32)
    rng = np.random.default_rng(17)
    for gi in range(len(T.GLINTS)):
        t_end = T.glint_end(gi) % T.TOTAL
        m = int(rng.choice([96, 98, 100, 103, 105, 108]))
        sp.put(S.glass_ping(S.mtof(m), 0.3, gi), t_end, 0.035 + 0.03 * T.GLINTS[gi, 4], float(rng.uniform(-0.5, 0.5)))
    fx.put(S.thump(150, 70, 0.18, 0.1, 5), T.SW1, 0.12)                # the swab lifts off
    # ---- the dive and the lock-on
    fx.put(S.whoosh(1.6, 280, 2600, 5, 0.8, 0.85), 1.35, 0.2)
    for tb in (2.62, 2.74):
        fx.put(S.beep(1318.5, 0.035, 0.5) * env(int(0.035 * SR), 0.002, 0.01), tb, 0.06, 0.2)
    fx.put(S.click(7, 3000, 0.03), T.LOCK, 0.3)
    b2 = np.concatenate([S.beep(1318.5, 0.05, 0.25), S.beep(1760.0, 0.09, 0.25)])
    fx.put(b2 * env(len(b2), 0.002, 0.03), T.LOCK + 0.01, 0.1)
    g = glide(1500, 150, 1.35) * env(int(1.35 * SR), 0.03, 0.4)
    fx.put(g, T.LOCK + 0.05, 0.1)
    for k in range(6):                                                 # little bubbles on the way down
        f = 1600 * 0.75 ** k
        fx.put(S.blip(f, f * 1.6, 0.06, 0.5), T.LOCK + 0.18 + k * 0.17, 0.05, -0.3 + 0.12 * k)
    # ---- one cell becomes two
    d = 1.45
    st = glide(349.2, 523.3, d, 'tri', vib=0.25) * env(int(d * SR), 0.35, 0.3)
    fx.put(st, 4.0, 0.07)
    for k, t0 in enumerate((4.45, 4.75, 5.05)):
        fx.put(S.blip(S.mtof(91), S.mtof(91), 0.05, 0.25), t0, 0.05, -0.3)
        fx.put(S.blip(S.mtof(95), S.mtof(95), 0.05, 0.25), t0 + 0.1, 0.05, 0.3)
    pc = glide(784, 1047, 0.5, 'pulse', 0.125) * env(int(0.5 * SR), 0.1, 0.08)
    pc *= 0.7 + 0.3 * np.sin(2 * math.pi * 18 * np.arange(len(pc)) / SR)
    fx.put(pc, 5.45, 0.045)
    # ---- every division: a tick, climbing the scale, then a roll
    for k, td in enumerate(T.DIV):
        if k < len(SCALE):
            m = SCALE[k]
        else:
            m = 96 if k % 2 == 0 else 91
        f = S.mtof(m)
        fx.put(S.blip(f, f * 1.25, 0.05, 0.25), td, 0.16 + 0.004 * k, -0.2 + 0.4 * (k % 2))
        fx.put(S.click(k, 4000, 0.02), td, 0.05 + 0.002 * k)
    fx.put(S.boing(260, 0.2), T.DIV[0], 0.08)                          # the first split: a little pop
    # ---- overnight, the riser, the drop
    sp.put(S.bell(91, 1.0), T.OVERNIGHT + 0.01, 0.14)
    sp.put(S.bell(100, 0.8), T.OVERNIGHT + 0.07, 0.07)
    fx.put(S.whoosh(0.98, 400, 7000, 9, 0.8, 0.98), 10.9, 0.24)
    rz = glide(523, 2093, 0.95, 'pulse', 0.25) * env(int(0.95 * SR), 0.2, 0.02)
    fx.put(rz, 10.92, 0.035)
    for m in (60, 64, 67, 72, 76, 79):
        n = int(0.7 * SR)
        fx.put(S.pulse(S.mtof(m), n, 0.5) * S.env_exp(n, 0.22, 0.002), T.POP0, 0.05)
    sp.put(S.bell(84, 1.4), T.POP0, 0.16)
    fx.put(S.thump(130, 42, 0.6, 0.4, 8), T.POP0, 0.42)
    # pops along the streak: one per sixteenth that has a colony popping in it, pitch climbing
    slots = sorted(set(int(round((pt - T.POP0) / B16)) for pt in T.POP_T))
    our_slot = int(round((T.POP_T[T.OUR] - T.POP0) / B16))
    for j, sl in enumerate(slots):
        if sl == our_slot:
            continue
        m = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100][min(j, 12)]
        f = S.mtof(m)
        fx.put(S.blip(f, f * 2.0, 0.07, 0.5), T.POP0 + sl * B16, 0.09, -0.6 + 1.2 * sl / 13)
    tg = T.POP_T[T.OUR]                                                # our colony: the sparkle
    sp.put(S.glass_ping(S.mtof(96), 0.9, 50), tg, 0.2, 0.25)
    sp.put(S.bell(96, 1.1), tg, 0.13, 0.25)
    for k, m in enumerate((96, 100, 103, 108)):
        sp.put(S.glass_ping(S.mtof(m), 0.4, 60 + k), tg + 0.03 + k * 0.0625, 0.05, 0.3)
    # ---- the hold: a light sweep, the counter goes away
    for k, m in enumerate((84, 86, 88, 91, 93, 96, 98, 100)):
        sp.put(S.glass_ping(S.mtof(m), 0.45, 70 + k), 14.0 + k * B16 * 0.9, 0.035, -0.6 + 0.17 * k)
    fx.put(S.whoosh(0.9, 3000, 9000, 11, 0.8, 0.5), 14.0, 0.05)
    fx.put(S.blip(1200, 500, 0.08, 0.25), 15.6, 0.05)
    # ---- the swab comes back, touches our colony, travels, lands
    fx.put(S.whoosh(1.2, 2600, 500, 13, 0.8, 0.7), 15.8, 0.13, 0.45)
    fx.put(S.thump(170, 70, 0.25, 0.3, 14), T.TOUCH, 0.36)
    fx.put(S.tri(S.mtof(72), int(0.14 * SR)) * S.env_exp(int(0.14 * SR), 0.05, 0.002), T.TOUCH, 0.1)
    sq = S.bandnoise(0.09, lambda x: 1200 + 0 * x, 0.5, 15) * env(int(0.09 * SR), 0.005, 0.05)
    fx.put(sq, T.TOUCH + 0.01, 0.06)
    fx.put(S.whoosh(0.35, 600, 1800, 16, 0.8, 0.6), 17.15, 0.07)
    fx.put(S.whoosh(1.3, 500, 1400, 17, 0.8, 0.5), 17.4, 0.11, -0.45, 0.45)
    tf = S.bandnoise(0.07, lambda x: 900 + 0 * x, 0.7, 18) * env(int(0.07 * SR), 0.004, 0.05)
    fx.put(tf, T.LAND, 0.09)
    fx.put(S.thump(120, 60, 0.14, 0.1, 19), T.LAND, 0.1)

    spr = circular(lambda x: x + 0.35 * S.reverb(x, 1.3), sp.x)
    return fx.x + spr


def master(mus, fx, target=-14.0):
    mix = 0.5 * mus + 1.0 * fx
    mix = circular(lambda x: np.stack([S.lowpass(x[0], 15500, 127), S.lowpass(x[1], 15500, 127)]), mix)
    ceiling = -1.6
    for _ in range(6):
        mix *= 10 ** ((target - S.lufs(mix)) / 20)
        mix = circular(lambda x: S.limiter(x, ceiling), mix)
        tp = S.true_peak(mix)
        if tp <= -1.0 and abs(S.lufs(mix) - target) < 0.15:
            break
        if tp > -1.0:
            ceiling -= (tp + 1.0) + 0.15
    return mix


def render(out_dir, log=print):
    from pathlib import Path
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    log('audio: music ...')
    mus = music()
    log('audio: effects ...')
    fx = sfx()
    mix = master(mus, fx)
    S.write_wav(out / 'music.wav', np.clip(mus * 10 ** ((-16.0 - S.lufs(mus)) / 20), -1, 1))
    S.write_wav(out / 'sfx.wav', np.clip(fx * 10 ** ((-16.0 - S.lufs(fx)) / 20), -1, 1))
    S.write_wav(out / 'mix.wav', mix)
    info = {'lufs': round(float(S.lufs(mix)), 2), 'true_peak_db': round(float(S.true_peak(mix)), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP, {mix.shape[1] / SR:.3f} s stereo")
    return out / 'mix.wav', info
