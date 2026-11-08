// Resolves your topic (build.mjs) + reel.config.json + flags into one "reel" object: reel type preset, language, theme, layout geometry,
// normalised scenes (each with its narration segments). Nothing here renders; index.mjs and compose.mjs consume the result.
import { geometry } from "./layout.mjs";
import { sceneModules } from "./scenes/index.mjs";

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function pickLanguage(t, cfg, preset) {
  const L = cfg.languages, byName = (n) => n && (L[n] ? n : Object.keys(L).find((k) => k !== "_help" && (L[k].label || "").toLowerCase() === String(n).toLowerCase()));
  const id = byName(cfg.force.language) || byName(t.language) || byName(t.lang) || byName(preset.language) || byName(cfg.reel.language);
  if (id) return { id, ...L[id] };
  const name = t.lang || t.language || cfg.reel.language;                         // unknown language: plain highlighting, no runner
  return { id: slug(name), label: name, ext: "txt", syntax: "generic", color: ["#888888"], status: name, run: null, prompt: "$ run" };
}

export function resolveReel(topicIn, cfg) {
  const t = structuredClone(topicIn), steps = t.steps || t.scenes;
  if (!Array.isArray(steps) || !steps.length) throw new Error("topic.steps (the list of scenes) is required");
  for (const k of ["id", "title"]) if (!t[k]) throw new Error(`topic.${k} is required`);

  const typeName = cfg.force.type || t.type || cfg.reel.type, preset = cfg.reelTypes[typeName];
  if (!preset || typeName === "_help") throw new Error(`Unknown reel type "${typeName}". Options: ${Object.keys(cfg.reelTypes).filter((k) => k !== "_help").join(", ")}`);
  const lang = pickLanguage(t, cfg, preset);
  const themeName = cfg.force.theme || t.theme || cfg.reel.theme, theme = cfg.themes[themeName];
  if (!theme || themeName === "_help") throw new Error(`Unknown theme "${themeName}". Options: ${Object.keys(cfg.themes).filter((k) => k !== "_help").join(", ")}`);
  const layoutName = cfg.force.layout || t.layout || (cfg.reel.layout !== "auto" ? cfg.reel.layout : preset.layout), G = geometry(cfg, layoutName);

  const N = steps.length;
  const reel = {
    ...t, cfg, G, theme, N, type: typeName, preset, themeName, lang, langId: lang.id,
    subject: t.subject || t.title, countLabel: t.countLabel || preset.countLabel, stepLabel: t.stepLabel || preset.stepLabel,
    brackets: t.brackets || ["[", "]"], file: t.file || `${slug(t.id)}.${lang.ext}`, status: t.status || lang.status,
  };
  reel.subjectPlural = t.subjectPlural || reel.subject + "s";
  reel.steps = steps; reel.lang = lang;

  const timingCfg = cfg.timing;
  steps.forEach((s, i) => {
    s.type ||= preset.scene;
    const mod = sceneModules[s.type];
    if (!mod || ["intro", "outro"].includes(s.type)) throw new Error(`steps[${i}]: unknown scene type "${s.type}". Options: ${Object.keys(sceneModules).filter((k) => !["intro", "outro"].includes(k)).join(", ")}`);
    s.name ||= s.title || `${s.type} ${i + 1}`;
    const sl = s.lang && cfg.languages[s.lang] ? s.lang : null;                  // a scene may use another language than the reel
    if (sl) s.langObj = { id: sl, ...cfg.languages[sl] };
    mod.normalize?.(s, i, reel);
    s.pill ??= s.name;
    s.kind = "step"; s.k = i;
  });

  const mk = (kind, style, defaults) => {
    const given = t[kind];
    if (given === false || style === "off") return null;
    const o = { type: kind, style, ...defaults, ...(typeof given === "object" ? given : {}) };
    if (typeof given === "object" && given.style) o.style = given.style;
    o.kind = kind;
    return o;
  };
  const introStyle = typeof t.intro === "object" && t.intro.style ? t.intro.style : preset.intro, outroStyle = typeof t.outro === "object" && t.outro.style ? t.outro.style : preset.outro;
  const intro = mk("intro", introStyle, {
    chip: `${N} ${reel.countLabel.toUpperCase()}`, title: t.title, sub: t.subtitle, hint: "one by one ↓",
    cap: [t.title], say: `${t.title}. Let's get started.`,
  });
  const outro = mk("outro", outroStyle, {
    chip: outroStyle === "grid" ? "CHEAT SHEET" : "RECAP", title: outroStyle === "grid" ? `All ${N} in one place` : "Quick recap", cta: "Follow ▶",
    cap: ["Follow " + cfg.channel, "for more!"], say: `Thanks for watching. Follow ${cfg.channel} for more!`,
  });
  for (const o of [intro, outro]) if (o && o.style === "grid" && N > 11) { o.style = "card"; if (o.chip === "CHEAT SHEET") o.chip = "RECAP"; if (/^All \d+ in one place$/.test(o.title)) o.title = "Quick recap"; }   // the pill grid holds 11; longer reels use the list card
  if (!intro && !outro && N < 1) throw new Error("nothing to render");

  reel.intro = intro; reel.outro = outro;
  reel.all = [intro, ...steps, outro].filter(Boolean);
  reel.all.forEach((s) => { s.segs = sceneModules[s.type].segments(s, reel, cfg); if (!s.segs.length) throw new Error(`scene "${s.name}" has no narration segments`); });

  // decorative code texture under the stage: your own lines, or lines taken from the scenes
  const lines = [];
  for (const s of steps) {
    if (Array.isArray(s.code)) lines.push(...s.code);
    for (const k of ["a", "b"]) if (Array.isArray(s[k]?.code)) lines.push(...s[k].code);
    if (Array.isArray(s.files)) for (const f of s.files) lines.push(...(Array.isArray(f.code) ? f.code : String(f.code).split("\n")).filter((l) => l.trim()).slice(0, 6));
    if (Array.isArray(s.cmds)) lines.push(...s.cmds.map((x) => "$ " + (x.cmd || (x.parts || []).map((p) => p[0]).join(" "))));
  }
  reel.texture = t.texture || [...new Set(lines.filter((l) => l.trim()))].slice(0, 14);
  if (!reel.texture.length) reel.texture = [`# ${t.title}`];
  return reel;
}

/** After scenes have run their code: fill thumb.code / thumb.short from the first code scene when you did not provide them. */
export function deriveThumb(reel) {
  const th = (reel.thumb ||= {}), sc = reel.steps;
  const codeOf = (s) => (Array.isArray(s.code) && s.code.length ? s : Array.isArray(s.b?.code) ? { code: s.b.code, out: s.b.out } : Array.isArray(s.a?.code) ? { code: s.a.code, out: s.a.out } : null);
  const first = sc.map(codeOf).find(Boolean);
  if (first && !th.code) th.code = { lines: first.code.slice(0, 3), hi: Math.min(1, first.code.length - 1), out: first.out?.[0]?.text ?? "" };
  const cmp = sc.find((s) => s.a?.code && s.b?.code);
  if (cmp && !th.versus) {
    const side = (p) => ({ name: p.label, desc: cmp.title || cmp.name, setup: p.code[0], code: p.code.at(-1), resLabel: "output", result: p.out?.[0]?.text ?? "" });
    th.versus = { a: side(cmp.a), b: side(cmp.b) };
  }
  th.short ||= reel.file;
}
