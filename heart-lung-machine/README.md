# The Heart Is Still

*How a Heart–Lung Machine Works.* A 92-second vertical explainer for Instagram Reels and TikTok: 25 connected scenes, no
narration, room left for a voice-over. Most of it is about the machine, seen from the side, the way a dialysis set-up is
usually explained. It answers, in order:
1. Why is blood moving while the heart is still?
2. What does the machine do with it, step by step? (one drop of blood round the loop, seven numbered steps)
3. How does each step work? (drainage by gravity, the reservoir, the centrifugal pump, the heater–cooler and heat
   exchanger, the gas supply and the oxygenator)
4. How does oxygen get into the blood, and what carries it?
5. How does the blood return, and how is it kept safe?
6. What else does the machine do? (cardioplegia keeps the heart still; suction saves spilled blood)
7. Who watches over it?

The first frame shows the contradiction, a still heart with blood moving through its tubes. The last frame is the same frame, so the video loops.

- **Format:**
  - 1080×1920, 30 fps, exactly 92.000 s (2,760 frames), H.264 + AAC.
  - Every frame is drawn at 270×480 and scaled exactly 4× with nearest-neighbour, so each art pixel is a clean 4×4 block.
- **Look: simple flat 2D pixels, like the X-ray film:**
  - one flat colour per part, a 1-px light edge on the top left and a shadow band on the bottom right, near-black background, no soft glows;
  - two views: the surgeon's view from above opens and closes the film; the machine is always seen from the side, with the
    direction of flow on every line; the view turns with a fold;
  - the Kurzgesagt grammar for motion: one eased camera move per scene, visible zooms at every change of scale.
- **Text (labeled version):**
  - a small upper-case title top left with an accent bar and one context line, typed on and erased;
  - every highlighted machine part and particle named on a leader line (RESERVOIR, ROTOR, MAGNETS, O₂, HEME, IRON …);
  - numbered step badges for the workflow and an IN → SPIN → OUT strip for the pump.
- **Two versions:**
  - labeled: titles and labels as above;
  - clean: no text at all.
  - `docs/labels.srt` has every title and label with its times, for re-editing.

## The story and the science

- **The scenario.** An adult on established cardiopulmonary bypass during an arrested-heart operation. This is the chosen
  scenario, not a rule for all cardiac surgery. The heart was stopped with cardioplegia and the aorta is cross-clamped. The
  machine is running from frame one.
- **The circuit from the side (one layout in every scene):**
  - **Patient.** On the table at the top, the head behind the anaesthesia screen; a round cutaway window shows the heart.
  - **Venous side.** A venous cannula in the right atrium drains by gravity down to a hard-shell reservoir well below the heart.
  - **The machine, in flow order.** Reservoir → centrifugal pump on its magnetic drive → one assembly: heat exchanger,
    hollow-fibre oxygenator, arterial filter → the arterial line past a clamp-on bubble detector → up to the aorta, on the
    body side of the cross-clamp.
  - **Its other lines.** Gas blender (oxygen + air) → oxygenator, exhaust out; heater–cooler ↔ heat exchanger (water);
    cardioplegia bag → roller pump → aortic root; sucker → roller pump → reservoir.
- **The seven steps (S05, then one scene each):** 1 drain, 2 collect (reservoir), 3 pump, 4 warm/cool, 5 add O₂ (gas
  supply, oxygenator, and down to the molecules), 6 filter (+ bubble detector), 7 return.
- **The microscopic sequence:**
  - gas flows inside the hollow fibres and blood around them;
  - oxygen diffuses across the intact membrane;
  - it enters a red cell and binds reversibly to the iron of a heme in hemoglobin — at 54.0 s, the visual and musical peak;
  - CO₂ leaves into the gas;
  - oxygen is delivered to tissue through a capillary.
- **What it never does:**
  - no heartbeat sound, no alarm, no flatline;
  - no blue blood, no bubbles in the blood, no blades in the pump;
  - no numbers on the monitor or the blender, no doses or settings.
- `docs/mechanism.md` lists each mechanism with the fact it rests on and the brief's accuracy checks. `docs/rationale.md` keeps
  the creative choices and hypotheses apart from the medical facts.

## Sound

Synthesized in code (`tools/synth_audio.py`), no samples.

- **Grid.** 120 BPM in 4/4, 46 bars = 92 s.
- **Harmony.** A suspended G opens and closes the loop (the question). It resolves to C when the view turns to the machine at
  6 s, then C – Am – F – G, with a cycle starting exactly at the oxygen binding (54.0 s) and at the oxygen payoff (70.0 s).
- **The workflow ladder.** In S05 each of the seven steps rings one pentatonic note higher than the last.
- **A continuous sound environment under every cut and across the loop seam:**
  - operating-room hum and room tone;
  - the machine's motor hum;
  - a nonpulsatile blood-flow texture;
  - the pump's steady tone;
  - the gas and water channels.
- **Effects.** Picture-cued and tuned to the chord: soft ticks, tonal contacts, airy sweeps, a fold whoosh. The binding gets a
  soft, satisfying contact tone, not a strike.
- **Stems** (each also as `*_notext.wav`, without the label ticks):
  - `music.wav` — the score;
  - `sfx.wav` — the sound environment and effects;
  - `mix.wav` — at −14 LUFS;
  - `mix_vo.wav` — melody pulled back, voice band thinned, at −19 LUFS, as a bed for a voice-over.

## Files

- `镜头表.md` — the shot list (style lock, scenario, 25 scenes, labels); `storyboard_lint.py` green except one noted yellow (S05 is 8 s, with seven events in it).
- `engine/`:
  - `film.js` (timeline, dissolves, the fold between views, cues, `?notext=1`);
  - `lib/` (pixel pipeline and palette, flat shading, the view from above, the side view, heart, people, machine parts, micro, captions, sheets);
  - `scenes/s01…s25`.
- `tools/`:
  - `render.py` (film, stills, contact sheets, cues, sheets);
  - `synth_audio.py` (stems and `build/audio_report.json`);
  - `make_docs.py`;
  - `make_index.py`.
- `docs/`:
  - `rationale.md` (director's rationale, assumptions, simplifications, hypotheses);
  - `mechanism.md` (source-to-mechanism reference and the accuracy checks);
  - `storyboard.md` and `storyboard_frames.png` (start and end frame of every scene);
  - `timeline.md` (the exact 92-s edit);
  - `prompts.md` (keyframe, motion and SFX prompt per scene);
  - `labels.md` / `.srt` / `.json`;
  - `cue_sheet.md`;
  - `assets.md` (asset and continuity guide);
  - `loop.md` with `frame_open.png`, `frame_close.png`, `loop_compare.png`;
  - `sheets/` (circuit from the side, heart, machine parts, micro, people, palette);
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

- **Time.** A few minutes per version on a 4-core machine; the two can run in parallel. The synth takes about a minute and a half per run.
- **Windows.** Use `python` for `python3`.
- **A voice-over later.** Put the voice over `output/mix_vo.wav`, or over `music.wav` and `sfx.wav` as separate tracks.
- **Quick looks:**
  - `--sheet 10:18:0.5 --out build/s05.png` (a contact sheet of film seconds 10–18, the seven-step loop);
  - `--stills 0,54.1 --out build/stills` (1080×1920 PNGs).
