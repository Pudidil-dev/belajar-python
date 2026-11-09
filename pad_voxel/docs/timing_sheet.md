# Scene timing sheet — for the Azerbaijani voice-over

63.000 s · 21 scenes × 3.000 s · 60 fps (scene *n* = frames 180·(n−1) … 180·n − 1) · music 80 BPM: one bar per scene, a beat every 0.75 s.

- **Narration concept** is a short English idea for the translator, not a script. Each scene leaves room for about **2.5 s of speech** (start ~0.25 s after the cut, end before the next one); scenes 15–16 have no text on screen and can carry one longer sentence across both.
- **Text placeholder** is what the labeled version shows (key in `src/04_labels_en.js`), with the time it is on screen. The clean version shows no text.
- The soundtrack is a quiet bed (full mix −22 LUFS): a voice-over at about −16 LUFS sits clearly above it. Music-only and SFX-only stems are delivered too.

| Scene | Time | Visual purpose | Narration concept (EN) | Text placeholder (key: text, on screen) |
|---|---|---|---|---|
| **S01** WALKING | 0:00.0–0:03.0 | A middle-aged man walks with a steady stride (framed neck-down, right side to camera). Sets up the everyday situation. | When walking brings on calf pain… | `s01`: Pain while walking? (optional) (0:00.75–0:02.85) |
| **S02** THE PATIENT STOPS | 0:03.0–0:06.0 | His stride shortens; he stops, bends and holds his right calf; an orange glow marks the painful muscle. | …until he has to stop: the calf hurts. | — |
| **S03** ENTER THE LEG | 0:06.0–0:09.0 | Skin, then muscle turn see-through; the camera rises along the artery to the thigh and dives into it. | The cause is not the muscle, but the arteries that feed it. | — |
| **S04** NORMAL REFERENCE | 0:09.0–0:12.0 | A healthy artery cut lengthwise: smooth lining, layered wall, wide channel, cells flowing freely. | A healthy artery: a smooth lining and a wide channel. | `s04`: Normal artery (0:09.38–0:11.85) |
| **S05** CHRONIC HIGH GLUCOSE | 0:12.0–0:15.0 | Glucose molecules multiply in the blood with each beat; an hourglass marks years. Glucose stays dissolved — no plug. | In diabetes, blood glucose stays high for years. | `s05`: Chronic high glucose (0:12.38–0:14.85) |
| **S06** ENDOTHELIAL DYSFUNCTION | 0:15.0–0:18.0 | Close on the lining: its cells lose their order (orange patches); white blood cells roll and stick. | This slowly damages the artery's inner lining. | `s06`: Endothelial dysfunction (0:15.38–0:17.85) |
| **S07** PLAQUE FORMATION | 0:18.0–0:21.0 | Lipid slips under the lining into the wall; a macrophage becomes a foam cell; the wall begins to bulge. | Fat and inflammatory cells build plaque inside the wall. | `s07`: Plaque builds in the wall (0:18.38–0:20.85) |
| **S08** CHRONIC PROGRESSION | 0:21.0–0:24.0 | Same view as scene 4: the plaque grows, white calcium appears in it, the channel narrows. Hourglass again. | Over the years it grows, calcifies and narrows the channel. | `s08`: Progression over time (0:21.38–0:23.85) |
| **S09** STENOSIS | 0:24.0–0:27.0 | Normal and narrowed artery side by side at the same scale: fewer cells, a fast jet through the open but narrow channel. | A stenosis: the channel is narrow, and less blood gets through. | `s09`: STENOSIS (0:24.38–0:26.85) |
| **S10** OCCLUSION | 0:27.0–0:30.0 | Further down the same artery: the channel is filled end to end; blood stands still above it; the wall outline remains. | Further down, the artery can close completely: an occlusion. | `s10`: OCCLUSION (0:28.13–0:29.85) |
| **S11** COLLATERAL BYPASS | 0:30.0–0:33.0 | Small side channels widen and carry a thin stream around the block; the block itself stays closed. | Small side branches widen and carry some blood around it — not enough. | `s11`: Collateral flow (0:30.38–0:32.85) |
| **S12** WALKING INCREASES DEMAND | 0:33.0–0:36.0 | He walks again; see-through calf muscles glow orange with each step; the demand bar climbs past the fixed supply mark. | Walking makes the calf need more oxygen than the arteries can deliver. | `s12 / s12demand / s12supply`: Demand exceeds supply / Demand / Supply (0:33.38–0:35.85) |
| **S13** REST RELIEVES THE SYMPTOM | 0:36.0–0:39.0 | He stands still and straightens; the glow fades; demand falls below supply. The lesions are unchanged. | Rest lowers the demand and the pain eases — the narrowings remain. | `s13`: Rest reduces demand (0:36.38–0:38.85) |
| **S14** CT ANGIOGRAPHY | 0:39.0–0:42.0 | The patient slides into the CT scanner; contrast is injected into an arm vein. | CT angiography shows exactly where the arteries are narrowed or blocked. | `s14`: CT angiography (0:39.38–0:41.85) |
| **S15** CONTRAST CIRCULATION | 0:42.0–0:45.0 | The white-blue contrast front travels arm vein → heart → lungs → heart → aorta (teaching colour). | The contrast passes through the heart and lungs into the aorta… | — |
| **S16** PELVIS-TO-FOOT FILLING | 0:45.0–0:48.0 | Contrast fills both legs from pelvis to feet; the right leg below the block fills later, through collaterals. | …and fills the leg arteries down to the feet. | — |
| **S17** CTA RECONSTRUCTION | 0:48.0–0:51.0 | Ivory 3D reconstruction (volume rendering) of both legs' arteries with faint bones, slowly turning; R/L orientation marks. | The scan becomes a three-dimensional map of the arteries. | `s17 / s17right / s17left`: Arterial reconstruction / R / L (0:48.38–0:50.85) |
| **S18** STENOSIS ON CTA | 0:51.0–0:54.0 | Fast push to the thigh artery: a thin but continuous channel with bright calcium; an axial slice beside it. | In the thigh: a calcified narrowing, still open. | `s18`: STENOSIS (0:51.38–0:53.85) |
| **S19** OCCLUSION ON CTA | 0:54.0–0:57.0 | Down to behind the knee: the bright contrast column stops; a faint outline keeps the course; collaterals bridge the gap. | Behind the knee: a complete block, bridged by small collaterals. | `s19`: OCCLUSION (0:54.38–0:56.85) |
| **S20** NORMAL VERSUS DIABETIC PAD | 0:57.0–1:00.0 | A normal leg artery tree and this patient's right leg, side by side at the same scale and angle. | Next to a normal leg, the damage is clear. | `s20normal / s20pad`: Normal / Diabetic PAD (0:57.38–1:03.0) |
| **S21** FINAL DIAGNOSTIC IMAGE | 1:00.0–1:03.0 | Both trees turn slightly together; the stenosis, the occlusion and the collateral route light up in turn; title. | The diagnosis: diabetic peripheral arterial disease. | `s21`: Diabetic Peripheral Arterial Disease (1:00.38–1:03.0) |

Frame-exact boundaries: S01 0–179, S02 180–359, … S21 3600–3779. The same table as CSV: `docs/timing_sheet.csv`.
