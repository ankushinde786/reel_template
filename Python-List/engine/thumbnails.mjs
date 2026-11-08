// 15 thumbnail templates (1080x1920). Every template is a pure function of one data object `v`
// (derived from your topic in build.mjs by thumbData()), so any topic gets any style.
// Key content stays inside y 285..1635 so a centred 4:5 grid crop and platform UI never cut it.
// Long text is auto-fitted in the browser (data-fit="maxWidthPx"), so titles never overflow.
import { esc, hl } from "./util.mjs";

const MONO = `"JetBrains Mono", monospace`;
export const STYLES = ["editor", "blueprint", "poster", "terminal", "cells", "q_quiz", "q_exam", "q_count", "q_bug", "q_versus", "sticky", "neon", "swiss", "levels", "chalk"];

const base = `
  @font-face { font-family: "JetBrains Mono"; font-weight: 400; src: url("../assets/fonts/JetBrainsMono-400.woff2") format("woff2"); }
  @font-face { font-family: "JetBrains Mono"; font-weight: 700; src: url("../assets/fonts/JetBrainsMono-700.woff2") format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 400; src: url("../assets/fonts/Inter-400.woff2") format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 700; src: url("../assets/fonts/Inter-700.woff2") format("woff2"); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1080px; height: 1920px; overflow: hidden; }
  body { position: relative; font-family: "Inter", sans-serif; }
  .mono { font-family: ${MONO}; }
  .abs { position: absolute; }
  .v{color:#9cdcfe} .s{color:#ce9178} .f{color:#dcdcaa} .n{color:#b5cea8} .g{color:#6a9955} .o{color:#d4d4d4}
`;
const fitScript = `<script>document.fonts.ready.then(()=>{document.querySelectorAll('[data-fit]').forEach(el=>{
  const max=parseFloat(el.dataset.fit),w0=el.style.width,ws=el.style.whiteSpace;
  el.style.width='max-content';el.style.whiteSpace='nowrap';const w=el.getBoundingClientRect().width;el.style.width=w0;el.style.whiteSpace=ws;
  if(w>max){const k=max/w,cs=getComputedStyle(el);el.style.fontSize=parseFloat(cs.fontSize)*k+'px';
    if(cs.lineHeight.endsWith('px'))el.style.lineHeight=parseFloat(cs.lineHeight)*k+'px';
    if(cs.letterSpacing.endsWith('px'))el.style.letterSpacing=parseFloat(cs.letterSpacing)*k+'px';}});
  window.__fitted=true;});</script>`;
const page = (css, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${base}${css}</style></head><body>${body}${fitScript}</body></html>`;
const mark = (bg, fg, size = 64) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:${size * 0.24}px;background:${bg};color:${fg};font:700 ${size * 0.42}px ${MONO};letter-spacing:-2px">&lt;/&gt;</span>`;
const br = (lines) => lines.map(esc).join("<br>");
const dot = (item) => (/^\w+\(\)$/.test(item) ? "." + item : item);          // "append()" -> ".append()", other items stay as written
const need = (v, key, style) => { if (v[key] == null) throw new Error(`thumbnail style "${style}" needs thumb.${key} in your build.mjs (see README: thumbnail data)`); return v[key]; };

// ───────────────────────── 1-5: first batch ─────────────────────────

function editor(v) {
  const c = need(v, "code", "editor");
  const lines = c.lines.map((l, i) => `<span class="l ${i === c.hi ? "hi" : ""}">${hl(l)}</span>`).join("");
  return page(`
    body { background: #1e1e1e; color: #fff; }
    .tabs { left: 0; top: 168px; width: 1080px; height: 84px; background: #252526; border-bottom: 1px solid #2d2d2d; }
    .tab { left: 90px; top: 0; height: 84px; padding: 0 28px; background: #1e1e1e; border-top: 4px solid #007acc; display: flex; align-items: center; gap: 16px; font-size: 32px; }
    .py { width: 22px; height: 22px; border-radius: 6px; background: linear-gradient(135deg,#3776ab 50%,#ffd43b 50%); }
    .chan { left: 90px; top: 330px; display: flex; align-items: center; gap: 22px; font-weight: 700; font-size: 54px; letter-spacing: -.5px; }
    h1 { left: 90px; top: 450px; font-size: 140px; line-height: 144px; letter-spacing: -6px; font-weight: 700; white-space: nowrap; }
    .sub { left: 94px; top: 760px; font-size: 44px; color: #9aa0a6; }
    .win { left: 90px; top: 900px; width: 900px; height: 620px; background: #181818; border: 2px solid #333; border-radius: 22px; box-shadow: 0 40px 90px rgba(0,0,0,.55); overflow: hidden; }
    .win .bar { height: 70px; background: #252526; display: flex; align-items: center; gap: 14px; padding-left: 28px; }
    .win .dot { width: 18px; height: 18px; border-radius: 50%; }
    .code { padding: 36px 40px; font-size: 44px; line-height: 84px; white-space: pre; }
    .code .l { display: block; height: 84px; color: #d4d4d4; }
    .code .hi { background: rgba(255,212,59,.12); margin: 0 -40px; padding: 0 40px; border-left: 8px solid #ffd43b; }
    .out { position: absolute; left: 0; right: 0; bottom: 0; height: 150px; background: #0f0f0f; border-top: 2px solid #2b2b2b; padding: 20px 40px; font-size: 36px; color: #ccc; }
    .out b { display: block; color: #6a9955; font-weight: 400; font-size: 30px; margin-bottom: 8px; }
    .status { left: 0; top: 1836px; width: 1080px; height: 84px; background: #007acc; color: #fff; font-size: 28px; padding: 24px 90px; }
  `, `
    <div class="abs tabs"><div class="abs tab"><span class="py"></span>${esc(v.file)}</div></div>
    <div class="abs chan">${mark("#007acc", "#fff", 70)}<span>${esc(v.channel)}</span></div>
    <h1 class="abs" data-fit="900">${br(v.tl)}</h1>
    <div class="abs sub" data-fit="900">${esc(v.sub)}</div>
    <div class="abs win"><div class="bar"><i class="dot" style="background:#ff5f56"></i><i class="dot" style="background:#ffbd2e"></i><i class="dot" style="background:#27c93f"></i></div>
      <div class="code mono" data-fit="892">${lines}</div>
      <div class="out mono"><b>$ python ${esc(v.file)}</b><span data-fit="820">${esc(c.out)}</span></div></div>
    <div class="abs status">${esc(v.status)}</div>`);
}

function blueprint(v) {
  const items = v.items.slice(0, 11), bottom = 646 + items.length * 74;
  const rows = items.map((m) => `<div class="m"><span data-fit="640">${esc(dot(m))}</span></div>`).join("");
  return page(`
    body { background: #0a1f44; color: #e8f1ff;
      background-image: linear-gradient(rgba(125,185,255,.16) 2px, transparent 2px), linear-gradient(90deg, rgba(125,185,255,.16) 2px, transparent 2px),
        linear-gradient(rgba(125,185,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(125,185,255,.07) 1px, transparent 1px);
      background-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px; }
    h1 { left: 90px; top: 285px; width: 900px; font-size: 128px; line-height: 128px; letter-spacing: -4px; font-weight: 700; }
    .dim { left: 90px; top: 566px; width: 900px; height: 40px; }
    .brk { left: 0; top: 0; width: 1080px; height: 1920px; }
    .list { left: 210px; top: 646px; width: 660px; }
    .m { height: 74px; display: flex; align-items: center; justify-content: center; font-size: 62px; color: #7fe3ff; font-family: ${MONO}; font-weight: 700; }
    .m:nth-child(even) { color: #e8f1ff; }
    .tb { left: 90px; top: 1482px; width: 900px; height: 150px; border: 4px solid #7fe3ff; display: grid; grid-template-columns: 1.55fr 1fr; background: rgba(10,31,68,.9); }
    .tb div { padding: 18px 28px; display: flex; flex-direction: column; justify-content: center; }
    .tb .a { border-right: 4px solid #7fe3ff; }
    .tb .big { font-size: 56px; font-weight: 700; letter-spacing: -1px; }
    .tb .small { font-size: 28px; color: #9fc2f2; margin-top: 6px; }
    .tb .r { font-family: ${MONO}; font-size: 34px; color: #7fe3ff; }
  `, `
    <h1 class="abs" data-fit="900">${br(v.tl)}</h1>
    <svg class="abs dim" viewBox="0 0 900 40" fill="none" stroke="#7fe3ff" stroke-width="3"><path d="M2 20h896M2 6v28M898 6v28M2 20l16-9M2 20l16 9M898 20l-16-9M898 20l-16 9"/><rect x="300" y="4" width="300" height="32" fill="#0a1f44" stroke="none"/><text x="450" y="29" text-anchor="middle" fill="#7fe3ff" stroke="none" font-family="JetBrains Mono" font-size="28" font-weight="700">${esc(v.count + " " + v.countLabel)}</text></svg>
    <svg class="abs brk" viewBox="0 0 1080 1920" fill="none" stroke="#7fe3ff" stroke-width="16" stroke-linecap="square"><path d="M200 646H120V${bottom}H200"/><path d="M880 646H960V${bottom}H880"/></svg>
    <div class="abs list">${rows}</div>
    <div class="abs tb"><div class="a"><span class="big" data-fit="470">${esc(v.channel)}</span><span class="small" data-fit="470">${esc(v.sub)}</span></div><div><span class="r" data-fit="300">${esc(v.short)}</span><span class="small">scale 1:1</span></div></div>`);
}

function poster(v) {
  return page(`
    body { background: #ffd43b; color: #0b0b0b; }
    .py { left: 90px; top: 395px; font-size: 120px; font-weight: 700; letter-spacing: -4px; }
    .list { left: 60px; top: 490px; font-size: 470px; line-height: 470px; font-weight: 700; letter-spacing: -22px; -webkit-text-stroke: 14px #0b0b0b; }
    .meth { left: 84px; top: 960px; font-size: 184px; line-height: 184px; font-weight: 700; letter-spacing: -9px; color: #1b4f8a; -webkit-text-stroke: 6px #1b4f8a; }
    .sub { left: 94px; top: 1180px; font-size: 52px; font-weight: 700; letter-spacing: -1px; white-space: nowrap; }
    .chan { left: 90px; top: 1340px; display: inline-flex; align-items: center; gap: 24px; background: #0b0b0b; color: #ffd43b; padding: 26px 44px 26px 30px; border-radius: 22px; font-size: 66px; font-weight: 700; letter-spacing: -1.5px; transform: rotate(-3deg); box-shadow: 14px 14px 0 #1b4f8a; }
  `, `
    <div class="abs py" data-fit="900">${esc(v.lang)}</div>
    <div class="abs list" data-fit="940">${esc(v.word)}</div>
    <div class="abs meth" data-fit="940">${esc(v.word2)}</div>
    <div class="abs sub" data-fit="900">${esc(v.sub)}</div>
    <div class="abs chan">${mark("#ffd43b", "#0b0b0b", 78)}<span>${esc(v.channel)}</span></div>`);
}

function terminal(v) {
  const lines = v.items.slice(0, 11).map((m) => { const i = m.indexOf("("), name = i < 0 ? m : m.slice(0, i); return `<div data-fit="900">${esc(v.subject)}.<span class="a2">${esc(name)}</span>${esc(i < 0 ? "" : m.slice(i))}</div>`; }).join("");
  return page(`
    body { background: radial-gradient(ellipse at 50% 42%, #1f1406 0%, #0d0905 62%, #050302 100%); color: #ffb000; font-family: ${MONO}; }
    .scan { inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 3px, transparent 3px 7px); mix-blend-mode: multiply; pointer-events: none; }
    .glow { text-shadow: 0 0 14px rgba(255,176,0,.75), 0 0 38px rgba(255,176,0,.35); }
    .p { left: 90px; top: 300px; font-size: 44px; color: #c98a00; }
    h1 { left: 90px; top: 380px; font-size: 196px; line-height: 190px; font-weight: 700; letter-spacing: -11px; }
    .list { left: 90px; top: 800px; font-size: 54px; line-height: 64px; color: #e29a00; }
    .a2 { color: #ffd266; }
    .ch { left: 90px; top: 1540px; font-size: 76px; font-weight: 700; letter-spacing: -2px; display: flex; align-items: center; }
    .cur { display: inline-block; width: 44px; height: 76px; background: #ffb000; margin-left: 14px; box-shadow: 0 0 24px rgba(255,176,0,.8); }
  `, `
    <div class="abs p glow" data-fit="900">$ python ${esc(v.file)}</div>
    <h1 class="abs glow" data-fit="900">${esc(v.word)}<br>${esc(v.word2)}</h1>
    <div class="abs list glow">${lines}</div>
    <div class="abs ch glow">&gt; ${esc(v.channel)}<i class="cur"></i></div>
    <div class="abs scan"></div>`);
}

function cellRow(items, hiSet, size) {
  return items.map((n, i) => `<div class="c ${hiSet.has(i) ? "hi" : ""}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px"><span data-fit="${size - 24}">${esc(n)}</span></div>`).join("");
}
function cells(v) {
  const d = need(v, "demo", "cells"), hi = new Set(d.hi || []), size = (n) => (n <= 4 ? 150 : Math.floor((700 - (n - 1) * 18) / n));
  return page(`
    body { background: #f4f6fb; color: #0f172a; }
    .chan { left: 90px; top: 320px; display: flex; align-items: center; gap: 22px; font-weight: 700; font-size: 56px; letter-spacing: -1px; }
    h1 { left: 90px; top: 440px; font-size: 136px; line-height: 136px; letter-spacing: -5px; font-weight: 700; }
    .sub { left: 94px; top: 735px; font-size: 46px; color: #475569; }
    .lab { left: 90px; font-size: 34px; color: #64748b; font-family: ${MONO}; }
    .row { left: 90px; display: flex; gap: 18px; align-items: center; }
    .bk { font: 400 150px/150px ${MONO}; color: #94a3b8; }
    .c { border-radius: 26px; background: #fff; border: 5px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-family: ${MONO}; font-weight: 700; box-shadow: 0 10px 0 #e2e8f0; }
    .c.hi { background: #14b8a6; border-color: #0f766e; color: #fff; box-shadow: 0 10px 0 #0f766e; }
    .chip { left: 90px; top: 1190px; padding: 18px 34px; border-radius: 18px; background: #0f172a; color: #ffd43b; font: 700 56px ${MONO}; display: inline-block; max-width: 560px; }
    .arrow { left: 700px; top: 1168px; font-size: 100px; line-height: 110px; color: #0f172a; font-weight: 700; }
  `, `
    <div class="abs chan">${mark("#0f172a", "#ffd43b", 72)}<span>${esc(v.channel)}</span></div>
    <h1 class="abs" data-fit="900">${br(v.tl)}</h1>
    <div class="abs sub" data-fit="900">${esc(v.sub)}</div>
    <div class="abs lab" style="top:900px">before</div>
    <div class="abs row" style="top:950px"><span class="bk">${esc(v.brackets[0])}</span>${cellRow(d.before, new Set(), size(d.before.length))}<span class="bk">${esc(v.brackets[1])}</span></div>
    <div class="abs chip" data-fit="520">${esc(d.call)}</div>
    <div class="abs arrow">↓</div>
    <div class="abs lab" style="top:1320px">after</div>
    <div class="abs row" style="top:1370px"><span class="bk">${esc(v.brackets[0])}</span>${cellRow(d.after, hi, size(d.after.length))}<span class="bk">${esc(v.brackets[1])}</span></div>`);
}

// ───────────────────────── 6-10: question styles ─────────────────────────

function q_quiz(v) {
  const q = need(v, "quiz", "q_quiz");
  return page(`
    body { background: #14101f; color: #fff; }
    .glow { inset: 0; background: radial-gradient(ellipse at 88% 16%, rgba(255,92,122,.32), transparent 55%), radial-gradient(ellipse at 8% 96%, rgba(255,212,59,.12), transparent 50%); }
    .q { right: -30px; top: 330px; font-size: 1000px; line-height: 1000px; font-weight: 700; color: rgba(255,92,122,.17); }
    .chan { left: 90px; top: 300px; display: flex; align-items: center; gap: 20px; font-weight: 700; font-size: 50px; letter-spacing: -1px; }
    h1 { left: 90px; top: 410px; font-size: 124px; line-height: 124px; letter-spacing: -5px; font-weight: 700; }
    .card { left: 90px; top: 900px; width: 900px; background: #fff; color: #14101f; border-radius: 36px; padding: 40px 44px 44px; box-shadow: 0 30px 80px rgba(0,0,0,.55); }
    .card .t { font: 700 38px ${MONO}; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
    .opt { height: 128px; border-radius: 22px; border: 4px solid #e4e0ee; display: flex; align-items: center; gap: 22px; padding: 0 24px; font: 700 46px ${MONO}; }
    .opt i { font-style: normal; width: 64px; height: 64px; border-radius: 50%; background: #14101f; color: #ffd43b; display: flex; align-items: center; justify-content: center; font: 700 34px Inter, sans-serif; flex: none; }
    .tag { left: 90px; top: 1470px; background: #ffd43b; color: #14101f; padding: 20px 42px; border-radius: 999px; font-weight: 700; font-size: 54px; letter-spacing: -1px; }
  `, `
    <div class="abs glow"></div><div class="abs q">?</div>
    <div class="abs chan">${mark("#ff5c7a", "#14101f", 66)}<span>${esc(v.channel)}</span></div>
    <h1 class="abs" data-fit="900">${br(v.qLines)}</h1>
    <div class="abs card"><div class="t"><span data-fit="810">${esc(q.q)}</span></div><div class="grid">${q.options.slice(0, 4).map((t, i) => `<div class="opt"><i>${"ABCD"[i]}</i><span data-fit="250">${esc(t)}</span></div>`).join("")}</div></div>
    <div class="abs tag" data-fit="900">${esc(v.questionSub)}</div>`);
}

function q_exam(v) {
  const e = need(v, "exam", "q_exam");
  return page(`
    body { background: #eef3fb; color: #1a2238; background-image: repeating-linear-gradient(to bottom, transparent 0 71px, rgba(80,120,200,.28) 71px 73px); }
    .margin { left: 150px; top: 0; width: 3px; height: 1920px; background: rgba(235,64,52,.55); }
    .cls { left: 190px; top: 300px; display: flex; align-items: center; gap: 18px; font: 700 44px Inter, sans-serif; border-bottom: 4px solid #1a2238; padding-bottom: 8px; }
    .cls span.l { font-weight: 400; color: #5b6785; }
    h1 { left: 190px; top: 410px; font-size: 104px; line-height: 108px; letter-spacing: -4px; font-weight: 700; }
    .qs { left: 190px; top: 800px; }
    .qi { display: flex; align-items: center; gap: 26px; height: 108px; font: 700 36px ${MONO}; }
    .qi i { width: 58px; height: 58px; border: 6px solid #1a2238; border-radius: 10px; flex: none; }
    .score { right: 80px; top: 880px; width: 250px; height: 250px; border: 10px solid #e63946; border-radius: 50%; color: #e63946; font: 700 92px Inter, sans-serif; display: flex; align-items: center; justify-content: center; transform: rotate(-12deg); letter-spacing: -4px; }
    .stamp { left: 190px; top: 1330px; border: 8px solid #e63946; color: #e63946; padding: 18px 34px; font: 700 54px Inter, sans-serif; border-radius: 16px; transform: rotate(-3deg); letter-spacing: -1px; }
  `, `
    <div class="abs margin"></div>
    <div class="abs cls">${mark("#1a2238", "#ffd43b", 56)}<span class="l">Class:</span><span>${esc(v.channel)}</span></div>
    <h1 class="abs" data-fit="840">${br(v.qLines3)}</h1>
    <div class="abs qs">${e.qs.slice(0, 4).map((q) => `<div class="qi"><i></i><span data-fit="470">${esc(q)}</span></div>`).join("")}</div>
    <div class="abs score" style="font-size:${e.score.length > 5 ? 70 : 92}px">${esc(e.score)}</div>
    <div class="abs stamp" data-fit="760">${esc(v.questionSub)}</div>`);
}

function q_count(v) {
  return page(`
    body { background: #0a0a0a; color: #fff; }
    .chan { left: 90px; top: 300px; display: flex; align-items: center; gap: 20px; font-weight: 700; font-size: 50px; letter-spacing: -1px; }
    .n { left: 40px; top: 330px; font-size: 760px; line-height: 760px; font-weight: 700; letter-spacing: -44px; background: linear-gradient(180deg, #ff5c7a 10%, #ffb703 90%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .lm { left: 96px; top: 1000px; font-size: 84px; font-weight: 700; letter-spacing: -3px; color: #ffb703; }
    .qq { left: 90px; top: 1100px; font-size: 118px; line-height: 118px; letter-spacing: -5px; font-weight: 700; }
    .tag { left: 90px; top: 1400px; border: 5px solid #fff; padding: 16px 38px; border-radius: 999px; font-weight: 700; font-size: 50px; letter-spacing: -1px; }
  `, `
    <div class="abs chan">${mark("#ff5c7a", "#0a0a0a", 66)}<span>${esc(v.channel)}</span></div>
    <div class="abs n" data-fit="960">${esc(v.count)}</div>
    <div class="abs lm" data-fit="880">${esc(v.countLine)}</div>
    <div class="abs qq" data-fit="880">${br(v.countQ)}</div>
    <div class="abs tag" data-fit="900">${esc(v.questionSub)}</div>`);
}

function q_bug(v) {
  const b = need(v, "bug", "q_bug");
  const lines = b.lines.map((l, i) => {
    if (i !== b.bad) return `<span class="l">${hl(l)}</span>`;
    const k = l.indexOf(b.word);
    return `<span class="l bad">${hl(l.slice(0, k))}<span class="f sq">${esc(b.word)}</span>${hl(l.slice(k + b.word.length))}</span>`;
  }).join("");
  return page(`
    body { background: #1e1e1e; color: #fff; }
    .chan { left: 90px; top: 300px; display: flex; align-items: center; gap: 20px; font-weight: 700; font-size: 50px; letter-spacing: -1px; }
    h1 { left: 90px; top: 400px; font-size: 136px; line-height: 136px; letter-spacing: -6px; font-weight: 700; }
    .win { left: 90px; top: 720px; width: 900px; background: #181818; border: 2px solid #3a3a3a; border-radius: 22px; overflow: hidden; box-shadow: 0 40px 90px rgba(0,0,0,.55); }
    .bar { height: 66px; background: #252526; display: flex; align-items: center; padding-left: 28px; font: 400 30px Inter, sans-serif; color: #ccc; gap: 14px; }
    .bar .dot { width: 16px; height: 16px; border-radius: 50%; background: #f14c4c; }
    .code { padding: 26px 40px; font: 400 48px/88px ${MONO}; white-space: pre; }
    .code .l { display: block; height: 88px; color: #d4d4d4; }
    .code .bad { background: rgba(241,76,76,.14); margin: 0 -40px; padding: 0 40px; border-left: 8px solid #f14c4c; }
    .sq { text-decoration: underline wavy #f14c4c 5px; text-underline-offset: 10px; }
    .err { background: #2a1414; border-top: 3px solid #f14c4c; padding: 26px 40px 30px; font: 400 33px/46px ${MONO}; color: #ff8a80; }
    .err b { color: #f14c4c; }
    .tag { left: 90px; top: 1450px; background: #f14c4c; color: #fff; padding: 20px 42px; border-radius: 999px; font-weight: 700; font-size: 54px; letter-spacing: -1px; }
  `, `
    <div class="abs chan">${mark("#007acc", "#fff", 66)}<span>${esc(v.channel)}</span></div>
    <h1 class="abs" data-fit="900">Can you<br>spot the bug?</h1>
    <div class="abs win"><div class="bar"><i class="dot"></i>${esc(b.file)}</div>
      <div class="code" data-fit="892">${lines}</div>
      <div class="err"><div><b data-fit="820">${esc(b.error[0])}</b></div><div data-fit="820">${esc(b.error[1])}</div></div></div>
    <div class="abs tag" data-fit="900">${esc(v.questionSub)}</div>`);
}

function q_versus(v) {
  const { a, b } = need(v, "versus", "q_versus");
  const card = (x, left, bg, fg) => `<div class="abs c" style="left:${left}px;background:${bg};color:${fg}"><div class="m"><span data-fit="340">${esc(x.name)}</span></div><div class="d">${esc(x.desc)}</div>
      <div class="cb"><small>${esc(x.setup)}</small><span data-fit="340">${esc(x.code)}</span></div><div class="cb res"><small>${esc(x.resLabel || "result")}</small><span data-fit="340">${esc(x.result)}</span></div></div>`;
  return page(`
    body { background: #0e1116; color: #fff; }
    .chan { left: 90px; top: 300px; display: flex; align-items: center; gap: 20px; font-weight: 700; font-size: 50px; letter-spacing: -1px; }
    h1 { left: 90px; top: 400px; font-size: 118px; line-height: 118px; letter-spacing: -5px; font-weight: 700; }
    .c { top: 720px; width: 410px; height: 580px; border-radius: 40px; padding: 36px 32px; }
    .c .m { font: 700 54px ${MONO}; letter-spacing: -2px; }
    .c .d { font: 400 32px Inter, sans-serif; margin: 6px 0 26px; opacity: .8; }
    .cb { background: rgba(0,0,0,.28); border-radius: 18px; padding: 20px 18px; font: 700 31px ${MONO}; margin-bottom: 18px; white-space: pre; }
    .cb small { display: block; font: 400 26px Inter, sans-serif; opacity: .75; margin-bottom: 8px; }
    .res { background: #fff; color: #0e1116; }
    .vs { left: 480px; top: 940px; width: 120px; height: 120px; border-radius: 50%; background: #ffd43b; color: #0e1116; font: 700 50px Inter, sans-serif; display: flex; align-items: center; justify-content: center; letter-spacing: -2px; border: 10px solid #0e1116; }
    .tag { left: 90px; top: 1400px; background: #fff; color: #0e1116; padding: 20px 42px; border-radius: 999px; font-weight: 700; font-size: 54px; letter-spacing: -1px; }
  `, `
    <div class="abs chan">${mark("#ffd43b", "#0e1116", 66)}<span>${esc(v.channel)}</span></div>
    <h1 class="abs" data-fit="900">Do you know<br>the difference?</h1>
    ${card(a, 90, "#ff7a59", "#2a0f06")}${card(b, 580, "#38bdf8", "#04202e")}
    <div class="abs vs">VS</div>
    <div class="abs tag" data-fit="900">${esc(v.questionSub)}</div>`);
}

// ───────────────────────── 11-15: visual styles ─────────────────────────

function sticky(v) {
  const cols = ["#ffd43b", "#ff9ecb", "#9be7c4", "#8fd3ff", "#ffb27a"], rot = [-3, 2, -2, 3, -1, 2.5, -3.5, 1.5, -2, 3, -1.5, 2];
  const items = v.items.slice(0, 11);
  const notes = items.map((m, i) => `<div class="n" style="left:${75 + (i % 3) * 320}px;top:${650 + Math.floor(i / 3) * 226}px;background:${cols[i % cols.length]};transform:rotate(${rot[i]}deg)"><i></i><span data-fit="250">${esc(dot(m))}</span></div>`).join("");
  const k = items.length;
  return page(`
    body { background: #22262e; background-image: radial-gradient(rgba(255,255,255,.07) 2px, transparent 2px); background-size: 36px 36px; color: #fff; }
    h1 { left: 90px; top: 300px; font-size: 112px; line-height: 112px; letter-spacing: -5px; font-weight: 700; }
    .sub { left: 94px; top: 535px; font-size: 44px; color: #a9b0bd; }
    .n { position: absolute; width: 290px; height: 200px; display: flex; align-items: center; justify-content: center; color: #1b1b1b; font: 700 40px ${MONO}; box-shadow: 0 16px 28px rgba(0,0,0,.4); border-radius: 6px; }
    .n i { position: absolute; top: -14px; left: 50%; margin-left: -14px; width: 28px; height: 28px; border-radius: 50%; background: #e63946; box-shadow: 0 4px 6px rgba(0,0,0,.45); }
    .brand { background: #fff !important; flex-direction: column; font: 700 54px/56px Inter, sans-serif !important; letter-spacing: -2px; gap: 6px; text-align: center; }
  `, `
    <h1 class="abs" data-fit="900">${br(v.tl)}</h1>
    <div class="abs sub">${esc(v.stickySub)}</div>
    ${notes}
    <div class="n brand" style="left:${75 + (k % 3) * 320}px;top:${650 + Math.floor(k / 3) * 226}px;transform:rotate(-2deg)"><i></i>${mark("#14101f", "#ffd43b", 56)}<span data-fit="250">${br(v.channel.split(" "))}</span></div>`);
}

function neon(v) {
  return page(`
    body { background: radial-gradient(ellipse at 50% 45%, #1a0b2e 0%, #07040f 70%); color: #fff; font-family: ${MONO}; }
    .pk { color: #fff; text-shadow: 0 0 6px #fff, 0 0 18px #ff2bd6, 0 0 42px #ff2bd6, 0 0 90px #ff2bd6; }
    .cy { color: #fff; text-shadow: 0 0 6px #fff, 0 0 18px #29f0ff, 0 0 42px #29f0ff, 0 0 90px #29f0ff; }
    .py { left: 0; width: 1080px; text-align: center; top: 340px; font-size: 84px; font-weight: 400; letter-spacing: 12px; }
    .l1 { left: 0; width: 1080px; text-align: center; top: 450px; font-size: 236px; line-height: 236px; font-weight: 700; letter-spacing: -8px; }
    .l2 { left: 0; width: 1080px; text-align: center; top: 720px; font-size: 196px; line-height: 196px; font-weight: 700; letter-spacing: -8px; }
    .sub { left: 0; width: 1080px; text-align: center; top: 1010px; font-size: 44px; color: #c7b6ff; text-shadow: 0 0 20px rgba(160,120,255,.6); font-family: Inter, sans-serif; }
    .sign { left: 90px; top: 1180px; width: 900px; height: 190px; border: 9px solid #29f0ff; border-radius: 44px; display: flex; align-items: center; justify-content: center; gap: 24px; font-size: 80px; font-weight: 700; letter-spacing: -3px; box-shadow: 0 0 26px #29f0ff, inset 0 0 26px rgba(41,240,255,.6); }
    .floor { left: 0; top: 1500px; width: 1080px; height: 140px; background: linear-gradient(to bottom, rgba(255,43,214,.16), transparent); filter: blur(10px); }
  `, `
    <div class="abs py pk" data-fit="960">${esc(v.lang.toLowerCase())}</div>
    <div class="abs l1 pk" data-fit="980">[${esc(v.word)}]</div>
    <div class="abs l2 cy" data-fit="980">${esc(v.word2)}</div>
    <div class="abs sub" data-fit="960">${esc(v.sub)}</div>
    <div class="abs sign cy"><span style="font-size:70px">&lt;/&gt;</span><span data-fit="620">${esc(v.channel)}</span></div>
    <div class="abs floor"></div>`);
}

function swiss(v) {
  return page(`
    body { background: #fff; color: #0a0a0a; }
    .rule { left: 90px; width: 900px; height: 8px; background: #0a0a0a; }
    .top { left: 90px; top: 310px; width: 900px; display: flex; justify-content: space-between; font-weight: 700; font-size: 46px; letter-spacing: -1px; }
    h1 { left: 80px; top: 420px; font-size: 218px; line-height: 196px; letter-spacing: -12px; font-weight: 700; }
    .dot { left: 770px; top: 626px; width: 200px; height: 200px; border-radius: 50%; background: #e5002b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 126px; font-weight: 700; letter-spacing: -8px; padding-right: 8px; }
    .sub { left: 94px; top: 1090px; font-size: 56px; font-weight: 700; letter-spacing: -2px; }
    .meth { left: 94px; top: 1180px; width: 880px; font: 400 36px/54px ${MONO}; color: #444; }
    .bar { left: 90px; top: 1500px; width: 900px; height: 120px; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; font-weight: 700; font-size: 50px; letter-spacing: -1px; }
  `, `
    <div class="abs rule" style="top:290px"></div>
    <div class="abs top"><span>${esc(v.channel)}</span><span>${esc(v.count + " " + v.countLabel)}</span></div>
    <h1 class="abs" data-fit="680">${esc(v.lang)}<br>${esc(v.subject)}<br>${esc(v.countLabel)}</h1>
    <div class="abs dot" style="font-size:${String(v.count).length > 2 ? 90 : 126}px">${esc(v.count)}</div>
    <div class="abs sub" data-fit="880">${esc(v.swissSub)}</div>
    <div class="abs meth">${v.items.slice(0, 11).map((m) => esc(m)).join("  ")}</div>
    <div class="abs bar"><span>${esc(v.channel)}</span><span style="color:#e5002b">${esc(v.short)}</span></div>`);
}

function levels(v) {
  const items = v.items.slice(0, 11), n = items.length, pts = items.map((m, i) => ({ m, x: 540 + 285 * Math.sin(i * 0.95), y: 1480 - i * 78 }));
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(" ");
  const nodes = pts.map((p, i) => {
    const last = i === n - 1, r = last ? 58 : 38, left = p.x < 540;
    const lab = left ? `left:${p.x + r + 22}px;text-align:left` : `left:${p.x - r - 22 - 360}px;width:360px;text-align:right`;
    return `<div class="nd ${last ? "last" : ""}" style="left:${p.x - r}px;top:${p.y - r}px;width:${r * 2}px;height:${r * 2}px">${i + 1}</div><div class="lb" style="top:${p.y - 24}px;${lab}"><span data-fit="340">${esc(p.m)}</span></div>`;
  }).join("");
  return page(`
    body { background: linear-gradient(180deg, #0b1a33 0%, #13294d 55%, #1a3a5c 100%); color: #fff; }
    .st { inset: 0; background-image: radial-gradient(rgba(255,255,255,.55) 1.5px, transparent 1.5px); background-size: 140px 140px; opacity: .18; }
    h1 { left: 90px; top: 300px; font-size: 100px; line-height: 100px; letter-spacing: -4px; font-weight: 700; }
    .sub { left: 94px; top: 520px; font-size: 44px; color: #9fc2f2; }
    svg { left: 0; top: 0; width: 1080px; height: 1920px; }
    .nd { position: absolute; border-radius: 50%; background: #ffc233; color: #1b1300; font: 700 38px ${MONO}; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 0 #b27c00; }
    .nd.last { background: #ff5c7a; color: #fff; font-size: 56px; box-shadow: 0 10px 0 #a3213b, 0 0 60px rgba(255,92,122,.7); }
    .lb { position: absolute; font: 700 40px ${MONO}; color: #fff; }
    .chan { left: 90px; top: 1560px; display: flex; align-items: center; gap: 20px; font-weight: 700; font-size: 52px; letter-spacing: -1px; }
  `, `
    <div class="abs st"></div>
    <h1 class="abs" data-fit="900">Unlock all ${esc(v.count)}<br>${esc(v.subject)} ${esc(v.countLabel)}</h1>
    <div class="abs sub" data-fit="900">${esc(v.levelSub)}</div>
    <svg class="abs" viewBox="0 0 1080 1920" fill="none"><path d="${path}" stroke="rgba(255,255,255,.35)" stroke-width="10" stroke-dasharray="4 22" stroke-linecap="round" stroke-linejoin="round"/></svg>
    ${nodes}
    <div class="abs chan">${mark("#ffc233", "#1b1300", 66)}<span>${esc(v.channel)}</span></div>`);
}

function chalk(v) {
  const d = need(v, "demo", "chalk"), hi = new Set(d.hi || []), items = d.after, size = items.length <= 4 ? 170 : Math.floor((820 - (items.length - 1) * 22) / items.length);
  const row = items.map((n, i) => `<div class="b ${hi.has(i) ? "y" : ""}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px"><span data-fit="${size - 28}">${esc(n)}</span></div>`).join("");
  return page(`
    body { background: radial-gradient(ellipse at 40% 30%, #2a4d44 0%, #1d3b33 60%, #162d27 100%); color: #f4f4ee; }
    .frame { inset: 0; border: 36px solid #6b4a2b; box-shadow: inset 0 0 40px rgba(0,0,0,.6); }
    .dust { left: 0; top: 1500px; width: 1080px; height: 200px; background: radial-gradient(ellipse at 30% 50%, rgba(255,255,255,.10), transparent 60%); }
    .ch { filter: url(#rough); }
    h1 { left: 110px; top: 320px; font-size: 138px; line-height: 138px; letter-spacing: -5px; font-weight: 700; }
    .hl { left: 110px; top: 610px; width: 860px; height: 40px; }
    .row { left: 150px; top: 790px; display: flex; gap: 22px; }
    .b { border: 8px solid #f4f4ee; border-radius: 22px; display: flex; align-items: center; justify-content: center; font-family: ${MONO}; font-weight: 700; }
    .b.y { border-color: #ffd43b; color: #ffd43b; }
    .code { left: 110px; top: 1060px; font: 700 66px ${MONO}; color: #ffd43b; }
    .arr { left: 566px; top: 975px; width: 300px; height: 140px; }
    .note { left: 110px; top: 1210px; font-size: 56px; font-weight: 700; letter-spacing: -1px; color: #cfe3da; }
    .chan { left: 110px; top: 1380px; display: flex; align-items: center; gap: 22px; font-size: 96px; font-weight: 700; letter-spacing: -4px; color: #ff9ecb; }
  `, `
    <svg width="0" height="0" style="position:absolute"><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6"/></filter></svg>
    <div class="abs frame"></div><div class="abs dust"></div>
    <div class="ch">
      <h1 class="abs" data-fit="860">${br(v.tl)}</h1>
      <svg class="abs hl" viewBox="0 0 860 40" fill="none" stroke="#ffd43b" stroke-width="8" stroke-linecap="round"><path d="M6 24C120 6 220 36 340 20S560 8 680 24 800 30 854 16"/></svg>
      <div class="abs row">${row}</div>
      <div class="abs code" data-fit="860">${esc(d.call)}</div>
      <svg class="abs arr" viewBox="0 0 300 140" fill="none" stroke="#ffd43b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M120 112C190 112 222 74 211 24M211 24l-22 28M211 24l24 24"/></svg>
      <div class="abs note" data-fit="860">${esc(v.count + " " + v.countLabel + ", explained with code")}</div>
      <div class="abs chan">${esc(v.channel)}</div>
    </div>`);
}

export const templates = { editor, blueprint, poster, terminal, cells, q_quiz, q_exam, q_count, q_bug, q_versus, sticky, neon, swiss, levels, chalk };

// ───────────────────────── topic -> template data ─────────────────────────
const wrap = (text, max) => { const out = []; let cur = ""; for (const w of text.split(" ")) { if (cur && (cur + " " + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; } if (cur) out.push(cur); return out; };
function balance(text) {   // split a title into <= 2 balanced lines
  const w = text.split(" "); if (w.length < 2) return [text];
  let best = null; for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(" "), b = w.slice(i).join(" "), d = Math.abs(a.length - b.length); if (!best || d < best.d) best = { d, l: [a, b] }; }
  return best.l;
}

export function thumbData(topic, channel) {
  const t = topic.thumb || {}, N = topic.steps.length, plural = topic.subjectPlural || topic.subject + "s";
  const q = t.question || `Do you really know ${topic.lang} ${plural}?`;
  return {
    channel, title: topic.title, tl: balance(topic.title), sub: t.sub || `${N} ${topic.countLabel}, explained with code`,
    lang: topic.lang, subject: topic.subject, word: t.word || topic.subject.toUpperCase(), word2: t.word2 || topic.countLabel.toUpperCase(),
    file: topic.file, short: t.short || topic.file, status: topic.status || "Python 3.12", brackets: topic.brackets || ["[", "]"],
    count: N, countLabel: topic.countLabel, items: t.items || topic.steps.map((s) => s.pill ?? `${s.name}()`),
    question: q, qLines: wrap(q, 13), qLines3: wrap(q, 14), questionSub: t.questionSub || "Let's check your knowledge",
    countLine: t.countLine || `${topic.lang} ${topic.subject} ${topic.countLabel}`, countQ: t.countQ || ["How many", "do you know?"],
    stickySub: t.stickySub || "cheat sheet", swissSub: t.swissSub || "Explained with code", levelSub: t.levelSub || `Level 1: ${topic.lang} ${plural}`,
    code: t.code, demo: t.demo, quiz: t.quiz, exam: t.exam && { ...t.exam, score: t.exam.score || `?/${N}` }, bug: t.bug, versus: t.versus,
  };
}
