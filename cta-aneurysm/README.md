# How Does CT Angiography Detect a Brain Aneurysm?

*From Electrons and Iodine Atoms to a Diagnostic Image.* A 180-second 16-bit pixel-art explainer, 45 connected scenes
of exactly 4 s, no narration. It opens on the diagnostic target, a small saccular bulge on the right middle cerebral
artery, and asks *how can a scan reveal this?* The film then follows the whole chain:

1. what the bulge is;
2. the CT tube: electrons, bremsstrahlung, heat, the shaped beam;
3. the iodine bolus from an arm vein through the heart and lungs into the sac;
4. photons meeting iodine (photoelectric absorption) and tissue (Compton scattering);
5. the detector: scintillator, photodiode, readout;
6. projections, the sinogram, filtered backprojection, the volume;
7. the radiologist's review: three planes, MIP, vessel rendering, inspecting and characterizing the sac;
8. what it means for the patient: dose, contrast safety, the limits of the image, how the result guides care.

It ends on the opening frame, so the video loops.

- **Format:**
  - 1080×1920 vertical (9:16), 60 fps, exactly 180.000 s, H.264 + AAC stereo.
  - Every frame is drawn at 360×640 and upscaled exactly 3× with nearest-neighbour.
  - One limited palette with 4×4 ordered dithering; no anti-aliasing, no motion blur.
- **Two versions** (rendered with the commands at the end):
  - `output/How_CT_Angiography_Detects_a_Brain_Aneurysm_AZ.mp4` has a little context in Azerbaijani: one short label per scene (1–4 words) and a few part labels.
  - `output/How_CT_Angiography_Detects_a_Brain_Aneurysm_notext.mp4` is the same film with no text at all; its mix also drops the typing sounds of the labels.
- **Colour code (from the brief):**

  | Element | Colour |
  |---|---|
  | Background | deep navy |
  | Scanner | ivory shell, slate internals |
  | Electrons | cyan dots with short trails |
  | Atomic nuclei | compact magenta |
  | X-ray photons | yellow wave packets |
  | Scintillation light | green wave packets |
  | Electronic signals | pale blue |
  | Iodinated contrast | violet molecules with white iodine nodes |
  | Blood cells | muted red |
  | Aneurysm annotation | amber, editorial only |
  | CT images | grayscale |

- **Sound:** an original score and picture-synced effects, synthesized in code from the MRI film's instruments (`mri-brain/tools/synth_audio.py`); details below.

## One patient, computed

Everything that shows anatomy or an image comes from one procedural model:

- **The head.** The CT film's head (`engine/lib/head.js`). It now has cerebral arteries (`engine/lib/ves.js`): both carotids, the circle of Willis, the MCA, ACA and PCA branches, and one unruptured saccular aneurysm on the right MCA bifurcation. The sac's neck and dome are fixed from the first frame.
- **The 3D network** (S01, S03, S38–S40, S45) is a z-buffered sphere-splat renderer with cel bands, in three modes:
  - blood: muted red;
  - contrast: violet;
  - the workstation's vessel rendering: ivory.
- **The CT measurement and reconstruction** (`engine/lib/ct.js`) use third-generation fan-beam geometry. The slice is tilted 15°, parallel to the skull base, and passes through both M1 segments and the sac.
  - The measured data: projections with Poisson noise and a sinogram of 360 views × 360 channels.
  - The reconstruction: fan-beam filtered backprojection on a 240 × 240 grid at 1 mm, computed for any number of views (1 … 360).
- **The workstation** (`engine/lib/ws.js`) computes its images from the same model:
  - axial, coronal and sagittal sections through the sac;
  - a 12-mm slab maximum-intensity projection;
  - the stack of twelve 2-mm slices for the volume.
- **The detector, the tube, the atoms and the circulation** are flat 2D illustrations (`det.js`, `tube.js`, `tungsten.js`, `atom.js`, `body.js`, `flow.js`) with physics where it matters. The bremsstrahlung pass is integrated with a screened Coulomb force. The scattered, absorbed and transmitted photons follow fixed rules.

The science, the sources and what is stylized are in `docs/science.md`.

## Sound

- **Score.** 120 BPM in D minor over the loop Dm – Bb – F – C, 90 bars.
- **Hook.** Two bars, one per scene: a 3-3-2 bar (A–D–F · E–D–C) and its answer (D–F–A · G–F–E). The same melody fits every chord of the loop, and it moves between bell, glass, pluck and lead through the film.
- **Arc.** It follows the brief:
  - curiosity;
  - the techno build into the tube, with the high-voltage drop at 32.5 s and the bremsstrahlung chime at 44.4 s;
  - the flow of the contrast, the trigger at 78.5 s;
  - a breakdown on the iodine atom, then the drop on photoelectric absorption at 88.0 s;
  - ordered data arps through the detector;
  - the reconstruction build and the main drop on the grayscale image at 132 s;
  - the climax on the reviewer's click at 154 s;
  - calm, with a two-beat pause on the limits, a warm phrase, and an A-major turnaround that lands on the opening hit.
- **Effects.** All 360 effects come from cues the scenes emit (113 kinds), so each lands on its visual cause.
  - **In key:** tonal effects (blips, ladders, chimes) take their notes from the chord sounding at that moment.
  - **On the grid:** soft interface sounds snap to the 16th grid.
  - **Exact:** physical events stay exact.
- **Mix.** −14 LUFS integrated. The reverb tail at 180 s is folded onto the start so the loop has no click.

## Files

- `镜头表.md` — the shot list: style lock, physics and medicine fixed for the film, 45 scenes, the Azerbaijani labels with glosses.
- `engine/`:
  - `index.html` (written by `tools/make_index.py`);
  - `film.js` (timeline, dissolves, cue sheet, `?notext=1`);
  - `lib/` (pixel pipeline, font with Azerbaijani letters, models, renderers);
  - `scenes/` (one file per scene).
- `tools/`:
  - `render.py` (frames → ffmpeg, stills, contact sheets, cue sheet, reference sheets);
  - `synth_audio.py` (score and effects);
  - `make_docs.py` (storyboard, timeline, prompts, captions, cue sheet);
  - checks: `caption_audit.py`, `text_check.py`, `video_diffs.py`, `frame_diffs.py`, `pair_diff.py`.
- `docs/` — the production package:
  - `storyboard.md`, `timeline.md`, `prompts.md`, `captions.md`, `cue_sheet.md`, `science.md`;
  - `sheet_anatomy.png`, `sheet_scanner.png`, `sheet_palette.png`.
- `docs/frame_open.png`, `docs/frame_close.png` — the first and last frames, pixel-identical (the loop).
- `output/` — where the render commands below write the two films (not in the repository).

## Render it yourself

You need [uv](https://docs.astral.sh/uv/) and ffmpeg. The first command downloads Playwright's Chromium (once).

```sh
git clone -b ccr-90de552e-iir9tw https://github.com/pudidil-dev/belajar-python.git
cd belajar-python/cta-aneurysm
uv run --with playwright==1.63.0 playwright install chromium
python3 tools/make_index.py
uv run --with playwright==1.63.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score.wav build/loudness.png
uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score_notext.wav --notext
uv run --with playwright==1.63.0 --with pillow python tools/render.py --out output/How_CT_Angiography_Detects_a_Brain_Aneurysm_AZ.mp4 --audio build/score.wav --fps 60 --crf 18 --tune animation
uv run --with playwright==1.63.0 --with pillow python tools/render.py --out output/How_CT_Angiography_Detects_a_Brain_Aneurysm_notext.mp4 --audio build/score_notext.wav --fps 60 --crf 18 --tune animation --notext
```

- **Speed and time.** A full render is 10,800 frames at about 10–15 frames/s on a 4-core machine, so 12–20 minutes per version. The two versions can run in parallel.
- **Windows.** Use `python` instead of `python3`; the commands are otherwise the same in PowerShell.
- **Quick looks.**
  - A contact sheet of one scene: `--sheet 0:4:0.5 --solo s01_hook --out build/s01.png`.
  - Full-size stills: `--stills 12.5,88.1 --out build/stills`.
  - Part of the film: `--from 80 --to 100 --out build/part.mp4`.
- **Reference sheets and docs.**
  - `render.py --sheets anatomy,scanner,palette --out build/sheets` redraws the sheets.
  - `python3 tools/make_docs.py` rewrites `docs/*.md` from the shot list, the scenes and `build/cues.json`.
