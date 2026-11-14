# How Does a Foley Catheter Work?

*Where does this tube actually go? What keeps it there?* A 60-second vertical explainer (Reels / TikTok): 20 connected
scenes of exactly 3 s, no narration, room left for a voice-over. It tells three things in order:

1. **Where it goes.** The catheter follows the urethra into the bladder.
2. **What keeps it there.** A small balloon, expanded inside the bladder.
3. **Where the urine goes.** A separate internal channel carries urine to the bag.

It opens on the anatomical cutaway with the catheter already partly in the urethra. The balloon is revealed at 6 s, the
two channels at 30 s, the collection in the bag at 45 s. The last scene pushes into a catheter segment that the first
scene pulls back out of, so the video loops.

- **Format:**
  - 1080×1920, 60 fps, exactly 60.000 s, H.264 + AAC.
  - Every frame is drawn at 360×640 and upscaled exactly 3× with nearest-neighbour; one limited palette, ordered dithering.
- **Style:**
  - The Kurzgesagt grammar: flat two-tone facets, no outlines, glow only on markers, camera moves that go in and come back out.
  - The anatomy is a 2.5D voxel diorama, each tissue a raised layer of 2-mm voxels.
  - The catheter is a smooth ivory tube on top of it.
- **Two versions:**
  - labeled: one short English caption at a time, plus a few part labels;
  - clean: no text at all, and its audio drops the label sounds.
  - `docs/labels.srt` lists every label with its times, so you can re-add or translate the text in your editor.
- **Colour code (overlays are teaching colours, not fluid colours):**

  | Element | Colour |
  |---|---|
  | Background | deep navy |
  | Body shell | neutral, translucent |
  | Bladder, urethra | muted rose, lumen clearly darker |
  | Prostate | subdued purple-grey |
  | Catheter | ivory |
  | Urine | pale yellow |
  | Balloon | translucent pale blue, liquid-filled |
  | Drainage path | amber overlay |
  | Balloon channel | cyan overlay |

## One model, consistent everywhere

- **Anatomy** (`engine/lib/pelvis.js`). One adult male pelvis in sagittal section, in millimetres. The parts:
  - bladder with urine, bladder neck, prostate;
  - the S-curved urethra: prostatic, membranous through the pelvic floor, bulbar, penile;
  - pubic symphysis, rectum, sacrum, a translucent body shell;
  - the penis in clinical section only.
- **Device** (`engine/lib/foley.js`, `engine/lib/device.js`). One two-way Foley design, in this order from the tip:
  - the rounded closed tip;
  - two opposing side eyes (7–11.5 mm from the tip);
  - the retention balloon (15–36 mm), seen only expanded inside the bladder;
  - the shaft, with one large drainage lumen and one small balloon lumen separated by a solid partition;
  - the inflation port under the balloon;
  - outside: the bifurcation into the drainage connector and the separate balloon valve.
- **The catheter's path** follows the urethral centreline (`FOLEY.route`). It never crosses tissue or enters a ureter.
- **The bedside** (`engine/lib/bedside.js`):
  - the patient lying on the back, as a silhouette;
  - a thigh securement strap and tubing that falls steadily, with no loop below the inlet;
  - a bag on its own hanger on the bed frame, below bladder level and off the floor.
- **The urinary overview** (S06): kidneys → ureters → bladder, as a voxel map of its own.

## Sound

- **Style.** A restrained score from the MRI film's instruments (`tools/synth_audio.py`): 120 BPM, 30 bars, one chord per scene (Fmaj7 – Am7 – Cmaj7 – G6).
- **Voice-over space.** No lead synth and no claps; the 300 Hz – 3 kHz band is thinned out of the music.
- **Moments:**
  - the opening motif on bell at 0 s and again at 54 s;
  - a second curiosity motif at 18.5 s;
  - a restrained reveal chime on the balloon at 6.4 s;
  - a completion tone on the bag at 47 s.
- **Effects.** 80 quiet, picture-synced effects in the key of the moment.
- **Stems.** `music.wav`, `sfx.wav`, `mix.wav`; the mix is at −16 LUFS, a bed for a later voice-over.

## Files

- `镜头表.md` — the shot list: style lock, fixed anatomy/device rules, 20 scenes, labels.
- `engine/`:
  - `film.js` (timeline, dissolves, cues, `?notext=1`);
  - `lib/` (pixel pipeline, voxel diorama, catheter, device views, bedside, sheets);
  - `scenes/s01…s20`.
- `tools/`:
  - `render.py` (film, stills, contact sheets, cues, reference sheets);
  - `synth_audio.py` (stems);
  - `make_docs.py`;
  - `make_index.py`.
- `docs/`:
  - `storyboard.md` (picture, action, camera, label, motion from the code, sound per scene);
  - `timeline.md` (the exact 60-s edit);
  - `prompts.md` (keyframe and motion prompts per scene);
  - `labels.md`, `labels.srt`, `labels.json` (editable labels);
  - `cue_sheet.md`;
  - `sheet_anatomy.png`, `sheet_device.png` (reference sheets);
  - `cover.png`, `cover_clean.png` (opening cover frame);
  - `frame_open.png` = `frame_close.png` (the loop).

## Render it yourself

You need [uv](https://docs.astral.sh/uv/) and ffmpeg. The first command downloads Playwright's Chromium (once).

```sh
git clone -b ccr-90de552e-iir9tw https://github.com/pudidil-dev/belajar-python.git
cd belajar-python/foley-catheter
uv run --with playwright==1.63.0 playwright install chromium
uv run --with playwright==1.63.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json output
uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json output --notext
uv run --with playwright==1.63.0 --with pillow python tools/render.py --out output/Foley_Catheter_labeled.mp4 --audio output/mix.wav --fps 60 --crf 18 --tune animation
uv run --with playwright==1.63.0 --with pillow python tools/render.py --out output/Foley_Catheter_clean.mp4 --audio output/mix_notext.wav --fps 60 --crf 18 --tune animation --notext
```

- **Time.** About 4–7 minutes per version on 4 cores; the two can run in parallel.
- **Windows.** Use `python` for `python3`.
- **A voice-over later.** Use `output/music_notext.wav` and `output/sfx_notext.wav` as separate tracks under your voice.
- **Quick looks:**
  - `--sheet 0:3:0.5 --solo s03_balloon --out build/s03.png`;
  - `--stills 6.5,30.5 --out build/stills`.
- **Redraw the reference sheets:** `--sheets anatomy,device --out build/sheets`.
