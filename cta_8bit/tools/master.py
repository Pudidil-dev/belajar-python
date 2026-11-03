"""Master the three audio renders with ONE gain, so every variant keeps the same balance.

    python3 tools/master.py build

Reads   build/audio_full.f32   music + SFX (the cinematic mix)
        build/audio_music.f32  music only
        build/audio_sfx.f32    SFX only
(raw float32, interleaved stereo, 48 kHz, exactly 60.000 s) and writes 24-bit PCM WAVs
        build/audio_full.wav, build/audio_music.wav, build/audio_sfx.wav

Level: the full mix is set to -22.0 LUFS integrated (ITU-R BS.1770-4 gating), a quiet bed
that leaves room for a voiceover added later. The music-only and SFX-only renders get the
SAME gain (not their own normalisation), so they stay exactly as loud as they sit in the mix.
True peak stays at or below -2.0 dBTP (4x oversampled); at this level the safety limiter
normally does nothing (the script prints how much it reduced, if at all).

The film loops: filtering is circular and there are NO fades at the ends, so the last
sample flows into the first one with no click or dip at the loop point.
"""
import math
import sys
import wave

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d

SR = 48000
TARGET_LUFS = -22.0
CEIL_DBTP = -2.0
NAMES = ['full', 'music', 'sfx']


def k_weight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)


def lufs(x):
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    n = 1 + max(0, (len(y) - blk) // hop)
    z = np.array([np.mean(y[i * hop:i * hop + blk] ** 2, axis=0).sum() for i in range(n)])
    lk = -0.691 + 10 * np.log10(z + 1e-12)
    z1 = z[lk > -70]
    if len(z1) == 0:
        return -70.0
    rel = -0.691 + 10 * np.log10(z1.mean()) - 10
    z2 = z[lk > rel]
    return float(-0.691 + 10 * np.log10(z2.mean()))


def true_peak_db(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * math.log10(np.max(np.abs(up)) + 1e-12)


def gain_envelope(signals, ceil_db):
    """One look-ahead gain curve computed from the loudest of all signals (applied to all of them)."""
    ceil = 10 ** (ceil_db / 20)
    env = None
    for x in signals:
        up = signal.resample_poly(x, 4, 1, axis=0)
        e = np.max(np.abs(up), axis=1)[:len(x) * 4].reshape(-1, 4).max(axis=1)
        env = e if env is None else np.maximum(env, e)
    look = int(0.002 * SR)
    pk = maximum_filter1d(env, size=2 * look + 1)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    g = minimum_filter1d(g, size=int(0.006 * SR))
    a = math.exp(-1.0 / (0.08 * SR))
    gs = signal.lfilter([1 - a], [1, -a], g)
    return np.minimum(gs, g)


def write_wav24(path, y):
    q = np.clip(np.round(y * 8388607.0), -8388608, 8388607).astype('<i4')
    b = q.reshape(-1).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(b)


def main(build):
    pad = SR  # circular filtering: wrap one second of each end around the other
    bh, ah = signal.butter(2, 20 / (SR / 2), 'highpass')          # DC / sub-sonic blocker
    xs = {}
    for k in NAMES:
        x = np.fromfile(f'{build}/audio_{k}.f32', dtype=np.float32).reshape(-1, 2).astype(np.float64)
        n = len(x)
        xs[k] = signal.filtfilt(bh, ah, np.concatenate([x[-pad:], x, x[:pad]]), axis=0)[pad:pad + n]
    n = len(xs['full'])
    print(f"raw full mix: {n / SR:.3f} s, {lufs(xs['full']):.2f} LUFS, TP {true_peak_db(xs['full']):.2f} dBTP")
    gain_db = TARGET_LUFS - lufs(xs['full'])
    g = 10 ** (gain_db / 20)
    ys = {k: xs[k] * g for k in NAMES}
    wrap = lambda z: np.concatenate([z[-pad:], z, z[:pad]])
    env = gain_envelope([wrap(ys[k]) for k in NAMES], CEIL_DBTP - 0.15)[pad:pad + n]
    reduced = 20 * math.log10(max(1e-9, env.min()))
    for k in NAMES:
        ys[k] = ys[k] * env[:, None]
    worst = max(true_peak_db(ys[k]) for k in NAMES)
    if worst > CEIL_DBTP:
        trim = 10 ** ((CEIL_DBTP - worst) / 20)
        for k in NAMES:
            ys[k] *= trim
    print(f"common gain {gain_db:+.2f} dB, limiter max reduction {reduced:.2f} dB")
    for k in NAMES:
        y = ys[k]
        seam = np.abs(y[0] - y[-1]).max()
        med = np.median(np.abs(np.diff(y, axis=0)))
        print(f"  {k:5s}: {lufs(y):7.2f} LUFS, TP {true_peak_db(y):6.2f} dBTP, loop seam step {seam:.5f} (median step {med:.5f})")
        write_wav24(f'{build}/audio_{k}.wav', y)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else 'build')
