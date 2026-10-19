#!/usr/bin/env python3
"""Find on-screen text that collides with other text (the skill's qa only hooks fillText, and this film draws a bitmap font).

Wraps PIX.label / PIX.text, renders every scene solo at 15 fps, and reports runs where two different strings overlap,
or where text leaves the 270×480 frame. (Overlays sliding in or out, and the measurement chain scrolling under the
caption, give 1–3-frame overlaps; those runs are expected.)

  uv run -q --no-project --with playwright==1.56.0 python tools/text_check.py
"""
import functools, http.server, socketserver, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ENGINE = Path(__file__).resolve().parent.parent / 'engine'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x): pass
class Srv(socketserver.ThreadingTCPServer):
    daemon_threads = True; allow_reuse_address = True
srv = Srv(('127.0.0.1', 0), functools.partial(Q, directory=str(ENGINE)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

HOOK = r"""
() => {
  const box = (s, x, y, o, n) => {
    const sc = o.sc || 1, full = PIX.textWidth(s, sc);
    const X = Math.round(o.align === 'center' ? x - full / 2 : o.align === 'right' ? x - full : x), Y = Math.round(y);
    const w = PIX.textWidth([...s].slice(0, n).join(''), sc);
    if (w > 0) window.__boxes.push({ s, x0: X, y0: Y, x1: X + w + (o.shadow === null ? 0 : sc), y1: Y + 9 * sc });
  };
  const T = PIX.text, L = PIX.label;
  PIX.text = (c, s, x, y, col, opt = {}) => { box(s, x, y, opt, opt.n ?? [...s].length); return T(c, s, x, y, col, opt); };
  PIX.label = (c, o, t) => {
    const t0 = o.t0 ?? 0, t1 = o.t1 ?? 1e9;
    if (t >= t0 && t <= t1 + 0.6) {
      const len = [...o.text].length, shown = t <= t1 ? Math.floor((t - t0 - 0.12) * 40) : len - Math.floor((t - t1) * 70);
      const n = Math.max(0, Math.min(len, shown)); if (n > 0) box(o.text, o.tx, o.ty, o, n);
    }
    return L(c, o, t);
  };
  window.__probe = (id, ts) => ts.map(t => { window.__boxes = []; window.renderSolo(id, t); return window.__boxes; });
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/index.html?render=1')
    pg.wait_for_function('window.__ready === true', timeout=60000)
    pg.evaluate(HOOK)
    eras = pg.evaluate('ERAS.map(e => ({id: e.id, d: e.t1 - e.t0}))')
    found = 0
    for e in eras:
        ts = [i / 15 for i in range(int(e['d'] * 15))]
        frames = pg.evaluate('(a) => window.__probe(a.id, a.ts)', {'id': e['id'], 'ts': ts})
        runs = {}
        for t, bx in zip(ts, frames):
            for i in range(len(bx)):
                a = bx[i]
                visible = a['x1'] > 0 and a['x0'] < 270 and a['y1'] > 0 and a['y0'] < 480
                if visible and (a['x0'] < 0 or a['x1'] > 270 or a['y0'] < 0 or a['y1'] > 480): runs.setdefault(('CUT', a['s']), []).append(t)
                for j in range(i + 1, len(bx)):
                    c = bx[j]
                    if a['s'] == c['s']: continue
                    if min(a['x1'], c['x1']) > max(a['x0'], c['x0']) and min(a['y1'], c['y1']) > max(a['y0'], c['y0']):
                        runs.setdefault(tuple(sorted((a['s'], c['s']))), []).append(t)
        for k, v in runs.items():
            found += 1
            print(f"{e['id']:<18} {v[0]:5.2f}-{v[-1]:5.2f}s ({len(v)} frames @15fps)  {' | '.join(k)}")
    b.close()
srv.shutdown()
print('clashes/out-of-frame runs:', found)
