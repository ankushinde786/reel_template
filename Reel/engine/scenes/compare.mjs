// Scenes "compare" (A vs B) and "tip" (instead of THIS, do THAT).  Two modes:
//   panels : a:{label, code:[..], out?, tone?, say?}, b:{...}, verdict:"one-line takeaway"        (real code, real output, stacked)
//   table  : rows:[[feature, a, b], ...] with heads:["list","tuple"]  (values may start with "+ " (check) or "- " (cross))
// Common: name, title, desc, cap, say.  Per-panel narration: give a.say and b.say (the scene's `say` then narrates the verdict).
// tip defaults: a = bad ("Instead of"), b = good ("Use"), verdict = why.
import { esc, header, need, icon, codePanel, codeFont, panelHeight, fitPx } from "./_kit.mjs";
import { runCode, toLines } from "../run.mjs";

function normalize(s, i) {
  if (s.type === "tip") {
    s.a = { tone: "bad", label: "Instead of", icon: "cross", ...s.a }; s.b = { tone: "good", label: "Use", icon: "check", ...s.b };
    s.verdict ??= s.why;
  }
  if (!s.rows) { need(s, i, ["a", "b", "cap"]); for (const k of ["a", "b"]) if (!Array.isArray(s[k].code)) throw new Error(`steps[${i}] (${s.type}): ${k}.code must be an array of lines`); }
  else need(s, i, ["cap"]);
  s.a = s.a && { tone: "neutral", label: "A", ...s.a }; s.b = s.b && { tone: "good", label: "B", ...s.b };
}

export default function make(type) {
  return {
    type,
    normalize,
    segments(s, reel, cfg) {
      const per = !s.rows && s.a?.say && s.b?.say && s.say;
      if (per) return [{ say: s.a.say, cap: s.a.cap || s.cap, min: cfg.timing.beat }, { say: s.b.say, cap: s.b.cap || s.cap, min: cfg.timing.beat }, { say: s.say, cap: s.cap, min: cfg.timing.beat }];
      return [{ say: s.say || s.cap.join(" "), cap: s.cap, min: s.min || cfg.timing.step }];
    },
    prepare(s, reel, cfg, log) {
      for (const k of ["a", "b"]) {
        const p = s[k]; if (!p) continue;
        if (p.out) { p.out = [].concat(p.out).map((t) => (typeof t === "string" ? { text: t } : t)); continue; }
        const lang = s.langObj || reel.lang, file = s.file || reel.file;
        if (p.run === false || !cfg.execute.enabled || !lang.run) continue;
        const r = runCode({ lang, files: [{ name: file, code: p.code.join("\n") }], entry: file, timeoutSec: cfg.execute.timeoutSec });
        if (!r.ok && !p.error) throw new Error(`${s.name} (${k}): code failed\n${r.stderr}\n(set error:true on ${k} if the error is the point)`);
        p.out = toLines(r, 2, (m) => log(`warning: ${s.name} ${m}`));
        log(`  ${s.name.padEnd(14)} ${k}: ${p.out.map((o) => o.text).join(" | ") || "(no output)"}`);
      }
    },
    css: ({ G }) => `.vs { position: absolute; width: 60px; height: 60px; border-radius: 50%; background: var(--yellow); color: #1e1e1e; font-weight: 700; font-size: 26px; display: flex; align-items: center; justify-content: center; z-index: 3; left: ${G.W / 2 - 30}px; box-shadow: 0 0 0 8px var(--bg); }
  .verdict { position: absolute; left: ${G.left}px; width: ${G.width}px; border-radius: 16px; background: var(--yellow); color: #1e1e1e; font-weight: 700; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 28px; line-height: 1.25; }
  .tb { position: absolute; left: ${G.left}px; width: ${G.width}px; display: flex; align-items: center; border-radius: 14px; background: var(--panel); border: 2px solid #3c3c3c; }
  .tb.hd { background: transparent; border: none; } .tb > div { padding: 0 18px; text-align: center; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .tb .f { width: 32%; color: var(--muted); font-size: 28px; } .tb .a, .tb .b { width: 34%; font-size: 30px; color: #fff; font-family: "JetBrains Mono", monospace; }
  .tb.hd .a { color: var(--red); } .tb.hd .b { color: var(--teal); } .tb.hd > div { font-size: 34px; }`,

    build(s, c) {
      const { G, id, at } = c, top = G.stage.top;
      let body = header(c, s);
      const per = c.segs.length === 3, segT = (j) => c.segs[j].start - c.start;

      if (s.rows) {                                                  // ── table mode
        const heads = s.heads || [s.a?.label || "A", s.b?.label || "B"], n = s.rows.length + 1;
        const rh = Math.min(96, Math.floor((G.stage.bottom - top - 20) / n)) - 12;
        const cell = (v) => { v = String(v); if (/^\+ /.test(v)) return `${icon("check", 30, "var(--teal)")}${esc(v.slice(2))}`; if (/^- /.test(v)) return `${icon("cross", 30, "var(--red)")}${esc(v.slice(2))}`; return esc(v); };
        body += `<div class="tb hd" id="${id}-r0" style="top:${top}px;height:${rh}px"><div class="f"></div><div class="a">${esc(heads[0])}</div><div class="b">${esc(heads[1])}</div></div>`;
        c.FT(`#${id}-r0`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3 }, at(0.4));
        const span = Math.max(1.5, c.dur * 0.7);
        s.rows.forEach((r, i) => {
          const y = top + (i + 1) * (rh + 12);
          body += `<div class="tb" id="${id}-r${i + 1}" style="top:${y}px;height:${rh}px"><div class="f">${esc(r[0])}</div><div class="a">${cell(r[1])}</div><div class="b">${cell(r[2])}</div></div>`;
          const t = 0.9 + (i * span) / s.rows.length;
          c.FT(`#${id}-r${i + 1}`, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, at(t)); c.S("pop", at(t));
        });
        if (s.verdict) {
          const y = top + n * (rh + 12) + 6, vh = Math.min(96, G.stage.bottom - y);
          body += `<div class="verdict" id="${id}-v" style="top:${y}px;height:${vh}px;font-size:${Math.max(22, fitPx(s.verdict, 34, 0.52, G.width - 60))}px">${esc(s.verdict)}</div>`;
          c.FT(`#${id}-v`, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, at(0.9 + span + 0.3)); c.S("ding", at(0.9 + span + 0.3));
        }
        return { html: body };
      }

      // ── panels mode
      const hasV = !!s.verdict, vH = hasV ? 100 : 0, gapV = 56, avail = G.stage.bottom - top - vH - (hasV ? 14 : 0) - gapV, each = Math.floor(avail / 2);
      const outs = [s.a, s.b].map((p) => p.out || []);
      let fs = Math.min(codeFont(s.a.code, G.width - 110, 34, 16), codeFont(s.b.code, G.width - 110, 34, 16));
      const hFor = (f, k) => panelHeight({ n: [s.a, s.b][k].code.length, lh: Math.round(f * 1.62), label: true, result: outs[k].length > 0, pad: 14 });
      while (fs > 16 && Math.max(hFor(fs, 0), hFor(fs, 1)) > each) fs--;
      const hh = Math.max(hFor(fs, 0), hFor(fs, 1)), yA = top, yB = top + hh + gapV;
      const tA = 0.3, tB = per ? segT(1) + 0.2 : 0.3 + c.dur * 0.32, tV = per ? segT(2) + 0.3 : c.dur * 0.74;
      [[s.a, yA, tA, 0], [s.b, yB, tB, 1]].forEach(([p, y, t, k]) => {
        const pan = codePanel(c, { id: `${id}-p${k}`, lines: p.code, x: G.left, y, w: G.width, fs, lh: Math.round(fs * 1.62), label: p.label, tone: p.tone, icon: p.icon, result: outs[k], t0: t, pad: 14, syntax: c.lang.syntax });
        body += pan.html;
        c.FT(`#${id}-p${k}`, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, at(t - 0.05)); c.S("whoosh", at(t - 0.05));
        if (outs[k].length) c.FT(`#${id}-p${k}-res`, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at(pan.tEnd - 0.05));
      });
      body += `<div class="vs" id="${id}-vs" style="top:${yA + hh + (gapV - 60) / 2}px">${type === "tip" ? icon("down", 30, "#1e1e1e") : "VS"}</div>`;
      c.FT(`#${id}-vs`, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, at(tB - 0.2));
      if (hasV) {
        const vy = G.stage.bottom - vH;
        body += `<div class="verdict" id="${id}-v" style="top:${vy}px;height:${vH}px;font-size:${Math.max(22, fitPx(s.verdict, 36, 0.52, G.width - 60))}px">${esc(s.verdict)}</div>`;
        c.FT(`#${id}-v`, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, at(tV)); c.S("ding", at(tV));
      }
      return { html: body };
    },
  };
}

export const compare = make("compare");
export const tip = make("tip");
