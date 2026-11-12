# Director's rationale and simplification notes

## The intended experience

The first frame shows a contradiction that needs no words: a motionless heart, surgeons' hands at work, and blood visibly
moving through two connected tubes. The question is on screen by 2 s and the answer, a machine, at 6 s. Then the view turns
to the side, and the film becomes an explanation of the machine, the way a dialysis set-up is usually explained: the patient
above, the machine below, the lines between them with their direction of flow. One drop of blood goes round the whole loop
in seven numbered steps (S05); then each step gets its own close-up, from the drainage by gravity to the return into the
aorta, with the oxygenator taken down in scale to one fibre, the membrane, a red cell and hemoglobin. Two more jobs of the
machine follow (cardioplegia, suction), then the perfusionist, the whole loop, and the opening frame again.

## Creative decisions

- **The machine is the subject.** Fifteen of the twenty-five scenes are about the console and its lines (S04–S12, S18–S19,
  S21–S24); the molecular sequence keeps its place as the payoff of step 5.
- **Seen from the side.** The side view shows what the view from above cannot: the height difference that drives venous
  drainage, the order of the parts, and every line's direction. The surgeon's view from above stays for the opening and the
  closing, so the loop frame is the operating field.
- **A workflow in seven steps first, then the details.** The numbered overview (drain, collect, pump, warm/cool, add O₂,
  filter, return) gives the viewer a map; every later step title carries its number.
- **Every highlighted part is named.** Parts and particles get small upper-case labels on leader lines as they light.
- **Pumps shown working.** The centrifugal pump in a side cutaway (motor → magnets → rotor; in → spin → out) and the roller
  pump magnified (rollers squeezing a tube, the principle of a dialysis blood pump).
- **One locked circuit.** Every line is defined once (`engine/lib/side.js`) and drawn the same way in every scene.
- **The ending returns to the opening frame**, so the video loops.
- **Look.** Simple flat 2D pixels like the X-ray film: one flat colour per part with a light top-left edge and a shadow band,
  near-black background, no soft glows; drawn at 270×480 and scaled exactly 4× with nearest neighbour.
- **No reference images were supplied.** Following the codixel skill, the organic subjects (the heart, the people) are drawn in
  code and kept simple; the people never show a face.

## Assumptions (the chosen scenario)

- An adult, conventional cardiopulmonary bypass, already established from frame one; the patient anesthetized and anticoagulated, the circuit primed.
- An arrested-heart operation: the heart stopped with cardioplegia and the ascending aorta cross-clamped. This is the chosen scenario, not a requirement of all cardiac surgery.
- Gravity venous drainage through one cannula in the right atrium into a hard-shell reservoir well below the patient.
- A centrifugal pump; an integrated assembly of heat exchanger, hollow-fibre oxygenator (gas inside the fibres, blood outside) and arterial filter; a clamp-on bubble detector on the arterial line.
- Arterial return into the distal ascending aorta, on the systemic side of the clamp; cardioplegia delivered by a roller pump to the aortic root, below the clamp; cardiotomy suction by a roller pump into the reservoir.

## Simplifications

- **A schematic side view.** The machine is drawn large and well below the table so that it fits a vertical frame; real consoles stand beside the table, and their parts are arranged in many different ways.
- **Two views of one set-up.** The view from above and the side view are joined by a fold; the heart in the side view's window is the same model as the view from above.
- **Schematic scale.** The fibre, the membrane, the red cell and the hemoglobin molecule are shown at magnifications that differ by orders of magnitude; every change of scale is a visible zoom.
- **Teaching colours.** O₂ cyan, CO₂ amber, hemoglobin lavender, heme gold, water blue are conventions, not real colours.
- **Cutaways.** The see-through tube, reservoir, pump, heater–cooler and blender are educational.
- **The heat exchanger** is shown as two straight channels and a wall; real ones are bundles of fine tubes. One water loop is shown; heater–cooler units often also serve the cardioplegia circuit.
- **Cardioplegia** is shown as a bag pumped by a roller pump; blood cardioplegia (mixed with oxygenated blood from the circuit) and its own heat exchanger are left out. It is given in doses; none are shown.
- **Suction** goes straight to the reservoir; vents and other accessory lines are left out.
- **CO₂** is shown only as dissolved CO₂ crossing the membrane; how blood carries CO₂ is not shown.
- **The monitor** shows labelled, steady traces with no numbers, so no targets or settings are implied.
- **Nothing procedural.** There are no doses, settings, targets, or steps of cannulation or machine operation.

## Hypotheses (to test, not claims)

- The contradiction at frame 0 and the early answer at 6 s should hold viewers past the first seconds.
- The numbered seven-step loop should make the machine easy to retell.
- The molecular payoff at 54 s should be the most remembered moment.
- The pixel-identical loop should earn replays.

These are retention bets to measure on the platform; none of them guarantees reach.
