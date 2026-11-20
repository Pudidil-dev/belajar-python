"""Original soundtrack for the 20-second loop, synthesized from code: a 120 BPM chiptune in C major (square-wave
lead, triangle bass, light arcade drums), the effects, and the sounds of the lab bench, all on stereo buses exactly
one loop long, so anything that rings past the end comes back in at the start. The last bar (G) is a pickup into the
first (C): V to I across the loop point, while the camera is still panning across the bench.

Bars (2 s each): 0 the pan lands on a fresh dish, the swab comes in (C) | 1 the streak (Am) | 2 the dive (F) |
3 one cell becomes two (F) | 4-5 the build, the roll and the pull-out (G, Am G) | 6 the drop (C) | 7 hold (Am F) |
8-9 the pan across the bench (F, G).
Effects follow the picture: a whoosh as the swab comes in and a soft landing, the streak "shff", a glassy tink for
every glint that blinks out, a riser into the dive, a click-beep when the bracket locks on, the stretch, the DNA copy
blips and the pinch of the first division, one tick per division (climbing the scale, then a roll), a riser and a
bright chord on the drop (the clock stops a sixteenth before it), a pop for every colony that pops up along the
streak, a sparkle for ours, a shimmer for the light sweep. The bench is heard where it is seen: the Bunsen burner's
roar, the stirrer's hum and whirr and the flask's bubbles swell and pan as the camera passes them, the 37.0 display
ticks once a second.
Mastered to -14 LUFS with a -1 dBTP ceiling, the limiter running round the loop too.
"""
import math
import numpy as np
from . import synth as S
from . import timeline as T
from . import props as PR

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


def put_bed(bus, sig, gain_env, pan_env):
    """A bed sound as long as the loop plus a crossfade tail: equal-power fade out over the tail, fade in at the
    start, so where the tail wraps onto the start the two halves cross without a seam."""
    n = len(sig)
    x = n - NL
    u = np.linspace(0, 1, x)
    sig = np.asarray(sig, float).copy()
    sig[:x] *= np.sin(0.5 * math.pi * u)
    sig[NL:] *= np.cos(0.5 * math.pi * u)
    idx = np.arange(n) % NL
    g, p = gain_env[idx], pan_env[idx]
    a = (np.clip(p, -1, 1) + 1) * math.pi / 4
    for ch, w in ((0, np.cos(a)), (1, np.sin(a))):
        y = sig * g * w
        bus.x[ch] += y[:NL]
        bus.x[ch, :x] += y[NL:]


def proximity(wx, wy, reach=1.15):
    """How close a bench prop is to the middle of the picture over the loop (0..1) and where it sits left to right,
    one value per sample; silent while the camera is down at cell size."""
    ts = np.arange(0.0, T.TOTAL, 0.01)
    g = np.zeros(len(ts))
    pn = np.zeros(len(ts))
    for i, t in enumerate(ts):
        cam = T.camera(t)
        if cam.z > 9.0:
            continue
        n = round((cam.xc - wx) / T.DELTA)
        sx, sy = cam.px(wx + n * T.DELTA, wy, T.Z_BENCH)
        d = math.hypot((sx - T.W / 2) / 170.0, (sy - T.H / 2) / 300.0)
        g[i] = max(0.0, min(1.0, reach - d)) ** 2 * (1 - T.S(cam.z, 5.0, 9.0))
        pn[i] = max(-1.0, min(1.0, (sx - T.W / 2) / 160.0))
    tt = np.arange(NL) / SR
    return np.interp(tt, ts, g, period=T.TOTAL), np.interp(tt, ts, pn, period=T.TOTAL)


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
CALL = [(0, 79, 2), (2, 84, 2), (4, 88, 3), (8, 86, 2), (10, 84, 2), (12, 83, 1), (13, 84, 1), (14, 86, 2)]
HOOK = [(0, 88, 2), (2, 84, 1), (3, 81, 1), (4, 84, 2), (6, 88, 1), (7, 86, 1), (8, 84, 2), (10, 83, 1), (11, 81, 1),
        (12, 76, 2), (14, 79, 2)]
DROP = [(0, 88, 3), (3, 86, 1), (4, 84, 2), (6, 86, 2), (8, 91, 4), (12, 88, 2), (14, 86, 2)]
HOLD = [(0, 84, 2), (2, 88, 2), (4, 86, 3), (7, 84, 1), (8, 81, 2), (10, 84, 2), (12, 81, 4)]
WALK = [(0, 81, 3), (3, 79, 1), (4, 77, 2), (6, 79, 2), (8, 81, 4), (12, 84, 4)]
PICK = [(10, 79, 1), (11, 81, 1), (12, 83, 1), (13, 79, 1), (14, 83, 1), (15, 86, 1)]


def music():
    lead, bass, arp, pad, drums = Loop(), Loop(), Loop(), Loop(), Loop()

    def bn(m, t0, dur, g):
        bass.put(S.bass(m, dur), t0, g)

    def octaves(bar, root, g0, g1, iv=(0, 12, 0, 12, 0, 12, 7, 12)):
        for k, v in enumerate(iv):
            bn(root + v, bt(bar) + k * 0.25, 0.2, g0 if k % 2 == 0 else g1)

    octaves(0, 36, 0.62, 0.45)                                         # bar 0: landing on the dish
    octaves(1, 33, 0.78, 0.56)                                         # bar 1: the streak, racing
    bn(29, bt(2), 1.85, 0.4)                                           # bar 2: one long F under the dive
    bn(29, bt(3), 1.85, 0.34)                                          # bar 3: calm
    for k in range(4):                                                 # bar 4: G quarters
        bn(31, bt(4, k), 0.42, 0.55)
    for k in range(4):                                                 # bar 5: A eighths, then G sixteenths
        bn(33 + 12 * (k % 2), bt(5) + k * 0.25, 0.2, 0.6)
    for k in range(8):
        bn(31 + 12 * (k % 2), bt(5, 2) + k * B16, 0.1, 0.5 + 0.03 * k)
    octaves(6, 36, 0.85, 0.62)                                         # bar 6: the drop
    for k in range(8):                                                 # bar 7: Am, then F
        bn((33 if k < 4 else 29) + 12 * (k % 2), bt(7) + k * 0.25, 0.2, 0.58)
    for k in range(8):                                                 # bar 8: walking across the bench
        bn((29, 41, 36, 41, 29, 41, 33, 36)[k], bt(8) + k * 0.25, 0.2, 0.5)
    for k in range(8):                                                 # bar 9: G, building into bar 0
        bn(31 + 12 * (k % 2), bt(9) + k * 0.25, 0.2, 0.45 + 0.04 * k)

    def phrase(bar, notes, g=0.34, duty=0.25):
        for slot, m, ln in notes:
            lead.put(S.lead(m, ln * B16 * 0.9, duty=duty), bt(bar) + slot * B16, g)
    phrase(0, CALL, 0.28)
    phrase(1, HOOK, 0.34)
    phrase(6, DROP, 0.36, 0.125)
    phrase(7, HOLD, 0.3)
    phrase(8, WALK, 0.22, 0.5)
    phrase(9, PICK, 0.3)

    def arp_bar(bar, chord, g, half=None):
        tones = TONES[chord]
        for k in range(16):
            if half == 0 and k >= 8 or half == 1 and k < 8:
                continue
            m = tones[k % 3] + 12 + 12 * ((k // 3) % 2)
            arp.put(S.chip_arp(m, B16 * 0.8), bt(bar) + k * B16, g, -0.45 + 0.3 * (k % 4))
    arp_bar(0, 'C', 0.06)
    arp_bar(1, 'Am', 0.07)
    arp_bar(6, 'C', 0.12)
    arp_bar(7, 'Am', 0.1, 0)
    arp_bar(7, 'F', 0.1, 1)
    arp_bar(8, 'F', 0.05)
    arp_bar(9, 'G', 0.06)

    for bar, ch in ((2, 'F'), (3, 'F'), (4, 'G'), (8, 'F'), (9, 'G')):
        pad.put(S.pad([m + 12 for m in TONES[ch]], T.BAR - 0.25, 0.35), bt(bar), 0.24)
    pad.put(S.pad([m + 12 for m in TONES['Am']], 0.95, 0.15), bt(5), 0.22)
    pad.put(S.pad([m + 12 for m in TONES['G']], 0.85, 0.15), bt(5, 2), 0.24)

    def kick(t, g=1.0):
        drums.put(S.kick(), t, 0.8 * g)

    def snare(t, g=1.0):
        drums.put(S.snare(), t, 0.48 * g)

    def hat(t, g=1.0, op=False):
        drums.put(S.hat(op), t, 0.24 * g, 0.25)

    kick(bt(0), 0.8)                                                   # bar 0: the groove is already going
    kick(bt(0, 2), 0.8)
    snare(bt(0, 3), 0.6)
    for k in range(8):
        hat(bt(0) + k * 0.25, 0.6 if k % 2 else 0.85)
    for k in range(4):                                                 # bar 1: racing
        kick(bt(1, k), 0.95)
    snare(bt(1, 1), 0.7)
    snare(bt(1, 3), 0.7)
    for k in range(16):
        hat(bt(1) + k * B16, 0.45 + 0.25 * (k % 2 == 0))
    for k in range(4):                                                 # bar 4: four on the floor, growing
        kick(bt(4, k), 0.55 + 0.1 * k)
    for k in range(4, 8):
        hat(bt(4) + k * 0.25, 0.55)
    for k in range(4):                                                 # bar 5: the roll into the drop
        kick(bt(5, k), 0.9)
    snare(bt(5, 1), 0.6)
    for k in range(8):
        snare(bt(5, 2) + k * B16, 0.35 + 0.05 * k)
    for k in range(7):
        hat(bt(5) + k * 0.25, 0.5)
    drums.put(S.crash(1.8), bt(6), 0.42)                               # bar 6: the drop
    for bar in (6, 7):
        g = 1.0 if bar == 6 else 0.8
        kick(bt(bar), g)
        kick(bt(bar, 2), g)
        snare(bt(bar, 1), 0.8 * g)
        snare(bt(bar, 3), 0.8 * g)
        for k in range(8):
            hat(bt(bar) + k * 0.25, (0.8 if k % 2 else 1.0) * g, op=(k == 7))
    for bar in (8, 9):                                                 # bars 8-9: a light groove under the pan
        kick(bt(bar), 0.7)
        kick(bt(bar, 2), 0.6)
        for k in range(8):
            hat(bt(bar) + k * 0.25, 0.4 + 0.2 * (k % 2))
    snare(bt(8, 1), 0.45)
    snare(bt(8, 3), 0.45)
    for k in range(4):                                                 # fill into the loop
        snare(bt(9, 2) + k * 0.125, 0.35 + 0.07 * k)
    for k, m in enumerate((50, 47, 45, 43)):
        drums.put(S.tom(m), bt(9, 3) + k * 0.125, 0.3)

    lx = circular(lambda x: np.stack([x[0] + S.echo(x[0], 0.375, 0.28), x[1] + S.echo(x[1], 0.375, 0.28)]), lead.x)
    pd = circular(lambda x: np.stack([S.lowpass(x[0], 2600, 127), S.lowpass(x[1], 2600, 127)]), pad.x)
    return 0.9 * lx + 1.0 * bass.x + 0.9 * arp.x + 0.7 * pd + 1.0 * drums.x


# ------------------------------------------------------------------ effects
SCALE = [72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96, 98]


def _shff():
    """The cotton dragging over the gel: soft, papery, a little brighter where the streak turns."""
    dur = T.SW1 - T.SW0 + 0.12
    y = S.bandnoise(dur, lambda x: 2100 + 700 * np.abs(np.cos(3 * math.pi * (x / dur))), 0.9, 3)
    n = len(y)
    grain = S.lowpass(S.white(n, 31), 45, 255)
    grain = grain / (np.abs(grain).max() + 1e-9)
    body = S.bandnoise(dur, lambda x: 700 + 0 * x, 0.6, 4)
    ramp = np.clip(np.arange(n) / SR / T.SW_ACC, 0.25, 1.0)          # it starts slow, then drags at full speed
    out = (0.8 * y + 0.35 * body) * (0.72 + 0.28 * grain) * ramp
    return out * env(n, 0.04, 0.2)


def _bench(fx):
    """The lab bench, heard where it is seen."""
    n = NL + int(0.5 * SR)
    tt = np.arange(n) / SR
    # Bunsen burner: a soft roar that breathes with the flame
    bx, by = PR.BURNER
    g, pn = proximity(bx, by)
    fl = (1 + 0.10 * np.sin(2 * math.pi * 7 * tt) + 0.07 * np.sin(2 * math.pi * 11 * tt + 1.3)
          + 0.05 * np.sin(2 * math.pi * 17 * tt + 0.4))
    roar = (S.bandnoise(n / SR, lambda x: 900 + 0 * x, 1.3, 61) + 0.8 * S.bandnoise(n / SR, lambda x: 150 + 0 * x, 0.8, 62))
    put_bed(fx, roar * fl * 0.5, 0.75 * g, pn)
    # magnetic stirrer: mains hum, the bar's whirr (twice a turn, 3 turns a second), a little swish
    sx_, sy_ = next((x, y) for f, x, y, *_ in PR.PROPS if f is PR.stirrer)
    g, pn = proximity(sx_, sy_)
    hum = 0.5 * np.sin(2 * math.pi * 100 * tt) + 0.25 * np.sin(2 * math.pi * 200 * tt) + 0.1 * np.sin(2 * math.pi * 300 * tt)
    whirr = S.bandnoise(n / SR, lambda x: 380 + 0 * x, 0.6, 63) * (0.55 + 0.45 * np.sin(2 * math.pi * 6 * tt) ** 2)
    swish = S.bandnoise(n / SR, lambda x: 1600 + 0 * x, 1.0, 64)
    put_bed(fx, 0.35 * hum + 0.6 * whirr + 0.25 * swish, 0.6 * g, pn)
    # the flask: a bloop whenever a bubble pops
    fx_, fy_ = next((x, y) for f, x, y, *_ in PR.PROPS if f is PR.flask)
    g, pn = proximity(fx_, fy_)
    for k in range(PR.BUBBLES):
        for m in range(int(T.TOTAL / PR.BUBBLE_PERIOD)):
            tp = (PR.bubble_born(k) + 1.0 + m * PR.BUBBLE_PERIOD) % T.TOTAL
            i = int(tp * SR) % NL
            if g[i] < 0.02:
                continue
            f0 = 420 + 260 * (k % 3)
            b = glide(f0, f0 * 2.6, 0.05) * S.env_exp(int(0.05 * SR), 0.012, 0.002)
            fx.put(b, tp, 0.3 * g[i], float(pn[i]))
    # the 37.0 display: a tiny tick every second, when its heater light comes on
    dx_, dy_ = next((x, y) for f, x, y, *_ in PR.PROPS if f is PR.display)
    g, pn = proximity(dx_, dy_)
    for sec in range(int(T.TOTAL)):
        i = int(sec * SR)
        if g[i] > 0.02:
            fx.put(S.click(80 + sec, 3200, 0.02), float(sec), 0.16 * g[i], float(pn[i]))
    # a quiet room: ventilation, only while we look at the bench
    tg = np.arange(0, T.TOTAL, 0.01)
    room_g = np.array([1 - T.S(T.camera(t).z, 5.0, 9.0) for t in tg])
    room_g = np.interp(np.arange(NL) / SR, tg, room_g, period=T.TOTAL)
    room = S.bandnoise(n / SR, lambda x: 260 + 0 * x, 1.6, 65)
    put_bed(fx, room, 0.12 * room_g, np.zeros(NL))


def sfx():
    fx, sp = Loop(), Loop()                       # sp: sparkles, sent through a reverb
    _bench(fx)
    # ---- the swab comes in and lands; the streak; glints that blink out
    fx.put(S.whoosh(1.5, 2600, 650, 21, 0.8, 0.75), T.ENTER, 0.11, 0.35, -0.1)
    tf = S.bandnoise(0.07, lambda x: 900 + 0 * x, 0.7, 18) * env(int(0.07 * SR), 0.004, 0.05)
    fx.put(tf, T.SW0, 0.09)
    fx.put(S.thump(120, 60, 0.14, 0.1, 19), T.SW0, 0.12)
    fx.put(_shff(), T.SW0, 0.24, -0.15)
    rng = np.random.default_rng(17)
    for gi in range(len(T.GLINTS)):
        m = int(rng.choice([96, 98, 100, 103, 105, 108]))
        sp.put(S.glass_ping(S.mtof(m), 0.3, gi), T.glint_end(gi), 0.035 + 0.03 * T.GLINTS[gi, 4],
               float(rng.uniform(-0.5, 0.5)))
    fx.put(S.thump(150, 70, 0.18, 0.1, 5), T.SW1, 0.12)                # the swab lifts off
    # ---- the dive and the lock-on
    fx.put(S.whoosh(1.6, 280, 2600, 5, 0.8, 0.85), T.LOCK - 1.6, 0.2)
    for tb in (T.LOCK - 0.33, T.LOCK - 0.21):
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
    c0 = T.CYC0
    d = 1.45
    st = glide(349.2, 523.3, d, 'tri', vib=0.25) * env(int(d * SR), 0.35, 0.3)
    fx.put(st, c0, 0.07)
    for t0 in (c0 + 0.45, c0 + 0.75, c0 + 1.05):
        fx.put(S.blip(S.mtof(91), S.mtof(91), 0.05, 0.25), t0, 0.05, -0.3)
        fx.put(S.blip(S.mtof(95), S.mtof(95), 0.05, 0.25), t0 + 0.1, 0.05, 0.3)
    pc = glide(784, 1047, 0.5, 'pulse', 0.125) * env(int(0.5 * SR), 0.1, 0.08)
    pc *= 0.7 + 0.3 * np.sin(2 * math.pi * 18 * np.arange(len(pc)) / SR)
    fx.put(pc, c0 + 1.45, 0.045)
    # ---- every division: a tick, climbing the scale, then a roll
    for k, td in enumerate(T.DIV):
        m = SCALE[k] if k < len(SCALE) else (96 if k % 2 == 0 else 91)
        f = S.mtof(m)
        fx.put(S.blip(f, f * 1.25, 0.05, 0.25), td, 0.16 + 0.004 * k, -0.2 + 0.4 * (k % 2))
        fx.put(S.click(k, 4000, 0.02), td, 0.05 + 0.002 * k)
    fx.put(S.boing(260, 0.2), T.DIV[0], 0.08)                          # the first split: a little pop
    # ---- the riser, overnight, the drop
    fx.put(S.whoosh(1.0, 400, 7000, 9, 0.8, 0.98), 10.95, 0.24)
    rz = glide(523, 2093, 0.95, 'pulse', 0.25) * env(int(0.95 * SR), 0.2, 0.02)
    fx.put(rz, 10.98, 0.035)
    sp.put(S.bell(91, 1.0), T.OVERNIGHT + 0.005, 0.1)
    for m in (60, 64, 67, 72, 76, 79):
        n = int(0.7 * SR)
        fx.put(S.pulse(S.mtof(m), n, 0.5) * S.env_exp(n, 0.22, 0.002), T.POP0, 0.05)
    sp.put(S.bell(84, 1.4), T.POP0, 0.16)
    fx.put(S.thump(130, 42, 0.6, 0.4, 8), T.POP0, 0.42)
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
    # ---- the hold: a light sweep, the counter goes away; then the pan sets off
    for k, m in enumerate((84, 86, 88, 91, 93, 96, 98, 100)):
        sp.put(S.glass_ping(S.mtof(m), 0.45, 70 + k), 14.0 + k * B16 * 0.9, 0.035, -0.6 + 0.17 * k)
    fx.put(S.whoosh(0.9, 3000, 9000, 11, 0.8, 0.5), 14.0, 0.05)
    fx.put(S.blip(1200, 500, 0.08, 0.25), 15.6, 0.05)
    fx.put(S.whoosh(1.6, 300, 1100, 23, 0.9, 0.6), T.PAN0, 0.06, -0.3, 0.3)

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
