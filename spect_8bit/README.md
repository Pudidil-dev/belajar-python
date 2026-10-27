# How SPECT Scanners Work — pixel-art scientific animation (code project)

**How invisible gamma radiation becomes a medical image**, in 68 seconds and 27 connected scenes, 9:16, original
pixel art in a Kurzgesagt-style flat-science grammar, rendered entirely in code (HTML5 Canvas 2D, JavaScript, Web
Audio). No narration, no subtitles, only short labels. The example is a conventional dual-head Anger gamma camera
(NaI(Tl) crystal + photomultiplier tubes) doing a Tc-99m sestamibi myocardial perfusion study.

- `index.html` is a self-contained player: open it in a browser (click to play, arrows to seek, M to mute).
- `tools/export.js` renders the MP4.
- `镜头表.md` is the shot list (written and linted with the huashu-art-motion skill before any code).
- `reference_storyboard.png` is the storyboard the models were redrawn from.

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 4,080 frames (68.000 s). H.264, yuv420p, BT.709. The 360×640 logical canvas is upscaled ×3 with nearest-neighbour, so every pixel stays crisp. |
| Audio | Original calm lo-fi score, 127.06 BPM played half-time in D major (36 bars = 68.000 s), plus event-synced SFX. AAC 48 kHz stereo, mastered to −15 LUFS with the true peak at or below −1.6 dBTP. |
| Loop | The recap's image collapses into one detection event, the camera pulls back to the exact framing of frame one, and the last chord (A13) falls back into bar 1, so the end flows into the start. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy
- Playwright Chromium: `npm i playwright && npx playwright install chromium`

```
cd spect_8bit
node tools/export.js                  # full MP4 -> output/spect_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 1.3 14.3 30.9 37.4 61.9 --scale 2   # check any frames
```

The picture takes one to three minutes (about 15–20 ms per frame on average, up to ~45 ms in the tissue scenes); the
offline audio render runs in Chromium and takes a few minutes depending on the machine.

To check the result:
```
ffprobe output/spect_8bit.mp4
ffmpeg -i output/spect_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 4,080 frames, an integrated loudness around −15 LUFS and a true peak at or below −1 dBTP.

## One journey, one example

The film follows **one tracer molecule, one Tc-99m nucleus, one 140 keV photon, one flash, one photoelectron, one
cascade, one pulse and one count** — then many counts, many angles and one image. The scanner is seen from the foot of
the table; the detector heads hang over the patient, so inside the head everything keeps that orientation: the
patient side is down and the signal rises (collimator → crystal → light guide → photomultipliers → electronics).
Worlds are joined by zoom portals (the next scale opens inside a growing lens where the camera dives), by a vertical
rise that carries the photon out of the body into the head, and by short dithered dissolves.

| # | Time (s) | Caption / labels | What happens |
|---|---|---|---|
| 01 | 0–1.89 | SPECT SCANNER · Tc-99m TRACER | The dual-head scanner, heads turning slowly; the camera rushes into the chest, the body becomes an X-ray cut-away, and a tracer in the heart wall emits a golden gamma photon. |
| 02 | 1.89–4.01 | GAMMA → LIGHT → SIGNAL · LEAD COLLIMATOR · NaI(Tl) CRYSTAL · PMTs · 1 EVENT · MANY EVENTS | The photon rises into the detector head, slips through one lead channel, flashes in the crystal; light reaches the tubes, a stylised cascade, a pulse, one dot in a projection preview, then many dots. A teaser. |
| 03 | 4.01–5.90 | Tc-99m SESTAMIBI · INJECTED BEFORE THE SCAN · ONE MOLECULE | Back to the start: the vial, a gloved hand on the syringe, the tracer into an IV line; one molecule is ringed. |
| 04 | 5.90–8.03 | BLOOD CIRCULATION · TRACER · RED BLOOD CELLS · TO THE HEART | Inside the vessel the ringed tracer rides the flow among tumbling red cells. |
| 05 | 8.03–11.10 | MYOCARDIAL UPTAKE · TIME-LAPSE · CAPILLARY · HEART MUSCLE CELL · MITOCHONDRIA | A capillary through heart muscle: the tracer leaves the capillary and stays in a muscle cell; a magnifier shows it gathering at a mitochondrion; more tracer accumulates (time-lapse). |
| 06 | 11.10–12.99 | Tc-99m NUCLEUS · 43 PROTONS · 56 NEUTRONS · = 99 NUCLEONS · NOT TO SCALE | The dive: molecule → technetium atom → its nucleus; the energy-level diagram slides in with the metastable level lit. |
| 07 | 12.99–16.06 | GAMMA EMISSION · Tc-99m / Tc-99 · ~140 keV · Tc-99m → Tc-99 + γ · STILL TECHNETIUM | The metastable level drops; one golden photon leaves the nucleus (an isomeric transition: no positron, no 511 keV pair). |
| 08 | 16.06–17.94 | GAMMA PHOTON · HEART TISSUE | Following the photon, the view widens from faint atoms to heart tissue. |
| 09 | 17.94–20.07 | ATTENUATION & SCATTER · ABSORBED · REACHES DETECTOR · SCATTERED · NEW DIRECTION | Three photons in tissue: one is absorbed, one Compton-scatters into a new direction with less energy, ours flies straight on. |
| 10 | 20.07–22.90 | LEAD COLLIMATOR · NaI(Tl) CRYSTAL · LIGHT GUIDE · PMTs · LEAD · PATIENT SIDE · PARALLEL CHANNELS | The photon rises out of the body to the head; the cut-away shows the stack; the camera slides along the lead channels. |
| 11 | 22.90–25.03 | ONLY SELECTED DIRECTIONS · BLOCKED · PASSES · LEAD ABSORBS, DOES NOT FOCUS | Two oblique photons hit lead septa and stop; ours runs straight up a channel; dashed lines show the finite acceptance angle. |
| 12 | 25.03–28.10 | GAMMA ENERGY ABSORBED · NaI(Tl) CRYSTAL · 140 keV GAMMA · I⁻ ION · PHOTOELECTRIC EFFECT · ELECTRON ~107 keV | Into the crystal lattice: the photon is absorbed by an iodide ion (photoelectric effect) and a fast electron shoots out. |
| 13 | 28.10–29.99 | ENERGY DEPOSITION · EXCITED ATOMS | The electron zigzags and slows, leaving excited sites (orange) along its track. |
| 14 | 29.99–32.11 | SCINTILLATION · ENERGY → VISIBLE LIGHT · ~415 nm LIGHT · Tl⁺ CENTRE | The excited thallium centres relax: a burst of blue-white optical photons. |
| 15 | 32.11–34.00 | PHOTOMULTIPLIER ARRAY · LIGHT GUIDE · PMTs · BRIGHTEST NEAR THE FLASH | Back out to the head: the light spreads through the guide to several tubes, brightest nearest the flash. |
| 16 | 34.00–35.89 | LIGHT → ELECTRON · LIGHT PHOTON · PHOTOCATHODE · PHOTOELECTRON · VACUUM | Inside one tube: four light photons reach the violet photocathode; one frees a photoelectron into the vacuum. |
| 17 | 35.89–38.96 | ELECTRON MULTIPLICATION · DYNODE · +100 V · +200 V · 1→4→16→… · POWERED BY HIGH VOLTAGE | The electron strikes dynode after dynode (one per beat), each held at a higher voltage; secondary electrons fan out and the count grows. |
| 18 | 38.96–41.08 | ELECTRICAL SIGNAL · ANODE · ~1 MILLION ELECTRONS · ELECTRICAL PULSE · FROM ONE TUBE | The cloud lands on the anode; a pulse runs down the cable to a small scope. |
| 19 | 41.08–43.92 | POSITION + ENERGY · PMTs SEEN FROM BEHIND · PULSE HEIGHTS · X · Y · POSITION (X, Y) · ENERGY | The tube array from behind: pulse bars rise (taller near the flash); the weighted position lands on an X-Y grid; the sum gives the energy. |
| 20 | 43.92–46.04 | ENERGY FILTER · ENERGY WINDOW · ACCEPTED · SCATTERED: REJECTED · NOT PERFECT | The energy spectrum with its photopeak at 140 keV and a window: our event is accepted, a lower-energy scattered event is rejected; some scatter still overlaps the window. |
| 21 | 46.04–47.93 | ONE DETECTED EVENT · DETECTOR IMAGE · +1 · ONE COUNT, NOT A 3D POINT | The accepted event adds one count to one pixel of the detector image. |
| 22 | 47.93–51.00 | 2D PROJECTION · TIME-LAPSE · COUNTS: … · NOISY → CLEARER | Tens of thousands of counts build a noisy, then clearer projection (heart ring and liver). |
| 23 | 51.00–54.07 | ROTATING GAMMA CAMERAS · HEADS ROTATE, PATIENT STAYS · 45° · 90° · 135° · TIME-LAPSE · REAL SCAN ~15 MIN | The heads turn around the chest; each new angle records a new projection. |
| 24 | 54.07–58.08 | MULTIPLE ANGLES · SAME HEART, MANY VIEWS · RECONSTRUCTION COMPUTER | Nine views placed at their real angles around a heart model, then streamed into the workstation. |
| 25 | 58.08–62.10 | 3D RECONSTRUCTION · ESTIMATE · PROJECT · COMPARE · UPDATE · REPEAT · MEASURED · ESTIMATED | Iterative reconstruction: a uniform first guess, its predicted projection compared with the measured one, the voxel volume updated; the left ventricle sharpens with each loop (≠ becomes ≈). |
| 26 | 62.10–64.93 | MYOCARDIAL PERFUSION · SHORT AXIS · BASE → APEX · VERT. LONG AXIS · HORIZ. LONG AXIS · LOW · HIGH TRACER UPTAKE | The slam: short-axis rings, a row from base to apex, vertical and horizontal long-axis slices, colour bar. |
| 27 | 64.93–68.00 | QUICK RECAP · HOW SPECT SCANNERS WORK | The chain lights up icon by icon (nucleus → gamma → collimator → crystal → light → electron → dynodes → pulse → position → projection → angles → image); the image collapses into one detection event and the camera pulls back to frame one. |

## Colour code (fixed for the whole film; colours are educational)

| Colour | Meaning |
|---|---|
| Deep navy | the ground |
| Off-white / grey, blue faces | the scanner, the detector heads and their collimator faces |
| Dark red / coral, crimson | the body, the heart muscle, the heart |
| Bright orange | Tc-99m tracer |
| Orange + blue balls | protons and neutrons |
| Golden yellow | gamma photons |
| Metallic dark grey | lead collimator |
| Transparent cyan | NaI(Tl) crystal |
| Blue-white | optical (scintillation) photons |
| Violet | photocathode (the only violet surface) |
| Electric blue | electrons |
| Silver / purple | dynodes |
| Neon green | electrical pulses and the accepted event |
| Muted red | rejected and blocked events |
| Cyan | projection data |
| Navy → blue → violet → red → orange → yellow | perfusion colour scale |

## Sound design

127.06 BPM played half-time (a relaxed lo-fi groove), D major, 36 bars = exactly 68 s. Rhodes-style electric piano on
Dmaj9–Bm9–Em9–A13 with jazzy detours, a round bass, swung drums (kick, soft snare on beat 3, rim, brushed hats), vinyl
crackle and tape wobble. A kalimba hook opens the film and returns at the electrical pulse and the image reveal.

| Bars (time) | Act | Music |
|---|---|---|
| 1–2 (0–3.8 s) | Hook | Full groove at once, kalimba hook, a soft crash |
| 3–6 (3.8–11.3 s) | Tracer, blood, uptake | Mellow, lighter drums, the hook answered on kalimba |
| 7 (11.3–13.2 s) | The dive | Ticks rise into the nucleus |
| 8–9 (13.2–17 s) | The nucleus | Drums out: long Rhodes chords, an airy pad; the emission rings in the gap |
| 10 (17–18.9 s) | The photon | Kick and hats come back softly |
| 11–14 (18.9–26.4 s) | Detector mechanics | Groove, a breathy flute line |
| 15–17 (26.4–32.1 s) | Inside the crystal | Glockenspiel sparkles over the groove |
| 18–21 (32.1–39.7 s) | PMTs and the dynode cascade | The hook on kalimba, then rising arpeggios and denser ticks, a snare roll |
| 22 (39.7–41.6 s) | The pulse | The drop: full groove and the hook |
| 23–27 (41.6–51 s) | Measurement | 16th-note ticks, flute |
| 28–29 (51–54.8 s) | Rotation | Sparse, warm, shaker |
| 30–33 (54.8–62.3 s) | Angles and reconstruction | Groove, ascending arpeggios, a riser |
| 34–36 (62.3–68 s) | The image and the recap | Crash, hook on kalimba and flute; A13 falls back into bar 1 |

Every SFX belongs to a visible event and is tuned to D major pentatonic: the machine waking, the push and lens, the
gamma ping, the photon's thin travel tone, the channel tick, the crystal shimmer, light pings on the tubes (louder for
the nearer ones), the stylised cascade and pulse, counts, the rewind to the injection, a syringe click and fluid,
blood flow and a soft heartbeat, the membrane pop and gathering ticks, the dive, a low nuclear resonance, the
metastable chime, the rising tension and the emission ping, absorption and scattering, the head reveal and mechanical
ticks, two muted blocks and the clean transit, the photoelectric click, falling ionisation ticks, the scintillation
shimmer, one photoelectron click among softer misses, dynode ticks that multiply, the anode pulse and scope beep,
X-Y confirmation clicks, the energy tone, accept and reject clicks, the +1 click, accelerating counting, the gantry
motor and acquisition clicks, view tones, a data stream, reconstruction arpeggios and a confirmation chord, the warm
image impact and slice pops, recap ticks and the final detection ping into the loop. Atomic and nuclear events are not
audible in reality: these are educational sonifications. The music dips by 2–4 dB under the low effects (heartbeat,
nuclear hum, absorption, gantry motor, image impact), and those effects carry a 150–300 Hz body, so they still read on
phone speakers.

## Quality checks run before delivery

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint.py` with no red flags (27 shots, 68 s, no text-led
  shot). The eight yellows all say "shorter than 2 s": scenes 01, 03, 06, 08, 13, 15, 16 and 21 last 1.89 s because
  the brief fixes their times. Each holds one visual event.
- **Skill film gate** (`film_gate.py`, run on a 720×1280 QA proxy rendered at 30 fps from the same engine; the proxy
  is not a deliverable): all three gates green. Fast-motion frames 0.335 (needs ≥ 0.06; worst 30 s window 0.138), no
  blank frames, 0% blue-purple frames, 7.7 visual events per 10 s (longest gap 3.8 s), dead background 0.11, fixed
  page frame 0.06. The one yellow is about 11.5 push-ins per minute (9.7 fast). They are the scale dives the topic
  needs (scanner → chest → nucleus, head → crystal → tube → dynodes); pushes and pulls are almost even (54% push), and
  each dive is answered by a pull-out or a cut (the head cut-away in 10, the tube array in 19, the whole scanner in
  23, the recap pull-back in 27).
- **Motion scan** at 30 fps: no window of 0.5 s or more without motion. Frames where more than 55% of the pixels
  change are the fast dives and slides (0.7–1.6 s, 2.2 s, 3.1 s, 11.2–11.4 s, 20.9 s, 21.6–21.7 s, 32.5–32.6 s,
  34.2–34.3 s) and the two planned hard cuts (the slices at 62.33 s, the recap → scanner match cut at 66.87 s). 0%
  blue-purple frames. About 12 ms per frame in Node at the 360×640 logical size.
- **Loop:** the last frame differs from frame one in 0.01% of its pixels (one normal frame step changes 0.27%); the
  audio tail past 68 s is folded onto 0:00, so the wrap has no jump.
- **Audio** (numbers only, not a listening test): exactly 68.000 s; −15.0 LUFS integrated, −3.3 dBTP true peak and a
  loudness range of 4.5 LU after mastering. Every second measures between −20.7 and −14.8 dBFS RMS, which keeps the
  calm, even lo-fi level; the quietest second is the start of the uptake time-lapse (8 s), the loudest is the photon
  crossing heart tissue (17 s). Below 250 Hz holds 60% of the energy (kick and bass trimmed, keys, hats and SFX lifted
  for phone speakers). 142 SFX of 58 kinds plus about 1,330 music notes and hits. A stem check (an SFX-only render
  against a music-only render) set the effect levels: in its strongest band each of the 54 checked cues sits at most
  4.5 dB under the music (median 3.2 dB above it), and the particle pings, the photoelectric click, accept and +1
  stand 16–24 dB above the music between 1 and 8 kHz.
- **Player:** headless Chromium smoke test (play, seek) with no errors.
- **Scanner redraw (user feedback):** the first scanner was a 3-D room and looked odd, so the scanner, the detector
  heads and the head cut-away were redrawn flat, seen from the foot of the table. The hook keeps its order: scanner →
  push into the chest → gamma photon → detector chain teaser.
- **Self-review against the skill's six failure modes:** no page frame or bullet slides (every shot is one visual
  event and the camera changes from shot to shot); original compositions redrawn from the storyboard reference, not
  copied from samples; a concrete object in every shot (scanner, syringe, blood cells, heart muscle, molecule,
  nucleus, photon, lead septa, crystal ions, tube, dynodes, scope, spectrum, matrix, voxels, slices); no dead ground
  (the room light, flowing cells, drifting ions, glowing tubes and live data keep moving); one pixel-art style and
  palette from the first frame to the last; the only person is the patient at scanner scale, eyes closed. No separate
  reviewer agent was used.

To run the skill's delivery gate on your own render:
```
uv run ../.claude/skills/huashu-art-motion/scripts/film_gate.py output/spect_8bit.mp4
```

## Science notes

What the film shows, simplified but correct in order and cause:
- **SPECT, not PET.** Tc-99m (6 h half-life) decays by isomeric transition from a metastable state to a lower state of
  the same nucleus (still technetium), emitting a single ~140 keV gamma photon. No positrons, no 511 keV pairs. The
  camera does not create the photons; it detects photons from the tracer.
- **The tracer.** Tc-99m sestamibi is injected before imaging; uptake follows blood flow, and the lipophilic cation is
  retained in heart-muscle cells, largely in mitochondria (membrane potential). Uptake is shown as a time-lapse.
- **In the body** photons can be absorbed (photoelectric effect) or Compton-scattered (new direction, less energy);
  not every photon leaves the body. Photons travel in straight lines from the emission; the camera just follows one
  whose path meets the detector.
- **The collimator** (parallel-hole lead) does not focus: it absorbs photons arriving from other directions; finite
  channels accept a small range of angles.
- **The NaI(Tl) crystal** absorbs the photon's energy — shown here by photoelectric absorption on an iodide ion (K-shell
  binding ~33 keV, so the electron gets ~107 keV). The fast electron ionises and excites the lattice; thallium
  activator centres relax by emitting a few thousand blue optical photons (~415 nm), far lower in energy than the gamma.
  The crystal is not a digital sensor.
- **The PMTs.** The light spreads through the light guide to several tubes. At each photocathode only some photons
  free an electron (quantum efficiency ~25%). Dynodes at successively higher voltages multiply electrons by secondary
  emission (~4 per stage, ~10⁶ overall over about ten stages); the energy comes from the bias supply. The anode collects
  a charge pulse.
- **Position and energy.** The relative pulse heights across the tubes give the interaction position in the detector
  (Anger logic) — not the 3-D location of the nucleus; the summed signal gives the deposited energy. An energy window
  (~20% around 140 keV) rejects many scattered photons, but not all.
- **Counts → projection.** Each accepted event adds one count to one pixel of a 2-D projection. Projections from many
  angles (here 180° from RAO to LPO, as in many cardiac studies) are needed for tomography.
- **Reconstruction.** The computer estimates the tracer activity from the measured projections. In this film it is
  actually computed: a 32³ model (left ventricle, faint right ventricle, liver, body background) is projected through a
  water-attenuating body into 25 views with counting noise, and reconstructed with 14 MLEM iterations (estimate →
  project → compare → update → repeat); the perfusion slices are resliced from that result along the left-ventricle
  axis. Real images have limited resolution and noise; the colour scale shows estimated tracer uptake, not a photograph
  of the coronary arteries, and a low-uptake area is not automatically a diagnosis.
- Other SPECT systems use different detectors (for example CZT semiconductors); this film keeps to NaI(Tl) + PMTs.
  The real acquisition takes about 15–20 minutes; the animation compresses it.

Simplifications: everything below the human scale is magnified and not to scale; one photon, one flash and one tube
stand in for many; the dynode chain is drawn with six of its ~10 stages; voltages, the spectrum shape and the matrix
size are schematic.

## Source map

| File | Contents |
|---|---|
| `src/00_core.js` | pixel buffer, palette, rasterisers, masks, camera |
| `src/01_font.js` | pixel fonts (captions, micro labels, title) |
| `src/02_pal.js`, `src/03_clock.js`, `src/05_fx.js` | noise, splines, vectors; the beat grid and scene starts; paths and particle helpers (gamma waves, electrons, flashes) |
| `src/10_scanner.js` | the scanner, flat 2-D: room, gantry ring, rotating detector heads, table, patient |
| `src/11_body.js`, `src/12_tracer.js`, `src/13_blood.js` | X-ray torso and heart, heart muscle; vial, syringe and arm; blood vessel, capillary, mitochondrion |
| `src/14_nucleus.js` | sestamibi molecule, atom shells, the Tc-99m nucleus, the energy-level diagram |
| `src/15_detector.js`, `src/16_micro.js`, `src/17_pmt.js` | the detector-head cut-away; the NaI(Tl) lattice, electron track and scintillation; the photomultiplier tube, dynodes, anode and scope |
| `src/18_model.js` | the tracer distribution, projections with attenuation, counting, MLEM reconstruction, slicing |
| `src/19_data.js`, `src/20_recon.js` | PMT array, Anger logic, spectrum, image matrix; projection tiles, workstation, voxel volume, iteration loop, perfusion slices |
| `src/23_scenes.js`, `src/24_overlay.js` | the 27 scenes and their transitions; captions, tags, chips, title |
| `src/30_audio.js` | score, SFX map, Web Audio synthesis, offline render with loop folding |
| `src/40_player.js` | the player |
| `tools/` | build, export (Chromium audio + ffmpeg video), mastering, stills, smoke test, profiler |
