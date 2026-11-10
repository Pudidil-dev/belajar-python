# How Diabetes Damages Leg Arteries — 3D pixel-art medical animation (code project)

**From walking pain to CT angiography.** A 63-second, 9:16, 60 fps medical animation in 3D pixel art, drawn in the
style of our earlier CTA film, with a flat 2D pixel-art layer on top that explains what the 3D shows.
- **The symptom:** a man walks, slows, stops and holds his right calf. The view passes through the skin and muscle to the arteries and dives into the thigh artery.
- **The disease in the wall:** a normal artery; years of high glucose; a damaged lining; plaque building inside the wall; calcification and narrowing.
- **The consequences:** a stenosis (a narrow but open channel with a faster jet) and, farther down, an occlusion (no passage, the wall outline intact) bypassed by collateral side channels; walking raises the calf's demand above the limited supply, and rest lowers it again while the lesions stay.
- **The diagnosis:** CT angiography as it is really done: he lies on the table and glides into the scanner, the contrast travels from the arm vein through the heart and lungs to the legs, the scan images appear on the console, the slices stack into the ivory 3D reconstruction; the stenosis and the occlusion on CTA. The film ends on a normal leg tree beside this patient's: **Diabetic Peripheral Arterial Disease**.

Not a loop: the film ends on the diagnosis. English placeholder labels, all in one editable file, and a clean version without text. No narration: the soundtrack is a quiet bed for an Azerbaijani voice-over to be added later. Music and SFX are delivered separately.

![Storyboard: one frame per scene](docs/storyboard.png)

## Version 4 (final revision): 2D and 3D combined, so every scene reads at a glance

The last note: improve the film once more and combine 2D and 3D so the result is clearer. The 3D shows the thing;
a flat pixel-art layer on top says where we are, what a cut looks like end-on and which way the blood goes — without
text, so it stays in the clean version too. Frames before/after: `docs/revision3_before_after.png`; the reasons,
scene by scene: `docs/REVISION_ANALYSIS.md`.

- **Where we are:**
  - scene 3: a cyan reticle marks the spot on the thigh artery where the camera dives in;
  - scenes 4–8 and 10: a small locator — a pixel picture of his leg with the artery in red — marks that spot, and its marker slides down to behind the knee when the camera moves to the block.
- **What the cut looks like end-on:**
  - scene 9: a slice mark crosses each artery and its 2D cross-section opens below: an open ring beside a narrowed one;
  - scene 10: the block's cross-section: no channel left inside the intact wall;
  - scene 21: the same three pictures return as small icons beside the findings of the final image.
- **Which way the blood goes:**
  - scene 11: white arrows ride the detour through the collaterals, out of the artery above the block and back in below;
  - scenes 20–21: pulses of flow travel down both trees with the beat — all the way in the normal leg; in the patient's leg slower past the narrowing, stopped at the block, a faint trickle round it. (The ending used to hold almost still; now it moves and compares function, not only shape.)
- **The contrast's route, scene 15:** a strip of five icons (syringe → right heart → lungs → left heart → legs) lights up station by station as the front arrives in the 3D picture.
- **On the CT images:**
  - scene 16: orange rings mark the right thigh artery at the stenosis and the right popliteal artery at the block as the scan passes them; the rings stay on those thumbnails, with marks on the topogram;
  - scene 19: a second axial inset, like the one of scene 18, shows the block: the wall without a bright channel, the collaterals as bright dots.
- **A place for the walk, scenes 1–3 and 12–13:** an evening park in flat layers that stand in the 3D world and slide past at their own speeds (parallax): a crescent moon and stars, a far skyline, a line of trees, the lawn beyond the kerb. It dissolves pixel by pixel as the camera enters the leg.
- **The patient:** hands with fingers (the hand on the calf now reads as a hand), folded hems on sleeves and shorts, ribbed sock tops, laces.

## Version 3 (revision 2): natural motion and a realistic CT sequence

The client's second note: the movement looked robotic; the CT part should show the patient lying on the table as it
slowly moves into the scanner, then the scan images appearing on the screen and the 3D reconstruction of the vessels,
closer to real life, still pixel art. What changed (details and measurements: `docs/REVISION_ANALYSIS.md`, frames
before/after: `docs/revision2_before_after.png`):

- **The walk** is planned from footfalls, the way people walk:
  - each heel strike has a time and a place;
  - the foot on the floor rolls heel → flat → toes without sliding;
  - the swinging foot moves on a smooth arc;
  - the hips ride the legs' reach, sway toward the standing foot, turn and dip; knees and hips follow by IK;
  - the shoulders turn against the hips; the arms swing a moment late with the elbows bending.
  Measured on the hips: v2 peaked at 474 m/s² and jerked backward at every step; v3 stays within 12 m/s² and never goes backward.
- **Stopping, holding, resting:** a last short step, then overlapping actions — the knees give, the back bends, the hand reaches round to the calf on an arc and rubs it — with heavy breathing, and gentle weight shifts when he stands.
- **Cameras** glide through their keys without stop-and-go. Held shots float very slowly; the walking camera follows the hips' running average.
- **The artery scenes:**
  - disease grows continuously;
  - cells and glucose ride the same pulsing flow;
  - white cells roll, slow down and stick;
  - lipid drifts in on a curve;
  - collaterals widen smoothly.
- **Graphics:** panels slide open with an ease and letters type in, instead of stepping.
- **CT, scene 14:** the patient lies on his back, head first (his head is in the bore, never seen), arms raised, shoes off, a strap over the knees. The table glides slowly into the gantry while the red positioning laser crosses his body; then the dual-syringe injector starts and contrast runs down the tube to the cannula in his right elbow.
- **CT, scene 16 (new):** the control room. Through the window, the table carries him through the gantry during the helical scan. On the console:
  - the topogram with the scan range and a moving scan line;
  - each new axial image, with the arterial-phase greys: aorta, pelvis, thighs with the narrowed calcified SFA, knees with the popliteal artery without contrast and its collaterals, calves;
  - thumbnails arriving with the score's chimes.

  All images are computed from the same anatomy and lesion map as the 3D views.
- **CT, scene 17:** the slices drop into place as slabs and build the volume; the soft tissue falls away; the arteries and bones remain and become the turning 3D reconstruction.
- **Anatomy corrected along the way:** the femur shaft now lies lateral to the femoral artery, and the iliac vessels pass in front of the hip joint (the axial images showed them overlapping before).

## Version 2 (revision)

Version 1 built every model from cubes (voxels) on a 540×960 grid. Small shapes — red cells, plaque, calcium, the
tibial arteries — were only a few cubes wide and broke up into steps and dither noise. Version 2 is rebuilt on the
renderer of the CTA film, as the client asked:

- **3D:** smooth shaded meshes on a 360×640 grid shown 3×, with dithered tone steps, rim light, small specular highlights and 1-px outlines.
- **2D pixel art, mixed in:** the artery close-ups pair a 3D lumen with glossy biconcave red cells and a flat pixel-art cut face of the wall:
  - the wall's layers;
  - the plaque with its cap, lipid core and calcium;
  - the organised occlusion.
- **Colour code:** red arteries.
- **CTA:** ivory volume-rendered views.
- **Reused from the CTA film:** the scanner room and the contrast route.

The story, the timing of all 21 scenes, the audio, the labels and the lesion map are unchanged, so the voice-over
timing sheet still applies.

Analysis of what was wrong and what changed, shape by shape: `docs/REVISION_ANALYSIS.md`. Before/after frames at the
same times: `docs/revision_before_after.png`. (The folder keeps its v1 name, `pad_voxel`, so existing links still work.)

| | |
|---|---|
| Video | 1080×1920, 60 fps, exactly 3,780 frames (63.000 s), H.264 High, yuv420p, BT.709. Drawn on a **360×640 pixel grid** and scaled **exactly 3× nearest-neighbour**. Smooth meshes lit per vertex in limited palette ramps with ordered-dither steps, rim light, specular highlights and 1-px outlines; glass skin and walls by screen-door dither. No anti-aliasing, blur or glow. |
| Structure | 21 scenes × 3.000 s, one bar of music each (80 BPM). Every picture event sits on the beat or the eighth-note grid, and every SFX starts on its picture event. |
| Audio | Original restrained cinematic-electronic score in D minor, plus 72 SFX read from the picture's event table. Full mix **−22.0 LUFS** integrated, true peak −5.7 dBTP: a bed that a voice-over at about −16 LUFS sits clearly above. Under 8 % of the energy is in the 1–4 kHz speech band. No constant heartbeat and no alarms. The last 0.5 s fades to silence. |
| Text | English placeholders from `src/04_labels_en.js` only: one caption at a time in a band at the top; two large key terms (STENOSIS / OCCLUSION); small labels (Demand / Supply, R / L, Normal / Diabetic PAD); the final title. The **clean** version renders without any text but keeps the graphics (bars, hourglass, CTA frame, axial insets, lesion brackets, and the whole 2D explanatory layer: locator, cross-sections, arrows, route icons, rings). |

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
re-muxes (seconds). In a sandbox test on 4 cores, both text versions with two mixes took 7 min 54 s (about 112 MB
per MP4); all eight MP4s take only a few seconds more (re-muxing). All audio versions share **one common gain** (`tools/master.py`), so
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
- `node tools/stills.js out.png 10.5 25.5 62.9 --scale 3 [--clean]` makes a contact sheet of any frames.
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
| Revisions | `docs/REVISION_ANALYSIS.md` with `docs/revision_before_after.png` (v1 → v2), `docs/revision2_before_after.png` (v2 → v3), `docs/revision3_before_after.png` (v3 → v4) |

## Medical accuracy kept in every scene

- **Chronic PAD only:** no embolus, acute ischaemia, ulcer, gangrene, amputation, balloon, stent or bypass surgery.
- **One patient, one map:** the same patient (neck-down, face never shown) and the same right leg throughout, with one fixed lesion map (`docs/LESION_MAP.md`). The SFA stenosis (L1), the popliteal occlusion (L2), the genicular collaterals and the below-knee disease (L3) sit at the same places in every view, and the below-knee branching is correct.
- **Glucose:** stays dissolved in the blood and never forms a plug.
- **Plaque:** stays inside the wall, under the lining.
- **Calcium:** opaque white, and distinct from contrast (on CTA it is the brightest white, with a dark outline).
- **Stenosis:** keeps a continuous channel, with a faster jet through it.
- **Occlusion:** has no passage and keeps its wall outline.
- **Collaterals:** bypass the occlusion; they never reopen it.
- **Rest:** lowers demand; the lesions stay as they are.
- **CTA:** only diagnoses. The white-blue contrast colour is a teaching overlay.
- **No numbers anywhere.**
- **Drawing convention:** calibres are exaggerated so the arteries stay legible on a phone (2.3× in the leg, 3.9× in the whole-tree and CTA views, 4.6× in the final comparison).

## QA (numbers, not a substitute for watching it)

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint` (green): 21 shots, 63 s, no text-led shots.
- **Film gate** (the skill's `film_gate.py`, run on a sandbox test export `Diabetic_PAD_CTA_Labeled.mp4` at 1080×1920 / 60 fps — the MP4 itself is not in the repository): all three gates green.
  - Fast-motion frames 27.5 % (red below 3.5 %).
  - No empty frames; 0 % blue-purple frames.
  - Worst 30-s window (31–61 s): 17.9 %.
  - 14 shots (12 cuts, 1 crossfade), average 4.5 s; the longest still stretch 0.25 s (v3: 0.8 s).
  - Push-ins 2.9 per minute, green; fixed-frame share 23 %, green (the locator and the CTA viewer frame).
- **Export check** (the same sandbox test): every MP4 is 1080×1920, yuv420p, BT.709, 60 fps, exactly 3,780 frames, 63.000 s; the mixes carry AAC 48 kHz stereo and the _Silent versions have no audio track.
- **Motion and colour** (`tools/qa_motion.js`, every frame at 30 fps):
  - no frame is more than 30 % blue-purple;
  - hard jumps only at the planned cuts (24, 27, 33 and 39 s);
  - no still window anywhere: the final comparison used to hold from 57.9 s; now the flow pulses keep it moving to the last frame;
  - the walk, measured on the hips: peak acceleration 12 m/s² (v2: 474 m/s²), never moving backward (v2: up to 3.5 m/s backward at every step); planted feet do not slide (0.0 mm).
- **Sync** (`tools/sync_qa.js`):
  - all 87 event times on the 80-BPM eighth-note grid, drawn within 8.3 ms (half a frame);
  - all 72 SFX start exactly on a picture event;
  - measured onsets of the percussive cues: median 0.9 ms, max 3.6 ms after their event.
- **Audio** (`tools/master.py`; the score and SFX are unchanged from v1):
  - full mix −22.00 LUFS, true peak −5.7 dBTP, no limiting needed;
  - music stem −23.9 LUFS, SFX stem −24.8 LUFS.
- **Anatomy in the CT images:** no artery crosses a bone at any level from the feet to the aorta (checked every 5 mm).
- **Player:** `tools/smoke.js` (headless Chromium) plays and seeks `index.html` with no errors.

## Self-review against the six failure modes (huashu-art-motion)

1. **Slide-deck feel:**
   - no page frame and no bullet points (the small locator picture is the only graphic that stays across scenes 4–8; it is an inset, and it moves when the camera does);
   - one picture event per scene;
   - the camera grammar changes with the story: lateral tracking, slow and fast pushes, holds, pull-backs, cuts, and soft crossfades at changes of world;
   - every push is answered by a pull-back or a lateral move;
   - the film ends on an action (both trees turning while the lesions light up), not a centred quote card.
2. **Copying a demo:** nothing from the skill's demos, sample specs or style samples is used. The renderer, the gantry shape, the contrast route and the red-cell model come from our own earlier CTA film; every other model (patient and his walk, leg, artery cut face, arterial tree, lesions, the CT table set-up, the console and the CT images) is built in code for this film.
3. **No concrete object:** every scene is a concrete thing doing something: the man walking through the park, the calf, the wall, cells, plaque, the table gliding into the scanner, the contrast, the console's images, the stacking slices, the blood pulsing down the two trees. The 2D layer only points at these things (where, which cut, which way); it never replaces them with text or bullet points.
4. **Dead or empty background:**
   - the subject fills most of the frame;
   - the backdrop changes with each world (the evening park, the vessel interior, the CT room, the control room, the black CTA viewer, glass bodies behind the trees);
   - the film gate finds no empty frames.
5. **Real material drawn in code:** not applicable. No footage or photographs were provided, and the client asked for the style of the CTA film.
6. **AI-looking result:**
   - one style (the CTA film's 3D pixel art) and one palette for the whole film;
   - 0 % blue-purple frames;
   - no code-drawn faces: the patient is always neck-down, his head inside the gantry on the CT table;
   - molecules and cells have no faces.

Not done: an independent review by a second agent (the skill recommends one). This project was built and checked by a
single agent only; watch it once at normal speed before publishing.

## How it is built

`src/` is one engine shared by the player, the export and the reference images:

- **Core and timing:**
  - `00_core.js`: the 360×640 pixel buffer, palette, 2-D primitives.
  - `01_font.js`: pixel fonts, including Azerbaijani letters.
  - `02_util.js`: helpers and the film's colour code.
  - `03_clock.js`: 80 BPM, the event table `EV` used by the picture and the sound alike.
  - `04_labels_en.js`: the editable labels.
- **The 3D pixel renderer (the CTA film's engine):**
  - `07_r3d.js`: perspective, z-buffer, per-vertex lighting, palette ramps with Bayer dither, glass, fog, procedural cut faces, 1-px outlines.
  - `08_geo.js`: tubes, ellipsoids, rings, boxes, quads.
  - `09_sdf.js`: signed-distance shapes turned into smooth meshes.
  - `17_cam.js`: camera paths (smooth splines through keys, slow floats) and the sky gradient.
- **Models:**
  - `10_patient.js`: smooth body parts (hands with fingers, hems, sock ribs, laces); the walk planned from footfalls (rolling feet, hips by reach and acceleration limits, legs by IK), the stop and the calf hold as overlapping actions with arm IK, breathing, the lying pose for the CT.
  - `11_leg.js`: the right leg's layers: glass skin, muscles that glow where they hurt, arteries with the lesions.
  - `12_micro.js`: the artery cut lengthwise:
    - in 3D: the lining, red cells on streamlines (faster in the narrowing) pulsing at 80 per minute, white cells, the foam cell, collaterals;
    - in 2D pixel art on the cut face: the wall's layers, plaque, calcium, the occlusion.
  - `13_tree.js`: the arterial tree, the lesion map, the flow field of the final comparison (transit times, pulses), the CTA look, the bones and the glass body.
  - `14_ct.js`: the CT room: gantry with panels, lit ring, lamp and positioning laser; table, strap, injector, tubing; the patient head first with raised arms.
  - `15_circ.js`: the contrast's route through the heart and lungs.
  - `16_axial.js`: the axial close-up insets of the stenosis (scene 18) and of the block (scene 19).
  - `18_ctimg.js`: the CT images: analytic axial slices of this patient (body, bones, vessels, lesions), the topogram, the console screen with the lesion rings, the slabs of the reconstruction.
  - `19_park.js`: the evening park behind the walk: 2D pixel layers standing in the 3D world (moon, stars, skyline, trees, lawn).
- **Film and output:**
  - `20_scenes.js`: the 21 scenes, cameras and crossfades.
  - `24_ui.js`: graphics kept in the clean version: the bars, the hourglass, the CTA frame and insets, the final marks — and the 2D explanatory layer (locator, dive reticle, cross-sections, flow arrows, route strip).
  - `25_text.js`: the text layer.
  - `30_audio.js`: the synthesised score and SFX.
  - `40_player.js`: the browser player.

`tools/` holds the export, mastering, QA scripts and the reference-image generator (`refs.js` + `refs_draw.js`).
