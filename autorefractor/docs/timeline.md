# Editing timeline (exactly 63.000 s)

The engine assembles the film in one pass (`engine/film.js`): 21 scenes of exactly 3.000 s. Delivery is 30 fps (1890 frames); the engine is time-based, so `--fps 60` renders the same film in 3780 frames.

- **Transitions.** Three kinds only, all in the engine:
  - *match cut*: the next scene starts on the frame the last one ended on;
  - *continuous*: no cut at all — scenes 3–9 are one camera move through the cutaway, scenes 15–18 one continuous screen;
  - *dissolve*: an ordered-dither dissolve from the last frame of the previous scene (0.4–0.5 s). There are no hard cuts.
- **Captions.** The editor layer (`engine/lib/cap.js`): one caption at a time, top centre (cap-top at y = 300 px of 1920, below the platform's top interface), typed on in about 0.3 s, held to 2.7 s, gone before the last frame of the scene. Small labels sit next to what they name. Nothing is written below y = 1500 px or in the right-hand control strip. `--notext` renders the clean version; `docs/labels.srt` has every label with its times.
- **Audio.** `mix.wav` under the picture (or `mix_notext.wav` under the clean one). For narration use `mix_vo.wav`, or `music.wav` and `sfx.wav` as separate tracks. All stems are exactly 63.000 s.

| # | In (s) | Out (s) | Scene | Transition in | Camera | Caption | Music |
|---|---|---|---|---|---|---|---|
| 1 | 00.00 | 03.00 | `s01_balloon` | the loop: identical to the last frame | pull out | Why THIS balloon? | curious opening motif |
| 2 | 03.00 | 06.00 | `s02_exam` | match cut (the same aperture on black) | pull out | An eye test | curious opening motif |
| 3 | 06.00 | 09.00 | `s03_gaze` | dissolve 0.50 s | hold | Steady gaze | light rhythmic development |
| 4 | 09.00 | 12.00 | `s04_fog` | none: one continuous shot | slow push | Relax focusing | light rhythmic development |
| 5 | 12.00 | 15.00 | `s05_infrared` | none: one continuous shot | track / pan / orbit | Invisible infrared | light rhythmic development |
| 6 | 15.00 | 18.00 | `s06_front` | none: one continuous shot | track / pan / orbit | Into the eye | smooth forward motion |
| 7 | 18.00 | 21.00 | `s07_bend` | none: one continuous shot | pull out | The eye bends light | smooth forward motion |
| 8 | 21.00 | 24.00 | `s08_return` | none: one continuous shot | hold | Some light returns | smooth forward motion |
| 9 | 24.00 | 27.00 | `s09_sensor` | none: one continuous shot | track / pan / orbit | Back to the sensor | smooth forward motion |
| 10 | 27.00 | 30.00 | `s10_pattern` | match cut (the sensor, edge-on, then turning) | slow push | A measurement pattern | smooth forward motion |
| 11 | 30.00 | 33.00 | `s11_charge` | dissolve 0.45 s | hold | Light → charge | small satisfying electronic details |
| 12 | 33.00 | 36.00 | `s12_data` | dissolve 0.40 s | pull out | Charge → data | small satisfying electronic details |
| 13 | 36.00 | 39.00 | `s13_focus` | dissolve 0.40 s | hold | Where does light focus? | build anticipation |
| 14 | 39.00 | 42.00 | `s14_astig` | dissolve 0.40 s | track / pan / orbit | Astigmatism | build anticipation |
| 15 | 42.00 | 45.00 | `s15_analyze` | dissolve 0.40 s | hold | Analyze the pattern | build anticipation |
| 16 | 45.00 | 48.00 | `s16_repeat` | none: the image shrinks in place | pull out | Repeat and check | build anticipation |
| 17 | 48.00 | 51.00 | `s17_numbers` | none: the same panel | hold | Estimated refraction | clear payoff |
| 18 | 51.00 | 54.00 | `s18_print` | none: the view slides down | track / pan / orbit | A starting estimate | clear payoff |
| 19 | 54.00 | 57.00 | `s19_both` | dissolve 0.50 s | hold | Your gaze. Its measurement. | return to the opening texture |
| 20 | 57.00 | 60.00 | `s20_return` | dissolve 0.50 s | slow push | — | return to the opening texture |
| 21 | 60.00 | 63.00 | `s21_loop` | match cut (the same aperture on black) | hold | — | return to the opening texture |

The loop: see `loop.md`.
