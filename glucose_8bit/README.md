# How Glucose Meters Read Your Blood — 8-bit scientific animation (code project)

**How one drop of blood becomes a number**, in 78 seconds and 26 connected scenes, 9:16, original pixel art in a
Kurzgesagt-style flat-science grammar, rendered entirely in code (HTML5 Canvas 2D, JavaScript, Web Audio).
No narration, no subtitles, only short labels.

- `index.html` is a self-contained player: open it in a browser (click to play, arrows to seek, M to mute).
- `tools/export.js` renders the MP4.
- `镜头表.md` is the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 4,680 frames (78.000 s). H.264, yuv420p, BT.709. The 270×480 logical canvas is upscaled ×4 with nearest-neighbour, so every pixel stays crisp. |
| Audio | Original 129.23 BPM medical-lab electronic score in E minor (42 bars = 78.000 s) plus 158 event-synced SFX, AAC 48 kHz stereo, mastered to −15 LUFS with the true peak at or below −1.6 dBTP. |
| Loop | The last shot glides back to the fingertip; the lancing pen slides back into the exact pose, framing and drift of frame one, and the bell outro thins into the intro, so the end flows into the start. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy
- Playwright Chromium: `npm i playwright && npx playwright install chromium`

```
node tools/export.js                  # full MP4 -> output/glucose_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 1.5 7.6 20.6 33.8 55.9 --scale 2   # check any frames
```

The picture takes a few minutes (about 30–60 ms per frame); the offline audio render runs in Chromium and takes
3–10 minutes depending on the machine.

To check the result:
```
ffprobe output/glucose_8bit.mp4
ffmpeg -i output/glucose_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 4,680 frames, an integrated loudness around −15 LUFS and a true peak at or below −1 dBTP.

## Four nested worlds, one example

The film follows **one drop of blood, one strip, one meter and one glucose molecule** whose electrons become the
current, the data and the number **104 mg/dL**. Everything runs top to bottom in the 9:16 frame: the fingertip is
above, the strip stands tip-up in the meter below, blood flows down the capillary channel, electrons flow down the
electrode, data flows into the meter. Four worlds are joined by the same zoom portal: the next world opens inside a
growing lens exactly where the camera dives, and closes back onto that spot on the way out.

1. **The hand and the meter** (mm): fingertip, lancing pen, the drop, strip, meter, the hand that holds it.
2. **The strip in cross-section** (µm, not to scale): base with printed electrodes, dry reagent, capillary channel, clear cover, vent.
3. **The molecules on the working electrode** (nm, not to scale): gold lattice, enzyme, glucose, mediators, electrons.
4. **Inside the meter**: the circuit board under the casing (connector, amplifier, converter, processor, display).

| # | Time (s) | Caption / labels | What happens |
|---|---|---|---|
| 01 | 0–2.09 | ONE TINY DROP OF BLOOD | The lancing pen clicks on the beat; a bead of blood swells on the fingertip and wobbles. |
| 02 | 2.09–3.95 | TEST STRIP | Pull-out: the meter rises in from below and the strip's tip kisses the drop on the downbeat; the meter beeps. |
| 03 | 3.95–6.04 | HOW DOES THIS BECOME A NUMBER? | Slow push: blood is sipped into the strip's window, the drop shrinks a little. |
| 04 | 6.04–7.89 | INSIDE THE TEST STRIP | The dive: the camera rushes into the inlet; the strip's cross-section opens in a lens and lands on bar 5. |
| 05 | 7.89–10.91 | CAPILLARY ACTION · NOT TO SCALE | The blood front creeps down the channel with a wall-hugging meniscus, past the electrodes; air leaves through the vent; the fill-detect electrode is reached. |
| 06 | 10.91–13.93 | GLUCOSE IS DISSOLVED IN THE SAMPLE · RED BLOOD CELL · GLUCOSE | Slow push into the plasma: red cells tumble, yellow glucose rides along; one glucose is ringed. |
| 07 | 13.93–16.95 | ENZYME · MEDIATOR · ELECTRODE | Glide along the dry reagent film on the electrodes; the blood wets it and enzymes and mediators pop out on the 16ths. |
| 08 | 16.95–19.96 | GLUCOSE MEETS THE ENZYME | Push into one enzyme; the molecular world opens in a lens; the ringed glucose drifts into the enzyme's pocket. |
| 09 | 19.96–22.98 | ENZYME REACTION · 2 ELECTRONS · SIMPLIFIED | The enzyme closes on the glucose, two electrons jump to its cofactor, the oxidised product (gluconolactone) is released. |
| 10 | 22.98–26 | ELECTRONS ARE TRANSFERRED · MEDIATOR | Two mediator molecules dock and each takes one electron, turning from cyan to green. |
| 11 | 26–29.02 | MEDIATOR CARRIES THE SIGNAL | The charged mediators leave the enzyme and drift toward the metal. |
| 12 | 29.02–32.04 | WORKING ELECTRODE | Pull-out: the gold electrode comes into view, busy with other mediators. |
| 13 | 32.04–35.05 | CHEMICAL REACTION → ELECTRICAL CURRENT · CURRENT | Each mediator hands its electron to the gold and turns cyan again; on bar 19 the current surges and electrons stream down the electrode. |
| 14 | 35.05–38.07 | MORE GLUCOSE = STRONGER SIGNAL · LOW · HIGH | Cut to a split screen: the same reaction with little and with much glucose; more electrons, a taller current gauge. |
| 15 | 38.07–41.09 | SIGNAL ENTERS THE METER | Double pull-out (molecules → strip → hand); green pulses race down the strip's working-electrode lead into the meter's contacts. |
| 16 | 41.09–44.11 | METER READS THE SIGNAL · AMPLIFIER | A scan line opens the casing; the current reaches the amplifier chip. |
| 17 | 44.11–46.89 | MEASURING THE RESPONSE | A scope card: the current spikes, decays, and the reading window lights up. |
| 18 | 46.89–49.91 | SIGNAL BECOMES DATA · CONVERTER | Glide to the converter: the curve is chopped into 16 samples and a binary word; bits stream to the processor. |
| 19 | 49.91–52.93 | GLUCOSE IS CALCULATED · PROCESSOR | Glide to the processor: the signal meets the calibration curve and reads across to 104. |
| 20 | 52.93–55.02 | BLOOD GLUCOSE READING | Pull-out: the casing closes, the display's dashes blink on the beat, the unit lights up. |
| 21 | 55.02–58.04 | 104 mg/dL | The slam: 1, 0, 4 hit the display, the last digit on the drop (bar 31) with the meter's beep. |
| 22 | 58.04–61.98 | FROM CHEMISTRY TO ELECTRICITY | Eight cuts on the beat retrace the chain: drop, strip, glucose, enzyme, mediator, electrode, current, number. |
| 23 | 61.98–65 | IT MEASURES A CHEMICAL SIGNAL · NOT MEASURED · ELECTRONS COUNTED | Glide along the electrode: red cells pass by untouched while the electrode keeps collecting electrons. |
| 24 | 65–68.02 | SAMPLE QUALITY MATTERS · ENOUGH · TOO LITTLE | Two strips: one fills to the fill-detect electrode and passes; the other stops short. |
| 25 | 68.02–71.04 | ONE DROP. ONE REACTION. ONE NUMBER. | Pull-out: the hand turns the meter toward us; the reading glows. |
| 26 | 71.04–78 | HOW GLUCOSE METERS READ YOUR BLOOD | Glide back up: the strip sips the last of the drop and pulls away; the pen slides back into place (→ frame one). |

## Colour code (fixed for the whole film)

| Colour | Meaning |
|---|---|
| Deep red | blood (the drop, the window, the meniscus) |
| Maroon | red blood cells |
| Dark red-tinted | plasma (strip section) and the solution around the molecules |
| Yellow / orange | glucose (yellow); the oxidised product (orange) |
| Purple | the enzyme and the dry reagent film (the only purple in the film) |
| Cyan → green | the mediator: cyan when empty, green while it carries an electron |
| Electric blue | electrons |
| Gold / silver-grey | working electrode (gold), counter/reference and fill-detect electrodes (silver) |
| Neon green | current and signal (traces, pulses, scope curves) |
| Cool grey + teal | the meter; teal for the pen's grip and the meter's buttons |
| White / cyan | the display and the result |
| Deep navy | the ground (flat, two dithered bands, soft bokeh) |

## Sound design

129.23 BPM, E minor, 42 bars = exactly 78 s. Friendly chord loop Em–C–G–D. The hook opens with the meter's own beep
interval (B up to E, a fourth) and returns in every act:

| Bars (time) | Act | Music |
|---|---|---|
| 1–2 (0–3.7 s) | The drop | Glass-bell hook, soft pad, light kick and shaker; the lancet click on beat 2 |
| 3–4 (3.7–7.4 s) | Touch + dive | The meter beep on the downbeat, bass enters; snare roll and rising bass into the dive |
| 5–8 (7.4–14.9 s) | Inside the strip | Syncopated groove, octave bass, the hook on plucks, liquid toms |
| 9–10 (14.9–18.6 s) | The reagent wakes | Four-on-the-floor, sparkle arpeggios, bell counter-melody; the pops climb the scale |
| 11–16 (18.6–29.7 s) | The reaction | 8-bit chip-lead hook, pulse bass, full drums; counter-melody on plucks |
| 17–18 (29.7–33.4 s) | Carrying the signal | Breakdown, then a B-major (dominant) build with kick and snare rolls |
| 19–20 (33.4–37.1 s) | The current surges | Lift to G major: saw-lead hook, arpeggios, crash |
| 21–23 (37.1–42.7 s) | Signal into the meter | Digital "data" lead, ticking hats |
| 24–28 (42.7–52 s) | Inside the meter | Clock-tick groove, pluck hook, arpeggios |
| 29–30 (52–55.7 s) | Build | The hook an octave up, B-major dominant, risers, half a beat of silence |
| 31–34 (55.7–63.1 s) | THE DROP = the number + recap | B major lifts straight into G major: supersaw hook, vocal chops, the meter beep, crash |
| 35–38 (63.1–70.6 s) | Calm + resolve | Half-time bells and plucks (Am–B–Em), then the warm hook over the hand shot |
| 39–42 (70.6–78 s) | Title + loop | Bell hook; the drums thin back to the intro texture so bar 42 leads into bar 1 |

Every SFX belongs to a visible event and is tuned to E minor pentatonic or the current chord: the lancet click, the
swelling drop, the meter rising, the touch and the beep, the capillary sip, the lens dives, the flow and the
fill-detect chirp, reagent pops, the enzyme's grip, two electron zaps, the product's release, two mediator power-ups,
the gold gleam, the hand-overs to the electrode, the current surge, the gauges, data pulses, the contacts, the casing
wipe, the amplifier, the scope spike, 16 converter ticks, bits, the processor, the calibration read-out, LCD ticks, the
three digit slams with the result beep, eight recap hits, electron counts, the pass chime and a soft "uh-oh", the turn,
the title and the pen seating back into place. Microscopic sounds are artistic sonifications, not real sounds.

## Quality checks run before delivery

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint.py` with no red flags. One yellow: the loop shot (26) is 6.96 s, and it holds three new events (the strip sips the last of the drop, pulls away, the pen slides back into frame one).
- **Skill film gate** (`film_gate.py`, run on a 540×960 QA proxy rendered from the same engine; the proxy is not a deliverable): all three gates green. Fast-motion frames 0.25 (needs ≥ 0.06), no blank frames, 0% blue-purple frames (the purple enzyme never becomes a ground), 0% fixed page frame, dead background 0.11. The one yellow is about 8.5 push-ins per minute (3.8 fast). They are the scale dives the topic needs (into the strip, the reagent, the enzyme, the meter, the number); each one is answered by a pull-out (scenes 02, 12, 15, 20, 25) or a cut.
- **Motion scan** at 30 fps: no window of 0.5 s or more without motion; hard cuts only where the shot list asks for them (split screen, the eight recap beats, the cuts into scenes 23–25). Average render time about 40 ms per frame.
- **Loop:** the last frame and frame one share the camera, its drift speed, the pen pose and the background; the audio tail past 78 s is folded onto 0:00.
- **Audio** (numbers only, not a listening test): exactly 78.000 s; −15.0 LUFS integrated and −1.75 dBTP true peak after mastering. Each second measures between −24 and −13 dBFS RMS; the loudest second is the number landing (55–56 s), the quietest is the calm before the sample-quality verdict. Below 250 Hz holds 69% of the energy (kick and bass trimmed, hook and hats lifted for phone speakers). 158 SFX of 59 kinds plus about 1,850 music notes and hits.
- **Player:** headless Chromium smoke test (play, seek) with no errors.
- **Self-review against the skill's six failure modes:** no page frame or bullet slides (every shot is one visual event and the camera changes from shot to shot); original compositions; a concrete object in every shot (finger, pen, drop, strip, cells, enzyme, mediator, gold, chips, display, hand); no dead ground (bokeh, dust, plasma swirl and water specks drift in every world); one pixel-art style and palette from the first frame to the last; hands only, no faces. No separate reviewer agent was used.

To run the skill's delivery gate on your own render:
```
uv run ../.claude/skills/huashu-art-motion/scripts/film_gate.py output/glucose_8bit.mp4
```

## Science notes

What the film shows, simplified but correct in order and cause (a generic modern electrochemical strip):
- A lancing pen makes a tiny puncture; a small drop (well under 1 µL is enough for most strips) is touched to the strip's inlet.
- The strip's channel is a thin capillary between a base film with printed electrodes and a hydrophilic cover. Blood is drawn in by **capillary action** and air leaves through a vent; a **fill-detect** electrode tells the meter the channel is full.
- A dry reagent on the electrodes dissolves in the plasma: an **enzyme** (glucose oxidase or, as drawn, an FAD-type glucose dehydrogenase) and a **mediator** (ferricyanide-like).
- The enzyme oxidises glucose to gluconolactone and takes two electrons; the mediator carries them (one electron per molecule) to the **working electrode**, which the meter holds at a fixed potential. Re-oxidising the mediator there gives an **electrical current**. A counter/reference electrode closes the circuit.
- Within the meter's measuring window the current is proportional to the glucose concentration (amperometry). The meter does not count cells or take a picture: it measures this chemical signal.
- The meter amplifies the current (transimpedance amplifier), converts it to numbers (ADC) and the processor applies the strip's calibration (plus corrections such as temperature) to estimate glucose in mg/dL. The reading is an estimate.
- Sample quality matters: too little blood, a strip that does not fill, contamination or extreme haematocrit can make the reading wrong, so the meter checks the fill and reports errors.

Simplifications: the strip section and molecules are magnified and not to scale; one enzyme stands in for many; the
current gauge, scope curve, samples and calibration curve are schematic; 104 mg/dL is an example value.

## Source map

| File | Contents |
|---|---|
| `src/00_core.js` | pixel buffer, palette, rasterisers, masks, camera, fonts |
| `src/01_ui.js`, `src/02_pal.js`, `src/05_fx.js` | callout helpers, extra glyphs, noise, splines, paths |
| `src/03_clock.js` | the beat grid, scene starts and every key moment, scene names |
| `src/10_macro.js` | the human-scale world: background, fingertip, drop, lancing pen, strip, meter, LCD, circuit board, hand |
| `src/11_strip.js` | the strip cross-section: electrodes, reagent, capillary front, red cells, glucose, reagent molecules |
| `src/12_micro.js` | the molecules: gold lattice and current, enzyme, glucose / product, mediators, electrons |
| `src/13_meter.js` | the signal path inside the meter and the scope cards |
| `src/20_story.js`, `src/21_cams.js` | the props' state over time (pen, drop, meter, display); one camera track per world |
| `src/22_world.js`, `src/23_scenes.js`, `src/24_overlay.js` | world M, the lens portals, split screen, recap, sample quality, captions, tags, title |
| `src/30_audio.js` | score, SFX map, Web Audio synthesis, offline render with loop folding |
| `src/40_player.js` | the player |
| `tools/` | build, export (Chromium audio + ffmpeg video), mastering, stills, smoke test, profiler |
