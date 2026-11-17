# What Happens When You Distill Grape Juice?

A 44-second looping, vertical science short in 8-bit RPG-lab pixel art, with an original chiptune soundtrack and arcade
sound effects.
- One grape is squeezed straight into a round-bottom flask, and the flask hops onto an electric heating mantle.
- The still is built around it, part by part, and an x-ray slice shows how the heater works.
- The juice boils, and only its water leaves as vapour. A Liebig condenser cools that vapour back into clear drops, and
  the camera follows one drop into the receiver.
- The distillation runs on until the juice is a thick syrup. The heater goes off before it can scorch, and the syrup is
  poured into a crystallizing dish. As it cools, crystals of grape sugar (glucose) grow in it.
- The run ends with two products: a water-rich distillate and sugar crystals. The last drop at the outlet fades into
  the grape, and the film loops.

grape → squish → flask → hop onto the heater → build the still → heater x-ray (coil, current, heat) → boil → vapour →
condenser (cutaway) → heat crosses the glass → beads → merge → one drop → receiver → keep distilling → thick syrup →
heater off → pour into a dish → seed crystals → glucose crystals grow → both products → the last drop fades into the
grape.

![storyboard](docs/storyboard.png)

- **Format.** 1080×1920 (9:16), 30 fps, exactly 44.0 s (22 bars of 4/4 at 120 BPM), H.264 video with 48 kHz stereo
  AAC. The default export is `./out/grape-juice-distillation.mp4`, relative to this folder.
- **Captions.** Small, clean labels in a 5×7 pixel font: white with a dark outline, no box. Each label sits next to
  the object it explains and moves with it, for example "SQUISH!" beside the grape, "WIRE COIL" at the coil,
  "BOILING!" at the bubbles and "SLIDES DOWN" riding along with the drop. A label types itself in quickly and
  disappears when its moment is over. A small ▶▶ mark in the top-right corner shows when time is sped up.
- **Game feel.** The motion is meant to feel like an 8-bit RPG:
  - The flask crouches, hops onto the heater and squashes on landing with a puff of dust.
  - The still head, the condenser and the receiver drop into place on the beat, each with a clunk.
  - The screen shakes briefly on every impact, and a "!" pops up when the juice starts to boil.
  - The first clear drop, and later the sugar crystals, each get an item-get fanfare with sparkles.
  - At the end the flask rises, tips over the dish in 30° steps and pours, then hops back.
  - The camera scrolls in whole pixels and punches in and out with a small overshoot.
  - Bubbles, vapour, water and current animate on twos (15 steps a second), like game sprites.
- **Loop.** The last shot pushes in on the last drop hanging at the outlet, at the grape's size and place. The drop
  then fades into the grape through an ordered-dither opacity fade, the classic 8-bit way to do transparency. The last
  frame already matches the first on 98.7% of its pixels (mean difference 0.55/255) and the picture never freezes.
  The music's last bar (a G7 turnaround) resolves into the first, and every echo and reverb tail wraps onto the start.
  `python render.py --loops 3` also writes the loop three times back to back (132 s).

## Render it yourself

Working directory: **`belajar-python/grape-juice-distillation-animation`** (this folder). You need Python 3.9+ and git.
ffmpeg comes from the `imageio-ffmpeg` package; a system ffmpeg on PATH is used if you have one.

Clone (skip if you already have the repo):

```bash
git clone -b ccr-90de552e-iir9tw https://github.com/Pudidil-dev/belajar-python.git
```

If you already cloned it earlier, update it instead (run inside `belajar-python`):

```bash
git pull origin ccr-90de552e-iir9tw
```

Go to the project:

```bash
cd belajar-python/grape-juice-distillation-animation
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Preview (540×960, fast encode, written to `out/grape-juice-distillation-preview.mp4`):

```bash
python render.py --preview
```

Render the film (1080×1920, 30 fps):

```bash
python render.py
```

The film is written to **`out/grape-juice-distillation.mp4`**, which is
`belajar-python/grape-juice-distillation-animation/out/grape-juice-distillation.mp4`. The music, effects and mix are
written next to it as WAV stems (`out/music.wav`, `out/sfx.wav`, `out/mix.wav`).

A 4-core laptop takes about a minute for the full render and about 30 s for the preview. With
[uv](https://docs.astral.sh/uv/) instead of pip:

```bash
uv run --no-project --with numpy --with pillow --with imageio-ffmpeg python render.py
```

On Windows, use `py render.py` if `python` is not on PATH.

**Options**

| Command | What it does |
|---|---|
| `python render.py --sheet 0:44:1` | one contact sheet of the whole film in `out/sheet.png` (seconds) |
| `python render.py --stills 0.4,9.9,37.5` | full-size PNG frames in `out/stills/` |
| `python render.py --from 7 --to 13` | only a slice of the film |
| `python render.py --fps 60` | 60 fps |
| `python render.py --scale 8` | 2160×3840 (4K vertical) |
| `python render.py --loops 3` | also `out/grape-juice-distillation-loop3x.mp4`: the seamless loop played 3 times (any N) |
| `python render.py --audio-only` | only the soundtrack (music, effects, mix) |
| `python render.py --sprites` | export every sprite to `assets/sprites/` (see below) |
| `python render.py --jobs 2` | fewer CPU cores (the default uses all) |

### Render configuration

`render.json` holds the defaults; command-line flags override them.

| Key | Default | Meaning |
|---|---|---|
| `output` | `out/grape-juice-distillation.mp4` | where `python render.py` writes the film |
| `fps` | `30` | frame rate |
| `scale` | `4` | pixel size: the 270×480 canvas × 4 = 1080×1920 |
| `crf`, `preset`, `tune` | `16`, `medium`, `animation` | x264 quality, speed and tuning |
| `audio_bitrate` | `256k` | AAC bitrate |
| `loudness_lufs` | `-14.0` | integrated loudness of the mix (true peak is kept below −1 dBTP) |
| `preview` | 2× scale, `veryfast`, crf 20 | the `--preview` settings and output path |
| `sprites` | `assets/sprites` | where `--sprites` writes the PNGs |

## The film, beat by beat

120 BPM: a bar is 2 s. All sound effects are timed from `engine/timeline.py`, the same clock that drives the picture.

| Time | Picture | Labels | Sound |
|---|---|---|---|
| 0–3 | **The hook.** A purple grape, already swinging on its stem in close-up. A glint sweeps its skin, it squashes, and deep-purple juice falls straight through the open neck of the round-bottom flask. The pool lands with a ripple; time speeds up (▶▶) while it fills. | SQUISH! · GRAPE JUICE · INTO THE FLASK | glint "ting", "squish", trickle, purple "plip", fast ticks |
| 3–4 | The flask crouches, hops onto the electric heating mantle and lands with a squash and a puff of dust. | HOP! · ELECTRIC HEATER | a spring, a whoosh, a thunk |
| 4–7 | **Build the still.** A match cut on the neck, then each part drops into place on the beat: the still head with its thermometer, the stands and the sloping condenser, then the adapter and the receiver. Cooling water fills the jacket from the lower port, before any heat. | STILL HEAD · THERMOMETER · CONDENSER · RECEIVER · COLD WATER IN | a clunk and a pitched blip per part, water rushing in |
| 7–9 | **Heater x-ray.** The camera punches onto the mantle and a scan line slices it open: insulation inside the case, a glass-fibre bowl hugging the flask, a resistance-wire coil zigzagging through the bowl, and a regulator behind the dial. | HEATER X-RAY · WIRE COIL | a scan beep sweeping down |
| 9–10.5 | The dial clicks on and the indicator lights. Yellow current runs from the cord through the regulator into the coil, which glows dark red, then orange. | ELECTRIC CURRENT · COIL GETS HOT | the switch "click", a soft electric hum (no zap) |
| 10.5–12.5 | Amber heat arcs soak from the hot bowl through the glass into the juice. Time speeds up (▶▶); the juice starts to boil and a "!" pops up. The scan line closes the slice. | HEAT INTO JUICE · NO FLAME! · BOILING! | warm swells, fast ticks, "bwip-bwip" |
| 12.5–15 | **Micro-shot A.** The bubbling surface and the lower neck. Pale vapour dots rise while the purple stays below. | WATER VAPOUR · PURPLE STAYS | rhythmic "blub-blub" on the beat, a soft hiss |
| 15–17.75 | Tilt up the neck with the vapour, past the thermometer bulb, and track into the condenser's inner tube. The glass rim wipes into a cutaway. No purple, splash or smoke enters the condenser. | VAPOUR RISES · THERMOMETER · INTO CONDENSER | hiss rising with the camera, a bright glass slice |
| 17.75–19.75 | **Micro-shot B.** The whole condenser in cutaway. Water enters the lower port near the receiver, climbs the jacket and leaves the upper port near the flask. Vapour runs downhill in the inner tube. The glass wall always stays between them. | COLD WATER · HOT VAPOUR | water panned right to left (uphill), hiss panned left to right (downhill) |
| 19.75–21.5 | Punch in on one section of the inner wall. Amber pulses cross from the vapour through the glass wall and die out; the water stays cyan. | HEAT LEAVES | a soft, warm tone per pulse |
| 21.5–24.25 | Clear, white-edged beads appear on the inner wall where the vapour has cooled. Two of them merge, then a pause. | VAPOUR COOLS INTO DROPS · JOIN! | one pitched pip per bead, the merge "tik", silence |
| 24.25–26 | The bigger drop slides downhill and out, falls from the outlet and lands in the receiver with a transparent, white-edged splash, echoing the opening landing. | SLIDES DOWN · DRIP! | a downhill glide, a short fall, the bright clear "plip" |
| 26–28 | Sparkles and an item-get fanfare for the first clear drop. | WATER-RICH DISTILLATE | the fanfare, twinkles |
| 28–31 | Zoom out to both flasks. The distillation runs on (▶▶): drops keep falling, the receiver fills, and the purple juice drops lower and turns into a dark, thick syrup with big slow bubbles; the flask is never emptied. Both liquids hold together in one frame. | COLOUR STAYS · MOSTLY WATER · JUICE TURNS TO SYRUP · MORE DISTILLATE | fast ticks, a filling tone, lower "blorps", the two-note chime |
| 31–35 | **From syrup to the dish.** The heater clicks off before the syrup can scorch. The cork ring hops away and a crystallizing dish drops in. The still head lifts off, the flask rises, tips over the dish in 30° steps (the syrup's surface stays level) and pours the thick syrup in, then hops back, and the still head drops back on. | HEATER OFF · BEFORE IT BURNS · CRYSTALLIZING DISH · POUR THE SYRUP | a click and a power-down blip, a spring, clunks, a pop, tipping ticks, glug-glug |
| 35–38 | **Sugar crystals.** A few seed crystals sprinkle in, and the dish cools for days (▶▶). Pale, faceted crystals grow on the seeds, the bottom and the walls. In the close-up (micro-shot C), the glucose crystals sit in purple syrup, because the fructose stays dissolved. | ADD SEED CRYSTALS · COOL FOR DAYS · GLUCOSE CRYSTALS · FRUCTOSE STAYS IN THE SYRUP | seed tinkles, a glassy chime per crystal, fast ticks |
| 38–41 | An item-get fanfare for the grape sugar, then zoom out to the whole bench: sugar crystals in the dish, water-rich distillate in the receiver. | GRAPE SUGAR! · SUGAR CRYSTALS · WATER-RICH DISTILLATE | the fanfare, twinkles, a whoosh |
| 41–44 | Push in on the last drop hanging at the outlet until it sits exactly where the grape was; the drop fades into the grape through the dither, and the film loops. | — | a rising whoosh, a sparkle of rising blips |

The flask is always on the left and the receiver on the right; the view and the flow are never reversed.

## The science (as drawn)

- **The heater.** A heating mantle is electric: there is no flame. Current from the cord passes through a regulator
  (the dial) into a resistance-wire coil embedded in a glass-fibre bowl. The wire resists the current and gets hot, and
  the bowl, which hugs the flask's round bottom, passes that heat through the glass into the liquid. Insulation in the
  case keeps the heat going inward. The dial sets how much power reaches the coil.
- **What boils off.** Heating the juice turns some of its water into vapour. The juice stays purple: the grape pigments
  (anthocyanins), sugars and acids do not evaporate, so they stay behind in the flask. The pool drops only a little.
- **How the condenser works.** The vapour runs down the inner glass tube. Cold water flows through the outer jacket and
  never touches the vapour. Heat leaves through the inner glass wall into that water, the vapour cools and condenses
  into drops on the inside of the tube, and the drops run downhill to the receiver.
- **Counter-flow.** The water goes in at the lower port (near the receiver) and out at the upper port (near the flask).
  This keeps the jacket full of cold water along its whole length.
- **The product.** The clear liquid is called a **water-rich distillate**: mostly water, possibly with traces of the
  juice's volatile aroma compounds. The film never calls it pure water, drinking water or alcohol, and shows no
  fermentation.
- **From juice to syrup.** Distilling on removes most of the water, so the juice in the flask becomes a thick, dark
  syrup (like grape molasses). The heater is switched off while it is still a syrup: concentrated sugar scorches and
  caramelizes, and a flask must never be heated to dryness.
- **Sugar crystals.** Grape juice's sugar is mainly glucose and fructose, in about equal amounts. That mix resists
  crystallizing, so the syrup is poured into a shallow crystallizing dish, seeded with a few crystals and left
  somewhere cool. Glucose ("grape sugar", an old name for it) is the one that crystallizes; this takes days to weeks,
  shown here as a time-lapse. Fructose is much more soluble and stays in the syrup. The result is pale sugar crystals
  sitting in the purple syrup, not pure white sugar. Making clean, crystalline grape sugar industrially means purifying
  the concentrate and separating the glucose from the fructose first.
- **Visual cues only.** The yellow current dots, the vapour dots and the amber heat arcs are cues. Real current and
  vapour are invisible, and heat has no colour. Time is compressed: the pour, the warm-up, the long distillation and
  the days of crystallizing are sped up (marked ▶▶).
- **The apparatus.** An electric heating mantle (not a burner), a round-bottom flask with boiling chips, a still head
  with the thermometer bulb just below the side arm, a sloping Liebig condenser, a bent adapter and an Erlenmeyer
  receiver, held by retort stands and clamps. The brief mentioned a reference image of the apparatus, but none was
  received, so the setup follows the standard simple-distillation diagrams in the sources below.

Sources checked:
- Royal Society of Chemistry: [Simple distillation, practical videos for 14–16 students](https://edu.rsc.org/practical/simple-distillation-practical-videos-14-16-students/4012011.article)
  (coloured solution, water in at the lower end of the jacket and out at the higher end)
- Royal Society of Chemistry: [Recovering pure water from a solution using a water condenser](https://edu.rsc.org/resources/recovering-pure-water-from-a-solution-using-a-water-condenser/1767.article)
  (the coloured solute stays behind)
- LibreTexts, Nichols, *Organic Chemistry Lab Techniques*: [7.21 Simple Distillation](https://chem.libretexts.org/Bookshelves/Organic_Chemistry/Organic_Chemistry_Lab_Techniques_(Nichols)/07%3A_Technique_Summaries/7.21%3A_Simple_Distillation)
  (thermometer bulb position, condenser water direction, heating mantle)
- LibreTexts, Meredith College: [9.03 Simple Distillation Procedure](https://chem.libretexts.org/Courses/Meredith_College/Organic_I_Techniques/09:_Distillation/9.03:_Simple_Distillation_Procedure)
- NutraIngredients-USA (Naturalia Ingredients): [Crystalline grape sugars: how a technological advance created a natural
  sweetener](https://mobile.nutraingredients-usa.com/News/Promotional-Features/Crystalline-grape-sugars-How-a-technological-advance-created-a-natural-GMO-free-sweetener)
  (the unbound glucose and fructose of grapes resist crystallizing; they are separated before crystallizing)
- US patent 8,414,706: [Process and plant for producing sugar products from grapes](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8414706)
- Ankara University: [Improvement of spreadability of grape molasses with induced crystallization](https://avesis.ankara.edu.tr/yayin/397f619f-6a09-47e3-86f7-68c1ee2a1081/improvement-of-spreadability-of-grape-molasses-with-induced-crystallization-for-production-of-creamed-molasses-as-a-novel-product)
  (grape molasses seeded to crystallize, stored cool for weeks)
- CAMEO, Museum of Fine Arts Boston: [Grape sugar](https://cameo.mfa.org/wiki/Grape_sugar) (an old name for glucose)
- American Chemical Society, Middle School Chemistry, [Chapter 2, Lesson 3](https://www.acs.org/middleschoolchemistry/lessonplans/chapter2/lesson3.html)
  (the coloured-water condensation demo). This session's network could not reach www.acs.org, so this page was not
  read. To check it from a cloud session, www.acs.org has to be allowed in the environment's network settings.

## How it is made

- **Picture** (`engine/`). Every frame is drawn in code on a 270×480 pixel canvas and scaled exactly 4×
  nearest-neighbour. Nothing is a bitmap that gets enlarged. The scene is a world measured in millimetres seen by one 2D
  camera, and every object is redrawn at the camera's own scale. So each zoom level has its own sprite with its own
  detail:
  - **wide** (about 1 px/mm): the whole apparatus, stands, hoses, the power cord and both flasks;
  - **close-up** (2.2–4.7 px/mm): the grape's shading and glint, the thermometer's graduations, frosted glass joints,
    boiling chips and bubbles;
  - **x-ray** (3 px/mm): the heater's case, insulation, fabric bowl, coil, regulator, wires and current;
  - **cutaway** (10–13 px/mm): the hatched cut glass walls, solid cyan water, the dark inner bore with vapour, beads
    stuck to the wall like domes, and the hanging drop;
  - **crystal close-up** (9 px/mm): faceted sugar crystals with a bright end face and a shaded side face, in the
    syrup.
- **Look.** Bold silhouettes, stepped 1-px outlines, a limited flat palette and one checker dither, with small animated
  glints on the glass. There are no gradients and no 3D camera. Each colour has one job:
  - Dark navy background.
  - Deep purple juice: a red-leaning grape purple, so it never reads as blue.
  - Violet only as highlights on the grape.
  - Cyan only for the cooling water.
  - White edges for the clear drops and the glass, and white for the captions.
  - Amber only for the heat cue.
  - Orange for the hot coil.
  - Yellow only for the electric current inside the heater x-ray.
  - The clear liquid lets the wall tiles show through, so it reads as transparent.
- **Sound** (`engine/audio.py`). Everything is synthesized, with no samples:
  - **Chip voices:** band-limited pulse waves, an NES-style triangle bass, LFSR noise drums, echo and FM bells.
  - **Music:** 120 BPM in C major, 22 bars. The square-wave hook (E5 G5 C6 B5 G5 | A5 C6 E6 D6 C6) opens the loop and
    comes back for the payoff. There are build stabs as the parts drop in, a quiet minor figure for the x-ray, a
    pulsing "current" bar, a galloping boil section, two item-get fanfares, a bouncy bar for the pour, slow glassy
    notes while the crystals grow, and a G7 turnaround.
  - **Space for the key moments:** the melody rests and the music dips under the squeeze, the landing, the merge (with
    its pause) and the final drop. Against a −19.5 dB median, the music sits at −24 to −31 dB under the squeeze, about
    −41 to −60 dB through the merge and its pause, and −33 to −43 dB under the final plip.
  - **Effects:** squish, purple plip, spring hop and thunk, part clunks, water rush, x-ray scan, switch click, electric
    hum, warm heat swells, "!" blips, blub-blub boil, bead pips, merge tik, bright clear plip, two-note chime and the
    heater clicking off, syrup glugging into the dish, a glassy chime for each crystal, and the sparkle as the drop turns
    back into the grape. All of them run on the picture's clock.
  - **Loudness:** the mix is −14 LUFS with true peak below −1 dBTP.

## Assets

- **Sprites** (`assets/sprites/`): 25 transparent PNGs exported from the drawing code, covering every object at the
  scales the film uses (wide, close-up, x-ray, cutaway and the crystal close-up), plus `_sheet.png`, a labelled
  overview. The code is the source: to change a sprite, edit `engine/grape.py`, `engine/rig.py`, `engine/heater.py`
  or `engine/crystal.py`, then run `python render.py --sprites`.
- **Original audio** (`assets/audio/`): `music.wav`, `sfx.wav` and `mix.wav` (48 kHz, 16-bit, stereo, exactly 44 s,
  loop-ready). `python render.py` regenerates the same stems into `out/` every time it renders the film; to refresh
  these copies, run `python render.py --audio-only --out assets/audio`.

## Files

- `render.py`: the command line (film, preview, stills, contact sheets, loops, audio only, sprites).
- `render.json`: the render configuration.
- `engine/`:
  - `timeline.py`: one clock for picture and sound (the beats, events, easing, the loop's match point).
  - `palette.py`, `gfx.py`, `pixfont.py`: the palette, the pixel toolkit (upscaling, dither), the bitmap font.
  - `world.py`: the millimetre world, the 2D camera, the squash-and-stretch and tipping cameras and the pixel shape
    masks.
  - `grape.py`: the grape, its squash and the juice stream.
  - `rig.py`: the apparatus (flask, still head, thermometer, condenser with its cutaway, hoses, adapter, receiver,
    stands) and the vapour, heat pulses, beads and drops.
  - `heater.py`: the heating mantle, its power cord and its x-ray (coil, regulator, current, heat into the juice).
  - `crystal.py`: the crystallizing dish, the syrup pouring in, the seed crystals and the growing sugar crystals.
  - `fx.py`: game-feel effects (the "!" emote, landing puffs, part-click stars, item-get sparkles).
  - `captions.py`: the small labels that follow the objects, and the fast-forward mark.
  - `scenes.py`: the camera path, screen shake, pixel snapping, the loop's dissolve and frame assembly.
  - `sprites.py`: the sprite export.
  - `audio.py`: synthesizer, score, effects, master.
- `assets/sprites/`, `assets/audio/`: the exported sprites and the original soundtrack.
- `镜头表.md`: the shot list (style lock, palette, 18 shots).
- `docs/交付说明.md`: delivery notes and the quality-gate results.
- `docs/storyboard.png`: one frame from each beat.
