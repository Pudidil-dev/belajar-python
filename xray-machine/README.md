# How X-Rays Are Made

A 65-second 8-bit pixel-art explainer that goes inside an X-ray tube. It follows the electrons from the hot filament
across the vacuum into the tungsten target. There they make X-ray photons, by bremsstrahlung and as characteristic
X-rays. The photons then pass through a hand and the flat-panel detector, and the film ends on the digital radiograph.

- 1080×1920 vertical, 60 fps, 65 s, H.264 + AAC stereo.
- Every frame is drawn at 270×480 and upscaled 4× with nearest-neighbour, so pixels stay crisp. The film uses one
  limited palette with ordered dithering.
- Motion and composition follow the Kurzgesagt grammar: flat shading with highlights, glowing but hard-edged particles,
  cutaways, and log-scale zooms between scales.
- The colour code is the brief's:

  | Element | Colour |
  |---|---|
  | Electrons | electric cyan |
  | Tungsten atoms | golden yellow |
  | Nuclei | orange |
  | X-ray photons | bright violet |
  | Heat | red/orange |
  | Bone | pale white |
  | Soft tissue | muted pink |
  | Circuits | cyan and green |

  The background is near-black.
- There is no narration. Each scene has its small caption from the brief and one short line of context. Small notes
  type on where and when each event happens.
- The score and sound effects are synthesized in code, with no samples:
  - 120 BPM in D minor;
  - two drops, one on bremsstrahlung and one on the image build;
  - every photon, absorption, detection and readout has its own sound, placed on the beat grid.

The finished film is `output/How_X-Rays_Are_Made.mp4`.

## Scenes

At 120 BPM one beat is 0.5 s, and every scene boundary in the brief falls on a beat.

| # | Time | Caption | What happens |
|---|---|---|---|
| 1 | 0:00 | HOW X-RAYS ARE MADE | The X-ray room: the tube head, a hand on a flat-panel detector and the monitor. The exposure clicks, the lamp turns red and a pulse fires. The radiograph pops up, then the camera rushes into the tube head. |
| 2 | 0:04 | VACUUM TUBE | The housing opens into a cutaway showing the cathode (−), the spinning anode disc (+), the vacuum, the insulating oil, and 80,000 V on the cables. The camera tracks to the cathode. |
| 3 | 0:08 | THERMIONIC EMISSION | A current heats the tungsten filament coil to over 2,000 °C. Inside the hot metal the electrons jiggle, and the most energetic escape the surface into a hovering cloud. |
| 4 | 0:13 | HIGH-VOLTAGE ACCELERATION | Field arrows point from + to −, and the electrons fly the other way. They speed up across the vacuum (meters: 0 → 80 keV, 0 → 0.50 c) and hit the anode. |
| 5 | 0:18 | TUNGSTEN TARGET | The dive continues into the tungsten: orange nuclei in golden electron clouds. Electrons arrive in extreme slow motion, and atoms they pass close to are excited. |
| 6 | 0:22 | BREMSSTRAHLUNG | One electron swings past a nucleus and its path bends. In bullet time it loses 31 keV, which leaves as a violet photon. FAST ELECTRON → ELECTROMAGNETIC DEFLECTION → ENERGY LOSS → X-RAY PHOTON. The camera then pulls back over many passes: closer passes make sharper turns and more energetic photons, and the spectrum fills in. |
| 7 | 0:29 | CHARACTERISTIC X-RAY | An atom with its K, L and M shells. An 80 keV electron knocks out a K electron, leaving a vacancy. An L electron drops in, and 69.5 − 10.2 ≈ 59 keV leaves as a Kα photon. The spectrum grows the Kα and Kβ lines. |
| 8 | 0:34 | X-RAYS + HEAT | A fast pull-back through the heating lattice to the anode disc, seen at an angle so its spin shows. The focal spot heats an arc of the track that cools as it turns. Over 99% of the energy becomes heat, under 1% X-rays. |
| 9 | 0:38 | X-RAY BEAM | Photons leave through the window. The lead-lined housing stops stray ones, the aluminium filter absorbs the weak ones (the spectrum's low end drops), and the lead shutters close in to fit the beam to the hand. |
| 10 | 0:42 | X-RAY ATTENUATION | A cross-section of the hand through the metacarpals, showing skin, soft tissue, muscle, tendons and five bones. Each photon passes straight through, is absorbed (photoelectric effect) or is scattered (Compton), depending on its path. |
| 11 | 0:47 | DIFFERENTIAL ABSORPTION | Watery soft tissue next to calcium-rich bone mineral: 10 photons in gives 6 out versus 3 out. Pulling back, the detector receives fewer X-rays behind each bone, which leaves a shadow on the image row. |
| 12 | 0:52 | DIGITAL DETECTION | Inside the flat panel: an X-ray makes a green flash in a CsI needle. A photodiode turns the light into charge. Transistor switches read the pixels out row by row, and a readout chip turns each charge into a 12-bit number. |
| 13 | 0:57 | DIGITAL RADIOGRAPH | The numbers become pixels, coarse to fine: the outline, then the finger bones, the joints and the whole hand. More X-rays makes a pixel darker and fewer makes it brighter. |
| 14 | 1:02 | HOW X-RAYS ARE MADE | Back out to the room. ELECTRONS → TUNGSTEN → X-RAY PHOTONS → HUMAN TISSUE → DETECTOR → IMAGE light up part by part. The film ends on the radiograph. |

The shot list (17 shots with camera moves) is `镜头表.md`. It passes the `huashu-art-motion` storyboard lint, with one
yellow, explained in the delivery note.

## The physics on screen

**Particles follow computed trajectories** (`engine/lib/phys.js`, `engine/lib/tungsten.js`).

- **Bremsstrahlung.** Electrons move in a screened Coulomb field of the tungsten nuclei,
  F = −k (1/r² + 1/(a r)) e^(−r/a), which is attractive, + pulling −.
  - Paths are integrated at load time (velocity Verlet), so a close pass bends hard and a distant one barely bends.
  - At closest approach the electron gives up exactly the energy its photon carries, and continues slower.
  - Photons travel at twice the electrons' arrival speed: light versus 0.50 c.
  - Wavelength shortens with photon energy (λ = 1.24 nm / E[keV], scaled to stay visible).
  - Each approach is routed through a gap in the lattice, so an electron is not deflected by another atom first.
- **Thermionic emission and acceleration.** Electrons escape the hot metal and hover as a space-charge cloud. In the
  uniform field they gain energy in proportion to distance, and their speed is the relativistic speed for that energy.
- **Characteristic X-ray.** Tungsten's binding energies are used: K 69.5 keV, L 10.2 keV and M 2.3 keV. That gives
  Kα ≈ 59 keV and Kβ ≈ 67 keV.
- **Spectrum readout.** The continuum follows Kramers' law (intensity ∝ 80 keV − E), with the K lines on top. The
  aluminium filter's transmission falls as E⁻³.
- **The hand.** Its geometry is used in two ways:
  - The radiograph is computed, not painted: each pixel integrates attenuation along the beam through soft tissue and
    through each bone, modelled as a hollow tube of cortex and marrow. That is why cortical edges come out brightest.
  - The cross-section uses the same model: each photon's fate is drawn from its real path through skin, soft tissue,
    cortex and marrow, each with its own attenuation (cortical bone about 5× soft tissue at roughly 40 keV).

### Accuracy choices (the brief's 15 requirements)

- X-rays are shown as electromagnetic wave packets. A note says they are invisible and that the violet is for
  illustration.
- Electrons come from the heated cathode, and the high voltage accelerates them. The field arrows point the physically
  correct way, and the negative electrons move against them.
- Bremsstrahlung is a change of velocity in the nucleus's field with no collision. A note says nothing is split and no
  nuclear reaction happens. There is no fission and no radioactive decay anywhere in the film.
- Characteristic X-rays come from an electron transition after inner-shell ionization. They are shown as fixed lines,
  clearly different from the continuum.
- More than 99% of the energy becomes heat. The anode spins (about 3,000–10,000 rpm) to spread it round a ring.
- Different tissues attenuate differently, and bone attenuates more than soft tissue. Calcium's photoelectric absorption
  rises roughly with Z³.
- The detector records transmitted X-rays. Bones never glow: they cast a shadow, and that shadow is shown white because
  fewer photons reached those pixels.
- It is a controlled medical procedure:
  - the beam is filtered and collimated to the hand;
  - the dose of a hand X-ray is about 3 hours of natural background radiation (≈0.001 mSv);
  - the machine contains no radioactive material.

### Honest limits

- **Not to scale.** Atoms are not to scale: a real nucleus is about 1/20,000 of its atom. The atomic scenes are slowed
  by about 10¹⁸.
- **80 kV is an example.** The film uses an example tube voltage of 80 kV. Hand radiographs are often taken at about
  50–60 kV, and below 69.5 kV tungsten emits no K lines, so 80 kV was chosen to make the characteristic process
  possible. A note in the film says the process needs an electron above 69.5 keV.
- **Semiclassical bremsstrahlung.** The rule "closer pass, sharper turn, more energy" is the semiclassical picture.
  Real emission is probabilistic, and any pass can emit any energy up to the electron's own.
- **Illustrative numbers.** Attenuation coefficients and photon counts are illustrative but in proportion: 6 of 10
  through soft tissue against 3 of 10 through bone. The detector's 12-bit readings are illustrative too.

## How it was made

It was built with the `huashu-art-motion` skill in `.claude/skills/`, using:

- the shot list and its lint;
- a contact-sheet review of every scene;
- a label collision scan;
- the skill's `qa.py`;
- `deliver.py` with its film gate (the delivery note is `output/交付说明.md`).

```
engine/                 the animation (open engine/index.html through a local web server to preview)
  lib/pix.js            270×480 pixel pipeline: palette, Bayer-dither quantizer, bitmap font, labels
  lib/kit.js            camera helpers, noise, direct pixel access, shapes
  lib/fx.js             electrons, photon wave packets, nuclei, electron clouds, lighten-only dithered glows, heat
  lib/cap.js            scene captions, event notes, step lists
  lib/phys.js           screened Coulomb trajectories (integrated once, played back), relativistic speed
  lib/tungsten.js       the shared tungsten lattice for scenes 5–8
  lib/hand.js           the hand: bones, computed radiograph, cross-section and its attenuation paths
  lib/tube.js           the tube head in side cutaway (millimetres; detail appears with zoom)
  lib/room.js           the X-ray room
  lib/hud.js            the spectrum readout
  lib/util.js, motion.js, camera.js   from huashu-art-motion (MIT)
  film.js               timeline (14 scenes on the beat grid), dither dissolve, qa hooks
  scenes/s01…s14        one file per scene
tools/render.py         headless Chromium → PNG frames → ffmpeg 4× nearest-neighbour → MP4; stills, contact sheets, cues
tools/synth_audio.py    the score and sound effects from the cue sheet (numpy/scipy)
tools/text_check.py     label collision / out-of-frame scan
tools/video_diffs.py    frame-to-frame change of a rendered film (finds pops and strobing)
tools/frame_diffs.py, pair_diff.py   per-scene diff curve, two-frame diff
```

To re-run everything (needs uv, ffmpeg and Playwright Chromium 141):

```sh
R="uv run --with playwright==1.56.0 --with pillow python tools/render.py"
$R --cues build/cues.json
uv run --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json build/score.wav
$R --out build/How_X-Rays_Are_Made.mp4 --audio build/score.wav --crf 16 --fps 60
```

Every random value is seeded, so every frame and the soundtrack are reproducible.
