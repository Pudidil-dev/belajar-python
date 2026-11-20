# How Bacterial Colonies Grow on Agar

A 20-second vertical science short in clean 2D 8-bit pixel art (1080×1920, 30 fps), with an original 120 BPM
chiptune and synced sound effects. It loops seamlessly: the last frame runs straight into the first, so on a
phone it plays forever without a visible restart.

The whole film is **one continuous camera journey**, with no cuts and no transitions:
- it rides beside a cotton swab streaking a Petri dish, low at agar level, with the dish rim in the foreground;
- it dives into the swab's trail down to a single rod-shaped bacterium, and a target bracket locks onto it;
- the cell grows, copies its DNA, pinches in the middle and splits in two;
- the divisions speed up on the beat (2, 4, 8, 16 …) while the cells pile into a dome that pushes the camera back;
- the camera pulls out and tilts to look straight down: the dome is now one cream dot, and colonies pop up along
  the whole streak, crowded where it started and single dots where it ended;
- the swab comes back, touches our colony, lifts a little of it and streaks a fresh plate beside it, at the same
  speed, in the same direction and at the same place on screen as the first frame: the loop closes on the cause.

No title card, no subtitles, no voiceover. The only text is a tiny `TIME-LAPSE` tag and the cell counter
(×1 … ×1,073,741,824); `--clean` leaves both out.

![storyboard](docs/storyboard.png)

## Ringkasan (Bahasa Indonesia)

Video 20 detik, vertikal 1080×1920, pixel art 8-bit, berulang tanpa sambungan (frame terakhir langsung
menyambung ke frame pertama). Seluruh video adalah **satu perjalanan kamera tanpa potongan dan tanpa transisi**.

1. **0–2 dtk.** Close-up rendah setinggi agar: ujung kapas (swab) menggores agar membentuk garis S dari kiri ke
   kanan. Kilau kecil jatuh dari serat kapas ke gel lalu hilang. Kamera ikut berlari di samping ujung swab.
2. **2–4 dtk.** Swab terangkat. Kamera menyelam ke jejak goresan sampai ukuran sel; satu bakteri berbentuk batang
   dikunci oleh bracket target (×1).
3. **4–6 dtk.** Satu sel menjadi dua: sel memanjang, DNA-nya disalin ke kedua ujung, bagian tengah menyempit, lalu
   terbelah (×2). Jam kecil dan label TIME-LAPSE muncul.
4. **6–10,4 dtk.** Pembelahan makin cepat mengikuti ketukan (2, 4, 8, 16 …). Sel menumpuk jadi kubah dan
   "mendorong" kamera mundur. Penghitung naik sampai jutaan.
5. **10,4–13,6 dtk.** Kamera mundur dan memiring sampai melihat lurus dari atas. Kubah menjadi satu titik krem.
   Koloni lain muncul berurutan sepanjang jalur goresan: rapat di awal goresan, titik-titik terpisah di akhir.
   Penghitung berhenti di ×1.073.741.824 (sekitar 30 kali membelah ≈ semalam pada 37 °C), jam berhenti, bulan muncul.
6. **13,6–16 dtk.** Diam sejenak; kilau cahaya menyapu cawan.
7. **16–20 dtk.** Swab kembali, menyentuh koloni kita ("tup") dan mengangkat sedikit koloni, kamera mengikutinya
   ke cawan baru di sebelahnya, lalu swab mendarat dan menggores dengan kecepatan, arah dan posisi layar yang sama
   dengan frame pertama: loop tertutup tanpa potongan tersembunyi.

Akurasi: bakteri tumbuh **di permukaan** agar; koloni baru terlihat setelah lama (bukan langsung); tidak ada zona
bening (halo) di sekitar koloni; warna agar tidak berubah (jejak basah dari kapas mengering dalam dua detik).

## Render it yourself (copy-paste)

Needs Python 3.9+, numpy, Pillow and ffmpeg (on PATH, or `pip install imageio-ffmpeg` and it is found
automatically).

```bash
cd bacteria-colony-animation
python3 -m pip install -r requirements.txt

python3 render.py                    # the film      -> out/colony.mp4        (1080x1920, 30 fps, stereo, 20 s)
python3 render.py --preview          # quick check   -> out/preview.mp4       (540x960)
python3 render.py --loops 3          # 60 s upload   -> out/colony_x3.mp4     (three loops back to back)
python3 render.py --clean            # no text       -> out/colony_clean.mp4  (no counter, clock or bracket)
python3 render.py --stills 0,4.6,9.3,13.25         # full-size PNG frames -> out/stills/
python3 render.py --sheet 0:20:1     # contact sheet of the canvas -> out/sheet.png
python3 render.py --from 4 --to 10 --out out/slice.mp4               # just a slice
python3 render.py --audio-only       # soundtrack    -> out/music.wav, out/sfx.wav, out/mix.wav
python3 render.py --assets           # key frames, a fission sprite sheet, audio stems -> assets/
```

The full render takes about half a minute on 4 CPU cores (`--jobs N` sets the number of worker processes). The
first run also runs the small cell-growth model once (about 8 s) and caches it in `out/cache/`.

## The camera journey (120 BPM, one bar = 2 s, 10 bars)

| time | what you see | camera |
|---|---|---|
| 0–2 | the cotton tip streaks an S across the agar; a wet trail behind it, glints drop from the fibres and blink out | low (20°), rides beside the tip |
| 2–4 | the swab lifts away; the cells left in the trail twinkle; the bracket locks onto ours at 2.95 | dives from 9 px/mm to 36 px/µm, tilts to 62° |
| 4–6 | one cell grows from 2 to 4 µm, copies its DNA, pinches and splits at 6.0 | holds, a slow push |
| 6–10.4 | divisions on the beat: 7.0, 7.5, 8.0, then eighths, sixteenths, thirty-seconds; 256 single cells, then a dome of packed cells | pulls back as the pile grows (the colony stays about 80 px wide) |
| 10.4–12 | the counter reaches ×1,073,741,824 at 10.875 and the clock stops; the dome becomes one dot among many | pulls out to the whole dish and tilts to straight down |
| 12–13.6 | colonies pop along the streak, start to end; ours glints at 13.2 | still |
| 13.6–16 | a light sweep across the plate (14.0); the counter goes away (15.6) | a very slow push |
| 16–17.4 | the swab comes down onto our colony and touches it at 17.0 ("tup") | tilts a little (74°) |
| 17.4–20 | the swab lifts with a dab of cream, travels to the fresh plate, lands at 18.8 and streaks | follows it sideways, lowers to 20° and lands exactly on the opening frame |

How the loop works: plates stand in a row, one every 100 mm, and each runs the same story on its own clock
(`tau = t - 20 n`). At t = 20 the fresh plate is exactly where the first plate was at t = 0 and the camera is
exactly one plate further along, so frame 600 would be frame 0 shifted by one plate. The sound runs on buses
exactly 20 s long, so echoes and the swab's "shff" (18.8 → 2.0) wrap across the loop point.

## The science shown

- **Streaking.** The swab drags cells across the gel. Most come off at the start of the streak, fewer and fewer
  along it, so the start grows into a crowded band and the end into single, separate colonies.
- **One cell → one colony.** Our colony grows from the one cell the bracket locks onto: every cell in it is a copy
  of that cell (a clone).
- **Binary fission.** The rod grows longer, copies its DNA (the nucleoid, drawn as a teal squiggle), the two
  copies move to each end, a wall forms across the middle (the septum) and the cell splits into two identical
  daughters.
- **Doubling.** E. coli in rich medium at 37 °C can double about every 20 minutes. Thirty doublings (about 10 hours,
  overnight) turn one cell into 2^30 = 1,073,741,824 cells: a cream colony about 2 mm across. The clock in the
  corner moves 20 minutes per division, from 6 pm to 4 am.
- **On the surface.** The cells sit and grow on top of the gel and feed on nutrients from below; they do not sink
  into it. The colony is a low, glossy dome.
- **Visible over time.** A colony only becomes visible to the eye after many hours. The film shows the cells at
  their own scale while they are few and only shows the dot once the camera is back at dish scale.
- **No halo, no colour change.** There is no clear zone around the colonies (that would mean an antibiotic or
  blood being broken down) and the agar keeps its colour. The wet trail behind the swab is moisture that dries
  within two seconds.
- **Simplified on purpose.** Time is compressed (a night in about 7 s), the divisions get faster only because the
  time-lapse speeds up, and the cells split together on the beat; real cells split one by one. Colours are
  stylised (cells and colonies cream, the gel pale amber).

## Format and style

- 270×480 canvas, every frame scaled exactly 4× (nearest neighbour) to 1080×1920. H.264 (yuv420p, BT.709, CRF 16),
  AAC 256 kb/s 48 kHz stereo.
- Clean 2D 8-bit pixel art: 1-px outlines, flat pixel-cluster shading with ordered (Bayer) dither, no
  anti-aliasing. The camera is orthographic (2D pixel art has no perspective) and can look from agar level to
  straight down; the far lab lights are a parallax layer.
- Palette: dark teal lab `#0E2A2C`, pale amber agar `#E9BD6E`, cream colonies `#EADCAE`, swab white `#FFFDF6`, one
  mint accent `#6BD59B` for the bracket and the counter. All ramps are in `engine/palette.py`.
- Everything is drawn at the scale the camera reaches: the dish, the agar, the swab, single cells (a small physical
  model of 8 doublings, `engine/cells.py`), the packed cells on the dome, and the colonies. Finer textures fade in
  as the camera gets closer, so the dive and the pull-out are one continuous move.

## Sound

Original, synthesized from code (`engine/synth.py`): square-wave lead, triangle bass, noise drums, FM bells.
Chords per bar: C | Am | F | G | Am | F G | C | Am F | F | G. The last bar (G) is a pickup into the first (C).

- 0–2: the swab's soft "shff" (it starts at 18.8 and runs through the loop point), a low note, a glassy tink for
  every glint that blinks out.
- 2–4: a riser into the dive, two scan beeps and a click-beep when the bracket locks on, a falling glide and little
  bubbles on the way down.
- 4–6: a slow stretch tone, blip pairs while the DNA is copied, a squeeze while the cell pinches, a tick and a pop
  on the split.
- 6–10.9: one tick per division, climbing the scale, then a roll on the thirty-seconds; drums build underneath.
- 10.9–12: a chime when the clock stops, a riser, one sixteenth of silence, then the drop: a bright chord, a boom,
  a crash.
- 12–13.6: a pop for every sixteenth that has colonies popping in it, the pitch climbing along the streak; a
  sparkle for ours.
- 14–20: a shimmer with the light sweep, a whoosh as the swab comes down, a soft "tup" on our colony, whooshes as
  it travels (panning left to right), a soft landing, a drum fill into the loop.

Mastered to −14 LUFS with a −1 dBTP ceiling; the limiter runs round the loop too, so there is no click at the
loop point.

## Files

```
bacteria-colony-animation/
  render.py            the CLI (film, preview, loops, stills, contact sheets, slices, audio, assets)
  镜头表.md             shot list (huashu-art-motion format)
  engine/
    timeline.py        clocks, the dish, the streak, the seeds, the growth curve, the swab path, the camera
    world.py           bench, dishes, agar, wet trail, colonies, glints, cell markers, swab, near wall
    micro.py           the gel close up, single cells with DNA, packed cells on the dome
    cells.py           the small physical model of the first 8 doublings (cached in out/cache/)
    hud.py             target bracket, counter, time-lapse clock, pop rings, sparkle, light sweep
    scene.py           one frame: passes in depth order, then the 4x upscale
    audio.py           music and effects on loop-length buses, mastering
    synth.py, gfx.py, pixfont.py, palette.py
  docs/storyboard.png  key frames
  assets/sprites/      key frames and a sprite sheet of one cell dividing (python3 render.py --assets)
```

## Checks run on this project

- Shot list: `storyboard_lint.py 镜头表.md` (huashu-art-motion): 8 shots, 0 red; 1 yellow, by design: the last
  shot is 1.2 s because it is the landing that closes the loop.
- Film gate: `film_gate.py out/colony.mp4 --no-template`: passed. 1 shot, 0 hard cuts, 0 fades, 30 % fast-motion
  frames, no empty frames, no blue-violet background.
- Loop seam: in the final MP4 the change from the last frame to the first (9.3 mean absolute difference on the
  canvas) is the size of the frame steps next to it (6.7 and 9.2); the camera at t = 20 is the camera at t = 0
  moved by exactly one plate.
- Audio seam: the step from the last sample to the first (0.13) is below the 99th percentile of all steps (0.15).
  Loudness −14.1 LUFS, true peak −1.05 dBTP.
- No jumps: frame-to-frame differences have no spikes except the counter blinking out at 15.35–15.6 (intended).
- Determinism: the same frame rendered twice is byte-identical.
- Legibility: the counter's digits are 56 px tall in the 1080×1920 video.
