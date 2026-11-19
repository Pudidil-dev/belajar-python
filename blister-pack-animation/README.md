# How Pills Get Into Blister Packs

A 20-second looping, vertical "how it's made" short in 8-bit RPG pixel art, with a fun chiptune soundtrack and synced
arcade sound effects. It is built like a short-video hook: the payoff first, the question it raises, a tape glitch back
in time, five game stages (one per station of the machine), a boss warning, a final boss, and a loop that runs
straight back into the first frame. There is no narration: one line of RPG dialogue, a title per stage and pop-up
words.

POP! a capsule bursts out of a blister card and flies at the camera → it hangs there: HOW DID I GET HERE? ...REWIND! →
STAGE 1 MOLD: clear film runs under a heater and every row of pockets is blown into shape with a puff of air →
STAGE 2 FILL: the hero (YOU) hops forward through a hopper full of capsules; two funnels drop one capsule into each
pocket on the 16th notes; one bounces off the rim (MISS!); the hero lands in its own pocket (PERFECT!) → STAGE 3 SCAN:
a laser over a backlight ticks every pocket; the empty one glows (EMPTY!); the hero's: PASS! → STAGE 4 SEAL: foil off
a roll, a hot knurled roller (SEALED!) → STAGE 5 CUT: a die stamps out a card on each beat, an air jet blasts the
rejected card away (REJECT!), the hero's card hops onto the stack (PACKED!) → WARNING: the screen pulses red and a
hand's shadow creeps up → FINAL BOSS: the hand lifts the card to the camera, the thumb pushes, the FOIL bar drains...
→ POP!, and the film loops.

![storyboard](docs/storyboard.png)

- **Format.** 1080×1920 (9:16 vertical), 30 fps, exactly 20.0 s (10 bars of 4/4 at 120 BPM), H.264 video with 48 kHz
  stereo AAC. The default export is **`out/blister-pack-animation.mp4`**, relative to this folder.
- **Look.** Every frame is drawn in code on a 270×480 canvas and scaled exactly 4× nearest-neighbour: chunky, crisp
  pixels, stepped 1-px outlines, flat colours and at most a checker or ordered dither. The machine is seen from above
  at 3/4, like a top-down RPG map: the line runs from the top of the screen to the bottom, things with height are
  drawn shifted up the screen and a little larger, and cast a shadow down and to the right. Each colour has one job:
  - a deep teal factory floor, mint machine paint, a dark steel bed, clear film with white glints;
  - the hero's red-and-white capsule (about 45–60 px long on the line, about 190 px in the opening close-up),
    aluminium greys for the foil;
  - orange only for heat, light blue only for air;
  - yellow game text, a UI green for PASS, a crimson for MISS, REJECT and WARNING; skin tones for the hand.
- **The hero.** One capsule, marked as the player by a yellow **YOU** tag (like a game's player indicator; no face).
  Its pocket gets a **YOUR POCKET** tag as it is blown. In the hook it speaks through an RPG text box whose name tab
  is a little picture of it.
- **Game feel.**
  - a stage title drops in at each cut (STAGE 1 MOLD to STAGE 5 CUT, then FINAL BOSS) and leaves before that stage's
    big moment;
  - pop-up words on the beats (MISS!, PERFECT!, EMPTY!, PASS!, SEALED!, REJECT!, PACKED!); the hero's own pop-ups
    take the place of its tag for a moment;
  - the scanner puts a green tick or a red cross over every pocket;
  - an arcade boss WARNING, then a FOIL health bar that drains as the thumb pushes;
  - puffs of air, landing twinkles, star bursts, speed streaks, punch sparks, manga focus lines in the freeze, and
    screen shakes on the pop, the landing, the punches and the grab.
- **Camera.** One locked shot per stage, each cut on the beat (2, 4 and 8 s on a bar line, 11 and 13 s on beat 3),
  with a short white flash; the web flows through each shot at a constant speed. Each stage is framed its own way
  (2.7 to 4.1 px/mm). The only camera move is the boss lifting the card: the camera rises with it into the close-up
  and pushes in slowly while the thumb presses, which is where the film began.
- **Loop.** The last frame is the thumb pressing the dome as far as it goes; the first frame is the pop. The music's
  build-up ends on a silent 16th and resolves on the POP, and everything that rings past the end is folded back onto
  the start, so the sound loops too. `python render.py --loops 3` writes the loop three times back to back (60 s).

## Render it yourself

Working directory: **`belajar-python/blister-pack-animation`** (this folder). You need Python 3.9 or newer and git.
ffmpeg comes from the `imageio-ffmpeg` package in `requirements.txt`; a system ffmpeg on PATH is used if you have one.

Clone (skip if you already have the repo):

```bash
git clone -b ccr-90de552e-iir9tw https://github.com/Pudidil-dev/belajar-python.git
```

If you cloned it earlier, update it instead (run inside `belajar-python`):

```bash
git pull origin ccr-90de552e-iir9tw
```

Go to the project:

```bash
cd belajar-python/blister-pack-animation
```

Install the dependencies (numpy, Pillow, imageio-ffmpeg):

```bash
pip install -r requirements.txt
```

If pip refuses with an "externally-managed-environment" error, make a virtual environment first, then run the
`pip install` again:

```bash
python -m venv .venv
```

```bash
source .venv/bin/activate
```

(On Windows: `.venv\Scripts\activate`.)

Preview (540×960, fast encode, written to `out/blister-pack-animation-preview.mp4`):

```bash
python render.py --preview
```

Render the film (1080×1920, 30 fps, H.264 + stereo AAC):

```bash
python render.py
```

The film is written to **`out/blister-pack-animation.mp4`**. The music, effects and mix are written next to it as WAV
stems (`out/music.wav`, `out/sfx.wav`, `out/mix.wav`). On a 4-core machine the full render takes about 30 seconds.
With [uv](https://docs.astral.sh/uv/) instead of pip, no install step is needed:

```bash
uv run --no-project --with numpy --with pillow --with imageio-ffmpeg python render.py
```

On Windows, use `py render.py` if `python` is not on PATH.

**Options**

| Command | What it does |
|---|---|
| `python render.py --sheet 0:20:1` | one contact sheet of the whole film in `out/sheet.png` (start:end:step, seconds) |
| `python render.py --stills 0.3,9.3,14.8` | full-size PNG frames in `out/stills/` |
| `python render.py --from 8 --to 12` | only a slice of the film |
| `python render.py --fps 60` | 60 fps |
| `python render.py --scale 8` | 2160×3840 (4K vertical) |
| `python render.py --loops 3` | also `out/blister-pack-animation-loop3x.mp4`: the seamless loop played 3 times (any N) |
| `python render.py --audio-only` | only the soundtrack (music, effects, mix) |
| `python render.py --sprites` | export the sprites to `assets/sprites/` (see below) |
| `python render.py --no-audio` | the picture without sound |
| `python render.py --out PATH` | a different output file (or folder, for stills, sprites and audio) |
| `python render.py --jobs 2` | fewer CPU cores (the default uses all) |

### Render configuration

`render.json` holds the defaults; command-line flags override them.

| Key | Default | Meaning |
|---|---|---|
| `output` | `out/blister-pack-animation.mp4` | where `python render.py` writes the film |
| `fps` | `30` | frame rate |
| `scale` | `4` | pixel size: the 270×480 canvas × 4 = 1080×1920 |
| `crf`, `preset`, `tune` | `16`, `medium`, `animation` | x264 quality, speed and tuning |
| `audio_bitrate` | `256k` | AAC bitrate |
| `loudness_lufs` | `-14.0` | integrated loudness of the mix (true peak is kept below −1 dBTP) |
| `preview` | 2× scale, `veryfast`, crf 20 | the `--preview` settings and output path |
| `sprites` | `assets/sprites` | where `--sprites` writes the PNGs |

## The film, beat by beat

120 BPM: a bar is 2 s. Every sound effect is timed from `engine/timeline.py`, the same clock that drives the picture.

| Time | Picture | On screen | Sound |
|---|---|---|---|
| 0–2 | **The hook.** A hand holds a blister card up to the camera. The foil bursts (white flash, star, foil flakes, screen shake) and the capsule flies out at us, then hangs there in a freeze with manga focus lines. A text box slides up. Then a tape glitch pulls the capsule back into its pocket and the foil closes. | HOW DID I / GET HERE? · ...REWIND! | the POP on the downbeat with a crash, a whoosh, a record scratch as time freezes, a chirp per typed letter, the hook played backward fast with a tape whir |
| 2–4 | **STAGE 1 MOLD.** Clear film runs down under a glowing heater grill; at two air nozzles every row of pockets is blown into shape with a puff, one row per 16th note. The hero's pocket is blown at 3.25 s. | STAGE 1 MOLD · YOUR POCKET | the quest theme starts; the puffs are the shaker; a bloop and a chime for YOUR POCKET; the heater's hum |
| 4–8 | **STAGE 2 FILL.** A hopper full of capsules over a feeder bar with two funnels. The hero hops forward through the pile, one hop a beat. One capsule drops into each pocket on every 16th note; at 6.125 s one hits the rim and bounces off the line, leaving a pocket empty. At 6.75 s the hero drops into its own pocket. | STAGE 2 FILL · YOU · MISS! · PERFECT! | the hopper buzzes in the key; every landing plays the next note of a music-box arpeggio of the chords; a bonk and a sad slide for the miss; a falling whistle and a chime for the hero |
| 8–11 | **STAGE 3 SCAN.** A camera gantry and a red laser line over a backlight. Each row crossing the laser gets a green tick; the empty pocket glows (the light shines straight through it) and gets a red cross. The hero's pocket passes at 10.0 s. | STAGE 3 SCAN · YOU · EMPTY! · PASS! | a beep per row over a tense Dm–E bar with a heartbeat kick; a buzzer; a PASS chime as the harmony resolves |
| 11–13 | **STAGE 4 SEAL.** Aluminium foil runs down off its roll; a hot, knurled roller presses it onto the film and a diamond pattern rolls out, smooth over every pocket. | STAGE 4 SEAL · YOU · SEALED! | a sizzle, crackle and rumble; a steam hiss and a chime for SEALED! |
| 13–16 | **STAGE 5 CUT.** A die stamps out a card on each beat. The card with the empty pocket is blasted off the line by an air jet; the hero's card is cut at 14.0 s and hops onto the stack. The line winds down. Then the screen pulses red, a WARNING band scrolls across, and a hand's shadow creeps up over the stack. | STAGE 5 CUT · REJECT! · PACKED! · WARNING · YOU | the punches are the band's stop-time hits; an air blast and a whoosh; a spring, a clack and a little fanfare for PACKED!; a two-tone alarm over a low drone |
| 16–20 | **FINAL BOSS.** The hand reaches in, takes the hero's card off the stack and lifts it up to the camera; the line behind dims. The thumb pushes the hero's pocket up through the foil: it bulges, then cracks, while a FOIL bar drains. The next frame is the first one: POP. | FINAL BOSS · ! · FOIL | a boss chord and a gong, an alert blip, a minor-key riff; a whoosh for the lift; a creaking strain, a chirp for each segment the bar loses, a low-foil alarm, a snare roll that keeps speeding up, a silent last 16th |

## The science (as drawn)

- **Forming.** The pockets are made on the machine from flat, clear PVC film. The film is softened by heat (one
  machine maker gives about 105–110 °C for standard 0.25 mm PVC) and blown into a mould by compressed air (4–8 bar),
  which shapes the cavities. STAGE 1 shows a heater and the air.
- **Filling.** Capsules from a hopper are fed into the pockets, one per pocket.
- **Inspection.** A camera checks every pocket before sealing. With a backlight under the clear film, an empty pocket
  shows up bright, because the light passes straight through it. A card with a missing (or broken, or wrong) tablet
  is rejected.
- **Sealing.** Aluminium lidding foil, coated on one side with a heat-seal lacquer, is pressed onto the film with
  heat and pressure. The sealing tool's pattern (here a diamond knurl on a roller) is pressed into the foil around the
  pockets.
- **Cutting.** A punch cuts the finished cards out of the web; rejected cards are removed from the line.
- **Push-through.** The foil is meant to break under thumb pressure: you push the dome and the capsule comes out
  through the foil.
- **Simplified on purpose.**
  - Sizes and distances are compressed: the capsules and pockets are drawn larger than real against the machine, and
    a card has 2 × 4 pockets.
  - The web runs at a steady speed, like a continuous (rotary) machine, and the stations are only as far apart as the
    story needs. It stops once the hero's card is cut.
  - Real forming tools blow a whole card's pockets at once (flat-plate) or many at a time (rotary drums), and real
    feeders fill many pockets at once; here it happens one row per 16th note, so it can be seen and heard.
  - The empty pocket comes from a capsule that bounces off. Missed feeds happen for several reasons; the point is that
    the camera catches it.
  - The air jet that blows the rejected card away stands in for the machine's reject station.
  - In real life the capsule drops into your hand; in the film it flies up at the camera, for fun. The rewind
    un-makes the pack, which cannot happen either.

Sources checked when the film was first made (through web-search summaries; the pages themselves were not opened):
- Jornen: [Working principle of DPP series blister machines](https://www.jornen.com/?p=1350) (film feeding,
  heating, forming, filling, sealing, coding, punching)
- Jornen: [Pharmaceutical blister packaging principles and materials](https://www.jornen.com/?p=760) (heating plates;
  positive air pressure of 4–8 bar against a forming mould; lidding foil with a heat-seal coating)
- Jornen: [Thermoforming heating mechanism of the DPP260](https://www.jornen.com/?p=1358) (105–110 °C for standard
  0.25 mm PVC)
- Jornen: [Vision inspection tracking and automated rejection](https://www.jornen.com/?p=2361) (with a backlight, an
  empty pocket lets the light through and is flagged)
- PharmaNow: [Blister packaging in pharmaceuticals: a comprehensive guide](https://www.pharmanow.live/editors-choice/blister-packaging-in-pharma-a-complete-guide)
- US patent 12,545,465: [Inspection system for a blister machine](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12545465)
  (a blister pack with an empty pocket is rejected)
- Packaging Digest: [Doubling up on blister assurance](https://www.packagingdigest.com/packaging-design/doubling-up-on-blister-assurance)
  (a missing or broken tablet triggers ejection)

## How it is made

- **Picture** (`engine/`). Every frame is drawn in code on a 270×480 canvas and scaled exactly 4×; nothing is a
  bitmap that gets enlarged. The world is in millimetres, seen from above at 3/4 by one camera, and every object is
  redrawn at the camera's own scale (2.7 to 4.1 px/mm on the line, about 13 px/mm for the capsule in the hook).
- **The 3/4 view** (`engine/view.py`). A thing at height z is drawn shifted up the screen by 0.5 mm per mm of height
  and enlarged as if the camera looked down from 320 mm above the line; so the boss can lift the card toward the
  camera and it grows. Raised things cast a shadow down and to the right.
- **One web, one clock** (`engine/timeline.py`). The clear film runs at a constant 120 mm/s and the pockets sit 15 mm
  apart, so one row passes any point every 16th note at 120 BPM. Each station sits exactly where the hero's pocket
  passes it at its story time (blown at 3.25 s, filled at 6.75 s, scanned at 10.0 s, sealed at 12.0 s, cut at
  14.0 s), so every puff, landing, beep and punch falls on the beat grid by construction.
- **The cards** (`engine/line.py`). One renderer draws every pocket and card: pockets blown to any depth (seen from
  above: a dark floor, a lit far wall, a white rim) with the capsules lying in them, the foil with its diamond knurl,
  a card on the web, on the stack, spinning off the line, and in the hand, where the hero's pocket bulges, cracks and
  bursts.
- **The machine** (`engine/stations.py`): the bed, the rails and the gripper chain, the heater and air nozzles, the
  hopper and feeder, the scanner, the foil roll, the sealing roller and the foil sheet, the punch, the air nozzle and
  the stack.
- **The capsule** is shaded from its surface normal, so it lights correctly at any angle; in close-up it gets long
  shines and a rim light.
- **Game layer** (`engine/hud.py`, `engine/fx.py`): the typed text box, stage titles, the player tag, pop-ups, the
  scanner's marks, the boss warning and the foil bar; puffs, twinkles, bursts, focus lines, flashes, the tape glitch.
- **Sound** (`engine/audio.py`). Everything is synthesized, with no samples.
  - **Chip voices:** band-limited pulse waves, an NES-style triangle bass, LFSR noise drums, echo and FM bells.
  - **Music:** 120 BPM in C major, 10 bars:
    - the POP and a crash on the downbeat, then a shimmer while time hangs;
    - a bouncy quest theme for the mould;
    - a music box for the filling (the capsules play it);
    - a tense Dm–E bar for the scan that resolves on PASS!;
    - stop-time hits on the punches and a little fanfare;
    - an alarm over a low drone, a minor-key boss riff;
    - a snare build-up that resolves on the POP.
  - **The machine plays along:** the air puffs are the shaker, every capsule that lands plays the next note of an
    arpeggio of the chords, and the scanner beeps in 16ths.
  - **Effects stay on top.** Each effect was measured against the music at that moment, band by band, and the quiet
    ones were raised until they clear it. The music ducks for a moment under the POP, the miss and the hero's landing,
    the verdicts, the seal, the punches and the boss, and thins right out under the alarm.
  - **The rewind** is the hook played backward, faster and faster, muffled, with a tape whir.
  - **Loudness:** the mix is −14 LUFS with true peak below −1 dBTP.

## Assets

- **Sprites** (`assets/sprites/`). 20 PNGs exported from the drawing code, plus `_sheet.png`, a labelled overview:
  - 8 sprites with transparency: the capsule and its close-up, a sealed card, the hero's card pushed up and burst, a
    rejected card, the hand holding the card, and the foil with the sealing roller;
  - 12 full-frame tiles of key moments.
  
  The code is the source: to change a sprite, edit `engine/` and run `python render.py --sprites`.
- **Original audio** (`assets/audio/`). `music.wav`, `sfx.wav` and `mix.wav`: 48 kHz, 16-bit, stereo, exactly 20 s.
  To refresh them, run `python render.py --audio-only --out assets/audio`.

## Files

- `render.py`: the command line (film, preview, stills, contact sheets, loops, audio only, sprites).
- `render.json`: the render configuration.
- `requirements.txt`: numpy, Pillow, imageio-ffmpeg.
- `engine/`:
  - `timeline.py`: one clock for picture and sound (beats, the shots, the web, where each station sits, every event).
  - `palette.py`, `gfx.py`, `pixfont.py`: the palette, the pixel toolkit, the bitmap fonts.
  - `world.py`, `pix.py`: the millimetre world and 2D camera; shapes drawn only inside their own box, and the
    capsule.
  - `view.py`: the 3/4 view (height, perspective, shadows).
  - `line.py`: the film, its pockets and capsules, the foil, the gripper chain, the cards and the stack.
  - `stations.py`: the machine and what moves through it (the hopper pile, the falling capsules).
  - `hand.py`: the boss's hand.
  - `hud.py`: the text box, stage titles, the player tag, pop-up words, the scanner's marks, the warning, the foil
    bar.
  - `fx.py`: puffs, twinkles, bursts, focus lines, speed streaks, the pop, cut flashes, the tape glitch.
  - `scenes.py`: the shots, the close-up, the boss's lift, screen shake and frame assembly.
  - `sprites.py`: the sprite export.
  - `audio.py`: synthesizer, score, effects, the rewind, master.
- `assets/sprites/`, `assets/audio/`: the exported sprites and the original soundtrack.
- `镜头表.md`: the shot list (style lock, palette, 7 shots).
- `docs/交付说明.md`: delivery notes and the quality-gate results.
- `docs/storyboard.png`: one frame from each beat.
- `经验回流-草稿.md`: lessons learned, for the skill's maintainers.
