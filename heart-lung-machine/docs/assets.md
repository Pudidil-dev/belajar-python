# Asset and continuity guide

Every asset is one piece of code, so it cannot drift between scenes. The reference sheets in `docs/sheets/` are drawn by the same code.

| Asset | Code | Locked |
|---|---|---|
| The side view (the machine's world) | `engine/lib/side.js` (`SIDE.LY`, `SIDE.R`, `SIDE.track`) | Positions of every part and the route of every line; the order of points is the direction of flow |
| The machine's parts | `engine/lib/machine.js` | Reservoir (constant level, submerged outlet), centrifugal pump and drive, oxygenator (HX, fibres, filter), detector, blender, heater–cooler, roller pumps, monitor |
| The view from above and the heart | `engine/lib/world.js`, `engine/lib/heart.js` | The opening and closing composition; the heart never moves; cannula above the clamp, cardioplegia below it |
| The team | `engine/lib/people.js` | Surgeons: arms and gloved hands at the frame edges; the perfusionist from behind; no faces |
| The microscopic models | `engine/lib/micro.js` | O₂ pair, CO₂ triad, red cell (biconcave), hemoglobin (2 α + 2 β, four hemes), heme with iron |
| The look | `engine/lib/lit.js`, `engine/lib/pix.js` | Flat colour per part, light edge top left, shadow band bottom right; 270×480 drawn, 4× nearest-neighbour |
| The text | `engine/lib/cap.js` | Title top left with accent bar and context line; part labels on leader lines; step badges |

## Line rules (side view)

- **Venous line.** From the right atrium out of the chest window and down to the reservoir's venous inlet. Burgundy, 7 units.
- **Machine path.** Reservoir outlet → pump inlet (top, centre) → pump outlet (side) → oxygenator inlet (bottom). Burgundy, 7 units.
- **Arterial line.** Oxygenator outlet (top) → bubble detector → up and over the drapes → the aortic cannula. Red, 5 units.
- **Cardioplegia.** Bag → roller pump on the mast → a thin rose line (2 units) to the aortic root, below the clamp.
- **Suction.** Sucker in the chest → down the far left → roller pump on the cart → up into the reservoir's suction inlet. 3 units.
- **Gas.** Oxygen and air hoses → blender → the oxygenator's gas inlet (pale cyan); the exhaust at its bottom.
- **Water.** Heater–cooler ↔ the heat exchanger's two ports (blue).
- **Flow.** Marks move at one constant speed (blood 30 units/s, 15 apart: a 0.5-s pattern; other lines at half speed).

## What must not appear

- **The heart.** No heartbeat, no heart motion, and no heart restarting.
- **Alarms and emergencies.**
  - No alarm, no flatline, and no rhythmic monitor beep.
  - No emergency, defibrillation or crisis scene.
- **Blood colour.** No blue blood.
- **Blood and the circuit.**
  - No bubbles in the blood.
  - No blades in the pump.
  - No mixing of water, gas, cardioplegia and blood.
  - No cells crossing the membrane.
  - No hole punched into a cell.
  - No line changing its attachment.
- **Molecules.** No O₂ split into atoms, and no rusting iron.
- **Clinical numbers.** No numbers on the monitor or the blender; no doses, settings or targets.
