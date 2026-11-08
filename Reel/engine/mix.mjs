// Pure-Node audio mixer: sfx-timeline.json -> mix.wav -> ffmpeg mux onto the silent video. No Python/numpy needed.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readWav, writeWav } from "./util.mjs";

const SR = 44100;
function load(path, cache) {
  if (cache.has(path)) return cache.get(path);
  const { samples, rate } = readWav(path);
  let out = samples;
  if (rate !== SR) { // linear resample
    const n = Math.floor(samples.length * SR / rate); out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * rate / SR, j = Math.floor(x), f = x - j; out[i] = samples[j] * (1 - f) + (samples[Math.min(j + 1, samples.length - 1)] * f); }
  }
  cache.set(path, out); return out;
}

export function mixTimeline(timelinePath, mixPath) {
  const tl = JSON.parse(readFileSync(timelinePath, "utf8")), cache = new Map();
  const buf = new Float32Array(Math.floor(tl.duration * SR) + SR);
  for (const e of tl.events) {
    let snd = load(e.file, cache);
    if (e.dur != null) snd = snd.subarray(0, Math.floor(e.dur * SR));
    const fade = e.dur != null ? Math.min(snd.length, Math.floor(0.004 * SR)) : 0, i0 = Math.floor(e.t * SR);
    for (let i = 0; i < snd.length && i0 + i < buf.length; i++) {
      const g = fade && i >= snd.length - fade ? (snd.length - 1 - i) / fade : 1;
      buf[i0 + i] += snd[i] * e.vol * g;
    }
  }
  const out = buf.subarray(0, Math.floor(tl.duration * SR));
  let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.95) { const k = 0.95 / peak; for (let i = 0; i < out.length; i++) out[i] *= k; }   // overlap safety, no clipping
  writeWav(mixPath, out, SR);
  return { events: tl.events.length, peak };
}

export function muxAudio(silent, mixPath, final) {
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", silent, "-i", mixPath, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", final], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg mux failed");
}

// CLI: node engine/mix.mjs <timeline.json> <silent.mp4> <final.mp4>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [tl, silent, final] = process.argv.slice(2), mix = tl.replace(/[^/\\]*$/, "mix.wav");
  const r = mixTimeline(tl, mix); console.log(`mixed ${r.events} events, peak ${r.peak.toFixed(2)}`); muxAudio(silent, mix, final); console.log("wrote", final);
}
