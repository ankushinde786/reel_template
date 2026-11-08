// Turns a topic (content only) + scene timings + voice/sfx info into the HyperFrames composition (index.html),
// captions (SRT) and the narration script. Scenes: intro -> one scene per step -> outro.
import { esc, hl } from "./util.mjs";

export const CPS = 0.04;                          // seconds per typed character
export const MIN = { intro: 4.5, step: 6, outro: 5.5 };   // minimum scene lengths (voiceover can lengthen them)

const sec = (n) => n.toFixed(3);
const fitPx = (text, max, em, boxW) => Math.min(max, Math.floor(boxW / (Math.max(1, text.length) * em)));

export function narrationFor(topic) {
  const n = topic.steps.length;
  return [
    topic.intro.say || topic.intro.cap.join(" "),
    ...topic.steps.map((s) => s.say || s.cap.join(" ")),
    topic.outro.say || topic.outro.cap.join(" "),
  ];
}

function capWindows(start, dur, cap) {
  const usable = dur - 0.6, total = cap.reduce((a, c) => a + c.length, 0) || 1;
  let t = start + 0.3; const out = [];
  cap.forEach((line, i) => { const len = usable * line.length / total, a = t, b = i === cap.length - 1 ? start + dur - 0.3 : t + len - 0.05; out.push([a, b, line]); t += len; });
  return out;
}

export function compose(topic, ctx) {
  const brackets = topic.brackets;
  const { W, H, scenes, S, sfxEvents, voiceClips, cfgSound, overlays = {}, endCard } = ctx;
  const steps = topic.steps, N = steps.length, MAIN = scenes.at(-1).start + scenes.at(-1).dur, DUR = MAIN + (endCard ? endCard.dur : 0);
  const tw = [], caps = [];
  const T = (sel, vars, at) => tw.push(`tl.to(${JSON.stringify(sel)}, ${JSON.stringify(vars)}, ${at.toFixed(3)});`);
  const FT = (sel, from, to, at) => tw.push(`tl.fromTo(${JSON.stringify(sel)}, ${JSON.stringify(from)}, ${JSON.stringify(to)}, ${at.toFixed(3)});`);
  const pillText = (s) => (s.pill ?? `${s.name}()`);

  function rowHtml(id, items, cls = {}, top) {
    const maxc = Math.max(...items.map((t) => t.length));
    let w = Math.max(96, maxc * 19 + 40);
    if (items.length * w + (items.length - 1) * 14 > 700) w = Math.floor((700 - (items.length - 1) * 14) / items.length);
    const cells = items.map((t, i) => `<div class="cell ${cls[i] || ""}" id="${id}-c${i}" style="width:${w}px">${cls[i] === "ghost" ? "" : `<span class="ixn">${i}</span>`}<span class="${/^-?\d+$/.test(t) ? "n" : cls[i] === "ghost" ? "gh" : "s"}">${esc(t)}</span></div>`).join("");
    return `<div class="lrow" id="${id}" style="top:${top}px"><span class="br">${esc(brackets[0])}</span>${cells}<span class="br">${esc(brackets[1])}</span></div>`;
  }

  function gridHtml(id, last) {
    let h = "";
    steps.forEach((s, i) => { const col = i % 2, row = Math.floor(i / 2); h += `<div class="pill" id="${id}-p${i}" style="left:${108 + col * 444}px;top:${440 + row * 92}px"><span class="f">${esc(pillText(s))}</span></div>`; });
    const col = N % 2, row = Math.floor(N / 2);
    return h + `<div class="pill ${last.cls}" id="${id}-p${N}" style="left:${108 + col * 444}px;top:${440 + row * 92}px">${esc(last.text)}</div>`;
  }
  const pillIds = (id, a, b) => Array.from({ length: b - a }, (_, i) => `#${id}-p${a + i}`).join(",");

  function introOutro(kind, sc) {
    const id = kind, start = sc.start, dur = sc.dur, c = topic[kind];
    let body = `<div class="chip" id="${id}-chip">${esc(c.chip)}</div><div class="title" id="${id}-title" style="font-size:${fitPx(c.title, 64, 0.58, 864)}px">${esc(c.title)}</div>`;
    if (kind === "intro") {
      body += gridHtml(id, { cls: "ghostpill", text: c.hint });
      FT(pillIds(id, 0, N + 1), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.09, ease: "power3.out" }, 0.4);
      S("whoosh", 0.0); for (let i = 0; i < N + 1; i++) S("tick", 0.4 + i * 0.09);
    } else {
      body += gridHtml(id, { cls: "ctapill", text: c.cta });
      FT(`#${id}-chip,#${id}-title`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, start + 0.05);
      FT(pillIds(id, 0, N), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.07, ease: "power3.out" }, start + 0.3);
      FT(`#${id}-p${N}`, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }, start + 1.4);
      S("whoosh", start + 0.05); for (let i = 0; i < N; i++) S("tick", start + 0.3 + i * 0.07); S("ding", start + 1.4);
      FT(`#${id}-wrap`, { opacity: 0 }, { opacity: 1, duration: 0.15 }, start);
    }
    T(`#${id}-wrap`, { opacity: 0, duration: 0.12 }, start + dur - 0.14);
    caps.push(...capWindows(start, dur, c.cap));
    return `\n  <div id="${id}" class="clip step" data-start="${sec(start)}" data-duration="${sec(dur)}" data-track-index="1">\n    <div class="wrap" id="${id}-wrap">${body}</div>\n  </div>`;
  }

  function stepHtml(m, k, sc) {
    const id = `m${k}`, start = sc.start, at = (t) => start + t;
    const title = m.title || `${topic.subject}.${m.name}()`;
    let body = `<div class="chip" id="${id}-chip">${esc(topic.stepLabel)} ${k + 1} / ${N}</div>
    <div class="title code" id="${id}-title" style="font-size:${fitPx(title, 64, 0.6, 864)}px">${hl(title)}</div>
    <div class="desc" id="${id}-desc">${esc(m.desc)}</div>
    <div class="gutter-line"></div>`;
    FT(`#${id}-chip,#${id}-title,#${id}-desc`, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out", stagger: 0.06 }, at(0.05));
    S("whoosh", at(0.0));

    let t = 0.4; const endOf = [];
    m.code.forEach((line, i) => {
      const d = Math.max(0.45, line.length * CPS);
      body += `<div class="ln" id="${id}-l${i}" style="top:${456 + i * 76}px"><span class="no">${i + 1}</span><span class="tx" id="${id}-t${i}">${hl(line)}</span></div>`;
      FT(`#${id}-t${i}`, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: d, ease: `steps(${line.length})` }, at(t));
      S("typing", at(t), d);
      endOf.push(t + d); t += d + 0.18;
    });
    const last = endOf.length - 1, e0 = endOf[0], e1 = endOf[Math.min(1, last)], e2 = endOf[last];

    body += `<div class="lab" id="${id}-lb" style="top:706px">${esc(m.bLabel || "before")}</div>`;
    body += rowHtml(`${id}-b`, m.before, m.bCls || {}, 738);
    FT(`#${id}-lb,#${id}-b`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, at(e0 + 0.1));
    S("pop", at(e0 + 0.1));
    const tA = e1 + 0.15, bc = Object.values(m.bCls || {}), ac = Object.values(m.aCls || {});
    if (m.res) S("ding", at(tA)); else if (bc.includes("del")) S("thud", at(tA)); else S("swap", at(tA));
    if (ac.includes("new")) S("ding", at(tA + 0.2));
    if (bc.includes("hit")) S("tick", at(tA));
    if (m.res) {
      body += `<div class="res" id="${id}-res"><span class="rl">${esc(m.res[0])}</span><span class="ra">→</span><span class="rv">${esc(m.res[1])}</span></div>`;
      FT(`#${id}-res`, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, at(tA));
    } else {
      body += `<div class="lab" id="${id}-la" style="top:858px">${esc(m.aLabel || "after")}</div>`;
      body += rowHtml(`${id}-a`, m.after, m.aCls || {}, 890);
      FT(`#${id}-la,#${id}-a`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, at(tA));
    }
    Object.entries(m.bCls || {}).forEach(([i, c]) => {
      if (c === "hit") T(`#${id}-b-c${i}`, { borderColor: "#ffd43b", backgroundColor: "#3a3520", duration: 0.25 }, at(tA));
      if (c === "del") T(`#${id}-b-c${i}`, { borderColor: "#f48771", backgroundColor: "#3a1f1f", duration: 0.25 }, at(tA));
    });

    const tp = e2 + 0.12;
    S("enter", at(tp)); S("tick", at(tp + 0.35));
    body += `<div class="tline prompt" id="${id}-o0">$ python ${esc(topic.file)}</div>`;
    FT(`#${id}-o0`, { opacity: 0 }, { opacity: 1, duration: 0.2 }, at(tp));
    m.out.forEach((o, i) => {
      body += `<div class="tline ${o.err ? "err" : ""}" id="${id}-o${i + 1}" style="top:${1102 + i * 44}px;font-size:${fitPx(o.text, 32, 0.6, 864)}px">${esc(o.text)}</div>`;
      FT(`#${id}-o${i + 1}`, { opacity: 0 }, { opacity: 1, duration: 0.2 }, at(tp + 0.35));
    });
    FT(`#${id}-wrap`, { opacity: 0 }, { opacity: 1, duration: 0.15 }, at(0));
    T(`#${id}-wrap`, { opacity: 0, duration: 0.12 }, at(sc.dur - 0.14));
    caps.push(...capWindows(start, sc.dur, m.cap));
    return `\n  <div id="${id}" class="clip step" data-start="${sec(start)}" data-duration="${sec(sc.dur)}" data-track-index="1">\n    <div class="wrap" id="${id}-wrap">${body}</div>\n  </div>`;
  }

  const stepsHtml = [introOutro("intro", scenes[0]), ...steps.map((m, k) => stepHtml(m, k, scenes[k + 1])), introOutro("outro", scenes[N + 1])].join("\n");

  const capHtml = caps.map(([a, b, text], i) => {
    FT(`#cap${i} .ct`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, a);
    T(`#cap${i} .ct`, { opacity: 0, duration: 0.1 }, b - 0.12);
    return `<div id="cap${i}" class="clip cap" data-start="${sec(a)}" data-duration="${sec(b - a)}"><div class="ct">${esc(text)}</div></div>`;
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

  const tex = (topic.texture || [...new Set(steps.flatMap((s) => s.code))]).slice(0, 13)
    .map((l, i) => `<div class="tex" style="top:${24 + i * 36}px"><span>${String(i + 1).padStart(2, " ")}</span> ${esc(l)}</div>`).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, height=${H}">
<title>${esc(topic.title)}</title>
<style>
  @font-face { font-family: "JetBrains Mono"; font-weight: 400; src: url("assets/fonts/JetBrainsMono-400.woff2") format("woff2"); }
  @font-face { font-family: "JetBrains Mono"; font-weight: 700; src: url("assets/fonts/JetBrainsMono-700.woff2") format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 400; src: url("assets/fonts/Inter-400.woff2") format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 700; src: url("assets/fonts/Inter-700.woff2") format("woff2"); }
  :root { --bg:#1e1e1e; --panel:#252526; --term:#181818; --line:#2d2d2d; --fg:#d4d4d4; --blue:#007acc; --teal:#4ec9b0; --orange:#ce9178; --yellow:#ffd43b; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; background: var(--bg); overflow: hidden; }
  body { font-family: "Inter", sans-serif; color: var(--fg); }
  #root { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; background: var(--bg); overflow: hidden; }
  .ln, .tline, .cell, .br, .pill, .res, .lab, .title.code { font-family: "JetBrains Mono", monospace; }

  #tabbar { position: absolute; left: 0; top: 168px; width: ${W}px; height: 84px; background: var(--panel); border-bottom: 1px solid var(--line); }
  #tab { position: absolute; left: 108px; top: 0; height: 84px; padding-right: 40px; background: var(--bg); border-top: 4px solid var(--blue); display: flex; align-items: center; gap: 16px; padding-left: 24px; font-size: 32px; color: #fff; }
  #tab .py { width: 22px; height: 22px; border-radius: 6px; background: linear-gradient(135deg,#3776ab 50%,#ffd43b 50%); }
  #term { position: absolute; left: 0; top: 1006px; width: ${W}px; height: 200px; background: var(--term); border-top: 2px solid #2b2b2b; }
  #term .hd { position: absolute; left: 108px; top: 8px; font-size: 28px; letter-spacing: 3px; color: #bbb; border-bottom: 3px solid var(--blue); padding-bottom: 2px; }
  #status { position: absolute; left: 0; top: 1836px; width: ${W}px; height: 84px; background: var(--blue); }
  #status span { position: absolute; top: 24px; font-size: 28px; color: #fff; }
  #texwrap { position: absolute; left: 0; top: 1330px; width: ${W}px; height: 506px; background: var(--bg); overflow: hidden; }
  .tex { position: absolute; left: 108px; font-family: "JetBrains Mono", monospace; font-size: 28px; color: #fff; opacity: .2; white-space: pre; }
  .tex span { color: #fff; margin-right: 24px; }
  #texwrap::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(30,30,30,0), rgba(30,30,30,.75)); }

  .step { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
  .wrap { position: absolute; inset: 0; }
  .chip { position: absolute; left: 108px; top: 270px; padding: 6px 18px; border-radius: 999px; background: rgba(0,122,204,.22); color: #4fc1ff; font-weight: 700; font-size: 26px; letter-spacing: 2px; }
  .title { position: absolute; left: 108px; top: 318px; font-weight: 700; font-size: 64px; color: #fff; white-space: nowrap; line-height: 78px; }
  .title.code span { font-weight: 700; }
  .desc { position: absolute; left: 108px; top: 398px; font-size: 30px; color: #9aa0a6; white-space: nowrap; line-height: 40px; }
  .gutter-line { position: absolute; left: 160px; top: 440px; width: 2px; height: 236px; background: #2f2f2f; }
  .ln { position: absolute; left: 108px; height: 76px; line-height: 76px; font-size: 38px; white-space: pre; }
  .ln .no { display: inline-block; width: 52px; color: #858585; text-align: left; }
  .ln .tx { display: inline-block; margin-left: 12px; white-space: pre; }
  .v{color:#9cdcfe} .o{color:#d4d4d4} .n{color:#b5cea8} .s{color:#ce9178} .f{color:#dcdcaa} .gh{color:#6a6a6a;font-style:italic}

  .lab { position: absolute; left: 108px; font-size: 26px; color: #858585; letter-spacing: 1px; }
  .lrow { position: absolute; left: 0; width: ${W}px; height: 92px; display: flex; align-items: center; justify-content: center; gap: 14px; }
  .br { font-size: 96px; line-height: 92px; color: #5a5a5a; margin: 0 6px; }
  .cell { position: relative; height: 92px; border: 3px solid #454545; border-radius: 14px; background: #252526; display: flex; align-items: center; justify-content: center; font-size: 34px; }
  .cell .n { color: #b5cea8; font-size: 42px; } .cell .s { color: #ce9178; }
  .cell .ixn { position: absolute; left: 10px; top: 4px; font-size: 20px; color: #6f8f89; }
  .cell.new { border-color: var(--teal); background: #1f3a36; }
  .cell.ghost { border-style: dashed; border-color: #555; background: transparent; width: 220px !important; }
  .res { position: absolute; left: 108px; top: 890px; width: 864px; height: 92px; display: flex; align-items: center; justify-content: center; gap: 28px; }
  .res .rl { font-size: 34px; color: #dcdcaa; } .res .ra { font-size: 48px; color: var(--teal); } .res .rv { font-size: 72px; font-weight: 700; color: #b5cea8; }

  .tline { position: absolute; left: 108px; top: 1058px; font-size: 32px; color: #cccccc; white-space: pre; }
  .tline.prompt { color: #6a9955; } .tline.err { color: #f48771; }

  .pill { position: absolute; width: 420px; height: 72px; border-radius: 14px; border: 2px solid #3c3c3c; background: #252526; display: flex; align-items: center; justify-content: center; font-size: 34px; }
  .pill.ghostpill { border-style: dashed; color: #9aa0a6; font-size: 28px; background: transparent; }
  .pill.ctapill { background: var(--yellow); border-color: var(--yellow); color: #1e1e1e; font-weight: 700; font-size: 34px; font-family: "Inter", sans-serif; }

  #caps { position: absolute; left: 0; top: 1214px; width: ${W}px; height: 116px; }
  .cap { position: absolute; left: 108px; top: 0; width: 864px; height: 116px; display: flex; align-items: center; justify-content: center; text-align: center; }
  .cap .ct { font-weight: 700; font-size: 48px; line-height: 58px; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.9); }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${sec(DUR)}" data-width="${W}" data-height="${H}">

  <div id="chrome" data-layout-ignore>
    <div id="tabbar"><div id="tab"><span class="py"></span>${esc(topic.file)}</div></div>
    <div id="term"><div class="hd">TERMINAL</div></div>
    <div id="texwrap">${tex}</div>
    <div id="status"><span style="left:108px">${esc(topic.status || "Python 3.12")}</span><span style="right:108px">UTF-8</span></div>
  </div>
${stepsHtml}

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
