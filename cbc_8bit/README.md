# How Blood Test Machines Count Your Cells — pixel-art scientific animation (code project)

**How electricity and lasers analyze your blood**, in 65 seconds and 27 micro-scenes grouped in 7 continuous
sequences, 9:16, original 16-bit pixel art in a Kurzgesagt-style flat-science grammar, rendered entirely in code
(HTML5 Canvas 2D and JavaScript), with an original lo-fi hip-hop soundtrack and soft SFX synthesised sample by sample
in the same JavaScript. No narration, no subtitles, only short English labels. The example is a complete blood count
(CBC) on a benchtop hematology analyzer with an XN-type architecture (original design, no brand): electrical
impedance for red cells and platelets, SLS photometry for hemoglobin, and fluorescence flow cytometry (WDF + WNR
channels) for the white cells. It is an educational model; the values on screen are illustrative.

- `index.html` is a self-contained player: open it in a browser (click to play, arrows to seek, M to mute). It
  synthesises the soundtrack in a few seconds after the first frame appears.
- `tools/export.js` renders the MP4 (the MP4 is not in the repository: render it on your machine, below).
- `镜头表.md` is the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 3,900 frames (65.000 s). H.264, yuv420p, BT.709. The 360×640 logical canvas is upscaled ×3 with nearest-neighbour, so every pixel stays crisp. |
| Audio | Original lo-fi score on a 118.15 BPM grid played half-time (32 bars = 65.000 s), F major, plus 158 event-synced SFX. AAC 48 kHz stereo, mastered to −15 LUFS with the true peak at −1.75 dBTP. |
| Loop | The needle rises, the screen clears and the camera ends on the exact framing of frame one (the last frame matches frame one pixel for pixel); the music tape-stops on the last half second and every note or tail that runs past 65 s wraps to 0:00. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy (mastering)

```
cd cbc_8bit
node tools/export.js                  # full MP4 -> output/cbc_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 0 1.3 2.6 20.3 42.8 53.8 --scale 2   # check any frames
```

No browser is needed for the export: the picture (about 3 ms per frame in Node) and the soundtrack (about 8 s) are
both computed in Node; most of the time goes to the H.264 encode. To check the result:
```
ffprobe output/cbc_8bit.mp4
ffmpeg -i output/cbc_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 3,900 frames, an integrated loudness around −15 LUFS and a true peak below −1 dBTP.

Optional checks (need Playwright Chromium, `npm i playwright && npx playwright install chromium`, only for the first):
`node tools/smoke.js` (player test), `node tools/qa_motion.js` (motion scan), `node tools/audio_qa.js` (audio numbers),
`node tools/proxy.js` (a 720×1280 proxy for the skill's `film_gate.py`).

## The hook (0–3 s)

The tube and the analyzer are in the very first frame, a count of millions lands before 1.1 s, and the mechanism is
previewed by 3 s:
- **0.0 s** a purple-top (EDTA) blood tube stands in the analyzer's sampler under a steel needle.
- **0.14 s** the needle pierces the cap; **0.42 s** it draws a little blood.
- **0.8 s** match cut to the display, which slams in; **1.02 s** (on the beat) **RED BLOOD CELLS 4.80 MILLION / µL**
  lands, WBC and PLT follow on the half beats. A chip says **RESULT PREVIEW**: a real run takes about a minute.
- **1.9 s** a portal opens out of the number: one red cell slips into a tiny aperture, the voltage pulse rises
  (its peak on the beat at 2.54 s) and the counter reads **RBC 0001** as it leaves: **ONE CELL → ONE PULSE**.
- **3.0 s** the portal closes onto the needle and the film follows the blood from the start: **FOLLOW THE BLOOD**.

## One sample, one journey

The film follows **one tube, one analyzer, one red cell through one aperture, one platelet, one hemoglobin cuvette,
one white cell through one laser, one scattergram and one report**. The red cell that is counted, the cells lysed for
hemoglobin and the white cell analysed by laser come from **separate measured aliquots** of the same sample, never
one cell through every pathway. Micro-scenes inside a sequence join by camera moves, zoom portals (the next scale
opens in a growing circle where the camera dives, and closes again on the way out) and short dithered dissolves; the
only hard cuts are at 0.8 s, 27 s and 32 s.

| # | Time (s) | Caption / labels | What happens |
|---|---|---|---|
| **A** | **0–3** | **Hook** | |
| 01 | 0–0.8 | — | The needle pierces the lavender cap and draws blood. |
| 02 | 0.8–1.8 | RED BLOOD CELLS 4.80 MILLION / µL · WBC 7,200 / µL · PLT 250,000 / µL | The display slams in; the values land on the beat. |
| 03 | 1.8–3 | ONE CELL → ONE PULSE | A portal from the number: one red cell, one voltage pulse, the counter adds one. |
| **B** | **3–11** | **The sample** | |
| 04 | 3–5 | FOLLOW THE BLOOD · SAMPLING NEEDLE · SYRINGE PUMP | The housing turns X-ray; the pump's piston draws the measured blood through the tubing to the valve. |
| 05 | 5–7.5 | RED CELL ~7.5 µm · WHITE CELL ~12 µm · PLATELET ~2.5 µm | A dive into the tubing: tumbling red discs, a white cell with its purple nucleus and violet platelets ride the amber plasma, at their true relative sizes. |
| 06 | 7.5–9 | CONTROLLED DILUTION | The mixing chamber: diluent sweeps in as a mixing front and the crowded cells spread apart. |
| 07 | 9–11 | THREE MEASUREMENTS · RBC / PLT · HGB · WBC | Pull back through the machine: three aliquots leave for three detectors; the RBC/PLT path lights up and the camera dives in. |
| **C** | **11–27** | **Impedance** | |
| 08 | 11–13 | CONDUCTIVE ELECTROLYTE · ELECTRODE + · ELECTRODE - · IONS CARRY THE CURRENT | Two chambers of electrolyte, silver electrodes, a constant-current source; cations and anions drift opposite ways along the current lines. |
| 09 | 13–15 | APERTURE SENSOR · APERTURE · SHEATH FLOW | A slow push ends on the aperture: every current line squeezes through it; sheath flow lines the sample up on the axis. |
| 10 | 15–18 | RED CELL · NO CELL INSIDE → FLAT | The voltage scope appears; one red cell drifts out of the nozzle; the trace stays flat. |
| 11 | 18–21 | CELL RAISES RESISTANCE · VOLTAGE RISES | The cell enters, the current lines bend round it (it is an insulator), the trace rises and holds while it is inside. |
| 12 | 21–23 | ONE CELL = ONE PULSE · COUNT +1 | It leaves, the trace falls back, the counter reads RBC 0001 on the beat. |
| 13 | 23–25 | SIZE → PULSE HEIGHT · PLATELET: SMALL PULSE · RED CELL: BIG PULSE | A platelet makes a small pulse, then a red cell a big one. |
| 14 | 25–27 | CELL COUNT + SIZE | Time-lapse: cells stream through one at a time, the counters run, the camera pulls back and the size histogram builds two populations. |
| **D** | **27–32** | **Hemoglobin** | |
| 15 | 27–29 | RELEASE THE HEMOGLOBIN · SLS DETERGENT · HEMOGLOBIN | Hard cut to a separate aliquot: SLS opens the red cells, hemoglobin spills out and binds SLS as a brown complex. |
| 16 | 29–32 | MORE HEMOGLOBIN → LESS LIGHT · LED · SLS-HB ABSORBS LIGHT · PHOTOSENSOR · HGB 14.2 g/dL | The photometer: yellow-green LED light crosses the cuvette, some photons are absorbed, fewer reach the sensor; the reading lands on the beat. |
| **E** | **32–45** | **White cells and the laser** | |
| 17 | 32–34 | WHITE CELL CHANNEL · WHITE CELL | Hard cut to a third aliquot; the camera tracks one ringed white cell among red cells. |
| 18 | 34–36 | RED CELLS REMOVED · RED CELLS BURST · WHITE CELL STAYS | The lysing reagent turns the red cells into ghosts and fragments; the white cell stays, with small pores. |
| 19 | 36–38 | FLUORESCENT DYE · DYE · DNA · RNA | A dive into the cut-open cell: dye enters through the pores and binds DNA in the lobed nucleus and RNA in the cytoplasm, still dim. |
| 20 | 38–41 | HYDRODYNAMIC FOCUSING · SHEATH FLUID · SAMPLE CORE · RED LASER | Out of the cell and back through the flow cell: sheath fluid squeezes the sample into a thin core that crosses a red laser. |
| 21 | 41–45 | LASER HITS THE CELL · GREEN FLUORESCENCE · SCATTERED LIGHT | The cell meets the beam on a bar downbeat: it glows green, light scatters forward and to the side; time slows. |
| **F** | **45–56** | **Optical detection and data** | |
| 22 | 45–48 | THREE OPTICAL SIGNALS · FORWARD SCATTER → SIZE · SIDE SCATTER → GRANULES · FLUORESCENCE → DNA+RNA | Held in the beam, the light paths are traced: forward light past a beam stop to its photodiode; side light through a lens to a dichroic mirror that sends the scatter down to the SSC detector and passes the green fluorescence through a filter to the SFL detector. |
| 23 | 48–51 | LIGHT → ELECTRICAL PULSES · PHOTODIODES · ONE PULSE PER CELL | Time resumes; three traces (FSC, SSC, SFL) show one pulse per cell as more white cells cross one at a time. |
| 24 | 51–54 | EACH DOT = ONE CELL | The WDF scattergram: the first cell lands at its side-scatter and fluorescence heights; hundreds follow and four groups form (NEUT, LYMPH, MONO, EO). |
| 25 | 54–56 | WNR ADDS BASOPHILS · WDF + WNR = 5-PART DIFF | The WNR plot (fluorescence vs forward scatter) slides in and the basophils separate; the five-part differential builds. |
| **G** | **56–65** | **Results and loop** | |
| 26 | 56–60 | ALL DATA → ONE REPORT | Impedance, laser and light data flow into the processor (calibration, dilution, flag rules, QC); a portal closes onto the display, where the report types in row by row; checks, then QC PASSED · NO FLAGS. |
| 27 | 60–65 | HOW BLOOD TEST MACHINES WORK | Pull back to the analyzer; four recap tiles pop in on the beats (RBC → PULSE, WBC → LASER, HGB → LIGHT, → REPORT); the needle rises, the screen clears and the camera returns to the tube: the last frame is frame one. |

Honesty chips, one at a time for about 3 s each: RESULT PREVIEW, RELATIVE SIZES TO SCALE, SEPARATE ALIQUOTS,
APERTURE NOT TO SCALE, SLOWED DOWN, THOUSANDS OF CELLS / SECOND, SEPARATE ALIQUOT, ANOTHER ALIQUOT, DIM UNTIL THE
LASER HITS, SLOWED DOWN, SIMPLIFIED OPTICS, COLOURS = SOFTWARE GROUPS, EXAMPLE VALUES.

## Colour code (fixed for the whole film; colours are educational)

| Colour | Meaning |
|---|---|
| Dark navy | the ground |
| Crimson | red blood cells (a biconcave disc with no nucleus) |
| Off-white with purple nuclei | white blood cells (segmented, round, kidney-shaped or bilobed nuclei by type) |
| Small violet fragments | platelets |
| Amber | plasma |
| Soft cyan | conductive electrolyte |
| Silver | electrodes |
| Thin cyan dashes | electrical current |
| Neon green | electrical pulses and signal traces |
| Red | the laser |
| Warm orange / cyan | forward / side scattered light |
| Bright green | fluorescence (the dye is dull green until the laser excites it) |
| Metallic blue | photodetectors |
| Yellow-green | the hemoglobin LED light; brown is the SLS–hemoglobin complex |
| Cyan / white | digital data |
| Cyan, pink, green, orange, yellow | software groups on the scattergrams (NEUT, LYMPH, MONO, EO, BASO), not cell colours |

## Sound design

An original lo-fi hip-hop score, synthesised in plain JavaScript (no samples): a 118.15 BPM grid played half-time,
so the groove sits at a laid-back 59 BPM, in F major on jazzy ii–V–I–vi changes (Gm9 – C13 – Fmaj9 – Dm9, two bars
each). An FM electric piano with tremolo plays strummed, swung voicings; a warm saturated sine bass glides into each
new chord; swung boom-bap drums (soft kick with a knock, dusty snare, rim clicks, swung hats, shaker); a kalimba riff
with a ping-pong echo is the earworm (A–C–D, C–A–G–F) and keeps coming back; a soft pad, vinyl hiss and crackle, and
tape wow and flutter that repeat exactly every 65 s; the bed breathes with the kick and sits in a plate reverb; the
master rolls off the top like an old tape.

| Bars (time) | Sequence | Music |
|---|---|---|
| 1–2 (0–4 s) | Hook | Full groove and the riff from the first frame |
| 3–6 (4–12 s) | The sample | The riff again, then softer, leaving room for the pump and the pour |
| 7–12 (12–24 s) | Impedance | Rim clicks instead of the snare and no riff: the pulse bips carry the melody |
| 13–14 (24–27 s) | Time-lapse | The riff returns with a shaker |
| 27–32 s | Hemoglobin | The music goes underwater (low-pass) exactly on the cut at 27 s and surfaces on the cut at 32 s; drums down to the kick |
| 17–21 (32.5–42.7 s) | White cells | The groove returns with a pad; a snare fill into the laser hit |
| 22–24 (42.7–48.75 s) | Slow-motion | Drumless: sustained chords, kalimba bells, a reverse cymbal into the next bar |
| 25–28 (48.75–56.9 s) | Detection, data | Full groove with a shaker; the riff doubled a third below |
| 29–30 (56.9–60.9 s) | Report | On the tonic; the QC chime |
| 31–32 (60.9–65 s) | Recap, title | Recap bells on the beats, the riff's first notes under the title, a tape stop that falls back into bar 1 |

The SFX are soft, rounded and tuned to the key: the cap pierce and the aspiration, the display slam and the result
ding, digital ticks for the other values, zoom whooshes for every portal, the pump motor, the diluent pour with
bubbles, three ticks as the aliquots arrive, the current's hum, the scope switching on, **the pulse bip**, the count
blips, the histogram run, soft pops as the cells burst, the SLS binding glitter, the LED click and its quiet tone, the
hemoglobin result, dye pings, the flow, the laser's hum, the laser hit with a time-slowing sweep, the fluorescence
shimmer, three scatter tones, detector clicks (one triad per cell), the plotting ticks, the colouring shimmer, five
rising tones for the differential bars, data chirps, report ticks and checks, the QC chime, four recap bells, the
needle retracting and the title chord. **The pulse bip is the voltage itself**: its loudness is computed from the same
particle positions that draw the scope trace (A for red cells, a high E for platelets; A and E fit all four chords).
Cells, light and current make no sound in reality: these are educational sonifications.

## Quality checks run before delivery

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint.py` with no red flags (27 shots, 65 s, no text-led
  shot). The yellows: shots 01–03 and 06 last 0.8–1.5 s; they are the brief's hook micro-scenes and the short
  dilution beat, each one visual event, joined by camera moves.
- **Skill film gate** (`film_gate.py`, on a 720×1280 QA proxy rendered at 30 fps from the same engine; the proxy is
  not a deliverable): all three gates green. Fast-motion frames 0.132 (needs ≥ 0.06; worst 30 s window 0.074), no
  blank stretch, blue-purple frames 0.000, still frames 4.6 % with the longest still stretch 0.33 s, 4.6 visual
  events per 10 s, dead background 0.18, 3.7 push-ins per minute. The one yellow is the fixed-page-frame share, 0.30:
  a diagnostic run shows it comes from the world, not from captions or logos. The camera is locked on the impedance
  aperture from 13 to 25 s (the brief asks to hold the camera while a mechanism plays: approach, entry, exit) and
  held during the laser slow-motion, so the aperture plate and the optics stay put while the scope, the counters and
  the tags change around them. Captions and chips each leave after about 3 s.
- **Motion scan** (`tools/qa_motion.js`, 30 fps): no window of 0.5 s or more with under 0.3 % of the pixels moving
  (an earlier pass had two, while the WNR dots arrived: an acquisition sweep and a pulsing ring on the basophils
  fixed them). Frames where more than 55 % of the pixels change are exactly the three planned cuts: 0.8 s (69 %),
  27.0 s (86 %), 32.0 s (100 %). 0 % blue-purple frames. About 3.2 ms per frame in Node at the 360×640 logical size.
- **Loop:** the last frame matches frame one exactly (0.00 % of its pixels differ; a normal frame step there is
  0.30 %); the soundtrack's wrap has no jump.
- **Audio** (numbers only, not a listening test; `tools/audio_qa.js`): exactly 65.000 s; −15.0 LUFS integrated,
  −1.75 dBTP true peak, 3.4 LU loudness range (an even background bed). Bars sit at −16 to −18 dBFS RMS; the
  drumless slow-motion bars dip to −19.0 and −20.7. 41 % of the energy is below 120 Hz and 58 % between 120 Hz and
  2 kHz (a first pass had 74 % below 120 Hz: the kick got lighter with a mid knock and the bass gained harmonics, so
  it reads on phone speakers). 746 music notes and hits, 158 SFX. A stem check (an SFX-only render against a
  music-only render, same code) puts 149 of the 158 cues within 6 dB of the music in their strongest octave band or
  above it (median +9.3 dB); the quieter ones are the current's hum bed and the dense plotting ticks, meant as
  texture.
- **Player:** headless Chromium smoke test (play, seek) with no errors; the soundtrack synthesises in the browser.
- **Self-review against the skill's six failure modes:** no page frame or bullet slides (every shot is one visual
  event, captions and chips leave after 3 s, the camera changes from shot to shot); original compositions and an
  original analyzer design, nothing copied from sample films; a concrete object in every shot (tube, needle,
  analyzer, tubing, cells, chamber, electrodes, aperture, cuvette, LED, flow cell, laser, lenses, photodiodes,
  scattergram, processor, report); no dead ground (current dashes, drifting ions, flowing cells, photons, dust and
  data dots keep moving); one pixel-art style and palette from the first frame to the last, no blue-purple ground; no
  people, no faces on cells or molecules. No separate reviewer agent was used.

To run the skill's delivery gate on your own render:
```
uv run ../.claude/skills/huashu-art-motion/scripts/film_gate.py output/cbc_8bit.mp4
```

## Science notes

What the film shows, simplified but correct in order and cause:
- **The sample.** Venous blood in an EDTA (lavender-top) tube, which prevents clotting. The closed-tube sampler
  pierces the cap; a syringe pump moves a measured volume through a sampling valve; the analyzer splits it into
  separate aliquots and mixes each with its own reagents.
- **Dilution.** Whole blood holds about five million red cells per microlitre, far too crowded to measure cell by
  cell, so a precise dilution with an electrolyte diluent spreads them out. The dilution factor and the measured
  volume convert counts into cells per microlitre.
- **Electrical impedance (the Coulter principle).** Two chambers of conductive electrolyte are joined by a small
  aperture with an electrode on each side and a constant current between them. The current is carried by ions
  (cations one way, anions the other), not by free electrons in the liquid. A cell is a poor conductor: while it is
  inside the aperture it displaces electrolyte, the resistance of the aperture rises, and with a constant current the
  voltage rises (V = I × R). No cell, no pulse; the pulse starts only as the cell enters the sensing zone. The cell
  does not generate electricity. Each pulse counts one cell, and its height is proportional to the cell's volume.
  Sheath flow keeps cells on the axis and one at a time; red cells and platelets are separated by volume (platelets
  about 2–20 fL, red cells about 60–120 fL), giving the size histograms.
- **Hemoglobin (SLS method).** A separate aliquot gets sodium lauryl sulfate: the detergent lyses the red cells,
  releases the hemoglobin and binds it as a stable coloured SLS–hemoglobin complex (a cyanide-free method). An LED
  shines through the cuvette; the complex absorbs part of the light; a photosensor measures what passes. Absorbance
  rises with concentration (Beer–Lambert), and calibration converts it to g/dL. Hemoglobin is measured
  photometrically, not counted.
- **White cells (fluorescence flow cytometry).** In another aliquot a lysing reagent breaks up the red cells and
  makes small pores in the white-cell membranes; a fluorescent dye enters and binds nucleic acids (DNA in the nucleus,
  RNA in the cytoplasm). The dye stays dark until excited. In the flow cell, sheath fluid squeezes the sample into a
  narrow core (hydrodynamic focusing) so the cells cross a red semiconductor laser one at a time. Each cell scatters
  light forward (FSC, related to size) and to the side (SSC, internal complexity and granules) and emits side
  fluorescence (SFL, nucleic-acid content). Photodiodes turn each flash into an electrical pulse.
- **Scattergrams.** Each cell becomes one dot from its measured pulses (measured events, not a photograph). On the
  WDF plot (side scatter against side fluorescence) the dots fall into neutrophils (with basophils), lymphocytes,
  monocytes and eosinophils; the WNR channel (fluorescence against forward scatter) gives the WBC count and separates
  the basophils (and nucleated red cells). Together they give the five-part differential. The colours are the
  software's group labels.
- **The report.** The processor combines the three data streams with calibration, the measured volume and dilution,
  flagging rules and quality control, then prints the complete blood count. The values shown (RBC 4.80 ×10⁶/µL,
  WBC 7.20 ×10³/µL, PLT 250 ×10³/µL, HGB 14.2 g/dL, differential 58 / 30 / 7 / 4 / 1 %) are illustrative, not a
  patient's results; reference ranges depend on the laboratory.

Scientific basis: the standard descriptions of the Coulter (electrical impedance) principle, the SLS–hemoglobin
method and fluorescence flow cytometry with WDF and WNR channels in XN-type hematology analyzers, as named in the
brief. The sources were not re-checked online for this build.

Simplifications: the aperture, the optics and the chambers are not to scale (an aperture is roughly ten red cells
wide); the side-collection optics are drawn on a diagonal toward the viewer; a few cells stand in for thousands per
second; the counting, the laser crossing and the lysis are slowed down; the scattergram clusters are a model;
colours are educational.

## Source map

| File | Contents |
|---|---|
| `src/00_core.js` | pixel buffer, palette, rasterisers, masks, camera and camera tracks |
| `src/01_font.js` | pixel fonts (captions, micro labels, title) |
| `src/02_pal.js`, `src/03_clock.js`, `src/05_fx.js` | noise, splines, loop-safe wobble, seeded random; the 118 BPM grid, micro-scene starts, the example values, the sensing-zone pulse model and the size model; paths, flashes, arrows, marks |
| `src/10_lab.js` | the lab, the analyzer (sampler bay, needle carriage, display), the EDTA tube, the result and report screens |
| `src/11_fluid.js` | the X-ray interior (pump, valve, tubing, mixing chamber, three detectors, reagent bottles, processor board), whole blood in the tubing, the dilution |
| `src/12_cells.js` | red cells (face-on and edge-on), the five white-cell types, platelets, flowing suspensions |
| `src/13_imped.js` | the impedance chamber (electrolyte, electrodes, current source, current lines, ions, aperture, sheath flow), the scope, counters, the size histogram |
| `src/14_hgb.js` | SLS lysis and the SLS–hemoglobin complex, the photometer |
| `src/15_flow.js` | the white-cell channel and lysis, the stained cell cut open, the flow cell, laser and optics, the pulse traces |
| `src/16_data.js` | the WDF and WNR scattergrams, the processor, the recap tiles |
| `src/23_scenes.js`, `src/24_overlay.js` | the 27 micro-scenes and their transitions; captions, tags, chips, title |
| `src/30_audio.js` | the lo-fi synthesiser, the score, the SFX map, mixing and effects, the player's playback |
| `src/40_player.js` | the player |
| `tools/` | build, export (Node audio + ffmpeg video), mastering, stills, smoke test, motion scan, film-gate proxy, audio QA, profiler |
