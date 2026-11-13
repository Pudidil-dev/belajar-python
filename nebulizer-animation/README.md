# How a Nebulizer Turns Liquid Into Mist

A 20-second looping, vertical medical-science short in 8-bit/16-bit pixel-art game style, with an original chiptune
and synced sound effects. One continuous camera move follows the aerosol path:

1. **0–3 s, hook.** A patient in side profile is already breathing in through a transparent mask, with a handheld
   vibrating-mesh nebulizer attached. Mist streams from the outlet into the mask. After 0.8 s the camera rushes
   upstream against the mist. It goes through the connector and flies through the outlet rim into a cutaway of the
   device. The white cloud breaks up into pixel droplets. On 3.0 s the camera lands on one mesh hole just as a droplet
   pinches off, with a single "tik".
2. **3–15 s, the mechanism.** The camera eases back to show the whole mechanism:
   - the liquid reservoir on the left, the amber piezoelectric ring, the thin mesh in the middle, the outlet on the
     right;
   - the drive board and battery below.

   The mesh buzzes while the housing stays still. Then the camera pushes into three neighbouring tapered holes and
   locks there. At each hole the liquid forms a tip, the neck narrows and the drop pinches off. The holes take turns
   on every beat, and the droplets build into a spray.
3. **15–20 s, back out.** The camera follows one droplet downstream and pulls back:
   - the full spray, then the same outlet rim and connector;
   - the patient breathing in, as the droplet is inhaled.

   The last frame lands on the first one, so the video loops.

![storyboard](docs/storyboard.png)

## Render it yourself (copy-paste)

You need Python 3.9+ and git. ffmpeg comes from the `imageio-ffmpeg` package, so you don't have to install it
separately (a system ffmpeg on PATH is used if you have one).

```bash
git clone -b claude/tes-45y4ej https://github.com/Pudidil-dev/belajar-python.git
```

The working directory is the `nebulizer-animation` folder inside the clone:

```bash
cd belajar-python/nebulizer-animation
```

Install:

```bash
pip install -r requirements.txt
```

Preview (optional, a half-size 540×960 check). It takes about 45 s on a 4-core laptop and writes
`output/preview.mp4`:

```bash
python render.py --preview
```

Render the final film. It takes about 1–2 minutes on a 4-core laptop:

```bash
python render.py
```

**Output:** `belajar-python/nebulizer-animation/output/How_a_Nebulizer_Turns_Liquid_Into_Mist.mp4`. It is
1080×1920, 30 fps, exactly 20.0 s, H.264 video with stereo AAC audio (48 kHz). The soundtrack stems are written next to
it: `music.wav`, `sfx.wav` and `mix.wav`.

With [uv](https://docs.astral.sh/uv/) instead of pip, there's nothing to install into your Python:

```bash
uv run --no-project --with numpy --with pillow --with imageio-ffmpeg python render.py
```

On Windows, use `py render.py` if `python` is not on PATH.

**Options**

| Command | What it does |
|---|---|
| `python render.py --preview` | quick half-size check → `output/preview.mp4` |
| `python render.py --no-label` | leaves out the tiny "VIBRATING MESH" tag (5.4–8.4 s) |
| `python render.py --fps 60` | 60 fps (smoother zooms, twice the frames) |
| `python render.py --scale 8` | 2160×3840 (4K vertical) |
| `python render.py --from 8 --to 15` | only a slice of the film |
| `python render.py --stills 0,3,12` | full-size PNG frames in `output/stills/` |
| `python render.py --sheet 0:20:1` | one contact sheet of the whole film in `output/sheet.png` |
| `python render.py --audio-only` | only the soundtrack (music, effects, mix) |
| `python render.py --no-audio` | silent video |
| `python render.py --jobs 2` | fewer CPU cores (the default uses all) |

## Format and style

- **Format.** 1080×1920 (9:16 for Shorts, Reels and TikTok), 30 fps, exactly 20.0 s. Stereo audio in sync.
- **Loop.** The camera, the breath (4 s cycle, mid-inhale on 0 s), the mist and the music all repeat exactly every
  20 s. The frame just before 20 s matches frame 0 (mean difference 0.003/255), and the audio is rendered as a
  circle, so echo and reverb tails from the last bar flow into the first.
- **No title card, no narration, no subtitles.** The only text is a tiny "VIBRATING MESH" tag in the mechanism shot.
  `--no-label` removes it.
- **Picture.** Every frame is drawn in code on a 270×480 canvas and scaled exactly 4× with nearest-neighbour.
  - The world is modelled in millimetres and re-rasterized at every zoom level. The zoom runs from the patient's face
    at 2 px/mm to one mesh hole at 3400 px/mm. Pushing in reveals new detail (holes, menisci, droplet necks) instead
    of stretching a sprite.
  - 16-bit look: 6–10-tone ramps, Bayer dither anchored to the world, 1-px outlines, section hatching, SNES-style
    colour-math transparency for the mask and the mist.
  - Palette: the skill's `navy` set. The background is a flat navy (#0D1B2A, hue ≈211°, outside the blue-purple
    zone). The device is light gray, the medicine and the mist are cyan, and the piezo and its drive glow are amber.
- **Sound.** Everything is synthesized in code, with no samples and no audio files.
  - **Voices.** Band-limited square/pulse lead, NES-style triangle bass, LFSR noise drums, SNES-style echo, FM bells.
  - **Score.** 120 BPM in G major, ten bars of 4/4 = 20 s. The hook is G | D, the mechanism groove Em | C, the build
    Am→D, the payoff theme G | Em | C–D, and the half-time float Em–C | Am–D7 turns back into bar 1.
  - **Loudness.** The mix is −14 LUFS with true peak below −1 dBTP.

## Shot by shot

120 BPM: a bar is 2 s, and every hit sits on the 8th-note grid.

| Time | Picture | Sound |
|---|---|---|
| 0–0.8 | Hook. The patient is mid-inhale through the transparent mask. Mist pours from the outlet through the connector toward the nose and mouth. | Soft breath and a light "fsssh", the hook melody |
| 0.8–3.0 | Reverse zoom against the mist: connector → outlet rim (the rim grows around the camera and opens into the cutaway) → the plume → the mesh. The cloud resolves into pixel droplets. It lands on one tapered hole, where a tip grows and pinches off on 3.0 s. | A quick rising arcade whoosh, a "fwump" through the rim; the music stops 2.875–3.25 so that one crisp **tik** lands alone on the beat |
| 3–5 | The droplet zips away. The camera eases back to the whole mechanism. | A descending swoosh, then the groove comes back in |
| 5–8.5 | Mechanism: amber drive pulses run up the wires, the piezo ring squeezes, the mesh buzzes (jitter, smear and tick marks). Liquid touches the mesh on the left, and spray streams to the right toward the mask. The housing stays still. | A soft rhythmic buzz under the music, 16th-gated with the drive glow; a tiny typewriter tick for the tag |
| 8.5–9.75 | Push into three adjacent holes. The buzz slows into slow motion (the time-dilation clock). | A rising whoosh; the buzz pitch falls with the slow motion |
| 9.75–15 | Locked on three holes. A wave runs down the mesh, and the holes take turns: tip, neck, pinch-off, recoil. One droplet per beat (upper, middle, lower, …), and the droplets build into a spray. | A staggered pixel pop on every beat (D6 / B5 / G5), the payoff theme |
| 15–20 | The middle hole's droplet pinches off on 15.0, and the camera follows it downstream while pulling back: the full spray, the cloud, out through the same outlet rim and connector. The droplet is inhaled as the patient breathes in, landing on frame 0. | A bright pop with a sparkle, a long descending whoosh that settles into the steady spray hiss, the breath, a tom fill back into bar 1 |

**The science.** In a vibrating-mesh nebulizer, a ring of piezoelectric ceramic is bonded to a thin metal mesh. The
mesh is a domed aperture plate with about a thousand tapered holes, wide on the liquid side and a few micrometres wide
at the exit. When the drive voltage makes the ring vibrate (~100+ kHz), the mesh moves back and forth against the
medicine. Each stroke pushes liquid through the holes, a short jet forms at every exit, and it breaks off into a
droplet. The result is a fine liquid aerosol, not steam or smoke, and the patient inhales it through the mask.

The film slightly exaggerates the motion for readability:
- it plays the vibration in slow motion and staggers it as a wave across neighbouring holes;
- it draws the exit holes and drops about twice their real size (~9–10 µm instead of 3–5 µm).

## Files

- `render.py`: the command line (film, preview, stills, contact sheets, audio only).
- `engine/`:
  - `timeline.py`:
    - the camera flight (zoom as ln z, centre as a function of zoom), so the way in and the way out pass the same rim;
    - the slow-motion clocks (`sigma`, `mu`);
    - the breath, the rim portal, and all event times for the soundtrack.
  - `view.py`, `gfx.py`, `palette.py`, `pixfont.py`: the world camera (mm → canvas), signed-distance helpers, the
    pixel kit, ramps and the bitmap font.
  - `person.py`: the patient (profile, eye, ear, hair, hand on the handle, sleeve) and the transparent mask with its
    port, seal, strap and side vent.
  - `device.py`: the nebulizer, outside and cut open with one shared geometry. That covers the reservoir cup, lid,
    head, mesh cap, outlet, handle, button and LEDs, plus the piezo ring, washer, mesh dome, O-rings, drive board,
    battery and wires.
  - `micro.py`: the mesh up close (tapered holes, the travelling wave, tip → neck → pinch-off, recoil) and the droplet
    population.
  - `mist.py`: the cloud. It is fractal noise carried by the flow, octaves appear with zoom, and it loops seamlessly.
  - `fx.py`: background motes, the hero droplet's glint, the tag.
  - `scenes.py`: what is on screen when (exterior, cutaway, the rim portal between them).
  - `audio.py`, `synth.py`: the score, the sound effects, the circular mix and the master.
- `镜头表.md`: the shot list (style lock, palette, six shots).
- `docs/storyboard.png`: one frame per beat.

## Checks run on this project

The final 1080×1920 film was not rendered here. The commands above produce it. These checks were run on test slices
and a half-size QA preview:

- **Pipeline.** A 1-second full-resolution slice encodes as H.264 1080×1920 at 30 fps, with stereo AAC at 48 kHz.
  Video and audio durations match.
- **Motion and content gate** (the skill's `film_gate.py` on the half-size preview): all green.
  - Fast-motion frames: 42%.
  - No near-empty frames.
  - Blue-purple background: 0%.
  - No fixed page frame, no crossfades, and 3 push-ins per minute.
- **Loop.** The frame at 19.9999 s equals frame 0, and the audio wraps with no click at the seam.
- **Determinism.** The same instant rendered twice is pixel-identical.
- **Audio.**
  - The mix is −14.0 LUFS with a true peak of −1.2 dBTP.
  - The level before the tik (2.80–2.98 s) is −27 dB, so the tik stands alone.
  - The mesh buzz sits about 8 dB under the music.
- **Shot-list lint** (`storyboard_lint.py`): green.
