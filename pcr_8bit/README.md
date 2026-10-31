# How PCR Machines Detect Viruses — pixel-art scientific animation (code project)

**How viral RNA becomes a fluorescent signal**, in 130 seconds and 25 connected scenes, 9:16, original 16-bit pixel
art in a Kurzgesagt-style flat-science grammar, rendered entirely in code (HTML5 Canvas 2D and JavaScript), with a fun
8-bit chiptune soundtrack and chip SFX synthesised sample by sample in the same JavaScript. No narration, no
subtitles, only short labels. The example is one-step real-time RT-qPCR with a hydrolysis (TaqMan-type) probe on a
CFX96-type benchtop instrument (original design), detecting RNA from a generic enveloped respiratory virus. It is an
educational model, not a diagnostic protocol for any strain.

- `index.html` is a self-contained player: open it in a browser (click to play, arrows to seek, M to mute). It
  synthesises the soundtrack in a couple of seconds after the first frame appears.
- `tools/export.js` renders the MP4.
- `镜头表.md` is the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 7,800 frames (130.000 s). H.264, yuv420p, BT.709. The 360×640 logical canvas is upscaled ×3 with nearest-neighbour, so every pixel stays crisp. |
| Audio | Original 8-bit chiptune score, 120 BPM in F major (65 bars = 130.000 s), plus 317 event-synced chip SFX. AAC 48 kHz stereo, mastered to −15 LUFS with the true peak at −1.75 dBTP. |
| Loop | The monitor starts a new run and the camera ends on the exact framing of frame one; the last bar (C) falls back into bar 1 (F), and every note that runs past 130 s wraps to 0:00, so the end flows into the start. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy (mastering)

```
cd pcr_8bit
node tools/export.js                  # full MP4 -> output/pcr_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 0.6 2.6 47.6 84.1 119.2 124.3 --scale 2   # check any frames
```

No browser is needed for the export: both the picture (about 2–4 ms per frame in Node) and the soundtrack (about
5 s) are computed in Node; most of the time goes to the H.264 encode. To check the result:
```
ffprobe output/pcr_8bit.mp4
ffmpeg -i output/pcr_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 7,800 frames, an integrated loudness around −15 LUFS and a true peak below −1 dBTP.

Optional checks (need Playwright Chromium, `npm i playwright && npx playwright install chromium`, only for the first):
`node tools/smoke.js` (player test), `node tools/qa_motion.js` (motion scan), `node tools/audio_qa.js` (audio numbers),
`node tools/proxy.js` (a 720×1280 proxy for the skill's `film_gate.py`).

## The hook

The first four seconds show the whole idea before anyone can swipe, then the film rewinds and earns it:
- **0.0 s** the machine is running; on the monitor the amplification curve rises.
- **0.5 s** the curve crosses the threshold on the beat: **TARGET RNA DETECTED** (coin sound).
- **0.8 s** the camera rushes into one sealed well; the lid turns X-ray.
- **1.5 s** inside the fluid a DNA polymerase slides toward a probe bound to its target.
- **2.5 s** the polymerase cuts the probe (snip): the reporter breaks away from its quencher.
- **3.0 s** blue light hits the reporter, it glows green; **3.6 s** a green photon reaches the photodetector.
- **4.0 s** a tape-style **REWIND** to the swab. The caption "HOW PCR DETECTS VIRUSES" appears at 1.6 s, after the
  picture has hooked (the shot list lint asks for the picture to speak first); a chip says it is a preview of a
  finished run, not a four-second test.

## One journey, one example

The film follows **one swab, one tube, one virus particle, one RNA strand, one reverse transcriptase, one cDNA, one
DNA polymerase, one probe, one reporter, one photon, one photodiode, one well and one curve (Cq 26.4)**. In the
molecular scenes every template is drawn with its 3' end on the left, so every new strand grows 5'→3' to the right
and every polymerase travels right; after the RNA–cDNA hybrid parts, the cDNA turns over once to keep this. Worlds
join through zoom lenses (the next scale opens in a growing circle where the camera dives, and closes again on the
way out), the rewind, short dithered dissolves and pans that follow the same molecule.

| # | Time (s) | Caption / labels | What happens |
|---|---|---|---|
| 01 | 0–4 | HOW PCR DETECTS VIRUSES · TARGET RNA DETECTED · DNA POLYMERASE · PROBE · PHOTODETECTOR | The hook above. |
| 02 | 4–8 | RESPIRATORY SAMPLE · SWAB · TRANSPORT MEDIUM | Rewind. A gloved hand brings the swab back from the patient (off frame), drops it into the tube, snaps the shaft at the rim; the cap clicks on; the camera dives into the liquid: cells, mucus, bacteria and a few ringed virus particles. |
| 03 | 8–13 | VIRAL RNA · SPIKE PROTEIN · LIPID ENVELOPE · RNA GENOME | One enveloped RNA virus turns; a cut-away opens the envelope; the RNA genome wound on nucleoproteins lights up. |
| 04 | 13–19 | RNA RELEASE · LYSIS BUFFER · DETERGENT · ENVELOPE BREAKS · VIRAL RNA | Lysis buffer goes into the tube; detergent breaks the envelope into micelles, spikes and nucleoproteins drift off, the RNA uncoils among the debris. |
| 05 | 19–24 | RNA PURIFICATION · SILICA-COATED MAGNETIC BEAD · RNA BINDS SILICA · MAGNET HOLDS THE BEADS · WASH REMOVES THE REST · ELUTED RNA | RNA sticks to silica beads; a magnet behind the tube wall holds the beads while a wash carries proteins and lipids away; in elution buffer the RNA lets go and the camera follows it away from the beads, which stay on the magnet. |
| 06 | 24–29 | ONE-STEP RT-qPCR · VIRAL RNA · REVERSE TRANSCRIPTASE · DNA POLYMERASE · PRIMERS · PROBE · dNTPs · SEALED WELL | The RNA drops into the master mix and the parts drift; the camera pulls out of the well, which is sealed with optical film. |
| 07 | 29–34 | THERMAL CYCLER · HEATED LID · SEALED WELL · METAL BLOCK · PELTIER MODULES · HEAT SINK + FAN | The instrument in cut-away: optical shuttle, heated lid, the plate in the aluminium block, Peltier modules, heat sink, fan, controller board and the block's sensor. |
| 08 | 34–39 | TEMPERATURE CONTROL · HEATING: HEAT PUMPED UP · COOLING: HEAT PUMPED DOWN · CURRENT · SENSOR | Inside a Peltier module: the current makes electrons (n) and holes (p) drift and carry heat up into the block; reversed, they carry it down to the heat sink; the thermistor feeds the controller, which settles at 60.0 °C. |
| 09 | 39–44 | PROGRAMMED THERMAL CYCLES · REVERSE TRANSCRIPTION · INITIAL DENATURATION · ×40 CYCLES 95°C ↔ 60°C · FLUORESCENCE READ AT 60°C | The program trace draws: a 55 °C hold, 95 °C, then 95 ↔ 60 °C cycles with a read at each 60 °C step; the camera pulls back to the whole program. |
| 10 | 44–51 | RNA → cDNA · VIRAL RNA (TEMPLATE) · PRIMER · REVERSE TRANSCRIPTASE · dNTP · A PAIRS WITH T (DNA) · U PAIRS WITH A (RNA HAS U) · 5' → 3' · cDNA | A dive into the 55 °C step: reverse transcriptase grips the primer on the RNA, its fingers close on each matching nucleotide, pyrophosphate leaves after each join; the cDNA grows 5'→3', then a time-lapse runs to the end of the region. |
| 11 | 51–56 | DNA TEMPLATE FOR PCR · RNA–cDNA HYBRID · HEAT SEPARATES THE STRANDS · FORWARD PRIMER · SECOND STRAND | The enzyme leaves the hybrid; at 95 °C the RNA drifts away and the cDNA turns over; at 60 °C the forward primer binds the cDNA and the polymerase builds the second strand. |
| 12 | 56–61 | DNA DENATURATION · HYDROGEN BONDS · BASE PAIRS LET GO · BACKBONES STAY INTACT | The duplex jiggles as the temperature climbs to 95 °C; the hydrogen bonds let go along the molecule and the strands drift apart with their backbones intact. |
| 13 | 61–67 | PRIMER RECOGNITION · FORWARD PRIMER · NO MATCH · 3'-OH: SYNTHESIS STARTS HERE · REVERSE PRIMER · TARGET REGION | At 60 °C the forward primer tries a wrong site (no match), lifts off and pairs base by base at its own site; the reverse primer binds the other strand; arrows mark the target region between them. |
| 14 | 67–73 | REPORTER + QUENCHER · PROBE · REPORTER (5') · QUENCHER (3') · NO GREEN LIGHT: QUENCHED | The probe settles between the primers; under blue light the reporter's energy hops to the quencher, so almost no green light leaves. |
| 15 | 73–81 | DNA POLYMERIZATION · DNA POLYMERASE · PRIMER 3' END · MATCHING dNTP · 3'-OH · Mg²⁺ · ALPHA PHOSPHATE · PHOSPHODIESTER BOND · PYROPHOSPHATE LEAVES · 5' → 3' · NEW STRAND | The polymerase docks on the primer end; a matching nucleotide enters and the fingers close; a lens into the active site shows the 3'-oxygen attacking the alpha phosphorus between two Mg²⁺ ions, the new bond and the pyrophosphate leaving; back out, nucleotides join one by one. |
| 16 | 81–88 | PROBE CLEAVAGE · 5' NUCLEASE DOMAIN · PROBE CUT · REPORTER FREE · TEMPLATE INTACT | The same polymerase reaches the probe; on the drop (84 s) its 5'-nuclease domain cuts the reporter off, then chews the probe into fragments as it advances; the quencher drifts away; the template stays whole. |
| 17 | 88–93 | FLUORESCENCE · BLUE PHOTON · REPORTER · ABSORBS BLUE · RELAXES (A LITTLE HEAT) · EMITS GREEN · LOWER ENERGY · LONGER WAVELENGTH | Following the freed reporter: a blue photon is absorbed, an electron jumps to the excited state, relaxes, falls back, and green photons leave (energy-level diagram). |
| 18 | 93–98 | OPTICAL DETECTION · BLUE LED · EXCITATION FILTER · EMISSION FILTER · PHOTODIODE · SCATTERED BLUE IS BLOCKED | Out to the optical head above the well: blue LED light through its filter and lens down into the well; green light back up through the emission filter to the photodiode; stray colours are stopped. |
| 19 | 98–103 | LIGHT → ELECTRICITY · GREEN PHOTON · ELECTRON · HOLE · ELECTRIC FIELD · PHOTOCURRENT · AMPLIFIER → ADC · MANY PHOTONS PER READING | Into the silicon: photons free electron–hole pairs, the junction's field separates them, a photocurrent runs to the amplifier and the ADC, which sends out bits. |
| 20 | 103–108 | REPEATED PCR CYCLES · NEW TARGET DNA EVERY CYCLE · DENATURATION / PRIMER BINDING / EXTENSION · CYCLE n · COPIES | Back at the well, the block flashing between 95 and 60 °C; one cycle in miniature; then 1 → 2 → 4 → 8 → 16 copies on the beat. |
| 21 | 108–113 | MORE TARGET → MORE SIGNAL · MORE PROBES CUT · MORE FREE REPORTERS · RFU | Many templates under blue light; polymerases cut probe after probe; the freed reporters glow and the detector meter climbs. |
| 22 | 113–117 | FLUORESCENCE DATA · PHOTODIODE · ANALOG · ADC · DIGITAL · ONE READING PER CYCLE | Down the pipeline: the analog photodiode level, the ADC's samples, one number per cycle, a point on the plot. |
| 23 | 117–121 | AMPLIFICATION CURVE · FLUORESCENCE · PCR CYCLE · BASELINE · EXPONENTIAL · THRESHOLD · Cq 26.4 · PLATEAU | The readings fill the plot cycle by cycle (one rising tick each); the curve leaves the baseline, rises, crosses the threshold at Cq 26.4 and flattens. |
| 24 | 121–125 | RESULT VALIDATION · TARGET · POSITIVE CONTROL · NEGATIVE CONTROL · INTERNAL CONTROL · TARGET RNA DETECTED · CONTROLS VALID | The software checks each control (positive amplified, negative flat, internal control amplified), then calls the target detected on the victory fanfare (124 s). |
| 25 | 125–130 | HOW PCR MACHINES DETECT VIRUSES | Pull back to the machine; the chain lights up link by link (viral RNA → reverse transcriptase → cDNA → DNA polymerase → probe cleavage → fluorescence → photodiode → digital result); the monitor starts a new run and the frame becomes frame one. |

Honesty chips, one at a time for about 3 s each: PREVIEW OF A FINISHED RUN, EDUCATIONAL MODEL, SIMPLIFIED, ONE
COMMON METHOD, NOT TO SCALE, EXAMPLE PROGRAM (ABOUT 1 H), ILLUSTRATIVE SEQUENCE, TIME-LAPSE, SIMPLIFIED CHEMISTRY,
IDEALIZED DOUBLING, MEASURED READINGS, RNA DETECTED ≠ LIVE VIRUS.

## Colour code (fixed for the whole film; colours are educational)

| Colour | Meaning |
|---|---|
| Dark navy | the ground |
| Cyan spikes, muted purple envelope | the virus particle |
| Magenta | viral RNA |
| Electric blue | cDNA (it stays blue as the template it becomes) |
| Deep blue | other template DNA strands |
| Warm orange | newly made DNA |
| Purple | reverse transcriptase |
| Cyan / silver | DNA polymerase |
| Yellow | primers |
| Light green with a neon-green and a dark purple end | the probe, its reporter and its quencher |
| Blue | excitation light |
| Bright green | fluorescence |
| Metallic cyan | photodiodes |
| Electric blue dots | electrons; white rings are holes |
| Neon green | electrical signals |
| Orange / blue | heating / cooling |
| Light blue | nitrile gloves |

## Sound design

A fun 8-bit chiptune at 120 BPM in F major, 65 bars = exactly 130 s, synthesised in plain JavaScript like an old
game console: two pulse channels (12.5 %, 25 % and 50 % duty, band-limited edges), a 4-bit stepped triangle for the
bass and the kick, LFSR noise for snare, hats and crashes, the classic 60 Hz chip chord, a dotted-eighth ping-pong
echo on the lead and light ducking under the big hits. Theme A (F–C–Dm–Bb) is a bouncy hook; theme B (Bb–C–Am–Dm)
lifts it for the primers and the probe.

| Bars (time) | Act | Music |
|---|---|---|
| 1–2 (0–4 s) | Hook | Full band and theme A at once |
| 3–4 (4–8 s) | Rewind, swab | The rewind sweep, then a light groove |
| 5–8 (8–16 s) | The virus | Mystery: slow 12.5 % lead with echo, sparse arps |
| 9–12 (16–24 s) | Lysis, beads | Groove: bass, drums, arps |
| 13–16 (24–32 s) | The mix | Theme A |
| 17–22 (32–44 s) | Machine, Peltier, program | Mechanical: 16th-note bass and hats, staccato riff |
| 23–28 (44–56 s) | Reverse transcription, template | Theme A, then an octave up |
| 29–30 (56–60 s) | Denaturation | A heat riser: climbing arps, snare roll |
| 31–38 (60–76 s) | Primers, probe | Theme B with a 60 Hz chip chord |
| 39–42 (76–84 s) | The polymerase | Build: quiet, ticking, rising arps, snare roll |
| 43–46 (84–92 s) | **The drop on the probe cut** | Theme A doubled an octave up, fat arps, crash: the loudest bars |
| 47–50 (92–100 s) | Fluorescence, optics | Glow: echoing arps, theme B on a thin pulse |
| 51–52 (100–104 s) | Photodiode | Blips |
| 53–56 (104–112 s) | Cycles | Climb: theme A, layers added, octave up |
| 57–60 (112–120 s) | Data, curve | Drive |
| 61–62 (120–124 s) | Validation | Suspense: kick, rising arps, snare roll |
| 63 (124–126 s) | **The result** | Victory fanfare |
| 64–65 (126–130 s) | Recap, loop | Theme A reprise, a C bar that falls back into bar 1 |

Every SFX is built from the same chip voices and tuned to F major pentatonic: the power-on, the threshold coin, zoom
sweeps, lens pops, the cleavage snip, the release sparkle, the blue-light zap and green shimmer, the detector blip, the
tape rewind, the swab swirl and snap, the cap click, bubble pops of lysis, bead clinks, the magnet hum, the wash, the
elution bloop, molecule blips, the machine reveal, heat-up and cool-down runs, the sensor beep, three temperature cues,
the enzyme lock, one click per joined nucleotide (rising), unzipping crackle, the wrong-site buzz, base-by-base binding
clicks, the quench thud, the phosphodiester bond chime, pyrophosphate pops, the tension swell before the cut, photon
zaps, the photocurrent hum, ADC chatter, doubling coins, layered pings as the signal grows, sampling ticks, one tick
per curve point with the pitch following the fluorescence, the threshold coin, the control checks, the win jingle,
eight recap chimes and the rewind back into the loop. Molecules, light and electrons make no sound in reality: these
are educational sonifications.

## Quality checks run before delivery

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint.py` with no red flags (25 shots, 130 s, no text-led
  shot). The yellows: shot 01 carries words (the caption is held back to 1.6 s so the picture hooks first), and shots
  10, 15 and 16 last 7–8 s because the brief asks for these mechanisms not to be rushed; each holds several events
  (approach, binding, reaction, product).
- **Skill film gate** (`film_gate.py`, on a 720×1280 QA proxy rendered at 30 fps from the same engine; the proxy is
  not a deliverable): all three gates green. Fast-motion frames 0.094 (needs ≥ 0.06; worst 30 s window 0.037, the
  calm data section), no blank frames, blue-purple frames 0.035, still frames 3.5 % with the longest still stretch
  0.33 s, 4.8 visual events per 10 s, dead background 0.18, fixed page frame 0.12 (green; an earlier pass measured
  0.58: captions and honesty chips stayed up for whole shots, which reads as a slide header, so both now type in,
  hold about 3 s and leave). The
  one yellow is about 10.6 push-ins per minute (6.9 fast), the scale dives the subject needs (machine → well →
  molecule, tube → sample → virus, program → molecule, polymerase → active site, reporter, photodiode); pushes and
  pulls are close to even (56 % push) and each dive is answered by a pull-out or a cut (04, 06, 12, 16, 18, 20, 25).
- **Motion scan** (`tools/qa_motion.js`, 30 fps): one window of 0.5 s or more with under 0.3 % of the pixels moving,
  91.8–92.4 s, the held beat as the electron falls before the green emission. Frames where more than 55 % of the
  pixels change are the hook dive (1.1–1.3 s), the rewind and its cut (4.3–4.5 s), the lens into the Peltier module
  (34.2 s) and three cuts on beats (13.0 s, 104.5 s, 121.0 s). 0 % blue-purple frames by this scan. About 2–4 ms per
  frame in Node at the 360×640 logical size.
- **Loop:** the last frame differs from frame one in 0.02 % of its pixels (the same as a normal frame step there);
  the soundtrack's wrap has no jump (notes past 130 s are written onto 0:00).
- **Audio** (numbers only, not a listening test; `tools/audio_qa.js`): exactly 130.000 s; −15.0 LUFS integrated,
  −1.75 dBTP true peak, 4.9 LU loudness range. The bar levels follow the story: the hook bars −16.4 dBFS RMS, the
  intro after the rewind −21.8, the build before the drop −20.4 to −19.5, the drop (bars 43–46) −15.5 (the loudest),
  the fanfare −16.5. 48 % of the energy is below 250 Hz (an earlier pass had 82 %: the bass moved up an octave so it
  plays on phone speakers). 2,634 music notes and hits, 317 SFX. A stem check (an SFX-only render against a
  music-only render, same code) shows the key cues standing 3–26 dB above the music in their strongest octave band
  (cut, bond, coins, win, detector, checks, zaps); the median cue sits 3.7 dB under it, mostly the 107 soft ticks
  that are meant as texture.
- **Player:** headless Chromium smoke test (play, seek) with no errors; the soundtrack synthesises in the browser.
- **Self-review against the skill's six failure modes:** no page frame or bullet slides (every shot is one visual
  event, the captions and chips leave after 3 s, the camera changes from shot to shot); original compositions, nothing
  copied from sample films; a concrete object in every shot (machine, swab, tube, virus, beads, magnet, enzymes,
  strands, probe, LED, filters, photodiode, plot, result panel); no dead ground (dust, Brownian molecules, drifting
  debris, glowing reporters keep moving); one pixel-art style and palette from the first frame to the last; the
  only people are gloved hands. No separate reviewer agent was used.

To run the skill's delivery gate on your own render:
```
uv run ../.claude/skills/huashu-art-motion/scripts/film_gate.py output/pcr_8bit.mp4
```

## Science notes

What the film shows, simplified but correct in order and cause:
- **PCR detects a targeted nucleic-acid sequence**, here from an RNA virus. The machine never sees virus particles: it
  measures light from probes that are cut only when the target sequence is copied.
- **Sample to RNA.** A respiratory swab goes into transport medium. In the lab a lysis buffer (detergents, chaotropic
  salts) breaks the lipid envelope and unfolds the proteins, freeing the RNA. In this example the RNA is purified with
  silica-coated magnetic beads: under high salt the RNA binds the silica, the magnet holds the beads (it does not pull
  free RNA), washes remove the rest, and a low-salt elution buffer releases the RNA. Labs also use columns or direct
  lysis.
- **One-step RT-qPCR.** The purified RNA goes into one sealed well with reverse transcriptase, a hot-start DNA
  polymerase, forward and reverse primers, the probe, dNTPs and Mg²⁺. The steps happen in the same well at different
  temperatures: about 55 °C for reverse transcription, about 95 °C to separate strands (and switch the RT off and the
  polymerase on), then 40–45 cycles of about 95 °C / 60 °C with a fluorescence read at 60 °C. The temperatures are
  illustrative and depend on the assay; a real run takes about an hour, plus the extraction.
- **The thermal cycler** moves heat with Peltier modules: current through n- and p-type pellets carries heat from one
  ceramic face to the other; reversing the current reverses the direction. A sensor in the block feeds a controller
  that adjusts the current. A heated lid keeps the sealed wells from condensing; the wells are never opened during
  the run.
- **Reverse transcription.** Reverse transcriptase extends a primer bound to the RNA, adding DNA nucleotides that pair
  with the RNA bases (A–T, U–A, G–C, C–G). DNA uses T where RNA uses U. Synthesis runs 5'→3'.
- **A DNA template.** The RNA–cDNA hybrid separates at 95 °C (in some systems the RT's RNase H activity also degrades
  the RNA); the forward primer then binds the cDNA and the polymerase builds the second strand.
- **Denaturation** breaks the base pairing (hydrogen bonds and stacking), not the sugar-phosphate backbones.
- **Primers** bind only where their sequence is complementary; each provides a free 3'-OH for extension.
- **The probe** carries a reporter dye at its 5' end and a quencher at its 3' end. While the probe is intact the
  quencher takes the reporter's energy, so little green light escapes.
- **Polymerisation.** The polymerase adds the nucleotide that pairs with the template: two Mg²⁺ ions position the
  primer's 3'-OH and the incoming dNTP's phosphates, the 3'-oxygen attacks the alpha phosphorus, a phosphodiester bond
  forms and pyrophosphate leaves.
- **Probe cleavage.** As the polymerase extends into the bound probe, its 5'→3' nuclease activity cuts the probe,
  separating the reporter from the quencher. The template is not cut.
- **Fluorescence.** The freed reporter absorbs blue light, relaxes a little, and emits green light of lower energy and
  longer wavelength, only while it is being excited.
- **Optics.** A filtered blue LED illuminates the well; the green emission returns through a separate path and an
  emission filter, so scattered excitation light is not counted as signal; a photodiode measures it.
- **Light to data.** In the photodiode, absorbed photons make electron–hole pairs that the junction's field separates
  into a photocurrent; an amplifier and an ADC turn it into numbers. One reading per cycle averages very many photons.
- **More target, more signal.** Each cycle ideally doubles the target (1 → 2 → 4 → 8 → 16); real efficiency is often
  a little lower and the reaction plateaus. More copies mean more probes cut and more free reporters, so the reading
  rises.
- **The curve and Cq.** Readings are plotted per cycle: baseline, exponential phase, plateau. The Cq (or Ct) is the
  cycle where the curve crosses a threshold set above the baseline noise (here 26.4); a lower Cq means more starting
  target. It is a measurement of RNA, not a count of infectious virus.
- **The result** is valid only if the controls behave as expected (positive control amplifies, negative control does
  not, internal control amplifies); the call follows the assay's own rules. Detecting viral RNA does not by itself
  show that infectious virus is present.

Scientific basis: the brief's references (NEB Luna Universal Probe One-Step RT-qPCR, protocol E3006; Thermo Fisher,
How TaqMan Assays Work; Bio-Rad CFX96 Real-Time PCR Detection System; the review on viral RNA extraction strategies;
NCBI on real-time qRT-PCR; CDC overview of testing for SARS-CoV-2). The film follows the standard mechanisms these
describe; the sources were not re-checked online for this build.

Simplifications: nothing below the bench is to scale; the sequences are random and illustrative (not viral); strands
are drawn as flat ladders without the helix; a few molecules stand in for very many; the probe is shown on one strand
and the RT with a gene-specific primer; the amplification curve is a model; colours are educational.

## Source map

| File | Contents |
|---|---|
| `src/00_core.js` | pixel buffer, palette, rasterisers, masks, camera and camera tracks |
| `src/01_font.js` | pixel fonts (captions, micro labels, title) |
| `src/02_pal.js`, `src/03_clock.js`, `src/05_fx.js` | noise, splines, loop-safe wobble, seeded random; the 120 BPM grid, scene starts, the amplification model (Cq 26.4) and the thermal program; paths, flashes, arrows, marks |
| `src/10_lab.js` | the lab, the monitor and the qPCR plot, the thermal cycler (exterior and X-ray inside), gloved hands, swab and tube |
| `src/11_machine.js` | the Peltier module close-up, the temperature program trace |
| `src/12_virus.js` | the sample field, the enveloped virus with its cut-away, detergent lysis, debris |
| `src/13_beads.js` | silica magnetic beads, the magnet, washes and elution |
| `src/14_mol.js` | nucleic-acid strands (purine/pyrimidine rungs, hydrogen bonds, 5'/3' ends), dNTPs, pyrophosphate, Mg²⁺, reporter and quencher, the DNA polymerase and reverse transcriptase as lumpy proteins |
| `src/15_chem.js` | the polymerase active site atom by atom, the fluorophore and the energy-level diagram |
| `src/16_optics.js` | the optical head over the well, the photodiode junction, amplifier and ADC |
| `src/17_data.js` | the ADC pipeline, the full amplification curve, the result panel, doubling, the probe crowd, recap icons |
| `src/23_scenes.js`, `src/24_overlay.js` | the 25 scenes and their transitions; captions, tags, chips, title |
| `src/30_audio.js` | the chip synthesiser, the score, the SFX map, mixing, and the player's playback |
| `src/40_player.js` | the player |
| `tools/` | build, export (Node audio + ffmpeg video), mastering, stills, smoke test, motion scan, film-gate proxy, audio QA, profiler |
