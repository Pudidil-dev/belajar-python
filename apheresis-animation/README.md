# How an Apheresis Machine Takes Platelets and Returns Your Blood

A 32-second looping vertical medical-science short in 2D 8-bit retro medical-tech pixel art, with an original
120 BPM chiptune and synced sound effects.

The film follows one calm donor's blood through one machine. It leaves the arm and goes through the blood pump. It
gets anticoagulant and is spun apart. The platelets go into a golden bag, and the rest of the blood goes back into
the same arm. The hero shot is the separation inside the spinning channel. The last frame flows straight back into
the first.

The machine is a generic bedside apheresis console with no brand or logo. Its shape follows the common layout of
real consoles: a wide, low cabinet with the pumps on a sloped front deck, the centrifuge under a round lid on top,
a touchscreen on a post and two IV poles.

![storyboard](docs/storyboard.png)

Labels in Bahasa Indonesia (`--lang id`): [docs/storyboard_id.png](docs/storyboard_id.png)

## Ringkasan (Bahasa Indonesia)

Video 32 detik, vertikal 1080×1920, pixel art 8-bit bergaya alat medis retro, berulang (loop) tanpa sambungan:

1. **0–3 dtk.** Close-up lengan donor. Jarum sudah terpasang dan diplester, dan darah sudah mengalir di selang.
   Kamera ikut bergerak sepanjang selang menuju mesin (label AMBIL).
2. **3–6 dtk.** Kamera masuk ke dalam selang. Sel darah merah (cakram bikonkaf merah tua), trombosit emas kecil,
   beberapa sel darah putih dan plasma kuning pucat masih bercampur.
3. **6–9 dtk.** Pompa darah (rotor merah) di panel depan mesin, dalam tampilan potong. Dua roller menekan dan
   melepas selang bergantian sehingga darah terdorong maju ("klik-klik").
4. **9–11 dtk.** Pompa antikoagulan (rotor biru) mengalirkan antikoagulan, dan selangnya bergabung di sambungan Y di
   bawah tutup sentrifus. Close-up singkat: sitrat menangkap ion kalsium ("tik"), jadi darah tidak membeku di selang.
5. **11–15 dtk.** Darah naik ke sentrifus di bawah tutup bundar di atas mesin. Kamera mundur memperlihatkan seluruh
   mesin saat rotor mulai berputar, lalu masuk lagi ke saluran pemisah.
6. **15–21 dtk.** Inti film. Darah yang tercampur memilah diri menurut massa jenis: sel darah merah ke dinding luar,
   plasma tetap di bagian dalam, dan pita trombosit emas terbentuk di antaranya lalu menuju lubang keluarnya sendiri.
7. **21–25 dtk.** Aliran trombosit emas naik ke kantong yang tergantung. Kantong terisi produk kuning keemasan pucat
   (label TROMBOSIT).
8. **25–29 dtk.** Layar berganti ke KEMBALI dan pompa darah berputar ke arah sebaliknya. Sisa darah (sel darah
   merah dan plasma) kembali lewat jalur yang sama ke lengan yang sama. Satu jarum: mengambil dan mengembalikan
   bergantian, tidak pernah bersamaan.
9. **29–30,5 dtk.** Kamera mundur memperlihatkan seluruh sistem: donor yang tenang, selang, mesin dan kantong emas
   (label TROMBOSIT TERKUMPUL).
10. **30,5–32 dtk.** Kamera meluncur kembali ke close-up lengan. Frame terakhir menyambung ke frame pertama.

**Bentuk mesin:** konsol apheresis generik tanpa merek atau logo, mengikuti bentuk mesin sungguhan. Badannya lebar dan
rendah, berwarna putih keabu-abuan dengan panel diagonal abu-abu. Dua pompa (rotor biru dan merah) ada di panel depan
yang miring, bersama klem hitam dan drip chamber di ceruk depan. Sentrifus ada di bawah tutup bundar di atas mesin,
layar sentuh berdiri di atas tiang dengan tombol stop merah, dan ada dua tiang infus berkait merah dan biru.

Tidak ada narasi dan tidak ada subtitle, hanya label kecil yang menempel pada bendanya. Default bahasa Inggris,
`--lang id` untuk Bahasa Indonesia, `--clean` tanpa label sama sekali. **Video akhir tidak dirender di sini; kamu
render sendiri dengan perintah di bawah.**

## Render it yourself (copy-paste)

Working directory: the `apheresis-animation` folder of this repository (branch `claude/tes-45y4ej`), that is
`belajar-python/apheresis-animation`. Needs Python 3.9 or newer. ffmpeg comes from `pip` (imageio-ffmpeg); a system
ffmpeg on PATH is used first if you have one.

```bash
git clone -b claude/tes-45y4ej https://github.com/Pudidil-dev/belajar-python.git
cd belajar-python/apheresis-animation
pip install -r requirements.txt
python render.py --preview
python render.py
```

| Step | Command (run inside `belajar-python/apheresis-animation`) | Result |
|---|---|---|
| Install | `pip install -r requirements.txt` | numpy, Pillow, imageio-ffmpeg |
| Preview | `python render.py --preview` | `out/preview.mp4`: half size (540×960) with sound, about 30 s to make |
| Render | `python render.py` | `out/apheresis.mp4`: the final film |

**Output path:** `belajar-python/apheresis-animation/out/apheresis.mp4`. It is a vertical 9:16 H.264 MP4, 1080×1920,
30 fps, exactly 32.000 s (960 frames), with synchronized AAC 48 kHz stereo audio. On a 4-core machine it takes
about a minute; slower machines take a few minutes.

Already have the repository? Use these commands instead of the clone:

```bash
cd belajar-python
git fetch origin claude/tes-45y4ej
git checkout claude/tes-45y4ej
git pull origin claude/tes-45y4ej
cd apheresis-animation
```

Other versions (each writes its own file):

```bash
python render.py --lang id      # labels in Bahasa Indonesia -> out/apheresis_ID.mp4
python render.py --clean        # no labels at all -> out/apheresis_clean.mp4
python render.py --assets       # key-frame sprites + cell sprite sheet -> assets/sprites/, audio stems -> assets/audio/
```

On Windows, write `py` instead of `python` if `python` is not found. On some Linux and macOS systems the commands are
`python3` and `pip3`.

More options:

```bash
python render.py --stills 0,6.6,13.4,30.3       # full-size PNG frames -> out/stills/
python render.py --sheet 0:32:1 --cols 8        # contact sheet -> out/sheet.png
python render.py --from 15 --to 21 --out out/slice.mp4   # just a slice (with its part of the soundtrack)
python render.py --audio-only                   # soundtrack only -> out/music.wav, out/sfx.wav, out/mix.wav
python render.py --scale 8                      # 2160x3840 (4K vertical) instead of 1080x1920
```

## Scene by scene (120 BPM, one bar = 2 s, 16 bars, looping)

| Time (s) | Scene | What you see | Sound |
|---|---|---|---|
| 0–3 | 1 The arm | Close-up of the donor's forearm on the armrest. The needle is already taped in, and red blood is already moving in the clear tube. After a short hold the camera slides along the tube toward the machine. | a soft double pulse, a flow whoosh, the calm first bar |
| 3–6 | 2 Inside the tube | A stepped pixel cut dives into the tube. Deep-red biconcave red cells tumble past (some tilted, some edge-on) with small gold platelets and a few pale white cells, all in pale-yellow plasma, still mixed. They flow fastest in the middle of the tube. A stepped cut back out lands on the pump. | a quick whoosh with falling blips at each cut, little sparkle tones |
| 6–9 | 3 Peristaltic pump | The blood pump on the front deck, in cutaway: a black housing, a red rotor with a white bar and a roller at each end, and the tube running round the raceway. Each roller pinches the tube against the raceway and pushes a pocket of blood forward, and the tube springs open again behind it. The camera then follows the blood out. | a click for every roller (on the eighth notes), a soft motor hum, an arpeggio locked to the clicks |
| 9–11 | 4 Anticoagulant | The anticoagulant pump (blue rotor) turns slowly, and its mint line joins the blood line at a Y fitting just below the centrifuge lid. A quick zoom shows a citrate molecule closing onto a calcium ion (two-frame gold flash), then the camera goes back out to the flow. | one **tik** at 10.1 s; the music ducks around it |
| 11–15 | 5 Into the centrifuge | The blood runs up into the centrifuge under the round lid on top of the machine. The camera pulls out to show the whole machine as the rotor spins up under the lid: its spokes blur into rings and motion streaks. Then it pushes back in to the separation channel. | a rising whirr, then a steady spin tone; a spinning 16th-note arpeggio |
| 15–21 | 6 Separation (hero) | A curved section of the spinning channel; the camera holds still and drifts slightly with the platelet band. The mixed blood sorts itself. Red cells drift to the outer wall and pack into a deep-red layer, plasma stays on the inner side, and a gold platelet band forms between them, with the few white cells right next to it. The band then slides toward its own exit port. | a crash at 15 s, small rising ticks 16.5–19 s, a rising tone as the platelets leave |
| 21–25 | 7 Platelet bag | A stepped cut back out to the lid. The gold platelet stream runs up its line, past the screen, into the bag hanging on the right pole, which fills slowly with a pale-gold product. | soft filling bubbles, then a bright little reward tone at 24.5 s |
| 25–29 | 8 Return | The screen flips to RETURN, and the blood pump turns the other way while the anticoagulant pump rests. The remaining blood (red cells and plasma) goes back the way it came: out of the centrifuge, back through the blood pump and the drip chamber, along the same tube into the same arm. | a phase-switch click, a whoosh, a soft flow |
| 29–30.5 | 9 Reveal | The screen flips back to DRAW, and the camera pulls out to the whole setup. You see the calm donor (a silhouette under a blanket), the tubing, the machine with its screen and poles, the mint anticoagulant bag and the golden platelet bag. The wide shot holds. | the phase click, a crash, a three-note success chime at 29.5 s |
| 30.5–32 | 10 Back to the arm | The camera glides back into the opening close-up, and blood flows toward the machine again. The last frame flows into the first, with no fade and no freeze. | a rising swoosh and a drum fill back into bar 1 |

## Labels (default; `--clean` removes them)

There is no narration, no subtitle and no caption box. Each label is one or two words on a small dark plate, pinned
to the thing it names by a dotted leader line. It types in quickly and follows that thing on screen through camera
moves.

| Time (s) | English | Indonesian (`--lang id`) | Pinned to |
|---|---|---|---|
| 0.7–2.8 | DRAW | AMBIL | the tube ahead of the camera |
| 3.7–5.5 | RBC · PLATELETS · PLASMA | SEL DARAH MERAH · TROMBOSIT · PLASMA | one red cell and one platelet (moving with the flow), the plasma near the wall |
| 8.55–9.55 | ANTICOAGULANT | ANTIKOAGULAN | the anticoagulant line between its pump and the Y fitting |
| 9.75–10.5 | CITRATE · CALCIUM | SITRAT · KALSIUM | the citrate molecule and the calcium ion it catches |
| 16.8–20.9 | RBC · PLATELETS · PLASMA | SEL DARAH MERAH · TROMBOSIT · PLASMA | the outer red layer, the gold band, the pale inner layer |
| 23.0–25.0 | PLATELETS | TROMBOSIT | the collection bag |
| 26.9–28.95 | RETURN | KEMBALI | the line as the blood flows back (the screen already says RETURN before that) |
| 29.7–30.7 | PLATELETS COLLECTED | TROMBOSIT TERKUMPUL | the bag in the wide shot |

The machine screen also shows the phase as a word, an arrow and a gold yield bar: DRAW (arrow toward the machine)
or RETURN (arrow toward the donor).

## The science shown

- **Apheresis.** Blood is drawn, one component is collected, and everything else goes back to the donor. Here the
  collected component is platelets (plateletpheresis).
- **Single needle: DRAW, then RETURN, never both.** With one needle the machine alternates. It draws for a while,
  then returns, then draws again, and the screen always shows which phase is running. The film shows one full
  cycle. (Some machines use two needles, one in each arm, to draw and return at the same time.)
- **Peristaltic pumps.** Rollers squeeze the outside of the tube, so the blood only ever touches the sterile,
  single-use tubing set, never the pump. The blood pump moves the blood; a second, slower pump meters the
  anticoagulant.
- **Anticoagulant.** Citrate binds the calcium ions that the clotting reaction needs, so the blood does not clot in
  the tubing. The close-up shows that one idea: citrate catches calcium.
- **Separation by spinning, not by a filter.** The spinning channel pushes the denser parts outward. Red cells are
  the densest, so they pack against the outer wall. Plasma is the lightest and stays on the inner side. Platelets
  form a band in between, with the few white cells close by. The platelet band is led out through its own port.
  Nothing passes through a membrane, and it is not dialysis.
- **Nothing changes into anything else.** The platelets were in the blood from the start; the machine only sorts.
  No red cell turns into a platelet.
- **What is collected and what goes back.** The bag holds platelets in some plasma, a pale golden product. The red
  cells and the rest of the plasma return to the donor through the same needle.
- **Red blood cells are biconcave discs.** They use a measured red cell thickness profile (Evans & Fung): a thick
  rim and a thin centre. They tumble in the flow, so some are seen tilted or edge-on. From the side the rim hides the
  thin middle, so an edge-on cell looks like a rounded bar.
- **Simplified on purpose.**
  - Time is compressed. A real platelet donation repeats many draw/return cycles and takes well over an hour; the
    film shows one cycle in 32 seconds.
  - In real machines the anticoagulant usually joins the draw line close to the needle, before the blood pump, so
    the blood is anticoagulated from the very start. The film puts the junction after the pump (the order of the
    brief), so the pump and the anticoagulant each get their own scene.
  - In RETURN the film's blood pump simply turns the other way and the blood goes back the way it came, as many
    single-needle machines do. Others collect blood in a reservoir and send it back with a separate return pump.
  - The citrate molecule is a small icon that closes like a claw. Cells, molecules and the channel are not to scale,
    and the colours are stylized (real platelet concentrate is a pale straw colour).
- **The donor** is shown only as an arm close-up and a calm silhouette under a blanket, with no drawn face
  (huashu-art-motion character rule). Nothing graphic is shown: the needle is already in place under tape.

## The machine

A generic bedside apheresis console with no brand, logo or model name. Its shape follows the common layout of real
consoles (the reference photo in the request was one of them):
- a wide, low off-white cabinet with feet and a darker gray diagonal panel at the lower right;
- a sloped front deck with two pump heads in black housings: a blue rotor for the anticoagulant and a red rotor for
  the blood (each rotor has a white bar with a roller at each end);
- black pinch clamps on the donor line, an air detector, and a cyan Y fitting where the two lines meet;
- a recess in the lower front with a drip chamber (cyan caps, two black clips) on the donor line;
- the centrifuge under a round lid on top, seen through smoked glass in a 3/4 view from slightly above;
- a touchscreen on a post with a red stop button; the screen shows DRAW or RETURN, an arrow and a gold yield bar;
- a white bottle at the back, and two IV poles with a red and a blue hook carrying the anticoagulant bag (left)
  and the platelet collection bag (right).

## Format and style

- 270×480 working canvas, upscaled exactly 4× (nearest neighbour) to 1080×1920; 30 fps; 32.000 s; H.264 (yuv420p,
  CRF 16) + AAC 256 kb/s 48 kHz stereo.
- 2D 8-bit retro medical-tech style:
  - chunky pixel sprites with 1-px outlines and flat pixel-cluster shading (no gradients, no glow);
  - every shape is drawn per canvas pixel at the current zoom, so the art stays crisp at every scale;
  - separate artwork for the clinic, the blood stream inside the tube, the citrate–calcium close-up and the spinning
    separation channel;
  - stepped pixel cuts (rings of 12-px blocks in four steps) between those artworks, no cross-fades.
- Palette:
  - dark navy #0D1B2A background;
  - off-white machine #EEF1F4;
  - deep red #B3262E red cells;
  - pale yellow #F6E7A6 plasma;
  - gold #F2B33D platelets;
  - blue-gray #9FB3C8 tubing;
  - pump rotors in blue #3A7BC8 (anticoagulant) and red (blood), a red stop button, cyan fittings;
  - muted cool chair and blanket.

## Sound

The music is an original 16-bar chiptune in F major at 120 BPM (chords F Dm Bb C | F Dm Bb C | Dm Bb F C | Dm Bb C C):
- a square-wave lead with a short echo;
- a bouncy triangle octave bass;
- light arcade drums.

The arrangement follows the picture:
- The first bar is calm: a half-time kick under the soft pulse.
- In the pump bars the melody rests and an eighth-note arpeggio locks to the pump clicks.
- The music ducks around the anticoagulant tik.
- The separation bars add a spinning 16th-note arpeggio, and the bag bars add little bell answers.
- A short snare fill in the last bar leads back into bar 1, so the loop restarts on the downbeat.

**Sound effects:**
- a soft pulse and a flow whoosh on the opening;
- tube flow whooshes while the camera travels;
- quick whooshes with falling blips on each stepped cut, sparkle tones in the stream;
- one click per roller, with a soft pump hum;
- one tik when citrate catches calcium;
- the rising spin-up whirr and the steady spin tone;
- small ticks as the layers separate, a rising tone as the platelets leave;
- bag-fill bubbles and the reward tone;
- phase-switch clicks, the return whoosh and flow;
- the success chime on the reveal, the swoosh back into the loop;
- tiny pops when a label appears (left out with `--clean`).

All of it is synthesized from code on a circular bus, so the end flows into the start. It is mastered to −14 LUFS
with a −1 dBTP ceiling.

## Files

| File | What it is |
|---|---|
| `render.py` | Command line: film, preview, stills, contact sheet, slices, audio only, asset export. |
| `requirements.txt` | numpy, Pillow, imageio-ffmpeg. |
| `镜头表.md` | The shot list (huashu-art-motion workflow) with the style lock. |
| `docs/storyboard.png`, `docs/storyboard_id.png` | Twelve key frames with English and Indonesian labels. |
| `assets/sprites/` | Exported key frames (arm, blood stream, pump, citrate–calcium, the whole machine, separation, platelet bag, return, wide reveal) and a sprite sheet of the blood cells (red cell at four angles, two platelets, a white cell). |
| `assets/audio/` | Not in git: `python render.py --assets` writes the music, effects and mix stems here. |
| `out/` | Renders go here (not in git). |
| `engine/timeline.py` | The clock, the machine layout and the choreography: events on the beat grid, tube paths, flows, both pump rotors, the centrifuge rotor, separation progress, bag level, DRAW/RETURN phase, every camera move. |
| `engine/world.py` | The clinic: room, chair and donor silhouette, arm, tubing with moving blood, and the machine: cabinet, deck, both pump heads, clamps, drip chamber, centrifuge lid, touchscreen, IV poles, bags. |
| `engine/micro.py` | The close-ups: biconcave red cells, platelets, white cells, the stream inside the tube, citrate and calcium, the separation channel. |
| `engine/scene.py` | Which view is on screen, the stepped pixel cuts, the labels. |
| `engine/labels.py` | The tiny context labels (English and Indonesian, anchors, placement). |
| `engine/audio.py`, `engine/synth.py` | Music and sound effects. |
| `engine/pen.py`, `engine/gfx.py`, `engine/view.py`, `engine/palette.py`, `engine/pixfont.py` | Pixel helpers, camera, palette, bitmap font. |

## Checks run on this project

The final film was not rendered here (as asked). These checks ran on the code and on half-size previews:

- **Shot list lint** (`storyboard_lint.py`): green, 9 shots, 32 s.
- **Film gate** (`film_gate.py --no-template`) on a half-size preview: **pass**. Fast-motion frames 52.7%, no empty
  frames, no blue-purple. One yellow note: about 9 push-ins per minute. The brief asks for three dives (into the tube,
  into the citrate close-up, into the channel) plus the zoom in and out around the spin-up. Each push-in is followed
  by a pull back or a stepped cut back out, so the camera never just keeps pushing.
- **Muted, phone-size check** (360×640 frames): the story reads without sound or labels (red tube → mixed cells →
  red pump → mint line joins → red/gold/pale layers under the lid → gold bag → wide shot). The machine parts read at
  that size: both rotors, the clamps, the drip chamber, the lid, the screen and the poles. The labels are readable
  and stay clear of the frame edges.
- **Loop seam:** the frame at 32.0 s is pixel-identical to frame 0. The step from the last frame to the first
  changes 0.49% of the pixels, the same as a normal frame step (0.51–0.64%). The camera lands on the opening framing
  three frames early, and the flow texture in each tube moves a whole number of dashes per loop.
- **Determinism:** the same frames rendered in a fresh clone are identical.
- **Audio** (measured, not listened to): 32.000 s, 48 kHz stereo, −14.0 LUFS, true peak −1.15 dBTP. The pump clicks,
  the tik, the reward tone and the success chime sit within about 3 dB of the music around them. The flows and
  bubbles sit lower as texture. The loop point has no click.
