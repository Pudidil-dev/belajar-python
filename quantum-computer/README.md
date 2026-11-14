# How Quantum Computers Work

A 120-second 8-bit pixel-art explainer that travels through a real superconducting quantum computer. It starts in the
lab, dives down the golden dilution refrigerator to the processor, goes into the aluminium wiring and the Josephson
junction, and then follows one qubit (later two) through superposition, interference, entanglement, measurement and
error correction. It ends back out in the lab.

- 1080×1920 vertical, 60 fps, exactly 120 s, H.264 + AAC stereo.
- Every frame is drawn at 270×480 and upscaled 4× with nearest-neighbour, so pixels stay crisp. The film uses one
  limited palette with ordered dithering.
- Motion and composition follow the Kurzgesagt grammar: flat shading with highlights, glowing but hard-edged particles
  and waves, cutaways, magnifier bubbles, and log-scale zooms between scales (8 decades in scene 3).
- The colour code is the brief's:

  | Element | Colour |
  |---|---|
  | Electrons | cyan |
  | Quantum states (Bloch vectors, amplitudes, wavefunctions, pair correlations) | purple |
  | Superconducting circuits (aluminium wiring, qubits, couplers, resonators) | blue |
  | Quantum hardware (refrigerator plates, package) | gold |
  | Microwave pulses | orange |
  | Classical results | green |
  | Noise and errors | red |

  The background is near-black.
- There is no narration and no subtitles. Labels are minimal: the brief's scene labels, kets and equations,
  temperatures, and small part names.
- The score and sound effects are synthesized in code, with no samples:
  - 120 BPM in E minor;
  - two drops, one on superposition (0:55) and one on entanglement (1:24);
  - every pulse, rotation, gate, phase change, interference, entanglement, readout and error has its own sound, placed
    from the picture's cue sheet.

The finished film is `output/How_Quantum_Computers_Work.mp4`.

## Scenes

At 120 BPM one beat is 0.5 s, and every scene boundary in the brief falls on a beat.

| # | Time | Label | What happens |
|---|---|---|---|
| 1 | 0:00 | QUANTUM COMPUTER | The lab: racks of microwave electronics and the gold dilution refrigerator. The camera eases toward it, then dives down past the cooling plates, cables and attenuators to the processor package and into the chip. |
| 2 | 0:07 | QUBIT | A classical transistor: the gate voltage switches its channel, so its bit is 0 or 1 and jumps between them. The two digits fly down and become the qubit's two lowest energy levels, \|0⟩ and \|1⟩ (≈5 GHz apart). Its state is a Bloch-sphere vector that moves smoothly to any point between the poles, α\|0⟩ + β\|1⟩. |
| 3 | 0:17 | SUPERCONDUCTIVITY | Inside the refrigerator: the thermometer falls 300 K → 50 K → 4 K → 1 K → 100 mK → 15 mK while frost-blue light glitters on the colder plates. The camera pushes into the chip, one qubit's aluminium arm, the film's crystal grains and the ion lattice. There the electrons pair up as overlapping Cooper-pair correlations (partners far apart, not orbiting couples), all turn to one shared phase, and the fluid flows without scattering. |
| 4 | 0:30 | QUANTUM TUNNELING | Riding the electrons down to the Josephson junction, a 1.5 nm AlOx barrier between two aluminium electrodes. A computed wave packet meets it: the amplitude decays inside the barrier and about a fifth comes out the other side (REFLECTED / TUNNELED gauges). Pulling back, each electrode has its own phase, the current is I = Ic sin φ, and the energy U = −EJ cos φ is a cosine, not an inductor's parabola: a nonlinear inductor. |
| 5 | 0:44 | QUANTUM STATES | The magnified junction shrinks into a bubble. It is two crossing aluminium leads at the foot of a cross-shaped capacitor pad, so the transmon is a junction plus a capacitor. In the cosine well the energy levels get closer going up (5.0 GHz, then 4.7 GHz), so a 5.0 GHz pulse drives only \|0⟩ ↔ \|1⟩. Those two levels become the Bloch sphere's poles, and a calibrated pulse runs down the drive line. |
| 6 | 0:55 | SUPERPOSITION | Drop 1. The pulse arrives and the vector turns half a revolution about the H axis, from \|0⟩ to the equator: (\|0⟩+\|1⟩)/√2. Both amplitudes are 1/√2 with the same phase, and a measurement would give 50 % each. The camera pushes in and circles the state once, and the tip stays on the equator (50 / 50). Nothing is measured yet. A crossed-out "fast switch" card shows what superposition is not: it is one coherent state, not something flickering between 0 and 1. |
| 7 | 1:10 | QUANTUM INTERFERENCE | H → Z → H. Z swings the vector half way round the equator, so the \|1⟩ amplitude flips its phase: (\|0⟩−\|1⟩)/√2. After a second pulse and H, the path diagram shows +1/2 − 1/2 = 0 into \|0⟩ (cancel) and +1/2 + 1/2 = 1 into \|1⟩ (add). Undoing the Z makes the same paths land on \|0⟩ instead: the phase decides the result. |
| 8 | 1:24 | QUANTUM ENTANGLEMENT | Drop 2. Two coupled transmons in \|00⟩. H on A gives (\|00⟩+\|10⟩)/√2. Two synchronised pulses then drive a CNOT through the coupler: (\|00⟩+\|11⟩)/√2. Each qubit's own Bloch vector (partial trace) shrinks to the centre, the \|00⟩ and \|11⟩ bars pulse together, and a note says one shared state, no signal sent. |
| 9 | 1:39 | QUANTUM MEASUREMENT | A 7 GHz readout pulse runs along the feedline. The two resonators ring, and each qubit's state shifts its resonator's dip. The signal climbs a quantum-limited amplifier (15 mK), a HEMT (4 K) and room-temperature amplifiers to the digitizer. Each run lands in a 0 or 1 cloud per qubit; 400 runs give ≈ half 00 and ≈ half 11, plus a few 01/10 hardware errors. |
| 10 | 1:49 | QUANTUM ERROR CORRECTION | The environment nudges a qubit: its phase drifts (T₂, each copy differently) and it leaks energy back to \|0⟩ (T₁), within ≈100 µs. On the chip's 5×5 grid, 13 data qubits and 12 measure qubits form a distance-3 surface code. A bit flip and a phase flip light up the checks around them (the syndrome), and are located and undone. Logical errors become rarer, not zero. |
| 11 | 1:56 | HOW QUANTUM COMPUTERS WORK | The camera pulls out through the processor and the refrigerator back to the lab, while MICROWAVE CONTROL → QUANTUM GATES → INTERFERENCE → MEASUREMENT → CLASSICAL RESULT lights up, with a note: useful for certain problems, not all. |

The shot list (27 shots with camera moves) is `镜头表.md`. It passes the `huashu-art-motion` storyboard lint.

## The physics on screen

**The quantum graphics are computed from state vectors** (`engine/lib/qm.js`).

- Every gate is applied as a matrix to the amplitudes. A gate in progress is its continuous version, the fractional
  power U^s: H^s is a rotation by πs about (x+z)/√2 times the phase e^{iπs/2}, so the amplitudes end exactly on the
  textbook values. (A detuned drive with Rabi frequency equal to its detuning rotates about that axis.)
- CNOT(s) = I + (e^{iπs} − 1)P, with P = \|1⟩⟨1\| ⊗ \|−⟩⟨−\|.
- The Bloch vector, the amplitude columns (height = \|amplitude\|, dial = phase), the four joint two-qubit bars and the
  reduced Bloch vectors (partial trace) are all read from those numbers.
- The interference diagram draws each contribution as a phasor and adds them head to tail.

**Tunnelling** (`engine/lib/junction.js`).

- The wave packet is a split-step Fourier solution of the time-dependent Schrödinger equation, computed once at
  start-up (1024 points, ħ = m = 1, lengths in screen px, absorbing edges).
- The barrier is 25 % above the packet's mean energy, so the motion is genuine tunnelling, not passing over.
- Brightness is the amplitude \|ψ\|. The stripes are the crests of Re ψ, which slide at half the packet's group velocity.
- The REFLECTED / TUNNELED percentages integrate \|ψ\|² on each side.

**The transmon.**

- The energy is U(φ) = −EJ cos φ, against an inductor's U ∝ φ².
- The levels are the standard transmon expansion for EJ/EC = 30. They are scaled so E01 = 5.0 GHz, which gives
  E12 ≈ 4.7 GHz (anharmonicity ≈ −0.3 GHz).

**Hardware numbers.**

- Aluminium's Tc ≈ 1.2 K.
- Plate temperatures: 300 K, 50 K, 4 K, 1 K (still), 100 mK (cold plate), 15 mK (mixing chamber).
- AlOx barrier ≈ 1.5 nm.
- Single-qubit pulse ≈ 30 ns at 5.0 GHz.
- Readout resonators ≈ 7 GHz.
- Coherence ≈ 100 µs.

### Accuracy choices (the brief's critical rules)

- **No "tries every answer at once."** Superposition is shown as one state with two amplitudes. It is never shown as
  parallel answers, and a note says it is not flickering between 0 and 1.
- **No faster-than-light information.** Entanglement is made by an interaction through the coupler and then shown as
  one shared state. Each qubit alone has no definite state, nothing travels between them afterwards, and a note says
  no signal is sent.
- **Microwave pulses control the qubits.** Orange pulses run down the drive lines for each H and for the entangling
  gate, and the readout is a microwave pulse too. The Z gate is a phase shift that needs no pulse, as on real transmons.
- **Nonlinearity comes from the Josephson junction.** It is shown as a cosine against a parabola, and as unequal level
  spacings that let a 5.0 GHz pulse address only \|0⟩ ↔ \|1⟩.
- **Interference is shown mathematically and visually.** The phase flip shows on the amplitude dial, the phasor sums
  show in the path diagram, and the "without the Z" comparison is included.
- **Ideal versus noisy hardware.** The gates in scenes 6–8 are ideal. Scene 9's histogram shows a few 01/10 errors,
  and scene 10 shows dephasing, relaxation and error correction that makes errors rarer, not zero.
- **Measurement gives classical information.** Each run is one green 0/1 result per qubit, and statistics appear only
  over repeated runs.
- **Useful for certain problems, not universally faster.** This is said in the final frame.

### Honest limits

- **Not to scale.**
  - Gates (tens of ns) and readout (≈1 µs) are slowed by about 10⁸.
  - Atoms and the barrier are magnified, and the 8-decade zoom in scene 3 is continuous but stylized.
  - On-chip microwave pulses are drawn as packets travelling along the line. A real pulse is far longer than the chip,
    so the whole line rings together.
- **Simplified pictures.**
  - The wave packet in scene 4 is the textbook single-particle picture of tunnelling. A junction's Cooper pairs tunnel
    coherently as a condensate, and that is the picture used next (phases φ₁, φ₂ and I = Ic sin φ).
  - The lattice is drawn as a square face of the fcc crystal.
  - Only a few of aluminium's three conduction electrons per atom are drawn.
- **Illustrative counts.** The measurement statistics are seeded random draws (about 2–3 % 01/10). The surface-code
  errors are placed by hand to show one bit flip and one phase flip.

## How it was made

It was built with the `huashu-art-motion` skill in `.claude/skills/`, using:

- the shot list and its lint;
- a contact-sheet review of every scene and every cut;
- a label collision scan;
- the skill's `qa.py`;
- `deliver.py` with its film gate (the delivery note is `output/交付说明.md`).

```
engine/                 the animation (open engine/index.html through a local web server to preview)
  lib/pix.js            270×480 pixel pipeline: palette, Bayer-dither quantizer, bitmap font (with kets, √, ψ, φ …)
  lib/kit.js            camera helpers, noise, direct pixel access, shapes
  lib/fx.js             electrons, wave packets, lighten-only dithered glows, spotlight, floor fade, small effects
  lib/cap.js            scene captions, event notes
  lib/qm.js             complex amplitudes, gates as continuous rotations, CNOT, partial trace
  lib/bloch.js          Bloch sphere, amplitude columns with phase dials, circuit wires
  lib/qview.js          the single-qubit view of scenes 6–7 (wire, sphere, columns, formula)
  lib/fridge.js         the lab and the dilution refrigerator; the processor in its package
  lib/chip.js           the 5×5 transmon chip: crosses, junctions, couplers, resonators, drive lines, pulses
  lib/nano.js           aluminium grains, the ion lattice, the amorphous oxide barrier
  lib/junction.js       split-step Schrödinger solution, junction energy, transmon levels
  lib/util.js, motion.js, camera.js   from huashu-art-motion (MIT)
  film.js               timeline (11 scenes on the beat grid), dither dissolve, shifted layers, qa hooks
  scenes/s01…s11        one file per scene
tools/render.py         headless Chromium → PNG frames → ffmpeg 4× nearest-neighbour → MP4; stills, contact sheets, cues
tools/synth_audio.py    the score and sound effects from the cue sheet (numpy/scipy)
tools/text_check.py     label collision / out-of-frame scan (the skill's qa.py only sees fillText)
tools/video_diffs.py    frame-to-frame change of a rendered film (finds pops and strobing)
tools/frame_diffs.py, pair_diff.py   per-scene diff curve, two-frame diff
```

To re-run everything (needs uv, ffmpeg and Playwright Chromium 141):

```sh
R="uv run --with playwright==1.56.0 --with pillow python tools/render.py"
$R --cues build/cues.json
uv run --with numpy --with scipy --with soundfile python tools/synth_audio.py build/cues.json build/score.wav
$R --out build/How_Quantum_Computers_Work.mp4 --audio build/score.wav --crf 18 --tune animation --fps 60
```

Every random value is seeded, so every frame and the soundtrack are reproducible.
