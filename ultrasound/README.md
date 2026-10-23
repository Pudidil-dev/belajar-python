# How Ultrasound Machines Work

A 50-second 8-bit pixel-art explainer of how an ultrasound machine makes a live image. It opens on the result and
works backward to how the image was made.

The first frame is an ultrasound monitor with a live image of a fetus. The fetus lifts its hand to its face and kicks,
its heart flickers, and a refresh line sweeps across the fan once per beat. The camera punches into the image until its
grain shows, then pulls back through the screen to the machine and follows the cable down to the probe on the belly.
From there the film follows one pulse of sound:

1. the probe, its cutaway fan under the skin;
2. into the probe: the curved row of piezoelectric crystal elements;
3. an electric pulse makes them deform and ring for 2–3 cycles, which sends one short pressure pulse out;
4. why gel: without it, an air gap bounces 99.9% of the sound back; with it, the sound gets in;
5. the pressure wave in tissue, particles bunching and spreading;
6. echoes at every tissue boundary along one scan line through the fetal skull;
7. the same crystals listening: echo → squeeze → voltage;
8. the receiver trace: time of flight gives depth, echo size gives brightness;
9. the fan filled line by line until the fetus appears.

It ends on the same monitor shot it opened with, so the video loops.

- 1080×1920 vertical, 60 fps, exactly 50 s, H.264 + AAC stereo.
- Every frame is drawn at 270×480 and upscaled 4× with nearest-neighbour. One limited palette with 4×4 ordered
  dithering keeps the pixels crisp.
- Motion follows the Kurzgesagt grammar:
  - flat two-tone shading;
  - cutaways;
  - a pause before diving into an object, then a log-scale zoom;
  - a pull-back after every push-in;
  - glow only on things that carry a signal.
- No narration and no subtitles. Labels sit next to the thing they name, plus a short scene caption.
- The score and sound effects are synthesized in code with no samples:
  - a 120 BPM electronic groove in A minor, with the beat from frame 0;
  - one chord loop and one hook that every scene re-orchestrates;
  - a held breath before the crystals fire;
  - a build while the image assembles;
  - a last bar that resolves and runs into the opening impact.

The finished film is `output/How_Ultrasound_Machines_Work.mp4`.

## The ultrasound image is computed

`engine/lib/us.js` builds the B-mode image the way the machine does, from a model of the body:

- **The slice.** A sagittal slice through a pregnant abdomen at about 15 weeks, in body centimetres:
  - skin, fat with thin connective-tissue septa, fascia and abdominal muscle;
  - the uterine wall and amniotic fluid;
  - the placenta on the posterior wall;
  - the fetus: skull with brain and choroid plexus, face profile with nasal bone, spine, heart, stomach, an arm with
    its bones, and two legs.
- **Acoustics.** Each tissue has an acoustic impedance Z (MRayl) and a backscatter strength. Bone also absorbs strongly.
- **Scan lines.** A convex probe (face radius 4 cm, 60° sector, 12 cm deep) fires 96 scan lines. Along each line:
  - every boundary returns a specular echo, R = (Z₂ − Z₁)/(Z₂ + Z₁), times what is left of the pulse;
  - the pulse loses (1 − R²) at every boundary and is absorbed in bone;
  - speckle comes from scatterers fixed in each tissue. It moves with the fetus, and it widens with depth like a real
    beam.
  - The beam is a few lines wide, so the shadow behind a thin bone is soft-edged.
- **Display.** The echo amplitude is log-compressed (48 dB) to a gray level, then scan-converted per screen pixel into
  the fan, so it stays sharp at any zoom.
  - Fluid has no scatterers, so it is black.
  - Bone is bright and casts a shadow.
- **Motion.** The fetus moves on 5 s and 0.4 s cycles (hand, kick, heartbeat at 150 per minute), so the 50 s film
  loops exactly.
- **The live display.** Lines are acquired in sweeps of one beat (0.5 s). Each line shows the moment it was acquired,
  quantized to 1/30 s.

The same model drives everything:

- the monitor;
- the cutaway under the probe (the same slice drawn as a flat illustration);
- the echo column in scene 5: depths from scan line 28, and reflections computed from the impedances;
- the receiver trace in scenes 6–7: the model's echo amplitude along line 28;
- the gray scan line;
- the line-by-line build.

Numbers on screen and where they come from:

| On screen | Source |
|---|---|
| 1540 m/s, 13 µs per cm | soft-tissue sound speed; round trip 2/1540 m/s |
| 70 µs → 5.4 cm | the skull's depth on line 28 × 13 µs/cm |
| 99.9% bounces back | air (Z ≈ 0.0004) against the probe face (Z ≈ 1.5): R² ≈ 0.999 |
| 0.4%, 1%, <0.1%, 0.2%, 0.2%, 32% | R² at skin, fat, muscle → uterus, uterus → fluid, fluid → fetal skin, fetal skin → skull |
| 3.5 MHz, 30 frames/s | the probe's frequency; 96 lines × 156 µs ≈ 15 ms per frame |

Shown in slow motion and not to scale, with a note on screen:

- the piezoelectric deformation, exaggerated;
- the wavelength;
- the speed of sound, slowed about 1,000,000×.

## Files

- `镜头表.md` — the shot list: 17 shots, the physics fixed for the whole film, the style lock.
- `engine/` — the renderer:
  - `index.html`, `film.js` (timeline, dissolves);
  - `lib/` (pixel pipeline, bitmap font, camera, captions, `us.js` the B-mode model, `room.js` the scan room and the
    monitor, `probe.js` inside the transducer);
  - `scenes/` (one file per scene).
- `tools/`:
  - `render.py` (frames, stills, contact sheets, cue sheet);
  - `synth_audio.py` (score and SFX);
  - `caption_audit.py` (reading time of every text);
  - `text_check.py` (text collisions);
  - `video_diffs.py` (frame-to-frame change).
- `审片/` — the independent review and what was done about each finding.
- `output/` — the delivered film and its delivery note.

```sh
uv run --with playwright==1.56.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score.wav build/loudness.png
uv run --with playwright==1.56.0 --with pillow python tools/render.py --out build/film.mp4 --audio build/score.wav --fps 60
```
