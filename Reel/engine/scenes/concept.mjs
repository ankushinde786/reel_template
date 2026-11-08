// Scene "concept": explain an idea with cards that appear one by one, then (optionally) a code example with real output.
// Fields: name, title, desc, points:[ "text" | { h:"heading", t:"text", icon:"check|bulb|bolt|info|warn|star|arrow" } ], cap, say,
//         code:[lines] (example, auto-run) + out:[..] | run:false | error:true,  per-point narration: give every point a `say`.
import { esc, header, need, icon, codePanel, codeFont, panelHeight, segsFromBeats } from "./_kit.mjs";
import { runCode, toLines } from "../run.mjs";

const ICONS = ["bulb", "bolt", "check", "star", "info"];

export default {
  type: "concept",

  normalize(s, i) {
    need(s, i, ["points", "cap"]);
    s.points = s.points.map((p, k) => (typeof p === "string" ? { t: p } : { ...p })).map((p, k) => ({ icon: ICONS[k % ICONS.length], ...p }));
  },

  segments: (s, reel, cfg) => segsFromBeats(s, s.points, cfg.timing, s.cap),

  prepare(s, reel, cfg, log) {
    if (!s.code) return;
    if (s.out) { s.out = [].concat(s.out).map((t) => (typeof t === "string" ? { text: t } : t)); return; }
    const lang = s.langObj || reel.lang, file = s.file || reel.file;
    if (s.run === false || !cfg.execute.enabled || !lang.run) return;
    const r = runCode({ lang, files: [{ name: file, code: s.code.join("\n") }], entry: file, timeoutSec: cfg.execute.timeoutSec });
    if (!r.ok && !s.error) throw new Error(`${s.name}: example failed\n${r.stderr}`);
    s.out = toLines(r, 2, (m) => log(`warning: ${s.name} ${m}`));
    log(`  ${s.name.padEnd(14)} -> ${s.out.map((o) => o.text).join(" | ") || "(no output)"}`);
  },

  css: ({ G }) => `.pc { position: absolute; left: ${G.left}px; width: ${G.width}px; border-radius: 18px; background: var(--panel); border: 2px solid #3c3c3c; display: flex; align-items: center; gap: 22px; padding: 0 26px; }
  .pc .ic { width: 62px; height: 62px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; background: color-mix(in srgb, var(--accent) 24%, transparent); color: var(--accentText); }
  .pc .tt { display: flex; flex-direction: column; gap: 4px; }
  .pc .h { font-weight: 700; color: #fff; } .pc .t { color: #cfd3d8; line-height: 1.28; }`,

  build(s, c) {
    const { G, id, at } = c, n = s.points.length, top = G.stage.top, lang = c.lang;
    let body = header(c, s);
    const out = s.out || [];
    let codeH = 0, fsC = 0;
    if (s.code) {
      fsC = codeFont(s.code, G.width - 110, 34, 18);
      codeH = panelHeight({ n: s.code.length, lh: Math.round(fsC * 1.62), label: true, result: out.length > 0 }) + 20;
    }
    const avail = G.stage.bottom - top - codeH, gap = 16;
    // pick the biggest font whose cards all fit
    let fs = 40, hs = [];
    const cardH = (p, f) => { const cpl = Math.floor((G.width - 52 - 62 - 22) / (f * 0.5)); return 30 + Math.ceil(p.t.length / cpl) * Math.round(f * 1.28) + (p.h ? Math.round(f * 1.3) + 4 : 0); };
    for (; fs >= 20; fs--) { hs = s.points.map((p) => Math.max(fs > 30 ? 112 : 94, cardH(p, fs))); if (hs.reduce((a, b) => a + b, 0) + gap * (n - 1) <= avail) break; }
    const per = c.segs.length === n && n > 1;
    let y = top; const span = Math.max(1.5, c.dur * (s.code ? 0.5 : 0.62));
    s.points.forEach((p, i) => {
      body += `<div class="pc" id="${id}-p${i}" style="top:${y}px;height:${hs[i]}px"><span class="ic">${icon(p.icon, 34)}</span><span class="tt">${p.h ? `<span class="h" style="font-size:${fs + 2}px">${esc(p.h)}</span>` : ""}<span class="t" style="font-size:${fs}px">${esc(p.t)}</span></span></div>`;
      const t = per ? c.segs[i].start - c.start + 0.25 : 0.5 + (i * span) / n;
      c.FT(`#${id}-p${i}`, { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, at(t)); c.S(i === 0 ? "whoosh" : "pop", at(t));
      y += hs[i] + gap;
    });
    if (s.code) {
      const t0 = per ? c.segs[n - 1].start - c.start + 1.4 : 0.5 + span + 0.4;
      const panel = codePanel(c, { id: `${id}-cp`, lines: s.code, x: G.left, y: top + hs.reduce((a, b) => a + b, 0) + gap * n + 14, w: G.width, fs: fsC, label: "Example", result: out, t0, syntax: lang.syntax });
      body += panel.html;
    }
    return { html: body };
  },
};
