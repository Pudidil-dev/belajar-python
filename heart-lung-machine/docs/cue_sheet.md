# Audio cue sheet

Every effect comes from a cue the picture emits (`window.dumpCues()` → `build/cues.json`), so it lands on its visual cause; tonal effects are tuned to the chord of the moment. Under them runs a continuous sound environment (operating-room hum, machine hum, blood flow, pump, gas, water), mixed per scene and crossfaded over 0.6 s across every cut.

## Music

120 BPM, 4/4, 34 bars. Bars 0–2 and 31–33: a suspended G (the question). Bars 3–30: C – Am – F – G, one chord per bar, seven times; cycles start at 6, 14, 22, 30, 38, 46 and 54 s.

| From | To | Section | What plays |
|---|---|---|---|
| 0 s | 6 s | question | bars 0–2: a suspended G chord, no drums; at 2.25 s a rising fourth that does not resolve |
| 6 s | 19 s | the machine | bar 3: the question resolves to C at 6.0 s; a light pulse, the marimba hook, off-beat bass |
| 19 s | 30 s | its parts | the groove: four-on-the-floor, claps, hats, arpeggio; the hook answers itself every four bars |
| 30 s | 38 s | the microscopic world | the kick falls away (30 s), then a quieter space inside the red cell (34 s), a riser and a held breath (37.75–38.0 s) |
| 38 s | 46 s | the binding | bar 19 at 38.0 s, the downbeat of a cycle: the full groove, the hook doubled by a lead |
| 46 s | 56 s | the way back | lighter; no kick while the heart is on screen (50–52 s); a small payoff at 54.0 s |
| 56 s | 62 s | the team and the recap | thinning, no kick; three related tones on the recap |
| 62 s | 68 s | the opening again | bars 31–33: the suspended G chord, the same balance as bar 0, continuing across the seam |

## Beds (continuous)

| Bed | Sound | Where it is forward |
|---|---|---|
| Operating-room hum | 49 Hz with harmonics (G), room tone | the operating field, the perfusionist, the ending |
| Machine hum | a soft motor tone at 147 Hz (D), slowly beating | at the console |
| Blood flow | filtered noise, continuous, only very slow drift | S02 (forward), S05–S06, S16 (broader) |
| Pump | a smooth stable tone at 196 Hz (G) with a band of air | S07 |
| Gas | airy high noise | S09–S11, S14 (panned to the gas side in S10) |
| Water | a smooth mid-low stream | S08 |

## Measured levels

Measurements of the files `tools/synth_audio.py` wrote, not a listening test.

- **Length.** 68.000 s, 48000 Hz, 24-bit stereo.
- **`mix.wav`.** -14.0 LUFS integrated, true peak -1.12 dB.
- **`mix_vo.wav`.** -19.0 LUFS, true peak -1.88 dB (melody pulled back, 300 Hz – 3 kHz thinned).
- **Stems in the mix.** Music -15.49 LUFS, sound -19.41 LUFS.
- **Loop point.** The step from the last sample to the first is 0.00435 of full scale; ordinary sample-to-sample steps in the last 50 ms reach 0.0061 (99th percentile).
- **Loudness per scene (LKFS):** S01 -18, S02 -14, S03 -18, S04 -13, S05 -15, S06 -14, S07 -14, S08 -13, S09 -13, S10 -14, S11 -15, S12 -19, S13 -12, S14 -12, S15 -14, S16 -14, S17 -12, S18 -17, S19 -15, S20 -17.

## Cues

| Time (s) | Scene | Effect | Gain | Pan | Arg |
|---|---|---|---|---|---|
| 0.300 | s01_still | fabric | 0.5 | -0.6 |  |
| 1.000 | s01_still | instrument | 0.6 | 0.6 |  |
| 2.300 | s02_moving | question | 1 | 0 |  |
| 2.350 | s02_moving | glass_open | 0.5 | -0.4 |  |
| 4.000 | s03_follow | sweep | 0.6 | -0.3 | 2 |
| 4.000 | s03_follow | machine_in | 0.5 | -0.2 | 2 |
| 6.000 | s04_machine | reveal | 1 | 0 |  |
| 6.700 | s04_machine | path_out | 0.6 | -0.3 | 1.1 |
| 7.850 | s04_machine | path_back | 0.6 | 0.3 | 1 |
| 9.600 | s05_drain | drain_flow | 0.7 | -0.5 | 2.2 |
| 10.200 | s05_drain | level | 0.4 | -0.6 |  |
| 12.000 | s06_reservoir | push | 0.6 | -0.3 | 1.3 |
| 13.375 | s06_reservoir | res_fluid | 0.6 | -0.4 | 1.6 |
| 13.750 | s06_reservoir | level_tick | 0.5 | -0.2 |  |
| 15.000 | s07_pump | glide | 0.5 | 0.2 | 0.9 |
| 15.500 | s07_pump | pump_reveal | 0.7 | 0.1 |  |
| 15.500 | s07_pump | pump_whirr | 0.8 | 0.1 | 3.5 |
| 19.000 | s08_temp | water_flow | 0.6 | 0.4 | 3 |
| 19.600 | s08_temp | heat_glide | 0.7 | 0 | 1.2 |
| 20.600 | s08_temp | heat_glide | 0.5 | 0 | 1 |
| 22.300 | s09_oxygenator | shimmer | 0.6 | 0.3 |  |
| 22.600 | s09_oxygenator | gas_in | 0.4 | 0.4 | 2.4 |
| 23.400 | s09_oxygenator | select | 0.5 | 0 |  |
| 23.600 | s09_oxygenator | push | 0.5 | 0 | 1.4 |
| 25.100 | s10_fiber | turn | 0.6 | 0 | 0.9 |
| 26.000 | s10_fiber | gas_bed | 0.6 | -0.5 | 3 |
| 26.000 | s10_fiber | blood_bed | 0.6 | 0.5 | 3 |
| 26.300 | s10_fiber | label | 0.4 | -0.2 |  |
| 26.750 | s10_fiber | label | 0.4 | 0.3 |  |
| 29.000 | s11_diffuse | scale_in | 0.8 | 0 |  |
| 29.400 | s11_diffuse | granular | 0.6 | -0.4 | 3.4 |
| 30.400 | s11_diffuse | cross | 0.7 | 0 |  |
| 31.500 | s11_diffuse | cross_out | 0.6 | 0.3 |  |
| 33.200 | s12_rbc | drift | 0.5 | 0.2 | 1.6 |
| 34.900 | s12_rbc | membrane_pass | 0.8 | 0.1 |  |
| 35.000 | s12_rbc | quiet_space | 0.7 | 0 | 2 |
| 37.050 | s13_hemoglobin | dive | 0.7 | 0 | 0.9 |
| 38.000 | s13_hemoglobin | bind | 1 | 0 |  |
| 38.000 | s13_hemoglobin | resolve | 0.9 | 0 | 2 |
| 39.200 | s13_hemoglobin | pull | 0.4 | 0 | 1 |
| 40.250 | s13_hemoglobin | site | 0.4 | -0.4 | 0 |
| 40.430 | s13_hemoglobin | site | 0.4 | 0.4 | 1 |
| 40.610 | s13_hemoglobin | site | 0.4 | -0.3 | 2 |
| 40.790 | s13_hemoglobin | site | 0.4 | 0.3 | 3 |
| 40.950 | s13_hemoglobin | bind_soft | 0.6 | 0.3 |  |
| 42.000 | s14_co2 | matchcut | 0.6 | 0 |  |
| 42.400 | s14_co2 | granular | 0.5 | 0.4 | 2 |
| 43.000 | s14_co2 | cross | 0.6 | 0 |  |
| 44.300 | s14_co2 | sweep_out | 0.7 | -0.5 | 0.6 |
| 44.800 | s14_co2 | pull | 0.6 | 0 | 1.2 |
| 46.250 | s15_filter | tick_soft | 0.5 | 0.2 | 0 |
| 47.000 | s15_filter | glide | 0.4 | 0.3 | 0.9 |
| 47.750 | s15_filter | tick_soft | 0.5 | 0.4 | 1 |
| 49.000 | s16_aorta | climb | 0.7 | 0.3 | 2 |
| 51.000 | s16_aorta | arrive | 0.7 | -0.2 |  |
| 51.000 | s16_aorta | broad_flow | 0.6 | 0 | 1 |
| 52.000 | s17_tissue | capillary | 0.5 | 0 | 0.5 |
| 52.600 | s17_tissue | disperse | 0.8 | 0 | 2.6 |
| 54.000 | s17_tissue | payoff | 1 | 0 |  |
| 56.000 | s18_perfusionist | room | 0.6 | -0.3 | 3 |
| 56.600 | s18_perfusionist | inset | 0.4 | -0.2 |  |
| 59.000 | s19_system | pull | 0.5 | 0 | 0.9 |
| 59.750 | s19_system | func | 1 | -0.2 | 0 |
| 60.500 | s19_system | func | 1 | 0.3 | 1 |
| 61.250 | s19_system | func | 1 | 0.4 | 2 |
| 62.300 | s19_system | glide | 0.4 | 0.2 | 0.7 |
| 63.000 | s20_return | glide | 0.5 | 0.3 | 4.4 |
| 66.400 | s20_return | settle_or | 0.6 | 0 | 1.6 |
