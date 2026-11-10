// CAP — the film's editor layer. No narration and no subtitles: each scene has at most one short English caption (top
// centre, below the platform's top interface area), a few small labels on leader lines next to the thing they name. All of
// it is the bitmap font, typed on at PIX.RATE characters/s, held at least 17 characters/s + 0.3 s, leaving with a short
// dithered fade. index.html?notext=1 (window.NOTEXT) renders the clean version: every call below returns before drawing.
// The instrument's own result (SPH / CYL / AXIS on its screen and printout) is picture content, not a caption: it is
// drawn by RESULT and stays in the clean version (index.html?nodata=1 blanks it too).
// Captions accept *asterisks* for emphasis: "Why *THIS* balloon?" draws THIS in the accent colour (o.em: one palette key,
// or a list used in turn for each emphasised part).
(() => {
const { W, H, P } = PIX;
const CAP = window.CAP = {};
const Y0 = 100;                                         // caption: cap-top (screen px); the band 88–128 is kept free in every scene
CAP.Y0 = Y0;
const LOG = window.__textLog = window.__textLog || {};   // scene → [{text, t0, t1, x, y, w, h}] for the caption audit
const log = (o) => { const k = window.__scene || '?'; (LOG[k] = LOG[k] || []); if (!LOG[k].some(e => e.text === o.text && e.t0 === o.t0)) LOG[k].push(o); };
const fadeK = (t, t1) => t1 == null || t <= t1 ? 1 : U.clamp(1 - (t - t1) / PIX.FADE);
const typedN = (s, t, t0, rate = PIX.RATE) => Math.max(0, Math.min([...s].length, Math.floor((t - t0) * rate)));
CAP.minHold = s => Math.max(0.8, [...s].length / 17 + 0.3);
// dithered plate: k with a 1-px n3 rim, so the label reads on any picture without a solid black bar
const plate = (c, x, y, w, h, a = 1) => {
  c.save(); c.globalAlpha *= a;
  PIX.rect(c, x, y, w, h, 'k'); PIX.rect(c, x, y, w, 1, 'n3'); PIX.rect(c, x, y + h - 1, w, 1, 'n2');
  c.restore();
};
// the scene's context label: o = {text, t0, t1, sc (2), y, acc}
CAP.ctx = (c, t, o) => {
  if (window.NOTEXT || !o.text) return;
  const sc = o.sc ?? 2, t0 = o.t0 ?? 0.25, t1 = o.t1 ?? 2.7, y0 = o.y ?? Y0, acc = o.acc || 'a2';
  log({ text: o.text.replace(/\n/g, ' ').replace(/\*/g, ''), t0, t1, kind: 'ctx' });
  if (t < t0 || t > t1 + PIX.FADE) return;
  const lines = o.text.split('\n'), fa = fadeK(t, t1), LH = 7 * sc + 12;
  let tc = t0, emi = 0;
  const emCol = () => Array.isArray(o.em) ? o.em[emi++ % o.em.length] : (o.em || acc);
  c.save(); c.globalAlpha *= fa;
  lines.forEach((raw, li) => {
    const s = raw.replace(/\*/g, ''), n = typedN(s, t, tc); tc += [...s].length / PIX.RATE + 0.04;
    if (n <= 0) return;
    const y = y0 + li * LH, tw = PIX.textWidth(s, sc), x = Math.round(W / 2 - tw / 2), w = PIX.textWidth([...s].slice(0, n).join(''), sc);
    plate(c, x - 8, y - 8, w + 16, 7 * sc + 16);
    PIX.rect(c, x - 8, y - 8, 2, 7 * sc + 16, acc);
    // segments between asterisks alternate plain / emphasis
    let xx = x, shown = 0;
    raw.split('*').forEach((seg, k) => {
      const m = Math.max(0, Math.min([...seg].length, n - shown)), col = k % 2 ? emCol() : 'w';
      if (m > 0) PIX.text(c, seg, xx, y, col, { sc, n: m, shadow: 'n2' });
      xx += PIX.textWidth(seg, sc) + (seg.length ? sc : 0); shown += [...seg].length;
    });
  });
  c.restore();
};
// a part label on a leader line: o = {text, ax, ay (anchor, screen px), x, y (text cap-top), t0, t1, col, align}
CAP.part = (c, t, o) => {
  if (window.NOTEXT) return;
  const sc = o.sc ?? 2;
  log({ text: o.text, t0: o.t0, t1: o.t1, kind: 'part' });
  if (t < o.t0 || (o.t1 != null && t > o.t1 + PIX.FADE)) return;
  const n = Math.min(Math.max(0, Math.floor((t - o.t0 - 0.12) * PIX.RATE)), [...o.text].length);
  if (n > 0) {
    const w = PIX.textWidth([...o.text].slice(0, n).join(''), sc), tw = PIX.textWidth(o.text, sc), x = o.align === 'center' ? o.x - tw / 2 : o.align === 'right' ? o.x - tw : o.x;
    c.save(); c.globalAlpha *= fadeK(t, o.t1); PIX.rect(c, Math.round(x) - 4, Math.round(o.y) - 3 - 3 * sc, w + 8, 7 * sc + 6 + 5 * sc, 'k'); c.restore();
  }
  PIX.label(c, { ax: o.ax, ay: o.ay, tx: o.x, ty: o.y, text: o.text, t0: o.t0, t1: o.t1 ?? 1e9, col: o.col || 'w', lineCol: o.lineCol || 'g6', align: o.align, dot: o.dot, sc, shadow: 'n2' }, t);
};
// a small note without a leader: o = {text, x, y, t0, t1, col, align, sc}
CAP.note = (c, t, o) => { if (window.NOTEXT) return; CAP.part(c, t, { ...o, ax: null }); };
})();
