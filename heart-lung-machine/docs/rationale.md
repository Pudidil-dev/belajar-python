# Director's rationale and simplification notes

## The intended experience

The first frame shows a contradiction that needs no words: a motionless heart, surgeons' hands at work, and blood visibly
moving through two connected tubes. The question appears at 2 s and the answer, a machine, at 6 s. From there the film follows
one continuous route: down the venous line, through each part of the machine, then down in scale (fibre, membrane, red cell,
hemoglobin). It comes back out along the arterial line to the aorta and the tissue, and ends on the opening frame, which the
viewer now understands.

## Creative decisions

- **The patient and the heart come first**, so the machine has a purpose before it appears.
- **The surgeons stay at the edges** (gowned arms and gloved hands), setting the scene without competing with the heart and the tubing.
- **The answer comes early (6 s)**, then curiosity moves to how it works inside.
- **One locked circuit.** Venous blood (burgundy) runs down the viewer's left, through the machine left to right along the bottom,
  and returns (red) up the right. The same routes are drawn in every scene, so the viewer never has to re-learn the space.
- **Most time goes to gas exchange (25–46 s).** The oxygen binding at 38.0 s is the visual and musical peak.
- **The ending returns to the opening frame**, pixel for pixel, so the video loops.
- **Look.** 2D pixel models lit like 3D objects (one light, hue-shifted ramps, dither only at band edges), drawn at 270×480 and
  scaled exactly 4× with nearest neighbour, so the pixels read clearly at 1080×1920.
- **No reference images were supplied.** Following the codixel skill, the organic subjects (the heart, the people) are drawn in
  code and kept simple; the people never show a face.

## Assumptions (the chosen scenario)

- An adult, conventional cardiopulmonary bypass, already established from frame one; the patient anesthetized and anticoagulated, the circuit primed.
- An arrested-heart operation: the heart stopped with cardioplegia and the ascending aorta cross-clamped. This is the chosen scenario, not a requirement of all cardiac surgery.
- Gravity venous drainage through one cannula in the right atrium into a hard-shell reservoir below the patient.
- A centrifugal pump; an integrated assembly of heat exchanger, hollow-fibre oxygenator (gas inside the fibres, blood outside) and arterial filter; a clamp-on bubble detector on the arterial line.
- Arterial return into the distal ascending aorta, on the systemic side of the clamp; cardioplegia delivered to the aortic root, below the clamp.

## Simplifications

- **One reference layout.** Real component arrangements vary.
- **Schematic scale.** The fibre, the membrane, the red cell and the hemoglobin molecule are shown at magnifications that differ by orders of magnitude; every change of scale is a visible zoom.
- **Teaching colours.** O₂ cyan, CO₂ amber, hemoglobin lavender, heme gold, water blue are conventions, not real colours.
- **Cutaways.** The see-through tube, reservoir, pump and housing are educational.
- **The heat exchanger** is shown as two straight channels and a wall; real ones are bundles of fine tubes.
- **CO₂** is shown only as dissolved CO₂ crossing the membrane; how blood carries CO₂ is not shown.
- **The monitor** shows labelled, steady traces with no numbers, so no targets or settings are implied.
- **Accessory lines** (vents, suction, pressure lines) are left out. Cardioplegia is a thin, subdued line.
- **Nothing procedural.** There are no doses, settings, targets, or steps of cannulation or machine operation.

## Hypotheses (to test, not claims)

- The contradiction at frame 0 and the early answer at 6 s should hold viewers past the first seconds.
- The molecular payoff at 38 s should be the most remembered moment.
- The pixel-identical loop should earn replays.

These are retention bets to measure on the platform; none of them guarantees reach.
