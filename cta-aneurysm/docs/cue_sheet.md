# Music and sound-effect cue sheet

Every sound effect comes from a cue the picture emits (`window.dumpCues()` in `engine/film.js`), so it lands on its visual cause. Soft interface sounds are snapped to the nearest 16th note when they are within 45 ms of it; physical events (emission, absorption, the reveal) stay exact. Tonal effects take their notes from the chord sounding at that moment. `type` and `tag` (the labels) are left out of the textless mix.

## Music arc

| From | To | Section |
|---|---|---|
| 0 s | 20 s | curiosity: the hook on bell and glass from the first beat, light drums, the build into the gantry |
| 20 s | 40 s | the tube's techno groove (pulse bass, stabs, pluck hook); held breath, then the high-voltage drop at 32.5 s; riser and roll into the dive |
| 40 s | 60 s | bullet time in half time with a wobble bass; the bremsstrahlung chime at 44.4 s; the drive with reese bass and the lead hook; the music itself filtered during S14 |
| 60 s | 80 s | flow: groove with heartbeat kicks, glass hook, the fill motif; held breath and the acquisition trigger at 78.5 s |
| 80 s | 100 s | the dive riser, a breakdown on the iodine atom, silence, the drop on photoelectric absorption at 88.0 s |
| 100 s | 120 s | ordered conversion: data arps in 16ths, the bell hook, the bit ladder of the converter, riser |
| 120 s | 140 s | the reconstruction build (machine knocks, rising hits per doubling of views), held breath, the main drop on the grayscale image at 132 s |
| 140 s | 160 s | discovery: clean four-on-the-floor, glass and pluck hooks; held breath, the climax on the reviewer's click at 154 s |
| 160 s | 180 s | calm: pads and bell; a two-beat pause at 168 s; a warm phrase; the A-major turnaround that lands on the opening hit |

Harmony: D minor, the loop Dm – Bb – F – C (one chord per bar) for bars 1–80; bars 81–90: Bb – C – Dm – Dm – Bb – C – F – F – Bb – A, the A major leading back to Dm at the loop. The hook (2 bars): a 3-3-2 bar A9–D–F · E–D–C and its answer D–F–A · G–F–E, one melody that sits on every chord of the loop.

## Cues

| Time (s) | Scene | Effect | Gain | Pan | Arg |
|---|---|---|---|---|---|
| 0.000 | s01_hook | open_hit | 1 | 0 |  |
| 0.050 | s01_hook | curious | 0.8 | -0.2 | 0 |
| 0.550 | s01_hook | curious | 0.7 | 0.2 | 1 |
| 1.000 | s01_hook | push_in | 0.6 | 0 | 1.1 |
| 1.250 | s01_hook | type | 0.4 | 0 |  |
| 1.700 | s01_hook | ring | 0.8 | -0.3 |  |
| 4.000 | s02_bulge | flow_bed | 0.7 | 0 | 4 |
| 4.050 | s02_bulge | beat | 0.7 | 0 |  |
| 4.350 | s02_bulge | type | 0.4 | 0 |  |
| 5.050 | s02_bulge | beat | 0.6 | 0 |  |
| 5.200 | s02_bulge | tag | 0.5 | -0.3 |  |
| 5.700 | s02_bulge | tag | 0.5 | -0.5 |  |
| 6.050 | s02_bulge | beat | 0.6 | 0 |  |
| 6.400 | s02_bulge | swirl | 0.6 | -0.5 | 1.2 |
| 7.050 | s02_bulge | beat | 0.6 | 0 |  |
| 8.000 | s03_skull | pull_back | 0.8 | 0 | 2.6 |
| 8.900 | s03_skull | type | 0.4 | 0 |  |
| 9.200 | s03_skull | bone_in | 0.7 | 0 | 1 |
| 10.400 | s03_skull | lie_down | 0.6 | 0 | 1.5 |
| 11.600 | s03_skull | table_thud | 0.5 | 0 |  |
| 12.000 | s04_cta | room_tone | 0.6 | 0 | 4 |
| 12.100 | s04_cta | table_motor | 0.7 | 0.2 | 1.6 |
| 12.400 | s04_cta | type | 0.4 | 0 |  |
| 13.350 | s04_cta | inject | 0.8 | 0.5 | 1.1 |
| 14.450 | s04_cta | scan_fire | 0.9 | -0.2 |  |
| 14.850 | s04_cta | image_land | 0.8 | -0.5 |  |
| 15.250 | s04_cta | ring | 0.6 | -0.6 |  |
| 16.100 | s05_gantry | cover_fade | 0.7 | 0 | 0.8 |
| 16.200 | s05_gantry | spin_motor | 0.6 | 0 | 1.6 |
| 16.900 | s05_gantry | tag | 0.5 | -0.3 |  |
| 16.900 | s05_gantry | hw_on | 0.6 | 0 |  |
| 17.450 | s05_gantry | lock | 0.8 | 0 |  |
| 17.450 | s05_gantry | type | 0.4 | 0 |  |
| 18.100 | s05_gantry | swing | 0.7 | 0 | 1.9 |
| 18.200 | s05_gantry | hum_rise | 0.8 | 0 | 1.8 |
| 20.000 | s06_tube | tube_open | 0.8 | 0 | 0.6 |
| 20.200 | s06_tube | anode_spin | 0.6 | 0.3 | 3.8 |
| 20.300 | s06_tube | type | 0.4 | 0 |  |
| 20.800 | s06_tube | tag | 0.5 | -0.4 |  |
| 21.400 | s06_tube | outline | 0.6 | -0.4 | 0.5 |
| 21.600 | s06_tube | tag | 0.5 | 0.4 |  |
| 24.050 | s07_filament | push_in | 0.6 | 0 | 2.4 |
| 24.500 | s07_filament | type | 0.4 | 0 |  |
| 25.200 | s07_filament | heat_hum | 0.8 | -0.2 | 2.6 |
| 26.900 | s07_filament | e_release | 0.5 | -0.2 | 0 |
| 27.040 | s07_filament | e_release | 0.5 | -0.14 | 1 |
| 27.180 | s07_filament | e_release | 0.5 | -0.08000000000000002 | 2 |
| 27.320 | s07_filament | e_release | 0.5 | -0.020000000000000018 | 3 |
| 27.460 | s07_filament | e_release | 0.5 | 0.03999999999999998 | 4 |
| 27.600 | s07_filament | e_release | 0.5 | 0.09999999999999998 | 5 |
| 27.740 | s07_filament | e_release | 0.5 | 0.15999999999999998 | 6 |
| 28.000 | s08_emission | heat_hum | 0.5 | -0.2 | 4 |
| 28.250 | s08_emission | e_release | 0.35 | -0.3 | 0 |
| 28.400 | s08_emission | type | 0.4 | 0 |  |
| 28.700 | s08_emission | lock | 0.9 | -0.1 |  |
| 28.750 | s08_emission | e_release | 0.35 | -0.21999999999999997 | 1 |
| 29.000 | s08_emission | track | 0.6 | 0 | 2.8 |
| 29.250 | s08_emission | e_release | 0.35 | -0.13999999999999999 | 2 |
| 29.750 | s08_emission | e_release | 0.35 | -0.06 | 3 |
| 30.250 | s08_emission | e_release | 0.35 | 0.020000000000000018 | 4 |
| 30.750 | s08_emission | e_release | 0.35 | 0.10000000000000003 | 5 |
| 31.250 | s08_emission | e_release | 0.35 | 0.18 | 6 |
| 31.750 | s08_emission | e_release | 0.35 | 0.26000000000000006 | 7 |
| 32.000 | s09_accel | pull_back | 0.6 | 0 | 1.3 |
| 32.500 | s09_accel | hv_on | 1 | 0 |  |
| 32.550 | s09_accel | type | 0.4 | 0 |  |
| 33.200 | s09_accel | accel_rise | 1 | 0 | 1.9 |
| 35.100 | s09_accel | hit_tick | 0.8 | 0.3 |  |
| 36.200 | s10_target | zoom_rush | 1 | 0 | 1.25 |
| 37.450 | s10_target | lattice_in | 0.8 | 0 | 1.6 |
| 37.700 | s10_target | type | 0.4 | 0 |  |
| 38.000 | s10_target | tag | 0.4 | 0 |  |
| 40.200 | s11_field | field_on | 0.6 | 0 | 0.6 |
| 40.400 | s11_field | type | 0.4 | 0 |  |
| 41.900 | s11_field | bend | 0.7 | -0.3 |  |
| 43.300 | s11_field | bend_low | 0.6 | 0.1 |  |
| 44.400 | s12_brems | photon_big | 1 | 0.3 |  |
| 44.500 | s12_brems | type | 0.4 | 0 |  |
| 44.600 | s12_brems | bar_fill | 0.5 | 0 |  |
| 45.400 | s12_brems | photon_tail | 0.5 | 0.5 | 1.6 |
| 48.150 | s13_heat | pull_back | 0.8 | 0 | 1.4 |
| 48.500 | s13_heat | heat_swell | 0.9 | 0 | 2.2 |
| 48.600 | s13_heat | type | 0.4 | 0 |  |
| 48.900 | s13_heat | photon | 0.35 | 0.2 |  |
| 49.500 | s13_heat | bar_fill | 0.6 | 0 |  |
| 49.540 | s13_heat | photon | 0.35 | -0.2 |  |
| 50.180 | s13_heat | photon | 0.35 | 0.3 |  |
| 50.820 | s13_heat | photon | 0.35 | -0.1 |  |
| 52.000 | s14_beam | beam_bed | 0.5 | 0 | 4 |
| 52.300 | s14_beam | type | 0.4 | 0 |  |
| 52.500 | s14_beam | filter_stop | 0.4 | 0.0007832169067114592 | 0 |
| 52.600 | s14_beam | tag | 0.4 | 0.4 |  |
| 52.900 | s14_beam | filter_stop | 0.4 | 0.15643990323878823 | 1 |
| 53.300 | s14_beam | filter_stop | 0.4 | -0.25269526792690156 | 2 |
| 53.500 | s14_beam | blades | 0.9 | 0 | 0.9 |
| 53.600 | s14_beam | tag | 0.4 | -0.4 |  |
| 53.700 | s14_beam | filter_stop | 0.4 | 0.04560454334132373 | 3 |
| 54.100 | s14_beam | filter_stop | 0.4 | -0.07063855435699225 | 4 |
| 54.500 | s14_beam | filter_stop | 0.4 | 0.0433202498126775 | 5 |
| 54.900 | s14_beam | filter_stop | 0.4 | -0.13008929220959545 | 6 |
| 55.300 | s14_beam | filter_stop | 0.4 | -0.19576755166053772 | 7 |
| 56.250 | s15_rotate | spin_motor | 0.8 | 0 | 3.6 |
| 56.400 | s15_rotate | type | 0.4 | 0 |  |
| 56.500 | s15_rotate | gantry_tick | 0.5 | 0 | 0 |
| 57.000 | s15_rotate | gantry_tick | 0.5 | 0.33658839392315865 | 1 |
| 57.500 | s15_rotate | gantry_tick | 0.5 | 0.3637189707302727 | 2 |
| 58.000 | s15_rotate | gantry_tick | 0.5 | 0.056448003223946885 | 3 |
| 58.500 | s15_rotate | gantry_tick | 0.5 | -0.3027209981231713 | 4 |
| 59.000 | s15_rotate | gantry_tick | 0.5 | -0.3835697098652554 | 5 |
| 59.500 | s15_rotate | gantry_tick | 0.5 | -0.11176619927957035 | 6 |
| 60.000 | s15_rotate | gantry_tick | 0.5 | 0.26279463948751564 | 7 |
| 60.250 | s16_iv | inject | 0.9 | -0.4 | 2.6 |
| 60.400 | s16_iv | type | 0.4 | 0 |  |
| 60.900 | s16_iv | push_in | 0.6 | 0 | 2.3 |
| 61.500 | s16_iv | cut_open | 0.7 | 0 | 0.7 |
| 61.700 | s16_iv | mix | 0.7 | -0.2 | 2.2 |
| 64.000 | s17_circ | flow_bed | 0.5 | -0.3 | 4 |
| 64.300 | s17_circ | type | 0.4 | 0 |  |
| 64.500 | s17_circ | heartbeat | 0.8 | 0 |  |
| 65.200 | s17_circ | tag | 0.4 | 0.4 |  |
| 65.500 | s17_circ | heartbeat | 0.8 | 0 |  |
| 65.700 | s17_circ | lung_whoosh | 0.6 | 0 | 0.8 |
| 65.900 | s17_circ | tag | 0.4 | 0.5 |  |
| 66.500 | s17_circ | heartbeat | 0.8 | 0 |  |
| 67.500 | s17_circ | heartbeat | 0.8 | 0 |  |
| 68.100 | s18_carotid | rise_flow | 0.7 | 0 | 3.4 |
| 68.400 | s18_carotid | type | 0.4 | 0 |  |
| 68.500 | s18_carotid | heartbeat | 0.7 | 0 |  |
| 69.500 | s18_carotid | heartbeat | 0.7 | 0 |  |
| 70.000 | s18_carotid | magnify | 0.8 | -0.4 |  |
| 70.500 | s18_carotid | heartbeat | 0.6 | 0 |  |
| 71.500 | s18_carotid | heartbeat | 0.6 | 0 |  |
| 72.000 | s19_fill | flow_bed | 0.6 | 0 | 4 |
| 72.050 | s19_fill | beat | 0.5 | 0 |  |
| 72.300 | s19_fill | fill_motif | 0.8 | 0.3 | 1.2 |
| 72.350 | s19_fill | type | 0.4 | 0 |  |
| 73.050 | s19_fill | beat | 0.5 | 0 |  |
| 73.900 | s19_fill | sac_fill | 0.9 | -0.4 | 1 |
| 74.050 | s19_fill | beat | 0.5 | 0 |  |
| 75.000 | s19_fill | outline | 0.7 | -0.2 | 0.5 |
| 75.050 | s19_fill | beat | 0.5 | 0 |  |
| 76.000 | s20_phase | curve_rise | 0.7 | 0 | 2.4 |
| 76.400 | s20_phase | type | 0.4 | 0 |  |
| 77.000 | s20_phase | window_slide | 0.7 | 0 | 1.5 |
| 78.550 | s20_phase | trigger | 1 | 0 |  |
| 78.600 | s20_phase | scan_fire | 0.8 | 0 |  |
| 80.300 | s21_molecule | type | 0.4 | 0 |  |
| 80.600 | s21_molecule | zoom_rush | 1 | 0 | 1.5 |
| 82.100 | s21_molecule | molecule_in | 0.8 | 0 | 0.6 |
| 82.850 | s21_molecule | select | 0.9 | 0.2 |  |
| 84.000 | s22_iodine | atom_bed | 0.6 | 0 | 4 |
| 84.350 | s22_iodine | type | 0.4 | 0 |  |
| 84.700 | s22_iodine | photon_in | 0.7 | -0.6 | 3.3 |
| 86.200 | s22_iodine | shell_glow | 0.6 | 0 |  |
| 88.000 | s23_photo | absorb | 1 | -0.1 |  |
| 88.020 | s23_photo | eject | 0.8 | 0.5 |  |
| 88.600 | s23_photo | type | 0.4 | 0 |  |
| 89.000 | s23_photo | vacancy_blink | 0.5 | -0.2 | 2.4 |
| 92.200 | s24_compton | inset_pop | 0.5 | 0.5 |  |
| 92.400 | s24_compton | type | 0.4 | 0 |  |
| 93.300 | s24_compton | scatter | 1 | 0.2 |  |
| 93.350 | s24_compton | recoil | 0.6 | 0.4 |  |
| 96.000 | s25_transmit | pull_back | 0.7 | 0 | 0.9 |
| 96.500 | s25_transmit | type | 0.4 | 0 |  |
| 97.000 | s25_transmit | stop_tick | 0.35 | -0.2 | 0 |
| 97.350 | s25_transmit | stop_tick | 0.35 | -0.2 | 1 |
| 97.700 | s25_transmit | stop_tick | 0.35 | -0.2 | 2 |
| 98.050 | s25_transmit | stop_tick | 0.35 | -0.2 | 3 |
| 98.400 | s25_transmit | arrive_tick | 0.4 | 0.6 | 0 |
| 98.400 | s25_transmit | stop_tick | 0.35 | -0.2 | 4 |
| 98.540 | s25_transmit | arrive_tick | 0.25 | 0.6 | 1 |
| 98.680 | s25_transmit | arrive_tick | 0.4 | 0.6 | 2 |
| 98.750 | s25_transmit | stop_tick | 0.35 | -0.2 | 5 |
| 98.820 | s25_transmit | arrive_tick | 0.25 | 0.6 | 3 |
| 98.960 | s25_transmit | arrive_tick | 0.4 | 0.6 | 4 |
| 99.100 | s25_transmit | arrive_tick | 0.25 | 0.6 | 5 |
| 99.240 | s25_transmit | arrive_tick | 0.4 | 0.6 | 6 |
| 99.380 | s25_transmit | arrive_tick | 0.25 | 0.6 | 7 |
| 99.520 | s25_transmit | arrive_tick | 0.4 | 0.6 | 8 |
| 99.660 | s25_transmit | arrive_tick | 0.25 | 0.6 | 9 |
| 99.800 | s25_transmit | arrive_tick | 0.4 | 0.6 | 10 |
| 99.940 | s25_transmit | arrive_tick | 0.25 | 0.6 | 11 |
| 100.000 | s26_arrive | track | 0.6 | 0 | 3.2 |
| 100.080 | s25_transmit | arrive_tick | 0.4 | 0.6 | 12 |
| 100.220 | s25_transmit | arrive_tick | 0.25 | 0.6 | 13 |
| 100.350 | s26_arrive | type | 0.4 | 0 |  |
| 100.360 | s25_transmit | arrive_tick | 0.4 | 0.6 | 14 |
| 100.500 | s25_transmit | arrive_tick | 0.25 | 0.6 | 15 |
| 100.640 | s25_transmit | arrive_tick | 0.4 | 0.6 | 16 |
| 100.780 | s25_transmit | arrive_tick | 0.25 | 0.6 | 17 |
| 100.800 | s26_arrive | arrive_tick | 0.5 | -0.8 | 0 |
| 100.920 | s25_transmit | arrive_tick | 0.4 | 0.6 | 18 |
| 101.000 | s26_arrive | arrive_tick | 0.3 | -0.6 | 1 |
| 101.060 | s25_transmit | arrive_tick | 0.25 | 0.6 | 19 |
| 101.200 | s25_transmit | arrive_tick | 0.4 | 0.6 | 20 |
| 101.200 | s26_arrive | arrive_tick | 0.3 | -0.4 | 2 |
| 101.340 | s25_transmit | arrive_tick | 0.25 | 0.6 | 21 |
| 101.400 | s26_arrive | arrive_tick | 0.5 | -0.2 | 3 |
| 101.600 | s26_arrive | arrive_tick | 0.3 | 0 | 4 |
| 101.800 | s26_arrive | arrive_tick | 0.3 | 0.2 | 5 |
| 102.000 | s26_arrive | arrive_tick | 0.5 | 0.4 | 6 |
| 102.200 | s26_arrive | arrive_tick | 0.3 | 0.6 | 7 |
| 102.400 | s26_arrive | arrive_tick | 0.3 | 0.8 | 8 |
| 102.600 | s26_arrive | arrive_tick | 0.5 | -0.8 | 9 |
| 102.800 | s26_arrive | arrive_tick | 0.3 | -0.6 | 10 |
| 103.000 | s26_arrive | arrive_tick | 0.3 | -0.4 | 11 |
| 103.200 | s26_arrive | arrive_tick | 0.5 | -0.2 | 12 |
| 103.400 | s26_arrive | arrive_tick | 0.3 | 0 | 13 |
| 103.550 | s26_arrive | land | 0.8 | 0 |  |
| 104.000 | s27_scint | det_bed | 0.5 | 0 | 4 |
| 104.300 | s27_scint | type | 0.4 | 0 |  |
| 105.350 | s27_scint | absorb_soft | 1 | 0.1 |  |
| 105.900 | s27_scint | tag | 0.4 | 0.5 |  |
| 108.200 | s28_light | sparkle | 0.8 | 0 | 0.6 |
| 108.400 | s28_light | type | 0.4 | 0 |  |
| 109.000 | s28_light | track | 0.4 | 0 | 2.6 |
| 109.300 | s28_light | light_land | 0.35 | -0.3 | 0 |
| 109.580 | s28_light | light_land | 0.35 | 0 | 1 |
| 109.860 | s28_light | light_land | 0.35 | 0.3 | 2 |
| 110.140 | s28_light | light_land | 0.35 | -0.3 | 3 |
| 110.420 | s28_light | light_land | 0.35 | 0 | 4 |
| 110.700 | s28_light | light_land | 0.35 | 0.3 | 5 |
| 110.980 | s28_light | light_land | 0.35 | -0.3 | 6 |
| 111.260 | s28_light | light_land | 0.35 | 0 | 7 |
| 112.000 | s29_diode | det_bed | 0.4 | 0 | 4 |
| 112.350 | s29_diode | pair | 0.4 | 0.32192946737632155 | 0 |
| 112.400 | s29_diode | type | 0.4 | 0 |  |
| 112.630 | s29_diode | pair | 0.4 | 0.5744664824567736 | 2 |
| 112.900 | s29_diode | charge_up | 0.6 | 0.5 | 2.8 |
| 112.910 | s29_diode | pair | 0.4 | 0.46416199347004294 | 4 |
| 113.000 | s29_diode | charge_down | 0.6 | -0.5 | 2.8 |
| 113.190 | s29_diode | pair | 0.4 | -0.48596603935584426 | 6 |
| 113.470 | s29_diode | pair | 0.4 | 0.39786013662815095 | 8 |
| 113.750 | s29_diode | pair | 0.4 | 0.061832870543003085 | 10 |
| 114.030 | s29_diode | pair | 0.4 | 0.0566828434355557 | 12 |
| 114.310 | s29_diode | pair | 0.4 | -0.4882943037897348 | 14 |
| 116.300 | s30_adc | integrate | 0.7 | -0.5 | 1.2 |
| 116.400 | s30_adc | type | 0.4 | 0 |  |
| 117.500 | s30_adc | bit | 0.45 | 0.6 | 0 |
| 117.560 | s30_adc | bit | 0.45 | 0.6 | 1 |
| 117.620 | s30_adc | bit | 0.45 | 0.6 | 2 |
| 117.680 | s30_adc | bit | 0.45 | 0.6 | 3 |
| 117.740 | s30_adc | bit | 0.45 | 0.6 | 4 |
| 117.800 | s30_adc | bit | 0.45 | 0.6 | 5 |
| 117.860 | s30_adc | bit | 0.45 | 0.6 | 6 |
| 117.920 | s30_adc | bit | 0.45 | 0.6 | 7 |
| 117.980 | s30_adc | bit | 0.45 | 0.6 | 8 |
| 118.040 | s30_adc | bit | 0.45 | 0.6 | 9 |
| 118.200 | s30_adc | pull_back | 0.7 | 0 | 1.6 |
| 118.600 | s30_adc | data_tick | 0.3 | -0.75 | 0 |
| 118.800 | s30_adc | data_tick | 0.3 | -0.5 | 1 |
| 119.000 | s30_adc | data_tick | 0.3 | -0.25 | 2 |
| 119.200 | s30_adc | data_tick | 0.3 | 0 | 3 |
| 119.400 | s30_adc | data_tick | 0.3 | 0.25 | 4 |
| 119.600 | s30_adc | data_tick | 0.3 | 0.5 | 5 |
| 120.350 | s31_angles | type | 0.4 | 0 |  |
| 120.350 | s31_angles | capture_click | 0.8 | -0.625 | 0 |
| 120.900 | s31_angles | capture_click | 0.8 | -0.375 | 1 |
| 121.450 | s31_angles | capture_click | 0.8 | -0.125 | 2 |
| 122.000 | s31_angles | capture_click | 0.8 | 0.125 | 3 |
| 122.550 | s31_angles | capture_click | 0.8 | 0.375 | 4 |
| 123.100 | s31_angles | capture_click | 0.8 | 0.625 | 5 |
| 124.300 | s32_sinogram | build_rise | 0.6 | 0 | 3.2 |
| 124.350 | s32_sinogram | type | 0.4 | 0 |  |
| 124.400 | s32_sinogram | row_tick | 0.35 | 0.2 | 0 |
| 124.650 | s32_sinogram | row_tick | 0.35 | 0.1 | 1 |
| 124.900 | s32_sinogram | row_tick | 0.35 | 0 | 2 |
| 125.150 | s32_sinogram | row_tick | 0.35 | -0.10000000000000003 | 3 |
| 125.400 | s32_sinogram | row_tick | 0.35 | 0.2 | 4 |
| 125.650 | s32_sinogram | row_tick | 0.35 | 0.1 | 5 |
| 125.900 | s32_sinogram | row_tick | 0.35 | 0 | 6 |
| 126.000 | s32_sinogram | tag | 0.4 | -0.4 |  |
| 126.150 | s32_sinogram | row_tick | 0.35 | -0.10000000000000003 | 7 |
| 126.400 | s32_sinogram | row_tick | 0.35 | 0.2 | 8 |
| 126.650 | s32_sinogram | row_tick | 0.35 | 0.1 | 9 |
| 126.900 | s32_sinogram | row_tick | 0.35 | 0 | 10 |
| 127.150 | s32_sinogram | row_tick | 0.35 | -0.10000000000000003 | 11 |
| 127.400 | s32_sinogram | row_tick | 0.35 | 0.2 | 12 |
| 128.150 | s33_recon | smear | 0.8 | 0 | 0.7 |
| 128.350 | s33_recon | type | 0.4 | 0 |  |
| 128.900 | s33_recon | assemble_hit | 0.5 | -0.25 | 0 |
| 129.200 | s33_recon | assemble_hit | 0.55 | 0.25 | 1 |
| 129.500 | s33_recon | assemble_hit | 0.6 | -0.25 | 2 |
| 129.800 | s33_recon | assemble_hit | 0.65 | 0.25 | 3 |
| 130.100 | s33_recon | assemble_hit | 0.7 | -0.25 | 4 |
| 130.400 | s33_recon | assemble_hit | 0.75 | 0.25 | 5 |
| 130.700 | s33_recon | assemble_hit | 0.8 | -0.25 | 6 |
| 131.000 | s33_recon | recon_complete | 1 | 0.25 | 7 |
| 132.000 | s34_gray | reveal | 0.9 | 0 |  |
| 132.300 | s34_gray | push_in | 0.5 | 0 | 2.6 |
| 132.350 | s34_gray | type | 0.4 | 0 |  |
| 133.400 | s34_gray | probe | 0.8 | -0.3 |  |
| 133.900 | s34_gray | slide | 0.6 | 0 | 0.7 |
| 134.600 | s34_gray | land | 0.6 | 0.2 |  |
| 136.000 | s35_volume | orbit | 0.5 | 0 | 4 |
| 136.100 | s35_volume | stack_click | 0.5 | -0.75 | 0 |
| 136.225 | s35_volume | stack_click | 0.5 | -0.625 | 1 |
| 136.350 | s35_volume | type | 0.4 | 0 |  |
| 136.350 | s35_volume | stack_click | 0.5 | -0.5 | 2 |
| 136.475 | s35_volume | stack_click | 0.5 | -0.375 | 3 |
| 136.600 | s35_volume | stack_click | 0.5 | -0.25 | 4 |
| 136.725 | s35_volume | stack_click | 0.5 | -0.125 | 5 |
| 136.850 | s35_volume | stack_click | 0.5 | 0 | 6 |
| 136.975 | s35_volume | stack_click | 0.5 | 0.125 | 7 |
| 137.100 | s35_volume | stack_click | 0.5 | 0.25 | 8 |
| 137.225 | s35_volume | stack_click | 0.5 | 0.375 | 9 |
| 137.350 | s35_volume | stack_click | 0.5 | 0.5 | 10 |
| 137.475 | s35_volume | stack_click | 0.5 | 0.625 | 11 |
| 137.900 | s35_volume | trace | 0.8 | -0.3 | 1.4 |
| 140.300 | s36_mpr | type | 0.4 | 0 |  |
| 140.600 | s36_mpr | click | 0.7 | -0.3 | 0 |
| 140.600 | s36_mpr | slide | 0.5 | 0 | 1.6 |
| 141.400 | s36_mpr | click | 0.7 | 0 | 1 |
| 142.200 | s36_mpr | click | 0.8 | 0.3 | 2 |
| 144.300 | s37_mip | type | 0.4 | 0 |  |
| 144.500 | s37_mip | trace | 0.8 | -0.2 | 2.6 |
| 147.100 | s37_mip | arrive | 0.6 | -0.4 |  |
| 148.000 | s38_vr | reveal_sweep | 0.8 | 0 | 0.8 |
| 148.300 | s38_vr | type | 0.4 | 0 |  |
| 148.600 | s38_vr | orbit | 0.4 | 0 | 3.2 |
| 149.000 | s38_vr | click | 0.4 | 0.6 |  |
| 152.300 | s39_inspect | type | 0.4 | 0 |  |
| 152.300 | s39_inspect | mouse_move | 0.5 | 0.4 | 1.4 |
| 154.000 | s39_inspect | click | 1 | -0.2 |  |
| 154.000 | s39_inspect | focus_hit | 1 | -0.3 |  |
| 154.300 | s39_inspect | inset_pop | 0.6 | 0.4 |  |
| 156.300 | s40_shape | type | 0.4 | 0 |  |
| 156.500 | s40_shape | annot | 0.8 | -0.3 | 0 |
| 157.300 | s40_shape | annot | 0.8 | -0.2 | 1 |
| 158.100 | s40_shape | annot | 0.8 | 0.2 | 2 |
| 160.000 | s41_dose | calm_pad | 0.6 | 0 | 4 |
| 160.400 | s41_dose | type | 0.4 | 0 |  |
| 160.700 | s41_dose | ionize | 0.5 | 0 |  |
| 161.500 | s41_dose | pull_back | 0.6 | 0 | 0.6 |
| 161.600 | s41_dose | spin_motor | 0.5 | 0 | 2.3 |
| 164.000 | s42_kidney | calm_pad | 0.5 | 0 | 4 |
| 164.350 | s42_kidney | type | 0.4 | 0 |  |
| 164.600 | s42_kidney | clear_flow | 0.7 | 0 | 2.8 |
| 165.000 | s42_kidney | tag | 0.4 | 0.4 |  |
| 165.600 | s42_kidney | card_pop | 0.6 | -0.5 |  |
| 166.300 | s42_kidney | check | 0.9 | -0.5 |  |
| 168.000 | s43_limits | pause_pad | 0.5 | 0 | 4 |
| 168.350 | s43_limits | type | 0.4 | 0 |  |
| 168.600 | s43_limits | question | 0.6 | -0.3 |  |
| 169.000 | s43_limits | smear | 0.5 | 0.2 | 0.8 |
| 170.000 | s43_limits | card_slide | 0.7 | 0.5 |  |
| 172.000 | s44_care | warm_pad | 0.6 | 0 | 4 |
| 172.300 | s44_care | paper_slide | 0.6 | -0.4 | 1.4 |
| 172.350 | s44_care | type | 0.4 | 0 |  |
| 173.600 | s44_care | paths_open | 0.8 | 0 | 0.6 |
| 173.700 | s44_care | paper_land | 0.6 | 0 |  |
| 174.250 | s44_care | tag | 0.4 | -0.5 |  |
| 174.375 | s44_care | tag | 0.4 | 0.5 |  |
| 176.000 | s45_loop | warm_pad | 0.5 | 0 | 2 |
| 176.200 | s45_loop | push_in | 0.7 | 0 | 1.6 |
| 176.900 | s45_loop | type | 0.4 | 0 |  |
| 177.000 | s45_loop | curious | 0.7 | -0.2 | 0 |
| 177.300 | s45_loop | ring | 0.7 | -0.3 |  |
| 177.500 | s45_loop | curious | 0.6 | 0.2 | 1 |
| 179.000 | s45_loop | resolve_rise | 0.8 | 0 | 1 |
