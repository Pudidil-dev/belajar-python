# How Medical Ventilators Work

An 88-second vertical science animation about **one mechanically delivered breath**. It starts with the lungs breathing:
they inflate as the ventilator pushes gas in, then deflate on their own. The film then follows that breath through the
machine. Inside it come the breath timer, the gas blender, the inspiratory valve and the sensors. Outside come the heated
humidifier, the circuit and the endotracheal tube. The breath goes down the airways into the alveoli, across the
alveolar-capillary barrier, and into hemoglobin. It comes back out by passive recoil, through the expiratory valve that
holds PEEP. The video then loops.

- **Format.** 1080×1920, 60 fps, exactly 88.000 s, H.264 video with stereo AAC audio. No narration.
- **Labels.** Small explanatory labels sit on leader lines next to the parts, molecules and tissues they name. Each has a
  name in white capitals and one grey line saying what it does, such as *AIR VALVE / opens wider* or *PEEP 5 cmH₂O /
  pressure kept on*. The ventilator's own screen shows its waveforms and numbers. For a clean version without labels, add
  `--notext` to the render (see below).
- **Look.** The film uses the visual language of the X-ray film in this repo. Every frame is drawn at 270×480 and scaled
  exactly 4× with nearest-neighbour. Shapes are flat, with a light edge and a shadow band. The film uses cutaways, round
  gas particles and slow log-scale zooms.
- **Structure.** There are 40 micro-scenes in eight sequences:
  - A: the breath.
  - B: into the machine.
  - C: the gas blender.
  - D: the breath controller.
  - E: delivering the breath.
  - F: gas exchange.
  - G: exhalation and PEEP.
  - H: feedback and the loop.

  Every cut sits on the 16th-note grid of the score, so picture and sound hit together.
- **The hook (0–8 s).** One continuous, calm shot of the chest, with no cuts and no flashes.
  - The lungs breathe twice at the set rate (one breath every 4.3 s).
  - Gas flows in (cyan) while the volume rises steadily. Then the flow stops and the lungs recoil, and the exhaled gas
    (amber) leaves.
  - During the second breath the camera pulls slowly back to the whole set-up: the tube, the circuit, the humidifier,
    and the ventilator whose screen draws the same breath.
- **Loop.**
  - The last frame is the first frame: the same camera, the lungs at rest, and the next breath's gas arriving along the
    circuit.
  - Frame 0 is the instant that breath starts.
  - The seam is measured in `docs/loop.md`.

## Revision 2

- **Calmer.** Every scene runs about 1.5× longer, so the film went from 60 to 88 s.
  - Rapid zoom bursts became single smooth zooms, and fast pans became slow ones.
  - Signal glows and the rings that mark an event are small and soft.
  - The hook no longer dives through the airways at speed; it shows the lungs breathing, as described above.
- **Clearer.**
  - Gas particles are round dots with short trails, not dashes that read as road markings.
  - Wider gas channels inside the machine, with brighter nitrogen particles.
  - Copper traces on the circuit board drawn as real traces.
  - A solid progress ring for the breath timer, and a large PEEP gauge with its reading.
- **More natural.**
  - Bronchi bend and taper, with cartilage rings and a mucosa-coloured lumen, and the background alveoli vary in size.
  - Alveolar ducts open into the sacs.
  - The cell layers of the barrier undulate and bulge around their nuclei.
  - The red blood cell is shown edge-on with its biconcave profile.
  - Hemoglobin has four smooth globular subunits.
  - The patient has a calm face: eyes closed, the tube taped at the mouth, ears and hair.
  - The lungs show their fissures, and the chest wall widens a little with each breath.

## The model it shows

The film shows one representative modern ICU ventilator, not a claim about every model.

- **Gas.**
  - Wall air (about 21 % O₂, mostly N₂) and oxygen each pass through a filter and a regulator to a proportional valve.
  - The two flows are set for FiO₂ 40 %, so the air valve opens wider.
  - They mix in a chamber. This is a mixture, not a reaction. An oxygen sensor measures the blend.
- **Control.** The ventilator has a programmed controller (processor, breath timer, sensors, valve drivers), not an AI.
  - The mode is volume assist-control with a time-triggered mandatory breath.
  - The timer fires, the expiratory valve closes and the inspiratory flow-control valve opens.
  - The flow sensor's signal is integrated into the delivered volume until the target tidal volume (450 mL) is reached.
  - Pressure is measured, not set; it depends on the lungs' mechanics.
- **Delivery.** The gas passes through:
  - the heated humidifier, which adds heat and water vapour but no aerosol;
  - the inspiratory limb and the Y-connector;
  - the endotracheal tube with its cuff;
  - the trachea and the bronchial tree.

  The lungs expand under positive pressure; there is no piston and no diaphragm effort.
- **Exchange.** O₂ diffuses down its partial-pressure gradient into the plasma and a red cell, crossing four layers:
  fluid lining, type I epithelium, interstitium and endothelium. It binds reversibly to the iron of a heme. CO₂ diffuses
  the other way.
- **Expiration.** Expiration is passive elastic recoil. The gas returns through the expiratory limb and the expiratory
  valve, which settles at **PEEP 5 cmH₂O** so the alveoli stay partly open.
- **Waveforms.**
  - Flow is square and positive during inspiration, then negative and decaying during expiration.
  - Volume rises linearly and falls exponentially.
  - Pressure steps up, rises to its peak and falls to PEEP. It never reaches zero.

`docs/mechanism.md` maps the brief's 25 accuracy constraints to what the film shows.

## Sound

The sound is synthesized in code (`tools/synth_audio.py`), with no samples. **No client music or sound effects were
supplied** (none were found in the repository), so the score and every effect are the film's own.

- **Grid and key.** 120 BPM, 4/4, 44 bars = 88 s, in A minor (Am – F – C – G). The last bar resolves into the first
  across the loop.
- **The hook (0–8 s).** It is quiet and follows the breaths:
  - each breath has a valve click and the gas flowing in, an elastic stretch and a soft exhale;
  - an A pedal, a pad and a light pluck figure play underneath;
  - a slow riser and one 16th of silence lead to the drop at 8.0 s, when the ventilator stands in frame.
- **Mechanical and microscopic scenes.** Mechanical scenes get pneumatic and metallic sounds. Microscopic scenes get
  quiet, high, precise ones.
- **Panning.** Moving sounds pan across the stereo field with the picture. There are no alarms.
- **Stems.**
  - `music.wav`
  - `sfx.wav`
  - `mix.wav` (−14 LUFS)
  - `mix_vo.wav`, a quieter bed for a later voice-over.

## Files

- `镜头表.md` — the shot list (style lock, 40 scenes, the labels of each scene).
- `engine/`:
  - `film.js` — the timeline. Each scene's own animation is stretched to its screen duration.
  - `lib/` — pixels and palette, flat shading, the breath model, the bedside, the ventilator's interior, airways /
    alveoli / barrier / humidifier / circuit, molecules and cells, and the labels (`cap.js`).
  - `scenes/seqA…seqH.js`.
  - `scenes/labels.js` — every label and its anchor.
- `tools/`:
  - `render.py` — film, stills, contact sheets, cues.
  - `synth_audio.py` — score and effects.
- `docs/`:
  - `mechanism.md`.
  - `loop.md`.
  - `qc_frames.png` — the brief's check moments, at their place in the 88-s cut.
  - `storyboard_frames.png` — the middle of every scene.
  - `loop_compare.png`.

## Render it yourself

You need [uv](https://docs.astral.sh/uv/) and ffmpeg. The first command downloads Playwright's Chromium (once).

```sh
git clone -b ccr-90de552e-iir9tw https://github.com/pudidil-dev/belajar-python.git
cd belajar-python/ventilator
uv run --with playwright==1.63.0 playwright install chromium
uv run --with playwright==1.63.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json output
uv run --with playwright==1.63.0 --with pillow python tools/render.py --fps 60 --out output/How_Medical_Ventilators_Work.mp4 --audio output/mix.wav --crf 18 --tune animation
```

- **Time.** About 7 minutes on a 4-core machine. The synth takes under a minute.
- **30 fps instead.** Drop `--fps 60`.
- **Without labels.** Add `--notext` to the last command and give a different `--out`.
- **Quick looks.**
  - `--sheet 0:8:0.5 --out build/hook.png` makes a contact sheet of the hook.
  - `--stills 0,40 --out build/stills` writes single frames.
