# How Antibiotics Actually Kill Bacteria — 2D pixel-art scientific animation (code project)

**How amoxicillin inhibits bacterial cell-wall synthesis.** A 60-second, 9:16, seamless-loop scientific animation in
clear, colourful 2D 16-bit pixel art: a rod-shaped Gram-positive bacterium bursts; a capsule is swallowed, dissolves
in the stomach, its drug crosses the gut lining into the blood and seeps out of a capillary toward bacteria; inside a
growing bacterium, enzymes build the cell-wall precursor, carry it across the membrane and add it to a growing glycan
strand; a penicillin-binding protein (PBP) joins neighbouring peptide stems into cross-links; then an amoxicillin
molecule enters the same active site, the enzyme's serine opens the drug's four-atom beta-lactam ring and stays
bound, new strands stay unlinked, remodeling enzymes keep cutting, the wall weakens, turgor pushes the membrane out and
the cell tears open — and the camera glides on to the next bacterium, which is where the film began.

**No on-screen text of any kind** (no titles, labels, numbers, formulas, HUD, logos or watermark) and no narration:
shapes, motion, colour, cause and effect and sound carry the explanation, and the mix leaves room for a voiceover.
Revised on request: **2D pixel art instead of 3D models** (clearer), with **brighter, more saturated colours and crisp
pixels** (no blur, no soft glow).

- `index.html` — a self-contained player: open it in a browser (click to play, ←/→ to seek, M to mute). Playback
  loops seamlessly, picture and sound. (The scene name under the player is navigation only, not part of the film.)
- `tools/export.js` — renders the MP4 files (they are not in the repository: render them on your machine, below).
- `镜头表.md` — the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920, 60 fps, exactly 3,600 frames (60.000 s), H.264 High, yuv420p, BT.709. The 360×640 pixel-art frame is upscaled ×3 with nearest-neighbour, so every pixel stays a crisp 3×3 block. |
| Audio | Original subtle futuristic cinematic ambient score, 120 BPM (half-time feel), 30 bars of 2 s = 60.000 s, E minor, plus 84 scientific SFX read from the same event table as the picture. AAC 256 kbit/s, 48 kHz stereo. Full mix −22.0 LUFS integrated, true peak −2.9 dBTP (a quiet bed for a later voiceover). |
| Loop | A true loop: frames 0…3599 are unique samples at t = f/60 of one continuous cyclic motion; frame 3599 is the moment just before frame 0, not a copy of it. Every sound that runs past 60 s wraps to 0:00. |

## Render it yourself

Requirements: **Node ≥ 18**, **ffmpeg** with libx264, **Python 3** with **numpy** and **scipy** (mastering).

```
cd antibiotic_8bit
node tools/export.js                      # everything: the picture once, then all four MP4 variants + three WAVs
```

That writes:

| File | Sound |
|---|---|
| `output/Antibiotics_Molecular_Mechanism_Cinematic.mp4` | music + SFX (the cinematic version) |
| `output/Antibiotics_Molecular_Mechanism_No_Music.mp4` | SFX only — no background music |
| `output/Antibiotics_Molecular_Mechanism_No_SFX.mp4` | music only — no SFX |
| `output/Antibiotics_Molecular_Mechanism_Silent.mp4` | no audio track (silent video master) |
| `output/audio/Antibiotics_Molecular_Mechanism_Full_Mix.wav`, `…_Music_Only.wav`, `…_SFX_Only.wav` | 24-bit / 48 kHz stems |

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
The picture is rendered **once** (about 25–50 ms per frame in Node, so roughly 2–3 minutes for 3,600 frames plus the
x264 encode) and kept as `build/video.mp4` with a fingerprint of the engine sources; asking for another variant later
only re-muxes it in seconds. No browser and no GPU are needed. The three audio renders take about 10 s.

All three audio versions are mastered with **one common gain** (set so the full mix reaches −22 LUFS), so the
music-only and SFX-only versions are exactly as loud as they sit inside the full mix (−23.8 and −25.6 LUFS on their
own). The music-only version has no ducking (there are no SFX to make room for).

Check a result:
```
ffprobe output/Antibiotics_Molecular_Mechanism_Cinematic.mp4                    # 1080x1920, 60 fps, 3600 frames
ffmpeg -i output/Antibiotics_Molecular_Mechanism_Cinematic.mp4 -af ebur128=peak=true -f null -   # about -22 LUFS
```
Check the loop (the film concatenated with itself three times; watch both joins at normal speed and frame by frame):
```
printf "file 'Antibiotics_Molecular_Mechanism_Silent.mp4'\nfile 'Antibiotics_Molecular_Mechanism_Silent.mp4'\nfile 'Antibiotics_Molecular_Mechanism_Silent.mp4'\n" > output/loop3.txt
ffmpeg -f concat -safe 0 -i output/loop3.txt -c copy output/loop_check_3x.mp4
node tools/stills.js build/seam.png 59.95 59.9667 59.9833 0 0.0167 0.0333 --scale 2 --cols 6
```
(Some platforms add a gap or re-encode when they loop a file; the picture and the WAV stems themselves are seamless.)

Optional checks: `node tools/smoke.js` (player test; needs Playwright Chromium), `node tools/qa_motion.js` (motion
scan), `node tools/sync_qa.js` (picture–sound sync), `node tools/audio_qa.js` (audio numbers), `node tools/proxy.js`
(a 720×1280 proxy for the skill's `film_gate.py`), `node tools/stills.js out.png 0 21 35 45.2 54.8 --scale 2`.

## The seamless loop

The bacterium that bursts at the start is **the next bacterium**, not the hero. The tissue world runs on cyclic time
(the first 4.6 s are the continuation of 56–60 s), so at 58.4 s the camera settles into a clockwise orbit around that
cell at a constant angular speed (with slower parallax planes behind it) and simply keeps orbiting through the join.
Its wall is already weakened at 59.3 s, a small membrane bulge starts at 59.6 s and keeps growing through 0:00; it
tears at 0.95 s. Every environmental motion (cells drifting, ribosomes jiggling, fibres, specks, drug molecules) is
periodic over 60 s. Nothing is repaired, reversed, faded, frozen, flashed or cut at the join; the hero cell that lysed
at 54.75 s and its debris are never in view during the opening seconds. The score's bar 30 (Em9) resolves into bar 1
(Em9), a pre-swell rings across the join into the low throb of frame 0, and every tail wraps.

Measured on the native frames: frame 3599 → frame 0 changes 1.23 % of the pixels — the same as the neighbouring steps
(1.21–1.23 %). On the film concatenated with itself three times (30 fps proxy, 5,400 frames): both joins change 2.17 %
of the picture, the median of the steps around them is 2.16 %.

## Scenes (60 s, 30 scenes of 2 s, 8 sequences)

| s | sequence | what happens |
|---|---|---|
| 0–2 | A hook | a rod bacterium's weakened wall: its membrane bulges through the gap, tears open (0.95) and the contents drift out (1.2) — the camera already orbiting clockwise |
| 2–4 | | the burst cell among intact neighbours; its contents spread through the tissue fluid as the camera backs away |
| 4–6 | | match cut from a rod bacterium's silhouette to an amber-and-cream capsule (4.3); it slips past the lips (4.75), is swallowed (5.2) and a peristaltic bulge carries it down the esophagus |
| 6–8 | B the drug's journey | in the stomach fluid it splashes in (6.2), its shell softens (6.6) and splits (7.1), freeing a cloud of amber drug molecules |
| 8–10 | | intestinal villi: the molecules settle on a villus tip and cross the lining cells (9.3) into the capillary loop beneath |
| 10–12 | | a small vessel: red blood cells and free drug molecules stream along in the plasma |
| 12–14 | | a capillary wall: the molecules seep out through a cleft between two endothelial cells (12.7) and diffuse into the tissue (13.4) |
| 14–16 | C the envelope | the hero bacterium grows longer (14.2) and a band of new wall forms around its middle (15.2) |
| 16–18 | | a cutaway: the wall lifts off (16.2), then the membrane (17.0), showing the layers over the green cytoplasm |
| 18–20 | | scale travel into the wall: the peptidoglycan mesh — glycan strands of alternating sugars, gold peptide stems, some bonded across |
| 20–22 | D wall biosynthesis | Mur ligases add L-Ala, D-Glu, m-DAP and D-Ala-D-Ala to UDP-MurNAc, one bead at a time |
| 22–24 | | MraY: the precursor docks (22.4), phospho-MurNAc-pentapeptide moves onto the lipid carrier (Lipid I, 23.0), UMP leaves (23.3) |
| 24–26 | | MurG: UDP-GlcNAc arrives (24.5), its GlcNAc joins the MurNAc (Lipid II, 25.0), UDP leaves (25.3) |
| 26–28 | | MurJ turns the head group over, from the inner face to the outer face of the membrane (26.4–27.3) |
| 28–30 | | a glycosyltransferase adds the disaccharide-pentapeptide to the end of the growing strand (29.0) and frees the carrier (29.4) |
| 30–32 | | the carrier sheds one phosphate (30.4) and flips back inside (31.0); the camera pulls back to the growth zone (31.6) |
| 32–34 | E normal wall building | a purple PBP slides to a donor stem and binds (33.3) |
| 34–36 | | its active-site serine attacks D-Ala4 (34.5), the terminal D-Ala leaves (35.0): the acyl-enzyme (35.4) |
| 36–38 | | an acceptor stem bends in (36.5), its m-DAP amine takes the donor: a cross-link forms (37.0); the enzyme lets go (37.4) |
| 38–40 | | pull-back: cross-links form at other PBPs one after another (38.4, 38.9, 39.4) |
| 40–42 | | amoxicillin molecules drift down through the mesh (diffusing, never homing) |
| 42–44 | F inhibition | fast push: one settles into the PBP's cleft (42.5) and the enzyme closes around it (43.3) |
| 44–46 | | the serine attacks the beta-lactam carbonyl (44.6), the C7–N4 bond breaks — the ring opens (45.0) — and stays bonded to the serine (45.4): the PBP turns orange-rimmed |
| 46–48 | | the blocked PBP: the next donor stem leans in (46.5) and cannot react (47.2); the other PBPs are inhibited too |
| 48–50 | | pull-back: a new unit is still added to the strand (48.4) but its stems stay unlinked, dangling (49.0) |
| 50–52 | | remodeling hydrolases cut six old cross-links in one patch (50.3–51.8); the patch comes apart (51.6) |
| 52–54 | G failure | scale travel back out: the hero cell's wall thins (52.3), turgor pushes the membrane out through the weak patch (53.2) |
| 54–56 | | fast push: the bulge tears (54.75) and the contents flow out (55.1) — a tear and an outflow, never an explosion |
| 56–58 | H the loop | the camera glides past the debris (56.3) to a second bacterium under strain (57.2) |
| 58–60 | | the clockwise orbit begins (58.4); its weakened wall gives (59.3), a small bulge starts (59.6) — the opening frame |

## How it is made: native 2D pixel art in code

Everything is drawn procedurally into one 360×640 frame buffer (no images, no 3D), with 16-bit shading: a base colour,
a light rim facing the upper left, a shadow rim facing the lower right and a same-hue dark outline, all as flat colour
(no blur, no soft glow). Five worlds, each with its own 2D camera (log-scale zoom, eased moves):

- **Tissue** (25 nm units): bacteria are drawn per pixel from a capsule distance field, so one drawing covers every
  state — the thick cyan wall, the turquoise membrane, the green cytoplasm with ribosomes and the nucleoid, a weakened
  red-orange patch, the gap, the membrane bulging through it, the tear, the emptying cell, the band of new wall and the
  lifted cutaway layers. Behind them: host-tissue cells and collagen fibres on slower parallax planes.
- **Body** (mm): a see-through profile (oral cavity, tongue, pharynx, esophagus with a peristaltic bulge, stomach with
  rugae and fluid, gut coils, spine), no face details; the capsule (amber cap, cream body).
- **Gut** (µm): villi with tall lining cells, nuclei, a brush border, the capillary loop and the central lacteal.
- **Blood** (µm): a vessel with endothelial cells, biconcave red cells, platelets and free drug molecules.
- **Molecules** (0.1 nm): a textbook cross-section — cytoplasm, the membrane bilayer, the growth zone, six mature
  peptidoglycan layers. Sugars are hexagons (GlcNAc teal, MurNAc light cyan), residues are gold beads (the terminal
  D-Ala pair paler), enzymes are shaded protein blobs, and amoxicillin is its real 2D skeleton (penam core: the
  four-atom beta-lactam ring fused to the thiazolidine ring, the gem-dimethyl and carboxylate, the amide side chain with
  its alpha-amino group and the 4-hydroxyphenyl ring), drawn twice life size so it reads next to the residue beads.

Scale jumps are ordered-dither dissolves (crisp pixels throughout); the rod-to-capsule change at 4.3 s is a match cut.

## Colour code

| colour | means |
|---|---|
| deep charcoal navy | the ground (outside the cell, tissue fluid) |
| bright turquoise / cyan | peptidoglycan: the wall; sugars teal (GlcNAc) and light cyan (MurNAc) |
| turquoise (deeper, greener) | the cytoplasmic membrane |
| soft golden yellow | peptide stems (the terminal D-Ala-D-Ala paler) |
| purple | the penicillin-binding protein; inhibited: purple with a restrained orange rim |
| warm amber-orange | amoxicillin (solid, never glowing) |
| green | the cytoplasm and its contents |
| warm red-orange | damage: the weakened wall, cut bonds |
| lime / steel blue / rose | other enzymes: Mur ligases / MraY, MurG, MurJ, the glycosyltransferase, the phosphatase / wall hydrolases |
| olive / pale / grey | the lipid carrier / phosphate / the nucleotide handles (UDP, UMP) |

## The science (what the picture keeps honest)

- One generalized, actively growing, amoxicillin-susceptible, rod-shaped Gram-positive bacterium (no species named):
  a thick peptidoglycan wall around the membrane and **no outer membrane**. Cross-links are drawn as direct 4→3 bonds
  (D-Ala4 of a donor stem to m-DAP3 of an acceptor stem).
- Glycan polymerization (the glycosyltransferase) and cross-linking (the PBP's transpeptidase) are separate steps by
  different enzymes. The drug blocks only the transpeptidase step.
- Amoxicillin reaches the PBPs on the **outer face** of the membrane and never crosses it; it drifts and diffuses (no
  homing); it never cuts wall bonds and never pushes the membrane.
- Normal reaction: the serine attacks the D-Ala4 carbonyl, D-Ala5 leaves, an acyl-enzyme forms, the acceptor amine
  takes it to form the cross-link, the enzyme is released. Inhibition: the same serine attacks the beta-lactam
  carbonyl carbon (C7), the C7–N4 bond breaks (the ring opens) and C7 stays bonded to the serine — a long-lived
  acyl-enzyme; the next donor cannot react.
- Remodeling hydrolases keep cutting while new cross-links are missing; a local weak patch forms; turgor pushes the
  membrane out; the cell **tears** and its contents flow out (no explosion).
- Antibiotics act on bacteria, **not viruses**; the film shows no dose, no dosing schedule and no clinical claim.
  Time is compressed and sizes are schematic (beads, sugars and the drug are enlarged for legibility).

## Sound design

An original score, mixed low: soft analog pads, a minimal sub, a gentle digital pulse, sparse soft half-time
percussion and glassy shimmer, in E minor (Em9 – Cmaj7 – Am9 – B7sus4; a darker Fmaj7#11 while the enzyme is
blocked). One four-note motif (E–B–G–F# on glass) marks the burst at 0:00, returns bright on the assembly line (bar 11),
low when amoxicillin arrives (bar 21) and broken off after three notes at the lysis (bar 28). The 84 SFX are read from
the event table that draws the picture, so each starts on the frame of its event: the bulge's throb, the membrane
tearing, the outflow, the swallow, the splash, the shell softening, the drug dissolving, absorption ticks, a heartbeat,
seeping, growth, weaving, the cutaway, molecular clicks for each amino acid, docking latches, the transfer, small pops
as UMP, UDP, D-Ala and phosphate leave, the flippase turning over, the chain growing, the serine's precise attack,
bonds forming, the airy drift of the drug, the four-note ring opening, a low covalent lock, an interrupted clunk when
the donor is blocked, an unresolved interval for the unlinked stems, hydrolase snips, creaks of strain, the rising
bulge and the soft rupture. No gunshots, no lasers.

## QA (numbers, not a listening or viewing test)

- **Shot list** — `storyboard_lint`: yellow only (the palette contains the purple the brief names for the PBP — one
  enzyme object, never a background).
- **Motion** — `qa_motion.js` at 30 fps: no hard jumps; blue-purple frames 0.0 %; two near-still half-seconds
  (35.6 s and 42.9 s), both inside the planned stable close-ups of the reaction where only small parts move.
- **Loop** — native frames and the 3× concatenated proxy: the join step equals the neighbouring steps (above).
  Audio: the step across the join is smaller than the median sample step in all three stems.
- **Sync** — `sync_qa.js`: 84 event times, all on the 60 fps frame grid; all 84 SFX start on their event frame;
  42 percussive onsets measured on the SFX stem: median 0.29 ms from their event, max 10.8 ms (under one frame).
- **Audio** — `audio_qa.js`: 78 of 84 cues are within 6 dB of the music or louder in their strongest octave band
  (the rest are deliberate soft textures: ambience, absorption ticks, the low tension drone).
- **Film gate** — the skill's `film_gate.py` on a 720×1280 / 30 fps proxy: **passed** — fast-motion frames 29.9 %,
  no blank frames, blue-purple frames 0.0 %. One yellow: about 22 push-ins per minute (14 within 0.5 s). The film is
  built on scale travel (zooming through an object into the next world) and the detector also counts the expanding
  rings that mark reaction steps; push-ins are balanced by pull-backs (54 % push-ins), and only two pushes are meant
  as fast accents (the drug settling in at 42.5 s, the tear at 54.75 s).
- **Player** — `smoke.js`: plays, seeks and loops with no console errors.

## Self-review against the skill's six failure modes

1. **Slide-deck feel** — no frames, pages or bullet text; one picture event per scene; camera moves vary (orbit,
   pull-back, pan, slow push, fast push, dive, dissolve) and come back out after going in; the end is an action on the
   main object (the next cell giving way), not a closing card.
2. **Copying a demo** — composition, characters and models are new and built for this subject.
3. **No concrete object** — every row of the shot list names a concrete object and what it does.
4. **Dead background / empty frame** — the subject fills the frame in every scene; the background changes with the
   world and keeps drifting (parallax tissue, specks, solvent particles); no empty or blank frames.
5. **Real material drawn in code** — none was supplied; everything is an explanatory drawing.
6. **AI look** — one style and one palette throughout (no blue-purple gradients, no neon, no glow, no blur), no faces
   (the body is a see-through silhouette), no characters with faces on molecules.

No separate reviewer agent was used for this project. The biology follows standard textbook descriptions of
peptidoglycan biosynthesis and beta-lactam action; specific details were not re-checked against online sources.

## Files

`src/00_core.js` frame buffer, palette, rasterisers, masks, camera · `02_pal.js` helpers, colour-code notes ·
`03_clock.js` beat grid, scene table, event table · `05_fx.js` paths · `06_draw.js` world-space drawing helpers ·
`10_micro.js` the tissue world (bacteria per pixel, lysis, cutaway, host tissue, drug dots) · `11_body.js` the body,
gut and blood worlds · `12_mol.js` the molecular cross-section (wall, membrane, proteins) · `13_story.js` PBPs, donor
and acceptor stems, the transpeptidation · `14_path.js` the precursor pathway (Mur ligases, MraY, MurG, MurJ, GT,
carrier recycling) · `15_amox.js` amoxicillin, inhibition, hydrolases · `16_molworld.js` the molecular composition and
camera · `23_scenes.js` worlds, cameras, transitions and the loop · `30_audio.js` score, SFX, mixing · `40_player.js`
player · `tools/` build, export (variants), mastering, QA scripts.
