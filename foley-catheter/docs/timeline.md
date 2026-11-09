# Editing timeline (exactly 60.000 s, 60 fps)

The engine assembles the film in one pass (`engine/film.js`): 20 scenes of 3.000 s; a scene with an "in" value dissolves from the previous scene's last frame with an ordered dither. Labels are the editor layer (`engine/lib/cap.js`), absent from the clean version (`--notext`), and listed with times in `docs/labels.srt` for re-editing. Audio: `music.wav`, `sfx.wav`, `mix.wav` from `tools/synth_audio.py`.

| # | In (s) | Out (s) | Scene | Transition in | Camera | Label | Music |
|---|---|---|---|---|---|---|---|
| 1 | 00.00 | 03.00 | `s01_where` | cut | pull out | Where does this tube actually go? | curiosity and the destination |
| 2 | 03.00 | 06.00 | `s02_route` | cut | track / pan / orbit | Through the urethra | curiosity and the destination |
| 3 | 06.00 | 09.00 | `s03_balloon` | cut | cut | What keeps it there? | curiosity and the destination |
| 4 | 09.00 | 12.00 | `s04_retention` | dissolve 0.25 s | hold | Retention balloon | retention and the bedside |
| 5 | 12.00 | 15.00 | `s05_support` | dissolve 0.35 s | pull out | Supported outside, too | retention and the bedside |
| 6 | 15.00 | 18.00 | `s06_kidneys` | dissolve 0.30 s | track / pan / orbit | Urine reaches the bladder | retention and the bedside |
| 7 | 18.00 | 21.00 | `s07_question` | cut | slow push | How does urine get out? | the second question (18.5 s), the eye, the channels |
| 8 | 21.00 | 24.00 | `s08_eyes` | cut | track / pan / orbit | Drainage eyes | the second question (18.5 s), the eye, the channels |
| 9 | 24.00 | 27.00 | `s09_enter` | dissolve 0.30 s | slow push | Urine enters here | the second question (18.5 s), the eye, the channels |
| 10 | 27.00 | 30.00 | `s10_past` | dissolve 0.30 s | track / pan / orbit | An open channel through the shaft | the second question (18.5 s), the eye, the channels |
| 11 | 30.00 | 33.00 | `s11_channels` | dissolve 0.30 s | hold | One catheter. Two channels. | the second question (18.5 s), the eye, the channels |
| 12 | 33.00 | 36.00 | `s12_connection` | dissolve 0.30 s | track / pan / orbit | Separate balloon channel | ports, tubing, the bag |
| 13 | 36.00 | 39.00 | `s13_ports` | dissolve 0.30 s | hold | Drainage port / balloon valve | ports, tubing, the bag |
| 14 | 39.00 | 42.00 | `s14_line` | cut | track / pan / orbit | Continuous drainage path | ports, tubing, the bag |
| 15 | 42.00 | 45.00 | `s15_height` | dissolve 0.30 s | pull out | Bag below bladder level | ports, tubing, the bag |
| 16 | 45.00 | 48.00 | `s16_collect` | dissolve 0.30 s | slow push | Urine collects in the bag | ports, tubing, the bag |
| 17 | 48.00 | 51.00 | `s17_route` | dissolve 0.30 s | hold | From bladder to bag | recap and answer |
| 18 | 51.00 | 54.00 | `s18_compare` | dissolve 0.30 s | hold | Retention · Drainage | recap and answer |
| 19 | 54.00 | 57.00 | `s19_answer` | dissolve 0.30 s | pull out | To the bladder | recap and answer |
| 20 | 57.00 | 60.00 | `s20_loop` | dissolve 0.20 s | fast push (accent) | — | recap and answer |

Loop: S20 ends pushed into a catheter segment in the penile urethra (scale 16 px/mm); S01 starts on that exact frame and pulls back (`docs/frame_close.png` = `docs/frame_open.png`). The opening question returns 0.3 s after the loop point.
