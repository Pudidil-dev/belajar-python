"""Master the offline Web Audio render for delivery.

    python3 tools/master.py build/audio_raw.f32 build/audio.wav

Input: raw float32 interleaved stereo, 48 kHz. Output: 32-bit float WAV.
Targets: integrated loudness -15.0 LUFS (ITU-R BS.1770-4 gating),
true peak <= -1.6 dBTP before AAC encoding (4x oversampled detection).
"""
import math
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, minimum_filter1d

SR = 48000
TARGET_LUFS = -15.0
CEIL_DBTP = -1.6


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


def limiter(x, ceil_db):
    ceil = 10 ** (ceil_db / 20)
    up = signal.resample_poly(x, 4, 1, axis=0)
    env = np.max(np.abs(up), axis=1)[:len(x) * 4].reshape(-1, 4).max(axis=1)
    look = int(0.002 * SR)
    pk = maximum_filter1d(env, size=2 * look + 1)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    g = minimum_filter1d(g, size=int(0.006 * SR))
    a = math.exp(-1.0 / (0.08 * SR))
    gs = signal.lfilter([1 - a], [1, -a], g)
    gs = np.minimum(gs, g)
    return x * gs[:, None]


def main(src, dst):
    x = np.fromfile(src, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    n = len(x)
    pad = SR  # the film loops: filter circularly so the end flows into the start
    bh, ah = signal.butter(2, 20 / (SR / 2), 'highpass')          # DC / sub-sonic blocker
    x = signal.filtfilt(bh, ah, np.concatenate([x[-pad:], x, x[:pad]]), axis=0)[pad:pad + n]
    print(f"raw: {len(x) / SR:.3f} s, {lufs(x):.2f} LUFS, TP {true_peak_db(x):.2f} dBTP")
    gain_db = TARGET_LUFS - lufs(x)
    y = x
    lim = lambda z: limiter(np.concatenate([z[-pad:], z, z[:pad]]), CEIL_DBTP - 0.15)[pad:pad + n]
    for _ in range(4):
        y = lim(x * 10 ** (gain_db / 20))
        err = TARGET_LUFS - lufs(y)
        if abs(err) < 0.05:
            break
        gain_db += err
    # final safety: the limiter output must sit under the ceiling after oversampling
    tp = true_peak_db(y)
    if tp > CEIL_DBTP:
        y *= 10 ** ((CEIL_DBTP - tp) / 20)
    # 3 ms fades at both ends (no click on first play; the loop seam stays near-seamless)
    f = int(0.003 * SR)
    y[:f] *= np.linspace(0, 1, f)[:, None]
    y[-f:] *= np.linspace(1, 0, f)[:, None]
    print(f"mastered: {lufs(y):.2f} LUFS, TP {true_peak_db(y):.2f} dBTP, gain {gain_db:+.2f} dB")
    wavfile.write(dst, SR, y.astype(np.float32))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
