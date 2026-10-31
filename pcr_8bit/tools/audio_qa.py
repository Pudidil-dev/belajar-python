"""Audio QA: level arc per bar, frequency balance, loop seam, and how loud each SFX
sits against the music in its strongest octave band (from the two stems).
    python3 tools/audio_qa.py build/qa build/audio.wav
"""
import sys, json, numpy as np
from scipy import signal
from scipy.io import wavfile
SR, BAR = 48000, 2.0
qa, wav = sys.argv[1], sys.argv[2]
db = lambda v: 20 * np.log10(np.sqrt(np.mean(np.asarray(v) ** 2)) + 1e-12)
sr, x = wavfile.read(wav); x = x.astype(np.float64); m = x.mean(axis=1)
print('mastered: %.3f s' % (len(m) / sr))
print('bars (dBFS RMS):', ' '.join('%d:%.1f' % (b + 1, db(m[int(b * BAR * sr):int((b + 1) * BAR * sr)])) for b in range(65)))
X = np.abs(np.fft.rfft(m)) ** 2; f = np.fft.rfftfreq(len(m), 1 / sr); tot = X.sum()
bands = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 24000)]
print('balance:', ' '.join('%d-%d:%.1f%%' % (a, b, 100 * X[(f >= a) & (f < b)].sum() / tot) for a, b in bands))
print('loop seam: wrap step %.4f vs median step %.4f' % (np.abs(x[0] - x[-1]).max(), np.median(np.abs(np.diff(x, axis=0)))))
s = np.fromfile(qa + '/stem_s.f32', dtype=np.float32).reshape(-1, 2).mean(axis=1).astype(np.float64)
mu = np.fromfile(qa + '/stem_m.f32', dtype=np.float32).reshape(-1, 2).mean(axis=1).astype(np.float64)
ev = json.load(open(qa + '/sfx_events.json'))
cent = [125, 250, 500, 1000, 2000, 4000, 8000]
bs = []
for c in cent:
    sos = signal.butter(4, [c / np.sqrt(2), min(c * np.sqrt(2), SR / 2 - 100)], btype='band', fs=SR, output='sos')
    bs.append((c, signal.sosfilt(sos, s), signal.sosfilt(sos, mu)))
res = {}
for e in ev:
    i0 = int(e['t'] * SR) % len(s); i1 = min(len(s), i0 + int(min(max(e['d'], 0.12), 0.5) * SR))
    if i1 - i0 < 100: continue
    best = max(((db(a[i0:i1]) - db(b[i0:i1]), c) for c, a, b in bs if db(a[i0:i1]) > -75), default=(-99, 0))
    res.setdefault(e['k'], []).append((best[0], best[1], e['t']))
allv = []
for k, v in sorted(res.items(), key=lambda kv: min(x[0] for x in kv[1])):
    mn = min(v); allv += [q[0] for q in v]
    print('%-9s n=%2d  best-band SFX-music %+6.1f dB mean, min %+6.1f dB (%d Hz at %6.2f s)' % (k, len(v), np.mean([q[0] for q in v]), mn[0], mn[1], mn[2]))
print('SFX cues %d, median %+.1f dB, within 6 dB of the music or louder: %d' % (len(allv), np.median(allv), sum(1 for q in allv if q >= -6)))
