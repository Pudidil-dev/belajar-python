# How Pulse Oximeters Work — pixel-art scientific animation (code project)

**How light becomes an oxygen number**, in 62 seconds and 24 connected scenes, 9:16, original 16-bit pixel art in a
Kurzgesagt-style flat-science grammar, rendered entirely in code (HTML5 Canvas 2D, JavaScript, Web Audio). No
narration, no subtitles, only short labels. The example is a fingertip transmission pulse oximeter: a red (660 nm) and
an infrared (940 nm) LED on the nail side, a silicon photodiode on the pad side.

- `index.html` is a self-contained player: open it in a browser (click to play, arrows to seek, M to mute).
- `tools/export.js` renders the MP4.
- `镜头表.md` is the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 3,720 frames (62.000 s). H.264, yuv420p, BT.709. The 360×640 logical canvas is upscaled ×3 with nearest-neighbour, so every pixel stays crisp. |
| Audio | Original electronic medical-tech score, 127.74 BPM in F# minor (33 bars = 62.000 s), plus event-synced SFX. AAC 48 kHz stereo, mastered to −15 LUFS with the true peak below −1.5 dBTP. |
| Loop | The display switches off, the clip springs open on the last beat and snaps shut again on frame one; the camera ends on the exact framing of frame one, and the closing C# chord falls back into bar 1, so the end flows into the start. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy
- Playwright Chromium: `npm i playwright && npx playwright install chromium`

```
cd oximeter_8bit
node tools/export.js                  # full MP4 -> output/oximeter_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 1.9 4.6 15.6 30.2 50.8 --scale 2   # check any frames
```

The picture renders at about 20 ms per frame on average in Node (up to ~80 ms in the finger cut-away scenes), plus the
H.264 encode; the offline audio render runs in Chromium and takes about four minutes.

To check the result:
```
ffprobe output/oximeter_8bit.mp4
ffmpeg -i output/oximeter_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 3,720 frames, an integrated loudness around −15 LUFS and a true peak below −1 dBTP.

## The hook

The first five seconds are built to make the question land before anyone can swipe:
- **0.00 s** the clip snaps shut on the raised fingertip (hard plastic click, a 3.5% frame punch).
- **0.34 s** the display boots (all segments test), **0.94 s** a "measuring" chase zigzags across the digits with one
  rising tick per 16th note.
- **1.88 s** **SpO₂ 98** slams in on the downbeat with PR 64; the device's pulse beep becomes the music's hook.
- **3.76 s** the skin turns into an X-ray cut-away and red and infrared beams cross the finger to the detector;
  **4.30 s** the question types in: **HOW DOES LIGHT BECOME OXYGEN DATA?** The rest of the film answers it, and the
  answer lands at 50.73 s, when 98% returns on the display with the success beep on the loudest bar.

## One journey, one example

The film follows **one index finger, one clip, one red and one infrared LED, one artery, one red blood cell, one pair
of hemoglobin molecules, one photodiode, one waveform, one ratio and one number (SpO₂ 98%)**. The hand is seen from
the thumb side with the nail to the right; the clip's upper jaw (display, LEDs) sits on the nail side and the lower
jaw (photodiode) on the pad side. The cut-away keeps that orientation, so light always travels right to left:
LED → nail → nail bed → bone → pad (artery, vein) → skin → photodiode. Worlds are joined by zoom lenses (the next scale
opens inside a growing lens where the camera dives, and closes again on the way out), an X-ray dissolve and two hard
cuts on downbeats.

| # | Time (s) | Caption / labels | What happens |
|---|---|---|---|
| 01 | 0–1.88 | PULSE OXIMETER | The clip snaps shut on the raised index finger; the display boots, then runs its measuring chase. |
| 02 | 1.88–3.76 | BLOOD OXYGEN? · SpO₂ = BLOOD OXYGEN LEVEL | SpO₂ 98 and PR 64 slam in, the heart icon blinks, the pleth trace scrolls; the camera pushes toward the display. |
| 03 | 3.76–5.64 | HOW DOES LIGHT BECOME OXYGEN DATA? · RED · INFRARED | The dive: the fingertip becomes an X-ray cut-away; red and infrared beams cross from the LEDs through nail, bone and pad to the photodiode. |
| 04 | 5.64–7.52 | RED LED 660 nm · INFRARED LED 940 nm · TAKING TURNS (SLOWED DOWN) | The LED package in the upper jaw: red, infrared, off, in turn on eighth notes; a timing strip shows the slots. |
| 05 | 7.52–9.39 | LIGHT PASSES THROUGH TISSUE · NAIL · BONE · SKIN & TISSUE | Pull back: photons scatter through the tissue; some are absorbed, some reach the far side. |
| 06 | 9.39–13.15 | ARTERIAL PULSE CHANGES THE SIGNAL · HEARTBEAT · ARTERY: PULSES · VEIN: STEADY | Push to the pad: the artery swells and relaxes with each heartbeat; the vein stays still. |
| 07 | 13.15–15.03 | HEMOGLOBIN CARRIES OXYGEN · RED BLOOD CELLS · HEMOGLOBIN · O₂ | A lens into the artery, then into one red blood cell full of hemoglobin, some of it carrying oxygen. |
| 08 | 15.03–17.85 | OXYHEMOGLOBIN · 4 × O₂ BOUND · DEOXYHEMOGLOBIN · NO O₂ | Two hemoglobin molecules: four O₂ bind to one (bright red); the other stays empty (dark maroon). |
| 09 | 17.85–20.67 | THEY ABSORB LIGHT DIFFERENTLY · DEOXY ABSORBS MORE RED · OXY ABSORBS MORE INFRARED | Red light rains on both and the deoxy molecule swallows most of it; under infrared the oxy molecule takes a little more. The bars use tabulated extinction coefficients. |
| 10 | 20.67–24.42 | PULSING BLOOD CHANGES TRANSMITTED LIGHT · LIGHT REACHING THE PHOTODIODE · MORE BLOOD = LESS LIGHT | Back out to the cut-away; a live trace of the light at the detector dips with every pulse. |
| 11 | 24.42–27.24 | PHOTODIODE DETECTOR · CATCHES THE LIGHT THAT GOT THROUGH | Pan to the lower jaw and a lens into the photodiode chip. |
| 12 | 27.24–30.06 | LIGHT BECOMES ELECTRICAL SIGNAL · n · p · ELECTRON · CURRENT TO THE AMPLIFIER | Inside the silicon junction: each photon frees an electron (green) and a hole; the field sweeps the electron into the wire. |
| 13 | 30.06–32.88 | RAW OPTICAL SIGNAL · STEADY: SKIN, BONE, VEINS · DIPS: ARTERIAL PULSE | The drop: the raw signal slams onto a scope, a high steady level with small dips. |
| 14 | 32.88–35.70 | PULSE SIGNAL IS ISOLATED · DC: STEADY PART · AC: THE PULSE (ZOOMED IN) · ONLY ~2% OF THE LIGHT | The trace splits into the flat baseline (DC) and the pulsing part (AC), zoomed in. |
| 15 | 35.70–38.52 | RED SIGNAL · INFRARED SIGNAL · ONE DETECTOR, TIMED FLASHES | The LED timing strip sorts the samples into a red and an infrared channel. |
| 16 | 38.52–41.33 | RATIO OF RATIOS · AC ÷ DC = 0.96% · AC ÷ DC = 2.0% · R ≈ 0.48 | Four bars; the AC bars pump with each heartbeat; each AC is divided by its DC, then red by infrared. |
| 17 | 41.33–45.09 | SIGNAL PROCESSING · AMPLIFIER · ANALOG → DIGITAL · ALGORITHM · LED DRIVER | Out onto the circuit board in the clip: the current is amplified, digitised (green waves become cyan bits) and fed to the processor, which also drives the LEDs. |
| 18 | 45.09–47.91 | SpO₂ IS ESTIMATED · CALIBRATION CURVE · BUILT FROM VOLUNTEER STUDIES · R 0.48 → 98% | A lens into the processor: R drops onto the calibration curve and reads 98%. |
| 19 | 47.91–50.26 | PULSE RATE TOO · 0.94 s · 60 ÷ 0.94 s ≈ 64 / min · PR 64 | The gap between waveform peaks gives the pulse rate. |
| 20 | 50.26–52.61 | (the display) | Out to the device: SpO₂ 98% and PR 64 land with the success beep on the payoff downbeat. |
| 21 | 52.61–56.36 | LIGHT → SIGNAL → SpO₂ · LEDs · FINGER · BLOOD · HEMOGLOBIN · PHOTODIODE · SIGNAL · ALGORITHM · SpO₂ | Recap: eight icons light up one per beat along the chain. |
| 22 | 56.36–58.24 | IT READS CHANGING LIGHT ABSORPTION · % OF HEMOGLOBIN WITH O₂ · SATURATION, NOT OXYGEN PRESSURE | Back in the cut-away: the artery pulses between the two beams. |
| 23 | 58.24–60.12 | ESTIMATE, NOT DIRECT OXYGEN COUNT · COUNTING O₂ MOLECULES ✗ · READING LIGHT → ESTIMATE ✓ | A crossed-out molecule counter next to the display's ≈98% with a check. |
| 24 | 60.12–62 | HOW PULSE OXIMETERS WORK | Pull back to the whole hand, the title types in, the display switches off and the clip springs open into frame one. |

Disclaimer chips, one at a time: INFRARED SHOWN IN PINK, NOT TO SCALE, PULSE SIZE EXAGGERATED, SIMPLIFIED.

## Colour code (fixed for the whole film; colours are educational)

| Colour | Meaning |
|---|---|
| Deep navy | the ground |
| Light grey shell, teal trim | the clip |
| Peach / tan | the finger and its skin |
| Dark red | vessels |
| Bright red | arterial blood, oxyhemoglobin (with glowing O₂ markers) |
| Darker red | venous blood |
| Dark maroon / purple-red | deoxyhemoglobin |
| Red | the red LED and its light |
| Soft magenta / deep pink | infrared light (invisible in reality) |
| Cyan / metallic blue | the photodiode |
| Neon green | the analog electrical signal and the pleth trace |
| Cyan / white | digital data |
| Yellow / cyan on dark glass | the display: SpO₂ digits yellow, pulse-rate digits cyan |

## Sound design

127.74 BPM, F# minor, 33 bars = exactly 62 s, chord loop F#m–D–A–E with a Bm–C# turnaround before the drop and a C#
dominant at the end that falls back into bar 1. The hook is built from the oximeter's own pulse beep ("beep… beep-beep,
boop": a repeated C#6, then a step up, answered by a falling line), first on a plucked synth doubled by a bell, later
on a supersaw with vocal chops. The device's pulse tone (C#6) also sounds on every heartbeat, every two beats, the
same beat as the artery, the light dips and the waveform peaks (PR 64). In the LED scene the arp plays red note,
infrared note, rest, in the same three slots as the LEDs on screen.

| Bars (time) | Act | Music |
|---|---|---|
| 1–3 (0–5.6 s) | Hook | Full groove from the first downbeat, plucked hook, pulse beep from bar 2, tom fill into the dive |
| 4–5 (5.6–9.4 s) | LEDs, tissue | Lighter drums and ticks, the 3-slot LED arp |
| 6–7 (9.4–13.2 s) | Heartbeat | A lub-dub kick, pulse beeps, the hook on bells |
| 8 (13.2–15.0 s) | Into the blood | Low-passed, sub and soft kicks |
| 9–11 (15.0–20.7 s) | Hemoglobin, absorption | Doubled plucks, four-on-the-floor |
| 12–13 (20.7–24.4 s) | Transmitted light | Heartbeat kick pattern, counter-melody lead |
| 14–16 (24.4–30.1 s) | Photodiode, junction | Build: rising bass 16ths and filter, snare roll, riser, the hook an octave up, a short gap |
| 17–20 (30.1–37.6 s) | The drop: raw signal, DC/AC, channels | Crash, supersaw hook and vocal chops, 16th bass |
| 21–24 (37.6–45.1 s) | Ratio, circuit board | Glide lead, 16th ticks, arps |
| 25–27 (45.1–50.7 s) | The estimate | Breakdown to kick and ticks, then a build |
| 28 (50.7–52.6 s) | The payoff | Crash, saw, bell and chops: the loudest bar |
| 29–30 (52.6–56.4 s) | Recap | Plucked hook, arps |
| 31–33 (56.4–62 s) | Calm, loop | Bells and shaker, then the C# turnaround and a riser into bar 1 |

119 SFX of 43 kinds, each tied to a visible event and tuned to F# minor pentatonic: the clip snap, the boot sweep and
LCD blips, the measuring ticks, the wake chime as 98 lands, the dive and X-ray shimmer, photon pings (red and infrared
on different notes), photodiode clicks, one click per lit LED slot, swishes, the heartbeat throb, lens pops, a fluid
swell, four rising O₂ pops, a bright and a dark compare tone, light rain and absorption hits, a light-meter hum that
wobbles with the pulse, a zap per freed electron, the current hum, the drop slam and scope tone, the split, UI ticks,
channel tones, rising bars, calculation blips, dings, data bits, the processor's burble, the plotting sweep, the slide
onto the curve, the pulse-rate chime, the success beep, recap tile pops, a clarity tone, wrong and right, the closing
whoosh, the title chime, power-off and the spring. Light, molecules and electrons make no sound in reality: these are
educational sonifications. The music dips under the snap, the slam, the heartbeat, the wake and success beeps, the
dings and the pulse-rate chime, and the heartbeat carries a 150–500 Hz body so it still reads on phone speakers.

## Quality checks run before delivery

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint.py` with no red flags (24 shots, 62 s, no text-led
  shot). The nine yellows all say "shorter than 2 s": shots 01–05, 07 and 22–24 last 1.88 s (one bar) because the
  brief fixes their times. Each holds one visual event.
- **Skill film gate** (`film_gate.py`, run on a 720×1280 QA proxy rendered at 30 fps from the same engine; the proxy
  is not a deliverable): all three gates green. Fast-motion frames 0.135 (needs ≥ 0.06; worst 30 s window 0.076),
  no blank frames, blue-purple frames 0.008, still frames 0.7% (longest still 0.17 s), 5.8 visual events per 10 s
  (longest gap 5.8 s), dead background 0.17, fixed page frame 0. The one yellow is about 10.6 push-ins per minute
  (7.7 fast). They are the scale dives the topic needs (finger → cut-away → artery → red cell → hemoglobin, photodiode
  → junction, board → processor); pushes and pulls are close to even (55% push), and each dive is answered by a
  pull-out or a cut (05, 10, 13, 17, 20, 21, 24).
- **Motion scan** at 30 fps: no window of 0.5 s or more without motion (an earlier pass found three, two in the hook's
  boot and one in the ratio hold; the boot now runs a measuring chase under a slow camera rise, the AC bars pump with the pulse
  under a slow push). Frames where more than 55% of the pixels change are the fast dives and lens transitions (4.1 s,
  5.9 s, 7.8–7.9 s, 9.7–9.8 s, 13.3–13.4 s, 21.1 s, 24.7–24.8 s) and the two planned hard cuts (the drop slam at
  30.07 s, the recap → cut-away cut at 56.37 s). 0% blue-purple frames. About 20 ms per frame in Node at the 360×640
  logical size (the static hand and clip and the finger tissue are baked once into world-space textures).
- **Loop:** the last frame differs from frame one in 0.13% of its pixels (a normal frame step there changes 0.21%);
  the audio tail past 62 s is folded onto 0:00, so the wrap has no jump.
- **Audio** (numbers only, not a listening test): exactly 62.000 s; −15.0 LUFS integrated, −1.75 dBTP true peak and
  a loudness range of 6.8 LU after mastering. The bar levels follow the story: the hook (bars 1–3) opens strong, the
  LED, heartbeat and blood bars sit lower, the drop (bar 17) and the payoff (bar 28, the loudest bar) are the peaks,
  with breakdowns at the estimate (bar 25) and the calm ending; the snare rolls and risers before the drop and the
  payoff were trimmed so each lands 1–1.4 dB above its build. 119 SFX of 43 kinds plus 1,599 music notes and hits.
- **SFX stem check:** an SFX-only render against a music-only render set the effect levels (the clip snap, boot,
  zaps, calculation blips, bars, recap tiles and the ✓/✗ were raised 3–7 dB after the first check). Measured in the
  octave band where each effect is strongest, the median cue sits level with the music (+0.3 dB); 107 of 119 cues are
  within 6 dB of it. The softer ones are transition swishes, the quiet heartbeat under the light meter, data ticks and
  one recap tile.
- **Player:** headless Chromium smoke test (play, seek) with no errors.
- **Self-review against the skill's six failure modes:** no page frame or bullet slides (every shot is one visual
  event and the camera changes from shot to shot); original compositions, nothing copied from sample films; a concrete
  object in every shot (finger, clip, LEDs, nail, bone, artery, red cell, hemoglobin, photons, photodiode, junction,
  scope, bars, circuit board, curve, display); no dead ground (bokeh and dust drift behind the hand, blood flows, the
  artery pulses, traces scroll, the AC bars pump); one pixel-art style and palette from the first frame to the last,
  with only a hand in profile as the human. No separate reviewer agent was used.

To run the skill's delivery gate on your own render:
```
uv run ../.claude/skills/huashu-art-motion/scripts/film_gate.py output/oximeter_8bit.mp4
```

## Science notes

What the film shows, simplified but correct in order and cause:
- **SpO₂ is an estimate** of the percentage of hemoglobin in arterial blood that carries oxygen (functional
  saturation). It is not the oxygen pressure in the blood (PaO₂), and the device does not see or count oxygen
  molecules.
- **Two wavelengths.** A red (about 660 nm) and an infrared (about 940 nm) LED shine through the fingertip in turn;
  one photodiode on the other side measures how much light gets through. The LEDs take turns many times per second
  (the film slows this down), with a dark phase that lets the device subtract room light.
- **Different absorption.** At 660 nm deoxyhemoglobin absorbs about ten times more than oxyhemoglobin; at 940 nm
  oxyhemoglobin absorbs somewhat more. The bars in scene 09 use the tabulated molar extinction coefficients compiled
  by S. Prahl (Oregon Medical Laser Center): 660 nm HbO₂ 319.6 / Hb 3226.56, 940 nm HbO₂ 1214 / Hb 693.44 cm⁻¹/M.
- **The pulse is the key.** Skin, bone, other tissue, venous blood and the steady part of arterial blood absorb a
  constant amount (DC). With each heartbeat the arteries swell, so more blood lies in the light path and a little less
  light gets through: a small pulsing part (AC). Only that pulsing part is used, which isolates arterial blood.
- **Light becomes current.** In the photodiode's silicon, an absorbed photon frees an electron (leaving a hole); the
  junction's electric field sweeps it into the circuit as a photocurrent. An amplifier turns it into a voltage, an ADC
  into numbers, and the processor sorts the samples into a red and an infrared channel by the LED timing.
- **Ratio of ratios.** R = (AC/DC at red) ÷ (AC/DC at infrared). Dividing by DC cancels LED brightness, detector
  sensitivity and finger thickness to first order. In the film AC/DC is 0.96% (red) and 2.0% (infrared), so R = 0.48.
- **Calibration.** R is turned into SpO₂ with an empirical calibration curve, built from studies in which healthy
  volunteers breathe lower-oxygen mixtures while arterial blood samples are measured. Each manufacturer has its own
  curve; the film uses the common textbook line SpO₂ ≈ 110 − 25 R, so R = 0.48 gives 98%.
- **Pulse rate** comes from the time between pulse peaks: 60 ÷ 0.94 s ≈ 64 per minute.
- Real devices average over several beats and can be misled by motion, cold fingers with weak pulses, nail polish,
  bright ambient light and abnormal hemoglobins (carbon monoxide gives falsely high readings); some devices have also
  been shown to overestimate saturation on darker skin. The film does not cover these.

Simplifications: everything below the finger scale is magnified and not to scale; infrared is drawn in pink because
it is invisible; the pulsing part of the signal is drawn 8× larger than it is; a few photons stand in for an enormous
number, and far more light is lost in a real finger than reaches the detector here; the photodiode junction, the
circuit board and the calibration line are schematic.

## Source map

| File | Contents |
|---|---|
| `src/00_core.js` | pixel buffer, palette, rasterisers, masks, camera and camera tracks |
| `src/01_font.js` | pixel fonts (captions, micro labels, title) |
| `src/02_pal.js`, `src/03_clock.js`, `src/05_fx.js` | noise, splines, loop-safe wobble, seeded random; the beat grid, scene starts, pulse model (pleth waveform, R, SpO₂) and LED timing; paths, flashes, arrows, marks |
| `src/10_hand.js` | the hand and index finger (signed-distance shapes, baked once into a world texture), the clip, the display (7-segment digits, measuring chase, pleth trace), the macro scene |
| `src/11_cut.js` | the finger cut-away: nail, bone, pad, fat lobules, artery, vein and branches (tissue baked into a world texture), cut windows, LED package, photodiode |
| `src/12_light.js` | photon random walks (red / infrared absorption per tissue), light glow, beams and bursts |
| `src/13_blood.js` | red blood cells, the vessel, hemoglobin molecules with O₂, the red-cell interior |
| `src/14_parts.js` | the photodiode face and the silicon junction (bands, field, electron and hole) |
| `src/15_signal.js` | the signal world: raw trace, DC/AC split, red/infrared channels, ratio bars, calibration curve, pulse rate |
| `src/16_pcb.js`, `src/17_recap.js` | the circuit board (amplifier, ADC, processor, LED driver); the recap icons |
| `src/23_scenes.js`, `src/24_overlay.js` | the 24 scenes and their transitions; captions, tags, chips, title |
| `src/30_audio.js` | score, SFX map, Web Audio synthesis, offline render with loop folding |
| `src/40_player.js` | the player |
| `tools/` | build, export (Chromium audio + ffmpeg video), mastering, stills, smoke test, profiler |
