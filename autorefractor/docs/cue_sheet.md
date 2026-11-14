# Music and SFX cue sheet

Every effect comes from a cue the picture emits (`window.dumpCues()` → `build/cues.json`), so it lands on its visual cause. The picture's events are themselves placed on the 16th-note grid (0.125 s at 120 BPM), and every tonal effect is tuned to the chord of its bar, so the effects play as part of the music. The caption-typing ticks (`type`, `label`) are left out of the `*_notext` stems.

## Music

120 BPM · one 3-s scene = one bar of six beats · 21 bars, 126 beats · D – A – Bm – G, one chord per scene, five times, then A in scene 21.

| From | To | Section | What plays |
|---|---|---|---|
| 0 s | 6 s | curious opening motif | the hook on bell and marimba over a pad; from 3 s, hats and a half-time kick |
| 6 s | 15 s | light rhythmic development | off-beat bass, shaker and rim come in; the kick on every beat from 12 s |
| 15 s | 30 s | smooth forward motion | the whole groove: the hook every bar, a 16th-note arpeggio, pads ducking under the kick |
| 30 s | 36 s | small satisfying electronic details | no kick; the electrons of S11 climb a pentatonic scale, the readout of S12 clicks down in sixteenths |
| 36 s | 48 s | build anticipation | the pulse returns, then the full kick, claps, a snare roll and a riser; a held breath from 47.75 to 48.00 s |
| 48 s | 54 s | clear payoff | everything: the hook doubled by a lead, chord stabs in its rhythm; the three values of S17 are the hook's own first three notes |
| 54 s | 63 s | return to the opening texture | the pulse thins, the hook on the bell again; the last bar holds the dominant and leans into bar 1 |

## Measured levels

These are measurements of the files `tools/synth_audio.py` wrote, not a listening test.

- **Length.** 63.000 s, 48000 Hz, 24-bit stereo.
- **`mix.wav`.** -14.0 LUFS integrated, true peak -1.23 dB.
- **`mix_vo.wav`** (melody pulled back, 300 Hz – 3 kHz thinned). -19.0 LUFS, true peak -2.35 dB.
- **Stems in the mix.** Music -15.83 LUFS, effects -17.98 LUFS.
- **Loop point.** The step from the last sample to the first is 0.00368 of full scale; ordinary sample-to-sample steps in the last 50 ms reach 0.13022 (99th percentile), so the seam is no larger than the signal's own motion.
- **Loudness per scene (LKFS):** S01 -16, S02 -17, S03 -14, S04 -14, S05 -14, S06 -14, S07 -12, S08 -14, S09 -13, S10 -13, S11 -17, S12 -16, S13 -15, S14 -13, S15 -14, S16 -14, S17 -11, S18 -12, S19 -15, S20 -16, S21 -18.

## Cues

| Time (s) | Scene | Effect | Gain | Pan | Arg |
|---|---|---|---|---|---|
| 0.000 | s01_balloon | glass | 1 | 0 |  |
| 0.200 | s01_balloon | type | 0.4 | 0 |  |
| 1.000 | s01_balloon | defocus | 0.7 | 0 | 1.1 |
| 1.875 | s01_balloon | aperture | 0.7 | 0 | 1.125 |
| 3.000 | s02_exam | whoosh_out | 0.6 | 0 | 1.25 |
| 3.500 | s02_exam | type | 0.4 | 0 |  |
| 3.875 | s02_exam | motor | 0.8 | 0.3 | 0.875 |
| 4.250 | s02_exam | dock | 0.6 | -0.5 |  |
| 4.750 | s02_exam | settle | 0.5 | 0.3 |  |
| 6.300 | s03_gaze | cover | 0.6 | 0.2 | 0.6 |
| 6.500 | s03_gaze | type | 0.4 | 0 |  |
| 6.750 | s03_gaze | lamp | 0.7 | 0.2 |  |
| 6.875 | s03_gaze | trace_amber | 0.8 | 0.2 | 1.125 |
| 8.000 | s03_gaze | lock | 1 | -0.2 |  |
| 9.300 | s04_fog | type | 0.4 | 0 |  |
| 9.350 | s04_fog | push | 0.5 | 0 | 1.1 |
| 10.300 | s04_fog | lens_glide | 0.9 | 0.3 | 0.95 |
| 10.400 | s04_fog | defocus | 0.6 | -0.4 | 0.95 |
| 11.250 | s04_fog | settle | 0.6 | 0.3 |  |
| 11.500 | s04_fog | glide | 0.5 | 0.3 | 0.9 |
| 12.300 | s05_infrared | type | 0.4 | 0 |  |
| 12.500 | s05_infrared | ir_on | 1 | 0.5 |  |
| 12.750 | s05_infrared | beam_run | 0.9 | 0.3 | 2.25 |
| 13.500 | s05_infrared | inset_out | 0.4 | -0.6 |  |
| 15.000 | s06_front | enter | 0.8 | -0.2 |  |
| 15.200 | s06_front | push | 0.5 | 0 | 1 |
| 15.300 | s06_front | type | 0.4 | 0 |  |
| 16.000 | s06_front | label | 0.5 | 0.3 |  |
| 16.625 | s06_front | label | 0.5 | -0.3 |  |
| 17.375 | s06_front | enter | 0.6 | -0.3 |  |
| 18.100 | s07_bend | pull | 0.5 | 0 | 0.9 |
| 18.300 | s07_bend | type | 0.4 | 0 |  |
| 18.375 | s07_bend | bend | 0.8 | 0.2 |  |
| 18.500 | s07_bend | converge | 0.8 | 0 | 1.75 |
| 19.000 | s07_bend | label | 0.5 | 0.3 |  |
| 20.250 | s07_bend | spot | 1 | -0.4 |  |
| 21.000 | s08_return | push | 0.5 | 0 | 0.8 |
| 21.300 | s08_return | type | 0.4 | 0 |  |
| 21.875 | s08_return | scatter | 1 | -0.3 |  |
| 22.125 | s08_return | label | 0.5 | -0.2 |  |
| 22.625 | s08_return | answer | 0.9 | 0.2 |  |
| 24.000 | s09_sensor | pull | 0.6 | 0 | 0.9 |
| 24.200 | s09_sensor | return_run | 0.9 | -0.3 | 2.5 |
| 24.300 | s09_sensor | type | 0.4 | 0 |  |
| 24.875 | s09_sensor | tick | 0.5 | -0.2 |  |
| 25.750 | s09_sensor | turn | 0.7 | 0.3 |  |
| 26.750 | s09_sensor | sensor_hit | 1 | 0.2 |  |
| 27.080 | s10_pattern | chip_turn | 0.8 | 0 | 0.82 |
| 27.400 | s10_pattern | type | 0.4 | 0 |  |
| 27.875 | s10_pattern | acquire | 1 | 0 | 1 |
| 29.000 | s10_pattern | push | 0.5 | 0.2 | 1 |
| 30.300 | s11_charge | type | 0.4 | 0 |  |
| 30.500 | s11_charge | charge_pop | 0.7 | -0.16531921319353085 | 0 |
| 30.750 | s11_charge | charge_pop | 0.72 | 0.1351365865091793 | 1 |
| 31.000 | s11_charge | charge_pop | 0.74 | -0.0423313471255824 | 2 |
| 31.125 | s11_charge | charge_pop | 0.76 | 0.38334241502452643 | 3 |
| 31.375 | s11_charge | charge_pop | 0.7799999999999999 | 0.3283406800435235 | 4 |
| 31.500 | s11_charge | charge_pop | 0.7999999999999999 | 0.08714463354554028 | 5 |
| 31.750 | s11_charge | charge_pop | 0.82 | -0.13557521652352686 | 6 |
| 31.875 | s11_charge | charge_pop | 0.84 | -0.16349014177685603 | 7 |
| 32.000 | s11_charge | charge_pop | 0.86 | 0.34817530690149096 | 8 |
| 32.125 | s11_charge | charge_pop | 0.8799999999999999 | -0.20364065624307842 | 9 |
| 32.250 | s11_charge | charge_pop | 0.8999999999999999 | -0.23604346985230223 | 10 |
| 32.375 | s11_charge | charge_pop | 0.9199999999999999 | 0.05293179336003959 | 11 |
| 32.500 | s11_charge | charge_pop | 0.94 | -0.021423578510681787 | 12 |
| 32.625 | s11_charge | packet | 0.9 | 0 |  |
| 33.100 | s12_data | pull | 0.5 | 0 | 1 |
| 33.300 | s12_data | type | 0.4 | 0 |  |
| 34.250 | s12_data | readout | 1 | 0 | 1.25 |
| 35.500 | s12_data | data_done | 1 | 0 |  |
| 36.125 | s13_focus | panel | 0.5 | -0.3 |  |
| 36.250 | s13_focus | panel | 0.5 | 0.3 |  |
| 36.300 | s13_focus | type | 0.4 | 0 |  |
| 36.500 | s13_focus | rays_in | 0.6 | 0.4 | 1 |
| 37.500 | s13_focus | focus_on | 0.9 | -0.3 |  |
| 37.750 | s13_focus | focus_front | 0.9 | -0.1 |  |
| 39.200 | s14_astig | orbit | 0.4 | 0 | 2.6 |
| 39.300 | s14_astig | type | 0.4 | 0 |  |
| 39.350 | s14_astig | rays_in | 0.6 | 0.4 | 1.4 |
| 40.250 | s14_astig | focus_a | 0.9 | -0.2 |  |
| 40.500 | s14_astig | focus_b | 0.9 | -0.5 |  |
| 41.000 | s14_astig | span | 0.6 | -0.3 | 0.3 |
| 42.300 | s15_analyze | type | 0.4 | 0 |  |
| 42.350 | s15_analyze | cal | 0.6 | 0 | 0.45 |
| 42.875 | s15_analyze | tick | 0.5 | 0 | 0 |
| 43.000 | s15_analyze | tick | 0.53 | 0.4240951086632196 | 1 |
| 43.125 | s15_analyze | tick | 0.56 | 0.5999998097591007 | 2 |
| 43.250 | s15_analyze | tick | 0.59 | 0.42477054518905927 | 3 |
| 43.375 | s15_analyze | tick | 0.62 | 0.0009555917498920969 | 4 |
| 43.500 | s15_analyze | tick | 0.65 | -0.42341859640108603 | 5 |
| 43.625 | s15_analyze | tick | 0.6799999999999999 | -0.5999982878326308 | 6 |
| 43.750 | s15_analyze | tick | 0.71 | -0.42544490426533005 | 7 |
| 43.875 | s15_analyze | fit | 0.8 | 0 | 0.4 |
| 44.375 | s15_analyze | axes | 0.9 | 0 |  |
| 45.150 | s16_repeat | shrink | 0.5 | -0.4 | 0.7 |
| 45.300 | s16_repeat | type | 0.4 | 0 |  |
| 46.000 | s16_repeat | confirm | 0.9 | -0.5 | 0 |
| 46.020 | s16_repeat | capture | 0.5 | 0 | 0.3 |
| 46.500 | s16_repeat | confirm | 0.9 | 0 | 1 |
| 46.520 | s16_repeat | capture | 0.5 | 0.4 | 0.3 |
| 47.000 | s16_repeat | confirm | 1 | 0.5 | 2 |
| 47.250 | s16_repeat | dock | 0.7 | 0 | 0.55 |
| 48.250 | s17_numbers | type | 0.4 | 0 |  |
| 48.500 | s17_numbers | value | 1 | -0.3 | 0 |
| 49.000 | s17_numbers | value | 1 | 0 | 1 |
| 49.500 | s17_numbers | value | 1 | 0.3 | 2 |
| 50.000 | s17_numbers | complete | 1 | 0 |  |
| 51.000 | s18_print | pan | 0.5 | 0 | 0.7 |
| 51.500 | s18_print | type | 0.4 | 0 |  |
| 51.750 | s18_print | feed | 0.85 | 0.1 | 0 |
| 51.875 | s18_print | feed | 0.6 | 0.1 | 1 |
| 52.000 | s18_print | feed | 0.6 | 0.1 | 2 |
| 52.125 | s18_print | feed | 0.6 | 0.1 | 3 |
| 52.250 | s18_print | feed | 0.85 | 0.1 | 4 |
| 52.375 | s18_print | feed | 0.6 | 0.1 | 5 |
| 52.500 | s18_print | feed | 0.6 | 0.1 | 6 |
| 52.625 | s18_print | feed | 0.6 | 0.1 | 7 |
| 52.750 | s18_print | feed | 0.85 | 0.1 | 8 |
| 52.875 | s18_print | feed | 0.6 | 0.1 | 9 |
| 53.000 | s18_print | feed | 0.6 | 0.1 | 10 |
| 53.125 | s18_print | feed | 0.6 | 0.1 | 11 |
| 53.250 | s18_print | tear | 0.8 | 0.1 |  |
| 53.500 | s18_print | resolve | 1 | 0 |  |
| 54.250 | s19_both | lamp | 0.6 | 0.2 |  |
| 54.400 | s19_both | type | 0.4 | 0 |  |
| 54.500 | s19_both | trace_amber | 0.7 | 0.2 | 0.5 |
| 54.875 | s19_both | inset_in | 0.7 | -0.5 |  |
| 55.125 | s19_both | beam_run | 0.7 | 0.3 | 0.5 |
| 55.625 | s19_both | return_run | 0.7 | -0.2 | 0.625 |
| 56.250 | s19_both | sensor_hit | 0.8 | 0.2 |  |
| 56.500 | s19_both | value | 0.7 | -0.4 | 2 |
| 57.125 | s20_return | settle | 0.4 | 0.2 |  |
| 58.000 | s20_return | whoosh_in | 0.6 | 0 | 1.9 |
| 58.000 | s20_return | motif_back | 1 | 0 |  |
| 60.000 | s21_loop | aperture_open | 0.6 | 0 | 2.3 |
| 60.000 | s21_loop | bridge | 1 | 0 | 3 |
