// Scene "code": a code card (any number of lines, auto font size) with REAL output, optional line-by-line notes.
// Fields: name, title, desc, code:[lines], cap, say, hi:[lineIndex..], notes:["text" | {text, say, cap}] (note i highlights hi[i]; with notes the code appears fast and you step through it),
//         out:[..] (skip running) | out:false (no terminal) | error:true | run:false | file | lang.
import { esc, header, need, fitPx, codePanel, codeFont, panelHeight, terminalSlot, terminalOutput, segsFromBeats } from "./_kit.mjs";
import { runCode, toLines } from "../run.mjs";

export default {
  type: "code",

  normalize(s, i) {
    need(s, i, ["code", "cap"]);
    if (!Array.isArray(s.code)) throw new Error(`steps[${i}] (code): code must be an array of lines`);       // any length; the font shrinks to fit (use type:"walkthrough" to scroll through long files)
    s.notes = (s.notes || []).map((n) => (typeof n === "string" ? { text: n } : n));
    s.hi ||= s.notes.map((_, k) => k);
  },

  segments: (s, reel, cfg) => segsFromBeats(s, s.notes, cfg.timing, s.cap),

  prepare(s, reel, cfg, log) {
    if (s.out === false) return;
    if (s.out) { s.out = s.out.map((t) => (typeof t === "string" ? { text: t } : t)); return; }
    const lang = s.langObj || reel.lang, file = s.file || reel.file;
    if (s.run === false || !cfg.execute.enabled || !lang.run) { s.out = false; return; }
    const r = runCode({ lang, files: [{ name: file, code: s.code.join("\n") }], entry: file, timeoutSec: cfg.execute.timeoutSec });
    if (!r.ok && !s.error) throw new Error(`${s.name}: code failed\n${r.stderr}\n(set error: true if the error is the point, or run:false)`);
    s.out = toLines(r, 4, (m) => log(`warning: ${s.name} ${m}`));
    log(`  ${s.name.padEnd(14)} -> ${s.out.map((o) => o.text).join(" | ") || "(no output)"}`);
  },

  css: () => `.note { position: absolute; border-radius: 16px; border: 2px solid var(--yellow); background: color-mix(in srgb, var(--yellow) 10%, var(--panel)); padding: 0 26px; display: flex; align-items: center; gap: 18px; }
  .note .nt { font-size: 32px; font-weight: 700; color: #fff; line-height: 40px; }
  .note .nn { width: 44px; height: 44px; border-radius: 50%; background: var(--yellow); color: #1e1e1e; font-weight: 700; font-size: 26px; display: flex; align-items: center; justify-content: center; flex: none; }`,

  build(s, c) {
    const { G, id, at, reel } = c, lang = c.lang, file = s.file || reel.file, out = s.out || [];
    const hasNotes = s.notes.length > 0, noteH = hasNotes ? 124 : 0, top = G.stage.top;
    let body = header(c, s);
    const slot = out.length || s.out !== false ? terminalSlot(c, Math.max(1, out.length)) : null;
    const bottom = slot ? (slot.chrome ? G.stage.bottom : slot.top - 18) : G.stage.bottom - 10;
    const avail = bottom - top - noteH - (hasNotes ? 16 : 0);
    let fs = codeFont(s.code, G.width - 110, 40, 18), lh;
    for (; fs > 18; fs--) { lh = Math.round(fs * 1.62); if (panelHeight({ n: s.code.length, lh }) <= avail) break; }
    lh = Math.round(fs * 1.62);
    const panel = codePanel(c, { id: `${id}-cp`, lines: s.code, x: G.left, y: top, w: G.width, fs, lh, t0: 0.4, hi: hasNotes ? [] : s.hi, total: hasNotes ? 1.6 : undefined, syntax: lang.syntax });
    body += panel.html;

    let tEnd = panel.tEnd;
    if (hasNotes) {
      const ny = top + panel.h + 16, per = s.segs.length === s.notes.length && s.notes.length > 1, n = s.notes.length;
      s.notes.forEach((nt, i) => {
        body += `<div class="note" id="${id}-n${i}" style="left:${G.left}px;top:${ny}px;width:${G.width}px;height:${noteH}px"><span class="nn">${i + 1}</span><span class="nt" style="font-size:${Math.max(22, fitPx(nt.text, 32, 0.52, G.width - 150))}px">${esc(nt.text)}</span></div>`;
        const t0 = per ? c.segs[i].start - c.start + 0.25 : panel.tEnd + 0.4 + (i * (c.dur - panel.tEnd - 2.0)) / n;
        const t1 = per ? c.segs[i].start - c.start + c.segs[i].dur - 0.1 : t0 + (c.dur - panel.tEnd - 2.0) / n - 0.15;
        c.FT(`#${id}-n${i}`, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, at(t0)); c.S("pop", at(t0));
        if (i < n - 1 || !slot) c.T(`#${id}-n${i}`, { opacity: 0, duration: 0.15 }, at(t1));
        const li = s.hi[i];
        if (li != null) {
          c.T(`#${id}-cp-h${li}`, { backgroundColor: "rgba(255,212,59,0.14)", boxShadow: "inset 6px 0 0 #ffd43b", duration: 0.25 }, at(t0));
          if (i < n - 1) c.T(`#${id}-cp-h${li}`, { backgroundColor: "rgba(255,212,59,0)", boxShadow: "inset 0px 0 0 #ffd43b", duration: 0.2 }, at(t1));
        }
        tEnd = Math.max(tEnd, t0);
      });
    }
    if (slot) {
      const tOut = hasNotes ? Math.max(tEnd + 0.6, c.dur - 0.5 - (0.35 + out.length * 0.12) - 0.4) : tEnd + 0.15;
      const to = terminalOutput(c, { id, prompt: lang.prompt.replaceAll("{file}", file), out, slot, t: Math.min(tOut, c.dur - 1.2) });
      body += to.html;
    }
    return { html: body, chrome: slot?.chrome ? { terminal: true } : {} };
  },
};
