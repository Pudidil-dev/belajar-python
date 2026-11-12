# The Heart Is Still

*How a Heart–Lung Machine Works.* A 68-second vertical explainer for Instagram Reels and TikTok: 20 connected scenes at the
brief's exact timestamps, no narration, room left for a voice-over. It answers, in order:
1. Why is blood moving while the heart is still?
2. Where does it go?
3. How does the pump move it?
4. How does the machine add oxygen, and how does that oxygen enter a red blood cell?
5. What carries it?
6. How does the blood return?
7. Who watches over it?

The first frame shows the contradiction, a still heart with blood moving through its tubes. The last frame is the same frame, so the video loops.

- **Format:**
  - 1080×1920, 30 fps, exactly 68.000 s (2,040 frames), H.264 + AAC.
  - Every frame is drawn at 270×480 and scaled exactly 4× with nearest-neighbour, so each art pixel is a clean 4×4 block.
- **Look: 2D pixel models lit like 3D objects:**
  - one light from the top left, hue-shifted colour ramps, flat bands with dither only where two bands meet (the codixel rules);
  - a lighter rim on lit edges and a darker edge on shaded ones, never black outlines;
  - the machine and the table as oblique blocks;
  - the Kurzgesagt grammar for motion: one eased camera move per scene, visible zooms at every change of scale.
- **Two versions:**
  - labeled: one short English caption at a time;
  - clean: no text at all.
  - `docs/labels.srt` has every caption with its times, for re-editing.

## The story and the science

- **The scenario.** An adult on established cardiopulmonary bypass during an arrested-heart operation. This is the chosen
  scenario, not a rule for all cardiac surgery. The heart was stopped with cardioplegia and the aorta is cross-clamped. The
  machine is running from frame one.
- **The circuit (one layout in every scene):**
  - **Venous side.** A venous cannula in the right atrium drains by gravity down the viewer's left into a hard-shell reservoir below the patient.
  - **The machine, left to right.** A centrifugal pump, then an integrated heat exchanger, hollow-fibre oxygenator and arterial filter.
  - **Arterial side.** The arterial line runs up the viewer's right, past a clamp-on bubble detector, to a cannula in the ascending aorta on the body side of the cross-clamp.
  - **Accessories.** A thin cardioplegia line goes to the aortic root; gas (pale cyan) and water (blue) lines run in separate channels.
- **The microscopic sequence:**
  - gas flows inside the hollow fibres and blood around them;
  - oxygen diffuses across the intact membrane;
  - it enters a red cell and binds reversibly to the iron of a heme in hemoglobin — at 38.0 s, the visual and musical peak;
  - CO₂ leaves into the gas;
  - oxygen is delivered to tissue through a capillary.
- **What it never does:**
  - no heartbeat sound, no alarm, no flatline;
  - no blue blood, no bubbles in the blood, no blades in the pump;
  - no numbers on the monitor, no doses or settings.
- `docs/mechanism.md` lists each mechanism with the fact it rests on and the brief's accuracy checks. `docs/rationale.md` keeps
  the creative choices and hypotheses apart from the medical facts.

## Sound

Synthesized in code (`tools/synth_audio.py`), no samples.

- **Grid.** 120 BPM in 4/4, 34 bars = 68 s.
- **Harmony.** A suspended G opens and closes the loop (the question). It resolves to C when the machine appears at 6 s, then
  C – Am – F – G, with a cycle starting exactly at the oxygen binding (38.0 s).
- **A continuous sound environment under every cut and across the loop seam:**
  - operating-room hum and room tone;
  - the machine's motor hum;
  - a nonpulsatile blood-flow texture;
  - the pump's steady tone;
  - the gas and water channels.
- **Effects.** Picture-cued and tuned to the chord: soft ticks, tonal contacts, airy sweeps. The binding gets a soft,
  satisfying contact tone, not a strike.
- **Stems** (each also as `*_notext.wav`, without the label ticks):
  - `music.wav` — the score;
  - `sfx.wav` — the sound environment and effects;
  - `mix.wav` — at −14 LUFS;
  - `mix_vo.wav` — melody pulled back, voice band thinned, at −19 LUFS, as a bed for a voice-over.

## Files

- `镜头表.md` — the shot list (style lock, scenario, 20 scenes, labels); `storyboard_lint.py` green.
- `engine/`:
  - `film.js` (timeline, dissolves, cues, `?notext=1`);
  - `lib/` (pixel pipeline and palette, LIT shading, world and camera, heart, people, machine, micro, sheets);
  - `scenes/s01…s20`.
- `tools/`:
  - `render.py` (film, stills, contact sheets, cues, sheets);
  - `synth_audio.py` (stems and `build/audio_report.json`);
  - `make_docs.py`;
  - `make_index.py`.
- `docs/`:
  - `rationale.md` (director's rationale, assumptions, simplifications, hypotheses);
  - `mechanism.md` (source-to-mechanism reference and the accuracy checks);
  - `storyboard.md` and `storyboard_frames.png` (start and end frame of every scene);
  - `timeline.md` (the exact 68-s edit);
  - `prompts.md` (keyframe, motion and SFX prompt per scene);
  - `labels.md` / `.srt` / `.json`;
  - `cue_sheet.md`;
  - `assets.md` (asset and continuity guide);
  - `loop.md` with `frame_open.png`, `frame_close.png`, `loop_compare.png`;
  - `sheets/` (circuit, heart, machine, micro, people, palette);
  - `cover.png`, `cover_clean.png`.

## Render it yourself

You need [uv](https://docs.astral.sh/uv/) and ffmpeg. The first command downloads Playwright's Chromium (once).

```sh
git clone -b ccr-90de552e-iir9tw https://github.com/pudidil-dev/belajar-python.git
cd belajar-python/heart-lung-machine
uv run --with playwright==1.63.0 playwright install chromium
uv run --with playwright==1.63.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json output
uv run --no-project --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json output --notext
uv run --with playwright==1.63.0 --with pillow python tools/render.py --out output/The_Heart_Is_Still_labeled.mp4 --audio output/mix.wav --crf 18 --tune animation
uv run --with playwright==1.63.0 --with pillow python tools/render.py --out output/The_Heart_Is_Still_clean.mp4 --audio output/mix_notext.wav --crf 18 --tune animation --notext
```

- **Time.** About 3 minutes per version on a 4-core machine; the two can run in parallel. The synth takes about a minute per run.
- **Windows.** Use `python` for `python3`.
- **A voice-over later.** Put the voice over `output/mix_vo.wav`, or over `music.wav` and `sfx.wav` as separate tracks.
- **Quick looks:**
  - `--sheet 37:42:0.5 --out build/s13.png` (a contact sheet of film seconds 37–42);
  - `--stills 0,38.1 --out build/stills` (1080×1920 PNGs).
