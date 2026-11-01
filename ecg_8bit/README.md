# How ECG Machines Read Your Heart — pixel-art scientific animation (code project)

**How the heart's electrical activity becomes the waveform on a monitor**, in 48 seconds and 20 micro-scenes grouped
in 6 continuous sequences, 9:16, original 16-bit pixel art in a Kurzgesagt-style flat-science grammar (scale travel:
monitor → chest → heart → one cell → the body's voltage → one electrode → the amplifier board → back to the monitor),
rendered entirely in code (HTML5 Canvas 2D and JavaScript), with an original electronic soundtrack and event-synced
SFX synthesised sample by sample in the same JavaScript. No narration, no subtitles, only short English labels. It is
an educational model: the heart, the field map and the signal values are simplified and illustrative.

- `index.html` is a self-contained player: open it in a browser (click to play, arrows to seek, M to mute). It
  synthesises the soundtrack in a few seconds after the first frame appears.
- `tools/export.js` renders the MP4 (the MP4 is not in the repository: render it on your machine, below).
- `镜头表.md` is the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 2,880 frames (48.000 s). H.264, yuv420p, BT.709. The 360×640 logical canvas is upscaled ×3 with nearest-neighbour, so every pixel stays crisp. |
| Audio | Original electronic score at 120 BPM (24 bars = 48.000 s), A major, plus 136 event-synced SFX. AAC 48 kHz stereo, mastered to −15 LUFS with the true peak at −1.75 dBTP. |
| Loop | The film ends on the opening composition (the monitor, HR 72, the same sweep): the last frame differs from frame one by less than one ordinary frame step, a QRS beep lands exactly on the loop point, and every note or tail that runs past 48 s wraps to 0:00. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy (mastering)

```
cd ecg_8bit
node tools/export.js                  # full MP4 -> output/ecg_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 0 2.75 6.6 22.0 33.6 44.6 --scale 2   # check any frames
```

No browser is needed for the export: the picture (about 10 ms per frame in Node) and the soundtrack (about 4 s) are
both computed in Node; most of the time goes to the H.264 encode. To check the result:
```
ffprobe output/ecg_8bit.mp4
ffmpeg -i output/ecg_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 2,880 frames, an integrated loudness around −15 LUFS and a true peak below −1 dBTP.

Optional checks (need Playwright Chromium, `npm i playwright && npx playwright install chromium`, only for the first):
`node tools/smoke.js` (player test), `node tools/qa_motion.js` (motion scan), `node tools/audio_qa.js` (audio numbers,
after an `--audio-only` export), `node tools/proxy.js` (a 720×1280 proxy for the skill's `film_gate.py`).

## The hook (0–3 s)

The monitor is the very first frame and it beeps on frame one; by 3 s we are inside the beating heart:
- **0.0 s** a bedside ECG monitor: a green Lead II trace sweeps, **HR 72**, a heart icon, and a QRS beep (A5) on the
  first frame. The beeps follow the real 72 BPM rhythm: 0, 0.83, 1.67 and 2.5 s.
- **1.0 s** the camera follows the cable down to the chest; **1.5 / 1.625 / 1.75 s** the three electrodes are named
  **RA · LA · LL**, each with a tuned click.
- **2.05 s** the camera pushes into the chest; the skin turns see-through: ribs, sternum and the beating heart behind
  them; **INSIDE THE HEART**.
- **2.6–3.0 s** we pass the ribs into the heart (the heart stays registered pixel for pixel while the chest dissolves
  around it); a tape-stop and **SLOWED DOWN**: from here one heartbeat is followed in slow motion.

## One heartbeat, one journey

The film follows **one patient, one monitor, three electrodes, one heart, one heartbeat in slow motion (3–26 s), one
Lead II waveform and one amplifier chain**. Micro-scenes join by camera moves and zoom crossfades (the camera keeps
pushing in or pulling out while the next scale settles in under a smooth blend); there are no hard cuts. During the
slow beat a **Lead II strip** sits under the heart: it shows one beat in real proportions, a playhead walks through it,
and P, QRS and T are named the moment they are drawn, so every wave lines up with what the heart is doing.

| # | Time (s) | Caption / labels | What happens |
|---|---|---|---|
| **A** | **0–3** | **Hook** | |
| 01 | 0–1 | (HR 72 on the monitor) | The monitor sweeps and beeps. |
| 02 | 1–2 | RA · LA · LL | The camera follows the cable down to the three chest electrodes. |
| 03 | 2–3 | INSIDE THE HEART | The chest turns see-through; the camera passes the ribs into the beating heart. |
| **B** | **3–12** | **Where the signal begins** | |
| 04 | 3–5 | SA NODE: THE PACEMAKER · SA NODE | A push to the SA node in the right atrium wall; it glows slowly. |
| 05 | 5–8 | ION CHANNELS · Na⁺ IN (SLOW) · Ca²⁺ IN · K⁺ OUT · MEMBRANE VOLTAGE · THRESHOLD | One pacemaker cell's membrane: Na⁺ trickles in through the funny channel and the voltage creeps up to threshold; Ca²⁺ channels open and the upstroke rises; K⁺ flows out and it repolarizes. The graph draws as it happens; the charge signs flip. |
| 06 | 8–10 | ATRIAL DEPOLARIZATION · GAP JUNCTIONS | Pull back to a sheet of atrial muscle cells: current passes through the gap junctions and the cells fire one after another. |
| 07 | 10–12 | P WAVE · ATRIA | Back to the heart: the activation spreads over both atria and the small P wave draws on the strip. |
| **C** | **12–26** | **Through the heart** | |
| 08 | 12–15 | AV NODE DELAY · AV NODE · ≈ 0.1 s DELAY | A push to the AV node: it fills slowly while a ring of dots counts the hold; the strip stays flat (the PR segment). |
| 09 | 15–17 | HIS–PURKINJE SYSTEM · BUNDLE OF HIS · BUNDLE BRANCHES | Released: the signal runs down the His bundle and splits into the left and right bundle branches. |
| 10 | 17–19 | PURKINJE FIBERS | Pull back: the Purkinje network lights up through the ventricle walls. |
| 11 | 19–22 | VENTRICULAR DEPOLARIZATION · FAST Na⁺ IN · Ca²⁺ PLATEAU | A dive into one ventricular cell: fast Na⁺ rushes in (a sharp upstroke), Ca²⁺ holds the plateau; back out, the ventricles activate. |
| 12 | 22–24 | QRS COMPLEX · VENTRICLES ACTIVE · ATRIA RECOVER | The QRS draws on the strip and the beep lands on the downbeat (the drop); the ventricles contract, the atria quietly recover. |
| 13 | 24–26 | VENTRICULAR REPOLARIZATION · K⁺ OUT | Back into the cell: K⁺ flows out and the voltage returns to rest; the T wave draws; the ventricles recover. |
| **D** | **26–35** | **How electrodes read it** | |
| 14 | 26–29 | BODY-SURFACE VOLTAGE · NEGATIVE · POSITIVE · LEAD II | Pull out of the heart to the whole chest: as the ventricles activate, a voltage pattern appears across the body (warm = positive, cool = negative); the heart's activity arrow and the Lead II axis from RA to LL. Nothing travels from the heart to the skin. |
| 15 | 29–32 | ECG ELECTRODES · LEAD WIRE · Ag/AgCl SENSOR · CONDUCTIVE GEL · SKIN | A dive into the LL electrode in cross-section: skin, gel, the Ag/AgCl sensor, the snap and the wire; the skin tint follows the local voltage; the V(LL) trace runs above. |
| 16 | 32–35 | VOLTAGE DIFFERENCE · + INPUT: LL · − INPUT: RA | Up the wire onto the board: V(LL) and V(RA) both carry the same mains hum; the instrumentation amplifier subtracts them and the clean Lead II appears. |
| **E** | **35–43** | **How the machine processes it** | |
| 17 | 35–38 | SIGNAL AMPLIFICATION · IN ≈ 1 mV · OUT ≈ 1 V · × 1000 | The amplifier: a millivolt input becomes a volt-sized output with the same shape. |
| 18 | 38–40 | NOISE FILTERING · BASELINE WANDER · MAINS HUM · MUSCLE NOISE · FILTERED | The filter stage: the raw trace drifts, hums and jitters; the filtered one keeps P, QRS and T. |
| 19 | 40–43 | ANALOG → DIGITAL · ANALOG · SAMPLES · DIGITAL · NUMBERS | The ADC: dots sample the analog wave at regular instants, the numbers ride the data bus to the processor, and a stepped digital trace rebuilds the wave. |
| **F** | **43–48** | **The result** | |
| 20 | 43–48 | P · QRS · T · P ATRIA · QRS VENTRICLES · T RECOVERY · recap · HOW ECG MACHINES WORK | Back on the monitor (it beeps again), pulling out to the opening framing: P, QRS and T are marked on one beat, and an inset heart beats in step with the trace beside a legend that lights up wave by wave; the recap HEART CELLS → SKIN VOLTAGE → ELECTRODES → SIGNAL PROCESSING → ECG; the title; the last frame is frame one. |

Honesty chips, one at a time for about 2–3 s each: SLOWED DOWN, SIMPLIFIED FIELD MAP, SENSES VOLTAGE · NO SHOCK,
SHARED HUM MOSTLY CANCELS, SAME SHAPE, BIGGER, FILTERS CAN CHANGE SHAPE, SAMPLES SHOWN SLOWED.

## Making the context easy to read

- One caption at a time, top left, in big letters inside a solid dark box with a yellow accent bar; it types in and
  leaves after about 3 s.
- Leader-line tags sit next to the thing they name, in solid boxes, mostly at the large size (key words such as SA
  NODE, AV NODE, Na⁺ IN, K⁺ OUT, POSITIVE, × 1000, SAMPLES are 18 px tall on the 360×640 canvas, 54 px in the video).
- Everything stays inside the short-video safe area (nothing under the right-hand buttons or the bottom
  description), and every label appears on the beat its sound plays.
- Graphs are labelled where they are read: MEMBRANE VOLTAGE with 0 mV and THRESHOLD, LEAD II · SLOWED DOWN with P,
  QRS and T, and each signal panel with its name (V(LL), V(RA), V(LL) − V(RA), IN, OUT, RAW, FILTERED, ANALOG,
  DIGITAL).
- The monitor's screen is drawn once at the opening zoom and scaled with the camera, so its pixel text never jumps in
  size when the camera moves.

## Colour code (fixed for the whole film; colours are educational)

| Colour | Meaning |
|---|---|
| Dark navy | the ground |
| Crimson (pink when active) | heart muscle; a wall turns pink while it is depolarized |
| Warm yellow | the SA node |
| Orange | the AV node (and its ring of dots during the hold) |
| Electric cyan | the conduction pathways (His bundle, bundle branches, Purkinje fibres) |
| Deep purple-red | the cell membrane (lipid bilayer) |
| Yellow / cyan / purple discs | Na⁺ / Ca²⁺ / K⁺ ions (with their charge signs) |
| Warm / cool bands | positive / negative body-surface voltage (simplified field map) |
| White and silver | electrodes; the lead wires are white (RA), black (LA) and red (LL) |
| Neon green | the ECG signal and the monitor trace |
| Cyan | digital processing: samples, numbers, the digital trace |

## Sound design

An original electronic score, synthesised in plain JavaScript (no samples): 120 BPM in A major, one chord per bar.
**The lead melody is a heartbeat drawn in pitch**: P (a small step up), Q-R-S (down, a leap up, down past the start)
and T (a rounded step); on the A chord its R note is A5, the monitor's own beep. Every bar that carries a monitor beep
holds an A in its chord, so the beep always sits in the music. The melody changes instrument with the story:

| Bars (time) | Chapter | Music |
|---|---|---|
| 1–2 (0–2.9 s) | Hook | Full groove from the first frame; the melody on a bright beep-lead with a bell an octave up; a tape-stop into slow motion |
| 2–6 (3–12 s) | SA node, ion channels, gap junctions | Half-time groove; the melody on a soft marimba, leaving room for the ion sounds and the gap-junction cascade (which is the melody of bar 5) |
| 7–8 (12–16 s) | The AV hold | The melody plays only its P… and waits (ticks and a pad) through the whole AV delay; at 15.0 s it lands Q-R-S-T and the band comes in: the PR interval as music |
| 9–11 (16–21.75 s) | His–Purkinje, the ventricular cell | Plucks, 16th arpeggios, a snare and kick build, a riser; one eighth of silence |
| 12–13 (22–26 s) | QRS | The drop exactly on the QRS beep: saw lead on the heartbeat melody, wide chords, sub impact; in bar 13 the falling K⁺ blips take the melody |
| 14–17 (26–34 s) | The body and the electrode | Half-time, glass bells; on the board a buzzy hum… that stops dead when the subtraction cancels it (33.5 s) and the beat drops back in |
| 18–21 (34–42 s) | Gain, filter, ADC | The melody on a chip lead with chip arpeggios; "× 1000" lands on a downbeat with an impact; during NOISE FILTERING the whole band is literally low-pass filtered and opened again |
| 22–24 (42–48 s) | The monitor, the recap, the title | Everything together, the recap bells climb the scale, and a riser runs straight back into bar 1 |

The SFX are mixed forward (the band ducks under them) and tuned to the A-major pentatonic: **the monitor beep (A5,
880 Hz) on every R wave the picture shows**, electrode clicks, zoom whooshes, a tape-stop into slow motion, channel
gate clicks, **one rising bloop for each Na⁺ ion through the funny channel** (the voltage creeping up), a zip for the
Ca²⁺ upstroke, **one falling blip for each K⁺ ion leaving**, **one bell per cell in the gap-junction cascade**, a bloom
for the atria, **ticking through the AV hold** and a release chime, a split two-note tone for the bundle branches,
sparkles running through the Purkinje network, **the zap of the fast Na⁺ upstroke**, the big beep on the QRS, a
ripple as the body's voltage pattern blooms, a low tone for NEGATIVE and a bright one for POSITIVE, a gel squish, the
hum and **its cancellation chime**, an amplifier power-up and the "× 1000" hit, a filter sweep with noise crackles, a
digital chirp, **one soft click per ADC sample** and data blips for the numbers, ticks for the P/QRS/T marks, five
level-up bells for the recap and the title chord. Hearts, ions, fields and signals make no such sounds in reality:
these are educational sonifications, and every one belongs to a visible event.

## Quality checks run before delivery

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint.py` with no red flags (20 shots, 48 s, no text-led
  shot). The yellows: shots 01–03 last 1 s each; they are the brief's hook micro-scenes, joined by one continuous
  camera move.
- **Skill film gate** (`film_gate.py`, on a 720×1280 QA proxy rendered at 30 fps from the same engine; the proxy is
  not a deliverable): passed. Fast-motion frames 0.190 (worst 24 s window 0.115), no blank stretch, still frames
  4.7 % with the longest still stretch 0.75 s, 5.0 visual events per 10 s, dead background 0.11, crossfade-only
  transitions 0 %. Two yellows, both by design: (1) the fixed-frame share 0.65 comes from the instrument panels, not
  from slide headers or logos: the Lead II strip under the heart (10–26 s), the wave panels on the amplifier board
  (30–43 s) and the monitor's own screen; they are the brief's "connect the heart to the waveform" device and change
  every frame; (2) 8.8 push-ins per minute: this is a scale-travel film (monitor → chest → heart → node → cell and
  back), and the push-ins are answered by pull-backs (push-ins are 47 % of all push and pull events): cell → tissue →
  heart, AV node → Purkinje network, cell → heart twice, heart → whole chest, monitor screen → opening framing.
- **Motion scan** (`tools/qa_motion.js`, 30 fps): no window of 0.5 s or more with under 0.3 % of the pixels moving,
  no frame step changes more than 55 % of the pixels sharply (every transition is a smooth crossfade), 1.0 %
  blue-purple frames. About 10 ms per frame in Node at the 360×640 logical size.
- **Loop:** the last frame differs from frame one in 0.11 % of its pixels (an ordinary frame step changes about 1 %);
  the soundtrack's wrap has no jump.
- **Audio** (numbers only, not a listening test; `tools/audio_qa.js`): exactly 48.000 s; −15.0 LUFS integrated,
  −1.75 dBTP true peak, 4.4 LU loudness range. Bars sit at −15 to −23 dBFS RMS: the hook, the build, the drop (bar 12,
  −15.4) and the ending are the loudest; the AV hold (bar 7, −23.4) and the electrode bar (−22.6) are the quietest.
  30 % of the energy is below 120 Hz (a first pass had 37 %, with the sub an octave too low for phone speakers).
  1,043 music notes and hits, 136 SFX. A stem check (an SFX-only render against a music-only render, same code) puts
  134 of the 136 cues within 6 dB of the music in their strongest octave band or above it (median +15.4 dB): the
  monitor beeps +21 dB on average, the ion bloops +14 dB, the K⁺ blips +19 dB, the cascade bells +28 dB, the zap
  +18.5 dB, the hum +4 dB and its cancellation chime +23 dB; the two quieter ones are the soft atrial bloom and the noise sweep that rides
  on top of the band's own filter sweep.
- **Player:** headless Chromium smoke test (play, seek) with no errors; the soundtrack synthesises in the browser.
- **Self-review against the skill's six failure modes:** no page frame or bullet slides (every shot is one visual
  event; captions and chips leave after about 3 s; the camera changes from shot to shot, and push-ins are answered
  by pull-backs); original compositions (an original monitor, heart map, membrane, tissue and board design), nothing
  copied from sample films; a concrete object in every shot (monitor, cable, electrodes, chest, heart, SA node, cell
  membrane, ion channels, muscle cells, AV node, His bundle, Purkinje fibres, torso, electrode layers, amplifier,
  filter, ADC, processor); no dead ground (beating heart, drifting dust and ions, sweeping traces, moving data);
  one pixel-art style and palette from the first frame to the last, no blue-purple ground; no faces on people, cells
  or ions (the patient is shown only from neck to waist); no flashing effects and no lightning bolts. No separate
  reviewer agent was used.

To run the skill's delivery gate on your own render:
```
uv run ../.claude/skills/huashu-art-motion/scripts/film_gate.py output/ecg_8bit.mp4
```

## Science notes

What the film shows, simplified but correct in order and cause:
- **The pacemaker.** The SA node in the right atrium has no stable resting potential. During diastole the "funny"
  current (I_f, carried mostly by Na⁺) slowly depolarizes it toward threshold; at threshold L-type Ca²⁺ channels open
  and produce the (slow) upstroke — there is no fast Na⁺ upstroke in SA-node cells; K⁺ currents then repolarize it.
- **Cell to cell.** Activation spreads from cell to cell through gap junctions (connexin channels in the intercalated
  discs), so the atria depolarize as a wave: that wave is the **P wave**.
- **The AV node** conducts slowly, holding the signal for roughly 0.1 s so the atria can finish emptying; on the ECG
  this is the flat PR segment. Then the **bundle of His**, the **left and right bundle branches** and the **Purkinje
  fibres** carry it fast to the ventricular walls.
- **Ventricular cells** depolarize with a fast Na⁺ influx (phase 0), hold a Ca²⁺ plateau (phase 2) and repolarize as
  K⁺ flows out (phase 3). Their depolarization is the **QRS complex**; their repolarization is the **T wave**. The T
  wave is upright in Lead II because the last regions to activate recover first (modelled here as reverse-order
  recovery). Atrial repolarization happens during the QRS and is hidden in it.
- **From the heart to the skin.** The body's tissues conduct, so the heart's coordinated activity sets up changing
  voltages everywhere in the torso (volume conduction; here simplified to a single changing dipole along the Lead II
  axis). The electrodes sense this electric field; **no ions travel from the heart to the skin**.
- **Electrodes.** An Ag/AgCl sensor with conductive gel makes a stable, low-impedance contact with the skin. The
  electrode measures voltage and sends no shock; the gel improves contact, it does not amplify.
- **Lead II** is the voltage difference V(LL) − V(RA). In this simplified three-electrode monitoring set the LA
  electrode serves as the reference. Interference that both electrodes share (most of the mains hum) cancels in the
  instrumentation amplifier's subtraction (common-mode rejection); a little remains and the filters remove it.
- **The front end.** The ECG at the skin is about a millivolt; the amplifier raises it about a thousandfold (the
  exact gain varies by design). Filters reduce baseline wander (breathing, movement), muscle noise and mains hum;
  monitoring filters (about 0.5–40 Hz, as on the board) are narrower than diagnostic ones and can change the
  waveform's shape. The ADC samples the voltage at regular instants (hundreds of times per second in real devices;
  drawn far slower here) and the processor rebuilds and displays the waveform.
- **Heart rate.** 72 BPM means one beat every 0.83 s.

Simplifications, stated on screen or here: the slow-motion beat uses a stretched, non-linear clock (SLOWED DOWN);
the field map is a single-dipole sketch (SIMPLIFIED FIELD MAP); the signal shapes, the ×1000 gain and the 12-bit
numbers are illustrative; the sampling is drawn slowed (SAMPLES SHOWN SLOWED); the hum on the board is drawn at a low
frequency so it can be seen.

Sources for the physiology and the front end (standard textbook material, not re-checked online for this
deliverable): Guyton & Hall, *Textbook of Medical Physiology* (cardiac excitation and the ECG); Klabunde,
*Cardiovascular Physiology Concepts*; Webster (ed.), *Medical Instrumentation: Application and Design* (biopotential
electrodes and amplifiers); AHA/ACCF/HRS recommendations for the standardization of the electrocardiogram (filter
bandwidths and sampling).

## Files

| File | What it holds |
|---|---|
| `src/00_core.js` | the pixel engine: buffers, primitives, masks, shading, camera, smooth blends |
| `src/01_font.js`, `src/02_pal.js`, `src/05_fx.js` | pixel fonts, palette helpers and periodic motion, small shapes |
| `src/03_clock.js` | the 120 BPM grid, the scene table, the Lead II waveform, the 72 BPM beat lattice and the slow-motion clock |
| `src/10_room.js` | the ward: the monitor (its screen UI), the chest, the electrodes and the lead wires |
| `src/11_heart.js` | the heart map: regions, activation and recovery times, contraction, the conduction system |
| `src/12_cell.js` | the membrane worlds (pacemaker and ventricular cells, ions, channels, voltage graph) and the gap-junction tissue |
| `src/13_field.js` | the body-surface voltage map and the electrode cross-section |
| `src/14_elec.js` | the signal models and the amplifier board with its wave panels |
| `src/23_scenes.js` | the 20 scenes: cameras, crossfades, the strip, the panels, the tags |
| `src/24_overlay.js` | captions, chips and the title |
| `src/30_audio.js` | the score and the SFX (synthesis, mix, mastering chain) |
| `src/40_player.js` | the browser player |
| `tools/` | build, export, mastering, stills, QA scripts |
