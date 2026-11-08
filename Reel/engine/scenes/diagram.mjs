// Scenes "flow" (flowchart) and "blocks" (block diagram). Same engine, different defaults. Layout is automatic.
// Fields: name, title, desc, cap, say,
//   nodes:["id: Text" | { id, t:"Text", shape:"box|pill|decision|io|circle|code", tone:"neutral|good|bad|warn|accent|purple", sub:"small mono line", code:"highlighted code" }]
//   edges:["a -> b", "d -> y: Yes", ["d","n","No"]]        or   chain:["Start","Read input","x > 0?","End"] (a straight chain; no ids needed)
//   dir:"down"|"right"|"auto",  beats:[{ show:["a","b"] | n (how many new nodes), hl:"id", note, say, cap }],  trace:["start","in","d","y","end"] (a glowing token walks the path)
//   code:[lines] (+ out / run:false / error:true): a small code card under the diagram.
import { esc, header, need, codePanel, codeFont, panelHeight, fitPx, segsFromBeats } from "./_kit.mjs";
import { layoutGraph, roundedPath } from "../diagram.mjs";
import { runCode, toLines } from "../run.mjs";

const parseEdge = (e) => {
  if (Array.isArray(e)) return { from: e[0], to: e[1], label: e[2] };
  const m = /^\s*(\S+)\s*->\s*(\S+?)\s*(?::\s*(.+))?\s*$/.exec(e); if (!m) throw new Error(`bad edge "${e}" (use "a -> b" or "a -> b: label")`);
  return { from: m[1], to: m[2], label: m[3] };
};

function normalize(s, i) {
  need(s, i, ["cap"]);
  if (s.chain) { s.nodes = s.chain.map((t, k) => ({ id: "n" + k, t })); s.edges = s.chain.slice(1).map((_, k) => ["n" + k, "n" + (k + 1)]); }
  if (!s.nodes?.length) throw new Error(`steps[${i}] (${s.type}): give nodes:[...] or chain:[...]`);
  s.nodes = s.nodes.map((n, k) => {
    if (typeof n === "string") { const m = /^(\w+):\s*(.+)$/.exec(n); n = m ? { id: m[1], t: m[2] } : { id: "n" + k, t: n }; }
    n = { ...n, t: n.t ?? n.text ?? n.id };
    if (typeof n.t === "string" && n.t.includes("|") && n.sub == null) { const [a, ...b] = n.t.split("|"); n.t = a.trim(); n.sub = b.join("|").trim(); }   // "Input|x = 4" -> title + small mono line
    n.shape ||= /\?$/.test(n.t) ? "decision" : /^(start|begin|end|stop|finish|done)$/i.test(n.t) || /^(start|end)$/i.test(n.id) ? "pill" : s.type === "blocks" ? "box" : "box";
    n.tone ||= n.shape === "decision" ? "warn" : n.shape === "pill" ? "good" : n.shape === "io" ? "purple" : n.shape === "code" ? "accent" : "neutral";
    return n;
  });
  s.edges = (s.edges || []).map(parseEdge);
  const ids = new Set(s.nodes.map((n) => n.id)); if (ids.size !== s.nodes.length) throw new Error(`steps[${i}] (${s.type}): duplicate node ids`);
  for (const e of s.edges) for (const k of [e.from, e.to]) if (!ids.has(k)) throw new Error(`steps[${i}] (${s.type}): edge refers to unknown node "${k}"`);
  s.beats = (s.beats || []).map((b) => (typeof b === "string" ? { note: b } : b));
}

const wrap = (t, max) => String(t).split("\n").flatMap((ln) => { const out = []; let cur = ""; for (const w of ln.split(" ")) { if ((cur + " " + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); } out.push(cur); return out; });

export default function make(type) {
  return {
    type, normalize,
    segments: (s, reel, cfg) => segsFromBeats(s, s.beats, cfg.timing, s.cap),
    prepare(s, reel, cfg, log) {
      if (!s.code) return;
      if (s.out) { s.out = [].concat(s.out).map((t) => (typeof t === "string" ? { text: t } : t)); return; }
      const lang = s.langObj || reel.lang, file = s.file || reel.file;
      if (s.run === false || !cfg.execute.enabled || !lang.run) return;
      const r = runCode({ lang, files: [{ name: file, code: s.code.join("\n") }], entry: file, timeoutSec: cfg.execute.timeoutSec });
      if (!r.ok && !s.error) throw new Error(`${s.name}: code failed\n${r.stderr}`);
      s.out = toLines(r, 2, (m) => log(`warning: ${s.name} ${m}`));
      log(`  ${s.name.padEnd(14)} -> ${s.out.map((o) => o.text).join(" | ") || "(no output)"}`);
    },
    css: ({ G }) => `.dg { position: absolute; }
  .dg svg.ed { position: absolute; left: 0; top: 0; overflow: visible; }
  .nd { position: absolute; }
  .nd svg.sh { position: absolute; left: 0; top: 0; overflow: visible; }
  .nd .nt { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-weight: 700; color: #fff; line-height: 1.2; padding: 0 12px; white-space: pre; }
  .nd .nt .ns { font-family: "JetBrains Mono", monospace; font-weight: 400; color: var(--muted); margin-top: 4px; } .nd .nt .cd { font-family: "JetBrains Mono", monospace; font-weight: 400; margin-top: 4px; }
  .el { position: absolute; transform: translate(-50%,-50%); padding: 2px 12px; border-radius: 999px; background: var(--bg); border: 2px solid #4b5563; font-weight: 700; color: #fff; font-family: "Inter", sans-serif; white-space: nowrap; }
  .tok { position: absolute; left: 0; top: 0; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: var(--yellow); box-shadow: 0 0 0 8px rgba(255,212,59,.25), 0 0 28px 6px rgba(255,212,59,.7); z-index: 9; opacity: 0; }
  .dnote { position: absolute; left: ${G.left}px; width: ${G.width}px; border-radius: 16px; border: 2px solid var(--yellow); background: color-mix(in srgb, var(--yellow) 9%, var(--panel)); display: flex; align-items: center; padding: 0 26px; font-weight: 700; color: #fff; line-height: 1.25; }`,

    build(s, c) {
      const { G, id, at, cfg, theme } = c, D = cfg.diagram, lang = c.lang, fs = D.fontSize, SW = D.strokeWidth;
      let body = header(c, s);
      const TONE = { neutral: theme.blue, good: theme.teal, bad: theme.red, warn: theme.yellow, accent: theme.accentText, purple: theme.purple };
      const hasNotes = s.beats.some((b) => b.note), noteH = hasNotes ? 104 : 0, out = s.out || [];

      // code card under the diagram
      let codeH = 0, fsC = 0;
      if (s.code) { fsC = codeFont(s.code, G.width - 110, 30, 18); codeH = panelHeight({ n: s.code.length, lh: Math.round(fsC * 1.62), label: true, result: out.length > 0 }) + 18; }
      const pm = 60, aX = pm, aW = G.W - 2 * pm, aY = G.stage.top, aH = G.stage.bottom - aY - noteH - (hasNotes ? 14 : 0) - codeH;

      // node sizes
      const nodes = s.nodes.map((n) => {
        const lines = wrap(n.t, n.shape === "decision" ? 16 : 22), cw = fs * 0.56, lw = Math.max(...lines.map((l) => l.length)) * cw;
        const subLines = n.sub ? [n.sub] : [], codeLines = n.code ? [].concat(n.code) : [];
        const extra = (subLines.length + codeLines.length) * (fs * 0.85), sw = Math.max(0, ...subLines.map((l) => l.length * fs * 0.5), ...codeLines.map((l) => l.length * fs * 0.52));
        let w = Math.max(lw, sw) + 56, h = lines.length * fs * 1.2 + extra + 38;
        if (n.shape === "decision") { w = w * 1.55 + 10; h = h * 1.7; } else if (n.shape === "pill") { w += 24; } else if (n.shape === "io") { w += 44; } else if (n.shape === "circle") { w = h = Math.max(w, h) * 1.05; }
        return { ...n, lines, w: Math.max(150, Math.round(w)), h: Math.max(76, Math.round(h)) };
      });
      let dir = s.dir || (type === "blocks" ? "auto" : "down");
      let lay;
      if (dir === "auto") { const a = layoutGraph({ nodes, edges: s.edges, dir: "right", gapU: D.nodeGapX, gapV: D.nodeGapX }); dir = a.layers <= 3 && a.bbox.w <= aW * 1.6 ? "right" : "down"; }
      let sc = 1;
      for (const gv of [D.nodeGapY, 52, 38]) {                      // tighten the gaps before shrinking everything
        lay = layoutGraph({ nodes, edges: s.edges, dir, gapU: D.nodeGapX, gapV: gv });
        sc = Math.min(D.maxScale ?? 1, aW / lay.bbox.w, aH / lay.bbox.h); if (sc >= 0.9) break;
      }
      const bw = lay.bbox.w, bh = lay.bbox.h;
      if (sc < 0.55) console.log(`  warning: ${s.name}: diagram is crowded (scaled to ${Math.round(sc * 100)}%); use fewer nodes or dir:"${dir === "down" ? "right" : "down"}"`);
      const ox = aX + (aW - bw * sc) / 2, oy = aY + (aH - bh * sc) / 2;

      // SVG layer: edges first, nodes on top
      let svg = `<svg class="ed" width="${bw}" height="${bh}" viewBox="0 0 ${bw} ${bh}">`, labels = "";
      lay.routes.forEach((r, k) => {
        const col = r.back ? theme.orange : "#8b949e", end = r.pts.at(-1), prev = r.pts.at(-2), dx = end[0] - prev[0], dy = end[1] - prev[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, A = 16;
        r.d = roundedPath(r.pts, 18);
        svg += `<path id="${id}-e${k}" d="${r.d}" pathLength="1" style="fill:none;stroke:${col};stroke-width:${SW};stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1"/>`;
        svg += `<path id="${id}-a${k}" d="M${end[0]} ${end[1]} L${end[0] - ux * A - uy * A * 0.55} ${end[1] - uy * A + ux * A * 0.55} L${end[0] - ux * A + uy * A * 0.55} ${end[1] - uy * A - ux * A * 0.55} Z" style="fill:${col};opacity:0"/>`;
        if (r.label) labels += `<div class="el" id="${id}-el${k}" style="left:${r.lab[0]}px;top:${r.lab[1]}px;font-size:${Math.round(fs * 0.78)}px;border-color:${col};opacity:0">${esc(r.label)}</div>`;
      });
      svg += `</svg>`;
      const shape = (n, col) => {
        const w = n.w, h = n.h, st = `style="fill:${theme.panel};stroke:${col};stroke-width:${SW}"`;
        if (n.shape === "decision") return `<polygon class="sp" points="${w / 2},${SW} ${w - SW},${h / 2} ${w / 2},${h - SW} ${SW},${h / 2}" ${st}/>`;
        if (n.shape === "io") return `<polygon class="sp" points="${w * 0.14},${SW} ${w - SW},${SW} ${w * 0.86},${h - SW} ${SW},${h - SW}" ${st}/>`;
        if (n.shape === "pill") return `<rect class="sp" x="${SW}" y="${SW}" width="${w - 2 * SW}" height="${h - 2 * SW}" rx="${h / 2}" ${st}/>`;
        if (n.shape === "circle") return `<ellipse class="sp" cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - SW}" ry="${h / 2 - SW}" ${st}/>`;
        return `<rect class="sp" x="${SW}" y="${SW}" width="${w - 2 * SW}" height="${h - 2 * SW}" rx="16" ${st}/>`;
      };
      let nodesHtml = "";
      nodes.forEach((n, k) => {
        const p = lay.pos[n.id], col = TONE[n.tone] || n.tone, ch = n.code ? c.code([].concat(n.code), lang.syntax) : [];
        nodesHtml += `<div class="nd" id="${id}-n${k}" style="left:${p.x}px;top:${p.y}px;width:${n.w}px;height:${n.h}px;opacity:0"><svg class="sh" width="${n.w}" height="${n.h}" viewBox="0 0 ${n.w} ${n.h}">${shape(n, col)}</svg>` +
          `<div class="nt" style="font-size:${fs}px">${n.lines.map(esc).join("\n")}${n.sub ? `<span class="ns" style="font-size:${Math.round(fs * 0.72)}px">${esc(n.sub)}</span>` : ""}${ch.map((h) => `<span class="cd" style="font-size:${Math.round(fs * 0.76)}px">${h}</span>`).join("")}</div></div>`;
      });
      body += `<div class="dg" id="${id}-dg" style="left:${ox}px;top:${oy}px;width:${bw}px;height:${bh}px;transform:scale(${sc});transform-origin:0 0">${svg}${labels}${nodesHtml}<div class="tok" id="${id}-tok"></div></div>`;

      // ── timeline: reveal order, then optional beats / trace
      const nodeIdx = Object.fromEntries(nodes.map((n, k) => [n.id, k])), order = [...nodes.keys()].sort((a, b) => lay.pos[nodes[a].id].layer - lay.pos[nodes[b].id].layer || a - b);
      const beats = s.beats, per = c.segs.length === beats.length && beats.length > 1, nB = beats.length;
      const shownAt = new Map(), edgeSec = D.edgeSeconds;
      const reveal = (k, t) => {
        if (shownAt.has(k)) return; shownAt.set(k, t);
        const incoming = lay.routes.map((r, ri) => [r, ri]).filter(([r]) => nodeIdx[r.to] === k && shownAt.has(nodeIdx[r.from]) && nodeIdx[r.from] !== k);
        let tn = t;
        for (const [r, ri] of incoming) {
          r.drawn = true;
          c.FT(`#${id}-e${ri}`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: edgeSec, ease: "power1.inOut" }, at(t));
          c.FT(`#${id}-a${ri}`, { opacity: 0 }, { opacity: 1, duration: 0.12 }, at(t + edgeSec * 0.85));
          if (r.label) c.FT(`#${id}-el${ri}`, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.25 }, at(t + edgeSec * 0.4));
          tn = t + edgeSec * 0.8;
        }
        c.FT(`#${id}-n${k}`, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.32, ease: "back.out(1.6)" }, at(tn)); c.S(incoming.length ? "pop" : "ding", at(tn));
        // edges leaving already-visible nodes toward this one in the other direction (loops) draw once both ends exist
        lay.routes.forEach((r, ri) => { if (nodeIdx[r.from] === k && shownAt.has(nodeIdx[r.to]) && nodeIdx[r.to] !== k && !r.drawn && r.back) { r.drawn = true; c.FT(`#${id}-e${ri}`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: edgeSec, ease: "power1.inOut" }, at(tn + 0.1)); c.FT(`#${id}-a${ri}`, { opacity: 0 }, { opacity: 1, duration: 0.12 }, at(tn + 0.1 + edgeSec * 0.85)); if (r.label) c.FT(`#${id}-el${ri}`, { opacity: 0 }, { opacity: 1, duration: 0.25 }, at(tn + 0.3)); } });
        // self loops / loops into this node from later ones are handled when the later node appears (above); back edges whose target already exists draw with the source
        lay.routes.forEach((r, ri) => { if (nodeIdx[r.to] === k && r.back && shownAt.has(nodeIdx[r.from]) && nodeIdx[r.from] !== k && !r.drawn) { r.drawn = true; c.FT(`#${id}-e${ri}`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: edgeSec, ease: "power1.inOut" }, at(tn + 0.1)); c.FT(`#${id}-a${ri}`, { opacity: 0 }, { opacity: 1, duration: 0.12 }, at(tn + 0.1 + edgeSec * 0.85)); if (r.label) c.FT(`#${id}-el${ri}`, { opacity: 0 }, { opacity: 1, duration: 0.25 }, at(tn + 0.3)); } });
        return tn;
      };
      // flow/back edges are drawn when their SOURCE node is visible and the target exists (see reveal above); forward edges when the TARGET appears
      const hl = (k, t0, t1) => {
        const sp = `#${id}-n${k} .sp`;
        c.T(sp, { stroke: theme.yellow, fill: theme.hitBg, duration: 0.2 }, at(t0));
        c.T(sp, { stroke: TONE[nodes[k].tone] || nodes[k].tone, fill: theme.panel, duration: 0.25 }, at(t1));
      };
      let t = 0.5, tRevealEnd;
      const noteEl = (bi, t0, t1) => {
        const b = beats[bi]; if (!b?.note) return "";
        c.FT(`#${id}-bn${bi}`, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 }, at(t0)); c.S("pop", at(t0));
        if (bi < nB - 1) c.T(`#${id}-bn${bi}`, { opacity: 0, duration: 0.15 }, at(t1));
        return `<div class="dnote" id="${id}-bn${bi}" style="top:${G.stage.bottom - noteH - codeH + (codeH ? -(0) : 0)}px;height:${noteH}px;font-size:${Math.max(22, fitPx(b.note, 32, 0.5, (G.width - 60) * 1.6))}px">${esc(b.note)}</div>`;
      };
      if (nB) {
        let cursor = 0;
        beats.forEach((b, bi) => {
          const t0 = per ? c.segs[bi].start - c.start + 0.25 : 0.5 + (bi * (c.dur - 2.2)) / nB, t1 = per ? c.segs[bi].start - c.start + c.segs[bi].dur - 0.1 : t0 + (c.dur - 2.2) / nB - 0.1;
          let ids = b.show === "all" ? order : Array.isArray(b.show) ? b.show.map((x) => nodeIdx[x]) : typeof b.show === "number" ? order.slice(cursor, cursor + b.show) : bi === 0 && !b.hl ? order.slice(0, 1) : order.slice(cursor, cursor + 1);
          ids = ids.filter((k) => k != null && !shownAt.has(k)); cursor += ids.length || 0;
          let tt = t0; for (const k of ids) { tt = reveal(k, tt) + 0.25; }
          if (b.hl != null) { const k = nodeIdx[b.hl]; if (k == null) throw new Error(`${s.name}: beat.hl "${b.hl}" is not a node`); reveal(k, t0); hl(k, t0 + 0.4, t1); }
          body += noteEl(bi, t0 + 0.2, t1);
        });
        order.forEach((k, i) => { if (!shownAt.has(k)) reveal(k, Math.max(t, 0.5) + 0.2 + i * 0.3); });   // anything never mentioned still appears
      } else {
        const span = Math.max(1.5, c.dur * (s.trace ? 0.5 : 0.7)), step = span / Math.max(1, order.length);
        order.forEach((k, i) => reveal(k, 0.5 + i * step));
      }
      tRevealEnd = Math.max(...[...shownAt.values()]) + 0.6;
      lay.routes.forEach((r, ri) => { if (!r.drawn) { r.drawn = true; c.FT(`#${id}-e${ri}`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: edgeSec }, at(tRevealEnd - 0.4)); c.FT(`#${id}-a${ri}`, { opacity: 0 }, { opacity: 1, duration: 0.12 }, at(tRevealEnd - 0.4 + edgeSec)); if (r.label) c.FT(`#${id}-el${ri}`, { opacity: 0 }, { opacity: 1, duration: 0.25 }, at(tRevealEnd - 0.2)); } });
      // trace token
      if (s.trace && D.trace) {
        const tr = s.trace.map((x) => { const k = nodeIdx[x]; if (k == null) throw new Error(`${s.name}: trace node "${x}" does not exist`); return k; });
        const hops = tr.length - 1, avail = Math.max(1, c.dur - tRevealEnd - 0.7), hop = Math.max(0.45, Math.min(1.1, avail / Math.max(1, hops)));
        const p0 = lay.pos[nodes[tr[0]].id]; let tt = Math.max(tRevealEnd, 0.5);
        c.FT(`#${id}-tok`, { x: p0.cx, y: p0.cy, opacity: 0 }, { x: p0.cx, y: p0.cy, opacity: 1, duration: 0.2 }, at(tt)); hl(tr[0], tt, tt + hop);
        for (let h = 0; h < hops; h++) {
          const a = nodes[tr[h]].id, b = nodes[tr[h + 1]].id, r = lay.routes.find((x) => x.from === a && x.to === b), pts = r ? r.pts : [[lay.pos[a].cx, lay.pos[a].cy], [lay.pos[b].cx, lay.pos[b].cy]];
          const full = [[lay.pos[a].cx, lay.pos[a].cy], ...(r ? r.pts.slice(1, -1) : []), [lay.pos[b].cx, lay.pos[b].cy]];
          const lens = full.slice(1).map((p, i) => Math.hypot(p[0] - full[i][0], p[1] - full[i][1])), tot = lens.reduce((x, y) => x + y, 0) || 1; let ts = tt + 0.15;
          full.slice(1).forEach((p, i) => { const d = (hop - 0.2) * (lens[i] / tot); c.T(`#${id}-tok`, { x: p[0], y: p[1], duration: Math.max(0.05, d), ease: "none" }, at(ts)); ts += d; });
          c.S("tick", at(tt + 0.15)); tt += hop; hl(tr[h + 1], tt, tt + hop); c.S("pop", at(tt));
        }
        c.T(`#${id}-tok`, { opacity: 0, duration: 0.25 }, at(tt + 0.2));
      }
      if (s.code) {
        const t0 = Math.max(tRevealEnd, c.dur * 0.5);
        const panel = codePanel(c, { id: `${id}-cp`, lines: s.code, x: G.left, y: G.stage.bottom - codeH + 18, w: G.width, fs: fsC, label: "In code", result: out, t0, syntax: lang.syntax });
        body += panel.html;
      }
      return { html: body };
    },
  };
}

export const flow = make("flow");
export const blocks = make("blocks");
