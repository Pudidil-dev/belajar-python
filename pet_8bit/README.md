# How PET Scanners Work — how antimatter creates medical images

*A 60-second, 27-scene 2D pixel-art explainer of positron emission tomography (PET/CT). The style is 8-bit crisp pixels with a 16-bit palette and same-hue shading. It is built with HTML5 Canvas 2D, JavaScript and Web Audio. Motion follows the Kurzgesagt grammar from the `huashu-art-motion` skill: log-interpolated scale travel, a 0.3 s pause and light-up before every dive, lens reveals into objects, fast pull-out reveals, and a controlled light flash for the annihilation.*

| | |
|---|---|
| Player | `index.html`, a single self-contained file. Open it in a browser. |
| Video | `output/pet_8bit.mp4`, created by `node tools/export.js`. |
| Format | 9:16, 1080×1920, 60 fps, exactly 3,600 frames (60.000 s), H.264 High, yuv420p, BT.709, AAC 48 kHz stereo. |
| Loudness | −15 LUFS integrated, true peak ≤ −1.6 dBTP. The soundtrack loops seamlessly (60 s = 32 bars at 128 BPM). |
| Picture | Logical canvas 270×480, upscaled exactly ×4 with nearest-neighbour. |

## Render it yourself

Requirements: Node ≥ 18, Playwright Chromium, ffmpeg with libx264, and Python 3 with numpy and scipy.

```
node tools/export.js                  # build -> audio -> master -> 3600 frames -> mux
node tools/export.js --audio-only     # soundtrack only (build/audio.wav)
node tools/export.js --video-only     # frames + mux, reusing build/audio.wav
node tools/stills.js out.png 5.7 26.3 50.7 --scale 2   # contact sheet of any times
node tools/smoke.js shot.png          # headless player check: play, pause, seek
```

`renderFrame(t)` is a pure function of time, so the player, stills and export draw identical frames. All randomness comes from seeded hashes.

## Models (drawn to real proportions)

- **Body, coronal:** an 8-head figure from vertex to knee.
  - The whole-body PET maximum-intensity image uses 4 mm voxels and realistic physiological FDG uptake: brain cortex, left-ventricular myocardium, liver, spleen, kidneys and ureters, bladder, marrow and bowel.
  - It also shows a hot right-lung nodule and a mildly inflamed axillary node.
- **Chest, axial (mm):** radiology convention (patient's right on the viewer's left), supine on a curved pallet. It includes:
  - skin and fat, chest-wall muscle, ribs, sternum and scapulae;
  - a vertebra with spinal canal;
  - both lungs, with the cardiac notch;
  - the heart with its chambers, the descending aorta and the oesophagus;
  - the lung nodule.

  It is drawn as tissue, CT greys, PET heat, or a PET/CT fusion.
- **PET/CT scanner:**
  - Side view: gantry about 2 m tall, 78 cm bore centred 1 m above the floor, CT section in front and PET ring behind. A cutaway shows the X-ray tube and detector arc, and the stationary PET blocks.
  - The patient lies supine, head first, arms raised. The pallet travels into the bore.
- **Detector ring (front):** 38 stationary modules. LYSO crystal face at R = 410 mm (82 cm ring), 20 mm crystals, then the SiPM layer, readout board with ASIC, and cooling plate. Bore cover at R = 390 mm.
- **Detector module cutaway:** 4 × 4 × 20 mm LYSO crystals wrapped in reflector and coupled 1:1 to SiPMs, readout board with ASIC, cooling channel.
- **SiPM:** a grid of Geiger-mode microcells with quench resistors and a metal bus. Each detected photon fires a cell, and the cells sum into one current pulse.
- **Molecules and cells:**
  - FDG in Haworth projection (2-deoxy-2-[18F]fluoro-D-glucose, with the F replacing the C2–OH).
  - Tissue cells with nuclei.
  - Biconcave red cells in laminar flow.
  - GLUT transporters and hexokinase trapping FDG-6-phosphate.
- **Dose and injection:** the vial sits in a tungsten shield with a crimp cap, septum and trefoil label. The forearm IV shows the cephalic vein, a cannula pointing toward the heart, and a tungsten syringe shield with a lead-glass window. A nitrile-gloved hand pushes the plunger.
- **Nucleus:** F-18 has 9 protons and 9 neutrons. After decay it is O-18, with 8 protons and 10 neutrons.

## Storyboard (exact time ranges)

| # | Time (s) | Label (+ micro) | Physics / reasoning |
|---|---|---|---|
| 01 | 0–1.2 | PET IMAGING | The finished whole-body image is on frame 1. The nodule lights up, then a log zoom dives into it. |
| 02 | 1.2–2.4 | FLUORINE-18 | Push through the hot 4 mm voxels; their colour bridges the scale jump into tissue. A cell lights up, then a lens reveal enters it and lands on an FDG molecule with its F-18 marked. |
| 03 | 2.4–4.0 | POSITRON EMISSION | Lens reveal into the F atom's electron cloud, then into the nucleus. On the beat a proton becomes a neutron: β+ decay emits a positron (e+) and a neutrino. The neutrino is drawn faint and leaves without interacting. |
| 04 | 4.0–5.5 | POSITRON SLOWS DOWN + Mean range under 1 mm | A short, winding path through water molecules. Each kink is an electromagnetic interaction that knocks out an electron, and the energy bar falls. |
| 05 | 5.5–7.0 | ANNIHILATION + 511 keV EACH | A brief positronium-like dance with an electron, then a controlled gold light bloom on bar 4 and two gold photons back to back, each carrying its 511 keV tag. The camera then starts pulling back (accelerating), so the photons stay in shot and hand over to S06. |
| 06 | 7.0–9.0 | PET DETECTOR RING | The pull-out continues to the ring with a long settling tail; the photons keep the same screen positions across the cut and leave short wakes. The event sits perpendicular to its photon line, so both reach the ring together: two synchronized clicks. A small marker shows where the annihilation happened (no second flash). |
| 07 | 9.0–11.0 | F-18 FDG TRACER + A glucose analog | The shielded vial; a magnifier shows the molecules, then a lens reveal reaches the Haworth FDG, which jiggles with thermal motion while the F-18 marker pulses on the beat. |
| 08 | 11.0–13.0 | RADIOTRACER INJECTION | Clean, non-graphic IV. The tracer bolus runs from the shielded syringe down the line, through the cannula and into the vein towards the heart; the camera follows it, then a cutaway lens over the vein shows it in the blood. |
| 09 | 13.0–15.0 | THROUGH THE BLOODSTREAM | Laminar flow (faster at the centre) with red cells tumbling face-on and edge-on. |
| 10 | 15.0–17.0 | TRACER UPTAKE + More active = more FDG | TIME-LAPSE. FDG moves capillary → GLUT → hexokinase, gets phosphorylated, and is trapped. Normal, inflamed and tumour cells all take it up, at different rates. |
| 11 | 17.0–19.0 | PET SCANNING + PET + CT in one gantry | The whole gantry is in shot; small CT and PET tags mark the two sections of the cutaway while the pallet carries the patient into the bore. |
| 12 | 19.0–21.0 | DETECTOR ARRAY + Stationary crystal ring | An activation sweep around the 38 modules, then a zoom onto the crystal blocks. The ring never rotates. |
| 13 | 21.0–23.0 | BETA-PLUS DECAY + F-18 > O-18 + e+ + ν | The same conversion, now labelled: the nucleus becomes O-18. The view then eases back out to the whole atom. |
| 14 | 23.0–25.0 | POSITRON INTERACTIONS + Each interaction slows it | The whole winding track, with ionizations along it. |
| 15 | 25.0–27.0 | MATTER + ANTIMATTER + Mass becomes energy | Fuzzy probability clouds, never hard balls. The dance speeds up, half a beat of silence, then the annihilation is the drop (26.25 s): a short gold-white radial light bloom, not a blast. |
| 16 | 27.0–29.0 | TWO 511 keV PHOTONS + Nearly opposite paths | Two equal energy tags and a ~180° marker. |
| 17 | 29.0–31.0 | GAMMA RAYS TRAVEL + Not every photon escapes | One unscattered pair from the lung nodule runs diagonally to opposite detectors; the nearer photon is detected a 16th note before the farther one (same speed, different path lengths). One photon Compton-scatters (dashed, dimmer, SCATTERED). One is absorbed in bone (ABSORBED). The camera then creeps towards the struck module before diving in. |
| 18 | 31.0–33.0 | SCINTILLATION CRYSTAL + Dense LYSO crystal | Dive into the module. The gamma enters a crystal and is absorbed (photoelectric). A short photoelectron track excites luminescent centres, which keep glowing softly. |
| 19 | 33.0–35.0 | ENERGY > LIGHT + Excited atoms emit light | Each blue-white optical photon is born with a tiny flash at an excited centre, then bounces off the reflector walls down to the SiPM. The light comes from deposited energy, not from the gamma ray itself. |
| 20 | 35.0–37.0 | LIGHT > ELECTRIC SIGNAL + Cells fire avalanches | Microcells fire; their summed current pulse feeds an amplifier, then TIME (TDC) and ENERGY (ADC). |
| 21 | 37.0–39.0 | COINCIDENCE DETECTION + Paired within nanoseconds | The nearer module fires first, the other a moment later, both on one running clock and inside the timing window: COINCIDENCE. Lone detections (singles) get time-stamped too, find no partner and fade out. |
| 22 | 39.0–41.0 | LINE OF RESPONSE + Somewhere along this line | The LOR is drawn with a highlight running along its equally possible origins. It is not a point. |
| 23 | 41.0–44.0 | MANY DETECTED EVENTS + Lines pile up at hot spots | TIME-COMPRESSED. Events on 16ths, then many more; an event counter runs. The drawn lines are counted per cell, and where many cross (the heart wall and the nodule) a hot spot glows up: the idea behind backprojection. |
| 24 | 44.0–47.0 | TIME-OF-FLIGHT PET + On TOF-capable scanners | The nearer detector fires FIRST. Without timing the origin could be anywhere on the line; the arrival-time difference shrinks it to a probability region (LIKELY ORIGIN, FWHM about 5 cm, i.e. about 350 ps timing), not an exact point. Ghost replays of the photon race repeat the point. |
| 25 | 47.0–51.0 | PET IMAGE RECONSTRUCTION + Built from many events | Workstation → sinogram (newest events land bright) → simple backprojection streaks → iterations 1–4 → on bar 28 the whole-body activity map is written out top to bottom by a scan bar. |
| 26 | 51.0–55.0 | PET + CT + Anatomy + tracer activity | CT (anatomy) and PET (tracer) slide together and fuse on the beat. A reading cursor visits the normal heart uptake ("NORMAL HEART UPTAKE"), then the lung focus ("?"), under "Bright does not always mean cancer". The PET layer gently fades up and down over the CT while the view pushes in slowly. |
| 27 | 55.0–60.0 | HOW PET SCANNERS WORK (+ HOW ANTIMATTER CREATES MEDICAL IMAGES) | Recap cuts on consecutive beats: RADIOTRACER → POSITRON → ANNIHILATION → TWO GAMMA PHOTONS → SCINTILLATION CRYSTALS → ELECTRICAL SIGNALS → COINCIDENCE DETECTION → PET IMAGE (the final image, with the title above it). The title fades, and a smooth zoom lands exactly on frame 0 (pixel-identical from 59.92 s), so the loop is seamless. |

Small chips under the caption mark representations:

| Chip | When |
|---|---|
| VISUALIZATION | Particles and gamma rays (not visible light) |
| NOT TO SCALE | Nucleus scenes |
| TIME-LAPSE | Uptake |
| TIME-COMPRESSED | Many events |

## Short-video polish (review pass)

- **Safe zones.** Captions, chips, the energy HUD, recap dots and the end title stay inside logical x 18–240, y 37–362, clear of the app's top tabs, side buttons and bottom caption area. The two struck modules in S06, S17–S24 sit on diagonal lines for the same reason.
- **One-line labels.** Every micro-context line fits on one line; anything longer wraps into balanced lines (no one-word orphans).
- **Never fully still.** Hold shots keep a meaningful environment layer moving: detector singles flickering around the ring, the patient's heartbeat and breathing (live patient only; the reconstructed images are time-averaged and do not move), the system clock, singles being discarded, ghost TOF replays, and the PET layer fading over the CT. At 60 fps, no hold has more than a couple of frozen frames.
- **Continuity.** S05 → S06 is one continuous pull-out with the photons in shot; S17 → S18 creeps and then dives into the same module.
- **Palette.** The navy ground sits at a hue of about 212°, outside the blue-violet band.

## Science notes and simplifications

**What PET measures**
- The image is a reconstructed map of tracer distribution, not a photograph and not anatomy.
- CT supplies the anatomy.
- Uptake also appears in normal tissue (brain, heart, kidneys, bladder) and in inflammation.
- A bright focus is not proof of cancer.

**What is slowed down or simplified**
- Particles are slowed by many orders of magnitude.
- Coincidence and TOF arrival differences (nanoseconds and below) are shown in slow motion.
- The positron range is exaggerated so it can be seen.
- Photon non-collinearity (about ±0.25°) is too small to draw; the film labels it "~180°".
- Detector geometry is generic (no vendor) and real-scale.
- Reconstruction is shown as backprojection plus a few iterations; real systems use iterative OSEM-type methods with CT-based corrections.

**Sound**
- Annihilation is silent; all atomic-scale sounds are artistic representations.

## Sound design

128 BPM in E minor, 32 bars (= 60 s), so the loop is beat-continuous.

| Bars | Time (s) | Section |
|---|---|---|
| 1–4 | 0–7.5 | Hook riff; the first annihilation lands on bar 4 |
| 5–8 | 7.5–15 | Clinical groove (four-on-the-floor, so the energy holds through the retention-critical seconds) |
| 9–11 | 15–20.6 | Mechanical 16ths |
| 12–14 | 20.6–26.25 | Build: snare rolls, rising tension, half a beat of silence |
| 15–16 | 26.25–30 | DROP on the matter-antimatter annihilation |
| 17–20 | 30–37.5 | Half-time detector physics: crystal, light and SiPM each on a bar downbeat |
| 21–25 | 37.5–46.9 | Rhythmic coincidence section |
| 26–29 | 46.9–54.4 | Reveal (bar 28) and fusion (bar 29) |
| 30–32 | 54.4–60 | Recap, title and pickup into 0:00 |

The SFX map follows the brief: nuclear transition, decelerating ticks, dual-channel annihilation, directional gamma sweeps, crystalline activation, sparkling scintillation, conversion click, dual confirmation, tracking tone, processing ticks and a warm completion. The offline render's tail past 60 s is folded onto the start.

## Source map

| File | Contents |
|---|---|
| `src/00_core.js` | Pixel buffer, rasterizers, masks with 16-bit shading, camera, easing, fonts. |
| `src/01_ui.js` | Callouts, micro-context, tags. |
| `src/02_pal.js` | PET palette, heat palette, extra glyphs, noise, splines. |
| `src/05_fx.js` | Paths and helpers. |
| `src/06_particles.js` | Positron and electron clouds, gamma packets, optical photons, neutrino, annihilation flash, nuclei. |
| `src/10_body.js` | Coronal body with PET MIP; axial chest slice (tissue / CT / PET / fused). |
| `src/11_scanner.js` | Detector ring, module cutaway, SiPM, PET/CT side view with patient, workstation, sinogram. |
| `src/12_micro.js` | Tissue, FDG, water-scale positron track, blood, uptake, vial, IV injection. |
| `src/20_scenes.js` | The 27-scene timeline, transitions, chips. |
| `src/30_audio.js` | Score and SFX, offline render with loop folding, live scheduler. |
| `src/40_player.js` | Controls and the export API. |
