# How Medical Linear Accelerators Work — 8-bit scientific animation

*A 105-second, 29-scene 2D pixel-art explainer. The style is 8-bit crisp pixels with a 16-bit palette and shading. It is built with HTML5 Canvas 2D, JavaScript and Web Audio, and directed with the Kurzgesagt grammar from the `huashu-art-motion` skill: scale travel, pauses that light up before a dive, callouts with leaders, and K75 easing.*

| | |
|---|---|
| Player | `index.html`. A single self-contained file with no network access; open it in a browser. |
| Video | `output/linac_8bit.mp4`, created by `node tools/export.js`. |
| Format | 9:16, 1080×1920, 60 fps, exactly 6,300 frames (105.000 s), H.264 High, yuv420p, BT.709, AAC 48 kHz stereo. |
| Loudness | −15 LUFS integrated, true peak ≤ −1 dBTP after AAC encoding. |
| Picture | Logical canvas 270×480, upscaled exactly ×4 with nearest-neighbour. Every 4×4 block maps onto the 4:2:0 chroma grid, so colour edges stay crisp. |

## Playing

Open `index.html`. The controls sit outside the composition:

- **Play/Pause:** button, Space, or click the picture.
- **Replay:** button, or R.
- **Mute:** button, or M.
- **Scrubber:** drag it. ←/→ step one second; Shift+←/→ step one frame.

Audio starts only after the first click. The audio clock drives the picture, so pausing, resuming or seeking never doubles a sound. Long sustained layers (pads, beam hiss, gantry hum) resume correctly mid-note after a seek.

`renderFrame(t)` is a pure function of time. Every particle position, trail, energy bar and the accumulated VMAT dose is rebuilt from `t`, so seeking anywhere gives the same frame the export does. All randomness is seeded hashing, so there is no state between frames.

## Exporting the MP4

Requirements: Node ≥ 18, Playwright Chromium, ffmpeg with libx264, and Python 3 with numpy and scipy.

```
node tools/export.js            # build -> audio -> master -> 6300 frames -> mux
node tools/stills.js out.png 12.5 44.6 61.2 --scale 2   # contact sheet of any times
node tools/smoke.js shot.png    # open index.html headless: play, pause, seek, screenshot
```

1. `tools/build.js` inlines `src/*.js` into one closure inside `index.html`.
2. The soundtrack comes from the same Web Audio graph as the player, rendered in an `OfflineAudioContext` in headless Chromium. `tools/master.py` then applies:
   - a DC blocker;
   - BS.1770-4 gated loudness measurement;
   - make-up gain to −15 LUFS;
   - a look-ahead limiter with 4× oversampled true-peak detection (−1.6 dBTP).
3. The frames come from the same engine sources, loaded in Node (`tools/engine.js`). They are piped as 270×480 RGB to ffmpeg, which scales them ×4 with `flags=neighbor` and encodes yuv420p BT.709 with libx264.
4. ffmpeg muxes the picture with AAC 256 kb/s.

The MP4 is a real H.264/AAC file encoded from these frames. It is not a renamed WebM or screen capture.

## Source map

| File | What it holds |
|---|---|
| `src/00_core.js` | Pixel buffer and fixed palette. Rasterizers (scanline polygons, discs, Bresenham lines, dithering, glows). Masks with 16-bit rim and shadow shading. K75 and backOut easing, seeded hashes, the camera, and the three bitmap fonts. |
| `src/01_ui.js` | Callouts (the leader grows first, then the text types). Micro-context lines, tags, the RADIATION VISUALIZED and NOT TO SCALE badges, the RELATIVE DOSE legend and meters. |
| `src/05_fx.js` | Shape coding:<br>• electrons: dots with short trails;<br>• photons: yellow line packets or zigzags;<br>• RF: purple sine patterns;<br>• •OH tags.<br>Also arc-length paths. |
| `src/10_body.js` | The axial chest section shared by every scene, with illustrated and CT palettes. Also the precomputed VMAT dose: 180 control points, cumulative maps, 5 isodose bands from blue through amber to red. |
| `src/11_room.js` | End view of the treatment room: gantry drum, head, kV imager and panel, couch, wall lasers, MV and kV beams. |
| `src/12_screens.js` | The planning workstation and the treatment console. |
| `src/13_machine.js` | Side cutaway of the LINAC: modulator, RF source, klystron, RF waveguide, electron gun, accelerating waveguide, beam transport, 270° bending magnet, and the treatment head in its fixed order. |
| `src/14_micro.js` | One nested zoom chain (tissue → cell → nucleus → DNA), the tungsten lattice and the water field. |
| `src/20_scenes.js` | The master timeline: 29 scenes at the brief's exact time ranges, plus the transitions and badge intervals. |
| `src/30_audio.js` | The score (128 BPM, 56 bars, D minor) and the event-synced SFX. The live lookahead scheduler is used for preview, the offline render for export. |
| `src/40_player.js` | Controls, scaling and the `window.LINAC` export API. |

## Storyboard (exact time ranges)

| # | Time (s) | Label (+ micro-context) |
|---|---|---|
| 01 | 0–2 | WEEKS LATER (before/after wipe within the first second) |
| 02 | 2–5 | DNA DAMAGE (preview dive: tumour → cell → nucleus → DNA) |
| 03 | 5–8 | HOW DOES IT WORK? (fast pull-out to the LINAC) |
| 04 | 8–11 | TREATMENT PLANNING (CT contouring) |
| 05 | 11–14 | PLANNED DOSE |
| 06 | 14–17 | PATIENT ALIGNMENT (wall lasers on skin marks) |
| 07 | 17–20 | IMAGE GUIDANCE (kV image and registration) |
| 08 | 20–22 | SAFETY CHECK |
| 09 | 22–24 | INSIDE THE LINAC (cutaway, both pathways traced) |
| 10 | 24–27 | HIGH-POWER PULSES (modulator) |
| 11 | 27–30 | RF AMPLIFICATION (low-power RF → klystron → RF waveguide) |
| 12 | 30–33 | ELECTRON GUN |
| 13 | 33–38 | ELECTRON ACCELERATION + "RF fields transfer energy to electrons." + ENERGY ↑ |
| 14 | 38–40 | BEAM TRANSPORT |
| 15 | 40–43 | MAGNETIC BEAM BENDING |
| 16 | 43–49 | BREMSSTRAHLUNG + "Electrons lose energy and emit X-rays." |
| 17 | 49–52 | BEAM FILTERING |
| 18 | 52–55 | BEAM MONITORING |
| 19 | 55–58 | BEAM COLLIMATION |
| 20 | 58–64 | MULTILEAF COLLIMATOR + "Leaves shape and modulate the field." |
| 21 | 64–70 | VMAT DELIVERY + "Shaped radiation from multiple angles." |
| 22 | 70–73 | DOSE ACCUMULATION + "Healthy tissue also receives some dose." + RELATIVE DOSE |
| 23 | 73–78 | COMPTON SCATTERING + "A photon transfers energy to an electron." |
| 24 | 78–82 | SECONDARY ELECTRONS + "Electrons deposit energy through interactions." |
| 25 | 82–87 | WATER RADIOLYSIS + "Ionized water produces reactive species." |
| 26 | 87–92 | DNA DOUBLE-STRAND BREAK + "Direct and indirect interactions damage DNA." |
| 27 | 92–96 | CELLULAR RESPONSE: REPAIR / UNREPAIRED DAMAGE |
| 28 | 96–100 | TREATMENT OVER TIME: SESSION 1…7, OVER WEEKS |
| 29 | 100–105 | ILLUSTRATIVE RESPONSE → title → icons → RESPONSES VARY.; match cut to the opening composition |

## Science guardrails and how they are implemented

**A. RADIATION VISUALIZED.** A fixed badge sits at the bottom left whenever electron or photon paths are drawn. It covers:
- the 2 s preview track;
- kV imaging;
- the overview trace;
- 31–70 s (gun to VMAT);
- 74–92 s (Compton to DNA);
- the treatment sessions.

**B. Lasers, kV imaging and MV beams look distinct:**
- lasers: thin green lines that stop at the skin marks;
- kV: a faint pale cone from the side-mounted kV tube to the flat panel;
- MV: a bold yellow beam with packets from the treatment head.

**C. The magnet bends electrons only.** Scene 15 shows only cyan electrons in the loop, with B out of the page (⊙). For electrons that bends the path up into the 270° loop. No photons appear in that scene.

**D. Bremsstrahlung.** The electron stays cyan and keeps flying after it emits. It slows down: its trail gets shorter, its glow smaller, and its energy bar drops. A separate yellow photon appears with the energy difference, and higher-energy photons have shorter wavelengths.

**E. Head components keep separate jobs, in the fixed order** target → primary collimator → flattening filter → monitor chamber → jaws → MLC → patient:
- the flattening filter turns a peaked profile flat (shown in an inset graph);
- the monitor chamber's ion pairs drive an MU counter;
- the jaws set the rectangular field edges;
- the MLC shapes and modulates the field.

**F. VMAT.** Only one beam is on at any moment while the gantry orbits. Dose accumulates from 180 precomputed control points.

**G. Compton is not the only interaction.** Next to the featured Compton event:
- a second Compton event happens elsewhere;
- one photon crosses the field without interacting;
- a faint photoelectric absorption shows that other processes exist.

**H. Order of events.** Physics comes first: Compton, then secondary-electron ionizations and excitations. Chemistry follows: H₂O⁺ + H₂O → H₃O⁺ + •OH. The radical then diffuses to the DNA. Finally the double-strand break shows both routes: an indirect hit by •OH and a direct hit by a secondary electron.

**I. Repair, time and variability:**
- one break is repaired by repair proteins;
- an unrepaired cell stops dividing and fragments;
- the tumour shrinks over several sessions while healthy tissue grows back;
- the response is tagged ILLUSTRATIVE RESPONSE and the film ends on RESPONSES VARY.

**J. Schematic scales.** A NOT TO SCALE badge shows during every scale dive and every atomic or molecular scene.

### Simplifications

- **Machine distances.** The head-to-isocentre distance and the gantry dimensions are compressed so they fit in a 9:16 frame.
- **Machine look.** Components are schematic cutaways, not any one vendor's machine.
- **Speeds.** Electrons and photons are slowed by many orders of magnitude so they can be seen.
- **Modulator.** One pulse is shown, slowed down; in a real modulator pulses repeat hundreds of times per second.
- **Klystron.** It is drawn as an amplifier with growing cavity fields. Its internal electron beam is not shown, so it can't be confused with the treatment beam.
- **Waveguide fields.** The accelerating waveguide shows standing-wave fields alternating between cavities, with a bunch every two cells (π-mode). The cavity the tracked bunch is in always pushes it forward; that is why it is drawn brightest.
- **Anatomy and dose.** The chest section, tumour position and dose distribution are illustrative. They do not come from a patient or a clinical plan.
- **Tumour response.** It is illustrative only. Real responses vary by tumour, dose and patient.

## Typography and layout

All text is drawn in-engine on the 270×480 canvas with font pixels of 2×2 logical pixels (8×8 px in the export):

| Use | Font | Height in the export |
|---|---|---|
| Labels | 7-row condensed caps | 56 px |
| Micro-context | 5-row caps | 40 px |
| Title | 9-row bold caps, 2 lines | 72 px |

Text stays inside the safe area: x 72–1008 px, y 120–1680 px (that is, 72 px sides, 120 px top, 240 px bottom). Labels type in next to their objects, never flash, and sit on a plate that grows as the text types.

## Audio

Music runs at 128 BPM, 4/4, 56 bars = 105 s, in D minor:

| Time (s) | Section |
|---|---|
| 0–8 | Hook and molecular accents |
| 8–22 | Initialization groove |
| 22–43 | Build |
| 43–58 | Half-time precision |
| 58–73 | Servo 16ths and gantry |
| 73–92 | Sparse physics and chemistry |
| 92–105 | Resolution to F(add9) |

The SFX come from the same timing constants as the picture: thyratron fires, cavity crossings, photon emissions, Compton hits, ionizations and session ticks. They are grouped, with one cluster per action rather than one click per particle.
