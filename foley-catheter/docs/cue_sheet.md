# Music and SFX cue sheet

Every effect comes from a cue the picture emits (`window.dumpCues()`), so it lands on its visual cause; soft interface sounds snap to the 16th grid when within 45 ms. Label sounds (`type`, `tag`) are left out of the *_notext stems.

## Music

| From | To | Section |
|---|---|---|
| 0 s | 9 s | curiosity and the destination: the opening motif on bell, the reveal chime on the balloon (6.4 s) |
| 9 s | 18 s | retention and the bedside: a soft pulse, pads open |
| 18 s | 33 s | the second question (18.5 s), the eye, the channels: light groove, glass arps, a held breath before the cross-section (30 s) |
| 33 s | 48 s | ports, tubing, the bag: steady; the completion tone on the bag (47 s) |
| 48 s | 60 s | recap and answer: the opening motif returns (54 s); the last bar leads into the first |

One chord per 3-s scene (Fmaj7 – Am7 – Cmaj7 – G6, looping); the 300 Hz – 3 kHz band is thinned in the music so a voice-over sits on top. Mix at −16 LUFS integrated, peak ≤ −1 dBFS.

## Cues

| Time (s) | Scene | Effect | Gain | Pan | Arg |
|---|---|---|---|---|---|
| 0.000 | s01_where | open_pull | 1 | 0 | 0.55 |
| 0.300 | s01_where | type | 0.4 | 0 |  |
| 0.550 | s01_where | curious | 0.8 | -0.2 | 0 |
| 1.050 | s01_where | curious | 0.7 | 0.2 | 1 |
| 1.300 | s01_where | glide | 0.5 | 0 | 1.7 |
| 3.100 | s02_route | glide | 0.8 | 0.2 | 2.4 |
| 3.300 | s02_route | type | 0.4 | 0 |  |
| 4.200 | s02_route | curve_tick | 0.5 | 0.1 |  |
| 5.200 | s02_route | arrive | 0.7 | 0 |  |
| 6.000 | s03_balloon | cut_soft | 0.6 | 0 |  |
| 6.400 | s03_balloon | reveal_chime | 1 | 0 |  |
| 6.600 | s03_balloon | type | 0.4 | 0 |  |
| 9.300 | s04_retention | type | 0.4 | 0 |  |
| 9.600 | s04_retention | measure | 0.7 | -0.2 | 0 |
| 10.300 | s04_retention | measure | 0.6 | 0.2 | 1 |
| 12.000 | s05_support | whoosh_out | 0.7 | 0 | 2.1 |
| 12.500 | s05_support | type | 0.4 | 0 |  |
| 14.200 | s05_support | settle | 0.5 | 0.3 |  |
| 15.000 | s06_kidneys | flow_bed | 0.6 | 0 | 3 |
| 15.300 | s06_kidneys | type | 0.4 | 0 |  |
| 15.500 | s06_kidneys | drip | 0.4 | -0.4 | 0 |
| 16.000 | s06_kidneys | drip | 0.4 | 0.4 | 1 |
| 16.500 | s06_kidneys | drip | 0.4 | -0.3 | 2 |
| 17.250 | s06_kidneys | return_soft | 0.6 | 0 |  |
| 18.300 | s07_question | type | 0.4 | 0 |  |
| 18.300 | s07_question | push_soft | 0.6 | 0 | 2.2 |
| 18.500 | s07_question | curious2 | 0.8 | 0.1 |  |
| 19.600 | s07_question | ring | 0.5 | -0.2 |  |
| 21.000 | s08_eyes | cut_soft | 0.5 | 0 |  |
| 21.200 | s08_eyes | orbit | 0.5 | 0 | 2.7 |
| 21.300 | s08_eyes | type | 0.4 | 0 |  |
| 21.600 | s08_eyes | id_click | 0.6 | -0.4 | 0 |
| 23.200 | s08_eyes | id_click | 0.6 | 0.4 | 1 |
| 24.000 | s09_enter | section_open | 0.6 | 0 |  |
| 24.300 | s09_enter | type | 0.4 | 0 |  |
| 24.400 | s09_enter | push_soft | 0.6 | 0 | 2.3 |
| 24.600 | s09_enter | flow_in | 0.6 | -0.3 | 2.2 |
| 27.000 | s10_past | track | 0.5 | 0 | 2.9 |
| 27.200 | s10_past | flow_bed | 0.5 | 0 | 2.8 |
| 27.300 | s10_past | type | 0.4 | 0 |  |
| 27.800 | s10_past | id_click | 0.5 | -0.3 | 0 |
| 30.000 | s11_channels | cut_soft | 0.5 | 0 |  |
| 30.300 | s11_channels | type | 0.4 | 0 |  |
| 30.500 | s11_channels | id_click | 0.8 | -0.3 | 0 |
| 31.200 | s11_channels | id_click | 0.8 | 0.3 | 1 |
| 33.200 | s12_connection | trace_cyan | 0.6 | 0.3 | 2.2 |
| 33.300 | s12_connection | type | 0.4 | 0 |  |
| 35.400 | s12_connection | id_click | 0.6 | 0.3 | 2 |
| 36.000 | s13_ports | cut_soft | 0.5 | 0 |  |
| 36.300 | s13_ports | id_click | 0.6 | -0.2 | 0 |
| 36.500 | s13_ports | tag | 0.6 | 0.2 |  |
| 36.900 | s13_ports | id_click | 0.6 | 0.3 | 1 |
| 37.100 | s13_ports | tag | 0.6 | 0.4 |  |
| 39.000 | s14_line | sweep_out | 0.7 | 0 | 2.9 |
| 39.200 | s14_line | flow_bed | 0.5 | 0.2 | 2.8 |
| 39.300 | s14_line | type | 0.4 | 0 |  |
| 42.000 | s15_height | whoosh_out | 0.6 | 0 | 1.7 |
| 42.400 | s15_height | type | 0.4 | 0 |  |
| 43.500 | s15_height | level_line | 0.7 | 0 | 0.7 |
| 45.000 | s16_collect | cut_soft | 0.5 | 0 |  |
| 45.300 | s16_collect | type | 0.4 | 0 |  |
| 45.800 | s16_collect | drop | 0.5 | 0.1 | 0 |
| 46.420 | s16_collect | drop | 0.5 | 0.1 | 1 |
| 47.000 | s16_collect | complete | 0.8 | 0 |  |
| 47.040 | s16_collect | drop | 0.5 | 0.1 | 2 |
| 48.000 | s17_route | cut_soft | 0.5 | 0 |  |
| 48.300 | s17_route | type | 0.4 | 0 |  |
| 48.300 | s17_route | trace_amber | 0.7 | 0 | 2.2 |
| 50.500 | s17_route | complete_soft | 0.6 | 0.3 |  |
| 51.000 | s18_compare | cut_soft | 0.5 | 0 |  |
| 51.300 | s18_compare | tag | 0.6 | -0.5 |  |
| 51.400 | s18_compare | flow_bed | 0.4 | 0.5 | 2.5 |
| 51.600 | s18_compare | tag | 0.6 | 0.5 |  |
| 54.000 | s19_answer | pull_soft | 0.6 | 0 | 1.4 |
| 54.400 | s19_answer | type | 0.4 | 0 |  |
| 54.700 | s19_answer | trace_amber | 0.7 | 0.2 | 1.9 |
| 56.600 | s19_answer | arrive | 0.8 | 0 |  |
| 57.000 | s20_loop | hold_pad | 0.5 | 0 | 2.2 |
| 59.250 | s20_loop | push_fast | 0.9 | 0 | 0.75 |
| 59.950 | s20_loop | loop_tick | 0.6 | 0 |  |
