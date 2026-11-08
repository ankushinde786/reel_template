// Scene "method": the original look. Up to 3 typed code lines, a before/after row of cells (or a single result), real terminal output.
// Fields: name, desc, code[<=3], before[], after[] | res:[label,value], cap:[l1,l2], say; optional title, pill, bCls/aCls (hit|del|new|ghost per cell index), bLabel/aLabel, error:true, out:[..] (skip running).
import { esc, header, typeLines, need, fitPx } from "./_kit.mjs";
import { runCode, toLines } from "../run.mjs";

export default {
  type: "method",
  chrome: { terminal: true },

  normalize(s, i) {
    need(s, i, ["name", "desc", "code", "before", "cap"]);
    if (s.code.length > 3) throw new Error(`steps[${i}] (method): max 3 code lines (use type:"code" for more)`);
    if (!s.res && !s.after) throw new Error(`steps[${i}] (method): give either after[] or res:[label,value]`);
    s.pill ??= `${s.name}()`;
  },

  segments: (s, reel, cfg) => [{ say: s.say || s.cap.join(" "), cap: s.cap, min: s.min || cfg.timing.step }],

  prepare(s, reel, cfg, log) {
    if (s.out) { s.out = s.out.map((t) => (typeof t === "string" ? { text: t } : t)); return; }
    if (s.run === false || !cfg.execute.enabled) throw new Error(`${s.name}: no out:[...] given and running is off`);
    const file = s.file || reel.file, r = runCode({ lang: reel.lang, files: [{ name: file, code: s.code.join("\n") }], entry: file, timeoutSec: cfg.execute.timeoutSec });
    if (!r) throw new Error(`${s.name}: language "${reel.langId}" has no run command; give out:[...]`);
    if (!r.ok && !s.error) throw new Error(`${s.name}: snippet failed\n${r.stderr}\n(set error: true on the step if the error is the point)`);
    s.out = toLines(r, 2, (m) => log(`warning: ${s.name} ${m}`));
    log(`  ${s.name.padEnd(12)} -> ${s.out.map((o) => o.text).join(" | ")}`);
  },

  css: ({ G }) => `
  .gutter-line { position: absolute; left: ${G.left + 52}px; width: 2px; height: 236px; background: #2f2f2f; }
  .ln { position: absolute; left: ${G.left}px; height: 76px; line-height: 76px; font-size: 38px; white-space: pre; font-family: "JetBrains Mono", monospace; }
  .ln .no { display: inline-block; width: 52px; color: var(--dim); text-align: left; }
  .ln .tx { display: inline-block; margin-left: 12px; white-space: pre; }
  .lab { position: absolute; left: ${G.left}px; font-size: 26px; color: var(--dim); letter-spacing: 1px; font-family: "JetBrains Mono", monospace; }
  .lrow { position: absolute; left: 0; width: ${G.W}px; height: 92px; display: flex; align-items: center; justify-content: center; gap: 14px; }
  .br { font-size: 96px; line-height: 92px; color: #5a5a5a; margin: 0 6px; font-family: "JetBrains Mono", monospace; }
  .cell { position: relative; height: 92px; border: 3px solid var(--cellBorder); border-radius: 14px; background: var(--cell); display: flex; align-items: center; justify-content: center; font-size: 34px; font-family: "JetBrains Mono", monospace; }
  .cell .n { color: var(--syn-n); font-size: 42px; } .cell .s { color: var(--syn-s); }
  .cell .ixn { position: absolute; left: 10px; top: 4px; font-size: 20px; color: #6f8f89; }
  .cell.new { border-color: var(--teal); background: var(--newBg); }
  .cell.ghost { border-style: dashed; border-color: #555; background: transparent; width: 220px !important; }
  .res { position: absolute; left: ${G.left}px; width: ${G.width}px; height: 92px; display: flex; align-items: center; justify-content: center; gap: 28px; font-family: "JetBrains Mono", monospace; }
  .res .rl { font-size: 34px; color: var(--syn-f); } .res .ra { font-size: 48px; color: var(--teal); } .res .rv { font-size: 72px; font-weight: 700; color: var(--syn-n); }
  .gh { color: #6a6a6a; font-style: italic; }
  `,

  build(m, c) {
    const { G, id, at, reel } = c, brackets = reel.brackets, top = G.stage.top;
    const title = m.title || `${reel.subject}.${m.name}()`;
    let body = header(c, m, { titleHtml: c.code([title])[0], titleText: title, code: true }) + `<div class="gutter-line" style="top:${top - 16}px"></div>`;

    const rowHtml = (rid, items, cls = {}, y) => {
      const maxc = Math.max(...items.map((t) => t.length));
      let w = Math.max(96, maxc * 19 + 40);
      if (items.length * w + (items.length - 1) * 14 > 700) w = Math.floor((700 - (items.length - 1) * 14) / items.length);
      const cells = items.map((t, i) => `<div class="cell ${cls[i] || ""}" id="${rid}-c${i}" style="width:${w}px">${cls[i] === "ghost" ? "" : `<span class="ixn">${i}</span>`}<span class="${/^-?\d+$/.test(t) ? "n" : cls[i] === "ghost" ? "gh" : "s"}">${esc(t)}</span></div>`).join("");
      return `<div class="lrow" id="${rid}" style="top:${y}px"><span class="br">${esc(brackets[0])}</span>${cells}<span class="br">${esc(brackets[1])}</span></div>`;
    };

    const html = c.code(m.code);
    m.code.forEach((line, i) => { body += `<div class="ln" id="${id}-l${i}" style="top:${top + i * 76}px"><span class="no">${i + 1}</span><span class="tx" id="${id}-t${i}">${html[i]}</span></div>`; });
    const { ends } = typeLines(c, `${id}-t`, m.code, 0.4), last = ends.length - 1, e0 = ends[0], e1 = ends[Math.min(1, last)], e2 = ends[last];

    body += `<div class="lab" id="${id}-lb" style="top:${top + 250}px">${esc(m.bLabel || "before")}</div>`;
    body += rowHtml(`${id}-b`, m.before, m.bCls || {}, top + 282);
    c.FT(`#${id}-lb,#${id}-b`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, at(e0 + 0.1));
    c.S("pop", at(e0 + 0.1));
    const tA = e1 + 0.15, bc = Object.values(m.bCls || {}), ac = Object.values(m.aCls || {});
    if (m.res) c.S("ding", at(tA)); else if (bc.includes("del")) c.S("thud", at(tA)); else c.S("swap", at(tA));
    if (ac.includes("new")) c.S("ding", at(tA + 0.2));
    if (bc.includes("hit")) c.S("tick", at(tA));
    if (m.res) {
      body += `<div class="res" id="${id}-res" style="top:${top + 434}px"><span class="rl">${esc(m.res[0])}</span><span class="ra">→</span><span class="rv">${esc(m.res[1])}</span></div>`;
      c.FT(`#${id}-res`, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, at(tA));
    } else {
      body += `<div class="lab" id="${id}-la" style="top:${top + 402}px">${esc(m.aLabel || "after")}</div>`;
      body += rowHtml(`${id}-a`, m.after, m.aCls || {}, top + 434);
      c.FT(`#${id}-la,#${id}-a`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, at(tA));
    }
    Object.entries(m.bCls || {}).forEach(([i, k]) => {
      if (k === "hit") c.T(`#${id}-b-c${i}`, { borderColor: c.theme.yellow, backgroundColor: c.theme.hitBg, duration: 0.25 }, at(tA));
      if (k === "del") c.T(`#${id}-b-c${i}`, { borderColor: c.theme.red, backgroundColor: c.theme.delBg, duration: 0.25 }, at(tA));
    });

    // terminal output goes into the fixed TERMINAL panel (chrome) at y = 1006 (classic geometry)
    const tTop = G.term?.top ?? 1006, tp = e2 + 0.12;
    c.S("enter", at(tp)); c.S("tick", at(tp + 0.35));
    body += `<div class="tline prompt" id="${id}-o0" style="top:${tTop + 52}px">${esc(reel.lang.prompt.replaceAll("{file}", m.file || reel.file))}</div>`;
    c.FT(`#${id}-o0`, { opacity: 0 }, { opacity: 1, duration: 0.2 }, at(tp));
    m.out.forEach((o, i) => {
      body += `<div class="tline ${o.err ? "err" : ""}" id="${id}-o${i + 1}" style="top:${tTop + 96 + i * 44}px;font-size:${fitPx(o.text, 32, 0.6, G.width)}px">${esc(o.text)}</div>`;
      c.FT(`#${id}-o${i + 1}`, { opacity: 0 }, { opacity: 1, duration: 0.2 }, at(tp + 0.35));
    });
    return { html: body, chrome: { terminal: { top: tTop, height: G.term?.height ?? 200 } } };
  },
};
