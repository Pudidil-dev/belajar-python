"""Original soundtrack: a 12-bar, 120 BPM chiptune in G major and the sound effects, synthesized from code (no
samples), mixed to stereo and mastered to -14 LUFS with a -1 dBTP ceiling.

Music: a short square-wave melody, a bouncy triangle bassline, light arcade drums. Chords G Em C D | G Em C D |
Em C D G (one bar = 2 s). The arrangement leaves room for the story sounds:
  bar 1     hats only, with a pocket on beat 3 for the bar landing ("tik" at 1.0 s)
  bar 2     the pour; a drum fill leads into the knob click on the downbeat of bar 3 (4.0 s)
  bars 3-6  the groove under the motor whirr; the music ducks for the first fizz (11.6 s)
  bars 7-10 bubbly arpeggios over the time-lapse, thinning as the fizz fades
  bar 11    a breakdown: the two-note chime (21.0 s) stands alone
  bar 12    the cadence home to G, ringing out to the end

Effects, built around "tik -> click -> whirr -> fizz -> ding": the glassy slide and glint, the landing tik, the
flask whooshes and the cloudy pour, the knob click and power beep, the pixel-wipe zips, the motor whirr (louder in
the cutaway), the bar snapping free and locking on, the vinegar pour, the fizz with tiny bubble pops (following the
real bubble timings) and the chime.
"""
import math
import numpy as np
from . import synth as S
from . import timeline as T

SR = S.SR
N = int(round(T.TOTAL * SR))


class Bus:
    """A stereo track exactly as long as the film."""

    def __init__(self):
        self.x = np.zeros((2, N))

    def put(self, sig, t, gain=1.0, pan=0.0):
        s = int(round(t * SR))
        if s >= N or len(sig) == 0:
            return
        sig = np.asarray(sig, float) * gain
        if s < 0:
            sig, s = sig[-s:], 0
        sig = sig[:N - s]
        a = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
        self.x[0, s:s + len(sig)] += sig * math.cos(a)
        self.x[1, s:s + len(sig)] += sig * math.sin(a)


def tv(n):
    return np.arange(n) / SR


# ------------------------------------------------------------------ music
CHORDS = ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D', 'Em', 'C', 'D', 'G']
ROOT = {'G': 43, 'Em': 40, 'C': 36, 'D': 38}                       # bass roots (G2, E2, C2, D2)
TONES = {'G': (67, 71, 74), 'Em': (64, 67, 71), 'C': (60, 64, 67), 'D': (62, 66, 69)}
# a one-bar motif per chord (8 eighths, None = rest), G major pentatonic + chord tones
MOTIF = {
    'G': [79, None, 83, 86, None, 83, 79, None],
    'Em': [88, None, 86, 83, None, 79, 81, None],
    'C': [84, None, 88, 91, None, 88, 84, 86],
    'D': [86, None, 81, 78, None, 81, 86, None],
}
E8 = T.BEAT / 2


def bar_t(b, eighth=0):
    return b * T.BAR + eighth * E8


def music():
    lead_b, bass_b, arp_b, drum_b = Bus(), Bus(), Bus(), Bus()
    for b, ch in enumerate(CHORDS):
        root = ROOT[ch]
        # ---- bass
        if b <= 1:                                               # intro: soft quarter notes
            for q in range(4):
                if b == 0 and q == 2:
                    continue                                     # pocket for the landing tik
                bass_b.put(S.bass(root, 0.3), bar_t(b, 2 * q), 0.55)
        elif b == 11:
            bass_b.put(S.bass(root, 1.4), bar_t(b), 0.8)
            bass_b.put(S.bass(root + 12, 0.25), bar_t(b, 7), 0.5)
        elif b == 10:
            for k in (0, 2, 3):                                  # breakdown: just a few bounces
                bass_b.put(S.bass(root + (12 if k % 2 else 0), 0.22), bar_t(b, k), 0.65)
            bass_b.put(S.bass(root + 7, 0.22), bar_t(b, 6), 0.6)
            bass_b.put(S.bass(root + 12, 0.22), bar_t(b, 7), 0.6)
        else:                                                    # bouncy octaves with a fifth at the end
            pat = [0, 12, 0, 12, 0, 12, 7, 12]
            for k, iv in enumerate(pat):
                bass_b.put(S.bass(root + iv, 0.2), bar_t(b, k), 0.75 if k % 2 == 0 else 0.55)
        # ---- lead melody (bars 3-10), the last phrase in bar 12
        if 2 <= b <= 9:
            mot = MOTIF[ch]
            up = 12 if b >= 6 and b % 2 == 0 else 0              # brighter answer phrases in the time-lapse
            for k, m in enumerate(mot):
                if m is None:
                    continue
                if b == 5 and k >= 6:
                    continue                                     # room for the first fizz
                nxt = next((j for j in range(k + 1, 8) if mot[j] is not None), 8)
                dur = (nxt - k) * E8 * 0.9
                lead_b.put(S.lead(m + up, dur, duty=0.25 if b < 6 else 0.125), bar_t(b, k), 0.42)
        if b == 11:
            for k, m in ((0, 79), (1, 83), (2, 86), (4, 91)):
                lead_b.put(S.lead(m, 0.22 if k < 4 else 1.2, duty=0.25), bar_t(b, k), 0.42)
        # ---- arpeggios (time-lapse bars 7-10): bubbly 16ths that thin out as the fizz fades
        if 6 <= b <= 9:
            tones = TONES[ch]
            keep = (1.0, 1.0, 0.75, 0.5)[b - 6]
            for k in range(16):
                if (k * 7 % 16) / 16.0 >= keep:
                    continue
                m = tones[(k * 2) % 3] + 12 + (12 if k % 4 == 3 else 0)
                arp_b.put(S.chip_arp(m, E8 / 2 * 0.8), bar_t(b) + k * E8 / 2, 0.16, -0.4 + 0.8 * ((k % 4) / 3))
        # ---- drums
        for k in range(8):
            t0 = bar_t(b, k)
            if b == 0:
                if k in (1, 3, 5, 7):
                    drum_b.put(S.hat(False, 0.5), t0, 0.22, 0.3)
                continue
            if b == 1:
                if k % 2 == 1:
                    drum_b.put(S.hat(False, 0.6), t0, 0.24, 0.3)
                if k == 0:
                    drum_b.put(S.kick(), t0, 0.5)
                continue
            if b == 10 and k < 4:
                continue                                         # breakdown: the chime stands alone
            if b == 11 and k > 0:
                continue
            if k in (0, 4):
                drum_b.put(S.kick(), t0, 0.8)
            if k in (2, 6) and b != 11:
                drum_b.put(S.snare(0.8), t0, 0.32, -0.1)
            drum_b.put(S.hat(k % 4 == 3, 0.7), t0, 0.2 if k % 2 else 0.14, 0.3)
        if b == 1:                                               # fill into the knob click
            for k, m in enumerate((47, 50, 52, 55)):
                drum_b.put(S.snare(0.5 + 0.12 * k), bar_t(1, 4) + k * E8, 0.18 + 0.04 * k, -0.2 + 0.13 * k)
        if b == 9:
            for k in range(4):
                drum_b.put(S.snare(0.5 + 0.1 * k), bar_t(9, 6) + k * E8 / 2, 0.16 + 0.03 * k)
        for k in range(8):                                     # double-time hats while time runs fast
            t1 = bar_t(b, k) + E8 / 2
            if T.TL_UP[1] <= t1 < T.TL_DOWN[0]:
                drum_b.put(S.hat(False, 0.5), t1, 0.12, -0.3)
    for t0, g in ((T.KNOB, 0.10), (T.WIPE_OUT[0], 0.09), (22.0, 0.13)):
        drum_b.put(S.crash(1.4), t0, g, 0.2)
    lead = lead_b.x
    lead = lead + 0.32 * np.stack([np.roll(S.echo(lead[0], 0.375, 0.3), 0), S.echo(lead[1], 0.375, 0.3)])
    mus = lead + 0.9 * bass_b.x + arp_b.x + drum_b.x
    # duck under the landing, the knob click, the first fizz and the chime so they stand out
    t = tv(N)
    duck = np.ones(N)
    for t0, depth, a, r in ((T.LAND, 0.45, 0.03, 0.25), (T.KNOB, 0.6, 0.02, 0.2), (T.FIZZ, 0.45, 0.05, 0.8),
                            (T.CHIME, 0.55, 0.02, 0.6)):
        e = np.where(t < t0 - a, 0.0, np.where(t < t0, (t - t0 + a) / a, np.exp(-(t - t0) / r)))
        duck *= 1 - (1 - depth) * e
    mus *= duck[None, :]
    # end: let the last chord ring, then fade the final 0.4 s
    fade = np.clip((T.TOTAL - t) / 0.4, 0, 1)
    return mus * fade[None, :]


# ------------------------------------------------------------------ effects
def tik():
    n = int(0.09 * SR)
    t = tv(n)
    y = S.pulse(2093.0 * (1 + 0.5 * np.exp(-t / 0.004)), n, 0.25) * np.exp(-t / 0.018)
    ck = S.click(3, 5200, 0.03)
    y[:len(ck)] += 0.8 * ck
    return y


def pour(dur, fc, seed, wet=1.0):
    y = S.bandnoise(dur, fc, 0.9, seed)
    t = tv(len(y))
    rng = np.random.default_rng(seed)
    lfo = np.interp(t, np.linspace(0, dur, int(dur * 14) + 2), rng.uniform(0.45, 1.0, int(dur * 14) + 2))
    env = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.25)
    gurgle = np.sin(2 * math.pi * np.cumsum(220 + 160 * lfo) / SR) * 0.25 * wet
    return (y * lfo + gurgle * lfo) * env


def whirr(t_arr):
    """The motor: a buzzy hum that rises with speed, with a 4 Hz magnet throb."""
    sp = np.array([T.motor_speed(x) for x in t_arr[::480]])
    sp = np.interp(np.arange(len(t_arr)), np.arange(0, len(t_arr), 480)[:len(sp)], sp)
    wf = np.array([T.warp_rate(x) for x in t_arr[::480]])
    wf = np.interp(np.arange(len(t_arr)), np.arange(0, len(t_arr), 480)[:len(wf)], wf)
    f = (55 + 95 * sp) * (1 + 0.55 * (wf - 1) / (T.TL_RATE - 1))
    ph = 2 * math.pi * np.cumsum(f) / SR
    y = 0.6 * np.sign(np.sin(ph)) * 0.5 + 0.4 * np.sin(2 * ph) + 0.25 * np.sin(3.01 * ph)
    y = S.lowpass(y, 1400, 127)
    throb = 0.75 + 0.25 * np.sin(2 * math.pi * 4.0 * t_arr)
    return y * sp * throb


def fizz(t_arr):
    """Carbon dioxide fizz: crackly high noise that follows the bubble rate."""
    rate = np.array([T.bubble_rate_seen(x) for x in t_arr[::240]])
    rate = np.interp(np.arange(len(t_arr)), np.arange(0, len(t_arr), 240)[:len(rate)], rate)
    nz = S.highpass(S.white(len(t_arr), 77), 3800, 63)
    rng = np.random.default_rng(78)
    crack = (rng.uniform(0, 1, len(t_arr)) < 0.0035 * np.clip(rate / 60, 0, 2)).astype(float)
    crack = S.highpass(crack * rng.uniform(0.5, 1, len(t_arr)), 2500, 31)
    amp = np.clip(rate / 150.0, 0, 1) ** 0.8
    return (0.35 * nz + 1.6 * crack) * amp


def chime_note(f, dur=0.5):
    n = int(dur * SR)
    t = tv(n)
    y = 0.6 * S.pulse(f, n, 0.25) * np.exp(-t / 0.16) + 0.8 * np.sin(2 * math.pi * f * t) * np.exp(-t / 0.35)
    y += 0.25 * np.sin(2 * math.pi * f * 2.0 * t) * np.exp(-t / 0.12)
    return y * np.minimum(1, t / 0.002)


def ui_sounds(bus, lang):
    from . import explain
    k = 0
    for t, kind in explain.typing_events(lang):
        if kind == 'type':
            f = (1046.5, 1174.7, 1318.5, 1174.7)[k % 4]
            bus.put(S.blip(f, f * 0.94, 0.016, 0.5), t, 0.035, 0.15)
            k += 1
        elif kind == 'open':
            bus.put(S.blip(1568.0, 1568.0, 0.03, 0.25), t, 0.045, -0.2)
            bus.put(S.blip(2093.0, 2093.0, 0.05, 0.25), t + 0.045, 0.045, 0.2)
        else:
            bus.put(S.blip(2637.0, 1760.0, 0.022, 0.5), t, 0.05, 0.3)


def sfx(info=True, lang='en'):
    bus = Bus()
    if info:
        ui_sounds(bus, lang)
    # ---- the hook: glassy slide, glint, landing tik, small bounce
    sl = S.bandnoise(T.FLOOR_HIT, lambda tt: 1700 + 1900 * tt / T.FLOOR_HIT, 0.5, 5)
    sl *= np.minimum(1, tv(len(sl)) / 0.04) * np.minimum(1, (T.FLOOR_HIT - tv(len(sl))) / 0.03)
    bus.put(sl, 0.0, 0.07, -0.35)
    bus.put(S.blip(1760, 1500, 0.04, 0.5), T.FLOOR_HIT, 0.16, -0.3)                     # tk
    sc = S.bandnoise(T.FLAT - T.FLOOR_HIT, lambda tt: 2600 - 900 * tt, 0.6, 6)
    bus.put(sc * np.minimum(1, tv(len(sc)) / 0.03), T.FLOOR_HIT + 0.02, 0.05, -0.2)
    bus.put(S.blip(1318, 1100, 0.05, 0.5), T.FLAT, 0.18, -0.1)                           # tok
    zp = S.blip(500, 2600, T.LAND - T.FLAT, 0.125)
    bus.put(zp * np.linspace(0.3, 1.0, len(zp)), T.FLAT + 0.01, 0.10)                  # the magnet pulls: zip
    bus.put(S.blip(3136, 4186, 0.12, 0.125), T.GLINT - 0.03, 0.12, -0.3)
    bus.put(tik(), T.LAND, 0.9)
    bus.put(tik()[:int(0.05 * SR)], T.LAND + 0.13, 0.3)
    # ---- the cloudy pour
    bus.put(S.whoosh(0.35, 500, 1600, 6, 0.8, 0.6), T.FLASK[0], 0.12, 0.5)
    bus.put(pour(T.POUR1[1] - T.POUR1[0] + 0.1, lambda tt: 700 + 300 * np.sin(tt * 7), 8), T.POUR1[0], 0.22, 0.3)
    bus.put(S.whoosh(0.4, 1400, 400, 7, 0.8, 0.4), T.FLASK[2] + 0.1, 0.1, 0.5)
    # ---- the knob click, the power beep, the wipe zip
    bus.put(S.click(11, 2600, 0.03), T.KNOB, 0.9)
    bus.put(S.thump(220, 90, 0.08, 0.4, 12), T.KNOB, 0.35)
    bus.put(S.blip(1318.5, 1318.5, 0.05, 0.5), T.KNOB + 0.06, 0.12)
    bus.put(S.blip(1975.5, 1975.5, 0.06, 0.5), T.KNOB + 0.12, 0.12)
    for k, (t0, up) in enumerate(((T.WIPE_IN[0], True), (T.WIPE_OUT[0], False))):
        dur = 0.45
        bus.put(S.whoosh(dur, 400 if up else 3000, 3000 if up else 400, 20 + k, 0.7, 0.7 if up else 0.3), t0, 0.16)
        for j in range(8):
            m = (72, 76, 79, 84, 88, 91, 96, 100)[j if up else 7 - j]
            bus.put(S.blip(S.mtof(m), S.mtof(m), 0.035, 0.125), t0 + j * dur / 8, 0.05, -0.6 + 0.15 * j)
    # ---- the motor whirr (louder while we can see it in the cutaway), the bar snapping free and locking on
    t_arr = T.MOTOR + tv(int((T.TOTAL - T.MOTOR) * SR))
    wr = whirr(t_arr)
    vis = np.where(t_arr < T.WIPE_IN[1], 0.7, np.where(t_arr < T.WIPE_OUT[0], 1.0,
                                                         np.where(t_arr < T.WIPE_OUT[1], 0.6, 0.38)))
    bus.put(wr * vis, T.MOTOR, 0.16)
    bus.put(S.click(31, 1800, 0.025), T.SNAP, 0.35, 0.1)
    # the zoom into the magnet and back out
    bus.put(S.whoosh(0.8, 300, 1800, 33, 0.7, 0.8), T.EXPLAIN[0], 0.10)
    bus.put(S.whoosh(0.85, 1800, 300, 34, 0.7, 0.3), T.EXPLAIN[2], 0.09)
    bus.put(S.thump(160, 70, 0.12, 0.3, 32), T.LOCK, 0.4)
    bus.put(S.blip(1568, 3136, 0.09, 0.25), T.LOCK + 0.02, 0.16)
    # ---- the vinegar
    bus.put(S.whoosh(0.35, 500, 1600, 40, 0.8, 0.6), T.BOTTLE[0], 0.12, -0.5)
    bus.put(pour(T.POUR2[1] - T.POUR2[0] + 0.1, lambda tt: 1500 + 400 * np.sin(tt * 9), 41, 0.4), T.POUR2[0],
            0.13, -0.3)
    bus.put(S.whoosh(0.4, 1400, 400, 42, 0.8, 0.4), T.BOTTLE[2] + 0.1, 0.1, -0.5)
    # ---- the fizz and the bubble pops (the same pop times the picture uses)
    t_arr = T.FIZZ + tv(int((T.TOTAL - T.FIZZ) * SR))
    burst = 1.0 + 1.2 * np.exp(-np.maximum(t_arr - T.FIZZ, 0) / 0.6)     # the first fizz pops out
    bus.put(fizz(t_arr) * burst, T.FIZZ, 0.42)
    rng = np.random.default_rng(90)
    last = -1.0
    scale = (84, 86, 88, 91, 93, 96, 98, 100)
    for tp in sorted(T.pop_times()):
        if tp - last < 0.045 or tp >= T.TOTAL:
            continue
        last = tp
        m = scale[int(rng.integers(0, len(scale)))]
        g = 0.10 if tp < 13.0 else 0.06
        bus.put(S.blip(S.mtof(m), S.mtof(m + 7), 0.03, 0.5), tp, g, rng.uniform(-0.5, 0.5))
    bus.put(S.blip(1046.5, 2093, 0.07, 0.25), T.FIZZ, 0.24)          # the playful "pop!" that starts the fizz
    # ---- the time-lapse: tape speeds up (rising sweep + arpeggio), later slows down
    bus.put(S.whoosh(0.55, 250, 4200, 50, 0.6, 0.85), T.TL_UP[0], 0.16)
    for j, m in enumerate((60, 64, 67, 72, 76, 79, 84, 88)):
        bus.put(S.blip(S.mtof(m), S.mtof(m), 0.04, 0.25), T.TL_UP[0] + j * 0.05, 0.06, -0.5 + 0.13 * j)
    n = int(0.5 * SR)
    tt = tv(n)
    down = S.pulse(900 * np.exp(-tt / 0.25) + 120, n, 0.25) * np.exp(-tt / 0.3) * np.minimum(1, tt / 0.01)
    bus.put(down, T.TL_DOWN[0] + 0.25, 0.07)
    bus.put(S.whoosh(0.5, 3500, 300, 51, 0.6, 0.2), T.TL_DOWN[0] + 0.2, 0.12)
    for j, m in enumerate((96, 100, 103, 108, 103, 108)):
        bus.put(S.blip(S.mtof(m), S.mtof(m), 0.05, 0.25), T.CHIME + 0.45 + j * 0.06, 0.035, -0.5 + 0.2 * j)
    # ---- the chime: two notes when the bar is back in clear view
    bus.put(chime_note(1567.98), T.CHIME, 0.28, -0.15)
    bus.put(chime_note(2349.32, 0.8), T.CHIME + 0.25, 0.28, 0.15)
    return bus.x


def master(mus, fx, target=-14.0):
    mix = 0.55 * mus + 1.25 * fx
    mix = np.stack([S.lowpass(mix[0], 15500, 127), S.lowpass(mix[1], 15500, 127)])
    ceiling = -1.6
    for _ in range(6):
        mix *= 10 ** ((target - S.lufs(mix)) / 20)
        mix = S.limiter(mix, ceiling)
        tp = S.true_peak(mix)
        if tp <= -1.0 and abs(S.lufs(mix) - target) < 0.15:
            break
        if tp > -1.0:
            ceiling -= (tp + 1.0) + 0.15
    k = int(0.02 * SR)
    mix[:, -k:] *= np.linspace(1, 0, k)[None, :]
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
    info = {'lufs': round(S.lufs(mix), 2), 'true_peak_db': round(S.true_peak(mix), 2)}
    log(f"audio: mix {info['lufs']} LUFS, true peak {info['true_peak_db']} dBTP, {mix.shape[1] / SR:.3f} s stereo")
    return out / 'mix.wav', info
