"""caption_audit.py — how long every caption, note and label stays fully readable.

Loads the engine headless, steps each scene at 1/30 s, and records every PIX.label / CAP.note / CAP.scene call
(text, t0, t1, typing rate). For each text it reports when it is fully typed, when it starts to leave (its own t1 or
the end of the scene), and the hold in between, against a reading-time need: subtitle speed (17 characters/s, plus
0.3 s to find the text) counted from when it starts to type, at least 0.8 s.

  uv run --with playwright==1.56.0 python tools/caption_audit.py            # all scenes, problems only
  uv run --with playwright==1.56.0 python tools/caption_audit.py --all      # every text
"""
import argparse, functools, http.server, json, socketserver, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent / 'engine'
ap = argparse.ArgumentParser()
ap.add_argument('--all', action='store_true')
ap.add_argument('--ids', help='comma-separated scene ids')
a = ap.parse_args()


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x): pass


srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=str(ROOT)))
srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

JS = """(ids) => {
  const recs = {}, rate0 = window.CAP_RATE || 40;
  const L = PIX.label, N = CAP.note, S = CAP.scene;
  // attribute each text to the scene whose draw() is running (a scene's dissolve-in also draws the previous scene)
  let active = null; const DUR = Object.fromEntries(ERAS.map(e => [e.id, e.dur])), orig = {};
  for (const id of Object.keys(SC)) if (SC[id].draw) { orig[id] = SC[id].draw; SC[id].draw = function (c, lt, S) { const s = active; active = id; try { return orig[id].call(this, c, lt, S); } finally { active = s; } }; }
  const put = (kind, text, t0, t1, rate, lt) => {
    if (!active || !(active in DUR)) return;
    const k = active + '|' + kind + '|' + text + '|' + t0;
    if (!recs[k]) recs[k] = { scene: active, dur: DUR[active], kind, text, t0, t1: t1 == null || t1 > 1e8 ? null : t1, rate: rate || rate0, first: lt };
  };
  PIX.label = (c, o, t) => { put('label', o.text, o.t0 ?? 0, o.t1, o.rate, t); return L(c, o, t); };
  CAP.note = (c, t, o) => { put('note', o.text, o.t0, o.t1, o.rate, t); const r = PIX.label; PIX.label = L; try { return N(c, t, o); } finally { PIX.label = r; } };
  CAP.scene = (c, t, o) => {
    put('title', o.title, o.t0 ?? 0.15, o.t1, rate0, t);
    let tc = (o.t0 ?? 0.15) + [...o.title].length / rate0 + 0.15;
    for (const s of (o.ctx == null ? [] : Array.isArray(o.ctx) ? o.ctx : [o.ctx])) { put('ctx', s, tc, o.t1, rate0, t); tc += [...s].length / rate0 + 0.05; }
    return S(c, t, o);
  };
  // the two-level scene caption: LEVEL 1 holds until the swap; each LEVEL 2 line types after the L1 fade, holds to t1
  const C = CAP.cap;
  CAP.cap = (c, t, o) => {
    const t0 = o.t0 ?? 0.12, lines = o.l2 == null ? [] : Array.isArray(o.l2) ? o.l2 : [o.l2];
    const swap = o.l1 ? (o.tSwap ?? 1e9) : t0;
    if (o.l1) put('cap1', o.l1, t0, swap < 1e8 ? swap : o.t1, PIX.RATE, t);
    let tc = swap + (o.l1 ? PIX.FADE + 0.02 : 0);
    for (const s of lines) { put('cap2', s, tc, o.t1, PIX.RATE, t); tc += [...s].length / PIX.RATE + 0.04; }
    return C(c, t, o);
  };
  for (const e of ERAS) {
    if (ids && !ids.includes(e.id)) continue;
    for (let lt = 0; lt < e.dur; lt += 1 / 30) renderSolo(e.id, lt);
  }
  PIX.label = L; CAP.note = N; CAP.scene = S; CAP.cap = C; for (const id in orig) SC[id].draw = orig[id];
  return Object.values(recs);
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/index.html')
    pg.wait_for_function('window.__ready === true', timeout=120000)
    recs = pg.evaluate(JS, a.ids.split(',') if a.ids else None)
    b.close()

bad = 0
for r in sorted(recs, key=lambda r: (r['scene'], r['t0'])):
    n = len(r['text'])
    lag = 0.12 if r['kind'] in ('label', 'note') else 0.0
    full = r['t0'] + lag + n / r['rate']
    end = min(r['t1'] if r['t1'] is not None else 1e9, r['dur'])
    hold = end - full
    # subtitle reading speed: the whole text readable within (chars / 17 cps) + 0.3 s to find it, counted from t0;
    # typing at 60 cps covers part of that, so the hold after the text is complete must be at least the rest
    need = max(0.8, lag + 0.3 + n / 17 - (lag + n / r['rate']))
    flag = hold < need
    bad += flag
    if flag or a.all:
        print(f"{'!!' if flag else '  '} {r['scene']:14s} {r['kind']:5s} t0 {r['t0']:5.2f} full {full:5.2f} end {end:5.2f} "
              f"hold {hold:5.2f} need {need:4.2f}  {r['text']}")
print(f'{len(recs)} texts, {bad} below their reading time')
