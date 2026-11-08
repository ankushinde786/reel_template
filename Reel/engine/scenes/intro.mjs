// Scenes "intro" and "outro" (added automatically around your steps). Two styles, chosen by the reel type or by intro.style / outro.style in build.mjs:
//   grid : the original cheat-sheet grid of pills (best for lists of methods)      card : title + numbered list (intro) / recap with check marks (outro)
// Fields (all optional except cap): chip, title, sub, hint, cta, cap:[l1,l2], say, style.
import { esc, fitPx, icon } from "./_kit.mjs";

function make(kind) {
  return {
    type: kind,
    chrome: { terminal: true },          // the fixed TERMINAL panel when the layout has one (classic)
    segments: (s, reel, cfg) => [{ say: s.say || s.cap.join(" "), cap: s.cap, min: s.min || cfg.timing[kind] }],
    css: ({ G }) => kind === "outro" ? "" : `
  .li { position: absolute; left: ${G.left}px; width: ${G.width}px; display: flex; align-items: center; gap: 22px; border-radius: 16px; background: var(--panel); border: 2px solid #3c3c3c; padding: 0 24px; }
  .li .num { width: 46px; height: 46px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 28%, transparent); color: var(--accentText); font-weight: 700; font-size: 26px; display: flex; align-items: center; justify-content: center; flex: none; font-family: "JetBrains Mono", monospace; }
  .li .tx { font-size: 32px; font-weight: 700; color: #fff; white-space: nowrap; }
  .li .ok { color: var(--teal); display: flex; flex: none; }
  .cta { position: absolute; left: ${G.left}px; width: ${G.width}px; height: 84px; border-radius: 16px; background: var(--yellow); color: #1e1e1e; font-weight: 700; font-size: 36px; display: flex; align-items: center; justify-content: center; }
  .sub { position: absolute; left: ${G.left}px; top: ${G.header.desc}px; font-size: 30px; color: var(--muted); white-space: nowrap; line-height: 40px; }
  `,
    build(s, c) {
      const { G, id, at, reel } = c, N = reel.steps.length, start = c.start;
      let body = `<div class="chip" id="${id}-chip">${esc(s.chip)}</div><div class="title" id="${id}-title" style="font-size:${fitPx(s.title, 64, 0.58, G.width)}px">${esc(s.title)}</div>`;
      const pillIds = (a, b) => Array.from({ length: b - a }, (_, i) => `#${id}-p${a + i}`).join(",");
      const items = reel.steps.map((x) => x.pill ?? x.name);

      if (s.style === "grid") {
        const gridHtml = (last) => {
          let h = ""; const cell = (i) => `left:${G.left + (i % 2) * 444}px;top:${440 + Math.floor(i / 2) * 92}px`;
          items.forEach((t, i) => { h += `<div class="pill" id="${id}-p${i}" style="${cell(i)}"><span class="f">${esc(t)}</span></div>`; });
          return h + `<div class="pill ${last.cls}" id="${id}-p${N}" style="${cell(N)}">${esc(last.text)}</div>`;
        };
        if (kind === "intro") {
          body += gridHtml({ cls: "ghostpill", text: s.hint });
          c.FT(pillIds(0, N + 1), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.09, ease: "power3.out" }, at(0.4));
          c.S("whoosh", at(0.0)); for (let i = 0; i < N + 1; i++) c.S("tick", at(0.4 + i * 0.09));
        } else {
          body += gridHtml({ cls: "ctapill", text: s.cta });
          c.FT(`#${id}-chip,#${id}-title`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, start + 0.05);
          c.FT(pillIds(0, N), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.07, ease: "power3.out" }, start + 0.3);
          c.FT(`#${id}-p${N}`, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }, start + 1.4);
          c.S("whoosh", start + 0.05); for (let i = 0; i < N; i++) c.S("tick", start + 0.3 + i * 0.07); c.S("ding", start + 1.4);
        }
        return { html: body };
      }

      // ---- card style ----
      const rows = kind === "outro" ? reel.steps.map((x) => x.recap || x.title || x.name) : items;
      const shown = rows.length > 14 ? [...rows.slice(0, 13), `+ ${rows.length - 13} more`] : rows, top = 470, ctaH = kind === "outro" ? 110 : 0;
      const avail = G.caps.top - 20 - top - ctaH, rowH = Math.max(34, Math.min(84, Math.floor(avail / Math.max(1, shown.length)) - 12)), gap = 12;
      if (s.sub) body += `<div class="sub" id="${id}-sub" style="font-size:${Math.max(22, fitPx(s.sub, 30, 0.5, G.width))}px">${esc(s.sub)}</div>`;
      shown.forEach((t, i) => {
        const y = top + i * (rowH + gap);
        body += `<div class="li" id="${id}-p${i}" style="top:${y}px;height:${rowH}px">${kind === "outro" ? `<span class="ok">${icon("check", 40)}</span>` : `<span class="num">${i + 1}</span>`}<span class="tx" style="font-size:${Math.max(20, Math.min(32, fitPx(t, 32, 0.56, G.width - 140)))}px">${esc(t)}</span></div>`;
      });
      const t0 = kind === "intro" ? 0.5 : 0.7, st = Math.min(0.12, 2.2 / Math.max(1, shown.length));
      c.FT(`#${id}-chip,#${id}-title${s.sub ? `,#${id}-sub` : ""}`, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out", stagger: 0.06 }, kind === "intro" ? at(0.05) : start + 0.05);
      c.FT(pillIds(0, shown.length), { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.32, stagger: st, ease: "power3.out" }, at(t0));
      c.S("whoosh", at(0.0)); shown.forEach((_, i) => c.S(kind === "outro" ? "pop" : "tick", at(t0 + i * st)));
      if (kind === "outro") {
        const y = top + shown.length * (rowH + gap) + 14;
        body += `<div class="cta" id="${id}-cta" style="top:${y}px">${esc(s.cta)}</div>`;
        const tc = t0 + shown.length * st + 0.5;
        c.FT(`#${id}-cta`, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }, at(tc)); c.S("ding", at(tc));
      }
      return { html: body };
    },
  };
}

export const intro = make("intro");
export const outro = make("outro");
