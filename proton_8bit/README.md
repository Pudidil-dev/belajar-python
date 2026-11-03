# How Proton Therapy Machines Work — pixel-art scientific animation (code project)

**How a proton therapy machine works, and how a particle accelerator targets a tumour**, in 72 seconds and 28
micro-scenes grouped in 7 continuous sequences, 9:16, original 16-bit pixel art in a Kurzgesagt-style flat-science
grammar (scale travel: the gantry room → the facility → one hydrogen atom → the cyclotron → the beamline → the gantry
→ the nozzle → tissue → water molecules → the Bragg peak → the treatment plan → DNA → back to the gantry), rendered
entirely in code (HTML5 Canvas 2D and JavaScript), with an original electronic soundtrack and SFX synthesised sample
by sample in the same JavaScript. No narration, no subtitles, only short English labels. The model is a
cyclotron-based facility with pencil beam scanning (no synchrotron). It is an educational model: time is compressed
or slowed down where labelled, sizes are not to scale, and the values are illustrative.

- `index.html` is a self-contained player: open it in a browser (click to play, arrows to seek, M to mute). It
  synthesises the soundtrack in a few seconds after the first frame appears.
- `tools/export.js` renders the MP4 (the MP4 is not in the repository: render it on your machine, below).
- `镜头表.md` is the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 4,320 frames (72.000 s). H.264, yuv420p, BT.709. The 360×640 logical canvas is upscaled ×3 with nearest-neighbour, so every pixel stays crisp. |
| Audio | Original electronic score at 120 BPM (36 bars = 72.000 s), E minor, plus 187 SFX read from the same event table as the picture. AAC 48 kHz stereo, mastered to −15 LUFS with the true peak at −1.75 dBTP. |
| Loop | The last scene pulls back to the opening composition (the gantry, the covered patient, the lights going idle): the last frame is identical to frame one, and every note or tail that runs past 72 s wraps to 0:00. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy (mastering)

```
cd proton_8bit
node tools/export.js                  # full MP4 -> output/proton_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 0 3.4 18.2 24.4 54.6 71.2 --scale 2   # check any frames
```

No browser is needed for the export: the picture (about 36 ms per frame in Node, under 3 minutes for all frames) and
the soundtrack (about 8 s) are both computed in Node. To check the result:
```
ffprobe output/proton_8bit.mp4
ffmpeg -i output/proton_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 4,320 frames, an integrated loudness around −15 LUFS and a true peak below −1 dBTP.

Optional checks (need Playwright Chromium, `npm i playwright && npx playwright install chromium`, only for the first):
`node tools/smoke.js` (player test), `node tools/qa_motion.js` (motion scan), `node tools/sync_qa.js` (picture–sound
sync), `node tools/audio_qa.js` (audio numbers, after an `--audio-only` export), `node tools/proxy.js` (a 720×1280
proxy for the skill's `film_gate.py`).

## The hook (0–4 s)

No title, no fade-in: the machine, the patient, the tumour and the Bragg peak are all on screen within three seconds.
- **0.0 s** the treatment room seen from the foot of the couch: the giant gantry ring around a patient lying under a
  blanket, the nozzle pointing down at them.
- **0.25–1.0 s** the gantry powers up (its lights come on one by one, a deep activation sound) and the camera rushes
  in toward the treatment head.
- **1.0–2.0 s** the body turns see-through: a cross-section of the abdomen with the spine, kidneys, liver, bowel and
  an orange-red tumour in front of the spine. A target reticle locks on (**TUMOR TARGET**), the beam axis lines up.
- **2.25–3.0 s** one proton leaves the nozzle (a fast zip), enters the body and deposits energy more and more often as
  it slows (ticks that speed up); it stops inside the tumour on beat 3 (a controlled, round impact).
- **3.0–4.0 s** the dose along its track is drawn as a ribbon around the beam axis: thin at the entrance, widest at
  the end, nothing beyond. **THE BRAGG PEAK**.

## Scenes

| # | Time | Scene | Label | What happens |
|---|---|---|---|---|
| A | 0–4 | the hook | | |
| 1 | 0–1 | The giant machine | — | the gantry around the patient powers up; fast push toward the nozzle |
| 2 | 1–2 | Reveal the tumour | TUMOR TARGET | the body turns see-through; reticle and beam axis |
| 3 | 2–4 | Protons stop in tissue | THE BRAGG PEAK | one proton slows, ionises more and more, stops in the tumour; its dose ribbon |
| B | 4–12 | where the protons come from | | |
| 4 | 4–6 | Behind the treatment room | CYCLOTRON | the room box shrinks into thick shielding; the facility plan: treatment room, beam line, cyclotron vault |
| 5 | 6–8 | The hydrogen source | HYDROGEN | fast push into the ion source at the cyclotron's centre: hydrogen atoms (one proton, one electron each) |
| 6 | 8–10 | Create the protons | H+ = PROTON | a fast discharge electron knocks the atom's electron away: a bare proton is left |
| 7 | 10–12 | Injection into vacuum | VACUUM CHAMBER | an electric field draws the protons through the source's slit into the near-empty vacuum chamber |
| C | 12–25 | the particle accelerator | | |
| 8 | 12–14 | Inside the cyclotron | PARTICLE ACCELERATOR | top view, lid off: magnet, copper coil, two hollow electrodes, the gap, the source; the field and the RF switch on |
| 9 | 14–17 | RF electric acceleration | RF ELECTRIC FIELD | the gap and the proton together: the field flips; at every crossing it points along the motion and the energy steps up |
| 10 | 17–20 | Magnetic bending | MAGNETIC BENDING | force at 90° to the motion; side view of the poles; the energy stays flat inside the electrodes (NO ENERGY GAIN) |
| 11 | 20–23 | Repeated acceleration | HIGH-ENERGY PROTONS | time-lapse: the spiral widens to the edge, many proton bunches, the energy staircase rescales |
| 12 | 23–25 | Beam extraction | BEAM EXTRACTION | the deflector peels the outer orbit off; the beam leaves the cyclotron on the downbeat of bar 13 |
| D | 25–36 | controlling the beam | | |
| 13 | 25–28 | The energy degrader | ENERGY SELECTION | HIGHER ENERGY → graphite degrader → LOWER ENERGY: the protons come out slower |
| 14 | 28–30 | The energy selection system | ENERGY SELECTOR | a magnet fans the energies apart; the slit stops the others; one band goes on |
| 15 | 30–33 | Quadrupole focusing | BEAM FOCUSING | two lanes (horizontal, vertical): Q1 focuses one plane and defocuses the other, Q2 the reverse; the pair focuses both |
| 16 | 33–36 | Dipole steering | BEAM STEERING | the beam turns along the curved beamline; force at 90° to the motion |
| E | 36–45 | the treatment gantry | | |
| 17 | 36–39 | The rotating gantry | ROTATING GANTRY | the gantry turns once, smoothly, to its planned angle and locks |
| 18 | 39–42 | Position verification | IMAGE GUIDANCE | two X-ray exposures; today's image against the planned position; the couch corrects; ALIGNED |
| 19 | 42–45 | The treatment nozzle | PENCIL BEAM SCANNING | cutaway: X and Y scanning magnets, beam monitors, snout; the spot moves on every eighth note |
| F | 45–60 | the Bragg peak | | |
| 20 | 45–48 | Protons enter tissue | PROTON PENETRATION | nearly straight tracks with a little scatter; LOW DOSE, NOT ZERO at the entrance |
| 21 | 48–51 | Proton–atom interactions | IONIZATION | slow motion among water molecules: the proton's charge pulls electrons out; ions are left |
| 22 | 51–54 | The proton slows down | ENERGY LOSS INCREASES | the ionisations come closer and closer together as it slows |
| 23 | 54–57 | The Bragg peak | BRAGG PEAK | it stops (downbeat of bar 28); zoom out: many protons build the depth-dose curve with its peak in the tumour |
| 24 | 57–60 | Energy controls depth | CONTROLLED DEPTH | the curve turns into a graph (TISSUE DEPTH, RELATIVE DOSE); LOWER ENERGY → SHALLOWER RANGE, HIGHER ENERGY → DEEPER RANGE |
| G | 60–72 | 3D tumour treatment | | |
| 25 | 60–63 | Select a depth layer | DEPTH LAYER | the tumour in the plan as depth layers; one layer is selected and its energy set |
| 26 | 63–67 | 3D pencil beam scanning | 3D PENCIL BEAM SCANNING | spot by spot the dose fills the deepest layer, the energy steps down to the next, until the dose covers the tumour |
| 27 | 67–70 | DNA damage | DNA DAMAGE | a secondary electron breaks one strand; it ionises water into a ·OH radical that breaks the other |
| 28 | 70–72 | Final machine reveal | HOW PROTON THERAPY WORKS | pull back from the dosed tumour to the gantry; recap PROTON → ACCELERATOR → MAGNETS → BRAGG PEAK → TUMOR DOSE; back to frame one |

Honesty chips, one at a time: BEAM INVISIBLE IN REALITY, NOT TO SCALE, SIMPLIFIED: TWO ELECTRODES, TIME COMPRESSED,
PLANNED IN ADVANCE, SLOW MOTION, ILLUSTRATIVE VALUES, EFFECTS DEVELOP OVER TIME.

## Colour code

Deep navy ground; the machine metallic white, silver and dark grey; protons luminous cyan; electrons small yellow; the
RF electric field alternating cyan arrows; magnetic fields thin purple lines and ⊗ marks; the tumour orange-red;
normal tissue soft red and pink; deposited energy and dose orange-yellow; the patient's blanket pale grey-blue;
shielding concrete grey.

## Sound design

**Music.** 120 BPM, 36 bars = 72.000 s exactly (the brief asks for about 118 BPM; 120 BPM gives a whole number of
bars in 72 s and puts every eighth note on an exact frame). E minor (Em–C–G–D), ending on an E-major chord. One motif,
the **proton launch**: a rising E-minor arpeggio that speeds up as it climbs (quarter, dotted eighth, sixteenth,
eighth, sixteenths) and lands on the high E — a particle gaining speed. It changes instrument with the story (bright
lead at the gantry, glass bells in the gas, plucks and a saw lead in the cyclotron, marimba at the degrader, bells
in the molecules, E major at the end). The cyclotron groove puts a bass note on every beat, the beat of the RF kicks;
a spiralling square arpeggio climbs through each chord like an orbit growing; the time-lapse doubles the arpeggio and
rolls the snare into the **first climax on the downbeat of bar 13 (24.0 s, the beam leaves the cyclotron)**. The
degrader drops the groove to half time (the beam slows); the energy selector gets a band-passed arpeggio; the gantry a
heavy groove. In the molecular slow motion the whole band is low-passed, then the filter opens as the proton slows
into the **second climax on the downbeat of bar 28 (54.0 s, the Bragg peak)**; a sixteenth of silence before each
climax. The planning scenes get digital arpeggios; a riser carries bar 36 back into bar 1.

**SFX** (187 cues, all read from the event table `EV` in `src/03_clock.js`, the same table that draws the picture):
the gantry's deep activation and status blip, the scan of the see-through body, a three-beep target lock, the zip of
one proton, five interaction ticks that speed up and a controlled stop; whooshes for the scale changes, an industrial
hum, the cyclotron reveal; the dive into the gas, a fast-electron buzz, the ionisation click, the bare proton's
bell, the extraction field and four injection pulses; the magnet's hum and the RF switching on; **an RF zap on every
one of the 30 gap crossings, one scale step higher each time (more energy)**; the high-voltage deflector and the exit
sweep; 9 graphite ticks falling in pitch and the slow-down; the energy fan, three slit knocks and the clean selected
band; three focusing tones that glide together and meet in unison; the deep dipole sweep; the gantry's servo whine
and its lock; two X-ray buzzes, a comparison beep, the couch's move, ALIGNED; 8 scanning clicks; 11 entry puffs; 14
ionisation clicks that come faster and faster; the deep Bragg-peak impact with a warm chord, the time-lapse of many
protons, the curve's glide and the peak's chime; the graph's two glides; the plan's select, energy set, 30 scanning
ticks pitched by layer, two layer steps and the covered chord; two DNA strand snaps, the radical's blip, a low
dissonance for the lesion; five recap pops and an E-major completion chord. The band ducks under the important cues.
Microscopic and radiation processes are not audible in reality: this is educational sound design.

## QA (numbers, not a listening test)

- **Sync** (`node tools/sync_qa.js`): 187 event times, all on the 60 fps frame grid (154 on the eighth-note grid, the
  rest on the twelfth-second grid of the fast clusters); 187 SFX cues, every one starting on its event's frame;
  measured onsets of 140 percussive cues on the SFX stem: median 0.02 ms, max 2.81 ms from their event (one frame =
  16.67 ms).
- **Audio** (`node tools/audio_qa.js`): −15.01 LUFS, true peak −1.75 dBTP; 30.7 % of the energy below 120 Hz; bar
  levels follow the story (hook −14.1 dB, climaxes −14.6 and −13.3 dB, the slow motion −22.6 dB, the DNA bar −23.3 dB,
  the finish −15.0 dB); loop seam step 0.0000 (seamless). 186 of 187 SFX cues sit at or above the music in their
  strongest band (median +11 dB); the exception is the industrial hum under the facility reveal (−9.5 dB), a quiet
  ambience bed on purpose.
- **Motion** (`node tools/qa_motion.js`): no still window of 0.5 s or more, no hard cut (every change of scale is a
  0.35–0.4 s crossfade), blue-purple frames 0.2 %.
- **Film gate** (the skill's `film_gate.py` on a 30 fps proxy): passed, 28.9 % fast-motion frames; longest still 0.25
  s; dead background 0.088. One yellow: **push-ins about 10.8 per minute** — this is a scale-travel film (room →
  facility → atom → cyclotron → beamline → gantry → nozzle → tissue → molecule → plan → DNA), and every push into a
  smaller scale is answered by a pull back out (scenes 4, 8, 11, 17, 23, 28); push-ins are 48 % of the zoom events.
- **Shot list lint**: yellow only — scenes 1 and 2 are 1 s each (the hook, by design).
- **Player** (`node tools/smoke.js`): plays, pauses, seeks, no console errors. **Loop**: the last frame and frame one
  differ in 0.00 % of their pixels.

## Science notes (what the picture keeps honest)

- Protons come from hydrogen: a hydrogen atom is one proton and one electron; removing the electron leaves a bare
  proton (H+). Nothing is created from nothing. (The ion source's gas is molecular hydrogen; the film shows atoms to
  keep one proton per atom on screen.)
- The **RF electric field gives the energy**: the energy staircase steps up only at the gap crossings and stays flat
  inside the electrodes, where the field is shielded. The field flips between crossings, so it always points along
  the proton's motion when it crosses. The **magnetic field only bends**: the force is at 90° to the motion (drawn
  with a right-angle mark), so it changes the direction, never the speed. Field into the picture (⊗) and positive
  charge give a counter-clockwise orbit, as drawn. The orbit radius grows with the square root of the energy.
- Real therapy cyclotrons have more electrodes and shaped magnet sectors (chip: SIMPLIFIED: TWO ELECTRODES); the real
  acceleration lasts microseconds over hundreds of turns (chip: TIME COMPRESSED).
- The degrader only slows (higher energy in, lower energy out); the selector magnet spreads the energies and the slit
  keeps one band. Each quadrupole focuses one plane and defocuses the other; a pair focuses both. Dipoles steer.
- The gantry turns once to its planned angle before the beam (it does not spin during irradiation); X-ray images are
  compared with the plan and the couch corrects the position: targeting comes from planning and imaging, the beam
  does not find the tumour by itself.
- In tissue the protons lose energy mainly to atomic electrons (ionisation), not by head-on collisions with nuclei;
  the loss per step grows as they slow (the ionisations crowd together), and they stop at about the same depth. The
  **Bragg peak is the dose of many protons**, not an explosion; before it the dose is low but not zero, beyond it
  almost none. One peak cannot cover a tumour: the energy sets the depth layer by layer, the scanning magnets set the
  spot positions.
- DNA damage: a secondary electron breaks one strand directly; it also ionises water, making a hydroxyl radical that
  breaks the other strand (both strands broken = a serious lesion). The effects on cells develop over time, and
  normal tissue is not immune (low dose at the entrance, LOW DOSE, NOT ZERO).
- The beam is invisible in reality; the tracks and glows are explanatory.
- Values are illustrative (no MeV numbers on screen); the sources were not re-checked online for this build.

## Self-review against the skill's six failure modes

1. **Slide deck:** no page frame or bullet list; every scene is a picture event with a different camera move (fast
   push, hold, pan, pull back); the end lands on the machine itself, with the recap and title over it for under 2 s.
2. **Copied demo:** compositions and drawings are made for this subject; no demo assets.
3. **No concrete object:** every row of the shot list names one object doing one thing (gantry, atom, electrodes,
   degrader, slit, quadrupoles, nozzle, water molecules, tumour layers, DNA).
4. **Dead background:** the background changes with every scale; dead background 0.088, flat empty 0.073 (film gate).
5. **Drawing what has real footage:** no real footage was supplied; the illustrative style is intended.
6. **AI look:** one style and one palette throughout, no blue-purple gradients (0.2 % of frames), no faces on
   particles (the proton carries a + sign), no people's faces (the patient is under a blanket, no staff).

No separate reviewer agent was used: the checks above are the scripts' numbers and my own frame-by-frame review of
contact sheets.

## Files

- `src/00_core.js` pixel buffer, palette, rasterisers, masks, easing, camera · `01_font.js` pixel fonts ·
  `02_pal.js` noise, splines, helpers · `03_clock.js` BPM grid, scenes, **event table** · `05_fx.js` paths ·
  `06_draw.js` proton/electron sprites, field marks, arrows
- `src/10_room.js` the treatment room (gantry, nozzle, X-ray imaging, couch, the patient, the cross-section) ·
  `11_plant.js` the facility plan (cyclotron and its orbit model, beamline elements, gantry room) · `12_atom.js` the
  ion source · `13_nozzle.js` the nozzle cutaway · `14_tissue.js` tissue tracks, dose, molecules · `15_plan.js` the
  graph, the 3D plan, DNA · `16_ui.js` in-picture instruments
- `src/23_scenes.js` the compositor (cameras, crossfades, hook overlay, tags) · `24_overlay.js` captions, chips,
  title · `30_audio.js` score and SFX · `40_player.js` the player
- `tools/` build, export, mastering, stills, QA scripts
