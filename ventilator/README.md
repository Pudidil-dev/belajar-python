# How Medical Ventilators Work

A 60-second vertical science animation that follows **one mechanically delivered breath**: from the breath timer and
the gas blender inside an ICU ventilator, through the inspiratory valve, the heated humidifier, the circuit and the
endotracheal tube, down the airways into the alveoli, across the alveolar-capillary barrier into hemoglobin — and back
out by passive recoil, through the expiratory valve that holds PEEP — until the next breath enters and the video loops.

- **Format:** 1080×1920, 60 fps, exactly 60.000 s, H.264 + AAC stereo. No narration, no subtitles; the only text is the
  ventilator's own screen (pressure, flow and volume waveforms and its numbers).
- **Look:** the visual language of the X-ray film in this repo: every frame drawn at 270×480 and scaled exactly 4× with
  nearest-neighbour; flat shapes with a light edge and a shadow band, cutaways, hard-edged particles, log-scale zooms.
- **Structure:** 40 micro-scenes in eight sequences (A the impossible breath, B into the machine, C the gas blender,
  D the breath controller, E delivering the breath, F gas exchange, G exhalation and PEEP, H feedback and the loop).
  Every cut sits on the 16th-note grid of the score, so picture and sound hit together.
- **Result first:** frame 0 already shows a breath entering the lungs; by 3 s the camera has dived to the blood and pulled
  all the way back out to the ventilator that delivered it.
- **Loop:** the last frame matches the first (camera, lung volume, pulse position, particle phases); measured in
  `docs/loop.md`.

## The model it shows

One representative modern ICU ventilator, not a claim about every model:
- **Gas:** wall air (about 21 % O₂, mostly N₂) and oxygen, each through a filter and a regulator to a proportional valve;
  the two flows are set for FiO₂ 40 % (the air valve opens wider) and mix in a chamber — a mixture, not a reaction; an
  oxygen sensor measures the blend.
- **Control:** a programmed controller (processor, breath timer, sensors, valve drivers), not an AI. **Volume
  assist-control** with a **time-triggered mandatory breath**: the timer fires, the expiratory valve closes, the
  inspiratory flow-control valve opens; the flow sensor's signal is integrated into the delivered volume until the target
  tidal volume (450 mL) is reached; pressure is measured, not set (it depends on the lungs' mechanics).
- **Delivery:** heated humidifier (heat and water vapour, no aerosol), the inspiratory limb, the Y-connector, the
  endotracheal tube with its cuff, the trachea and the bronchial tree; the lungs expand under positive pressure — no
  piston, no diaphragm effort.
- **Exchange:** O₂ diffuses down its partial-pressure gradient across fluid lining, type I epithelium, interstitium and
  endothelium into the plasma and a red cell, and binds reversibly to the iron of a heme; CO₂ diffuses the other way.
- **Expiration:** passive elastic recoil; the gas returns through the expiratory limb and the expiratory valve, which
  settles at **PEEP 5 cmH₂O** so the alveoli stay partly open.
- **Waveforms:** square positive flow during inspiration and a negative decaying flow during expiration; volume rising
  linearly and falling exponentially; pressure stepping up, rising to its peak, falling to PEEP (never zero).

`docs/mechanism.md` maps the brief's 25 accuracy constraints to what the film shows.

## Sound

Synthesized in code (`tools/synth_audio.py`), no samples. **No client music or sound effects were supplied** (none were
found in the repository), so the score and every effect are the film's own.
- 120 BPM, 4/4, 30 bars = 60 s, A minor (Am – F – C – G); the last bar resolves into the first across the loop.
- The hook (0–3 s) is sound design synced to every cut: THUMP + FWOOSH, a panned whoosh, three swishes that climb as a
  three-note figure, an elastic stretch, POP – TICK – SHIMMER, a rising zoom-out, one 16th of silence, the bass hit and the drop.
- Mechanical scenes get sharp pneumatic and metallic sounds; microscopic scenes quiet, high, precise ones. Moving
  sounds pan across the stereo field with the picture. No alarms.
- Stems: `music.wav`, `sfx.wav`, `mix.wav` (−14 LUFS), `mix_vo.wav` (a quieter bed for a later voice-over).

## Files

- `镜头表.md` — the shot list (style lock, 40 scenes).
- `engine/` — `film.js` (timeline), `lib/` (pixels and palette, flat shading, the breath model, the bedside, the
  ventilator's interior, airways / alveoli / barrier / humidifier / circuit, molecules and cells), `scenes/seqA…seqH.js`.
- `tools/render.py` (film, stills, contact sheets, cues), `tools/synth_audio.py` (score and effects).
- `docs/` — `mechanism.md`, `loop.md`, `qc_frames.png` (the brief's check times), `storyboard_frames.png` (the middle of
  every scene), `loop_compare.png`.

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

- **Time.** A few minutes on a 4-core machine; the synth takes under a minute.
- **30 fps instead:** drop `--fps 60`.
- **Quick looks:** `--sheet 0:3:0.25 --out build/hook.png` (a contact sheet of the hook), `--stills 0,38 --out build/stills`.
