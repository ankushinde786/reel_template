// Scene "walkthrough": explain LONG code. Several files as tabs, a code viewport with real vertical (and horizontal) scroll bars that scrolls
// to the part being explained, a highlighted line range with the rest dimmed, a "file > function" breadcrumb, a note card per beat and an
// optional terminal that slides up with the program's real output.
// Fields: name, title, files:[{ name, lang?, code: "multi-line string" | [lines] }], entry (file to run; default main.* or the first file),
//   beats:[{ file?, lines:[from,to] | n (1-based), fn?:"name()"|false, note:"text", say, cap, run:true | out:[..] }],  cap, say (used when beats have no own say)
import { esc, header, need, icon, fitPx, vScroll, hScroll } from "./_kit.mjs";
import { highlight } from "../highlight.mjs";
import { runCode, toLines } from "../run.mjs";

const FN = [
  /^\s*(?:async\s+)?def\s+(\w+)/, /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)/, /^\s*func\s+(?:\([^)]*\)\s*)?(\w+)/, /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/,
  /^\s*(?:(?:public|private|protected|static|final|async|abstract|override)\s+)+[\w<>\[\],.?\s]+?\s+(\w+)\s*\(/, /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?[\w,\s]*\)?\s*=>/,
  /^(?:static\s+)?[A-Za-z_][\w\s\*]*?\s\**(\w+)\s*\([^;]*$/,
];
const CLS = /^\s*(?:export\s+)?(?:public\s+)?(?:abstract\s+)?(?:class|struct|interface|trait)\s+(\w+)/;
function fnAt(lines, i) {
  for (let k = i; k >= 0; k--) {
    const l = lines[k]; if (/^\s*(?:if|for|while|switch|else|return|elif)\b/.test(l)) continue;
    let m = CLS.exec(l); if (m) return `class ${m[1]}`;
    for (const re of FN) if ((m = re.exec(l))) return `${m[1]}()`;
  }
  return null;
}
const toLinesArr = (c) => (Array.isArray(c) ? c : String(c).replace(/\s+$/, "").split("\n")).map((l) => l.replace(/\t/g, "    "));

export default {
  type: "walkthrough",
  chrome: { tabs: null },                      // the tab strip is drawn by the scene (it changes while the scene plays)

  normalize(s, i) {
    need(s, i, ["files", "beats"]);
    s.files = s.files.map((f, k) => ({ ...f, name: f.name || `file${k}`, lines: toLinesArr(f.code) }));
    s.entry ||= (s.files.find((f) => /^main\./.test(f.name)) || s.files[0]).name;
    let cur = s.files[0].name;
    s.beats = s.beats.map((b, k) => {
      const file = b.file || cur; cur = file;
      const f = s.files.find((x) => x.name === file); if (!f) throw new Error(`steps[${i}].beats[${k}]: file "${file}" is not in files[]`);
      let lines = b.lines == null ? null : [].concat(b.lines); if (lines && lines.length === 1) lines = [lines[0], lines[0]];
      if (lines && (lines[0] < 1 || lines[1] > f.lines.length || lines[0] > lines[1])) throw new Error(`steps[${i}].beats[${k}]: lines ${lines} are outside ${file} (${f.lines.length} lines)`);
      return { ...b, file, lines };
    });
    s.cap ||= [s.title || s.name];
  },

  segments(s, reel, cfg) {
    const per = s.beats.length > 1 && s.beats.every((b) => b.say);
    if (per) return s.beats.map((b) => ({ say: b.say, cap: b.cap || s.cap, min: b.min || cfg.timing.beat }));
    return [{ say: s.say || s.cap.join(" "), cap: s.cap, min: Math.max(cfg.timing.step, 1.6 + s.beats.length * 3.2) }];
  },

  prepare(s, reel, cfg, log) {
    if (!s.beats.some((b) => b.run)) return;
    const lang = s.langObj || reel.lang, r = runCode({ lang, files: s.files.map((f) => ({ name: f.name, code: f.lines.join("\n") })), entry: s.entry, timeoutSec: cfg.execute.timeoutSec });
    if (!r) throw new Error(`${s.name}: language ${lang.id} has no run command; give out:[...] on the beat`);
    if (!r.ok && !s.error) throw new Error(`${s.name}: program failed\n${r.stderr}`);
    s.runOut = toLines(r, cfg.walkthrough.maxOutLines, (m) => log(`warning: ${s.name} ${m}`));
    log(`  ${s.name.padEnd(14)} -> ${s.runOut.map((o) => o.text).join(" | ")}`);
  },

  css: ({ G, cfg }) => `
  .wtab { position: absolute; top: ${G.tabbar.top}px; height: ${G.tabbar.h}px; display: flex; align-items: center; gap: 14px; padding: 0 26px; font-size: 28px; border-top: 4px solid transparent; background: var(--panel); color: var(--muted); }
  .wtab .ti { width: 20px; height: 20px; border-radius: 6px; }
  .wpanel { position: absolute; border-radius: 18px; background: var(--term); border: 2px solid #2b2b2b; overflow: hidden; }
  .wcr { position: absolute; left: 0; right: 0; top: 0; height: 44px; background: var(--panel); border-bottom: 2px solid #2b2b2b; }
  .wcr .b { position: absolute; left: 22px; top: 0; height: 44px; display: flex; align-items: center; gap: 10px; font-size: 22px; color: var(--muted); font-family: "JetBrains Mono", monospace; white-space: nowrap; }
  .wcr .b .fn { color: var(--syn-f); font-weight: 700; } .wcr .b svg { opacity: .7; }
  .wf { position: absolute; overflow: hidden; }
  .wf-in { position: absolute; left: 0; top: 0; width: 100%; }
  .wf .gut { position: absolute; left: 0; top: 0; background: var(--term); z-index: 2; }
  .wf .cx { position: absolute; top: 0; }
  .wl { position: absolute; left: 0; white-space: pre; font-family: "JetBrains Mono", monospace; }
  .wl.n { text-align: right; color: var(--dim); padding-right: 14px; }
  .hlb { position: absolute; left: 0; right: 0; background: rgba(255,212,59,.12); box-shadow: inset 6px 0 0 var(--yellow); z-index: 1; opacity: 0; }
  .shd { position: absolute; left: 0; right: 0; background: rgba(0,0,0,${cfg.walkthrough.dim}); z-index: 3; pointer-events: none; }
  .wnote { position: absolute; border-radius: 16px; border: 2px solid var(--yellow); background: color-mix(in srgb, var(--yellow) 9%, var(--panel)); display: flex; align-items: center; gap: 18px; padding: 0 24px; }
  .wnote .nt { font-weight: 700; color: #fff; line-height: 1.25; }
  .wnote .ni { width: 46px; height: 46px; border-radius: 50%; background: var(--yellow); color: #1e1e1e; display: flex; align-items: center; justify-content: center; flex: none; }
  .wterm { position: absolute; border-radius: 0; background: #0b0d10; border-top: 3px solid var(--accent); z-index: 5; }
  .wterm .hd { position: absolute; left: 22px; top: 8px; font-size: 20px; letter-spacing: 3px; color: #bbb; font-family: "JetBrains Mono", monospace; }
  .wterm .tl { position: absolute; left: 22px; white-space: pre; font-family: "JetBrains Mono", monospace; }
  .wterm .tl.p { color: var(--green); } .wterm .tl.e { color: var(--red); } .wterm .tl.o { color: #d4d4d4; }
  .wf .sb { z-index: 6; }
  `,

  build(s, c) {
    const { G, id, at, cfg } = c, W = cfg.walkthrough, lang = c.lang;
    const pm = W.panelMargin ?? 72, pW = G.W - 2 * pm;
    let body = header(c, s, { compact: true, titleText: s.title || s.name });
    const pTop = G.header.title + 86, crH = 44, noteH = 118, noteTop = G.stage.bottom - noteH, vTop = pTop + crH, vH = noteTop - 14 - vTop;
    const fs = W.fontSize, lh = Math.round(fs * W.lineHeight), cw = fs * 0.6;

    // tabs (drawn on the chrome tab bar)
    const tabW = (n) => Math.min(340, n.length * 17 + 92); let tx = pm;
    s.files.forEach((f, fi) => {
      const fl = f.langObj || (f.lang && cfg.languages[f.lang] ? { id: f.lang, ...cfg.languages[f.lang] } : c.lang), col = fl.color || ["#888"];
      f.tab = `<div class="wtab" id="${id}-tab${fi}" style="left:${tx}px;width:${tabW(f.name)}px"><span class="ti" style="background:${col.length > 1 ? `linear-gradient(135deg,${col[0]} 50%,${col[1]} 50%)` : col[0]}"></span>${esc(f.name)}</div>`;
      body += f.tab; tx += tabW(f.name) + 4;
    });
    body += `<div class="wpanel" style="left:${pm}px;top:${pTop}px;width:${pW}px;height:${crH + vH}px"><div class="wcr"></div></div>`;

    // files
    const info = s.files.map((f, fi) => {
      const fl = f.lang && cfg.languages[f.lang] ? { id: f.lang, ...cfg.languages[f.lang] } : c.lang, html = highlight(f.lines, fl.syntax, fl.keywords);
      const n = f.lines.length, gw = String(n).length * cw + 40, vw = pW - gw - 22, contentH = n * lh + 20, codeW = Math.max(...f.lines.map((l) => l.length)) * cw + 40;
      const maxS = Math.max(0, contentH - vH), hOver = codeW > vw, maxX = Math.max(0, codeW - vw), vOver = maxS > 0;
      let h = `<div class="wf" id="${id}-f${fi}" style="left:${pm + 2}px;top:${vTop}px;width:${pW - 4}px;height:${vH}px;opacity:0"><div class="wf-in" id="${id}-f${fi}-in" style="height:${contentH}px">`;
      h += `<div class="hlb" id="${id}-f${fi}-hl" style="top:0;height:${lh}px"></div>`;
      h += `<div class="cx" id="${id}-f${fi}-cx" style="left:${gw}px;width:${codeW}px;height:${contentH}px">`;
      f.lines.forEach((l, i) => { h += `<div class="wl" style="top:${10 + i * lh}px;height:${lh}px;line-height:${lh}px;font-size:${fs}px">${html[i] || ""}</div>`; });
      h += `</div><div class="gut" style="width:${gw}px;height:${contentH}px">`;
      f.lines.forEach((l, i) => { h += `<div class="wl n" style="top:${10 + i * lh}px;height:${lh}px;line-height:${lh}px;font-size:${fs - 4}px;width:${gw}px">${i + 1}</div>`; });
      h += `</div>`;
      h += `<div class="shd" id="${id}-f${fi}-st" style="top:0;height:0"></div><div class="shd" id="${id}-f${fi}-sb" style="top:0;height:0"></div></div>`;
      const trackH = vH - 16 - (hOver ? 18 : 0), thumbH = Math.max(36, Math.round(trackH * Math.min(1, vH / contentH))), hThumbW = Math.max(40, Math.round((vw - 8) * Math.min(1, vw / codeW)));
      if (W.scrollbar && vOver) h += vScroll(`${id}-f${fi}`, { x: pW - 4 - 18, y: 8, h: trackH, thumbH });
      if (W.scrollbar && hOver) h += hScroll(`${id}-f${fi}`, { x: gw + 6, y: vH - 20, w: vw - 12, thumbW: hThumbW });
      h += `</div>`;
      body += h;
      return { f, fi, n, gw, vw, contentH, maxS, maxX, hOver, vOver, trackH, thumbH, hThumbW, codeW };
    });

    // beats
    const nB = s.beats.length, per = c.segs.length === nB && nB > 1, lead = 0.5;
    const bStart = (i) => (per ? c.segs[i].start - c.start : lead + 0.8 + (i * (c.dur - lead - 1.2)) / nB);
    const bEnd = (i) => (i === nB - 1 ? c.dur - 0.2 : bStart(i + 1));
    let cur = -1, state = info.map(() => ({ y: 0, x: 0 }));
    const sec = W.scrollSeconds;
    const runIdx = s.beats.findIndex((b) => b.run || b.out);

    s.beats.forEach((b, bi) => {
      const fi = s.files.findIndex((f) => f.name === b.file), I = info[fi], t0 = bStart(bi), t1 = bEnd(bi), pre = `${id}-f${fi}`;
      if (fi !== cur) {                                              // switch file
        if (cur >= 0) { c.T(`#${id}-f${cur}`, { opacity: 0, duration: 0.2 }, at(t0)); c.T(`#${id}-tab${cur}`, { backgroundColor: c.theme.panel, color: c.theme.muted, borderTopColor: "rgba(0,0,0,0)", duration: 0.2 }, at(t0)); }
        const first = !state[fi].shown;
        c.T(`#${id}-f${fi}`, { opacity: 1, duration: 0.25 }, at(first && cur < 0 ? 0.3 : t0 + 0.05));
        c.T(`#${id}-tab${fi}`, { backgroundColor: c.theme.bg, color: "#ffffff", borderTopColor: c.theme.accent, duration: 0.2 }, at(cur < 0 ? 0.3 : t0));
        if (first) {
          const at0 = cur < 0 ? 0.35 : t0 + 0.1;
          c.FT(`#${pre} .wl`, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: Math.min(0.025, 1.0 / (I.n * 2)) }, at(at0)); c.S("typing", at(at0), Math.min(1.2, I.n * 0.03));
          state[fi].shown = true;
        }
        c.S("swap", at(t0)); cur = fi;
      }
      // scroll
      const L = b.lines;
      if (L) {
        const [a, z] = L, top = 10 + (a - 1) * lh, hgt = (z - a + 1) * lh;
        let sy = top - 2 * lh; if (z * lh + 20 > sy + vH - lh && hgt < vH - 3 * lh) sy = 10 + z * lh - vH + 2 * lh;
        sy = Math.max(0, Math.min(I.maxS, sy));
        const maxLen = Math.max(...s.files[fi].lines.slice(a - 1, z).map((l) => l.length)), need = maxLen * cw + 40;
        let sx = I.hOver && need > I.vw + 24 ? -Math.min(I.maxX, need - I.vw) : 0;      // pan only when the highlighted lines really run off the edge
        const ts = t0 + 0.15, prev = state[fi];
        if (sy !== prev.y || sx !== prev.x) {
          c.T(`#${pre}-in`, { y: -sy, duration: sec, ease: "power2.inOut" }, at(ts)); c.T(`#${pre}-cx`, { x: sx, duration: sec, ease: "power2.inOut" }, at(ts));
          if (I.vOver && W.scrollbar) { const ty = I.maxS ? Math.round((sy / I.maxS) * (I.trackH - I.thumbH)) : 0; c.T(`#${pre}-thumb`, { y: ty, duration: sec, ease: "power2.inOut" }, at(ts)); c.T(`#${pre}-thumb`, { backgroundColor: "rgba(225,232,245,.95)", duration: 0.15 }, at(ts)); c.T(`#${pre}-thumb`, { backgroundColor: "rgba(190,200,215,.55)", duration: 0.4 }, at(ts + sec)); }
          if (I.hOver && W.scrollbar) { const tx2 = I.maxX ? Math.round((-sx / I.maxX) * (I.vw - 12 - I.hThumbW)) : 0; c.T(`#${pre}-hthumb`, { x: tx2, duration: sec, ease: "power2.inOut" }, at(ts)); }
          c.S("swap", at(ts)); prev.y = sy; prev.x = sx;
        }
        // highlight range + dim the rest (positions are in scrolled-content coordinates)
        const th = t0 + 0.35, hlTop = top, hlBot = top + hgt;
        c.T(`#${pre}-hl`, { top: hlTop, height: hgt, opacity: 1, duration: 0.35, ease: "power2.out" }, at(th));
        c.T(`#${pre}-st`, { height: hlTop, duration: 0.35 }, at(th));
        c.T(`#${pre}-sb`, { top: hlBot, height: I.contentH - hlBot, duration: 0.35 }, at(th));
        c.S("tick", at(th));
      } else {
        c.T(`#${pre}-hl`, { opacity: 0, duration: 0.2 }, at(t0)); c.T(`#${pre}-st`, { height: 0, duration: 0.2 }, at(t0)); c.T(`#${pre}-sb`, { height: 0, duration: 0.2 }, at(t0));
      }
      // breadcrumb
      const fnl = b.fn === false ? null : b.fn || (L ? fnAt(s.files[fi].lines, L[0] - 1) : null);
      body += `<div class="wcr" id="${id}-cr${bi}" style="left:${pm + 2}px;top:${pTop + 2}px;width:${pW - 4}px;opacity:0"><div class="b">${icon("fn", 22)}<span>${esc(b.file)}</span>${fnl ? `<span>›</span><span class="fn">${esc(fnl)}</span>` : ""}${L ? `<span style="margin-left:18px;opacity:.6">lines ${L[0]}${L[1] > L[0] ? "–" + L[1] : ""}</span>` : ""}</div></div>`;
      c.T(`#${id}-cr${bi}`, { opacity: 1, duration: 0.2 }, at(t0 + 0.1));
      if (bi < nB - 1) c.T(`#${id}-cr${bi}`, { opacity: 0, duration: 0.15 }, at(t1 - 0.05));
      // note card
      const nt = b.note || "";
      if (nt) {
        body += `<div class="wnote" id="${id}-nt${bi}" style="left:${pm}px;top:${noteTop}px;width:${pW}px;height:${noteH}px;opacity:0"><span class="ni">${icon(b.icon || "bulb", 28, "#1e1e1e")}</span><span class="nt" style="font-size:${Math.max(22, fitPx(nt, 34, 0.5, (pW - 140) * 1.55))}px">${esc(nt)}</span></div>`;
        c.T(`#${id}-nt${bi}`, { opacity: 1, duration: 0.25 }, at(t0 + 0.25)); c.S("pop", at(t0 + 0.25));
        if (bi < nB - 1) c.T(`#${id}-nt${bi}`, { opacity: 0, duration: 0.15 }, at(t1 - 0.05));
      }
    });
    // the nt font fit above uses a rough two-line allowance; the card clips overflow rather than overlapping code
    body = body.replace(/class="wnote"/g, 'class="wnote" data-clip="1"');

    // terminal slide-up
    const outs = s.runOut || (s.beats.find((b) => b.out)?.out || []).map((t) => (typeof t === "string" ? { text: t } : t));
    if (runIdx >= 0) {
      const bi = runIdx, rows = Math.min(outs.length, W.maxOutLines), tH = 66 + 44 * (rows + 1), tt = bStart(bi) + 0.9, fl = info[s.files.findIndex((f) => f.name === s.beats[bi].file)];
      const prompt = lang.prompt.replaceAll("{file}", s.entry);
      let h = `<div class="wterm" id="${id}-tm" style="left:${pm + 2}px;top:${vTop + vH - tH}px;width:${pW - 4}px;height:${tH}px;opacity:0"><span class="hd">TERMINAL</span><div class="tl p" style="top:48px;font-size:28px">${esc(prompt)}</div>`;
      outs.slice(0, rows).forEach((o, i) => { h += `<div class="tl ${o.err ? "e" : "o"}" id="${id}-to${i}" style="top:${48 + 44 * (i + 1)}px;font-size:${Math.max(18, fitPx(o.text, 28, 0.6, pW - 60))}px;opacity:0">${esc(o.text)}</div>`; });
      h += `</div>`; body += h;
      c.FT(`#${id}-tm`, { opacity: 0, y: tH }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, at(tt)); c.S("whoosh", at(tt)); c.S("enter", at(tt + 0.45));
      outs.slice(0, rows).forEach((_, i) => { c.T(`#${id}-to${i}`, { opacity: 1, duration: 0.15 }, at(tt + 0.7 + i * 0.14)); c.S("tick", at(tt + 0.7 + i * 0.14)); });
      if (runIdx < nB - 1) c.T(`#${id}-tm`, { opacity: 0, duration: 0.2 }, at(bEnd(runIdx) - 0.05));
    }
    return { html: body, chrome: { tabs: null } };
  },
};
