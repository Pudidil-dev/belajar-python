# Audio cue sheet

Every effect comes from a cue the picture emits (`window.dumpCues()` → `build/cues.json`), so it lands on its visual cause; tonal effects are tuned to the chord of the moment. Under them runs a continuous sound environment (operating-room hum, machine hum, blood flow, pump, gas, water), mixed per scene and crossfaded over 0.6 s across every cut.

## Music

120 BPM, 4/4, 46 bars. Bars 0–2 and 43–45: a suspended G (the question). Bars 3–42: C – Am – F – G, one chord per bar, ten times; cycles start at 6, 14, 22, 30, 38, 46, 54, 62, 70 and 78 s.

| From | To | Section | What plays |
|---|---|---|---|
| 0 s | 6 s | question | bars 0–2: a suspended G chord, no drums; at 2.25 s a rising fourth that does not resolve |
| 6 s | 10 s | the machine | bars 3–4: the question resolves to C at 6.0 s as the view turns to the machine; the marimba hook, no kick while the heart is in frame |
| 10 s | 18 s | the workflow | bars 5–8: a light half-time pulse; each of the seven steps rings one note higher than the last (a pentatonic ladder) |
| 18 s | 22 s | drainage | bars 9–10: hats, shaker and bass, no kick (the heart is on screen) |
| 22 s | 34 s | the parts | bars 11–16: the groove — four-on-the-floor, claps, hats, arpeggio; the hook answers itself every four bars |
| 34 s | 42 s | gas and the oxygenator | bars 17–20: the groove opens up (open hats, a brighter arpeggio) |
| 42 s | 46 s | one fibre | bars 21–22: the groove without the clap |
| 46 s | 54 s | the microscopic world | the kick falls away (46 s), then a quieter space inside the red cell (50 s), a riser and a held breath (53.75–54.0 s) |
| 54 s | 62 s | the binding | bar 27 at 54.0 s, the downbeat of a cycle: the full groove, the hook doubled by a lead |
| 62 s | 70 s | the way back | lighter; no kick while the heart is on screen (66–70 s) |
| 70 s | 72 s | oxygen delivered | bar 35 at 70.0 s: a small payoff, one bar of four-on-the-floor |
| 72 s | 80 s | the other lines | cardioplegia (bells, no kick: the heart is on screen), then suction (marimba, shaker) |
| 80 s | 86 s | the team and the whole loop | thinning, no kick; three related tones on the recap |
| 86 s | 92 s | the opening again | bars 43–45: the suspended G chord, the same balance as bar 0, continuing across the seam |

## Beds (continuous)

| Bed | Sound | Where it is forward |
|---|---|---|
| Operating-room hum | 49 Hz with harmonics (G), room tone | the operating field, the perfusionist, the ending |
| Machine hum | a soft motor tone at 147 Hz (D), slowly beating | at the console |
| Blood flow | filtered noise, continuous, only very slow drift | S02 (forward), S05–S07, S19 (broader) |
| Pump | a smooth stable tone at 196 Hz (G) with a band of air | S08 (forward), S05, S21–S22 |
| Gas | airy high noise | S11–S14, S17 (panned to the gas side in S13) |
| Water | a smooth mid-low stream | S09–S10 |

## Measured levels

Measurements of the files `tools/synth_audio.py` wrote, not a listening test.

- **Length.** 92.000 s, 48000 Hz, 24-bit stereo.
- **`mix.wav`.** -14.0 LUFS integrated, true peak -1.29 dB.
- **`mix_vo.wav`.** -19.0 LUFS, true peak -1.78 dB (melody pulled back, 300 Hz – 3 kHz thinned).
- **Stems in the mix.** Music -15.46 LUFS, sound -19.48 LUFS.
- **Loop point.** The step from the last sample to the first is 0.00103 of full scale; ordinary sample-to-sample steps in the last 50 ms reach 0.00562 (99th percentile).
- **Loudness per scene (LKFS):** S01 -19, S02 -14, S03 -17, S04 -13, S05 -15, S06 -15, S07 -14, S08 -13, S09 -14, S10 -13, S11 -14, S12 -13, S13 -14, S14 -15, S15 -19, S16 -12, S17 -12, S18 -14, S19 -14, S20 -12, S21 -16, S22 -15, S23 -18, S24 -15, S25 -17.

## Cues

| Time (s) | Scene | Effect | Gain | Pan | Arg |
|---|---|---|---|---|---|
| 0.300 | s01_still | fabric | 0.5 | -0.6 |  |
| 1.000 | s01_still | instrument | 0.6 | 0.6 |  |
| 2.300 | s02_moving | question | 1 | 0 |  |
| 2.350 | s02_moving | glass_open | 0.5 | -0.4 |  |
| 2.750 | s02_moving | label | 0.4 | -0.3 |  |
| 3.050 | s02_moving | label | 0.4 | 0.2 |  |
| 4.000 | s03_follow | sweep | 0.6 | -0.3 | 2 |
| 4.000 | s03_follow | machine_in | 0.5 | -0.2 | 2 |
| 4.350 | s03_follow | label | 0.4 | 0.2 |  |
| 6.000 | s04_machine | turn | 0.7 | 0 | 0.5 |
| 6.500 | s04_machine | reveal | 1 | 0 |  |
| 6.750 | s04_machine | label | 0.4 | -0.2 |  |
| 7.100 | s04_machine | path_out | 0.6 | -0.3 | 1.3 |
| 7.300 | s04_machine | label | 0.4 | -0.4 |  |
| 7.900 | s04_machine | label | 0.3 | 0 |  |
| 8.400 | s04_machine | path_back | 0.6 | 0.3 | 1.1 |
| 8.550 | s04_machine | label | 0.4 | 0.4 |  |
| 10.000 | s05_workflow | glide | 0.4 | 0 | 0.8 |
| 10.500 | s05_workflow | drop | 0.8 | -0.3 |  |
| 11.020 | s05_workflow | step | 0.9 | -0.8 | 1 |
| 11.970 | s05_workflow | step | 0.9 | -0.5222222222222223 | 2 |
| 13.240 | s05_workflow | step | 0.9 | -0.35555555555555557 | 3 |
| 14.230 | s05_workflow | step | 0.9 | 0.43333333333333335 | 4 |
| 14.640 | s05_workflow | step | 0.9 | 0.43333333333333335 | 5 |
| 15.000 | s05_workflow | step | 0.9 | 0.7222222222222222 | 6 |
| 16.050 | s05_workflow | step | 0.9 | 0.6111111111111112 | 7 |
| 17.200 | s05_workflow | push | 0.6 | -0.3 | 0.8 |
| 18.200 | s06_drain | label | 0.4 | 0.2 |  |
| 18.250 | s06_drain | drain_flow | 0.7 | -0.5 | 2.4 |
| 18.450 | s06_drain | label | 0.4 | -0.3 |  |
| 18.900 | s06_drain | level | 0.4 | -0.6 |  |
| 19.500 | s06_drain | label | 0.3 | -0.6 |  |
| 21.000 | s07_reservoir | push | 0.6 | -0.3 | 0.8 |
| 21.450 | s07_reservoir | label | 0.4 | 0.2 |  |
| 21.600 | s07_reservoir | res_fluid | 0.6 | -0.4 | 1.6 |
| 21.700 | s07_reservoir | label | 0.3 | -0.4 |  |
| 21.950 | s07_reservoir | label | 0.3 | 0.3 |  |
| 22.250 | s07_reservoir | label | 0.3 | 0.3 |  |
| 22.750 | s07_reservoir | level_tick | 0.5 | 0.3 |  |
| 23.000 | s07_reservoir | label | 0.3 | 0 |  |
| 24.000 | s08_pump | glide | 0.5 | 0.2 | 0.9 |
| 24.600 | s08_pump | pump_reveal | 0.7 | 0.1 |  |
| 24.600 | s08_pump | pump_whirr | 0.8 | 0.1 | 4 |
| 25.000 | s08_pump | chip | 0.8 | -0.3 | 0 |
| 25.500 | s08_pump | label | 0.3 | -0.3 |  |
| 25.800 | s08_pump | chip | 0.8 | 0 | 1 |
| 26.050 | s08_pump | label | 0.3 | 0.3 |  |
| 26.400 | s08_pump | label | 0.3 | -0.3 |  |
| 26.600 | s08_pump | chip | 0.8 | 0.3 | 2 |
| 26.750 | s08_pump | label | 0.3 | 0.4 |  |
| 29.000 | s09_heater | glide | 0.5 | 0.4 | 0.9 |
| 29.600 | s09_heater | water_flow | 0.6 | 0.4 | 2.4 |
| 29.600 | s09_heater | tick_soft | 0.4 | 0.5 | 0 |
| 29.850 | s09_heater | label | 0.4 | 0.5 |  |
| 29.950 | s09_heater | label | 0.3 | 0.4 |  |
| 30.200 | s09_heater | label | 0.3 | 0.4 |  |
| 30.600 | s09_heater | heat_glide | 0.6 | 0.3 | 1 |
| 31.050 | s09_heater | label | 0.3 | -0.2 |  |
| 32.000 | s10_exchanger | water_flow | 0.6 | 0.4 | 3 |
| 32.600 | s10_exchanger | heat_glide | 0.7 | 0 | 1.2 |
| 32.700 | s10_exchanger | label | 0.3 | 0.4 |  |
| 33.000 | s10_exchanger | label | 0.3 | -0.4 |  |
| 33.300 | s10_exchanger | label | 0.3 | -0.2 |  |
| 33.600 | s10_exchanger | heat_glide | 0.5 | 0 | 1 |
| 35.000 | s11_gas | gas_in | 0.5 | 0.4 | 3 |
| 35.350 | s11_gas | label | 0.4 | 0.5 |  |
| 35.500 | s11_gas | shimmer | 0.5 | 0.4 |  |
| 35.550 | s11_gas | label | 0.3 | 0.5 |  |
| 35.850 | s11_gas | label | 0.3 | 0.2 |  |
| 36.200 | s11_gas | label | 0.3 | 0.1 |  |
| 36.700 | s11_gas | glide | 0.4 | 0.2 | 1 |
| 36.750 | s11_gas | label | 0.3 | 0.3 |  |
| 37.150 | s11_gas | puff | 0.6 | 0.4 |  |
| 37.150 | s11_gas | label | 0.3 | 0.4 |  |
| 38.000 | s12_oxygenator | glide | 0.4 | 0.2 | 0.8 |
| 38.200 | s12_oxygenator | label | 0.3 | -0.2 |  |
| 38.400 | s12_oxygenator | label | 0.3 | -0.2 |  |
| 38.500 | s12_oxygenator | shimmer | 0.6 | 0.3 |  |
| 38.600 | s12_oxygenator | label | 0.3 | 0.3 |  |
| 38.900 | s12_oxygenator | label | 0.3 | -0.3 |  |
| 39.300 | s12_oxygenator | select | 0.5 | 0 |  |
| 39.500 | s12_oxygenator | push | 0.5 | 0 | 1.4 |
| 41.100 | s13_fiber | turn | 0.6 | 0 | 0.9 |
| 42.000 | s13_fiber | gas_bed | 0.6 | -0.5 | 3 |
| 42.000 | s13_fiber | blood_bed | 0.6 | 0.5 | 3 |
| 42.300 | s13_fiber | label | 0.4 | -0.2 |  |
| 42.600 | s13_fiber | label | 0.4 | 0.3 |  |
| 42.900 | s13_fiber | label | 0.3 | -0.4 |  |
| 43.200 | s13_fiber | label | 0.3 | -0.2 |  |
| 43.500 | s13_fiber | label | 0.3 | 0.2 |  |
| 45.000 | s14_diffuse | scale_in | 0.8 | 0 |  |
| 45.400 | s14_diffuse | granular | 0.6 | -0.4 | 3.4 |
| 45.600 | s14_diffuse | label | 0.3 | -0.5 |  |
| 45.850 | s14_diffuse | label | 0.3 | 0.5 |  |
| 46.100 | s14_diffuse | label | 0.3 | 0 |  |
| 46.400 | s14_diffuse | cross | 0.7 | 0 |  |
| 47.500 | s14_diffuse | cross_out | 0.6 | 0.3 |  |
| 49.200 | s15_rbc | drift | 0.5 | 0.2 | 1.6 |
| 49.400 | s15_rbc | label | 0.3 | -0.2 |  |
| 49.700 | s15_rbc | label | 0.3 | -0.3 |  |
| 50.900 | s15_rbc | membrane_pass | 0.8 | 0.1 |  |
| 51.000 | s15_rbc | quiet_space | 0.7 | 0 | 2 |
| 51.600 | s15_rbc | label | 0.3 | 0.2 |  |
| 53.050 | s16_hemoglobin | dive | 0.7 | 0 | 0.9 |
| 53.750 | s16_hemoglobin | label | 0.3 | -0.3 |  |
| 54.000 | s16_hemoglobin | bind | 1 | 0 |  |
| 54.000 | s16_hemoglobin | resolve | 0.9 | 0 | 2 |
| 55.200 | s16_hemoglobin | pull | 0.4 | 0 | 1 |
| 56.000 | s16_hemoglobin | label | 0.3 | 0 |  |
| 56.250 | s16_hemoglobin | site | 0.4 | -0.4 | 0 |
| 56.430 | s16_hemoglobin | site | 0.4 | 0.4 | 1 |
| 56.610 | s16_hemoglobin | site | 0.4 | -0.3 | 2 |
| 56.790 | s16_hemoglobin | site | 0.4 | 0.3 | 3 |
| 56.950 | s16_hemoglobin | bind_soft | 0.6 | 0.3 |  |
| 58.000 | s17_co2 | matchcut | 0.6 | 0 |  |
| 58.400 | s17_co2 | granular | 0.5 | 0.4 | 2 |
| 58.400 | s17_co2 | label | 0.3 | 0.3 |  |
| 59.000 | s17_co2 | cross | 0.6 | 0 |  |
| 59.000 | s17_co2 | label | 0.3 | -0.5 |  |
| 60.300 | s17_co2 | sweep_out | 0.7 | -0.5 | 0.6 |
| 60.800 | s17_co2 | pull | 0.6 | 0 | 1.2 |
| 62.250 | s18_filter | tick_soft | 0.5 | 0.2 | 0 |
| 62.350 | s18_filter | label | 0.3 | -0.2 |  |
| 63.000 | s18_filter | glide | 0.4 | 0.3 | 0.9 |
| 63.750 | s18_filter | tick_soft | 0.5 | 0.4 | 1 |
| 63.800 | s18_filter | label | 0.3 | 0.4 |  |
| 65.000 | s19_return | climb | 0.7 | 0.3 | 1.9 |
| 65.300 | s19_return | label | 0.3 | 0.3 |  |
| 66.900 | s19_return | arrive | 0.7 | -0.2 |  |
| 66.900 | s19_return | broad_flow | 0.6 | 0 | 1 |
| 67.000 | s19_return | label | 0.3 | 0.2 |  |
| 67.350 | s19_return | label | 0.3 | -0.3 |  |
| 68.000 | s20_tissue | capillary | 0.5 | 0 | 0.5 |
| 68.600 | s20_tissue | disperse | 0.8 | 0 | 2.6 |
| 68.700 | s20_tissue | label | 0.3 | -0.4 |  |
| 69.200 | s20_tissue | label | 0.3 | 0.4 |  |
| 70.000 | s20_tissue | payoff | 1 | 0 |  |
| 72.000 | s21_cardioplegia | glide | 0.4 | 0.3 | 0.6 |
| 72.250 | s21_cardioplegia | label | 0.3 | 0.3 |  |
| 72.500 | s21_cardioplegia | label | 0.3 | 0.2 |  |
| 72.600 | s21_cardioplegia | climb | 0.5 | 0.2 | 1.8 |
| 74.400 | s21_cardioplegia | shimmer | 0.6 | -0.2 |  |
| 74.550 | s21_cardioplegia | label | 0.3 | -0.3 |  |
| 74.750 | s21_cardioplegia | label | 0.3 | 0.2 |  |
| 75.000 | s21_cardioplegia | label | 0.3 | 0.3 |  |
| 76.200 | s22_suction | label | 0.3 | -0.2 |  |
| 76.400 | s22_suction | label | 0.3 | -0.4 |  |
| 76.500 | s22_suction | drain_flow | 0.6 | -0.6 | 1.9 |
| 77.950 | s22_suction | label | 0.3 | -0.5 |  |
| 78.000 | s22_suction | inset | 0.5 | 0.4 |  |
| 78.300 | s22_suction | roller | 0.8 | 0.3 | 1.4 |
| 78.500 | s22_suction | climb | 0.4 | -0.5 | 1.2 |
| 78.900 | s22_suction | label | 0.3 | -0.4 |  |
| 80.000 | s23_perfusionist | room | 0.6 | -0.3 | 3 |
| 80.300 | s23_perfusionist | label | 0.3 | 0.3 |  |
| 80.600 | s23_perfusionist | inset | 0.4 | -0.2 |  |
| 83.000 | s24_system | pull | 0.5 | 0 | 0.9 |
| 84.000 | s24_system | func | 1 | -0.2 | 0 |
| 84.750 | s24_system | func | 1 | 0.3 | 1 |
| 85.500 | s24_system | func | 1 | 0.4 | 2 |
| 86.400 | s24_system | glide | 0.4 | 0.2 | 0.7 |
| 87.000 | s25_loop | glide | 0.5 | 0.3 | 1.6 |
| 88.700 | s25_loop | turn | 0.6 | 0 | 0.6 |
| 89.900 | s25_loop | settle_or | 0.6 | 0 | 1.6 |
