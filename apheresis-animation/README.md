# How an Apheresis Machine Takes Platelets and Returns Your Blood

A 56-second vertical medical-science short in 2D 8-bit retro medical-tech pixel art, with an original 120 BPM
chiptune and synced sound effects.

The whole film is **one continuous camera journey**, with no cuts and no transitions. The camera pans along the
tubing and zooms in and out:
- it goes down into the blood inside the tube, then further down to the molecules in the plasma, and back out;
- it rises to the blood pump and pulls out to the whole machine;
- it zooms into the centrifuge lid and tilts down into the spinning channel where the blood separates;
- it follows the platelets up to their bag and pulls out wide while the rest of the blood goes back to the donor.

The film ends on the result of the donation: the sealed platelet bag lifts off its hook and is shown like a
**rare item** in a game, with effects only and no text.

The machine is a generic bedside apheresis console with no brand or logo. Its shape follows the common layout of
real consoles: a wide, low cabinet with the pumps on a sloped front deck, the centrifuge under a round lid on top,
a touchscreen on a post and two IV poles.

![storyboard](docs/storyboard.png)

Labels in Bahasa Indonesia (`--lang id`): [docs/storyboard_id.png](docs/storyboard_id.png)

## Ringkasan (Bahasa Indonesia)

Video 56 detik, vertikal 1080×1920, pixel art 8-bit bergaya alat medis retro. Seluruh video adalah **satu perjalanan
kamera tanpa potongan dan tanpa transisi**: kamera bergeser, zoom in dan zoom out.

1. **0–5 dtk.** Close-up lengan donor dengan tangan yang rileks. Darah sudah mengalir di selang. Kamera mengikuti
   selang sepanjang lengan sampai ke jalur di lantai (label AMBIL / DARAH KE MESIN).
2. **5–7 dtk.** Pompa antikoagulan (rotor biru) mengalirkan antikoagulan, dan selangnya turun lalu bergabung dengan
   darah di sambungan Y, dekat sisi jarum.
3. **7–13 dtk.** Kamera zoom masuk ke dalam selang. Sel darah merah, trombosit, plasma dan bintik sitrat mengalir
   bersama, masih tercampur.
4. **13–18 dtk.** Kamera zoom lebih dalam lagi ke plasma: sitrat mengikat ion kalsium ("tik"), jadi darah tidak
   membeku.
5. **18–26 dtk.** Kamera zoom keluar lagi, naik melewati drip chamber dan klem ke pompa darah. Dua roller mendorong
   darah.
6. **26–30 dtk.** Darah naik ke sentrifus. Kamera mundur memperlihatkan seluruh mesin saat rotor mulai berputar.
7. **30–39 dtk.** Kamera zoom ke tutup sentrifus lalu menunduk (tilt) melihat langsung ke saluran pemisah. Sel darah
   merah (paling berat) ke luar, plasma (paling ringan) di dalam, trombosit emas di tengah. Trombosit keluar lewat
   lubangnya sendiri.
8. **39–46 dtk.** Kamera naik lagi, mundur, dan mengikuti aliran trombosit ke kantong. Tetesan jatuh ke kantong dan
   isinya naik.
9. **46–49 dtk.** Kamera mundur lebar: layar berganti ke KEMBALI dan sisa darah (sel merah + plasma) kembali ke
   donor lewat selang yang sama. Lalu layar menunjukkan DONE.
10. **49–56 dtk.** **Hasil donor:** kamera mendekat ke kantong trombosit. Selangnya disegel, kantong terangkat dari
    gantungannya, lalu tampil seperti item langka di game, hanya dengan efek visual tanpa tulisan: layar meredup,
    sinar emas berputar, gelombang kejut dan semburan emas saat fanfare, lima kilauan besar, garis cahaya dan kilap
    pada kantong. Video selesai di sini (tidak berulang).

**Yang direvisi di versi ini:**
- **Tanpa transisi:** lensa pembesar dihapus. Kamera benar-benar bergerak masuk dan keluar, dan detail halus (sel,
  molekul, saluran pemisah) muncul karena kamera makin dekat.
- **Antikoagulan:** sekarang bergabung dekat sisi jarum sebelum pompa, seperti di mesin sungguhan.
- **Tidak berulang:** tidak lagi kembali ke awal. Video ditutup dengan hasil donor, yaitu kantong trombosit sebagai
  item langka.
- **Penutup bersih:** tanpa caption atau banner, hanya efek visual.

Tidak ada narasi dan tidak ada kotak caption, hanya label yang menempel pada bendanya. Default bahasa Inggris,
`--lang id` untuk Bahasa Indonesia, `--clean` tanpa label sama sekali.

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
| Preview | `python render.py --preview` | `out/preview.mp4`: half size (540×960) with sound, under a minute to make |
| Render | `python render.py` | `out/apheresis.mp4`: the final film |

**Output path:** `belajar-python/apheresis-animation/out/apheresis.mp4`. It is a vertical 9:16 H.264 MP4, 1080×1920,
30 fps, exactly 56.000 s (1680 frames), with synchronized AAC 48 kHz stereo audio. On a 4-core machine it takes
about one to two minutes; slower machines take a few minutes.

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
python render.py --clean        # no labels -> out/apheresis_clean.mp4
python render.py --assets       # key-frame sprites + cell sprite sheet -> assets/sprites/, audio stems -> assets/audio/
```

On Windows, write `py` instead of `python` if `python` is not found. On some Linux and macOS systems the commands are
`python3` and `pip3`.

More options:

```bash
python render.py --stills 0,11.6,37.6,55        # full-size PNG frames -> out/stills/
python render.py --sheet 0:56:2 --cols 8        # contact sheet -> out/sheet.png
python render.py --from 30 --to 40 --out out/slice.mp4   # just a slice (with its part of the soundtrack)
python render.py --audio-only                   # soundtrack only -> out/music.wav, out/sfx.wav, out/mix.wav
python render.py --scale 8                      # 2160x3840 (4K vertical) instead of 1080x1920
```

## The camera journey (120 BPM, one bar = 2 s, 28 bars)

| Time (s) | Where the camera goes | What you see | Sound |
|---|---|---|---|
| 0–5 | Along the arm, down to the floor | The donor's arm with a relaxed hand, the needle already under tape, the tube resting on the hand with blood flowing. The camera follows the tube down to where it runs along the floor into the machine. | a soft double pulse, a gentle flow, the calm first bar |
| 5–7 | The anticoagulant joins | The anticoagulant pump (blue rotor) turns slowly; its mint line comes down the front of the cabinet into a cyan Y fitting on the donor line. | |
| 7–9.5 | Zoom into the tube | Just after the Y fitting the camera zooms into the tube. The red resolves into cells in pale plasma, and the tube's walls slide out of the frame. | a soft rising shimmer |
| 9.5–13 | Inside the tube | Deep-red biconcave red cells tumble past with gold platelets, a white cell and small mint specks of citrate from the anticoagulant, all still mixed. The camera drifts with the flow. | sparkle tones |
| 13–18 | Zoom into the plasma | The camera keeps zooming, into a small parcel of plasma between the cells. Calcium ions and citrate appear; one citrate closes on a calcium ion (two-frame gold flash). | a higher shimmer, one **tik** at 16.2 s over soft held chords |
| 18–22.5 | All the way back out | The camera pulls back out through the stream and the tube, then rises along the line past the drip chamber and the clamps. | a falling shimmer, the pump fading in |
| 22.5–26 | The blood pump | The blood pump in cutaway: the red rotor's two rollers pinch the tube in turn and push the blood forward. | a click for every roller, a soft hum, an arpeggio locked to the clicks |
| 26–30 | Up to the centrifuge, then wide | The camera follows the blood up into the centrifuge and pulls out to the whole machine as the rotor spins up. | a rising whirr, then a steady spin tone |
| 30–33.7 | Into the lid, tilting down | The camera zooms into the lid. The ring of cells resolves inside the lid window, then the camera tilts down to look straight into the channel. | a rising shimmer |
| 33.7–39 | The separation | Red cells drift to the outer wall, plasma stays inside, and a gold platelet band forms between them with the white cells close by. The camera drifts to the port where the platelet band leaves. | a spinning 16th-note arpeggio, rising ticks, a rising tone as the platelets leave |
| 39–44 | Back up, out, and along the gold line | The camera tilts back up, pulls out of the lid and follows the gold platelet line up to the bag on the right pole. | a falling shimmer, a gentle flow |
| 44–46 | The bag fills | Drops of platelet product fall in, each with a ripple, and the level rises. | a plip for each drop, a reward tone |
| 46–49 | Wide: the return | The camera pulls out to the donor and the machine. The screen flips to RETURN, the pump turns the other way and the rest of the blood goes back along the same tube. Then the screen shows DONE. | the phase click, the pump clicking backwards, a soft "done" chime |
| 49–52 | Push in on the bag | The camera pushes in on the platelet bag. The line is sealed with a click, and the bag lifts off its hook. | the seal click, a build-up, a shimmer as it lifts |
| 52–56 | The rare item (effects only, no text) | The clinic dims and golden rays turn behind the bag. On the fanfare hit the rays flare, a white and a gold shockwave ring push outward, and a burst of gold specks flies out. Five big sparkles flash around the bag one by one. The bag glows with a colour-cycling outline, bobs, and a shine sweeps across it. The film ends here. | an impact, an original fanfare (F, Bb, C, a big F, ta-da), a ting for each big sparkle |

## Labels (default; `--clean` removes them)

There is no narration and no caption box. Each label is a name and, where it helps, one short line about what the
thing does. It sits on a small dark plate joined to the thing by a dotted leader line, types in quickly and follows
it on screen. The first line is white; the second is in the colour of the subject.

| Time (s) | English | Indonesian (`--lang id`) | Pinned to |
|---|---|---|---|
| 2.2–4.8 | DRAW / BLOOD TO THE MACHINE | AMBIL / DARAH KE MESIN | the tube |
| 5.4–6.9 | ANTICOAGULANT / STOPS CLOTTING | ANTIKOAGULAN / CEGAH PEMBEKUAN | the anticoagulant line |
| 9.9–12.8 | RED CELL · PLATELETS · PLASMA / ALL STILL MIXED · CITRATE / FROM THE ANTICOAGULANT | SEL DARAH MERAH · TROMBOSIT · PLASMA / MASIH TERCAMPUR · SITRAT / DARI ANTIKOAGULAN | one of each, moving with the flow |
| 15.3–17.9 | CITRATE · CALCIUM, then CALCIUM HELD / SO NO CLOT FORMS | SITRAT · KALSIUM, then KALSIUM DIIKAT / JADI TIDAK MEMBEKU | the molecule and the ion |
| 23.0–25.8 | BLOOD PUMP / ROLLERS PUSH THE BLOOD | POMPA DARAH / ROLLER MENDORONG DARAH | the pump rotor |
| 28.2–29.9 | CENTRIFUGE / SPINS VERY FAST | SENTRIFUS / BERPUTAR SANGAT CEPAT | the lid |
| 33.6–38.8 | RED CELLS / HEAVIEST: OUTSIDE · PLATELETS / IN THE MIDDLE · PLASMA / LIGHTEST: INSIDE · PLATELETS / LEAVE HERE | SEL DARAH MERAH / PALING BERAT: LUAR · TROMBOSIT / DI TENGAH · PLASMA / PALING RINGAN: DALAM · TROMBOSIT / KELUAR DI SINI | the three layers and the platelet port |
| 44.3–45.9 | PLATELETS / COLLECTED | TROMBOSIT / TERKUMPUL | the bag |
| 46.8–48.9 | RETURN: RED CELLS + PLASMA / GO BACK TO THE DONOR | KEMBALI: SEL MERAH + PLASMA / MASUK LAGI KE DONOR | the needle site |

The ending has no text at all: the rare-item moment is told with effects only.

The machine screen also shows the phase: DRAW (arrow toward the machine), RETURN (arrow toward the donor) and, at
the end, DONE with a check mark.

## The science shown

- **Apheresis.** Blood is drawn, one component is collected, and everything else goes back to the donor. Here the
  collected component is platelets (plateletpheresis). The result of the donation is the bag of platelets, which
  is why the film ends on it.
- **Single needle: DRAW, then RETURN, never both.** With one needle the machine alternates. It draws for a while,
  then returns, then draws again, and the screen always shows which phase is running. The film shows one cycle and
  then the end of the donation. (Some machines use two needles, one in each arm, to draw and return at the same
  time.)
- **Anticoagulant first.** The anticoagulant pump adds a small, steady stream of citrate to the blood close to the
  needle side, before the blood pump, so the blood does not clot anywhere in the machine. Citrate binds the calcium
  ions that the clotting reaction needs; the zoom into the plasma shows that one idea.
- **Peristaltic pumps.** Rollers squeeze the outside of the tube, so the blood only ever touches the sterile,
  single-use tubing set, never the pump.
- **Separation by spinning, not by a filter.** The spinning channel pushes the denser parts outward. Red cells are
  the densest, so they pack against the outer wall. Plasma is the lightest and stays on the inner side. Platelets
  form a band in between, with the few white cells close by. The platelet band is led out through its own port.
  Nothing passes through a membrane, and it is not dialysis.
- **Nothing changes into anything else.** The platelets were in the blood from the start; the machine only sorts.
- **What is collected and what goes back.** The bag holds platelets in some plasma, a pale golden product. The red
  cells and the rest of the plasma return to the donor through the same needle.
- **Red blood cells are biconcave discs.** They use a measured red cell thickness profile (Evans & Fung): a thick
  rim and a thin centre. They tumble in the flow, so some are seen tilted or edge-on.
- **Simplified on purpose.**
  - Time is compressed. A real platelet donation repeats many draw/return cycles and takes well over an hour; the
    film shows one cycle and then the finished bag.
  - In RETURN the film's blood pump simply turns the other way and the blood goes back the way it came, as many
    single-needle machines do. Others collect blood in a reservoir and send it back with a separate return pump.
  - The scales are stylized. Cells and molecules are not to scale (the zoom from the tube to the ions is far smaller
    than the real one), the citrate molecule is a small icon that closes like a claw, and the colours are stylized.
  - The "rare item" ending is a playful game image for the value of the donation, not a medical claim.
- **The donor** is shown only as an arm with a relaxed hand and a calm silhouette under a blanket, with no drawn
  face (huashu-art-motion character rule). Nothing graphic is shown: the needle is already in place under tape.

## The machine

A generic bedside apheresis console with no brand, logo or model name. Its shape follows the common layout of real
consoles (the reference photo in the request was one of them):
- a wide, low off-white cabinet with feet and a darker gray diagonal panel at the lower right;
- a sloped front deck with two pump heads in black housings: a blue rotor for the anticoagulant and a red rotor for
  the blood (each rotor has a white bar with a roller at each end);
- black pinch clamps, an air detector, and a cyan Y fitting where the anticoagulant joins the donor line;
- a recess in the lower front with a drip chamber (cyan caps, two black clips) on the donor line;
- the centrifuge under a round lid on top, seen through smoked glass in a 3/4 view from slightly above;
- a touchscreen on a post with a red stop button; the screen shows DRAW, RETURN or DONE and a gold yield bar;
- a white bottle at the back, and two IV poles with a red and a blue hook carrying the anticoagulant bag (left)
  and the platelet collection bag (right).

## Format and style

- 270×480 working canvas, upscaled exactly 4× (nearest neighbour) to 1080×1920; 30 fps; 56.000 s; H.264 (yuv420p,
  CRF 16) + AAC 256 kb/s 48 kHz stereo.
- One continuous camera, no cuts, no transitions:
  - every shape is drawn per canvas pixel at the current zoom, so the art stays crisp at every scale;
  - the finer worlds are nested in the clinic where they really are: the stream inside the tube's lumen just after
    the Y fitting, the molecules inside a small parcel of that plasma, the separation channel under the lid. The
    camera can zoom from the clinic down to the ions (about 700× closer) and back;
  - as the camera closes in, the finer world resolves inside the coarser one through an ordered pixel dither tied
    to the zoom, so detail appears because the camera got closer;
  - over the centrifuge the camera tilts down to look straight into the channel, and tilts back up before it pulls
    out;
  - camera moves follow the skill's camera language: slow pushes (about 1–2.5 s, eased), pull-outs that settle, and
    pans that follow the blood.
- 2D 8-bit retro medical-tech style: chunky pixel sprites with 1-px outlines and flat pixel-cluster shading.
  - The tubing is one smooth clear tube: a lit and a shaded side, a glossy band, an outline, and cells flowing
    inside. It squeezes flat under a pump roller.
  - The arm is built from tapered limbs, with a relaxed hand, a thumb, finger lines and a nail, plus two strips of
    tape.
- The finale is a game-style reward in effects only, with no caption:
  - the clinic dims;
  - golden rays turn behind the bag, with twinkling sparkles;
  - on the fanfare hit the rays flare, a white and a gold shockwave ring push outward, and a burst of gold specks
    flies out;
  - five big sparkles flash around the bag in time with the five tings;
  - the bag has a glowing outline that cycles colours, a shine sweep and a gentle bob.
- Palette:
  - dark navy #0D1B2A background;
  - off-white machine #EEF1F4;
  - deep red #B3262E red cells;
  - pale yellow #F6E7A6 plasma;
  - gold #F2B33D platelets and the reward;
  - blue-gray #9FB3C8 tubing;
  - pump rotors in blue #3A7BC8 (anticoagulant) and red (blood), a red stop button, cyan fittings;
  - muted cool chair and blanket.

## Sound

The music is an original 28-bar chiptune in F major at 120 BPM (chords F Dm Bb C | F Dm Bb C | Dm Bb F C |
F Dm Bb C | Bb C Am Dm | Bb C F Dm | Bb C F F):
- a square-wave lead with a short echo;
- a bouncy triangle octave bass;
- light arcade drums.

The arrangement follows the journey:
- The first bar is calm.
- In the molecule bars the beat thins to soft held chords around the tik.
- In the pump bars an eighth-note arpeggio locks to the pump clicks.
- The separation bars add a spinning 16th-note arpeggio, and the bag bars add little bell answers.
- The seal-and-lift bar builds with a rising arpeggio and a snare roll.
- The last two bars are an original rare-item fanfare: a bright F hit, Bb, C, a big F chord with a sparkle run,
  and a final "ta-da" that rings out.

**Sound effects:**
- a soft pulse and a gentle flow on the opening;
- a soft rising shimmer for each zoom in and a falling one for each zoom out (no whooshes);
- sparkle tones in the stream;
- one tik when citrate holds calcium;
- one click per pump roller, with a soft hum;
- the rising spin-up whirr and the steady spin tone;
- ticks as the layers separate, a rising tone as the platelets leave;
- a plip for each drop that lands in the bag, a reward tone;
- the phase click, the pump clicking backwards, the return flow, a soft "done" chime;
- the seal click, a shimmer as the bag lifts, an impact for the shockwave, a ting for each big sparkle;
- tiny pops when a label appears (left out with `--clean`).

All of it is synthesized from code and mastered to −14 LUFS with a −1 dBTP ceiling. The last chord fades out at the
very end.

## Files

| File | What it is |
|---|---|
| `render.py` | Command line: film, preview, stills, contact sheet, slices, audio only, asset export. |
| `requirements.txt` | numpy, Pillow, imageio-ffmpeg. |
| `镜头表.md` | The shot list (huashu-art-motion workflow) with the style lock. |
| `docs/storyboard.png`, `docs/storyboard_id.png` | Twelve key frames with English and Indonesian labels. |
| `assets/sprites/` | Exported key frames (arm, anticoagulant, blood stream, citrate–calcium, pump, the whole machine, separation, platelet bag, return, rare item) and a sprite sheet of the blood cells. |
| `assets/audio/` | Not in git: `python render.py --assets` writes the music, effects and mix stems here. |
| `out/` | Renders go here (not in git). |
| `engine/timeline.py` | The clock, the machine layout, the tube paths, the nested worlds (where they sit and at what scale) and the one camera for the whole film. |
| `engine/scene.py` | Draws the clinic and the nested worlds at the camera's zoom, resolves them with the zoom-tied dither, the labels, and the rare-item finale. |
| `engine/world.py` | The clinic: room, chair and donor silhouette, the arm and hand, the per-pixel tubing, and the machine: cabinet, deck, both pump heads, clamps, Y fitting, drip chamber, centrifuge lid, touchscreen, IV poles, bags. |
| `engine/micro.py` | The finer worlds: biconcave red cells, platelets, white cells, the stream inside the tube, citrate and calcium, the separation channel. |
| `engine/labels.py` | The explanation labels (English and Indonesian). |
| `engine/audio.py`, `engine/synth.py` | Music, fanfare and sound effects. |
| `engine/pen.py`, `engine/gfx.py`, `engine/view.py`, `engine/palette.py`, `engine/pixfont.py` | Pixel helpers, camera (with a separate vertical scale for the tilt), palette, bitmap font. |

## Checks run on this project

These checks ran on the code and on half-size previews:

- **Shot list lint** (`storyboard_lint.py`): 15 rows, 56 s, no red. One yellow: the first shot has a label. It
  appears only after two seconds of picture and names what the film is about (DRAW: blood to the machine).
- **Film gate** (`film_gate.py --no-template`) on a half-size preview: **pass**. It measures the whole film as
  **one shot with 0 hard cuts and 0 fades**. Fast-motion frames 53.2%, no empty frames, no blue-purple. One yellow
  note: about 11 push-ins per minute (3 of them fast). The journey zooms into the tube, the plasma, the lid and the
  bag, and each zoom in is answered by a zoom out or a pull back (push-ins are 53% of push/pull moves).
- **No jumps:** the largest change between two frames was measured on the preview. After the tilt over the
  centrifuge became its own 1.3 s camera move and the pull-outs were eased, no frame changes more than a normal fast
  camera move.
- **Muted, phone-size check** (360×640 frames): the story reads without sound, the labels are readable at that
  size, and the ending reads as a reward without any text.
- **Determinism:** the same frames rendered twice are identical.
- **Audio** (measured, not listened to): 56.000 s, 48 kHz stereo, −14.0 LUFS, true peak −1.15 dBTP; the last chord
  fades out, so the file ends in silence.
