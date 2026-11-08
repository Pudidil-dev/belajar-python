'use strict';
// ============================================================================
// ON-SCREEN TEXT — English placeholders, all in one table so they can be
// translated without touching the animation. Replace the strings (Azerbaijani
// letters ə ğ ı İ ö ü ş ç are in the pixel font) or pass another file to the
// export (node tools/export.js --labels path/to/labels_az.js). The clean
// version of the film renders without any of them.
// ============================================================================
const LABELS = {
  s01: 'Pain while walking?',
  s04: 'Normal artery',
  s05: 'Chronic high glucose',
  s06: 'Endothelial dysfunction',
  s07: 'Plaque builds in the wall',
  s08: 'Progression over time',
  s09: 'STENOSIS',
  s10: 'OCCLUSION',
  s11: 'Collateral flow',
  s12: 'Demand exceeds supply',
  s12demand: 'Demand',
  s12supply: 'Supply',
  s13: 'Rest reduces demand',
  s14: 'CT angiography',
  s17: 'Arterial reconstruction',
  s17right: 'R',
  s17left: 'L',
  s18: 'STENOSIS',
  s19: 'OCCLUSION',
  s20normal: 'Normal',
  s20pad: 'Diabetic PAD',
  s21: 'Diabetic Peripheral Arterial Disease',
};
