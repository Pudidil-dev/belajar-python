# How PET Scanners Work — how medical scanners use antimatter (director's cut)

*A 70-second, 19-scene 2D pixel-art explainer of positron emission tomography (PET/CT). It follows one continuous cause-and-effect chain: one tracer molecule, one annihilation, and the same two gamma photons, all the way through the machine to the image. The style is 8-bit crisp pixels with a 16-bit palette and same-hue shading. It is built with HTML5 Canvas 2D, JavaScript and Web Audio. Motion follows the Kurzgesagt grammar from the `huashu-art-motion` skill: log-interpolated scale travel, a short pause and light-up before every dive, lens reveals into objects, follow-object tracking, and a controlled light bloom for the annihilation.*

| | |
|---|---|
| Player | `index.html`, a single self-contained file. Open it in a browser. |
| Video | `output/pet_8bit.mp4`, created by `node tools/export.js`. |
| Format | 9:16, 1080×1920, 60 fps, exactly 4,200 frames (70.000 s), H.264 High, yuv420p, BT.709, AAC 48 kHz stereo. |
| Loudness | −15 LUFS integrated, true peak ≤ −1.6 dBTP. Music at 128 BPM: 37 bars plus a 1.33-beat riser that hands over to bar 1, so the loop lands on a downbeat. |
| Picture | Logical canvas 270×480, upscaled exactly ×4 with nearest-neighbour. |

## Render it yourself

Requirements: Node ≥ 18, Playwright Chromium, ffmpeg with libx264, and Python 3 with numpy and scipy.

```
node tools/export.js                  # build -> audio -> master -> 4200 frames -> mux
node tools/export.js --audio-only     # soundtrack only (build/audio.wav)
node tools/export.js --video-only     # frames + mux, reusing build/audio.wav
node tools/stills.js out.png 0.6 26.3 58.4 --scale 2   # contact sheet of any times
node tools/smoke.js shot.png          # headless player check: play, pause, seek
```

`renderFrame(t)` is a pure function of time, so the player, stills and export draw identical frames. All randomness comes from seeded hashes.

## The chain (one event, followed end to end)

The hook shows the result first: an annihilation inside a patient in the ring, two photons, two detector flashes, a line, many lines, and an image. The film then explains how that exact event came about and how the machine turned it into data:

tracer injection (about 1 hour earlier) → blood → uptake → F-18 nucleus → beta-plus decay → positron → annihilation → the same two gamma photons → crystal → scintillation light → SiPM → electrical pulse → position, time and energy → coincidence check → line of response → many events → reconstruction → PET/CT → recap → the photon pair of frame one.

The representative event sits in normal heart muscle (the septum), on the perpendicular of its photon line through the ring centre, so both photons have the same path to the crystals and arrive together. The line runs from the lower left (module A) to the upper right (module B).

## Storyboard (exact time ranges)

| # | Time (s) | Label (+ micro) | Input → interaction → output → next |
|---|---|---|---|
| 01 | 0–3 | ANTIMATTER → MEDICAL IMAGE | An annihilation has just happened in the patient's heart muscle → two 511 keV photons fly apart → modules A and B flash at 0.6 s → the cyan line of response at 1.2 s, carrying a signal → a time-compressed flood of lines at 2.0 s → the slice is rewritten as the reconstructed activity image at 2.5 s. |
| 02 | 3–6 | PET DETECTOR RING | Pull back: PATIENT, DETECTOR RING, DETECTOR MODULE appear one after another, while an activation sweep runs around the stationary ring → the scanner turns to a side view, where five detector rings form a cylinder around the patient → the camera moves to the IV cannula on the raised forearm. |
| 03 | 6–9 | F-18 FDG TRACER + Glucose-like, carries F-18 | Match cut to the injection about an hour earlier (chip) → the bolus runs from the shielded syringe down the line, through the cannula into the vein; the camera follows it → a lens into the vein: tracer molecules in the blood; one is highlighted. |
| 04 | 9–12 | TRACER CIRCULATION + Carried by the blood | The camera rides with that molecule while red cells flow past; a mini-map shows its route (time-lapse) from the arm through the heart and lungs to the heart muscle → the vessel narrows to a capillary. |
| 05 | 12–15 | TRACER UPTAKE + Normal cells take it up | The molecule leaves the capillary, passes a GLUT transporter into a normal cell, and hexokinase adds a phosphate: TRAPPED (bar 8) → time-lapse: normal, inflamed and tumour cells all take FDG up, at different rates (FDG does not seek out disease). |
| 06 | 15–18 | FLUORINE-18 + 9 protons + 9 neutrons | Lens into the same trapped molecule (FDG-6-phosphate) → its F-18 atom lights up → lens into the atom, then the nucleus, with a proton/neutron key. |
| 07 | 18–22 | POSITRON EMISSION + Proton becomes neutron | Build-up: the proton that will convert pulses faster → on bar 12 it becomes a neutron, emitting a positron (e+, with a + mark) and a neutrino → the sequence is written: F-18 → BETA-PLUS DECAY → O-18 + e+ + ν → the view follows the positron. |
| 08 | 22–25 | POSITRON SLOWS DOWN + Mean range under 1 mm | The same positron leaves the O-18 atom and zig-zags through water molecules; each kink is an electromagnetic interaction that knocks an electron out, and the energy bar drops → an electron (− mark) approaches. |
| 09 | 25–28 | ANNIHILATION + 511 keV + 511 keV | A brief dance, half a beat of silence, then the annihilation is the drop (26.25 s): a gold-white light bloom, no blast → two photons back to back with their energy tags → the camera starts pulling back with both photons in shot. |
| 10 | 28–31 | GAMMA DETECTION + Both reach the ring | Continuous zoom-out: BODY, GAMMA and DETECTOR RING tags → both photons reach modules A and B together on bar 17 → the camera creeps towards module B. |
| 11 | 31–35 | GAMMA → LIGHT (4 steps) | Dive into module B: the photon enters a LYSO crystal → 1 GAMMA PHOTON absorbed (photoelectric) → 2 ENERGY DEPOSITION along the photoelectron's track → 3 ELECTRONIC EXCITATION (inset: an electron lifted to the excited state) → 4 SCINTILLATION LIGHT: it falls back and light flashes out, bouncing down to the SiPM. |
| 12 | 35–39 | LIGHT → ELECTRIC SIGNAL + Light frees charges | Lens into the purple SiPM: each absorbed photon frees charge carriers and triggers an avalanche in its microcell → the summed pulse appears on a waveform and runs into the front end → split screen: module A recorded the matching pulse at almost the same moment. |
| 13 | 39–42 | EVENT MEASUREMENT + Where, when, what energy | Left and right event cards: POSITION A/B (module number), TIME T1/T2, ENERGY E1/E2; a mini ring marks A and B → each card becomes a digital event record. |
| 14 | 42–45 | COINCIDENCE DETECTION + Checks time and energy | The two records enter the coincidence processor → the gap (0.19 ns) is inside the 4 ns window → both energies (506 and 517 keV) are inside 435–585 keV → COINCIDENCE ACCEPTED ("may still be scatter": a candidate pair, not a guarantee) → one record leaves for the ring. |
| 15 | 45–49 | LINE OF RESPONSE + Somewhere along this line | The same modules A and B; the cyan line through the body; a range highlight and a "?" move along the part inside the body: one coincidence gives a line, not a point. |
| 16 | 49–54 | MILLIONS OF EVENTS + Each pair adds one line | Zoom out slightly; events on 16ths, then many more (time-compressed, counter to 40,000,000). Every fourth event fails selection: dim grey, then dropped (REJECTED). Where many lines cross, the heart wall and the lung nodule glow → the data heads to the computer. |
| 17 | 54–60 | PET IMAGE RECONSTRUCTION + An estimate, not a photo | MEASURED EVENTS (sinogram) → DETECTOR GEOMETRY (each measurement is a line between two known detectors) → CORRECTIONS (attenuation from the CT, scatter, randoms) → IMAGE RECONSTRUCTION (iterations 1–4: a rough estimate gets clearer) → ACTIVITY MAP on bar 32, with a low-to-high colour key. |
| 18 | 60–65 | PET + CT + Anatomy + tracer activity | The PET image first, then the separately acquired CT, then the fusion on bar 34. A reading cursor visits NORMAL HEART UPTAKE (where our event happened), then a "?" on the lung focus: "Bright does not always mean cancer". |
| 19 | 65–70 | HOW PET SCANNERS WORK (+ HOW MEDICAL SCANNERS USE ANTIMATTER) | Recap cuts on quarter-note triplets: F-18 DECAY → POSITRON → ANNIHILATION → TWO GAMMA PHOTONS → SCINTILLATION CRYSTAL → OPTICAL LIGHT → ELECTRICAL SIGNAL → COINCIDENCE → PET IMAGE (title, bar 37) → the camera zooms back out to the ring, the image turns back into tissue, and the annihilation of frame one happens again (seamless loop). |

Chips under the caption mark representations: VISUALIZATION (particles and gamma photons are not visible light), NOT TO SCALE (atom and nucleus), TIME-LAPSE (circulation, uptake), TIME-COMPRESSED (event montages), ABOUT 1 HOUR EARLIER (the injection), SIMPLIFIED (reconstruction).

## Colour code

| Thing | Colour |
|---|---|
| Positron | magenta (with a + mark on close-ups) |
| Electron | electric blue (with a − mark) |
| Gamma photon | gold |
| Fluorine-18 | orange |
| Scintillation crystal | cyan |
| Scintillation photons | pale blue |
| Silicon photomultiplier | purple |
| Electrical pulses, accepted coincidence | neon green |
| Rejected detection | dim grey |
| Line of response | cyan |
| PET activity image | blue → green → yellow → red |
| Scanner components | dark metallic grey |
| Body tissue | deep red and pink |

## Models (drawn to real proportions)

- **Chest, axial (mm):** radiology convention (patient's right on the viewer's left), supine on a curved pallet: skin and fat, chest-wall muscle, ribs, sternum and scapulae, a vertebra with spinal canal, both lungs, the heart with its chambers, the descending aorta and oesophagus, and a lung nodule. Drawn as tissue (with heartbeat and breathing while the patient is in the scanner), CT greys, PET heat or PET/CT fusion (the reconstructed images are time-averaged and do not move).
- **Detector ring (front):** 38 stationary modules. LYSO crystal face at R = 410 mm (82 cm ring), 20 mm crystals, SiPM layer, readout board with ASIC, cooling plate, dark metallic gantry covers, 78 cm bore.
- **PET/CT side view:** gantry about 2 m tall with the bore centred 1 m above the floor; CT section in front (X-ray tube and detector arc) and five PET detector rings behind it; the patient lies supine, head first, arms raised, chest in the PET field of view, with the IV cannula still taped in the forearm.
- **Module cutaway:** 4 × 4 × 20 mm LYSO crystals wrapped in reflector, coupled 1:1 to purple SiPMs, readout board, cooling channel.
- **SiPM:** a grid of Geiger-mode microcells with quench resistors and a metal bus; dark counts flicker.
- **Molecules and cells:** FDG in Haworth projection (the F replaces the C2–OH) and FDG-6-phosphate; tissue and capillary cells; biconcave red cells in laminar flow; GLUT transporters and hexokinase.
- **Injection:** forearm on an arm board, cephalic vein, cannula pointing towards the heart, tungsten syringe shield with a lead-glass window, nitrile-gloved hand.
- **Nucleus:** F-18 has 9 protons and 9 neutrons; after decay it is O-18, with 8 protons and 10 neutrons.

## Quality test (where each answer is shown)

1. Why does the patient receive a tracer? S03, S05.
2. Where does the positron come from? S06, S07.
3. Why are gamma photons produced? S09.
4. Why do two detectors respond? S01, S10.
5. What happens inside the crystal? S11 (steps 1–2).
6. Why does scintillation produce light? S11 (steps 3–4, energy levels).
7. How does the light become electricity? S12.
8. What does each detector measure? S13.
9. How are matching photon events identified? S14.
10. Why a line, not a point? S15.
11. Why are many events needed? S16.
12. How is the activity image made? S17.
13. What does CT add? S18.

## Short-video notes

- **Safe zones.** Captions, chips, HUDs, recap dots and the end title stay inside logical x 18–240, y 37–362, clear of the app's top tabs, side buttons and bottom caption area; the struck modules sit on a diagonal for the same reason.
- **One-line labels.** Every micro-context line fits on one line; anything longer wraps into balanced lines.
- **Never fully still.** Holds keep a meaningful layer moving: detector singles, the live heartbeat and breathing, a signal running along the line of response, twinkling excited centres, the waveform being read out, the record being read into the electronics, the possible origins along the line, the colour key, and a light sweep across the title.
- **Loop.** The last frame flows straight into frame one (the change between them is like any two consecutive frames).

## Science notes and simplifications

- The image is a reconstructed map of tracer distribution, not a photograph and not anatomy; CT supplies the anatomy.
- FDG is a glucose analog: any cell that uses glucose takes it up. Uptake appears in normal tissue (brain, heart, kidneys, bladder), inflammation and tumours, so a bright focus is not proof of cancer.
- FDG is usually injected about an hour before the scan (the uptake period).
- Particles are slowed by many orders of magnitude; nanosecond timing is shown in slow motion. The positron range is exaggerated so it can be seen.
- Photon non-collinearity (about ±0.25°) is too small to draw.
- The coincidence window (4 ns) and energy window (435–585 keV) are typical values; a candidate pair can still be a scattered or random coincidence.
- Reconstruction is shown as a simplified iterative estimate; real systems use OSEM-type methods with CT-based attenuation, scatter, randoms and normalisation corrections.
- Detector geometry is generic (no vendor) and real-scale.
- Annihilation is silent; all atomic-scale sounds are artistic sonifications.

## Sound design

128 BPM in E minor. Bar n starts at (n − 1) × 1.875 s.

| Bars | Time (s) | Section |
|---|---|---|
| 1–2 | 0–3.75 | Hook riff from frame one; two detector clicks at 0.6 s |
| 3–4 | 3.75–7.5 | Machine groove for the scanner |
| 5–8 | 7.5–15 | Clinical groove for the tracer's journey; trapped on bar 8 |
| 9–10 | 15–18.75 | Scale dive |
| 11–12 | 18.75–22.5 | Decay build-up; the decay on bar 12 |
| 13–14 | 22.5–26.25 | Build: snare rolls, half a beat of silence |
| 15–16 | 26.25–30 | DROP on the annihilation |
| 17–20 | 30–37.5 | Half-time detector physics: detection, crystal, light and SiPM on bar downbeats |
| 21–26 | 37.5–48.75 | Rhythmic measurement, coincidence and line of response |
| 27–31 | 48.75–58.1 | Many events, then the reconstruction rising |
| 32–35 | 58.1–65.6 | Warm reveal of the final image (bar 32) and the fusion (bar 34) |
| 36–37 | 65.6–69.4 | Recap with the hook riff; the title on bar 37 |
| 38 (1.33 beats) | 69.4–70 | Riser into bar 1 |

Every SFX is tied to a visible mechanism (detector clicks, connection tone, fluid push, transporter, trapping lock, nuclear transition, decelerating ticks, dual-channel annihilation, directional sweeps, crystal impact, scintillation shimmer, sensor conversion, data capture, coincidence confirmation, geometric tracking, processing ticks, a warm completion). Sub-bass is moderate and blips are quiet. The offline render's tail past 70 s is folded onto the start, so the annihilation that begins just before the loop point is heard on frame one.

## Source map

| File | Contents |
|---|---|
| `src/00_core.js` | Pixel buffer, rasterizers, masks with 16-bit shading, camera, easing, fonts. |
| `src/01_ui.js` | Callouts, balanced micro-context, tags. |
| `src/02_pal.js` | PET palette, heat palette, extra glyphs, noise, splines. |
| `src/05_fx.js` | Paths and helpers. |
| `src/06_particles.js` | Positron and electron clouds (with charge marks), gamma packets, optical photons, neutrino, annihilation flash, nuclei. |
| `src/10_body.js` | Coronal body outline (mini-map); axial chest slice (tissue / CT / PET / fused). |
| `src/11_scanner.js` | Detector ring, module cutaway, SiPM, PET/CT side view with patient and IV, sinogram. |
| `src/12_micro.js` | Tissue, FDG (and FDG-6-phosphate), water-scale positron track, blood (with tracking), uptake, IV injection. |
| `src/13_data.js` | Energy levels, event cards and records, reconstruction estimates, circulation mini-map, the scanner turn. |
| `src/20_scenes.js` | The 19-scene timeline, transitions, chips. |
| `src/30_audio.js` | Score and SFX, offline render with loop folding, live scheduler. |
| `src/40_player.js` | Controls and the export API. |
