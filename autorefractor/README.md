# Why THIS balloon?

*How an Autorefractor Measures Your Eyes.* A 63-second vertical explainer (Reels / TikTok / Shorts): 21 connected
scenes of exactly 3 s, no narration, room left for a voice-over. It answers two questions in order:

1. **Why do I look at this balloon?** It holds the gaze steady (6–9 s) and lets the instrument relax the eye's
   focusing (9–12 s).
2. **How does the machine turn light into numbers?** Invisible infrared goes in (12–21 s), a small part comes back
   (21–27 s), a sensor turns the returning ring into charge and then data (27–36 s), and the ring's size and shape give
   an estimated refraction (36–54 s).

The first frame is the balloon; the last frame is the same frame, so the video loops.

- **Format:**
  - 1080×1920, 30 fps, exactly 63.000 s, H.264 + AAC. The engine is time-based: `--fps 60` renders the same film at 60.
  - Every frame is drawn at 360×640 and upscaled exactly 3× with nearest-neighbour; one limited palette, ordered dithering.
- **Style:**
  - The Kurzgesagt grammar: flat two-tone shapes, no outlines, glow only on light sources, one eased camera move per scene.
  - The exterior is ray-cast 2.5D blocks; the anatomy and the optics are smooth sections; the pixel grid carries the 16-bit look.
- **Two versions:**
  - labeled: one short English caption at a time, plus a few part labels;
  - clean: no text at all, and its audio drops the caption sounds.
  - `docs/labels.srt` lists every label with its times, so the text can be re-added or translated in an editor.
- **Works on mute.** Every step is shown, not only named; the captions are the film's only words.

## Colour code

| Element | Colour |
|---|---|
| Background | dark navy |
| Device | ivory, graphite, restrained teal |
| Visible fixation path (what the patient sees) | warm amber |
| Outgoing measurement light | cyan overlay |
| Returning measurement light | magenta overlay |
| Sensor charge | pale gold |
| Digital result | white with mint |
| Eye tissues | muted natural tones |

Cyan and magenta mark the direction of travel only: the measurement light is near-infrared, the patient does not see it,
and it does not change colour on the way back.

## What the film says, and what it is careful not to say

- **The instrument.** A retinal-return, ring-image autorefractor (the architecture NIDEK documents for its AR-1 / ARK-1
  family), drawn as an original, unbranded device. No air puff, no OCT, no fundus photo, no topography, no rotating prism,
  no lenslet grid.
- **The balloon** is a picture on a slide inside the instrument. Looking at it keeps the eye steady and on axis.
- **Fogging.** The instrument puts the picture slightly beyond the eye's focus, so the eye tends to stop focusing. The
  film shows the picture going a little soft and the eye's lens easing; it does not claim that accommodation is gone.
- **In and back.** The infrared goes in as a thin beam through the centre of the pupil and is bent by the cornea and the
  lens. At the back of the eye it scatters; most ends in the tissue, a small part comes back out. The retina is not shown
  as a mirror, and nothing in the eye moves or changes.
- **The sensor.** Light absorbed in a pixel frees electrons, which collect as a charge packet; the packets are read out,
  amplified and converted to numbers. The pixel scenes are schematic and not to scale.
- **The pattern.** The ring's size, ellipticity and orientation carry the sphere, the cylinder and the axis. The film
  attaches no diopter value to a ring size or an angle, and shows no confidence percentage.
- **The result** is one fictional example, the same everywhere — SPH −2.00 D · CYL −0.75 D · AXIS 180°, tagged
  "Example" — and it is called what it is: a starting estimate for a clinician's refraction, not a prescription.
- **Separate models.** The two comparison eyes (36–39 s) and the lens model (39–42 s) are in their own frames; they are
  not the patient.

## One model each, consistent everywhere

- **A. The balloon landscape** (`engine/lib/balloon.js`). One procedural picture: the full frame, the round inset and
  the tiny slide in the cutaway are the same drawing.
- **B. The patient** and **C. the autorefractor** (`engine/lib/exterior.js`). One scene in millimetres, ray-cast with an
  orthographic camera. The patient is seen only from behind and to the side.
- **D. The eye** (`engine/lib/eye.js`). One eye in millimetres; the rays in the film are traced through its surfaces
  with Snell's law.
- **E. The optical diagram** (`engine/lib/optics.js`). One side cutaway with three arms; scenes 3–9 are a single camera
  move through it.
- **F. The sensor and its ring** (`engine/lib/sensor.js`). 64 × 64 schematic pixels and one ring.
- **G. The result** (`engine/lib/result.js`). Three values, defined once.

`docs/assets.md` has the locked numbers; `docs/sheets/` has a reference sheet for each.

## Sound

Synthesized in code (`tools/synth_audio.py`), no samples.

- **Grid.** 120 BPM; a scene is one bar of six beats; 21 bars, 126 beats, exactly 63 s.
- **Harmony.** D – A – Bm – G, one chord per scene, five times; scene 21 holds A and resolves to D on the restart.
- **The hook.** A bar-long marimba figure in a 3-3-6 sixteenth rhythm: three notes up, three notes down. Its top note
  climbs a step each bar. A dotted-eighth ping-pong delay echoes it in the same rhythm.
- **The bounce.** Bass on the off-beats against a kick on every beat, pads ducking under the kick.
- **Effects in key and on the grid.** The picture's events sit on the 16th-note grid and every tonal effect is tuned to
  the chord of its bar:
  - the electrons of scene 11 climb a pentatonic scale as the well fills;
  - the readout of scene 12 clicks down the rows in sixteenths;
  - the three confirmations of scene 16 are a rising triad;
  - the three values of scene 17 are the hook's own first three notes;
  - the printer of scene 18 feeds in sixteenths.
- **The arc.** Hook alone → light pulse → full groove (15–30 s) → the drums drop out for the sensor's small sounds
  (30–36 s) → build with a held breath (36–48 s) → payoff (48–54 s) → back to the opening texture (54–63 s).
- **Nothing alarming.** No alarms, zaps, impacts or heartbeat; the infrared "switches on" as a slow bloom.
- **Stems** (each also as `*_notext.wav`, without the caption-typing ticks):
  - `music.wav`, `sfx.wav` — the two stems;
  - `mix.wav` — music + effects at −14 LUFS, for the film without narration;
  - `mix_vo.wav` — the melody pulled back and the voice band thinned, at −19 LUFS, as a bed under a voice-over.

## Files

- `镜头表.md` — the shot list: style lock, locked assets, fixed science, 21 scenes, labels.
- `engine/`:
  - `film.js` (timeline, dissolves, cues, `?notext=1`, `?nodata=1`);
  - `lib/` (pixel pipeline, captions, balloon, eye and ray tracer, optics and camera track, exterior, sensor, result, sheets);
  - `scenes/s01…s21`.
- `tools/`:
  - `render.py` (film, stills, contact sheets, cues, reference sheets);
  - `synth_audio.py` (stems and `build/audio_report.json`);
  - `make_docs.py`;
  - `make_index.py`.
- `docs/`:
  - `storyboard.md` (picture, action, start and end frame, camera, transition, caption, motion from the code, sound per scene);
  - `storyboard_frames.png` (the start and end frame of every scene);
  - `timeline.md` (the exact 63-s edit and its transitions);
  - `prompts.md` (keyframe and motion prompts per scene);
  - `labels.md`, `labels.srt`, `labels.json` (editable captions and labels);
  - `cue_sheet.md` (music sections, measured levels, every effect cue);
  - `assets.md` (asset consistency guide), `loop.md` (loop specification);
  - `sheets/` (reference sheets), `cover.png`, `cover_clean.png` (cover frame: the balloon and the eye test).

## Render it yourself

You need [uv](https://docs.astral.sh/uv/) and ffmpeg. The first command downloads Playwright's Chromium (once).

```sh
git clone -b ccr-90de552e-iir9tw https://github.com/pudidil-dev/belajar-python.git
cd belajar-python/autorefractor
uv run --with playwright==1.63.0 playwright install chromium
uv run --with playwright==1.63.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json output
uv run --no-project --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json output --notext
uv run --with playwright==1.63.0 --with pillow python tools/render.py --out output/Why_THIS_Balloon_labeled.mp4 --audio output/mix.wav --crf 18 --tune animation
uv run --with playwright==1.63.0 --with pillow python tools/render.py --out output/Why_THIS_Balloon_clean.mp4 --audio output/mix_notext.wav --crf 18 --tune animation --notext
```

- **Frame rate.** 30 fps by default; add `--fps 60` to either render line for 60.
- **Time.** About 2 minutes per version at 30 fps on a 4-core machine, twice that at 60 fps; the two versions can run in parallel.
- **Windows.** Use `python` for `python3`.
- **A voice-over later.** Put your voice over `output/mix_vo.wav`, or over `music.wav` and `sfx.wav` as separate tracks.
- **Quick looks:**
  - `--sheet 12:15:0.5 --out build/s05.png` (a contact sheet of film seconds 12 to 15);
  - `--stills 0,48.9,62.9667 --out build/stills` (3× PNGs).
- **Redraw the reference sheets:** `--sheets balloon,eye,optics,cover --out build/sheets`.
