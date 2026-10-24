# Review: `build/dialysis_v2.mp4`

**File reviewed:** 1080×1920, 60 fps, 54.000 s (3,240 frames), H.264 + AAC 48 kHz stereo. Only the rendered video was judged. I opened no source, script or shot list.

**Method:** I pulled a frame every 0.5 s (108 frames) and sampled every 1/15 s in 8 transition windows. I checked full-resolution crops for every label and caption and took pixel measurements for colour, position and text size. Motion was estimated between frames by correlating particle masks. I compared the loop seam frame by frame. The audio got an onset envelope, band-split onsets, spectrograms around each on-screen event and EBU R128 loudness.

---

## Overall score: **6.5 / 10**

This is a coherent, good-looking pixel-art explainer. It hits all ten story beats in order and gets the science right. The measurements confirm it:
- No red cell ever reaches the dialysate side.
- Returning blood is exactly the same red as outgoing blood.
- Flow directions are correct and countercurrent in every shot.
- The urea gradient along the fibre is correct.
- The loop is seamless.

The sound is cut tightly to a 120 BPM grid, and every camera move has its whoosh.

What keeps it from "premium":
1. **The text layer.** Captions are small, sit on see-through dithered plates, hug the bottom UI band, and two of them are fully readable for only about 0.5–0.7 s.
2. **The hook misses the brief.** There is no BLOOD OUT label on frame 0, the opening "arm" doesn't read as an arm, and the frame is about 90% empty by 2 s.
3. **The middle feels like a slideshow.** The middle 60% (10.5–43 s) is one look: maroon lumen, grey wall, navy void. The camera is mostly locked off and every beat uses the same typewriter label plus caption.
4. **Colour-key slips and a weak ultrafiltration beat.** The dialysate is almost the background colour, the venous header is blue, and the ultrafiltration beat is muddy.

Fixing the text layer, the hook and the staging of the middle act would put this at 8 or above.

### Beat map (as watched; it anchors the timestamps below)
| Time (s) | What happens |
|---|---|
| 0.0–2.5 | Close-up of the arterial needle; BLOOD OUT types in at 0.6–1.0 s; camera tilts up the line |
| 2.5–5.6 | Fast pull-back to the full circuit and machine; DIALYSIS MACHINE label; caption "Cleaned outside the body."; dialyzer bracketed at about 4.9 s |
| 5.6–10.0 | Push into the dialyzer, then pull back to the cutaway; DIALYZER, BLOOD ↓, DIALYSATE ↑, HOLLOW FIBERS |
| 10.0–15.5 | Lens zoom into one fibre; SEMIPERMEABLE MEMBRANE; push to the right-hand wall |
| 15.5–24.0 | Diffusion: urea crosses the wall about 3 times per second; DIFFUSION, UREA, WASTE MOVES OUT |
| 24.0–30.2 | Red cell hits the wall and bounces back (25.1 s); PROTEINS STAY INSIDE |
| 30.2–36.9 | Ultrafiltration: chevrons, water particles, EXTRA WATER REMOVED |
| 36.9–42.6 | Countercurrent: red ↓ in the fibre, blue ↑ on both sides |
| 42.6–49.4 | Out through the dialyzer outlet, drip chamber and venous line; CLEAN BLOOD RETURNS |
| 49.5–51.5 | Recap: 1/4 ARM, 2/4 PUMP, 3/4 DIALYZER, 4/4 DIFFUSION |
| 51.5–53.5 | Title plus HEMODIALYSIS over the two-needle arm |
| 53.5–54.0 | Hard cut to the opening close-up, which loops into frame 0 |

---

## Issues (most important first)

### 1. Captions are too small, too briefly fully shown, and sit on the UI band (major)
**Timestamps:** 4.3–5.7, 7.0–8.2, 11.9–13.9, 17.4–19.6, 28.0–30.0, 31.6–33.8 and 39.4–42.6 s.

**Seen:**
- Sentence captions use a thin pixel font with 28 px cap height and 20 px x-height. That is about 1.7 mm tall on a 6.1″ phone, roughly the size of the platform's own UI text.
- The plate behind them is a 50% checkerboard dither, so the art shows through behind the letters:
  - At 7.5 s, "Thousands of tiny fibers." sits on the red and blue fibre bundle and the checker turns to noise behind the letters.
  - At 12.5 s, "Blood and dialysate stay apart." straddles both membrane walls.
- Caption text spans y ≈ 1488–1515 (77.5–79% of height) and the plate spans y ≈ 1476–1539. The plate's bottom edge therefore just crosses into the bottom-20% UI band (y ≥ 1536), where TikTok/Reels descriptions usually start even higher. Only the first caption (4.3 s) sits higher, at about 69%.
- Measured time each caption is fully typed and readable:

| Caption | Fully readable | Whole life on screen |
|---|---|---|
| "Cleaned outside the body." | **0.73 s** | 1.40 s |
| "Thousands of tiny fibers." | **0.53 s** | 1.20 s |
| "Blood and dialysate stay apart." | 1.08 s | 1.92 s |
| "Large blood components are retained." | 1.17 s | 1.97 s (about 18 characters/s) |

  All of these compete with moving action and a label at the same time.
- Labels such as BLOOD OUT and DIALYZER have only a 28 px cap height too, and in the first 7 s several are fully shown for under 1 s.

**Fix:**
- Use a solid 90–100% opaque caption plate with no dither.
- Scale the fonts about 1.5×, from 4 px to 6 px font pixels: about 42 px caps and 30 px x-height for captions, and about 40 px caps for labels.
- Move the caption band up to about y 1250–1350 (65–70%).
- Type within 0.3 s, then hold every caption fully typed for at least 1.5 s; aim for no more than about 12–14 characters/s over its whole life.
- Consider dropping the sentence caption on beats where the label already says it, such as WASTE MOVES OUT plus "Small wastes move out."

### 2. The hook misses the frame-0 requirement and the frame empties out (major)
**Timestamps:** 0.00–2.5 s.

**Seen:**
- Frame 0 has the needle and tubing but **no label**. The BLOOD OUT marker appears at 0.62 s and the word is complete at about 1.0 s.
- The extreme close-up shows the forearm as a flat beige band. There is no hand, wrist, elbow, vein or fistula bulge, so "a patient's arm" only reads once the wide shot arrives at about 3.3 s.
- The tilt up the tubing (0.7–2.5 s) leaves most of the frame flat navy. Only 21% of pixels differ from the background at 1.5 s, and 9.5% at 2.0 s. These are the seconds that decide retention.

**Fix:**
- Have BLOOD OUT fully drawn on frame 0. To keep the loop seamless, also type it in during the closing shot (53.55–53.98 s) so the last frame matches.
- Frame the opener wider so the wrist or hand and a visible fistula bulge or vein are in shot.
- Shorten the tilt to 0.8 s or less, or start the pull-back reveal straight away.
- Give the tube a visible pulse or glow so the hook has energy.

### 3. The fibre's contents are never introduced (brief beat 4) (major)
**Timestamps:** 10.5–13.8 s; the gap lasts until 27 s.

**Seen:**
- On entering the fibre, the only label is SEMIPERMEABLE MEMBRANE.
- The yellow dots stay unnamed until UREA at 16.0 s, about 5.5 s later.
- The purple blobs stay unnamed until PROTEINS at 27.2 s, about 17 s later.
- Red cells are named only at 24.6 s.
- "Plasma" and "albumin" are never named.

For a long stretch the viewer watches unexplained coloured confetti, and that undermines "one concept at a time". The concepts land before the cast is known.

**Fix:**
- At about 10.6–13.5 s, do a quick callout one at a time, about 0.6 s each with leader lines: RED CELL, then UREA, then ALBUMIN (protein), then PLASMA, then SEMIPERMEABLE MEMBRANE.
- Alternatively, pin a tiny legend chip at the top left for 10.5–30 s (yellow dot = UREA, purple = ALBUMIN).

### 4. The middle act reads like a slideshow (major)
**Timestamps:** 10.5–43.4 s, especially 15.3–30.3 s.

**Seen:**
- About 32 s (60% of the runtime) share one look: maroon lumen, grey wall, navy void.
- 15.3–30.3 s is essentially **one framing for 15 s**; the wall drifts by 65 px or less.
- Mean frame-to-frame change is only 1.2–1.4 (out of 255) in 15–20 s and 0.7–0.8 in 39–42 s, the stillest hold in the film.
- Every beat uses the identical device: typewriter label, then a typewriter sentence caption, then a backspace erase.
- From 30 s on, every beat change is the same move, a pull-back, at 30.4, 36.9 and 42.6 s.

This matches two failure modes from the skill checklist: the same camera move every shot, and bullet text fading in.

**Fix:** give each beat its own staging.
- **Red cells and proteins:** a tight macro on the wall, a cell squashing against the pores, and a small push-in plus shake on impact.
- **Ultrafiltration:** a cross-section of the fibre (a circle) with water radiating outward, or a split screen with a pressure gauge.
- **Countercurrent:** a long side view with a slow tilt along the fibre and concentration bars.
- In static holds, add gentle drift or parallax, for example two depth layers of particles.
- Vary the text device: icon chips, arrows that draw along a path, a label that rides a molecule.

### 5. The dialysate looks like empty background (major)
**Timestamps:** every fibre shot, 10.5–43 s.

**Seen:**
- The dialysate fill is RGB (8, 28, 49), almost identical to the page background (12, 26, 41).
- In the diffusion shot, the dialysate half (x > 590 px, about 45% of the frame) is 98–99% flat colour (measured).
- It reads as a void, not a moving fluid. Its upward flow is visible only through the handful of urea dots drifting up.
- The brief asks for a cool blue/cyan dialysate.

**Fix:**
- Tint the dialysate a distinct cool cyan-blue, around #0F3A55 to #13506E, and keep the outer background darker navy.
- Add faint upward-scrolling streaks or micro-bubbles so the countercurrent is visible in every fibre shot.

### 6. Blue on the blood circuit breaks the colour key (major)
**Timestamps:** 3.0–10.0 s, 43.5–49.4 s and 50.5 s.

**Seen:**
- The dialyzer's blood outlet header is saturated blue, RGB (46, 110, 207). That is the same family as the dialysate tubes and the DIALYSATE ↑ arrow.
- The return needle's hub and clamp are also blue.
- Blue means dialysate everywhere else, so the large blue cap at the bottom reads as the dialysate inlet. Upward dialysate flow would indeed start there.
- That invites a "blood runs into the dialysate" or "blood turns blue" misreading, which is close to the prohibited mixing idea.

**Fix:**
- Keep blue strictly for dialysate.
- Make the venous header and return hub dark maroon, or neutral grey with a thin blue ring.
- If you want arterial versus venous coding, use red versus maroon, or tag the lines TO MACHINE and BACK TO BODY.

### 7. The ultrafiltration beat is cluttered and doesn't read as "extra water squeezed out" (major)
**Timestamps:** 30.2–36.9 s.

**Seen:**
- Water is a uniform field of hundreds of tiny light-blue "v" glyphs covering both the blood and the dialysate.
- The whole field translates right at 4 px/frame (measured), while the blood flows down at 4 px/frame.
- It reads as a texture scrolling sideways over the scene, not as water passing through the wall.
- The same frame also carries red cells, urea, proteins, chevrons, ongoing urea-crossing flashes (about one per second), a label, a leader and a caption. It is the busiest frame in the film.
- The EXTRA WATER REMOVED leader ends in empty dialysate.
- The only cue for pressure is the chevrons.

**Fix:**
- Replace the full-field texture with one stream of fewer, larger droplets near the wall, each visibly passing through a pore. Make the motion fast, straight and one-directional so it contrasts with urea's random jitter.
- Add a pressure cue: a "+" gauge or piston on the blood side, or "−" suction on the dialysate side.
- Pause the urea flashes for this beat (one concept at a time).
- Point the label at the stream.

### 8. Urea crossings look like a teleport plus a flat yellow block (minor)
**Timestamps:** 16.2–36.2 s (39 crossings detected).

**Seen:**
- The urea dot vanishes at the wall.
- A flat pale-yellow block (56 px tall by the full 76 px wall width) lights up solid, then dithers out, over about 6–9 frames. That is twice the height of a pore (pores are about 28 px tall at this zoom).
- The dot then reappears on the far side, with no visible transit.
- The block reads as a UI glitch or an open door, and its size risks the "giant membrane hole" impression.

**Fix:** move the dot through the pore channel over about 12–18 frames, with a glow no bigger than the pore and an optional slight squeeze.

### 9. Several label leaders don't land on the mechanism they name (minor)
**Seen:**
- **4.0–5.6 s:** the DIALYSIS MACHINE leader ends inside the dialyzer's corner bracket (about x 595, y 405), not on the machine body. It looks as if it names the highlighted dialyzer.
- **11.3–13.8 s:** the SEMIPERMEABLE MEMBRANE label sits on the left wall, but its leader crosses the whole lumen (about 750 px, over the cells) to the right wall.
- **20.0–23.5 s:** WASTE MOVES OUT points at a fixed empty spot in the dialysate (about x 670, y 1040) for 3.5 s while molecules drift past. Its plate also overlaps the wall.
- **33.9–36.7 s:** the EXTRA WATER REMOVED leader ends in empty water.
- **16–23.5 s:** the BLOOD label sits on top of urea dots.

**Fix:**
- Anchor the machine label on the screen or pump.
- Point SEMIPERMEABLE at the wall right next to it.
- Make WASTE MOVES OUT track a crossing molecule, or turn it into an arrow through a pore.
- Keep label plates off the wall and out of particle areas.

### 10. Text intrudes into the right-edge safe zone (minor)
**Seen:**
- **8.5–10.0 s and 15.6–24.0 s:** the DIALYSATE label reaches x ≈ 1035 px (96% of width). At 9.0 s it also covers the dialysate port.
- **33.9–36.7 s:** EXTRA WATER REMOVED reaches x ≈ 991 px.
- **51.6–53.5 s:** the title plate's rules run to x ≈ 1040 px.

**Fix:** keep text and plates at x ≤ 950 px; right-align DIALYSATE to about 940 px.

### 11. The final title is on screen too briefly (minor)
**Timestamps:** 51.53–53.50 s.

**Seen:** the full title is readable for about 1.9 s. "HEMODIALYSIS" only completes at about 52.4 s, so it is fully visible for about 1.1 s before the hard cut.

**Fix:**
- Hold the title for at least 2.5–3 s. Take the time from the recap or from the CLEAN BLOOD RETURNS hold (46.2–49.4 s).
- Show the subtitle together with the title instead of typing it afterwards.

### 12. The recap montage is rushed and skips half of dialysis (minor)
**Timestamps:** 49.53–51.5 s.

**Seen:**
- Four shots of 0.5 s each, every cut masked by a one-frame white-dither flash. Four of the five cuts, including the title landing, produce a luma spike: 85→132, 82→165, 70→106 and 43→176 (out of 255).
- Step labels are 28 px caps and readable for about 0.4 s each.
- The recap omits ultrafiltration (water removal is half of what dialysis does), retention and the blood's return.
- "PUMP" appears here for the first time; it was never labelled in the film.
- "ARM" is not a process step.
- Four luma flashes in about 2 s is under the three-flashes-per-second limit, but not by much.

**Fix:**
- Recap with the film's own terms: BLOOD OUT, then DIALYZER, then DIFFUSION, then ULTRAFILTRATION, then CLEAN BLOOD RETURNS. Alternatively, use fewer and longer shots.
- Soften the flashes (a luma bump of 50% or less) or use dither wipes.
- If PUMP stays, label it in the wide shot at 4.0–5.6 s.

### 13. The push-in through a full-screen stripe texture risks strobing (minor)
**Timestamps:** 6.1–6.7 s.

**Seen:**
- About 0.5 s of full-screen, high-contrast red and blue stripes scrolling.
- Mean frame-to-frame change is 30–50 (out of 255), the largest in the film apart from the recap flashes.
- The push-in is immediately reversed by a pull-out.
- This risks moiré or strobing after platform compression and feels like a jolt.

**Fix:** shorten it to 0.25 s or less, lower the stripe contrast or add motion smear, or go straight from the exterior push-in to the cutaway with a dither wipe.

### 14. The audio energy drops just as the picture goes static (minor)
**Timestamps:** 10.5–16.0 s.

**Seen:**
- The score breaks down to a pad with one kick every 2 s.
- Momentary loudness falls to between −19 and −26 LUFS, against −14.9 integrated. The lows are −25.7 at 12.0 s, −26.3 at 14.0 s and −25.4 at 16.0 s.
- This happens while the picture is static inside the fibre. On phone speakers it sounds like the track dropped out.

**Fix:** keep a pulse going (hats, arpeggio or bass), or move the breakdown to after the diffusion beat, and lift the pad 3–4 dB.

### 15. The countercurrent shot doesn't show why opposite flow helps (minor)
**Timestamps:** 38.0–42.5 s.

**Seen:**
- The arrows are clear and correct.
- The urea gradient is correct (measured): in the blood, 56% of urea is in the top third and 17% in the bottom third; in the dialysate, 62% is at the top and 6–12% at the bottom.
- But it is drawn with dots of about 8 px and no highlights, so the transfer is barely visible. The hold is nearly still (mean frame change about 0.7).

**Fix:**
- Add slim concentration bars along both sides, or 2–3 highlighted urea hops at the top, middle and bottom.
- Add a slow tilt along the fibre.
- Have the caption say what the picture shows, for example "Fresh dialysate keeps waste moving out."

### 16. The film never says what dialysis is relative to the kidneys (minor)
**Seen:** the science rule "replaces part of kidney function, not a cure" is never conveyed, and the kidneys never appear.

**Fix:** add one short line, for example "Does part of the kidneys' job, not a cure", in the return beat (46–49 s) or under the title. Alternatively, add a tiny kidney icon in the recap.

### 17. "Thousands of tiny fibers." over a cutaway that shows about 11 (minor)
**Timestamps:** 7.0–8.2 s.

**Seen:** the cutaway draws about 11 red fibres, which undercuts "thousands".

**Fix:** draw a denser bundle (40–60 thin lines), or add a cross-section inset packed with dots.

### 18. Flow arrows sit outside the dialyzer (nit)
**Timestamps:** 8.0–10.0 s.

**Seen:** the BLOOD ↓ and DIALYSATE ↑ arrows are placed outside the housing. They show direction but not "blood inside the fibres, dialysate around them".

**Fix:** briefly overlay one red arrow on a fibre and one blue arrow in a gap, or keep the side arrows and add a short leader from each into the bundle.

### 19. Zooming out of the fibre reveals empty neighbours (nit)
**Timestamps:** 43.2–43.4 s.

**Seen:** the neighbouring fibres are flat maroon with no cells, and a dense cloud of urea dots hangs around the hero fibre. This exposes the single-fibre simulation.

**Fix:** populate the neighbours, or cut on the first frame of the pull-back.

### 20. The water particles vanish in one frame (nit)
**Timestamps:** 37.13–37.17 s.

**Seen:** the ultrafiltration water disappears in a single frame in the middle of the zoom-out.

**Fix:** let it flow out or fade over 6–10 frames.

### 21. One UI chirp fires early (nit)
**Timestamps:** about 15.40 s.

**Seen:** a UI chirp lands about 150 ms before the DIFFUSION label (15.55 s). Other label chirps land within about 20 ms.

**Fix:** if the chirp belongs to that label, delay it by about 9 frames.

### 22. True peak is a hair over −1 dBTP (nit)
**Seen:** true peak is −0.9 dBTP.

**Fix:** set the limiter ceiling to −1.0 to −1.5 dBTP so platform AAC re-encodes can't clip.

---

## What works well
- **Complete, logical story.** All ten brief beats appear in order. The return path follows the real blood route: dialyzer outlet, drip chamber (air trap), venous line, venous needle. The pump rotor turns in the wide shot.
- **Science is clean (verified, not eyeballed):**
  - **Red cells:** 0 red-cell pixels ever appear on the dialysate side across all fibre shots from 16 to 42 s.
  - **Blood colour:** the returning blood is the same red as the outgoing blood (mean RGB 168, 28, 57 versus 168, 27, 56). There is no magic brightening.
  - **Retention:** the red cell visibly hits the wall at 25.1 s, leaves an impact mark and bounces back. Proteins are turned back too.
  - **Flow directions:** blood patterns move down at 4 px/frame while dialysate dots and dialysate urea move up, in the cutaway, the diffusion shot and the countercurrent shot alike.
  - **Countercurrent gradient:** correct in both compartments.
  - **Diffusion:** urea goes from many to few, about 3 crossings per second in the diffusion beat.
  - **Clean versus dirty blood:** the outgoing tube carries yellow urea specks (about 88 px per frame) and the returning tube carries none. That is a nice subtle cue; making it a little more visible and keeping one or two specks would be even more honest.
- **Consistent, brief-compliant art direction.** The pixel art is crisp (nearest-neighbour) in every shot, with no blur, blue-purple gradients or neon glow. The navy background is flat, RGB (12, 26, 41). The palette follows the key:
  - blood RGB (141–193, 16–28, 48–57)
  - urea amber (240, 191, 55)
  - proteins purple (124, 73, 199)
  - membrane pale grey (180, 194, 209)
  - machine white and grey
  - UI cyan and white

  White and cyan labels have 9.9–16:1 contrast; the red BLOOD label has 4.7:1. The bold uppercase labels are short (1–3 words).
- **Good transitions.** The lens (iris) zoom from the dialyzer cutaway into one fibre (10.0–10.5 s) is the best moment in the film. The dither crossfade back to the dialyzer exterior lands exactly on an audio hit (43.42–43.45 s). The return shot mirrors the opening.
- **The loop is seamless.**
  - The last frame differs from frame 0 by a mean absolute 1.43, the same as a normal frame step (0.8–1.3); only the tube's flow pattern changes.
  - The camera is static at both ends and the tube flow keeps the same direction and speed.
  - The audio has no click at the seam (last sample 0, first sample 0.0003), the level is continuous, and 54 s is exactly 27 bars at 120 BPM.
- **Sound design and edit timing are tight.**
  - Recap cuts sit on the beat (within 33 ms).
  - Every camera move has its whoosh.
  - Chimes mark the dialyzer highlight and CLEAN BLOOD RETURNS.
  - There is an impact sound for the red-cell bounce.
  - The urea crossings are locked to the music's eighth-note grid.
- **The first 10 s are energetic.** Something new happens about every second.

---

## Loudness and sync measurements

**Loudness (ffmpeg ebur128, peak=true)**
- Integrated: **−14.9 LUFS** (on target for TikTok/Reels/Shorts, around −14)
- Loudness range: **4.0 LU** (−17.3 to −13.3 LUFS)
- True peak: **−0.9 dBTP**, slightly above a −1 dBTP ceiling
- Short-term range: −12.6 to −20.2 LUFS. Momentary dips to −25.7 (12.0 s), −26.3 (14.0 s) and −25.4 (16.0 s) during the 10.5–16 s breakdown.
- No silent stretches during action. Overall RMS is −16.1 dBFS.

**Tempo:** 120 BPM; the beat period is 0.500 s by autocorrelation of the onset envelope.

**Sync of picture events with audio** (a negative offset means the audio comes first)

| Event | Picture (s) | Audio (s) | Offset |
|---|---|---|---|
| Pull-back reveal of the circuit | 2.5–4.0 | Noise whoosh 2.5–4.4 | aligned |
| Push into the dialyzer / fibre texture | 5.6–6.1 | Sweep 5.5–6.1, onset 6.05 | aligned |
| Dialyzer highlight brackets | ≈4.9 | Chime ≈4.95 | aligned |
| Lens zoom into one fibre | 10.00–10.47 | Whoosh plus rising tone 10.05–10.4 | aligned |
| Push to the membrane | 13.8–15.3 | Whoosh 13.8–14.5 | aligned |
| BLOOD OUT marker | 0.617 | Chirp ≈0.60 | −17 ms |
| SEMIPERMEABLE MEMBRANE | 11.317 | Chirp ≈11.30 | −15 ms |
| DIFFUSION label | 15.55 | Chirp ≈15.40 | **−150 ms** (see issue 21) |
| WASTE MOVES OUT | 20.017 | ≈20.01–20.06 | 0 to +45 ms |
| RED BLOOD CELLS | 24.617 | ≈24.60 | −15 ms |
| Red cell hits the wall | ≈25.10 | Impact onset 25.10 | about 0 |
| PROTEINS STAY INSIDE | 27.217 | ≈27.20 | −15 ms |
| Urea crossing flashes (39 events) | 16.2–36.2 | Eighth-note grid (0.25 s) | Flash appears 2 frames (33 ms) before each tick, which is fine |
| Exit riser into the crossfade | 42.6–43.45 | Riser 42.1–43.4, hit 43.4 | aligned |
| Recap cuts | 49.53 / 50.00 / 50.50 / 51.00 | 49.50 / 50.00 / 50.50 / 51.00 | 33 ms or less |
| Title lands | 51.53 | Hit 51.50 | Picture 33 ms late, fine |
| Cut back to the opening shot | 53.53 | 53.50 | aligned |
| Loop seam | 54.0 → 0.0 | Last/first 50 ms RMS −17.8 / −18.3 dBFS, no click | seamless |

**Other picture measurements**
- Flash frames: recap cut luma (out of 255) goes 85→132 (49.50 s), 82→165 (50.00 s), 70→106 (51.00 s) and 43→176 (51.50 s), each decaying over about 3 frames. The 50.50 s cut has no luma spike. That is 4 luma flashes in about 2 s.
- Text sizes: labels are 28 px caps on a 4 px font grid. Caption x-height is 20 px. The title is 56 px caps and HEMODIALYSIS about 28 px.
- Caption band: text at y 1488–1515 px; the plate spans 1476–1539 px (76.9–80.2%). Rightmost text: DIALYSATE at x ≈ 1035 px; EXTRA WATER REMOVED at x ≈ 991 px.
