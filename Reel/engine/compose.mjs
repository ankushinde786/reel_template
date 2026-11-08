// Turns a resolved reel (scenes + timings + voice/sfx info) into the HyperFrames composition (index.html), captions (SRT) and narration.
// compose() knows nothing about specific scene types: it asks each scene module (engine/scenes/*.mjs) to build its own HTML + tweens.
import { esc } from "./util.mjs";
import { highlight } from "./highlight.mjs";
import { sec } from "./layout.mjs";
import { sceneModules } from "./scenes/index.mjs";

/** every narrated piece of the reel, in order: [{ say, cap, min }] */
export function narrationFor(reel) { return reel.all.flatMap((s) => s.segs.map((g) => g.say)); }

function capWindows(start, dur, cap) {
  const usable = dur - 0.6, total = cap.reduce((a, c) => a + c.length, 0) || 1;
  let t = start + 0.3; const out = [];
  cap.forEach((line, i) => { const len = usable * line.length / total, a = t, b = i === cap.length - 1 ? start + dur - 0.3 : t + len - 0.05; out.push([a, b, line]); t += len; });
  return out;
}

/** Splits narration into short on-screen phrases (break at punctuation first, then at word boundaries) and times them over the voice. */
function speechWindows(start, span, say, max) {
  const parts = String(say).replace(/\s+/g, " ").trim().split(/(?<=[.!?;:,])\s+/), chunks = [];
  for (const part of parts) { let cur = ""; for (const w of part.split(" ")) { if (cur && (cur + " " + w).length > max) { chunks.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; } if (cur) chunks.push(cur); }
  for (let i = chunks.length - 1; i > 0; i--) if (chunks[i].length < 8 && (chunks[i - 1] + " " + chunks[i]).length <= max + 6) { chunks[i - 1] += " " + chunks[i]; chunks.splice(i, 1); }
  const total = chunks.reduce((a, x) => a + x.length, 0) || 1; let t = start;
  return chunks.map((txt) => { const d = span * txt.length / total, a = t; t += d; return [a, Math.max(a + 0.3, t - 0.04), txt]; });
}

const tabIcon = (lang) => { const c = lang.color || ["#888"]; return c.length > 1 ? `linear-gradient(135deg,${c[0]} 50%,${c[1]} 50%)` : c[0]; };

export function compose(reel, ctx) {
  const { G, theme, cfg } = reel, { W, H } = G;
  const { S, sfxEvents, voiceClips, cfgSound, overlays = {}, endCard } = ctx;
  const last = reel.all.at(-1).t, MAIN = +(last.start + last.dur).toFixed(3), DUR = +(MAIN + (endCard ? endCard.dur : 0)).toFixed(3);
  const tw = [], caps = [];
  const T = (sel, vars, at) => tw.push(`tl.to(${JSON.stringify(sel)}, ${JSON.stringify(vars)}, ${at.toFixed(3)});`);
  const FT = (sel, from, to, at) => tw.push(`tl.fromTo(${JSON.stringify(sel)}, ${JSON.stringify(from)}, ${JSON.stringify(to)}, ${at.toFixed(3)});`);
  const RAW = (js) => tw.push(js);

  const rgb = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const deco = G.deco ? reel.texture.slice(0, Math.max(1, Math.floor((G.deco.h - 24) / 36))).map((l, i) => `<div class="tex" style="top:${24 + i * 36}px"><span>${String(i + 1).padStart(2, " ")}</span> ${esc(l)}</div>`).join("") : "";

  const chromeHtml = (id, sc, flags = {}) => {
    const lang = sc.langObj || reel.lang, t = sc.t;
    let h = `<div id="${id}-chrome" class="clip chrome" data-start="${sec(t.start)}" data-duration="${sec(t.dur)}" data-track-index="0" data-layout-ignore>`;
    const tabs = flags.tabs === undefined ? [{ name: sc.file || reel.file }] : flags.tabs;
    h += `<div class="tabbar">${tabs ? tabs.map((x, i) => `<div class="tab"><span class="ti" style="background:${tabIcon(lang)}"></span>${esc(x.name)}</div>`).join("") : ""}</div>`;
    const r = flags.terminal === true ? G.term : flags.terminal;
    if (r) { h += `<div class="term" style="top:${r.top}px;height:${r.height}px"><div class="hd">TERMINAL</div></div>`; }
    if (G.deco && !flags.noDeco) h += `<div class="texwrap">${deco}</div>`;
    h += `<div class="status"><span style="left:${G.left}px">${esc(reel.status)}</span><span style="right:${G.left}px">UTF-8</span></div></div>`;
    return h;
  };

  let layersHtml = "", css = "", usedCss = new Set();
  reel.all.forEach((sc, i) => {
    const mod = sceneModules[sc.type], t = sc.t, id = `s${i}`;
    if (!usedCss.has(mod)) { usedCss.add(mod); css += mod.css?.({ G, theme, cfg, reel }) || ""; }
    const lang = sc.langObj || reel.lang;
    const c = {
      id, k: sc.k, N: reel.N, start: t.start, dur: t.dur, segs: t.segs, at: (x) => t.start + x, T, FT, RAW, S: (kind, at, d) => S(kind, at, d),
      G, theme, cfg, reel, lang, code: (lines, syn) => highlight([].concat(lines), syn || lang.syntax, lang.keywords),
    };
    const out = mod.build(sc, c);
    layersHtml += "\n  " + chromeHtml(id, sc, out.chrome || mod.chrome || {});
    if (t.start > 0) FT(`#${id}-wrap`, { opacity: 0 }, { opacity: 1, duration: 0.15 }, t.start);
    T(`#${id}-wrap`, { opacity: 0, duration: 0.12 }, t.start + t.dur - 0.14);
    layersHtml += `\n  <div id="${id}" class="clip step" data-start="${sec(t.start)}" data-duration="${sec(t.dur)}" data-track-index="1">\n    <div class="wrap" id="${id}-wrap">${out.html}</div>\n  </div>`;
    sc.segs.forEach((g, j) => {
      const ts = t.segs[j];
      caps.push(...(cfg.captions.mode === "cap" ? capWindows(ts.start, ts.dur, g.cap) : speechWindows(ts.start + 0.3, ts.vd ?? Math.max(0.6, ts.dur - 0.6), g.say, cfg.captions.maxChars)));
    });
  });

  const capHtml = caps.map(([a, b, text], i) => {
    if (cfg.captions.enabled) { FT(`#cap${i} .ct`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, a); T(`#cap${i} .ct`, { opacity: 0, duration: 0.1 }, b - 0.12); }
    return cfg.captions.enabled ? `<div id="cap${i}" class="clip cap" data-start="${sec(a)}" data-duration="${sec(b - a)}"><div class="ct">${esc(text)}</div></div>` : "";
  }).join("\n    ");

  let endHtml = "";
  if (endCard) {   // the thumbnail as the final frame(s), above everything else
    FT("#endcard", { opacity: 0 }, { opacity: 1, duration: 0.08 }, MAIN);
    endHtml = `<div id="endcard" class="clip" data-start="${sec(MAIN)}" data-duration="${sec(endCard.dur)}" data-track-index="3" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;z-index:50"><img src="${endCard.src}" alt="" style="width:${W}px;height:${H}px;display:block"></div>`;
    S("pop", MAIN);
  }
  // ---- audio tags: HyperFrames mixes these when it renders; engine/mix.mjs mixes the same timeline for the built-in renderer ----
  sfxEvents.sort((a, b) => a.t - b.t);
  const kinds = Object.keys(cfgSound.sfx.categories);
  let audioHtml = sfxEvents.map((e, i) => `<audio id="sfx-${i}" class="clip" src="${cfgSound.sfx.categories[e.kind].file}" data-start="${e.t}" data-duration="${e.dur}" data-volume="${e.vol}" data-track-index="${10 + kinds.indexOf(e.kind)}"></audio>`).join("\n  ");
  voiceClips.forEach((v, i) => { audioHtml += `\n  <audio id="voice-${i}" class="clip" src="${v.src}" data-start="${sec(v.t)}" data-duration="${sec(v.dur)}" data-volume="${v.vol}" data-track-index="9"></audio>`; });

  const vars = Object.entries(theme).filter(([, v]) => typeof v === "string").map(([k, v]) => `--${k}: ${v};`).join(" ") + " " + Object.entries(theme.syntax).map(([k, v]) => `--syn-${k}: ${v};`).join(" ");
  const synCls = Object.keys(theme.syntax).map((k) => `.${k}{color:var(--syn-${k})}`).join(" ");
  const cp = cfg.captions;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, height=${H}">
<title>${esc(reel.title)}</title>
<style>
  @font-face { font-family: "JetBrains Mono"; font-weight: 400; src: url("assets/fonts/JetBrainsMono-400.woff2") format("woff2"); }
  @font-face { font-family: "JetBrains Mono"; font-weight: 700; src: url("assets/fonts/JetBrainsMono-700.woff2") format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 400; src: url("assets/fonts/Inter-400.woff2") format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 700; src: url("assets/fonts/Inter-700.woff2") format("woff2"); }
  :root { ${vars} }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; background: var(--bg); overflow: hidden; }
  body { font-family: "Inter", sans-serif; color: var(--fg); }
  #root { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; background: var(--bg); overflow: hidden; }
  ${synCls}
  .ln, .tline, .cell, .br, .pill, .res, .lab, .title.code { font-family: "JetBrains Mono", monospace; }

  .chrome { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
  .tabbar { position: absolute; left: 0; top: ${G.tabbar.top}px; width: ${W}px; height: ${G.tabbar.h}px; background: var(--panel); border-bottom: 1px solid var(--line); display: flex; padding-left: ${G.left}px; }
  .tab { position: relative; height: ${G.tabbar.h}px; padding-right: 40px; background: var(--bg); border-top: 4px solid var(--accent); display: flex; align-items: center; gap: 16px; padding-left: 24px; font-size: 32px; color: #fff; }
  .tab .ti { width: 22px; height: 22px; border-radius: 6px; }
  .term { position: absolute; left: 0; width: ${W}px; background: var(--term); border-top: 2px solid #2b2b2b; }
  .term .hd { position: absolute; left: ${G.left}px; top: 8px; font-size: 28px; letter-spacing: 3px; color: #bbb; border-bottom: 3px solid var(--accent); padding-bottom: 2px; }
  .status { position: absolute; left: 0; top: ${G.status.top}px; width: ${W}px; height: ${G.status.h}px; background: var(--accent); }
  .status span { position: absolute; top: 24px; font-size: 28px; color: #fff; }
  ${G.deco ? `.texwrap { position: absolute; left: 0; top: ${G.deco.top}px; width: ${W}px; height: ${G.status.top - G.deco.top}px; background: var(--bg); overflow: hidden; }
  .tex { position: absolute; left: ${G.left}px; font-family: "JetBrains Mono", monospace; font-size: 28px; color: #fff; opacity: .2; white-space: pre; }
  .tex span { color: #fff; margin-right: 24px; }
  .texwrap::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to bottom, ${rgb(theme.bg, 0)}, ${rgb(theme.bg, 0.75)}); }` : ""}

  .step { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
  .wrap { position: absolute; inset: 0; }
  .chip { position: absolute; left: ${G.left}px; top: ${G.header.chip}px; padding: 6px 18px; border-radius: 999px; background: rgba(0,122,204,.22); background: color-mix(in srgb, var(--accent) 22%, transparent); color: var(--accentText); font-weight: 700; font-size: 26px; letter-spacing: 2px; }
  .title { position: absolute; left: ${G.left}px; top: ${G.header.title}px; font-weight: 700; font-size: 64px; color: #fff; white-space: nowrap; line-height: 78px; }
  .title.code span { font-weight: 700; }
  .desc { position: absolute; left: ${G.left}px; top: ${G.header.desc}px; font-size: 30px; color: var(--muted); white-space: nowrap; line-height: 40px; }

  .tline { position: absolute; left: ${G.left}px; font-size: 32px; color: #cccccc; white-space: pre; }
  .tline.prompt { color: var(--green); } .tline.err { color: var(--red); }
  .tcard { position: absolute; border-radius: 18px; background: var(--term); border: 2px solid #2b2b2b; }
  .tcard .hd { position: absolute; left: 26px; top: 12px; font-size: 24px; letter-spacing: 3px; color: #bbb; font-family: "JetBrains Mono", monospace; border-bottom: 3px solid var(--accent); padding-bottom: 2px; }
  .tcard ~ .tline { left: ${G.left + 26}px; }

  .pill { position: absolute; width: 420px; height: 72px; border-radius: 14px; border: 2px solid #3c3c3c; background: var(--panel); display: flex; align-items: center; justify-content: center; font-size: 34px; }
  .pill.ghostpill { border-style: dashed; color: var(--muted); font-size: 28px; background: transparent; }
  .pill.ctapill { background: var(--yellow); border-color: var(--yellow); color: #1e1e1e; font-weight: 700; font-size: 34px; font-family: "Inter", sans-serif; }

  /* shared panels: typed code card (.cp), scroll bars (.sb) */
  .cp { position: absolute; border: 2px solid var(--accent); border-radius: 18px; background: var(--term); overflow: hidden; }
  .cp-hd { position: absolute; left: 0; right: 0; top: 0; height: 58px; display: flex; align-items: center; gap: 14px; padding: 0 20px; border-bottom: 2px solid; background: var(--panel); }
  .cp-tag { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .cp-lb { font-weight: 700; font-size: 28px; color: #fff; letter-spacing: .5px; }
  .cl { position: absolute; left: 0; right: 0; padding-left: 20px; white-space: pre; font-family: "JetBrains Mono", monospace; }
  .cl .no { display: inline-block; width: 44px; color: var(--dim); } .cl .tx { display: inline-block; margin-left: 10px; white-space: pre; }
  .cp-res { position: absolute; height: 64px; display: flex; align-items: center; gap: 16px; padding: 0 20px; background: rgba(0,0,0,.28); border-top: 2px solid #2b2b2b; border-radius: 0 0 18px 18px; font-family: "JetBrains Mono", monospace; color: var(--syn-n); }
  .cp-res .ra { color: var(--teal); display: flex; } .cp-res .rv { color: var(--fg); white-space: pre; } .cp-res .rv.e { color: var(--red); } .cp-res .sp { width: 10px; }
  .sb { position: absolute; background: rgba(255,255,255,.06); border-radius: 8px; }
  .sb.v { width: 12px; } .sb.h { height: 12px; }
  .sb .th { position: absolute; left: 0; top: 0; background: rgba(190,200,215,.55); border-radius: 8px; }
  .sb.v .th { width: 12px; } .sb.h .th { height: 12px; }
${css}
  #caps { position: absolute; left: 0; top: ${G.caps.top}px; width: ${W}px; height: ${G.caps.h}px; }
  .cap { position: absolute; left: ${G.left}px; top: 0; width: ${G.width}px; height: ${G.caps.h}px; display: flex; align-items: center; justify-content: center; text-align: center; }
  .cap .ct { font-weight: 700; font-size: ${cp.fontSize}px; line-height: ${cp.lineHeight}px; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.9); }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${sec(DUR)}" data-width="${W}" data-height="${H}">
${layersHtml}

  <div id="overlays" data-layout-ignore>${overlays.logo || ""}${overlays.watermark || ""}</div>
  ${endHtml}

  ${audioHtml}

  <div id="caps" data-track-kind="captions">
    ${capHtml}
  </div>
</div>
<script src="assets/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  ${tw.join("\n  ")}
  window.__timelines["main"] = tl;
</script>
</body>
</html>
`;
  return { html, caps, DUR, tweens: tw.length };
}
