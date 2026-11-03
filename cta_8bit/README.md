# How CT Angiography Detects a Brain Aneurysm — 3D pixel-art scientific animation (code project)

**The Invisible Aneurysm, Revealed.** A 60-second, 9:16, seamless-loop scientific animation in genuine 3D rendered
as chunky 8/16-bit pixel art: one unruptured saccular aneurysm at the LEFT middle cerebral artery (MCA) bifurcation,
the patient in a CT scanner, iodinated contrast travelling from an arm vein through the heart and lungs to the brain,
the X-ray tube and detector turning around the head, attenuation by iodine, projections, filtered back-projection,
slices, a voxel volume, the vascular rendering, the radiologist finding the aneurysm and confirming it on an oblique
CT plane — and the digital image turning back into the same artery, on the same camera orbit, into frame one.

**No on-screen text of any kind** (no titles, labels, numbers, UI or watermark) and no narration: the explanation is
carried by objects, motion, colour and sound, and the mix leaves room for a voiceover added later (Azerbaijani).
It is an educational model: time is compressed (the contrast reaches the brain in seconds, the rotor turns in slow
motion), sizes are not to scale, and nothing in the film makes a diagnosis by itself.

- `index.html` — a self-contained player: open it in a browser (click to play, ←/→ to seek, M to mute). Playback
  loops seamlessly, picture and sound. It synthesises the soundtrack a few seconds after the first frame appears.
  (The scene name under the player is navigation only; it is not part of the film.)
- `tools/export.js` — renders the MP4 files (they are not in the repository: render them on your machine, below).
- `镜头表.md` — the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920, 60 fps, exactly 3,600 frames (60.000 s), H.264 High, yuv420p, BT.709. The 180×320 logical frame is upscaled ×6 with nearest-neighbour, so every pixel stays a crisp 6×6 block. |
| Audio | Original subtle futuristic cinematic score, 100 BPM, 25 bars = 60.000 s, D minor, plus 63 SFX read from the same event table as the picture. AAC 256 kbit/s, 48 kHz stereo. Full mix −22.0 LUFS integrated, true peak −3.6 dBTP (a quiet bed for a later voiceover). |
| Loop | A true loop: frames 0…3599 are unique samples at t = f/60 of one continuous cyclic motion; frame 3599 is the moment just before frame 0, not a copy of it. Every sound that runs past 60 s wraps to 0:00. |

## Render it yourself

Requirements: **Node ≥ 18**, **ffmpeg** with libx264, **Python 3** with **numpy** and **scipy** (mastering).

```
cd cta_8bit
node tools/export.js                      # everything: the picture once, then all four MP4 variants + three WAVs
```

That writes:

| File | Sound |
|---|---|
| `output/CTA_Brain_Aneurysm_Cinematic.mp4` | music + SFX (the cinematic version) |
| `output/CTA_Brain_Aneurysm_No_Music.mp4` | SFX only — no background music |
| `output/CTA_Brain_Aneurysm_No_SFX.mp4` | music only — no SFX |
| `output/CTA_Brain_Aneurysm_Silent.mp4` | no audio track (silent video master) |
| `output/audio/CTA_Brain_Aneurysm_Full_Mix.wav`, `…_Music_Only.wav`, `…_SFX_Only.wav` | 24-bit / 48 kHz stems |

Only one variant, or a few:
```
node tools/export.js --mix full           # Cinematic (music + SFX)
node tools/export.js --mix nobgm          # No_Music (SFX only)
node tools/export.js --mix nosfx          # No_SFX (music only)
node tools/export.js --mix silent         # Silent (no audio)
node tools/export.js --mix nobgm,silent   # several, comma-separated
node tools/export.js --audio-only         # only the three WAVs
node tools/export.js --video-only         # only the silent picture build/video.mp4
node tools/export.js --rerender           # render the picture again even if build/video.mp4 is current
```
The picture is rendered **once** (about 90–150 ms per frame in Node, so roughly 6–10 minutes for 3,600 frames plus the
x264 encode) and kept as `build/video.mp4` with a fingerprint of the engine sources; asking for another variant later
only re-muxes it in seconds. No browser and no GPU are needed. The three audio renders take about 15 s.

All three audio versions are mastered with **one common gain** (set so the full mix reaches −22 LUFS), so the
music-only and SFX-only versions are exactly as loud as they sit inside the full mix (−23.2 and −25.5 LUFS on their
own). The music-only version has no ducking (there are no SFX to make room for).

Check a result:
```
ffprobe output/CTA_Brain_Aneurysm_Cinematic.mp4                      # 1080x1920, 60 fps, 3600 frames
ffmpeg -i output/CTA_Brain_Aneurysm_Cinematic.mp4 -af ebur128=peak=true -f null -    # about -22 LUFS
```
Check the loop (the film concatenated with itself three times, watch both joins at normal speed and frame by frame):
```
printf "file 'CTA_Brain_Aneurysm_Silent.mp4'\nfile 'CTA_Brain_Aneurysm_Silent.mp4'\nfile 'CTA_Brain_Aneurysm_Silent.mp4'\n" > output/loop3.txt
ffmpeg -f concat -safe 0 -i output/loop3.txt -c copy output/loop_check_3x.mp4
node tools/stills.js build/seam.png 59.95 59.9667 59.9833 0 0.0167 0.0333 --scale 2 --cols 6
```
(Some platforms add a gap or re-encode when they loop a file; the picture and the WAV stems themselves are seamless.)

Optional checks: `node tools/smoke.js` (player test; needs Playwright Chromium), `node tools/qa_motion.js` (motion
scan), `node tools/sync_qa.js` (picture–sound sync), `node tools/audio_qa.js` (audio numbers), `node tools/proxy.js`
(a 720×1280 proxy for the skill's `film_gate.py`), `node tools/stills.js out.png 0 12 24.6 47.4 52.2 --scale 2`.

## The seamless loop

The film opens **already moving**: a close-up of the aneurysm with the camera orbiting it clockwise (−0.11 rad/s,
seen from above). The ending (54–60 s) moves closer to the reconstructed vessels while the CTA look (ivory volume
rendering) dissolves into the anatomical look (red arteries) on the **same meshes in the same orientation**; the orbit
continues clockwise and is steered with Hermite keys whose values and slopes at 60 s equal those at 0 s (azimuth,
elevation, distance, target), so position, orientation and angular velocity all match at the join. The contrast has
washed out of the brain arteries again by 56.2 s (frame 0 has none), the lighting and pixel grid never change, and
nothing fades, freezes, flashes or cuts. The score's bar 25 resolves into bar 1 (a pre-swell rings across the join
into the low pulse of frame 0), and every tail wraps.

Measured on the native frames: frame 3599 → frame 0 changes 0.7 % of the pixels with a mean luma change of 0.21 —
the same as every neighbouring step of the orbit (0.6–0.7 %, 0.20–0.23). Measured on the WAVs: the step across the
join is smaller than the median sample step around it (full mix 0.0053 vs 0.015).

## Scenes (60 s, 24 micro-scenes, 6 sequences)

| | Time | What happens |
|---|---|---|
| **A** | 0–1.5 | The aneurysm: a closed, blood-red sac bulging from the MCA bifurcation; the camera already orbits clockwise. |
| | 1.5–3 | Pull back: the branching cerebral arteries around it. |
| | 3–4.5 | The brain closes in around the arteries (translucent); the head appears as a see-through rim (with hair). |
| | 4.5–6 | The patient on the CT table, the head in the gantry; the camera leaves the bore and swings beside the body. |
| **B** | 6–8 | The power injector pushes amber contrast down the tubing into the IV cannula; the vein under the skin of the right forearm turns amber from the cannula up. |
| | 8–10 | The arm dissolves into the inside of its vein: red cells, wall rings streaming past, the camera catches up with a soft amber cloud of contrast. |
| | 10–12.5 | Out of the vein into the chest: superior vena cava, right atrium, right ventricle (steel blue) fill amber; heartbeats. |
| | 12.5–15 | Pulmonary arteries branch through the lungs; pulmonary veins return to the left heart. |
| | 15–17 | The left ventricle pushes the contrast into the aortic arch (red → amber). |
| | 17–20 | Up the carotid and vertebral arteries into the brain: the MCA and the aneurysm fill. |
| **C** | 20–22 | The scanner appears around the head; the cover is cut away; the rotor spins up carrying the X-ray tube and, opposite it, the curved multi-row detector; the body dissolves to the scan plane. |
| | 22–24 | Beam on with the tube on top: the fan crosses the head; rays that miss it stay bright, the head casts a shadow on the detector elements. |
| | 24–26 | Close-up, two photon paths: one through brain tissue, one through the iodine-filled aneurysm, where most photons are absorbed — its detector cell stays dim. |
| | 26–28 | Each detector element lights up with what it receives; the shadow profile changes as tube and detector turn together. |
| | 28–31 | Helical acquisition: the table moves the head through, the focal spot traces a helix, measurement patterns stream into the data volume. |
| **D** | 31–34 | Back-projection: the measurements are smeared back across the image plane 1, 2, 4 … 72 times (a blur), then filtering sharpens it into an axial CT image. |
| | 34–37 | Axial slices line up in depth. |
| | 37–39.5 | The slices become a volume of voxels: a blocky skull, opened toward the camera, with blocky vessels inside. |
| | 39.5–42 | Soft tissue and bone are thresholded away; the bright arteries remain and smooth into the vascular rendering. |
| **E** | 42–46 | The 3D CTA tree: up the internal carotid, past the circle of Willis, toward the MCA (the aneurysm still hidden behind branches). |
| | 46–50 | A three-quarter orbit reveals the neck and the sac (47.4 s): the radiologist's eye finds it. |
| | 50–54 | An oblique CT plane unfolds through the sac's centre; the 3D vessels in front open away, the round bright section lines up with the 3D sac (the dark Sylvian cistern around it), then the plane folds away. |
| **F** | 54–57 | The same vessels turn from the CTA rendering back into living, red arteries. |
| | 57–60 | The orbit completes and meets frame one. |

## How it is made: genuine 3D, native pixel art

The skill ships Three.js r160 for WebGL scenes; this film needs a deterministic, pixel-exact render in plain Node
(no browser, no GPU) with a palette-locked pixel-art output, so it uses its own small software 3D renderer
(`src/07_r3d.js`): perspective cameras, near-plane clipping, a z-buffer, per-vertex lighting with rim and specular,
**palette ramps with ordered (Bayer) dithering** between steps, two-ramp dithered blends (blood → iodinated blood by
the contrast's arrival time at each vertex), screen-door translucency (the "see-through" brain, head and voxels),
clip planes (the gantry cutaway, the axial cut, the MPR opening), perspective-correct textured quads (the CT images),
depth fog, and one-pixel same-hue outlines from an object-ID buffer. The organic shapes (the aneurysm region of the
artery tree, brain with lobes, fissures and gyri, heart, lungs, head, the body under its sheet, the gantry housing)
are signed-distance fields meshed by marching tetrahedra; vessels, veins and machine parts are procedural meshes.
Everything is built once and reused, so the patient, the arteries and **the one aneurysm** are the same objects in
every scene. The CT data (axial slices, sinogram, filtered back-projection with a Shepp–Logan kernel, the MPR plane,
the voxel meshes, the detector intensity profiles) is computed from that same 3D anatomy.

## Colour code

| Colour | Means |
|---|---|
| Red `#D45A59` (with darker/lighter steps) | arteries, the left heart, oxygenated blood; the aneurysm wall |
| Steel blue `#42627C` | veins and the right heart (the order of the circulation reads by colour) |
| Amber `#E7B969` | iodinated contrast — a concentration in the blood, never on the wall, never glowing |
| Cyan `#6BC7D7` | X-rays (the explanatory fan beam and photons), detector readings, measurement data |
| Ivory `#E9F1F0` / greys | the CTA volume rendering and the CT images (a brain/vessel window, not calibrated HU) |
| Navy `#101827` `#18283D` | the background and the digital space |

## The machine (what the picture keeps honest)

- The X-ray tube and the curved multi-row detector sit opposite each other on the rotor disc and turn **together**
  around the patient; the collimator blades shape the fan. The rotation is shown in slow motion (a real rotor turns in
  about 0.3 s). The tube is on top exactly when the beam switches on (22.2 s) and during the photon close-up.
- The detector does not see "an image": each element measures how many photons got through along its ray. The
  element brightness is computed from the projections of the same head, so the head's shadow — and how it changes
  with the angle — is real data from this film's anatomy.
- Iodine only absorbs more X-rays; it does not emit anything. In the close-up, photons crossing the iodine-filled sac
  are absorbed (they simply stop), so that path's detector cell stays darker than the tissue path's.
- Projections are patterns, never finished slices; the slices come from the reconstruction (back-projection blurs,
  the filter sharpens), the volume from the slices, the vessels from the volume by removing bone and soft tissue.
- Identification is a person's act: the camera finds the aneurysm and confirms it on an independent oblique plane; no
  text, marker or auto-diagnosis appears.

## Sound design

- **Score** (`src/30_audio.js`, synthesised sample by sample): 100 BPM, D minor (Dm9 – B♭maj7 – Gm9 – A7sus4 colours),
  soft analog pads, a gentle digital pulse, minimal sub-bass, sparse soft percussion, glassy shimmer, and one quiet
  four-note "signal" motif on glass (D–A–F–E) at the opening and at the discovery. The sections follow the film:
  almost only pad and pulse for the hidden aneurysm, a heartbeat-like soft kick for the circulation, a precise
  sixteenth pulse that builds for the scanner, crystalline arpeggios for the reconstruction, opening pads for the
  discovery, thinning back into bar 1.
- **SFX** (63 cues, each from the event table that also drives the picture, `src/03_clock.js`): the aneurysm's low
  pulse at 0:00, whooshes for the camera's big moves, the injector servo, plunger click and fluid, soft ticks of cells
  in the vein, heartbeats, the lung branching, the aortic flow, the gantry motor spinning up, beam-on, detector ticks
  per photon and soft absorptions, measurement blips, the helical sweep, compute tones per reconstruction step, slice
  clicks, the volume aligning, the vessels rising, the discovery chord, the plane's swish, a confirmation, and the
  pre-swell into the loop. They are explanatory sonification and kept understated (blood flow, X-rays and computation
  make no such sounds in reality).
- **Levels**: full mix −22.0 LUFS, true peak −3.6 dBTP; music-only −23.2 LUFS; SFX-only −25.5 LUFS (same gain).
  Per-bar levels are even (about −25 to −27 dBFS RMS) with accents only on the opening pulse, the heartbeat into the
  aorta and the discovery.

## QA (numbers, not a listening or viewing test)

- **Shot list** — `storyboard_lint`: yellow only (scenes 1–4 are 1.5 s each, the brief's micro-scene timing; they
  are one continuous camera move with no narration).
- **Motion** — `qa_motion.js` at 30 fps: no still windows ≥ 0.5 s; blue-purple frames 0.1 %; no hard cuts (every
  change of world is a 0.35–0.5 s dissolve). The only frames above the 55 % "jump" threshold are at 47.1 s, where a
  vessel sweeps past the lens just before the aneurysm is revealed (a camera event, kept on purpose).
- **Loop** — native frames: the 3599 → 0 step equals the neighbouring steps (above). The film concatenated with
  itself three times (a 30 fps proxy, 5,400 frames, 180 s): at both joins (60 s and 120 s) the step changes 0.6 % of
  the pixels, the same as the median of the ten steps around it (0.6 %), and the frames on either side show one
  continuous clockwise orbit. Audio: the join is smaller than the local sample steps in all three stems.
- **Sync** — `sync_qa.js`: 63 event times, all on the 60 fps frame grid; all 63 SFX start on their event frame;
  41 percussive onsets measured on the SFX stem: median 0.65 ms from their event (the soft 40 ms attack of the pulse
  at 0:00 is the largest, 20 ms).
- **Audio** — `audio_qa.js`: 49 of 63 cues are within 6 dB of the music or louder in their strongest octave band
  (the rest are deliberately soft textures: cell ticks, swells, the pre-swell).
- **Film gate** — the skill's `film_gate.py` on a 720×1280 / 30 fps proxy: **passed** (green on every gate).
  Blue-purple frames 0.0 %; fast-motion frames 48.9 % (worst 30 s window 44 %); no still frames; 7.8 visual events
  per 10 s, longest gap 6.6 s; dead background 3.1 %; no fixed page frame; 5 push-ins per minute, none faster than
  0.5 s.

## Self-review against the skill's six failure modes

1. **Slide-deck feel** — no frames, pages or bullet text; one picture event per micro-scene; camera moves vary
   (orbit, pull-back, slide, push, dive, dissolve) and come back out after going in; the end is an action on the main
   object (the orbit returning to the aneurysm), not a closing card.
2. **Copying a demo** — composition, characters and models are new and built for this subject.
3. **No concrete object** — every row of the shot list names a concrete object and what it does (the sac, the
   injector, the vein, the heart, the tube, the photons, the detector, the planes, the voxels).
4. **Dead background / empty frame** — the subject fills the frame in every scene; the background changes with the
   world (body interior, room, digital space); no empty or blank frames (`qa_motion` still windows: none).
5. **Real material drawn in code** — none was supplied; the CT images are computed from the film's own anatomy.
6. **AI look** — one style and one palette throughout (no blue-purple gradients, no neon, no glow), no cartoon faces
   (the patient's face is never shown: whenever the camera is near the head it is a see-through rim, otherwise the
   head is far away or hidden by the gantry).

No separate reviewer agent was used for this project. The medical and physical content follows standard CT
angiography and CT physics; specific numbers in the notes above were not re-checked against online sources.

## Files

`src/00_core.js` frame buffer, palette, maths · `02_pal.js` palette notes · `03_clock.js` beat grid, scene table,
event table · `05_fx.js` paths · `07_r3d.js` the 3D pixel renderer · `08_geo.js` mesh builders · `09_sdf.js` SDF
primitives and marching tetrahedra · `10_anat.js` the patient (arteries and aneurysm, brain, head, body, heart, lungs,
veins, contrast timing) · `11_scanner.js` the CT scanner, table, injector · `12_ctdata.js` CT values, slices, MPR,
sinogram, back-projection, voxels · `20_assets.js` meshes and material ramps · `21_cam.js` camera paths ·
`23_scenes.js` the 24 scenes, transitions and the loop · `30_audio.js` score, SFX, mixing · `40_player.js` player ·
`tools/` build, export (variants), mastering, QA scripts.
