// Shared building blocks for scene modules: header, icons, typed code panels, terminal output panels, scroll bars.
// A scene gets a context `c` from compose.mjs:
//   c.id c.k c.N c.start c.dur c.segs[{start,dur}]  timing (absolute seconds)       c.at(t) = start + t
//   c.T(sel,vars,at) c.FT(sel,from,to,at)  GSAP tweens   c.S(kind,at,dur)  sound effect   c.G geometry   c.theme  c.cfg  c.reel  c.lang
//   c.code(lines, langId?) -> html per line
import { esc } from "../util.mjs";
import { fitPx } from "../layout.mjs";
export { esc, fitPx };

// ───────── icons (inline SVG so no font has to supply the glyph) ─────────
const PATHS = {
  check: '<path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  down: '<path d="M12 4v15M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z" fill="currentColor"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  warn: '<path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 10v5M12 17.5v.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  star: '<path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" fill="currentColor"/>',
  dot: '<circle cx="12" cy="12" r="5" fill="currentColor"/>',
  fn: '<path d="M14 4c-3 0-3 3-4 8s-1 8-4 8M7 11h8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
};
export const icon = (name, size = 36, color = "currentColor") => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="color:${color};flex:none">${PATHS[name] || PATHS.dot}</svg>`;

// ───────── scene header: chip + title + description (same look as the original method scenes) ─────────
export function header(c, scene, { titleHtml, titleText, code = false, compact = false } = {}) {
  const { G, id, at } = c, chip = scene.chip || `${c.reel.stepLabel} ${c.k + 1} / ${c.N}`;
  const text = titleText ?? scene.title ?? scene.name;
  let h = `<div class="chip" id="${id}-chip">${esc(chip)}</div>
    <div class="title${code ? " code" : ""}" id="${id}-title" style="font-size:${fitPx(text, compact ? 52 : 64, code ? 0.6 : 0.56, G.width)}px">${titleHtml ?? esc(text)}</div>`;
  const ids = [`#${id}-chip`, `#${id}-title`];
  if (scene.desc && !compact) { h += `<div class="desc" id="${id}-desc" style="font-size:${Math.max(22, fitPx(scene.desc, 30, 0.5, G.width))}px">${esc(scene.desc)}</div>`; ids.push(`#${id}-desc`); }
  c.FT(ids.join(","), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out", stagger: 0.06 }, at(0.05));
  c.S("whoosh", at(0.0));
  return h;
}

// ───────── typed code ─────────
/** Types `lines` one after another. Returns { ends[] (seconds relative to scene start), tEnd }. Lines must already exist in the DOM as #<prefix><i>. */
export function typeLines(c, prefix, lines, t0, { total } = {}) {
  const { cps, minLine, gap } = c.cfg.typing, ends = []; let t = t0;
  const raw = lines.map((l) => Math.max(minLine, l.length * cps)), k = total ? Math.min(1, total / (raw.reduce((a, b) => a + b, 0) + gap * lines.length)) : 1;   // total: squeeze the whole block into this many seconds
  lines.forEach((line, i) => {
    const d = raw[i] * k;
    c.FT(`#${prefix}${i}`, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: d, ease: `steps(${Math.max(1, line.length)})` }, c.at(t));
    c.S("typing", c.at(t), d);
    ends.push(t + d); t += d + gap * k;
  });
  return { ends, tEnd: ends.at(-1) ?? t0 };
}

/** Auto font size for a block of code lines so the longest line fits `w` px. */
export const codeFont = (lines, w, max = 38, min = 20) => Math.max(min, Math.min(max, Math.floor(w / (0.6 * Math.max(8, ...lines.map((l) => l.length))))));

const TONES = { neutral: "var(--accent)", bad: "var(--red)", good: "var(--teal)", warn: "var(--yellow)" };
export const toneColor = (t) => TONES[t] || t || TONES.neutral;

/** Height a codePanel needs. */
export const panelHeight = ({ n, lh, label, result, pad = 18 }) => (label ? 58 : 0) + pad * 2 + n * lh + (result ? 64 : 0);

/** A card with an optional label strip, typed code with line numbers, and an optional result strip.  Returns { html, h, tEnd }. */
export function codePanel(c, o) {
  const { id, lines, x, y, w, fs, label, tone = "neutral", t0 = 0.3, hi = [], result, number = true, pad = 18, syntax, total } = o;
  const lh = o.lh || Math.round(fs * 1.62), h = panelHeight({ n: lines.length, lh, label, result, pad }), col = toneColor(tone);
  const html = c.code(lines, syntax);
  const top = label ? 58 : 0;
  let s = `<div class="cp" id="${id}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-color:${col}">`;
  if (label) s += `<div class="cp-hd" style="border-bottom-color:${col}">${o.icon ? `<span class="cp-tag" style="background:${col}">${icon(o.icon, 26, "#10151a")}</span>` : ""}<span class="cp-lb">${esc(label)}</span></div>`;
  lines.forEach((l, i) => {
    s += `<div class="cl${hi.includes(i) ? " hi" : ""}" id="${id}-h${i}" style="top:${top + pad + i * lh}px;height:${lh}px;line-height:${lh}px;font-size:${fs}px"><span class="no">${number ? i + 1 : ""}</span><span class="tx" id="${id}-t${i}">${html[i] || ""}</span></div>`;
  });
  s += `</div>`;
  const ty = typeLines(c, `${id}-t`, lines, t0, { total });
  hi.forEach((i) => { c.FT(`#${id}-h${i}`, { backgroundColor: "rgba(255,212,59,0)", boxShadow: "inset 0px 0 0 #ffd43b" }, { backgroundColor: "rgba(255,212,59,0.14)", boxShadow: "inset 6px 0 0 #ffd43b", duration: 0.3 }, c.at(ty.ends[i] ?? ty.tEnd)); });
  let tEnd = ty.tEnd;
  if (result?.length) {
    const rows = [].concat(result), err = rows.some((r) => r.err);
    s += `<div class="cp-res${err ? " err" : ""}" id="${id}-res" style="left:${x}px;top:${y + h - 64}px;width:${w}px"><span class="ra">${icon("arrow", 28)}</span>` +
      rows.map((r) => `<span class="rv${r.err ? " e" : ""}" style="font-size:${Math.max(20, Math.min(32, Math.floor((w - 110) / (0.6 * Math.max(8, ...rows.map((q) => q.text.length))))))}px">${esc(r.text)}</span>`).join("<span class='sp'></span>") + `</div>`;
    const tr = tEnd + 0.25;
    c.FT(`#${id}-res`, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, c.at(tr));
    c.S("enter", c.at(tr)); c.S(err ? "thud" : "tick", c.at(tr + 0.2));
    tEnd = tr + 0.3;
  }
  return { html: s, h, tEnd, ends: ty.ends };
}

// ───────── terminal output ─────────
/** Returns where to put program output: either inside the fixed chrome terminal panel (classic layout) or an inline card at the bottom of the stage. */
export function terminalSlot(c, nLines) {
  const { G } = c;
  if (G.term) return { chrome: true, top: G.term.top, h: G.term.height, outTop: G.term.top + 96, promptTop: G.term.top + 52 };
  const h = 70 + 46 * Math.max(1, nLines) + 26, top = G.stage.bottom - h;
  return { chrome: false, top, h, outTop: top + 100, promptTop: top + 56 };
}

/** Prompt + output lines. In an inline slot a rounded card is drawn too. Returns { html, tEnd }. */
export function terminalOutput(c, { id, prompt, out, slot, t }) {
  const { G } = c;
  let s = "";
  if (!slot.chrome) s += `<div class="tcard" id="${id}-card" style="left:${G.left}px;top:${slot.top}px;width:${G.width}px;height:${slot.h}px"><div class="hd">TERMINAL</div></div>`;
  s += `<div class="tline prompt" id="${id}-o0" style="top:${slot.promptTop}px">${esc(prompt)}</div>`;
  if (!slot.chrome) c.FT(`#${id}-card`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3 }, c.at(t));
  c.FT(`#${id}-o0`, { opacity: 0 }, { opacity: 1, duration: 0.2 }, c.at(t));
  c.S("enter", c.at(t)); c.S("tick", c.at(t + 0.35));
  out.forEach((o, i) => {
    s += `<div class="tline ${o.err ? "err" : ""}" id="${id}-o${i + 1}" style="top:${slot.outTop + i * 44}px;font-size:${fitPx(o.text, 32, 0.6, G.width)}px">${esc(o.text)}</div>`;
    c.FT(`#${id}-o${i + 1}`, { opacity: 0 }, { opacity: 1, duration: 0.2 }, c.at(t + 0.35 + i * 0.12));
  });
  return { html: s, tEnd: t + 0.35 + out.length * 0.12 };
}

// ───────── scroll bars (drawn by us so they look the same in every renderer) ─────────
/** html for a vertical scroll bar. Tween `#<id>-thumb` with y to scroll. */
export function vScroll(id, { x, y, h, thumbH }) {
  return `<div class="sb v" id="${id}-track" style="left:${x}px;top:${y}px;height:${h}px"><div class="th" id="${id}-thumb" style="height:${thumbH}px"></div></div>`;
}
export function hScroll(id, { x, y, w, thumbW }) {
  return `<div class="sb h" id="${id}-htrack" style="left:${x}px;top:${y}px;width:${w}px"><div class="th" id="${id}-hthumb" style="width:${thumbW}px"></div></div>`;
}

// ───────── narration helpers ─────────
/** scene-level segments: one per beat when every beat has its own `say`, otherwise a single segment. */
export function segsFromBeats(scene, beats, defMin, fallbackCap) {
  const per = beats?.length > 1 && beats.every((b) => b.say);
  if (per) return beats.map((b) => ({ say: b.say, cap: b.cap || scene.cap || fallbackCap, min: b.min || defMin.beat }));
  return [{ say: scene.say || (scene.cap || fallbackCap).join(" "), cap: scene.cap || fallbackCap, min: scene.min || defMin.step }];
}

export const need = (scene, i, keys) => { for (const k of keys) if (scene[k] == null) throw new Error(`steps[${i}] (${scene.type}): "${k}" is required`); };
