# How Electron Microscopes See Atoms

A 115-second 8-bit pixel-art explainer about an aberration-corrected scanning transmission electron microscope
(STEM) imaging single gold atoms in high-angle annular dark-field (HAADF) mode. It opens on the result and works
backward to how it was made.

The first frame is a HAADF-STEM micrograph: bright dots on dark speckle. A cursor ring snaps onto one dot ("ONE GOLD
ATOM"), the camera punches in until the image pixels and a line profile show, then pulls all the way back: the
micrograph becomes a panel on a monitor, the monitor sits in a lab, and a 3 m microscope column stands behind it.
From there the film follows the electrons in order:

1. the cutaway column;
2. loading the specimen;
3. the pump-down;
4. field emission from a tungsten tip;
5. 200 kV acceleration;
6. the electron's wavelength;
7. magnetic lenses and aberration correction;
8. the raster scan;
9. scattering off one gold atom, then gold against carbon;
10. the ring-shaped detector;
11. the image built pixel by pixel.

It ends on the same atom and rushes back into the first frame, so the video loops.

- 1080×1920 vertical, 60 fps, exactly 115 s, H.264 + AAC stereo.
- Every frame is drawn at 270×480 and upscaled 4× with nearest-neighbour. One limited palette with 4×4 ordered
  dithering keeps the pixels crisp.
- Motion follows the Kurzgesagt grammar:
  - flat shading with rim light;
  - hard-edged glows;
  - cutaways;
  - log-scale zooms between scales (the specimen dive spans about 7 decades, from the holder to the atoms).
- No narration and no subtitles. Labels sit next to the thing they name, plus a short scene caption.
- The score and sound effects are synthesized in code with no samples. It is a game-soundtrack groove at 120 BPM in A
  minor:
  - chip-style square and pulse voices over a modern kick with sidechain pump and a bouncing octave bass;
  - one Am–F–C–G loop and one lead hook that every scene re-orchestrates;
  - a held breath before the first scattering event;
  - an A-major final hit;
  - a rewind that runs into the opening impact.

The finished film is `output/How_Electron_Microscopes_See_Atoms.mp4`.

## The micrograph is computed

`engine/lib/haadf.js` synthesizes the image the way the instrument records it:

- **The specimen.** Isolated gold atoms (a few pairs and a 20-atom raft) sit on a 3 nm amorphous carbon film, about
  300 carbon atoms per nm² in projection, with the thickness wandering ±25%.
- **The signal.** Each pixel is the probe intensity summed over the atoms, weighted by high-angle scattering strength
  ∝ Z^1.7: gold (Z = 79) gives 1683 and carbon (Z = 6) gives 21. The probe is a 0.07 nm core broadened by thermal
  motion, plus a faint aberration tail.
- **The noise.** Counts carry Poisson shot noise (about 55 counts at a gold atom). Line-to-line scan jitter and gain
  wobble are added on top.
- **Sampling.** 0.025 nm per pixel. 270 × 480 pixels give a 6.75 × 12 nm field of view, so at the opening one image
  pixel is one screen pixel.

The same atom positions are used everywhere the specimen appears: in the dive, the raster scan, the scattering scene
and the reconstruction. The look follows the user's reference figures: bright Gaussian spots, a dashed cursor ring,
a line profile with a Gaussian fit, atom-finding rings, and HAADF bright against BF dark.

## Physics in the film

- **Source.** A cold field-emission gun. The tungsten tip has an apex radius of ~100 nm. The extraction field
  (~5 V/nm) tilts the 4.5 eV surface barrier until it is ~1 nm thick at the Fermi level, and the electron's wave leaks
  through. Electrons are drawn as particles only after they have tunnelled out.
- **Acceleration.** Eight ring electrodes step from −200 kV to ground, 25 keV per gap. At 200 keV the electron
  reaches v = 0.70 c and λ = h/p = 2.51 pm (relativistic), about 200,000× shorter than visible light. The wavelength
  panel shows λ at every voltage of the ramp.
- **Vacuum.** The gun stays sealed behind its closed valve at ~10⁻⁹ Pa. Below it, the turbo pump takes the column from
  10⁵ Pa (1 atm), and under ~10⁻² Pa the ion pumps take over, down to 10⁻⁵ Pa: ten billion times fewer molecules, but
  still billions per cm³. Then the valve opens.
- **Lenses.** Each magnetic lens is a copper coil in an iron yoke whose pole pieces concentrate the field in the gap.
  Rays are traced through a bell-shaped (Glaser) field, r'' = −K·b(z)²·r in the rotating frame. Each electron spirals
  by θ' = √K·b(z) as it focuses, and more current means a shorter focus.
- **Correction.** Round lenses always bend outer rays too much (spherical aberration). A multipole corrector, imaged
  onto the objective by transfer lenses, cancels it.
- **The probe.** Computed as a wave, ψ(r) = ∫ e^{−iχ(k)} J0(2πkr) 2πk dk:
  - uncorrected (Cs = 1.2 mm, 10 mrad, Scherzer defocus): FWHM 0.136 nm;
  - corrected (18 mrad): FWHM 0.075 nm (the brief's ~0.07 nm, labelled as illustrative), with its diffraction ring.
- **Scanning.** Scan coils tilt the beam about a pivot so the probe moves while the sample stays put. Each position
  gives one pixel. About 30 pA means roughly one electron in the column at a time, hundreds per pixel. One atom is
  knocked to a new site by the beam, and the image records it half in each place.
- **Scattering.** Electrons are integrated through a screened Coulomb potential V ∝ −Z·e^{−r/a}/r with
  a ∝ Z^{−1/3}. Far passes barely deflect; close passes swing wide. Impact points are sampled from the probe's profile
  in 3D (σ ≈ 0.032 nm, narrower than the atom), so the fraction that reaches the HAADF range is honest:
  - with the probe on one gold atom, only passes within ~0.01 nm of the nucleus reach ≥ 70 mrad;
  - a screened-Rutherford estimate gives ~2–4 % of electrons.

  On screen that is 3 of 72 electrons, and gold scores 6 hits out of 150 against carbon's 0 (Z^1.7 predicts about 0.08).
  Hits count only when they land on the detector bars. Drawn angles are exaggerated and labelled as such (real HAADF
  angles are ~70–200 mrad).
- **Detection.** The HAADF annulus catches the high-angle electrons; low-angle ones drop through the hole toward the
  bright-field detector. The chain is scintillator → light guide → photomultiplier (×3 per dynode) → current pulse →
  ADC → pixel. A note says that other detector types exist.

## Scenes

At 120 BPM one beat is 0.5 s; every scene boundary in the brief falls on a beat.

| # | Time | Label | What happens |
|---|---|---|---|
| 1 | 0–4 | ONE GOLD ATOM | Micrograph at 1:1 → cursor ring → punch-in to the atom's pixels and a line profile with its Gaussian fit → the micrograph shrinks onto a monitor. |
| 2 | 4–9 | ELECTRON MICROSCOPE | The pull-back continues: monitor readouts, desk, the lab and the column on its isolation platform. "Over 100,000× smaller than a hair." |
| 3 | 9–16 | INSIDE THE MICROSCOPE | A cutting plane opens the column; the camera tracks down the beam path past gun, accelerator, condenser lenses, corrector, scan coils, specimen stage, detectors, pumps and electronics. |
| 4 | 16–23 | ULTRATHIN SAMPLE | A robotic gripper sets the 3 mm grid in the holder, the clamp clicks, the holder slides in; a dive through grid, mesh, lacey carbon and film to a cutaway of gold atoms on 3 nm of carbon with electrons passing through. |
| 5 | 23–30 | HIGH VACUUM | Back out to the column; the airlock seals, pumps spin up, the gas thins and its collisions stop; the gauge falls to 10⁻⁵ Pa; the camera rises to the gun. |
| 6 | 30–38 | FIELD EMISSION | The field crowds onto the tip; a dive to the apex and its atoms; the barrier tilts, the wave leaks through, electrons appear one by one; back out to a narrow beam. |
| 7 | 38–45 | ELECTRON ACCELERATION | The camera rides one electron through eight gaps: energy and speed meters climb to 200 keV and 0.70 c. |
| 8 | 45–52 | WHY ELECTRONS? | Light (λ ≈ 500 nm) turns two atoms into one blur; the electron's wave tightens as momentum rises and resolves them; "but lens flaws also limit detail". |
| 9 | 52–59 | ELECTROMAGNETIC LENS | The condenser lens becomes a diagram: current, field lines, spiralling rays meeting at a focus that moves up as the current rises. |
| 10 | 59–66 | ABERRATION CORRECTION | Outer rays focus too soon, the probe is blurred; the 12-pole corrector switches on; all rays meet; extreme zoom into the probe: 0.14 → 0.07 nm, next to a gold atom's size. |
| 11 | 66–74 | RASTER SCANNING | Scan coils tilt the beam; from above, the probe steps across atoms on carbon, leaving measured pixels; a detector trace; an atom hops under the beam. |
| 12 | 74–83 | ELECTRON SCATTERING | Side view of one gold atom (nucleus, cloud, potential); a held beat, then the first electron swings wide, and the view shakes on each hard swing; a stream builds a fan of mostly straight paths and a few high-angle ones (3 of 72). |
| 13 | 83–91 | WHY GOLD ATOMS APPEAR BRIGHT | The same 150 electrons at carbon (Z = 6) and gold (Z = 79): 0 vs 6 hits on the detector → a dark and a bright pixel. |
| 14 | 91–99 | HAADF DETECTOR | The ring and its hole; the same atoms bright in HAADF and dark in BF; inside the ring: scintillator flash → light guide → photomultiplier cascade → current pulses. |
| 15 | 99–108 | ATOMIC-RESOLUTION IMAGE | Pulse → ADC → number → pixel; the micrograph builds on the monitor, first pixel by pixel, then row by row; rings mark every atom found. |
| 16 | 108–115 | HOW ELECTRON MICROSCOPES SEE ATOMS | Back on the same atom; a fast pull-back to the cut-open microscope with the chain source → lenses → atom → scattering → detector → image, each with a small icon; the title; a rush back into the first frame. |

## Files

```
engine/
  index.html, film.js          timeline (16 scenes, exactly 115 s) and frame loop
  lib/haadf.js                 the synthetic HAADF micrograph (atoms, probe, Z-contrast, noise, mips, profiles)
  lib/lab.js                   the lab, the workstation monitor UI, the microscope's exterior
  lib/column.js                the microscope cut open along its axis
  lib/sample.js                holder tip, grid, gripper, the specimen dive, the cutaway slab, scale bar
  lib/gun.js                   tungsten tip and apex, the surface barrier diagram
  lib/optics.js                lens diagram, Glaser-field rays, multipole corrector, probe by wave optics
  lib/atom.js                  atoms and screened-Coulomb scattering trajectories
  lib/pix.js, kit.js, fx.js, cap.js, util.js, motion.js, camera.js   pixel pipeline, font, effects, captions
  scenes/s01_hook.js … s16_final.js
tools/
  render.py                    headless render (frames → ffmpeg), stills, contact sheets, cue sheet
  synth_audio.py               score and sound effects from the cue sheet
  caption_audit.py             how long every caption stays fully readable (subtitle reading speed)
  text_check.py, video_diffs.py, frame_diffs.py, pair_diff.py   checks
镜头表.md                      shot list (storyboard lint: green)
output/                        the film and its delivery note
```

## Rebuild

```sh
cd electron-microscope
uv run --with playwright==1.56.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score.wav build/loudness.png
uv run --with playwright==1.56.0 --with pillow python tools/render.py --out build/film.mp4 --audio build/score.wav --fps 60 --crf 20 --tune animation
```

Quick looks: `--sheet 0:4:0.25 --solo s01_hook --out build/s01.png`.
