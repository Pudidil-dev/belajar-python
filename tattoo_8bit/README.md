# How Lasers Remove Tattoos — pixel-art scientific animation (code project)

**How laser energy breaks tattoo pigment and how immune cells help clear it**, in 48 seconds and 20 micro-scenes
grouped in 5 continuous sequences, 9:16, original 16-bit pixel art in a Kurzgesagt-style flat-science grammar (scale
travel: forearm → skin block → dermis → one ink aggregate → one macrophage → one lymphatic vessel → back to the same
forearm), rendered entirely in code (HTML5 Canvas 2D and JavaScript), with an original electronic soundtrack and SFX
synthesised sample by sample in the same JavaScript. No narration, no subtitles, only short English labels. The model
is a Q-switched Nd:YAG laser at 1064 nm on one black dragon tattoo on a forearm (Eastern-style line work: a
serpentine scaled body with a spiked crest, a horned head with an open mouth and whiskers, two clawed legs and a
flame-tipped tail; the brief's star was changed to a dragon at the user's request). It is an educational model: the
final clear skin is an illustrative outcome, and results vary.

- `index.html` is a self-contained player: open it in a browser (click to play, arrows to seek, M to mute). It
  synthesises the soundtrack in a few seconds after the first frame appears.
- `tools/export.js` renders the MP4 (the MP4 is not in the repository: render it on your machine, below).
- `镜头表.md` is the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 2,880 frames (48.000 s). H.264, yuv420p, BT.709. The 360×640 logical canvas is upscaled ×3 with nearest-neighbour, so every pixel stays crisp. |
| Audio | Original electronic score at 120 BPM (24 bars = 48.000 s), D major, plus 113 SFX read from the same event table as the picture. AAC 48 kHz stereo, mastered to −15 LUFS with the true peak at −1.75 dBTP. |
| Loop | The payoff timeline rewinds (labelled BACK TO THE START) to the opening: the last frame is identical to frame one, and every note or tail that runs past 48 s wraps to 0:00. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy (mastering)

```
cd tattoo_8bit
node tools/export.js                  # full MP4 -> output/tattoo_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 0 1.6 13.6 24.0 42.6 47.7 --scale 2   # check any frames
```

No browser is needed for the export: the picture (about 40 ms per frame in Node) and the soundtrack (about 4 s) are
both computed in Node. To check the result:
```
ffprobe output/tattoo_8bit.mp4
ffmpeg -i output/tattoo_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 2,880 frames, an integrated loudness around −15 LUFS and a true peak below −1 dBTP.

Optional checks (need Playwright Chromium, `npm i playwright && npx playwright install chromium`, only for the first):
`node tools/smoke.js` (player test), `node tools/qa_motion.js` (motion scan), `node tools/sync_qa.js` (picture–sound
sync), `node tools/audio_qa.js` (audio numbers, after an `--audio-only` export), `node tools/proxy.js` (a 720×1280
proxy for the skill's `film_gate.py`).

## The hook (0–4 s)

No title, no fade-in: the device, the tattoo, the pulse and the response are all on screen within two seconds.
- **0.0 s** a forearm with a black dragon tattoo winding down it; a gloved hand holds the laser handpiece over the
  dragon's neck (red aiming dot).
- **0.25 / 0.5 / 0.75 / 1.0 s** four pulses (4 Hz, a real Q-switched repetition rate), each with a sharp snap; each
  spot turns chalk white (frosting) with a fizz. **TEMPORARY FROSTING**.
- **2.0 s** **WEEKS LATER**: the white is gone, the dragon is a little lighter (still clearly visible).
- **3.0–4.3 s** the patch around the treated neck lifts out as a cut-away block (EPIDERMIS, DERMIS, TATTOO
  PIGMENT) and the camera dives into the ink: **INSIDE THE SKIN**.

## One example, followed through

**One forearm, one dragon tattoo, one handpiece; one ink aggregate followed from the dermis through absorption, expansion and
fragmentation; three of its fragments followed into one macrophage; some ink followed into one lymphatic vessel; back
to the same forearm.** The pulse itself lasts nanoseconds and is shown in slow motion (chip SLOW MOTION ·
NANOSECONDS); clearance takes weeks (WEEKS LATER, OVER WEEKS, the treatment timeline).

| # | Time (s) | Caption / labels | What happens |
|---|---|---|---|
| **A** | **0–4** | **Hook** | |
| 01 | 0–1 | — | Four pulses along the dragon's neck. |
| 02 | 1–2 | TEMPORARY FROSTING | The treated spots frost white; a faint redness around them. |
| 03 | 2–3 | WEEKS LATER | Same arm, same framing: the frost is gone, the dragon slightly lighter. |
| 04 | 3–4 | INSIDE THE SKIN · EPIDERMIS · TATTOO PIGMENT · DERMIS | The patch lifts into a cut-away block (the ink sits in the dermis under the dragon's lines); the camera dives in. |
| **B** | **4–19** | **How the laser breaks the ink** | |
| 05 | 4–6 | INK IN THE DERMIS · EPIDERMIS · DERMIS · INK INSIDE A MACROPHAGE · LARGE INK AGGREGATE | The dermis in cross-section: ink clusters, resident macrophages already holding ink, capillary loops, a lymphatic vessel; one large aggregate is ringed. |
| 06 | 6–8 | 1064 nm LASER · SCATTERED LIGHT · TATTOO INK | The next pulse inside the skin: photons (drawn as faint violet-red wave packets) cross the epidermis; three scatter; most reach the ink. Chip INVISIBLE IN REALITY. |
| 07 | 8–11 | ENERGY ABSORPTION · INK PARTICLES · RAPID HEATING | Extreme zoom: twelve photons are absorbed, one per eighth note; the particles jitter faster and gain a warm rim (no glowing ball). |
| 08 | 11–13 | RAPID EXPANSION · PRESSURE WAVE · GAS BUBBLES | The aggregate swells, a pressure wave ripples the collagen around it, gas bubbles form (the frosting, at the scale of the ink). |
| 09 | 13–16 | PIGMENT FRAGMENTATION · CRACKS · FRAGMENTS | Four cracks run through it on the beat, then it splits (14.0 s): the fragments drift apart and stay black. |
| 10 | 16–19 | SMALLER INK PARTICLES · BEFORE · AFTER · ONE LARGE AGGREGATE · SMALL FRAGMENTS | Side by side, the same aggregate before and its fragments after; the divider slides away into the real tissue. Chip NOT TO SCALE. |
| **C** | **19–33** | **Immune cells remove pigment** | |
| 11 | 19–21 | MACROPHAGE · NUCLEUS · MEMBRANE | Pull back: a macrophage (pale, irregular, deep purple nucleus) crawls into view. |
| 12 | 21–23 | REACHING FOR THE INK | Four small pseudopods stretch toward three of the fragments. |
| 13 | 23–26 | PHAGOCYTOSIS · 1 MEMBRANE EXTENDS · 2 PIGMENT ENCLOSED · 3 INTERNAL VESICLE FORMED | Two membrane arms wrap the fragments and meet (24.0 s, the uptake click); the vesicle is carried inside. |
| 14 | 26–28 | PIGMENT UPTAKE · VESICLE WITH INK · LYSOSOME | Inside the cell: three lysosomes merge with the vesicle; the ink stays recognisable. Chip OFTEN NOT DIGESTED. |
| 15 | 28–31 | LYMPHATIC TRANSPORT · LYMPHATIC VESSEL · INK-LADEN MACROPHAGE · LYMPH NODE | Small fragments slip through gaps between the vessel wall's overlapping cells, an ink-laden macrophage squeezes in, the flow carries them; an inset traces the path up the arm to a lymph node. Chip SOME INK, NOT ALL. |
| 16 | 31–33 | GRADUAL CLEARANCE · INK IN THIS AREA | Back to the whole dermis: over weeks the clusters thin out in seven steps (a meter falls); some ink ends up inside macrophages. Chip OVER WEEKS. |
| **D** | **33–40** | **Tattoo fading over time** | |
| 17 | 33–36 | WEEKS LATER | Out through the block to the same forearm: the dragon is noticeably lighter, the skin healed. |
| 18 | 36–40 | NEXT SESSION · LASER HANDPIECE · 1 REMAINING PIGMENT · 2 ENERGY ABSORPTION · 3 SMALLER FRAGMENTS · 4 IMMUNE CLEARANCE | Pull back to the treatment setting (console: Nd:YAG, 1064 nm, Q-SWITCHED): four more pulses, then four numbered mini-panels light up on the beat. |
| **E** | **40–48** | **Final time-lapse** | |
| 19 | 40–45 | THE TREATMENT COURSE · SESSION 1 · WEEKS LATER · SESSION 2 · WEEKS LATER · ADDITIONAL SESSIONS · FINAL RESULT | The same close-up, perfectly aligned, with a timeline: the dragon goes dark → slightly lighter → patchy → faint → no longer visible, with frost at each session and a clear time jump between. Chip RESULTS VARY. |
| 20 | 45–48 | LASER → FRAGMENTS → MACROPHAGE → FADING · HOW LASERS REMOVE TATTOOS · BACK TO THE START | The clear forearm, a four-icon recap, the title; the timeline rewinds to the opening frame. |

## Colour code (fixed for the whole film; colours are educational)

| Colour | Meaning |
|---|---|
| Dark navy | the ground |
| Warm skin tones | the forearm; peach = epidermis; soft pink = dermis; pale yellow = fat of the hypodermis |
| Deep black | tattoo pigment (blue-black at the surface, greying as it fades) |
| Chalk white | frosting (temporary gas bubbles) |
| Faint violet-red | the laser light — an educational colour: 1064 nm is invisible near-infrared |
| Pale white-blue, deep purple nucleus | macrophages; purple vesicles = lysosomes |
| Soft green | lymphatic vessels and the lymph node; red = blood vessels |
| Cyan | the laser console's electronics |

## Sound design

An original electronic score, synthesised in plain JavaScript (no samples): 120 BPM in D major, one chord per bar.
One five-note motif climbs the D-major pentatonic in leaps (D–F#–B–E–A, every second note, on dotted eighths). It
changes instrument with the story and grows lighter as the tattoo fades:

| Bars (time) | Chapter | Music |
|---|---|---|
| 1 (0–2 s) | Hook | Kick, sub and pad leave room for the four laser snaps; the motif on a bright lead |
| 2 (2–4 s) | Weeks later, into the skin | The motif on a glass bell; a downlifter as the skin lifts and the camera dives |
| 3–4 (4–8 s) | The dermis, the photons | Half-time; the motif on a marimba; a light arpeggio shimmers as the photons cross |
| 5–7 (8–14 s) | Absorption, expansion, cracks | Pulsing bass, a pad whose filter opens, a riser; the band thins so the cracks are heard; a sixteenth of silence |
| 8 (14–16 s) | **First climax: fragmentation** | The split lands on the downbeat: saw lead on the motif, wide chords, sub impact |
| 9–12 (16–24 s) | Comparison, the macrophage | Lighter, then an organic bouncing groove (marimba motif); a build and a sixteenth of silence |
| 13 (24–26 s) | **Second climax: the uptake click** | Warm plucks and chords on the closure |
| 14 (26–28 s) | Inside the cell | The whole band is heard muffled (low-passed) and opens as the camera leaves |
| 15–17 (28–34 s) | Lymph flow, clearance | Liquid arpeggios on a steady beat, then a ticking clock and a sparse motif |
| 18–20 (34–40 s) | Back out, the next session | A riser, the groove returns; four stabs land with the four steps |
| 21–22 (40–44 s) | The treatment course | Chip lead and arpeggios building; the motif climbs an octave as the tattoo fades |
| 23 (44–46 s) | **Final result** | A big, clean D-major chord, the motif on bells |
| 24 (46–48 s) | Title, rewind | Soft bells and a riser back into bar 1 |

**SFX, one per physical event, read from the event table.** Every sound effect is scheduled from `EV` in
`src/03_clock.js`, the same table that draws the picture, and every event time sits on the eighth-note grid (exactly
15 frames), so a sound starts on the frame its event is drawn: the laser's **sharp, dry snap** (a broadband click, a
high ring and a small thump — the real photoacoustic snap of a Q-switched pulse, not a sci-fi zap), the **frosting's
fizz**, the time-lapse sweep with an accelerating clock, the deep zoom, a soft dermis ambience, glassy pings for
scattered light, **one tick per absorbed photon, rising in pitch with the energy over a low rumble**, the **tight
pressure pulse** of the expansion with a widening whoosh, bubble pops, **four sharp cracks**, the **shatter** of the
split with fragments tinkling apart, a liquid drift, a squishy living texture for the macrophage, four rubbery
reaches, the membrane stretching, **the closure's gloop and the uptake click**, the vesicle popping in, a muffled
interior, three lysosome plops, the lymph flow with three slips and a squeeze, the node's chime, **seven diminishing
tones** of clearance, the snaps and fizz of the next session, four distinct step cues, **five ascending time-lapse
ticks** over a tone that fades as the tattoo does, a clean completion chord, recap pops, the title chord and a tape
rewind into the loop. The band ducks under the important ones. Microscopic processes are not audible in reality:
this is educational sound design.

## Quality checks run before delivery

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint.py` with no red flags (20 shots, 48 s, no text-led
  shot). The yellows: shots 01–04 last 1 s each; they are the brief's hook micro-scenes, joined by one locked
  framing and one continuous dive.
- **Picture–sound sync** (`tools/sync_qa.js`): all 100 event times are exact frames at 60 fps and sit on the
  eighth-note grid; all 113 SFX start on an event frame (or one frame after it, for the frosting that follows a
  pulse); on the rendered SFX-only stem the measured onsets of 77 percussive cues are a median 0.44 ms and at most
  3.8 ms from their event time (one frame is 16.7 ms).
- **Skill film gate** (`film_gate.py`, on a 720×1280 QA proxy rendered at 30 fps from the same engine; the proxy is
  not a deliverable): passed. Fast-motion frames 0.220 (worst 24 s window 0.193), no blank stretch, blue-purple
  frames under 1 %, still frames 7.0 % with the longest still stretch 0.42 s, 5.4 visual events per 10 s, dead
  background 0.16. Two yellows, both by design: (1) the fixed-frame share 0.385 comes from the locked close-up of the
  forearm, which the brief requires (same forearm, same tattoo position, same camera angle for the hook and the
  whole time-lapse), plus the treatment timeline; (2) 10 push-ins per minute: this is a scale-travel film
  (forearm → block → dermis → aggregate → cell), and the push-ins are answered by pull-backs (push-ins are 42 % of all
  push and pull events): aggregate → tissue → macrophage, cell → vessel → whole dermis, dermis → block → forearm, the
  close-up → the treatment setting.
- **Motion scan** (`tools/qa_motion.js`, 30 fps): no window of 0.5 s or more with under 0.3 % of the pixels moving,
  no frame step changing more than 55 % of the pixels sharply (every transition is a smooth crossfade), 0.1 %
  blue-purple frames.
- **Loop:** the last frame is identical to frame one (0.00 % of its pixels differ); the soundtrack's wrap has no jump.
- **Audio** (numbers only, not a listening test; `tools/audio_qa.js`): exactly 48.000 s; −15.0 LUFS integrated,
  −1.75 dBTP true peak, 4.5 LU loudness range. The three climaxes are the loudest bars (bar 8 −15.1, bar 13 −15.2,
  bar 23 −14.1 dBFS RMS); the build into the cracks and the way back out are the quietest (−21.9, −22.2). 31.5 % of
  the energy is below 120 Hz (a first pass had 41 %). 830 music notes and hits, 113 SFX. A stem check (an SFX-only
  render against a music-only render, same code) puts 111 of the 113 cues within 6 dB of the music in their strongest
  octave band or above it (median +11.5 dB): the laser snaps +16.6 dB on average, the cracks +18.8, the uptake click
  +14.5, the pressure pulse +14.0, the photon ticks +9.2; the two quieter ones are the ambience beds of the dermis and of
  the cell interior, which are textures, not events.
- **Player:** headless Chromium smoke test (play, seek) with no errors; the soundtrack synthesises in the browser.
- **Self-review against the skill's six failure modes:** no page frame or bullet slides (every shot is one visual
  event; captions and chips leave after about 3 s; the camera changes from shot to shot, and push-ins are answered
  by pull-backs); original compositions (an original forearm, handpiece, skin block, dermis, macrophage and vessel
  design), nothing copied from sample films; a concrete object in every shot (forearm, handpiece, frost, skin block,
  dermis, ink aggregate, photons, pressure wave, bubbles, fragments, macrophage, vesicle, lysosomes, lymphatic vessel,
  lymph node, laser console, timeline); no dead ground (drifting cells and dust, jittering particles, flowing lymph,
  crawling macrophage, slow camera drift on the holds); one pixel-art style and palette from the first frame to the
  last, no blue-purple ground; no faces on people, cells or particles (the patient is a forearm, the clinician a
  gloved hand); no flashes, no explosions, no glowing plasma. No separate reviewer agent was used.

To run the skill's delivery gate on your own render:
```
uv run ../.claude/skills/huashu-art-motion/scripts/film_gate.py output/tattoo_8bit.mp4
```

## Science notes

What the film shows, simplified but correct in order and cause:
- **Where the ink is.** Tattoo pigment sits in the dermis, not on the surface: much of it inside dermal macrophages,
  some in the surrounding tissue. Black ink is mostly carbon-based particles that can clump into larger aggregates.
- **The laser.** A Q-switched Nd:YAG laser emits nanosecond pulses at 1064 nm (near-infrared, invisible), a
  wavelength that penetrates deep, is absorbed well by black pigment and relatively little by melanin. Some light
  scatters in the tissue on the way.
- **Absorption → rapid heating → expansion.** The pigment absorbs the energy in a pulse shorter than the time heat
  needs to spread (selective photothermolysis), so it heats extremely fast, expands thermoelastically and sends a
  pressure (photoacoustic) wave into the surrounding material — a microscopic thermomechanical event, not a burn or an
  explosion of the skin.
- **Fragmentation.** The stress cracks the aggregate into much smaller particles (in reality down to tens of
  nanometres — the film is NOT TO SCALE). Fragmentation is not clearance: the fragments are still in the dermis.
- **Frosting.** The immediate whitening is gas bubbles forming in the treated skin; it fades within about half an
  hour and is not ink removal.
- **Clearance.** Smaller particles are more accessible to immune-mediated clearance: macrophages take them up by
  phagocytosis (membrane extends → particles enclosed → internal vesicle, which lysosomes fuse with). The ink is often
  not digested; macrophages can retain it (and when they die, it can be released and taken up again). Some small
  particles and some ink-laden cells enter lymphatic vessels and reach regional lymph nodes — one pathway, not all of
  the ink.
- **Over weeks and sessions.** Fading is gradual; sessions are spaced weeks apart to let the skin heal and the
  clearance work; several to many sessions are usually needed, and some tattoos keep visible pigment despite
  treatment. The final clear skin is one possible outcome, not a guarantee.

Simplifications, stated on screen or here: the pulse is slowed (SLOW MOTION · NANOSECONDS); photons are drawn as a
few wave packets in an educational colour (INVISIBLE IN REALITY); fragments are drawn far larger than they are (NOT
TO SCALE); the skin layers in the cut-away are thicker than life; weeks of clearance are compressed into seconds (OVER
WEEKS); the result is illustrative (RESULTS VARY).

Sources the brief asked to validate against (standard references, not re-checked online for this deliverable): U.S.
Food and Drug Administration, *Tattoo Removal: Options and Results*; American Academy of Dermatology, *Tattoo removal:
Lasers outshine other methods*; NCBI Bookshelf / StatPearls, *Laser Tattoo Removal*; Journal of Lasers in Medical
Sciences, *Immune Response in Laser Tattoo Removal: A Systematic Review*.

## Files

| File | What it holds |
|---|---|
| `src/00_core.js` | the pixel engine: buffers, primitives, masks, shading, camera, smooth blends, the palette |
| `src/01_font.js`, `src/02_pal.js`, `src/05_fx.js` | pixel fonts, noise and periodic motion, small shapes |
| `src/03_clock.js` | the 120 BPM grid, the scene table and **the event table (EV)** that drives both picture and sound; the tattoo's fade over the film |
| `src/09_dragon.js` | the dragon tattoo: its body curve, scales, crest, head, legs and tail, built once into an ink raster that every shot samples |
| `src/10_arm.js` | the forearm: skin, the tattoo with patchy fading, frosting, the handpiece, glove, articulated arm, console |
| `src/11_block.js` | the cut-away skin block |
| `src/12_micro.js` | the micro world: dermis layers, vessels, cells, scattered ink, the hero aggregate (particles, cracks, fragments), photons, pressure wave, bubbles, lymph fragments |
| `src/13_cell.js` | macrophages: resident cells with ink, the hero macrophage (crawl, reach, phagocytic cup, vesicle, lysosomes), the one that enters the lymph |
| `src/14_ui.js` | time-jump pills, the treatment timeline, the phagocytosis steps, the four quick steps, the lymph-node inset, the ink meter, the recap |
| `src/23_scenes.js` | the 20 scenes: cameras, crossfades, the before/after split, tags |
| `src/24_overlay.js` | captions, chips and the title |
| `src/30_audio.js` | the score and the SFX (synthesis, mix, mastering chain) |
| `src/40_player.js` | the browser player |
| `tools/` | build, export, mastering, stills and QA scripts (`sync_qa.js` checks picture–sound sync) |
