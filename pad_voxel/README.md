# How Diabetes Damages Leg Arteries — 3D voxel pixel-art medical animation (code project)

**From walking pain to CT angiography.** A 63-second, 9:16, 60 fps medical animation in 3D voxel pixel art.
- **The symptom:** a man walks, slows, stops and holds his right calf. The view passes through the skin and muscle to the arteries and dives into the thigh artery.
- **The disease in the wall:** a normal artery; years of high glucose; a damaged lining; plaque building inside the wall; calcification and narrowing.
- **The consequences:** a stenosis (a narrow but open channel with a faster jet) and, farther down, an occlusion (no passage, the wall outline intact) bypassed by collateral side channels; walking raises the calf's demand above the limited supply, and rest lowers it again while the lesions stay.
- **The diagnosis:** CT angiography, with contrast traveling from the arm vein through the heart and lungs to the legs; the grey 3D reconstruction; the stenosis and the occlusion on CTA. The film ends on a normal leg tree beside this patient's: **Diabetic Peripheral Arterial Disease**.

Not a loop: the film ends on the diagnosis. English placeholder labels, all in one editable file, and a clean version without text. No narration: the soundtrack is a quiet bed for an Azerbaijani voice-over to be added later. Music and SFX are delivered separately.

![Storyboard: one frame per scene](docs/storyboard.png)

| | |
|---|---|
| Video | 1080×1920, 60 fps, exactly 3,780 frames (63.000 s), H.264 High, yuv420p, BT.709. Drawn on a **540×960 voxel grid** and scaled **exactly 2× nearest-neighbour**. Every model is built from cubes: flat-shaded faces, ambient occlusion, 1-px outlines. No anti-aliasing, blur or glow; see-through layers use ordered dither. |
| Structure | 21 scenes × 3.000 s, one bar of music each (80 BPM). Every picture event sits on the beat or the eighth-note grid, and every SFX starts on its picture event. |
| Audio | Original restrained cinematic-electronic score in D minor, plus 72 SFX read from the picture's event table. Full mix **−22.0 LUFS** integrated, true peak −5.7 dBTP: a bed that a voice-over at about −16 LUFS sits clearly above. Under 8 % of the energy is in the 1–4 kHz speech band. No constant heartbeat and no alarms. The last 0.5 s fades to silence. |
| Text | English placeholders from `src/04_labels_en.js` only: one caption at a time in a band at the top; two large key terms (STENOSIS / OCCLUSION); small labels (Demand / Supply, R / L, Normal / Diabetic PAD); the final title. The **clean** version renders without any text but keeps the graphics (bars, hourglass, CTA frame, axial inset, lesion brackets). |

## Render it yourself

Requirements: **Node ≥ 18**, **ffmpeg** with libx264 and AAC, and **Python 3** with **numpy** and **scipy** (for mastering). No browser and no GPU are needed: the frames are computed in Node.

```
cd pad_voxel
node tools/export.js            # everything: both text versions × four mixes, plus three WAV stems
```

That writes:

| File | Text | Sound |
|---|---|---|
| `output/Diabetic_PAD_CTA_Labeled.mp4` | English labels | music + SFX |
| `output/Diabetic_PAD_CTA_Labeled_No_Music.mp4` | English labels | SFX only — no background music |
| `output/Diabetic_PAD_CTA_Labeled_No_SFX.mp4` | English labels | music only — no SFX |
| `output/Diabetic_PAD_CTA_Labeled_Silent.mp4` | English labels | no audio track |
| `output/Diabetic_PAD_CTA_Clean.mp4` | none | music + SFX |
| `output/Diabetic_PAD_CTA_Clean_No_Music.mp4` | none | SFX only |
| `output/Diabetic_PAD_CTA_Clean_No_SFX.mp4` | none | music only |
| `output/Diabetic_PAD_CTA_Clean_Silent.mp4` | none | no audio track |
| `output/audio/Diabetic_PAD_CTA_Full_Mix.wav`, `…_Music_Only.wav`, `…_SFX_Only.wav` | — | 24-bit / 48 kHz stems |

Only some variants:
```
node tools/export.js --text labeled                 # only the four labeled MP4s
node tools/export.js --text clean                   # only the four clean MP4s (no text)
node tools/export.js --mix full                     # music + SFX only (both text versions)
node tools/export.js --mix nobgm                    # _No_Music (SFX only)
node tools/export.js --mix nosfx                    # _No_SFX (music only)
node tools/export.js --mix silent                   # _Silent (no audio)
node tools/export.js --text clean --mix full,silent # combine: comma-separated mixes
node tools/export.js --audio-only                   # only the three WAV stems
node tools/export.js --video-only                   # only the silent pictures build/video_labeled.mp4, build/video_clean.mp4
node tools/export.js --rerender                     # render the pictures again even if they are current
```
Each frame is drawn **once**: the clean frame first, then the text on top of a copy, so both versions come from the
same pixels. The pictures are kept in `build/` with a fingerprint of the sources, so another mix later only
re-muxes (seconds). In a sandbox test on 4 cores, both text versions with two mixes took under 4 minutes; all eight
MP4s take only a few seconds more (re-muxing). All audio versions share **one common gain** (`tools/master.py`), so
the music-only and SFX-only stems sit exactly as loud as they do in the full mix and sum back to it.

### Translating the labels (Azerbaijani)

All on-screen text lives in `src/04_labels_en.js`. The pixel font has the Azerbaijani letters ə ğ ı İ ö ü ş ç
(upper and lower case).
```
cp src/04_labels_en.js labels_az.js      # translate the strings in labels_az.js (keep the keys)
node tools/export.js --text labeled --labels labels_az.js   # → output/Diabetic_PAD_CTA_Labeled_az*.mp4
node tools/stills.js check_az.png 10 25 52 62 --labels labels_az.js   # quick look before rendering
```
Long words wrap onto a second line automatically. The two key terms switch to the caption font if the title font
lacks a letter. Bar labels step down a size if they are too wide.

### Preview and stills

- `index.html` is a self-contained player. Open it in a browser: Space plays or pauses, ←/→ seek, **T** toggles the labels (the clean version), M mutes. `node tools/build.js` rebuilds it.
- `node tools/stills.js out.png 10.5 25.5 62.9 --scale 2 [--clean]` makes a contact sheet of any frames.
- `node tools/refs.js` regenerates the reference images in `docs/`.

## Deliverables in this folder

| Brief item | Where |
|---|---|
| 1. 63-s animation | `node tools/export.js` → `output/Diabetic_PAD_CTA_Labeled.mp4` (and the other mixes) |
| 2. Clean version without text | `output/Diabetic_PAD_CTA_Clean*.mp4` (`--text clean`) |
| 3. Version with editable English labels | `output/Diabetic_PAD_CTA_Labeled*.mp4`; labels in `src/04_labels_en.js`, `--labels` for translations |
| 4. Music-only track | `output/audio/Diabetic_PAD_CTA_Music_Only.wav` (+ `_No_SFX.mp4` videos) |
| 5. SFX-only track | `output/audio/Diabetic_PAD_CTA_SFX_Only.wav` (+ `_No_Music.mp4` videos) |
| 6. Scene timing sheet for the Azerbaijani VO | `docs/timing_sheet.md`, `docs/timing_sheet.csv` |
| 7. Patient and anatomy references | `docs/patient_reference.png`, `docs/anatomy_reference.png` |
| 8. Lesion continuity map | `docs/lesion_map.png`, `docs/LESION_MAP.md` |
| 9. Storyboard and scene prompts | `docs/storyboard.png`, `docs/STORYBOARD.md`, shot list `镜头表.md` |
| 10. Final normal-vs-diabetic-PAD still | `docs/final_still_labeled.png`, `docs/final_still_clean.png` (1080×1920) |

## Medical accuracy kept in every scene

- **Chronic PAD only:** no embolus, acute ischaemia, ulcer, gangrene, amputation, balloon, stent or bypass surgery.
- **One patient, one map:** the same patient (neck-down, face never shown) and the same right leg throughout, with one fixed lesion map (`docs/LESION_MAP.md`). The SFA stenosis (L1), the popliteal occlusion (L2), the genicular collaterals and the below-knee disease (L3) sit at the same places in every view, and the below-knee branching is correct.
- **Glucose:** stays dissolved in the blood and never forms a plug.
- **Plaque:** stays inside the wall, under the lining.
- **Calcium:** opaque white, and distinct from contrast (on CTA it is the brightest grey, with a dark rim).
- **Stenosis:** keeps a continuous channel, with a faster jet through it.
- **Occlusion:** has no passage and keeps its wall outline.
- **Collaterals:** bypass the occlusion; they never reopen it.
- **Rest:** lowers demand; the lesions stay as they are.
- **CTA:** only diagnoses. The white-blue contrast colour is a teaching overlay.
- **No numbers anywhere.**
- **Drawing convention:** calibres are exaggerated so the arteries stay legible on a phone (2.3× in the leg, 3.45× in the whole-tree views).

## QA (numbers, not a substitute for watching it)

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint` (green): 21 shots, 63 s, no text-led shots.
- **Film gate** (the skill's `film_gate.py`, run on a sandbox test export `Diabetic_PAD_CTA_Labeled.mp4` at 1080×1920 / 60 fps — the MP4 itself is not in the repository): all three gates green.
  - Fast-motion frames 30.5 % (red below 3.5 %).
  - No empty frames; 0 % blue-purple frames.
  - Worst 30-s window: 16.3 %.
  - 15 shots, average 4.2 s.
  - One yellow notice: about 8.6 push-ins per minute. Checked against the shot list: every push is answered by a pull-back or a lateral move (S02–S03 push in, S04 settles back; S06 in, S07 out; S10 in, S11 out; S18 in, S19 across, S20 out).
- **Export check** (the same sandbox test): every MP4 is 1080×1920, yuv420p, BT.709, 60 fps, exactly 3,780 frames, 63.000 s; the mixes carry AAC 48 kHz stereo and the _Silent versions have no audio track. Two text versions × two mixes took 3 min 50 s on a 4-core sandbox (about 65 MB per MP4).
- **Motion** (`tools/qa_motion.js`): no blue-purple frames. Hard jumps occur only at the planned cuts (27, 33, 39, 45 s). The calm end (scenes 18–21) keeps a slow camera drift and a slow turn of both trees.
- **Sync** (`tools/sync_qa.js`):
  - all 87 event times on the 80-BPM eighth-note grid, drawn within 8.3 ms (half a frame);
  - all 72 SFX start exactly on a picture event;
  - measured onsets of the percussive cues: median 0.9 ms, max 3.6 ms after their event.
- **Audio** (`tools/audio_qa.js`, `tools/master.py`):
  - full mix −22.00 LUFS, true peak −5.7 dBTP, no limiting needed; music stem −23.9 LUFS, SFX stem −24.8 LUFS;
  - per-scene levels −21 to −27 dBFS RMS;
  - 70 of 72 SFX cues sit at least level with the music in their strongest band (the other two, a low swell and a slide, are meant to stay soft).
- **Player:** `tools/smoke.js` (headless Chromium) plays and seeks `index.html` with no errors.

## Self-review against the six failure modes (huashu-art-motion)

1. **Slide-deck feel:**
   - no page frame and no bullet points;
   - one picture event per scene;
   - the camera grammar changes with the story: lateral tracking, slow and fast pushes, holds, pull-backs, cuts, and three dissolves at changes of world;
   - every push is answered by a pull-back or a lateral move;
   - the film ends on an action (both trees turning while the lesions light up), not a centred quote card.
2. **Copying a demo:** nothing from the skill's demos, sample specs or style samples is used. Every model (patient, leg, artery, tree, scanner, heart) is built in code for this film.
3. **No concrete object:** every scene is a concrete thing doing something: the man walking, the calf, the wall, cells, plaque, the scanner, the contrast, the two trees.
4. **Dead or empty background:**
   - the subject fills most of the frame;
   - the backdrop changes with each world (floor, the vessel interior, the CT room, the black CTA viewer, body silhouettes behind the trees);
   - the film gate finds no empty frames.
5. **Real material drawn in code:** not applicable. No footage or photographs were provided, and the brief asks for a voxel animation.
6. **AI-looking result:**
   - one style (voxel pixel art) and one palette for the whole film;
   - 0 % blue-purple frames;
   - no code-drawn faces: the patient is always neck-down, his head inside the gantry on the CT table;
   - molecules and cells have no faces.

Not done: an independent review by a second agent (the skill recommends one). This project was built and checked by a
single agent only; watch it once at normal speed before publishing.

## How it is built

`src/` is one engine shared by the player, the export and the reference images:

- **Core and timing:**
  - `00_core.js`: canvas, palette, 2-D primitives.
  - `01_font.js`: pixel fonts, including Azerbaijani letters.
  - `03_clock.js`: 80 BPM, the event table `EV` used by the picture and the sound alike.
  - `04_labels_en.js`: the editable labels.
- **The voxel renderer:**
  - `07_vox.js`: grids of cubes → exposed faces with ambient occlusion → perspective, z-buffered flat triangles, dither alpha, outlines.
  - `09_sdf.js`: shape helpers.
- **Models:**
  - `10_patient.js`: rigid voxel parts on a skeleton, a gait with heel strikes on the beat, stance-foot locking, the calf-holding pose with two-bone IK.
  - `11_leg.js`: the right leg's layers: skin, muscles, bones, arteries.
  - `12_artery.js`: the artery cut lengthwise: wall layers, plaque, calcium, occlusion, collaterals; red cells on streamlines (faster in the narrowing), pulsing at 80 per minute.
  - `13_tree.js`: the arterial tree and the lesion map.
  - `14_ct.js`: the CT room.
  - `15_circ.js`: the contrast's route through the heart and lungs.
  - `16_axial.js`: the axial CTA slice.
- **Film and output:**
  - `20_scenes.js`: the 21 scenes, cameras and dissolves.
  - `24_ui.js`: graphics kept in the clean version.
  - `25_text.js`: the text layer.
  - `30_audio.js`: the synthesised score and SFX.
  - `40_player.js`: the browser player.

`tools/` holds the export, mastering, QA scripts and the reference-image generator (`refs.js` + `refs_draw.js`).
