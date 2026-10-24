'use strict';
// ============================================================================
// PLAYER: 270x480 canvas shown with nearest-neighbour scaling, controls
// outside the composition. Audio starts on the first user gesture; the audio
// clock drives the picture, so pause / resume / seek never duplicate sounds.
// ============================================================================
const SCENE_NAMES = ['HEALTHY ARTERY', 'PLAQUE BUILDS UP', 'ARTERY NARROWS', 'REDUCED BLOOD SUPPLY', 'CORONARY ARTERY', 'CARDIAC CATHETERIZATION',
  'RADIAL ACCESS', 'GUIDING CATHETER', 'X-RAY GUIDANCE', 'GUIDEWIRE', 'LESION CROSSED', 'STENT DELIVERY', 'STENT POSITIONED', 'BALLOON INFLATION',
  'STENT EXPANSION', 'ARTERY WIDENS', 'BALLOON DEFLATES', 'STENT STAYS IN PLACE', 'IMPROVED BLOOD FLOW', 'BEFORE / AFTER', 'FLOW ASSESSMENT',
  'DRUG-ELUTING STENT', 'BLOOD FLOW IMPROVED', 'HOW CORONARY STENTS WORK'];
const PL = { t: 0, playing: false, wallT0: 0, pos0: 0, audioOK: true, scrubbing: false, img: null, cx: null };
function plClock() {
  if (!PL.playing) return PL.t;
  if (PL.audioOK && LIVE.ctx) return liveNow();
  return PL.pos0 + (performance.now() - PL.wallT0) / 1000;
}
function plDraw(t) {
  renderFrame(t);
  const d = PL.img.data, u = new Uint32Array(d.buffer); u.set(buf);
  PL.cx.putImageData(PL.img, 0, 0);
}
function plFmt(t) { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
function plUI() {
  const el = PL.el;
  el.play.innerHTML = PL.playing ? ICON.pause : ICON.play;
  el.play.setAttribute('aria-label', PL.playing ? 'Pause' : 'Play');
  el.mute.innerHTML = LIVE.muted ? ICON.muted : ICON.sound;
  el.mute.setAttribute('aria-label', LIVE.muted ? 'Unmute' : 'Mute');
  if (!PL.scrubbing) el.scrub.value = String(Math.round(PL.t * FPS));
  el.time.textContent = plFmt(PL.t) + ' / ' + plFmt(DUR);
  const i = sceneIndex(PL.t);
  el.scene.textContent = String(i + 1).padStart(2, '0') + ' / 24  ' + SCENE_NAMES[i];
  el.scrub.style.setProperty('--p', (PL.t / DUR * 100).toFixed(2) + '%');
}
function plPlay() {
  if (PL.t >= DUR - 1 / FPS) PL.t = 0;
  PL.playing = true; PL.pos0 = PL.t; PL.wallT0 = performance.now();
  try { livePlay(PL.t); if (LIVE.muted) liveMute(true); } catch (e) { PL.audioOK = false; }
  plUI();
}
function plPause() {
  PL.t = plClock(); PL.playing = false;
  try { livePause(); } catch (e) { }
  plUI();
}
function plSeek(t, keepPlaying) {
  t = clamp(t, 0, DUR - 1 / FPS);
  const was = PL.playing;
  if (was) { try { livePause(); } catch (e) { } PL.playing = false; }
  PL.t = t; plDraw(t);
  if (was && keepPlaying !== false) plPlay(); else plUI();
}
function plLoop() {
  if (PL.playing) {
    let t = plClock();
    if (t >= DUR - 1 / FPS) { t = DUR - 1 / FPS; PL.t = t; plDraw(t); plPause(); }
    else { PL.t = t; plDraw(t); plUI(); }
  }
  requestAnimationFrame(plLoop);
}
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4.2v15H6zM13.8 4.5H18v15h-4.2z"/></svg>',
  replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1.5L7 6l5 4.5V7a5.5 5.5 0 1 1-5.5 5.5H4.5A7.5 7.5 0 1 0 12 5z"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4zM15 8.6a4.6 4.6 0 0 1 0 6.8l-1.3-1.3a2.8 2.8 0 0 0 0-4.2zM17.6 6a8.3 8.3 0 0 1 0 12l-1.3-1.3a6.5 6.5 0 0 0 0-9.4z"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4zM15.2 9.3l1.3-1.3 2.2 2.2 2.2-2.2 1.3 1.3-2.2 2.2 2.2 2.2-1.3 1.3-2.2-2.2-2.2 2.2-1.3-1.3 2.2-2.2z"/></svg>',
};
function plStart() {
  const cv = document.getElementById('screen');
  PL.cx = cv.getContext('2d', { alpha: false });
  PL.img = PL.cx.createImageData(W, H);
  PL.el = { play: document.getElementById('play'), replay: document.getElementById('replay'), mute: document.getElementById('mute'), scrub: document.getElementById('scrub'), time: document.getElementById('time'), scene: document.getElementById('scene') };
  PL.el.replay.innerHTML = ICON.replay;
  PL.el.scrub.max = String(NF - 1);
  const fit = () => {
    const stage = document.getElementById('stage');
    const aw = stage.clientWidth, ah = stage.clientHeight;
    let s = Math.min(aw / W, ah / H);
    if (s >= 2) s = Math.floor(s);                       // integer scale when there is room
    cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
  };
  addEventListener('resize', fit); fit();
  PL.el.play.onclick = () => (PL.playing ? plPause() : plPlay());
  PL.el.replay.onclick = () => { plSeek(0, false); plPlay(); };
  PL.el.mute.onclick = () => { try { liveInit(); liveMute(!LIVE.muted); } catch (e) { LIVE.muted = !LIVE.muted; } plUI(); };
  const sc = PL.el.scrub;
  sc.addEventListener('input', () => { PL.scrubbing = true; const t = (+sc.value) / FPS; if (PL.playing) { try { livePause(); } catch (e) { } PL.playing = false; PL.resumeAfter = true; } PL.t = t; plDraw(t); plUI(); });
  sc.addEventListener('change', () => { PL.scrubbing = false; if (PL.resumeAfter) { PL.resumeAfter = false; plPlay(); } else plUI(); });
  cv.addEventListener('click', () => (PL.playing ? plPause() : plPlay()));
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT' && e.key !== ' ') return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); PL.playing ? plPause() : plPlay(); }
    else if (e.key === 'ArrowRight') plSeek(PL.t + (e.shiftKey ? 1 / FPS : 1));
    else if (e.key === 'ArrowLeft') plSeek(PL.t - (e.shiftKey ? 1 / FPS : 1));
    else if (e.key === 'm') PL.el.mute.click();
    else if (e.key === 'r') PL.el.replay.click();
  });
  document.getElementById('loading').remove();
  plDraw(0); plUI(); requestAnimationFrame(plLoop);
}
// public API (used by the MP4 export through Playwright)
if (typeof window !== 'undefined') {
  window.LINAC = { W, H, FPS, DUR, NF, renderFrame, getBuf: () => buf, renderAudioOffline, sceneIndex, seek: t => plSeek(t, false) };
  const boot = () => setTimeout(() => { engineInit(); if (!/[?&]headless/.test(location.search)) plStart(); else window.LINAC.ready = true; window.LINAC.ready = true; }, 30);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}
