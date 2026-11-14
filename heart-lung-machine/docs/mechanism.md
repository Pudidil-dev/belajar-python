# Source-to-mechanism reference

What each mechanism in the film shows, the medical fact it rests on, and what was simplified. The facts are standard
textbook knowledge of cardiopulmonary bypass and respiratory physiology; have them reviewed by a perfusionist or cardiac
anaesthetist before publication. Creative choices and hypotheses are in `rationale.md`, not here.

| Scene | What the film shows | Fact it rests on | Simplification |
|---|---|---|---|
| S01–S02 | A still heart; blood moving in the tubes | During arrested-heart surgery with CPB, the heart is stopped with cardioplegia while the pump maintains systemic flow | Bypass is already running from frame one |
| S04–S05 | The machine below the patient; one loop in seven steps | CPB drains venous blood, pumps it through an oxygenator with temperature control and a filter, and returns it to the arterial system | One schematic layout, not to scale |
| S06 | Blood drains from the right atrium down to a reservoir well below the heart | Gravity (siphon) venous drainage needs the reservoir below the heart; the height difference drives it | Heights exaggerated for the frame |
| S07 | A hard-shell reservoir: inlets, filter, steady level, submerged outlet, level sensor | The reservoir holds a working volume; the outlet stays under the surface; level sensing guards against air entering the pump | Inner geometry simplified |
| S08 | A centrifugal pump: motor, magnets, smooth rotor; in at the centre, out at the side | Centrifugal pumps add energy by rotation (a forced vortex) and are driven magnetically through the closed housing | Rotation slowed to be readable; cells shown large |
| S09–S10 | A heater–cooler pumps water to the heat exchanger; heat crosses a solid wall | Temperature is managed by water from a heater–cooler through the heat exchanger; water and blood never mix | One water loop; two straight channels instead of a tube bundle |
| S11 | Oxygen and air mixed in a blender, metered by flowmeters, into the oxygenator; exhaust out | The sweep gas (an oxygen/air mix set by a blender and flowmeter) flows through the oxygenator and leaves through its exhaust | No settings shown |
| S12–S13 | Hollow fibres; gas inside, blood outside | In the common hollow-fibre design the sweep gas flows inside the fibres and blood flows around them | One fibre in cross-section, enlarged |
| S14 | O₂ crosses the intact membrane by diffusion, with a net flux toward the blood | Diffusion follows the partial-pressure gradient; no cells cross; no gas bubbles form in the blood | Molecules drawn huge and few; random motion stylized |
| S15 | O₂ enters a red cell through its membrane | O₂ diffuses through plasma and the red-cell membrane | No hole or channel is shown |
| S16 | O₂ binds reversibly to the iron of a heme; four subunits, four sites; the protein shifts slightly | Hemoglobin is a tetramer (2 α, 2 β); each heme iron binds one O₂ reversibly; binding changes the protein's conformation | Shape change stylized; two of four sites filled |
| S17 | CO₂ crosses from the blood into the gas and is swept away | CO₂ is removed across the same membrane into the sweep gas | Only dissolved CO₂ shown; carriage on hemoglobin and as bicarbonate not shown |
| S18 | An arterial filter in the assembly; a separate clamp-on bubble detector | Integrated arterial filters trap particles and bubbles; ultrasonic detectors monitor the line, they do not remove anything | No air event is staged |
| S19 | Oxygenated blood returns through a cannula in the ascending aorta above the cross-clamp | The arterial cannula must be on the systemic side of the clamp to perfuse the body | Arch branches drawn short |
| S20 | O₂ leaves hemoglobin, crosses the capillary wall and reaches tissue; cells stay in the vessel | Systemic O₂ unloading by diffusion down the gradient; not all O₂ is released | The tissue response is a restrained colour change |
| S21 | A roller pump sends cold cardioplegia into the aortic root, below the clamp, and into the coronary arteries | Antegrade cardioplegia is delivered into the aortic root proximal to the cross-clamp; the clamp keeps it out of the systemic circulation, so it perfuses the coronaries and keeps the heart arrested | Bag and roller pump only; blood mixing, doses and timing not shown |
| S22 | A sucker returns spilled blood through a roller pump to the reservoir | Cardiotomy suction returns shed blood to the circuit through the reservoir's filter; roller pumps push by occluding a tube against a raceway | Vents and suction control not shown |
| S23 | Flow, pressure, temperature and oxygenation are watched continuously | These are monitored throughout CPB by the perfusionist | No values or targets shown; monitoring does not mean complications are impossible |

## The brief's accuracy checks

| Check | How the film meets it |
|---|---|
| Bypass established in the opening | Blood moves in both connected lines from frame 0 (S01) |
| Arrested heart is the chosen scenario | Stated in `rationale.md`; S21 shows how cardioplegia keeps it still; no claim that all cardiac surgery needs it |
| Venous and arterial connections consistent | One route per line, defined once in `engine/lib/side.js` (and `world.js` for the view from above) and drawn in every scene |
| Arterial return perfuses the body despite the clamp | The cannula enters the ascending aorta above the clamp (S19, `docs/sheets/heart.png`) |
| Circuit fluid-filled and prepared | Every line and component is filled from frame 0 |
| Reservoir outlet submerged | The outlet is below the constant working level (`MACHINE.LEVEL`) in every frame |
| Centrifugal pump throughout | The same smooth-rotor head in every scene; the roller pumps are only for cardioplegia and suction |
| Pump does not shred red cells | Cells ride the flow intact; no blades |
| Water, blood and gas separate | Separate lines and channels in every view (S09–S11, S13) |
| Gas inside, blood outside the fibres | S12–S14 |
| O₂ crosses by diffusion | Random walks with a net flux down the gradient (S14) |
| Red cells do not cross the membrane | Cells stay on the blood side (S13, S14) |
| O₂ binds reversibly | Binding at the iron with a two-way arrow (S16) |
| CO₂ leaves through the gas pathway | S17; the exhaust in S11 |
| Blood stays red / burgundy | Venous burgundy and oxygenated red ramps only; never blue |
| Bubble detector is not a filter | It only lights; nothing is removed (S18) |
| Monitoring is not a guarantee | No claim on screen; noted here |
| No emergency or defibrillation scene | None |
| No heartbeat over the arrested heart | No heartbeat sound at any point; no kick drum while the heart is on screen |
