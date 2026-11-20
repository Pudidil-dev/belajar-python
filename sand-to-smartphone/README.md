# From Sand to Smartphone

A silent, 3-minute-15 8-bit pixel-art explainer that follows one grain of quartz sand until it becomes the
processor of a working smartphone, and then returns to the dune it came from.

- 1080×1920 vertical, 30 fps, 195 s, H.264 + AAC stereo
- Art: drawn at 270×480 and upscaled 4× with nearest-neighbour, so every pixel stays crisp. The palette is
  limited and gradients use ordered dithering. Motion and composition follow the Kurzgesagt grammar:
  flat two-tone facets with no black outlines, radial glows on light sources, parallax layers, log-scale
  zooms between scales and magnifier insets.
- No narration and no subtitles. The only text is small pixel-font scientific labels, and at the end the
  title and message on the phone's own screen.
- The soundtrack is fully code-synthesized: a 120 BPM chiptune and electronic score plus about 540
  picture-synced sound effects.

The finished film is `output/From_Sand_to_Smartphone.mp4`.

## The 30 scenes

| # | Time | What happens |
|---|---|---|
| 1 | 0:00 | A quartz grain tumbles down a sunrise dune and glints. |
| 2 | 0:06 | Inside the grain: the SiO₂ lattice with an SiO₄ tetrahedron. Fast pull back out. |
| 3 | 0:11 | Quartz, coke and wood chips ride a conveyor into the furnace house. |
| 4 | 0:16 | Submerged-arc furnace cutaway: graphite electrodes, arcs at about 2000 °C, a rotating shell. |
| 5 | 0:22 | Carbothermic reduction, SiO₂ + 2C → Si + 2CO, atom by atom. |
| 6 | 0:28 | Tapping molten metallurgical silicon (about 99 %), then casting and the jaw crusher. |
| 7 | 0:34 | Fluidized bed: Si + 3HCl → SiHCl₃ + H₂. Fractional distillation strips out B, P, Fe and Al. |
| 8 | 0:41 | Siemens reactor: Si deposits on rods at about 1100 °C. The purity counter reaches 99.9999999 %. |
| 9 | 0:48 | Polysilicon chunks and a boron dopant pellet melt at 1414 °C in a quartz crucible. |
| 10 | 0:54 | The seed touches the melt. Liquid atoms lock into the crystal row by row. |
| 11 | 1:00 | Czochralski pull: neck, shoulder, a 300 mm body, the tail. The ingot is lifted out. |
| 12 | 1:07 | Cylindrical grinding and the orientation notch, then the diamond multi-wire saw. |
| 13 | 1:14 | Chemical-mechanical polishing (rough to flat), then a rinse to a mirror finish. |
| 14 | 1:20 | Cleanroom: a FOUP rides the overhead rail into the yellow-lit litho bay. |
| 15 | 1:26 | A robot loads the deposition chamber. ALD grows the film one atomic layer per cycle. |
| 16 | 1:31 | Photoresist spin coating. |
| 17 | 1:36 | The EUV scanner opens up: plasma source, mirrors, mask stage, wafer stage. |
| 18 | 1:42 | Tin droplets, the pre-pulse, the main CO₂ pulse, plasma and 13.5 nm EUV, in slow motion and then on the beat. |
| 19 | 1:49 | Mo/Si multilayer mirrors, the reflective mask carrying the pattern, 4× reduction optics. |
| 20 | 1:55 | Step-and-scan exposure. Photons change the resist chemistry. EUV is used for critical layers and DUV 193 nm for the others. |
| 21 | 2:00 | Develop, anisotropic plasma etch, strip. |
| 22 | 2:06 | Ion implantation with a mass-selecting magnet, then the anneal flash. |
| 23 | 2:11 | A stylized gate-all-around nanosheet transistor assembles. The gate switches the electron current on and off. |
| 24 | 2:21 | Damascene copper, then the same steps repeating up to about 15 metal layers. |
| 25 | 2:28 | Wafer probe test and the pass/fail map. |
| 26 | 2:33 | Dicing on blue tape. A known-good die is picked. |
| 27 | 2:38 | Flip-chip bumps, underfill, memory package on top (PoP), mould, BGA balls. |
| 28 | 2:44 | Solder paste, pick-and-place of the processor package, reflow at about 245 °C. |
| 29 | 2:50 | Phone assembly, battery connector, the power button. Battery → power-management IC → processor, then the boot sequence. |
| 30 | 3:03 | The screen lights up with the title. The camera pulls back to the phone standing in the sunrise dune, the message types on its screen, and a sand grain rolls against it. |

The full shot list (41 shots, with camera moves and on-screen text) is in `镜头表.md`. It passes the
`huashu-art-motion` storyboard lint with no red flags.

## Accuracy choices

- Sand is never melted straight into wafers. Quartz is reduced with carbon (S04–S05), purified as
  trichlorosilane (S07–S08), and only then melted for single-crystal growth (S09–S11).
- EUV light only changes the resist's chemistry (S20). Develop, etch, strip, implant and deposition build
  the structures (S21–S22, S24).
- Not every layer uses EUV. S20 tags EUV for critical layers and DUV 193 nm for the rest.
- The transistor is labelled as a stylized gate-all-around nanosheet device. It is a representative modern
  architecture, not a claim about every chip.
- The die is packaged before it goes on the phone board. Power comes from the battery through the
  power-management IC; the processor does not make its own energy.

## How it was made

The film was built with the `huashu-art-motion` skill installed in `.claude/skills/`. The workflow followed
was: shot list and lint, a three-direction composition check for the opening (`review/three_directions_S01.png`;
direction A, the sunrise dune, was chosen), contact-sheet review of every scene and transition, the skill's
`qa.py`, and `deliver.py` with its film gate. The delivery note with the gate results is `output/交付说明.md`,
and lessons for the skill are in `经验回流-草稿.md` (Chinese, in the skill's own format) and
`review/skill_feedback.md` (English).

```
engine/                 the animation (open engine/index.html through a local web server to preview)
  lib/pix.js            270×480 pixel pipeline: palette, Bayer-dither quantizer, bitmap font, camera, labels
  lib/kit8.js           drawing kit: atoms, particles, machines, wafers, magnifier lens, molecules
  lib/util.js, motion.js, camera.js   from huashu-art-motion (MIT): easing curves, log-zoom camera
  film.js               timeline, transitions (iris, wipe, slide, flash, dither dissolve), qa hooks
  scenes/act1–8.js      the 30 scenes
tools/render.py         headless Chromium → PNG frames → ffmpeg 4× nearest-neighbour → MP4; also stills,
                        contact sheets and the sound cue sheet
tools/synth_audio.py    music and sound effects from the cue sheet (numpy/scipy, no samples)
tools/frame_diffs.py    per-frame change curve of one scene (the same measure qa.py uses for jumps)
tools/pair_diff.py      two frames side by side plus the pixels that changed, to explain a one-frame spike
tools/text_check.py     overlapping or half-cut labels in every scene (qa.py cannot see a bitmap font)
```

To re-render (needs uv, ffmpeg and Playwright Chromium 141):

```sh
R="uv run --with playwright==1.56.0 --with pillow python tools/render.py"
$R --cues build/cues.json
uv run --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json build/score.wav
$R --out build/From_Sand_to_Smartphone.mp4 --audio build/score.wav
$R --sheet 102:109:1 --out build/sheet.png        # contact sheet of any time range
```

Every random value is seeded, so the same frame always renders to the same pixels.
