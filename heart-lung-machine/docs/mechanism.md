# Source-to-mechanism reference

What each mechanism in the film shows, the medical fact it rests on, and what was simplified. The facts are standard
textbook knowledge of cardiopulmonary bypass and respiratory physiology; have them reviewed by a perfusionist or cardiac
anaesthetist before publication. Creative choices and hypotheses are in `rationale.md`, not here.

| Scene | What the film shows | Fact it rests on | Simplification |
|---|---|---|---|
| S01–S02 | A still heart; blood moving in the tubes | During arrested-heart surgery with CPB, the heart is stopped with cardioplegia while the pump maintains systemic flow | Bypass is already running from frame one |
| S04 | The console and a perfusionist | CPB is run by a perfusionist with the surgical and anaesthesia team | One console, one operator shown |
| S05 | Blood drains from the right atrium to a reservoir below the patient | Gravity (siphon) venous drainage needs the reservoir below the heart | The body outline and great veins are schematic |
| S06 | A hard-shell reservoir with a steady level and a submerged outlet | The reservoir holds a working volume; the outlet stays under the surface; level sensing guards against air | Inner geometry simplified |
| S07 | A centrifugal pump: central inlet, smooth rotor, peripheral outlet, magnetic drive | Centrifugal pumps add energy by rotation (a forced vortex) and are driven magnetically through the housing | Cells shown intact and large; rotor vanes simplified |
| S08 | Water and blood in separate channels with heat crossing a solid wall | The heat exchanger transfers heat through a wall; water and blood never mix | Two straight channels instead of a tube bundle |
| S09–S10 | Hollow fibres; gas inside, blood outside | In the common hollow-fibre design the sweep gas flows inside the fibres and blood flows around them | One fibre in cross-section, enlarged |
| S11 | O₂ crosses the intact membrane by diffusion, with a net flux toward the blood | Diffusion follows the partial-pressure gradient; no cells cross; no gas bubbles form in the blood | Molecules drawn huge and few; random motion stylized |
| S12 | O₂ enters a red cell through its membrane | O₂ diffuses through plasma and the red-cell membrane | No hole or channel is shown |
| S13 | O₂ binds reversibly to the iron of a heme; four subunits, four sites; the protein shifts slightly | Hemoglobin is a tetramer (2 α, 2 β); each heme iron binds one O₂ reversibly; binding changes the protein's conformation | Shape change stylized; two of four sites filled |
| S14 | CO₂ crosses from the blood into the gas and is swept away | CO₂ is removed across the same membrane into the sweep gas | Only dissolved CO₂ shown; carriage on hemoglobin and as bicarbonate not shown |
| S15 | An arterial filter in the assembly; a separate clamp-on bubble detector | Integrated arterial filters trap particles and bubbles; ultrasonic detectors monitor the line, they do not remove anything | No air event is staged |
| S16 | Oxygenated blood returns through a cannula in the ascending aorta above the cross-clamp | The arterial cannula must be on the systemic side of the clamp to perfuse the body | Arch branches drawn short |
| S17 | O₂ leaves hemoglobin, crosses the capillary wall and reaches tissue; cells stay in the vessel | Systemic O₂ unloading by diffusion down the gradient; not all O₂ is released | The tissue response is a restrained colour change |
| S18 | Flow, pressure, temperature and oxygenation are watched continuously | These are monitored throughout CPB | No values or targets shown; monitoring does not mean complications are impossible |

## The brief's accuracy checks

| Check | How the film meets it |
|---|---|
| Bypass established in the opening | Blood moves in both connected lines from frame 0 (S01) |
| Arrested heart is the chosen scenario | Stated in `rationale.md`; no claim that all cardiac surgery needs it |
| Venous and arterial connections consistent | One route per tube, defined once in `engine/lib/world.js` and drawn in every scene |
| Arterial return perfuses the body despite the clamp | The cannula enters the ascending aorta above the clamp (S16, `docs/sheets/heart.png`) |
| Circuit fluid-filled and prepared | Every tube and component is filled with blood from frame 0 |
| Reservoir outlet submerged | The outlet is below the constant working level (`MACHINE.LEVEL`) in every frame |
| Centrifugal pump throughout | The same smooth-rotor head in every scene |
| Pump does not shred red cells | Cells ride the flow intact; no blades |
| Water, blood and gas separate | Separate lines and channels in every view (S08, S10) |
| Gas inside, blood outside the fibres | S09–S11 |
| O₂ crosses by diffusion | Random walks with a net flux down the gradient (S11) |
| Red cells do not cross the membrane | Cells stay on the blood side (S10, S11) |
| O₂ binds reversibly | Binding at the iron with a two-way arrow (S13) |
| CO₂ leaves through the gas pathway | S14 |
| Blood stays red / burgundy | Venous burgundy and oxygenated red ramps only; never blue |
| Bubble detector is not a filter | It only lights; nothing is removed (S15) |
| Monitoring is not a guarantee | No claim on screen; noted here |
| No emergency or defibrillation scene | None |
| No heartbeat over the arrested heart | No heartbeat sound at any point; no kick drum while the heart is on screen |
