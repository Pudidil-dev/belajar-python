# How Gamma Knife Machines Work

A 90-second vertical science animation about one Leksell Gamma Knife Icon.

It starts with the result: 192 beam paths converging on a tiny target deep in the brain. Then it dives to the physics:
the dose building up, a gamma photon handing its energy to an electron, ionized water, and a broken DNA double helix.
It pulls out to the machine and shows how the target is found, with MRI, a thermoplastic mask, CBCT and the treatment
plan. Inside the radiation unit come the 192 sealed cobalt-60 sources in 8 motorized sectors, a nucleus decaying to
excited nickel-60, and its two gamma photons.

Next, the film shows how the tungsten collimators pick the 4, 8 or 16 mm paths or a shielded OFF position, and how many
beams add their dose at the isocenter. It shows how overlapping shots shape the dose to an irregular lesion, and how the
radiation damages the cells. It ends with the infrared motion safety and then loops back to the opening frame.

- **Format.** 1080×1920, 60 fps, exactly 90.000 s, H.264 video with stereo AAC audio. No narration and no subtitles.
- **Storyboard.** The film follows the client's 5-page storyboard one to one: 49 scenes in its order, with its small
  context labels on leader lines. Two labels are corrected for the physics (OH⁻ → •OH), and the antineutrino is added;
  see `docs/mechanism.md`.
- **Timing.** The brief asked for 60 s, but 49 scenes in 60 s is 1.2 s a scene, too compact and flashy to read.
  - At the client's request each scene is lengthened to 1–2.5 s (1.8 s on average).
  - The hook keeps the shortest beats (1–1.25 s).
  - The machine stands in frame at about 7 s rather than 3 s.
  - Every cut sits on the 16th-note grid of the score.
- **Look.** The visual language of the X-ray film in this repo, with Kurzgesagt-style clarity:
  - every frame is drawn at 360×640 and scaled exactly 3× with nearest-neighbour;
  - flat shapes with a light edge and a shadow band, transparent cutaways, hard-edged particles, and log-scale zooms
    between scales.

  The glucose-meter film that the brief names as a reference is not in this repository, so the X-ray and ventilator
  films served as references.
- **Characters.** The patient appears only as a silhouette: a transparent anatomical head in profile, or a head under its
  mask.
- **Loop.** The last frame is the first frame: the same head, the same beams, the same pulse phase. See `docs/loop.md`.

## Sound

The sound is synthesized in code (`tools/synth_audio.py`), with no samples. **No client BGM or SFX were supplied** (none
were found in the repository), so the score and every effect are the film's own.

- **Grid and key.** 120 BPM, 4/4, 45 bars = 90 s, in A minor. The last bar resolves into the first across the loop.
- **The hook.** It is tied to the events:
  - precise metallic ticks as the beams light;
  - a low pulse as they converge, and a bloom for the dose;
  - an electronic snap, molecular pops and a dry crystalline crack for the photon, the water and the DNA;
  - a reverse-scale whoosh and a deep impact as the machine appears.
- **The arc.**
  - A light digital groove for imaging.
  - Dark, half-time, metallic for the sources.
  - A mechanical groove for the collimators.
  - The full drop as the beams converge.
  - A bell-and-crystal breakdown for the cell physics.
  - A tense pulse with a short alert for the safety system.
  - A build that flows into the opening tick.
- **Quiet moments.** One 16th of silence precedes each big impact. There are no explosions, no laser cannon and no
  siren.
- **Stems.**
  - `music.wav`
  - `sfx.wav`
  - `mix.wav` (−14 LUFS)
  - `mix_vo.wav`, a quieter bed for a later voice-over.

## Files

- `镜头表.md` — the shot list: style lock and 49 scenes with their labels.
- `engine/`:
  - `film.js` — the timeline.
  - `lib/` — the pixel pipeline and palette (`pix.js`), flat shading (`lit.js`), drawing helpers (`draw.js`), the labels
    (`cap.js`), and the worlds: the transparent head (`head.js`), tissue and dose (`tissue.js`), molecules and DNA
    (`micro.js`), the treatment room (`room.js`), the radiation unit (`unit.js`), the source and nucleus (`nuc.js`), and
    the imaging and interface screens (`ui.js`).
  - `scenes/seqA…seqI.js`.
  - `scenes/labels.js`.
- `tools/`:
  - `render.py` — film, stills, contact sheets, cues.
  - `synth_audio.py` — score and effects.
- `docs/`:
  - `mechanism.md`.
  - `loop.md`.
  - `qc_frames.png` — the brief's check times, mapped into the 90-s cut.
  - `storyboard_frames.png` — the middle of every scene.
  - `loop_compare.png`.

## Render it yourself

You need [uv](https://docs.astral.sh/uv/) and ffmpeg. The first command downloads Playwright's Chromium (once).

```sh
git clone -b ccr-90de552e-iir9tw https://github.com/pudidil-dev/belajar-python.git
cd belajar-python/gamma-knife
uv run --with playwright==1.63.0 playwright install chromium
uv run --with playwright==1.63.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json output
uv run --with playwright==1.63.0 --with pillow python tools/render.py --fps 60 --out output/How_Gamma_Knife_Machines_Work.mp4 --audio output/mix.wav --crf 18 --tune animation
```

- **Time.** About 10–15 minutes on a 4-core machine. The synth takes about a minute.
- **30 fps instead.** Drop `--fps 60`.
- **Without labels.** Add `--notext` to the last command and give a different `--out`.
- **Quick looks.**
  - `--sheet 0:7.5:0.5 --out build/hook.png` makes a contact sheet of the hook.
  - `--stills 0,45 --out build/stills` writes single frames.
