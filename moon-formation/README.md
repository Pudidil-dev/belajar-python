# How the Moon Formed

A silent, 45-second 8-bit pixel-art explainer of the giant-impact hypothesis: the molten young Earth, the Mars-sized
protoplanet Theia striking it at an angle, the ejected melt and vapour, the debris disk, gravitational accretion, the
molten young Moon, its crust forming, and four and a half billion years later the modern Earth and Moon.

- 1080×1920 vertical, 30 fps, 45 s, H.264 + AAC stereo
- Drawn at 270×480 and upscaled 4× with nearest-neighbour, so every pixel stays crisp. One limited palette with
  ordered dithering. Motion and composition follow the Kurzgesagt grammar: flat shaded planets with banded light
  and rim highlights, glows, parallax stars, log-scale zooms between scales, a cutaway.
- No narration and no subtitles. The only text is the six tiny labels the brief allows: EARLY EARTH, THEIA, GIANT
  IMPACT, ORBITAL DEBRIS, GRAVITATIONAL ACCRETION, THE MOON.
- The impact, the debris and the accretion are not hand-animated: they are drawn from two physics simulations.
- The score and sound effects are synthesized in code (no samples): 128 BPM, A minor, 24 bars, two drops.

The finished film is `output/How_the_Moon_Formed.mp4`.

## Scenes

The music runs at 128 BPM, so one bar is 1.875 s and the film is exactly 24 bars. Every scene starts on a bar line.

| # | Time | What happens | Driven by |
|---|---|---|---|
| 1 | 0:00 | The horizon of the young Earth's magma ocean: crust rafts crack, lava fountains arc on the beat; pull out to the whole planet. | sphere shader |
| 2 | 0:03.75 | Out into space. Theia appears and falls toward Earth on a curving path, speeding up; both bodies stretch into tidal bulges. | two-body orbit, then SPH |
| 3 | 0:09.375 | Theia hits Earth's limb at 45°: flash, shock ring, both bodies deform, shocked rock glows, a spiral arm of melt and vapour flies out, part of it falls back. | SPH simulation |
| 4 | 0:15 | A dive into the arm: hot silicate droplets cooling and merging, broken rock tumbling, rock vapour condensing into new droplets. | procedural close-up |
| 5 | 0:18.75 | The debris swings around Earth; inner pieces rain back onto the glowing planet. | N-body simulation |
| 6 | 0:24.375 | The camera rides with the largest clump; it sweeps up fragments and grows. | N-body simulation |
| 7 | 0:30 | The young Moon: a ball of magma swallowing the last fragments. | N-body + sphere shader |
| 8 | 0:33.75 | Cutaway: dark crystals sink, light crystals float up into a white crust that closes over the magma ocean; then craters and dark lava plains. | procedural |
| 9 | 0:39.375 | Time-lapse: Earth cools under steam clouds, oceans fill the lowlands, continents and life appear; the Moon drifts outward; sunlight sweeps round both. The modern blue Earth and grey Moon. | sphere shader |

The shot list (11 shots with camera moves) is `镜头表.md`; it passes the `huashu-art-motion` storyboard lint.

## The physics

**Impact** (`tools/sim_impact.py`): 2D smoothed-particle hydrodynamics with self-gravity, 3,560 particles. Proto-Earth
(2,791 particles) and Theia (769) each have an iron core and a silicate mantle and are relaxed to equilibrium first.
Theia has 0.12 Earth masses and 0.53 Earth radii and hits at 45° from the line of centres at 1.05 times the mutual
escape speed, the canonical giant-impact setup. Cubic-spline kernel, stiff equation of state plus thermal pressure,
Monaghan artificial viscosity (the shock heating is what makes material glow in the film), softened direct-sum
gravity (numba). In this run about 1.7 lunar masses end up in orbit, roughly 85% of it from Theia, in line with the
published canonical simulations. Runs in under a minute.

**Accretion** (`tools/sim_accrete.py`): the SPH state 6 time units after contact (about 1.3 hours, while the arm is
still a stream) becomes an N-body run: 2,056 fragments, Earth as a point mass, mutual gravity, perfect merging on
contact only outside the Roche limit (2.9 Earth radii), absorption on reaching Earth's surface. About 4 lunar masses
fall back onto Earth, 1,326 mergers happen, and one moon emerges.

**Honest limits.** This is a 2D toy model that is rendered to look 3D, not a research simulation. Its moon comes out
at about 1.8 lunar masses on an eccentric orbit 4–8 Earth radii out: the right place, beyond the Roche limit, but about
twice the real Moon's mass. Collision radii of small fragments are reduced so gravity, not overlap, drives the
clumping, and a weak damping stands in for the dissipation of collisions inside a swarm. Time is compressed and
non-linear: slow motion through the impact, faster and faster through the accretion. The model's Moon assembles within
about a day; real estimates range from hours to many years.

## Accuracy choices

- It is presented as the giant-impact hypothesis, the leading model, not an observed event.
- The Moon does not break off Earth as a solid body. It forms from orbiting melt and vapour that collide and merge.
- Earth has no oceans after the impact. It stays a magma ocean, then a dark crust under steam clouds; oceans fill
  the lowlands only later in the time-lapse, and land plants come last.
- The lunar crust is anorthosite that floats on the magma ocean while denser crystals sink; the dark maria are
  later basalt floods in big impact basins.
- The Moon recedes from Earth over time, and Earth's day lengthens (its spin slows through the time-lapse). In the
  final frame the distance is compressed so both fit; the real distance is about 60 Earth radii. The Moon's size
  relative to Earth (0.273) is correct.

## How it was made

Built with the `huashu-art-motion` skill in `.claude/skills/`: shot list and lint, contact-sheet review of every
scene, the skill's `qa.py`, and `deliver.py` with its film gate (delivery note: `output/交付说明.md`).

```
engine/                 the animation (open engine/index.html through a local web server to preview)
  lib/pix.js            270×480 pixel pipeline: palette, Bayer-dither quantizer, bitmap font, labels
  lib/sphere.js         per-pixel planet shader: noise, ramps, banded light; textures for every body and stage;
                        Earth's land on a 5° grid
  lib/meta.js           SPH particles as molten blobs; N-body fragments as glowing rocks
  lib/simdata.js        loads and interpolates the two simulations
  lib/view.js           camera with roll and shake, starfield
  lib/util.js, motion.js, camera.js   from huashu-art-motion (MIT)
  film.js               timeline (9 scenes on bar lines), dither dissolve, qa hooks
  scenes/moon.js        the nine scenes, the camera path and the clocks that map film time to simulation time
  data/                 simulation snapshots (impact.bin, accrete.bin + json)
tools/sim_impact.py     SPH giant impact (numba)
tools/sim_accrete.py    N-body debris → Moon (numba)
tools/render.py         headless Chromium → PNG frames → ffmpeg 4× nearest-neighbour → MP4; stills, contact sheets, cues
tools/synth_audio.py    the score and sound effects from the cue sheet (numpy/scipy)
tools/video_diffs.py    frame-to-frame change of a rendered film (finds pops and strobing)
tools/frame_diffs.py, pair_diff.py, text_check.py   per-scene diff curve, two-frame diff, label collision check
```

To re-run everything (needs uv, ffmpeg and Playwright Chromium 141):

```sh
uv run --no-project --with numba --with numpy --with pillow python tools/sim_impact.py
uv run --no-project --with numba --with numpy python tools/sim_accrete.py
R="uv run --with playwright==1.56.0 --with pillow python tools/render.py"
$R --cues build/cues.json
uv run --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json build/score.wav
$R --out build/How_the_Moon_Formed.mp4 --audio build/score.wav --crf 16
```

Every random value is seeded, so the simulations and every frame are reproducible.
