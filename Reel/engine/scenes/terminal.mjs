// Scene "terminal": a Linux/shell terminal window. Commands are typed, output appears line by line, the window scrolls when it fills up,
// and a row of "anatomy" chips explains each part of the command as it is typed.
// Fields: name, title (default: first command), desc, cap, say, shell:{user,host,cwd}, setup:["bash lines run first, hidden"],
//   cmds:[{ cmd:"ls -la", parts:[["ls","list files"],["-l","long format"],["-a","show hidden"]], out:["line", ...], run:true, say }]   or a single command: cmd / parts / out / run on the scene.
//   out lines may use colour markup {g|green} {r|red} {y|yellow} {b|blue} {c|cyan} {m|magenta} {d|dim} {w|white}.
//   run:true executes the command for real in a scratch folder (one shell session for the scene, so `cd` carries over); otherwise give out:[..].
import { esc, header, need, vScroll, fitPx, segsFromBeats } from "./_kit.mjs";
import { highlight } from "../highlight.mjs";
import { runShell } from "../run.mjs";

const PAL = ["var(--yellow)", "var(--teal)", "var(--purple)", "var(--orange)", "var(--blue)"];
const COL = { g: "#7ee787", r: "#ff7b72", y: "#e3b341", b: "#79c0ff", c: "#56d4dd", m: "#d2a8ff", d: "#7d8590", w: "#ffffff" };
const markup = (t) => esc(t).replace(/\{([grybcmdw])\|([^}]*)\}/g, (_, k, x) => `<span style="color:${COL[k]}">${x}</span>`);
const plain = (t) => t.replace(/\{[grybcmdw]\|([^}]*)\}/g, "$1");

export default {
  type: "terminal",
  chrome: { tabs: [{ name: "Terminal" }] },

  normalize(s, i) {
    if (!s.cmds) { need(s, i, s.parts ? ["cap"] : ["cmd", "cap"]); s.cmds = [{ cmd: s.cmd, parts: s.parts, out: s.out, run: s.run, say: s.say }]; }
    need(s, i, ["cap"]);
    s.cmds = s.cmds.map((x, k) => {
      const cmd = x.cmd ?? (x.parts || []).map((p) => p[0]).join(" ");
      if (!cmd) throw new Error(`steps[${i}] (terminal): cmds[${k}] needs cmd or parts`);
      if (x.parts && x.parts.map((p) => p[0]).join(" ") !== cmd) throw new Error(`steps[${i}] (terminal): cmds[${k}].parts must join (with single spaces) to exactly "${cmd}"`);
      if (!x.run && !x.out) throw new Error(`steps[${i}] (terminal): cmds[${k}] needs out:[...] or run:true`);
      return { ...x, cmd };
    });
    s.title ||= s.cmds[0].cmd;
    s.desc ??= undefined;
  },

  segments(s, reel, cfg) {
    const per = s.cmds.length > 1 && s.cmds.every((x) => x.say);
    const est = 0.8 + s.cmds.reduce((a, x) => a + Math.max(0.5, x.cmd.length * cfg.typing.cps * 1.2) + 0.5 + (x.out?.length ?? 5) * 0.12 + 1.0, 0);
    const segs = segsFromBeats(s, per ? s.cmds : [], cfg.timing, s.cap);
    if (!per) segs[0].min = Math.max(segs[0].min, +est.toFixed(1));
    return segs;
  },

  prepare(s, reel, cfg, log) {
    if (!s.cmds.some((x) => x.run)) return;
    if (!cfg.execute.enabled) throw new Error(`${s.name}: run:true needs execute.enabled=true`);
    const res = runShell({ setup: s.setup || [], cmds: s.cmds, timeoutSec: cfg.execute.timeoutSec });
    s.cmds.forEach((x, k) => { if (res[k]) { x.out = res[k].out; log(`  ${x.cmd.slice(0, 24).padEnd(24)} -> ${x.out.length} lines`); } });
  },

  css: ({ G, theme, cfg }) => `
  .tw { position: absolute; border-radius: 20px; background: #0b0d10; border: 2px solid #2b2f36; overflow: hidden; box-shadow: 0 30px 70px rgba(0,0,0,.5); }
  .tw .bar { position: absolute; left: 0; right: 0; top: 0; height: 60px; background: #1c1f25; display: flex; align-items: center; padding-left: 24px; gap: 12px; border-bottom: 2px solid #2b2f36; }
  .tw .bar i { width: 18px; height: 18px; border-radius: 50%; display: block; } .tw .bar .ttl { position: absolute; left: 0; right: 0; text-align: center; font-size: 24px; color: #9aa0a6; font-family: "JetBrains Mono", monospace; }
  .tw .view { position: absolute; left: 0; right: 0; top: 60px; bottom: 0; overflow: hidden; }
  .tw .inner { position: absolute; left: 0; top: 0; width: 100%; }
  .tl { position: absolute; left: 28px; white-space: pre; font-family: "JetBrains Mono", monospace; color: #d4d4d4; }
  .tl .pu { color: #7ee787; font-weight: 700; } .tl .pp { color: #79c0ff; font-weight: 700; } .tl .cmd { display: inline-block; white-space: pre; }
  .tw .cur { display: inline-block; width: .55em; height: 1.05em; background: #d4d4d4; vertical-align: text-bottom; margin-left: 2px; }
  .an { position: absolute; left: ${G.left}px; width: ${G.width}px; height: 150px; display: flex; gap: 14px; }
  .an .ch { flex: 1; border-radius: 14px; background: var(--panel); border-top: 6px solid; padding: 14px 12px 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; text-align: center; }
  .an .tk { font-family: "JetBrains Mono", monospace; font-weight: 700; white-space: nowrap; } .an .ds { color: var(--muted); line-height: 1.2; }
  `,

  build(s, c) {
    const { G, id, at, cfg } = c, tc = cfg.terminal, sh = { user: tc.user, host: tc.host, cwd: tc.cwd, ...s.shell };
    const prompt = `${sh.user}@${sh.host}:${sh.cwd}$ `;
    const anat = tc.anatomy && s.cmds.some((x) => x.parts), top = G.stage.top, wTop = top + (anat ? 166 : 0), wH = G.stage.bottom - wTop - 6;
    let body = header(c, s, { titleHtml: highlight([s.title], "bash")[0].replace(/^/, ""), code: true, titleText: s.title });

    // font + capacity
    const all = s.cmds.flatMap((x) => [prompt + x.cmd, ...(x.out || []).map(plain)]), contentW = G.width - 70;
    const fs = Math.max(18, Math.min(tc.fontSize, Math.floor(contentW / (0.6 * Math.max(10, ...all.map((l) => l.length)))))), lh = Math.round(fs * tc.lineHeight);
    const viewH = wH - 60, cap = Math.floor((viewH - 30) / lh), total = s.cmds.reduce((a, x) => a + 1 + (x.out?.length || 0), 0) + 1;
    const overflow = total > cap, trackW = 12;

    body += `<div class="tw" id="${id}-tw" style="left:${G.left}px;top:${wTop}px;width:${G.width}px;height:${wH}px">
      <div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span class="ttl">${esc(sh.user)}@${esc(sh.host)}: ${esc(sh.cwd)}</span></div>
      <div class="view"><div class="inner" id="${id}-in">`;
    c.FT(`#${id}-tw`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, at(0.25));

    // schedule
    const per = c.segs.length === s.cmds.length && s.cmds.length > 1;
    let t = 0.6, line = 0, scrollY = 0, anatHtml = "";
    const cps = cfg.typing.cps * 1.2;
    s.cmds.forEach((x, j) => {
      if (per) t = c.segs[j].start - c.start + 0.3;
      const y = 18 + line * lh, d = Math.max(0.5, x.cmd.length * cps), pc = (i) => PAL[i % PAL.length];
      let cmdHtml;
      if (x.parts) cmdHtml = x.parts.map((p, i) => `<span style="color:${pc(i)}" id="${id}-c${j}p${i}">${esc(p[0])}</span>`).join(" ");
      else cmdHtml = highlight([x.cmd], "bash")[0];
      body += `<div class="tl" id="${id}-l${line}" style="top:${y}px;font-size:${fs}px;height:${lh}px;line-height:${lh}px"><span class="pu">${esc(sh.user)}@${esc(sh.host)}</span>:<span class="pp">${esc(sh.cwd)}</span>$ <span class="cmd" id="${id}-cmd${j}">${cmdHtml}</span></div>`;
      c.FT(`#${id}-l${line}`, { opacity: 0 }, { opacity: 1, duration: 0.05 }, at(t));
      c.FT(`#${id}-cmd${j}`, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: d, ease: `steps(${Math.max(1, x.cmd.length)})` }, at(t));
      c.S("typing", at(t), d);
      const promptLine = line; line++;
      // anatomy chips appear as their part is typed
      if (anat && x.parts) {
        const n = x.parts.length, chW = Math.min(300, Math.floor((G.width - 14 * (n - 1)) / n)), tf = Math.max(16, Math.min(34, fitPx(Math.max(...x.parts.map((p) => p[0].length)), 34, 0.62, chW - 24))), df = Math.max(18, Math.min(24, Math.floor(chW / 11)));
        anatHtml += `<div class="an" id="${id}-an${j}" style="top:${top}px;justify-content:${n * (chW + 14) < G.width ? "center" : "flex-start"}">` +
          x.parts.map((p, i) => `<div class="ch" id="${id}-ch${j}-${i}" style="border-top-color:${pc(i)};flex:0 0 ${chW}px"><span class="tk" style="color:${pc(i)};font-size:${tf}px">${esc(p[0])}</span><span class="ds" style="font-size:${df}px">${esc(p[1] || "")}</span></div>`).join("") + `</div>`;
        let chars = 0; const totalC = x.cmd.length;
        x.parts.forEach((p, i) => {
          chars += p[0].length + (i ? 1 : 0); const ta = t + (chars / totalC) * d;
          c.FT(`#${id}-ch${j}-${i}`, { opacity: 0, y: 16, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(1.8)" }, at(ta)); c.S("pop", at(ta));
        });
        if (j > 0 && s.cmds[j - 1].parts) c.T(`#${id}-an${j - 1}`, { opacity: 0, duration: 0.2 }, at(t - 0.05));
      }
      const scrollTo = (idx, tt) => {
        if (!overflow || idx < cap) return;
        const ny = -(idx - cap + 1) * lh - 14; if (ny === scrollY) return; scrollY = ny;
        c.T(`#${id}-in`, { y: ny, duration: 0.2, ease: "power1.out" }, at(tt));
        const th = Math.max(40, Math.round(viewH * (cap / total))), maxS = (total - cap) * lh + 14;
        c.T(`#${id}-thumb`, { y: Math.round((-ny / maxS) * (viewH - 16 - th)), duration: 0.2 }, at(tt));
      };
      scrollTo(promptLine, t);
      t += d + 0.25; c.S("enter", at(t));
      const out = x.out || [], st = Math.min(0.12, 2.4 / Math.max(1, out.length));
      out.forEach((o, i) => {
        const yy = 18 + line * lh;
        body += `<div class="tl" id="${id}-l${line}" style="top:${yy}px;font-size:${fs}px;height:${lh}px;line-height:${lh}px">${markup(o)}</div>`;
        const to = t + 0.2 + i * st;
        c.FT(`#${id}-l${line}`, { opacity: 0 }, { opacity: 1, duration: 0.05 }, at(to)); if (i % 2 === 0 || out.length < 8) c.S("tick", at(to));
        scrollTo(line, to); line++;
      });
      t += 0.2 + out.length * st + 1.0;
    });
    // idle prompt with a cursor after the last command
    const yEnd = 18 + line * lh, tEnd = t - 0.8;
    body += `<div class="tl" id="${id}-lend" style="top:${yEnd}px;font-size:${fs}px;height:${lh}px;line-height:${lh}px"><span class="pu">${esc(sh.user)}@${esc(sh.host)}</span>:<span class="pp">${esc(sh.cwd)}</span>$ <span class="cur"></span></div>`;
    c.FT(`#${id}-lend`, { opacity: 0 }, { opacity: 1, duration: 0.05 }, at(tEnd));
    if (overflow) {
      const idx = line; if (idx >= cap) { c.T(`#${id}-in`, { y: -(idx - cap + 1) * lh - 14, duration: 0.2 }, at(tEnd)); }
    }
    body += `</div>`;
    if (overflow) body += vScroll(id, { x: G.width - trackW - 8 - 0, y: 8, h: viewH - 16, thumbH: Math.max(40, Math.round(viewH * (cap / total))) }).replace('class="sb v"', 'class="sb v" data-in-term="1"');
    body += `</div></div>` + anatHtml;
    return { html: body, chrome: { tabs: [{ name: "Terminal" }] } };
  },
};
