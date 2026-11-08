// Voiceover providers. One WAV per scene (intro, each step, outro) so scene length can follow the voice.
//   kokoro : real Kokoro-82M via engine/kokoro_tts.py (same model/voices as `npx hyperframes tts`)
//   mock   : placeholder speech-like tones whose length matches a normal speaking pace (layout tests, no deps)
// Results are cached in .cache/voice/ keyed by text + voice + speed + provider, so rebuilds are instant.
import { existsSync, mkdirSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { KIT } from "./config.mjs";
import { hash, writeWav, wavDuration } from "./util.mjs";

const CACHE = join(KIT, ".cache", "voice");

function pythonBin(cfg) {
  const cand = [cfg.python, process.env.HYPERFRAMES_PYTHON, join(KIT, ".venv/bin/python"), join(KIT, ".venv/Scripts/python.exe"), "python3", "python"].filter(Boolean);
  for (const c of cand) {
    if (c.includes("/") || c.includes("\\")) { if (existsSync(c)) return c; continue; }
    if (spawnSync(c, ["--version"], { stdio: "ignore" }).status === 0) return c;
  }
  throw new Error("Python not found. Run ./setup.sh (creates .venv) or set voice.python / HYPERFRAMES_PYTHON.");
}

// Deterministic placeholder "speech": syllable-like bursts, ~15 characters per second.
function mockSpeech(text, out) {
  const rate = 24000, secs = Math.max(0.8, text.replace(/\s+/g, " ").length / 15 + 0.2), n = Math.floor(secs * rate), a = new Float32Array(n);
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const syl = 0.17; let f0 = 140;
  for (let i = 0; i < n; i++) {
    const t = i / rate, ph = (t % syl) / syl, env = Math.sin(Math.PI * ph) ** 2 * (Math.floor(t / syl) % 7 === 6 ? 0 : 1);
    if (i % Math.floor(syl * rate) === 0) f0 = 110 + rnd() * 50;
    a[i] = env * 0.22 * (Math.sin(2 * Math.PI * f0 * t) + 0.5 * Math.sin(4 * Math.PI * f0 * t) + 0.25 * Math.sin(6 * Math.PI * f0 * t)) / 1.75;
  }
  writeWav(out, a, rate);
}

export function listVoices() {
  const py = pythonBin({});
  const code = "import numpy as np,os;v=np.load(os.path.expanduser('~/.cache/hyperframes/voices-v1.0.bin'));print(' '.join(v.files))";
  const r = spawnSync(py, ["-c", code], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "(download the model first: ./setup.sh)";
}

/** segments: [{ id, text }] -> [{ file, dur }] (file is absolute) or null when the voiceover is off. */
export function makeVoice(segments, cfg, log = console.log) {
  if (!cfg.enabled || cfg.provider === "none") return null;
  mkdirSync(CACHE, { recursive: true });
  const tag = `${cfg.provider}|${cfg.voice}|${cfg.speed}|${cfg.lang}`;
  const items = segments.map((s) => ({ ...s, file: join(CACHE, `${hash(tag + "|" + s.text)}.wav`) }));
  const todo = items.filter((it) => !existsSync(it.file));

  if (todo.length && cfg.provider === "mock") for (const it of todo) mockSpeech(it.text, it.file);
  else if (todo.length && cfg.provider === "kokoro") {
    const py = pythonBin(cfg), jobs = join(CACHE, "jobs.json");
    writeFileSync(jobs, JSON.stringify(todo.map((it) => ({ text: it.text, out: it.file }))));
    log(`voice: Kokoro ${cfg.voice} x${cfg.speed} - synthesizing ${todo.length}/${items.length} scenes (${items.length - todo.length} cached)`);
    const r = spawnSync(py, [join(KIT, "engine/kokoro_tts.py"), "--jobs", jobs, "--voice", cfg.voice, "--speed", String(cfg.speed), "--lang", cfg.lang, "--backend", cfg.backend || "auto"],
      { encoding: "utf8", env: process.env, maxBuffer: 1 << 26 });
    const lines = (r.stderr || "").trim().split("\n"); log("voice: " + (lines.find((l) => l.startsWith("backend:")) || ""));
    if (r.status !== 0) throw new Error(`Kokoro failed (exit ${r.status}):\n${r.stderr}\nRun ./setup.sh, or build without voice: node build.mjs --voice off  (or --voice mock for a layout test).`);
  } else if (todo.length) throw new Error(`Unknown voice.provider "${cfg.provider}" (use kokoro | mock | none)`);
  else log(`voice: all ${items.length} scenes cached (${cfg.provider} ${cfg.voice})`);

  return items.map((it) => ({ file: it.file, dur: wavDuration(it.file) }));
}
