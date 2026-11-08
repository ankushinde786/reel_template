// buildReel(topic): the whole pipeline. Your build.mjs only supplies the topic (content).
//   1 prepare scenes (run code/shell for real output)   4 compose HTML + captions + narration
//   2 voiceover (Kokoro) -> scene lengths   5 thumbnail(s) in the chosen template
//   3 sound effects timeline                6 optional: render video + mix audio  (--render)
import { mkdirSync, copyFileSync, writeFileSync, cpSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { KIT, parseArgs, loadConfig } from "./config.mjs";
import { compose, narrationFor } from "./compose.mjs";
import { resolveReel, deriveThumb } from "./reel.mjs";
import { sceneModules } from "./scenes/index.mjs";
import { makeVoice, listVoices } from "./voice.mjs";
import { createSfx } from "./sound.mjs";
import { templates, thumbData, STYLES } from "./thumbnails.mjs";
import { openPage } from "./chrome.mjs";
import { renderVideo } from "./render.mjs";
import { overlays } from "./overlays.mjs";
import { mixTimeline, muxAudio } from "./mix.mjs";

const tc = (sec) => { const ms = Math.round(sec * 1000), p = (x, l = 2) => String(x).padStart(l, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))},${p(ms % 1000, 3)}`; };

export async function buildReel(topicIn, argv = process.argv.slice(2)) {
  const { flags } = parseArgs(argv), log = console.log;
  if (flags["list-voices"]) { log(listVoices()); return; }
  const cfg = loadConfig(flags), topic = resolveReel(topicIn, cfg), { W, H, fps } = { W: cfg.video.width, H: cfg.video.height, fps: cfg.video.fps };
  const out = resolve(KIT, "out", topic.id); rmSync(out, { recursive: true, force: true }); mkdirSync(join(out, "assets/voice"), { recursive: true });
  log(`\n== ${topic.title}  (${topic.steps.length} ${topic.countLabel}) -> out/${topic.id}/`);
  log(`   reel type: ${topic.type} | language: ${topic.langId} | theme: ${topic.themeName} | layout: ${topic.G.preset} | scenes: ${[...new Set(topic.steps.map((s) => s.type))].join(", ")}`);

  log("1/6 preparing scenes (running code / shell for real output)");
  for (const s of topic.steps) sceneModules[s.type].prepare?.(s, topic, cfg, log);
  deriveThumb(topic);

  log("2/6 voiceover");
  const say = narrationFor(topic), segs = topic.all.flatMap((s) => s.segs);
  const voiceRes = makeVoice(say.map((text, i) => ({ id: i, text })), cfg.voice, log);
  if (!voiceRes) log("voice: off (captions + narration.txt only)");

  // scene lengths follow the voice: each narrated segment = max(minimum, 0.3 s lead-in + narration + padding); a scene is the sum of its segments
  let at = 0, vi = 0;
  topic.all.forEach((sc) => {
    const s0 = at; sc.t = { start: +s0.toFixed(3), segs: [] };
    sc.segs.forEach((g) => { const dur = voiceRes ? Math.max(g.min, +(0.3 + voiceRes[vi].dur + cfg.voice.padSeconds).toFixed(2)) : g.min; sc.t.segs.push({ start: +at.toFixed(3), dur, vi, vd: voiceRes ? voiceRes[vi].dur : null }); at += dur; vi++; });
    sc.t.dur = +(at - s0).toFixed(3);
  });

  log("3/6 thumbnail");
  let endImage = null;
  if (cfg.thumbnail.enabled) {
    const styles = cfg.thumbnail.style === "all" ? STYLES : [cfg.thumbnail.style];
    for (const s of styles) if (!templates[s]) throw new Error(`Unknown thumbnail style "${s}". Options: ${STYLES.join(", ")}, all`);
    const v = thumbData({ ...topic, lang: topic.lang.label }, cfg.channel), dir = join(out, "thumbnails"); mkdirSync(dir, { recursive: true });
    const page = await openPage({ width: 1080, height: 1920 });
    for (const s of styles) {
      let html; try { html = templates[s](v); } catch (e) { if (styles.length > 1) { log(`  skip ${s}: ${e.message}`); continue; } throw e; }
      writeFileSync(join(dir, s + ".html"), html);
      await page.goto(pathToFileURL(join(dir, s + ".html")).href, 300);
      await page.ev("new Promise(r => { const t = Date.now(); (function w() { window.__fitted || Date.now() - t > 3000 ? r(1) : setTimeout(w, 30); })(); })");
      writeFileSync(join(dir, s + ".png"), await page.shot());
      log(`  thumbnails/${s}.png`);
    }
    page.close();
    const first = styles.find((x) => existsSync(join(dir, x + ".png")));
    if (first) { copyFileSync(join(dir, first + ".png"), join(out, "thumbnail.png")); endImage = join(out, "thumbnail.png"); }
  } else log("  off");

  log("4/6 composing");
  const sfx = createSfx(cfg.sound), vv = +(cfg.sound.master * cfg.voice.volume).toFixed(4), voiceClips = [];
  const segStart = topic.all.flatMap((sc) => sc.t.segs.map((g) => g.start));
  voiceRes?.forEach((v, i) => {
    const name = `${String(i).padStart(2, "0")}.wav`; copyFileSync(v.file, join(out, "assets/voice", name));
    if (vv > 0) voiceClips.push({ src: `assets/voice/${name}`, abs: join(out, "assets/voice", name), t: +(segStart[i] + 0.3).toFixed(3), dur: +v.dur.toFixed(3), vol: vv });
  });
  let logoSrc = null;
  if (cfg.logo.enabled) {
    const lp = resolve(KIT, cfg.logo.file);
    if (existsSync(lp)) { copyFileSync(lp, join(out, "assets/logo.png")); logoSrc = "assets/logo.png"; } else log(`  logo: ${cfg.logo.file} not found, skipping`);
  }
  const ec = cfg.thumbnail.endCard, endCard = ec?.enabled && endImage ? (copyFileSync(endImage, join(out, "assets/thumbnail.png")), { src: "assets/thumbnail.png", dur: ec.seconds }) : null;
  const c = compose(topic, { S: sfx.S, sfxEvents: sfx.events, voiceClips, cfgSound: cfg.sound, overlays: overlays(cfg, logoSrc), endCard });
  const DUR = c.DUR;
  cpSync(join(KIT, "assets/fonts"), join(out, "assets/fonts"), { recursive: true });
  copyFileSync(join(KIT, "assets/gsap.min.js"), join(out, "assets/gsap.min.js"));
  mkdirSync(join(out, "assets/sfx"), { recursive: true });
  for (const cat of Object.values(cfg.sound.sfx.categories)) if (existsSync(join(KIT, cat.file))) copyFileSync(join(KIT, cat.file), join(out, cat.file));
  writeFileSync(join(out, "index.html"), c.html);
  writeFileSync(join(out, "captions.srt"), c.caps.map(([a, b, t], i) => `${i + 1}\n${tc(a)} --> ${tc(b)}\n${t}\n`).join("\n"));
  writeFileSync(join(out, "narration.txt"), say.join("\n\n") + "\n");
  writeFileSync(join(out, "sfx-timeline.json"), JSON.stringify({
    duration: DUR,
    events: [...sfx.events.map((e) => ({ ...e, file: join(KIT, cfg.sound.sfx.categories[e.kind].file) })), ...voiceClips.map((v) => ({ kind: "voice", t: v.t, dur: null, vol: v.vol, file: v.abs }))],
  }, null, 1));
  log(`  ${DUR}s, ${c.caps.length} caption cues, ${sfx.events.length} sound effects${voiceClips.length ? `, ${voiceClips.length} voice clips` : ""}`);

  if (cfg.render) {
    log("6/6 rendering video (built-in renderer)");
    const silent = join(out, `${topic.id}-silent.mp4`), final = join(out, `${topic.id}.mp4`);
    await renderVideo({ indexHtml: join(out, "index.html"), out: silent, width: W, height: H, fps, log });
    const r = mixTimeline(join(out, "sfx-timeline.json"), join(out, "mix.wav")); log(`  mixed ${r.events} audio events, peak ${r.peak.toFixed(2)}`);
    muxAudio(silent, join(out, "mix.wav"), final); log(`  wrote out/${topic.id}/${basename(final)}`);
  } else log("6/6 render skipped (add --render, or: npm run render -- <id>)");
  log("done.\n");
}
