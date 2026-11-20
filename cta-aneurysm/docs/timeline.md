# Editing timeline

The film is assembled by the engine in one pass (no external editor): `engine/film.js` lists the 45 scenes, each exactly 4.000 s; a scene with `xin` dissolves in from the previous scene's last frame with an ordered dither. Text is the editor layer (`engine/lib/cap.js`), off in the textless version (`?notext=1`). Audio is one stereo mix (`tools/synth_audio.py`) laid on the picture from frame 0.

| # | In | Out | Scene | Transition in | Camera | Label (AZ) | Music |
|---|---|---|---|---|---|---|---|
| 1 | 000.00 | 004.00 | `s01_hook` | cut | 缓推 slow push | BUNU NECƏ GÖRMƏK OLAR? | curiosity |
| 2 | 004.00 | 008.00 | `s02_bulge` | dither dissolve 0.35 s | 停 hold | ANEVRİZMA | curiosity |
| 3 | 008.00 | 012.00 | `s03_skull` | cut | 拉远 pull out | KƏLLƏ DAXİLİNDƏ | curiosity |
| 4 | 012.00 | 016.00 | `s04_cta` | dither dissolve 0.40 s | 横移 pan / track | KT-ANGİOQRAFİYA | curiosity |
| 5 | 016.00 | 020.00 | `s05_gantry` | dither dissolve 0.30 s | 缓推 slow push | RENTGEN MƏNBƏYİ | curiosity |
| 6 | 020.00 | 024.00 | `s06_tube` | dither dissolve 0.30 s | 停 hold | VAKUUM BORUSU | the tube's techno groove (pulse bass, stabs, pluck hook) |
| 7 | 024.00 | 028.00 | `s07_filament` | cut | 缓推 slow push | İSTİLİK → ELEKTRONLAR | the tube's techno groove (pulse bass, stabs, pluck hook) |
| 8 | 028.00 | 032.00 | `s08_emission` | dither dissolve 0.25 s | 横移 pan / track | TERMOELEKTRON EMİSSİYASI | the tube's techno groove (pulse bass, stabs, pluck hook) |
| 9 | 032.00 | 036.00 | `s09_accel` | cut | 拉远 pull out | GƏRGİNLİK → SÜRƏT | the tube's techno groove (pulse bass, stabs, pluck hook) |
| 10 | 036.00 | 040.00 | `s10_target` | cut | 快推 fast push (accent) | VOLFRAM HƏDƏF | the tube's techno groove (pulse bass, stabs, pluck hook) |
| 11 | 040.00 | 044.00 | `s11_field` | cut | 停 hold | NÜVƏ SAHƏSİNDƏ ƏYİLİR | bullet time in half time with a wobble bass |
| 12 | 044.00 | 048.00 | `s12_brems` | cut | 停 hold | TORMOZLANMA ŞÜALANMASI | bullet time in half time with a wobble bass |
| 13 | 048.00 | 052.00 | `s13_heat` | cut | 拉远 pull out | ENERJİNİN ÇOXU — İSTİLİK | bullet time in half time with a wobble bass |
| 14 | 052.00 | 056.00 | `s14_beam` | dither dissolve 0.20 s | 横移 pan / track | FİLTR VƏ KOLLİMATOR | bullet time in half time with a wobble bass |
| 15 | 056.00 | 060.00 | `s15_rotate` | dither dissolve 0.30 s | 停 hold | ÇOX BUCAQDAN ÖLÇMƏ | bullet time in half time with a wobble bass |
| 16 | 060.00 | 064.00 | `s16_iv` | dither dissolve 0.30 s | 缓推 slow push | KONTRAST QOL VENASINA | flow |
| 17 | 064.00 | 068.00 | `s17_circ` | dither dissolve 0.35 s | 停 hold | QAN DÖVRANI İLƏ | flow |
| 18 | 068.00 | 072.00 | `s18_carotid` | cut | 横移 pan / track | BEYİN ARTERİYALARINA | flow |
| 19 | 072.00 | 076.00 | `s19_fill` | dither dissolve 0.30 s | 停 hold | KONTRAST LÜMENİ DOLDURUR | flow |
| 20 | 076.00 | 080.00 | `s20_phase` | dither dissolve 0.30 s | 拉远 pull out | ARTERİAL FAZA | flow |
| 21 | 080.00 | 084.00 | `s21_molecule` | dither dissolve 0.25 s | 快推 fast push (accent) | YODLU KONTRAST | the dive riser, a breakdown on the iodine atom, silence, the drop on photoelectric absorption at 88.0 s |
| 22 | 084.00 | 088.00 | `s22_iodine` | dither dissolve 0.30 s | 停 hold | YOD: ATOM NÖMRƏSİ 53 | the dive riser, a breakdown on the iodine atom, silence, the drop on photoelectric absorption at 88.0 s |
| 23 | 088.00 | 092.00 | `s23_photo` | cut | 停 hold | FOTOELEKTRİK UDULMA | the dive riser, a breakdown on the iodine atom, silence, the drop on photoelectric absorption at 88.0 s |
| 24 | 092.00 | 096.00 | `s24_compton` | dither dissolve 0.30 s | 停 hold | KOMPTON SƏPİLMƏSİ | the dive riser, a breakdown on the iodine atom, silence, the drop on photoelectric absorption at 88.0 s |
| 25 | 096.00 | 100.00 | `s25_transmit` | dither dissolve 0.25 s | 拉远 pull out | YOD ZƏİFLƏMƏNİ ARTIRIR | the dive riser, a breakdown on the iodine atom, silence, the drop on photoelectric absorption at 88.0 s |
| 26 | 100.00 | 104.00 | `s26_arrive` | dither dissolve 0.25 s | 横移 pan / track | KEÇƏN ŞÜA ÖLÇÜLÜR | ordered conversion |
| 27 | 104.00 | 108.00 | `s27_scint` | dither dissolve 0.30 s | 停 hold | SSİNTİLYATOR | ordered conversion |
| 28 | 108.00 | 112.00 | `s28_light` | cut | 横移 pan / track | RENTGEN → GÖRÜNƏN İŞIQ | ordered conversion |
| 29 | 112.00 | 116.00 | `s29_diode` | dither dissolve 0.30 s | 停 hold | İŞIQ → ELEKTRİK YÜKÜ | ordered conversion |
| 30 | 116.00 | 120.00 | `s30_adc` | cut | 拉远 pull out | SİQNAL → RƏQƏM | ordered conversion |
| 31 | 120.00 | 124.00 | `s31_angles` | dither dissolve 0.30 s | 停 hold | HƏR BUCAQ — YENİ GÖRÜNÜŞ | the reconstruction build (machine knocks, rising hits per doubling of views), held breath, the main drop on the grayscale image at 132 s |
| 32 | 124.00 | 128.00 | `s32_sinogram` | dither dissolve 0.30 s | 横移 pan / track | PROYEKSİYA MƏLUMATLARI | the reconstruction build (machine knocks, rising hits per doubling of views), held breath, the main drop on the grayscale image at 132 s |
| 33 | 128.00 | 132.00 | `s33_recon` | cut | 停 hold | REKONSTRUKSİYA | the reconstruction build (machine knocks, rising hits per doubling of views), held breath, the main drop on the grayscale image at 132 s |
| 34 | 132.00 | 136.00 | `s34_gray` | cut | 缓推 slow push | ZƏİFLƏMƏ → BOZ TON | the reconstruction build (machine knocks, rising hits per doubling of views), held breath, the main drop on the grayscale image at 132 s |
| 35 | 136.00 | 140.00 | `s35_volume` | dither dissolve 0.30 s | 横移 pan / track | KƏSİKLƏR → HƏCM | the reconstruction build (machine knocks, rising hits per doubling of views), held breath, the main drop on the grayscale image at 132 s |
| 36 | 140.00 | 144.00 | `s36_mpr` | dither dissolve 0.30 s | 停 hold | ÜÇ MÜSTƏVİ | discovery |
| 37 | 144.00 | 148.00 | `s37_mip` | dither dissolve 0.30 s | 横移 pan / track | ARTERİYALARI İZLƏMƏK | discovery |
| 38 | 148.00 | 152.00 | `s38_vr` | dither dissolve 0.35 s | 停 hold | DAMARIN FORMASI | discovery |
| 39 | 152.00 | 156.00 | `s39_inspect` | cut | 快推 fast push (accent) | QABARIQLIĞA BAXIŞ | discovery |
| 40 | 156.00 | 160.00 | `s40_shape` | dither dissolve 0.30 s | 停 hold | ÖLÇÜ • BOYUN • ŞAXƏLƏR | discovery |
| 41 | 160.00 | 164.00 | `s41_dose` | dither dissolve 0.30 s | 拉远 pull out | ƏSASLI, OPTİMAL DOZA | calm |
| 42 | 164.00 | 168.00 | `s42_kidney` | dither dissolve 0.35 s | 停 hold | KONTRAST TƏHLÜKƏSİZLİYİ | calm |
| 43 | 168.00 | 172.00 | `s43_limits` | dither dissolve 0.30 s | 停 hold | KİÇİK TAPINTILAR ÇƏTİNDİR | calm |
| 44 | 172.00 | 176.00 | `s44_care` | dither dissolve 0.30 s | 拉远 pull out | QƏRAR ÜÇÜN MƏLUMAT | calm |
| 45 | 176.00 | 180.00 | `s45_loop` | dither dissolve 0.30 s | 缓推 slow push | BUNU NECƏ GÖRMƏK OLAR? | calm |

Opening and closing frames: `docs/frame_open.png` (0.000 s) and `docs/frame_close.png` (179.983 s) are the same composition; the music's last bar is the A-major turnaround into the opening hit, and the mix's ringing tail is folded back onto its start, so the file loops.
