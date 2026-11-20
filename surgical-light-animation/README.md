# Surgical Light, Fully Functional

A 32.5-second looping vertical short about how a surgical light works and what its light does to an operation. It is
built in 3D and drawn as 8-bit pixel art, with a bright, catchy chiptune soundtrack and sound effects tied to every
event on screen. It follows the client's brief:
- the hook shows the operation for one second from the side;
- then the camera turns up to the lamp and goes straight into how it works, one function per bar of music;
- each function is shown on the operation itself: the lamp's face, the rays, the hands' shadows, a head in the way, the
  lit spot, the room, the heat, the monitor.

The camera comes back to the opening shot at the end, and the last frame runs straight into the first. No game elements
and no narration: clean captions in English name the things on screen.

the operation from the side (1 s) → up to the lamp's face → **LED lights, each with a lens → all aimed at one spot →
hands in the light: soft shadows → sensors shift the power → brightness → warm + cool LEDs mix the colour → field size
→ endo mode → the heat goes up, the hands stay cool → the sterile handle and its camera → the spring arm** → back to
the opening shot → the loop starts again.

![storyboard](docs/storyboard.png)

- **Format.** 1080×1920 (9:16 vertical), 30 fps, exactly 32.5 s (13 bars of 4/4 at 96 BPM), H.264 video with 48 kHz
  stereo AAC. The default export is **`out/surgical-light-animation.mp4`**, relative to this folder.
- **Look: 3D, drawn as 8-bit pixel art.**
  - **Real 3D.** The operating room is a 3D scene, ray-cast in code: one ray per pixel of a 270×480 canvas, which is
    then scaled exactly 4× nearest-neighbour.
  - **Lit by the lamp itself.** Each of the lamp's 34 LEDs is a spotlight aimed at the field, with its own shadow rays,
    so heads, arms and gloved hands cast real shadows. Soft light from the room fills in the rest.
  - **Drawn as pixel art.** Every pixel snaps to one fixed palette of 89 colours: the nearest colour, with a light 4×4
    ordered dither only where two shades meet. Dark 1-px outlines mark where one object meets another, as in hand-made
    pixel art.
  - **2D pixel effects on top:** the rays of light in the air, the glow of the LEDs and the lit field, the sensors'
    dashed scan lines and their detection ring, the heat specks, and the captions.
- **The room.**
  - Two surgeons in teal gowns, caps and masks work at the patient, who lies under teal drapes with a window of
    prepped skin.
  - A vital-signs monitor's green trace beats with the music, and a second monitor hangs on a ceiling boom.
  - The lamp hangs from the ceiling on its suspension: mount, axis, extension arm, spring arm and yoke. A sterile
    handle sits in the middle of its face.
- **The light's effects, shown on the operation.**
  - Rays from every LED meet in one bright pool on the field.
  - Under one LED alone, a hand held over the field throws a hard, dark shadow. As the other LEDs come back on from
    all round the lamp, the shadow breaks up, goes pale, and almost disappears.
  - A head in the way: the sensors' scan lines stop at it, the LEDs it blocks dim, and the others brighten.
  - The pool brightens step by step, turns from warm to cool white, and grows from small to wide. The whole room dims
    in endo mode while the monitor shows the keyhole camera.
  - A heat view shows the top of the lamp hot and the hands and the field cool.
  - The monitor shows the picture from the camera in the handle.
  - When the lamp is pulled to a new place, the spot of light goes with it.
- **Captions.** White pixel text with a thin line to the object it names, typed on and gone a couple of seconds
  later. There is never more than one at a time, and they always stay clear of a phone app's buttons and caption area.
- **Loop.** The film starts and ends on the same shot of the operating room. The surgeons' hands, the heart monitor's
  trace and every idle motion repeat exactly once per loop, the soundtrack wraps round, and the heart monitor beeps
  across the loop point. `python render.py --loops 3` writes the loop three times back to back (97.5 s).

## Render it yourself

Working directory: **`belajar-python/surgical-light-animation`** (this folder). You need Python 3.9 or newer and git.
ffmpeg comes from the `imageio-ffmpeg` package in `requirements.txt`; a system ffmpeg on PATH is used if you have one.

Clone (skip if you already have the repo):

```bash
git clone -b ccr-90de552e-iir9tw https://github.com/Pudidil-dev/belajar-python.git
```

If you cloned it earlier, update it instead (run inside `belajar-python`):

```bash
git pull origin ccr-90de552e-iir9tw
```

Go to the project:

```bash
cd belajar-python/surgical-light-animation
```

Install the dependencies (numpy, Pillow, imageio-ffmpeg):

```bash
pip install -r requirements.txt
```

If pip refuses with an "externally-managed-environment" error, make a virtual environment first, then run the
`pip install` again:

```bash
python -m venv .venv
```

```bash
source .venv/bin/activate
```

(On Windows: `.venv\Scripts\activate`.)

Preview (540×960, fast encode, written to `out/surgical-light-animation-preview.mp4`):

```bash
python render.py --preview
```

Render the film (1080×1920, 30 fps, H.264 + stereo AAC):

```bash
python render.py
```

The film is written to **`out/surgical-light-animation.mp4`**. The music, effects and mix are written next to it as
WAV stems (`out/music.wav`, `out/sfx.wav`, `out/mix.wav`). Every frame is ray-cast, so the full render takes about
8 minutes on a 4-core machine (the preview takes as long: the frames are the same, only the encode is
smaller). With [uv](https://docs.astral.sh/uv/) instead of pip, no install step is needed:

```bash
uv run --no-project --with numpy --with pillow --with imageio-ffmpeg python render.py
```

On Windows, use `py render.py` if `python` is not on PATH.

**Options**

| Command | What it does |
|---|---|
| `python render.py --sheet 0:32.5:1` | one contact sheet of the whole film in `out/sheet.png` (start:end:step, seconds) |
| `python render.py --stills 0.5,8.0,26.6` | full-size PNG frames in `out/stills/` |
| `python render.py --from 5 --to 9` | only a slice of the film |
| `python render.py --fps 60` | 60 fps |
| `python render.py --scale 8` | 2160×3840 (4K vertical) |
| `python render.py --loops 3` | also `out/surgical-light-animation-loop3x.mp4`: the seamless loop played 3 times (any N) |
| `python render.py --audio-only` | only the soundtrack (music, effects, mix) |
| `python render.py --no-audio` | the picture without sound |
| `python render.py --out PATH` | a different output file (or folder, for stills and audio) |
| `python render.py --jobs 2` | fewer CPU cores (the default uses all) |

### Render configuration

`render.json` holds the defaults; command-line flags override them.

| Key | Default | Meaning |
|---|---|---|
| `output` | `out/surgical-light-animation.mp4` | where `python render.py` writes the film |
| `fps` | `30` | frame rate |
| `scale` | `4` | pixel size: the 270×480 canvas × 4 = 1080×1920 |
| `crf`, `preset`, `tune` | `16`, `medium`, `animation` | x264 quality, speed and tuning |
| `audio_bitrate` | `256k` | AAC bitrate |
| `loudness_lufs` | `-14.0` | integrated loudness of the mix (true peak is kept below −1 dBTP) |
| `preview` | 2× scale, `veryfast`, crf 20 | the `--preview` settings and output path |

## The film, beat by beat

96 BPM: a bar is 2.5 s. Every sound effect is timed from `engine/timeline.py`, the same clock that drives the picture.

| Time | Picture | Caption | Sound |
|---|---|---|---|
| 0–2.5 | **The operation**, from the side, under the light for one second; then the camera rises and turns up to the lamp's face. | | the heart monitor's beep on every beat over a soft pad; a rising rush; a glassy shimmer as the camera reaches the lamp |
| 2.5–5.0 | **The lamp's face**, seen from the front: rings of LEDs, each with its own lens, light up ring by ring. | LED LIGHTS · EACH WITH A LENS | a rising blip for each group of LEDs, one per 16th: the bar's tune |
| 5.0–7.5 | **One spot.** A ray leaves every LED; all of them meet in one bright pool on the patient. | ALL AIMED · AT ONE SPOT | a bright chord as the camera settles on the rays |
| 7.5–10.0 | **Hands in the light.** A surgeon holds a gloved hand over the field. Only one LED is left on: one ray, stopped by the hand, and a hard, dark shadow. Then the LEDs come back on, a group per 16th from all round the lamp; the shadow breaks up, goes pale and almost disappears. | HANDS IN THE LIGHT · SOFT SHADOWS | a soft rush as the hand comes up; a click as the other LEDs go off; a rising blip for every group that comes back |
| 10.0–12.5 | **Sensors.** The other surgeon leans right in under the lamp. The sensors' dashed scan lines stop at the head, and a ring marks it. The LEDs it blocks dim and the others brighten, so the field stays as bright. | SENSORS · SHIFT THE POWER | a soft rush; scanning pips, a two-tone beep when they find the head, a rising whirr as the power shifts |
| 12.5–15.0 | **Brightness** steps up on every beat, to full. | BRIGHTNESS · UP TO 160,000 LUX | a switch click and a rising note per step: the bar's tune |
| 15.0–17.5 | **Colour:** half the LEDs are warm white, half cool white; their mix steps from warm to cool on every beat. | WARM + COOL LEDS · MIX THE COLOR | a click and a brighter bell per step |
| 17.5–20.0 | **Field size:** seen from above and in front, the lit spot on the patient grows from small to wide. | FIELD SIZE · SMALL TO WIDE | the lens panel's servo whirr, a soft bloom |
| 20.0–22.5 | **Endo mode:** the lamp and the room go dim; the monitor shows the keyhole camera's picture. | ENDO MODE · DIM FOR KEYHOLE SURGERY | a power-down glide, a ping as the monitor lights; the music goes dim and muffled |
| 22.5–25.0 | **Heat view:** the top of the lamp glows hot and the heat rises away; the face of the lamp is cooler, and the hands and the field stay cool. | HEAT GOES UP · HANDS STAY COOL | a soft rising rush and a few crackles |
| 25.0–27.5 | **Sterile handle:** a surgeon reaches up and grips the handle in the middle of the lamp; the monitor switches to the camera inside it, looking down at the hands at work. | STERILE HANDLE · CAMERA INSIDE | a grip click, the camera's two beeps |
| 27.5–30.0 | **Spring arm:** the surgeon pulls the lamp to a new place; the spot of light goes with it and the arm holds it there; then it goes back. | SPRING ARM · STAYS PUT | ratchet clicks, a spring, a soft thunk as it holds; a tom run |
| 30.0–32.5 | **Back to the room:** the camera comes back to the opening shot of the operation. | | a falling rush; the heart monitor beeps again, into the loop |

## The science (as drawn)

- **Many sources, one spot.** A surgical light has dozens of LEDs, often grouped in modules or zones. Each has its own
  lens or reflector, all aimed at the same spot, and the beams overlap there into one light field. One evaluated light
  has 72 LEDs (six zones of 9 plus a central ring of 18); a patent describes 108 LEDs in 54 reflectors.
- **Soft shadows (shadow dilution).** The light comes from a face about 70 cm wide, from many directions at once. A
  hand or a head blocks only the beams it is in front of, and each of those is a small part of the light, so the field
  keeps the light of all the others: no hard shadow falls on it. With a single source, the same hand would throw a hard
  shadow, which is what the film shows first. The IEC standard for surgical lights tests this ("shadow dilution") with
  a mask that stands in for the surgeon's head.
- **Sensors.** Some lights have sensors that detect a head in the beam and shift power from the blocked zones to the
  others, so the light on the field stays the same.
- **Brightness.** The standard's upper limit for the light at the centre of the field is 160,000 lux, measured 1 m from
  the lamp; lights offer several brightness steps.
- **Colour.** The standard allows white light from 3,000 K (warm) to 6,700 K (cool), and asks for a colour rendering
  index above 85 so that tissue colours look true. Patents on surgical lights describe one way to adjust the colour:
  mixing LEDs of two different whites, warm and cold, in different proportions.
- **Field size.** The size of the light field can be changed by moving a panel of lenses closer to or further from the
  LEDs (closer spreads the light wider). Other designs tilt the outer emitters or switch between LED groups. One
  product's field goes from 17 to 25 cm; the film shows 20 to 30 cm.
- **Endo mode.** A dim setting for keyhole (endoscopic) surgery, when the team watches the camera's picture on a
  monitor.
- **Heat.** LEDs put far less infrared into the beam than halogen lamps did, which means less heat and less drying of
  exposed tissue. They still make heat, though, and the housing and its heat sink carry it away. Light from several
  overlapping lamps can still heat tissue, which is why the standard limits it.
- **Sterile handle and camera.** The centre handle lets the surgeon move the light without breaking sterility: it is
  detachable and sterilisable, or covered with a sterile cover. A camera can sit inside it.
- **Spring arm.** Springs in the arm balance the weight of the head, so it stays where it is left.
- **Simplified on purpose.**
  - The lamp has 34 LEDs in three rings; real heads have dozens, up to more than a hundred.
  - The rays are drawn as visible light in the air. In a real operating room the light is invisible in the air; you
    only see where it lands.
  - The bar-3 demonstration (one LED alone, then the groups coming back) is staged to show the principle; a real light
    does not do this.
  - The sensors' scan lines are drawn so you can see what the sensors do; real ones work with invisible light. The
    sensors and the handle camera are features of some lights, not all.
  - The heat view shows where the heat goes; it is an illustration, not a measurement.
  - Sizes and distances are close to real ones (a head about 70 cm across, about 90 cm above the field) but not exact.

Sources checked during this session (through web-search summaries; the pages themselves were not opened):
- [Maquet/Getinge flyer on the IEC standard](https://www.getinge.com/dam/hospital/documents/english/maquet-surgical-lights-iec-standard-flyer-en-global.pdf)
  (colour temperature range, colour rendering, the 160,000 lux limit, depth of illumination, shadow dilution)
- [Surgical lighting](https://www.wikipedia.com/wiki/Surgical_lamp) (definitions of the light-field measures)
- ECRI evaluations of the
  [Trumpf iLED 7](https://www.ecri.org/search-results/member-preview/hdjournal/pages/eval-trumpf-medical-iled-7/)
  (72 LEDs in zones, shifting power around obstructions, brightness steps, endo mode, a camera in the handle) and the
  [Amico iCE-30m](https://www.ecri.org/search-results/member-preview/hdjournal/pages/evaluation-amico-ice-30m-led-surgical-light/);
  [Hillrom](https://www.hillrom.com/en/products/iled-7-surgical-light) and
  [Baxter](https://support.baxter.com/en/products/iled-7-surgical-light/) pages on the iLED 7
- Patents:
  - [obstacle sensing](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10568181)
  - [a multi-source shadowless lamp](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7980738)
  - adjustable colour temperature in surgical lights:
    [surgical lamps and methods for illuminating operating sites](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9119668)
    and [an operating light and a process for lighting an operating table](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8783885)
    (the search summary described warm-white and cold-white LEDs mixed to set the colour temperature)
  - [spot size adjustment with a moving lens panel](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12601463)
  - [a counterbalanced arm](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5025359)
  - [a quick-release sterile handle](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4878156)
- [Mindray HyLED Q](https://www.mindray.com/en/products/surgical-lights/hyled-q-series) (a 17–25 cm light field)
- Heat:
  - [Aspen Surgical on halogen and LED lights](https://www.aspensurgical.com/Resources/Documents/Articles/the-difference-between-halogen-and-led-lights-in-surgical-rooms)
  - [AORN, "Cool surgical lights"](https://www.aorn.org/outpatient-surgery/article/2007-August-cool-surgical-lights)
  - [a Dräger white paper on surgical lighting](https://www.draeger.com/Content/Documents/Products/surgical-lighting-wp-dmc-116694-en-us.pdf)

## How it is made

- **The 3D scene** (`engine/r3d.py`).
  - **Shapes.** Planes, boxes, spheres, ellipsoids and capsules, plus the lamp: a cylinder, a face disc and a dome,
    in its own tilted frame so it can swing on the arm. Everything is measured in centimetres, with the floor at 0 and
    the ceiling at 300.
  - **Casting.** One ray per canvas pixel finds the nearest shape.
  - **Materials** are worked out per point: floor and wall tiles, the drape's folds and its window, the surgeons'
    caps, masks and eyes, the lamp's LEDs, lenses, sensors and fins, and the monitors' pictures (the heart trace, the
    keyhole camera, the handle camera).
  - **Light.** Soft light from the room, plus every LED as a spotlight. Each spotlight's cone is the size of the light
    field, and its shadow rays test the heads, arms and gloves.
  - **What the light is doing** comes from the clock: which LEDs are on, their brightness and colour, the solo-LED
    demonstration, and the power shifted away from a blocked head.
  - **The handle's camera** is a second, tiny render (48×32 pixels) shown on the monitor.
- **The pixel-art pass** (`engine/r3d.py`).
  - Glow (bloom) spreads only from light sources and the lit field, never from gloves or caps.
  - Then every pixel snaps to the nearest of the 89 palette colours, with a light 4×4 ordered dither.
  - Outlines go where the object changes and the depth jumps.
- **One clock** (`engine/timeline.py`). Everything the light does is a function of time: which LEDs are on, the
  solo-LED demonstration, the brightness, the colour temperature, the field size, the hand held over the field, the
  lean of the surgeon's head, the sensors' power shift, endo mode, the heat, the hand on the handle and the arm's
  swing. Every event with a sound lands on the 16th-note grid.
- **Camera, effects and captions** (`engine/scenes.py`).
  - The camera path: one camera that never cuts, a monotone cubic through keyframes.
  - The rays of light in the air, each stopped by the first head, arm or hand in its way.
  - The sensors' scan lines and detection ring, the heat view and its rising specks.
  - The captions: a dot on the object, a thin line, the text typed on.
  - Frame assembly.
- **Sound** (`engine/audio.py`). Everything is synthesized, with no samples.
  - **Chip voices:** band-limited pulse waves, an NES-style triangle bass, LFSR noise drums, echo and FM bells.
  - **Music:** 96 BPM in A minor / C major, 13 bars: vi–IV–I–V three times, one chord per function, and a last bar
    that turns to E to lead back to the top. The LEDs' own notes are the tune of the LED bar, and the brightness
    steps are the tune of the brightness bar.
  - **Effects stay on top.** Each effect was measured against the music at that moment, band by band, and the quiet
    ones were raised until they clear it.
  - **Loudness:** the mix is −14 LUFS with true peak below −1 dBTP.

## Assets

- **Original audio** (`assets/audio/`). `music.wav`, `sfx.wav` and `mix.wav`: 48 kHz, 16-bit, stereo, exactly 32.5 s.
  To refresh them, run `python render.py --audio-only --out assets/audio`.

## Files

- `render.py`: the command line (film, preview, stills, contact sheets, loops, audio only).
- `render.json`: the render configuration.
- `requirements.txt`: numpy, Pillow, imageio-ffmpeg.
- `engine/`:
  - `timeline.py`: the clock and the light's state at every moment.
  - `r3d.py`: the 3D scene (shapes, the lamp, the surgeons), the ray caster, the lighting and shadows, the materials,
    and the pixel-art pass (palette snap, dither, outlines, glow).
  - `scenes.py`: the camera path, the rays in the air, the sensors' scan, the heat view, the handle camera, the
    captions and frame assembly.
  - `palette.py`, `gfx.py`, `pixfont.py`: the colours (and the light's colour at each colour temperature), the pixel
    toolkit (the dither matrix, the upscale), the bitmap font.
  - `audio.py`: synthesizer, score, effects, master.
- `assets/audio/`: the original soundtrack.
- `镜头表.md`: the shot list (style lock, palette, 13 beats).
- `docs/交付说明.md`: delivery notes and the quality-gate results.
- `docs/storyboard.png`: one frame from each beat.
