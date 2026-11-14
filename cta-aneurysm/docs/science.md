# Scientific review notes and sources

The film is a teaching schematic. Colours, sizes, distances and timing are illustrative; the four-second scenes are not
real interaction, scan, reconstruction or clearance times. No patient measurement, dose, injection rate, scan delay,
accuracy figure or rupture probability appears on screen: the only number in the film is iodine's atomic number, 53.

## Sources

- NINDS — Cerebral aneurysms: https://www.ninds.nih.gov/health-information/disorders/cerebral-aneurysms
- RadiologyInfo — CT angiography: https://www.radiologyinfo.org/en/info/angioct
- RadiologyInfo — Contrast materials: https://www.radiologyinfo.org/en/info/contrast
- FDA — Computed tomography: https://www.fda.gov/radiation-emitting-products/medical-x-ray-imaging/computed-tomography-ct
- FDA — Medical X-ray imaging: https://www.fda.gov/radiation-emitting-products/medical-imaging/medical-x-ray-imaging
- ARPANSA — X-rays: https://www.arpansa.gov.au/understanding-radiation/what-is-radiation/ionising-radiation/x-ray
- NIST — X-ray mass attenuation coefficients, iodine (Z = 53): https://pml.nist.gov/PhysRefData/XrayMassCoef/ElemTab/z53.html
- Siemens Healthineers — CT detector principles (energy-integrating vs photon-counting): https://www.siemens-healthineers.com/en-us/computed-tomography/news/mso-photon-counting-detectors.html
- Kak & Slaney, *Principles of Computerized Tomographic Imaging* (fan-beam filtered backprojection, used by `engine/lib/ct.js`).

## What each act claims, and how the film keeps it accurate

| Act | Claim on screen (picture or label) | Notes |
|---|---|---|
| 1 | An aneurysm is a bulge in an artery wall; one saccular aneurysm at the right MCA bifurcation | Saccular ("berry") aneurysms form at branch points of the circle of Willis; the MCA bifurcation is a common site (NINDS). The sac has a neck and a dome; its wall is thinner (the cutaway drops the media over the dome). It is unruptured and stays the same size: the film never shows growth or rupture. |
| 1 | CT angiography = CT + intravenous iodinated contrast + reviewed images | RadiologyInfo (CTA). The injector, the IV in an arm vein and the workstation are shown together in S04. |
| 2 | A heated tungsten filament releases electrons (thermionic emission); the tube voltage accelerates them from − to + across a vacuum | The heat frees electrons already in the metal. No flame. The energy bar is a teaching indicator without a number; the electrons stay well below light speed. |
| 3 | Near a nucleus the electron is deflected and slows; the energy it loses leaves as an X-ray photon (bremsstrahlung) | The trajectory is integrated with a screened Coulomb force (`engine/lib/phys.js`); the photon is a separate object emitted at the closest approach; the electron continues with ⅔ of its energy. No collision, no morph, the nucleus is unchanged. |
| 3 | Most of the energy becomes heat | About 99 % at diagnostic voltages (X-ray production efficiency ≈ 1 %). Shown as a bar, without numbers. Characteristic X-rays also leave the target; bremsstrahlung is the mechanism shown. |
| 3 | A filter removes part of the low-energy photons; the collimator intercepts rays outside the field | Low-energy photons stop in the filter more often (schematic probability that falls with energy). |
| 3 | Source and detector rotate around the still patient; many angles are measured | Third-generation geometry; the housing and the patient do not move. The axial schematic is drawn bigger than the true geometry (labelled schematic on the reference sheet). |
| 4 | Contrast: arm vein → superior vena cava → right heart → pulmonary arteries → lung vessels → pulmonary veins → left heart → aorta → carotids → cerebral arteries | The route stays inside the vessels (never the airways). No catheter goes to the head. The contrast mixes with the plasma and fills whatever lumen the blood fills, the sac included; it does not seek the aneurysm. Violet is an educational colour code. |
| 4 | The scan is timed to the arterial phase | A schematic enhancement curve without a time axis or numbers (no universal delay is implied). |
| 5 | Iodine (Z = 53) in a stable tri-iodinated molecule | Not loose iodine, not radioactive, not a PET tracer, makes no radiation. Electron configuration shown as shells of 2, 8, 18, 18, 7. "Schematic • not to scale" is on screen (SXEM • MİQYAS GÖZLƏNİLMƏYİB). |
| 5 | Photoelectric absorption: the photon is absorbed by an inner-shell (K) electron, which is ejected and leaves a vacancy | Iodine's K edge is 33.2 keV (NIST), inside the CT spectrum, which is why iodine attenuates so strongly. The photon's path ends; the nucleus is untouched. |
| 5 | Compton scattering in soft tissue: the photon continues on a new path with less energy (a longer wave), a recoil electron leaves | Shown as a separate event in a water molecule, with the photoelectric result kept in an inset for comparison. |
| 5 | Iodine increases attenuation; fewer primary photons cross the enhanced lumen, some still pass | The lane survival probabilities are schematic (≈ 0.88 vs 0.45); no attenuation numbers on screen. |
| 6 | Energy-integrating detector: scintillator → visible light → photodiode (electron–hole pairs) → integrator → converter | One total per view, not photon counting (the integrator says so by summing). The light is produced in the detector, not in the patient. A hole is drawn as an open ring with a plus: an effective positive carrier, not a cavity. |
| 7 | Each angle gives a different profile; profiles stacked by angle are projection data, not an image | The profiles and the sinogram are computed from the model (`CT.lineInt`, `CT.SINO`): I = I₀ e^(−p) with Poisson noise, logged back to p. The panel is labelled "data, not an image" (MƏLUMAT, ŞƏKİL DEYİL). |
| 7 | Reconstruction turns the measurements into a cross-section of attenuation | Fan-beam filtered backprojection computed frame by frame (1, 2, 4 … 360 views). Explanatory, not a vendor's algorithm. |
| 7 | Attenuation becomes grey: enhanced lumen bright, brain grey, bone white | A CTA window (W 700, L 160). Grayscale is a display convention. The slice is tilted 15° (like a gantry tilt parallel to the skull base) so it cuts both M1 segments and the sac and passes above the orbits. |
| 7 | Contiguous slices form a volume; the artery is traced across neighbouring slices | Twelve 2-mm slices computed from the model. |
| 8 | Review in three planes, MIP, vessel rendering, inspection and characterization by a radiologist | Axial, coronal, sagittal sections and a 12-mm slab MIP computed from the model; bone still overlaps the arteries in the MIP (a reason to use the other views). The vessel rendering hides bone in the display only and keeps the source image in view. The amber ring is the reviewer's annotation, not an automatic detection. Guides for dome, neck and branches carry no numbers. |
| 9 | Exposure is justified and optimized | Ionization is shown calmly (one water molecule); the tube output adapts with the angle to how much head the beam crosses (angular modulation, from the model's projections). No zero-risk claim, no dramatized harm. |
| 9 | Contrast safety is assessed; the kidneys clear the contrast over time | A clock turns; clearance is not instant and differs between patients. |
| 9 | Small findings near bone and motion can be hard to see; further imaging depends on the question | Two separate examples (not this patient's finding). |
| 9 | The result informs care: monitoring or treatment evaluation | CTA repairs nothing; detection does not predict a rupture date; treatment is not automatic. |

## The model's values

- **Head.** The procedural head of the CT film: skull, brain (grey/white matter, CSF, ventricles), sinuses, scalp. CT numbers: air −1000, fat −90, CSF 8, white matter 26, grey matter 38, blood 40, cortical bone 1600 HU; μ = 0.193 (1 + HU/1000) /cm at ≈ 70 keV.
- **Arteries** (`engine/lib/ves.js`): adult calibres, radius 0.6–2.6 mm (drawn 1.3× thicker in the 3D renderings).
- **Aneurysm.** Saccular, right MCA bifurcation; dome radius 3.0 mm, neck radius 1.55 mm (model geometry, never shown as a number).
- **Arterial enhancement.** +330 HU in the lumen (an illustrative arterial-phase value).
- **CT geometry.** Source 570 mm from the isocentre, detector 1040 mm, ±26° fan, 360 views × 360 channels, 240 × 240 image at 1 mm.

## Honesty notes on what is stylized

- The 3D vessel network is drawn with 1.3× calibres, and the sac is scaled with them about its bifurcation, so the neck stays visible.
- The axial schematic (S15, S31, S41) puts the tube and detector closer to the head than the real geometry. The reconstruction (S32–S34) uses the real geometry.
- Particle speeds are slowed by many orders of magnitude.
- Atoms are not to scale, and iodine's electron shells are drawn as rings.
- The light and charge counts in the detector are illustrative.
