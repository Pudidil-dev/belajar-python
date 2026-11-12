# Asset and continuity guide

Every asset is one piece of code, so it cannot drift between scenes. The reference sheets in `docs/sheets/` are drawn by the same code.

| Asset | Code | Locked |
|---|---|---|
| The circuit layout | `engine/lib/world.js` (`WORLD.LY`, `WORLD.R`) | Positions of every component and the route of every tube; the order of points is the direction of flow |
| The operative field and the heart | `engine/lib/heart.js` | Anterior view; the heart never moves; cannula above the clamp, cardioplegia below it; three arch branches |
| The team | `engine/lib/people.js` | Surgeons: arms and gloved hands at the frame edges; the perfusionist from behind; no faces |
| The machine | `engine/lib/machine.js` | Reservoir (constant level, submerged outlet), centrifugal pump, integrated HX / oxygenator / filter, detector, monitor |
| The microscopic models | `engine/lib/micro.js` | O₂ pair, CO₂ triad, red cell (biconcave), hemoglobin (2 α + 2 β, four hemes), heme with iron |
| The look | `engine/lib/lit.js`, `engine/lib/pix.js` | One light from the top left; hue-shifted ramps; dither only at band edges; 270×480 drawn, 4× nearest-neighbour |

## Tubing rules

- **Venous line.** From the right atrium down the viewer's left to the reservoir inlet. Burgundy, 11 units wide.
- **Machine path.** Reservoir outlet → pump inlet (top) → pump outlet (side) → assembly inlet (bottom). Burgundy.
- **Arterial line.** Assembly outlet (top) → bubble detector → up the viewer's right → the aortic cannula. Red, 9 units wide.
- **Cardioplegia.** Thin (3 units) and subdued, beside the arterial line, ending at the aortic root.
- **Gas and water.**
  - Gas (pale cyan) runs from the blender to the assembly's gas inlet, and leaves at its gas outlet.
  - Water (blue) runs between the heater–cooler and the assembly's water ports.
- **Flow.** Markers move at one constant speed; the pattern repeats every 0.5 s (blood) or 1 s (gas, water), so it is identical at 0 and 68 s.

## What must not appear

- **The heart.** No heartbeat, no heart motion, and no heart restarting.
- **Alarms and emergencies.**
  - No alarm, no flatline, and no rhythmic monitor beep.
  - No emergency, defibrillation or crisis scene.
- **Blood colour.** No blue blood.
- **Blood and the circuit.**
  - No bubbles in the blood.
  - No blades in the pump.
  - No mixing of water, gas and blood.
  - No cells crossing the membrane.
  - No hole punched into a cell.
  - No tube changing its attachment.
- **Molecules.** No O₂ split into atoms, and no rusting iron.
- **Clinical numbers.** No numbers on the monitor; no doses, settings or targets.
