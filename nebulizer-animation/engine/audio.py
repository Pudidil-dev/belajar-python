"""The soundtrack: an original 120 BPM chiptune loop (10 bars of 4/4 = exactly 20 s) and sound effects on the
picture's timeline, all synthesized in code (engine/synth.py), no samples, no missing files.

The loop is circular: every sound, echo and reverb tail that runs past 20 s wraps around to the start, so a
looping player never hears a seam and the opening inhale continues the last bar.

Score in G major, "breathing" form:
  bars 1-2  (0-4 s)   hook motif over G | D, the inhale and the rush in; a stop-time break leaves the 3.0 s "tik" alone
  bars 3-4  (4-8 s)   groove over Em | C under the mechanism (the mesh buzz sits under it)
  bar 5     (8-10 s)  build over Am -> D while the camera pushes into the holes
  bars 6-8  (10-16 s) the payoff theme over G | Em | C-D; the droplet pops land on every beat
  bars 9-10 (16-20 s) half-time float back out over Em-C | Am-D7, turning around into bar 1
"""
import math
import numpy as np
from . import synth as S
from . import timeline as T

SR = S.SR
NL = int(round(T.TOTAL * SR))
STEP = T.BEAT / 4                       # one 16th = 0.125 s


# ---------------------------------------------------------------- the circular bus
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

    def put_st(self, st, t, gain=1.0):
        s = int(round((t % T.TOTAL) * SR))
        self._add(0, st[0] * gain, s)
        self._add(1, st[1] * gain, s)


def circular(fn, x):
    """Run a causal process (filter, echo, reverb) as if the loop repeated forever."""
    x3 = np.concatenate([x, x, x], axis=-1)
    y = fn(x3)
    return y[..., NL:2 * NL]


def tv(n):
    return np.arange(n) / SR


# ---------------------------------------------------------------- the score
# (16th step, length in 16ths, MIDI note) per bar
LEAD = {
    0: [(0, 2, 79), (2, 1, 83), (3, 1, 86), (4, 3, 88), (7, 1, 86), (8, 2, 83), (10, 1, 81), (11, 1, 79),
        (12, 4, 81)],
    1: [(0, 2, 78), (2, 1, 81), (3, 1, 83), (4, 3, 86), (10, 1, 79), (11, 1, 81), (12, 1, 83), (13, 1, 86),
        (14, 2, 88)],
    2: [(0, 3, 83), (3, 1, 79), (4, 2, 76), (6, 2, 79), (8, 3, 83), (11, 1, 86), (12, 2, 88), (14, 2, 86)],
    3: [(0, 3, 84), (3, 1, 79), (4, 2, 76), (6, 2, 79), (8, 2, 84), (10, 2, 86), (12, 4, 88)],
    4: [(0, 6, 81), (6, 2, 84), (8, 6, 86), (14, 2, 90)],
    5: [(2, 1, 83), (3, 1, 86), (6, 2, 88), (10, 1, 86), (11, 1, 83), (14, 2, 81)],
    6: [(2, 1, 79), (3, 1, 83), (6, 2, 86), (10, 1, 83), (11, 1, 79), (14, 2, 76)],
    7: [(0, 2, 84), (2, 2, 88), (4, 4, 86), (8, 1, 90), (9, 1, 88), (10, 1, 86), (11, 1, 84), (12, 4, 81)],
    8: [(0, 2, 83), (2, 2, 79), (4, 4, 76), (8, 2, 79), (10, 2, 76), (12, 4, 72)],
    9: [(0, 2, 76), (2, 2, 79), (4, 4, 81), (8, 2, 78), (10, 1, 81), (11, 1, 84), (12, 2, 86), (14, 2, 84)],
}
# a third (or sixth) below in the payoff bars, on a thinner pulse
HARM = {
    5: [(2, 1, 79), (3, 1, 83), (6, 2, 84), (10, 1, 83), (11, 1, 79), (14, 2, 78)],
    6: [(2, 1, 76), (3, 1, 79), (6, 2, 83), (10, 1, 79), (11, 1, 76), (14, 2, 72)],
    7: [(0, 2, 79), (2, 2, 84), (4, 4, 81), (8, 1, 86), (9, 1, 84), (10, 1, 81), (11, 1, 81), (12, 4, 78)],
}
CHORD = {'G': (43, (0, 4, 7)), 'D': (38, (0, 4, 7)), 'Em': (40, (0, 3, 7)), 'C': (36, (0, 4, 7)),
         'Am': (45, (0, 3, 7)), 'D7': (38, (0, 4, 7, 10))}
BARS = [('G', 'G'), ('D', 'D'), ('Em', 'Em'), ('C', 'C'), ('Am', 'D'), ('G', 'G'), ('Em', 'Em'), ('C', 'D'),
        ('Em', 'C'), ('Am', 'D7')]
STOP = (1, 7, 10)            # bar 1: silence from 16th 7 to 10 (2.875-3.25 s) so the tik stands alone
BUILD, DROP, HERO_BAR = 4, 5, 7
FLOAT = (8, 9)


def bar_t(b, step=0.0):
    return b * T.BAR + step * STEP


def _in_stop(b, s):
    return b == STOP[0] and STOP[1] <= s < STOP[2]


def music():
    lead_bus, harm_bus, arp_bus, bass_bus, drum_bus, pad_bus = (Loop() for _ in range(6))
    # ---- melody (25 % pulse) and harmony (12.5 %)
    for b, notes in LEAD.items():
        for s, l, m in notes:
            dur = l * STEP * (0.9 if l <= 2 else 0.96)
            lead_bus.put(S.lead(m, dur, 0.25, vib=0.14), bar_t(b, s), 0.2, 0.06)
    for b, notes in HARM.items():
        for s, l, m in notes:
            harm_bus.put(S.lead(m, l * STEP * 0.9, 0.125, vib=0.08), bar_t(b, s), 0.1, -0.3)
    # ---- bass: NES triangle, bouncing root / octave in 8ths
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root, iv = CHORD[name]
            for k in range(4):
                s = half * 8 + k * 2
                if _in_stop(b, s) or _in_stop(b, s + 1):
                    continue
                if b == BUILD:                                   # driving 16ths, rising
                    for q in range(2):
                        m = root + (12 if (k + q) % 2 else 0)
                        bass_bus.put(S.bass(m, STEP * 0.7), bar_t(b, s + q), 0.3 * (0.6 + 0.4 * (half * 8 + k * 2) / 14))
                    continue
                if b in FLOAT and k % 2 == 1:
                    continue                                     # half-time float: fewer notes
                m = root + (12 if k % 2 else 0)
                if b == 9 and half == 1:                         # walk up D -> E -> F# -> (G on the loop)
                    m = root + (0, 2, 4, 5)[k]
                length = STEP * (3.6 if b in FLOAT else 1.6)
                bass_bus.put(S.bass(m, length), bar_t(b, s), 0.32)
        if b == STOP[0]:                                         # pickup after the break: A2 D3
            bass_bus.put(S.bass(45, STEP * 0.8), bar_t(b, 12), 0.3)
            bass_bus.put(S.bass(50, STEP * 1.6), bar_t(b, 14), 0.3)
    # ---- arpeggios (12.5 % pulse), quiet, left
    for b, (c1, c2) in enumerate(BARS):
        for half, name in ((0, c1), (1, c2)):
            root, iv = CHORD[name]
            tones = [root + 24 + i for i in iv[:3]] + [root + 36]
            for k in range(8):
                s = half * 8 + k
                if _in_stop(b, s):
                    continue
                if b == BUILD:                                   # riser: climbs through Am then D
                    climb = [69, 72, 76, 81, 84, 88, 93, 96] if half == 0 else [74, 78, 81, 86, 90, 93, 98, 102]
                    arp_bus.put(S.chip_arp(climb[k], STEP * 0.8, 0.25), bar_t(b, s), 0.04 + 0.05 * (s / 15), -0.45)
                    continue
                if b in (0, 1) and k % 2:
                    continue                                     # sparser under the hook
                if b in FLOAT and k % 2:
                    continue
                pat = [0, 1, 2, 3, 2, 1, 2, 3]
                arp_bus.put(S.chip_arp(tones[pat[k]], STEP * 0.85), bar_t(b, s), 0.05, -0.5)
    # ---- a soft pad under the float back out, and under the hook
    pad_bus.put(S.pad([64, 67, 71], 2.0), bar_t(8), 0.06)
    pad_bus.put(S.pad([60, 64, 67], 1.0), bar_t(8, 8), 0.06)
    pad_bus.put(S.pad([57, 60, 64], 1.0), bar_t(9), 0.06)
    pad_bus.put(S.pad([62, 66, 69, 72], 1.0), bar_t(9, 8), 0.06)
    # ---- drums: 8-bit kick, LFSR snare and hats
    K, Sn, Hc, Ho, C = S.kick(), S.snare(), S.hat(False), S.hat(True), S.crash()
    for b in range(T.BARS):
        t0 = bar_t(b)
        if b == BUILD:
            for k in (0, 4, 8, 12):
                drum_bus.put(K, t0 + k * STEP, 0.4)
            roll = [4, 8, 10, 12, 13, 14, 15]
            for i, k in enumerate(roll):
                drum_bus.put(S.snare(0.45 + 0.55 * i / len(roll)), t0 + k * STEP, 0.24, 0.08)
            continue
        if b in FLOAT:
            drum_bus.put(K, t0, 0.38)
            drum_bus.put(Sn, t0 + 8 * STEP, 0.22, 0.08)
            for k in range(0, 16, 2):
                drum_bus.put(Hc, t0 + k * STEP, 0.05 if k % 4 else 0.08, 0.3)
            if b == 9:                                           # little tom fill back into the loop
                for i, m in enumerate((55, 52, 48, 45)):
                    drum_bus.put(S.tom(m), t0 + (12 + i) * STEP, 0.22, 0.35 - 0.2 * i)
            continue
        kicks = (0, 8) if b in (0, 1) else (0, 6, 8)
        for k in kicks:
            if not _in_stop(b, k):
                drum_bus.put(K, t0 + k * STEP, 0.4)
        for k in (4, 12):
            if not _in_stop(b, k):
                drum_bus.put(Sn, t0 + k * STEP, 0.24, 0.08)
        for k in range(16):
            if _in_stop(b, k):
                continue
            if b in (0, 1) and k % 2:
                continue
            drum_bus.put(Hc, t0 + k * STEP, 0.09 if k % 4 == 2 else 0.04, 0.3)
        if b in (3, 6):
            drum_bus.put(Ho, t0 + 14 * STEP, 0.07, 0.3)
        if b == STOP[0]:                                         # the snare pickup after the tik
            drum_bus.put(S.snare(0.7), t0 + 10 * STEP, 0.18, 0.08)
            drum_bus.put(S.snare(0.85), t0 + 11 * STEP, 0.2, 0.08)
            drum_bus.put(K, t0 + 12 * STEP, 0.4)
        if b == DROP:
            drum_bus.put(C, t0, 0.15, 0.25)
        if b == HERO_BAR:
            drum_bus.put(C, T.HERO, 0.12, -0.25)
    # ---- mix the buses: SNES echo on the melody, a little room on everything
    lead_st = lead_bus.x + harm_bus.x
    mono = lead_st.sum(0) * 0.5
    dl = np.stack([circular(lambda v: S.echo(v, 0.375, 0.32), mono), circular(lambda v: S.echo(v, 0.25, 0.3), mono)])
    mus = lead_st + 0.4 * dl + arp_bus.x + bass_bus.x + drum_bus.x + pad_bus.x
    room = circular(lambda v: S.reverb(v, 1.1, 21), mus - 0.9 * bass_bus.x - 0.6 * drum_bus.x)
    return mus + 0.15 * room


# ---------------------------------------------------------------- sound effects
def breath(dur, f_lo, f_hi, seed, shape=1.5):
    y = S.bandnoise(dur, lambda tt: f_lo + (f_hi - f_lo) * np.sin(np.pi * np.clip(tt / dur, 0, 1)), 1.1, seed)
    u = tv(len(y)) / dur
    return y * np.sin(np.pi * np.clip(u, 0, 1)) ** shape


def hiss(dur, seed):
    """The mist: a soft high fsssh."""
    x = S.white(int(dur * SR), seed)
    y = S.highpass(x, 4200, 127)
    y = S.lowpass(y, 9500, 127)
    return y / (np.abs(y).max() + 1e-9)


def pop(f0, dur=0.07, duty=0.25):
    """Pixel pop: a pulse blip whose pitch drops fast, with a tiny click on the attack."""
    n = int(dur * SR)
    t = tv(n)
    f = f0 * (0.62 + 0.38 * np.exp(-t / 0.012))
    y = S.pulse(f, n, duty) * S.env_exp(n, dur / 3.2, 0.001)
    y[:int(0.002 * SR)] += S.click(3, 5000, 0.002)[:int(0.002 * SR)] * 0.6
    return y


def tik():
    """The first droplet: one crisp arcade tik (a square ping with a hard click), made to cut through silence."""
    n = int(0.09 * SR)
    t = tv(n)
    f = 2637.0 * (0.85 + 0.15 * np.exp(-t / 0.004))
    ping = S.pulse(f, n, 0.5) * np.exp(-t / 0.018)
    ck = S.highpass(S.white(n, 77), 3500, 63) * np.exp(-t / 0.0025)
    body = np.sin(2 * math.pi * 1318.5 * t) * np.exp(-t / 0.03) * 0.35
    y = 0.6 * ping + 0.8 * ck + body
    return y / np.abs(y).max()


def riser(dur, seed):
    """Quick rising arcade whoosh for the reverse zoom: noise sweep + a climbing square arpeggio."""
    nz = S.whoosh(dur, 350, 7200, seed, 0.75, 0.82)
    n = len(nz)
    t = tv(n)
    scale = [67, 71, 74, 79, 83, 86, 91, 95, 98, 103]
    idx = np.minimum((t / dur * len(scale) * 1.05).astype(int), len(scale) - 1)
    f = np.array([S.mtof(m) for m in scale])[idx]
    arp = S.pulse(f, n, 0.25) * (0.2 + 0.8 * (t / dur)) * np.clip((dur - t) / 0.05, 0, 1)
    return 0.8 * nz + 0.18 * arp


def faller(dur, seed):
    """Descending whoosh for the flight back out, with a gliding square that settles low."""
    nz = S.whoosh(dur, 6500, 520, seed, 0.85, 0.18)
    n = len(nz)
    t = tv(n)
    f = 1500 * (0.16 ** (t / dur)) * (1 + 0.012 * np.sin(2 * math.pi * 6 * t))
    gl = S.pulse(f, n, 0.125) * np.exp(-t / (dur * 0.45)) * np.minimum(1, t / 0.02)
    return 0.85 * nz + 0.12 * gl


def mesh_buzz():
    """The vibrating mesh under the music: a pulse whose rate is the visible vibration rate (it slows into slow
    motion as the camera pushes in), gated in 16ths with the drive glow; plus a faint piezo whine."""
    t = np.arange(NL) / SR
    tt = t[::240]
    rate = np.array([T.mu_rate(x) / T.CYCLE for x in tt])
    f = np.clip(np.interp(t, tt, rate) * 0.7, 6.0, 120.0)
    vis = np.clip((t - 4.2) / 0.4, 0, 1) * np.clip((9.9 - t) / 0.35, 0, 1)
    vis *= np.clip((f - 12.0) / 20.0, 0, 1)
    ph = np.cumsum(f) / SR
    buzz = S.pulse(f, NL, 0.3) * 0.7 + 0.3 * np.sin(2 * math.pi * ph * 2)
    buzz = S.lowpass(buzz, 1400, 127)
    gate = 0.65 + 0.35 * np.exp(-((t / STEP) % 1.0) * 4)
    whine = np.sin(2 * math.pi * 3150 * t) * (0.5 + 0.5 * np.sin(2 * math.pi * 8 * t)) * 0.08
    return (buzz * gate + whine) * vis


def sfx():
    bus = Loop()
    # ---- the patient breathing in (19.2 -> 20.8, across the loop) and the mist hiss in the mask
    bus.put(breath(1.6, 700, 1900, 1, 1.3), 19.2, 0.34, 0.15)
    bus.put(breath(1.6, 4200, 7200, 2, 1.6), 19.2, 0.12, 0.2)          # the light "fsssh" of the inhale
    ex = breath(1.4, 380, 900, 3, 1.2)
    bus.put(ex * np.clip(tv(len(ex)) / 0.5, 0, 1), 18.0, 0.18, 0.15)   # breathing out as we come back
    hs = hiss(4.0, 4)
    u = tv(len(hs))
    env = np.clip(u / 0.3, 0, 1) * np.clip((4.0 - u) / 1.4, 0, 1)
    bus.put(hs * env * (0.75 + 0.25 * np.sin(2 * math.pi * 0.5 * u)), 17.4, 0.085, 0.25)
    # ---- the reverse zoom: rising arcade whoosh, the pass through the outlet rim
    bus.put(riser(2.06, 5), T.HOLD_END, 0.44)
    for tr in T.rim_cross_times():
        if tr < T.LAND or tr > T.HERO:
            bus.put(S.thump(110, 46, 0.32, 0.25, 6), tr, 0.3)
            bus.put(S.bell(67, 0.6, 1.4, 2.0), tr, 0.05, -0.2)
    # ---- the first droplet pinches off: one crisp tik, alone on the beat, then the droplet zips away
    bus.put(tik(), T.LAND, 0.62)
    bus.put(S.blip(1760, 980, 0.07, 0.25), T.LAND + 0.07, 0.08, 0.35)
    # ---- ease back to the mechanism
    bus.put(S.whoosh(1.3, 5200, 420, 7, 0.8, 0.25), T.PULL[0], 0.17)
    # ---- the mesh buzz and the drive, the tag typing in
    bus.put(mesh_buzz(), 0.0, 0.05)                                    # ~8 dB under the music
    for i in range(len('VIBRATING MESH')):
        if 'VIBRATING MESH'[i] != ' ':
            bus.put(S.blip(2600 + 60 * (i % 3), 2200, 0.018, 0.5), T.LABEL[0] + i * 0.035, 0.035, 0.3)
    bus.put(S.bell(96, 0.5, 1.2, 2.0), T.LABEL[0] + 0.5, 0.05, 0.3)
    # ---- push into three holes
    bus.put(S.whoosh(1.2, 420, 4200, 8, 0.75, 0.8), T.PUSH[0], 0.18)
    # ---- droplets pinch off: staggered pixel pops on the beat (upper hole high, lower hole low)
    ev = T.events()
    notes = {-1: 86, 0: 83, 1: 79}
    for tp, k in ev['pops']:
        if abs(tp - T.HERO) < 0.01:
            continue
        bus.put(pop(S.mtof(notes[k])), tp, 0.16, 0.3 * k)
        bus.put(pop(S.mtof(notes[k] + 12), 0.035, 0.125), tp + 0.004, 0.05, 0.3 * k)
    # ---- the hero droplet: a brighter pop, a sparkle, then the long descending whoosh back out
    bus.put(pop(S.mtof(91), 0.09), T.HERO, 0.2)
    for i, m in enumerate((91, 95, 98, 103)):
        bus.put(S.bell(m, 0.6, 1.3, 2.0), T.HERO + 0.03 + i * 0.045, 0.05, -0.3 + 0.2 * i)
    bus.put(faller(4.3, 9), T.HERO + 0.1, 0.24)
    room = circular(lambda v: S.reverb(v, 0.9, 31), bus.x)
    return bus.x + 0.1 * room


# ---------------------------------------------------------------- master
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


def render(out_dir, log=print):
    from pathlib import Path
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    log('audio: score ...')
    mus = music()
    log('audio: effects ...')
    fx = sfx()
    mix = master(mus, fx)
    g = 10 ** ((-16.0 - S.lufs(mus)) / 20)
    S.write_wav(out / 'music.wav', np.clip(mus * g, -1, 1))
    gs = 10 ** ((-16.0 - S.lufs(fx)) / 20)
    S.write_wav(out / 'sfx.wav', np.clip(fx * gs, -1, 1))
    S.write_wav(out / 'mix.wav', mix)
    info = {'lufs': round(S.lufs(mix), 2), 'true_peak_db': round(S.true_peak(mix), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP, {mix.shape[1] / SR:.3f} s stereo")
    return out / 'mix.wav', info
