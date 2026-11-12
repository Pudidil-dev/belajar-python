# Editing timeline (exactly 92.000 s, 2760 frames at 30 fps)

The engine assembles the film in one pass (`engine/film.js`). Every transition is inside its scene's time, as the brief requires:

- **continuous**: one camera move carries straight on (scenes 1–3, 5–9, 12, 18–19, 22, 24);
- **fold**: the view turns between above and the side, the first picture folding flat to a line and the second unfolding from it (S04, and inside S25);
- **dissolve**: an ordered-dither dissolve from the previous scene's last frame (0.12–0.5 s), used at every change of scale (10, 11, 13–17, 20, 21, 23);
- no hard cuts and no added transition time.

- **Captions.** The X-ray film's style: a small upper-case title top left with an accent bar and one context line under it (art rows 42–66 of 480), typed on at 40 characters/s and erased at 70 before the scene ends; part and particle labels on leader lines; numbered step badges in S05. Nothing below row 452 except the S08 strip, nothing in the right-hand button strip. `--notext` renders the clean version; `labels.srt` has every caption and label with its times.
- **Audio.** `mix.wav` under the labeled picture, `mix_notext.wav` under the clean one; `mix_vo.wav` (or `music.wav` + `sfx.wav`) under a voice-over. All are exactly 92.000 s.

| # | In (s) | Out (s) | Frames | Scene | Transition in | Camera | Caption | Music |
|---|---|---|---|---|---|---|---|---|
| 1 | 00.00 | 02.00 | 0–59 | `s01_still` | the loop: frame 0 equals the last frame | slow push | DURING HEART SURGERY | question |
| 2 | 02.00 | 04.00 | 60–119 | `s02_moving` | continuous | track / pan | (caption continues) | question |
| 3 | 04.00 | 06.00 | 120–179 | `s03_follow` | continuous | track / pan | — | question |
| 4 | 06.00 | 10.00 | 180–299 | `s04_machine` | the view turns (a fold from above to the side) | pull out | HEART–LUNG MACHINE | the machine |
| 5 | 10.00 | 18.00 | 300–539 | `s05_workflow` | continuous | track / pan | ONE LOOP, SEVEN STEPS | the workflow |
| 6 | 18.00 | 21.00 | 540–629 | `s06_drain` | continuous | track / pan | 1 · VENOUS DRAINAGE | drainage |
| 7 | 21.00 | 24.00 | 630–719 | `s07_reservoir` | continuous | slow push | 2 · RESERVOIR | drainage |
| 8 | 24.00 | 29.00 | 720–869 | `s08_pump` | continuous | hold | 3 · CENTRIFUGAL PUMP | the parts |
| 9 | 29.00 | 32.00 | 870–959 | `s09_heater` | continuous | track / pan | 4 · HEATER–COOLER | the parts |
| 10 | 32.00 | 35.00 | 960–1049 | `s10_exchanger` | dissolve 0.40 s | track / pan | HEAT EXCHANGER | the parts |
| 11 | 35.00 | 38.00 | 1050–1139 | `s11_gas` | dissolve 0.40 s | track / pan | 5 · GAS SUPPLY | gas and the oxygenator |
| 12 | 38.00 | 41.00 | 1140–1229 | `s12_oxygenator` | continuous | slow push | OXYGENATOR | gas and the oxygenator |
| 13 | 41.00 | 45.00 | 1230–1349 | `s13_fiber` | dissolve 0.40 s | hold | ONE HOLLOW FIBRE | gas and the oxygenator |
| 14 | 45.00 | 49.00 | 1350–1469 | `s14_diffuse` | dissolve 0.50 s | track / pan | OXYGEN DIFFUSES IN | one fibre |
| 15 | 49.00 | 53.00 | 1470–1589 | `s15_rbc` | dissolve 0.30 s | slow push | INTO A RED BLOOD CELL | the microscopic world |
| 16 | 53.00 | 58.00 | 1590–1739 | `s16_hemoglobin` | dissolve 0.25 s | hold | HEMOGLOBIN CARRIES OXYGEN | the microscopic world |
| 17 | 58.00 | 62.00 | 1740–1859 | `s17_co2` | dissolve 0.12 s | pull out | CARBON DIOXIDE LEAVES | the binding |
| 18 | 62.00 | 65.00 | 1860–1949 | `s18_filter` | continuous | track / pan | 6 · FILTER + BUBBLE DETECTOR | the way back |
| 19 | 65.00 | 68.00 | 1950–2039 | `s19_return` | continuous | track / pan | 7 · BACK TO THE BODY | the way back |
| 20 | 68.00 | 72.00 | 2040–2159 | `s20_tissue` | dissolve 0.50 s | slow push | OXYGEN DELIVERED | the way back |
| 21 | 72.00 | 76.00 | 2160–2279 | `s21_cardioplegia` | dissolve 0.50 s | track / pan | CARDIOPLEGIA | the other lines |
| 22 | 76.00 | 80.00 | 2280–2399 | `s22_suction` | continuous | pull out | SUCTION | the other lines |
| 23 | 80.00 | 83.00 | 2400–2489 | `s23_perfusionist` | dissolve 0.40 s | hold | PERFUSIONIST | the team and the whole loop |
| 24 | 83.00 | 87.00 | 2490–2609 | `s24_system` | continuous | pull out | THE WHOLE LOOP | the team and the whole loop |
| 25 | 87.00 | 92.00 | 2610–2759 | `s25_loop` | continuous, then the view turns back (a fold to above) | slow push | — | the opening again |

Music grid: 120 BPM in 4/4, a bar every 2 s, 46 bars. The loop: see `loop.md`.
