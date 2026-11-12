# Editing timeline (exactly 68.000 s, 2040 frames at 30 fps)

The engine assembles the film in one pass (`engine/film.js`). Every transition is inside its scene's time, as the brief requires:

- **continuous**: one camera move carries straight on (scenes 1–7, 15–16, 19–20);
- **dissolve**: an ordered-dither dissolve from the previous scene's last frame (0.12–0.5 s), used at every change of scale (8–14, 17, 18);
- no hard cuts and no added transition time.

- **Captions.** One at a time, top centre (art rows 60–124 of 480; nothing below row 452, nothing in the right-hand button strip). `--notext` renders the clean version; `labels.srt` has every caption with its times.
- **Audio.** `mix.wav` under the labeled picture, `mix_notext.wav` under the clean one; `mix_vo.wav` (or `music.wav` + `sfx.wav`) under a voice-over. All are exactly 68.000 s.

| # | In (s) | Out (s) | Frames | Scene | Transition in | Camera | Caption | Music |
|---|---|---|---|---|---|---|---|---|
| 1 | 00.00 | 02.00 | 0–59 | `s01_still` | the loop: frame 0 equals the last frame | slow push | During heart surgery | question |
| 2 | 02.00 | 04.00 | 60–119 | `s02_moving` | continuous (one camera) | track / pan | What keeps blood moving? | question |
| 3 | 04.00 | 06.00 | 120–179 | `s03_follow` | continuous | track / pan | — | question |
| 4 | 06.00 | 09.00 | 180–269 | `s04_machine` | continuous | pull out | Heart–lung machine | the machine |
| 5 | 09.00 | 12.00 | 270–359 | `s05_drain` | continuous | track / pan | Venous drainage | the machine |
| 6 | 12.00 | 15.00 | 360–449 | `s06_reservoir` | continuous | slow push | Reservoir | the machine |
| 7 | 15.00 | 19.00 | 450–569 | `s07_pump` | continuous | hold | Blood is pumped | the machine |
| 8 | 19.00 | 22.00 | 570–659 | `s08_temp` | dissolve 0.40 s | track / pan | Temperature control | its parts |
| 9 | 22.00 | 25.00 | 660–749 | `s09_oxygenator` | dissolve 0.40 s | slow push | Oxygenator | its parts |
| 10 | 25.00 | 29.00 | 750–869 | `s10_fiber` | dissolve 0.40 s | hold | — | its parts |
| 11 | 29.00 | 33.00 | 870–989 | `s11_diffuse` | dissolve 0.50 s | track / pan | Oxygen diffuses in | its parts |
| 12 | 33.00 | 37.00 | 990–1109 | `s12_rbc` | dissolve 0.30 s | slow push | Into the red blood cell | the microscopic world |
| 13 | 37.00 | 42.00 | 1110–1259 | `s13_hemoglobin` | dissolve 0.25 s | hold | Hemoglobin carries oxygen | the microscopic world |
| 14 | 42.00 | 46.00 | 1260–1379 | `s14_co2` | dissolve 0.12 s | pull out | Carbon dioxide leaves | the binding |
| 15 | 46.00 | 49.00 | 1380–1469 | `s15_filter` | continuous | track / pan | Filter + monitoring | the way back |
| 16 | 49.00 | 52.00 | 1470–1559 | `s16_aorta` | continuous | track / pan | Back to the body | the way back |
| 17 | 52.00 | 56.00 | 1560–1679 | `s17_tissue` | dissolve 0.50 s | slow push | Oxygen delivered | the way back |
| 18 | 56.00 | 59.00 | 1680–1769 | `s18_perfusionist` | dissolve 0.50 s | hold | Continuously monitored | the team and the recap |
| 19 | 59.00 | 63.00 | 1770–1889 | `s19_system` | continuous | hold | Pump → Oxygenate → Return | the team and the recap |
| 20 | 63.00 | 68.00 | 1890–2039 | `s20_return` | continuous | slow push | — | the opening again |

Music grid: 120 BPM in 4/4, a bar every 2 s, 34 bars. The loop: see `loop.md`.
