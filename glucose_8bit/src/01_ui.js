'use strict';
// ============================================================================
// UI helpers: the safe text area, balanced line wrapping, the check-mark icon
// (captions, tags and chips live in 24_overlay.js).
// Safe text area (logical px): x 18..252, y 30..420 (TikTok-safe interior
// x 18..240, y 37..362: captions and tags stay inside it).
// ============================================================================
const SAFE = { l: 18, r: 252, t: 30, b: 420 };

// balanced wrap: as many lines as a greedy wrap at maxW, but evened out (no one-word orphan lines)
function wrapBal(f, s, maxW, sc) {
  let best = wrap(f, s, maxW, sc); const n = best.length; if (n < 2) return best;
  for (let w = maxW - 2; w > 24; w -= 2) { const L = wrap(f, s, w, sc); if (L.length > n) break; best = L; }
  return best;
}
// check mark icon
function tick(x, y, c, s) {
  s = s || 1; const pts = [[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]];
  for (const [a, b] of pts) rect(x + a * s - s, y + b * s - s, x + a * s + s, y + b * s + s, P.SH);
  for (const [a, b] of pts) rect(x + a * s, y + b * s, x + a * s + s, y + b * s + s, c);
}
